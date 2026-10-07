// v100.120 (el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca pe cele din Trading 212”): pagina „Salt” - pozițiile scrise de el
// (Salt n-are API) cu analiza de la T212 (Salt.analizeaza), formularul, listele pe instrumentele Salt (raportul de la 8:00) și tabelul tuturor.
// v100.125 (el 07.10: „pagina salt vreau să o aduci la nivelul app” → „Ca Trading 212” → OK pe demo): același schelet ca pagina T212 și
// aceleași clase (t212Kpi, t212Todo, t212Tab, t212Pill): cifrele de sus în EUR (cum plătește la Salt, ≈ lei), „Ce ai de făcut acum”, ideile
// de cumpărare cu ACEEAȘI poartă ca la T212 (Idei.judecaActiune, în tura Salt a colectorului) + Biletul, pozițiile în tabel cu detaliile la
// clic, „Vreau să cumpăr…”, portofoliul, toate instrumentele pliate. Rezultatul în EUR la cursul de azi (la NFLX intră și cursul dolarului).
// saltHtml e fără DOM (probele o rulează în vm); saltPorneste aduce universul, raportul, pozițiile, barele, cursurile și indicii pentru beta.
// revizia (C2): „incarcate” - până nu se citesc pozițiile de pe server, formularul e blocat (altfel „Adaugă” ar scrie lista goală peste cea bună)
var saltStare = { d: { univers: null, raport: null, pozitii: [], analize: {}, filtru: "", incarcate: false, eroare: null, eurRon: null, fila: null, deschis: {}, bilet: {}, verif: null }, la: 0, inLucru: false, fx: {}, indici: {} };
var SALT_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], asteapta: ["AȘTEAPTĂ", "t212Pill-fara"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
// beta față de indicele pieței simbolului (prin ETF-uri: serverul nu primește indicii cu „^”); fără indice ⇒ beta 1, ca la T212
var SALT_INDICE = { EUR: { sim: "EXS1.DE", nume: "DAX" }, USD: { sim: "QQQ", nume: "Nasdaq" } };
function saltEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function saltBani1(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"; }   // rezultatele: o zecimală
function saltBani(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"; }
function saltP1(x) { var n = Number(x); if (x == null || !isFinite(n)) return "—"; var r = Math.round(n * 1000) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1).replace(".", ",") + "%"; }
function saltCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
function saltSim(s) { return String(s || "").replace(/\.[A-Z]+$/, ""); }   // RHM.DE ⇒ RHM
function saltMon(m) { return m === "GBp" ? "p" : saltEsc(m || ""); }   // revizia (R3): moneda din raport intră în innerHTML
function saltPret(v, m) { return v == null || !isFinite(Number(v)) ? "—" : saltBani(v) + (m ? " " + saltMon(m) : ""); }
function saltSemn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
function saltSuma1(v, m) { return v == null || !isFinite(v) ? "—" : saltSemn(Math.round(v * 10) / 10) + saltBani1(Math.abs(v)) + " " + saltMon(m || "EUR"); }
function saltLei(v) { return v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString("ro-RO") + " lei"; }
function saltCls(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
// textele Consilierului au prețurile cu „$” (ca pe T212): aici în moneda simbolului, cu mii („$1109.08” ⇒ „1.109,08 EUR”)
function saltInMoneda(t, m) { return String(t == null ? "" : t).replace(/\$(\d[\d,]*(?:\.\d+)?)/g, function (_, n) { return saltPret(Number(n.replace(/,/g, "")), m); }); }

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
  if (!l.length) return '<div class="t212Kpi">' + cel("Ce ai la Salt", "—", "", d.incarcate ? "nicio poziție scrisă" : "aștept pozițiile de pe server…") + cel("Pe pozițiile deschise", "—", "", "") + cel("Dacă piața scade 10%", "—", "", "") + cel("Cea mai mare poziție", "—", "", "") + '</div>';
  var lipsa = l.length - cu.length;
  return '<div class="t212Kpi">'
    + cel("Ce ai la Salt", cu.length ? saltBani1(R.tot) + " EUR" : "—", "", (d.eurRon > 0 && cu.length ? "≈ " + saltLei(R.tot * d.eurRon) + " · " : "") + saltCate(l.length, "poziție", "poziții") + (cost > 0 ? " · plătit " + saltBani1(cost) + " EUR" : "") + (lipsa ? " · " + lipsa + " fără curs încă" : ""))
    + cel("Pe pozițiile deschise", cu.length ? saltSuma1(rez) : "—", saltCls(rez), (cost > 0 ? saltP1(rez / cost) : "—") + lei(rez) + " · " + pe + " din " + cu.length + " pe plus")
    + cel("Dacă piața scade 10%", cu.length ? saltSuma1(soc) : "—", cu.length ? "bad" : "", cu.map(function (r) { return saltSim(r.p.simbol) + " β " + (r.a && r.a.beta != null ? (r.a.beta < 0 ? "−" : "") + Math.abs(r.a.beta).toFixed(2).replace(".", ",") : "—") + (r.a && r.a.indice ? " față de " + r.a.indice : ""); }).join(" · ") + " · beta ≤ 0 se socotește 1, ca la T212")
    + cel("Cea mai mare poziție", max ? saltSim(max.p.simbol) + " · " + Math.round(max.pond * 100) + "%" : "—", max && max.pond > 0.2 ? "bad" : max && max.pond > 0.15 ? "tbWarn" : "", "din ce ai la Salt · plafonul e 20%")
    + '</div>';
}
function saltTodoHtml(R) {
  var todo = [];
  R.l.forEach(function (r) {
    var c = r.a && r.a.cons; if (!c || (c.nivel !== "iesi" && c.nivel !== "atentie")) return;
    var bani = r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, r.m);
    todo.push({ c: c.nivel === "iesi" ? "r" : "g", t: saltSim(r.p.simbol) + ": " + saltInMoneda(c.titlu, r.m) + (r.pct !== null ? "; ești pe " + saltP1(r.pct) + " în EUR" : ""),
      s: saltInMoneda(c.faCe || "", r.m) + " · dacă vinzi acum: " + bani, b: '<button type="button" class="t212BtnLinie" data-action-click="saltVezi(\'' + saltEsc(r.p.isin) + '\')">Vezi ' + saltEsc(saltSim(r.p.simbol)) + '</button>' });
  });
  R.l.filter(function (r) { return r.pond > 0.2; }).forEach(function (r) { todo.push({ c: "g", t: saltSim(r.p.simbol) + " e " + Math.round(r.pond * 100) + "% din ce ai la Salt", s: "Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului.", b: "" }); });
  R.l.filter(function (r) { return !r.p.de; }).forEach(function (r) { todo.push({ c: "n", t: saltSim(r.p.simbol) + ": fără data cumpărării", s: "Stopul care urcă pornește de la prețul de azi: scrie data (Editează) ca să urce de la maximul de după cumpărare.", b: '<button type="button" class="t212BtnLinie" data-action-click="saltEditeaza(\'' + saltEsc(r.p.isin) + '\')">Editează</button>' }); });
  var RT = { r: 0, g: 1, n: 2 }; todo.sort(function (a, b) { return RT[a.c] - RT[b.c]; });
  return '<section class="t212Todo" aria-label="Ce ai de făcut acum"><div class="t212TodoCap"><h4>Ce ai de făcut acum</h4><span class="tbSub">în ordinea urgenței</span></div>'
    + (todo.length ? todo.map(function (x) { return '<div class="t212TodoRand"><span class="t212Dunga ' + x.c + '"></span><div><b>' + saltEsc(x.t) + '</b><p>' + saltEsc(x.s) + '</p></div>' + x.b + '</div>'; }).join("")
      : '<div class="t212TodoRand"><span class="t212Dunga v"></span><div><b>Nimic urgent</b><p>' + (R.l.length ? "Niciuna dintre pozițiile tale n-a atins stopul care urcă." : "Nicio poziție Salt de urmărit.") + '</p></div></div>') + '</section>';
}
function saltIdeeRand(x, d) {
  var m = x.moneda || "", b = d.bilet && d.bilet[x.simbol];
  var rand = '<tr><td><b>' + saltEsc(x.simbol) + '</b><span class="t212Mic">' + saltEsc(String(x.nume || "").slice(0, 44)) + '</span></td>'
    + '<td class="i-pret">' + saltPret(x.pret, m) + '</td><td class="i-intr">' + saltPret(x.intrare, m) + '</td>'
    + '<td class="i-stop bad">' + saltPret(x.stop, m) + '<span class="t212Mic">' + (x.riscPct != null ? "−" + (x.riscPct * 100).toFixed(1).replace(".", ",") + "%, " : "") + 'din probă</span></td><td class="i-tinta good">' + saltPret(x.tinta, m) + '</td>'
    + '<td class="i-ist"><span class="t212Mic">pe istoricul ei, în starea asta: ' + (x.pePlusProba != null ? Math.round(x.pePlusProba * 100) + "% pe plus, " : "") + saltEsc(saltP1(x.scor)) + ' în medie' + (x.nProba ? " (" + saltCate(x.nProba, "zi", "zile") + ")" : "") + '</span>'
    + (x.prob && x.prob.tinta5 != null && x.prob.stop1 != null ? '<span class="t212Mic">🎲 ținta înaintea stopului în 5 zile: ' + Math.round(x.prob.tinta5 * 100) + '% · stopul mâine: ' + Math.round(x.prob.stop1 * 100) + '%</span>' : '')
    + (x.prof && x.prof.dist > 0 ? '<span class="t212Mic' + (x.prof.strans ? ' bad' : '') + '">📐 coborârea obișnuită pe 5 zile −' + (x.prof.dist * 100).toFixed(1).replace(".", ",") + '%' + (x.prof.strans ? ' · stopul ideii e mai strâns: te poate scoate pe o mișcare normală' : ' · stopul e în afara ei') + '</span>' : '')
    + '</td><td class="i-bilet"><button type="button" class="t212BtnLinie" aria-expanded="' + !!b + '" data-action-click="saltBilet(\'' + saltEsc(x.simbol) + '\')">Biletul</button></td></tr>';
  return rand + (b ? '<tr class="saltBiletR"><td colspan="7">' + (b.html || '<p class="tbSub">aduc cursul…</p>') + '</td></tr>' : '');
}
// biletul: la riscul ales (EUR), câte bucăți - riscul pe bucată e intrare − stop, în moneda bursei; fx = 1 EUR în moneda bursei
function saltBiletHtml(x, riscEur, fx) {
  var m = x.moneda || "", dist = x.intrare - x.stop, buc = dist > 0 && fx > 0 ? riscEur * fx / dist : null;
  return '<div class="t212Fac"><b>Biletul ' + saltEsc(x.simbol) + ':</b> cumpără la ' + saltPret(x.intrare, m) + ' · stop ' + saltPret(x.stop, m) + ' · țintă ' + saltPret(x.tinta, m)
    + '<span class="t212Mic">la un risc de ' + Math.round(riscEur) + ' EUR ⇒ ' + (buc !== null ? buc.toLocaleString("ro-RO", { maximumFractionDigits: 3 }) + ' buc ≈ ' + Math.round(buc * x.intrare / fx).toLocaleString("ro-RO") + ' EUR' : '—') + ' · stopul pus la cumpărare, nu „după”</span></div>';
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
    h += '<p class="tbSub saltNota">Aceeași poartă ca la Trading 212: trend în sus pe zilnice, fără mișcare mare, iar pe istoricul ei intrările în starea de acum au ieșit pe plus în medie. Un filtru, nu o predicție; stopul e cel probat pe istoricul ei, prețurile în moneda bursei. Rezultatele trimestriale nu le verific aici.</p>';
    if (!idei) h += '<p class="sugGol">' + saltEsc(r ? "ideile apar după tura colectorului de mâine dimineață (de la v101.83 în sus): până atunci, listele din filele alăturate." : "aștept tura de la 8:00 (colectorul trece prin toată lista o dată pe zi)") + '</p>';
    else if (!idei.length) h += '<p class="sugGol">Azi niciun instrument Salt nu trece de poartă.</p>';
    else h += '<div class="rlTab"><table class="t212Tab saltIdei"><thead><tr><th>Acțiune</th><th>Acum</th><th>Intrare</th><th>Stop</th><th>Țintă</th><th>Istoricul ei</th><th></th></tr></thead><tbody>' + idei.slice(0, 6).map(function (x) { return saltIdeeRand(x, d); }).join("") + '</tbody></table></div>'
      + (idei.length > 6 ? '<details class="saltMaiMult"><summary>Vezi și celelalte ' + (idei.length - 6) + ' care trec de poartă</summary><div class="rlTab"><table class="t212Tab saltIdei"><tbody>' + idei.slice(6).map(function (x) { return saltIdeeRand(x, d); }).join("") + '</tbody></table></div></details>' : '');
  } else {
    var t = { urcare: ["ies dintr-o perioadă liniștită, cu volum", function (x) { return saltP1(x.ruptura) + " peste maximul pe 20 de zile, volum ×" + Number(x.volX || 0).toFixed(1).replace(".", ","); }],
      revers: ["prima zi de întoarcere după o cădere de 15%+", function (x) { return "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim"; }],
      revine: ["au scăzut puternic și acum revin", function (x) { return "−" + Math.round((x.cadere || 0) * 100) + "% de la maxim, revine"; }] }[fila];
    var l = L[fila] || [];
    h += '<p class="tbSub saltNota">' + saltEsc(t[0]) + (dv[fila] && dv[fila].text ? ' · <b>' + saltEsc(dv[fila].text) + '</b>' : '') + '</p>'
      + (l.length ? '<div class="rlTab"><table class="t212Tab saltLista"><thead><tr><th>Instrument</th><th>Acum</th><th>De ce e aici</th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + saltEsc(x.simbol || x.isin) + '</b><span class="t212Mic">' + saltEsc(String(x.nume || "").slice(0, 44)) + '</span></td><td>' + saltPret(x.pret, "") + '</td><td class="saltDece">' + saltEsc(t[1](x)) + '</td></tr>'; }).join("") + '</tbody></table></div>'
        : '<p class="sugGol">' + saltEsc(r ? "nimic azi" : "aștept tura de la 8:00") + '</p>');
  }
  return '<div class="t212Panou saltPanou"><div class="t212PanouCap"><h4>💡 Idei de cumpărare</h4><span class="tbSub">' + (r ? saltEsc("din " + saltCate(r.judecate || 0, "instrument Salt judecat", "instrumente Salt judecate") + (r.la ? " pe " + new Date(r.la).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" }) : "") + (idei ? ", " + idei.length + " trec de poartă" : "")) : "") + '</span></div>' + h
    + '<p class="tbSub saltNota">Frecvențele vin din trecut și nu sunt promisiuni; trendul se măsoară pe bare zilnice închise.</p></div>';
}
function saltPozRandHtml(r, d) {
  var a = r.a, p = r.p, isin = saltEsc(p.isin), des = !!(d.deschis && d.deschis[p.isin]), m = r.m;
  var qty = Number(p.qty).toLocaleString("ro-RO", { maximumFractionDigits: 5 }), de = p.de ? p.de.slice(8, 10) + "." + p.de.slice(5, 7) + "." + p.de.slice(0, 4) : null;
  var cap = '<td><div class="t212Sim">' + (a && a.cons ? '<span class="t212Pill ' + (SALT_NIVEL[a.cons.nivel] || SALT_NIVEL["fara-date"])[1] + '">' + (SALT_NIVEL[a.cons.nivel] || SALT_NIVEL["fara-date"])[0] + '</span>' : '<span class="t212Pill t212Pill-fara">' + (a && a.eroare ? "FĂRĂ DATE" : "…") + '</span>')
    + '<div><b>' + saltEsc(p.simbol) + '</b><span class="t212Mic">' + saltEsc(String(p.nume || "").slice(0, 40)) + '</span><span class="t212Mic">' + saltEsc(qty + " buc · mediu " + saltBani(p.pretMediu) + " " + (p.plata === "EUR" ? "EUR" : saltMon(m)) + (de ? " · din " + de : "")) + '</span></div></div></td>';
  if (!a || a.eroare) {
    var mes = !a ? "aștept prețurile…" : a.eroare === "fara-bare" ? "n-am prețurile simbolului (Yahoo)" : a.eroare === "fara-curs" ? "n-am cursul EUR pentru moneda simbolului" : "nu pot analiza acum";
    return '<tr class="t212Rand">' + cap + '<td colspan="6" class="tbSub" style="text-align:left">' + saltEsc(mes) + '</td></tr>';
  }
  var c = a.cons || {}, n = a.niv, pr = r.pret, tr = a.st && a.st.trend && a.st.trend.dir, atins = n && pr < n.stopPozitie;
  var rand = '<tr class="t212Rand" id="saltR-' + isin + '" tabindex="0" aria-expanded="' + des + '" data-action-click="saltComuta(\'' + isin + '\')">' + cap
    + '<td class="c-acum">' + saltPret(pr, m) + (m !== "EUR" && r.fx ? '<span class="t212Mic">≈ ' + saltBani(pr / r.fx) + ' EUR</span>' : '') + '</td>'
    + '<td class="c-rez"><b class="' + saltCls(r.rez !== null ? r.rez : r.rezM) + '">' + (r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, m)) + '</b><span class="t212Mic">' + (r.pct !== null ? saltP1(r.pct) + " în EUR · " : "") + 'preț ' + saltP1(pr / a.p.pretMediu - 1) + '</span></td>'
    + '<td class="c-stop" data-et="Stop">' + (n ? '<span class="' + (atins ? "bad" : "") + '">' + saltPret(n.stopPozitie, m) + '</span><span class="t212Mic">' + (atins ? "DEPĂȘIT" : saltP1(n.stopPozitie / pr - 1) + " de acum") + '</span>' : '—') + '</td>'
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
    + (c.faCe ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + saltEsc(saltInMoneda(c.faCe, m)) + '<span class="t212Mic">dacă vinzi acum: ' + saltEsc(r.rez !== null ? saltSuma1(r.rez) : saltSuma1(r.rezM, m)) + (restBani ? " · " + saltEsc(restBani) : "") + '</span></p>' : '')
    + '<p class="tbSub">' + saltEsc(qty + " buc · plătit " + saltBani(p.pretMediu) + " " + (p.plata === "EUR" ? "EUR" : saltMon(m)) + " pe bucată" + (de ? " pe " + de : "") + (p.plata === "EUR" && m && m !== "EUR" ? " (= " + saltBani(a.p.pretMediu) + " " + saltMon(m) + (de ? " la cursul din ziua cumpărării" : " la cursul de azi") + (r.fx ? "; azi 1 EUR = " + (r.fx / (m === "GBp" ? 100 : 1)).toFixed(4).replace(".", ",") + " " + (m === "GBp" ? "GBP" : m) : "") + ")" : "")) + '</p>'
    + (!p.de ? '<p class="tbSub">Fără data cumpărării, stopul care urcă pornește de la prețul de azi: scrie data ca să urce de la maximul de după cumpărare.</p>' : '')
    + '<p class="saltDetBut"><button type="button" class="t212BtnLinie" data-action-click="saltEditeaza(\'' + isin + '\')">Editează</button> <button type="button" class="t212BtnLinie" data-action-click="saltSterge(\'' + isin + '\')"' + (d.incarcate ? '' : ' disabled') + '>Șterge poziția</button></p>'
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
  return '<details class="saltForm" id="saltFormDet"><summary>Adaugă o poziție</summary><div class="saltCampuri">'
    + '<label>Instrumentul <input id="saltInstr" list="saltDl" placeholder="caută după nume, simbol sau ISIN" autocomplete="off"></label>'
    + '<label>Cantitatea <input id="saltQty" inputmode="decimal" placeholder="10"></label>'
    + '<label>Prețul mediu <input id="saltPret" inputmode="decimal" placeholder="180,50"></label>'
    + '<label>Am plătit în <select id="saltPlata"><option value="EUR">EUR (cum plătești la Salt)</option><option value="simbol">moneda simbolului (USD, GBp…)</option></select></label>'
    + '<label>Data cumpărării <input id="saltDe" type="date"></label></div>'
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
    + (v.ai ? '<p class="t212Mic">' + (v.nivel === "iesi" ? "Pe ea o ai deja la Salt și e pe IEȘI: n-aș cumpăra în plus până nu se lămurește poziția de acum." : "Pe ea o ai deja la Salt: cumpărând în plus, crește cât din Salt stă în ea (plafonul e 20%).") + '</p>' : '') + '</div>';
}
function saltDreaptaHtml(d, R) {
  var cu = R.l.filter(function (r) { return r.pond !== null; }).sort(function (a, b) { return b.pond - a.pond; });
  var toateIesi = R.l.length && R.l.every(function (r) { return r.a && r.a.cons && r.a.cons.nivel === "iesi"; }), max = cu[0];
  var sfat = !d.incarcate ? "Aștept pozițiile de pe server." : !R.l.length ? "N-ai scris încă nicio poziție Salt." : toateIesi ? "Toate pozițiile sunt pe IEȘI: le-aș închide (tot sau jumătate) înainte să adaug ceva nou, iar banii i-aș pune doar pe o idee care trece de poartă."
    : max && max.pond > 0.2 ? "Aș ține " + saltSim(max.p.simbol) + " sub 20% din ce ai la Salt (acum " + Math.round(max.pond * 100) + "%)." : "Aș păstra împărțirea: fiecare poziție e sub 20%.";
  return '<div class="t212Panou saltPanou"><div class="t212PanouCap"><h4>🛒 Vreau să cumpăr…</h4><span class="tbSub">doar long · orice instrument Salt</span></div>'
    + '<div class="saltCauta"><input id="saltVreauIn" list="saltDl" placeholder="simbol sau nume, ex. DELL" autocomplete="off"><button type="button" class="t212Btn t212BtnPlin" data-action-click="saltVerifica()">Verifică</button></div><div id="saltVreau">' + saltVreauHtml(d.verif) + '</div></div>'
    + '<div class="t212Panou saltPanou" id="saltPf"><div class="t212PanouCap"><h4>Portofoliul Salt</h4><span class="tbSub">' + (R.tot > 0 ? saltBani1(R.tot) + " EUR" : "") + '</span></div>'
    + (cu.length ? cu.map(function (r) { var w = r.pond > 0.2 ? " rau" : r.pond > 0.15 ? " atentie" : ""; return '<div class="t212Bara"><span>' + saltEsc(saltSim(r.p.simbol)) + '</span><div class="t212BaraFond"><div class="t212BaraPlin' + w + '" style="width:' + Math.max(1, Math.min(100, r.pond / 0.3 * 100)).toFixed(1) + '%"></div></div><b>' + Math.round(r.pond * 100) + '%</b></div>'; }).join("")
      + '<p class="tbSub t212PfNota">Bara plină = 30% din ce ai la Salt. Galben peste 15%, roșu peste 20%.</p>' : '<p class="tbSub">—</p>')
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
  d = d || {}; var R = saltRanduri(d), r = d.raport, tb = r && Array.isArray(r.tabel) ? r.tabel : [];
  return (d.eroare ? '<p class="tbWarn">' + saltEsc(d.eroare) + '</p>' : '')
    + '<div id="saltSus">' + saltSusHtml(d, R) + '</div>'
    + '<div id="saltIdeiBox">' + saltIdeiHtml(d) + '</div>'
    + '<div class="t212Grila"><div class="saltStanga"><div class="t212Panou saltPanou"><div class="t212PanouCap"><h4>Pozițiile mele la Salt</h4><span class="tbSub">apasă pe un rând pentru detalii · rezultatul în EUR, cum ai plătit</span></div>'
    + '<div id="saltPozBox">' + saltPozHtml(d, R) + '</div>' + saltFormHtml(d) + '</div></div>'
    + '<div class="t212Side saltDreapta" id="saltDreapta">' + saltDreaptaHtml(d, R) + '</div></div>'
    + '<details class="t212Panou saltPanou saltToate"><summary><b>Toate instrumentele Salt' + (tb.length ? ' · ' + tb.length : '') + '</b> <span class="tbSub">caută după nume, simbol sau ISIN</span></summary>'
    + '<label class="saltCautaEt">Caută <input id="saltCauta" data-action-input="saltFiltru()" placeholder="nume, simbol sau ISIN" value="' + saltEsc(d.filtru || "") + '"></label>'
    + '<div id="saltTabel">' + saltTabelHtml(d) + '</div></details>'
    + '<p class="tbSub saltSubsol">Salt n-are API: pozițiile sunt cele scrise de tine, iar prețul e al bursei principale a simbolului, în moneda ei. Analiza e aceeași ca la Trading 212 (semaforul, stopul care urcă de cel puțin 15% de la maxim, ținta, Consilierul). Rezultatul e în EUR la cursul de azi: la acțiunile în altă monedă intră și cursul.</p>';
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
function saltDeseneaza() { var el = saltEl("saltPagina"); if (el) el.innerHTML = saltHtml(saltStare.d, Date.now()); }
// revizia: analizele redesenează doar cifrele, pozițiile și portofoliul - formularul, căutarea și „Vreau să cumpăr” își păstrează ce scrii
function saltDeseneazaPoz() {
  var d = saltStare.d, R = saltRanduri(d), s = saltEl("saltSus"), p = saltEl("saltPozBox"), pf = saltEl("saltPf");
  if (!s || !p) { saltDeseneaza(); return; }
  s.innerHTML = saltSusHtml(d, R); p.innerHTML = saltPozHtml(d, R);
  if (pf) { var tmp = document.createElement("div"); tmp.innerHTML = saltDreaptaHtml(d, R); var nou = tmp.querySelector("#saltPf"); if (nou) pf.replaceWith(nou); }
}
function saltDeseneazaIdei() { var el = saltEl("saltIdeiBox"); if (el) el.innerHTML = saltIdeiHtml(saltStare.d); }
function saltFiltru() { var i = saltEl("saltCauta"), t = saltEl("saltTabel"); saltStare.d.filtru = i ? i.value : ""; if (t) t.innerHTML = saltTabelHtml(saltStare.d); }   // doar tabelul: câmpul își păstrează cursorul
function saltFila(k) { saltStare.d.fila = k; saltDeseneazaIdei(); }
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
    var s = await getJSON("/api/t212?action=salt"); saltStare.d.raport = s && s.raport || null; saltStare.d.pozitii = s && Array.isArray(s.pozitii) ? s.pozitii : []; saltStare.d.incarcate = true; saltStare.d.eroare = null;
    saltStare.la = Date.now();   // revizia (C2): ținut minte doar după o citire reușită
    var ch = saltEl("saltChip"); if (ch) ch.textContent = "citit la " + new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + (saltStare.d.raport && saltStare.d.raport.la ? " · raportul de la " + new Date(saltStare.d.raport.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "") + " · pozițiile le scrii tu (Salt n-are API)";
    saltDeseneaza();
    try { var er = await saltBareDe("EURRON=X"); saltStare.d.eurRon = er.length ? er[er.length - 1].c : null; } catch (e) { saltStare.d.eurRon = null; }
    await saltAnalize();
  } catch (e) { saltStare.d.eroare = "N-am putut citi pozițiile Salt: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }
  finally { saltStare.inLucru = false; }
  if (saltStare.d.eroare) saltDeseneaza(); else saltDeseneazaPoz();   // revizia (R4): pe drumul bun doar cifrele și pozițiile - ce scrii în formular / „Vreau” rămâne
}
async function saltSalveaza() {
  if (!saltStare.d.incarcate) throw new Error("pozițiile nu s-au citit încă de pe server");   // revizia (C2)
  var r = await apiFetch("/api/t212?action=saltPozitii", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pozitii: saltStare.d.pozitii }) });
  if (!r.ok) throw new Error("HTTP " + r.status);
}
async function saltAdauga() {
  var g = function (id) { var el = saltEl(id); return el ? el.value : ""; }, m = saltEl("saltMesaj"), u = saltStare.d.univers || [];
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
  try { await saltSalveaza(); delete saltStare.d.analize[isin]; delete saltStare.d.deschis[isin]; } catch (e) { saltStare.d.pozitii = vechi; saltStare.d.eroare = "Nu s-a șters pe server (" + e.message + "): poziția rămâne."; }
  saltDeseneaza();
}
