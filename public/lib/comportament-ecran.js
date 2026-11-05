// Pagina „Comportament” (v100.286; el, 31.10: „vreau să faci pagina dedicată în Radar pe comportament cu tot ce ți-am cerut”, demo aprobat):
// desenează raportul colectorului (scripts/lib/pagina-comportament.mjs, KV comportament:raport) - evaluarea ta comportamentală, frâna de azi,
// seara, pornirile cu frâna trasă, evaluările boților (ca pe Discord), regulile, frâna săptămânii, oglinda lunii, profitul real. Textele vin
// gata de la colector (o zecimală, punct la mii); aici doar așezarea. coHtml e fără DOM (proba o rulează în vm); coPorneste leagă pagina.
var coStare = { raport: null, la: 0, inLucru: false, eroare: null, filtru: null, deschis: undefined };
var CO_VERDICT = {
  bune: { nume: "Decizii bune", explica: "reguli respectate, pe plus" },
  ghinion: { nume: "Ghinion", explica: "reguli respectate, pe minus" },
  noroc: { nume: "Noroc", explica: "reguli încălcate, pe plus" },
  cost: { nume: "Greșeala a costat", explica: "reguli încălcate, pe minus" }
};
function coEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function coTon(t) { return t === "bun" ? " coBun" : t === "rau" ? " coRau" : t === "atentie" ? " coAtentie" : ""; }
function coSemn1(v) { var x = Math.round(Math.abs(Number(v) || 0) * 10) / 10; if (!x) return "0,0"; var s = x.toFixed(1).split("."), m = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (v > 0 ? "+" : "−") + m + "," + s[1]; }
function coOra(t, acum) {
  var n = Number(t); if (!(n > 0)) return "—";
  try {
    var o = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(n));
    var z = function (x) { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit" }).format(new Date(x)); };
    return z(n) === z(acum || Date.now()) ? o : z(n) + " " + o;
  } catch (e) { return "—"; }
}
function coCap(titlu, sub, id) { return '<div class="coBlocCap"><h3 id="' + id + '">' + coEsc(titlu) + "</h3>" + (sub ? '<span class="coMut coMic">' + coEsc(sub) + "</span>" : "") + "</div>"; }
function coLista(l, semn, cls, gol) {
  if (!l || !l.length) return '<p class="coMut coMic">' + coEsc(gol) + "</p>";
  return '<ul class="coLista">' + l.map(function (t) { return '<li><span class="coSemnL ' + cls + '" aria-hidden="true">' + semn + "</span><span>" + coEsc(t) + "</span></li>"; }).join("") + "</ul>";
}
// evaluarea ta comportamentală: sfatul săptămânii, disciplina la pornire, bine / greșit, corecțiile
function coEvalHtml(r) {
  var d = r.disciplina || { randuri: [] }, h = '<section class="coBloc coEval" aria-labelledby="co-h-eval">';
  h += '<div class="coBlocCap"><h3 id="co-h-eval" class="coMare">Evaluarea ta comportamentală</h3><span class="coMut coMic">din boții tăi: ultimele 7 zile, lunile și toată istoria</span></div>';
  if (r.sfat) h += '<p class="coSfat">👉 ' + coEsc(r.sfat) + "</p>";
  h += '<div class="coDisc"><h4>Disciplina la pornire</h4><p class="coMut coMic">' + coEsc(d.nota || "") + "</p>";
  h += (d.randuri || []).map(function (x) {
    return '<div class="coDiscRand"><span class="coMut coMic">' + coEsc(x.eticheta) + '</span><span class="coBara" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, Number(x.lat) || 0)) + '%"></span></span><span class="coDr">' + coEsc(x.text) + "</span></div>";
  }).join("");
  if (d.fraza) h += '<p class="coMic">' + coEsc(d.fraza) + ' <span class="coMut">Ce s-a întâmplat, nu o dovadă.</span></p>';
  h += "</div>";
  h += '<div class="coDoua"><div><h4 class="coBun">Ce faci bine</h4>' + coLista(r.bine, "✓", "coBun", "Nimic de pus aici încă, pe datele de acum.") + "</div>";
  h += '<div><h4 class="coRau">Ce greșești</h4>' + coLista(r.rau, "✕", "coRau", "Nimic de îndreptat pe datele de acum.") + "</div></div>";
  h += '<div class="coCorectii"><h4>Corecțiile: regulile tale și cum stai cu ele</h4>';
  h += (r.corectii || []).map(function (c) {
    return '<div class="coCor"><b>' + coEsc(c.regula) + (c.recomandare ? ' <span class="coRec" title="Recomandarea mea din analiza de pe 30.10, nu un prag din Poarta ta">recomandare</span>' : "") + '</b><span class="coChip' + coTon(c.ton) + '">' + coEsc(c.stare) + "</span>"
      + (c.dece ? '<span class="coDece coMut coMic">' + coEsc(c.dece) + "</span>" : "") + "</div>";
  }).join("");
  return h + "</div></section>";
}
// rândul de sus: frâna de azi, seara, pornirile cu frâna trasă
function coAziHtml(a) {
  if (!a) return "";
  var h = '<section class="coBloc' + (a.activa ? " coBlocRau" : "") + '" aria-labelledby="co-h-azi"><div class="coBlocCap"><h3 id="co-h-azi">Azi</h3><span class="coChip coChipAzi' + (a.activa ? " coRau" : " coBun") + '">' + coEsc(a.eticheta) + "</span></div>";
  h += '<p class="coTitluMare">' + coEsc(a.titlu) + "</p>";
  h += '<div class="coCifre">' + (a.cifre || []).map(function (c) { return '<div class="coCifra"><b>' + coEsc(c.v) + '</b><span class="coMut coMic">' + coEsc(c.et) + "</span></div>"; }).join("") + "</div>";
  if (a.nota) h += '<p class="coMut">' + coEsc(a.nota) + "</p>";
  if (a.sfat) h += "<p>👉 " + coEsc(a.sfat) + "</p>";
  return h + '<button type="button" class="coLink" data-action-click="navTo(\'gridset\',true)">Deschide Poarta</button></section>';
}
function coSearaHtml(s) {
  if (!s) return "";
  var h = '<section class="coBloc" aria-labelledby="co-h-seara">' + coCap("Seara de azi", "pe Discord la 22:00", "co-h-seara") + '<p class="coTitluMediu">' + coEsc(s.titlu) + "</p>";
  if (s.randuri && s.randuri.length) h += '<div class="coLinii">' + s.randuri.map(function (x) { return '<div class="coLinie"><span>' + coEsc(x.et) + '</span><b class="' + coTon(x.ton).trim() + '">' + coEsc(x.v) + "</b></div>"; }).join("") + "</div>";
  if (s.sfat) h += "<p>👉 " + coEsc(s.sfat) + "</p>";
  return h + "</section>";
}
function coPorniriHtml(l, n) {
  var tot = Math.round(Number(n) || 0), h = '<section class="coBloc" aria-labelledby="co-h-porn">' + coCap("Porniți cu frâna trasă", "ultimele 7 zile" + (l && tot > l.length ? " · cele mai noi " + l.length + " din " + tot : ""), "co-h-porn");
  if (!l || !l.length) return h + '<p class="coMut">Niciun bot pornit cu frâna trasă în ultimele 7 zile.</p></section>';
  var unul = function (p) {
    return '<div class="coPornit"><div class="coPornitCap"><b>' + coEsc(p.titlu) + '</b><span class="coMut coMic">' + coEsc(p.cand + " · " + p.stare) + "</span></div><span>" + coEsc(p.frana) + "</span>"
      + (p.inainte ? '<span class="coMut">' + coEsc(p.inainte) + "</span>" : "") + (p.sfat ? "<span>👉 " + coEsc(p.sfat) + "</span>" : "") + "</div>";
  };
  // poza lângă demo: la vedere cei mai noi 3 (rândul de sus rămâne cât Azi și Seara), restul pliat
  return h + l.slice(0, 3).map(unul).join("") + (l.length > 3 ? '<details class="coMai"><summary>Încă ' + (l.length - 3) + "</summary>" + l.slice(3).map(unul).join("") + "</details>" : "") + "</section>";
}
// evaluările: căsuțele verdictelor filtrează; clic pe o evaluare ⇒ textul întreg, ca pe Discord
function coEvaluariHtml(r, ui) {
  var ev = r.evaluari || [], V = r.verdicte || {}, filtru = ui.filtru && CO_VERDICT[ui.filtru] ? ui.filtru : null;
  var deschis = ui.deschis === undefined ? (ev[0] && ev[0].id) : ui.deschis;
  var h = '<section class="coBloc" aria-labelledby="co-h-ev">' + coCap("Evaluările boților închiși", "câte una după fiecare bot închis, la fel ca pe Discord" + (r.nEvaluari > ev.length ? " · ultimele " + ev.length : ""), "co-h-ev");
  if (!ev.length) return h + '<p class="coMut">Încă nicio evaluare: apar după primul bot închis.</p></section>';
  h += '<div class="coVerdicte" role="group" aria-label="Arată doar un verdict">' + Object.keys(CO_VERDICT).map(function (k) {
    var v = V[k] || { n: 0, net: 0 }, nV = Math.max(0, Math.round(Number(v.n) || 0)), ap = filtru === k;
    return '<button type="button" class="coV' + (ap ? " coVap" : "") + '" aria-pressed="' + ap + '" data-action-click="coFiltru(\'' + k + '\')"><span class="coMut coMic">' + CO_VERDICT[k].nume + '</span><b class="coVnr coV-' + k + (nV ? "" : " coGol") + '">' + (nV ? nV + " · " + coSemn1(v.net) : "0") + '</b><span class="coMut coMic">' + CO_VERDICT[k].explica + "</span></button>";
  }).join("") + "</div>";
  var l = ev.filter(function (e) { return !filtru || e.verdict === filtru; });
  h += '<p class="coMut coMic">' + (filtru ? "Arăt doar „" + CO_VERDICT[filtru].nume + "”: " + l.length + " din " + ev.length + ". Apasă din nou pe căsuță ca să le vezi pe toate."
    : ev.length === 1 ? "O singură evaluare. Apasă pe ea ca s-o vezi întreagă." : "Toate cele " + ev.length + ", cele mai noi sus" + (r.nEvaluari > ev.length ? " (ultimele " + ev.length + " din " + r.nEvaluari + ")" : "") + ". Apasă pe o evaluare ca s-o vezi întreagă, sau pe o căsuță de sus ca să păstrezi doar un verdict.") + "</p>";
  h += '<ul class="coEvList">' + l.map(function (e) {
    var d = deschis === e.id, vn = CO_VERDICT[e.verdict] || { nume: e.verdict }, id = String(e.id).replace(/[^A-Za-z0-9_-]/g, "");
    return '<li><button type="button" class="coEvBtn" aria-expanded="' + d + '" data-action-click="coComuta(\'' + id + '\')"><span class="coEvCand coMut coMic">' + coEsc(e.cand) + '</span><span class="coEvTitlu">' + coEsc(e.titlu) + '</span><span class="coChip coChipV-' + coEsc(e.verdict) + '">' + coEsc(vn.nume) + "</span></button>"
      + (d ? '<div class="coEvText">' + coEsc(e.mesaj) + (e.refacut ? '<span class="coMut coMic coEvNota">Text refăcut din arhivă: jurnalul de dinainte de v100.286 ținea doar regulile, nu și textul trimis pe Discord.</span>' : "") + "</div>" : "") + "</li>";
  }).join("") + "</ul>";
  return h + "</section>";
}
function coReguliHtml(g) {
  if (!g) return "";
  var h = '<section class="coBloc" aria-labelledby="co-h-reg"><div class="coBlocCap"><h3 id="co-h-reg">Regulile tale</h3></div><p class="coMut coMic">Luna asta (' + coEsc(g.lunaNume) + "), din boții evaluați (evaluarea a pornit pe 30.10).</p>";
  h += (g.luna && g.luna.length ? '<div class="coLinii">' + g.luna.map(function (x) { return '<div class="coLinie"><span>' + coEsc(x.nume) + ' <span class="coMut">· ' + coEsc(x.cate) + '</span></span><b class="' + coTon(x.ton).trim() + '">' + coEsc(x.net) + "</b></div>"; }).join("") + "</div>"
    : '<p class="coMut">Niciun bot evaluat cu reguli încălcate în ' + coEsc(g.lunaNume) + ".</p>");
  h += "<p>" + coEsc(g.noi) + "</p>";
  if (g.istoria) h += '<p class="coMut">' + coEsc(g.istoria) + "</p>";
  return h + "</section>";
}
function coFranaSaptHtml(s) {
  if (!s) return "";
  var h = '<section class="coBloc" aria-labelledby="co-h-sapt"><div class="coBlocCap"><h3 id="co-h-sapt">Frâna în ultimele 7 zile</h3></div><p class="coTitluMediu">' + coEsc(s.titlu) + "</p>";
  if (s.sub) h += '<p class="coMut">' + coEsc(s.sub) + "</p>";
  h += '<div class="coZile">' + (s.zile || []).map(function (z) {
    return '<div class="coZi"><span class="coMut coMic">' + coEsc(z.zi) + '</span><span class="coBaraZi" aria-hidden="true" style="width:' + Math.max(0, Math.min(100, Number(z.lat) || 0)) + '%"></span><span class="coDr">' + coEsc(z.boti) + '</span><b class="coDr' + coTon(z.ton) + '">' + coEsc(z.net) + "</b></div>";
  }).join("") + "</div>";
  return h + '<p class="coMut coMic">Bara: câți boți ai pornit în ziua aceea cu frâna trasă. Suma: cât au dat cei închiși.</p></section>';
}
function coOglindaHtml(o, nota) {
  var h = '<section class="coBloc" aria-labelledby="co-h-og">';
  if (!o) return h + coCap("Oglinda lunii", "pe Discord pe 1 ale lunii", "co-h-og") + '<p class="coMut">' + coEsc(nota || "Încă nu sunt destui boți pentru oglindă.") + "</p></section>";
  h += coCap(o.titlu, "pe Discord pe 1 ale lunii", "co-h-og") + '<p class="coMut">' + coEsc(o.intro) + "</p>";
  h += '<div class="coDerul"><div class="coTabel"><div class="coTRand coTCap">' + (o.cap || []).map(function (c) { return "<span>" + coEsc(c) + "</span>"; }).join("") + "</div>";
  h += (o.randuri || []).map(function (x) { return '<div class="coTRand"><span>' + coEsc(x.nume) + "</span><span>" + coEsc(x.acum) + '</span><span class="coMut">' + coEsc(x.inainte) + '</span><b class="' + coTon(x.ton).trim() + '">' + coEsc(x.sens) + "</b></div>"; }).join("");
  h += "</div></div>";
  if (o.sfat) h += "<p>👉 " + coEsc(o.sfat) + "</p>";
  return h + "</section>";
}
function coProfitHtml(p) {
  var h = '<section class="coBloc" aria-labelledby="co-h-profit">' + coCap("Profitul real", "doar ce s-a închis · pe Discord duminica la 20", "co-h-profit");
  if (!p) return h + '<p class="coMut">Profitul real vine cu raportul următor al colectorului.</p></section>';
  h += '<div class="coPiete">' + (p.piete || []).map(function (q) {
    var x = '<div class="coPiata"><h4 class="coMut">' + coEsc(q.nume) + "</h4>";
    if (!q.randuri || !q.randuri.length) return x + '<p class="coMut">' + coEsc(q.nota || "") + "</p></div>";
    x += q.randuri.map(function (r) { return '<div class="coPRand"><span>' + coEsc(r.perioada) + '</span><b class="coPNet' + coTon(r.ton) + '">' + coEsc(r.net) + '</b><span class="coMut coMic">' + coEsc(r.cate) + '</span><span class="coMut coMic coDr">' + coEsc(r.cost) + "</span></div>"; }).join("");
    return x + '<p class="coMic"><span class="coMut">Cei mai buni ai săptămânii:</span> ' + coEsc(q.buni) + '</p><p class="coMic"><span class="coMut">Cei mai slabi:</span> ' + coEsc(q.slabi) + "</p></div>";
  }).join("") + "</div>";
  return h + '<p class="coMut coMic">Netul după comisioane (la boți și după funding), aceleași cifre ca Jurnalul. Boții și pozițiile încă deschise nu intră.</p></section>';
}
function coHtml(r, ui) {
  ui = ui || {};
  var acum = ui.acum || Date.now(), btn = '<button type="button" class="coBtn" data-action-click="coPorneste(true)">Reîmprospătează</button>';
  var cap = function (sub) { return '<header class="coCapPag"><div><h2 class="coH1">Comportament</h2><p class="coMut coMic">' + sub + "</p></div>" + btn + "</header>"; };
  if (!r || typeof r !== "object" || r.forma !== 1) {
    return cap("Ce ai făcut cu boții tăi și cât te-a costat.") + '<p class="coMut">' + (ui.eroare ? "N-am putut aduce raportul: " + coEsc(ui.eroare) + ". Reîncearcă." : ui.inLucru ? "Aduc raportul colectorului…" : "Colectorul de acasă n-a trimis încă raportul paginii. Vine în câteva minute după ce pornește colectorul v101.158; apasă Reîmprospătează.") + "</p>";
  }
  // v100.306 (auditul final 05.11): fără niciun bot pornit raportul rămânea vechi și pagina zicea „colectorul pare oprit” (fals: colectorul
  // mergea, n-avea ce număra) ⇒ spune ce e: niciun bot pornit, și ultimul închis. ui.botiActivi: numărul citit, null = necitit.
  var vechi = acum - Number(r.la) > 30 * 60000, faraBoti = ui.botiActivi === 0;
  var h = cap("Ce ai făcut cu boții tăi și cât te-a costat. Pregătit de colectorul de acasă la " + coEsc(coOra(r.la, acum)) + "."
    + (vechi && faraBoti ? ' <span class="coMut">Niciun bot pornit acum' + (ui.ultimInchis ? "; ultimul închis: " + coEsc(ui.ultimInchis) : "") + ".</span>" : vechi ? ' <span class="coAtentie">Raportul are peste 30 de minute: colectorul pare oprit.</span>' : "") + (ui.eroare ? ' <span class="coAtentie">Reîmprospătarea n-a mers: ' + coEsc(ui.eroare) + ".</span>" : ""));
  if (r.evaluariLegat === false) h += '<p class="coAtentie">Canalul evaluărilor nu e legat la colector (DISCORD_WEBHOOK_EVALUARI): evaluările, seara și regulile pe date noi nu se mai actualizează.</p>';
  h += coEvalHtml(r);
  h += '<div class="coRand3">' + coAziHtml(r.azi) + coSearaHtml(r.seara) + coPorniriHtml(r.porniri, r.porniriN) + "</div>";
  h += coEvaluariHtml(r, ui);
  h += '<div class="coRand2">' + coReguliHtml(r.reguli) + coFranaSaptHtml(r.franaSapt) + "</div>";
  h += coOglindaHtml(r.oglinda, r.oglindaNota);
  h += coProfitHtml(r.profit);
  return h + '<p class="coMut coMic">Ce s-a întâmplat, nu ce urmează. Pragurile sunt ale tale, din Grid → Poarta; pagina doar le ține socoteala.</p>';
}
function coDeseneaza() {
  var box = document.getElementById("coPagina"); if (!box) return;
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : typeof contTot !== "undefined" ? contTot.boti : null;   /* v100.306: câți boți rulează (null = necitit) */
  box.innerHTML = coHtml(coStare.raport, { filtru: coStare.filtru, deschis: coStare.deschis, acum: Date.now(), eroare: coStare.eroare, inLucru: coStare.inLucru,
    botiActivi: Array.isArray(boti) ? boti.filter(function (b) { return b && b.activ; }).length : null, ultimInchis: typeof acUltimInchisText === "function" ? acUltimInchisText() : "" });
}
async function coPorneste(forta) {
  if (!document.getElementById("coPagina") || coStare.inLucru) return;
  if (!forta && coStare.raport && Date.now() - coStare.la < 60000) { coDeseneaza(); return; }
  coStare.inLucru = true; if (!coStare.raport) coDeseneaza();
  if (typeof contTotAsigura === "function") contTotAsigura().then(coDeseneaza, function () {});   /* v100.306: boții activi și ultimul închis, pentru rândul de sus */
  try { var d = await getJSON("/api/istoric-bot?action=comportament"); coStare.raport = d && d.comportament || null; coStare.eroare = null; coStare.la = Date.now(); }
  catch (e) { coStare.eroare = String(e && e.message || e); }
  coStare.inLucru = false;
  coDeseneaza();
}
function coFiltru(k) { coStare.filtru = coStare.filtru === k ? null : k; coDeseneaza(); }
function coComuta(id) {
  var ev = coStare.raport && coStare.raport.evaluari || [], deschis = coStare.deschis === undefined ? (ev[0] && ev[0].id) : coStare.deschis;
  coStare.deschis = deschis === id ? null : id; coDeseneaza();
}
