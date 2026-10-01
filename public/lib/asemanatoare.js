// Situatiile asemanatoare pe botii lui (v100.47, I-469, pachetul 2b). Modul pur, probat in scripts/proba-v10047.mjs; se incarca DUPA
// probabilitati.js. Din arhiva botilor inchisi: ce se stia la pornire (directie, levier, latimea si pasul gridului, ora, starea pietei din
// barele de DINAINTE) si cum s-a terminat (% din investitie, durata). Vecinii: aceeasi directie, apoi cei mai apropiati pe latime, pas,
// levier si stare. Descriere a trecutului lui, nu promisiune; sub 10 vecini nu spune nimic.
var Asemanatoare = (function () {
  "use strict";
  var PB = Probabilitati, ORA = 3600000, K = 40, MIN = 10;
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  // directia ca in arhiva: long / short / neutru (Pionex da „no_trend” pentru neutru - revizia 01.10)
  function dirN(d) { d = String(d || "").toLowerCase(); return d === "long" || d === "short" ? d : "neutru"; }
  function cazuri(trades, bareDe) {
    var memo = {}, out = [];
    (Array.isArray(trades) ? trades : []).forEach(function (t) {
      // revizia 01.10: pe NET (comisioane + funding), pe suma reala pusa - regula „judecata se face pe net” (v100.40)
      var bazaInv = nr(t.pus) > 0 ? nr(t.pus) : nr(t.investit), net = nr(t.net);
      var jos = nr(t.jos), sus = nr(t.sus), p0 = nr(t.pretInit), pct = net !== null && bazaInv > 0 ? net / bazaInv : nr(t.pct), por = nr(t.pornit);
      if (jos === null || sus === null || !(p0 > 0) || !(sus > jos) || pct === null || por === null) return;
      var b = t.moneda in memo ? memo[t.moneda] : (memo[t.moneda] = bareDe(t.moneda) || null), stare = null;
      if (b && b.length) {   // ultima bara de 1 h incheiata inainte de pornire (doar ce se stia atunci)
        var lo = 0, hi = b.length - 1, i = -1;
        while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ORA <= por) { i = m; lo = m + 1; } else hi = m - 1; }
        if (i >= 0) stare = PB.stareLa(b, i);
      }
      // latimea si pasul rotunjite: ~2.300 de cazuri incap in KV
      out.push({ id: String(t.id), moneda: t.moneda, dir: dirN(t.dir), lev: nr(t.levier) || 1, lat: Math.round((sus - jos) / p0 * 1e5) / 1e5, pas: nr(t.pasNet) !== null ? Math.round(t.pasNet * 1e6) / 1e6 : null, ora: new Date(por).getUTCHours(), stare: stare,
        pct: Math.round(pct * 10000) / 10000, ore: nr(t.durataOre) !== null ? Math.round(t.durataOre * 10) / 10 : null });
    });
    return out;
  }
  function dist(c, t) {
    var d = Math.abs(Math.log(c.lat / t.lat)) / Math.LN2 + Math.abs((nr(c.lev) || 1) - (nr(t.lev) || 1)) / 5;
    d += c.pas > 0 && t.pas > 0 ? Math.abs(Math.log(c.pas / t.pas)) / Math.LN2 : 0.5;
    d += !c.stare || !t.stare ? 0.5 : c.stare === t.stare ? 0 : c.stare.split("-")[0] === t.stare.split("-")[0] ? 0.5 : 1;
    return d;
  }
  function med(l) { var a = l.slice().sort(function (x, y) { return x - y; }); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; }
  var PR = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  function vecini(cz, t, o) {
    var dir = dirN(t && t.dir);
    var l = (Array.isArray(cz) ? cz : []).filter(function (c) { return c && c.dir === dir && c.lat > 0 && t && t.lat > 0; })
      .map(function (c) { return { c: c, d: dist(c, t) }; }).filter(function (x) { return x.d <= 2; }).sort(function (a, b) { return a.d - b.d; }).slice(0, K).map(function (x) { return x.c; });
    if (l.length < MIN) return { n: l.length, pePlus: null, medianaPct: null, ceaMaiReaPct: null, medianaOre: null, text: "Prea puține situații asemănătoare în boții tăi (" + l.length + ") ca să spun ceva." };
    var pct = l.map(function (c) { return c.pct; }), ore = l.map(function (c) { return c.ore; }).filter(function (x) { return x !== null; });
    var m = med(pct), rau = Math.min.apply(null, pct), plus = pct.filter(function (x) { return x > 0; }).length / l.length, inv = nr(t.investit), mo = med(ore);
    // „piata la fel” doar cu acoperire: la cati vecini se stie starea si e chiar aceeasi (revizia 01.10: doar ~20% din arhiva are stare)
    var laFel = t.stare ? l.filter(function (c) { return c.stare === t.stare; }).length : 0;
    return { n: l.length, pePlus: plus, medianaPct: m, ceaMaiReaPct: rau, medianaOre: mo, laFel: laFel,
      text: "În " + l.length + " de situații asemănătoare (aceeași direcție, lățime, pas și levier apropiate" + (t.stare ? "; piață la fel la " + laFel + " din " + l.length : "") + "), boții tăi: median " + PR(m) + (inv > 0 ? " (" + U(m * inv) + " pe suma asta)" : "")
        + ", " + Math.round(plus * 100) + "% pe plus, cel mai rău " + PR(rau) + (inv > 0 ? " (" + U(rau * inv) + ")" : "") + (mo !== null ? "; au ținut de obicei ~" + Math.round(mo) + " h" : "") + ". E trecutul tău, nu o promisiune." };
  }
  return { cazuri: cazuri, vecini: vecini };
})();
