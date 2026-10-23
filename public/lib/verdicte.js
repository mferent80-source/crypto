// Jurnalul verdictelor (v100.177; el 13.10: „din a doua recomandare 1–4 plus jurnalul verdictelor”). Modul PUR, probat în
// scripts/proba-v100177.mjs. Fiecare verdict al Radarului (Poarta T212, Poarta gridului, ideile zilei, regimul macro) se ține minte cu prețul
// de atunci; după orizont se pune lângă ce a urmat. Întrebarea: cei cu verdictul bun au ieșit mai bine decât ceilalți? Regula (fixată înainte
// de cifre): diferența de medie între „favorabil” și restul, bootstrap pe simboluri (ca risc-luna), p din aceeași distribuție; „dovedit”
// abia după corecția Benjamini–Hochberg (5 %) pe TOATE testele Radarului (aici + obiceiurile din riscul tău + becurile / ADX-ul boților).
// Sub 30 de cazuri pe o parte: „puține”. Un verdict pe simbol pe zi (dublurile în aceeași zi nu numără de două ori).
// v100.196 (auditul sever 14.10, 🔴2 / 🟡6): la Poarta T212 și Poarta gridului (multe simboluri, verdictul urmează regimul pieței) unitatea
// testului e ZIUA - diferența favorabil − rest în aceeași zi (piața comună se scade), semnele întoarse pe zile; înainte, pe simbol, p ≤ 0,05
// ieșea în 9,5–16 % pe date fără efect, iar la pragul BH în 2 % față de 0,36 %. Sursele cu un singur simbol (macro, scorul zilei) rămân pe simbol.
var Verdicte = (function () {
  "use strict";
  var ZI = 86400000, MAX = 20000, SEDINTA = 6.5 * 3600000;
  // v100.259 (auditul 23.10, punctul 12): p-ul unei permutări are podeaua 1/(R+1). Cu R = 1.000, de la ~51 de teste în registru nimic nu mai
  // putea trece BH (0,05/51 < 1/1001). R = 10.000 ⇒ până la ~500 de teste; o.repsP îl schimbă. IC-urile (bootstrap) rămân pe o.reps || 1000; o.reps dat explicit (probele) ține și p-ul ca înainte.
  var REPS_P = 10000;
  // sursele: ce nivel e „favorabil”, orizonturile (zile de bursă la acțiuni, zile la crypto) și ce se măsoară
  var SURSE = {
    "poarta-t212": { nume: "Poarta Trading 212", piata: "actiuni", zi: true, fav: ["cumpara"], h: [5, 20], masura: "randament", text: "„cumpără” față de „așteaptă / nu” în aceleași zile" },
    "poarta-grid": { nume: "Poarta gridului", piata: "crypto", zi: true, fav: ["porneste"], h: [1, 3], masura: "linistit", text: "„pornește” față de „așteaptă / nu” în aceleași zile — a stat prețul în banda gridului?" },
    // v100.259 (auditul 23.10, punctul 17): aceleași verdicte ale porții gridului, judecate pe BANI - rezultatul simulat al setării pe următoarele h zile
    // (bare de 15 minute, comisioane, funding presupus). „Pornește” lipsește la H = 2 (prea puține ferestre de test), deci întrebarea e regula probată:
    // ce NU e „nu” (pornește / așteaptă) iese mai bine decât „nu” (după mișcare)? Măsura veche (în bandă) rămâne alături.
    "poarta-grid-net": { nume: "Poarta gridului · banii", piata: "crypto", zi: true, din: "poarta-grid", fav: ["porneste", "asteapta"], h: [1, 3], masura: "net", text: "„pornește / așteaptă” față de „nu” în aceleași zile — cât ar fi adus setarea, după comisioane?" },
    "idei": { nume: "Ideile zilei (acțiuni)", piata: "actiuni", cos: true, fav: ["cumpar"], h: [5, 20], masura: "pesteQqq", text: "ideile față de Nasdaq (QQQ) pe aceleași zile" },
    "top-sector": { nume: "Topul pe sectoare (Sugestii)", piata: "actiuni", cos: true, fav: ["top"], h: [5, 20], masura: "pesteQqq", text: "cele mai tari din fiecare sector față de Nasdaq (QQQ) pe aceleași zile" },
    "trend-12-1": { nume: "Trend 12 luni (Sugestii)", piata: "actiuni", cos: true, fav: ["top"], h: [20, 60], masura: "pesteSpy", text: "primele 20 după randamentul pe lunile 2–12 (ultima lună sărită) față de S&P 500 (SPY) pe aceleași zile, la 20 și 60 de zile — aceeași riglă ca bilanțul robotului; în probă" },   // v100.192 (I-622, I-623): orizontul probat și rigla auditului
    "scor-zi-actiuni": { nume: "Scorul zilei · acțiuni (Piața azi)", piata: "actiuni", fav: ["pentru", "usorpentru"], h: [5, 20], masura: "randament", text: "S&P după un Scor al zilei pozitiv față de restul zilelor — suma faptelor din pagină, neprobată" },   // v100.193
    "scor-zi-crypto": { nume: "Scorul zilei · crypto (Piața azi)", piata: "crypto", fav: ["pentru", "usorpentru"], h: [5, 20], masura: "randament", text: "BTC după un Scor al zilei pozitiv față de restul zilelor — suma faptelor din pagină, neprobată" },
    "macro": { nume: "Regimul macro", piata: "actiuni", fav: ["riskon", "inclinat"], h: [5, 20], masura: "randament", text: "S&P după „pofta de risc / înclinat spre risc” față de restul" }
  };
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function zi(t) { return new Date(t).toISOString().slice(0, 10); }
  // când se știe închiderea unei bare zilnice: ora deschiderii (13:30–14:44 UTC, vară / iarnă) + 6,5 h; altă oră = ora închiderii
  function inchisLa(t) { var m = ((t % ZI) + ZI) % ZI / 60000; return m >= 810 && m < 885 ? t + SEDINTA : t; }
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
    // v100.259 (punctul 17): setarea porții gridului - direcția, grilele (intervale), levierul - pentru măsura pe bani
    var d = String(v.d || v.dir || "").toLowerCase(), g = nr(v.g != null ? v.g : v.grile), l = nr(v.l != null ? v.l : v.levier);
    if (d === "long" || d === "short" || d === "neutru") o.d = d; if (g >= 2 && g <= 150) o.g = Math.round(g); if (l >= 1 && l <= 125) o.l = l;
    return o;
  }
  // adaugă în jurnal: un verdict pe (sursă, simbol, zi); cel mai nou din zi rămâne; cel mult MAX (cele mai vechi pleacă)
  function adauga(jurnal, noi) {
    var m = {}, l = (Array.isArray(jurnal) ? jurnal : []).concat(Array.isArray(noi) ? noi : [noi]);
    l.forEach(function (x) { var c = curata(x); if (!c) return; var cheie = c.s + "|" + c.k + "|" + zi(c.t); if (!m[cheie] || c.t < m[cheie].t) m[cheie] = c;   /* v100.196: primul verdict al zilei rămâne, ca pe server */ });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a.t - b.t; }).slice(-MAX);
  }
  // prețul la orizont: a h-a bară de după momentul verdictului (zile de bursă la acțiuni, zile calendaristice la crypto); bare = [{t, c, h?, l?}]
  function dupa(bare, t, h) {
    var l = bare || [], i = 0; while (i < l.length && l[i].t <= t) i++;
    var j = i + h - 1; if (j >= l.length || i >= l.length) return null;
    var hi = -Infinity, lo = Infinity; for (var q = i; q <= j; q++) { hi = Math.max(hi, nr(l[q].h) || l[q].c); lo = Math.min(lo, nr(l[q].l) || l[q].c); }
    return { c: l[j].c, hi: hi, lo: lo, t: l[j].t };
  }
  // audit 19.10 (10): fereastra [t, t + h zile] de la ORA verdictului - bara care conține verdictul intră (la barele zilnice: ziua verdictului, cu
  // orele de dinaintea lui, deci strict; în aceeași zi favorabil și rest le au la fel), iar ultima bară trebuie să fie închisă (urmează alta)
  function dupaOra(bare, t, h) {
    var l = bare || [], pas = l.length > 1 ? l[1].t - l[0].t : ZI, i = 0, fin = t + h * ZI;
    while (i + 1 < l.length && l[i + 1].t <= t) i++;
    if (!l.length) return null;
    if (l[i].t + pas <= t && i + 1 < l.length) i++;   // nicio bară nu cuprinde ora verdictului (gol / prima bară e după el): prima de după, ca înainte
    var j = i; while (j + 1 < l.length && l[j + 1].t < fin) j++;
    if (j + 1 >= l.length) return null;
    var hi = -Infinity, lo = Infinity; for (var q = i; q <= j; q++) { hi = Math.max(hi, nr(l[q].h) || l[q].c); lo = Math.min(lo, nr(l[q].l) || l[q].c); }
    return { c: l[j].c, hi: hi, lo: lo, t: l[j].t };
  }
  // fiecare verdict cu ce a urmat; bare = { simbol: [...] }, reper = { QQQ: [...], SPY: [...] } pentru „peste QQQ” / „peste SPY” (v100.192)
  // v100.259 (punctul 17): rezultatul net al setării porții gridului pe h zile de bare de 15 minute de la ora verdictului (GridProba.simuleaza, cu
  // comisioanele și funding-ul presupus); fără setare scrisă: neutru, pasul minim (0,30%) pe banda gridului, 1×. null = barele nu ajung încă.
  function netGrid(v, b15, h, GP) {
    if (!GP || !Array.isArray(b15) || !(v.j > 0) || !(v.u > v.j)) return null;
    var i = 0; while (i < b15.length && b15[i].t < v.t) i++;
    var W = h * 96; if (i >= b15.length || b15[i].t - v.t > 900000 || i + W > b15.length) return null;
    var g = v.g || Math.max(2, Math.min(150, Math.floor(Math.log(v.u / v.j) / Math.log(1.003))));
    var r = GP.simuleaza(b15, i, W, { dir: v.d || "neutru", jos: v.j, sus: v.u, grile: g, levier: v.l || 1, fundingZi: GP.FUNDING_PRESUPUS || 0.0003, fundingCost: true });
    return r && isFinite(r.net) ? r.net : null;
  }
  // o (opțional) = { bare15: { simbol: [bare de 15 minute] }, GridProba } - fără ele măsura pe bani lipsește, restul e ca înainte
  function evalueaza(jurnal, bare, reper, o) {
    o = o || {}; var out = [], GPx = o.GridProba || (typeof GridProba !== "undefined" ? GridProba : null);
    (jurnal || []).forEach(function (v) {
      var S = SURSE[v.s], b = bare && bare[v.k]; if (!S || !b || !b.length) return;
      S.h.forEach(function (h) {
        var d = S.masura === "linistit" ? dupaOra(b, v.t, h) : dupa(b, v.t, h); if (!d) return;   // audit 19.10 (10): liniștea de la ora verdictului
        var r = d.c / v.p - 1, val = r;
        if (S.masura === "linistit") { var j = v.j || v.p * 0.9, u = v.u || v.p * 1.1; val = d.lo >= j && d.hi <= u ? 1 : 0; }
        // v100.196 (auditul sever 14.10, 🟡1 lateral): bara zilnică de la Yahoo are ora DESCHIDERII (13:30 / 14:30 UTC), iar închiderea ei se știe
        // abia după 6,5 h ⇒ reperul pornește de la ultima închidere ȘTIUTĂ la momentul verdictului - aceeași cu prețul p al coșului (închiderea de
        // ieri, când verdictul e dat în ședință). Barele cu altă oră (închiderea, probele) rămân ca înainte.
        else if (S.masura === "pesteQqq" || S.masura === "pesteSpy") { var q = reper && reper[S.masura === "pesteSpy" ? "SPY" : "QQQ"], a = q ? dupa(q, v.t, h) : null, a0 = q ? q.filter(function (x) { return inchisLa(x.t) <= v.t; }).pop() : null; if (!a || !a0) return; val = r - (a.c / a0.c - 1); }
        out.push({ s: v.s, k: v.k, n: v.n, t: v.t, h: h, r: r, val: val, p: v.p });   /* v100.196: prețul rămâne pe eveniment (dublurile din coșuri) */
        if (v.s === "poarta-grid" && o.bare15) { var nt = netGrid(v, o.bare15[v.k], h, GPx); if (nt !== null) out.push({ s: "poarta-grid-net", k: v.k, n: v.n, t: v.t, h: h, r: r, val: nt, p: v.p }); }   // v100.259
      });
    });
    return out;
  }
  // diferența de medie favorabil − restul, bootstrap pe simboluri; p = de două ori partea mai mică de o parte a lui 0
  // v100.195 (auditul de seară 14.10): unitatea testului = x.u (ziua, la coșuri) sau simbolul; `minU` = câte unități trebuie cel puțin
  function unitate(x) { return x.u || x.k; }
  function cateUnitati(l) { var m = {}; l.forEach(function (x) { m[unitate(x)] = 1; }); return Object.keys(m).length; }
  function compara(fav, rest, o) {
    o = o || {};
    if (fav.length < (o.min || 30) || rest.length < (o.min || 30) || (o.minU && cateUnitati(fav.concat(rest)) < o.minU)) return { stare: "putine", nFav: fav.length, nRest: rest.length, unitati: cateUnitati(fav.concat(rest)), minU: o.minU || 0 };
    var dif = medie(fav.map(function (x) { return x.val; })) - medie(rest.map(function (x) { return x.val; })), gr = {}, chei = [];
    fav.concat(rest).forEach(function (x) { var u = unitate(x); if (!gr[u]) { gr[u] = []; chei.push(u); } gr[u].push(x); });
    var rnd = mulberry32(o.seed || 177), d = [], favSet = new Set(fav);
    for (var i = 0; i < (o.reps || 1000); i++) {
      var sa = 0, na = 0, sb = 0, nb = 0;
      for (var j = 0; j < chei.length; j++) { var g = gr[chei[Math.floor(rnd() * chei.length)]]; for (var q = 0; q < g.length; q++) { if (favSet.has(g[q])) { sa += g[q].val; na++; } else { sb += g[q].val; nb++; } } }
      if (na && nb) d.push(sa / na - sb / nb);
    }
    d.sort(function (a, b) { return a - b; });
    // p: permutare pe două niveluri - (1) la simbolurile cu verdicte amestecate, etichetele se amestecă între verdictele aceluiași simbol;
    // (2) simbolurile cu un singur fel de verdict își amestecă eticheta ÎNTRE ELE (simbolul întreg e unitatea). Valid și pe puține simboluri
    var rndP = mulberry32((o.seed || 177) + 7919), toate = fav.concat(rest), et = toate.map(function (x) { return favSet.has(x); }), idx = {}, peste = 0, R = o.repsP || o.reps || REPS_P;
    toate.forEach(function (x, i) { var u = unitate(x); (idx[u] = idx[u] || []).push(i); });
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
    return { stare: "testat", nFav: fav.length, nRest: rest.length, dif: dif, ic: d.length ? [d[Math.floor(d.length * 0.025)], d[Math.min(d.length - 1, Math.floor(d.length * 0.975))]] : null, p: p, pMin: 1 / (R + 1), simboluriAmestecate: grupe.length, simboluriUnice: unice.length, unitati: chei.length };
  }
  // v100.196 (🔴2): favorabil față de rest PE ZI - doar zilele care au ambele feluri (piața comună se scade în zi). Statistica = suma abaterilor
  // favorabilelor de la media zilei lor (ponderea zilei = nFav·nRest/n, ca la Mantel–Haenszel); p = permutarea etichetelor ÎN INTERIORUL
  // fiecărei zile (exactă când ziua nu spune nimic); dif = diferența ponderată; IC = bootstrap pe zile; sub `minU` zile amestecate ⇒ „puține”
  function comparaPeZi(fav, rest, o) {
    o = o || {}; var z = {}, favSet = new Set(fav);
    fav.concat(rest).forEach(function (x) { var u = unitate(x); if (!z[u]) z[u] = { v: [], f: [] }; z[u].v.push(x.val); z[u].f.push(favSet.has(x)); });
    var zile = Object.keys(z).map(function (u) { var g = z[u], nf = g.f.filter(Boolean).length; return { v: g.v, f: g.f, nf: nf, n: g.v.length, m: medie(g.v) }; }).filter(function (g) { return g.nf > 0 && g.nf < g.n; });
    if (fav.length < (o.min || 30) || rest.length < (o.min || 30) || zile.length < (o.minU || 12)) return { stare: "putine", nFav: fav.length, nRest: rest.length, unitati: zile.length, minU: o.minU || 12, zileAmestecate: true };
    var T = function (g, f) { var s = 0; for (var i = 0; i < g.n; i++) if (f[i]) s += g.v[i] - g.m; return s; };
    var W = zile.reduce(function (s, g) { return s + g.nf * (g.n - g.nf) / g.n; }, 0), obs = zile.reduce(function (s, g) { return s + T(g, g.f); }, 0);
    var rnd = mulberry32((o.seed || 196) + 7919), R = o.repsP || o.reps || REPS_P, peste = 0;
    for (var r = 0; r < R; r++) {
      var s = 0;
      for (var q = 0; q < zile.length; q++) { var g = zile[q], f = g.f.slice(); for (var i = f.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = f[i]; f[i] = f[j]; f[j] = t; } s += T(g, f); }
      if (Math.abs(s) >= Math.abs(obs) - 1e-12) peste++;
    }
    var rb = mulberry32(o.seed || 196), b = [];
    for (var k = 0; k < 1000; k++) { var a = 0, w = 0; for (var e = 0; e < zile.length; e++) { var h = zile[Math.floor(rb() * zile.length)]; a += T(h, h.f); w += h.nf * (h.n - h.nf) / h.n; } if (w > 0) b.push(a / w); }
    b.sort(function (x, y) { return x - y; });
    return { stare: "testat", nFav: fav.length, nRest: rest.length, dif: obs / W, ic: b.length ? [b[Math.floor(b.length * 0.025)], b[Math.min(b.length - 1, Math.floor(b.length * 0.975))]] : null, p: (peste + 1) / (R + 1), pMin: 1 / (R + 1), unitati: zile.length, zileAmestecate: true };
  }
  // un test cu o singură parte (ideile: media „peste QQQ” față de 0), bootstrap pe simboluri
  function fataDeZero(l, o) {
    o = o || {}; if (l.length < (o.min || 30) || (o.minU && cateUnitati(l) < o.minU)) return { stare: "putine", nFav: l.length, nRest: 0, unitati: cateUnitati(l), minU: o.minU || 0 };
    var gr = {}, chei = []; l.forEach(function (x) { var u = unitate(x); if (!gr[u]) { gr[u] = []; chei.push(u); } gr[u].push(x); });
    var rnd = mulberry32(o.seed || 178), d = [];
    for (var i = 0; i < (o.reps || 1000); i++) { var s = 0, n = 0; for (var j = 0; j < chei.length; j++) { var g = gr[chei[Math.floor(rnd() * chei.length)]]; for (var q = 0; q < g.length; q++) { s += g[q].val; n++; } } if (n) d.push(s / n); }
    d.sort(function (a, b) { return a - b; });
    // p: semnul întors la nivel de simbol (sub ipoteza „fără avantaj”, media fiecărui simbol e la fel de probabil + sau −)
    var sume = chei.map(function (k) { return gr[k].reduce(function (s, x) { return s + x.val; }, 0); }), tot = sume.reduce(function (a, b) { return a + b; }, 0), rndS = mulberry32((o.seed || 178) + 104729), peste = 0, R = o.repsP || o.reps || REPS_P;
    for (var r3 = 0; r3 < R; r3++) { var s3 = 0; for (var q3 = 0; q3 < sume.length; q3++) s3 += rndS() < 0.5 ? sume[q3] : -sume[q3]; if (Math.abs(s3) >= Math.abs(tot) - 1e-12) peste++; }
    return { stare: "testat", nFav: l.length, nRest: 0, dif: medie(l.map(function (x) { return x.val; })), ic: [d[Math.floor(d.length * 0.025)], d[Math.min(d.length - 1, Math.floor(d.length * 0.975))]], p: (peste + 1) / (R + 1), pMin: 1 / (R + 1), unitati: chei.length };
  }
  // calibrarea: pe sursă și orizont - fiecare nivel (câte, media, mediana, % pe plus) + testul favorabil față de rest
  // v100.177 (revizia, C2): verdictele aceluiași simbol în zile apropiate au randamente care se suprapun (20 de zile ⇒ 19/20 comune) și
  // eticheta ține săptămâni (regimul macro e un singur simbol) ⇒ permutarea dădea „dovedit” fals în ~53 %; se păstrează doar verdictele
  // a căror fereastră începe după încheierea celei de dinainte (zile de bursă ≈ 7/5 zile calendaristice)
  // v100.195 (auditul de seară 14.10, docs/AUDIT-PROBA-TREND-SCOR-2026-10-14.md în premarket_scanner): cele ~20 de nume ale unei zile din
  // Trend 12 luni au ICC 0,13 ⇒ valorează cât ~6 dovezi, nu 20 (efectul de design 3,5). La COȘURI (S.cos) se păstrează ZILELE ale căror
  // ferestre nu se suprapun, cu toate numele lor, iar unitatea testului devine ziua (x.u) — semnul se întoarce pe zi, nu pe simbol.
  // v100.196 (🔵4): în ziua aleasă a unui coș, același preț în aceeași oră (SNDK_US_EQ și SNDK1_US_EQ, aceeași acțiune sub două tickere) intră
  // o singură dată. Sursele „pe zi” (S.zi, Poarta T212 / gridului) se răresc PE SIMBOL, ca până acum (ferestrele aceluiași simbol nu se
  // suprapun - altfel un simbol ținut „cumpără” zile la rând ar număra același viitor de mai multe ori), apoi primesc ziua ca unitate (x.u)
  function nesuprapuse(ev) {
    var gr = {}, out = [], cos = {};
    ev.forEach(function (x) { var S = SURSE[x.s]; if (S && S.cos) { var c2 = x.s + "|" + x.h; (cos[c2] = cos[c2] || []).push(x); return; } var c = x.s + "|" + x.k + "|" + x.h; (gr[c] = gr[c] || []).push(x); });
    Object.keys(cos).forEach(function (c) {
      var l = cos[c], S = SURSE[l[0].s], pas = l[0].h * ZI * (S.piata === "actiuni" ? 7 / 5 : 1), zile = {}, ult = -Infinity, ales = {}, vazut = {};
      l.forEach(function (x) { var z = zi(x.t); (zile[z] = zile[z] || []).push(x); });
      Object.keys(zile).sort().forEach(function (z) { var t0 = Date.parse(z + "T00:00:00Z"); if (t0 >= ult + pas) { ales[z] = 1; ult = t0; } });
      l.forEach(function (x) { var z = zi(x.t); if (!ales[z]) return; if (x.p > 0) { var dub = z + "|" + x.n + "|" + x.p + "|" + Math.floor(x.t / 3600000); if (vazut[dub]) return; vazut[dub] = 1; } out.push(Object.assign({}, x, { u: z })); });
    });
    Object.keys(gr).forEach(function (c) {
      var l = gr[c].sort(function (a, b) { return a.t - b.t; }), S = SURSE[l[0].s], pas = l[0].h * ZI * (S && S.piata === "actiuni" ? 7 / 5 : 1), ult = -Infinity;
      l.forEach(function (x) { if (x.t >= ult + pas) { out.push(S && S.zi ? Object.assign({}, x, { u: zi(x.t) }) : x); ult = x.t; } });
    });
    return out;
  }
  function calibrare(ev, o) {
    o = o || {}; var out = []; ev = nesuprapuse(ev);
    Object.keys(SURSE).forEach(function (s) {
      var S = SURSE[s];
      S.h.forEach(function (h) {
        var l = ev.filter(function (x) { return x.s === s && x.h === h; }); if (!l.length) return;
        var niv = {}; l.forEach(function (x) { (niv[x.n] = niv[x.n] || []).push(x); });
        var randuri = Object.keys(niv).map(function (n) { var v = niv[n].map(function (x) { return x.val; }); return { nivel: n, n: v.length, medie: medie(v), mediana: mediana(v), pePlus: v.filter(function (x) { return x > 0; }).length / v.length }; });
        var fav = l.filter(function (x) { return S.fav.indexOf(x.n) >= 0; }), rest = l.filter(function (x) { return S.fav.indexOf(x.n) < 0; });
        var oT = S.cos || S.zi ? { minU: 12 } : {}; if (o.repsP) oT.repsP = o.repsP;   /* v100.195: la coșuri cel puțin 12 zile independente (ca bilanțul robotului: 12 ferestre); v100.196: și la Poartă (zile cu ambele feluri) */
        var test = S.masura === "pesteQqq" || S.masura === "pesteSpy" ? fataDeZero(fav, oT) : S.zi ? comparaPeZi(fav, rest, oT) : compara(fav, rest, oT);
        out.push({ sursa: s, nume: S.nume, h: h, masura: S.masura, intrebare: S.text, niveluri: randuri, test: test, unitate: S.cos || S.zi ? "zi" : "simbol" });
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
  // v100.196 (auditul sever 14.10, 🟡3): obiceiurile care se știu abia la IEȘIRE nu pot fi reguli de urmat - „Episod scurt” e făcut din durată
  // (ții mai mult ce merge prost), „Marjă adăugată pe drum” se pune când botul merge deja prost. Intră în registru (p-ul lor contează la corecție),
  // dar cu regula = false și limita alături: o legătură, nu o cauză.
  var DUPA = { A3: "durata se știe abia la vânzare, iar ții mai mult ce merge prost: legătură, nu cauză", O2: "marja se adaugă când botul merge deja prost: legătură, nu cauză" };
  // registrul tuturor testelor Radarului (verdictele + obiceiurile din riscul tău + becurile / ADX-ul boților) cu corecția pe toate deodată;
  // v100.196 (🟡2 / 🔵1): o.alte = alte familii cu p (carnetul, laboratorul, modelele 🧠/🌳): { sursa, afirmatie, p, dif, felul, regula, directie }
  function registru(o) {
    var t = [];
    // regula: verdictele - verdictul bun trebuie să iasă MAI BINE (dif > 0); obiceiurile și becurile - și regula lor fixată dinainte (cele două
    // jumătăți de timp, IC 99 %), adică pagina lor zicea deja „dovedit”; BH doar taie din ce rămâne, nu adaugă
    (o.calibrare || []).forEach(function (c) { if (c.test && c.test.stare === "testat") t.push({ pMin: c.test.pMin, sursa: c.nume + " · " + (SURSE[c.sursa].piata === "crypto" ? c.h + " z" : TextRo.cate(c.h, "zi", "zile") + " de bursă"), afirmatie: c.intrebare, p: c.test.p, dif: c.test.dif, felul: "verdict", regula: c.test.dif > 0, directie: c.test.dif > 0 ? "verdictul bun a ieșit mai bine" : "verdictul bun a ieșit MAI RĂU" }); });
    ["boti", "actiuni"].forEach(function (k) { var P = o.risc && o.risc[k]; (P && P.comportament || []).forEach(function (x) { if (x.p !== null && x.p !== undefined) { var lim = DUPA[x.k] || null; t.push({ sursa: "Riscul tău · " + (k === "boti" ? "boți" : "acțiuni"), afirmatie: x.nume, p: x.p, dif: x.dif, felul: "obicei", stareVeche: x.stare, regula: !lim && /^dovedit/.test(String(x.stare || "")), cauza: !lim, limita: lim, directie: x.dif > 0 ? "obicei bun" : "obicei rău" }); } }); });
    (o.asemanatoare || []).forEach(function (a) { if (a && a.p !== null && a.p !== undefined) t.push({ sursa: "Boți asemănători", afirmatie: a.nume, p: a.p, dif: a.difMed, felul: "bec", stareVeche: a.verdict, regula: a.verdict === "dovedit" || a.verdict === "pe dos", directie: a.difMed > 0 ? "ajută" : "pe dos" }); });
    (o.alte || []).forEach(function (a) { if (a && nr(a.p) !== null && a.p >= 0 && a.p <= 1) t.push({ pMin: nr(a.pMin), sursa: String(a.sursa || "").slice(0, 80), afirmatie: String(a.afirmatie || "").slice(0, 160), p: a.p, dif: nr(a.dif), felul: String(a.felul || "alt").slice(0, 20), regula: a.regula === true, directie: a.directie ? String(a.directie).slice(0, 60) : null }); });
    // v100.259: poateTrece = rezoluția p-ului (pMin, când e știută) ajunge sub pragul BH al locului întâi (q/m); altfel testul n-ar trece oricât de puternic
    var qB = o.q || 0.05;
    return bh(t, qB).map(function (x) { return Object.assign(x, { treceBh: x.ramane, ramane: x.ramane && x.regula === true, poateTrece: !(x.pMin > 0) || x.pMin <= qB / Math.max(1, x.m) }); });
  }
  return { REPS_P: REPS_P, SURSE: SURSE, MAX: MAX, curata: curata, adauga: adauga, dupa: dupa, evalueaza: evalueaza, compara: compara, fataDeZero: fataDeZero, calibrare: calibrare, bh: bh, registru: registru, medie: medie, mediana: mediana };
})();
