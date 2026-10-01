// Probabilitatile din istoric (v100.46, pachetul 2a, 01.10 - el: „partea de probabilități bazate pe istoric ... mai aprofundată”).
// Modul pur, probat in scripts/proba-v10046.mjs. Se incarca DUPA grid-calcul.js. Pe barele de 1 ORA ale monedei (6 luni, colectorul):
// FRECVENTE din trecut, nu predictii. Pornirile la fiecare 4 h, doar cele al caror orizont s-a incheiat; starea la pornire din barele
// de pana atunci (regimul fisei pe 1 h: 4 h si 24 h fata de obisnuitul ultimelor 30 de zile); „ca acum” = aceeasi stare (sub 5 cazuri
// independente: toate zilele, spus). Cazurile independente = ferestrele care nu se suprapun; intervalul Wilson pe ele.
var Probabilitati = (function () {
  "use strict";
  var G = GridCalcul, ORA = 3600000, ISTORIE = 720, PAS = 4, MIN_INDEP = 5;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // doar barele INCHEIATE pana la acum, in ordine
  function pregateste(bare, acum) {
    var a = nr(acum) || Date.now();
    return (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && x.t + ORA <= a; }).sort(function (x, y) { return x.t - y.t; });
  }
  function stareLa(bare, i) {
    if (!Array.isArray(bare) || i < ISTORIE || i >= bare.length) return null;
    var r = G.regimPeBare(bare.slice(i - ISTORIE, i + 1), 4, 24);
    return !r ? null : r.miscare ? (r.sens === "coboara" ? "miscare-jos" : "miscare-sus") : "liniste";
  }
  function indep(n, H) { return Math.max(1, Math.min(n, Math.floor(n * PAS / H))); }
  // ev(bare, i, H, st) -> rezultatul ferestrei care incepe la inchiderea barei i (sir); se numara cele egale cu `asteptat`
  function frecventa(bare, H, ev, asteptat, stareAcum, opt) {
    if (!Array.isArray(bare) || !(H > 0)) return null;
    var tot = { n: 0, k: 0 }, sel = { n: 0, k: 0 }, memo = (opt && opt.memo) || {};
    var st = function (i) { if (!(i in memo)) memo[i] = stareLa(bare, i); return memo[i]; };
    for (var i = bare.length - 1 - H; i >= ISTORIE; i -= PAS) {
      if (bare[i + H].t - bare[i].t !== H * ORA) continue;   // fereastra cu gaura nu se numara
      var r = ev(bare, i, H, st); if (r === null || r === undefined) continue;
      tot.n++; if (r === asteptat) tot.k++;
      if (stareAcum && st(i) === stareAcum) { sel.n++; if (r === asteptat) sel.k++; }
    }
    var cond = !!stareAcum && sel.n > 0 && indep(sel.n, H) >= MIN_INDEP;
    if (opt && opt.doarConditionat && !cond) return null;
    var x = cond ? sel : tot;
    if (!x.n) return null;
    var ni = indep(x.n, H), ki = Math.round(x.k / x.n * ni);
    return { p: x.k / x.n, n: x.n, k: x.k, nIndep: ni, ic: G.wilson(ki, ni), orizontOre: H, conditionat: cond, stare: cond ? stareAcum : null };
  }
  function atinge(rel) {
    return function (b, i, H) {
      var niv = b[i].c * (1 + rel);
      for (var j = i + 1; j <= i + H; j++) if (rel < 0 ? b[j].l <= niv : b[j].h >= niv) return "da";
      return "nu";
    };
  }
  // cine e atins INTAI: tinta (relT) sau stopul (relS); amandoua in aceeasi bara -> stop (pesimist)
  function cursa(relT, relS) {
    return function (b, i, H) {
      var t = b[i].c * (1 + relT), s = b[i].c * (1 + relS), sus = relT > relS;
      for (var j = i + 1; j <= i + H; j++) {
        var aS = sus ? b[j].l <= s : b[j].h >= s, aT = sus ? b[j].h >= t : b[j].l <= t;
        if (aS) return "stop";
        if (aT) return "tinta";
      }
      return "niciuna";
    };
  }
  function pentruBot(bare, o) {
    o = o || {};
    var b = pregateste(bare, o.acum), p = nr(o.pret), dir = String(o.dir || "").toLowerCase();
    if (b.length < ISTORIE + 24 * 7 || !(p > 0)) return null;
    var stare = stareLa(b, b.length - 1); if (!stare) return null;
    var memo = {}, op = { memo: memo }, rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / p - 1 : null; };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    var F = function (H, r) { return r === null || r === 0 ? null : frecventa(b, H, atinge(r), "da", stare, op); };
    var out = { la: nr(o.acum) || Date.now(), stare: stare, bare: b.length, niveluri: { jos: nr(o.jos), sus: nr(o.sus), lichidare: nr(o.lichidare), tinta: nr(o.tinta), stop: nr(o.stop) },
      iese: { jos24: jos !== null && jos < 0 ? F(24, jos) : null, sus24: sus !== null && sus > 0 ? F(24, sus) : null, jos72: jos !== null && jos < 0 ? F(72, jos) : null, sus72: sus !== null && sus > 0 ? F(72, sus) : null },
      lichidare7: null, cursa: null, liniste: null };
    var lung = dir === "long", scurt = dir === "short";
    if ((lung && lich !== null && lich < 0) || (scurt && lich !== null && lich > 0)) out.lichidare7 = F(168, lich);
    var cursaOk = tinta !== null && stop !== null && (lung ? tinta > 0 && stop < 0 : scurt ? tinta < 0 && stop > 0 : false);
    if (cursaOk) { var ev = cursa(tinta, stop); out.cursa = { tinta: frecventa(b, 168, ev, "tinta", stare, op), stop: frecventa(b, 168, ev, "stop", stare, op) }; }
    if (stare === "liniste") {
      var ramane = function () { return function (bb, i, h, st) { var s = st(i + h); return s === null ? null : s === "liniste" ? "da" : "nu"; }; };
      out.liniste = { z1: frecventa(b, 24, ramane(), "da", "liniste", { memo: memo, doarConditionat: true }), z2: frecventa(b, 48, ramane(), "da", "liniste", { memo: memo, doarConditionat: true }) };
    }
    return out;
  }
  return { pregateste: pregateste, stareLa: stareLa, frecventa: frecventa, atinge: atinge, cursa: cursa, pentruBot: pentruBot, ORA: ORA };
})();
