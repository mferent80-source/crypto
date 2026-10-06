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
      lichidare: G.lichidare(G.niveluri(jos, sus, N), P, o.dir, L), perOrdin: o.suma * L / N, profitGrila: g - 2 * C.COMISION_GRILA };
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
  // v100.21: zile (implicit ZILE) - laboratorul cere 60; ceaMaiProastaUsdt = pornirea cu cel mai prost rezultat (riscul, nu doar media)
  function proba(b15, st, zile) {
    var Z = zile > 0 ? Math.floor(zile) : ZILE, W = FEREASTRA_ZILE * C.BARE_ZI, n0 = b15 ? b15.length - Z * C.BARE_ZI : -1;
    if (!b15 || n0 < 0) return null;
    var lung = st.dir === "long", out = { n: 0, stop: 0, tinta: 0, inGrid: 0, lichidari: 0, oreTipic: null, mediaUsdt: null, ceaMaiProastaUsdt: null, zile: Z, ferestreZile: FEREASTRA_ZILE, independente: Math.floor(Z / FEREASTRA_ZILE) };
    var ore = [], suma = 0;
    for (var s = n0; s + W <= b15.length; s += C.PAS_FERESTRE) {
      var P0 = b15[s].o, k = P0 / st.pret;
      if (!(P0 > 0)) continue;
      var r = GP.simuleaza(b15, s, W, { dir: st.dir, jos: st.jos * k, sus: st.sus * k, grile: st.grile, levier: st.levier, stop: { jos: st.stop.jos * k, sus: st.stop.sus * k } });
      out.n++; suma += r.net * st.suma;
      if (out.ceaMaiProastaUsdt === null || r.net * st.suma < out.ceaMaiProastaUsdt) out.ceaMaiProastaUsdt = r.net * st.suma;
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
    st.laStop = laMargine(st, "pierdere"); st.laTinta = laMargine(st, "castig"); st.proba = proba(o.b15, st, o.zile);
    for (var k in extra) st[k] = extra[k];
    return st;
  }

  // o: { pret, dir, suma, levier, plan: {plus, minus}, amp, pas, b15, minOrdin }
  function variante(o) {
    var P = nr(o && o.pret), dir = String(o && o.dir || ""), suma = nr(o && o.suma), plan = (o && o.plan) || {};
    var plus = nr(plan.plus), minus = nr(plan.minus), Lt = Math.max(1, Math.floor(nr(o && o.levier) || C.LEV_MAX)), amp = nr(o && o.amp);
    // v100.110 (el, 06.10, NIL: „eu am făcut după el gridul” și Tabloul zicea „levier prea mare”): ÎNGUST (și LARG, care pornește de la el)
    // nu trece de levierul SIGUR socotit de aceeași fișă (o.levierSigur) - altfel Radarul oferea ce tot el numea apoi „prea mare”
    var LtTau = Lt, sig = nr(o && o.levierSigur); if (sig !== null && sig >= 1 && Lt > Math.floor(sig)) Lt = Math.floor(sig);
    if (!(P > 0)) return { eroare: "N-am prețul de acum al monedei." };
    if (dir !== "long" && dir !== "short") return { eroare: "Gridul după plan are sens doar pentru long sau short (cel neutru pierde pe ambele părți)." };
    if (!(suma > 0)) return { eroare: "N-am suma investită." };
    if (!(plus > 0) || !(minus > 0)) return { eroare: "Îmi trebuie planul întreg: ținta pe plus și pragul pe minus, în USDT." };
    var x = { pret: P, dir: dir, suma: suma, pas: nr(o.pas), minOrdin: o.minOrdin, b15: o.b15, zile: nr(o.zile) };
    // TA: levierul tau, banda cat planul
    var dT = dPentru(suma * Lt, minus, plus), ta = complet(x, potriveste(x, Lt, dT, uPentru(suma * Lt, dT, plus), false, minus, plus), { cum: Lt < LtTau ? "levierul sigur de azi (" + Lt + "×; al tău e " + LtTau + "×), banda cât îți permite pragul de pierdere" : "levierul tău, banda cât îți permite pragul de pierdere", levierTau: LtTau });
    // MEA: banda cat o zi obisnuita, levierul cel mai mare (<= al tau) la care, pe simulator, marginea costa cel mult planul
    var mea = null, faraMea = null;
    if (amp === null || !(amp > 0)) faraMea = "N-am mișcarea monedei pe zi (îmi trebuie lumânările de 4 ore pe 30 de zile).";
    // v100.18 (prinsa pe laboratorul real: BTC −1,8 vs +0,1, XAU −3,9 vs −1,6): moneda linistita, banda planului e deja cat o zi
    // sau mai larga -> n-are rost s-o strang; varianta mea = a ta
    else if (amp <= ta.d) mea = Object.assign({}, ta, { cum: "banda îngustă e deja cât o zi obișnuită sau mai largă: la fel ca ÎNGUST", egalaCuTa: true, stransaLaPlan: false });
    else {
      for (var L = Lt; L >= 1 && !mea; L--) {
        var st = potriveste(x, L, amp, uPentru(suma * L, amp, plus), true, minus, plus);
        // „≈ planul”: pana la +5% (la LIT, 0,6 USDT - sub alunecarea reala a unui stop, 2,4 la LIGHTER); altfel un short cu
        // grile geometrice ar cadea la jumatate de levier pentru cativa centi. Cifra adevarata ramane la vedere.
        if (-laMargine(st, "pierdere") <= minus * 1.05) mea = complet(x, st, { cum: "banda cât o zi obișnuită, levierul ales după pragul de pierdere", stransaLaPlan: false });
      }
      if (!mea) { var d1 = dPentru(suma, minus, plus); mea = complet(x, potriveste(x, 1, d1, uPentru(suma, d1, plus), false, minus, plus), { cum: "nici la 1× banda de o zi nu încape în pragul de pierdere: strânsă cât permite el", stransaLaPlan: true }); }
    }
    return { ta: ta, mea: mea, faraMea: faraMea, plan: { plus: plus, minus: minus, afaraOre: nr(plan.afaraOre) }, amp: amp };
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

  // v100.101 (05.10, el: „2 ferestre larg și îngust, motivele, să nu se mai întâmple situația de azi”): TAKE long 5× pe un grid −18% / +11%
  // pierdea ~27 USDT la marginea de jos față de un plan de −6,5 - stopul planului ar fi stat la mijlocul gridului. POTRIVIREA unui grid
  // (înainte de pornire) cu planul: cât pierzi la marginea de pierdere (socoteala netedă, ca variantele), unde ar sta stopul planului și ce
  // parte din înălțimea gridului n-ar lucra. „Prea larg” peste 1,2× planul. o = { pret, dir, jos, sus, levier, suma }.
  function potrivire(o, planMinus) {
    o = o || {}; var P = nr(o.pret), jos = nr(o.jos), sus = nr(o.sus), L = nr(o.levier), S = nr(o.suma), pm = nr(planMinus), lung = o.dir !== "short";
    if (!(P > 0) || !(jos > 0) || !(sus > jos) || !(L > 0) || !(S > 0) || !(pm > 0) || !(P > jos && P < sus)) return null;
    var E = S * L, d = lung ? 1 - jos / P : sus / P - 1, u = lung ? sus / P - 1 : 1 - jos / P, laMargine = pierdere(E, d, u);
    var dp = laMargine <= pm ? d : cauta(function (x) { return pierdere(E, x, u); }, pm, 1e-6, d);
    var stopPlan = lung ? P * (1 - dp) : P * (1 + dp), geo = o.geo !== false;
    var moarte = laMargine <= pm ? 0 : lung ? (geo ? Math.log(stopPlan / jos) / Math.log(sus / jos) : (stopPlan - jos) / (sus - jos)) : (geo ? Math.log(sus / stopPlan) / Math.log(sus / jos) : (sus - stopPlan) / (sus - jos));
    return { laMargine: laMargine, procent: laMargine / S, stopPlan: stopPlan, moarte: moarte, parte: lung ? "jos" : "sus", plan: pm, preaLarg: laMargine > pm * 1.2 };
  }
  // „1 pornire”, „27 de ori” (TextRo.cate; rezerva știe aceeași regulă)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (k !== 0 && (r === 0 || r >= 20) ? " de " : " ") + pl; }
  var U1 = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };
  var ORE = function (o) { o = nr(o); return o === null ? "—" : o < 48 ? Math.round(o) + " h" : (o / 24).toFixed(1).replace(".", ",") + " zile"; };
  var P1 = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  // ce aș alege eu între ÎNGUST (ta) și LARG (mea): amândouă pierd planul la stop ⇒ după cât de des a fost atins stopul în probă, dacă media nu
  // e mai proastă; cu sub 30 de cazuri independente diferența de medie se spune nedovedită. ⇒ { cine: "ta"|"mea", text } sau null
  function alegeBaza(ta, mea) {
    var a = ta && ta.proba, b = mea && mea.proba;
    if (!a && !b) return null;
    if (!b) return { cine: "ta", text: "ÎNGUST · larg nu se poate la planul ăsta" };
    if (!a) return { cine: "mea", text: "LARG · îngust nu se poate la planul ăsta" };
    // revizia 05.10: LARG copiat din ÎNGUST (moneda liniștită) ⇒ aceeași fereastră; o numim ÎNGUST, ca recunoașterea boților
    if (mea.egalaCuTa) return { cine: "ta", text: "ÎNGUST · LARG e la fel la moneda asta: banda îngustă ține deja o zi obișnuită" };
    var dif = b.mediaUsdt - a.mediaUsdt, maiRar = b.stop < a.stop * 0.8, maiDes = a.stop < b.stop * 0.8;
    var cine = maiRar && dif > -0.5 ? "mea" : maiDes && dif < 0.5 ? "ta" : dif >= 0 ? "mea" : "ta", x = cine === "mea" ? mea : ta, y = cine === "mea" ? ta : mea;
    var ind = Math.min(nr(a.independente) || 0, nr(b.independente) || 0);
    return { cine: cine, text: (cine === "mea" ? "LARG" : "ÎNGUST") + " · " + (Math.abs(x.laStop - y.laStop) < 0.15 ? "aceeași pierdere la stop (" + U1(x.laStop) + ")"
      // v100.102 (poza 05.10): cu planul scalat, LARG încape într-o zi întreagă și pierde la stop mai puțin decât ÎNGUST - se spun amândouă
      : "la stop pierzi " + U1(x.laStop) + " față de " + U1(y.laStop) + " la " + (cine === "mea" ? "ÎNGUST" : "LARG")) + ", stopul atins de " + cate(x.proba.stop, "dată", "ori") + " din " + cate(x.proba.n, "pornire", "porniri")
      + ", față de " + y.proba.stop + ", media pe pornire " + U1(x.proba.mediaUsdt) + " față de " + U1(y.proba.mediaUsdt)
      + (ind < 30 ? ". Cu ~" + cate(ind, "caz independent", "cazuri independente") + " diferența de medie nu e dovedită; aleg după cât de des te scoate stopul." : ".") };
  }
  // v100.111 (revizia R1): fereastra „de sărit” (deSarit) nu se recomandă când cealaltă nu e de sărit; când toate cele care se pot porni sunt
  // de sărit ⇒ { …, asteapta: true, deCe } (fișa zice „aș aștepta”, iar oferta se salvează cu rec „asteapta”)
  function alege(ta, mea) {
    var r = alegeBaza(ta, mea); if (!r) return r;
    var N = { ta: "ÎNGUST", mea: "LARG" }, unaSingura = !mea || !mea.proba || mea.egalaCuTa, sa = deSarit(ta), sm = unaSingura ? null : deSarit(mea);
    var x = r.cine === "mea" ? mea : ta, sx = r.cine === "mea" ? sm : sa, y = r.cine === "mea" ? ta : mea, sy = r.cine === "mea" ? sa : sm;
    if (!sx) return r;
    var areY = r.cine === "mea" ? !!(ta && ta.proba) : !unaSingura;
    if (areY && !sy) { var cine = r.cine === "mea" ? "ta" : "mea";
      return { cine: cine, text: N[cine] + " · la " + N[r.cine] + " stopul a venit în " + sx.stop + " din " + cate(sx.n, "pornire", "porniri") + " (" + Math.round(sx.pct * 100) + "%), aici în " + y.proba.stop + " din " + cate(y.proba.n, "pornire", "porniri")
        + "; la stop pierzi " + U1(y.laStop) + ", media pe pornire " + U1(y.proba.mediaUsdt) + " față de " + U1(x.proba.mediaUsdt) + "." }; }
    return { cine: r.cine, text: r.text, asteapta: true, deCe: areY ? "amândouă au stopul în peste jumătate din porniri" : "stopul vine în peste jumătate din porniri" };
  }
  // v100.111 (I-549, NIL 06.10: ÎNGUST cu stopul în 77 din 109 porniri, pornit totuși): fereastra cu stopul în peste jumătate din porniri
  // (cel puțin 20) - se spune pe ea, nu se ascunde (pragul e un privilegiu: se avertizează). ⇒ null | { stop, n, pct, text }
  function deSarit(v) {
    var p = v && v.proba, s = nr(p && p.stop), n = nr(p && p.n);
    if (s === null || n === null || n < 20 || s / n <= 0.5) return null;
    return { stop: s, n: n, pct: s / n, text: "aș sări peste ea: stopul a venit în " + s + " din " + cate(n, "pornire", "porniri") + " (" + Math.round(s / n * 100) + "%)" };
  }
  // v100.111 (I-550): ce fereastră a pornit (fereastraBotului) și ce recomanda fișa atunci, cu proba ferestrei - pentru Tablou
  function textPornit(fb, ora) {
    if (!fb) return null;
    var N = { ingust: "ÎNGUST", larg: "LARG" }, la = ora ? " din fișa de la " + ora : " din fișă";
    if (!fb.k || !N[fb.k]) return "Gridul botului nu seamănă nici cu ÎNGUST, nici cu LARG" + la + ".";
    var s = nr(fb.stop), n = nr(fb.n), o = nr(fb.oreTipic);
    var lv = nr(fb.levierFisa) > 0 && nr(fb.levierBot) > 0 && Math.round(fb.levierFisa) !== Math.round(fb.levierBot) ? " (levierul " + Math.round(fb.levierBot) + "×, fișa avea " + Math.round(fb.levierFisa) + "×)" : "";   // v100.114
    return "Ai pornit " + N[fb.k] + la + lv + (fb.rec === "asteapta" ? ", deși fișa zicea să aștepți" : N[fb.rec] ? (fb.rec === fb.k ? ", cum recomanda fișa" : ", deși fișa recomanda " + N[fb.rec]) : "")
      + (s !== null && n !== null && n > 0 ? "; în probă stopul a venit în " + s + " din " + cate(n, "pornire", "porniri") + " (" + Math.round(s / n * 100) + "%)" + (o !== null && o > 0 ? ", ieșirea tipică " + (o < 1 ? "sub o oră" : "după " + ORE(o)) : "") : "") + ".";
  }
  // motivele fiecărei ferestre, din cifrele ei (nimic scris de mână): { da: [], nu: [] }
  function motive(v, cheie, amp) {
    var dd = nr(v && v.d), uu = nr(v && v.u), jo = v && v.dir === "short" ? uu : dd, su = v && v.dir === "short" ? dd : uu;
    var banda = jo !== null && su !== null ? "−" + P1(jo) + " / +" + P1(su) : null, stransa = banda && nr(amp) !== null && Math.min(dd, uu) < amp * 0.95;
    var arePr = !!(v && v.proba);   // revizia 05.10: monedă nouă (fără probă) ⇒ doar motivele care nu depind de probă
    var pr = v && v.proba || {}, lat = nr(v && v.sus) > 0 && nr(v && v.jos) > 0 ? v.sus / v.jos - 1 : null, lq = v && v.lichidare ? nr(v.lichidare.jos) : null, n = cate(pr.n, "pornire", "porniri");
    if (cheie === "ta") return arePr ? {
      da: ["umple des: pas " + (nr(v.pas) !== null ? P1(v.pas).replace(/(\d),(\d)%$/, "$1,$2%") : "—") + (lat !== null ? ", banda doar " + P1(lat) + " lată" : ""), "ieși repede: tipic după " + ORE(pr.oreTipic) + ", banii nu stau", (nr(v.levierTau) > v.levier ? "levierul sigur de azi (" + v.levier + "×), nu al tău (" + v.levierTau + "×)" : "levierul tău (" + v.levier + "×)")]   /* v100.110: nu „al tău” când e cel sigur */,
      nu: ["zgomotul unei ore te scoate: stop " + pr.stop + " din " + n, "fiecare grilă aduce mai mult, dar ieși des pe minus"].concat(lq ? ["lichidare la " + lq.toPrecision(4) + " dacă stopul alunecă"] : []) } : { da: ["umple des: pas " + (nr(v.pas) !== null ? P1(v.pas) : "—") + (lat !== null ? ", banda doar " + P1(lat) + " lată" : ""), (nr(v.levierTau) > v.levier ? "levierul sigur de azi (" + v.levier + "×), nu al tău (" + v.levierTau + "×)" : "levierul tău (" + v.levier + "×)")]   /* v100.110: nu „al tău” când e cel sigur */,
      nu: ["fiecare grilă aduce mai mult, dar ieși des pe minus", "moneda e prea nouă pentru proba pe 30 de zile"].concat(lq ? ["lichidare la " + lq.toPrecision(4) + " dacă stopul alunecă"] : []) };
    if (!arePr) return { da: [banda ? "ține " + banda + " fără să iasă" : "banda mai largă"].concat(lq === null ? ["fără lichidare: la " + v.levier + "× nu se lichidează"] : []),
      nu: ["levier mic ⇒ bani mai puțini pe grilă", "moneda e prea nouă pentru proba pe 30 de zile"] };
    return {
      da: [(banda ? "ține " + banda + " fără să iasă" + (nr(amp) === null ? "" : stransa ? " (o zi obișnuită e ±" + P1(amp) + "; strânsă ca la stop să nu treci de pragul de pierdere)" : ", cât o zi obișnuită a monedei (±" + P1(amp) + ")") : nr(amp) !== null ? "ține o zi obișnuită a monedei (±" + P1(amp) + ") fără să iasă" : "ține mai mult fără să iasă"), "stopul atins mai rar: " + pr.stop + " din " + n].concat(lq === null ? ["fără lichidare: la " + v.levier + "× nu se lichidează"] : []),
      nu: ["levier mic ⇒ bani mai puțini pe grilă", "banii stau mai mult: tipic " + ORE(pr.oreTipic), pr.inGrid + " din " + n + " încă în grid după 3 zile"] };
  }

  // v100.103 (I-533): gridul unei ferestre, în forma botului de hârtie / jurnalului (stopul la margini, ½ pas dincolo)
  function setareFereastra(v) {
    if (!v) return null;
    return { dir: v.dir, jos: v.jos, sus: v.sus, grile: v.grile, levier: v.levier, suma: v.suma, stop: v.stop ? { jos: v.stop.jos, sus: v.stop.sus } : null };
  }
  // v100.103 (I-535): botul pornit seamănă cu ÎNGUST sau cu LARG? Aceeași direcție (dacă fereastra o știe), același levier, marginile la ±2%.
  // fer = { ta, mea } (fiecare { jos, sus, levier, dir? }); ⇒ "ingust" | "larg" | null
  function recunoaste(bot, fer) {
    var b = bot || {}, J = nr(b.jos), S = nr(b.sus), L = nr(b.levier), lista = [["ta", "ingust"], ["mea", "larg"]];
    if (!(J > 0) || !(S > J)) return null;
    for (var i = 0; i < lista.length; i++) {
      var x = fer && fer[lista[i][0]];
      // v100.114 (el, 06.10: „ZAMA am pornit după ce a propus fișa”): fereastra = BANDA (și direcția); levierul poate diferi (fișa îl taie la cel
      // sigur, el îl alege) - se spune separat (fereastraBotului: levierFisa / levierBot), nu mai face din ÎNGUST „alt grid”
      if (!x || !(nr(x.jos) > 0) || !(nr(x.sus) > 0)) continue;
      if (x.dir && b.dir && x.dir !== b.dir) continue;
      if (Math.abs(J / x.jos - 1) <= 0.02 && Math.abs(S / x.sus - 1) <= 0.02) return lista[i][1];
    }
    return null;
  }

  // v100.104 (I-538): botul futures față de ferestrele arătate de fișă ÎNAINTE de pornire (cel mult 12 h), pe aceeași monedă și direcție.
  // Aceeași regulă pentru jurnal (pagina) și pentru mesajul de pornire (colectorul). ⇒ null fără ofertă; { k: "ingust"|"larg"|null, t, … } altfel
  function fereastraBotului(b, oferite) {
    var mon = function (s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$/, "").replace(/\.PERP$/, "").replace(/USDT$/, ""); };
    if (!b || !/\.PERP$/i.test(String(b.baza || "")) || !Array.isArray(oferite)) return null;
    var p = nr(b.pornitLa), dir = String(b.directie || "").toLowerCase(), m = mon(b.baza);
    if (p === null) return null;
    // revizia 05.10: o ofertă văzută din nou se reînnoiește (ultim) ⇒ cele 12 h se numără de la ultima vedere, nu de la prima
    var cand = oferite.filter(function (o) { var u = Math.max(nr(o && o.t) || 0, nr(o && o.ultim) || 0); return o && mon(o.simbol) === m && o.dir === dir && nr(o.t) !== null && o.t <= p && p - u <= 12 * 3600000; })
      .sort(function (x, y) { return y.t - x.t; });
    if (!cand.length) return null;
    var cu = function (o, x) { return x ? { jos: x.jos, sus: x.sus, levier: x.levier, dir: o.dir } : null; };
    for (var i = 0; i < cand.length; i++) {
      var o = cand[i], k = recunoaste({ dir: dir, jos: nr(b.gridJos), sus: nr(b.gridSus), levier: nr(b.levier) }, { ta: cu(o, o.ta), mea: cu(o, o.mea) });
      if (k) { var x = k === "larg" ? o.mea : o.ta; return { k: k, t: o.t, simbol: o.simbol, verdict: o.verdict || null, rec: o.rec || null, stop: nr(x.stop), n: nr(x.n), oreTipic: nr(x.oreTipic), levierFisa: nr(x.levier), levierBot: nr(b.levier) }; }
    }
    return { k: null, t: cand[0].t, simbol: cand[0].simbol, verdict: cand[0].verdict || null, rec: cand[0].rec || null };
  }

  return { variante: variante, proba: proba, dePornire: dePornire, pierdere: pierdere, castig: castig, potrivire: potrivire, alege: alege, deSarit: deSarit, textPornit: textPornit, motive: motive, setareFereastra: setareFereastra, recunoaste: recunoaste, fereastraBotului: fereastraBotului };
})();
if (typeof globalThis !== "undefined") globalThis.GridPlan = GridPlan;
