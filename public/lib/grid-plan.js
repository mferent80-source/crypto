// Gridul DUPA PLANUL TAU (v100.16, 30.09, el: „grid strâns cât vreau să iau TP” + „stopul cât e și gridul” ->
// „Amândouă, cu proba”). Modul pur (fara DOM, fara retea), probat in scripts/proba-v10016.mjs. Se incarca DUPA
// grid-calcul.js si grid-proba.js.
//
// Doua variante, una langa alta, amandoua cu stopul la marginea de pierdere si tinta la marginea de castig (cel mult
// 1/2 pas dincolo - „gridul complet = iesirea”; sub grid botul nu mai face nimic, doar tine pozitia plina):
//   TA   - levierul tau, banda cat planul: la marginea de jos pierzi cat planul pe minus, la cea de sus iei planul pe plus;
//   MEA  - banda cat o zi obisnuita a monedei (amp), levierul intreg cel mai mare (pana la al tau) la care marginea de
//          jos costa cel mult planul; daca nici la 1x nu incape, banda se strange cat planul.
// Marimile se aleg din socoteala neteda (expunerea E = investitie x levier, fractii fata de pret: d pana la marginea de
// pierdere, u pana la cea de castig):  la marginea de pierdere  E * d * (u + d/2) / (u + d)   [pozitia de la pornire +
// cumpararile de pe drum];  la marginea de castig  E * u^2 / (2 (u + d))   [pozitia de la pornire vanduta pe drum].
// Cifrele aratate (la stop, la tinta, proba) vin din SIMULATORUL probei (GridProba.simuleaza), cu comisioane.
var GridPlan = (function () {
  "use strict";
  var G = GridCalcul, GP = GridProba, C = G.C;
  var ZILE = 30, FEREASTRA_ZILE = 3;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function pierdere(E, d, u) { return E * d * (u + d / 2) / (u + d); }
  function castig(E, d, u) { return E * u * u / (2 * (u + d)); }
  // injumatatire pe o functie crescatoare: x in [lo, hi] cu f(x) = t
  function cauta(f, t, lo, hi) {
    if (f(hi) < t) return hi;
    for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (f(m) < t) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function uPentru(E, d, plus) { return cauta(function (u) { return castig(E, d, u); }, plus, 1e-5, 3); }
  function dPentru(E, minus, plus) { return cauta(function (d) { return pierdere(E, d, uPentru(E, d, plus)); }, minus, 1e-5, 0.95); }

  // setarea de pus in Pionex pentru fractiile d (pierdere) si u (castig), la levierul L
  function setare(o, d, u, L) {
    var P = o.pret, lung = o.dir === "long";
    var jos = lung ? P * (1 - d) : P * (1 - u), sus = lung ? P * (1 + u) : P * (1 + d);
    var N = G.nrGrile(jos, sus, o.pas > 0 ? o.pas : C.PAS_MIN);
    var mo = nr(o.minOrdin);
    if (mo !== null && mo > 0 && o.suma * L / N < mo) N = Math.max(C.GRILE_MIN, Math.floor(o.suma * L / mo));
    var g = Math.pow(sus / jos, 1 / N) - 1;
    return { dir: o.dir, pret: P, jos: jos, sus: sus, grile: N, pas: g, levier: L, suma: o.suma, d: d, u: u,
      stop: { jos: jos * (1 - g / 2), sus: sus * (1 + g / 2) },   // la margini, 1/2 pas dincolo (long: jos = stop, sus = tinta)
      lichidare: G.lichidare(G.niveluri(jos, sus, N), P, o.dir, L), perOrdin: o.suma * L / N, profitGrila: g - 2 * C.COMISION };
  }
  // totalul in USDT daca pretul merge DREPT de la pornire pana la stop (parte = "pierdere") sau pana la tinta
  function laMargine(st, parte) {
    var P = st.pret, lung = st.dir === "long", spreJos = (parte === "pierdere") === lung;
    var tinta = spreJos ? st.stop.jos * 0.999 : st.stop.sus * 1.001;
    var b = [spreJos ? { t: 0, o: P, h: P, l: tinta, c: tinta } : { t: 0, o: P, h: tinta, l: P, c: tinta }];
    var r = GP.simuleaza(b, 0, 1, st);
    return r.lichidat ? -st.suma : r.net * st.suma;
  }
  // proba pe ultimele ZILE de lumanari de 15M: cate o pornire la 6 h, ferestre de FEREASTRA_ZILE zile intregi; setarea
  // se muta relativ pe pretul fiecarei porniri. Ce spune: de cate ori a iesit pe stop / pe tinta / a ramas in grid, dupa cat
  // timp, si media in USDT pe pornire (cu comisioanele; ce ramane deschis se socoteste la pretul de la capatul ferestrei).
  function proba(b15, st) {
    var W = FEREASTRA_ZILE * C.BARE_ZI, n0 = b15 ? b15.length - ZILE * C.BARE_ZI : -1;
    if (!b15 || n0 < 0) return null;
    var lung = st.dir === "long", out = { n: 0, stop: 0, tinta: 0, inGrid: 0, lichidari: 0, oreTipic: null, mediaUsdt: null, zile: ZILE, ferestreZile: FEREASTRA_ZILE, independente: Math.floor(ZILE / FEREASTRA_ZILE) };
    var ore = [], suma = 0;
    for (var s = n0; s + W <= b15.length; s += C.PAS_FERESTRE) {
      var P0 = b15[s].o, k = P0 / st.pret;
      if (!(P0 > 0)) continue;
      var r = GP.simuleaza(b15, s, W, { dir: st.dir, jos: st.jos * k, sus: st.sus * k, grile: st.grile, levier: st.levier, stop: { jos: st.stop.jos * k, sus: st.stop.sus * k } });
      out.n++; suma += r.net * st.suma;
      if (r.lichidat) out.lichidari++;
      else if (r.iesit) { if ((r.iesit === "jos") === lung) out.stop++; else out.tinta++; ore.push(r.bare / 4); }
      else out.inGrid++;
    }
    if (!out.n) return null;
    out.mediaUsdt = suma / out.n; out.oreTipic = ore.length ? G.mediana(ore) : null;
    return out;
  }
  // potrivirea pe SIMULATOR (grilele geometrice nu-s simetrice sus/jos, iar comisioanele se adauga): d pana cand stopul costa
  // exact planul pe minus, u pana cand tinta aduce exact planul pe plus; trei treceri (fiecare marime depinde putin de cealalta)
  function potriveste(x, L, d, u, doarU, minus, plus) {
    for (var t = 0; t < 3; t++) {
      if (!doarU) { var uu = u; d = cauta(function (dd) { return -laMargine(setare(x, dd, uu, L), "pierdere"); }, minus, 1e-4, 0.9); }
      var d0 = d; u = cauta(function (v) { return laMargine(setare(x, d0, v, L), "castig"); }, plus, 1e-4, 3);
    }
    return setare(x, d, u, L);
  }
  function complet(o, st, extra) {
    st.laStop = laMargine(st, "pierdere"); st.laTinta = laMargine(st, "castig"); st.proba = proba(o.b15, st);
    for (var k in extra) st[k] = extra[k];
    return st;
  }

  // o: { pret, dir, suma, levier, plan: {plus, minus}, amp, pas, b15, minOrdin }
  function variante(o) {
    var P = nr(o && o.pret), dir = String(o && o.dir || ""), suma = nr(o && o.suma), plan = (o && o.plan) || {};
    var plus = nr(plan.plus), minus = nr(plan.minus), Lt = Math.max(1, Math.floor(nr(o && o.levier) || C.LEV_MAX)), amp = nr(o && o.amp);
    if (!(P > 0)) return { eroare: "N-am prețul de acum al monedei." };
    if (dir !== "long" && dir !== "short") return { eroare: "Gridul după plan are sens doar pentru long sau short (cel neutru pierde pe ambele părți)." };
    if (!(suma > 0)) return { eroare: "N-am suma investită." };
    if (!(plus > 0) || !(minus > 0)) return { eroare: "Îmi trebuie planul întreg: ținta pe plus și pragul pe minus, în USDT." };
    var x = { pret: P, dir: dir, suma: suma, pas: nr(o.pas), minOrdin: o.minOrdin, b15: o.b15 };
    // TA: levierul tau, banda cat planul
    var dT = dPentru(suma * Lt, minus, plus), ta = complet(x, potriveste(x, Lt, dT, uPentru(suma * Lt, dT, plus), false, minus, plus), { cum: "levierul tău, banda cât planul" });
    // MEA: banda cat o zi obisnuita, levierul cel mai mare (<= al tau) la care, pe simulator, marginea costa cel mult planul
    var mea = null, faraMea = null;
    if (amp === null || !(amp > 0)) faraMea = "N-am mișcarea monedei pe zi (îmi trebuie lumânările de 4 ore pe 30 de zile).";
    else {
      for (var L = Lt; L >= 1 && !mea; L--) {
        var st = potriveste(x, L, amp, uPentru(suma * L, amp, plus), true, minus, plus);
        // „≈ planul”: pana la +5% (la LIT, 0,6 USDT - sub alunecarea reala a unui stop, 2,4 la LIGHTER); altfel un short cu
        // grile geometrice ar cadea la jumatate de levier pentru cativa centi. Cifra adevarata ramane la vedere.
        if (-laMargine(st, "pierdere") <= minus * 1.05) mea = complet(x, st, { cum: "banda cât o zi obișnuită, levierul din plan", stransaLaPlan: false });
      }
      if (!mea) { var d1 = dPentru(suma, minus, plus); mea = complet(x, potriveste(x, 1, d1, uPentru(suma, d1, plus), false, minus, plus), { cum: "nici la 1× banda de o zi nu încape: strânsă cât planul", stransaLaPlan: true }); }
    }
    return { ta: ta, mea: mea, faraMea: faraMea, plan: { plus: plus, minus: minus }, amp: amp };
  }

  // v100.17 (ideea 2): botul care RULEAZA - „de la pornirea ta, pe drumul real”: cele doua variante pornite in aceeasi lumanare
  // si la pretul ei (prima lumanare de 15M de dupa pornire), simulate de atunci pana acum. Pe ce parte ar fi iesit, cand (inceputul
  // lumanarii in care iese) si cu cat - sau cat ar avea acum (ce e deschis, la ultimul pret). Pornit inainte de lumanarile avute sau
  // in ultima lumanare -> null.
  function dePornire(o) {
    var b = o && o.b15, t0 = nr(o && o.tStart);
    if (!Array.isArray(b) || !b.length || t0 === null || b[0].t > t0) return null;
    var s = -1;
    for (var i = 0; i < b.length; i++) if (b[i].t >= t0) { s = i; break; }
    if (s < 0 || s >= b.length - 1) return null;
    var v = variante(Object.assign({}, o, { pret: b[s].o, b15: null }));
    if (v.eroare) return { eroare: v.eroare };
    var ruleaza = function (st) {
      if (!st) return null;
      var r = GP.simuleaza(b, s, b.length - s, st), lung = st.dir === "long";
      return { iesit: r.lichidat ? "lichidat" : r.iesit ? ((r.iesit === "jos") === lung ? "stop" : "tinta") : null,
        la: r.lichidat || r.iesit ? b[Math.min(b.length - 1, s + r.bare - 1)].t : null, usdt: r.lichidat ? -st.suma : r.net * st.suma, levier: st.levier };
    };
    return { t: b[s].t, pret: b[s].o, ta: ruleaza(v.ta), mea: ruleaza(v.mea), faraMea: v.faraMea };
  }

  return { variante: variante, proba: proba, dePornire: dePornire, pierdere: pierdere, castig: castig };
})();
if (typeof globalThis !== "undefined") globalThis.GridPlan = GridPlan;
