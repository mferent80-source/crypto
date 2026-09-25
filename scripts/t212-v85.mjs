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
  assert.deepEqual(T.candidati("VUSAl_EQ"), []);
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
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
