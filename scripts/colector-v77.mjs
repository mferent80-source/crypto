// Probele pentru alertele botului (public/lib/alerte.js) si pentru istoricul
// de pe serverul de acasa (functions/api/istoric-bot.js).
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/alerte.js", import.meta.url), "utf8");
const A = new Function(`${SRC}; return Alerte;`)();
const TOKEN = "token-de-proba-colector-77";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

const ORA = 3600000, T0 = 1_800_000_000_000;
const bot = (o = {}) => ({ id: "b1", baza: "ADA.PERP", directie: "long", activ: true, stareInterna: "running",
  distantaLichidarePct: 30, lichidareDepasita: false, pretLichidare: 0.5, stareMargine: "NORMAL", stareRisc: "TRADING",
  pretCurent: 1.0, gridJos: 0.9, gridSus: 1.1, opritorPierdere: null, opritorPierdereActiv: false, ...o });
const chei = (r) => r.mesaje.map((m) => m.cheie + ":" + m.nivel).sort().join(",");

console.log("\nV77 · alertele si istoricul de acasa · proba\n");

await test("totul in regula la prima rulare -> niciun mesaj (nu anunta 'a trecut' ce n-a fost)", () => {
  assert.equal(A.evalueaza(bot(), { fata4h: "bine" }, {}, T0).mesaje.length, 0);
});

await test("lichidarea: 12% -> atentie; tot 12% dupa o ora -> tacere; dupa 3 ore -> se repeta", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  assert.equal(chei(r), "lich:atentie");
  r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, r.stare, T0 + ORA);
  assert.equal(r.mesaje.length, 0, "o alerta care persista nu se trimite in fiecare minut");
  r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, r.stare, T0 + 3 * ORA + 1);
  assert.equal(chei(r), "lich:atentie");
});

await test("lichidarea: se agraveaza la 5% -> critic imediat; revine la 30% -> 'info' abia dupa 10 minute stabile, o data", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  r = A.evalueaza(bot({ distantaLichidarePct: 5 }), null, r.stare, T0 + 60000);
  assert.equal(chei(r), "lich:critic");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000);
  assert.equal(r.mesaje.length, 0, "'a trecut' dupa un singur minut bun e prea devreme");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000 + 10 * 60000);
  assert.equal(chei(r), "lich:info");
  r = A.evalueaza(bot({ distantaLichidarePct: 30 }), null, r.stare, T0 + 120000 + 11 * 60000);
  assert.equal(r.mesaje.length, 0, "'a trecut' se spune o singura data");
});

function oscileaza(a, b, minute) {
  let st = {}, n = 0;
  for (let i = 0; i < minute; i++) { const r = A.evalueaza(bot({ distantaLichidarePct: i % 2 ? a : b }), null, st, T0 + i * 60000); st = r.stare; n += r.mesaje.length; }
  return n;
}
await test("histerezis: o ora de oscilatie la pragul de 15% -> un singur mesaj, nu 59", () => {
  const n = oscileaza(14.9, 15.1, 60);
  assert.ok(n <= 1, `${n} mesaje intr-o ora`);
});
await test("histerezis: o ora de oscilatie la pragul critic de 8% -> cel mult doua mesaje, nu 31", () => {
  const n = oscileaza(7.9, 8.1, 60);
  assert.ok(n <= 2, `${n} mesaje intr-o ora`);
});
await test("lumanarile de 4h care pica din cand in cand nu retrimit alerta de directie", () => {
  let r = A.evalueaza(bot(), { fata4h: "rau", dir4h: "coboara" }, {}, T0), n = r.mesaje.length;
  for (let i = 1; i <= 12; i++) { r = A.evalueaza(bot(), i % 2 ? null : { fata4h: "rau", dir4h: "coboara" }, r.stare, T0 + i * 60000); n += r.mesaje.length; }
  assert.equal(n, 1, `${n} mesaje de directie in 12 ture`);
});

await test("lichidare DEPASITA -> critic, cu pretul de lichidare in mesaj", () => {
  const r = A.evalueaza(bot({ distantaLichidarePct: -2, lichidareDepasita: true, pretLichidare: 0.26 }), null, {}, T0);
  assert.equal(chei(r), "lich:critic");
  assert.match(r.mesaje[0].mesaj, /0\.26/);
});

