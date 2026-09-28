// Pagina Alerts (v97.4, 27.09: "leagă pagina Alerts cu boții și stocks, să apară și acolo automat").
// Alertele colectorului de acasa (bot: grila, planul tau, opritorul, podeaua, semaforul; actiuni T212; piata: vremea,
// rapoartele; Scan: urmaritele) stau pe server (istoric-bot?action=alerte, 7 zile, ultimele 100) - pana acum mergeau doar
// pe Discord. Aici se arata automat, pe categorii, cu drumul spre pagina lor; insigna "necitite" le numara si pe ele.
var AlCentru = (function () {
  "use strict";
  // categoria dupa cheia alertei (colectorul) si dupa bot
  function categorie(x) {
    var k = String(x && x.cheie || "");
    if (/^(t212|act-|reteta-a)/.test(k)) return "actiuni";
    if ((x && x.bot) || /^(grila|plan|opritor|s-|p-|lich|status|grid|miscare|trend|btc|zero|podea|colector|reteta-c|mediu|bot|raport-3h)/.test(k)) return "boti";
    return "piata";
  }
  var CAT = { boti: "Boți și crypto", actiuni: "Acțiuni", piata: "Piață" };
  // unde duce alerta
  function drum(x) {
    var k = String(x && x.cheie || ""), c = categorie(x);
    if (/^reteta-/.test(k)) return { pag: "scan", et: "Deschide Scan" };
    if (c === "actiuni") return { pag: "t212", et: "Deschide Trading 212" };
    if (c === "boti") return { pag: "tabloubot", et: "Deschide Tabloul botului" };
    return { pag: "dash", et: "Deschide Home" };
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
  return { categorie: categorie, CAT: CAT, drum: drum, numara: numara, filtreaza: filtreaza, zi: zi };
})();
if (typeof globalThis !== "undefined") globalThis.AlCentru = AlCentru;

// ---- ecranul ----
var alSt = { l: null, la: 0, err: null, inLucru: false, f: "toate", imp: false };
var AL_VAZUT = "alCentruVazutLa";
function alVazutLa() { try { return Number(localStorage.getItem(AL_VAZUT)) || 0; } catch (e) { return 0; } }
function alCentruNecitite() { var v = alVazutLa(); return (alSt.l || []).filter(function (x) { return x.t > v; }).length; }
function alPe() { var el = $("alerts"); return !!(el && el.classList.contains("on")); }
async function alCentruPorneste(fortat) {
  alDeseneaza();
  if (alSt.inLucru || (!fortat && Date.now() - alSt.la < 60000)) return;
  alSt.inLucru = true;
  try { var r = await getJSON("/api/istoric-bot?action=alerte"); alSt.l = r && Array.isArray(r.alerte) ? r.alerte : []; alSt.err = null; alSt.la = Date.now(); }
  catch (e) { alSt.err = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); alSt.la = Date.now() - 30000; }
  finally { alSt.inLucru = false; }
  // cat esti pe pagina, ce vezi e citit
  if (alPe() && !document.hidden) { try { localStorage.setItem(AL_VAZUT, String(Date.now())); } catch (e) {} }
  alDeseneaza();
  if (typeof updateAlertBadges === "function") updateAlertBadges();
}
// pe pagina: la minut; in rest: la 5 minute (doar pentru insigna din meniu)
setInterval(function () { if (document.hidden) return; if (alPe()) alCentruPorneste(false); else if (Date.now() - alSt.la > 5 * 60000) alCentruPorneste(true); }, 60000);
setTimeout(function () { alCentruPorneste(false); }, 8000);

function alDeseneaza() {
  var box = $("alCentru"); if (!box) return;
  var l = alSt.l;
  var cap = '<div class="alCap"><div><h4>Alertele de acasă</h4><span class="alSub">boți, acțiuni și piață · de la colector (aceleași ca pe Discord) · ultimele 100, cel mult 7 zile'
    + (alSt.la && l ? ' · actualizat ' + new Date(alSt.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : '') + '</span></div><button class="alBtn" type="button" data-alrefa="1">↻ Reîmprospătează</button></div>';
  if (!l) { box.innerHTML = cap + '<p class="alGol">' + (alSt.err ? 'Nu pot citi alertele: ' + escapeHtml(alSt.err) : 'Aduc alertele…') + '</p>'; return; }
  var c = AlCentru.numara(l);
  var file = [["toate", "Toate"], ["boti", AlCentru.CAT.boti], ["actiuni", AlCentru.CAT.actiuni], ["piata", AlCentru.CAT.piata]].map(function (x) {
    return '<button class="alFila" type="button" data-alf="' + x[0] + '" aria-pressed="' + (alSt.f === x[0]) + '">' + x[1] + ' <span class="alMut">' + c[x[0]] + '</span></button>';
  }).join("");
  var vazut = alVazutLa(), acum = Date.now(), fl = AlCentru.filtreaza(l, alSt.f, alSt.imp), ziAnt = "";
  var rows = fl.map(function (x) {
    var z = AlCentru.zi(x.t, acum), d = AlCentru.drum(x), h = "";
    if (z !== ziAnt) { h += '<div class="alZi">' + escapeHtml(z) + '</div>'; ziAnt = z; }
    return h + '<div class="alRand ' + (x.nivel || "info") + (x.t > vazut ? " nou" : "") + '"><span class="alPunct"></span><div class="alText"><b>' + escapeHtml(x.titlu) + '</b>' + (x.mesaj ? '<p>' + escapeHtml(x.mesaj) + '</p>' : '')
      + '<span class="alMeta">' + new Date(x.t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }) + ' · ' + AlCentru.CAT[AlCentru.categorie(x)] + (x.t > vazut ? ' · <b class="alNou">nou</b>' : '') + '</span></div>'
      + '<button class="alBtn" type="button" data-alpag="' + d.pag + '">' + d.et + '</button></div>';
  }).join("");
  box.innerHTML = cap + '<div class="alFiltre"><div class="alFile" role="group" aria-label="Categoria">' + file + '</div><label class="alComut"><input type="checkbox" id="alImp"' + (alSt.imp ? " checked" : "") + '> Doar importante <span class="alMut">' + c.importante + '</span></label></div>'
    + '<div class="alLista">' + (rows || '<p class="alGol">Nicio alertă aici în ultimele 7 zile.</p>') + '</div>';
}
document.addEventListener("click", function (e) {
  var t = e.target.closest && e.target.closest("#alCentru [data-alf],#alCentru [data-alpag],#alCentru [data-alrefa]"); if (!t) return;
  if (t.dataset.alf) { alSt.f = t.dataset.alf; alDeseneaza(); }
  else if (t.dataset.alpag) navTo(t.dataset.alpag, true);
  else alCentruPorneste(true);
});
document.addEventListener("change", function (e) { if (e.target && e.target.id === "alImp") { alSt.imp = e.target.checked; alDeseneaza(); } });
