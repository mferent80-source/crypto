// Rețeaua (specul, „Antrenarea”): TensorFlow.js pe WebAssembly. Rețeaua mică (16 relu → dropout 0,2 → 8 relu → 1 sigmoid) și formula
// simplă (fără strat ascuns) se antrenează LA FEL: Adam 1e-3, loturi de 256, cel mult 60 de epoci, oprire timpurie pe ultimii 20% din
// rânduri (în ordinea timpului), răbdare 5; L2 1e-3 pe toate straturile; ieșirea pornește de la rata de bază (bias = logit(rata) -
// lecția Busolei). Math.random e înlocuit cu un generator cu sămânță cât se lucrează la un model (inițializarea, dropout-ul fără
// sămânță fixă - una fixă ar repeta masca la fiecare lot -, amestecarea loturilor). Greutățile ies în forma citită de Retea.prezice.
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-wasm";
export { tf };

export const HIPER = Object.freeze({ ascunse: [16, 8], l2: 1e-3, dropout: 0.2, lr: 1e-3, lot: 256, epoci: 60, rabdare: 5, validare: 0.2, seminte: 5 });
let gata = false;
// RETEA_BACKEND: doar pentru probă (revizia finală, M6) - antrenorul refuză orice altceva decât WebAssembly
export async function porneste() { if (!gata) { try { await tf.setBackend(process.env.RETEA_BACKEND || "wasm"); } catch {} await tf.ready(); gata = true; } return tf.getBackend(); }
// mulberry32: aceeași sămânță -> același șir
export function cuSamanta(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function construieste(nIn, ascunse, rata) {
  const m = tf.sequential(), l2 = () => tf.regularizers.l2({ l2: HIPER.l2 });
  ascunse.forEach((u, k) => {
    m.add(tf.layers.dense({ units: u, activation: "relu", kernelRegularizer: l2(), ...(k === 0 ? { inputShape: [nIn] } : {}) }));
    if (k === 0) m.add(tf.layers.dropout({ rate: HIPER.dropout }));
  });
  m.add(tf.layers.dense({ units: 1, activation: "sigmoid", kernelRegularizer: l2(), ...(ascunse.length ? {} : { inputShape: [nIn] }) }));
  const r = Math.min(0.99, Math.max(0.01, rata)), ultim = m.layers[m.layers.length - 1], [W] = ultim.getWeights(), bias = tf.tensor1d([Math.log(r / (1 - r))]);
  ultim.setWeights([W, bias]); bias.dispose();
  m.compile({ optimizer: tf.train.adam(HIPER.lr), loss: "binaryCrossentropy" });
  return m;
}
const p7 = (v) => Number(v.toPrecision(7));
export function exporta(m) {
  return m.layers.filter((L) => L.getWeights().length === 2).map((L) => {
    const [W, b] = L.getWeights(), act = L.getConfig().activation;
    return { W: W.arraySync().map((r) => r.map(p7)), b: b.arraySync().map(p7), act: act === "relu" || act === "sigmoid" ? act : "liniar" };
  });
}
// X: Float32Array (n × nIn, rândurile în ordinea timpului, deja normalizate), y: Float32Array (n) -> { straturi, epoci, pierdere }
export async function antreneaza(X, y, nIn, ascunse, seed) {
  await porneste();
  const vechi = Math.random; Math.random = cuSamanta(seed);
  let m = null, tx = null, ty = null, vx = null, vy = null, best = null;
  try {
    const n = y.length, nv = Math.max(1, Math.floor(n * HIPER.validare)), nt = n - nv;
    let rata = 0; for (let k = 0; k < nt; k++) rata += y[k]; rata /= Math.max(1, nt);
    m = construieste(nIn, ascunse, rata);
    tx = tf.tensor2d(X.subarray(0, nt * nIn), [nt, nIn]); ty = tf.tensor2d(y.subarray(0, nt), [nt, 1]);
    vx = tf.tensor2d(X.subarray(nt * nIn, n * nIn), [nv, nIn]); vy = tf.tensor2d(y.subarray(nt, n), [nv, 1]);
    let cel = Infinity, rabdare = 0, epoci = 0;
    for (let ep = 0; ep < HIPER.epoci; ep++) {
      await m.fit(tx, ty, { batchSize: HIPER.lot, epochs: 1, shuffle: true, verbose: 0 });
      const v = tf.tidy(() => tf.metrics.binaryCrossentropy(vy, m.predict(vx)).mean().dataSync()[0]);
      if (v < cel - 1e-5) { cel = v; rabdare = 0; epoci = ep + 1; if (best) best.forEach((g) => g.dispose()); best = m.getWeights().map((g) => g.clone()); }
      else if (++rabdare >= HIPER.rabdare) break;
    }
    if (best) m.setWeights(best);
    return { straturi: exporta(m), epoci, pierdere: cel };
  } finally {
    Math.random = vechi;
    for (const t of [tx, ty, vx, vy]) if (t) t.dispose();
    if (best) best.forEach((g) => g.dispose());
    if (m) { if (m.optimizer) m.optimizer.dispose(); m.dispose(); }
  }
}
