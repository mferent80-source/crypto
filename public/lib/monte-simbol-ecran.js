// v100.128 (el 07.10: „fă montecarlo să facă și analiza pe un coin sau stock ales” → „toate trei” → „da” pe demo): caseta de sus din
// pagina Monte Carlo - un simbol ales ⇒ (1) încotro poate merge prețul (fără tendința perioadei, stop / țintă editabile), (2) botul grid
// (botul lui activ pe moneda aia, altfel setări de probă editabile; doar coinuri), (3) istoria lui pe simbol. Calculul e în MonteSimbol
// (pur); aici: funcțiile de desen (fără DOM, probate în vm) și aducerea datelor (Pionex 15M + 1D ca fișa Grid, Yahoo 1D ca pagina Salt).
var mcsStare = { sim: "", inLucru: false, eroare: null, rez: null, date: null, arhiva: null };
function mcsEsc(s) { return typeof escapeHtml === "function" ? escapeHtml(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function mcsNr(v, z) { return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
function mcsSemn(v) { return v > 0 ? "+" : v < 0 ? "−" : ""; }
function mcsPct1(v) { return v == null || !isFinite(v) ? "—" : mcsSemn(Math.round(v * 1000) / 10) + mcsNr(Math.abs(v * 100), 1) + "%"; }
function mcsPr(v) { return v == null || !isFinite(v) ? "—" : Math.round(v * 100) + "%"; }
function mcsBani1(v, unit) { return v == null || !isFinite(v) ? "—" : mcsSemn(Math.round(v * 10) / 10) + mcsNr(Math.abs(v), 1) + " " + (unit || "USDT"); }   // rezultatele: o zecimală
function mcsCls(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
function mcsCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var r = Math.abs(n) % 100; return n === 1 ? "1 " + sg : n + (r >= 20 || (r === 0 && n >= 100) ? " de " : " ") + pl; }
function mcsPretTxt(v) { return v == null || !isFinite(v) ? "—" : mcsNr(v, v < 1 ? 4 : 2); }
function mcsCurata(s) { var t = String(s == null ? "" : s).trim().toUpperCase().replace(/\s+/g, ""); return /^[A-Z0-9][A-Z0-9.^=-]{0,19}$/.test(t) ? t : ""; }

// ---------------- datele (pure) ----------------
// botul LUI activ pe moneda aleasă: Pionex numără LINIILE (row), intervalele = row − 1; stopul pe partea direcției
// revizia (R3): baza botului poate diferi de simbolul Pionex (PUMPFUN.PERP ⇒ PUMP_USDT_PERP) - scurtătura și căutarea merg pe Pionex
function mcsSimbolBot(b) { var p = String(b && b.simbolPionex || "").toUpperCase().replace(/_USDT_PERP$/, ""); return p || String(b && b.baza || "").replace(/\.PERP$/, "").toUpperCase(); }
function mcsBotPe(b, sim) { return !!b && (mcsSimbolBot(b) === sim || String(b.baza || "").replace(/\.PERP$/, "").toUpperCase() === sim); }
// revizia (R2): Pionex dă „neutral” / „no_trend” ⇒ „neutru” (simulatorul: orice altceva decât long / short e neutru; în formular, neutru)
function mcsDir(d) { d = String(d || "").toLowerCase(); return d === "long" || d === "short" ? d : "neutru"; }
function mcsSetariBot(boti, sim) {
  var b = (Array.isArray(boti) ? boti : []).filter(function (x) { return x && x.activ && mcsBotPe(x, sim); })[0];
  if (!b || !(b.gridJos > 0) || !(b.gridSus > b.gridJos)) return null;
  var row = Number(b.brut && b.brut.buOrderData && b.brut.buOrderData.row), dir = mcsDir(b.directie);
  var stop = b.opritorPierdereActiv && Number(b.opritorPierdere) > 0 ? (dir === "short" ? { sus: Number(b.opritorPierdere) } : { jos: Number(b.opritorPierdere) }) : null;
  return { jos: Number(b.gridJos), sus: Number(b.gridSus), grile: row > 1 ? row - 1 : 20, levier: Number(b.levier) || 1, dir: dir, suma: Number(b.investit) || 50, stop: stop, botulTau: true };
}
// fără bot activ: setări de probă (schimbabile pe pagină) - ±8% în jurul prețului, 20 de grile, 2×, long, 50 USDT, fără stop
function mcsSetariProba(P) { return { jos: +(P * 0.92).toPrecision(5), sus: +(P * 1.08).toPrecision(5), grile: 20, levier: 2, dir: "long", suma: 50, stop: null, botulTau: false }; }
function mcsAceleasiSetari(a, b) {
  if (!a || !b) return false; var eq = function (x, y) { return Math.abs(Number(x) - Number(y)) <= 1e-9 * Math.max(1, Math.abs(Number(x))); }, sa = a.stop ? (a.stop.sus || a.stop.jos) : null, sb = b.stop ? (b.stop.sus || b.stop.jos) : null;
  return eq(a.jos, b.jos) && eq(a.sus, b.sus) && eq(a.grile, b.grile) && eq(a.levier, b.levier) && a.dir === b.dir && eq(a.suma, b.suma) && (sa === null ? sb === null : sb !== null && eq(sa, sb));
}
function mcsRitm(l, acum) { return Math.max(1, l.filter(function (x) { return x.inchis >= acum - 30 * 864e5; }).length); }
// istoria pe coin: arhiva boților Pionex (ca pagina Riscului, RiscLuna.bazinBoti), doar moneda aleasă; banii = randamentul × suma
function mcsIstorieCoin(arhiva, sim, acum, alias) {
  var nume = [sim].concat(Array.isArray(alias) ? alias : []);
  var bz = typeof RiscLuna !== "undefined" ? RiscLuna.bazinBoti((Array.isArray(arhiva) ? arhiva : []).filter(function (x) { return x && nume.indexOf(String(x.base || "").replace(/\.PERP$/, "").toUpperCase()) >= 0; })) : [];
  var l = bz.map(function (x) { return { t: x.t, inchis: x.inchis, bani: x.r * x.inv, ore: x.ore, dir: x.dir, lev: x.lev, inv: x.inv }; }), K = mcsRitm(l, acum);
  return { l: l, unit: "USDT", K: K, r: MonteSimbol.istorie(l, { K: K, n: 2000, seed: 7 }) };
}
// istoria pe stock: trade-urile T212 închise (T212.perechi, rezultatul în lei), după simbolul T212 (RHM.DE ⇒ și RHM)
function mcsIstorieStock(umpleri, sim, acum) {
  var s2 = sim.replace(/\..*$/, ""), inch = typeof T212 !== "undefined" ? T212.perechi(Array.isArray(umpleri) ? umpleri : []).inchise : [];
  var l = inch.filter(function (x) { var s = String(x.simbol || "").toUpperCase(); return s === sim || s === s2; })
    .map(function (x) { return { t: x.pornit, inchis: x.inchis, bani: x.rezultat, ore: x.durataOre, dir: "long", lev: 1, inv: x.cost }; }), K = mcsRitm(l, acum);
  return { l: l, unit: "lei", K: K, r: MonteSimbol.istorie(l, { K: K, n: 2000, seed: 7 }) };
}

// ---------------- desenul (pur) ----------------
// histograma: o singură culoare, liniile 5% / mijloc / 95% etichetate direct, zero punctat
function mcsHist(h, marcaje, fmt) {
  if (!h || !h.c) return "";
  var W = 420, H = 96, pad = 16, k = h.c.length, max = Math.max.apply(null, h.c), bw = (W - 2 * pad) / k, x = function (v) { return pad + (v - h.lo) / (h.hi - h.lo) * (W - 2 * pad); };
  var s = '<svg class="mcsHist" viewBox="0 0 ' + W + ' ' + (H + 30) + '" width="100%" role="img" aria-label="cum se împart rezultatele drumurilor">';
  h.c.forEach(function (c, i) { var bh = max ? c / max * H : 0; s += '<rect x="' + (pad + i * bw + 1).toFixed(1) + '" y="' + (H - bh).toFixed(1) + '" width="' + Math.max(0.5, bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" class="mcsBara"><title>' + c + ' drumuri</title></rect>'; });
  if (h.lo < 0 && h.hi > 0) s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="0" y2="' + H + '" class="mcsZero"/>';
  marcaje.forEach(function (m, i) { var xx = Math.max(pad, Math.min(W - pad, x(m.v))); s += '<line x1="' + xx + '" x2="' + xx + '" y1="0" y2="' + (H + 4) + '" class="mcsMarc ' + m.c + '"/><text x="' + xx + '" y="' + (H + 15 + (i % 2) * 12) + '" text-anchor="' + (i === 0 ? "start" : i === marcaje.length - 1 ? "end" : "middle") + '">' + mcsEsc(m.t + " " + fmt(m.v)) + '</text>'; });
  return s + '</svg>';
}
function mcsCif(et, v, cls) { return '<div class="mcsCif"><span>' + mcsEsc(et) + '</span><b class="' + (cls || "") + '">' + mcsEsc(v) + '</b></div>'; }
function mcsRand(et, v, cls) { return '<div class="mcsRand"><span>' + mcsEsc(et) + '</span><b class="' + (cls || "") + '">' + mcsEsc(v) + '</b></div>'; }
function mcsCartPret(o, m, unit) {
  var mk = [{ v: o.p5, t: "5%", c: "bad" }, { v: o.p50, t: "mijloc", c: "mijl" }, { v: o.p95, t: "95%", c: "good" }];
  return '<div class="mcsCart"><h5>Peste ' + mcsEsc(mcsCate(o.H, unit === "b" ? "zi de bursă" : "zi", unit === "b" ? "zile de bursă" : "zile")) + '</h5>'
    + (o.scurt ? '<p class="mcsAvert">Istoricul e scurt față de orizont: la ' + mcsEsc(mcsCate(o.H, "zi", "zile")) + ' simularea doar reamestecă aceleași zile. Citește cifrele ca o schiță.</p>' : '')
    + '<div class="mcsCifre">' + mcsCif("5% din drumuri, sub", mcsPct1(o.p5), "bad") + mcsCif("mijlocul", mcsPct1(o.p50), mcsCls(Math.round(o.p50 * 1000) / 1000)) + mcsCif("5% din drumuri, peste", mcsPct1(o.p95), "good") + '</div>'
    + mcsHist(o.hist, mk, mcsPct1)
    + mcsRand("urcă cu " + Math.round(m.prag * 100) + "% sau mai mult", mcsPr(o.pSus)) + mcsRand("scade cu " + Math.round(m.prag * 100) + "% sau mai mult", mcsPr(o.pJos))
    + '<div class="mcsCine"><span class="tbSub">Dacă intri azi: stopul (−' + mcsNr(m.stopPct * 100, 1) + '%) sau ținta (+' + mcsNr(m.tintaPct * 100, 1) + '%), care vine întâi?</span>'
    + '<div class="mcsBaraSt"><i class="s" style="width:' + (o.pStop * 100).toFixed(1) + '%"></i><i class="t" style="width:' + (o.pTinta * 100).toFixed(1) + '%"></i><i class="n" style="width:' + (o.pNiciuna * 100).toFixed(1) + '%"></i></div>'
    + '<div class="mcsLeg"><span class="bad">■ stopul întâi ' + mcsPr(o.pStop) + '</span><span class="good">■ ținta întâi ' + mcsPr(o.pTinta) + '</span>' + (o.pNiciuna >= 0.005 ? '<span>■ niciuna ' + mcsPr(o.pNiciuna) + '</span>' : '') + '</div></div>'
    + (o.cuTendinta ? '<p class="tbSub">Cu tendința perioadei păstrată (dacă ar continua ca până acum): mijlocul ' + mcsPct1(o.cuTendinta.p50) + ', stopul întâi ' + mcsPr(o.cuTendinta.pStop) + '.</p>' : '')
    + '</div>';
}
function mcsPretHtml(r) {
  var m = r.pretMc;
  if (!m || m.eroare) return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>📈 Încotro poate merge prețul</h4></div><p class="tbWarn mcsNota">' + mcsEsc(m && m.eroare || "fără date") + '</p></section>';
  return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>📈 Încotro poate merge prețul</h4><span class="tbSub">' + mcsEsc(m.n.toLocaleString("ro-RO") + " de drumuri din " + mcsCate(m.zileIstoric, "zi", "zile") + " de istoric · bucăți reale de câte " + mcsCate(m.blocZile, "zi", "zile") + " · prețul de acum " + mcsPretTxt(r.pret)) + '</span></div>'
    + (m.faraTendinta ? '<p class="tbSub mcsNota">În ' + mcsEsc(mcsCate(m.zileIstoric, "zi", "zile")) + ', ' + mcsEsc(r.sim) + ' a mers în medie ' + mcsPct1(m.tendintaPeZi) + ' pe zi. Drumurile păstrează agitația reală, dar nu repetă tendința perioadei: o cădere (sau o urcare) care a fost nu se „prezice” mai departe.</p>' : '')
    + '<div class="mcsStopTinta"><label>Stopul, % sub prețul de acum <input id="mcsStop" inputmode="decimal" value="' + mcsNr(m.stopPct * 100, 1) + '"></label><label>Ținta, % peste <input id="mcsTinta" inputmode="decimal" value="' + mcsNr(m.tintaPct * 100, 1) + '"></label>'
    + '<button type="button" class="t212BtnLinie" data-action-click="mcsResimuleaza()">Refă simularea</button><span class="tbSub">' + mcsEsc(r.nivelText || "") + '</span></div>'
    + '<div class="mcsDoua">' + m.orizonturi.map(function (o) { return mcsCartPret(o, m, r.tip === "stock" ? "b" : "z"); }).join("") + '</div>'
    + '<p class="tbSub mcsNota">Aceeași zi atinge și stopul, și ținta ⇒ se numără stopul (pesimist).</p></section>';
}
function mcsGridHtml(r) {
  if (r.tip !== "coin") return '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🤖 Un bot grid</h4></div><p class="tbSub mcsNota">Doar la coinuri (Pionex). ' + mcsEsc(r.sim) + ' e o acțiune.</p></section>';
  var g = r.grid, st = r.setari || {};
  var form = '<div class="mcsSetari"><label>Jos <input id="mcsJos" inputmode="decimal" value="' + mcsEsc(st.jos) + '"></label><label>Sus <input id="mcsSus" inputmode="decimal" value="' + mcsEsc(st.sus) + '"></label>'
    + '<label>Intervale (în Pionex scrii N+1 linii) <input id="mcsGrile" inputmode="numeric" value="' + mcsEsc(st.grile) + '"></label><label>Levier <input id="mcsLevier" inputmode="numeric" value="' + mcsEsc(st.levier) + '"></label>'
    + '<label>Direcția <select id="mcsDir">' + ["long", "short", "neutru"].map(function (d) { return '<option' + (st.dir === d ? ' selected' : '') + '>' + d + '</option>'; }).join("") + '</select></label>'
    + '<label>Suma, USDT <input id="mcsSuma" inputmode="decimal" value="' + mcsEsc(st.suma) + '"></label>'
    + '<label>Stop <input id="mcsStopBot" inputmode="decimal" placeholder="fără" value="' + mcsEsc(st.stop ? (st.stop.sus || st.stop.jos) : "") + '"></label>'
    + '<button type="button" class="t212BtnLinie" data-action-click="mcsResimuleaza()">Refă simularea</button></div>';
  var cap = '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🤖 ' + (st.botulTau ? "Un bot grid ca al tău, pornit azi" : "Un bot grid pe " + mcsEsc(r.sim) + " (setări de probă - schimbă-le)") + '</h4>'
    + (g && !g.eroare ? '<span class="tbSub">' + mcsEsc(g.n.toLocaleString("ro-RO") + " de drumuri de " + mcsCate(g.zile, "zi", "zile") + " pe 15 minute · același simulator ca fișa Grid (grilele, comisioanele, lichidarea)") + '</span>' : '') + '</div>' + form;
  if (!g || g.eroare) return cap + '<p class="tbWarn mcsNota">' + mcsEsc(g && g.eroare || "fără date") + '</p></section>';
  var mk = [{ v: g.p5, t: "5%", c: "bad" }, { v: g.p50, t: "mijloc", c: "mijl" }, { v: g.p95, t: "95%", c: "good" }], stopV = st.stop ? (st.stop.sus || st.stop.jos) : null;
  return cap + '<div class="mcsDoua"><div class="mcsCart"><h5>' + mcsEsc(st.dir + " " + st.levier + "× · " + mcsPretTxt(st.jos) + "–" + mcsPretTxt(st.sus) + " · " + mcsCate(st.grile, "grilă", "grile") + " · " + mcsNr(st.suma, 2) + " USDT" + (stopV ? " · stop la " + mcsPretTxt(stopV) : "")) + '</h5>'
    + '<div class="mcsCifre">' + mcsCif("5% din drumuri, sub", mcsBani1(g.p5), "bad") + mcsCif("de obicei (mijlocul)", mcsBani1(g.p50), mcsCls(Math.round(g.p50 * 10) / 10)) + mcsCif("5% din drumuri, peste", mcsBani1(g.p95), "good") + '</div>'
    + mcsHist(g.hist, mk, function (v) { return mcsBani1(v); }) + '</div>'
    + '<div class="mcsCart"><h5>Cât de des, în ' + mcsEsc(mcsCate(g.zile, "zi", "zile")) + '</h5>'
    + mcsRand("lichidare", mcsPr(g.pLichidare), g.pLichidare > 0.02 ? "bad" : "good") + (stopV ? mcsRand("atinge stopul (" + mcsPretTxt(stopV) + ")", mcsPr(g.pStop), g.pStop > 0.5 ? "bad" : "") : "")
    + mcsRand("iese măcar o dată din grid", mcsPr(g.pIesire)) + mcsRand("se închide pe plus", mcsPr(g.pPlus), g.pPlus >= 0.5 ? "good" : "bad") + mcsRand("grile încasate, în medie", mcsNr(g.perechiMedii, 1))
    + (g.cuTendinta ? '<p class="tbSub">Cu tendința perioadei păstrată: mijlocul ' + mcsBani1(g.cuTendinta.p50) + ', pe plus ' + mcsPr(g.cuTendinta.pPlus) + (stopV ? ', stopul ' + mcsPr(g.cuTendinta.pStop) : '') + '.</p>' : '')
    + '<p class="t212Fac">👉 <b>Ce înseamnă:</b> ' + mcsEsc("rezultatul obișnuit în " + mcsCate(g.zile, "zi", "zile") + " e " + mcsBani1(g.p50) + "; lichidare în " + mcsPr(g.pLichidare) + " din drumuri" + (stopV ? ", stopul atins în " + mcsPr(g.pStop) : "") + ".") + '</p></div></div>'
    + '<p class="tbSub mcsNota">' + mcsEsc(mcsCate(g.zileIstoric, "zi", "zile") + " pe 15 minute (atât dă Pionex); drumurile = zile întregi reale, fără tendința perioadei.") + '</p></section>';
}
function mcsIstHtml(r) {
  var i = r.ist || {}, x = i.r || {}, u = i.unit || "USDT";
  var cap = '<section class="t212Panou mcsSec"><div class="t212PanouCap"><h4>🧾 Istoria ta pe ' + mcsEsc(r.sim) + '</h4>';
  if (!x.cazuri) return cap + '</div><p class="tbSub mcsNota">' + mcsEsc(r.tip === "coin" ? "N-ai boți închiși pe " + r.sim + "." : "N-ai tranzacții închise pe " + r.sim + " în Trading 212.") + '</p></section>';
  cap += '<span class="tbSub">' + mcsEsc(mcsCate(x.cazuri, r.tip === "coin" ? "bot închis" : "tranzacție închisă", r.tip === "coin" ? "boți închiși" : "tranzacții închise") + " · total " + mcsBani1(x.total, u) + " · " + x.pePlus + " pe plus") + '</span></div>';
  if (x.putine) return cap + '<p class="mcsAvert mcsNota">Prea puține ca să conteze: ' + mcsEsc(mcsCate(x.cazuri, "caz", "cazuri")) + ' (îmi trebuie cel puțin 10). O „lună simulată” din atât doar le repetă. Mai jos, cazurile, așa cum au fost.</p>'
    + '<div class="rlTab mcsNota"><table class="t212Tab"><thead><tr><th>Pornit</th><th>Direcția</th><th>Levier</th><th>Suma</th><th>A stat</th><th>Rezultat</th></tr></thead><tbody>'
    + x.lista.map(function (y) { return '<tr><td>' + mcsEsc(new Date(y.t).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })) + '</td><td>' + mcsEsc(y.dir || "") + '</td><td>' + mcsEsc(y.lev ? y.lev + "×" : "—") + '</td><td>' + mcsEsc(y.inv != null ? mcsNr(y.inv, 2) + " " + u : "—") + '</td><td>' + mcsEsc(y.ore != null ? (y.ore < 1 ? Math.round(y.ore * 60) + " min" : mcsNr(y.ore, 1) + " h") : "—") + '</td><td class="' + mcsCls(y.bani) + '">' + mcsBani1(y.bani, u) + '</td></tr>'; }).join("")
    + '</tbody></table></div></section>';
  return cap + '<p class="tbSub mcsNota">' + mcsEsc("O lună cu " + mcsCate(i.K, r.tip === "coin" ? "bot" : "tranzacție", r.tip === "coin" ? "boți" : "tranzacții") + " pe " + r.sim + " (ritmul tău din ultimele 30 de zile; fără niciunul, unul), trase din ale tale: 5% sub " + mcsBani1(x.p5, u) + ", de obicei " + mcsBani1(x.p50, u) + ", 5% peste " + mcsBani1(x.p95, u) + "; pe plus în " + mcsPr(x.pPlus) + ".") + '</p></section>';
}
function mcsHtml(st) {
  st = st || {};
  var h = '<div class="mcsCap"><h4>🎲 Monte Carlo pe un coin sau un stock</h4><span class="tbSub">trecutul reluat de mii de ori, nu o predicție</span></div>'
    + '<div class="mcsForm"><input id="mcsSim" placeholder="ex. PONS, LIT, AAPL, RHM.DE" autocomplete="off" value="' + mcsEsc(st.sim || "") + '"><button type="button" class="t212Btn t212BtnPlin" data-action-click="mcsAnalizeaza()">Analizează</button>'
    + ((st.scurtaturi || []).map(mcsCurata).filter(Boolean).length ? '<span class="tbSub">sau:</span>' + st.scurtaturi.map(mcsCurata).filter(Boolean).slice(0, 12).map(function (s) { return '<button type="button" class="t212BtnLinie" data-action-click="mcsAlege(\'' + s + '\')">' + s + '</button>'; }).join("") : '') + '</div>';
  if (st.inLucru) return h + '<p class="tbSub mcsNota">aduc prețurile și simulez ' + mcsEsc(st.sim) + '… (~15 secunde la un coin: Pionex dă lumânările pe bucăți)</p>';
  if (st.eroare) return h + '<p class="tbWarn mcsNota">' + mcsEsc(st.eroare) + '</p>';
  if (!st.rez) return h + '<p class="tbSub mcsNota">Scrie un coin (cum e pe Pionex, ex. PONS) sau un stock (ca la Yahoo, ex. AAPL, RHM.DE) și apasă „Analizează”: prețul pe următoarele zile, un bot grid pe el (la coinuri) și istoria ta pe el.</p>';
  return h + (st.rez.sursa ? '<p class="tbSub mcsNota mcsSursa">Am analizat: <b>' + mcsEsc(st.rez.sursa) + '</b></p>' : '') + mcsPretHtml(st.rez) + mcsGridHtml(st.rez) + mcsIstHtml(st.rez)
    + '<p class="mcsAvert">E trecutul reluat de mii de ori, nu o predicție. Drumurile sunt lipite din zile reale ale simbolului, deci o criză mai rea decât orice a avut nu apare în ele. Simularea iese la fel la aceeași dată (generator cu sămânță fixă).</p>';
}

// ---------------- în pagină ----------------
function mcsEl(id) { return typeof document !== "undefined" ? document.getElementById(id) : null; }
function mcsBoti() { return typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : typeof contTot !== "undefined" && contTot.boti ? contTot.boti : []; }
// scurtăturile: monedele boților activi, pozițiile T212 și Salt
function mcsScurtaturi() {
  var l = mcsBoti().filter(function (b) { return b && b.activ; }).map(mcsSimbolBot);
  try { (typeof t212 !== "undefined" && t212.poz || []).forEach(function (x) { if (typeof T212 !== "undefined") l.push(T212.simbol(x.ticker)); }); } catch (e) {}
  try { (typeof saltStare !== "undefined" && saltStare.d.pozitii || []).forEach(function (p) { l.push(p.simbol); }); } catch (e) {}
  return l.filter(function (s, i) { return s && l.indexOf(s) === i; });
}
function mcsDeseneaza() { var el = mcsEl("mcsPagina"); if (el) el.innerHTML = mcsHtml(Object.assign({}, mcsStare, { scurtaturi: mcsScurtaturi() })); }
function mcsAlege(s) { var i = mcsEl("mcsSim"); if (i) i.value = s; mcsAnalizeaza(); }
function mcsPauza(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function mcsNumar(id) { var el = mcsEl(id), v = el ? String(el.value || "").replace(",", ".").trim() : ""; var x = Number(v); return v !== "" && isFinite(x) ? x : null; }
// coin: 15M (6 pagini de câte 500, ca fișa Grid) + 1D; nimic pe Pionex ⇒ null (încerc stock)
// revizia (R4): „lipsa” doar când Pionex spune că simbolul nu există (MARKET_INVALID_SYMBOL, HTTP 200) sau n-are nicio lumânare; orice altă
// eroare (429, cădere, rețea) e „eroare” - NU trec la Yahoo (SOL, LIT, APT există și ca acțiuni: aș analiza alt instrument)
function mcsPionexFel(k) {
  if (!k || typeof k !== "object") return "eroare";
  if (k.code === "MARKET_INVALID_SYMBOL") return "lipsa";
  if (k.data && Array.isArray(k.data.klines)) return k.data.klines.length ? "date" : "lipsa";
  return "eroare";
}
async function mcsAduCoin(sim) {
  var baza = "/api/market?type=pionex_klines&symbol=" + encodeURIComponent(sim + "_USDT_PERP"), r15 = [], end = null;
  for (var p = 0; p < 6; p++) {
    var k = null; try { k = await getJSON(baza + "&interval=15M&limit=500" + (end ? "&endTime=" + end : "")); } catch (e) { if (p === 0) throw new Error("Pionex n-a răspuns acum (" + (e && e.message || e) + "): încearcă din nou peste un minut."); break; }
    var fel = mcsPionexFel(k); if (fel !== "date") { if (p === 0 && fel === "lipsa") return null; if (p === 0) throw new Error("Pionex n-a dat lumânările pentru " + sim + " (" + (k && (k.code || k.message) || "fără răspuns") + "): încearcă din nou peste un minut."); break; }
    var r = k.data.klines;
    r15 = r15.concat(r); if (r.length < 500) break;
    end = Math.min.apply(null, r.map(function (x) { return Number(x.time); }).filter(isFinite)) - 1; await mcsPauza(350);
  }
  await mcsPauza(350);
  var r1 = []; try { var k1 = await getJSON(baza + "&interval=1D&limit=200"); r1 = k1 && k1.data && k1.data.klines || []; } catch (e) {}
  return { b15: GridCalcul.bare(r15), b1: GridCalcul.bare(r1) };
}
// lista Salt (ISIN ⇒ simbol Yahoo cu bursa): „RHM” ⇒ RHM.DE; adusă o dată, chiar dacă pagina Salt n-a fost deschisă
async function mcsUnivers() {
  if (mcsStare.univers) return mcsStare.univers;
  if (typeof saltStare !== "undefined" && saltStare.d && saltStare.d.univers) return (mcsStare.univers = saltStare.d.univers);
  try { var u = await (await fetch("/data/salt-univers.json")).json(); mcsStare.univers = u && u.instrumente || []; } catch (e) { mcsStare.univers = []; }
  return mcsStare.univers;
}
async function mcsAduStock(sim) {
  var cand = [sim];
  try { if (sim.indexOf(".") < 0 && typeof Salt !== "undefined") { var u = Salt.cauta(await mcsUnivers(), sim)[0]; if (u && u.simbol && u.simbol !== sim) cand.unshift(u.simbol); } } catch (e) {}
  for (var i = 0; i < cand.length; i++) {
    try { var r = await getJSON("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(cand[i])), b = GridCalcul.bareToate(r && r.randuri || []); if (b.length >= 60) return { sim: cand[i], b: b }; } catch (e) {}
  }
  return null;
}
async function mcsArhiva() {
  if (mcsStare.arhiva) return mcsStare.arhiva;
  try { var a = await getJSON("/api/istoric-bot?action=botiInchisi"); mcsStare.arhiva = a && Array.isArray(a.boti) ? a.boti : []; } catch (e) { mcsStare.arhiva = []; }
  return mcsStare.arhiva;
}
// calculul (fără rețea) pe datele aduse; stopul / ținta / setările botului din câmpuri dacă le-a schimbat
function mcsCalculeaza(d, o) {
  o = o || {}; var acum = Date.now();
  if (d.tip === "coin") {
    var P = d.b15[d.b15.length - 1].c, sp = o.stop > 0 ? o.stop / 100 : 0.1, tp = o.tinta > 0 ? o.tinta / 100 : 0.15;
    var pretMc = d.b1.length >= 60 ? MonteSimbol.pret(d.b1, { orizonturi: [7, 30], n: 1000, blocZile: 5, seed: 11, stopPct: sp, tintaPct: tp, prag: 0.1 })
      : MonteSimbol.pret(d.b15, { barePeZi: 96, orizonturi: [7, 30], n: 600, blocZile: 1, minZile: 14, seed: 11, stopPct: sp, tintaPct: tp, prag: 0.1 });
    var st = o.setari || mcsSetariBot(mcsBoti(), d.sim) || mcsSetariProba(P);
    return { sim: d.sim, tip: "coin", sursa: d.sursa, pret: P, pretMc: pretMc, setari: st, grid: MonteSimbol.grid(d.b15, Object.assign({ pret: P }, st), { zile: 7, n: 500, seed: 12 }), ist: d.ist,
      nivelText: o.stop > 0 || o.tinta > 0 ? "stopul și ținta tale" : "−10% / +15% pentru un coin: schimbă-le" };
  }
  var b = d.b, Pp = b[b.length - 1].c, n = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale.niveluri(b, Pp, {}) : null, ok = n && n.nivel === "ok";
  var sp2 = o.stop > 0 ? o.stop / 100 : ok && n.stop > 0 && n.stop < Pp ? 1 - n.stop / Pp : 0.1, tp2 = o.tinta > 0 ? o.tinta / 100 : ok && n.tinta > Pp ? n.tinta / Pp - 1 : 0.15;
  return { sim: d.sim, tip: "stock", sursa: d.sursa, pret: Pp, pretMc: MonteSimbol.pret(b, { orizonturi: [20, 60], n: 1000, blocZile: 5, seed: 21, stopPct: sp2, tintaPct: tp2, prag: 0.1 }), grid: null, setari: null, ist: d.ist,
    nivelText: o.stop > 0 || o.tinta > 0 ? "stopul și ținta tale" : ok ? "ale Radarului pentru o intrare nouă azi (stopul " + mcsPretTxt(n.stop) + ", ținta " + mcsPretTxt(n.tinta) + ")" : "−10% / +15%: schimbă-le" };
}
async function mcsAnalizeaza() {
  var i = mcsEl("mcsSim"), sim = mcsCurata(i ? i.value : mcsStare.sim);
  if (!sim) { mcsStare.eroare = "Scrie un simbol: un coin ca pe Pionex (PONS) sau un stock ca la Yahoo (AAPL, RHM.DE)."; mcsStare.rez = null; mcsDeseneaza(); return; }
  if (mcsStare.inLucru) return;
  mcsStare.sim = sim; mcsStare.inLucru = true; mcsStare.eroare = null; mcsStare.rez = null; mcsDeseneaza();
  try {
    var c = sim.indexOf(".") < 0 ? await mcsAduCoin(sim) : null, d = null;
    var alias = mcsBoti().filter(function (b) { return mcsBotPe(b, sim); }).map(function (b) { return String(b.baza || "").replace(/\.PERP$/, "").toUpperCase(); });
    if (c && c.b15.length) d = { tip: "coin", sim: sim, sursa: sim + "_USDT_PERP · Pionex", b15: c.b15, b1: c.b1, ist: mcsIstorieCoin(await mcsArhiva(), sim, Date.now(), alias) };
    else {
      var s = await mcsAduStock(sim); if (!s) throw new Error("Nu găsesc „" + sim + "”: nici ca monedă pe Pionex (" + sim + "_USDT_PERP), nici ca acțiune la Yahoo (cu cel puțin 60 de zile). La acțiunile din afara SUA scrie și bursa: RHM.DE, ULVR.L.");
      var u = typeof t212 !== "undefined" && t212.istoric ? t212.istoric.umpleri : null;
      if (!u) { try { var h = await getJSON("/api/t212?action=istoric"); u = h && h.umpleri || []; } catch (e) { u = []; } }
      d = { tip: "stock", sim: s.sim, sursa: s.sim + " · Yahoo (acțiune / ETF)", b: s.b, ist: mcsIstorieStock(u, s.sim, Date.now()) };
    }
    mcsStare.date = d; await mcsPauza(0);   // „aduc… / simulez” apare înainte de calcul
    mcsStare.rez = mcsCalculeaza(d, {});
  } catch (e) { mcsStare.eroare = e && e.message || String(e); }
  finally { mcsStare.inLucru = false; }
  mcsDeseneaza();
}
// refă simularea pe aceleași date, cu stopul / ținta / setările botului din câmpuri (fără cereri noi)
function mcsResimuleaza() {
  var d = mcsStare.date; if (!d) return;
  var o = { stop: mcsNumar("mcsStop"), tinta: mcsNumar("mcsTinta") };
  if (d.tip === "coin" && mcsEl("mcsJos")) {
    var jos = mcsNumar("mcsJos"), sus = mcsNumar("mcsSus"), g = mcsNumar("mcsGrile"), lv = mcsNumar("mcsLevier"), dirEl = mcsEl("mcsDir"), suma = mcsNumar("mcsSuma"), sb = mcsNumar("mcsStopBot"), dir = dirEl ? dirEl.value : "long";
    if (jos > 0 && sus > jos && g >= 2 && lv >= 1 && suma > 0) {
      var nou = { jos: jos, sus: sus, grile: Math.round(g), levier: Math.round(lv), dir: mcsDir(dir), suma: suma, stop: sb > 0 ? (dir === "short" ? { sus: sb } : { jos: sb }) : null, botulTau: false }, vechi = mcsStare.rez && mcsStare.rez.setari;
      o.setari = mcsAceleasiSetari(vechi, nou) ? vechi : nou;
    }
    else { mcsStare.eroare = null; }
  }
  mcsStare.rez = mcsCalculeaza(d, o); mcsDeseneaza();
}
