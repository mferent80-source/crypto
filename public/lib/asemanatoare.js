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
    var memo = {}, out = [], adxMemo = {}, GB = typeof GraficBot !== "undefined" && GraficBot && GraficBot.adx ? GraficBot : null;   // v100.100 (I-530)
    (Array.isArray(trades) ? trades : []).forEach(function (t) {
      // revizia 01.10: pe NET (comisioane + funding), pe suma reala pusa - regula „judecata se face pe net” (v100.40)
      var bazaInv = nr(t.pus) > 0 ? nr(t.pus) : nr(t.investit), net = nr(t.net);
      var jos = nr(t.jos), sus = nr(t.sus), p0 = nr(t.pretInit), pct = net !== null && bazaInv > 0 ? net / bazaInv : nr(t.pct), por = nr(t.pornit);
      if (jos === null || sus === null || !(p0 > 0) || !(sus > jos) || pct === null || por === null) return;
      var b = t.moneda in memo ? memo[t.moneda] : (memo[t.moneda] = bareDe(t.moneda) || null), stare = null, adx = null;
      if (b && b.length) {   // ultima bara de 1 h incheiata inainte de pornire (doar ce se stia atunci)
        var lo = 0, hi = b.length - 1, i = -1;
        while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ORA <= por) { i = m; lo = m + 1; } else hi = m - 1; }
        if (i >= 0) stare = PB.stareLa(b, i);
        // v100.100 (I-530): ADX 14 la aceeași bară (netezirea Wilder merge doar înainte - valoarea de la i nu vede barele de după)
        if (i >= 0 && GB) { var A = adxMemo[t.moneda] || (adxMemo[t.moneda] = GB.adx(b, 14)); if (A.adx[i] != null) adx = Math.round(A.adx[i] * 10) / 10; }
      }
      // latimea si pasul rotunjite: ~2.300 de cazuri incap in KV
      out.push({ id: String(t.id), moneda: t.moneda, dir: dirN(t.dir), lev: nr(t.levier) || 1, lat: Math.round((sus - jos) / p0 * 1e5) / 1e5, pas: nr(t.pasNet) !== null ? Math.round(t.pasNet * 1e6) / 1e6 : null, ora: new Date(por).getUTCHours(), stare: stare,
        pct: Math.round(pct * 10000) / 10000, ore: nr(t.durataOre) !== null ? Math.round(t.durataOre * 10) / 10 : null, adx: adx, t: por });
    });
    return out;
  }

  // v100.100 (I-530, el: „FA TOATE”): ADX la pornire vs cum s-a terminat botul, pe arhiva LUI. Regula fixată înainte de cifre (05.10):
  // „loc” = ADX sub 20, „trend” = peste 25; măsura = net / suma pusă (pct); diferența loc − trend pe „pe plus” și pe mediană, cu IC 95%
  // prin bootstrap pe MONEDE (o monedă cu mulți boți nu trage singură); „dovedit” doar dacă IC-ul exclude 0 și semnul e același pe primele 70%
  // și pe ultimele 30% din cazuri (după pornire). Prima măsurare (05.10, 528 de boți pe 51 de monede): nedovedit.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function zonaAdx(x) { return x < 20 ? "loc" : x <= 25 ? "nehotarat" : "trend"; }
  function bilantAdx(cz, o) {
    o = o || {}; var REP = o.rep || 2000, l = (Array.isArray(cz) ? cz : []).filter(function (c) { return c && nr(c.adx) !== null && nr(c.pct) !== null && c.moneda; });
    var pe = function (s, z) { return s.filter(function (c) { return zonaAdx(c.adx) === z; }); };
    var plus = function (s) { return s.length ? s.filter(function (c) { return c.pct > 0; }).length / s.length : NaN; };
    var md = function (s) { return med(s.map(function (c) { return c.pct; })); };
    var dPlus = function (s) { return plus(pe(s, "loc")) - plus(pe(s, "trend")); }, dMed = function (s) { return md(pe(s, "loc")) - md(pe(s, "trend")); };
    var gr = function (s) { return { n: s.length, plus: plus(s), med: s.length ? md(s) : null }; };
    var monede = {}; l.forEach(function (c) { (monede[c.moneda] = monede[c.moneda] || []).push(c); });
    var M = Object.keys(monede), loc = pe(l, "loc"), tr = pe(l, "trend");
    var out = { n: l.length, monede: M.length, loc: gr(loc), nehotarat: gr(pe(l, "nehotarat")), trend: gr(tr), difPlus: null, icPlus: null, difMed: null, icMed: null, verdict: "puține" };
    if (loc.length < 30 || tr.length < 30 || M.length < 10) return out;
    out.difPlus = dPlus(l); out.difMed = dMed(l);
    var rnd = mulberry32(530), bp = [], bm = [];
    for (var k = 0; k < REP; k++) {
      var s = []; for (var j = 0; j < M.length; j++) s = s.concat(monede[M[Math.floor(rnd() * M.length)]]);
      var a = dPlus(s), b = dMed(s); if (isFinite(a)) bp.push(a); if (isFinite(b)) bm.push(b);
    }
    var ic = function (d) { d.sort(function (x, y) { return x - y; }); return [d[Math.floor(d.length * 0.025)], d[Math.min(d.length - 1, Math.floor(d.length * 0.975))]]; };
    out.icPlus = ic(bp); out.icMed = ic(bm);
    var srt = l.slice().sort(function (x, y) { return (nr(x.t) || 0) - (nr(y.t) || 0); }), kk = Math.floor(srt.length * 0.7), A1 = srt.slice(0, kk), A2 = srt.slice(kk);
    out.felii = { primele: dMed(A1), ultimele: dMed(A2) };
    var semn = function (iv) { return iv[0] > 0 ? 1 : iv[1] < 0 ? -1 : 0; }, sm = semn(out.icMed), sp = semn(out.icPlus), s0 = sm || sp;
    var stabil = s0 !== 0 && (sm === 0 || sp === 0 || sm === sp) && Math.sign(out.felii.primele) === s0 && Math.sign(out.felii.ultimele) === s0;
    out.verdict = !s0 ? "nedovedit" : !stabil ? "nedovedit" : s0 > 0 ? "dovedit" : "pe dos";
    return out;
  }
  // rândul din citirea graficului: ce a mers la el, pe arhivă - fără să inventeze când nu e dovedit
  function textAdx(bl) {
    // cazurile fără ADX (colectorul încă pe o versiune veche) ⇒ nimic de spus, nu „prea puține (0)”
    if (!bl || !(bl.n > 0)) return null;
    if (bl.verdict === "puține") return "pe boții tăi: prea puține cazuri (" + bl.n + ")";
    var P = function (x) { return Math.round(x * 100) + "%"; };
    var cifre = "sub 20: " + P(bl.loc.plus) + " pe plus · peste 25: " + P(bl.trend.plus) + ", din " + bl.n;
    return bl.verdict === "dovedit" ? "pe boții tăi, porniți sub 20 au ieșit mai bine (" + cifre + ")"
      : bl.verdict === "pe dos" ? "pe boții tăi, porniți în trend au ieșit mai bine (" + cifre + ")"
      : "pe boții tăi nu s-a dovedit că ajută (" + cifre + ")";
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
  return { cazuri: cazuri, vecini: vecini, bilantAdx: bilantAdx, textAdx: textAdx, zonaAdx: zonaAdx };
})();
