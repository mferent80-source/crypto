// Ecranul Trading 212 (v85): cardul "Contul meu Trading 212" din US Stocks si jurnalul de actiuni din
// Jurnal de trade (filtrul Crypto / Actiuni / Tot). Doar CITIRE: cheia T212 e doar de citire si sta acasa.
// Foloseste din app.js: $, getJSON, apiFetch, escapeHtml, toast; din lib: GridCalcul, T212, ActiuniSemnale.
// Calculele stau in lib (probate in scripts/t212-v85.mjs si scripts/actiuni-v85.mjs); aici doar se arata.
var t212 = { dividende: null, rezultate: {}, niveluri: {}, simbolPret: {}, cont: null, poz: null, istoric: null, istoricEroare: null, bare: {}, planuri: {}, beta: {}, la: 0, inLucru: false, eroare: null, poarta: null };
var T212_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
var T212_POARTA = { cumpara: ["🟢 CUMPĂR", "good"], asteapta: ["🟡 AȘTEAPTĂ", "tbWarn"], nu: ["🔴 NU ACUM", "bad"], "fara-date": ["⚪ FĂRĂ DATE", ""] };

function t212Lei(v, z) { if (v === null || v === undefined || !isFinite(v)) return "—"; return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("ro-RO", { minimumFractionDigits: z === undefined ? 0 : z, maximumFractionDigits: z === undefined ? 0 : z }) + " lei"; }
function t212Suma(v) { return v === null || v === undefined || !isFinite(v) ? "—" : Math.round(v).toLocaleString("ro-RO") + " lei"; }
function t212Pct(v) { return v === null || v === undefined || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
function t212Usd(v) { return v === null || v === undefined || !isFinite(v) ? "—" : "$" + (v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(3) : v.toPrecision(3)); }
function t212ZiScurta(iso) { var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + "." + m[2] : "—"; }
function t212Cls(v) { return v === null || v === undefined || !isFinite(v) ? "" : v >= 0 ? "good" : "bad"; }
function t212Nr(v) { var x = Number(String(v === null || v === undefined ? "" : v).replace(",", ".").trim()); return String(v || "").trim() && isFinite(x) && x > 0 ? x : null; }
function t212Eroare(e) { var m = e && e.message || String(e); return /503|PUNE-CHEILE|Lipsesc T212/.test(m) ? "Lipsesc cheile Trading 212 pe serverul de acasă: pornește PUNE-CHEILE-T212.bat, apoi repornește Radarul." : /401|AUTH/.test(m) ? "Serverul a cerut parola aplicației (Setări)." : m; }

async function t212Porneste(forta) {
  if (t212.inLucru) return;
  if (!forta && t212.la && Date.now() - t212.la < 60000) { t212Render(); return; }
  t212.inLucru = true; t212.eroare = null; t212Stare("citesc contul din Trading 212…");
  try {
    t212.cont = await getJSON("/api/t212?action=cont");
    var p = await getJSON("/api/t212?action=pozitii");
    t212.poz = (p && Array.isArray(p.pozitii) ? p.pozitii : []).filter(function (x) { return x && x.quantity > 0; });
  } catch (e) { t212.eroare = t212Eroare(e); }
  try { t212.istoric = await getJSON("/api/t212?action=istoric"); t212.istoricEroare = null; } catch (e) { t212.istoric = null; t212.istoricEroare = t212Eroare(e); }
  try { var cf = await getJSON("/api/t212?action=cf"); t212.cf = cf && cf.cf || {}; } catch (e) { t212.cf = null; }
  try { var dv = await getJSON("/api/t212?action=dividende"); t212.dividende = T212.dividende(dv && dv.items || []); } catch (e) { t212.dividende = null; }
  t212JurnalCache.n = -1;
  t212.la = Date.now(); t212Render();
  if (!t212.eroare && t212.poz) {
    for (var i = 0; i < t212.poz.length; i++) {
      var tk = t212.poz[i].ticker;
      if (!t212.rezultate[tk]) { try { t212.rezultate[tk] = await getJSON("/api/t212?action=rezultate&ticker=" + encodeURIComponent(tk)); } catch (e) { t212.rezultate[tk] = { data: null }; } }
      try { var pl = await getJSON("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk)); t212.planuri[tk] = pl && pl.plan || null; } catch (e) { t212.planuri[tk] = t212.planuri[tk] || null; }
      if (!t212.bare[tk] || forta) { try { var nm = t212Nume(tk), b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk) + (nm ? "&nume=" + encodeURIComponent(nm) : "")); t212.simbolPret[tk] = b && b.simbol || null; t212.bare[tk] = GridCalcul.bare(b && b.randuri || []); } catch (e) { t212.bare[tk] = []; } }
      t212Render();
    }
    if (!t212.bare.QQQ_US_EQ) { try { var q = await getJSON("/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ"); t212.bare.QQQ_US_EQ = GridCalcul.bare(q && q.randuri || []); } catch (e) { t212.bare.QQQ_US_EQ = []; } }
    t212.poz.forEach(function (x) { t212.beta[x.ticker] = ActiuniSemnale.beta(t212.bare[x.ticker], t212.bare.QQQ_US_EQ); });
  }
  t212.inLucru = false; t212Render();
  if (typeof jtRenderActiuni === "function") jtRenderActiuni();
}
// v86: Trading 212 are PAGINA LUI (ca Tabloul botului): fara bara de cautare, blocul "AAPL" si filele de
// deasupra - "fa la fel toata pagina" (25.09). Merge din orice mod, Crypto sau US Stocks.
function deschideT212() {
  navTo("t212", true);
  if (typeof window.scrollTo === "function") window.scrollTo(0, 0);
}
function t212Nume(tk) {
  var u = t212.istoric && t212.istoric.umpleri || [];
  for (var i = u.length - 1; i >= 0; i--) if (u[i].ticker === tk && u[i].nume && u[i].nume !== tk) return u[i].nume;
  return "";
}
function t212Stare(t) { var e = $("t212Stare"); if (e) e.textContent = t; }

// Pozitia, gata de judecat: pretul mediu si pretul de acum sunt in dolari (moneda actiunii)
function t212Pozitie(x) {
  var tk = x.ticker, b = t212.bare[tk] || [], de = Date.parse(x.initialFillDate || ""), mx = null;
  if (b.length && isFinite(de)) b.forEach(function (z) { if (z.t + 86400000 > de) mx = mx === null ? z.h : Math.max(mx, z.h); });
  if (mx !== null && x.currentPrice > mx) mx = x.currentPrice;
  return { ticker: tk, simbol: T212.simbol(tk), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, ppl: x.ppl, plan: t212.planuri[tk] || null, maxDupaCumparare: mx, de: de };
}

// ---------------- preturile calculate (v85.2): stop, tinta, intrare, marime ----------------
// Dolari pe leu, din cea mai noua umplere pe o actiune americana (T212 da fxRate in walletImpact)
function t212Fx() {
  var u = t212.istoric && t212.istoric.umpleri || [];
  for (var i = u.length - 1; i >= 0; i--) if (/_US_EQ$/.test(u[i].ticker) && u[i].fx > 0) return u[i].fx;
  return null;
}
function t212ProbaText(n) {
  var pr = n.proba;
  return "stop la " + String(n.k).replace(".", ",") + "× mișcarea obișnuită pe zi (ATR $" + t212Usd(n.atr).slice(1) + ")" + (Math.abs(n.d - n.k * n.atr) > 1e-9 ? ", ținut între 3% și 15%" : "")
    + " · probat pe " + pr.n + " zile din ultimul an" + (pr.conditionat ? " cu trendul ca acum" : "") + ": " + Math.round(pr.pePlus * 100) + "% pe plus, " + (pr.medie !== null && Math.abs(pr.medie) < 0.001 ? (pr.medie >= 0 ? "+" : "−") + Math.abs(pr.medie * 100).toFixed(2).replace(".", ",") + "%" : t212Pct(pr.medie)) + " în medie după comision";
}
async function t212PlanSalveaza(tk) {
  var g = function (p) { var e = $(p + tk); return e ? t212Nr(e.value) : null; };
  var plan = { stop: g("t212Stop-"), tinta: g("t212Tinta-"), trailPct: g("t212Trail-") }, gol = plan.stop === null && plan.tinta === null && plan.trailPct === null;
  try {
    var r = await apiFetch("/api/istoric-bot?action=plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bot: "t212-" + tk, plan: gol ? null : plan }) });
    var d = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error(d && d.error || "HTTP " + r.status);
    t212.planuri[tk] = d && d.plan || null; t212Render();
    toast(gol ? "Planul e șters" : "Planul e salvat; colectorul de acasă te anunță când prețul îl atinge", "good");
  } catch (e) { toast("Planul nu s-a salvat: " + t212Eroare(e), "bad"); }
}

// v85.3: ecranul reasezat dupa demo (25.09) - rezumatul pe un rand, "Ce ai de facut acum" in ordinea
// urgentei, pozitiile intr-un tabel dens (un rand pe actiune, detaliile la clic), poarta + portofoliul alaturi.
// Procentul principal e cel IN LEI, ca in Trading 212 (include cursul dolar/leu: fxPpl); pretul in dolari ramane
// langa el si ramane baza stopurilor (la el se executa ordinul).
var T212_ORDINE = { iesi: 0, atentie: 1, "fara-date": 2, tine: 3 };
t212.deschis = t212.deschis || {};

// Costul in lei al bucatilor deschise, din loturile FIFO ale istoricului (net = cu comisionul de conversie).
// Daca bucatile din istoric nu se potrivesc cu pozitia (istoric incomplet) -> null, nu un procent inventat.
function t212CostLei(tk, qty) {
  var j = t212Jurnal(); if (!j) return null;
  var q = 0, cost = 0;
  j.p.deschise.forEach(function (l) { if (l.ticker === tk) { q += l.qty; cost += l.qty * l.costBuc; } });
  if (!(q > 0) || Math.abs(q - qty) / qty > 0.02) return null;
  return cost * qty / q;
}
function t212PregatesteP(x, pond) {
  var p = t212Pozitie(x), b = t212.bare[p.ticker] || [];
  p.st = ActiuniSemnale.stare(b, p.pret); p.sem = ActiuniSemnale.semafor(p, p.st);
  var n = b.length ? ActiuniSemnale.niveluri(b, p.pret, { pretMediu: p.pretMediu, maxDupaCumparare: p.maxDupaCumparare }) : null;
  p.niv = n && n.nivel === "ok" ? n : null; if (p.niv) t212.niveluri[p.ticker] = p.niv;
  p.nivMotiv = n && n.nivel !== "ok" ? n.motiv : null;
  p.cost = t212CostLei(p.ticker, p.qty); p.pctLei = p.cost ? p.ppl / p.cost : null; p.fxPpl = x.fxPpl;
  p.pond = pond[p.ticker] || null;
  return p;
}
function t212Comuta(tk) { t212.deschis[tk] = !t212.deschis[tk]; var d = $("t212Det-" + tk), r = $("t212R-" + tk); if (d) d.hidden = !t212.deschis[tk]; if (r) r.setAttribute("aria-expanded", String(!!t212.deschis[tk])); }
function t212Deschide(tk) {
  t212.deschis[tk] = true; var d = $("t212Det-" + tk), r = $("t212R-" + tk); if (d) d.hidden = false;
  if (r) { r.setAttribute("aria-expanded", "true"); if (r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" }); }
}

function t212Render() {
  var sus = $("t212Sus"), box = $("t212Continut"), pfBox = $("t212Pf"); if (!box) return;
  if (t212.inLucru && !t212.cont) { t212Stare("citesc contul din Trading 212…"); return; }
  if (t212.eroare) { if (sus) sus.innerHTML = ""; box.innerHTML = '<p class="bad t212Gol">' + escapeHtml(t212.eroare) + '</p>'; t212Stare("n-am putut citi contul"); return; }
  if (!t212.cont) { box.innerHTML = '<div class="emptyState">Apasă „Reîncarcă”.</div>'; return; }
  var c = t212.cont.cash || {}, j = t212Jurnal();
  t212Stare((t212.inLucru ? "aduc prețurile… · " : "") + "citit la " + new Date(t212.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + " · doar citire");
  // portofoliul intai: ponderile intra in tabel si in "ce ai de facut"
  var brute = t212.poz || [], totUsd = 0; brute.forEach(function (x) { totUsd += x.quantity * x.currentPrice; });
  var investit = c.total > 0 && c.free >= 0 ? c.total - c.free : null;
  var pf = ActiuniSemnale.portofoliu(brute.map(function (x) { return { simbol: T212.simbol(x.ticker), ticker: x.ticker, valoare: investit !== null && totUsd > 0 ? x.quantity * x.currentPrice / totUsd * investit : 0, beta: t212.beta[x.ticker] }; }), c.free), pond = {};
  pf.pozitii.forEach(function (r, i) { pond[r.simbol] = r.pondere; });
  brute.forEach(function (x) { pond[x.ticker] = pond[T212.simbol(x.ticker)]; });
  var poz = brute.map(function (x) { return t212PregatesteP(x, pond); }).sort(function (a, b) { return (T212_ORDINE[a.sem.nivel] - T212_ORDINE[b.sem.nivel]) || (a.ppl - b.ppl); });
  var pe = poz.filter(function (p) { return p.ppl > 0; }).length;

  // 1) rezumatul pe un rand
  var cel = function (et, v, cls, sub) { return '<div class="t212Cel"><span class="t212Et">' + escapeHtml(et) + '</span><b class="t212Val ' + (cls || "") + '">' + escapeHtml(v) + '</b><span class="tbSub">' + sub + '</span></div>'; };
  var h = '<div class="t212Kpi">' + cel("Contul", t212Suma(c.total), "", "liber " + escapeHtml(t212Suma(c.free)) + (pf.cash !== null ? " · " + escapeHtml(t212Pct(pf.cash).replace("+", "")) : ""))
    + cel("Pe pozițiile deschise", t212Lei(c.ppl), t212Cls(c.ppl), poz.length + " poziții · " + pe + " pe plus")
    + (j ? cel("Câștigat real, închise", t212Lei(j.r.total), t212Cls(j.r.total), 'T212 arată <span class="t212Muted">' + escapeHtml(t212Lei(c.result).replace(" lei", "")) + '</span> · comisioane ' + escapeHtml(t212Lei(-j.r.comisioane).replace(" lei", "")) + (t212.dividende && t212.dividende.n ? ' · dividende ' + escapeHtml(t212Lei(t212.dividende.total, 2).replace(" lei", "")) : ''))
      : cel("Rezultat (după T212)", t212Lei(c.result), t212Cls(c.result), escapeHtml(t212.istoricEroare || "fără comisioanele de conversie; istoricul se strânge acasă")))
    + cel("Dacă Nasdaq scade 10%", poz.length ? t212Lei(pf.soc) : "—", poz.length ? "bad" : "", "beta din QQQ, pe fiecare acțiune") + '</div>';

  // 2) ce ai de facut acum, in ordinea urgentei
  var todo = [], fara = poz.filter(function (p) { return p.niv && !p.plan; });
  poz.filter(function (p) { return p.sem.nivel === "iesi"; }).forEach(function (p) {
    todo.push({ c: "r", t: p.simbol + (p.niv && p.niv.stopAtins ? " a coborât sub stopul calculat (" + t212Usd(p.niv.stopPozitie) + ")" : ": " + (p.sem.motive[0] || "de ieșit")), s: t212Lei(p.ppl) + (p.pctLei !== null ? " (" + t212Pct(p.pctLei) + ")" : "") + ". " + p.sem.ceAsFace.replace(/^👉 Ce aș face eu: /, ""), b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + escapeHtml(p.ticker) + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  if (fara.length) todo.push({ c: "g", t: (fara.length === poz.length ? "Toate " + fara.length + " pozițiile sunt" : fara.length + (fara.length === 1 ? " poziție e" : " poziții sunt")) + " fără plan", s: "Stopurile și țintele sunt deja calculate pentru fiecare. Colectorul te anunță când se ating.", b: '<button type="button" class="t212Btn t212BtnPlin" id="t212PuneToate" data-action-click="t212PuneToate()">Pune planurile la ' + (fara.length === 1 ? "ea" : "toate " + fara.length) + '</button>' });
  poz.filter(function (p) { return p.pond > 0.2; }).forEach(function (p) {
    todo.push({ c: "g", t: p.simbol + " e " + Math.round(p.pond * 100) + "% din cont", s: "Peste plafonul de 20%. O zi proastă a ei e ziua proastă a contului.", b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + escapeHtml(p.ticker) + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  var slabe = poz.filter(function (p) { return p.niv && p.niv.proba.medie !== null && p.niv.proba.medie <= 0; }).map(function (p) { return p.simbol; });
  if (slabe.length) todo.push({ c: "n", t: slabe.join(" și ") + ": proba pe istoric e pe minus în starea de acum", s: "Stopul calculat doar limitează pierderea. N-aș adăuga la " + (slabe.length === 1 ? "ea" : "ele") + ".", b: "" });
  // v87: frana de "cumparat in jos" (ultimele 7 zile) si rezultatele trimestriale in urmatoarele 10 zile
  var jos7 = t212.istoric && Array.isArray(t212.istoric.umpleri) ? ActiuniSemnale.cumparariInJos(t212.istoric.umpleri).filter(function (x) { return Date.now() - x.t < 7 * 86400000; }) : [];
  jos7.slice(-3).reverse().forEach(function (x) { var a = ActiuniSemnale.alertaFrana(x, T212.simbol(x.ticker)); todo.push({ c: a.nivel === "critic" ? "r" : "g", t: a.titlu + " · " + new Date(x.t).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" }), s: a.mesaj, b: "" }); });
  poz.forEach(function (p) {
    var r = t212.rezultate[p.ticker], zile = r && r.data ? Math.ceil((Date.parse(r.data + "T12:00:00Z") - Date.now()) / 86400000) : null;
    if (zile !== null && zile >= 0 && zile <= 10) todo.push({ c: "n", t: p.simbol + " își anunță rezultatele pe " + t212ZiScurta(r.data) + (zile === 0 ? " (azi)" : zile === 1 ? " (mâine)" : " (peste " + zile + " zile)"), s: "Prețul poate sări 10–20% într-o noapte, în orice direcție. 👉 Aș avea stopul pus înainte și n-aș cumpăra în plus chiar înainte de anunț.", b: '<button type="button" class="t212BtnLinie" data-action-click="t212Deschide(\'' + escapeHtml(p.ticker) + '\')">Vezi ' + escapeHtml(p.simbol) + '</button>' });
  });
  var RT = { r: 0, g: 1, n: 2, v: 3 }; todo.sort(function (a, b) { return RT[a.c] - RT[b.c]; });
  h += '<section class="t212Todo" aria-label="Ce ai de făcut acum"><div class="t212TodoCap"><h4>Ce ai de făcut acum</h4><span class="tbSub">în ordinea urgenței</span></div>'
    + (todo.length ? todo.map(function (x) { return '<div class="t212TodoRand"><span class="t212Dunga ' + x.c + '"></span><div><b>' + escapeHtml(x.t) + '</b><p>' + escapeHtml(x.s) + '</p></div>' + x.b + '</div>'; }).join("")
      : '<div class="t212TodoRand"><span class="t212Dunga v"></span><div><b>Nimic urgent</b><p>' + (poz.length ? "Toate pozițiile au plan și niciuna n-a atins stopul." : "N-ai poziții deschise.") + '</p></div></div>') + '</section>';
  if (sus) sus.innerHTML = h;

  // 3) pozitiile: un rand pe actiune, detaliile la clic
  if (!poz.length) box.innerHTML = '<p class="tbSub t212Gol">N-ai poziții deschise în Trading 212.</p>';
  else box.innerHTML = '<div class="t212TabWrap"><table class="t212Tab"><thead><tr><th>Acțiune</th><th>Acum</th><th>Rezultat</th><th>Stop calculat</th><th>Țintă</th><th>Trend</th><th>Din cont</th><th>Plan</th></tr></thead><tbody>'
    + poz.map(t212RandPozitie).join("") + '</tbody></table></div>';

  // 4) portofoliul, in coloana din dreapta
  if (pfBox) {
    var sub = $("t212PfSub"); if (sub) sub.textContent = pf.cash !== null ? "cash " + t212Pct(pf.cash).replace("+", "") : "";
    pfBox.innerHTML = !poz.length ? '<p class="tbSub">—</p>' : pf.pozitii.map(function (r) {
      var w = r.pondere > 0.2 ? " rau" : r.pondere > 0.15 ? " atentie" : "";
      return '<div class="t212Bara"><span>' + escapeHtml(r.simbol) + '</span><div class="t212BaraFond"><div class="t212BaraPlin' + w + '" style="width:' + Math.max(1, Math.min(100, (r.pondere || 0) / 0.3 * 100)).toFixed(1) + '%"></div></div><b>' + Math.round((r.pondere || 0) * 100) + '%</b></div>';
    }).join("") + '<p class="tbSub t212PfNota">Bara plină = 30% din cont. Galben peste 15%, roșu peste 20%.</p><p class="t212Fac">' + escapeHtml(pf.ceAsFace) + '</p>';
  }
  t212RenderPoarta();
  if (typeof contTotRender === "function") contTotRender();
}

function t212RandPozitie(p) {
  var niv = T212_NIVEL[p.sem.nivel] || T212_NIVEL["fara-date"], n = p.niv, tk = escapeHtml(p.ticker), pl = p.plan || {}, des = !!t212.deschis[p.ticker];
  var pctPret = p.pret / p.pretMediu - 1, tr = p.st.trend.dir;
  var planTxt = p.plan ? [pl.trailPct ? "−" + String(pl.trailPct).replace(".", ",") + "% de la max" : "", pl.stop ? "stop " + t212Usd(pl.stop) : "", pl.tinta ? "țintă " + t212Usd(pl.tinta) : ""].filter(Boolean).join(" · ") : "";
  var w = p.pond > 0.2 ? " rau" : p.pond > 0.15 ? " atentie" : "";
  var rand = '<tr class="t212Rand" id="t212R-' + tk + '" tabindex="0" aria-expanded="' + des + '" data-action-click="t212Comuta(\'' + tk + '\')">'
    + '<td><div class="t212Sim"><span class="t212Pill ' + niv[1] + '">' + niv[0] + '</span><div><b>' + escapeHtml(p.simbol) + '</b><span class="t212Mic">' + (+p.qty.toFixed(2)) + ' buc · mediu ' + t212Usd(p.pretMediu) + (t212.rezultate[p.ticker] && t212.rezultate[p.ticker].data ? ' · rezultate ' + t212ZiScurta(t212.rezultate[p.ticker].data) : '') + '</span></div></div></td>'
    + '<td class="c-acum">' + t212Usd(p.pret) + '</td>'
    + '<td class="c-rez"><b class="' + t212Cls(p.ppl) + '">' + t212Lei(p.ppl) + '</b><span class="t212Mic">' + (p.pctLei !== null ? t212Pct(p.pctLei) + ' · preț ' + t212Pct(pctPret) : 'preț ' + t212Pct(pctPret)) + '</span></td>'
    + '<td class="c-stop" data-et="Stop">' + (n ? '<span class="' + (n.stopAtins ? "bad" : "") + '">' + t212Usd(n.stopPozitie) + '</span><span class="t212Mic">' + (n.stopAtins ? "DEPĂȘIT" : t212Pct(n.stopPozitie / p.pret - 1) + " de acum") + '</span>' : '—') + '</td>'
    + '<td class="c-tinta" data-et="Țintă">' + (n ? '<span class="good">' + t212Usd(n.tintaPozitie) + '</span><span class="t212Mic">' + t212Pct(n.tintaPozitie / p.pret - 1) + '</span>' : '—') + '</td>'
    + '<td class="c-trend"><b class="' + (tr === "sus" ? "good" : tr === "jos" ? "bad" : "t212Estompat") + '">' + (tr === "sus" ? "↑ sus" : tr === "jos" ? "↓ jos" : tr === "lateral" ? "→ lateral" : "—") + '</b></td>'
    + '<td class="c-pond">' + (p.pond !== null ? Math.round(p.pond * 100) + '%<span class="t212MiniBara"><i class="' + w + '" style="width:' + Math.min(100, p.pond / 0.3 * 100).toFixed(0) + '%"></i></span>' : '—') + '</td>'
    + '<td class="c-plan">' + (p.plan ? '<span class="t212PlanChip ok">✓ ' + escapeHtml(planTxt) + '</span>' : '<span class="t212PlanChip">fără plan</span>') + '</td>'
    + '</tr>';
  // detaliul
  var info = [tr !== "fara-date" ? "trend " + tr + " (" + p.st.trend.tarie + ")" : "", p.st.distMax52 !== null ? "față de maximul pe 52 săpt. " + t212Pct(p.st.distMax52) : "", p.maxDupaCumparare ? "de la maximul de după cumpărare " + t212Pct(p.pret / p.maxDupaCumparare - 1) : "", t212.beta[p.ticker] ? "beta " + t212.beta[p.ticker].toFixed(2).replace(".", ",") : "", p.fxPpl && Math.abs(p.fxPpl) >= 1 ? "din rezultat, cursul dolar/leu: " + t212Lei(p.fxPpl) : ""].filter(Boolean).join(" · ");
  var stanga = '<div><h5>De ce ' + niv[0] + '</h5>' + (p.sem.motive.length ? '<ul class="t212Motive">' + p.sem.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '')
    + '<p class="t212Fac">' + escapeHtml(p.sem.ceAsFace) + '</p>'
    + (n && n.stopAtins ? '<p class="t212Fac">👉 <b>Ce aș face eu:</b> după regula asta, ' + escapeHtml(p.simbol) + ' a coborât deja sub stopul calculat — aș ieși (măcar jumătate), nu aș aștepta să „își revină”.</p>' : '')
    + '<p class="tbSub">' + escapeHtml(info || (t212.inLucru ? "aduc prețurile zilnice…" : "fără prețuri zilnice pentru " + p.simbol)) + '</p>'
    + (n ? '<p class="tbSub"><b>Adaug doar la:</b> ' + (n.intrare && p.pret >= p.pretMediu ? t212Usd(n.intrare.pret) + " — " + escapeHtml(n.intrare.motiv) : escapeHtml(p.pret < p.pretMediu ? "— ești pe minus: nu adaug (așa a crescut NPA la 33.000 de lei)" : "— " + n.intrareMotiv)) + '</p>' : '') + '</div>';
  var v = function (camp, calc) { return pl[camp] != null ? pl[camp] : calc != null ? calc : ""; };
  var dreapta = '<div class="t212Preturi"><h5>Planul tău <span class="t212Estompat">· ' + (p.plan ? "salvat " + new Date(pl.la).toLocaleDateString("ro-RO") + " · colectorul te anunță" : n ? "completat cu prețurile calculate" : "scrie-l tu") + '</span></h5>'
    + '<div class="t212Plan"><label>Ies la −% de la maxim<input inputmode="decimal" id="t212Trail-' + tk + '" class="' + (!p.plan && n ? "calc" : "") + '" value="' + escapeHtml(String(v("trailPct", n ? +n.trailPct.toFixed(1) : null))) + '" placeholder="8"></label>'
    + '<label>Țintă, $<input inputmode="decimal" id="t212Tinta-' + tk + '" class="' + (!p.plan && n ? "calc" : "") + '" value="' + escapeHtml(String(v("tinta", n ? n.tintaPozitie : null))) + '" placeholder="preț"></label>'
    + '<label>Stop fix, $<input inputmode="decimal" id="t212Stop-' + tk + '" value="' + escapeHtml(String(v("stop", null))) + '" placeholder="opțional"></label>'
    + '<button type="button" class="t212Btn t212BtnPlin" data-action-click="t212PlanSalveaza(\'' + tk + '\')">Salvează planul</button>'
    + (p.plan ? '<button type="button" class="t212BtnLinie" data-action-click="t212PlanSterge(\'' + tk + '\')">Șterge</button>' : '') + '</div>'
    + (n ? '<p class="tbSub">Stop care urcă după maxim: <b class="' + (n.stopAtins ? "bad" : "") + '">' + t212Usd(n.stopPozitie) + '</b> (−' + n.trailPct.toFixed(1).replace(".", ",") + '% de la maxim) · Țintă: <b class="good">' + t212Usd(n.tintaPozitie) + '</b> (2× riscul)</p><p class="tbSub">' + escapeHtml(t212ProbaText(n)) + '</p>'
      + (n.proba.medie !== null && n.proba.medie <= 0 ? '<p class="tbWarn">⚠️ Pe istoricul ei, în starea de acum, niciun stop (1,5–3× ATR) n-a ieșit pe plus în medie: prețurile limitează pierderea, nu promit câștig.</p>' : '')
      : '<p class="tbSub">' + escapeHtml(p.nivMotiv || "Prețurile calculate apar după ce vin prețurile zilnice.") + '</p>') + '</div>';
  return rand + '<tr class="t212Det" id="t212Det-' + tk + '"' + (des ? '' : ' hidden') + '><td colspan="8"><div class="t212DetGrila">' + stanga + dreapta + '</div></td></tr>';
}

function t212PuneNiveluri(tk) {
  var n = t212.niveluri[tk]; if (!n) return;
  var set = function (id, v) { var e = $(id); if (e) e.value = v; };
  set("t212Trail-" + tk, n.trailPct.toFixed(1)); set("t212Tinta-" + tk, String(n.tintaPozitie)); set("t212Stop-" + tk, "");
  t212PlanSalveaza(tk);
}
function t212PlanSterge(tk) { ["t212Trail-", "t212Tinta-", "t212Stop-"].forEach(function (k) { var e = $(k + tk); if (e) e.value = ""; }); t212PlanSalveaza(tk); }
// "Pune planurile la toate": pentru fiecare pozitie fara plan, planul din preturile calculate
async function t212PuneToate() {
  var b = $("t212PuneToate"); if (b) { b.disabled = true; b.textContent = "salvez…"; }
  var tk = (t212.poz || []).map(function (x) { return x.ticker; }).filter(function (k) { return t212.niveluri[k] && !t212.planuri[k]; }), ok = 0;
  for (var i = 0; i < tk.length; i++) {
    var n = t212.niveluri[tk[i]];
    try {
      var r = await apiFetch("/api/istoric-bot?action=plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bot: "t212-" + tk[i], plan: { trailPct: +n.trailPct.toFixed(1), tinta: n.tintaPozitie } }) });
      var d = await r.json().catch(function () { return null; });
      if (r.ok) { t212.planuri[tk[i]] = d && d.plan || null; ok++; }
    } catch (e) {}
  }
  t212Render();
  toast(ok === tk.length ? ok + " planuri salvate cu prețurile calculate · colectorul te anunță" : "Am salvat " + ok + " din " + tk.length + " planuri; reîncearcă pentru restul", ok === tk.length ? "good" : "bad");
}

// Poarta de intrare: "vreau sa cumpar X" -> cumpar / astept / nu acum
async function t212Poarta() {
  var s = String(($("t212PSimbol") && $("t212PSimbol").value) || "").toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12), out = $("t212PoartaRez");
  if (!s) { if (out) out.innerHTML = '<p class="tbSub">Scrie simbolul (de exemplu ASTS).</p>'; return; }
  if (out) out.innerHTML = '<p class="tbSub">aduc prețurile zilnice pentru ' + escapeHtml(s) + '…</p>';
  var tk = s + "_US_EQ", plan = { stop: t212Nr($("t212PStop") && $("t212PStop").value), trailPct: t212Nr($("t212PTrail") && $("t212PTrail").value) };
  try {
    var b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk));
    var bare = GridCalcul.bare(b && b.randuri || []), pret = GridCalcul.pretCurent(b && b.randuri || []);
    var st = ActiuniSemnale.stare(bare, pret), ore = null, niv = ActiuniSemnale.niveluri(bare, pret, {});
    var j = t212Jurnal();
    if (j) j.p.inchise.forEach(function (t) { if (T212.simbol(t.ticker) === (b.simbol || s) && t.rezultat < 0) { var o = (Date.now() - t.inchis) / 3600000; if (ore === null || o < ore) ore = o; } });
    var tot = t212.cont && t212.cont.cash && t212.cont.cash.total;
    // planul scris de el bate stopul calculat; fara plan, poarta judeca cu stopul calculat
    var planPoarta = plan.stop || plan.trailPct ? plan : niv.nivel === "ok" ? { stop: niv.stop } : plan;
    t212.poarta = { simbol: b.simbol || s, st: st, niv: niv, planScris: !!(plan.stop || plan.trailPct), v: ActiuniSemnale.poarta({ stare: st, plan: planPoarta, vandutPeMinusAcumOre: ore }), tot: tot };
  } catch (e) { t212.poarta = { simbol: s, eroare: t212Eroare(e) }; }
  t212RenderPoarta();
}
function t212PreturiPoarta(p) {
  var n = p.niv;
  if (!n || n.nivel !== "ok") return n ? '<p class="tbSub">🎯 ' + escapeHtml(n.motiv || "") + '</p>' : "";
  // fara intrare (trend jos) sau poarta pe "nu" -> nu dau o marime de cumparare: ar contrazice verdictul
  var baza = n.intrare ? n.intrare.pret : p.st.pret, cumpar = !!n.intrare && p.v.nivel !== "nu", m = cumpar ? ActiuniSemnale.marime({ intrare: baza, stop: n.stop, cont: p.tot, fx: t212Fx() }) : null;
  return '<div class="t212Preturi"><div class="t212PretCap"><b>🎯 Prețurile calculate pentru ' + escapeHtml(p.simbol) + '</b><span class="tbSub">' + escapeHtml(t212ProbaText(n)) + '</span></div><div class="t212PretGrid">'
    + '<div><span class="tbEt2">Intrare (ordin limită)</span><b>' + (n.intrare ? t212Usd(n.intrare.pret) : "—") + '</b><span class="tbSub">' + escapeHtml(n.intrare ? n.intrare.motiv + (n.intrare.pret < p.st.pret ? " · " + t212Pct(n.intrare.pret / p.st.pret - 1) + " față de acum" : "") : n.intrareMotiv) + '</span></div>'
    + '<div><span class="tbEt2">Stop' + (n.intrare ? "" : " (dacă o cumperi totuși)") + '</span><b class="bad">' + t212Usd(n.stop) + '</b><span class="tbSub">' + t212Pct(-n.riscPct) + (n.intrare ? ' de la intrare' : ' de la prețul de acum') + (p.planScris ? " · ai scris tu alt stop — poarta îl folosește pe al tău" : "") + '</span></div>'
    + '<div><span class="tbEt2">Țintă</span><b class="good">' + t212Usd(n.tinta) + '</b><span class="tbSub">' + t212Pct(n.tinta / baza - 1) + ' (2× riscul)</span></div>'
    + '<div><span class="tbEt2">Cât cumperi</span><b>' + (m ? (+m.bucati.toFixed(3)).toLocaleString("ro-RO") + ' buc' : "—") + '</b><span class="tbSub">' + (m ? "≈ " + t212Suma(m.suma) + " · la stop pierzi ~" + t212Suma(m.risc) + " (1% din cont)" + (m.plafonat ? " · tăiat la 20% din cont" : "") + " · comision dus-întors ~" + t212Suma(m.comision) + ", deci ieși pe zero abia la +0,3%" : !cumpar ? "nu cumpăr acum — vezi verdictul de sus" : "citește întâi contul") + '</span></div></div>'
    + (n.proba.medie !== null && n.proba.medie <= 0 ? '<p class="tbWarn">⚠️ Pe istoricul ei, în starea de acum, niciun stop (1,5–3× ATR) n-a ieșit pe plus în medie: aș sări peste ea.</p>' : '') + '</div>';
}
function t212RenderPoarta() {
  var out = $("t212PoartaRez"), p = t212.poarta; if (!out || !p) return;
  if (p.eroare) { out.innerHTML = '<p class="bad">' + escapeHtml(p.eroare) + '</p>'; return; }
  var n = T212_POARTA[p.v.nivel] || T212_POARTA["fara-date"], st = p.st;
  out.innerHTML = '<div class="t212Verdict ' + n[1] + '"><b>' + n[0] + ' · ' + escapeHtml(p.simbol) + '</b><span class="tbSub">acum ' + t212Usd(st.pret) + ' · trend ' + escapeHtml(st.trend.dir) + ' · față de maximul pe 7 zile ' + t212Pct(st.distMax7z) + ' · pe 52 săpt. ' + t212Pct(st.distMax52) + '</span></div>'
    + (p.v.motive.length ? '<ul class="t212Motive">' + p.v.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '<p class="good">Nimic de obiectat.</p>')
    + t212PreturiPoarta(p)
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + (p.v.nivel === "cumpara" ? "cumpăr, dar cel mult " + (p.tot ? Math.round(p.tot * 0.2).toLocaleString("ro-RO") + " lei (20% din cont)" : "20% din cont") + " și pun stopul scris imediat după." : p.v.nivel === "nu" ? "nu cumpăr acum; pentru acțiuni cumperi doar long, deci aștept să se întoarcă trendul." : p.v.nivel === "asteapta" ? "aștept până se rezolvă ce e mai sus — mai ales planul: fără un plan scris, NPA a crescut prin cumpărări în jos la 33.000 de lei și a costat 8.165." : "fără prețuri nu judec.") + '</p>';
}

// ---------------- jurnalul de actiuni ----------------
var t212JurnalCache = { n: -1, v: null };
function t212Jurnal() {
  var u = t212.istoric && Array.isArray(t212.istoric.umpleri) ? t212.istoric.umpleri : null;
  if (!u || !u.length) return null;
  if (t212JurnalCache.n === u.length && t212JurnalCache.v) return t212JurnalCache.v;
  var p = T212.perechi(u), r = ActiuniSemnale.rezumatJurnal(p.inchise, { umpleri: u, cf: t212.cf || {} });
  t212JurnalCache = { n: u.length, v: { p: p, r: r, u: u } };
  return t212JurnalCache.v;
}
var jtFiltru = (function () { try { var v = localStorage.getItem("jtFiltru"); return v === "actiuni" || v === "tot" ? v : "crypto"; } catch (e) { return "crypto"; } })();
function jtAlegeFiltru(f) {
  jtFiltru = f === "actiuni" || f === "tot" ? f : "crypto";
  try { localStorage.setItem("jtFiltru", jtFiltru); } catch (e) {}
  jtAplicaFiltru();
  if (jtFiltru !== "crypto" && !t212.istoric && !t212.inLucru) t212Porneste(false);
}
function jtAplicaFiltru() {
  var a = $("jtCrypto"), b = $("jtActiuni");
  if (a) a.hidden = jtFiltru === "actiuni";
  if (b) b.hidden = jtFiltru === "crypto";
  ["crypto", "actiuni", "tot"].forEach(function (k) { var e = $("jtF-" + k); if (e) e.setAttribute("aria-pressed", String(jtFiltru === k)); });
  if (jtFiltru !== "crypto") jtRenderActiuni();
}
function jtRenderActiuni() {
  var box = $("jtActiuni"); if (!box || box.hidden) return;
  var j = t212Jurnal();
  if (!j) { box.innerHTML = '<div class="tbBloc"><p class="tbSub">' + escapeHtml(t212.inLucru ? "citesc istoricul Trading 212…" : t212.istoricEroare || "Istoricul Trading 212 nu e încă strâns: colectorul de acasă îl coboară (o pagină la 11 s), apoi apare aici.") + '</p></div>'; return; }
  var r = j.r, l = j.p.inchise, P = t212Pct, L = function (v) { return t212Lei(v); }, cls = t212Cls;
  var cel = function (et, v, c, sub) { return '<div class="tbKpiCel"><span class="tbEt2">' + escapeHtml(et) + '</span><b class="tbKpiVal ' + (c || "") + '">' + escapeHtml(v) + '</b>' + (sub ? '<span class="tbSub">' + escapeHtml(sub) + '</span>' : "") + '</div>'; };
  var st = t212.istoric.stare || {}, h = '<h3 class="jtTitluPiata">📈 Acțiuni · Trading 212</h3>';
  h += '<div class="tbKpi jtKpi">' + cel("Câștigat REAL", L(r.total), cls(r.total), r.n + " trade-uri, " + r.pePlus + " pe plus (" + P(r.n ? r.pePlus / r.n : null).replace("+", "") + ")" + (t212.dividende && t212.dividende.n ? " · + dividende " + t212Lei(t212.dividende.total, 2) : ""))
    + cel("T212 îți arată", L(r.totalOficial), "", "fără comisioane") + cel("Comisioane de conversie", L(-r.comisioane), "bad", "0,15% la fiecare schimb lei↔dolari")
    + cel("Vândute în afara orelor", L(r.ext.total), cls(r.ext.total), r.ext.n + " trade-uri") + '</div>';
  h += t212Cireasa(l);
  if (!st.complet) h += '<p class="tbWarn">Istoricul încă se coboară (' + (st.ordine || 0) + ' ordine până acum) — cifrele cresc până se termină.</p>';
  // pe durata: aici s-a vazut unde se duc banii
  var g = [["sub o zi", 0, 24], ["1–7 zile", 24, 168], ["1–4 săptămâni", 168, 672], ["peste o lună", 672, Infinity]].map(function (x) {
    var s = l.filter(function (t) { return t.durataOre >= x[1] && t.durataOre < x[2]; }), tot = 0, com = 0, plus = 0;
    s.forEach(function (t) { tot += t.rezultat; com += t.comisioane || 0; if (t.rezultat > 0) plus++; });
    return { et: x[0], n: s.length, tot: tot, com: com, plus: plus };
  });
  var cea = g.slice().sort(function (a, b) { return a.tot - b.tot; })[0];
  h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Cât ai ținut — și ce a ieșit</h4><span class="tbSub">rezultat real, după comisioane</span></div><div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Ținut</th><th>Trade-uri</th><th>Pe plus</th><th>Comisioane</th><th>Real</th></tr></thead><tbody>'
    + g.map(function (x) { return '<tr><td>' + x.et + '</td><td>' + x.n + '</td><td>' + (x.n ? Math.round(x.plus / x.n * 100) + "%" : "—") + '</td><td class="bad">' + L(-x.com) + '</td><td class="' + cls(x.tot) + '"><b>' + L(x.tot) + '</b></td></tr>'; }).join("") + '</tbody></table></div>'
    + (cea && cea.tot < 0 ? '<p class="tbFac">👉 <b>Ce aș face eu:</b> banii se pierd pe trade-urile ținute ' + escapeHtml(cea.et) + ' (' + L(cea.tot) + ') — adică pe cele rămase pe minus și lăsate „să-și revină”. ' + t212SfatStop(l) + '</p>' : '') + '</div>';
  h += t212StopBloc(l) + t212ReguliBloc(l);
  // greselile cu costul lor
  h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Greșelile care te-au costat</h4><span class="tbSub">găsite automat; suma = rezultatul trade-urilor care le-au avut</span></div>'
    + (r.greseli.length ? '<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Greșeala</th><th>De câte ori</th><th>Rezultatul lor</th></tr></thead><tbody>' + r.greseli.map(function (x) { return '<tr><td><b>' + escapeHtml(x.text) + '</b></td><td>' + x.n + '</td><td class="' + cls(x.cost) + '">' + L(x.cost) + '</td></tr>'; }).join("") + '</tbody></table></div>' : '<p class="good">Nicio greșeală găsită automat.</p>') + '</div>';
  // cele mai mari pierderi
  var mari = l.slice().sort(function (a, b) { return a.rezultat - b.rezultat; }).slice(0, 5).filter(function (t) { return t.rezultat < 0; });
  if (mari.length) h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Cele mai mari 5 pierderi</h4><span class="tbSub">' + L(mari.reduce(function (s, t) { return s + t.rezultat; }, 0)) + ' împreună</span></div><ul class="grLista">' + mari.map(function (t) { return '<li><b>' + escapeHtml(T212.simbol(t.ticker)) + '</b> <span class="bad">' + L(t.rezultat) + '</span> (' + P(t.pct) + ', ținut ' + Math.round(t.durataOre / 24) + ' zile, ' + new Date(t.inchis).toLocaleDateString("ro-RO") + ')</li>'; }).join("") + '</ul></div>';
  // fiecare trade (cele mai noi 150)
  var cfm = t212.cf || {}, note = typeof jtNote === "function" ? jtNote() : {}, data = function (t) { return new Date(t).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); };
  h += '<div class="tbBloc"><div class="tbBlocCap"><h4>Fiecare trade</h4><span class="tbSub">cele mai noi ' + Math.min(150, l.length) + ' din ' + l.length + ' · o vânzare = un trade</span></div>' + l.slice(0, 150).map(function (t) {
    var gr = ActiuniSemnale.greseli(t, { umpleri: j.u }), cfg = cfm[t.id] && cfm[t.id].greseli || [], dur = t.durataOre < 24 ? Math.max(1, Math.round(t.durataOre)) + " h" : Math.round(t.durataOre / 24) + " zile", id = "t212-" + t.id;
    cfg.forEach(function (k) { if (ActiuniSemnale.TEXT[k] && !gr.some(function (x) { return x.cod === k; })) gr.push({ cod: k, text: ActiuniSemnale.TEXT[k] }); });
    return '<div class="jtTrade"><div class="jtCap"><b>' + escapeHtml(T212.simbol(t.ticker)) + '</b> <span class="tbSub">' + escapeHtml((+t.qty.toFixed(4)) + " buc · " + t212Usd(t.pretCumparare) + " → " + t212Usd(t.pretVanzare) + " · " + data(t.pornit) + " → " + data(t.inchis) + " (" + dur + ")" + (t.extVanzare ? " · vândut în afara orelor" : "")) + '</span><b class="jtRez ' + cls(t.rezultat) + '">' + L(t.rezultat) + ' <span class="tbSub">' + P(t.pct) + '</span></b></div>'
      + '<div class="tbSub">T212 arată ' + L(t.rezultatOficial) + ' · comisioane ' + L(-(t.comisioane || 0)) + (t.partial ? ' · o parte din vânzare n-are cumpărarea în istoric' : '') + '</div>'
      + (cfm[t.id] && cfm[t.id].nivel !== "fara-date" ? '<p class="jtCf">Radarul ar fi zis la cumpărare: <b class="' + (T212_POARTA[cfm[t.id].nivel] || ["", ""])[1] + '">' + escapeHtml((T212_POARTA[cfm[t.id].nivel] || [cfm[t.id].nivel])[0]) + '</b>' + (cfm[t.id].motive && cfm[t.id].motive.length ? ' <span class="tbSub">— ' + escapeHtml(cfm[t.id].motive.join("; ")) + '</span>' : '') + '</p>' : '')
      + (gr.length ? '<ul class="jtGreseli">' + gr.map(function (x) { return '<li><b>' + escapeHtml(x.text) + '</b></li>'; }).join("") + '</ul>' : '')
      + '<textarea class="jtNota" data-id="' + escapeHtml(id) + '" rows="1" placeholder="De ce am cumpărat, ce aș face altfel…">' + escapeHtml(note[id] || "") + '</textarea></div>';
  }).join("") + '</div>';
  box.innerHTML = h;
}
// v87: "cat te-ar fi salvat stopul" - rejucat pe preturile reale (zilnice), din verdictele colectorului
function t212StopBloc(l) {
  var cfm = t212.cf; if (!cfm) return "";
  var r = ActiuniSemnale.rezumatStop(l, cfm, [8, 10, 15]), L = function (v) { return t212Lei(v); };
  if (!r.judecate) return '<div class="tbBloc"><div class="tbBlocCap"><h4>✂️ Cât te-ar fi salvat stopul</h4></div><p class="tbSub">Colectorul de acasă rejoacă trade-urile tale cu un stop (40 de acțiuni pe oră). Încă n-a terminat niciunul.</p></div>';
  var best = [8, 10, 15].slice().sort(function (a, b) { return r.praguri[b].total - r.praguri[a].total; })[0], bp = r.praguri[best];
  return '<div class="tbBloc"><div class="tbBlocCap"><h4>✂️ Cât te-ar fi salvat stopul</h4><span class="tbSub">trade-urile tale rejucate pe prețurile zilnice reale · ' + r.judecate + ' judecate</span></div>'
    + '<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Stop la</th><th>Totalul ar fi fost</th><th>Față de ce ai făcut</th><th>Trade-uri oprite</th><th>Din care câștigătoare tăiate</th></tr></thead><tbody>'
    + '<tr><td>fără stop (ce ai făcut)</td><td class="' + t212Cls(r.real) + '"><b>' + L(r.real) + '</b></td><td>—</td><td>—</td><td>—</td></tr>'
    + [8, 10, 15].map(function (p) { var g = r.praguri[p]; return '<tr><td>−' + p + '%</td><td class="' + t212Cls(g.total) + '"><b>' + L(g.total) + '</b></td><td class="' + t212Cls(g.dif) + '">' + L(g.dif) + '</td><td>' + g.atinse + '</td><td>' + g.castigatoareTaiate + '</td></tr>'; }).join("") + '</tbody></table></div>'
    + '<p class="tbFac">👉 <b>Ce aș face eu:</b> ' + (bp.dif > 0 ? 'stop la −' + best + '% pus din prima clipă: pe trade-urile tale ar fi însemnat ' + L(bp.dif) + ' în plus, deși ar fi tăiat și ' + bp.castigatoareTaiate + ' trade-uri care până la urmă au ieșit pe plus.' : 'pe trade-urile tale un stop fix n-ar fi ajutat în total — ar fi tăiat prea multe care își reveneau. Pierderile mari au venit din cumpărările în plus pe minus și din pozițiile prea mari (NPA), nu din lipsa unui stop strâns: acolo aș pune frâna. Stopul care urcă după maxim, din planul fiecărei poziții, e ales pe istoricul fiecărei acțiuni; pe trade-urile tale încă nu l-am probat.') + '</p>'
    + '<p class="tbSub">Pe prețuri de închidere zilnice: ziua cumpărării și a vânzării nu intră (nu știm ordinea din zi). Cu stop, rezultatul = prețul de ieșire față de cel de cumpărare, minus 0,30% comisionul; cursul dolar/leu nu intră.</p></div>';
}
// v87: sfatul pentru pozitiile tinute pe minus vine din proba cu stop, nu dintr-o regula de manual. Pe datele
// lui (25.09) un stop fix strans ar fi iesit MAI RAU (-8%: ~-6.700 lei fata de +4.091): taia prea multe care isi
// reveneau. Ce l-ar fi ajutat: sa nu cumpere in plus pe minus (NPA) si sa nu puna mult pe o actiune.
function t212SfatStop(l) {
  var r = t212.cf ? ActiuniSemnale.rezumatStop(l, t212.cf, [8, 10, 15]) : null;
  if (!r || !r.judecate) return "Aș avea un plan de ieșire scris la fiecare cumpărare.";
  var best = [8, 10, 15].slice().sort(function (a, b) { return r.praguri[b].dif - r.praguri[a].dif; })[0];
  return r.praguri[best].dif > 0 ? "Aș pune la fiecare cumpărare un stop la −" + best + "% și l-aș respecta: pe trade-urile tale ar fi adus " + t212Lei(r.praguri[best].dif) + "."
    : "Un stop fix strâns nu te-ar fi ajutat (vezi „Cât te-ar fi salvat stopul”, mai jos). Ce te-ar fi ajutat: să nu cumperi în plus pe minus și să nu pui mult pe o singură acțiune — de aici au venit pierderile mari (NPA).";
}
// v87: regulile tale, invatate din jurnalul de actiuni
function t212ReguliBloc(l) {
  var r = ActiuniSemnale.reguliPersonale(l, "Europe/Bucharest");
  return '<div class="tbBloc"><div class="tbBlocCap"><h4>🧭 Regulile tale (învățate din jurnal)</h4><span class="tbSub">grupe de cel puțin 30 de trade-uri care ies clar mai rău decât restul</span></div>'
    + (!r.suficient ? '<p class="tbSub">' + r.n + ' trade-uri: mai trebuie ' + r.lipsa + '.</p>'
      : r.reguli.length ? '<ul class="grLista">' + r.reguli.slice(0, 5).map(function (x) { return '<li class="bad">' + escapeHtml(x.text) + '</li>'; }).join("") + '</ul><p class="tbFac">👉 <b>Ce aș face eu:</b> aș evita trade-urile ' + escapeHtml(r.reguli[0].grupa) + ' până nu se schimbă cifra.</p>'
      : '<p class="good">Pe ' + r.n + ' trade-uri nu văd o grupă care să iasă clar mai rău decât restul.</p>') + '</div>';
}

// 🍒 "Daca ascultai de Radar" pe actiuni: verdictul portii la ora fiecarei cumparari (colectorul de acasa)
function t212Cireasa(l) {
  var cfm = t212.cf;
  if (!cfm) return '<p class="tbSub">🍒 „Dacă ascultai de Radar” se socotește pe serverul de acasă.</p>';
  var m = { cumpara: "porneste", asteapta: "asteapta", nu: "nu" };
  var cr = Contrafactual.rezumat(l.map(function (t) { var z = cfm[t.id]; return { t: t, z: { nivel: z && m[z.nivel] || "fara-date" } }; }));
  var toate = l.filter(function (t) { return cfm[t.id]; }).length;
  if (!cr.judecate) return '<p class="tbSub">🍒 „Dacă ascultai de Radar”: colectorul de acasă îl socotește pentru fiecare trade (40 de acțiuni pe oră). ' + (toate ? toate + ' trade-uri văzute, fără prețuri pentru ele.' : 'Încă n-a terminat niciunul.') + '</p>';
  var L = function (v) { return t212Lei(v); }, cls = t212Cls, bine = cr.doarVerde > cr.realJudecate;
  return '<div class="jtCireasa"><h4>🍒 Dacă ascultai de Radar</h4><div class="jtCirGrid">'
    + '<div><span class="tbEt2">Ce ai făcut (pe cei ' + cr.judecate + ' judecați)</span><b class="' + cls(cr.realJudecate) + '">' + L(cr.realJudecate) + '</b></div>'
    + '<div><span class="tbEt2">Dacă cumpărai doar pe 🟢 (' + cr.nVerde + ')</span><b class="' + cls(cr.doarVerde) + '">' + L(cr.doarVerde) + '</b></div>'
    + '<div><span class="tbEt2">Pierderi evitate de 🔴 (' + cr.nBlocate + ')</span><b class="good">' + L(cr.blocateSalvat) + '</b></div>'
    + '<div><span class="tbEt2">Câștiguri pe care 🔴 le-ar fi ratat</span><b class="bad">' + L(-cr.blocateRatat) + '</b></div></div>'
    + '<p class="tbFac">👉 <b>Ce aș face eu:</b> ' + (bine ? 'aș cumpăra doar când poarta zice 🟢: pe trade-urile tale ar fi însemnat ' + L(cr.doarVerde - cr.realJudecate) + ' față de ce ai făcut.' : 'pe trade-urile tale poarta n-ar fi ajutat în total; aș folosi-o doar ca frână la „după mișcare” și „recumpărat imediat”, nu ca semnal de cumpărare.') + '</p>'
    + '<p class="tbSub">Radarul a văzut doar zilele închise înainte de fiecare cumpărare; planul nu intră (atunci nu-l știa). ' + (cr.faraDate ? cr.faraDate + ' trade-uri fără prețuri (mai ales acțiuni europene — Radarul caută prețuri doar pe bursa americană — și câteva delistate) nu sunt judecate. ' : '') + 'E un semn, nu o dovadă: poarta nu e antrenată pe trade-urile tale, doar aplicată pe ele.</p></div>';
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () { jtAplicaFiltru(); });

// v87: tot contul pe un rand, sus pe ambele pagini: botii Pionex (USDT, cu echivalentul in lei) si Trading 212 (lei)
var contTot = { boti: null, botiLa: 0, inLucru: false };
async function contTotAsigura() {
  if (contTot.inLucru) return; contTot.inLucru = true;
  try {
    var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : null;
    if (!boti && Date.now() - contTot.botiLa > 60000) { try { var d = await getJSON("/api/bot-orders"); contTot.boti = d && Array.isArray(d.bots) ? d.bots : []; contTot.botiLa = Date.now(); } catch (e) { contTot.boti = contTot.boti || null; } }
    if (!t212.cont) { try { t212.cont = await getJSON("/api/t212?action=cont"); } catch (e) {} }
    if (!t212.istoric) { try { t212.istoric = await getJSON("/api/t212?action=istoric"); } catch (e) {} }
  } finally { contTot.inLucru = false; }
  contTotRender();
}
function contTotRender() {
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : contTot.boti;
  var act = (boti || []).filter(function (b) { return b && b.activ; }), usdt = 0, areUsdt = false;
  act.forEach(function (b) { var v = Number(b.profitTotal); if (isFinite(v)) { usdt += v; areUsdt = true; } });
  var fx = t212Fx(), c = t212.cont && t212.cont.cash, parti = [];
  parti.push(boti ? '<span><b>Pionex</b> · ' + act.length + (act.length === 1 ? " bot activ" : " boți activi") + (areUsdt ? ' · <b class="' + t212Cls(usdt) + '">' + (usdt >= 0 ? "+" : "−") + Math.abs(usdt).toFixed(2) + ' USDT</b>' + (fx ? ' <span class="tbSub">(≈ ' + escapeHtml(t212Lei(usdt / fx)) + ')</span>' : '') : '') + '</span>' : '<span class="tbSub">Pionex: aduc boții…</span>');
  parti.push(c ? '<span><b>Trading 212</b> · ' + escapeHtml(t212Suma(c.total)) + ' · deschise <b class="' + t212Cls(c.ppl) + '">' + escapeHtml(t212Lei(c.ppl)) + '</b></span>' : '<span class="tbSub">Trading 212: aduc contul…</span>');
  // actiunile pe IESI: semaforul le-a pus deja in tabelul pozitiilor
  var iesi = document.querySelectorAll("#t212Continut .t212Pill-iesi").length;
  var lich = act.filter(function (b) { var d = Number(b.distantaLichidarePct); return b.lichidareDepasita || (isFinite(d) && Math.abs(d) < 15); }).length;
  var ati = iesi + lich;
  parti.push(ati ? '<span class="bad">⚠️ ' + (iesi ? iesi + (iesi === 1 ? " acțiune de ieșit" : " acțiuni de ieșit") : "") + (iesi && lich ? " · " : "") + (lich ? lich + (lich === 1 ? " bot aproape de lichidare" : " boți aproape de lichidare") : "") + '</span>' : '<span class="good">✓ nimic roșu</span>');
  document.querySelectorAll("[data-cont-tot]").forEach(function (el) { el.innerHTML = parti.join('<span class="contTotSep">│</span>'); });
}
