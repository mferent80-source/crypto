// Proba paginii Scan (v96): rezumatul zilnic, retetele, scorul, semaforul, starea pe perioade (lib/scan.js),
// tura colectorului cu un server fals (scripts/lib/tura-scan.mjs) si ruta istoric-bot?action=scan. Fara retea.
// Rulare: node scripts/scan-v96.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { turaScan } from "./lib/tura-scan.mjs";

for (const f of ["grid-calcul.js", "scan.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const S = globalThis.Scan;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const ZI = 86400000, ORA = 3600000, T0 = Date.UTC(2026, 8, 27, 6, 0);   // duminica 27.09, 09:00 Bucuresti (bursa inchisa)
// n bare zilnice cu pretul f(i), maxim/minim +-1%
const bare = (n, f, vol) => Array.from({ length: n }, (_, i) => ({ t: T0 - (n - i) * ZI, h: f(i) * 1.001, l: f(i) * 0.999, c: f(i), v: vol == null ? 1000 : vol }));
const sus = (n) => bare(n, (i) => 100 * Math.pow(1.004, i));

await test("rezumat: sub 60 de bare nu judeca; pe un trend in sus: peste 20/50/200, RSI mare, spargere, volumul in dolari", async () => {
  assert.equal(S.rezumat(sus(59)), null);
  const z = S.rezumat(sus(260));
  assert.equal(z.e20, true); assert.equal(z.e50, true); assert.equal(z.e200, true); assert.ok(z.rsi > 70, "rsi " + z.rsi);
  assert.equal(z.sparge, true); assert.ok(Math.abs(z.ch - 0.4) < 0.01, "ch " + z.ch); assert.ok(z.ch7 > 2.7 && z.ch7 < 2.9, "ch7 " + z.ch7);
  assert.equal(z.spark.length, 30); assert.equal(z.vol, Math.round(sus(260).slice(-20).reduce((s, x) => s + 1000 * x.c, 0) / 20));
  assert.ok(z.atrPct > 0.4 && z.atrPct < 0.6, "atr " + z.atrPct);
  const scurt = S.rezumat(sus(120)); assert.equal(scurt.e200, null, "fara 200 de zile, media de 200 e necunoscuta, nu falsa");
});
await test("rezumat: bare stricate (pret 0, lipsa) se sar; o zi de 5x miscarea obisnuita da mis ~5", async () => {
  const b = bare(120, (i) => 100 + (i % 2 ? 1 : -1)); b[119] = { ...b[119], c: 99 * 1.1, h: 99 * 1.11 };
  b.splice(50, 0, { t: 1, h: 0, l: 0, c: 0 }, null);
  const z = S.rezumat(b); assert.ok(z, "a judecat"); assert.ok(z.mis > 4, "mis " + z.mis); assert.ok(z.ch > 9, "ch " + z.ch);
});
await test("scor si semafor: trend curat = verde si scor mare; sub medii si jos pe luna = rosu; fara 200 de zile = jumatate", async () => {
  const bun = { e20: true, e50: true, e200: true, rsi: 60, sparge: true, ch30: 10 };
  assert.equal(S.scor(bun, 5), 98, "15 + 20 + 20 + 15 + 17,5 + 10 = 97,5 -> 98");
  assert.equal(S.semafor(bun), "v");
  const rau = { e20: false, e50: false, e200: false, rsi: 30, sparge: false, ch30: -12 };
  assert.equal(S.semafor(rau), "r"); assert.equal(S.scor(rau, -20), 0);
  assert.equal(S.scor({ e20: true, e50: true, e200: null, rsi: 60 }, 0), 15 + 20 + 10 + 15 + 10);
  assert.equal(S.semafor({ e20: true, e50: false, e200: true, rsi: 55, ch30: 1 }), "g");
  assert.equal(S.semafor({ e20: true, e50: true, e200: true, rsi: 82, ch30: 30 }), "g", "fugit prea sus = galben, nu verde");
  assert.equal(S.fata({ ch7: 8 }, 3.2), 4.8); assert.equal(S.fata({ ch7: null }, 3), null);
});
await test("retete: gridul doar la monede linistite din primele 60; trend, revenire, spargere, miscare (aceeasi regula ca alertele)", async () => {
  const c = { fel: "c", stare: "candidat", miscare: false, rang: 12, e20: true, e50: true, e200: null, ch30: 5, rsi: 60, sparge: false, mis: 0.5, ch: 1 };
  assert.deepEqual(S.retete(c), ["grid", "trend"]);
  assert.deepEqual(S.retete({ ...c, miscare: true }), ["trend"], "in miscare nu e bun de grid");
  assert.deepEqual(S.retete({ ...c, rang: 80 }), ["trend"], "volum mic nu e bun de grid");
  assert.deepEqual(S.retete({ ...c, fel: "a" }), ["trend"], "actiunile n-au grid");
  assert.deepEqual(S.retete({ fel: "a", e20: false, e50: false, e200: true, ch30: -8, rsi: 28, sparge: false, mis: 2.5, ch: -4 }), ["revenire", "miscare"]);
  assert.deepEqual(S.retete({ fel: "a", e20: false, e50: false, e200: false, rsi: 28, mis: 2.5, ch: -2.9 }), [], "sub media de 200 nu e revenire; sub 3% nu e miscare");
  assert.deepEqual(S.retete({ fel: "a", e20: true, e50: true, e200: true, ch30: 12, rsi: 75, sparge: true, mis: 1, ch: 2 }), ["spargere"], "RSI 75 = fugit, nu intra la trend");
});
await test("perioade: 1 zi = ultimele 24 h din barele pe ora, 1 an = barele zilnice; starea urca / scade / lateral dupa miscarea obisnuita", async () => {
  const h = Array.from({ length: 200 }, (_, i) => [T0 - (200 - i) * ORA, 100 + i * 0.01]), z = Array.from({ length: 400 }, (_, i) => [T0 - (400 - i) * ZI, 100 * Math.pow(1.003, i)]);
  const s = { h, z };
  assert.equal(S.puncte(s, "1Z").length, 24); assert.equal(S.puncte(s, "1S").length, 168); assert.equal(S.puncte(s, "1L").length, 31); assert.equal(S.puncte(s, "1A").length, 400);
  const an = S.starePer(s, "1A", 2, "c"); assert.equal(an.sens, "urca"); assert.equal(an.unde, "lângă maxim");
  const zi = S.starePer(s, "1Z", 2, "c"); assert.equal(zi.sens, "lateral", "+0,23% intr-o zi la o moneda care se misca 2% pe zi = lateral");
  const jos = S.starePer({ z: Array.from({ length: 40 }, (_, i) => [i * ZI, 100 - i]) }, "1L", 1, "a"); assert.equal(jos.sens, "scade"); assert.equal(jos.unde, "lângă minim");
  assert.equal(S.starePer({ z: [] }, "1L", 1, "a"), null); assert.equal(S.starePer(null, "1Z", 1, "a"), null);
  assert.match(S.textAcum(s, { e20: true, e50: true, e200: true, rsi: 60, ch30: 5, atrPct: 2, fel: "c" }), /^Acum: pe o săptămână .* pe 3 luni urcă \(\+\d+,\d%\) și acum e lângă maxim pe 3 luni\. Trend curat\.$/);
});
await test("planul orientativ: stop la 2x miscarea zilnica, tinta la 3x, marimea la 1% risc din cont (niciodata peste cont)", async () => {
  const p = S.plan({ p: 100, atrPct: 2.5 }, 29251);
  assert.equal(p.stop, 95); assert.equal(p.tinta, 107.5); assert.equal(p.marime, Math.round(292.51 / 0.05));
  assert.equal(S.plan({ p: 100, atrPct: 0.1 }, 1000).marime, 1000); assert.equal(S.plan({ p: 100, atrPct: null }, 1000), null);
});

// ---- tura colectorului, cu un server fals ----
function lume(o = {}) {
  const cereri = [], trimise = [];
  const monede = Array.from({ length: o.monede ?? 10 }, (_, i) => ({ simbol: "C" + i + "_USDT_PERP", stare: i % 3 ? "candidat" : "evita", dir: "long", tarie: "tare", regim: { miscare: i % 3 === 0 }, volum: 1e8 - i, scor: 0.01 * (10 - i), grile: 10, pas: 0.005, traversariZi: 3, latime: 0.05 }));
  const kl = sus(260).map((b) => ({ time: b.t, open: b.c, high: b.h, low: b.l, close: b.c, volume: 10 }));
  const d = {
    cere: async (c) => {
      cereri.push(c);
      if (c === "/api/istoric-bot?action=clasament") return { clasament: { la: T0, monede } };
      if (c.startsWith("/api/market?type=pionex_klines")) { if (o.cadeCrypto && /C[0-4]_/.test(c)) throw new Error("Pionex 429"); return { data: { klines: kl } }; }
      if (c === "/api/t212?action=pozitii") return [{ ticker: "APLD_US_EQ" }, { ticker: "AAPL_US_EQ" }, { ticker: "SNDK1_US_EQ" }, { ticker: "VOW3d_EQ" }];
      if (c.startsWith("/api/t212?action=preturi")) return { randuri: kl };
      if (c === "/api/istoric-bot?action=scan") return { nume: { cAAA: "Vechi" } };
      throw new Error("necunoscut " + c);
    },
    trimite: async (c, corp) => { trimise.push({ c, corp }); return { ok: true }; },
    afara: async (u) => { if (/coingecko/.test(u)) return [{ symbol: "c0", name: "Moneda Zero" }, { symbol: "c1", name: "Moneda Unu" }, { symbol: "c1", name: "Alta Unu, mai mica" }]; return { chart: { result: [{ meta: { longName: "Firma " + u.split("chart/")[1].split("?")[0] } }] } }; },
    jurnal: () => {}, pauza: async () => {}, Scan: S, GridCalcul: globalThis.GridCalcul, NDX: ["AAPL", "MSFT", "SNDK"], pauzaMs: 0
  };
  return { d, cereri, trimise };
}
await test("tura: monedele din clasament cu campurile de grid + rangul; actiunile = Nasdaq 100 + ale lui (fara dubluri, fara cele europene); numele o data", async () => {
  const w = lume(), st = {};
  await turaScan(w.d, st, T0);
  const c = w.trimise.find((x) => x.corp.fel === "c").corp, a = w.trimise.find((x) => x.corp.fel === "a").corp, n = w.trimise.find((x) => x.corp.nume).corp.nume;
  assert.equal(c.randuri.length, 10); assert.equal(c.randuri[0].s, "C0"); assert.equal(c.randuri[0].rang, 1); assert.equal(c.randuri[0].stare, "evita"); assert.equal(c.randuri[0].miscare, true);
  assert.equal(c.randuri[1].grile, 10); assert.equal(c.randuri[1].vol, 1e8 - 1, "volumul monedei = cel din clasament (24 h)");
  assert.deepEqual(a.randuri.map((x) => x.s), ["AAPL", "MSFT", "SNDK", "APLD"]); assert.equal(a.randuri[3].inafara, true); assert.equal(a.randuri[0].inafara, undefined);
  assert.equal(n.cC0, "Moneda Zero"); assert.equal(n.cC1, "Moneda Unu", "la simbol dublu castiga cea mai mare"); assert.equal(n.aAPLD, "Firma APLD"); assert.equal(n.cAAA, "Vechi", "numele vechi raman");
  assert.equal(st.crN, 10); assert.equal(st.acN, 4); assert.ok(st.numeZi);
  // peste 10 minute: nimic nou (ritmul e pe ora; bursa e inchisa duminica)
  const inainte = w.trimise.length; await turaScan(w.d, st, T0 + 10 * 60000); assert.equal(w.trimise.length, inainte);
  // peste o ora: doar crypto; numele nu se mai cer azi
  await turaScan(w.d, st, T0 + ORA + 1); assert.deepEqual(w.trimise.slice(inainte).map((x) => x.corp.fel || "nume"), ["c"]);
});
await test("tura: cand pica prea multe monede (sub 80%) lista NU se urca si se reincearca peste 10 minute, nu peste o ora", async () => {
  const w = lume({ cadeCrypto: true }), st = {};
  await turaScan(w.d, st, T0);
  assert.equal(w.trimise.filter((x) => x.corp.fel === "c").length, 0); assert.equal(st.crLa, T0 - ORA + 10 * 60000);
});
await test("tura: luni cat bursa e deschisa actiunile se refac din ora in ora; dupa inchidere o data", async () => {
  const w = lume(), LUNI = Date.UTC(2026, 8, 28, 14, 30), st = {};
  await turaScan(w.d, st, LUNI); await turaScan(w.d, st, LUNI + 30 * 60000); await turaScan(w.d, st, LUNI + ORA + 1);
  assert.equal(w.trimise.filter((x) => x.corp.fel === "a").length, 2);
  const dupa = Date.UTC(2026, 8, 28, 20, 10); await turaScan(w.d, st, dupa); await turaScan(w.d, st, dupa + 5 * 60000);
  assert.equal(w.trimise.filter((x) => x.corp.fel === "a").length, 3); assert.equal(st.acInchisZi, "2026-09-28");
});

// ---- ruta istoric-bot?action=scan ----
const TOKEN = "proba-token-1234567890";
await test("ruta: POST scan pastreaza doar campurile cunoscute (numere curate, fara HTML); GET le intoarce pe toate trei", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const h = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.96.1.1" };
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=scan", { method: "POST", headers: h, body: JSON.stringify(corp) }), env });
  const rand = { s: "btc", p: 84000, ch: "1.5", e20: 1, e200: null, sparge: 0, stare: "candidat<script>", spark: [1, 2, "x", 0, 3], rau: "<b>x</b>", rang: 1 };
  assert.equal((await post({ fel: "c", la: T0, randuri: [rand, { s: "<b>", p: 0 }] })).status, 200);
  assert.equal((await post({ nume: { cBTC: "Bitcoin <x>", "zz": "rau", aAAPL: "Apple Inc." } })).status, 200);
  assert.equal((await post({ fel: "x", randuri: [] })).status, 400);
  const g = JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=scan", { headers: h }), env })).text());
  assert.deepEqual(g.crypto.randuri[0], { s: "BTC", p: 84000, ch: 1.5, rang: 1, e20: true, sparge: false, e200: null, spark: [1, 2, 3] }, "starea necunoscuta se arunca");
  assert.equal(g.actiuni, null); assert.deepEqual(g.nume, { cBTC: "Bitcoin x", aAAPL: "Apple Inc." });
  // un scan mare (160 de randuri, peste 64 KB) trece de limita obisnuita
  const mare = Array.from({ length: 160 }, (_, i) => ({ s: "A" + i, p: 100 + i, ...S.rezumat(sus(260)), tk: "A" + i + "_US_EQ" }));
  const r = await post({ fel: "a", la: T0, randuri: mare }); assert.equal(r.status, 200, await r.text());
  assert.ok(JSON.stringify({ fel: "a", la: T0, randuri: mare }).length > 65536, "proba chiar trece de 64 KB");
});

// ---- v96.2: cat a mers reteta in trecut + alertele pentru simbolurile urmarite ----
await test("istoric: o INTRARE in reteta = ziua in care intra (nu fiecare zi in care e in ea); castigul dupa 7 / 30 de bare; 'orice zi' ca termen de comparatie", async () => {
  // 150 de zile pe loc (+-), apoi 100 de zile de urcare: intra in trend o singura data, apoi castiga
  const b = Array.from({ length: 250 }, (_, i) => { const c = i < 150 ? 100 + (i % 2 ? 0.5 : -0.5) : 100 * Math.pow(1.006, i - 150); return { t: i, h: c * 1.002, l: c * 0.998, c }; });
  const r = S.istoricRetete([b, b.slice(0, 50)], "c");
  assert.equal(r.instr, 1, "sub 68 de bare nu se numara"); assert.deepEqual(r.ore, [7, 30]);
  assert.ok(r.trend.s.n >= 1 && r.trend.s.n <= 3, "intrari in trend: " + r.trend.s.n); assert.equal(r.trend.s.pe, 100); assert.ok(r.trend.s.med > 2, "mediana " + r.trend.s.med);
  assert.ok(r.baza.s.n > 150, "orice zi: " + r.baza.s.n); assert.equal(S.istoricRetete([b], "a").ore[0], 5, "la actiuni o saptamana = 5 zile de bursa");
  const t = S.textIstoric(r, "trend"); assert.match(t.text, /^după o săptămână 100% pe plus \(mediana \+\d+,\d%\), după o lună /); assert.equal(t.putine, true); assert.ok(t.mai > 0);
  assert.equal(S.textIstoric(r, "revenire"), null, "fara intrari = null, nu 0%"); assert.equal(S.textIstoric(null, "trend"), null);
});
await test("urmarite: primul scan doar tine minte; apoi intrare si iesire din reteta pe Discord; ce nu urmareste nu primeste nimic", async () => {
  const { anuntaUrmarite } = await import("./lib/tura-scan.mjs");
  const trimise = [], d = { Scan: S, trimiteAlerta: async (m, b, k) => { trimise.push(m); return true; } }, st = {};
  const x = (s, o) => ({ s, p: 10, ch: 1, ch7: 2, rsi: 60, e20: true, e50: true, e200: true, ch30: 5, sparge: false, mis: 0.5, ...o });
  await anuntaUrmarite(d, st, "a", [x("NVDA"), x("AMD")], ["aNVDA", "cBTC"]);
  assert.equal(trimise.length, 0); assert.deepEqual(st.urm.aNVDA, ["trend"]); assert.equal(st.urm.aAMD, undefined);
  await anuntaUrmarite(d, st, "a", [x("NVDA", { sparge: true, rsi: 75 }), x("AMD", { sparge: true })], ["aNVDA"]);
  assert.deepEqual(trimise.map((m) => m.titlu), ["🔔 NVDA a intrat în 🚀 Spargere", "🔕 NVDA a ieșit din 📈 Trend confirmat"]);
  assert.match(trimise[0].mesaj, /^Preț \$10 · azi \+1,0% · 7 zile \+2,0% · RSI 75/); assert.equal(trimise[0].cheie, "reteta-aNVDA-spargere");
  await anuntaUrmarite(d, st, "a", [x("NVDA", { sparge: true, rsi: 75 })], []);
  assert.equal(st.urm.aNVDA, undefined, "cand nu-l mai urmareste, starea se sterge (la reluare nu vine o alerta veche)");
});
await test("ruta: lista de urmarite (curatata, max 60) si istoricul retetelor se salveaza; GET doar=urmarite intoarce doar lista", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const h = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.96.3.1" };
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=scan", { method: "POST", headers: h, body: JSON.stringify(corp) }), env });
  const r = JSON.parse(await (await post({ urmarite: ["aNVDA", "cBTC", "aNVDA", "<b>", "x", 5, ...Array.from({ length: 80 }, (_, i) => "cX" + i)] })).text());
  assert.equal(r.urmarite.length, 60); assert.deepEqual(r.urmarite.slice(0, 3), ["aNVDA", "cBTC", "cX0"]);
  assert.equal((await post({ istoric: { fel: "c", la: T0, instr: 90, ore: [7, 30], trend: { s: { n: 40, pe: 58, med: 1.2, rau: 1 }, l: { n: 38, pe: 61, med: 4 } }, baza: { s: { n: 9000, pe: 52, med: 0.3 }, l: { n: 8000, pe: 53, med: 1 } } } })).status, 200);
  const cere = async (q) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=scan" + q, { headers: h }), env })).text());
  assert.deepEqual(Object.keys(await cere("&doar=urmarite")), ["urmarite"]);
  const g = await cere(""); assert.deepEqual(g.istoric.c.trend.s, { n: 40, pe: 58, med: 1.2 }); assert.deepEqual(g.istoric.c.revenire.s, { n: 0, pe: null, med: null }); assert.equal(g.istoric.a, null); assert.equal(g.urmarite.length, 60);
});

