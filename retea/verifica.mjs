// Verificarea (specul, „Verificarea (walk-forward) și eticheta «dovedită»”): lunile de test; antrenarea doar pe rândurile cu eticheta
// știută la începutul lunii (tEt <= începutul ei = pauză cât orizontul); normalizarea doar din antrenare; Brier / log-loss pe ACELEAȘI
// cazuri pentru rețea, reper și formula simplă; IC 95% prin bootstrap pe două trepte (lunile, apoi monedele din ele - săptămânile în care
// toată piața merge la fel nu mai trec drept cazuri separate); blocurile independente. Fără TensorFlow: antrenorul și trecerea înainte
// vin din afară (o.antreneaza, o.prezice).
const ORA = 3600000, ZI = 864e5;
export function luna(t) { const d = new Date(t); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"); }
export function inceputLuna(l) { const [a, m] = l.split("-").map(Number); return Date.UTC(a, m - 1, 1); }
export function lunaUrmatoare(l) { const [a, m] = l.split("-").map(Number); return luna(Date.UTC(a, m, 1)); }
export function cuSamanta(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// lunile întregi încheiate (cu toate etichetele știute până acum), după ce antrenarea are destul: o.minZile de istorie (barele) sau
// o.minCazuri rânduri cu eticheta știută la începutul lunii (boții); o.asteaptaZile după sfârșitul lunii (boții pornit atunci încă deschiși)
export function luniDeTest(randuri, o) {
  if (!randuri.length) return [];
  let t0 = Infinity, t1 = -Infinity; for (const r of randuri) { if (r.t < t0) t0 = r.t; if (r.t > t1) t1 = r.t; }
  const out = [], acum = o.acum || Date.now(), astepta = (o.asteaptaZile || 0) * ZI;
  for (let l = luna(t0); inceputLuna(l) <= t1; l = lunaUrmatoare(l)) {
    const start = inceputLuna(l), fin = inceputLuna(lunaUrmatoare(l));
    if (fin + astepta > acum) break;
    if (o.minZile && start < t0 + o.minZile * ZI) continue;
    if (o.minCazuri) { let k = 0; for (const r of randuri) if (r.tEt <= start) k++; if (k < o.minCazuri) continue; }
    let are = false, toate = true; for (const r of randuri) if (r.t >= start && r.t < fin) { are = true; if (r.tEt > acum) { toate = false; break; } }
    if (are && toate) out.push(l);
  }
  return out;
}
export function impartire(randuri, l) {
  const start = inceputLuna(l), fin = inceputLuna(lunaUrmatoare(l));
  return { antrenare: randuri.filter((r) => r.tEt <= start), test: randuri.filter((r) => r.t >= start && r.t < fin) };
}
const p7 = (v) => Number(v.toPrecision(7));
export function normalizare(rows) {
  const n = rows.length, k = rows[0].x.length, m = new Array(k).fill(0), s = new Array(k).fill(0);
  for (const r of rows) for (let j = 0; j < k; j++) m[j] += r.x[j] / n;
  for (const r of rows) for (let j = 0; j < k; j++) s[j] += (r.x[j] - m[j]) ** 2 / n;
  return { m: m.map(p7), s: s.map((v) => p7(Math.sqrt(v))) };
}
export function matrice(rows, norm) {
  const k = norm.m.length, X = new Float32Array(rows.length * k);
  rows.forEach((r, i) => { for (let j = 0; j < k; j++) X[i * k + j] = (r.x[j] - norm.m[j]) / (norm.s[j] > 0 ? norm.s[j] : 1); });
  return X;
}
// cel mult `max` rânduri, alese cu sămânță, apoi puse înapoi în ordinea timpului (ultimii 20% rămân validarea opririi timpurii)
export function esantion(rows, max, seed) {
  const l = rows.slice().sort((a, b) => a.t - b.t); if (l.length <= max) return l;
  const r = cuSamanta(seed), idx = l.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const q = idx[i]; idx[i] = idx[j]; idx[j] = q; }
  return idx.slice(0, max).sort((a, b) => a - b).map((i) => l[i]);
}
export async function antreneazaAnsamblu(rows, o, cuLogistic) {
  const tr = esantion(rows, o.maxRanduri || 40000, 11), norm = normalizare(tr), nIn = norm.m.length, X = matrice(tr, norm), y = Float32Array.from(tr, (r) => r.y);
  const ansamblu = []; for (let k = 0; k < (o.seminte || 5); k++) ansamblu.push((await o.antreneaza(X, y, nIn, o.ascunse || [16, 8], 1000 + k)).straturi);
  const logist = cuLogistic ? (await o.antreneaza(X, y, nIn, [], 999)).straturi : null;
  return { norm, ansamblu, logist, n: tr.length };
}
// o lună: antrenarea pe ce se știa la începutul ei, apoi rețeaua și formula simplă pe rândurile lunii (aceleași cazuri)
export async function judecaLuna(randuri, l, o) {
  const { antrenare, test } = impartire(randuri, l);
  if (antrenare.length < 50 || !test.length) return null;
  const a = await antreneazaAnsamblu(antrenare, o, true), mNN = { versiune: o.versiune, norm: a.norm, ansamblu: a.ansamblu }, mLog = { versiune: o.versiune, norm: a.norm, ansamblu: [a.logist] };
  return test.map((r) => ({ t: r.t, s: r.s, y: r.y, p: o.prezice(mNN, r.x), pLog: o.prezice(mLog, r.x), i: r.i, e: r.e, r1: r.r1 ?? null, r2: r.r2 ?? null }));
}
// modelul de azi: pe tot ce are eticheta știută
export async function modelFinal(randuri, o) { const a = await antreneazaAnsamblu(randuri, o, false); return { norm: a.norm, ansamblu: a.ansamblu, n: a.n }; }
const PR = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p));
export function brier(l, k) { if (!l.length) return null; let s = 0; for (const x of l) s += (x[k] - x.y) ** 2; return s / l.length; }
export function logloss(l, k) { if (!l.length) return null; let s = 0; for (const x of l) { const p = PR(x[k]); s -= x.y ? Math.log(p) : Math.log(1 - p); } return s / l.length; }
export function bss(l, k, kRef) { const a = brier(l, k), b = brier(l, kRef); return a !== null && b > 0 ? 1 - a / b : null; }
export function blocuri(l, oreBloc) { const s = new Set(); for (const x of l) s.add(Math.floor(x.t / (oreBloc * ORA))); return s.size; }
// IC 95% pentru 1 − Brier(k) / Brier(kRef): lunile cu înlocuire, apoi monedele lunii alese cu înlocuire (sumele de erori pe grupă)
export function bootstrap2(l, k, kRef, n = 1000, seed = 7) {
  const luni = new Map();
  for (const x of l) { const lu = luna(x.t); if (!luni.has(lu)) luni.set(lu, new Map()); const m = luni.get(lu); if (!m.has(x.s)) m.set(x.s, [0, 0]); const g = m.get(x.s); g[0] += (x[k] - x.y) ** 2; g[1] += (x[kRef] - x.y) ** 2; }
  const L = [...luni.values()].map((m) => [...m.values()]), r = cuSamanta(seed), v = [];
  for (let q = 0; q < n; q++) {
    let a = 0, b = 0;
    for (let z = 0; z < L.length; z++) { const gr = L[Math.floor(r() * L.length)]; for (let w = 0; w < gr.length; w++) { const g = gr[Math.floor(r() * gr.length)]; a += g[0]; b += g[1]; } }
    v.push(b > 0 ? 1 - a / b : 0);
  }
  v.sort((x, y) => x - y);
  return [v[Math.floor(0.025 * n)], v[Math.ceil(0.975 * n) - 1]];
}
const r4 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);
// verificarea pe rândurile de test (p = rețeaua, pLog = formula simplă, r1 / r2 = reperele); reperul e cel mai greu dintre ele
export function verificare(l, o) {
  const ok = l.filter((x) => Number.isFinite(x.p) && Number.isFinite(x.pLog) && Number.isFinite(x.r1));
  let kRef = "r1", rep = o.numeReper[0];
  if (o.numeReper[1] && ok.length && ok.every((x) => Number.isFinite(x.r2)) && brier(ok, "r2") < brier(ok, "r1")) { kRef = "r2"; rep = o.numeReper[1]; }
  const ult = new Set([...new Set(ok.map((x) => luna(x.t)))].sort().slice(-3)), l3 = ok.filter((x) => ult.has(luna(x.t)));
  return { n: ok.length, nIndep: blocuri(ok, o.oreBloc), oreBloc: o.oreBloc, luni: o.luni, luniGata: o.luniGata, reper: rep,
    brier: r4(brier(ok, "p")), brierReper: r4(brier(ok, kRef)), brierLog: r4(brier(ok, "pLog")),
    logloss: r4(logloss(ok, "p")), loglossReper: r4(logloss(ok, kRef)), loglossLog: r4(logloss(ok, "pLog")),
    bss: r4(bss(ok, "p", kRef)), ic: ok.length ? bootstrap2(ok, "p", kRef).map(r4) : null,
    bssLog: r4(bss(ok, "p", "pLog")), icLog: ok.length ? bootstrap2(ok, "p", "pLog").map(r4) : null,
    bss3: l3.length ? r4(bss(l3, "p", kRef)) : null };
}