await test("distanta LIPSA nu e siguranta: dupa o alerta, lipsa nu trimite 's-a indepartat' si pastreaza starea", () => {
  let r = A.evalueaza(bot({ distantaLichidarePct: 12 }), null, {}, T0);
  r = A.evalueaza(bot({ distantaLichidarePct: null }), null, r.stare, T0 + 60000);
  assert.equal(r.mesaje.length, 0, `lipsa a produs: ${chei(r)}`);
  assert.equal(r.stare.lich.nivel, "atentie", "starea alertei s-a pierdut pe o citire fara distanta");
});

await test("Pionex raporteaza LIQUIDATING / risc anormal -> critic", () => {
  assert.equal(chei(A.evalueaza(bot({ stareMargine: "LIQUIDATING" }), null, {}, T0)), "status:critic");
  assert.equal(chei(A.evalueaza(bot({ stareRisc: "PAUSED" }), null, {}, T0)), "status:critic");
});

await test("pretul iese din grid -> atentie; pret lipsa nu spune 'din nou in grid'", () => {
  let r = A.evalueaza(bot({ pretCurent: 0.85 }), null, {}, T0);
  assert.equal(chei(r), "grid:atentie");
  r = A.evalueaza(bot({ pretCurent: null }), null, r.stare, T0 + 60000);
  assert.equal(r.mesaje.length, 0);
});

await test("piata pe 4h trece impotriva botului -> atentie, o data", () => {
  let r = A.evalueaza(bot(), { fata4h: "bine", dir4h: "urca" }, {}, T0);
  r = A.evalueaza(bot(), { fata4h: "rau", dir4h: "coboara" }, r.stare, T0 + 60000);
  assert.equal(chei(r), "directie:atentie");
  assert.match(r.mesaje[0].mesaj, /nu o prognoză/);
});

await test("opritorul pe pierdere STINS cu lichidarea sub 20% -> atentie; peste 20% -> tacere", () => {
  assert.equal(chei(A.evalueaza(bot({ opritorPierdere: 0.3, distantaLichidarePct: 18 }), null, {}, T0)), "opritor:atentie");
  assert.equal(A.evalueaza(bot({ opritorPierdere: 0.3, distantaLichidarePct: 25 }), null, {}, T0).mesaje.length, 0);
});

// ── ruta istoric-bot, cu un KV fals ─────────────────────────────────────────
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const proaspat = () => `../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`;
let ip = 0;
async function cheama(metoda, qs, env, { corp = null, token = TOKEN, origin = "https://exemplu.test" } = {}) {
  const m = await import(proaspat());
  const h = { "cf-connecting-ip": "10.0.0." + (++ip % 250) };
  if (token) h.authorization = "Bearer " + token;
  if (corp !== null) { h["content-type"] = "application/json"; if (origin) h.origin = origin; }
  const req = new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp === null ? undefined : JSON.stringify(corp) });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}

await test("istoric: fara token -> 401; fara KV (pagina publicata) -> 503 cu motiv", async () => {
  assert.equal((await cheama("GET", "action=citeste&bot=b1", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, { token: null })).status, 401);
  const r = await cheama("GET", "action=citeste&bot=b1", { APP_API_TOKEN: TOKEN });
  assert.equal(r.status, 503); assert.equal(r.d.error, "ISTORIC_DOAR_ACASA");
});

await test("istoric: POST din alta origine -> 403 (doar serverul de acasa scrie)", async () => {
  const r = await cheama("POST", "action=adauga", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, { corp: { bot: "b1", intrare: { t: Date.now() } }, origin: "https://rau.test" });
  assert.equal(r.status, 403);
});

