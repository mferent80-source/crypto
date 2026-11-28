// Pagina Alerts (v97.4, 27.09: "leagă pagina Alerts cu boții și stocks, să apară și acolo automat").
// Alertele colectorului de acasa (bot: grila, planul tau, opritorul, podeaua, semaforul; actiuni T212; piata: vremea,
// rapoartele; Scan: urmaritele) stau pe server (istoric-bot?action=alerte, 7 zile, ultimele 100) - pana acum mergeau doar
// pe Discord. Aici se arata automat, pe categorii, cu drumul spre pagina lor; insigna "necitite" le numara si pe ele.
var AlCentru = (function () {
  "use strict";
  // categoria dupa cheia alertei (colectorul) si dupa bot
  function categorie(x) {
    var k = String(x && x.cheie || "");
    // v100.367 (auditul 19.11, 🔴1): cheile apărute după v97.4 (Consilierul, intrarea sugerată, gărzile, becul 1z, „aștept”, simbolurile urmărite) stăteau la „Piață”
    if (/^(t212|act-|reteta-a|consilier-|sltp-|garda-|bec1z-|astept-|sim-|raport-actiuni)/.test(k)) return "actiuni";
    if ((x && x.bot) || /^(grila|plan|opritor|s-|p-|lich|status|grid|miscare|trend|btc|zero|podea|colector|reteta-c|mediu|bot|raport-3h|frana|tradezilei)/.test(k)) return "boti";
    return "piata";
  }
  var CAT = { boti: "Boți și crypto", actiuni: "Acțiuni", piata: "Piață" };
  // unde duce alerta
  function drum(x) {
    var k = String(x && x.cheie || ""), c = categorie(x);
    if (/^reteta-/.test(k)) return { pag: "scan", et: "Deschide Scan" };
    if (/^sim-/.test(k)) return { pag: "alertsExt", et: "Deschide Ce dețin / urmăresc ↗" };   /* v100.367: simbolurile urmărite stau pe pagina alerts din suită */
    if (/^tradezilei/.test(k)) return { pag: "tradezilei", et: "Deschide Trade-ul zilei" };
    if (/^agitate/.test(k)) return { pag: "agitate", et: "Deschide Agitate acum" };   /* v100.398 (I-972): „s-a aprins” / „se mișcă toată piața” duc la lista lor */
    if (/^frana/.test(k)) return { pag: "comportament", et: "Deschide Comportament" };
    if (/^(raport-actiuni|lectia|raport$)/.test(k)) return { pag: "jurnaltrade", et: "Deschide Jurnalul" };
    if (/^(busola|colector)/.test(k)) return { pag: "health", et: "Deschide Starea aplicației" };
    if (c === "actiuni") return { pag: "t212", et: "Deschide Trading 212" };
    if (c === "boti") return { pag: "tabloubot", et: "Deschide Tabloul botului" };
    return { pag: "dash", et: "Deschide Piața azi" };
  }
  function numara(l) {
    var o = { toate: 0, boti: 0, actiuni: 0, piata: 0, importante: 0 };
    (Array.isArray(l) ? l : []).forEach(function (x) { o.toate++; o[categorie(x)]++; if (x.nivel === "critic" || x.nivel === "atentie") o.importante++; });
    return o;
  }
  function filtreaza(l, f, doarImp) {
    return (Array.isArray(l) ? l : []).filter(function (x) { return (f === "toate" || categorie(x) === f) && (!doarImp || x.nivel === "critic" || x.nivel === "atentie"); });
  }
  // "Azi" / "Ieri" / data, pentru gruparea pe zile (Bucuresti)
  function zi(t, acum) {
    var f = function (v) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(v)); };
    var a = f(t), z = f(acum), ie = f(acum - 86400000);
    return a === z ? "Azi" : a === ie ? "Ieri" : new Date(t).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Bucharest" });
  }
  // v100.367 (🔴3): „nou” / „necitite” după SOSIREA pe server (primit), nu după ceasul alertei - cele urcate cu întârziere din coada KV rămân noi
  function sosit(x) { return x && x.primit > 0 ? x.primit : (x && x.t) || 0; }
  // v100.367 (el: zgomotul „și pe Discord”; pe pagină repetările se adună sub cazul lor): aceeași cheie + bot în 24 h de la cea mai nouă ⇒ un rând cu ×N
  function grupeaza(l) {
    var g = [], cap = {}, Z = 24 * 3600000;
    (Array.isArray(l) ? l : []).forEach(function (x) {
      var k = x && x.cheie ? x.cheie + "|" + (x.bot || "") : null, h = k ? cap[k] : null;
      if (h && h.t - x.t < Z) { h.rep.push(x); return; }
      var r = Object.assign({}, x, { rep: [] }); g.push(r); if (k) cap[k] = r;
    });
    return g;
  }
  return { categorie: categorie, CAT: CAT, drum: drum, numara: numara, filtreaza: filtreaza, zi: zi, sosit: sosit, grupeaza: grupeaza };
})();
if (typeof globalThis !== "undefined") globalThis.AlCentru = AlCentru;

