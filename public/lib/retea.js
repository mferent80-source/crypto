// Rețeaua neuronală (specul docs/superpowers/specs/2026-10-02-retea-neuronala-design.md, livrarea 1 - boții, v100.80): trăsăturile
// (O SINGURĂ funcție pentru istoric și pentru „acum” - antrenarea și folosirea văd aceleași cifre), intrările pe țintă, trecerea
// înainte (fără TensorFlow: greutățile vin din retea/antreneaza.mjs) și pragul „dovedită”. Modul pur: îl folosesc colectorul, fișa
// (în browser) și antrenorul. Se încarcă DUPĂ text-ro.js, grid-calcul.js și probabilitati.js. A doua părere: nu schimbă semaforul,
// verdictul, poarta, alertele sau 🎲.
var Retea = (function () {
  "use strict";
  var ORA = 3600000, ZI = 864e5, ISTORIE = 720, VERSIUNE = "r1", MIN_INDEP = 100, LIM = 10;
  var TRASATURI = ["z1", "z4", "z24", "z168", "volRel", "dMax7", "dMin7", "panta4", "panta24", "miscare", "dirStare", "oraSin", "oraCos", "ziSin", "ziCos", "btcZ24", "btcVolRel"];
  // ținta -> orele blocului independent: zilele (24 h), 3 zile (72 h), săptămânile (7 zile), 2 zile (liniștea 24/48 h)
  var TINTE = { "atinge-24": { bloc: 24 }, "atinge-72": { bloc: 72 }, "atinge-168": { bloc: 168 }, cursa: { bloc: 168 }, liniste: { bloc: 48 }, directie: { bloc: 24 }, rezultat: { bloc: 24 },
    "stop1-t212": { bloc: 24 }, "sare1-t212": { bloc: 24 }, "cursa5-t212": { bloc: 168 }, "directie-t212": { bloc: 168 }, "rezultat-t212": { bloc: 24 } };   /* v100.94 (L2): țintele pe acțiuni - zilele / săptămânile de bursă */
  // revizia finală (M1): distanțele pe care rețeaua a învățat - aceleași cu grila din retea/date.mjs (proba le compară); în afara lor nu dă cifră
  var INTERVAL = { 24: [0.01, 0.12], 72: [0.01, 0.12], 168: [0.1, 0.4], cursaT: [0.02, 0.08], cursaS: [0.02, 0.05] };
  // v100.94 (revizia 🔴1): pe acțiuni, marginile grilei învățate (STOPURI / CURSE din retea/date-t212.mjs - proba le ține egale); în afara lor nu se dă cifră
  var INTERVAL_T212 = { S: [0.02, 0.2], cursaT: [0.03, 0.4], cursaS: [0.03, 0.2] };
  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function taie(v) { return !isFinite(v) ? 0 : v > LIM ? LIM : v < -LIM ? -LIM : v; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function num(v, z) { return typeof TextRo !== "undefined" && TextRo.num ? TextRo.num(v, z) : String(v); }
  // abaterea randamentelor de 1 h (log) pe barele (i − n, i]
  function sigma(b, i, n) { var s = 0, s2 = 0; for (var j = i - n + 1; j <= i; j++) { var r = Math.log(b[j].c / b[j - 1].c); s += r; s2 += r * r; } var m = s / n, v = s2 / n - m * m; return v > 0 ? Math.sqrt(v) : 0; }
  // panta prețului (log) pe ultimele n bare, prin cele mai mici pătrate, pe toată fereastra
  function panta(b, i, n) { var sx = 0, sy = 0, sxx = 0, sxy = 0; for (var k = 0; k < n; k++) { var y = Math.log(b[i - n + 1 + k].c); sx += k; sy += y; sxx += k * k; sxy += k * y; } var d = n * sxx - sx * sx; return d > 0 ? (n * sxy - sx * sy) / d * (n - 1) : 0; }
  // ultima bară ÎNCHEIATĂ la momentul t (b[i].t + ORA <= t); -1 dacă nu e niciuna
  function indexLa(b, t) { var lo = 0, hi = (Array.isArray(b) ? b.length : 0) - 1, i = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (b[m].t + ORA <= t) { i = m; lo = m + 1; } else hi = m - 1; } return i; }
  // BTC la același moment: randamentul pe 24 h și volatilitatea pe 24 h față de 7 zile (ajung 169 de bare - fișa le ia din Pionex).
  // Revizia finală (I3): fără bara BTC încheiată în ultimele 2 ore de la t -> null - rețeaua n-a învățat cu BTC lipsă, deci nicio cifră.
  function btcLa(btc, t) {
    var j = indexLa(btc, t); if (j < 169 || t - (btc[j].t + ORA) > 2 * ORA) return null;
    var s24 = sigma(btc, j, 24), s168 = sigma(btc, j, 168);
    return s24 > 0 ? [Math.log(btc[j].c / btc[j - 24].c) / (s24 * Math.sqrt(24)), s168 > 0 ? Math.log(s24 / s168) : 0] : [0, 0];
  }
  // TRĂSĂTURILE la bara închisă i: doar b[0..i] și BTC-ul de până la același moment; stare(i) = starea 🎲 (implicit Probabilitati.stareLa).
  // -> { x: 17 cifre tăiate la ±10, s1 (abaterea orară pe 24 h), c, stare, t (momentul deciziei) }; null sub 30 de zile sau fără mișcare
  function trasaturiBare(b, i, btc, stare) {
    if (!Array.isArray(b) || !(i >= ISTORIE) || i >= b.length) return null;
    var c = b[i].c, s1 = sigma(b, i, 24), s168 = sigma(b, i, 168), s720 = sigma(b, i, 720);
    if (!(c > 0) || !(s1 > 0) || !(s168 > 0)) return null;
    var mx = -Infinity, mn = Infinity; for (var j = i - 167; j <= i; j++) { if (b[j].h > mx) mx = b[j].h; if (b[j].l < mn) mn = b[j].l; }
    var r = function (k) { return Math.log(c / b[i - k].c); }, d24 = s168 * Math.sqrt(24), t = b[i].t + ORA;
    var st = typeof stare === "function" ? stare(i) : Probabilitati.stareLa(b, i), ora = new Date(t).getUTCHours(), zi = new Date(t).getUTCDay(), bt = btcLa(btc, t);
    if (!bt) return null;
    var x = [r(1) / s1, r(4) / (2 * s1), r(24) / (s1 * Math.sqrt(24)), r(168) / (s168 * Math.sqrt(168)), s720 > 0 ? Math.log(s1 / s720) : 0,
      Math.log(mx / c) / d24, Math.log(c / mn) / d24, panta(b, i, 4) / (2 * s1), panta(b, i, 24) / (s1 * Math.sqrt(24)),
      st && st.indexOf("miscare") === 0 ? 1 : 0, st && /-sus$/.test(st) ? 1 : st && /-jos$/.test(st) ? -1 : 0,
      Math.sin(2 * Math.PI * ora / 24), Math.cos(2 * Math.PI * ora / 24), Math.sin(2 * Math.PI * zi / 7), Math.cos(2 * Math.PI * zi / 7), bt[0], bt[1]].map(taie);
    return { x: x, s1: s1, c: c, stare: st || null, t: t };
  }
  // intrările pe țintă = trăsăturile + ce cere ținta: distanța (simplă și în volatilități pe orizont) și semnul; la cursă, ambele distanțe
  function intrare(tinta, f, e) {
    if (!f) return null; e = e || {}; var sH = function (H) { return f.s1 * Math.sqrt(H); };
    if (/^atinge-\d+$/.test(tinta)) { var rel = nr(e.rel), H = nr(e.H); if (rel === null || rel === 0 || !(H > 0)) return null; return f.x.concat([rel, taie(Math.abs(rel) / sH(H)), rel > 0 ? 1 : -1]); }
    if (tinta === "cursa") { var T = nr(e.relT), S = nr(e.relS); if (T === null || S === null || T === 0 || S === 0) return null; return f.x.concat([T, S, taie(Math.abs(T) / sH(168)), taie(Math.abs(S) / sH(168))]); }
    if (tinta === "liniste") { var h = nr(e.H); if (!(h > 0)) return null; return f.x.concat([h / 48]); }
    if (tinta === "directie") return f.x.slice();
    return null;
  }
  // „Rezultatul tău”: botul (forma JurnalTrade) la pornire - setarea, rata ta de până atunci (DOAR boții închiși înainte de pornire, trasă
  // spre medie cu k = 10) și piața la pornire. Prețul de pornire = închiderea barei de dinainte (la fel la istoric, la botul care rulează
  // și la fișă). -> { x: 9 + 17 cifre, glob, rata, n }; null fără 30 de zile de bare la pornire sau cu gridul stricat
  function trasaturiBot(t, b, btc, ist, stare) {
    var por = nr(t && t.pornit), jos = nr(t && t.jos), sus = nr(t && t.sus);
    if (por === null || jos === null || sus === null || !(sus > jos) || !(jos > 0)) return null;
    var f = trasaturiBare(b, indexLa(b, por), btc, stare); if (!f) return null;
    var inainte = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && nr(x.inchis) !== null && x.inchis <= por && nr(x.net) !== null; });
    var n = inainte.length, glob = n ? inainte.filter(function (x) { return x.net > 0; }).length / n : 0.5;
    var peM = inainte.filter(function (x) { return x.moneda === t.moneda; }), plusM = peM.filter(function (x) { return x.net > 0; }).length;
    var rata = (plusM + 10 * glob) / (peM.length + 10), inv = nr(t.investit) > 0 ? nr(t.investit) : 0, pas = nr(t.pasNet);   // revizia finală (C1): suma de PORNIRE, nu „pus” (de la închidere)
    var dir = String(t.dir || "").toLowerCase(), lev = nr(t.levier) > 0 ? nr(t.levier) : 1;
    var x = [dir === "long" ? 1 : dir === "short" ? -1 : 0, Math.log(lev), Math.log((sus - jos) / f.c), pas > 0 ? Math.log(pas) : 0, pas > 0 ? 0 : 1,
      Math.min(1, Math.max(0, (f.c - jos) / (sus - jos))), Math.log(1 + inv), rata, Math.log(1 + peM.length)].map(taie);
    return { x: x.concat(f.x), glob: glob, rata: rata, n: n };
  }
  // ---- v100.94 (L2, acțiunile T212): trăsăturile ZILNICE - aceeași funcție pentru istoric (antrenor) și pentru „acum” (pagina) ----
  // bara zilei D (t = începutul ședinței, 13:30 UTC la Yahoo, sau miezul nopții la alte surse) e ÎNCHISĂ de la 01:30 UTC a zilei D+1 (după after-hours):
  // dimineața, la 8 ora României, bara de ieri e închisă; în timpul ședinței bara zilei nu e. Aceeași regulă la antrenor și pe pagină
  function inchisZi(t) { return Math.floor(t / ZI) * ZI + ZI + 1.5 * ORA; }
  // ultima bară zilnică ÎNCHISĂ la momentul t; -1 dacă nu e niciuna
  function indexZi(b, t) { var lo = 0, hi = (Array.isArray(b) ? b.length : 0) - 1, i = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (inchisZi(b[m].t) <= t) { i = m; lo = m + 1; } else hi = m - 1; } return i; }
  function sigmaZi(b, i, n) { var s = 0, s2 = 0; for (var j = i - n + 1; j <= i; j++) { var r = Math.log(b[j].c / b[j - 1].c); s += r; s2 += r * r; } var m = s / n, v = s2 / n - m * m; return v > 0 ? Math.sqrt(v) : 0; }
  function mediaZi(b, i, n) { var s = 0; for (var j = i - n + 1; j <= i; j++) s += b[j].c; return s / n; }
  // QQQ la aceeași zi (ultima bară a lui închisă până la ziua barei i, la cel mult o zi distanță): randamentul pe 5 zile în volatilitatea lui pe 20; null fără bară la zi sau sub 25 de bare
  function qqqLa(q, t) { if (!Array.isArray(q)) return null; var j = -1; for (var k = q.length - 1; k >= 0; k--) if (q[k].t <= t) { j = k; break; } if (j < 25 || t - q[j].t > ZI) return null; var s = sigmaZi(q, j, 20); return s > 0 ? Math.log(q[j].c / q[j - 5].c) / (s * Math.sqrt(5)) : 0; }
  // TRĂSĂTURILE la bara zilnică închisă i: doar b[0..i] și QQQ de până la aceeași zi; rata = rata lui pe acțiune (trasă spre medie) sau 0,5
  // -> { x: 14 cifre tăiate la ±10, s1 (volatilitatea zilnică pe 20 de zile), c, stare, t (momentul închiderii barei i: 01:30 UTC a doua zi) }; null sub 250 de zile, fără QQQ la zi sau fără mișcare
  function trasaturiZilnice(b, i, qqq, rata) {
    if (!Array.isArray(b) || !(i >= 250) || i >= b.length) return null;
    var c = b[i].c, s20 = sigmaZi(b, i, 20), s250 = sigmaZi(b, i, 250); if (!(c > 0) || !(s20 > 0) || !(s250 > 0)) return null;
    var qq = qqqLa(qqq, b[i].t); if (qq === null) return null;
    var mx = -Infinity; for (var j = i - 249; j <= i; j++) if (b[j].h > mx) mx = b[j].h;
    var r = function (k) { return Math.log(c / b[i - k].c); }, st = Probabilitati.stareActiuneLa(b, i), zi = new Date(b[i].t).getUTCDay(), rt = nr(rata);
    var x = [r(5) / (s20 * Math.sqrt(5)), r(20) / (s20 * Math.sqrt(20)), r(60) / (s20 * Math.sqrt(60)), Math.log(s20), Math.log(s20 / s250), Math.log(mx / c) / s20,
      Math.log(c / mediaZi(b, i, 50)), Math.log(c / mediaZi(b, i, 200)), qq, st && st.indexOf("sus") === 0 ? 1 : st && st.indexOf("jos") === 0 ? -1 : 0, st && /miscare$/.test(st) ? 1 : 0,
      Math.sin(2 * Math.PI * zi / 7), Math.cos(2 * Math.PI * zi / 7), rt === null ? 0.5 : rt].map(taie);
    return { x: x, s1: s20, c: c, stare: st || null, t: inchisZi(b[i].t) };
  }
  // intrările pe țintă T212 = trăsăturile + ce cere ținta: distanța la stop (simplă, în volatilități pe o zi) și semnul; la cursă ambele distanțe (pe 5 zile);
  // la „un trade ca ăsta”: valoarea cumpărată (log), rata lui globală, câte trade-uri a avut pe acțiune (log)
  function intrareActiune(tinta, f, e) {
    if (!f) return null; e = e || {}; var s5 = f.s1 * Math.sqrt(5);
    if (tinta === "stop1-t212" || tinta === "sare1-t212") { var S = nr(e.relS); if (S === null || S === 0) return null; return f.x.concat([S, taie(Math.abs(S) / f.s1), S > 0 ? 1 : -1]); }
    if (tinta === "cursa5-t212") { var T = nr(e.relT), S2 = nr(e.relS); if (T === null || S2 === null || T === 0 || S2 === 0) return null; return f.x.concat([T, S2, taie(Math.abs(T) / s5), taie(Math.abs(S2) / s5)]); }
    if (tinta === "directie-t212") return f.x.slice();
    if (tinta === "rezultat-t212") { var cost = nr(e.cost), glob = nr(e.glob), nPe = nr(e.nPe); if (cost === null || !(cost > 0) || glob === null || nPe === null) return null; return f.x.concat([Math.log(cost), glob, Math.log(1 + nPe)]); }
    return null;
  }
  // rata lui pe o acțiune: perechile închise ÎNAINTE de `pana` (netul după comisioane și conversie, 0,3% din cost), globală și pe ticker trasă spre medie cu k = 10 - aceeași regulă ca date-t212.rataPe
  function rataPe(ist, ticker, pana) {
    var l = (Array.isArray(ist) ? ist : []).filter(function (t) { return t && nr(t.inchis) !== null && t.inchis <= pana && nr(t.cost) > 0 && nr(t.rezultat) !== null; }), plusDe = function (t) { return t.rezultat > 0; };   /* revizia 🟡7: rezultatul e deja NET (T212.perechi scade comisioanele) */
    var n = l.length, glob = n ? l.filter(plusDe).length / n : 0.5, pe = l.filter(function (t) { return t.ticker === ticker; }), plus = pe.filter(plusDe).length;
    return { glob: glob, rata: (plus + 10 * glob) / (pe.length + 10), nPe: pe.length };
  }
  // v100.94 (revizia 🟡5): costul tipic al unui trade de-al lui = mediana costului perechilor închise (lei); null fără perechi - „un trade ca ăsta” se judecă la mărimea lui, nu la 100 de lei
  function costTipic(ist) {
    var c = (Array.isArray(ist) ? ist : []).map(function (t) { return t ? nr(t.cost) : null; }).filter(function (v) { return v !== null && v > 0; }).sort(function (a, b) { return a - b; });
    if (!c.length) return null; var m = c.length >> 1; return c.length % 2 ? c[m] : (c[m - 1] + c[m]) / 2;
  }
  // intrările pe o acțiune (poziție / poartă): o = { acum, pret, stop, tinta, ticker }; bare = barele zilnice ale paginii (GridCalcul.bare a scos deja bara în formare;
  // aici se ia ultima ÎNCHISĂ la `acum`); ist = perechile lui închise. -> { la, f, lista: [{cod, tinta, x}] }: stop1 + sare1 (cu stop sub preț), cursa5 (și cu țintă peste preț), directie5 (mereu)
  function intrariActiune(bare, o, qqq, ist) {
    o = o || {}; var acum = nr(o.acum) || Date.now(), b = Array.isArray(bare) ? bare : [], i = indexZi(b, acum), pr = nr(o.pret);
    if (i < 0 || !(pr > 0)) return null;
    var rp = rataPe(ist, o.ticker, acum), f = trasaturiZilnice(b, i, Array.isArray(qqq) ? qqq : null, rp.rata); if (!f) return null;
    var rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / pr - 1 : null; }, relS = rel(o.stop), relT = rel(o.tinta), lista = [];
    var pune = function (cod, tinta, e) { var x = intrareActiune(tinta, f, e); if (x) lista.push({ cod: cod, tinta: tinta, x: x }); };
    var inI = function (v, iv) { var a = Math.abs(v); return a >= iv[0] - 1e-9 && a <= iv[1] + 1e-9; };   /* revizia 🔴1: în afara grilei învățate nu se dă cifră (ca Retea.INTERVAL pe boți) */
    if (relS !== null && relS < 0 && inI(relS, INTERVAL_T212.S)) { pune("stop1", "stop1-t212", { relS: relS }); pune("sare1", "sare1-t212", { relS: relS }); if (relT !== null && relT > 0 && inI(relT, INTERVAL_T212.cursaT) && inI(relS, INTERVAL_T212.cursaS)) pune("cursa5", "cursa5-t212", { relT: relT, relS: relS }); }
    pune("directie5", "directie-t212", {});
    return { la: acum, f: f, lista: lista };
  }
  // -> { la, v, p: {cod: probabilitate} } pe codurile rândurilor 🎲 de pe acțiuni (stop1, sare1, cursa5) + directie5; null fără modele T212, fără 250 de zile de bare sau fără QQQ
  function pentruActiune(modele, bare, o, qqq, ist) {
    if (!modele || typeof modele !== "object") return null;
    var it = intrariActiune(bare, o, qqq, ist); if (!it) return null;
    var p = {}, k = 0; it.lista.forEach(function (q) { var m = modele[q.tinta]; if (!m || m.versiune !== VERSIUNE) return; var v = prezice(m, q.x); if (v !== null) { p[q.cod] = Math.round(v * 1000) / 1000; k++; } });
    return k ? { la: it.la, v: VERSIUNE, p: p } : null;
  }
  // „un trade ca ăsta iese pe plus”: t = { ticker, pornit, cost } la ultima zi ÎNCHISĂ dinaintea cumpărării -> { x, glob, rata, n } sau null
  function intrareCumparare(t, bare, qqq, ist) {
    var por = nr(t && t.pornit), cost = nr(t && t.cost); if (por === null || !(cost > 0)) return null;
    var b = Array.isArray(bare) ? bare : [], i = indexZi(b, por); if (i < 0) return null;
    var rp = rataPe(ist, t.ticker, por), f = trasaturiZilnice(b, i, Array.isArray(qqq) ? qqq : null, rp.rata); if (!f) return null;
    var x = intrareActiune("rezultat-t212", f, { cost: cost, glob: rp.glob, nPe: rp.nPe }); return x ? { x: x, glob: rp.glob, rata: rp.rata, n: rp.nPe } : null;
  }
  // modelul rezultat-t212 antrenat ÎNAINTE de cumpărare (cel de după ar fi văzut ce a urmat), ca la pentruPornire
  function pentruCumparare(modele, t, bare, qqq, ist) {
    var m = modele && modele["rezultat-t212"]; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null || (nr(m.la) !== null && m.la > por)) return null;
    var f = intrareCumparare(t, bare, qqq, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
  // trecerea înainte: normalizarea modelului, apoi straturile (W[intrare][ieșire], b, act), media ansamblului; null la intrare greșită
  function prezice(model, x) {
    if (!model || !model.norm || !Array.isArray(model.norm.m) || !Array.isArray(model.ansamblu) || !model.ansamblu.length || !Array.isArray(x) || x.length !== model.norm.m.length) return null;
    var z = new Array(x.length);
    for (var k = 0; k < x.length; k++) { var v = nr(x[k]); if (v === null) return null; var s = nr(model.norm.s[k]); z[k] = (v - model.norm.m[k]) / (s > 0 ? s : 1); }
    var sum = 0;
    for (var e = 0; e < model.ansamblu.length; e++) {
      var h = z;
      for (var L = 0; L < model.ansamblu[e].length; L++) {
        var st = model.ansamblu[e][L], out = new Array(st.b.length);
        for (var o = 0; o < out.length; o++) { var a = st.b[o]; for (var q = 0; q < h.length; q++) a += h[q] * st.W[q][o]; out[o] = st.act === "relu" ? (a > 0 ? a : 0) : st.act === "sigmoid" ? 1 / (1 + Math.exp(-a)) : a; }
        h = out;
      }
      sum += h[0];
    }
    var p = sum / model.ansamblu.length; return isFinite(p) ? p : null;
  }
  // v100.95 (ideea 3): la ritmul de până acum (cazuri independente pe lună judecată - istoria se adună o lună pe lună), cam cât mai
  // durează până la MIN_INDEP; peste 3 ani se spune în ani; fără luni judecate sau fără cazuri nu există ritm
  function incaLuni(v) {
    var n = nr(v.nIndep), lg = nr(v.luniGata);
    if (n === null || !(n > 0) || n >= MIN_INDEP || lg === null || !(lg >= 1)) return "";
    var m = Math.ceil((MIN_INDEP - n) / (n / lg));
    return " · încă ~" + (m > 36 ? cate(Math.ceil(m / 12), "an", "ani") : cate(m, "lună", "luni"));
  }
  // pragul „dovedită” (specul): toate patru, față de reper ȘI de formula simplă; altfel motivul, în ordinea în care cade
  function decide(v) {
    if (!v) return { dovedita: false, motiv: "neverificată încă" };
    if (nr(v.luniGata) !== null && nr(v.luni) !== null && v.luniGata < v.luni) return { dovedita: false, motiv: "verificarea în lucru: " + v.luniGata + " din " + cate(v.luni, "lună", "luni") };
    if (!(nr(v.nIndep) >= MIN_INDEP)) return { dovedita: false, motiv: "prea puține cazuri: " + (nr(v.nIndep) || 0) + " din " + MIN_INDEP + incaLuni(v) };
    var rep = v.reper || "🎲";
    if (!(v.ic && v.ic[0] > 0)) return { dovedita: false, motiv: "nu bate " + rep + " (Brier " + num(v.brier, 3) + " față de " + num(v.brierReper, 3) + ")" };
    if (!(v.icLog && v.icLog[0] > 0)) return { dovedita: false, motiv: "nu face mai mult decât o formulă simplă" };
    if (!(nr(v.bss3) !== null && v.bss3 >= 0)) return { dovedita: false, motiv: "pică pe ultimele 3 luni" };
    if (!(v.logloss <= v.loglossReper)) return { dovedita: false, motiv: "log-loss mai rău decât " + rep };
    if (!(v.logloss <= v.loglossLog)) return { dovedita: false, motiv: "log-loss mai rău decât formula simplă" };
    return { dovedita: true, motiv: null };
  }
  // verdictul unui model, pentru pagini: null fără model sau pe altă versiune a trăsăturilor (modelul vechi nu se folosește)
  // v100.93 (arborii): aceeași regulă „dovedită” și pe modelele arborilor - versiunea lor e Arbori.VERSIUNE (proba (10) le ține egale)
  var VERSIUNE_ARBORI = "a1";
  function verdictCu(m, acum, ver) {
    if (!m || m.versiune !== ver) return null;
    var d = decide(m.verificare || null), v = m.verificare || {}, la = nr(m.la), z = la !== null ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    return { dovedita: d.dovedita, motiv: d.motiv, nIndep: nr(v.nIndep) || 0, bloc: (TINTE[m.tinta] || { bloc: 24 }).bloc, vechi: z !== null && z >= 2 ? z : null };
  }
  function verdict(m, acum) { return verdictCu(m, acum, VERSIUNE); }
  function verdictArbori(m, acum) { return verdictCu(m, acum, VERSIUNE_ARBORI); }
  // aceleași intrări ca Probabilitati.pentruBot (o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}); modele = {tinta: model}.
  // -> { la, v, p: {cod: probabilitate} } pe codurile rândurilor 🎲 + „directie-24”; null fără modele, fără 30 de zile de bare sau fără nicio cifră
  // v100.93 (arborii): UN singur producător de intrări pentru 🧠 și 🌳 - codurile rândurilor 🎲 + „directie-24”, cu intrarea pe țintă
  // (aceleași praguri INTERVAL ca până acum); modelele doar prezic peste lista asta. -> { la, f, lista: [{cod, tinta, x}] } sau null
  function intrariBot(bare, o, btc) {
    o = o || {}; var acum = nr(o.acum) || Date.now(), b = Probabilitati.pregateste(bare, acum), f = trasaturiBare(b, b.length - 1, btc ? Probabilitati.pregateste(btc, acum) : null), pr = nr(o.pret);
    if (!f || !(pr > 0)) return null;
    var rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / pr - 1 : null; }, dir = String(o.dir || "").toLowerCase(), lista = [];
    var inInterval = function (v, iv) { var a = Math.abs(v); return a >= iv[0] - 1e-9 && a <= iv[1] + 1e-9; };
    var pune = function (cod, tinta, e) { if (/^atinge-/.test(tinta) && !inInterval(e.rel, INTERVAL[e.H])) return; if (tinta === "cursa" && !(inInterval(e.relT, INTERVAL.cursaT) && inInterval(e.relS, INTERVAL.cursaS))) return; var x = intrare(tinta, f, e); if (x) lista.push({ cod: cod, tinta: tinta, x: x }); };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    if (jos !== null && jos < 0) { pune("iese-jos-24", "atinge-24", { rel: jos, H: 24 }); pune("iese-jos-72", "atinge-72", { rel: jos, H: 72 }); }
    if (sus !== null && sus > 0) { pune("iese-sus-24", "atinge-24", { rel: sus, H: 24 }); pune("iese-sus-72", "atinge-72", { rel: sus, H: 72 }); }
    if ((dir === "long" && lich !== null && lich < 0) || (dir === "short" && lich !== null && lich > 0)) pune("lichidare", "atinge-168", { rel: lich, H: 168 });
    var cursaOk = tinta !== null && stop !== null && (dir === "long" ? tinta > 0 && stop < 0 && (lich === null || stop > lich) : dir === "short" ? tinta < 0 && stop > 0 && (lich === null || stop < lich) : false);
    if (cursaOk) pune("cursa", "cursa", { relT: tinta, relS: stop });
    if (f.stare && f.stare.indexOf("liniste") === 0) { pune("liniste-24", "liniste", { H: 24 }); pune("liniste-48", "liniste", { H: 48 }); }
    pune("directie-24", "directie", {});
    return { la: acum, f: f, lista: lista };
  }
  // aceleași intrări ca Probabilitati.pentruBot (o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}); modele = {tinta: model}.
  // -> { la, v, p: {cod: probabilitate} } pe codurile rândurilor 🎲 + „directie-24”; null fără modele, fără 30 de zile de bare sau fără nicio cifră
  function pentruBot(modele, bare, o, btc) {
    if (!modele || typeof modele !== "object") return null;
    var it = intrariBot(bare, o, btc); if (!it) return null;
    var p = {}, k = 0;
    it.lista.forEach(function (q) { var m = modele[q.tinta]; if (!m || m.versiune !== VERSIUNE) return; var v = prezice(m, q.x); if (v !== null) { p[q.cod] = Math.round(v * 1000) / 1000; k++; } });
    return k ? { la: it.la, v: VERSIUNE, p: p } : null;
  }
  // „Rezultatul tău” la pornire: botul care rulează (pornit = pornitLa) sau fișa (pornit = acum); ist = boții închiși (forma JurnalTrade)
  // v100.93 (arborii): intrarea „la pornire” - producător comun: trăsăturile botului la pornire (barele pregătite la `pornit`) -> { x, glob, rata, n } sau null
  function intrarePornire(t, bare, btc, ist) {
    var por = nr(t && t.pornit); if (por === null) return null;
    return trasaturiBot(t, Probabilitati.pregateste(bare, por), btc ? Probabilitati.pregateste(btc, por) : null, ist);
  }
  function pentruPornire(modele, t, bare, btc, ist) {
    var m = modele && modele.rezultat; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null) return null;
    if (nr(m.la) !== null && m.la > por) return null;   /* revizia finală (I7): modelul de după pornire ar fi văzut ce a urmat */
    var f = intrarePornire(t, bare, btc, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
  // ---- rândurile 🧠 (Tablou, fișă) ----
  var NUME = { "atinge-24": "Atinge un nivel în 24 h", "atinge-72": "Atinge un nivel în 3 zile", "atinge-168": "Atinge lichidarea în 7 zile", cursa: "Ținta înaintea stopului, în 7 zile", liniste: "Liniștea mai ține", directie: "Prețul mai sus peste 24 h", rezultat: "Rezultatul tău",
    "stop1-t212": "Atinge stopul mâine", "sare1-t212": "Deschiderea sare peste stop", "cursa5-t212": "Ținta înaintea stopului în 5 zile de bursă", "directie-t212": "Prețul mai sus peste 5 zile de bursă", "rezultat-t212": "Un trade ca ăsta iese pe plus" };   /* v100.94 (L2; revizia, ruling 4): numele întregi încap de când rândul 🌳 nu mai repetă formula */
  var UNIT = { 24: ["zi independentă", "zile independente"], 48: ["bloc de 2 zile", "blocuri de 2 zile"], 72: ["bloc de 3 zile", "blocuri de 3 zile"], 168: ["săptămână", "săptămâni"] };
  var TINTA_DE = { cursa: "cursa", "iese-jos-24": "atinge-24", "iese-sus-24": "atinge-24", "iese-jos-72": "atinge-72", "iese-sus-72": "atinge-72", lichidare: "atinge-168", "liniste-24": "liniste", "liniste-48": "liniste", "directie-24": "directie", stop1: "stop1-t212", sare1: "sare1-t212", cursa5: "cursa5-t212", directie5: "directie-t212" };   /* v100.94 (L2): codurile rândurilor 🎲 de pe acțiuni */
  function PC(v) { return Math.round(v * 100) + "%"; }
  function eticheta(vd) { var u = UNIT[vd.bloc] || UNIT[24]; return vd.dovedita ? "dovedită pe " + cate(vd.nIndep, u[0], u[1]) : "nedovedită: " + vd.motiv; }
  function semn(v, z) { var s = num(Math.abs(v), z); return v > 0 ? "+" + s : v < 0 ? "−" + s : s; }
  // forma tbProbRandHtml ({cod, titlu, p, p2, ic, avertizare, text}): titlul rândului 🎲, cifra rețelei, cifra 🎲 alături și starea;
  // direcția cu „cât dat cu banul” până e dovedită; rezultatul tău lângă rata ta. zar = Probabilitati.randuri(...); o = {acum, pornire}
  // v100.93 (arborii): arb = { modele, rt } (modelele 🌳 + ce a dat Arbori.pentruBot) ⇒ rândul 1 „🧠 x% · 🌳 y% · 🎲 z%”, rândul 2 „🧠 stare · 🌳 stare”
  // (despărțite cu „\n”, fiecare ≤ 160); p = cifra mare (familia dovedită când e una singură, altfel 🧠), p2 = cealaltă, familia = a cui e p;
  // fără arb ⇒ exact rândurile de ieri; fără rețea, doar cu arbori ⇒ „🌳 y% · 🎲 z%” + „🌳 stare”
  function randuri(modele, rt, zar, o, arb) {
    o = o || {}; var out = [], acum = nr(o.acum) || Date.now();
    var cuR = !!(modele && rt && !(rt.v && rt.v !== VERSIUNE)), p = cuR ? rt.p || {} : {};
    var A = arb && arb.modele && arb.rt && arb.rt.v === VERSIUNE_ARBORI ? arb : null, pa = A ? A.rt.p || {} : {};
    if (!cuR && !A) return out;
    var vR = function (t) { return cuR ? verdict(modele[t], acum) : null; }, vA = function (t) { return A ? verdictArbori(A.modele[t], acum) : null; };
    var ban = function (vd, cuBan) { return cuBan && !vd.dovedita ? "cât dat cu banul — " : ""; };
    // un rând din cele două familii: q/vd = 🧠, qa/vda = 🌳 (null = familia n-are cifră sau verdict); cifre = ce stă între cifre și stări (🎲 / rata ta)
    var rand = function (cod, titlu, q, vd, qa, vda, cifre, cuBan) {
      var r = q !== null && !!vd, a = qa !== null && !!vda; if (!r && !a) return;
      var x = { cod: cod, titlu: titlu, p: r ? q : qa, ic: null, avertizare: false };
      // revizia 04.10 (🔵5, specul): cu amândouă, cifra mare și semnul plin stau pe familia DOVEDITĂ când e una singură (altfel pe 🧠); familia = a cui e cifra mare
      if (r && a) { var doarA = !!(vda.dovedita && !vd.dovedita); x.p = doarA ? qa : q; x.p2 = doarA ? q : qa; x.familia = doarA ? "🌳" : "🧠"; }
      if (!A) { x.text = (cifre ? cifre + " · " : "") + ban(vd, cuBan) + eticheta(vd); out.push(x); return; }
      var c = [], s = [];
      if (r) c.push("🧠 " + PC(q)); if (a) c.push("🌳 " + PC(qa)); if (cifre) c.push(cifre);
      if (cuBan && r && a && !vd.dovedita && !vda.dovedita) { s.push("cât dat cu banul — 🧠 " + eticheta(vd)); s.push("🌳 " + eticheta(vda)); }
      else { if (r) s.push("🧠 " + ban(vd, cuBan) + eticheta(vd)); if (a) s.push("🌳 " + ban(vda, cuBan) + eticheta(vda)); }
      x.text = c.join(" · ") + "\n" + s.join(" · "); out.push(x);   /* revizia 04.10 (🟡4): stările pe al doilea rând - fiecare rând ≤ 160 */
    };
    (Array.isArray(zar) ? zar : []).forEach(function (z) {
      if (nr(z.p) === null) return; var t = TINTA_DE[z.cod];
      rand(z.cod, z.titlu, nr(p[z.cod]), vR(t), nr(pa[z.cod]), vA(t), "🎲 " + PC(z.p), false);
    });
    var cD = o.codDirectie || "directie-24", tD = TINTA_DE[cD] || "directie";   /* v100.94 (L2): pe acțiuni codul e directie5 (5 zile de bursă) */
    rand(cD, NUME[tD], nr(p[cD]), vR(tD), nr(pa[cD]), vA(tD), "", true);
    var okP = function (x) { return x && nr(x.p) !== null && nr(x.rata) !== null ? x : null; }, pz = okP(o.pornire), pzA = okP(A && A.rt.pornire);
    var rata = pz ? pz.rata : pzA ? pzA.rata : null;
    var tR = o.tintaRezultat || "rezultat";   /* v100.94 (L2): pe acțiuni ținta e rezultat-t212 („Un trade ca ăsta pe plus”) */
    if (rata !== null) rand(tR, tR === "rezultat" ? "La pornire, un bot ca ăsta ieșea pe plus" : NUME[tR], pz ? pz.p : null, vR(tR), pzA ? pzA.p : null, vA(tR), "rata ta: " + PC(rata), false);
    return out;
  }
  // capul sub-blocului; modelul mai vechi de 2 zile se spune (antrenarea n-a mers de atunci)
  // v100.93: cu modelele arborilor (arbori = {tinta: model}) titlul numește amândouă familiile; fiecare familie veche se spune cu emoji-ul ei
  function antet(modele, acum, arbori) {
    var zile = function (mm) { var la = 0; Object.keys(mm || {}).forEach(function (k) { var x = nr(mm[k] && mm[k].la); if (x !== null && x > la) la = x; }); return la ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null; };
    var z = zile(modele), cuA = Object.keys(arbori || {}).some(function (k) { return !!(arbori[k] && arbori[k].versiune === VERSIUNE_ARBORI); });
    var implicit = "Nu schimbă semaforul, verdictul sau alertele; o cifră contează doar când e „dovedită”.";
    if (!cuA) return { titlu: "🧠 Rețeaua neuronală — a doua părere", sub: z !== null && z >= 2 ? "Model de acum " + cate(z, "zi", "zile") + " — antrenarea n-a mers de atunci." : implicit };
    var za = zile(arbori), s = [];
    if (z !== null && z >= 2) s.push("🧠 model de acum " + cate(z, "zi", "zile")); if (za !== null && za >= 2) s.push("🌳 model de acum " + cate(za, "zi", "zile"));
    return { titlu: "A doua părere: 🧠 rețeaua · 🌳 arborii", sub: s.length ? s.join(" · ") + " — antrenarea n-a mers de atunci." : implicit.replace(/\.$/, "") + " · semnul plin = cifra mare, inelul = cealaltă familie." };   /* v100.94 (ideea 3): legenda benzii */
  }
  // „Cum s-a verificat”: un rând pe țintă - cazurile independente, Brier rețea / reper / formula simplă, IC față de reper
  // v100.93: + un rând 🌳 pe țintă, cu cazurile LUI (pot diferi de ale rețelei când lunile judecate diferă - revizia 04.10): Brier, IC și „față de 🧠” (BSS al arborilor cu rețeaua drept reper, cu IC)
  // v100.94 (revizia 🔵8): o = { actiuni } - pe pagina T212 doar țintele de pe acțiuni, pe crypto doar cele crypto (fiecare pagină își citește piața)
  // v100.95 (ideea 1): rândul Busolei - ce a aflat EA despre predicțiile 🧠 trimise de Radar (din-radar-bilant.json de pe PC-ul lui, urcat
  // de colector în KV); b = { la, retea: { judecate, independente, brier, brierBaza, verdict } }; verdictul ei, în cuvintele ei; null fără bilanț
  var VERDICT_BUSOLA = { "bate rata de bază": "bate rata de bază", "mai prost": "mai prost decât rata de bază", "n-am aflat": "n-am aflat (IC peste zero)" };
  function textBusola(b, acum) {
    var r = b && b.retea; if (!r || typeof r !== "object") return null;
    var j = nr(r.judecate) || 0, ind = nr(r.independente) || 0, la = nr(b.la), z = la !== null ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    var vechi = z !== null && z >= 2 ? " · bilanț de acum " + cate(z, "zi", "zile") : "";
    if (!(j > 0)) return "🧭 Busola n-a judecat încă nicio predicție 🧠 (le judecă după ce le trece orizontul)" + vechi + ".";
    var cap = "🧭 Busola a judecat " + cate(j, "predicție", "predicții") + " 🧠 (" + ind + " independente)";
    if (r.verdict === "prea puține") return cap + ": prea puține ca să judece (de la 100 independente)" + vechi + ".";
    var br = nr(r.brier), bb = nr(r.brierBaza), v = VERDICT_BUSOLA[r.verdict] || String(r.verdict || "");
    return cap + (br !== null && bb !== null ? ": Brier " + num(br, 3) + " față de " + num(bb, 3) + " la rata de bază" : "") + " ⇒ " + v + vechi + ".";
  }
  // v100.95: cu o.busola (bilanțul Busolei) rândul ei stă primul - doar pe paginile crypto (Busola judecă boții, nu acțiunile)
  function subsol(modele, arbori, o) {
    var eT = function (k) { return /-t212$/.test(k); }, vrea = function (k) { return o && o.actiuni ? eT(k) : !eT(k); };
    var out = Object.keys(NUME).filter(function (k) { return vrea(k) && modele && modele[k] && modele[k].versiune === VERSIUNE; }).map(function (k) {
      var v = modele[k].verificare, u = UNIT[(TINTE[k] || { bloc: 24 }).bloc] || UNIT[24];
      if (!v) return NUME[k] + ": neverificată încă.";
      return NUME[k] + ": " + cate(v.nIndep, u[0], u[1]) + ", Brier " + num(v.brier, 3) + " · " + (v.reper || "🎲") + " " + num(v.brierReper, 3) + " · formula simplă " + num(v.brierLog, 3) + (v.ic ? " · IC " + num(v.ic[0], 2) + "…" + num(v.ic[1], 2) : "") + ".";
    });
    Object.keys(NUME).filter(function (k) { return vrea(k) && arbori && arbori[k] && arbori[k].versiune === VERSIUNE_ARBORI; }).forEach(function (k) {
      var v = arbori[k].verificare, vs = v && v.vsRetea, u = UNIT[(TINTE[k] || { bloc: 24 }).bloc] || UNIT[24];
      if (!v) { out.push("🌳 " + NUME[k] + ": neverificată încă."); return; }
      out.push("🌳 " + NUME[k] + ": " + cate(v.nIndep, u[0], u[1]) + ", Brier " + num(v.brier, 3) + " · " + (v.reper || "🎲") + " " + num(v.brierReper, 3) + (v.ic ? " · IC " + num(v.ic[0], 2) + "…" + num(v.ic[1], 2) : "")
        + (vs && nr(vs.bss) !== null && vs.ic ? " · față de 🧠: " + semn(vs.bss, 3) + " (IC " + semn(vs.ic[0], 3) + "…" + semn(vs.ic[1], 3) + ")" : "") + ".");
    });
    if (o && !o.actiuni && o.busola) { var tb = textBusola(o.busola, o.acum); if (tb) out.unshift(tb); }
    return out;
  }
  // rândul gri de la poarta fișei; v100.93: cu arborii (pzA, vdA) două rânduri (despărțite cu „\n”): cifrele celor două familii, apoi stările lor
  function textPornire(pz, vd, pzA, vdA) {
    if (!pzA || !vdA || nr(pzA.p) === null) return "Un bot ca ăsta ar ieși pe plus: " + PC(pz.p) + " · rata ta: " + PC(pz.rata) + " · " + eticheta(vd) + ".";
    return "Un bot ca ăsta ar ieși pe plus: 🧠 " + PC(pz.p) + " · 🌳 " + PC(pzA.p) + " · rata ta: " + PC(pz.rata) + ".\n🧠 " + eticheta(vd) + " · 🌳 " + eticheta(vdA) + ".";
  }
  return { VERSIUNE: VERSIUNE, TRASATURI: TRASATURI, TINTE: TINTE, NUME: NUME, TINTA_DE: TINTA_DE, INTERVAL: INTERVAL, INTERVAL_T212: INTERVAL_T212, ORA: ORA, indexLa: indexLa, trasaturiBare: trasaturiBare, intrare: intrare, trasaturiBot: trasaturiBot, inchisZi: inchisZi, indexZi: indexZi, trasaturiZilnice: trasaturiZilnice, intrareActiune: intrareActiune, prezice: prezice, decide: decide, verdict: verdict, VERSIUNE_ARBORI: VERSIUNE_ARBORI, verdictArbori: verdictArbori, pentruBot: pentruBot, pentruPornire: pentruPornire, intrariBot: intrariBot, intrarePornire: intrarePornire, intrariActiune: intrariActiune, pentruActiune: pentruActiune, intrareCumparare: intrareCumparare, pentruCumparare: pentruCumparare, rataPe: rataPe, costTipic: costTipic, randuri: randuri, antet: antet, textBusola: textBusola, subsol: subsol, textPornire: textPornire };
})();
if (typeof globalThis !== "undefined") globalThis.Retea = Retea;
