// v100.120 (el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca pe cele din Trading 212”): pagina „Salt” - pozițiile scrise de el
// (Salt n-are API) cu analiza de la T212 (Salt.analizeaza), formularul, listele pe instrumentele Salt (raportul de la 8:00) și tabelul tuturor.
// saltHtml e fără DOM (proba o rulează în vm); saltPorneste aduce universul, raportul, pozițiile și barele pozițiilor.
// revizia (C2): „incarcate” - până nu se citesc pozițiile de pe server, formularul e blocat (altfel „Adaugă” ar scrie lista goală peste cea bună)
var saltStare = { d: { univers: null, raport: null, pozitii: [], analize: {}, filtru: "", incarcate: false, eroare: null }, la: 0, inLucru: false };
var SALT_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], asteapta: ["AȘTEAPTĂ", "t212Pill-fara"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
function saltEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function saltBani1(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"; }   // rezultatele: o zecimală
function saltBani(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"; }
function saltP1(x) { var n = Number(x); if (x == null || !isFinite(n)) return "—"; var r = Math.round(n * 1000) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1).replace(".", ",") + "%"; }
function saltPoz(p, a, u, blocat) {
  var c = a && a.cons, niv = c ? SALT_NIVEL[c.nivel] || SALT_NIVEL["fara-date"] : null, pl = a && a.p ? a.p.ppl : null, m = u && u.moneda || "", M = function (t) { return typeof Salt !== "undefined" && Salt.inMoneda ? Salt.inMoneda(t, m) : t; };
  var cap = '<h5><b>' + saltEsc(p.simbol) + '</b> <span class="tbSub">' + saltEsc(p.nume || "") + '</span></h5>'
    + '<p class="tbSub">' + saltEsc(p.qty + " × " + saltBani(p.pretMediu) + " " + (p.plata === "EUR" ? "EUR" : m) + (p.plata === "EUR" && m && m !== "EUR" && a && a.p ? " (= " + saltBani(a.p.pretMediu) + " " + m + (p.de ? " la cursul din ziua cumpărării" : " la cursul de azi") + ")" : "")
      + (a && a.p ? " · acum " + saltBani(a.p.pret) + " " + m + " · " + (pl >= 0 ? "+" : "−") + saltBani1(Math.abs(pl)) + " " + m + " (" + saltP1(a.p.pret / a.p.pretMediu - 1) + ")" : "")) + '</p>'
    + (!p.de ? '<p class="tbSub">' + saltEsc("Fără data cumpărării, stopul care urcă pornește de la prețul de azi: scrie data ca să urce de la maximul de după cumpărare.") + '</p>' : '');
  var corp = !a ? '<p class="tbSub">aștept prețurile…</p>' : a.eroare ? '<p class="tbSub">' + saltEsc(a.eroare === "fara-bare" ? "n-am prețurile simbolului (Yahoo)" : a.eroare === "fara-curs" ? "n-am cursul EUR pentru moneda simbolului" : "nu pot analiza acum") + '</p>'
    : (a.avert ? '<p class="tbWarn">' + saltEsc(a.avert) + '</p>' : '') + '<p><span class="t212Pill ' + niv[1] + '">' + saltEsc(c.eticheta || niv[0]) + '</span> ' + saltEsc(M(c.titlu || "")) + '</p>'
      + (c.faCe ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + saltEsc(M(c.faCe)) + '</p>' : '')
      + (a.niv ? '<p class="tbSub">' + saltEsc("Stopul care urcă (cel puțin 15% de la maxim, ca la Trading 212): " + saltBani(a.niv.stopPozitie) + " " + m + " · ținta: " + saltBani(a.niv.tintaPozitie) + " " + m) + '</p>' : '')
      + (c.motive && c.motive.length ? '<ul class="t212Motive">' + c.motive.slice(0, 4).map(function (x) { return '<li>' + saltEsc(M(x.titlu)) + (x.text ? ' <span class="t212Mic">' + saltEsc(M(x.text)) + '</span>' : '') + '</li>'; }).join("") + '</ul>' : '');
  return '<div class="tbBloc saltPoz">' + cap + corp + '<button type="button" class="actionGhost" data-action-click="saltSterge(\'' + saltEsc(p.isin) + '\')"' + (blocat ? ' disabled' : '') + '>Șterge poziția</button></div>';
}
function saltPozGridHtml(d) {
  var poz = Array.isArray(d.pozitii) ? d.pozitii : [], u = Array.isArray(d.univers) ? d.univers : [], an = d.analize || {};
  if (!d.incarcate) return '<p class="sugGol">' + saltEsc(d.eroare ? "Pozițiile nu se pot citi acum - formularul e blocat până merg (ca să nu scriu peste ce ai salvat)." : "aștept pozițiile de pe server…") + '</p>';
  return poz.length ? '<div class="sugGrila">' + poz.map(function (p) { return saltPoz(p, an[p.isin], u.filter(function (x) { return x.isin === p.isin; })[0], !d.incarcate); }).join("") + '</div>' : '<p class="sugGol">n-ai scris încă nicio poziție: o adaugi mai jos.</p>';
}
function saltCartela(titlu, sub, randuri, gol, istoric) {
  var r = (randuri || []).slice(0, 5);
  return '<div class="tbBloc sugCartela"><h4>' + saltEsc(titlu) + '</h4>' + (sub ? '<p class="tbSub">' + saltEsc(sub) + '</p>' : '')
    + (r.length ? '<ul class="sugLista">' + r.map(function (x) { return '<li><b>' + saltEsc(x.s) + '</b> <span class="tbSub">' + saltEsc(x.d) + '</span></li>'; }).join("") + '</ul>' : '<p class="sugGol">' + saltEsc(gol) + '</p>')
    + (istoric ? '<p class="tbSub sugIstoric">' + saltEsc(istoric) + '</p>' : '') + '</div>';
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
function saltHtml(d, acum) {
  d = d || {}; var poz = Array.isArray(d.pozitii) ? d.pozitii : [], r = d.raport, u = Array.isArray(d.univers) ? d.univers : [], an = d.analize || {}, L = r && r.liste || {}, dv = r && r.dovada || {};
  var h = '<p class="rlRasp">Instrumentele Salt Bank (acțiuni și ETF-uri), analizate ca la Trading 212. Salt n-are API: pozițiile sunt cele scrise de tine, iar prețul e cel al bursei principale a simbolului, în moneda ei (la Salt plătești de obicei în euro, pe o bursă germană: alege „EUR” la plată și îl convertesc la cursul din ziua cumpărării).</p>'
    + (d.eroare ? '<p class="tbWarn">' + saltEsc(d.eroare) + '</p>' : '');
  h += '<section class="rlSec"><h4 class="sugCap">💼 Pozițiile mele la Salt</h4><div id="saltPozGrid">' + saltPozGridHtml(d) + '</div>'
    + '<div class="tbBloc saltForm"><h4>Adaugă poziția</h4><div class="saltCampuri">'
    + '<label>Instrumentul <input id="saltInstr" list="saltDl" placeholder="caută după nume, simbol sau ISIN" autocomplete="off"></label>'
    + '<label>Cantitatea <input id="saltQty" inputmode="decimal" placeholder="10"></label>'
    + '<label>Prețul mediu <input id="saltPret" inputmode="decimal" placeholder="180,50"></label>'
    + '<label>Am plătit în <select id="saltPlata"><option value="EUR">EUR (cum plătești la Salt)</option><option value="simbol">moneda simbolului (USD, GBp…)</option></select></label>'
    + '<label>Data cumpărării <input id="saltDe" type="date"></label></div>'
    + '<datalist id="saltDl">' + u.map(function (x) { return '<option value="' + saltEsc(x.nume + " — " + x.simbol + " — " + x.isin + (x.moneda ? " — " + x.moneda : "")) + '"></option>'; }).join("") + '</datalist>'
    + '<button type="button" class="acBtn" data-action-click="saltAdauga()"' + (d.incarcate ? '' : ' disabled') + '>Adaugă poziția</button> <span class="tbSub" id="saltMesaj"></span></div></section>';
  var sim = function (x) { return x.simbol || x.isin; };
  h += '<section class="rlSec"><h4 class="sugCap">📈 Liste pe instrumentele Salt' + (r ? ' <span class="tbSub">· ' + saltEsc((r.judecate || 0) + " judecate" + (r.fara ? ", " + r.fara + " fără prețuri" : "")) + '</span>' : '') + '</h4><div class="sugGrila">'
    + saltCartela("🌱 Început de urcare", "ies dintr-o perioadă liniștită, cu volum", (L.urcare || []).map(function (x) { return { s: sim(x), d: saltP1(x.ruptura) + " peste maximul pe 20 de zile, volum ×" + Number(x.volX || 0).toFixed(1).replace(".", ",") }; }), r ? "nimic azi" : "aștept tura de la 8:00", dv.urcare && dv.urcare.text)
    + saltCartela("↩️ Revers timpuriu", "prima zi de întoarcere după o cădere de 15%+", (L.revers || []).map(function (x) { return { s: sim(x), d: "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim" }; }), r ? "nimic azi" : "aștept tura de la 8:00", dv.revers && dv.revers.text)
    + saltCartela("🔁 Pe revenire", "au scăzut puternic și acum revin", (L.revine || []).map(function (x) { return { s: sim(x), d: "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim, revine" }; }), r ? "nimic azi" : "aștept tura de la 8:00", dv.revine && dv.revine.text)
    + '</div></section>';
  h += '<section class="rlSec"><h4 class="sugCap">📋 Toate instrumentele' + (r && r.tabel ? ' <span class="tbSub">· ' + r.tabel.length + '</span>' : '') + '</h4>'
    + '<label class="saltCautaEt">Caută <input id="saltCauta" data-action-input="saltFiltru()" placeholder="nume, simbol sau ISIN" value="' + saltEsc(d.filtru || "") + '"></label>'
    + '<div id="saltTabel">' + saltTabelHtml(d) + '</div></section>';
  return h;
}
function saltDeseneaza() { var el = typeof document !== "undefined" && document.getElementById("saltPagina"); if (el) el.innerHTML = saltHtml(saltStare.d, Date.now()); }
// revizia: analizele redesenează doar pozițiile - formularul și căutarea își păstrează ce scrii
function saltDeseneazaPoz() { var el = typeof document !== "undefined" && document.getElementById("saltPozGrid"); if (el) el.innerHTML = saltPozGridHtml(saltStare.d); else saltDeseneaza(); }
function saltFiltru() { var i = document.getElementById("saltCauta"), t = document.getElementById("saltTabel"); saltStare.d.filtru = i ? i.value : ""; if (t) t.innerHTML = saltTabelHtml(saltStare.d); }   // doar tabelul: câmpul își păstrează cursorul
async function saltBareDe(s) { var r = await getJSON("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(s)); return GridCalcul.bareToate(r && r.randuri || []); }
// o poziție: barele simbolului + (plătit în EUR) cursul EUR ⇒ moneda simbolului; prețul mediu prea departe de cel de acum ⇒ avertisment
async function saltAnalizeazaUna(p) {
  var u = (saltStare.d.univers || []).filter(function (x) { return x.isin === p.isin; })[0], m = u && u.moneda, b = await saltBareDe(p.simbol), fx = null, pf = Salt.perecheFx(m);
  if (p.plata === "EUR" && pf) { try { fx = await saltBareDe(pf); } catch (e) { fx = null; } }
  var pm = Salt.medieInMonedaSimbolului(p, m, fx); if (pm === null) return { eroare: "fara-curs" };
  var a = Salt.analizeaza(Object.assign({}, p, { pretMediuSimbol: pm }), b, Date.now());
  if (a && a.p) a.avert = Salt.verificaMedie(pm, a.p.pret);
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
    var s = await getJSON("/api/t212?action=salt"); saltStare.d.raport = s && s.raport || null; saltStare.d.pozitii = s && Array.isArray(s.pozitii) ? s.pozitii : []; saltStare.d.incarcate = true; saltStare.d.eroare = null;
    saltStare.la = Date.now();   // revizia (C2): ținut minte doar după o citire reușită
    saltDeseneaza(); await saltAnalize();
  } catch (e) { saltStare.d.eroare = "N-am putut citi pozițiile Salt: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }
  finally { saltStare.inLucru = false; }
  saltDeseneaza();
}
async function saltSalveaza() {
  if (!saltStare.d.incarcate) throw new Error("pozițiile nu s-au citit încă de pe server");   // revizia (C2)
  var r = await apiFetch("/api/t212?action=saltPozitii", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pozitii: saltStare.d.pozitii }) });
  if (!r.ok) throw new Error("HTTP " + r.status);
}
async function saltAdauga() {
  var g = function (id) { var el = document.getElementById(id); return el ? el.value : ""; }, m = document.getElementById("saltMesaj"), u = saltStare.d.univers || [];
  var t = g("saltInstr"), isin = (t.match(/[A-Z]{2}[A-Z0-9]{9}\d/) || [])[0] || (Salt.cauta(u, t)[0] || {}).isin;
  var p = Salt.pozitieCurata({ isin: isin, qty: g("saltQty"), pretMediu: g("saltPret"), de: g("saltDe"), plata: g("saltPlata") }, u);
  if (!p) { if (m) m.textContent = "Alege instrumentul din listă și scrie cantitatea și prețul mediu (numere pozitive; data nu poate fi în viitor)."; return; }
  if (!saltStare.d.incarcate) { if (m) m.textContent = "Pozițiile nu s-au citit încă de pe server: încearcă peste câteva secunde."; return; }
  // verificarea monedei înainte de salvare: prețul mediu prea departe de cel de acum ⇒ nu salvez (revizia I2)
  try { var a = await saltAnalizeazaUna(p); if (a && a.avert) { if (m) m.textContent = a.avert + " Nu l-am salvat."; return; } } catch (e) {}
  var exista = saltStare.d.pozitii.some(function (x) { return x.isin === p.isin; });
  var vechi = saltStare.d.pozitii; saltStare.d.pozitii = vechi.filter(function (x) { return x.isin !== p.isin; }).concat([p]);
  try { await saltSalveaza(); if (m) m.textContent = exista ? "Am înlocuit poziția " + p.simbol + " (am înlocuit poziția, nu am adunat: scrie cantitatea totală și prețul mediu)." : "Am salvat " + p.simbol + "."; saltStare.d.analize[p.isin] = null; saltDeseneazaPoz(); await saltAnalize(); }
  catch (e) { saltStare.d.pozitii = vechi; if (m) m.textContent = "Nu s-a salvat (" + e.message + "): încearcă din nou."; }
}
async function saltSterge(isin) {
  var vechi = saltStare.d.pozitii; saltStare.d.pozitii = vechi.filter(function (x) { return x.isin !== isin; });
  try { await saltSalveaza(); delete saltStare.d.analize[isin]; } catch (e) { saltStare.d.pozitii = vechi; saltStare.d.eroare = "Nu s-a șters pe server (" + e.message + "): poziția rămâne."; }
  saltDeseneaza();
}
