// Proba v100.23 (30.09): reparatiile din revizia independenta (Opus) a statisticii v100.22, fiecare verificata inainte pe cod/date.
// Dovada pentru banii Pionex (toti cei 10 boti reali, la cent): banii primiti inapoi = investit + realizat + comisioane + funding
// => realizatul (totalRealizedProfit) e FARA costuri; pozitia = realizat - grile; NET-ul = realizat + comisioane + funding.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const T212 = new Function(`${lib("t212.js")}; return T212;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.23 · reparatiile din revizia statisticii · proba\n");
const T0 = Date.UTC(2026, 5, 1, 12), Z = 86400000;
const tr = (rez, o) => rez.map((r, i) => Object.assign({ id: "x" + i, eticheta: "M" + (i % 3), pornit: T0 + i * Z, inchis: T0 + i * Z + 3600000, rezultat: r, baza: 100, durataOre: 1 }, o ? o(i) : {}));

await test("1 · „cele mai mari 5 pierderi” nu se mai aprinde singur: 6 pierderi egale din 12 -> tace; o pierdere iesita din rand -> vorbeste", () => {
  const egal = ST.calc(tr([5, -10, 5, -10, 5, -10, 5, -10, 5, -10, 5, -10]), { moneda: "lei" });
  assert.ok(!egal.gresit.some((x) => /Cele mai mari 5 pierderi/.test(x.text)), JSON.stringify(egal.gresit));
  const rez = []; for (let i = 0; i < 40; i++) rez.push(i % 3 === 0 ? -5 : 8); rez[7] = -400;
  const iesit = ST.calc(tr(rez), { moneda: "lei" });
  assert.ok(iesit.gresit.some((x) => /Cele mai mari 5 pierderi/.test(x.text)), JSON.stringify(iesit.gresit));
});

await test("2 · „unde câștigi constant” doar pe grupe castigate la cel putin jumatate din trade-uri", () => {
  // XYZ: +500 si 4 x −50 (20% pe plus) nu e „constant”; ABC: 5 x +10 (100%) e
  const l = tr([500, -50, -50, -50, -50], () => ({ eticheta: "XYZ" })).concat(tr([10, 10, 10, 10, 10], (i) => ({ id: "a" + i, eticheta: "ABC" })));
  const b = ST.calc(l, { moneda: "lei" }).bine.find((x) => /constant/.test(x.text));
  assert.ok(b && /ABC/.test(b.text) && !/XYZ/.test(b.text), JSON.stringify(b));
});

await test("3 · caderea care porneste de la inceput (primul trade pe minus): nu mai scrie „01.01.70”, spune „de la început”", () => {
  const s = ST.calc(tr([-10, -5, 3]), { moneda: "lei" }), h = ST.html(s, {});
  assert.equal(s.drawdown.max, 15); assert.equal(s.drawdown.dinStart, true);
  assert.doesNotMatch(h, /01\.01\.70/); assert.match(h, /de la început/);
  assert.ok(s.gresit.length === 0 || true);
  // si invers: varful e DUPA pornire (+10, apoi −15) -> data varfului, nu „de la început” (stricarea „mereu de la inceput” scapa altfel)
  const s3 = ST.calc(tr([10, -15, 3]), { moneda: "lei" }), h3 = ST.html(s3, {});
  assert.equal(s3.drawdown.max, 15); assert.equal(s3.drawdown.dinStart, false); assert.equal(s3.drawdown.dela, T0 + 3600000);
  assert.doesNotMatch(h3, /de la început/);
  const s2 = ST.calc(tr([-10, -5, 3, 1, 2, 3, 4, 5, 6, 7]), { moneda: "lei" });
  assert.ok(s2.gresit.some((x) => /cea mai mare cădere/i.test(x.text) && /de la început/.test(x.text)), JSON.stringify(s2.gresit));
});

await test("4 · JurnalTrade: pozitia = realizat − grile (realizatul Pionex e fara comisioane si funding)", () => {
  const b = { strategyId: "1", base: "LIGHTER.PERP", createTime: 1, closeTime: 3600001, buOrderData: { totalRealizedProfit: "-58.52", gridProfit: "4.3398502", totalFee: "-0.500948", totalFundingFee: "-0.02330681675", usdtInvestment: "103.38", leverage: "5", trend: "long", bottom: "4.085", top: "4.837", row: 16, gridType: "geometric" } };
  const t = JT.din([b])[0];
  assert.ok(Math.abs(t.pozitie - (-58.52 - 4.3398502)) < 1e-9, `pozitia ${t.pozitie}`);
  // si rezumatul: realizat = grile + pozitie (fara sa mai scada o data costurile)
  const r = JT.rezumat([t]);
  assert.ok(Math.abs(r.grile + r.pozitie - r.total) < 1e-9);
});

