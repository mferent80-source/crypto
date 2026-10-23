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
// v100.51 (I-470, ipoteza): cand pretul de la pornire e in zona de valoare a celor 7 zile de dinainte (Valoare.zona, doar trecut), acelasi
// pas pe un grid ANCORAT pe VAL-VAH fata de gridul standard - pe aceleasi ferestre. Cere valoare.js (Valoare); fara el, intrebarea lipseste.
var GridLaborator = (function () {
  "use strict";
  var G = GridCalcul, P = GridProba, C = G.C, VA = typeof Valoare !== "undefined" ? Valoare : null;

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
      // zona de valoare din cele 7 zile de DINAINTEA ferestrei (nicio bara din fereastra sau de dupa ea)
      var z = VA ? VA.zona(b.slice(s - 7 * C.BARE_ZI, s), {}) : null, inV = z ? b[u].c >= z.val && b[u].c <= z.vah : null, netVa = null;
      if (inV && z.vah > z.val) {
        var Nv = Math.max(C.GRILE_MIN, Math.min(C.GRILE_MAX, Math.floor(Math.log(z.vah / z.val) / Math.log(1 + pas)))), gv = Math.pow(z.vah / z.val, 1 / Nv) - 1;
        var stVa = { dir: "neutru", jos: z.val, sus: z.vah, grile: Nv, levier: G.levierSigur(z.val, z.vah, b[s].o, "neutru", Nv).levier, stop: G.stopuri(z.val, z.vah, gv) };
        netVa = P.simuleaza(b, s, W, stVa).net;
      }
      out.push({ inValoare: inV, netVa: netVa,
        s: s, t: b[s].t, parte: parte, net: P.simuleaza(b, s, W, st).net,   // v100.259: și ora pornirii (blocurile pe zile, aliniate între monede)
        miscare: (m4[u] !== null && m4[u] > C.PRAG_MISCARE * o4) || (m24[u] !== null && m24[u] > C.PRAG_MISCARE * o24),
        linisteZile: run[u] / C.BARE_ZI,
        margine: poz < C.MARGINE_RANGE || poz > 1 - C.MARGINE_RANGE
      });
    }
    return out;
  }

  function grupa(rows, pred, H) {
    var x = rows.filter(pred), net = x.map(function (r) { return r.net; }), plus = x.filter(function (r) { return r.net > 0; }).length;
    // ferestre independente - v100.196 (auditul sever 14.10, 🔵8): pe TIMP (pozițiile de start distincte), nu pe monedă × fereastră: cele ~20 de
    // monede trec prin aceeași perioadă, deci nu înmulțesc dovezile (nEf era umflat de ~20×)
    var poz = {}; x.forEach(function (r, i) { poz[typeof r.s === "number" ? "s" + r.s : "r" + i] = 1; });   /* fără poziție (rânduri vechi): fiecare rând */
    var nEf = Math.floor(Object.keys(poz).length * C.PAS_FERESTRE / (H * C.BARE_ZI));
    var p = x.length ? plus / x.length : null;
    return { n: x.length, nEf: nEf, pePlus: p, mediana: G.mediana(net), medie: net.length ? net.reduce(function (a, v) { return a + v; }, 0) / net.length : null, ic: p === null ? null : G.wilson(Math.round(p * nEf), nEf) };   // v100.259: și media netului
  }

  // v100.259 (auditul 23.10, punctul 13): testul pe BANI (netul ferestrei), pe ZILE. Unitatea = celula (monedă, bloc de H zile, etichetă): media
  // netului ferestrelor ei - ferestrele aceleiași monede din același bloc se suprapun și nu sunt dovezi separate. Statistica = abaterea celulelor
  // A de la media blocului lor (piața comună din bloc se scade), ponderată ca Mantel–Haenszel; p = permutarea etichetelor ÎN INTERIORUL fiecărui
  // bloc (exactă când eticheta nu spune nimic despre net, dată fiind ziua); IC = bootstrap pe blocuri. Simularea de mărime sub H0 (piață comună,
  // etichete grupate în timp, varianță mai mare în mișcare): scratchpad audit23/p13-h0.mjs, cifrele în raportul auditului.
  var ZI_MS = 86400000;
  function blocDe(r, H) { return typeof r.t === "number" ? Math.floor(r.t / (H * ZI_MS)) : typeof r.s === "number" ? Math.floor(r.s / (H * C.BARE_ZI)) : null; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function testNet(rows, predA, predB, H, o) {
    o = o || {};
    var cel = {}, blocuri = {};
    var PAS6 = 6 * 3600000, felii = H * 24 / 6;
    rows.forEach(function (r) {
      if (typeof r.net !== "number" || !isFinite(r.net)) return;
      // doar ferestrele care NU se suprapun: pornite la fiecare H zile (aliniate pe timp, aceleași pentru toate monedele)
      if (typeof r.t === "number" ? Math.round(r.t / PAS6) % felii !== 0 : typeof r.s === "number" ? r.s % (H * C.BARE_ZI) !== 0 : false) return;
      var a = predA(r), b = !a && predB(r); if (!a && !b) return;
      var bl = blocDe(r, H); if (bl === null) return;
      var k = bl + "|" + (r.simbol || "") + "|" + (a ? "A" : "B");
      if (!cel[k]) { cel[k] = { bl: bl, A: a, s: 0, n: 0 }; (blocuri[bl] = blocuri[bl] || []).push(cel[k]); }
      cel[k].s += r.net; cel[k].n++;
    });
    var bl = Object.keys(blocuri).map(function (k) { var l = blocuri[k].map(function (c) { return { v: c.s / c.n, A: c.A }; }), nA = l.filter(function (c) { return c.A; }).length; return { l: l, nA: nA, n: l.length, m: l.reduce(function (s, c) { return s + c.v; }, 0) / l.length }; })
      .filter(function (g) { return g.nA > 0 && g.nA < g.n; });
    var cA = 0, cB = 0; bl.forEach(function (g) { cA += g.nA; cB += g.n - g.nA; });
    if (bl.length < (o.minBlocuri || 8) || cA < 10 || cB < 10) return { stare: "putine", blocuri: bl.length, celuleA: cA, celuleB: cB };
    var T = function (g, et) { var s = 0; for (var i = 0; i < g.n; i++) if (et[i]) s += g.l[i].v - g.m; return s; };
    var Wt = bl.reduce(function (s, g) { return s + g.nA * (g.n - g.nA) / g.n; }, 0), obs = 0;
    bl.forEach(function (g) { g.et = g.l.map(function (c) { return c.A; }); obs += T(g, g.et); });
    var R = o.reps || 10000, rnd = mulberry32(o.seed || 259), peste = 0;
    for (var r = 0; r < R; r++) {
      var s = 0;
      for (var q = 0; q < bl.length; q++) { var g = bl[q], e = g.et.slice(); for (var i = e.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = e[i]; e[i] = e[j]; e[j] = t; } s += T(g, e); }
      if (Math.abs(s) >= Math.abs(obs) - 1e-12) peste++;
    }
    var rb = mulberry32((o.seed || 259) + 7919), bs = [];
    for (var k2 = 0; k2 < 1000; k2++) { var a2 = 0, w2 = 0; for (var e2 = 0; e2 < bl.length; e2++) { var h = bl[Math.floor(rb() * bl.length)]; a2 += T(h, h.et); w2 += h.nA * (h.n - h.nA) / h.n; } if (w2 > 0) bs.push(a2 / w2); }
    bs.sort(function (x, y) { return x - y; });
    return { stare: "testat", dif: obs / Wt, p: (peste + 1) / (R + 1), pMin: 1 / (R + 1), ic: bs.length ? [bs[Math.floor(bs.length * 0.025)], bs[Math.min(bs.length - 1, Math.floor(bs.length * 0.975))]] : null, blocuri: bl.length, celuleA: cA, celuleB: cB };
  }

  function compara(rows, predA, predB, H) {
    var pe = function (parte) { return rows.filter(function (r) { return r.parte === parte; }); };
    var A = grupa(rows, predA, H), B = grupa(rows, predB, H);
    var aA = grupa(pe("a"), predA, H), aB = grupa(pe("a"), predB, H), tA = grupa(pe("t"), predA, H), tB = grupa(pe("t"), predB, H);
    var out = { A: A, B: B, alegere: { A: aA, B: aB }, nevazut: { A: tA, B: tB }, verdict: "n-am-aflat" };
    // v100.259 (auditul 23.10, punctul 13): „dovedit” pe BANI, nu pe procentul de ferestre pe plus (un grid câștigă des puțin și pierde rar mult):
    // diferența de net A − B pe zile (testNet), același semn pe alegere și pe nevăzut, p < 0,05 - p-ul intră în registrul BH (pentruRegistru).
    // Mărimea sub H0 (1.000 de seturi): p < 0,05 în 5,0%, „dovedit” în 4,2% (monede cu volatilitate diferită: 5,5% / 5,1%).
    out.net = testNet(rows, predA, predB, H);
    out.netAlegere = testNet(pe("a"), predA, predB, H, { reps: 2000, minBlocuri: 4 }); out.netNevazut = testNet(pe("t"), predA, predB, H, { reps: 2000, minBlocuri: 4 });
    if (out.net.stare !== "testat" || out.netAlegere.stare !== "testat" || out.netNevazut.stare !== "testat") return out;
    var sa = Math.sign(out.netAlegere.dif), st = Math.sign(out.netNevazut.dif);
    if (sa !== 0 && st !== 0 && sa !== st) { out.verdict = "contrazis"; return out; }
    if (sa !== 0 && sa === st && sa === Math.sign(out.net.dif) && out.net.p < 0.05) out.verdict = "dovedit";
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
    // v100.51 (I-470): grid ancorat pe zona de valoare vs standard, doar cand pretul e in zona - aceleasi ferestre, doua variante
    var dub = [];
    rows.forEach(function (r) { if (r.inValoare && typeof r.netVa === "number") { dub.push({ parte: r.parte, net: r.netVa, varianta: "va" }); dub.push({ parte: r.parte, net: r.net, varianta: "std" }); } });
    if (VA) q.push({ id: "valoare", titlu: "Grid ancorat pe zona de valoare (7 zile) vs gridul standard, când prețul e în zonă (ipoteză)", eticheteA: "ancorat pe zonă", eticheteB: "standard",
      c: compara(dub, function (r) { return r.varianta === "va"; }, function (r) { return r.varianta === "std"; }, H) });
    return q.map(function (x) { return { id: x.id, titlu: x.titlu, eticheteA: x.eticheteA, eticheteB: x.eticheteB, A: x.c.A, B: x.c.B, alegere: x.c.alegere, nevazut: x.c.nevazut, verdict: x.c.verdict, net: x.c.net || null }; });
  }

  // v100.259 (punctul 13): întrebările testate intră în registrul tuturor testelor Radarului (corecția Benjamini–Hochberg, Verdicte.registru o.alte)
  function pentruRegistru(intrebari) {
    return (Array.isArray(intrebari) ? intrebari : []).filter(function (q) { return q && q.net && q.net.stare === "testat"; }).map(function (q) {
      return { sursa: "Laboratorul gridului", afirmatie: q.titlu, p: q.net.p, pMin: q.net.pMin, dif: q.net.dif, felul: "laborator", regula: q.verdict === "dovedit", directie: q.net.dif > 0 ? q.eticheteA + " iese mai bine pe net" : q.eticheteA + " iese mai rău pe net" };
    });
  }
  return { ferestre: ferestre, compara: compara, intrebari: intrebari, testNet: testNet, pentruRegistru: pentruRegistru };
})();
if (typeof globalThis !== "undefined") globalThis.GridLaborator = GridLaborator;
