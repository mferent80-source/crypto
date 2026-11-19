// v100.120 (el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca pe cele din Trading 212”): pagina „Salt” - pozițiile scrise de el
// (Salt n-are API) cu analiza de la T212 (Salt.analizeaza), formularul, listele pe instrumentele Salt (raportul de la 8:00) și tabelul tuturor.
// v100.125 (el 07.10: „pagina salt vreau să o aduci la nivelul app” → „Ca Trading 212” → OK pe demo): același schelet ca pagina T212 și
// aceleași clase (t212Kpi, t212Todo, t212Tab, t212Pill): cifrele de sus în EUR (cum plătește la Salt, ≈ lei), „Ce ai de făcut acum”, ideile
// de cumpărare cu ACEEAȘI poartă ca la T212 (Idei.judecaActiune, în tura Salt a colectorului) + Biletul, pozițiile în tabel cu detaliile la
// clic, „Vreau să cumpăr…”, portofoliul, toate instrumentele pliate. Rezultatul în EUR la cursul de azi (la NFLX intră și cursul dolarului).
// saltHtml e fără DOM (probele o rulează în vm); saltPorneste aduce universul, raportul, pozițiile, barele, cursurile și indicii pentru beta.
// revizia (C2): „incarcate” - până nu se citesc pozițiile de pe server, formularul e blocat (altfel „Adaugă” ar scrie lista goală peste cea bună)
// v100.365 (el 19.11: Salt „ca Jurnalul”, după auditul cu 2 revizori): capul cu tema și vârsta raportului, fraza + „De unde știu”, 3 cifre, rânduri
// pliate (SL_RANDURI), dovada cu 4 grafice; ideile spuse cinstit (filtru de trend, nu „+Z % în medie”), listele față de aceeași zi; bugurile B2–B4,
// B10–B13 reparate. Id-urile citite din afară rămân: saltPagina, saltSus, saltPozBox (asezare-paznic), saltStare (Monte Carlo), saltBandaHtml / saltAcasaHtml.
var saltStare = { d: { univers: null, raport: null, pozitii: [], analize: {}, filtru: "", incarcate: false, eroare: null, eurRon: null, fila: null, deschis: {}, bilet: {}, verif: null }, la: 0, inLucru: false, fx: {}, indici: {} };
var SALT_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], asteapta: ["AȘTEAPTĂ", "t212Pill-fara"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
// beta față de indicele pieței simbolului (prin ETF-uri: serverul nu primește indicii cu „^”); fără indice ⇒ beta 1, ca la T212
var SALT_INDICE = { EUR: { sim: "EXS1.DE", nume: "DAX" }, USD: { sim: "QQQ", nume: "Nasdaq" } };
function saltEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function saltArg(s) { return saltEsc(String(s == null ? "" : s).replace(/[\\'"]/g, "\\$&")); }   /* v100.272: argument text într-o acțiune din atribut - întâi escaparea șirului JS, apoi cea HTML (ca argActiune din app.js) */
function saltBani1(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"; }   // rezultatele: o zecimală
function saltBani(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"; }
function saltP1(x) { var n = Number(x); if (x == null || !isFinite(n)) return "—"; var r = Math.round(n * 1000) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1).replace(".", ",") + " %"; }
function saltCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
function saltSim(s) { return String(s || "").replace(/\.[A-Z]+$/, ""); }   // RHM.DE ⇒ RHM
function saltMon(m) { return m === "GBp" ? "p" : saltEsc(m || ""); }   // revizia (R3): moneda din raport intră în innerHTML
function saltPret(v, m) { return v == null || !isFinite(Number(v)) ? "—" : saltBani(v) + (m ? " " + saltMon(m) : ""); }
function saltSemn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
function saltSuma1(v, m) { return v == null || !isFinite(v) ? "—" : saltSemn(Math.round(v * 10) / 10) + saltBani1(Math.abs(v)) + " " + saltMon(m || "EUR"); }
function saltLei(v) { return v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString("ro-RO") + " lei"; }
// v100.255: aceeași regulă ca t212Bucati. Sub 10, în moneda instrumentului, bucăți întregi; de la 10 în sus, 3 zecimale. Salt se încarcă singur.
function saltBucati(bucati, pret) { var n = Number(bucati) || 0; return (Number(pret) < 10 ? Math.round(n).toLocaleString("ro-RO") : (+n.toFixed(3)).toLocaleString("ro-RO")) + " buc"; }
function saltCls(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
// textele Consilierului au prețurile cu „$” (ca pe T212): aici în moneda simbolului, cu mii („$1109.08” ⇒ „1.109,08 EUR”)
// v100.306 (revizia, 🔴): ActiuniSemnale.usd() scrie acum ca restul paginii („$25,17”, „$1.234,56”) ⇒ cu virgulă = format românesc (punctul
// = mii); fără virgulă = textele vechi („$1109.08”, punctul = zecimale). Regex-ul vechi lua virgula drept mii: „$25,17” ⇒ 2.517 EUR.
function saltNumarUsd(n) { return n.indexOf(",") >= 0 ? Number(n.replace(/\./g, "").replace(",", ".")) : Number(n); }
function saltInMoneda(t, m) { return String(t == null ? "" : t).replace(/\$(\d[\d.,]*\d|\d)/g, function (_, n) { return saltPret(saltNumarUsd(n), m); }); }

// ---------------- v100.365 (el 19.11: Salt „ca Jurnalul”) ----------------
// capul cu vârsta raportului, fraza + „De unde știu”, cele 3 cifre, rândurile pliate (SL_RANDURI), dovada (graficele); procentele cu spațiu.
function saltPct0(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + " %"; }
function saltData(t) { var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear(); }
function saltOra(t) { var d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
// B10 (auditul): prețul mediu scris rămâne exact; cantitatea urmează regula Salt din v100.255 (sub prețul 10, bucăți întregi)
function saltQtyExact(q) { var n = Number(q); return isFinite(n) ? n.toLocaleString("ro-RO", { maximumFractionDigits: 6 }) : "—"; }
function saltPretExact(v, m) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + (m ? " " + saltMon(m) : "") : "—"; }
function saltLat() { var e = typeof document !== "undefined" && document.getElementById ? document.getElementById("saltPagina") : null; return Math.max(300, Math.floor((e && e.clientWidth) || 900) - 34); }
function saltLatJ() { var l = saltLat(); return typeof window !== "undefined" && window.innerWidth >= 1024 ? Math.floor((l - 16) / 2) : l; }
// B8: data și vârsta raportului; prețurile din raport = închiderile de la ora lui (la bursele europene, cea de ieri)
function saltVarstaHtml(d, acum) {
  var r = d.raport; acum = acum || Date.now();
  if (!r || !r.la) return '<p class="tbSub rlLa" id="saltVarsta">' + saltEsc(d.incarcate ? "Raportul Salt îl face colectorul o dată pe zi, după 08:00 (după ideile Trading 212); încă nu există." : "Aștept datele Salt…") + "</p>";
  var ore = Math.round((acum - r.la) / 3600000);
  return '<p class="tbSub rlLa" id="saltVarsta">' + saltEsc("Raportul din " + saltData(r.la) + ", ora " + saltOra(r.la) + (ore > 30 ? " · vechi (de acum " + saltCate(ore, "oră", "ore") + "): colectorul nu l-a refăcut" : "")
    + " · prețurile din raport = ultima închidere a fiecărei burse la ora raportului; la poziții, prețul de acum (Yahoo, ~15 min întârziere)" + (saltStare.la ? " · citit la " + saltOra(saltStare.la) : "")) + "</p>";
}
function saltFraza(d, R) {
  var r = d.raport, idei = r && Array.isArray(r.idei) ? r.idei : null, D = typeof SaltDovezi !== "undefined" ? SaltDovezi : null, cu = R.l.filter(function (x) { return x.val !== null; });
  var fr, sub = "", poarta = idei ? "azi " + idei.length + " din " + saltCate(r.judecate || 0, "instrument", "instrumente") + " trec de poarta ideilor - un filtru de trend, nu o idee dovedită" : "";
  if (R.l.length) {
    var rez = 0; cu.forEach(function (x) { rez += x.rez || 0; });
    var ies = R.l.filter(function (x) { return x.a && x.a.cons && x.a.cons.nivel === "iesi"; }).map(function (x) { return saltSim(x.p.simbol); }), fd = R.l.filter(function (x) { return !x.p.de; }).length;
    fr = saltCate(R.l.length, "poziție", "poziții") + " la Salt" + (cu.length ? ", " + saltSuma1(rez) + " pe deschise" : "") + (ies.length ? "; de ieșit: " + ies.join(", ") : "; nimic de ieșit acum") + ".";
    if (fd) sub += saltCate(fd, "poziție n-are", "poziții n-au") + " data cumpărării: la ele alerta de stop nu poate suna. ";
    if (poarta) sub += poarta.charAt(0).toUpperCase() + poarta.slice(1) + ". ";
  } else fr = "N-ai nicio poziție Salt scrisă" + (poarta ? "; " + poarta : "") + ".";
  if (idei && D) sub += "Pe un an, față de restul listei Salt în aceleași zile, ideile au făcut " + saltP1(D.idei.medie) + " pe 20 de zile (" + saltP1(D.idei.lo) + " … " + saltP1(D.idei.hi) + ") - nedovedit; pe drumuri fără niciun avantaj ar trece oricum ~" + Math.round(D.h0.medie) + ". ";
  var u = r && r.urmarire; if (u && typeof Salt !== "undefined" && Salt.textUrmarire) sub += Salt.textUrmarire(u, Date.now());
  return { fr: fr, sub: sub.trim() };
}
function saltSurse() {
  var D = typeof SaltDovezi !== "undefined" ? SaltDovezi : null;
  return ["Salt n-are API: pozițiile sunt cele scrise de tine; prețurile vin de la Yahoo (bursa principală a simbolului, în moneda ei), cu ~15 minute întârziere și un cache de 30 de minute pe server.",
    "Raportul (ideile, listele, tabelul) îl face colectorul o dată pe zi, după 08:00, după ideile Trading 212. Prețurile din el sunt ultimele închideri de la ora raportului; până la v100.365 bursele europene veneau cu închiderea de alaltăieri (reparat).",
    "Poarta ideilor e cea de la Trading 212 (trend în sus pe zilnice, nu după o zi mare și nu la maximul pe 7 zile, iar pe ultimul an intrările în aceeași direcție de trend au ieșit pe plus), dar fără regimul pieței (care la Trading 212 oprește cumpărarea) și fără data rezultatelor trimestriale.",
    "„Pe istoricul ei” = ultimul an, aceeași direcție de trend, 20 de zile; zilele se suprapun (cam un caz independent la 20 de zile) și multiplul stopului e ales pe aceleași date, deci cifra e optimistă. Măsurat" + (D ? " pe " + D.la : "") + ": media „în starea asta” promitea +4,1 % pe 20 de zile și a venit ~+0,7 % - de aceea nu o mai arăt.",
    "🎲 „Ținta înaintea stopului” și „stopul mâine” sunt socotite de la intrare și au ieșit calibrate în medie (ținta în 5 zile: 2,1 % promis, 2,2 % venit); unde promiteau peste 30 %, au venit mai rar. 📐 „Coborârea obișnuită” e cea depășită o săptămână din 4; măsurat, e depășită cam o săptămână din 3, iar „stopul e în afara ei” apare la aproape toate ideile.",
    "Stopul ideii: la ~1 din 5 idei e plafonul de 15 %, nu ce a ieșit din probă; la ~3 din 4 idei intrarea e un ordin limită sub prețul de acum.",
    "Stopul care urcă, la poziții: 15 % sub maximul de după data cumpărării. Fără data cumpărării nu există maxim: stopul fuge după preț și alerta pe Discord nu poate suna. Pagina socotește și cu bara zilei în curs, alertele doar cu bare închise.",
    "Rezultatul pozițiilor e în EUR la cursul de azi: la plata în EUR intră și cursul; la plata în moneda simbolului, „plătit” e costul la cursul de azi, fără efectul cursului.",
    "Listele (început de urcare, revers timpuriu, pe revenire) sunt judecate față de celelalte instrumente Salt în aceleași zile, pe 10 zile, cu intervalul pe blocuri de 4 săptămâni. Lista e cea de azi (ce a ieșit din Salt lipsește din istoric, deci cifrele ies mai bune), iar istoricul revenirii cumpără la închiderea zilei semnalului, un preț pe care nu-l prinzi.",
    "Costurile Salt (comision, spread, curs) nu sunt în cifre: la ~0,6 % dus-întors, avantajul de " + (D ? saltP1(D.idei.medie) : "+0,4 %") + " al ideilor devine ~" + (D ? saltP1(D.cost.net) : "−0,2 %") + "; zgomotul cursului EUR/USD pe 20 de zile (~1,8 %) e mai mare decât avantajul."];
}
function saltFrazaHtml(d, R) {
  var F = saltFraza(d, R), sd = saltStare.surse ? " open" : "";
  return '<div class="cnFrazaBox grFrazaBox" id="saltFraza"><p class="grFraza">' + saltEsc(F.fr) + '</p>' + (F.sub ? '<p class="grFrazaSub">' + saltEsc(F.sub) + "</p>" : "")
    + '<details class="grSurse"' + sd + "><summary>De unde știu</summary><ul>" + saltSurse().map(function (x) { return "<li>" + saltEsc(x) + "</li>"; }).join("") + "</ul></details></div>";
}
function saltCifreHtml(d, R) {
  var r = d.raport, idei = r && Array.isArray(r.idei) ? r.idei : null, D = typeof SaltDovezi !== "undefined" ? SaltDovezi : null, u = r && r.urmarire;
  var cel = function (et, cifra, sub, ton) { return '<div class="cnCifra"><span class="cnEt">' + saltEsc(et) + '</span><b class="cnMare' + (ton || "") + '">' + saltEsc(cifra) + '</b><span class="cnMut cnMic">' + saltEsc(sub) + "</span></div>"; };
  var h = '<div class="cnCifre" id="saltCifre">';
  if (R.l.length) {
    var cu = R.l.filter(function (x) { return x.val !== null; }), rez = 0, cost = 0, pe = 0; cu.forEach(function (x) { rez += x.rez || 0; cost += x.cost || 0; if (x.rez > 0) pe++; });
    var sub = R.l.filter(function (x) { return x.a && x.a.niv && x.pret !== null && x.pret < x.a.niv.stopPozitie; });
    h += cel("Ce ai la Salt", cu.length ? saltBani1(R.tot) + " EUR" : "—", (d.eurRon > 0 && cu.length ? "≈ " + saltLei(R.tot * d.eurRon) + " · " : "") + saltCate(R.l.length, "poziție", "poziții"))
      + cel("Pe pozițiile deschise", cu.length ? saltSuma1(rez) : "—", cost > 0 ? saltP1(rez / cost) + " · " + pe + " din " + cu.length + " pe plus" : "", rez < 0 ? " cnAtent" : rez > 0 ? " cnBun" : "")
      + cel("Sub stopul care urcă", String(sub.length), sub.length ? sub.map(function (x) { return saltSim(x.p.simbol); }).join(", ") : "niciuna", sub.length ? " cnAtent" : "");
  } else {
    h += cel("Idei azi", idei ? idei.length + " din " + (r.judecate || 0) : "—", D ? "pe drumuri fără avantaj ar trece ~" + Math.round(D.h0.medie) + " (" + D.h0.lo + "–" + D.h0.hi + ")" : "")
      + cel("Ideile față de restul listei", D ? saltP1(D.idei.medie) : "—", D ? "pe 20 de zile, pe un an (" + saltP1(D.idei.lo) + " … " + saltP1(D.idei.hi) + ") · nedovedit" : "")
      + cel("Urmărirea pe viu", u && u.deLa ? "din " + u.deLa.slice(8, 10) + "." + u.deLa.slice(5, 7) : "pornește la tura de mâine", u && u.judecate ? saltCate(u.judecate, "zi judecată", "zile judecate") : u && u.primaJudecataZi ? "prima judecată pe " + u.primaJudecataZi.slice(8, 10) + "." + u.primaJudecataZi.slice(5, 7) + "." + u.primaJudecataZi.slice(0, 4) : "registrul zilnic al ideilor");
  }
  return h + "</div>";
}
function saltBloc(id, titlu, sub, corp) {
  return '<section class="cnBloc" id="' + id + '"' + (titlu ? ' aria-labelledby="' + id + '-h"><div class="cnBlocCap"><h3 id="' + id + '-h">' + saltEsc(titlu) + "</h3>" + (sub ? '<span class="cnMut cnMic">' + saltEsc(sub) + "</span>" : "") + "</div>" : ">") + corp + "</section>";
}
// dovada: cele 4 grafice alese de el (promis față de venit, ideile față de aceeași zi + urmărirea, câte ar trece din noroc, listele față de aceeași zi)
function saltDovadaHtml(d) {
  var r = d.raport || {}, D = typeof SaltDovezi !== "undefined" ? SaltDovezi : null, G = typeof CnGrafice !== "undefined" ? CnGrafice : null, SG = typeof SaltGrafice !== "undefined" ? SaltGrafice : null, lj = saltLatJ(), u = r.urmarire, h = "";
  if (!D || !G) return '<p class="tbSub">Graficele nu s-au încărcat.</p>';
  var rows = []; D.calibrare.forEach(function (c) { rows.push({ et: "scor " + c[0] + " · promis", medie: c[1], n: c[5], ton: "jgNeutru" }, { et: "scor " + c[0] + " · venit", medie: c[2], lo: c[3], hi: c[4], n: c[5] }); });
  h += '<div class="cnGrGrila"><div class="cnGr"><h5>„+Z % în medie”: cât a promis și cât a venit</h5><p class="cnMut cnMic">pe 5 coșuri de scor (1 = cel mai mic), pe 20 de zile, cu intervalul · măsurat pe ' + saltEsc(D.la) + " pe un an refăcut zi de zi (" + saltEsc(D.zileIstoric) + " de zile) · pe plus: promis " + saltPct0(0.62) + ", venit " + saltPct0(0.47) + "</p>"
    + G.bare(rows, { lat: lj, eticheta: "Promis față de venit, pe coșuri de scor" }) + "</div>";
  h += '<div class="cnGr"><h5>Ideile față de restul listei Salt, în aceleași zile</h5><p class="cnMut cnMic">bara = media unui bloc de 4 săptămâni; linia și banda = media cu intervalul (' + saltEsc(saltP1(D.idei.lo) + " … " + saltP1(D.idei.hi)) + ") · pe istoric, 20 de zile · nedovedit</p>"
    + G.blocuri(D.blocuri.map(function (b) { return { t: b[0], dif: b[1], n: b[2] }; }), D.idei, { lat: lj, eticheta: "Ideile față de restul listei Salt, pe blocuri de 4 săptămâni", unit: "de zile" })
    + (u && u.serie && u.serie.length ? '<p class="cnMut cnMic">pe viu, din ' + saltEsc(u.deLa) + "</p>" + G.blocuri(u.serie.map(function (b) { return { t: b.t, dif: b.m, n: b.n }; }), u, { lat: lj, eticheta: "Ideile urmărite pe viu, pe blocuri de 4 săptămâni", unit: "de zile" }) : "")
    + '<p class="cnRasp">' + saltEsc(typeof Salt !== "undefined" && Salt.textUrmarire ? Salt.textUrmarire(u, Date.now()) : "") + "</p></div></div>";
  var nr = D.h0.faraDrift.filter(function (v) { return v >= D.h0.real; }).length;
  h += '<div class="cnGrGrila"><div class="cnGr"><h5>Câte ar trece poarta din noroc</h5><p class="cnMut cnMic">' + saltEsc(D.h0.faraDrift.length + " de lumi fără niciun avantaj (aceeași agitație, fără tendință): în medie ~" + Math.round(D.h0.medie) + " trec (" + D.h0.lo + "–" + D.h0.hi + "); în " + nr + " din " + D.h0.faraDrift.length + " trec cel puțin " + D.h0.real + ", câte au trecut în ziua măsurată") + "</p>"
    + (SG ? SG.h0(D.h0.faraDrift, D.h0.real, { lat: lj }) : "") + "</div>";
  var dv = r.dovada || {}, L = [["urcare", "început de urcare"], ["revers", "revers timpuriu"], ["revine", "pe revenire"]], lr = [], tx = [];
  L.forEach(function (k) { var z = dv[k[0]] && dv[k[0]].zi; if (z && z.medie != null) lr.push({ et: k[1], medie: z.medie, lo: z.lo, hi: z.hi, n: z.n }); if (dv[k[0]] && dv[k[0]].textZi) tx.push(dv[k[0]].textZi); });
  h += '<div class="cnGr"><h5>Listele față de restul listei Salt, în aceleași zile</h5><p class="cnMut cnMic">pe 10 zile după semnal, cu intervalul pe blocuri de 4 săptămâni · lista e cea de azi</p>'
    + (lr.length ? G.bare(lr, { lat: lj, eticheta: "Listele față de aceeași zi" }) : '<p class="cnRasp">' + saltEsc(r.la ? "Listele se judecă față de aceeași zi de la tura colectorului de mâine (raportul de azi e făcut înainte de v100.365)." : "Aștept raportul.") + "</p>")
    + tx.map(function (t) { return '<p class="cnRasp">' + saltEsc(t) + "</p>"; }).join("") + "</div></div>";
  return h;
}
// rândurile pliate - aceeași formă ca paginile refăcute (data-rand + data-titlu + data-rezumat), starea în „slRanduri”
var SL_RAND_KEY = "slRanduri", SL_RANDURI = { slSPoz: "Pozițiile mele la Salt", slSIdei: "💡 Idei de cumpărare", slSVreau: "🛒 Vreau să cumpăr… · Portofoliul", slSDovada: "Ce s-a întâmplat după (dovada)", slSToate: "Toate instrumentele Salt" }, SL_RAND_DESCHIS = { slSPoz: 1, slSIdei: 1, slSVreau: 1, slSDovada: 1 };
function slRandStare() { try { var o = JSON.parse(localStorage.getItem(SL_RAND_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
function slRandAplica() {
  if (typeof document === "undefined") return;
  var st = slRandStare(), pune = function (e, k, v) { if (e.getAttribute(k) !== v) e.setAttribute(k, v); };
  Object.keys(SL_RANDURI).forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; var deschis = st[id] === true || (st[id] !== false && !!SL_RAND_DESCHIS[id]);
    pune(e, "data-rand", deschis ? "deschis" : "pliat"); pune(e, "data-titlu", SL_RANDURI[id]); pune(e, "aria-expanded", String(deschis));
    if (deschis) { if (e.hasAttribute("tabindex")) e.removeAttribute("tabindex"); if (e.getAttribute("role") === "button") e.removeAttribute("role"); return; }
    pune(e, "tabindex", "0"); pune(e, "role", "button"); pune(e, "data-rezumat", typeof tbRandRezumat === "function" ? tbRandRezumat(e, SL_RANDURI[id]) : "");
  });
}
function slRandComuta(id, deschis) {
  if (!Object.prototype.hasOwnProperty.call(SL_RANDURI, id)) return; var st = slRandStare(), acum = st[id] === true || (st[id] !== false && !!SL_RAND_DESCHIS[id]);
  if (deschis == null) deschis = !acum; st[id] = !!deschis; try { localStorage.setItem(SL_RAND_KEY, JSON.stringify(st)); } catch (e) {} slRandAplica();
}

// ---------------- socoteala (fără DOM) ----------------
// o poziție: valoarea și rezultatul în EUR (ce a plătit, la cursul de azi). fx = câte unități din moneda simbolului face 1 EUR (GBp: ×100)
// câte unități din moneda PREȚULUI face 1 EUR: GBp e în pence ⇒ cursul EUR→GBP ×100 (revizia R1: Biletul uita ×100 ⇒ bucăți de 100 de ori prea puține)
function saltFxPret(m, fxBrut) { return !m || m === "EUR" ? 1 : fxBrut > 0 ? fxBrut * (m === "GBp" ? 100 : 1) : null; }
function saltRand(p, a, u) {
  var m = u && u.moneda || "", fx = saltFxPret(m, a && a.fxAcum), pret = a && a.p ? a.p.pret : null;
  var costEur = p.plata === "EUR" ? p.qty * p.pretMediu : fx ? p.qty * p.pretMediu / fx : null, val = pret !== null && fx ? p.qty * pret / fx : null;
  var rez = val !== null && costEur !== null ? val - costEur : null;
  // fără curs: rezultatul în moneda simbolului (pe prețul mediu din moneda lui)
  var rezM = rez === null && a && a.p ? (pret - a.p.pretMediu) * p.qty : null;
  return { p: p, a: a, u: u || {}, m: m, fx: fx, pret: pret, val: val, cost: costEur, rez: rez, rezM: rezM, pct: rez !== null && costEur > 0 ? val / costEur - 1 : null, pond: null };
}
function saltRanduri(d) {
  var u = Array.isArray(d.univers) ? d.univers : [], an = d.analize || {};
  var l = (Array.isArray(d.pozitii) ? d.pozitii : []).map(function (p) { return saltRand(p, an[p.isin], u.filter(function (x) { return x.isin === p.isin; })[0]); });
  var tot = 0; l.forEach(function (r) { if (r.val !== null) tot += r.val; });
  l.forEach(function (r) { r.pond = tot > 0 && r.val !== null ? r.val / tot : null; });
  var ORD = { iesi: 0, atentie: 1, asteapta: 2, tine: 3, "fara-date": 4 };
  l.sort(function (x, y) { var a = x.a && x.a.cons ? ORD[x.a.cons.nivel] : 5, b = y.a && y.a.cons ? ORD[y.a.cons.nivel] : 5; return (a - b) || ((x.rez || 0) - (y.rez || 0)); });
  return { l: l, tot: tot };
}

// ---------------- desenarea ----------------
function saltKpiHtml(d, R) {
  var l = R.l, cu = l.filter(function (r) { return r.val !== null; }), cost = 0, rez = 0, soc = 0, pe = 0;
  cu.forEach(function (r) { cost += r.cost || 0; rez += r.rez || 0; if (r.rez > 0) pe++; soc += -0.1 * (r.a && r.a.beta > 0 ? r.a.beta : 1) * r.val; });
  var max = cu.slice().sort(function (a, b) { return b.pond - a.pond; })[0], lei = d.eurRon > 0 ? function (v) { return " · ≈ " + (v < 0 ? "−" : "") + saltLei(Math.abs(v * d.eurRon)); } : function () { return ""; };
  var cel = function (et, v, cls, sub) { return '<div class="t212Cel"><span class="t212Et">' + saltEsc(et) + '</span><b class="t212Val ' + (cls || "") + '">' + saltEsc(v) + '</b><span class="tbSub">' + saltEsc(sub) + '</span></div>'; };
  if (!l.length) return '<div class="t212Kpi">' + cel("Ce ai la Salt", "—", "", d.incarcate ? "nicio poziție scrisă" : "aștept pozițiile de pe server…") + cel("Pe pozițiile deschise", "—", "", "") + cel("Dacă piața scade 10 %", "—", "", "") + cel("Cea mai mare poziție", "—", "", "") + '</div>';
  var lipsa = l.length - cu.length;
  return '<div class="t212Kpi">'
    + cel("Ce ai la Salt", cu.length ? saltBani1(R.tot) + " EUR" : "—", "", (d.eurRon > 0 && cu.length ? "≈ " + saltLei(R.tot * d.eurRon) + " · " : "") + saltCate(l.length, "poziție", "poziții") + (cost > 0 ? " · plătit " + saltBani1(cost) + " EUR" : "") + (lipsa ? " · " + lipsa + " fără curs încă" : ""))
    + cel("Pe pozițiile deschise", cu.length ? saltSuma1(rez) : "—", saltCls(rez), (cost > 0 ? saltP1(rez / cost) : "—") + lei(rez) + " · " + pe + " din " + cu.length + " pe plus")
    + cel("Dacă piața scade 10 %", cu.length ? saltSuma1(soc) : "—", cu.length ? "bad" : "", cu.map(function (r) { return saltSim(r.p.simbol) + " β " + (r.a && r.a.beta != null ? (r.a.beta < 0 ? "−" : "") + Math.abs(r.a.beta).toFixed(2).replace(".", ",") : "—") + (r.a && r.a.indice ? " față de " + r.a.indice : ""); }).join(" · ") + " · beta ≤ 0 se socotește 1, ca la T212")
    + cel("Cea mai mare poziție", max ? saltSim(max.p.simbol) + " · " + Math.round(max.pond * 100) + " %" : "—", max && max.pond > 0.2 ? "bad" : max && max.pond > 0.15 ? "tbWarn" : "", "din ce ai la Salt · plafonul e 20 %")
    + '</div>';
}
function saltTodoHtml(R) {
  var todo = [];
  R.l.forEach(function (r) {
    var c = r.a && r.a.cons; if (!c || (c.nivel !== "iesi" && c.nivel !== "atentie")) return;
    var bani = r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, r.m);
    todo.push({ c: c.nivel === "iesi" ? "r" : "g", t: saltSim(r.p.simbol) + ": " + saltInMoneda(c.titlu, r.m) + (r.pct !== null ? "; ești pe " + saltP1(r.pct) + " în EUR" : ""),
      s: saltInMoneda(c.faCe || "", r.m) + " · dacă vinzi acum: " + bani, b: '<button type="button" class="t212BtnLinie" data-action-click="saltVezi(\'' + saltArg(r.p.isin) + '\')">Vezi ' + saltEsc(saltSim(r.p.simbol)) + '</button>' });
  });
  R.l.filter(function (r) { return r.pond > 0.2; }).forEach(function (r) { todo.push({ c: "g", t: saltSim(r.p.simbol) + " e " + Math.round(r.pond * 100) + " % din ce ai la Salt", s: "Peste plafonul de 20 %: o zi proastă a ei e ziua proastă a contului.", b: "" }); });
  R.l.filter(function (r) { return !r.p.de; }).forEach(function (r) { todo.push({ c: "r", t: saltSim(r.p.simbol) + ": fără data cumpărării - alerta de stop NU poate suna", s: "Fără dată, stopul care urcă fuge după prețul de azi și nu e atins niciodată: scrie data cumpărării (Editează) ca să urce de la maximul de după cumpărare.", b: '<button type="button" class="t212BtnLinie" data-action-click="saltEditeaza(\'' + saltArg(r.p.isin) + '\')">Editează</button>' }); });
  var RT = { r: 0, g: 1, n: 2 }; todo.sort(function (a, b) { return RT[a.c] - RT[b.c]; });
  return '<section class="t212Todo" aria-label="Ce ai de făcut acum"><div class="t212TodoCap"><h4>Ce ai de făcut acum</h4><span class="tbSub">în ordinea urgenței</span></div>'
    + (todo.length ? todo.map(function (x) { return '<div class="t212TodoRand"><span class="t212Dunga ' + x.c + '"></span><div><b>' + saltEsc(x.t) + '</b><p>' + saltEsc(x.s) + '</p></div>' + x.b + '</div>'; }).join("")
      : '<div class="t212TodoRand"><span class="t212Dunga v"></span><div><b>Nimic urgent</b><p>' + (R.l.length ? "Niciuna dintre pozițiile tale n-a atins stopul care urcă." : "Nicio poziție Salt de urmărit.") + '</p></div></div>') + '</section>';
}
function saltIdeeRand(x, d) {
  var m = x.moneda || "", b = d.bilet && d.bilet[x.simbol];
  var rand = '<tr><td><b>' + saltEsc(x.simbol) + '</b><span class="t212Mic">' + saltEsc(String(x.nume || "").slice(0, 44)) + '</span></td>'
    + '<td class="i-pret">' + saltPret(x.pret, m) + '</td><td class="i-intr">' + saltPret(x.intrare, m) + '</td>'
    + '<td class="i-stop bad">' + saltPret(x.stop, m) + '<span class="t212Mic">' + (x.riscPct != null ? "−" + (x.riscPct * 100).toFixed(1).replace(".", ",") + " %, " : "") + (x.riscPct >= 0.1495 ? "plafonul de 15 %, nu proba" : "din probă") + '</span></td><td class="i-tinta good">' + saltPret(x.tinta, m) + '</td>'
    + '<td class="i-ist"><span class="t212Mic">pe istoricul ei, în trendul de acum: ' + (x.pePlusProba != null ? Math.round(x.pePlusProba * 100) + " % pe plus în 20 de zile" : "—") + (x.nProba ? " (~" + saltCate(Math.max(1, Math.round(x.nProba / 20)), "caz independent", "cazuri independente") + ", cifră optimistă)" : "") + '</span>'
    + (x.prob && x.prob.tinta5 != null && x.prob.stop1 != null ? '<span class="t212Mic">🎲 ținta înaintea stopului în 5 zile: ' + Math.round(x.prob.tinta5 * 100) + '\u00a0% · stopul mâine: ' + Math.round(x.prob.stop1 * 100) + '\u00a0%</span>' : '')
    + (x.prof && x.prof.dist > 0 ? '<span class="t212Mic' + (x.prof.strans ? ' bad' : '') + '">📐 coborârea obișnuită pe 5 zile −' + (x.prof.dist * 100).toFixed(1).replace(".", ",") + '\u00a0%' + (x.prof.strans ? ' · stopul ideii e mai strâns: te poate scoate pe o mișcare normală' : ' · stopul e în afara ei') + '</span>' : '')
    + '</td><td class="i-bilet"><button type="button" class="t212BtnLinie" aria-expanded="' + !!b + '" data-action-click="saltBilet(\'' + saltArg(x.simbol) + '\')">Biletul</button></td></tr>';
  return rand + (b ? '<tr class="saltBiletR"><td colspan="7">' + (b.html || '<p class="tbSub">aduc cursul…</p>') + '</td></tr>' : '');
}
// biletul: la riscul ales (EUR), câte bucăți - riscul pe bucată e intrare − stop, în moneda bursei; fx = 1 EUR în moneda bursei
function saltBiletHtml(x, riscEur, fx) {
  var m = x.moneda || "", dist = x.intrare - x.stop, buc = dist > 0 && fx > 0 ? riscEur * fx / dist : null;
  return '<div class="t212Fac"><b>Biletul ' + saltEsc(x.simbol) + ':</b> cumpără la ' + saltPret(x.intrare, m) + ' · stop ' + saltPret(x.stop, m) + ' · țintă ' + saltPret(x.tinta, m)
    + '<span class="t212Mic">la un risc de ' + Math.round(riscEur) + ' EUR ⇒ ' + (buc !== null ? saltBucati(buc, x.intrare) + ' ≈ ' + Math.round(buc * x.intrare / fx).toLocaleString("ro-RO") + ' EUR' : '—') + ' · stopul pus la cumpărare, nu „după” · socotit pe intrarea din raport: verifică la Salt prețul de acum (dacă a trecut sub stop, nu mai e biletul ăsta)</span></div>';
}
var SALT_FILE = [["idei", "Idei"], ["urcare", "Început de urcare"], ["revers", "Revers timpuriu"], ["revine", "Pe revenire"]];
function saltFilaAleasa(d) {
  var r = d.raport || {}, L = r.liste || {}, idei = Array.isArray(r.idei) ? r.idei : null;
  if (d.fila) return d.fila;
  if (idei && idei.length) return "idei";
  for (var i = 1; i < SALT_FILE.length; i++) if ((L[SALT_FILE[i][0]] || []).length) return SALT_FILE[i][0];
  return "idei";
}
function saltIdeiHtml(d) {
  var r = d.raport, L = r && r.liste || {}, dv = r && r.dovada || {}, idei = r && Array.isArray(r.idei) ? r.idei : null, fila = saltFilaAleasa(d);
  var nr = { idei: idei ? idei.length : 0, urcare: (L.urcare || []).length, revers: (L.revers || []).length, revine: (L.revine || []).length };
  var h = (!idei && r && fila !== "idei" ? '<p class="tbSub saltNota">Fila „Idei” (poarta de la Trading 212): ideile apar după tura colectorului de mâine dimineață (de la v101.83 în sus); până atunci, listele Salt.</p>' : '')
    + '<div class="t212File" role="tablist">' + SALT_FILE.map(function (f) { return '<button type="button" class="tbIntBtn" aria-pressed="' + (fila === f[0]) + '" data-action-click="saltFila(\'' + f[0] + '\')">' + f[1] + ' · ' + nr[f[0]] + '</button>'; }).join("") + '</div>';
  if (fila === "idei") {
    h += '<p class="tbSub saltNota">Poarta ideilor de la Trading 212, dar fără regimul pieței și fără data rezultatelor: trend în sus pe zilnice, nu după o zi mare și nu la maximul pe 7 zile, iar pe istoricul ei intrările în aceeași direcție de trend au ieșit pe plus. Un filtru de trend, nu o idee dovedită (vezi „Ce s-a întâmplat după”). Ordonate după șansa țintei în 5 zile, nu după scor; prețurile în moneda bursei, de la ora raportului.</p>';
    if (!idei) h += '<p class="sugGol">' + saltEsc(r ? "ideile apar după tura colectorului de mâine dimineață (de la v101.83 în sus): până atunci, listele din filele alăturate." : "aștept tura de la 8:00 (colectorul trece prin toată lista o dată pe zi)") + '</p>';
    else if (!idei.length) h += '<p class="sugGol">Azi niciun instrument Salt nu trece de poartă.</p>';
    else h += '<div class="rlTab"><table class="t212Tab saltIdei"><thead><tr><th>Acțiune</th><th>La raport</th><th>Intrare</th><th>Stop</th><th>Țintă</th><th>Istoricul ei</th><th></th></tr></thead><tbody>' + idei.slice(0, 6).map(function (x) { return saltIdeeRand(x, d); }).join("") + '</tbody></table></div>'
      + (idei.length > 6 ? '<details class="saltMaiMult"><summary>Vezi și celelalte ' + (idei.length - 6) + ' care trec de poartă</summary><div class="rlTab"><table class="t212Tab saltIdei"><tbody>' + idei.slice(6).map(function (x) { return saltIdeeRand(x, d); }).join("") + '</tbody></table></div></details>' : '');
  } else {
    var t = { urcare: ["ies dintr-o perioadă liniștită, cu volum", function (x) { return saltP1(x.ruptura) + " peste maximul pe 20 de zile, volum ×" + Number(x.volX || 0).toFixed(1).replace(".", ","); }],
      revers: ["prima zi de întoarcere după o cădere de 15 %+", function (x) { return "−" + Math.round((x.cadere || 0) * 100) + " % de la maxim"; }],
      revine: ["au scăzut puternic și acum revin", function (x) { return "−" + Math.round((x.cadere || 0) * 100) + " % de la maxim, revine" + (x.deLaMin > 0 ? " (+" + Math.round(x.deLaMin * 100) + " % de la minim" + (x.zileDeLaMin != null ? ", în " + saltCate(x.zileDeLaMin, "zi", "zile") : "") + ")" : "") + (x.stop > 0 ? " · stopul regulii " + saltBani(x.stop) + ", ținta regulii " + saltBani(x.tinta) : ""); }] }[fila];
    var l = L[fila] || [], nv = d.nivListe || {};
    // v100.130: stopul și ținta Radarului pentru o intrare azi (ca la T212), socotite pe pagină când se deschide fila (saltNivelePeLista)
    var nivCel = function (x) {
      var n = nv[x.simbol];
      if (!n) return '<td class="tbSub l-stop">…</td><td class="tbSub l-tinta">…</td>';
      if (n.eroare) return '<td class="tbSub l-stop">—</td><td class="tbSub l-tinta">—</td>';
      return '<td class="bad l-stop">' + saltPret(n.stop, "") + '<span class="t212Mic">' + (n.pret > 0 ? saltP1(n.stop / n.pret - 1) + " de acum (" + saltBani(n.pret) + ")" : "") + (n.intrare > 0 ? " · de la intrarea " + saltBani(n.intrare) : "") + '</span>' + (n.trend === "jos" ? '<span class="t212Mic">trend în jos: doar dacă se întoarce</span>' : '') + '</td><td class="good l-tinta">' + saltPret(n.tinta, "") + '</td>';
    };
    h += '<p class="tbSub saltNota">' + saltEsc(t[0]) + (dv[fila] && (dv[fila].textZi || dv[fila].text) ? ' · <b>' + saltEsc(dv[fila].textZi || dv[fila].text) + '</b>' : '') + (dv[fila] && dv[fila].textZi && dv[fila].text ? ' <span class="t212Mic">(reperul vechi, o zi oarecare: ' + saltEsc(dv[fila].text) + ')</span>' : '') + '</p>'
      + (l.length ? '<div class="rlTab"><table class="t212Tab saltLista"><thead><tr><th>Instrument</th><th>La semnal</th><th>De ce e aici</th><th>Stop</th><th>Țintă</th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + saltEsc(x.simbol || x.isin) + '</b><span class="t212Mic">' + saltEsc(String(x.nume || "").slice(0, 44)) + '</span></td><td>' + saltPret(x.pret, "") + (x.t > 0 ? '<span class="t212Mic">' + saltData(x.t).slice(0, 5) + '</span>' : '') + '</td><td class="saltDece">' + saltEsc(t[1](x)) + '</td>' + nivCel(x) + '</tr>'; }).join("") + '</tbody></table></div>'
        + '<p class="tbSub saltNota">Stopul și ținta: ale Radarului pentru o intrare azi (ca la Trading 212: stopul din agitația ei, ținta la de 2 ori distanța), socotite acum, la deschiderea filei. Nu trec prin poarta din fila „Idei”. Lista e cea Salt de azi (ce a ieșit din Salt lipsește din istoric); la „Pe revenire” istoricul cumpără la închiderea zilei semnalului, un preț pe care nu-l prinzi.</p>'
        : '<p class="sugGol">' + saltEsc(r ? "nimic azi" : "aștept tura de la 8:00") + '</p>');
  }
  return '<div class="t212Panou saltPanou"><div class="t212PanouCap"><h4>💡 Idei de cumpărare</h4><span class="tbSub">' + (r ? saltEsc("din " + saltCate(r.judecate || 0, "instrument Salt judecat", "instrumente Salt judecate") + (r.la ? " pe " + new Date(r.la).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" }) : "") + (idei ? ", " + idei.length + " trec de poartă" : "")) : "") + '</span></div>' + h
    + '<p class="tbSub saltNota">Frecvențele vin din trecut și nu sunt promisiuni; trendul se măsoară pe bare zilnice închise.</p></div>';
}
function saltPozRandHtml(r, d) {
  var a = r.a, p = r.p, isin = saltEsc(p.isin), des = !!(d.deschis && d.deschis[p.isin]), m = r.m;
  var pretBuc = r.pret > 0 ? r.pret : p.pretMediu, qty = saltBucati(p.qty, pretBuc), de = p.de ? p.de.slice(8, 10) + "." + p.de.slice(5, 7) + "." + p.de.slice(0, 4) : null;
  var cap = '<td><div class="t212Sim">' + (a && a.cons ? '<span class="t212Pill ' + (SALT_NIVEL[a.cons.nivel] || SALT_NIVEL["fara-date"])[1] + '">' + (SALT_NIVEL[a.cons.nivel] || SALT_NIVEL["fara-date"])[0] + '</span>' : '<span class="t212Pill t212Pill-fara">' + (a && a.eroare ? "FĂRĂ DATE" : "…") + '</span>')
    + '<div><b>' + saltEsc(p.simbol) + '</b><span class="t212Mic">' + saltEsc(String(p.nume || "").slice(0, 40)) + '</span><span class="t212Mic">' + saltEsc(qty + " · mediu " + saltPretExact(p.pretMediu, p.plata === "EUR" ? "EUR" : m) + (de ? " · din " + de : "")) + '</span></div></div></td>';
  if (!a || a.eroare) {
    var mes = !a ? "aștept prețurile…" : a.eroare === "fara-bare" ? "n-am prețurile simbolului (Yahoo)" : a.eroare === "fara-curs" ? "n-am cursul EUR pentru moneda simbolului" : "nu pot analiza acum";
    return '<tr class="t212Rand">' + cap + '<td colspan="6" class="tbSub" style="text-align:left">' + saltEsc(mes) + '</td></tr>';
  }
  var c = a.cons || {}, n = a.niv, pr = r.pret, tr = a.st && a.st.trend && a.st.trend.dir, atins = n && pr < n.stopPozitie;
  var rand = '<tr class="t212Rand" id="saltR-' + isin + '" tabindex="0" aria-expanded="' + des + '" data-action-click="saltComuta(\'' + saltArg(p.isin) + '\')">' + cap
    + '<td class="c-acum">' + saltPret(pr, m) + (m !== "EUR" && r.fx ? '<span class="t212Mic">≈ ' + saltBani(pr / r.fx) + ' EUR</span>' : '') + '</td>'
    + '<td class="c-rez"><b class="' + saltCls(r.rez !== null ? r.rez : r.rezM) + '">' + (r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, m)) + '</b><span class="t212Mic">' + (r.pct !== null ? saltP1(r.pct) + " în EUR · " : "") + 'preț ' + saltP1(pr / a.p.pretMediu - 1) + '</span></td>'
    + '<td class="c-stop" data-et="Stop">' + (n ? '<span class="' + (atins ? "bad" : "") + '">' + saltPret(n.stopPozitie, m) + '</span><span class="t212Mic">' + (atins ? "DEPĂȘIT" : saltP1(n.stopPozitie / pr - 1) + " de acum") + '</span>'
      + (atins && a.revine ? (typeof mcsRevineButon === "function" && mcsRevineButon(p.simbol, pr, a.p.pretMediu, n.stopPozitie, a.revine, "saltRevMic")) || '<span class="t212Mic saltRevMic">🎲 revine la intrare: ' + Math.round(a.revine.p * 100) + '% în ' + a.revine.zile + ' z</span>' : '') : '—') + '</td>'
    + '<td class="c-tinta" data-et="Țintă">' + (n ? '<span class="good">' + saltPret(n.tintaPozitie, m) + '</span><span class="t212Mic">' + saltP1(n.tintaPozitie / pr - 1) + '</span>' : '—') + '</td>'
    + '<td class="c-trend"><b class="' + (tr === "sus" ? "good" : tr === "jos" ? "bad" : "t212Estompat") + '">' + (tr === "sus" ? "↑ sus" : tr === "jos" ? "↓ jos" : tr === "lateral" ? "→ lateral" : "—") + '</b></td>'
    + '<td class="c-pond">' + (r.pond !== null ? Math.round(r.pond * 100) + '%<span class="t212MiniBara"><i class="' + (r.pond > 0.2 ? " rau" : r.pond > 0.15 ? " atentie" : "") + '" style="width:' + Math.min(100, r.pond / 0.3 * 100).toFixed(0) + '%"></i></span>' : '—') + '</td></tr>';
  // revizia (R2): sumele Consilierului sunt în „$”, pe baza din moneda simbolului ⇒ le scot și pun suma la stopul care urcă în EUR (cum a plătit)
  var laStop = n && r.fx && r.cost !== null ? p.qty * n.stopPozitie / r.fx - r.cost : null;
  var restBani = String(c.bani || "").split(" · ").slice(1).map(function (t) {
    var fara = t.replace(/:\s*[−+-]?[\d.,]+\s*\$\s*$/, "");
    return saltInMoneda(/dacă atinge stopul/.test(t) && laStop !== null ? fara + ": " + saltSuma1(laStop) : fara, m);
  }).filter(Boolean).join(" · ");
  var det = '<tr class="t212Det saltDet" id="saltDet-' + isin + '"' + (des ? '' : ' hidden') + '><td colspan="7"><div class="saltDetCorp">'
    + (a.avert ? '<p class="tbWarn">' + saltEsc(a.avert) + '</p>' : '')
    + '<p><span class="t212Pill ' + (SALT_NIVEL[c.nivel] || SALT_NIVEL["fara-date"])[1] + '">' + saltEsc(c.eticheta || (SALT_NIVEL[c.nivel] || SALT_NIVEL["fara-date"])[0]) + '</span> <b>' + saltEsc(saltInMoneda(c.titlu || "", m)) + '</b></p>'
    + (c.motive && c.motive.length ? '<ul class="t212Motive">' + c.motive.slice(0, 4).map(function (x) { return '<li>' + saltEsc(saltInMoneda(x.titlu, m)) + (x.text ? ' <span class="t212Mic saltInline">' + saltEsc(saltInMoneda(x.text, m).replace(/ \(măsurat pe trade-urile tale\)/, "")) + '</span>' : '') + '</li>'; }).join("") + '</ul>' : '')
    + (atins && a.revine ? '<p class="saltRevine">🎲 Șansa să revină la prețul tău de intrare (' + saltPret(a.p.pretMediu, m) + (p.plata === "EUR" && m && m !== "EUR" ? ", din EUR la cursul din ziua cumpărării" : "") + ') măcar o dată în ' + a.revine.zile + ' de zile de bursă: <b>' + Math.round(a.revine.p * 100) + '%</b>; la capăt peste intrare: ' + Math.round(a.revine.pCapat * 100) + ' %' + (a.revine.pJos != null ? '; să mai scadă încă 10 % înainte: ' + Math.round(a.revine.pJos * 100) + ' %' : '') + '. <span class="t212Mic saltInline">Monte Carlo pe istoria ei, fără tendința perioadei: zile reale reluate de 1.000 de ori, nu o predicție.</span></p>' : '')
    + (c.faCe ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + saltEsc(saltInMoneda(c.faCe, m)) + '<span class="t212Mic">dacă vinzi acum: ' + saltEsc(r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, m)) + (restBani ? " · " + saltEsc(restBani) : "") + '</span></p>' : '')
    + '<p class="tbSub">' + saltEsc(qty + " · plătit " + saltPretExact(p.pretMediu, p.plata === "EUR" ? "EUR" : m) + " pe bucată" + (de ? " pe " + de : "") + (p.plata === "EUR" && m && m !== "EUR" ? " (= " + saltBani(a.p.pretMediu) + " " + saltMon(m) + (de ? " la cursul din ziua cumpărării" : " la cursul de azi") + (r.fx ? "; azi 1 EUR = " + (r.fx / (m === "GBp" ? 100 : 1)).toFixed(4).replace(".", ",") + " " + (m === "GBp" ? "GBP" : m) : "") + ")" : "")) + '</p>'
    + (!p.de ? '<p class="tbWarn">Fără data cumpărării, stopul care urcă pornește de la prețul de azi și fuge după el: alerta de stop nu poate suna. Scrie data (Editează) ca să urce de la maximul de după cumpărare.</p>' : '')
    + '<p class="saltDetBut">' + (typeof mcsPozButon === "function" ? mcsPozButon(p.simbol, pr, a.p.pretMediu, n ? n.stopPozitie : null) + ' ' : '') + '<button type="button" class="t212BtnLinie" data-action-click="saltEditeaza(\'' + saltArg(p.isin) + '\')">Editează</button> <button type="button" class="t212BtnLinie" data-action-click="saltSterge(\'' + saltArg(p.isin) + '\')"' + (d.incarcate ? '' : ' disabled') + '>Șterge poziția</button></p>'
    + '</div></td></tr>';
  return rand + det;
}
function saltPozHtml(d, R) {
  if (!d.incarcate) return '<p class="sugGol">' + saltEsc(d.eroare ? "Pozițiile nu se pot citi acum - formularul e blocat până merg (ca să nu scriu peste ce ai salvat)." : "aștept pozițiile de pe server…") + '</p>';
  if (!R.l.length) return '<p class="sugGol">n-ai scris încă nicio poziție: o adaugi mai jos („Adaugă o poziție”).</p>';
  return '<div class="t212TabWrap"><table class="t212Tab"><thead><tr><th>Acțiune</th><th>Acum</th><th>Rezultat</th><th>Stop care urcă</th><th>Țintă</th><th>Trend</th><th>Din Salt</th></tr></thead><tbody>'
    + R.l.map(function (r) { return saltPozRandHtml(r, d); }).join("") + '</tbody></table></div>';
}
function saltFormHtml(d) {
  var u = Array.isArray(d.univers) ? d.univers : [];
  return '<details class="saltForm" id="saltFormDet"' + (d.incarcate && !(Array.isArray(d.pozitii) && d.pozitii.length) ? ' open' : '') + '><summary>Adaugă o poziție</summary><div class="saltCampuri">'
    + '<label>Instrumentul <input id="saltInstr" list="saltDl" placeholder="caută după nume, simbol sau ISIN" autocomplete="off"></label>'
    + '<label>Cantitatea <input id="saltQty" inputmode="decimal" placeholder="10"></label>'
    + '<label>Prețul mediu <input id="saltPret" inputmode="decimal" placeholder="180,50"></label>'
    + '<label>Am plătit în <select id="saltPlata"><option value="EUR">EUR (cum plătești la Salt)</option><option value="simbol">moneda simbolului (USD, GBp…)</option></select></label>'
    + '<label>Data cumpărării <input id="saltDe" type="date" required><span class="t212Mic">o cer: fără ea, alerta de stop nu sună</span></label></div>'
    + '<datalist id="saltDl">' + u.map(function (x) { return '<option value="' + saltEsc(x.nume + " — " + x.simbol + " — " + x.isin + (x.moneda ? " — " + x.moneda : "")) + '"></option>'; }).join("") + '</datalist>'
    + '<p class="saltFormBut"><button type="button" class="t212Btn t212BtnPlin" data-action-click="saltAdauga()"' + (d.incarcate ? '' : ' disabled') + '>Adaugă poziția</button> <span class="tbSub" id="saltMesaj"></span></p></details>';
}
// „Vreau să cumpăr…”: aceeași poartă ca ideile (Idei.judecaActiune), pe orice instrument Salt
function saltVreauHtml(v) {
  if (!v) return '';
  if (v.eroare) return '<div class="saltVerif"><p class="tbSub">' + saltEsc(v.eroare) + '</p></div>';
  if (v.inLucru) return '<div class="saltVerif"><p class="tbSub">verific ' + saltEsc(v.x ? v.x.simbol : "") + '…</p></div>';
  var x = v.x || {}, r = v.r || {}, m = x.moneda || r.moneda || "";
  return '<div class="saltVerif">' + (r.trece
    ? '<p><span class="t212Pill t212Pill-tine">TRECE</span> <b>' + saltEsc(x.simbol) + '</b> trece de poartă</p>' + (r.motive || []).map(function (t) { return '<p class="t212Mic">· ' + saltEsc(t) + '</p>'; }).join("")
      + '<p>Intrare ' + saltPret(r.intrare, m) + ' · stop ' + saltPret(r.stop, m) + ' · țintă ' + saltPret(r.tinta, m) + '</p>'
    : '<p><span class="t212Pill t212Pill-iesi">NU</span> <b>' + saltEsc(x.simbol) + '</b> nu trece de poartă</p>' + (r.motive || []).map(function (t) { return '<p class="t212Mic">· ' + saltEsc(t) + '</p>'; }).join(""))
    + (v.ai ? '<p class="t212Mic">' + (v.nivel === "iesi" ? "Pe ea o ai deja la Salt și e pe IEȘI: n-aș cumpăra în plus până nu se lămurește poziția de acum." : "Pe ea o ai deja la Salt: cumpărând în plus, crește cât din Salt stă în ea (plafonul e 20 %).") + '</p>' : '') + '</div>';
}
function saltDreaptaHtml(d, R) {
  var cu = R.l.filter(function (r) { return r.pond !== null; }).sort(function (a, b) { return b.pond - a.pond; });
  var toateIesi = R.l.length && R.l.every(function (r) { return r.a && r.a.cons && r.a.cons.nivel === "iesi"; }), max = cu[0];
  var sfat = !d.incarcate ? "Aștept pozițiile de pe server." : !R.l.length ? "N-ai scris încă nicio poziție Salt." : toateIesi ? "Toate pozițiile sunt pe IEȘI: le-aș închide (tot sau jumătate) înainte să adaug ceva nou, iar banii i-aș pune doar pe o idee care trece de poartă."
    : max && max.pond > 0.2 ? "Aș ține " + saltSim(max.p.simbol) + " sub 20 % din ce ai la Salt (acum " + Math.round(max.pond * 100) + " %)." : "Aș păstra împărțirea: fiecare poziție e sub 20 %.";
  return '<div class="t212Panou saltPanou"><div class="t212PanouCap"><h4>🛒 Vreau să cumpăr…</h4><span class="tbSub">doar long · orice instrument Salt</span></div>'
    + '<div class="saltCauta"><input id="saltVreauIn" list="saltDl" placeholder="simbol sau nume, ex. DELL" autocomplete="off"><button type="button" class="t212Btn t212BtnPlin" data-action-click="saltVerifica()">Verifică</button></div><div id="saltVreau">' + saltVreauHtml(d.verif) + '</div></div>'
    + '<div class="t212Panou saltPanou" id="saltPf"><div class="t212PanouCap"><h4>Portofoliul Salt</h4><span class="tbSub">' + (R.tot > 0 ? saltBani1(R.tot) + " EUR" : "") + '</span></div>'
    + (cu.length ? cu.map(function (r) { var w = r.pond > 0.2 ? " rau" : r.pond > 0.15 ? " atentie" : ""; return '<div class="t212Bara"><span>' + saltEsc(saltSim(r.p.simbol)) + '</span><div class="t212BaraFond"><div class="t212BaraPlin' + w + '" style="width:' + Math.max(1, Math.min(100, r.pond / 0.3 * 100)).toFixed(1) + '%"></div></div><b>' + Math.round(r.pond * 100) + ' %</b></div>'; }).join("")
      + '<p class="tbSub t212PfNota">Bara plină = 30 % din ce ai la Salt. Galben peste 15 %, roșu peste 20 %.</p>' : '<p class="tbSub">—</p>')
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + saltEsc(sfat) + '</p></div>';
}
function saltSusHtml(d, R) { return saltKpiHtml(d, R) + saltTodoHtml(R); }
// v100.126 (el 07.10, „ok fa idei”): Salt lângă Trading 212 - din rezumatul colectorului (/api/t212?action=saltRezumat, la 15 minute)
// revizia Opus (07.10): toate pozițiile fără prețuri ⇒ nimic (nu „0,0 EUR · nimic roșu”); parțial ⇒ se spune câte;
// vechi (colectorul oprit, peste 45 de minute) ⇒ „de acum …” și nu mai aprinde ⚠️
function saltRezumatProaspat(r, acum) { return !!(r && r.la > 0 && (acum || Date.now()) - r.la <= 45 * 60000); }
function saltRezumatBun(r) { return !!(r && r.n > 0 && r.val != null && !((r.fara || 0) >= r.n)); }
function saltDeCand(r, acum) {
  if (saltRezumatProaspat(r, acum)) return "";
  var m = Math.round(((acum || Date.now()) - r.la) / 60000);
  return "de acum " + (m < 60 ? m + " min" : m < 48 * 60 ? Math.floor(m / 60) + " h" : saltCate(Math.floor(m / 1440), "zi", "zile"));
}
function saltBandaHtml(r, acum) {
  if (!saltRezumatBun(r)) return "";
  var dc = saltDeCand(r, acum);
  return '<span><b>Salt</b> · ' + saltBani1(r.val) + ' EUR' + (r.eurRon > 0 ? ' <span class="tbSub">(≈ ' + saltLei(r.val * r.eurRon) + ')</span>' : '') + ' · deschise <b class="' + saltCls(r.rez) + '">' + saltSuma1(r.rez) + '</b>'
    + (r.fara > 0 ? ' <span class="tbSub">· ' + r.fara + ' din ' + r.n + ' fără prețuri</span>' : '') + (dc ? ' <span class="tbSub">(' + dc + ')</span>' : '') + '</span>';
}
function saltAcasaHtml(r, acum) {
  if (!saltRezumatBun(r)) return "";
  var ie = (r.iesi || []).length, at = (r.atentie || []).length, dc = saltDeCand(r, acum);
  var sem = ie ? ie + " de ieșit (" + saltEsc(r.iesi.join(", ")) + ")" : at ? at + " cu atenție" : r.fara > 0 ? r.fara + " din " + r.n + " fără prețuri" : "nimic roșu";
  return '<div class="acEt" style="margin-top:6px">Salt · ' + saltEsc(saltCate(r.n, "poziție", "poziții")) + (dc ? ' · ' + dc : '') + '</div>'
    + '<div class="acLin"><span>Valoarea</span><b>' + saltBani1(r.val) + ' EUR</b></div>'
    + '<div class="acLin"><span>Pozițiile deschise</span><b class="' + saltCls(r.rez) + '">' + saltSuma1(r.rez) + '</b></div>'
    + '<div class="acLin"><span>Semafoare</span><b class="' + (ie ? "bad" : at ? "tbWarn" : r.fara > 0 ? "acMut" : "good") + '">' + sem + '</b></div>'
    + '<button class="acBtn" type="button" data-action-click="navTo(\'salt\',true)">Deschide Salt</button>';
}
function saltHtml(d, acum) {
  d = d || {}; var R = saltRanduri(d), r = d.raport, tb = r && Array.isArray(r.tabel) ? r.tabel : [], are = R.l.length > 0;
  var poz = saltBloc("slSPoz", "Pozițiile mele la Salt", "apasă pe un rând pentru detalii · rezultatul în EUR, cum ai plătit",
    '<div id="saltSus">' + saltSusHtml(d, R) + '</div><div class="t212Panou saltPanou"><div id="saltPozBox">' + saltPozHtml(d, R) + '</div>' + saltFormHtml(d) + '</div>');
  var idei = saltBloc("slSIdei", "", "", '<div id="saltIdeiBox">' + saltIdeiHtml(d) + '</div>');
  return (d.eroare ? '<p class="tbWarn">' + saltEsc(d.eroare) + '</p>' : '')
    + saltVarstaHtml(d, acum) + saltFrazaHtml(d, R) + saltCifreHtml(d, R)
    + (are ? poz + idei : idei + poz)   /* fără poziții, ideile înaintea casetelor goale (auditul: ~690 px goi la 1440) */
    + saltBloc("slSVreau", "", "", '<div class="t212Side saltDreapta" id="saltDreapta">' + saltDreaptaHtml(d, R) + '</div>')
    + saltBloc("slSDovada", "Ce s-a întâmplat după", "dovada ideilor și a listelor, pe istoric și pe viu", saltDovadaHtml(d))
    + saltBloc("slSToate", "", "", '<details class="t212Panou saltPanou saltToate" open><summary><b>Toate instrumentele Salt' + (tb.length ? ' · ' + tb.length : '') + '</b> <span class="tbSub">caută după nume, simbol sau ISIN</span></summary>'
      + '<label class="saltCautaEt">Caută <input id="saltCauta" data-action-input="saltFiltru()" placeholder="nume, simbol sau ISIN" value="' + saltEsc(d.filtru || "") + '"></label>'
      + '<div id="saltTabel">' + saltTabelHtml(d) + '</div></details>')
    + '<p class="tbSub saltSubsol">Salt n-are API: pozițiile sunt cele scrise de tine, iar prețul e al bursei principale a simbolului, în moneda ei. Analiza e aceeași ca la Trading 212 (semaforul, stopul care urcă de cel puțin 15 % de la maxim, ținta, Consilierul). Rezultatul e în EUR la cursul de azi: la plata în EUR intră și cursul, la plata în moneda simbolului nu.</p>';
}
function saltFiltreaza(tabel, f) {
  var t = String(f || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); if (!t) return tabel;
  return tabel.filter(function (x) { return [x.nume, x.simbol, x.isin].some(function (v) { return String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().indexOf(t) >= 0; }); });
}
function saltTabelHtml(d) {
  var tb = d.raport && Array.isArray(d.raport.tabel) ? d.raport.tabel : [], f = saltFiltreaza(tb, d.filtru), ar = f.slice(0, 200);
  var tr = { sus: "↗ urcă", jos: "↘ coboară", lateral: "→ lateral" };
  if (!tb.length) return '<p class="sugGol">' + saltEsc(d.raport ? "nimic în tabel" : "aștept tura de la 8:00 (colectorul trece prin toată lista o dată pe zi)") + '</p>';
  var mon = {}; (Array.isArray(d.univers) ? d.univers : []).forEach(function (x) { mon[x.isin] = x; });   // moneda și bursa din univers (revizia I2)
  return '<p class="tbSub">' + saltEsc(f.length + " din " + tb.length + (f.length > ar.length ? " · se văd primele " + ar.length + ", caută ca să restrângi" : "")) + '</p><div class="rlTab"><table class="cnTab saltTab"><thead><tr><th>Instrument</th><th>Simbol</th><th>Bursa</th><th>Tip</th><th>Preț</th><th>Moneda</th><th>Ieri</th><th>Trend</th></tr></thead><tbody>'
    + ar.map(function (x) { var y = mon[x.isin] || {}; return '<tr><td>' + saltEsc(x.nume) + '</td><td>' + saltEsc(x.simbol) + '</td><td>' + saltEsc(y.bursa || x.bursa || "") + '</td><td>' + saltEsc(x.tip === "ETF" ? "ETF" : "acțiune") + '</td><td>' + saltEsc(saltBani(x.pret)) + '</td><td>' + saltEsc(y.moneda || "") + '</td><td>' + saltEsc(saltP1(x.zi)) + '</td><td>' + saltEsc(tr[x.trend] || "—") + '</td></tr>'; }).join("")
    + '</tbody></table></div>';
}

// ---------------- în pagină ----------------
function saltEl(id) { return typeof document !== "undefined" ? document.getElementById(id) : null; }
function saltDeseneaza() {
  var el = saltEl("saltPagina"); if (!el) return;
  var sd = el.querySelector && el.querySelector("#saltFraza details.grSurse"); if (sd) saltStare.surse = !!sd.open;
  el.innerHTML = saltHtml(saltStare.d, Date.now()); slRandAplica(); if (typeof tbTemaAplica === "function") tbTemaAplica();
}
// revizia: analizele redesenează doar cifrele, pozițiile și portofoliul - formularul, căutarea și „Vreau să cumpăr” își păstrează ce scrii
function saltDeseneazaPoz() {
  var d = saltStare.d, R = saltRanduri(d), s = saltEl("saltSus"), p = saltEl("saltPozBox"), pf = saltEl("saltPf");
  if (!s || !p) { saltDeseneaza(); return; }
  s.innerHTML = saltSusHtml(d, R); p.innerHTML = saltPozHtml(d, R);
  var fz = saltEl("saltFraza"), cf = saltEl("saltCifre");   /* v100.365: fraza și cifrele se socotesc din poziții */
  if (fz) { var sd = fz.querySelector("details.grSurse"); if (sd) saltStare.surse = !!sd.open; fz.outerHTML = saltFrazaHtml(d, R); }
  if (cf) cf.outerHTML = saltCifreHtml(d, R);
  if (pf) { var tmp = document.createElement("div"); tmp.innerHTML = saltDreaptaHtml(d, R); var nou = tmp.querySelector("#saltPf"); if (nou) pf.replaceWith(nou); }
}
function saltDeseneazaIdei() { var el = saltEl("saltIdeiBox"); if (el) el.innerHTML = saltIdeiHtml(saltStare.d); }
function saltFiltru() { var i = saltEl("saltCauta"), t = saltEl("saltTabel"); saltStare.d.filtru = i ? i.value : ""; if (t) t.innerHTML = saltTabelHtml(saltStare.d); }   // doar tabelul: câmpul își păstrează cursorul
function saltFila(k) { saltStare.d.fila = k; saltDeseneazaIdei(); saltNivelePeLista(k); }
// v100.130: stopul și ținta pentru un instrument din liste - ActiuniSemnale.niveluri pe prețul de acum (ultima bară), ca pe pagina T212
function saltNivLista(b) {
  var P = Array.isArray(b) && b.length ? b[b.length - 1].c : null, n = P > 0 ? ActiuniSemnale.niveluri(b, P, {}) : null;
  if (!n || n.nivel !== "ok") return { eroare: n && n.motiv || "fără prețuri" };
  return { pret: P, intrare: n.intrare ? n.intrare.pret : null, stop: n.stop, tinta: n.tinta, riscPct: n.riscPct, trend: n.trend };
}
// pe rând, cu o pauză între cereri (Yahoo prin server); fiecare rând apare când e gata; o dată pe pagină
// revizia (R3/R9): o singură trecere pe filă odată (clicurile repetate nu dublează cererile); erorile nu se țin minte - la următoarea
// deschidere a filei se reîncearcă (ca R8: un eșec nu rămâne toată sesiunea)
async function saltNivelePeLista(fila) {
  var d = saltStare.d, l = d.raport && d.raport.liste && d.raport.liste[fila]; if (!Array.isArray(l)) return;
  saltStare.nivFila = saltStare.nivFila || {}; if (saltStare.nivFila[fila]) return;
  saltStare.nivFila[fila] = true;
  try {
    d.nivListe = d.nivListe || {};
    Object.keys(d.nivListe).forEach(function (k) { if (d.nivListe[k] && d.nivListe[k].eroare) delete d.nivListe[k]; });
    for (var i = 0; i < l.length; i++) {
      var s = l[i] && l[i].simbol; if (!s || d.nivListe[s]) continue;
      try { d.nivListe[s] = saltNivLista(await saltBareDe(s)); } catch (e) { d.nivListe[s] = { eroare: "n-am prețurile" }; }
      saltDeseneazaIdei();
      await new Promise(function (r) { setTimeout(r, 250); });
    }
  } finally { saltStare.nivFila[fila] = false; }
}
function saltComuta(isin) {
  var d = saltStare.d; d.deschis[isin] = !d.deschis[isin];
  var r = saltEl("saltR-" + isin), det = saltEl("saltDet-" + isin); if (r) r.setAttribute("aria-expanded", String(!!d.deschis[isin])); if (det) det.hidden = !d.deschis[isin];
}
function saltVezi(isin) { if (!saltStare.d.deschis[isin]) saltComuta(isin); var r = saltEl("saltR-" + isin); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: "smooth", block: "center" }); }
function saltEditeaza(isin) {
  var p = saltStare.d.pozitii.filter(function (x) { return x.isin === isin; })[0], f = saltEl("saltFormDet"); if (!p || !f) return;
  f.open = true;
  var put = function (id, v) { var el = saltEl(id); if (el) el.value = v; };
  put("saltInstr", (p.nume || "") + " — " + p.simbol + " — " + p.isin); put("saltQty", String(p.qty).replace(".", ",")); put("saltPret", String(p.pretMediu).replace(".", ","));
  put("saltPlata", p.plata === "EUR" ? "EUR" : "simbol"); put("saltDe", p.de || "");
  var m = saltEl("saltMesaj"); if (m) m.textContent = "Schimbă ce trebuie și apasă „Adaugă poziția”: înlocuiește poziția " + p.simbol + ".";
  if (f.scrollIntoView) f.scrollIntoView({ behavior: "smooth", block: "center" });
}
async function saltBareDe(s) { var r = await getJSON("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(s)); return GridCalcul.bareToate(r && r.randuri || []); }
// cursul de azi EUR → moneda m (ținut minte o dată pe pagină)
async function saltFxAcum(m) {
  if (!m || m === "EUR") return 1; if (saltStare.fx[m]) return saltStare.fx[m];
  var pf = Salt.perecheFx(m); if (!pf) return null; var b = await saltBareDe(pf); var v = b.length ? b[b.length - 1].c : null; if (v > 0) saltStare.fx[m] = v; return v;
}
// revizia (R8): un eșec nu se ține minte (altfel beta rămânea 1 toată sesiunea)
async function saltBareIndice(m) { var i = SALT_INDICE[m]; if (!i) return null; if (!saltStare.indici[i.sim]) { try { var q = await saltBareDe(i.sim); if (q && q.length) saltStare.indici[i.sim] = q; } catch (e) {} } return saltStare.indici[i.sim] || null; }
async function saltBilet(simbol) {
  var d = saltStare.d; if (d.bilet[simbol]) { delete d.bilet[simbol]; saltDeseneazaIdei(); return; }
  var x = (d.raport && d.raport.idei || []).filter(function (y) { return y.simbol === simbol; })[0]; if (!x) return;
  d.bilet[simbol] = { html: null }; saltDeseneazaIdei();
  var fx = null; try { fx = saltFxPret(x.moneda, await saltFxAcum(x.moneda)); } catch (e) { fx = null; }
  var R = saltRanduri(d), tot = R.tot, risc = tot > 0 ? Math.max(5, tot * 0.01) : 10;
  // revizia (R11): cât încă se aduc prețurile pozițiilor, totalul e parțial ⇒ riscul de 1% ar ieși prea mic
  if (R.l.some(function (r) { return r.val === null && !(r.a && r.a.eroare); })) { if (d.bilet[simbol]) d.bilet[simbol].html = '<p class="tbSub">aștept prețurile pozițiilor ca să socotesc riscul de 1% din ce ai la Salt - apasă din nou „Biletul” peste câteva secunde.</p>'; saltDeseneazaIdei(); return; }
  if (d.bilet[simbol]) d.bilet[simbol].html = fx ? saltBiletHtml(x, risc, fx) + (tot > 0 ? '' : '<p class="t212Mic">Riscul de 10 EUR e ales de mine până scrii pozițiile (atunci: 1% din ce ai la Salt).</p>') : '<p class="tbSub">n-am cursul EUR pentru ' + saltEsc(x.moneda) + '</p>';
  saltDeseneazaIdei();
}
async function saltVerifica() {
  var d = saltStare.d, i = saltEl("saltVreauIn"), t = i ? i.value : "", u = d.univers || [], box = saltEl("saltVreau");
  var isin = (t.match(/[A-Z]{2}[A-Z0-9]{9}\d/) || [])[0], x = isin ? u.filter(function (y) { return y.isin === isin; })[0] : Salt.cauta(u, t)[0];
  var arata = function () { if (box) box.innerHTML = saltVreauHtml(d.verif); };
  if (!x) { d.verif = { eroare: "nu găsesc „" + t + "” în lista Salt (" + saltCate(u.length, "instrument", "instrumente") + ")" }; arata(); return; }
  d.verif = { x: x, inLucru: true }; arata();
  var nou;
  try {
    var b = await saltBareDe(x.simbol), ai = d.pozitii.some(function (p) { return p.isin === x.isin; }), an = d.analize[x.isin];
    var r = b.length ? Idei.judecaActiune(b, b[b.length - 1].c, { acum: Date.now(), Probabilitati: typeof Probabilitati !== "undefined" ? Probabilitati : null, ProfilMoneda: typeof ProfilMoneda !== "undefined" ? ProfilMoneda : null, simbol: x.simbol }) : { trece: false, motive: ["n-am prețurile simbolului (Yahoo)"] };
    nou = { x: x, r: r, ai: ai, nivel: an && an.cons ? an.cons.nivel : null };
  } catch (e) { nou = { x: x, eroare: "nu pot verifica acum: " + (e && e.message || e) }; }
  // revizia (R6): două „Verifică” la rând - rezultatul celui vechi nu calcă peste cel nou
  if (d.verif && d.verif.x === x) { d.verif = nou; arata(); }
}
// v100.130: stopul care urcă DEPĂȘIT și prețul sub intrare ⇒ șansa să revină la intrare în 60 de zile de bursă. Aceleași drumuri ca
// 🎲 „Monte Carlo pe poziție” (MonteSimbol.pret, sămânța 21, orizonturile 20 / 60): cifra de aici = cifra de pe pagina Monte Carlo.
// Prețurile în moneda simbolului (intrarea la cursul din ziua cumpărării), ca butonul 🎲.
// v100.131: calculul e comun cu pagina T212 (mcsSansaRevenire, în monte-simbol-ecran.js)
function saltSansaRevenire(b, a) {
  if (typeof mcsSansaRevenire !== "function" || !a || !a.p || !a.niv) return null;
  return mcsSansaRevenire(b, a.p.pret, a.p.pretMediu, a.niv.stopPozitie);
}
// o poziție: barele simbolului + cursul EUR ⇒ moneda simbolului (prețul mediu plătit în EUR, valoarea în EUR) + beta față de indicele pieței
async function saltAnalizeazaUna(p) {
  var u = (saltStare.d.univers || []).filter(function (x) { return x.isin === p.isin; })[0], m = u && u.moneda, b = await saltBareDe(p.simbol), fx = null, pf = Salt.perecheFx(m);
  if (pf) { try { fx = await saltBareDe(pf); } catch (e) { fx = null; } }
  var pm = Salt.medieInMonedaSimbolului(p, m, fx); if (pm === null) return { eroare: "fara-curs" };
  var a = Salt.analizeaza(Object.assign({}, p, { pretMediuSimbol: pm }), b, Date.now());
  if (a && a.p) {
    a.avert = Salt.verificaMedie(pm, a.p.pret);
    a.fxAcum = m === "EUR" ? 1 : fx && fx.length ? fx[fx.length - 1].c : null; if (m && m !== "EUR" && a.fxAcum > 0) saltStare.fx[m] = a.fxAcum;
    try { var q = await saltBareIndice(m); a.beta = q && q.length ? ActiuniSemnale.beta(b, q) : null; } catch (e) { a.beta = null; }
    a.indice = SALT_INDICE[m] ? SALT_INDICE[m].nume : null;
    try { a.revine = saltSansaRevenire(b, a); } catch (e) { a.revine = null; }
  }
  return a;
}
async function saltAnalize() {
  var d = saltStare.d;
  for (var i = 0; i < d.pozitii.length; i++) {
    var p = d.pozitii[i];
    try { d.analize[p.isin] = await saltAnalizeazaUna(p); } catch (e) { d.analize[p.isin] = { eroare: "fara-bare" }; }
    saltDeseneazaPoz();
  }
}
async function saltPorneste(fortat) {
  saltDeseneaza();
  if (saltStare.inLucru || (!fortat && Date.now() - saltStare.la < 5 * 60000)) return;
  saltStare.inLucru = true;
  try {
    if (!saltStare.d.univers) { try { var u = await (await fetch("/data/salt-univers.json")).json(); saltStare.d.univers = u && u.instrumente || null; } catch (e) { saltStare.d.univers = null; } }
    var s = await getJSON("/api/t212?action=salt"), laVechi = saltStare.d.raport && saltStare.d.raport.la; saltStare.d.raport = s && s.raport || null;
    saltStare.d.pozitii = s && Array.isArray(s.pozitii) ? s.pozitii : []; saltStare.d.incarcate = true; saltStare.d.eroare = null;
    // revizia (R3): raport nou ⇒ stopul și ținta de pe liste se socotesc din nou
    if ((saltStare.d.raport && saltStare.d.raport.la) !== laVechi) saltStare.d.nivListe = {};
    saltStare.la = Date.now();   // revizia (C2): ținut minte doar după o citire reușită
    var ch = saltEl("saltChip"); if (ch) ch.textContent = "citit la " + new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + (saltStare.d.raport && saltStare.d.raport.la ? " · raportul de la " + new Date(saltStare.d.raport.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "") + " · pozițiile le scrii tu (Salt n-are API)";
    saltDeseneaza();
    try { var er = await saltBareDe("EURRON=X"); saltStare.d.eurRon = er.length ? er[er.length - 1].c : null; } catch (e) { saltStare.d.eurRon = null; }
    await saltAnalize();
    // v100.130: pagina se deschide pe o listă (fără idei azi) ⇒ stopul și ținta pentru ea, după poziții
    var fa = saltFilaAleasa(saltStare.d); if (fa !== "idei") saltNivelePeLista(fa);
  } catch (e) { saltStare.d.eroare = "N-am putut citi pozițiile Salt: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }
  finally { saltStare.inLucru = false; }
  if (saltStare.d.eroare) saltDeseneaza(); else saltDeseneazaPoz();   // revizia (R4): pe drumul bun doar cifrele și pozițiile - ce scrii în formular / „Vreau” rămâne
}
// v101.87 (el 07.10, „DA LA TOT”): trimite O operație ({pune: poziție} / {scoate: isin}), aplicată de server pe lista proaspătă;
// înainte trimitea toată lista din memoria paginii și ștergea o poziție adăugată între timp de pe pagina alerts. Lista se ia de la server.
async function saltSalveaza(op) {
  if (!saltStare.d.incarcate) throw new Error("pozițiile nu s-au citit încă de pe server");   // revizia (C2)
  var r = await apiFetch("/api/t212?action=saltPoz", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(op) });
  if (!r.ok) { var e = null; try { e = await r.json(); } catch (x) { e = null; } throw new Error(e && e.error ? e.error : "HTTP " + r.status); }   /* v100.365 (B11): textul serverului */
  var j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (j && Array.isArray(j.pozitii)) saltStare.d.pozitii = j.pozitii;
}
async function saltAdauga() {
  var g = function (id) { var el = saltEl(id); return el ? el.value : ""; }, m = saltEl("saltMesaj"), u = saltStare.d.univers || [];
  var t = g("saltInstr"), isin = (t.match(/[A-Z]{2}[A-Z0-9]{9}\d/) || [])[0] || (Salt.cauta(u, t)[0] || {}).isin;
  var p = Salt.pozitieCurata({ isin: isin, qty: g("saltQty"), pretMediu: g("saltPret"), de: g("saltDe"), plata: g("saltPlata") }, u);
  if (!p) { if (m) m.textContent = "Alege instrumentul din listă și scrie cantitatea și prețul mediu (numere pozitive; data nu poate fi în viitor)."; return; }
  if (!p.de) { if (m) m.textContent = "Scrie data cumpărării: fără ea, stopul care urcă fuge după preț și alerta de stop nu poate suna."; return; }   /* v100.365 (B4) */
  if (!saltStare.d.incarcate) { if (m) m.textContent = "Pozițiile nu s-au citit încă de pe server: încearcă peste câteva secunde."; return; }
  // verificarea monedei înainte de salvare: prețul mediu prea departe de cel de acum ⇒ nu salvez (revizia I2)
  try { var a = await saltAnalizeazaUna(p); if (a && a.avert) { if (m) m.textContent = a.avert + " Nu l-am salvat."; return; } } catch (e) {}
  var exista = saltStare.d.pozitii.some(function (x) { return x.isin === p.isin; });
  var vechi = saltStare.d.pozitii; saltStare.d.pozitii = vechi.filter(function (x) { return x.isin !== p.isin; }).concat([p]);
  try { await saltSalveaza({ pune: p }); if (m) m.textContent = exista ? "Am înlocuit poziția " + p.simbol + " (am înlocuit poziția, nu am adunat: scrie cantitatea totală și prețul mediu)." : "Am salvat " + p.simbol + "."; saltStare.d.analize[p.isin] = null; saltDeseneazaPoz(); await saltAnalize(); }
  catch (e) { saltStare.d.pozitii = vechi; if (m) m.textContent = "Nu s-a salvat (" + e.message + "): încearcă din nou."; }
}
async function saltSterge(isin) {
  var p0 = saltStare.d.pozitii.filter(function (x) { return x.isin === isin; })[0];   /* v100.365 (B11): cu confirmare */
  if (typeof confirm === "function" && !confirm("Șterg poziția " + (p0 ? p0.simbol : isin) + " din lista Salt? (n-are anulare)")) return;
  var vechi = saltStare.d.pozitii; saltStare.d.pozitii = vechi.filter(function (x) { return x.isin !== isin; });
  try { await saltSalveaza({ scoate: isin }); delete saltStare.d.analize[isin]; delete saltStare.d.deschis[isin]; } catch (e) { saltStare.d.pozitii = vechi; saltStare.d.eroare = "Nu s-a șters pe server (" + e.message + "): poziția rămâne."; }
  saltDeseneaza();
}
