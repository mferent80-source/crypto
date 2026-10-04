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
  // v100.93 (arborii, a treia părere 🌳): aceleași rânduri cu amândouă familiile - rețeaua dovedită, arborii pe toate stările (+ „față de 🧠”
  // în subsol, pe plus și pe minus); direcția cu amândouă nedovedite („cât dat cu banul” o singură dată); doar arborii (rețeaua lipsă);
  // capul cu amândouă (arborii vechi / amândouă vechi); poarta pe două rânduri
  const RA = { la: ACUM, v: R.VERSIUNE_ARBORI, p: { cursa: 0.26, "iese-jos-24": 0.24, "iese-sus-24": 0.17, "iese-jos-72": 0.47, "iese-sus-72": 0.33, lichidare: 0.04, "liniste-24": 0.58, "liniste-48": 0.42, "directie-24": 0.49 }, pornire: { p: 0.39, rata: 0.524, n: 431 } };
  const reper = (t) => (t === "rezultat" ? "rata pe monedă" : t === "directie" ? "50%" : "🎲");
  const modeleDe = (ver, v, vs) => { const m = {}; for (const t of Object.keys(R.TINTE)) m[t] = { tinta: t, versiune: ver, la: ACUM - 3600000, verificare: v && { ...v, reper: reper(t), ...(vs ? { vsRetea: vs } : {}) } }; return m; };
  const mR = modeleDe(R.VERSIUNE, { ...v0, ...bun }), PZ = { p: 0.41, rata: 0.524, n: 431 };
  for (const [sit, v] of Object.entries(VER)) {
    const ma = modeleDe(R.VERSIUNE_ARBORI, v, sit === "dovedită" ? { n: 300, bss: 0.012, ic: [0.003, 0.021] } : { n: 300, bss: -0.008, ic: [-0.02, 0.004] });
    R.randuri(mR, RT, ZAR, { acum: ACUM, pornire: PZ }, { modele: ma, rt: RA }).forEach((r) => pune("arborii: " + sit + " · " + r.cod, "retea", "arbori.randuri", r, [["titlu", "detalii"], ["text", "deCe"]]));
    R.subsol(mR, ma).filter((l) => /^🌳/.test(l)).forEach((l, i) => pune("arborii: " + sit + " · verificarea " + (i + 1), "retea", "arbori.subsol", { t: l }, [["t", "raport"]]));
    R.textPornire(PZ, R.verdict(mR.rezultat, ACUM), { p: 0.39, rata: 0.524 }, R.verdictArbori(ma.rezultat, ACUM)).split("\n").forEach((l, i) => pune("arborii: " + sit + " · poarta " + (i + 1), "retea", "arbori.textPornire", { t: l }, [["t", "deCe"]]));
  }
  const maBun = modeleDe(R.VERSIUNE_ARBORI, { ...v0, ...bun }, { n: 300, bss: 0.012, ic: [0.003, 0.021] });
  R.randuri(modeleDe(R.VERSIUNE, VER["formula simplă"]), RT, ZAR, { acum: ACUM, pornire: PZ }, { modele: modeleDe(R.VERSIUNE_ARBORI, v0), rt: RA }).forEach((r) => pune("arborii: amândouă nedovedite · " + r.cod, "retea", "arbori.randuri", r, [["titlu", "detalii"], ["text", "deCe"]]));
  R.randuri(null, null, ZAR, { acum: ACUM }, { modele: maBun, rt: RA }).forEach((r) => pune("arborii: fără rețea · " + r.cod, "retea", "arbori.randuri", r, [["titlu", "detalii"], ["text", "deCe"]]));
  const a1 = { directie: { tinta: "directie", versiune: R.VERSIUNE_ARBORI, la: ACUM - 3600000, verificare: null } }, a3 = { directie: { ...a1.directie, la: ACUM - 3 * 864e5 } };
  pune("arborii: capul", "retea", "arbori.antet", R.antet(m1, ACUM, a1), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("arborii: capul, arborii vechi", "retea", "arbori.antet", R.antet(m1, ACUM, a3), [["titlu", "titlu"], ["sub", "deCe"]]);
  pune("arborii: capul, amândouă vechi", "retea", "arbori.antet", R.antet(m3, ACUM, a3), [["titlu", "titlu"], ["sub", "deCe"]]);
}
