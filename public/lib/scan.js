// Pagina Scan (v96, demo aprobat 27.09: claude.ai/artifact/BJ7Vnvv7QPKKj8FYbSwhod) - logica pura, probata in scripts/scan-v96.mjs.
// O singura lista pentru crypto (top 100 PERP Pionex) si actiuni (Nasdaq 100 + ale lui): rezumatul zilnic al fiecaruia
// (colectorul il face o data pe ora), retetele (intrebari in loc de filtre tehnice), scorul trendului, semaforul si
// starea pe fiecare perioada din randul deschis. Scorul DESCRIE cat de curat e trendul; nu e o predictie.
var Scan = (function () {
  "use strict";
  function nr(x) { var v = typeof x === "string" && x.trim() ? Number(x) : x; return typeof v === "number" && isFinite(v) ? v : null; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function ema(c, n) { var k = 2 / (n + 1), e = c[0]; for (var i = 1; i < c.length; i++) e = c[i] * k + e * (1 - k); return e; }
  function rsi(c, n) { n = n || 14; var g = 0, l = 0; for (var i = c.length - n; i < c.length; i++) { var d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } return l === 0 ? 100 : 100 - 100 / (1 + g / l); }

  // bare zilnice INCHISE {t,h,l,c,v?} (cea mai veche prima) -> rezumatul folosit de lista si de retete
  function rezumat(b) {
    b = (Array.isArray(b) ? b : []).filter(function (x) { return x && nr(x.c) > 0 && nr(x.h) > 0 && nr(x.l) > 0; });
    if (b.length < 60) return null;
    var c = b.map(function (x) { return x.c; }), u = c[c.length - 1], m = [];
    for (var i = Math.max(1, c.length - 90); i < c.length - 1; i++) m.push(Math.abs(c[i] / c[i - 1] - 1));
    m.sort(function (x, y) { return x - y; });
    var p75 = m[Math.floor(m.length * 0.75)] || 0, ch = (u / c[c.length - 2] - 1) * 100;
    var pr = b.slice(-21, -1), max20 = Math.max.apply(null, pr.map(function (x) { return x.h; })), min20 = Math.min.apply(null, pr.map(function (x) { return x.l; }));
    var tr = 0, n = 0;
    for (var j = b.length - 14; j < b.length; j++) { var x = b[j], a = b[j - 1]; tr += Math.max(x.h - x.l, Math.abs(x.h - a.c), Math.abs(x.l - a.c)); n++; }
    var vz = b.slice(-20).filter(function (x) { return nr(x.v) !== null; });
    return {
      p: u, ch: r2(ch), ch7: r2((u / c[c.length - 8] - 1) * 100), ch30: c.length > 31 ? r2((u / c[c.length - 31] - 1) * 100) : null,
      e20: u > ema(c.slice(-120), 20), e50: u > ema(c.slice(-200), 50), e200: c.length >= 200 ? u > ema(c, 200) : null,
      rsi: Math.round(rsi(c) * 10) / 10, mis: p75 > 0 ? r2(Math.abs(ch / 100) / p75) : null,
      sparge: u > max20, dMax20: r2((u / max20 - 1) * 100), dMin20: r2((u / min20 - 1) * 100), atrPct: r2(tr / n / u * 100),
      vol: vz.length ? Math.round(vz.reduce(function (s, x) { return s + x.v * x.c; }, 0) / vz.length) : null,
      spark: c.slice(-30).map(function (v) { return +v.toPrecision(5); })
    };
  }

  // forta fata de piata (BTC pentru monede, QQQ pentru actiuni) pe 7 zile, in puncte procentuale
  function fata(x, ref) { var a = nr(x && x.ch7), r = nr(ref); return a === null || r === null ? null : r2(a - r); }
  // scorul trendului 0..100: pretul peste 20/50/200, RSI sanatos, forta fata de piata, spargerea maximului
  function scor(x, rel) {
    var e200 = x.e200 == null ? 0.5 : x.e200 ? 1 : 0, r = nr(x.rsi), f = nr(rel);
    var s = (x.e20 ? 15 : 0) + (x.e50 ? 20 : 0) + 20 * e200 + (r !== null && r >= 50 && r <= 70 ? 15 : r !== null && r > 70 && r <= 80 ? 6 : 0)
      + (f === null ? 10 : Math.max(0, Math.min(20, 10 + f * 1.5))) + (x.sparge ? 10 : 0);
    return Math.round(s);
  }
  // semaforul: verde = trend curat, rosu = scade, galben = amestecat
  function semafor(x) {
    if (!x.e20 && !x.e50 && nr(x.ch30) !== null && x.ch30 < 0) return "r";
    if (x.e20 && x.e50 && x.e200 !== false && nr(x.rsi) !== null && x.rsi < 78) return "v";
    return "g";
  }

  // retetele: aceleasi reguli pe amandoua pietele; gridul doar pe crypto (T212 n-are boti)
  var RETETE = [
    { k: "toate", t: "Toate", sub: "tot universul", f: function () { return true; }, e: "Toată lista, ordonată după scor. Alege o rețetă ca să vezi doar ce răspunde la o întrebare." },
    { k: "grid", t: "🟦 Bun pentru grid", sub: "liniștit, lateral", f: function (x) { return x.fel === "c" && x.stare === "candidat" && !x.miscare && nr(x.rang) !== null && x.rang <= 60; },
      e: "Monede liniștite, cu volum mare și prețul care se întoarce des prin aceeași zonă: exact ce-i trebuie unui bot grid. Ordonate după clasamentul de grid (aceleași ca pe Home și pe „Grid: ce setez?”)." },
    { k: "trend", t: "📈 Trend confirmat", sub: "peste 20·50·200 zile", f: function (x) { return x.e20 && x.e50 && x.e200 !== false && nr(x.ch30) > 0 && x.rsi >= 50 && x.rsi <= 72; },
      e: "Prețul peste mediile de 20, 50 și 200 de zile, sus pe ultima lună, RSI între 50 și 72 (urcă, dar nu e deja fugit). Aceeași idee ca poarta de trend de la Trading 212." },
    { k: "revenire", t: "🔁 Revenire", sub: "vândut exagerat", f: function (x) { return nr(x.rsi) !== null && x.rsi < 35 && x.e200 !== false; },
      e: "RSI sub 35 (vândut peste măsură) la ceva care pe termen lung e încă pe creștere. Riscant: uneori scade mai departe. Se intră doar cu stop." },
    { k: "spargere", t: "🚀 Spargere", sub: "peste maximul pe 20 zile", f: function (x) { return !!x.sparge; },
      e: "Prețul de închidere a trecut peste cel mai mare preț din ultimele 20 de zile. Spargerile merg cel mai bine când și piața e pe urcare." },
    { k: "miscare", t: "⚡ Mișcare neobișnuită", sub: "≥2× obișnuitul și ≥3%", f: function (x) { return nr(x.mis) !== null && x.mis >= 2 && Math.abs(x.ch) >= 3; },
      e: "Aceeași regulă ca alertele pe Discord: azi s-a mișcat de cel puțin două ori mai mult ca de obicei și minimum 3%. De verificat de ce, înainte de orice." }
  ];
  function retete(x) { return RETETE.slice(1).filter(function (r) { return r.f(x); }).map(function (r) { return r.k; }); }

  // perioadele din randul deschis: 1 zi si 1 saptamana din barele pe ora, restul din cele zilnice
  // [cheie, nume, sursa (h/z), cate bare, zile]
  var PER = [["1Z", "1 zi", "h", 24, 1], ["1S", "1 săpt.", "h", 999, 7], ["15Z", "15 zile", "z", 16, 15], ["1L", "1 lună", "z", 31, 30], ["3L", "3 luni", "z", 91, 90], ["6L", "6 luni", "z", 183, 180], ["1A", "1 an", "z", 999, 365]];
  function per(k) { for (var i = 0; i < PER.length; i++) if (PER[i][0] === k) return PER[i]; return PER[3]; }
  // serie = { h: [[t ms, pret]...], z: [[t ms, pret]...] } (crescator)
  function puncte(serie, k) {
    var p = per(k), l = serie && Array.isArray(serie[p[2]]) ? serie[p[2]] : [];
    if (p[2] === "h") {
      if (!l.length) return [];
      var u = l[l.length - 1][0], de = p[4] * 86400000;
      return l.filter(function (q) { return q[0] > u - de; });
    }
    return l.slice(-p[3]);
  }
  // starea pe perioada: urca / scade / lateral (lateral = mai putin decat se misca de obicei in perioada aia) + unde e pretul
  function starePer(serie, k, atrPct, fel) {
    var p = per(k), l = puncte(serie, k); if (l.length < 2) return null;
    var a = l[0][1], b = l[l.length - 1][1], ch = (b / a - 1) * 100, mn = Infinity, mx = -Infinity;
    l.forEach(function (q) { if (q[1] < mn) mn = q[1]; if (q[1] > mx) mx = q[1]; });
    var zile = fel === "a" ? Math.max(1, p[4] * 5 / 7) : p[4], prag = Math.max(0.5, (nr(atrPct) || 2) * Math.sqrt(zile) * 0.5);
    var sens = Math.abs(ch) < prag ? "lateral" : ch > 0 ? "urca" : "scade";
    var loc = (b - mn) / ((mx - mn) || 1);
    var unde = loc >= 0.9 ? "lângă maxim" : loc <= 0.1 ? "lângă minim" : loc >= 0.6 ? "în partea de sus" : loc <= 0.4 ? "în partea de jos" : "la mijloc";
    return { ch: r2(ch), mn: mn, mx: mx, sens: sens, unde: unde, n: l.length };
  }
  var SENS = { urca: "↗ urcă", scade: "↘ scade", lateral: "↔ lateral" };
  function textAcum(serie, x) {
    var s1 = starePer(serie, "1S", x.atrPct, x.fel), s3 = starePer(serie, "3L", x.atrPct, x.fel), sem = semafor(x), p = [];
    if (s1) p.push("pe o săptămână " + SENS[s1.sens].slice(2) + " (" + semn(s1.ch) + ")");
    if (s3) p.push("pe 3 luni " + SENS[s3.sens].slice(2) + " (" + semn(s3.ch) + ") și acum e " + s3.unde + " pe 3 luni");
    return "Acum: " + (p.length ? p.join(", ") + ". " : "") + (sem === "v" ? "Trend curat." : sem === "r" ? "Trend în jos." : "Semnale amestecate.");
  }
  function semn(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + "%"; }

  // planul orientativ pe miscarea zilnica: stop la 2x, tinta la 3x, marimea la 1% risc din cont
  function plan(x, cont) {
    var a = nr(x.atrPct), p = nr(x.p); if (a === null || p === null || a <= 0) return null;
    var o = { stop: p * (1 - 2 * a / 100), tinta: p * (1 + 3 * a / 100), stopPct: -2 * a, tintaPct: 3 * a };
    var c = nr(cont); if (c !== null && c > 0) o.marime = Math.round(Math.min(c, c * 0.01 / (2 * a / 100)));
    return o;
  }

  return { rezumat: rezumat, fata: fata, scor: scor, semafor: semafor, RETETE: RETETE, retete: retete, PER: PER, puncte: puncte, starePer: starePer, SENS: SENS, textAcum: textAcum, plan: plan };
})();
if (typeof globalThis !== "undefined") globalThis.Scan = Scan;
