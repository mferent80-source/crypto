// Probele v85: ruta /api/t212 (Trading 212 Invest, doar citire) + calculele din public/lib/t212.js.
// Fetch fals: niciun Trading 212 / Yahoo real nu e sunat.
import assert from "node:assert/strict";
import fs from "node:fs";

const TOKEN = "proba-token-1234567890";
const ENV = { APP_API_TOKEN: TOKEN, T212_API_KEY: "cheie", T212_API_SECRET: "secret" };
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
let ip = 0;
async function cheama(qs, env = ENV, token = TOKEN) {
  const m = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.85.0." + (++ip % 250) };
  if (token) h.authorization = "Bearer " + token;
  const res = await m.onRequestGet({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { headers: h }), env });
  let corp = null; try { corp = JSON.parse(await res.text()); } catch {}
  return { status: res.status, corp };
}
let cereri = [];
function fetchStub(fn) { cereri = []; globalThis.fetch = async (url, opt = {}) => { const u = String(url); cereri.push({ url: u, headers: new Headers(opt.headers || {}) }); const r = fn(u); return new Response(typeof r.corp === "string" ? r.corp : JSON.stringify(r.corp), { status: r.status || 200, headers: { "content-type": "application/json" } }); }; }

console.log("\nV85 · Trading 212 · proba\n");

await test("ruta: fara token -> 401; fara cheile T212 -> 503 cu drumul (PUNE-CHEILE-T212.bat)", async () => {
  assert.equal((await cheama("action=cont", ENV, null)).status, 401);
  const r = await cheama("action=cont", { APP_API_TOKEN: TOKEN });
  assert.equal(r.status, 503); assert.match(r.corp.error, /PUNE-CHEILE-T212/);
});

await test("ruta cont: cheama cash + info cu Basic key:secret pe live.trading212.com/api/v0", async () => {
  fetchStub((u) => ({ corp: /cash/.test(u) ? { free: 10, total: 1000, ppl: -5, result: 12, invested: 990, pieCash: 0, blocked: 0 } : { id: 1, currencyCode: "RON" } }));
  const r = await cheama("action=cont");
  assert.equal(r.status, 200); assert.equal(r.corp.moneda, "RON"); assert.equal(r.corp.cash.total, 1000);
  assert.ok(cereri.every((c) => c.url.startsWith("https://live.trading212.com/api/v0/equity/account/")), cereri.map((c) => c.url).join(" "));
  assert.equal(cereri[0].headers.get("authorization"), "Basic " + Buffer.from("cheie:secret").toString("base64"));
});

await test("ruta ordine: o pagina, cursorul trece mai departe; nextPagePath spre alta cale -> refuzat (nu urmam oriunde)", async () => {
  fetchStub((u) => ({ corp: { items: [{ order: { id: 1 }, fill: null }], nextPagePath: "/api/v0/equity/history/orders?cursor=123&limit=50" } }));
  const r = await cheama("action=ordine&cursor=999");
  assert.equal(r.status, 200); assert.equal(r.corp.items.length, 1); assert.equal(r.corp.cursor, "123");
  assert.match(cereri[0].url, /history\/orders\?limit=50&cursor=999$/);
  fetchStub(() => ({ corp: { items: [], nextPagePath: "https://rau.test/x" } }));
  const r2 = await cheama("action=ordine");
  assert.strictEqual(r2.corp.cursor, null);
  assert.equal((await cheama("action=ordine&cursor=abc")).status, 400, "cursor doar cifre");
});

await test("ruta preturi: nici un candidat nu are date -> cauta dupa NUMELE companiei (doar actiuni US), ia primul simbol care are preturi; fara nume -> 404", async () => {
  const bune = { corp: { chart: { result: [{ meta: {}, timestamp: [1700000000, 1700086400], indicators: { quote: [{ open: [1, 2], high: [2, 3], low: [0.5, 1.5], close: [1.5, 2.5], volume: [1, 1] }] } }] } } };
  fetchStub((u) => /finance\/search/.test(u) ? { corp: { quotes: [{ symbol: "E20.DE", quoteType: "EQUITY", exchange: "GER" }, { symbol: "ECHO", quoteType: "EQUITY", exchange: "NMS" }] } }
    : /chart\/ECHO\?/.test(u) ? bune : { status: 404, corp: { chart: { result: null } } });
  const r = await cheama("action=preturi&ticker=ZZQX_US_EQ&interval=1d&nume=" + encodeURIComponent("EchoStar"));
  assert.equal(r.status, 200); assert.equal(r.corp.simbol, "ECHO"); assert.equal(r.corp.gasitDupaNume, true);
  assert.ok(cereri.some((c) => /finance\/search\?q=EchoStar/.test(c.url)), cereri.map((c) => c.url).join(" "));
  assert.ok(!cereri.some((c) => /chart\/E20\.DE/.test(c.url)), "bursele din afara SUA se sar");
  assert.equal((await cheama("action=preturi&ticker=ZZQY_US_EQ&interval=1d")).status, 404);
});

