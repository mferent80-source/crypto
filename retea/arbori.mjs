// Arborii (gradient boosting pe histograme, v100.93, specul docs/superpowers/specs/2026-10-04-gradient-boosting-design.md): JS curat, fără
// dependențe. Pierderea log-loss (binară), pași Newton pe frunze, hiperparametrii FIXAȚI aici (nu se caută pe lunile judecate). Trăsăturile
// sunt ale rețelei (Retea.intrare / trasaturiBot), NEnormalizate - arborii n-au nevoie.
// Model: { baza (logit-ul ratei de bază), pas, semi: [[arbore, …], …] } - un arbore = listă de noduri [k, prag, stânga, dreapta] sau
// [-1, valoare]; x[k] <= prag ⇒ stânga. Inferența din pagină (public/lib/arbori.js) face EXACT aceeași aritmetică (proba le compară).
import { cuSamanta } from "./verifica.mjs";

export const HIPER_ARBORI = Object.freeze({ cutii: 64, adancime: 3, runde: 150, pas: 0.08, minFrunza: 40, l2: 1, subRanduri: 0.8, subColoane: 0.8, seminte: 3, rabdare: 10, validare: 0.2 });
const sig = (z) => 1 / (1 + Math.exp(-z)), clip = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p));

// marginile cutiilor pe cuantile (≤ cutii − 1 praguri distincte pe trăsătură), DOAR din rândurile de antrenare. Pragul e MIJLOCUL dintre
// valoarea cuantilei și următoarea valoare distinctă - niciun rând de antrenare nu stă chiar pe prag (altfel rotunjirea la export îl muta
// de partea cealaltă; proba a prins-o)
export function praguriDin(X, n, k, cutii) {
  const out = [];
  for (let j = 0; j < k; j++) {
    const v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = X[i * k + j]; v.sort();
    const p = [];
    for (let c = 1; c < cutii; c++) {
      const i0 = Math.min(n - 1, Math.floor((c * n) / cutii)), q = v[i0]; let i1 = i0 + 1; while (i1 < n && v[i1] <= q) i1++; if (i1 >= n) break;
      const prag = (q + v[i1]) / 2; if (!p.length || prag > p[p.length - 1]) p.push(prag);
    }
    out.push(p);
  }
  return out;
}
// cutia unei valori: prima margine ≥ v (0 … praguri.length)
export function cutiaLui(praguri, v) { let lo = 0, hi = praguri.length; while (lo < hi) { const m = (lo + hi) >> 1; if (v <= praguri[m]) hi = m; else lo = m + 1; } return lo; }
// scorul unui arbore pe o intrare (aceeași plimbare ca în public/lib/arbori.js)
export function scorArbore(noduri, x) { let i = 0; for (let pas = 0; pas < 64; pas++) { const nd = noduri[i]; if (nd[0] < 0) return nd[1]; i = x[nd[0]] <= nd[1] ? nd[2] : nd[3]; } return 0; }

