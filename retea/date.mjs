// Datele rețelei (specul, „Trăsăturile” + „Antrenarea”): rândurile pe țintă din barele de 1 h (400 de zile, data/retea/ore + 185 de zile,
// data/istoric-1h) și din boții închiși (data/retea/boti.json). Trăsăturile cu Retea.trasaturiBare (aceeași funcție ca la „acum”),
// etichetele DOAR din barele de după t (Probabilitati.atinge / cursa / stareLa), reperul 🎲 cu Probabilitati.frecventa pe barele de
// până la t. Modulele paginii se încarcă aici, din codul proiectului (ca în colector).
import fs from "node:fs";
import path from "node:path";

export const ORA = 3600000, PAS = 4;
// distanțele pe orizont (specul: ±1, 2, 3, 5, 8, 12% pentru 24 h și 72 h, ±10–40% pentru lichidare) și perechile ținta/stop (long și short)
const MARGINI = [-0.12, -0.08, -0.05, -0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12];
export const GRILA = { 24: MARGINI, 72: MARGINI, 168: [-0.4, -0.3, -0.2, -0.15, -0.1, 0.1, 0.15, 0.2, 0.3, 0.4] };
export const CURSA = [[0.02, -0.02], [0.03, -0.03], [0.05, -0.03], [0.05, -0.05], [0.08, -0.05], [-0.02, 0.02], [-0.03, 0.03], [-0.05, 0.03], [-0.05, 0.05], [-0.08, 0.05]];
export const ORIZONT = { "atinge-24": 24, "atinge-72": 72, "atinge-168": 168, cursa: 168, liniste: 48, directie: 24 };