// ---- ecranul ----
// v100.306 (I-836, auditul final 05.11: 1.413 rânduri, 245.000 px pe telefon): imp = null până alegi tu (pe telefon pornește „Doar importante”);
// toate = false ⇒ primele AL_PRIMELE rânduri, restul la un clic (nimic șters)
var alSt = { l: null, la: 0, err: null, inLucru: false, f: "toate", imp: null, toate: false };
var AL_PRIMELE = 50;
function alImpAcum() { return !!alSt.imp; }   /* v100.367 (🟡10): nici pe telefon nu mai ascunde implicit informările spre care trimite rezumatul de noapte */
function alMii(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
var AL_VAZUT = "alCentruVazutLa";
function alVazutLa() { try { return Number(localStorage.getItem(AL_VAZUT)) || 0; } catch (e) { return 0; } }
function alCentruNecitite() { var v = alVazutLa(); return (alSt.l || []).filter(function (x) { return AlCentru.sosit(x) > v; }).length; }
function alPe() { var el = $("alerts"); return !!(el && el.classList.contains("on")); }
async function alCentruPorneste(fortat) {
  alDeseneaza();
  if (alSt.inLucru || (!fortat && Date.now() - alSt.la < 60000)) return;
  alSt.inLucru = true;
  try { var r = await getJSON("/api/istoric-bot?action=alerte"); alSt.l = r && Array.isArray(r.alerte) ? r.alerte : []; alSt.err = null; alSt.la = alSt.okLa = Date.now(); await alRegistruAdu(); }
  catch (e) { alSt.err = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); alSt.la = Date.now(); }   /* v100.367 (🔴4): eroarea rămâne la vedere */
  finally { alSt.inLucru = false; }
  // v100.367 (🔴3): „văzut” doar după o citire reușită și după 10 s pe pagină (nu la eșec, nu cât durează citirea)
  if (!alSt.err && alPe() && !document.hidden) { clearTimeout(alSt.tv); alSt.tv = setTimeout(alMarcheazaVazut, 10000); }
  alDeseneaza();
  if (typeof updateAlertBadges === "function") updateAlertBadges();
}
function alMarcheazaVazut() {
  if (!alPe() || document.hidden || !alSt.l || alSt.err) return;
  var m = alSt.l.reduce(function (a, x) { return Math.max(a, AlCentru.sosit(x)); }, alVazutLa());
  try { localStorage.setItem(AL_VAZUT, String(m)); } catch (e) {}
  alDeseneaza(); if (typeof updateAlertBadges === "function") updateAlertBadges();
}
// pe pagina: la minut; in rest: la 5 minute (doar pentru insigna din meniu)
setInterval(function () { if (document.hidden) return; if (alPe()) alCentruPorneste(false); else if (Date.now() - alSt.la > 5 * 60000) alCentruPorneste(true); }, 60000);
setTimeout(function () { alCentruPorneste(false); }, 8000);

