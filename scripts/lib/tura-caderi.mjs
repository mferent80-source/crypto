// tura-caderi.mjs — „📉 După o cădere mare (în probă)” (colector v101.168 / Radar v100.308, 07.11.2026; el: „ok fă așa dar fă și sugestie
// de coinuri”). Regulile = proba pre-înregistrată din pine-scripts\_proba-revenire-2026-11-07\_JURNAL_REVENIRE.md § 3 (înghețată 07.11
// 10:35) și § 10 (proba înainte, 11:21). Pe istoric (Binance 2022-01…2026-10, 6.932 de căderi, cu delistatele): A, B, C = N-AM AFLAT ⇒
// lista e ÎN PROBĂ: fapte + urmărire înainte, nu semnal; fără Poartă, fără sumă.
// O dată pe zi (de la 8:00 ora României): barele zilnice ÎNCHISE ale perpetuelor USDT crypto de pe Binance (o cerere pe monedă, prin clientul
// comun cu lățimea - aceeași frână la 429 / 418 și același plafon de greutate), căderile E de ieri cu etichetele A / B / C, ziua pe disc
// (eligibilii + evenimentele), apoi rezultatele zilelor vechi la 3 și 7 zile și proba P („după o spălare largă cumperi piața”, încercarea 6).
// Un singur rând în KV (`sugestii:caderi`, prin /api/istoric-bot?action=caderi). Funcțiile de calcul sunt pure (probele le rulează direct).
export const FAPI = "https://fapi.binance.com";
const ZI = 86400000, ORA = 3600000;
// § 3 din jurnal - aceleași cifre ca revenire_motor.py (REG); nu se reglează după rezultate
export const REG = {
  cadere: 0.25, fereastraMax: 30, pauza: 14, minBare: 90, volMin: 5e6, volFer: 30, volMinObs: 20,
  cost: 0.002, costStres: 0.004, oiScadere: 0.10, oiDecalaj: 3, fundingOre: 72,
  betaZile: 60, betaMin: 45, betaLim: [0, 3], sPrag: 0.5, topC: 20,
  bare: 200,                       // fereastra zilnică: E cere 92 de bare, reperul probei P cere eligibilitatea cu 60 de zile în urmă (≥ 150)
  start: "2026-11-07",             // § 10: prima zi UTC urmărită (jurnalul înghețat 11:21, ziua se închide la 02:00 ora României pe 08.11)
  bloc: 14, minUnitati: 8, minEvenimente: 30, priviri: [["2027-03-01", 0.01], ["2027-11-08", 0.04]],
  pLarga: 2, pEpisod: 3, pMinEpisoade: 8, pReperDe: 60, pReperPana: 4,
  lista: 10, sanatateMinElig: 100,
};
// § 2: indicii, stablecoin-urile, aurul / argintul (pe lângă underlyingType ≠ COIN)
export const EXCLUSE = new Set(["BTCDOMUSDT", "DEFIUSDT", "FOOTBALLUSDT", "BLUEBIRDUSDT", "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "BUSDUSDT", "USDPUSDT",
  "DAIUSDT", "EURUSDT", "AEURUSDT", "USD1USDT", "XUSDUSDT", "RLUSDUSDT", "XAUUSDT", "XAGUSDT", "PAXGUSDT", "XAUTUSDT"]);
// istoricul probei (§ 8, rularea REAL din 07.11 11:09) - cifrele fixe pe care pagina le arată lângă urmărirea înainte
export const ISTORIC = {
  E: { n: 6932, stat: -0.001, mediana: -0.016, pePlus: 0.40, h: 7 }, A: { n: 472, stat: 0.011, mediana: -0.012, pePlus: 0.42, p: 0.292, h: 3, faraExtreme: -0.0002 },
  B: { nPiata: 1703, nSingura: 5218, statBlocuri: 0.011, statMonede: -0.003, p: 0.583, h: 7 }, C: { n: 637, stat: 0.006, mediana: -0.016, pePlus: 0.40, p: 0.719, h: 7 },
  P: { episoade: 46, medie: 0.0036, mediana: 0.018, pePlus: 0.59, p: 0.374 },
};

export const ziUtc = (t) => new Date(t).toISOString().slice(0, 10);
// numărătorile din jurnal - „1 zi”, „25 de zile” (TextRo.cate; rezerva știe aceeași regulă, ca tura-sugestii / tura-idei)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const nr = (v) => { if (v == null || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));

