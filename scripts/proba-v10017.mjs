// Proba v100.17 (30.09, el: „ok, fă ideile” - ideea 2): pentru botul care RULEAZA, Tabloul spune „de la pornirea ta, pe drumul
// real”: cele doua variante ale gridului dupa plan (a lui, a mea), pornite in aceeasi clipa si la acelasi pret ca botul, simulate
// pe lumanarile de 15M de atunci pana acum - pe ce parte ar fi iesit, cand si cu cat, sau cat ar avea acum.
// Pe noaptea REALA a botului LIGHTER (29.09, lumanarile Pionex salvate): ambele ieseau pe stop pe la 23:15 UTC, cu ≈ −13..−15 USDT.
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
console.log("\nV100.17 · de la pornirea botului, pe drumul real · proba\n");

const FIX = JSON.parse(fs.readFileSync(new URL("./fixturi/lit-15m-2026-09-29.json", import.meta.url), "utf8"));
const B15 = GridCalcul.bare(FIX.randuri);
const PORNIT = 1790688555245;   // botul 2390 LIGHTER, 29.09 13:29:15 UTC
const O = (x) => Object.assign({ b15: B15, tStart: PORNIT, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003 }, x || {});

await test("LIGHTER 29.09: pornite ca botul, AMBELE variante ieseau pe STOP pe la 23:15 UTC, cu ≈ −13..−15 USDT (botul real: −59)", () => {
  const d = GridPlan.dePornire(O());
  assert.ok(d && !d.eroare, JSON.stringify(d));
  assert.equal(new Date(d.t).toISOString(), "2026-09-29T13:30:00.000Z");
  for (const k of ["ta", "mea"]) {
    const x = d[k];
    assert.equal(x.iesit, "stop", `${k}: ${x.iesit}`);
    assert.equal(new Date(x.la).toISOString(), "2026-09-29T23:15:00.000Z", `${k}`);
    assert.ok(x.usdt < -10 && x.usdt > -16.5, `${k}: ${x.usdt}`);
  }
  assert.equal(d.ta.levier, 5); assert.equal(d.mea.levier, 2);
});

await test("pe urcare, varianta ta iese pe TINTA; lateral ramane in grid si spune cat are acum", () => {
  const up = GridCalcul.bare(Array.from({ length: 80 }, (_, i) => ({ time: PORNIT - 900000 + i * 900000, open: 4.47 * (1 + 0.004 * i), close: 4.47 * (1 + 0.004 * (i + 1)), high: 4.47 * (1 + 0.004 * (i + 1)), low: 4.47 * (1 + 0.004 * i) })));
  const u = GridPlan.dePornire(O({ b15: up }));
  assert.equal(u.ta.iesit, "tinta"); assert.ok(u.ta.usdt > 4 && u.ta.usdt < 7, `${u.ta.usdt}`);
  const lat = GridCalcul.bare(Array.from({ length: 80 }, (_, i) => { const p = (k) => 4.47 * (1 + 0.006 * Math.sin(k / 3)); return { time: PORNIT - 900000 + i * 900000, open: p(i), close: p(i + 1), high: Math.max(p(i), p(i + 1)), low: Math.min(p(i), p(i + 1)) }; }));
  const l = GridPlan.dePornire(O({ b15: lat }));
  assert.equal(l.ta.iesit, null); assert.equal(l.ta.la, null); assert.equal(typeof l.ta.usdt, "number");
});

await test("pornit inainte de lumanarile avute / in ultima lumanare / fara pornire -> null (nu se inventeaza)", () => {
  assert.equal(GridPlan.dePornire(O({ tStart: B15[0].t - 3600000 })), null);
  assert.equal(GridPlan.dePornire(O({ tStart: B15[B15.length - 1].t })), null);
  assert.equal(GridPlan.dePornire(O({ tStart: null })), null);
});

await test("directie neutra / fara plan -> eroarea variantelor, nu o simulare", () => {
  assert.match(GridPlan.dePornire(O({ dir: "neutru" })).eroare, /long sau short/);
  assert.match(GridPlan.dePornire(O({ plan: {} })).eroare, /plan/);
});

await test("Tabloul arata randul „De la pornirea botului” in blocul gridului dupa plan", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /GridPlan\.dePornire\(/);
  assert.match(app, /De la pornirea botului/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
