// Motorul „Technical Ratings” (TradingView), după regulile din help center 43000614331 — de cercetare, nu de produs.
// Fiecare indicator votează +1 / 0 / −1 pe bara i; grupul = media voturilor ne-na; nota = media celor două grupuri.
const na = (x) => x == null || Number.isNaN(x);
export function sma(a, n) { const o = new Array(a.length).fill(NaN); let s = 0, k = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (na(v)) { s = 0; k = 0; continue; } s += v; k++; if (k > n) { s -= a[i - n]; k = n; } if (k === n) o[i] = s / n; } return o; }
export function ema(a, n) { const o = new Array(a.length).fill(NaN), al = 2 / (n + 1); let p = NaN; for (let i = 0; i < a.length; i++) { const v = a[i]; if (na(v)) continue; p = na(p) ? v : al * v + (1 - al) * p; o[i] = p; } return o; }
export function rma(a, n) { const o = new Array(a.length).fill(NaN), al = 1 / n; let p = NaN, s = 0, k = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (na(v)) continue; if (na(p)) { s += v; k++; if (k === n) { p = s / n; o[i] = p; } continue; } p = al * v + (1 - al) * p; o[i] = p; } return o; }
export function wma(a, n) { const o = new Array(a.length).fill(NaN), den = (n * (n + 1)) / 2; for (let i = n - 1; i < a.length; i++) { let s = 0, ok = true; for (let j = 0; j < n; j++) { const v = a[i - j]; if (na(v)) { ok = false; break; } s += v * (n - j); } if (ok) o[i] = s / den; } return o; }
const highest = (a, n, i) => { if (i < n - 1) return NaN; let m = -Infinity; for (let j = i - n + 1; j <= i; j++) m = Math.max(m, a[j]); return m; };
const lowest = (a, n, i) => { if (i < n - 1) return NaN; let m = Infinity; for (let j = i - n + 1; j <= i; j++) m = Math.min(m, a[j]); return m; };
const dev = (a, n, i, m) => { let s = 0; for (let j = i - n + 1; j <= i; j++) s += Math.abs(a[j] - m); return s / n; };
const stoch = (src, hi, lo, n) => src.map((v, i) => { const h = highest(hi, n, i), l = lowest(lo, n, i); return na(h) ? NaN : h === l ? NaN : (100 * (v - l)) / (h - l); });
function rsi(c, n) { const up = c.map((v, i) => (i ? Math.max(v - c[i - 1], 0) : NaN)), dn = c.map((v, i) => (i ? Math.max(c[i - 1] - v, 0) : NaN)); const u = rma(up, n), d = rma(dn, n); return u.map((x, i) => (na(x) || na(d[i]) ? NaN : d[i] === 0 ? 100 : x === 0 ? 0 : 100 - 100 / (1 + x / d[i]))); }
const vot = (b, s) => (b ? 1 : s ? -1 : 0);
const medie = (v) => { const ok = v.filter((x) => !na(x)); return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN; };

