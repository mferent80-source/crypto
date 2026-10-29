// Simularea v100.269 (ideile auditului 29.10, ideea 3): cât de des trece poarta OOS a modelelor ML pe date FĂRĂ informație (H0)?
// Folosește codul REAL din public/app.js (trainLogistic, trainElasticNetLogistic, trainBoostedStumps, modelEval, evalPredictions),
// extras după text. Trăsăturile și rezultatele se trag independent (mulberry32, sămânță fixă) ⇒ orice „USABLE” e o trecere falsă.
// Două feluri de date: rânduri independente și rânduri pe ZILE (5 pe zi; în aceeași zi trăsăturile și rezultatele se mișcă împreună,
// dar independent unele de altele - ca o zi de piață care împinge toate semnalele în aceeași parte).
// „vechi” = condiția de dinainte (n_test ≥ 20, AUC ≥ 0,55, skill > 0, ≥ 8 intrări, expectanță > 0), calculată din metrici;
// „nou”   = starea pe care o dă app.js acum (dacă are mlPoartaOOS: n_test ≥ 100 și IC 95% jos al AUC > 0,5, corectat pe încercări).
//   node scripts/sim-v100269-poarta-ml.mjs [rulari=400] [secvente=60]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); if (i < 0) return null; const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
const NOU = APP.includes("\nfunction mlPoartaOOS(");
const nume = ["clamp", "mlSigmoid", "normalizeTrain", "trainLogistic", "softThreshold", "trainElasticNetLogistic", "quantileSorted", "boostedStumpThresholds", "trainBoostedStumps", "mlSampleWeight", "aucMetric", "modelEval", "evalPredictions", "ensembleProbabilityFromModels", "metricR", "mcMulberry", "deterministicRng",
  ...(NOU ? ["mlZUnilateral", "aucRang", "aucSeHanleyMcNeil", "mlZiDin", "aucSeZile", "mlPoartaOOS"] : [])];
/* în contextul principal (într-un vm.createContext antrenarea e de ~4 ori mai lentă) */
globalThis.ML_FEATURES = Array(13).fill("f");
const box = globalThis;
/* constantele de modul ale porții (dacă există) - după text, ca funcțiile */
const constante = NOU ? (APP.match(/\nvar ML_POARTA_MIN_TEST=[^;\n]+;/) || [""])[0] : "";
vm.runInThisContext(constante + "\n" + nume.map((n) => { const f = fnApp(n); if (!f) throw new Error("lipsește " + n); return f; }).join("\n"));

