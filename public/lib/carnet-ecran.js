// v100.117 (I-561, el 06.10: „Fișa are dreptate?”, „Istoric + înainte”, „Da, așa”): pagina „Carnetul fișei” - desenează raportul de noapte
// al laboratorului (Carnet.raport, /api/istoric-bot?action=carnet). carnetHtml e fără DOM (proba o rulează în vm); carnetPorneste leagă pagina
// și rândul de sub „Ce aș alege eu” din fișă. Se încarcă după carnet.js.
var carnetStare = { raport: null, la: 0, inLucru: false, eroare: null };
function cnEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function cnPct(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + "%"; }
function cnCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
function cnRand(text) { return text ? '<p class="rlRasp">' + cnEsc(text) + "</p>" : ""; }   // starea e deja în frază (poza 06.10: „nedovedit” de două ori)
function cnCalibrare(c) {
  if (!Array.isArray(c) || !c.length) return "";
  return '<div class="rlTab"><table class="cnTab"><thead><tr><th>Stopul promis de probă</th><th>Porniri</th><th>Promis, în medie</th><th>A venit</th></tr></thead><tbody>'
    + c.map(function (k) { return '<tr class="cnCos"><td>' + cnEsc(k.cos) + "</td><td>" + (Number(k.n) || 0) + (k.putine && k.n ? ' <span class="tbSub">puține</span>' : "") + "</td><td>" + cnPct(k.promis) + "</td><td>" + cnPct(k.venit) + "</td></tr>"; }).join("")
    + "</tbody></table></div>"
    + (function () { var k = c.filter(function (x) { return x.n >= 30 && x.promis != null; }).sort(function (a, b) { return Math.abs(b.venit - b.promis) - Math.abs(a.venit - a.promis); })[0] || c.filter(function (x) { return x.n > 0; })[0]; return k ? '<p class="tbSub cnCiteste">' + cnEsc("Cel mai mult se abate: " + Carnet.textCalibrare(k).replace(/^Stopul/, "stopul")) + "</p>" : ""; })();
}
function carnetHtml(r, acum) {
  if (!r || !r.rejoc) return '<p class="tbSub">Carnetul se face noaptea, în laboratorul colectorului (o dată pe zi). Încă nu există: revino după prima lui tură.</p>';
  acum = acum || Date.now();
  var d = new Date(r.la), p = function (n) { return String(n).padStart(2, "0"); }, ore = Math.round((acum - r.la) / 3600000), rj = r.rejoc, ina = r.inainte || {};
  var qa = rj.intrebari || {}, qi = ina.intrebari || {};
  var h = '<p class="tbSub rlLa">Carnetul de la ' + p(d.getDate()) + "." + p(d.getMonth() + 1) + ", ora " + p(d.getHours()) + ":" + p(d.getMinutes())
    + (ore > 36 ? " · vechi (de acum " + cnCate(ore, "oră", "ore") + "): laboratorul îl reface noaptea" : " · se reface o dată pe noapte") + ".</p>";
  h += '<p class="rlRasp">Fișa îți spune trei lucruri: ce variantă aș alege (ÎNGUST sau LARG), când aș aștepta și cât de des vine stopul. Aici e cum au ieșit.</p>';
  // pe istoric
  h += '<section class="rlSec"><h4>Pe istoric</h4><p class="tbSub">' + cnEsc(cnCate(rj.n, "caz", "cazuri") + " pe " + cnCate(rj.monede, "monedă", "monede") + ": o pornire pe zi, long și short, fiecare urmărită 3 zile; fișa a văzut doar barele de dinainte de pornire.") + "</p>"
    + cnRand(Carnet.textAlegere(qa.alegere)) + cnRand(Carnet.textAsteapta(qa.asteapta))
    + cnCalibrare(rj.calibrare)
    + '<div class="rlCon"><span class="rlFac">👉 ' + cnEsc(Carnet.concluzie(qa)) + "</span></div></section>";
  // de acum înainte
  h += '<section class="rlSec"><h4>De acum înainte</h4><p class="tbSub">' + cnEsc(cnCate(ina.oferte || 0, "ofertă notată", "oferte notate") + " (laboratorul, zilnic, și fișa ta): judecate " + (ina.judecate || 0) + ", așteaptă cele 3 zile " + (ina.asteapta || 0)
    + (ina.nejudecabile ? ", nu se pot judeca " + ina.nejudecabile + " (vechi, fără grile)" : "") + ".") + "</p>"
    // poza 06.10: sub 30 de judecate, un singur rând (nu trei „încă nu spune nimic”)
    + ((ina.judecate || 0) < 30 ? cnRand("Ofertele judecate: " + (ina.judecate || 0) + " din 30 - încă nu spune nimic; verdictele apar pe măsură ce trec cele 3 zile.")
      : cnRand(Carnet.textAlegere(qi.alegere)) + cnRand(Carnet.textAsteapta(qi.asteapta)) + cnRand(Carnet.textVerdictFisa(ina.fisa))) + "</section>";
  h += '<details class="rlMetoda"><summary>Cum am socotit (regula fixată înainte de cifre)</summary><ul>'
    + ["Rezultatul unei variante = simulatorul fișei pe 3 zile de la pornire, după comisioane; ce rămâne deschis se socotește la prețul de la capăt.",
      "Alegerea: pe fiecare pornire, varianta aleasă față de cealaltă, pe aceleași bare (când sunt la fel sau fișa zice „aștept”, nu intră).",
      "Dovedit = două teste trec amândouă sub 1%: pe monede (diferența pe fiecare monedă, semnele întoarse la întâmplare) și pe timp (diferența în fiecare bloc de 3 zile, la fel), plus același semn în ambele jumătăți de timp; la limită = sub 5%; sub 30 de cazuri pe o parte, sub 8 monede sau sub 8 blocuri = prea puține.",
      "De ce două teste: pornirile din aceeași monedă se suprapun, iar toate monedele trec prin aceeași piață. Măsurat pe date fără niciun efect: bootstrap-ul vechi dădea „dovezi” false în 3,5% din cazuri, testul doar pe monede în 15–40% când monedele se mișcă împreună, amândouă testele în ~1%.",
      "Fișa din re-joc e aceeași ca pe pagină (levierul sigur inclus), cu o diferență: barele de 4 ore și de o zi vin din cele 30 de zile de 15 minute, nu de la Pionex.",
      "„Pornește / aștept” depinde de semafor și de piața de atunci, deci nu se poate re-juca: se judecă doar pe ofertele de acum înainte."].map(function (t) { return "<li>" + cnEsc(t) + "</li>"; }).join("") + "</ul></details>";
  return h;
}
function carnetDeseneaza() { var el = typeof document !== "undefined" && document.getElementById("cnPagina"); if (!el) return; el.innerHTML = carnetStare.eroare && !carnetStare.raport ? '<p class="tbSub">' + cnEsc(carnetStare.eroare) + "</p>" : carnetHtml(carnetStare.raport); }
// încercarea se notează ÎNAINTE de cerere (o dată pe minut fără raport, la 10 min cu raport) - fișa o cheamă la fiecare deschidere a Gridului
async function carnetPorneste(fortat) {
  carnetDeseneaza();
  if (carnetStare.inLucru || (!fortat && Date.now() - carnetStare.la < (carnetStare.raport ? 10 * 60000 : 60000))) return;
  carnetStare.inLucru = true; carnetStare.la = Date.now();
  var inainte = carnetStare.raport ? carnetStare.raport.la : null;
  try { var d = await getJSON("/api/istoric-bot?action=carnet"); carnetStare.raport = d && d.carnet || null; carnetStare.eroare = null; }
  catch (e) { carnetStare.eroare = "N-am putut citi carnetul: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }
  finally { carnetStare.inLucru = false; }
  carnetDeseneaza();
  // revizia (M6): rândul de sub „Ce aș alege eu” apare și la prima deschidere a Gridului - fișa se redesenează când vine carnetul (o dată)
  try { var g = document.getElementById("gridset"); if (carnetStare.raport && carnetStare.raport.la !== inainte && g && g.classList.contains("on") && typeof renderGrid === "function") renderGrid(); } catch (e) {}
}
