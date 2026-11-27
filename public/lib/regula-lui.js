// Regula LUI pe boții de semnal (PPST_Pionex_IND v1.3 / v1.4, 26.11.2026), în JS - portul la literă al motorului Python din
// pine-scripts\PIVOT-SUPERTREND\_proba-ppst-2026-11-26 (expo_motor.py + regula_macd_ppst.py; PPST = MonedeBot.ppst, portul lui ppst_motor.py).
// Paritatea cu Python: scripts/proba-v100396.mjs (secțiunea N) pe barele reale din scripts/proba-v100396-regula.json, tranzacție cu tranzacție.
//   MACD & RSI Overlay (Expo) © Zeiierman, CC BY-NC-SA 4.0 (setările lui implicite: trendFactor 30, scaling 2,5, Smooth 1, Signal 14)
//   Pivot Point SuperTrend © LonesomeTheBlue, MPL 2.0 (2 / 3 / 10)
// Regula: intrarea pe MACD; neconfirmată de PPST ⇒ iese la MACD contrar; confirmată (trendul PPST în direcția poziției) ⇒ iese pe stopul 60 % față
// de linia PPST sau la schimbarea PPST contra. dirn: 1 = Doar Long, -1 = Doar Short, 0 = Long + Short. Fără DOM; colectorul și pagina.
var RegulaLui = (function () {
  "use strict";
  var NAN = NaN;
  function sma(x, n) { var o = new Array(x.length).fill(NAN); for (var i = n - 1; i < x.length; i++) { var s = 0, ok = true; for (var k = i - n + 1; k <= i; k++) { if (isNaN(x[k])) { ok = false; break; } s += x[k]; } if (ok) o[i] = s / n; } return o; }
  function suma(x, n) { var o = new Array(x.length).fill(NAN); for (var i = n - 1; i < x.length; i++) { var s = 0, ok = true; for (var k = i - n + 1; k <= i; k++) { if (isNaN(x[k])) { ok = false; break; } s += x[k]; } if (ok) o[i] = s; } return o; }
  function rma(x, n) {
    var o = new Array(x.length).fill(NAN), a = 1 / n, prev = NAN;
    for (var i = 0; i < x.length; i++) {
      if (isNaN(prev)) { if (i >= n - 1) { var s = 0, ok = true; for (var k = i - n + 1; k <= i; k++) { if (isNaN(x[k])) { ok = false; break; } s += x[k]; } if (ok) prev = s / n; } }
      else if (!isNaN(x[i])) prev = a * x[i] + (1 - a) * prev;
      else prev = NAN;
      o[i] = prev;
    }
    return o;
  }
  // MACD Expo: liniile și încrucișările (over = MACD trece peste Signal, under = sub)
  function expo(c, trendFactor, scaling, signalLen) {
    trendFactor = trendFactor || 30; scaling = scaling || 2.5; signalLen = signalLen || 14;
    var n = c.length, priceMa = sma(c, 2), trendMa = sma(c, trendFactor), err = new Array(n), i;
    for (i = 0; i < n; i++) err[i] = Math.abs(priceMa[i] - trendMa[i]);
    var errSum = suma(err, 10), ama = new Array(n).fill(NAN);
    for (i = 0; i < n; i++) {
      if (errSum[i] === 0) ama[i] = i > 0 ? c[i - 1] : NAN;
      else if (!isNaN(errSum[i])) ama[i] = priceMa[i] * (err[i] / errSum[i]) + trendMa[i] * (1 - err[i] / errSum[i]);
    }
    var pma = new Array(n); for (i = 0; i < n; i++) pma[i] = scaling * c[i] + (1 - scaling) * (i > 0 ? ama[i - 1] : NAN);
    var macd = rma(pma, 5), signal = sma(pma, signalLen), over = new Array(n).fill(false), under = new Array(n).fill(false);
    for (i = 1; i < n; i++) if (!(isNaN(macd[i]) || isNaN(signal[i]) || isNaN(macd[i - 1]) || isNaN(signal[i - 1]))) { over[i] = macd[i] > signal[i] && macd[i - 1] <= signal[i - 1]; under[i] = macd[i] < signal[i] && macd[i - 1] >= signal[i - 1]; }
    return { macd: macd, signal: signal, over: over, under: under };
  }
  // starea MACD: 1 după o tăiere în sus, -1 după una în jos, 0 înainte de prima
  function stare(x) { var s = new Array(x.over.length), v = 0; for (var i = 0; i < s.length; i++) { v = x.over[i] ? 1 : x.under[i] ? -1 : v; s[i] = v; } return s; }
  // tranzacțiile regulii: [{ bar (intrarea), exit, dir, r (% brut), contra (% cel mai rău contra), cum ("stop" / "ppst" / "macd"), conf }]
  function treceri(o, h, l, c, trend, linia, mac, dirn, f) {
    var n = c.length, out = [], d = 0, e = -1, ent = NAN, stop = NAN, adv = 0, conf = false;
    for (var i = 1; i < n; i++) {
      var macUp = mac[i] === 1 && mac[i - 1] !== 1, macDn = mac[i] === -1 && mac[i - 1] !== -1, flipUp = trend[i] === 1 && trend[i - 1] === -1, flipDn = trend[i] === -1 && trend[i - 1] === 1;
      if (d !== 0 && i > e) adv = Math.max(adv, d === 1 ? (ent - l[i]) / ent * 100 : (h[i] - ent) / ent * 100);
      var px = null, cum = null;
      if (d !== 0 && i > e && f < 1 && !isNaN(stop) && (d === 1 ? l[i] <= stop : h[i] >= stop)) { px = d === 1 ? Math.min(o[i], stop) : Math.max(o[i], stop); cum = "stop"; }
      else if (d !== 0 && conf && ((d === 1 && flipDn) || (d === -1 && flipUp))) { px = c[i]; cum = "ppst"; }
      else if (d !== 0 && !conf && ((d === 1 && macDn) || (d === -1 && macUp))) { px = c[i]; cum = "macd"; }
      if (px !== null) { out.push({ bar: e, exit: i, dir: d, r: (px / ent - 1) * 100 * d, contra: Math.max(0, adv), cum: cum, conf: conf }); d = 0; }
      if (d === 0 && (((dirn === 1 || dirn === 0) && macUp) || ((dirn === -1 || dirn === 0) && macDn))) { d = macUp ? 1 : -1; e = i; ent = c[i]; stop = NAN; adv = 0; conf = false; }
      if (d !== 0 && !conf && Math.trunc(trend[i]) === d) conf = true;
      if (d !== 0 && conf && f < 1 && !isNaN(linia[i]) && (c[i] - linia[i]) * d > 0) { var cand = c[i] - f * (c[i] - linia[i]); stop = isNaN(stop) ? cand : d === 1 ? Math.max(stop, cand) : Math.min(stop, cand); }
    }
    out.deschisa = d !== 0 ? { bar: e, dir: d } : null;   /* poziția încă deschisă la ultima bară (nu e în listă; proba o numără) */
    return out;
  }
  // regula întreagă pe bare [{t,o,h,l,c}]: PPST 2 / 3 / 10 + MACD Expo + stopul 60 %; `deschisa` = poziția încă deschisă la ultima bară (prețul ei de acum)
  function pe(bare, dirn, f) {
    var o = bare.map(function (x) { return x.o; }), h = bare.map(function (x) { return x.h; }), l = bare.map(function (x) { return x.l; }), c = bare.map(function (x) { return x.c; });
    var P = MonedeBot.ppst(h, l, c, 2, 3, 10), tr = treceri(o, h, l, c, P.trend, P.stop, stare(expo(c)), dirn, f === undefined ? 0.6 : f);
    return tr;
  }
  return { sma: sma, suma: suma, rma: rma, expo: expo, stare: stare, treceri: treceri, pe: pe };
})();
if (typeof globalThis !== "undefined") globalThis.RegulaLui = RegulaLui;