/** Universul din exchangeInfo: perpetue USDT, TRADING, crypto (underlyingType COIN), fără excluse. */
export function univers(info) {
  // revizia 07.11: și contractele cu nume ne-ASCII (币安人生USDT …), ca în proba Python; în adrese numele se codifică (encodeURIComponent)
  return (info && Array.isArray(info.symbols) ? info.symbols : []).filter((s) => s && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT" && s.status === "TRADING"
    && (s.underlyingType == null || s.underlyingType === "COIN") && /USDT$/.test(String(s.symbol)) && !/[_\s]/.test(String(s.symbol)) && !EXCLUSE.has(s.symbol)).map((s) => s.symbol).sort();
}
/** Multiplicatorul contractului Binance (1000PEPE = 1.000 × PEPE): pagina împarte prețul, ca să se vadă prețul unei monede, ca pe Pionex. */
export function multBinance(s) { const m = String(s || "").match(/^(1000000|1000|1M)(?=[A-Z])/); return m ? (m[1] === "1000" ? 1000 : 1e6) : 1; }
/** Barele zilnice ÎNCHISE (closeTime < acum) din klines Binance: [{ t: începutul zilei UTC, c, qv }]. */
export function bareInchise(k, acum) {
  return (Array.isArray(k) ? k : []).map((x) => ({ t: nr(x && x[0]), c: nr(x && x[4]), qv: nr(x && x[7]), sf: nr(x && x[6]) }))
    .filter((b) => b.t != null && b.c > 0 && b.sf != null && b.sf < acum).map((b) => ({ t: b.t, c: b.c, qv: b.qv == null ? 0 : b.qv }))
    .sort((a, b) => a.t - b.t);
}
/** Panoul: zilele de la ziT − (n−1) la ziT; C / Q = tablouri pe zi × simbol (null = fără bară). */
export function panou(serii, ziT, n) {
  const t1 = Date.parse(ziT + "T00:00:00Z"), t0 = t1 - (n - 1) * ZI, sim = Object.keys(serii).sort();
  const C = Array.from({ length: n }, () => new Array(sim.length).fill(null)), Q = Array.from({ length: n }, () => new Array(sim.length).fill(null));
  sim.forEach((s, j) => { for (const b of serii[s] || []) { const i = Math.round((b.t - t0) / ZI); if (i >= 0 && i < n) { C[i][j] = b.c; Q[i][j] = b.qv; } } });
  return { zile: Array.from({ length: n }, (_, i) => ziUtc(t0 + i * ZI)), sim, C, Q };
}
function mediana(v) { const s = v.slice().sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; }
/** Eligibil (§ 3): ≥ 90 de bare înainte de i și mediana volumului pe [i−29, i] (cel puțin 20 de zile cu bară) ≥ 5 M USDT. Matricea zi × simbol. */
export function eligibil(p, r = REG) {
  const n = p.zile.length, m = p.sim.length, el = Array.from({ length: n }, () => new Array(m).fill(false)), med = Array.from({ length: n }, () => new Array(m).fill(null));
  for (let j = 0; j < m; j++) {
    let prim = -1; for (let i = 0; i < n; i++) if (p.C[i][j] != null) { prim = i; break; }
    if (prim < 0) continue;
    for (let i = 0; i < n; i++) {
      const v = []; for (let k = Math.max(0, i - r.volFer + 1); k <= i; k++) if (p.Q[k][j] != null && p.C[k][j] != null) v.push(p.Q[k][j]);
      med[i][j] = v.length >= r.volMinObs ? mediana(v) : null;
      el[i][j] = p.C[i][j] != null && i - prim >= r.minBare && med[i][j] != null && med[i][j] >= r.volMin;
    }
  }
  return { el, med };
}
function maxPe(C, j, a, b) { let m = null; for (let k = Math.max(0, a); k <= b; k++) if (C[k][j] != null && (m == null || C[k][j] > m)) m = C[k][j]; return m; }
/** Evenimentele E (§ 3): prima zi cu c ≤ 0,75 × max[t−29, t] și c(t−1) > 0,75 × max[t−30, t−1]; pauza: următorul abia la ultim + 15. [[i, j]]. */
export function evenimente(p, el, r = REG) {
  const out = [], prag = 1 - r.cadere;
  for (let j = 0; j < p.sim.length; j++) {
    let ultim = -1e9;
    for (let i = 1; i < p.zile.length; i++) {
      const c = p.C[i][j], cp = p.C[i - 1][j]; if (!el[i][j] || c == null || cp == null) continue;
      const M = maxPe(p.C, j, i - r.fereastraMax + 1, i), Mp = maxPe(p.C, j, i - r.fereastraMax, i - 1);
      if (M != null && Mp != null && c <= prag * M && cp > prag * Mp && i - ultim > r.pauza) { ultim = i; out.push([i, j]); }
    }
  }
  return out;
}
/** B (§ 3): β pe 60 de zile până la ziua de dinaintea maximului, tăiat în [0, 3]; s = (Rm − β·Rb) / Rm. */
export function parteProprie(C, i, j, jb, r = REG) {
  let m = -1, mx = null; for (let k = i - r.fereastraMax + 1; k <= i; k++) if (k >= 0 && C[k][j] != null && (mx == null || C[k][j] > mx)) { mx = C[k][j]; m = k; }
  const a = m - r.betaZile, b = m - 1; if (m < 0 || a < 1) return null;
  const xs = [], ys = [];
  for (let k = a; k <= b; k++) { const x0 = C[k - 1][jb], x1 = C[k][jb], y0 = C[k - 1][j], y1 = C[k][j]; if (x0 > 0 && x1 > 0 && y0 > 0 && y1 > 0) { xs.push(Math.log(x1 / x0)); ys.push(Math.log(y1 / y0)); } }
  if (xs.length < r.betaMin) return null;
  const mxx = xs.reduce((s, v) => s + v, 0) / xs.length, myy = ys.reduce((s, v) => s + v, 0) / ys.length;
  let cov = 0, vx = 0; for (let k = 0; k < xs.length; k++) { cov += (xs[k] - mxx) * (ys[k] - myy); vx += (xs[k] - mxx) ** 2; }
  if (!(vx > 0)) return null;
  const beta = Math.min(r.betaLim[1], Math.max(r.betaLim[0], cov / vx));
  if (!(C[i][jb] > 0) || !(C[m][jb] > 0)) return null;
  const Rm = Math.log(C[i][j] / C[m][j]), Rb = Math.log(C[i][jb] / C[m][jb]); if (!(Rm < 0)) return null;
  return { m, beta, Rm, Rb, s: (Rm - beta * Rb) / Rm };
}
/** Rangul de volum (C): 1 + câți eligibili au mediana mai mare. */
export function rangVolum(el, med, i, j) { let k = 1; for (let q = 0; q < med[i].length; q++) if (el[i][q] && med[i][q] > med[i][j]) k++; return k; }
const laSec = (t) => Math.round(Number(t) / 1000) * 1000;   // Binance: fundingTime are 1–26 ms peste ora exactă (proba carry) ⇒ rotunjit la secundă
/** A (§ 3): OI în contracte la sfârșitul zilei t față de sfârșitul zilei t−3 (ultimul instantaneu < începutul zilei următoare) și media funding-ului din cele 72 h. */
export function clasaA(oiIst, fundIst, intrare, r = REG) {
  const oiLa = (lim) => { let b = null; for (const x of Array.isArray(oiIst) ? oiIst : []) { const t = nr(x && x.timestamp), v = nr(x && x.sumOpenInterest); if (t != null && v > 0 && t < lim && (!b || t > b.t)) b = { t, v }; } return b && lim - b.t <= 2 * ORA ? b.v : null; };
  const o1 = oiLa(intrare), o0 = oiLa(intrare - r.oiDecalaj * ZI);
  const f = (Array.isArray(fundIst) ? fundIst : []).map((x) => ({ t: laSec(x && x.fundingTime), v: nr(x && x.fundingRate) })).filter((x) => x.v != null && x.t > intrare - r.fundingOre * ORA && x.t <= intrare);
  const fm = f.length ? f.reduce((s, x) => s + x.v, 0) / f.length : null, oi = o1 != null && o0 != null ? o1 / o0 - 1 : null;
  return { oi, f72: fm, A: oi != null && fm != null ? oi <= -r.oiScadere && fm < 0 : null };
}
/** Suma funding-ului pe (intrare, ieșire] - long plătește rata pozitivă. */
export function fundingSuma(fundIst, t0, t1) { const f = (Array.isArray(fundIst) ? fundIst : []).map((x) => ({ t: laSec(x && x.fundingTime), v: nr(x && x.fundingRate) })).filter((x) => x.v != null && x.t > t0 && x.t <= t1); return f.reduce((s, x) => s + x.v, 0); }
/** Ultima închidere ≤ indexul k (delistare / goluri), cel mult până la i (ziua intrării). */
export function inchidereLa(C, j, i, k) { for (let q = Math.min(k, C.length - 1); q >= i; q--) if (C[q][j] != null) return C[q][j]; return null; }
/** Piața pe h zile în ziua i: media simplă a randamentelor eligibililor (brut). */
export function piataH(p, el, i, h) { let s = 0, n = 0; for (let j = 0; j < p.sim.length; j++) if (el[i][j]) { const c1 = inchidereLa(p.C, j, i, i + h); if (c1 != null) { s += c1 / p.C[i][j] - 1; n++; } } return n ? s / n : null; }
/** Pionex: „PEPE_USDT_PERP” ⇒ baza „PEPE”; Binance „1000PEPEUSDT” / „1000000MOGUSDT” / „1MBABYDOGEUSDT” ⇒ baza fără multiplicator. */
export function bazaBinance(s) { return String(s || "").replace(/USDT$/, "").replace(/^(1000000|1000|1M)(?=[A-Z])/, ""); }
export function hartaPionex(tickere) { const h = {}; for (const x of Array.isArray(tickere) ? tickere : []) { const s = String(x && x.symbol || ""); const m = s.match(/^([A-Z0-9]+)_USDT_PERP$/); if (m) h[m[1]] = s; } return h; }

