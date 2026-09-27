// Pagina Scan (v96, demo aprobat 27.09: claude.ai/artifact/BJ7Vnvv7QPKKj8FYbSwhod) - ecranul. Logica pura e in lib/scan.js.
// Datele: scanul colectorului (istoric-bot?action=scan: top 100 PERP + Nasdaq 100 + actiunile lui, o data pe ora),
// vremea pietei ca pe Home (clasamentul, bursele, Nasdaq 100), botii / contul / pozitiile din contTotAsigura.
// Randul deschis aduce abia atunci barele pe ora si pe zi (graficul pe perioade) si, la monede, funding-ul.
var scanSt = { la: 0, inLucru: false, d: {}, r: "toate", fel: "toate", mele: false, q: "", ord: "scor", tot: false, totc: false, tota: false, deschis: null, per: "1L", serii: {}, funding: {} };
var SCAN_MS = 5 * 60000;

function scanPe() { var el = $("scan"); return !!(el && el.classList.contains("on")); }
async function scanPorneste(fortat) {
  scanDeseneaza();
  if (scanSt.inLucru || (!fortat && Date.now() - scanSt.la < SCAN_MS)) return;
  scanSt.inLucru = true;
  var d = scanSt.d;
  var pas = async function (k, fn) { try { d[k] = await fn(); d[k + "Err"] = null; } catch (e) { d[k + "Err"] = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); } scanDeseneaza(); };
  try {
    await Promise.all([
      pas("scan", function () { return getJSON("/api/istoric-bot?action=scan"); }),
      pas("clasament", async function () { var c = await getJSON("/api/istoric-bot?action=clasament"); return c && c.clasament || null; }),
      pas("piata", function () { return getJSON("/api/stiri?action=piata"); }),
      pas("ndx", function () { return getJSON("/api/t212?action=ndx"); }),
      pas("piataCol", function () { return getJSON("/api/istoric-bot?action=piata"); }),
      pas("cont", async function () { if (typeof contTotAsigura === "function") await contTotAsigura(); return true; })
    ]);
    await pas("poz", async function () { var p = await getJSON("/api/t212?action=pozitii"); return (Array.isArray(p) ? p : p && (p.items || p.pozitii) || []).map(function (x) { return x && x.ticker; }).filter(Boolean); });
    await pas("idei", async function () { if (typeof t212 !== "undefined" && t212.idei) return t212.idei; var x = await getJSON("/api/t212?action=idei"); if (typeof t212 !== "undefined") t212.idei = x; return x; });
    // rezultatele financiare ale actiunilor lui (Home le are deja; altfel o data pe zi)
    await pas("rezultate", async function () {
      if (typeof acasa !== "undefined" && acasa.d && acasa.d.rezultate) return acasa.d.rezultate;
      var zi = new Date().toISOString().slice(0, 10); if (d.rezultate && d.rezultate.zi === zi) return d.rezultate;
      var l = (d.poz || []).filter(function (t) { return /_US_EQ$/.test(String(t)); }), o = { zi: zi, l: [] };
      for (var i = 0; i < l.length && i < 12; i++) { try { var r = await getJSON("/api/t212?action=rezultate&ticker=" + encodeURIComponent(l[i])); if (r && r.data) o.l.push({ simbol: String(l[i]).split("_")[0].replace(/\d+$/, ""), data: r.data, sigur: !!r.sigur }); } catch (e) {} }
      return o;
    });
    scanSt.la = d.scan ? Date.now() : Date.now() - SCAN_MS + 30000;
  } finally { scanSt.inLucru = false; }
  scanDeseneaza();
}
setInterval(function () { if (scanPe() && !document.hidden) scanPorneste(false); }, 60000);