await test("ruta preturi: Yahoo refuza (429/5xx) -> 429 cu retryAfter, NU 404 'fara preturi' (altfel trade-ul ramane judecat 'fara date' pe veci)", async () => {
  fetchStub(() => ({ status: 429, corp: "Too Many Requests" }));
  const r = await cheama("action=preturi&ticker=AVAV_US_EQ&interval=1d");
  assert.equal(r.status, 429, JSON.stringify(r.corp)); assert.ok(r.corp.retryAfter > 0);
  fetchStub(() => ({ status: 503, corp: "" }));
  assert.equal((await cheama("action=preturi&ticker=AVAV_US_EQ&interval=1d")).status, 502);
});

await test("ruta: 429 de la T212 -> 429 cu retryAfter, nu 500; 403 -> spune ce permisiune lipseste", async () => {
  fetchStub(() => ({ status: 429, corp: { code: "BusinessException" } }));
  const r = await cheama("action=pozitii");
  assert.equal(r.status, 429); assert.ok(r.corp.retryAfter > 0);
  fetchStub(() => ({ status: 403, corp: "" }));
  const r2 = await cheama("action=pozitii");
  assert.equal(r2.status, 403); assert.match(r2.corp.error, /Portfolio/);
});

await test("ruta preturi: fara Twelve Data -> Yahoo; AAPL_US_EQ -> AAPL; SNDK1 fara date -> SNDK; forma = randuri Pionex (time/open/high/low/close)", async () => {
  fetchStub((u) => /chart\/SNDK1\?/.test(u) ? { status: 404, corp: { chart: { result: null, error: { description: "No data found" } } } }
    : { corp: { chart: { result: [{ meta: { symbol: u.match(/chart\/([A-Z0-9.]+)\?/)[1] }, timestamp: [1700000000, 1700086400], indicators: { quote: [{ open: [1, 2], high: [2, 3], low: [0.5, 1.5], close: [1.5, null], volume: [10, 20] }] } }] } } });
  const r = await cheama("action=preturi&ticker=AAPL_US_EQ&interval=1d");
  assert.equal(r.status, 200); assert.equal(r.corp.simbol, "AAPL"); assert.equal(r.corp.sursa, "yahoo");
  assert.deepEqual(r.corp.randuri[0], { time: 1700000000000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 });
  assert.equal(r.corp.randuri.length, 1, "bara cu close null se sare, nu devine 0");
  const n = await cheama("action=preturi&ticker=NPA_US_EQ&interval=1d");
  assert.equal(n.corp.simbol, "ASTS", "NPA e AST SpaceMobile -> ASTS pe bursa");
  const s = await cheama("action=preturi&ticker=SNDK1_US_EQ&interval=1d");
  assert.equal(s.corp.simbol, "SNDK"); assert.ok(cereri.some((c) => /chart\/SNDK1\?/.test(c.url)) && cereri.some((c) => /chart\/SNDK\?/.test(c.url)));
});

// ---------------- calculele (public/lib/t212.js) ----------------
const SRC = ["grid-calcul.js", "t212.js"].map((f) => { const u = new URL("../public/lib/" + f, import.meta.url); return fs.existsSync(u) ? fs.readFileSync(u, "utf8") : ""; }).join("\n");
const T = new Function(`${SRC}; return typeof T212 !== "undefined" ? T212 : null;`)();
await test("modulul T212 exista", () => assert.ok(T, "public/lib/t212.js lipseste"));