/** Ziua t: eligibilii, evenimentele E (fără A) și sănătatea - tot ce se poate din bare. */
export function ziua(p, r = REG) {
  const { el, med } = eligibil(p, r), i = p.zile.length - 1, jb = p.sim.indexOf("BTCUSDT");
  const nElig = el[i].filter(Boolean).length, ev = evenimente(p, el, r).filter((e) => e[0] === i);
  return {
    zi: p.zile[i], nElig, eligibili: Object.fromEntries(p.sim.map((s, j) => [s, el[i][j] ? p.C[i][j] : null]).filter((x) => x[1] != null)),
    ev: ev.map(([, j]) => {
      const pp = jb >= 0 && j !== jb ? parteProprie(p.C, i, j, jb, r) : null, mx = maxPe(p.C, j, i - r.fereastraMax + 1, i), rang = rangVolum(el, med, i, j);
      return { s: p.sim[j], c: p.C[i][j], cadere: mx ? 1 - p.C[i][j] / mx : null, vol: med[i][j], rang, C: rang <= r.topC, B: pp ? (pp.s < r.sPrag ? "piata" : "singura") : null, bs: pp ? pp.s : null, beta: pp ? pp.beta : null };
    }),
    el, med,
  };
}

// ---------- testul (§ 4) ----------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const medie = (v) => v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
/** p unilateral (H1: medie > 0) prin schimbarea semnelor; exact până la 14 unități. */
export function pSemne(v, reps = 20000, seed = 20261107) {
  const n = v.length, obs = medie(v) - 1e-15; let peste = 0;
  if (n <= 14) { const tot = 1 << n; for (let k = 0; k < tot; k++) { let s = 0; for (let q = 0; q < n; q++) s += (k >> q) & 1 ? -v[q] : v[q]; if (s / n >= obs) peste++; } return peste / tot; }
  const rnd = mulberry32(seed);
  for (let k = 0; k < reps; k++) { let s = 0; for (let q = 0; q < n; q++) s += rnd() < 0.5 ? -v[q] : v[q]; if (s / n >= obs) peste++; }
  return (peste + 1) / (reps + 1);
}
function grupeaza(l, cheie) { const m = new Map(); for (const x of l) { const k = cheie(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x.y); } return [...m.values()].map(medie); }
const blocDe = (zi, r = REG) => Math.floor((Date.parse(zi + "T00:00:00Z") - Date.parse(r.start + "T00:00:00Z")) / (r.bloc * ZI));
/** Testul grupului: l = [{ zi, s, y }]; stat = media blocurilor de 14 zile; p = max(p blocuri, p monede). */
export function testGrup(l, r = REG) {
  const v = l.filter((x) => x && Number.isFinite(x.y)), b = grupeaza(v, (x) => blocDe(x.zi, r)), m = grupeaza(v, (x) => x.s), ys = v.map((x) => x.y);
  const o = { n: v.length, blocuri: b.length, monede: m.length, stat: medie(b), medie: medie(ys), mediana: mediana(ys), pePlus: ys.length ? ys.filter((x) => x > 0).length / ys.length : null };
  if (v.length < r.minEvenimente || b.length < r.minUnitati || m.length < r.minUnitati) return { ...o, p: null, motiv: "prea devreme" };
  return { ...o, p: Math.max(pSemne(b), pSemne(m)) };
}
/** Contrastul B: pe blocurile și pe monedele cu ambele grupuri, media(a) − media(b). */
export function testContrast(la, lb, r = REG) {
  const dif = (cheie) => { const A = new Map(), B = new Map(); for (const x of la) { const k = cheie(x); (A.get(k) || A.set(k, []).get(k)).push(x.y); } for (const x of lb) { const k = cheie(x); (B.get(k) || B.set(k, []).get(k)).push(x.y); } return [...A.keys()].filter((k) => B.has(k)).map((k) => medie(A.get(k)) - medie(B.get(k))); };
  const db = dif((x) => blocDe(x.zi, r)), dm = dif((x) => x.s), o = { nA: la.length, nB: lb.length, blocuri: db.length, monede: dm.length, stat: medie(db), statMonede: medie(dm) };
  if (Math.min(la.length, lb.length) < r.minEvenimente || db.length < r.minUnitati || dm.length < r.minUnitati) return { ...o, p: null, motiv: "prea devreme" };
  return { ...o, p: Math.max(pSemne(db), pSemne(dm)) };
}
/** Holm pe {nume: p}: { nume: trece }. Familia rămâne ÎNTREAGĂ (revizia 07.11): un p lipsă („prea devreme”) contează ca 1, nu micșorează familia. */
export function holm(ps, alfa) { const ok = Object.entries(ps).map(([k, p]) => [k, p == null ? 1 : p]).sort((a, b) => a[1] - b[1]); const o = {}; let oprit = false; ok.forEach(([k, p], q) => { const t = !oprit && p <= alfa / (ok.length - q); oprit = oprit || !t; o[k] = t; }); return o; }
const ziMinus = (zi, n) => ziUtc(Date.parse(zi + "T00:00:00Z") - n * ZI);
/** O privire fixată (§ 10.3), judecată DOAR pe căderile închise înainte de ea (t + h ≤ ziua de dinaintea privirii): A cu zi ≤ L − 4, B / C cu zi ≤ L − 8.
 *  „Confirmat” cere: Holm pe A / B / C (familia întreagă), estimarea > 0 cu costul dublu și netul absolut > 0 (A, C). Revizia 07.11: înainte se
 *  judeca pe tot ce exista în ziua rulării, la fiecare rulare, sub eticheta privirii, și fără costul dublu. */
