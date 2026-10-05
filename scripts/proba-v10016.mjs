// Proba v100.16 (30.09, el: „grid strâns cât vreau să iau TP” + „stopul cât e și gridul” -> „Amândouă, cu proba”):
// Radarul propune gridul DUPA PLANUL LUI, in doua variante una langa alta - a lui (levierul lui, banda cat planul) si a mea
// (banda cat o zi obisnuita a monedei, levierul la care marginea costa cel mult planul) - cu stopul si tinta LA MARGINI
// (cel mult 1/2 pas dincolo) si cu proba pe ultimele 30 de zile: de cate ori ar fi iesit pe stop, pe tinta, sau ar fi ramas.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const GridPlan = new Function("GridCalcul", "GridProba", `${lib("grid-plan.js")}; return GridPlan;`)(GridCalcul, GridProba);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.16 · gridul dupa planul tau: doua variante + proba pe 30 de zile · proba\n");

// Lumanari de 15 minute: 35 de zile, 96 pe zi, drum dat de f(i) (pretul la bara i)
const ZI = 86400000, T0 = Date.UTC(2026, 7, 25);
const bare = (f, n = 35 * 96) => Array.from({ length: n }, (_, i) => { const o = f(i), c = f(i + 1); return { t: T0 + i * 900000, o, c, h: Math.max(o, c), l: Math.min(o, c) }; });
const LATERAL = bare((i) => 4.473 * (1 + 0.012 * Math.sin(i / 7)));               // oscileaza ±1,2%, nu iese din nicio banda
const CADE = bare((i) => 4.473 * Math.exp(-0.0012 * i));                          // cade continuu (~−11%/zi)
const URCA = bare((i) => 4.473 * Math.exp(0.0012 * i));                           // urca continuu
// LIGHTER: 103,38 USDT, 5x, planul lui +5,5 / −15,7, LIT se misca 9,85% pe zi, pasul regulii lui 0,30%
const O = (x) => Object.assign({ pret: 4.473, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003, b15: LATERAL }, x || {});

await test("simuleaza spune PE CE PARTE a iesit si dupa cate bare (campuri noi, restul neatins)", () => {
  const st = { dir: "long", jos: 4.2, sus: 4.7, grile: 20, levier: 5, stop: { jos: 4.19, sus: 4.71 } };
  const jos = GridProba.simuleaza(CADE, 0, 400, Object.assign({}, st, { jos: 4.473 * 0.97, sus: 4.473 * 1.03, stop: { jos: 4.473 * 0.968, sus: 4.473 * 1.032 } }));
  assert.equal(jos.oprit, true); assert.equal(jos.iesit, "jos"); assert.ok(jos.bare > 0 && jos.bare < 400, `bare ${jos.bare}`);
  const sus = GridProba.simuleaza(URCA, 0, 400, Object.assign({}, st, { jos: 4.473 * 0.97, sus: 4.473 * 1.03, stop: { jos: 4.473 * 0.968, sus: 4.473 * 1.032 } }));
  assert.equal(sus.iesit, "sus");
  const fara = GridProba.simuleaza(LATERAL, 0, 200, Object.assign({}, st, { jos: 4.0, sus: 5.0, stop: { jos: 3.9, sus: 5.1 } }));
  assert.equal(fara.oprit, false); assert.equal(fara.iesit, null);
});

await test("varianta TA: levierul tau (5x), banda cat planul - la stop ≈ −15,7, la tinta ≈ +5,5 (cu comisioane, pe simulator)", () => {
  const v = GridPlan.variante(O()), a = v.ta;
  assert.equal(a.levier, 5);
  assert.ok(a.laStop < 0 && Math.abs(a.laStop + 15.7) < 15.7 * 0.12, `la stop ${a.laStop}`);
  assert.ok(Math.abs(a.laTinta - 5.5) < 5.5 * 0.2, `la tinta ${a.laTinta}`);
  assert.ok(a.jos < 4.473 && a.jos > 4.473 * 0.9 && a.sus > 4.473 && a.sus < 4.473 * 1.1, `${a.jos} - ${a.sus}`);
});

