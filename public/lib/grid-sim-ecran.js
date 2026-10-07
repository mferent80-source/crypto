// v100.134 (el 07.10: „să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig”, spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): pagina „Simulator grid” (#gridsim / #gsPagina). Desenul e HTML pur
// (gsFormHtml, gsVerdictHtml, gsDurateHtml, gsRiscuriHtml, gsBotulMeuHtml, gsHtml - probate în vm, fără DOM); legătura cu pagina
// (gsPorneste, gsMod, gsAlegeBot, gsDinCod, gsDirectie, gsSimuleaza, gsOriz, gsCopiazaCod, Enter) e la coadă. Calculul: GridSim (pur).
// Refolosește din pagina Monte Carlo: mcsAduCoin (barele 15M Pionex, 6 pagini cu pauze), mcsBoti / mcsSimbolBot, mcsHist, mcsEsc, mcsPretTxt.
var gsStare = { mod: "nou", botIdx: 0, boti: [], sim: "", st: { jos: null, sus: null, grile: 20, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: 0.0003, pornitLa: null, tpAprox: false, bot: null, rez: null, oriz: 2, inLucru: false, eroare: null, cod: "", codEroare: null, pret: null, date: null, dateLa: 0,
  variante: null, varianteInLucru: false, varianteEroare: null, tinteBot: null, tinteBotInLucru: false, tinteBotEroare: null,   // v100.135: alte setări pe aceleași drumuri
  fundingSursa: null, fundingInfo: null, fundingSim: null, dupa: null };   // dupa (revizia R9): ce s-a cerut în timpul unei simulări   // v100.135: funding-ul real Pionex (null = cost fix presupus, "pionex", "manual")
var GS_ORIZ = [1, 3, 7, 14];
function gsNr(v, z) { return Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z }); }
function gsCate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
function gsCls(v) { return v > 0 ? "good" : v < 0 ? "bad" : ""; }
function gsClsP(p) { return p >= 0.55 ? "good" : p <= 0.45 ? "bad" : ""; }
function gsTd(v, cls) { return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + mcsEsc(v) + '</td>'; }
function gsRand(et, v, cls) { return '<div class="mcsRand"><span>' + mcsEsc(et) + '</span><b class="' + (cls || "") + '">' + mcsEsc(v) + '</b></div>'; }
function gsData(t) { return t > 0 ? new Date(t).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }
function gsVal(v) { return v === null || v === undefined || !isFinite(v) ? "" : String(v); }
function gsPlanTxt(plan) { return plan && plan.plus > 0 && plan.minus > 0 ? "Planul +" + gsNr(plan.plus, 1) + " înainte de −" + gsNr(plan.minus, 1) : "Planul tău"; }
function gsPlanOk(plan) { return !!(plan && (plan.plus > 0 || plan.minus > 0)); }
// zilele până la plan: sub o zi în ore („2 h”), altfel zile (cu o zecimală doar când e nevoie)
function gsZileTxt(v) { if (v == null || !isFinite(v)) return "—"; if (v < 1) return Math.max(1, Math.round(v * 24)) + " h"; var z = Math.round(v * 10) / 10; return gsNr(z, z % 1 ? 1 : 0) + " z"; }
function gsFundingTxt(v) { var a = Math.abs(v); return (v < 0 ? "încasat " : "") + (a < 0.05 ? "sub 0,1 USDT" : "≈ " + gsNr(a, 1) + " USDT"); }
function gsPctF(v) { return (v < 0 ? "−" : "") + Math.abs(v * 100).toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 3 }) + "%"; }
// v100.135: rata de funding pe zi din ratele Pionex (lista „rates”: fundingTime, fundingRate) - media ultimelor 7 zile × perioade pe zi;
// intervalul (4 h / 8 h) din timpii ratelor. Cu semn: pozitivă = longul plătește, shortul încasează.
// revizia (R6/R7): SUMA ratelor din fereastra de 7 zile pe zilele acoperite (fiecare rată acoperă intervalul dinaintea ei - merge și cu
// intervale amestecate, o gaură nu se numără peste o zi); doar rate mai vechi de 7 zile ⇒ „veche” (fereastra de la ultima rată)
function gsRataFunding(rates, acum) {
  var l = (Array.isArray(rates) ? rates : []).map(function (z) { return { t: Number(z && z.fundingTime), r: Number(z && z.fundingRate) }; }).filter(function (z) { return isFinite(z.t) && isFinite(z.r); }).sort(function (a, b) { return b.t - a.t; });
  if (l.length < 2) return null;
  var d = []; for (var i = 1; i < l.length; i++) d.push((l[i - 1].t - l[i].t) / 3600000); d.sort(function (a, b) { return a - b; });
  var ore = Math.round(d[Math.floor(d.length / 2)] * 10) / 10; if (!(ore > 0)) return null;
  var veche = !(l[0].t > acum - 7 * 864e5), ref = veche ? l[0].t : acum, ult = [], zile = 0;
  for (var k = 0; k < l.length; k++) { if (!(l[k].t > ref - 7 * 864e5)) break; var c = k + 1 < l.length ? (l[k].t - l[k + 1].t) / 3600000 : ore; ult.push(l[k]); zile += Math.min(24, Math.max(0, c)) / 24; }
  zile = Math.min(7, zile); if (!(zile > 0)) return null;
  var suma = ult.reduce(function (s, z) { return s + z.r; }, 0);
  return { rataZi: suma / zile, intervalOre: ore, zile: Math.round(zile * 10) / 10, n: ult.length, rata: l[0].r, veche: veche, ultimaLa: l[0].t };
}
function gsDataTxt(t) { return new Date(t).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }); }
// revizia (R1): câmpul arată valoarea ROTUNJITĂ (4 zecimale) ⇒ „scris de mână” doar când diferă de ce se AFIȘEAZĂ, nu de valoarea exactă
function gsFundingManual(fz, memorat) { return Math.abs(fz - (isFinite(memorat) ? +(memorat * 100).toFixed(4) : 0)) > 1e-9; }

