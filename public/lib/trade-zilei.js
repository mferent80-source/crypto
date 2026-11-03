// Pagina „Trade-ul zilei” (v100.297; el, 03.11.2026: „un soft care îmi spune ce trade fac azi … integrată în aplicația Radar”).
// Partea PURĂ (fără DOM; proba o rulează în vm): din lumânările de 1 h Pionex (500 bare ≈ 20 de zile) scoate, pentru ziua UTC de azi:
//   - P3 „azi range > ieri?” (DOVEDIT: potrivit pe 2 ani, confirmat pe al treilea, Brier z 10,7) și P1 „atinge maximul / minimul de ieri până la
//     miezul nopții?” (CALIBRAT, nedovedit că bate mersul la întâmplare) - din proba SESSION-LEVELS 01.11.2026 (coeficienții ÎNGHEȚAȚI; aici nu se repotrivește nimic);
//   - cât se mișcă azi (range-ul zilei față de media pe 10 zile), pe clase de P3 - tabela din proba TRADE-UL ZILEI 03.11.2026 (IS);
//   - trade-ul zilei: DOAR ce a trecut proba pre-înregistrată din 03.11 (TZ_DOVEDITE). Spargerea pe zi de mișcare, gridul de o zi și
//     ținta la nivelul de ieri au PIERDUT după cost pe 2 ani (IS) - pagina o spune pe față, nu propune ce nu s-a dovedit.
// Nimic din viitor: toate cifrele vin din zilele închise + barele de azi de până acum.
var TradeZilei = (function () {
  var ORA = 3600000, ZI = 86400000;
  var COEF_P3 = [-0.2561961954604785, -1.8327059750146835, -0.34374236138114633];                     // intercept, ln(comp), ln(r1/r2)
  var COEF_P1 = [1.3404885857766566, -2.1731016614805574, 0.4027282928853741, -0.015974369102019863]; // intercept, x, ln(comp), trend
  var SIGW = 168;
  // range-ul zilei / media pe 10 zile, pe clase de P3 (IS 2023-11 … 2025-10, 21 perechi, 13.242 zile): p25 / mediana / p75 + cât de des e > ieri
  var CALIB = [
    { deLa: 0.0, maiMult: 0.09, p25: 0.88, med: 1.14, p75: 1.70 }, { deLa: 0.1, maiMult: 0.15, p25: 0.83, med: 1.11, p75: 1.48 },
    { deLa: 0.2, maiMult: 0.26, p25: 0.76, med: 1.02, p75: 1.42 }, { deLa: 0.3, maiMult: 0.35, p25: 0.72, med: 0.95, p75: 1.32 },
    { deLa: 0.4, maiMult: 0.44, p25: 0.67, med: 0.90, p75: 1.21 }, { deLa: 0.5, maiMult: 0.54, p25: 0.63, med: 0.85, p75: 1.17 },
    { deLa: 0.6, maiMult: 0.65, p25: 0.60, med: 0.83, p75: 1.13 }, { deLa: 0.7, maiMult: 0.75, p25: 0.55, med: 0.75, p75: 1.03 },
    { deLa: 0.8, maiMult: 0.91, p25: 0.56, med: 0.73, p75: 0.96 }, { deLa: 0.9, maiMult: 0.95, p25: 0.46, med: 0.61, p75: 0.82 }
  ];
  // Verdictele probei pre-înregistrate TRADE-UL ZILEI (03.11.2026, _JURNAL_TRADE_ZILEI.md). Se completează DOAR din raportul OOS.
  var PROBA = {
    A: { nume: "Spargere pe zi de mișcare", regula: "P3 ≥ 70 %: intri la prima închidere de 1 h peste maximul / sub minimul de ieri, stop la jumătate din range-ul de ieri, ieși la 23:00 UTC", dovedit: false, cifra: "pe anul de confirmare +0,08 % pe zi (zero, z 0,5); pe celelalte zile spargerea pierde 0,34 %" },
    B: { nume: "Grid de o zi pe zi liniștită", regula: "P3 ≤ 45 %: grid neutru centrat pe deschidere, ½ lățime = 0,5 × media range-ului pe 10 zile, 10 grile pe parte, închis la 23:00 UTC", dovedit: false, cifra: "pierde 0,55 % pe zi din capital (z −7,6): inventarul rămas seara + costurile" },
    C: { nume: "Țintă la nivelul de ieri", regula: "P1 ≥ 70 % și distanță ≥ 0,30 %: intri spre maximul / minimul de ieri cu ținta pe nivel și stop simetric", dovedit: false, cifra: "pierde 0,19 % pe trade (z −5,8); fără P1 pierde la fel" }
  };

  function sigm(z) { return 1 / (1 + Math.exp(-z)); }
  function nr(v) { var x = Number(v); return isFinite(x) ? x : null; }
  function medie(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function abatere(a) { if (a.length < 2) return null; var m = medie(a), s = 0; a.forEach(function (x) { s += (x - m) * (x - m); }); return Math.sqrt(s / (a.length - 1)); }
  function clasa(p3) { var c = CALIB[Math.min(9, Math.max(0, Math.floor(p3 * 10)))]; return c; }

  // lumânări 1h (crescător, închise) -> zilele UTC: { zi, op, hi, lo, cl, nb, bare }
  function zile(bare) {
    var z = [], cur = null;
    (bare || []).forEach(function (b) {
      if (!b || !(b.c > 0)) return;
      var k = Math.floor(b.t / ZI);
      if (!cur || cur.zi !== k) { cur = { zi: k, op: b.o, hi: b.h, lo: b.l, cl: b.c, nb: 0, bare: [] }; z.push(cur); }
      cur.hi = Math.max(cur.hi, b.h); cur.lo = Math.min(cur.lo, b.l); cur.cl = b.c; cur.nb++; cur.bare.push(b);
    });
    return z;
  }

  // Starea zilei de azi (ziua UTC a ultimei bare închise + ce e după ea): P3, nivelurile de ieri, range-ul așteptat, P1 acum.
  // `acum` (ms) = ora de acum, ca să numere barele rămase; lipsă ⇒ ora ultimei bare + 1 h.
  function azi(bare, acum) {
    var toateB = (bare || []).filter(function (b) { return b && b.c > 0; });
    if (!toateB.length) return { eroare: "fără lumânări" };
    var t = acum || (toateB[toateB.length - 1].t + ORA);
    toateB = toateB.filter(function (b) { return b.t + ORA <= t; });        // DOAR barele închise înainte de `acum` - nimic din viitor
    var Z = zile(toateB); if (Z.length < 13) return { eroare: "prea puține zile (" + Z.length + " din 13 necesare)" };
    var ziAzi = Math.floor(t / ZI), ultima = Z[Z.length - 1];
    // ziua curentă poate să nu aibă încă nicio bară închisă (00:xx UTC) ⇒ „azi” e goală, ieri = ultima zi închisă
    var azi = ultima.zi === ziAzi ? ultima : { zi: ziAzi, op: ultima.cl, hi: ultima.cl, lo: ultima.cl, cl: ultima.cl, nb: 0, bare: [] };
    var inchise = Z.filter(function (d) { return d.zi < ziAzi && d.nb >= 20; });
    if (inchise.length < 12) return { eroare: "prea puține zile întregi (" + inchise.length + " din 12 necesare)" };
    var ieri = inchise[inchise.length - 1], alalt = inchise[inchise.length - 2];
    if (ieri.zi !== ziAzi - 1) return { eroare: "lipsește ziua de ieri din lumânări" };
    var rng = function (d) { return (d.hi - d.lo) / d.cl; };
    var r1 = rng(ieri), r2 = rng(alalt);
    var ult10 = inchise.slice(-11, -1).map(rng), media10 = medie(inchise.slice(-10).map(rng));   // comp = ieri / media d-11..d-2; media10 = d-10..d-1
    if (!(r1 > 0) || !(r2 > 0) || !(media10 > 0) || !(medie(ult10) > 0)) return { eroare: "range zero în zilele de referință (monedă fără mișcare)" };
    var comp = r1 / medie(ult10);
    var p3 = sigm(COEF_P3[0] + COEF_P3[1] * Math.log(comp) + COEF_P3[2] * Math.log(r1 / r2));
    if (!isFinite(p3)) return { eroare: "P3 nu se poate calcula pe datele astea" };
    var cl20 = inchise.slice(-20).map(function (d) { return d.cl; }), sma20 = cl20.length >= 20 ? medie(cl20) : null;
    var trend = sma20 === null ? 0 : (ieri.cl > sma20 ? 1 : -1);
    // P1 acum: distanța în sigme pe barele rămase; sigma pe ultimele 168 de randamente orare
    var toate = toateB;
    var lr = []; for (var i = Math.max(1, toate.length - SIGW); i < toate.length; i++) lr.push(Math.log(toate[i].c / toate[i - 1].c));
    var sig = lr.length >= SIGW / 2 ? abatere(lr) : null;
    var c = azi.cl, oraUtc = Math.floor((t % ZI) / ORA), k = Math.max(0, 24 - oraUtc);   // bare rămase în zi, cu cea în curs (ca în proba SLEV: cnt − pos la închiderea barei)
    function p1(L, sus) {
      var atins = azi.nb > 0 && (sus ? azi.hi >= L : azi.lo <= L);   // fără nicio bară închisă azi nu știm dacă a atins (revizia 03.11, nr. 8)
      if (atins) return { p: 1, atins: true, dist: 0 };
      if (!(sig > 0) || k <= 0) return { p: null, atins: false, dist: sus ? L / c - 1 : 1 - L / c };
      var x = (sus ? Math.log(L / c) : Math.log(c / L)) / (sig * Math.sqrt(k));
      return { p: sigm(COEF_P1[0] + COEF_P1[1] * x + COEF_P1[2] * Math.log(comp) + COEF_P1[3] * (sus ? trend : -trend)), atins: false, dist: sus ? L / c - 1 : 1 - L / c };
    }
    var cls = clasa(p3), asteptat = { p25: media10 * cls.p25, med: media10 * cls.med, p75: media10 * cls.p75 };
    return {
      ziAzi: ziAzi, pret: c, pdh: ieri.hi, pdl: ieri.lo, pdc: ieri.cl, r1: r1, r2: r2, media10: media10, comp: comp, p3: p3, maiMultCaIeri: cls.maiMult,
      asteptat: asteptat, panaAcum: azi.nb ? (azi.hi - azi.lo) / c : 0, bareAzi: azi.nb, bareRamase: k, sigma: sig, trend: trend,
      p1Sus: p1(ieri.hi, true), p1Jos: p1(ieri.lo, false), ziIncompleta: inchise.length < 20
    };
  }

  // v100.298 (el: „pagina, ca să fie de folos dimineața”): lățimea de grid și distanța de stop DIN MIȘCAREA așteptată (măsurat ca
  // mișcare, nu ca bani): gridul cuprinde range-ul de azi în 3 zile din 4 (± p75 / 2), pasul = lățimea / 10 grile, stopul ≥ mediana.
  function grid(d) {
    if (!d || d.eroare || !d.asteptat) return null;
    var lat = d.asteptat.p75, jum = lat / 2;
    return { jumatate: jum, latime: lat, pas: lat / 10, stop: d.asteptat.med, jos: d.pret * (1 - jum), sus: d.pret * (1 + jum) };
  }

  // trade-ul zilei: doar ce e DOVEDIT; altfel spune ce NU faci și de ce
  function trade(d) {
    if (!d || d.eroare) return { fel: "eroare", text: d && d.eroare || "fără date" };
    var dov = Object.keys(PROBA).filter(function (k) { return PROBA[k].dovedit; });
    var cand = [];
    if (PROBA.A.dovedit && d.p3 >= 0.70) cand.push("A");
    if (PROBA.B.dovedit && d.p3 <= 0.45) cand.push("B");
    if (PROBA.C.dovedit && ((d.p1Sus.p >= 0.70 && d.p1Sus.dist >= 0.003) || (d.p1Jos.p >= 0.70 && d.p1Jos.dist >= 0.003))) cand.push("C");
    if (cand.length) return { fel: cand[0], text: PROBA[cand[0]].nume + ": " + PROBA[cand[0]].regula, cifra: PROBA[cand[0]].cifra };
    if (!dov.length) return { fel: "niciunul", text: "Niciun trade cu avantaj dovedit pe datele tale. Spargerea, gridul de o zi și ținta la nivelul de ieri au pierdut după cost pe 2 ani (proba din 03.11.2026)." };
    return { fel: "niciunul", text: "Azi nu se îndeplinește condiția niciunui trade dovedit (" + dov.map(function (k) { return PROBA[k].nume; }).join(", ") + ")." };
  }

  return { azi: azi, zile: zile, trade: trade, grid: grid, clasa: clasa, CALIB: CALIB, PROBA: PROBA, COEF_P3: COEF_P3, COEF_P1: COEF_P1, sigm: sigm };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TradeZilei;
