// Pagina Home "Piata azi" (v92) - ecranul. Logica pura e in lib/acasa.js (probata in scripts/acasa-v92.mjs).
// Datele: clasamentul colectorului (miscarea pe top 100 PERP), tickerele Pionex, BTC (4h/1z/1h), frica/lacomia +
// bursele (/api/stiri?action=piata), largimea pietei (refreshMarketBreadthV64), dominanta (intel crypto_global),
// botii / contul T212 / clasamentul din contTotAsigura (aceleasi ca pe celelalte pagini, zero cereri in plus).
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
      pas("cont", async function () { if (typeof contTotAsigura === "function") await contTotAsigura(); return true; })
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
        try { var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(nume + "_USDT_PERP") + "&interval=60M&limit=500"); o[nume] = GridCalcul.regimPeBare(GridCalcul.bare(k && k.data && k.data.klines), 4, 24); } catch (e) { o[nume] = null; }
      }
      return o;
    });
    await pas("idei", async function () { if (typeof t212 !== "undefined" && t212.idei) return t212.idei; var x = await getJSON("/api/t212?action=idei"); if (typeof t212 !== "undefined") t212.idei = x; return x; });
    // datele principale n-au venit (fara parola, server picat) -> reincerc in 30 s, nu peste 5 minute
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

