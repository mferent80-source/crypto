// Pagina „Range Filter” (v100.300; el, 04.11.2026: „integrează și în Crypto Radar ca dash și în panel”) - partea de ECRAN: aduce lumânările
// (1h sau 4h) pentru monedele tale (boții activi + BTC / ETH / SOL + top 20 din clasament, ca Trade-ul zilei), le trece prin RangeFilter
// (lib/range-filter.js, pur, port exact al Pine v2.1) și desenează câte un dash pe monedă: VERDICT · TRIGGER · CE FAC? · LOC · BANDA · REGIM ·
// MA · APRINDERE · DOVADA · SEMNAL. rfHtml e fără DOM (proba o rulează în vm); rfPorneste leagă pagina. Același calcul dă rândul „Range Filter”
// din citirea Tabloului botului (app.js, tbCitireExtra → RangeFilter.citire pe lumânările botului).
// Cinstit: nimic dovedit în proba din 04.11 - e un colorant de trend, nu un semnal; rândul DOVADA o spune pe fiecare monedă.
// v100.301 (auditul din aceeași seară, „auditează și îmbunătățește”): cache pe interval (1h ↔ 4h fără cereri noi), ordinea cartelelor
// (boții → semnale din ultimele 3 bare → restul) + filtre, „DOVADA pe 1.000 de bare” (a doua pagină cu endTime, opt-in: 2 cereri / monedă),
// „Contra boților” în rezumat, ora barei următoare, intro-ul pliat, refuzul Pionex citit din răspuns (200 {result:false}).
var rfStare = { monede: [], la: 0, inLucru: false, eroare: null, simboluri: [], tf: "60M", filtru: "toate", adanc: false, perTf: {} };
var RF_TF = { "60M": { eticheta: "1h", bare: 500, ms: 3600000 }, "4H": { eticheta: "4h", bare: 500, ms: 14400000 } };
var RF_PAUZA_MS = 250;   // Pionex blochează IP-ul la prea multe cereri (serverul le ține 90 s în cache)
var RF_MAX = 30;
var RF_PROASPAT = 3;     // semnal „proaspăt” = în ultimele 3 bare închise
function rfEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
// regula casei (03.10): rezultatele cu O SINGURĂ zecimală, minusul tipografic („−0,8”), „12,4%” - prin TextRo (revizia Opus 04.11)
function rfNr(v, zec) { return TextRo.num(v, zec == null ? 1 : zec); }
function rfPct(v, zec) { return v == null || !isFinite(v) ? "—" : TextRo.pct(v * 100, zec == null ? 1 : zec); }
function rfPret(p) { if (!(p > 0)) return "—"; var z = p < 0.01 ? 6 : p < 1 ? 4 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
function rfOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
function rfPauza(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function rfBara(v, vmax) { var n = v == null || !isFinite(v) || !(vmax > 0) ? 0 : Math.min(8, Math.max(0, Math.round(Math.abs(v) / vmax * 8))), s = ""; for (var i = 0; i < 8; i++) s += i < n ? "█" : "·"; return s; }
function rfBare(v, cls) { return '<span class="rfBara ' + (cls || "") + '" aria-hidden="true">' + v + "</span>"; }
// v100.301: direcția boților (LONG / SHORT) pe moneda lor, ca rezumatul să spună „contra boților”
function rfDirectiiBoti(boti) {
  var d = {};
  (boti || []).forEach(function (b) {
    if (!b || !b.activ || !b.baza) return;
    var s = typeof TabloBot !== "undefined" && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    var n = String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase();
    var dir = String(b.directie || b.direction || "").toUpperCase();   // tbStare.boti și /api/bot-orders scriu „LONG” / „SHORT”; la nevoie și minuscule
    if (dir === "LONG" || dir === "SHORT") d[n] = dir;
  });
  return d;
}
function rfSimboluri(boti, clasament) {
  if (typeof tzSimboluri === "function") return tzSimboluri(boti, clasament).slice(0, RF_MAX);
  return ["BTC", "ETH", "SOL"].map(function (m) { return { simbol: m, pionex: m + "_USDT_PERP", fel: "piata" }; });
}
function rfProaspat(m) { return !!(m.c && !m.c.eroare && m.c.semnal && m.c.semnal.acum <= RF_PROASPAT); }
// v100.301: ordinea cartelelor - boții tăi, apoi semnalele proaspete (cele mai noi primele), apoi restul în ordinea listei; stabil
function rfOrdoneaza(monede) {
  return monede.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) {
    var ra = a.m.fel === "bot" ? 0 : rfProaspat(a.m) ? 1 : 2, rb = b.m.fel === "bot" ? 0 : rfProaspat(b.m) ? 1 : 2;
    if (ra !== rb) return ra - rb;
    if (ra === 1) return a.m.c.semnal.acum - b.m.c.semnal.acum;
    return a.i - b.i;
  }).map(function (x) { return x.m; });
}
function rfFiltreaza(monede, filtru) {
  if (filtru === "semnale") return monede.filter(rfProaspat);
  if (filtru === "boti") return monede.filter(function (m) { return m.fel === "bot"; });
  return monede;
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
    detalii: "semnale " + rfNr(c.sigPer100) + " / 100 de bare (proba: 2,45) · ținere " + (c.tinere == null ? "—" : TextRo.cate(Math.round(c.tinere), "bară", "bare")) + " (proba: 34) · whipsaw " + rfNr(c.whipPct, 1) + " % (proba: 1)" + " · " + TextRo.cate(c.n, "bară închisă", "bare închise")
  };
}
function rfRand(et, bara, val, ton, reper, tip) {
  return '<div class="rfRand"' + (tip ? ' title="' + rfEsc(tip) + '"' : "") + '><span class="rfEt">' + rfEsc(et) + "</span>" + (bara != null ? rfBare(bara, "rfTon-" + ton) : '<span class="rfBara rfGol" aria-hidden="true"></span>') + '<b class="rfVal rfTon-' + ton + '">' + rfEsc(val) + "</b>" + (reper ? '<span class="rfMut rfMic">' + rfEsc(reper) + "</span>" : "") + "</div>";
}
function rfCartela(m) {
  var contra = m.fel === "bot" && m.directie && m.c && !m.c.eroare && ((m.c.dir === 1 && m.directie === "SHORT") || (m.c.dir === -1 && m.directie === "LONG"));
  var h = '<article class="rfCard' + (m.eroare || !m.c || m.c.eroare ? " rfCardGol" : "") + (m.fel === "bot" ? " rfCardBot" : "") + (rfProaspat(m) ? " rfCardProaspat" : "") + '" aria-label="' + rfEsc(m.simbol) + '">';
  h += '<div class="rfCardCap"><b class="rfSimbol">' + rfEsc(m.simbol) + "</b>" + (m.fel === "bot" ? '<span class="rfEticheta' + (contra ? " rfContra" : "") + '">' + (contra ? "botul tău · CONTRA" : "botul tău" + (m.directie ? " · " + m.directie : "")) + "</span>" : "") + (rfProaspat(m) ? '<span class="rfEticheta rfProaspatEt">semnal nou</span>' : "") + '<span class="rfMut rfMic">' + (m.c && m.c.pret ? rfPret(m.c.pret) + " USDT" : "") + "</span></div>";
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
  h += rfRand("DOVADA", rfBara(c.dovada.hit, 100), t.dovada, t.dovadaTon, t.dovadaR, "Cât din semnalele BUY / SELL de pe moneda asta au mers în direcția lor după " + RangeFilter.DIRH + " bare. DOVEDIT doar cu ≥ " + RangeFilter.MIN_EP + " cazuri și marginea Wilson 95 % peste 50." + (c.n < 900 ? " Pe 500 de bare ies ~12 cazuri: pornește „DOVADA pe 1.000 de bare”." : ""));
  h += rfRand("SEMNAL", null, t.semnal, t.semnalTon, t.semnalR, "");
  h += '<p class="rfMut rfMic">' + rfEsc(t.detalii) + "</p>";
  h += '<div class="rfAct"><button class="acBtn" type="button" data-action-click="rfLaGrid(\'' + rfEsc(m.pionex) + '\')">Grid: ce setez? →</button></div>';
  return h + "</article>";
}
function rfRezumat(monede) {
  var ok = monede.filter(function (m) { return m.c && !m.c.eroare; });
  if (!ok.length) return "";
  var sus = ok.filter(function (m) { return m.c.dir === 1; }).length, jos = ok.filter(function (m) { return m.c.dir === -1; }).length;
  var proaspete = ok.filter(rfProaspat).map(function (m) { return m.simbol + " " + m.c.semnal.fel; });
  var cons = ok.filter(function (m) { return m.c.regim.cons; }).length;
  var contra = ok.filter(function (m) { return m.fel === "bot" && m.directie && ((m.c.dir === 1 && m.directie === "SHORT") || (m.c.dir === -1 && m.directie === "LONG")); }).map(function (m) { return m.simbol + " (" + m.directie.toLowerCase() + ", RF " + (m.c.dir === 1 ? "sus" : "jos") + ")"; });
  var t = "Acum: " + sus + " din " + ok.length + " în trend sus, " + jos + " în trend jos, " + cons + " în consolidare.";
  if (proaspete.length) t += " Semnale din ultimele " + TextRo.cate(RF_PROASPAT, "bară", "bare") + ": " + proaspete.join(", ") + ".";
  t += contra.length ? " Contra boților tăi: " + contra.join(", ") + "." : (ok.some(function (m) { return m.fel === "bot" && m.directie; }) ? " Niciun bot de-al tău contra direcției RF." : "");
  return '<p class="rfRezumat">' + rfEsc(t) + "</p>";
}
// v100.301: ora la care se închide bara următoare (din ultima bară închisă + interval)
function rfUrmatoarea(st) {
  var tf = RF_TF[st.tf] || RF_TF["60M"], t = 0;
  st.monede.forEach(function (m) { if (m.c && !m.c.eroare && m.c.t > t) t = m.c.t; });
  return t > 0 ? t + 2 * tf.ms : 0;   // ultima închisă + bara în curs
}
function rfHtml(st) {
  var tf = RF_TF[st.tf] || RF_TF["60M"], urm = rfUrmatoarea(st);
  var h = '<div class="rfAntet"><h3>Range Filter</h3><span class="rfMut rfMic" id="rfCand">' + (st.la ? "citit la " + rfOra(st.la) + " · " + tf.eticheta + (urm ? " · bara următoare se închide la " + rfOra(urm) : "") : tf.eticheta) + '</span><div class="rfDr">';
  h += '<span class="rfTf" role="group" aria-label="Interval">' + Object.keys(RF_TF).map(function (k) { return '<button class="acBtn' + (st.tf === k ? " rfTfOn" : "") + '" type="button" data-action-click="rfTf(\'' + k + '\')">' + RF_TF[k].eticheta + "</button>"; }).join("") + "</span>";
  h += '<button class="acBtn' + (st.adanc ? " rfTfOn" : "") + '" type="button" data-action-click="rfAdanc()" title="A doua pagină de lumânări (1.000 în loc de 500): DOVADA ajunge la ~24 de cazuri. 2 cereri pe monedă spre Pionex.">DOVADA pe 1.000 de bare' + (st.adanc ? " ✓" : "") + "</button>";
  h += '<button class="acBtn" type="button" data-action-click="rfPorneste(true)">↻ Recitește</button></div></div>';
  h += '<details class="rfIntro"><summary>Range Filter (DonovanWall) + Trender pe monedele tale - același motor ca scriptul din TradingView. Cinstit: în probă NIMIC nu s-a dovedit; e un colorant de trend, nu un semnal. <span class="rfMut">(mai mult)</span></summary>';
  h += '<p>Direcția filtrului cu bandă moartă (TREND SUS / JOS), semnalul BUY / SELL la schimbarea ei, distanța până la filtru, lățimea benzii, regimul (consolidare după panta MA), MA colorată, aprinderea. Același motor ca Range Filter B&S v2.1+ din TradingView. ';
  h += "Proba din 04.11.2026 (Binance perp, 21 de perechi, 1h + 4h, după cost): semnalul nu plătește, direcția nimerește 48 % la 10 bare, aprinderea nu plătește. E un colorant de trend curat (2,45 semnale / 100 de bare, whipsaw 1 %), bun ca filtru de direcție lângă altceva, nu ca semnal singur. Rândul DOVADA o măsoară pe fiecare monedă.</p></details>";
  var fil = [["toate", "Toate"], ["semnale", "Semnale noi"], ["boti", "Boții tăi"]];
  h += '<div class="rfFiltre" role="group" aria-label="Filtru">' + fil.map(function (f) { return '<button class="acBtn' + (st.filtru === f[0] ? " rfTfOn" : "") + '" type="button" data-action-click="rfFiltru(\'' + f[0] + '\')">' + f[1] + "</button>"; }).join("") + "</div>";
  if (st.inLucru && !st.monede.length) h += '<p class="rfMut">Aduc lumânările…</p>';
  else if (st.eroare && !st.monede.length) h += '<p class="rfRau">' + rfEsc(st.eroare) + ' <button class="acBtn" type="button" data-action-click="rfPorneste(true)">Încearcă din nou</button></p>';
  else if (!st.monede.length) h += '<p class="rfMut">Nicio monedă încă - apasă „Recitește”.</p>';
  else {
    var lista = rfFiltreaza(rfOrdoneaza(st.monede), st.filtru);
    h += (st.eroare ? '<p class="rfRau">' + rfEsc(st.eroare) + "</p>" : "") + rfRezumat(st.monede) + (st.inLucru ? '<p class="rfMut rfMic">Mai citesc… ' + st.monede.length + " / " + st.simboluri.length + "</p>" : "");
    h += lista.length ? '<div class="rfGrila">' + lista.map(rfCartela).join("") + "</div>" : '<p class="rfMut">' + (st.filtru === "semnale" ? "Niciun semnal în ultimele " + TextRo.cate(RF_PROASPAT, "bară", "bare") + "." : "Niciun bot activ.") + "</p>";
  }
  return h;
}
function rfDeseneaza() { var el = document.getElementById("rfPagina"); if (el) el.innerHTML = rfHtml(rfStare); }
// v100.301: comutarea intervalului păstrează citirea celuilalt (cache 10 min pe interval)
function rfTf(k) {
  if (!RF_TF[k] || rfStare.inLucru) return;
  rfStare.perTf[rfStare.tf] = { monede: rfStare.monede, la: rfStare.la, simboluri: rfStare.simboluri };
  var c = rfStare.perTf[k] || { monede: [], la: 0, simboluri: [] };
  rfStare.tf = k; rfStare.monede = c.monede; rfStare.la = c.la; rfStare.simboluri = c.simboluri; rfStare.eroare = null;
  return rfPorneste(false);   // întoarce promisiunea (proba o așteaptă)
}
function rfFiltru(f) { if (f === "toate" || f === "semnale" || f === "boti") { rfStare.filtru = f; rfDeseneaza(); } }
function rfAdanc() { if (rfStare.inLucru) return; rfStare.adanc = !rfStare.adanc; rfStare.perTf = {}; rfStare.la = 0; rfStare.monede = []; return rfPorneste(true); }
function rfLaGrid(simbol) { if (typeof tzLaGrid === "function") tzLaGrid(simbol); else navTo("gridset", true); }
// v100.301: lumânările unei monede - o pagină (500) sau două (a doua cu endTime înaintea primei); refuzul Pionex vine 200 {result:false, retryAfter}
async function rfLumanari(pionex, tf, adanc) {
  var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(pionex) + "&interval=" + tf + "&limit=" + RF_TF[tf].bare);
  if (k && k.result === false) return { refuz: k.retryAfter != null, eroare: k.error ? String(k.error).slice(0, 80) : "fără lumânări de la Pionex" };
  var randuri = (k && k.data && k.data.klines) || [];
  if (adanc && randuri.length) {
    var primul = randuri.reduce(function (t, r) { var x = Number(r && r.time); return x > 0 && (t === 0 || x < t) ? x : t; }, 0);
    if (primul > 0) {
      await rfPauza(RF_PAUZA_MS);
      var k2 = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(pionex) + "&interval=" + tf + "&limit=" + RF_TF[tf].bare + "&endTime=" + (primul - 1));
      if (k2 && k2.result === false && k2.retryAfter != null) return { refuz: true, eroare: "Pionex a refuzat (prea multe cereri)" };
      if (k2 && k2.data && k2.data.klines) randuri = k2.data.klines.concat(randuri);
    }
  }
  var bare = typeof GridCalcul !== "undefined" ? GridCalcul.bare(randuri) : null;
  return bare && bare.length ? { bare: bare } : { refuz: false, eroare: "fără lumânări de la Pionex" };
}
async function rfPorneste(forta) {
  if (rfStare.inLucru) return;
  var proaspat = rfStare.la && Date.now() - rfStare.la < 10 * 60 * 1000, cuDate = rfStare.monede.some(function (m) { return m.c && !m.c.eroare; });
  if (!forta && proaspat && cuDate) { rfDeseneaza(); return; }
  rfStare.inLucru = true; rfStare.eroare = null;
  var monede = [], tf = rfStare.tf;
  try {
    var boti = typeof tzBotiActivi === "function" ? await tzBotiActivi() : [], cl = null, dir = rfDirectiiBoti(boti);
    try { var c = await getJSON("/api/istoric-bot?action=clasament"); cl = c && c.clasament || null; } catch (e) { cl = null; }
    rfStare.simboluri = rfSimboluri(boti, cl); rfDeseneaza();
    for (var i = 0; i < rfStare.simboluri.length; i++) {
      var s = rfStare.simboluri[i], baza = { simbol: s.simbol, pionex: s.pionex, fel: s.fel, directie: s.fel === "bot" ? dir[s.simbol] || null : null };
      try {
        var l = await rfLumanari(s.pionex, tf, rfStare.adanc);
        if (l.refuz) { monede.push(Object.assign(baza, { eroare: "Pionex a refuzat (prea multe cereri)" })); rfStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
        monede.push(Object.assign(baza, { c: l.bare ? RangeFilter.citire(l.bare) : { eroare: l.eroare } }));
      } catch (e) {
        var msg = String(e && e.message || e);
        monede.push(Object.assign(baza, { eroare: "nu am putut citi lumânările (" + msg.slice(0, 80) + ")" }));
        if (/429|prea multe|rate/i.test(msg)) { rfStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”."; break; }
      }
      rfStare.monede = monede.slice(); rfDeseneaza();   // cartelele apar pe rând, nu toate la final
      if (i < rfStare.simboluri.length - 1) await rfPauza(RF_PAUZA_MS);
    }
    rfStare.monede = monede; rfStare.la = Date.now();
    rfStare.perTf[tf] = { monede: monede, la: rfStare.la, simboluri: rfStare.simboluri };
    if (!monede.length) rfStare.eroare = "Nicio monedă de citit.";
  } finally { rfStare.inLucru = false; rfDeseneaza(); }
}
