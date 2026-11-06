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
  // v100.299 (proba ORA ZILEI, 03.11.2026, _JURNAL_ORA_ZILEI.md): cât din întinderea zilei UTC e formată, de obicei, după ora h (indicele 0 = ora
  // 00–01 UTC închisă); IS 2023–25, 21 de perechi, confirmat pe 2025–26 la cel mult 2,3 pp. Orele 13–16 UTC aduc 20,6 % din mișcare (4/24 = 16,7 %).
  var CURBA_F = [0.238, 0.336, 0.396, 0.438, 0.473, 0.507, 0.540, 0.575, 0.608, 0.637, 0.662, 0.684, 0.713, 0.748, 0.788, 0.824, 0.857, 0.883, 0.906, 0.925, 0.945, 0.964, 0.985, 1.0];
  // CALIB e calculată pe TOATE zilele; față de ea, mediana range / media10 e ×1,06 în zilele lucrătoare și ×0,85 sâmbăta / duminica (UTC), în
  // interiorul claselor de P3 (IS 1,058 / 0,854, OOS 1,073 / 0,862 - oz_v3.py, după revizia din 03.11) ⇒ se înmulțesc peste CALIB
  var FACTOR_LUCRATOARE = 1.06, FACTOR_WEEKEND = 0.85;
  // v100.307 (I-841; pozele de pe VPS, 06.11.2026 00:20: BTC „7 %” deși ziua era la 7,1 % față de 6,8 % ieri, cu ~96 % din zi format; ETH „6 %”
  // la 9,8 % față de 9,3 %). Modelul P3 vede doar ieri și alaltăieri ⇒ cu ziua în curs, P3 se condiționează de ziua deja făcută.
  // IPOTEZA (scrisă înainte de cifre): dată fiind ora h (câte ore UTC din ziua de azi sunt închise, 1..23) și cât s-a mișcat deja ziua,
  // P(întinderea finală a zilei > ieri) se citește din repartiția măsurată a lui F_h = întinderea până la ora h / întinderea zilei întregi
  // (prețuri absolute, aceeași zi). Evenimentul e cel din P3: (max − min) / închiderea zilei > r1. Cu închiderea ≈ prețul de acum c:
  // max − min ≥ r1 · c ⇔ F_h ≤ x, x = (max − min de până acum) / (r1 · c) - același preț la numărător și la numitor ⇒ P3c = P(F_h ≤ x).
  // Combinarea cu modelul de dimineață: P3 = σ(a + b · logit(P3 model) + c · logit(P3c)), coeficienții pe blocuri FIXE de ore (1–4, 5–8,
  // 9–12, 13–16, 17–20, 21–23); probabilitățile tăiate la [0,005; 0,995] pentru logit. Dimineața cântărește modelul, seara ziua făcută.
  // MĂSURAT pe barele reale de 1 h din data/istoric-1h (77 de monede Pionex, zilele UTC întregi 10.05 … 04.11.2026, starea la h:05 prin
  // TradeZilei.azi; scratchpad i841/masoara-f.mjs + analiza.mjs; o SINGURĂ variantă, fixată înainte de cifre):
  //   ÎNVĂȚAT pe zilele până la 24.08 (107 zile): cuantilele lui F_h pe toate zilele-monedă, coeficienții pe rândurile fără „deja” (116.079);
  //   VERIFICAT pe zilele de la 25.08 (72 de zile NEVĂZUTE, 93.203 de rânduri fără „deja”), cu codul de mai jos: Brier P3 nou 0,150,
  //   modelul de dimineață singur 0,210, P3c singur 0,164 (nou − model −0,060, z pe zile −9,7; nou − P3c −0,014, z −4,2;
  //   pe săptămâni −4,2); modelul doar recalibrat pe blocuri 0,181 ⇒ câștigul vine din ziua făcută, nu din recalibrare. Pe ore:
  //   nou < model la fiecare oră 1–23 (z −2,8 … −17,8); față de P3c mai bun la orele 1–14 (z ≤ −2), la egalitate în rest
  //   (z +0,1 … −1,6; niciun bloc mai slab). Calibrarea pe zecimi, pe nevăzut: ECE 1,2 pp (modelul 12,4, P3c 4,7);
  //   din 100 de zile cu P3 ≈ 25 % au ieșit 25, cu ≈ 75 % au ieșit 80.
  // ⇒ trece regula scrisă înainte (bate ambele pe nevăzut, z pe zile ≥ 2, niciun bloc mai slab) ⇒ cu ziua în curs și fără „deja”, P3 = acesta.
  // Ce NU s-a probat: monedele mari (BTC / ETH nu sunt în data/istoric-1h; P3 al modelului a fost potrivit pe 21 de perechi Binance) și
  // zilele dinainte de mai 2026; 72 de zile nevăzute într-un singur regim de piață. Proba: scripts/proba-v100307-a.mjs (fixture de 7 monede).
  var NIV_F = [0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.975, 0.99];
  var CUANT_F = [   // CUANT_F[h − 1][k] = cuantila NIV_F[k] a lui F_h (1 = întinderea zilei e deja toată făcută la ora h)
    [0.037, 0.052, 0.066, 0.087, 0.103, 0.115, 0.127, 0.139, 0.151, 0.163, 0.177, 0.189, 0.204, 0.219, 0.238, 0.256, 0.278, 0.307, 0.344, 0.394, 0.479, 0.561, 0.66],   // 1 oră închisă
    [0.059, 0.081, 0.105, 0.135, 0.158, 0.176, 0.195, 0.211, 0.229, 0.248, 0.268, 0.288, 0.308, 0.33, 0.352, 0.381, 0.412, 0.447, 0.494, 0.552, 0.638, 0.728, 0.845],   // 2 ore închise
    [0.071, 0.104, 0.134, 0.17, 0.198, 0.224, 0.249, 0.271, 0.291, 0.314, 0.336, 0.358, 0.381, 0.407, 0.436, 0.471, 0.503, 0.546, 0.6, 0.66, 0.775, 0.875, 0.996],   // 3 ore închise
    [0.089, 0.123, 0.156, 0.204, 0.237, 0.266, 0.294, 0.32, 0.342, 0.367, 0.392, 0.417, 0.445, 0.475, 0.505, 0.54, 0.577, 0.618, 0.667, 0.741, 0.855, 0.957, 1],   // 4 ore închise
    [0.104, 0.141, 0.182, 0.23, 0.268, 0.299, 0.33, 0.354, 0.38, 0.407, 0.434, 0.463, 0.491, 0.524, 0.558, 0.593, 0.633, 0.673, 0.74, 0.818, 0.927, 1, 1],   // 5 ore închise
    [0.117, 0.157, 0.203, 0.261, 0.3, 0.336, 0.366, 0.396, 0.426, 0.453, 0.484, 0.512, 0.545, 0.576, 0.612, 0.645, 0.684, 0.742, 0.803, 0.878, 1, 1, 1],   // 6 ore închise
    [0.131, 0.18, 0.227, 0.286, 0.332, 0.368, 0.4, 0.436, 0.468, 0.5, 0.532, 0.565, 0.597, 0.627, 0.657, 0.695, 0.746, 0.794, 0.848, 0.925, 1, 1, 1],   // 7 ore închise
    [0.143, 0.196, 0.25, 0.312, 0.359, 0.399, 0.434, 0.468, 0.502, 0.536, 0.569, 0.601, 0.632, 0.662, 0.7, 0.742, 0.786, 0.833, 0.893, 0.962, 1, 1, 1],   // 8 ore închise
    [0.159, 0.215, 0.269, 0.338, 0.391, 0.433, 0.472, 0.509, 0.543, 0.577, 0.609, 0.639, 0.667, 0.705, 0.745, 0.787, 0.83, 0.879, 0.934, 1, 1, 1, 1],   // 9 ore închise
    [0.182, 0.232, 0.288, 0.359, 0.415, 0.461, 0.502, 0.539, 0.573, 0.607, 0.638, 0.669, 0.705, 0.744, 0.783, 0.825, 0.865, 0.914, 0.968, 1, 1, 1, 1],   // 10 ore închise
    [0.194, 0.25, 0.308, 0.384, 0.439, 0.489, 0.528, 0.565, 0.6, 0.633, 0.665, 0.699, 0.736, 0.775, 0.815, 0.853, 0.894, 0.943, 1, 1, 1, 1, 1],   // 11 ore închise
    [0.206, 0.27, 0.331, 0.412, 0.468, 0.516, 0.557, 0.595, 0.632, 0.663, 0.696, 0.73, 0.765, 0.801, 0.841, 0.879, 0.922, 0.969, 1, 1, 1, 1, 1],   // 12 ore închise
    [0.233, 0.299, 0.358, 0.443, 0.5, 0.551, 0.594, 0.632, 0.667, 0.7, 0.735, 0.769, 0.803, 0.841, 0.878, 0.915, 0.959, 1, 1, 1, 1, 1, 1],   // 13 ore închise
    [0.266, 0.327, 0.403, 0.485, 0.55, 0.602, 0.641, 0.677, 0.714, 0.751, 0.786, 0.825, 0.858, 0.892, 0.929, 0.966, 1, 1, 1, 1, 1, 1, 1],   // 14 ore închise
    [0.306, 0.388, 0.456, 0.543, 0.603, 0.649, 0.693, 0.73, 0.765, 0.803, 0.839, 0.873, 0.903, 0.939, 0.974, 1, 1, 1, 1, 1, 1, 1, 1],   // 15 ore închise
    [0.351, 0.448, 0.513, 0.602, 0.658, 0.709, 0.75, 0.786, 0.825, 0.857, 0.89, 0.922, 0.957, 0.989, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 16 ore închise
    [0.407, 0.483, 0.556, 0.642, 0.702, 0.751, 0.792, 0.835, 0.872, 0.903, 0.936, 0.969, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 17 ore închise
    [0.431, 0.516, 0.589, 0.677, 0.743, 0.792, 0.84, 0.878, 0.909, 0.945, 0.977, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 18 ore închise
    [0.461, 0.553, 0.623, 0.71, 0.774, 0.827, 0.873, 0.908, 0.943, 0.977, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 19 ore închise
    [0.496, 0.585, 0.665, 0.757, 0.817, 0.867, 0.906, 0.947, 0.983, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 20 ore închise
    [0.544, 0.626, 0.71, 0.794, 0.851, 0.895, 0.935, 0.973, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 21 ore închise
    [0.622, 0.72, 0.8, 0.872, 0.93, 0.971, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],   // 22 ore închise
    [0.767, 0.843, 0.906, 0.967, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   // 23 ore închise
  ];
  var BLOC_P3Z = [[1, 4], [5, 8], [9, 12], [13, 16], [17, 20], [21, 23]];
  var COEF_P3Z = [[0.0019, 0.6252, 0.3884], [-0.0061, 0.6116, 0.5305], [-0.0348, 0.5656, 0.5979], [-0.0842, 0.5036, 0.6772], [-0.3198, 0.5305, 0.6822], [-0.4094, 0.5587, 0.7699]];   // pe bloc: a, b (logit P3 model), c (logit P3c)
  var LIM_P3Z = 0.005;
  // „din 100 de zile ca azi la ora asta, N au ieșit așa”: frecvența MĂSURATĂ pe zilele NEVĂZUTE (de la 25.08), pe (blocul de ore, zecimea de
  // P3 nou); null = celula are sub 200 de zile-monedă ⇒ se spune zecimea pe toate orele (IESIT_P3Z_TOATE)
  var IESIT_P3Z = [
    [0.08, 0.13, 0.19, 0.33, 0.43, 0.54, 0.65, 0.79, 0.89, 0.96],   // orele 1–4
    [0.05, 0.11, 0.26, 0.36, 0.45, 0.54, 0.66, 0.81, 0.9, 0.96],   // orele 5–8
    [0.04, 0.14, 0.31, 0.34, 0.46, 0.55, 0.66, 0.8, 0.89, 0.96],   // orele 9–12
    [0.04, 0.15, 0.26, 0.36, 0.46, 0.58, 0.7, 0.79, null, 0.93],   // orele 13–16
    [0.03, 0.13, 0.26, 0.38, 0.42, 0.6, null, null, null, 0.9],   // orele 17–20
    [0.02, 0.13, 0.21, null, null, null, null, null, null, 0.92]   // orele 21–23
  ];
  var IESIT_P3Z_TOATE = [0.03, 0.13, 0.25, 0.35, 0.45, 0.55, 0.66, 0.8, 0.89, 0.93];
  // Verdictele probei pre-înregistrate TRADE-UL ZILEI (03.11.2026, _JURNAL_TRADE_ZILEI.md). Se completează DOAR din raportul OOS.
  var PROBA = {
    A: { nume: "Spargere pe zi de mișcare", regula: "P3 ≥ 70 %: intri la prima închidere de 1 h peste maximul / sub minimul de ieri, stop la jumătate din range-ul de ieri, ieși la 23:00 UTC", dovedit: false, cifra: "pe anul de confirmare +0,08 % pe zi (zero, z 0,5); pe celelalte zile spargerea pierde 0,34 %",
         prospectiv: "din 04.11.2026 colectorul judecă fiecare zi UTC închisă pe 21 de perechi, cu aceleași reguli (data/proba-a.jsonl); verdict după 2027-02-01, nu înainte - același semn ca pe cei 3 ani, dar sub prag, merită o probă pe zile care nu existau când s-au scris regulile" },
    B: { nume: "Grid de o zi pe zi liniștită", regula: "P3 ≤ 45 %: grid neutru centrat pe deschidere, ½ lățime = 0,5 × media range-ului pe 10 zile, 10 grile pe parte, închis la 23:00 UTC", dovedit: false, cifra: "pierde 0,55 % pe zi din capital (z −7,6): inventarul rămas seara + costurile" },
    C: { nume: "Țintă la nivelul de ieri", regula: "P1 ≥ 70 % și distanță ≥ 0,30 %: intri spre maximul / minimul de ieri cu ținta pe nivel și stop simetric", dovedit: false, cifra: "pierde 0,19 % pe trade (z −5,8); fără P1 pierde la fel" }
  };

  function sigm(z) { return 1 / (1 + Math.exp(-z)); }
  function nr(v) { var x = Number(v); return isFinite(x) ? x : null; }
  function medie(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function abatere(a) { if (a.length < 2) return null; var m = medie(a), s = 0; a.forEach(function (x) { s += (x - m) * (x - m); }); return Math.sqrt(s / (a.length - 1)); }
  function clasa(p3) { var c = CALIB[Math.min(9, Math.max(0, Math.floor(p3 * 10)))]; return c; }
  // v100.307 (I-841): P(F_ore ≤ x) din cuantilele înghețate - liniar între ele, (0, 0) sub prima, 1 de la x ≥ 1 (F nu trece de 1)
  function repartitiaF(ore, x) {
    var Q = CUANT_F[Math.min(23, Math.max(1, Math.round(ore))) - 1], P = NIV_F;
    if (!(x > 0)) return 0;
    if (x >= 1) return 1;
    if (x < Q[0]) return P[0] * x / Q[0];
    for (var k = P.length - 1; k >= 0; k--) if (x >= Q[k]) {
      var q1 = k + 1 < P.length ? Q[k + 1] : 1, p1 = k + 1 < P.length ? P[k + 1] : 1;
      return q1 > Q[k] ? P[k] + (p1 - P[k]) * (x - Q[k]) / (q1 - Q[k]) : p1;
    }
    return 0;
  }
  function blocP3Z(ore) { for (var i = 0; i < BLOC_P3Z.length; i++) if (ore <= BLOC_P3Z[i][1]) return i; return BLOC_P3Z.length - 1; }
  function logitP3Z(p) { var q = Math.min(1 - LIM_P3Z, Math.max(LIM_P3Z, p)); return Math.log(q / (1 - q)); }
  // P3 nou = σ(a + b · logit(P3 model) + c · logit(P3c)), coeficienții blocului de ore
  function combinaP3Z(ore, p3m, p3z) { var w = COEF_P3Z[blocP3Z(ore)]; return sigm(w[0] + w[1] * logitP3Z(p3m) + w[2] * logitP3Z(p3z)); }
  function iesitP3Z(ore, p) { var z = Math.min(9, Math.max(0, Math.floor(p * 10))), v = IESIT_P3Z[blocP3Z(ore)][z]; return v == null ? IESIT_P3Z_TOATE[z] : v; }

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
    var Z = zile(toateB); if (Z.length < 12) return { eroare: "prea puține zile (" + Z.length + " din 12 necesare)" };   // v100.299: la 00:xx UTC azi n-are încă nicio bară - 12 zile închise ajung (garda de mai jos le cere întregi)
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
    // v100.299: ziua săptămânii (UTC; ziua 0 = 1970-01-01 = joi ⇒ +3: luni 0 … duminică 6), factorul de weekend peste CALIB, cât din
    // mișcarea zilei e de obicei formată după ultima oră închisă (ora 0 ⇒ nimic) și cât mai rămâne din mișcarea așteptată
    var ziSapt = (ziAzi + 3) % 7, weekend = ziSapt >= 5, factorZi = weekend ? FACTOR_WEEKEND : FACTOR_LUCRATOARE;
    var cls = clasa(p3), model = { p25: media10 * cls.p25 * factorZi, med: media10 * cls.med * factorZi, p75: media10 * cls.p75 * factorZi };
    var format = oraUtc > 0 ? CURBA_F[Math.min(23, oraUtc - 1)] : 0, ramane = 1 - format;
    // v100.306 (I-825, auditul final din 05.11, 🔴 2): ziua de azi, deja făcută, intră în cifre. Modelul P3 vede doar ieri și alaltăieri, iar seara
    // pagina scria „mai mult ca ieri: 7 %” cu ziua deja peste ieri (7,1 % față de 6,8 %). Acum: până acum ≥ ieri ⇒ P3 = 1 („deja mai mult ca
    // ieri”); mișcarea așteptată = max(a modelului, până acum) pe fiecare cuantilă. Clasa (CALIB) rămâne pe P3-ul modelului (p3Model), cum a fost
    // măsurată. La 00:00 UTC (proba A pre-înregistrată, tura-proba-a.mjs) nu e nicio bară de azi ⇒ P3 = al modelului, neatins.
    // v100.307 (I-841): între cele două (ziua în curs, încă sub ieri), P3 e condiționat de ziua făcută - mai jos, la oreZi.
    // revizia v100.306: „deja” compara până-acum / prețul de ACUM cu ieri / închiderea de ieri - o închidere mai sus poate coborî procentul
    // final sub ieri. Procentul final nu poate fi sub (max − min) / max de până acum (închiderea ≤ maximul zilei, iar un maxim nou mărește
    // și întinderea) ⇒ „deja” doar când limita asta sigură trece de ieri.
    var panaAcum = azi.nb ? (azi.hi - azi.lo) / c : 0, sigurAzi = azi.nb ? (azi.hi - azi.lo) / azi.hi : 0, deja = azi.nb > 0 && sigurAzi >= r1;
    var asteptat = { p25: Math.max(model.p25, panaAcum), med: Math.max(model.med, panaAcum), p75: Math.max(model.p75, panaAcum) };
    // v100.307 (I-841): cu ziua în curs și fără „deja”, P3 se condiționează de ziua făcută (ipoteza, măsurătoarea și verificarea pe zile
    // nevăzute: sus, la CUANT_F). oreZi = orele UTC ale zilei acoperite de barele închise (ora ultimei bare + 1); x = (max − min de până acum)
    // / (r1 × prețul de acum). „deja” rămâne P3 = 1; la 00:00 UTC (nicio bară de azi, proba A pre-înregistrată) P3 = modelul, neatins.
    var oreZi = azi.nb ? Math.min(23, Math.floor((azi.bare[azi.bare.length - 1].t % ZI) / ORA) + 1) : 0;
    var p3Ziua = null, p3Cond = null;
    if (azi.nb > 0 && !deja) { p3Ziua = repartitiaF(oreZi, (azi.hi - azi.lo) / (r1 * c)); p3Cond = combinaP3Z(oreZi, p3, p3Ziua); if (!isFinite(p3Cond)) { p3Ziua = null; p3Cond = null; } }
    return {
      ziAzi: ziAzi, pret: c, pdh: ieri.hi, pdl: ieri.lo, pdc: ieri.cl, r1: r1, r2: r2, media10: media10, comp: comp, p3: deja ? 1 : p3Cond !== null ? p3Cond : p3, p3Model: p3, dejaMaiMult: deja, maiMultCaIeri: cls.maiMult,
      p3Ziua: p3Ziua, p3CuZiua: p3Cond, cuZiua: p3Cond !== null, oreZi: oreZi, iesitCuZiua: p3Cond !== null ? iesitP3Z(oreZi, p3Cond) : null,
      asteptat: asteptat, asteptatModel: model, panaAcum: panaAcum, bareAzi: azi.nb, bareRamase: k, sigma: sig, trend: trend,
      p1Sus: p1(ieri.hi, true), p1Jos: p1(ieri.lo, false), ziIncompleta: inchise.length < 20,
      oraUtc: oraUtc, ziSapt: ziSapt, weekend: weekend, factorZi: factorZi, format: format, ramane: ramane, ramaneAsteptat: asteptat.med * ramane
    };
  }

  // v100.298 (el: „pagina, ca să fie de folos dimineața”): lățimea de grid și distanța de stop DIN MIȘCAREA așteptată (măsurat ca
  // mișcare, nu ca bani). v100.306 (I-825, auditul final din 05.11, 🔴 3): banda MĂSURATĂ. Înainte: ± p75 / 2 a range-ului ZILEI ÎNTREGI,
  // centrată pe prețul de ACUM - restul zilei stătea în bandă în 43 % din zile la 00:05 UTC, 52 % la 05:05, 67 % la 12:05, iar pagina scria
  // „trei din patru”. Acum: jumătatea benzii = BANDA_K[ora UTC] × asteptat.med (mișcarea așteptată, cu ziua de până acum), unde BANDA_K[h] =
  // cuantila 75 a lui max(maxim − preț, preț − minim) / asteptat.med pe orele RĂMASE ale zilei UTC (bara în curs inclusă), la h:05 UTC.
  // Măsurat pe barele reale de 1 h din data/istoric-1h (75 de monede Pionex, zilele 10.05 … 02.11.2026, scratchpad rb-lucru/masoara-banda.mjs):
  //   ÎNVĂȚAT pe zilele până la 23.08 (106 zile, 6.170 de zile-monedă pe oră) ⇒ 75 % pe fiecare oră (prin construcție);
  //   VERIFICAT pe zilele de la 24.08 (71 de zile NEVĂZUTE, 5.077 de zile-monedă pe oră) ⇒ 71,5 … 79,2 % după oră, 75,0 % în medie
  //   (IC 95 % pe zile ±4–5 pp; monedele aceleiași zile se mișcă împreună). Fraza spune BANDA_ACOPERIRE[ora] = cifra de pe zilele nevăzute.
  // Scara asteptat.med a ieșit mai strânsă pe învățare decât media pe 10 zile (± 4,45 % față de ± 4,57 %, în mediană, la aceeași acoperire).
  // Pasul = lățimea / 10 ⇒ CINCI grile pe parte (pagina scria „zece”). Stopul nu stă în interiorul benzii: cel puțin marginea ei (orele 0–3
  // UTC au K > 1, deci banda trece de mișcarea unei zile obișnuite).
  var BANDA_K = [1.099, 1.08, 1.026, 1.005, 0.967, 0.952, 0.902, 0.871, 0.846, 0.806, 0.781, 0.746, 0.718, 0.694, 0.637, 0.594, 0.531, 0.494, 0.443, 0.396, 0.341, 0.299, 0.228, 0.142];
  var BANDA_ACOPERIRE = [0.755, 0.754, 0.75, 0.752, 0.739, 0.75, 0.735, 0.731, 0.739, 0.728, 0.729, 0.715, 0.716, 0.731, 0.725, 0.747, 0.763, 0.778, 0.767, 0.786, 0.777, 0.792, 0.774, 0.773];
  function grid(d) {
    if (!d || d.eroare || !d.asteptat) return null;
    var h = Math.min(23, Math.max(0, Math.floor(Number(d.oraUtc) || 0))), med = d.asteptat.med, jum = BANDA_K[h] * med, lat = 2 * jum;
    return { jumatate: jum, latime: lat, pas: lat / 10, grilePeParte: 5, stop: Math.max(med, jum), stopLaMargine: jum >= med, acoperire: BANDA_ACOPERIRE[h], oraUtc: h,
      jos: d.pret * (1 - jum), sus: d.pret * (1 + jum) };
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

  return { azi: azi, zile: zile, trade: trade, grid: grid, clasa: clasa, CALIB: CALIB, PROBA: PROBA, COEF_P3: COEF_P3, COEF_P1: COEF_P1, sigm: sigm, CURBA_F: CURBA_F, FACTOR_WEEKEND: FACTOR_WEEKEND, FACTOR_LUCRATOARE: FACTOR_LUCRATOARE,
    BANDA_K: BANDA_K, BANDA_ACOPERIRE: BANDA_ACOPERIRE,
    NIV_F: NIV_F, CUANT_F: CUANT_F, BLOC_P3Z: BLOC_P3Z, COEF_P3Z: COEF_P3Z, IESIT_P3Z: IESIT_P3Z, IESIT_P3Z_TOATE: IESIT_P3Z_TOATE, repartitiaF: repartitiaF, combinaP3Z: combinaP3Z, iesitP3Z: iesitP3Z };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TradeZilei;
