// Proba v100.306-b2 (I-834, partea Radarului; auditul final din 05.11.2026, 🟡 statistică): testele care dădeau „mai bine / dovedit” din noroc.
//   1. Reveniri.dovada („istoricul mai bine / mai slab”, în titlul de dimineață și în Sugestii): simularea de MĂRIME sub H0 pe lumile
//      auditorului (regula nu poate prezice; cu și fără factor comun de piață), cu modulul REAL ⇒ „mai bine / mai slab” fals ≤ 6 %
//      (înainte: 12–18 % cu factor comun). Pe un efect adevărat, testul îl găsește; „cam la fel” nu mai apare (nedovedit = „n-am aflat”).
//   2. Verdicte.calibrare / comparaPeZi (Poarta gridului, Poarta T212): simularea de MĂRIME pe lumile auditorului (etichete care persistă,
//      rezultate legate: nivel propriu al simbolului + AR(1)) și pe lumea în care eticheta ține de beta-ul monedei, cu factor comun ⇒ p ≤ 0,05
//      în ≤ 6 % din lumile testate (înainte: 20–50 %). Forma ieșirii rămâne aceeași (registrul o citește); pe un efect adevărat, testul îl găsește.
//   Simulările mari (4.000 de lumi pe configurație) stau în scratchpad (rb-lucru/sim-*.mjs); cifrele lor sunt în comentariile modulelor.
//   node scripts/proba-v100306-b2.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); });
}
console.log("\nV100.306-b2 · testele pe blocuri de zile (I-834) · proba\n");
// modulele în contextul principal (vm.runInThisContext): simulările cer viteză
vm.runInThisContext(citeste("public", "lib", "reveniri.js") + "\n;globalThis.__R = Reveniri;");
vm.runInThisContext(citeste("public", "lib", "verdicte.js") + "\n;globalThis.__V = Verdicte;");
const R = globalThis.__R, V = globalThis.__V;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ZI = 86400000, H4 = 4 * 3600000, PRAG = 0.06;

