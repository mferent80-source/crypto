// v100.134 (el 07.10: „să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig”, spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): pagina „Simulator grid” (#gridsim / #gsPagina). Desenul e HTML pur
// (gsFormHtml, gsVerdictHtml, gsDurateHtml, gsRiscuriHtml, gsBotulMeuHtml, gsHtml - probate în vm, fără DOM); legătura cu pagina
// (gsPorneste, gsMod, gsAlegeBot, gsDinCod, gsDirectie, gsSimuleaza, gsOriz, gsCopiazaCod, Enter) e la coadă. Calculul: GridSim (pur).
// Refolosește din pagina Monte Carlo: mcsAduCoin (barele 15M Pionex, 6 pagini cu pauze), mcsBoti / mcsSimbolBot, mcsHist, mcsEsc, mcsPretTxt.
var gsStare = { mod: "nou", botIdx: 0, boti: [], sim: "", st: { jos: null, sus: null, grile: 20, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: 0.0003, pornitLa: null, tpAprox: false, bot: null, rez: null, oriz: 2, inLucru: false, eroare: null, cod: "", codEroare: null, pret: null, date: null, dateLa: 0 };
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
function gsFundingTxt(v) { return v < 0.05 ? "sub 0,1 USDT" : "≈ " + gsNr(v, 1) + " USDT"; }

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
    + '<label>Funding pe zi, % ' + inp("gsFunding", s.fundingZi > 0 ? +(s.fundingZi * 100).toFixed(4) : 0) + '</label>'
    + (meu ? '<label>Pornit la <input id="gsPornit" readonly value="' + mcsEsc(gsData(s.pornitLa)) + '"></label>' : '')
    + '<button type="button" class="t212Btn t212BtnPlin" data-action-click="gsSimuleaza()">Simulează</button></div>';
  if (s.tpAprox && st.tp > 0) h += '<p class="tbSub gsNota">TP-ul tău e în procente din investiție: prețul de aici e cel socotit de Pionex pentru botul care rulează; e aproximativ.</p>';
  if (st.jos > 0 && st.sus > st.jos) h += '<p class="tbSub gsCodOut">Codul pentru TradingView: <code id="gsCodOut">' + mcsEsc(GridSim.inCod(st, gsPlanOk(s.plan) ? s.plan : null)) + '</code> <button type="button" class="t212BtnLinie" data-action-click="gsCopiazaCod()">Copiază</button></p>';
  return '<section class="t212Panou gsSec gsSetare"><div class="t212PanouCap"><h4>⚙️ Setarea</h4><span class="tbSub">ca în GRID-FISA: lipești codul sau completezi câmpurile; liniile sunt ca în Pionex</span></div>' + h + '</section>';
}
function gsVerdictHtml(s) {
  var r = s.rez, i = r.orizonturi[s.oriz] ? s.oriz : 2, o = r.orizonturi[i], v = GridSim.verdict(r, s.st, gsPlanOk(s.plan) ? s.plan : null, i, s.bot);
  if (!o || !v) return "";
  // eticheta „mijloc” doar când nu se suprapune cu 5% / 95% (cifra e oricum în rândul de sub verdict)
  var lat = o.hist && o.hist.hi > o.hist.lo ? o.hist.hi - o.hist.lo : 0, aproape = lat > 0 && (o.p50 - o.p5 < 0.14 * lat || o.p95 - o.p50 < 0.14 * lat);
  var mk = [{ v: o.p5, t: "5%", c: "bad" }].concat(aproape ? [] : [{ v: o.p50, t: "mijloc", c: "mijl" }]).concat([{ v: o.p95, t: "95%", c: "good" }]);
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>VERDICT, pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4><span class="tbSub">' + mcsEsc(gsCate(r.n, "drum", "drumuri") + " de " + gsCate(r.zile, "zi", "zile") + " pe 15 minute, din " + gsCate(r.zileIstoric, "zi", "zile") + " de istoric · " + (r.acum ? "de la pornirea botului tău" : "botul pornit la prețul de acum")) + '</span></div>'
    + (o.scurt ? '<p class="mcsAvert gsNota">Istoricul e scurt față de orizont: la ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ' simularea doar reamestecă aceleași zile. Citește cifrele ca o schiță.</p>' : '')
    + '<div class="gsVerdict ' + v.culoare + '"><b>' + mcsEsc(v.rand) + '</b><span class="t212Mic">' + mcsEsc(v.marja) + '</span></div>'
    + '<p class="gsSub">' + mcsEsc(v.sub) + '</p>'
    + '<div class="gsHist">' + mcsHist(o.hist, mk, function (x) { return GridSim.bani1(x); }) + '</div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(v.faCe) + '</p>'
    + '<p class="tbSub gsNota">' + mcsEsc(v.nota) + '</p></section>';
}
function gsDurateHtml(s) {
  var r = s.rez, ales = r.orizonturi[s.oriz] ? s.oriz : 2, plan = gsPlanOk(s.plan) ? s.plan : null, areTp = s.st && s.st.tp > 0, areStop = !!(s.st && s.st.stop);
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>📅 Pe durate</h4><span class="tbSub">aceleași drumuri, citite la 1, 3, 7 și 14 zile · apasă un rând ca să-l pui în verdict</span></div>'
    + '<div class="rlTab"><table class="t212Tab gsDurate"><thead><tr><th>Zile</th><th>Câștigă</th><th>De obicei</th><th>5% sub</th><th>5% peste</th><th>' + mcsEsc(gsPlanTxt(plan)) + '</th><th>În</th><th>Lichidare</th><th>Stop</th><th>TP</th></tr></thead><tbody>'
    + r.orizonturi.map(function (o, i) {
      var pl = plan && o.plan;
      return '<tr class="gsRand' + (i === ales ? ' gsRandAles' : '') + '" aria-selected="' + (i === ales) + '" data-action-click="gsOriz(' + i + ')">' + gsTd(gsCate(o.zile, "zi", "zile")) + gsTd(GridSim.pr(o.pCastig), gsClsP(o.pCastig)) + gsTd(GridSim.bani1(o.p50), gsCls(Math.round(o.p50 * 10) / 10)) + gsTd(GridSim.bani1(o.p5)) + gsTd(GridSim.bani1(o.p95))
        + gsTd(pl ? GridSim.pr(o.plan.p) : "—") + gsTd(pl && o.plan.zileMediana !== null ? gsZileTxt(o.plan.zileMediana) : "—") + gsTd(GridSim.pr(o.pLich), o.pLich > 0.02 ? "bad" : "") + gsTd(areStop ? GridSim.pr(o.pStop) : "—", areStop && o.pStop > 0.5 ? "bad" : "") + gsTd(areTp ? GridSim.pr(o.pTp) : "—") + '</tr>';
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
    + gsRand("pierderea maximă pe drum", GridSim.bani1(o.maxJos.p50) + " de obicei · " + GridSim.bani1(o.maxJos.p5) + " în cele mai proaste 5%", "bad")
    + gsRand("funding plătit, în medie", gsFundingTxt(o.funding));
  if (s.mod === "meu" && s.bot && typeof TabloExtra !== "undefined" && TabloExtra.dacaInchizi) { var z = TabloExtra.dacaInchizi(s.bot); if (z && z.pretZero > 0) h += gsRand("prețul de zero (botul tău, acum)", mcsPretTxt(z.pretZero) + (z.distantaZeroPct !== null ? " (" + mcsPct1(z.distantaZeroPct) + " de aici)" : "")); }
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>⚠️ Riscurile pe nume, pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4></div><div class="gsRiscuri">' + h + '</div></section>';
}
function gsBotulMeuHtml(s) {
  var r = s.rez, a = r.acum; if (!a) return "";
  var o = r.orizonturi[s.oriz] || r.orizonturi[2], b = s.bot || {}, pn = b.profitNet, plan = gsPlanOk(s.plan) ? s.plan : null;
  var h = '<p class="gsNota">reluat pe barele reale de la ' + mcsEsc(gsData(s.pornitLa)) + ' până la ' + mcsEsc(gsData(a.t)) + ': <b>' + mcsEsc(GridSim.bani1(a.usdt)) + '</b> estimat' + (pn !== null && pn !== undefined && isFinite(pn) ? '; Pionex spune <b>' + mcsEsc(GridSim.bani1(pn)) + '</b>' : '') + ' (umplerile sunt estimate pe bare, nu pe ordinele reale)'
    + ' · ' + mcsEsc(gsCate(a.perechi, "grilă încasată", "grile încasate")) + (isFinite(b.pozitie) && b.pozitie ? ' · poziția ' + mcsEsc(gsNr(Math.abs(b.pozitie), 0) + " " + (s.sim || "")) : '') + (a.oprit ? ' · <b class="bad">botul ar fi fost ' + (a.oprit === "lichidat" ? "lichidat" : "oprit") + ' pe drumul real</b>' : '') + '</p>';
  if (o.plan && o.plan.dejaAtins && plan) h += '<p class="t212Fac">planul tău (' + (o.plan.dejaAtins === "plus" ? "+" + gsNr(plan.plus, 1) + ") e deja atins: încasează" : "−" + gsNr(plan.minus, 1) + ") e deja atins: ieși") + ', cum ți-ai propus.</p>';
  if (o.deAici) h += '<p class="gsNota">de aici încolo, în ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ': câștigă în ' + mcsEsc(GridSim.pr(o.deAici.pCastig)) + ' din drumuri, de obicei ' + mcsEsc(GridSim.bani1(o.deAici.p50)) + ' (5% sub ' + mcsEsc(gsSemn1(o.deAici.p5)) + ', 5% peste ' + mcsEsc(gsSemn1(o.deAici.p95)) + ').</p>';
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>🤖 Botul meu, de la pornire</h4><span class="tbSub">Pionex nu dă ce ține botul pe fiecare grilă: e reluarea, nu starea reală</span></div>' + h + '</section>';
}
function gsSemn1(v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + gsNr(Math.abs(Math.round(v * 10) / 10), 1); }
function gsHtml(s) {
  s = s || gsStare;
  var vechime = s.dateLa > 0 ? Math.round((Date.now() - s.dateLa) / 60000) : null;
  var h = '<div class="mcsCap"><h4>🎰 Simulator grid</h4><span class="tbSub">' + mcsEsc((s.sim ? s.sim + (s.pret > 0 ? " · " + mcsPretTxt(s.pret) : "") : "un bot grid Pionex") + (vechime !== null ? " · date de acum " + gsCate(vechime, "minut", "minute") : "")) + '</span></div>' + gsFormHtml(s);
  if (s.inLucru) return h + '<p class="tbSub gsNota">calculez: aduc barele de 15 minute (Pionex le dă pe bucăți: ~20 de secunde la prima analiză a monedei) și rulez botul pe 500 de drumuri de 14 zile (sub o secundă)…</p>';
  if (s.eroare) return h + '<p class="tbWarn gsNota">' + mcsEsc(s.eroare) + '</p>';
  if (!s.rez) return h + '<p class="tbSub gsNota">Lipește codul din Tablou sau completează setarea, apoi apasă „Simulează”: câștigă sau pierde, cât de des, cât, planul tău, pe 1 / 3 / 7 / 14 zile.</p>';
  return h + (s.rez.tpIgnorat > 0 ? '<p class="tbWarn gsNota">' + mcsEsc("TP-ul (" + mcsPretTxt(s.rez.tpIgnorat) + ") e de partea greșită a prețului pentru " + s.st.dir + ": nu l-am pus în simulare. La long, TP-ul e deasupra prețului de acum; la short, dedesubt.") + '</p>' : '')
    + gsVerdictHtml(s) + gsDurateHtml(s) + gsRiscuriHtml(s) + gsBotulMeuHtml(s)
    + '<p class="mcsAvert">Trecutul reluat de ' + mcsEsc(gsCate(s.rez.n, "dată", "ori")) + ', nu o predicție: drumurile sunt zile reale ale monedei lipite la întâmplare, fără tendința perioadei; o criză mai rea decât orice a avut nu apare în ele. Aceeași cifră la aceeași dată (sămânță fixă).</p>';
}

// ---------------- în pagină ----------------
function gsEl(id) { return typeof document !== "undefined" ? document.getElementById(id) : null; }
function gsBoti() { return mcsBoti().filter(function (b) { return b && b.activ && b.gridJos > 0 && b.gridSus > b.gridJos; }); }
function gsEticheta(b) { var d = GridSim.setariDinBot(b).st; return mcsSimbolBot(b) + " · " + d.dir + " " + d.levier + "× · " + mcsPretTxt(d.jos) + "–" + mcsPretTxt(d.sus) + " · " + gsNr(d.suma || 0, 2) + " USDT"; }
function gsDeseneaza() { var el = gsEl("gsPagina"); if (!el) return; gsStare.boti = gsBoti().map(gsEticheta); el.innerHTML = gsHtml(gsStare); }
function gsPorneste() {
  if (gsStare.mod === "meu" && !gsStare.bot && gsBoti().length) { gsAlegeBot(0); return; }
  gsDeseneaza();
}
function gsMod(m) {
  gsStare.mod = m === "meu" ? "meu" : "nou"; gsStare.rez = null; gsStare.eroare = null;
  if (gsStare.mod === "meu" && gsBoti().length) { gsAlegeBot(gsStare.botIdx || 0); return; }
  gsDeseneaza();
}
function gsAlegeBot(i) {
  var l = gsBoti(), b = l[Number(i) >= 0 && Number(i) < l.length ? Number(i) : 0]; if (!b) { gsDeseneaza(); return; }
  var d = GridSim.setariDinBot(b);
  gsStare.botIdx = l.indexOf(b); gsStare.bot = b; gsStare.sim = mcsSimbolBot(b); gsStare.st = Object.assign({}, d.st, { suma: d.st.suma || 50 }); gsStare.pornitLa = d.pornitLa; gsStare.tpAprox = d.tpAprox; gsStare.rez = null; gsStare.eroare = null;
  gsDeseneaza();
}
function gsDinCod() {
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
  var er = gsCiteste(true); if (er) { /* câmpurile încă neterminate: schimb doar direcția */ }
  gsStare.st = gsDirectieSt(gsStare.st, d === "short" ? "short" : d === "neutru" ? "neutru" : "long"); gsStare.rez = null;
  gsDeseneaza();
}
// citește câmpurile în stare; întoarce textul erorii (sau null); bland = fără erori, doar ce se poate citi
function gsCiteste(bland) {
  var n = function (id) { return mcsNumar(id); }, st = Object.assign({}, gsStare.st), er = null;
  var sim = gsEl("gsSim"); if (sim) gsStare.sim = mcsCurata(sim.value);
  var dirEl = gsEl("gsDir"), dir = dirEl ? dirEl.value : st.dir; st.dir = dir === "short" || dir === "neutru" ? dir : "long";
  var jos = n("gsJos"), sus = n("gsSus"), linii = n("gsLinii"), lev = n("gsLev"), stop = n("gsStop"), tp = st.dir === "neutru" ? null : n("gsTp"), suma = n("gsSuma"), tipEl = gsEl("gsTip");
  if (jos > 0) st.jos = jos; if (sus > 0) st.sus = sus; if (linii >= 3) st.grile = Math.round(linii) - 1; if (lev >= 1) st.levier = Math.round(lev); if (suma > 0) st.suma = suma; if (tipEl) st.tip = tipEl.value === "aritmetic" ? "aritmetic" : "geometric";
  if (gsEl("gsStop")) st.stop = stop > 0 ? (st.dir === "short" ? { sus: stop } : st.dir === "neutru" ? (stop < (st.jos + st.sus) / 2 ? { jos: stop } : { sus: stop }) : { jos: stop }) : null;
  if (gsEl("gsTp")) st.tp = tp > 0 ? tp : null;
  var pm = n("gsPlanMinus"), pp = n("gsPlanPlus"); if (gsEl("gsPlanMinus")) gsStare.plan = { minus: pm > 0 ? pm : null, plus: pp > 0 ? pp : null };
  var fz = n("gsFunding"); if (gsEl("gsFunding")) gsStare.fundingZi = fz >= 0 ? fz / 100 : 0;
  if (!bland) {
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
  gsStare.inLucru = true; gsStare.eroare = null; gsStare.rez = null; gsDeseneaza();
  try {
    var sim = gsStare.sim;
    if (!gsStare.date || gsStare.date.sim !== sim || Date.now() - gsStare.dateLa > 5 * 60000) {
      var c = await mcsAduCoin(sim);
      if (!c || !c.b15.length) throw new Error("Nu găsesc „" + sim + "” pe Pionex (" + sim + "_USDT_PERP). Scrie moneda cum e pe Pionex.");
      gsStare.date = { sim: sim, b15: c.b15 }; gsStare.dateLa = Date.now(); gsStare.pret = c.b15[c.b15.length - 1].c;
    }
    await new Promise(function (r) { setTimeout(r, 30); });   // „calculez…” apare înainte de calcul
    var st = Object.assign({}, gsStare.st, { fundingZi: gsStare.fundingZi });
    var rez = GridSim.simuleaza(gsStare.date.b15, st, { plan: gsPlanOk(gsStare.plan) ? gsStare.plan : null, pornitLa: gsStare.mod === "meu" ? gsStare.pornitLa : null, n: 500, seed: 12, orizonturi: GS_ORIZ, zile: 14 });
    if (rez.eroare) throw new Error(rez.eroare);
    gsStare.rez = rez;
  } catch (e) { gsStare.eroare = e && e.message || String(e); }
  finally { gsStare.inLucru = false; }
  gsDeseneaza();
}
function gsOriz(i) { gsStare.oriz = Number(i) >= 0 && Number(i) < GS_ORIZ.length ? Number(i) : 2; gsDeseneaza(); }
function gsCopiazaCod() {
  var c = gsEl("gsCodOut"); if (!c) return;
  try { navigator.clipboard.writeText(c.textContent); } catch (e) {}
}
// Enter în orice câmp al setării (nu în codul lipit) = Simulează
function gsTasta(e) {
  if (!e || e.key !== "Enter" || !e.target || !gsEl("gsPagina")) return;
  var id = e.target.id || "";
  if (/^gs(Sim|Jos|Sus|Linii|Lev|Stop|Tp|Suma|PlanMinus|PlanPlus|Funding)$/.test(id)) { e.preventDefault(); gsSimuleaza(); }
}
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", gsTasta);
