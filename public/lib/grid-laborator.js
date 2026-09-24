// Laboratorul de reguli pe grid (v79.5) - modul pur, probat in scripts/grid-v78.mjs.
// Se incarca DUPA grid-calcul.js si grid-proba.js. Il ruleaza colectorul de acasa o data pe zi.
//
// Intrebarea: in ce conditii, STIUTE LA PORNIRE, un grid neutru standard a iesit mai bine?
// Nu invata directia (s-a masurat de 6 ori ca nu se poate). Masoara conditii:
//   - miscare acum (regula din verdict)        - de cate zile tine linistea (pe 24 h)
//   - pretul la marginea range-ului pe 7 zile
// Metoda (anti-noroc): latimea/pasul si pragurile de "obisnuit" se aleg DOAR pe primele 2/3;
// comparatia se face separat pe primele 2/3 si pe ultima treime; ferestrele se suprapun
// (2 zile, una la 6 h), deci intervalele de incredere folosesc ferestre INDEPENDENTE (n / 8).
// "dovedit" = acelasi semn in ambele parti SI intervalele (Wilson 95%) nu se ating.
var GridLaborator = (function () {
  "use strict";
  var G = GridCalcul, P = GridProba, C = G.C;

  function ferestre(b, H) {
    var W = H * C.BARE_ZI, n = b ? b.length : 0, out = [];
    if (n < 2 * W + 7 * C.BARE_ZI) return out;
    var nA = Math.round(n * 2 / 3), A = b.slice(0, nA), i;
    var lats = G.latimi(A, H), pasV = G.pasi(A);
    if (lats.length < 3 || !pasV) return out;
    var lat = G.percentila(lats, 0.75), pas = pasV[1];
    // "obisnuitul" din primele 2/3; miscarea la fiecare bara se stie la inchiderea ei
    var m4 = [], m24 = [], l4 = [], l24 = [];
    for (i = 0; i < n; i++) {
      m4[i] = i >= 16 ? Math.abs(b[i].c - b[i - 16].c) / b[i - 16].c : null;
      m24[i] = i >= C.BARE_ZI ? Math.abs(b[i].c - b[i - C.BARE_ZI].c) / b[i - C.BARE_ZI].c : null;
      if (i < nA) { if (m4[i] !== null) l4.push(m4[i]); if (m24[i] !== null) l24.push(m24[i]); }
    }
    var o4 = G.percentila(l4, 0.75), o24 = G.percentila(l24, 0.75);
    if (!(o4 > 0) || !(o24 > 0)) return out;
    // durata linistii (histerezis pe 24 h, ca in linisteTine) - doar trecut
    var run = [], inMis = true, lung = 0;
    for (i = 0; i < n; i++) {
      if (m24[i] === null) { inMis = true; }
      else if (inMis && m24[i] < 1.2 * o24) inMis = false;
      else if (!inMis && m24[i] > C.PRAG_MISCARE * o24) inMis = true;
      lung = inMis ? 0 : lung + 1; run[i] = lung;
    }
    for (var s = 7 * C.BARE_ZI; s + W <= n; s += C.PAS_FERESTRE) {
      var parte = s + W <= nA ? "a" : s >= nA ? "t" : null;
      if (!parte) continue;
      var u = s - 1, mx = -Infinity, mn = Infinity;
      for (i = s - 7 * C.BARE_ZI; i < s; i++) { if (b[i].h > mx) mx = b[i].h; if (b[i].l < mn) mn = b[i].l; }
      var poz = mx > mn ? (b[u].c - mn) / (mx - mn) : 0.5;
      var st = G.construieste({ pret: b[s].o, lat: lat, pas: pas, dir: "neutru" });
      out.push({
        s: s, parte: parte, net: P.simuleaza(b, s, W, st).net,
        miscare: (m4[u] !== null && m4[u] > C.PRAG_MISCARE * o4) || (m24[u] !== null && m24[u] > C.PRAG_MISCARE * o24),
        linisteZile: run[u] / C.BARE_ZI,
        margine: poz < C.MARGINE_RANGE || poz > 1 - C.MARGINE_RANGE
      });
    }
    return out;
  }

  function grupa(rows, pred, H) {
    var x = rows.filter(pred), net = x.map(function (r) { return r.net; }), plus = x.filter(function (r) { return r.net > 0; }).length;
    var nEf = Math.floor(x.length * C.PAS_FERESTRE / (H * C.BARE_ZI));   // ferestre independente
    var p = x.length ? plus / x.length : null;
    return { n: x.length, nEf: nEf, pePlus: p, mediana: G.mediana(net), ic: p === null ? null : G.wilson(Math.round(p * nEf), nEf) };
  }

  function compara(rows, predA, predB, H) {
    var pe = function (parte) { return rows.filter(function (r) { return r.parte === parte; }); };
    var A = grupa(rows, predA, H), B = grupa(rows, predB, H);
    var aA = grupa(pe("a"), predA, H), aB = grupa(pe("a"), predB, H), tA = grupa(pe("t"), predA, H), tB = grupa(pe("t"), predB, H);
    var out = { A: A, B: B, alegere: { A: aA, B: aB }, nevazut: { A: tA, B: tB }, verdict: "n-am-aflat" };
    if (A.nEf < 10 || B.nEf < 10 || aA.n < 5 || aB.n < 5 || tA.n < 5 || tB.n < 5) return out;
    var sa = Math.sign(aA.pePlus - aB.pePlus), st = Math.sign(tA.pePlus - tB.pePlus);
    if (sa !== 0 && st !== 0 && sa !== st) { out.verdict = "contrazis"; return out; }
    var separat = A.ic && B.ic && (A.ic[1] < B.ic[0] || B.ic[1] < A.ic[0]);
    if (sa !== 0 && sa === st && separat) out.verdict = "dovedit";
    return out;
  }

  function intrebari(rows, H) {
    var fara = function (f) { return function (r) { return !r.miscare && f(r); }; };
    var q = [
      { id: "miscare", titlu: "Pornit după mișcare vs pornit în liniște", eticheteA: "după mișcare", eticheteB: "în liniște",
        c: compara(rows, function (r) { return r.miscare; }, function (r) { return !r.miscare; }, H) },
      { id: "liniste-lunga", titlu: "Liniște de cel puțin o zi vs liniște abia începută (sub o zi)", eticheteA: "liniște ≥ 1 zi", eticheteB: "liniște < 1 zi",
        c: compara(rows, fara(function (r) { return r.linisteZile >= 1; }), fara(function (r) { return r.linisteZile < 1; }), H) },
      { id: "margine", titlu: "Prețul la marginea range-ului pe 7 zile vs la mijloc", eticheteA: "la margine", eticheteB: "la mijloc",
        c: compara(rows, fara(function (r) { return r.margine; }), fara(function (r) { return !r.margine; }), H) }
    ];
    return q.map(function (x) { return { id: x.id, titlu: x.titlu, eticheteA: x.eticheteA, eticheteB: x.eticheteB, A: x.c.A, B: x.c.B, alegere: x.c.alegere, nevazut: x.c.nevazut, verdict: x.c.verdict }; });
  }

  return { ferestre: ferestre, compara: compara, intrebari: intrebari };
})();
if (typeof globalThis !== "undefined") globalThis.GridLaborator = GridLaborator;
