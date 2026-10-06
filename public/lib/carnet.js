// Carnetul fișei (v100.117, I-561; el 06.10: „Fișa are dreptate?”, „Istoric + înainte”, „Da, așa”) - pur, folosit de colector
// (laboratorul de noapte) și de pagină. Specul: docs/superpowers/specs/2026-10-06-carnetul-fisei-design.md
// Ce judecă: (1) alegerea ÎNGUST / LARG (GridPlan.alege) - varianta aleasă față de cealaltă, pe aceeași fereastră; (2) „aș aștepta”;
// (3) stopul promis de probă (proba.stop / proba.n) față de cel venit; (4) doar înainte: „pornește / aștept” din ofertele fișei.
// Re-jocul NU privește în viitor: la pornirea s fișa primește doar barele DE DINAINTE (30 de zile) și prețul de deschidere al barei s.
(function (root) {
  "use strict";
  var G = root.GridCalcul, GP = root.GridProba, PL = root.GridPlan, RL = root.RiscLuna;
  var BZ = 96, ZILE_FISA = 30, FEREASTRA = 3, W = FEREASTRA * BZ, ZI = 86400000;
  function nr(v) { var x = Number(v); return v === null || v === undefined || v === "" || !isFinite(x) ? null : x; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var P1 = function (x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
  var P0 = function (x) { return Math.round(x * 100) + "%"; };

  // o variantă (banda absolută, grilele, levierul, stopul) pornită la bara s, pe fereastra fișei (3 zile); stopul = ieșit pe partea pierderii
  function simVarianta(b15, s, v, dir) {
    if (!Array.isArray(b15) || !v || !(v.grile > 0) || s < 0 || s + W > b15.length) return null;
    var r = GP.simuleaza(b15, s, W, { dir: dir, jos: v.jos, sus: v.sus, grile: v.grile, levier: v.levier, stop: v.stop });
    var stop = !!r.lichidat || (!!r.iesit && ((r.iesit === "jos") === (dir === "long")));
    return { net: r.net, stop: stop, lichidat: !!r.lichidat };
  }
  // revizia (M1): proba numără lichidările separat de stop; stopul VENIT le cuprinde ⇒ și cel promis le cuprinde
  function pStop(v) { var p = v && v.proba; return p && p.n > 0 && nr(p.stop) !== null ? (p.stop + (nr(p.lichidari) || 0)) / p.n : nr(v && v.pStop); }
  function setare(v) { return v ? { jos: v.jos, sus: v.sus, grile: v.grile, levier: v.levier, stop: v.stop ? { jos: v.stop.jos, sus: v.stop.sus } : null, pStop: pStop(v) } : null; }

  // fișa la o pornire, pe aceeași cale ca pagina (revizia I1/I2): GridProba.fisa (direcția pieței, H 2) ⇒ levierul sigur (setarePropusa) ⇒
  // GridPlan.variante pe 30 de zile, plafonată la levierul sigur (v100.110). Barele de 4 h / zi vin din cele 30 de zile de 15M (pagina le are de la Pionex).
  // o: { plan, suma, levier, miscareZi(bare, acum), erori? {n} } ⇒ { levierSigur, pe: { long: {v, a}, short: {v, a} } }
  function fisaLa(hist, pret, t, o) {
    var sig = null;
    try { var f = GP.fisa({ pret: pret, b15: hist, b4h: G.agrega(hist, 4 * 3600000), b1d: G.agrega(hist, ZI), suma: o.suma || 100, H: 2, dir: null, levier: null }); var st = f && !f.eroare ? GP.setarePropusa(f) : null; sig = st ? nr(st.levierSigur) : null; } catch (e) { if (o.erori) o.erori.n++; }
    var amp = o.miscareZi ? o.miscareZi(hist, t) : null, pe = {};
    ["long", "short"].forEach(function (dir) {
      var v; try { v = PL.variante({ pret: pret, dir: dir, suma: o.suma || 100, levier: o.levier || 5, plan: o.plan, amp: amp, pas: G.C.PAS_MIN, b15: hist, zile: ZILE_FISA, levierSigur: sig }); } catch (e) { if (o.erori) o.erori.n++; return; }
      if (!v || v.eroare || !v.ta) return;
      var a = PL.alege(v.ta, v.mea); if (a) pe[dir] = { v: v, a: a };
    });
    return { levierSigur: sig, pe: pe };
  }
  // re-jocul pe o monedă: o pornire pe zi (o.pasZile), de la 30 de zile de istoric până la ultima fereastră întreagă; long și short
  // o: { simbol, plan, suma, levier, miscareZi(bare, acum), pasZile, erori? {n} }
  function rejoc(b15, o) {
    o = o || {}; var out = [], Z = ZILE_FISA * BZ, pas = Math.max(1, Math.round(nr(o.pasZile) || 1)) * BZ;
    if (!Array.isArray(b15) || b15.length < Z + W) return out;
    for (var s = Z; s + W <= b15.length; s += pas) {
      var fl = fisaLa(b15.slice(s - Z, s), b15[s].o, b15[s].t, o);
      ["long", "short"].forEach(function (dir) {
        var x = fl.pe[dir]; if (!x) return;
        var v = x.v, a = x.a, egale = !v.mea || !!v.mea.egalaCuTa, mea = egale ? v.ta : v.mea;
        var rt = simVarianta(b15, s, v.ta, dir), rm = egale ? rt : simVarianta(b15, s, mea, dir); if (!rt || !rm) return;
        out.push({ simbol: o.simbol, t: b15[s].t, dir: dir, cine: a.cine, asteapta: !!a.asteapta, egale: egale, levierSigur: fl.levierSigur,
          ta: Object.assign(setare(v.ta), rt), mea: Object.assign(setare(mea), rm) });
      });
    }
    return out;
  }
  // ofertele de azi ale laboratorului (revizia I1/M3): aceeași fișă ca re-jocul, pe ultimele 30 de zile; ora = după ultima bară a monedei
  function oferteAzi(b15, o) {
    o = o || {}; var Z = ZILE_FISA * BZ, out = [];
    if (!Array.isArray(b15) || b15.length < Z) return out;
    var u = b15[b15.length - 1], t = u.t + 900000, fl = fisaLa(b15.slice(-Z), u.c, t, o);
    ["long", "short"].forEach(function (dir) {
      var x = fl.pe[dir]; if (!x || !(x.v.ta.grile > 0)) return;
      var egale = !x.v.mea || !!x.v.mea.egalaCuTa;
      out.push({ simbol: o.simbol, t: t, dir: dir, sursa: "laborator", cine: x.a.cine, asteapta: !!x.a.asteapta, egale: egale, levierSigur: fl.levierSigur, ta: setare(x.v.ta), mea: setare(egale ? x.v.ta : x.v.mea) });
    });
    return out;
  }

  // ---------------- întrebările ----------------
  // Verdictul pe MONEDE (măsurat 06.10: bootstrap-ul de percentile al RiscLuna.verdict, pe ~20 de monede, dă „dovedit” pe date fără niciun efect
  // în 3,5% din cazuri, nu în 1%): diferența CU − FĂRĂ pe fiecare monedă care le are pe amândouă, apoi testul de randomizare cu semne
  // întoarse între monede (moneda e unitatea - pornirile din aceeași monedă se suprapun).
  // Revizia (C2): monedele trec prin ACEEAȘI piață - un factor comun face toate diferențele de același semn (măsurat: „dovedit” fals 15–40%) ⇒
  // al doilea test, pe blocuri de timp de 3 zile care nu se suprapun (diferența în fiecare bloc, semnele întoarse; exact până la 14 blocuri).
  // dovedit = ambele p < 0,01 + același semn în ambele jumătăți și pe blocuri; la limită = ambele p < 0,05 + jumătăți;
  // sub 30 de cazuri pe o parte, sub 8 monede sau sub 8 blocuri ⇒ „prea puține” (cu motivul).
  function medie(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return v.length ? s / v.length : null; }
  function pSemne(d, rnd, reps) {
    var obs = Math.abs(medie(d)) - 1e-15, n = d.length, peste = 0, k, s, j;
    if (n <= 14) { var tot = 1 << n; for (k = 0; k < tot; k++) { s = 0; for (j = 0; j < n; j++) s += (k >> j) & 1 ? -d[j] : d[j]; if (Math.abs(s / n) >= obs) peste++; } return peste / tot; }
    for (k = 0; k < reps; k++) { s = 0; for (j = 0; j < n; j++) s += rnd() < 0.5 ? -d[j] : d[j]; if (Math.abs(s / n) >= obs) peste++; }
    return (peste + 1) / (reps + 1);
  }
  function verdictMonede(l, test, o) {
    o = o || {}; var cu = l.filter(function (x) { return test(x) === true; }), fara = l.filter(function (x) { return test(x) === false; });
    var mr = function (a) { return medie(a.map(function (x) { return x.r; })); };
    var baza = { cu: cu.length, fara: fara.length, medieCu: cu.length ? mr(cu) : null, medieFara: fara.length ? mr(fara) : null };
    var gr = {}; l.forEach(function (x) { var k = x.simbol, t = test(x); if (t !== true && t !== false) return; if (!gr[k]) gr[k] = { a: [], b: [] }; gr[k][t ? "a" : "b"].push(x.r); });
    var dc = Object.keys(gr).filter(function (k) { return gr[k].a.length && gr[k].b.length; }).map(function (k) { return medie(gr[k].a) - medie(gr[k].b); });
    var t0 = Infinity, bl = {}; for (var q0 = 0; q0 < l.length; q0++) if (l[q0].t < t0) t0 = l[q0].t;   // revizia: fără Math.min.apply (stiva se rupe peste ~124.000 de puncte)
    l.forEach(function (x) { var t = test(x); if (t !== true && t !== false) return; var k = Math.floor((x.t - t0) / ((o.blocZile || FEREASTRA) * ZI)); if (!bl[k]) bl[k] = { a: [], b: [] }; bl[k][t ? "a" : "b"].push(x.r); });
    var db = Object.keys(bl).filter(function (k) { return bl[k].a.length && bl[k].b.length; }).map(function (k) { return medie(bl[k].a) - medie(bl[k].b); });
    baza.monede = dc.length; baza.blocuri = db.length;
    var motiv = cu.length < 30 || fara.length < 30 ? "cazuri" : dc.length < 8 ? "monede" : db.length < 8 ? "zile" : null;
    if (motiv) return Object.assign(baza, { stare: "prea puține", motiv: motiv, dif: dc.length ? medie(dc) : null });
    var dif = medie(dc), rnd = RL.generator(o.seed || 561), reps = o.reps || 2000;
    var p = pSemne(dc, rnd, reps), pBloc = pSemne(db, rnd, reps), semnBloc = Math.sign(medie(db)) === Math.sign(dif);
    var tm = l.map(function (x) { return x.t; }).sort(function (a, b) { return a - b; }), med = tm[Math.floor(tm.length / 2)];
    var jum = function (f) { var a = cu.filter(function (x) { return f(x.t); }), b = fara.filter(function (x) { return f(x.t); }); return a.length >= 5 && b.length >= 5 ? mr(a) - mr(b) : null; };
    var d1 = jum(function (t) { return t < med; }), d2 = jum(function (t) { return t >= med; });
    var jum2 = d1 !== null && d2 !== null && Math.sign(d1) === Math.sign(dif) && Math.sign(d2) === Math.sign(dif) && semnBloc, sens = dif < 0 ? "rau" : "bun";
    return Object.assign(baza, { dif: dif, p: p, pBloc: pBloc, d1: d1, d2: d2, stare: jum2 && p < 0.01 && pBloc < 0.01 ? "dovedit-" + sens : jum2 && p < 0.05 && pBloc < 0.05 ? "la-limita-" + sens : "nedovedit" });
  }
  function optiuni(o) { o = o || {}; return { reps: o.reps || 2000, seed: o.seed || 561 }; }
  function intrebari(cazuri, o) {
    var l = Array.isArray(cazuri) ? cazuri.filter(function (c) { return c && c.ta && c.mea && nr(c.ta.net) !== null && nr(c.mea.net) !== null; }) : [], per = [], ast = [];
    l.forEach(function (c) {
      var alt = c.cine === "mea" ? "ta" : "mea";
      if (!c.egale && !c.asteapta) { per.push({ r: c[c.cine].net, ales: true, simbol: c.simbol, t: c.t }); per.push({ r: c[alt].net, ales: false, simbol: c.simbol, t: c.t }); }
      ast.push({ r: c[c.cine].net, ast: !!c.asteapta, simbol: c.simbol, t: c.t });
    });
    return { n: l.length, alegere: verdictMonede(per, function (x) { return x.ales; }, optiuni(o)), asteapta: verdictMonede(ast, function (x) { return x.ast; }, optiuni(o)) };
  }
  // stopul promis (varianta aleasă) pe 3 coșuri: promis mediu vs cât a venit
  function calibrare(cazuri) {
    var cos = [{ cos: "sub 30%", de: -1, pana: 0.3 }, { cos: "30–50%", de: 0.3, pana: 0.5 }, { cos: "peste 50%", de: 0.5, pana: 2 }].map(function (c) { return { cos: c.cos, de: c.de, pana: c.pana, n: 0, sp: 0, sv: 0 }; });
    (Array.isArray(cazuri) ? cazuri : []).forEach(function (c) {
      var v = c && c[c.cine], p = nr(v && v.pStop); if (p === null || typeof v.stop !== "boolean") return;
      var k = cos.filter(function (x) { return p >= x.de && (p < x.pana || (x.pana === 0.5 && p === 0.5)) && !(x.de === 0.3 && p < 0.3); })[0] || cos[p < 0.3 ? 0 : p <= 0.5 ? 1 : 2];
      k.n++; k.sp += p; k.sv += v.stop ? 1 : 0;
    });
    return cos.map(function (k) { return { cos: k.cos, n: k.n, promis: k.n ? k.sp / k.n : null, venit: k.n ? k.sv / k.n : null, putine: k.n < 30 }; });
  }

  // ---------------- ofertele înainte ----------------
  // pm = [{ simbol, L: {ta, mea}, S: {ta, mea} }] (laboratorul, variantele întregi) ⇒ ofertele de azi
  function oferte(pm, t) {
    var out = [];
    (Array.isArray(pm) ? pm : []).forEach(function (m) {
      [["long", m.L], ["short", m.S]].forEach(function (p) {
        var X = p[1]; if (!X || !X.ta || !(X.ta.grile > 0)) return;
        var a = PL.alege(X.ta, X.mea); if (!a) return;
        var egale = !X.mea || !!X.mea.egalaCuTa;
        out.push({ simbol: m.simbol, t: t, dir: p[0], sursa: "laborator", cine: a.cine, asteapta: !!a.asteapta, egale: egale, ta: setare(X.ta), mea: setare(egale ? X.ta : X.mea) });
      });
    });
    return out;
  }
  // oferta fișei (KV ferestre, salvată de grFerestreTine) ⇒ forma carnetului. ATENȚIE: acolo „stop” = de câte ori a venit stopul în probă
  // (îl citește GridPlan.fereastraBotului); prețurile stopului sunt în stopJos / stopSus (din v100.117). Cele vechi n-au grile ⇒ nejudecabile.
  function dinFisa(o) {
    if (!o || !o.simbol || !(o.t > 0) || (o.dir !== "long" && o.dir !== "short")) return null;
    var cv = function (v) { return v ? { jos: v.jos, sus: v.sus, grile: v.grile, levier: v.levier, stop: v.stopJos > 0 && v.stopSus > 0 ? { jos: v.stopJos, sus: v.stopSus } : null, pStop: v.n > 0 && nr(v.stop) !== null ? v.stop / v.n : null } : null; };
    var ta = cv(o.ta), mea = cv(o.mea);
    return { simbol: o.simbol, t: o.t, dir: o.dir, sursa: "fisa", verdict: o.verdict || null, cine: o.cine || (o.rec === "larg" ? "mea" : o.rec === "ingust" ? "ta" : null),
      asteapta: o.rec === "asteapta", egale: !!o.egale || !mea || !(mea.grile > 0) || !mea.stop, ta: ta, mea: mea };   // revizia (I3): fără LARG judecabil ⇒ egale
  }
  // după 3 zile, pe barele de DUPĂ ofertă (prima bară de la t, cel mult 15 min distanță); fără grile sau fără prețurile stopului ⇒ nejudecabil
  function judecaOferta(of, b15) {
    if (!of || !of.ta) return null;
    if (!(of.ta.grile > 0) || !(of.ta.stop && of.ta.stop.jos > 0)) return { nejudecabil: true };
    if (!Array.isArray(b15)) return null;
    if (!b15.length) return null;
    if (of.t < b15[0].t - 900000) return { nejudecabil: true };   // revizia (M4): mai veche decât barele aduse
    var i = 0; while (i < b15.length && b15[i].t < of.t) i++;
    if (i >= b15.length) return null;
    if (b15[i].t - of.t > 900000) return { nejudecabil: true };   // gaură în bare chiar la ofertă: n-ar fi aceeași pornire
    var ta = simVarianta(b15, i, of.ta, of.dir); if (!ta) return null;
    var mea = !of.egale && of.mea && of.mea.grile > 0 && of.mea.stop && of.mea.stop.jos > 0 ? simVarianta(b15, i, of.mea, of.dir) : null;
    return { ta: ta, mea: mea };   // revizia (I3): fără LARG judecabil ⇒ null (cazul devine „egale”), nu o copie a lui ÎNGUST
  }
  function cheie(o) { return o.simbol + "|" + o.t + "|" + o.dir + "|" + (o.sursa || ""); }
  // unește ofertele (cea judecată rămâne judecată), păstrate 120 de zile
  function uneste(vechi, noi, acum) {
    var h = {}, ord = [];
    (Array.isArray(vechi) ? vechi : []).concat(Array.isArray(noi) ? noi : []).forEach(function (o) {
      if (!o || !o.simbol || !(o.t > 0)) return; var k = cheie(o);
      if (!h[k]) { ord.push(k); h[k] = o; } else if (!h[k].r && o.r) h[k] = o;
    });
    return ord.map(function (k) { return h[k]; }).filter(function (o) { return o.t >= (acum || Date.now()) - 120 * ZI; });
  }
  // ofertele judecate ⇒ cazuri (aceeași formă ca la re-joc)
  function cazuriDinOferte(l) {
    return (Array.isArray(l) ? l : []).filter(function (o) { return o && o.r && o.r.ta && o.cine; }).map(function (o) {
      var eg = !!o.egale || !o.r.mea;
      return { simbol: o.simbol, t: o.t, dir: o.dir, cine: o.cine, asteapta: !!o.asteapta, egale: eg, verdict: o.verdict || null, sursa: o.sursa,
        ta: Object.assign({}, o.ta, o.r.ta), mea: eg ? Object.assign({}, o.ta, o.r.ta) : Object.assign({}, o.mea, o.r.mea) };
    });
  }
  // (4) „pornește / aștept / nu” - doar pe ofertele fișei (verdictul depinde de semafor, nu se poate re-juca)
  function verdictFisa(cz) {
    var l = (Array.isArray(cz) ? cz : []).filter(function (c) { return c.verdict; });
    var gr = function (f) { var v = l.filter(f).map(function (c) { return c[c.cine].net; }), s = 0; v.forEach(function (x) { s += x; }); return { n: v.length, pePlus: v.length ? v.filter(function (x) { return x > 0; }).length / v.length : null, medie: v.length ? s / v.length : null }; };
    return { n: l.length, pornit: gr(function (c) { return c.verdict === "porneste"; }), asteptat: gr(function (c) { return c.verdict !== "porneste"; }) };
  }

  // ---------------- textele ----------------
  function stareText(s) { return /^dovedit/.test(s) ? "dovedit" : /^la-limita/.test(s) ? "la limită" : s === "nedovedit" ? "nedovedit" : "prea puține cazuri"; }
  // revizia (I4): „prea puține” spune de ce - cazurile, monedele sau zilele (blocurile de 3 zile)
  function dePutine(v) {
    var m = v.motiv || (v.cu < 30 || v.fara < 30 ? "cazuri" : v.monede < 8 ? "monede" : "zile");
    return m === "monede" ? cate(v.cu, "caz", "cazuri") + " pe doar " + cate(v.monede, "monedă", "monede") + ", sub 8" : m === "zile" ? cate(v.cu, "caz", "cazuri") + " în doar " + cate(v.blocuri, "bloc", "blocuri") + " de 3 zile, sub 8" : cate(Math.min(v.cu, v.fara), "caz judecat", "cazuri judecate") + ", sub 30";
  }
  function textAlegere(v) {
    if (!v) return null;
    if (v.stare === "prea puține") return "Alegerea ÎNGUST / LARG: " + dePutine(v) + " - încă nu spune nimic.";
    return "Când am ales ÎNGUST sau LARG, varianta aleasă a ieșit cu " + P1(v.dif) + " față de cealaltă, pe 3 zile (" + cate(v.cu, "caz", "cazuri") + ", " + stareText(v.stare) + ").";
  }
  function textAsteapta(v) {
    if (!v) return null;
    if (v.stare === "prea puține") return "„Aș aștepta”: " + dePutine(v) + " - încă nu spune nimic.";
    return "Când am zis „aș aștepta”, pornirea a ieșit cu " + P1(v.dif) + " față de când n-am zis, pe 3 zile (pe monede; " + stareText(v.stare) + ").";
  }
  function textCalibrare(c) {
    if (!c) return null;
    if (!c.n) return "Stopul promis " + c.cos + ": niciun caz încă.";
    return "Stopul promis " + c.cos + " (în medie " + P0(c.promis) + "): a venit în " + P0(c.venit) + " din " + cate(c.n, "pornire", "porniri") + (c.putine ? ", puține cazuri" : "") + ".";
  }
  function textVerdictFisa(f) {
    if (!f) return null;
    if (f.n < 30) return "„Pornește / aștept” se judecă doar înainte: " + cate(f.n, "ofertă judecată", "oferte judecate") + ", sub 30 - încă nu spune nimic.";
    return "Ofertele cu „pornește” (" + f.pornit.n + ") au ieșit în medie " + P1(f.pornit.medie || 0) + " pe 3 zile, cele cu „aștept” sau „nu” (" + f.asteptat.n + ") " + P1(f.asteptat.medie || 0) + ".";
  }
  function randSubFisa(r) {
    var q = r && r.rejoc && r.rejoc.intrebari, a = q && q.alegere; if (!a) return null;
    if (a.stare === "prea puține") return "Carnetul: alegerea ÎNGUST / LARG are încă prea puține cazuri pe istoric.";
    return "Carnetul: când am ales ÎNGUST sau LARG, varianta aleasă a ieșit cu " + P1(a.dif) + " față de cealaltă (" + stareText(a.stare) + ").";
  }
  function concluzie(q) {
    var s = q && q.alegere && q.alegere.stare;
    if (/-bun$/.test(s || "")) return "Aș urma alegerea fișei: pe istoric, varianta aleasă a ieșit mai bine decât cealaltă.";
    if (/-rau$/.test(s || "")) return "Aș cântări și cealaltă variantă: pe istoric, alegerea fișei a ieșit mai prost.";
    return "Aș lua alegerea fișei ca părere, nu ca dovadă: pe istoric nu se vede o diferență sigură.";
  }

  // raportul pentru server (fără cazurile întregi: doar sumarele - ≤ 256 KB)
  function raport(x) {
    x = x || {}; var cz = Array.isArray(x.cazuri) ? x.cazuri : [], jud = cazuriDinOferte(x.oferte), toate = Array.isArray(x.oferte) ? x.oferte : [];
    var sumar = function (q) { return q ? { stare: q.stare, motiv: q.motiv || null, cu: q.cu, fara: q.fara, dif: q.dif === undefined ? null : q.dif, medieCu: q.medieCu, medieFara: q.medieFara, p: q.p === undefined ? null : q.p, pBloc: q.pBloc === undefined ? null : q.pBloc, monede: q.monede, blocuri: q.blocuri } : null; };
    var q = intrebari(cz, x), qi = intrebari(jud, x), mon = {}; cz.forEach(function (c) { mon[c.simbol] = 1; });
    return { la: x.acum || Date.now(), fereastraZile: FEREASTRA,
      rejoc: { n: cz.length, monede: Object.keys(mon).length, fara: x.fara || 0, ms: x.ms || null, pasZile: x.pasZile || 1, intrebari: { alegere: sumar(q.alegere), asteapta: sumar(q.asteapta) }, calibrare: calibrare(cz) },
      inainte: { oferte: toate.length, judecate: jud.length, nejudecabile: toate.filter(function (o) { return o.r && o.r.nejudecabil; }).length, asteapta: toate.filter(function (o) { return !o.r; }).length,
        intrebari: { alegere: sumar(qi.alegere), asteapta: sumar(qi.asteapta) }, calibrare: calibrare(jud), fisa: verdictFisa(jud) } };
  }

  root.Carnet = { FEREASTRA_ZILE: FEREASTRA, dinFisa: dinFisa, simVarianta: simVarianta, fisaLa: fisaLa, oferteAzi: oferteAzi, rejoc: rejoc, intrebari: intrebari, calibrare: calibrare, oferte: oferte, judecaOferta: judecaOferta, uneste: uneste,
    cazuriDinOferte: cazuriDinOferte, verdictFisa: verdictFisa, textAlegere: textAlegere, textAsteapta: textAsteapta, textCalibrare: textCalibrare, textVerdictFisa: textVerdictFisa,
    randSubFisa: randSubFisa, concluzie: concluzie, raport: raport, stareText: stareText, verdictMonede: verdictMonede };
})(typeof globalThis !== "undefined" ? globalThis : this);