const RULARI = +process.argv[2] || 400, SECVENTE = +process.argv[3] || 60;
const rng = box.mcMulberry(26910029);
const norm = () => { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const sig = (z) => 1 / (1 + Math.exp(-z));
const T0 = Date.UTC(2026, 0, 1);
/* H0: trăsăturile nu spun nimic despre rezultat. pePeZi>1 ⇒ ziua mișcă împreună trăsăturile (ρ 0,6) și, separat, rezultatele (σ 1,0 în logit). */
function date(n, pePeZi) {
  const rows = []; let zi = -1, efF = null, efY = 0;
  for (let i = 0; i < n; i++) {
    if (pePeZi <= 1 || i % pePeZi === 0) { zi++; efF = Array.from({ length: 13 }, norm); efY = norm(); }
    const vals = efF.map((d) => Math.max(0, Math.min(1, 0.5 + 0.17 * (pePeZi > 1 ? 0.6 * d + 0.8 * norm() : norm()))));
    const castiga = rng() < sig(Math.log(0.42 / 0.58) + (pePeZi > 1 ? 1.0 * efY : 0));
    const utility = castiga ? 0.3 + 2.2 * rng() : -(0.5 + 0.6 * rng());
    rows.push({ vals, label: utility >= 0.10 ? 1 : 0, utility, weight: Math.max(0.25, Math.min(3, Math.abs(utility))), row: { ts: T0 + zi * 86400000 + (i % Math.max(1, pePeZi)) * 3600000, netR: utility } });
  }
  return rows;
}
const vechi = (m) => m.n >= 20 && m.auc >= 0.55 && m.skill > 0 && m.tradeN >= 8 && m.expectancy > 0;
/* o antrenare ca trainMetaLabelModel (logistic, split 0,72) și una ca trainMetaEnsembleV2 (trei modele + media lor) */
function meta(data, k) { const n = data.length, cut = Math.max(45, Math.min(n - 20, Math.floor(n * 0.72))), tr = data.slice(0, cut), te = data.slice(cut); const m = box.trainLogistic(tr, 0.02); const ev = box.modelEval(m, te, k); return { vechi: vechi(ev), nou: ev.state === "USABLE", nTest: te.length }; }
function ansamblu(data, k) {
  const n = data.length, cut = Math.max(60, Math.min(n - 20, Math.floor(n * 0.72))), tr = data.slice(0, cut), te = data.slice(cut);
  const mod = [box.trainLogistic(tr, 0.02), box.trainElasticNetLogistic(tr, 0.01, 0.015), box.trainBoostedStumps(tr, 24, 0.22, 7)];
  const ev = mod.map((m) => box.modelEval(m, te, k));
  const pred = te.map((r) => { const e = box.ensembleProbabilityFromModels(mod.map((m, i) => ({ name: "m" + i, model: m })), r.vals); return { p: e.raw, y: r.label, range: e.range, utility: r.utility, ts: r.row.ts }; });
  const base = tr.reduce((a, x) => a + x.label * box.mlSampleWeight(x), 0) / (tr.reduce((a, x) => a + box.mlSampleWeight(x), 0) || tr.length);
  const ee = box.evalPredictions(pred, base, k);
  return { vechi: ev.every(vechi) && vechi(ee), nou: ev.every((x) => x.state === "USABLE") && ee.state === "USABLE", nTest: te.length };
}
const pct = (a, b) => (100 * a / b).toFixed(1).replace(".", ",") + "%";
const t0 = Date.now();
console.log(`\nSimularea v100.269 · poarta ML sub H0 · ${NOU ? "codul NOU (mlPoartaOOS)" : "codul VECHI"} · ${RULARI} rulări pe celulă, ${SECVENTE} secvențe de reantrenări\n`);
const tabel = [];
for (const pePeZi of [1, 5]) for (const N of [120, 200, 400, 700]) for (const fel of ["meta", "ansamblu"]) {
  /* ansamblul e de ~4 ori mai scump: jumătate din rulări */
  const R = fel === "ansamblu" ? Math.max(20, Math.round(RULARI / 2)) : RULARI;
  let v = 0, nn = 0, nt = 0;
  for (let r = 0; r < R; r++) { const d = date(N, pePeZi), x = fel === "meta" ? meta(d, 1) : ansamblu(d, 1); v += x.vechi; nn += x.nou; nt = x.nTest; }
  const rand = `${pePeZi === 1 ? "independente" : "5 pe zi    "} · N ${String(N).padStart(4)} (test ${String(nt).padStart(3)}) · ${fel.padEnd(8)} · vechi ${pct(v, R).padStart(6)} · nou ${NOU ? pct(nn, R).padStart(6) : "  —   "} · ${R} rulări`;
  tabel.push(rand); console.log("  " + rand);
}
/* reantrenări: aceeași serie crește de la 90 la 690 de rezultate, cu o reantrenare la fiecare 40 noi (16 încercări pe date diferite);
   trecere falsă = oricare dintre ele iese USABLE. „nou” numără încercările ca app.js (k = a câta reantrenare). */
for (const pePeZi of [1, 5]) {
  let v = 0, nn = 0;
  for (let s = 0; s < SECVENTE; s++) {
    const tot = date(690, pePeZi); let av = false, an = false, k = 0;
    for (let N = 90; N <= 690; N += 40) { k++; const x = meta(tot.slice(0, N), k); av = av || x.vechi; an = an || x.nou; }
    v += av; nn += an;
  }
  const rand = `${pePeZi === 1 ? "independente" : "5 pe zi    "} · reantrenări 90→690 (16 încercări) · meta · vechi ${pct(v, SECVENTE)} · nou ${NOU ? pct(nn, SECVENTE) : "—"} · ${SECVENTE} secvențe (oricare trece)`;
  tabel.push(rand); console.log("  " + rand);
}
console.log(`\n  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
