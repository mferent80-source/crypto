// Indicatorii cu dovada (v100.47, I-471, pachetul 2b). Modul pur, probat in scripts/proba-v10047.mjs. Se incarca DUPA grid-calcul.js,
// grafic-bot.js si probabilitati.js. Pentru fiecare indicator APRINS acum pe barele de 4 h (RSI > 70 / < 30, pretul peste / sub banda
// Bollinger, EMA20 peste / sub EMA50, ADX > 25 / < 20): in trecutul monedei, cu el aprins, cat de des a fost atinsa marginea botului pe
// partea de pierdere (long: jos, short: sus, neutru: amandoua) in 24 h, fata de „de obicei” (toate pornirile). Intervalul Wilson cu z
// Bonferroni pentru m comparatii (backtest-expert: data mining bias) - „cu semn” doar daca nu-l cuprinde pe „de obicei”.
var Dovada = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var G = GridCalcul, GB = GraficBot, PB = Probabilitati, ORA = 3600000, H4 = 4 * ORA, ISTORIE = 720, PAS = 4, H = 24;
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  // ADX Wilder (n = 14): tr, +DM, -DM netezite, DX, ADX = media netezita a DX
  function adx(b, n) {
    var o = [], tr = 0, pd = 0, md = 0, dx = [], a = null;
    for (var i = 0; i < b.length; i++) {
      o.push(null); if (i === 0) continue;
      var up = b[i].h - b[i - 1].h, dn = b[i - 1].l - b[i].l, p = up > dn && up > 0 ? up : 0, m = dn > up && dn > 0 ? dn : 0;
      var t = Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c));
      if (i <= n) { tr += t; pd += p; md += m; if (i < n) continue; } else { tr = tr - tr / n + t; pd = pd - pd / n + p; md = md - md / n + m; }
      var pdi = tr > 0 ? 100 * pd / tr : 0, mdi = tr > 0 ? 100 * md / tr : 0, x = pdi + mdi > 0 ? 100 * Math.abs(pdi - mdi) / (pdi + mdi) : 0;
      if (a === null) { dx.push(x); if (dx.length === n) { a = dx.reduce(function (s, y) { return s + y; }, 0) / n; o[i] = a; } }
      else { a = (a * (n - 1) + x) / n; o[i] = a; }
    }
    return o;
  }
  // z pentru coada (alfa/m)/2 - Abramowitz & Stegun 26.2.23 (eroare < 5e-4)
  function zBonferroni(m) {
    var p = 0.05 / Math.max(1, m) / 2, t = Math.sqrt(-2 * Math.log(p));
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  }
  function wilsonZ(k, n, z) {
    if (!(n > 0)) return [0, 1];
    var p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - w) / d), Math.min(1, (c + w) / d)];
  }
  var STARI = [
    { cod: "rsi-sus", et: "RSI (4 h) peste 70", f: function (s, j) { return s.rsi[j] === null ? null : s.rsi[j] > 70; } },
    { cod: "rsi-jos", et: "RSI (4 h) sub 30", f: function (s, j) { return s.rsi[j] === null ? null : s.rsi[j] < 30; } },
    { cod: "bb-sus", et: "prețul peste banda Bollinger de sus (4 h)", f: function (s, j) { return s.bb[j] ? s.c[j] > s.bb[j].s : null; } },
    { cod: "bb-jos", et: "prețul sub banda Bollinger de jos (4 h)", f: function (s, j) { return s.bb[j] ? s.c[j] < s.bb[j].j : null; } },
    { cod: "ema-sus", et: "EMA20 peste EMA50 (4 h)", f: function (s, j) { return s.e20[j] === null || s.e50[j] === null ? null : s.e20[j] > s.e50[j]; } },
    { cod: "ema-jos", et: "EMA20 sub EMA50 (4 h)", f: function (s, j) { return s.e20[j] === null || s.e50[j] === null ? null : s.e20[j] < s.e50[j]; } },
    { cod: "adx-trend", et: "ADX (4 h) peste 25 — trend", f: function (s, j) { return s.adx[j] === null ? null : s.adx[j] > 25; } },
    { cod: "adx-fara", et: "ADX (4 h) sub 20 — fără trend", f: function (s, j) { return s.adx[j] === null ? null : s.adx[j] < 20; } }
  ];
  function peBot(bare, o) {
    o = o || {};
    var b = PB.pregateste(bare, o.acum), p = nr(o.pret), dir = String(o.dir || "").toLowerCase();
    if (b.length < ISTORIE + H || !(p > 0)) return null;
    // doar barele de 4 h INCHEIATE (o grupa de 4 h e completa cand i-a trecut sfarsitul)
    var u = b[b.length - 1].t + ORA, b4 = G.agrega(b, H4).filter(function (x) { return x.t + H4 <= u; });
    if (b4.length < 60) return null;
    var c = b4.map(function (x) { return x.c; }), s = { c: c, rsi: GB.rsi(c, 14), e20: GB.ema(c, 20), e50: GB.ema(c, 50), bb: GB.bollinger(c, 20, 2), adx: adx(b4, 14) };
    // ultima bara de 4 h incheiata la inchiderea barei de 1 h i (doar ce se stia atunci)
    var j4 = function (i) { var lim = b[i].t + ORA, lo = 0, hi = b4.length - 1, r = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b4[m].t + H4 <= lim) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
    var evs = [], jos = nr(o.jos), sus = nr(o.sus);
    if (dir !== "short" && jos !== null && jos < p) evs.push({ ev: "jos", rel: jos / p - 1 });
    if (dir !== "long" && sus !== null && sus > p) evs.push({ ev: "sus", rel: sus / p - 1 });
    var jAcum = b4.length - 1, aprinse = STARI.filter(function (x) { return x.f(s, jAcum) === true; });
    if (!evs.length || !aprinse.length) return { la: nr(o.acum) || Date.now(), m: 0, z: null, randuri: [] };
    var m = evs.length * aprinse.length, z = zBonferroni(m), out = [];
    evs.forEach(function (E) {
      var f = PB.atinge(E.rel), baza = { n: 0, k: 0 }, pe = {};
      aprinse.forEach(function (x) { pe[x.cod] = { n: 0, k: 0 }; });
      for (var i = b.length - 1 - H; i >= ISTORIE; i -= PAS) {
        if (b[i + H].t - b[i].t !== H * ORA) continue;
        var j = j4(i); if (j < 0) continue;
        var r = f(b, i, H) === "da" ? 1 : 0; baza.n++; baza.k += r;
        aprinse.forEach(function (x) { if (x.f(s, j) === true) { pe[x.cod].n++; pe[x.cod].k += r; } });
      }
      if (!baza.n) return;
      var pb = baza.k / baza.n;
      aprinse.forEach(function (x) {
        var q = pe[x.cod]; if (!q.n) return;
        var ni = Math.max(1, Math.min(q.n, Math.floor(q.n * PAS / H))), pp = q.k / q.n, ic = wilsonZ(Math.round(pp * ni), ni, z);
        var semn = ni < 10 ? null : ic[0] > pb ? "mai des" : ic[1] < pb ? "mai rar" : null;
        var marg = E.ev === "jos" ? "marginea de jos" : "marginea de sus";
        out.push({ cod: x.cod, et: x.et, ev: E.ev, p: pp, n: q.n, k: q.k, nIndep: ni, ic: ic, baza: pb, semn: semn,
          text: "Cu " + x.et + ", " + marg + " a fost atinsă în 24 h în " + Math.round(pp * 100) + "% din " + cate(q.n, "pornire", "porniri") + " (≈ " + ni + " independente), față de " + Math.round(pb * 100) + "% de obicei: "
            + (semn ? semn + " decât de obicei" : ni < 10 ? "prea puține cazuri ca să spună ceva" : "fără semn (diferența intră în zgomot)") + " (interval corectat pentru " + m + " comparații: " + Math.round(ic[0] * 100) + "–" + Math.round(ic[1] * 100) + "%)." });
      });
    });
    return { la: nr(o.acum) || Date.now(), m: m, z: z, randuri: out };
  }
  return { adx: adx, zBonferroni: zBonferroni, wilsonZ: wilsonZ, peBot: peBot, STARI: STARI };
})();
