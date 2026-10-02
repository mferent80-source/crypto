// Pagina Home "Piata azi" (v92; v93 mixt crypto + Nasdaq) - ecranul. Logica pura e in lib/acasa.js (probata in scripts/acasa-v92.mjs).
// Datele: clasamentul colectorului (miscarea pe top 100 PERP), tickerele Pionex, BTC (4h/1z/1h), frica/lacomia +
// bursele (/api/stiri?action=piata), largimea pietei (refreshMarketBreadthV64), dominanta (intel crypto_global),
// botii / contul T212 / clasamentul din contTotAsigura (aceleasi ca pe celelalte pagini, zero cereri in plus).
// v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function acCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
var acasa = { la: 0, inLucru: false, d: {} };
var ACASA_MS = 5 * 60000;

function acasaPe() { var el = $("dash"); return !!(el && el.classList.contains("on")); }
async function acasaPorneste(fortat) {
  acasaDeseneaza();
  if (acasa.inLucru || (!fortat && Date.now() - acasa.la < ACASA_MS)) return;
  acasa.inLucru = true;
  var d = acasa.d;
  var pas = async function (k, fn) { try { d[k] = await fn(); d[k + "Err"] = null; } catch (e) { d[k + "Err"] = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); } acasaDeseneaza(); };
  try {
    await Promise.all([
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),
      pas("piata", function () { return getJSON("/api/stiri?action=piata"); }),
      pas("tickers", async function () { var t = await getJSON("/api/market?type=pionex_tickers&market=PERP"); return t && t.data && t.data.tickers || null; }),
      pas("glob", function () { return intelApi("crypto_global"); }),
      pas("cont", async function () { if (typeof contTotAsigura === "function") await contTotAsigura(); return true; }),
      // v93: Nasdaq 100 (colectorul, la 8 dimineata), calendarul saptamanii, stirile
      pas("ndx", function () { return getJSON("/api/t212?action=ndx"); }),
      pas("calendar", function () { return getJSON("/api/stiri?action=calendar"); }),
      pas("stiriBursa", function () { return getJSON("/api/stiri?action=bursa"); }),
      pas("stiriCrypto", function () { return getJSON("/api/stiri?action=crypto&moneda=BTC"); }),
      // v94: funding-ul pe toata piata + pozele zilnice ("ce s-a schimbat de ieri"), de la colector
      pas("piataCol", function () { return getJSON("/api/istoric-bot?action=piata"); })
    ]);
    // BTC: 4h si 1 zi (directia), 1 ora (miscarea: 4h / 24h fata de obisnuit) - pe rand, serverul le distanteaza oricum
    await pas("btc4h", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H&limit=200"); return k && k.data && k.data.klines || null; });
    await pas("btc1d", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=200"); return k && k.data && k.data.klines || null; });
    await pas("btc1h", async function () { var k = await getJSON("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500"); return k && k.data && k.data.klines || null; });
    await pas("largime", function () { return typeof refreshMarketBreadthV64 === "function" ? refreshMarketBreadthV64(false, false) : null; });
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
      for (var i = 0; i < l.length && i < 12; i++) { try { var r = await getJSON("/api/t212?action=rezultate&ticker=" + encodeURIComponent(l[i])); if (r && r.data) o.l.push({ simbol: r.simbol || l[i].split("_")[0], data: r.data, sigur: !!r.sigur }); } catch (e) {} }
      o.l.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      return o;
    });
    acasa.la = d.clasament && d.piata && d.tickers ? Date.now() : Date.now() - ACASA_MS + 30000;
  } finally { acasa.inLucru = false; }
  acasaDeseneaza();
}
setInterval(function () { if (acasaPe() && !document.hidden) acasaPorneste(false); }, 60000);

// ---------------- desenarea ----------------
var AC_TON = { bine: "good", rau: "bad", atentie: "warn", neutru: "acMut", lipsa: "acMut" };
function acLei(v) { return typeof t212Suma === "function" ? t212Suma(v) : Number(v).toFixed(0) + " lei"; }
function acPct(v, z) { if (v == null || !isFinite(v)) return "—"; return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(z == null ? 2 : z).replace(".", ",") + "%"; }
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
  m.forEach(function (x) { if (x.stare === "evita") { o.evita++; o.deEvitat.push(x); } else if (x.stare === "candidat") { o.candidati++; o.buni.push(x); } else o.faraDate++; if (o.dir[x.dir] != null) o.dir[x.dir]++; });
  o.deEvitat.sort(function (a, b) { var ra = a.regim ? Math.max(a.regim.r4h || 0, a.regim.r24h || 0) : 0, rb = b.regim ? Math.max(b.regim.r4h || 0, b.regim.r24h || 0) : 0; return rb - ra; });
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

