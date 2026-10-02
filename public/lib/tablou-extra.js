// Tabloul botului, v80 - cinci randuri noi, modul pur (fara DOM, fara retea), probat in
// scripts/grid-v78.mjs pe cifrele botului REAL (MET, 24.09). Se incarca DUPA grid-calcul.js.
//   1) botul vs fisa de azi   2) grile pe zi vs comisioane si funding pe zi
//   3) daca il inchizi acum   4) linistea si laboratorul (din fisa, in app.js)
//   5) legatura cu jurnalul gridurilor
// Lipsa ramane null, nu 0 (Number(null) === 0 ar minti).
var TabloExtra = (function () {
  "use strict";
  var G = GridCalcul, C = G.C, ZI = 86400000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function bu(b) { return (b && b.brut && b.brut.buOrderData) || {}; }

  // Pasul botului care RULEAZA: aritmetic = (sus-jos)/grile in pret; geometric = (sus/jos)^(1/N)-1
  // v100.38 (30.09): PIONEX NUMARA LINIILE - „Număr de grile” / row = linii (jos si sus incluse), intervalele = row − 1 (dovedit pe ~2.000
  // de boti inchisi, loturile de la pornire, si pe botul CRV viu). Inainte se socotea pe row intervale - o linie in plus, toate decalate.
  function geometrieBot(b) {
    var d = bu(b), linii = nr(d.row), N = linii !== null ? linii - 1 : null, jos = nr(b && b.gridJos), sus = nr(b && b.gridSus), p = nr(b && b.pretCurent);
    if (!(N >= 1) || !(jos > 0) || !(sus > jos)) return null;
    var mod = String(d.gridType || "").toLowerCase() === "geometric" ? "geometric" : "aritmetic";
    var ref = p > 0 ? p : (jos + sus) / 2;
    var pasPret = mod === "aritmetic" ? (sus - jos) / N : null;
    var pasPct = mod === "aritmetic" ? pasPret / ref : Math.pow(sus / jos, 1 / N) - 1;
    var net = pasPct - 2 * C.COMISION_GRILA;
    return { mod: mod, grile: linii, intervale: N, jos: jos, sus: sus, pasPret: pasPret, pasPct: pasPct, netPct: net, preaDese: net < C.PAS_MIN - 2 * C.COMISION_GRILA };
  }

  // v100.4 (el, 28.09: „lipsește profit per grilă, adică doar din grid”): cat aduce O grila a botului care ruleaza, dupa comision -
  // procentul (ce arata Pionex la „Profit/grid”) si banii: o grila misca investit x levier / grile. Fara investit, banii raman null.
  function profitPeGrila(b) {
    var g = geometrieBot(b), inv = nr(b && b.investit), lev = nr(b && b.levier) || 1;
    if (!g) return null;
    return { pct: g.netPct, usdt: inv !== null && inv > 0 ? inv * lev / g.intervale * g.netPct : null, grile: g.grile, mod: g.mod };
  }

  function comparaCuFisa(b, f) {
    var out = { randuri: [], semnale: [] };
    if (!b || !f || !f.setare) return out;
    // v99: "fisa de azi" = ce PROPUNE fisa (gridul des in liniste, cand proba n-o respinge), altfel platoul probei
    var g = geometrieBot(b), st = f.setare, pr = G.procent, lev = nr(b.levier);   // f.setare e deja setarea propusa (revizia 28.09)
    var dirBot = String(b.directie || "").toLowerCase();
    out.randuri.push({ et: "Direcția", bot: dirBot || "—", fisa: f.dir });
    out.randuri.push({ et: "Interval", bot: g ? g.jos + " – " + g.sus : "—", fisa: st.jos.toPrecision(4) + " – " + st.sus.toPrecision(4) });
    out.randuri.push({ et: "Grile (în Pionex)", bot: g ? g.grile + " " + g.mod : "—", fisa: (st.grile + 1) + " geometric" });
    out.randuri.push({ et: "Pas net pe grilă", bot: g ? pr(g.netPct) : "—", fisa: pr(st.profitGrila) });
    out.randuri.push({ et: "Levier", bot: lev !== null ? lev + "×" : "—", fisa: st.levier + "× (sigur " + st.levierSigur + "×)" });
    var cb = g ? comisionDinUmplere(g.netPct) : null, cf = comisionDinUmplere(st.profitGrila);
    out.randuri.push({ et: "Comisionul ia din fiecare umplere", bot: cb !== null ? Math.round(cb * 100) + "%" : "—", fisa: cf !== null ? Math.round(cf * 100) + "%" : "—" });
    out.randuri.push({ et: "Verdictul de azi", bot: "", fisa: f.verdict && f.verdict.nivel || "—" });
    if (g && g.preaDese) out.semnale.push("grile prea dese: fiecare umplere lasă " + pr(g.netPct) + " după comision (fișa cere cel puțin " + pr(C.PAS_MIN - 2 * C.COMISION_GRILA) + ")");
    if (lev !== null && st.levierSigur > 0 && lev > st.levierSigur) out.semnale.push("levier " + lev + "× peste cel sigur azi (" + st.levierSigur + "×): lichidarea stă mai aproape decât o lățime de interval");
    if (dirBot && f.dir && dirBot !== f.dir && !(dirBot === "neutral" && f.dir === "neutru")) out.semnale.push("direcția botului (" + dirBot + ") diferă de cea din trend azi (" + f.dir + ")");
    if (g && (g.jos > st.sus || g.sus < st.jos)) out.semnale.push("intervalul botului nu se mai suprapune cu cel propus azi");
    if (f.verdict && f.verdict.nivel === "nu") out.semnale.push("fișa de azi zice NU PORNI pe moneda asta: " + (f.verdict.motive[0] || ""));
    return out;
  }

  function grileVsCosturi(b, acum) {
    var d = bu(b), p = nr(b && b.pornitLa), zile = p > 0 ? Math.max(1 / 24, ((acum || Date.now()) - p) / ZI) : null;
    var fund = nr(b && b.finantare), com = nr(b && b.comisioane), g24 = nr(d.gridProfit24h);
    var out = { grile24h: g24, umpleri24h: nr(d.trx24h), zile: zile, fundingZi: fund !== null && zile ? fund / zile : null, comisionZi: com !== null && zile ? com / zile : null, netZi: null, fundingMananca: null };
    // v100.39 (audit 30.09): sub o zi de viata comisionul e aproape numai taxa de CUMPARARE de la pornire (platita o data) -
    // impartita la 3 ore devenea „−0,68 USDT pe zi” si orice bot nou iesea ATENTIE „costurile depasesc grilele” de la secunda 27.
    // Costurile pe zi se judeca doar de la o zi de viata (grilele pe 24 h fata de costurile pe zi, ferestre egale).
    if (zile !== null && zile < 1) out.preaTanar = true;
    else if (g24 !== null && out.fundingZi !== null && out.comisionZi !== null) {
      out.netZi = g24 + out.comisionZi + out.fundingZi;
      out.fundingMananca = out.fundingZi < 0 && -out.fundingZi >= g24;
    }
    return out;
  }

  // Ce iei daca inchizi acum si la ce pret botul iese pe zero (long/short; la neutru semnul
  // pozitiei e nesigur - nu se spune).
  function dacaInchizi(b, comision) {
    comision = comision == null ? C.COMISION : comision;
    var inv = nr(b && b.investit), tot = nr(b && b.profitTotal), net = nr(b && b.profitNet);
    var poz = nr(b && b.pozitie), pd = nr(b && b.pretDeschidere), p = nr(b && b.pretCurent), dir = String(b && b.directie || "").toLowerCase();
    var out = { iei: null, comisionInchidere: null, pretZero: null, distantaZeroPct: null };
    if (poz !== null && p !== null) out.comisionInchidere = Math.abs(poz) * p * comision;
    if (inv !== null && tot !== null) out.iei = inv + tot - (out.comisionInchidere || 0);
    var q = poz !== null ? Math.abs(poz) : null;
    if (q > 0 && pd > 0 && net !== null && b.pnlNerealizatSigur !== false) {
      if (dir === "long") out.pretZero = (q * pd - net) / (q * (1 - comision));
      else if (dir === "short") out.pretZero = (q * pd + net) / (q * (1 + comision));
    }
    if (out.pretZero !== null && p > 0) out.distantaZeroPct = (out.pretZero - p) / p;
    return out;
  }

  // v96.4: pretul la care, inchizand, totalul botului e exact T (T = 0 da pretul de zero din dacaInchizi).
  // long: total = net + q*(X - pd) - q*X*com  =>  X = (q*pd - net + T) / (q*(1 - com)); short oglindit.
  function pretPentruTotal(b, T, comision) {
    comision = comision == null ? C.COMISION : comision;
    var net = nr(b && b.profitNet), q = nr(b && b.pozitie), pd = nr(b && b.pretDeschidere), t = nr(T), dir = String(b && b.directie || "").toLowerCase();
    if (q === null || !(Math.abs(q) > 0) || !(pd > 0) || net === null || t === null || (b && b.pnlNerealizatSigur === false)) return null;
    q = Math.abs(q);
    var x = dir === "long" ? (q * pd - net + t) / (q * (1 - comision)) : dir === "short" ? (q * pd + net - t) / (q * (1 + comision)) : null;
    return x !== null && x > 0 ? x : null;
  }

  // v96.5: totalul botului daca se inchide la pretul X (dupa comisionul de inchidere) - inversa lui pretPentruTotal
  function totalLaPret(b, X, comision) {
    comision = comision == null ? C.COMISION : comision;
    var net = nr(b && b.profitNet), q = nr(b && b.pozitie), pd = nr(b && b.pretDeschidere), x = nr(X), dir = String(b && b.directie || "").toLowerCase();
    if (q === null || !(Math.abs(q) > 0) || !(pd > 0) || net === null || !(x > 0) || (b && b.pnlNerealizatSigur === false)) return null;
    q = Math.abs(q);
    return dir === "long" ? net + q * (x - pd) - q * x * comision : dir === "short" ? net + q * (pd - x) - q * x * comision : null;
  }
  // v101.7 (30.09, LIGHTER −59 USDT): totalul daca pretul ajunge la X, cu grilele umplute PE DRUM. Long: sub pret botul
  // mai cumpara pana la marginea de jos, unde pozitia e plina = (randuri - 1) x cantitatea pe grila (masurat pe LIGHTER,
  // JTO, BCH - inchisi sub grid: 105 = 15 x 7, 868 = 14 x 62, 0,435 = 29 x 0,015). Ordinele ramase se iau intinse uniform
  // intre pret si margine, deci la pretul lor mediu. Short oglindit. Fara row/perVolume -> doar pozitia de acum.
  function totalCuGridLa(b, X, comision) {
    comision = comision == null ? C.COMISION : comision;
    var net = nr(b && b.profitNet), q = nr(b && b.pozitie), pd = nr(b && b.pretDeschidere), p = nr(b && b.pretCurent), x = nr(X);
    var jos = nr(b && b.gridJos), sus = nr(b && b.gridSus), dir = String(b && b.directie || "").toLowerCase(), u = bu(b);
    if (net === null || q === null || !(x > 0) || !(p > 0) || (b && b.pnlNerealizatSigur === false) || (dir !== "long" && dir !== "short")) return null;
    q = Math.abs(q);
    if (q > 0 && !(pd > 0)) return null;
    var lung = dir === "long";
    // v101.8: pe partea de CASTIG gridul VINDE (long, peste pret) / cumpara inapoi (short, sub pret): pozitia de acum se
    // micsoreaza pana la marginea de sus (long), unde botul ramane fara pozitie - peste ea totalul nu mai creste.
    if (lung ? x > p : x < p) {
      var st = lung ? (jos !== null ? Math.max(p, jos) : p) : (sus !== null ? Math.min(p, sus) : p), mg = lung ? sus : jos, qs = 0, medV = st;
      if (q > 0 && mg !== null && (lung ? mg > st : mg < st)) {
        var pn = lung ? Math.min(x, mg) : Math.max(x, mg);
        if (lung ? pn > st : pn < st) { qs = q * Math.min(1, Math.abs(pn - st) / Math.abs(mg - st)); medV = (st + pn) / 2; }
      }
      var tc = net + (q > 0 ? qs * (lung ? medV - pd : pd - medV) + (q - qs) * (lung ? x - pd : pd - x) : 0);
      return tc - (qs * medV + (q - qs) * x) * comision;
    }
    var tot = net + (q > 0 ? (lung ? q * (x - pd) : q * (pd - x)) : 0), qTot = q;
    var rand = nr(u.row), pv = nr(u.perVolume), qMax = rand > 1 && pv > 0 ? (rand - 1) * pv : null;
    if (qMax !== null && qMax > q && jos !== null && sus !== null && sus > jos) {
      var cap = lung ? Math.min(p, sus) : Math.max(p, jos), margine = lung ? jos : sus;
      var pana = lung ? Math.max(x, jos) : Math.min(x, sus), latime = Math.abs(cap - margine);
      if (latime > 0 && (lung ? x < cap : x > cap)) {
        var qn = (qMax - q) * Math.min(1, Math.abs(cap - pana) / latime), med = (cap + pana) / 2;
        tot += lung ? qn * (x - med) : qn * (med - x); qTot += qn;
      }
    }
    return tot - qTot * x * comision;
  }
  // v101.7: cat pierde (castiga) botul daca se atinge opritorul LUI din Pionex. In procente (profit_ratio) Pionex il opreste
  // exact la raport x investit; pe pret, cu grilele de pe drum. Opritor stins / lipsa -> null.
  function totalLaOpritor(b, comision) {
    if (!b || !b.opritorPierdereActiv) return null;
    var inv = nr(b.investit), r = nr(b.opritorPierdereRaport);
    if (b.opritorPierdereTip === "raport" && r !== null && inv > 0) return r * inv;
    var op = nr(b.opritorPierdere), p = nr(b.pretCurent), dir = String(b.directie || "").toLowerCase();
    if (!(op > 0)) return null;
    // un stop dincolo de pret (long: peste) s-ar declansa acum: totalul e cel de la pretul de acum
    if (p !== null && (dir === "long" ? op > p : dir === "short" ? op < p : false)) op = p;
    return totalCuGridLa(b, op, comision);
  }
  // v100.43 (I-467, el: „ce aș face eu” cu banii pe masă): cifrele de langa actiunile propuse in „Acum, concret”.
  //   stop.laOpritor - totalul daca se atinge opritorul LUI de acum (null = n-are opritor activ)
  //   stop.laPropus  - totalul cu stopul propus (o.protectie), cu grilele umplute pe drum (modelul care a prins LIGHTER)
  //   stop.frecventa - in cate din ferestrele de 24 h ale monedei (lumanari 15M, una la 6 h) pretul a ajuns, de la deschidere,
  //                    la distanta stopului propus - „ce cedezi”: cat de des te-ar scoate o zi obisnuita
  //   inchide        - ce iei daca il inchizi acum (TabloExtra.dacaInchizi)
  function frecventaAtingere(bare, dist, dir) {
    if (!Array.isArray(bare) || bare.length < 96 * 3 || !(dist > 0) || (dir !== "long" && dir !== "short")) return null;
    var n = 0, k = 0;
    for (var s = 0; s + 96 <= bare.length; s += 24) {
      var o = bare[s].o, atins = false;
      for (var i = s; i < s + 96 && !atins; i++) atins = dir === "long" ? bare[i].l <= o * (1 - dist) : bare[i].h >= o * (1 + dist);
      n++; if (atins) k++;
    }
    return n ? k / n : null;
  }
  function cifreActiuni(b, o) {
    o = o || {}; var dir = String(b && b.directie || "").toLowerCase(), p = nr(b && b.pretCurent), pr = nr(o.protectie);
    var stop = { laOpritor: totalLaOpritor(b), laPropus: pr !== null ? totalCuGridLa(b, pr) : null, pretPropus: pr, frecventa: null, opritor: b && b.opritorPierdereActiv ? nr(b.opritorPierdere) : null };
    if (pr !== null && p !== null && p > 0) stop.frecventa = frecventaAtingere(o.b15, Math.abs(p - pr) / p, dir);
    var z = dacaInchizi(b);
    return { stop: stop, inchide: { iei: z.iei, total: nr(b && b.profitTotal), comision: z.comisionInchidere } };
  }
  function textBani(st) {
    if (!st) return "";
    var U2 = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; }, t = [];
    if (st.laPropus !== null && st.laPropus !== undefined) t.push("pierderea maximă: " + (st.laOpritor !== null && st.laOpritor !== undefined ? U2(st.laOpritor) + " (opritorul de acum)" : "fără margine (n-ai opritor activ)") + " → " + U2(st.laPropus) + " cu stopul propus");
    if (st.frecventa !== null && st.frecventa !== undefined) t.push("ce cedezi: o zi obișnuită a monedei ajunge până acolo în " + Math.round(st.frecventa * 100) + "% din zile (ultimele 30)");
    return t.join(" · ");
  }
  // v101.8: cat are botul daca se atinge tinta LUI din Pionex (in procente: raport x investit). Stinsa / lipsa -> null.
  function totalLaTinta(b, comision) {
    if (!b || !b.opritorProfitActiv) return null;
    var inv = nr(b.investit), r = nr(b.opritorProfitRaport);
    if (b.opritorProfitTip === "raport" && r !== null && inv > 0) return r * inv;
    var tp = nr(b.opritorProfit), p = nr(b.pretCurent), dir = String(b.directie || "").toLowerCase();
    if (!(tp > 0)) return null;
    if (p !== null && (dir === "long" ? tp < p : dir === "short" ? tp > p : false)) tp = p;
    return totalCuGridLa(b, tp, comision);
  }
  // v101.8: pretul la care, pe partea de castig, totalul e exact T - in grid (peste marginea de sus nu mai creste, deci
  // un T ne-atins pana la margine -> null: in gridul asta planul nu se atinge doar din pret). Deja atins -> null.
  function pretTintaPentru(b, T, comision) {
    var p = nr(b && b.pretCurent), t = nr(T), dir = String(b && b.directie || "").toLowerCase(), mg = nr(b && (dir === "long" ? b.gridSus : b.gridJos));
    if (p === null || t === null || mg === null || (dir !== "long" && dir !== "short") || (dir === "long" ? mg <= p : mg >= p)) return null;
    var f = function (x) { return totalCuGridLa(b, x, comision); }, acum = f(p), laMg = f(mg);
    if (acum === null || laMg === null || acum >= t || laMg < t) return null;
    var lo = Math.min(p, mg), hi = Math.max(p, mg);
    for (var i = 0; i < 60; i++) {
      var m = (lo + hi) / 2, v = f(m);
      if (v === null) return null;
      if ((v < t) === (dir === "long")) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  // v101.8: incape gridul in plan? Totalul la marginea de pierdere (long: jos), cat de departe e iesirea pe plan (fractie din
  // pret) si cel mai mare levier INTREG la care, pe acelasi grid si aceeasi investitie, la margine pierzi cel mult planul iar
  // iesirea pe plan e la cel putin jumatate dintr-o zi obisnuita a monedei (amp, de la colector; lipsa -> doar latimea).
  // La alt levier pozitia, cantitatea pe grila si profitul de pana acum se scaleaza in aceeasi proportie.
  function incapePlanul(b, prag, amp) {
    var dir = String(b && b.directie || "").toLowerCase(), mg = nr(b && (dir === "short" ? b.gridSus : b.gridJos)), p = nr(b && b.pretCurent), L = nr(b && b.levier), u = bu(b);
    var out = { laMargine: null, iesire: null, amp: amp, levier: null };
    if (!(prag > 0) || mg === null || !(p > 0) || (dir !== "long" && dir !== "short")) return out;
    var iesire = function (c) { var x = pretOpritorPentru(c, -prag); return x === null ? null : Math.abs(x / p - 1); };
    var incape = function (c) { var t = totalCuGridLa(c, mg); if (t === null || -t > prag) return false; var d = iesire(c); return amp === null || d === null || d >= amp / 2; };
    out.laMargine = totalCuGridLa(b, mg); out.iesire = iesire(b);
    var q = nr(b.pozitie), net = nr(b.profitNet), pv = nr(u.perVolume);
    if (L > 0 && q !== null && net !== null) for (var Lx = Math.floor(L); Lx >= 1; Lx--) {
      var k = Lx / L, c = Object.assign({}, b, { pozitie: q * k, profitNet: net * k, brut: { buOrderData: Object.assign({}, u, { perVolume: pv !== null ? pv * k : u.perVolume }) } });
      if (incape(c)) { out.levier = { levier: Lx, laMargine: totalCuGridLa(c, mg), iesire: iesire(c) }; break; }
    }
    return out;
  }
  // v101.8: cat se misca moneda intr-o zi obisnuita = mediana (max - min) / inchidere pe ultimele 30 de zile INCHEIATE (UTC)
  function miscareZi(bare, acum) {
    if (!Array.isArray(bare) || !bare.length) return null;
    var azi = Math.floor((acum || Date.now()) / ZI) * ZI;
    var l = G.agrega(bare, ZI).filter(function (z) { return z.t < azi && z.c > 0 && z.h >= z.l; }).slice(-30).map(function (z) { return (z.h - z.l) / z.c; });
    return l.length >= 20 ? G.mediana(l) : null;
  }
  // v101.7: pretul opritorului la care, atins, totalul e exact T (planul pe minus: T = −prag). Cautare prin injumatatire
  // (totalul creste cu pretul la long, scade la short); planul deja atins la pretul de acum -> null.
  function pretOpritorPentru(b, T, comision) {
    var p = nr(b && b.pretCurent), t = nr(T), dir = String(b && b.directie || "").toLowerCase();
    if (p === null || t === null || (dir !== "long" && dir !== "short")) return null;
    var f = function (x) { return totalCuGridLa(b, x, comision); }, acum = f(p);
    if (acum === null || acum <= t) return null;
    var lo = dir === "long" ? p * 0.02 : p, hi = dir === "long" ? p : p * 50;
    if (f(dir === "long" ? lo : hi) > t) return null;
    for (var i = 0; i < 60; i++) {
      var m = (lo + hi) / 2, v = f(m);
      if (v === null) return null;
      if ((v > t) === (dir === "long")) hi = m; else lo = m;
    }
    return (lo + hi) / 2;
  }
  // v96.5 "opritorul care urca": dupa tinta, opritorul la PERNA sub pret (1,5%) - cat pastreaza; si cat pastreaza opritorul de acum
  var PERNA = 0.015;
  function podeaUrca(b, prag) {
    var p = nr(b && b.pretCurent), dir = String(b && b.directie || "").toLowerCase(), t = nr(prag);
    if (p === null || t === null || (dir !== "long" && dir !== "short")) return null;
    var pret = dir === "long" ? p * (1 - PERNA) : p * (1 + PERNA), pastrezi = totalLaPret(b, pret);
    if (pastrezi === null || pastrezi <= t) return null;
    var op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
    return { pret: pret, pastrezi: pastrezi, perna: PERNA, opritor: op, opritorPastreaza: op !== null ? totalLaPret(b, op) : null };
  }

  // v97.6 "plan cerut la botul nou": ult = { plus, minus, afaraOre, investit?, nume? } (planul lui cel mai nou)
  function propunePlan(ult, investitNou) {
    var inv = nr(investitNou), r1 = function (v) { return v === null || !isFinite(v) ? null : Math.round(v * 10) / 10; };
    if (ult && (nr(ult.plus) > 0 || nr(ult.minus) > 0)) {
      var ui = nr(ult.investit), k = ui > 0 && inv > 0 ? inv / ui : 1, v = function (x) { return String(x).replace(".", ","); }, cum = ui > 0 && inv > 0 ? "scalat de la " + v(r1(ui)) + " la " + v(r1(inv)) + " USDT" : "aceleași sume";
      return { plus: r1(nr(ult.plus) * k), minus: r1(nr(ult.minus) * k), afaraOre: nr(ult.afaraOre) || 12,
        nota: "după planul tău de la " + (ult.nume || "botul de dinainte") + " (+" + v(ult.plus) + " / −" + v(ult.minus) + " USDT" + (ult.afaraOre ? " / " + ult.afaraOre + " h" : "") + ", " + cum + ")" };
    }
    if (inv > 0) return { plus: r1(inv * 0.03), minus: r1(inv * 0.15), afaraOre: 12, nota: "propunerea mea: +3% / −15% din investiție / 12 h afară din grid" };
    return null;
  }

  // v97.7 "fisa de inchidere" (27.09: ICP inchis de opritor dupa 1,5 h, VVV incasat peste tinta): cat a tinut, cu cat a
  // iesit si DE CE, cat au adus grilele si cat pozitia, ce spunea planul lui si lectia - doar din fapte.
  // b = botul inchis (bot-orders?status=finished), o = { plan?: {plus, minus}, atrPct?: miscarea zilnica a monedei (Scan) }
  var MOTIV = { user_cancel: "l-ai închis tu", loss_stop: "opritorul de pierdere", profit_stop: "opritorul de profit (ținta)", liquidation: "LICHIDAT", liquidated: "LICHIDAT", system_cancel: "închis de Pionex" };
  function fisaInchidere(b, o) {
    o = o || {};
    var nume = String(b && b.baza || "Botul").replace(/\.PERP$/, ""), tot = nr(b && b.profitTotal), inv = nr(b && b.investit), grid = nr(b && b.gridProfitBrut);
    var t0 = nr(b && b.pornitLa), t1 = nr(b && b.inchisLa), mot = String(b && b.motivInchidere || ""), lichidat = /liquid/i.test(mot);
    var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; }, P = function (v, z) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; };
    var dur = t0 && t1 && t1 > t0 ? t1 - t0 : null, durTxt = dur === null ? "" : dur < 3600000 ? Math.round(dur / 60000) + " min" : dur < 48 * 3600000 ? Math.floor(dur / 3600000) + " h " + Math.round(dur % 3600000 / 60000) + " min" : (dur / 86400000).toFixed(1).replace(".", ",") + " zile";
    var pct = tot !== null && inv > 0 ? tot / inv * 100 : null;
    var titlu = "🔍 " + nume + " închis: " + (tot === null ? "rezultat necunoscut" : U(tot) + (pct !== null ? " (" + P(pct) + ")" : "")) + (durTxt ? " după " + durTxt : "");
    var L = [];
    var mt = MOTIV[mot] || (mot ? mot.replace(/_/g, " ") : "necunoscut");
    if (mot === "loss_stop" && b.opritorPierdereTip === "raport" && nr(b.opritorPierdereRaport) !== null) mt += " (" + P(nr(b.opritorPierdereRaport) * 100, 2) + " din investiție)";
    L.push("De ce: " + mt + ".");
    if (grid !== null && tot !== null) L.push("Grilele au adus " + U(grid) + (nr(b.ordinePerechi) !== null ? " în " + b.ordinePerechi + " perechi" : "") + "; poziția și costurile au dus restul (" + U(tot - grid) + ").");
    var pl = o.plan, plus = pl ? nr(pl.plus) : null, minus = pl ? nr(pl.minus) : null;
    if (plus || minus) L.push("Planul tău: +" + (plus || "—") + " / −" + (minus || "—") + " USDT → " + (tot === null ? "—" : plus && tot >= plus ? "ținta atinsă" + (tot > plus ? ", ai ieșit peste ea" : "") : minus && tot <= -minus ? "pragul de minus atins" : tot < 0 ? "ai ieșit înainte de pragul tău de minus" : "ai ieșit înainte de țintă") + ".");
    else L.push("Planul tău: n-avea plan scris.");
    // v100.32 (30.09, el: „fa 1/2/3”): inchis in PRIMA ORA -> cat l-au costat comisioanele (fata de grile) + cifra din istoria lui
    var com = nr(b && b.comisioane), so = o.subOOra;
    if (dur !== null && dur < 3600000 && com !== null) L.push("Închis în prima oră (" + durTxt + "): comisioanele lui " + U(-Math.abs(com))
      + (grid !== null && grid > 0 ? " — " + Math.round(Math.abs(com) / grid * 100) + "% din ce au făcut grilele" : "")
      + (so && nr(so.n) ? "; pe istoria ta: " + so.n + " de boți închiși în prima oră, net " + U(nr(so.net) || 0) + ", din care comisioane " + U(nr(so.comisioane) || 0) : "") + ".");
    // lectiile - doar din fapte
    var lec = [], atr = nr(o.atrPct), rap = nr(b.opritorPierdereRaport), lev = nr(b.levier) || 1;
    if (mot === "loss_stop" && atr !== null && rap !== null && Math.abs(rap * 100) / lev < atr) lec.push("opritorul (" + P(rap * 100, 2) + " din investiție, adică ~" + (Math.abs(rap * 100) / lev).toFixed(1).replace(".", ",") + "% din preț la levier " + lev + "×) era mai mic decât mișcarea unei zile obișnuite a " + nume + " (~" + atr.toFixed(1).replace(".", ",") + "%): o zi normală îl putea atinge");
    if (tot !== null && tot < 0 && dur !== null && dur < 3 * 3600000) lec.push("a ținut sub 3 ore: gridul n-a apucat să facă perechi");
    if (plus && tot !== null && tot > plus && mot === "user_cancel") lec.push("ai ieșit peste ținta ta: ținerea după țintă a adus " + U(tot - plus));
    if (grid !== null && tot !== null && grid > 0 && tot < 0) lec.push("grilele au câștigat, dar poziția a pierdut mai mult: greșeala nr. 1 din jurnalul tău");
    else if (grid !== null && tot !== null && grid > 0 && tot >= 0 && tot < grid * 0.7) lec.push("poziția a mâncat " + U(grid - tot).replace("+", "") + " din ce au făcut grilele (greșeala nr. 1 din jurnalul tău, dar tot pe plus)");
    if (lec.length) L.push("Lecția: " + lec.join("; ") + ".");
    return { nivel: lichidat ? "critic" : tot !== null && tot < 0 ? "atentie" : "info", titlu: titlu, mesaj: L.join("\n"), lichidat: lichidat, tot: tot, pct: pct, durata: dur, motiv: mot };
  }

  function legaturaJurnal(lista, b) {
    if (!Array.isArray(lista) || !b || !b.id) return null;
    for (var i = 0; i < lista.length; i++) if (lista[i] && String(lista[i].botId) === String(b.id)) return lista[i];
    return null;
  }

  // v81 (1) Ziua botului: din istoricul minut-cu-minut (colectorul, 7 zile) -> pe fiecare zi
  // (ora Romaniei) cat au adus grilele (ultima minus ultima de ieri) si totalul la sfarsit.
  function peZile(ist, tz) {
    if (!Array.isArray(ist) || !ist.length) return [];
    var f;
    try { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }); } catch (e) { f = null; }
    var zi = function (t) { return f ? f.format(new Date(t)) : new Date(t).toISOString().slice(0, 10); };
    var l = ist.filter(function (x) { return x && nr(x.t) !== null; }).slice().sort(function (a, b) { return a.t - b.t; });
    var zile = [], cur = null;
    l.forEach(function (x) {
      var z = zi(x.t);
      if (!cur || cur.zi !== z) { cur = { zi: z, prim: x, ultim: x }; zile.push(cur); } else cur.ultim = x;
    });
    return zile.map(function (d, i) {
      var sf = nr(d.ultim.gridProfitBrut), dinainte = i > 0 ? nr(zile[i - 1].ultim.gridProfitBrut) : nr(d.prim.gridProfitBrut);
      return { zi: d.zi, grile: sf !== null && dinainte !== null ? sf - dinainte : null, total: nr(d.ultim.profitTotal) };
    });
  }

  // v81 (2) Daca adaug marja M: marja izolata in plus muta lichidarea cu M / pozitie
  // (long in jos, short in sus). Aproximare: Pionex poate rotunji altfel.
  function marjaNoua(b, M) {
    var q = nr(b && b.pozitie), L = nr(b && b.pretLichidare), p = nr(b && b.pretCurent), dir = String(b && b.directie || "").toLowerCase();
    M = nr(M);
    if (!(M > 0) || !(Math.abs(q) > 0) || L === null || !(L > 0) || (dir !== "long" && dir !== "short")) return null;
    var nou = dir === "long" ? L - M / Math.abs(q) : L + M / Math.abs(q);
    if (dir === "long" && nou < 0) nou = 0;
    return { lichidare: nou, distantaPct: p > 0 ? Math.abs(p - nou) / p : null, inainte: L };
  }

  // v81 (4) Botul vs "sa fi tinut doar pozitia": un long/short simplu cu aceeasi suma si
  // acelasi levier, deschis la pretul de pornire al botului. La neutru: vs a nu face nimic.
  function vsPozitie(b) {
    var d = bu(b), inv = nr(b && b.investit), lev = nr(b && b.levier), init = nr(d.initPrice), p = nr(b && b.pretCurent), tot = nr(b && b.profitTotal);
    var dir = String(b && b.directie || "").toLowerCase();
    if (inv === null || tot === null) return null;
    var poz = dir === "long" || dir === "short" ? (init > 0 && p > 0 && lev > 0 ? (dir === "long" ? 1 : -1) * inv * lev * (p - init) / init : null) : 0;
    return { pozitieSimpla: poz, bot: tot, diferenta: poz === null ? null : tot - poz, pretPornire: init };
  }

  // v81 (3) Planul lui: {plus: USDT, minus: USDT, afaraOre: ore}. stare.afaraDe = de cand e
  // pretul in afara gridului (il tine colectorul/tabloul). Intoarce distantele si ce s-a atins.
  // v100.39 (audit 30.09): pragul pe minus are HISTEREZIS - odata atins (stare.minusAtins), ramane atins pana cand totalul revine
  // peste 80% din prag. Inainte, cu totalul oscilind in jurul pragului, semaforul sarea IESI <-> ATENTIE la cateva minute.
  function planStare(b, plan, stare, acum) {
    if (!plan || !b) return null;
    var tot = nr(b.profitTotal), out = { plus: null, minus: null, afara: null, atins: [] };
    if (nr(plan.plus) > 0 && tot !== null) {
      // v96.4 "tinta devine podea": pretul la care totalul e exact tinta - acolo se pune opritorul, cand tinta e atinsa
      out.plus = { prag: nr(plan.plus), lipsa: nr(plan.plus) - tot, podea: pretPentruTotal(b, nr(plan.plus)) };
      if (tot >= nr(plan.plus)) { out.atins.push("plus"); out.plus.urca = podeaUrca(b, nr(plan.plus)); }
      // v96.5: cat pastreaza opritorul LUI de acum (27.09: l-a pus la 30,511 = podeaua 30,5111 rotunjita la pasul Pionex
      // si panoul tot zicea "muta-l" - comparam preturi la a 4-a zecimala; acum se compara SUMA pastrata)
      var opA = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
      out.plus.opritorPastreaza = opA !== null ? totalLaPret(b, opA) : null;
      // v101.8: cat are botul la tinta LUI din Pionex si unde se atinge planul (null = nu se atinge doar din pret, in grid)
      out.plus.laTinta = totalLaTinta(b); out.plus.tintaPlan = pretTintaPentru(b, nr(plan.plus));
    }
    if (nr(plan.minus) > 0 && tot !== null) {
      out.minus = { prag: nr(plan.minus), lipsa: nr(plan.minus) + tot };
      if (tot <= -nr(plan.minus) || (stare && stare.minusAtins && tot <= -0.8 * nr(plan.minus))) out.atins.push("minus");
      // v101.7: planul pe minus e doar alerta; opritorul din Pionex e ce lucreaza si noaptea - cat costa el atins si unde ar sta planul
      out.minus.laOpritor = totalLaOpritor(b); out.minus.opritorPlan = pretOpritorPentru(b, -nr(plan.minus));
      // v101.8: incape gridul in plan? (totalul la marginea de pierdere, iesirea fata de miscarea obisnuita, levierul potrivit)
      var ip = incapePlanul(b, nr(plan.minus), stare ? nr(stare.ampZi) : null);
      out.minus.laMargine = ip.laMargine; out.minus.iesire = ip.iesire; out.minus.ampZi = ip.amp; out.minus.levierPotrivit = ip.levier;
    }
    if (nr(plan.afaraOre) > 0) {
      var de = stare && nr(stare.afaraDe), ore = de ? ((acum || Date.now()) - de) / 3600000 : 0;
      out.afara = { prag: nr(plan.afaraOre), ore: ore, afara: !!de };
      if (de && ore >= nr(plan.afaraOre)) out.atins.push("afara");
    }
    return out;
  }

  // v81 (5) Evenimentele pe grafic: iesirile/revenirile din grid (din istoricul de preturi)
  // si alertele colectorului, doar cele din fereastra [deLa, panaLa].
  function evenimente(ist, alerte, jos, sus, deLa, panaLa) {
    var out = [], inauntru = null;
    (Array.isArray(ist) ? ist.slice().sort(function (a, b) { return a.t - b.t; }) : []).forEach(function (x) {
      var p = nr(x.pretPerp), t = nr(x.t); if (p === null || t === null || !(jos > 0) || !(sus > jos)) return;
      var acum = p >= jos && p <= sus;
      if (inauntru !== null && acum !== inauntru && t >= deLa && t <= panaLa) out.push({ t: t, fel: acum ? "revenire" : p > sus ? "iesire-sus" : "iesire-jos", text: acum ? "revine în grid" : "iese din grid " + (p > sus ? "pe sus" : "pe jos") });
      inauntru = acum;
    });
    (Array.isArray(alerte) ? alerte : []).forEach(function (a) { var t = nr(a && a.t); if (t !== null && t >= deLa && t <= panaLa) out.push({ t: t, fel: "alerta", text: String(a.titlu || "alertă"), nivel: a.nivel }); });
    return out.sort(function (a, b) { return a.t - b.t; });
  }

  // v84.1: cat mai e pana la marginile gridului, in % din pretul de acum (el: "nu mai e distanta pana la grid?")
  function distanteGrid(b) {
    var p = nr(b && b.pretCurent), jos = nr(b && b.gridJos), sus = nr(b && b.gridSus);
    if (p === null || !(p > 0) || jos === null || sus === null || !(sus > jos)) return null;
    var f = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
    var j = (p - jos) / p, s = (sus - p) / p, inGrid = p >= jos && p <= sus;
    // v84.2: pill-ul pozitiei - verde la mijloc, galben in 10-25% de la o margine, rosu sub 10% sau afara
    var poz = (p - jos) / (sus - jos), m = Math.min(poz, 1 - poz);
    var pill = inGrid ? Math.round(poz * 100) + "% în grid" : p < jos ? "sub grid" : "peste grid";
    var ton = !inGrid || m < 0.10 ? "rau" : m < 0.25 ? "atentie" : "bine";
    return { poz: poz, pill: pill, ton: ton, josPct: j, susPct: s, inGrid: inGrid, text: inGrid ? "↓ " + f(j) + " până jos · ↑ " + f(s) + " până sus" : p < jos ? "sub grid cu " + f(-j) : "peste grid cu " + f(-s) };
  }

  // v100.8 (el, 28.09: „dacă schimb gridul vreau să-mi apară undeva de copiat pentru TV cu gridul nou”): randul pentru indicatorul
  // GRID-FISA din TradingView (pine-scripts/GRID-FISA), din botul care RULEAZA - acelasi format ca butonul din fisa „Grid: ce setez?”:
  //   dir;jos;sus;grile;levier;stopJos;stopSus;lichJos;lichSus;suma[;tip]  (lipsa = 0; dir = long / neutru / short;
  //   tip = aritmetic / geometric, v100.9, pentru GRID-FISA v2.0 - v1.1 accepta doar 9-10 campuri; + ;planMinus;planPlus;planAfaraOre)
  // Opritoarele: doar cele PUSE; cel de sub pretul de acum merge la „jos”, cel de deasupra la „sus” (la long sus = take-profit,
  // cum il eticheteaza scriptul); la short, ca in fisa, jos ramane 0. `sig` = ce inseamna „alt grid” (fara lichidare si suma,
  // care se misca singure cu pozitia si marja).
  function codTVBot(b, plan, extra) {
    if (!b) return null;
    var d = bu(b), jos = nr(b.gridJos), sus = nr(b.gridSus), grile = nr(d.row), lev = nr(b.levier);
    if (jos === null || sus === null || !(sus > jos) || !(grile >= 2)) return null;
    var dr = String(b.directie || "").toLowerCase(), dir = dr === "long" ? "long" : dr === "short" ? "short" : "neutru";
    // v100.11 (auditul GRID-FISA v2.0, 28.09): opritoarele dupa ROL, nu dupa partea pretului - Pine-ul citeste „sus” ca take-profit
    // DOAR la long; la short si la neutru ambele campuri sunt stop-loss. Dupa partea pretului, la neutru TP-ul de deasupra ajungea
    // „stop-loss atins”, iar la long cu pretul invechit sub stop, stopul ajungea sus. Long: pierderea jos, profitul sus.
    // Short: pierderea sus, profitul NU (ar fi citit ca stop). Neutru: doar pierderea, pe partea ei fata de mijlocul gridului.
    var sj = null, ss = null, pierd = b.opritorPierdereActiv && nr(b.opritorPierdere) > 0 ? nr(b.opritorPierdere) : null, prof = b.opritorProfitActiv && nr(b.opritorProfit) > 0 ? nr(b.opritorProfit) : null;
    if (dir === "long") { sj = pierd; ss = prof; }
    else if (dir === "short") ss = pierd;
    else if (pierd !== null) { if (pierd < (jos + sus) / 2) sj = pierd; else ss = pierd; }
    // fara exponent („1.2e-7”) la monedele foarte ieftine: 6 cifre semnificative scrise intreg
    var f = function (v) { v = nr(v); if (v === null || !(v > 0)) return "0"; var s = String(Number(v.toPrecision(6))); return /e/i.test(s) ? Number(v.toPrecision(6)).toFixed(Math.min(20, 5 - Math.floor(Math.log10(v)))).replace(/\.?0+$/, "") : s; };
    var suma = nr(b.investit);
    var parti = [dir, f(jos), f(sus), String(Math.round(grile)), String(lev !== null && lev >= 1 ? Math.round(lev) : 1), f(sj), f(ss), f(b.lichidareJos), f(b.lichidareSus), suma > 0 ? String(Math.round(suma * 100) / 100) : "0"];
    // v100.9: GRID-FISA v2.0 primeste si tipul gridului (al 11-lea camp) - botul il stie, deci grilele se deseneaza exact ca in Pionex
    var gt = String(d.gridType || "").toLowerCase(), tip = gt === "arithmetic" ? "aritmetic" : gt === "geometric" ? "geometric" : null;
    if (tip) parti.push(tip);
    // v100.9 (cerut de el prin sesiunea GRID-FISA v2.0): planul lui in acelasi cod - planMinus;planPlus;planAfaraOre (USDT, USDT, ore;
    // 0 = fara), doar cand exista un plan adevarat (nu cel de proba); tipul necunoscut ramane gol ca pozitiile sa nu alunece.
    // Planul NU intra in semnatura: alt plan nu e alt grid.
    var pl = plan && !plan.proba ? plan : null, pv = function (v) { v = nr(v); return v !== null && Math.abs(v) > 0 ? String(Math.abs(v)) : "0"; };
    var arePlan = pl && (pv(pl.minus) !== "0" || pv(pl.plus) !== "0" || pv(pl.afaraOre) !== "0");
    if (arePlan) { if (!tip) parti.push(""); parti.push(pv(pl.minus), pv(pl.plus), pv(pl.afaraOre)); }
    // v100.48 (auditul GRID-FISA v2.1, 01.10): campurile 15-18 pentru GRID-FISA v2.2 - verdictul fisei (gol: botul ruleaza deja),
    // momentul generarii codului (Pine spune cat de veche e lichidarea copiata - Pionex o muta singur) si pragurile marginii din profilul
    // monedei (P75 pe 12 h, fractii de pret; 0 = fara profil -> Pine ramane pe 10% din interval). Pozitiile 11-14 se completeaza ca
    // sa nu alunece. Nu intra in semnatura: alt moment nu e alt grid.
    if (extra) {
      if (parti.length === 10) parti.push(tip || "");
      if (parti.length === 11) parti.push("0", "0", "0");
      var fr = function (v) { v = nr(v); return v !== null && v > 0 ? v.toFixed(5) : "0"; };
      parti.push(String(extra.verdict || ""), nr(extra.copiatLa) !== null ? String(Math.round(extra.copiatLa)) : "", fr(extra.margJos), fr(extra.margSus));
    }
    return { cod: parti.join(";"), sig: parti.slice(0, 7).concat(tip ? [tip] : []).join(";"), jos: jos, sus: sus, grile: Math.round(grile), dir: dir, tip: tip };
  }

  // v100.37 (30.09, el: „fa idei”): fisa propune un grid, dar pe moneda aceea poate rula un bot cu ALTUL (CRV: fisa 0,3822–0,4307 / 5 grile,
  // botul 0,3755–0,423 / 8 grile) - codul fisei lipit in GRID-FISA nu da atunci liniile botului. null = fara bot activ; acelasi = acelasi grid (0,2%)
  function gridDiferitDeBot(setare, b) {
    if (!b || b.activ === false || !setare) return null;
    var c = codTVBot(b, null); if (!c) return null;
    var aproape = function (a, x) { a = nr(a); return a !== null && x > 0 && Math.abs(a - x) / x <= 0.002; };
    // v100.38: setarea (N intervale) e acelasi grid cu botul daca N + 1 = numarul de grile Pionex (linii) al botului
    var acelasi = aproape(setare.jos, c.jos) && aproape(setare.sus, c.sus) && Math.round(nr(setare.grile) || 0) + 1 === c.grile;
    return { acelasi: acelasi, jos: c.jos, sus: c.sus, grile: c.grile, tip: c.tip, cod: c.cod };
  }

  // v86: "Ce ai de facut acum" pe Tabloul botului - fiecare lucru O SINGURA DATA (v100.8: cele mai noi sus, apoi urgenta).
  // Surse: alertele colectorului din ultimele 24 h (critic/atentie, stranse pe titlu: 5 la fel = un rand "x5"),
  // avertismentele serverului (unite cu alerta care spune acelasi lucru), sfaturile (critic/atentie; info doar
  // daca are "ce as face eu"; "bine" nu) si planul lipsa. c: r = rosu, g = galben, n = gri, v = nimic urgent.
  // v100.5: fiecare rand are ora lui (la): alerta = cea mai noua din grup; restul = o.dateLa (ultima citire a botului).
  function ceAiDeFacut(o) {
    o = o || {};
    var acum = o.acum || Date.now(), out = [], dateLa = nr(o.dateLa);
    function norm(x) { return String(x || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
    function cuv(x) { return norm(x).split(" ").filter(function (w) { return w.length >= 4; }); }
    function acelasi(a, b) {
      var A = cuv(a), B = cuv(b); if (!A.length || !B.length) return false;
      var comune = A.filter(function (w) { return B.indexOf(w) >= 0; }).length;
      return comune >= Math.min(3, A.length, B.length);
    }
    // 1) alertele stranse
    var gr = [];
    // v100.9 (el, 28.09: „să rămână mereu ultima alertă”): alertele de ACELAȘI FEL se strâng chiar dacă cifrele din titlu diferă
    // („Lichidarea la 2.7%” de la 13:00 și „Lichidarea la 14.8%” de la 15:41 = un singur rând): rămâne CEA MAI NOUĂ - titlul,
    // textul și culoarea ei (starea de acum, nu cea mai gravă din trecut); câte au fost se vede în „×N”.
    function fel(x) { return norm(x).replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
    (Array.isArray(o.alerte) ? o.alerte : []).slice().sort(function (x, y) { return (x && x.t || 0) - (y && y.t || 0); }).forEach(function (a) {
      if (!a || !a.titlu || !(a.t > 0) || acum - a.t > 86400000 || (a.nivel !== "critic" && a.nivel !== "atentie")) return;
      var t = String(a.titlu).replace(/^[A-Z0-9._-]+: /, ""), g = null;
      for (var i = 0; i < gr.length; i++) if (fel(gr[i].titlu) === fel(t)) { g = gr[i]; break; }
      if (!g) { g = { c: a.nivel === "critic" ? "r" : "g", titlu: t, text: String(a.mesaj || ""), n: 0, ultima: a.t }; gr.push(g); }
      g.n++;
      if (a.t >= g.ultima) { g.ultima = a.t; g.titlu = t; g.text = String(a.mesaj || g.text); g.c = a.nivel === "critic" ? "r" : "g"; }
    });
    // 2) avertismentele serverului; cel care spune acelasi lucru ca o alerta o inghite (si ii ia numarul)
    (Array.isArray(o.avertismente) ? o.avertismente : []).forEach(function (a) {
      if (!a || !String(a).trim()) return;
      var it = { c: "g", titlu: String(a), text: "", n: 0, la: dateLa };
      for (var i = 0; i < gr.length; i++) if (acelasi(gr[i].titlu, a)) { it.c = gr[i].c; it.n = gr[i].n; it.text = gr[i].text; it.la = gr[i].ultima; gr.splice(i, 1); break; }
      out.push(it);
    });
    // v100.10 (el, 28.09: „ok” la „«Nu ai un plan» și alerta «Botul n-are plan» apar pe 2 rânduri”): alerta colectorului despre planul
    // lipsa nu mai are rand propriu - daca planul lipseste, il spune randul „Nu ai un plan pentru bot” (cu butonul lui); daca e pus, alerta e depasita
    gr = gr.filter(function (g) { return !/\bn are plan\b|\bfara plan\b/.test(fel(g.titlu)); });
    out = out.concat(gr.map(function (g) { g.la = g.ultima; return g; }));
    // 3) sfaturile
    var bine = null;
    (Array.isArray(o.sfaturi) ? o.sfaturi : []).forEach(function (x) {
      if (!x || !x.titlu) return;
      if (x.ton === "bine") { if (/nimic urgent/i.test(x.titlu)) bine = x; return; }
      var c = x.ton === "critic" ? "r" : x.ton === "atentie" ? "g" : x.faCe ? "n" : null;
      if (!c || out.some(function (y) { return acelasi(y.titlu, x.titlu); })) return;
      out.push({ c: c, titlu: x.titlu, text: String(x.text || "") + (x.faCe ? " 👉 " + x.faCe : ""), n: 0, la: dateLa });
    });
    if (o.planGol) out.push({ c: "n", titlu: "Nu ai un plan pentru bot", text: "Cu planul scris la rece, colectorul te anunță când se atinge un prag.", n: 0, actiune: "plan", la: dateLa });
    var R = { r: 0, g: 1, n: 2 };
    // v100.8 (el, 28.09: „alertele se arată cele mai vechi sus și alea noi în coadă, ceea ce nu e normal”): cele mai NOI sus;
    // la aceeasi ora (sfaturile de acum au toate ora citirii), cea mai urgenta prima; fara ora - la coada
    out.sort(function (a, b) { var la = nr(a.la), lb = nr(b.la); if (la !== lb) return la === null ? 1 : lb === null ? -1 : lb - la; return R[a.c] - R[b.c]; });
    if (!out.length) out.push({ c: "v", titlu: "Nimic urgent", text: bine ? String(bine.text || "") + (bine.faCe ? " 👉 " + bine.faCe : "") : "Nu văd nimic care să ceară o mișcare acum.", n: 0, la: dateLa });
    return out;
  }

  // v100.5: ora unui sfat, ca omul sa vada daca e de actualitate: "HH:MM · acum N min" ("ieri HH:MM" pentru ziua trecuta);
  // vechi = peste o ora. Ora locala a browserului.
  function oraSfat(la, acum) {
    la = nr(la); if (la === null || !(la > 0)) return null;
    acum = nr(acum) || Date.now();
    var d = new Date(la), a = new Date(acum), doi = function (x) { return (x < 10 ? "0" : "") + x; };
    var ora = doi(d.getHours()) + ":" + doi(d.getMinutes());
    var ieri = new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1);
    if (d.getFullYear() === ieri.getFullYear() && d.getMonth() === ieri.getMonth() && d.getDate() === ieri.getDate()) ora = "ieri " + ora;
    else if (d.toDateString() !== a.toDateString()) ora = doi(d.getDate()) + "." + doi(d.getMonth() + 1) + " " + ora;
    var min = Math.floor((acum - la) / 60000), cat;
    if (min < 1) cat = "chiar acum";
    else if (min < 60) cat = "acum " + min + " min";
    else { var h = Math.floor(min / 60), m = min % 60; cat = "acum " + h + " h" + (m && h < 6 ? " " + m + " min" : ""); }
    return { text: ora + " · " + cat, vechi: min >= 60 };
  }

  // v87: in cate zile ajunge botul pe zero la ritmul de azi (grile - costuri pe zi), daca pretul sta pe loc
  function ritmRecuperare(total, netZi) {
    if (total === null || total === undefined || !isFinite(total) || netZi === null || netZi === undefined || !isFinite(netZi)) return null;
    if (total >= 0) return { zile: 0, text: "botul e pe plus: nimic de recuperat" };
    if (netZi <= 0) return { zile: null, text: "la ritmul de azi nu se recuperează: grilele nu acoperă costurile" };
    var z = -total / netZi;
    return { zile: z, text: "~" + (z < 10 ? z.toFixed(1).replace(".", ",") : Math.round(z)) + " zile până pe zero la ritmul de azi (" + TextRo.usdt(netZi) + "/zi), dacă prețul stă pe loc" };   // v100.62: virgula prin TextRo
  }
  // v87: cat din castigul unei umpleri ia comisionul; v100.39: pe grile Pionex ia 0,02% (maker) la intrare + 0,02% la iesire
  function comisionDinUmplere(netPct) {
    if (netPct === null || netPct === undefined || !isFinite(netPct)) return null;
    var c = 2 * C.COMISION_GRILA; return c / (netPct + c);
  }

  // v90: pe Tabloul unui bot intra doar alertele LUI si, din cele fara bot, doar ale colectorului din ultimele 2 ore
  // (nu ale altui bot, nu ale actiunilor T212, nu rezumatul de dimineata)
  // v91.4: "nu mai poate citi botul" e REZOLVATA cand vine dupa ea revenirea colectorului ("citeste din nou botul")
  function alertaRezolvata(a, lista) {
    if (!a || a.cheie !== "colector" || !/nu mai poate citi/i.test(String(a.titlu || ""))) return false;
    return (Array.isArray(lista) ? lista : []).some(function (b) { return b && b.cheie === "colector" && b.t >= a.t && /citește din nou|citeste din nou/i.test(String(b.titlu || "")); });
  }
  // alertele colectorului: 2 ore, fara cele informative (revenirea), fara cele rezolvate si fara "X nu mai apare in lista" (e despre ALT bot, deja inchis)
  function alerteleBotului(alerte, botId, acum) {
    var a0 = acum || Date.now(), l = Array.isArray(alerte) ? alerte : [];
    return l.filter(function (a) { return a && (a.bot ? String(a.bot) === String(botId) : a.cheie === "colector" && a.nivel !== "info" && a0 - a.t < 2 * 3600000 && !alertaRezolvata(a, l) && !/nu mai apare în lista/i.test(String(a.titlu || ""))); });
  }

  return { cifreActiuni: cifreActiuni, textBani: textBani, frecventaAtingere: frecventaAtingere, codTVBot: codTVBot, gridDiferitDeBot: gridDiferitDeBot, alertaRezolvata: alertaRezolvata, alerteleBotului: alerteleBotului, ritmRecuperare: ritmRecuperare, comisionDinUmplere: comisionDinUmplere, ceAiDeFacut: ceAiDeFacut, oraSfat: oraSfat, distanteGrid: distanteGrid, geometrieBot: geometrieBot, profitPeGrila: profitPeGrila, comparaCuFisa: comparaCuFisa, grileVsCosturi: grileVsCosturi, dacaInchizi: dacaInchizi, pretPentruTotal: pretPentruTotal, totalLaPret: totalLaPret, totalCuGridLa: totalCuGridLa, totalLaOpritor: totalLaOpritor, pretOpritorPentru: pretOpritorPentru, totalLaTinta: totalLaTinta, pretTintaPentru: pretTintaPentru, miscareZi: miscareZi, podeaUrca: podeaUrca, propunePlan: propunePlan, fisaInchidere: fisaInchidere, legaturaJurnal: legaturaJurnal,
    peZile: peZile, marjaNoua: marjaNoua, vsPozitie: vsPozitie, planStare: planStare, evenimente: evenimente };
})();
if (typeof globalThis !== "undefined") globalThis.TabloExtra = TabloExtra;
