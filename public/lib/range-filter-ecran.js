// Pagina „Range Filter” (v100.300; el, 04.11.2026: „integrează și în Crypto Radar ca dash și în panel”) - partea de ECRAN: aduce lumânările
// (1h sau 4h) pentru monedele tale (boții activi + BTC / ETH / SOL + top 20 din clasament, ca Trade-ul zilei), le trece prin RangeFilter
// (lib/range-filter.js, pur, port exact al Pine v2.1) și desenează câte un dash pe monedă: VERDICT · TRIGGER · CE FAC? · LOC · BANDA · REGIM ·
// MA · APRINDERE · DOVADA · SEMNAL. rfHtml e fără DOM (proba o rulează în vm); rfPorneste leagă pagina. Același calcul dă rândul „Range Filter”
// din citirea Tabloului botului (app.js, tbCitireExtra → RangeFilter.citire pe lumânările botului).
// Cinstit: nimic dovedit în proba din 04.11 - e un colorant de trend, nu un semnal; rândul DOVADA o spune pe fiecare monedă.
var rfStare = { monede: [], la: 0, inLucru: false, eroare: null, simboluri: [], tf: "60M" };
var RF_TF = { "60M": { eticheta: "1h", bare: 500 }, "4H": { eticheta: "4h", bare: 500 } };
var RF_PAUZA_MS = 250;   // Pionex blochează IP-ul la prea multe cereri (serverul le ține 90 s în cache)
var RF_MAX = 30;
function rfEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
// regula casei (03.10): rezultatele cu O SINGURĂ zecimală, minusul tipografic („−0,8”), „12,4%” - prin TextRo (revizia Opus 04.11)
function rfNr(v, zec) { return TextRo.num(v, zec == null ? 1 : zec); }
function rfPct(v, zec) { return v == null || !isFinite(v) ? "—" : TextRo.pct(v * 100, zec == null ? 1 : zec); }
function rfPret(p) { if (!(p > 0)) return "—"; var z = p < 0.01 ? 6 : p < 1 ? 4 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
function rfOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
function rfPauza(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function rfBara(v, vmax) { var n = v == null || !isFinite(v) || !(vmax > 0) ? 0 : Math.min(8, Math.max(0, Math.round(Math.abs(v) / vmax * 8))), s = ""; for (var i = 0; i < 8; i++) s += i < n ? "█" : "·"; return s; }
function rfBare(v, cls) { return '<span class="rfBara ' + (cls || "") + '" aria-hidden="true">' + v + "</span>"; }
function rfSimboluri(boti, clasament) {
  if (typeof tzSimboluri === "function") return tzSimboluri(boti, clasament).slice(0, RF_MAX);
  return ["BTC", "ETH", "SOL"].map(function (m) { return { simbol: m, pionex: m + "_USDT_PERP", fel: "piata" }; });
}
// textele unei citiri (fără DOM): verdict, trigger, ce fac, rândurile
function rfTexte(c) {
  var dirTxt = c.dir === 1 ? "TREND SUS" : c.dir === -1 ? "TREND JOS" : "FĂRĂ DIRECȚIE";
  var verdict = dirTxt + (c.dir ? " · de " + TextRo.cate(c.bareDir, "bară", "bare") : "") + (c.regim.cons ? " · consolidare" : "");
  var trig = c.trigger.text, trigR = c.costNu ? "stop la " + rfPct(c.distPct) + " < 2× cost " + rfPct(c.cost) + " ⇒ NU TRECE" : "stop (filtru) la " + rfPct(c.distPct);
  var ceFac = c.semnalAcum && c.semnal.fel === "BUY" ? (c.costNu ? "semnal, dar stopul nu acoperă costul - nu intru" : "intrare LONG la close, stop sub filtru; tratează-l ca direcție, nu ca dovadă")
    : c.semnalAcum ? (c.costNu ? "semnal, dar stopul nu acoperă costul - nu intru" : "intrare SHORT la close, stop peste filtru; tratează-l ca direcție, nu ca dovadă")
    : c.dir ? "nu alerg după preț: aștept flip sau alt indicator care să confirme" : "fără direcție";
  if (c.semnalAcum && c.regim.cons) ceFac += " · semnal în consolidare (în probă, mai slab pe 4h)";
  if (!c.dovada.dovedit) ceFac += " · DOVADA: nedovedit pe moneda asta";
  var d = c.dovada, dovR = d.n === 0 ? "niciun semnal încheiat încă" : TextRo.cate(d.n, "caz", "cazuri") + " · marginea de jos " + rfNr(d.lo, 0) + " · " + (d.dovedit ? "DOVEDIT" : d.n < RangeFilter.MIN_EP ? "PUȚINE CAZURI" : "NEDOVEDIT");
  var ma = c.ma, maTxt = ma.col > 0 ? "VERDE" : ma.col < 0 ? "ROȘU" : "NEUTRU", maR = ma.aliniata ? "aliniată cu RF · în probă n-a ajutat (47 % față de 50 %)" : ma.col === 0 ? "neutră" : "contra RF";
  return {
    verdict: verdict, ton: c.dir === 1 ? "sus" : c.dir === -1 ? "jos" : "fara",
    trigger: trig, triggerTon: c.semnalAcum ? (c.costNu ? "atentie" : c.semnal.fel === "BUY" ? "sus" : "jos") : "fara", triggerR: trigR,
    ceFac: ceFac,
    loc: (c.distAtr == null ? "—" : (c.distAtr >= 0 ? "+" : "") + rfNr(c.distAtr) + " ATR"), locR: c.distAtr == null ? "-" : Math.abs(c.distAtr) < 0.5 ? "lipit de filtru · la un pas de flip" : c.distAtr > 0 ? "peste filtru" : "sub filtru", locTon: c.distAtr == null ? "fara" : Math.abs(c.distAtr) < 0.5 ? "atentie" : c.distAtr > 0 ? "sus" : "jos",
    banda: c.bandAtr == null ? "—" : rfNr(c.bandAtr) + " ATR", bandaR: c.bandMed == null ? "-" : "de obicei " + rfNr(c.bandMed) + (c.bandAtr > c.bandMed * 1.3 ? " · largă (semnal rar)" : c.bandAtr < c.bandMed * 0.7 ? " · îngustă (flip ușor)" : " · normală"),
    regim: (c.regim.cons ? "CONSOLIDARE" : "TREND") + (c.regim.ang == null ? "" : " · " + (c.regim.ang >= 0 ? "+" : "") + rfNr(c.regim.ang, 0) + "°"), regimR: c.regim.consPct == null ? "-" : "consolidare " + rfNr(c.regim.consPct, 0) + " % din bare (proba: 57)", regimTon: c.regim.cons ? "atentie" : c.regim.ang == null ? "fara" : c.regim.ang > 0 ? "sus" : "jos",
    ma: maTxt + (ma.distAtr == null ? "" : " · " + (ma.distAtr >= 0 ? "+" : "") + rfNr(ma.distAtr) + " ATR"), maR: maR, maTon: ma.col > 0 ? "sus" : ma.col < 0 ? "jos" : "fara",
    aprindere: c.aprindere ? (c.aprindere.acum === 0 ? "ACUM " : "acum " + TextRo.cate(c.aprindere.acum, "bară", "bare") + " · ") + c.aprindere.fel : "-", aprindereR: c.aprindere ? "24/7 · proba: nedovedit" : "nicio aprindere încă",
    dovada: d.n ? rfNr(d.hit, 0) + " din 100 (direcția, fără cost)" : "-", dovadaR: dovR, dovadaTon: d.n === 0 ? "fara" : d.dovedit ? "sus" : d.n < RangeFilter.MIN_EP ? "atentie" : "jos",
    semnal: c.semnal ? c.semnal.fel + (c.semnal.acum === 0 ? " pe ultima bară închisă" : " acum " + TextRo.cate(c.semnal.acum, "bară", "bare")) : "-", semnalR: c.semnal ? "la " + rfPret(c.semnal.pret) : "", semnalTon: c.semnal ? (c.semnal.fel === "BUY" ? "sus" : "jos") : "fara",
    detalii: "semnale " + rfNr(c.sigPer100) + " / 100 de bare (proba: 2,45) · ținere " + (c.tinere == null ? "—" : TextRo.cate(Math.round(c.tinere), "bară", "bare")) + " (proba: 34) · whipsaw " + rfNr(c.whipPct, 1) + " % (proba: 1)"
  };
}
function rfRand(et, bara, val, ton, reper, tip) {
  return '<div class="rfRand"' + (tip ? ' title="' + rfEsc(tip) + '"' : "") + '><span class="rfEt">' + rfEsc(et) + "</span>" + (bara != null ? rfBare(bara, "rfTon-" + ton) : '<span class="rfBara rfGol" aria-hidden="true"></span>') + '<b class="rfVal rfTon-' + ton + '">' + rfEsc(val) + "</b>" + (reper ? '<span class="rfMut rfMic">' + rfEsc(reper) + "</span>" : "") + "</div>";
}
function rfCartela(m) {
  var h = '<article class="rfCard' + (m.eroare || !m.c || m.c.eroare ? " rfCardGol" : "") + (m.fel === "bot" ? " rfCardBot" : "") + '" aria-label="' + rfEsc(m.simbol) + '">';
  h += '<div class="rfCardCap"><b class="rfSimbol">' + rfEsc(m.simbol) + "</b>" + (m.fel === "bot" ? '<span class="rfEticheta">botul tău</span>' : "") + '<span class="rfMut rfMic">' + (m.c && m.c.pret ? rfPret(m.c.pret) + " USDT" : "") + "</span></div>";
  if (m.eroare || !m.c || m.c.eroare) { h += '<p class="rfMut">' + rfEsc(m.eroare || (m.c && m.c.eroare) || "fără date") + "</p></article>"; return h; }
  var c = m.c, t = rfTexte(c);
  h += '<div class="rfHero rfHero-' + t.ton + '">' + rfEsc(t.verdict) + "</div>";
  h += rfRand("TRIGGER", null, t.trigger, t.triggerTon, t.triggerR, "GO doar pe bara închisă cu semnal; NU TRECE când stopul la filtru nu acoperă 2× costul (0,13 %).");
  h += '<div class="rfRand"><span class="rfEt">CE FAC?</span><span class="rfBara rfGol" aria-hidden="true"></span><span class="rfCe">' + rfEsc(t.ceFac) + "</span></div>";
  h += rfRand("LOC", rfBara(c.distAtr, 2), t.loc, t.locTon, t.locR, "Distanța de la close la filtru, în ATR(14). Filtrul e invalidarea: sub 0,5 ATR ești la un pas de flip.");
  h += rfRand("BANDA", rfBara(c.bandAtr, 2), t.banda, c.bandMed == null ? "fara" : c.bandAtr > c.bandMed * 1.3 ? "atentie" : "fara", t.bandaR, "Lățimea benzii moarte (r) în ATR(14), față de mediana ei pe 100 de bare.");
  h += rfRand("REGIM", rfBara(c.regim.ang, 45), t.regim, t.regimTon, t.regimR, "Trender: unghiul pantei EMA(hl2,5) / ATR; CONSOLIDARE = media |unghi| pe 5 < pe 9 (panta scade). În probă: 57 % din bare.");
  h += rfRand("MA", rfBara(c.ma.distAtr, 2), t.ma, t.maTon, t.maR, "EMA(hl2,15): verde = urcă ȘI close peste; roșu = coboară ȘI close sub. În probă alinierea NU a ajutat (47 % față de 50 %).");
  h += rfRand("APRINDERE", null, t.aprindere, c.aprindere && c.aprindere.acum === 0 ? (c.aprindere.fel === "SUS" ? "sus" : "jos") : "fara", t.aprindereR, "Trender Ignition: close trece peste / sub EMA(hl2,5), close peste / sub EMA(hl2,48), fără consolidare. În probă: nedovedit.");
  h += rfRand("DOVADA", rfBara(c.dovada.hit, 100), t.dovada, t.dovadaTon, t.dovadaR, "Cât din semnalele BUY / SELL de pe moneda asta au mers în direcția lor după " + TextRo.cate(RangeFilter.DIRH, "bară", "bare") + ". DOVEDIT doar cu cel puțin " + TextRo.cate(RangeFilter.MIN_EP, "caz", "cazuri") + " și marginea Wilson 95 % peste 50.");
  h += rfRand("SEMNAL", null, t.semnal, t.semnalTon, t.semnalR, "");
  h += '<p class="rfMut rfMic">' + rfEsc(t.detalii) + "</p>";
  h += '<div class="rfAct"><button class="acBtn" type="button" data-action-click="rfLaGrid(\'' + rfEsc(m.pionex) + '\')">Grid: ce setez? →</button></div>';
  return h + "</article>";
}
function rfRezumat(monede) {
  var ok = monede.filter(function (m) { return m.c && !m.c.eroare; });
  if (!ok.length) return "";
  var sus = ok.filter(function (m) { return m.c.dir === 1; }).length, jos = ok.filter(function (m) { return m.c.dir === -1; }).length;
  var proaspete = ok.filter(function (m) { return m.c.semnal && m.c.semnal.acum <= 3; }).map(function (m) { return m.simbol + " " + m.c.semnal.fel; });
  var cons = ok.filter(function (m) { return m.c.regim.cons; }).length;
  var t = "Acum: " + sus + " din " + ok.length + " în trend sus, " + jos + " în trend jos, " + cons + " în consolidare.";
  if (proaspete.length) t += " Semnale din ultimele 3 bare: " + proaspete.join(", ") + ".";
  return '<p class="rfRezumat">' + rfEsc(t) + "</p>";
}
function rfHtml(st) {
  var tf = RF_TF[st.tf] || RF_TF["60M"];
  var h = '<div class="rfAntet"><h3>Range Filter</h3><span class="rfMut rfMic" id="rfCand">' + (st.la ? "citit la " + rfOra(st.la) + " · " + tf.eticheta : tf.eticheta) + '</span><div class="rfDr">';
  h += '<span class="rfTf" role="group" aria-label="Interval">' + Object.keys(RF_TF).map(function (k) { return '<button class="acBtn' + (st.tf === k ? " rfTfOn" : "") + '" type="button" data-action-click="rfTf(\'' + k + '\')">' + RF_TF[k].eticheta + "</button>"; }).join("") + "</span>";
  h += '<button class="acBtn" type="button" data-action-click="rfPorneste(true)">↻ Recitește</button></div></div>';
  h += '<p class="rfIntro">Range Filter (DonovanWall) + Trender, pe monedele tale: direcția filtrului cu bandă moartă (TREND SUS / JOS), semnalul BUY / SELL la schimbarea ei, distanța până la filtru, lățimea benzii, regimul (consolidare după panta MA), MA colorată, aprinderea. Același motor ca scriptul din TradingView (Range Filter B&S v2.1). ';
  h += "Cinstit: în proba din 04.11.2026 (Binance perp, 21 de perechi, 1h + 4h, după cost) NIMIC nu s-a dovedit - semnalul nu plătește, direcția nimerește 48 % la 10 bare, aprinderea nu plătește. E un colorant de trend curat (2,45 semnale / 100 de bare, whipsaw 1 %), bun ca filtru de direcție lângă altceva, nu ca semnal singur. Rândul DOVADA o măsoară pe fiecare monedă.</p>";
  if (st.inLucru && !st.monede.length) h += '<p class="rfMut">Aduc lumânările…</p>';
  else if (st.eroare && !st.monede.length) h += '<p class="rfRau">' + rfEsc(st.eroare) + ' <button class="acBtn" type="button" data-action-click="rfPorneste(true)">Încearcă din nou</button></p>';
  else if (!st.monede.length) h += '<p class="rfMut">Nicio monedă încă - apasă „Recitește”.</p>';
  else h += (st.eroare ? '<p class="rfRau">' + rfEsc(st.eroare) + "</p>" : "") + rfRezumat(st.monede) + (st.inLucru ? '<p class="rfMut rfMic">Mai citesc… ' + st.monede.length + " / " + st.simboluri.length + "</p>" : "") + '<div class="rfGrila">' + st.monede.map(rfCartela).join("") + "</div>";
  return h;
}
function rfDeseneaza() { var el = document.getElementById("rfPagina"); if (el) el.innerHTML = rfHtml(rfStare); }
function rfTf(k) { if (!RF_TF[k] || rfStare.inLucru) return; rfStare.tf = k; rfStare.la = 0; rfStare.monede = []; rfPorneste(true); }
function rfLaGrid(simbol) { if (typeof tzLaGrid === "function") tzLaGrid(simbol); else navTo("gridset", true); }
async function rfPorneste(forta) {
  if (rfStare.inLucru) return;
  var proaspat = rfStare.la && Date.now() - rfStare.la < 10 * 60 * 1000, cuDate = rfStare.monede.some(function (m) { return m.c && !m.c.eroare; });
  if (!forta && proaspat && cuDate) { rfDeseneaza(); return; }
  rfStare.inLucru = true; rfStare.eroare = null;
  var monede = [], tf = RF_TF[rfStare.tf] || RF_TF["60M"];
  try {
    var boti = typeof tzBotiActivi === "function" ? await tzBotiActivi() : [], cl = null;
    try { var c = await getJSON("/api/istoric-bot?action=clasament"); cl = c && c.clasament || null; } catch (e) { cl = null; }
    rfStare.simboluri = rfSimboluri(boti, cl); rfDeseneaza();
    for (var i = 0; i < rfStare.simboluri.length; i++) {
      var s = rfStare.simboluri[i];
      try {
        var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(s.pionex) + "&interval=" + rfStare.tf + "&limit=" + tf.bare);
        // revizia Opus (04.11): la refuzul Pionex serverul răspunde 200 cu {result:false, error, retryAfter} - nu aruncă ⇒ se citește aici, nu în catch
        if (k && k.result === false && k.retryAfter != null) { monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, eroare: "Pionex a refuzat (prea multe cereri)" }); rfStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
        var bare = typeof GridCalcul !== "undefined" ? GridCalcul.bare(k && k.data && k.data.klines) : null;
        monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, c: bare && bare.length ? RangeFilter.citire(bare) : { eroare: k && k.result === false && k.error ? String(k.error).slice(0, 80) : "fără lumânări de la Pionex" } });
      } catch (e) {
        var msg = String(e && e.message || e);
        monede.push({ simbol: s.simbol, pionex: s.pionex, fel: s.fel, eroare: "nu am putut citi lumânările (" + msg.slice(0, 80) + ")" });
        if (/429|prea multe|rate/i.test(msg)) { rfStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
      }
      rfStare.monede = monede.slice(); rfDeseneaza();
      if (i < rfStare.simboluri.length - 1) await rfPauza(RF_PAUZA_MS);
    }
    rfStare.monede = monede; rfStare.la = Date.now();
    if (!monede.length) rfStare.eroare = "Nicio monedă de citit.";
  } finally { rfStare.inLucru = false; rfDeseneaza(); }
}