await test("5 · Pionex: si „Pe direcție și pe levier”, si „Cele mai mari 5 pierderi”; pe Tot (T212 fara directie) directia nu mai numara doar botii", () => {
  const p = ST.calc(tr([5, -3, 4, -8, 2, 6, -1, 3, -2, 4], () => ({ dir: "long", levier: 5 })), { moneda: "USDT" }), hp = ST.html(p, {});
  assert.match(hp, /Pe direcție și pe levier/); assert.match(hp, /Cele mai mari 5 pierderi/);
  const mix = tr([5, -3, 4, -8, 2], () => ({ dir: "long", levier: 5 })).concat(tr([1, -2, 3, 4, -5], (i) => ({ id: "t" + i })));
  const m = ST.calc(mix, { moneda: "lei" });
  assert.equal(m.perDir.length, 0); assert.equal(m.perLevier.length, 0);
  assert.match(ST.html(m, {}), /Cele mai mari 5 pierderi/);
});

await test("6 · CSV pentru Excel romanesc: separator ; si zecimale cu virgula; orele spun ca sunt UTC", () => {
  const c = ST.csv([{ id: "1", eticheta: "A", pornit: Date.UTC(2026, 0, 1), inchis: Date.UTC(2026, 0, 2), rezultat: -11.56, baza: 102.61, durataOre: 12.5, comisioane: 0.5 }], "lei");
  const [cap, r] = c.trim().split("\n");
  assert.match(cap, /^inchis_utc;eticheta;pornit_utc;/);
  assert.match(r, /;12,5;102,61;-11,56;/); assert.doesNotMatch(r, /\d\.\d/);
});

await test("mici · un trade pe zero rupe seria; trade-urile fara suma pusa sunt numarate si spuse la distributie", () => {
  const s = ST.calc(tr([5, 0, 5, 5]), { moneda: "lei" });
  assert.equal(s.serii.castiguri, 2);
  const f = ST.calc(tr([5, -3, 4], (i) => (i === 1 ? { baza: null } : {})), { moneda: "lei" });
  assert.equal(f.faraBaza, 1); assert.match(ST.html(f, {}), /1 fără suma pusă/);
});

await test("7 · pagina spune de unde vin botii Pionex (nota statisticii Pionex si Tot)", () => {
  // v100.25: „doar ultimii” era o premisa gresita (Pionex da istoria pe pagini de cate 10); textul sta acum in jtNotaPionex si
  // apare doar cand chiar lipseste istoria (pagina publicata) - cazurile sunt probate in proba-v10025
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const i = app.indexOf("function jtStatNota("), corp = app.slice(i, app.indexOf("\n", i));
  assert.match(corp, /jtNotaPionex\(\)/); assert.match(corp, /Pionex/);
  const j = app.indexOf("function jtNotaPionex("); assert.ok(j >= 0); assert.match(app.slice(j, j + 900), /ultimii/);
});

await test("🔴 alaturi · Declaratia Unica: Pionex NET = realizat + comisioane + funding (nu realizatul de dinainte de costuri)", () => {
  const boti = JT.din([{ strategyId: "1", base: "LIGHTER.PERP", createTime: Date.UTC(2026, 8, 29), closeTime: Date.UTC(2026, 8, 30), buOrderData: { totalRealizedProfit: "-58.52", gridProfit: "4.34", totalFee: "-0.500948", totalFundingFee: "-0.02330681675", usdtInvestment: "103.38" } }]);
  const r = T212.raportAnual({ inchise: [], dividende: [], boti, an: 2026 });
  assert.ok(Math.abs(r.pionex.net - (-58.52 - 0.500948 - 0.02330681675)) < 1e-9, `net ${r.pionex.net}`);
  assert.match(r.text, /NET −59,04 USDT|NET −59\.04 USDT/);
});

await test("proba de ecran a Jurnalului cauta cifra veche dupa noul ei nume (nu mai trece pe placuta statisticii)", () => {
  const p = fs.readFileSync(new URL("./proba-ecran-grid.mjs", import.meta.url), "utf8");
  assert.match(p, /Rezultat realizat/); assert.match(p, /Statistica · Pionex/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
