// Tura „✋ 3 pierderi la rând = gata ziua” (în probă) - proba PROSPECTIVĂ a regulii lui (pragul `rand` al frânei), Radar v100.360 (18.11.2026; el:
// „proba prospectivă «3 la rând»: regula scrisă ACUM, verdict pe zile NOI”). Auditul pe istorie: boții porniți în aceeași zi DUPĂ 3 pierderi la rând
// (în ordinea închiderii) −0,53 USDT pe bot față de cei de dinainte, iar sub H0 (netul amestecat în zi, regula refăcută) +3,8 ⇒ p 0,010, dar 1 din
// ≥ 6 teste. Regulile sunt în docs/cercetare/2026-11-18-proba-trei-la-rand.md, scrise ÎNAINTE de acest cod; aici nimic nu se alege după cifre.
// d = { botiInchisi() (lista cu .complet), deschise() (răspunsul /api/bot-orders sau null), config() (răspunsul action=config), JurnalTrade,
//       trimite, jurnal, acum? };  st (pe disc) = { zi, la, prag, pragLa, zile: { "AAAA-LL-ZZ": { ids, la, cum } }, verdict }
const ZI = 86400000, ORA = 3600000;
export const REG = Object.freeze({
  startZi: "2026-11-19", startMs: Date.parse("2026-11-18T22:00:00Z"),   // 19.11.2026 00:00 la București
  N: 45, limita: "2027-11-18",   // verdictul la a N-a zi care contează sau la ultima zi a limitei (secțiunea 9 a documentului: N ales din putere)
  B: 2000, samanta: 20261119, alfa: 0.05, asteptZile: 7, pragImplicit: 3,
});
const fz = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" });
export const ziRo = (t) => fz.format(new Date(t));
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export const ziUrm = (z) => new Date(Date.parse(z + "T12:00:00Z") + ZI).toISOString().slice(0, 10);
/** Ora (ms) la care începe ziua z la București (00:00 local; trece corect peste schimbarea orei). */
export function inceputZiRo(z) {
  const b = Date.parse(z + "T00:00:00Z");
  for (const h of [2, 3, 1, 4]) { const t = b - h * ORA; if (ziRo(t) === z && ziRo(t - 1) !== z) return t; }
  return b - 2 * ORA;
}
export const sfarsitZiRo = (z) => inceputZiRo(ziUrm(z));
/** mulberry32 (regula: niciodată LCG). */
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Pragul din răspunsul action=config (aceeași regulă ca Obiceiuri.praguriFrana: număr > 0, rotunjit; altfel 3). */
export function pragDin(c) {
  const cfg = c && typeof c === "object" && c.config !== undefined ? c.config : c, r = Number(cfg && cfg.frana && cfg.frana.rand);
  return Number.isFinite(r) && r > 0 ? Math.round(r) : REG.pragImplicit;
}
/** Boții închiși (JurnalTrade.din) ⇒ { id, pornit, inchis, net } cu toate numerele finite. */
export function botiSimpli(trades) {
  const out = [];
  for (const t of Array.isArray(trades) ? trades : []) {
    const p = Number(t && t.pornit), i = Number(t && t.inchis), n = Number(t && t.net);
    if (t && t.id != null && Number.isFinite(p) && Number.isFinite(i) && Number.isFinite(n) && i >= p) out.push({ id: String(t.id), pornit: p, inchis: i, net: n });
  }
  return out;
}
/** Orele de pornire ale boților încă deschiși, din răspunsul /api/bot-orders; null dacă lista nu e sigur întreagă (atunci doar regula celor 7 zile). */
export function deschiseDin(r) {
  if (!r || !Array.isArray(r.bots) || (r.probleme && (r.probleme.trunchiat || r.probleme.listaNula))) return null;
  const out = [];
  for (const b of r.bots) { if (b && b.activ === false) continue; const t = Number(b && (b.pornitLa != null ? b.pornitLa : b.createTime)); if (!(t > 0)) return null; out.push(t); }
  return out;
}
/** Judecarea zilelor de pornire (secțiunea 4): ziua s-a terminat și (niciun bot pornit atunci nu mai e deschis, sau au trecut 7 zile).
 *  Membrii = boții porniți în ziua aceea și închiși acum; se îngheață (o zi judecată nu se mai atinge). Întoarce câte zile noi. */