// modulele paginii (aceleași fișiere ca în browser): TextRo în globalThis, apoi GridCalcul, ActiuniSemnale, Probabilitati, Retea
export function incarcaModulele(radCod) {
  const src = (f) => fs.readFileSync(path.join(radCod, "public", "lib", f), "utf8");
  if (!globalThis.TextRo) globalThis.TextRo = new Function(src("text-ro.js") + "; return TextRo;")();
  const G = new Function(src("grid-calcul.js") + "; return GridCalcul;")();
  const AS = new Function("GridCalcul", src("actiuni-semnale.js") + "; return ActiuniSemnale;")(G);
  const P = new Function("GridCalcul", "ActiuniSemnale", src("probabilitati.js") + "; return Probabilitati;")(G, AS);
  const R = new Function("Probabilitati", src("retea.js") + "; return Retea;")(P);
  return { G, P, R };
}
const DIRS = (rad) => [path.join(rad, "data", "retea", "ore"), path.join(rad, "data", "istoric-1h")];
export function simboluri(rad) {
  const s = new Set();
  for (const d of DIRS(rad)) { try { for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) s.add(f.slice(0, -5)); } catch {} }
  return [...s].sort();
}
// barele unei monede: depozitul de 400 de zile unit cu cel de 185 (pe `time`, fără dubluri) -> GridCalcul.bare (ultima, în curs, scoasă)
export function citesteBare(rad, simbol, G) {
  const h = new Map();
  for (const d of DIRS(rad)) { try { for (const r of JSON.parse(fs.readFileSync(path.join(d, simbol + ".json"), "utf8"))) if (r && Number.isFinite(Number(r.time))) h.set(Number(r.time), r); } catch {} }
  return G.bare([...h.values()]);
}
// rândurile unei ținte pe o monedă: la fiecare 4 h, de la bara 720; o combinație (distanța / perechea / orizontul liniștii) pe rând,
// aceeași la fiecare rulare (din numele monedei și din i). memo = stările 🎲 pe index (comun cu reperRand și cu trăsăturile).
export function randuriMoneda(tinta, s, b, btc, M, memo) {
  const out = [], H = ORIZONT[tinta], P = M.P, R = M.R, st = (i) => (i in memo ? memo[i] : (memo[i] = P.stareLa(b, i)));
  let sem = 7; for (const ch of s) sem = (sem * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = 720; i + H < b.length; i += PAS) {
    if (b[i + H].t - b[i].t !== H * ORA) continue;   // fereastra cu gaură nu se ia (ca la 🎲)
    const f = R.trasaturiBare(b, i, btc, st); if (!f) continue;
    const k = (sem + i / PAS) >>> 0; let e, y, h = H;
    if (tinta.startsWith("atinge-")) { const g = GRILA[H], rel = g[k % g.length]; e = { rel, H }; y = P.atinge(rel)(b, i, H) === "da" ? 1 : 0; }
    else if (tinta === "cursa") { const [relT, relS] = CURSA[k % CURSA.length]; e = { relT, relS }; y = P.cursa(relT, relS)(b, i, H) === "tinta" ? 1 : 0; }
    else if (tinta === "liniste") { if (!f.stare || f.stare.indexOf("liniste") !== 0) continue; h = k % 2 ? 48 : 24; const s2 = st(i + h); if (s2 === null) continue; e = { H: h }; y = s2.indexOf("liniste") === 0 ? 1 : 0; }
    else if (tinta === "directie") { e = {}; y = b[i + 24].c > b[i].c ? 1 : 0; }
    else return out;
    const x = R.intrare(tinta, f, e); if (!x) continue;
    out.push({ t: f.t, s, i, e, y, x, tEt: f.t + h * ORA });
  }
  return out;
}
// reperul 🎲 al unui rând: frecvența din trecut la momentul lui (doar barele de până la t), exact ca Probabilitati.pentruBot
export function reperRand(tinta, b, r, M, memo) {
  const P = M.P, v = b.slice(0, r.i + 1), st = r.i in memo ? memo[r.i] : (memo[r.i] = P.stareLa(b, r.i));
  let q = null;
  if (tinta.startsWith("atinge-")) q = P.frecventa(v, ORIZONT[tinta], P.atinge(r.e.rel), "da", st, { memo });
  else if (tinta === "cursa") q = P.frecventa(v, 168, P.cursa(r.e.relT, r.e.relS), "tinta", st, { memo });
  else if (tinta === "liniste") q = P.frecventa(v, r.e.H, (bb, k, h, sf) => { const s2 = sf(k + h); return s2 === null ? null : s2.indexOf("liniste") === 0 ? "da" : "nu"; }, "da", st, { memo, doarConditionat: true });
  else if (tinta === "directie") q = P.frecventa(v, 24, (bb, k, h) => (bb[k + h].c > bb[k].c ? "da" : "nu"), "da", st, { memo });
  return q && Number.isFinite(q.p) ? q.p : null;
}
// „rezultatul tău”: un rând pe bot închis (la pornire), y = net > 0, tEt = închiderea (rezultatul se știe abia atunci);
// r1 = rata ta de până atunci, r2 = rata pe monedă trasă spre medie (reperele; verificarea îl ia pe cel mai greu)
export function randuriBoti(boti, bareDe, btc, M) {
  // revizia finală (I6): rata ta se socotește pe TOȚI boții închiși (și pe monedele fără bare), ca pe fișă; doar rândurile cer bare
  const toti = (Array.isArray(boti) ? boti : []).filter((t) => t && Number.isFinite(t.pornit) && Number.isFinite(t.inchis) && Number.isFinite(t.net)).sort((a, b) => a.pornit - b.pornit), out = [];
  for (const t of toti) {
    const b = t.simbol ? bareDe(t.simbol) : null; if (!b) continue;
    const f = M.R.trasaturiBot(t, b, btc, toti); if (!f) continue;
    out.push({ t: t.pornit, s: t.moneda, y: t.net > 0 ? 1 : 0, x: f.x, tEt: t.inchis, r1: f.glob, r2: f.rata });
  }
  return out;
}
