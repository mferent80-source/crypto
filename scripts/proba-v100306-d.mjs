// Proba v100.306-d (05.11.2026, la unirea auditului final — ce a rămas după cei trei agenți):
//   1. Laboratorul gridului (GridLaborator.testNet / compara, „dovedit” pe bani): permutarea etichetelor ÎN fiecare bloc socotea blocurile
//      independente. Cu eticheta ținută de aceeași monedă bloc după bloc și netul legat de monedă (o monedă volatilă iese mereu altfel), pe
//      lumi FĂRĂ efect ieșea „dovedit” în 15–50 % din lumi (scratchpad lab-marime.mjs). Acum: aceeași statistică, varianța pe DOUĂ căi
//      (monede + blocuri), ca Verdicte.comparaPeZi din v100.306 ⇒ mărimea sub H0 ≤ 6 %, iar un efect adevărat se vede în continuare.
//   2. „n-am aflat” (Reveniri.eticheta din v100.306) trecea prin server doar dacă era în lista veche („mai bine / mai slab / cam la fel”) ⇒
//      pe ecran nu apărea nimic. Acum serverul păstrează și „n-am aflat” / „la fel, prea puține cazuri”.
//   3. Titlul de dimineață: „istoricul n-am aflat” ar fi sunat stângaci, iar „cam la fel” (eticheta veche, nedovedită) nu e o asemănare
//      dovedită ⇒ doar „mai bine” / „mai slab” se scriu ca atare, restul ⇒ „istoricul nedovedit”.
//   node scripts/proba-v100306-d.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("\nv100.306-d · laboratorul gridului pe două căi, „n-am aflat” prin server, titlul de dimineață · proba\n");

// ── modulele, ca în colector (același text al paginii) ──
const lib = (f) => citeste("public", "lib", f);
const incarca = (f, n, ...dep) => new Function(...dep.map((d) => d[0]), lib(f) + "; return " + n + ";")(...dep.map((d) => d[1]));
globalThis.window = globalThis; globalThis.self = globalThis;
const GridCalcul = incarca("grid-calcul.js", "GridCalcul");
const GridProba = incarca("grid-proba.js", "GridProba", ["GridCalcul", GridCalcul]);
const Valoare = incarca("valoare.js", "Valoare");
const GL = incarca("grid-laborator.js", "GridLaborator", ["GridCalcul", GridCalcul], ["GridProba", GridProba], ["Valoare", Valoare]);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ZI = 864e5;
// o lume: S monede × B blocuri de H zile; eticheta ține pe monedă (persistența), netul = nivelul monedei + piața blocului + zgomot + efectul etichetei
function lume(seed, { S = 20, B = 40, H = 3, pers = 0.85, sdMoneda = 1, efect = 0 }) {
  const r = mulberry32(seed), n = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const mu = Array.from({ length: S }, () => sdMoneda * n()), ps = Array.from({ length: S }, () => 0.1 + 0.8 * r()), et = ps.map((p) => r() < p), rows = [];
  for (let b = 0; b < B; b++) {
    const f = 2 * n();
    for (let s = 0; s < S; s++) {
      if (b > 0 && r() > pers) et[s] = r() < ps[s];
      rows.push({ simbol: "S" + s, t: b * H * ZI, net: mu[s] + f + n() + (et[s] ? efect : 0), A: et[s], parte: b < B * 2 / 3 ? "a" : "t" });
    }
  }
  return { rows, H };
}
const rata = (lumi, o) => { let d = 0; for (let w = 0; w < lumi; w++) { const { rows, H } = lume(7000 + w, o); if (GL.compara(rows, (x) => x.A, (x) => !x.A, H).verdict === "dovedit") d++; } return d / lumi; };

await test("🔑 laboratorul, lume FĂRĂ efect, eticheta ține pe monedă, netul legat de monedă (H = 3): „dovedit” în ≤ 6 % din 200 de lumi", () => {
  const p = rata(200, { H: 3, pers: 0.85, sdMoneda: 1 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi (înainte: 49,5 %)`);
});
await test("🔑 …blocuri de 7 zile, nivelul monedei mai mic: tot ≤ 6 %", () => {
  const p = rata(200, { H: 7, pers: 0.85, sdMoneda: 0.5 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi (înainte: 35,0 %)`);
});
await test("…fără nivel pe monedă și eticheta schimbată des: tot ≤ 6 %", () => {
  const p = rata(200, { H: 3, pers: 0.5, sdMoneda: 0 });
  assert.ok(p <= 0.06, `„dovedit” în ${(100 * p).toFixed(1)} % din lumi`);
});
await test("🔑 un efect ADEVĂRAT (+0,8 pe fereastră la eticheta A, peste nivelul monedelor) se vede în continuare: „dovedit” în ≥ 50 % din 100 de lumi", () => {
  const p = rata(100, { H: 3, pers: 0.6, sdMoneda: 0.5, efect: 0.8 });
  assert.ok(p >= 0.5, `„dovedit” doar în ${(100 * p).toFixed(1)} % din lumi`);
});
await test("testul spune pe ce s-a socotit: simboluri, grade de libertate; sub 8 monede ⇒ „putine”", () => {
  const { rows, H } = lume(11, { H: 3 });
  const t = GL.testNet(rows, (x) => x.A, (x) => !x.A, H);
  assert.equal(t.stare, "testat"); assert.ok(t.simboluri === 20 && t.gradeLibertate >= 7, JSON.stringify({ s: t.simboluri, df: t.gradeLibertate }));
  assert.ok(Array.isArray(t.ic) && t.ic[0] < t.dif && t.dif < t.ic[1] && t.p > 0 && t.p <= 1, JSON.stringify(t));
  const putine = lume(12, { S: 6, H: 3 });
  assert.equal(GL.testNet(putine.rows, (x) => x.A, (x) => !x.A, putine.H).stare, "putine");
});

await test("🔑 serverul păstrează „n-am aflat” și „la fel, prea puține cazuri” (t212.js și istoric-bot.js), nu le face null", () => {
  for (const f of [["functions", "api", "t212.js"], ["functions", "api", "istoric-bot.js"]]) {
    const s = citeste(...f), liste = [...s.matchAll(/\[([^\]]*"mai bine"[^\]]*)\]\.includes\(/g)].map((m) => m[1]);
    assert.ok(liste.length >= 1, f.join("/") + ": lista etichetelor lipsește");
    for (const l of liste) for (const e of ["mai bine", "mai slab", "n-am aflat", "la fel, prea puține cazuri"]) assert.ok(l.includes('"' + e + '"'), f.join("/") + ": lipsește „" + e + "” din " + l);
  }
});

const { titluDimineata: T } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "dimineata-titlu.mjs")).href);
await test("🔑 titlul de dimineață: „mai bine” / „mai slab” ca atare; „n-am aflat”, „cam la fel”, „la fel, prea puține cazuri” ⇒ „istoricul nedovedit”", () => {
  const t = (e) => T({ reveniri: 9, eticheta: e, deIesit: 0 });
  assert.equal(t("mai bine"), "Azi: 9 acțiuni pe revenire, istoricul mai bine · nimic de ieșit");
  assert.equal(t("mai slab"), "Azi: 9 acțiuni pe revenire, istoricul mai slab · nimic de ieșit");
  for (const e of ["n-am aflat", "cam la fel", "la fel, prea puține cazuri"]) assert.equal(t(e), "Azi: 9 acțiuni pe revenire, istoricul nedovedit · nimic de ieșit", e);
  assert.equal(t(null), "Azi: 9 acțiuni pe revenire · nimic de ieșit");
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
