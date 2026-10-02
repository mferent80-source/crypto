// Busola în fișa gridului (v100.64, 02.10, I-491). Modul pur + o încărcare mică, probat în scripts/proba-busola.mjs.
// Singurul avantaj DOVEDIT al Busolei (busola.mferent80.workers.dev) e defensiv pe grid: după „mai agitat ca de obicei”
// (pe 4h) un grid a pierdut cel mai mult, după „mai calm” cel mai puțin — măsurat pe istorie nevăzută, 30 de monede.
// Fișa de grid nu vedea asta. Aici: rezumatul public al Busolei (~5 KB, CORS *), adus o dată la 30 de minute, și un rând
// în fișă. AVERTIZEAZĂ, nu refuză: pragul botului e privilegiul lui. Busola măsoară topul SPOT Pionex; o monedă de
// futures pe care n-o are se spune pe față („n-a măsurat”), nu se ghicește.
var Busola = (function () {
  "use strict";
  var URL_REZUMAT = "https://busola.mferent80.workers.dev/api/rezumat.json";
  var CACHE_MS = 30 * 60 * 1000, VECHI_MS = 6 * 3600 * 1000;
  var stare = { rez: null, la: 0, inLucru: null };

  // JTO_USDT_PERP -> JTO; 1000BONK_USDT_PERP -> BONK (pe spot nu există „1000”); ethusdt -> ETH
  function simbolBusola(s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$/, "").replace(/^1000+/, ""); }
  function proc(x) { return typeof x === "number" && isFinite(x) ? (x < 0 ? "−" : "+") + Math.abs(x * 100).toFixed(3).replace(".", ",") + "%" : "?"; }

  // {nivel, text, varsta} sau null cand rezumatul inca lipseste
  function randGrid(rez, simbol, acum) {
    if (!rez || !rez.monede || !rez.grid) return null;
    var cheie = simbolBusola(simbol), m = rez.monede[cheie], g = rez.grid;
    var v = acum - Number(rez.la), varsta = v > VECHI_MS ? "măsurat acum " + Math.round(v / 3600000) + " ore" : null;
    if (!m) return { nivel: "nemasurat", text: "Busola n-a măsurat " + cheie + ": urmărește topul spot Pionex, nu futures.", varsta: varsta };
    // v100.67 (revizia): „nu-stiu” = măsurat, nimic neobișnuit; „nemasurat” sau lipsă pe 4h = Busola n-a putut măsura —
    // înainte, amândouă ieșeau „nimic neobișnuit”. Se ia prima valoare MĂSURATĂ (filtrul de grid, apoi harta).
    var masurat = function (v) { return v === "miscare" || v === "liniste" || v === "nu-stiu"; };
    var s = masurat(m.grid4h) ? m.grid4h : masurat(m["4h"]) ? m["4h"] : null;
    if (!s) return { nivel: "nemasurat", text: "Busola n-a putut măsura " + cheie + " pe 4h acum (eroare sau prea puține cazuri).", varsta: varsta };
    if (s === "miscare") return { nivel: "atentie", text: "Busola, pe 4h: moneda e mai agitată ca de obicei — aici gridul a pierdut cel mai mult (" + proc(g.miscare) + " pe episod).", varsta: varsta };
    if (s === "liniste") return { nivel: "info", text: "Busola, pe 4h: moneda e mai calmă ca de obicei — aici gridul a pierdut cel mai puțin (" + proc(g.liniste) + "), tot pe minus.", varsta: varsta };
    return { nivel: "neutru", text: "Busola, pe 4h: nimic neobișnuit — un grid oarecare a ieșit pe minus (" + proc(g.oricand) + " pe episod).", varsta: varsta };
  }

  function htmlRand(r, esc) {
    var cls = r.nivel === "atentie" ? "tbWarn" : "tbSub";
    return '<div class="tbBloc grBusola"><p class="' + cls + '">' + esc(r.text) + (r.varsta ? ' <span class="tbSub">· ' + esc(r.varsta) + "</span>" : "") + "</p></div>";
  }

  // true = au venit date noi (fișa se redesenează o dată); false = din cache sau Busola n-a răspuns (fără buclă)
  // v100.67 (revizia): cât cererea e în curs, ceilalți chemători primesc false — altfel fiecare desen adăuga încă o
  // redesenare la sosire. Cererea are limită de timp: o Busolă agățată nu mai blochează reîmprospătarea.
  function incarca(fetchFn, acum) {
    if (stare.inLucru) return stare.inLucru.then(function () { return false; });
    if (stare.la && acum - stare.la < CACHE_MS) return Promise.resolve(false);
    stare.inLucru = Promise.resolve()
      .then(function () { return fetchFn(URL_REZUMAT, { signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined }); })
      .then(function (r) { if (!r || !r.ok) throw new Error("HTTP " + (r && r.status)); return r.json(); })
      .then(function (j) { stare.rez = j; return true; }, function () { return false; })
      .then(function (nou) { stare.la = acum; stare.inLucru = null; return nou; });
    return stare.inLucru;
  }

  function rezumat() { return stare.rez; }
  function _reset() { stare = { rez: null, la: 0, inLucru: null }; }

  return { URL_REZUMAT: URL_REZUMAT, simbolBusola: simbolBusola, randGrid: randGrid, htmlRand: htmlRand, incarca: incarca, rezumat: rezumat, _reset: _reset };
})();
if (typeof globalThis !== "undefined") globalThis.Busola = Busola;
