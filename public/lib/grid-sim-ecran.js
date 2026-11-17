// v100.134 (el 07.10: „să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig”, spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): pagina „Simulator grid” (#gridsim / #gsPagina). Desenul e HTML pur
// (gsFormHtml, gsVerdictHtml, gsDurateHtml, gsRiscuriHtml, gsBotulMeuHtml, gsHtml - probate în vm, fără DOM); legătura cu pagina
// (gsPorneste, gsMod, gsAlegeBot, gsDinCod, gsDirectie, gsSimuleaza, gsOriz, gsCopiazaCod, Enter) e la coadă. Calculul: GridSim (pur).
// Refolosește din pagina Monte Carlo: mcsAduCoin (barele 15M Pionex, 6 pagini cu pauze), mcsBoti / mcsSimbolBot, mcsHist, mcsEsc, mcsPretTxt.
var gsStare = { mod: "nou", botIdx: 0, boti: [], sim: "", st: { jos: null, sus: null, grile: 20, levier: 2, dir: "long", suma: 50, stop: null, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: 0.0003, pornitLa: null, tpAprox: false, bot: null, rez: null, oriz: 2, inLucru: false, eroare: null, cod: "", codEroare: null, pret: null, date: null, dateLa: 0,
  variante: null, varianteInLucru: false, varianteEroare: null, tinteBot: null, tinteBotInLucru: false, tinteBotEroare: null,   // v100.135: alte setări pe aceleași drumuri
  fundingSursa: null, fundingInfo: null, fundingSim: null, dupa: null,
  varianteZile: null, tinteBotZile: null, varianteToate: null, tinteBotToate: null };   // v100.136: orizontul citit + toate orizonturile calculate (revizia I5)   // dupa (revizia R9): ce s-a cerut în timpul unei simulări   // v100.135: funding-ul real Pionex (null = cost fix presupus, "pionex", "manual")
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
// v100.140: socoteala stă în motorul pur (GridSim.rataFunding) - o folosesc la fel Simulatorul, Monte Carlo, Tabloul și colectorul
function gsRataFunding(rates, acum) { return GridSim.rataFunding(rates, acum); }
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
// v100.350 (el, 16.11: „da fă și continuă la fel cu simulator grid” ⇒ „ca paginile refăcute”): sus fraza mare (cum se termină drumurile + media,
// eticheta verdictului, 1 / 3 / 7 / 14 zile ca butoane, «Ce aș face eu», „De unde știu”), apoi histograma, riscurile; Setarea, „Pe durate”,
// „Botul meu” și „Alte setări” pliate; pe ecran lat lista boților alături. Nimic scos: inventarul de pe viu (16.11) e în proba-v100350.
// câmpurile de preț: rotunjite după pasul gridului, cu virgulă (era „1.523041822505364”); citirea păstrează valoarea exactă cât timp textul e neschimbat
function gsZecPret(st) { var p = st && st.sus > st.jos && st.grile > 0 ? (st.sus - st.jos) / st.grile : null; return p > 0 ? Math.max(2, Math.min(10, Math.ceil(-Math.log10(p)) + 1)) : 6; }
function gsCampNr(v, z) { if (v === null || v === undefined || !isFinite(v)) return ""; var s = Number(v).toFixed(z); if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, ""); return s.replace(".", ","); }
function gsCampPret(v, st) { return gsCampNr(v, gsZecPret(st)); }
function gsRezumatSetare(s) {
  var st = s.st || {}; if (!(st.jos > 0 && st.sus > st.jos)) return "completează setarea";
  return (s.sim ? s.sim + " " : "") + st.dir + " " + st.levier + "× · " + gsCampPret(st.jos, st) + "–" + gsCampPret(st.sus, st) + " · " + gsCate((st.grile || 0) + 1, "linie", "linii") + " · " + gsNr(st.suma || 0, 1) + " USDT";
}
function gsAlegeriHtml(s) {
  var meu = s.mod === "meu";
  var h = '<div class="gsMod" role="group" aria-label="ce simulez"><button type="button" class="tbIntBtn" aria-pressed="' + !meu + '" data-action-click="gsMod(\'nou\')">Bot nou</button><button type="button" class="tbIntBtn" aria-pressed="' + meu + '" data-action-click="gsMod(\'meu\')">Botul meu care rulează</button></div>';
  if (meu) h += s.boti && s.boti.length ? '<label class="tbSub gsBotAles">botul: <select id="gsBot" data-action-change="gsAlegeBot(this.value)">' + s.boti.map(function (t, i) { return '<option value="' + i + '"' + (i === (s.botIdx || 0) ? ' selected' : '') + '>' + mcsEsc(t) + '</option>'; }).join("") + '</select></label>'
    : '<p class="tbSub gsNota">n-ai niciun bot activ în Pionex acum (sau Tabloul nu i-a citit încă): simulează un bot nou sau lipește codul din fișă.</p>';
  return '<div class="gsAlegeri">' + h + '</div>';
}
// ecran lat: lista boților alături (Bot nou + fiecare bot activ); un clic alege botul și simulează
function gsListaHtml(s) {
  var meu = s.mod === "meu", l = s.boti || [];
  return '<aside class="gsLista" aria-label="boții tăi"><h5>Ce simulez</h5><button type="button" class="gsListaBtn" aria-pressed="' + !meu + '" data-action-click="gsMod(\'nou\')">＋ Bot nou</button>'
    + (l.length ? l.map(function (t, i) { return '<button type="button" class="gsListaBtn" aria-pressed="' + (meu && i === (s.botIdx || 0)) + '" value="' + i + '" data-action-click="gsLista(this.value)">' + mcsEsc(t) + '</button>'; }).join("") : '<p class="tbSub">n-ai niciun bot activ în Pionex acum</p>') + '</aside>';
}
function gsFormHtml(s) {
  var st = s.st || {}, neutru = st.dir === "neutru", meu = s.mod === "meu", stopV = st.stop ? (st.stop.sus || st.stop.jos) : null;
  var inp = function (id, v, extra) { return '<input id="' + id + '" inputmode="decimal" autocomplete="off"' + (extra || "") + ' value="' + mcsEsc(v) + '">'; }, pr = function (v) { return gsCampPret(v, st); };
  var h = '<div class="gsCod"><label class="gsCodL">Codul din fișă <textarea id="gsCod" rows="2" placeholder="rândul copiat din Tablou („Copiază codul”) sau din fișa Grid („Pentru TradingView”)">' + mcsEsc(s.cod || "") + '</textarea></label><button type="button" class="t212BtnLinie" data-action-click="gsDinCod()">Ia din cod</button></div>'
    + (s.codEroare ? '<p class="tbWarn gsNota">' + mcsEsc(s.codEroare) + '</p>' : '');
  h += '<div class="gsCampuri"><label>Moneda <input id="gsSim" autocomplete="off" placeholder="ex. PONS" value="' + mcsEsc(s.sim || "") + '"' + (meu ? ' readonly' : '') + '></label>'
    + '<label>Direcția <select id="gsDir" data-action-change="gsDirectie(this.value)">' + ["long", "short", "neutru"].map(function (d) { return '<option value="' + d + '"' + (st.dir === d ? ' selected' : '') + '>' + d + '</option>'; }).join("") + '</select></label>'
    + '<label>Jos ' + inp("gsJos", pr(st.jos)) + '</label><label>Sus ' + inp("gsSus", pr(st.sus)) + '</label>'
    + '<label>Linii (ca în Pionex) ' + inp("gsLinii", st.grile > 0 ? String(st.grile + 1) : "", ' inputmode="numeric"') + '<span class="t212Mic" id="gsInterv">= ' + mcsEsc(st.grile > 0 ? gsCate(st.grile, "interval", "intervale") : "—") + '</span></label>'
    + '<label>Levier ' + inp("gsLev", st.levier > 0 ? String(st.levier) : "", ' inputmode="numeric"') + '</label>'
    + '<label>Stop ' + inp("gsStop", pr(stopV), ' placeholder="fără"') + '</label>'
    + '<label>TP (take profit) ' + (neutru ? '<input id="gsTp" inputmode="decimal" placeholder="la neutru nu" value="" disabled>' : inp("gsTp", pr(st.tp), ' placeholder="fără"')) + '</label>'
    + '<label>Suma, USDT ' + inp("gsSuma", gsCampNr(st.suma, 2)) + '</label>'
    + '<label>Tip <select id="gsTip">' + ["geometric", "aritmetic"].map(function (t) { return '<option value="' + t + '"' + ((st.tip || "geometric") === t ? ' selected' : '') + '>' + t + '</option>'; }).join("") + '</select></label>'
    + '<label>Planul: ies la − ' + inp("gsPlanMinus", gsCampNr(s.plan && s.plan.minus, 2), ' placeholder="USDT"') + '</label><label>Încasez la + ' + inp("gsPlanPlus", gsCampNr(s.plan && s.plan.plus, 2), ' placeholder="USDT"') + '</label>'
    + '<label>Funding pe zi, % ' + inp("gsFunding", isFinite(s.fundingZi) ? gsCampNr(+(s.fundingZi * 100).toFixed(4), 4) : "0") + '</label>'
    + (meu ? '<label>Pornit la <input id="gsPornit" readonly value="' + mcsEsc(gsData(s.pornitLa)) + '"></label>' : '')
    + '<button type="button" class="t212Btn t212BtnPlin" data-action-click="gsSimuleaza()">Simulează</button></div>';
  // revizia (R2/R4/R7): moneda ratei, „veche” când Pionex n-are rate din ultimele 7 zile, cine plătește după SEMN; costul presupus e cost oricare ar fi direcția
  var fi = s.fundingInfo, semn = function (v) { return v < 0 ? "short plătește, long încasează" : "long plătește, short încasează"; };
  var fnot = s.fundingSursa === "pionex" && fi ? "funding-ul real Pionex (" + (fi.sim || s.sim) + "): " + gsPctF(fi.rataZi) + " pe zi (" + (fi.veche ? "rată veche, ultima de pe " + gsDataTxt(fi.ultimaLa) : "media ultimelor " + gsCate(fi.zile, "zi", "zile") + ", la " + gsNr(fi.intervalOre, fi.intervalOre % 1 ? 1 : 0) + " h") + ") · " + semn(fi.rataZi)
    : s.fundingSursa === "manual" ? "funding scris de tine · " + semn(s.fundingZi)
    : "funding: cost fix presupus (" + gsPctF(s.fundingZi || 0) + " pe zi, plătit oricare ar fi direcția) până la prima simulare, apoi rata reală Pionex a monedei";
  h += '<p class="tbSub gsNota">' + mcsEsc(fnot) + '</p>';
  if (s.tpAprox && st.tp > 0) h += '<p class="tbSub gsNota">TP-ul tău e în procente din investiție: prețul de aici e cel socotit de Pionex pentru botul care rulează; e aproximativ.</p>';
  if (st.jos > 0 && st.sus > st.jos) h += '<p class="tbSub gsCodOut">Codul pentru TradingView: <code id="gsCodOut">' + mcsEsc(GridSim.inCod(st, gsPlanOk(s.plan) ? s.plan : null)) + '</code> <button type="button" class="t212BtnLinie" data-action-click="gsCopiazaCod()">Copiază</button></p>';
  var deschis = !s.rez || !!s.eroare || !!s.codEroare;
  return '<details class="t212Panou gsSec gsSetare gsPli"' + (deschis ? ' open' : '') + '><summary><h4>⚙️ Setarea</h4><span class="tbSub">' + mcsEsc(gsRezumatSetare(s)) + '</span></summary><p class="tbSub gsNota">lipești codul din Tablou sau din fișa Grid ori completezi câmpurile; liniile se numără ca în Pionex</p>' + h + '</details>';
}
function gsCarte(v, r) {
  var fac = v && v.faCe || "";
  if (!r || r.acum || !/^Aș porni:/.test(fac)) return fac;
  var nc = null;
  try {
    if (typeof JurnalTrade !== "undefined" && typeof jtStare !== "undefined" && Array.isArray(jtStare.boti)) nc = JurnalTrade.rezumat(JurnalTrade.din(jtStare.boti));
  } catch (e) { nc = null; }
  var clauza = !nc ? ", iar cartea închisă încă nu e citită" : !nc.n ? ", iar cartea închisă n-are încă niciun bot" : ", iar cartea închisă e la net " + GridSim.bani1(nc.net) + " pe " + nc.n;
  return fac.replace(/\.\s*$/, clauza + ".");
}
function gsI(s) { var r = s.rez; return r && r.orizonturi[s.oriz] ? s.oriz : 2; }
function gsV(s, i) { var r = s.rez; return GridSim.verdict(r, s.st, gsPlanOk(s.plan) ? s.plan : null, i, s.bot); }
// sus: eticheta + cine / orizontul, fraza mare (cum se termină drumurile), media, 1 / 3 / 7 / 14 zile, «Ce aș face eu», „De unde știu”
function gsFrazaHtml(s) {
  var r = s.rez, i = gsI(s), o = r.orizonturi[i], v = gsV(s, i), st = s.st || {}; if (!o || !v) return "";
  var cine = (s.sim ? s.sim + " " : "") + st.dir + " " + st.levier + "× · " + gsCampPret(st.jos, st) + "–" + gsCampPret(st.sus, st);
  var pastile = r.orizonturi.map(function (x, k) { var vk = gsV(s, k); return '<button type="button" class="gsOrizBtn" aria-pressed="' + (k === i) + '" aria-label="' + mcsEsc(gsCate(x.zile, "zi", "zile") + ": " + (vk ? vk.eticheta.toLowerCase() : "")) + '" data-action-click="gsOriz(' + k + ')"><i class="gsPunct ' + (vk ? vk.culoare : "") + '"></i>' + mcsEsc(gsCate(x.zile, "zi", "zile")) + '</button>'; }).join("");
  var surse = ["drumurile: " + gsCate(r.n, "drum", "drumuri") + " de " + gsCate(r.zile, "zi", "zile") + ", din bare de 15 minute, lipite din " + gsCate(r.zileIstoric, "zi", "zile") + " de istoric al monedei, fără tendința perioadei" + (r.acum ? "; botul tău e reluat pe barele reale de la pornire, apoi continuă pe drumuri" + (r.pozitie && r.pozitie.potrivit ? ", din poziția Pionex" : "") : "; botul pornit la prețul de acum"),
    "câștigă / pierde: " + v.rand + " · " + v.marja + ": fiecare zi distinctă din istoric e o observație, fără partea pe care drumurile o scot oricum (tendința)",
    (v.mediaTxt ? v.mediaTxt + ": media tuturor drumurilor; intervalul e tot pe zile. «Aș porni / Aș ține» cere ca și marginea lui de jos să fie peste 0 - un grid câștigă des puțin și pierde rar mult" : "media: —"),
    v.nota, "Trecutul reluat de " + gsCate(r.n, "dată", "ori") + ", nu o predicție: o criză mai rea decât orice a avut moneda nu apare în drumuri. Aceeași cifră la aceeași dată (sămânță fixă)."];
  if (r.agitatie) surse.splice(1, 0, "agitația de acum: ultimele 2 zile sunt de " + gsNr(r.agitatie, 2).replace(/,?0+$/, "") + " ori cât media lunii (în pătrate de mișcare)" + (r.agitatie > 1.05 ? ", deci drumurile sunt mai largi" : r.agitatie < 0.95 ? ", deci drumurile sunt mai strânse" : "") + "; diferența se stinge cu 10% pe zi spre agitația obișnuită (probat: unde agitația ține, eroarea mediei scade cu un sfert și „pe plus” fals dispare; unde nu ține, nu strică)");   /* v100.351 (ideea 1) */
  if (!r.acum) { gsSimUrmAdu(); surse.push("📒 " + (gsSimUrm.v && gsSimUrm.v.text ? gsSimUrm.v.text : "fiecare verdict de bot nou se notează și se judecă pe barele reale după 7 zile; bilanțul apare aici") + "."); }   /* v100.351 (ideea 3) */
  return '<section class="gsFraza"><div class="gsFrazaCap"><span class="gsEt ' + v.culoare + '">' + mcsEsc(v.eticheta) + '</span><span class="tbSub">' + mcsEsc(cine + " · " + (v.deAici ? "de aici încolo, " : "") + "pe " + gsCate(o.zile, "zi", "zile")) + '</span></div>'
    + '<p class="gsFrazaMare">' + mcsEsc(v.cum) + '</p>' + (v.mediaTxt ? '<p class="gsFrazaMedia">' + mcsEsc(v.mediaTxt) + '</p>' : '')
    + '<div class="gsOriz" role="group" aria-label="pe câte zile">' + pastile + '</div>'
    + '<p class="t212Fac">👉 <b>Ce aș face eu:</b> ' + mcsEsc(gsCarte(v, r)) + '</p>'
    + '<details class="gsSurse"><summary>De unde știu</summary><ul>' + surse.map(function (x) { return '<li>' + mcsEsc(x) + '</li>'; }).join("") + '</ul></details></section>';
}
// histograma: barele sub zero roșii, peste verzi, cea care trece prin zero gri; axa 0; grămezile numite (stop / TP / lichidare); 5% / 95% / media
function gsHistHtml(d, term) {
  var h = d && d.hist; if (!h || !h.c || !(h.hi > h.lo)) return "";
  var W = 420, H = 100, pad = 14, top = 16, k = h.c.length, max = Math.max.apply(null, h.c), w = (h.hi - h.lo) / k, bw = (W - 2 * pad) / k, x = function (v) { return pad + (Math.max(h.lo, Math.min(h.hi, v)) - h.lo) / (h.hi - h.lo) * (W - 2 * pad); };
  var s = '<svg class="gsHistSvg" viewBox="0 0 ' + W + ' ' + (top + H + 30) + '" width="100%" role="img" aria-label="cum se împart rezultatele drumurilor: ' + mcsEsc(gsCate(h.n, "drum", "drumuri")) + '">';
  h.c.forEach(function (c, i) { var a = h.lo + i * w, b = a + w, bh = max ? c / max * H : 0, cl = b <= 0 ? "n" : a >= 0 ? "p" : "z"; if (!(bh > 0)) return; s += '<rect x="' + (pad + i * bw + 1).toFixed(1) + '" y="' + (top + H - bh).toFixed(1) + '" width="' + Math.max(0.5, bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" class="gsBara ' + cl + '"><title>' + mcsEsc(gsSemn1(a) + " … " + gsSemn1(b) + " USDT: " + gsCate(c, "drum", "drumuri")) + '</title></rect>'; });
  s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (top + H) + '" y2="' + (top + H) + '" class="gsAxa"/>';
  if (h.lo < 0 && h.hi > 0) s += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="' + (top - 4) + '" y2="' + (top + H) + '" class="gsZero"/><text x="' + x(0) + '" y="' + (top - 6) + '" text-anchor="middle" class="gsHistT">0</text>';
  var NUME = { stop: "stop", tp: "TP", lich: "lichidare" };
  (term || []).filter(function (t) { return NUME[t.fel] && t.p >= 0.1; }).forEach(function (t) { var xx = x(t.p50); s += '<text x="' + xx.toFixed(1) + '" y="10" text-anchor="' + (xx < 60 ? "start" : xx > W - 60 ? "end" : "middle") + '" class="gsHistT">' + mcsEsc(NUME[t.fel] + " " + GridSim.pr(t.p)) + '</text>'; });
  var mk = [{ v: d.p5, t: "5% " + gsSemn1(d.p5), a: "start", r: 0 }, { v: d.p95, t: "95% " + gsSemn1(d.p95), a: "end", r: 0 }].concat(isFinite(d.media) ? [{ v: d.media, t: "media " + gsSemn1(d.media), a: "middle", r: 1, c: "gsMedia" }] : []);
  mk.forEach(function (m) { if (m.v == null || !isFinite(m.v)) return; var xx = x(m.v); s += '<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + top + '" y2="' + (top + H + 4) + '" class="gsMarc ' + (m.c || "") + '"/><text x="' + (m.a === "start" ? pad : m.a === "end" ? W - pad : xx).toFixed(1) + '" y="' + (top + H + 16 + m.r * 12) + '" text-anchor="' + m.a + '" class="gsHistT">' + mcsEsc(m.t) + '</text>'; });
  return '<div class="gsHist">' + s + '</svg></div>';
}
function gsVerdictHtml(s) {
  var r = s.rez, i = gsI(s), o = r.orizonturi[i], v = gsV(s, i);
  if (!o || !v) return "";
  var d = v.deAici && o.deAici ? o.deAici : o;   // revizia (R3): la botul care rulează, cifrele și histograma sunt „de aici încolo”
  return '<section class="t212Panou gsSec gsVerdictBloc"><div class="t212PanouCap"><h4>Cum ies drumurile, ' + (v.deAici ? "de aici încolo, " : "") + 'pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4><span class="tbSub">' + mcsEsc(gsCate(r.n, "drum", "drumuri") + " de " + gsCate(r.zile, "zi", "zile") + " · " + gsCate(r.zileIstoric, "zi", "zile") + " de istoric · " + (r.acum ? "de la pornirea botului tău" : "botul pornit la prețul de acum")) + '</span></div>'
    + (o.scurt ? '<p class="mcsAvert gsNota">Istoricul e scurt față de orizont: la ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ' simularea doar reamestecă aceleași zile. Citește cifrele ca o schiță.</p>' : '')
    + '<div class="gsVerdict ' + v.culoare + '"><b>' + mcsEsc(v.rand) + '</b><span class="t212Mic">' + mcsEsc(v.marja) + ' · incertitudinea pe zile</span></div>'   /* v100.269: marja analitică pe zile */
    + '<p class="gsSub">' + mcsEsc(v.sub) + '</p>'
    + gsHistHtml(d, d.terminari || o.terminari) + '</section>';
}
function gsTdE(et, v, cls) { return '<td data-et="' + mcsEsc(et) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + mcsEsc(v) + '</td>'; }
function gsDurateHtml(s) {
  var r = s.rez, ales = gsI(s), plan = gsPlanOk(s.plan) ? s.plan : null, areTp = s.st && s.st.tp > 0, areStop = !!(s.st && (s.st.stop || s.st.stopRaport)), meu = !!r.acum, pt = gsPlanTxt(plan);
  return '<details class="t212Panou gsSec gsPli gsDurateBloc"><summary><h4>📅 Pe durate' + (meu ? ", de aici încolo" : "") + '</h4><span class="tbSub">aceleași drumuri, citite la 1, 3, 7 și 14 zile · un rând ales îl pune sus' + (meu ? " · planul: pe totalul de la pornire" : "") + '</span></summary>'
    + '<div class="rlTab"><table class="t212Tab gsDurate"><thead><tr><th>Zile</th><th>Verdict</th><th>Câștigă</th><th>Media</th><th>De obicei</th><th>5% / 95%</th><th>' + mcsEsc(pt) + '</th><th>Lichidare</th><th>Stop</th><th>TP</th></tr></thead><tbody>'
    + r.orizonturi.map(function (o, i) {
      var pl = plan && o.plan, d = meu && o.deAici ? o.deAici : o, v = gsV(s, i);
      return '<tr class="gsRand' + (i === ales ? ' gsRandAles' : '') + '" tabindex="0" aria-current="' + (i === ales) + '" data-oriz="' + i + '" data-action-click="gsOriz(' + i + ')">' + gsTdE("Zile", gsCate(o.zile, "zi", "zile")) + gsTdE("Verdict", v ? v.eticheta : "—", v ? v.culoare : "") + gsTdE("Câștigă", GridSim.pr(d.pCastig), v && v.confirmat ? "good" : v && v.rauConfirmat ? "bad" : "")
        + gsTdE("Media", GridSim.bani1(d.media), gsCls(Math.round((d.media || 0) * 10) / 10)) + gsTdE("De obicei", v && v.rupt ? "în două grămezi" : GridSim.bani1(d.p50), v && v.rupt ? "gsStins" : "") + gsTdE("5% / 95%", gsSemn1(d.p5) + " / " + gsSemn1(d.p95))
        + gsTdE(pt, pl ? GridSim.pr(o.plan.p) + (o.plan.dejaAtins ? " · deja" : o.plan.zileMediana !== null ? " · în " + gsZileTxt(o.plan.zileMediana) : "") : "—")
        + gsTdE("Lichidare", o.pLich > 0 && o.pLich < 0.005 ? "sub 1%" : GridSim.pr(o.pLich), GridSim.lichidareAcceptata(o.pLich) ? "" : "bad") + gsTdE("Stop", areStop ? GridSim.pr(o.pStop) : "—", areStop && o.pStop > 0.5 ? "bad" : "") + gsTdE("TP", areTp ? GridSim.pr(o.pTp) : "—") + '</tr>';
    }).join("") + '</tbody></table></div>'
    + (plan ? '<p class="tbSub gsNota">Planul se judecă la PRIMA atingere (+' + mcsEsc(gsNr(plan.plus || 0, 1)) + ' înainte de −' + mcsEsc(gsNr(plan.minus || 0, 1)) + '): dacă nu închizi botul când ajunge acolo, drumul merge mai departe și se judecă la capăt - de aici diferența față de „câștigă”. „în …” = după cât timp se atinge, de obicei; „5% / 95%” = cele mai proaste și cele mai bune 5% din drumuri, în USDT.</p>' : '')
    + '<p class="tbSub gsNota">„De obicei” (mijlocul drumurilor) lipsește când drumurile se rup în două grămezi (stop / TP): acolo mijlocul cade între ele și aproape niciun drum nu iese așa.</p></details>';
}
function gsRiscuriHtml(s) {
  var r = s.rez, o = r.orizonturi[gsI(s)], st = s.st || {}, stopV = st.stop ? (st.stop.sus || st.stop.jos) : null, meu = !!r.acum, h = "";
  // v100.350 (auditul Simulatorului): lichidarea cu pragul verdictului (orice lichidare ⇒ roșu; sub 0,5% „sub 1%”, nu „0%” verde)
  h += gsRand("lichidare", o.pLich > 0 && o.pLich < 0.005 ? "sub 1%" : GridSim.pr(o.pLich), GridSim.lichidareAcceptata(o.pLich) ? "good" : "bad");
  if (stopV || st.stopRaport) h += gsRand("atinge stopul" + (stopV ? " (" + mcsPretTxt(stopV) + ")" : st.stopRaport ? " (" + gsNr(Math.abs(st.stopRaport) * 100, 0) + "% din investiție)" : ""), GridSim.pr(o.pStop), o.pStop > 0.5 ? "bad" : "");
  if (st.tp > 0) h += gsRand("atinge TP-ul (" + mcsPretTxt(st.tp) + ")", GridSim.pr(o.pTp));
  h += gsRand("iese din grid măcar o dată" + (meu ? ", de aici încolo" : ""), GridSim.pr(o.pIesire)) + gsRand("grile încasate, în medie" + (meu ? " (de la pornire)" : ""), gsNr(o.perechi, 1))
    + gsRand("pierderea maximă pe drum" + (meu ? " (de la pornire)" : ""), GridSim.bani1(o.maxJos.p50) + " de obicei · " + GridSim.bani1(o.maxJos.p5) + " în cele mai proaste 5%", "bad")
    + gsRand("funding (" + (s.fundingSursa === "pionex" ? "rata reală Pionex" : s.fundingSursa === "manual" ? "scris de tine" : "cost fix presupus") + "), în medie" + (meu ? ", de aici încolo" : ""), gsFundingTxt(o.funding));
  if (s.mod === "meu" && s.bot && typeof TabloExtra !== "undefined" && TabloExtra.dacaInchizi) { var z = TabloExtra.dacaInchizi(s.bot); if (z && z.pretZero > 0) h += gsRand("prețul de zero (botul tău, acum, cu grilele de pe drum)", mcsPretTxt(z.pretZero) + (z.distantaZeroPct !== null ? " (" + mcsPct1(z.distantaZeroPct) + " de aici)" : "")); else if (z && z.zeroNeatins) h += gsRand("prețul de zero (botul tău, acum)", "din preț, în grid, nu mai ajunge pe zero"); }
  return '<section class="t212Panou gsSec"><div class="t212PanouCap"><h4>⚠️ Riscurile pe nume, pe ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + '</h4></div><div class="gsRiscuri">' + h + '</div></section>';
}
function gsBotulMeuHtml(s) {
  var r = s.rez, a = r.acum; if (!a) return "";
  var o = r.orizonturi[gsI(s)], b = s.bot || {}, pn = b.profitNet, plan = gsPlanOk(s.plan) ? s.plan : null, pz = r.pozitie, sim = s.sim || "", areP = pn !== null && pn !== undefined && isFinite(pn);
  var poz = function (q) { return gsNr(Math.abs(q), Math.abs(q) < 10 ? 4 : 0) + " " + sim; };
  var rez = (areP ? "Pionex " + GridSim.bani1(pn) + " · " : "") + "reluat " + GridSim.bani1(a.usdt) + (pz ? " · poziția " + poz(pz.pionex) + " în Pionex" : "");
  // v100.350 (auditul Simulatorului): „estimat” scade și comisionul de închidere (Pionex nu) ⇒ spus; diferența de poziție vine din mărimea pe grilă, nu din bare
  var h = '<p class="gsNota">reluat pe barele reale de la ' + mcsEsc(gsData(s.pornitLa)) + ' până la ' + mcsEsc(gsData(a.t)) + ': <b>' + mcsEsc(GridSim.bani1(a.usdt)) + '</b> estimat' + (isFinite(a.inchidere) && a.inchidere >= 0.05 ? ' (din care comisionul de închidere ' + mcsEsc(gsNr(a.inchidere, 1)) + ' USDT, pe care Pionex nu-l scade: fără el ' + mcsEsc(GridSim.bani1(a.usdt + a.inchidere)) + ')' : '') + (areP ? '; Pionex spune <b>' + mcsEsc(GridSim.bani1(pn)) + '</b>' : '')
    + ' · ' + mcsEsc(gsCate(a.perechi, "grilă încasată", "grile încasate")) + (a.oprit ? ' · <b class="bad">botul ar fi fost ' + (a.oprit === "lichidat" ? "lichidat" : "oprit") + ' pe drumul real</b>' : '') + '</p>';
  if (pz) h += '<p class="' + (pz.avert ? "tbWarn " : "") + 'gsNota">' + mcsEsc("poziția: Pionex " + poz(pz.pionex) + ", reluarea dădea " + poz(pz.reluata) + (pz.potrivit ? " ⇒ drumurile de aici încolo pornesc din poziția Pionex (mărimea pe grilă × " + gsNr(pz.scala, 2) + ")" : " ⇒ n-am putut potrivi (" + (pz.reluata * pz.pionex < 0 ? "de părți diferite" : "prea departe") + "): drumurile pornesc din poziția reluată") + (pz.avert ? "; peste 10% diferență: Pionex ține pe grilă altfel decât modelul, deci și estimatul de până acum e aproximativ" : "")) + '</p>';
  else if (isFinite(b.pozitie) && b.pozitie) h += '<p class="gsNota">' + mcsEsc("poziția în Pionex: " + poz(b.pozitie)) + '</p>';
  // revizia (I2): ținta de partea greșită a prețului DE LA PORNIRE nu se pune pe reluare - se spune, nu se tace
  if (r.tpIgnoratPrefix > 0) h += '<p class="tbWarn gsNota">' + mcsEsc("ținta (" + mcsPretTxt(r.tpIgnoratPrefix) + ") era de partea greșită a prețului la pornire: pe reluare n-o pun" + (r.tpIgnorat > 0 ? "; nici de aici încolo: e de partea greșită și față de prețul de acum" : ", de aici încolo da") + ".") + '</p>';
  if (o.plan && o.plan.dejaAtins && plan) h += '<p class="t212Fac">planul tău (' + (o.plan.dejaAtins === "plus" ? "+" + gsNr(plan.plus, 1) + ") e deja atins: încasează" : "−" + gsNr(plan.minus, 1) + ") e deja atins: ieși") + ', cum ți-ai propus.</p>';
  if (o.deAici) h += '<p class="gsNota">de aici încolo, în ' + mcsEsc(gsCate(o.zile, "zi", "zile")) + ': câștigă în ' + mcsEsc(GridSim.pr(o.deAici.pCastig)) + ' din drumuri, în medie ' + mcsEsc(GridSim.bani1(o.deAici.media)) + ' (5% sub ' + mcsEsc(gsSemn1(o.deAici.p5)) + ', 5% peste ' + mcsEsc(gsSemn1(o.deAici.p95)) + ').</p>';
  return '<details class="t212Panou gsSec gsPli gsBotBloc"' + (pz && pz.avert ? ' open' : '') + '><summary><h4>🤖 Botul meu, de la pornire</h4><span class="tbSub">' + mcsEsc(rez) + '</span></summary><p class="tbSub gsNota">Pionex nu dă ce ține botul pe fiecare grilă: e reluarea pe bare, verificată cu poziția și profitul din Pionex</p>' + h + '</details>';
}
// ---------------- v100.351: „🧭 Ce fac cu botul ăsta?” ----------------
// el (16.11): „dezvoltă mai mult ideea nr 2, că are potențial” ⇒ pe ACELEAȘI drumuri, de aici încolo, din poziția Pionex: îl țin · îl închid · TP-ul / stopul
// mutat · planul tău ca stop · îl închid și pornesc; altceva decât „îl țin” doar CU DOVADĂ (GridSim.alegeHotarare, probat sub H0). În worker.
var GS_HOT = { n: 800, orizonturi: [1, 7] };
// proba regulii sub H0 (refăcută pe codul v100.352, scratchpad h0hot) - spusă cum a ieșit, cu ce NU acoperă
var GS_HOT_H0 = "Probată înainte (pe codul v100.352), pe 71 de boți inventați în două lumi (zile independente și agitație persistentă), cu adevărul socotit pe 300 de zile: a zis altceva decât „îl țin” de 15 ori - 14 „îl închid acum”, o dată „TP-ul mai aproape” - și de fiecare dată chiar era mai bine (0 recomandări false; o dată câștigul adevărat a fost sub prag). Stopul mutat și repornirea n-au ieșit niciodată recomandate în probă: pentru ele nu am încă dovadă că nu greșesc. Din 25 de situații în care exista o acțiune mai bună cu cel puțin pragul, a prins 14 - când zice „îl țin”, poate fi și din lipsă de dovadă.";
function gsMajuscula(t) { t = String(t || ""); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
function gsHotRand(a, i, ales, t) {
  if (a.eroare) return '<tr class="gsHotEr"><td data-et="Acțiunea">' + mcsEsc(a.nume) + '</td><td data-et="De ce nu" colspan="5" class="gsStins">' + mcsEsc("nu se poate: " + a.eroare) + '</td></tr>';
  var z = a.oriz && a.oriz[i]; if (!z) return "";
  var d = z.dif, difTxt = !d ? "referința" : GridSim.bani1(d.media) + " ± " + gsNr(d.marja, 1), cls = !d ? "" : d.media - d.marja > 0 ? "good" : d.media + d.marja < 0 ? "bad" : "";
  var drum = !d ? "—" : "mai bun pe " + GridSim.pr(d.maiBun) + " · mai rău pe " + GridSim.pr(d.maiRau);
  var ies = a.cheie === "inchide" ? "acum, sigur (referința)" : [z.pStop > 0.005 ? "stop " + GridSim.pr(z.pStop) : null, z.pTp > 0.005 ? "TP " + GridSim.pr(z.pTp) : null, z.pLich > 0 ? "lichidare " + (z.pLich < 0.005 ? "sub 1%" : GridSim.pr(z.pLich)) : null].filter(Boolean).join(" · ") || "rulează";
  return '<tr class="' + (a.cheie === ales ? "gsRandAles" : "") + '"><td data-et="Acțiunea">' + (a.cheie === ales ? "👉 " : "") + mcsEsc(a.nume + (a.inEsantion ? " (aleasă pe aceeași lună: doar de comparat)" : a.doarComparat ? " (doar de comparat)" : "")) + '</td>' + gsTdE("Media", GridSim.bani1(z.media), gsCls(Math.round(z.media * 10) / 10)) + gsTdE("Cele mai proaste 5% (de aici)", gsSemn1(z.p5) + " USDT", t && z.p5 < t.p5 - 0.05 ? "bad" : "")
    + gsTdE("Față de „îl țin”", difTxt, cls) + gsTdE("Drum cu drum", drum) + gsTdE("Cum iese", ies) + '</tr>';
}
function gsHotHtml(s) {
  if (!gsMeu()) return "";
  var tH = s.hot && s.hot.tBara > 0 ? new Date(s.hot.tBara + 9e5).toLocaleTimeString("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }) : null;   /* v100.354: bara în formare nu intră ⇒ spun ora prețului */
  var cap = '<div class="t212PanouCap"><h4>🧭 Ce fac cu botul ăsta?</h4><span class="tbSub">' + mcsEsc("pe aceleași " + gsCate(GS_HOT.n, "drum", "drumuri") + ", de aici încolo" + (s.rez && s.rez.pozitie && s.rez.pozitie.potrivit ? ", din poziția Pionex" : "") + " · cu comisionul de închidere" + (tH ? " · de la prețul de la " + tH + " (ultima bară de 15 minute închisă; cea în formare nu intră)" : "")) + '</span></div>';
  if (s.hotInLucru) return '<section class="t212Panou gsSec gsHotBloc">' + cap + '<p class="tbSub gsNota">compar acțiunile pe aceleași drumuri (câteva secunde, în fundal - pagina merge)…</p></section>';
  if (s.hotEroare) return '<section class="t212Panou gsSec gsHotBloc">' + cap + '<p class="tbWarn gsNota">' + mcsEsc(s.hotEroare) + '</p></section>';
  var h = s.hot; if (!h || !h.actiuni) return "";
  var i = s.hotOriz === 0 ? 0 : h.oriz.length - 1, hH = h.oriz.length - 1, A = h.actiuni, ales = h.ales || { cheie: "tine" }, a = A.filter(function (x) { return x.cheie === ales.cheie; })[0] || A[0];
  var t = (A.filter(function (x) { return x.cheie === "tine"; })[0] || {}).oriz; t = t ? t[i] : null;
  var fraza = ales.cheie === "tine" ? "Aș face: îl țin așa." : "Aș face: " + a.nume + ".";
  var cul = ales.cheie === "tine" ? "" : ales.plan ? "bad" : "good";
  var pastile = h.oriz.map(function (z, k) { return '<button type="button" class="gsOrizBtn" aria-pressed="' + (k === i) + '" data-action-click="gsHotOriz(' + k + ')">' + mcsEsc("pe " + gsCate(z, "zi", "zile")) + '</button>'; }).join("");
  var tab = '<div class="rlTab"><table class="t212Tab gsDurate gsHot"><thead><tr><th>Acțiunea</th><th>Media (USDT)</th><th>Cele mai proaste 5% (USDT, de aici)</th><th>Față de „îl țin” (USDT)</th><th>Drum cu drum</th><th>Cum iese</th></tr></thead><tbody>'
    + A.map(function (x) { return gsHotRand(x, i, ales.cheie, t); }).join("") + '</tbody></table></div>';
  var bil = s.hotBilant, leg = gsHotLegatura(s, A, ales, hH);
  var surse = ["Fiecare rând e botul tău de ACUM (reluat pe barele reale de la pornire" + (s.rez.pozitie && s.rez.pozitie.potrivit ? ", cu poziția Pionex" : "") + ") cu o singură schimbare făcută acum, pe aceleași " + gsCate(h.n, "drum", "drumuri") + " de " + gsCate(h.oriz[hH], "zi", "zile") + ": diferența față de „îl țin” e drum cu drum, deci nu e noroc de drum.",
    "Cifrele sunt în USDT față de „îl închid acum” (care e 0): cât ai avea în plus sau în minus la capăt, cu botul închis atunci - comisionul de închidere e socotit și acum, și la capăt" + (h.fee >= 0.05 ? " (acum: " + gsNr(h.fee, 1) + " USDT)" : "") + ".",
    "„± ” = cât de sigură e diferența pe zilele de istoric (fiecare zi distinctă e o observație), nu pe drumuri. Socotită pe zile, ieșea de 2–3 ori mai largă decât variația reală (măsurat la audit), așa că e luată pe jumătate - probat înainte sub H0 că nu aduce recomandări false.",
    "Fiecare hotărâre se judecă după 1 și 7 zile pe barele REALE de după ea (fiecare acțiune, ca în tabel), cu rata de funding de la notare; o gaură în bare ⇒ nejudecată, spus.",
    "„Îl închid și pornesc unul la fel” e același bot centrat pe prețul de acum, ca în colector (Tabloul și Discordul aleg din aceleași rânduri); setarea fișei Grid, când e, se arată dar nu se recomandă: e aleasă pe aceeași lună din care se trag drumurile.",
    "Regula, scrisă înainte de cifre: altceva decât „îl țin” doar dacă, pe " + gsCate(h.oriz[hH], "zi", "zile") + ", media e mai bună cu cel puțin " + gsNr(h.prag, 1) + " USDT (2% din sumă, minim 1), marginea de jos a diferenței e peste 0, cele mai proaste 5% nu sunt mai rele cu mai mult de " + gsNr(h.prag, 1) + " USDT și se ține și pe alte " + gsCate(h.n * 2, "drum", "drumuri") + " din aceeași lună (prinde norocul tragerii dintre ~8 încercări, nu norocul lunii). Excepție: planul tău - când cele mai proaste 5% ale acțiunii alese (de la pornire) trec de minusul lui, îl închid; rândul „stopul la planul tău” rămâne doar de comparat (la levier mare ieșea mai prost decât închiderea).",
    GS_HOT_H0,
    "Recomandarea e a modelului (trecutul monedei reamestecat), nu o predicție: o mișcare mai rea decât orice a avut moneda nu apare. De aceea fiecare hotărâre se urmărește pe barele reale" + (bil && bil.text ? ": " + bil.text : " (bilanțul apare după primele hotărâri judecate).")];
  return '<section class="t212Panou gsSec gsHotBloc">' + cap
    + '<p class="gsHotFraza ' + cul + '"><b>' + mcsEsc(fraza) + '</b> ' + mcsEsc(gsMajuscula(ales.motiv || "")) + (ales.verificat ? " Se ține și pe alte " + mcsEsc(gsCate(h.n * 2, "drum", "drumuri")) + "." : "") + '</p>'
    + (h.avertLich ? '<p class="tbWarn gsNota">⚠ ' + mcsEsc(h.avertLich) + '</p>' : '')   /* v100.354: stopul tău dincolo de lichidare */
    + (leg ? '<p class="tbSub gsNota">' + mcsEsc(leg) + '</p>' : '')
    + (bil && bil.text ? '<p class="tbSub gsNota">📒 ' + mcsEsc(bil.text) + '</p>' : '')
    + '<div class="gsOriz" role="group" aria-label="pe câte zile">' + pastile + '</div>' + tab
    + (i !== hH ? '<p class="tbSub gsNota">' + mcsEsc("Hotărârea se ia pe " + gsCate(h.oriz[hH], "zi", "zile") + "; rândurile pe " + gsCate(h.oriz[i], "zi", "zile") + " arată doar cum arată drumul până acolo.") + '</p>' : '')
    + '<details class="gsSurse"><summary>De unde știu</summary><ul>' + surse.map(function (x) { return '<li>' + mcsEsc(x) + '</li>'; }).join("") + '</ul></details></section>';
}
// fraza de sus (verdictul pe șanse) și hotărârea (pe bani, cu dovadă) pot spune lucruri diferite - se spune de ce, cu cifra rândului potrivit
function gsHotLegatura(s, A, ales, hH) {
  var v = gsV(s, gsI(s)), fac = v && v.faCe || "", rand = function (k) { var x = A.filter(function (a) { return a.cheie === k && !a.eroare; })[0]; return x && x.oriz && x.oriz[hH] && x.oriz[hH].dif ? x.oriz[hH].dif : null; }, dt = function (d) { return GridSim.bani1(d.media) + " ± " + gsNr(d.marja, 1) + " USDT"; };
  if (ales.cheie === "tine" && /^Stopul e în zgomot/.test(fac)) { var d1 = rand("stopLarg"); return "Sus scrie „stopul e în zgomot”: e regula de așezare a stopului (dincolo de cât merge moneda într-o zi obișnuită), nu o dovadă că mutarea aduce bani" + (d1 ? "; pe aceleași drumuri, „stopul mai larg” iese " + dt(d1) + " față de „îl țin” - prea nesigur ca să-l recomand" : "") + "."; }
  if (ales.cheie === "tine" && /^(Aș opri|L-aș opri)/.test(fac)) { var d2 = rand("inchide"); return "Sus scrie „l-aș opri” (după șansele botului); aici, pe bani" + (d2 ? ", „îl închid acum” iese " + dt(d2) + " față de „îl țin”" : "") + " - nu destul de sigur ca să-l recomand. Dacă sus și aici nu se potrivesc, contează planul tău."; }
  if (ales.plan) return "„Îl închid” vine din planul tău (regula ta, scrisă înainte), nu dintr-o statistică: cele mai proaste 5% trec de minusul planului.";
  if (ales.cheie === "tine" && /planul tău/.test(fac)) return "Sus (pe 2.000 de drumuri) cele mai proaste 5% trec de planul tău; aici (pe " + gsNr(GS_HOT.n, 0) + ", altă tragere) nu trec: ești la limita planului - eu aș asculta de plan.";
  if (ales.cheie !== "tine" && /^(Aș ține|Aș porni)/.test(fac)) return "Sus scrie „aș ține” (după șansele botului); aici, pe bani, o schimbare iese mai bună cu dovadă: ținut așa, botul merge, dar schimbat merge mai bine.";
  return null;
}
function gsHotOriz(i) { gsStare.hotOriz = i === 0 ? 0 : 1; gsDeseneaza(); }
// setarea fișei Grid pe aceeași monedă (proaspătă, sub o oră) ⇒ „îl închid și pornesc setarea fișei”; altfel același bot centrat pe prețul de acum
function gsFisaPentru(sim) {
  try { var f = typeof grStare !== "undefined" ? grStare.fisa : null; if (!f || !(Date.now() - (grStare.la || 0) < 3600000)) return null; var x = String(f.simbol || "").replace(/_USDT_PERP$/, ""); if (x !== String(sim || "").toUpperCase()) return null; var p = f.verdictPe && f.verdictPe.x, z = p || (typeof GridProba !== "undefined" && GridProba.setarePropusa ? GridProba.setarePropusa(f) : f.setare); return z && z.jos > 0 && z.sus > z.jos ? { jos: z.jos, sus: z.sus, grile: z.grile, levier: z.levier, dir: z.dir || f.dir, stop: z.stop || null, tp: z.tp || null, tip: z.tip || "aritmetic" } : null; } catch (e) { return null; }
}
// v100.354 (revizia 🔵7): lichidarea din Pionex e a botului AȘA cum e - cu levierul / gridul / direcția schimbate în câmpuri, doar estimarea
function gsLichBot(st) { if (!gsStare.bot) return null; var d = GridSim.setariDinBot(gsStare.bot), b = d.st; return d.lich && b && st && b.dir === st.dir && b.levier === st.levier && Math.abs(b.jos - st.jos) <= 1e-9 * b.jos && Math.abs(b.sus - st.sus) <= 1e-9 * b.sus ? d.lich : null; }
async function gsHotPorneste() {
  if (!gsMeu() || !gsStare.date || gsStare.hotInLucru) return;
  var st = gsStCuFunding(), d = gsStare.date, rez0 = gsStare.rez;
  gsStare.hotInLucru = true; gsStare.hotEroare = null; gsStare.hot = null; gsDeseneaza();
  var fisa = gsFisaPentru(gsStare.sim);
  try {
    var k7 = GS_ORIZ.indexOf(7), z7 = rez0 && rez0.orizonturi ? rez0.orizonturi[k7] : null;
    var h = await gsInWorker("hotarare", d.b15, st, { p5Plan: z7 && isFinite(z7.p5) ? z7.p5 : null, pornitLa: gsStare.pornitLa, pozitiePionex: gsPozPionex(), lich: gsLichBot(st), plan: gsPlanOk(gsStare.plan) ? gsStare.plan : null, fisa: fisa ? Object.assign({}, fisa, { suma: st.suma, fundingZi: st.fundingZi, fundingCost: st.fundingCost }) : null, n: GS_HOT.n, seed: 12, orizonturi: GS_HOT.orizonturi });
    if (gsStare.rez !== rez0) { gsStare.hotInLucru = false; if (gsStare.rez && gsMeu()) gsHotPorneste(); return; }   /* revizia (🔵11): altă simulare între timp ⇒ hotărârea ei, nu asta */
    if (h && h.eroare) gsStare.hotEroare = "Nu pot compara acțiunile: " + h.eroare; else gsStare.hot = h;
  } catch (e) { gsStare.hotEroare = "Nu pot compara acțiunile: " + (e && e.message || e); }
  gsStare.hotInLucru = false;
  try { if (typeof tbMcDinKv === "function") { var kv = await tbMcDinKv(); gsStare.hotBilant = kv && kv.hotarari ? kv.hotarari : null; } } catch (e) { /* bilanțul lipsește: pagina merge */ }
  gsDeseneaza();
}
// v100.351 (ideea 3): fiecare simulare de bot NOU se notează (o dată pe monedă, setare și zi - ruta o ține o singură dată) cu șansa și media pe 7 zile;
// colectorul o judecă pe barele reale după 7 zile (tura-sim-urmarire.mjs). Bilanțul („cât de bine a prezis”) vine înapoi în „De unde știu”.
var gsNotate = {}, gsSimUrm = { la: 0, v: null, inLucru: false };
function gsNoteazaVerdict() {
  try {
    var r = gsStare.rez, d = gsStare.date, st = gsStCuFunding(); if (!r || r.acum || !d || !d.b15 || !d.b15.length || typeof apiFetch !== "function") return;
    var k7 = GS_ORIZ.indexOf(7), o = r.orizonturi[k7], v = o ? GridSim.verdict(r, st, null, k7, null) : null; if (!o || !v || !isFinite(o.media)) return;
    var sim = String(d.sim || "").toUpperCase() + "_USDT_PERP", ch = sim + "|" + new Date().toISOString().slice(0, 10) + "|" + JSON.stringify(st); if (gsNotate[ch]) return; gsNotate[ch] = 1;
    var fel = /^Aș porni/.test(v.faCe || "") ? "porni" : /^N-aș porni/.test(v.faCe || "") ? "nu" : "alt";
    var n = { sim: sim, t: Date.now(), tUrm: d.b15[d.b15.length - 1].t + 9e5, st: st, p: o.pCastig, media: Math.round(o.media * 100) / 100, fel: fel, v: GridSim.VERS_SIM || 1 };   /* v100.352: versiunea motorului (bilanțul pe versiune) */
    apiFetch("/api/istoric-bot?action=simNota", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(n) }).catch(function () { delete gsNotate[ch]; });
  } catch (e) { /* nota lipsește: pagina merge */ }
}
function gsSimUrmAdu() {
  if (gsSimUrm.inLucru || Date.now() - gsSimUrm.la < 10 * 60000 || typeof getJSON !== "function") return;
  gsSimUrm.inLucru = true; getJSON("/api/istoric-bot?action=simUrmarire").then(function (j) { gsSimUrm.v = j && j.urmarire && j.urmarire.rezumat || null; if (gsSimUrm.v && j.urmarire.la > 0) gsSimUrm.v = Object.assign({}, gsSimUrm.v, { text: gsSimUrm.v.text + " (socotit " + new Date(j.urmarire.la).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + ")" }); }).catch(function () { /* fără bilanț */ }).then(function () { gsSimUrm.la = Date.now(); gsSimUrm.inLucru = false; });
}
// ---------------- v100.351 (viteza): simulările în worker (lib/grid-sim-worker.js, aceleași module) ----------------
// fără Worker, worker picat sau fără răspuns în 30 s (pe telefon 20 s) ⇒ pe fir, ca înainte (același rezultat, aceeași sămânță)
var gsWorker = null, gsWorkerId = 0, gsWorkerCereri = {};
function gsPeFir(fel, b15, st, o) { return fel === "hotarare" ? GridSim.hotarare(b15, st, o) : fel === "compara" ? GridSim.compara(b15, st, o) : fel === "mcGrid" ? MonteSimbol.grid(b15, st, o) : fel === "variante" ? mcsCalcVariante(b15, st, o.pret, o) : fel === "tinte" ? mcsCalcTinteBot(b15, st, o.pret, o) : GridSim.simuleaza(b15, st, o); }   /* v100.354: + botul Monte Carlo, variantele, țintele */
function gsInWorker(fel, b15, st, o) {
  return new Promise(function (res) {
    var gata = false, fin = function (r) { if (!gata) { gata = true; res(r); } }, peFir = function () { try { fin(gsPeFir(fel, b15, st, o)); } catch (e) { fin({ eroare: String(e && e.message || e) }); } };
    if (typeof Worker === "undefined") return setTimeout(peFir, 30);
    try {
      if (!gsWorker) {
        gsWorker = new Worker("/lib/grid-sim-worker.js");
        // revizia: hotărârea (grea) nu cade pe fir nici la eroarea worker-ului - eroare cu „deschide din nou”; simularea da (ca înainte)
        gsWorker.onmessage = function (ev) { var d = ev && ev.data || {}, c = gsWorkerCereri[d.id]; if (!c) return; delete gsWorkerCereri[d.id]; clearTimeout(c.t); if (d.rez) c.fin(d.rez); else c.cadere(); };
        gsWorker.onerror = function () { var l = gsWorkerCereri; gsWorkerCereri = {}; try { gsWorker.terminate(); } catch (e) { /* deja oprit */ } gsWorker = null; Object.keys(l).forEach(function (k) { clearTimeout(l[k].t); l[k].cadere(); }); };
      }
      var id = ++gsWorkerId, ms = (typeof window !== "undefined" && window.innerWidth < 600 ? 20000 : 30000) * (1 + Object.keys(gsWorkerCereri).length);   /* revizia (🟡8): cererile la rând nu mai cad pe fir */
      var mesaj = { id: id, fel: fel, b15: b15, st: st, o: o };
      // v100.352 (auditul): la timeout iese DOAR cererea expirată (worker-ul e blocat în ea); celelalte se trimit într-un worker nou, cu termenul lor.
      // Hotărârea (~8 simulări) nu cade pe fir - pe un telefon lent ar îngheța pagina zeci de secunde: eroare cu „refă”
      var expira = function () {
        var c = gsWorkerCereri[id]; if (!c) return; delete gsWorkerCereri[id];
        var rest = gsWorkerCereri; gsWorkerCereri = {}; try { gsWorker.terminate(); } catch (e) { /* deja oprit */ } gsWorker = null;
        if (fel === "hotarare") fin({ eroare: "a durat prea mult în fundal (peste " + Math.round(ms / 1000) + " de secunde) - deschide din nou botul ca să reîncerc" }); else peFir();
        Object.keys(rest).forEach(function (k) { clearTimeout(rest[k].t); rest[k].retrimite(); });
      };
      gsWorkerCereri[id] = { fin: fin, peFir: peFir, t: setTimeout(expira, ms), retrimite: function () { fin(null); }, cadere: function () { if (fel === "hotarare") fin({ eroare: "calculul în fundal a picat - deschide din nou botul ca să reîncerc" }); else peFir(); } };
      gsWorkerCereri[id].retrimite = function () { delete gsWorkerCereri[id]; gsInWorker(fel, b15, st, o).then(fin); };
      gsWorker.postMessage(mesaj);
    } catch (e) { setTimeout(peFir, 30); }
  });
}
// v100.135: variantele și țintele (TP) de pe pagina Monte Carlo, pe orizontul ales, pe setarea din formular (la botul care rulează: ca un bot pornit acum)
function gsAlteSetariHtml(s) {
  var st = s.st; if (!st || !(st.jos > 0)) return "";
  var zile = GS_ORIZ[s.oriz >= 0 && s.oriz < GS_ORIZ.length ? s.oriz : 2], rv = { setari: st, variante: s.variante, varianteInLucru: s.varianteInLucru, varianteEroare: s.varianteEroare, tinteBot: s.tinteBot, tinteBotInLucru: s.tinteBotInLucru, tinteBotEroare: s.tinteBotEroare };
  // v100.136: la botul care rulează „așa cum e” și țintele pornesc din pozițiile de acum; titlul variantelor spune orizontul CALCULAT
  var nota = "variantele și țintele (TP) de pe pagina Monte Carlo, pe " + gsCate(zile, "zi", "zile") + (s.rez && s.rez.acum ? " · „așa cum e” și țintele: botul tău cu pozițiile de acum, de aici încolo · celelalte variante: pornite acum, de la zero, cu aceeași sumă ca a ta (ca și cum l-ai opri și ai porni varianta)" : "");
  var deschis = !!(s.variante || s.varianteInLucru || s.varianteEroare || s.tinteBot || s.tinteBotInLucru || s.tinteBotEroare);
  return '<details class="t212Panou gsSec gsPli gsAlteBloc"' + (deschis ? ' open' : '') + '><summary><h4>🧪 Alte setări, pe aceleași drumuri</h4><span class="tbSub">interval îngust / larg, levier ±1, grile ½ / ×2 · ținte (TP)</span></summary><p class="tbSub gsNota">' + mcsEsc(nota) + '</p>'
    + mcsVarHtml(rv, "gsCompara()", s.varianteZile || zile) + mcsTpHtml(rv, "gsComparaTp()") + '</details>';
}
function gsSemn1(v) { if (v == null || !isFinite(v)) return "—"; var r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + gsNr(Math.abs(r), 1); }   /* v100.350: −0,04 ⇒ „0,0”, nu „−0,0” */
function gsHtml(s) {
  s = s || gsStare;
  var vechime = s.dateLa > 0 ? Math.round((Date.now() - s.dateLa) / 60000) : null;
  var cap = '<div class="mcsCap gsCap"><span class="tbSub">' + mcsEsc((s.sim ? s.sim + (s.pret > 0 ? " · " + mcsPretTxt(s.pret) : "") : "un bot grid Pionex") + (vechime !== null ? " · " + (vechime < 1 ? "date proaspete" : "date de acum " + gsCate(vechime, "minut", "minute")) : "")) + '</span></div>';
  var lay = function (corp) { return cap + '<div class="gsLay">' + gsListaHtml(s) + '<div class="gsFisa">' + gsAlegeriHtml(s) + corp + '</div></div>'; };
  if (s.inLucru) return lay(gsFormHtml(s) + '<p class="tbSub gsNota">calculez: aduc barele de 15 minute (Pionex le dă pe bucăți: ~20 de secunde la prima analiză a monedei) și rulez botul pe 2.000 de drumuri de 14 zile (1–2 secunde, în fundal)…</p>');
  if (s.eroare) return lay('<p class="tbWarn gsNota">' + mcsEsc(s.eroare) + '</p>' + gsFormHtml(s));
  if (!s.rez) return lay(gsFormHtml(s) + '<p class="tbSub gsNota">Lipește codul din Tablou sau completează setarea, apoi apasă „Simulează”: cum se termină drumurile (stop, TP, încă rulează), media, riscurile și planul tău, pe 1 / 3 / 7 / 14 zile.</p>');
  var sv = s.st && s.st.stop ? (s.st.stop.sus || s.st.stop.jos) : null, inGrid = sv > 0 && s.st.jos > 0 && sv > s.st.jos && sv < s.st.sus;
  return lay((inGrid ? '<p class="tbWarn gsNota">' + mcsEsc("Stopul (" + mcsPretTxt(sv) + ") stă în grid (" + mcsPretTxt(s.st.jos) + "–" + mcsPretTxt(s.st.sus) + "): " + (s.st.dir === "short" ? "peste" : "sub") + " el gridul nu mai lucrează, iar o mișcare obișnuită l-ar opri cu poziția pe jumătate (regula ta: stopul nu stă în mijlocul gridului). Aș pune stopul " + (s.st.dir === "short" ? "peste grid" : "sub grid") + " sau aș strânge gridul cât planul.") + '</p>' : '') + (s.rez.tpIgnorat > 0 ? '<p class="tbWarn gsNota">' + mcsEsc("TP-ul (" + mcsPretTxt(s.rez.tpIgnorat) + ") e de partea greșită a prețului pentru " + s.st.dir + ": nu l-am pus în simulare. La long, TP-ul e deasupra prețului de acum; la short, dedesubt.") + '</p>' : '')
    + gsFrazaHtml(s) + gsHotHtml(s) + gsVerdictHtml(s) + gsRiscuriHtml(s) + gsFormHtml(s) + gsDurateHtml(s) + gsBotulMeuHtml(s) + gsAlteSetariHtml(s));
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
// v100.350: lista boților (ecran lat) - un clic alege botul și simulează
function gsLista(i) {
  if (gsStare.inLucru) { gsStare.dupa = function () { gsLista(i); }; return; }
  gsCiteste(true); gsStare.mod = "meu"; gsAlegeBot(i); gsSimuleaza();
}
function gsMod(m) {
  if (gsStare.inLucru) { gsStare.dupa = function () { gsMod(m); }; return; }   // v100.352 (auditul): după simularea în lucru (altfel rezultatul vechi sub setarea nouă)
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
  if (gsStare.inLucru) { gsStare.dupa = gsDinCod; return; }   // v100.352 (auditul)
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
  if (gsStare.inLucru) { gsStare.dupa = function () { gsDirectie(d); }; return; }   // v100.352 (auditul): long → short în timpul calculului dădea verdictul long sub setarea short
  gsCiteste(true);
  gsStare.st = gsDirectieSt(gsStare.st, d === "short" ? "short" : d === "neutru" ? "neutru" : "long"); gsStare.rez = null;
  gsDeseneaza();
}
// citește câmpurile în stare; întoarce textul erorii (sau null); bland = fără erori, doar ce se poate citi
function gsCiteste(bland) {
  var REF = { gsJos: gsStare.pret, gsSus: gsStare.pret, gsStop: gsStare.pret, gsTp: gsStare.pret, gsSuma: gsStare.st && gsStare.st.suma, gsLinii: gsStare.st && gsStare.st.grile + 1, gsLev: gsStare.st && gsStare.st.levier };   /* v100.351: „95.000” după preț */
  var n = function (id) { return mcsNumar(id, REF[id]); }, st = Object.assign({}, gsStare.st), er = null;
  // revizia (R6): un câmp golit sau cu altceva decât un număr NU păstrează pe ascuns valoarea veche - eroare pe nume (în modul strict)
  var brut = function (id) { var el = gsEl(id); return el ? String(el.value || "").trim() : null; }, NUMEC = { gsJos: "Jos", gsSus: "Sus", gsLinii: "Linii", gsLev: "Levier", gsSuma: "Suma", gsStop: "Stop", gsTp: "TP", gsPlanMinus: "Planul: ies la", gsPlanPlus: "Planul: încasez la", gsFunding: "Funding pe zi" };
  if (!bland) for (var id in NUMEC) { var v = brut(id); if (v === null) continue; var obl = /^gs(Jos|Sus|Linii|Lev|Suma)$/.test(id); if (v === "" && obl) { er = er || "Câmpul „" + NUMEC[id] + "” e gol."; } else if (v !== "" && mcsNrRo(v, null) === null) er = er || "„" + NUMEC[id] + "”: „" + v + "” nu e un număr."; }
  var sim = gsEl("gsSim"); if (sim) gsStare.sim = mcsCurata(sim.value);
  var dirEl = gsEl("gsDir"), dir = dirEl ? dirEl.value : st.dir; st.dir = dir === "short" || dir === "neutru" ? dir : "long";
  // v100.350: câmpurile arată prețurile rotunjite după pasul gridului (cu virgulă) - textul neschimbat ⇒ valoarea exactă de dinainte (stopul în procente rămâne)
  var stV = gsStare.st || {}, cp = function (id, vechi, fmt) { var el = gsEl(id); if (!el) return null; var t = String(el.value || "").trim(); return vechi !== null && vechi !== undefined && isFinite(vechi) && t !== "" && t === fmt(vechi) ? vechi : n(id); }, fp = function (v) { return gsCampPret(v, stV); }, f2 = function (v) { return gsCampNr(v, 2); };
  var stopV0 = stV.stop ? (stV.stop.sus || stV.stop.jos) : null;
  var jos = cp("gsJos", stV.jos, fp), sus = cp("gsSus", stV.sus, fp), linii = n("gsLinii"), lev = n("gsLev"), stop = cp("gsStop", stopV0, fp), tp = st.dir === "neutru" ? null : cp("gsTp", stV.tp, fp), suma = cp("gsSuma", stV.suma, f2), tipEl = gsEl("gsTip"); if (typeof mcsSumaRo === "function" && gsEl("gsSuma")) suma = mcsSumaRo(gsEl("gsSuma").value, suma);   /* v100.354: „1,000” la sumă = 1.000 */
  if (jos > 0) st.jos = jos; if (sus > 0) st.sus = sus; if (linii >= 3) st.grile = Math.round(linii) - 1; if (lev >= 1) st.levier = Math.round(lev); if (suma > 0) st.suma = suma; if (tipEl) st.tip = tipEl.value === "aritmetic" ? "aritmetic" : "geometric";
  var ref = gsStare.pret > 0 ? gsStare.pret : (st.jos + st.sus) / 2;   // revizia (R1): la neutru partea stopului după PREȚ, nu după mijlocul gridului
  // v100.259: stopul venit de la bot în PROCENTE (st.stopRaport) rămâne doar cât prețul din câmp e cel al botului; schimbat de mână ⇒ prețul tău
  var stopVechi = st.stop ? (st.stop.sus || st.stop.jos) : null, aceeasiStop = stopVechi > 0 && stop > 0 && Math.abs(stop - stopVechi) <= 1e-9 * Math.max(1, stopVechi);
  if (st.stopRaport && !aceeasiStop) delete st.stopRaport;
  if (gsEl("gsStop")) st.stop = stop > 0 ? (st.dir === "short" ? { sus: stop } : st.dir === "neutru" ? (stop < ref ? { jos: stop } : { sus: stop }) : { jos: stop }) : null;
  if (gsEl("gsTp")) st.tp = tp > 0 ? tp : null;
  var pm = cp("gsPlanMinus", gsStare.plan && gsStare.plan.minus, f2), pp = cp("gsPlanPlus", gsStare.plan && gsStare.plan.plus, f2);   /* revizia (R6): planul exact cât textul nu s-a schimbat */ if (gsEl("gsPlanMinus")) gsStare.plan = { minus: pm > 0 ? pm : null, plus: pp > 0 ? pp : null };
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
  gsStare.inLucru = true; gsStare.eroare = null; gsStare.rez = null; gsStare.hot = null; gsStare.hotEroare = null;   /* v100.351: altă simulare ⇒ hotărârea de la capăt */
  gsStare.variante = null; gsStare.varianteEroare = null; gsStare.tinteBot = null; gsStare.tinteBotEroare = null; gsStare.varianteToate = null; gsStare.tinteBotToate = null;   // v100.135: altă simulare ⇒ comparațiile de la capăt
  gsDeseneaza();
  try {
    var sim = gsStare.sim;
    if (!gsStare.date || gsStare.date.sim !== sim || Date.now() - gsStare.dateLa > 5 * 60000) {
      var c = await mcsAduCoin(sim);
      if (!c || !c.b15.length) throw new Error("Nu găsesc „" + sim + "” pe Pionex (" + sim + "_USDT_PERP). Scrie moneda cum e pe Pionex.");
      gsStare.date = { sim: sim, b15: c.b15, fundingInfo: c.fundingInfo || null }; gsStare.dateLa = Date.now(); gsStare.pret = c.b15[c.b15.length - 1].c;
    }
    if (gsStare.fundingSursa !== "manual" && gsStare.fundingSim !== sim) gsPuneFunding(sim, gsStare.date.fundingInfo);   // v100.136: rata reală vine cu barele (o singură cerere)
    var st = Object.assign({}, gsStare.st, { fundingZi: gsStare.fundingZi, fundingCost: gsStare.fundingSursa !== "pionex" && gsStare.fundingSursa !== "manual" });   // revizia (R4): rata presupusă = cost
    var amprenta = gsStare.mod + "|" + JSON.stringify(gsStare.st) + "|" + JSON.stringify(gsStare.plan);   // v100.352: setarea pe care o simulez
    var rez = await gsInWorker("simuleaza", gsStare.date.b15, st, { plan: gsPlanOk(gsStare.plan) ? gsStare.plan : null, pornitLa: gsStare.mod === "meu" ? gsStare.pornitLa : null, stPrefix: gsStare.mod === "meu" ? st : null, pozitiePionex: gsStare.mod === "meu" ? gsPozPionex() : null, n: 2000, seed: 12, orizonturi: GS_ORIZ, zile: 14 });   /* v100.350: de aici încolo din poziția Pionex */   // revizia (I2): ținta de pe prefix cu aceeași regulă ca rândul 0
    if (rez.eroare) throw new Error(rez.eroare);
    if (amprenta !== gsStare.mod + "|" + JSON.stringify(gsStare.st) + "|" + JSON.stringify(gsStare.plan)) throw new Error("Setarea s-a schimbat în timpul calculului: apasă din nou „Simulează”.");   // a doua plasă
    gsStare.rez = rez;
  } catch (e) { gsStare.eroare = e && e.message || String(e); }
  finally { gsStare.inLucru = false; }
  gsDeseneaza();
  var dupa = gsStare.dupa; gsStare.dupa = null; if (typeof dupa === "function") dupa();   // revizia (R9): ce s-a cerut în timpul simulării
  if (gsStare.rez && gsMeu()) gsHotPorneste();   /* v100.351: „Ce fac cu botul ăsta?” */
  else if (gsStare.rez && !gsStare.rez.acum) gsNoteazaVerdict();   /* v100.351 (ideea 3): verdictul de bot nou, urmărit pe ce a urmat */
}
// v100.135/136: rata reală a monedei (adusă de mcsAduCoin odată cu barele) ⇒ câmpul; lipsa ⇒ costul presupus (spus în notă)
function gsPuneFunding(sim, info) {
  if (info) { gsStare.fundingZi = info.rataZi; gsStare.fundingSursa = "pionex"; gsStare.fundingInfo = Object.assign({ sim: sim }, info); }
  else { gsStare.fundingZi = 0.0003; gsStare.fundingSursa = null; gsStare.fundingInfo = null; }   // revizia (R2): nu rămâne rata altei monede etichetată „reală”
  gsStare.fundingSim = sim;
}
// v100.135: „Compară variante” / „Compară ținte (TP)” (din Monte Carlo) pe setarea de aici, pe orizontul ales - la cerere (câteva secunde)
// revizia (R3): cu GridSim.compara (același motor și aceleași drumuri ca verdictul); (R8): doar pe moneda simulată
function gsStCuFunding() { return Object.assign({}, gsStare.st, { fundingZi: gsStare.fundingZi, fundingCost: gsStare.fundingSursa !== "pionex" && gsStare.fundingSursa !== "manual" }); }
function gsAltaMoneda() { return gsStare.date && gsStare.date.sim !== gsStare.sim ? "Ai schimbat moneda („" + gsStare.sim + "”): apasă Simulează întâi - comparațiile merg pe barele monedei simulate (" + gsStare.date.sim + ")." : null; }
// v100.136: la botul care rulează, „așa cum e” = botul cu pozițiile de acum (de aici încolo); celelalte = pornite acum, de la zero
function gsMeu() { return gsStare.mod === "meu" && !!(gsStare.rez && gsStare.rez.acum) && gsStare.pornitLa > 0; }
// v100.350 (auditul Simulatorului): câștigătorul de pe fiecare orizont, reluat pe 2.000 de drumuri NOI (sămânța 13), ca pe pagina Monte Carlo (MCS_VERIF):
// pe jumătatea acelorași drumuri recomanda fals în 1,6% în medie / 17% în cel mai rău caz, pe drumuri noi 0,5% / 8%. toate = GridSim.compara(...);
// alege(rânduri) ⇒ rândul ales sau null; pune x.verifOriz[z] = { n, seed, baza, g, drum } pe rândul câștigător (comparaLa îl duce în x.verif)
function gsPozPionex() { return gsStare.bot ? GridSim.setariDinBot(gsStare.bot).pozitie : null; }   /* v100.350: poziția botului în Pionex */
async function gsVerificaPeDrumuriNoi(b15, toate, lista, opt, alege) {   /* v100.351: în worker (întoarce o promisiune) */
  var ref = lista.filter(function (x) { return x.tu; })[0] || lista[0], peNume = {};
  GS_ORIZ.forEach(function (z) { var c = alege(GridSim.comparaLa(toate, z)); if (c && c.nume !== ref.nume) (peNume[c.nume] = peNume[c.nume] || []).push(z); });
  // revizia (R6): referința socotită O SINGURĂ dată, cu toți câștigătorii în același calcul (era o dată pe câștigător)
  var nume = Object.keys(peNume); if (!nume.length) return toate;
  var ws = nume.map(function (n) { return lista.filter(function (x) { return x.nume === n; })[0]; }).filter(Boolean);
  var rv = await gsInWorker("compara", b15, [ref].concat(ws.map(function (w) { return Object.assign({}, w, { tu: false }); })), Object.assign({}, opt, { n: MCS_VERIF.n, seed: MCS_VERIF.seed })); if (!Array.isArray(rv)) throw new Error(rv && rv.eroare || "verificarea n-a mers");
  ws.forEach(function (w, iw) {
    var rw = toate.filter(function (x) { return x.nume === w.nume; })[0]; if (!rw) return;
    rw.verifOriz = rw.verifOriz || {};
    peNume[w.nume].forEach(function (z) { var b = rv[0] && rv[0].gOriz[z], g = rv[iw + 1] && rv[iw + 1].gOriz[z]; rw.verifOriz[z] = !b || !g || b.eroare || g.eroare ? { n: MCS_VERIF.n, eroare: (b && b.eroare) || (g && g.eroare) || "fără rezultat" } : { n: MCS_VERIF.n, seed: MCS_VERIF.seed, baza: b, g: g, drum: rv[iw + 1].drumOriz[z] }; });
  });
  return toate;
}
function gsCompara() {
  var d = gsStare.date; if (!d || !gsStare.rez || gsStare.varianteInLucru) return;
  gsCiteste(true); var am = gsAltaMoneda(); if (am) { gsStare.varianteEroare = am; gsDeseneaza(); return; }
  gsStare.varianteInLucru = true; gsDeseneaza();
  var rez0 = gsStare.rez, st = gsStCuFunding(), zile = GS_ORIZ[gsStare.oriz] || 7, meu = gsMeu(), lista = mcsVariante(st, gsStare.pret).filter(function (x) { return !x.invalid; });   /* revizia (🔴2): rez0 = simularea pentru care se compară */   /* v100.350: fără variantele cu stopul / TP-ul de partea greșită */
  if (meu) lista[0].dinStare = true;
  (async function () {
    // revizia (I5): toate orizonturile dintr-un calcul; se citește cel ales ACUM (dacă s-a schimbat cât calculam, tot fără recalcul); v100.351: în worker
    try { var z0 = GS_ORIZ[gsStare.oriz] || zile; var opV = { n: 500, seed: 12, zile: 14, oriz: z0, orizonturi: GS_ORIZ, pornitLa: meu ? gsStare.pornitLa : null, stPrefix: st, pozitiePionex: meu ? gsPozPionex() : null }; var cv = await gsInWorker("compara", d.b15, lista, opV); if (!Array.isArray(cv)) throw new Error(cv && cv.eroare || "fără rezultat"); var vt = await gsVerificaPeDrumuriNoi(d.b15, cv, lista, opV, function (r) { return mcsAlegeVarianta(r).c; }); if (gsStare.rez !== rez0) { gsStare.varianteInLucru = false; return; } gsStare.varianteToate = vt; gsStare.variante = GridSim.comparaLa(gsStare.varianteToate, GS_ORIZ[gsStare.oriz] || z0); gsStare.varianteZile = GS_ORIZ[gsStare.oriz] || z0; gsStare.varianteEroare = null; } catch (e) { gsStare.variante = null; gsStare.varianteToate = null; gsStare.varianteEroare = "Variantele n-au mers: " + (e && e.message || e); }
    gsStare.varianteInLucru = false; gsDeseneaza();
  })();
}
function gsComparaTp() {
  var d = gsStare.date; if (!d || !gsStare.rez || gsStare.tinteBotInLucru) return;
  gsCiteste(true); var am = gsAltaMoneda(); if (am) { gsStare.tinteBotEroare = am; gsDeseneaza(); return; }
  gsStare.tinteBotInLucru = true; gsDeseneaza();
  var rez0 = gsStare.rez, P = gsStare.pret, st = GridSim.tpValid(gsStCuFunding(), P).st, zile = GS_ORIZ[gsStare.oriz] || 7, meu = gsMeu();
  // v100.136: ținta se schimbă pe botul care rulează ⇒ toate rândurile cu pozițiile de acum (ținta nouă abia de acum, pe prefix cea veche)
  var lista = mcsTinteBot(st, P).map(function (x) { return { nume: x.nume, tp: x.tp, tu: x.tu, dinStare: meu, st: Object.assign({}, st, { tp: x.tp }) }; });
  (async function () {
    try { var z0 = GS_ORIZ[gsStare.oriz] || zile; var opT = { n: 500, seed: 12, zile: 14, oriz: z0, orizonturi: GS_ORIZ, pornitLa: meu ? gsStare.pornitLa : null, stPrefix: st, pozitiePionex: meu ? gsPozPionex() : null }, sumaT = st.suma; var ct = await gsInWorker("compara", d.b15, lista, opT); if (!Array.isArray(ct)) throw new Error(ct && ct.eroare || "fără rezultat"); var tt = await gsVerificaPeDrumuriNoi(d.b15, ct, lista, opT, function (r) { var t = mcsAlegeTp(r, sumaT); return t.ok || t.prot; }); if (gsStare.rez !== rez0) { gsStare.tinteBotInLucru = false; return; } gsStare.tinteBotToate = tt; gsStare.tinteBot = GridSim.comparaLa(gsStare.tinteBotToate, GS_ORIZ[gsStare.oriz] || z0); gsStare.tinteBotZile = GS_ORIZ[gsStare.oriz] || z0; gsStare.tinteBotEroare = null; } catch (e) { gsStare.tinteBot = null; gsStare.tinteBotToate = null; gsStare.tinteBotEroare = "Țintele n-au mers: " + (e && e.message || e); }
    gsStare.tinteBotInLucru = false; gsDeseneaza();
  })();   /* v100.351: în worker */
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
function gsOriz(i) {
  gsCiteste(true); gsStare.oriz = Number(i) >= 0 && Number(i) < GS_ORIZ.length ? Number(i) : 2;
  // v100.136 (revizia I5): comparațiile sunt calculate pe toate orizonturile - aici doar se citește cel ales, fără recalcul (era 1-2 s pe clic)
  var z = GS_ORIZ[gsStare.oriz];
  if (gsStare.varianteToate) { gsStare.variante = GridSim.comparaLa(gsStare.varianteToate, z); gsStare.varianteZile = z; }
  if (gsStare.tinteBotToate) { gsStare.tinteBot = GridSim.comparaLa(gsStare.tinteBotToate, z); gsStare.tinteBotZile = z; }
  gsDeseneaza();
}
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
  if (e.target.classList && e.target.classList.contains("gsRand") && e.target.getAttribute("data-oriz") !== null) { e.preventDefault(); gsOriz(Number(e.target.getAttribute("data-oriz"))); return; }   // v100.350: rândurile din „Pe durate” și cu tastatura
  var id = e.target.id || "";
  if (/^gs(Sim|Jos|Sus|Linii|Lev|Stop|Tp|Suma|PlanMinus|PlanPlus|Funding)$/.test(id)) { e.preventDefault(); gsSimuleaza(); }
}
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", gsTasta);
