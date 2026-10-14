// Jurnalul verdictelor (v100.177; el 13.10: „din a doua recomandare 1–4 plus jurnalul verdictelor”). Modul PUR, probat în
// scripts/proba-v100177.mjs. Fiecare verdict al Radarului (Poarta T212, Poarta gridului, ideile zilei, regimul macro) se ține minte cu prețul
// de atunci; după orizont se pune lângă ce a urmat. Întrebarea: cei cu verdictul bun au ieșit mai bine decât ceilalți? Regula (fixată înainte
// de cifre): diferența de medie între „favorabil” și restul, bootstrap pe simboluri (ca risc-luna), p din aceeași distribuție; „dovedit”
// abia după corecția Benjamini–Hochberg (5 %) pe TOATE testele Radarului (aici + obiceiurile din riscul tău + becurile / ADX-ul boților).
// Sub 30 de cazuri pe o parte: „puține”. Un verdict pe simbol pe zi (dublurile în aceeași zi nu numără de două ori).
var Verdicte = (function () {
  "use strict";
  var ZI = 86400000, MAX = 20000;
  // sursele: ce nivel e „favorabil”, orizonturile (zile de bursă la acțiuni, zile la crypto) și ce se măsoară
  var SURSE = {
    "poarta-t212": { nume: "Poarta Trading 212", piata: "actiuni", fav: ["cumpara"], h: [5, 20], masura: "randament", text: "„cumpără” față de „așteaptă / nu”" },
    "poarta-grid": { nume: "Poarta gridului", piata: "crypto", fav: ["porneste"], h: [1, 3], masura: "linistit", text: "„pornește” față de „așteaptă / nu” — a stat prețul în banda gridului?" },
    "idei": { nume: "Ideile zilei (acțiuni)", piata: "actiuni", fav: ["cumpar"], h: [5, 20], masura: "pesteQqq", text: "ideile față de Nasdaq (QQQ) pe aceleași zile" },
    "top-sector": { nume: "Topul pe sectoare (Sugestii)", piata: "actiuni", fav: ["top"], h: [5, 20], masura: "pesteQqq", text: "cele mai tari din fiecare sector față de Nasdaq (QQQ) pe aceleași zile" },
    "trend-12-1": { nume: "Trend 12 luni (Sugestii)", piata: "actiuni", fav: ["top"], h: [20, 60], masura: "pesteSpy", text: "primele 20 după randamentul pe lunile 2–12 (ultima lună sărită) față de S&P 500 (SPY) pe aceleași zile, la 20 și 60 de zile — aceeași riglă ca bilanțul robotului; în probă" },   // v100.192 (I-622, I-623): orizontul probat și rigla auditului
    "scor-zi-actiuni": { nume: "Scorul zilei · acțiuni (Piața azi)", piata: "actiuni", fav: ["pentru", "usorpentru"], h: [5, 20], masura: "randament", text: "S&P după un Scor al zilei pozitiv față de restul zilelor — suma faptelor din pagină, neprobată" },   // v100.193
    "scor-zi-crypto": { nume: "Scorul zilei · crypto (Piața azi)", piata: "crypto", fav: ["pentru", "usorpentru"], h: [5, 20], masura: "randament", text: "BTC după un Scor al zilei pozitiv față de restul zilelor — suma faptelor din pagină, neprobată" },
    "macro": { nume: "Regimul macro", piata: "actiuni", fav: ["riskon", "inclinat"], h: [5, 20], masura: "randament", text: "S&P după „pofta de risc / înclinat spre risc” față de restul" }
  };
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function zi(t) { return new Date(t).toISOString().slice(0, 10); }
  function medie(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function mediana(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // un verdict curățat (forma scurtă din KV): s = sursa, k = simbolul, n = nivelul, p = prețul de atunci, t = momentul, j/u = banda gridului
  function curata(v) {
    if (!v || typeof v !== "object") return null;
    var s = String(v.s || v.sursa || ""), k = String(v.k || v.simbol || "").replace(/[^A-Za-z0-9._=^-]/g, "").slice(0, 32), n = String(v.n || v.nivel || "").toLowerCase().replace(/[^a-z-]/g, "").slice(0, 20);
    var p = nr(v.p != null ? v.p : v.pret), t = nr(v.t != null ? v.t : v.la);
    if (!SURSE[s] || !k || !n || !(p > 0) || !(t > 0)) return null;
    var o = { s: s, k: k, n: n, p: p, t: t };
    var j = nr(v.j != null ? v.j : v.jos), u = nr(v.u != null ? v.u : v.sus); if (j > 0 && u > j) { o.j = j; o.u = u; }
    return o;
  }
  // adaugă în jurnal: un verdict pe (sursă, simbol, zi); cel mai nou din zi rămâne; cel mult MAX (cele mai vechi pleacă)
  function adauga(jurnal, noi) {
    var m = {}, l = (Array.isArray(jurnal) ? jurnal : []).concat(Array.isArray(noi) ? noi : [noi]);
    l.forEach(function (x) { var c = curata(x); if (!c) return; var cheie = c.s + "|" + c.k + "|" + zi(c.t); if (!m[cheie] || m[cheie].t <= c.t) m[cheie] = c; });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a.t - b.t; }).slice(-MAX);
  }
  // prețul la orizont: a h-a bară de după momentul verdictului (zile de bursă la acțiuni, zile calendaristice la crypto); bare = [{t, c, h?, l?}]
  function dupa(bare, t, h) {
    var l = bare || [], i = 0; while (i < l.length && l[i].t <= t) i++;
    var j = i + h - 1; if (j >= l.length || i >= l.length) return null;
    var hi = -Infinity, lo = Infinity; for (var q = i; q <= j; q++) { hi = Math.max(hi, nr(l[q].h) || l[q].c); lo = Math.min(lo, nr(l[q].l) || l[q].c); }
    return { c: l[j].c, hi: hi, lo: lo, t: l[j].t };
  }
  // fiecare verdict cu ce a urmat; bare = { simbol: [...] }, reper = { QQQ: [...], SPY: [...] } pentru „peste QQQ” / „peste SPY” (v100.192)
  function evalueaza(jurnal, bare, reper) {
    var out = [];
    (jurnal || []).forEach(function (v) {
      var S = SURSE[v.s], b = bare && bare[v.k]; if (!S || !b || !b.length) return;
      S.h.forEach(function (h) {
        var d = dupa(b, v.t, h); if (!d) return;
        var r = d.c / v.p - 1, val = r;
        if (S.masura === "linistit") { var j = v.j || v.p * 0.9, u = v.u || v.p * 1.1; val = d.lo >= j && d.hi <= u ? 1 : 0; }
        else if (S.masura === "pesteQqq" || S.masura === "pesteSpy") { var q = reper && reper[S.masura === "pesteSpy" ? "SPY" : "QQQ"], a = q ? dupa(q, v.t, h) : null, a0 = q ? q.filter(function (x) { return x.t <= v.t; }).pop() : null; if (!a || !a0) return; val = r - (a.c / a0.c - 1); }
        out.push({ s: v.s, k: v.k, n: v.n, t: v.t, h: h, r: r, val: val });
      });
    });
    return out;
  }
  // diferența de medie favorabil − restul, bootstrap pe simboluri; p = de două ori partea mai mică de o parte a lui 0
  function compara(fav, rest, o) {
    o = o || {};
    if (fav.length < (o.min || 30) || rest.length < (o.min || 30)) return { stare: "putine", nFav: fav.length, nRest: rest.length };
    var dif = medie(fav.map(function (x) { return x.val; })) - medie(rest.map(function (x) { return x.val; })), gr = {}, chei = [];
    fav.concat(rest).forEach(function (x) { if (!gr[x.k]) { gr[x.k] = []; chei.push(x.k); } gr[x.k].push(x); });
    var rnd = mulberry32(o.seed || 177), d = [], favSet = new Set(fav);
    for (var i = 0; i < (o.reps || 1000); i++) {
      var sa = 0, na = 0, sb = 0, nb = 0;
      for (var j = 0; j < chei.length; j++) { var g = gr[chei[Math.floor(rnd() * chei.length)]]; for (var q = 0; q < g.length; q++) { if (favSet.has(g[q])) { sa += g[q].val; na++; } else { sb += g[q].val; nb++; } } }
      if (na && nb) d.push(sa / na - sb / nb);
    }
    d.sort(function (a, b) { return a - b; });
    // p: permutare pe două niveluri - (1) la simbolurile cu verdicte amestecate, etichetele se amestecă între verdictele aceluiași simbol;
    // (2) simbolurile cu un singur fel de verdict își amestecă eticheta ÎNTRE ELE (simbolul întreg e unitatea). Valid și pe puține simboluri
    var rndP = mulberry32((o.seed || 177) + 7919), toate = fav.concat(rest), et = toate.map(function (x) { return favSet.has(x); }), idx = {}, peste = 0, R = o.reps || 1000;
    toate.forEach(function (x, i) { (idx[x.k] = idx[x.k] || []).push(i); });
    var toateGr = Object.keys(idx).map(function (k) { return idx[k]; }), mixt = function (g) { var f = 0; g.forEach(function (i) { if (et[i]) f++; }); return f > 0 && f < g.length; };
    var grupe = toateGr.filter(mixt), unice = toateGr.filter(function (g) { return !mixt(g); }), etUnice = unice.map(function (g) { return et[g[0]]; });
    var amesteca = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rndP() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    for (var r2 = 0; r2 < R; r2++) {
      var e2 = et.slice();
      grupe.forEach(function (g) { var lab = amesteca(g.map(function (i) { return e2[i]; })); g.forEach(function (i, q) { e2[i] = lab[q]; }); });
      var lu = amesteca(etUnice.slice()); unice.forEach(function (g, q) { g.forEach(function (i) { e2[i] = lu[q]; }); });
      var s1 = 0, n1 = 0, s0 = 0, n0 = 0; for (var q2 = 0; q2 < toate.length; q2++) { if (e2[q2]) { s1 += toate[q2].val; n1++; } else { s0 += toate[q2].val; n0++; } }
      if (n1 && n0 && Math.abs(s1 / n1 - s0 / n0) >= Math.abs(dif) - 1e-12) peste++;
    }
    var areVariatie = grupe.length > 0 || (etUnice.some(Boolean) && etUnice.some(function (x) { return !x; }));
    var p = areVariatie ? (peste + 1) / (R + 1) : 1;
    return { stare: "testat", nFav: fav.length, nRest: rest.length, dif: dif, ic: d.length ? [d[Math.floor(d.length * 0.025)], d[Math.min(d.length - 1, Math.floor(d.length * 0.975))]] : null, p: p, simboluriAmestecate: grupe.length, simboluriUnice: unice.length };
  }
  // un test cu o singură parte (ideile: media „peste QQQ” față de 0), bootstrap pe simboluri
  function fataDeZero(l, o) {
    o = o || {}; if (l.length < (o.min || 30)) return { stare: "putine", nFav: l.length, nRest: 0 };
    var gr = {}, chei = []; l.forEach(function (x) { if (!gr[x.k]) { gr[x.k] = []; chei.push(x.k); } gr[x.k].push(x); });
    var rnd = mulberry32(o.seed || 178), d = [];
    for (var i = 0; i < (o.reps || 1000); i++) { var s = 0, n = 0; for (var j = 0; j < chei.length; j++) { var g = gr[chei[Math.floor(rnd() * chei.length)]]; for (var q = 0; q < g.length; q++) { s += g[q].val; n++; } } if (n) d.push(s / n); }
    d.sort(function (a, b) { return a - b; });
    // p: semnul întors la nivel de simbol (sub ipoteza „fără avantaj”, media fiecărui simbol e la fel de probabil + sau −)
    var sume = chei.map(function (k) { return gr[k].reduce(function (s, x) { return s + x.val; }, 0); }), tot = sume.reduce(function (a, b) { return a + b; }, 0), rndS = mulberry32((o.seed || 178) + 104729), peste = 0, R = o.reps || 1000;
    for (var r3 = 0; r3 < R; r3++) { var s3 = 0; for (var q3 = 0; q3 < sume.length; q3++) s3 += rndS() < 0.5 ? sume[q3] : -sume[q3]; if (Math.abs(s3) >= Math.abs(tot) - 1e-12) peste++; }
    return { stare: "testat", nFav: l.length, nRest: 0, dif: medie(l.map(function (x) { return x.val; })), ic: [d[Math.floor(d.length * 0.025)], d[Math.min(d.length - 1, Math.floor(d.length * 0.975))]], p: (peste + 1) / (R + 1) };
  }
  // calibrarea: pe sursă și orizont - fiecare nivel (câte, media, mediana, % pe plus) + testul favorabil față de rest
  // v100.177 (revizia, C2): verdictele aceluiași simbol în zile apropiate au randamente care se suprapun (20 de zile ⇒ 19/20 comune) și
  // eticheta ține săptămâni (regimul macro e un singur simbol) ⇒ permutarea dădea „dovedit” fals în ~53 %; se păstrează doar verdictele
  // a căror fereastră începe după încheierea celei de dinainte (zile de bursă ≈ 7/5 zile calendaristice)
  function nesuprapuse(ev) {
    var gr = {}, out = [];
    ev.forEach(function (x) { var c = x.s + "|" + x.k + "|" + x.h; (gr[c] = gr[c] || []).push(x); });
    Object.keys(gr).forEach(function (c) {
      var l = gr[c].sort(function (a, b) { return a.t - b.t; }), S = SURSE[l[0].s], pas = l[0].h * ZI * (S && S.piata === "actiuni" ? 7 / 5 : 1), ult = -Infinity;
      l.forEach(function (x) { if (x.t >= ult + pas) { out.push(x); ult = x.t; } });
    });
    return out;
  }
  function calibrare(ev) {
    var out = []; ev = nesuprapuse(ev);
    Object.keys(SURSE).forEach(function (s) {
      var S = SURSE[s];
      S.h.forEach(function (h) {
        var l = ev.filter(function (x) { return x.s === s && x.h === h; }); if (!l.length) return;
        var niv = {}; l.forEach(function (x) { (niv[x.n] = niv[x.n] || []).push(x); });
        var randuri = Object.keys(niv).map(function (n) { var v = niv[n].map(function (x) { return x.val; }); return { nivel: n, n: v.length, medie: medie(v), mediana: mediana(v), pePlus: v.filter(function (x) { return x > 0; }).length / v.length }; });
        var fav = l.filter(function (x) { return S.fav.indexOf(x.n) >= 0; }), rest = l.filter(function (x) { return S.fav.indexOf(x.n) < 0; });
        var test = S.masura === "pesteQqq" || S.masura === "pesteSpy" ? fataDeZero(fav) : compara(fav, rest);
        out.push({ sursa: s, nume: S.nume, h: h, masura: S.masura, intrebare: S.text, niveluri: randuri, test: test });
      });
    });
    return out;
  }
  // Benjamini–Hochberg: q = rata de descoperiri false acceptată; întoarce, pe fiecare test, „rămâne” după corecție
  function bh(teste, q) {
    q = q || 0.05; var l = teste.map(function (t, i) { return { i: i, p: t.p }; }).filter(function (x) { return x.p !== null && x.p !== undefined && isFinite(x.p); }).sort(function (a, b) { return a.p - b.p; });
    var m = l.length, k = -1; l.forEach(function (x, j) { if (x.p <= (j + 1) / m * q) k = j; });
    var ramane = {}; for (var j = 0; j <= k; j++) ramane[l[j].i] = true;
    return teste.map(function (t, i) { return Object.assign({}, t, { ramane: !!ramane[i], m: m, prag: k >= 0 ? (k + 1) / m * q : 0 }); });
  }
  // registrul tuturor testelor Radarului (verdictele + obiceiurile din riscul tău + becurile / ADX-ul boților) cu corecția pe toate deodată
  function registru(o) {
    var t = [];
    // regula: verdictele - verdictul bun trebuie să iasă MAI BINE (dif > 0); obiceiurile și becurile - și regula lor fixată dinainte (cele două
    // jumătăți de timp, IC 99 %), adică pagina lor zicea deja „dovedit”; BH doar taie din ce rămâne, nu adaugă
    (o.calibrare || []).forEach(function (c) { if (c.test && c.test.stare === "testat") t.push({ sursa: c.nume + " · " + c.h + (SURSE[c.sursa].piata === "crypto" ? " z" : " zile de bursă"), afirmatie: c.intrebare, p: c.test.p, dif: c.test.dif, felul: "verdict", regula: c.test.dif > 0, directie: c.test.dif > 0 ? "verdictul bun a ieșit mai bine" : "verdictul bun a ieșit MAI RĂU" }); });
    ["boti", "actiuni"].forEach(function (k) { var P = o.risc && o.risc[k]; (P && P.comportament || []).forEach(function (x) { if (x.p !== null && x.p !== undefined) t.push({ sursa: "Riscul tău · " + (k === "boti" ? "boți" : "acțiuni"), afirmatie: x.nume, p: x.p, dif: x.dif, felul: "obicei", stareVeche: x.stare, regula: /^dovedit/.test(String(x.stare || "")), directie: x.dif > 0 ? "obicei bun" : "obicei rău" }); }); });
    (o.asemanatoare || []).forEach(function (a) { if (a && a.p !== null && a.p !== undefined) t.push({ sursa: "Boți asemănători", afirmatie: a.nume, p: a.p, dif: a.difMed, felul: "bec", stareVeche: a.verdict, regula: a.verdict === "dovedit" || a.verdict === "pe dos", directie: a.difMed > 0 ? "ajută" : "pe dos" }); });
    return bh(t, o.q || 0.05).map(function (x) { return Object.assign(x, { treceBh: x.ramane, ramane: x.ramane && x.regula === true }); });
  }
  return { SURSE: SURSE, MAX: MAX, curata: curata, adauga: adauga, dupa: dupa, evalueaza: evalueaza, compara: compara, fataDeZero: fataDeZero, calibrare: calibrare, bh: bh, registru: registru, medie: medie, mediana: mediana };
})();
