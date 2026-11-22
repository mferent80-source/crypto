// v100.373 (20.11.2026, el: „putem să optimizăm pagina botului, la verdicte etc.?” ⇒ auditul din 20.11 ⇒ hotărârile lui):
//   1. capul Tabloului = „MARGINEA CONTRA BOTULUI”: marginea gridului dinspre care botul pierde - cât e până la ea, cât de des o atinge
//      în 1 h / 4 h / 24 h, banii la margine și la stop, cu dovada de pe boții lui închiși. Pe 2.465 de boți (21.12.2025 – 20.11.2026)
//      pierderea stă în cei 176 închiși cu prețul trecut de margine, contra botului (−9.855,0 USDT; ceilalți +3.089,5), iar la pornire
//      nimic nu desparte câștigul de pierdere (trendul, ADX, starea pieței: 12 comparații, niciuna nu trece). E contabilitate, nu prognoză.
//   2. orizonturile lui: mediana vieții unui bot e 21 de minute, la 24 h ajung 3,5% ⇒ sus 1 h / 4 h / 24 h; 3 și 7 zile rămân în pliuri.
//   3. rândul de cost: pornirea și închiderea față de ce au adus grilele. `gridProfit` de la Pionex e DUPĂ comisionul perechii (probat pe
//      botul viu: 55 de perechi, 0,0241 pe pereche, sub brutul minim 0,0259), deci comisionul perechilor nu se mai scade a doua oară.
// v100.374 (21.11.2026, el: „da fa tot” pe livrarea propusă după analiza de trader din 20.11):
//   - îndreptarea 1: „stopul atins în 24 h” avea două cifre pe același ecran (capul 31,4% din Monte Carlo, Drumul ~42% din curba stopului) ⇒
//     capul ține 1 h și 4 h din Monte Carlo (singura parte verificată a lui: 1 h prezis 1,3%, atins 1,7% din 300), iar 24 h e cifra Drumului.
//   - îndreptarea 2: paza de vechime a șanselor se judecă pe ORIZONT, după cât s-ar muta cifra (nu după distanță, la fel pentru toate).
//   - I-903 rândul EXPUNERII (pe 2.465 de boți rezultatul merge cu poziția: r = 0,94; semnul egal la 94,6%), I-897 stopul față de margine
//     în bani, I-904 „fără stop” cu dovada lui (33 de boți fără stop închiși dincolo de margine: −3.342,0 USDT; ceilalți 338: +689,8).
// Modul pur (fără DOM), probat în scripts/proba-v100373.mjs. Nu inventează verdicte: marginea, șansele și banii vin din ce socotește deja
// pagina (Probabilitati, TabloExtra.totalCuGridLa); aici se așază și se spune dovada.
var CapMargine = (function () {
  "use strict";
  /* comisionul unei umpleri de grid, pe o parte (aceeași cifră din care iese „Comisionul ia din fiecare umplere”) */
  var COMISION = 0.0002, MIN_BOTI = 30;
  /* „ore de grile” se socotesc doar cu ritm măsurat: câteva perechi încheiate și botul de cel puțin o jumătate de oră */
  var MIN_PERECHI = 5, MIN_ORE_RITM = 0.5;
  /* I-911: o treaptă a jurnalului benzii se citește doar de la atâtea episoade */
  var MIN_EPISOADE_BANDA = 20;
  /* I-913: stopul e „pe margine” când e la mai puțin de o grilă de ea (fără pasul gridului: la cel mult 0,2%); la boții închiși, la cel mult 0,5% */
  var PRAG_STOP_MARGINE = 0.005, PRAG_STOP_FARA_PAS = 0.002, ZI_MS = 86400000;
  /* blocul „Dacă muți gridul acum”: intrarea botului nou se estimează ca jumătate din bani × levier, cumpărată la piață (0,05%) */
  var COMISION_PIATA = 0.0005, ORA_MS = 3600000;
  var CUTII = [{ cheie: "sub15", pana: 15, et: "sub 15 minute" }, { cheie: "sub1h", pana: 60, et: "15 minute – 1 h" }, { cheie: "sub4h", pana: 240, et: "1–4 h" },
    { cheie: "sub24h", pana: 1440, et: "4–24 h" }, { cheie: "peste", pana: Infinity, et: "peste 24 h" }];
  var ORIZONTURI = [1, 4, 24, 72, 168];
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function TR() { return typeof TextRo !== "undefined" ? TextRo : null; }
  function num(v, z) { var T = TR(); return T && T.num ? T.num(v, z) : (Math.round(v * Math.pow(10, z)) / Math.pow(10, z)).toFixed(z).replace(".", ",").replace("-", "−"); }
  function usdt(v) { var T = TR(); return T && T.usdt ? T.usdt(v, 1) : (v > 0 ? "+" : "") + num(v, 1) + " USDT"; }
  function cate(n, sg, pl) { var T = TR(); return T && T.cate ? T.cate(n, sg, pl) : n + " " + pl; }
  function z1(v) { return num(v, 1); }   /* o zecimală, pentru numere cu virgulă lângă un substantiv („2,5 zile” nu ia „de”) */
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
      jos: jos, sus: sus, pi: nr(d.closedPrice), pas: pasGrid(jos, sus, nr(d.row), d.gridType), stop: !!nr(d.lossStop), stopPret: nr(d.lossStop) };
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
    /* v100.374 (I-904): cu și fără stop, despărțiți după „închis dincolo de margine” - acolo stă pierderea celor fără stop (21.11: 33 din 371) */
    /* I-913: dintre cei închiși dincolo de margine cu stop pus, câți aveau stopul chiar pe margine (la cel mult PRAG_STOP_MARGINE de ea) */
    var gol = function () { return { n: 0, afara: { n: 0, net: 0, max: 0 }, rest: { n: 0, net: 0 }, laMargine: { n: 0, net: 0 } }; }, st = { fara: gol(), cu: gol() };
    R.forEach(function (r) {
      var t = afaraContra(r) ? af : rest; t.n++; t.net += r.net;
      var s = r.stop ? st.cu : st.fara, sa = afaraContra(r) ? s.afara : s.rest; s.n++; sa.n++; sa.net += r.net; if (sa === s.afara && r.net < sa.max) sa.max = r.net;
      var mg = r.dir === "long" ? r.jos : r.sus; if (sa === s.afara && r.stopPret !== null && r.stopPret > 0 && mg !== null && mg > 0 && Math.abs(r.stopPret - mg) / mg <= PRAG_STOP_MARGINE) { s.laMargine.n++; s.laMargine.net += r.net; }
      if (r.creat < de) de = r.creat; if (r.inchis > pana) pana = r.inchis;
      /* botul fără niciun comision și nicio grilă n-a făcut nimic: nu intră la „și-a acoperit costul” (53 din 1.084 la boții de sub 15 minute) */
      if (r.fee !== 0 || r.grid !== 0) { var c = cost[cutia(r.min)]; c.n++; if (costAcoperit(r)) c.acoperit++; }
    });
    var m = R.map(function (r) { return r.min; }).sort(function (a, b) { return a - b; });
    return { n: R.length, de: de, pana: pana, margine: { afara: af, rest: rest }, stop: st,
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

  // I-904: ce au făcut boții lui fără stop (contabilitate cu selecție: cei închiși dincolo de margine sunt cei care n-au mai revenit)
  function textFaraStop(d) {
    var s = d && d.stop && d.stop.fara, c = d && d.stop && d.stop.cu; if (!s || !(s.n >= MIN_BOTI) || !(s.afara.n >= 5)) return "";
    return "Pe boții tăi fără stop (" + cate(s.n, "bot", "boți") + "): cei " + s.afara.n + " închiși cu prețul trecut de margine au făcut " + usdt(s.afara.net) + (s.afara.max < 0 ? " (cea mai mare pierdere: " + usdt(s.afara.max) + ")" : "") + "; ceilalți "
      + s.rest.n + ": " + usdt(s.rest.net) + "." + (c && c.afara.n >= 5 && c.afara.max < 0 ? " La cei cu stop, cea mai mare pierdere dincolo de margine: " + usdt(c.afara.max) + "." : "") + " Așa au ieșit, nu ce urmează.";
  }

  // v100.377 („fa idei”): regula „stopul e chiar pe margine” ca funcție (aceeași pentru capul paginii și pentru alerta colectorului) și dovada pe scurt,
  // cât să încapă într-o alertă. Auditul 22.11 (🟡6): spune exact ce numără - boții CU STOP închiși dincolo de margine și pragul de 0,5% al
  // numărătorii (alerta se aprinde la 0,2%); fără sumă (un bot cu stopul pe margine, închis dincolo de ea, a pierdut prin construcție, iar cei
  // închiși în grid, pe plus, nu sunt în numărătoare - suma s-ar citi ca „prețul stopului pe margine”)
  function stopPeMargine(stop, niv) { stop = nr(stop); niv = nr(niv); return stop !== null && stop > 0 && niv !== null && niv > 0 && Math.abs(stop - niv) / niv <= PRAG_STOP_FARA_PAS; }
  function textDovadaStopMargineScurt(d) {
    var c = d && d.stop && d.stop.cu; if (!c || !(c.laMargine.n >= 5) || !(c.afara.n >= MIN_BOTI)) return "";
    return "din " + cate(c.afara.n, "bot al tău cu stop închis", "boți ai tăi cu stop închiși") + " dincolo de margine, " + c.laMargine.n + " îl aveau la cel mult " + num(PRAG_STOP_MARGINE * 100, 1) + "% de ea";
  }
  function textDovadaStopMargine(d) {
    var c = d && d.stop && d.stop.cu; if (!c || !(c.afara.n >= MIN_BOTI) || !(c.laMargine.n >= 5)) return "";
    return "Pe boții tăi închiși dincolo de margine cu stop pus (" + cate(c.afara.n, "bot", "boți") + "): " + c.laMargine.n + " aveau stopul chiar pe margine (la cel mult " + num(PRAG_STOP_MARGINE * 100, 1) + "% de ea) și au făcut " + usdt(c.laMargine.net) + ". Așa au ieșit, nu ce urmează.";
  }
  // I-912: ultima schimbare a marginilor din drumul botului (punctele poartă gridJos / gridSus din v100.374); null când nu e sau e mai veche de o zi
  function mutareDin(intrari, acum) {
    var L = (Array.isArray(intrari) ? intrari : []).filter(function (q) { return q && nr(q.t) > 0 && nr(q.gridJos) > 0 && nr(q.gridSus) > 0; }).sort(function (a, b) { return a.t - b.t; }), m = null;
    for (var i = 1; i < L.length; i++) if (L[i].gridJos !== L[i - 1].gridJos || L[i].gridSus !== L[i - 1].gridSus) m = { la: L[i].t, jos0: L[i - 1].gridJos, sus0: L[i - 1].gridSus, total0: nr(L[i - 1].profitTotal) };
    return m && nr(acum) !== null && acum - m.la <= ZI_MS ? m : null;
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
  /* v100.374 (îndreptarea 2): pe pagină, o cifră e „de refăcut” când s-ar muta cu cel puțin 10 puncte din 100 sau cu un sfert din ea (și minimum
     3 puncte). Cât s-ar muta se estimează cu mersul aleator cu barieră, P = 2·Φ(−z), z ~ distanța: aceeași abatere a distanței mută mult cifra
     mică de pe 1 h și puțin pe cea de pe 24 h (20.11: de la 1,3% la 1,6% toate cifrele erau ascunse, deși pe 24 h diferența era de câteva puncte).
     Estimarea e DOAR pază: cifra arătată rămâne cea măsurată de colector. */
  var PRAG_PUNCTE = 0.10, PRAG_PARTE = 0.25, MIN_PUNCTE = 0.03;
  function fi(z) {   /* Φ, aproximarea Abramowitz–Stegun 26.2.17 (eroare sub 7,5e-8) */
    var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989422804014327 * Math.exp(-z * z / 2);
    var q = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - q : q;
  }
  function fiInv(p) {   /* inversa lui Φ prin înjumătățire: destul de exactă pentru o pază și fără coeficienți de copiat greșit */
    if (!(p > 0) || !(p < 1)) return null; var a = -8, b = 8;
    for (var i = 0; i < 60; i++) { var m = (a + b) / 2; if (fi(m) < p) a = m; else b = m; }
    return (a + b) / 2;
  }
  // șansa p, măsurată cu marginea la distanța d0, estimată la distanța d (aceeași volatilitate, același orizont)
  function sansaMutata(p, d0, d) {
    p = nr(p); d0 = nr(d0); d = nr(d); if (p === null || d0 === null || d === null || !(d0 > 0) || !(d >= 0)) return null;
    if (p <= 0) return 0; if (p >= 1) return 1;
    var z0 = fiInv(1 - p / 2); return z0 === null ? null : 2 * fi(-z0 * d / d0);
  }
  /* cifrele de la capete („0 din n”, „n din n”) se strâng la 0,5% / 99,5% înainte de estimare: altfel 0 rămâne 0 la orice distanță și paza
     nu le-ar mai prinde - socotit la 5% de margine, cu prețul ajuns la 0,2%, „sub 3 din 100 într-o oră” rămânea arătat ca valabil (revizia, 21.11) */
  function deRefacut(p, d0, d) { p = nr(p); if (p === null) return false; var pc = Math.min(0.995, Math.max(0.005, p)), q = sansaMutata(pc, d0, d); if (q === null) return false; var m = Math.abs(q - pc); return m >= PRAG_PUNCTE || (m >= MIN_PUNCTE && m >= PRAG_PARTE * pc); }
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
    // cifrele vin din tura colectorului, la prețul de atunci (20.11, botul lui: „7 din 100 într-o oră” socotit la 1,4%, cu prețul ajuns la 0,2% de
    // margine). v100.374: fiecare orizont e judecat pe cât s-ar muta cifra lui (deRefacut); toate depășite ⇒ rândul întreg spune că se refac
    var p0 = nr(x.sansePret), d0 = p0 !== null && p0 > 0 ? (parte === "jos" ? (p0 - niv) / p0 : (niv - p0) / p0) : null;
    if (d0 !== null && d0 > 0 && !afara) sanse.forEach(function (s) { if (deRefacut(s.p, d0, dist)) s.vechi = true; });
    var vechi = sanse.length && sanse.every(function (s) { return s.vechi; }) ? (dist < d0 ? "aproape" : "departe") : null;
    var bM = typeof x.laMargine === "function" ? nr(x.laMargine(parte)) : nr(x.laMargine), bS = nr(x.laStop), stop = nr(x.stop), tot = nr(x.total);
    /* I-903: expunerea - poziția de acum în USDT, față de banii puși; 1% contra pe ea, în USDT și (cu ritm măsurat, în grid) în ore de grile */
    var e = x.expunere || null, q = e ? nr(e.pozitie) : null, exp = null;
    if (q !== null && Math.abs(q) > 0) {
      var not = Math.abs(q) * p, inv = nr(e.investit), g = nr(e.grile), per = nr(e.perechi), ore = nr(e.varstaOre), neutru = dir !== "long" && dir !== "short";
      var ritm = !afara && g !== null && g > 0 && per !== null && per >= MIN_PERECHI && ore !== null && ore >= MIN_ORE_RITM ? g / ore : null;
      exp = { notional: not, levier: inv !== null && inv > 0 ? not / inv : null, unu: -not * 0.01, oreGrile: ritm !== null ? not * 0.01 / ritm : null, neutru: neutru, lung: neutru ? q > 0 : dir === "long", afara: afara };
    }
    /* I-911 (el, 21.11: „fă ideile”): afară din grid contra botului - de cât timp și, din jurnalul benzii (boții LUI închiși: câte episoade
       au stat afară h ore la rând și în câte prețul s-a întors în grid în următoarele 24 de ore), treapta cea mai lungă deja împlinită */
    var ao = afara ? nr(x.afaraOre) : null, afaraDe = null;
    if (ao !== null && ao > 0) {
      var rd = null; (Array.isArray(x.banda) ? x.banda : []).forEach(function (r) { if (r && nr(r.h) !== null && r.h <= ao && nr(r.n) >= MIN_EPISOADE_BANDA && nr(r.intoarse) !== null && (!rd || r.h > rd.h)) rd = r; });
      afaraDe = { ore: ao, rand: rd ? { h: rd.h, n: rd.n, intoarse: rd.intoarse } : null };
    }
    /* „Dacă muți gridul acum” (el, 21.11.2026: „cât mă costă să mut gridul acum?” ⇒ „vreau să pui și statisticile astea și probabilitățile”):
       afară din grid contra botului și pe minus - pierderea care s-ar încasa, comisioanele, ce rămâne pe masă (la stop, la margine, la zero),
       treptele întoarcerii de pe boții lui cu ora la care se împlinesc și cât i-ar lua unui grid nou, la ritmul botului, să scoată pierderea.
       Doar cifre deja socotite de pagină (TabloExtra.dacaInchizi / totalCuGridLa, jurnalul benzii); niciun verdict nou. */
    /* zero-ul botului (el, 21.11: „nu mai apare zero-ul botului” - după mutarea gridului în jos botul nu mai ajungea pe zero în grid, iar pagina
       doar tăcea): prețul lui, sau faptul că nu se mai atinge și cu cât rămâne la marginea dinspre câștig */
    var zi0 = x.zero || null, zeroI = null;
    if (zi0 && nr(zi0.pret) !== null && zi0.pret > 0) zeroI = { pret: zi0.pret, dist: (zi0.pret - p) / p };
    else if (zi0 && zi0.neatins === true) { var parteL = parte === "jos" ? "sus" : "jos", nivL = parteL === "jos" ? jos : sus, bL = typeof x.laMargine === "function" ? nr(x.laMargine(parteL)) : null;
      zeroI = { neatins: true, parte: parteL, nivel: nivL, dist: nivL !== null ? (nivL - p) / p : null, total: bL };
      /* v100.376 (el: „arată și zero-ul botului chiar dacă nu e în grid”): prețul de zero pe poziția de acum - doar când pagina îl are */
      if (nr(zi0.pretPoz) !== null && zi0.pretPoz > 0) { zeroI.pretPoz = zi0.pretPoz; zeroI.distPoz = (zi0.pretPoz - p) / p; }
      if (zi0.grile && typeof zi0.grile === "object") zeroI.grile = zi0.grile; }
    /* I-913: stopul chiar pe marginea contra (la mai puțin de o grilă): prima atingere a marginii închide botul */
    var pasG = nr(x.pas), stopM = null;
    if (stop !== null && !afara && stopPeMargine(stop, niv)) {   /* revizia a doua: nu „sub o grilă” - la pasul de 1%, un stop cu 0,8% sub margine primea „prima atingere închide botul” lângă „între margine și stop mai pierzi…” */ var s24 = sanse.filter(function (q) { return q.ore === 24 && !q.vechi; })[0];
      stopM = { total: bS, sansa: !afara && s24 ? s24.text : null, dovada: textDovadaStopMargine(x.dovada) }; }
    /* I-912: gridul mutat de curând (din drumul botului) */
    var mv = x.mutare && nr(x.mutare.la) > 0 && nr(x.mutare.jos0) > 0 && nr(x.mutare.sus0) > 0 ? { la: x.mutare.la, jos0: x.mutare.jos0, sus0: x.mutare.sus0, total0: nr(x.mutare.total0), jos: jos, sus: sus } : null;
    var mut = null, mm = afara && x.mut ? x.mut : null;
    if (mm && nr(mm.iei) !== null && nr(mm.investit) > 0 && mm.iei - mm.investit < 0) {
      var pierd = mm.iei - mm.investit, levM = nr(mm.levier) || 1, acumM = nr(x.acum), semn = function (v) { return (v - p) / p; };
      /* I-914: recuperarea pe gridul din FIȘA de azi - perechile pe zi așteptate (din istoria monedei) × câștigul net pe grilă × banii pe o grilă
         (ce ai lua acum × levierul fișei / grile). Când fișa zice „nu porni”, se spune și nu se socotește nimic. */
      var fz = mm.fisa || null, fisaM = null;
      if (fz && fz.nu === true) fisaM = { nu: true };
      else if (fz && nr(fz.treceriZi) > 0 && nr(fz.profitGrila) > 0 && nr(fz.grile) >= 1 && nr(fz.levier) > 0 && nr(fz.jos) > 0 && nr(fz.sus) > nr(fz.jos)) {
        var peZi = fz.treceriZi * fz.profitGrila * mm.iei * fz.levier / fz.grile;
        fisaM = { jos: fz.jos, sus: fz.sus, linii: fz.grile + 1, levier: fz.levier, treceriZi: fz.treceriZi, peZi: peZi, ore: peZi > 0 ? -pierd / peZi * 24 : null };
      }
      var ritM = nr(mm.grile) > 0 && nr(mm.perechi) >= MIN_PERECHI && nr(mm.oreInGrid) >= MIN_ORE_RITM ? mm.grile / mm.oreInGrid : null;
      var bune = (Array.isArray(x.banda) ? x.banda : []).filter(function (r) { return r && nr(r.h) !== null && nr(r.n) >= MIN_EPISOADE_BANDA && nr(r.intoarse) !== null; }).sort(function (a, c) { return a.h - c.h; });
      var urm = ao !== null && ao > 0 ? bune.filter(function (r) { return r.h > ao; }).slice(0, 2).map(function (r) { return { h: r.h, n: r.n, intoarse: r.intoarse, la: acumM !== null ? acumM + (r.h - ao) * ORA_MS : null }; }) : [];
      mut = { iei: mm.iei, investit: mm.investit, pierdere: pierd, comisioane: mm.iei * levM * 0.5 * COMISION_PIATA, acum: acumM,
        stop: stop !== null && bS !== null ? { pret: stop, dist: semn(stop), total: bS } : null, margine: bM !== null ? { pret: niv, dist: semn(niv), total: bM } : null,
        zero: nr(mm.pretZero) > 0 ? { pret: mm.pretZero, dist: semn(mm.pretZero) } : null, zeroNeatins: !!(zeroI && zeroI.neatins), zeroPoz: zeroI && zeroI.neatins && zeroI.pretPoz ? zeroI.pretPoz : null, risc: stop !== null && bS !== null && tot !== null && bS < tot ? tot - bS : null, recuperat: bM !== null && tot !== null && bM > tot ? bM - tot : null,
        fisa: fisaM, stop24: stop !== null ? nr(x.stopDrum) : null, curent: afaraDe && afaraDe.rand ? afaraDe.rand : null, urmatoare: urm, ritm: ritM, oreGrile: ritM !== null ? -pierd / ritM : null };
    }
    /* I-897: cât mai pierde între margine și stop (în grid: stopul dincolo de margine; afară: de aici până la stop) */
    var dincolo = stop !== null && (parte === "jos" ? stop < niv : stop > niv), intre = null;
    if (dincolo && bS !== null && !afara && bM !== null && bS < bM) intre = { bani: bS - bM, dist: Math.abs(stop - niv) / niv, fel: "margine" };
    else if (dincolo && bS !== null && afara && tot !== null && bS < tot && (parte === "jos" ? stop < p : stop > p)) intre = { bani: bS - tot, dist: Math.abs(stop - p) / p, fel: "pret" };
    /* îndreptarea 1: pe 24 h, cifra Drumului (curba stopului); Monte Carlo rămâne pe 1 h și 4 h și doar cât nu o întrece */
    var sd = stop !== null ? nr(x.stopDrum) : null;
    var titlu = afara ? "Prețul a trecut de marginea de " + parte + " (" + pret(niv) + ") cu " + num(Math.abs(dist) * 100, 1) + "%: botul nu mai tranzacționează"
      : "Marginea de " + parte + " (" + pret(niv) + ") e la " + num(dist * 100, 1) + "% " + (parte === "jos" ? "sub" : "peste") + " preț";
    // siguranța nu se negociază: când Consilierul are sus lichidarea, stopul, planul, podeaua sau botul oprit, capul rămâne al lui, marginea vine dedesubt
    var sigur = !!(cons && cons.siguranta && cons.titlu);
    var faCe = sigur ? String(cons.faCe || "") : x.sfat && x.sfat.faCe ? String(x.sfat.faCe) : cons && cons.cod === "margine" && cons.faCe ? String(cons.faCe) : "";
    /* stopul pe termen scurt, din Monte Carlo pe botul lui (rândul „Pe termen scurt”: 1 h / 4 h / 24 h) */
    var stopS = stop !== null && Array.isArray(x.stopScurt) ? x.stopScurt.filter(function (q) { return q && (q.ore === 1 || q.ore === 4 || (q.ore === 24 && sd === null)) && nr(q.pStop) !== null && (sd === null || q.pStop <= sd); }).map(function (q) { return { ore: q.ore, p: q.pStop }; }) : [];
    var faraStop = stop === null && !x.stopActiv;
    /* v100.376 (el, 21.11.2026: „pune și «atinge TP» la fel cum faci cu margine și cu stop”): take-profit-ul - prețul lui, totalul botului acolo (cu grilele
       de pe drum; dincolo de grid botul ajunge fără poziție) și șansa de a-l atinge pe 1 h / 4 h / 24 h, din același Monte Carlo ca stopul */
    var tpP = nr(x.tp), tpI = tpP !== null && tpP > 0 ? { pret: tpP, total: nr(x.laTp), dist: (tpP - p) / p, dincolo: sus !== null && tpP > sus ? "peste" : jos !== null && tpP < jos ? "sub" : "", raport: nr(x.tpRaport), dinPret: x.tpDinPret === true ? true : x.tpDinPret === false ? false : null, grile: x.tpGrile && typeof x.tpGrile === "object" ? x.tpGrile : null } : null;
    var tpS = tpI && Array.isArray(x.stopScurt) ? x.stopScurt.filter(function (q) { return q && (q.ore === 1 || q.ore === 4 || q.ore === 24) && nr(q.pTp) !== null; }).map(function (q) { return { ore: q.ore, p: q.pTp }; }) : [];
    var rez = { parte: parte, nivel: niv, dist: dist, afara: afara, titlu: sigur ? String(cons.titlu) : titlu, fapt: sigur ? titlu : "", sanse: afara ? [] : sanse,
      sanseVechi: vechi && sanse.length ? { fel: vechi, dist: d0 } : null, sanseDist: d0, sanseOra: x.sanseOra ? String(x.sanseOra) : "", stopScurt: stopS, stopDrum: sd,
      expunere: exp, intre: intre, afaraDe: afaraDe, zero: zeroI, stopMargine: stopM, mutare: mv, mut: mut, parteMargine: parte, copiaza: afara ? null : [{ ce: "marginea de " + parte, pret: pret(niv), exact: String(niv) }], faraStop: faraStop ? textFaraStop(x.dovada) : "",
      bani: { margine: afara ? null : bM, stop: bS, stopPret: stop, stopActiv: !!x.stopActiv, stopEticheta: x.stopEticheta ? String(x.stopEticheta) : "" }, faCe: faCe, sigur: sigur,
      cons: cons && !sigur && cons.titlu && cons.cod !== "margine" ? { titlu: String(cons.titlu), dovedit: !!cons.dovedit } : null, dovada: textDovada(x.dovada) };
    if (tpI) { rez.tp = tpI; rez.tpScurt = tpS; rez.tpVerif = Array.isArray(x.tpVerif) ? x.tpVerif : null; }
    return rez;
  }
  function textSanse(c) {
    if (!c || !c.sanse.length) return "";
    var lista = c.sanse.map(function (s) { return "în " + s.ore + " h — " + s.text; }).join(" · ");
    if (c.sanseVechi) return "o atinge mai " + (c.sanseVechi.fel === "aproape" ? "des" : "rar") + " decât arătau cifrele socotite cu marginea la " + num(c.sanseVechi.dist * 100, 1) + "% (" + lista + "): acum e la "
      + num(c.dist * 100, 1) + "%; se refac în cel mult 10 minute";
    /* v100.374: doar unele orizonturi depășite - cele bune rămân cu cifra lor, celelalte spun că se refac și ce arătau */
    var bune = c.sanse.filter(function (s) { return !s.vechi; }), vechi = c.sanse.filter(function (s) { return s.vechi; });
    var t = "o atinge: " + bune.map(function (s) { return "în " + s.ore + " h — " + s.text; }).join(" · ") + " (istoria monedei" + (c.sanseOra ? ", socotit la " + c.sanseOra : "") + "; amănuntele în Probabilități)";
    if (vechi.length) t += " · " + vechi.map(function (s) { return "în " + s.ore + " h"; }).join(" și ") + (vechi.length > 1 ? " se refac: erau " : " se reface: era ") + vechi.map(function (s) { return s.text; }).join(" și ")
      + " cu marginea la " + num(c.sanseDist * 100, 1) + "%, acum e la " + num(c.dist * 100, 1) + "%";
    return t;
  }
  /* I-903: „Poziția: 251,8 USDT long (levier efectiv 2,7×) · 1% contra = −2,5 USDT = 12 ore de grile la ritmul de până acum” */
  function durata(ore) {
    var mn = Math.round(ore * 60); if (mn < 60) return cate(Math.max(1, mn), "minut", "minute");
    if (ore < 48) return cate(Math.max(1, Math.round(ore)), "oră", "ore");
    return cate(Math.round(ore / 24), "zi", "zile");
  }
  function textExpunere(c) {
    var e = c && c.expunere; if (!e) return "";
    var lev = e.levier !== null ? "levier efectiv " + num(e.levier, 1) + "×" : "", parte = e.lung ? "long" : "short";
    return "Poziția: " + num(e.notional, 1) + " USDT " + parte + (e.neutru ? " acum (bot neutru: partea se schimbă cu prețul" + (lev ? "; " + lev : "") + ")" : lev ? " (" + lev + ")" : "")
      + " · 1% contra = " + usdt(e.unu) + (e.oreGrile !== null ? " = " + (e.oreGrile > 30 * 24 ? "peste 30 de zile" : durata(e.oreGrile)) + " de grile la ritmul de până acum" : e.afara ? " · afară din grid nu se mai fac grile" : "");
  }
  /* I-911: „Afară din grid de 6 h 20 min · la tine, când prețul a stat afară 6 ore la rând, s-a întors în grid în următoarele 24 de ore în
     40 din 100 de cazuri (55 de episoade)”. Descrie întoarcerea prețului, nu banii (pe aceia îi dă proba marginii, la verdict). */
  function durataAfara(ore) {
    var mn = Math.round(ore * 60); if (mn < 60) return cate(Math.max(1, mn), "minut", "minute");
    if (ore >= 48) return cate(Math.round(ore / 24), "zi", "zile");
    var h = Math.floor(ore), m = Math.round((ore - h) * 60); if (m === 60) { h++; m = 0; }
    return h + " h" + (m ? " " + m + " min" : "");
  }
  function textAfara(c) {
    var a = c && c.afaraDe; if (!a) return "";
    /* când blocul „Dacă muți gridul acum” e desenat, întoarcerea se spune acolo (cu treptele următoare): aici rămâne durata */
    return "Afară din grid de " + durataAfara(a.ore) + (a.rand && !c.mut ? " · la tine, când prețul a stat afară " + cate(a.rand.h, "oră", "ore") + " la rând, s-a întors în grid în următoarele 24 de ore în "
      + Math.round(a.rand.intoarse * 100) + " din 100 de cazuri (" + cate(a.rand.n, "episod", "episoade") + ", ieșiri pe oricare parte a gridului)" : "");
  }
  /* ora unei trepte viitoare, cu ziua ei când nu e azi: „la 18:57”, „mâine la 18:57”, „pe 23.11 la 18:57” */
  function oraZi(t, acum) {
    var d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; }, o = z(d.getHours()) + ":" + z(d.getMinutes()); if (acum === null || acum === undefined) return "la " + o;
    var a = new Date(acum), k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) / 86400000);
    return k <= 0 ? "la " + o : k === 1 ? "mâine la " + o : "pe " + z(d.getDate()) + "." + z(d.getMonth() + 1) + " la " + o;
  }
  /* zero-ul botului, I-913 și I-912: rândurile lor din cap */
  function pcS(f) { return (f < 0 ? "−" : "+") + num(Math.abs(f) * 100, 1) + "%"; }
  function textZero(c) {
    var z = c && c.zero; if (!z) return "";
    if (!z.neatins) return "Zero-ul botului: " + pret(z.pret) + " (" + pcS(z.dist) + " de aici)";
    if (z.pretPoz) return "Zero-ul, pe poziția de acum: " + pret(z.pretPoz) + " (" + pcS(z.distPoz) + " de aici), cu poziția ținută întreagă. Gridul o închide pe drum, deci în gridul ăsta botul nu ajunge pe zero"
      + (z.total !== null && z.nivel !== null ? ": la marginea de " + z.parte + " (" + pret(z.nivel) + ", " + pcS(z.dist) + ") rămâi cu " + usdt(z.total) : "");
    return "Pe zero botul nu mai ajunge în gridul ăsta" + (z.total !== null && z.nivel !== null ? ": la marginea de " + z.parte + " (" + pret(z.nivel) + ", " + pcS(z.dist) + ") rămâi cu " + usdt(z.total) : "");
  }
  function textStopMargine(c) {
    var s = c && c.stopMargine; if (!s) return "";
    return "Stopul tău e chiar pe marginea de " + c.parte + ": prima atingere a marginii închide botul" + (s.total !== null ? " la " + usdt(s.total) : "") + (s.sansa ? " · o atinge în 24 h în " + s.sansa + " de cazuri" : "");
  }
  function textMutare(c) {
    var m = c && c.mutare; if (!m) return "";
    var d = new Date(m.la), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return "Ai mutat gridul la " + z(d.getHours()) + ":" + z(d.getMinutes()) + ": " + pret(m.jos0) + "–" + pret(m.sus0) + " → " + pret(m.jos) + "–" + pret(m.sus) + (m.total0 !== null ? " (totalul era atunci " + usdt(m.total0) + ")" : "");
  }
  // ---- DESIGNUL capului (v100.374, el 21.11: „optimizează vizual pagina botului”): aceleași cifre, așezate ca bandă și ca bare ----
  /* banda de cifre: { k, et (eticheta), val (cifra mare), sub (rândul mic), ton? } - doar ce se știe; nimic inventat */
  function placi(c) {
    if (!c) return []; var P = [], e = c.expunere, b = c.bani, z = c.zero, unde = c.parte === "jos" ? "sub" : "peste";
    if (e) {
      P.push({ k: "poz", et: "Poziția", val: num(e.notional, 1) + " USDT", sub: [(e.lung ? "long" : "short") + (e.neutru ? " acum" : ""), e.levier !== null ? "levier efectiv " + num(e.levier, 1) + "×" : "", e.neutru ? "bot neutru: partea se schimbă cu prețul" : ""].filter(Boolean).join(" · ") });
      P.push({ k: "unu", et: "1% contra", val: usdt(e.unu), sub: e.oreGrile !== null ? "= " + (e.oreGrile > 30 * 24 ? "peste 30 de zile" : durata(e.oreGrile)) + " de grile, la ritmul de până acum" : e.afara ? "afară din grid nu se mai fac grile" : "" });
    }
    if (!c.afara) P.push({ k: "margine", et: "La marginea de " + c.parte, val: b.margine !== null ? usdt(b.margine) : "—", sub: "totalul botului la " + pret(c.nivel) });   /* distanța o spune titlul capului: aici nu se repetă */
    else P.push({ k: "margine", et: "Marginea de " + c.parte, val: "trecută cu " + num(Math.abs(c.dist) * 100, 1) + "%", sub: pret(c.nivel) + (c.afaraDe ? " · afară de " + durataAfara(c.afaraDe.ore) : ""), ton: "rau" });
    if (b.stop !== null && b.stopPret !== null) {
      var dS = Math.abs(b.stopPret - c.nivel) / c.nivel, dincolo = c.parte === "jos" ? b.stopPret < c.nivel : b.stopPret > c.nivel;
      var pl = { k: "stop", et: "La stopul tău", val: usdt(b.stop), sub: pret(b.stopPret) + " · " + (c.stopMargine ? "chiar pe margine" : dincolo ? num(dS * 100, 1) + "% " + unde + " margine" : "în grid") };
      if (c.stopMargine) pl.ton = "atentie"; P.push(pl);
    } else if (b.stopPret !== null) P.push({ k: "stop", et: "Stopul tău", val: pret(b.stopPret), sub: "totalul de acolo nu se poate socoti" });
    else if (b.stopActiv) P.push({ k: "stop", et: "Stopul", val: b.stopEticheta || "în procente", sub: "fără preț socotit" });
    else P.push({ k: "stop", et: "Stopul", val: "fără stop", sub: "pierderea n-are capăt până la lichidare", ton: "rau" });
    /* take-profit-ul: banii de acolo, ca la margine și la stop; pe minus se spune (dincolo de grid botul ajunge fără poziție și închide cu ce are) */
    if (c.tp) { var tk = c.tp, pt;
      /* take-profit în PROCENTE din investiție: se declanșează la un total (procentul × investiția), nu la un preț - banii de acolo sunt cei din procent;
         când din preț, în grid, totalul ăsta nu se atinge, celula o spune (prețul socotit de Pionex pe poziția de acum nu se arată ca țintă) */
      if (tk.raport !== null) { pt = { k: "tp", et: "La take-profit", val: tk.total !== null ? usdt(tk.total) : "—", sub: pcS(tk.raport) + " din investiție · " + (tk.dinPret === false ? "din preț, în grid, nu se atinge" + textTpGrile(tk.grile, !!(z && z.neatins && z.grile && !z.grile.tanar && nr(z.grile.zile) !== null && z.grile.zile > 0)) : "pe la " + pret(tk.pret) + " (" + pcS(tk.dist) + " de aici)") };
        if (tk.dinPret === false) pt.ton = "atentie"; }
      else { pt = { k: "tp", et: "La take-profit", val: tk.total !== null ? usdt(tk.total) : pret(tk.pret), sub: (tk.total !== null ? pret(tk.pret) + " · " : "") + pcS(tk.dist) + " de aici" + (tk.dincolo ? " · " + tk.dincolo + " grid" : "") };
        if (tk.total !== null && tk.total < 0) { pt.ton = "rau"; pt.sub += " · închide pe minus"; } }
      P.push(pt); }
    if (z && z.neatins && z.pretPoz) P.push({ k: "zero", et: "Zero-ul, pe poziția de acum", val: pret(z.pretPoz), ton: "atentie",
      sub: pcS(z.distPoz) + " de aici, " + (z.parte === "jos" ? "sub" : "peste") + " grid · " + (z.total !== null && z.nivel !== null ? "la marginea de " + z.parte + " rămâi cu " + usdt(z.total) : "în gridul ăsta botul nu ajunge pe zero") });
    else if (z) P.push(z.neatins ? { k: "zero", et: "Zero-ul botului", val: "nu se mai atinge", sub: z.total !== null && z.nivel !== null ? "la marginea de " + z.parte + " rămâi cu " + usdt(z.total) : "în gridul ăsta", ton: "atentie" }
      : { k: "zero", et: "Zero-ul botului", val: pret(z.pret), sub: pcS(z.dist) + " de aici" });
    /* v100.376 („FA IDEI”): drumul care chiar există spre zero - grilele, în timp; cifra e a ritmului de recuperare de sub „Rezultat total” */
    var zg = z && z.neatins ? z.grile : null;
    if (zg && zg.tanar) P.push({ k: "zeroGrile", et: "Pe zero, din grile", val: "după o zi", sub: "ritmul se socotește după o zi de viață a botului" });
    else if (zg && nr(zg.zile) !== null && zg.zile > 0) P.push({ k: "zeroGrile", et: "Pe zero, din grile", val: "~" + (zg.zile < 10 ? z1(zg.zile) + " zile" : cate(Math.round(zg.zile), "zi", "zile")),
      sub: "la ritmul de azi" + (nr(zg.netZi) !== null ? " (" + usdt(zg.netZi) + " pe zi)" : "") + ", dacă prețul stă pe loc" });
    else if (zg && zg.zile === null) P.push({ k: "zeroGrile", et: "Pe zero, din grile", val: "nu, la ritmul de azi", sub: "grilele nu acoperă costurile", ton: "atentie" });
    return P;
  }
  /* barele șanselor, pe aceeași scară 0–100: marginea (doar cât nicio cifră nu e „de refăcut” - altfel rămâne propoziția ei) și stopul */
  function metri(c) {
    if (!c) return []; var M = [], S = c.sanse || [], mc = c.stopScurt || [], sd = c.stopDrum;
    if (S.length && !S.some(function (s) { return s.vechi; })) M.push({ k: "margine", et: "Atinge marginea, din 100", sursa: "istoria monedei" + (c.sanseOra ? ", socotit la " + c.sanseOra : "") + " · amănuntele în Probabilități",
      bare: S.map(function (s) { return { et: s.ore + " h", p: s.p, text: s.text.replace(/ din 100$/, "") }; }) });
    var B = mc.map(function (s) { return { et: s.ore + " h", p: s.p, text: s.p * 100 < 0.05 ? "sub 0,1%" : num(s.p * 100, 1) + "%" }; }), are24 = sd !== null && sd !== undefined;
    if (are24) { var k = Math.round(sd * 100); B.push({ et: "24 h", p: sd, text: k < 1 ? "< 1%" : k > 99 ? "> 99%" : "~" + k + "%" }); }
    var Tp = (c.tpScurt || []).map(function (s) { return { et: s.ore + " h", p: s.p, text: s.p * 100 < 0.05 ? "sub 0,1%" : num(s.p * 100, 1) + "%" }; });
    if (B.length) M.push({ k: "stop", et: "Atinge stopul", sursa: mc.length && are24 ? mc.map(function (s) { return s.ore + " h"; }).join(" și ") + ": Monte Carlo pe botul tău · 24 h: curba stopului, ca pe Drum" : mc.length ? "Monte Carlo pe botul tău" : "curba stopului, ca pe Drum", bare: B });
    if (Tp.length) M.push({ k: "tp", et: "Atinge take-profit-ul", sursa: "Monte Carlo pe botul tău · " + textTpVerif(c.tpVerif), bare: Tp });
    return M;
  }
  /* v100.376 („fa idei”): ce spune jurnalul colectorului despre șansa take-profit-ului pe boții lui (raportScurt: nTp / zileTp / verdictTp pe 1 h, 4 h, 24 h).
     Se spune orizontul cu cele mai multe judecate; cuvintele vin doar din verdictul raportului (sub 30 de judecate pe 10 zile: „strânge date”). */
  /* take-profit-ul care din preț nu se atinge: cât durează din grile, la ritmul de azi (ca „Pe zero, din grile”); fără ritm, fraza de până acum */
  function textTpGrile(g, scurt) {   /* scurt: celula „Pe zero, din grile” e alături și spune ritmul și „dacă prețul stă pe loc” - o singură dată în bandă */
    if (g && g.tanar) return ": doar din grile, în timp (ritmul se socotește după o zi de viață a botului)";
    if (g && nr(g.zile) !== null && g.zile > 0) return " · din grile: ~" + (g.zile < 10 ? z1(g.zile) + " zile" : cate(Math.round(g.zile), "zi", "zile")) + " la ritmul de azi" + (scurt ? "" : ", dacă prețul stă pe loc");
    if (g && g.zile === null && nr(g.netZi) !== null) return " · nici din grile, la ritmul de azi: nu acoperă costurile";
    return ": doar din grile, în timp";
  }
  function textTpVerif(v) {
    var L = (Array.isArray(v) ? v : []).filter(function (x) { return x && (x.ore === 1 || x.ore === 4 || x.ore === 24) && nr(x.nTp) !== null && x.nTp > 0; });
    if (!L.length) return "șansa take-profit-ului nu e încă verificată pe boții tăi, ca a stopului";
    var k = L.slice().sort(function (a, b) { return b.nTp - a.nTp || a.ore - b.ore; })[0], cat = cate(k.nTp, "judecată", "judecate") + " pe " + cate(nr(k.zileTp) || 0, "zi", "zile") + ", la " + k.ore + " h";
    if (k.verdictTp === "potrivit") return "verificată pe boții tăi: se potrivește (" + cat + ")";
    if (k.verdictTp === "prea-putin") return "pe boții tăi prezice prea puțin: take-profit-ul se atinge mai des (" + cat + ")";
    if (k.verdictTp === "prea-mult") return "pe boții tăi prezice prea mult: take-profit-ul se atinge mai rar (" + cat + ")";
    if (k.verdictTp === "nedecis") return "verificarea pe boții tăi e încă nedecisă (" + cat + ")";
    return "verificarea pe boții tăi strânge date (" + cat + "; trebuie 30 pe 10 zile)";
  }
  /* treptele întoarcerii (blocul „Dacă muți gridul acum”): cea împlinită și următoarele, cu ora la care se împlinesc */
  function trepte(c) {
    var m = c && c.mut; if (!m) return []; var T = [], ora = function (t) { var d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; }; return z(d.getHours()) + ":" + z(d.getMinutes()); };
    var din = function (f) { return Math.round(f * 100) + " din 100"; };
    if (m.curent) T.push({ et: "după " + cate(m.curent.h, "oră", "ore") + " afară", val: din(m.curent.intoarse), sub: cate(m.curent.n, "episod", "episoade"), p: m.curent.intoarse, acum: true });
    (m.urmatoare || []).forEach(function (u) { if (u.la !== null) T.push({ et: oraZi(u.la, m.acum) + " · " + cate(u.h, "oră", "ore"), val: din(u.intoarse), sub: cate(u.n, "episod", "episoade"), p: u.intoarse }); });
    return T;
  }
  /* „Dacă muți gridul acum”: titlul (mereu la vedere) + rândurile; null când nu e cazul */
  function textMut(c) {
    var m = c && c.mut; if (!m) return null;
    var pc = function (f) { return (f < 0 ? "−" : "+") + num(Math.abs(f) * 100, 1) + "%"; }, fara = function (v) { return num(Math.abs(v), 1) + " USDT"; }, din100 = function (f) { return Math.round(f * 100) + " din 100"; };
    var ora = function (t) { var d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; }; return z(d.getHours()) + ":" + z(d.getMinutes()); };
    var R = [], r0 = [m.stop ? "la stopul tău (" + pret(m.stop.pret) + ", " + pc(m.stop.dist) + "): " + usdt(m.stop.total) : c.bani.stopPret !== null ? "la stopul tău (" + pret(c.bani.stopPret) + "): totalul nu se poate socoti" : c.bani.stopActiv ? "stopul tău: " + (c.bani.stopEticheta || "pus în procente") : "fără stop pus"];
    if (m.margine) r0.push("la marginea de " + c.parteMargine + " (" + pret(m.margine.pret) + ", " + pc(m.margine.dist) + "): " + usdt(m.margine.total));
    if (m.zero) r0.push("pe zero la " + pret(m.zero.pret) + " (" + pc(m.zero.dist) + ")"); else if (m.zeroNeatins) r0.push("pe zero nu se mai ajunge în gridul ăsta" + (m.zeroPoz ? " (pe poziția de acum zero-ul e la " + pret(m.zeroPoz) + ")" : ""));
    R.push("Dacă rămâi: " + r0.join(" · "));
    if (m.risc !== null && m.recuperat !== null) { var k = m.stop24 !== null && m.stop24 !== undefined ? Math.round(m.stop24 * 100) : null;
      R.push("Riști încă " + fara(m.risc) + " până la stop, pentru " + fara(m.recuperat) + " recuperați dacă prețul se întoarce la margine" + (k !== null ? " · stopul atins în 24 h: " + (k < 1 ? "< 1%" : k > 99 ? "> 99%" : "~" + k + "%") + " (curba stopului)" : "")); }
    var t = [];
    if (m.curent) t.push("după " + cate(m.curent.h, "oră", "ore") + " afară, în " + din100(m.curent.intoarse) + " de cazuri prețul s-a întors în grid în următoarele 24 de ore (" + cate(m.curent.n, "episod", "episoade") + ", ieșiri pe oricare parte a gridului)");
    m.urmatoare.forEach(function (u, i) { if (u.la === null) return; t.push(oraZi(u.la, m.acum) + (u.h === 1 ? " se face o oră" : " se fac " + cate(u.h, "oră", "ore")) + (!m.curent && i === 0 ? " afară" : "") + ": " + din100(u.intoarse)); });
    if (t.length) R.push("Întoarcerea, pe boții tăi: " + t.join(" · "));
    if (m.fisa && m.fisa.nu) R.push("Fișa de azi zice să nu pornești un grid pe moneda asta: n-am socotit recuperarea pe gridul ei");
    else if (m.fisa && m.fisa.ore !== null) R.push("Cu gridul din fișa de azi (" + pret(m.fisa.jos) + "–" + pret(m.fisa.sus) + ", " + cate(m.fisa.linii, "grilă", "grile") + ", " + m.fisa.levier + "×): ≈ "
      + num(m.fisa.peZi, 1) + " USDT pe zi din grile (~" + cate(Math.round(m.fisa.treceriZi), "pereche", "perechi") + " pe zi, așteptate din istoria monedei) ⇒ pierderea de " + fara(m.pierdere) + " s-ar scoate în ≈ "
      + (m.fisa.ore > 30 * 24 ? "peste 30 de zile" : durata(m.fisa.ore)) + ", cu prețul rămas în el");
    if (m.oreGrile !== null) R.push("Un grid nou ar trebui să scoată " + fara(m.pierdere) + " ca să fii pe zero: la ritmul botului de acum (" + num(m.ritm * 24, 1) + " USDT pe zi cât a stat în grid) ≈ "
      + (m.oreGrile > 30 * 24 ? "peste 30 de zile" : durata(m.oreGrile)) + " de grile, cu prețul rămas în gridul nou");
    return { titlu: "Dacă muți gridul acum: încasezi pierderea de " + usdt(m.pierdere) + " (iei " + num(m.iei, 1) + " din " + num(m.investit, 1) + " USDT, după comisionul de închidere) · intrarea botului nou ≈ " + fara(m.comisioane) + " (estimat)", randuri: R,
      nota: "Cifre de acum și descrieri de pe boții tăi, nu o prognoză. Dacă închiderea la margine e mai bună decât lăsatul se vede la verdictul din Proba marginii (pagina Probe)." };
  }
  /* I-897: „între margine și stopul tău mai pierzi 16,8 USDT (stopul e cu 6,7% sub margine)” */
  function textIntre(c) {
    var i = c && c.intre; if (!i) return "";
    var unde = c.parte === "jos" ? "sub" : "peste", suma = num(Math.abs(i.bani), 1) + " USDT";
    return i.fel === "margine" ? "între margine și stopul tău mai pierzi " + suma + " (stopul e cu " + num(i.dist * 100, 1) + "% " + unde + " margine)"
      : "de aici până la stopul tău mai pierzi " + suma + " (stopul e la " + num(i.dist * 100, 1) + "% " + unde + " preț)";
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
    if (!c) return "";
    /* „0,0%” nu e o cifră: sub o zecime de procent se spune „sub 0,1%” */
    var mc = (c.stopScurt || []).map(function (s) { return "în " + s.ore + " h — " + (s.p * 100 < 0.05 ? "sub 0,1%" : num(s.p * 100, 1) + "%"); }), l = [];
    if (mc.length) l.push(mc.join(" · ") + " (Monte Carlo pe botul tău)");
    /* cifra de pe Drum, scrisă ca acolo (app.js tbStopSansaDrum): „~42%”, „< 1%”, „> 99%” */
    if (c.stopDrum !== null && c.stopDrum !== undefined) { var k = Math.round(c.stopDrum * 100); l.push("în 24 h — " + (k < 1 ? "< 1%" : k > 99 ? "> 99%" : "~" + k + "%") + " (curba stopului, ca pe Drum)"); }
    return l.length ? "stopul atins: " + l.join(" · ") : "";
  }
  return { stopPeMargine: stopPeMargine, textDovadaStopMargineScurt: textDovadaStopMargineScurt, PRAG_STOP_FARA_PAS: PRAG_STOP_FARA_PAS, COMISION: COMISION, CUTII: CUTII, PRAG_VECHI: PRAG_VECHI, sansaMutata: sansaMutata, placi: placi, metri: metri, trepte: trepte, mutareDin: mutareDin, textZero: textZero, textStopMargine: textStopMargine, textMutare: textMutare, textDovadaStopMargine: textDovadaStopMargine, textMut: textMut, textAfara: textAfara, textExpunere: textExpunere, textIntre: textIntre, textFaraStop: textFaraStop, textSansa: textSansa, textStop: textStop, rand: rand, afaraContra: afaraContra, comisionPerechi: comisionPerechi, costAcoperit: costAcoperit, dinBoti: dinBoti, textDurata: textDurata, textDovada: textDovada,
    cost: cost, textCost: textCost, parteaContra: parteaContra, alcatuieste: alcatuieste, textSanse: textSanse, textBani: textBani };
})();
if (typeof module !== "undefined" && module.exports) module.exports = CapMargine;