export function privire(ev, L, alfa, r = REG) {
  const pana = { 3: ziMinus(L, 4), 7: ziMinus(L, 8) };
  const P = (f, k, h) => ev.filter((e) => e.zi <= pana[h] && f(e) && Number.isFinite(e[k])).map((e) => ({ zi: e.zi, s: e.s, y: e[k] }));
  const g = { A: testGrup(P((e) => e.A === true, "y3", 3), r), C: testGrup(P((e) => e.C === true, "y7", 7), r), B: testContrast(P((e) => e.B === "piata", "yb7", 7), P((e) => e.B === "singura", "yb7", 7), r) };
  const abs = { A: testGrup(P((e) => e.A === true, "r3", 3), r), C: testGrup(P((e) => e.C === true, "r7", 7), r) };
  const H = holm({ A: g.A.p, B: g.B.p, C: g.C.p }, alfa), v = { la: L, alfa, pana: { A: pana[3], BC: pana[7] }, p: { A: g.A.p, B: g.B.p, C: g.C.p }, stat: { A: g.A.stat, B: g.B.stat, C: g.C.stat } };
  for (const k of ["A", "B", "C"]) {
    if (g[k].p == null) { v[k] = "prea devreme"; continue; }
    const stres = k === "B" || (g[k].stat != null && g[k].stat - (r.costStres - r.cost) > 0), net = k === "B" || (abs[k].stat != null && abs[k].stat > 0);
    v[k] = H[k] && stres && net ? "confirmat pe date noi" : "n-am aflat";
  }
  return v;
}
/** Proba P (§ 10.4): episoadele (ziua cu ≥ 2 A; zilele la ≤ 3 zile = același episod); verdictul O SINGURĂ dată - pe primele 8 episoade, sau la
 *  08.11.2027 pe cele închise până atunci (revizia 07.11: înainte se rejudeca la fiecare episod nou). */
