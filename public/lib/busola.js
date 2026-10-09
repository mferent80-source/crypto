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
  // v100.92 (I-522 / I-523): ce primesc verdictul (semaforul) și Consiliul de la Busola - starea monedei pe 4h și bilanțul pazei (I-512:
  // verdict, diferența „mișcare − oricând” pe date noi, monedele). Rezumatul vechi (> 4,5 h), lipsă sau moneda neurmărită ⇒ null:
  // un verdict nu se sprijină pe o măsurătoare veche. Pragul e tot al botului - semaforul doar avertizează, și doar pe „dovedit”
  function pentruVerdict(rez, simbol, acum) {
    var p = pazaStare(rez, simbol, acum); if (!p || p.vechi || !p.stare) return null;
    var b = rez.perp && rez.perp.bilant && typeof rez.perp.bilant === "object" ? rez.perp.bilant : null;
    return { stare: p.stare, bilant: b ? { verdict: String(b.verdict || ""), dif: typeof b.dif === "number" && isFinite(b.dif) ? b.dif : null, monede: Number(b.monede) || 0 } : null };
  }
  // cifra din mesajul de mișcare: „−0,214% pe episod, grid pe ±2×ATR, dovedit”. Dovada DOAR din grid.miscareDovedita
  // (Busola 1.34, I-506; grid.dovedit privește liniștea); ce lipsește (rezumat vechi) se lasă afară, nimic inventat.
  function cifraMiscare(rez) {
    var gf = gridFolosit(rez), g = gf.g, d = g.miscareDovedita === true ? "dovedit" : g.miscareDovedita === false ? "nedovedit" : null;
    return [typeof g.miscare === "number" && isFinite(g.miscare) ? proc(g.miscare) + " pe episod" : null, canalText(gf), d].filter(Boolean).join(", ");
  }
  // v100.92 (I-524): propunerea fișei (sau gridul botului) față de intervalul Busolei - cât de larg e, în procente; ±10% = cam la fel.
  // Intervalul Busolei e cel care a pierdut cel mai puțin în cutia ei sigilată (I-505: +4,2/−3,9 ATR față de ±2×ATR), măsurat pe SPOT -
  // scopul se spune pe față („pe spot”); boții lui sunt pe futures (I-511 a arătat că pe futures pierde la fel). Nimic ce Busola n-a dovedit
  function comparaInterval(fisa, jos, sus) {
    var fj = fisa && Number(fisa.jos), fs = fisa && Number(fisa.sus), j = Number(jos), s = Number(sus);
    if (!(fj > 0) || !(fs > fj) || !(j > 0) || !(s > j)) return null;
    var r = (s - j) / (fs - fj) - 1, p = Math.round(Math.abs(r) * 100), d = " decât al Busolei (al ei a pierdut cel mai puțin, pe spot)";
    return { raport: r, text: p <= 10 ? "intervalul tău e cam la fel de larg ca al Busolei" : "intervalul tău e cu " + p + "% mai " + (r < 0 ? "îngust" : "larg") + d };
  }
  // v100.90 (I-514, Busola 1.38): intervalul măsurat de Busola pe 4h, sub propunerea fișei - pentru comparație, nu în locul ei.
  // Prețurile fișei sunt în unitățile SURSEI (revizia 1.40.1): `fisa4h.simbol` (ex. „1000PEPE”) sau cheia; un bot pe „1000X” cu fișa
  // fără „1000” ⇒ ×1000, invers ⇒ ÷1000 (6 cifre semnificative). pret = formatatorul fișei (grPret); lipsă ⇒ null, nimic inventat
  function randFisa(rez, simbol, acum, pret, prop) {
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
    var scurt = "jos " + P(jos) + " · sus " + P(sus) + " · " + cate(linii, "linie", "linii"), c = prop && typeof prop === "object" ? comparaInterval({ jos: jos, sus: sus }, prop.jos, prop.sus) : null;   /* v100.92 (I-524): propunerea, în unitățile botului */
    return { jos: jos, sus: sus, linii: linii, factor: factor, scurt: scurt, comparatie: c ? c.text : null, raport: c ? c.raport : null, text: "Busola, măsurat (" + det + "): " + scurt + vechi };
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

  // v100.92 (I-518): UN singur producător pentru tot ce spune Busola despre o monedă - eticheta (starea, de când, cât de vechi), intervalul
  // ei (cu propunerea fișei sau gridul botului față de el) și rândul scurt (dimineața, portofoliul). Fișa, Tabloul și Acasă desenează
  // aceeași cartelă; o = { kv (ruta paza), pret (formatatorul fișei), prop {jos, sus} }. null cât rezumatul lipsește
  function cartela(rez, simbol, acum, o) {
    o = o && typeof o === "object" ? o : {};
    var e = eticheta(rez, simbol, acum, o.kv); if (!e) return null;
    var f = randFisa(rez, simbol, acum, o.pret, o.prop && typeof o.prop === "object" ? o.prop : null);
    var d = o.kv && typeof o.kv === "object" && o.kv.stare === e.stare ? Number(o.kv.de) : NaN;
    return { eticheta: e, interval: f, rand: liniaBoti([{ nume: simbolBusola(simbol), stare: e.stare, de: d > 0 ? d : null }], acum) };
  }
  // cartela în forma Tabloului (rânduri tbLinie): starea cu nota și culoarea ei, intervalul Busolei cu comparația (mai îngust = atenție)
  function htmlCartela(c, esc) {
    if (!c || !c.eticheta) return "";
    var E = typeof esc === "function" ? esc : String, e = c.eticheta, f = c.interval;
    var h = '<div class="tbLinie"><span>Busola, pe 4h' + (e.nota ? ' <span class="tbSub">' + E(e.nota) + '</span>' : '') + '</span><b class="' + (e.nivel === "atentie" ? "tbWarn" : e.nivel === "nemasurat" ? "tbSubVal" : "") + '">' + E(e.text) + '</b></div>';
    if (f) h += '<div class="tbLinie"><span>Intervalul Busolei (4h)' + (f.comparatie ? ' <span class="' + (f.raport < -0.1 ? "tbWarn" : "tbSub") + '">' + E(f.comparatie) + '</span>' : '') + '</span><b>' + E(f.scurt) + '</b></div>';
    return h;
  }

  // v100.147 (el, 09.10: „integrează mai mult Busola și verdictul din ea în pagina botului, la ce spune piața acum” - toate trei):
  // rezumatul Busolei 1.47.0 aduce directie4h și pe futures (celula pazei), verdict4h (cifra de pe capul Busolei) și btc.h24 + corBtc
  // (cifrele sugestiei orare). Trei rânduri pentru „Ce spune piața acum”; rezumatul vechi își spune vârsta, ce lipsește e spus
  // revizia Opus: Busola însăși scrie „(nedovedită)” lângă direcție (sugestia orară) - ea NU prezice direcția; aici la fel
  var TEXT_DIR = { "inclinat-long": "înclinată spre long (nedovedită)", "inclinat-short": "înclinată spre short (nedovedită)", asteapta: "așteaptă (nu s-a dovedit o direcție)" };
  var GR_DIR = { urca: "urcă", coboara: "coboară" };
  function varstaText(rez, acum) { var v = acum - Number(rez.la); return v > VECHI_MS ? "măsurat acum " + ore(v) : null; }
  function botDir(o) { var b = String(o && o.bot || "").toUpperCase(); return b === "LONG" ? "long" : b === "SHORT" ? "short" : null; }
  // „Direcția, după Busola”: verdictul ei de direcție pe 4h (cu comision) față de botul lui și de graficul pe 4h (semaforul Radarului
  // pe același orizont - revizia Opus: rândul „Direcția” al citirii nu există când semaforul e listă; o = { bot: "LONG"|"SHORT"|…,
  // grafic: "urca"|"coboara"|"lateral"|null }). Fără verdict pe monedă ⇒ nivel „nemasurat”, spus; moneda neurmărită ⇒ null (rândul
  // stării o spune deja). Culoarea doar ca avertizare (invers față de bot), nu ca laudă: direcția e nedovedită
  // v100.149 (I-580): o.interval = "1h" ⇒ directie1h (gridurile pe 5m/15m); pe 1h graficul pe 4h NU se compară (alt orizont)
  function randDirectie(rez, simbol, acum, o) {
    if (!rez || !rez.monede) return null;
    var pe1h = o && o.interval === "1h", cheie = simbolBusola(simbol), m = rez.monede[cheie], d = m && (pe1h ? m.directie1h : m.directie4h), varsta = varstaText(rez, acum);
    if (!m) return null;
    if (!d || !TEXT_DIR[d]) return { nivel: "nemasurat", semn: null, text: pe1h ? "Busola n-a judecat direcția pe 1h pe moneda asta" : rez.btc ? "Busola n-a judecat direcția pe moneda asta" : "Busola n-a trimis încă direcția pe moneda asta (rezumat de dinainte de 1.47)", varsta: varsta };
    var b = botDir(o), g = !pe1h && o && GR_DIR[o.grafic] ? o.grafic : !pe1h && o && o.grafic === "lateral" ? "lateral" : null, p = [TEXT_DIR[d]], nivel = "info";
    if (d === "asteapta") { if (g) p.push(g === "lateral" ? "graficul pe 4h e lateral" : "graficul pe 4h " + GR_DIR[g] + ", Busola nu confirmă o direcție"); }
    else {
      var dB = d === "inclinat-long" ? "long" : "short";
      if (b) { if (b === dB) p.push("ca botul tău (" + b + ")"); else { p.push("invers față de botul tău (" + b + ")"); nivel = "atentie"; } }
      if (g) p.push(g === "lateral" ? "graficul pe 4h e lateral" : (g === "urca") === (dB === "long") ? "graficul pe 4h spune la fel (" + GR_DIR[g] + ")" : "graficul pe 4h spune invers (" + GR_DIR[g] + ")");
    }
    if (varsta) p.push(varsta);
    return { nivel: nivel, semn: d, text: p.join(" · "), varsta: varsta };
  }
  // „Cifra Busolei”: „73 din 100 ating ținta înaintea stopului, pe long · de obicei 61 · minim 56 ca să nu pierzi” - exact cifra de pe
  // capul Busolei (cifraVerdict), cu nota ei; „tot iese mai des decât stă” = cifra singură ar păcăli ⇒ atenție. Lipsă (futures) ⇒ null
  // revizia Opus: „ating ținta înaintea stopului” e despre ținta și stopul BUSOLEI (nu ale botului) - spus; pe un bot „1000X” canalul
  // Busolei e în prețul spot (÷1000 față de grafic) ⇒ cifrele canalului ies, rămâne „canalul Busolei (pe spot)”
  function randVerdict(rez, simbol, acum, o) {
    if (!rez || !rez.monede) return null;
    var pe1h = o && o.interval === "1h", m = rez.monede[simbolBusola(simbol)], c = m && (pe1h ? m.verdict1h : m.verdict4h);   /* v100.149 (I-580) */
    if (!c || !(c.cate >= 1) || !(c.deObicei >= 1) || !c.ce) return null;
    var baza = String(simbol || "").toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$|\.PERP$/, ""), ce = String(c.ce);
    if (/^ating ținta/.test(ce)) ce += " (ținta și stopul Busolei, pe " + (pe1h ? "1h" : "4h") + ")";
    if (/^(1(?:000)+)(?=[A-Z])/.test(baza)) ce = ce.replace(/canalul \S+ în/, "canalul Busolei (pe spot) în");
    var nota = typeof c.nota === "string" && c.nota ? c.nota : c.cate === c.deObicei ? "cât de obicei" : null, varsta = varstaText(rez, acum);
    return { nivel: /mai des decât stă/.test(nota || "") ? "atentie" : "info", cate: c.cate, deObicei: c.deObicei,
      text: [c.cate + " din 100 " + ce, "de obicei " + c.deObicei, nota, varsta].filter(Boolean).join(" · "), varsta: varsta };
  }
  // „BTC și botul tău”: BTC pe 24 h (fapt), cât de strâns merge moneda cu BTC (corelația pe 4h, 30 de zile: ≥ 0,6 DA · ≥ 0,3 PARȚIAL ·
  // altfel NU) și, CONDIȚIONAT, CU / CONTRA pentru botul lui - aceleași praguri ca sugestia orară a Busolei (sugestie.ts). Busola NU
  // prezice direcția. Fără blocul btc (rezumat 1.46) ⇒ null; h24 null ⇒ „necunoscut”, nu 0
  // revizia Opus: corelația cu O zecimală (regula lui); pe un bot BTC nu se scrie „BTC merge cu BTC”; CU nu se colorează (ar presupune
  // că mișcarea continuă = prezicere), CONTRA e galben doar când legătura e strânsă (DA); botul neutru primește fraza Busolei
  function randBtc(rez, simbol, acum, o) {
    if (!rez || !rez.monede || !rez.btc || typeof rez.btc !== "object") return null;
    var cheie = simbolBusola(simbol), m = rez.monede[cheie], h = rez.btc.h24, eBtc = cheie === "BTC", cor = eBtc ? 1 : m && typeof m.corBtc === "number" && isFinite(m.corBtc) ? m.corBtc : null;
    var pct = function (x) { return Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }, zec = function (x) { return x.toFixed(1).replace(".", ","); };
    var h24 = typeof h === "number" && isFinite(h) ? h : null, peLoc = h24 !== null && Math.abs(h24) < 0.005, urca = h24 !== null && h24 > 0;
    var p = [h24 === null ? "BTC pe 24 h necunoscut" : peLoc ? "BTC aproape pe loc în 24 h" : "BTC a " + (urca ? "urcat " : "coborât ") + pct(h24) + " în 24 h"], nivel = "info";
    if (eBtc) { /* botul e chiar pe BTC: legătura e de la sine */ }
    else if (cor === null) p.push("legătura " + cheie + "–BTC nemăsurată");
    else if (cor >= 0.6) p.push(cheie + " merge cu BTC: DA (" + zec(cor) + ")");
    else if (cor >= 0.3) p.push(cheie + " merge cu BTC: PARȚIAL (" + zec(cor) + ")");
    else p.push(cheie + " merge cu BTC: NU (" + zec(cor) + "), BTC nu-l prea mișcă");
    var b = botDir(o), neutru = /^NEUTRAL$|^NEUTRU$/i.test(String(o && o.bot || ""));
    if (cor !== null && cor >= 0.3 && h24 !== null) {
      if (neutru) p.push("botul neutru nu ține cu niciun sens: contează cât de tare se mișcă BTC");
      else if (b && peLoc) p.push("botul tău " + b + " e CU dacă BTC " + (b === "long" ? "urcă, CONTRA dacă coboară" : "coboară, CONTRA dacă urcă"));
      else if (b) { var cu = urca === (b === "long"); p.push("dacă BTC " + (urca ? "urcă" : "coboară") + " mai departe, botul tău " + b + " e " + (cu ? "CU" : "CONTRA")); if (!cu && cor >= 0.6) nivel = "atentie"; }
    }
    var varsta = varstaText(rez, acum); if (varsta) p.push(varsta);
    return { nivel: nivel, h24: h24, cor: cor, text: p.join(" · "), varsta: varsta };
  }

  // v100.148 (I-571, el 09.10: „ce mai putem adăuga să dea plus valoare?”): cele trei voci ale citirii - graficul pe 4h (semaforul),
  // Busola (direcția ei, nedovedită) și Monte Carlo (felul lui) - adunate într-o frază: „spun la fel: cu / contra botului tău” sau
  // „se contrazic: …”. Doar din ce e deja socotit; galben ca AVERTIZARE (contra, sau se contrazic), niciodată un verdict nou
  // revizia Opus: semnul Monte Carlo e „bun / rău PENTRU BOT” (nu „în sus / în jos”) ⇒ intră direct la cu / contra (`peBot`); „bine” cu
  // planul atins înseamnă „încasează”, nu „aș ține” (o.mcAtins); Busola poartă „(nedovedit)” și în numele din frază
  var MC_VOCE = { bine: ["Monte Carlo aș ține", 1], rau: ["Monte Carlo aș opri", -1], atentie: ["Monte Carlo la limită", 0] };
  function concluzie(o) {
    o = o && typeof o === "object" ? o : {};
    var b = botDir(o), voci = [], g = o.grafic, d = o.busola, m = MC_VOCE[o.mc];
    if (GR_DIR[g] || g === "lateral") voci.push({ nume: "Graficul pe 4h", text: g === "lateral" ? "graficul pe 4h e lateral" : "graficul pe 4h " + GR_DIR[g], semn: g === "urca" ? 1 : g === "coboara" ? -1 : 0 });
    if (TEXT_DIR[d]) voci.push({ nume: "Busola (nedovedit)", text: d === "asteapta" ? "Busola așteaptă" : "Busola înclină " + (d === "inclinat-long" ? "long" : "short") + " (nedovedit)", semn: d === "inclinat-long" ? 1 : d === "inclinat-short" ? -1 : 0 });
    if (m) voci.push({ nume: "Monte Carlo", text: o.mcAtins && o.mc === "bine" ? "Monte Carlo planul atins (încasează)" : m[0], semn: m[1], peBot: true });
    if (!voci.length) return null;
    var lista = voci.map(function (v) { return v.text; }).join(" · ");
    if (!b) return { nivel: "info", text: "Vocile: " + lista };
    var cu = [], contra = [], zero = [];
    voci.forEach(function (v) { if (!v.semn) zero.push(v); else if (v.peBot ? v.semn > 0 : (v.semn > 0) === (b === "long")) cu.push(v); else contra.push(v); });
    if (cu.length && contra.length) return { nivel: "atentie", text: "Vocile se contrazic: " + lista };
    if (!cu.length && !contra.length) return { nivel: "info", text: "Vocile: " + lista };
    var luate = cu.length ? cu : contra, nume = luate.map(function (v) { return v.nume; }), cine = nume.length > 1 ? nume.slice(0, -1).join(", ") + " și " + nume[nume.length - 1] : nume[0];
    var text = cine + (luate.length > 1 ? " spun la fel: " : " spune: ") + (cu.length ? "cu botul tău (" + b + ")" : "contra botului tău (" + b + ")") + (zero.length ? " · " + zero.map(function (v) { return v.text; }).join(" · ") : "");
    return { nivel: contra.length ? "atentie" : "info", text: text };
  }
  // v100.148 (I-576): starea Busolei pe 1h și 1z (rezumatul le are pe cele 30 de monede ale ei), lângă cea pe 4h; pe futures nimic
  var SCURT_IV = { miscare: "mai agitată", liniste: "mai calmă", "nu-stiu": "nimic neobișnuit", nemasurat: "nemăsurată" };
  function alteIntervale(rez, simbol) {
    if (!rez || !rez.monede) return null;
    var m = rez.monede[simbolBusola(simbol)]; if (!m) return null;
    var p = ["1h", "1z"].filter(function (k) { return SCURT_IV[m[k]]; }).map(function (k) { return "pe " + k + " " + SCURT_IV[m[k]]; });
    return p.length ? p.join(" · ") : null;
  }
  // v100.148 (I-575): rândul de dimineață - boții deschiși față de BTC („MET short CU (0,7) · NIL long CONTRA (0,5) · PONS nemăsurat”);
  // lista = [{ nume, cheie, directie }]; fără blocul btc sau fără boți ⇒ null
  // revizia Opus: ca randBtc - botul pe BTC are legătura de la sine; CU / CONTRA doar la legătura DA (≥ 0,6) și condiționat („dacă
  // continuă”); legătura parțială se spune ca atare; botul fără cheie se sare; plafon de lungime (raportul ține 160) cu coada „+N”
  function liniaBtc(rez, lista, acum, max) {
    if (!rez || !rez.monede || !rez.btc || typeof rez.btc !== "object" || !Array.isArray(lista)) return null;
    var h = rez.btc.h24, h24 = typeof h === "number" && isFinite(h) ? h : null, peLoc = h24 !== null && Math.abs(h24) < 0.005, urca = h24 !== null && h24 > 0;
    var pct = function (x) { return Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }, zec = function (x) { return x.toFixed(1).replace(".", ","); };
    var conditionat = h24 !== null && !peLoc;
    var cap = h24 === null ? "BTC pe 24 h necunoscut" : peLoc ? "BTC aproape pe loc în 24 h" : "BTC a " + (urca ? "urcat " : "coborât ") + pct(h24) + " în 24 h, dacă continuă";
    var p = lista.filter(function (x) { return x && simbolBusola(x.cheie || x.nume); }).map(function (x) {
      var cheie = simbolBusola(x.cheie || x.nume), m = rez.monede[cheie], eBtc = cheie === "BTC", cor = eBtc ? 1 : m && typeof m.corBtc === "number" && isFinite(m.corBtc) ? m.corBtc : null, b = botDir({ bot: x.directie }), nume = String(x.nume || cheie) + (b ? " " + b : "");
      if (cor === null) return nume + " nemăsurat";
      if (cor < 0.3) return nume + " independent (" + zec(cor) + ")";
      if (cor < 0.6) return nume + " parțial cu BTC (" + zec(cor) + ")";
      if (!conditionat || !b) return nume + (eBtc ? "" : " merge cu BTC: DA (" + zec(cor) + ")");
      return nume + " " + (urca === (b === "long") ? "CU" : "CONTRA") + (eBtc ? "" : " (" + zec(cor) + ")");
    });
    if (!p.length) return null;
    var varsta = varstaText(rez, acum), coada = varsta ? " · " + varsta : "", MAX = Number(max) > 0 ? Number(max) : 142;
    var t = [cap].concat(p).join(" · ");
    for (var k = p.length - 1; t.length + coada.length > MAX && k >= 1; k--) t = [cap].concat(p.slice(0, k)).join(" · ") + " · +" + (p.length - k);
    return t + coada;
  }

  // v100.149 (I-582): adresa cu stare a Busolei (folosesteAdresa.ts: ?sym= fără USDT e completat acolo; pe spot nu există „1000X”)
  var URL_BUSOLA = "https://busola.mferent80.workers.dev/";
  function linkBusola(simbol, interval) { var c = simbolBusola(simbol); return c ? URL_BUSOLA + "?sym=" + encodeURIComponent(c) + "&interval=" + encodeURIComponent(interval || "4h") : null; }
  // v100.149 (I-577): bilanțul jurnalului vocilor - contrazicerile judecate după 24 h (dupa.pretDir: 1 / −1 / 0 = pe loc); „dreptate” =
  // vocea a arătat încotro a mers prețul (Monte Carlo: bun/rău PENTRU BOT ⇒ pe short semnul se întoarce). Statistică, nu semnal; sub 10 = prea puține
  function bilantVoci(lista, acum, zile) {
    var Z = (zile > 0 ? zile : 30) * 86400000, l = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && x.contrazic && x.dupa && typeof x.dupa.pretDir === "number" && x.semne && acum - Number(x.la) <= Z; });
    if (!l.length) return null;
    var g = 0, b = 0, m = 0;
    l.forEach(function (x) { var p = x.dupa.pretDir, s = x.semne, bot = String(x.dir || "").toLowerCase(); if (s.grafic && s.grafic === p) g++; if (s.busola && s.busola === p) b++; if (s.mc && p && (bot === "long" ? p : bot === "short" ? -p : 0) === s.mc) m++; });
    var N = l.length, text = "în " + (zile > 0 ? zile : 30) + " de zile, " + (N === 1 ? "1 contrazicere judecată" : cate(N, "contrazicere judecată", "contraziceri judecate")) + ": a avut dreptate graficul pe 4h în " + g + ", Busola în " + b + ", Monte Carlo în " + m + (N < 10 ? " · prea puține sub 10" : "");
    return { judecate: N, grafic: g, busola: b, mc: m, text: text };
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

  return { URL_REZUMAT: URL_REZUMAT, PAZA_VECHI_MS: PAZA_VECHI_MS, simbolBusola: simbolBusola, randGrid: randGrid, htmlRand: htmlRand, pazaStare: pazaStare, pentruVerdict: pentruVerdict, cifraMiscare: cifraMiscare,
    randFisa: randFisa, comparaInterval: comparaInterval, cartela: cartela, htmlCartela: htmlCartela, eticheta: eticheta, liniaBoti: liniaBoti, incarca: incarca, rezumat: rezumat, nuRaspunde: nuRaspunde, _reset: _reset,
    randDirectie: randDirectie, randVerdict: randVerdict, randBtc: randBtc,   /* v100.147 */
    concluzie: concluzie, alteIntervale: alteIntervale, liniaBtc: liniaBtc,   /* v100.148 */
    linkBusola: linkBusola, bilantVoci: bilantVoci };   /* v100.149 */
})();
if (typeof globalThis !== "undefined") globalThis.Busola = Busola;