await test("istoric: o intrare pe minut, lipsa ramane null (nu 0), se citeste inapoi", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Math.floor(Date.now() / 60000) * 60000 - 5 * 60000 + 10000;
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t, perechi: 10, profitNet: null, pretPerp: "0.33" } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: t + 5000, perechi: 11, profitNet: "", pretPerp: 0.34 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: t + 60000, perechi: 12, pretPerp: 0.35 } } });
  const r = await cheama("GET", "action=citeste&bot=b1&ore=1", env);
  assert.equal(r.status, 200);
  assert.equal(r.d.intrari.length, 2, `acelasi minut trebuia sa se inlocuiasca: ${JSON.stringify(r.d.intrari)}`);
  assert.equal(r.d.intrari[0].perechi, 11);
  assert.strictEqual(r.d.intrari[0].profitNet, null, "un profit lipsa a devenit altceva decat null");
  assert.strictEqual(r.d.intrari[1].investit, null);
});

await test("istoric: clasamentul (v79 F3) se scrie curatat si se citeste inapoi; lipsa ramane null; corp stricat -> 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, la = Date.now();
  const r0 = await cheama("GET", "action=clasament", env);
  assert.equal(r0.status, 200); assert.strictEqual(r0.d.clasament, null);
  const w = await cheama("POST", "action=clasament", env, { corp: { la, monede: [
    { simbol: "MET_USDT_PERP", stare: "candidat", dir: "long", tarie: "tare", regim: { r4h: 0.9, r24h: 1.1, miscare: false }, volum: "123.4", pret: 0.33, latime: 0.14, pas: 0.02, grile: 8, profitGrila: 0.019, traversariZi: 3, scor: 0.057 },
    { simbol: "bad<script>", stare: "ceva", dir: "x", regim: null, volum: null, scor: "" },
    "gunoi", null ] } });
  assert.equal(w.status, 200); assert.equal(w.d.monede, 2);
  const r = await cheama("GET", "action=clasament", env);
  assert.equal(r.d.clasament.la, la); assert.equal(r.d.clasament.monede.length, 2);
  assert.equal(r.d.clasament.monede[0].volum, 123.4); assert.equal(r.d.clasament.monede[0].regim.miscare, false);
  assert.equal(r.d.clasament.monede[1].simbol, "BADSCRIPT"); assert.equal(r.d.clasament.monede[1].stare, "fara-date"); assert.strictEqual(r.d.clasament.monede[1].scor, null); assert.strictEqual(r.d.clasament.monede[1].dir, null);
  assert.equal((await cheama("POST", "action=clasament", env, { corp: { monede: [] } })).status, 400);
});

await test("istoric: alertele (v79.1, fara ntfy) se pun in KV curatate, se tin ultimele 100, se citesc cele mai noi primele", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Date.now();
  for (let i = 0; i < 103; i++) await cheama("POST", "action=alerte", env, { corp: { alerta: { t: t + i, nivel: i % 2 ? "atentie" : "critic", titlu: "MET: proba " + i + " <b>", mesaj: "m", bot: "2382", cheie: "lich" } } });
  const r = await cheama("GET", "action=alerte", env);
  assert.equal(r.status, 200); assert.equal(r.d.alerte.length, 100);
  assert.equal(r.d.alerte[0].titlu, "MET: proba 102 <b>", "cea mai noua prima (escaparea e treaba ecranului)");
  assert.equal(r.d.alerte[99].t, t + 3);
  assert.equal((await cheama("POST", "action=alerte", env, { corp: { alerta: { nivel: "x" } } })).status, 400, "fara t/titlu -> 400");
  assert.equal((await cheama("POST", "action=alerte", env, { corp: { alerta: { t: t + 1000, nivel: "gresit", titlu: "a" } } })).d.ok, true);
  assert.equal((await cheama("GET", "action=alerte", env)).d.alerte[0].nivel, "info", "nivel necunoscut -> info");
});