export function probaP(zile, acum, r = REG) {
  const zP = zile.filter((z) => !z.incomplet && Number.isFinite(z.piata3) && Number.isFinite(z.reperP)).sort((a, b) => a.zi < b.zi ? -1 : 1);
  const ep = []; let ultim = null;
  for (const z of zP) if ((z.nA || 0) >= r.pLarga) { const t = Date.parse(z.zi + "T00:00:00Z"); if (ultim == null || t - ultim > r.pEpisod * ZI) ep.push({ zi: z.zi, nA: z.nA, y: z.piata3 - r.cost - z.reperP }); ultim = t; }
  const ys = ep.map((e) => e.y), P = { episoade: ep.length, medie: medie(ys), mediana: mediana(ys), pePlus: ys.length ? ys.filter((x) => x > 0).length / ys.length : null, ultime: ep.slice(-5) };
  const fin = r.priviri[r.priviri.length - 1][0], judecate = ep.length >= r.pMinEpisoade ? ep.slice(0, r.pMinEpisoade) : ziUtc(acum) >= fin ? ep.filter((e) => e.zi <= ziMinus(fin, 4)) : [];
  if (judecate.length) { const y = judecate.map((e) => e.y); P.judecate = y.length; P.pana = judecate[judecate.length - 1].zi; P.medieJudecate = medie(y); P.p = pSemne(y); P.verdict = P.p < 0.05 && P.medieJudecate > 0 ? "confirmat pe date noi" : "n-am aflat"; }
  return P;
}

/** Zilele cu rezultate ⇒ urmărirea pe grupuri (E, A, B, C, doar cifrele) + privirile fixate + proba P. zile = [{ zi, ev: [{ s, A, B, C, r3, r7 (net), y3, y7 (net − piață), yb3, yb7 }], piata3, reperP, nA }] */
export function urmarire(zile, acum, r = REG) {
  const ev = zile.filter((z) => !z.incomplet).flatMap((z) => (z.ev || []).map((e) => ({ ...e, zi: z.zi })));
  const L = (f, k) => ev.filter(f).filter((e) => Number.isFinite(e[k])).map((e) => ({ zi: e.zi, s: e.s, y: e[k] }));
  const g = { E: testGrup(L(() => true, "y7"), r), A: testGrup(L((e) => e.A === true, "y3"), r), C: testGrup(L((e) => e.C === true, "y7"), r),
    B: testContrast(L((e) => e.B === "piata", "yb7"), L((e) => e.B === "singura", "yb7"), r) };
  // privirile fixate (§ 10.3): 2027-03-01 (α 0,01) și 2027-11-08 (α 0,04); fiecare pe căderile închise până la ea (tura le scrie pe disc o dată)
  const azi = ziUtc(acum), priviri = r.priviri.filter(([d]) => azi >= d).map(([d, a]) => privire(ev, d, a, r));
  return { grupuri: g, priviri, verdict: priviri.length ? priviri[priviri.length - 1] : null, P: probaP(zile, acum, r), zile: zile.length, zileIncomplete: zile.filter((z) => z.incomplet).length, evenimente: ev.length };
}