function acasaDeseneaza() {
  if (!$("acasa") || typeof Acasa === "undefined") return;
  var d = acasa.d, cl = acClasamentSumar(d.clasament), mis = Acasa.miscari(d.tickers, { top: 60, inMiscare: cl ? cl.deEvitat.map(function (x) { return x.simbol; }) : [] });
  var btc = acBtc(d), fgO = d.piata && d.piata.fg, fgI = Acasa.fg(fgO && fgO.istoric && fgO.istoric.length ? fgO.istoric : fgO ? [fgO.valoare] : []);
  var btcMis = btc.regim ? !!btc.regim.miscare : false, larg = Acasa.largime(d.largime);
  var acum = new Date(), zi = acum.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });
  if ($("acCand")) $("acCand").textContent = zi + " · actualizat " + (acasa.la ? new Date(acasa.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "acum…");

  // 1. vremea pietei
  var v = Acasa.vreme({ clasament: cl, btc: { miscare: btcMis }, fg: fgI.acum });
  var h = '<div class="acVremeSt"><div class="acNiv acNiv-' + v.nivel + '">' + escapeHtml(v.eticheta) + '</div><p><b>' + escapeHtml(v.titlu) + '</b></p><p class="acMut">' + escapeHtml(v.text) + '</p>'
    + (v.faCe ? '<div class="acFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(v.faCe) + '</div>' : '') + '</div><div class="acVremeDr">';
  if (cl) {
    h += '<div class="acEt">Mișcarea pe piață · top ' + (cl.evita + cl.candidati + cl.faraDate) + ' futures după volum' + (d.clasament && d.clasament.la ? ' · la ' + new Date(d.clasament.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : '') + '</div>'
      + acBare(0, [[cl.candidati, "var(--good)", "liniștite"], [cl.evita, "var(--bad)", "în mișcare"], [cl.faraDate, "var(--muted)", "fără date"]])
      + '<div class="acLeg"><span><b class="good">' + cl.candidati + '</b> liniștite</span><span><b class="bad">' + cl.evita + '</b> în mișcare</span>' + (cl.faraDate ? '<span class="acMut">' + cl.faraDate + ' fără date</span>' : '') + '</div>'
      + '<div class="acSep"></div><div class="acEt">Direcția lor (4h + 1 zi)</div>'
      + acBare(0, [[cl.dir.long, "var(--good)", "urcă"], [cl.dir.neutru, "var(--muted)", "laterale"], [cl.dir.short, "var(--bad)", "coboară"]])
      + '<div class="acLeg"><span><b class="good">' + cl.dir.long + '</b> urcă</span><span><b>' + cl.dir.neutru + '</b> laterale</span><span><b class="bad">' + cl.dir.short + '</b> coboară</span></div>'
      + '<p class="acEt" style="margin-top:8px">Mișcarea e semnalul dovedit pentru grid; direcția descrie, nu prezice.</p>';
  } else h += '<p class="acMut">' + escapeHtml(d.clasamentErr ? "Clasamentul n-a venit: " + d.clasamentErr : "Aștept clasamentul pieței (îl face colectorul de acasă, o dată pe oră).") + '</p>';
  $("acVreme").className = "acVreme acVreme-" + v.nivel; $("acVreme").innerHTML = h + '</div>';

  // 2. pulsul pietei: BTC
  var tb = mis.gasit("BTC"), te = mis.gasit("ETH"), dom = d.glob && Number(d.glob.btcDominance);
  var inch = function (rows) { return (rows || []).slice().sort(function (a, b) { return Number(a.time) - Number(b.time); }).map(function (x) { return Number(x.close); }); };
  $("acBtc").innerHTML = '<div class="acCap"><h4>BTC</h4><span class="acSub">„vremea” pieței crypto</span></div>'
    + '<div class="acVal">' + (tb ? acNr(tb.p) : "—") + ' <span class="' + (tb && tb.ch >= 0 ? "good" : "bad") + '" style="font-size:14px">' + (tb ? acPct(tb.ch) : "") + '</span></div>'
    + acSpark(inch(d.btc4h).slice(-120), "#55d89b")
    + '<div class="acLin"><span>Direcția</span><b>1 zi ' + (AC_DIR[btc.dir1d] || "—") + ' · 4h ' + (AC_DIR[btc.dir4h] || "—") + '</b></div>'
    + '<div class="acLin"><span>Mișcarea</span><b class="' + (btc.regim ? (btcMis ? "bad" : "good") : "acMut") + '">' + (btc.regim ? (btcMis ? "mișcare" : "liniște") + " · " + Math.max(btc.regim.r4h || 0, btc.regim.r24h || 0).toFixed(1).replace(".", ",") + "×" : "—") + '</b></div>'
    + '<div class="acLin"><span>Dominanța BTC</span><b>' + (isFinite(dom) && dom > 0 ? dom.toFixed(1).replace(".", ",") + "%" : "—") + '</b></div>'
    + '<div class="acLin"><span>ETH</span><b>' + (te ? acNr(te.p) + ' <span class="' + (te.ch >= 0 ? "good" : "bad") + '">' + acPct(te.ch) + '</span>' : "—") + '</b></div>';

  // frica / lacomia
  var fa = fgI.acum, fcls = fa == null ? "acMut" : fa >= 55 ? "warn" : fa <= 45 ? "bad" : "acMut", fnume = fa == null ? "" : fa >= 75 ? "lăcomie extremă" : fa >= 55 ? "lăcomie" : fa <= 25 ? "frică extremă" : fa <= 45 ? "frică" : "neutru";
  var ung = fa == null ? Math.PI / 2 : Math.PI * (1 - fa / 100), ax = 110 + 76 * Math.cos(ung), ay = 110 - 76 * Math.sin(ung);
  $("acFg").innerHTML = '<div class="acCap"><h4>Frică / lăcomie</h4><span class="acSub">alternative.me · zilnic</span></div>'
    + '<svg class="acCadran" viewBox="0 0 220 124" role="img" aria-label="Indicele frică și lăcomie: ' + (fa == null ? "fără date" : fa + ", " + fnume) + '"><defs><linearGradient id="acGz" x1="0" x2="1"><stop offset="0" stop-color="#ff6b78"/><stop offset=".5" stop-color="#90a0b6"/><stop offset="1" stop-color="#f5c451"/></linearGradient></defs>'
    + '<path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="url(#acGz)" stroke-width="14" stroke-linecap="round" opacity=".85"/>'
    + (fa == null ? '' : '<line x1="110" y1="110" x2="' + ax.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="#f5f7fb" stroke-width="3" stroke-linecap="round"/>') + '<circle cx="110" cy="110" r="6" fill="#f5f7fb"/>'
    + '<text x="20" y="123" fill="#90a0b6" font-size="10" text-anchor="middle">0</text><text x="200" y="123" fill="#90a0b6" font-size="10" text-anchor="middle">100</text></svg>'
    + '<div class="acFgv"><b class="' + fcls + '">' + (fa == null ? "—" : fa) + '</b> ' + escapeHtml(fnume) + '</div>'
    + acSpark(fgO && fgO.istoric || [], "#f5c451") + (fgI.text ? '<p class="acEt">' + escapeHtml(fgI.text) + '</p>' : '');

  // largimea pietei
  $("acLarg").innerHTML = '<div class="acCap"><h4>Lărgimea pieței</h4>' + (larg ? '<span class="' + (AC_TON[larg.ton] || "") + '" style="font-weight:800">' + escapeHtml(larg.cap) + '</span>' : '') + '</div>'
    + (larg ? larg.bare.map(function (b) { return '<div class="acLb"><span>' + escapeHtml(b.eticheta) + '</span><i><b class="' + (b.ton === "atentie" ? "w" : "") + '" style="width:' + (b.pct == null ? 0 : b.pct) + '%"></b></i><em>' + escapeHtml(b.text) + '</em></div>'; }).join("")
      + '<div class="acLin" style="margin-top:4px"><span>Maxime / minime noi</span><b>' + escapeHtml(larg.maxMin) + '</b></div>' + (larg.concluzie ? '<p class="acEt">' + escapeHtml(larg.concluzie) + '</p>' : '')
      : '<p class="acMut">' + escapeHtml(d.largimeErr ? "N-am putut citi lărgimea: " + d.largimeErr : "Calculez lărgimea pe 24 de monede…") + '</p>');

  // 3. bursele
  var serie = function (l) { return (l || []).slice(-63).map(function (x) { return Number(x.close); }); };
  var zi1 = function (l) { if (!l || l.length < 2) return null; var a = Number(l[l.length - 1].close), b = Number(l[l.length - 2].close); return b > 0 ? (a / b - 1) * 100 : null; };
  var ult = function (l) { return l && l.length ? Number(l[l.length - 1].close) : null; };
  var p = d.piata || {}, rand = function (nume, l, cul, invers) { var c = zi1(l), u = ult(l); return '<div class="acTr"><b>' + nume + '</b>' + acSpark(serie(l), cul, 30) + '<span class="acV">' + (u == null ? "—" : acNr(u, 2)) + ' <span class="' + (c == null ? "" : (invers ? c <= 0 : c >= 0) ? "good" : "bad") + '">' + acPct(c) + '</span></span></div>'; };
  var burseText = "";
  if (typeof Consilier !== "undefined" && p.qqq) { try { var pz = Consilier.piata({ qqq: GridCalcul.bareToate(p.qqq), spy: GridCalcul.bareToate(p.spy || []), vix: GridCalcul.bareToate(p.vix || []), fg: p.fg }); if (pz && pz.text) burseText = pz.text; } catch (e) {} }
  $("acBurse").innerHTML = '<div class="acCap"><h4>Bursele</h4><span class="acSub">ultimele 3 luni · ultima închidere</span></div>'
    + (p.qqq || p.spy || p.vix ? rand("Nasdaq 100", p.qqq, "#55d89b") + rand("S&amp;P 500", p.spy, "#55d89b") + rand("VIX", p.vix, "#90a0b6", true) + (burseText ? '<p class="acEt">' + escapeHtml(burseText) + '</p>' : '')
      : '<p class="acMut">' + escapeHtml(d.piataErr ? "Bursele n-au venit: " + d.piataErr : "Aduc bursele…") + '</p>');

  // cine se misca azi
  var mr = function (x) { return '<div class="acMr"><span>' + escapeHtml(x.s) + (x.miscare ? '<span class="acTag">mișcare</span>' : '') + '</span><b class="' + (x.ch >= 0 ? "good" : "bad") + '">' + acPct(x.ch, 1) + '</b></div>'; };
  $("acMisca").innerHTML = '<div class="acCap"><h4>Cine se mișcă azi</h4><span class="acSub">top ' + (mis.n || 60) + ' futures după volum · 24 h</span></div>'
    + (mis.n ? '<div class="acMis"><div><h5>Urcă cel mai mult</h5>' + mis.sus.map(mr).join("") + '</div><div><h5>Scad cel mai mult</h5>' + mis.jos.map(mr).join("") + '</div></div>'
      + '<p class="acEt">' + mis.urca + ' din ' + mis.n + ' au urcat azi.' + (cl && cl.deEvitat.length ? ' În mișcare mare acum și de ocolit pentru grid: ' + escapeHtml(cl.deEvitat.slice(0, 6).map(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, ""); }).join(", ")) + '.' : '') + '</p>'
      : '<p class="acMut">' + escapeHtml(d.tickersErr ? "Prețurile Pionex n-au venit: " + d.tickersErr : "Aduc prețurile…") + '</p>');

  // 4. ce inseamna pentru tine
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" ? contTot.boti : null);
  var act = (boti || []).filter(function (b) { return b && b.activ; });
  var hb = '<div class="acCap"><h4>Boții tăi</h4><span class="acSub">' + (boti ? act.length + (act.length === 1 ? " activ" : " activi") : "aduc boții…") + '</span></div>';
  act.slice(0, 4).forEach(function (b) {
    var nume = String(b.baza || "").replace(/\.PERP$/, ""), tot = Number(b.profitTotal), pr = Number(b.pretCurent), jo = Number(b.gridJos), su = Number(b.gridSus);
    var inGrid = su > jo && isFinite(pr) ? Math.round((pr - jo) / (su - jo) * 100) : null, panaJos = jo > 0 && pr > 0 ? (pr / jo - 1) * 100 : null;
    var ent = cl && d.clasament ? (d.clasament.monede || []).filter(function (x) { return String(x.simbol).replace(/_USDT_PERP$/, "") === nume; })[0] : null;
    hb += '<div class="acLin"><span>' + escapeHtml(nume + " " + (b.directie || "") + (b.levier ? " " + b.levier + "×" : "")) + '</span><b class="' + (tot >= 0 ? "good" : "bad") + '">' + (isFinite(tot) ? (tot >= 0 ? "+" : "−") + Math.abs(tot).toFixed(2) + " USDT" : "—") + '</b></div>'
      + '<div class="acLin"><span>Prețul în grid</span><b>' + (inGrid == null ? "—" : inGrid + "%" + (panaJos != null && panaJos >= 0 ? " · " + panaJos.toFixed(1).replace(".", ",") + "% până jos" : " · sub grid")) + '</b></div>'
      + (function () { var rg = !ent && d.regimBoti ? d.regimBoti[nume] : null, mis = ent ? ent.stare === "evita" : rg ? !!rg.miscare : null;
          return '<div class="acLin"><span>Mediul lui</span><b class="' + (mis === null ? "acMut" : mis ? "bad" : "good") + '">' + (mis === null ? "fără date" : (mis ? "mișcare" : "liniște") + (rg ? " · " + Math.max(rg.r4h || 0, rg.r24h || 0).toFixed(1).replace(".", ",") + "×" : "")) + '</b></div>'; })();
  });
  if (boti && !act.length) hb += '<p class="acMut">Niciun bot pornit acum.</p>';
  $("acBoti").innerHTML = hb + '<button class="acBtn" type="button" data-action-click="navTo(\'tabloubot\',true)">Deschide Tabloul</button>';

  var c = typeof t212 !== "undefined" && t212.cont && t212.cont.cash, ideiL = d.idei && d.idei.idei && Array.isArray(d.idei.idei.actiuni) ? d.idei.idei.actiuni : [];
  var iesi = document.querySelectorAll("#t212Continut .t212Pill-iesi").length, deschis = acBursaDeschisa(acum);
  $("acT212").innerHTML = '<div class="acCap"><h4>Trading 212</h4><span class="acSub">' + (deschis ? "bursa e deschisă" : "bursa e închisă") + '</span></div>'
    + (c ? '<div class="acLin"><span>Contul</span><b>' + escapeHtml(acLei(c.total)) + '</b></div><div class="acLin"><span>Pozițiile deschise</span><b class="' + (Number(c.ppl) >= 0 ? "good" : "bad") + '">' + escapeHtml(typeof t212Lei === "function" ? t212Lei(c.ppl) : String(c.ppl)) + '</b></div>'
      + '<div class="acLin"><span>Semafoare</span><b class="' + (iesi ? "bad" : "good") + '">' + (iesi ? iesi + " de ieșit" : "nimic roșu") + '</b></div>' : '<p class="acMut">Aduc contul…</p>')
    + (ideiL.length ? '<div class="acChips">' + ideiL.slice(0, 5).map(function (x) { return '<span>' + escapeHtml(x.simbol || x.ticker || "") + '</span>'; }).join("") + '</div>' : '')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'t212\',true)">Deschide T212</button>';

  $("acIdei").innerHTML = '<div class="acCap"><h4>Pe ce aș porni un bot</h4><span class="acSub">monede liniștite</span></div>'
    + (cl && cl.buni.length ? '<div class="acChips">' + cl.buni.slice(0, 5).map(function (x) { return '<span>' + escapeHtml(String(x.simbol).replace(/_USDT_PERP$/, "")) + '</span>'; }).join("") + '</div>'
      + '<p class="acEt">Un filtru (liniște, interval, treceri), nu o predicție. Fișa îți dă setările și proba pe istoricul monedei.</p>' : '<p class="acMut">Aștept clasamentul…</p>')
    + '<button class="acBtn" type="button" data-action-click="navTo(\'gridset\',true)">Deschide Grid</button>';

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
document.addEventListener("toggle", function (e) {
  var t = e.target; if (!t || !t.classList || !t.classList.contains("acPl")) return;
  // bara de sus (moneda + "Analizeaza piata") apare doar cand deschizi analiza unei monede
  if (t.id === "acPl-moneda") document.body.classList.toggle("acMonedaDeschisa", t.open);
  if (typeof Acasa !== "undefined") acasaRezumate(Acasa.largime(acasa.d.largime));
}, true);