// ---------------- desenul (pur) ----------------
// schimbarea direcției: numărul de DEASUPRA prețului și cel de DEDESUBT își păstrează locul, rolul vine din direcția nouă
// (long: stop sub, TP deasupra; short: stop deasupra, TP dedesubt; neutru: doar stop, TP stins) - ca în Pionex
function gsDirectieSt(st, d) {
  var x = {}; for (var k in st) x[k] = st[k];
  var sus = st.dir === "long" ? st.tp : st.stop && st.stop.sus > 0 ? st.stop.sus : null, jos = st.dir === "short" ? st.tp : st.stop && st.stop.jos > 0 ? st.stop.jos : null;
  if (st.dir === "long" && !(sus > 0) && st.stop && st.stop.sus > 0) sus = st.stop.sus;
  if (d === "long") { x.stop = jos > 0 ? { jos: jos } : null; x.tp = sus > 0 ? sus : null; }
  else if (d === "short") { x.stop = sus > 0 ? { sus: sus } : null; x.tp = jos > 0 ? jos : null; }
  else { x.tp = null; x.stop = jos > 0 ? { jos: jos } : sus > 0 ? { sus: sus } : null; }
  x.dir = d;
  return x;
}
function gsFormHtml(s) {
  var st = s.st || {}, neutru = st.dir === "neutru", meu = s.mod === "meu", stopV = st.stop ? (st.stop.sus || st.stop.jos) : null;
  var inp = function (id, v, extra) { return '<input id="' + id + '" inputmode="decimal" autocomplete="off"' + (extra || "") + ' value="' + mcsEsc(gsVal(v)) + '">'; };
  var h = '<div class="t212File gsMod" role="tablist"><button type="button" class="tbIntBtn" aria-pressed="' + !meu + '" data-action-click="gsMod(\'nou\')">Bot nou</button><button type="button" class="tbIntBtn" aria-pressed="' + meu + '" data-action-click="gsMod(\'meu\')">Botul meu care rulează</button></div>';
  if (meu) h += s.boti && s.boti.length ? '<label class="tbSub gsBotAles">botul: <select id="gsBot" data-action-change="gsAlegeBot(this.value)">' + s.boti.map(function (t, i) { return '<option value="' + i + '"' + (i === (s.botIdx || 0) ? ' selected' : '') + '>' + mcsEsc(t) + '</option>'; }).join("") + '</select></label>'
    : '<p class="tbSub gsNota">n-ai niciun bot activ în Pionex acum (sau Tabloul nu i-a citit încă): simulează un bot nou sau lipește codul din fișă.</p>';
  h += '<div class="gsCod"><label class="gsCodL">Codul din fișă <textarea id="gsCod" rows="2" placeholder="rândul copiat din Tablou („Copiază codul”) sau din fișa Grid („Pentru TradingView”)">' + mcsEsc(s.cod || "") + '</textarea></label><button type="button" class="t212BtnLinie" data-action-click="gsDinCod()">Ia din cod</button></div>'
    + (s.codEroare ? '<p class="tbWarn gsNota">' + mcsEsc(s.codEroare) + '</p>' : '');
  h += '<div class="gsCampuri"><label>Moneda <input id="gsSim" autocomplete="off" placeholder="ex. PONS" value="' + mcsEsc(s.sim || "") + '"' + (meu ? ' readonly' : '') + '></label>'
    + '<label>Direcția <select id="gsDir" data-action-change="gsDirectie(this.value)">' + ["long", "short", "neutru"].map(function (d) { return '<option value="' + d + '"' + (st.dir === d ? ' selected' : '') + '>' + d + '</option>'; }).join("") + '</select></label>'
    + '<label>Jos ' + inp("gsJos", st.jos) + '</label><label>Sus ' + inp("gsSus", st.sus) + '</label>'
    + '<label>Linii (ca în Pionex) ' + inp("gsLinii", st.grile > 0 ? st.grile + 1 : null, ' inputmode="numeric"') + '<span class="t212Mic" id="gsInterv">= ' + mcsEsc(st.grile > 0 ? gsCate(st.grile, "interval", "intervale") : "—") + '</span></label>'
    + '<label>Levier ' + inp("gsLev", st.levier, ' inputmode="numeric"') + '</label>'
    + '<label>Stop ' + inp("gsStop", stopV, ' placeholder="fără"') + '</label>'
    + '<label>TP (take profit) ' + (neutru ? '<input id="gsTp" inputmode="decimal" placeholder="la neutru nu" value="" disabled>' : inp("gsTp", st.tp, ' placeholder="fără"')) + '</label>'
    + '<label>Suma, USDT ' + inp("gsSuma", st.suma) + '</label>'
    + '<label>Tip <select id="gsTip">' + ["geometric", "aritmetic"].map(function (t) { return '<option value="' + t + '"' + ((st.tip || "geometric") === t ? ' selected' : '') + '>' + t + '</option>'; }).join("") + '</select></label>'
    + '<label>Planul: ies la − ' + inp("gsPlanMinus", s.plan && s.plan.minus, ' placeholder="USDT"') + '</label><label>încasez la + ' + inp("gsPlanPlus", s.plan && s.plan.plus, ' placeholder="USDT"') + '</label>'
    + '<label>Funding pe zi, % ' + inp("gsFunding", isFinite(s.fundingZi) ? +(s.fundingZi * 100).toFixed(4) : 0) + '</label>'
    + (meu ? '<label>Pornit la <input id="gsPornit" readonly value="' + mcsEsc(gsData(s.pornitLa)) + '"></label>' : '')
    + '<button type="button" class="t212Btn t212BtnPlin" data-action-click="gsSimuleaza()">Simulează</button></div>';
  // revizia (R2/R4/R7): moneda ratei, „veche” când Pionex n-are rate din ultimele 7 zile, cine plătește după SEMN; costul presupus e cost oricare ar fi direcția
  var fi = s.fundingInfo, semn = function (v) { return v < 0 ? "short plătește, long încasează" : "long plătește, short încasează"; };
  var fnot = s.fundingSursa === "pionex" && fi ? "funding-ul real Pionex (" + (fi.sim || s.sim) + "): " + gsPctF(fi.rataZi) + " pe zi (" + (fi.veche ? "rată veche, ultima de pe " + gsDataTxt(fi.ultimaLa) : "media ultimelor " + gsCate(fi.zile, "zi", "zile") + ", la " + fi.intervalOre + " h") + ") · " + semn(fi.rataZi)
    : s.fundingSursa === "manual" ? "funding scris de tine · " + semn(s.fundingZi)
    : "funding: cost fix presupus (" + gsPctF(s.fundingZi || 0) + " pe zi, plătit oricare ar fi direcția) până la prima simulare, apoi rata reală Pionex a monedei";
  h += '<p class="tbSub gsNota">' + mcsEsc(fnot) + '</p>';
  if (s.tpAprox && st.tp > 0) h += '<p class="tbSub gsNota">TP-ul tău e în procente din investiție: prețul de aici e cel socotit de Pionex pentru botul care rulează; e aproximativ.</p>';
  if (st.jos > 0 && st.sus > st.jos) h += '<p class="tbSub gsCodOut">Codul pentru TradingView: <code id="gsCodOut">' + mcsEsc(GridSim.inCod(st, gsPlanOk(s.plan) ? s.plan : null)) + '</code> <button type="button" class="t212BtnLinie" data-action-click="gsCopiazaCod()">Copiază</button></p>';
  return '<section class="t212Panou gsSec gsSetare"><div class="t212PanouCap"><h4>⚙️ Setarea</h4><span class="tbSub">ca în GRID-FISA: lipești codul sau completezi câmpurile; liniile sunt ca în Pionex</span></div>' + h + '</section>';
}
function gsVerdictHtml(s) {
  var r = s.rez, i = r.orizonturi[s.oriz] ? s.oriz : 2, o = r.orizonturi[i], v = GridSim.verdict(r, s.st, gsPlanOk(s.plan) ? s.plan : null, i, s.bot);
  if (!o || !v) return "";
  var d = v.deAici && o.deAici ? o.deAici : o;   // revizia (R3): la botul care rulează, cifrele și histograma sunt „de aici încolo”
  // eticheta „mijloc” doar când nu se suprapune cu 5% / 95% (cifra e oricum în rândul de sub verdict)
  var lat = d.hist && d.hist.hi > d.hist.lo ? d.hist.hi - d.hist.lo : 0, aproape = lat > 0 && (d.p50 - d.p5 < 0.14 * lat || d.p95 - d.p50 < 0.14 * lat);
  var mk = [{ v: d.p5, t: "5%", c: "bad" }].concat(aproape ? [] : [{ v: d.p50, t: "mijloc", c: "mijl" }]).concat([{ v: d.p95, t: "95%", c: "good" }]);
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>VERDICT, ' + (v.deAici ? "de aici încolo, " : "") + 'pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4><span class="tbSub">' + mcsEsc(gsCate(r.n, "drum", "drumuri") + " de " + gsCate(r.zile, "zi", "zile") + " pe 15 minute, din " + gsCate(r.zileIstoric, "zi", "zile") + " de istoric · " + (r.acum ? "de la pornirea botului tău" : "botul pornit la prețul de acum")) + '</span></div>'
    + (o.scurt ? '<p class="mcsAvert gsNota">Istoricul e scurt față de orizont: la ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ' simularea doar reamestecă aceleași zile. Citește cifrele ca o schiță.</p>' : '')
    + '<div class="gsVerdict ' + v.culoare + '"><b>' + mcsEsc(v.rand) + '</b><span class="t212Mic">' + mcsEsc(v.marja) + ' · doar din numărul drumurilor</span></div>'
    + '<p class="gsSub">' + mcsEsc(v.sub) + '</p>'
    + '<div class="gsHist">' + mcsHist(d.hist, mk, function (x) { return GridSim.bani1(x); }) + '</div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(v.faCe) + '</p>'
    + '<p class="tbSub gsNota">' + mcsEsc(v.nota) + '</p></section>';
}
function gsDurateHtml(s) {
  var r = s.rez, ales = r.orizonturi[s.oriz] ? s.oriz : 2, plan = gsPlanOk(s.plan) ? s.plan : null, areTp = s.st && s.st.tp > 0, areStop = !!(s.st && s.st.stop), meu = !!r.acum;
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>📅 Pe durate' + (meu ? ", de aici încolo" : "") + '</h4><span class="tbSub">aceleași drumuri, citite la 1, 3, 7 și 14 zile · apasă un rând ca să-l pui în verdict' + (meu ? " · planul: pe totalul de la pornire" : "") + '</span></div>'
    + '<div class="rlTab"><table class="t212Tab gsDurate"><thead><tr><th>Zile</th><th>Câștigă</th><th>De obicei</th><th>5% sub</th><th>5% peste</th><th>' + mcsEsc(gsPlanTxt(plan)) + '</th><th>În</th><th>Lichidare</th><th>Stop</th><th>TP</th></tr></thead><tbody>'
    + r.orizonturi.map(function (o, i) {
      var pl = plan && o.plan, d = meu && o.deAici ? o.deAici : o;
      return '<tr class="gsRand' + (i === ales ? ' gsRandAles' : '') + '" aria-selected="' + (i === ales) + '" data-action-click="gsOriz(' + i + ')">' + gsTd(gsCate(o.zile, "zi", "zile")) + gsTd(GridSim.pr(d.pCastig), gsClsP(d.pCastig)) + gsTd(GridSim.bani1(d.p50), gsCls(Math.round(d.p50 * 10) / 10)) + gsTd(GridSim.bani1(d.p5)) + gsTd(GridSim.bani1(d.p95))
        + gsTd(pl ? GridSim.pr(o.plan.p) : "—") + gsTd(pl && o.plan.dejaAtins ? "deja" : pl && o.plan.zileMediana !== null ? gsZileTxt(o.plan.zileMediana) : "—") + gsTd(GridSim.pr(o.pLich), o.pLich > 0.02 ? "bad" : "") + gsTd(areStop ? GridSim.pr(o.pStop) : "—", areStop && o.pStop > 0.5 ? "bad" : "") + gsTd(areTp ? GridSim.pr(o.pTp) : "—") + '</tr>';
    }).join("") + '</tbody></table></div>'
    + (plan ? '<p class="tbSub gsNota">Planul se judecă la PRIMA atingere (+' + mcsEsc(gsNr(plan.plus || 0, 1)) + ' înainte de −' + mcsEsc(gsNr(plan.minus || 0, 1)) + '): dacă nu închizi botul când ajunge acolo, drumul merge mai departe și se judecă la capăt - de aici diferența față de „câștigă”. „În” = după cât timp se atinge, de obicei.</p>' : '')
    + '</section>';
}
function gsRiscuriHtml(s) {
  var r = s.rez, o = r.orizonturi[s.oriz] || r.orizonturi[2], st = s.st || {}, stopV = st.stop ? (st.stop.sus || st.stop.jos) : null, h = "";
  h += gsRand("lichidare", GridSim.pr(o.pLich), o.pLich > 0.02 ? "bad" : "good");
  if (stopV) h += gsRand("atinge stopul (" + mcsPretTxt(stopV) + ")", GridSim.pr(o.pStop), o.pStop > 0.5 ? "bad" : "");
  if (st.tp > 0) h += gsRand("atinge TP-ul (" + mcsPretTxt(st.tp) + ")", GridSim.pr(o.pTp));
  h += gsRand("iese din grid măcar o dată", GridSim.pr(o.pIesire)) + gsRand("grile încasate, în medie", gsNr(o.perechi, 1))
    + gsRand("pierderea maximă pe drum" + (r.acum ? " (de la pornire)" : ""), GridSim.bani1(o.maxJos.p50) + " de obicei · " + GridSim.bani1(o.maxJos.p5) + " în cele mai proaste 5%", "bad")
    + gsRand("funding (" + (s.fundingSursa === "pionex" ? "rata reală Pionex" : s.fundingSursa === "manual" ? "scris de tine" : "cost fix presupus") + "), în medie", gsFundingTxt(o.funding));
  if (s.mod === "meu" && s.bot && typeof TabloExtra !== "undefined" && TabloExtra.dacaInchizi) { var z = TabloExtra.dacaInchizi(s.bot); if (z && z.pretZero > 0) h += gsRand("prețul de zero (botul tău, acum)", mcsPretTxt(z.pretZero) + (z.distantaZeroPct !== null ? " (" + mcsPct1(z.distantaZeroPct) + " de aici)" : "")); }
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>⚠️ Riscurile pe nume, pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4></div><div class="gsRiscuri">' + h + '</div></section>';
}
function gsBotulMeuHtml(s) {
  var r = s.rez, a = r.acum; if (!a) return "";
  var o = r.orizonturi[s.oriz] || r.orizonturi[2], b = s.bot || {}, pn = b.profitNet, plan = gsPlanOk(s.plan) ? s.plan : null;
  var h = '<p class="gsNota">reluat pe barele reale de la ' + mcsEsc(gsData(s.pornitLa)) + ' până la ' + mcsEsc(gsData(a.t)) + ': <b>' + mcsEsc(GridSim.bani1(a.usdt)) + '</b> estimat' + (pn !== null && pn !== undefined && isFinite(pn) ? '; Pionex spune <b>' + mcsEsc(GridSim.bani1(pn)) + '</b>' : '') + ' (umplerile sunt estimate pe bare, nu pe ordinele reale)'
    + ' · ' + mcsEsc(gsCate(a.perechi, "grilă încasată", "grile încasate")) + (isFinite(b.pozitie) && b.pozitie ? ' · poziția ' + mcsEsc(gsNr(Math.abs(b.pozitie), Math.abs(b.pozitie) < 10 ? 4 : 0) + " " + (s.sim || "")) : '') + (a.oprit ? ' · <b class="bad">botul ar fi fost ' + (a.oprit === "lichidat" ? "lichidat" : "oprit") + ' pe drumul real</b>' : '') + '</p>';
  if (o.plan && o.plan.dejaAtins && plan) h += '<p class="t212Fac">planul tău (' + (o.plan.dejaAtins === "plus" ? "+" + gsNr(plan.plus, 1) + ") e deja atins: încasează" : "−" + gsNr(plan.minus, 1) + ") e deja atins: ieși") + ', cum ți-ai propus.</p>';
  if (o.deAici) h += '<p class="gsNota">de aici încolo, în ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ': câștigă în ' + mcsEsc(GridSim.pr(o.deAici.pCastig)) + ' din drumuri, de obicei ' + mcsEsc(GridSim.bani1(o.deAici.p50)) + ' (5% sub ' + mcsEsc(gsSemn1(o.deAici.p5)) + ', 5% peste ' + mcsEsc(gsSemn1(o.deAici.p95)) + ').</p>';
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>🤖 Botul meu, de la pornire</h4><span class="tbSub">Pionex nu dă ce ține botul pe fiecare grilă: e reluarea, nu starea reală</span></div>' + h + '</section>';
}
// v100.135: variantele și țintele (TP) de pe pagina Monte Carlo, pe orizontul ales, pe setarea din formular (la botul care rulează: ca un bot pornit acum)
function gsAlteSetariHtml(s) {
  var st = s.st; if (!st || !(st.jos > 0)) return "";
  var zile = GS_ORIZ[s.oriz >= 0 && s.oriz < GS_ORIZ.length ? s.oriz : 2], rv = { setari: st, variante: s.variante, varianteInLucru: s.varianteInLucru, varianteEroare: s.varianteEroare, tinteBot: s.tinteBot, tinteBotInLucru: s.tinteBotInLucru, tinteBotEroare: s.tinteBotEroare };
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>🧪 Alte setări, pe aceleași drumuri</h4><span class="tbSub">' + mcsEsc("variantele și țintele (TP) de pe pagina Monte Carlo, pe " + gsCate(zile, "zi", "zile") + (s.rez && s.rez.acum ? " · la botul care rulează: ca un bot pornit acum, nu de la pornire" : "")) + '</span></div>'
    + mcsVarHtml(rv, "gsCompara()", zile) + mcsTpHtml(rv, "gsComparaTp()") + '</section>';
}
function gsSemn1(v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + gsNr(Math.abs(Math.round(v * 10) / 10), 1); }
function gsHtml(s) {
  s = s || gsStare;
  var vechime = s.dateLa > 0 ? Math.round((Date.now() - s.dateLa) / 60000) : null;
  var h = '<div class="mcsCap"><h4>🎰 Simulator grid</h4><span class="tbSub">' + mcsEsc((s.sim ? s.sim + (s.pret > 0 ? " · " + mcsPretTxt(s.pret) : "") : "un bot grid Pionex") + (vechime !== null ? " · date de acum " + gsCate(vechime, "minut", "minute") : "")) + '</span></div>' + gsFormHtml(s);
  if (s.inLucru) return h + '<p class="tbSub gsNota">calculez: aduc barele de 15 minute (Pionex le dă pe bucăți: ~20 de secunde la prima analiză a monedei) și rulez botul pe 500 de drumuri de 14 zile (sub o secundă)…</p>';
  if (s.eroare) return h + '<p class="tbWarn gsNota">' + mcsEsc(s.eroare) + '</p>';
  if (!s.rez) return h + '<p class="tbSub gsNota">Lipește codul din Tablou sau completează setarea, apoi apasă „Simulează”: câștigă sau pierde, cât de des, cât, planul tău, pe 1 / 3 / 7 / 14 zile.</p>';
  var sv = s.st && s.st.stop ? (s.st.stop.sus || s.st.stop.jos) : null, inGrid = sv > 0 && s.st.jos > 0 && sv > s.st.jos && sv < s.st.sus;
  return h + (inGrid ? '<p class="tbWarn gsNota">' + mcsEsc("Stopul (" + mcsPretTxt(sv) + ") e ÎN grid (" + mcsPretTxt(s.st.jos) + "–" + mcsPretTxt(s.st.sus) + "): regula ta e „stopul nu stă în mijlocul gridului” - o mișcare obișnuită l-ar opri cu poziția pe jumătate.") + '</p>' : '') + (s.rez.tpIgnorat > 0 ? '<p class="tbWarn gsNota">' + mcsEsc("TP-ul (" + mcsPretTxt(s.rez.tpIgnorat) + ") e de partea greșită a prețului pentru " + s.st.dir + ": nu l-am pus în simulare. La long, TP-ul e deasupra prețului de acum; la short, dedesubt.") + '</p>' : '')
    + gsVerdictHtml(s) + gsDurateHtml(s) + gsRiscuriHtml(s) + gsBotulMeuHtml(s) + gsAlteSetariHtml(s)
    + '<p class="mcsAvert">Trecutul reluat de ' + mcsEsc(gsCate(s.rez.n, "dată", "ori")) + ', nu o predicție: drumurile sunt zile reale ale monedei lipite la întâmplare, fără tendința perioadei; o criză mai rea decât orice a avut nu apare în ele. Aceeași cifră la aceeași dată (sămânță fixă).</p>';
}

// ---------------- în pagină ----------------
function gsEl(id) { return typeof document !== "undefined" ? document.getElementById(id) : null; }
function gsBoti() { return mcsBoti().filter(function (b) { return b && b.activ && b.gridJos > 0 && b.gridSus > b.gridJos; }); }
function gsEticheta(b) { var d = GridSim.setariDinBot(b).st; return mcsSimbolBot(b) + " · " + d.dir + " " + d.levier + "× · " + mcsPretTxt(d.jos) + "–" + mcsPretTxt(d.sus) + " · " + gsNr(d.suma || 0, 2) + " USDT"; }
function gsDeseneaza() { var el = gsEl("gsPagina"); if (!el) return; var l = gsBoti(); gsStare.boti = l.map(gsEticheta); if (gsStare.botId) { var k = l.findIndex(function (b) { return String(b.id) === gsStare.botId; }); if (k >= 0) gsStare.botIdx = k; } el.innerHTML = gsHtml(gsStare); }
function gsPorneste() {
  if (gsStare.mod === "meu" && !gsStare.bot && gsBoti().length) { gsAlegeBot(0); return; }
  gsDeseneaza();
}
function gsMod(m) {
  gsCiteste(true);   // revizia (R5): ce ai tastat nu se pierde la redesenare
  gsStare.mod = m === "meu" ? "meu" : "nou"; gsStare.rez = null; gsStare.eroare = null;
  if (gsStare.mod === "meu" && gsBoti().length) { gsAlegeBot(gsStare.botIdx || 0); return; }
  gsDeseneaza();
}
function gsAlegeBot(i) {
  if (gsStare.inLucru) { gsStare.dupa = function () { gsAlegeBot(i); }; return; }   // revizia (R9): după simularea în lucru (altfel rezultatul vechi sub setările noi)
  var l = gsBoti(), b = l[Number(i) >= 0 && Number(i) < l.length ? Number(i) : 0]; if (!b) { gsDeseneaza(); return; }
  var d = GridSim.setariDinBot(b);
  gsStare.botIdx = l.indexOf(b); gsStare.bot = b; gsStare.botId = String(b.id); gsStare.sim = mcsSimbolBot(b); gsStare.st = Object.assign({}, d.st, { suma: d.st.suma || 50 }); gsStare.pornitLa = d.pornitLa; gsStare.tpAprox = d.tpAprox; gsStare.rez = null; gsStare.eroare = null;
  gsDeseneaza();
}
function gsDinCod() {
  gsCiteste(true);
  var t = gsEl("gsCod"), d = GridSim.dinCod(t ? t.value : gsStare.cod);
  gsStare.cod = t ? t.value : gsStare.cod; gsStare.rez = null; gsStare.eroare = null;
  if (d.eroare) { gsStare.codEroare = d.eroare; gsDeseneaza(); return; }
  gsStare.codEroare = null; gsStare.st = Object.assign({}, d.st, { suma: d.st.suma || gsStare.st.suma || 50, tip: d.st.tip || gsStare.st.tip || "geometric" });
  if (d.plan) gsStare.plan = { minus: d.plan.minus || null, plus: d.plan.plus || null };
  if (d.pornitLa) gsStare.pornitLa = d.pornitLa;
  gsStare.tpAprox = d.tpAprox;
  var s = gsEl("gsSim"); if (s && s.value) gsStare.sim = mcsCurata(s.value);
  gsDeseneaza();
}
function gsDirectie(d) {
  gsCiteste(true);
  gsStare.st = gsDirectieSt(gsStare.st, d === "short" ? "short" : d === "neutru" ? "neutru" : "long"); gsStare.rez = null;
  gsDeseneaza();
}
// citește câmpurile în stare; întoarce textul erorii (sau null); bland = fără erori, doar ce se poate citi
function gsCiteste(bland) {
  var n = function (id) { return mcsNumar(id); }, st = Object.assign({}, gsStare.st), er = null;
  // revizia (R6): un câmp golit sau cu altceva decât un număr NU păstrează pe ascuns valoarea veche - eroare pe nume (în modul strict)
  var brut = function (id) { var el = gsEl(id); return el ? String(el.value || "").trim() : null; }, NUMEC = { gsJos: "Jos", gsSus: "Sus", gsLinii: "Linii", gsLev: "Levier", gsSuma: "Suma", gsStop: "Stop", gsTp: "TP", gsPlanMinus: "Planul: ies la", gsPlanPlus: "Planul: încasez la", gsFunding: "Funding pe zi" };
  if (!bland) for (var id in NUMEC) { var v = brut(id); if (v === null) continue; var obl = /^gs(Jos|Sus|Linii|Lev|Suma)$/.test(id); if (v === "" && obl) { er = er || "Câmpul „" + NUMEC[id] + "” e gol."; } else if (v !== "" && !isFinite(Number(v.replace(",", ".")))) er = er || "„" + NUMEC[id] + "”: „" + v + "” nu e un număr."; }
  var sim = gsEl("gsSim"); if (sim) gsStare.sim = mcsCurata(sim.value);
  var dirEl = gsEl("gsDir"), dir = dirEl ? dirEl.value : st.dir; st.dir = dir === "short" || dir === "neutru" ? dir : "long";
  var jos = n("gsJos"), sus = n("gsSus"), linii = n("gsLinii"), lev = n("gsLev"), stop = n("gsStop"), tp = st.dir === "neutru" ? null : n("gsTp"), suma = n("gsSuma"), tipEl = gsEl("gsTip");
  if (jos > 0) st.jos = jos; if (sus > 0) st.sus = sus; if (linii >= 3) st.grile = Math.round(linii) - 1; if (lev >= 1) st.levier = Math.round(lev); if (suma > 0) st.suma = suma; if (tipEl) st.tip = tipEl.value === "aritmetic" ? "aritmetic" : "geometric";
  var ref = gsStare.pret > 0 ? gsStare.pret : (st.jos + st.sus) / 2;   // revizia (R1): la neutru partea stopului după PREȚ, nu după mijlocul gridului
  if (gsEl("gsStop")) st.stop = stop > 0 ? (st.dir === "short" ? { sus: stop } : st.dir === "neutru" ? (stop < ref ? { jos: stop } : { sus: stop }) : { jos: stop }) : null;
  if (gsEl("gsTp")) st.tp = tp > 0 ? tp : null;
  var pm = n("gsPlanMinus"), pp = n("gsPlanPlus"); if (gsEl("gsPlanMinus")) gsStare.plan = { minus: pm > 0 ? pm : null, plus: pp > 0 ? pp : null };
  // v100.135: cu semn; schimbat de mână (față de ce se afișează - revizia R1) ⇒ rămâne al lui; golit ⇒ înapoi la rata reală a monedei
  var fz = n("gsFunding"), fEl = gsEl("gsFunding");
  if (fEl) { if (String(fEl.value || "").trim() === "") { gsStare.fundingZi = 0.0003; gsStare.fundingSursa = null; gsStare.fundingSim = null; gsStare.fundingInfo = null; } else if (fz !== null && gsFundingManual(fz, gsStare.fundingZi)) { gsStare.fundingSursa = "manual"; gsStare.fundingZi = fz / 100; } }
  if (!bland && !er) {
    if (!gsStare.sim) er = "Scrie moneda (ca pe Pionex, ex. PONS).";
    else if (!(st.jos > 0) || !(st.sus > st.jos)) er = "Sus trebuie să fie peste jos, amândouă peste zero.";
    else if (!(linii >= 3) || linii > 151) er = "Liniile: între 3 și 151, ca în Pionex.";
    else if (!(st.levier >= 1)) er = "Levierul: cel puțin 1.";
    else if (!(st.suma > 0)) er = "Suma: peste zero (USDT).";
  }
  gsStare.st = st;
  return er;
}
async function gsSimuleaza() {
  if (gsStare.inLucru) return;
  var er = gsCiteste(false); if (er) { gsStare.eroare = er; gsStare.rez = null; gsDeseneaza(); return; }
  gsStare.inLucru = true; gsStare.eroare = null; gsStare.rez = null;
  gsStare.variante = null; gsStare.varianteEroare = null; gsStare.tinteBot = null; gsStare.tinteBotEroare = null;   // v100.135: altă simulare ⇒ comparațiile de la capăt
  gsDeseneaza();
  try {
    var sim = gsStare.sim;
    if (gsStare.fundingSursa !== "manual" && gsStare.fundingSim !== sim) await gsAduFunding(sim);   // v100.135: rata reală a monedei, o dată
    if (!gsStare.date || gsStare.date.sim !== sim || Date.now() - gsStare.dateLa > 5 * 60000) {
      var c = await mcsAduCoin(sim);
      if (!c || !c.b15.length) throw new Error("Nu găsesc „" + sim + "” pe Pionex (" + sim + "_USDT_PERP). Scrie moneda cum e pe Pionex.");
      gsStare.date = { sim: sim, b15: c.b15 }; gsStare.dateLa = Date.now(); gsStare.pret = c.b15[c.b15.length - 1].c;
    }
    await new Promise(function (r) { setTimeout(r, 30); });   // „calculez…” apare înainte de calcul
    var st = Object.assign({}, gsStare.st, { fundingZi: gsStare.fundingZi, fundingCost: gsStare.fundingSursa !== "pionex" && gsStare.fundingSursa !== "manual" });   // revizia (R4): rata presupusă = cost
    var rez = GridSim.simuleaza(gsStare.date.b15, st, { plan: gsPlanOk(gsStare.plan) ? gsStare.plan : null, pornitLa: gsStare.mod === "meu" ? gsStare.pornitLa : null, n: 500, seed: 12, orizonturi: GS_ORIZ, zile: 14 });
    if (rez.eroare) throw new Error(rez.eroare);
    gsStare.rez = rez;
  } catch (e) { gsStare.eroare = e && e.message || String(e); }
  finally { gsStare.inLucru = false; }
  gsDeseneaza();
  var dupa = gsStare.dupa; gsStare.dupa = null; if (typeof dupa === "function") dupa();   // revizia (R9): ce s-a cerut în timpul simulării
}
// v100.135: ratele de funding ale monedei (Pionex, ultimele ~16 zile) ⇒ rata pe zi din ultimele 7 zile; un eșec lasă costul fix (spus în notă)
async function gsAduFunding(sim) {
  var info = null;
  try { var r = await getJSON("/api/market?type=pionex_funding&symbol=" + encodeURIComponent(sim + "_USDT_PERP")); info = gsRataFunding(r && r.data && r.data.rates, Date.now()); } catch (e) {}
  if (info) { gsStare.fundingZi = info.rataZi; gsStare.fundingSursa = "pionex"; gsStare.fundingInfo = Object.assign({ sim: sim }, info); }
  else { gsStare.fundingZi = 0.0003; gsStare.fundingSursa = null; gsStare.fundingInfo = null; }   // revizia (R2): nu rămâne rata altei monede etichetată „reală”
  gsStare.fundingSim = sim;
}
// v100.135: „Compară variante” / „Compară ținte (TP)” (din Monte Carlo) pe setarea de aici, pe orizontul ales - la cerere (câteva secunde)
// revizia (R3): cu GridSim.compara (același motor și aceleași drumuri ca verdictul); (R8): doar pe moneda simulată
function gsStCuFunding() { return Object.assign({}, gsStare.st, { fundingZi: gsStare.fundingZi, fundingCost: gsStare.fundingSursa !== "pionex" && gsStare.fundingSursa !== "manual" }); }
function gsAltaMoneda() { return gsStare.date && gsStare.date.sim !== gsStare.sim ? "Ai schimbat moneda („" + gsStare.sim + "”): apasă Simulează întâi - comparațiile merg pe barele monedei simulate (" + gsStare.date.sim + ")." : null; }
function gsCompara() {
  var d = gsStare.date; if (!d || !gsStare.rez || gsStare.varianteInLucru) return;
  gsCiteste(true); var am = gsAltaMoneda(); if (am) { gsStare.varianteEroare = am; gsDeseneaza(); return; }
  gsStare.varianteInLucru = true; gsDeseneaza();
  var st = gsStCuFunding(), zile = GS_ORIZ[gsStare.oriz] || 7;
  setTimeout(function () {
    try { gsStare.variante = GridSim.compara(d.b15, mcsVariante(st), { n: 500, seed: 12, zile: 14, oriz: zile }); gsStare.varianteEroare = null; } catch (e) { gsStare.variante = null; gsStare.varianteEroare = "Variantele n-au mers: " + (e && e.message || e); }
    gsStare.varianteInLucru = false; gsDeseneaza();
  }, 30);
}
function gsComparaTp() {
  var d = gsStare.date; if (!d || !gsStare.rez || gsStare.tinteBotInLucru) return;
  gsCiteste(true); var am = gsAltaMoneda(); if (am) { gsStare.tinteBotEroare = am; gsDeseneaza(); return; }
  gsStare.tinteBotInLucru = true; gsDeseneaza();
  var P = gsStare.pret, st = GridSim.tpValid(gsStCuFunding(), P).st, zile = GS_ORIZ[gsStare.oriz] || 7;
  var lista = mcsTinteBot(st, P).map(function (x) { return { nume: x.nume, tp: x.tp, tu: x.tu, st: Object.assign({}, st, { tp: x.tp }) }; });
  setTimeout(function () {
    try { gsStare.tinteBot = GridSim.compara(d.b15, lista, { n: 500, seed: 12, zile: 14, oriz: zile }); gsStare.tinteBotEroare = null; } catch (e) { gsStare.tinteBot = null; gsStare.tinteBotEroare = "Țintele n-au mers: " + (e && e.message || e); }
    gsStare.tinteBotInLucru = false; gsDeseneaza();
  }, 30);
}
// v100.135: din Tablou („⚄ Simulează”): pagina pe botul ales acolo - dacă e activ, ca „Botul meu”; altfel (oprit) ca bot nou cu setările lui
function gsDeschideBot() {
  var b = typeof tbStare !== "undefined" && tbStare.bot; if (!b || !b.id) return;
  if (typeof navTo === "function") navTo("gridsim", true);
  if (gsStare.inLucru) { gsStare.dupa = gsDeschideBot; return; }   // revizia (R9): după simularea în lucru
  var l = gsBoti(), k = -1; for (var i = 0; i < l.length; i++) if (String(l[i].id) === String(b.id)) k = i;
  if (k >= 0) { gsStare.mod = "meu"; gsAlegeBot(k); }
  else { var d = GridSim.setariDinBot(b); gsStare.mod = "nou"; gsStare.bot = null; gsStare.botId = null; gsStare.pornitLa = null; gsStare.sim = mcsSimbolBot(b); gsStare.st = Object.assign({}, d.st, { suma: d.st.suma || 50 }); gsStare.tpAprox = d.tpAprox; gsStare.rez = null; gsDeseneaza(); }
  gsSimuleaza();
}
function gsOriz(i) { gsCiteste(true); gsStare.oriz = Number(i) >= 0 && Number(i) < GS_ORIZ.length ? Number(i) : 2; gsDeseneaza(); }
// revizia (R5): codul copiat = câmpurile de ACUM (nu setarea de la ultima simulare)
function gsCopiazaCod() {
  gsCiteste(true);
  var st = gsStare.st; if (!(st.jos > 0 && st.sus > st.jos)) return;
  var cod = GridSim.inCod(st, gsPlanOk(gsStare.plan) ? gsStare.plan : null), c = gsEl("gsCodOut"); if (c) c.textContent = cod;
  try { navigator.clipboard.writeText(cod); } catch (e) {}
}
// Enter în orice câmp al setării (nu în codul lipit) = Simulează
function gsTasta(e) {
  if (!e || e.key !== "Enter" || !e.target || !gsEl("gsPagina")) return;
  var id = e.target.id || "";
  if (/^gs(Sim|Jos|Sus|Linii|Lev|Stop|Tp|Suma|PlanMinus|PlanPlus|Funding)$/.test(id)) { e.preventDefault(); gsSimuleaza(); }
}
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", gsTasta);
