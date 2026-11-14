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
import { testBlocuri } from "./statistica-blocuri.mjs";

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
  const out = { stare: { felia: st.felia == null ? null : st.felia, incercat: nr(st.incercat), jurnal: j }, notate: 0, judecate: 0, expirate: 0, cerut: false, eroare: null, zileIesite: {} };   /* zileIesite: zilele tăiate acum din jurnal (v101.180) */
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
  const taiat = taieJurnalPeZile(j, MAX); out.stare.jurnal = taiat.jurnal; out.zileIesite = zileDinJurnal(taiat.scoase);   /* v101.180: pe zile întregi; zilele ieșite merg în cele ținute */
  return out;
}
// v101.180 (Radar v100.341, I-878): bilanțul pe viu și judecata unică a notei TradingView și a verdictului Radarului („N1”). Regulile sunt
// scrise în docs/cercetare/2026-11-13-tablou-acuratete.md („Jurnalul notei pe viu — regulile judecății”), înaintea primei cifre:
//  - intră notele de la N1.deLa încolo, judecate la timp (cel mult N1.tarziu după notă: 4 bare + una îngăduită);
//  - zilele se țin separat de jurnal (jurnalul se taie pe zile întregi), deci o zi odată ieșită din jurnal nu se mai schimbă;
//  - unitatea testului e blocul de 5 zile ÎNCHEIAT (urmările notelor vecine se suprapun 16 ore; pe blocuri testul își ține mărimea - simulat);
//  - judecata fiecărei serii se face o singură dată, pe primele N1.blocuri blocuri încheiate și valide, și rămâne înghețată;
//  - pragul numără toate testele cu verdict de până acum (regula din capul jurnalului): 32 până la M5, unul la M5b, două aici ⇒ 0,05 ÷ 70.
export const N1 = { deLa: Date.UTC(2026, 10, 14, 10, 45), zileArata: 30, blocuri: 36, zilePeBloc: 5, minNoteBloc: 12, prag: 0.55, alfa: 0.05 / 70, tarziu: 20 * ORA };
const SEMN_RADAR = (v) => (v === "BULLISH" ? 1 : v === "BEARISH" ? -1 : 0), SEMN_NOTA = (x) => (nr(x) !== null && Math.abs(x) > 0.1 ? Math.sign(x) : 0);
const ORA_BUNA = (e) => !!e && e.p > 0 && typeof e.t === "number" && e.t > 0 && e.t < 8.64e15;
const ziuaUtc = (t) => new Date(t).toISOString().slice(0, 10), nrZi = (z) => Math.round(Date.parse(z + "T00:00:00Z") / 86400000), ziGoala = () => ({ tv4h: { n: 0, k: 0 }, radar4h: { n: 0, k: 0 }, tv1D: { n: 0, k: 0 }, radar1D: { n: 0, k: 0 }, asteapta: false });
// zilele jurnalului: pe ziua UTC a notei și pe fiecare serie { n, k } (note cu direcție, judecate la timp; câte au nimerit);
// asteapta = ziua mai are note pe 4 ore cu direcție, nici judecate, nici expirate (deci cifrele ei se mai pot schimba)
export function zileDinJurnal(jurnal) {
  const out = {};
  for (const e of Array.isArray(jurnal) ? jurnal : []) { if (!ORA_BUNA(e) || e.t < N1.deLa) continue; const zi = ziuaUtc(e.t), z = out[zi] || (out[zi] = ziGoala());
    for (const [cheie, sg] of [["tv4h", SEMN_NOTA(e.tv4h)], ["radar4h", SEMN_RADAR(e.rv4)]]) { if (!sg) continue;
      if (nr(e.d4) === null) { if (!e.x4) z.asteapta = true; continue; }
      if (nr(e.t4) !== null && e.t4 - e.t > N1.tarziu) continue;   /* judecată târziu: n-ar mai măsura „după 4 bare” */
      z[cheie].n++; if ((e.d4 - e.p) * sg > 0) z[cheie].k++; }
    for (const [cheie, sg] of [["tv1D", SEMN_NOTA(e.tvZ)], ["radar1D", SEMN_RADAR(e.rvZ)]]) { if (!sg || nr(e.dZ) === null) continue; z[cheie].n++; if ((e.dZ - e.p) * sg > 0) z[cheie].k++; } }
  return out;
}
// zilele ținute pe disc + cele de acum din jurnal: ziua din jurnal o înlocuiește pe cea ținută; cea ieșită din jurnal rămâne cum era
export function imbinaZile(tinute, noi) { return Object.assign({}, tinute && typeof tinute === "object" && !Array.isArray(tinute) ? tinute : {}, noi && typeof noi === "object" ? noi : {}); }
// bilanțul de arătat: pe fiecare serie câte note, câte nimerite și în câte zile; zile = zilele cu note judecate pe 4 ore
export function bilantDinZile(zile) {
  const serii = {}, Z = Object.values(zile && typeof zile === "object" ? zile : {}).filter((z) => z && typeof z === "object");
  for (const cheie of ["tv4h", "radar4h", "tv1D", "radar1D"]) { let n = 0, k = 0, zl = 0; for (const z of Z) { const x = z[cheie]; if (x && x.n > 0) { n += x.n; k += x.k; zl++; } } serii[cheie] = { n, k, zile: zl }; }
  return { zile: Z.filter((z) => (z.tv4h && z.tv4h.n > 0) || (z.radar4h && z.radar4h.n > 0)).length, serii };
}
// judecata, pe serie: blocurile de 5 zile de la ziua lui N1.deLa, luate la rând până la primul NEÎNCHEIAT (ultima lui zi nu e încă în urma
// celei mai noi zile cu note, sau are note în așteptare); dintre cele încheiate, valide sunt cele cu destule note; se judecă primele
// N1.blocuri valide: Student într-o parte pe (partea nimerită a blocului − 0,5). DOVEDIT = p ≤ N1.alfa și media blocurilor ≥ N1.prag.
export function judecataDinZile(zile) {
  const Z = zile && typeof zile === "object" ? zile : {}, chei = Object.keys(Z).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(), z0 = nrZi(ziuaUtc(N1.deLa)), maxZi = chei.length ? nrZi(chei[chei.length - 1]) : -Infinity, out = {};
  const zi = (nrul) => Z[new Date(nrul * 86400000).toISOString().slice(0, 10)];
  for (const cheie of ["tv4h", "radar4h"]) { const v = []; let deLa = null, panaLa = null;
    for (let bl = 0; v.length < N1.blocuri; bl++) { const prima = z0 + bl * N1.zilePeBloc, ultima = prima + N1.zilePeBloc - 1; if (!(ultima < maxZi)) break;
      let n = 0, k = 0, asteapta = false; for (let d = prima; d <= ultima; d++) { const x = zi(d); if (!x) continue; if (x.asteapta) asteapta = true; if (x[cheie]) { n += x[cheie].n; k += x[cheie].k; } }
      if (asteapta) break; if (n < N1.minNoteBloc) continue;
      v.push(k / n - 0.5); if (deLa === null) deLa = new Date(prima * 86400000).toISOString().slice(0, 10); panaLa = new Date(ultima * 86400000).toISOString().slice(0, 10); }
    if (v.length < N1.blocuri) { out[cheie] = { gata: false, blocuri: v.length, trebuie: N1.blocuri }; continue; }
    const T = testBlocuri(v), medie = 0.5 + T.medie;
    out[cheie] = { gata: true, blocuri: N1.blocuri, deLa, panaLa, medie, t: T.t, p: T.p, verdict: Number.isFinite(T.p) && T.p <= N1.alfa && medie >= N1.prag ? "DOVEDIT" : "NEDOVEDIT" }; }
  return out;
}
export function bilantNotaTv(jurnal) { return bilantDinZile(zileDinJurnal(jurnal)); }
export function judecataNotaTv(jurnal) { return judecataDinZile(zileDinJurnal(jurnal)); }
// jurnalul se scurtează pe ZILE ÎNTREGI (cele mai vechi), ca o zi să fie ori toată în jurnal, ori toată în zilele ținute; ultimele două zile
// rămân oricum (dacă și așa trece de plafon - caz de neînchipuit - se taie ca înainte, pe intrări)
export function taieJurnalPeZile(jurnal, max) {
  let j = Array.isArray(jurnal) ? jurnal : []; const scoase = [];
  while (j.length > max) { const zl = [...new Set(j.filter(ORA_BUNA).map((e) => ziuaUtc(e.t)))].sort(); if (zl.length <= 2) break;
    const veche = zl[0], raman = []; for (const e of j) { if (ORA_BUNA(e) && ziuaUtc(e.t) === veche) scoase.push(e); else raman.push(e); } if (raman.length === j.length) break; j = raman; }
  return { jurnal: j.length > max ? j.slice(-max) : j, scoase };
}
// numărătoarea pe NOTE (cea dintâi): câte note cu direcție (|nota| > 0,1) au fost judecate și câte au nimerit; zile = zile UTC distincte cu note judecate
export function raportNotaTv(jurnal) {
  const r = { "4h": { n: 0, k: 0 }, "1D": { n: 0, k: 0 }, radar4h: { n: 0, k: 0 }, radar1D: { n: 0, k: 0 }, zile: 0 }, zile = new Set(), semn = (v) => (v === "BULLISH" ? 1 : v === "BEARISH" ? -1 : 0);
  for (const e of Array.isArray(jurnal) ? jurnal : []) { if (!e || !(e.p > 0) || !(typeof e.t === "number" && e.t > 0 && e.t < 8.64e15)) continue;   /* ora stricată: intrarea se sare (new Date(…).toISOString() ar arunca) */
    for (const [tf, nota, dupa] of [["4h", e.tv4h, e.d4], ["1D", e.tvZ, e.dZ]]) { if (nr(nota) === null || nr(dupa) === null || Math.abs(nota) <= 0.1) continue;
      r[tf].n++; if ((dupa - e.p) * nota > 0) r[tf].k++; zile.add(new Date(e.t).toISOString().slice(0, 10)); }
    // verdictul Radarului din aceeași clipă, judecat cu același preț de după 4 bare (neutrul nu are direcție, nu se numără)
    for (const [cheie, v, dupa] of [["radar4h", e.rv4, e.d4], ["radar1D", e.rvZ, e.dZ]]) { const sg = semn(v); if (!sg || nr(dupa) === null) continue; r[cheie].n++; if ((dupa - e.p) * sg > 0) r[cheie].k++; } }
  r.zile = zile.size; return r;
}