const ord = (id, side, ticker, qty, price, zi, netRON, feeRON, ext) => ({ order: { id, strategy: "QUANTITY", type: "MARKET", ticker, quantity: qty, filledQuantity: qty, status: "FILLED", currency: "RON", extendedHours: !!ext, side, createdAt: zi, instrument: { ticker, name: ticker.split("_")[0] + " Inc", isin: "US0", currency: "USD" } },
  fill: { id: id + 1000, quantity: qty, price, type: "TRADE", filledAt: zi, walletImpact: { currency: "RON", netValue: netRON, fxRate: 0.22, taxes: feeRON ? [{ name: "CURRENCY_CONVERSION_FEE", quantity: -feeRON, currency: "RON" }] : [] } } });
await test("umpleri: doar FILLED cu fill; anulatele si randurile stricate se sar; comisionul de conversie citit", () => {
  const l = T.umpleri([ord(1, "BUY", "AAPL_US_EQ", 2, 100, "2026-09-01T14:00:00Z", 900, 1.5), { order: { id: 2, status: "CANCELLED", side: "BUY", ticker: "X_US_EQ" }, fill: null }, null, { order: { status: "FILLED" } }]);
  assert.equal(l.length, 1); assert.equal(l[0].simbol, "AAPL"); assert.equal(l[0].side, "BUY"); aprox(l[0].fee, 1.5, 1e-9); assert.equal(l[0].t, Date.parse("2026-09-01T14:00:00Z"));
});
await test("perechi FIFO: 2 cumparari + 1 vanzare partiala + 1 vanzare restul -> 2 trade-uri inchise, rezultat in RON cu comisioane, pozitie ramasa 0", () => {
  const l = T.umpleri([
    ord(1, "BUY", "AAPL_US_EQ", 2, 100, "2026-09-01T14:00:00Z", 900, 1),   // net 900 INCLUDE comisionul -> 450/buc
    ord(2, "BUY", "AAPL_US_EQ", 2, 110, "2026-09-02T14:00:00Z", 1000, 1),  // 500/buc
    ord(3, "SELL", "AAPL_US_EQ", 3, 120, "2026-09-05T14:00:00Z", 1650, 1.5), // net 1650 = incasat, dupa comision
    ord(4, "SELL", "AAPL_US_EQ", 1, 90, "2026-09-06T14:00:00Z", 420, 0.5)]);
  const r = T.perechi(l);
  assert.equal(r.inchise.length, 2); assert.equal(r.deschise.length, 0);
  const a = r.inchise.find((x) => x.qty === 3), b = r.inchise.find((x) => x.qty === 1);
  // cost: 2 x 450 + 1 x 500 = 1400 ; incasat 1650 -> +250 (netValue include deja comisioanele)
  aprox(a.rezultat, 250, 1e-6); aprox(a.cost, 1400, 1e-6); assert.equal(a.pornit, Date.parse("2026-09-01T14:00:00Z"));
  // ultimul lot: 1 x 500 ; incasat 420 -> -80
  aprox(b.rezultat, -80, 1e-6); aprox(b.durataOre, 4 * 24, 1e-6);
});
await test("perechi: vanzare fara cumparare in istoric (istoric trunchiat) -> marcata 'fara-cumparare', nu rezultat inventat", () => {
  const r = T.perechi(T.umpleri([ord(5, "SELL", "INTC_US_EQ", 1, 30, "2026-09-05T14:00:00Z", 130, 0)]));
  assert.equal(r.inchise.length, 0); assert.equal(r.faraCumparare.length, 1);
});
await test("simboluri: AAPL_US_EQ -> [AAPL]; SNDK1_US_EQ -> [SNDK1, SNDK]; BRK.B -> BRK-B; european -> fara candidat US", () => {
  assert.deepEqual(T.candidati("AAPL_US_EQ"), ["AAPL"]);
  assert.deepEqual(T.candidati("SNDK1_US_EQ"), ["SNDK1", "SNDK"]);
  assert.deepEqual(T.candidati("BRK.B_US_EQ"), ["BRK-B"]);
  assert.deepEqual(T.candidati("VUSAl_EQ"), ["VUSA.L"], "v88: Londra -> .L");
  // tickerele SPAC vechi pastrate de T212 (verificat pe numele din ordinele lui, 25.09)
  assert.deepEqual(T.candidati("NPA_US_EQ"), ["ASTS", "NPA"]); assert.equal(T.simbol("NPA_US_EQ"), "ASTS");
  assert.equal(T.simbol("XPOA_US_EQ"), "QBTS"); assert.equal(T.simbol("IPOB_US_EQ"), "OPEN"); assert.equal(T.simbol("ALUS_US_EQ"), "TE"); assert.equal(T.simbol("GWAC_US_EQ"), "CIFR");
  assert.equal(T.simbol("SNDK1_US_EQ"), "SNDK");
  assert.deepEqual(T.candidati("AVAV__US_EQ"), ["AVAV"], "T212 scrie AeroVironment cu doua liniute jos (vazut in ordinele lui, 25.09)");
});

