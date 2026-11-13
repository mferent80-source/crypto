// v101.178 (I-875, Radar v100.339, auditul din 13.11.2026): jurnalul notei TradingView CU BARA ÎN CURS. Măsurătoarea din 13.11 a notei
// (docs/cercetare/2026-11-13-tablou-acuratete.md, M1) e pe motorul reprodus și pe bara închisă; pagina arată însă nota scannerului cu bara în
// curs, care se mișcă repede. Aici colectorul o notează o dată pe bară de 4 ore, la mijlocul barei, pentru monedele boților activi, cu prețul
// de atunci; după 4 bare (16 ore pentru nota de 4h, 4 zile pentru cea de 1 zi) pune lângă ea prețul de atunci. Doar citește scannerul public
// TradingView; nu alertează, nu intră în niciun verdict. Regula de judecată: aceeași ca în M1 (nota > 0,1 = sus, < −0,1 = jos; nimerit =
// prețul a mers în direcția aceea), cu dovada pe zile - se judecă abia cu cel puțin 30 de zile de note.
// Revizia independentă (14.11): cel mult o cerere la un sfert de oră (înainte, scannerul care răspundea fără nimic de notat sau care pica era
// cerut la fiecare tură); nota a cărei monedă nu mai e de găsit expiră la 2× orizontul ei (înainte rămânea „de judecat” la nesfârșit).
import * as TV from "../../functions/_shared/tv-note.js";

const ORA = 3600000, BARA = 4 * ORA, MAX = 4000;
export const PAUZA_MS = 15 * 60000;
export const ORIZONT_MS = { "4h": 16 * ORA, "1D": 4 * 24 * ORA };
// felia de 4 ore (UTC) și dacă s-a trecut de mijlocul ei
export function felia(acum) { return Math.floor(acum / BARA); }
export function eVremea(stare, acum) { return acum - felia(acum) * BARA >= BARA / 2 && !(stare && stare.felia === felia(acum)); }
const nr = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const CAMP = { "4h": ["tv4h", "d4", "x4"], "1D": ["tvZ", "dZ", "xZ"] };
// nota are direcție de judecat, i-a venit sorocul și n-a fost nici judecată, nici lăsată să expire
function scadent(e, tf, acum) { const c = CAMP[tf]; return !!e && e[c[1]] == null && !e[c[2]] && nr(e[c[0]]) !== null && acum - e.t >= ORIZONT_MS[tf]; }

// d = { acum, simboluri: ["HYPE_USDT_PERP", …], stare: { felia, incercat, jurnal: [...] }, cere(corp) ⇒ răspunsul scannerului (JSON) }
// întoarce { stare: { felia, incercat, jurnal }, notate, judecate, expirate, cerut, eroare }; nu aruncă
export async function turaNotaTv(d) {
  const acum = d.acum || Date.now(), st = d.stare && typeof d.stare === "object" ? d.stare : {}, j = Array.isArray(st.jurnal) ? st.jurnal.slice() : [];
  const out = { stare: { felia: st.felia == null ? null : st.felia, incercat: nr(st.incercat), jurnal: j }, notate: 0, judecate: 0, expirate: 0, cerut: false, eroare: null };
  const simb = [...new Set((Array.isArray(d.simboluri) ? d.simboluri : []).filter(Boolean))];
  // nota nejudecată la timp (colectorul oprit, moneda scoasă din scanner) nu se mai judecă: după 2× orizontul n-ar mai măsura „după 4 bare”
  for (const e of j) for (const tf of ["4h", "1D"]) if (scadent(e, tf, acum) && acum - e.t >= 2 * ORIZONT_MS[tf]) { e[CAMP[tf][2]] = 1; out.expirate++; }
  const vremea = eVremea(st, acum), deJud = j.filter((e) => scadent(e, "4h", acum) || scadent(e, "1D", acum));
  if ((!vremea || !simb.length) && !deJud.length) return out;
  if (out.stare.incercat !== null && acum >= out.stare.incercat && acum - out.stare.incercat < PAUZA_MS) return out;   // cel mult o cerere la un sfert de oră
  // o singură cerere: monedele de notat acum + cele cu note scadente (pentru prețul de acum)
  const cer = [...new Set((vremea ? simb : []).concat(deJud.map((e) => e.s)))];
  const tinte = cer.map((s) => ({ cheie: s, tickere: TV.tvLantPionex(s) })).filter((t) => t.tickere.length);
  if (!tinte.length) { if (vremea) out.stare.felia = felia(acum); return out; }
  out.stare.incercat = acum; out.cerut = true;
  let note;
  try { const rasp = []; for (const c of TV.tvCereri(tinte)) rasp.push(await d.cere(c)); note = TV.tvPotriveste(tinte, rasp); }
  catch (e) { out.eroare = String(e && e.message || e); return out; }
  const pret = (s) => { const n = note[s]; return n && n.iv && nr(n.close) !== null ? n.close / (n.scara > 0 ? n.scara : 1) : null; };
  // judecata: prețul de acum lângă notele scadente
  for (const e of deJud) { const p = pret(e.s); if (p === null) continue;
    if (scadent(e, "4h", acum)) { e.d4 = p; e.t4 = acum; out.judecate++; }
    if (scadent(e, "1D", acum)) { e.dZ = p; e.tZ = acum; out.judecate++; } }
  if (vremea) {
    for (const s of simb) { const n = note[s], p = pret(s); if (!n || !n.iv || p === null) continue;
      const a = n.iv["4h"] ? nr(n.iv["4h"].all) : null, z = n.iv["1D"] ? nr(n.iv["1D"].all) : null; if (a === null && z === null) continue;
      j.push({ t: acum, s, tv: n.tv, tv4h: a, tvZ: z, p, d4: null, dZ: null }); out.notate++; }
    out.stare.felia = felia(acum);   // și când scannerul a răspuns fără nimic de notat: bara asta nu se mai cere
  }
  out.stare.jurnal = j.slice(-MAX);
  return out;
}
// bilanțul: câte note cu direcție (|nota| > 0,1) au fost judecate și câte au nimerit; zile = zile UTC distincte cu note judecate
export function raportNotaTv(jurnal) {
  const r = { "4h": { n: 0, k: 0 }, "1D": { n: 0, k: 0 }, zile: 0 }, zile = new Set();
  for (const e of Array.isArray(jurnal) ? jurnal : []) { if (!e || !(e.p > 0)) continue;
    for (const [tf, nota, dupa] of [["4h", e.tv4h, e.d4], ["1D", e.tvZ, e.dZ]]) { if (nr(nota) === null || nr(dupa) === null || Math.abs(nota) <= 0.1) continue;
      r[tf].n++; if ((dupa - e.p) * nota > 0) r[tf].k++; zile.add(new Date(e.t).toISOString().slice(0, 10)); } }
  r.zile = zile.size; return r;
}
