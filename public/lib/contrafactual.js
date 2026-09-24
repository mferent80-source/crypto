// "Daca ascultai de Radar" (v83) - modul pur, probat in scripts/jurnal-trade-v81.mjs.
// Pentru fiecare bot inchis, Radarul reface fisa cum ar fi aratat LA ORA PORNIRII: doar
// lumanari inchise inainte (taie), apoi GridProba.fisa + regulile din jurnal. Se incarca
// DUPA grid-calcul.js si grid-proba.js.
//
// Ce ar fi zis:  NU      - verdictul fisei "nu", SAU botul pornit contra unui trend tare/mediu,
//                          SAU repornit la <10 min dupa altul pe aceeasi moneda
//                ASTEAPTA - verdictul fisei "asteapta"
//                PORNESTE - altfel
// Lipsa de date = "fara-date" (nu se socoteste nici pentru, nici contra).
var Contrafactual = (function () {
  "use strict";

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }

  // doar barele INCHISE inainte de pornire: inceput + durata <= pornit
  function taie(randuri, pornit, pasMs) {
    if (!Array.isArray(randuri)) return [];
    return randuri.filter(function (r) { var t = nr(r && (Array.isArray(r) ? r[0] : r.time)); return t !== null && t + pasMs <= pornit; });
  }

  function zice(fisa, t) {
    if (!fisa || !fisa.verdict || !t) return { nivel: "fara-date", motive: ["n-am avut destule lumânări înainte de pornire"] };
    var motive = [], nivel = fisa.verdict.nivel === "nu" ? "nu" : fisa.verdict.nivel === "asteapta" ? "asteapta" : "porneste";
    if (fisa.verdict.nivel === "nu" || fisa.verdict.nivel === "asteapta") motive = motive.concat((fisa.verdict.motive || []).slice(0, 2));
    var d = fisa.directie;
    if (d && (t.dir === "long" || t.dir === "short") && (d.tarie === "tare" || d.tarie === "mediu") && ((t.dir === "long" && d.dir === "short") || (t.dir === "short" && d.dir === "long"))) {
      nivel = "nu"; motive.unshift("botul " + t.dir + " era contra trendului (" + d.dir + ", " + d.tarie + ")");
    }
    if ((t.greseli || []).some(function (g) { return g.cod === "reintrare"; })) { nivel = "nu"; motive.unshift("repornit la mai puțin de 10 min după botul anterior"); }
    if (nivel === "porneste" && fisa.verdict.nivel === "porneste") motive.push("liniște și proba pe plus" + (d && d.dir ? ", trendul " + d.dir : ""));
    return { nivel: nivel, motive: motive, dirTrend: d ? d.dir : null, tarie: d ? d.tarie : null };
  }

  // l = [{t: trade, z: zice(...)}]
  function rezumat(l) {
    var r = { n: 0, judecate: 0, faraDate: 0, real: 0, realJudecate: 0, doarVerde: 0, verdeGalben: 0, blocateSalvat: 0, blocateRatat: 0, nBlocate: 0, nVerde: 0, nGalben: 0 };
    (Array.isArray(l) ? l : []).forEach(function (x) {
      var v = nr(x.t && x.t.rezultat); if (v === null) return;
      r.n++; r.real += v;
      var n = x.z && x.z.nivel;
      if (n === "fara-date" || !n) { r.faraDate++; return; }
      r.judecate++; r.realJudecate += v;
      if (n === "porneste") { r.doarVerde += v; r.verdeGalben += v; r.nVerde++; }
      else if (n === "asteapta") { r.verdeGalben += v; r.nGalben++; }
      else { r.nBlocate++; if (v < 0) r.blocateSalvat += -v; else r.blocateRatat += v; }
    });
    return r;
  }

  return { taie: taie, zice: zice, rezumat: rezumat };
})();
if (typeof globalThis !== "undefined") globalThis.Contrafactual = Contrafactual;