await test("forma REALA (verificata 25.09): vanzarea vine cu cantitate NEGATIVA si cu realisedProfitLoss -> rezultatul REAL = oficialul T212 minus comisioanele de conversie; FIFO ramane verificare", () => {
  const cump = ord(1, "BUY", "FDS_US_EQ", 4, 270, "2026-09-20T14:00:00Z", 5000, 7.5);
  const vanz = { order: { id: 9, ticker: "FDS_US_EQ", quantity: -4, filledQuantity: -4, status: "FILLED", side: "SELL", extendedHours: true, createdAt: "2026-09-23T18:21:44Z" },
    fill: { id: 10, quantity: -4, price: 279.67, filledAt: "2026-09-23T18:22:55Z", walletImpact: { currency: "RON", netValue: 5172.5, realisedProfitLoss: 29.47, fxRate: 0.216, taxes: [{ name: "CURRENCY_CONVERSION_FEE", quantity: -7.77 }] } } };
  const u = T.umpleri([cump, vanz]);
  assert.equal(u.length, 2); assert.equal(u[1].side, "SELL"); assert.equal(u[1].qty, 4); aprox(u[1].realizat, 29.47, 1e-9);
  const r = T.perechi(u);
  // T212 nu scade comisioanele din realisedProfitLoss -> rezultatul real = 29,47 - 7,5 (cumparare) - 7,77 (vanzare)
  assert.equal(r.inchise.length, 1); aprox(r.inchise[0].rezultatOficial, 29.47, 1e-9, "oficialul T212 pastrat");
  aprox(r.inchise[0].rezultat, 29.47 - 7.5 - 7.77, 1e-9, "rezultatul REAL, cu comisioanele scazute"); aprox(r.inchise[0].comisioane, 15.27, 1e-9);
  aprox(r.inchise[0].rezultatFifo, 5172.5 - 5000, 1e-6, "FIFO al nostru, ca verificare (net include comisionul)");
  assert.equal(r.inchise[0].extVanzare, true);
});
// ---------------- istoricul complet (KV de acasa) + tura colectorului ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
async function posteaza(qs, corp, env) {
  const m = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.86.0." + (++ip % 250), authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "content-type": "application/json" };
  const res = await m.onRequestPost({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: "POST", headers: h, body: JSON.stringify(corp) }), env });
  let c = null; try { c = JSON.parse(await res.text()); } catch {}
  return { status: res.status, corp: c };
}
const umpl = (id, t, side) => ({ id: String(id), t, side, ticker: "AAPL_US_EQ", simbol: "AAPL", nume: "Apple", qty: 1, pret: 100, net: 450, fee: 1, moneda: "RON", fx: 0.22, ext: false, realizat: side === "SELL" ? 5 : null });

