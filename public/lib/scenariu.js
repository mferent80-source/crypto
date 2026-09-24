// "Ce se intampla daca pretul ajunge la X" si "cat de des a ajuns acolo in
// trecut" - modul pur, probat in scripts/scenariu-v77.mjs.
//
// Scenariul e o APROXIMARE a unui grid aritmetic pe futures: la coborare botul
// cumpara cate `perVolume` la fiecare nivel trecut (pozitia creste, pretul mediu
// scade); la urcare vinde cate `perVolume` si incaseaza diferenta fata de pretul
// mediu. Nu stie comisioanele viitoare, finantarea si alunecarea - de aceea se
// scrie "aproximativ", iar pretul la care modelul goleste contul botului se pune
// langa estimarea Pionex, ca omul sa vada cat de aproape e modelul de realitate.
var Scenariu = (function () {
  "use strict";
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }

  // Datele gridului din buOrderData (brut Pionex) + campurile rutei.
  function grid(brut, bot) {
    var x = (brut && brut.buOrderData) || {};
    var jos = nr(x.bottom), sus = nr(x.top), randuri = nr(x.row), q = nr(x.perVolume);
    var poz = nr(x.position), mediu = nr(x.positionOpenPrice), marja = nr(x.marginBalance);
    var inv = bot ? nr(bot.investit) : null, pret = bot ? nr(bot.pretCurent) : null;
    var trend = String(x.trend || (bot && bot.directie) || "").toLowerCase();
    var lipsa = [];
    if (!(jos > 0) || !(sus > jos)) lipsa.push("intervalul gridului");
    if (!(randuri >= 1)) lipsa.push("numărul de niveluri");
    if (!(q > 0)) lipsa.push("cantitatea pe nivel");
    if (poz === null || mediu === null) lipsa.push("poziția");
    if (marja === null) lipsa.push("marja botului");
    if (inv === null) lipsa.push("suma investită");
    if (!(pret > 0)) lipsa.push("prețul de acum");
    if (trend !== "long" && trend !== "short") lipsa.push("direcția botului (merge doar pentru long/short)");
    return { jos: jos, sus: sus, pas: (jos > 0 && sus > jos && randuri >= 1) ? (sus - jos) / randuri : null,
      randuri: randuri, q: q, poz: poz === null ? null : Math.abs(poz), mediu: mediu, marja: marja, inv: inv,
      pret: pret, semn: trend === "short" ? -1 : 1, lipsa: lipsa };
  }

  // Starea botului daca pretul ajunge la X (mers intr-un singur sens, de la pretul de acum).
  function la(g, X) {
    var N = g.poz, A = g.mediu, realizat = 0, s = g.semn, n = g.randuri;
    for (var i = 0; i <= n; i++) {
      var L = g.jos + i * g.pas;
      // long: cumpara pe niveluri SUB pretul de acum pana la X; vinde pe cele de DEASUPRA.
      // short: invers (vinde in urcare = creste pozitia short; cumpara in coborare = o reduce).
      var inCrestere = s > 0 ? (L < g.pret && L >= X) : (L > g.pret && L <= X);
      var inScadere = s > 0 ? (L > g.pret && L <= X) : (L < g.pret && L >= X);
      if (inCrestere) { A = (N * A + g.q * L) / (N + g.q); N += g.q; }
      else if (inScadere && N > 0) { var cat = Math.min(g.q, N); realizat += s * cat * (L - A); N -= cat; }
    }
    var nerealizat = s * N * (X - A);
    var echitate = g.marja + realizat + nerealizat;
    return { pret: X, pozitie: N, pretMediu: N > 0 ? A : null, realizat: realizat, nerealizat: nerealizat,
      echitate: echitate, total: echitate - g.inv, gol: echitate <= 0 };
  }

  // Pretul la care, in model, contul botului s-ar goli (cautare prin injumatatire).
  function pretGolire(g) {
    var s = g.semn, lo, hi;
    if (s > 0) { lo = g.pret * 1e-4; hi = g.pret; if (la(g, lo).echitate > 0) return null; }
    else { lo = g.pret; hi = g.pret * 20; if (la(g, hi).echitate > 0) return null; }
    for (var k = 0; k < 80; k++) {
      var m = (lo + hi) / 2, gol = la(g, m).echitate <= 0;
      if (s > 0) { if (gol) lo = m; else hi = m; } else { if (gol) hi = m; else lo = m; }
    }
    return s > 0 ? hi : lo;
  }

  function scenarii(brut, bot, tinte) {
    var g = grid(brut, bot);
    if (g.lipsa.length) return { ok: false, motiv: "Nu pot calcula fără " + g.lipsa.join(", ") + "." };
    return { ok: true, grid: g, pretGolire: pretGolire(g),
      randuri: (tinte || []).filter(function (t) { return t && t.pret > 0; }).map(function (t) {
        var r = la(g, t.pret); r.eticheta = t.eticheta; r.miscare = 100 * (t.pret - g.pret) / g.pret; return r; }) };
  }

  function wilson(k, n) {
    if (!n) return null;
    var z = 1.96, p = k / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d;
    var j = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return { jos: Math.max(0, 100 * (m - j)), sus: Math.min(100, 100 * (m + j)) };
  }

  // Cat de des, in trecutul monedei, pretul s-a miscat cel putin cat e de la
  // pretul de acum pana la `tinta`, intr-o fereastra de `bare` bare inchise.
  // Ferestrele NU se suprapun (altfel acelasi episod s-ar numara de mai multe ori).
  function sansaAtingere(randuri, pretAcum, tinta, bare) {
    if (!(pretAcum > 0) || !(tinta > 0) || !Array.isArray(randuri)) return { valoare: null, cazuri: 0, motiv: "date lipsă" };
    var v = [];
    for (var i = 0; i < randuri.length; i++) {
      var r = randuri[i]; if (!r) continue;
      var t = nr(Array.isArray(r) ? r[0] : r.time), h = nr(Array.isArray(r) ? r[2] : r.high),
        l = nr(Array.isArray(r) ? r[3] : r.low), c = nr(Array.isArray(r) ? r[4] : r.close);
      if (t === null || h === null || l === null || c === null || !(c > 0)) continue;
      v.push({ t: t, h: h, l: l, c: c });
    }
    v.sort(function (a, b) { return a.t - b.t; });
    v.pop(); // bara in formare
    var jos = tinta < pretAcum, prag = tinta / pretAcum, cazuri = 0, atins = 0;
    for (var s = 0; s + bare < v.length; s += bare) {
      var c0 = v[s].c, extrem = jos ? Infinity : -Infinity;
      for (var k = s + 1; k <= s + bare; k++) extrem = jos ? Math.min(extrem, v[k].l) : Math.max(extrem, v[k].h);
      cazuri++;
      if (jos ? extrem <= c0 * prag : extrem >= c0 * prag) atins++;
    }
    if (cazuri < 10) return { valoare: null, cazuri: cazuri, motiv: "sub 10 ferestre în istoric" };
    return { valoare: 100 * atins / cazuri, cazuri: cazuri, atinse: atins, ic: wilson(atins, cazuri), stare: cazuri >= 30 ? "dovedit" : "putin" };
  }

  return { grid: grid, la: la, pretGolire: pretGolire, scenarii: scenarii, sansaAtingere: sansaAtingere };
})();
if (typeof globalThis !== "undefined") globalThis.Scenariu = Scenariu;