// ---- utilitare de afisare ----
function scNf(v, z) { return v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
function scPct(v, z) { if (v == null || !isFinite(v)) return "—"; z = z == null ? 1 : z; return (v >= 0 ? "+" : "−") + scNf(Math.abs(v), z) + "%"; }
function scCls(v) { return v == null || !isFinite(v) ? "" : v >= 0 ? "good" : "bad"; }
function scPret(p) { return p == null || !isFinite(p) ? "—" : p >= 1000 ? scNf(p, 0) : p >= 10 ? scNf(p, 2) : p >= 1 ? scNf(p, 3) : p >= 0.01 ? scNf(p, 4) : scNf(p, 7); }
function scVol(v) { return v == null ? "—" : v >= 1e9 ? scNf(v / 1e9, 1) + " mld $" : v >= 1e6 ? scNf(v / 1e6, 0) + " mil $" : scNf(v / 1e3, 0) + " mii $"; }

// ---- randurile: scanul + fata de piata + marcajele lui + scorul si semaforul ----
function scanRanduri() {
  var d = scanSt.d, sc = d.scan || {}, cr = sc.crypto && sc.crypto.randuri || [], ac = sc.actiuni && sc.actiuni.randuri || [];
  var btc = cr.find(function (x) { return x.s === "BTC"; }), qqq = scQqq7();
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" ? contTot.boti : null);
  var BOT = {}; (boti || []).forEach(function (b) { if (b && b.activ) BOT[String(b.baza || "").replace(/\.PERP$/, "").toUpperCase()] = true; });
  var POZ = {}; (d.poz || []).forEach(function (t) { POZ[String(t).split("_")[0].replace(/\d+$/, "")] = true; });
  var REZ = {}; ((d.rezultate && d.rezultate.l) || []).forEach(function (x) { REZ[x.simbol] = x.data; });
  var idei = d.idei && d.idei.idei && d.idei.idei.actiuni || [];
  idei.forEach(function (x) { if (x.rezultate && !REZ[x.simbol]) REZ[x.simbol] = x.rezultate; });
  var f = d.piataCol && d.piataCol.funding, SCUMP = {}; ((f && f.inghesuiti) || []).forEach(function (x) { SCUMP[x.s] = true; });
  var azi = Date.now();
  var fa = function (x, fel) {
    var o = Object.assign({ fel: fel }, x);
    o.rel = Scan.fata(x, fel === "c" ? (btc ? btc.ch7 : null) : qqq);
    o.bot = fel === "c" && !!BOT[x.s]; o.port = fel === "a" && !!POZ[x.s]; o.mea = o.bot || o.port;
    o.funding = fel === "c" && !!SCUMP[x.s];
    o.rez = fel === "a" ? REZ[x.s] || null : null; o.rezZile = o.rez ? Math.round((Date.parse(o.rez + "T12:00:00Z") - azi) / 86400000) : null;
    o.scor = Scan.scor(x, o.rel); o.sem = Scan.semafor(x);
    return o;
  };
  return cr.map(function (x) { return fa(x, "c"); }).concat(ac.map(function (x) { return fa(x, "a"); }));
}
function scQqq7() { var p = scanSt.d.piata, q = p && p.qqq ? GridCalcul.bareToate(p.qqq) : null; return q && q.length > 8 ? Math.round((q[q.length - 1].c / q[q.length - 8].c - 1) * 10000) / 100 : null; }
function scFiltrat(R, faraReteta) {
  var r = Scan.RETETE.find(function (x) { return x.k === scanSt.r; }) || Scan.RETETE[0], q = scanSt.q.trim().toUpperCase();
  return R.filter(function (x) {
    if (scanSt.fel !== "toate" && x.fel !== scanSt.fel) return false;
    if (scanSt.mele && !x.mea) return false;
    if (q && x.s.indexOf(q) !== 0) return false;
    return faraReteta || r.f(x);
  });
}
function scSortat(l) {
  var k = scanSt.ord;
  return l.slice().sort(function (a, b) {
    if (scanSt.r === "grid" && k === "scor") return (b.gs || 0) - (a.gs || 0);
    var va = a[k], vb = b[k];
    return (vb == null ? -1e12 : vb) - (va == null ? -1e12 : va);
  });
}

// ---- contextul, ca pe Home ----
function scanContext() {
  var d = scanSt.d, el = $("scContext"); if (!el || typeof Acasa === "undefined") return null;
  var cl = typeof acClasamentSumar === "function" ? acClasamentSumar(d.clasament) : null, p = d.piata || {};
  var btcC = d.clasament && (d.clasament.monede || []).find(function (x) { return x.simbol === "BTC_USDT_PERP"; });
  var fgO = p.fg, fgI = Acasa.fg(fgO && fgO.istoric && fgO.istoric.length ? fgO.istoric : fgO ? [fgO.valoare] : []);
  var v = Acasa.vreme({ clasament: cl, btc: { miscare: !!(btcC && btcC.regim && btcC.regim.miscare) }, fg: fgI.acum });
  var qqq = p.qqq ? GridCalcul.bareToate(p.qqq) : null, vixB = p.vix ? GridCalcul.bareToate(p.vix) : null, ndxL = d.ndx && Array.isArray(d.ndx.actiuni) ? Acasa.largimeNdx(d.ndx.actiuni) : null;
  var vb = Acasa.vremeBursa({ qqq: qqq, vix: vixB && vixB.length ? vixB[vixB.length - 1].c : null, ndx: ndxL });
  var R = scanRanduri(), cr = R.filter(function (x) { return x.fel === "c"; }), btc = cr.find(function (x) { return x.s === "BTC"; }), f = d.piataCol && d.piataCol.funding;
  var col = function (niv) { return /liniste|larga/.test(niv) ? "good" : /miscare|scade|frica/.test(niv) ? "bad" : "warn"; };
  el.innerHTML = '<div><span class="scPiata">Crypto · ' + (cr.length || "—") + ' monede Pionex</span><span class="scNiv ' + col(v.nivel) + '">' + escapeHtml(v.eticheta) + '</span>'
    + '<span class="scSub">' + (cl ? cl.evita + ' din ' + (cl.evita + cl.candidati) + ' în mișcare · ' : '') + (btc ? 'BTC ' + scPct(btc.ch7) + ' pe 7 zile' : '') + (f && f.text ? ' · ' + escapeHtml(f.text) : '') + '</span>'
    + (v.faCe ? '<div class="scFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(v.faCe) + '</div>' : '') + '</div>'
    + '<div><span class="scPiata">Nasdaq 100' + (ndxL ? ' · ' + ndxL.n + ' acțiuni' : '') + '</span><span class="scNiv ' + col(vb.nivel) + '">' + escapeHtml(vb.eticheta) + '</span>'
    + '<span class="scSub">' + (scQqq7() !== null ? 'QQQ ' + scPct(scQqq7()) + ' pe 7 zile' : '') + (ndxL ? ' · ' + Math.round(ndxL.e50 / ndxL.n * 100) + '% din acțiuni peste media de 50 de zile' : '')
    + (d.idei && d.idei.idei ? ' · poarta T212: ' + d.idei.idei.trecute + ' din ' + d.idei.idei.judecate : '') + '</span>'
    + (vb.faCe ? '<div class="scFac">👉 <b>Ce aș face eu:</b> ' + escapeHtml(vb.faCe) + '</div>' : '') + '</div>';
  return v;
}

function scanDeseneaza() {
  if (!$("scNou") || typeof Scan === "undefined") return;
  var d = scanSt.d, sc = d.scan || {}, R = scanRanduri();
  var la = Math.max(sc.crypto && sc.crypto.la || 0, sc.actiuni && sc.actiuni.la || 0);
  if ($("scCand")) $("scCand").textContent = la ? "scanat la " + new Date(la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + (sc.actiuni && sc.actiuni.la ? " · acțiunile la " + new Date(sc.actiuni.la).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "") : (scanSt.inLucru ? "aduc scanul…" : "");
  var v = scanContext();
  // retetele, cu cate raspund la filtrele de acum
  var baza = scFiltrat(R, true);
  $("scRetete").innerHTML = Scan.RETETE.map(function (r) {
    var n = baza.filter(r.f).length;
    return '<button class="scRet' + (n ? "" : " stins") + '" type="button" data-scr="' + r.k + '" aria-pressed="' + (scanSt.r === r.k) + '"><b>' + r.t + '</b><span class="n">' + n + '</span><span class="scSub">' + r.sub + '</span></button>';
  }).join("");
  var r = Scan.RETETE.find(function (x) { return x.k === scanSt.r; }) || Scan.RETETE[0], av = "";
  if (r.k === "grid" && v && v.nivel === "miscare") av += '<span class="scAv">⚠ Crypto e în mișcare acum: gridul pierde în regimul ăsta. Lista e de urmărit, nu de pornit.</span>';
  if (r.k === "grid" && scanSt.fel === "a") av += '<span class="scAv">Gridul e doar pentru monede: Trading 212 n-are boți.</span>';
  if (r.k === "spargere" && scanSt.fel !== "c") av += '<span class="scAv">La acțiuni, verifică data rezultatelor financiare: o spargere chiar înainte de rezultate e un pariu, nu un semnal.</span>';
  $("scExplic").innerHTML = '<span>' + r.e + '</span>' + av + scIstoricHtml(r.k);
  // filele
  var vechi = scanSt.fel;
  $("scFile").innerHTML = [["toate", "Toate"], ["c", "Crypto"], ["a", "Acțiuni"]].map(function (x) {
    scanSt.fel = x[0]; var n = scFiltrat(R, false).length; scanSt.fel = vechi;
    return '<button class="scFila" type="button" data-scf="' + x[0] + '" aria-pressed="' + (vechi === x[0]) + '">' + x[1] + ' <span class="scMut">' + n + '</span></button>';
  }).join("");
  // lista
  var cap = '<div class="scCapL"><span></span><span>Simbol</span><span>Preț</span><span>Azi</span><span>7 zile</span><span>Față de piață</span><span>Trend</span><span>RSI</span><span>Mișcare</span><span>La max. 20z</span><span>Scor</span></div>';
  var l = scSortat(scFiltrat(R, false)), html;
  if (!R.length) html = '<div class="scGol">' + (d.scanErr ? "Nu pot citi scanul: " + escapeHtml(d.scanErr) : scanSt.inLucru ? "Aduc scanul…" : "Scanul îl face colectorul de acasă o dată pe oră; primul apare la câteva minute după pornire.") + '</div>';
  else if (scanSt.fel === "toate" && !scanSt.q.trim()) {
    html = [["c", "Crypto", "monede Pionex"], ["a", "Acțiuni", "Nasdaq 100 + ale tale"]].map(function (m) {
      var lm = l.filter(function (x) { return x.fel === m[0]; }), n = scanSt["tot" + m[0]] ? lm.length : 15;
      return '<div class="scSecL"><b>' + m[1] + '</b><span class="scSub">' + lm.length + ' ' + m[2] + (scanSt.r === "toate" ? " · primele după scor" : "") + '</span>'
        + (lm.length > n ? '<button class="scBtn" type="button" data-sctot="' + m[0] + '">Arată toate ' + lm.length + '</button>' : "") + '</div>'
        + (lm.length ? lm.slice(0, n).map(scRand).join("") : '<div class="scGol">Nimic din ' + m[1].toLowerCase() + ' nu răspunde la rețeta asta acum.</div>');
    }).join("");
  } else {
    var arat = scanSt.tot ? l : l.slice(0, 30);
    html = (arat.length ? arat.map(scRand).join("") : '<div class="scGol">Nimic nu răspunde la filtrele alese acum.</div>')
      + (l.length > arat.length ? '<div class="scMai"><button class="scBtn" type="button" id="scToate">Arată toate ' + l.length + '</button></div>' : "");
  }
  $("scLista").innerHTML = cap + html;
}
// v96.2: "cat a mers reteta in trecut" - calculat de colector pe barele zilnice, o data pe zi
function scIstoricHtml(k) {
  if (k === "toate") return "";
  if (k === "grid") return '<span class="scIst">📏 <b>În trecut:</b> gridul nu se poate măsura în urmă, fiindcă depinde de clasamentul de grid din ziua aceea. Ce a mers pe boții tăi e pe pagina „Grid: ce setez?”.</span>';
  var ist = scanSt.d.scan && scanSt.d.scan.istoric || {}, l = [];
  [["c", "Crypto"], ["a", "Acțiuni"]].forEach(function (m) {
    if (scanSt.fel !== "toate" && scanSt.fel !== m[0]) return;
    var t = Scan.textIstoric(ist[m[0]], k), o = ist[m[0]];
    if (!t) { if (o) l.push('<span class="scIst"><b>' + m[1] + ':</b> nicio intrare în rețeta asta în istoricul adus.</span>'); return; }
    var cmp = t.mai === null ? "" : t.mai >= 3 ? ' <span class="good">(mai des pe plus decât o zi oarecare)</span>' : t.mai <= -3 ? ' <span class="bad">(mai rar pe plus decât o zi oarecare)</span>' : ' <span class="scMut">(cam ca o zi oarecare)</span>';
    l.push('<span class="scIst"><b>' + m[1] + '</b> · ' + t.n + ' intrări' + (t.putine ? ' <span class="warn">— puține cazuri, cifrele sunt orientative</span>' : '') + ': ' + t.text + cmp + '. <span class="scMut">' + t.baza + '</span></span>');
  });
  if (!l.length) return '<span class="scIst scMut">📏 Cât a mers rețeta în trecut apare după prima tură de noapte a colectorului.</span>';
  return '<span class="scIst">📏 <b>În trecut</b> <span class="scMut">(ultimul an pe monedele de azi din top 100 și 2 ani pe acțiunile de azi: cele care au rezistat, deci cifrele sunt puțin prea bune; nu e o promisiune)</span></span>' + l.join("");
}
function scUrmarit(id) { var u = scanSt.d.scan && scanSt.d.scan.urmarite; return !!(u && u.indexOf(id) >= 0); }
async function scUrmareste(id) {
  var u = (scanSt.d.scan && scanSt.d.scan.urmarite || []).slice(), i = u.indexOf(id);
  if (i >= 0) u.splice(i, 1); else u.push(id);
  scanSt.urmEroare = null;
  try {
    var rr = await apiFetch("/api/istoric-bot?action=scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urmarite: u }) }), r = null;
    try { r = await rr.json(); } catch (e2) {}
    if (!rr.ok) throw new Error((r && r.error) || "HTTP " + rr.status);
    if (scanSt.d.scan) scanSt.d.scan.urmarite = r && Array.isArray(r.urmarite) ? r.urmarite : u;
  } catch (e) { scanSt.urmEroare = typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e); }
  scanDeseneaza();
}
function scMarcaje(x) {
  var m = "";
  if (x.bot) m += '<span class="scMk" title="ai bot pornit pe ea">🤖</span>';
  if (x.port) m += '<span class="scMk" title="e în portofoliul tău Trading 212">💼</span>';
  if (x.rezZile != null && x.rezZile >= 0 && x.rezZile <= 7) m += '<span class="scMk" title="rezultate financiare peste ' + x.rezZile + ' zile">🧾</span>';
  if (x.funding) m += '<span class="scMk" title="funding scump: cei pe long plătesc mult">💸</span>';
  if (scUrmarit(x.fel + x.s)) m += '<span class="scMk" title="îl urmărești: primești pe Discord când intră într-o rețetă sau iese din ea">🔔</span>';
  return m;
}
function scRand(x) {
  var id = x.fel + x.s, tr = '<span class="scTr" title="peste (verde) / sub (roșu) media de 20 · 50 · 200 de zile"><i class="' + (x.e20 ? "s" : "j") + '"></i><i class="' + (x.e50 ? "s" : "j") + '"></i><i class="' + (x.e200 == null ? "" : x.e200 ? "s" : "j") + '"></i></span>';
  return '<div class="scRand" role="button" tabindex="0" data-scid="' + escapeHtml(id) + '" aria-expanded="' + (scanSt.deschis === id) + '">'
    + '<span><i class="scSem ' + x.sem + '" title="' + { v: "verde: trend curat", g: "galben: amestecat", r: "roșu: scade" }[x.sem] + '"></i></span>'
    + '<span class="scSim"><b>' + escapeHtml(x.s) + '</b><span class="scTp ' + x.fel + '">' + (x.fel === "c" ? "CRYPTO" : "ACȚIUNE") + '</span>' + scMarcaje(x) + '</span>'
    + '<span>' + (x.fel === "a" ? "$" : "") + scPret(x.p) + '</span>'
    + '<span class="' + scCls(x.ch) + '">' + scPct(x.ch) + '</span>'
    + '<span class="' + scCls(x.ch7) + '">' + scPct(x.ch7) + '</span>'
    + '<span class="' + scCls(x.rel) + '" title="față de ' + (x.fel === "c" ? "BTC" : "Nasdaq (QQQ)") + ' pe 7 zile">' + scPct(x.rel) + '</span>'
    + '<span>' + tr + '</span>'
    + '<span class="' + (x.rsi > 70 ? "warn" : x.rsi < 30 ? "bad" : "") + '">' + scNf(x.rsi, 0) + '</span>'
    + '<span class="scMis ' + (x.mis >= 2 ? "warn" : "") + '">' + (x.mis == null ? "—" : scNf(x.mis, 1) + "×") + '</span>'
    + '<span class="' + (x.sparge ? "good" : "") + '">' + (x.sparge ? "sparge" : scPct(x.dMax20)) + '</span>'
    + '<span class="scScor">' + x.scor + '</span></div>'
    + (scanSt.deschis === id ? scDetaliu(x) : "");
}

// ---- randul deschis: cine e, starea acum, graficul pe perioade, tabelul starilor, retete, de ce, planul ----
function scDetaliu(x) {
  var id = x.fel + x.s, serie = scanSt.serii[id], d = scanSt.d, nume = d.scan && d.scan.nume && d.scan.nume[id] || "", sec = x.fel === "a" && typeof Acasa !== "undefined" && Acasa.SECTOR ? Acasa.SECTOR[x.s] : null;
  if (serie === undefined) { scanSt.serii[id] = null; scAduSerie(x); }
  var inR = Scan.retete(x).map(function (k) { var r = Scan.RETETE.find(function (q) { return q.k === k; }); return "<span>" + r.t + "</span>"; }).join("") || '<span class="scMut">în nicio rețetă azi</span>';
  var de = [];
  de.push(x.e20 && x.e50 && x.e200 !== false ? "trend în sus: peste mediile de 20, 50" + (x.e200 == null ? "" : " și 200") + " de zile" : !x.e20 && !x.e50 ? "trend în jos: sub mediile de 20 și 50 de zile" : "trend amestecat: " + (x.e20 ? "peste" : "sub") + " media de 20, " + (x.e50 ? "peste" : "sub") + " cea de 50 de zile");
  de.push("RSI " + scNf(x.rsi, 0) + (x.rsi > 70 ? ": urcat mult, risc de răsuflare" : x.rsi < 30 ? ": vândut mult" : x.rsi >= 50 ? ": putere sănătoasă" : ": slăbiciune"));
  if (x.rel != null) de.push((x.rel >= 0 ? "mai tare" : "mai slab") + " decât " + (x.fel === "c" ? "BTC" : "Nasdaq") + " cu " + scNf(Math.abs(x.rel), 1) + " puncte pe 7 zile");
  de.push(x.sparge ? "a închis peste maximul pe 20 de zile" : "la " + scPct(x.dMax20) + " de maximul pe 20 de zile, " + scPct(x.dMin20) + " peste minim");
  if (x.mis != null) de.push("azi " + scPct(x.ch) + ", adică " + scNf(x.mis, 1) + "× o zi obișnuită a ei");
  var pr = x.fel === "a" ? "$" : "", plan = "", idee = x.fel === "a" && ((d.idei && d.idei.idei && d.idei.idei.actiuni) || []).find(function (q) { return q.simbol === x.s; });
  if (idee) {
    plan = '<h5>Planul de la poarta T212</h5><div class="scLin"><span>Intrare</span><b>$' + scPret(idee.intrare) + '</b></div><div class="scLin"><span>Stop</span><b class="bad">$' + scPret(idee.stop) + '</b></div><div class="scLin"><span>Țintă</span><b class="good">$' + scPret(idee.tinta) + '</b></div>'
      + (idee.pePlusProba != null ? '<div class="scLin"><span>Pe istoricul ei</span><b>' + Math.round(idee.pePlusProba * 100) + '% pe plus (' + idee.nProba + ' zile)</b></div>' : '');
  } else {
    var c = typeof t212 !== "undefined" && t212.cont && t212.cont.cash, pl = Scan.plan(x, x.fel === "a" && c ? Number(c.total) : null);
    if (pl) plan = '<h5>Plan orientativ (2× / 3× mișcarea zilnică)</h5><div class="scLin"><span>Mișcarea zilnică (ATR)</span><b>' + scNf(x.atrPct, 1) + '%</b></div>'
      + '<div class="scLin"><span>Stop</span><b class="bad">' + pr + scPret(pl.stop) + ' (' + scPct(pl.stopPct) + ')</b></div><div class="scLin"><span>Țintă</span><b class="good">' + pr + scPret(pl.tinta) + ' (' + scPct(pl.tintaPct) + ')</b></div>'
      + (pl.marime != null ? '<div class="scLin"><span>Mărime la 1% risc din cont</span><b>' + scNf(pl.marime, 0) + ' lei</b></div>' : '');
  }
  if (x.fel === "c") {
    var fu = scanSt.funding[x.s];
    if (fu === undefined) { scanSt.funding[x.s] = null; scAduFunding(x.s); }
    plan += '<h5 class="scH5b">Pentru un bot grid</h5>'
      + (x.stare === "candidat" && !x.miscare ? '<div class="scLin"><span>Grile · pas</span><b>' + scNf(x.grile, 0) + ' · ' + scNf(x.pas * 100, 2) + '%</b></div><div class="scLin"><span>Treceri prin grile / zi</span><b>~' + scNf(x.traversari, 1) + '</b></div><div class="scLin"><span>Lățimea zonei</span><b>' + scNf(x.latime * 100, 1) + '%</b></div>'
        : '<p class="scNota">Acum e în mișcare: nu e bună de grid.</p>')
      + '<div class="scLin"><span>Funding (la 4 ore)</span><b class="' + (fu && fu.scump ? "warn" : "") + '">' + (fu ? scNf(fu.ult * 100, 4) + "% · " + (fu.scump ? "scump, long plătește mult" : fu.ult < 0 ? "negativ, short plătește" : "ca de obicei") : "aduc…") + '</b></div>';
  } else if (x.rez) plan += '<div class="scLin scH5b"><span>Rezultate financiare</span><b class="' + (x.rezZile <= 7 ? "warn" : "") + '">' + new Date(x.rez + "T12:00:00Z").toLocaleDateString("ro-RO", { day: "numeric", month: "short" }) + (x.rezZile >= 0 ? ' (peste ' + x.rezZile + ' zile)' : '') + '</b></div>';
  var mele = x.bot ? '<p class="scNota">🤖 Ai bot pornit pe ea: deschide Tabloul botului pentru starea lui.</p>' : x.port ? '<p class="scNota">💼 O ai în portofoliu: semaforul ei e pe pagina Trading 212.</p>' : "";
  var tab = serie ? '<table class="scStari"><thead><tr><th>Perioada</th><th>Schimbare</th><th>Minim – maxim</th><th>Stare</th></tr></thead><tbody>'
    + Scan.PER.map(function (p) { var z = Scan.starePer(serie, p[0], x.atrPct, x.fel); if (!z) return ""; return '<tr data-scper="' + p[0] + '"' + (p[0] === scanSt.per ? ' class="ales"' : "") + '><td>' + p[1] + '</td><td class="' + scCls(z.ch) + '">' + scPct(z.ch) + '</td><td class="scMut">' + scPret(z.mn) + ' – ' + scPret(z.mx) + '</td><td><span class="' + (z.sens === "urca" ? "good" : z.sens === "scade" ? "bad" : "scMut") + '">' + Scan.SENS[z.sens] + '</span> <span class="scMut">· ' + z.unde + '</span></td></tr>'; }).join("")
    + '</tbody></table>' : "";
  return '<div class="scDet"><div class="scDetSt">'
    + '<div class="scCine"><b>' + escapeHtml(x.s) + '</b><span class="scSub">' + escapeHtml(nume) + (sec ? " · " + escapeHtml(sec) : "") + (x.fel === "c" ? " · futures Pionex" : x.inafara ? " · din portofoliul tău" : " · Nasdaq 100") + ' · volum ' + scVol(x.vol) + ' pe zi</span></div>'
    + '<p class="scAcum">' + (serie ? escapeHtml(Scan.textAcum(serie, x)) : serie === false ? "Nu am putut aduce istoricul prețurilor acum." : "Aduc istoricul prețurilor…") + '</p>'
    + '<div class="scPer" role="group" aria-label="Perioada">' + Scan.PER.map(function (p) { return '<button type="button" data-scper="' + p[0] + '" aria-pressed="' + (p[0] === scanSt.per) + '">' + p[0] + '</button>'; }).join("") + '</div>'
    + scGrafic(x, serie) + tab + mele + '</div>'
    + '<div class="scDetDr"><div><h5>Intră în</h5><div class="scChips">' + inR + '</div></div><div><h5>De ce</h5><ul>' + de.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul></div>'
    + '<div>' + plan + '</div>'
    // v96.1: analiza cu toti indicatorii merge si pe actiuni (preturile de la Yahoo cand nu e cheia Twelve Data)
    + '<div class="scActiuni"><button class="scBtn acc" type="button" data-scanaliza="' + escapeHtml(id) + '">Analiza completă ' + escapeHtml(x.s) + '</button>'
      + (x.fel === "c" ? '<button class="scBtn" type="button" data-scgrid="' + escapeHtml(x.s) + '">Grid: ce setez?</button>' : x.port ? '<button class="scBtn" type="button" data-action-click="navTo(&quot;t212&quot;,true)">Deschide Trading 212</button>' : '') + '</div>'
    + '<p class="scNota">„Analiza completă” deschide pagina cu toți indicatorii, nivelurile și fluxul pentru ' + escapeHtml(x.s) + '.</p>'
    + '<div class="scUrm"><button class="scBtn' + (scUrmarit(id) ? ' urm' : '') + '" type="button" data-scurm="' + escapeHtml(id) + '">' + (scUrmarit(id) ? '🔕 Nu mai anunța' : '🔔 Anunță-mă') + '</button>'
    + '<span class="scNota">' + (scanSt.urmEroare ? '<span class="bad">Nu am putut salva: ' + escapeHtml(scanSt.urmEroare) + '</span>' : scUrmarit(id) ? 'Primești pe Discord când ' + escapeHtml(x.s) + ' intră într-o rețetă sau iese din ea (verificat la fiecare scan).' : 'Pe Discord, când intră într-o rețetă sau iese din ea.') + '</span></div>'
    + '</div></div>';
}
var SC_W = 640, SC_H = 240, SC_PY = 34;
function scCandPer(t, p) {
  var d = new Date(t);
  if (p[2] === "h") return d.toLocaleDateString("ro-RO", { weekday: "short", day: "numeric" }) + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ro-RO", Object.assign({ day: "numeric", month: "short" }, p[4] > 180 ? { year: "2-digit" } : {}));
}
function scGrafic(x, serie) {
  if (!serie) return '<div class="scGraf"><p class="scGol">' + (serie === false ? "Fără prețuri acum." : "Aduc graficul…") + '</p></div>';
  var p = Scan.PER.find(function (q) { return q[0] === scanSt.per; }) || Scan.PER[3], l = Scan.puncte(serie, p[0]);
  if (l.length < 2) return '<div class="scGraf"><p class="scGol">Nu am prețuri pentru perioada asta.</p></div>';
  var v = l.map(function (q) { return q[1]; }), mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), sp = (mx - mn) || mx * 0.01;
  var X = function (i) { return 4 + i * (SC_W - 8) / (l.length - 1); }, Y = function (y) { return SC_PY + (1 - (y - mn) / sp) * (SC_H - SC_PY - 26); };
  var pts = l.map(function (q, i) { return X(i).toFixed(1) + "," + Y(q[1]).toFixed(1); }).join(" ");
  var col = v[v.length - 1] >= v[0] ? "var(--good)" : "var(--bad)", pr = x.fel === "a" ? "$" : "", ch = (v[v.length - 1] / v[0] - 1) * 100;
  var grila = [0, 0.5, 1].map(function (k) { var y = mn + sp * k; return '<line x1="4" x2="' + (SC_W - 4) + '" y1="' + Y(y).toFixed(1) + '" y2="' + Y(y).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>'; }).join("");
  var ax = [0, 0.5, 1].map(function (k) { var y = mn + sp * k; return '<span class="scAx" style="top:calc(6px + var(--gh) * ' + (Y(y) / SC_H).toFixed(3) + ')">' + pr + scPret(y) + '</span>'; }).join("");
  scanSt.graf = { l: l, p: p, X: X, Y: Y, pr: pr };
  return '<div class="scGraf"><div class="scEti" id="scGrafEti"><b>' + pr + scPret(v[v.length - 1]) + '</b> <span class="' + scCls(ch) + '">' + scPct(ch) + '</span> <span class="scMut">în ' + p[1] + '</span></div>'
    + '<svg id="scGrafSvg" viewBox="0 0 ' + SC_W + ' ' + SC_H + '" preserveAspectRatio="none" role="img" aria-label="prețul ' + escapeHtml(x.s) + ' în ' + p[1] + '">' + grila
    + '<polygon points="' + X(0).toFixed(1) + ',' + (SC_H - 26) + ' ' + pts + ' ' + X(l.length - 1).toFixed(1) + ',' + (SC_H - 26) + '" fill="' + col + '" fill-opacity=".10"/>'
    + '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
    + '<circle cx="' + X(l.length - 1).toFixed(1) + '" cy="' + Y(v[v.length - 1]).toFixed(1) + '" r="3.5" fill="' + col + '"/>'
    + '<line id="scGrafCur" x1="0" x2="0" y1="' + SC_PY + '" y2="' + (SC_H - 26) + '" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke" visibility="hidden"/><circle id="scGrafPct" r="4" fill="var(--text)" visibility="hidden"/>'
    + '</svg>' + ax + '<div class="scZile"><span>' + scCandPer(l[0][0], p) + '</span><span>' + scCandPer(l[l.length - 1][0], p) + '</span></div></div>';
}
// barele pe ora (o saptamana) si pe zi (un an), doar cand se deschide randul
async function scAduSerie(x) {
  var id = x.fel + x.s, h = [], z = [];
  var perechi = function (bare) { return bare.map(function (b) { return [b.t, b.c]; }); };
  try {
    if (x.fel === "c") {
      var sym = encodeURIComponent(x.s + "_USDT_PERP");
      var kh = await getJSON("/api/market?type=pionex_klines&symbol=" + sym + "&interval=60M&limit=168"), kz = await getJSON("/api/market?type=pionex_klines&symbol=" + sym + "&interval=1D&limit=365");
      h = perechi(GridCalcul.bareToate(kh && kh.data && kh.data.klines)); z = perechi(GridCalcul.bareToate(kz && kz.data && kz.data.klines));
    } else {
      var tk = encodeURIComponent(x.tk || x.s + "_US_EQ");
      var ph = await getJSON("/api/t212?action=preturi&interval=1h&ticker=" + tk), pz = await getJSON("/api/t212?action=preturi&interval=1d&ticker=" + tk);
      h = perechi(GridCalcul.bareToate(ph && ph.randuri)); z = perechi(GridCalcul.bareToate(pz && pz.randuri)).slice(-260);
    }
    scanSt.serii[id] = h.length || z.length ? { h: h, z: z } : false;
  } catch (e) { scanSt.serii[id] = false; }
  if (scanSt.deschis === id) scanDeseneaza();
}
async function scAduFunding(s) {
  try {
    var r = await getJSON("/api/market?type=pionex_funding&symbol=" + encodeURIComponent(s + "_USDT_PERP")), l = (r && r.data && r.data.rates || []).map(function (q) { return Number(q.fundingRate); }).filter(isFinite);
    if (!l.length) { scanSt.funding[s] = false; return; }
    var srt = l.slice().sort(function (a, b) { return a - b; }), med = srt[Math.floor(srt.length / 2)];
    scanSt.funding[s] = { ult: l[0], med: med, scump: l[0] > 0.0001 && l[0] > med * 2 };
  } catch (e) { scanSt.funding[s] = false; }
  if (scanSt.deschis && scanSt.deschis === "c" + s) scanDeseneaza();
}
function scanAnalizeaza(id) {
  var fel = id.charAt(0), s = id.slice(1);
  if (typeof setAssetClass === "function") setAssetClass(fel === "a" ? "STOCKS" : "CRYPTO");
  if ($("symbol")) $("symbol").value = s;
  navTo("dash", true);
  if (typeof acasaDeschideAnaliza === "function") acasaDeschideAnaliza();
  if (typeof analyze === "function") analyze(true);
}
// v97.2 (ideea 4): "Grid: ce setez?" din Scan deschide fisa cu PLANUL completat, dupa planul lui de la botul activ
async function scanGrid(s) {
  var sug = null;
  try {
    var boti = typeof contTot !== "undefined" && contTot.boti ? contTot.boti : ((await getJSON("/api/bot-orders")) || {}).bots, b = (boti || []).find(function (x) { return x && x.activ; });
    if (b) { var p = await getJSON("/api/istoric-bot?action=plan&bot=" + encodeURIComponent(b.id)), pl = p && p.plan; if (pl && (pl.plus > 0 || pl.minus > 0)) sug = { plus: pl.plus, minus: pl.minus, afaraOre: pl.afaraOre, investit: Number(b.investit) || null, nume: String(b.baza || "").replace(/\.PERP$/, "") }; }
  } catch (e) {}
  window.grDinScan = { simbol: s, la: Date.now(), sug: sug };
  navTo("gridset", true); setTimeout(function () { if (typeof gridClasamentAlege === "function") gridClasamentAlege(s + "_USDT_PERP"); }, 400);
}

document.addEventListener("click", function (e) {
  if (!e.target.closest || !e.target.closest("#scNou")) return;
  var t = e.target.closest("[data-scurm],[data-scper],[data-sctot],[data-scr],[data-scf],[data-scanaliza],[data-scgrid],#scToate,#scRescan,.scRand"); if (!t) return;
  if (t.dataset.scurm) { scUrmareste(t.dataset.scurm); return; }
  if (t.dataset.scper) scanSt.per = t.dataset.scper;
  else if (t.dataset.sctot) scanSt["tot" + t.dataset.sctot] = true;
  else if (t.dataset.scr) { scanSt.r = t.dataset.scr; scanSt.tot = scanSt.totc = scanSt.tota = false; scanSt.deschis = null; }
  else if (t.dataset.scf) { scanSt.fel = t.dataset.scf; scanSt.tot = false; }
  else if (t.dataset.scanaliza) { scanAnalizeaza(t.dataset.scanaliza); return; }
  else if (t.dataset.scgrid) { scanGrid(t.dataset.scgrid); return; }
  else if (t.id === "scToate") scanSt.tot = true;
  else if (t.id === "scRescan") { scanPorneste(true); return; }
  else scanSt.deschis = scanSt.deschis === t.dataset.scid ? null : t.dataset.scid;
  scanDeseneaza();
});
document.addEventListener("keydown", function (e) { var t = e.target; if (t && t.classList && t.classList.contains("scRand") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.click(); } });
document.addEventListener("input", function (e) {
  if (e.target && e.target.id === "scCaut") { scanSt.q = e.target.value; scanDeseneaza(); }
});
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "scMele") { scanSt.mele = e.target.checked; scanDeseneaza(); }
  if (e.target && e.target.id === "scOrdine") { scanSt.ord = e.target.value; scanDeseneaza(); }
});
// cursorul pe grafic: pretul si data de sub deget / mouse
document.addEventListener("pointermove", function (e) {
  var svg = e.target && e.target.closest && e.target.closest("#scGrafSvg"), g = scanSt.graf; if (!svg || !g) return;
  var r = svg.getBoundingClientRect(), n = g.l.length, i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width * SC_W - 4) / ((SC_W - 8) / (n - 1)))));
  var q = g.l[i], c = $("scGrafCur"), pt = $("scGrafPct"), first = g.l[0][1];
  if (!c || !pt) return;
  c.setAttribute("x1", g.X(i)); c.setAttribute("x2", g.X(i)); c.setAttribute("visibility", "visible");
  pt.setAttribute("cx", g.X(i)); pt.setAttribute("cy", g.Y(q[1])); pt.setAttribute("visibility", "visible");
  $("scGrafEti").innerHTML = '<b>' + g.pr + scPret(q[1]) + '</b> <span class="' + scCls(q[1] / first - 1) + '">' + scPct((q[1] / first - 1) * 100) + '</span> <span class="scMut">' + scCandPer(q[0], g.p) + '</span>';
});
document.addEventListener("pointerleave", function (e) { if (e.target && e.target.id === "scGrafSvg") scanDeseneaza(); }, true);
