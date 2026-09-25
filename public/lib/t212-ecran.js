// Ecranul Trading 212 (v85): cardul "Contul meu Trading 212" din US Stocks si jurnalul de actiuni din
// Jurnal de trade (filtrul Crypto / Actiuni / Tot). Doar CITIRE: cheia T212 e doar de citire si sta acasa.
// Foloseste din app.js: $, getJSON, apiFetch, escapeHtml, toast; din lib: GridCalcul, T212, ActiuniSemnale.
// Calculele stau in lib (probate in scripts/t212-v85.mjs si scripts/actiuni-v85.mjs); aici doar se arata.
var t212 = { simbolPret: {}, cont: null, poz: null, istoric: null, istoricEroare: null, bare: {}, planuri: {}, beta: {}, la: 0, inLucru: false, eroare: null, poarta: null };
var T212_NIVEL = { tine: ["ȚINE", "t212Pill-tine"], atentie: ["ATENȚIE", "t212Pill-atentie"], iesi: ["IEȘI", "t212Pill-iesi"], "fara-date": ["FĂRĂ DATE", "t212Pill-fara"] };
var T212_POARTA = { cumpara: ["🟢 CUMPĂR", "good"], asteapta: ["🟡 AȘTEAPTĂ", "tbWarn"], nu: ["🔴 NU ACUM", "bad"], "fara-date": ["⚪ FĂRĂ DATE", ""] };

