// Pagina „Range Filter” (v100.300; el, 04.11.2026: „integrează și în Crypto Radar ca dash și în panel”) - partea de ECRAN: aduce lumânările
// (1h sau 4h) pentru monedele tale (boții activi + BTC / ETH / SOL + top 20 din clasament, ca Trade-ul zilei), le trece prin RangeFilter
// (lib/range-filter.js, pur, același motor ca Pine v2.5 / v2.6) și desenează câte un dash pe monedă: VERDICT · TRIGGER · CE FAC? · LOC · BANDA · REGIM ·
// MA · APRINDERE · DOVADA · SEMNAL. rfHtml e fără DOM (proba o rulează în vm); rfPorneste leagă pagina. Același calcul dă rândul „Range Filter”
// din citirea Tabloului botului (app.js, tbCitireExtra → RangeFilter.citire pe lumânările botului).
// Cinstit: nimic dovedit în proba din 04.11 - e un colorant de trend, nu un semnal; rândul DOVADA o spune pe fiecare monedă.
// v100.301 (auditul din aceeași seară, „auditează și îmbunătățește”): cache pe interval (1h ↔ 4h fără cereri noi), ordinea cartelelor
// (boții → semnale din ultimele 3 bare → restul) + filtre, „DOVADA pe 1.000 de bare” (a doua pagină cu endTime, opt-in: 2 cereri / monedă),
// „Contra boților” în rezumat, ora barei următoare, intro-ul pliat, refuzul Pionex citit din răspuns (200 {result:false}).
// v100.302 (re-auditul din 05.11.2026, „reauditează … optimizează … idei” + „pune și o căsuță unde să analizez o monedă anume”):
// căsuța „Analizează o monedă” (perp, apoi spot), DOVEDIT corectat pentru câte monede se văd (Bonferroni), textele cinstite (SEMNAL pe bara
// închisă, flip la X ATR, pragul costului exact, „k din n” sub 20 de cazuri), căderea parțială la vedere, cache-ul până la închiderea barei,
// lumânările ținute pe (monedă, interval), redesenarea pe zone (intro-ul deschis și căsuța în care scrii rămân), butoanele oprite cât citește.
var rfStare = { monede: [], la: 0, inLucru: false, eroare: null, simboluri: [], tf: "60M", filtru: "toate", adanc: false, perTf: {}, partial: false, botiPicat: false,
  cauta: { text: "", simbol: null, tf: null, inLucru: false, m: null, eroare: null } };