function alDeseneaza() {
  var box = $("alCentru"); if (!box) return;
  var l = alSt.l;
  var cap = '<div class="alCap"><div><h4>Alertele colectorului</h4><span class="alSub">boți, acțiuni și piață · de la colector · pe Discord pleacă doar cazurile noi și cele care cer o decizie, aici sunt toate · pe 7 zile; grilele: ultimele 100'
    + (alSt.okLa && l ? ' · actualizat ' + new Date(alSt.okLa).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }) : '') + '</span></div><button class="alBtn" type="button" data-alrefa="1">↻ Reîmprospătează</button></div>'
    + (alSt.err ? '<p class="tbWarn alEroare">Nu pot citi alertele acum (' + escapeHtml(alSt.err) + ')' + (l && alSt.okLa ? ': ce vezi e lista de la ' + new Date(alSt.okLa).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }) + '.' : '.') + '</p>' : '');
  if (!l) { box.innerHTML = cap + (alSt.err ? '' : '<p class="alGol">Aduc alertele…</p>'); alSusDeseneaza(); return; }
  var c = AlCentru.numara(l);
  var file = [["toate", "Toate"], ["boti", AlCentru.CAT.boti], ["actiuni", AlCentru.CAT.actiuni], ["piata", AlCentru.CAT.piata]].map(function (x) {
    return '<button class="alFila" type="button" data-alf="' + x[0] + '" aria-pressed="' + (alSt.f === x[0]) + '">' + x[1] + ' <span class="alMut">' + c[x[0]] + '</span></button>';
  }).join("");
  // v100.367: repetările aceleiași chei sub 24 h stau sub cazul lor (×N, la un clic) - nimic șters
  var imp = alImpAcum(), vazut = alVazutLa(), acum = Date.now(), fl = AlCentru.grupeaza(AlCentru.filtreaza(l, alSt.f, imp)), ziAnt = "";
  // v100.367: tăietura după TIMP - fereastra cea mai lungă dintre cele două vechi (cele mai noi AL_PRIMELE alerte; cele mai noi AL_PRIMELE importante, cum vedea
  // telefonul cu „Doar importante”), pe lista negrupată ⇒ la vedere tot ce se vedea înainte, fără să curgă la nesfârșit
  var plat = AlCentru.filtreaza(l, alSt.f, imp), tTot = plat.length >= AL_PRIMELE ? plat[AL_PRIMELE - 1].t : -Infinity, kImp = 0, tImp = -Infinity;
  for (var q = 0; q < plat.length; q++) if ((plat[q].nivel === "critic" || plat[q].nivel === "atentie") && ++kImp === AL_PRIMELE) { tImp = plat[q].t; break; }
  var tCut = Math.min(tTot, tImp), taie = fl.filter(function (x) { return x.t >= tCut; }).length, rest = alSt.toate ? 0 : Math.max(0, fl.length - taie);
  var ora = function (t) { return new Date(t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }); };
  var rand = function (x, mic) { var nou = AlCentru.sosit(x) > vazut, d = AlCentru.drum(x);
    return '<div class="alRand ' + (x.nivel || "info") + (nou ? " nou" : "") + (mic ? " alRepRand" : "") + '"><span class="alPunct"></span><div class="alText"><b>' + escapeHtml(TextRo.cifreNoi(x.titlu)) + '</b>' + (x.mesaj ? '<p>' + escapeHtml(TextRo.cifreNoi(x.mesaj)) + '</p>' : '')
      + '<span class="alMeta">' + ora(x.t) + ' · ' + AlCentru.CAT[AlCentru.categorie(x)] + (x.doarRadar ? ' · doar în Radar' : '') + (nou ? ' · <b class="alNou">nou</b>' : '') + '</span></div>'
      + (mic ? '' : '<button class="alBtn" type="button" data-alpag="' + d.pag + '">' + d.et + '</button>') + '</div>'; };
  var bloc = function (x) { return rand(x, false) + (x.rep.length ? '<details class="alRep"><summary>încă ' + x.rep.length + ' la fel în 24 h (×' + (x.rep.length + 1) + ')</summary>' + x.rep.map(function (y) { return rand(y, true); }).join("") + '</details>' : ''); };
  // v100.367: informările consecutive din aceeași zi ⇒ un rând pliat „N informări” (zidul de text se pliază; ce e important rămâne la vedere)
  var rows = "", info = [], gol = function () { if (!info.length) return; rows += info.length === 1 ? bloc(info[0]) : '<details class="alInfo"><summary>' + info.length + ' informări (' + escapeHtml(info.slice(0, 3).map(function (y) { return String(y.titlu || "").split(":")[0]; }).join(", ")) + (info.length > 3 ? ", …" : "") + ')</summary>' + info.map(bloc).join("") + '</details>'; info = []; };
  (rest ? fl.slice(0, taie) : fl).forEach(function (x) {
    var z = AlCentru.zi(x.t, acum);
    if (z !== ziAnt) { gol(); rows += '<div class="alZi">' + escapeHtml(z) + '</div>'; ziAnt = z; }
    if ((x.nivel || "info") === "info") info.push(x); else { gol(); rows += bloc(x); }
  });
  gol();
  box.innerHTML = cap + '<div class="alFiltre"><div class="alFile" role="group" aria-label="Categoria">' + file + '</div><label class="alComut"><input type="checkbox" id="alImp"' + (imp ? " checked" : "") + '> Doar importante <span class="alMut">' + c.importante + '</span></label></div>'
    + '<div class="alLista">' + (rows || '<p class="alGol">' + (imp && c.toate ? "Nicio alertă importantă aici în ultimele 7 zile; debifează „Doar importante” pentru toate." : "Nicio alertă aici în ultimele 7 zile.") + '</p>') + '</div>'
    + (rest ? '<p class="alMai"><button class="alBtn" type="button" data-altot="1">Arată toate (' + alMii(fl.length) + ')</button> <span class="alMut">acum vezi cele mai noi ' + taie + '</span></p>' : '');
  alSusDeseneaza();   /* v100.367: fraza, cifrele, dovada, rândurile */
}
document.addEventListener("click", function (e) {
  var t = e.target.closest && e.target.closest("#alCentru [data-alf],#alCentru [data-alpag],#alCentru [data-alrefa],#alCentru [data-altot]"); if (!t) return;
  if (t.dataset.altot) { alSt.toate = true; alDeseneaza(); }
  else if (t.dataset.alf) { alSt.f = t.dataset.alf; alDeseneaza(); }
  else if (t.dataset.alpag) { if (t.dataset.alpag === "alertsExt" && typeof deschideAlertsPagina === "function") deschideAlertsPagina(); else navTo(t.dataset.alpag, true); }
  else alCentruPorneste(true);
});
document.addEventListener("change", function (e) { if (e.target && e.target.id === "alImp") { alSt.imp = e.target.checked; alDeseneaza(); } });