await test("stopul si tinta LA MARGINI: cel mult 1/2 pas dincolo de grid (nu 2 grile)", () => {
  for (const x of [GridPlan.variante(O()).ta, GridPlan.variante(O()).mea]) {
    assert.ok(x.stop.jos < x.jos && x.stop.jos >= x.jos * (1 - x.pas / 2) - 1e-12, `stop ${x.stop.jos} fata de jos ${x.jos}, pas ${x.pas}`);
    assert.ok(x.stop.sus > x.sus && x.stop.sus <= x.sus * (1 + x.pas / 2) + 1e-12, `tinta ${x.stop.sus} fata de sus ${x.sus}`);
  }
});

await test("varianta MEA: banda cat o zi obisnuita (±9,85%), levierul intreg cel mai mare pana la al tau la care marginea costa cel mult planul (LIT: 2x)", () => {
  const m = GridPlan.variante(O()).mea;
  assert.equal(m.levier, 2);
  assert.ok(Math.abs(m.jos / 4.473 - (1 - 0.0985)) < 1e-9, `jos ${m.jos}`);
  assert.ok(m.laStop >= -15.7 * 1.05 && m.laStop < -8, `la stop ${m.laStop}`);
  assert.ok(m.laTinta > 2 && m.laTinta <= 5.5 * 1.2, `la tinta ${m.laTinta}`);
});

await test("lichidarea sta dincolo de stop in ambele variante (long: sub)", () => {
  const v = GridPlan.variante(O());
  for (const x of [v.ta, v.mea]) assert.ok(x.lichidare.jos === null || x.lichidare.jos < x.stop.jos, `lichidare ${x.lichidare.jos} / stop ${x.stop.jos}`);
});

await test("moneda linistita (2%/zi, sub banda planului): varianta mea NU e mai ingusta decat a ta - e aceeasi (v100.18, prinsa pe BTC/XAU reale)", () => {
  const v = GridPlan.variante(O({ amp: 0.02 }));
  assert.equal(v.mea.egalaCuTa, true);
  assert.equal(v.mea.levier, v.ta.levier); assert.equal(v.mea.jos, v.ta.jos); assert.equal(v.mea.sus, v.ta.sus);
  assert.match(v.mea.cum, /la fel ca ÎNGUST/);   /* v100.102: „a ta” -> ÎNGUST */
});

await test("moneda care se misca 30%/zi: nici la 1x banda de o zi nu incape -> 1x si banda strans cat planul", () => {
  const m = GridPlan.variante(O({ amp: 0.3 })).mea;
  assert.equal(m.levier, 1);
  assert.ok(m.jos / 4.473 > 0.7, `jos ${m.jos}`);
  assert.ok(Math.abs(m.laStop + 15.7) < 15.7 * 0.12, `la stop ${m.laStop}`);
  assert.equal(m.stransaLaPlan, true);
});

await test("oglinda SHORT: aceleasi sume, preturile oglindite (stopul sus, tinta jos)", () => {
  const L = GridPlan.variante(O()), S = GridPlan.variante(O({ dir: "short" }));
  for (const k of ["ta", "mea"]) {
    assert.equal(S[k].levier, L[k].levier);
    // TA e potrivita exact pe plan (ambele ≈ −15,7); la MEA tinta e potrivita, stopul difera prin grilele geometrice (≤ 8%)
    assert.ok(Math.abs(S[k].laStop - L[k].laStop) < Math.abs(L[k].laStop) * (k === "ta" ? 0.02 : 0.08), `${k}: ${S[k].laStop} / ${L[k].laStop}`);
    assert.ok(S[k].stop.sus > S[k].sus && S[k].stop.jos < S[k].jos);
    // banda: la MEA e exact oglindita (d = miscarea pe zi); la TA potrivirea pe simulator o muta putin (grile geometrice)
    const dL = 1 - L[k].jos / 4.473, dS = S[k].sus / 4.473 - 1;
    assert.ok(k === "mea" ? Math.abs(dS - dL) < 1e-9 : Math.abs(dS / dL - 1) < 0.1, `${k}: banda de pierdere ${dS} / ${dL}`);
  }
});