var RF_TF = { "60M": { eticheta: "1h", bare: 500, ms: 3600000 }, "4H": { eticheta: "4h", bare: 500, ms: 14400000 } };
var RF_PAUZA_MS = 0;     // v100.302: serverul ține deja ≥ 1,1 s între cererile spre Pionex (functions/api/market.js) și 90 s de cache ⇒ pauza din pagină doar întârzia
var RF_MAX = 30;
var RF_PROASPAT = 3;     // semnal „proaspăt” = în ultimele 3 bare închise
// v100.304 (I-808): lumânările pe (monedă, interval) stau în lib/lumanari.js - un singur cache cu Tabloul și Trade-ul zilei
var rfZMonede = 1;       // câte monede intră în corecția DOVEZII (ultima pagină desenată)
try { rfStare.cauta.text = localStorage.getItem("rf_cauta") || ""; } catch (e) {}
// v100.304 (I-807): ultimele 5 căutări reușite (doar în browserul lui) + listele de simboluri Pionex (sugestii și verificare fără cereri)
var RF_ULTIME = 5, rfSimProm = null, rfSimEsecLa = 0;
function rfUltimeCiteste() {
  try { var a = JSON.parse(localStorage.getItem("rf_cautari") || "[]"); return Array.isArray(a) ? a.filter(function (s) { return typeof s === "string" && /^[A-Z0-9]{1,15}$/.test(s); }).slice(0, RF_ULTIME) : []; } catch (e) { return []; }
}
rfStare.ultime = rfUltimeCiteste();
rfStare.pionexSim = null;
function rfUltimeAdauga(sim) {
  rfStare.ultime = [sim].concat((rfStare.ultime || []).filter(function (s) { return s !== sim; })).slice(0, RF_ULTIME);
  try { localStorage.setItem("rf_cautari", JSON.stringify(rfStare.ultime)); } catch (e) {}
}
function rfEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
// regula casei (03.10): rezultatele cu O SINGURĂ zecimală, minusul tipografic („−0,8”), „12,4%” - prin TextRo (revizia Opus 04.11)
function rfNr(v, zec) { return TextRo.num(v, zec == null ? 1 : zec); }
function rfPct(v, zec) { return v == null || !isFinite(v) ? "—" : TextRo.pct(v * 100, zec == null ? 1 : zec); }
// v100.304 (I-806): rezultatul în R, cu semn și O zecimală („+1,2R”, „−0,8R”), ca eticheta jurnalului din Pine
function rfR(v) { if (v == null || !isFinite(v)) return "—"; var s = TextRo.num(v, 1); return (v > 0 && s !== "0,0" ? "+" : "") + s + "R"; }
// v100.302: căsuța aduce și monede foarte ieftine (PEPE 0,0000053) ⇒ sub 0,01 prețul ține 3 cifre semnificative, nu 6 zecimale fixe
function rfPret(p) { if (!(p > 0)) return "—"; var z = p < 0.01 ? Math.min(12, 2 - Math.floor(Math.log10(p))) : p < 1 ? 4 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
function rfOra(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return "—"; } }
function rfPauza(ms) { return ms > 0 ? new Promise(function (r) { setTimeout(r, ms); }) : Promise.resolve(); }
function rfBara(v, vmax) { var n = v == null || !isFinite(v) || !(vmax > 0) ? 0 : Math.min(8, Math.max(0, Math.round(Math.abs(v) / vmax * 8))), s = ""; for (var i = 0; i < 8; i++) s += i < n ? "█" : "·"; return s; }
function rfBare(v, cls) { return '<span class="rfBara ' + (cls || "") + '" aria-hidden="true">' + v + "</span>"; }
// v100.301: direcția boților (LONG / SHORT) pe moneda lor, ca rezumatul să spună „contra boților”; v100.302: LONG + SHORT pe aceeași monedă = AMBELE
function rfDirectiiBoti(boti) {
  var d = {};
  (boti || []).forEach(function (b) {
    if (!b || !b.activ || !b.baza) return;
    var s = typeof TabloBot !== "undefined" && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    var n = String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase();
    var dir = String(b.directie || b.direction || "").toUpperCase();   // tbStare.boti și /api/bot-orders scriu „LONG” / „SHORT”; la nevoie și minuscule
    if (dir === "LONG" || dir === "SHORT") d[n] = d[n] && d[n] !== dir ? "AMBELE" : dir;
  });
  return d;
}
function rfSimboluri(boti, clasament) {
  if (typeof tzSimboluri === "function") return tzSimboluri(boti, clasament).slice(0, RF_MAX);
  return ["BTC", "ETH", "SOL"].map(function (m) { return { simbol: m, pionex: m + "_USDT_PERP", fel: "piata" }; });
}
// v100.302: lista boților ca în Trade-ul zilei, dar spune și când n-a putut fi citită („Niciun bot activ” nu mai minte la o cădere)
async function rfBotiActivi() {
  if (typeof tzBotiActivi !== "function") return { boti: [], picat: false };
  var boti = typeof tbStare !== "undefined" && tbStare.boti && tbStare.boti.length ? tbStare.boti : (typeof contTot !== "undefined" && contTot && contTot.boti && contTot.boti.length ? contTot.boti : null);
  if (boti) return { boti: boti, picat: false };
  try { var bo = await getJSON("/api/bot-orders"); return { boti: bo && bo.bots || [], picat: !bo || !Array.isArray(bo.bots) }; } catch (e) { return { boti: [], picat: true }; }
}
function rfProaspat(m) { return !!(m.c && !m.c.eroare && m.c.semnal && m.c.semnal.acum <= RF_PROASPAT); }
// necitită = citirea a CĂZUT (Pionex / rețea); o monedă listată de curând („prea puține lumânări”) nu e o cădere și „Recitește” n-o repară (revizia v100.302)
function rfNecitite(monede) { return (monede || []).filter(function (m) { return m.eroare || !m.c || (m.c.eroare && !m.c.scurt); }).length; }
// v100.301: ordinea cartelelor - boții tăi, apoi semnalele proaspete (cele mai noi primele), apoi restul în ordinea listei; stabil
function rfOrdoneaza(monede) {
  return monede.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) {
    var ra = a.m.fel === "bot" ? 0 : rfProaspat(a.m) ? 1 : 2, rb = b.m.fel === "bot" ? 0 : rfProaspat(b.m) ? 1 : 2;
    if (ra !== rb) return ra - rb;
    if (ra === 1) return a.m.c.semnal.acum - b.m.c.semnal.acum;
    return a.i - b.i;
  }).map(function (x) { return x.m; });
}
function rfFiltreaza(monede, filtru) {
  if (filtru === "semnale") return monede.filter(rfProaspat);
  if (filtru === "boti") return monede.filter(function (m) { return m.fel === "bot"; });
  return monede;
}
// v100.302: DOVEDIT corectat pentru câte monede se văd pe pagină (Bonferroni pe marginea Wilson): cu 1,96 pe fiecare din 30 de monede,
// ~16 % din pagini aveau un DOVEDIT din noroc (simulare H0 în re-audit); intră doar monedele care au măcar 20 de cazuri
function rfZPagina(monede, minim) {
  rfZMonede = Math.max(1, minim || 0, (monede || []).filter(function (x) { return x && x.c && !x.c.eroare && x.c.dovada && x.c.dovada.n >= RangeFilter.MIN_EP; }).length);
  return RangeFilter.zBonf(rfZMonede);
}
// revizia v100.302: cât citește, corecția pornește de la TOATE monedele care vor veni (altfel primele cartele stăteau ~30 s cu z = 1,96);
// moneda căutată intră o singură dată și doar pe intervalul paginii
function rfZPaginaSt(st) {
  var q = st.cauta || {}, mon = st.monede || [];
  var extra = q.m && q.m.tf === st.tf && !mon.some(function (x) { return x.simbol === q.m.simbol; }) ? [q.m] : [];
  return rfZPagina(mon.concat(extra), st.inLucru ? (st.simboluri || []).length + extra.length : 0);
}
function rfDovedit(d, z) { return !!(d && d.n >= RangeFilter.MIN_EP && d.k != null && RangeFilter.wilsonLo(d.k, d.n, z) > 0.5); }
// textele unei citiri (fără DOM): verdict, trigger, ce fac, rândurile; z = pragul DOVEZII pe pagina asta
function rfTexte(c, z) {
  z = z > 0 ? z : 1.96;
  var dirTxt = c.dir === 1 ? "TREND SUS" : c.dir === -1 ? "TREND JOS" : "FĂRĂ DIRECȚIE";
  var verdict = dirTxt + (c.dir ? (c.bareDir > 0 ? " · de " + TextRo.cate(c.bareDir, "bară", "bare") : " · întors pe ultima bară") : "") + (c.regim.cons ? " · consolidare" : "");
  var d = c.dovada, dov = rfDovedit(d, z), prag = TextRo.pct(2 * c.cost * 100, 2), buy = c.semnalAcum && c.semnal && c.semnal.fel === "BUY", dc = c.dupaCost;
  // v100.302: barele sunt ÎNCHISE (până la o oră / 4 ore în urmă) ⇒ „SEMNAL … pe ultima bară închisă”, nu „GO … ACUM”
  var trig = c.semnalAcum ? "SEMNAL " + c.semnal.fel + " pe ultima bară închisă" + (c.costNu ? " · NU TRECE" : "") : c.trigger.text;
  var trigR = c.costNu ? "stop la " + rfPct(c.distPct) + " < prag " + prag + " (2× cost) ⇒ NU TRECE" : "stop (filtru) la " + rfPct(c.distPct);
  var ceFac = c.semnalAcum ? (c.costNu ? "semnal, dar stopul nu acoperă costul - nu intru" : (buy ? "dacă intri: LONG cu stopul sub filtru" : "dacă intri: SHORT cu stopul peste filtru") + "; tratează-l ca direcție, nu ca dovadă")
    : c.dir ? "nu alerg după preț: aștept flip sau alt indicator care să confirme" : "fără direcție";
  if (c.semnalAcum && c.regim.cons) ceFac += " · semnal în consolidare (în probă, mai slab pe 4h)";
  ceFac += dov ? " · DOVADA e pe direcție, fără cost" : " · DOVADA: nedovedit pe moneda asta";
  var lo = d.n ? RangeFilter.wilsonLo(d.k, d.n, z) * 100 : null;
  var dovR = d.n === 0 ? "niciun semnal încheiat încă" : d.n < RangeFilter.MIN_EP ? TextRo.cate(d.n, "caz", "cazuri") + " · PUȚINE CAZURI" + (c.n < 900 && !c.doar500 ? " · pornește „DOVADA pe 1.000 de bare”" : "")
    : TextRo.cate(d.n, "caz", "cazuri") + " · marginea de jos " + rfNr(lo, 0) + " · " + (dov ? "DOVEDIT" : "NEDOVEDIT") + (z > 1.97 ? " (corectat pe " + TextRo.cate(rfZMonede, "monedă", "monede") + ")" : "");
  var ma = c.ma, maTxt = ma.col > 0 ? "VERDE" : ma.col < 0 ? "ROȘU" : "NEUTRU", maR = ma.aliniata ? "aliniată cu RF · în probă n-a ajutat (47% față de 50%)" : ma.col === 0 ? "neutră" : "contra RF";
  // v100.306 (I-836, auditul final 05.11): RF e un colorant de trend NEDOVEDIT (proba din 04.11) ⇒ cartela, TRIGGER și SEMNAL fără verde / roșu de
  // verdict („SEMNAL SELL” roșu sub „nedovedit” se citea ca un sfat); rândurile care descriu (LOC, REGIM, MA) își păstrează culorile
  return {
    verdict: verdict, ton: "fara",
    trigger: trig, triggerTon: c.semnalAcum && c.costNu ? "atentie" : "fara", triggerR: trigR,
    ceFac: ceFac,
    loc: (c.distAtr == null ? "—" : (c.distAtr >= 0 ? "+" : "") + rfNr(c.distAtr) + " ATR"),
    // v100.302: direcția se întoarce abia la banda OPUSĂ (filtru ∓ r), nu la filtru ⇒ „flip la X ATR” (fraza veche lega flip-ul de filtru: falsă)
    locR: c.distAtr == null ? "-" : (Math.abs(c.distAtr) < 0.5 ? "lipit de filtru (stopul)" : c.distAtr > 0 ? "peste filtru" : "sub filtru") + (c.flipAtr != null ? " · flip la " + rfNr(c.flipAtr) + " ATR" : ""),
    locTon: c.distAtr == null ? "fara" : Math.abs(c.distAtr) < 0.5 ? "atentie" : c.distAtr > 0 ? "sus" : "jos",
    banda: c.bandAtr == null ? "—" : rfNr(c.bandAtr) + " ATR", bandaR: c.bandMed == null ? "-" : "de obicei " + rfNr(c.bandMed) + (c.bandAtr > c.bandMed * 1.3 ? " · largă (semnal rar)" : c.bandAtr < c.bandMed * 0.7 ? " · îngustă (flip mai ușor)" : " · normală"),
    regim: (c.regim.cons ? "CONSOLIDARE" : "TREND") + (c.regim.ang == null ? "" : " · " + (c.regim.ang >= 0 ? "+" : "") + rfNr(c.regim.ang, 0) + "°"), regimR: c.regim.consPct == null ? "-" : "consolidare " + TextRo.pct(c.regim.consPct, 0) + " din bare (proba: 57%)", regimTon: c.regim.cons ? "atentie" : c.regim.ang == null ? "fara" : c.regim.ang > 0 ? "sus" : "jos",
    ma: maTxt + (ma.distAtr == null ? "" : " · " + (ma.distAtr >= 0 ? "+" : "") + rfNr(ma.distAtr) + " ATR"), maR: maR, maTon: ma.col > 0 ? "sus" : ma.col < 0 ? "jos" : "fara",
    aprindere: c.aprindere ? (c.aprindere.acum === 0 ? "ACUM " : "acum " + TextRo.cate(c.aprindere.acum, "bară", "bare") + " · ") + c.aprindere.fel : "-", aprindereR: c.aprindere ? "24/7 · proba: nedovedit" : "nicio aprindere încă",
    // v100.302: sub 20 de cazuri „k din n” (procentul pe 7 cazuri doar impresionează), peste - procentul ținut între 1 și 99
    dovada: !d.n ? "-" : (d.n < RangeFilter.MIN_EP ? d.k + " din " + d.n : rfNr(Math.min(99, Math.max(1, d.hit)), 0) + " din 100") + " (direcția, fără cost)",
    dovadaR: dovR, dovadaTon: d.n === 0 ? "fara" : dov ? "sus" : d.n < RangeFilter.MIN_EP ? "atentie" : "jos",
    // v100.304 (I-806): DUPĂ COST - mediana în R pe ultimele 50 de semnale care trec de cost, ultimele 5; sub 20 „puține cazuri”
    dupaCost: !dc || !dc.n ? "-" : "mediana " + rfR(dc.mediana) + (dc.nTot > 50 ? " pe ultimele 50 de semnale" : " pe " + TextRo.cate(dc.nTot, "semnal", "semnale")) + (dc.nTot < RangeFilter.MIN_EP ? " (puține cazuri)" : ""),
    dupaCostR: !dc || !dc.n ? "niciun semnal încheiat care să treacă de cost" : "ultimele: " + dc.ultime.map(rfR).join(" · "),
    // revizia Opus: fără verde / roșu - pe 30 de monede jumătate ar ieși „verzi” din noroc, lângă DOVADA care cere Wilson + Bonferroni
    dupaCostTon: dc && dc.n && dc.nTot < RangeFilter.MIN_EP ? "atentie" : "fara",
    semnal: c.semnal ? c.semnal.fel + (c.semnal.acum === 0 ? " pe ultima bară închisă" : " acum " + TextRo.cate(c.semnal.acum, "bară", "bare")) : "-", semnalR: c.semnal ? "la " + rfPret(c.semnal.pret) : "", semnalTon: "fara",
    detalii: "semnale " + rfNr(c.sigPer100) + " / 100 de bare (proba: 2,45) · ținere mediană " + (c.tinere == null ? "—" : TextRo.cate(Math.round(c.tinere), "bară", "bare")) + " (proba: 34) · whipsaw " + (c.whipPct == null ? "—" : TextRo.pct(c.whipPct, 1)) + " (proba: 1%)" + " · " + TextRo.cate(c.n, "bară închisă", "bare închise") + (c.doar500 ? " · a doua pagină n-a venit: doar primele 500" : "")
  };
}
function rfRand(et, bara, val, ton, reper, tip) {
  return '<div class="rfRand"' + (tip ? ' title="' + rfEsc(tip) + '"' : "") + '><span class="rfEt">' + rfEsc(et) + "</span>" + (bara != null ? rfBare(bara, "rfTon-" + ton) : '<span class="rfBara rfGol" aria-hidden="true"></span>') + '<b class="rfVal rfTon-' + ton + '">' + rfEsc(val) + "</b>" + (reper ? '<span class="rfMut rfMic">' + rfEsc(reper) + "</span>" : "") + "</div>";
}
function rfCartela(m, z) {
  var contra = m.fel === "bot" && (m.directie === "LONG" || m.directie === "SHORT") && m.c && !m.c.eroare && ((m.c.dir === 1 && m.directie === "SHORT") || (m.c.dir === -1 && m.directie === "LONG"));
  var eticheta = m.fel === "bot" ? '<span class="rfEticheta' + (contra ? " rfContra" : "") + '">' + (contra ? "botul tău · CONTRA" : "botul tău" + (m.directie === "AMBELE" ? " · LONG + SHORT" : m.directie ? " · " + m.directie : "")) + "</span>" : m.fel === "cautata" ? '<span class="rfEticheta rfCautataEt">căutată · ' + rfEsc((RF_TF[m.tf] || {}).eticheta || "") + "</span>" : "";
  var h = '<article class="rfCard' + (m.eroare || !m.c || m.c.eroare ? " rfCardGol" : "") + (m.fel === "bot" ? " rfCardBot" : "") + (rfProaspat(m) ? " rfCardProaspat" : "") + '" aria-label="' + rfEsc(m.simbol) + '">';
  h += '<div class="rfCardCap"><b class="rfSimbol">' + rfEsc(m.simbol) + "</b>" + eticheta + (rfProaspat(m) ? '<span class="rfEticheta rfProaspatEt">semnal nou</span>' : "") + '<span class="rfMut rfMic">' + (m.c && m.c.pret ? rfPret(m.c.pret) + " USDT" + (m.fel === "cautata" && !/_PERP$/.test(m.pionex || "") ? " · spot" : "") : "") + "</span></div>";
  if (m.eroare || !m.c || m.c.eroare) { h += '<p class="rfMut">' + rfEsc(m.eroare || (m.c && m.c.eroare) || "fără date") + "</p></article>"; return h; }
  var c = m.c, t = rfTexte(c, z), prag = TextRo.pct(2 * c.cost * 100, 2);
  h += '<div class="rfHero rfHero-' + t.ton + '"><span class="rfColorant">colorant de trend (nedovedit)</span>' + rfEsc(t.verdict) + "</div>";
  h += rfRand("TRIGGER", null, t.trigger, t.triggerTon, t.triggerR, "SEMNAL doar pe bara închisă; NU TRECE când stopul la filtru nu acoperă de două ori costul (prag " + prag + ").");
  h += '<div class="rfRand"><span class="rfEt">CE FAC?</span><span class="rfBara rfGol" aria-hidden="true"></span><span class="rfCe">' + rfEsc(t.ceFac) + "</span></div>";
  h += rfRand("LOC", rfBara(c.distAtr, 2), t.loc, t.locTon, t.locR, "Distanța de la close la filtru, în ATR(14). Filtrul e stopul (invalidarea semnalului); direcția se întoarce abia când close trece de banda opusă (filtru ∓ r): „flip la X ATR”.");
  h += rfRand("BANDA", rfBara(c.bandAtr, 2), t.banda, c.bandMed == null ? "fara" : c.bandAtr > c.bandMed * 1.3 ? "atentie" : "fara", t.bandaR, "Lățimea benzii moarte (r) în ATR(14), față de mediana ei pe 100 de bare.");
  h += rfRand("REGIM", rfBara(c.regim.ang, 45), t.regim, t.regimTon, t.regimR, "Trender: unghiul pantei EMA(hl2,5) / ATR; CONSOLIDARE = media |unghi| pe 5 < pe 9 (panta scade). În probă: 57% din bare.");
  h += rfRand("MA", rfBara(c.ma.distAtr, 2), t.ma, t.maTon, t.maR, "EMA(hl2,15): verde = urcă ȘI close peste; roșu = coboară ȘI close sub. În probă alinierea NU a ajutat (47% față de 50%).");
  h += rfRand("APRINDERE", null, t.aprindere, c.aprindere && c.aprindere.acum === 0 ? (c.aprindere.fel === "SUS" ? "sus" : "jos") : "fara", t.aprindereR, "Trender Ignition: close trece peste / sub EMA(hl2,5), close peste / sub EMA(hl2,48), fără consolidare. În probă: nedovedit.");
  h += rfRand("DOVADA", rfBara(c.dovada.n >= RangeFilter.MIN_EP ? c.dovada.hit : null, 100), t.dovada, t.dovadaTon, t.dovadaR, "Cât din semnalele BUY / SELL de pe moneda asta au mers în direcția lor după " + TextRo.cate(RangeFilter.DIRH, "bară", "bare") + " (direcția, fără cost). DOVEDIT doar cu cel puțin " + TextRo.cate(RangeFilter.MIN_EP, "caz", "cazuri") + " și marginea Wilson peste 50, corectată pentru câte monede se văd pe pagină." + (c.n < 900 ? " Pe 500 de bare ies ~10 cazuri; pe 1.000 ~20 (adesea mai puține)." : ""));
  h += rfRand("DUPĂ COST", c.dupaCost && c.dupaCost.n ? rfBara(c.dupaCost.mediana, 2) : null, t.dupaCost, t.dupaCostTon, t.dupaCostR, "Rezultatul fiecărui semnal după " + TextRo.cate(RangeFilter.DIRH, "bară", "bare") + ", în R după cost (" + TextRo.pct(c.cost * 100, 2) + " dus-întors): R = distanța close → filtru la semnal. FĂRĂ stop: ținut " + TextRo.cate(RangeFilter.DIRH, "bară", "bare") + ", poate ieși sub −1R. Fără semnalele cu stopul sub 2× cost (CE FAC? le refuză). Mediana ultimelor 50, ca rândul „ULTIMELE 5” din Pine. Nu e o poartă de intrare: nimic nu s-a dovedit.");
  h += rfRand("SEMNAL", null, t.semnal, t.semnalTon, t.semnalR, "");
  h += '<p class="rfMut rfMic">' + rfEsc(t.detalii) + "</p>";
  h += '<div class="rfAct"><button class="acBtn" type="button" data-action-click="rfLaGrid(\'' + rfEsc(m.pionex) + '\')">Grid: ce setez? →</button></div>';
  return h + "</article>";
}
function rfRezumat(monede) {
  var ok = monede.filter(function (m) { return m.c && !m.c.eroare; });
  if (!ok.length) return "";
  var sus = ok.filter(function (m) { return m.c.dir === 1; }).length, jos = ok.filter(function (m) { return m.c.dir === -1; }).length;
  var proaspete = ok.filter(rfProaspat).map(function (m) { return m.simbol + " " + m.c.semnal.fel; });
  var cons = ok.filter(function (m) { return m.c.regim.cons; }).length;
  var contra = ok.filter(function (m) { return m.fel === "bot" && m.directie && ((m.c.dir === 1 && m.directie === "SHORT") || (m.c.dir === -1 && m.directie === "LONG")); }).map(function (m) { return m.simbol + " (" + m.directie.toLowerCase() + ", RF " + (m.c.dir === 1 ? "sus" : "jos") + ")"; });
  // v100.306 (I-836): consolidarea se suprapune cu trendul (o monedă e și „jos”, și „în consolidare”) ⇒ „0 din 20 sus, 20 jos, 2 în consolidare”
  // adunau 22 din 20; acum consolidarea e spusă ca parte din ele, iar cele fără direcție se numără separat
  var fara = ok.length - sus - jos, nr = function (n) { return n ? String(n) : "niciuna"; };
  var t = "Din " + TextRo.cate(ok.length, "monedă", "monede") + ": " + nr(sus) + " în trend sus, " + nr(jos) + " în trend jos" + (fara > 0 ? ", " + fara + " fără direcție" : "") + (cons ? "; " + (cons === 1 ? "una" : cons) + " dintre ele în consolidare" : "") + ".";
  if (proaspete.length) t += " Semnale din ultimele " + TextRo.cate(RF_PROASPAT, "bară", "bare") + ": " + proaspete.join(", ") + ".";
  t += contra.length ? " Contra boților tăi: " + contra.join(", ") + " (RF e nedovedit: de privit, nu de închis botul)." : (ok.some(function (m) { return m.fel === "bot" && m.directie; }) ? " Niciun bot de-al tău contra direcției RF." : "");
  return '<p class="rfRezumat">' + rfEsc(t) + "</p>";
}
// v100.301: ora la care se închide bara următoare (din ultima bară închisă + interval); `time` de la Pionex = ora de DESCHIDERE (probat pe viu 05.11)
function rfUrmatoarea(st) {
  var tf = RF_TF[st.tf] || RF_TF["60M"], t = 0;
  (st.monede || []).forEach(function (m) { if (m.c && !m.c.eroare && m.c.t > t) t = m.c.t; });
  return t > 0 ? t + 2 * tf.ms : 0;   // ultima închisă + bara în curs
}
// ── zonele paginii (v100.302): la fiecare monedă citită se refac doar antetul, filtrele și corpul; intro-ul și căsuța rămân neatinse ──
function rfHtmlAntet(st) {
  var tf = RF_TF[st.tf] || RF_TF["60M"], urm = rfUrmatoarea(st), dis = st.inLucru ? " disabled" : "", sim = st.simboluri || [];
  var h = '<h3>Range Filter</h3><span class="rfMut rfMic" id="rfCand">' + (st.la ? "citit la " + rfOra(st.la) + " · " + tf.eticheta + (urm ? " · bara următoare se închide la " + rfOra(urm) : "") : tf.eticheta) + (st.inLucru && sim.length ? " · citesc " + (st.monede || []).length + " / " + sim.length : "") + '</span><div class="rfDr">';
  h += '<span class="rfTf" role="group" aria-label="Interval">' + Object.keys(RF_TF).map(function (k) { return '<button class="acBtn' + (st.tf === k ? " rfTfOn" : "") + '" type="button" data-action-click="rfTf(\'' + k + '\')"' + dis + ">" + RF_TF[k].eticheta + "</button>"; }).join("") + "</span>";
  h += '<button class="acBtn' + (st.adanc ? " rfTfOn" : "") + '" type="button" data-action-click="rfAdanc()"' + dis + ' title="A doua pagină de lumânări (1.000 în loc de 500): DOVADA ajunge la ~20 de cazuri (adesea mai puține). O cerere în plus pe monedă spre Pionex.">DOVADA pe 1.000 de bare' + (st.adanc ? " ✓" : "") + "</button>";
  h += '<button class="acBtn" type="button" data-action-click="rfPorneste(true)"' + dis + ">" + (st.inLucru ? "citesc…" : "↻ Recitește") + "</button></div>";
  return h;
}
function rfHtmlFiltre(st) {
  var fil = [["toate", "Toate"], ["semnale", "Semnale noi"], ["boti", "Boții tăi"]];
  return fil.map(function (f) { return '<button class="acBtn' + (st.filtru === f[0] ? " rfTfOn" : "") + '" type="button" data-action-click="rfFiltru(\'' + f[0] + '\')">' + f[1] + "</button>"; }).join("");
}
// v100.304 (I-807): sugestiile = monedele de tranzacționat (perp TRADING + spot enable), pe USDT, fără sufix
function rfOptiuni(sim) { return sim && sim.lista ? sim.lista.map(function (s) { return '<option value="' + rfEsc(s) + '">'; }).join("") : ""; }
function rfHtmlCauta(st) {
  var q = st.cauta || {};
  return '<label class="rfEt" for="rfCautaIn">ANALIZEAZĂ O MONEDĂ</label><input id="rfCautaIn" class="rfCautaIn" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" placeholder="ex. PEPE, WIF, ARB" list="rfMonede" data-action-input="rfCautaScrie()" value="' + rfEsc(q.text || "") + '">'
    + '<datalist id="rfMonede">' + rfOptiuni(st.pionexSim) + "</datalist>"
    + '<button class="acBtn" id="rfCautaBtn" type="button" data-action-click="rfCauta()"' + (q.inLucru ? " disabled" : "") + ">Analizează</button>"
    + '<span class="rfMut rfMic">pe intervalul ales; perp, iar dacă Pionex n-are perp, spot</span>';
}
// v100.304 (I-807): ultimele căutări reușite ca butoane, sub căsuță, în zona LOR (rfZonaUltime): se rescrie doar când se schimbă lista sau
// starea căutării - nu la fiecare monedă citită, unde un clic apăsat înainte și eliberat după rescriere s-ar pierde (revizia Opus)
function rfHtmlUltime(st) {
  var a = (st.ultime || []).filter(function (s) { return typeof s === "string" && /^[A-Z0-9]{1,15}$/.test(s); }).slice(0, RF_ULTIME);
  if (!a.length) return "";
  var dis = st.cauta && st.cauta.inLucru ? " disabled" : "";
  return '<div class="rfUltime"><span class="rfMut rfMic">ultimele căutate:</span>' + a.map(function (s) { return '<button class="acBtn rfUltimaBtn" type="button" data-action-click="rfCautaDin(\'' + rfEsc(s) + '\')"' + dis + ">" + rfEsc(s) + "</button>"; }).join("") + "</div>";
}
function rfHtmlCautaRez(st) {
  var q = st.cauta || {};
  if (q.inLucru) return '<p class="rfMut">Citesc ' + rfEsc(q.simbol || "") + "…</p>";
  var h = q.eroare ? '<p class="rfRau">' + rfEsc(q.eroare) + "</p>" : "";
  if (q.m) h += '<div class="rfGrila rfGrilaCautata">' + rfCartela(q.m, rfZPaginaSt(st)) + "</div>";
  return h;
}
function rfHtmlCorp(st) {
  if (st.inLucru && !st.monede.length) return '<p class="rfMut">Aduc lumânările…</p>';
  if (st.eroare && !st.monede.length) return '<p class="rfRau">' + rfEsc(st.eroare) + ' <button class="acBtn" type="button" data-action-click="rfPorneste(true)">Încearcă din nou</button></p>';
  if (!st.monede.length) return '<p class="rfMut">Nicio monedă încă - apasă „Recitește”.</p>';
  var z = rfZPaginaSt(st), lista = rfFiltreaza(rfOrdoneaza(st.monede), st.filtru), nErr = rfNecitite(st.monede);
  var h = (st.eroare ? '<p class="rfRau">' + rfEsc(st.eroare) + "</p>" : "") + rfRezumat(st.monede) + (st.inLucru ? '<p class="rfMut rfMic">Mai citesc… ' + st.monede.length + " / " + st.simboluri.length + "</p>" : "");
  if (lista.length) return h + '<div class="rfGrila">' + lista.map(function (m) { return rfCartela(m, z); }).join("") + "</div>";
  return h + '<p class="rfMut">' + (st.filtru === "semnale" ? "Niciun semnal în ultimele " + TextRo.cate(RF_PROASPAT, "bară", "bare") + "." : "Niciun bot activ" + (st.botiPicat ? " (lista boților nu s-a putut citi acum)" : "") + ".")
    + (nErr ? " Atenție: " + TextRo.cate(nErr, "monedă necitită", "monede necitite") + " - apasă „Recitește”." : "") + "</p>";
}
function rfHtml(st) {
  var h = '<div class="rfAntet" id="rfZonaAntet">' + rfHtmlAntet(st) + "</div>";
  h += '<details class="rfIntro"><summary>Range Filter (DonovanWall) + Trender pe monedele tale - același motor ca scriptul din TradingView. Cinstit: în probă NIMIC nu s-a dovedit; e un colorant de trend, nu un semnal. <span class="rfMut">(mai mult)</span></summary>';
  h += '<p>Direcția filtrului cu bandă moartă (TREND SUS / JOS), semnalul BUY / SELL la schimbarea ei, distanța până la filtru (stopul) și până la flip, lățimea benzii, regimul (consolidare după panta MA), MA colorată, aprinderea. Același motor ca Range Filter B&S v2.5 / v2.6 din TradingView. ';
  h += "Proba din 04.11.2026 (Binance perp, 21 de perechi, 1h + 4h, după cost): semnalul nu plătește, direcția nimerește 48% la 10 bare, aprinderea nu plătește. E un colorant de trend curat (2,45 semnale / 100 de bare, whipsaw 1%), bun ca filtru de direcție lângă altceva, nu ca semnal singur. Rândul DOVADA o măsoară pe fiecare monedă, corectat pentru câte monede vezi deodată.</p></details>";
  h += '<div class="rfFiltre" id="rfZonaFiltre" role="group" aria-label="Filtru">' + rfHtmlFiltre(st) + "</div>";
  h += '<div class="rfCauta" id="rfZonaCauta">' + rfHtmlCauta(st) + "</div>";
  h += '<div class="rfUltimeZ" id="rfZonaUltime">' + rfHtmlUltime(st) + "</div>";
  h += '<div class="rfCautaRez" id="rfZonaCautaRez">' + rfHtmlCautaRez(st) + "</div>";
  h += '<div class="rfCorp" id="rfZonaCorp">' + rfHtmlCorp(st) + "</div>";
  return h;
}
function rfEl(id) { return typeof document !== "undefined" && document.getElementById ? document.getElementById(id) : null; }
function rfDeseneaza() {
  var el = rfEl("rfPagina"); if (!el) return;
  var corp = rfEl("rfZonaCorp");
  if (!corp) { el.innerHTML = rfHtml(rfStare); return; }   // prima dată toată pagina; apoi doar zonele care se schimbă
  var a = rfEl("rfZonaAntet"), f = rfEl("rfZonaFiltre"), r = rfEl("rfZonaCautaRez"), b = rfEl("rfCautaBtn");
  if (b) b.disabled = !!rfStare.cauta.inLucru;   // v100.303: zona căsuței nu se redesenează ⇒ starea butonului se pune aici (rămânea oprit după prima căutare)
  if (a) a.innerHTML = rfHtmlAntet(rfStare);
  if (f) f.innerHTML = rfHtmlFiltre(rfStare);
  if (r) r.innerHTML = rfHtmlCautaRez(rfStare);
  corp.innerHTML = rfHtmlCorp(rfStare);
}
function rfDeseneazaUltime() { var u = rfEl("rfZonaUltime"); if (u) u.innerHTML = rfHtmlUltime(rfStare); }
function rfDeseneazaCauta() { var r = rfEl("rfZonaCautaRez"), b = rfEl("rfCautaBtn"); if (r) r.innerHTML = rfHtmlCautaRez(rfStare); if (b) b.disabled = !!rfStare.cauta.inLucru; rfDeseneazaUltime(); }
// v100.301: comutarea intervalului păstrează citirea celuilalt; v100.302: și eroarea / citirea parțială, iar moneda căutată se recitește pe intervalul nou
async function rfTf(k) {
  if (!RF_TF[k] || rfStare.inLucru) return;
  rfStare.perTf[rfStare.tf] = { monede: rfStare.monede, la: rfStare.la, simboluri: rfStare.simboluri, eroare: rfStare.eroare, partial: rfStare.partial };
  var c = rfStare.perTf[k] || { monede: [], la: 0, simboluri: [], eroare: null, partial: false };
  rfStare.tf = k; rfStare.monede = c.monede; rfStare.la = c.la; rfStare.simboluri = c.simboluri; rfStare.eroare = c.eroare || null; rfStare.partial = !!c.partial;
  await rfPorneste(false);
  if (rfStare.cauta.m && rfStare.cauta.tf !== rfStare.tf) await rfCauta(true);   // doar o căutare REUȘITĂ se reface singură
}
function rfFiltru(f) { if (f === "toate" || f === "semnale" || f === "boti") { rfStare.filtru = f; rfDeseneaza(); } }
function rfAdanc() {
  if (rfStare.inLucru) return;
  rfStare.adanc = !rfStare.adanc; rfStare.perTf = {}; rfStare.la = 0; rfStare.monede = [];
  return rfPorneste(true);   // rfPorneste(true) reface și moneda căutată (o singură dată)
}
function rfLaGrid(simbol) { if (typeof tzLaGrid === "function") tzLaGrid(simbol); else navTo("gridset", true); }
// v100.302: lumânările ținute pe (monedă, interval) până se închide bara următoare: „Recitește” în aceeași bară nu mai cere nimic, iar
// „DOVADA pe 1.000” cere doar pagina a doua. v100.304 (I-808): cache-ul e lib/lumanari.js, comun cu Tabloul și Trade-ul zilei.
// lumânările unei monede - o pagină (500) sau două (a doua cu endTime înaintea primei); refuzul Pionex vine 200 {result:false, retryAfter}
async function rfLumanari(pionex, tf, adanc) {
  var LU = typeof Lumanari !== "undefined" ? Lumanari : null;
  var e = LU ? LU.ia(pionex, tf) : null, r1, r2 = e ? e.r2 : null, pag2Lipsa = false;
  if (e) r1 = e.r1;
  else if (LU) {   // revizia Opus: prin Lumanari.cere - o cerere deja plecată (Trade-ul zilei, Tabloul) se așteaptă, nu se repetă
    var p1 = await LU.cere(pionex, tf, RF_TF[tf].bare);
    if (p1.refuz) return { refuz: true, eroare: "Pionex a refuzat (prea multe cereri)" };
    r1 = p1.randuri || []; e = LU.ia(pionex, tf); r2 = e ? e.r2 : null;
  }
  else {
    var k = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(pionex) + "&interval=" + tf + "&limit=" + RF_TF[tf].bare);
    if (k && k.result === false) return k.retryAfter != null ? { refuz: true, eroare: "Pionex a refuzat (prea multe cereri)" } : { refuz: false, eroare: "Pionex n-a dat lumânări pentru moneda asta" };
    r1 = (k && k.data && k.data.klines) || [];
  }
  if (adanc && r1.length && !r2) {
    var primul = r1.reduce(function (t, r) { var x = Number(r && r.time); return x > 0 && (t === 0 || x < t) ? x : t; }, 0);
    if (primul > 0) {
      if (!e) await rfPauza(RF_PAUZA_MS);
      var k2 = await getJSON("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(pionex) + "&interval=" + tf + "&limit=" + RF_TF[tf].bare + "&endTime=" + (primul - 1));
      if (k2 && k2.result === false && k2.retryAfter != null) return { refuz: true, eroare: "Pionex a refuzat (prea multe cereri)" };
      if (k2 && k2.data && k2.data.klines && k2.data.klines.length) r2 = k2.data.klines; else pag2Lipsa = true;
    }
  }
  var bare = typeof GridCalcul !== "undefined" ? GridCalcul.bare((adanc && r2 ? r2 : []).concat(r1)) : null;
  if (!bare || !bare.length) return { refuz: false, eroare: "Pionex n-a dat lumânări pentru moneda asta" };
  if (LU) LU.pune(pionex, tf, r1, r2);
  return { bare: bare, pag2Lipsa: pag2Lipsa };
}
async function rfPorneste(forta) {
  if (rfStare.inLucru) return;
  var urm = rfUrmatoarea(rfStare), proaspat = rfStare.la && Date.now() - rfStare.la < 10 * 60 * 1000 && (!urm || Date.now() < urm);
  var cuDate = rfStare.monede.some(function (m) { return m.c && !m.c.eroare; });
  if (!forta && proaspat && cuDate && !rfStare.partial) { rfDeseneaza(); return; }
  rfStare.inLucru = true; rfStare.eroare = null; rfStare.partial = false;
  var monede = [], tf = rfStare.tf, refuz = false, faraClasament = false;
  try {
    rfDeseneaza();   // butoanele se opresc imediat („citesc…”); în try, ca o eroare de desen să nu lase inLucru blocat
    var bo = await rfBotiActivi(), boti = bo.boti, cl = null, dir = rfDirectiiBoti(boti);
    rfStare.botiPicat = bo.picat;
    try { var c = await getJSON("/api/istoric-bot?action=clasament"); cl = c && c.clasament || null; } catch (e) { cl = null; }
    faraClasament = !cl && typeof tzSimboluri === "function";
    rfStare.simboluri = rfSimboluri(boti, cl); rfDeseneaza();
    for (var i = 0; i < rfStare.simboluri.length; i++) {
      var s = rfStare.simboluri[i], baza = { simbol: s.simbol, pionex: s.pionex, fel: s.fel, directie: s.fel === "bot" ? dir[s.simbol] || null : null };
      try {
        var l = await rfLumanari(s.pionex, tf, rfStare.adanc);
        if (l.refuz) { monede.push(Object.assign(baza, { eroare: "Pionex a refuzat (prea multe cereri)" })); refuz = true; break; }
        var cit = l.bare ? RangeFilter.citire(l.bare) : { eroare: l.eroare };
        if (l.pag2Lipsa && cit && !cit.eroare) cit.doar500 = true;
        monede.push(Object.assign(baza, { c: cit }));
      } catch (e) {
        var msg = String(e && e.message || e);
        monede.push(Object.assign(baza, { eroare: "nu am putut citi lumânările (" + msg.slice(0, 80) + ")" }));
        if (/429|prea multe|rate/i.test(msg)) { refuz = true; break; }
      }
      rfStare.monede = monede.slice(); rfDeseneaza();   // cartelele apar pe rând, nu toate la final
      if (i < rfStare.simboluri.length - 1) await rfPauza(RF_PAUZA_MS);
    }
    rfStare.monede = monede; rfStare.la = Date.now();
    // v100.302: o citire parțială se spune (și nu e „proaspătă”: următoarea deschidere o reface)
    var nErr = rfNecitite(monede), total = rfStare.simboluri.length;
    rfStare.partial = nErr > 0 || monede.length < total;
    if (refuz) rfStare.eroare = "Pionex a refuzat (prea multe cereri) - restul monedelor le citesc la „Recitește”.";
    else if (nErr) rfStare.eroare = TextRo.cate(nErr, "monedă necitită", "monede necitite") + " din " + total + " - apasă „Recitește”.";
    if (faraClasament) rfStare.eroare = (rfStare.eroare ? rfStare.eroare + " " : "") + "Clasamentul n-a venit: văd doar boții și BTC / ETH / SOL.";
    if (!monede.length) rfStare.eroare = rfStare.eroare || "Nicio monedă de citit.";
    rfStare.perTf[tf] = { monede: monede, la: rfStare.la, simboluri: rfStare.simboluri, eroare: rfStare.eroare, partial: rfStare.partial };
  } finally { rfStare.inLucru = false; rfDeseneaza(); }
  if (forta && rfStare.cauta.m) await rfCauta(true);
}
// ── v100.302: căsuța „Analizează o monedă” (el, 05.11.2026: „pune și o căsuță unde să analizez o monedă anume”) ──
// curăță ce scrii: „pepe”, „PEPE/USDT”, „PEPEUSDT.P”, „PEPE_USDT_PERP” ⇒ „PEPE”; altceva decât litere și cifre ⇒ null (nicio cerere)
function rfNormalizeaza(x) {
  var s = String(x == null ? "" : x).trim().toUpperCase();
  if (!s || /\s/.test(s)) return null;
  s = s.replace(/\.(P|PERP)$/, "").replace(/[\/\-_]/g, "");   // „BTC.PERP” e chiar notația Radarului
  for (var i = 0; i < 3; i++) { var t = s.replace(/(PERP|USDT)$/, ""); if (!t || t === s) break; s = t; }   // „PERP” singur e o monedă (Perpetual Protocol)
  return s !== "USDT" && /^[A-Z0-9]{1,15}$/.test(s) ? s : null;
}
function rfCautaScrie() { var el = rfEl("rfCautaIn"); if (el) rfStare.cauta.text = String(el.value || "").slice(0, 40); rfSimboluriPionex(); }   // v100.304 (I-807): listele Pionex abia când scrii (nu la fiecare deschidere a paginii)
// v100.304 (I-807): listele de simboluri Pionex (perp + spot; serverul le ține o oră). Ambele trebuie să vină - cu una singură, „n-are”
// ar minți pe cealaltă piață. Căzute ⇒ căsuța merge ca înainte (perp, apoi spot) și se reîncearcă după 10 minute.
function rfListaPionex(dp, ds) {
  var lp = dp && dp.result !== false && dp.data && dp.data.symbols, ls = ds && ds.result !== false && ds.data && ds.data.symbols;
  if (!Array.isArray(lp) || !Array.isArray(ls) || !lp.length || !ls.length) return null;
  // perp = de tranzacționat (TRADING), spot = activ (enable); „exista” = orice stare (o monedă scoasă nu primește „n-are”); baza = baseCurrency → simbol
  // când diferă (PUMPFUN → PUMP: el scrie numele monedei, Pionex o ține sub alt simbol - revizia Opus)
  var perp = {}, spot = {}, exista = {}, baza = {}, sug = {};
  function cu(x, re, ok, tinta) {
    var m = x && re.exec(String(x.symbol || "")); if (!m) return;
    exista[m[1]] = 1; if (ok) { tinta[m[1]] = 1; sug[m[1]] = 1; }
    var b = String(x.baseCurrency || "").toUpperCase(); if (/^[A-Z0-9]{1,15}$/.test(b) && b !== m[1] && !baza[b]) baza[b] = m[1];
  }
  lp.forEach(function (x) { cu(x, /^([A-Z0-9]{1,15})_USDT_PERP$/, x && x.status === "TRADING", perp); });
  ls.forEach(function (x) { cu(x, /^([A-Z0-9]{1,15})_USDT$/, x && x.enable !== false, spot); });
  return { perp: perp, spot: spot, exista: exista, baza: baza, lista: Object.keys(sug).sort(), la: Date.now() };
}
var RF_SIM_TTL = 60 * 60 * 1000;   // revizia Opus: listele expiră ca pe server (o oră) - o monedă listată azi nu primește „n-are” până la F5
function rfSimboluriPionex(forta) {
  var sim = rfStare.pionexSim;
  if (sim && !forta && Date.now() - sim.la < RF_SIM_TTL) return Promise.resolve(sim);
  if (rfSimProm) return rfSimProm;
  if (!forta && rfSimEsecLa && Date.now() - rfSimEsecLa < 10 * 60 * 1000) return Promise.resolve(sim || null);
  rfSimProm = (async function () {
    var nou = null;
    try { nou = rfListaPionex(await getJSON("/api/market?type=pionex_symbols&market=PERP"), await getJSON("/api/market?type=pionex_symbols&market=SPOT")); } catch (e) { nou = null; }
    if (nou) { rfStare.pionexSim = nou; rfSimEsecLa = 0; } else { rfSimEsecLa = Date.now(); if (rfStare.pionexSim && Date.now() - rfStare.pionexSim.la >= RF_SIM_TTL) rfStare.pionexSim = null; }
    rfSimProm = null;
    var dl = rfEl("rfMonede"); if (dl) dl.innerHTML = rfOptiuni(rfStare.pionexSim);
    return rfStare.pionexSim;
  })();
  return rfSimProm;
}
// simbolul Pionex al ce a scris el: el însuși dacă există, altfel prin baseCurrency (PUMPFUN → PUMP), altfel null
function rfSimbolPionex(sp, sim) { return sp.exista[sim] ? sim : sp.baza[sim] && sp.exista[sp.baza[sim]] ? sp.baza[sim] : null; }
function rfCautaDin(s) {
  var sim = rfNormalizeaza(s); if (!sim) return;
  rfStare.cauta.text = sim; var el = rfEl("rfCautaIn"); if (el) el.value = sim;
  return rfCauta(false);
}
async function rfCauta(refa) {
  var q = rfStare.cauta;
  if (!refa) { var el = rfEl("rfCautaIn"); if (el) q.text = String(el.value || "").slice(0, 40); }
  // revizia v100.302: o cerere venită cât citește NU se pierde - se face la capăt (o căutare nouă bate o reîmprospătare)
  if (q.inLucru) { q.dinNou = !refa ? "nou" : (q.dinNou || "refa"); return; }
  var sim = refa ? q.simbol : rfNormalizeaza(q.text);
  if (!sim) { q.eroare = "Scrie simbolul monedei (ex. PEPE, WIF, ARB) - doar litere și cifre."; q.m = null; rfDeseneazaCauta(); return; }
  try { localStorage.setItem("rf_cauta", sim); } catch (e) {}
  q.inLucru = true; q.simbol = sim; q.eroare = null; q.dinNou = null;
  var tf = rfStare.tf, adanc = rfStare.adanc; rfDeseneazaCauta();
  // la refuz / eroare nu rămâne pe ecran cartela ALTEI monede sau a ALTUI interval
  function curataStrain() { if (q.m && (q.m.simbol !== sim || q.m.tf !== tf)) q.m = null; }
  try {
    // v100.304 (I-807): cu listele Pionex venite, „n-are” se spune fără nicio cerere, iar moneda doar spot se cere direct pe spot
    var sp = await rfSimboluriPionex(), ps = sp ? rfSimbolPionex(sp, sim) : sim;
    // revizia Opus: listele mai vechi de 5 minute se recitesc o dată înainte de „n-are” (moneda poate fi listată de curând)
    if (sp && !ps && Date.now() - sp.la > 5 * 60 * 1000) { sp = await rfSimboluriPionex(true); ps = sp ? rfSimbolPionex(sp, sim) : sim; }
    if (sp && !ps) { q.eroare = "Pionex n-are " + sim + " (nici perp, nici spot) - verifică simbolul."; q.m = null; }
    else {
      if (ps !== sim) { sim = ps; q.simbol = sim; }   // PUMPFUN ⇒ PUMP: cartela și „ultimele căutate” poartă simbolul Pionex
      // perp doar dacă se tranzacționează (revizia Opus: perp scos + spot activ ⇒ spot, nu lumânările vechi ale perp-ului)
      var pionex = sp && !sp.perp[sim] && sp.spot[sim] ? sim + "_USDT" : sim + "_USDT_PERP", l = await rfLumanari(pionex, tf, adanc);
      if (!l.bare && !l.refuz && /_PERP$/.test(pionex) && (!sp || sp.exista[sim] && !sp.perp[sim] || sp.spot[sim])) { pionex = sim + "_USDT"; l = await rfLumanari(pionex, tf, adanc); }
      if (l.refuz) { q.eroare = "Pionex a refuzat (prea multe cereri) - încearcă peste un minut."; curataStrain(); }
      else if (!l.bare) { q.eroare = "Pionex n-are lumânări pentru " + sim + (sp ? "" : " (nici perp, nici spot)") + " - verifică simbolul."; q.m = null; }
      else {
        var cit = RangeFilter.citire(l.bare);
        if (l.pag2Lipsa && cit && !cit.eroare) cit.doar500 = true;
        q.m = { simbol: sim, pionex: pionex, fel: "cautata", tf: tf, c: cit }; q.tf = tf;
        rfUltimeAdauga(sim);
      }
    }
  } catch (e) { q.eroare = "nu am putut citi lumânările (" + String(e && e.message || e).slice(0, 80) + ")"; curataStrain(); }
  finally { q.inLucru = false; }
  // intervalul / DOVADA pe 1.000 s-au schimbat cât citeam ⇒ citesc din nou pe ce se vede acum (altfel: date de 1h sub eticheta 4h)
  var urm = q.dinNou; q.dinNou = null;
  if (urm === "nou") return rfCauta(false);
  if (q.m && (urm === "refa" || tf !== rfStare.tf || adanc !== rfStare.adanc)) return rfCauta(true);
  rfDeseneazaUltime(); rfDeseneaza();   // toată pagina: corecția DOVEZII se schimbă și pe cartelele din corp
}
// Enter în căsuță = „Analizează” (o singură dată, la încărcarea fișierului)
if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "rfCautaIn") { e.preventDefault(); rfCauta(false); } });
