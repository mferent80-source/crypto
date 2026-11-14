// v101.178 (I-875, Radar v100.339, auditul din 13.11.2026): jurnalul notei TradingView CU BARA ÎN CURS. Măsurătoarea din 13.11 a notei
// (docs/cercetare/2026-11-13-tablou-acuratete.md, M1) e pe motorul reprodus și pe bara închisă; pagina arată însă nota scannerului cu bara în
// curs, care se mișcă repede. Aici colectorul o notează o dată pe bară de 4 ore, la mijlocul barei, pentru monedele boților activi, cu prețul
// de atunci; după 4 bare (16 ore pentru nota de 4h, 4 zile pentru cea de 1 zi) pune lângă ea prețul de atunci. Doar citește scannerul public
// TradingView; nu alertează, nu intră în niciun verdict. Regula de judecată: aceeași ca în M1 (nota > 0,1 = sus, < −0,1 = jos; nimerit =
// prețul a mers în direcția aceea), cu dovada pe zile - se judecă abia cu cel puțin 30 de zile de note.
// Revizia independentă (14.11): cel mult o cerere la un sfert de oră (înainte, scannerul care răspundea fără nimic de notat sau care pica era
// cerut la fiecare tură); nota a cărei monedă nu mai e de găsit expiră la 2× orizontul ei (înainte rămânea „de judecat” la nesfârșit).
// v101.179 (Radar v100.340, restul I-875): lângă notă se scrie și VERDICTUL RADARULUI din aceeași clipă (calc-ul paginii pe bare închise,
// 4 ore și 1 zi, cu scorul), iar bilanțul îl judecă la fel ca nota. Verdictul vine printr-o funcție dată de colector; fără ea, sau dacă ea
// cade, nota se scrie oricum.
import * as TV from "../../functions/_shared/tv-note.js";

const ORA = 3600000, BARA = 4 * ORA, MAX = 4000;
export const PAUZA_MS = 15 * 60000;
export const ORIZONT_MS = { "4h": 16 * ORA, "1D": 4 * 24 * ORA };
// felia de 4 ore (UTC) și dacă s-a trecut de mijlocul ei
export function felia(acum) { return Math.floor(acum / BARA); }
export function eVremea(stare, acum) { return acum - felia(acum) * BARA >= BARA / 2 && !(stare && stare.felia === felia(acum)); }
const nr = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const CAMP = { "4h": ["tv4h", "d4", "x4"], "1D": ["tvZ", "dZ", "xZ"] };
const RADAR = { "4h": "rv4", "1D": "rvZ" };
// nota (sau verdictul Radarului de lângă ea) are ce judeca, i-a venit sorocul și n-a fost nici judecată, nici lăsată să expire
// (revizia a doua: verdictul Radarului rămânea nejudecat când TradingView nu dăduse notă pe intervalul acela)
function scadent(e, tf, acum) { const c = CAMP[tf]; return !!e && e[c[1]] == null && !e[c[2]] && (nr(e[c[0]]) !== null || typeof e[RADAR[tf]] === "string") && acum - e.t >= ORIZONT_MS[tf]; }

