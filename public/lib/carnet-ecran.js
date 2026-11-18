// v100.117 (I-561, el 06.10: „Fișa are dreptate?”, „Istoric + înainte”, „Da, așa”): pagina „Carnetul fișei” - desenează raportul de noapte
// al laboratorului (Carnet.raport, /api/istoric-bot?action=carnet). carnetHtml e fără DOM (proba o rulează în vm); carnetPorneste leagă pagina
// și rândul de sub „Ce aș alege eu” din fișă. Se încarcă după carnet.js (și carnet-grafice.js).
// v100.362 (el, 18.11.2026: „Carnetul ca Jurnalul”; hotărârile LUI: cifrele reparate și spuse cinstit, toate ofertele păstrate, aspectul ca paginile
// refăcute, toate graficele + alte idei): cap cu tema, fraza mare + „De unde știu”, trei cifre mari (alegerea față de „mereu LARG”, „aș aștepta” ⇒
// stopul, stopul promis care se abate cel mai mult), rânduri pliate pe întrebări; tot textul vechi își are locul (nimic pierdut). Raportul vechi
// (fără v2) se desenează ca înainte, în rândurile noi.
var carnetStare = { raport: null, la: 0, inLucru: false, eroare: null, surse: false };
function cnEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function cnPct(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + " %"; }
function cnP1(x) { if (x != null && isFinite(x) && Math.abs(x) < 0.0005) x = 0; return x == null || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "")   /* fără „−0,0 %” */ + Math.abs(x * 100).toFixed(1).replace(".", ",") + " %"; }
function cnIv(s) { return s && s.lo != null && s.hi != null ? cnP1(s.lo) + " … " + cnP1(s.hi) : ""; }
function cnMii(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function cnCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
function cnRand(text) { return text ? '<p class="cnRasp">' + cnEsc(text) + "</p>" : ""; }
function cnCalibrare(c) {
  if (!Array.isArray(c) || !c.length) return "";
  return '<div class="rlTab"><table class="cnTab"><thead><tr><th>Stopul promis de probă</th><th>Porniri</th><th>Promis, în medie</th><th>A venit</th></tr></thead><tbody>'
    + c.map(function (k) { return '<tr class="cnCos"><td>' + cnEsc(k.cos) + "</td><td>" + (Number(k.n) || 0) + (k.putine && k.n ? ' <span class="tbSub">puține</span>' : "") + "</td><td>" + cnPct(k.promis) + "</td><td>" + cnPct(k.venit) + (k.lo != null ? ' <span class="cnMut">(' + cnPct(k.lo) + "–" + cnPct(k.hi) + ")</span>" : "") + "</td></tr>"; }).join("")
    + "</tbody></table></div>"
    + (function () { var k = c.filter(function (x) { return x.n >= 30 && x.promis != null; }).sort(function (a, b) { return Math.abs(b.venit - b.promis) - Math.abs(a.venit - a.promis); })[0] || c.filter(function (x) { return x.n > 0; })[0]; return k ? '<p class="tbSub cnCiteste">' + cnEsc("Cel mai mult se abate: " + Carnet.textCalibrare(k).replace(/^Stopul/, "stopul")) + "</p>" : ""; })();
}
// coșul care se abate cel mai mult (cu destule porniri)
function cnAbate(c) { return (Array.isArray(c) ? c : []).filter(function (x) { return x.n >= 30 && x.promis != null && x.venit != null; }).sort(function (a, b) { return Math.abs(b.venit - b.promis) - Math.abs(a.venit - a.promis); })[0] || null; }
function cnOra(t) { var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "." + p(d.getMonth() + 1) + ", ora " + p(d.getHours()) + ":" + p(d.getMinutes()); }
// fraza mare (cinstită, din analiza nouă): alegerea față de „mereu LARG”; ce ține („aș aștepta” prezice stopul); stopul promis care se abate
function cnFraza(r) {
  var a = r.v2 && r.v2.rejoc, b = r.inainte && r.inainte.v2, s = a && a.vsLarg;
  if (!s || s.medie == null) return { fr: Carnet.concluzie(r.rejoc && r.rejoc.intrebari), sub: "" };
  // sub zero cu tot intervalul: „nu bate” (nu „mai prost”) - regula fixată înainte spune „nedovedit”, iar p-ul se mișcă după ora pornirilor (auditul)
  var fr = s.hi != null && s.hi < 0 ? "Alegerea fișei nu bate „aș lua mereu LARG”: " + cnP1(s.medie) + " pe 3 zile, pe istoric (interval " + cnIv(s) + ")."
    : s.lo != null && s.lo > 0 ? "Alegerea fișei bate „aș lua mereu LARG”: " + cnP1(s.medie) + " pe 3 zile, pe istoric."
    : "Nu se vede că alegerea fișei bate „aș lua mereu LARG”: " + cnP1(s.medie) + " pe 3 zile, pe istoric.";
  var sub = "Fișa alege LARG în " + cnPct(a.alegeLarg / Math.max(1, a.perechi)) + " din cazuri; acolo unde a ales ÎNGUST, ÎNGUST − LARG a dat " + cnP1(a.ingustVsLarg.medie) + " (" + cnIv(a.ingustVsLarg) + ", " + Carnet.stareText(a.ingustVsLarg.stare) + ").";
  var A = a.asteapta;
  if (A && A.stop && A.stop.medie != null && A.stopRest.medie != null) sub += " Ce ține: „aș aștepta” prezice stopul - a venit în " + cnPct(A.stop.medie) + " din porniri, față de " + cnPct(A.stopRest.medie) + " la celelalte" + (b && b.asteapta && b.asteapta.stop && b.asteapta.stop.medie != null ? " (înainte: " + cnPct(b.asteapta.stop.medie) + " față de " + cnPct(b.asteapta.stopRest.medie) + ")" : "") + ".";
  var k = cnAbate(b && b.calibrare);
  if (k && Math.abs(k.venit - k.promis) >= 0.1) sub += " Stopul promis " + k.cos + " a venit mai " + (k.venit > k.promis ? "des" : "rar") + " decât spune: " + cnPct(k.promis) + " promis ⇒ " + cnPct(k.venit) + " pe ofertele de acum înainte.";
  return { fr: fr, sub: sub };
}
function cnSurse(r) {
  var ore = r.la ? Math.round((Date.now() - r.la) / 3600000) : null;
  return ["Carnetul de la " + cnOra(r.la) + (ore != null && ore > 30 ? " - vechi (de acum " + cnCate(ore, "oră", "ore") + "): laboratorul nu s-a mai făcut" : "") + ". Se reface în fiecare noapte, între 05:00 și 09:00 ora României, în laboratorul colectorului.",
    "Fișa îți spune trei lucruri: ce variantă aș alege (ÎNGUST sau LARG), când aș aștepta și cât de des vine stopul. Aici e cum au ieșit.",
    "Reperul cinstit al alegerii e „aș lua mereu LARG”: fișa alege LARG aproape mereu, deci „aleasă față de cealaltă” spune de fapt doar „LARG față de ÎNGUST”.",
    "Mediile sunt pe cazuri, cu intervalul de 95 % pe blocuri de 3 zile (cazurile din același bloc trec prin aceeași piață); un grup cu sub 10 cazuri nu primește medie.",
    "Unitatea: rezultatul unei variante, din suma pusă (marjă), pe 3 zile, după comisioane; o lichidare = −100 %."];
}
function cnCifre(r) {
  var a = r.v2 && r.v2.rejoc, b = r.inainte && r.inainte.v2; if (!a || !a.vsLarg) return "";
  var k = cnAbate(b && b.calibrare) || cnAbate(a.calibrare), A = a.asteapta;
  var cel = function (et, cifra, sub, ton) { return '<div class="cnCifra"><span class="cnEt">' + cnEsc(et) + '</span><b class="cnMare' + (ton || "") + '">' + cnEsc(cifra) + '</b><span class="cnMut cnMic">' + cnEsc(sub) + "</span></div>"; };
  return '<div class="cnCifre">'
    + cel("Alegerea fișei față de „mereu LARG”", cnP1(a.vsLarg.medie), "pe istoric, " + cnIv(a.vsLarg) + " · " + cnCate(a.perechi, "pereche", "perechi") + (b && b.vsLarg && b.vsLarg.medie != null ? " · înainte " + cnP1(b.vsLarg.medie) : ""))
    + (A && A.stop.medie != null ? cel("Stopul când zic „aș aștepta”", cnPct(A.stop.medie) + " față de " + cnPct(A.stopRest.medie), "pe istoric" + (b && b.asteapta && b.asteapta.stop && b.asteapta.stop.medie != null ? " · înainte " + cnPct(b.asteapta.stop.medie) + " față de " + cnPct(b.asteapta.stopRest.medie) : "") + " - așteptarea are dreptate la stop", " cnBun") : "")
    + (k ? cel("Stopul promis " + k.cos, cnPct(k.promis) + " ⇒ " + cnPct(k.venit), "promis ⇒ venit (" + cnPct(k.lo) + "–" + cnPct(k.hi) + "), " + cnCate(k.n, "pornire", "porniri") + (b && b.calibrare && b.calibrare.indexOf(k) >= 0 ? ", ofertele de acum înainte" : ", pe istoric"), Math.abs(k.venit - k.promis) >= 0.1 ? " cnAtent" : "") : "")
    + "</div>";
}
function cnCap(titlu, sub, id) { return '<div class="cnBlocCap"><h3 id="' + id + '">' + cnEsc(titlu) + "</h3>" + (sub ? '<span class="cnMut cnMic">' + cnEsc(sub) + "</span>" : "") + "</div>"; }
function cnLat() { var e = typeof document !== "undefined" && document.getElementById ? document.getElementById("cnPagina") : null; return Math.max(300, Math.floor((e && e.clientWidth) || 900) - 34); }
function cnLatJ() { var l = cnLat(); return typeof window !== "undefined" && window.innerWidth >= 1024 ? Math.floor((l - 16) / 2) : l; }
// textul unei întrebări pe analiza nouă (media pe cazuri cu intervalul), cu starea regulii fixate înainte
function cnTextAlegere(v, vechi) {
  if (!v || !v.aleasaVsCealalta || v.aleasaVsCealalta.medie == null) return Carnet.textAlegere(vechi);
  return "Când am ales ÎNGUST sau LARG, varianta aleasă a ieșit cu " + cnP1(v.aleasaVsCealalta.medie) + " față de cealaltă, pe 3 zile (" + cnCate(v.perechi, "caz", "cazuri") + ", media pe cazuri, " + cnIv(v.aleasaVsCealalta) + "; " + Carnet.stareText(vechi && vechi.stare) + "). Față de „mereu LARG”: " + cnP1(v.vsLarg.medie) + " (" + cnIv(v.vsLarg) + ").";
}
function cnTextAsteapta(v, vechi) {
  var A = v && v.asteapta; if (!A || !A.net || A.net.medie == null || A.netRest.medie == null) return Carnet.textAsteapta(vechi);
  return "Când am zis „aș aștepta” (" + cnCate(A.n, "caz", "cazuri") + "), pornirea a ieșit cu " + cnP1(A.net.medie) + " pe 3 zile, față de " + cnP1(A.netRest.medie) + " când n-am zis (" + Carnet.stareText(vechi && vechi.stare) + "); stopul a venit în " + cnPct(A.stop.medie) + " din porniri, față de " + cnPct(A.stopRest.medie) + ".";
}
function cnColoana(titlu, h) { return '<div class="cnCol"><h4>' + cnEsc(titlu) + "</h4>" + h + "</div>"; }
function carnetHtml(r, acum) {
  var cap = '<header class="cnCapPag sectionHead"><div><h2 class="cnH1">📒 Carnetul fișei</h2><p class="cnMut cnMic">a avut fișa dreptate? · pe istoric și de acum înainte</p></div><div class="cnCapBtn"><button class="acBtn actionGhost" type="button" data-action-click="carnetPorneste(true)">↻ Reîmprospătează</button><button class="acBtn sugTemaBtn" type="button" id="cnTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă deschisă</button></div></header>';
  if (!r || !r.rejoc) return cap + '<p class="tbSub">Carnetul se face noaptea, în laboratorul colectorului (o dată pe zi). Încă nu există: revino după prima lui tură.</p>';
  acum = acum || Date.now();
  var ore = Math.round((acum - r.la) / 3600000), rj = r.rejoc, ina = r.inainte || {}, qa = rj.intrebari || {}, qi = ina.intrebari || {}, a = r.v2 && r.v2.rejoc, b = ina.v2, G = typeof CnGrafice !== "undefined" ? CnGrafice : null;
  var h = cap + '<p class="tbSub rlLa">Carnetul de la ' + cnOra(r.la) + (ore > 30 ? " · vechi (de acum " + cnCate(ore, "oră", "ore") + "): laboratorul îl reface noaptea, între 05:00 și 09:00" : " · se reface în fiecare noapte, între 05:00 și 09:00") + (carnetStare.eroare ? " · " + cnEsc(carnetStare.eroare) : "") + ".</p>";
  var F = cnFraza(r);
  h += '<div class="cnFrazaBox grFrazaBox"><p class="grFraza">' + cnEsc(F.fr) + '</p><p class="grFrazaSub">' + cnEsc(F.sub) + '</p><details class="grSurse"' + (carnetStare.surse ? " open" : "") + "><summary>De unde știu</summary><ul>" + cnSurse(r).map(function (x) { return "<li>" + cnEsc(x) + "</li>"; }).join("") + "</ul></details></div>";
  h += cnCifre(r);
  // alegerea ÎNGUST / LARG
  var lj = cnLatJ(), pm = G && a ? G.peMonede(a.peMonede, { lat: lj, min: 5 }) : null, pmB = G && b && b.peMonede ? G.peMonede(b.peMonede, { lat: lj, min: 5 }) : null;
  var niv = function (v) { return v && v.niveluri ? [{ et: "varianta aleasă", medie: v.niveluri.aleasa.medie, lo: v.niveluri.aleasa.lo, hi: v.niveluri.aleasa.hi, n: v.niveluri.aleasa.n }, { et: "cealaltă variantă", medie: v.niveluri.cealalta.medie, lo: v.niveluri.cealalta.lo, hi: v.niveluri.cealalta.hi, n: v.niveluri.cealalta.n }, { et: "mereu LARG", medie: v.niveluri.larg.medie, lo: v.niveluri.larg.lo, hi: v.niveluri.larg.hi, n: v.niveluri.larg.n }] : []; };
  h += '<section class="cnBloc" id="cnSAlegere" aria-labelledby="cn-h-al">' + cnCap("Alegerea ÎNGUST / LARG", "față de „mereu LARG” · media pe cazuri, intervalul pe blocuri de 3 zile", "cn-h-al") + '<div class="cnDoua">'
    + cnColoana("Pe istoric", '<p class="tbSub">' + cnEsc(cnCate(rj.n, "caz", "cazuri") + " pe " + cnCate(rj.monede, "monedă", "monede") + ": o pornire pe zi, long și short, fiecare urmărită 3 zile; fișa a văzut doar barele de dinainte de pornire.") + "</p>" + cnRand(cnTextAlegere(a, qa.alegere)))
    + cnColoana("De acum înainte", (ina.judecate || 0) < 30 ? cnRand("Ofertele judecate: " + (ina.judecate || 0) + " din 30 - încă nu spune nimic; verdictele apar pe măsură ce trec cele 3 zile.") : cnRand(cnTextAlegere(b, qi.alegere)))
    + "</div>" + '<div class="cnCon"><span class="cnFac">👉 ' + cnEsc(Carnet.concluzie(qa)) + "</span></div>";
  if (G && a) {
    h += '<div class="cnGrGrila"><div class="cnGr"><h5>Ambele variante, nu doar diferența</h5><p class="cnMut cnMic">rezultatul mediu pe 3 zile, din marjă, cu intervalul · pe istoric</p>' + G.bare(niv(a), { lat: lj, eticheta: "Rezultatul mediu al variantelor, pe istoric" }) + (b ? '<p class="cnMut cnMic">de acum înainte</p>' + G.bare(niv(b), { lat: lj, eticheta: "Rezultatul mediu al variantelor, de acum înainte" }) : "") + "</div>"
      + '<div class="cnGr"><h5>Alegerea față de „mereu LARG”, pe blocuri de 3 zile</h5><p class="cnMut cnMic">bara = blocul; linia și banda = media cu intervalul · sub zero, alegerea a ieșit mai prost · pe istoric</p>' + G.blocuri(a.blocuri, a.vsLarg, { lat: lj }) + (b && b.blocuri ? '<p class="cnMut cnMic">de acum înainte</p>' + G.blocuri(b.blocuri, b.vsLarg, { lat: lj }) : "") + "</div></div>";
    h += '<div class="cnGrGrila"><div class="cnGr"><h5>Pe fiecare monedă (pe istoric)</h5><p class="cnMut cnMic">aleasă − cealaltă, cu câte perechi are moneda; doar monedele cu cel puțin 5</p>' + (pm ? pm.svg : "") + "</div>"
      + (pmB ? '<div class="cnGr"><h5>Pe fiecare monedă (de acum înainte)</h5><p class="cnMut cnMic">' + cnEsc(pmB.ascunse ? cnCate(pmB.ascunse, "monedă are", "monede au") + " sub 5 perechi și nu apar" : "toate monedele au cel puțin 5 perechi") + "</p>" + pmB.svg + "</div>" : "") + "</div>";
  }
  h += "</section>";
  // „aș aștepta”
  h += '<section class="cnBloc" id="cnSAstept" aria-labelledby="cn-h-ast">' + cnCap("„Aș aștepta”", "rezultatul și cât de des a venit stopul", "cn-h-ast") + '<div class="cnDoua">'
    + cnColoana("Pe istoric", cnRand(cnTextAsteapta(a, qa.asteapta))) + cnColoana("De acum înainte", (ina.judecate || 0) < 30 ? "" : cnRand(cnTextAsteapta(b, qi.asteapta))) + "</div>";
  if (G && a && a.asteapta && a.asteapta.stop.medie != null) {
    var rows = [{ et: "„aș aștepta” · istoric", medie: a.asteapta.stop.medie, lo: a.asteapta.stop.lo, hi: a.asteapta.stop.hi, n: a.asteapta.n, ton: "jgAtent" }, { et: "celelalte · istoric", medie: a.asteapta.stopRest.medie, lo: a.asteapta.stopRest.lo, hi: a.asteapta.stopRest.hi, n: a.asteapta.rest, ton: "jgNeutru" }];
    if (b && b.asteapta && b.asteapta.stop && b.asteapta.stop.medie != null) rows.push({ et: "„aș aștepta” · înainte", medie: b.asteapta.stop.medie, lo: b.asteapta.stop.lo, hi: b.asteapta.stop.hi, n: b.asteapta.n, ton: "jgAtent" }, { et: "celelalte · înainte", medie: b.asteapta.stopRest.medie, lo: b.asteapta.stopRest.lo, hi: b.asteapta.stopRest.hi, n: b.asteapta.rest, ton: "jgNeutru" });
    h += '<div class="cnGr"><h5>Cât de des a venit stopul</h5><p class="cnMut cnMic">când fișa a zis „aș aștepta” față de restul, cu intervalul pe blocuri de 3 zile</p>' + G.bare(rows, { lat: cnLat(), procent: true, eticheta: "Cât de des a venit stopul: aș aștepta față de restul" }) + "</div>";
  }
  h += "</section>";
  // stopul promis
  h += '<section class="cnBloc" id="cnSStop" aria-labelledby="cn-h-stop">' + cnCap("Stopul promis față de cel venit", "pe coșuri, cu intervalul", "cn-h-stop") + '<div class="cnDoua">'
    + cnColoana("Pe istoric", cnCalibrare(a && a.calibrare || rj.calibrare)) + cnColoana("De acum înainte", (ina.judecate || 0) < 30 ? "" : cnCalibrare(b && b.calibrare || ina.calibrare)) + "</div>";
  if (G && a) h += '<div class="cnGr"><h5>Promis (orizontal) și venit (vertical)</h5><p class="cnMut cnMic">pe linia punctată ar fi exact cât promite · <span class="cnKey cnKPlin"></span> pe istoric · <span class="cnKey cnKGol"></span> de acum înainte · mustățile = intervalul</p>' + G.calib(a.calibrare, b && b.calibrare, { lat: cnLat() }) + "</div>";
  h += "</section>";
  // de acum înainte
  h += '<section class="cnBloc" id="cnSOferte" aria-labelledby="cn-h-of">' + cnCap("De acum înainte", "ofertele notate și cât ar dura să aflăm", "cn-h-of")
    + '<p class="tbSub">' + cnEsc(cnCate(ina.oferte || 0, "ofertă notată", "oferte notate").replace(/^\d+/, function (n) { return cnMii(n); }) + " (laboratorul, zilnic, și fișa ta): judecate " + cnMii(ina.judecate || 0) + ", așteaptă cele 3 zile " + cnMii(ina.asteapta || 0)
      + (ina.nejudecabile ? ", nu se pot judeca " + cnMii(ina.nejudecabile) + " (vechi sau fără grile, ori fără barele de la ofertă)" : "") + ". Toate ofertele se păstrează (nu doar 120 de zile), ca dovada să se adune.") + "</p>"
    + ((ina.judecate || 0) < 30 ? "" : cnRand(Carnet.textVerdictFisa(ina.fisa)));
  if (G) h += '<div class="cnGr"><h5>Cât ar dura să aflăm</h5><p class="cnMut cnMic">șansa ca regula „dovedit” să prindă un efect de +0,5 % sau +1 % pe 3 zile, după câte zile de oferte (măsurat ' + cnEsc(G.PUTERE.la) + "); re-jocul de pe istoric are mereu ~30 de zile: " + cnPct(G.PUTERE.rejoc[0]) + " / " + cnPct(G.PUTERE.rejoc[1]) + "</p>" + G.putere(b && b.zile, { lat: cnLat() }) + "</div>";
  h += "</section>";
  // cum am socotit
  h += '<section class="cnBloc" id="cnSMetoda" aria-labelledby="cn-h-met">' + cnCap("Cum am socotit (regula fixată înainte de cifre)", "", "cn-h-met") + '<details class="rlMetoda" open><summary>Cum am socotit (regula fixată înainte de cifre)</summary><ul>'
    + ["Rezultatul unei variante = simulatorul fișei pe 3 zile de la pornire, după comisioane; ce rămâne deschis se socotește la prețul de la capăt.",
      "Alegerea: pe fiecare pornire, varianta aleasă față de cealaltă, pe aceleași bare (când sunt la fel sau fișa zice „aștept”, nu intră).",
      "Dovedit = două teste trec amândouă sub 1%: pe monede (diferența pe fiecare monedă, semnele întoarse la întâmplare) și pe timp (diferența în fiecare bloc de 3 zile, la fel), plus același semn în ambele jumătăți de timp; la limită = sub 5%; sub 30 de cazuri pe o parte, sub 8 monede sau sub 8 blocuri = prea puține.",
      "De ce două teste: pornirile din aceeași monedă se suprapun, iar toate monedele trec prin aceeași piață. Măsurat pe date fără niciun efect: bootstrap-ul vechi dădea „dovezi” false în 3,5% din cazuri, testul doar pe monede în 15–40% când monedele se mișcă împreună, amândouă testele în ~1%.",
      "Verificat din nou pe 18.11.2026, pe structura re-jocului: amândouă testele dau „dovedit” fals în 1,3–3,1 % din cazuri (nu 1 %), „la limită” în 5,8–6,8 %; p-ul se mișcă mult după ora pornirilor. De aceea pagina arată și media cu intervalul, nu doar starea.",
      "Fișa din re-joc e aceeași ca pe pagină (levierul sigur inclus), cu o diferență: barele de 4 ore și de o zi vin din cele 30 de zile de 15 minute, nu de la Pionex.",
      "Ce nu prinde re-jocul: trendul zilnic (cere 55 de zile, re-jocul are 31), monedele sunt cele de azi (nu cele de atunci) și simularea nu ține cont de funding - stopul pe istoric vine cu câteva puncte mai des decât pe ofertele noi.",
      "Stopul promis al fișei tale e socotit fără lichidări (fereastra salvată nu le are); la laborator le cuprinde.",
      "„Pornește / aștept” depinde de semafor și de piața de atunci, deci nu se poate re-juca: se judecă doar pe ofertele de acum înainte."].map(function (t) { return "<li>" + cnEsc(t) + "</li>"; }).join("") + "</ul></details></section>";
  return h;
}
// v100.362: rândurile pliate - aceeași formă ca paginile refăcute (data-rand + data-titlu + data-rezumat), starea în „cnRanduri”
var CN_RAND_KEY = "cnRanduri", CN_RANDURI = { cnSAlegere: "Alegerea ÎNGUST / LARG", cnSAstept: "„Aș aștepta”", cnSStop: "Stopul promis față de cel venit", cnSOferte: "De acum înainte", cnSMetoda: "Cum am socotit" }, CN_RAND_DESCHIS = { cnSAlegere: 1, cnSStop: 1 };
function cnRandStare() { try { var o = JSON.parse(localStorage.getItem(CN_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function cnRandAplica() {
  var st = cnRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
  Object.keys(CN_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && !!CN_RAND_DESCHIS[id]);
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", CN_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, CN_RANDURI[id]) : "");
  });
}
function cnRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(CN_RANDURI, id)) return; var st = cnRandStare(), acum = st[id] === true || (st[id] !== false && !!CN_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(CN_RAND_KEY, JSON.stringify(st)); } catch (e) {} cnRandAplica();
}
function carnetDeseneaza() {
  var el = typeof document !== "undefined" && document.getElementById("cnPagina"); if (!el) return;
  var sd = el.querySelector && el.querySelector(".cnFrazaBox details.grSurse"); if (sd) carnetStare.surse = !!sd.open;
  el.innerHTML = carnetStare.eroare && !carnetStare.raport ? carnetHtml(null).replace(/<p class="tbSub">Carnetul se face[^<]*<\/p>/, "") + '<p class="tbSub">' + cnEsc(carnetStare.eroare) + "</p>" : carnetHtml(carnetStare.raport);
  cnRandAplica(); if (typeof tbTemaAplica === "function") tbTemaAplica();
}
// încercarea se notează ÎNAINTE de cerere (o dată pe minut fără raport, la 10 min cu raport) - fișa o cheamă la fiecare deschidere a Gridului
async function carnetPorneste(fortat) {
  carnetDeseneaza();
  if (carnetStare.inLucru || (!fortat && Date.now() - carnetStare.la < (carnetStare.raport ? 10 * 60000 : 60000))) return;
  carnetStare.inLucru = true; carnetStare.la = Date.now();
  var inainte = carnetStare.raport ? carnetStare.raport.la : null;
  try { var d = await getJSON("/api/istoric-bot?action=carnet"); carnetStare.raport = d && d.carnet || null; carnetStare.eroare = null; }
  catch (e) { carnetStare.eroare = "N-am putut citi carnetul: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }   // v100.362: cu raport vechi, eroarea se spune în rândul de sus
  finally { carnetStare.inLucru = false; }
  carnetDeseneaza();
  // revizia (M6): rândul de sub „Ce aș alege eu” apare și la prima deschidere a Gridului - fișa se redesenează când vine carnetul (o dată)
  try { var g = document.getElementById("gridset"); if (carnetStare.raport && carnetStare.raport.la !== inainte && g && g.classList.contains("on") && typeof renderGrid === "function") renderGrid(); } catch (e) {}
}