await test("proba pe 30 de zile: pe o cadere continua fiecare pornire iese pe STOP; pe urcare, pe TINTA; lateral ramane in grid", () => {
  const c = GridPlan.variante(O({ b15: CADE })).ta.proba;
  assert.ok(c.n >= 100 && c.n <= 125, `porniri ${c.n}`);
  assert.equal(c.stop, c.n); assert.equal(c.tinta, 0);
  assert.ok(c.oreTipic > 0 && c.oreTipic < 24, `ore ${c.oreTipic}`);
  const u = GridPlan.variante(O({ b15: URCA })).ta.proba;
  assert.equal(u.tinta, u.n); assert.equal(u.stop, 0);
  const l = GridPlan.variante(O({ b15: LATERAL })).ta.proba;
  assert.equal(l.stop + l.tinta, 0); assert.equal(l.inGrid, l.n);
  assert.ok(l.mediaUsdt > 0, `lateral, grilele incaseaza: ${l.mediaUsdt}`);
});

await test("proba: media pe pornire e in USDT, cu comisioanele, si spune cate ferestre sunt independente", () => {
  const p = GridPlan.variante(O({ b15: CADE })).ta.proba;
  assert.ok(p.mediaUsdt < -14 && p.mediaUsdt > -19, `media ${p.mediaUsdt}`);
  assert.equal(p.zile, 30); assert.equal(p.ferestreZile, 3);
  assert.equal(p.independente, 10);
});

await test("fara miscarea pe zi -> doar varianta ta, a mea cu motivul; directia neutra / fara plan -> eroare cu motiv", () => {
  const v = GridPlan.variante(O({ amp: null }));
  assert.ok(v.ta && v.mea === null && /mișcarea monedei pe zi/.test(v.faraMea), JSON.stringify(v.faraMea));
  assert.match(GridPlan.variante(O({ dir: "neutru" })).eroare, /long sau short/);
  assert.match(GridPlan.variante(O({ plan: { plus: 5.5 } })).eroare, /plan/);
  assert.match(GridPlan.variante(O({ pret: null })).eroare, /preț/);
});

await test("minimul Pionex pe ordin: prea multe grile pentru suma -> mai putine grile (pasul creste), nu ordine sub minim", () => {
  const a = GridPlan.variante(O({ minOrdin: 20 })).ta;
  assert.ok(a.perOrdin >= 20 - 1e-9, `pe ordin ${a.perOrdin}`);
  assert.ok(a.grile >= 2);
});

await test("pagina: grid-plan.js se incarca inainte de app.js, e in APP_SHELL; Grid si Tablou deseneaza blocul", () => {
  const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8"), sw = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const iPlan = html.indexOf('src="/lib/grid-plan.js"'), iApp = html.indexOf('src="/app.js"'), iProba = html.indexOf('src="/lib/grid-proba.js"');
  assert.ok(iPlan > iProba && iPlan < iApp, `ordinea scripturilor: proba ${iProba}, plan ${iPlan}, app ${iApp}`);
  assert.match(sw, /"\/lib\/grid-plan\.js"/);
  assert.match(app, /GridPlan\.variante\(/);
  assert.match(app, /id="grPlanVar"/);
  assert.match(app, /tbPlanVar/);
  // poza a prins-o (30.09): linia intrase INTRE randurile lui if(prop){…}, iar propHtml='<div class="tbMuta">…' o suprascria
  const iAdauga = app.indexOf("propHtml+=tbPlanVarHtml(b)"), iMuta = app.indexOf("propHtml='<div class=\"tbMuta\">");
  assert.ok(iMuta > 0 && iAdauga > iMuta, `blocul se adauga DUPA setarile de copiat (muta ${iMuta}, adauga ${iAdauga})`);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
