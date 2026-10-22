// v100.119 (el 06.10: „o pagină de sugestii unde pui tot: boți, EU, US, absolut toate”): pagina „Sugestii” - toate listele într-un loc,
// fiecare cu istoricul ei pe 2 ani și urmărirea înainte. Un filtru, nu o predicție: o listă cu istoric slab rămâne, cu istoricul la vedere.
// sugHtml e fără DOM (proba o rulează în vm); sugPorneste aduce datele. Nimic nu se mută: listele rămân și pe Tablou, T212 și Acasă.
var sugStare = { d: {}, la: 0, inLucru: false, panda: { desfacut: false, filtru: "toate" } };   // v100.150 (I-584): pânda - pliată, filtrul ales
function sugEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function sugP1(x) { return x == null || !isFinite(x) ? "—" : (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }
function sugPc(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + "%"; }
function sugCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
// revizia (M2): lista intraday de altă zi își spune data (în weekend, înainte de 10:20)
function sugOra(t, acum) { var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); }; if (!isFinite(d.getTime())) return "—"; var a = new Date(acum || Date.now()), alta = d.toDateString() !== a.toDateString(); return (alta ? p(d.getDate()) + "." + p(d.getMonth() + 1) + " " : "") + p(d.getHours()) + ":" + p(d.getMinutes()); }
// o cartelă = o listă: titlul, cel mult 5 rânduri (simbolul + ce s-a întâmplat), istoricul, urmărirea; gol ⇒ spune de ce
function sugCartela(titlu, sub, randuri, gol, istoric, urm) {
  var r = (randuri || []).slice(0, 5);
  return '<div class="tbBloc sugCartela"><h4>' + sugEsc(titlu) + '</h4>' + (sub ? '<p class="tbSub">' + sugEsc(sub) + '</p>' : '')
    + (r.length ? '<ul class="sugLista">' + r.map(function (x) { return '<li><b>' + sugEsc(x.s) + '</b> <span class="tbSub">' + sugEsc(x.d) + '</span>'
      + (x.b ? '<a class="sugBusola" href="' + sugEsc(x.b) + '" target="_blank" rel="noopener" aria-label="deschide ' + sugEsc(x.s) + ' în Busola" title="deschide în Busola">🧭</a>' : '') + '</li>'; }).join("")   /* v100.181: 🧭 spre Busola, doar unde rândul o are */ + '</ul>' : '<p class="sugGol">' + sugEsc(gol) + '</p>')
    + (istoric ? '<p class="tbSub sugIstoric" title="' + sugEsc(istoric) + '">' + sugEsc(istoric) + '</p>' : '') + (urm ? '<p class="tbSub sugUrm" title="' + sugEsc(urm) + '">' + sugEsc(urm) + '</p>' : '') + '</div>';
}
// revizia (M1): se judecă semnalele de cel puțin 14 zile, la prețul de ACUM (nu „atunci”)
function sugUrm(u) { return !u || !u.n ? "Urmărirea înainte începe: semnalele de cel puțin 14 zile, la prețul de acum." : "Urmărit înainte (semnalele de cel puțin 14 zile, la prețul de acum): " + u.n + " - " + sugPc(u.pePlus) + " pe plus, " + sugP1(u.medie) + " în medie, după comision."; }
// v100.150 (I-584): pânda - lățimea pieței pe 150 perp-uri (din KV, colectorul la 15 min) ca PRIMUL bloc al paginii: pliat la agregat,
// „arată cele 150” desface tabelul cu filtre. Fapte, nu semnal: permisiunea și fișa de intrare ale lui PAZNIC nu sunt aici (p = 0,23).
// boti = boții lui activi din /api/bot-orders, { s: "ADA", dir: "long" } (I-586: primii în tabel, CU / CONTRA direcției monedei)
function sugZec(x) { return x == null || !isFinite(x) ? "—" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(1).replace(".", ","); }
function sugPandaNr(x) { return x == null || !isFinite(x) ? "—" : String(Math.round(x)); }   /* nu sugPc: aceea e pentru procente (× 100) */
// prețul își păstrează cifrele semnificative (poza 11.10: „US 0,0”, „ADA 0,2” nu spuneau nimic): ≥ 100 o zecimală, ≥ 1 două, sub 1 patru cifre semnificative
function sugPandaPret(x) { if (x == null || !isFinite(x)) return "—"; var z = x >= 100 ? 1 : x >= 1 ? 2 : Math.max(4, 3 - Math.floor(Math.log10(Math.abs(x) || 1))); return x.toFixed(z).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1").replace(".", ","); }
function sugPandaHtml(l, boti, acum) {
  var t = typeof Latime !== "undefined" ? Latime.textCitire(l, null, acum) : null, a = l && l.acum;
  var min = a ? Math.max(0, Math.round((acum - a.la) / 60000)) : null;
  var cap = '<div class="tbBlocCap sugPandaCap"><h4>Lățimea pieței · 150 perp-uri Binance</h4><span class="tbSub">' + (a ? (t.vechi ? "veche, de " + sugCate(min, "minut", "minute") : "acum " + min + " min") + " · din colector, la 15 min" : "") + '</span></div>';
  if (!a || !t) return '<div class="tbBloc sugPanda">' + cap + '<p class="tbSub">' + sugEsc(t ? t.text : "aștept lățimea pieței (vine o dată la 15 minute)") + '</p></div>';
  if (a.eroare) return '<div class="tbBloc sugPanda">' + cap + '<p class="tbCitScurt">' + sugEsc(t.text) + '</p></div>';   /* revizia (2): eroarea colectorului, nu „arată cele 0” */
  var L = a.lat, nMas = a.n - (a.lipsa || 0), regim = Latime.regimText[a.regim && a.regim.cod] || "necunoscută", deCand = Latime.regimDeCand(l.istoric, acum).text, larg = a.regim && (a.regim.cod === "LARG-SUS" || a.regim.cod === "LARG-JOS");
  var h = '<div class="tbBloc sugPanda">' + cap
    + '<p class="tbCitScurt">Piața e <b>' + sugEsc(regim) + '</b>' + (deCand ? " " + sugEsc(deCand) : "") + ': ' + sugCate(L.sus, "monedă", "monede") + ' sus, ' + L.jos + ' jos. Conturile mari sunt long pe ' + L.mariLong + ' din ' + nMas + '.' + (larg ? ' Riscul e corelat, nu diversificat.' : '') + (a.incomplet ? ' Măsurat pe ' + nMas + ' din ' + a.n + '.' : '') + '</p>'
    + '<p class="tbSub">' + L.fundExtrem + ' în funding extrem · ' + L.oiExtrem + ' în OI extrem · ' + L.volExtrem + ' cu volatilitate extremă · ' + L.bugetEpuizat + ' cu bugetul zilei epuizat</p>'
    + '<p class="tbSub sugPandaCinste">Fapte, nu semnal: filtrul de permisiune și fișa de intrare ale lui PAZNIC n-au selectat nimic (p = 0,23; 78 trade-uri pe hârtie) și nu sunt aici.</p>';
  var lb = Array.isArray(boti) ? boti : [], simb = lb.map(function (b) { return b.s; }), m = a.monede || [], f = sugStare.panda.filtru, cate = function (k) { return Latime.filtreaza(m, k, simb).length; };
  var bc = Latime.botiContra ? Latime.botiContra(l, lb) : [];   /* v100.185 (el: „ok fă idei”): boții contra direcției monedei, la vedere și cu pânda pliată */
  if (bc.length) h += '<p class="tbCitScurt sugPandaContra">⚠ Contra direcției monedei: ' + bc.map(function (x) { return '<b>' + sugEsc(x.s) + '</b> (botul ' + sugEsc(x.dirBot) + ', ' + sugEsc(x.text) + ')'; }).join("; ") + '.</p>';
  if (!sugStare.panda.desfacut) { var nb = cate("boti");   /* v100.184 (el: „fă idei”): boții tăi la un clic, fără să cauți filtrul în tabelul desfăcut */
    return h + '<div class="sugPandaFiltre"><button type="button" class="t212BtnLinie" data-action-click="sugPandaDesfa()">arată cele ' + a.n + ' ›</button>' + (nb ? '<button type="button" class="t212BtnLinie" data-action-click="sugPanda(\'boti\')">monedele boților mei (' + nb + ') ›</button>' : '') + '</div></div>'; }
  var dirBot = function (s) { var b = lb.filter(function (x) { return x.s === s; })[0]; return b ? b.dir : null; };
  var filtre = [["toate", "toate"], ["boti", "monedele boților mei"], ["contra", "contra mulțimii"], ["extreme", "extreme"], ["sus", "SUS"], ["jos", "JOS"]];
  h += '<div class="sugPandaFiltre">' + filtre.map(function (x) { return '<button type="button" class="t212BtnLinie' + (f === x[0] ? ' ales' : '') + '" data-action-click="sugPanda(\'' + x[0] + '\')">' + sugEsc(x[1]) + ' (' + cate(x[0]) + ')</button>'; }).join("") + '</div>';
  var P = Latime.PRAGURI, prag = function (v, p, jos) { return v != null && (jos ? v <= p : v >= p) ? ' prag' : ''; };
  h += '<div class="rlTab"><table class="t212Tab sugPandaTab"><thead><tr><th>Monedă</th><th>Direcția 4h</th><th>Vol pctl</th><th>Ext pctl</th><th>Buget zi</th><th>Funding</th><th>OI</th><th>Mari % long</th><th>Mici % long</th><th>Agresiune</th><th>Botul meu</th></tr></thead><tbody>'
    + Latime.filtreaza(m, f, simb).map(function (x) {
      var s = String(x.sym).replace(/USDT$/, ""), db = dirBot(s);
      var cu = !db ? null : db === "neutru" ? "neutru" : x.dir === "neclara" ? "—" : Latime.esteBotContra(db, x.dir === "SUS" ? "LARG-SUS" : "LARG-JOS") ? "CONTRA" : "CU";   /* moneda SUS + bot short = CONTRA; moneda JOS + bot long = CONTRA */
      var bz = typeof Busola !== "undefined" && Busola.adresaBusola ? Busola.adresaBusola({ simbol: s, tf: "4h" }) : null;   /* v100.183 (el: „poți face ideile”): 🧭 pe fiecare monedă, Busola pe 4h ca direcția din tabel */
      return '<tr class="sugPandaRand' + (db ? ' bot' : '') + '"><td><b>' + sugEsc(s) + '</b> <span class="tbSub">' + sugEsc(sugPandaPret(x.pret)) + '</span>' + (bz ? '<a class="sugBusola" href="' + sugEsc(bz) + '" target="_blank" rel="noopener" aria-label="deschide ' + sugEsc(s) + ' în Busola" title="deschide în Busola">🧭</a>' : '') + '</td>'
        + '<td class="' + (x.dir === "SUS" ? "good" : x.dir === "JOS" ? "bad" : "neutral") + '">' + sugEsc(x.dir === "neclara" ? "neclară" : x.dir) + (x.dir !== "neclara" && x.zileDir != null ? ' <span class="tbSub">de ' + sugCate(x.zileDir, "zi", "zile") + '</span>' : '') + '</td>'
        + '<td class="sugPandaCel' + prag(x.volPctl, P.volPctl) + '">' + sugPandaNr(x.volPctl) + '</td><td class="sugPandaCel' + prag(x.extPctl, P.extPctl) + '">' + sugPandaNr(x.extPctl) + '</td><td class="sugPandaCel' + prag(x.adrUsed, P.adrConsumat) + '">' + (x.adrUsed == null ? "—" : sugZec(x.adrUsed) + "%") + '</td>'
        + '<td class="sugPandaCel' + (prag(x.fundPctl, P.fundPctlSus) || prag(x.fundPctl, P.fundPctlJos, true)) + '">' + sugPandaNr(x.fundPctl) + '</td><td class="sugPandaCel' + prag(x.oiPctl, P.oiPctl) + '">' + sugPandaNr(x.oiPctl) + (x.oiChg != null ? ' <span class="tbSub">' + sugZec(x.oiChg) + '%</span>' : '') + '</td>'
        + '<td>' + sugPandaNr(x.lMari) + '</td><td>' + sugPandaNr(x.lMici) + '</td><td>' + sugPandaNr(x.deltaPctl) + '</td><td class="' + (cu === "CONTRA" ? "bad" : cu === "CU" ? "good" : "tbSub") + '">' + (cu || "—") + '</td></tr>';
    }).join("") + '</tbody></table></div><p class="tbSub">Percentilele sunt față de ultimele 564 de bare de 4h ale fiecărei monede; direcția = randamentul pe 84 de zile (ca în PAZNIC); conturile = Binance (poziții mari / conturi global); agresiunea = cine a fost agresorul (taker). O celulă colorată e un prag atins, nu un sfat.</p></div>';
  return h;
}
function sugPandaDesfa() { sugStare.panda.desfacut = true; sugDeseneaza(); }
// revizia (4): „pânda ›” din Tablou - pagina se ÎNCARCĂ (navTo cu load), blocul vine desfăcut, filtrul pe toate
function sugDeschidePanda() { sugStare.panda.desfacut = true; sugStare.panda.filtru = "toate"; navTo("sugestii", true); }
function sugPanda(f) { sugStare.panda.filtru = f; sugStare.panda.desfacut = true; sugDeseneaza(); }
function sugBani(v) { var n = Number(v); return isFinite(n) && n > 0 ? n.toFixed(n >= 10 ? 1 : 2).replace(".", ",") : ""; }   // poza 06.10: virgula, nu punctul; v100.183 (regula lui, 03.10): o zecimală de la 10 în sus (±0,05 = sub 0,5%), sub 10 două (stopul s-ar muta cu peste 0,5%); întregi pe pagina Trading 212
function sugSim(x) { return x.simbol || String(x.ticker || x.simbolTicker || "").split("_")[0]; }
function sugActiuniPiata(p, sa, pm, ii, steag, nume, acum) {
  var s = sa && sa[p], urm = sa && sa.urmarire && sa.urmarire[p] || {}, h = "", ast = !sa ? "aștept tura de la 8:00" : "nimic azi";
  var urc = s && s.urcare ? s.urcare.map(function (x) { return { s: sugSim(x), d: sugP1(x.ruptura) + " peste maximul pe 20 de zile, volum ×" + (x.volX || 0).toFixed(1).replace(".", ",") }; }) : [];
  var rev = s && s.revers ? s.revers.map(function (x) { return { s: sugSim(x), d: "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim, prima zi de întoarcere" }; }) : [];
  var dv = s && s.dovada || {};
  if (p === "us") {
    var ai = ii && ii.idei, act = ai && Array.isArray(ai.actiuni) ? ai.actiuni.map(function (x) { return { s: sugSim(x), d: [x.intrare ? "intrare " + sugBani(x.intrare) : "", x.stop ? "stop " + sugBani(x.stop) : "", x.tinta ? "țintă " + sugBani(x.tinta) : ""].filter(Boolean).join(" · ") }; }) : [];
    var rv = ai && Array.isArray(ai.reveniri) ? ai.reveniri.map(function (x) { return { s: sugSim(x), d: "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim, revine" }; }) : [];
    h += sugCartela("💡 Idei de cumpărare", ai ? (ai.trecute || act.length) + " din " + (ai.judecate || "—") + " trec de poartă" : null, act, ai ? "pe azi niciuna nu trece de poartă" : "aștept tura de la 8:00", "Poarta ideilor: trendul, rezultatele, istoricul tău pe acțiune - pagina Trading 212 le arată întregi.", null);
    h += sugCartela("🔁 Pe revenire", "au scăzut puternic și acum revin", rv, ai ? "nimic azi" : "aștept tura de la 8:00", ai && typeof Reveniri !== "undefined" ? Reveniri.textDovada(ai.dovadaReveniri, "actiuni") : null, null);
  }
  h += sugCartela("🌱 Început de urcare", "ies dintr-o perioadă liniștită, cu volum", urc, ast, dv.urcare && dv.urcare.text, sugUrm(urm.urcare));
  h += sugCartela("↩️ Revers timpuriu", "prima zi de întoarcere după o cădere de 15%+", rev, ast, dv.revers && dv.revers.text, sugUrm(urm.revers));
  if (p === "eu") {
    var re = s && s.revine ? s.revine.map(function (x) { return { s: sugSim(x), d: "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim, revine" }; }) : [];
    h += sugCartela("🔁 Pe revenire", "au scăzut puternic și acum revin", re, ast, dv.revine && dv.revine.text, null);
  }
  var q = pm && pm[p], ql = q && Array.isArray(q.lista) ? q.lista.map(function (x) { return { s: sugSim(x), d: sugP1(x.gap) + (p === "us" ? " în pre-market" : " la deschidere") + (x.volPct != null ? ", volum " + sugPc(x.volPct) + " din o zi" : "") }; }) : [];
  var cand = p === "us" ? "se face înainte de deschiderea de la New York (~15:50), în zilele de bursă" : "se face după 10:20, în zilele de bursă (când vin primele 20 de minute)";
  h += sugCartela(p === "us" ? "🌅 Pre-market" : "🌅 Gap la deschidere", q ? "la " + sugOra(q.la, acum) + " · " + sugCate(q.judecate || 0, "acțiune cu prețuri", "acțiuni cu prețuri") : null, ql, q ? "nimic peste +2% azi" : cand,
    dv.gap && dv.gap.text ? dv.gap.text + (p === "us" ? " Istoricul: gap-ul la deschidere, cumpărat la deschidere (Yahoo nu păstrează pre-market-ul pe 2 ani și nu-i dă volumul)." : " Istoricul: cumpărat la închiderea zilei gap-ului (la 10:20 deschiderea a trecut), fără condiția de volum.") : null, null);
  var marca = p === "us" ? '<section class="rlSec" data-sug="us">' : '<section class="rlSec" data-sug="eu">';
  return marca + '<h4 class="sugCap">' + steag + " " + sugEsc(nume) + (s ? ' <span class="tbSub">· ' + sugEsc(sugCate(Number(s.judecate) || 0, "acțiune judecată", "acțiuni judecate") + (Number(s.fara) ? ", " + Number(s.fara) + " fără prețuri" : "")) + '</span>' : '') + '</h4><div class="sugGrila">' + h + '</div></section>';
}
function sugBoti(cl, sg) {
  var I = typeof Idei !== "undefined" ? Idei : null, mo = function (x) { return String(x.moneda || x.simbol || "").replace(/_USDT_PERP$/, ""); };
  if (!cl || !I) return '<section class="rlSec" data-sug="boti"><h4 class="sugCap">🤖 Boți</h4><p class="sugGol">aștept clasamentul (colectorul îl face o dată pe oră)</p></section>';
  var s = sg && sg.sugestii, dv = s && s.dovada || {}, R = typeof Reveniri !== "undefined" ? Reveniri : null;
  // detaliile ca pe Tablou (intervalul, câștigul net pe grilă, trecerile pe zi) - poza 06.10: „scor 0” era un câmp care nu există
  var pr = function (v) { return (Math.round(Number(v) * 1000) / 10).toFixed(1).replace(".", ",") + "%"; };
  // v100.181 (el 13.10: „fă idei” - ideea 1): 🧭 pe fiecare monedă, Busola pe 4h (intervalul clasamentului), ca s-o verifici înainte de pornire
  var bz = function (s) { return typeof Busola !== "undefined" && Busola.adresaBusola ? Busola.adresaBusola({ simbol: s, tf: "4h" }) : null; };
  var pzS = typeof acPauzaSezon === "function" ? acPauzaSezon() : null;
  var porn = pzS > 0 ? [] : I.ideiBoti(cl, [], 5).map(function (x) { return { s: mo(x), b: bz(mo(x)), d: [x.latime != null ? "interval " + pr(x.latime) : "", x.profitGrila != null ? pr(x.profitGrila) + " net pe grilă" : "", x.traversariZi != null ? "~" + Math.round(x.traversariZi) + " treceri pe zi" : ""].filter(Boolean).join(" · ") || "candidat" }; });
  var rev = I.reveniriBoti ? I.reveniriBoti(cl, [], 5).map(function (x) { return { s: mo(x), b: bz(mo(x)), d: "pe revenire" }; }) : [], sh = I.shortBoti ? I.shortBoti(cl, [], 5).map(function (x) { return { s: mo(x), b: bz(mo(x)), d: "liniștită, direcția short" }; }) : [];
  return '<section class="rlSec" data-sug="boti"><h4 class="sugCap">🤖 Boți</h4><div class="sugGrila">'
    + sugCartela("💡 Pe ce aș porni un bot", "din clasamentul primelor 100 de monede PERP", porn, pzS > 0 ? acFrazaPauza(pzS) : "acum nicio monedă nu e candidată", "Un filtru (liniște, interval, treceri), nu o predicție; Fișa îți dă setările și proba pe moneda ta.", null)
    + sugCartela("🔁 Pe revenire", "monede care au scăzut puternic și acum revin", rev, "nimic acum", R && dv.revenire ? R.textDovada(dv.revenire.piata, "monede") + (R.TEXT_SUPRAVIETUITORI_MONEDE && dv.revenire.piata ? " ⚠ " + R.TEXT_SUPRAVIETUITORI_MONEDE : "") : null, null)   /* audit 19.10 (8): supraviețuitorii și la monede */
    + sugCartela("📉 Pentru short", "monede liniștite cu direcția short", sh, "nimic acum", R && dv.short ? R.textDovada(dv.short.piata, "short") + (R.TEXT_SUPRAVIETUITORI_MONEDE && dv.short.piata ? " ⚠ " + R.TEXT_SUPRAVIETUITORI_MONEDE : "") : null, null) + '</div></section>';
}
// v100.178 (el 13.10: „vreau exemple de top stocks pe sectoare în pagina Sugestii”): cele mai tari 3 acțiuni mari din fiecare sector (forța relativă
// pe 3 și 6 luni față de restul sectorului, doar cu trend în sus), cu istoricul regulii; clic ⇒ Poarta din Trading 212 pe simbol
// v100.196 (auditul sever 14.10, 🟡7): k = de unde vine simbolul ("trend12" = Trend 12 luni, în probă) și probat = bilanțul robotului zice „probat”;
// Poarta (t212.poartaSursa) dă atunci verdictul, dar nu dă o sumă până la „probat” - înainte fraza de sub listă promitea asta și nimic n-o făcea
function sugLaPoarta(sim, k, probat) {
  var s = String(sim || "").replace(/[^A-Za-z0-9.-]/g, "");
  if (typeof t212 !== "undefined" && t212) t212.poartaSursa = k ? { s: s.toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12), k: String(k), probat: probat === true || probat === "1" } : null;
  if (typeof deschideT212 === "function") deschideT212(); setTimeout(function () { if (typeof t212BiletPentru === "function") t212BiletPentru(s); }, 900);
}
function sugSectoareHtml(x, acum) {
  var h = '<section class="rlSec sugSectoare" data-sug="sect"><h3>🏆 Cele mai tari pe sectoare (acțiuni mari din SUA)</h3>';
  if (!x || !Array.isArray(x.sectoare)) return h + '<p class="tbSub">Topul se face o dată pe zi, de la 8:00 (după închiderea bursei din SUA), din screenerul Nasdaq: cele mai mari ~25 de firme din fiecare sector, cu prețurile pe 2 ani.</p></section>';
  var ist = x.istoric || {}, P = function (v) { return v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(0) + "%"; };
  h += '<p class="rlRasp">Regula, fixată înainte de cifre: în fiecare sector, doar acțiunile cu trend în sus (prețul peste media de 50 de zile, ea peste cea de 200), ordonate după cât au urcat pe 3 și pe 6 luni față de celelalte din sector. Un clasament, nu o predicție.</p>'
    + (ist.luni ? '<p class="tbSub">' + sugEsc("Pe ultimele " + ist.luni + " luni, primele 3 din fiecare sector, ținute o lună, au făcut în medie " + (ist.medie >= 0 ? "+" : "−") + Math.abs(ist.medie * 100).toFixed(1).replace(".", ",") + "% pe lună față de media sectorului, pe plus în " + ist.luniPlus + " din " + ist.luni + " luni. ⚠ Firmele sunt cele mari de AZI (cele care au căzut din top lipsesc), deci istoricul e optimist; momentumul pe 3–12 luni are un avantaj documentat în studii, nu dovedit pe banii tăi - jurnalul verdictelor îl măsoară de acum.") + "</p>" : "");
  h += '<div class="sugSectGrid">' + x.sectoare.map(function (s) {
    return '<div class="sugSect"><b>' + sugEsc(s.ro) + '</b> <span class="tbSub">' + sugEsc(s.etf + " · din " + s.n) + "</span>" + (s.top.length ? "<ol>" + s.top.map(function (t) {
      return '<li><button type="button" class="t212BtnLinie sugSectBtn" data-action-click="sugLaPoarta(\'' + String(t.s).replace(/[^A-Za-z0-9.-]/g, "") + '\')">' + sugEsc(t.s) + "</button> " + sugEsc(String(t.nume || "").slice(0, 28)) + '<br><span class="tbSub">' + sugEsc("3 luni " + P(t.r3) + " · 6 luni " + P(t.r6) + " (sectorul: " + P(t.r6 - t.peste6) + ") · " + (t.max52 > -0.005 ? "la maximul pe un an" : P(t.max52) + " de la maximul pe un an")) + "</span></li>";
    }).join("") + "</ol>" : '<p class="tbSub">nicio acțiune mare cu trend în sus acum</p>') + "</div>";
  }).join("") + "</div>" + '<p class="tbSub">Apasă pe simbol: se deschide Poarta din Trading 212 (planul, stopul, mărimea, ce se mișcă la fel cu ce ai deja). Sectoarele sunt după clasificarea Nasdaq, care diferă uneori de cea S&amp;P (Visa și Mastercard apar la Consum ciclic, transportul de gaze la Utilități).</p></section>';
  return h;
}
// v100.190 (14.10, el: „integrează cum ai zis”): „Trend 12 luni” — clasamentul robotului din premarket_scanner (primele 20 % din ~600 de
// acțiuni SUA ≥ 2 mld. $ după randamentul pe lunile 2–12, ultima lună sărită), citit o dată pe zi de colector (tura-trend.mjs). ÎN PROBĂ:
// doar INDICIU față de alte acțiuni în aceeași zi (auditul de seară 14.10: +0,8 % pe 20 z, t ≈ 1,5 pe ferestre independente), NEprobat pe listă istorică; bilanțul robotului îl
// judecă singur, iar jurnalul verdictelor (sursa „trend-12-1”) îl judecă aici, ca pe topul pe sectoare. Clic ⇒ Poarta T212 (planul TĂU).
function sugTrendHtml(x, acum) {
  var P1 = function (v) { return v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; };   /* v100.196: „+1,2%”, forma paginii */
  var ziNY = function (t) { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); };
  var h = '<section class="rlSec sugTrend" data-sug="trend"><h3>📈 Trend 12 luni (în probă)</h3>';
  if (!x || !Array.isArray(x.top) || !x.top.length) return h + '<p class="tbSub">Clasamentul vine o dată pe zi (după 8:00) de la robotul din Trading Tools: primele 20% dintre ~600 de acțiuni SUA de peste 2 mld. $ după randamentul pe lunile 2–12.</p></section>';
  var regim = !!(x.regim && x.regim.peste), b = x.bilant, probat = b && /^probat/i.test(String(b.verdict || "")) ? "1" : "";
  // v100.192 (I-627): zile de bursă NY de la EOD-ul robotului până azi, minus una (EOD de ieri = proaspăt); de la 2 ⇒ VECHI (robotul n-a publicat)
  var vechime = (function () { var a = Date.parse(x.dataUltimei + 'T12:00:00Z'), z = Date.parse(ziNY(acum) + 'T12:00:00Z'); if (!(a > 0) || !(z > a)) return 0; var n = 0; for (var t = a + 86400000; t <= z; t += 86400000) { var w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n++; } return Math.max(0, n - 1); })();
  h += '<p class="rlRasp">Regula, fixată înainte de cifre: primele 20% după randamentul pe lunile 2–12 (ultima lună sărită), cu momentum pozitiv, din ~600 de acțiuni SUA ≥ 2 mld. $; regim = SPY peste media pe 200 de zile. Pe 5 ani, față de alte acțiuni în aceleași zile, doar un <b>indiciu</b> (+0,8% pe 20 de zile, t ≈ 1,5 pe ferestre care nu se suprapun — sub pragul de „probat”), NEprobat pe listă istorică ⇒ <b>în probă</b> — nu e un buton de cumpărat. Se ține 20–60 de zile, fără stop strâns; iese când cade din top 20 % sau când regimul se oprește.</p>';
  var nota = 'EOD ' + x.dataUltimei + ' · regim ' + (regim ? 'pornit' : 'OPRIT') + (x.concentrare ? ' · ' + x.concentrare.n + ' din 20 ' + x.concentrare.sector + ' — un singur pariu' : '')
    + (b ? ' · proba: ' + TextRo.cate(b.n20 || 0, 'zi', 'zile') + ' cu rezultat' + (b.ferestre20 != null ? ' (' + TextRo.cate(b.ferestre20, 'fereastră', 'ferestre') + ' de 20 z)' : '') + (b.diferenta20 && b.diferenta20.medie != null && (b.n20 || 0) > 0 ? ', ' + P1(b.diferenta20.medie / 100) + ' vs alte acțiuni' : '') + (b.t20 != null ? ', t ' + String(b.t20.toFixed(1)).replace('.', ',') + ' („probat” cere t > 3,2 pe ≥ 12 ferestre)' : '') + ' · ' + b.verdict + (b.abatere && b.abatere.atinsa ? ' · ABATERE: media ' + P1(b.abatere.medie / 100) + ' sub pragul scris înainte ' + P1(b.abatere.prag / 100) : '') : ' · proba: fără bilanț încă')
    + (x.intrari && x.intrari.length ? ' · au intrat: ' + x.intrari.join(', ') : '')   /* v100.192 (I-627) */
    + (x.iesiri && x.iesiri.length ? ' · au ieșit: ' + x.iesiri.map(function (e) { return e.s; }).join(', ') : '') + (x.raportari !== 'finnhub' ? ' · raportările neverificate (robotul fără cheie)' : '');
  h += '<p class="tbSub">' + (vechime >= 2 ? '<b class="sugTrendVechi">VECHI de ' + sugEsc(TextRo.cate(vechime, 'zi', 'zile')) + ' de bursă — robotul n-a publicat</b> · ' : '') + sugEsc(nota) + '</p>';
  h += '<ol class="sugTrendLista">' + x.top.map(function (t) {
    var rap = t.raporteaza && t.raporteaza.d ? Math.round((Date.parse(t.raporteaza.d + 'T12:00:00Z') - Date.parse(ziNY(acum) + 'T12:00:00Z')) / 86400000) : null;
    return '<li><button type="button" class="t212BtnLinie sugSectBtn" data-action-click="sugLaPoarta(\'' + String(t.s).replace(/[^A-Za-z0-9.-]/g, '') + '\',\'trend12\',\'' + probat + '\')">' + sugEsc(t.s) + '</button> ' + sugEsc(String(t.nume || '').slice(0, 28))
      + ' <span class="tbSub sugTrendCifre">' + sugEsc(t.sector) + ' · <span class="sugTrendNr">12-1 ' + P1(t.m12) + '</span> · <span class="sugTrendNr">60 z ' + P1(t.r60) + '</span>'
      + (rap != null && rap >= 0 ? ' · <b class="sugTrendRap">raportează în ' + rap + 'z</b>' : '')
      + (t.salt && t.salt.pct >= 0.5 ? ' · <b class="sugTrendSalt">salt ' + P1(t.salt.pct) + ' într-o zi' + (t.salt.d ? ' (' + sugEsc(t.salt.d) + ')' : '') + ' — verifică seria</b>' : '')   /* v100.191: split/glitch? robotul măsoară, omul verifică */
      + '</span></li>';
  }).join('') + '</ol>' + (x.top.length > 10 ? '<button type="button" class="t212BtnLinie sugTrendTotBtn" data-action-click="sugTrendTot()">arată toate ' + x.top.length + ' ›</button>' : '');   /* v100.192 (I-626): pe telefon primele 10, restul la o apăsare */
  h += '<p class="tbSub">Apasă pe simbol: se deschide Poarta din Trading 212, cu planul și riscul tău. Judecata: jurnalul verdictelor, sursa „Trend 12 luni”, la 20 și 60 de zile față de S&P 500 (SPY); fiecare zi se judecă întreagă, ca un coș. Poarta nu dimensionează pe el până nu spune bilanțul „probat”.</p></section>';
  return h;
}
// v100.192 (I-626): pe telefon lista Trend arată primele 10; butonul desface restul (CSS: .sugTrendLista:not(.sugTrendTot) li:nth-child(n+11))
function sugTrendTot() { sugStare.trendTot = true; var l = document.querySelector('.sugTrendLista'); if (l) l.classList.add('sugTrendTot'); }
function sugHtml(d, acum) {
  d = d || {}; var sa = d.sugActiuni && d.sugActiuni.sugestii, pm = d.sugActiuni && d.sugActiuni.premarket;
  return '<p class="rlRasp" data-sug="rasp">Toate sugestiile, fiecare cu istoricul ei pe 2 ani. Un filtru, nu o predicție: o listă cu istoric slab rămâne, cu istoricul la vedere - judeci tu.</p>'
    + sugPandaHtml(d.latime, d.boti, acum) + sugBoti(d.clasament, d.sugMonede) + sugActiuniPiata("us", sa, pm, d.idei, "📈", "Acțiuni US", acum) + sugSectoareHtml(d.sectoare, acum) + sugTrendHtml(d.trend12, acum) + sugActiuniPiata("eu", sa, pm, null, "📈", "Acțiuni EU (DAX, CAC, AEX + ale tale)", acum)
    + '<p class="tbSub" data-sug="nota">Regulile au fost fixate înainte de cifre și nu se ajustează după istoric. Istoricul: intrare la deschiderea zilei de după semnal (gap-ul: vezi cartela lui), ieșire după 10 zile de bursă, cu 0,3% comision.</p>';
}
// v100.243: o secțiune își schimbă cifrele pe loc. Pagina întreagă se rescrie doar la primul desen
// sau când apare ori dispare un bloc. „arată toate” nu e parte din schelet: rămâne deschisă.
function sugSchelet(h) { return String(h || "").replace(/\s*\bsugTrendTot\b/g, "").replace(/>([^<]*)</g, "><"); }
function sugAcelasiNod(a, b) {
  if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1 || a.tagName !== b.tagName) return false;
  var ca = String(a.className || "").replace(/\bsugTrendTot\b/g, "").replace(/\s+/g, " ").trim();
  var cb = String(b.className || "").replace(/\bsugTrendTot\b/g, "").replace(/\s+/g, " ").trim();
  if (ca !== cb) return false;
  if ((a.getAttribute("href") || "") !== (b.getAttribute("href") || "")) return false;
  if ((a.getAttribute("data-action-click") || "") !== (b.getAttribute("data-action-click") || "")) return false;
  var ae = [], be = [], i, j;
  for (i = 0; i < a.childNodes.length; i++) if (a.childNodes[i].nodeType === 1) ae.push(a.childNodes[i]);
  for (j = 0; j < b.childNodes.length; j++) if (b.childNodes[j].nodeType === 1) be.push(b.childNodes[j]);
  if (ae.length !== be.length) return false;
  for (i = 0; i < ae.length; i++) if (!sugAcelasiNod(ae[i], be[i])) return false;
  return true;
}
function sugTexte(n, L) {
  for (var i = 0; i < n.childNodes.length; i++) {
    var c = n.childNodes[i];
    if (c.nodeType === 3) L.push(c);
    else if (c.nodeType === 1) sugTexte(c, L);
  }
}
function sugPeLoc(el, h) {
  if (!el || typeof document === "undefined") return false;
  var tmp = document.createElement("div"); tmp.innerHTML = h; var nou = tmp.firstElementChild;
  if (!nou || !sugAcelasiNod(el, nou)) return false;
  var a = [], b = []; sugTexte(el, a); sugTexte(nou, b);
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i].nodeValue !== b[i].nodeValue) a[i].nodeValue = b[i].nodeValue;
  sugPuneTitle(el, nou);
  return true;
  function sugPuneTitle(x, y) {
    if (!x || x.nodeType !== 1 || !y || y.nodeType !== 1 || !x.getAttribute || !y.getAttribute) return;
    var t = y.getAttribute("title"), i, xe = [], ye = [];
    if (t) { if (x.getAttribute("title") !== t) x.setAttribute("title", t); }
    else if (x.getAttribute("title") != null && typeof x.removeAttribute === "function") x.removeAttribute("title");
    for (i = 0; i < x.childNodes.length; i++) if (x.childNodes[i].nodeType === 1) xe.push(x.childNodes[i]);
    for (i = 0; i < y.childNodes.length; i++) if (y.childNodes[i].nodeType === 1) ye.push(y.childNodes[i]);
    for (i = 0; i < xe.length && i < ye.length; i++) sugPuneTitle(xe[i], ye[i]);
  }
}
function sugTineTrend(el) {
  if (!sugStare.trendTot || !el) return;
  var l = el.querySelector(".sugTrendLista"); if (l) l.classList.add("sugTrendTot");
}
// v100.244: cele 8 locuri sunt deja în pagină. Un rând nou se adaugă, unul dispărut se scoate,
// rândul care rămâne își schimbă cifra în același nod. Lățimea grilei se ține cât o bară de derulare.
function sugLatime(px, tinut) {
  var w = Number(px), t = Number(tinut);
  if (!(w >= 160)) return t >= 160 ? t : 0;
  if (t >= 160 && Math.abs(w - t) < 48) return t;
  var q = Math.round(w / 48) * 48;
  return q >= 160 ? q : 160;
}
function sugAplicLatime(el) {
  if (!el || typeof el.querySelectorAll !== "function") return;
  var r = typeof el.getBoundingClientRect === "function" ? el.getBoundingClientRect() : null;
  var mas = r && isFinite(r.width) ? r.width : 0;
  var t = sugLatime(mas, sugStare.latimeGrila || 0);
  sugStare.latimeGrila = t;
  var n = t >= 160 ? Math.max(1, Math.min(4, Math.floor(t / 270))) : 0;
  var stil = n ? "repeat(" + n + ",minmax(0,1fr))" : "";
  var g = el.querySelectorAll(".sugGrila, .sugSectGrid"), i;
  for (i = 0; i < g.length; i++) if (g[i].style) g[i].style.gridTemplateColumns = stil;
}
function sugLaFereastra() {
  var el = typeof document !== "undefined" && document.getElementById && document.getElementById("sugPagina");
  if (!el || typeof el.getBoundingClientRect !== "function") return;
  var r = el.getBoundingClientRect();
  var mas = r && isFinite(r.width) ? r.width : 0;
  var tinut = sugStare.latimeGrila || 0;
  if (sugLatime(mas, tinut) === tinut) return;
  sugAplicLatime(el);
}
function sugAscultaFereastra() {
  if (typeof addEventListener === "function") addEventListener("resize", sugLaFereastra);
}
function sugAlinia(vechi, nou) {
  function elemente(n) {
    var L = [], i;
    for (i = 0; i < n.childNodes.length; i++) if (n.childNodes[i].nodeType === 1) L.push(n.childNodes[i]);
    return L;
  }
  function cheieRand(n) {
    var i, c, tag, t, j, act;
    if (!n || n.nodeType !== 1) return "";
    act = n.getAttribute ? n.getAttribute("data-action-click") : null;
    if (act) return "act:" + act;
    for (i = 0; i < n.childNodes.length; i++) {
      c = n.childNodes[i];
      if (!c || c.nodeType !== 1) continue;
      tag = String(c.tagName || "").toUpperCase();
      if (tag !== "B" && tag !== "BUTTON") continue;
      t = "";
      for (j = 0; j < c.childNodes.length; j++) if (c.childNodes[j].nodeType === 3) t += c.childNodes[j].nodeValue;
      t = t.replace(/\s+/g, " ").trim();
      if (t) return tag + ":" + t;
    }
    return "";
  }
  function cheieBaza(n) {
    var cls = String(n.className || "").replace(/\bsugTrendTot\b/g, "").replace(/\bales\b/g, "").replace(/\s+/g, " ").trim();
    return String(n.tagName || "").toUpperCase() + "." + cls;
  }
  function chei(lista) {
    var vazut = {}, out = [], i, k, b;
    for (i = 0; i < lista.length; i++) {
      k = cheieRand(lista[i]);
      if (!k) {
        b = cheieBaza(lista[i]);
        vazut[b] = (vazut[b] || 0) + 1;
        k = b + "#" + vazut[b];
      } else {
        vazut[k] = (vazut[k] || 0) + 1;
        if (vazut[k] > 1) k = k + "#" + vazut[k];
      }
      out.push(k);
    }
    return out;
  }
  function puneClasa(a, b) {
    var clsV = " " + String(a.className || "").replace(/\s+/g, " ") + " ";
    var cls = String(b.className || "").replace(/\s+/g, " ").trim();
    if (clsV.indexOf(" sugTrendTot ") >= 0 && (" " + cls + " ").indexOf(" sugTrendTot ") < 0) cls = (cls + " sugTrendTot").trim();
    a.className = cls;
    if (a.setAttribute) a.setAttribute("class", cls);
  }
  function puneLegatura(a, b) {
    var i, k, v, nume = ["href", "data-action-click", "title"];
    for (i = 0; i < nume.length; i++) {
      k = nume[i];
      v = b.getAttribute ? b.getAttribute(k) : null;
      if (v) a.setAttribute(k, v);
      else if (a.getAttribute && a.getAttribute(k) != null && a.removeAttribute) a.removeAttribute(k);
    }
  }
  function sincronTexte(a, b) {
    var ta = [], tb = [], i, n;
    for (i = 0; i < a.childNodes.length; i++) if (a.childNodes[i].nodeType === 3) ta.push(a.childNodes[i]);
    for (i = 0; i < b.childNodes.length; i++) if (b.childNodes[i].nodeType === 3) tb.push(b.childNodes[i]);
    n = Math.min(ta.length, tb.length);
    for (i = 0; i < n; i++) if (ta[i].nodeValue !== tb[i].nodeValue) ta[i].nodeValue = tb[i].nodeValue;
    for (i = n; i < tb.length; i++) a.appendChild(tb[i]);
    for (i = ta.length - 1; i >= n; i--) if (ta[i].parentNode) ta[i].parentNode.removeChild(ta[i]);
  }
  function alinia(a, b) {
    if (!a || !b || a.nodeType !== 1 || b.nodeType !== 1) return false;
    if (String(a.tagName).toUpperCase() !== String(b.tagName).toUpperCase()) return false;
    puneClasa(a, b);
    puneLegatura(a, b);
    var ae = elemente(a), be = elemente(b), ak = chei(ae), bk = chei(be);
    var harta = {}, i, j, gasit, ordine = [], folosit = {};
    for (i = 0; i < ae.length; i++) if (!harta[ak[i]]) harta[ak[i]] = ae[i];
    for (j = 0; j < be.length; j++) {
      gasit = harta[bk[j]];
      if (gasit && !folosit[bk[j]]) {
        if (!alinia(gasit, be[j])) return false;
        folosit[bk[j]] = 1;
        ordine.push(gasit);
      } else ordine.push(be[j]);
    }
    for (i = 0; i < ae.length; i++) if (!folosit[ak[i]] && ae[i].parentNode) ae[i].parentNode.removeChild(ae[i]);
    for (j = 0; j < ordine.length; j++) a.appendChild(ordine[j]);
    sincronTexte(a, b);
    return true;
  }
  return alinia(vechi, nou);
}
function sugDeseneaza() {
  var el = typeof document !== "undefined" && document.getElementById("sugPagina"); if (!el) return;
  var h = sugHtml(sugStare.d, Date.now()); if (el._sugH === h) return;
  var tmp = document.createElement("div"); tmp.innerHTML = h;
  var nou = [].slice.call(tmp.children), vechi = [].slice.call(el.children), parti = nou.map(function (c) { return c.outerHTML; }), peLoc = vechi.length === nou.length;
  if (peLoc) for (var i = 0; i < nou.length; i++) {
    if (el._sugP && el._sugP[i] === parti[i]) continue;
    if (el._sugP && sugSchelet(el._sugP[i]) === sugSchelet(parti[i]) && sugPeLoc(vechi[i], parti[i])) continue;
    if (sugAlinia(vechi[i], nou[i])) continue;
    vechi[i].outerHTML = parti[i];
  } else el.innerHTML = h;
  el._sugH = h; el._sugP = parti; sugTineTrend(el); sugAplicLatime(el);
}
async function sugPorneste(fortat) {
  sugDeseneaza();
  if (sugStare.inLucru || (!fortat && Date.now() - sugStare.la < 5 * 60000)) return;
  sugStare.inLucru = true; sugStare.la = Date.now();
  var d = sugStare.d, pas = async function (k, fn) { try { d[k] = await fn(); } catch (e) {} sugDeseneaza(); };
  try {
    await Promise.all([
      pas("latime", function () { return getJSON("/api/istoric-bot?action=latime").then(function (r) { return r && r.latime || null; }); }),   /* v100.150 (I-584): lățimea pieței + pânda */
      pas("boti", function () { return getJSON("/api/bot-orders").then(function (r) { return r && Array.isArray(r.bots) ? r.bots.filter(function (b) { return b && b.activ !== false; }).map(function (b) { return { s: String(b.baza || "").replace(/\.PERP$/, "").toUpperCase(), dir: String(b.directie || "").toLowerCase() }; }) : []; }); }),
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),
      pas("sugMonede", function () { return getJSON("/api/istoric-bot?action=sugestii"); }),
      pas("idei", function () { return getJSON("/api/t212?action=idei"); }),
      pas("sugActiuni", function () { return getJSON("/api/t212?action=sugestii"); }),
      pas("sectoare", function () { return getJSON("/api/istoric-bot?action=sectoareTop").then(function (r) { return r && r.sectoare || null; }); }),   /* v100.178 */
      pas("trend12", function () { return getJSON("/api/istoric-bot?action=trend12").then(function (r) { return r && r.trend || null; }); })   /* v100.190 */
    ]);
  } finally { sugStare.inLucru = false; }
  sugDeseneaza();
}
sugAscultaFereastra();