export function judecaZile(st, boti, deschise, acum) {
  st.zile = st.zile && typeof st.zile === "object" ? st.zile : {};
  const peZi = new Map();
  for (const b of boti) { if (b.pornit < REG.startMs || b.inchis > acum) continue; const z = ziRo(b.pornit); if (!peZi.has(z)) peZi.set(z, []); peZi.get(z).push(b.id); }
  const desc = Array.isArray(deschise) ? new Set(deschise.filter((t) => t >= REG.startMs).map(ziRo)) : null;
  let noi = 0;
  for (let z = REG.startZi; sfarsitZiRo(z) <= acum; z = ziUrm(z)) {
    if (st.zile[z]) continue;
    const toate = !!desc && !desc.has(z);
    if (!toate && acum < sfarsitZiRo(z) + REG.asteptZile * ZI) continue;
    st.zile[z] = { ids: (peZi.get(z) || []).slice().sort(), la: acum, cum: toate ? "inchise" : "7zile" };
    noi++;
  }
  return noi;
}
/** Prefixul continuu de zile judecate de la start (o zi judecată târziu nu mută setul). */
export function prefix(st) {
  const out = [], Z = (st && st.zile) || {};
  for (let z = REG.startZi; Z[z]; z = ziUrm(z)) out.push({ zi: z, ids: Array.isArray(Z[z].ids) ? Z[z].ids : [] });
  return out;
}
/** Structura pentru socoteală și amestecare: v = netul membrilor (pe grupe = zile de pornire), F = netul fix al celorlalți boți închiși în zilele
 *  prefixului (porniți înainte de start sau închiși după ce ziua lor s-a judecat), Z = pe fiecare zi: seria închiderilor și membrii ei. */
export function construieste(boti, zile) {
  const byId = new Map(boti.map((b) => [b.id, b])), idx = new Map(), v = [], grupe = [], F = [], Z = [], inZile = new Set(zile.map((z) => z.zi));
  for (const z of zile) {
    const g = [];
    for (const id of z.ids) { const b = byId.get(String(id)); if (!b || idx.has(b.id)) continue; idx.set(b.id, v.length); g.push(v.length); v.push(b.net); }
    grupe.push(g);
  }
  const inch = new Map();
  for (const b of boti) { const k = ziRo(b.inchis); if (!inZile.has(k)) continue; if (!inch.has(k)) inch.set(k, []); inch.get(k).push(b); }
  for (const z of zile) {
    const l = (inch.get(z.zi) || []).sort((a, b) => a.inchis - b.inchis || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const seq = new Int32Array(l.length), tInch = new Float64Array(l.length);
    l.forEach((b, i) => { seq[i] = idx.has(b.id) ? idx.get(b.id) : -F.push(b.net); tInch[i] = b.inchis; });
    const mb = z.ids.map((id) => byId.get(String(id))).filter((b) => b && idx.has(b.id)).sort((a, b) => a.pornit - b.pornit);
    Z.push({ zi: z.zi, seq, tInch, mem: Int32Array.from(mb.map((b) => idx.get(b.id))), mPornit: Float64Array.from(mb.map((b) => b.pornit)) });
  }
  return { v: Float64Array.from(v), grupe, F, Z };
}
/** Regula pe neturile v (secțiunea 5): în fiecare zi, seria închiderilor (net < 0 crește, net ≥ 0 o pune la 0) ⇒ T; D = membrii porniți după T,
 *  Î = până la T inclusiv; ziua contează cu ambele grupe nevide; S = Σ w·(medie D − medie Î) / Σ w, w = nD·nÎ / (nD + nÎ).
 *  perZi (opțional, array) primește pe fiecare zi { decl, w, wd } - pentru orizont și simularea puterii. */
export function evalueaza(C, v, prag, perZi) {
  let sw = 0, swd = 0, decl = 0, cont = 0, nD = 0, nI = 0;
  for (let k = 0; k < C.Z.length; k++) {
    const z = C.Z[k]; let r = 0, T = null;
    for (let i = 0; i < z.seq.length; i++) { const e = z.seq[i], x = e >= 0 ? v[e] : C.F[-e - 1]; r = x < 0 ? r + 1 : 0; if (r >= prag) { T = z.tInch[i]; break; } }
    if (T === null) { if (perZi) perZi.push({ decl: 0, w: 0, wd: 0 }); continue; }
    decl++;
    let sd = 0, nd = 0, si = 0, ni = 0;
    for (let i = 0; i < z.mem.length; i++) { const x = v[z.mem[i]]; if (z.mPornit[i] > T) { sd += x; nd++; } else { si += x; ni++; } }
    if (!nd || !ni) { if (perZi) perZi.push({ decl: 1, w: 0, wd: 0 }); continue; }
    const w = nd * ni / (nd + ni), d = sd / nd - si / ni;
    cont++; sw += w; swd += w * d; nD += nd; nI += ni;
    if (perZi) perZi.push({ decl: 1, w, wd: w * d });
  }
  return { S: sw > 0 ? swd / sw : null, decl, cont, nD, nI };
}
/** Amestecarea în zi (secțiunea 6): B permutări ale netului între membrii fiecărei zile de pornire, regula refăcută ⇒ S*. */
export function amestecari(C, prag, B = REG.B, samanta = REG.samanta) {
  const r = mulberry32(samanta), v = Float64Array.from(C.v), out = new Array(B);
  for (let b = 0; b < B; b++) {
    for (const g of C.grupe) for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), a = v[g[i]]; v[g[i]] = v[g[j]]; v[g[j]] = a; }
    out[b] = evalueaza(C, v, prag).S;
  }
  return out;
}
/** p unilateral (după mai prost decât mecanica): (1 + #{S* ≤ S}) / (B + 1); un S* fără nicio zi care contează se numără ca extrem (prudent). */
export function testH0(C, prag, B = REG.B, samanta = REG.samanta) {
  const e = evalueaza(C, C.v, prag);
  if (e.S == null) return Object.assign(e, { p: null, mecanica: null, peste: null, B });
  const s = amestecari(C, prag, B, samanta), bune = s.filter((x) => x != null);
  const ext = s.filter((x) => x == null || x <= e.S).length, mec = bune.length ? bune.reduce((a, x) => a + x, 0) / bune.length : null;
  return Object.assign(e, { p: (1 + ext) / (B + 1), mecanica: mec, peste: mec == null ? null : e.S - mec, B });
}
/** Orizontul (secțiunea 9): prefixul verdictului = până la ziua în care zilele care contează ating N, altfel (prefixul a trecut de limită) până la
 *  limită inclusiv; null = încă în curs. */