// ---------------------------------------------------------------- 1. Reveniri: lumile auditorului (sim-reveniri*.mjs), aceleași formule
function lumeMonede(w, FACT, N = 70, BARE = 2400) {   // monede: bare de 4 h, factor comun BTC cu GARCH, nicio derivă ⇒ regula nu poate prezice
  const rnd = mulberry32(5000 + w); const g = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const m = []; let h = 0.008 ** 2; for (let t = 0; t < BARE; t++) { const e = Math.sqrt(h) * g(); m.push(e); h = 0.0000013 + 0.08 * e * e + 0.90 * h; }
  const serii = [];
  for (let i = 0; i < N; i++) {
    const beta = (0.8 + 0.6 * rnd()) * FACT, sId = 0.006 + 0.014 * rnd(), b = []; let c = 1; const t0 = Date.UTC(2025, 9, 1);
    for (let t = 0; t < BARE; t++) { const o = c; c = c * Math.exp(beta * m[t] + sId * g() - 0.5 * (beta * beta * 6.4e-5 + sId * sId)); b.push({ t: t0 + t * H4, o, h: Math.max(o, c) * (1 + Math.abs(g()) * 0.4 * sId), l: Math.min(o, c) * (1 - Math.abs(g()) * 0.4 * sId), c }); }
    serii.push(R.puncte(b, { r: R.REGULI.moneda, dupaTimp: true, start: 499 }));
  }
  return serii;
}
function lumeActiuni(w, FACT, N = 203, ZILE = 500) {   // acțiuni: bare zilnice, piața GARCH, multe acțiuni mici și volatile
  const rnd = mulberry32(1000 + w); const g = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const m = new Array(ZILE); let h = 0.012 ** 2; for (let t = 0; t < ZILE; t++) { const e = Math.sqrt(h) * g(); m[t] = e; h = 0.000002 + 0.10 * e * e + 0.88 * h; }
  const serii = [];
  for (let i = 0; i < N; i++) {
    const beta = (0.6 + 1.2 * rnd()) * FACT, sId = 0.012 + 0.04 * rnd() * rnd(), b = []; let c = 100; const t0 = Date.UTC(2024, 10, 1);
    for (let t = 0; t < ZILE; t++) { const r = beta * m[t] + sId * g(), o = c; c = c * Math.exp(r - 0.5 * (beta * beta * 0.012 * 0.012 + sId * sId)); b.push({ t: t0 + t * ZI, o, h: Math.max(o, c) * (1 + Math.abs(g()) * 0.3 * sId), l: Math.min(o, c) * (1 - Math.abs(g()) * 0.3 * sId), c }); }
    serii.push(R.puncte(b, { r: R.REGULI.actiune }));
  }
  return serii;
}
function marimeReveniri(lume, FACT, LUMI, pauza) {
  let fals = 0, k = 0; const et = {};
  for (let w = 0; w < LUMI; w++) { const d = R.dovada(lume(w, FACT), "revine", { pauzaZile: pauza }); if (!d || !d.eticheta) continue; k++; et[d.eticheta] = (et[d.eticheta] || 0) + 1; if (d.eticheta === "mai bine" || d.eticheta === "mai slab") fals++; }
  return { fals: fals / k, k, et };
}
for (const [nume, lume, FACT, LUMI, pauza] of [["monede, cu factor comun", lumeMonede, 1, 150, 7], ["monede, fără factor comun", lumeMonede, 0, 100, 7], ["acțiuni, cu factor comun", lumeActiuni, 1, 60, 14]]) {
  await test("1. Reveniri.dovada sub H0 (" + nume + ", " + LUMI + " de lumi): „mai bine / mai slab” fals ≤ 6 %", () => {
    const r = marimeReveniri(lume, FACT, LUMI, pauza);
    console.log("       " + nume + ": fals " + (r.fals * 100).toFixed(1).replace(".", ",") + " % din " + r.k + " · " + JSON.stringify(r.et));
    assert.ok(r.k >= LUMI * 0.9, "lumi cu etichetă: " + r.k); assert.ok(r.fals <= PRAG, "fals " + (r.fals * 100).toFixed(1) + " % > 6 %");
    assert.ok(!r.et["cam la fel"], "„cam la fel” nu mai apare: o diferență nedovedită nu e o asemănare dovedită");
  });
}
await test("1b. Reveniri.dovada: forma ieșirii e aceeași (+ test); un efect adevărat iese „mai bine”; prea puține perioade ⇒ „la fel, prea puține cazuri”", () => {
  // puncte construite: 40 de serii × 400 de zile, randamente fără legătură cu trecutul; „revine” la întâmplare (~4 %), cu +6 % adevărat la cele cu regula
  const rnd = mulberry32(306), g = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const fa = (efect, zile) => { const s = []; for (let i = 0; i < 40; i++) { const l = []; for (let d = 0; d < 400; d++) { const rv = zile ? zile.includes(d) : rnd() < 0.04; l.push({ t: Date.UTC(2025, 0, 1) + d * ZI, f: 0.05 * g() + (rv ? efect : 0), revine: rv }); } s.push(l); } return s; };
  const d = R.dovada(fa(0.06), "revine", { pauzaZile: 7 });
  for (const k of ["n", "saptamani", "pePlus", "medie", "mediana", "baza", "eticheta", "putine"]) assert.ok(k in d, "lipsește " + k);
  assert.equal(d.eticheta, "mai bine", JSON.stringify(d)); assert.ok(d.test && d.test.p < 0.05 && d.test.blocuri >= 8 && d.test.serii >= 8, JSON.stringify(d.test));
  const z = R.dovada(fa(0, null), "revine", { pauzaZile: 7 }); assert.ok(z.eticheta === "n-am aflat" || z.eticheta === "mai bine" || z.eticheta === "mai slab", z.eticheta);
  const p = R.dovada(fa(0.06, [10, 11, 200]), "revine", { pauzaZile: 1 }); assert.equal(p.eticheta, "la fel, prea puține cazuri", "căderile din 3 zile nu fac 8 perioade: " + JSON.stringify(p.test));
  assert.match(R.textDovada(z, "monede"), /— (n-am aflat|mai bine|mai slab) \(/);
});

// ---------------------------------------------------------------- 2. Verdicte: lumile auditorului (sim-verdicte.mjs)
// FM = factorul comun al pieței (beta-ul monedei între 0,3 și 1,7, ori FM); LB = cât ține eticheta de beta (0,5 ± LB după beta > 1)
function lumeVerdicte(w, N, D, STAY, SIGMU, RHO, H, FM = 0, LB = 0) {
  const rnd = mulberry32(777 + w); const g = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const ev = [], m = []; if (FM) for (let d = 0; d < D; d++) m.push(g());   // fără FM / LB: exact șirul auditorului (sim-verdicte.mjs)
  for (let i = 0; i < N; i++) {
    const bu = FM || LB ? 0.3 + 1.4 * rnd() : 1, mu = SIGMU * g(), beta = FM * bu, pf = LB ? (bu > 1 ? 0.5 + LB : 0.5 - LB) : 0.5; let e = g(), lab = rnd() < pf;
    for (let d = 0; d < D; d++) {
      if (d > 0 && rnd() > STAY) lab = rnd() < pf;            // eticheta: lanț Markov, independent de rezultat (poate ține de beta)
      e = RHO * e + Math.sqrt(1 - RHO * RHO) * g();             // rezultatul: nivel propriu + AR(1) (+ beta × piața zilei)
      ev.push({ s: "poarta-grid-net", k: "C" + i + "_USDT", n: lab ? "porneste" : "nu", t: Date.UTC(2026, 8, 1) + d * ZI + 3600000, h: H, val: 0.01 * (mu + e + (FM ? beta * m[d] : 0)), p: 1 });
    }
  }
  return ev;
}
function marimeVerdicte(LUMI, par) {
  let p05 = 0, k = 0;
  for (let w = 0; w < LUMI; w++) { const c = V.calibrare(lumeVerdicte(w, ...par), { repsP: 999 }).find((x) => x.sursa === "poarta-grid-net" && x.h === par[5]); if (c && c.test && c.test.stare === "testat") { k++; if (c.test.p <= 0.05) p05++; } }
  return { rata: p05 / k, k };
}
// pe 4.000 de lumi (rb-lucru/sim-ver-real.mjs) testul nou iese 4,2 / 3,5 / 4,2 / 4,6 % pe lumile de mai jos; aici câte 1.000 (eroarea de
// eșantion ~0,7 pp, ca garda de 6 % să nu cadă din noroc)
for (const [nume, LUMI, par] of [["persistență 0,95, nivel propriu 0,5, AR 0,5, h = 1", 1000, [30, 120, 0.95, 0.5, 0.5, 1]], ["persistență 0,8, nivel propriu 0,3, AR 0,5, h = 1", 1000, [30, 120, 0.8, 0.3, 0.5, 1]], ["persistență 0,95, AR 0,8, h = 3", 1000, [30, 120, 0.95, 0, 0.8, 3]],
  ["eticheta ține de beta, factor comun, persistență 0,95, nivel propriu 0,3", 1000, [30, 120, 0.95, 0.3, 0.5, 1, 2, 0.3]]]) {
  await test("2. Verdicte.calibrare sub H0 (" + nume + ", " + LUMI + " de lumi): p ≤ 0,05 în ≤ 6 % din lumile testate", () => {
    const r = marimeVerdicte(LUMI, par);
    console.log("       " + nume + ": " + (r.rata * 100).toFixed(1).replace(".", ",") + " % din " + r.k);
    assert.ok(r.k >= LUMI * 0.9, "lumi testate: " + r.k); assert.ok(r.rata <= PRAG, "p ≤ 0,05 în " + (r.rata * 100).toFixed(1) + " % > 6 %");
  });
}
await test("2b. Verdicte.calibrare: forma testului e aceeași (stare, nFav, nRest, dif, ic, p, pMin, unitati, zileAmestecate); un efect adevărat trece; registrul îl citește", () => {
  const ev = lumeVerdicte(5, 30, 120, 0.8, 0.3, 0.5, 1).map((x) => x.n === "porneste" ? Object.assign({}, x, { val: x.val + 0.006 }) : x);
  const c = V.calibrare(ev, { repsP: 999 }).find((x) => x.sursa === "poarta-grid-net" && x.h === 1);
  for (const k of ["stare", "nFav", "nRest", "dif", "ic", "p", "pMin", "unitati", "zileAmestecate"]) assert.ok(k in c.test, "lipsește " + k);
  assert.equal(c.test.stare, "testat"); assert.ok(c.test.p <= 0.05 && c.test.dif > 0, JSON.stringify(c.test)); assert.ok(c.test.ic[0] < c.test.dif && c.test.dif < c.test.ic[1], "dif în IC");
  assert.ok(c.test.pMin >= 0 && c.test.pMin <= c.test.p, "pMin"); assert.ok(c.test.simboluri === 30 && c.test.saptamani >= 17 && c.test.gradeLibertate === Math.min(c.test.simboluri, c.test.saptamani) - 1, JSON.stringify(c.test));
  const reg = V.registru({ calibrare: [c] }); assert.equal(reg.length, 1); assert.equal(reg[0].p, c.test.p);
  const putine = V.calibrare(lumeVerdicte(6, 4, 40, 0.8, 0.3, 0.5, 1), { repsP: 999 }).find((x) => x.sursa === "poarta-grid-net" && x.h === 1);
  assert.equal(putine.test.stare, "putine", "4 simboluri nu ajung: " + JSON.stringify(putine.test)); assert.equal(putine.test.motiv, "simboluri");
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
