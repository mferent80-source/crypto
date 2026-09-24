// "Pe care monede pornesc grid ACUM?" - modul pur, probat in scripts/grid-v78.mjs.
// Se incarca DUPA grid-calcul.js. Il ruleaza colectorul de acasa o data pe ora, pe
// top 100 PERP Pionex dupa volum, cu lumanari de 4h (o cerere pe moneda); fereastra
// Grid arata lista. NU e fisa: nu probeaza pe istoric. E o sita: cele de EVITAT
// (miscare - regula dovedita) primele, apoi candidatii dupa cat ar putea aduce
// gridul pe zi (profit pe grila x traversari estimate). Clic pe moneda => fisa intreaga.
var GridClasament = (function () {
  "use strict";
  var G = GridCalcul, C = G.C;
  var BARE_2Z = 12;   // 2 zile in bare de 4h

  function judeca(simbol, b4h, volum) {
    var out = { simbol: simbol, volum: volum == null ? null : volum, pret: null, regim: null, latime: null, dir: null, tarie: null, pas: null, grile: null, profitGrila: null, traversariZi: null, scor: null, stare: "fara-date" };
    if (!Array.isArray(b4h) || b4h.length < 50) return out;
    out.pret = b4h[b4h.length - 1].c;
    out.regim = G.regimPeBare(b4h, 1, 6);
    // latimea: max-min pe fiecare fereastra de 2 zile (12 bare), percentila 75
    var lat = [];
    for (var s = 0; s + BARE_2Z <= b4h.length; s++) {
      var mx = -Infinity, mn = Infinity;
      for (var i = s; i < s + BARE_2Z; i++) { if (b4h[i].h > mx) mx = b4h[i].h; if (b4h[i].l < mn) mn = b4h[i].l; }
      lat.push((mx - mn) / b4h[s].o);
    }
    out.latime = G.percentila(lat, 0.75);
    var d = G.directie(b4h, null);
    out.dir = d.dir; out.tarie = d.tarie;
    // pasul: miscarea tipica pe 15 min ~ cea pe 4h / 4 (radacina din 16 bare); pas max = x3
    var hl = [];
    for (var j = 0; j < b4h.length; j++) hl.push((b4h[j].h - b4h[j].l) / b4h[j].c);
    var tip15 = (G.mediana(hl) || 0) / 4, pasMax = Math.max(C.PAS_MIN, tip15 * C.PAS_MAX_MULT);
    out.pas = Math.sqrt(C.PAS_MIN * pasMax);
    if (!(out.latime > 0) || !out.regim) return out;
    var loc = G.plaseaza(out.pret, out.latime, out.dir);
    out.grile = G.nrGrile(loc.jos, loc.sus, out.pas);
    var g = Math.pow(loc.sus / loc.jos, 1 / out.grile) - 1;
    out.pas = g;
    out.profitGrila = g - 2 * C.COMISION;
    // traversari pe zi estimate: miscarea mediana pe 4h / pas, x 6 bare pe zi
    var m4 = [];
    for (var k = 1; k < b4h.length; k++) m4.push(Math.abs(b4h[k].c - b4h[k - 1].c) / b4h[k - 1].c);
    out.traversariZi = (G.mediana(m4) || 0) / g * 6;
    out.scor = out.profitGrila * out.traversariZi;   // fractie din suma pe zi, estimativ
    out.stare = out.regim.miscare ? "evita" : "candidat";
    return out;
  }

  function ordoneaza(lista) {
    var rang = { evita: 0, candidat: 1, "fara-date": 2 };
    return (Array.isArray(lista) ? lista.slice() : []).sort(function (a, b) {
      var ra = rang[a.stare] == null ? 2 : rang[a.stare], rb = rang[b.stare] == null ? 2 : rang[b.stare];
      if (ra !== rb) return ra - rb;
      if (a.stare === "evita") {
        var ma = a.regim ? Math.max(a.regim.r4h || 0, a.regim.r24h || 0) : 0, mb = b.regim ? Math.max(b.regim.r4h || 0, b.regim.r24h || 0) : 0;
        return mb - ma;
      }
      return (b.scor == null ? -Infinity : b.scor) - (a.scor == null ? -Infinity : a.scor);
    });
  }

  function rezumat(cl) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], r = { la: cl && cl.la || null, evita: 0, candidati: 0, faraDate: 0, total: m.length };
    m.forEach(function (x) { if (x.stare === "evita") r.evita++; else if (x.stare === "candidat") r.candidati++; else r.faraDate++; });
    return r;
  }

  return { judeca: judeca, ordoneaza: ordoneaza, rezumat: rezumat };
})();
if (typeof globalThis !== "undefined") globalThis.GridClasament = GridClasament;
