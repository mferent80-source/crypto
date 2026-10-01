// Profilul monedei (v100.45, pachetul 1, 01.10 - el: „sfaturile să fie adaptate și personalizate pentru fiecare monedă”).
// Modul pur (fara DOM, fara retea), probat in scripts/proba-v10045.mjs. Intrare: barele de 1 ORA ale monedei (6 luni, aduse
// noaptea de colector). Iese: cat se misca moneda intr-o zi (24 h) si intr-o jumatate de zi (12 h) OBISNUITA, ca distributie
// (21 de cuantile ale miscarii maxime fata de deschiderea ferestrei), pe toata perioada si pe ultimele 30 de zile.
// Ferestrele pornesc la fiecare 6 h; nIndep = cate ferestre NU se suprapun (pentru intervalele de incredere din pachetul 2).
// Pragurile sfaturilor (marginea, stopul, planul) se citesc din distributie; langa fiecare sfat se scrie de unde vine pragul.
var ProfilMoneda = (function () {
  "use strict";
  var ORA = 3600000, MIN_ZILE = 30, PAS_ORE = 6;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // ferestre de `ore` ore fara gauri; in fiecare, cat a coborat / urcat cel mult fata de deschidere (fractie)
  function excursii(bare, ore) {
    var jos = [], sus = [];
    for (var s = 0; s + ore <= bare.length; s += PAS_ORE) {
      if (bare[s + ore - 1].t - bare[s].t !== (ore - 1) * ORA) continue;
      var o = bare[s].o, lo = Infinity, hi = -Infinity;
      for (var i = s; i < s + ore; i++) { if (bare[i].l < lo) lo = bare[i].l; if (bare[i].h > hi) hi = bare[i].h; }
      jos.push(Math.max(0, 1 - lo / o)); sus.push(Math.max(0, hi / o - 1));
    }
    return { jos: jos, sus: sus };
  }
  function cuantile(v) {
    var a = v.slice().sort(function (x, y) { return x - y; }), q = [];
    for (var k = 0; k <= 20; k++) { var p = k / 20 * (a.length - 1), i = Math.floor(p), f = p - i; q.push(i + 1 < a.length ? a[i] + (a[i + 1] - a[i]) * f : a[i]); }
    return q.map(function (x) { return Math.round(x * 1e6) / 1e6; });
  }
  function distributie(bare, ore) {
    var e = excursii(bare, ore);
    if (!e.jos.length) return null;
    return { jos: cuantile(e.jos), sus: cuantile(e.sus), n: e.jos.length, nIndep: Math.floor(e.jos.length * PAS_ORE / ore) };
  }
  function botiPeMoneda(trades) {
    var l = (Array.isArray(trades) ? trades : []).map(function (t) { return { v: nr(t && t.net) !== null ? nr(t.net) : nr(t && t.rezultat), ore: nr(t && t.durataOre) }; }).filter(function (x) { return x.v !== null; });
    if (!l.length) return null;
    var ore = l.map(function (x) { return x.ore; }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
    return { n: l.length, pePlus: l.filter(function (x) { return x.v > 0; }).length, net: Math.round(l.reduce(function (s, x) { return s + x.v; }, 0) * 100) / 100, oreMediana: ore.length ? ore[Math.floor(ore.length / 2)] : null };
  }
  // v100.52 (actiunile T212, pachetul 1): adaptorul de piata - bare ZILNICE, doar zilele de bursa; ferestre de 1 si 5 zile pornind
  // la fiecare zi; saritura la deschidere (deschiderea vs inchiderea de ieri) e o distributie SEPARATA; zilele-eveniment (saritura
  // strict peste P98, de obicei rezultatele) si split-urile (|saritura| > 40%) scot ferestrele care le contin din ziua obisnuita.
  function calculeazaActiuni(bare, o) {
    var acum = nr(o.acum) || Date.now();
    var b = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && nr(x.c) > 0 && x.t < acum; })
      .sort(function (a, c) { return a.t - c.t; });
    if (b.length < 120) return null;
    var n = b.length, gap = [null], split = [false], i, j;
    for (i = 1; i < n; i++) { var g = b[i].o / b[i - 1].c - 1; gap.push(g); split.push(Math.abs(g) > 0.4); }
    var absG = []; for (i = 1; i < n; i++) if (!split[i]) absG.push(Math.abs(gap[i]));
    absG.sort(function (a, c) { return a - c; });
    var x98 = (absG.length - 1) * 0.98, lo98 = Math.floor(x98), p98 = absG.length ? absG[lo98] + ((absG[Math.min(absG.length - 1, lo98 + 1)] - absG[lo98]) * (x98 - lo98)) : 0;
    var ev = gap.map(function (g, k) { return k > 0 && !split[k] && Math.abs(g) > p98 + 1e-9; });
    function distr(k) {
      var jos = [], sus = [];
      for (var s = 1; s + k <= n; s++) {
        var rau = false; for (j = s; j < s + k; j++) if (split[j] || ev[j]) { rau = true; break; }
        if (rau) continue;
        var o0 = b[s].o, mn = Infinity, mx = -Infinity;
        for (j = s; j < s + k; j++) { if (b[j].l < mn) mn = b[j].l; if (b[j].h > mx) mx = b[j].h; }
        jos.push(Math.max(0, 1 - mn / o0)); sus.push(Math.max(0, mx / o0 - 1));
      }
      return jos.length ? { jos: cuantile(jos), sus: cuantile(sus), n: jos.length, nIndep: Math.floor(jos.length / k) } : null;
    }
    var sar = [], evG = [], evT = [];
    for (i = 1; i < n; i++) { if (split[i]) continue; if (ev[i]) { evG.push(Math.abs(gap[i])); evT.push(b[i].t); } else sar.push(Math.max(0, -gap[i])); }
    evG.sort(function (a, c) { return a - c; });
    var z1 = distr(1), z5 = distr(5);
    if (!z1 || !z5 || !sar.length) return null;
    return { v: 1, piata: "actiuni", simbol: String(o.simbol || ""), la: acum, deLa: b[0].t, panaLa: b[n - 1].t, zile: n, z1: z1, z5: z5,
      sar: { jos: cuantile(sar), n: sar.length },
      evenimente: { n: evG.length, zile: evT.slice(-20), mediana: evG.length ? evG[Math.floor(evG.length / 2)] : null, max: evG.length ? evG[evG.length - 1] : null } };
  }
  function calculeaza(bare, o) {
    o = o || {};
    if (o.piata === "actiuni") return calculeazaActiuni(bare, o);
    var acum = nr(o.acum) || Date.now();
    var b = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && x.t + ORA <= acum; }).sort(function (a, c) { return a.t - c.t; });
    if (b.length < MIN_ZILE * 24) return null;
    var r30 = b.filter(function (x) { return x.t >= acum - 30 * 24 * ORA; });
    return { v: 1, simbol: String(o.simbol || ""), la: acum, deLa: b[0].t, panaLa: b[b.length - 1].t, zile: Math.round((b[b.length - 1].t - b[0].t) / (24 * ORA)),
      z24: distributie(b, 24), z12: distributie(b, 12), r30: r30.length >= 20 * 24 ? { z24: distributie(r30, 24), z12: distributie(r30, 12) } : null, boti: botiPeMoneda(o.trades) };
  }
  // in cate ferestre miscarea a ajuns cel putin la dist (citit pe cuantile, liniar intre ele)
  function frecventa(q, dist) {
    var d = nr(dist);
    if (!Array.isArray(q) || q.length !== 21 || d === null) return null;
    if (d <= q[0]) return 1;
    if (d > q[20]) return 0;
    for (var k = 0; k < 20; k++) if (d <= q[k + 1]) { var w = q[k + 1] - q[k], f = w > 0 ? (d - q[k]) / w : 1; return Math.round((1 - (k + f) / 20) * 1000) / 1000; }
    return 0;
  }
  function prag(p, fer, parte, cu) {
    var q = p && p[fer] && p[fer][parte];
    if (!Array.isArray(q) || q.length !== 21) return null;
    var x = Math.max(0, Math.min(1, nr(cu) === null ? 0.75 : cu)) * 20, i = Math.floor(x);
    return i >= 20 ? q[20] : q[i] + (q[i + 1] - q[i]) * (x - i);
  }
  function moneda(s) { return String(s || "").toUpperCase().replace(/_USDT(_PERP)?$/, "").replace(/\.PERP$/, "").replace(/_US_EQ$|_EQ$/, ""); }
  function sursa(p) {
    if (p && p.piata === "actiuni") return "profilul " + (moneda(p.simbol) || "acțiunii") + ": " + p.zile + " zile de bursă (bare zilnice)";   // v100.52
    return p ? "profilul " + (moneda(p.simbol) || "monedei") + ": " + p.zile + " de zile de bare de 1 h" : "prag fix (profilul monedei n-a venit încă de la colector)";
  }
  // v100.52 (actiunile T212): stopul care urca al pozitiei - coborarea obisnuita pe 5 zile de bursa (P75)
  function pragStopActiune(p) {
    if (!p || p.piata !== "actiuni") return null;
    var d = prag(p, "z5", "jos", 0.75);
    return d === null ? null : { dist: d, sursa: sursa(p) };
  }
  function praguriMargine(p) {
    var j = prag(p, "z12", "jos", 0.75), s = prag(p, "z12", "sus", 0.75);
    // revizia 01.10: si frecventa(parte, dist) - in cate jumatati de zi moneda a ajuns atat de departe (textul spune cifra adevarata)
    return j === null || s === null ? null : { jos: j, sus: s, sursa: sursa(p), frecventa: function (parte, d) { return frecventa(p.z12 && p.z12[parte], d); } };
  }
  function pragStop(p, dir) {
    if (dir !== "long" && dir !== "short") return null;
    var d = prag(p, "z24", dir === "long" ? "jos" : "sus", 0.75);
    return d === null ? null : { dist: d, sursa: sursa(p) };
  }
  var PR = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  // I-475: planul pe minus potrivit monedei. dist = cat trebuie sa mearga pretul impotriva botului ca planul sa fie atins;
  // laDist(d) = totalul botului daca pretul merge d impotriva lui. Prag propus = atins in cel mult 1 zi din 4 (P75 pe 24 h).
  function planPeMoneda(o) {
    var p = o && o.profil, dir = o && o.dir, d = nr(o && o.dist);
    if (!p || (dir !== "long" && dir !== "short") || !(d > 0)) return null;
    var parte = dir === "long" ? "jos" : "sus", f = frecventa(p.z24 && p.z24[parte], d), dp = prag(p, "z24", parte, 0.75);
    if (f === null || dp === null) return null;
    var suma = typeof o.laDist === "function" ? nr(o.laDist(dp)) : null, semn = dir === "long" ? "−" : "+";
    var text = "O zi obișnuită a monedei ajunge la planul tău (" + semn + PR(d) + " de preț) în " + Math.round(f * 100) + "% din zile"
      + (d < dp ? ". Pentru cel mult 1 zi din 4: " + semn + PR(dp) + " de preț" + (suma !== null ? " ≈ " + U(suma) : "") : " — mai rar de 1 zi din 4, planul încape")
      + " (" + sursa(p) + ").";
    return { frecventa: f, dist: d, distPropusa: dp, sumaPropusa: suma, avertizare: f > 0.5, maiStrans: d < dp, sursa: sursa(p), text: text };
  }
  return { pragStopActiune: pragStopActiune, calculeaza: calculeaza, frecventa: frecventa, prag: prag, sursa: sursa, moneda: moneda, praguriMargine: praguriMargine, pragStop: pragStop, planPeMoneda: planPeMoneda };
})();
