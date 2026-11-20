// v100.373 (20.11.2026, el: „putem să optimizăm pagina botului, la verdicte etc.?” ⇒ auditul din 20.11 ⇒ hotărârile lui):
//   1. capul Tabloului = „MARGINEA CONTRA BOTULUI”: marginea gridului dinspre care botul pierde - cât e până la ea, cât de des o atinge
//      în 1 h / 4 h / 24 h, banii la margine și la stop, cu dovada de pe boții lui închiși. Pe 2.465 de boți (21.12.2025 – 20.11.2026)
//      pierderea stă în cei 176 închiși cu prețul trecut de margine, contra botului (−9.855,0 USDT; ceilalți +3.089,5), iar la pornire
//      nimic nu desparte câștigul de pierdere (trendul, ADX, starea pieței: 12 comparații, niciuna nu trece). E contabilitate, nu prognoză.
//   2. orizonturile lui: mediana vieții unui bot e 21 de minute, la 24 h ajung 3,5% ⇒ sus 1 h / 4 h / 24 h; 3 și 7 zile rămân în pliuri.
//   3. rândul de cost: pornirea și închiderea față de ce au adus grilele. `gridProfit` de la Pionex e DUPĂ comisionul perechii (probat pe
//      botul viu: 55 de perechi, 0,0241 pe pereche, sub brutul minim 0,0259), deci comisionul perechilor nu se mai scade a doua oară.
// Modul pur (fără DOM), probat în scripts/proba-v100373.mjs. Nu inventează verdicte: marginea, șansele și banii vin din ce socotește deja
// pagina (Probabilitati, TabloExtra.totalCuGridLa); aici se așază și se spune dovada.
var CapMargine = (function () {
  "use strict";
  /* comisionul unei umpleri de grid, pe o parte (aceeași cifră din care iese „Comisionul ia din fiecare umplere”) */
  var COMISION = 0.0002, MIN_BOTI = 30;
  var CUTII = [{ cheie: "sub15", pana: 15, et: "sub 15 minute" }, { cheie: "sub1h", pana: 60, et: "15 minute – 1 h" }, { cheie: "sub4h", pana: 240, et: "1–4 h" },
    { cheie: "sub24h", pana: 1440, et: "4–24 h" }, { cheie: "peste", pana: Infinity, et: "peste 24 h" }];
  var ORIZONTURI = [1, 4, 24, 72, 168];
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function TR() { return typeof TextRo !== "undefined" ? TextRo : null; }
  function num(v, z) { var T = TR(); return T && T.num ? T.num(v, z) : (Math.round(v * Math.pow(10, z)) / Math.pow(10, z)).toFixed(z).replace(".", ",").replace("-", "−"); }
  function usdt(v) { var T = TR(); return T && T.usdt ? T.usdt(v, 1) : (v > 0 ? "+" : "") + num(v, 1) + " USDT"; }
  function cate(n, sg, pl) { var T = TR(); return T && T.cate ? T.cate(n, sg, pl) : n + " " + pl; }
  function pret(v) { var T = TR(); if (T && T.pret) return T.pret(v); if (v === null) return "—"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : 4); }
  function zi(ms) { var d = new Date(ms), z = function (n) { return (n < 10 ? "0" : "") + n; }; return z(d.getUTCDate()) + "." + z(d.getUTCMonth() + 1) + "." + d.getUTCFullYear(); }

  // ---- boții închiși (ruta botiInchisi: strategyId, buOrderType, createTime, closeTime, buOrderData) ----
  // netul = realizat + comisioane + funding (comisioanele și fundingul vin cu semn); suma pusă = quoteInvestment + marja adăugată − profitul scos
  function pasGrid(jos, sus, linii, tip) {
    var N = linii !== null ? linii - 1 : null; if (!(N >= 1) || !(jos > 0) || !(sus > jos)) return null;
    return /geometric/i.test(String(tip || "")) ? Math.pow(sus / jos, 1 / N) - 1 : (sus - jos) / N / ((sus + jos) / 2);
  }
  function rand(b) {
    if (!b || !/futures_grid/.test(String(b.buOrderType || ""))) return null;
    var d = b.buOrderData || {}, real = nr(d.totalRealizedProfit), q = nr(d.quoteInvestment), creat = nr(b.createTime), inchis = nr(b.closeTime);
    var inv = q !== null && q > 0 ? q + (nr(d.extraMargin) || 0) - (nr(d.profitExited) || 0) : nr(d.usdtInvestment);
    if (real === null || !(inv > 0) || !(creat > 0) || !(inchis > 0)) return null;
    var fee = nr(d.totalFee) || 0, fund = nr(d.totalFundingFee) || 0, grid = nr(d.gridProfit) || 0, jos = nr(d.bottom), sus = nr(d.top);
    return { net: real + fee + fund, grid: grid, fee: fee, fund: fund, inv: inv, min: (inchis - creat) / 60000, creat: creat, inchis: inchis, dir: String(d.trend || "").toLowerCase(),
      jos: jos, sus: sus, pi: nr(d.closedPrice), pas: pasGrid(jos, sus, nr(d.row), d.gridType) };
  }
  // închis cu prețul TRECUT de marginea gridului, contra botului (long sub marginea de jos, short peste cea de sus)
  function afaraContra(r) { return r.pi !== null && ((r.dir === "long" && r.jos !== null && r.pi < r.jos) || (r.dir === "short" && r.sus !== null && r.pi > r.sus)); }
  // comisionul perechilor, refăcut din ce au adus grilele (gridProfit e după el): pe o pereche, brutul = pasul, comisionul = 2 × COMISION
  function comisionPerechi(r) { if (!(r.grid > 0) || r.pas === null || !(r.pas > 2 * COMISION)) return 0; return Math.min(Math.abs(r.fee), r.grid * 2 * COMISION / (r.pas - 2 * COMISION)); }
  // costul de pornire și închidere = comisioanele fără cele ale perechilor; acoperit = grilele (după comisionul lor) l-au întrecut
  function costAcoperit(r) { return r.grid >= Math.max(0, Math.abs(r.fee) - comisionPerechi(r)); }
  function cutia(min) { for (var i = 0; i < CUTII.length; i++) if (min < CUTII[i].pana) return i; return CUTII.length - 1; }
  function dinBoti(boti) {
    var R = (Array.isArray(boti) ? boti : []).map(rand).filter(Boolean); if (!R.length) return null;
    var af = { n: 0, net: 0 }, rest = { n: 0, net: 0 }, de = Infinity, pana = 0, cost = CUTII.map(function (c) { return { cheie: c.cheie, et: c.et, n: 0, acoperit: 0 }; });
    R.forEach(function (r) {
      var t = afaraContra(r) ? af : rest; t.n++; t.net += r.net;
      if (r.creat < de) de = r.creat; if (r.inchis > pana) pana = r.inchis;
      /* botul fără niciun comision și nicio grilă n-a făcut nimic: nu intră la „și-a acoperit costul” (53 din 1.084 la boții de sub 15 minute) */
      if (r.fee !== 0 || r.grid !== 0) { var c = cost[cutia(r.min)]; c.n++; if (costAcoperit(r)) c.acoperit++; }
    });
    var m = R.map(function (r) { return r.min; }).sort(function (a, b) { return a - b; });
    return { n: R.length, de: de, pana: pana, margine: { afara: af, rest: rest },
      durate: { medianaMin: m[Math.floor(m.length / 2)], la: ORIZONTURI.map(function (h) { var k = R.filter(function (r) { return r.min >= h * 60; }).length; return { ore: h, n: k, parte: k / R.length }; }) },
      cost: cost.map(function (c) { c.parte = c.n ? c.acoperit / c.n : null; return c; }) };
  }
  // „15 din 2.465 de boți ai tăi au ajuns la 7 zile (0,6%)” - nota de lângă cifrele pe orizonturi lungi
  function textDurata(d, ore) {
    var x = d && d.durate && d.durate.la.filter(function (q) { return q.ore === ore; })[0]; if (!x || !(d.n >= MIN_BOTI)) return "";
    var cat = ore >= 24 ? cate(ore / 24, "zi", "zile") : ore + " h";
    return (x.n === 0 ? "niciunul din " : x.n + " din ") + cate(d.n, "bot închis", "boți închiși") + " de-ai tăi " + (x.n === 1 ? "a ajuns" : x.n === 0 ? "n-a ajuns" : "au ajuns") + " la " + cat + (x.n ? " (" + num(100 * x.parte, 1) + "%)" : "");
  }
  // dovada de sub marginea din cap: unde s-au dus banii pe boții lui (contabilitate, nu regulă de prezis)
  function textDovada(d) {
    if (!d || !(d.n >= MIN_BOTI) || !d.margine.afara.n) return "";
    var a = d.margine.afara, r = d.margine.rest;
    return "Pe boții tăi închiși (" + cate(d.n, "bot", "boți") + ", " + zi(d.de) + " – " + zi(d.pana) + "): cei închiși cu prețul trecut de margine, contra botului — " + a.n + " (" + num(100 * a.n / d.n, 1) + "%): "
      + usdt(a.net) + "; toți ceilalți: " + usdt(r.net) + ". Arată unde s-au dus banii, nu ce urmează.";
  }

  // ---- rândul de cost al botului de pe ecran ----
  // x = { grile (gridProfit, după comisionul perechilor), comisioane (toate, cu minus), inchidere (comisionul de închidere estimat, cu minus), pas, varstaMin }
  function cost(x, d) {
    x = x || {}; var g = nr(x.grile), c = nr(x.comisioane); if (g === null || c === null) return null;
    var per = g > 0 && nr(x.pas) !== null && x.pas > 2 * COMISION ? Math.min(Math.abs(c), g * 2 * COMISION / (x.pas - 2 * COMISION)) : 0;
    /* taxa de intrare estimată de pagină (TabloExtra.taxaIntrare) bate refacerea din pas: restul comisioanelor sunt ale perechilor */
    var tx = nr(x.pornire); if (tx !== null) per = Math.max(0, Math.abs(c) - Math.abs(tx));
    var pornire = tx !== null ? Math.min(Math.abs(tx), Math.abs(c)) : Math.max(0, Math.abs(c) - per), inch = Math.abs(nr(x.inchidere) || 0), tot = pornire + inch, v = nr(x.varstaMin);
    var cu = v !== null && d && Array.isArray(d.cost) ? d.cost[cutia(v)] : null;
    return { grile: g, cost: -tot, pornire: -pornire, inchidere: -inch, perechi: -per, acoperit: g >= tot, ori: tot > 0 ? g / tot : null,
      cutie: cu && cu.n >= MIN_BOTI ? { et: cu.et, n: cu.n, acoperit: cu.acoperit, parte: cu.parte } : null };
  }
  function textCost(k) {
    if (!k) return null;
    var t = "pornirea și închiderea ≈ " + usdt(k.cost) + " · grilele au adus " + usdt(k.grile) + " (după comisionul perechilor)";
    var stare = k.acoperit ? "acoperit" + (k.ori !== null && k.ori >= 2 ? " de " + num(k.ori, 1) + " ori" : "") : "încă neacoperit";
    var sub = k.cutie ? "la boții tăi care au ținut " + k.cutie.et + ": grilele au acoperit costul la " + num(k.cutie.acoperit, 0) + " din " + num(k.cutie.n, 0) + " (" + num(100 * k.cutie.parte, 1) + "%, estimat)" : "";
    return { text: t, stare: stare, ton: k.acoperit ? "bine" : "atentie", sub: sub };
  }

  // ---- capul paginii ----
  // x = { dir, pret, jos, sus, stop, laMargine(parte) → USDT, laStop → USDT, sanse: { jos: {1: f, 4: f, 24: f}, sus: {…} } (f = rezultatul Probabilitati.frecventa),
  //       sfat: { faCe } (sfatul „margine”, dacă există), cons: { nivel, titlu, faCe, cod, siguranta, dovedit }, dovada: dinBoti(...) }
  function parteaContra(dir, pret, jos, sus) {
    if (dir === "long") return "jos"; if (dir === "short") return "sus";
    if (!(pret > 0) || !(jos > 0) || !(sus > 0)) return null;
    return pret - jos <= sus - pret ? "jos" : "sus";
  }
  /* cât se pot depărta distanța de acum și cea de la socoteală până când șansele nu mai sunt arătate ca valabile (pe 1 h cifra se schimbă de la
     1 la 28 din 100 între 1,5% și 0,5% de margine) - aceeași treime îi cere colectorului să le refacă (tura-probabilitati.mjs, seReface) */
  var PRAG_VECHI = 0.2;
  // o șansă, scrisă ca pe cardul „Probabilități”: „sub N din 100” la capete, niciodată „0” sau „100” goale
  function textSansa(f) {
    var m = /^sub (\d+)%$/.exec(String(f.scurt || "")); if (m) return "sub " + m[1] + " din 100";
    var r = Math.round(f.p * 100); return r <= 0 ? "sub 1 din 100" : r >= 100 ? "peste 99 din 100" : r + " din 100";
  }
  function alcatuieste(x) {
    x = x || {}; var dir = String(x.dir || "").toLowerCase(), p = nr(x.pret), jos = nr(x.jos), sus = nr(x.sus);
    var parte = parteaContra(dir, p, jos, sus), niv = parte === "jos" ? jos : parte === "sus" ? sus : null;
    if (parte === null || niv === null || !(p > 0) || !(niv > 0)) return null;
    /* prețul trecut de marginea CEALALTĂ (long peste cea de sus, short sub cea de jos): botul a ieșit din grid pe partea lui - capul rămâne al Consilierului */
    if ((dir === "long" && sus !== null && p > sus) || (dir === "short" && jos !== null && p < jos)) return null;
    /* distanța, față de PREȚ („sub preț” / „peste preț”, ca în sfaturi) */
    var dist = parte === "jos" ? (p - niv) / p : (niv - p) / p, afara = dist < 0, cons = x.cons || null;
    // șansele sunt rândurile cardului „Probabilități” (aceeași cifră în ambele locuri: corectată din calibrare, nimic sub 3 cazuri independente)
    var S = x.sanse && x.sanse[parte] || {}, sanse = [1, 4, 24].map(function (h) { var f = S[h]; return f && nr(f.p) !== null ? { ore: h, p: f.p, text: textSansa(f) } : null; }).filter(Boolean);
    // cifrele vin din tura colectorului, la prețul de atunci: dacă distanța până la margine s-a schimbat de atunci cu peste PRAG_VECHI, nu mai sunt
    // arătate ca valabile (20.11, botul lui: „7 din 100 într-o oră” socotit la 1,4%, cu prețul ajuns la 0,2% de margine)
    var p0 = nr(x.sansePret), d0 = p0 !== null && p0 > 0 ? (parte === "jos" ? (p0 - niv) / p0 : (niv - p0) / p0) : null;
    var vechi = d0 !== null && d0 > 0 && !afara && Math.abs(dist - d0) / d0 > PRAG_VECHI ? (dist < d0 ? "aproape" : "departe") : null;
    var bM = typeof x.laMargine === "function" ? nr(x.laMargine(parte)) : nr(x.laMargine), bS = nr(x.laStop), stop = nr(x.stop);
    var titlu = afara ? "Prețul a trecut de marginea de " + parte + " (" + pret(niv) + ") cu " + num(Math.abs(dist) * 100, 1) + "%: botul nu mai tranzacționează"
      : "Marginea de " + parte + " (" + pret(niv) + ") e la " + num(dist * 100, 1) + "% " + (parte === "jos" ? "sub" : "peste") + " preț";
    // siguranța nu se negociază: când Consilierul are sus lichidarea, stopul, planul, podeaua sau botul oprit, capul rămâne al lui, marginea vine dedesubt
    var sigur = !!(cons && cons.siguranta && cons.titlu);
    var faCe = sigur ? String(cons.faCe || "") : x.sfat && x.sfat.faCe ? String(x.sfat.faCe) : cons && cons.cod === "margine" && cons.faCe ? String(cons.faCe) : "";
    /* stopul pe termen scurt, din Monte Carlo pe botul lui (rândul „Pe termen scurt”: 1 h / 4 h / 24 h) */
    var stopS = stop !== null && Array.isArray(x.stopScurt) ? x.stopScurt.filter(function (q) { return q && (q.ore === 1 || q.ore === 4 || q.ore === 24) && nr(q.pStop) !== null; }).map(function (q) { return { ore: q.ore, p: q.pStop }; }) : [];
    return { parte: parte, nivel: niv, dist: dist, afara: afara, titlu: sigur ? String(cons.titlu) : titlu, fapt: sigur ? titlu : "", sanse: afara ? [] : sanse,
      sanseVechi: vechi && sanse.length ? { fel: vechi, dist: d0 } : null, sanseOra: x.sanseOra ? String(x.sanseOra) : "", stopScurt: stopS,
      bani: { margine: afara ? null : bM, stop: bS, stopPret: stop, stopActiv: !!x.stopActiv, stopEticheta: x.stopEticheta ? String(x.stopEticheta) : "" }, faCe: faCe, sigur: sigur,
      cons: cons && !sigur && cons.titlu && cons.cod !== "margine" ? { titlu: String(cons.titlu), dovedit: !!cons.dovedit } : null, dovada: textDovada(x.dovada) };
  }
  function textSanse(c) {
    if (!c || !c.sanse.length) return "";
    var lista = c.sanse.map(function (s) { return "în " + s.ore + " h — " + s.text; }).join(" · ");
    if (c.sanseVechi) return "o atinge mai " + (c.sanseVechi.fel === "aproape" ? "des" : "rar") + " decât arătau cifrele socotite cu marginea la " + num(c.sanseVechi.dist * 100, 1) + "% (" + lista + "): acum e la "
      + num(c.dist * 100, 1) + "%; se refac în cel mult 10 minute";
    return "o atinge: " + lista + " (istoria monedei" + (c.sanseOra ? ", socotit la " + c.sanseOra : "") + "; amănuntele în Probabilități)";
  }
  function textBani(c) {
    if (!c) return "";
    var l = [];
    if (c.bani.margine !== null) l.push("la margine: " + usdt(c.bani.margine));
    if (c.bani.stop !== null && c.bani.stopPret !== null) l.push("la stopul tău (" + pret(c.bani.stopPret) + "): " + usdt(c.bani.stop));
    /* stopul în procente e activ și când prețul lui nu se poate socoti (botul neutru) - „fără stop pus” doar când chiar nu e */
    else if (c.bani.stopPret === null) l.push(c.bani.stopActiv ? "stopul tău: " + (c.bani.stopEticheta || "pus în procente") + " (fără preț socotit)" : "fără stop pus");
    return l.join(" · ");
  }
  function textStop(c) {
    if (!c || !c.stopScurt || !c.stopScurt.length) return "";
    return "stopul atins: " + c.stopScurt.map(function (s) { return "în " + s.ore + " h — " + num(s.p * 100, 1) + "%"; }).join(" · ") + " (Monte Carlo pe botul tău)";
  }
  return { COMISION: COMISION, CUTII: CUTII, PRAG_VECHI: PRAG_VECHI, textSansa: textSansa, textStop: textStop, rand: rand, afaraContra: afaraContra, comisionPerechi: comisionPerechi, costAcoperit: costAcoperit, dinBoti: dinBoti, textDurata: textDurata, textDovada: textDovada,
    cost: cost, textCost: textCost, parteaContra: parteaContra, alcatuieste: alcatuieste, textSanse: textSanse, textBani: textBani };
})();
if (typeof module !== "undefined" && module.exports) module.exports = CapMargine;
