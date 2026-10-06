// Garda textelor, grupul „retea” (rețeaua neuronală, livrarea 1): rândurile 🧠 (Retea.randuri), capul (Retea.antet), „Cum s-a verificat”
// (Retea.subsol) și rândul de la poartă (Retea.textPornire) - cu modulul REAL, pe toate formele verdictului: dovedită (zile / 3 zile /
// săptămâni / 2 zile), prea puține cazuri, nu bate 🎲 / rata pe monedă / 50%, formula simplă, ultimele 3 luni, log-loss, în lucru,
// neverificată, modelul vechi.
export function situatiiRetea(pune) {
  const R = globalThis.Retea, ACUM = Date.UTC(2026, 9, 4, 12);
  const v0 = { luni: 11, luniGata: 11, nIndep: 312, reper: "🎲", brier: 0.1834, brierReper: 0.1801, brierLog: 0.1822, ic: [-0.0412, 0.0123], icLog: [-0.02, 0.01], bss3: -0.004, logloss: 0.5412, loglossReper: 0.5388, loglossLog: 0.54 };
  const bun = { ic: [0.012, 0.081], icLog: [0.004, 0.03], bss3: 0.02, brier: 0.17, logloss: 0.52, loglossLog: 0.53 };
  const VER = { "dovedită": { ...v0, ...bun }, "nu bate reperul": v0, "prea puține cazuri": { ...v0, nIndep: 48 }, "formula simplă": { ...v0, ic: [0.01, 0.05] },
    "ultimele 3 luni": { ...v0, ...bun, bss3: -0.03 }, "log-loss": { ...v0, ...bun, logloss: 0.55 }, "în lucru": { ...v0, luniGata: 6 }, "neverificată": null };
  const ZAR = [{ cod: "cursa", titlu: "Ținta planului (0.4211) înaintea stopului (0.3518), în 7 zile", p: 0.31 }, { cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.18 },
    { cod: "iese-sus-24", titlu: "Atinge marginea de sus (0.4012) în 24 h", p: 0.22 }, { cod: "iese-jos-72", titlu: "Atinge marginea de jos în 3 zile", p: 0.41 }, { cod: "iese-sus-72", titlu: "Atinge marginea de sus în 3 zile", p: 0.38 },
    { cod: "lichidare", titlu: "Atinge lichidarea (0.2104) în 7 zile", p: 0.02 }, { cod: "liniste-24", titlu: "Liniștea mai ține o zi", p: 0.64 }, { cod: "liniste-48", titlu: "Liniștea mai ține două zile", p: 0.47 }];
  const RT = { la: ACUM, v: R.VERSIUNE, p: { cursa: 0.28, "iese-jos-24": 0.21, "iese-sus-24": 0.19, "iese-jos-72": 0.44, "iese-sus-72": 0.35, lichidare: 0.03, "liniste-24": 0.6, "liniste-48": 0.45, "directie-24": 0.51 } };
  for (const [sit, v] of Object.entries(VER)) {
    const modele = {};
    for (const t of Object.keys(R.TINTE)) modele[t] = { tinta: t, versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: v && { ...v, reper: t === "rezultat" ? "rata pe monedă" : t === "directie" ? "50%" : "🎲" } };
    R.randuri(modele, RT, ZAR, { acum: ACUM, pornire: { p: 0.41, rata: 0.524, n: 431 } }).forEach((r) => pune("rețeaua: " + sit + " · " + r.cod, "retea", "randuri", r, [["titlu", "detalii"], ["text", "deCe"]]));
    R.subsol(modele).forEach((l, i) => pune("rețeaua: " + sit + " · verificarea " + (i + 1), "retea", "subsol", { t: l }, [["t", "raport"]]));
    pune("rețeaua: " + sit + " · poarta", "retea", "textPornire", { t: R.textPornire({ p: 0.41, rata: 0.524 }, R.verdict(modele.rezultat, ACUM)) }, [["t", "deCe"]]);
  }
  const m1 = { directie: { tinta: "directie", versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: null } }, m3 = { directie: { ...m1.directie, la: ACUM - 3 * 864e5 } };
  pune("rețeaua: capul", "retea", "antet", R.antet(m1, ACUM), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("rețeaua: capul, modelul vechi", "retea", "antet", R.antet(m3, ACUM), [["titlu", "titlu"], ["sub", "deCe"]]);
  // v100.95 (ideea 1): rândul Busolei din „Cum s-a verificat” (Retea.textBusola, pus primul de subsol) - nimic judecat, prea puține, bate /
  // mai prost / n-am aflat, fără cifre; fiecare și cu bilanțul vechi de 3 zile
  // revizia 04.10 (🟡2/🟡5/🔵6): și „prea puține monede”, Radarul trimite 7 / 1 / nimic, cifre de 5 cifre, bilanțul vechi de 20 de zile („de”)
  const BB = { judecate: 240, independente: 131, brier: 0.2101, brierBaza: 0.2402, castig: 0.125, icJos: 0.02, icSus: 0.2, verdict: "bate rata de bază" };
  const ZERO = { ...BB, judecate: 0, independente: 0, brier: null, brierBaza: null, verdict: "prea puține" }, GREU = { ...BB, judecate: 12345, independente: 10123 };
  const BUS = { "nimic judecat (KV vechi)": [ZERO], "nimic judecat, Radarul trimite 7": [ZERO, 7], "nimic judecat, Radarul trimite 1": [ZERO, 1], "nimic judecat, Radarul nu trimite": [ZERO, 0],
    "prea puține": [{ ...BB, judecate: 12, independente: 9, verdict: "prea puține" }], "prea puține monede": [{ ...BB, verdict: "prea puține" }],
    "bate rata de bază": [BB], "mai prost": [{ ...BB, verdict: "mai prost" }], "n-am aflat": [{ ...BB, verdict: "n-am aflat" }], "fără cifre": [{ ...BB, brier: null, brierBaza: null, verdict: "n-am aflat" }],
    "cifre mari": [GREU], "cifre mari, mai prost": [{ ...GREU, verdict: "mai prost" }], "cifre mari, n-am aflat": [{ ...GREU, verdict: "n-am aflat" }], "cifre mari, prea puține monede": [{ ...GREU, verdict: "prea puține" }] };
  // v100.96 (🔵7 + ideea 1): textBusola dă 1–2 rânduri; și cu `simboluri`/`asteptare` (Busola 1.43.0), și fără (bilanț vechi)
  BUS["cu monede și așteptare"] = [{ ...BB, simboluri: 12, asteptare: 7 }, 2]; BUS["cifre mari, cu monede și așteptare"] = [{ ...GREU, simboluri: 12, asteptare: 123 }, 12];
  BUS["prea puține monede (9, cere 10)"] = [{ ...BB, verdict: "prea puține", simboluri: 9 }]; BUS["o predicție, o monedă"] = [{ ...BB, judecate: 1, independente: 1, simboluri: 1, asteptare: 1 }, 1];
  BUS["nimic judecat, 17 în așteptare, Radarul nu trimite"] = [{ ...ZERO, asteptare: 17 }, 0]; BUS["nimic judecat, 7 în așteptare, Radarul trimite 2"] = [{ ...ZERO, asteptare: 7 }, 2];
  for (const [sit, [r, tr]] of Object.entries(BUS)) {
    R.textBusola({ la: ACUM - 3600000, retea: r, trimise: tr }, ACUM).forEach((l, i) => pune("busola: " + sit + " · rândul " + (i + 1), "retea", "subsol", { t: l }, [["t", "raport"]]));
    R.textBusola({ la: ACUM - 20 * 864e5, retea: r, trimise: tr }, ACUM).forEach((l, i) => pune("busola: " + sit + ", bilanț vechi · rândul " + (i + 1), "retea", "subsol", { t: l }, [["t", "raport"]]));
  }
  // v100.93 (arborii, a treia părere 🌳): aceleași rânduri cu amândouă familiile - rețeaua dovedită, arborii pe toate stările (+ „față de 🧠”
  // în subsol, pe plus și pe minus); direcția cu amândouă nedovedite („cât dat cu banul” o singură dată); doar arborii (rețeaua lipsă);
  // capul cu amândouă (arborii vechi / amândouă vechi); poarta pe două rânduri
  const RA = { la: ACUM, v: R.VERSIUNE_ARBORI, p: { cursa: 0.26, "iese-jos-24": 0.24, "iese-sus-24": 0.17, "iese-jos-72": 0.47, "iese-sus-72": 0.33, lichidare: 0.04, "liniste-24": 0.58, "liniste-48": 0.42, "directie-24": 0.49 }, pornire: { p: 0.39, rata: 0.524, n: 431 } };
  const reper = (t) => (t === "rezultat" ? "rata pe monedă" : t === "directie" ? "50%" : "🎲");
  const modeleDe = (ver, v, vs) => { const m = {}; for (const t of Object.keys(R.TINTE)) m[t] = { tinta: t, versiune: ver, la: ACUM - 3600000, verificare: v && { ...v, reper: reper(t), ...(vs ? { vsRetea: vs } : {}) } }; return m; };
  const mR = modeleDe(R.VERSIUNE, { ...v0, ...bun }), PZ = { p: 0.41, rata: 0.524, n: 431 };
  // revizia 04.10 (🟡4): rândul cu amândouă familiile are două linii (cifrele, stările) - fiecare se judecă singură, ca pe pagină
  const puneRand = (nume, r) => String(r.text).split("\n").forEach((l, i) => pune(nume + (i ? " · rândul " + (i + 1) : ""), "retea", "arbori.randuri", { ...r, text: l }, [["titlu", "detalii"], ["text", "deCe"]]));
  for (const [sit, v] of Object.entries(VER)) {
    const ma = modeleDe(R.VERSIUNE_ARBORI, v, sit === "dovedită" ? { n: 300, bss: 0.012, ic: [0.003, 0.021] } : { n: 300, bss: -0.008, ic: [-0.02, 0.004] });
    R.randuri(mR, RT, ZAR, { acum: ACUM, pornire: PZ }, { modele: ma, rt: RA }).forEach((r) => puneRand("arborii: " + sit + " · " + r.cod, r));
    // v100.96 (el: „scoate modelele în evidență”): rezumatul permanent de lângă verdict (Tablou/fișă), long și short, cu și fără arbori
    for (const dir of ["long", "short", "neutru"]) { pune("rezumat: " + sit + " · " + dir, "retea", "rezumat", { t: R.rezumat(mR, RT, ZAR, { acum: ACUM, dir }, { modele: ma, rt: RA }) }, [["t", "raport"]]); pune("rezumat: " + sit + " · " + dir + ", doar rețeaua", "retea", "rezumat", { t: R.rezumat(mR, RT, ZAR, { acum: ACUM, dir }, null) }, [["t", "raport"]]); }
    /* revizia 🟡2/🔵7: lichidarea cu starea ei (marginea dovedită, lichidarea nu) și rândul fără margine (în afara grilei), doar cu lichidarea */
    pune("rezumat: " + sit + " · lichidarea nedovedită", "retea", "rezumat", { t: R.rezumat({ ...mR, "atinge-168": { ...mR["atinge-168"], verificare: v0 } }, RT, ZAR, { acum: ACUM, dir: "long" }, { modele: ma, rt: RA }) }, [["t", "raport"]]);
    pune("rezumat: " + sit + " · fără margine", "retea", "rezumat", { t: R.rezumat(mR, { ...RT, p: { lichidare: RT.p.lichidare } }, ZAR, { acum: ACUM, dir: "long" }, { modele: ma, rt: { ...RA, p: { lichidare: RA.p.lichidare } } }) }, [["t", "raport"]]);
    R.subsol(mR, ma).filter((l) => /^🌳/.test(l)).forEach((l, i) => pune("arborii: " + sit + " · verificarea " + (i + 1), "retea", "arbori.subsol", { t: l }, [["t", "raport"]]));
    R.textPornire(PZ, R.verdict(mR.rezultat, ACUM), { p: 0.39, rata: 0.524 }, R.verdictArbori(ma.rezultat, ACUM)).split("\n").forEach((l, i) => pune("arborii: " + sit + " · poarta " + (i + 1), "retea", "arbori.textPornire", { t: l }, [["t", "deCe"]]));
  }
  const maBun = modeleDe(R.VERSIUNE_ARBORI, { ...v0, ...bun }, { n: 300, bss: 0.012, ic: [0.003, 0.021] });
  R.randuri(modeleDe(R.VERSIUNE, VER["formula simplă"]), RT, ZAR, { acum: ACUM, pornire: PZ }, { modele: modeleDe(R.VERSIUNE_ARBORI, v0), rt: RA }).forEach((r) => puneRand("arborii: amândouă nedovedite · " + r.cod, r));
  R.randuri(modeleDe(R.VERSIUNE, v0), RT, ZAR, { acum: ACUM, pornire: PZ }, { modele: modeleDe(R.VERSIUNE_ARBORI, v0), rt: RA }).forEach((r) => puneRand("arborii: amândouă nu bat reperul · " + r.cod, r));   /* revizia 04.10 (🟡4): rezultatul = 166 pe un rând */
  R.randuri(null, null, ZAR, { acum: ACUM }, { modele: maBun, rt: RA }).forEach((r) => puneRand("arborii: fără rețea · " + r.cod, r));
  const a1 = { directie: { tinta: "directie", versiune: R.VERSIUNE_ARBORI, la: ACUM - 3600000, verificare: null } }, a3 = { directie: { ...a1.directie, la: ACUM - 3 * 864e5 } };
  pune("arborii: capul", "retea", "arbori.antet", R.antet(m1, ACUM, a1), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("arborii: capul, arborii vechi", "retea", "arbori.antet", R.antet(m1, ACUM, a3), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("arborii: capul, amândouă vechi", "retea", "arbori.antet", R.antet(m3, ACUM, a3), [["titlu", "titlu"], ["sub", "deCe"]]);
  // v100.94 (L2, acțiunile T212): aceleași rânduri pe cele 5 ținte T212 - codurile 🎲 de pe acțiuni (stop1, sare1, cursa5), direcția pe 5 zile (directie5),
  // „un trade ca ăsta pe plus” (rezultat-t212, reperul „rata pe acțiune”) - rețeaua dovedită, arborii pe toate stările; + rândurile 🌳 T212 din subsol
  const T212 = ["stop1-t212", "sare1-t212", "cursa5-t212", "directie-t212", "rezultat-t212"], reperT = (t) => (t === "rezultat-t212" ? "rata pe acțiune" : t === "directie-t212" ? "50%" : "🎲");
  const modeleT = (ver, v, vs) => { const m = {}; for (const t of T212) m[t] = { tinta: t, versiune: ver, la: ACUM - 3600000, verificare: v && { ...v, reper: reperT(t), ...(vs ? { vsRetea: vs } : {}) } }; return m; };
  const ZAR_T = [{ cod: "stop1", titlu: "Șansa să atingă stopul mâine", p: 0.11 }, { cod: "cursa5", titlu: "Șansa ca ținta să vină înaintea stopului în 5 zile de bursă", p: 0.42 }, { cod: "sare1", titlu: "Șansa ca bursa să deschidă sub stop", p: 0.02 }];
  const RT_T = { la: ACUM, v: R.VERSIUNE, p: { stop1: 0.12, cursa5: 0.4, sare1: 0.03, directie5: 0.52 }, pornire: { p: 0.57, rata: 0.504, n: 1066 } }, RA_T = { la: ACUM, v: R.VERSIUNE_ARBORI, p: { stop1: 0.15, cursa5: 0.38, sare1: 0.02, directie5: 0.5 }, pornire: { p: 0.6, rata: 0.504, n: 1066 } };
  const mRT = modeleT(R.VERSIUNE, { ...v0, ...bun }), OT = { acum: ACUM, codDirectie: "directie5", tintaRezultat: "rezultat-t212", pornire: RT_T.pornire };
  for (const [sit, v] of Object.entries(VER)) {
    const ma = modeleT(R.VERSIUNE_ARBORI, v, sit === "dovedită" ? { n: 300, bss: 0.012, ic: [0.003, 0.021] } : { n: 300, bss: -0.008, ic: [-0.02, 0.004] });
    R.randuri(mRT, RT_T, ZAR_T, OT, { modele: ma, rt: RA_T }).forEach((r) => puneRand("acțiuni: " + sit + " · " + r.cod, r));
    // v100.96: rândul poziției T212 (scurt) + poarta cu costul în afara perechilor lui (ideea 4)
    pune("rezumat: acțiuni " + sit, "retea", "rezumat", { t: R.rezumat(mRT, RT_T, null, { acum: ACUM, cod: "directie5", scurt: true }, { modele: ma, rt: RA_T }) }, [["t", "raport"]]);
    R.randuri(mRT, RT_T, ZAR_T, { ...OT, pornire: { ...OT.pornire, inPlaja: false } }, { modele: ma, rt: RA_T }).filter((r) => r.cod === "rezultat-t212").forEach((r) => puneRand("acțiuni: " + sit + " · cost în afara plajei", r));
    R.subsol(mRT, ma, { actiuni: true }).filter((l) => /^🌳/.test(l)).forEach((l, i) => pune("acțiuni: " + sit + " · verificarea " + (i + 1), "retea", "arbori.subsol", { t: l }, [["t", "raport"]]));   /* revizia 🔵8: subsolul pe piața paginii */
  }
  R.randuri(modeleT(R.VERSIUNE, v0), RT_T, ZAR_T, OT, { modele: modeleT(R.VERSIUNE_ARBORI, v0), rt: RA_T }).forEach((r) => puneRand("acțiuni: amândouă nu bat reperul · " + r.cod, r));
  R.randuri(mRT, RT_T, ZAR_T, OT).forEach((r) => puneRand("acțiuni: doar rețeaua · " + r.cod, r));
}
