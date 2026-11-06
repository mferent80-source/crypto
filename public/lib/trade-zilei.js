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
  // P(întinderea finală a zilei > ieri) se citește dintr-o repartiție măsurată pe ore. Evenimentul e cel din P3: (max − min) / închiderea zilei > r1.
  // ÎNCERCAREA 1 (a820def, înlocuită): F_h = întinderea până la ora h / întinderea zilei, cu închiderea zilei = prețul de acum ⇒ P3c sărea de
  // la ~0,25 la 1 la x = panaAcum / r1 = 1; revizia independentă: seara, x ∈ [0,98; 1) spus 40 % / ieșit 62 %, x ∈ [1; 1,02) spus 96 % /
  // ieșit 80 % (și pe învățat ⇒ construcție, nu zgomot).
  // ÎNCERCAREA 2 (aceasta, propunerea revizorului): G_h = întinderea finală RELATIVĂ (cu închiderea reală a zilei) / întinderea relativă de
  // până acum (panaAcum, la prețul de acum). Evenimentul ⇔ G_h > r1 / panaAcum ⇒ P3c = P(G_h ≥ r1 / panaAcum), fără nicio presupunere despre
  // închidere ⇒ fără prag la x = 1 (G iese și sub 1: un preț care urcă spre maxim scade procentul). Combinarea cu modelul de dimineață:
  // P3 = σ(a + b · logit(P3 model) + c · logit(P3c)), pe blocuri FIXE de ore (1–4, 5–8, 9–12, 13–16, 17–20, 21–23); probabilitățile tăiate la
  // [0,005; 0,995]. Varianta 2b (G ancorat în (max − min) / max) a pierdut pe ÎNVĂȚAT (spunea 67–72 % peste x = 1, ieșeau 90–93 %) și n-a fost
  // verificată pe nevăzut.
  // MĂSURAT pe barele reale de 1 h din data/istoric-1h (77 de monede Pionex, fără BTC / ETH; zilele UTC întregi 10.05 … 04.11.2026; starea la
  // h:05 prin TradeZilei.azi; scratchpad i841/masoara-f2.mjs + analiza2.mjs + e2e2.mjs):
  //   ÎNVĂȚAT pe zilele până la 24.08 (107 zile): cuantilele lui G_h pe toate zilele-monedă, coeficienții pe rândurile fără „deja” (116.075).
  //   VERIFICAT pe zilele de la 25.08 (72 de zile, 93.201 de rânduri fără „deja”), cu codul de mai jos: Brier P3 nou 0,149, modelul
  //   singur 0,210, P3c singur 0,164 (z pe zile −9,8 / −4,4); niciun bloc mai slab. Seara, x ∈ [0,95; 1) / [1; 1,05): orele 17–20
  //   spus 47 / 87 %, ieșit 52 / 86 %; orele 21–23 spus 29 / 92 %, ieșit 24 / 89 % (încercarea 1: 40 / 96 și 22 / 97 %).
  //   ECE 1,1 pp (modelul 12,4, P3c 4,5).
  //   CINSTE: zilele astea au decis deja încercarea 1 și au fost folosite la revizie ⇒ a doua încercare pe același set. Felia ultimelor 15 zile
  //   (21.10 … 04.11; inclusă și ea în totalul încercării 1, neprivită separat): Brier nou 0,134, modelul 0,208 (z −5,4), P3c 0,148 (z −1,7).
  // ⇒ trece regula scrisă înainte (bate ambele, z ≥ 2, niciun bloc mai slab; garda x ≈ 1 ≤ 10 pp) ⇒ cu ziua în curs și fără „deja”, P3 = acesta.
  // Ce NU s-a probat: BTC / ETH (nu sunt în data/istoric-1h; P3 al modelului a fost potrivit pe 21 de perechi Binance), zilele dinainte de mai
  // 2026, alt regim de piață. Seara (21–23), cu modelul sub 15 % și P3c 15–45 %, P3 nou spune 8–10 % și au ieșit 16–20 % (32–51 de rânduri,
  // 19 zile; subgrup găsit după cifre ⇒ nedovedit în nicio direcție). Proba: scripts/proba-v100307-a.mjs (fixture de 7 monede).
  var NIV_G = [0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.975, 0.99];
  var CUANT_G = [   // CUANT_G[h − 1][k] = cuantila NIV_G[k] a lui G_h (întinderea finală relativă / întinderea relativă de până acum)
    [1.5324, 1.796, 2.1039, 2.5616, 2.9437, 3.2775, 3.6027, 3.9421, 4.2549, 4.6013, 4.9299, 5.3328, 5.6908, 6.1031, 6.6024, 7.1817, 7.9066, 8.7291, 9.7157, 11.4316, 14.801, 18.8609, 23.9193],   // 1 oră închisă
    [1.1901, 1.3785, 1.5786, 1.8205, 2.0312, 2.2478, 2.4373, 2.6263, 2.8458, 3.0446, 3.2504, 3.498, 3.7365, 4.0489, 4.3787, 4.7518, 5.1359, 5.6764, 6.3542, 7.4148, 9.5027, 12.155, 15.7183],   // 2 ore închise
    [1.0225, 1.1469, 1.2933, 1.5209, 1.6827, 1.8418, 1.9874, 2.1318, 2.3068, 2.4636, 2.6286, 2.8087, 2.9975, 3.2041, 3.4468, 3.7067, 4.0241, 4.4396, 4.9832, 5.8888, 7.4657, 9.4728, 12.767],   // 3 ore închise
    [1, 1.0587, 1.1784, 1.3527, 1.5095, 1.6225, 1.7433, 1.8554, 1.9874, 2.1196, 2.2563, 2.3983, 2.5556, 2.7252, 2.9301, 3.1323, 3.4115, 3.7636, 4.2153, 4.9047, 6.288, 7.8945, 10.4366],   // 4 ore închise
    [0.986, 1.012, 1.0782, 1.2256, 1.3602, 1.4916, 1.5879, 1.696, 1.8063, 1.9106, 2.0368, 2.1675, 2.3198, 2.4609, 2.6325, 2.8215, 3.0619, 3.351, 3.7362, 4.3284, 5.4269, 6.8158, 9.0453],   // 5 ore închise
    [0.9822, 0.9992, 1.0262, 1.1423, 1.2487, 1.3514, 1.4624, 1.5526, 1.6396, 1.7449, 1.8415, 1.9508, 2.0752, 2.2186, 2.3562, 2.5403, 2.7373, 2.9777, 3.3142, 3.8279, 4.7877, 6.0697, 7.9956],   // 6 ore închise
    [0.9772, 0.9941, 1.0133, 1.0858, 1.1845, 1.2635, 1.3447, 1.4416, 1.5256, 1.6011, 1.6853, 1.781, 1.8843, 2.0095, 2.1495, 2.3051, 2.476, 2.7092, 3.0151, 3.4914, 4.3153, 5.3538, 7.3752],   // 7 ore închise
    [0.9772, 0.9917, 1.0045, 1.0539, 1.1264, 1.208, 1.2795, 1.3573, 1.4349, 1.5127, 1.5862, 1.6723, 1.7639, 1.8715, 1.9944, 2.1436, 2.3085, 2.508, 2.7517, 3.1765, 3.943, 4.8839, 6.8575],   // 8 ore închise
    [0.9726, 0.9887, 0.9992, 1.0222, 1.0745, 1.1439, 1.2103, 1.275, 1.3506, 1.4249, 1.4984, 1.5671, 1.6532, 1.7415, 1.8476, 1.9766, 2.1245, 2.2996, 2.5608, 2.9406, 3.6847, 4.5466, 6.0175],   // 9 ore închise
    [0.9733, 0.9855, 0.9954, 1.0101, 1.0433, 1.0973, 1.1622, 1.2185, 1.2817, 1.3543, 1.4237, 1.4968, 1.5656, 1.6542, 1.751, 1.857, 1.9934, 2.1678, 2.4259, 2.7445, 3.4299, 4.2425, 5.4079],   // 10 ore închise
    [0.9691, 0.981, 0.9908, 1.0031, 1.0221, 1.0644, 1.1224, 1.179, 1.2351, 1.2953, 1.3647, 1.4328, 1.51, 1.5848, 1.6714, 1.7724, 1.891, 2.0535, 2.2717, 2.6011, 3.2202, 3.9063, 4.9942],   // 11 ore închise
    [0.9691, 0.9834, 0.9922, 1.0022, 1.0153, 1.0438, 1.0871, 1.1418, 1.1954, 1.2538, 1.3135, 1.3734, 1.4391, 1.5162, 1.5845, 1.6831, 1.7966, 1.9375, 2.131, 2.4307, 3.0102, 3.6999, 4.6853],   // 12 ore închise
    [0.9663, 0.9812, 0.9909, 1.0005, 1.0093, 1.0239, 1.0511, 1.0953, 1.1443, 1.1957, 1.2508, 1.3051, 1.3653, 1.4327, 1.5079, 1.5829, 1.691, 1.8289, 1.9986, 2.2625, 2.7908, 3.3535, 4.2367],   // 13 ore închise
    [0.9609, 0.9781, 0.9876, 0.9972, 1.0035, 1.0116, 1.0237, 1.045, 1.084, 1.127, 1.1713, 1.2204, 1.2763, 1.336, 1.4032, 1.4798, 1.5669, 1.6646, 1.828, 2.058, 2.4757, 3.0552, 3.7155],   // 14 ore închise
    [0.9648, 0.9788, 0.9865, 0.9941, 0.9996, 1.0042, 1.0104, 1.0208, 1.039, 1.0711, 1.1111, 1.1499, 1.1974, 1.2525, 1.3121, 1.3733, 1.4515, 1.55, 1.6639, 1.8466, 2.167, 2.5443, 3.2468],   // 15 ore închise
    [0.964, 0.9772, 0.9852, 0.993, 0.9976, 1.0014, 1.0054, 1.0102, 1.0168, 1.0306, 1.0548, 1.0908, 1.1287, 1.1684, 1.2158, 1.2785, 1.3368, 1.4159, 1.5239, 1.6659, 1.9392, 2.211, 2.7514],   // 16 ore închise
    [0.9619, 0.9754, 0.9844, 0.9917, 0.9959, 0.9991, 1.0019, 1.0053, 1.0098, 1.0158, 1.0245, 1.0417, 1.0731, 1.1123, 1.1531, 1.2012, 1.2698, 1.3338, 1.4241, 1.5615, 1.8027, 2.074, 2.4128],   // 17 ore închise
    [0.9556, 0.973, 0.9828, 0.9909, 0.9949, 0.998, 1.0005, 1.0031, 1.006, 1.0102, 1.0156, 1.0223, 1.0375, 1.0646, 1.1035, 1.1435, 1.1953, 1.2684, 1.3535, 1.4845, 1.6999, 1.9385, 2.2678],   // 18 ore închise
    [0.9592, 0.9721, 0.9824, 0.9895, 0.9933, 0.9963, 0.9987, 1.0009, 1.0033, 1.0058, 1.009, 1.0135, 1.0202, 1.0338, 1.0618, 1.1035, 1.1519, 1.2107, 1.2913, 1.4062, 1.6119, 1.8094, 2.1124],   // 19 ore închise
    [0.9589, 0.9721, 0.981, 0.9878, 0.992, 0.9949, 0.9971, 0.999, 1.0009, 1.0029, 1.0051, 1.0078, 1.0116, 1.0173, 1.0304, 1.0609, 1.1068, 1.158, 1.2243, 1.3166, 1.5009, 1.6965, 2.0047],   // 20 ore închise
    [0.966, 0.9771, 0.9838, 0.9902, 0.9935, 0.9958, 0.9978, 0.9995, 1.0007, 1.0024, 1.0042, 1.0064, 1.0089, 1.0129, 1.0198, 1.0365, 1.0718, 1.1213, 1.1818, 1.2611, 1.4115, 1.5857, 1.8566],   // 21 ore închise
    [0.9701, 0.9803, 0.9859, 0.9907, 0.9933, 0.9953, 0.9971, 0.9985, 0.9998, 1.0009, 1.0022, 1.0034, 1.0048, 1.0066, 1.0091, 1.0133, 1.0202, 1.0366, 1.0809, 1.1491, 1.258, 1.3933, 1.6203],   // 22 ore închise
    [0.9785, 0.9846, 0.9885, 0.9921, 0.9942, 0.9959, 0.9969, 0.9978, 0.9986, 0.9993, 1, 1.0005, 1.0014, 1.0022, 1.0032, 1.0045, 1.0062, 1.0089, 1.0146, 1.0381, 1.1075, 1.1943, 1.3133]   // 23 ore închise
  ];
  var BLOC_P3Z = [[1, 4], [5, 8], [9, 12], [13, 16], [17, 20], [21, 23]];
  var COEF_P3Z = [[-0.0036, 0.6241, 0.3867], [-0.0117, 0.6093, 0.5285], [-0.0322, 0.5589, 0.612], [-0.0594, 0.4893, 0.7181], [-0.1475, 0.5003, 0.8007], [-0.0244, 0.5085, 0.9607]];   // pe bloc: a, b (logit P3 model), c (logit P3c)
  var LIM_P3Z = 0.005;
  // „din 100 de zile ca azi la ora asta, N au ieșit așa”: frecvența MĂSURATĂ pe zilele NEVĂZUTE (de la 25.08), pe (blocul de ore, zecimea de
  // P3 nou); null = celula are sub 200 de zile-monedă ⇒ se spune zecimea pe toate orele (IESIT_P3Z_TOATE) și textul o spune
  var IESIT_P3Z = [
    [0.08, 0.13, 0.19, 0.33, 0.43, 0.54, 0.65, 0.79, 0.89, 0.96],   // orele 1–4
    [0.05, 0.12, 0.26, 0.36, 0.45, 0.54, 0.66, 0.81, 0.89, 0.97],   // orele 5–8
    [0.04, 0.14, 0.32, 0.34, 0.46, 0.55, 0.66, 0.79, 0.89, 0.97],   // orele 9–12
    [0.04, 0.15, 0.25, 0.36, 0.45, 0.58, 0.69, 0.79, 0.88, 0.94],   // orele 13–16
    [0.03, 0.14, 0.24, 0.37, 0.42, 0.5, null, null, null, 0.95],   // orele 17–20
    [0.02, 0.11, 0.23, null, null, null, null, null, null, 0.96]   // orele 21–23
  ];
  var IESIT_P3Z_TOATE = [0.03, 0.13, 0.25, 0.35, 0.44, 0.54, 0.66, 0.8, 0.89, 0.96];
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
  // v100.307 (I-841, încercarea 2): P(G_ore ≥ t) din cuantilele înghețate - repartiția liniară între ele, (0, 0) sub prima, coada
  // (1 − 0,99) · q99 / t peste ultima (G nu are margine de sus)
  function supravietuireG(ore, t) {
    var Q = CUANT_G[Math.min(23, Math.max(1, Math.round(ore))) - 1], P = NIV_G, n = P.length;
    if (!(t > 0)) return 1;
    if (t >= Q[n - 1]) return (1 - P[n - 1]) * Q[n - 1] / t;
    if (t < Q[0]) return 1 - P[0] * t / Q[0];
    for (var k = n - 2; k >= 0; k--) if (t >= Q[k]) return 1 - (Q[k + 1] > Q[k] ? P[k] + (P[k + 1] - P[k]) * (t - Q[k]) / (Q[k + 1] - Q[k]) : P[k + 1]);
    return 1;
  }
  function blocP3Z(ore) { for (var i = 0; i < BLOC_P3Z.length; i++) if (ore <= BLOC_P3Z[i][1]) return i; return BLOC_P3Z.length - 1; }
  function logitP3Z(p) { var q = Math.min(1 - LIM_P3Z, Math.max(LIM_P3Z, p)); return Math.log(q / (1 - q)); }
  // P3 nou = σ(a + b · logit(P3 model) + c · logit(P3c)), coeficienții blocului de ore
  function combinaP3Z(ore, p3m, p3z) { var w = COEF_P3Z[blocP3Z(ore)]; return sigm(w[0] + w[1] * logitP3Z(p3m) + w[2] * logitP3Z(p3z)); }
  function iesitP3Z(ore, p) { var z = Math.min(9, Math.max(0, Math.floor(p * 10))), v = IESIT_P3Z[blocP3Z(ore)][z]; return v == null ? IESIT_P3Z_TOATE[z] : v; }
  function iesitPeToateOrele(ore, p) { return IESIT_P3Z[blocP3Z(ore)][Math.min(9, Math.max(0, Math.floor(p * 10)))] == null; }

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
    // v100.307 (I-841): cu ziua în curs și fără „deja”, P3 se condiționează de ziua făcută (ipoteza, încercările, măsurătoarea și verificarea
    // pe zile nevăzute: sus, la CUANT_G). oreZi = orele UTC ale zilei acoperite de barele închise (ora ultimei bare + 1); pragul lui G =
    // r1 / panaAcum. „deja” rămâne P3 = 1; la 00:00 UTC (nicio bară de azi, proba A pre-înregistrată) P3 = modelul, neatins.
    var oreZi = azi.nb ? Math.min(23, Math.floor((azi.bare[azi.bare.length - 1].t % ZI) / ORA) + 1) : 0;
    var p3Ziua = null, p3Cond = null;
    if (azi.nb > 0 && !deja) { p3Ziua = supravietuireG(oreZi, panaAcum > 0 ? r1 / panaAcum : Infinity); p3Cond = combinaP3Z(oreZi, p3, p3Ziua); if (!isFinite(p3Cond)) { p3Ziua = null; p3Cond = null; } }
    return {
      ziAzi: ziAzi, pret: c, pdh: ieri.hi, pdl: ieri.lo, pdc: ieri.cl, r1: r1, r2: r2, media10: media10, comp: comp, p3: deja ? 1 : p3Cond !== null ? p3Cond : p3, p3Model: p3, dejaMaiMult: deja, maiMultCaIeri: cls.maiMult,
      p3Ziua: p3Ziua, p3CuZiua: p3Cond, cuZiua: p3Cond !== null, oreZi: oreZi, iesitCuZiua: p3Cond !== null ? iesitP3Z(oreZi, p3Cond) : null, iesitToateOrele: p3Cond !== null && iesitPeToateOrele(oreZi, p3Cond),
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

  // trade-ul zilei: doar ce e DOVEDIT; altfel spune ce NU faci și de ce. v100.307 (revizia I-841, 🟡 3): A și B se judecă pe P3-ul de la
  // 00:00 UTC (p3Model), cum au fost probate - nu pe P3 condiționat de ziua făcută
  function trade(d) {
    if (!d || d.eroare) return { fel: "eroare", text: d && d.eroare || "fără date" };
    var dov = Object.keys(PROBA).filter(function (k) { return PROBA[k].dovedit; });
    var cand = [];
    if (PROBA.A.dovedit && d.p3Model >= 0.70) cand.push("A");
    if (PROBA.B.dovedit && d.p3Model <= 0.45) cand.push("B");
    if (PROBA.C.dovedit && ((d.p1Sus.p >= 0.70 && d.p1Sus.dist >= 0.003) || (d.p1Jos.p >= 0.70 && d.p1Jos.dist >= 0.003))) cand.push("C");
    if (cand.length) return { fel: cand[0], text: PROBA[cand[0]].nume + ": " + PROBA[cand[0]].regula, cifra: PROBA[cand[0]].cifra };
    if (!dov.length) return { fel: "niciunul", text: "Niciun trade cu avantaj dovedit pe datele tale. Spargerea, gridul de o zi și ținta la nivelul de ieri au pierdut după cost pe 2 ani (proba din 03.11.2026)." };
    return { fel: "niciunul", text: "Azi nu se îndeplinește condiția niciunui trade dovedit (" + dov.map(function (k) { return PROBA[k].nume; }).join(", ") + ")." };
  }

  return { azi: azi, zile: zile, trade: trade, grid: grid, clasa: clasa, CALIB: CALIB, PROBA: PROBA, COEF_P3: COEF_P3, COEF_P1: COEF_P1, sigm: sigm, CURBA_F: CURBA_F, FACTOR_WEEKEND: FACTOR_WEEKEND, FACTOR_LUCRATOARE: FACTOR_LUCRATOARE,
    BANDA_K: BANDA_K, BANDA_ACOPERIRE: BANDA_ACOPERIRE,
    NIV_G: NIV_G, CUANT_G: CUANT_G, BLOC_P3Z: BLOC_P3Z, COEF_P3Z: COEF_P3Z, IESIT_P3Z: IESIT_P3Z, IESIT_P3Z_TOATE: IESIT_P3Z_TOATE, supravietuireG: supravietuireG, combinaP3Z: combinaP3Z, iesitP3Z: iesitP3Z };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TradeZilei;
