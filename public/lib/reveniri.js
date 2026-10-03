// Reveniri și monede pentru short (v100.85, 03.10, el: „la fiecare câte un modul de revers cu coinuri care au scăzut puternic și acum
// sunt pe revenire, la fel și la stocks, plus la coinuri și opțiunea de coinuri în short direcționat”). Modul pur: pagina, colectorul și
// probele îl folosesc la fel. Regulile sunt cele probate pe 03.10 și FIXATE în spec (2026-10-03-reveniri-si-short-design.md) - nu se
// reglează după ce se văd rezultatele. Totul pe bare ÎNCHISE; un filtru, nu o predicție: istoricul se arată lângă fiecare listă.
var Reveniri = (function () {
  "use strict";
  var ORA = 3600000, H4 = 4 * ORA, ZI = 24 * ORA;
  var REGULI = {
    moneda: { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 },
    actiune: { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 }
  };
  var r4 = function (x) { return x === null || x === undefined || !isFinite(x) ? null : Math.round(x * 10000) / 10000; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  // ultima bară ÎNCHISĂ la `acum` (bara de durată d se închide la t + d)
  function ultimaInchisa(b, d, acum) { var j = b.length - 1; while (j >= 0 && b[j].t + d > acum) j--; return j; }
  // regula pe barele b[0..j] (j = ultima bară închisă); r = REGULI.moneda sau REGULI.actiune
  function judeca(b, j, r) {
    var nMax = r.maxZile * r.barePeZi, nMin = r.minZile * r.barePeZi, nMed = r.medieZile * r.barePeZi;
    if (!Array.isArray(b) || j < nMax - 1 || j >= b.length) return null;
    var c = b[j].c, mx = -Infinity, mn = Infinity, iMin = j, s = 0, k;
    for (k = j - nMax + 1; k <= j; k++) if (b[k].h > mx) mx = b[k].h;
    for (k = j - nMin + 1; k <= j; k++) if (b[k].l < mn) { mn = b[k].l; iMin = k; }
    for (k = j - nMed + 1; k <= j; k++) s += b[k].c;
    if (!(c > 0) || !(mx > 0) || !(mn > 0)) return null;
    var cadere = 1 - c / mx, deLaMin = c / mn - 1, zile = (j - iMin) / r.barePeZi, peste = c > s / nMed;
    return { cadere: r4(cadere), deLaMin: r4(deLaMin), zileDeLaMin: Math.round(zile * 10) / 10, pesteMedie: peste, max: mx, min: mn,
      revine: cadere >= r.cadere && deLaMin >= r.revenire && zile >= r.vechimeZile && peste };
  }
  // clasamentul: barele de 4h de la Pionex au la coadă bara în curs - se judecă doar cele închise
  function monedaPeRevenire(b4h, acum) {
    if (!Array.isArray(b4h) || !b4h.length) return null;
    var v = judeca(b4h, ultimaInchisa(b4h, H4, acum === undefined ? Date.now() : acum), REGULI.moneda);
    return v ? { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine } : null;
  }
  // tura ideilor: la 8:00 ora României toate barele zilnice sunt închise
  function actiunePeRevenire(bz) {
    if (!Array.isArray(bz) || !bz.length) return null;
    var v = judeca(bz, bz.length - 1, REGULI.actiune); if (!v) return null;
    return { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine, pret: bz[bz.length - 1].c, stop: r2(v.min * 0.99), tinta: r2(v.max) };
  }
  return { REGULI: REGULI, ultimaInchisa: ultimaInchisa, judeca: judeca, monedaPeRevenire: monedaPeRevenire, actiunePeRevenire: actiunePeRevenire };
})();
if (typeof globalThis !== "undefined") globalThis.Reveniri = Reveniri;
