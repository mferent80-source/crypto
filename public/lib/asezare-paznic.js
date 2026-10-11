// v100.151 · așezarea PAZNIC în Radar (I-589…I-599, demo aprobat de el pe 11.10.2026; designul vine din panoul PAZNIC-CRYPTO).
// Strat peste paginile desenate de app.js: CITEȘTE ce pagina are deja (tbStare, Consilierul din #tbSemafor, nivelurile graficului din
// window.tbGraficUltim, rândul contului .contTot, /api/bot-orders pentru boții închiși) și ADAUGĂ: fâșia cu cifrele contului, verdictul +
// vocile, drumul botului, „Acum” pe telefon, rândurile cheie–valoare, ultimii boți închiși, BUILD în Health, coloana boților (de la 2 boți).
// Nu scrie date, nu trimite nimic. Regula LUI: nimic pierdut — ce se ascunde e decor sau o informație mutată (scris la fiecare pas).
// Banda botului (#botStrip) NU se ascunde: are ceasul gridului îngust, „LICHIDARE DEPĂȘITĂ”, prețul live (revizia Opus, C2).
// Proba: scripts/proba-v100151.mjs. window.__pzPauza = true oprește tura (inventarul „nimic pierdut” compară pagina cu și fără strat).
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var nr = function (v) { var x = typeof v === "string" ? Number(v.replace(/[−–]/g, "-").replace(/\s/g, "").replace(/,(\d+)$/, ".$1")) : v; return typeof x === "number" && isFinite(x) ? x : null; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var semn = function (v, z) { return v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(z == null ? 2 : z).replace(".", ","); };
  var fP = function (v) { return v == null ? "—" : v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(5); };
  var ingust = function () { return innerWidth <= 550; };
  var st = function () { try { return typeof tbStare !== "undefined" ? tbStare : null; } catch (e) { return null; } };
  var bot = function () { var s = st(); return s && s.routeOk !== false && s.bot || null; };
  var boti = function () { var s = st(); return ((s && s.boti) || []).filter(function (b) { return b && b.activ !== false; }); };
  var nav = function (id) { try { navTo(id, true); } catch (e) {} };
  // pragurile lichidării = ale Tabloului (sub 8% roșu, sub 15% galben) - o singură voce
  var tonLich = function (d) { return d == null ? "" : d < 8 ? "pzR" : d < 15 ? "pzA" : ""; };

  // ---------- glosarul (I-595): termenii cu subliniere punctată ----------
  var GLOSAR = {
    "din grid": "Ce au adus grilele: perechi cumpărare–vânzare închise, înainte de poziție și de funding.",
    "pe grilă": "Cât aduce o singură pereche, după comision.",
    "funding": "Taxa plătită/primită la 8 h între long și short pe perpetue; la long cu funding pozitiv plătești.",
    "funding, media 7 zile": "Rata de funding pe zi, media ultimelor 7 zile.",
    "funding plătit": "Funding-ul estimat pe săptămână la poziția de acum.",
    "ritmul de recuperare se socotește după o zi de viață": "În cât timp ar acoperi grilele pierderea de acum, la ritmul de până acum.",
    "până jos": "Cât trebuie să scadă prețul până la marginea de jos a gridului.",
    "până sus": "Cât trebuie să urce prețul până la marginea de sus a gridului.",
    "lichidarea la": "Prețul la care Pionex închide forțat botul; pierzi marja.",
    "lichidare": "Prețul la care Pionex închide forțat botul; pierzi marja.",
    "zero": "Prețul la care, dacă închizi acum, ieși fără câștig și fără pierdere.",
    "plan +": "Ținta ta pe plus, cu cumpărările gridului de pe drum socotite.",
    "plan −": "Pragul tău de pierdere, cu cumpărările gridului de pe drum socotite.",
    "stop": "Stopul pus în Pionex: acolo botul se oprește singur."
  };
  var gl = function (k) { var g = GLOSAR[k.toLowerCase().trim()]; return g ? '<span class="pzK" tabindex="0" title="' + esc(g) + '">' + esc(k) + '</span>' : '<span class="pzK pzKfara">' + esc(k) + '</span>'; };

  // ---------- citirile (pure; probate) ----------
  // rândul contului din Tablou: „Trading 212 · 29.189 lei · deschise −2.250 lei” (și „+123 lei” pe plus - revizia I3)
  function t212Din(text) { var m = String(text || "").match(/Trading 212 · ([\d.,]+) lei · deschise ([+−\-]?[\d.,]+) lei/); return m ? { cont: m[1], deschise: m[2], minus: /^[−\-]/.test(m[2]) } : null; }
  // colectorul = inima lui (config.colectorLa), aceeași regulă ca Tabloul: „merge” până la 3 min (revizia I2: NU ora Monte Carlo)
  function colectorDin(cfg, acum) { var la = cfg && nr(cfg.colectorLa); if (!la) return null; var min = Math.max(0, Math.round((acum - la) / 60000)); return { min: min, viu: min <= 3 }; }
  // cea mai apropiată lichidare: |distanța|, iar „depășită” se spune (revizia C2)
  function lichDin(lista) {
    var r = null; (lista || []).forEach(function (b) { var d = nr(b && b.distantaLichidarePct); if (b && b.lichidareDepasita) r = { depasita: true, bot: b }; else if (d != null && (!r || (!r.depasita && Math.abs(d) < r.d))) r = { d: Math.abs(d), bot: b }; });
    return r;
  }
  // verdictul ținut cât Consilierul socotește: același bot, cel mult 2 h (revizia I4)
  function verdictValid(salvat, botId, acum) { return !!(salvat && salvat.botId === botId && acum - salvat.la <= 2 * 3600000 && salvat.verb); }
  // proza „a · b · c” -> rânduri etichetă (stânga) – cifră (dreapta)
  function randuriKv(t) {
    return String(t).split(" · ").map(function (p) {
      // valoarea = prima cifră cu unitatea ei (și „≈ x USDT” / „pe zi” lipite); eticheta = restul frazei
      var m = p.match(/[+−\-–~≈]?\s?\d[\d.,]*\s?(?:%|USDT|lei|×|zile|zi|h|min)?(?:\s?(?:≈|~)\s?[\d.,]+\s?(?:USDT|lei)?)?(?:\s(?:pe zi|pe săptămână))?(?:\s?[-–]\s?[\d.,]+)?/);
      if (!m) return '<div class="pzKv"><span class="pzKfara">' + esc(p) + '</span></div>';
      var et = (p.slice(0, m.index) + " " + p.slice(m.index + m[0].length)).replace(/\s+,/g, ",").replace(/\s+/g, " ").replace(/^[,:\s]+|[,:≈\s]+$/g, "").trim();
      et = et.replace(/^funding\s*,?\s*media (\d+) zile$/i, "funding, media $1 zile").replace(/^din ([\d.]+) investiți$/i, "față de $1 USDT investiți").replace(/^prețul trebuie să scadă până la$/i, "lichidarea la").replace(/^plătești$/i, "funding plătit");
      return '<div class="pzKv">' + (et ? gl(et) : '<span class="pzKfara">intervalul gridului</span>') + '<b>' + esc(m[0].trim()) + '</b></div>';
    }).join("");
  }
  // eticheta lângă margine se ancorează spre interior (pe 390 ieșea din ecran)
  function ancora(x) { x = +x; return x < 12 ? "transform:translateX(-6px);" : x > 88 ? "transform:translateX(calc(-100% + 6px));" : ""; }

  // ---------- datele paginii (o dată pe tură) ----------
  var D = {};
  function citeste() {
    var s = st() || {}, ct = document.querySelector("#tabloubot .contTot"), ctx = ct ? ct.textContent : "";
    var sold = null, soldDin = "";
    try { var e = s.extra || {}; if (e.futures && e.futures.total > 0) { sold = nr(e.futures.total); soldDin = "soldul contului de futures (Pionex)"; } } catch (e1) {}
    if (sold == null) { var m = ctx.match(/Pionex · sold ([\d.,]+) USDT/); if (m) { sold = nr(m[1]); soldDin = "soldul din rândul Pionex al Tabloului"; } }
    if (sold == null) { try { var g = grSoldCitit(); if (g && g.sold) { sold = nr(g.sold); soldDin = "soldul scris de tine în fișa Grid (nu e citit din Pionex)"; } } catch (e2) {} }
    D = { s: s, bot: bot(), boti: boti(), sold: sold, soldDin: soldDin, t212: t212Din(ctx), col: colectorDin(s.istoricServer && s.istoricServer.config, Date.now()), lich: lichDin(boti()) };
  }
  function alerteNr() { var m = (document.querySelector('[data-nav="alerts"]') || {}).textContent; m = m && m.match(/(\d+)/); return m ? +m[1] : 0; }

  // ---------- I-591: drumul botului (nivelurile = ale graficului, din date) ----------
  function nivele(b) {
    var L = [], add = function (p, n, c, cls) { p = nr(p); if (p != null && p > 0) L.push({ p: p, n: n, c: c, cls: cls || "" }); };
    var G = window.tbGraficUltim, NUME = { gridSus: ["grid sus", "var(--pzInfo)"], planPlus: ["plan +", "var(--pzSus)"], zero: ["zero", "var(--pzAur)"], intrare: ["intrare", "var(--pzT1)"], planMinus: ["plan −", "var(--pzJos)"], gridJos: ["grid jos", "var(--pzInfo)"], stop: ["stop", "var(--pzJos)"], lich: ["lichidare", "var(--pzJos)", "pzTare"] };
    if (G && G.botId === b.id && G.niv && G.niv.length) {
      G.niv.forEach(function (x) { var q = NUME[x.k]; if (q) add(x.p, q[0], q[1], q[2]); });
      if (G.stopPlan) add(G.stopPlan, "stopul planului", "var(--pzJos)", "pzSub");
    } else {   // graficul n-a desenat încă: ce știm sigur din bot
      add(b.pretLichidare || b.lichidareJos, "lichidare", "var(--pzJos)", "pzTare"); if (b.opritorPierdereActiv) add(b.opritorPierdere, "stop", "var(--pzJos)");
      add(b.gridJos, "grid jos", "var(--pzInfo)"); add(b.pretDeschidere, "intrare", "var(--pzT1)"); add(b.gridSus, "grid sus", "var(--pzInfo)");
    }
    return L;
  }
  function drumHtml(b, mic, latime) {
    var L = nivele(b), p = nr(b.pretCurent); if (!L.length || p == null) return "";
    var lo = Math.min.apply(null, L.map(function (x) { return x.p; }).concat(p)), hi = Math.max.apply(null, L.map(function (x) { return x.p; }).concat(p)), pad = (hi - lo) * 0.04 || 1e-9;
    lo -= pad; hi += pad; var X = function (v) { return ((v - lo) / (hi - lo) * 100).toFixed(2); };
    L.sort(function (a, c) { return a.p - c.p; });
    for (var mi = L.length - 1; mi >= 1; mi--) if (Math.abs(L[mi].p - L[mi - 1].p) / (hi - lo) < 0.004) { L[mi - 1].n += " · " + L[mi].n; L[mi - 1].cls += " " + L[mi].cls; L.splice(mi, 1); }
    var W = Math.max(280, latime || 1100), rand = [];   // rândurile etichetelor după lățimea REALĂ a cartelei (revizia I7)
    L.forEach(function (x) { var w = (x.n.length + 8) * 6.3, cx = X(x.p) * W / 100, k = 0; while (rand[k] && rand[k] > cx - w / 2 - 8) k++; rand[k] = cx + w / 2; x.rand = k; });
    var nrR = Math.max.apply(null, L.map(function (x) { return (x.rand || 0) + 1; })), h = '<div class="pzDrum' + (mic ? " pzDrumMic" : "") + '"' + (mic ? "" : ' style="padding-bottom:' + (14 + nrR * 16) + 'px"') + '><div class="pzDrumPista">';
    var gj = nr(b.gridJos), gs = nr(b.gridSus);
    if (gj && gs) h += '<i class="pzDrumGrid" style="left:' + X(gj) + '%;width:' + (X(gs) - X(gj)).toFixed(2) + '%"></i>';
    L.forEach(function (x) { h += '<i class="pzDrumNiv ' + x.cls + '" style="left:' + X(x.p) + '%;background:' + x.c + '" title="' + esc(x.n + " " + fP(x.p)) + '"></i>' + (mic ? "" : '<span class="pzDrumEt" style="left:' + X(x.p) + '%;' + ancora(X(x.p)) + 'top:' + (16 + x.rand * 16) + 'px;color:' + x.c + '">' + esc(x.n) + ' <b>' + fP(x.p) + '</b></span>'); });
    h += '<i class="pzDrumAcum" style="left:' + X(p) + '%" title="acum ' + fP(p) + '"></i>' + (mic ? "" : '<span class="pzDrumAcumEt" style="left:' + X(p) + '%;' + ancora(X(p)) + '">acum ' + fP(p) + '</span>');
    return h + '</div></div>';
  }

  // ---------- I-589: fâșia cu cifrele CONTULUI (banda botului rămâne în bara de sus) ----------
  function celule() {
    var C = [], cel = function (et, val, cls, tit, act) { C.push('<button type="button" class="pzCel ' + (cls || "") + '"' + (act ? ' data-pz-nav="' + act + '"' : "") + (tit ? ' title="' + esc(tit) + '"' : "") + '><span>' + esc(et) + '</span><b>' + val + '</b></button>'); };
    cel(/fișa Grid/.test(D.soldDin) ? "sold (din fișă)" : "sold Pionex", D.sold != null ? D.sold.toFixed(1).replace(".", ",") + ' <small>USDT</small>' : "—", "", D.soldDin || "soldul se citește din Pionex", "account");
    var bs = D.boti, tot = bs.reduce(function (a, x) { return a + (nr(x.profitTotal) || 0); }, 0);
    cel(bs.length === 1 ? "botul, total" : "boți activi · total", bs.length ? (bs.length > 1 ? bs.length + ' · ' : "") + '<span class="' + (tot >= 0 ? "pzV" : "pzR") + '">' + semn(tot) + '</span> <small>USDT</small>' : (D.s && D.s.routeOk === true ? "niciunul" : "—"), "", "rezultatul total al boților activi", "tabloubot");
    var L = D.lich;
    cel("cea mai aproape lichidare", L ? (L.depasita ? '<span class="pzR">DEPĂȘITĂ</span> <small>' + esc((L.bot.baza || "").replace(".PERP", "")) + '</small>' : '<span class="' + tonLich(L.d) + '">' + L.d.toFixed(1).replace(".", ",") + '%</span> <small>' + esc((L.bot.baza || "").replace(".PERP", "")) + '</small>') : "—", L && (L.depasita || L.d < 8) ? "pzRosu" : "", "cât mai are prețul până la lichidare (cel mai expus bot)", "tabloubot");
    var t = D.t212;
    cel("T212 deschise", t ? '<span class="' + (t.minus ? "pzR" : "pzV") + '">' + esc(t.deschise) + '</span> <small>lei</small>' : "—", "", t ? "Trading 212: cont " + t.cont + " lei" : "se citește din rândul contului, când e adus", "t212");
    var a = alerteNr(); cel("alerte", String(a), a ? "pzAtentie" : "", "alerte necitite", "alerts");
    var c = D.col;
    cel("colectorul de acasă", c ? (c.viu ? '<span class="pzV">merge</span> <small>acum ' + c.min + ' min</small>' : '<span class="pzR">oprit de ' + c.min + ' min</span>') : "—", c && !c.viu ? "pzRosu" : "", c ? (c.viu ? "colectorul a dat semn acum " + c.min + " min" : "ultimul semn al colectorului: acum " + c.min + " min — pornește PORNESTE-CRYPTO-RADAR.bat") : "colectorul nu a dat semn (sau serverul de acasă nu răspunde)", "tabloubot");   /* nu „cloud”: Cloud Monitor e despre D1, nu despre colector (harta paginilor) */
    return C.join("");
  }
  function fasie() {
    var m = document.querySelector(".mainArea main") || document.querySelector("main"); if (!m) return;
    var k = $("pzKpi"); if (!k) { k = document.createElement("div"); k.id = "pzKpi"; k.setAttribute("role", "group"); k.setAttribute("aria-label", "Cifrele contului"); m.insertBefore(k, m.firstChild); }
    var h = celule(); if (k._h !== h) { k.innerHTML = h; k._h = h; }
  }

  // ---------- I-590: verdictul sus în Tablou ----------
  function voci() {
    var V = [];
    document.querySelectorAll("#tbGrafic .gbSem").forEach(function (g) {
      var t = (g.querySelector("title") || {}).textContent || "", cs = g.querySelectorAll("circle"), c = cs.length ? cs[cs.length - 1].getAttribute("fill") || "" : "";
      var ton = /#26A96C/i.test(c) ? "da" : /#E0524A/i.test(c) ? "nu" : /#E9B949/i.test(c) ? "atentie" : "neutru";
      V.push({ n: (t.split(":")[0] || "").trim(), ton: ton, tit: t });
    });
    var cit = $("tbCitire"); if (cit) [].forEach.call(cit.children, function (x) {
      var t = (x.textContent || "").trim(), cap = t.slice(0, 40);   // rândul începe cu iconița (🎰/✓) - căutăm în cap, nu cu ^ (revizia, minor)
      if (/Monte Carlo/.test(cap)) V.push({ n: "Monte Carlo", ton: /contra botului/i.test(t) ? "nu" : /cu botul/i.test(t) ? "da" : "neutru", tit: t.split("\n")[0].slice(0, 200) });
      else if (/^\W*Busola/.test(cap)) V.push({ n: "Busola", ton: /invers/i.test(t) ? "nu" : /ca botul/i.test(t) ? "da" : "neutru", tit: t.split("\n")[0].slice(0, 200) });
    });
    return V;
  }
  var ultimBotV = null;
  function verdict() {
    var el = $("pzVerdict"), b = D.bot, sem = $("tbSemafor"), gL = $("tbGridLarg");
    if (!b || !sem) { if (el) { el.hidden = true; el._h = ""; } if (gL) gL.classList.remove("pzInVerdict"); return; }   // fără bot / ruta picată: nu rămâne verdictul de dinainte (revizia I4)
    var niv = sem.querySelector(".tbConsEt, .tbSemNivel"), tit = sem.querySelector(".tbConsSt h3, .tbSemCap b"), fac = sem.querySelector(".tbConsFac p:not(.tbEt2):not(.tbSub), .tbFac");
    var tonV = niv ? (niv.classList.contains("critic") || /IE[ȘS]I/i.test(niv.textContent) ? "jos" : niv.classList.contains("atentie") ? "aur" : /[ȚT]INE|bine/i.test(niv.textContent + niv.className) ? "sus" : "mut") : "mut";
    var verb = niv ? niv.textContent.replace(/[^\p{L}\s]/gu, "").trim().toUpperCase() : "", txtTit = tit ? tit.textContent : "", txtFac = fac ? fac.textContent.replace(/^👉\s*/, "") : "";
    var cheie = "pzVerdictUlt", salvat = null, nota = "", schimbat = ultimBotV !== b.id; ultimBotV = b.id;
    try { salvat = JSON.parse(localStorage.getItem(cheie) || "null"); } catch (e) {}
    if (!verb || /SOCOTESC|FĂRĂ BOT/.test(verb)) {
      if (verdictValid(salvat, b.id, Date.now())) { verb = salvat.verb; tonV = salvat.ton; txtTit = salvat.tit; txtFac = salvat.fac; var d = new Date(salvat.la); nota = '<p class="pzDin">ultimul verdict, de la ' + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + ' · Consilierul îl reverifică acum</p>'; }
    } else if (!schimbat && (!salvat || salvat.botId !== b.id || salvat.verb !== verb || salvat.tit !== txtTit)) {   // la schimbarea botului se așteaptă o tură: DOM-ul Consilierului poate fi încă al botului vechi
      try { localStorage.setItem(cheie, JSON.stringify({ botId: b.id, verb: verb, ton: tonV, tit: txtTit, fac: txtFac, la: Date.now() })); } catch (e) {}
    }
    // O SINGURĂ VOCE: avertismentul „gridul e mai larg…” intră în verdict ca MOTIV, cu textul lui ÎNTREG (și „Ce aș face eu”, neschimbat)
    var motivG = "";
    if (gL && gL.textContent.trim() && !gL.hidden) {
      var rnd = [].slice.call(gL.children).filter(function (x) { return !x.classList.contains("pzDin"); }).map(function (x) { return x.textContent.trim(); }).filter(Boolean);
      motivG = '<div class="pzMotiv"><b>' + esc((rnd[0] || "").replace(/^⚠️?\s*/, "⚠ ")) + '</b>' + rnd.slice(1).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join("") + '<p class="pzDin">din: fișa de trade (levierul) · Pionex (gridul botului)</p></div>';
    }
    var V = voci(), SIM = { da: "✓", nu: "✗", atentie: "!", neutru: "–" };
    var h = '<div class="pzVerbRand"><span class="pzVerb pzVerb-' + tonV + '">' + esc(verb || "—") + '</span>'
      + '<div class="pzVerbTxt"><b>' + esc(txtTit) + '</b>' + (txtFac ? '<p>' + esc(txtFac) + '</p>' : "") + nota + '<p class="pzDin">din: Consilierul · motivele întregi în cartela lui, mai jos</p></div></div>' + motivG
      + (V.length ? '<div class="pzVoci">' + V.map(function (v) { return '<span class="pzVoce pzVoce-' + v.ton + '" title="' + esc(v.tit) + '">' + SIM[v.ton] + " " + esc(v.n) + '</span>'; }).join("") + '</div>' : "");
    if (!el) { el = document.createElement("section"); el.id = "pzVerdict"; var ref = gL || $("tbKpi"); if (!ref) return; ref.parentNode.insertBefore(el, ref); }
    el.hidden = false; if (el._h !== h) { el.innerHTML = h; el._h = h; }
    if (gL) gL.classList.toggle("pzInVerdict", !!motivG && el.contains(el.querySelector(".pzMotiv")));   // cartela se ascunde DOAR după ce textul ei e în verdict (revizia I5)
  }

  // ---------- drumul (cartela din Tablou) ----------
  function drum() {
    var b = D.bot, k = $("tbKpi"), el = $("pzDrumCard");
    if (!b || !k) { if (el) { el.hidden = true; el._h = ""; } document.body.classList.remove("pzAreDrum"); return; }
    if (!el) { el = document.createElement("section"); el.id = "pzDrumCard"; k.parentNode.insertBefore(el, k); }
    var corp = drumHtml(b, false, el.clientWidth - 28);
    if (!corp) { el.hidden = true; document.body.classList.remove("pzAreDrum"); return; }   // fără drum, barele vechi rămân la vedere
    var h = '<div class="pzCap"><b>Drumul botului</b><span>nivelurile de pe grafic, într-o linie · atinge o liniuță pentru preț</span></div>' + corp;
    el.hidden = false; if (el._h !== h) { el.innerHTML = h; el._h = h; }
    document.body.classList.add("pzAreDrum");
    ["tbKpiLichBara", "tbKpiGridPunct"].forEach(function (id) { var x = $(id); if (x && x.parentElement && x.parentElement.id !== "tbKpi") x.parentElement.classList.add("pzPistaVeche"); });
  }

  // ---------- I-592: ecranul „Acum” pe telefon ----------
  function acum() {
    var d = $("dash"), el = $("pzAcum");
    if (!ingust() || !d) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement("section"); el.id = "pzAcum"; d.insertBefore(el, d.firstChild); }
    el.hidden = false;
    var todo = document.querySelector("#tbTodoLista > *"), fr = todo ? (todo.querySelector("b") || todo).textContent.trim() : "", bs = D.boti, s = D.s || {};
    var stare = s.routeOk === false ? "Boții nu se pot citi acum (" + (s.eroare || "eroare") + ") — deschide Tabloul botului." : s.routeOk !== true ? "Citesc boții…" : !bs.length ? "Niciun bot pornit acum." : "Deschide Tabloul botului pentru ce ai de făcut.";   // revizia I8
    var h = '<div class="pzAcumGrila">' + celule() + '</div><p class="pzAcumFraza">' + esc(fr || stare) + '</p>'
      + (bs.length ? '<div class="pzCap"><b>Deschise acum · ' + bs.length + '</b></div>' + bs.map(function (b) {
        var t = nr(b.profitTotal);
        return '<button type="button" class="pzRandBot" data-pz-bot="' + esc(b.id) + '" data-pz-nav="tabloubot"><span><b>' + esc((b.baza || "").replace(".PERP", "")) + '</b> <small>' + esc((b.directie || "") + " " + b.levier + "×") + '</small></span>' + drumHtml(b, true) + '<b class="' + (t >= 0 ? "pzV" : "pzR") + '">' + semn(t) + '</b></button>';
      }).join("") : "");
    if (el._h !== h) { el.innerHTML = h; el._h = h; }
  }

  // ---------- I-593: „Ce spune piața acum” pliat (rândurile cu BUTOANE rămân întregi: faptele la vedere) ----------
  var deschise = {};
  function pliaza() {
    var cit = $("tbCitire"); if (!cit) return;
    [].forEach.call(cit.children, function (x, i) {
      if (i < 3 || x.classList.contains("pzFoldOk") || x.querySelector("button,a,input,select")) return;
      x.classList.add("pzFoldOk", "pzFold");
      var cheie = (x.textContent || "").slice(0, 14); if (deschise[cheie]) x.classList.remove("pzFold");
      x.setAttribute("tabindex", "0"); x.setAttribute("title", "atinge ca să deschizi / închizi");
      x.addEventListener("click", function () { x.classList.toggle("pzFold"); deschise[cheie] = !x.classList.contains("pzFold"); });
    });
  }

  // ---------- I-594: cadranele -> cifră + bara intervalului ----------
  function cadran(id, lo0, hi0, reMinMax) {
    var c = $(id); if (!c) return; var svg = c.querySelector(".acCadran"), v = c.querySelector(".acFgv b"), et = c.querySelector(".acEt");
    if (!svg || !v) return; var val = nr(v.textContent); if (val == null) return;
    var tx = et ? et.textContent : "", m = tx.match(reMinMax), mn = m ? nr(m[1]) : null, mx = m ? nr(m[2]) : null, zile = (tx.match(/(\d+) de zile/) || [])[1];
    var X = function (q) { return Math.max(0, Math.min(100, (q - lo0) / (hi0 - lo0) * 100)).toFixed(1); };
    var h = '<div class="pzRange" title="' + esc(tx) + '"><div class="pzRangePista">' + (mn != null ? '<i class="pzRangeBanda" style="left:' + X(mn) + '%;width:' + (X(mx) - X(mn)).toFixed(1) + '%"></i>' : "") + '<i class="pzRangeAcum' + (val > hi0 || val < lo0 ? " pzRangeAfara" : "") + '" style="left:' + X(val) + '%"></i></div><div class="pzRangeAx"><span>' + lo0 + '</span>' + (mn != null ? '<span class="pzRangeMm">' + (zile ? esc(zile) + " de zile: " : "") + mn + ' – ' + mx + '</span>' : "") + '<span>' + hi0 + (val > hi0 ? " ▸" : "") + '</span></div></div>';
    var r = c.querySelector(".pzRange");
    if (!r || c._pzH !== h) { if (!r) { r = document.createElement("div"); svg.parentNode.insertBefore(r, svg.nextSibling); } r.outerHTML = h; c._pzH = h; }
    c.classList.add("pzFaraCadran");   // cadranul (decor) se ascunde; cifra, cuvântul și intervalul rămân
  }

  // ---------- I-595: proza din cartele -> rânduri (culoarea cartelei se păstrează: verde/roșu/galben - revizia I6) ----------
  function kv(id) {
    var s = $(id); if (!s || !s.textContent.trim()) return;
    /* proza o ascunde CSS-ul cât timp rândurile stau lângă ea (`:has(+.pzKvBloc)`), nu o clasă: app.js îi rescrie className la fiecare
       redesenare (pune(id, text, clasa)) și proza clipea până la tura următoare (el, 11.10: „apare și dispare un scris verde”).
       Observatorul refă rândurile ÎN ACEEAȘI CLIPĂ cu proza; scrie doar în rânduri (alt nod), deci nu se poate învârti în buclă. */
    if (!s._pzObs && typeof MutationObserver === "function") { s._pzObs = new MutationObserver(function () { kv(id); }); s._pzObs.observe(s, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] }); }
    var t = s.textContent.trim(), ton = /\bbad\b/.test(s.className) ? "bad" : /\bgood\b/.test(s.className) ? "good" : /tbWarn|warn/.test(s.className) ? "tbWarn" : "";
    var r = $(id + "Kv"); if (s._t === t && r && r._ton === ton) return; s._t = t;
    if (!r) { r = document.createElement("div"); r.id = id + "Kv"; s.parentNode.insertBefore(r, s.nextSibling); }
    r.className = "pzKvBloc" + (ton ? " " + ton : ""); r._ton = ton; r.innerHTML = randuriKv(t);   // același text, așezat pe rânduri
  }

  // ---------- I-596: ultimii boți închiși sub grafic (reîmprospătat la 10 min - revizia I11) ----------
  var inchisi = null, inchisiLa = 0;
  function ultimii() {
    var g = $("tbGraficCard"); if (!g) return;
    if (Date.now() - inchisiLa > (inchisi ? 600000 : 60000)) { inchisiLa = Date.now(); try { getJSON("/api/bot-orders?status=finished&limit=100").then(function (d) { if (d && Array.isArray(d.bots)) inchisi = d.bots; }).catch(function () {}); } catch (e) {} }
    if (!inchisi) return;
    var L = inchisi.filter(function (b) { return nr(b.inchisLa); }).sort(function (a, b) { return b.inchisLa - a.inchisLa; }).slice(0, 5);
    var h = '<span class="pzUltEt">ultimii boți închiși:</span> ' + L.map(function (b) { var t = nr(b.profitTotal); return '<span class="pzChip"><b>' + esc((b.baza || "").replace(".PERP", "")) + '</b> <span class="' + (t >= 0 ? "pzV" : "pzR") + '">' + semn(t) + '</span></span>'; }).join(" ") + ' <button type="button" class="pzLink" data-pz-nav="jurnaltrade">vezi toate ↗</button>';
    var el = $("pzUltimii"); if (!el) { el = document.createElement("div"); el.id = "pzUltimii"; g.appendChild(el); }
    if (el._h !== h) { el.innerHTML = h; el._h = h; }
  }

  // ---------- I-597: avertismentul cu sursa ----------
  function avert() {
    var a = $("tbGridLarg"); if (!a || a.hidden || a.querySelector(".pzDin")) return;
    a.classList.add("pzAvert"); var p = document.createElement("p"); p.className = "pzDin"; p.textContent = "din: fișa de trade (levierul) · Pionex (gridul botului)"; a.appendChild(p);
  }

  // ---------- I-598: BUILD în Health ----------
  function build() {
    var f = document.querySelector(".sideFooter"), h = $("health"); if (!f || !h || f.parentNode.id === "pzBuild") return;
    var c = document.createElement("section"); c.id = "pzBuild"; c.className = "pzBuildCard";
    var cap = document.createElement("div"); cap.className = "pzCap"; cap.innerHTML = "<b>Versiunea și motorul</b><span>mutat aici din josul meniului (v100.151)</span>";
    window.__pzSide = f.parentNode; c.appendChild(cap); h.insertBefore(c, h.firstChild); c.appendChild(f);
  }

  // ---------- I-599: coloana boților pe ecran lat (de la 2 boți) ----------
  function coloana() {
    var tab = $("tabloubot"); if (!tab) return;
    var el = $("pzBotiCol"), lat = innerWidth >= 1280 && D.boti.length >= 2;
    if (!lat) { if (el) el.hidden = true; tab.classList.remove("pzCuColoana"); return; }
    if (!el) { el = document.createElement("aside"); el.id = "pzBotiCol"; tab.insertBefore(el, tab.firstChild); }
    el.hidden = false; tab.classList.add("pzCuColoana");
    var bs = D.boti.slice().sort(function (a, b) { return (b.lichidareDepasita ? -1 : Math.abs(nr(a.distantaLichidarePct) || 999)) - (a.lichidareDepasita ? -1 : Math.abs(nr(b.distantaLichidarePct) || 999)); }), cur = D.bot, t = D.t212;
    var h = '<div class="pzCap"><b>Aproape de rupere</b><span>după distanța la lichidare</span></div>' + bs.map(function (b) {
      var tt = nr(b.profitTotal), d = nr(b.distantaLichidarePct), dd = d == null ? null : Math.abs(d);
      return '<button type="button" class="pzColRand' + (cur && cur.id === b.id ? " pzColAles" : "") + '" data-pz-bot="' + esc(b.id) + '"><span><b>' + esc((b.baza || "").replace(".PERP", "")) + '</b> <small>' + esc(b.directie + " " + b.levier + "×") + '</small></span><span class="pzColD ' + (b.lichidareDepasita ? "pzR" : tonLich(dd)) + '">' + (b.lichidareDepasita ? "DEPĂȘITĂ" : dd == null ? "—" : dd.toFixed(1).replace(".", ",") + "%") + '</span><b class="' + (tt >= 0 ? "pzV" : "pzR") + '">' + semn(tt) + '</b></button>';
    }).join("") + (t ? '<div class="pzCap pzCapMic"><b>Trading 212</b></div><button type="button" class="pzColRand" data-pz-nav="t212"><span>deschise</span><span></span><b class="' + (t.minus ? "pzR" : "pzV") + '">' + esc(t.deschise) + ' lei</b></button>' : "");
    if (el._h !== h) { el.innerHTML = h; el._h = h; }
  }

  // clicurile stratului (alegerea botului prin selectul existent, apoi navigarea)
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pz-bot]"); if (b) { var s = $("tbBotAles"); if (s && s.value !== b.getAttribute("data-pz-bot")) { s.value = b.getAttribute("data-pz-bot"); s.dispatchEvent(new Event("change", { bubbles: true })); } }
    var n = e.target.closest("[data-pz-nav]"); if (n) nav(n.getAttribute("data-pz-nav"));
  });

  // probabilitățile (1.858 px) pornesc pliate - titlul lor rămâne la vedere; e informație, nu o faptă
  var pliatProb = false;
  function ordine() { var d = $("tbPl-prob"); if (d && !pliatProb && d.tagName === "DETAILS" && d.open) { d.open = false; pliatProb = true; } }
  function tura() {
    if (window.__pzPauza) return;
    try { citeste(); } catch (e) { return; }
    [fasie, verdict, drum, acum, pliaza, ordine, function () { cadran("acFg", 0, 100, /între (\d+) și (\d+)/); cadran("acVix", 10, 40, /între ([\d,]+) și ([\d,]+)/); },
      function () { ["tbKpiGrid", "tbKpiTotalSub", "tbKpiPretSub", "tbKpiLichSub"].forEach(kv); }, ultimii, avert, build, coloana]
      .forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn("asezare-paznic", f.name, e); } });
  }
  window.AsezarePaznic = { randuriKv: randuriKv, ancora: ancora, GLOSAR: GLOSAR, t212Din: t212Din, colectorDin: colectorDin, lichDin: lichDin, verdictValid: verdictValid, tonLich: tonLich };
  document.documentElement.classList.add("pzDemo");
  var rz = null; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(tura, 200); });   // revizia I10: fără tură la fiecare pixel
  setInterval(tura, 1500); setTimeout(tura, 300);
})();
