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
  // v100.86 (§2 „paza boților”): peste 4,5 h (Busola rulează la 4 h) colectorul nu mai anunță nimic din rezumat
  var PAZA_VECHI_MS = 4.5 * 3600 * 1000;
  var stare = { rez: null, la: 0, inLucru: null, esec: false };
  // v100.91 (ideea 3): bilanțul pazei Busolei (I-512) - după „mai agitat” pe futures, gridul chiar a pierdut mai mult? Pe pagină, la mișcare,
  // doar când verdictul e pe date destule („dovedit” / „pe dos” / „n-am aflat”); „prea puține” tace
  function bilantText(rez) { var v = rez && rez.perp && rez.perp.bilant && rez.perp.bilant.verdict; return ["dovedit", "pe dos", "n-am aflat"].indexOf(v) >= 0 ? "pe date noi: " + v : null; }

  // JTO_USDT_PERP -> JTO; 1000BONK_USDT_PERP -> BONK (pe spot nu există „1000”); ethusdt -> ETH
  function simbolBusola(s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$|\.PERP$/, "").replace(/^1000+/, ""); }   /* v100.90: + „AAVE.PERP” (baza botului) */
  function proc(x) { return typeof x === "number" && isFinite(x) ? (x < 0 ? "−" : "+") + Math.abs(x * 100).toFixed(3).replace(".", ",") + "%" : "?"; }
  // v100.86 (Busola 1.36, §2 „paza boților”): prima stare MĂSURATĂ pe 4h - futures-ul lichid (perp4h, doar monedele din afara
  // hărții / topului spot), filtrul de grid, harta; „nemasurat” sau lipsă -> null. Aceeași alegere în fișă și în colector.
  function masurat(v) { return v === "miscare" || v === "liniste" || v === "nu-stiu"; }
  function stare4h(m) { return !m ? null : masurat(m.perp4h) ? m.perp4h : masurat(m.grid4h) ? m.grid4h : masurat(m["4h"]) ? m["4h"] : null; }
  // „200.000” (mii cu punct)
  function mii(x) { return String(Math.round(Number(x))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  // v100.90 (Busola 1.37, I-511): boții sunt pe futures - când rezumatul are grid.futures (aceeași formă, cu comisionul real), cifrele
  // și dovada vin de acolo; altfel din grid (spot). „futures ±2×ATR” are aceeași lungime ca „grid pe ±2×ATR” (garda ține rândul la 160)
  function gridFolosit(rez) {
    var g = rez && rez.grid || {}, f = g.futures;
    // revizia: blocul se folosește doar ÎNTREG (Busola pune NaN pe un grup nemăsurat) - altfel fraza de liniște ar scrie „(?)”
    var ok = f && typeof f === "object" && ["miscare", "liniste", "oricand"].every(function (k) { return typeof f[k] === "number" && isFinite(f[k]); });
    return ok ? { g: f, futures: true } : { g: g, futures: false };
  }
  function canalText(gf) { var c = gf.g && typeof gf.g.canal === "string" && gf.g.canal.trim() ? gf.g.canal.trim() : null; return c ? (gf.futures ? "futures " : "grid pe ") + c : null; }
  // „8 h” / „30 min” / „2,5 h” - TextRo.ore; rezerva știe aceeași regulă (contextele fără TextRo)
  function ore(ms) { if (typeof TextRo !== "undefined" && TextRo.ore) return TextRo.ore(ms); if (typeof ms !== "number" || !isFinite(ms)) return "—"; var m = Math.round(ms / 60000); return m < 60 ? m + " min" : String(Math.round(ms / 360000) / 10).replace(".", ",") + " h"; }

  // {nivel, text, varsta, nota} sau null cand rezumatul inca lipseste
  function randGrid(rez, simbol, acum) {
    if (!rez || !rez.monede || !rez.grid) return null;
    var cheie = simbolBusola(simbol), m = rez.monede[cheie], gf = gridFolosit(rez), g = gf.g;
    var v = acum - Number(rez.la), varsta = v > VECHI_MS ? "măsurat acum " + cate(Math.round(v / 3600000), "oră", "ore") : null;
    // v100.79 (Busola 1.32, cerere de la el prin sesiunea Busolei): pe ce canal e cifra gridului (grid.canal, azi „±2×ATR”) - în nota
    // gri; la liniște și dacă „pierde mai puțin decât oricând” e dovedit (grid.dovedit privește DOAR liniștea). Nedovedit -> fraza nu mai
    // spune „cel mai puțin”. Rezumatul vechi (fără câmpuri) -> textele de până acum, fără notă.
    var canal = canalText(gf);
    var nota = function (d) { return [canal, d].filter(Boolean).join(", ") || null; };
    // v100.86 (paza boților): de la Busola 1.36 (blocul `perp`) măsoară și futures-ul lichid - o monedă lipsă e sub pragul de USDT pe zi
    if (!m) return { nivel: "nemasurat", text: rez.perp && Number(rez.perp.prag) > 0 ? "Busola nu măsoară " + cheie + ": pe futures urmărește doar monedele cu peste " + mii(rez.perp.prag) + " USDT pe zi." : "Busola n-a măsurat " + cheie + ": urmărește topul spot Pionex, nu futures.", varsta: varsta };
    // v100.67 (revizia): „nu-stiu” = măsurat, nimic neobișnuit; „nemasurat” sau lipsă pe 4h = Busola n-a putut măsura —
    // înainte, amândouă ieșeau „nimic neobișnuit”. Se ia prima valoare MĂSURATĂ (futures, filtrul de grid, apoi harta - stare4h).
    var s = stare4h(m);
    if (!s) return { nivel: "nemasurat", text: "Busola n-a putut măsura " + cheie + " pe 4h acum (eroare sau prea puține cazuri).", varsta: varsta };
    if (s === "miscare") return { nivel: "atentie", text: "Busola, pe 4h: moneda e mai agitată ca de obicei — aici gridul a pierdut cel mai mult (" + proc(g.miscare) + " pe episod).", varsta: varsta, nota: nota(bilantText(rez)) };
    if (s === "liniste" && g.dovedit === false) return { nivel: "info", text: "Busola, pe 4h: moneda e mai calmă ca de obicei — gridul a pierdut ceva mai puțin decât oricând (" + proc(g.liniste) + ").", varsta: varsta, nota: nota("nedovedit") };
    if (s === "liniste") return { nivel: "info", text: "Busola, pe 4h: moneda e mai calmă ca de obicei — aici gridul a pierdut cel mai puțin (" + proc(g.liniste) + "), tot pe minus.", varsta: varsta, nota: nota(g.dovedit === true ? "dovedit" : null) };
    return { nivel: "neutru", text: "Busola, pe 4h: nimic neobișnuit — un grid oarecare a ieșit pe minus (" + proc(g.oricand) + " pe episod).", varsta: varsta, nota: nota(null) };
  }

  // v100.86 (§2 „paza boților”, colectorul): starea monedei botului și dacă rezumatul e prea vechi ca să anunțe ceva
  // (peste 4,5 h sau fără `la` -> vechi: nicio alertă). null cât rezumatul lipsește (ca fișa).
  function pazaStare(rez, simbol, acum) {
    if (!rez || !rez.monede || !rez.grid) return null;
    var cheie = simbolBusola(simbol), v = acum - Number(rez.la);
    return { cheie: cheie, stare: stare4h(rez.monede[cheie]), vechi: !(v <= PAZA_VECHI_MS), la: Number(rez.la) };
  }
  // cifra din mesajul de mișcare: „−0,214% pe episod, grid pe ±2×ATR, dovedit”. Dovada DOAR din grid.miscareDovedita
  // (Busola 1.34, I-506; grid.dovedit privește liniștea); ce lipsește (rezumat vechi) se lasă afară, nimic inventat.
  function cifraMiscare(rez) {
    var gf = gridFolosit(rez), g = gf.g, d = g.miscareDovedita === true ? "dovedit" : g.miscareDovedita === false ? "nedovedit" : null;
    return [typeof g.miscare === "number" && isFinite(g.miscare) ? proc(g.miscare) + " pe episod" : null, canalText(gf), d].filter(Boolean).join(", ");
  }
  // v100.90 (I-514, Busola 1.38): intervalul măsurat de Busola pe 4h, sub propunerea fișei - pentru comparație, nu în locul ei.
  // Prețurile fișei sunt în unitățile SURSEI (revizia 1.40.1): `fisa4h.simbol` (ex. „1000PEPE”) sau cheia; un bot pe „1000X” cu fișa
  // fără „1000” ⇒ ×1000, invers ⇒ ÷1000 (6 cifre semnificative). pret = formatatorul fișei (grPret); lipsă ⇒ null, nimic inventat
  function randFisa(rez, simbol, acum, pret) {
    if (!rez || !rez.monede || !rez.grid) return null;
    var cheie = simbolBusola(simbol), m = rez.monede[cheie], f = m && m.fisa4h, g = rez.grid, P = typeof pret === "function" ? pret : String;
    if (!f || !(f.jos > 0) || !(f.sus > f.jos) || !(f.linii >= 2)) return null;
    var baza = String(simbol || "").toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$|\.PERP$/, ""), sursa = typeof f.simbol === "string" && f.simbol ? f.simbol.toUpperCase() : cheie;
    // multiplicatorul se CITEȘTE („1000”, „1000000”), nu se presupune 1000 (revizia)
    var mult = function (s) { var m = /^(1(?:000)+)(?=[A-Z])/.exec(s); return m ? Number(m[1]) : 1; }, factor = mult(baza) / mult(sursa);
    var r6 = function (x) { return +Number(x * factor).toPrecision(6); }, jos = r6(f.jos), sus = r6(f.sus), linii = Math.round(f.linii);
    var ora = Number(g.fisa4hLa) > 0 ? new Date(Number(g.fisa4hLa)).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : null;
    var det = ["4h", typeof g.canal4h === "string" && g.canal4h.trim() ? g.canal4h.trim() : null, ora ? "la prețul de la " + ora : null].filter(Boolean).join(", ");
    var v = acum - Number(rez.la), vechi = v > VECHI_MS ? " · măsurat acum " + ore(v) : "";   /* rezumatul vechi își spune vârsta, ca rândul de mișcare */
    return { jos: jos, sus: sus, linii: linii, factor: factor, text: "Busola, măsurat (" + det + "): jos " + P(jos) + " · sus " + P(sus) + " · " + cate(linii, "linie", "linii") + vechi };
  }
  // v100.90 (I-513): eticheta de pe cartela botului - starea Busolei pe moneda lui (perp4h ?? grid4h ?? 4h), de când e în ea
  // („de” îl ține colectorul, prin ruta `paza`) și cât de vechi e rezumatul. null cât rezumatul lipsește
  var TEXT_STARE = { miscare: ["atentie", "mai agitată ca de obicei"], liniste: ["info", "mai calmă ca de obicei"], "nu-stiu": ["neutru", "nimic neobișnuit"] };
  // kv = { stare, de } de la colector (ruta `paza`): „de N h” DOAR când starea lui e aceeași cu cea de aici (cele două rezumate pot fi
  // defazate ~30 min); „de” necunoscut (prima vedere a monedei) ⇒ fără durată. „nu urmărește” (moneda lipsește) ≠ „n-a putut măsura”
  function eticheta(rez, simbol, acum, kv) {
    var p = pazaStare(rez, simbol, acum); if (!p) return null;
    var t = TEXT_STARE[p.stare] || ["nemasurat", rez.monede[p.cheie] ? "n-a putut măsura moneda" : "nu urmărește moneda"];
    var d = kv && typeof kv === "object" && kv.stare === p.stare ? Number(kv.de) : NaN;
    return { stare: p.stare, nivel: t[0], text: t[1], nota: [d > 0 && acum - d >= 0 ? "de " + ore(acum - d) : null, "măsurat acum " + ore(acum - p.la), p.stare === "miscare" ? bilantText(rez) : null].filter(Boolean).join(" · ") };
  }
  // rândul boților deschiși (portofoliu + rezumatul de dimineață): „AAVE mai agitată de 8 h · LIT mai calmă de 2,5 h · PUMP nimic neobișnuit”;
  // peste 145 de semne (raportul ține 160, cu „Busola, pe 4h: ” în față) cad duratele, apoi coada devine „+N” - niciun bot pierdut pe tăcute
  var SCURT_STARE = { miscare: "mai agitată", liniste: "mai calmă", "nu-stiu": "nimic neobișnuit" };
  function liniaBoti(lista, acum, max) {
    var l = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && x.nume; }); if (!l.length) return null;
    // v100.91: implicit 142 = 160 − „🧭 Busola, pe 4h: ” (18); colectorul scade și coada cu vârsta rezumatului
    var MAX = Number(max) > 0 ? Number(max) : 142, unu = function (x, cuDurata) { var d = Number(x.de); return x.nume + " " + (SCURT_STARE[x.stare] || "nemăsurată") + (cuDurata && d > 0 && acum - d >= 0 ? " de " + ore(acum - d) : ""); };
    var t = l.map(function (x) { return unu(x, true); }).join(" · "); if (t.length <= MAX) return t;
    var p = l.map(function (x) { return unu(x, false); }); t = p.join(" · "); if (t.length <= MAX) return t;
    for (var n = p.length - 1; n >= 1; n--) { t = p.slice(0, n).join(" · ") + " · +" + (p.length - n); if (t.length <= MAX) return t; }
    return p[0].slice(0, MAX - 6) + " · +" + (p.length - 1);
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
      .then(function (j) { stare.rez = j; stare.esec = false; return true; }, function () { stare.esec = true; return false; })
      .then(function (nou) { stare.la = acum; stare.inLucru = null; return nou; });
    return stare.inLucru;
  }

  function rezumat() { return stare.rez; }
  // v100.91 (ideea 2): ultima încărcare a picat și n-avem niciun rezumat - cartela spune „Busola nu răspunde”, nu „aștept rezumatul…” la nesfârșit
  function nuRaspunde() { return !stare.rez && stare.esec === true; }
  function _reset() { stare = { rez: null, la: 0, inLucru: null, esec: false }; }

  return { URL_REZUMAT: URL_REZUMAT, PAZA_VECHI_MS: PAZA_VECHI_MS, simbolBusola: simbolBusola, randGrid: randGrid, htmlRand: htmlRand, pazaStare: pazaStare, cifraMiscare: cifraMiscare,
    randFisa: randFisa, eticheta: eticheta, liniaBoti: liniaBoti, incarca: incarca, rezumat: rezumat, nuRaspunde: nuRaspunde, _reset: _reset };
})();
if (typeof globalThis !== "undefined") globalThis.Busola = Busola;
