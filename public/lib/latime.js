// Lățimea pieței pe 150 de perp-uri Binance (v100.150, I-583) + pânda (I-584) - modul PUR: pagina, colectorul (scripts/lib/tura-latime.mjs,
// prin incarca()) și probele (vm) rulează același cod. Formulele și pragurile sunt COPIATE din PAZNIC-CRYPTO/decizie.mjs (11.10.2026):
// percentila :389, ema :397, atrSerie :405 (media SIMPLĂ a TR), directiaDeFond ramura ema :591, permisiune :598, latimea :1641,
// REGIM_LARG :2708, regimPietei :2710, verdictPiata :2718 - ca cifrele să bată cu PAZNIC în comparația de 2-3 zile (I-587).
// Pragurile sunt IPOTEZE (trader.md): cine le mută, le mută cu mâna și le validează pe date de după.
var Latime = (function () {
  // tendinta / tsmomBare = strategia de direcție din PRODUCȚIA PAZNIC (decizie.mjs:289, :321): momentum pe 504 bare de 4h = 84 de zile;
  // „ema” rămâne opțiune, ca acolo. bare4h = câte bare se aduc (PAZNIC aduce 633; cu 1000 „de câte zile” vede ~82 de zile în urmă)
  var PRAGURI = { volPctl: 90, extPctl: 90, adrConsumat: 90, fundPctlSus: 75, fundPctlJos: 25, oiPctl: 95, emaRapid: 21, emaLent: 55, atrLen: 14, pctlBare: 564, minZileListate: 10, nSimboluri: 150, paralel: 5, REGIM_LARG: 65, bugetEpuizatPct: 60, volExtremPct: 40, vechiMin: 45, tendinta: "tsmom", tsmomBare: 504, bare4h: 1000 };
  var fin = function (x) { return typeof x === "number" && isFinite(x); };
  // rangul median: sub 30 de valori nu e percentilă, e zgomot (I-401)
  function percentila(sir, v) {
    var bun = (sir || []).filter(fin); if (bun.length < 30 || !fin(v)) return null;
    var mici = 0, egale = 0; for (var i = 0; i < bun.length; i++) { if (bun[i] < v) mici++; else if (bun[i] === v) egale++; }
    return Math.round(100 * (mici + 0.5 * egale) / bun.length);
  }
  function ema(vals, len) { var k = 2 / (len + 1), e = vals[0], out = [e]; for (var i = 1; i < vals.length; i++) { e = vals[i] * k + e * (1 - k); out.push(e); } return out; }
  // decizie.mjs:405-416 - media simplă a true range-ului pe `len` bare; NaN până se umple fereastra
  function atrSerie(bare, len) {
    var tr = bare.map(function (b, i) { return i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bare[i - 1].c), Math.abs(b.l - bare[i - 1].c)); });
    var out = [], s = 0;
    for (var i = 0; i < tr.length; i++) { s += tr[i]; if (i >= len) s -= tr[i - len]; out.push(i >= len - 1 ? s / len : NaN); }
    return out;
  }
  // decizie.mjs:539-595 (directiaDeFond): tsmom = semnul randamentului pe `tsmomBare` bare (neclară când nu ajung barele sau randamentul e 0);
  // ema = SUS cere și prețul peste EMA rapidă (nu doar EMA21 > EMA55), JOS invers; altfel neclară. EMA-urile se dau mereu (extensia le cere)
  function directia(inchideri, P) {
    P = P || PRAGURI; var n = inchideri ? inchideri.length : 0;
    if (n < 100) return { dir: "neclara", eR: null, eL: null };
    var eR = ema(inchideri, P.emaRapid), eL = ema(inchideri, P.emaLent), acum = inchideri[n - 1];
    if ((P.tendinta || "tsmom") === "tsmom") {
      var lb = P.tsmomBare; if (n <= lb) return { dir: "neclara", eR: eR, eL: eL };
      var rd = acum / inchideri[n - 1 - lb] - 1;
      return { dir: rd > 0 ? "SUS" : rd < 0 ? "JOS" : "neclara", eR: eR, eL: eL };
    }
    var r = eR[n - 1], l = eL[n - 1];
    return { dir: r > l && acum > r ? "SUS" : r < l && acum < r ? "JOS" : "neclara", eR: eR, eL: eL };
  }
  // I-585: câte bare de 4h la rând ține semnul direcției (tsmom: semnul randamentului pe 504 bare; ema: semnul EMA21 − EMA55), ÷ 6 = zile
  function zileDir(inchideri, P) {
    P = P || PRAGURI; var n = inchideri ? inchideri.length : 0, c = 0, semn, i;
    if ((P.tendinta || "tsmom") === "tsmom") {
      var lb = P.tsmomBare; if (n <= lb) return 0;
      var s = function (k) { return Math.sign(inchideri[k] / inchideri[k - lb] - 1); };
      semn = s(n - 1); if (!semn) return 0;
      for (i = n - 1; i > lb; i--) { if (s(i) !== semn) break; c++; }
      return Math.floor(c / 6);
    }
    if (n < 2) return 0;
    var eR = ema(inchideri, P.emaRapid), eL = ema(inchideri, P.emaLent);
    semn = Math.sign(eR[n - 1] - eL[n - 1]); if (!semn) return 0;
    for (i = n - 1; i >= 1; i--) { if (Math.sign(eR[i] - eL[i]) !== semn) break; c++; }
    return Math.floor(c / 6);
  }
  // permisiune() :598-660, doar partea de MĂSURARE (fără permisiune, fără fișă - măsurate, nu selectează nimic)
  function masuraMoneda(d, P) {
    P = P || PRAGURI; var b4 = d && d.b4, b1d = d && d.b1d;
    if (!b4 || b4.length < 100 || !b1d || b1d.length < 16) return null;
    var inchideri = b4.map(function (b) { return b.c; }), atr = atrSerie(b4, P.atrLen), D = directia(inchideri, P), eL = D.eL;
    var fP = Math.max(50, P.pctlBare || b4.length);
    var atrPct = b4.map(function (b, i) { return fin(atr[i]) ? 100 * atr[i] / b.c : NaN; });
    var volPctl = percentila(atrPct.slice(-fP, -1), atrPct[atrPct.length - 1]);
    var extSerie = b4.map(function (b, i) { return fin(atr[i]) && atr[i] > 0 ? Math.abs(b.c - eL[i]) / atr[i] : NaN; });
    var extPctl = percentila(extSerie.slice(-fP, -1), extSerie[extSerie.length - 1]);
    var azi = b1d[b1d.length - 1], adr = b1d.slice(-15, -1).reduce(function (s, b) { return s + (b.h - b.l); }, 0) / 14, rangeAzi = azi.h - azi.l;
    var adrUsed = adr > 0 ? 100 * rangeAzi / adr : null;
    var fundPctl = Array.isArray(d.fundIst) && fin(d.frAcum) ? percentila(d.fundIst, d.frAcum) : null;
    var oiChg = null, oiPctl = null;
    if (Array.isArray(d.oiSerie) && d.oiSerie.length > 60) {
      var oi = d.oiSerie, abateri = oi.map(function (v, i) { if (i < 24) return NaN; var m = 0; for (var k = i - 24; k < i; k++) m += oi[k]; m /= 24; return m > 0 ? 100 * (v - m) / m : NaN; });
      oiChg = abateri[abateri.length - 1]; oiPctl = percentila(abateri.slice(0, -1), oiChg);
    }
    var lMari = null, lMici = null, diverg = null;
    if (Array.isArray(d.mari) && d.mari.length && Array.isArray(d.mici) && d.mici.length) { lMari = Math.round(100 * +d.mari[d.mari.length - 1].longAccount); lMici = Math.round(100 * +d.mici[d.mici.length - 1].longAccount); diverg = lMari - lMici; }
    var deltaPctl = null;
    if (Array.isArray(d.taker) && d.taker.length >= 60) { var rap = d.taker.map(function (x) { return +x.buySellRatio; }); deltaPctl = percentila(rap.slice(0, -1), rap[rap.length - 1]); }
    return { sym: d.sym, pret: fin(d.pret) ? d.pret : inchideri[inchideri.length - 1], dir: D.dir, zileDir: zileDir(inchideri, P), volPctl: volPctl, extPctl: extPctl, adrUsed: adrUsed, frAcum: fin(d.frAcum) ? d.frAcum : null, fundPctl: fundPctl, oiChg: oiChg, oiPctl: oiPctl, lMari: lMari, lMici: lMici, diverg: diverg, deltaPctl: deltaPctl };
  }
  // latimea() :1641 + fundExtrem (pragurile funding-ului din permisiune) + neclar / lipsa
  function latimea(randuri, P) {
    P = P || PRAGURI; var r = randuri || [], c = function (f) { return r.filter(function (x) { return x && f(x); }).length; };
    return { n: r.length, sus: c(function (x) { return x.dir === "SUS"; }), jos: c(function (x) { return x.dir === "JOS"; }), neclar: c(function (x) { return x.dir === "neclara"; }), lipsa: r.filter(function (x) { return !x; }).length,
      bugetEpuizat: c(function (x) { return x.adrUsed != null && x.adrUsed >= P.adrConsumat; }), volExtrem: c(function (x) { return x.volPctl != null && x.volPctl >= P.volPctl; }), oiExtrem: c(function (x) { return x.oiPctl != null && x.oiPctl >= P.oiPctl; }),
      fundExtrem: c(function (x) { return x.fundPctl != null && (x.fundPctl >= P.fundPctlSus || x.fundPctl <= P.fundPctlJos); }), mariLong: c(function (x) { return x.lMari != null && x.lMari > 50; }) };
  }
  // revizia (3): procentele pe monedele MĂSURATE (n − lipsă), ca în PAZNIC (paznic.mjs:663 ține doar rândurile măsurate)
  function regimPietei(L) {
    var n = L ? (L.n || 0) - (L.lipsa || 0) : 0;
    if (!L || n <= 0) return { cod: "NECUNOSCUT", pctSus: null, pctJos: null };
    var pctSus = 100 * L.sus / n, pctJos = 100 * L.jos / n;
    return { cod: pctSus >= PRAGURI.REGIM_LARG ? "LARG-SUS" : pctJos >= PRAGURI.REGIM_LARG ? "LARG-JOS" : "AMESTECAT", pctSus: pctSus, pctJos: pctJos };
  }
  function regimDeCand(istoric, acum) {
    var l = (istoric || []).filter(function (x) { return x && fin(x.la) && x.cod; }); if (!l.length) return { ore: null, text: "" };
    var cod = l[l.length - 1].cod, de = l[l.length - 1].la;
    for (var i = l.length - 1; i >= 0 && l[i].cod === cod; i--) de = l[i].la;
    var ore = (acum - de) / 3600000, zile = Math.floor(ore / 24);
    return { ore: ore, text: zile >= 1 ? "de " + TextRo.cate(zile, "zi", "zile") : ore >= 1 ? "de " + TextRo.cate(Math.floor(ore), "oră", "ore") : "de sub o oră" };
  }
  var regimText = { "LARG-SUS": "larg SUS", "LARG-JOS": "larg JOS", "AMESTECAT": "amestecată", "NECUNOSCUT": "necunoscută" };
  function esteBotContra(dirBot, cod) { var d = String(dirBot || "").toLowerCase(); return (d === "long" && cod === "LARG-JOS") || (d === "short" && cod === "LARG-SUS"); }
  var hhmm = function (t) { var d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  // v100.185 (el 13.10: „ok fă idei”): moneda unui bot în tabelul celor 150 - rândul din fișa botului și propoziția „contra” din pândă
  var cheie = function (s) { return String(s || "").toUpperCase().replace(/\.PERP$/, "").replace(/_USDT.*$/, "").replace(/USDT$/, ""); };   /* baza din Pionex vine și „PLUME.PERP” */
  function gasesteMoneda(latime, simbol) {
    var a = latime && latime.acum, k = cheie(simbol); if (!a || a.eroare || !Array.isArray(a.monede) || !k) return null;
    return a.monede.filter(function (m) { var s = cheie(m.sym); return s === k || s === "1000" + k; })[0] || null;
  }
  var dirText = function (m) { return m.dir === "neclara" ? "direcția neclară" : m.dir + (fin(m.zileDir) ? " de " + TextRo.cate(m.zileDir, "zi", "zile") : ""); };
  var contra = function (dirBot, m) { return m.dir === "SUS" || m.dir === "JOS" ? esteBotContra(dirBot, "LARG-" + m.dir) : false; };
  function textMoneda(latime, simbol, dirBot, acum) {
    var m = gasesteMoneda(latime, simbol); if (!m) return null;
    var P = PRAGURI, a = latime.acum, min = Math.max(0, Math.round((acum - a.la) / 60000)), vechi = min > P.vechiMin, nr = function (x) { return String(Math.round(x)); };
    var parti = [dirText(m)], prag = [];
    if (fin(m.volPctl)) { parti.push("volatilitate " + nr(m.volPctl)); if (m.volPctl >= P.volPctl) prag.push("volatilitate extremă"); }
    if (fin(m.extPctl)) { parti.push("extensie " + nr(m.extPctl)); if (m.extPctl >= P.extPctl) prag.push("extensie extremă"); }
    if (fin(m.adrUsed)) { parti.push("bugetul zilei " + nr(m.adrUsed) + "%"); if (m.adrUsed >= P.adrConsumat) prag.push("bugetul zilei epuizat"); }
    if (fin(m.fundPctl)) { parti.push("funding " + nr(m.fundPctl)); if (m.fundPctl >= P.fundPctlSus || m.fundPctl <= P.fundPctlJos) prag.push("funding extrem"); }
    if (fin(m.oiPctl)) { parti.push("OI " + nr(m.oiPctl)); if (m.oiPctl >= P.oiPctl) prag.push("OI extrem"); }
    if (prag.length) parti.push("prag atins: " + prag.join(", "));
    var c = contra(dirBot, m); if (c) parti.push("botul tău e CONTRA direcției monedei");
    parti.push(vechi ? "veche, de la " + hhmm(a.la) : "acum " + min + " min");
    return { ce: "În pândă, " + cheie(m.sym).replace(/^1000/, ""), stare: c ? "atentie" : "info", text: parti.join(" · "), vechi: vechi, dirText: dirText(m), prag: prag, contra: c };   /* v100.186: bucățile, pentru Acasă */
  }
  // boti = [{ s: "PLUME", dir: "long" | "short" | "neutru" }] ⇒ cei contra direcției monedei lor
  function botiContra(latime, boti) {
    return (boti || []).map(function (b) { var m = gasesteMoneda(latime, b.s); return m && contra(b.dir, m) ? { s: cheie(b.s), dirBot: String(b.dir).toLowerCase(), dir: m.dir, zileDir: m.zileDir, text: "moneda " + dirText(m) } : null; }).filter(Boolean);
  }
  // rândul din „Ce spune piața acum” (Tablou) - aceeași funcție dă și antetul blocului din Sugestii
  function textCitire(latime, bot, acum) {
    var ce = "Lățimea pieței (150 perp-uri)", a = latime && latime.acum;
    if (!a || !a.lat || !fin(a.la)) return { ce: ce, stare: "info", text: "aștept lățimea pieței (vine o dată la 15 minute)", link: null, vechi: false };
    var L = a.lat, cod = a.regim && a.regim.cod || "NECUNOSCUT", min = Math.max(0, Math.round((acum - a.la) / 60000)), vechi = min > PRAGURI.vechiMin;
    // revizia (2): eroarea colectorului (univers gol, Binance mut) se SPUNE, nu se arată „0 sus · 0 jos”
    if (a.eroare) return { ce: ce, stare: "atentie", text: "colectorul n-a putut măsura lățimea: " + a.eroare + (vechi ? " · veche, de la " + hhmm(a.la) : " · acum " + min + " min"), link: null, vechi: vechi };
    var de = regimDeCand(latime.istoric, acum).text, nMas = a.n - (a.lipsa || 0);
    var text = regimText[cod] + (de ? " " + de : "") + " · " + L.sus + " sus · " + L.jos + " jos · conturile mari long pe " + L.mariLong + " din " + nMas + " · funding extrem " + L.fundExtrem + " · OI extrem " + L.oiExtrem;
    if (a.incomplet) text += " · pe " + nMas + " din " + a.n;
    text += vechi ? " · veche, de la " + hhmm(a.la) : " · acum " + min + " min";
    var stare = "info", pct = function (k) { return nMas ? 100 * L[k] / nMas : 0; };
    if (esteBotContra(bot && bot.directie, cod)) { stare = "atentie"; text += " · contra botului tău: riscul e corelat, nu diversificat"; }
    else if (pct("bugetEpuizat") >= PRAGURI.bugetEpuizatPct) { stare = "atentie"; text += " · ziua e epuizată pe toată piața"; }
    else if (pct("volExtrem") >= PRAGURI.volExtremPct) { stare = "atentie"; text += " · volatilitate extremă pe piața largă"; }
    return { ce: ce, stare: stare, text: text, link: "sugestii", vechi: vechi };
  }
  // pânda (Sugestii): filtrele tabelului; monedele boților lui întâi, apoi ordinea universului (volum)
  function filtreaza(monede, filtru, botiSimboluri) {
    var boti = {}; (botiSimboluri || []).forEach(function (s) { boti[String(s).toUpperCase().replace(/USDT$/, "")] = true; });
    var eBot = function (m) { return !!boti[String(m.sym).replace(/USDT$/, "")]; };
    var l = (monede || []).filter(function (m) {
      if (!m) return false;
      if (filtru === "boti") return eBot(m);
      if (filtru === "contra") return m.diverg != null && Math.abs(m.diverg) >= 15;
      if (filtru === "extreme") return (m.volPctl != null && m.volPctl >= PRAGURI.volPctl) || (m.oiPctl != null && m.oiPctl >= PRAGURI.oiPctl) || (m.fundPctl != null && (m.fundPctl >= PRAGURI.fundPctlSus || m.fundPctl <= PRAGURI.fundPctlJos));
      if (filtru === "sus") return m.dir === "SUS";
      if (filtru === "jos") return m.dir === "JOS";
      return true;
    });
    return l.filter(eBot).concat(l.filter(function (m) { return !eBot(m); }));
  }
  return { PRAGURI: PRAGURI, percentila: percentila, ema: ema, atrSerie: atrSerie, directia: directia, zileDir: zileDir, masuraMoneda: masuraMoneda, latimea: latimea, regimPietei: regimPietei, regimDeCand: regimDeCand, regimText: regimText, esteBotContra: esteBotContra, textCitire: textCitire, filtreaza: filtreaza, textMoneda: textMoneda, botiContra: botiContra };   /* v100.185 */
})();