await test("tura de clasament (v79.1, modul testabil): top dupa volum, o cerere de 4H pe moneda, result:false = esec, >20% fara date -> NU se urca; altfel se urca", async () => {
  const { turaClasament } = await import("./lib/tura-clasament.mjs");
  const GC = new Function(`${fs.readFileSync(new URL("../public/lib/grid-calcul.js", import.meta.url), "utf8")}; return GridCalcul;`)();
  const GCL = new Function(`${fs.readFileSync(new URL("../public/lib/grid-calcul.js", import.meta.url), "utf8")}; ${fs.readFileSync(new URL("../public/lib/grid-clasament.js", import.meta.url), "utf8")}; return GridClasament;`)();
  const Q = 4 * 3600000, T = 1_790_000_000_000 - (1_790_000_000_000 % 86400000);
  const klines = (n, s) => { let p = 1, x = s || 5; const out = []; for (let i = 0; i < n; i++) { x = (x * 16807) % 2147483647; p *= 1 + ((x / 2147483647) - 0.5) * 0.01; out.push({ time: T + i * Q, open: String(p), high: String(p * 1.004), low: String(p * 0.996), close: String(p * 1.001) }); } return out; };
  const tickers = [{ symbol: "A_USDT_PERP", amount: "900" }, { symbol: "B_USDT_PERP", amount: "500" }, { symbol: "C_USDT_PERP", amount: "100" }, { symbol: "D_USDT", amount: "9999" }];
  const apeluri = [], urcari = [], jurnal = [];
  const deps = (rasp) => ({ cere: async (c) => { apeluri.push(c); return rasp(c); }, trimite: async (c, corp) => { urcari.push(corp); return { ok: true }; }, jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, GridCalcul: GC, GridClasament: GCL, top: 2 });
  // toate bune -> 2 monede (top 2), urcat
  let r = await turaClasament(deps((c) => c.includes("tickers") ? { data: { tickers } } : { data: { klines: klines(500, c.includes("A_") ? 5 : 9) } }));
  assert.equal(r.urcat, true); assert.equal(r.monede.length, 2); assert.equal(urcari.length, 1);
  assert.deepEqual(apeluri.slice(1).map((c) => c.match(/symbol=([A-Z_]+)/)[1]), ["A_USDT_PERP", "B_USDT_PERP"]);
  // result:false pe una din doua (200 fara klines) -> 50% fara date -> NU se urca
  urcari.length = 0;
  r = await turaClasament(deps((c) => c.includes("tickers") ? { data: { tickers } } : c.includes("A_") ? { result: false, code: "RATE_LIMITED" } : { data: { klines: klines(500) } }));
  assert.equal(r.urcat, false); assert.equal(urcari.length, 0); assert.ok(jurnal.some((l) => /NEURCAT/.test(l)));
});

await test("canalul Discord (v79.2): webhook validat, embed colorat pe nivel, text simplu pentru notificare, 2xx = trimis, 4xx/retea = netrimis", async () => {
  const { esteWebhookDiscord, mesajDiscord, trimiteDiscord } = await import("./lib/canal-discord.mjs");
  assert.equal(esteWebhookDiscord("https://discord.com/api/webhooks/123456/abc_DEF-ghi"), true);
  assert.equal(esteWebhookDiscord("https://discord.com/api/webhooks/123456/abc?x=1"), false);
  assert.equal(esteWebhookDiscord(""), false); assert.equal(esteWebhookDiscord(null), false);
  const m = mesajDiscord({ nivel: "critic", titlu: "MET: lichidarea la 7,5%", mesaj: "Mai sunt 7,5%.", t: 1_790_000_000_000 });
  assert.equal(m.content, "🔴 MET: lichidarea la 7,5%"); assert.equal(m.embeds[0].color, 0xdc283c); assert.equal(m.embeds[0].description, "Mai sunt 7,5%.");
  assert.equal(mesajDiscord({ nivel: "gresit", titlu: "x" }).embeds[0].color, 0x00aa5a, "nivel necunoscut -> info");
  const jur = [], cereri = [];
  const fetchFals = (stare) => async (url, opt) => { cereri.push({ url, corp: JSON.parse(opt.body) }); return { ok: stare < 300, status: stare, text: async () => "corp" }; };
  assert.equal(await trimiteDiscord({ nivel: "atentie", titlu: "T" }, { fetch: fetchFals(204), webhook: "https://discord.com/api/webhooks/1/a", jurnal: (...a) => jur.push(a.join(" ")) }), true);
  assert.ok(cereri[0].url.startsWith("https://discord.com/api/webhooks/1/a")); assert.equal(cereri[0].corp.username, "Crypto Radar");
  assert.equal(await trimiteDiscord({ nivel: "atentie", titlu: "T" }, { fetch: fetchFals(429), webhook: "https://discord.com/api/webhooks/1/a", jurnal: (...a) => jur.push(a.join(" ")) }), false);
  assert.equal(await trimiteDiscord({ nivel: "atentie", titlu: "T" }, { fetch: async () => { throw new Error("retea"); }, webhook: "https://discord.com/api/webhooks/1/a", jurnal: (...a) => jur.push(a.join(" ")) }), false);
  assert.equal(await trimiteDiscord({ nivel: "atentie", titlu: "T" }, { fetch: fetchFals(204), webhook: "", jurnal: (...a) => jur.push(a.join(" ")) }), false, "fara webhook -> netrimis, cu motiv in jurnal");
  assert.ok(jur.some((l) => /DISCORD_WEBHOOK/.test(l)));
});