// ---------- tura (I/O) ----------
/** d = { binance, cere, trimite, jurnal, citesteZi(zi), scrieZi(zi, o), listaZile(), acum? }; st = { zi, esecLa }. */
export async function turaCaderi(d, st, r = REG) {
  const acum = d.acum || Date.now();
  if (st.inLucru) return null;
  if (!d.forta && (oraRo(acum) < 8 || st.zi === ziRo(acum) || acum - (st.esecLa || 0) < 2 * ORA)) return null;
  st.inLucru = true;
  try {
    if (d.binance && typeof d.binance.reia === "function" && !d.binance.reia()) { d.jurnal("caderi: Binance a interzis IP-ul (418) - sar ziua"); st.esecLa = acum; return null; }
    const oprita = () => !!(d.binance && d.binance.stare && d.binance.stare.oprit);
    const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo"), U = univers(info), Uset = new Set(U);
    if (U.length < 100) { st.esecLa = acum; d.jurnal("caderi: universul Binance are doar " + cate(U.length, "monedă", "monede") + " - reîncerc peste 2 ore"); return null; }
    // simbolurile zilelor încă nejudecate (delistatele trebuie aduse și ele, pentru ultima închidere)
    const zileVechi = (d.listaZile() || []).map((z) => d.citesteZi(z)).filter(Boolean), deJudecat = new Set();
    for (const z of zileVechi) if (!z.gata3 || !z.gata7) { for (const s of Object.keys(z.eligibili || {})) deJudecat.add(s); for (const e of z.ev || []) deJudecat.add(e.s); }
    const toate = [...new Set([...U, ...deJudecat])], serii = {};
    let lipsa = 0;
    const lucru = toate.slice();
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let s = lucru.shift(); s; s = lucru.shift()) {
        const k = await d.binance(`${FAPI}/fapi/v1/klines?symbol=${encodeURIComponent(s)}&interval=1d&limit=${r.bare}`);
        if (Array.isArray(k)) serii[s] = bareInchise(k, acum); else lipsa++;
      }
    }));
    if (oprita()) { st.esecLa = acum; d.jurnal("caderi: tura oprită (" + d.binance.stare.oprit + ")"); return null; }
    const ziT = ziUtc(acum - ZI);   // ultima zi UTC închisă (tura rulează după 8:00 ora României = după 05/06:00 UTC)
    if (!serii.BTCUSDT || !serii.BTCUSDT.length || ziUtc(serii.BTCUSDT[serii.BTCUSDT.length - 1].t) !== ziT) { st.esecLa = acum; d.jurnal("caderi: bara BTC a zilei " + ziT + " lipsește - reîncerc peste 2 ore"); return null; }
    const p = panou(Object.fromEntries(Object.entries(serii).filter(([s]) => Uset.has(s) || deJudecat.has(s))), ziT, r.bare), i = p.zile.length - 1;
    // tickerele Pionex doar pentru listă: o cerere picată nu strică tura (revizia 07.11) - lista spune atunci că n-a putut afla
    let pionex = {}, pionexLipsa = false;
    try { const tk = ((await d.cere("/api/market?type=pionex_tickers&market=PERP")) || {}).data?.tickers; pionex = hartaPionex(tk); pionexLipsa = !Object.keys(pionex).length; } catch { pionexLipsa = true; }
    // ziua de ieri + zilele LIPSĂ (colectorul oprit, pană de curent): OI-ul Binance ține 30 de zile ⇒ se recuperează până la 20 de zile în urmă,
    // fiecare zi doar cu barele de până la ea (panoul tăiat la ziua k) - nimic din viitor. Revizia 07.11: o cerere OI / funding picată ⇒ ziua NU
    // se scrie (se reîncearcă peste 2 ore; peste 15 zile se scrie cu A lipsă, numărat); ziua de dinaintea probei se calculează doar pentru listă.
    let ziNoua = null, reincearca = 0;
    for (let k = Math.max(r.minBare + 2, i - 20); k <= i; k++) {
      const zk = p.zile[k];
      if ((zk < r.start && k !== i) || d.citesteZi(zk)) continue;
      const pk = { zile: p.zile.slice(0, k + 1), sim: p.sim, C: p.C.slice(0, k + 1), Q: p.Q.slice(0, k + 1) }, Z = ziua(pk, r), intrare = Date.parse(zk + "T00:00:00Z") + ZI;
      let esecA = 0;
      for (const e of Z.ev) {   // A: OI la 15 minute (sfârșitul zilei t și al zilei t−3) + funding-ul din cele 72 h
        const s = encodeURIComponent(e.s), [oi, fu] = await Promise.all([d.binance(`${FAPI}/futures/data/openInterestHist?symbol=${s}&period=15m&startTime=${intrare - (r.oiDecalaj * 24 + 3) * ORA}&endTime=${intrare + ORA}&limit=500`), d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${s}&startTime=${intrare - r.fundingOre * ORA - ORA}&endTime=${intrare + ORA}&limit=200`)]);
        if (!Array.isArray(oi) || !Array.isArray(fu)) esecA++;
        Object.assign(e, clasaA(oi, fu, intrare, r));
        e.pionex = pionex[bazaBinance(e.s)] || null;
      }
      if (oprita()) { st.esecLa = acum; d.jurnal("caderi: tura oprită în mijloc (" + d.binance.stare.oprit + ") - nimic scris, reîncerc peste 2 ore"); return null; }
      const z = { zi: zk, la: acum, nElig: Z.nElig, lipsa, incomplet: Z.nElig < r.sanatateMinElig || lipsa > 0.1 * toate.length, recuperata: k < i, inainteDeProba: zk < r.start, eligibili: Z.eligibili, nA: Z.ev.filter((e) => e.A === true).length, esecA,
        ev: Z.ev.map((e) => ({ s: e.s, c: e.c, cadere: e.cadere, vol: e.vol, rang: e.rang, C: e.C, B: e.B, bs: e.bs, beta: e.beta, A: e.A, oi: e.oi, f72: e.f72, pionex: e.pionex })) };
      // > 10% de monede fără bare (cereri picate) sau o cerere A picată ⇒ reîncerc peste 2 ore, nu scriu ziua (cu goluri) pentru totdeauna;
      // sub 100 de eligibili FĂRĂ lipsuri = piața așa cum e ⇒ ziua se scrie „incompletă” (nu intră în probă), fără reîncercări
      if (zk >= r.start) { if ((lipsa > 0.1 * toate.length || esecA) && k > i - 15) reincearca++; else d.scrieZi(zk, z); }
      if (k === i) ziNoua = z;
    }
    ziNoua = ziNoua || d.citesteZi(ziT);
    if (!ziNoua) { st.esecLa = acum; d.jurnal("caderi: ziua " + ziT + " nu s-a putut calcula - reîncerc peste 2 ore"); return null; }
    const incomplet = !!ziNoua.incomplet;
    // rezultatele zilelor vechi: la 3 și 7 zile (+ funding-ul pe ținere, long), piața din aceleași zile, reperul probei P. Revizia 07.11: o monedă
    // (cădere SAU eligibilă) care n-a venit azi, deși e încă pe Binance, ori un funding picat ⇒ ziua se reia (după 30 de zile se închide cu ce s-a
    // putut, marcată); o monedă DELISTATĂ (scoasă din univers) iese la ultima închidere văzută la rulările de dinainte (z.ultim), nu dispare.
    const el = eligibil(p, r).el, idx = Object.fromEntries(p.zile.map((z, q) => [z, q])), jIdx = Object.fromEntries(p.sim.map((s, j) => [s, j]));
    for (const z of (d.listaZile() || []).map((x) => d.citesteZi(x)).filter(Boolean)) {
      const iz = idx[z.zi]; if (iz == null || (z.gata3 && z.gata7)) continue;
      let schimbat = false;
      z.ultim = z.ultim || {};
      for (const sym of new Set([...Object.keys(z.eligibili || {}), ...(z.ev || []).map((e) => e.s)])) {
        const j = jIdx[sym]; if (j == null) continue;
        for (let q = i; q >= iz; q--) if (p.C[q][j] != null) { if (!z.ultim[sym] || z.ultim[sym][0] < p.zile[q]) { z.ultim[sym] = [p.zile[q], p.C[q][j]]; schimbat = true; } break; }
      }
      const inchide = (sym, h) => {   // { c, delistat } sau null = de reîncercat
        const j = jIdx[sym], c = j == null ? null : inchidereLa(p.C, j, iz, iz + h); if (c != null) return { c };
        const u = z.ultim[sym]; if (!Uset.has(sym) && u && u[0] >= z.zi && u[0] <= p.zile[Math.min(iz + h, i)]) return { c: u[1], delistat: true };
        return null;
      };
      for (const h of [3, 7]) {
        if (z["gata" + h] || iz + h > i) continue;
        const vechi = iz + h <= i - 30;
        // piața: media pe eligibilii PĂSTRAȚI ai zilei (c(t) de atunci), cu ultima închidere ≤ t+h
        let s = 0, n = 0, fara = 0;
        for (const [sym, c0] of Object.entries(z.eligibili || {})) { const x = inchide(sym, h); if (x && c0 > 0) { s += x.c / c0 - 1; n++; } else fara++; }
        const piata = n ? s / n : null, ies = (z.ev || []).map((e) => inchide(e.s, h));
        if ((fara || piata == null || ies.some((x) => !x)) && !vechi) continue;
        const t0 = Date.parse(z.zi + "T00:00:00Z") + ZI, t1 = t0 + h * ZI, fus = [];
        for (const e of z.ev || []) fus.push(await d.binance(`${FAPI}/fapi/v1/fundingRate?symbol=${encodeURIComponent(e.s)}&startTime=${t0}&endTime=${t1 + ORA}&limit=1000`));
        if (oprita()) { st.esecLa = acum; d.jurnal("caderi: tura oprită la judecată (" + d.binance.stare.oprit + ") - reîncerc peste 2 ore"); return null; }
        if (fus.some((fu) => !Array.isArray(fu)) && !vechi) continue;
        (z.ev || []).forEach((e, q) => {
          const x = ies[q], fu = fus[q];
          if (!x || !(e.c > 0) || piata == null) { e["lipsa" + h] = true; return; }
          const g = x.c / e.c - 1, f = Array.isArray(fu) ? fundingSuma(fu, t0, t1) : 0;
          e["g" + h] = g; e["f" + h] = f; e["r" + h] = g - r.cost - f; e["y" + h] = g - r.cost - f - piata; e["yb" + h] = g - piata;
          if (x.delistat) e["delistat" + h] = true;
          if (!Array.isArray(fu)) e["faraFunding" + h] = true;
        });
        z["piata" + h] = piata; z["fara" + h] = fara; z["gata" + h] = true; schimbat = true;
        if (h === 3) {   // proba P: reperul = media pieței pe 3 zile în zilele [t−60, t−4], din barele de acum (eligibilitatea zilei)
          const rp = []; for (let q = Math.max(r.minBare, iz - r.pReperDe); q <= iz - r.pReperPana; q++) { const v = piataH(p, el, q, 3); if (v != null) rp.push(v); }
          z.reperP = rp.length >= 30 ? medie(rp) : null;
        }
        if (fara > 0.1 * Object.keys(z.eligibili || {}).length) z.incomplet = true;
      }
      if (schimbat) d.scrieZi(z.zi, z);
    }
    const zile = (d.listaZile() || []).map((x) => d.citesteZi(x)).filter(Boolean).filter((z) => z.zi >= r.start);
    const U2 = urmarire(zile.filter((z) => z.gata3 || z.gata7), acum, r);
    // privirile și verdictul P se scriu O SINGURĂ dată (revizia 07.11): după aceea se citesc de pe disc, nu se mai recalculează
    U2.priviri = U2.priviri.map((v) => { const k = "privire-" + v.la, vechiV = d.citesteZi(k); if (vechiV) return vechiV; d.scrieZi(k, v); return v; });
    U2.verdict = U2.priviri.length ? U2.priviri[U2.priviri.length - 1] : null;
    if (U2.P.verdict) { const vp = d.citesteZi("privire-P"); if (vp) Object.assign(U2.P, { judecate: vp.judecate, pana: vp.pana, medieJudecate: vp.medieJudecate, p: vp.p, verdict: vp.verdict }); else d.scrieZi("privire-P", { judecate: U2.P.judecate, pana: U2.P.pana, medieJudecate: U2.P.medieJudecate, p: U2.P.p, verdict: U2.P.verdict, la: acum }); }
    const lista = ziNoua.ev.filter((e) => e.pionex).sort((a, b) => (b.vol || 0) - (a.vol || 0)).slice(0, r.lista)
      .map((e) => ({ s: e.pionex, b: e.s, mult: multBinance(e.s), c: e.c, cadere: e.cadere, vol: e.vol, rang: e.rang, A: e.A, oi: e.oi, f72: e.f72, B: e.B, bs: e.bs, beta: e.beta, C: e.C }));
    const corp = { la: acum, zi: ziT, nElig: ziNoua.nElig, nE: ziNoua.ev.length, nPionex: ziNoua.ev.filter((e) => e.pionex).length, nA: ziNoua.nA, incomplet, inainteDeProba: ziT < r.start, pionexLipsa, lista, urmarire: U2, istoric: ISTORIC, start: r.start };
    await d.trimite("/api/istoric-bot?action=caderi", corp);
    if (reincearca) { st.esecLa = acum; d.jurnal("caderi: " + cate(reincearca, "zi nescrisă", "zile nescrise") + " (cereri OI / funding picate sau bare lipsă) - lista e publicată, reîncerc peste 2 ore"); }
    else { st.zi = ziRo(acum); st.esecLa = 0; }
    d.jurnal("caderi: ziua " + ziT + " · " + cate(ziNoua.nElig, "monedă eligibilă", "monede eligibile") + " · " + cate(ziNoua.ev.length, "cădere", "căderi") + " (pe Pionex: " + corp.nPionex + "; cu spălare: " + ziNoua.nA + ")" + (incomplet ? " · INCOMPLETĂ" : "") + " · urmărite: " + cate(U2.evenimente, "eveniment", "evenimente") + " pe " + cate(U2.zile, "zi", "zile") + " · P: " + cate(U2.P.episoade, "episod", "episoade"));
    return corp;
  } finally { st.inLucru = false; }
}
