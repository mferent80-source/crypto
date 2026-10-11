// Proba turei de lățime (colector v101.93, I-583): universul (doar cripto, ≥ 10 zile, top 150 după volum), barele la 15 min, seriile la oră,
// o singură publicare pe tură, oprirea pe univers gol (fără „orice *USDT”), pauza la 429, moneda cu bare picate = lipsă. Fără rețea.
// Rulare: node scripts/proba-v100150-colector.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { turaLatime, cereBinance, RITM } from "./lib/tura-latime.mjs";
vm.runInThisContext(fs.readFileSync(new URL("../public/lib/text-ro.js", import.meta.url), "utf8"));
vm.runInThisContext(fs.readFileSync(new URL("../public/lib/latime.js", import.meta.url), "utf8"));
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
console.log("\nColector v101.93 · tura de lățime pe 150 perp-uri · proba\n");
const ACUM = Date.UTC(2026, 9, 11, 8, 0, 0), H4 = 4 * 3600000, ZI = 86400000, MIN = 60000;
const kl = (n, pas, f) => Array.from({ length: n }, (_, i) => [ACUM - (n - i) * pas, f(i), f(i) * 1.01, f(i) * 0.99, f(i), 1, ACUM - (n - i - 1) * pas]);
function lume(o = {}) {
  const cereri = [], trimise = [], jurnal = [];
  const N = o.n ?? 160, simboluri = Array.from({ length: N }, (_, i) => ({ symbol: "C" + i + "USDT", quoteAsset: "USDT", status: "TRADING", contractType: "PERPETUAL", underlyingType: i === 3 ? "INDEX" : "COIN", onboardDate: ACUM - (i === 5 ? 2 : 400) * ZI }));
  const binance = async (url) => {
    cereri.push(url);
    if (/exchangeInfo/.test(url)) return { symbols: o.universGol ? simboluri.map((s) => ({ ...s, contractType: "ALTCEVA" })) : simboluri };
    if (/ticker\/24hr/.test(url)) return simboluri.map((s, i) => ({ symbol: s.symbol, quoteVolume: String(1e9 - i * 1e6), lastPrice: "100" }));
    if (/premiumIndex/.test(url)) return simboluri.map((s) => ({ symbol: s.symbol, lastFundingRate: "0.0001", markPrice: "100" }));
    if (/klines.*interval=4h/.test(url)) return /symbol=C7USDT&/.test(url) ? null : kl(564, H4, (i) => 100 + i * 0.05);
    if (/klines.*interval=1d/.test(url)) return kl(30, ZI, () => 100);
    if (/fundingRate/.test(url)) return Array.from({ length: 500 }, (_, i) => ({ fundingRate: String(0.0001 * (i % 10) / 10), fundingTime: ACUM - i * 8 * 3600000 }));
    if (/openInterestHist/.test(url)) return Array.from({ length: 500 }, () => ({ sumOpenInterest: "1000" }));
    if (/topLongShortPositionRatio/.test(url)) return Array.from({ length: 200 }, () => ({ longAccount: "0.62" }));
    if (/globalLongShortAccountRatio/.test(url)) return Array.from({ length: 200 }, () => ({ longAccount: "0.45" }));
    if (/takerlongshortRatio/.test(url)) return Array.from({ length: 500 }, (_, i) => ({ buySellRatio: String(0.9 + (i % 5) * 0.05) }));
    return null;
  };
  const d = { binance, trimite: async (c, corp) => { trimise.push({ c, corp }); return { ok: true }; }, jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, Latime: globalThis.Latime, botiSimboluri: () => ["C1"] };
  return { d, cereri, trimise, jurnal, st: {} };
}
await test("universul: USDT + TRADING + PERPETUAL + COIN, listate ≥ 10 zile, primele 150 după volum (C3 indice și C5 nouă ies)", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM);
  assert.equal(w.st.univers.length, 150); assert.ok(!w.st.univers.some((u) => u.sym === "C3USDT" || u.sym === "C5USDT")); assert.equal(w.st.univers[0].sym, "C0USDT");
});
await test("o tură întreagă: bare 4h + 1d pe 150, serii pe 150, premiumIndex o dată, O SINGURĂ publicare cu agregatul; C7 (bare picate) = lipsă", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM);
  assert.equal(w.cereri.filter((u) => /interval=4h/.test(u)).length, 150); assert.equal(w.cereri.filter((u) => /premiumIndex/.test(u)).length, 1); assert.equal(w.cereri.filter((u) => /openInterestHist/.test(u)).length, 150);
  assert.equal(w.trimise.length, 1); const c = w.trimise[0].corp; assert.equal(w.trimise[0].c, "/api/istoric-bot?action=latime");
  assert.equal(c.n, 150); assert.equal(c.lipsa, 1); assert.equal(c.incomplet, false); assert.equal(c.lat.sus, 149); assert.equal(c.regim.cod, "LARG-SUS"); assert.equal(c.monede.length, 149); assert.ok(c.monede.every((m) => m.lMari === 62));
});
await test("ritmurile (revizia 6): la 10 minute nimic; la fiecare 15 min barele + seriile unui SFERT din univers (salturi mici pe IP), fiecare monedă o dată pe oră", async () => {
  const w = lume(); await turaLatime(w.d, w.st, ACUM); const n0 = w.cereri.length, oi = () => w.cereri.filter((u) => /openInterestHist/.test(u)).length;
  assert.equal(oi(), 150, "prima tură: toate seriile");
  await turaLatime(w.d, w.st, ACUM + 10 * MIN); assert.equal(w.cereri.length, n0, "sub 15 min nimic");
  await turaLatime(w.d, w.st, ACUM + 15 * MIN); const n1 = w.cereri.length - n0; assert.ok(n1 >= 300 + 37 * 5 && n1 <= 302 + 38 * 5, "barele + premiumIndex + un sfert din serii: " + n1); assert.equal(w.trimise.length, 2);
  await turaLatime(w.d, w.st, ACUM + 30 * MIN); await turaLatime(w.d, w.st, ACUM + 45 * MIN); await turaLatime(w.d, w.st, ACUM + 60 * MIN);
  assert.equal(oi(), 300, "după 4 ture de 15 min fiecare monedă a fost refăcută exact o dată");
});
await test("(revizia 1) ticker/24hr picat ⇒ eroare publicată, universul NU rămâne gol o oră; exchangeInfo picat cu univers vechi ⇒ ține universul, nu publică eroare", async () => {
  const w = lume(); const b = w.d.binance; let tickerPicat = true; w.d.binance = async (u) => /ticker\/24hr/.test(u) && tickerPicat ? null : b(u);
  await turaLatime(w.d, w.st, ACUM); assert.equal(w.trimise.length, 1); assert.match(w.trimise[0].corp.eroare, /ticker/); assert.equal(w.trimise[0].corp.regim.cod, "NECUNOSCUT"); assert.ok(!w.st.univers || !w.st.univers.length, "universul gol nu se ține");
  tickerPicat = false; await turaLatime(w.d, w.st, ACUM + 15 * MIN); assert.equal(w.cereri.filter((u) => /exchangeInfo/.test(u)).length, 2, "la tura următoare universul se cere din nou"); assert.equal(w.trimise[1].corp.n, 150);
  let infoPicat = true; w.d.binance = async (u) => /exchangeInfo/.test(u) && infoPicat ? null : b(u);
  await turaLatime(w.d, w.st, ACUM + 75 * MIN); assert.equal(w.st.univers.length, 150, "universul vechi ținut"); assert.equal(w.trimise.length, 3); assert.equal(w.trimise[2].corp.n, 150); assert.equal(w.trimise[2].corp.eroare, null); assert.ok(w.jurnal.some((j) => /exchangeInfo/.test(j) && /vechi/.test(j)));
  infoPicat = false;
});
await test("(revizia 1) ticker/24hr cu 0 simboluri cu volum ⇒ eroare (câmp redenumit), nu „n: 0” tăcut", async () => {
  const w = lume(); const b = w.d.binance; w.d.binance = async (u) => /ticker\/24hr/.test(u) ? (await b(u)).map((x) => ({ simbol: x.symbol, quoteVolume: x.quoteVolume })) : b(u);
  await turaLatime(w.d, w.st, ACUM); assert.match(w.trimise[0].corp.eroare, /ticker/); assert.ok(w.jurnal.some((j) => /ticker/.test(j)));
});
await test("universul gol ⇒ se oprește și spune de ce (jurnal + KV cu eroare), nu cade pe „orice *USDT”", async () => {
  const w = lume({ universGol: true }); await turaLatime(w.d, w.st, ACUM);
  assert.ok(w.jurnal.some((j) => /univers/i.test(j) && /0/.test(j))); assert.equal(w.cereri.filter((u) => /klines/.test(u)).length, 0);
  assert.equal(w.trimise.length, 1); assert.match(w.trimise[0].corp.eroare, /univers/i); assert.equal(w.trimise[0].corp.regim.cod, "NECUNOSCUT");
});
await test("incomplet: peste 20 % lipsă ⇒ incomplet: true", async () => {
  const w = lume(); const b = w.d.binance; w.d.binance = async (u) => /interval=4h/.test(u) && /symbol=C[1-9]\dUSDT&/.test(u) ? null : b(u);
  await turaLatime(w.d, w.st, ACUM); assert.equal(w.trimise[0].corp.incomplet, true); assert.ok(w.trimise[0].corp.lipsa > 30);
});
await test("cereBinance: 3 încercări, la 429 pauză de 60 s o dată, la eșec null; răspunsul bun e JSON", async () => {
  const pauze = []; let n = 0;
  const f = async () => { n++; return n === 1 ? new Response("", { status: 429 }) : new Response(JSON.stringify({ ok: 1 }), { status: 200 }); };
  const b = cereBinance({ fetch: f, pauza: async (ms) => pauze.push(ms), jurnal: () => {} });
  assert.deepEqual(await b("https://fapi.binance.com/x"), { ok: 1 }); assert.deepEqual(pauze, [60000]);
  const rau = cereBinance({ fetch: async () => new Response("", { status: 500 }), pauza: async () => {}, jurnal: () => {} }); assert.equal(await rau("https://fapi.binance.com/x"), null);
});
await test("cereBinance (revizia 6): respectă Retry-After când e mai mare de 60 s; greutatea mare din antet ajunge în jurnal", async () => {
  const pauze = [], jurnal = []; let n = 0;
  const f = async () => { n++; return n === 1 ? new Response("", { status: 429, headers: { "retry-after": "120" } }) : new Response("{}", { status: 200, headers: { "x-mbx-used-weight-1m": "1800" } }); };
  await cereBinance({ fetch: f, pauza: async (ms) => pauze.push(ms), jurnal: (...a) => jurnal.push(a.join(" ")) })("https://fapi.binance.com/x");
  assert.deepEqual(pauze, [120000]); assert.ok(jurnal.some((j) => /1800/.test(j)), "greutatea 1800 în jurnal");
});
await test("RITM: bare 15 min, serii 60 min, univers 60 min", () => { assert.deepEqual(RITM, { bare: 15 * MIN, serii: 60 * MIN, univers: 60 * MIN }); });
console.log(`\n${teste - picate}/${teste} verzi\n`); if (picate) process.exit(1);