export function orizont(pre, perZi) {
  let c = 0;
  for (let i = 0; i < pre.length; i++) { if (perZi[i] && perZi[i].w > 0) c++; if (c >= REG.N) return { pana: i, motiv: "N" }; }
  if (pre.length && pre[pre.length - 1].zi >= REG.limita) { let i = pre.length - 1; while (i >= 0 && pre[i].zi > REG.limita) i--; return { pana: i, motiv: "limita" }; }
  return null;
}
const r4 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e4) / 1e4);
/** Starea pentru KV: cifrele curente (fără verdict înainte de orizont); verdictul se calculează o dată și se îngheață în st.verdict. */
export function socoteste(boti, st, acum) {
  const pre = prefix(st), prag = st.prag || REG.pragImplicit, C = construieste(boti, pre), perZi = [];
  const e = evalueaza(C, C.v, prag, perZi), cur = e.S == null ? null : testH0(C, prag);
  const or = orizont(pre, perZi);
  if (or && !st.verdict) {
    const P = pre.slice(0, or.pana + 1), CV = construieste(boti, P), t = testH0(CV, prag);
    st.verdict = { la: acum, verdict: t.p != null && t.p <= REG.alfa ? "tine" : "nu-tine", motiv: or.motiv, pana: P.length ? P[P.length - 1].zi : null,
      zile: P.length, zileConteaza: t.cont, zileCuDeclansare: t.decl, nD: t.nD, nI: t.nI, statistica: r4(t.S), mecanica: r4(t.mecanica), peste: r4(t.peste), pH0: r4(t.p) };
  }
  const asteapta = []; for (let z = REG.startZi; sfarsitZiRo(z) <= acum; z = ziUrm(z)) if (!(st.zile && st.zile[z])) asteapta.push(z);
  return {
    forma: 1, la: acum, start: REG.startZi, prag, N: REG.N, limita: REG.limita, B: REG.B, alfa: REG.alfa,
    zileJudecate: pre.length, ultimaZi: pre.length ? pre[pre.length - 1].zi : null, asteapta: asteapta.length,
    zileCuDeclansare: e.decl, zileConteaza: e.cont, nD: e.nD, nI: e.nI,
    statistica: r4(e.S), mecanica: r4(cur && cur.mecanica), peste: r4(cur && cur.peste), pH0: r4(cur && cur.p),
    verdict: st.verdict ? st.verdict.verdict : null, verdictLa: st.verdict ? st.verdict.la : null, inghetat: st.verdict || null,
  };
}

/** Tura: o dată pe zi UTC, după 00:30 (ziua de la București s-a terminat cu 1,5–2,5 h înainte). Pragul se citește la prima tură și se îngheață. */
export async function turaTreiLaRand(d, st) {
  const acum = d.acum || Date.now(), zi = new Date(acum).toISOString().slice(0, 10), t0 = Date.parse(zi + "T00:00:00Z");
  if (st.zi === zi || acum - t0 < 30 * 60000) return null;
  if (st.prag == null) {
    const c = await d.config();
    if (!c || typeof c !== "object" || c.error) throw new Error("configurarea frânei n-a venit (pragul nu se îngheață pe ghicite)");
    st.prag = pragDin(c); st.pragLa = acum;
  }
  const l = await d.botiInchisi();
  if (!l || !l.complet) throw new Error("arhiva boților n-a venit întreagă (nu judec pe ultimii 10)");
  const boti = botiSimpli(d.JurnalTrade.din(l));
  let desc = null; try { desc = deschiseDin(await d.deschise()); } catch { desc = null; }
  const noi = judecaZile(st, boti, desc, acum), o = socoteste(boti, st, acum);
  await d.trimite("/api/istoric-bot?action=treiLaRand", o);
  st.zi = zi; st.la = acum;
  d.jurnal("3 la rând:", cate(noi, "zi nouă judecată", "zile noi judecate") + ", în total " + cate(o.zileJudecate, "zi", "zile") + "; care contează: " + o.zileConteaza + " din " + REG.N + (o.verdict ? " · verdict " + o.verdict : ""));
  return o;
}
