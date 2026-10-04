// Datele pe acțiuni (specul L2, „Datele pe acțiuni”): rândurile pe cele 5 ținte T212 din barele ZILNICE (data/retea/zile/<ticker>.json, 2 ani,
// Yahoo prin colector) și din perechile lui închise (data/retea/trade-uri.json). Trăsăturile cu Retea.trasaturiZilnice (aceeași funcție ca pe
// pagină), etichetele DOAR din barele de după ziua t (definițiile din Probabilitati.pentruActiune), reperul 🎲 = cifra lui pentruActiune pe
// barele de până la t. Folosit de amândoi antrenorii (antreneaza.mjs, antreneaza-arbori.mjs).
import fs from "node:fs";
import path from "node:path";

export const ZI = 864e5, ORIZONT_T212 = { "stop1-t212": 24, "sare1-t212": 24, "cursa5-t212": 168, "directie-t212": 168, "rezultat-t212": 24 };
// grila nivelurilor (specul): stopul la −2…−10% (stop1, sare1); perechile țintă/stop pentru cursa pe 5 zile - aceeași grilă ca 🎲 pe idei
export const STOPURI = [-0.02, -0.03, -0.05, -0.08, -0.1], CURSE = [[0.03, -0.03], [0.05, -0.03], [0.05, -0.05], [0.08, -0.05], [0.1, -0.05]], QQQ = "QQQ_US_EQ";
const ZILE = (rad) => path.join(rad, "data", "retea", "zile");
export function tickere(rad) { try { return fs.readdirSync(ZILE(rad)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((t) => t !== QQQ).sort(); } catch { return []; } }
// barele zilnice ÎNCHISE ale unui ticker (fișierul colectorului: { la, randuri } sau lista brută), normalizate ca pe pagină (GridCalcul.bareBursa scoate ziua în curs)
export function citesteZile(rad, ticker, G) { try { const j = JSON.parse(fs.readFileSync(path.join(ZILE(rad), ticker + ".json"), "utf8")); return G.bareBursa(Array.isArray(j) ? j : (j && j.randuri) || [], Date.now()); } catch { return []; } }
export function citesteTradeuri(rad) { try { const j = JSON.parse(fs.readFileSync(path.join(rad, "data", "retea", "trade-uri.json"), "utf8")); return Array.isArray(j) ? j : (j && j.inchise) || []; } catch { return []; } }
// lipsa rămâne LIPSĂ: Number(null) === 0 ar inventa un cost / un rezultat
const nr = (v) => { if (v === null || v === undefined || v === "" || typeof v === "boolean") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const bun = (t) => !!t && nr(t.pornit) !== null && nr(t.inchis) !== null && nr(t.cost) > 0 && nr(t.rezultat) !== null;
const pePlus = (t) => t.rezultat - 0.003 * t.cost > 0;   // netul după comisioane și conversie (0,3% din valoarea cumpărată, ca la urmărirea revenirilor)
// rata lui de până la `pana` (perechile închise înainte): globală și pe ticker trasă spre medie cu k = 10 (specul rețelei) - aceeași regulă ca Retea.rataPe
export function rataPe(trades, ticker, pana) {
  const l = (Array.isArray(trades) ? trades : []).filter((t) => bun(t) && t.inchis <= pana), n = l.length, glob = n ? l.filter(pePlus).length / n : 0.5;
  const pe = l.filter((t) => t.ticker === ticker), plus = pe.filter(pePlus).length;
  return { glob, rata: (plus + 10 * glob) / (pe.length + 10), nPe: pe.length };
}
// eticheta unui rând la bara i din barele de după (definițiile lui pentruActiune): stop1 = deschide peste nivel și minimul îl atinge; sare1 = deschide
// sub nivel; cursa5 = care din țintă/stop e atinsă întâi în 5 zile (ținta pe maxime, stopul pe minime; în aceeași zi stopul are întâietate - prudent);
// directie = închiderea de peste 5 zile strict mai mare. null când nu sunt destule bare după
export function eticheta(tinta, b, i, e) {
  const c = b[i] && b[i].c; if (!(c > 0)) return null;
  if (tinta === "stop1-t212" || tinta === "sare1-t212") { const n1 = b[i + 1]; if (!n1) return null; const niv = c * (1 + e.relS); return tinta === "stop1-t212" ? (n1.o > niv && n1.l <= niv ? 1 : 0) : (n1.o <= niv ? 1 : 0); }
  if (tinta === "cursa5-t212") { if (i + 5 >= b.length) return null; const T = c * (1 + e.relT), S = c * (1 + e.relS); for (let k = 1; k <= 5; k++) { if (b[i + k].l <= S) return 0; if (b[i + k].h >= T) return 1; } return 0; }
  if (tinta === "directie-t212") { if (i + 5 >= b.length) return null; return b[i + 5].c > c ? 1 : 0; }
  return null;
}
// rândurile unei ținte pe un ticker: o mostră pe zi de bursă de la ziua 250, nivelul ales din grilă (același la fiecare rulare, din ticker și i);
// memo = { stări 🎲 pe index (comun cu reperul), rata: rata lui pe index }
export function randuriActiune(tinta, tk, b, qqq, trades, M, memo) {
  const out = [], R = M.R, H = ORIZONT_T212[tinta]; if (!H) return out;
  const zile = H === 168 ? 5 : 1; let sem = 7; for (const ch of tk) sem = (sem * 31 + ch.charCodeAt(0)) >>> 0;
  memo = memo || {}; memo.rata = memo.rata || {};
  for (let i = 250; i + zile < b.length; i++) {
    const rp = memo.rata[i] || (memo.rata[i] = rataPe(trades, tk, b[i].t + ZI));
    const f = R.trasaturiZilnice(b, i, qqq, rp.rata); if (!f) continue;
    const k = (sem + i) >>> 0; let e;
    if (tinta === "stop1-t212" || tinta === "sare1-t212") e = { relS: STOPURI[k % STOPURI.length] };
    else if (tinta === "cursa5-t212") { const [relT, relS] = CURSE[k % CURSE.length]; e = { relT, relS }; }
    else if (tinta === "directie-t212") e = {};
    else return out;
    const y = eticheta(tinta, b, i, e); if (y === null) continue;
    const x = R.intrareActiune(tinta, f, e); if (!x) continue;
    out.push({ t: f.t, s: tk, i, e, y, x, tEt: b[i + zile].t + ZI });
  }
  return out;
}
// reperul 🎲 al unui rând = exact cifra paginii (Probabilitati.pentruActiune) pe barele de până la t; direcția: frecvența urcării pe 5 zile în starea de atunci
export function reperActiune(tinta, b, r, M, memo) {
  const P = M.P, v = b.slice(0, r.i + 1), c = b[r.i].c; memo = memo || {};
  if (tinta === "directie-t212") { const st = P.stareActiuneLa(b, r.i), q = P.frecventaActiune(v, 5, (bb, k, h) => (bb[k + h].c > bb[k].c ? "da" : "nu"), "da", st, memo); return q && Number.isFinite(q.p) ? q.p : null; }
  const pa = P.pentruActiune(v, { pret: c, stop: c * (1 + r.e.relS), tinta: r.e.relT ? c * (1 + r.e.relT) : null, acum: b[r.i].t + ZI, memo });
  if (!pa) return null;
  const q = tinta === "stop1-t212" ? pa.stop1 : tinta === "sare1-t212" ? pa.sare1 : pa.cursa5 && pa.cursa5.tinta;
  return q && Number.isFinite(q.p) ? q.p : null;
}
// „un trade ca ăsta iese pe plus”: un rând pe pereche închisă, trăsăturile la ultima zi ÎNCHISĂ dinaintea cumpărării, y = rezultat − 0,3% din cost > 0,
// tEt = vânzarea (rezultatul se știe abia atunci); r1 = rata lui globală de până atunci, r2 = rata pe ticker trasă spre medie (reperele)
export function randuriTradeuri(trades, zileDe, qqq, M) {
  const toate = (Array.isArray(trades) ? trades : []).filter(bun).sort((a, b) => a.pornit - b.pornit), out = [];
  for (const t of toate) {
    const b = zileDe(t.ticker); if (!b) continue;
    const i = M.R.indexZi(b, t.pornit); if (i < 250) continue;
    const rp = rataPe(toate, t.ticker, t.pornit), f = M.R.trasaturiZilnice(b, i, qqq, rp.rata); if (!f) continue;
    const x = M.R.intrareActiune("rezultat-t212", f, { cost: t.cost, glob: rp.glob, nPe: rp.nPe }); if (!x) continue;
    out.push({ t: t.pornit, s: t.ticker, y: pePlus(t) ? 1 : 0, x, tEt: t.inchis, r1: rp.glob, r2: rp.rata });
  }
  return out;
}