await test("istoric: laboratorul (v79.5) se scrie curatat (verdict necunoscut -> n-am-aflat, id curatat, lipsa = null) si se citeste inapoi; corp stricat -> 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, la = Date.now();
  assert.strictEqual((await cheama("GET", "action=laborator", env)).d.laborator, null);
  const g = { n: 400, nEf: 50, pePlus: 0.5, mediana: "", ic: [0.37, 0.64] };
  const w = await cheama("POST", "action=laborator", env, { corp: { la, H: 2, monede: 20, ferestre: 1620, intrebari: [
    { id: "miscare", titlu: "T", eticheteA: "a", eticheteB: "b", verdict: "dovedit", A: g, B: g, alegere: { A: g, B: g }, nevazut: { A: g, B: g } },
    { id: "RAU<script>", titlu: "x", verdict: "sigur", A: null, B: g }, "gunoi" ] } });
  assert.equal(w.status, 200); assert.equal(w.d.intrebari, 2);
  const r = (await cheama("GET", "action=laborator", env)).d.laborator;
  assert.equal(r.monede, 20); assert.equal(r.intrebari[0].verdict, "dovedit"); assert.strictEqual(r.intrebari[0].A.mediana, null);
  assert.equal(r.intrebari[1].id, "script"); assert.equal(r.intrebari[1].verdict, "n-am-aflat"); assert.strictEqual(r.intrebari[1].A, null);
  assert.equal((await cheama("POST", "action=laborator", env, { corp: { intrebari: [] } })).status, 400);
});

await test("istoric: planul (v81) pe bot - se scrie curatat (doar numere pozitive), se citeste, null il sterge", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.strictEqual((await cheama("GET", "action=plan&bot=2382", env)).d.plan, null);
  const w = await cheama("POST", "action=plan", env, { corp: { bot: "2382", plan: { plus: "5", minus: 10, afaraOre: -3 } } });
  assert.equal(w.status, 200);
  const r = (await cheama("GET", "action=plan&bot=2382", env)).d.plan;
  assert.equal(r.plus, 5); assert.equal(r.minus, 10); assert.strictEqual(r.afaraOre, null);
  await cheama("POST", "action=plan", env, { corp: { bot: "2382", plan: null } });
  assert.strictEqual((await cheama("GET", "action=plan&bot=2382", env)).d.plan, null);
  assert.equal((await cheama("POST", "action=plan", env, { corp: { plan: { plus: 1 } } })).status, 400);
});

await test("istoric: semnalele (v82) - log curatat (max 200, nivel necunoscut -> info, cod curatat) + instantaneul de acum; se citesc inapoi", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Date.now();
  const log = new Array(210).fill(0).map((_, i) => ({ t: t + i, cod: i === 209 ? "Rau<x>" : "miscare", nivel: i === 209 ? "ceva" : "atentie", motiv: "m", total: -4.7, dreptate: i === 0 ? true : null }));
  const w = await cheama("POST", "action=semnale", env, { corp: { bot: "2382", log, acum: { la: t, btc: { nivel: "atentie", text: "BTC" }, afaraOre: 0, regimBtc: { r4h: 2, r24h: 1, miscare: true } } } });
  assert.equal(w.status, 200); assert.equal(w.d.log, 200);
  const r = (await cheama("GET", "action=semnale&bot=2382", env)).d.semnale;
  assert.equal(r.log.length, 200); assert.equal(r.log[199].cod, "aux"); assert.equal(r.log[199].nivel, "info");
  assert.equal(r.acum.btc.text, "BTC"); assert.equal(r.acum.regimBtc.miscare, true); assert.strictEqual(r.acum.aglomerare, null);
});

