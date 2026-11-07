// Tura „🎯 Direcția pe 7 zile (în probă)” — proba din 07.11.2026 (pine-scripts\_proba-directie-2026-11-07, jurnalul § 3, § 6, § 9):
// zilnic, după 8:00, primele 10 monede Pionex după mediana volumului pe 30 de zile pe Binance (dintre cele eligibile): direcția
// M1 (momentum pe 28 de zile) și M2 („judecata mea” scrisă ca regulă), fiecare cu probabilitatea „sus în 7 zile”, cu coeficienții
// ÎNGHEȚAȚI din rularea REAL; judecate la închiderea t+7 cu y = s·r7 − 0,2% − s·Σfunding (abs) și față de piață (rel).
// Istoricul (124 de săptămâni OOS, 2024-06 … 2026-10): N-AM AFLAT pe trei întrebări; pe M2 față de piață regula a dat „merge invers”, dar e
// costul (0,2% + funding; brut ≈ 0, jurnal § 8b) ⇒ aici e doar URMĂRIRE (§ 9.5), nu un semnal.
// Echivalența cu motorul Python: scripts/proba-v100311-directie.mjs pe 150 de perechi exportate de exporta_echivalenta.py.
import { FAPI, univers, bareInchise, panou, eligibil, hartaPionex, bazaBinance, multBinance, inchidereLa, ziUtc } from "./tura-caderi.mjs";

const ZI = 86400000, ORA = 3600000;
export const REG = {
  lb: 28, scurt: 7, h: 7, sigN: 30, sigMin: 20, vtrScurt: 7, vtrScurtMin: 5, vtrLung: 30, vtrLungMin: 20, emaBtc: 50, fundOre: 72,
  minBare: 90, volMin: 5e6, volFer: 30, volMinObs: 20, bare: 200, bareBtc: 1000,
  cost: 0.002, costStres: 0.004, lista: 10, bloc: 2, reps: 20000,
  priviri: ["2027-05-08", "2027-11-08"], sanatateMinElig: 100,
};
// coeficienti-directie-2026-11-07.json (sha256 f581e67e…), potriviți pe IS (ieșirile ≤ 2024-05-31) — NU se reglează după rezultate
export const COEF = {
  M1: { a: -0.05678712612370796, b: 0.04097518938471163 },
  M2: {
    beta: [-0.0615523505918797, -0.26424927671679044, -0.1041176591332574, 0.8274675546784901, -0.42057597979357014, -0.03185169384556106, 0.05809620361371355],
    caract: ["z28", "z7", "btc28", "btcEma", "fund", "vtr"],
    lim: { z28: [-2.00510081572579, 2.4208570421278925], z7: [-2.465872692644593, 2.562987257112188], btc28: [-1.747340899583807, 2.9430403593486116], btcEma: [-0.2607878469455278, 0.275396509364205], fund: [-0.0008942669555555556, 0.0006606827333333284], vtr: [-0.8766057521153335, 1.909827567811937] },
    mu: { z28: -0.09745467329461077, z7: -0.026909640036670873, btc28: 0.22075267526360337, btcEma: 0.01701044946973909, fund: 5.896006592578374e-05, vtr: 0.00911643987274017 },
    sd: { z28: 0.9563006794421985, z7: 0.9738897183622813, btc28: 1.0819048826024473, btcEma: 0.1074998229691989, fund: 0.0001928327441517578, vtr: 0.4663543998465723 },
  },
  bazaIs: 0.48482753098910375,
};
// § 8 din jurnal (REAL, 07.11 ~16:10) — cifrele fixe arătate lângă urmărirea înainte
export const ISTORIC = {
  saptOos: 124, perechiOos: 26894, bazaIs: 0.485, bazaOos: 0.42,
  M1: { abs: { T: 0.00145, p: 0.42, nim: 0.505, verdict: "N-AM AFLAT" }, rel: { T: -0.0004, p: 0.60, nim: 0.517, verdict: "N-AM AFLAT" }, brier: 0.2481 },
  M2: { abs: { T: 0.0035, p: 0.34, nim: 0.512, verdict: "N-AM AFLAT" }, rel: { T: -0.0028, p: 0.997, brut: -0.0003, nim: 0.506, verdict: "MERGE INVERS (= costul)" }, brier: 0.2586, calibrare: [[0.35, 0.40], [0.43, 0.44], [0.49, 0.39], [0.55, 0.45], [0.64, 0.42]] },
  brierClim: 0.2477, mereuSus: -0.0065, mereuJos: 0.0025, puterePiata: 0.01, putereAbs: 0.02,
};

