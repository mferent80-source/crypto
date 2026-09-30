// Proba v101.7 (30.09, el: „am pierdut mai bine de jumatate din sold cu LIT, verifica de ce si cum sa evit” -> „da”):
// botul LIGHTER (long 5x, 103,38 USDT) a inchis la −59,04 USDT. Planul LUI zicea −15,7, dar planul e doar o alerta;
// opritorul din Pionex (3,787, −15,5% de la pornire, 7,3% sub grid) il costa ≈ 60 USDT din prima clipa.
// Acum Radarul spune asta la pornire: cat te costa opritorul atins (cu gridul umplut pe drum) fata de plan, si unde sa-l muti.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TabloExtra = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(GridCalcul);
const Alerte = new Function(`${lib("alerte.js")}; return Alerte;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV101.7 · opritorul din Pionex fata de planul tau · proba\n");

// Botul REAL 2390 la 29.09 13:34 UTC, cand si-a pus planul (+5,5 / −15,7 / 12 h): 56 LIT cumparati la pornire (4,484),
// grid geometric 16 randuri x 7 LIT, opritor pe PRET la 3,787. Inchis de opritor la 3,764: pozitia plina = 105 LIT = 15 x 7.
const LIGHTER = () => ({
  id: "2390", baza: "LIGHTER.PERP", directie: "long", levier: 5, investit: 103.38, activ: true,
  pozitie: 56, pretDeschidere: 4.484, pretCurent: 4.473, profitNet: -0.126, profitTotal: -0.74, pnlNerealizatSigur: true,
  gridJos: 4.085, gridSus: 4.837, opritorPierdere: 3.787, opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdereRaport: null,
  brut: { buOrderData: { row: 16, perVolume: "7", gridType: "geometric" } },
});
const PLAN = { plus: 5.5, minus: 15.7, afaraOre: 12 };

await test("LIGHTER la pornire: opritorul atins costa ≈ 60 USDT (inchis real: ≈ −60,4 la 3,787 fara profitul gridului), nu 39 cat da pozitia de acum", () => {
  const t = TabloExtra.totalLaOpritor(LIGHTER());
  assert.ok(t !== null, "null");
  assert.ok(t < -55 && t > -68, `total la opritor ${t}`);
  const doarPozitia = TabloExtra.totalLaPret(LIGHTER(), 3.787);
  assert.ok(doarPozitia > -41, `totalLaPret vechi ${doarPozitia} (fara grilele de pe drum)`);
});

await test("opritorul in PROCENTE (profit_ratio, ca la ICP 27.09: −2,95%) se opreste exact la raport x investit", () => {
  const b = Object.assign(LIGHTER(), { investit: 96.63, opritorPierdereTip: "raport", opritorPierdereRaport: -0.0295, opritorPierdere: 3.1 });
  assert.equal(Math.round(TabloExtra.totalLaOpritor(b) * 100) / 100, -2.85);
});

await test("opritor stins / lipsa / date lipsa -> null (nu se inventeaza)", () => {
  assert.equal(TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { opritorPierdereActiv: false })), null);
  assert.equal(TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { opritorPierdere: null })), null);
  assert.equal(TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { profitNet: null })), null);
  assert.equal(TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { pnlNerealizatSigur: false })), null);
});

await test("fara row/perVolume -> doar pozitia de acum (mai putin, dar nu inventat)", () => {
  const b = Object.assign(LIGHTER(), { brut: null });
  assert.equal(Math.round(TabloExtra.totalLaOpritor(b) * 1e6), Math.round(TabloExtra.totalLaPret(b, 3.787) * 1e6));
});

await test("opritorul in grid: se umplu doar grilele dintre pret si opritor; peste pret (podeaua) nu se umple nimic", () => {
  const inGrid = TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { opritorPierdere: 4.3 }));
  const plin = TabloExtra.totalLaOpritor(Object.assign(LIGHTER(), { opritorPierdere: 4.085 }));
  assert.ok(inGrid > plin && inGrid < TabloExtra.totalLaPret(LIGHTER(), 4.3), `${inGrid} / ${plin}`);
  const podea = Object.assign(LIGHTER(), { opritorPierdere: 4.6 });
  assert.equal(Math.round(TabloExtra.totalLaOpritor(podea) * 1e6), Math.round(TabloExtra.totalLaPret(podea, 4.6) * 1e6));
});

// Simetria: un SHORT oglindit in jurul lui A da exact acelasi total (fara comision)
await test("oglinda LONG/SHORT: acelasi total la opritor si acelasi opritor pentru plan", () => {
  const A = 4.5, o = (v) => 2 * A - v;
  const L = LIGHTER();
  const S = Object.assign(LIGHTER(), { directie: "short", pretDeschidere: o(L.pretDeschidere), pretCurent: o(L.pretCurent), gridJos: o(L.gridSus), gridSus: o(L.gridJos), opritorPierdere: o(L.opritorPierdere) });
  for (const op of [3.787, 4.085, 4.2, 4.3]) {
    const tl = TabloExtra.totalLaOpritor(Object.assign(L, { opritorPierdere: op }), 0), ts = TabloExtra.totalLaOpritor(Object.assign(S, { opritorPierdere: o(op) }), 0);
    assert.ok(Math.abs(tl - ts) < 1e-9, `opritor ${op}: long ${tl} / short ${ts}`);
  }
  const pl = TabloExtra.pretOpritorPentru(L, -15.7, 0), ps = TabloExtra.pretOpritorPentru(S, -15.7, 0);
  assert.ok(Math.abs(o(pl) - ps) < 1e-4, `long ${pl} / short ${ps}`);
});

await test("pretOpritorPentru(−15,7): pretul la care, atins, totalul e exact planul (dus-intors), in grid", () => {
  const b = LIGHTER(), x = TabloExtra.pretOpritorPentru(b, -15.7);
  assert.ok(x > 4.085 && x < 4.473, `pret ${x}`);
  assert.ok(Math.abs(TabloExtra.totalCuGridLa(b, x) + 15.7) < 0.01, `total ${TabloExtra.totalCuGridLa(b, x)}`);
  assert.equal(TabloExtra.pretOpritorPentru(Object.assign(b, { profitNet: -20 }), -15.7), null, "planul deja atins");
});

await test("planStare pune pe minus: totalul la opritor + opritorul planului", () => {
  const st = TabloExtra.planStare(LIGHTER(), PLAN, {}, Date.now());
  assert.ok(st.minus.laOpritor < -55, `${st.minus.laOpritor}`);
  assert.ok(st.minus.opritorPlan > 4.085 && st.minus.opritorPlan < 4.473, `${st.minus.opritorPlan}`);
});

const ctxDin = (b, plan) => ({ plan: TabloExtra.planStare(b, plan || PLAN, {}, Date.now()) });

await test("alerta LIGHTER: CRITIC (≈ 4x planul), spune cat, planul, unde sa-l muti si procentul din investitie", () => {
  const b = LIGHTER(), r = Alerte.evalueaza(b, ctxDin(b), {}, Date.UTC(2026, 8, 29, 13, 34));
  const m = r.mesaje.find((x) => x.cheie === "plan-stop");
  assert.ok(m, "nu s-a trimis");
  assert.equal(m.nivel, "critic");
  assert.match(m.titlu, /^LIGHTER: /);
  assert.match(m.titlu, /≈ 6\d USDT/);
  assert.match(m.titlu, /−15,7/);
  assert.match(m.mesaj, /3\.7870/);
  assert.match(m.mesaj, /4\.2\d{3}/, "pretul propus");
  assert.match(m.mesaj, /−15,2% din investiție/);
  assert.match(m.mesaj, /Ce aș face eu:/);
});

await test("opritorul sub grid ca la JTO/BCH (plan pe masura) -> fara alerta; 1,08x planul -> fara alerta (rotunjiri, alunecare)", () => {
  const b = Object.assign(LIGHTER(), { opritorPierdere: 4.05 });
  const t = -TabloExtra.totalLaOpritor(b);
  const r1 = Alerte.evalueaza(b, ctxDin(b, { plus: 5.5, minus: Math.ceil(t) }), {}, 1);
  assert.equal(r1.mesaje.filter((x) => x.cheie === "plan-stop").length, 0, JSON.stringify(r1.mesaje));
  const r2 = Alerte.evalueaza(b, ctxDin(b, { plus: 5.5, minus: t / 1.08 }), {}, 1);
  assert.equal(r2.mesaje.filter((x) => x.cheie === "plan-stop").length, 0);
});

await test("1,5x planul -> ATENTIE (nu critic)", () => {
  const b = Object.assign(LIGHTER(), { opritorPierdere: 4.05 }), t = -TabloExtra.totalLaOpritor(b);
  const m = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.5 }), {}, 1).mesaje.find((x) => x.cheie === "plan-stop");
  assert.equal(m && m.nivel, "atentie");
});

await test("histerezis: intra peste 1,2x, iese abia sub 1,1x; «a trecut» spune ca opritorul se potriveste acum", () => {
  const b = Object.assign(LIGHTER(), { opritorPierdere: 4.05 }), t = -TabloExtra.totalLaOpritor(b), T0 = Date.UTC(2026, 8, 29, 13, 0);
  const a = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.3 }), {}, T0);
  assert.equal(a.stare["plan-stop"].nivel, "atentie");
  // la 1,15x ramane in alerta si dupa cele 10 minute de "stabil" ale lui evalueaza (altfel histerezisul nu se vede)
  const c0 = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.15 }), a.stare, T0 + 60000);
  const c = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.15 }), c0.stare, T0 + 12 * 60000);
  assert.equal(c.stare["plan-stop"].nivel, "atentie", "a iesit la 1,15x");
  assert.equal(c.mesaje.filter((x) => x.cheie === "plan-stop").length, 0, "«a trecut» la 1,15x");
  const d = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.05 }), c.stare, T0 + 13 * 60000);
  const e = Alerte.evalueaza(b, ctxDin(b, { minus: t / 1.05 }), d.stare, T0 + 24 * 60000);
  const ok = e.mesaje.find((x) => x.cheie === "plan-stop");
  assert.ok(ok && ok.nivel === "info" && /se potrivește acum cu planul/.test(ok.titlu), JSON.stringify(e.mesaje));
});

await test("se repeta cel mult o data la 12 h (nu din ora in ora, ca un critic obisnuit)", () => {
  const b = LIGHTER(), T0 = Date.UTC(2026, 8, 29, 13, 34);
  const a = Alerte.evalueaza(b, ctxDin(b), {}, T0);
  const c = Alerte.evalueaza(b, ctxDin(b), a.stare, T0 + 2 * 3600000);
  assert.equal(c.mesaje.filter((x) => x.cheie === "plan-stop").length, 0, "repetat dupa 2 h");
  const d = Alerte.evalueaza(b, ctxDin(b), c.stare, T0 + 12 * 3600000 + 1000);
  assert.equal(d.mesaje.filter((x) => x.cheie === "plan-stop").length, 1, "nerepetat dupa 12 h");
});

await test("planul pe minus deja ATINS -> tace (acolo vorbeste «planul tau — iesi»); fara plan pe minus -> tace", () => {
  const b = Object.assign(LIGHTER(), { profitTotal: -16 });
  const r = Alerte.evalueaza(b, ctxDin(b), {}, 1);
  assert.equal(r.mesaje.filter((x) => x.cheie === "plan-stop").length, 0);
  assert.ok(r.mesaje.find((x) => x.cheie === "plan"), "planul tau — iesi a disparut");
  const r2 = Alerte.evalueaza(LIGHTER(), ctxDin(LIGHTER(), { plus: 5.5 }), {}, 1);
  assert.equal(r2.mesaje.filter((x) => x.cheie === "plan-stop").length, 0);
});

await test("opritorul in procente prea departe: propune doar procentul (pretul lui l-ar muta pe PRET)", () => {
  const b = Object.assign(LIGHTER(), { opritorPierdereTip: "raport", opritorPierdereRaport: -0.5 });
  const m = Alerte.evalueaza(b, ctxDin(b), {}, 1).mesaje.find((x) => x.cheie === "plan-stop");
  assert.ok(m, "nu s-a trimis");
  assert.match(m.mesaj, /−50,0% din investiție/);
  assert.match(m.mesaj, /−15,2% din investiție/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