function t212Lei(v, z) { if (v === null || v === undefined || !isFinite(v)) return "—"; return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("ro-RO", { minimumFractionDigits: z === undefined ? 0 : z, maximumFractionDigits: z === undefined ? 0 : z }) + " lei"; }
function t212Suma(v) { return v === null || v === undefined || !isFinite(v) ? "—" : Math.round(v).toLocaleString("ro-RO") + " lei"; }
function t212Pct(v) { return v === null || v === undefined || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
function t212Usd(v) { return v === null || v === undefined || !isFinite(v) ? "—" : "$" + (v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(3) : v.toPrecision(3)); }
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
  t212JurnalCache.n = -1;
  t212.la = Date.now(); t212Render();
  if (!t212.eroare && t212.poz) {
    for (var i = 0; i < t212.poz.length; i++) {
      var tk = t212.poz[i].ticker;
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
// Drumul spre card din ORICE mod (Crypto sau US Stocks): butonul "Nasdaq / US Stocks" din meniu apare
// doar in modul US Stocks, asa ca pana la v85.1 cardul nu se gasea din modul Crypto.
function deschideT212() {
  openStocksDesk();
  document.querySelectorAll("[data-nav]").forEach(function (x) { x.classList.toggle("active", x.dataset.nav === "t212"); });
  t212Porneste(false);
  setTimeout(function () { var c = $("t212Card"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60);
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

function t212Render() {
  var box = $("t212Continut"); if (!box) return;
  if (t212.inLucru && !t212.cont) { t212Stare("citesc contul din Trading 212…"); return; }
  if (t212.eroare) { box.innerHTML = '<p class="bad">' + escapeHtml(t212.eroare) + '</p>'; t212Stare("n-am putut citi contul"); return; }
  if (!t212.cont) { box.innerHTML = '<div class="emptyState">Apasă „Citește contul”.</div>'; return; }
  var c = t212.cont.cash || {}, poz = (t212.poz || []).map(t212Pozitie), h = "";
  t212Stare((t212.inLucru ? "aduc prețurile… · " : "") + "citit la " + new Date(t212.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + " · doar citire");
  // 1) cifrele contului + adevarul despre profit (T212 nu scade comisionul de conversie)
  var j = t212Jurnal(), cel = function (et, v, cls, sub) { return '<div class="t212Cel"><span class="tbEt2">' + escapeHtml(et) + '</span><b class="t212Val ' + (cls || "") + '">' + escapeHtml(v) + '</b>' + (sub ? '<span class="tbSub">' + escapeHtml(sub) + '</span>' : "") + '</div>'; };
  h += '<div class="t212Kpi">' + cel("Contul acum", t212Suma(c.total), "", "liber " + t212Suma(c.free)) + cel("Pe pozițiile deschise", t212Lei(c.ppl), t212Cls(c.ppl), poz.length + " poziții")
    + (j ? cel("Câștigat REAL pe trade-uri închise", t212Lei(j.r.total), t212Cls(j.r.total), j.r.n + " trade-uri · după comisioane") + cel("T212 îți arată", t212Lei(c.result), "t212Muted", "fără comisioanele de conversie: " + t212Lei(-j.r.comisioane))
      : cel("Rezultat (după T212)", t212Lei(c.result), t212Cls(c.result), "fără comisioanele de conversie") + cel("Istoricul complet", "—", "t212Muted", t212.istoricEroare || "se strânge acasă de colector")) + '</div>';
  if (j && j.r.comisioane > 0) h += '<p class="t212Fac">👉 <b>Ce aș face eu:</b> fiecare cumpărare + vânzare costă ~0,30% la schimbul lei↔dolari. Un trade din care aștepți sub 0,5% nu merită; iar pierderile mari vin din pozițiile ținute pe minus, nu din comisioane — de asta fiecare poziție de mai jos are un plan.</p>';
  // 2) pozitiile, cu semafor si plan
  if (!poz.length) h += '<p class="tbSub">N-ai poziții deschise în Trading 212.</p>';
  else {
    h += '<div class="t212Poz">' + poz.map(function (p) {
      var st = ActiuniSemnale.stare(t212.bare[p.ticker], p.pret), sem = ActiuniSemnale.semafor(p, st), niv = T212_NIVEL[sem.nivel] || T212_NIVEL["fara-date"], pl = p.plan || {};
      var tk = escapeHtml(p.ticker), fara = !(t212.bare[p.ticker] || []).length;
      return '<div class="t212Rand"><div class="t212Cap"><b class="t212Sim">' + escapeHtml(p.simbol) + '</b><span class="t212Pill ' + niv[1] + '">' + niv[0] + '</span>'
        + '<span class="tbSub">' + (+p.qty.toFixed(4)) + ' buc · mediu ' + t212Usd(p.pretMediu) + ' · acum ' + t212Usd(p.pret) + '</span>'
        + '<b class="t212Rez ' + t212Cls(p.ppl) + '">' + t212Lei(p.ppl) + ' <span class="tbSub">' + t212Pct(sem.pct) + '</span></b></div>'
        + '<div class="tbSub">' + (fara ? (t212.inLucru ? "aduc prețurile zilnice…" : "fără prețuri zilnice pentru " + escapeHtml(p.simbol)) : 'trend ' + escapeHtml(st.trend.dir) + (st.trend.tarie !== "fara-date" ? " (" + escapeHtml(st.trend.tarie) + ")" : "") + ' · față de maximul pe 52 săpt. ' + t212Pct(st.distMax52) + ' · pe 7 zile ' + t212Pct(st.distMax7z) + (p.maxDupaCumparare ? ' · de la maximul de după cumpărare ' + t212Pct(p.pret / p.maxDupaCumparare - 1) : '') + (t212.beta[p.ticker] ? ' · beta ' + t212.beta[p.ticker].toFixed(2).replace(".", ",") : '')) + '</div>'
        + (sem.motive.length ? '<ul class="t212Motive">' + sem.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '')
        + '<p class="t212Fac">' + escapeHtml(sem.ceAsFace) + '</p>'
        + '<div class="t212Plan"><span class="tbEt2">Planul tău:</span>'
        + '<label>stop $<input inputmode="decimal" id="t212Stop-' + tk + '" value="' + (pl.stop != null ? pl.stop : "") + '" placeholder="preț"></label>'
        + '<label>țintă $<input inputmode="decimal" id="t212Tinta-' + tk + '" value="' + (pl.tinta != null ? pl.tinta : "") + '" placeholder="preț"></label>'
        + '<label>ies la −<input inputmode="decimal" id="t212Trail-' + tk + '" value="' + (pl.trailPct != null ? pl.trailPct : "") + '" placeholder="8">% de la maxim</label>'
        + '<button type="button" class="t212Btn" data-action-click="t212PlanSalveaza(\'' + tk + '\')">Salvează</button>'
        + (pl.la ? '<span class="tbSub">scris ' + new Date(pl.la).toLocaleDateString("ro-RO") + ' · colectorul te anunță</span>' : '<span class="tbSub tbWarn">fără plan</span>') + '</div></div>';
    }).join("") + '</div>';
  }
  // 3) portofoliul
  if (poz.length) {
    var totUsd = 0; poz.forEach(function (p) { totUsd += p.qty * p.pret; });
    var investit = c.total > 0 && c.free >= 0 ? c.total - c.free : null;
    var pf = ActiuniSemnale.portofoliu(poz.map(function (p) { return { simbol: p.simbol, valoare: investit !== null && totUsd > 0 ? p.qty * p.pret / totUsd * investit : 0, beta: t212.beta[p.ticker] }; }), c.free);
    h += '<div class="t212Bloc"><div class="tbBlocCap"><h4>🧺 Portofoliul</h4><span class="tbSub">cash ' + t212Pct(pf.cash) + ' din cont · la −10% pe Nasdaq: ' + t212Lei(pf.soc) + '</span></div>'
      + pf.pozitii.map(function (r) { return '<div class="t212Bara"><span>' + escapeHtml(r.simbol) + '</span><div class="t212BaraFond"><div class="t212BaraPlin' + (r.pondere > 0.3 ? " rau" : r.pondere > 0.2 ? " atentie" : "") + '" style="width:' + Math.max(1, Math.min(100, (r.pondere || 0) * 100)).toFixed(1) + '%"></div></div><b>' + t212Pct(r.pondere).replace("+", "") + '</b><span class="tbSub">' + (r.beta ? "beta " + r.beta.toFixed(2).replace(".", ",") : "beta ?, socotit 1") + '</span></div>'; }).join("")
      + '<p class="t212Fac">' + escapeHtml(pf.ceAsFace) + '</p></div>';
  }
  box.innerHTML = h;
  t212RenderPoarta();
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

// Poarta de intrare: "vreau sa cumpar X" -> cumpar / astept / nu acum
async function t212Poarta() {
  var s = String(($("t212PSimbol") && $("t212PSimbol").value) || "").toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 12), out = $("t212PoartaRez");
  if (!s) { if (out) out.innerHTML = '<p class="tbSub">Scrie simbolul (de exemplu ASTS).</p>'; return; }
  if (out) out.innerHTML = '<p class="tbSub">aduc prețurile zilnice pentru ' + escapeHtml(s) + '…</p>';
  var tk = s + "_US_EQ", plan = { stop: t212Nr($("t212PStop") && $("t212PStop").value), trailPct: t212Nr($("t212PTrail") && $("t212PTrail").value) };
  try {
    var b = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk));
    var bare = GridCalcul.bare(b && b.randuri || []), pret = GridCalcul.pretCurent(b && b.randuri || []);
    var st = ActiuniSemnale.stare(bare, pret), ore = null;
    var j = t212Jurnal();
    if (j) j.p.inchise.forEach(function (t) { if (T212.simbol(t.ticker) === (b.simbol || s) && t.rezultat < 0) { var o = (Date.now() - t.inchis) / 3600000; if (ore === null || o < ore) ore = o; } });
    var tot = t212.cont && t212.cont.cash && t212.cont.cash.total;
    t212.poarta = { simbol: b.simbol || s, st: st, v: ActiuniSemnale.poarta({ stare: st, plan: plan, vandutPeMinusAcumOre: ore }), tot: tot };
  } catch (e) { t212.poarta = { simbol: s, eroare: t212Eroare(e) }; }
  t212RenderPoarta();
}
function t212RenderPoarta() {
  var out = $("t212PoartaRez"), p = t212.poarta; if (!out || !p) return;
  if (p.eroare) { out.innerHTML = '<p class="bad">' + escapeHtml(p.eroare) + '</p>'; return; }
  var n = T212_POARTA[p.v.nivel] || T212_POARTA["fara-date"], st = p.st;
  out.innerHTML = '<div class="t212Verdict ' + n[1] + '"><b>' + n[0] + ' · ' + escapeHtml(p.simbol) + '</b><span class="tbSub">acum ' + t212Usd(st.pret) + ' · trend ' + escapeHtml(st.trend.dir) + ' · față de maximul pe 7 zile ' + t212Pct(st.distMax7z) + ' · pe 52 săpt. ' + t212Pct(st.distMax52) + '</span></div>'
    + (p.v.motive.length ? '<ul class="t212Motive">' + p.v.motive.map(function (m) { return '<li>' + escapeHtml(m) + '</li>'; }).join("") + '</ul>' : '<p class="good">Nimic de obiectat.</p>')
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + (p.v.nivel === "cumpara" ? "cumpăr, dar cel mult " + (p.tot ? Math.round(p.tot * 0.2).toLocaleString("ro-RO") + " lei (20% din cont)" : "20% din cont") + " și pun stopul scris imediat după." : p.v.nivel === "nu" ? "nu cumpăr acum; pentru acțiuni cumperi doar long, deci aștept să se întoarcă trendul." : p.v.nivel === "asteapta" ? "aștept până se rezolvă ce e mai sus — mai ales planul: fără stop scris, NPA a costat 8.165 lei." : "fără prețuri nu judec.") + '</p>';
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
  h += '<div class="tbKpi jtKpi">' + cel("Câștigat REAL", L(r.total), cls(r.total), r.n + " trade-uri, " + r.pePlus + " pe plus (" + P(r.n ? r.pePlus / r.n : null).replace("+", "") + ")")
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
    + (cea && cea.tot < 0 ? '<p class="tbFac">👉 <b>Ce aș face eu:</b> banii se pierd pe trade-urile ținute ' + escapeHtml(cea.et) + ' (' + L(cea.tot) + ') — adică pe cele rămase pe minus și lăsate „să-și revină”. Aș pune la fiecare cumpărare un stop scris (−8…−10%) și l-aș respecta.</p>' : '') + '</div>';
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
