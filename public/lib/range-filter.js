// Range Filter (v100.300; el, 04.11.2026: „integrează și în Crypto Radar ca dash și în panel”) - partea PURĂ (fără DOM; proba o rulează în vm).
// Port exact al motorului din pine-scripts\RANGE-FILTER\Range_Filter_BS_v2_5.pine (v100.302: „de N bare” ca ta.barssince, ținerea = mediana, flip la banda opusă, z Bonferroni) (DonovanWall „Range Filter B&S” v4 + părțile din Trender):
//   - filtrul cu bandă moartă: se mișcă doar când close iese din ±r, r = multiplicator × EMA(EMA(|Δclose|, n), 2n−1); direcția lui = TREND SUS / JOS;
//   - BUY / SELL la schimbarea direcției cu prețul de partea bună (latch: un BUY nu se repetă până nu a fost un SELL);
//   - Trender: MA colorată (EMA hl2 15: verde = urcă ȘI close peste, roșu = coboară ȘI close sub), CONSOLIDAREA pe unghiul pantei EMA(hl2,5) / ATR
//     (media |unghi| pe 5 < pe 9), APRINDEREA (close trece peste / sub EMA(hl2,5), close peste / sub EMA(hl2,48), fără consolidare);
//   - DOVADA pe monedă: cât din semnale au mers în direcția lor după 10 bare (Wilson 95 %, ≥ 20 de cazuri), mișcarea zero = ratat.
// Cinstit (proba din 04.11.2026, Binance perp, 21 de perechi, 1h + 4h, cost 0,13 %, reguli scrise înainte, _proba-rf-2026-11-04): NIMIC dovedit -
// semnalul nu plătește după cost (1h +0,22 % la 20 de bare, marginea de jos −0,17 %; 4h −0,34 %), direcția nimerește 48 % la 10 bare, aprinderea
// nu plătește, consolidarea = 57 % din bare. E un COLORANT DE TREND curat (2,45 semnale / 100 bare, whipsaw 1 %), nu un semnal de intrare.
// Nimic din viitor: doar bare ÎNCHISE (GridCalcul.bare aruncă bara în formare).
var RangeFilter = (function () {
  var PER = 20, QTY = 3.5, COST = 0.0013, DIRH = 10, MIN_EP = 20;
  function nr(v) { if (v == null || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  // ta.ema din Pine: alpha = 2/(n+1), semința = prima valoare ne-null; null rămâne null până atunci
  function ema(x, n) {
    var a = 2 / (n + 1), out = new Array(x.length), prev = null;
    for (var i = 0; i < x.length; i++) { var v = x[i]; if (v == null || !isFinite(v)) { out[i] = prev; continue; } prev = prev == null ? v : a * v + (1 - a) * prev; out[i] = prev; }
    return out;
  }
  function rngSize(c, qty, n) {
    var d = new Array(c.length); d[0] = null; for (var i = 1; i < c.length; i++) d[i] = Math.abs(c[i] - c[i - 1]);
    var e1 = ema(d, n), e2 = ema(e1, 2 * n - 1), r = new Array(c.length);
    for (var j = 0; j < c.length; j++) r[j] = e2[j] == null ? null : e2[j] * qty;
    return r;
  }
  // banda moartă: filtrul se mișcă doar când close iese din ±r; pornirea = close[0] (array.new_float(2, x) la var)
  function rngFilt(c, r) {
    var f = new Array(c.length), prev = c[0];
    for (var i = 0; i < c.length; i++) { var cur = prev, ri = r[i]; if (ri != null) { if (c[i] - ri > prev) cur = c[i] - ri; if (c[i] + ri < prev) cur = c[i] + ri; } f[i] = cur; prev = cur; }
    return f;
  }
  // ta.rma pe True Range (semința = SMA pe primele n)
  function atr(h, l, c, n) {
    var out = new Array(c.length), acc = 0, prev = null;
    for (var i = 0; i < c.length; i++) {
      var tr = i === 0 ? h[0] - l[0] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (prev == null) { acc += tr; if (i === n - 1) { prev = acc / n; out[i] = prev; } else out[i] = null; }
      else { prev = (prev * (n - 1) + tr) / n; out[i] = prev; }
    }
    return out;
  }
  function median(a) { var v = a.filter(function (x) { return x != null && isFinite(x); }).sort(function (x, y) { return x - y; }); if (!v.length) return null; var m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
  // marginea de jos Wilson; z implicit 1,96 (95 % pe o singură monedă). v100.302: z mai mare când pagina arată multe monede (zBonf)
  function wilsonLo(k, n, z) { if (!(n > 0)) return null; z = z > 0 ? z : 1.96; var p = k / n; return (p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / (1 + z * z / n); }
  // inversa normalei (Acklam, eroare ~1e-9) și z-ul Bonferroni pentru m monede: pe o pagină cu 30 de monede, 1,96 pe fiecare dădea ~16 % din
  // pagini cu un DOVEDIT din noroc (simulare H0 în re-auditul din 05.11.2026); cu z(m) riscul pe toată pagina rămâne ~2,5 %
  function invNorm(p) {
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
    var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  function zBonf(m) { return invNorm(1 - 0.025 / Math.max(1, Math.floor(m) || 1)); }
  // motorul RF pe bare închise: filt, r, fdir (+1 / −1 / 0), buy, sell
  function motor(c, per, qty) {
    per = per || PER; qty = qty || QTY;
    var n = c.length, r = rngSize(c, qty, per), filt = rngFilt(c, r), fdir = new Array(n), buy = new Array(n), sell = new Array(n), condIni = 0;
    fdir[0] = 0;
    for (var i = 1; i < n; i++) fdir[i] = filt[i] > filt[i - 1] ? 1 : filt[i] < filt[i - 1] ? -1 : fdir[i - 1];
    for (var j = 0; j < n; j++) {
      var up = fdir[j] === 1, dn = fdir[j] === -1, neEgal = j > 0 && c[j] !== c[j - 1];
      var longCond = c[j] > filt[j] && neEgal && up, shortCond = c[j] < filt[j] && neEgal && dn, prev = condIni;
      condIni = longCond ? 1 : shortCond ? -1 : condIni;
      buy[j] = longCond && prev === -1; sell[j] = shortCond && prev === 1;
    }
    return { filt: filt, r: r, fdir: fdir, buy: buy, sell: sell };
  }
  // Trender: consolidarea, MA colorată, aprinderea (ca în Pine v2.1, fără sesiuni: crypto 24/7)
  function trender(h, l, c, atr14) {
    var n = c.length, hl2 = new Array(n); for (var i = 0; i < n; i++) hl2[i] = (h[i] + l[i]) / 2;
    var e5 = ema(hl2, 5), e48 = ema(hl2, 48), ma = ema(hl2, 15), ang = new Array(n), absang = new Array(n);
    for (var j = 0; j < n; j++) { var ok = j > 0 && e5[j] != null && e5[j - 1] != null && atr14[j] > 0; ang[j] = ok ? Math.atan((e5[j] - e5[j - 1]) / atr14[j]) * 180 / Math.PI : null; absang[j] = ang[j] == null ? null : Math.abs(ang[j]); }
    var eS = ema(absang, 5), eL = ema(absang, 9), cons = new Array(n), maCol = new Array(n), ignUp = new Array(n), ignDn = new Array(n);
    for (var k = 0; k < n; k++) {
      cons[k] = eS[k] != null && eL[k] != null && eS[k] < eL[k];
      maCol[k] = k > 0 && ma[k] != null && ma[k - 1] != null ? (ma[k] > ma[k - 1] && c[k] > ma[k] ? 1 : ma[k] < ma[k - 1] && c[k] < ma[k] ? -1 : 0) : 0;
      var xo = k > 0 && e5[k] != null && e5[k - 1] != null && c[k] > e5[k] && c[k - 1] <= e5[k - 1], xu = k > 0 && e5[k] != null && e5[k - 1] != null && c[k] < e5[k] && c[k - 1] >= e5[k - 1];
      ignUp[k] = c[k] > hl2[k] && xo && e48[k] != null && c[k] > e48[k] && !cons[k];
      ignDn[k] = c[k] < hl2[k] && xu && e48[k] != null && c[k] < e48[k] && !cons[k];
    }
    return { cons: cons, ang: ang, ma: ma, maCol: maCol, ignUp: ignUp, ignDn: ignDn };
  }
  // citirea pe o monedă: bare = [{t,o,h,l,c}] ÎNCHISE, crescător; opt.per / opt.qty / opt.cost (fracție) / opt.dirH
  function citire(bare, opt) {
    opt = opt || {};
    var per = opt.per || PER, qty = opt.qty || QTY, cost = opt.cost != null ? opt.cost : COST, dirH = opt.dirH || DIRH, minEp = opt.minEp || MIN_EP;
    var warm = 3 * (2 * per - 1);
    if (!Array.isArray(bare) || bare.length < warm + 20) return { eroare: "prea puține lumânări (" + (bare ? bare.length : 0) + ", trebuie cel puțin " + (warm + 20) + ") - monedă listată de curând?", scurt: true };
    var n = bare.length, h = [], l = [], c = [];
    for (var i = 0; i < n; i++) { var b = bare[i]; var hh = nr(b.h), ll = nr(b.l), cc = nr(b.c); if (hh == null || ll == null || cc == null) return { eroare: "lumânare fără preț" }; h.push(hh); l.push(ll); c.push(cc); }
    var m = motor(c, per, qty), a = atr(h, l, c, 14), t = trender(h, l, c, a), L = n - 1;
    // DOVADA: fiecare semnal închis după dirH bare, mișcarea zero = ratat; rata de bază 50 (semnale în ambele direcții)
    var dN = 0, dK = 0, nSig = 0, nWhip = 0, holds = [], lastSigBar = null, nBars = 0, nCons = 0, lastSide = 0, lastSigI = null, lastPrice = null, lastIgn = 0, lastIgnI = null;
    for (var j = warm; j < n; j++) {
      nBars++; if (t.cons[j]) nCons++;
      if (m.buy[j] || m.sell[j]) {
        nSig++; if (lastSigBar != null) { var hold = j - lastSigBar; holds.push(hold); if (hold <= 3) nWhip++; } lastSigBar = j;
        lastSide = m.buy[j] ? 1 : -1; lastSigI = j; lastPrice = c[j];
        if (j + dirH <= L) { dN++; if ((c[j + dirH] - c[j]) * lastSide > 0) dK++; }
      }
      if (t.ignUp[j] || t.ignDn[j]) { lastIgn = t.ignUp[j] ? 1 : -1; lastIgnI = j; }
    }
    // v100.302: „de N bare” = barele de la flip, ca ta.barssince(fdir != fdir[1]) din Pine (înainte era +1: „de 10 bare” lângă „BUY acum 9 bare”)
    var dir = m.fdir[L], bareDir = 0; for (var q = L; q > 0 && m.fdir[q] === dir; q--) bareDir++;
    if (q > 0 || m.fdir[0] !== dir) bareDir = Math.max(0, bareDir - 1);
    var atrL = a[L], filt = m.filt[L], r = m.r[L];
    var bandAtr = [], j0 = Math.max(warm, n - 100); for (var z = j0; z < n; z++) if (a[z] > 0 && m.r[z] != null) bandAtr.push(m.r[z] / a[z]);
    var dHit = dN > 0 ? dK / dN * 100 : null, dLo = dN > 0 ? wilsonLo(dK, dN) * 100 : null;
    var distPct = c[L] > 0 ? Math.abs(c[L] - filt) / c[L] : null;
    var semnalAcum = lastSigI === L;
    var tr = { fel: "asteapta", text: "ASTEAPTA" };
    if (semnalAcum && lastSide > 0) tr = { fel: "long", text: "GO LONG ACUM" };
    else if (semnalAcum && lastSide < 0) tr = { fel: "short", text: "GO SHORT ACUM" };
    else if (dir === 1) tr = { fel: "asteapta", text: "ASTEAPTA · long activ" };
    else if (dir === -1) tr = { fel: "asteapta", text: "ASTEAPTA · short activ" };
    var costNu = distPct != null && distPct < 2 * cost;
    return {
      n: n, pret: c[L], t: bare[L].t, dir: dir, bareDir: bareDir, filt: filt, r: r, atr: atrL,
      distAtr: atrL > 0 ? (c[L] - filt) / atrL : null, distPct: distPct, bandAtr: atrL > 0 && r != null ? r / atrL : null, bandMed: median(bandAtr),
      semnal: lastSide ? { fel: lastSide > 0 ? "BUY" : "SELL", acum: L - lastSigI, pret: lastPrice } : null, semnalAcum: semnalAcum,
      trigger: tr, costNu: costNu, cost: cost,
      regim: { cons: !!t.cons[L], ang: t.ang[L], consPct: nBars ? nCons / nBars * 100 : null },
      ma: { col: t.maCol[L], distAtr: atrL > 0 && t.ma[L] != null ? (c[L] - t.ma[L]) / atrL : null, aliniata: (t.maCol[L] === 1 && dir === 1) || (t.maCol[L] === -1 && dir === -1) },
      aprindere: lastIgn ? { fel: lastIgn > 0 ? "SUS" : "JOS", acum: L - lastIgnI } : null,
      dovada: { n: dN, k: dK, hit: dHit, lo: dLo, dovedit: dN >= minEp && dLo != null && dLo > 50 },
      // v100.302: flip = cât mai are close până la banda OPUSĂ (direcția se întoarce acolo, nu la filtru); ținerea = MEDIANA (ca reperul probei și Pine v2.4+)
      flipAtr: atrL > 0 && r != null ? (dir === 1 ? (c[L] - filt + r) / atrL : dir === -1 ? (filt + r - c[L]) / atrL : null) : null,
      sigPer100: nBars ? nSig / nBars * 100 : null, tinere: median(holds), whipPct: nSig > 1 ? nWhip / (nSig - 1) * 100 : null,
      buyuri: m.buy.filter(Boolean).length, selluri: m.sell.filter(Boolean).length
    };
  }
  return { PER: PER, QTY: QTY, COST: COST, DIRH: DIRH, MIN_EP: MIN_EP, ema: ema, rngSize: rngSize, rngFilt: rngFilt, atr: atr, motor: motor, trender: trender, wilsonLo: wilsonLo, zBonf: zBonf, citire: citire };
})();
if (typeof module !== "undefined" && module.exports) module.exports = RangeFilter;
