// v100.395 (26.11.2026, el: „3 monede agitate direcționale dar de volum, nu junk” ⇒ „adaugă în Radar să caute automat mereu genul ăsta de monede…
// fă o listă mai mare și pune și în celelalte și verifică să fie mereu conectat la realitate și live”): monedele de bot DIRECȚIONAL (Doar Short /
// Doar Long), refăcute de colector o dată pe oră (scripts/lib/tura-monede-bot.mjs) din Binance Futures, doar cele care sunt și pe Pionex PERP.
// Un FILTRU, nu o predicție: „junk” = volum mic / OI mic / volum umflat față de OI / monedă nouă / spread mare; „agitată” = amplitudinea pe zi;
// „direcțională” = cât din drumul prețului a mers într-o singură parte (raportul de eficiență, ER: 0 = zig-zag, 1 = linie dreaptă) pe bare de 4 h.
// Aceleași formule în colector (Node) și pe pagină (fără DOM); proba: scripts/proba-v100395-monede-bot.mjs (+ paritatea PPST cu portul Python).
var MonedeBot = (function () {
  "use strict";
  var PRAGURI = {
    volMin: 100e6,      // USDT pe 24 h, Binance Futures
    oiMin: 40e6,        // open interest, în USD
    volOiMax: 5,        // volumul pe 24 h cel mult de 5× OI-ul (peste: bani care se învârt, nu poziții - spălare / pompare)
    zileMin: 365,       // listată pe Binance Futures de cel puțin un an
    sprMaxBp: 10,       // spread-ul bid/ask, în puncte de bază
    ampMin: 0.08,       // amplitudinea medie pe zi (maxim − minim pe 24 h, din barele de 1 h, 7 zile), cel puțin 8%
    erMin: 0.10,        // |ER pe 14 zile| (bare de 4 h) cel puțin 0,10
    nLista: 10,         // cel mult 10 pe fiecare parte
    nTop: 3,            // primele 3 = „în capul listei” (mesajul pe Discord când intră una nouă)
    vecheMin: 90,       // lista e VECHE dacă tura n-a scris de 90 de minute (colectorul o reface la 60)
    preFiltruVol: 50e6  // colectorul citește detaliile doar pentru monedele de peste 50 M USDT/zi (+ monedele boților tăi, oricât de mici)
  };
  // „direcția probabilă” (el, 26.11: „vreau să arăți direcția actuală + direcția probabilă”): cât de des a CONTINUAT în aceeași parte, în următoarele
  // 7 zile, o monedă în aceeași situație pe istoric - din studiul scripts/studiu-v100395-directie-probabila.mjs (regulile scrise înainte de rulare),
  // ÎNGHEȚAT aici; cifra = jumătatea de TEST. Treptele |ER 14 z|: 0 = 0,10–0,15 · 1 = 0,15–0,25 · 2 = ≥ 0,25.
  var PROBABIL = {"studiu":"Binance Futures, 43 de monede (doar cele listate azi), 709 de zile; test de la 30.11.2025","trepte":["0,10–0,15","0,15–0,25","≥ 0,25"],"celule":{"short:0":{"p":0.5947,"n":417,"sapt":22,"medie":-0.0253,"fataPiata":0.6115,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.6511,"nExpl":665},"short:1":{"p":0.5208,"n":576,"sapt":32,"medie":-0.0434,"fataPiata":0.5764,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.4844,"nExpl":1028},"short:2":{"p":0.4289,"n":415,"sapt":20,"medie":-0.1281,"fataPiata":0.6241,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.4978,"nExpl":225},"long:0":{"p":0.4905,"n":528,"sapt":29,"medie":0.0463,"fataPiata":0.4261,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.3248,"nExpl":351},"long:1":{"p":0.4693,"n":635,"sapt":42,"medie":0.0393,"fataPiata":0.4378,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.3798,"nExpl":387},"long:2":{"p":0.4325,"n":326,"sapt":22,"medie":0.0031,"fataPiata":0.411,"verdict":"nedovedit","verdictPiata":"nedovedit","pExpl":0.3672,"nExpl":177}}};
  function fin(x) { return typeof x === "number" && isFinite(x); }
  // v100.396 (auditul 26.11, 🔵): aceeași regulă ca tura-caderi.bazaBinance — 1000PEPE / 1000000MOG / 1MBABYDOGE ⇒ baza fără multiplicator (1MBABYDOGE ieșea tăcut)
  // revizia 27.11: și „10000” (10000LADYS / 10000COQ pe Binance) - bazePionex taie orice „1000+”, deci fără el moneda ieșea „nu e pe Pionex”
  function cheie(s) { return String(s || "").toUpperCase().replace(/\.PERP$/, "").replace(/_USDT(_PERP)?$/, "").replace(/USDT$/, "").replace(/^(1000000|10000|1000|1M)(?=[A-Z])/, ""); }
  // multiplicatorul contractului Binance (= tura-caderi.multBinance): prețul afișat e al UNEI monede, ca pe Pionex (1000PEPE ⇒ ÷ 1.000)
  function mult(sym) { var m = String(sym || "").toUpperCase().match(/^(1000000|10000|1000|1M)(?=[A-Z])/); return m ? (m[1] === "1000" ? 1000 : m[1] === "10000" ? 1e4 : 1e6) : 1; }
  // raportul de eficiență: (ultimul − primul) / suma pașilor absoluți; cu semn (minus = în jos)
  function er(c) { if (!c || c.length < 2) return null; var s = 0; for (var i = 1; i < c.length; i++) s += Math.abs(c[i] - c[i - 1]); return s > 0 ? (c[c.length - 1] - c[0]) / s : 0; }
  // Pivot Point SuperTrend (LonesomeTheBlue, 2 / 3 / 10) - același port ca ppst_motor.py (pine-scripts\PIVOT-SUPERTREND): pivotul barei j se află
  // la bara j + prd; egalități: ≥ față de stânga, > față de dreapta; ATR = RMA pornit cu media primelor n; NaN în comparații = fals, ca în Pine
  function ppst(h, l, c, prd, factor, nAtr) {
    prd = prd || 2; factor = factor || 3; nAtr = nAtr || 10;
    var n = c.length, trend = new Array(n), stop = new Array(n), tr = new Array(n), atr = new Array(n), i, j, k;
    for (i = 0; i < n; i++) { tr[i] = i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) : h[0] - l[0]; atr[i] = NaN; }
    if (n >= nAtr) { var s = 0; for (i = 0; i < nAtr; i++) s += tr[i]; atr[nAtr - 1] = s / nAtr; for (i = nAtr; i < n; i++) atr[i] = atr[i - 1] + (tr[i] - atr[i - 1]) / nAtr; }
    var center = NaN, tupP = NaN, tdnP = NaN, trP = 1;
    for (i = 0; i < n; i++) {
      var ph = NaN, pl = NaN;
      if (i >= 2 * prd) {
        j = i - prd; var okH = true, okL = true;
        for (k = j - prd; k < j; k++) { if (h[k] > h[j]) okH = false; if (l[k] < l[j]) okL = false; }
        for (k = j + 1; k <= i; k++) { if (h[k] >= h[j]) okH = false; if (l[k] <= l[j]) okL = false; }
        if (okH) ph = h[j]; if (okL) pl = l[j];
      }
      var lastpp = !isNaN(ph) ? ph : pl;
      if (!isNaN(lastpp)) center = isNaN(center) ? lastpp : (center * 2 + lastpp) / 3;
      var up = center - factor * atr[i], dn = center + factor * atr[i], cp = i > 0 ? c[i - 1] : NaN;
      var tup = cp > tupP ? Math.max(up, tupP) : up, tdn = cp < tdnP ? Math.min(dn, tdnP) : dn;
      var t = c[i] > tdnP ? 1 : c[i] < tupP ? -1 : trP;
      trend[i] = t; stop[i] = t === 1 ? tup : tdn; tupP = tup; tdnP = tdn; trP = t;
    }
    return { trend: trend, stop: stop };
  }
  // starea PPST pe ultima bară închisă: direcția și de câte bare ține
  function ppstAcum(b) {
    if (!b || b.length < 30) return null;
    var r = ppst(b.map(function (x) { return x.h; }), b.map(function (x) { return x.l; }), b.map(function (x) { return x.c; })), n = r.trend.length, t = r.trend[n - 1], k = 0;
    while (k < n && r.trend[n - 1 - k] === t) k++;
    return { dir: t === 1 ? "SUS" : "JOS", bare: k, linia: r.stop[n - 1], dist: fin(r.stop[n - 1]) && b[n - 1].c > 0 ? (b[n - 1].c - r.stop[n - 1]) / b[n - 1].c : null };
  }
  // de ce e junk (gol = nu e): pe ce se vede la Binance acum
  function motiveJunk(m, P) {
    P = P || PRAGURI; var o = [];
    if (!fin(m.vol) || m.vol < P.volMin) o.push("volum " + mil(m.vol) + " (sub " + mil(P.volMin) + ")");
    if (!fin(m.oi) || m.oi < P.oiMin) o.push("OI " + mil(m.oi) + " (sub " + mil(P.oiMin) + ")");
    if (fin(m.vol) && fin(m.oi) && m.oi > 0 && m.vol / m.oi > P.volOiMax) o.push("volumul de " + zec(m.vol / m.oi) + "× OI-ul (umflat: peste " + P.volOiMax + "×)");
    if (fin(m.zile) && m.zile < P.zileMin) o.push("listată de " + cate(Math.round(m.zile), "zi", "zile") + " (sub un an)");
    if (fin(m.sprBp) && m.sprBp > P.sprMaxBp) o.push("spread " + zec(m.sprBp) + " bp (peste " + P.sprMaxBp + ")");
    return o;
  }
  // d = { sym, vol, oi, sprBp, zile, fund, pret, b4 (bare 4 h, ≥ 85), b1 (bare 1 h, ≥ 168; 600 pentru PPST), pionex }
  function masoara(d, P) {
    P = P || PRAGURI; if (!d || !Array.isArray(d.b4) || d.b4.length < 20 || !Array.isArray(d.b1) || d.b1.length < 168) return null;
    var c4 = d.b4.map(function (x) { return x.c; }), n4 = c4.length, d3 = Math.min(18, n4 - 1), b1 = d.b1, n1 = b1.length, amp = 0, zile = 0;
    for (var i = n1 - 168; i + 24 <= n1; i += 24) { var hi = -Infinity, lo = Infinity; for (var k = i; k < i + 24; k++) { if (b1[k].h > hi) hi = b1[k].h; if (b1[k].l < lo) lo = b1[k].l; } if (b1[i].c > 0) { amp += (hi - lo) / b1[i].c; zile++; } }
    var m = { sym: d.sym, s: cheie(d.sym), pret: fin(d.pret) ? d.pret : c4[n4 - 1], vol: d.vol, oi: d.oi, sprBp: d.sprBp, zile: d.zile, fund: d.fund, pionex: d.pionex !== false,
      r14: c4[0] > 0 ? c4[n4 - 1] / c4[0] - 1 : null, er14: er(c4), r3: c4[n4 - 1 - d3] > 0 ? c4[n4 - 1] / c4[n4 - 1 - d3] - 1 : null, er3: er(c4.slice(n4 - 1 - d3)),
      r24: b1[n1 - 25] && b1[n1 - 25].c > 0 ? b1[n1 - 1].c / b1[n1 - 25].c - 1 : null, amp: zile ? amp / zile : null, ppst1h: ppstAcum(b1) };
    m.junk = motiveJunk(m, P);
    m.parte = fin(m.er14) && Math.abs(m.er14) >= P.erMin ? (m.er14 < 0 ? "short" : "long") : null;
    m.agitata = fin(m.amp) && m.amp >= P.ampMin;
    // tăria: cât de drept pe 14 zile + cât de drept pe 3 zile ÎN aceeași parte (o revenire pe 3 zile nu adună, nu scade)
    var s = m.parte === "short" ? -1 : 1; m.taria = m.parte ? Math.abs(m.er14) + Math.max(0, s * (m.er3 || 0)) : null;
    m.revine = !!(m.parte && fin(m.er3) && s * m.er3 < 0);
    m.ppstCuParte = m.ppst1h && m.parte ? (m.ppst1h.dir === "JOS") === (m.parte === "short") : null;
    return m;
  }
  // listele: doar cele fără junk, agitate, cu parte, pe Pionex; după tărie
  // el, 26.11: „grupați doar pe direcție, range și revenire” - trei FELURI, după botul care se potrivește (toate: fără junk, agitate, pe Pionex):
  //   direcție = drept pe 14 zile și ÎN ACEEAȘI parte pe 3 zile (short ↓ / long ↑) - Doar Short / Doar Long; ordinea după tărie
  //   revenire = drept pe 14 zile, dar pe 3 zile ÎNAPOI (revine); ordinea după cât de drept revine pe 3 zile
  //   range    = fără direcție pe 14 zile (|ER| < 0,10), dar agitată - grid neutru; ordinea după amplitudine
  var FEL = { short: "Direcție ↓", long: "Direcție ↑", revenire: "Revenire", range: "Range" };
  function fel(m) { return !m ? null : !m.parte ? "range" : m.revine ? "revenire" : m.parte; }
  function liste(monede, P) {
    P = P || PRAGURI; var bune = (monede || []).filter(function (m) { return m && !m.junk.length && m.agitata && m.pionex; });
    var dir = bune.filter(function (m) { return m.parte && !m.revine; }).sort(function (a, b) { return b.taria - a.taria; });
    return { short: dir.filter(function (m) { return m.parte === "short"; }).slice(0, P.nLista), long: dir.filter(function (m) { return m.parte === "long"; }).slice(0, P.nLista),
      revenire: bune.filter(function (m) { return m.parte && m.revine; }).sort(function (a, b) { return Math.abs(b.er3 || 0) - Math.abs(a.er3 || 0); }).slice(0, P.nLista),
      range: bune.filter(function (m) { return !m.parte; }).sort(function (a, b) { return (b.amp || 0) - (a.amp || 0); }).slice(0, P.nLista) };
  }
  // eticheta unui fel; la revenire, săgeata e partea în care REVINE (contra celor 14 zile)
  function eticheta(f, m) { return FEL[f] + (f === "revenire" && m && m.parte ? (m.parte === "short" ? " ↑" : " ↓") : ""); }
  function vechime(kv, acum) { var la = kv && kv.la; if (!fin(la)) return { min: null, veche: true }; var min = Math.max(0, Math.round(((acum || Date.now()) - la) / 60000)); return { min: min, veche: min > PRAGURI.vecheMin }; }
  function gaseste(kv, simbol) { var k = cheie(simbol), m = kv && Array.isArray(kv.monede) ? kv.monede : []; for (var i = 0; i < m.length; i++) if (m[i] && cheie(m[i].sym) === k) return m[i]; return null; }
  function loc(kv, s) { var k = cheie(s), L = kv || {}, f = function (a) { a = Array.isArray(a) ? a : []; for (var i = 0; i < a.length; i++) if (cheie(a[i]) === k) return i + 1; return 0; };
    var F = ["short", "long", "revenire", "range"]; for (var j = 0; j < F.length; j++) { var n = f(L[F[j]]); if (n) return { fel: F[j], parte: F[j] === "short" || F[j] === "long" ? F[j] : null, loc: n }; } return null; }
  // rândul din Tablou (moneda botului): în listă / junk / nici-nici, plus direcția pe 14 zile față de bot
  function textMoneda(kv, simbol, dirBot, acum) {
    var ce = "Monede de bot", v = vechime(kv, acum);
    if (!kv || !Array.isArray(kv.monede)) return { ce: ce, stare: "info", text: "aștept lista (colectorul o reface o dată pe oră)" };
    var m = gaseste(kv, simbol), k = cheie(simbol), timp = v.veche ? "VECHE, de " + ore(v.min) : "acum " + v.min + " min";
    if (!m) return { ce: ce, stare: v.veche ? "atentie" : "info", text: k + " n-a fost citită (sub " + mil(PRAGURI.preFiltruVol) + " pe zi sau lipsă la Binance) · " + timp };
    // auditul 26.11 (🟡): „contra” doar pe DIRECȚIE (pe Revenire un bot în partea revenirii e chiar ce sugerează lista)
    var L = loc(kv, k), d = String(dirBot || "").toLowerCase(), contra = m.parte && !m.revine && (d === "long" || d === "short") && d !== m.parte, parti = [];
    if (m.junk.length) parti.push("JUNK: " + m.junk.join(", "));
    else if (L) parti.push("în listă: " + eticheta(L.fel, m) + " #" + L.loc);
    else parti.push("nu e în listă" + (!m.agitata ? " (prea liniștită: " + pr(m.amp) + " pe zi)" : !m.pionex ? " (nu e pe Pionex PERP)" : " (nu e în primele " + PRAGURI.nLista + " la " + eticheta(fel(m), m) + ")"));   /* revizia (🔵): motivul și pe locul 11+ */
    parti.push(directiaAcum(m) + " (ER " + zec(m.er14, 2) + ") · " + pr(m.amp) + "/zi");
    var pb = probabil(m); if (pb) parti.push(pb.scurt);
    if (contra) parti.push("botul tău e " + d.toUpperCase() + ", moneda merge " + (m.parte === "short" ? "în JOS" : "în SUS") + " pe 14 zile");
    parti.push(timp);
    return { ce: ce, stare: m.junk.length || contra || v.veche ? "atentie" : L ? "bine" : "info", text: parti.join(" · "), junk: m.junk.length > 0, contra: !!contra, loc: L };
  }
  // boții pe monede junk (pentru Discord, Sugestii, verificatorul Pionex): boti = [{ s, dir, id? }]
  function botiPeJunk(kv, boti) {
    return (boti || []).map(function (b) { var m = gaseste(kv, b.s); return m && m.junk.length ? { s: cheie(b.s), dir: b.dir, id: b.id, motive: m.junk } : null; }).filter(Boolean);
  }
  // numere scrise ca în restul paginii (virgula zecimală, o singură zecimală la rezultate)
  function zec(x, z) { return fin(x) ? (x < 0 ? "−" : "") + Math.abs(x).toFixed(z == null ? 1 : z).replace(".", ",") : "—"; }
  function pct(x, z) { return fin(x) ? (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%" : "—"; }
  // unde stă linia PPST față de preț: dist = (preț − linie) / preț ⇒ minus = linia DEASUPRA prețului (trend JOS)
  function linia(p) { return p && fin(p.dist) ? "linia la " + pr(p.dist) + (p.dist < 0 ? " deasupra prețului" : " sub preț") : ""; }
  function pr(x, z) { return fin(x) ? Math.abs(x * 100).toFixed(z == null ? 1 : z).replace(".", ",") + "%" : "—"; }   // mărimi fără semn (amplitudinea)
  function mil(x) { return fin(x) ? (x >= 1e9 ? zec(x / 1e9) + " mld." : Math.round(x / 1e6) + " M") + " $" : "—"; }
  var SAG = { short: "↓", long: "↑" };
  function sag(x) { return fin(x) ? (x < 0 ? "↓" : x > 0 ? "↑" : "→") : "·"; }
  // direcția de ACUM: 14 zile (partea), 3 zile, PPST pe 1 h
  function directiaAcum(m) {   /* nu „acum”: textMoneda are un parametru `acum` (ora) care ar ascunde funcția */
    if (!m) return "";
    return "Acum " + (m.parte ? SAG[m.parte] + " " + (m.parte === "short" ? "JOS" : "SUS") : "→ fără direcție (range)") + ": 14 z " + pct(m.r14) + " · 3 z " + sag(m.r3) + " " + pct(m.r3) + (m.ppst1h ? " · PPST 1h " + (m.ppst1h.dir === "JOS" ? "↓" : "↑") + " " + m.ppst1h.dir : "");
  }
  // direcția PROBABILĂ pe 7 zile, din tabelul înghețat; null = n-am celulă (fără parte sau sub prag)
  function treapta(er) { var a = Math.abs(er); return !fin(er) || a < 0.10 ? -1 : a < 0.15 ? 0 : a < 0.25 ? 1 : 2; }
  function probabil(m) {
    // revizia (🟡2): studiul e pe monede agitate (≥ 8% pe zi); pe una liniștită sau JUNK cifra lui nu se aplică
    // auditul 26.11 (🟡): studiul n-a despărțit monedele care pe 3 zile s-au întors ⇒ pe Revenire cifra lui nu se aplică (un „continuă ↓ 52%” pe un rând „Revenire ↑” încurca)
    if (!m || !m.parte || m.agitata !== true || m.revine || (m.junk && m.junk.length)) return null; var k = treapta(m.er14), c = k >= 0 ? PROBABIL.celule[m.parte + ":" + k] : null; if (!c || !fin(c.p)) return null;
    var jos = m.parte === "short", dovedit = c.verdict === "mai des decât 50%", invers = c.verdict === "mai rar decât 50%";
    // câștigul mediu în partea ta (s × randamentul pe 7 zile) stă MEREU lângă procent: „continuă mai des” nu înseamnă „câștigă” (short:0 pe 26.11: 59%, dar −2,5%)
    var contra = fin(c.medie) && c.medie < 0;
    return { p: c.p, n: c.n, sapt: c.sapt, medie: c.medie, verdict: c.verdict, fataPiata: c.fataPiata, verdictPiata: c.verdictPiata, dovedit: dovedit, invers: invers, contra: contra,
      scurt: "Probabil 7 z: " + (invers ? "se întoarce" : SAG[m.parte] + " continuă") + " " + Math.round(c.p * 100) + "%" + (dovedit ? (contra ? " (mai des, DAR pe minus în medie)" : " (mai des decât 50%)") : invers ? "" : " (nedovedit)") + (fin(c.medie) ? " · câștig mediu " + pct(c.medie) : ""),
      text: "pe istoric, în situația asta (" + (jos ? "a scăzut" : "a urcat") + " drept pe 14 zile, ER " + PROBABIL.trepte[k] + ", ≥ 8% pe zi) moneda a continuat " + (jos ? "în JOS" : "în SUS") + " în următoarele 7 zile în " + Math.round(c.p * 100) + "% din cazuri (" + cate(c.n, "caz", "cazuri") + ", " + cate(c.sapt, "săptămână", "săptămâni") + " independente; " + c.verdict + ")"
        + (fin(c.medie) ? "; câștigul mediu pe 7 zile în partea " + m.parte + ": " + pct(c.medie) + (contra && dovedit ? " - continuă mai des, dar când se întoarce, se întoarce mult" : "") : "")
        + (fin(c.fataPiata) ? "; față de piața din aceleași zile: mai bine în " + Math.round(c.fataPiata * 100) + "% (" + c.verdictPiata + ")" : "") + " · " + PROBABIL.studiu + " · din 6 situații încercate, una poate ieși din întâmplare" };
  }
  // rezumatul studiului, socotit din tabel (nu tastat): câte situații nedovedite, intervalul lor, cele care trec cu câștigul lor mediu
  function rezumatStudiu() {
    var C = PROBABIL.celule, k = Object.keys(C); if (!k.length) return "";
    var ned = k.filter(function (x) { return C[x].verdict === "nedovedit"; }), trec = k.filter(function (x) { return C[x].verdict !== "nedovedit"; }), ps = ned.map(function (x) { return C[x].p; });
    var et = function (x) { var a = x.split(":"); return a[0] + ", ER " + PROBABIL.trepte[+a[1]]; };
    return "pe jumătatea de test, " + ned.length + " din " + cate(k.length, "situație", "situații") + " NEDOVEDITE" + (ps.length ? " (" + Math.round(Math.min.apply(null, ps) * 100) + "–" + Math.round(Math.max.apply(null, ps) * 100) + "% continuă)" : "")
      + (trec.length ? "; trec: " + trec.map(function (x) { return et(x) + " - " + C[x].verdict + " (" + Math.round(C[x].p * 100) + "%), câștig mediu " + pct(C[x].medie); }).join("; ") : "") + " · " + PROBABIL.studiu;
  }
  // numărătorile - „2 ore”, „21 de ore” (TextRo.cate; rezerva știe aceeași regulă, ca tura-largime-crypto)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function ore(min) { return min >= 120 ? cate(Math.round(min / 60), "oră", "ore") : min + " min"; }
  return { PRAGURI: PRAGURI, cheie: cheie, er: er, ppst: ppst, ppstAcum: ppstAcum, motiveJunk: motiveJunk, masoara: masoara, liste: liste, vechime: vechime, gaseste: gaseste, loc: loc, textMoneda: textMoneda, botiPeJunk: botiPeJunk, pct: pct, pr: pr, zec: zec, mil: mil, cate: cate, ore: ore, linia: linia, FEL: FEL, fel: fel, eticheta: eticheta, mult: mult, acum: directiaAcum, probabil: probabil, treapta: treapta, rezumatStudiu: rezumatStudiu, PROBABIL: PROBABIL };
})();
if (typeof globalThis !== "undefined") globalThis.MonedeBot = MonedeBot;
