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
  var TINTE = { "atinge-24": { bloc: 24 }, "atinge-72": { bloc: 72 }, "atinge-168": { bloc: 168 }, cursa: { bloc: 168 }, liniste: { bloc: 48 }, directie: { bloc: 24 }, rezultat: { bloc: 24 } };
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
  // BTC la același moment: randamentul pe 24 h și volatilitatea pe 24 h față de 7 zile (ajung 169 de bare - fișa le ia din Pionex)
  function btcLa(btc, t) {
    var j = indexLa(btc, t); if (j < 169) return [0, 0];
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
    var rata = (plusM + 10 * glob) / (peM.length + 10), inv = nr(t.pus) > 0 ? nr(t.pus) : nr(t.investit) > 0 ? nr(t.investit) : 0, pas = nr(t.pasNet);
    var dir = String(t.dir || "").toLowerCase(), lev = nr(t.levier) > 0 ? nr(t.levier) : 1;
    var x = [dir === "long" ? 1 : dir === "short" ? -1 : 0, Math.log(lev), Math.log((sus - jos) / f.c), pas > 0 ? Math.log(pas) : 0, pas > 0 ? 0 : 1,
      Math.min(1, Math.max(0, (f.c - jos) / (sus - jos))), Math.log(1 + inv), rata, Math.log(1 + peM.length)].map(taie);
    return { x: x.concat(f.x), glob: glob, rata: rata, n: n };
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
  // pragul „dovedită” (specul): toate patru, față de reper ȘI de formula simplă; altfel motivul, în ordinea în care cade
  function decide(v) {
    if (!v) return { dovedita: false, motiv: "neverificată încă" };
    if (nr(v.luniGata) !== null && nr(v.luni) !== null && v.luniGata < v.luni) return { dovedita: false, motiv: "verificarea în lucru: " + v.luniGata + " din " + cate(v.luni, "lună", "luni") };
    if (!(nr(v.nIndep) >= MIN_INDEP)) return { dovedita: false, motiv: "prea puține cazuri: " + (nr(v.nIndep) || 0) + " din " + MIN_INDEP };
    var rep = v.reper || "🎲";
    if (!(v.ic && v.ic[0] > 0)) return { dovedita: false, motiv: "nu bate " + rep + " (Brier " + num(v.brier, 3) + " față de " + num(v.brierReper, 3) + ")" };
    if (!(v.icLog && v.icLog[0] > 0)) return { dovedita: false, motiv: "nu face mai mult decât o formulă simplă" };
    if (!(nr(v.bss3) !== null && v.bss3 >= 0)) return { dovedita: false, motiv: "pică pe ultimele 3 luni" };
    if (!(v.logloss <= v.loglossReper)) return { dovedita: false, motiv: "log-loss mai rău decât " + rep };
    if (!(v.logloss <= v.loglossLog)) return { dovedita: false, motiv: "log-loss mai rău decât formula simplă" };
    return { dovedita: true, motiv: null };
  }
  // verdictul unui model, pentru pagini: null fără model sau pe altă versiune a trăsăturilor (modelul vechi nu se folosește)
  function verdict(m, acum) {
    if (!m || m.versiune !== VERSIUNE) return null;
    var d = decide(m.verificare || null), v = m.verificare || {}, la = nr(m.la), z = la !== null ? Math.floor(((nr(acum) || Date.now()) - la) / ZI) : null;
    return { dovedita: d.dovedita, motiv: d.motiv, nIndep: nr(v.nIndep) || 0, bloc: (TINTE[m.tinta] || { bloc: 24 }).bloc, vechi: z !== null && z >= 2 ? z : null };
  }
  // aceleași intrări ca Probabilitati.pentruBot (o = {acum, pret, dir, jos, sus, lichidare, tinta, stop}); modele = {tinta: model}.
  // -> { la, v, p: {cod: probabilitate} } pe codurile rândurilor 🎲 + „directie-24”; null fără modele, fără 30 de zile de bare sau fără nicio cifră
  function pentruBot(modele, bare, o, btc) {
    o = o || {}; if (!modele || typeof modele !== "object") return null;
    var acum = nr(o.acum) || Date.now(), b = Probabilitati.pregateste(bare, acum), f = trasaturiBare(b, b.length - 1, btc ? Probabilitati.pregateste(btc, acum) : null), pr = nr(o.pret);
    if (!f || !(pr > 0)) return null;
    var rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / pr - 1 : null; }, dir = String(o.dir || "").toLowerCase(), p = {}, k = 0;
    var pune = function (cod, tinta, e) { var m = modele[tinta]; if (!m || m.versiune !== VERSIUNE) return; var x = intrare(tinta, f, e), q = x ? prezice(m, x) : null; if (q !== null) { p[cod] = Math.round(q * 1000) / 1000; k++; } };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    if (jos !== null && jos < 0) { pune("iese-jos-24", "atinge-24", { rel: jos, H: 24 }); pune("iese-jos-72", "atinge-72", { rel: jos, H: 72 }); }
    if (sus !== null && sus > 0) { pune("iese-sus-24", "atinge-24", { rel: sus, H: 24 }); pune("iese-sus-72", "atinge-72", { rel: sus, H: 72 }); }
    if ((dir === "long" && lich !== null && lich < 0) || (dir === "short" && lich !== null && lich > 0)) pune("lichidare", "atinge-168", { rel: lich, H: 168 });
    var cursaOk = tinta !== null && stop !== null && (dir === "long" ? tinta > 0 && stop < 0 && (lich === null || stop > lich) : dir === "short" ? tinta < 0 && stop > 0 && (lich === null || stop < lich) : false);
    if (cursaOk) pune("cursa", "cursa", { relT: tinta, relS: stop });
    if (f.stare && f.stare.indexOf("liniste") === 0) { pune("liniste-24", "liniste", { H: 24 }); pune("liniste-48", "liniste", { H: 48 }); }
    pune("directie-24", "directie", {});
    return k ? { la: acum, v: VERSIUNE, p: p } : null;
  }
  // „Rezultatul tău” la pornire: botul care rulează (pornit = pornitLa) sau fișa (pornit = acum); ist = boții închiși (forma JurnalTrade)
  function pentruPornire(modele, t, bare, btc, ist) {
    var m = modele && modele.rezultat; if (!m || m.versiune !== VERSIUNE) return null;
    var por = nr(t && t.pornit); if (por === null) return null;
    var f = trasaturiBot(t, Probabilitati.pregateste(bare, por), btc ? Probabilitati.pregateste(btc, por) : null, ist); if (!f) return null;
    var q = prezice(m, f.x); return q === null ? null : { p: Math.round(q * 1000) / 1000, rata: Math.round(f.rata * 1000) / 1000, n: f.n };
  }
  return { VERSIUNE: VERSIUNE, TRASATURI: TRASATURI, TINTE: TINTE, ORA: ORA, indexLa: indexLa, trasaturiBare: trasaturiBare, intrare: intrare, trasaturiBot: trasaturiBot, prezice: prezice, decide: decide, verdict: verdict, pentruBot: pentruBot, pentruPornire: pentruPornire };
})();
if (typeof globalThis !== "undefined") globalThis.Retea = Retea;