// un nod: histogramele G/H/N pe fiecare coloană permisă, cea mai bună tăietură (câștigul cu L2, ambele frunze ≥ minFrunza), altfel frunză Newton
function unArbore(B, g, h, idx, k, praguri, cols, o, noduri, adanc) {
  let G = 0, H = 0; for (let q = 0; q < idx.length; q++) { G += g[idx[q]]; H += h[idx[q]]; }
  const frunza = () => { noduri.push([-1, -G / (H + o.l2)]); return noduri.length - 1; };
  if (adanc >= o.adancime || idx.length < 2 * o.minFrunza) return frunza();
  let best = { castig: 0, j: -1, c: -1 };
  for (const j of cols) {
    const nc = praguri[j].length + 1; if (nc < 2) continue;
    const Gc = new Float64Array(nc), Hc = new Float64Array(nc), Nc = new Int32Array(nc);
    for (let q = 0; q < idx.length; q++) { const i = idx[q], c = B[i * k + j]; Gc[c] += g[i]; Hc[c] += h[i]; Nc[c]++; }
    let GL = 0, HL = 0, NL = 0;
    for (let c = 0; c < nc - 1; c++) {
      GL += Gc[c]; HL += Hc[c]; NL += Nc[c]; const NR = idx.length - NL;
      if (NL < o.minFrunza) continue; if (NR < o.minFrunza) break;
      const GR = G - GL, HR = H - HL, castig = 0.5 * ((GL * GL) / (HL + o.l2) + (GR * GR) / (HR + o.l2) - (G * G) / (H + o.l2));
      if (castig > best.castig) best = { castig, j, c };
    }
  }
  if (!(best.castig > 0)) return frunza();
  const st = [], dr = []; for (let q = 0; q < idx.length; q++) { const i = idx[q]; (B[i * k + best.j] <= best.c ? st : dr).push(i); }
  const nod = noduri.length; noduri.push([best.j, praguri[best.j][best.c], 0, 0]);
  noduri[nod][2] = unArbore(B, g, h, st, k, praguri, cols, o, noduri, adanc + 1);
  noduri[nod][3] = unArbore(B, g, h, dr, k, praguri, cols, o, noduri, adanc + 1);
  return nod;
}
// X nenormalizat (n·nIn, Float32Array), y 0/1, rândurile în ordinea timpului; ultimii `validare` nu intră în antrenare - țin oprirea timpurie.
// -> { baza, pas, arbori (doar rundele până la cel mai bun scor de validare), runde, lossVal }
export function antreneazaArbori(X, y, nIn, o) {
  o = { ...HIPER_ARBORI, ...(o || {}) };
  const n = y.length, k = nIn, nTr = Math.min(n, Math.max(2 * o.minFrunza, Math.floor(n * (1 - o.validare)))), r = cuSamanta(o.seed || 1);
  let rata = 0; for (let i = 0; i < nTr; i++) rata += y[i]; rata = Math.min(0.99, Math.max(0.01, rata / Math.max(1, nTr)));
  const baza = Math.log(rata / (1 - rata)), praguri = praguriDin(X, nTr, k, o.cutii), B = new Uint8Array(n * k);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) B[i * k + j] = cutiaLui(praguri[j], X[i * k + j]);
  const F = new Float64Array(n).fill(baza), g = new Float64Array(nTr), h = new Float64Array(nTr), arbori = [], xr = new Array(k);
  const lossVal = () => { if (n <= nTr) return 0; let s = 0; for (let i = nTr; i < n; i++) { const p = clip(sig(F[i])); s -= y[i] ? Math.log(p) : Math.log(1 - p); } return s / (n - nTr); };
  let best = { loss: lossVal(), runde: 0 }, fara = 0;
  for (let rd = 0; rd < o.runde; rd++) {
    for (let i = 0; i < nTr; i++) { const p = sig(F[i]); g[i] = p - y[i]; h[i] = Math.max(1e-6, p * (1 - p)); }
    let idx = []; for (let i = 0; i < nTr; i++) if (r() < o.subRanduri) idx.push(i); if (idx.length < 2 * o.minFrunza) idx = Array.from({ length: nTr }, (_, i) => i);
    const cols = []; for (let j = 0; j < k; j++) if (r() < o.subColoane) cols.push(j); if (!cols.length) cols.push(Math.floor(r() * k));
    const noduri = []; unArbore(B, g, h, idx, k, praguri, cols, o, noduri, 0); arbori.push(noduri);
    for (let i = 0; i < n; i++) { for (let j = 0; j < k; j++) xr[j] = X[i * k + j]; F[i] += o.pas * scorArbore(noduri, xr); }
    if (n > nTr) { const L = lossVal(); if (L < best.loss - 1e-6) { best = { loss: L, runde: arbori.length }; fara = 0; } else if (++fara >= o.rabdare) break; }
    else best = { loss: 0, runde: arbori.length };
  }
  return { baza, pas: o.pas, arbori: arbori.slice(0, best.runde), runde: best.runde, lossVal: best.loss };
}
// predicția: media sigmoidelor pe semințe; null la model sau intrare greșită (NaN, listă scurtă)
export function preziceArbori(model, x) {
  if (!model || !Array.isArray(model.semi) || !model.semi.length || !Array.isArray(x) || !Number.isFinite(model.baza) || !Number.isFinite(model.pas)) return null;
  for (const v of x) if (typeof v !== "number" || !Number.isFinite(v)) return null;
  let s = 0; for (const semi of model.semi) { let F = model.baza; for (const a of semi) F += model.pas * scorArbore(a, x); s += sig(F); }
  const p = s / model.semi.length; return Number.isFinite(p) ? p : null;
}
const r6 = (v) => Number(Number(v).toPrecision(6));
// modelul de urcat: pragurile și frunzele la 6 cifre semnificative (la 4, un rând lipit de prag sărea între frunze - proba a prins-o);
// același model rotunjit se folosește și la verificare, și în pagină - ce se verifică e ce se servește
export function exportaArbori(model) { return { baza: r6(model.baza), pas: model.pas, semi: model.semi.map((semi) => semi.map((a) => a.map((nd) => (nd[0] < 0 ? [-1, r6(nd[1])] : [nd[0], r6(nd[1]), nd[2], nd[3]])))) }; }