// opt: { ichiDeplasat, cciSursa: "close"|"hlc3", trendMa: 50, bbpLen: 13 }
export function rating(k, opt = {}) {
  const o = k.map((x) => x.o), h = k.map((x) => x.h), l = k.map((x) => x.l), c = k.map((x) => x.c), v = k.map((x) => x.v), n = c.length, i = n - 1, p = i - 1;
  const ma = {};
  for (const L of [10, 20, 30, 50, 100, 200]) { ma["SMA" + L] = sma(c, L)[i]; ma["EMA" + L] = ema(c, L)[i]; }
  const hull = wma(wma(c, 4).map((x, j) => 2 * x - wma(c, 9)[j]), 3)[i];
  ma.HullMA9 = hull;
  const vw = sma(c.map((x, j) => x * v[j]), 20)[i] / sma(v, 20)[i]; ma.VWMA = vw;
  const votMA = {}; for (const [kk, val] of Object.entries(ma)) votMA[kk] = na(val) ? NaN : val < c[i] ? 1 : val > c[i] ? -1 : 0;
  // Ichimoku 9/26/52
  const don = (n2, j) => (highest(h, n2, j) + lowest(l, n2, j)) / 2;
  const conv = don(9, i), base = don(26, i);
  const jd = opt.ichiDeplasat ? i - 25 : i;   // norul la bara de acum, desenat cu 26 de bare în urmă
  const leadA = (don(9, jd) + don(26, jd)) / 2, leadB = don(52, jd);
  votMA.Ichimoku = [conv, base, leadA, leadB].some(na) ? NaN : vot(leadA > leadB && base > leadA && conv > base && c[i] > conv, leadA < leadB && base < leadA && conv < base && c[i] < conv);
  // oscilatoare
  const osc = {};
  const r = rsi(c, 14); osc.RSI = vot(r[i] < 30 && r[i] > r[p], r[i] > 70 && r[i] < r[p]);
  const kS = sma(stoch(c, h, l, 14), 3), dS = sma(kS, 3); osc.Stoch = vot(kS[i] < 20 && dS[i] < 20 && kS[i] > dS[i], kS[i] > 80 && dS[i] > 80 && kS[i] < dS[i]);
  const src = opt.cciSursa === "close" ? c : c.map((x, j) => (h[j] + l[j] + x) / 3); const smc = sma(src, 20); const cci = src.map((x, j) => (na(smc[j]) ? NaN : (x - smc[j]) / (0.015 * dev(src, 20, j, smc[j]))));
  osc.CCI = vot(cci[i] < -100 && cci[i] > cci[p], cci[i] > 100 && cci[i] < cci[p]);
  // DMI / ADX 14,14
  const tr = c.map((x, j) => (j ? Math.max(h[j] - l[j], Math.abs(h[j] - c[j - 1]), Math.abs(l[j] - c[j - 1])) : NaN));
  const pdm = h.map((x, j) => { if (!j) return NaN; const u = h[j] - h[j - 1], d = l[j - 1] - l[j]; return u > d && u > 0 ? u : 0; });
  const mdm = h.map((x, j) => { if (!j) return NaN; const u = h[j] - h[j - 1], d = l[j - 1] - l[j]; return d > u && d > 0 ? d : 0; });
  const atr = rma(tr, 14), pdi = rma(pdm, 14).map((x, j) => (100 * x) / atr[j]), mdi = rma(mdm, 14).map((x, j) => (100 * x) / atr[j]);
  const dx = pdi.map((x, j) => { const s = x + mdi[j]; return na(s) ? NaN : (100 * Math.abs(x - mdi[j])) / (s === 0 ? 1 : s); }), adx = rma(dx, 14);
  osc.ADX = vot(pdi[i] > mdi[i] && adx[i] > 20 && adx[i] > adx[p], pdi[i] < mdi[i] && adx[i] > 20 && adx[i] > adx[p]);
  if (opt.adxSellScade) osc.ADX = vot(pdi[i] > mdi[i] && adx[i] > 20 && adx[i] > adx[p], pdi[i] < mdi[i] && adx[i] > 20 && adx[i] < adx[p]);
  // AO
  const hl2 = h.map((x, j) => (x + l[j]) / 2), ao = sma(hl2, 5).map((x, j) => x - sma(hl2, 34)[j]);
  const aoB = (ao[i] > 0 && ao[p] < 0) || (ao[i] > 0 && ao[p] > 0 && ao[i] > ao[p] && ao[i - 2] > ao[p]);
  const aoS = (ao[i] < 0 && ao[p] > 0) || (ao[i] < 0 && ao[p] < 0 && ao[i] < ao[p] && ao[i - 2] < ao[p]);
  osc.AO = vot(aoB, aoS);
  const mom = c.map((x, j) => (j >= 10 ? x - c[j - 10] : NaN)); osc.Mom = vot(mom[i] > mom[p], mom[i] < mom[p]);
  const e12 = ema(c, 12), e26 = ema(c, 26), mac = e12.map((x, j) => x - e26[j]), sig = ema(mac, 9); osc.MACD = vot(mac[i] > sig[i], mac[i] < sig[i]);
  const tma = sma(c, opt.trendMa || 50), sus = c[i] > tma[i], jos = c[i] < tma[i];
  const kR = sma(stoch(r, r, r, 14), 3), dR = sma(kR, 3); osc.StochRSI = vot(jos && kR[i] < 20 && dR[i] < 20 && kR[i] > dR[i], sus && kR[i] > 80 && dR[i] > 80 && kR[i] < dR[i]);
  const wr = c.map((x, j) => { const hh = highest(h, 14, j), ll = lowest(l, 14, j); return na(hh) || hh === ll ? NaN : (100 * (x - hh)) / (hh - ll); }); osc.WR = vot(wr[i] < -80 && wr[i] > wr[p], wr[i] > -20 && wr[i] < wr[p]);
  const e13 = ema(c, opt.bbpLen || 13), bull = h.map((x, j) => x - e13[j]), bear = l.map((x, j) => x - e13[j]);
  osc.BBP = vot(sus && bear[i] < 0 && bear[i] > bear[p], jos && bull[i] > 0 && bull[i] < bull[p]);
  const bp = c.map((x, j) => (j ? x - Math.min(l[j], c[j - 1]) : NaN)), tr2 = c.map((x, j) => (j ? Math.max(h[j], c[j - 1]) - Math.min(l[j], c[j - 1]) : NaN));
  const avg = (n2) => { const s1 = sma(bp, n2), s2 = sma(tr2, n2); return s1.map((x, j) => x / s2[j]); };
  const a7 = avg(7), a14 = avg(14), a28 = avg(28), uo = a7.map((x, j) => (100 * (4 * x + 2 * a14[j] + a28[j])) / 7);
  osc.UO = vot(uo[i] > 70, uo[i] < 30);
  for (const kk of Object.keys(osc)) if (Number.isNaN(osc[kk])) osc[kk] = NaN;
  const MA = medie(Object.values(votMA)), OSC = medie(Object.values(osc));
  return { MA, OSC, ALL: (MA + OSC) / 2, votMA, osc, val: { rsi: r[i], stochK: kS[i], cci: cci[i], adx: adx[i], pdi: pdi[i], mdi: mdi[i], ao: ao[i], mom: mom[i], macd: mac[i], sig: sig[i], wr: wr[i], uo: uo[i] } };
}
export const clasa = (x) => (na(x) ? "—" : x < -0.5 ? "Strong Sell" : x < -0.1 ? "Sell" : x <= 0.1 ? "Neutral" : x <= 0.5 ? "Buy" : "Strong Buy");
