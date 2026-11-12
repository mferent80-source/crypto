// Pagina Home "Piata azi" (v92; v93 mixt crypto + Nasdaq) - ecranul. Logica pura e in lib/acasa.js (probata in scripts/acasa-v92.mjs).
// Datele: clasamentul colectorului (miscarea pe top 100 PERP), tickerele Pionex, BTC (4h/1z/1h), frica/lacomia +
// bursele (/api/stiri?action=piata), largimea pietei (refreshMarketBreadthV64), dominanta (intel crypto_global),
// botii / contul T212 / clasamentul din contTotAsigura (aceleasi ca pe celelalte pagini, zero cereri in plus).
// v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function acCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
var acasa = { la: 0, inLucru: false, piataLa: 0, piataInLucru: false, d: {} };
var ACASA_MS = 5 * 60000;

function acasaPe() { var el = $("dash"); return !!(el && el.classList.contains("on")); }
async function acasaPiataCol() {
  if (acasa.piataInLucru || acasa.inLucru) return;
  if (!acasa.inLucru && Date.now() - acasa.la >= ACASA_MS) return;
  if (acasa.piataLa && Date.now() - acasa.piataLa < 60000) return;
  acasa.piataInLucru = true;
  acasa.piataLa = Date.now();
  var d = acasa.d;
  try {
    d.piataCol = await getJSON("/api/istoric-bot?action=piata");
    d.piataColLa = Date.now();
    d.piataColErr = null;
  } catch (e) {
    d.piataColErr = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e);
  } finally { acasa.piataInLucru = false; }
  acasaDeseneaza();
}
async function acasaPorneste(fortat) {
  acasaDeseneaza();
  if (acasa.inLucru) return;
  if (!fortat && Date.now() - acasa.la < ACASA_MS) { acasaPiataCol(); return; }
  acasa.inLucru = true;
  var d = acasa.d;
  // v100.202: fiecare cerere reușită își ține ora (k + "La") — „actualizat” și „ultima citire bună” spun adevărul, nu ora încercării
  // v100.332 (auditul 12.11, 🟡7): redesenarea după fiecare cerere e grupată (acasaDeseneazaGrupat) - ~30 de cereri sosite una după alta rescriau toată pagina de ~30 de ori
  var pas = async function (k, fn) { try { d[k] = await fn(); d[k + "Err"] = null; d[k + "La"] = Date.now(); } catch (e) { d[k + "Err"] = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); } if (typeof acasaDeseneazaGrupat === "function") acasaDeseneazaGrupat(); else acasaDeseneaza(); };
  try {
    await Promise.all([
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); d.clasamentStare = c && c.stare || null; return c && c.clasament || null; }),   /* v100.276: + de ce lipsește */
      pas("piata", function () { return getJSON("/api/stiri?action=piata"); }),
      pas("tickers", async function () { var t = await getJSON("/api/market?type=pionex_tickers&market=PERP"); return t && t.data && t.data.tickers || null; }),
      pas("glob", function () { return intelApi("crypto_global"); }),
      pas("cont", async function () { if (typeof contTotAsigura === "function") await contTotAsigura(); return true; }),
      pas("scor", function () { return typeof scPorneste === "function" ? scPorneste() : null; }),   // v100.217: scorul sezonului (boții din Jurnal + configurația de acasă)
      pas("contRaport", function () { return getJSON("/api/istoric-bot?action=cont"); }),   // v100.231: raportul pe tot contul (cheia „cont” e deja contTotAsigura)
      pas("contZile", function () { return getJSON("/api/istoric-bot?action=contZile"); }),
      pas("franaCfg", async function () { var c = await getJSON("/api/istoric-bot?action=config"); return c && c.config && c.config.frana || null; }),   /* v100.280: pragurile frânei tale, pentru contorul zilei */   // v100.234: zilele din KV, ca măsura să aibă poza și într-un browser nou
      // v93: Nasdaq 100 (colectorul, la 8 dimineata), calendarul saptamanii, stirile
      pas("ndx", function () { return getJSON("/api/t212?action=ndx"); }),
      pas("calendar", function () { return getJSON("/api/stiri?action=calendar"); }),
      pas("stiriBursa", function () { return getJSON("/api/stiri?action=bursa"); }),
      pas("stiriCrypto", function () { return getJSON("/api/stiri?action=crypto&moneda=BTC"); }),
      // v94: funding-ul pe toata piata + pozele zilnice ("ce s-a schimbat de ieri"), de la colector
      pas("piataCol", function () { return getJSON("/api/istoric-bot?action=piata"); }),
      // v100.330 (el, 12.11: „sugestii de monede la fel cum sunt sugestii de stocks” ⇒ „da”): eticheta istoricului și urmărirea listelor de monede
      pas("sugestii", function () { return getJSON("/api/istoric-bot?action=sugestii&scurt=1"); }),   /* revizia Opus: fără istoric */
      pas("verdicte", function () { return getJSON("/api/istoric-bot?action=verdicteCalibrare").then(function (r) { return r && r.calibrare || null; }); }),
      // v100.193 (demo aprobat 14.10): Market Breadth SUA (robotul de pe GitHub), Trend 12 luni + topul pe sectoare (KV, colectorul),
      // lățimea crypto pe 150 perp-uri (KV, la 15 min) — pentru cardurile noi și Scorul zilei
      /* v100.332 (auditul 12.11, 🟡6): cu limită de timp - fără ea, robotul care nu răspunde ținea pe loc tot ce urmează (lumânările BTC, lărgimea, ideile) și pagina nu se mai reîmprospăta */
      pas("mbUs", function () { return typeof LatimeUS === "undefined" ? null : fetch(LatimeUS.SURSA, { cache: "no-store", signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined }).then(function (r) { return r.ok ? r.json() : null; }); }),
      pas("trend12", function () { return getJSON("/api/istoric-bot?action=trend12").then(function (r) { return r && r.trend || null; }); }),
      pas("sectoareTop", function () { return getJSON("/api/istoric-bot?action=sectoareTop").then(function (r) { return r && r.sectoare || null; }); }),
      pas("latimeKv", function () { return getJSON("/api/istoric-bot?action=latime").then(function (r) { return r && r.latime || null; }); })
    ]);
    // BTC: 4h si 1 zi (directia), 1 ora (miscarea: 4h / 24h fata de obisnuit) - pe rand, serverul le distanteaza oricum
    await pas("btc4h", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H&limit=200"); return k && k.data && k.data.klines || null; });
    await pas("btc1d", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=200"); return k && k.data && k.data.klines || null; });
    await pas("btc1h", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500"); return k && k.data && k.data.klines || null; });
    // v100.331 (el, 12.11: „3 … fă tot”): întâi lărgimea colectorului (aceleași formule, o dată la 30 min) - fără cele 32 de cereri la Binance și fără
    // „Calculez lărgimea…”; dacă lipsește sau are peste 90 de minute, pagina o socotește singură, ca înainte
    await pas("largime", async function () {
      try { var r = await getJSON("/api/istoric-bot?action=largimeCrypto"); if (r && r.largime && r.la > 0 && Date.now() - r.la < 90 * 60000) return acLargimeDinServer(r.largime); } catch (e) {}
      var lr = typeof refreshMarketBreadthV64 === "function" ? await refreshMarketBreadthV64(false, false) : null;
      /* v100.332 (auditul 12.11, 🔵): rezerva socotește „Piața analizată”; cu acțiunile alese, lărgimea Nasdaq nu se scrie sub titlul „Lărgimea crypto” */
      if (lr && lr.market && lr.market !== "CRYPTO") throw Error("lărgimea crypto vine de la colector, iar acum n-o am (în „Piața analizată” sunt alese acțiunile)");
      return lr;
    });
    // mediul botilor pe monede care nu sunt in top 100 (clasamentul nu le are): miscarea din barele de 1 ora
    await pas("regimBoti", async function () {
      var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" ? contTot.boti : null), o = {};
      var inCl = {}; ((d.clasament && d.clasament.monede) || []).forEach(function (x) { inCl[String(x.simbol).replace(/_USDT_PERP$/, "")] = true; });
      for (var i = 0; i < (boti || []).length && i < 4; i++) {
        var b = boti[i], nume = String(b && b.baza || "").replace(/\.PERP$/, ""); if (!b || !b.activ || !nume || inCl[nume]) continue;
        try { var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(b.simbolPionex || nume + "_USDT_PERP") + "&interval=60M&limit=500"); o[nume] = GridCalcul.regimPeBare(GridCalcul.bare(k && k.data && k.data.klines), 4, 24); } catch (e) { o[nume] = null; }
      }
      return o;
    });
    await pas("idei", async function () { if (typeof t212 !== "undefined" && t212.idei) return t212.idei; var x = await getJSON("/api/t212?action=idei"); if (typeof t212 !== "undefined") t212.idei = x; return x; });
    // datele principale n-au venit (fara parola, server picat) -> reincerc in 30 s, nu peste 5 minute
    // v93: urmatoarele rezultate financiare pentru actiunile americane pe care le ai (o data pe zi)
    await pas("rezultate", async function () {
      var zi = new Date().toISOString().slice(0, 10); if (d.rezultate && d.rezultate.zi === zi) return d.rezultate;
      var poz = await getJSON("/api/t212?action=pozitii"), l = (Array.isArray(poz) ? poz : poz && (poz.items || poz.pozitii) || []).map(function (x) { return x && x.ticker; }).filter(function (t) { return /_US_EQ$/.test(String(t)); });
      var o = { zi: zi, l: [] };
      /* v100.272 (ideile auditului 29.10): cele până la 12 date câte 4 deodată (erau una după alta); o eroare lasă doar locul ei gol */
      var rz = await ActiuniSemnale.inParalel(l.slice(0, 12), 4, function (tk) { return getJSON("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); });
      rz.forEach(function (r, i) { if (r && r.data) o.l.push({ simbol: r.simbol || l[i].split("_")[0], data: r.data, sigur: !!r.sigur }); });
      o.l.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      return o;
    });
    /* v100.332 (auditul 12.11, 🔵): și când tura de acum a picat peste date vechi rămase pe ecran (înainte reîncerca abia peste 5 minute) */
    /* revizia Opus v100.332 (🟡3): reîncercarea la fiecare minut refăcea toată tura (~30 de cereri, și la Pionex, care blochează IP-ul) cât o sursă pica ⇒
       pauză crescătoare după eșecuri la rând: 1, 2, 4, apoi cel mult 5 minute (cât tura obișnuită); o tură reușită o pune la zero */
    acasa.la = d.clasament && d.piata && d.tickers && !d.clasamentErr && !d.piataErr && !d.tickersErr ? (acasa.esec = 0, Date.now()) : (acasa.esec = (acasa.esec || 0) + 1, Date.now() - ACASA_MS + Math.min(ACASA_MS, 60000 * Math.pow(2, acasa.esec - 1)));
  } finally { acasa.inLucru = false; }
  acasaDeseneaza();
}
setInterval(function () { if (acasaPe() && !document.hidden) acasaPorneste(false); }, 60000);
// v100.332 (auditul 12.11, 🟡7): redesenarea grupată - cererile care sosesc la mai puțin de 120 ms una de alta fac o singură desenare (la deschidere
// pagina se rescria întreagă după fiecare din cele ~30 de cereri, cu socotelile pe toți boții închiși de fiecare dată). Desenarea de la începutul și
// de la sfârșitul turei rămâne pe loc (acasaPorneste); fără setTimeout (probele în vm) desenează imediat, ca înainte.
var acasaDesenProgramat = false;
function acasaDeseneazaGrupat() {
  if (typeof setTimeout !== "function") { acasaDeseneaza(); return; }
  if (acasaDesenProgramat) return;
  acasaDesenProgramat = true;
  setTimeout(function () { acasaDesenProgramat = false; try { acasaDeseneaza(); } catch (e) {} }, 120);
}

// ---------------- desenarea ----------------
var AC_TON = { bine: "good", rau: "bad", atentie: "warn", neutru: "acMut", lipsa: "acMut" };
function acLei(v) { return typeof t212Suma === "function" ? t212Suma(v) : Number(v).toFixed(0) + " lei"; }
function acPct(v, z) { if (v == null || !isFinite(v)) return "—"; return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; }   /* v100.306 (I-837): implicit O zecimală („−5,1%”, nu „−5,07%”) */
function acNr(v, z) { if (v == null || !isFinite(v)) return "—"; return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z || 0, maximumFractionDigits: z || 0 }); }
function acSpark(l, cul, h) {
  h = h || 44; l = (l || []).filter(function (v) { return isFinite(v); });
  if (l.length < 2) return '<div class="acSpGol"></div>';
  var lo = Math.min.apply(null, l), hi = Math.max.apply(null, l), n = l.length;
  var pts = l.map(function (v, i) { return (i / (n - 1) * 200).toFixed(1) + "," + (h - 2 - (v - lo) / (hi - lo || 1) * (h - 4)).toFixed(1); }).join(" ");
  return '<svg class="acSp" viewBox="0 0 200 ' + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,' + h + ' ' + pts + ' 200,' + h + '" fill="' + cul + '" opacity=".12"/><polyline points="' + pts + '" fill="none" stroke="' + cul + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
}
function acBare(n, perechi) { var tot = 0; perechi.forEach(function (x) { tot += x[0]; }); if (!tot) return ""; return '<div class="acBar" role="img" aria-label="' + escapeHtml(perechi.map(function (x) { return x[0] + " " + x[2]; }).join(", ")) + '">' + perechi.filter(function (x) { return x[0] > 0; }).map(function (x) { return '<i style="flex:' + x[0] + ';background:' + x[1] + '"></i>'; }).join("") + '</div>'; }
function acClasamentSumar(c) {
  var m = c && Array.isArray(c.monede) ? c.monede : null; if (!m) return null;
  var o = { evita: 0, candidati: 0, faraDate: 0, dir: { long: 0, neutru: 0, short: 0 }, deEvitat: [], buni: [] };
  if (Number(c.la) > 0) o.la = Number(c.la);   /* v100.332 (🔴2): ora la care l-a făcut colectorul - Acasa.vreme o citește pentru „DATE VECHI” */
  m.forEach(function (x) { if (x.stare === "evita") { o.evita++; o.deEvitat.push(x); } else if (x.stare === "candidat") { o.candidati++; o.buni.push(x); } else o.faraDate++; if (o.dir[x.dir] != null) o.dir[x.dir]++; });
  o.deEvitat.sort(function (a, b) { var ra = a.regim ? a.regim.r24h || 0 : 0, rb = b.regim ? b.regim.r24h || 0 : 0; return rb - ra; });   /* v100.272: după mișcarea pe 24 h (definiția comună), nu după maximul 4 h / 24 h */
  o.buni.sort(function (a, b) { return (b.scor || 0) - (a.scor || 0); });
  return o;
}
function acBtc(d) {
  var o = { dir4h: null, dir1d: null, regim: null };
  try { if (typeof Directie !== "undefined" && d.btc4h) o.dir4h = Directie.analizeaza(d.btc4h, 6, null).dir; } catch (e) {}
  try { if (typeof Directie !== "undefined" && d.btc1d) o.dir1d = Directie.analizeaza(d.btc1d, 7, null).dir; } catch (e) {}
  try { if (typeof GridCalcul !== "undefined" && d.btc1h) o.regim = GridCalcul.regimPeBare(GridCalcul.bare(d.btc1h), 4, 24); } catch (e) {}
  return o;
}
var AC_DIR = { urca: '<span class="good">urcă</span>', coboara: '<span class="bad">coboară</span>', lateral: "lateral" };

// v100.199: piața nu se poate citi fără parola aplicației — o cerere de bază refuzată pe parolă e destul (celelalte cad la fel)
var AC_FARA_PAROLA = { nivel: "fara-date", eticheta: "FĂRĂ PAROLĂ", titlu: "Fără parola aplicației nu pot citi piața pe dispozitivul ăsta.",
  text: "Serverul Radarului refuză cererile până pui parola (textul APP_API_TOKEN de la pornire) în Setări → Parola aplicației pe acest dispozitiv. Se pune o dată pe fiecare adresă din care deschizi Radarul (acasă și Tailscale sunt separate)." };
var AC_BUTON_PAROLA = '<button class="actionGhost" type="button" data-action-click="mergiLaParola()">Deschide Setări (parola)</button>';
function acFaraParola(d) {
  if (typeof eroareDeParola !== "function" || !d) return false;
  return ["clasamentErr", "piataErr", "tickersErr", "ndxErr"].some(function (k) { return !!d[k] && eroareDeParola(d[k]); });
}
// v100.202 (15.10, ideea 5): serverul de acasă nu răspunde (rețea, PC oprit, server căzut) — nu e lipsa parolei. Cererile de bază
// au căzut toate; cu cifre vechi pe ecran, cardurile le arată și rândul de sus spune că sunt vechi; fără nimic, cardurile spun asta.
function acFaraServer(d) {
  if (!d || acFaraParola(d)) return false;
  return ["clasamentErr", "piataErr", "tickersErr"].every(function (k) { return !!d[k]; });
}
function acFaraServerVerd(d) {
  return { nivel: "fara-date", eticheta: "FĂRĂ LEGĂTURĂ", titlu: "Serverul Radarului nu răspunde.",
    text: "N-am primit nimic de la el de la deschidere (" + String(d && d.clasamentErr || "eroare") + "). Verifică dacă merge serverul Radarului de pe VPS; reîncerc singur în 30 de secunde." };
}
function acZiAzi() {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  catch (e) { return ""; }
}
function acPiataDin(stocat, ziStocata, ziAzi) {
  if (ziAzi && ziStocata === ziAzi && (stocat === "bursa" || stocat === "crypto")) return stocat;
  return "crypto";
}
function acPiataAlege(care) {
  var rad = document.getElementById("acasa"); if (!rad) return;
  var c = care === "bursa" ? "bursa" : "crypto";
  rad.classList.toggle("acDoarCrypto", c === "crypto");
  rad.classList.toggle("acDoarBursa", c === "bursa");
  try { localStorage.setItem("acPiata", c); localStorage.setItem("acPiataZi", acZiAzi()); } catch (e) {}
  var b1 = document.getElementById("acBtnCrypto"), b2 = document.getElementById("acBtnBursa");
  if (b1) b1.setAttribute("aria-pressed", c === "crypto" ? "true" : "false");
  if (b2) b2.setAttribute("aria-pressed", c === "bursa" ? "true" : "false");
}
function acPiataInit() {
  var c = "crypto";
  try { c = acPiataDin(localStorage.getItem("acPiata"), localStorage.getItem("acPiataZi"), acZiAzi()); } catch (e) {}
  acPiataAlege(c);
}
function acasaVerd(el, piata, v, extra) {
  if (!el) return;
  el.className = "acVerd acVerd-" + v.nivel;
  // v100.224: propoziția e rândul mare; eticheta vremii e cipul de deasupra. Cuvintele din faCe rămân. Fără faCe, eticheta rămâne mare.
  el.innerHTML = '<div class="acPiata">' + piata + '</div><div class="acNiv acNiv-' + v.nivel + '">' + escapeHtml(v.eticheta) + '</div>'
    + (v.faCe ? '<div class="acFac' + (v.ton === "atentie" ? " acFacFrana" : "") + '">' + escapeHtml(v.faCe) + '</div>' : '')   /* audit 23.10: titlul frânat cu tonul frânei */
    + '<p><b>' + escapeHtml(v.titlu) + '</b></p>' + (v.text ? '<p class="acMut">' + escapeHtml(v.text) + '</p>' : '') + (extra || '');
}
function acCadran(val, f, cul0, cul1, et0, et1, eticheta) {
  var ung = f == null ? Math.PI / 2 : Math.PI * (1 - Math.max(0, Math.min(1, f))), ax = 110 + 76 * Math.cos(ung), ay = 110 - 76 * Math.sin(ung), id = "acG" + Math.random().toString(36).slice(2, 7);
  return '<svg class="acCadran" viewBox="0 0 220 124" role="img" aria-label="' + escapeHtml(eticheta) + '"><defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="' + cul0 + '"/><stop offset=".5" stop-color="#9FB3C4"/><stop offset="1" stop-color="' + cul1 + '"/></linearGradient></defs>'
    + '<path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="url(#' + id + ')" stroke-width="14" stroke-linecap="round" opacity=".85"/>'
    + (f == null ? '' : '<line x1="110" y1="110" x2="' + ax.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="#E6EDF3" stroke-width="3" stroke-linecap="round"/>') + '<circle cx="110" cy="110" r="6" fill="#E6EDF3"/>'
    + '<text x="20" y="123" fill="#9FB3C4" font-size="10" text-anchor="middle">' + et0 + '</text><text x="200" y="123" fill="#9FB3C4" font-size="10" text-anchor="middle">' + et1 + '</text></svg>';
}
function acMisList(l) { return l.map(function (x) { return '<div class="acMr"><span>' + escapeHtml(x.s) + (x.miscare ? '<span class="acTag">mișcare</span>' : '') + '</span><b class="' + (x.ch >= 0 ? "good" : "bad") + '">' + acPct(x.ch, 1) + '</b></div>'; }).join(""); }
// v94: "fata de ieri" - sageata si diferenta, din pozele zilnice ale colectorului
function acIeri(sc, k, z, invers) {
  var x = sc && sc[k]; if (!x) return "";
  var bine = x.d === 0 ? null : invers ? x.d < 0 : x.d > 0;
  return ' <span class="acIeri ' + (bine === null ? "acMut" : bine ? "good" : "bad") + '" title="față de ieri: ' + escapeHtml(String(x.de).replace(".", ",")) + '">' + x.sag + (x.d ? " " + Math.abs(x.d).toFixed(z || 0).replace(".", ",") : "") + '</span>';
}
function acZiRo(z) { var d = new Date(z + "T12:00:00Z"); return isFinite(d) ? d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" }) : z; }

// v100.82 (03.10, ideea 2): „💡 Ce aș cumpăra azi” sus, sub cele două verdicte - ideile stăteau doar în Trading 212 și pe Tablou (și jos, în
// „Idei de azi”), iar el nu le găsea. Aceleași liste ca panourile la care duc butoanele: primele acțiuni care trec de poartă, monedele candidate.
function acasaCumpar(d, aziNu) {
  var cl = acClasamentSumar(d && d.clasament), m = cl ? cl.buni.slice(0, 3) : [];
  var lista = function (l, sau) { return l.length < 2 ? l.join("") : l.slice(0, -1).join(", ") + " " + sau + " " + l[l.length - 1]; };
  // v100.92 (I-521): o cartelă pe coloane - numele în bold, eticheta sub ele și butonul ei. v100.295 (el, 02.11: „da scoate-le și de pe Acasă”):
  // fără coloana ideilor T212 și fără monedele pe revenire / short. v100.330 (el, 12.11: „sugestii de monede la fel cum sunt sugestii de stocks”
  // ⇒ „da”, cu eticheta istoricului la vedere): monedele pe revenire și pentru short înapoi, fiecare cu istoricul și urmărirea la 7 zile ⇒ patru coloane
  var mut = function (t) { return '<span class="acMut">' + escapeHtml(t) + '</span>'; };
  // v100.306 (I-824): regula „azi nu” (frâna zilei, pauza, piața în MIȘCARE) - lista rămâne la vedere, fără bold și fără „Pe ce aș porni”
  var an = arguments.length > 1 ? aziNu : typeof acAziNu === "function" ? acAziNu() : null;
  var pzB = !an && typeof acPauzaSezon === "function" ? acPauzaSezon() : null;
  var nume = m.map(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, ""); });
  var bh = an && an.nu ? acAziNuHtml(an) + (nume.length ? mut("candidatele din clasament: " + nume.join(", ")) : "")
    : pzB > 0 ? escapeHtml(acFrazaPauza(pzB)) : !cl ? mut("aștept clasamentul") : !m.length ? mut("acum nicio monedă nu e candidată") : '<b>' + escapeHtml(lista(nume, "sau")) + '</b>';
  var p = null, venit = false; try { venit = !!(d && d.idei && d.idei.idei); p = typeof acasaCumpar2Parti === "function" ? acasaCumpar2Parti(d) : null; } catch (e) { p = null; }   /* o eroare în date nu strică cartela */
  var ch = !p || p.actiuni === null ? mut(venit ? "lista apare la tura de la 8:00" : "aștept lista") : '↩️ acțiunile <b>' + escapeHtml(p.actiuni) + '</b>' + escapeHtml(p.etA);
  // v100.330: o listă de monede - numele (sub „azi nu” fără bold, „azi nu pornesc”), apoi istoricul: eticheta dovezii pe piață și urmărirea la 7 zile
  var monede = function (l, et, urm, dir) {
    var ist = '<br>' + mut(p && p.sg ? "istoricul: " + (et || "—") + (urm ? " · " + urm : "") : "aștept istoricul");
    if (!l) return "—" + ist;
    if (!l.length) return mut("nimic azi") + ist;
    // numele duc la fișa monedei în „Grid: ce setez?”, cu direcția listei (gridDeschideMonedaDir, ca pe Sugestii; ca simbolurile acțiunilor la Poartă)
    var bt = l.map(function (x) { var k = String(x || "").replace(/[^A-Za-z0-9.-]/g, ""), dd = dir === "short" ? "short" : "long";
      return '<button type="button" class="acSym" data-action-click="gridDeschideMonedaDir(&#39;' + k + '&#39;,&#39;' + dd + '&#39;)" aria-label="Fișa ' + escapeHtml(k) + ', ' + dd + '">' + escapeHtml(k) + '</button>'; });
    return (an && an.nu || pzB > 0 ? mut(lista(l, "sau") + " · azi nu pornesc") : '<b>' + (bt.length < 2 ? bt.join("") : bt.slice(0, -1).join(", ") + " sau " + bt[bt.length - 1]) + '</b>') + ist;
  };
  var btn = function (ecran, id, fila, t) { return '<span class="acCumparBtn"><button class="acBtn" type="button" data-action-click="acasaMergiLa(\'' + ecran + '\',\'' + id + '\'' + (fila ? ',\'' + fila + '\'' : '') + ')">' + t + '</button></span>'; };
  var col = function (et, corp, b, extra) { return '<div class="acCumparCol"><p class="acCumparEt">' + et + '</p><p>' + corp + '</p>' + (extra ? '<p class="tbWarn">' + escapeHtml(extra) + '</p>' : '') + b + '</div>'; };
  // v100.119: drumul spre pagina cu TOATE sugestiile (boți, US, EU)
  return '<p class="acCumparCap">💡 <b>Ce aș cumpăra azi</b></p><div class="acCumparCol3">' + col("Boți", bh, btn("tabloubot", "tbIdei", null, an && an.nu ? "Lista candidatelor" : "Pe ce aș porni un bot"))
    + col("Monede pe revenire", monede(p && p.monede, p && p.etM, p && p.urmM, "long"), "", p && p.notaRev) + col("Monede pentru short", monede(p && p.short, p && p.etS, p && p.urmS, "short"), "", p && p.nota)
    + col("Acțiuni pe revenire", ch, btn("t212", "t212Idei", "revenire", "Pe revenire")) + '</div>'
    + '<p class="acCumparToate"><button class="acBtn" type="button" data-action-click="navTo(\'sugestii\',true)">💡 Toate sugestiile: boți, acțiuni US și EU</button></p>';   // v100.119: sub cartelă, titlul rămâne același
}
// v100.85 (reveniri + short, 03.10): listele de revenire / short, fiecare cu eticheta istoricului ei. v100.295 le scosese pe cele de monede;
// v100.330 (el, 12.11: „da”) le aduce înapoi, cu urmărirea la 7 zile la vedere. Acțiunile pe revenire (US, tura de la 8:00) - ca înainte.
function acasaCumpar2Parti(d) {
  var ii = d && d.idei && d.idei.idei, ra = ii && Array.isArray(ii.reveniri) ? ii.reveniri : null;
  var sg = d && d.sugestii && d.sugestii.sugestii, dv = sg && sg.dovada || {}, um = sg && sg.urmarire || {}, I = typeof Idei !== "undefined" && Idei.reveniriBoti ? Idei : null;
  // revizia (I7, v100.85): un clasament făcut înainte de colectorul nou n-are starea de revenire ⇒ „—”, nu „nimic azi”
  var cm = d && d.clasament && d.clasament.monede, faraStare = Array.isArray(cm) && cm.length > 0 && !cm.some(function (x) { return x && x.revenire; });
  // revizia Opus (🔵6): `moneda` e deja curățat (Idei); simbolul tăiat de mână doar când lipsește (BTC_USDT ar fi ieșit „BTCUSDT” în buton)
  var mo = function (x) { return String(x.moneda || String(x.simbol || "").replace(/_USDT(_PERP)?$/, "")); }, ac = function (x) { return x.simbol || String(x.ticker || "").split("_")[0]; };
  var rmL = I && d && d.clasament && !faraStare ? I.reveniriBoti(d.clasament, [], 3) : null;
  var rm = rmL ? rmL.map(mo) : null, rs = I && d && d.clasament ? I.shortBoti(d.clasament, [], 3).map(mo) : null;
  if (!ra && !rm && !rs) return null;
  // v100.332 (auditul 12.11, 🔵): o monedă „pe revenire” care e și „în mișcare” în clasament stătea îngroșată aici și, mai jos, la „De ocolit pentru grid”
  var miscaR = (rmL || []).filter(function (x) { return x && x.stare === "evita"; }).map(mo);
  var notaRev = miscaR.length ? "⚠ " + miscaR.join(", ") + (miscaR.length === 1 ? " e și în mișcare (de ocolit pentru grid)" : " sunt și în mișcare (de ocolit pentru grid)") : "";
  // v100.89 (ideea 1): moneda aflată în AMBELE liste (cele de 5) - semnalele se bat cap în cap
  var nota = "";
  if (rm && rs) {
    var r5 = I.reveniriBoti(d.clasament, [], 5).map(mo), a = I.shortBoti(d.clasament, [], 5).map(mo).filter(function (x) { return r5.indexOf(x) >= 0; });
    if (a.length) nota = "⚠ " + a.join(", ") + (a.length === 1 ? " e și pe revenire, și la short: aș sări peste ea" : " sunt și pe revenire, și la short: aș sări peste ele");
  }
  var et = function (x) { return x && x.eticheta ? " (" + x.eticheta + ")" : ""; };
  return { actiuni: ra ? (ra.length ? ra.slice(0, 3).map(ac).join(", ") : "nimic azi") : null, etA: ra && ra.length ? et(ii.dovadaReveniri) : "",
    monede: rm, short: rs, sg: !!sg, etM: dv.revenire && dv.revenire.piata && dv.revenire.piata.eticheta || "", etS: dv.short && dv.short.piata && dv.short.piata.eticheta || "",
    // v100.331 (el, 12.11): urmărirea FAȚĂ DE PIAȚĂ, pe zile, când colectorul a făcut-o; altfel cea veche (de la prețul sugestiei) + când vine cea nouă
    urmM: um.revenireFata ? acFataPiata(um.revenireFata) : um.revenire && um.revenire.text ? um.revenire.text + " · față de piață: vine la tura de dimineață" : "",
    urmS: um.shortFata ? acFataPiata(um.shortFata, true) :um.short && um.short.text ? um.short.text + " · față de piață: vine la tura de dimineață" : "", nota: nota, notaRev: notaRev };
}
// v100.331 (revizia Opus 🔴2): lărgimea de la server umple și ce umplea calculul din pagină - pliul „Lărgimea pieței, pe larg” (renderMarketBreadthV64),
// starea globală (marketBreadthV64State / window.__marketBreadthV64); null din JSON ⇒ NaN, ca pagina să scrie „—”, nu „0%”
function acLargimeDinServer(x) {
  var o = Object.assign({}, x);
  ["score", "participation", "trend", "above20", "above50", "above200", "momentum", "volume", "highLow", "coverage", "altParticipation", "benchmarkReturn"].forEach(function (k) { if (typeof o[k] !== "number" || !isFinite(o[k])) o[k] = NaN; });
  // v100.332 (auditul 12.11, 🔵): starea globală e a „Pieței analizate” (27 de cititori: alinierea semnalelor, validarea). Cu acțiunile alese acolo,
  // lărgimea CRYPTO de la server nu se mai scrie peste ea: cardul „Lărgimea crypto” o primește oricum (valoarea întoarsă), iar pliul „Lărgimea pieței,
  // pe larg” se umple cu piața aleasă, din calculul lui (ca înainte de v100.331). Pe crypto (implicit): ca până acum.
  var peCrypto = typeof assetClass !== "function" || String(assetClass() || "CRYPTO").toUpperCase() === "CRYPTO";
  if (!peCrypto) {
    if (typeof refreshMarketBreadthV64 === "function") { try { Promise.resolve(refreshMarketBreadthV64(false, false)).catch(function () {}); } catch (e) {} }
    return o;
  }
  try { if (typeof marketBreadthV64State !== "undefined") marketBreadthV64State = o; } catch (e) {}
  if (typeof window !== "undefined") window.__marketBreadthV64 = o;
  if (typeof renderMarketBreadthV64 === "function") { try { renderMarketBreadthV64(o); } catch (e) {} }
  return o;
}
// v100.331: o listă de monede față de piața din aceleași zile (colectorul: urmarireFixa, orizont 7 zile, pe zile) - fapte, fără verdict
// (regulile lui de probă: dovezile pe zile, niciun test nou nesimulat); sub 5 zile judecate sau sub 2 ferestre independente spune că e prea devreme
// revizia Opus (🔵5/6): fără nicio zi judecată spune asta (nu dispare); „mai bine decât piața” pe zilele CU piață (zileCuPiata), la short în direcția lui
function acFataPiata(u, short) {
  if (!u) return "";
  if (!(u.zile > 0) || typeof u.exces !== "number" || !isFinite(u.exces)) return "față de piață: încă nicio zi judecată (7 zile de la sugestie)";
  if (u.zile < 5 || !(u.ferestre >= 2)) return "față de piață: prea puține zile ca să se vadă ceva (" + u.zile + ")";
  var zp = u.zileCuPiata > 0 ? u.zileCuPiata : u.zile;
  var pp = (u.exces < 0 ? "−" : "+") + Math.abs(u.exces * 100).toFixed(1).replace(".", ",") + " pp", peste = Math.round((u.zilePeste || 0) * zp);
  return "față de piața din aceleași zile: " + pp + " în medie la 7 zile, mai bine decât piața" + (short ? " (pentru un short)" : "") + " în " + peste + " din " + TextRo.cate(zp, "zi", "zile");
}
// v100.295 (el, 02.11: „da scoate-le și de pe Acasă”): „Idei de azi” fără rândul acțiunilor pe trend (= ideile T212, scoase de pe Sugestii pe 01.11);
// rămân monedele liniștite pentru un bot grid. Funcție separată ca să poată fi probată (scripts/proba-v100295.mjs)
function acIdeiHtml(d, cl, aziNu) {
  var an = arguments.length > 2 ? aziNu : typeof acAziNu === "function" ? acAziNu() : null;   /* v100.306 (I-824): sub „azi nu” monedele rămân, fără tonul de sfat */
  return '<div class="acCap"><h4>Idei de azi</h4><span class="acSub">filtre, nu predicții</span></div>'
    + (an && an.nu ? acAziNuHtml(an) + '<div class="acEt">Monede liniștite (azi nu pornesc):</div>' : '<div class="acEt">Monede liniștite pentru un bot grid:</div>')
    + (cl && cl.buni.length ? '<div class="acChips">' + cl.buni.slice(0, 5).map(function (x) { return '<span>' + escapeHtml(String(x.simbol).replace(/_USDT_PERP$/, "")) + '</span>'; }).join("") + '</div>' : '<p class="acMut">Aștept clasamentul…</p>')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'gridset\',true)">Deschide Grid</button>';
}
// v100.82: butoanele din „Ce aș cumpăra azi” - deschid pagina și aduc panoul sus (fără animație)
function acasaMergiLa(ecran, id, fila) {
  if (typeof navTo === "function") navTo(ecran, true);
  if (fila && typeof t212FilaAlege === "function") t212FilaAlege(fila);   /* v100.92 (I-520): fila potrivită din panoul ideilor */
  setTimeout(function () {
    var e = $(id); if (!e || !e.getBoundingClientRect) return;
    // bara de sus e lipită (header.topStatus: ~56 px pe calculator, ~156 pe telefon) - panoul stă sub ea, să i se vadă titlul.
    // O singură derulare, instant: html are scroll-behavior:smooth, iar scrollIntoView urmat de scrollBy se anulau (pagina rămânea sus)
    var bara = document.querySelector("header.topStatus"), h = bara ? bara.getBoundingClientRect().bottom : 0;
    window.scrollTo({ top: Math.max(0, Math.round(window.scrollY + e.getBoundingClientRect().top - (h > 0 ? h + 8 : 0))), behavior: "instant" });
  }, 400);
}
// v100.186 (el 13.10: „fă idei”): moneda botului în pândă (150 perp-uri) - direcția, pragurile atinse, CONTRA botului; fără date ⇒ fără rând.
// Datele: tbLatimeKv din app.js (adus o dată la 10 minute; sosirea redesenează Acasă)
function acPandaLin(b) {
  if (typeof Latime === "undefined" || !Latime.textMoneda || typeof tbLatimeKv === "undefined") return "";
  if (typeof tbLatimeDinKv === "function") tbLatimeDinKv();
  var m = Latime.textMoneda(tbLatimeKv.d, b.simbolPionex || b.baza, b.directie, Date.now());
  if (!m) return "";
  return '<div class="acLin"><span>În pândă</span><b class="' + (m.contra ? "bad" : m.prag.length ? "tbWarn" : "acMut") + '">' + escapeHtml((m.contra ? "CONTRA botului · " : "") + m.dirText + (m.prag.length ? " · " + m.prag.join(", ") : "") + (m.vechi ? " · veche" : "")) + '</b></div>';
}
// v100.193: zilele CALENDARISTICE (ziua de la New York) până la o dată (pentru „raportează în Nz”), socotite de AZI, nu de la EOD-ul clasamentului
// (v100.196, auditul sever 🔵13: comentariul zicea „zile de bursă”, codul socotește zile calendaristice - ca pagina Sugestii)
function acZileNY(d) {
  var azi = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  var a = Date.parse(azi + "T12:00:00Z"), b = Date.parse(String(d || "") + "T12:00:00Z");
  return isFinite(a) && isFinite(b) ? Math.round((b - a) / 86400000) : null;
}
function acSym(s) { var k = String(s || "").replace(/[^A-Za-z0-9.-]/g, ""); return '<button type="button" class="acSym" data-action-click="sugLaPoarta(&#39;' + k + '&#39;)">' + escapeHtml(k) + '</button>'; }
// v100.193: „Sugestii de acțiuni · Trend 12 luni” — primele 5 din clasamentul robotului (în probă), cu saltul și raportarea
function acTrendZi(x) {
  var h = '<div class="acCap"><h4>Sugestii de acțiuni · Trend 12 luni</h4>';
  if (!x || !Array.isArray(x.top) || !x.top.length) return h + '</div><p class="acMut">Clasamentul vine o dată pe zi, după 8:00, de la robotul Trend 12 luni.</p>';
  var P1 = function (v) { return v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };
  h += '<span class="acSub">în probă · EOD ' + escapeHtml(acZiRo(x.dataUltimei)) + ' · regim ' + (!x.regim || typeof x.regim.peste !== "boolean" ? "—" : x.regim.peste ? "pornit" : "OPRIT") + '</span></div>';
  h += x.top.slice(0, 5).map(function (t) {
    var rz = t.raporteaza && t.raporteaza.d ? acZileNY(t.raporteaza.d) : null;
    return '<div class="mbRand">' + acSym(t.s) + '<span>' + escapeHtml(String(t.nume || "").slice(0, 24)) + ' · ' + escapeHtml(t.sector || "") + (t.salt && t.salt.pct >= 0.5 ? ' <span class="szChip szW">salt ' + P1(t.salt.pct) + ' într-o zi</span>' : '') + (rz != null && rz >= 0 ? ' <span class="szChip szN">raportează în ' + rz + 'z</span>' : '') + '</span>'
      + '<b class="good mbNum">12-1 ' + P1(t.m12) + '</b><span class="acMut mbRap">60 z ' + P1(t.r60) + '</span></div>';
  }).join("");
  var b = x.bilant;
  if (b && b.abatere && b.abatere.atinsa) h += '<p class="acEt"><b class="bad">ABATERE</b>: media pe ' + escapeHtml(acCate(b.abatere.k || 0, "fereastră", "ferestre")) + ' de 20 z, ' + P1(b.abatere.medie / 100) + ' față de alte acțiuni, sub pragul scris înainte (' + P1(b.abatere.prag / 100) + ') — de revăzut, nu de cumpărat.</p>';   /* v100.195 */
  h += '<div class="acLin" style="margin-top:4px"><span>' + (x.concentrare ? escapeHtml(x.concentrare.n + " din 20 " + x.concentrare.sector) + " — un singur pariu · " : "") + 'proba: ' + escapeHtml(acCate(b && b.n20 || 0, "zi", "zile")) + ' cu rezultat</span><button type="button" class="acLink" data-action-click="navTo(&#39;sugestii&#39;,true)">toate 20 în Sugestii ›</button></div>';
  return h;
}
// v100.193: „Cele mai tari pe sector · SUA” — primul din fiecare sector din topul colectorului (screenerul Nasdaq), după randamentul pe 3 luni
function acTopSector(s) {
  var h = '<div class="acCap"><h4>Cele mai tari pe sector · SUA</h4>';
  var l = s && Array.isArray(s.sectoare) ? s.sectoare.filter(function (x) { return x && Array.isArray(x.top) && x.top.length; }) : [];
  if (!l.length) return h + '</div><p class="acMut">Topul pe sectoare îl face colectorul o dată pe zi, după 8:00.</p>';
  var P1 = function (v) { return v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };
  h += '<span class="acSub">' + escapeHtml(s.univers ? acCate(s.univers, "acțiune", "acțiuni") + " ≥ 10 mld. $" : "acțiuni ≥ 10 mld. $") + ' · randament pe 3 luni</span></div>';
  h += l.slice().sort(function (a, b) { return (b.top[0].r3 || 0) - (a.top[0].r3 || 0); }).slice(0, 6).map(function (x) {
    var t = x.top[0];
    return '<div class="mbRand">' + acSym(t.s) + '<span>' + escapeHtml((x.ro || x.sector) + " · " + String(t.nume || t.s).slice(0, 26)) + '</span><b class="' + ((t.r3 || 0) >= 0 ? "good" : "bad") + ' mbNum">' + P1(t.r3) + '</b><span class="acMut mbRap">' + escapeHtml(x.top.slice(1, 3).map(function (y) { return y.s; }).join(", ")) + '</span></div>';
  }).join("");
  var i = s.istoric;
  var nL = Number(i && i.luni) || 0, nP = Number(i && i.luniPlus) || 0, med = i && isFinite(Number(i.medie)) && i.medie !== null ? Number(i.medie) : null;
  h += '<p class="acEt">' + (nL > 0 && med !== null ? "Topul Radarului pe sectoare: " + escapeHtml(acCate(nL, "lună", "luni")) + " de istoric, " + (med >= 0 ? "+" : "−") + Math.abs(med * 100).toFixed(1).replace(".", ",") + "% pe lună în medie, " + nP + " din " + nL + " pe plus — nedovedit; firmele sunt cele mari de AZI (cele căzute din top lipsesc), deci istoricul e optimist. " : "") + 'Apasă simbolul: Poarta T212.</p>';   /* v100.196 (🔵7): nota supraviețuitorilor, ca pe Sugestii */
  return h;
}
// v100.231: pauza sezonului crypto, doar după ce socoteala a rulat (necunoscut ≠ pauză). 0 = se știe că nu e pauză.
function acPauzaSezon() {
  // v100.332 (auditul 12.11, 🟡7): într-o desenare a paginii (acasa.memo, pus de acasaDeseneaza) socoteala pe toți boții închiși se face o dată -
  // era chemată de patru ori (poza zilei, cardul Crypto, „azi nu”, „Ce aș cumpăra azi”). În afara desenării (Scan, Tablou, probe): ca înainte.
  var M = typeof acasa !== "undefined" && acasa && acasa.memo && (acasa.memo.la === undefined || Date.now() - acasa.memo.la < 1000) ? acasa.memo : null;
  if (M && "pz" in M) return M.pz;
  var r = (function () {
  try {
    if (typeof ScorSezon === "undefined" || typeof scTrades !== "function") return null;
    var tr = scTrades("pionex"); if (!tr) return null;
    var cfg = typeof scStare !== "undefined" && scStare.cfg ? scStare.cfg.pionex : null;
    var s = ScorSezon.calc(tr, cfg, Date.now(), "pionex"); if (!s) return null;
    if (!s.pauza) return 0;
    return s.serie && s.serie.n > 0 ? s.serie.n : 3;
  } catch (e) { return null; }
  })();
  if (M) M.pz = r;
  return r;
}
function acFrazaPauza(n) {
  if (typeof Acasa !== "undefined" && Acasa.frazaPauza) return Acasa.frazaPauza(n);
  var k = Math.round(Number(n)); if (!(k > 0)) k = 3;
  return "N-aș porni alt bot azi: " + acCate(k, "pierdere", "pierderi") + " la rând.";
}
// v100.306 (I-824, auditul final 05.11, 🔴1): O SINGURĂ regulă „azi nu” pentru tot ce propune pornirea unui bot. Pe Acasă scria „Boți: STX, LIT
// sau CC” chiar sub „Frâna zilei… n-aș mai porni boți azi” și „N-aș porni boți grid noi” - lista verifica doar pauza sezonului. Acum trei voci:
// frâna zilei (aceeași ca pe cardul „Boții tăi”), pauza sezonului, verdictul pieței MIȘCARE (ca pe Piața azi). Frâna și piața bat lista: lista
// rămâne la vedere, sub „azi nu: <motivul>”, fără tonul de recomandare. Pur: o = { pauzaN, frana: Obiceiuri.frana(…), vreme: Acasa.vreme(…) };
// ce nu se știe (null) nu inventează un „nu”.
function acAziNuDin(o) {
  o = o || {}; var m = [], f = o.frana, v = o.vreme;
  // sumele frânei cu O zecimală (Obiceiuri.frana le scrie cu două, pentru Discord): „azi −25,0 USDT (pragul tău: −20)”
  var P = f && f.praguri || {}, dep = function (x) { return !x ? "" : x.cod === "zi" && isFinite(f.netZi) ? "azi " + acUsd(f.netZi) + " (pragul tău: −" + P.zi + ")" : x.cod === "sapt" && isFinite(f.netSapt) ? "pe 7 zile " + acUsd(f.netSapt) + " (pragul: −" + P.sapt + ")" : x.text; };
  if (f && f.activa) m.push({ cod: "frana", text: "frâna zilei e trasă: " + ((f.depasit || []).map(dep).filter(Boolean).join(", ") || "pragurile tale") });
  if (Number(o.pauzaN) > 0) m.push({ cod: "pauza", text: acCate(o.pauzaN, "pierdere", "pierderi") + " la rând (pauza sezonului)" });
  if (v && v.nivel === "miscare") m.push({ cod: "piata", text: "piața e în MIȘCARE" + (Number(v.total) > 0 ? " (" + v.inMiscare + " din " + acCate(v.total, "monedă", "monede") + " mari)" : "") });
  // v100.332 (auditul 12.11, 🔴2): clasamentul vechi (Acasa.vreme cu `la`) - candidatele rămân la vedere, fără bold: sunt cele de acum câteva ore
  if (v && v.vechi) m.push({ cod: "vechi", text: "clasamentul pieței e vechi" + (Number(v.dateLa) > 0 ? " (de la " + new Date(Number(v.dateLa)).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + ")" : "") });
  // v100.332 (auditul 12.11, 🟡3): citirea boților închiși a PICAT (nu „încă în zbor”) ⇒ frâna zilei nu se poate socoti; lista nu mai stă îngroșată ca și cum n-ar fi trasă
  if (o.franaNec === true && !(f && f.activa)) m.push({ cod: "necunoscut", text: "nu știu frâna zilei (boții închiși n-au venit)" });
  return { nu: m.length > 0, motive: m, motiv: m.map(function (x) { return x.text; }).join("; ") };
}
// verdictul pieței din aceeași sursă ca Piața azi: clasamentul + BTC pe barele de 1 h (Acasă); fără ele, BTC din clasament (ca pregătirea Tabloului)
function acVremeAziNu() {
  if (typeof Acasa === "undefined" || !Acasa.vreme) return null;
  var d = typeof acasa !== "undefined" && acasa.d || {};
  var c = d.clasament || (typeof sugStare !== "undefined" && sugStare.d && sugStare.d.clasament) || (typeof contTot !== "undefined" && contTot.clasament) || null;
  var cl = acClasamentSumar(c); if (!cl) return null;
  var btcMis = acBtcMiscare({ btc1h: d.btc1h, clasament: c });   /* v100.329: aceeași regulă ca vremea paginii (lumânările 1 h, altfel clasamentul) */
  return Acasa.vreme({ clasament: cl, btc: { miscare: btcMis } });   /* v100.332 (🔴2): vârsta clasamentului vine în `cl.la` (acClasamentSumar) */
}
// regula, din ce are pagina acum: frâna = boții închiși (contTot) + boții activi + pragurile tale (config), ca pe cardul „Boții tăi”
function acAziNu(acum) {
  var t = acum || Date.now(), fr = null, v = null, pz = null, nec = false;
  try { pz = acPauzaSezon(); } catch (e) { pz = null; }
  try {
    var ct = typeof contTot !== "undefined" ? contTot : null, inchise = ct && ct.inchiseOk ? ct.inchise : null;
    nec = !!(ct && ct.inchise && !ct.inchiseOk && Number(ct.inchiseLa) > 0);   /* v100.332 (🟡3): citirea a picat (t212-ecran pune `inchiseLa` și la picare; în zbor nu e) */
    var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : ct ? ct.boti : null;
    var cfg = typeof acasa !== "undefined" && acasa.d && acasa.d.franaCfg || (typeof grFrana !== "undefined" && grFrana.praguri) || null;
    if (typeof Obiceiuri !== "undefined" && Obiceiuri.frana && Array.isArray(inchise)) fr = Obiceiuri.frana({ trades: inchise, deschise: (boti || []).filter(function (b) { return b && b.activ; }), acum: t, praguri: cfg });
  } catch (e) { fr = null; }
  try { v = acVremeAziNu(); } catch (e) { v = null; }
  return acAziNuDin({ pauzaN: pz, frana: fr, vreme: v, franaNec: nec });
}
function acAziNuHtml(an) { return an && an.nu ? '<span class="aziNuRand">⛔ <b>Azi nu:</b> ' + escapeHtml(an.motiv) + ".</span>" : ""; }   /* span (bloc din CSS): stă și în <p> */
// v100.306: ultimul bot închis, pe un rând („XMR long 5× −2,1 USDT · joi 11:19”) - Tabloul fără bot, „Acum” pe telefon, Comportament
function acUltimInchisText(acum) {
  try {
    if (typeof contTot === "undefined" || !contTot.inchiseOk || typeof Acasa === "undefined" || !Acasa.botiStatistici) return "";
    var t = Acasa.botiStatistici(contTot.inchise, acum || Date.now()).ultim; if (!t) return "";
    var nume = String(t.moneda || "?") + (t.dir ? " " + t.dir : "") + (t.levier ? " " + t.levier + "×" : "");
    return nume + " " + acUsd(t.net) + " · " + new Date(t.inchis).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
  } catch (e) { return ""; }
}
function acZiBuc() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
// în zbor = necunoscut (nu se spune „lipsește”); cererea terminată fără raport = lipsă; peste 12 h = vechi
function acRaportStare() {
  var d = acasa.d || {};
  if (d.contRaport === undefined && !d.contRaportErr) return { stare: "necunoscut" };
  var corp = d.contRaport, c = corp && corp.cont ? corp.cont : (corp && corp.la ? corp : null);
  if (!c || !(c.la > 0)) return { stare: "lipsa" };
  if (Date.now() - c.la > 12 * 3600000) return { stare: "vechi", ore: (Date.now() - c.la) / 3600000, raport: c };
  return { stare: "ok", raport: c };
}
// undefined = calendarul încă nu e știut (în zbor, null sau eroare). "" = a venit și azi nu e nimic mare.
// v100.332 (auditul 12.11, 🔴1): calendarul venit cu `eroare` (ruta întoarce 200 cu `evenimente: []` când faireconomy nu răspunde) e tot NECUNOSCUT -
// înainte ieșea „azi nu e nimic mare”, iar banda scria „azi nu e trasă” într-o zi de CPI. (🟡2) evenimentul abia trecut rămâne frână 2 ore
// (Acasa.evenimentAzi). Cu `cuStare` întoarce { titlu, trecut } / null în loc de titlu / "" (aceeași funcție: probele vechi o încarcă după nume).
function acEvenimentAzi(cuStare) {
  var d = acasa.d || {};
  if (d.calendar === undefined || d.calendar === null || d.calendar.eroare || typeof Acasa === "undefined" || !Acasa.calendar) return undefined;
  if (Acasa.evenimentAzi) { var eo = Acasa.evenimentAzi(d.calendar.evenimente, Date.now()); return cuStare === true ? eo : eo ? eo.titlu : ""; }
  var cal = Acasa.calendar(d.calendar.evenimente, Date.now()), azi = acZiBuc();
  var ev = (cal.urmatoare || []).filter(function (x) { return x && x.mare && x.t && new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(x.t)) === azi; })[0];
  return cuStare === true ? (ev ? { titlu: ev.titlu, trecut: false } : null) : ev ? ev.titlu : "";
}
// v100.332 (🟡2): evenimentul de azi a trecut deja (fraza frânei devine „imediat după”); un acEvenimentAzi înlocuit de o probă întoarce text ⇒ fals
function acEvenimentTrecut() {
  var e; try { e = acEvenimentAzi(true); } catch (x) { e = null; }
  return !!(e && typeof e === "object" && e.trecut === true);
}
// v100.332 (🔴1 / 🟡1 / 🟡8): de ce NU se poate spune „azi nu e trasă” - raportul sau calendarul încă pe drum, calendarul căzut, raportul fără riscul
// pe o zi. "" = totul e știut. Aceeași frază în bandă, în Scan și (prin app.js) în Tabloul fără bot.
function acFranaContNec() {
  var d = acasa.d || {}, rs = acRaportStare(), ev = acEvenimentAzi(), p = [];
  var rapZbor = !rs.stare || rs.stare === "necunoscut", calErr = d.calendarErr || (d.calendar && d.calendar.eroare) || "", calZbor = ev === undefined && !calErr;
  if (rapZbor && calZbor) return "încă verific raportul contului și calendarul";
  if (rapZbor) p.push("încă verific raportul contului");
  if (calZbor) p.push("încă verific calendarul");
  if (ev === undefined && calErr) p.push("n-am calendarul de azi (" + String(calErr).replace(/[.\s]+$/, "") + "), deci nu știu dacă e un eveniment mare");
  var rn = typeof Acasa !== "undefined" && Acasa.riscNecunoscut ? Acasa.riscNecunoscut({ raportStare: rs.stare, raport: rs.raport }) : "";
  if (rn) p.push(rn);
  return p.join("; ");
}
function acExportNePotrivit() {
  try { var o = JSON.parse(localStorage.getItem("radar-export-t212-v1") || "null"); return !!(o && o.nePotrivit === true); }
  catch (e) { return false; }
}
function acFranaZileCitite() {
  try { var l = JSON.parse(localStorage.getItem("radar-frana-zile-v1") || "[]"); return Array.isArray(l) ? l : []; }
  catch (e) { return []; }
}
// Prima poză a zilei de București, doar când pauza, raportul și evenimentul sunt știute. `la` e ora primei deschideri și nu se mută. Pagina nu scrie în KV.
function acFranaSalveaza() {
  try {
    var pz = acPauzaSezon(); if (pz === null) return;
    var rs = acRaportStare(); if (!rs || !rs.stare || rs.stare === "necunoscut") return;
    var ev = acEvenimentAzi(); if (ev === undefined) return;
    var zi = acZiBuc(), lista = acFranaZileCitite();
    if (lista.some(function (x) { return x && x.z === zi; })) return;
    var snap = { z: zi, pauza: pz > 0, eveniment: ev, raportStare: rs.stare, la: Date.now() };
    if (pz > 0) snap.pauzaN = pz;
    if (rs.ore) snap.raportOre = Math.round(rs.ore);
    if (rs.raport) {
      var ab = rs.raport.reconciliere && rs.raport.reconciliere.t212 && rs.raport.reconciliere.t212.abateri;
      snap.raport = { valoare: rs.raport.valoare ? { total: rs.raport.valoare.total } : null, risc: rs.raport.risc ? { var95: rs.raport.risc.var95 } : null, reconciliere: { t212: { abateri: Array.isArray(ab) ? ab.slice(0, 40) : [] } } };
    }
    if (acExportNePotrivit()) snap.exportNePotrivit = true;
    var sideF = Acasa.fundingAtentie && acasa.d && acasa.d.piataCol ? Acasa.fundingAtentie(acasa.d.piataCol.funding) : "";
    if (sideF) snap.fundingAtentie = sideF;
    lista.push(snap);
    if (lista.length > 400) lista = lista.slice(-400);
    localStorage.setItem("radar-frana-zile-v1", JSON.stringify(lista));
  } catch (e) {}
}
// v100.329 (12.11, el: „auditează pagina azi că arată la fel verdictele și la crypto și la nasdaq” ⇒ „Ambele, o versiune”): O SINGURĂ vreme a
// pieței. Piața azi, Scan și Tabloul fără bot citesc aceleași date (acasa.d, aduse cu adresele paginii), același BTC și aceeași frână.
// Înainte Scan și Tabloul o socoteau singure, fără frână și cu BTC-ul din clasament (12.11: „Aș porni boți…” lângă frâna paginii).
var AC_VREME_MS = 10 * 60000;
var AC_VREME_SURSE = [
  ["clasament", function () { return getJSON("/api/istoric-bot?action=clasament").then(function (c) { acasa.d.clasamentStare = c && c.stare || null; return c && c.clasament || null; }); }],
  ["piata", function () { return getJSON("/api/stiri?action=piata"); }],
  ["ndx", function () { return getJSON("/api/t212?action=ndx"); }],
  ["btc1h", function () { return getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500").then(function (k) { return k && k.data && k.data.klines || null; }); }],
  ["contRaport", function () { return getJSON("/api/istoric-bot?action=cont"); }],
  ["calendar", function () { return getJSON("/api/stiri?action=calendar"); }],
  ["piataCol", function () { return getJSON("/api/istoric-bot?action=piata"); }]
];
// aduce DOAR ce lipsește sau e mai vechi de 10 minute (aceleași chei ca acasaPorneste: d[k], d[k + "La"], d[k + "Err"]); scorul sezonului
// (pauza din frână) doar când nu e deja pe dispozitiv
async function acVremeAsigura() {
  var d = acasa.d = acasa.d || {}, acum = Date.now();
  var cereri = AC_VREME_SURSE.filter(function (s) { return !(acum - (d[s[0] + "La"] || 0) < AC_VREME_MS); }).map(function (s) {
    return Promise.resolve().then(s[1]).then(function (v) { d[s[0]] = v; d[s[0] + "Err"] = null; d[s[0] + "La"] = Date.now(); },
      function (e) { d[s[0] + "Err"] = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); });
  });
  // revizia Opus: și când jurnalul e adus, dar configurația sezonului nu (deschis pe Tablou după Jurnal) - altfel pauza ieșea cu configurația implicită
  // (scStare.la.pionex = ora cererii, pusă și când serverul n-are configurație - cfg rămâne null; după cfg s-ar fi reîncărcat la fiecare 5 min)
  var faraSezon = typeof scTrades === "function" && (!scTrades("pionex") || (typeof scStare !== "undefined" && (!scStare.la || !scStare.la.pionex)));
  if (typeof scPorneste === "function" && faraSezon) cereri.push(Promise.resolve().then(scPorneste).catch(function () {}));
  await Promise.all(cereri);
  return d;
}
// BTC „în mișcare”: lumânările de o oră (ca pagina și alerta colectorului), altfel regimul BTC din clasament
function acBtcMiscare(d) {
  d = d || {};
  if (Array.isArray(d.btc1h) && d.btc1h.length && typeof GridCalcul !== "undefined") { try { var rg = GridCalcul.regimPeBare(GridCalcul.bare(d.btc1h), 4, 24); if (rg) return !!rg.miscare; } catch (e) {} }
  var b = (d.clasament && Array.isArray(d.clasament.monede) ? d.clasament.monede : []).filter(function (x) { return x && x.simbol === "BTC_USDT_PERP"; })[0];
  return !!(b && b.regim && b.regim.miscare);
}
function acVremeCrypto(d) {
  d = d || {};
  if (typeof Acasa === "undefined") return null;
  var fgO = d.piata && d.piata.fg, fgI = Acasa.fg(fgO && fgO.istoric && fgO.istoric.length ? fgO.istoric : fgO ? [fgO.valoare] : []);
  // v100.330 (el: „nu voiam verdicte la fel crypto și nasdaq”): pe card doar frânele pieței (pauza, funding-ul); frâna contului are banda ei
  // v100.332 (auditul 12.11, 🔴2): + ora clasamentului (`la`, pusă de colector) - peste ~100 de minute verdictul spune „DATE VECHI” și nu invită
  //   (ora vine prin acClasamentSumar: `la` din sumar, citit de Acasa.vreme)
  return acFraneaza(Acasa.vreme({ clasament: acClasamentSumar(d.clasament), btc: { miscare: acBtcMiscare(d) }, fg: fgI.acum, stare: d.clasamentStare }), "crypto", AC_FARA_CONT);
}
var AC_FARA_CONT = { faraCont: true };
function acVremeBursa(d) {
  d = d || {};
  if (typeof Acasa === "undefined" || typeof GridCalcul === "undefined") return null;
  // v100.332 (auditul 12.11, 🔴2): lățimea Nasdaq mai veche de 30 h (Acasa.ndxVechi, pragul Scorului zilei) nu intră în verdict - iese „lățime necunoscută”
  var ndxV = !!(d.ndx && Acasa.ndxVechi && Acasa.ndxVechi(d.ndx, Date.now()));
  var p = d.piata || {}, qqq = p.qqq ? GridCalcul.bareToate(p.qqq) : null, vixB = p.vix ? GridCalcul.bareToate(p.vix) : null, ndxL = d.ndx && Array.isArray(d.ndx.actiuni) && !ndxV ? Acasa.largimeNdx(d.ndx.actiuni) : null;
  /* v100.332 (🔴1 / 🔴2): lățimea veche și eroarea rutei burselor (Yahoo n-a dat indicele) ajung la acFraneaza, care le spune în text */
  return acFraneaza(Acasa.vremeBursa({ qqq: qqq, vix: vixB && vixB.length ? vixB[vixB.length - 1].c : null, ndx: ndxL }), "bursa", ndxV || p.eroare ? { faraCont: true, ndxVechi: ndxV, piataEroare: p.eroare || "" } : AC_FARA_CONT);   /* v100.330: doar exportul T212, frâna contului în bandă */
}
function acFraneaza(v, fel, extra) {   /* v100.330: extra = { faraCont: true } pe cardurile paginii (frâna contului are banda ei) */
  if (!v || typeof Acasa === "undefined" || !Acasa.franaVerb) return v;
  if (extra && (extra.ndxVechi || extra.piataEroare)) {   /* v100.332 (🔴1 / 🔴2): de ce lipsește lățimea sau indicele, spus pe card */
    v = Object.assign({}, v);
    if (extra.ndxVechi && v.latime === "necunoscuta") v.text = String(v.text || "").replace("Lățimea Nasdaq 100 n-a venit.", "Lățimea Nasdaq 100 e veche (peste 30 de ore), n-o folosesc.");
    if (extra.piataEroare && v.nivel === "fara-date" && !v.text) v.text = String(extra.piataEroare).slice(0, 200);
    extra = { faraCont: extra.faraCont };
  }
  var o = { fel: fel }, rs = acRaportStare(), ev = acEvenimentAzi();
  if (acExportNePotrivit()) o.exportNePotrivit = true;   // audit 23.10: exportul T212 nepotrivit e frâna cardului Nasdaq (Acasa.franaVerb o aplică doar la bursă)
  if (fel === "crypto") {
    var pz = acPauzaSezon(); if (pz > 0) { o.pauza = true; o.pauzaN = pz; }
    var sideF = Acasa.fundingAtentie && acasa.d && acasa.d.piataCol ? Acasa.fundingAtentie(acasa.d.piataCol.funding) : "";
    if (sideF) o.fundingAtentie = sideF;
  }
  if (rs.stare && rs.stare !== "necunoscut") { o.raportStare = rs.stare; if (rs.ore) o.raportOre = rs.ore; if (rs.raport) o.raport = rs.raport; }
  if (ev !== undefined) o.eveniment = ev;
  if (ev && typeof acEvenimentTrecut === "function" && acEvenimentTrecut()) o.evenimentTrecut = true;   /* v100.332 (🟡2) */
  if (extra) for (var k in extra) o[k] = extra[k];
  return Acasa.franaVerb(v, o);
}
function acMasuraLin() {
  if (typeof Acasa === "undefined" || !Acasa.masuraFranei) return "";
  var boti = null;
  try { if (typeof scTrades === "function") boti = scTrades("pionex"); } catch (e) { boti = null; }
  var loc = typeof acFranaZileCitite === "function" ? acFranaZileCitite() : [];
  var kv = acasa.d && acasa.d.contZile && Array.isArray(acasa.d.contZile.zile) ? acasa.d.contZile.zile : [];
  var zile = Acasa.unesteZileFrana ? Acasa.unesteZileFrana(loc, kv) : loc;
  var m = Acasa.masuraFranei(boti, zile);
  // v100.239: fraza de lipsă rămâne în funcție. Pe card nu ocupă loc până există o zi completă.
  if (!m || !m.text || m.complete === 0 || String(m.text).indexOf("N-am aflat:") === 0) return "";
  // v100.329 (Piața azi ca Tabloul, fără goluri): lista de ore („…, de la: 23.10 06:08, 27.10 05:16, …”, 9 rânduri la 12 zile) întindea cardul Crypto și
  // lăsa cardul Nasdaq gol pe jumătate ⇒ fraza de început e titlul unui pliu, textul întreg (cu orele) la un clic. Fraza scurtă rămâne cum era.
  // revizia Opus (🔴1): în pliu intră DOAR lista de ore (decorul); rezultatul boților și „Asta nu arată că frâna face bani” sunt fapte ⇒ la vedere.
  // Pliul deschis rămâne deschis la redesenul de 60 s (cardul se rescrie întreg).
  var t = String(m.text), i = t.indexOf(", de la:"), j = i < 0 ? -1 : t.indexOf("(ora României)", i);
  if (i < 0 || j < 0) return '<p class="acMut">' + escapeHtml(t) + "</p>";
  var ore = t.slice(i + ", de la:".length, j).trim(), rest = t.slice(j + "(ora României)".length).replace(/^\.\s*/, ""), n = (ore.match(/\d{2}\.\d{2}\.\d{4}/g) || []).length;
  var deschis = typeof document !== "undefined" && document.querySelector && !!document.querySelector("#acFranaCont details.acMasura[open]");   /* v100.330: măsura stă în banda frânei */
  return '<p class="acMut">' + escapeHtml(t.slice(0, i) + "." + (rest ? " " + rest : "")) + "</p>"
    + '<details class="acMasura"' + (deschis ? " open" : "") + "><summary>Orele celor " + acCate(n, "zi", "zile") + " ›</summary><p class=\"acMut\">" + escapeHtml(ore.replace(/[,\s]+$/, "")) + "</p></details>";
}
// v100.330 (el: „păi nu voiam verdicte la fel crypto și nasdaq” ⇒ „Fiecare cu verdictul lui”): frâna CONTULUI o singură dată - banda de deasupra
// cardurilor, linia din Scan și din Tabloul fără bot -, din aceleași date ca acFraneaza (raportul pe tot contul, evenimentul de azi)
function acFranaContText() {
  if (typeof Acasa === "undefined" || !Acasa.franaCont) return "";
  var o = {}, rs = acRaportStare(), ev = acEvenimentAzi();
  if (rs.stare && rs.stare !== "necunoscut") { o.raportStare = rs.stare; if (rs.ore) o.raportOre = rs.ore; if (rs.raport) o.raport = rs.raport; }
  if (ev !== undefined) o.eveniment = ev;
  if (ev && typeof acEvenimentTrecut === "function" && acEvenimentTrecut()) o.evenimentTrecut = true;   /* v100.332 (🟡2): „imediat după”, încă 2 ore */
  return Acasa.franaCont(o);
}
// banda: fraza frânei + măsura ei (mutată de pe cardul Crypto); fără frână azi spune asta; fără nimic de spus, goală (ascunsă)
// revizia Opus (🔵4): „azi nu e trasă” doar când știm - raportul contului a venit și calendarul s-a citit; altfel spune că încă verifică
function acFranaContStiut() {
  var rs = acRaportStare(), ev = acEvenimentAzi();
  return !!rs.stare && rs.stare !== "necunoscut" && ev !== undefined && !(typeof Acasa !== "undefined" && Acasa.riscNecunoscut && Acasa.riscNecunoscut({ raportStare: rs.stare, raport: rs.raport }));   /* v100.332 (🟡1): + riscul pe o zi știut */
}
// v100.332 (auditul 12.11, 🟡8): frâna NECUNOSCUTĂ rămâne la vedere și fără măsură (browser nou, calendar căzut) - înainte banda era goală, exact ca
// atunci când frâna nu e trasă, iar cardul invita; spune și DE CE nu se știe (acFranaContNec). Știută și netrasă, fără măsură: ascunsă, ca până acum.
function acFranaContHtml(fc, masura) {
  var stiut = typeof acFranaContStiut === "function" ? acFranaContStiut() : true;
  if (!fc && !masura && stiut) return "";
  var nec = !fc && !stiut && typeof acFranaContNec === "function" ? acFranaContNec() : "";
  return (fc ? '<div class="acFrCap">⛔ Frâna contului azi <span class="acMut">· la ambele piețe, Crypto și Nasdaq</span></div><div class="acFrTxt">' + escapeHtml(fc) + "</div>"
    : stiut ? '<div class="acFrCap acFrLiber">Frâna contului: azi nu e trasă.</div>'
    : '<div class="acFrCap acFrLiber">Frâna contului: ' + escapeHtml(nec || "încă verific raportul contului și calendarul") + '.</div>') + (masura || "");
}
// v100.277 (30.10, el: „boții tăi - față de ieri pare blocat, aș pune mai multe date, statistici”): el pornește ~8 boți pe zi, mulți ținuți
// minute; cardul arăta doar boții activi (des „Niciun bot pornit acum”). Acum: ultimul închis, ziua de azi și ultimele 7 zile (cu cele 7
// dinainte), toate pe NET (după comisioane și funding, ca Tabloul). Descriu ce s-a întâmplat, nu prezic.
// v100.279 (ideea 1): între sumă și „USDT” un spațiu care nu se rupe - pe telefon „−682,0” rămânea pe un rând și „USDT” pe următorul
function acUsd(v) { var t = acSemn(v); return t === "—" ? t : t + "\u00a0USDT"; }
function acSemn(v) { var x = Math.round(Number(v) * 10) / 10; return isFinite(x) ? (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ",") : "—"; }   /* rotunjit întâi: fără „+0,0” / „−0,0” */
function acClsUsd(v) { var x = Number(v); return !isFinite(x) || Math.abs(x) < 0.05 ? "" : x > 0 ? "good" : "bad"; }
function acNumeTrade(t) { return String(t && t.moneda || "?") + (t && t.dir ? " " + t.dir : "") + (t && t.levier ? " " + t.levier + "×" : ""); }
function acUltimInchis(t) {
  if (!t) return "";
  var cand = new Date(t.inchis).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return '<div class="acLin"><span>Ultimul închis: ' + escapeHtml(acNumeTrade(t)) + ' <span class="acMut">· a ținut ' + escapeHtml(Acasa.durataScurta((t.inchis - t.pornit) / 60000)) + " · " + escapeHtml(cand) + '</span></span><b class="' + acClsUsd(t.net) + '">' + acUsd(t.net) + "</b></div>";
}
// v100.280 (el, 30.10: „fă tot” - analiza comportamentală): contorul zilei pe pragurile frânei TALE (Grid → Poarta) - boți porniți azi,
// pe minus la rând, pierderea zilei și pe 7 zile. Aceeași frână ca alerta de pe Discord; avertizează, nu blochează („pragul e un privilegiu”).
function acFranaZileiHtml(inchise, boti, praguri, acum) {
  if (typeof Obiceiuri === "undefined" || !Obiceiuri.frana || !Array.isArray(inchise)) return "";
  var f = Obiceiuri.frana({ trades: inchise, deschise: Array.isArray(boti) ? boti : [], acum: acum, praguri: praguri }), P = f.praguri, nrP = function (x) { return String(x).replace(".", ","); };
  // v100.332 (auditul 12.11, 🟡3): când cererea configurației a picat, frâna merge pe pragurile implicite (−20 / −60 / 3 / 7) - nu le mai numește „ale tale”
  var implicite = !praguri && typeof acasa !== "undefined" && acasa && acasa.d && !!acasa.d.franaCfgErr;
  return '<div class="acLin"><span>Frâna zilei <span class="acMut">· ' + (implicite ? "pragurile implicite (ale tale n-au venit)" : "pragurile tale") + '</span></span><b class="' + (f.activa ? "bad" : "") + '">' + f.pornitiAzi + " din " + escapeHtml(acCate(P.boti, "bot", "boți")) + " · " + f.rand + " din " + P.rand + " la rând</b></div>"
    + '<p class="acMut acLinSub">Azi ' + escapeHtml(acSemn(f.netZi)) + " din −" + nrP(P.zi) + " · pe 7 zile " + escapeHtml(acSemn(f.netSapt)) + " din −" + nrP(P.sapt) + "\u00a0USDT" + (f.activa ? ". Trasă: n-aș mai porni boți azi." : ".") + "</p>";
}
// inchise: lista citită / false = citirea a picat (v100.278: nu „niciun bot”) / null = încă nu s-a citit
function acBotiStatHtml(inchise, acum) {
  if (inchise === false) return '<p class="acMut">N-am putut aduce boții închiși; reîncerc în 30 de secunde.</p>';
  if (!Array.isArray(inchise)) return '<p class="acMut">Aduc boții închiși…</p>';
  var st = Acasa.botiStatistici(inchise, acum), a = st.azi, s7 = st.sapt, p7 = st.saptAnt, h = "";
  var cifre = function (o) { return acCate(o.n, "bot închis", "boți închiși") + " · " + o.plus + " pe plus, " + o.minus + " pe minus"; };
  h += '<div class="acEt" style="margin-top:6px">Azi</div>';
  if (!a || !a.n) h += '<p class="acMut">Niciun bot închis azi.</p>';
  else {
    h += '<div class="acLin"><span>' + escapeHtml(cifre(a)) + '</span><b class="' + acClsUsd(a.net) + '">' + acUsd(a.net) + "</b></div>";
    if (a.n > 1) h += '<div class="acLin"><span>Cel mai bun · cel mai slab</span><b>' + escapeHtml(a.bun.moneda + "\u00a0" + acSemn(a.bun.net) + " · " + a.slab.moneda + "\u00a0" + acSemn(a.slab.net)) + "</b></div>";
    h += '<div class="acLin"><span>Cât țin de obicei</span><b>' + escapeHtml(Acasa.durataScurta(a.durataMin)) + "</b></div>";
  }
  h += '<div class="acEt" style="margin-top:6px">Ultimele 7 zile</div>';
  if (!s7.n) h += '<p class="acMut">Niciun bot închis în 7 zile.</p>';
  else {
    h += '<div class="acLin"><span>' + escapeHtml(cifre(s7)) + '</span><b class="' + acClsUsd(s7.net) + '">' + acUsd(s7.net) + "</b></div>";
    if (p7.n) h += '<div class="acLin"><span>Cele 7 zile dinainte <span class="acMut">· ' + escapeHtml(acCate(p7.n, "bot", "boți")) + '</span></span><b class="' + acClsUsd(p7.net) + '">' + acUsd(p7.net) + "</b></div>";
    h += acBoti7Html(st);   /* v100.279: comisioanele, monedele, scurți / lungi */
  }
  h += acZileHtml(st.zile);   /* v100.279: netul pe zile, 14 */
  return h + '<p class="acMut">Ce s-a întâmplat, nu ce urmează' + (s7.n && s7.n < 30 ? "; prea puțini boți ca să tragi concluzii" : "") + ".</p>";
}
// v100.279 (30.10, el: „super, fă toate” - ideile 2–4 de după v100.278): din ce s-a format rezultatul celor 7 zile
function acBoti7Html(st) {
  var h = "", co = st.costuri, mo = st.monede, sl = st.scurti;
  // v100.280 (ideea 3): ce au prins grilele și ce a dat poziția (realizatul = grile + poziție; netul = realizatul + comisioane + funding)
  if (co && co.nGrile) h += '<div class="acLin"><span>Grilele au prins <span class="acMut">· poziția a dat ' + escapeHtml(acUsd(co.pozitie)) + (co.nGrile < co.n ? " · fără grile la " + escapeHtml(acCate(co.n - co.nGrile, "bot", "boți")) : "") + '</span></span><b class="' + acClsUsd(co.grile) + '">' + acUsd(co.grile) + "</b></div>";
  // (4) comisioanele și funding-ul, pe un rând: cât s-a dus pe ele și ce rămânea fără ele
  if (co && co.n && co.lipsa < co.n) h += '<div class="acLin"><span>Comisioane și funding <span class="acMut">· fără ele ' + escapeHtml(acUsd(co.faraCosturi)) + (co.lipsa ? " · lipsesc la " + escapeHtml(acCate(co.lipsa, "bot", "boți")) : "") + '</span></span><b class="' + acClsUsd(co.costuri) + '">' + acUsd(co.costuri) + "</b></div>";
  // (2) pe monede, simetric: unde ai pierdut și unde ai câștigat (primele 3 din fiecare parte, cu numărul de boți)
  var lista = function (l) { return l.slice(0, 3).map(function (x, i) { return x.moneda + "\u00a0" + acSemn(x.net) + "\u00a0(" + (i ? x.n : acCate(x.n, "bot", "boți")) + ")"; }).join(" · "); };
  var suma = function (l) { return l.slice(0, 3).reduce(function (s, x) { return s + x.net; }, 0); };
  var parte = function (titlu, l) {
    if (!l.length) return "";
    return '<div class="acLin"><span>' + titlu + (l.length > 3 ? ' <span class="acMut">· primele 3 din ' + l.length + "</span>" : "") + '</span><b class="' + acClsUsd(suma(l)) + '">' + acUsd(suma(l)) + "</b></div>"
      + '<p class="acMut acLinSub">' + escapeHtml(lista(l)) + "</p>";
  };
  if (mo) h += parte("Unde ai pierdut", mo.slabe) + parte("Unde ai câștigat", mo.bune);
  // (3) scurți față de lungi, cu pragul fixat dinainte; descriptiv - pe 7 zile nu e o dovadă
  if (sl && sl.scurti.n + sl.lungi.n) {
    var rand = function (et, x) { return x.n ? '<div class="acLin"><span>' + escapeHtml(et) + ' <span class="acMut">· ' + escapeHtml(acCate(x.n, "bot", "boți") + ", " + x.plus + " pe plus · " + acSemn(x.peBot) + " pe bot") + '</span></span><b class="' + acClsUsd(x.net) + '">' + acUsd(x.net) + "</b></div>" : ""; };
    h += rand("Sub " + sl.prag + " min", sl.scurti) + rand(sl.prag + " min sau mai mult", sl.lungi)
      + '<p class="acMut acLinSub">Pragul de ' + sl.prag + " min e fixat dinainte. 7 zile nu sunt o dovadă: boții aceleiași zile se mișcă împreună.</p>";
  }
  return h;
}
// (5) netul pe fiecare din ultimele 14 zile: bare pe plus / pe minus față de linia zero (SVG în card). Semnul îl poartă poziția
// (sus / jos), culoarea doar îl repetă (verdele / roșul aplicației; la daltonism perechea nu ajunge singură - de aceea poziția și
// cifrele cu semn); cea mai proastă / cea mai bună zi scrise sub grafic; fiecare zi în tabelul pliat de dedesubt (pe telefon nu e hover).
function acZiScurta(z) { return z ? z.slice(8, 10) + "." + z.slice(5, 7) : ""; }
function acZileSvg(zile) {
  var W = 320, H = 92, SUS = 8, JOS = 74, XS = 24, n = zile.length;
  var v = zile.map(function (z) { return z.n ? z.net : 0; }), vmax = Math.max(0, Math.max.apply(null, v)), vmin = Math.min(0, Math.min.apply(null, v)), span = vmax - vmin;
  var lat = (W - XS) / n, bw = Math.max(4, Math.min(14, Math.round(lat * 0.6))), y0 = span > 0 ? SUS + (JOS - SUS) * vmax / span : (SUS + JOS) / 2, f = function (x) { return Math.round(x * 10) / 10; };
  var g = zile.map(function (z, i) {
    var cx = XS + lat * (i + 0.5), x = f(cx - bw / 2), h = span > 0 ? Math.abs(z.net) / span * (JOS - SUS) : 0, bara = "";
    if (z.n && z.net !== 0) {
      h = Math.max(1, h); var r = f(Math.min(4, bw / 2, h)), x2 = f(x + bw);
      if (z.net > 0) { var t = f(y0 - h); bara = "M" + x + "," + f(y0) + "V" + f(t + r) + "A" + r + "," + r + " 0 0 1 " + f(x + r) + "," + t + "H" + f(x2 - r) + "A" + r + "," + r + " 0 0 1 " + x2 + "," + f(t + r) + "V" + f(y0) + "Z"; }
      else { var b = f(y0 + h); bara = "M" + x + "," + f(y0) + "V" + f(b - r) + "A" + r + "," + r + " 0 0 0 " + f(x + r) + "," + b + "H" + f(x2 - r) + "A" + r + "," + r + " 0 0 0 " + x2 + "," + f(b - r) + "V" + f(y0) + "Z"; }
    }
    var titlu = (z.azi ? "azi (până acum)" : acZiScurta(z.zi)) + " · " + (z.n ? acCate(z.n, "bot închis", "boți închiși") + " · " + acUsd(z.net) : "niciun bot închis");
    return '<g class="zZi"><title>' + escapeHtml(titlu) + '</title><rect class="zHit" x="' + f(XS + lat * i) + '" y="' + (SUS - 4) + '" width="' + f(lat) + '" height="' + (JOS - SUS + 8) + '"/>'
      + (bara ? '<path class="zBar ' + (z.net > 0 ? "zPlus" : "zMinus") + '" d="' + bara + '"/>' : "") + "</g>";
  }).join("");
  var buna = zile.filter(function (z) { return z.n && z.net > 0; }).sort(function (a, b) { return b.net - a.net; })[0], rea = zile.filter(function (z) { return z.n && z.net < 0; }).sort(function (a, b) { return a.net - b.net; })[0];
  var eticheta = "Rezultatul net pe zi, ultimele " + acCate(n, "zi", "zile") + (rea ? "; cea mai proastă: " + acZiScurta(rea.zi) + " " + acUsd(rea.net) : "") + (buna ? "; cea mai bună: " + acZiScurta(buna.zi) + " " + acUsd(buna.net) : "");
  return '<svg class="acZile" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + escapeHtml(eticheta) + '">'
    + '<line class="zAx" x1="' + XS + '" y1="' + f(y0) + '" x2="' + W + '" y2="' + f(y0) + '"/><text x="' + (XS - 5) + '" y="' + f(y0 + 3.5) + '" text-anchor="end">0</text>'
    + g + '<text x="' + XS + '" y="' + (H - 3) + '">' + escapeHtml(acZiScurta(zile[0].zi)) + '</text><text x="' + W + '" y="' + (H - 3) + '" text-anchor="end">azi</text></svg>';
}
function acZileHtml(zile) {
  if (!Array.isArray(zile) || !zile.some(function (z) { return z.n; })) return "";
  var buna = zile.filter(function (z) { return z.n && z.net > 0; }).sort(function (a, b) { return b.net - a.net; })[0], rea = zile.filter(function (z) { return z.n && z.net < 0; }).sort(function (a, b) { return a.net - b.net; })[0];
  var cap = [rea ? "cea mai proastă zi " + acZiScurta(rea.zi) + " " + acUsd(rea.net) : "", buna ? "cea mai bună " + acZiScurta(buna.zi) + " " + acUsd(buna.net) : ""].filter(Boolean).join(" · ");
  var rand = zile.slice().reverse().map(function (z) { return "<tr><td>" + escapeHtml(z.azi ? "azi" : acZiScurta(z.zi)) + "</td><td>" + (z.n || "—") + '</td><td class="' + (z.n ? acClsUsd(z.net) : "") + '">' + (z.n ? acUsd(z.net) : "—") + "</td></tr>"; }).join("");
  /* v100.332 (auditul 12.11, 🔵): pliul deschis rămâne deschis la redesenare (cardul se rescrie întreg la 60 s), ca „Orele celor N zile” din banda frânei */
  var deschis = typeof document !== "undefined" && document.querySelector && !!document.querySelector("#acBoti details.acZileTab[open]");
  return '<div class="acEt" style="margin-top:6px">Pe zile · ultimele ' + zile.length + "</div>" + acZileSvg(zile)
    + (cap ? '<p class="acMut acLinSub">' + escapeHtml(cap.charAt(0).toUpperCase() + cap.slice(1)) + ".</p>" : "")
    + '<details class="acZileTab"' + (deschis ? " open" : "") + '><summary>Fiecare zi</summary><table><thead><tr><th>Ziua</th><th>Boți</th><th>Net</th></tr></thead><tbody>' + rand + "</tbody></table></details>";
}
function acasaDeseneaza() {
  if (!$("acasa") || typeof Acasa === "undefined") return;
  acasa.memo = { la: Date.now() };   /* v100.332 (🟡7): socotelile grele (pauza sezonului) o dată pe desenare; se golește la sfârșit (și singur, după o secundă) */
  acPiataInit();
  acFranaSalveaza();
  if (typeof scDeseneaza === "function") scDeseneaza();   // v100.217: scorul sezonului (din starea de acum; nu se ascunde când cardurile de mai jos își așteaptă datele)
  var d = acasa.d, cl = acClasamentSumar(d.clasament), mis = Acasa.miscari(d.tickers, { top: 60, inMiscare: cl ? cl.deEvitat.map(function (x) { return x.simbol; }) : [] });
  var btc = acBtc(d), fgO = d.piata && d.piata.fg, fgI = Acasa.fg(fgO && fgO.istoric && fgO.istoric.length ? fgO.istoric : fgO ? [fgO.valoare] : []);
  var btcMis = btc.regim ? !!btc.regim.miscare : false, larg = Acasa.largime(d.largime), p = d.piata || {};
  var ndxL = d.ndx && Array.isArray(d.ndx.actiuni) ? Acasa.largimeNdx(d.ndx.actiuni) : null, qqq = p.qqq ? GridCalcul.bareToate(p.qqq) : null, vixB = p.vix ? GridCalcul.bareToate(p.vix) : null;
  var vixU = vixB && vixB.length ? vixB[vixB.length - 1].c : null, acum = new Date();
  var pc = d.piataCol || {}, fz = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(acum);
  var sc = Acasa.schimbari({ zi: fz, fg: fgI.acum, inMiscare: cl ? cl.evita : null, vix: vixU, ndxE50: ndxL ? ndxL.e50 : null }, pc.instantanee || []);
  // v100.202 (15.10, ideea 5): „actualizat” = ora ultimei citiri BUNE a clasamentului (înainte: ora încercării, și când picase);
  // când serverul de acasă nu răspunde, rândul o spune
  var faraServer = acFaraServer(d), bunLa = d.clasamentLa || 0;
  if ($("acCand")) $("acCand").textContent = acCandText(d, acum, faraServer, bunLa);   /* v100.332 (🔴2): + ora clasamentului, nu doar ora cererii */
  var deschis = acBursaDeschisa(acum), ultZi = qqq && qqq.length ? new Date(qqq[qqq.length - 1].t).toLocaleDateString("ro-RO", { weekday: "long" }) : "";
  if ($("acBursaCand")) $("acBursaCand").textContent = deschis ? "bursa e deschisă · ultimele cifre de azi" : "închiderea de " + (ultZi || "ieri") + " · bursa se redeschide în zilele lucrătoare la " + acOraRedeschidere(acum);   /* v100.272: ora din CalendarBursa */

  // 1. doua verdicte alaturate
  // v100.199 (15.10, el: „de ce nu citește piața la deschidere” ⇒ „repară”): fără parola aplicației pe dispozitiv, serverul
  // refuză tot (401 AUTH_REQUIRED), iar cardurile scriau „Clasamentul n-a venit încă. Îl face colectorul o dată pe oră” — fals.
  // Acum spun pe față de ce nu se citește piața și unde se pune parola (aceeași regulă ca Tabloul: eroareDeParola).
  // v100.329: vremea și frâna din funcțiile comune (aceleași în Scan și în Tabloul fără bot)
  var faraParola = acFaraParola(d);
  var v = faraParola ? AC_FARA_PAROLA : faraServer && !cl ? acFaraServerVerd(d) : acVremeCrypto(d);
  // v100.330 (el: „păi nu voiam verdicte la fel crypto și nasdaq” ⇒ „Fiecare cu verdictul lui”): frâna contului o singură dată, în banda de deasupra
  // cardurilor, cu măsura ei (până acum pe cardul Crypto); cardurile își spun fiecare fraza lor
  var elFr = $("acFranaCont");
  if (elFr) { var hFr = faraParola ? "" : acFranaContHtml(acFranaContText(), acMasuraLin()); elFr.hidden = !hFr; elFr.classList.toggle("acFranaActiva", /acFrTxt/.test(hFr)); if (elFr._h !== hFr) { elFr._h = hFr; elFr.innerHTML = hFr; } }
  acasaVerd($("acVremeCrypto"), "Crypto", v, (faraParola ? AC_BUTON_PAROLA : cl ? acBare(0, [[cl.candidati, "var(--good)", "liniștite"], [cl.evita, "var(--bad)", "în mișcare"]])
    + '<div class="acLeg"><span><b class="good">' + cl.candidati + '</b> liniștite</span><span><b class="bad">' + cl.evita + '</b> în mișcare' + acIeri(sc, "inMiscare", 0, true) + '</span><span class="acMut">top 100 futures</span></div>' : ""));
  var vb = faraParola ? AC_FARA_PAROLA : faraServer && !ndxL && !qqq ? acFaraServerVerd(d) : acVremeBursa(d);
  var ndxV = !!(d.ndx && Acasa.ndxVechi && Acasa.ndxVechi(d.ndx, Date.now()));   /* v100.332 (🔴2): lățimea mai veche de 30 h nu stă sub verdict ca de azi */
  acasaVerd($("acVremeBursa"), "Nasdaq", vb, faraParola ? "" : (ndxL && !ndxV ? acBare(0, [[ndxL.e50, "var(--good)", "peste media de 50"], [ndxL.n - ndxL.e50, "var(--bad)", "sub"]])
    + '<div class="acLeg"><span><b class="good">' + ndxL.e50 + '</b> peste media de 50' + acIeri(sc, "ndxE50") + '</span><span><b class="bad">' + (ndxL.n - ndxL.e50) + '</b> sub</span><span class="acMut">Nasdaq 100</span></div>' : ""));
  // v100.82 (03.10, ideea 2): „💡 Ce aș cumpăra azi” - primele idei de acțiuni și monedele pentru un bot, cu drumul la cele două panouri
  var aziNu = acAziNu();   /* v100.306 (I-824): o singură regulă pentru „Ce aș cumpăra azi” și „Idei de azi” */
  if ($("acCumpar")) $("acCumpar").innerHTML = acasaCumpar(d, aziNu);
  // legatura dintre ele: corelatia BTC - Nasdaq pe 30 de zile
  var co = d.btc1d && qqq ? Acasa.corelatie(GridCalcul.bareToate(d.btc1d), qqq, 30) : null;
  if ($("acLegatura")) { $("acLegatura").hidden = !co; if (co) $("acLegatura").innerHTML = '🔗 <b>BTC și bursa:</b> ' + escapeHtml(co.text) + ' <span class="acMut">corelația pe ultimele ' + acCate(co.n, "zi", "zile") + ' de bursă</span>'; }

  // 2a. pulsul crypto: BTC
  var tb = mis.gasit("BTC"), te = mis.gasit("ETH"), dom = d.glob && Number(d.glob.btcDominance);
  var inch = function (rows) { return (rows || []).slice().sort(function (a, b) { return Number(a.time) - Number(b.time); }).map(function (x) { return Number(x.close); }); };
  $("acBtc").innerHTML = '<div class="acCap"><h4>BTC</h4><span class="acSub">„vremea” pieței crypto</span></div>'
    + '<div class="acVal">' + (tb ? acNr(tb.p) : "—") + ' <span class="' + (tb && tb.ch >= 0 ? "good" : "bad") + '" style="font-size:14px">' + (tb ? acPct(tb.ch) : "") + '</span></div>'
    + acSpark(inch(d.btc4h).slice(-120), "#26A96C")
    + '<div class="acLin"><span>Direcția</span><b>1 zi ' + (AC_DIR[btc.dir1d] || "—") + ' · 4h ' + (AC_DIR[btc.dir4h] || "—") + '</b></div>'
    + '<div class="acLin"><span>Mișcarea</span><b class="' + (btc.regim ? (btcMis ? "bad" : "good") : "acMut") + '">' + (btc.regim ? (btcMis ? "mișcare" : "liniște") + " · " + (btc.regim.r24h != null ? btc.regim.r24h.toFixed(1).replace(".", ",") + "× pe 24 h" : (btc.regim.r4h || 0).toFixed(1).replace(".", ",") + "× pe 4 h") : "—") + '</b></div>'   /* v100.272 (ideile auditului 29.10): cifra pe 24 h a definiției comune, nu maximul cu 4 h */
    + '<div class="acLin"><span>Dominanța BTC</span><b>' + (isFinite(dom) && dom > 0 ? dom.toFixed(1).replace(".", ",") + "%" : "—") + '</b></div>'
    + '<div class="acLin"><span>ETH</span><b>' + (te ? acNr(te.p) + ' <span class="' + (te.ch >= 0 ? "good" : "bad") + '">' + acPct(te.ch) + '</span>' : "—") + '</b></div>';
  // frica / lacomia crypto
  var fa = fgI.acum, fcls = fa == null ? "acMut" : fa >= 55 ? "warn" : fa <= 45 ? "bad" : "acMut", fnume = fa == null ? "" : Acasa.fgNume(fa);   /* v100.329: aceeași scară ca fâșia și verdictul (până acum scrisă aici) */
  $("acFg").innerHTML = '<div class="acCap"><h4>Frică / lăcomie</h4><span class="acSub">crypto · zilnic</span></div>'
    + acCadran(fa, fa == null ? null : fa / 100, "#E0524A", "#E9B949", "0", "100", "Frică și lăcomie crypto: " + (fa == null ? "fără date" : fa + ", " + fnume))
    + '<div class="acFgv"><b class="' + fcls + '">' + (fa == null ? "—" : fa) + '</b> ' + escapeHtml(fnume) + acIeri(sc, "fg") + '</div>'
    + acSpark(fgO && fgO.istoric || [], "#E9B949") + (fgI.text ? '<p class="acEt">' + escapeHtml(fgI.text) + '</p>' : '');
  // largimea crypto
  $("acLarg").innerHTML = '<div class="acCap"><h4>Lărgimea crypto</h4>' + (larg ? '<span class="' + (AC_TON[larg.ton] || "") + '" style="font-weight:800">' + escapeHtml(larg.cap) + '</span>' : '') + '</div>'
    + (larg ? larg.bare.map(function (b) { return '<div class="acLb"><span>' + escapeHtml(b.eticheta) + '</span><i><b class="' + (b.ton === "atentie" ? "w" : "") + '" style="width:' + (b.pct == null ? 0 : b.pct) + '%"></b></i><em>' + escapeHtml(b.text) + '</em></div>'; }).join("")
      + '<div class="acLin" style="margin-top:4px"><span>Maxime / minime noi</span><b>' + escapeHtml(larg.maxMin) + '</b></div>' + (larg.concluzie ? '<p class="acEt">' + escapeHtml(larg.concluzie) + '</p>' : '')
      + (pc.funding && pc.funding.text ? '<div class="acFund acFund-' + (pc.funding.ton === "atentie" ? "atentie" : "neutru") + '"><b>Funding pe piață</b> ' + escapeHtml(pc.funding.text) + '</div>' : '')
      : '<p class="acMut">' + escapeHtml(d.largimeErr ? "N-am putut citi lărgimea: " + d.largimeErr : "Calculez lărgimea pe 24 de monede…") + '</p>');

  // 2b. pulsul Nasdaq: indicele
  var serie = function (l, n) { return (l || []).slice(-(n || 63)).map(function (x) { return x.c; }); };
  var ultim = function (l) { return l && l.length ? l[l.length - 1].c : null; }, ch = function (l, k) { return l && l.length > k ? (l[l.length - 1].c / l[l.length - 1 - k].c - 1) * 100 : null; };
  // revizia Opus (🔴2): direcția din aceeași regulă ca verdictul și fâșia (sensBursa) - înainte, pe FRICĂ (VIX ≥ 30) cădea pe „trend sus”, verde, și cu indicele în jos
  var spy = p.spy ? GridCalcul.bareToate(p.spy) : null;
  var sQ = qqq ? Acasa.sensBursa(qqq) : null, dirQ = sQ === "jos" ? '<span class="bad">trend jos</span>' : sQ === "lateral" ? "lateral" : sQ === "sus" ? '<span class="good">trend sus</span>' : "—";
  $("acNasdaq").innerHTML = '<div class="acCap"><h4>Nasdaq 100</h4><span class="acSub">indicele (QQQ)</span></div>'
    + (qqq ? '<div class="acVal">' + acNr(ultim(qqq), 2) + ' <span class="' + ((ch(qqq, 1) || 0) >= 0 ? "good" : "bad") + '" style="font-size:14px">' + acPct(ch(qqq, 1)) + '</span></div>' + acSpark(serie(qqq), "#26A96C")
      + '<div class="acLin"><span>Direcția</span><b>' + dirQ + ' · 3 luni</b></div>'
      + '<div class="acLin"><span>S&amp;P 500</span><b>' + (spy ? acNr(ultim(spy), 2) + ' <span class="' + ((ch(spy, 1) || 0) >= 0 ? "good" : "bad") + '">' + acPct(ch(spy, 1)) + '</span>' : "—") + '</b></div>'
      + '<div class="acLin"><span>Ultimele 5 zile</span><b>Nasdaq <span class="' + ((ch(qqq, 5) || 0) >= 0 ? "good" : "bad") + '">' + acPct(ch(qqq, 5), 1) + '</span></b></div>'
      + (ndxL && ndxL.mag7.length ? '<div class="acLin"><span>Cele 7 mari</span><b>' + escapeHtml(ndxL.mag7Text) + '</b></div><div class="acMag">' + ndxL.mag7.map(function (x) { return '<span>' + escapeHtml(x.s) + ' <b class="' + (x.ch >= 0 ? "good" : "bad") + '">' + acPct(x.ch, 1) + '</b></span>'; }).join("") + '</div>' : '')
      : '<p class="acMut">' + escapeHtml(d.piataErr ? "Bursele n-au venit: " + d.piataErr : p.eroare ? "Bursele n-au venit: " + p.eroare : "Aduc bursele…") + '</p>');
  // VIX = frica bursei
  // v100.268 (29.10, el: „Cele din macro.js”): treapta din Macro.vixTreapta - aceeași ca rândul VIX din scorul macro (înainte „liniște” verde până la 20,
  // iar macro zicea „prudență” de la 18)
  var vt = vixU == null || typeof Macro === "undefined" || !Macro.vixTreapta ? null : Macro.vixTreapta(vixU);
  var vcls = !vt ? "acMut" : vt.scor >= 2 ? "good" : vt.scor >= -1 ? "warn" : "bad", vnume = !vt ? "" : vt.text.split(" (")[0];
  var v31 = serie(vixB, 31), vmin = v31.length ? Math.min.apply(null, v31) : null, vmax = v31.length ? Math.max.apply(null, v31) : null;
  $("acVix").innerHTML = '<div class="acCap"><h4>VIX · frica bursei</h4><span class="acSub">zilnic</span></div>'
    + acCadran(vixU, vixU == null ? null : (vixU - 10) / 30, "#26A96C", "#E0524A", "10", "40", "VIX " + (vixU == null ? "fără date" : vixU.toFixed(1).replace(".", ",") + ", " + vnume))
    + '<div class="acFgv"><b class="' + vcls + '">' + (vixU == null ? "—" : acNr(vixU, 1)) + '</b> ' + escapeHtml(vnume) + acIeri(sc, "vix", 1, true) + '</div>' + acSpark(v31, "#9FB3C4")
    + (vmin != null ? '<p class="acEt">' + v31.length + ' de zile: între ' + acNr(vmin, 1) + ' și ' + acNr(vmax, 1) + '; sub 18 e calm, 18–25 prudență, 25–30 frică, peste 30 panică.</p>' : '');
  // largimea Nasdaq 100
  var lb = function (et, n, tot, slab) { var pc = tot ? Math.round(n / tot * 100) : null; return '<div class="acLb"><span>' + et + '</span><i><b class="' + (pc != null && pc < (slab || 50) ? "w" : "") + '" style="width:' + (pc || 0) + '%"></b></i><em>' + (pc == null ? "—" : pc + "%") + '</em></div>'; };
  // ziua de BURSA a cifrelor (ultima inchidere a indicelui), nu ziua in care a rulat colectorul
  var ndxZi = qqq && qqq.length ? new Date(qqq[qqq.length - 1].t).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "short" }) : "";
  // v94: cat e bursa deschisa, colectorul reface Nasdaq 100 o data pe ora
  if (deschis && d.ndx && d.ndx.la && Date.now() - d.ndx.la < 2 * 3600000) ndxZi = "azi, la " + new Date(d.ndx.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  /* v100.332 (🔴2): lățimea mai veche de 30 h rămâne la vedere, dar cu ziua ei și „veche” - verdictul de sus nu o mai folosește */
  if (ndxV && d.ndx.la) ndxZi = new Date(d.ndx.la).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "short" });
  $("acLargNdx").innerHTML = '<div class="acCap"><h4>Lărgimea Nasdaq 100</h4>' + (ndxL && ndxV ? '<span class="warn" style="font-weight:800">veche</span>' : ndxL ? '<span class="' + (vb.nivel === "larga" ? "good" : vb.nivel === "ingusta" || vb.nivel === "lateral" ? "warn" : "bad") + '" style="font-weight:800">' + (vb.nivel === "larga" ? "largă" : vb.nivel === "ingusta" ? (vb.latime === "mixta" ? "mixtă" : "îngustă") : vb.nivel === "scade" ? "slabă" : "împărțită") + '</span>' : '') + '</div>'   /* v100.269: 40–60% „mixtă”, ca verdictul și Scorul zilei */
    + (ndxL ? '<div class="acLb"><span>Au urcat</span><i><b style="width:' + Math.round(ndxL.urca / ndxL.n * 100) + '%"></b></i><em>' + ndxL.urca + ' / ' + ndxL.n + '</em></div>'
      + lb("Peste media de 50", ndxL.e50, ndxL.n) + lb("Peste media de 200", ndxL.e200, ndxL.n) + lb("RSI peste 50", ndxL.rsi, ndxL.n)
      + '<div class="acLin" style="margin-top:4px"><span>În mișcare mare</span><b>' + ndxL.inMiscare.length + (ndxL.inMiscare.length ? ' · ' + escapeHtml(ndxL.inMiscare.slice(0, 3).join(", ")) + (ndxL.inMiscare.length > 3 ? "…" : "") : "") + '</b></div>'
      + '<p class="acEt">' + escapeHtml(ndxV ? "Datele au peste 30 de ore: verdictul de sus nu le folosește." : vb.latime === "necunoscuta" ? "" : vb.faraVix && vb.latime === "larga" ? "Majoritatea acțiunilor urcă odată cu indicele; verdictul de sus e galben doar fiindcă VIX-ul n-a venit." : vb.nivel === "ingusta" && vb.latime === "mixta" ? "Indicele urcă, dar cam jumătate din acțiuni sunt sub media de 50: urcarea nu e încă largă." : vb.nivel === "ingusta" ? "Indicele urcă, dar o bună parte din acțiuni sunt sub medii: urcarea e dusă de câteva acțiuni mari." : vb.nivel === "larga" ? "Majoritatea acțiunilor urcă odată cu indicele." : vb.nivel === "scade" ? "Majoritatea acțiunilor coboară." : "") + (ndxZi ? (/^azi/.test(ndxZi) ? " Actualizat " + ndxZi + ", o dată pe oră cât e bursa deschisă." : " Calculat la închiderea din " + ndxZi.replace(/\.$/, "") + ".") : "") + '</p>'
      : '<p class="acMut">' + escapeHtml(d.ndxErr ? "N-am lărgimea Nasdaq: " + d.ndxErr : "Lărgimea Nasdaq o calculează colectorul de pe VPS în fiecare dimineață, după ora 8.") + '</p>');

  // v95: dobanzi, dolar, aur, dolar/leu
  var macroRand = function (nume, serieB, cul, fmt, sub, invers) {
    var b = serieB ? GridCalcul.bareToate(serieB) : null, u = ultim(b), c1 = ch(b, 1);
    return '<div class="acTr"><b>' + nume + (sub ? '<span class="acMut acTrSub">' + sub + '</span>' : '') + '</b>' + acSpark(serie(b), cul, 30) + '<span class="acV">' + (u == null ? "—" : fmt(u)) + ' <span class="' + (c1 == null ? "" : (invers ? c1 <= 0 : c1 >= 0) ? "good" : "bad") + '">' + acPct(c1) + '</span></span></div>';
  };
  $("acMacro").innerHTML = '<div class="acCap"><h4>Dobânzi, dolar, aur</h4><span class="acSub">3 luni · ultima închidere</span></div>'
    + (p.tnx || p.dxy || p.aur || p.usdron ? macroRand("Dobânda SUA 10 ani", p.tnx, "#E9B949", function (v) { return acNr(v, 1) + "%"; }, "", true)
      + macroRand("Dolarul", p.dxy, "#5B8FC7", function (v) { return acNr(v, 2); }, "indicele DXY")
      + macroRand("Aurul", p.aur, "#E9B949", function (v) { return acNr(v, 0) + " $"; })
      + macroRand("Dolar / leu", p.usdron, "#9FB3C4", function (v) { return acNr(v, 4); }, "pentru T212")
      + '<p class="acEt">Dobânzi și dolar în creștere apasă de obicei și pe acțiuni, și pe crypto; aurul urcă când lumea fuge de risc.</p>'
      : '<p class="acMut">Aduc datele…</p>');
  // v100.168 (12.10, macro-dashboard mutat aici — el: „Alerta + scorul de regim macro”): scorul de regim din aceleași date (piata + btc1d)
  if ($("acRegim")) { var calReg = d.verdicte !== undefined ? d.verdicte : (d.verdicteErr ? null : undefined); $("acRegim").innerHTML = typeof Macro !== "undefined" ? Macro.htmlCard(Macro.scor({ vix: p.vix, tnx: p.tnx, dxy: p.dxy, spy: p.spy, btc: d.btc1d, fg: p.fg }, Date.now()), d.piataCol && d.piataCol.macro ? Object.assign({ la: d.piataCol.la }, d.piataCol.macro) : null, d.piataLa || d.btc1dLa || null, calReg) : ""; }   /* v100.196 (🔵3): vârsta regimului ținut ajunge la cartelă; v100.229: rândul de calibrare, când e citit */
  // v95: sectoarele Nasdaq 100 (din rezumatul zilnic al colectorului)
  var sec = ndxL && d.ndx ? Acasa.sectoare(d.ndx.actiuni) : [], smax = Math.max.apply(null, sec.map(function (x) { return Math.abs(x.ch5 || 0); }).concat([1]));
  $("acSectoare").innerHTML = '<div class="acCap"><h4>Sectoarele Nasdaq 100</h4><span class="acSub">pe 5 zile · azi</span></div>'
    + (sec.length ? sec.map(function (x) { var w = Math.round(Math.abs(x.ch5 || 0) / smax * 50); return '<div class="acSec"><span>' + escapeHtml(x.nume) + ' <span class="acMut">' + x.urca + '/' + x.n + '</span></span><i><b class="' + ((x.ch5 || 0) >= 0 ? "acSecSus" : "acSecJos") + '" style="width:' + w + '%;' + ((x.ch5 || 0) >= 0 ? "left:50%" : "right:50%") + '"></b></i><em class="' + ((x.ch5 || 0) >= 0 ? "good" : "bad") + '">' + acPct(x.ch5, 1) + '</em><em class="acMut">' + acPct(x.ch, 1) + '</em></div>'; }).join("")
      + '<p class="acEt">Cine duce indicele: sectoarele de sus au urcat cel mai mult în ultimele 5 zile; cifra gri e ultima zi.</p>' : '<p class="acMut">Vine din tura de dimineață a colectorului.</p>');
  // v100.193 (demo aprobat 14.10): Market Breadth SUA, Sugestii din Market Breadth, Scorul zilei, Trend 12 luni, Cele mai tari pe sector
  // revizia 14.10: o stricăciune în datele robotului NU oprește restul paginii (harta, mișcările, calendarul, boții); fiecare card cade singur
  var acNou = function (id, f) { var el = $(id); if (!el) return; try { el.innerHTML = f(); } catch (e) { el.innerHTML = '<p class="acMut">Nu pot arăta cardul acum: ' + escapeHtml(String(e && e.message || e)).slice(0, 120) + '</p>'; } };
  var mbX = null; try { mbX = typeof LatimeUS !== "undefined" && LatimeUS.extins && d.mbUs ? LatimeUS.extins(d.mbUs, Date.now()) : null; } catch (e) { mbX = null; }
  if (typeof LatimeUS !== "undefined" && LatimeUS.htmlCard) { acNou("acMb", function () { return LatimeUS.htmlCard(mbX); }); acNou("acMbSug", function () { return LatimeUS.htmlSugestii(mbX); }); }
  if (typeof ScorZi !== "undefined") acNou("acScorZi", function () { return ScorZi.html(ScorZi.calc({ macro: typeof Macro !== "undefined" ? Macro.scor({ vix: p.vix, tnx: p.tnx, dxy: p.dxy, spy: p.spy, btc: d.btc1d, fg: p.fg }, Date.now()) : null, macroTinut: d.piataCol && d.piataCol.macro ? Object.assign({ la: d.piataCol.la }, d.piataCol.macro) : null, ndx: ndxL ? Object.assign({ la: d.ndx && d.ndx.la }, ndxL) : null, trend: d.trend12, mbUs: mbX, latime: d.latimeKv, acum: Date.now() })); });
  acNou("acTrendZi", function () { return acTrendZi(d.trend12); });
  acNou("acTopSector", function () { return acTopSector(d.sectoareTop); });
  // v95: harta colorata - Nasdaq 100 si primele 60 de futures, dupa miscarea zilei
  var cul = function (v) { if (v == null || !isFinite(v)) return "rgba(144,160,182,.15)"; var a = Math.min(1, Math.abs(v) / 4); return v >= 0 ? "rgba(38,169,108," + (0.15 + a * 0.47).toFixed(2) + ")" : "rgba(224,82,74," + (0.15 + a * 0.47).toFixed(2) + ")"; };   /* v100.162: cel mult 0,62 - scrisul alb trece de 4,5 pe orice placă (la 0,90 verdele plin avea 2,55) */
  var patrat = function (s2, v) { return '<span class="acHp" style="background:' + cul(v) + '" title="' + escapeHtml(s2 + " " + acPct(v, 1)) + '">' + escapeHtml(s2) + '</span>'; };
  var ndxOrd = ndxL && d.ndx ? d.ndx.actiuni.slice().sort(function (a, b) { return (Acasa.SECTOR[a.s] || "~").localeCompare(Acasa.SECTOR[b.s] || "~") || b.ch - a.ch; }) : [];
  var crOrd = (Acasa.miscari(d.tickers, { top: 60 }).sus || []).length ? (function () { var m2 = Acasa.miscari(d.tickers, { top: 60 }); var l2 = []; (d.tickers || []).forEach(function (x) { var g = m2.gasit(String(x.symbol || "").replace(/_USDT_PERP$/, "")); if (g && l2.indexOf(g) < 0) l2.push(g); }); return l2.sort(function (a, b) { return b.v - a.v; }).slice(0, 60); })() : [];
  $("acHarta").innerHTML = '<div class="acCap"><h4>Harta pieței</h4><span class="acSub">verde urcă, roșu scade · cu cât mai intens, cu atât mai mult (±4% = plin)</span></div>'
    + '<div class="acHarte"><div><h5>Nasdaq 100 · pe sectoare</h5><div class="acHg">' + (ndxOrd.length ? ndxOrd.map(function (x) { return patrat(x.s, x.ch); }).join("") : '<span class="acMut">vine din tura de dimineață</span>') + '</div></div>'
    + '<div><h5>Crypto · primele 60 după volum</h5><div class="acHg">' + (crOrd.length ? crOrd.map(function (x) { return patrat(x.s, x.ch); }).join("") : '<span class="acMut">aduc prețurile…</span>') + '</div></div></div>';

  // 3. cine se misca, pe amandoua
  $("acMisca").innerHTML = '<div class="acCap"><h4>Cine se mișcă · crypto</h4><span class="acSub">top ' + (mis.n || 60) + ' futures · 24 h</span></div>'
    + (mis.n ? '<div class="acMis"><div><h5>Urcă</h5>' + acMisList(mis.sus) + '</div><div><h5>Scad</h5>' + acMisList(mis.jos) + '</div></div>'
      + '<p class="acEt">' + mis.urca + ' din ' + mis.n + ' au urcat azi.' + (cl && cl.deEvitat.length ? ' De ocolit pentru grid: ' + escapeHtml(cl.deEvitat.slice(0, 6).map(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, ""); }).join(", ")) + '.' : '') + '</p>'
      : '<p class="acMut">' + escapeHtml(d.tickersErr ? "Prețurile Pionex n-au venit: " + d.tickersErr : "Aduc prețurile…") + '</p>');
  $("acMiscaNdx").innerHTML = '<div class="acCap"><h4>Cine se mișcă · Nasdaq 100</h4><span class="acSub">' + escapeHtml(ndxZi || "ultima zi") + '</span></div>'
    + (ndxL ? '<div class="acMis"><div><h5>Urcă</h5>' + acMisList(ndxL.sus) + '</div><div><h5>Scad</h5>' + acMisList(ndxL.jos) + '</div></div>'
      + '<p class="acEt">' + ndxL.urca + ' din ' + ndxL.n + ' au urcat. „Mișcare” = mult peste mișcarea ei obișnuită de o zi.</p>' : '<p class="acMut">Vine din tura de dimineață a colectorului.</p>');

  // 3b. calendarul saptamanii + stirile
  var cal = Acasa.calendar(d.calendar && d.calendar.evenimente, Date.now());
  $("acCalendar").innerHTML = '<div class="acCap"><h4>Calendarul săptămânii</h4><span class="acSub">SUA · impact mare și mediu</span></div>'
    + (cal.urmatoare.length ? '<div class="acCal">' + cal.urmatoare.map(function (x) { return '<span class="acMut">' + escapeHtml(x.cand) + '</span><b>' + (x.mare ? "⚠️ " : "") + escapeHtml(x.titlu) + '</b><span class="acMut">' + escapeHtml(x.prognoza ? "estimat " + String(x.prognoza).replace(/(\d)\.(\d)/g, "$1,$2") : "") + '</span>'; }).join("") + '</div>' : '')
    + '<p class="acEt">' + escapeHtml(acCalendarNota(d, cal)) + '</p>';
  var st = function (l) { return (l || []).slice(0, 3).map(function (x) { var cand = x.la ? new Date(x.la).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""; return '<a class="acStire" href="' + escapeHtml(x.link) + '" target="_blank" rel="noopener noreferrer"><span class="acMut">' + escapeHtml(cand) + '</span><span data-conv-citat>' + escapeHtml(x.titlu) + '</span></a>'; }).join(""); };   /* v100.309: titlul e CITAT (al agenției, în limba ei) - garda convențiilor nu-l judecă drept rezultat */
  var sb = d.stiriBursa && d.stiriBursa.stiri, sc = d.stiriCrypto && d.stiriCrypto.general;
  $("acStiri").innerHTML = '<div class="acCap"><h4>Știri</h4><span class="acSub">titlurile cele mai noi · nu le interpretez</span></div>'
    + '<div class="acStiriGr"><h5>Crypto</h5>' + (sc && sc.length ? st(sc) : '<p class="acMut">—</p>') + '</div><div class="acStiriGr"><h5>Bursa</h5>' + (sb && sb.length ? st(sb) : '<p class="acMut">—</p>') + '</div>';

  // 4. ce inseamna pentru tine
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" ? contTot.boti : null);
  var act = (boti || []).filter(function (b) { return b && b.activ; });
  var hb = '<div class="acCap"><h4>Boții tăi</h4><span class="acSub">' + (boti ? acCate(act.length, "activ", "activi") + " · Pionex" : "aduc boții…") + '</span></div>';
  /* v100.313: „CONTEAZĂ ACUM” și pe Acasă - doar stopul (≥ 30 din 100 într-o zi) sau un rând roșu, pentru botul din Tablou (Conteaza.acasa) */
  var ctB = typeof tbStare !== "undefined" && tbStare.routeOk !== false && tbStare.bot && act.some(function (b) { return b.id === tbStare.bot.id; }) ? tbStare.bot : null;
  var ctA = ctB && typeof tbConteazaLista === "function" && typeof Conteaza !== "undefined" ? Conteaza.acasa(tbConteazaLista(ctB), String(ctB.baza || "").replace(/\.PERP$/, "")) : null;
  if (ctA) hb += '<div class="acCtLinie' + (ctA.ton === "galben" ? ' acCtGalben' : '') + '">⚠ <b>' + escapeHtml(ctA.titlu) + '</b><br>' + escapeHtml(ctA.text) + '</div>';
  act.slice(0, 4).forEach(function (b) {
    var nume = String(b.baza || "").replace(/\.PERP$/, ""), tot = Number(b.profitTotal), pr = Number(b.pretCurent), jo = Number(b.gridJos), su = Number(b.gridSus);
    var inGrid = su > jo && pr > 0 && isFinite(pr) ? Math.round((pr - jo) / (su - jo) * 100) : null, panaJos = jo > 0 && pr > 0 ? (pr / jo - 1) * 100 : null;
    var ent = d.clasament ? (d.clasament.monede || []).filter(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, "") === nume; })[0] : null, rg = !ent && d.regimBoti ? d.regimBoti[nume] : null, m2 = ent ? ent.stare === "evita" : rg ? !!rg.miscare : null;
    hb += '<div class="acLin"><span>' + escapeHtml(nume + " " + (b.directie || "") + (b.levier ? " " + b.levier + "×" : "")) + '</span><b class="' + (tot >= 0 ? "good" : "bad") + '">' + (isFinite(tot) ? (tot >= 0 ? "+" : "−") + Math.abs(tot).toFixed(1).replace(".", ",") + "\u00a0USDT" : "—") + '</b></div>'
      + '<div class="acLin"><span>Prețul în grid</span><b>' + (inGrid == null ? "—" : inGrid + "%" + (panaJos != null && panaJos >= 0 ? " · " + panaJos.toFixed(1).replace(".", ",") + "% până jos" : " · sub grid")) + '</b></div>'
      + '<div class="acLin"><span>Mediul lui</span><b class="' + (m2 === null ? "acMut" : m2 ? "bad" : "good") + '">' + (m2 === null ? "fără date" : (m2 ? "mișcare" : "liniște") + (rg ? " · " + (rg.r24h != null ? rg.r24h.toFixed(1).replace(".", ",") + "× pe 24 h" : (rg.r4h || 0).toFixed(1).replace(".", ",") + "× pe 4 h") : "")) + '</b></div>'   /* v100.272: cifra pe 24 h, ca „Mișcarea” BTC */
      + acPandaLin(b);
  });
  if (typeof tbStare !== "undefined" && tbStare.citireGoala) hb += '<p class="acMut">Citirea a venit goală: țin boții de dinainte.</p>';
  else if (boti && !act.length) hb += '<p class="acMut">Niciun bot pornit acum.</p>' + acUltimInchis(typeof contTot !== "undefined" && contTot.inchiseOk ? Acasa.botiStatistici(contTot.inchise, Date.now()).ultim : null);   /* v100.277 */
  // v95: ziua ta - fata de poza de ieri dimineata (colectorul, dupa ora 9)
  var ct = typeof t212 !== "undefined" && t212.cont && t212.cont.cash;
  var botiPeId = {}; act.forEach(function (b) { var v2 = Number(b.profitTotal); if (b.id && isFinite(v2)) botiPeId[String(b.id)] = v2; });
  var zt = Acasa.ziuaTa({ botiTotal: act.length ? act.reduce(function (s2, b) { var v2 = Number(b.profitTotal); return s2 + (isFinite(v2) ? v2 : 0); }, 0) : null, botiPeId: botiPeId, t212Total: ct ? Number(ct.total) : null }, pc.instantanee || [], fz, typeof contTot !== "undefined" ? contTot.inchise : null);   // v100.40: pe bot
  if (zt && zt.boti !== null) hb += '<div class="acLin acZi"><span>Față de ieri dimineață' + (zt.inchiseDupa ? ' <span class="acMut">· cu ' + escapeHtml(acCate(zt.inchiseDupa, "bot închis", "boți închiși")) + ' de atunci</span>' : '') + '</span><b class="' + (zt.boti >= 0 ? "good" : "bad") + '">' + (zt.boti >= 0 ? "+" : "−") + Math.abs(zt.boti).toFixed(1).replace(".", ",") + '\u00a0USDT</b></div>';   /* v100.196: rezultatele cu O SINGURĂ zecimală */
  hb += acFranaZileiHtml(typeof contTot !== "undefined" && contTot.inchiseOk ? contTot.inchise : null, act, d.franaCfg, Date.now());   /* v100.280: contorul zilei */
  hb += acBotiStatHtml(typeof contTot === "undefined" || !contTot.inchise ? null : contTot.inchiseOk ? contTot.inchise : false, Date.now());   /* v100.277: azi + 7 zile, pe net; v100.278: picat ≠ zero boți */
  $("acBoti").innerHTML = hb + '<button class="acBtn" type="button" data-action-click="navTo(\'tabloubot\',true)">Deschide Tabloul</button>';

  var c = typeof t212 !== "undefined" && t212.cont && t212.cont.cash, iesi = typeof t212 !== "undefined" ? t212.nrIesi : null, fdT = typeof t212 !== "undefined" && t212.nrFaraDate || 0, rz =d.rezultate && d.rezultate.l || [];
  var azi = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime(), zile = function (z) { return Math.round((Date.parse(z + "T00:00:00Z") - azi) / 86400000); };
  $("acT212").innerHTML = '<div class="acCap"><h4>Acțiunile tale</h4><span class="acSub">Trading 212 · ' + (deschis ? "bursa e deschisă" : "bursa e închisă") + '</span></div>'
    + (c ? '<div class="acLin"><span>Contul</span><b>' + escapeHtml(acLei(c.total)) + '</b></div><div class="acLin"><span>Pozițiile deschise</span><b class="' + (Number(c.ppl) >= 0 ? "good" : "bad") + '">' + escapeHtml(typeof t212Lei === "function" ? t212Lei(c.ppl) : String(c.ppl)) + '</b></div>'
      + '<div class="acLin"><span>Semafoare</span><b class="' + (iesi == null ? (fdT ? "warn" : "acMut") : iesi ? "bad" : "good") + '">' + (iesi == null ? (fdT ? "⚠ " + TextRo.cate(fdT, "poziție", "poziții") + " fără date" : "aduc prețurile…") : iesi ? iesi + " de ieșit" + (fdT ? " · " + TextRo.cate(fdT, "poziție", "poziții") + " fără date" : "") : "nimic roșu") + '</b></div>'   /* v100.40: null = inca nu stiu, nu „nimic roșu”; v100.332 (🔴 R1): după reîncercări, pozițiile fără prețuri se spun, nu „aduc prețurile…” la nesfârșit */
      + (zt && zt.t212 !== null ? '<div class="acLin acZi"><span>Față de ieri dimineață</span><b class="' + (zt.t212 >= 0 ? "good" : "bad") + '">' + (zt.t212 >= 0 ? "+" : "−") + escapeHtml(acLei(Math.abs(zt.t212))) + '</b></div>' : '') : '<p class="acMut">Aduc contul…</p>')
    + (rz.length ? '<div class="acEt" style="margin-top:4px">Următoarele rezultate financiare' + (rz.some(function (x) { return !x.sigur; }) ? " (estimate)" : "") + ':</div><div class="acRez">' + rz.slice(0, 3).map(function (x) { var z = zile(x.data); return '<b>' + escapeHtml(x.simbol) + '</b><span>' + escapeHtml(acZiRo(x.data)) + '</span><b class="' + (z <= 14 ? "warn" : "acMut") + '">' + (z <= 0 ? "azi" : z === 1 ? "mâine" : "peste " + acCate(z, "zi", "zile")) + '</b>'; }).join("") + '</div>' : '')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'t212\',true)">Deschide T212</button>'
    + (typeof saltAcasaHtml === "function" && typeof contTot !== "undefined" ? saltAcasaHtml(contTot.salt) : "");   // v100.126: Salt lângă T212 (rezumatul colectorului)

  $("acIdei").innerHTML = acIdeiHtml(d, cl, aziNu);   // v100.295: fără rândul ideilor T212

  // v95: socoteala alertelor de miscare (au continuat?) - apare cand colectorul a strans alerte
  var so = pc.socoteala;
  if ($("acSocoteala")) { $("acSocoteala").hidden = !(so && so.n); if (so && so.n) $("acSocoteala").innerHTML = '📏 <b>Socoteala alertelor:</b> ' + escapeHtml(so.text) + (so.textVreme ? ' ' + escapeHtml(so.textVreme) : ''); }

  acasaRezumate(larg);
  acasa.memo = null;
}
// v100.332 (auditul 12.11, 🔴2): rândul de sub titlu - „actualizat” rămâne ora ultimei citiri BUNE de la server (v100.202), iar lângă ea stă ora la care
// colectorul a FĂCUT clasamentul (serverul îl ține 6 ore: „actualizat 07:30” putea sta peste un clasament de la 02:00)
function acCandText(d, acum, faraServer, bunLa) {
  var ora = function (t) { return new Date(t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); }, citit = bunLa || (d && d.clasamentLa) || 0, facut = d && d.clasament ? Number(d.clasament.la) : 0;
  return acum.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" }) + " · actualizat " + (citit ? ora(citit) : "acum…") + (facut > 0 ? " · clasamentul de la " + ora(facut) : "") + (faraServer ? " · serverul Radarului nu răspunde acum" : "");
}
// v100.332 (auditul 12.11, 🔴1): textul de sub calendar - cererea picată SAU calendarul venit cu `eroare` (faireconomy n-a răspuns) spun că n-a venit,
// nu „Nimic important de aici până la sfârșitul săptămânii”
function acCalendarNota(d, cal) {
  var er = d && (d.calendarErr || (d.calendar && d.calendar.eroare));
  return er ? "Calendarul n-a venit: " + String(er).replace(/[.\s]+$/, "") + ". Nu știu dacă azi e un eveniment mare." : cal ? cal.text : "";
}
// bursa din SUA (ora New York): luni-vineri 9:30-16:00
// v100.272 (ideile auditului 29.10): din CalendarBursa - sărbătorile NYSE (Thanksgiving, 4 iulie…) nu mai par zile cu bursa deschisă
function acBursaDeschisa(d) {
  if (typeof CalendarBursa !== "undefined") { try { return CalendarBursa.stare(d, "SPY_US_EQ").deschisa; } catch (e) {} }
  try { var o = {}; new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
    var m = Number(o.hour) * 60 + Number(o.minute); return ["Sat", "Sun"].indexOf(o.weekday) < 0 && m >= 570 && m < 960; } catch (e) { return false; }
}
// v100.272 (ideile auditului 29.10): ora (la noi) a următoarei deschideri NYSE, din CalendarBursa - când România și SUA schimbă ora la date
// diferite (2–3 săptămâni pe an) deschiderea e la 15:30, nu la 16:30; sărbătorile NYSE se sar. Fără calendar: 16:30, ca înainte.
function acOraRedeschidere(acum) {
  try {
    var CB = CalendarBursa, B = CB.BURSE.NYSE, st = CB.stare(acum, "SPY_US_EQ"), zi = st.zi;
    if (!(st.ziDeBursa && st.minut < B.deschide)) { var t = Date.parse(zi + "T12:00:00Z"); do { t += 86400000; zi = new Date(t).toISOString().slice(0, 10); } while (!CB.eZiDeBursa(zi, "NYSE")); }
    return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(CB.inchidereLa(zi, "SPY_US_EQ") - (B.inchide - B.deschide) * 60000));
  } catch (e) { return "16:30"; }
}
// rezumatele pe un rand ale grupurilor pliate, din cifrele pe care modulele le scriu deja in pagina
function acasaRezumate(larg) {
  var t = function (id) { var e = $(id); return e ? String(e.textContent || "").trim() : ""; };
  // o bucata cu "—" / "N/A" (modulul n-a calculat inca) nu intra in rezumat
  var set = function (k, parti) { var e = $("acPlSub-" + k); if (e) e.textContent = parti.filter(function (x) { return x && !/—|N\/A/.test(x); }).join(" · ") || "deschide ca să vezi"; };
  var conf = t("heroConfidence");
  set("moneda", [t("heroCoin"), $("tf") ? $("tf").value : "", Acasa.ro(t("heroSignal")), /LONG \d/.test(conf) ? conf : "", "graficul, indicatorii, nivelurile, fluxul"]);
  set("largime", [larg ? larg.cap : "", t("breadthCoverage")]);
  set("decizii", [Acasa.ro(t("v65DashState")), t("v65DashScore") ? "calitate " + t("v65DashScore") : "", t("v65DashEntry") ? "intrare: " + Acasa.ro(t("v65DashEntry")) : "", t("v65DashKill") ? "oprire de urgență: " + Acasa.ro(t("v65DashKill")) : ""]);
  set("validare", [Acasa.ro(t("v66DashState")), t("v66DashQuality"), t("v66DashSuff") ? "date: " + Acasa.ro(t("v66DashSuff").split("·")[0]) : ""]);
  set("profit", [Acasa.ro(t("prDashState")), t("prDashN") ? t("prDashN") + " rezultate închise" : "", t("prDashPaper") ? t("prDashPaper") + " pe hârtie" : ""]);
  set("operatiuni", [Acasa.ro(t("v67DashState")), t("v67DashScore"), t("v67DashIncidents") ? t("v67DashIncidents") + " incidente" : ""]);
  set("provenienta", ["prețuri " + t("sourceSpot"), "live " + t("sourceLive"), "microstructură " + t("sourceMicro"), "derivate " + t("sourceDeriv")]);
}
// v95.1: bara de cautare (moneda, tf, "Analizeaza piata") se muta IN grupul "Analiza unei monede" cat e deschis pe Home,
// ca sa fie langa grafic, nu sus in pagina; la iesire se intoarce la locul ei (celelalte pagini o folosesc sus).
var acasaBaraLoc = null;
function acasaBara() {
  var bara = document.querySelector(".toolbar"), pl = document.getElementById("acPl-moneda"); if (!bara || !pl) return;
  if (!acasaBaraLoc) { acasaBaraLoc = document.createComment("locul barei"); bara.parentNode.insertBefore(acasaBaraLoc, bara); }
  var inGrup = document.body.classList.contains("peAcasa") && pl.open, corp = pl.querySelector(".acPlCorp");
  if (inGrup && corp && bara.parentNode !== corp) corp.insertBefore(bara, corp.firstChild);
  else if (!inGrup && bara.parentNode !== acasaBaraLoc.parentNode) acasaBaraLoc.parentNode.insertBefore(bara, acasaBaraLoc.nextSibling);
}
function acasaDeschideAnaliza() {
  var pl = document.getElementById("acPl-moneda"); if (!pl) return;
  pl.open = true; document.body.classList.add("acMonedaDeschisa"); acasaBara();
  pl.scrollIntoView({ behavior: "smooth", block: "start" });
  var s = document.getElementById("symbol"); if (s) setTimeout(function () { s.focus(); s.select(); }, 350);
}
if (typeof document !== "undefined" && document.getElementById && document.getElementById("acasa")) acPiataInit();
document.addEventListener("toggle", function (e) {
  var t = e.target; if (!t || !t.classList || !t.classList.contains("acPl")) return;
  // bara de cautare (moneda + "Analizeaza piata") apare doar cand deschizi analiza unei monede - in grupul ei
  if (t.id === "acPl-moneda") { document.body.classList.toggle("acMonedaDeschisa", t.open); acasaBara(); }
  if (typeof Acasa !== "undefined") acasaRezumate(Acasa.largime(acasa.d.largime));
}, true);