await test("ruta istoric: fara KV -> 503 cu motiv; POST salveaza, deduplica pe id, spune cate ordine sunt NOI; GET da umplerile in ordine si starea", async () => {
  assert.equal((await cheama("action=istoric", ENV)).status, 503);
  const kv = kvFals(), env = { ...ENV, ISTORIC: kv };
  const a = await posteaza("action=istoric", { ordine: ["1", "2", "3"], umpleri: [umpl(1, 200, "SELL"), umpl(2, 100, "BUY")], stare: { cursorVechi: "77", complet: false } }, env);
  assert.equal(a.status, 200); assert.equal(a.corp.noi, 3);
  const b = await posteaza("action=istoric", { ordine: ["3", "4"], umpleri: [umpl(2, 100, "BUY"), umpl(4, 300, "BUY")], stare: null }, env);
  assert.equal(b.corp.noi, 1, "doar 4 e nou");
  const g = await cheama("action=istoric", env);
  assert.equal(g.status, 200); assert.deepEqual(g.corp.umpleri.map((x) => x.id), ["2", "1", "4"], "sortate dupa timp, fara dubluri");
  assert.equal(g.corp.stare.cursorVechi, "77"); assert.equal(g.corp.stare.complet, false); assert.equal(g.corp.stare.ordine, 4);
  // fara origine -> refuzat (ca istoric-bot)
  const m = await import(`../functions/api/t212.js?t=${Date.now()}`);
  const r = await m.onRequestPost({ request: new Request("https://exemplu.test/api/t212?action=istoric", { method: "POST", headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.87.0.1" }, body: "{}" }), env });
  assert.equal(r.status, 403);
});
await test("ruta istoric: umplerile se curata (side necunoscut / t lipsa ies; lipsa ramane null, nu 0; cursor doar cifre)", async () => {
  const kv = kvFals(), env = { ...ENV, ISTORIC: kv };
  const rau = { ...umpl(9, 100, "BUY"), fx: null, realizat: undefined };
  await posteaza("action=istoric", { ordine: ["9"], umpleri: [rau, { ...umpl(8, 100, "HOLD") }, { ...umpl(7, null, "BUY") }], stare: { cursorVechi: "12abc", complet: false } }, env);
  const g = await cheama("action=istoric", env);
  assert.deepEqual(g.corp.umpleri.map((x) => x.id), ["9"]); assert.strictEqual(g.corp.umpleri[0].fx, null); assert.strictEqual(g.corp.umpleri[0].realizat, null);
  assert.strictEqual(g.corp.stare.cursorVechi, null, "cursor cu litere refuzat");
});

await test("ruta cf (daca ascultai, actiuni): POST imbina verdictele curatate (nivel necunoscut -> fara-date, motive taiate), GET le da inapoi; fara KV -> 503", async () => {
  assert.equal((await cheama("action=cf", ENV)).status, 503);
  const kv = kvFals(), env = { ...ENV, ISTORIC: kv };
  await posteaza("action=cf", { verdicte: { s1: { nivel: "cumpara", motive: [], greseli: [] }, "s 2": { nivel: "hack", motive: ["x".repeat(500)], greseli: ["dupa-miscare", "<b>"] } } }, env);
  await posteaza("action=cf", { verdicte: { s3: { nivel: "nu", motive: ["trend jos"], greseli: [] } } }, env);
  const g = await cheama("action=cf", env);
  assert.equal(g.status, 200); assert.deepEqual(Object.keys(g.corp.cf).sort(), ["s1", "s2", "s3"]);
  assert.equal(g.corp.cf.s2.nivel, "fara-date"); assert.ok(g.corp.cf.s2.motive[0].length <= 200); assert.deepEqual(g.corp.cf.s2.greseli, ["dupa-miscare"]);
});

await test("ruta dividende (v87): toate paginile T212, suma si randurile compacte; 403 -> spune permisiunea", async () => {
  fetchStub((u) => /history\/dividends/.test(u) ? (/cursor=2/.test(u) ? { corp: { items: [{ ticker: "MPC_US_EQ", amount: 2.5, paidOn: "2026-09-10T13:00:00Z", currency: "RON" }], nextPagePath: null } }
    : { corp: { items: [{ ticker: "WDC_US_EQ", amount: 1.22, paidOn: "2026-09-17T13:00:00Z", currency: "RON" }], nextPagePath: "/api/v0/history/dividends?limit=50&cursor=2" } }) : { status: 404, corp: {} });
  const r = await cheama("action=dividende");
  assert.equal(r.status, 200); assert.equal(r.corp.items.length, 2); assert.equal(r.corp.items[0].ticker, "WDC_US_EQ");
  fetchStub(() => ({ status: 403, corp: "" }));
  const e = await cheama("action=dividende&x=1"); assert.equal(e.status, 403); assert.match(e.corp.error, /Dividend/i);
});
await test("ruta rezultate (v87): Nasdaq -> data; NPA -> intreaba de ASTS; fara data -> data null (nu inventata)", async () => {
  fetchStub((u) => /api\.nasdaq\.com\/api\/analyst\/ASTS\/earnings-date/.test(u) ? { corp: { data: { reportText: "AST SpaceMobile is estimated to report earnings on  11/10/2026. The" } } }
    : { corp: { data: { reportText: "Our vendor, Zacks, hasn't provided us with the upcoming earnings report date." } } });
  const r = await cheama("action=rezultate&ticker=NPA_US_EQ");
  assert.equal(r.status, 200); assert.equal(r.corp.simbol, "ASTS"); assert.equal(r.corp.data, "2026-11-10"); assert.equal(r.corp.sigur, false);
  const n = await cheama("action=rezultate&ticker=AVGO_US_EQ"); assert.strictEqual(n.corp.data, null);
  assert.equal((await cheama("action=rezultate&ticker=VUSAl_EQ")).status, 404);
});
await test("ruta cf (v87): pastreaza proba cu stop {8,10,15: {pct, zi} | null}, curatata", async () => {
  const kv = kvFals(), env = { ...ENV, ISTORIC: kv };
  await posteaza("action=cf", { verdicte: { s1: { nivel: "nu", motive: [], greseli: [], stop: { 8: { pct: -0.083, zi: 1 }, 10: null, 15: { pct: "rau" }, 99: { pct: 1 } } } } }, env);
  const g = await cheama("action=cf", env);
  assert.deepEqual(g.corp.cf.s1.stop, { 8: { pct: -0.083, zi: 1 }, 10: null, 15: null });
});

const { turaT212 } = await import("./lib/tura-t212.mjs");
// istoric fals: 5 pagini a cate 2 ordine, cele mai noi primele
function istoricFals(nrPagini, primulId) {
  const pagini = []; let id = primulId;
  for (let p = 0; p < nrPagini; p++) { const items = []; for (let i = 0; i < 2; i++) items.push({ order: { id: id-- } }); pagini.push(items); }
  return pagini;
}
function contFals(pagini) {
  const vazute = new Set(), stare = { complet: false, cursorVechi: null }, cereri = [];
  return { cereri, vazute, stare, deps: (max) => ({
    max, pasMs: 0, pauza: async () => {}, jurnal: () => {}, umpleri: () => [],
    cereStare: async () => ({ ...stare }),
    cerePagina: async (c) => { cereri.push(c); const i = c === null ? 0 : Number(c); return { items: pagini[i], cursor: i + 1 < pagini.length ? String(i + 1) : null }; },
    salveaza: async ({ ordine, stare: s }) => { let noi = 0; ordine.forEach((o) => { if (!vazute.has(o)) { vazute.add(o); noi++; } }); if (s) Object.assign(stare, s); return { noi }; } }) };
}
await test("tura T212: prima data coboara cate `max` pagini si tine minte cursorul; tura urmatoare citeste capul, da de pagina stiuta si continua de unde a ramas; apoi doar capul", async () => {
  const pagini = istoricFals(5, 100), c = contFals(pagini);
  const r1 = await turaT212(c.deps(2));
  assert.equal(r1.pagini, 2); assert.equal(r1.complet, false); assert.equal(c.stare.cursorVechi, "2"); assert.equal(c.vazute.size, 4);
  const r2 = await turaT212(c.deps(10));
  assert.deepEqual(c.cereri.slice(2), [null, "2", "3", "4"], "capul (stiut) -> sare la cursorul vechi");
  assert.equal(r2.complet, true); assert.equal(c.vazute.size, 10); assert.equal(c.stare.complet, true);
  // ordine noi deasupra: 4 noi -> capul are 2 pagini noi, a treia (fosta prima) e stiuta in intregime
  pagini.unshift([{ order: { id: 104 } }, { order: { id: 103 } }], [{ order: { id: 102 } }, { order: { id: 101 } }]);
  c.cereri.length = 0;
  const r3 = await turaT212(c.deps(10));
  assert.deepEqual(c.cereri, [null, "1", "2"], "se opreste la prima pagina fara nimic nou"); assert.equal(r3.noi, 4); assert.equal(c.vazute.size, 14);
});
await test("tura T212: istoric de o singura pagina -> complet din prima; cerere picata -> eroarea urca (colectorul o scrie in jurnal), cursorul ramas nu se pierde", async () => {
  const c = contFals(istoricFals(1, 5));
  assert.equal((await turaT212(c.deps(12))).complet, true);
  const c2 = contFals(istoricFals(4, 50)); await turaT212(c2.deps(1));
  const d = c2.deps(12); d.cerePagina = async () => { throw new Error("429"); };
  await assert.rejects(() => turaT212(d), /429/); assert.equal(c2.stare.cursorVechi, "1");
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
