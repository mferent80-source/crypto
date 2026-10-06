// v100.119 (el 06.10: „o pagină de sugestii unde pui tot: boți, EU, US, absolut toate”): pagina „Sugestii” - toate listele într-un loc,
// fiecare cu istoricul ei pe 2 ani și urmărirea înainte. Un filtru, nu o predicție: o listă cu istoric slab rămâne, cu istoricul la vedere.
// sugHtml e fără DOM (proba o rulează în vm); sugPorneste aduce datele. Nimic nu se mută: listele rămân și pe Tablou, T212 și Acasă.
var sugStare = { d: {}, la: 0, inLucru: false };
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
    + (r.length ? '<ul class="sugLista">' + r.map(function (x) { return '<li><b>' + sugEsc(x.s) + '</b> <span class="tbSub">' + sugEsc(x.d) + '</span></li>'; }).join("") + '</ul>' : '<p class="sugGol">' + sugEsc(gol) + '</p>')
    + (istoric ? '<p class="tbSub sugIstoric">' + sugEsc(istoric) + '</p>' : '') + (urm ? '<p class="tbSub sugUrm">' + sugEsc(urm) + '</p>' : '') + '</div>';
}
// revizia (M1): se judecă semnalele de cel puțin 14 zile, la prețul de ACUM (nu „atunci”)
function sugUrm(u) { return !u || !u.n ? "Urmărirea înainte începe: semnalele de cel puțin 14 zile, la prețul de acum." : "Urmărit înainte (semnalele de cel puțin 14 zile, la prețul de acum): " + u.n + " - " + sugPc(u.pePlus) + " pe plus, " + sugP1(u.medie) + " în medie, după comision."; }
function sugBani(v) { var n = Number(v); return isFinite(n) && n > 0 ? n.toFixed(2).replace(".", ",") : ""; }   // poza 06.10: virgula, nu punctul
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
  return '<section class="rlSec"><h4 class="sugCap">' + steag + " " + sugEsc(nume) + (s ? ' <span class="tbSub">· ' + sugEsc(sugCate(Number(s.judecate) || 0, "acțiune judecată", "acțiuni judecate") + (Number(s.fara) ? ", " + Number(s.fara) + " fără prețuri" : "")) + '</span>' : '') + '</h4><div class="sugGrila">' + h + '</div></section>';
}
function sugBoti(cl, sg) {
  var I = typeof Idei !== "undefined" ? Idei : null, mo = function (x) { return String(x.moneda || x.simbol || "").replace(/_USDT_PERP$/, ""); };
  if (!cl || !I) return '<section class="rlSec"><h4 class="sugCap">🤖 Boți</h4><p class="sugGol">aștept clasamentul (colectorul îl face o dată pe oră)</p></section>';
  var s = sg && sg.sugestii, dv = s && s.dovada || {}, R = typeof Reveniri !== "undefined" ? Reveniri : null;
  // detaliile ca pe Tablou (intervalul, câștigul net pe grilă, trecerile pe zi) - poza 06.10: „scor 0” era un câmp care nu există
  var pr = function (v) { return (Math.round(Number(v) * 1000) / 10).toFixed(1).replace(".", ",") + "%"; };
  var porn = I.ideiBoti(cl, [], 5).map(function (x) { return { s: mo(x), d: [x.latime != null ? "interval " + pr(x.latime) : "", x.profitGrila != null ? pr(x.profitGrila) + " net pe grilă" : "", x.traversariZi != null ? "~" + Math.round(x.traversariZi) + " treceri pe zi" : ""].filter(Boolean).join(" · ") || "candidat" }; });
  var rev = I.reveniriBoti ? I.reveniriBoti(cl, [], 5).map(function (x) { return { s: mo(x), d: "pe revenire" }; }) : [], sh = I.shortBoti ? I.shortBoti(cl, [], 5).map(function (x) { return { s: mo(x), d: "liniștită, direcția short" }; }) : [];
  return '<section class="rlSec"><h4 class="sugCap">🤖 Boți</h4><div class="sugGrila">'
    + sugCartela("💡 Pe ce aș porni un bot", "din clasamentul primelor 100 de monede PERP", porn, "acum nicio monedă nu e candidată", "Un filtru (liniște, interval, treceri), nu o predicție; Fișa îți dă setările și proba pe moneda ta.", null)
    + sugCartela("🔁 Pe revenire", "monede care au scăzut puternic și acum revin", rev, "nimic acum", R && dv.revenire ? R.textDovada(dv.revenire.piata, "monede") : null, null)
    + sugCartela("📉 Pentru short", "monede liniștite cu direcția short", sh, "nimic acum", R && dv.short ? R.textDovada(dv.short.piata, "short") : null, null) + '</div></section>';
}
function sugHtml(d, acum) {
  d = d || {}; var sa = d.sugActiuni && d.sugActiuni.sugestii, pm = d.sugActiuni && d.sugActiuni.premarket;
  return '<p class="rlRasp">Toate sugestiile, fiecare cu istoricul ei pe 2 ani. Un filtru, nu o predicție: o listă cu istoric slab rămâne, cu istoricul la vedere - judeci tu.</p>'
    + sugBoti(d.clasament, d.sugMonede) + sugActiuniPiata("us", sa, pm, d.idei, "📈", "Acțiuni US", acum) + sugActiuniPiata("eu", sa, pm, null, "📈", "Acțiuni EU (DAX, CAC, AEX + ale tale)", acum)
    + '<p class="tbSub">Regulile au fost fixate înainte de cifre și nu se ajustează după istoric. Istoricul: intrare la deschiderea zilei de după semnal (gap-ul: vezi cartela lui), ieșire după 10 zile de bursă, cu 0,3% comision.</p>';
}
function sugDeseneaza() { var el = typeof document !== "undefined" && document.getElementById("sugPagina"); if (el) el.innerHTML = sugHtml(sugStare.d, Date.now()); }
async function sugPorneste(fortat) {
  sugDeseneaza();
  if (sugStare.inLucru || (!fortat && Date.now() - sugStare.la < 5 * 60000)) return;
  sugStare.inLucru = true; sugStare.la = Date.now();
  var d = sugStare.d, pas = async function (k, fn) { try { d[k] = await fn(); } catch (e) {} sugDeseneaza(); };
  try {
    await Promise.all([
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),
      pas("sugMonede", function () { return getJSON("/api/istoric-bot?action=sugestii"); }),
      pas("idei", function () { return getJSON("/api/t212?action=idei"); }),
      pas("sugActiuni", function () { return getJSON("/api/t212?action=sugestii"); })
    ]);
  } finally { sugStare.inLucru = false; }
  sugDeseneaza();
}