function acasaVerd(el, piata, v, extra) {
  if (!el) return;
  el.className = "acVerd acVerd-" + v.nivel;
  el.innerHTML = '<div class="acPiata">' + piata + '</div><div class="acNiv acNiv-' + v.nivel + '">' + escapeHtml(v.eticheta) + '</div><p><b>' + escapeHtml(v.titlu) + '</b></p>' + (v.text ? '<p class="acMut">' + escapeHtml(v.text) + '</p>' : '')
    + (extra || '') + (v.faCe ? '<div class="acFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(v.faCe) + '</div>' : '');
}
function acCadran(val, f, cul0, cul1, et0, et1, eticheta) {
  var ung = f == null ? Math.PI / 2 : Math.PI * (1 - Math.max(0, Math.min(1, f))), ax = 110 + 76 * Math.cos(ung), ay = 110 - 76 * Math.sin(ung), id = "acG" + Math.random().toString(36).slice(2, 7);
  return '<svg class="acCadran" viewBox="0 0 220 124" role="img" aria-label="' + escapeHtml(eticheta) + '"><defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="' + cul0 + '"/><stop offset=".5" stop-color="#90a0b6"/><stop offset="1" stop-color="' + cul1 + '"/></linearGradient></defs>'
    + '<path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="url(#' + id + ')" stroke-width="14" stroke-linecap="round" opacity=".85"/>'
    + (f == null ? '' : '<line x1="110" y1="110" x2="' + ax.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="#f5f7fb" stroke-width="3" stroke-linecap="round"/>') + '<circle cx="110" cy="110" r="6" fill="#f5f7fb"/>'
    + '<text x="20" y="123" fill="#90a0b6" font-size="10" text-anchor="middle">' + et0 + '</text><text x="200" y="123" fill="#90a0b6" font-size="10" text-anchor="middle">' + et1 + '</text></svg>';
}
function acMisList(l) { return l.map(function (x) { return '<div class="acMr"><span>' + escapeHtml(x.s) + (x.miscare ? '<span class="acTag">mișcare</span>' : '') + '</span><b class="' + (x.ch >= 0 ? "good" : "bad") + '">' + acPct(x.ch, 1) + '</b></div>'; }).join(""); }
// v94: "fata de ieri" - sageata si diferenta, din pozele zilnice ale colectorului
function acIeri(sc, k, z, invers) {
  var x = sc && sc[k]; if (!x) return "";
  var bine = x.d === 0 ? null : invers ? x.d < 0 : x.d > 0;
  return ' <span class="acIeri ' + (bine === null ? "acMut" : bine ? "good" : "bad") + '" title="față de ieri: ' + escapeHtml(String(x.de).replace(".", ",")) + '">' + x.sag + (x.d ? " " + Math.abs(x.d).toFixed(z || 0).replace(".", ",") : "") + '</span>';
}
function acZiRo(z) { var d = new Date(z + "T12:00:00Z"); return isFinite(d) ? d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" }) : z; }

function acasaDeseneaza() {
  if (!$("acasa") || typeof Acasa === "undefined") return;
  var d = acasa.d, cl = acClasamentSumar(d.clasament), mis = Acasa.miscari(d.tickers, { top: 60, inMiscare: cl ? cl.deEvitat.map(function (x) { return x.simbol; }) : [] });
  var btc = acBtc(d), fgO = d.piata && d.piata.fg, fgI = Acasa.fg(fgO && fgO.istoric && fgO.istoric.length ? fgO.istoric : fgO ? [fgO.valoare] : []);
  var btcMis = btc.regim ? !!btc.regim.miscare : false, larg = Acasa.largime(d.largime), p = d.piata || {};
  var ndxL = d.ndx && Array.isArray(d.ndx.actiuni) ? Acasa.largimeNdx(d.ndx.actiuni) : null, qqq = p.qqq ? GridCalcul.bareToate(p.qqq) : null, vixB = p.vix ? GridCalcul.bareToate(p.vix) : null;
  var vixU = vixB && vixB.length ? vixB[vixB.length - 1].c : null, acum = new Date();
  var pc = d.piataCol || {}, fz = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(acum);
  var sc = Acasa.schimbari({ zi: fz, fg: fgI.acum, inMiscare: cl ? cl.evita : null, vix: vixU, ndxE50: ndxL ? ndxL.e50 : null }, pc.instantanee || []);
  if ($("acCand")) $("acCand").textContent = acum.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" }) + " · actualizat " + (acasa.la ? new Date(acasa.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "acum…");
  var deschis = acBursaDeschisa(acum), ultZi = qqq && qqq.length ? new Date(qqq[qqq.length - 1].t).toLocaleDateString("ro-RO", { weekday: "long" }) : "";
  if ($("acBursaCand")) $("acBursaCand").textContent = deschis ? "bursa e deschisă · ultimele cifre de azi" : "închiderea de " + (ultZi || "ieri") + " · bursa se redeschide în zilele lucrătoare la 16:30";

  // 1. doua verdicte alaturate
  var v = Acasa.vreme({ clasament: cl, btc: { miscare: btcMis }, fg: fgI.acum });
  acasaVerd($("acVremeCrypto"), "Crypto", v, cl ? acBare(0, [[cl.candidati, "var(--good)", "liniștite"], [cl.evita, "var(--bad)", "în mișcare"]])
    + '<div class="acLeg"><span><b class="good">' + cl.candidati + '</b> liniștite</span><span><b class="bad">' + cl.evita + '</b> în mișcare' + acIeri(sc, "inMiscare", 0, true) + '</span><span class="acMut">top 100 futures</span></div>' : "");
  var vb = Acasa.vremeBursa({ qqq: qqq, vix: vixU, ndx: ndxL });
  acasaVerd($("acVremeBursa"), "Nasdaq", vb, ndxL ? acBare(0, [[ndxL.e50, "var(--good)", "peste media de 50"], [ndxL.n - ndxL.e50, "var(--bad)", "sub"]])
    + '<div class="acLeg"><span><b class="good">' + ndxL.e50 + '</b> peste media de 50' + acIeri(sc, "ndxE50") + '</span><span><b class="bad">' + (ndxL.n - ndxL.e50) + '</b> sub</span><span class="acMut">Nasdaq 100</span></div>' : "");
  // legatura dintre ele: corelatia BTC - Nasdaq pe 30 de zile
  var co = d.btc1d && qqq ? Acasa.corelatie(GridCalcul.bareToate(d.btc1d), qqq, 30) : null;
  if ($("acLegatura")) { $("acLegatura").hidden = !co; if (co) $("acLegatura").innerHTML = '🔗 <b>BTC și bursa:</b> ' + escapeHtml(co.text) + ' <span class="acMut">corelația pe ultimele ' + acCate(co.n, "zi", "zile") + ' de bursă</span>'; }

  // 2a. pulsul crypto: BTC
  var tb = mis.gasit("BTC"), te = mis.gasit("ETH"), dom = d.glob && Number(d.glob.btcDominance);
  var inch = function (rows) { return (rows || []).slice().sort(function (a, b) { return Number(a.time) - Number(b.time); }).map(function (x) { return Number(x.close); }); };
  $("acBtc").innerHTML = '<div class="acCap"><h4>BTC</h4><span class="acSub">„vremea” pieței crypto</span></div>'
    + '<div class="acVal">' + (tb ? acNr(tb.p) : "—") + ' <span class="' + (tb && tb.ch >= 0 ? "good" : "bad") + '" style="font-size:14px">' + (tb ? acPct(tb.ch) : "") + '</span></div>'
    + acSpark(inch(d.btc4h).slice(-120), "#55d89b")
    + '<div class="acLin"><span>Direcția</span><b>1 zi ' + (AC_DIR[btc.dir1d] || "—") + ' · 4h ' + (AC_DIR[btc.dir4h] || "—") + '</b></div>'
    + '<div class="acLin"><span>Mișcarea</span><b class="' + (btc.regim ? (btcMis ? "bad" : "good") : "acMut") + '">' + (btc.regim ? (btcMis ? "mișcare" : "liniște") + " · " + Math.max(btc.regim.r4h || 0, btc.regim.r24h || 0).toFixed(1).replace(".", ",") + "×" : "—") + '</b></div>'
    + '<div class="acLin"><span>Dominanța BTC</span><b>' + (isFinite(dom) && dom > 0 ? dom.toFixed(1).replace(".", ",") + "%" : "—") + '</b></div>'
    + '<div class="acLin"><span>ETH</span><b>' + (te ? acNr(te.p) + ' <span class="' + (te.ch >= 0 ? "good" : "bad") + '">' + acPct(te.ch) + '</span>' : "—") + '</b></div>';
  // frica / lacomia crypto
  var fa = fgI.acum, fcls = fa == null ? "acMut" : fa >= 55 ? "warn" : fa <= 45 ? "bad" : "acMut", fnume = fa == null ? "" : fa >= 75 ? "lăcomie extremă" : fa >= 55 ? "lăcomie" : fa <= 25 ? "frică extremă" : fa <= 45 ? "frică" : "neutru";
  $("acFg").innerHTML = '<div class="acCap"><h4>Frică / lăcomie</h4><span class="acSub">crypto · zilnic</span></div>'
    + acCadran(fa, fa == null ? null : fa / 100, "#ff6b78", "#f5c451", "0", "100", "Frică și lăcomie crypto: " + (fa == null ? "fără date" : fa + ", " + fnume))
    + '<div class="acFgv"><b class="' + fcls + '">' + (fa == null ? "—" : fa) + '</b> ' + escapeHtml(fnume) + acIeri(sc, "fg") + '</div>'
    + acSpark(fgO && fgO.istoric || [], "#f5c451") + (fgI.text ? '<p class="acEt">' + escapeHtml(fgI.text) + '</p>' : '');
  // largimea crypto
  $("acLarg").innerHTML = '<div class="acCap"><h4>Lărgimea crypto</h4>' + (larg ? '<span class="' + (AC_TON[larg.ton] || "") + '" style="font-weight:800">' + escapeHtml(larg.cap) + '</span>' : '') + '</div>'
    + (larg ? larg.bare.map(function (b) { return '<div class="acLb"><span>' + escapeHtml(b.eticheta) + '</span><i><b class="' + (b.ton === "atentie" ? "w" : "") + '" style="width:' + (b.pct == null ? 0 : b.pct) + '%"></b></i><em>' + escapeHtml(b.text) + '</em></div>'; }).join("")
      + '<div class="acLin" style="margin-top:4px"><span>Maxime / minime noi</span><b>' + escapeHtml(larg.maxMin) + '</b></div>' + (larg.concluzie ? '<p class="acEt">' + escapeHtml(larg.concluzie) + '</p>' : '')
      + (pc.funding && pc.funding.text ? '<div class="acFund acFund-' + (pc.funding.ton === "atentie" ? "atentie" : "neutru") + '"><b>Funding pe piață</b> ' + escapeHtml(pc.funding.text) + '</div>' : '')
      : '<p class="acMut">' + escapeHtml(d.largimeErr ? "N-am putut citi lărgimea: " + d.largimeErr : "Calculez lărgimea pe 24 de monede…") + '</p>');

  // 2b. pulsul Nasdaq: indicele
  var serie = function (l, n) { return (l || []).slice(-(n || 63)).map(function (x) { return x.c; }); };
  var ultim = function (l) { return l && l.length ? l[l.length - 1].c : null; }, ch = function (l, k) { return l && l.length > k ? (l[l.length - 1].c / l[l.length - 1 - k].c - 1) * 100 : null; };
  var spy = p.spy ? GridCalcul.bareToate(p.spy) : null, dirQ = vb.nivel === "scade" ? '<span class="bad">trend jos</span>' : vb.nivel === "lateral" ? "lateral" : vb.nivel === "fara-date" ? "—" : '<span class="good">trend sus</span>';
  $("acNasdaq").innerHTML = '<div class="acCap"><h4>Nasdaq 100</h4><span class="acSub">indicele (QQQ)</span></div>'
    + (qqq ? '<div class="acVal">' + acNr(ultim(qqq), 2) + ' <span class="' + ((ch(qqq, 1) || 0) >= 0 ? "good" : "bad") + '" style="font-size:14px">' + acPct(ch(qqq, 1)) + '</span></div>' + acSpark(serie(qqq), "#55d89b")
      + '<div class="acLin"><span>Direcția</span><b>' + dirQ + ' · 3 luni</b></div>'
      + '<div class="acLin"><span>S&amp;P 500</span><b>' + (spy ? acNr(ultim(spy), 2) + ' <span class="' + ((ch(spy, 1) || 0) >= 0 ? "good" : "bad") + '">' + acPct(ch(spy, 1)) + '</span>' : "—") + '</b></div>'
      + '<div class="acLin"><span>Ultimele 5 zile</span><b>Nasdaq <span class="' + ((ch(qqq, 5) || 0) >= 0 ? "good" : "bad") + '">' + acPct(ch(qqq, 5), 1) + '</span></b></div>'
      + (ndxL && ndxL.mag7.length ? '<div class="acLin"><span>Cele 7 mari</span><b>' + escapeHtml(ndxL.mag7Text) + '</b></div><div class="acMag">' + ndxL.mag7.map(function (x) { return '<span>' + escapeHtml(x.s) + ' <b class="' + (x.ch >= 0 ? "good" : "bad") + '">' + acPct(x.ch, 1) + '</b></span>'; }).join("") + '</div>' : '')
      : '<p class="acMut">' + escapeHtml(d.piataErr ? "Bursele n-au venit: " + d.piataErr : "Aduc bursele…") + '</p>');
  // VIX = frica bursei
  var vcls = vixU == null ? "acMut" : vixU < 20 ? "good" : vixU < 30 ? "warn" : "bad", vnume = vixU == null ? "" : vixU < 15 ? "liniște mare" : vixU < 20 ? "liniște" : vixU < 30 ? "teamă" : "panică";
  var v31 = serie(vixB, 31), vmin = v31.length ? Math.min.apply(null, v31) : null, vmax = v31.length ? Math.max.apply(null, v31) : null;
  $("acVix").innerHTML = '<div class="acCap"><h4>VIX · frica bursei</h4><span class="acSub">zilnic</span></div>'
    + acCadran(vixU, vixU == null ? null : (vixU - 10) / 30, "#55d89b", "#ff6b78", "10", "40", "VIX " + (vixU == null ? "fără date" : vixU.toFixed(2) + ", " + vnume))
    + '<div class="acFgv"><b class="' + vcls + '">' + (vixU == null ? "—" : acNr(vixU, 2)) + '</b> ' + escapeHtml(vnume) + acIeri(sc, "vix", 1, true) + '</div>' + acSpark(v31, "#90a0b6")
    + (vmin != null ? '<p class="acEt">' + v31.length + ' de zile: între ' + acNr(vmin, 1) + ' și ' + acNr(vmax, 1) + '; sub 20 bursa e liniștită, peste 30 e panică.</p>' : '');
  // largimea Nasdaq 100
  var lb = function (et, n, tot, slab) { var pc = tot ? Math.round(n / tot * 100) : null; return '<div class="acLb"><span>' + et + '</span><i><b class="' + (pc != null && pc < (slab || 50) ? "w" : "") + '" style="width:' + (pc || 0) + '%"></b></i><em>' + (pc == null ? "—" : pc + "%") + '</em></div>'; };
  // ziua de BURSA a cifrelor (ultima inchidere a indicelui), nu ziua in care a rulat colectorul
  var ndxZi = qqq && qqq.length ? new Date(qqq[qqq.length - 1].t).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "short" }) : "";
  // v94: cat e bursa deschisa, colectorul reface Nasdaq 100 o data pe ora
  if (deschis && d.ndx && d.ndx.la && Date.now() - d.ndx.la < 2 * 3600000) ndxZi = "azi, la " + new Date(d.ndx.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  $("acLargNdx").innerHTML = '<div class="acCap"><h4>Lărgimea Nasdaq 100</h4>' + (ndxL ? '<span class="' + (vb.nivel === "larga" ? "good" : vb.nivel === "ingusta" || vb.nivel === "lateral" ? "warn" : "bad") + '" style="font-weight:800">' + (vb.nivel === "larga" ? "largă" : vb.nivel === "ingusta" ? "îngustă" : vb.nivel === "scade" ? "slabă" : "împărțită") + '</span>' : '') + '</div>'
    + (ndxL ? '<div class="acLb"><span>Au urcat</span><i><b style="width:' + Math.round(ndxL.urca / ndxL.n * 100) + '%"></b></i><em>' + ndxL.urca + ' / ' + ndxL.n + '</em></div>'
      + lb("Peste media de 50", ndxL.e50, ndxL.n) + lb("Peste media de 200", ndxL.e200, ndxL.n) + lb("RSI peste 50", ndxL.rsi, ndxL.n)
      + '<div class="acLin" style="margin-top:4px"><span>În mișcare mare</span><b>' + ndxL.inMiscare.length + (ndxL.inMiscare.length ? ' · ' + escapeHtml(ndxL.inMiscare.slice(0, 3).join(", ")) + (ndxL.inMiscare.length > 3 ? "…" : "") : "") + '</b></div>'
      + '<p class="acEt">' + escapeHtml(vb.nivel === "ingusta" ? "Indicele urcă, dar o bună parte din acțiuni sunt sub medii: urcarea e dusă de câteva acțiuni mari." : vb.nivel === "larga" ? "Majoritatea acțiunilor urcă odată cu indicele." : vb.nivel === "scade" ? "Majoritatea acțiunilor coboară." : "") + (ndxZi ? (/^azi/.test(ndxZi) ? " Actualizat " + ndxZi + ", o dată pe oră cât e bursa deschisă." : " Calculat la închiderea din " + ndxZi.replace(/\.$/, "") + ".") : "") + '</p>'
      : '<p class="acMut">' + escapeHtml(d.ndxErr ? "N-am lărgimea Nasdaq: " + d.ndxErr : "Lărgimea Nasdaq o calculează colectorul de acasă în fiecare dimineață, după ora 8.") + '</p>');

  // v95: dobanzi, dolar, aur, dolar/leu
  var macroRand = function (nume, serieB, cul, fmt, sub, invers) {
    var b = serieB ? GridCalcul.bareToate(serieB) : null, u = ultim(b), c1 = ch(b, 1);
    return '<div class="acTr"><b>' + nume + (sub ? '<span class="acMut acTrSub">' + sub + '</span>' : '') + '</b>' + acSpark(serie(b), cul, 30) + '<span class="acV">' + (u == null ? "—" : fmt(u)) + ' <span class="' + (c1 == null ? "" : (invers ? c1 <= 0 : c1 >= 0) ? "good" : "bad") + '">' + acPct(c1) + '</span></span></div>';
  };
  $("acMacro").innerHTML = '<div class="acCap"><h4>Dobânzi, dolar, aur</h4><span class="acSub">3 luni · ultima închidere</span></div>'
    + (p.tnx || p.dxy || p.aur || p.usdron ? macroRand("Dobânda SUA 10 ani", p.tnx, "#f5c451", function (v) { return acNr(v, 2) + "%"; }, "", true)
      + macroRand("Dolarul", p.dxy, "#69a7ff", function (v) { return acNr(v, 2); }, "indicele DXY")
      + macroRand("Aurul", p.aur, "#f5c451", function (v) { return acNr(v, 0) + " $"; })
      + macroRand("Dolar / leu", p.usdron, "#90a0b6", function (v) { return acNr(v, 4); }, "pentru T212")
      + '<p class="acEt">Dobânzi și dolar în creștere apasă de obicei și pe acțiuni, și pe crypto; aurul urcă când lumea fuge de risc.</p>'
      : '<p class="acMut">Aduc datele…</p>');
  // v95: sectoarele Nasdaq 100 (din rezumatul zilnic al colectorului)
  var sec = ndxL && d.ndx ? Acasa.sectoare(d.ndx.actiuni) : [], smax = Math.max.apply(null, sec.map(function (x) { return Math.abs(x.ch5 || 0); }).concat([1]));
  $("acSectoare").innerHTML = '<div class="acCap"><h4>Sectoarele Nasdaq 100</h4><span class="acSub">pe 5 zile · azi</span></div>'
    + (sec.length ? sec.map(function (x) { var w = Math.round(Math.abs(x.ch5 || 0) / smax * 50); return '<div class="acSec"><span>' + escapeHtml(x.nume) + ' <span class="acMut">' + x.urca + '/' + x.n + '</span></span><i><b class="' + ((x.ch5 || 0) >= 0 ? "acSecSus" : "acSecJos") + '" style="width:' + w + '%;' + ((x.ch5 || 0) >= 0 ? "left:50%" : "right:50%") + '"></b></i><em class="' + ((x.ch5 || 0) >= 0 ? "good" : "bad") + '">' + acPct(x.ch5, 1) + '</em><em class="acMut">' + acPct(x.ch, 1) + '</em></div>'; }).join("")
      + '<p class="acEt">Cine duce indicele: sectoarele de sus au urcat cel mai mult în ultimele 5 zile; cifra gri e ultima zi.</p>' : '<p class="acMut">Vine din tura de dimineață a colectorului.</p>');
  // v95: harta colorata - Nasdaq 100 si primele 60 de futures, dupa miscarea zilei
  var cul = function (v) { if (v == null || !isFinite(v)) return "rgba(144,160,182,.15)"; var a = Math.min(1, Math.abs(v) / 4); return v >= 0 ? "rgba(85,216,155," + (0.15 + a * 0.75).toFixed(2) + ")" : "rgba(255,107,120," + (0.15 + a * 0.75).toFixed(2) + ")"; };
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
    + (cal.urmatoare.length ? '<div class="acCal">' + cal.urmatoare.map(function (x) { return '<span class="acMut">' + escapeHtml(x.cand) + '</span><b>' + (x.mare ? "⚠️ " : "") + escapeHtml(x.titlu) + '</b><span class="acMut">' + escapeHtml(x.prognoza ? "estimat " + x.prognoza : "") + '</span>'; }).join("") + '</div>' : '')
    + '<p class="acEt">' + escapeHtml(d.calendarErr ? "Calendarul n-a venit: " + d.calendarErr : cal.text) + '</p>';
  var st = function (l) { return (l || []).slice(0, 3).map(function (x) { var cand = x.la ? new Date(x.la).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : ""; return '<a class="acStire" href="' + escapeHtml(x.link) + '" target="_blank" rel="noopener noreferrer"><span class="acMut">' + escapeHtml(cand) + '</span>' + escapeHtml(x.titlu) + '</a>'; }).join(""); };
  var sb = d.stiriBursa && d.stiriBursa.stiri, sc = d.stiriCrypto && d.stiriCrypto.general;
  $("acStiri").innerHTML = '<div class="acCap"><h4>Știri</h4><span class="acSub">titlurile cele mai noi · nu le interpretez</span></div>'
    + '<div class="acStiriGr"><h5>Crypto</h5>' + (sc && sc.length ? st(sc) : '<p class="acMut">—</p>') + '</div><div class="acStiriGr"><h5>Bursa</h5>' + (sb && sb.length ? st(sb) : '<p class="acMut">—</p>') + '</div>';

  // 4. ce inseamna pentru tine
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" ? contTot.boti : null);
  var act = (boti || []).filter(function (b) { return b && b.activ; });
  var hb = '<div class="acCap"><h4>Boții tăi</h4><span class="acSub">' + (boti ? acCate(act.length, "activ", "activi") + " · Pionex" : "aduc boții…") + '</span></div>';
  act.slice(0, 4).forEach(function (b) {
    var nume = String(b.baza || "").replace(/\.PERP$/, ""), tot = Number(b.profitTotal), pr = Number(b.pretCurent), jo = Number(b.gridJos), su = Number(b.gridSus);
    var inGrid = su > jo && isFinite(pr) ? Math.round((pr - jo) / (su - jo) * 100) : null, panaJos = jo > 0 && pr > 0 ? (pr / jo - 1) * 100 : null;
    var ent = d.clasament ? (d.clasament.monede || []).filter(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, "") === nume; })[0] : null, rg = !ent && d.regimBoti ? d.regimBoti[nume] : null, m2 = ent ? ent.stare === "evita" : rg ? !!rg.miscare : null;
    hb += '<div class="acLin"><span>' + escapeHtml(nume + " " + (b.directie || "") + (b.levier ? " " + b.levier + "×" : "")) + '</span><b class="' + (tot >= 0 ? "good" : "bad") + '">' + (isFinite(tot) ? (tot >= 0 ? "+" : "−") + Math.abs(tot).toFixed(2).replace(".", ",") + " USDT" : "—") + '</b></div>'
      + '<div class="acLin"><span>Prețul în grid</span><b>' + (inGrid == null ? "—" : inGrid + "%" + (panaJos != null && panaJos >= 0 ? " · " + panaJos.toFixed(1).replace(".", ",") + "% până jos" : " · sub grid")) + '</b></div>'
      + '<div class="acLin"><span>Mediul lui</span><b class="' + (m2 === null ? "acMut" : m2 ? "bad" : "good") + '">' + (m2 === null ? "fără date" : (m2 ? "mișcare" : "liniște") + (rg ? " · " + Math.max(rg.r4h || 0, rg.r24h || 0).toFixed(1).replace(".", ",") + "×" : "")) + '</b></div>';
  });
  if (boti && !act.length) hb += '<p class="acMut">Niciun bot pornit acum.</p>';
  // v95: ziua ta - fata de poza de ieri dimineata (colectorul, dupa ora 9)
  var ct = typeof t212 !== "undefined" && t212.cont && t212.cont.cash;
  var botiPeId = {}; act.forEach(function (b) { var v2 = Number(b.profitTotal); if (b.id && isFinite(v2)) botiPeId[String(b.id)] = v2; });
  var zt = Acasa.ziuaTa({ botiTotal: act.length ? act.reduce(function (s2, b) { var v2 = Number(b.profitTotal); return s2 + (isFinite(v2) ? v2 : 0); }, 0) : null, botiPeId: botiPeId, t212Total: ct ? Number(ct.total) : null }, pc.instantanee || [], fz, typeof contTot !== "undefined" ? contTot.inchise : null);   // v100.40: pe bot
  if (zt && zt.boti !== null) hb += '<div class="acLin acZi"><span>Față de ieri dimineață</span><b class="' + (zt.boti >= 0 ? "good" : "bad") + '">' + (zt.boti >= 0 ? "+" : "−") + Math.abs(zt.boti).toFixed(2).replace(".", ",") + ' USDT</b></div>';
  $("acBoti").innerHTML = hb + '<button class="acBtn" type="button" data-action-click="navTo(\'tabloubot\',true)">Deschide Tabloul</button>';

  var c = typeof t212 !== "undefined" && t212.cont && t212.cont.cash, iesi = typeof t212 !== "undefined" ? t212.nrIesi : null, rz = d.rezultate && d.rezultate.l || [];
  var azi = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime(), zile = function (z) { return Math.round((Date.parse(z + "T00:00:00Z") - azi) / 86400000); };
  $("acT212").innerHTML = '<div class="acCap"><h4>Acțiunile tale</h4><span class="acSub">Trading 212 · ' + (deschis ? "bursa e deschisă" : "bursa e închisă") + '</span></div>'
    + (c ? '<div class="acLin"><span>Contul</span><b>' + escapeHtml(acLei(c.total)) + '</b></div><div class="acLin"><span>Pozițiile deschise</span><b class="' + (Number(c.ppl) >= 0 ? "good" : "bad") + '">' + escapeHtml(typeof t212Lei === "function" ? t212Lei(c.ppl) : String(c.ppl)) + '</b></div>'
      + '<div class="acLin"><span>Semafoare</span><b class="' + (iesi == null ? "acMut" : iesi ? "bad" : "good") + '">' + (iesi == null ? "aduc prețurile…" : iesi ? iesi + " de ieșit" : "nimic roșu") + '</b></div>'   /* v100.40: null = inca nu stiu, nu „nimic roșu” */
      + (zt && zt.t212 !== null ? '<div class="acLin acZi"><span>Față de ieri dimineață</span><b class="' + (zt.t212 >= 0 ? "good" : "bad") + '">' + (zt.t212 >= 0 ? "+" : "−") + escapeHtml(acLei(Math.abs(zt.t212))) + '</b></div>' : '') : '<p class="acMut">Aduc contul…</p>')
    + (rz.length ? '<div class="acEt" style="margin-top:4px">Următoarele rezultate financiare' + (rz.some(function (x) { return !x.sigur; }) ? " (estimate)" : "") + ':</div><div class="acRez">' + rz.slice(0, 3).map(function (x) { var z = zile(x.data); return '<b>' + escapeHtml(x.simbol) + '</b><span>' + escapeHtml(acZiRo(x.data)) + '</span><b class="' + (z <= 14 ? "warn" : "acMut") + '">' + (z <= 0 ? "azi" : z === 1 ? "mâine" : "peste " + acCate(z, "zi", "zile")) + '</b>'; }).join("") + '</div>' : '')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'t212\',true)">Deschide T212</button>';

  var ideiL = d.idei && d.idei.idei && Array.isArray(d.idei.idei.actiuni) ? d.idei.idei.actiuni : [], ii = d.idei && d.idei.idei;
  $("acIdei").innerHTML = '<div class="acCap"><h4>Idei de azi</h4><span class="acSub">filtre, nu predicții</span></div>'
    + '<div class="acEt">Acțiuni pe trend' + (ii && ii.judecate ? " (" + ii.trecute + " din " + ii.judecate + " trec de poartă)" : "") + ':</div>'
    + (ideiL.length ? '<div class="acChips">' + ideiL.slice(0, 5).map(function (x) { return '<span>' + escapeHtml(x.simbol || x.ticker || "") + '</span>'; }).join("") + '</div>' : '<p class="acMut">nicio acțiune nu trece azi de poartă</p>')
    + '<div class="acEt" style="margin-top:4px">Monede liniștite pentru un bot grid:</div>'
    + (cl && cl.buni.length ? '<div class="acChips">' + cl.buni.slice(0, 5).map(function (x) { return '<span>' + escapeHtml(String(x.simbol).replace(/_USDT_PERP$/, "")) + '</span>'; }).join("") + '</div>' : '<p class="acMut">Aștept clasamentul…</p>')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'gridset\',true)">Deschide Grid</button>';

  // v95: socoteala alertelor de miscare (au continuat?) - apare cand colectorul a strans alerte
  var so = pc.socoteala;
  if ($("acSocoteala")) { $("acSocoteala").hidden = !(so && so.n); if (so && so.n) $("acSocoteala").innerHTML = '📏 <b>Socoteala alertelor:</b> ' + escapeHtml(so.text) + (so.textVreme ? ' ' + escapeHtml(so.textVreme) : ''); }

  acasaRezumate(larg);
}
// bursa din SUA (ora New York): luni-vineri 9:30-16:00
function acBursaDeschisa(d) {
  try { var o = {}; new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
    var m = Number(o.hour) * 60 + Number(o.minute); return ["Sat", "Sun"].indexOf(o.weekday) < 0 && m >= 570 && m < 960; } catch (e) { return false; }
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
document.addEventListener("toggle", function (e) {
  var t = e.target; if (!t || !t.classList || !t.classList.contains("acPl")) return;
  // bara de cautare (moneda + "Analizeaza piata") apare doar cand deschizi analiza unei monede - in grupul ei
  if (t.id === "acPl-moneda") { document.body.classList.toggle("acMonedaDeschisa", t.open); acasaBara(); }
  if (typeof Acasa !== "undefined") acasaRezumate(Acasa.largime(acasa.d.largime));
}, true);
