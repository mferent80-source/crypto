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
function coCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }   // v100.360: „de” de la 20, singularul la 1
function coN1(v) { var x = Number(v); return isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1).replace(".", ",") : "—"; }   // v100.360: o singură zecimală, fără semn
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
  if ((r.reguliDovezi || []).length) return h + '<p class="coMut coMic">Corecțiile — regulile tale, cum stai azi cu ele și ce spun datele despre ele — sunt mai jos, în „Regulile tale, judecate pe datele tale”.</p></section>';   // v100.360: o singură listă de reguli
  h += '<div class="coCorectii"><h4>Corecțiile: regulile tale și cum stai cu ele</h4>';
  h += (r.corectii || []).map(function (c) {
    return '<div class="coCor"><b>' + coEsc(c.regula) + (c.recomandare ? ' <span class="coRec" title="Recomandarea mea din analiza de pe 30.10, nu un prag din Poarta ta">recomandare</span>' : "") + '</b><span class="coChip' + coTon(c.ton) + '">' + coEsc(c.stare) + "</span>" + (c.stareDovezi ? '<span class="coDovChip coDov-' + coEsc(c.stareDovezi) + '" title="pe istoria ta">' + coEsc(CO_STARE[c.stareDovezi] || c.stareDovezi) + "</span>" : "")
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
  var ev = r.evaluari || [], nou = ev.some(function (e) { return "eticheta2" in e; }), CV = nou ? CO_AXA : CO_VERDICT, filtru = ui.filtru && CV[ui.filtru] ? ui.filtru : null, cheie = function (e) { return nou ? coAxa(e) : e.verdict; };
  var V = {}; if (nou) ev.forEach(function (e) { var k = coAxa(e), x = V[k] || (V[k] = { n: 0, net: 0 }); x.n++; x.net += Number(e.net) || 0; }); else V = r.verdicte || {};
  var deschis = ui.deschis === undefined ? (ev[0] && ev[0].id) : ui.deschis;
  var h = '<section class="coBloc" id="coSEv" aria-labelledby="co-h-ev">' + coCap("Evaluările boților închiși", "câte una după fiecare bot închis, la fel ca pe Discord" + (r.nEvaluari > ev.length ? " · ultimele " + ev.length : ""), "co-h-ev");
  if (!ev.length) return h + '<p class="coMut">Încă nicio evaluare: apar după primul bot închis.</p></section>';
  if (nou) h += '<p class="coMut coMic">Fiecare bot, față de ceilalți boți ai tăi porniți în aceeași zi: ce ține de tine, nu de piață. „Noroc” / „Greșeala a costat” apar doar când regula atinsă e dovedită pe istoria ta (azi niciuna).</p>';
  h += '<div class="coVerdicte" role="group" aria-label="Arată doar un fel">' + Object.keys(CV).map(function (k) {
    var v = V[k] || { n: 0, net: 0 }, nV = Math.max(0, Math.round(Number(v.n) || 0)), ap = filtru === k;
    return '<button type="button" class="coV' + (ap ? " coVap" : "") + '" aria-pressed="' + ap + '" data-action-click="coFiltru(\'' + k + '\')"><span class="coMut coMic">' + CV[k].nume + '</span><b class="coVnr coV-' + k + (nV ? "" : " coGol") + '">' + (nV ? nV + " · " + coSemn1(v.net) : "0") + '</b><span class="coMut coMic">' + CV[k].explica + "</span></button>";
  }).join("") + "</div>";
  var l = ev.filter(function (e) { return !filtru || cheie(e) === filtru; });
  h += '<p class="coMut coMic">' + (filtru ? "Arăt doar „" + CV[filtru].nume + "”: " + l.length + " din " + ev.length + ". Apasă din nou pe căsuță ca să le vezi pe toate."
    : ev.length === 1 ? "O singură evaluare. Apasă pe ea ca s-o vezi întreagă." : "Toate cele " + ev.length + ", cele mai noi sus" + (r.nEvaluari > ev.length ? " (ultimele " + ev.length + " din " + r.nEvaluari + ")" : "") + ". Apasă pe o evaluare ca s-o vezi întreagă, sau pe o căsuță de sus ca să păstrezi doar un verdict.") + "</p>";
  h += '<ul class="coEvList">' + l.map(function (e) {
    var d = deschis === e.id, k = cheie(e), vn = CV[k] || { nume: k }, id = String(e.id).replace(/[^A-Za-z0-9_-]/g, ""), mon = String(e.titlu || "").split(":")[0];
    var tit = nou ? mon + " — " + e.eticheta2 : e.titlu;   /* eticheta2 spune deja „față de ziua ta” */
    return '<li><button type="button" class="coEvBtn" aria-expanded="' + d + '" data-action-click="coComuta(\'' + id + '\')"><span class="coEvCand coMut coMic">' + coEsc(e.cand) + '</span><span class="coEvTitlu">' + coEsc(tit) + '</span><span class="coChip coChipV-' + coEsc(nou ? (k === "peste" ? "bune" : k === "sub" ? "cost" : "ghinion") : e.verdict) + '">' + coEsc(vn.nume) + "</span></button>"
      + (d ? '<div class="coEvText">' + (nou ? '<span class="coMut coMic coEvNota">Textul trimis atunci pe Discord:</span>' : "") + coEsc(e.mesaj) + (e.refacut ? '<span class="coMut coMic coEvNota">Text refăcut din arhivă: jurnalul de dinainte de v100.286 ținea doar regulile, nu și textul trimis pe Discord.</span>' : "") + "</div>" : "") + "</li>";
  }).join("") + "</ul>";
  return h + "</section>";
}
function coReguliHtml(g) {
  if (!g) return "";
  var h = '<section class="coBloc" id="coSReg" aria-labelledby="co-h-reg"><div class="coBlocCap"><h3 id="co-h-reg">Regulile tale</h3></div><p class="coMut coMic">Luna asta (' + coEsc(g.lunaNume) + "), din boții evaluați (evaluarea a pornit pe 30.10).</p>";
  h += (g.luna && g.luna.length ? '<div class="coLinii">' + g.luna.map(function (x) { return '<div class="coLinie"><span>' + coEsc(x.nume) + ' <span class="coMut">· ' + coEsc(x.cate) + '</span></span><b class="' + coTon(x.ton).trim() + '">' + coEsc(x.net) + "</b></div>"; }).join("") + "</div>"
    : '<p class="coMut">Niciun bot evaluat cu reguli încălcate în ' + coEsc(g.lunaNume) + ".</p>");
  h += "<p>" + coEsc(g.noi) + "</p>";
  if (g.istoria) h += '<p class="coMut">' + coEsc(g.istoria) + "</p>";
  return h + "</section>";
}
function coFranaSaptHtml(s) {
  if (!s) return "";
  var h = '<section class="coBloc" id="coSSapt" aria-labelledby="co-h-sapt"><div class="coBlocCap"><h3 id="co-h-sapt">Frâna în ultimele 7 zile</h3></div><p class="coTitluMediu">' + coEsc(s.titlu) + "</p>";
  if (s.sub) h += '<p class="coMut">' + coEsc(s.sub) + "</p>";
  h += '<div class="coZile">' + (s.zile || []).map(function (z) {
    return '<div class="coZi"><span class="coMut coMic">' + coEsc(z.zi) + '</span><span class="coBaraZi" aria-hidden="true" style="width:' + Math.max(0, Math.min(100, Number(z.lat) || 0)) + '%"></span><span class="coDr">' + coEsc(z.boti) + '</span><b class="coDr' + coTon(z.ton) + '">' + coEsc(z.net) + "</b></div>";
  }).join("") + "</div>";
  return h + '<p class="coMut coMic">Bara: câți boți ai pornit în ziua aceea cu frâna trasă. Suma: cât au dat cei închiși.</p></section>';
}
function coOglindaHtml(o, nota) {
  var h = '<section class="coBloc" id="coSOg" aria-labelledby="co-h-og">';
  if (!o) return h + coCap("Oglinda lunii", "pe Discord pe 1 ale lunii", "co-h-og") + '<p class="coMut">' + coEsc(nota || "Încă nu sunt destui boți pentru oglindă.") + "</p></section>";
  h += coCap(o.titlu, "pe Discord pe 1 ale lunii", "co-h-og") + '<p class="coMut">' + coEsc(o.intro) + "</p>";
  h += '<div class="coDerul"><div class="coTabel"><div class="coTRand coTCap">' + (o.cap || []).map(function (c) { return "<span>" + coEsc(c) + "</span>"; }).join("") + "</div>";
  h += (o.randuri || []).map(function (x) { return '<div class="coTRand"><span>' + coEsc(x.nume) + "</span><span>" + coEsc(x.acum) + '</span><span class="coMut">' + coEsc(x.inainte) + '</span><b class="' + coTon(x.ton).trim() + '">' + coEsc(x.sens) + "</b></div>"; }).join("");
  h += "</div></div>";
  if (o.sfat) h += "<p>👉 " + coEsc(o.sfat) + "</p>";
  return h + "</section>";
}
function coProfitHtml(p) {
  var h = '<section class="coBloc" id="coSProfit" aria-labelledby="co-h-profit">' + coCap("Profitul real", "doar ce s-a închis · pe Discord duminica la 20", "co-h-profit");
  if (!p) return h + '<p class="coMut">Profitul real vine cu raportul următor al colectorului.</p></section>';
  h += '<div class="coPiete">' + (p.piete || []).map(function (q) {
    var x = '<div class="coPiata"><h4 class="coMut">' + coEsc(q.nume) + "</h4>";
    if (!q.randuri || !q.randuri.length) return x + '<p class="coMut">' + coEsc(q.nota || "") + "</p></div>";
    x += q.randuri.map(function (r) { return '<div class="coPRand"><span>' + coEsc(r.perioada) + '</span><b class="coPNet' + coTon(r.ton) + '">' + coEsc(r.net) + '</b><span class="coMut coMic">' + coEsc(r.cate) + '</span><span class="coMut coMic coDr">' + coEsc(r.cost) + "</span></div>"; }).join("");
    return x + '<p class="coMic"><span class="coMut">Cei mai buni ai săptămânii:</span> ' + coEsc(q.buni) + '</p><p class="coMic"><span class="coMut">Cei mai slabi:</span> ' + coEsc(q.slabi) + "</p></div>";
  }).join("") + "</div>";
  return h + '<p class="coMut coMic">Netul după comisioane (la boți și după funding), aceleași cifre ca Jurnalul. Boții și pozițiile încă deschise nu intră.</p></section>';
}
// v100.360 (el, 18.11: „Comportament ca Jurnalul” ⇒ regulile rămân, spuse cinstit; evaluarea pe două axe; grafice; proba „3 la rând”)
var CO_STARE = { dovedita: "dovedită", nedovedita: "nedovedită", contrazisa: "contrazisă", putine: "puține date", descriere: "ce s-a întâmplat" };
// netul mediu pe bot pe toată istoria, din rândul frânei (cu + fără = toți boții judecați)
function coNetMed(r) { var f = (r.reguliDovezi || []).filter(function (x) { return x.cod === "frana"; })[0]; if (!f || !(f.n + f.nFara > 0)) return null; return (f.peBotCu * f.n + f.peBotFara * (f.nFara || 0)) / (f.n + (f.nFara || 0)); }
function coFrazaHtml(r, deschis) {
  var D = (r.reguliDovezi || []).filter(function (x) { return x.stare !== "descriere"; }), dov = D.filter(function (x) { return x.stare === "dovedita"; }), con = D.filter(function (x) { return x.stare === "contrazisa"; }), m = coNetMed(r), nT = D[0] ? D[0].n + (D[0].nFara || 0) : null;
  if (!D.length) return "";
  var fr = dov.length ? "Pe istoria ta se dovedesc " + dov.length + " din cele " + D.length + " reguli: " + dov.map(function (x) { return x.regula; }).join("; ") + "."
    : "Din cele " + D.length + " reguli ale tale, niciuna nu iese dovedită pe istoria ta" + (nT ? " (" + nT.toLocaleString("ro-RO") + " de boți)" : "") + (m !== null ? ": fiecare bot " + (m < 0 ? "pierde" : "aduce") + " în medie " + coSemn1(Math.abs(m)).replace(/^[+−]/, "") + " USDT, deci mai puțini boți înseamnă " + (m < 0 ? "mai puțină pierdere" : "mai puțin câștig") + ", oricare ar fi ei." : ".");
  var sub = "Regulile rămân disciplina ta — pragurile sunt ale tale, din Grid → Poarta." + (con.length ? " Contrazise de date: " + con.map(function (x) { return x.regula; }).join("; ") + "." : "") + " „3 pierderi la rând” e singurul semn și e în probă pe zile noi, de la 19.11.";
  var surse = ["Raportul colectorului de pe VPS, pregătit la " + coOra(r.la, Date.now()) + "; arhiva boților închiși (aceeași ca în Jurnal), netul după comisioane și funding.",
    "Pragurile frânei din configurarea ta: azi −" + (r.praguri ? r.praguri.zi : "?") + " pe zi, −" + (r.praguri ? r.praguri.sapt : "?") + " pe 7 zile, " + (r.praguri ? coCate(r.praguri.rand, "pierdere", "pierderi") : "? pierderi") + " la rând, " + (r.praguri ? coCate(r.praguri.boti, "bot", "boți") : "? boți") + " pe zi.",
    "Cum judec o regulă: pe bot, nu pe zi; netul amestecat între boții aceleiași zile și regula refăcută (999 de amestecări) - altfel o regulă declanșată de pierderile zilei pare bună mecanic; plus o blocare la întâmplare a acelorași boți și pragul pe toate regulile. „Dovedită” cere ambele sub 5%.",
    "Durata (sub 15 minute, peste 6 ore) se știe abia la închidere: e ce s-a întâmplat, nu un sfat la pornire."];
  return '<div class="coFrazaBox grFrazaBox"><p class="grFraza">' + coEsc(fr) + '</p><p class="grFrazaSub">' + coEsc(sub) + '</p><details class="grSurse"' + (deschis ? " open" : "") + '><summary>De unde știu</summary><ul>' + surse.map(function (x) { return "<li>" + coEsc(x) + "</li>"; }).join("") + "</ul></details></div>";
}
function coDovHtml(r) {
  var D = r.reguliDovezi || []; if (!D.length) return "";
  var h = '<section class="coBloc" id="coSDovezi" aria-labelledby="co-h-dov">' + coCap("Regulile tale, judecate pe datele tale", "cum stai azi · ce spun datele, pe bot, față de o blocare la întâmplare", "co-h-dov") + '<div class="coDov">';
  // corecția cu aceeași cheie (starea de AZI: „liberă”, „1 din 6 ori”…); „banda” (ieși când prețul stă peste 6 h) e rândul „ore6”
  var C = {}; (r.corectii || []).forEach(function (c) { if (c && c.cod) C[c.cod === "banda" ? "ore6" : c.cod] = c; });
  h += D.map(function (x) {
    var c = C[x.cod], azi = c ? String(c.dece || "").replace(String(x.text || ""), "").trim() : "";
    return '<div class="coDovRand"><b>' + coEsc(c ? c.regula : x.regula) + (c && c.recomandare ? ' <span class="coRec" title="Recomandarea mea din analiza de pe 30.10, nu un prag din Poarta ta">recomandare</span>' : "") + (c ? ' <span class="coChip' + coTon(c.ton) + '" title="azi">' + coEsc(c.stare) + "</span>" : "") + '</b><span class="coDovChip coDov-' + coEsc(x.stare) + '" title="pe istoria ta">' + coEsc(CO_STARE[x.stare] || x.stare) + "</span>"
      + '<span class="coDovText coMic">' + (azi ? '<span class="coMut">' + coEsc(azi) + "</span> " : "") + coEsc(x.text) + (x.cod === "treiLaRand" ? ' <span class="coProba">În probă pe zile noi, de la 19.11 (regula scrisă dinainte).</span> <button type="button" class="coLink" data-action-click="navTo(\'probe\',true)">Vezi proba ›</button>' : "") + "</span></div>";
  }).join("");
  return h + '</div><p class="coMut coMic">„Nedovedită” nu înseamnă că regula e greșită: înseamnă că datele tale nu pot spune dacă ajută. „Dovedită” cere ca regula să bată și amestecarea din aceeași zi, și o blocare la întâmplare.</p></section>';
}
function coGraficeHtml(r) {
  var g = r.grafice; if (!g) return ""; var G = typeof JurnalGrafice !== "undefined" ? JurnalGrafice : null;
  var lat = Math.max(300, Math.floor(((typeof document !== "undefined" && document.getElementById && document.getElementById("coPagina")) || {}).clientWidth || 900)), lj = (typeof window !== "undefined" && window.innerWidth >= 1024) ? Math.floor((lat - 16) / 2) : lat;
  var bare = function (rows) { if (!G || !rows || !rows.length) return ""; try { return G.bare(rows.map(function (x) { return { et: x.et, v: x.netPeBot, n: x.n != null ? x.n : x.boti, zile: x.zile, putine: !!x.putine, ic: x.ic || null }; }), { moneda: "USDT", unitate: "USDT", lat: lj }); } catch (e) { return ""; } };
  var h = '<section class="coBloc" id="coSGrafice" aria-labelledby="co-h-gr">' + coCap("Banii tăi pe obiceiuri", "net pe bot · intervalul pe zile · „puține” = sub 10 boți sau sub 10 zile", "co-h-gr") + '<div class="coGrGrila">';
  h += '<div class="coGr"><h5>Cât i-ai ținut</h5><p class="coMut coMic">' + coEsc(g.notaDurata || "") + "</p>" + bare(g.durata) + "</div>";
  h += '<div class="coGr"><h5>Câți boți ai pornit în zi</h5><p class="coMut coMic">netul pe bot al zilelor după câți boți ai pornit în ele</p>' + bare(g.botiZi) + "</div>";
  if (g.proasta && g.proasta.length) h += '<div class="coGr"><h5>A doua zi după o zi proastă</h5><p class="coMut coMic">câți boți ai pornit, la zile cu același număr de boți (altfel comparația minte)</p><table class="coTabMic"><thead><tr><th>Boți în ziua proastă</th><th>După o zi proastă</th><th>După celelalte</th></tr></thead><tbody>'
    + g.proasta.map(function (x) { return "<tr><td>" + coEsc(x.strat) + "</td><td>" + coN1(x.dupa) + ' <span class="coMut">(' + x.nDupa + " z)</span></td><td>" + coN1(x.altfel) + ' <span class="coMut">(' + x.nAltfel + " z)</span></td></tr>"; }).join("") + "</tbody></table></div>";
  if (g.frana30 && g.frana30.length) { var mx = Math.max.apply(null, g.frana30.map(function (z) { return z.boti || 0; }).concat([1])), nt = g.frana30.filter(function (z) { return z.trasa; }).length;
    h += '<div class="coGr"><h5>Frâna în ultimele 30 de zile</h5><p class="coMut coMic">bara = câți boți ai pornit; galben = zi cu frâna trasă (' + nt + " din 30)</p>"
      + '<div class="coFr30" role="img" aria-label="Boți porniți pe zi, ultimele 30 de zile; ' + coCate(nt, "zi", "zile") + ' cu frâna trasă">' + g.frana30.map(function (z) { return '<span class="' + (z.trasa ? "coFrTrasa" : "") + '" style="height:' + Math.round(100 * (z.boti || 0) / mx) + '%" title="' + coEsc(z.zi + ": " + coCate(z.boti, "bot", "boți") + (z.trasa ? ", frâna trasă" : "") + " · net " + coSemn1(z.net) + " USDT") + '"></span>'; }).join("") + "</div>"
      + '<p class="coMut coMic">' + coEsc(g.frana30[0].zi.split("-").reverse().join(".")) + " → " + coEsc(g.frana30[g.frana30.length - 1].zi.split("-").reverse().join(".")) + "</p></div>"; }
  return h + '</div><p class="coMut coMic">Ce s-a întâmplat pe istoria ta, nu ce va fi. Intervalul (mustățile) ține în 95 din 100 de reeșantionări pe zile.</p></section>';
}
// evaluarea pe două axe: față de ceilalți boți ai tăi din aceeași zi (ce ține de tine) + regulile atinse cu starea lor
var CO_AXA = { peste: { nume: "Peste ziua ta", explica: "mai bine decât ceilalți boți ai tăi din aceeași zi" }, sub: { nume: "Sub ziua ta", explica: "mai prost decât ceilalți boți ai tăi din aceeași zi" }, singur: { nume: "Singur în zi", explica: "singurul bot al zilei: fără comparație" } };
function coAxa(e) { return e.fataDeZi == null ? "singur" : e.fataDeZi >= 0 ? "peste" : "sub"; }
function coHtml(r, ui) {
  ui = ui || {};
  var acum = ui.acum || Date.now(), btn = '<button type="button" class="coBtn actionGhost" data-action-click="coPorneste(true)">Reîmprospătează</button><button class="acBtn sugTemaBtn" type="button" id="coTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă închisă</button>';
  var cap = function (sub) { return '<header class="coCapPag sectionHead"><div><h2 class="coH1">🧠 Comportament</h2><p class="coMut coMic">' + sub + '</p></div><div class="coCapBtn">' + btn + "</div></header>"; };   /* v100.360: butonul temei, ca la paginile refăcute */
  if (!r || typeof r !== "object" || r.forma !== 1) {
    return cap("Ce ai făcut cu boții tăi și cât te-a costat.") + '<p class="coMut">' + (ui.eroare ? "N-am putut aduce raportul: " + coEsc(ui.eroare) + ". Reîncearcă." : ui.inLucru ? "Aduc raportul colectorului…" : "Colectorul de pe VPS n-a trimis încă raportul paginii. Vine în câteva minute după ce pornește colectorul v101.158; apasă Reîmprospătează.") + "</p>";
  }
  // v100.306 (auditul final 05.11): fără niciun bot pornit raportul rămânea vechi și pagina zicea „colectorul pare oprit” (fals: colectorul
  // mergea, n-avea ce număra) ⇒ spune ce e: niciun bot pornit, și ultimul închis. ui.botiActivi: numărul citit, null = necitit.
  // v100.360 (auditul Comportament, 🟡): de la v101.166 colectorul reface raportul și fără boți ⇒ un raport vechi de peste 30 de minute = colectorul n-a mai scris
  // (oprit, arhiva sau configurarea n-au venit); „niciun bot pornit” se spune DOAR din raport (r.botiActivi, scris de colector la tură), nu din Pionex cerut de pagină
  var vechi = acum - Number(r.la) > 30 * 60000, botiR = r.botiActivi != null ? Number(r.botiActivi) : ui.botiActivi, faraBoti = botiR === 0 && !vechi, ultimR = r.ultimInchis ? coOra(r.ultimInchis, acum) : ui.ultimInchis;
  var h = cap("Ce ai făcut cu boții tăi și cât te-a costat. Pregătit de colectorul de pe VPS la " + coEsc(coOra(r.la, acum)) + "."
    + (faraBoti ? ' <span class="coMut">Niciun bot pornit acum' + (ultimR ? "; ultimul închis: " + coEsc(ultimR) : "") + ".</span>" : "") + (vechi ? ' <span class="coAtentie">Raportul are peste 30 de minute: colectorul n-a mai scris (oprit, sau arhiva / configurarea n-au venit)' + (r.motivTura ? ": " + coEsc(r.motivTura) : "") + ".</span>" : "") + (ui.eroare ? ' <span class="coAtentie">Reîmprospătarea n-a mers: ' + coEsc(ui.eroare) + ".</span>" : ""));
  if (r.evaluariLegat === false) h += '<p class="coAtentie">Canalul evaluărilor nu e legat la colector (DISCORD_WEBHOOK_EVALUARI): evaluările, seara și regulile pe date noi nu se mai actualizează.</p>';
  h += coFrazaHtml(r, ui.surseDeschise);
  h += coEvalHtml(r);
  h += coDovHtml(r) + coGraficeHtml(r);
  h += '<div class="coRand3">' + coAziHtml(r.azi) + coSearaHtml(r.seara) + coPorniriHtml(r.porniri, r.porniriN) + "</div>";
  h += coEvaluariHtml(r, ui);
  h += '<div class="coRand2">' + coReguliHtml(r.reguli) + coFranaSaptHtml(r.franaSapt) + "</div>";
  h += coOglindaHtml(r.oglinda, r.oglindaNota);
  h += coProfitHtml(r.profit);
  return h + '<p class="coMut coMic">Ce s-a întâmplat, nu ce urmează. Pragurile sunt ale tale, din Grid → Poarta; pagina doar le ține socoteala.</p>';
}
// v100.360: rândurile pliate - aceeași formă ca Tabloul / Jurnalul (data-rand + data-titlu + data-rezumat), starea ținută în „coRanduri”
var CO_RAND_KEY = "coRanduri", CO_RANDURI = { coSDovezi: "Regulile tale, judecate pe datele tale", coSGrafice: "Banii tăi pe obiceiuri", coSEv: "Evaluările boților închiși", coSReg: "Regulile tale, luna asta", coSSapt: "Frâna în ultimele 7 zile", coSOg: "Oglinda lunii", coSProfit: "Profitul real" }, CO_RAND_DESCHIS = { coSDovezi: 1, coSGrafice: 1 };
function coRandStare() { try { var o = JSON.parse(localStorage.getItem(CO_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function coRandAplica() {
  var st = coRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
  Object.keys(CO_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && !!CO_RAND_DESCHIS[id]);
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", CO_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, CO_RANDURI[id]) : "");
  });
}
function coRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(CO_RANDURI, id)) return; var st = coRandStare(), acum = st[id] === true || (st[id] !== false && !!CO_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(CO_RAND_KEY, JSON.stringify(st)); } catch (e) {} coRandAplica();
}
function coDeseneaza() {
  var box = document.getElementById("coPagina"); if (!box) return;
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : typeof contTot !== "undefined" ? contTot.boti : null;   /* v100.306: câți boți rulează (null = necitit) */
  var sd = box.querySelector && box.querySelector(".coFrazaBox details.grSurse"); if (sd) coStare.surse = !!sd.open;
  box.innerHTML = coHtml(coStare.raport, { surseDeschise: coStare.surse, filtru: coStare.filtru, deschis: coStare.deschis, acum: Date.now(), eroare: coStare.eroare, inLucru: coStare.inLucru,
    botiActivi: Array.isArray(boti) ? boti.filter(function (b) { return b && b.activ; }).length : null, ultimInchis: typeof acUltimInchisText === "function" ? acUltimInchisText() : "" });
  coRandAplica(); if (typeof tbTemaAplica === "function") tbTemaAplica();   // v100.360: rândurile pliate + eticheta butonului temei (capul se rescrie)
}
async function coPorneste(forta) {
  if (!document.getElementById("coPagina") || coStare.inLucru) return;
  if (!forta && coStare.raport && Date.now() - coStare.la < 60000) { coDeseneaza(); return; }
  coStare.inLucru = true; if (!coStare.raport) coDeseneaza();
  /* v100.360: fără contTotAsigura (Pionex + T212 + arhiva doar pentru o frază) - colectorul scrie botiActivi / ultimInchis în raport */
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
