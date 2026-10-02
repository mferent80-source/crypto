// Proba v100.80 (TF) - rețeaua neuronală, livrarea 1: retea/model.mjs - TensorFlow.js pe WebAssembly (nu JS pur: de câteva sute de ori
// mai lent, lecția Busolei), ieșirea pornită de la rata de bază, aceeași predicție ca Retea.prezice pe greutățile exportate, semințele.
//   node scripts/proba-v10080-tf.mjs      (cere `npm --prefix retea install`)
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!fs.existsSync(path.join(RAD, "retea", "node_modules", "@tensorflow", "tfjs-backend-wasm"))) { console.log("✗ lipsește TensorFlow.js: rulează `npm --prefix retea install`"); process.exit(1); }
const MOD = await import(pathToFileURL(path.join(RAD, "retea", "model.mjs")).href), { tf } = MOD;   // o singură copie a TensorFlow (cea din retea/)
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
// date sintetice: n rânduri × nIn, y = 1 când x0 + x1 > 0 (cu sămânță)
function date(n, nIn, seed) { const r = MOD.cuSamanta(seed), X = new Float32Array(n * nIn), y = new Float32Array(n); for (let i = 0; i < n; i++) { for (let k = 0; k < nIn; k++) X[i * nIn + k] = r() * 2 - 1; y[i] = X[i * nIn] + X[i * nIn + 1] > 0 ? 1 : 0; } return { X, y }; }

console.log("Proba v100.80 (TF) · TensorFlow.js pe WebAssembly, exportul, semințele");

await test("(2) backend-ul e WebAssembly și o epocă pe 50.000 de rânduri × 20 ține sub 10 s (Busola: ~1,1 s)", async () => {
  assert.equal(await MOD.porneste(), "wasm");
  const { X, y } = date(50000, 20, 1), m = MOD.construieste(20, MOD.HIPER.ascunse, 0.5), tx = tf.tensor2d(X, [50000, 20]), ty = tf.tensor2d(y, [50000, 1]);
  const t0 = Date.now(); await m.fit(tx, ty, { batchSize: 256, epochs: 1, verbose: 0 }); const s = (Date.now() - t0) / 1000;
  console.log("      o epocă: " + s.toFixed(2) + " s"); assert.ok(s < 10, s + " s");
  tx.dispose(); ty.dispose(); m.dispose();
});

await test("(2) ieșirea pornește de la rata de bază: înainte de antrenare, pe intrarea zero, rețeaua zice 30% când rata e 30%", async () => {
  for (const asc of [[16, 8], []]) { const m = MOD.construieste(5, asc, 0.3), p = m.predict(tf.zeros([1, 5])).dataSync()[0]; assert.ok(Math.abs(p - 0.3) < 1e-6, asc + ": " + p); m.dispose(); }
});

await test("(2) Retea.prezice pe greutățile exportate = predicția TensorFlow (diferența < 1e-5), și la rețea, și la formula simplă", async () => {
  const { X, y } = date(3000, 6, 5);
  for (const asc of [[16, 8], []]) {
    const m = MOD.construieste(6, asc, 0.5); await m.fit(tf.tensor2d(X, [3000, 6]), tf.tensor2d(y, [3000, 1]), { batchSize: 256, epochs: 3, verbose: 0 });
    const tfp = m.predict(tf.tensor2d(X.subarray(0, 200 * 6), [200, 6])).dataSync(), model = { versiune: Retea.VERSIUNE, norm: { m: [0, 0, 0, 0, 0, 0], s: [1, 1, 1, 1, 1, 1] }, ansamblu: [MOD.exporta(m)] };
    let max = 0; for (let i = 0; i < 200; i++) max = Math.max(max, Math.abs(Retea.prezice(model, Array.from(X.subarray(i * 6, i * 6 + 6))) - tfp[i]));
    assert.ok(max < 1e-5, asc + ": " + max); assert.equal(model.ansamblu[0].length, asc.length + 1, "straturile exportate (dropout n-are greutăți)");
    m.dispose();
  }
});

await test("(2) aceeași sămânță -> aceleași greutăți (inițializarea, dropout-ul, amestecarea); Math.random se pune la loc; învață ceva", async () => {
  const { X, y } = date(4000, 4, 9), rnd = Math.random;
  const a = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 42), b = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 42), c = await MOD.antreneaza(X, y, 4, MOD.HIPER.ascunse, 43);
  assert.equal(Math.random, rnd);
  assert.deepEqual(a.straturi, b.straturi); assert.notDeepEqual(a.straturi, c.straturi);
  assert.ok(a.epoci >= 1 && a.pierdere < 0.5, JSON.stringify({ epoci: a.epoci, pierdere: a.pierdere }));
});

console.log("\n" + (pica ? "V100.80 TF PICA · " + pica + " din " + (ok + pica) : "V100.80 TF PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
