// Proba v100.27 (30.09, el: „fa idei” - ideea 1 din trei): botii spot grid si smart copy intra in socoteala (statistica, Tot,
// Declaratia Unica). Pionex le da alte campuri decat la futures grid. Dovedit pe botii lui reali (30.09):
//  - spot grid: rezultat = USDT primiti inapoi + monedele ramase la pretul inchiderii + profitul retras − toata suma pusa
//    (quoteTotalInvestment; usdtInvestment e doar pornirea: la un bot ETH 54,43 fata de 104,43 dupa o adaugare de 50)
//  - smart copy: campul profit = suma de acum − suma pusa, la 23 din 23
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();
const T212 = new Function(`${lib("t212.js")}; return T212;`)();
const { compactBot, CAMPURI_ARHIVA, FORMA_ARHIVA } = await import("../functions/_shared/boti-arhiva.js");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.27 · spot grid si smart copy in socoteala · proba\n");
const T0 = Date.UTC(2026, 0, 10), H = 3600000;
// boti INVENTATI, cu forma Pionex
const spot = (i, d) => ({ strategyId: "sp" + i, buOrderType: "spot_grid", base: "ABC", quote: "USDT", createTime: T0 + i * H, closeTime: T0 + i * H + 5 * H,
  buOrderData: Object.assign({ usdtInvestment: "100", quoteTotalInvestment: "100", unlockUsdtAmount: "98.5", baseAmount: "0", closedPrice: "2", profitWithdrawn: "0", closeSellModel: "TO_QUOTE", gridProfit: "0.4" }, d) });
const copy = (i, d) => ({ strategyId: "sc" + i, buOrderType: "smart_copy", base: "-", quote: "USDT", createTime: T0 + i * H, closeTime: T0 + i * H + 30 * H,
  buOrderData: Object.assign({ quoteOriginalInvestment: "50", quoteTotalInvestment: "50", currentQuoteAmount: "48.02", profit: "-1.98", signalName: "solana" }, d) });
const fut = (i) => ({ strategyId: "fu" + i, buOrderType: "futures_grid", base: "XYZ.PERP", createTime: T0 + i * H, closeTime: T0 + i * H + H,
  buOrderData: { totalRealizedProfit: "2", gridProfit: "1", totalFee: "-0.3", totalFundingFee: "-0.1", usdtInvestment: "100", quoteInvestment: "100", extraMargin: "0", leverage: "5", trend: "long", bottom: "1", top: "2", row: 10, gridType: "arithmetic" } });

await test("JurnalTrade.alte: spot grid = inapoi + monede ramase × pretul inchiderii + profit retras − toata suma pusa", () => {
  const [a] = JT.alte([spot(1, {})]);
  assert.equal(a.tip, "spot grid"); assert.equal(a.pus, 100); assert.ok(Math.abs(a.rezultat - (-1.5)) < 1e-9, a.rezultat); assert.equal(a.levier, 1);
  // adaugare pe drum: usdtInvestment ramane pornirea, quoteTotalInvestment are tot
  const [b] = JT.alte([spot(2, { usdtInvestment: "54.43", quoteTotalInvestment: "104.43", unlockUsdtAmount: "104.75", profitWithdrawn: "0.01" })]);
  assert.ok(Math.abs(b.rezultat - 0.33) < 1e-9, b.rezultat); assert.equal(b.pus, 104.43);
  // NOT_SELL: monedele date inapoi se socotesc la pretul inchiderii
  const [c] = JT.alte([spot(3, { unlockUsdtAmount: "10", baseAmount: "44.5", closedPrice: "2", closeSellModel: "NOT_SELL" })]);
  assert.ok(Math.abs(c.rezultat - (10 + 89 - 100)) < 1e-9, c.rezultat);
  // fara banii primiti inapoi nu se ghiceste
  assert.equal(JT.alte([spot(4, { unlockUsdtAmount: null })]).length, 0);
});

await test("JurnalTrade.alte: smart copy = campul profit; fara el, suma de acum − suma pusa; eticheta = moneda copiata", () => {
  const [a, b] = JT.alte([copy(1, {}), copy(2, { profit: null, currentQuoteAmount: "53.5" })]).sort((x, y) => x.pornit - y.pornit);
  assert.equal(a.tip, "smart copy"); assert.equal(a.moneda, "SOLANA"); assert.ok(Math.abs(a.rezultat - (-1.98)) < 1e-9); assert.equal(a.pus, 50); assert.equal(a.levier, null);
  assert.ok(Math.abs(b.rezultat - 3.5) < 1e-9);
  // futures_grid nu intra aici (au drumul lor, JurnalTrade.din)
  assert.equal(JT.alte([fut(1)]).length, 0); assert.equal(JT.din([spot(1, {}), copy(1, {})]).length, 0);
});