const nr = (v) => { if (v == null || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const laSec = (t) => Math.round(Number(t) / 1000) * 1000;   // fundingTime are câteva ms peste ora exactă
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const medie = (v) => v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
function mediana(v) { const s = v.slice().sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }

// ---------- intrările (doar trecutul; jurnal § 3) ----------
/** Funding-ul decontat în [a, b): { s: suma, n: câte }. Convenția probei: decontarea de la 00:00 a zilei t+1 e a ȚINERII, nu a celor 72 h. */
export function fundingIn(fundIst, a, b) { let s = 0, n = 0; for (const x of Array.isArray(fundIst) ? fundIst : []) { const t = laSec(x && x.fundingTime), v = nr(x && x.fundingRate); if (v != null && t >= a && t < b) { s += v; n++; } } return { s, n }; }
/** σ30: abaterea standard (n−1) a randamentelor log zilnice pe [i−29, i], cu ≥ 20 de valori (ca pandas rolling(30, min_periods=20).std()). */
export function sigma(C, j, i, r = REG) {
  const v = []; for (let k = Math.max(1, i - r.sigN + 1); k <= i; k++) if (C[k][j] != null && C[k - 1][j] != null) v.push(Math.log(C[k][j]) - Math.log(C[k - 1][j]));
  if (v.length < r.sigMin) return null; const m = medie(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}
function medQ(Q, C, j, a, b, min) { const v = []; for (let k = Math.max(0, a); k <= b; k++) if (Q[k][j] != null && C[k][j] != null) v.push(Q[k][j]); return v.length >= min ? mediana(v) : null; }
/** EMA50 a BTC (pandas ewm(span=50, adjust=False)) pe toate închiderile date, cu golurile umplute înainte; valoarea la ultima. */
export function emaBtc(inchideri, r = REG) { const k = 2 / (r.emaBtc + 1); let e = null, ult = null; for (const c of inchideri) { const x = c != null ? c : ult; if (x == null) continue; ult = x; e = e == null ? x : x * k + e * (1 - k); } return e != null && ult != null ? ult / e - 1 : null; }
/** Intrările monedei j în ziua i (§ 3); btcEma vine din seria lungă a BTC. null = nu se poate (lipsă). */
export function intrari(p, i, j, jb, fundIst, btcEma, r = REG) {
  const C = p.C, Q = p.Q; if (C[i][j] == null || i < r.lb || C[i - r.lb][j] == null || C[i - r.scurt][j] == null) return null;
  const s = sigma(C, j, i, r), sb = jb >= 0 ? sigma(C, jb, i, r) : null; if (s == null || !(s > 0)) return null;
  const l28 = Math.log(C[i][j] / C[i - r.lb][j]), l7 = Math.log(C[i][j] / C[i - r.scurt][j]);
  const btc28 = jb >= 0 && sb > 0 && C[i][jb] != null && C[i - r.lb][jb] != null ? Math.log(C[i][jb] / C[i - r.lb][jb]) / (sb * Math.sqrt(r.lb)) : null;
  const q7 = medQ(Q, C, j, i - r.vtrScurt + 1, i, r.vtrScurtMin), q30 = medQ(Q, C, j, i - r.vtrLung + 1, i, r.vtrLungMin);
  const T = Date.parse(p.zile[i] + "T00:00:00Z") + ZI, f = fundingIn(fundIst, T - r.fundOre * ORA, T);
  const x = { z28: l28 / (s * Math.sqrt(r.lb)), z7: l7 / (s * Math.sqrt(r.scurt)), r28: C[i][j] / C[i - r.lb][j] - 1, btc28, btcEma, fund: f.n ? f.s / f.n : 0, vtr: q7 > 0 && q30 > 0 ? Math.log(q7 / q30) : null };
  for (const k of COEF.M2.caract) if (x[k] == null || !Number.isFinite(x[k])) return null;
  return x.r28 === 0 ? null : x;
}
const logistic = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
export function prob1(x, c = COEF) { return logistic(c.M1.a + c.M1.b * x.z28); }
export function prob2(x, c = COEF) { let z = c.M2.beta[0]; c.M2.caract.forEach((k, q) => { const [lo, hi] = c.M2.lim[k]; z += c.M2.beta[q + 1] * (Math.max(lo, Math.min(hi, x[k])) - c.M2.mu[k]) / c.M2.sd[k]; }); return logistic(z); }
export function semne(x, c = COEF) { const P1 = prob1(x, c), P2 = prob2(x, c); return { s1: Math.sign(x.r28), P1, s2: P2 > 0.5 ? 1 : -1, P2 }; }

/** Ziua t: eligibilii valizi (piața pentru „față de piață”) și primele 10 de pe Pionex după mediana volumului (fără funding încă). */
export function alegeZiua(p, el, med, pionex, r = REG) {
  const i = p.zile.length - 1, jb = p.sim.indexOf("BTCUSDT"), cand = [];
  for (let j = 0; j < p.sim.length; j++) if (el[i][j] && p.C[i][j] != null && pionex[bazaBinance(p.sim[j])]) cand.push(j);
  cand.sort((a, b) => (med[i][b] || 0) - (med[i][a] || 0));
  return { i, jb, cand };
}

// ---------- judecata și urmărirea ----------
/** Rezultatul unei poziții la 7 zile: y = s·r7 − cost − s·Σf (long plătește funding-ul pozitiv); yr = față de media eligibililor (§ 9.2,
 *  piata), yq = față de media celor 10 (ca varianta „primele 10” din istoric, piata10) - revizia 07.11, § 9 abaterea 2. */
export function judeca(m, r7, fh, piata, r = REG, piata10 = null) {
  const o = { r7, fh, u: r7 > 0 ? 1 : 0 };
  for (const k of ["1", "2"]) { const s = m["s" + k]; o["y" + k] = s * r7 - r.cost - s * fh; o["yr" + k] = piata == null ? null : s * (r7 - piata) - r.cost - s * fh; o["yq" + k] = piata10 == null ? null : s * (r7 - piata10) - r.cost - s * fh; o["b" + k] = (m["P" + k] - o.u) ** 2; }
  o.bClim = (COEF.bazaIs - o.u) ** 2;
  return o;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** p unilateral (H1: media săptămânilor > 0): semnul se schimbă pe blocuri de r.bloc săptămâni consecutive, media se face pe SĂPTĂMÂNI
 *  (ca p_semne din directie_motor.py - revizia 07.11); exact până la 14 blocuri, altfel r.reps repetări (mulberry32). */
export function pBlocuri(W, r = REG, seed = 20261107) {
  const n = W.length, nb = Math.ceil(n / r.bloc), obs = medie(W) - 1e-15, sem = new Array(nb);
  const T = () => { let s = 0; for (let q = 0; q < n; q++) s += sem[Math.floor(q / r.bloc)] * W[q]; return s / n; };
  let peste = 0;
  if (nb <= 14) { const tot = 1 << nb; for (let k = 0; k < tot; k++) { for (let b = 0; b < nb; b++) sem[b] = (k >> b) & 1 ? -1 : 1; if (T() >= obs) peste++; } return peste / tot; }
  const rnd = mulberry32(seed);
  for (let k = 0; k < r.reps; k++) { for (let b = 0; b < nb; b++) sem[b] = rnd() < 0.5 ? -1 : 1; if (T() >= obs) peste++; }
  return (peste + 1) / (r.reps + 1);
}
const zileIntre = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / ZI);
/** Urmărirea: pe perechi (toate zilele judecate) și pe grila săptămânală de la start (testul, § 9.5: schimbarea semnelor pe blocuri de 2 săptămâni). */
export function urmarire(zile, start, r = REG) {
  const jud = zile.filter((z) => z.gata7 && !z.incomplet && z.zi >= start && (z.monede || []).some((m) => m.j7)), per = { 1: [], 2: [] }, W = { 1: { a: [], r: [], q: [] }, 2: { a: [], r: [], q: [] } };
  let bC = 0, nb = 0, b1 = 0, b2 = 0;
  for (const z of jud) {
    const ms = (z.monede || []).filter((m) => m.j7);
    for (const m of ms) { for (const k of ["1", "2"]) per[k].push({ a: m.j7["y" + k], r: m.j7["yr" + k], q: m.j7["yq" + k], nimA: m["s" + k] * m.j7.r7 > 0, nimR: z.piata7 == null ? null : m["s" + k] * (m.j7.r7 - z.piata7) > 0 }); b1 += m.j7.b1; b2 += m.j7.b2; bC += m.j7.bClim; nb++; }
    if (zileIntre(start, z.zi) % 7 === 0 && ms.length) for (const k of ["1", "2"]) {
      W[k].a.push(medie(ms.map((m) => m.j7["y" + k])));
      for (const [c, f] of [["r", "yr"], ["q", "yq"]]) { const v = ms.map((m) => m.j7[f + k]).filter((x) => x != null); if (v.length) W[k][c].push(medie(v)); }
    }
  }
  const rez = { zile: jud.length, perechi: nb, brier: { M1: nb ? b1 / nb : null, M2: nb ? b2 / nb : null, clim: nb ? bC / nb : null } };
  const parte = (l, cheie, Wv, nim) => { const x = l.filter((o) => o[cheie] != null); return { n: x.length, medie: x.length ? medie(x.map((o) => o[cheie])) : null, nimerire: nim && x.length ? x.filter((o) => o[nim]).length / x.length : null, sapt: Wv.length, medieSapt: Wv.length ? medie(Wv) : null, p: Wv.length >= 8 ? pBlocuri(Wv, r) : null }; };
  for (const k of ["1", "2"]) rez["M" + k] = { abs: parte(per[k], "a", W[k].a, "nimA"), rel: parte(per[k], "r", W[k].r, "nimR"), rel10: parte(per[k], "q", W[k].q, null) };
  return rez;
}

// ---------- tura (I/O) ----------
/** d = { binance, cere, trimite, jurnal, citesteZi(zi), scrieZi(zi, o), listaZile(), acum?, forta? }; st = { zi, esecLa, start }. */
export async function turaDirectie(d, st, r = REG) {
  const acum = d.acum || Date.now();
  if (st.inLucru) return null;
  if (!d.forta && (oraRo(acum) < 8 || st.zi === ziRo(acum) || acum - (st.esecLa || 0) < 2 * ORA)) return null;
  st.inLucru = true;
  try {
    if (d.binance && typeof d.binance.reia === "function" && !d.binance.reia()) { d.jurnal("directie: Binance a interzis IP-ul (418) - sar ziua"); st.esecLa = acum; return null; }
    const oprita = () => !!(d.binance && d.binance.stare && d.binance.stare.oprit);
    const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo"), U = univers(info), Uset = new Set(U);
    if (U.length < 100) { st.esecLa = acum; d.jurnal("directie: universul Binance are doar " + cate(U.length, "monedă", "monede") + " - reîncerc peste 2 ore"); return null; }
    const zileVechi = (d.listaZile() || []).map((z) => d.citesteZi(z)).filter(Boolean), deJudecat = new Set();
    for (const z of zileVechi) if (!z.gata7) { for (const s of Object.keys(z.eligibili || {})) deJudecat.add(s); for (const m of z.monede || []) deJudecat.add(m.b); }
    const toate = [...new Set([...U, ...deJudecat])], serii = {}, lucru = toate.slice();
    let lipsa = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let s = lucru.shift(); s; s = lucru.shift()) {
        const k = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${encodeURIComponent(s)}&interval=1d&limit=${s === "BTCUSDT" ? r.bareBtc : r.bare}`);
        if (Array.isArray(k)) serii[s] = bareInchise(k, acum); else lipsa++;
      }
    }));
    if (oprita()) { st.esecLa = acum; d.jurnal("directie: tura oprită (" + d.binance.stare.oprit + ")"); return null; }
    const ziT = ziUtc(acum - ZI);
    if (!serii.BTCUSDT || !serii.BTCUSDT.length || ziUtc(serii.BTCUSDT[serii.BTCUSDT.length - 1].t) !== ziT) { st.esecLa = acum; d.jurnal("directie: bara BTC a zilei " + ziT + " lipsește - reîncerc peste 2 ore"); return null; }
    // § 6: prima zi a urmăririi = prima zi pe care o face tura după livrare (scrisă în stare); revizia 07.11: dacă starea se pierde, prima zi de pe disc
    if (!st.start) { const l = d.listaZile() || []; st.start = l.length ? l[0] : ziT; }
    const btcLung = serii.BTCUSDT, p = panou(Object.fromEntries(Object.entries(serii).filter(([s]) => Uset.has(s) || deJudecat.has(s))), ziT, r.bare), i = p.zile.length - 1;
    let pionex = {}, pionexLipsa = false;
    try { const tk = ((await d.cere("/api/market?type=pionex_tickers&market=PERP")) || {}).data?.tickers; pionex = hartaPionex(tk); pionexLipsa = !Object.keys(pionex).length; } catch { pionexLipsa = true; }
    // revizia 07.11 (🔴): aici Pionex ALEGE monedele probei (la căderi doar le afișa) ⇒ fără listă nu scriu nicio zi (ar rămâne goală pentru totdeauna)
    if (pionexLipsa) { st.esecLa = acum; d.jurnal("directie: lista Pionex n-a venit - nu aleg monedele, reîncerc peste 2 ore"); return null; }
    // revizia 07.11 (🟡): o monedă de pe Pionex fără bare azi poate fi din primele 10 ⇒ ziua nu se scrie (ar intra a 11-a pentru totdeauna)
    const lipsaPionex = toate.filter((s) => !serii[s] && Uset.has(s) && pionex[bazaBinance(s)]).length;
    const { el, med } = eligibil(p, r);
    // ziua de ieri + zilele lipsă (până la 20 în urmă), fiecare doar cu barele de până la ea; o cerere de funding picată ⇒ ziua nu se scrie (reîncerc)
    let ziNoua = null, reincearca = 0;
    for (let k = Math.max(r.minBare + 2, i - 20); k <= i; k++) {
      const zk = p.zile[k];
      if ((zk < st.start && k !== i) || d.citesteZi(zk)) continue;
      const pk = { zile: p.zile.slice(0, k + 1), sim: p.sim, C: p.C.slice(0, k + 1), Q: p.Q.slice(0, k + 1) };
      const tk1 = Date.parse(zk + "T00:00:00Z") + ZI, bE = emaBtc(btcLung.filter((b) => b.t < tk1).map((b) => b.c), r);
      const { cand, jb } = alegeZiua(pk, el, med, pionex, r);
      const eligibili = {}; let nElig = 0;
      for (let j = 0; j < p.sim.length; j++) if (el[k][j] && p.C[k][j] != null) { nElig++; eligibili[p.sim[j]] = p.C[k][j]; }
      const monede = []; let esecF = 0;
      for (const j of cand) {
        if (monede.length >= r.lista) break;
        const fu = await d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${encodeURIComponent(p.sim[j])}&startTime=${tk1 - r.fundOre * ORA - ORA}&endTime=${tk1 + ORA}&limit=200`);
        if (!Array.isArray(fu)) { esecF++; continue; }
        const x = intrari(pk, k, j, jb, fu, bE, r); if (!x) continue;
        monede.push({ s: pionex[bazaBinance(p.sim[j])], b: p.sim[j], mult: multBinance(p.sim[j]), c: p.C[k][j], med: med[k][j], ...x, ...semne(x) });
      }
      if (oprita()) { st.esecLa = acum; d.jurnal("directie: tura oprită în mijloc - nimic scris, reîncerc peste 2 ore"); return null; }
      const z = { zi: zk, la: acum, nElig, lipsa, lipsaPionex, incomplet: nElig < r.sanatateMinElig || lipsa > 0.1 * toate.length, recuperata: k < i, esecF, eligibili, monede };
      if ((lipsa > 0.1 * toate.length || esecF || lipsaPionex) && k > i - 15) reincearca++; else d.scrieZi(zk, z);
      if (k === i) ziNoua = z;
    }
    ziNoua = ziNoua || d.citesteZi(ziT);
    if (!ziNoua) { st.esecLa = acum; d.jurnal("directie: ziua " + ziT + " nu s-a putut calcula - reîncerc peste 2 ore"); return null; }
    // judecata la 7 zile: închiderea t+7 (ultima ≤ t+7; delistata = ultima văzută), piața = media eligibililor zilei, funding-ul pe [t+1 00:00, t+8 00:00)
    const idx = Object.fromEntries(p.zile.map((z, q) => [z, q])), jIdx = Object.fromEntries(p.sim.map((s, j) => [s, j]));
    for (const z of (d.listaZile() || []).map((x) => d.citesteZi(x)).filter(Boolean)) {
      const iz = idx[z.zi]; if (iz == null || z.gata7) continue;
      let schimbat = false; z.ultim = z.ultim || {};
      for (const sym of new Set([...Object.keys(z.eligibili || {}), ...(z.monede || []).map((m) => m.b)])) {
        const j = jIdx[sym]; if (j == null) continue;
        // revizia 07.11: ultima închidere văzută ≤ t+7 (nu ultima de azi), ca o delistare de DUPĂ t+7 cu judecata întârziată să iasă la t+7
        for (let q = Math.min(i, iz + r.h); q >= iz; q--) if (p.C[q][j] != null) { if (!z.ultim[sym] || z.ultim[sym][0] < p.zile[q]) { z.ultim[sym] = [p.zile[q], p.C[q][j]]; schimbat = true; } break; }
      }
      if (iz + r.h > i) { if (schimbat) d.scrieZi(z.zi, z); continue; }
      const vechi = iz + r.h <= i - 30;
      const inchide = (sym) => { const j = jIdx[sym], c = j == null ? null : inchidereLa(p.C, j, iz, iz + r.h); if (c != null) return c; const u = z.ultim[sym]; return !Uset.has(sym) && u && u[0] >= z.zi && u[0] <= p.zile[Math.min(iz + r.h, i)] ? u[1] : null; };
      let s = 0, n = 0, fara = 0;
      for (const [sym, c0] of Object.entries(z.eligibili || {})) { const c1 = inchide(sym); if (c1 != null && c0 > 0) { s += c1 / c0 - 1; n++; } else fara++; }
      const piata = n ? s / n : null, ies = (z.monede || []).map((m) => inchide(m.b));
      // revizia 07.11 (🟡): și un eligibil fără bare azi (cerere picată; delistatele au deja z.ultim) ⇒ reîncerc, ca la căderi; după 30 de zile se închide cu ce s-a putut
      if ((fara || piata == null || ies.some((x) => x == null)) && !vechi) { if (schimbat) d.scrieZi(z.zi, z); continue; }
      const r10 = (z.monede || []).map((m, q) => (ies[q] != null && m.c > 0 ? ies[q] / m.c - 1 : null)).filter((x) => x != null), piata10 = r10.length ? medie(r10) : null;
      const t0 = Date.parse(z.zi + "T00:00:00Z") + ZI, t1 = t0 + r.h * ZI, fus = [];
      for (const m of z.monede || []) fus.push(await d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${encodeURIComponent(m.b)}&startTime=${t0 - ORA}&endTime=${t1 + ORA}&limit=1000`));
      if (oprita()) { st.esecLa = acum; d.jurnal("directie: tura oprită la judecată - reîncerc peste 2 ore"); return null; }
      if (fus.some((f) => !Array.isArray(f)) && !vechi) { if (schimbat) d.scrieZi(z.zi, z); continue; }
      (z.monede || []).forEach((m, q) => {
        const c1 = ies[q]; if (c1 == null || !(m.c > 0)) { m.lipsa7 = true; return; }
        const fh = Array.isArray(fus[q]) ? fundingIn(fus[q], t0, t1).s : 0;
        m.j7 = judeca(m, c1 / m.c - 1, fh, piata, r, piata10);
        if (!Array.isArray(fus[q])) m.faraFunding7 = true;
      });
      z.piata7 = piata; z.piata10 = piata10; z.fara7 = fara; z.gata7 = true;
      if (fara > 0.1 * Object.keys(z.eligibili || {}).length) z.incomplet = true;
      d.scrieZi(z.zi, z);
    }
    const zile = (d.listaZile() || []).map((x) => d.citesteZi(x)).filter(Boolean);
    const U2 = urmarire(zile, st.start, r);
    // privirile (§ 6): instantaneul cifrelor, scris O SINGURĂ dată după data lui; istoricul n-a dovedit nimic ⇒ fără verdict de confirmare
    U2.priviri = [];
    for (const L of r.priviri) { if (ziT < L) continue; const k = "privire-" + L, v = d.citesteZi(k); if (v) U2.priviri.push(v); else { const o = { la: L, scrisLa: acum, cifre: urmarire(zile.filter((z) => z.zi <= L), st.start, r), verdict: "doar urmărire: istoricul (§ 8) n-a dovedit nicio întrebare" }; d.scrieZi(k, o); U2.priviri.push(o); } }
    const lista = (ziNoua.monede || []).slice(0, r.lista).map((m) => ({ s: m.s, b: m.b, mult: m.mult, c: m.c, med: m.med, z28: m.z28, z7: m.z7, r28: m.r28, btc28: m.btc28, btcEma: m.btcEma, fund: m.fund, vtr: m.vtr, s1: m.s1, P1: m.P1, s2: m.s2, P2: m.P2 }));
    const corp = { la: acum, zi: ziT, start: st.start, nElig: ziNoua.nElig, incomplet: !!ziNoua.incomplet, pionexLipsa, lista, urmarire: U2, istoric: ISTORIC };
    await d.trimite("/api/istoric-bot?action=directie", corp);
    if (reincearca) { st.esecLa = acum; d.jurnal("directie: " + cate(reincearca, "zi nescrisă", "zile nescrise") + " (funding picat sau bare lipsă) - lista e publicată, reîncerc peste 2 ore"); }
    else { st.zi = ziRo(acum); st.esecLa = 0; }
    d.jurnal("directie: ziua " + ziT + " · " + cate(lista.length, "monedă", "monede") + " (M1 sus: " + lista.filter((m) => m.s1 > 0).length + ", M2 sus: " + lista.filter((m) => m.s2 > 0).length + ") · judecate: " + cate(U2.perechi, "pereche", "perechi") + " pe " + cate(U2.zile, "zi", "zile"));
    return corp;
  } finally { st.inLucru = false; }
}