await test("istoric: contrafactualul (v83) - harta id -> ce ar fi zis, nivel necunoscut -> fara-date, se adauga fara sa stearga ce era", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.deepEqual((await cheama("GET", "action=contrafactual", env)).d.contrafactual, {});
  await cheama("POST", "action=contrafactual", env, { corp: { boti: [{ id: "t1", zice: { nivel: "nu", motive: ["a", "b"], dirTrend: "long" } }] } });
  await cheama("POST", "action=contrafactual", env, { corp: { boti: [{ id: "t2", zice: { nivel: "ciudat" } }, { id: "", zice: { nivel: "nu" } }] } });
  const m = (await cheama("GET", "action=contrafactual", env)).d.contrafactual;
  assert.equal(m.t1.nivel, "nu"); assert.deepEqual(m.t1.motive, ["a", "b"]); assert.equal(m.t2.nivel, "fara-date"); assert.equal(Object.keys(m).length, 2);
  assert.equal((await cheama("POST", "action=contrafactual", env, { corp: {} })).status, 400);
});

await test("istoric: raportul de duminica (v84) se scrie curatat si se citeste inapoi; fara linii -> 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.strictEqual((await cheama("GET", "action=raport", env)).d.raport, null);
  await cheama("POST", "action=raport", env, { corp: { la: 1, linii: ["a", 5, "b"], saptamana: "2026-09-27" } });
  const r = (await cheama("GET", "action=raport", env)).d.raport;
  assert.deepEqual(r.linii, ["a", "b"]); assert.equal(r.saptamana, "2026-09-27");
  assert.equal((await cheama("POST", "action=raport", env, { corp: { la: 1 } })).status, 400);
});

await test("colector.mjs SE INCARCA intreg (v84: o ordine gresita de incarcare l-a oprit tacut; probele pe bucati nu vedeau)", async () => {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [new URL("./colector.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400));
  assert.match(r.stdout, /INCARCAT true/);
});

await test("istoric: intrarile mai vechi de 7 zile se taie; 'ore' limiteaza citirea", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, acum = Date.now();
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 8 * 24 * ORA, perechi: 1 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 30 * ORA, perechi: 2 } } });
  await cheama("POST", "action=adauga", env, { corp: { bot: "b1", intrare: { t: acum - 60000, perechi: 3 } } });
  const toate = JSON.parse(env.ISTORIC.m.get("ist:b1"));
  assert.deepEqual(toate.map((x) => x.perechi), [2, 3], "intrarea de acum 8 zile trebuia taiata");
  assert.deepEqual((await cheama("GET", "action=citeste&bot=b1&ore=24", env)).d.intrari.map((x) => x.perechi), [3]);
});

await test("istoric: config pastreaza canalul ntfy (validat) si ultima tura a colectorului", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await cheama("POST", "action=config", env, { corp: { ntfyTopic: "a b" } })).status, 400);
  await cheama("POST", "action=config", env, { corp: { ntfyTopic: "radar-abc123def456", colectorLa: 1234 } });
  const r = await cheama("GET", "action=config", env);
  assert.deepEqual(r.d.config, { ntfyTopic: "radar-abc123def456", colectorLa: 1234 });
});

