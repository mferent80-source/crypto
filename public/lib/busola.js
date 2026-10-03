// Busola în fișa gridului (v100.64, 02.10, I-491). Modul pur + o încărcare mică, probat în scripts/proba-busola.mjs.
// Singurul avantaj DOVEDIT al Busolei (busola.mferent80.workers.dev) e defensiv pe grid: după „mai agitat ca de obicei”
// (pe 4h) un grid a pierdut cel mai mult, după „mai calm” cel mai puțin — măsurat pe istorie nevăzută, 30 de monede.
// Fișa de grid nu vedea asta. Aici: rezumatul public al Busolei (~5 KB, CORS *), adus o dată la 30 de minute, și un rând
// în fișă. AVERTIZEAZĂ, nu refuză: pragul botului e privilegiul lui. Busola măsoară topul SPOT Pionex; o monedă de
// futures pe care n-o are se spune pe față („n-a măsurat”), nu se ghicește.
var Busola = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var URL_REZUMAT = "https://busola.mferent80.workers.dev/api/rezumat.json";
  var CACHE_MS = 30 * 60 * 1000, VECHI_MS = 6 * 3600 * 1000;
  var stare = { rez: null, la: 0, inLucru: null };

  // JTO_USDT_PERP -> JTO; 1000BONK_USDT_PERP -> BONK (pe spot nu există „1000”); ethusdt -> ETH
  function simbolBusola(s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$/, "").replace(/^1000+/, ""); }
  function proc(x) { return typeof x === "number" && isFinite(x) ? (x < 0 ? "−" : "+") + Math.abs(x * 100).toFixed(3).replace(".", ",") + "%" : "?"; }

  // {nivel, text, varsta, nota} sau null cand rezumatul inca lipseste
  function randGrid(rez, simbol, acum) {
    if (!rez || !rez.monede || !rez.grid) return null;
    var cheie = simbolBusola(simbol), m = rez.monede[cheie], g = rez.grid;
    var v = acum - Number(rez.la), varsta = v > VECHI_MS ? "măsurat acum " + cate(Math.round(v / 3600000), "oră", "ore") : null;
    // v100.79 (Busola 1.32, cerere de la el prin sesiunea Busolei): pe ce canal e cifra gridului (grid.canal, azi „±2×ATR”) - în nota
    // gri; la liniște și dacă „pierde mai puțin decât oricând” e dovedit (grid.dovedit privește DOAR liniștea). Nedovedit -> fraza nu mai
    // spune „cel mai puțin”. Rezumatul vechi (fără câmpuri) -> textele de până acum, fără notă.
    var canal = typeof g.canal === "string" && g.canal.trim() ? "grid pe " + g.canal.trim() : null;
    var nota = function (d) { return [canal, d].filter(Boolean).join(", ") || null; };
    if (!m) return { nivel: "nemasurat", text: "Busola n-a măsurat " + cheie + ": urmărește topul spot Pionex, nu futures.", varsta: varsta };
    // v100.67 (revizia): „nu-stiu” = măsurat, nimic neobișnuit; „nemasurat” sau lipsă pe 4h = Busola n-a putut măsura —
    // înainte, amândouă ieșeau „nimic neobișnuit”. Se ia prima valoare MĂSURATĂ (filtrul de grid, apoi harta).
    var masurat = function (v) { return v === "miscare" || v === "liniste" || v === "nu-stiu"; };
    // v100.85 (Busola 1.36, paza boților): futures-ul lichid are perp4h (doar monedele din afara hărții / topului spot) - citit întâi
    var s = masurat(m.perp4h) ? m.perp4h : masurat(m.grid4h) ? m.grid4h : masurat(m["4h"]) ? m["4h"] : null;
    if (!s) return { nivel: "nemasurat", text: "Busola n-a putut măsura " + cheie + " pe 4h acum (eroare sau prea puține cazuri).", varsta: varsta };
    if (s === "miscare") return { nivel: "atentie", text: "Busola, pe 4h: moneda e mai agitată ca de obicei — aici gridul a pierdut cel mai mult (" + proc(g.miscare) + " pe episod).", varsta: varsta, nota: nota(null) };
    if (s === "liniste" && g.dovedit === false) return { nivel: "info", text: "Busola, pe 4h: moneda e mai calmă ca de obicei — gridul a pierdut ceva mai puțin decât oricând (" + proc(g.liniste) + ").", varsta: varsta, nota: nota("nedovedit") };
    if (s === "liniste") return { nivel: "info", text: "Busola, pe 4h: moneda e mai calmă ca de obicei — aici gridul a pierdut cel mai puțin (" + proc(g.liniste) + "), tot pe minus.", varsta: varsta, nota: nota(g.dovedit === true ? "dovedit" : null) };
    return { nivel: "neutru", text: "Busola, pe 4h: nimic neobișnuit — un grid oarecare a ieșit pe minus (" + proc(g.oricand) + " pe episod).", varsta: varsta, nota: nota(null) };
  }

  // v100.79: nota (canalul, dovedit / nedovedit) și vârsta, gri, după frază
  function htmlRand(r, esc) {
    var cls = r.nivel === "atentie" ? "tbWarn" : "tbSub", sub = [r.nota, r.varsta].filter(Boolean).join(" · ");
    return '<div class="tbBloc grBusola"><p class="' + cls + '">' + esc(r.text) + (sub ? ' <span class="tbSub">· ' + esc(sub) + "</span>" : "") + "</p></div>";
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