// ---- v100.367 (el 19.11: Alerte „ca Jurnalul”): fraza cinstită + „De unde știu”, 3 cifre, dovada (4 grafice + registrul), rândurile pliate ----
/* v100.396 (I-961): puterea dinainte lângă „N din 26” - ce efect poate vedea proba la 26 de ferestre, cu abaterea de acum, față de efectul care ar conta pe bani */
function alPutere(f) {
  var p = f && f.putere; if (!p || !(p.mde > 0)) return "";
  var a = function (v) { var x = Math.abs(v * 100); return x.toFixed(x < 0.095 ? 2 : 1).replace(".", ",") + " %"; };
  var t = " · la " + (p.nT || 26) + " vede de la ~" + a(p.mde) + " (" + a(p.lo) + " … " + a(p.hi) + ")";
  return t + (f.poate === "nu" ? "; efectul care ar conta (" + a(f.bani) + ") e sub el ⇒ așa nu poate răspunde: trebuie alt orizont sau mai multe ferestre" : f.poate === "da" ? "; prinde un efect de " + a(f.bani) : f.poate === "la-limita" ? "; la limită pentru un efect de " + a(f.bani) : "");
}
function alPct(v, z) { return v == null || !isFinite(v) ? "—" : (v > 0.0004 ? "+" : v < -0.0004 ? "−" : "") + Math.abs(v * 100).toFixed(z == null ? 1 : z).replace(".", ",") + " %"; }
function alData(t) { var d = new Date(t); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear(); }
function alCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
function alLat() { var e = typeof document !== "undefined" && document.getElementById ? document.getElementById("alerts") : null; var l = Math.max(300, Math.floor((e && e.clientWidth) || 900) - 40); return typeof window !== "undefined" && window.innerWidth >= 1024 ? Math.floor((l - 16) / 2) : l; }
var AL_FEL = { "consilier-iesi": "„Ieși” (Consilier)", "consilier-atentie": "„Atenție” (Consilier)", intrare: "Intrarea sugerată", bec1z: "Becul 1z în jos", astept: "Sub stop N ședințe" };
function alSurse() {
  var D = typeof AlDovezi !== "undefined" ? AlDovezi : null;
  return ["Alertele vin de la colector (boți, acțiuni, piață) și stau pe server 7 zile; grilele, ultimele 100. Discordul primește, din 19.11.2026, doar cazurile noi și cele care cer o decizie; repetările aceleiași alerte sub 24 h stau doar aici, sub cazul lor. Lichidarea, stopul atins, frâna și evenimentele mari pleacă mereu.",
    "„Au avut dreptate?” e măsurat pe " + (D ? D.zile : 26) + " de zile de jurnal (13.10–19.11, cu o gaură 19→30.10): după fiecare alertă cu o recomandare, ce a făcut prețul față de un martor din aceeași fereastră (aceeași monedă și direcție a botului în ±7 zile; aceeași acțiune în alte zile; piața: QQQ / STOXX, cipurile: SMH). Cazurile repetate se numără o dată.",
    "Testul: p-ul de permutare cu zilele grupate (cipurile cad împreună). Intervalele pe puține zile „găsesc ceva” în 15–41 % din seturile fără niciun efect, de aceea un interval care nu atinge zero NU e singur o dovadă.",
    "„Ieși” pe acțiuni: 15 cazuri în doar 6 zile, toate din aceeași cădere a cipurilor - față de sector avantajul e mic (p 8–22 %).",
    "„Intrarea sugerată” promitea în medie +" + (D ? TextRo.num(D.promis, 1) : "2,4") + " % pe trade (din istoric); pe viu au venit −2,9 % în 5 ședințe, cu 1,7 puncte sub piață (38 de cazuri, p 8,8 %). Mesajul spune de acum cifra de pe viu.",
    "„Gridul e prea larg pentru levier”: pe boții tăi, cei 16 avertizați au ieșit în medie +3,0 %, niciunul pe minus - avertismentul e spus „nedovedit”.",
    "Registrul (de acum): fiecare caz nou cu o recomandare e judecat după 1 / 5 / 10 ședințe (acțiuni, față de QQQ, în sensul alertei) sau după 1 / 24 / 72 h (boți, față de BTC, în direcția botului). Verdictul pe un fel abia la 26 de ferestre care nu se suprapun (boți: la 2 zile una de alta; acțiuni: la 7 zile), cu corecția pentru câte feluri se judecă, o singură dată, înghețat (regula scrisă înainte).",
    "Cât ar dura să se vadă ceva: intrarea 5 puncte ~1 lună; BTC în mișcare 3 puncte ~2 luni; „Ieși” 5 puncte 3–5 luni; o alertă de boți de 1 punct - ani."];
}
function alSusHtml() {
  var D = typeof AlDovezi !== "undefined" ? AlDovezi : null, l = alSt.l || [], acum = Date.now(), z = l.filter(function (x) { return acum - x.t < 86400000; }), rg = alSt.reg;
  var disc = z.filter(function (x) { return !x.doarRadar; }).length, crit = z.filter(function (x) { return x.nivel === "critic"; }).length, sd = alSt.surse ? " open" : "";
  var fr = "Alertele te țin la curent, dar pe " + (D ? D.zile : 26) + " de zile niciuna nu s-a dovedit că știe încotro merge prețul; „Ieși” a avut dreptate cât a căzut tot sectorul cipurilor, nu mai mult.";
  var sub = (D ? "Măsurat pe " + D.la + ": ~" + D.peZi + " de alerte pe zi (~" + D.peDiscord + " pe Discord), " + Math.round(D.repetari * 100) + " % repetau ceva din ultimele 24 h. " : "")
    + "De acum pe Discord pleacă doar cazurile noi și cele care cer o decizie. "
    + (rg && rg.deLa ? "Registrul notează fiecare caz nou din " + alData(rg.deLa) + ": " + alCate(rg.total || 0, "caz", "cazuri") + "; verdictul pe un fel abia la 26 de ferestre care nu se suprapun, cu corecția pentru câte feluri, înghețat." : "Registrul cazurilor noi pornește cu prima tură a colectorului; verdictul pe un fel abia la 26 de ferestre care nu se suprapun, cu corecția pentru câte feluri, înghețat.");
  var cel = function (et, cifra, s, ton) { return '<div class="cnCifra"><span class="cnEt">' + escapeHtml(et) + '</span><b class="cnMare' + (ton || "") + '">' + escapeHtml(cifra) + '</b><span class="cnMut cnMic">' + escapeHtml(s) + "</span></div>"; };
  var jud = rg && rg.feluri ? rg.feluri.reduce(function (a, f) { return a + (f.judecate || 0); }, 0) : 0;
  return '<div class="cnFrazaBox grFrazaBox" id="alFraza"><p class="grFraza">' + escapeHtml(fr) + '</p><p class="grFrazaSub">' + escapeHtml(sub) + '</p><details class="grSurse"' + sd + "><summary>De unde știu</summary><ul>"
    + alSurse().map(function (t) { return "<li>" + escapeHtml(t) + "</li>"; }).join("") + "</ul></details></div>"
    + '<div class="cnCifre" id="alCifre">' + cel("În ultimele 24 h", alSt.l ? String(z.length) : "—", alSt.l ? (z.some(function (x) { return "doarRadar" in x; }) ? disc + " pe Discord · " : "pe Discord: se ține evidența de acum · ") + alCate(crit, "critică", "critice") : "aduc alertele…", crit ? " cnAtent" : "")
    + cel("Au avut dreptate?", "nedovedit", "pe " + (D ? D.zile : 26) + " de zile, niciun fel de alertă cu recomandare", "")
    + cel("Registrul", rg ? alCate(rg.total || 0, "caz", "cazuri") : "pornește", rg ? alCate(jud, "judecat", "judecate") + " · " + alCate((rg.feluri || []).length, "fel", "feluri") : "la prima tură a colectorului", "") + "</div>";
}
function alDovadaHtml() {
  var D = typeof AlDovezi !== "undefined" ? AlDovezi : null, G = typeof CnGrafice !== "undefined" ? CnGrafice : null, A = typeof AlGrafice !== "undefined" ? AlGrafice : null, lat = alLat(), rg = alSt.reg, h = "";
  if (!D || !G || !A) return '<p class="tbSub">Graficele nu s-au încărcat.</p>';
  h += '<div class="cnGrGrila"><div class="cnGr"><h5>Alertele pe zi</h5><p class="cnMut cnMic">cazuri noi cu decizie (galben), repetări sub 24 h (gri), informări · măsurat pe ' + escapeHtml(D.la) + "</p>" + A.coloane(D.pePeZi, { lat: lat }) + "</div>";
  var rows = D.feluri.map(function (x) { return { et: x[0], medie: x[3] / 100, lo: x[4] / 100, hi: x[5] / 100, n: x[1] }; });
  h += '<div class="cnGr"><h5>Dreptatea pe fel</h5><p class="cnMut cnMic">ce a urmat în sensul alertei, față de martor, în puncte, cu intervalul de 90 % · peste zero = alerta a avut dreptate · niciunul dovedit (p de permutare)</p>' + G.bare(rows, { lat: lat, eticheta: "Dreptatea alertelor, pe fel" }) + "</div></div>";
  var ser = function (d, k) { return d.map(function (x) { return x[k]; }); };
  h += '<div class="cnGrGrila"><div class="cnGr"><h5>Drumul după „Ieși” (acțiuni)</h5><p class="cnMut cnMic">' + escapeHtml(D.iesi[0] ? "15 cazuri în 6 zile, aceeași cădere a cipurilor · pe ședințe după alertă" : "") + "</p>"
    + A.linii([{ et: "acțiunea", cls: "jgLinie", v: ser(D.iesi, 1) }, { et: "QQQ / STOXX", cls: "jgLinie2", v: ser(D.iesi, 2) }, { et: "cipurile (SMH)", cls: "jgIc", v: ser(D.iesi, 3) }], { lat: lat, eticheta: "Drumul prețului după Ieși" }) + "</div>";
  h += '<div class="cnGr"><h5>Drumul după intrarea sugerată</h5><p class="cnMut cnMic">' + escapeHtml("38 de cazuri · linia punctată = ce promitea în medie mesajul (+" + TextRo.num(D.promis, 1) + " % pe trade)") + "</p>"
    + A.linii([{ et: "acțiunea", cls: "jgLinie", v: ser(D.intrare, 1) }, { et: "QQQ / STOXX", cls: "jgLinie2", v: ser(D.intrare, 2) }], { lat: lat, promis: D.promis, eticheta: "Drumul prețului după intrarea sugerată" }) + "</div></div>";
  // registrul pe viu
  if (rg && rg.feluri && rg.feluri.length) {
    h += '<div class="cnGr"><h5>Registrul, pe viu</h5><p class="cnMut cnMic">din ' + escapeHtml(alData(rg.deLa)) + ' · acțiunile după 5 ședințe față de QQQ, boții după 24 h față de BTC · „se adună” până la 26 de ferestre care nu se suprapun (boți: la 2 zile una de alta, ca 24 h să nu se suprapună; acțiuni: la 7 zile), apoi verdictul o singură dată, cu corecția pentru câte feluri se judecă, și înghețat</p><div class="rlTab"><table class="cnTab"><thead><tr><th>Felul</th><th>Cazuri</th><th>Judecate</th><th>În sensul alertei</th><th>Verdict</th></tr></thead><tbody>'
      + rg.feluri.map(function (f) { var V = { "se-aduna": "se adună", peste: "a avut dreptate", sub: "a greșit", "n-am-aflat": "n-am aflat" };
        return "<tr><td>" + escapeHtml(AL_FEL[f.fel] || f.fel + (f.piata === "crypto" ? " (boți)" : "")) + "</td><td>" + (f.n || 0) + "</td><td>" + (f.judecate || 0) + "</td><td>" + escapeHtml(f.medie == null ? "—" : alPct(f.medie) + (f.lo != null ? " (" + alPct(f.lo) + " … " + alPct(f.hi) + ")" : "") + (f.inghetat && f.medieAcum != null ? " · acum " + alPct(f.medieAcum) : "")) + "</td><td>" + escapeHtml((V[f.verdict] || "se adună") + (f.verdict === "se-aduna" || !f.verdict ? (f.ferestre != null ? " · " + f.ferestre + " din " + TextRo.cate(f.nVerdict || 26, "fereastră", "ferestre") + alPutere(f) : "") : f.inghetat ? " · înghețat" : "")) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
  } else h += '<p class="cnRasp">Registrul pe viu se umple de la prima tură a colectorului (o dată pe oră): fiecare caz nou cu o recomandare, judecat după orizont.</p>';
  return h;
}
var AL_RAND_KEY = "alRanduri", AL_RANDURI = { alSCentru: "Alertele colectorului", alSDovada: "Au avut dreptate? (dovada)", alSVechi: "Regulile alertelor din analiza veche" }, AL_RAND_DESCHIS = { alSCentru: 1, alSDovada: 1 };
function alRandStare() { try { var o = JSON.parse(localStorage.getItem(AL_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function alRandAplica() {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return; var st = alRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
  Object.keys(AL_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && !!AL_RAND_DESCHIS[id]);
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", AL_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, AL_RANDURI[id]) : "");
  });
}
function alRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(AL_RANDURI, id)) return; var st = alRandStare(), acum = st[id] === true || (st[id] !== false && !!AL_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(AL_RAND_KEY, JSON.stringify(st)); } catch (e) {} alRandAplica();
}
function alSusDeseneaza() {
  var s = $("alSus"); if (s) { var sd = s.querySelector && s.querySelector("details.grSurse"); if (sd) alSt.surse = !!sd.open; s.innerHTML = alSusHtml(); }
  var d = $("alDovada"), vrea = alSt.reg ? "2" : "1";   /* graficele se desenează o dată (și încă o dată când vine registrul) */
  if (d && (!d.dataset || d.dataset.desenat !== vrea)) { d.innerHTML = alDovadaHtml(); if (d.dataset) d.dataset.desenat = vrea; }
  alRandAplica(); if (typeof tbTemaAplica === "function") tbTemaAplica();
}
async function alRegistruAdu() { try { var r = await getJSON("/api/istoric-bot?action=alerteRegistru"); alSt.reg = r && r.registru || null; } catch (e) { /* registrul e un adaos: fără el, pagina merge */ } }