// ── pionex-account?action=futures: marja libera din contul futures manual ──
const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js");
async function contFutures(raspuns) {
  reseteazaRitmPionex();
  const fetchVechi = globalThis.fetch;
  const cai = [];
  globalThis.fetch = async (url, opt = {}) => { cai.push({ url: String(url), metoda: opt.method || "GET" });
    return new Response(typeof raspuns === "string" ? raspuns : JSON.stringify(raspuns), { status: 200, headers: { "content-type": "application/json" } }); };
  try {
    const m = await import(`../functions/api/pionex-account.js?t=${Date.now()}_${Math.random()}`);
    const res = await m.onRequestGet({ request: new Request("https://exemplu.test/api/pionex-account?action=futures",
      { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.9.9." + (++ip % 250) } }),
      env: { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
    return { status: res.status, d: await res.json(), cai };
  } finally { globalThis.fetch = fetchVechi; }
}

await test("futures: citeste /uapi/v1/account/detail cu GET si da USDT-ul liber; lipsa ramane null", async () => {
  const r = await contFutures({ result: true, data: { balances: [{ coin: "ADA", available: "5" }, { coin: "USDT", available: "12.5", assets: "20", unrealizedPnL: "", totalInitialMargin: "7.5" }] } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.d.usdt, { disponibil: 12.5, total: 20, nerealizat: null, marjaFolosita: 7.5 });
  assert.ok(r.cai.length === 1 && r.cai[0].metoda === "GET" && /\/uapi\/v1\/account\/detail\?/.test(r.cai[0].url), JSON.stringify(r.cai));
});

await test("futures: forma necunoscuta -> 502, nu 'sold zero'", async () => {
  const r = await contFutures({ result: true, data: {} });
  assert.equal(r.status, 502);
  assert.equal(r.d.motiv, "forma-necunoscuta");
});

// ── lansatoarele: actualizarea nu are voie sa bucleze si nici sa citeasca .bat-ul schimbat ──
await test("lansatoare: versiunea de dinainte se citeste explicit (nu HEAD@{1} - a produs o bucla de reporniri), repornirea e unica", () => {
  for (const f of ["PORNESTE-CRYPTO-RADAR.bat", "PORNESTE-SI-PE-TELEFON.bat"]) {
    const t = fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.ok(!/git diff[^\r\n]*HEAD@\{1\}/.test(t), `${f}: compara cu HEAD@{1} - dupa un pull facut de altcineva reporneste la nesfarsit`);
    const inainte = t.indexOf("git rev-parse HEAD"), bloc = t.indexOf("  git pull --ff-only");
    assert.ok(inainte > 0 && inainte < bloc, `${f}: versiunea de dinainte trebuie citita INAINTE de pull`);
    assert.match(t, /start "" "%~f0" --repornit/, `${f}: repornirea trebuie sa poarte --repornit`);
    assert.match(t, /if "%~1"=="--repornit" \(/, `${f}: un lansator repornit nu are voie sa reporneasca din nou`);
  }
});

await test("lansatorul inchide sesiunea veche DOAR a acestui folder (ferestre, server, colector dupa pid) - nimic strain", () => {
  const t = fs.readFileSync(new URL("../PORNESTE-CRYPTO-RADAR.bat", import.meta.url), "utf8");
  assert.match(t, /if "%RC%"=="3" goto :INCHIDVECHI/, "cu serverul acestui folder pornit, lansatorul trebuie sa inchida sesiunea veche");
  const i = t.indexOf("rem [ps:inchide]");
  assert.ok(i > 0, "lipseste blocul [ps:inchide]");
  const ps = t.slice(i).split(/\r?\n/)[1];
  assert.match(ps, /\$_\.ProcessId -ne \$eu/, "nu are voie sa-si inchida propria fereastra");
  assert.match(ps, /ToLower\(\)\.Contains\(\$dir\)/, "ferestrele se inchid doar daca sunt din ACEST folder");
  assert.match(ps, /\$txt\.Contains\('wrangler'\) -and \$txt\.Contains\(\$dir\)/, "serverul de pe port se inchide doar daca e wrangler-ul acestui folder");
  assert.match(ps, /data\\colector\.pid/, "colectorul se inchide dupa pid-ul acestui folder");
  assert.ok(!/Where-Object \{[^}]*colector\\\.mjs[^}]*\} \| ForEach-Object \{ taskkill/.test(ps), "nu inchide ORICE colector de pe PC");
  assert.ok(!ps.slice(ps.indexOf('"') + 1, ps.lastIndexOf('"')).includes('"'), "ghilimele duble in comanda PowerShell rup linia din cmd");
});

console.log(`\nV77_COLECTOR ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
