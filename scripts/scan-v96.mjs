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

console.log(`SCAN_V96 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
