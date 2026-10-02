// Zona de valoare si pivotii confirmati (v100.51, I-470 - pachetul 4). Modul pur, probat in scripts/proba-v10051.mjs.
// Se incarca oriunde (nu cere alte module): Tabloul (graficul botului), colectorul si laboratorul.
//
// Zona de valoare = profilul de volum pe barele date (de regula 7 zile de 1 h): pretul cel mai tranzactionat (POC) si intervalul din jurul
// lui care strange 70% din volum (VAL-VAH), largit pe rand spre vecinul cu mai mult volum. Cand lumanarile n-au volum, profilul se face
// dupa TIMP (cate bare au stat la fiecare pret, TPO) - si se spune.
// Pivotii sunt CONFIRMATI: un varf/adanc conteaza doar daca dupa el exista k bare inchise (ultima bara e in curs si nu numara) - fara repaint.
// Nimic de aici nu prezice directia: sunt locuri unde pretul a stat sau s-a intors in trecut.
var Valoare = (function () {
  "use strict";
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function fp(v) { if (v === null || !isFinite(v)) return "?"; var t = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v > 0 && v < 1e-6 ? v.toFixed(Math.min(12, 3 - Math.floor(Math.log10(v)))) : v.toPrecision(4); return t.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  function valide(bare) {
    return (Array.isArray(bare) ? bare : []).filter(function (b) { return b && nr(b.h) !== null && nr(b.l) !== null && b.l > 0 && b.h >= b.l; });
  }

  // o = { bins: 40, procent: 0.7 } -> { poc, vah, val, n, dupa: "volum"|"timp", acoperire } sau null (sub 24 de bare)
  function zona(bare, o) {
    o = o || {}; var b = valide(bare), NB = Math.max(10, Math.floor(nr(o.bins) || 40)), proc = nr(o.procent) || 0.7;
    if (b.length < (nr(o.minBare) > 0 ? nr(o.minBare) : 24)) return null;   // v100.56: actiunile - zona pe 20 de zile de bursa (bare zilnice)
    var lo = Infinity, hi = -Infinity; b.forEach(function (x) { if (x.l < lo) lo = x.l; if (x.h > hi) hi = x.h; });
    if (!(hi > lo)) return null;
    var cuVol = b.some(function (x) { return nr(x.v) > 0; }), step = (hi - lo) / NB, bins = [], i;
    for (i = 0; i < NB; i++) bins.push(0);
    b.forEach(function (x) {
      var w = cuVol ? (nr(x.v) > 0 ? nr(x.v) : 0) : 1; if (!w) return;
      var a = Math.min(NB - 1, Math.max(0, Math.floor((x.l - lo) / step))), z = Math.min(NB - 1, Math.max(0, Math.floor((x.h - lo) / step)));
      for (var k = a; k <= z; k++) bins[k] += w / (z - a + 1);
    });
    var tot = bins.reduce(function (s, v) { return s + v; }, 0); if (!(tot > 0)) return null;
    var poc = 0; for (i = 1; i < NB; i++) if (bins[i] > bins[poc]) poc = i;
    var jos = poc, sus = poc, sum = bins[poc];
    while (sum / tot < proc && (jos > 0 || sus < NB - 1)) {
      var up = sus < NB - 1 ? bins[sus + 1] : -1, dn = jos > 0 ? bins[jos - 1] : -1;
      if (up >= dn) { sus++; sum += up; } else { jos--; sum += dn; }
    }
    return { poc: lo + (poc + 0.5) * step, vah: lo + (sus + 1) * step, val: lo + jos * step, n: b.length, dupa: cuVol ? "volum" : "timp", acoperire: sum / tot };
  }

  // pivotii confirmati pe ultimele bare: [{p, tip: "sus"|"jos", t, atingeri}]; cei de acelasi tip la < 0,3% unul de altul se comaseaza
  function pivoti(bare, k) {
    var b = valide(bare), K = Math.max(1, Math.floor(nr(k) || 3)), n = b.length, l = [], i, j;
    for (i = K; i <= n - 2 - K; i++) {   // n - 1 e bara in curs: dupa pivot trebuie K bare INCHISE
      var varf = true, adanc = true, peste = false, sub = false;
      for (j = i - K; j <= i + K; j++) {
        if (j === i) continue;
        if (b[j].h > b[i].h) varf = false; else if (b[j].h < b[i].h) peste = true;
        if (b[j].l < b[i].l) adanc = false; else if (b[j].l > b[i].l) sub = true;
      }
      if (varf && peste) l.push({ p: b[i].h, tip: "sus", t: b[i].t, atingeri: 1 });
      if (adanc && sub) l.push({ p: b[i].l, tip: "jos", t: b[i].t, atingeri: 1 });
    }
    var out = [];
    ["sus", "jos"].forEach(function (tip) {
      l.filter(function (x) { return x.tip === tip; }).sort(function (a, c) { return a.p - c.p; }).forEach(function (x) {
        var u = out.length ? out[out.length - 1] : null;
        if (u && u.tip === tip && Math.abs(x.p - u.p) / u.p < 0.003) { u.p = (u.p * u.atingeri + x.p) / (u.atingeri + 1); u.atingeri++; if (x.t > u.t) u.t = x.t; }
        else out.push({ p: x.p, tip: tip, t: x.t, atingeri: 1 });
      });
    });
    return out;
  }

  // gridul botului fata de zona: cat din interval sta in zona de valoare si daca POC e in grid
  function fataDeGrid(z, jos, sus) {
    jos = nr(jos); sus = nr(sus);
    if (!z || jos === null || sus === null || !(sus > jos)) return null;
    var a = Math.max(jos, z.val), c = Math.min(sus, z.vah), f = c > a ? (c - a) / (sus - jos) : 0, pin = z.poc >= jos && z.poc <= sus;
    return { inZona: f, pocInGrid: pin, text: Math.round(f * 100) + "% din grid e în zona de valoare (" + fp(z.val) + "–" + fp(z.vah) + ", 7 zile" + (z.dupa === "timp" ? ", după timp" : "") + "); cel mai tranzacționat preț (" + fp(z.poc) + ") e " + (pin ? "în grid" : "în afara gridului") + "." };
  }

  return { zona: zona, pivoti: pivoti, fataDeGrid: fataDeGrid };
})();
if (typeof globalThis !== "undefined") globalThis.Valoare = Valoare;
