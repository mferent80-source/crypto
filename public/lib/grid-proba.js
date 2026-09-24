// Grid futures Pionex - proba pe istoric si fisa. Modul pur, probat in
// scripts/grid-v78.mjs. Se incarca DUPA grid-calcul.js.
//
// Simulatorul face ce face Pionex: LONG cumpara la pornire pozitia pentru
// grilele de deasupra pretului, SHORT e oglinda, NEUTRU porneste fara pozitie
// (cumpara dedesubt, vinde deasupra). Fiecare umplere plateste comisionul.
// La final se socoteste TOT: castigul din grile + ce valoreaza pozitia ramasa -
// minusul pe care cifra mare din Pionex nu il arata.
// Drumul in lumanare: verde O->L->H->C, rosie O->H->L->C.
var GridProba = (function () {
  "use strict";
  var G = GridCalcul, C = G.C, DIRECTII = ["long", "neutru", "short"];

  // primul index k cu niv[k] >= x
  function primulPeste(niv, x) { var lo = 0, hi = niv.length; while (lo < hi) { var m = (lo + hi) >> 1; if (niv[m] >= x) hi = m; else lo = m + 1; } return lo; }

  function simuleaza(b, start, lungime, st) {
    var N = st.grile, niv = G.niveluri(st.jos, st.sus, N), L = st.levier, com = C.COMISION;
    var P = b[start].o, tip = [], tine = [], intr = [], q = [];
    var Ql = 0, Cl = 0, Qs = 0, Cs = 0, real = 0, fee = 0, umpleri = 0, iesiri = 0;
    for (var k = 0; k < N; k++) {
      q[k] = L / N / niv[k]; tine[k] = false;
      if (st.dir === "long") tip[k] = "L";
      else if (st.dir === "short") tip[k] = "S";
      else tip[k] = niv[k + 1] <= P ? "L" : niv[k] >= P ? "S" : null;
      if (st.dir === "long" && niv[k + 1] > P) { tine[k] = true; intr[k] = P; Ql += q[k]; Cl += q[k] * P; fee += q[k] * P * com; umpleri++; }
      if (st.dir === "short" && niv[k] < P) { tine[k] = true; intr[k] = P; Qs += q[k]; Cs += q[k] * P; fee += q[k] * P * com; umpleri++; }
    }
    function umple(k, p) { fee += q[k] * p * com; umpleri++; }
    function misca(a, x) {
      var j;
      if (x < a) {                              // in jos: niveluri j cu x <= niv[j] < a, celula j
        for (j = primulPeste(niv, a) - 1; j >= 0 && niv[j] >= x; j--) {
          if (j >= N || !tip[j]) continue;
          if (tip[j] === "L" && !tine[j]) { tine[j] = true; intr[j] = niv[j]; Ql += q[j]; Cl += q[j] * niv[j]; umple(j, niv[j]); }
          else if (tip[j] === "S" && tine[j]) { tine[j] = false; real += q[j] * (intr[j] - niv[j]); Qs -= q[j]; Cs -= q[j] * intr[j]; umple(j, niv[j]); }
        }
      } else if (x > a) {                       // in sus: niveluri j cu a < niv[j] <= x, celula j-1
        for (j = Math.max(1, primulPeste(niv, a)); j <= N && niv[j] <= x; j++) {
          if (niv[j] === a) continue;
          var c = j - 1;
          if (!tip[c]) continue;
          if (tip[c] === "L" && tine[c]) { tine[c] = false; real += q[c] * (niv[j] - intr[c]); Ql -= q[c]; Cl -= q[c] * intr[c]; umple(c, niv[j]); }
          else if (tip[c] === "S" && !tine[c]) { tine[c] = true; intr[c] = niv[j]; Qs += q[c]; Cs += q[c] * niv[j]; umple(c, niv[j]); }
        }
      }
    }
    function capital(p) { return 1 + real - fee + (Ql * p - Cl) + (Cs - Qs * p); }
    function lichidat(p) { return capital(p) <= C.MMR * (Ql + Qs) * p; }
    function rezultat(extra) {
      var r = { net: 0, realizat: real, comisioane: fee, iesiri: iesiri, lichidat: false, oprit: false, umpleri: umpleri };
      for (var e in extra) r[e] = extra[e];
      return r;
    }
    function inchide(p) {
      if (lichidat(p)) return rezultat({ net: -1, lichidat: true });
      real += (Ql * p - Cl) + (Cs - Qs * p); fee += (Ql + Qs) * p * com;
      Ql = Cl = Qs = Cs = 0;
      return rezultat({ net: real - fee, oprit: true });
    }
    var pret = P, inauntru = true, sj = st.stop ? st.stop.jos : -Infinity, ss = st.stop ? st.stop.sus : Infinity;
    var fin = Math.min(b.length, start + lungime);
    for (var i = start; i < fin; i++) {
      var x = b[i], drum = x.c >= x.o ? [x.o, x.l, x.h, x.c] : [x.o, x.h, x.l, x.c];
      for (var d = 0; d < 4; d++) {
        var p = drum[d];
        if (p <= sj) { misca(pret, sj); if (inauntru) iesiri++; return inchide(sj); }
        if (p >= ss) { misca(pret, ss); if (inauntru) iesiri++; return inchide(ss); }
        misca(pret, p); pret = p;
        var acum = p >= st.jos && p <= st.sus;
        if (inauntru && !acum) iesiri++;
        inauntru = acum;
        if (lichidat(p)) return rezultat({ net: -1, lichidat: true });
      }
    }
    var fee2 = (Ql + Qs) * pret * com;   // comisionul de inchidere la final
    return rezultat({ net: real - fee - fee2 + (Ql * pret - Cl) + (Cs - Qs * pret) });
  }

  function statistici(rez) {
    if (!rez || !rez.length) return null;
    var net = [], ies = 0, lich = 0, opr = 0;
    for (var i = 0; i < rez.length; i++) { net.push(rez[i].net); ies += rez[i].iesiri; if (rez[i].lichidat) lich++; if (rez[i].oprit) opr++; }
    return { n: rez.length, mediana: G.mediana(net), ceaMaiProasta: Math.min.apply(null, net), iesiriMedii: ies / rez.length, lichidari: lich, opriri: opr };
  }

  // Platou, nu varf: scorul unei celule = media medianelor ei si a vecinilor
  // (latime +-1, pas +-1). Celulele lichidate nu se aleg; ca vecini, valoreaza
  // -100% (o setare vecina care se lichideaza e o prapastie, nu un plus).
  function alegePlatou(mat) {
    var best = null;
    for (var wi = 0; wi < mat.length; wi++) for (var pi = 0; pi < mat[wi].length; pi++) {
      var c = mat[wi][pi];
      if (!c || c.lichidari > 0 || c.mediana === null) continue;
      var s = 0, n = 0, vec = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var v = 0; v < vec.length; v++) {
        var r = mat[wi + vec[v][0]], x = r && r[pi + vec[v][1]];
        if (x && x.mediana !== null) { s += x.lichidari > 0 ? -1 : x.mediana; n++; }
      }
      var scor = s / n;
      if (!best || scor > best.scor) best = { wi: wi, pi: pi, scor: scor };
    }
    return best;
  }

  function proba(b15, H) {
    var W = H * C.BARE_ZI;
    if (!b15 || b15.length < 2 * W + C.BARE_ZI) return null;
    var nA = Math.round(b15.length * 2 / 3), A = b15.slice(0, nA);
    var lats = G.latimi(A, H), pasV = G.pasi(A);
    if (lats.length < 3 || !pasV) return null;
    var latV = C.PERCENTILE.map(function (p) { return G.percentila(lats, p); });
    var starturi = [], s, nAntren = 0, nTest = 0;
    for (s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) {
      if (s + W <= nA) { starturi.push({ s: s, t: "a" }); nAntren++; }
      else if (s >= nA) { starturi.push({ s: s, t: "t" }); nTest++; }
    }
    var pe = {}, recomandata = null, scorRec = -Infinity;
    DIRECTII.forEach(function (dir) {
      var mat = [];
      for (var wi = 0; wi < latV.length; wi++) {
        mat.push([]);
        for (var pi = 0; pi < pasV.length; pi++) {
          var ra = [], rt = [];
          for (var j = 0; j < starturi.length; j++) {
            var f = starturi[j], st = G.construieste({ pret: b15[f.s].o, lat: latV[wi], pas: pasV[pi], dir: dir });
            (f.t === "a" ? ra : rt).push(simuleaza(b15, f.s, W, st));
          }
          mat[wi].push({ antren: statistici(ra), test: statistici(rt) });
        }
      }
      var ales = alegePlatou(mat.map(function (r) { return r.map(function (x) { return x.antren; }); }));
      if (ales) {
        pe[dir] = { wi: ales.wi, pi: ales.pi, antren: mat[ales.wi][ales.pi].antren, test: mat[ales.wi][ales.pi].test, platou: ales.scor, faraVarianta: false };
        if (ales.scor > scorRec) { scorRec = ales.scor; recomandata = dir; }
      } else {
        var d = C.PERC_IMPLICIT;   // nicio varianta fara lichidare: arat varianta de mijloc, cu lichidarile ei
        pe[dir] = { wi: d, pi: 1, antren: mat[d][1].antren, test: mat[d][1].test, platou: null, faraVarianta: true };
      }
    });
    return { H: H, zile: b15.length / C.BARE_ZI, ferestre: { antren: nAntren, test: nTest, independente: Math.floor(b15.length / W) },
      latimi: latV, pasi: pasV, pe: pe, recomandata: recomandata };
  }

  // Trendul si proba nu sunt de acord? Se spune doar cand directia recomandata
  // de proba n-a pierdut nici pe zilele nevazute (altfel validarea a respins-o
  // si "pe istoric a iesit mai bine X" ar fi fals). Vazut pe BTC/SOL, 24.09.
  function contrazice(pr, dir) {
    if (!pr || !pr.recomandata || pr.recomandata === dir) return null;
    var t = pr.pe[pr.recomandata] && pr.pe[pr.recomandata].test;
    if (t && t.mediana !== null && t.mediana < 0) return null;
    return { fisa: dir, proba: pr.recomandata };
  }

  // Minimul pe ordin la Pionex e cel mai mare dintre minNotional (USDT) si
  // cantitatea minima (minSizeLimit) x pret - la BTC 0,0001 BTC bate 1 USDT de 8 ori.
  function minOrdin(o, sus) {
    var m = o.minNotional > 0 ? o.minNotional : 0;
    if (o.minSize > 0 && sus > 0) m = Math.max(m, o.minSize * sus);
    return m > 0 ? m : null;
  }

  function fisa(o) {
    if (!(o.pret > 0)) return { eroare: "N-am prețul de acum al monedei." };
    if (!o.b15 || o.b15.length < 7 * C.BARE_ZI) return { eroare: "Prea puține lumânări ca să probez: moneda are " + (o.b15 ? (o.b15.length / C.BARE_ZI).toFixed(1) : "0") + " zile de istoric pe 15 minute, iar proba cere cel puțin 7 zile." };
    var pr = proba(o.b15, o.H);
    if (!pr) return { eroare: "Prea puține lumânări ca să probez: trebuie cel puțin " + (2 * o.H + 1) + " zile de istoric pe 15 minute." };
    var dT = G.directie(o.b4h, o.b1d), dir = o.dir || dT.dir, ales = pr.pe[dir];
    var lat = G.percentila(G.latimi(o.b15, o.H), C.PERCENTILE[ales.wi]), pas = G.pasi(o.b15)[ales.pi];
    var st = G.construieste({ pret: o.pret, lat: lat, pas: pas, dir: dir, suma: o.suma, levier: o.levier });
    // Minimul pe ordin: intai mai putine grile (spec 6.4); suma necesara doar daca nici 2 nu incap.
    var mo = minOrdin(o, st.sus), sumaMinima = null;
    if (mo !== null && st.perOrdin < mo) {
      var N2 = Math.floor(st.suma * st.levier / mo);
      if (N2 >= C.GRILE_MIN) {
        var de = st.grile;
        st = G.construieste({ pret: o.pret, lat: lat, pas: pas, dir: dir, suma: o.suma, levier: o.levier, grile: N2 });
        st.redus = { de: de, la: st.grile, minOrdin: mo };
      } else sumaMinima = mo * C.GRILE_MIN / st.levier;
    }
    var rg = G.regim(o.b15), poz = G.pozitie7z(o.b4h, o.pret);
    var v = G.verdict({ regim: rg, stat: ales, zile: pr.zile, pozitie: poz, pesteSigur: st.pesteSigur, nesigur: !st.sigur });
    if (sumaMinima !== null) {
      v = { nivel: "nu", motive: ["suma e prea mică: Pionex cere cel puțin " + mo.toFixed(2) + " USDT pe ordin, deci pentru 2 grile la " + st.levier + "× îți trebuie cel puțin " + Math.ceil(sumaMinima) + " USDT"].concat(v.motive) };
    }
    return { simbol: o.simbol, pret: o.pret, H: o.H, directie: dT, dir: dir, manual: !!o.dir, setare: st, proba: pr, verdict: v,
      regim: rg, pozitie: poz, sumaMinima: sumaMinima,
      contra: contrazice(pr, dir) };
  }

  return { simuleaza: simuleaza, statistici: statistici, alegePlatou: alegePlatou, proba: proba, contrazice: contrazice, fisa: fisa };
})();
if (typeof globalThis !== "undefined") globalThis.GridProba = GridProba;
