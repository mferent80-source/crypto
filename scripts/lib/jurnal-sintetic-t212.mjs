// v100.269 (ideile auditului 29.10): jurnale T212 SINTETICE pentru simularea de mărime a „Regulilor tale” (ActiuniSemnale.reguliPersonale).
// Structura e luată din proba lui de ordine (data/t212-ordine-proba.json, 25.09: 348 de trade-uri închise, doar citire):
//   câte trade-uri pe zi de bursă (median 3, coadă până la 15), orele de cumpărare (ora României), costul (median ~3.300 lei), 93% „în afara orelor”.
// Sub H0 rezultatul NU depinde de nicio grupă (oră, zi, cost); trade-urile aceleiași zile au o mișcare comună (sdZi), ca piața din ziua aceea.
// Randamentul: ~3 din 4 câștiguri mici (|z| × 2%), restul pierderi mari (|z| × 6%) ⇒ ~75% pe plus, ca la el, dar FĂRĂ avantaj (media ~0, ca
// simularea auditorului: „trade-uri fără niciun efect”); o.medie îl mută.
// o.efect(t, ctx) = un efect ADEVĂRAT adăugat randamentului (pentru puterea testului); ctx = { oraRo, ziSapt (0 = duminică) }.
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ORE = { 3: 2, 5: 1, 6: 3, 7: 1, 9: 1, 10: 1, 11: 7, 12: 5, 13: 10, 14: 13, 15: 13, 16: 45, 17: 43, 18: 64, 19: 34, 20: 32, 21: 31, 22: 35, 23: 7 };
const PE_ZI = { 1: 33, 2: 23, 3: 20, 4: 17, 5: 9, 6: 3, 7: 2, 8: 2, 9: 1, 10: 1, 14: 1, 15: 1 };
const ZI = 86400000;
function tragDin(tab, r) { const k = Object.keys(tab), tot = k.reduce((s, x) => s + tab[x], 0); let u = r() * tot; for (const x of k) { u -= tab[x]; if (u < 0) return Number(x); } return Number(k[k.length - 1]); }
export function jurnalH0(n, seed, o = {}) {
  const r = mulberry32(seed), norm = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const sdZi = o.sdZi === undefined ? 0.01 : o.sdZi, medie = o.medie || 0;
  const idio = () => (r() < 0.75 ? 0.02 : -0.06) * Math.abs(norm());
  const l = []; let zi = Date.UTC(2025, 0, 6);   // o luni
  while (l.length < n) {
    const w = new Date(zi).getUTCDay();
    if (w === 0 || w === 6) { zi += ZI; continue; }
    const k = o.peZi || tragDin(PE_ZI, r), m = sdZi * norm();
    for (let j = 0; j < k && l.length < n; j++) {
      const h = o.ora !== undefined ? o.ora : tragDin(ORE, r), t = zi + (h - 3) * 3600000 + Math.floor(r() * 60) * 60000;   // ora României ≈ UTC+3 (vara) / +2: grupa o pune biblioteca, cu Intl
      const cost = o.cost || Math.round(3344 * Math.exp(0.78 * norm()) * 100) / 100;
      const ret = medie + m + idio() + (o.efect ? o.efect(t, { oraRo: h, ziSapt: w }) : 0);
      l.push({ id: "s" + seed + "-" + l.length, ticker: "S" + (l.length % 40) + "_US_EQ", pornit: t, inchis: t + 3 * ZI, cost, rezultat: Math.round(cost * ret * 100) / 100, extCumparare: r() < 0.93 });
    }
    zi += ZI * (r() < 0.3 ? 2 : 1);   // nu cumpără în fiecare zi de bursă
  }
  return l;
}