// ---- v96.1: fara cheia Twelve Data, /api/stocks ia preturile de la Yahoo (analiza actiunilor) ----
await test("stocks fara cheie: seria pe 4h se face din barele de 1h (4 cate 4, pe zi), 1d si cotatia vin de la Yahoo; earnings spune ca trebuie cheia", async () => {
  const vechi = globalThis.fetch, cerute = [];
  // 2 zile x 7 bare pe ora (9:30..15:30 New York = 13:30..19:30 UTC in septembrie)
  const zi = (d) => Array.from({ length: 7 }, (_, i) => Date.UTC(2026, 8, d, 13, 30) / 1000 + i * 3600);
  const t1 = [...zi(24), ...zi(25)], c1 = t1.map((_, i) => 100 + i);
  globalThis.fetch = async (u) => {
    cerute.push(String(u));
    const iv = /interval=([^&]+)/.exec(u)[1];
    const t = iv === "60m" ? t1 : [Date.UTC(2026, 8, 24, 13, 30) / 1000, Date.UTC(2026, 8, 25, 13, 30) / 1000], c = iv === "60m" ? c1 : [200, 210];
    return new Response(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 211, chartPreviousClose: 199, exchangeName: "NMS", currency: "USD", regularMarketVolume: 5 }, timestamp: t,
      indicators: { quote: [{ open: c, high: c.map((x) => x + 1), low: c.map((x) => x - 1), close: c, volume: c.map(() => 10) }] } }] } }), { status: 200 });
  };
  try {
    const m = await import(`../functions/api/stocks.js?t=${Date.now()}`), env = { APP_API_TOKEN: TOKEN };
    const h = { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.2.1" };
    const cere = async (q) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/stocks?" + q, { headers: h }), env })).text());
    const cfg = await cere("action=config"); assert.equal(cfg.configured, true); assert.equal(cfg.provider, "YAHOO");
    const s4 = await cere("action=series&symbol=NVDA&tf=4h&limit=300");
    assert.equal(s4.provider, "YAHOO"); assert.equal(s4.rows.length, 4, "7 bare pe zi -> 4 + 3, doua zile -> 4 bare de 4h");
    assert.deepEqual(s4.rows[0].slice(1, 5), ["100", "104", "99", "103"]); assert.deepEqual(s4.rows[1].slice(1, 5), ["104", "107", "103", "106"]); assert.equal(s4.rows[0][5], "40");
    const s1 = await cere("action=series&symbol=NVDA&tf=1d&limit=300"); assert.equal(s1.rows.length, 2); assert.equal(s1.rows[1][4], "210");
    assert.equal(new Date(s1.rows[1][0]).toISOString(), "2026-09-25T20:00:00.000Z", "bara zilnica e pusa la inchiderea New York, ca la Twelve Data");
    const q = await cere("action=quote&symbol=NVDA"); assert.equal(q.quote.lastPrice, "211"); assert.equal(q.quote.previousClose, "200");
    const e = await cere("action=earnings&symbol=NVDA"); assert.match(e.error, /cheia Twelve Data/);
    assert.ok(cerute.every((u) => u.startsWith("https://query1.finance.yahoo.com/")), "a cerut altceva decât Yahoo");
  } finally { globalThis.fetch = vechi; }
});

console.log(`SCAN_V96 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
