// Referința INDEPENDENTĂ a indicatorilor (definițiile TradingView / Wilder, scrise de la zero - nimic luat din app.js):
// ema cu sămânța SMA, rma (Wilder) cu sămânța SMA, RSI, MACD, DMI / ADX, Stochastic (14,3,3) pe preț, Stochastic RSI (3,3,14,14), Bollinger %B
// (abaterea pe populație, ca ta.stdev), MFI (hlc3), Supertrend (10, 3). Intrare: bare [{t,o,h,l,c,v}] crescător.
export const sma = (a, n) => a.map((_, i) => (i < n - 1 ? NaN : a.slice(i - n + 1, i + 1).reduce((s, x) => s + x, 0) / n));
export function ema(a, n) {   // ca ta.ema: primele n - 1 = NaN, a n-a = media simplă
  const o = Array(a.length).fill(NaN), k = 2 / (n + 1); let st = a.findIndex((x) => Number.isFinite(x));
  if (st < 0 || a.length - st < n) return o;
  let v = a.slice(st, st + n).reduce((s, x) => s + x, 0) / n; o[st + n - 1] = v;
  for (let i = st + n; i < a.length; i++) { v = a[i] * k + v * (1 - k); o[i] = v; }
  return o;
}
export function rma(a, n) {   // Wilder: alfa = 1 / n, sămânța = media simplă a primelor n
  const o = Array(a.length).fill(NaN); let st = a.findIndex((x) => Number.isFinite(x));
  if (st < 0 || a.length - st < n) return o;
  let v = a.slice(st, st + n).reduce((s, x) => s + x, 0) / n; o[st + n - 1] = v;
  for (let i = st + n; i < a.length; i++) { v = (v * (n - 1) + a[i]) / n; o[i] = v; }
  return o;
}
export function rsi(c, n = 14) {
  const u = c.map((x, i) => (i ? Math.max(x - c[i - 1], 0) : NaN)), d = c.map((x, i) => (i ? Math.max(c[i - 1] - x, 0) : NaN));
  const g = rma(u, n), l = rma(d, n);
  return c.map((_, i) => (!Number.isFinite(g[i]) ? NaN : l[i] === 0 ? 100 : g[i] === 0 ? 0 : 100 - 100 / (1 + g[i] / l[i])));
}
export function macd(c) { const e12 = ema(c, 12), e26 = ema(c, 26), m = e12.map((x, i) => x - e26[i]), s = ema(m, 9); return { m, s, h: m.map((x, i) => x - s[i]) }; }
export function tr(h, l, c) { return c.map((_, i) => (i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) : h[i] - l[i])); }
export function dmi(h, l, c, n = 14) {
  const up = h.map((x, i) => (i ? x - h[i - 1] : NaN)), dn = l.map((x, i) => (i ? l[i - 1] - x : NaN));
  const pdm = up.map((x, i) => (!i ? NaN : x > dn[i] && x > 0 ? x : 0)), mdm = dn.map((x, i) => (!i ? NaN : x > up[i] && x > 0 ? x : 0));
  const t = tr(h, l, c).map((x, i) => (i ? x : NaN)), a = rma(t, n), p = rma(pdm, n), m = rma(mdm, n);
  const pdi = p.map((x, i) => 100 * x / a[i]), mdi = m.map((x, i) => 100 * x / a[i]);
  const dx = pdi.map((x, i) => (Number.isFinite(x) ? 100 * Math.abs(x - mdi[i]) / ((x + mdi[i]) || 1) : NaN));
  return { pdi, mdi, adx: rma(dx, n) };
}
const hh = (a, n, i) => Math.max(...a.slice(Math.max(0, i - n + 1), i + 1)), ll = (a, n, i) => Math.min(...a.slice(Math.max(0, i - n + 1), i + 1));
export function stoch(h, l, c, n = 14, sk = 3, sd = 3) {
  const raw = c.map((x, i) => (i < n - 1 ? NaN : (hh(h, n, i) === ll(l, n, i) ? 50 : 100 * (x - ll(l, n, i)) / (hh(h, n, i) - ll(l, n, i)))));
  const k = sma(raw, sk), d = sma(k, sd); return { raw, k, d };
}
export function stochRsi(c, nRsi = 14, nSt = 14, sk = 3, sd = 3) {
  const r = rsi(c, nRsi), raw = r.map((x, i) => { if (!Number.isFinite(x) || i < nRsi + nSt - 1) return NaN; const w = r.slice(i - nSt + 1, i + 1), mn = Math.min(...w), mx = Math.max(...w); return mx === mn ? 50 : 100 * (x - mn) / (mx - mn); });
  const k = sma(raw, sk), d = sma(k, sd); return { raw, k, d };
}
export function bb(c, n = 20, mult = 2) {
  const b = sma(c, n), sd = c.map((_, i) => { if (i < n - 1) return NaN; const w = c.slice(i - n + 1, i + 1), m = b[i]; return Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / n); });
  const up = b.map((x, i) => x + mult * sd[i]), lo = b.map((x, i) => x - mult * sd[i]);
  return { up, lo, pctB: c.map((x, i) => 100 * (x - lo[i]) / (up[i] - lo[i])) };
}
export function mfi(h, l, c, v, n = 14) {
  const tp = c.map((x, i) => (h[i] + l[i] + x) / 3);
  return c.map((_, i) => { if (i < n) return NaN; let p = 0, m = 0; for (let z = i - n + 1; z <= i; z++) { const f = tp[z] * v[z]; if (tp[z] > tp[z - 1]) p += f; else if (tp[z] < tp[z - 1]) m += f; } return m === 0 ? 100 : 100 - 100 / (1 + p / m); });
}
export function supertrend(h, l, c, n = 10, mult = 3) {
  const a = rma(tr(h, l, c), n), len = c.length, up = Array(len).fill(NaN), lo = Array(len).fill(NaN), dir = Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    if (!Number.isFinite(a[i])) continue;
    const mid = (h[i] + l[i]) / 2, bu = mid + mult * a[i], bl = mid - mult * a[i], prima = !Number.isFinite(up[i - 1]);
    up[i] = prima || bu < up[i - 1] || c[i - 1] > up[i - 1] ? bu : up[i - 1];
    lo[i] = prima || bl > lo[i - 1] || c[i - 1] < lo[i - 1] ? bl : lo[i - 1];
    dir[i] = prima ? 1 : dir[i - 1] === -1 ? (c[i] > up[i - 1] ? 1 : -1) : (c[i] < lo[i - 1] ? -1 : 1);   // 1 = urcă (prețul peste linie)
  }
  return { dir, linie: dir.map((d, i) => (d === 1 ? lo[i] : up[i])) };
}
export function toate(bare) {
  const h = bare.map((b) => b.h), l = bare.map((b) => b.l), c = bare.map((b) => b.c), v = bare.map((b) => b.v), i = c.length - 1;
  const e20 = ema(c, 20), e50 = ema(c, 50), e200 = ema(c, 200), r = rsi(c), m = macd(c), d = dmi(h, l, c), s = stoch(h, l, c), sr = stochRsi(c), B = bb(c), f = mfi(h, l, c, v), st = supertrend(h, l, c);
  return { n: c.length, t: bare[i].t, close: c[i], e20: e20[i], e50: e50[i], e200: e200[i], rsi: r[i], macdHist: m.h[i], macd: m.m[i], macdSig: m.s[i], adx: d.adx[i], pdi: d.pdi[i], mdi: d.mdi[i],
    stochK: s.k[i], stochD: s.d[i], stochRaw: s.raw[i], stochRsiK: sr.k[i], stochRsiD: sr.d[i], stochRsiRaw: sr.raw[i], bbPct: B.pctB[i], bbUp: B.up[i], bbLo: B.lo[i], mfi: f[i], st103: st.dir[i] === 1 ? "BULL" : "BEAR", st103Linie: st.linie[i] };
}
