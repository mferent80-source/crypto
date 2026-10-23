// v100.151–152 · așezarea PAZNIC în Radar (I-589…I-599; v100.152: toate paginile Zilnic + Unelte după modelul Tabloului, demo aprobat de el pe 11.10.2026; designul vine din panoul PAZNIC-CRYPTO).
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
  var semn = function (v, z) { return v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(z == null ? 1 : z).replace(".", ","); };
  // v100.258 (auditul 23.10, 🔴): sub 1 cu cifre semnificative, ca graficul (GraficBot.fmtP) - toFixed(5) scria PEPE „0.00000”
  var fP = function (v) { return v == null ? "—" : v >= 100 ? v.toFixed(2) : v >= 1 || v <= 0 ? v.toFixed(4) : v.toFixed(Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(v))))); };
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
  // v100.194 (el: „de ce tot îmi spune că e colectorul mort și trebuie să dau refresh?”): ora colectorului se ADUCE la 5 minute, dar
  // pagina se redesena la 8 s cu „acum − ora veche” ⇒ ~2 minute din fiecare 5 scria „oprit de 4–5 min” cu colectorul VIU; F5 aducea ora
  // proaspătă. Cu `adusLa` (când a sosit ora): „merge” = colectorul dăduse semn cu cel mult 3 min ÎNAINTE DE ADUCERE, iar aducerea e
  // de cel mult 12 min (altfel pagina chiar n-are veste ⇒ „oprit”). Fără `adusLa` rămâne regula veche (probele v100.151).
  function colectorDin(cfg, acum, adusLa) {
    var la = cfg && nr(cfg.colectorLa); if (!la) return null;
    var min = Math.max(0, Math.round((acum - la) / 60000)), ad = nr(adusLa);
    if (!ad) return { min: min, viu: min <= 3 };
    return { min: min, viu: (ad - la) <= 3 * 60000 && (acum - ad) <= 12 * 60000 };
  }
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
  // v100.196 (auditul UI 🟡8): istoricul (cu ora colectorului) îl aduce Tabloul DOAR cu un bot ⇒ fără bot fâșia scria „colectorul de acasă —”
  // exact în zilele în care colectorul face doar ideile, alertele și rapoartele. Atunci ora se aduce separat (config), la 5 min.
  var colCache = { cfg: null, la: 0, inLucru: false };
  function colectorAdu() {
    if (colCache.inLucru || Date.now() - colCache.la < 5 * 60000 || typeof getJSON !== "function") return;
    colCache.inLucru = true;
    getJSON("/api/istoric-bot?action=config").then(function (r) { colCache.cfg = r && r.config || null; colCache.la = Date.now(); })
      .catch(function () { colCache.la = Date.now() - 4 * 60000; })   // pe pagina publicată (503) sau la o cădere: din nou peste un minut
      .then(function () { colCache.inLucru = false; });
  }
  function colectorSursa(s, cache) {
    var i = s && s.istoricServer; if (i && i.config) return { cfg: i.config, adusLa: i.adusLa };
    return cache && cache.cfg ? { cfg: cache.cfg, adusLa: cache.la } : { cfg: null, adusLa: null };
  }
  function citeste() {
    var s = st() || {}, ct = document.querySelector("#tabloubot .contTot"), ctx = ct ? ct.textContent : "";
    var sold = null, soldDin = "";
    try { var e = s.extra || {}; if (e.futures && e.futures.total > 0) { sold = nr(e.futures.total); soldDin = "soldul contului de futures (Pionex)"; } } catch (e1) {}
    if (sold == null) { var m = ctx.match(/Pionex · sold ([\d.,]+) USDT/); if (m) { sold = nr(m[1]); soldDin = "soldul din rândul Pionex al Tabloului"; } }
    if (sold == null) { try { var g = grSoldCitit(); if (g && g.sold) { sold = nr(g.sold); soldDin = "soldul scris de tine în fișa Grid (nu e citit din Pionex)"; } } catch (e2) {} }
    if (!(s.istoricServer && s.istoricServer.config)) colectorAdu();
    var cs = colectorSursa(s, colCache);
    D = { s: s, bot: bot(), boti: boti(), sold: sold, soldDin: soldDin, t212: t212Din(ctx), col: colectorDin(cs.cfg, Date.now(), cs.adusLa), lich: lichDin(boti()) };
  }
  function alerteNrDin(t) { var m = t && String(t).match(/(\d+)(\+?)/); return m ? { n: +m[1], t: m[1] + m[2] } : { n: 0, t: "0" }; }   // v100.196: „99+” rămâne „99+”
  function alerteNr() { return alerteNrDin((document.querySelector('[data-nav="alerts"]') || {}).textContent); }

  // ---------- I-591: drumul botului (nivelurile = ale graficului, din date) ----------
  // audit 19.10 (el: „pe bara de grid să arate doar gridul și stop loss, nu și lichidarea” - drumul botului): gridul, stopul și prețul de
  // acum; planul, zero-ul, intrarea și lichidarea rămân pe grafic. Botul la prețul LIVE (pvBotLive din app.js), ca stopul în procente să
  // se socotească live, cu grilele de pe drum (TabloExtra.pretStopLive).
  function botLive(b) { try { return typeof window.pvBotLive === "function" ? window.pvBotLive(b) || b : b; } catch (e) { return b; } }
  function stopDrum(b) {
    if (!b || !b.opritorPierdereActiv) return null;
    var TE = window.TabloExtra, r = nr(b.opritorPierdereRaport), raport = b.opritorPierdereTip === "raport" && r !== null;
    var p = TE && TE.pretStopLive ? TE.pretStopLive(b) : nr(b.opritorPierdere);
    if (!(p > 0)) return null;
    return { p: p, n: raport ? "stop " + (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(1).replace(".", ",") + "%" : "stop", tit: raport ? "stopul din Pionex în procente din investiție; procentul se copiază; prețul de pe bară e doar acum și se mută cu grilele" : "stopul din Pionex" };
  }
  function nivele(b) {
    var L = [], add = function (p, n, c, cls, tit) { p = nr(p); if (p != null && p > 0) L.push({ p: p, n: n, c: c, cls: cls || "", tit: tit || "" }); };
    var bl = botLive(b), s = stopDrum(bl);
    add(b.gridJos, "grid jos", "var(--pzInfo)"); add(b.gridSus, "grid sus", "var(--pzInfo)");
    if (s) add(s.p, s.n, "var(--pzJos)", "", s.tit);
    return L;
  }
  // v100.242: lățimea se cuantifică și nu se mută cât ține o bară de derulare (~15 px). 0 nu mai cade pe 280 (multe rânduri, card înalt).
  function latimeDrum(px, tinut) {
    var w = Number(px), t = Number(tinut);
    if (!(w >= 160)) return t >= 160 ? t : 1100;
    if (t >= 160 && Math.abs(w - t) < 48) return t;
    var q = Math.round(w / 48) * 48;
    return q >= 160 ? q : 160;
  }
  function drumHtml(b, mic, latime) {
    var L = nivele(b), p = nr(botLive(b).pretCurent); if (!L.length || p == null) return "";
    var lo = Math.min.apply(null, L.map(function (x) { return x.p; }).concat(p)), hi = Math.max.apply(null, L.map(function (x) { return x.p; }).concat(p)), pad = (hi - lo) * 0.04 || 1e-9;
    lo -= pad; hi += pad; var X = function (v) { return ((v - lo) / (hi - lo) * 100).toFixed(2); };
    L.sort(function (a, c) { return a.p - c.p; });
    for (var mi = L.length - 1; mi >= 1; mi--) if (Math.abs(L[mi].p - L[mi - 1].p) / (hi - lo) < 0.004) { L[mi - 1].n += " · " + L[mi].n; L[mi - 1].cls += " " + L[mi].cls; L.splice(mi, 1); }
    var W = Math.max(280, latime || 1100), rand = [];   // rândurile etichetelor după lățimea REALĂ a cartelei (revizia I7)
    /* audit 23.10: var w = (x.n.length + 8) * 6.3 … rand[k] > cx - w / 2 - 8 socotea etichete centrate; sub 12% / peste 88% ancora() le lipește de margine ⇒ pe telefon se călcau. Acum: intervalul real (ancora + lungimea prețului). */
    L.forEach(function (x) { var w = (x.n.length + 1 + fP(x.p).length) * 6.3, xp = +X(x.p), cx = xp * W / 100, a = xp < 12 ? cx - 6 : xp > 88 ? cx + 6 - w : cx - w / 2, k = 0; while (rand[k] != null && rand[k] > a - 8) k++; rand[k] = a + w; x.rand = k; });
    var nrR = Math.max.apply(null, L.map(function (x) { return (x.rand || 0) + 1; })), h = '<div class="pzDrum' + (mic ? " pzDrumMic" : "") + '"' + (mic ? "" : ' style="padding-bottom:' + (14 + nrR * 16) + 'px"') + '><div class="pzDrumPista">';
    var gj = nr(b.gridJos), gs = nr(b.gridSus);
    if (gj && gs) h += '<i class="pzDrumGrid" style="left:' + X(gj) + '%;width:' + (X(gs) - X(gj)).toFixed(2) + '%"></i>';
    L.forEach(function (x) { h += '<i class="pzDrumNiv ' + x.cls + '" style="left:' + X(x.p) + '%;background:' + x.c + '" title="' + esc(x.n + " " + fP(x.p) + (x.tit ? " · " + x.tit : "")) + '"></i>' + (mic ? "" : '<span class="pzDrumEt" style="left:' + X(x.p) + '%;' + ancora(X(x.p)) + 'top:' + (16 + x.rand * 16) + 'px;color:' + x.c + '">' + esc(x.n) + ' <b>' + fP(x.p) + '</b></span>'); });
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
    var a = alerteNr(); cel("alerte necitite", a.t,   /* audit 23.10: „alerte 0” stătea sub „CRITICE: 4+” (deschiderea Alertelor le citește) */ a.n ? "pzAtentie" : "", "alerte necitite", "alerts");
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
  function pzPretUmple() {
    var el = $("pzPret"), src = $("tbPretViuVal"), cap = $("tbPretViu");
    if (!el) return;
    var t = src && src.textContent ? src.textContent : "";
    var c = "pzPret" + (t && cap && cap.classList.contains("sus") ? " sus" : t && cap && cap.classList.contains("jos") ? " jos" : "");   // audit 23.10: doar când s-a schimbat
    if (el.textContent !== t) el.textContent = t;
    if (el.className !== c) el.className = c;
  }
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
      + '<div class="pzVerbTxt"><b>' + esc(txtTit) + '</b>' + (txtFac ? '<p>' + esc(txtFac) + '</p>' : "") + nota + '<p class="pzDin">din: Consilierul · motivele întregi în cartela lui, mai jos</p></div>'
      + '<b id="pzPret" class="pzPret"></b></div>' + motivG
      + (V.length ? '<div class="pzVoci">' + V.map(function (v) { return '<span class="pzVoce pzVoce-' + v.ton + '" title="' + esc(v.tit) + '">' + SIM[v.ton] + " " + esc(v.n) + '</span>'; }).join("") + '</div>' : "");
    if (!el) { el = document.createElement("section"); el.id = "pzVerdict"; var ref = gL || $("tbKpi"); if (!ref) return; ref.parentNode.insertBefore(el, ref); }
    el.hidden = false; if (el._h !== h) { el.innerHTML = h; el._h = h; pzPretUmple(); }
    if (gL) gL.classList.toggle("pzInVerdict", !!motivG && el.contains(el.querySelector(".pzMotiv")));   // cartela se ascunde DOAR după ce textul ei e în verdict (revizia I5)
  }

  // ---------- drumul (cartela din Tablou) ----------
  function drum() {
    var b = D.bot, k = $("tbKpi"), el = $("pzDrumCard");
    if (!b || !k) { if (el) { el.hidden = true; el._h = ""; } document.body.classList.remove("pzAreDrum"); return; }
    if (!el) { el = document.createElement("section"); el.id = "pzDrumCard"; }
    var sus = k.parentNode, cadru = sus && sus.parentNode && sus.parentNode.classList.contains("tbCadru") ? sus.parentNode : null;
    var parinte = cadru || sus, inainte = cadru ? sus : k;
    if (parinte && el.parentNode !== parinte) parinte.insertBefore(el, inainte);   /* v100.240: frate cu .tbSus, ca ordinea din CSS să-l pună pe rândul lui */
    el._pzW = latimeDrum(el.clientWidth, el._pzW); var corp = drumHtml(b, false, el._pzW - 28);   /* v100.242: aceeași lățime până se schimbă cu un rând întreg */
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
    var stare = s.routeOk === false ? "Boții nu se pot citi acum (" + (s.eroare || "eroare") + ") — deschide Tabloul botului." : s.citireGoala ? "Citirea a venit goală: țin boții de dinainte." : s.routeOk !== true ? "Citesc boții…" : !bs.length ? "Niciun bot pornit acum." : "Deschide Tabloul botului pentru ce ai de făcut.";   // revizia I8
    var h = '<div class="pzAcumGrila">' + celule() + '</div><p class="pzAcumFraza">' + esc(s.citireGoala ? stare : (fr || stare)) + '</p>'
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
    if (!c.classList.contains("pzFaraCadran")) c.classList.add("pzFaraCadran");   // audit 23.10: classList.add pe o clasă care există tot scrie atributul   // cadranul (decor) se ascunde; cifra, cuvântul și intervalul rămân
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
    if (document.hidden) return;   // audit 19.10: cu fila ascunsă nu rescriem pagina la 1,5 s (ca Tabloul); la revenire, o tură imediat
    if (window.__pzPauza) return;
    try { citeste(); } catch (e) { return; }
    [fasie, verdict, drum, acum, pliaza, ordine, function () { cadran("acFg", 0, 100, /între (\d+) și (\d+)/); cadran("acVix", 10, 40, /între ([\d,]+) și ([\d,]+)/); },
      function () { ["tbKpiGrid", "tbKpiTotalSub", "tbKpiPretSub", "tbKpiLichSub"].forEach(kv); }, ultimii, avert, build, coloana, pagT212, pagSalt, pagAlerte, pagMonteCarlo, pagCarnet, pagJurnal, pagSugestii, pagMarket, pagAccount, pagCloud, pagSettings, pagHealth, pliazaFasia]
      .forEach(function (f) { try { f(); } catch (e) { if (window.console) console.warn("asezare-paznic", f.name, e); } });
  }

  // ======================================================================================================================================
  // v100.152 · TOATE PAGINILE (Zilnic + Unelte) DUPĂ MODELUL TABLOULUI (el, 11.10: „vreau să faci toate paginile după modelul tabloul botului”).
  // Sus: verdictul paginii - verbul + motivul + „ce aș face” + vocile + sursa („din: …”). REGULA (revizia Opus v100.152): antetul folosește DOAR
  // cuvintele și culorile paginii - fără verbe, praguri sau afirmații inventate (ar fi o a doua voce). Unde pagina are deja o decizie (Grid,
  // Simulator, Scanner, Acasă) nu se pune antet: doar ordinea. Antetul stă ca FRATE în afara containerelor rescrise cu innerHTML. Ordinea: doar CSS.
  // ======================================================================================================================================
  var tx = function (sel, root) { var e = (root || document).querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
  // tonul = culoarea pusă de PAGINĂ pe element (good / bad / warn / ...), nu o judecată a stratului
  var tonCls = function (e) { var c = e ? String(e.className || "") : ""; return /\bbad\b|iesi|rl-rau|cloudErr/.test(c) ? "jos" : /tbWarn|\bwarn\b|atentie|cloudWarn/.test(c) ? "aur" : /\bgood\b|tine|rl-bine|cloudOk/.test(c) ? "sus" : "mut"; };
  var VOT = { sus: "da", jos: "nu", aur: "atentie", mut: "neutru" }, SIMP = { da: "✓", nu: "✗", atentie: "!", neutru: "–" };
  // „1 bot”, „20 de boți” - TextRo.cate (garda v100.75); rezerva știe aceeași regulă (contextele fără TextRo, probele)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), q = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (q >= 20 || (q === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  // antetul unei pagini: `ref` = elementul înaintea căruia stă; cfg null ⇒ ascuns (fără date nu rămâne un verdict vechi la vedere)
  function antet(id, ref, cfg) {
    var el = $(id);
    if (!ref || !ref.parentNode || !cfg || !cfg.verb) { if (el) { el.hidden = true; el._h = ""; } return; }
    if (!el) { el = document.createElement("section"); el.id = id; el.className = "pzAntet"; }
    if (el.parentNode !== ref.parentNode || el.nextElementSibling !== ref) ref.parentNode.insertBefore(el, ref);
    var h = '<div class="pzVerbRand"><span class="pzVerb pzVerb-' + (cfg.ton || "mut") + '">' + esc(cfg.verb) + '</span><div class="pzVerbTxt">' + (cfg.titlu ? '<b>' + esc(cfg.titlu) + '</b>' : "")
      + (cfg.fac ? '<p>' + esc(cfg.fac) + '</p>' : "") + '<p class="pzDin">din: ' + esc(cfg.din || "") + '</p></div></div>'
      + (cfg.voci && cfg.voci.length ? '<div class="pzVoci">' + cfg.voci.slice(0, 16).map(function (v) { var k = VOT[v.ton] || "neutru"; return '<span class="pzVoce pzVoce-' + k + '"' + (v.tit ? ' title="' + esc(v.tit) + '"' : "") + '>' + (v.semn === false ? "" : SIMP[k] + " ") + esc(v.n) + '</span>'; }).join("") + '</div>' : "");
    el.hidden = false; if (el._h !== h) { el.innerHTML = h; el._h = h; }
  }
  // pastila Consilierului (T212 / Salt) - după TEXTUL ei, cum o scrie pagina (AȘTEAPTĂ are clasa „fără date”, dar e un verdict - revizia I4)
  var NIVPAST = { "IEȘI": "iesi", "ATENȚIE": "atentie", "AȘTEAPTĂ": "asteapta", "ȚINE": "tine" };
  function nivelPastila(text) { return NIVPAST[String(text || "").trim().toUpperCase()] || "alt"; }
  // pozițiile ⇒ verdictul paginii: cel mai grav nivel ARĂTAT de pastile (IEȘI > ATENȚIE > AȘTEAPTĂ > ȚINE), cu cuvântul pastilei (pur, probat)
  function verdictPozitii(randuri, sursa) {
    if (!randuri.length) return null;
    var g = { iesi: [], atentie: [], asteapta: [], tine: [], alt: [] };
    randuri.forEach(function (r) { (g[r.nivel] || g.alt).push(r.sim); });
    var TON = { iesi: "jos", atentie: "aur", asteapta: "mut", tine: "sus", alt: "mut" }, CUV = { iesi: "IEȘI", atentie: "ATENȚIE", asteapta: "AȘTEAPTĂ", tine: "ȚINE" };
    var voci = randuri.map(function (r) { return { n: r.sim, ton: TON[r.nivel] || "mut", tit: r.pill || "fără verdict încă" }; });
    var k = ["iesi", "atentie", "asteapta", "tine"].filter(function (x) { return g[x].length; })[0];
    var c = !k ? { verb: "FĂRĂ DATE", ton: "mut", titlu: "pozițiile n-au încă un verdict al Consilierului" }
      : k === "tine" ? { verb: "ȚINE", ton: "sus", titlu: g.tine.length === randuri.length ? (randuri.length === 1 ? "poziția ține" : "toate cele " + cate(randuri.length, "poziție", "poziții") + " țin") : g.tine.length + " din " + randuri.length + " țin; restul fără verdict încă" }
      : { verb: CUV[k], ton: TON[k], titlu: (g[k].length === 1 ? "la o poziție: " : "la " + cate(g[k].length, "poziție", "poziții") + ": ") + g[k].join(", ") };
    c.voci = voci; c.din = sursa; return c;
  }
  function randuriPastile(sel, simDin) {
    return [].map.call(document.querySelectorAll(sel), function (tr) {
      var p = tr.querySelector(".t212Pill"); return { sim: simDin(tr), nivel: nivelPastila(p && p.textContent), pill: p ? p.textContent.trim() : "" };
    }).filter(function (r) { return r.sim; });
  }
  function primulTodo(sel) { var r = document.querySelector(sel); if (!r) return ""; var b = r.querySelector("b"), p = r.querySelector("p"); return [b && b.textContent.trim(), p && p.textContent.replace(/^👉\s*/, "").trim()].filter(Boolean).join(" — "); }

  function pagT212() {
    var c = verdictPozitii(randuriPastile("#t212Continut tr.t212Rand", function (tr) { return tx(".t212Sim b", tr); }), "pastilele Consilierului pe fiecare poziție · „Ce ai de făcut acum”");
    if (c) c.fac = primulTodo("#t212Sus .t212TodoRand");
    antet("pzV-t212", $("t212Sus"), c);
  }
  function pagSalt() {
    var c = verdictPozitii(randuriPastile("#saltPozBox tr.t212Rand", function (tr) { return tx("b", tr); }), "pastilele Consilierului pe fiecare poziție Salt · „Ce ai de făcut acum”");
    if (c) c.fac = primulTodo("#saltSus .t212TodoRand");
    antet("pzV-salt", $("saltPagina"), c);
  }
  // alertele: din TOATĂ lista (alSt.l), nu din rândurile filtrate; pe ultimele 24 h, după nivelul pus de colector - nu după „necitit”
  // (clasa „nou” dispare în secunda în care deschizi pagina ⇒ „nimic nou” verde deasupra alertelor critice - revizia Opus C1)
  // v100.196 (auditul UI 🟡10): serverul dă ultimele 100; dacă toate 100 sunt din ultimele 24 h, lista e TĂIATĂ ⇒ cifrele sunt „cel puțin”
  function verdictAlerte(l, acum, drumFn) {
    var tot = Array.isArray(l) ? l : [];
    l = tot.filter(function (x) { return x && acum - x.t <= 24 * 3600000; });
    var plin = tot.length >= 100 && l.length === tot.length, cp = plin ? "cel puțin " : "", pl = plin ? "+" : "";
    var crit = l.filter(function (x) { return x.nivel === "critic"; }), aten = l.filter(function (x) { return x.nivel === "atentie"; });
    var prima = (crit.length ? crit : aten).slice().sort(function (a, b) { return b.t - a.t; })[0];
    var c = crit.length ? { verb: "CRITICE: " + crit.length + pl, ton: "jos" } : aten.length ? { verb: "DE ATENȚIE: " + aten.length + pl, ton: "aur" } : { verb: l.length ? "DOAR INFORMĂRI" : "NICIO ALERTĂ", ton: "mut" };
    c.titlu = prima ? "cea mai recentă: " + prima.titlu : (l.length ? cate(l.length, "informare", "informări") + " în ultimele 24 h" : "nicio alertă în ultimele 24 h");
    var d = prima && drumFn ? drumFn(prima) : null; c.fac = d && d.et ? "→ " + d.et : "";
    c.voci = [{ n: cp + cate(crit.length, "critică", "critice"), ton: crit.length ? "jos" : "mut", semn: false }, { n: cp + aten.length + " de atenție", ton: aten.length ? "aur" : "mut", semn: false }, { n: cp + cate(l.length, "alertă", "alerte") + " în 24 h", ton: "mut", semn: false }];
    c.din = "centrul de alerte (toate categoriile, ultimele 24 h" + (plin ? "; serverul dă doar ultimele 100, deci au fost mai multe" : "") + ")"; return c;
  }
  function pagAlerte() {
    var l = null; try { l = alSt.l; } catch (e) {}
    var drumFn = null; try { drumFn = AlCentru.drum; } catch (e) {}
    antet("pzV-alerts", $("alCentru"), Array.isArray(l) ? verdictAlerte(l, Date.now(), drumFn) : null);
  }
  // riscul tău: concluzia cea mai gravă dintre cele ARĂTATE (cu culoarea ei); verbul = secțiunea (boții / acțiunile), nu un cuvânt al stratului
  function pagMonteCarlo() {
    var L = [].map.call(document.querySelectorAll("#rlPagina .rlCon"), function (x) { var s = x.closest(".rlSec"), h = s ? tx("h3", s) : ""; return { ton: tonCls(x), titlu: tx("b", x), fac: tx(".rlFac", x).replace(/^👉\s*/, ""), sec: h }; });
    if (!L.length) { antet("pzV-mc", $("mcsPagina"), null); return; }
    var ORD = { jos: 0, aur: 1, mut: 2, sus: 3 }, w = L.slice().sort(function (a, b) { return ORD[a.ton] - ORD[b.ton]; })[0];
    antet("pzV-mc", $("mcsPagina"), { verb: "RISCUL TĂU", ton: w.ton, titlu: (w.sec ? w.sec + ": " : "") + w.titlu, fac: w.fac,
      voci: L.map(function (x) { var t = (x.sec ? x.sec.split(" ")[0] + ": " : "") + x.titlu; return { n: t.length > 44 ? t.slice(0, 42) + "…" : t, ton: x.ton, tit: t }; }), din: "„Ce înseamnă pentru tine” din „Riscul și obiceiurile tale” (mai jos, după Monte Carlo pe simbol)" });
  }
  function pagCarnet() {
    var st = null; try { st = carnetStare.raport.rejoc.intrebari.alegere.stare; } catch (e) {}
    var fac = tx("#cnPagina .rlCon .rlFac").replace(/^👉\s*/, "");
    if (!st || !fac) { antet("pzV-carnet", $("cnPagina"), null); return; }   /* fără stare nu se scrie nimic (Carnet.stareText(undefined) ar spune „prea puține cazuri”) */
    var titlu = ""; try { titlu = Carnet.stareText(st) || ""; } catch (e) {}
    var s = String(st), verb = (titlu || s).toUpperCase();
    verb = "ALEGEREA FIȘEI: " + verb;
    antet("pzV-carnet", $("cnPagina"), { verb: verb.length > 44 ? verb.slice(0, 42) + "…" : verb, ton: /-bun$/.test(s) ? "sus" : /-rau$/.test(s) ? "jos" : "mut", titlu: verb.length > 44 ? titlu : "", fac: fac, din: "carnetul fișei: alegerea ÎNGUST / LARG pe istoric" });
  }
  // „+0,00 USDT” / „−5906,42 USDT” ⇒ număr (sufixul monedei scos; nr() singur dă null pe el)
  function valJurnal(t) { return nr(String(t == null ? "" : t).replace(/\s*USDT.*$/i, "").trim()); }
  // „Rezultat total” din statistica filei Acțiuni / Tot (lei sau $): semnul din clasa pusă de pagină, zero din cifre
  function valBani(t) { var x = String(t == null ? "" : t).replace(/[−–]/g, "-").replace(/[^\d,.\-+]/g, ""); if (!/\d/.test(x)) return null; if (x.indexOf(".") >= 0 && (x.indexOf(",") > 0 || /\.\d{3}(\.|$)/.test(x))) x = x.replace(/\./g, ""); return /^[+-]?0+([.,]0+)?$/.test(x) ? 0 : nr(x); }   /* „—” = lipsă, nu zero; „1.234,56” = mii cu punct */
  // I1 (revizia a treia): pe Acțiuni antetul citește „Câștigat REAL” (toată istoria, ca pe Crypto), nu Statistica filtrată pe perioadă;
  // pe Tot citește Statistica și spune PERIOADA aleasă (butonul apăsat) - altfel antetul ar contrazice cifra de dedesubt
  function pagJurnalAltaFila(fila) {
    var ref = fila === "actiuni" ? $("jtActiuni") : $("jtStatTot"), cel, v, et, sub, din;
    if (fila === "actiuni") { cel = ref && ref.querySelector(".jtKpi .tbKpiCel"); v = cel && cel.querySelector(".tbKpiVal"); et = cel ? tx(".tbEt2", cel) : ""; sub = cel ? tx(".tbSub", cel) : ""; din = "jurnalul Trading 212 („Câștigat REAL”, toată istoria)"; }
    else { cel = ref && ref.querySelector(".stTile"); v = cel && cel.querySelector(".stVal"); et = cel ? tx(".stEt", cel) : ""; var per = ref ? tx(".stGrup [aria-pressed=\"true\"]", ref) : ""; sub = (per ? per + " · " : "") + (cel ? tx(".stSub", cel) : ""); din = "Statistica · tot, în lei" + (per ? " (" + per + ")" : ""); }
    if (!v) { antet("pzV-jt", ref, null); return; }
    var n = valBani(v.textContent), ton = n === 0 ? "mut" : tonCls(v), CUM = fila === "actiuni" ? "ACȚIUNI" : "TOT";
    antet("pzV-jt", ref, { verb: CUM + ": " + (n === 0 ? "PE ZERO" : ton === "sus" ? "PE PLUS" : ton === "jos" ? "PE MINUS" : v.textContent.trim()), ton: ton, titlu: (et || "Rezultat total") + ": " + v.textContent.trim(), fac: sub, din: din });
  }

  function pagJurnal() {
    var fila = document.querySelector('#jurnaltrade .jtFiltru [aria-pressed="true"]'), f = fila ? fila.id.replace("jtF-", "") : "crypto";
    if (f === "actiuni" || f === "tot") { pagJurnalAltaFila(f); return; }
    var cel = document.querySelector("#jtRezumat .jtKpi .tbKpiCel"), cr = $("jtCrypto");
    var ref = cr && cr.firstElementChild; if (ref && ref.id === "pzV-jt") ref = ref.nextElementSibling;
    if (!cel || !cr) { antet("pzV-jt", ref, null); return; }
    var v = cel.querySelector(".tbKpiVal"), n = valJurnal(v && v.textContent), ton = n === 0 ? "mut" : tonCls(v), fac = tx("#jtGreseli .tbFac") || tx("#jtReguliCard .tbFac") || tx(".jtCireasa .tbFac");
    antet("pzV-jt", ref, { verb: n === 0 ? "CRYPTO: PE ZERO" : ton === "sus" ? "CRYPTO: PE PLUS" : ton === "jos" ? "CRYPTO: PE MINUS" : "CRYPTO: " + (v ? v.textContent.trim() : "—"), ton: ton, titlu: [tx("span", cel), v ? v.textContent.trim() : ""].filter(Boolean).join(": "), fac: fac.replace(/^👉\s*/, ""), din: "jurnalul boților închiși (rezultatul după comisioane și funding)" });
  }
  // sugestiile: „fapte, nu semnal” (scrie pagina) ⇒ verbul = cuvântul îngroșat al lățimii, FĂRĂ culoare de bine / rău
  function pagSugestii() {
    var p = document.querySelector("#sugPagina .sugPanda p.tbCitScurt") || document.querySelector("#sugPagina .sugPanda p.tbSub");
    if (!p) { antet("pzV-sug", $("sugPagina"), null); return; }
    var capSub = tx("#sugPagina .sugPanda .sugPandaCap .tbSub"), vechi = /veche/.test(capSub);
    var b = p.querySelector("b"), cart = [].filter.call(document.querySelectorAll("#sugPagina .sugCartela"), function (c) { return /Pe ce aș porni un bot/.test(tx("h4", c)); })[0];
    var li = cart ? cart.querySelector(".sugLista li") : null, prim = li ? (li.querySelector("b") || li).textContent.trim() : "";
    var verb = (b ? b.textContent : "").trim().toUpperCase() || "LĂȚIMEA PIEȚEI";
    antet("pzV-sug", $("sugPagina"), { verb: verb.length > 28 ? verb.slice(0, 26) + "…" : verb, ton: "mut", titlu: (b ? "" : p.textContent.replace(/\s+/g, " ").trim()) + (vechi ? (b ? "" : " · ") + "lățimea e " + capSub.split("·")[0].trim() : ""), fac: prim ? "pe ce aș porni un bot: " + prim : "", din: "lățimea pieței pe 150 perp-uri (fapte, nu semnal) · „Pe ce aș porni un bot”" });
  }
  // Market: cifrele „Breadth summary”, fără prag inventat
  function pagMarket() {
    var bu = tx("#breadthBull"), be = tx("#breadthBear"), ne = tx("#breadthNeutral"), z = tx("#breadth24"), sec = $("market");
    var ref = sec && sec.querySelector(":scope>.card");
    if (!bu || !be || bu === "—" || be === "—") { antet("pzV-market", ref, null); return; }
    antet("pzV-market", ref, { verb: "BULL " + bu + " · BEAR " + be, ton: "mut", titlu: (ne && ne !== "—" ? "Neutral " + ne : "") + (z && z !== "—" ? (ne ? " · " : "") + "24h " + z : ""), din: "Breadth summary (monedele din radarul de mai jos)" });
  }
  function pagAccount() {
    var s = $("botiStare"), sec = $("account"), ref = sec && sec.querySelector(":scope>.card");
    var t = s ? s.textContent.replace(/\s+/g, " ").trim() : "";
    if (!t || t === "—" || /NECĂUTAT|NECAUTAT/i.test(t)) { antet("pzV-account", ref, null); return; }
    antet("pzV-account", ref, { verb: t.split("·")[0].trim(), ton: tonCls(s), titlu: t.indexOf("·") > 0 ? t : (tx("#botiTotal") && tx("#botiTotal") !== "—" ? "total: " + tx("#botiTotal") : ""), din: "„Boți de grid” (mai jos) · configurarea API: " + (tx("#acctConfig") || "—") });
  }
  // Cloud: cuvântul paginii și culoarea ei (NOT CONFIGURED are cloudWarn pe pagină ⇒ galben) - fără afirmații în plus (revizia I5)
  function pagCloud() {
    var db = $("cloudDb"), ps = $("cloudPushSender"), mon = $("healthMonitor"), sec = $("cloud"), ref = sec && sec.querySelector(":scope>.card");
    var tdb = db ? db.textContent.trim() : "";
    if (!tdb || tdb === "—") { antet("pzV-cloud", ref, null); return; }
    var V = [{ n: "baza D1: " + tdb, ton: tonCls(db), semn: false }, { n: "push: " + (ps ? ps.textContent.trim() || "—" : "—"), ton: tonCls(ps), semn: false }, { n: "monitor: " + (mon ? mon.textContent.trim() || "—" : "—"), ton: tonCls(mon), semn: false }];
    antet("pzV-cloud", ref, { verb: "D1: " + tdb, ton: tonCls(db), titlu: V.slice(1).map(function (v) { return v.n; }).join(" · "), fac: tx("#cloudLastRun") && tx("#cloudLastRun") !== "—" ? "ultima rulare programată: " + tx("#cloudLastRun") : "", voci: V, din: "starea Cloudflare (mai jos)" });
  }
  // vârsta datelor, cum o scrie pagina („12s”, „5m”, „14h”, „—”): peste 15 min galben, ore roșu (revizia I6: „REST 14h” ieșea verde)
  function tonVarsta(t) { var m = String(t || "").trim().match(/^(\d+)\s*(s|m|h)$/); if (!m) return "mut"; var n = +m[1], u = m[2]; return u === "h" ? "jos" : u === "m" && n >= 15 ? "aur" : "sus"; }
  function pagSettings() {
    var a = $("apiAuthStatus"), g = document.querySelector("#settings .settingsGrid");
    // ordinea cardurilor (fără id) după titlul lor - CSS-ul citește data-pz-ord; cardurile nu se rescriu (setările sunt statice)
    if (g) [].forEach.call(g.children, function (c) { if (c.hasAttribute("data-pz-ord")) return; var h = (tx("h4", c) || tx("h3", c)).toLowerCase(), o = /api security/.test(h) ? 10 : /freshness|prospe/.test(h) ? 20 : /push/.test(h) ? 30 : /spot provider|primary spot/.test(h) ? 40 : /preset/.test(h) ? 50 : /execution/.test(h) ? 60 : /^alert|alerts/.test(h) ? 70 : /calibr/.test(h) ? 80 : /stocks provider/.test(h) ? 85 : /privacy|confiden/.test(h) ? 90 : /backup/.test(h) ? 95 : /glosar/.test(h) ? 99 : 98; c.setAttribute("data-pz-ord", String(o)); });
    var st = $("settings"); if (st && st.classList.contains("on")) { try { if (typeof renderFreshness === "function") renderFreshness(); } catch (e) {} }
    var t = a ? a.textContent.trim() : "";
    if (!t) { antet("pzV-settings", g, null); return; }
    var lipsa = /NEPUS|LIPS|MISSING|NOT SET/i.test(t);
    antet("pzV-settings", g, { verb: "PAROLA: " + t, ton: lipsa ? "jos" : "mut", titlu: "", fac: lipsa ? "scrie parola în cartela „Parola aplicației pe acest dispozitiv”, prima de mai jos" : "",
      voci: [["REST", "#freshRest"], ["WS", "#freshWs"], ["Futures", "#freshFut"], ["Sentiment", "#freshSent"]].map(function (x) { var v = tx(x[1]); return { n: x[0] + " " + (v || "—"), ton: tonVarsta(v) }; }), din: "Parola aplicației · Prospețimea datelor (vârsta ultimelor date)" });
  }
  function pagHealth() {
    var h = $("health"); if (!h) return;
    var ov = $("providerHealthOverall"), o = ov ? ov.textContent.trim() : ""; if (o === "—") o = "";
    var boxes = [].map.call(h.querySelectorAll(".healthGrid .healthBox"), function (b) { var et = tx("span", b) || "", v = tx("b", b) || ""; return { n: (et + " " + v).trim(), ton: /^(OK|LIVE|READY|ONLINE)\b/i.test(v) ? "sus" : /FAIL|ERROR|UNREACH|RATE LIMIT/i.test(v) ? "jos" : "mut" }; });
    // sub titlul paginii (ca pe celelalte pagini), înaintea cardului
    var cap = h.querySelector(":scope>.sectionHead"), dupa = cap ? cap.nextElementSibling : null; if (dupa && dupa.id === "pzV-health") dupa = dupa.nextElementSibling;
    if (!o && !boxes.length) { antet("pzV-health", dupa, null); return; }
    var rau = boxes.filter(function (b) { return b.ton === "jos"; });
    antet("pzV-health", dupa, { verb: o ? "FURNIZORII: " + o.toUpperCase() : rau.length ? rau[0].n.toUpperCase() : "HEALTH", ton: ov && o ? tonCls(ov) : rau.length ? "jos" : "mut",
      titlu: rau.length ? rau.map(function (b) { return b.n; }).join(" · ") : (o ? "" : "„Verifică acum” și „Verifică furnizorii” de mai jos dau starea furnizorilor"), voci: boxes, din: "Health (mai jos)" });
  }

  // Cloud / Settings / Health nu depind de monedă: fâșia „Selected market” + filele de analiză se PLIAZĂ (el, 11.10: „da, fă tot”), nu se ascund -
  // un buton le deschide, alegerea se ține minte. Bara cu simbolul (Crypto / Stocks) rămâne mereu la vedere.
  var FARA_MONEDA = { cloud: 1, settings: 1, health: 1 };
  function pliazaFasia() {
    var h = document.querySelector("main .heroStrip"), b = $("pzFasiaBtn"), des = false; try { des = localStorage.getItem("pzFasiaDeschisa") === "1"; } catch (e) {}
    if (h && !b) {
      b = document.createElement("button"); b.type = "button"; b.id = "pzFasiaBtn"; b.className = "pzFasiaBtn";
      b.addEventListener("click", function () { var d = !document.body.classList.contains("pzFasiaDeschisa"); b._d = d; try { localStorage.setItem("pzFasiaDeschisa", d ? "1" : "0"); } catch (e) {} pliazaFasia(); });
    }
    if (b && h && b.nextElementSibling !== h) h.parentNode.insertBefore(b, h);
    if (b && h) { if (!h.id) h.id = "pzFasiaPret"; if (b.getAttribute("aria-controls") !== h.id) b.setAttribute("aria-controls", h.id); }
    if (b && b._d != null) des = b._d;
    document.body.classList.toggle("pzFasiaDeschisa", des);
    if (b) { var t = (des ? "▾ " : "▸ ") + "Prețul monedei alese și filele de analiză" + (des ? " (pliază)" : ""); if (b.textContent !== t) b.textContent = t; b.setAttribute("aria-expanded", des ? "true" : "false"); }
  }

  window.AsezarePaznic = { valJurnal: valJurnal, valBani: valBani, verdictPozitii: verdictPozitii, verdictAlerte: verdictAlerte, nivelPastila: nivelPastila, tonVarsta: tonVarsta, randuriKv: randuriKv, ancora: ancora, GLOSAR: GLOSAR, t212Din: t212Din, colectorDin: colectorDin, colectorSursa: colectorSursa, alerteNrDin: alerteNrDin, lichDin: lichDin, nivele: nivele, drumHtml: drumHtml, latimeDrum: latimeDrum, verdictValid: verdictValid, tonLich: tonLich, pliaza: pliaza };
  document.documentElement.classList.add("pzDemo");
  var rz = null; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(tura, 200); });   // revizia I10: fără tură la fiecare pixel
  document.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest("#jurnaltrade .jtFiltru")) setTimeout(function () { try { pagJurnal(); } catch (x) {} }, 30); });   /* M1: antetul urmează fila pe loc */
  setInterval(tura, 1500); setTimeout(tura, 300);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tura(); });
})();
