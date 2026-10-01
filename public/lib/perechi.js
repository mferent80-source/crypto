// Perechile reale vs estimarea fisei (v100.51, I-477 - pachetul 4). Modul pur, probat in scripts/proba-v10051.mjs.
// Se incarca DUPA grid-calcul.js si grid-proba.js.
//
// Estimarea = ce ar fi asteptat fisa la pornire de la gridul TAU: acelasi grid (jos/sus relativ la pretul de pornire, aceleasi linii,
// directie, levier), mutat pe fiecare fereastra de H zile din cele 30 de zile de 15M de DINAINTEA pornirii, simulat cu GridProba.
// Nicio bara de dupa pornire nu intra. Sub 7 zile de istoric inainte -> fara estimare (spus pe fata).
// Raportul = perechile incheiate pe zi de bot / estimarea; factorul pe moneda = mediana raportului pe botii tai inchisi (de la 10),
// cu P25-P75 langa ea. E o corectie a probei pe moneda, nu o dovada: botii pe aceeasi moneda in aceleasi zile nu sunt independenti.
var Perechi = (function () {
  "use strict";
  var G = GridCalcul, P = GridProba, C = G.C, ZI = 86400000, B15 = 15 * 60000;
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }

  // o = { pornit, jos, sus, linii, dir, levier, pretPornire, H: 2 } -> { peZi, ferestre, zile } sau { eroare }
  function estimare(b15, o) {
    o = o || {}; var pornit = nr(o.pornit), jos = nr(o.jos), sus = nr(o.sus), linii = nr(o.linii), H = nr(o.H) || 2;
    if (pornit === null || jos === null || sus === null || !(sus > jos) || !(linii >= 2)) return { eroare: "lipsesc setările gridului" };
    var b = (Array.isArray(b15) ? b15 : []).filter(function (x) { return x && nr(x.t) !== null && x.t + B15 <= pornit && x.t >= pornit - 30 * ZI && x.o > 0; })
      .sort(function (a, c) { return a.t - c.t; });
    var zile = b.length / C.BARE_ZI;
    if (b.length < 7 * C.BARE_ZI) return { eroare: "prea puțin istoric înainte de pornire (" + zile.toFixed(1).replace(".", ",") + " zile; trebuie 7 zile)" };
    var p0 = nr(o.pretPornire) > 0 ? nr(o.pretPornire) : b[b.length - 1].c, W = Math.round(H * C.BARE_ZI), per = [], dir = o.dir === "long" || o.dir === "short" ? o.dir : "neutru";
    for (var s = 0; s + W <= b.length; s += C.PAS_FERESTRE) {
      var k = b[s].o / p0, st = { dir: dir, jos: jos * k, sus: sus * k, grile: Math.max(1, Math.round(linii) - 1), levier: nr(o.levier) > 0 ? nr(o.levier) : 1, stop: null };
      per.push(P.simuleaza(b, s, W, st).perechi || 0);
    }
    if (!per.length) return { eroare: "nicio fereastră de " + H + " zile înainte de pornire" };
    return { peZi: per.reduce(function (a, v) { return a + v; }, 0) / per.length / H, ferestre: per.length, zile: zile };
  }
  // perechile reale pe zi fata de estimare; sub o zi de bot sau estimare sub 0,5 perechi/zi -> null (n-ar spune nimic)
  function raport(perechi, pornit, acum, est) {
    var n = nr(perechi), t0 = nr(pornit), t = nr(acum) || Date.now(), e = est && nr(est.peZi);
    if (n === null || t0 === null || e === null || !(e >= 0.5)) return null;
    var zile = (t - t0) / ZI; if (zile < 1) return null;
    var real = n / zile;
    return { real: real, est: e, raport: real / e, zile: zile };
  }
  function median(a) { return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; }
  // factorul pe moneda din botii inchisi: [{raport}] -> { factor, p25, p75, n } sau { lipsa, n } sub 10
  function factor(lista) {
    var v = (Array.isArray(lista) ? lista : []).map(function (x) { return x && nr(x.raport); }).filter(function (x) { return x !== null && x > 0; }).sort(function (a, c) { return a - c; });
    if (v.length < 10) return { lipsa: 10 - v.length, n: v.length };
    return { factor: median(v), p25: G.percentila(v, 0.25), p75: G.percentila(v, 0.75), n: v.length };
  }
  return { estimare: estimare, raport: raport, factor: factor };
})();
if (typeof globalThis !== "undefined") globalThis.Perechi = Perechi;