// verdictul paginii din lumânările Pionex ale colectorului: { motor: incarcaMotor(…), dinPionex: IndicatoriBot.dinPionex,
//   confirma: IndicatoriBot.confirma (opțional), k4, kz, acum }
// ⇒ { v4, s4, b4, vZ, sZ, bZ } sau null fără niciunul. v = verdictul ARĂTAT de pagină (BULLISH / BEARISH / NEUTRAL): cu `confirma`, cel
// confirmat pe două bare închise, ca în Tablou (revizia a doua: se nota verdictul barei, nu cel pe care îl vede omul); b = verdictul barei
// închise; s = scorul. null pe intervalul cu sub 60 de bare închise sau cu bare rămase în urmă.
export function verdictDinLumanari(o) {
  const c = o && o.motor && o.motor.c; if (!c || typeof c.calc !== "function" || typeof c.bareInchise !== "function" || typeof o.dinPionex !== "function") return null;
  const acum = o.acum || Date.now(), PAS = { "4h": 4 * ORA, "1d": 24 * ORA };
  const unul = (rows, tf) => { if (!Array.isArray(rows) || !rows.length) return null; const j = c.bareInchise(o.dinPionex(rows), tf, acum); if (!j || j.length < 60) return null;
    if (!(acum - Number(j[j.length - 1][0]) < 2 * PAS[tf])) return null;   // bare rămase în urmă: verdictul n-ar mai fi „din aceeași clipă” cu nota
    const q = c.calc(j, "auto"); if (!(q && q.ver && nr(q.score) !== null)) return null;
    let aratat = q.ver;   // pagina confirmă doar de la 62 de bare închise în sus (tbVerdictConfirmat)
    if (typeof o.confirma === "function" && j.length >= 62) { const q1 = c.calc(j.slice(0, -1), "auto"), q2 = c.calc(j.slice(0, -2), "auto"); aratat = o.confirma(q.ver, q1 && q1.ver, q2 && q2.ver).ver; }
    return { v: aratat, b: q.ver, s: Math.round(q.score * 10) / 10 }; };
  const a = unul(o.k4, "4h"), z = unul(o.kz, "1d");
  return a || z ? { v4: a ? a.v : null, s4: a ? a.s : null, b4: a ? a.b : null, vZ: z ? z.v : null, sZ: z ? z.s : null, bZ: z ? z.b : null } : null;
}

// d = { acum, simboluri: ["ABC_USDT_PERP", …], stare: { felia, incercat, jurnal: [...] }, cere(corp) ⇒ răspunsul scannerului (JSON),
//       verdict(simbol) ⇒ { v4, s4, vZ, sZ } | null (opțional) }
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
      let rv = null; if (typeof d.verdict === "function") { try { rv = await d.verdict(s); } catch { rv = null; } }   // verdictul căzut nu oprește notarea
      j.push({ t: acum, s, tv: n.tv, tv4h: a, tvZ: z, p, d4: null, dZ: null, rv4: rv && rv.v4 ? rv.v4 : null, rs4: rv ? nr(rv.s4) : null, rvZ: rv && rv.vZ ? rv.vZ : null, rsZ: rv ? nr(rv.sZ) : null, rb4: rv && rv.b4 ? rv.b4 : null, rbZ: rv && rv.bZ ? rv.bZ : null });   /* rb = verdictul barei, lângă cel arătat */ out.notate++; }
    out.stare.felia = felia(acum);   // și când scannerul a răspuns fără nimic de notat: bara asta nu se mai cere
  }
  out.stare.jurnal = j.slice(-MAX);
  return out;
}
// bilanțul: câte note cu direcție (|nota| > 0,1) au fost judecate și câte au nimerit; zile = zile UTC distincte cu note judecate
export function raportNotaTv(jurnal) {
  const r = { "4h": { n: 0, k: 0 }, "1D": { n: 0, k: 0 }, radar4h: { n: 0, k: 0 }, radar1D: { n: 0, k: 0 }, zile: 0 }, zile = new Set(), semn = (v) => (v === "BULLISH" ? 1 : v === "BEARISH" ? -1 : 0);
  for (const e of Array.isArray(jurnal) ? jurnal : []) { if (!e || !(e.p > 0) || !(typeof e.t === "number" && e.t > 0 && e.t < 8.64e15)) continue;   /* ora stricată: intrarea se sare (new Date(…).toISOString() ar arunca) */
    for (const [tf, nota, dupa] of [["4h", e.tv4h, e.d4], ["1D", e.tvZ, e.dZ]]) { if (nr(nota) === null || nr(dupa) === null || Math.abs(nota) <= 0.1) continue;
      r[tf].n++; if ((dupa - e.p) * nota > 0) r[tf].k++; zile.add(new Date(e.t).toISOString().slice(0, 10)); }
    // verdictul Radarului din aceeași clipă, judecat cu același preț de după 4 bare (neutrul nu are direcție, nu se numără)
    for (const [cheie, v, dupa] of [["radar4h", e.rv4, e.d4], ["radar1D", e.rvZ, e.dZ]]) { const sg = semn(v); if (!sg || nr(dupa) === null) continue; r[cheie].n++; if ((dupa - e.p) * sg > 0) r[cheie].k++; } }
  r.zile = zile.size; return r;
}