await test("statistica Pionex: spot si copy intra, cu eticheta lor si pe randul lor la „direcție”; levierul fara cei cu levier necunoscut, spus", () => {
  const b = [fut(1), fut(2), spot(3, {}), copy(4, {})];
  const tr = ST.dinPionex(JT.din(b)).concat(ST.dinPionexAlte(JT.alte(b)));
  assert.equal(tr.length, 4);
  const s = ST.calc(tr, { moneda: "USDT" });
  assert.ok(Math.abs(s.total - (2 * 1.6 - 1.5 - 1.98)) < 1e-9, s.total);
  assert.deepEqual(s.perDir.map((g) => g.dir).sort(), ["long", "smart copy", "spot grid"]);
  assert.ok(tr.some((x) => x.eticheta === "ABC (spot)")); assert.ok(tr.some((x) => x.eticheta === "SOLANA (copy)"));
  assert.equal(s.perLevier.reduce((a, g) => a + g.n, 0), 3); assert.equal(s.faraLevier, 1);
  assert.match(ST.html(s, { titlu: "x" }), /fără 1 smart copy \(levier necunoscut\)/);
  // pe Tot (T212 fara levier si fara steag) tabelul ramane ascuns, ca inainte
  const tot = tr.concat([{ id: "t1", eticheta: "AAPL", pornit: T0, inchis: T0 + H, rezultat: 5, baza: 100, durataOre: 1 }]);
  assert.equal(ST.calc(tot, { moneda: "lei" }).perLevier.length, 0);
});

await test("Declaratia Unica: Pionex NET cuprinde si spot grid si smart copy (in anul inchiderii)", () => {
  const b = [fut(1), spot(3, {}), copy(4, {})];
  const r = T212.raportAnual({ inchise: [], dividende: [], boti: JT.din(b).concat(JT.alte(b)), an: 2026 });
  assert.equal(r.pionex.n, 3); assert.ok(Math.abs(r.pionex.net - (1.6 - 1.5 - 1.98)) < 1e-9, r.pionex.net);
});

await test("arhiva forma 3: pastreaza si campurile spot / smart copy (altfel acasa ar disparea iar)", () => {
  assert.ok(FORMA_ARHIVA >= 3);
  for (const k of ["unlockUsdtAmount", "baseAmount", "profitWithdrawn", "quoteTotalInvestment", "profit", "currentQuoteAmount", "quoteOriginalInvestment", "signalName"]) assert.ok(CAMPURI_ARHIVA.includes(k), k);
  const f = (b) => JT.alte([b]).map((t) => [t.rezultat, t.pus, t.moneda]);
  assert.deepEqual(f(compactBot(spot(2, { usdtInvestment: "54.43", quoteTotalInvestment: "104.43", unlockUsdtAmount: "104.75", profitWithdrawn: "0.01" }))), f(spot(2, { usdtInvestment: "54.43", quoteTotalInvestment: "104.43", unlockUsdtAmount: "104.75", profitWithdrawn: "0.01" })));
  assert.deepEqual(f(compactBot(copy(1, {}))), f(copy(1, {})));
});

const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8"), t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); const inceput = src.slice(i - 6, i) === "async " ? i - 6 : i; let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(inceput, j + 1); }

await test("pagina: statistica Pionex (si Tot) ia si spot/copy; nota spune cati sunt INCLUSI; Declaratia ii numara", () => {
  assert.match(functia(app, "jtStatToate"), /StatisticaTrade\.dinPionexAlte\(JurnalTrade\.alte\(jtStare\.boti\)\)/);
  const ctx = { jtStat: { toate: { crypto: { tr: new Array(2253) } } }, jtArhiva: { sursa: "acasa", complet: true }, jtStare: { boti: [{ buOrderType: "futures_grid" }, { buOrderType: "spot_grid" }, { buOrderType: "spot_grid" }, { buOrderType: "smart_copy" }] } };
  vm.createContext(ctx); vm.runInContext(functia(app, "jtNotaPionex") + ";this.n=jtNotaPionex;", ctx);
  const t = ctx.n(); assert.match(t, /toată istoria Pionex \(2253 boți/); assert.match(t, /inclusiv 2 spot grid și 1 smart copy/); assert.doesNotMatch(t, /lăsați deoparte/);
  const d = functia(t2, "t212BotiInchisi"); assert.match(d, /JurnalTrade\.alte\(jtStare\.boti\)/); assert.match(d, /alteInchise/);
  assert.match(t2, /contTot\.alteInchise = JurnalTrade\.alte\(/);
});

await test("colectorul v101.15 (reface arhiva pe forma 3)", () => {
  assert.match(fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8"), /const VERSIUNE_COLECTOR = "v101\.(1[5-9]|[2-9]\d)";/, "cel putin v101.15");
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
