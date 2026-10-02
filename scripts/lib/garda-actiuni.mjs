// Garda textelor, grupul „actiuni” (specul „sfaturi concise”, pachetul 4): genereaza textele sfaturilor pe actiuni cu modulele
// adevarate - ActiuniSemnale (semaforul pozitiei, poarta, portofoliul, situatiile, greselile, alertele planului, frana, raportul,
// stopul care urca), Consilier (piata, sfaturile pe pozitie si pe bot, rezumatul de dimineata, socoteala), Probabilitati (randurile 🎲).
// t212-ecran.js (HTML, cere DOM) se verifica prin sursa, in proba pachetului.
const ZI = 86400000, ORA = 3600000, T0 = Date.UTC(2026, 9, 1, 16, 0);
const zilnice = (n, f, de) => { const b = []; for (let i = 0; i < n; i++) { const c = f(i); b.push({ t: (de || T0 - n * ZI) + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); } return b; };
const fara = (s) => String(s || "").replace(/^👉\s*(Ce aș face eu:\s*)?/, "");   // „👉 Ce aș face eu: ” e eticheta (o taie consiliu.js, lista si poza); garda verifica actiunea de dupa ea

export function situatiiActiuni(pune) {
  const AS = globalThis.ActiuniSemnale, CS = globalThis.Consilier, PB = globalThis.Probabilitati;
  const urca = zilnice(300, (i) => 20 * Math.pow(1.002, i) * (1 + 0.004 * Math.sin(i)));
  const coboara = zilnice(300, (i) => 40 * Math.pow(0.998, i) * (1 + 0.004 * Math.sin(i)));
  const lateral = zilnice(300, (i) => 30 * (1 + 0.01 * Math.sin(i / 3)));
  const miscareJos = lateral.slice(0, 295).concat(zilnice(5, (i) => 30 * (1 - 0.06 * (i + 1)), T0 - 5 * ZI));
  const sem = (sit, p, bare) => {
    const r = AS.semafor(p, bare ? AS.stare(bare, p.pret) : null);
    (r.motive || []).forEach((m, i) => pune(sit, "actiuni", "semafor.motiv" + (i + 1), { t: m }, [["t", "titlu"]]));
    pune(sit, "actiuni", "semafor.ceAsFace", { t: fara(r.ceAsFace) }, [["t", "faCe"]]);
    return r;
  };
  const P = (o) => Object.assign({ simbol: "APLD", ticker: "APLD_US_EQ", qty: 40, pretMediu: 29.5, pret: 29, plan: {} }, o || {});
  sem("semafor: stopul din plan atins", P({ pret: 25.2, plan: { stop: 26 } }), urca);
  sem("semafor: −15% de la maxim, din plan", P({ pret: 29, maxDupaCumparare: 35, plan: { trailPct: 15 } }), urca);
  sem("semafor: ținta din plan atinsă", P({ pret: 31.2, plan: { tinta: 31 } }), urca);
  sem("semafor: trend în jos și pe minus", P({ pretMediu: 30, pret: 25 }), coboara);
  sem("semafor: trend în jos", P({ pretMediu: 28, pret: 29 }), coboara);
  sem("semafor: trend în sus, fără plan", P({ pretMediu: 22, pret: 36 }), urca);
  sem("semafor: trend în sus, cu plan", P({ pretMediu: 22, pret: 36, plan: { trailPct: 15 } }), urca);
  sem("semafor: mișcare mare în jos", P({ pretMediu: 25, pret: 24 }), miscareJos);
  sem("semafor: −24% fără plan", P({ pretMediu: 29, pret: 22 }), lateral);
  sem("semafor: fără prețuri zilnice", P({ pretMediu: 29, pret: 28 }), zilnice(20, () => 28));
  sem("semafor: fără prețul poziției", P({ pret: 0 }), null);

  // poarta de cumparare
  const po = (sit, o) => (AS.poarta(o).motive || []).forEach((m, i) => pune(sit, "actiuni", "poarta.motiv" + (i + 1), { t: m }, [["t", "rand"]]));
  po("poarta: trend în jos", { stare: AS.stare(coboara, 26), plan: { stop: 20 } });
  po("poarta: lateral, după mișcare, lângă maxim, fără plan, recumpărare", { stare: AS.stare(miscareJos.slice(0, 296), 28.5), plan: {}, vandutPeMinusAcumOre: 5 });
  po("poarta: fără prețuri", { stare: AS.stare(zilnice(10, () => 28), 28) });

  // portofoliul
  const pf = (sit, poz, cash) => pune(sit, "actiuni", "portofoliu.ceAsFace", { t: fara(AS.portofoliu(poz, cash).ceAsFace) }, [["t", "faCe"]]);
  pf("portofoliu: o acțiune peste 20%", [{ simbol: "NVDA", valoare: 9000, beta: 1.7 }, { simbol: "AMD", valoare: 3000, beta: 1.5 }], 8000);
  pf("portofoliu: împărțire ok", [{ simbol: "NVDA", valoare: 3000 }, { simbol: "AMD", valoare: 2500 }, { simbol: "MSFT", valoare: 2000 }], 9000);

  // situatiile asemanatoare (din trade-urile lui), greselile, regulile tale
  const tr = (i, o) => Object.assign({ id: "t" + i, ticker: i % 3 ? "APLD_US_EQ" : "NVDA_US_EQ", simbol: i % 3 ? "APLD" : "NVDA", cost: 1000 + 100 * (i % 7), rezultat: (i % 5 ? 1 : -1) * (20 + i), pct: (i % 5 ? 0.02 : -0.03),
    pornit: T0 - (200 - i) * ZI + (i % 4) * 5 * ORA, inchis: T0 - (195 - i) * ZI, durataOre: 120, comisioane: 3, extCumparare: i % 9 === 0 }, o || {});
  const inchise = Array.from({ length: 90 }, (_, i) => tr(i));
  const cf = {}; inchise.forEach((t, i) => { cf[t.id] = { sit: i % 2 ? "sus|calm|departe" : "jos|dupa-miscare|langa-max", nivel: i % 4 ? "cumpara" : "nu", greseli: i % 5 ? [] : ["dupa-miscare"] }; });
  const ts = (sit, s, tk) => pune(sit, "actiuni", "textSituatie", { t: AS.textSituatie(AS.situatiiCaAsta(inchise, cf, s, tk)) }, [["t", "detalii"]]);   // un rand de date („📊”), ca randurile 🎲
  ts("situații ca asta: multe, cu acțiunea", "sus|calm|departe", "APLD_US_EQ");
  ts("situații ca asta: puține", "jos|dupa-miscare|langa-max", "NVDA_US_EQ");
  ts("situații ca asta: niciunul", "lateral|calm|departe", null);
  Object.keys(AS.TEXT).forEach((k) => pune("greșeala: " + k, "actiuni", "greseli." + k, { t: AS.TEXT[k] }, [["t", "titlu"]]));
  const rp = AS.reguliPersonale(inchise.map((t, i) => Object.assign({}, t, { rezultat: i % 4 === 0 ? -80 : 30 })), "Europe/Bucharest");
  (rp.reguli || []).slice(0, 3).forEach((g, i) => pune("regulile tale: " + g.grupa, "actiuni", "reguliPersonale" + (i + 1), g, [["text", "deCe"]]));

  // alertele planului si frana (Discord)
  const AL = [["titlu", "alertaTitlu"], ["mesaj", "alertaMesaj"]];
  for (const a of AS.alertePlan({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 25.2, maxDupaCumparare: 31, plan: { stop: 26, trailPct: 15 } }, T0)) pune("alerta planului: " + a.cheie.split("-")[2], "actiuni", "alertePlan." + a.cheie.split("-")[2], a, AL);
  for (const a of AS.alertePlan({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 31.4, plan: { tinta: 31 } }, T0)) pune("alerta planului: tinta", "actiuni", "alertePlan.tinta", a, AL);
  pune("frâna: prima cumpărare pe minus", "actiuni", "alertaFrana.1", AS.alertaFrana({ ticker: "NPA_US_EQ", pret: 4.12, mediu: 4.9, sub: -0.159, nr: 1, suma: 2100 }, "NPA"), AL);
  pune("frâna: a treia la rând", "actiuni", "alertaFrana.3", AS.alertaFrana({ ticker: "NPA_US_EQ", pret: 3.8, mediu: 4.9, sub: -0.224, nr: 3, suma: 1500 }, "NPA"), AL);

  // raportul saptamanii (randurile din raportul de duminica)
  const RAP = [["t", "raport"]];
  AS.raportSaptamana([], T0).forEach((l, i) => pune("raportul săptămânii: nimic", "actiuni", "raportSaptamana.gol" + i, { t: l }, RAP));
  AS.raportSaptamana([tr(1, { inchis: T0 - 2 * ZI, rezultat: 120, comisioane: 6 }), tr(2, { inchis: T0 - 3 * ZI, rezultat: -410, pct: -0.24, comisioane: 9, simbol: "INTC" })], T0)
    .forEach((l, i) => pune("raportul săptămânii: cu o pierdere peste 20%", "actiuni", "raportSaptamana.l" + i, { t: l }, RAP));

  // la cumparare (poarta refacuta), nivelurile, stopul care urca
  const lc = AS.laCumparare(tr(3, { pornit: T0 - 10 * ZI, pretCumparare: coboara[289].c, ticker: "APLD_US_EQ" }), coboara, inchise);
  (lc.motive || []).forEach((m, i) => pune("la cumpărare: motivele porții", "actiuni", "laCumparare.motiv" + (i + 1), { t: m }, [["t", "rand"]]));
  pune("la cumpărare: puține prețuri", "actiuni", "laCumparare.faraDate", { t: AS.laCumparare(tr(4, { pornit: T0 - 10 * ZI }), zilnice(30, () => 20), []).motive[0] }, [["t", "rand"]]);
  const nv = AS.niveluri(urca, urca[299].c, { pretMediu: 25, maxDupaCumparare: urca[299].c, minTrail: 0.15 });
  pune("nivelurile: trend sus", "actiuni", "niveluri.intrare", { t: nv.intrare && nv.intrare.motiv }, [["t", "rand"]]);
  pune("nivelurile: stopul care urcă", "actiuni", "niveluri.sursaTrail", { t: nv.sursaTrail }, [["t", "detalii"]]);
  pune("nivelurile: trend jos", "actiuni", "niveluri.intrareMotiv", { t: AS.niveluri(coboara, coboara[299].c, {}).intrareMotiv }, [["t", "rand"]]);
  pune("nivelurile: puține prețuri", "actiuni", "niveluri.faraDate", { t: AS.niveluri(zilnice(50, () => 20), 20, {}).motiv }, [["t", "rand"]]);
  const cfU = (n, prof) => { const c = {}; for (let i = 0; i < n; i++) c["u" + i] = { nivel: "cumpara", stopU: prof === null ? { u15: { pct: -0.1 } } : { u15: { pct: -0.1 }, prof: { pct: prof } } }; return c; };
  const inU = (n) => Array.from({ length: n }, (_, i) => ({ id: "u" + i, cost: 1000, rezultat: 10 }));
  pune("stopul care urcă: rejucarea în curs", "actiuni", "alegeTrail.inCurs", { t: AS.alegeTrail(inU(12), cfU(12, null)).motiv }, [["t", "deCe"]]);
  pune("stopul care urcă: sub 30 de trade-uri", "actiuni", "alegeTrail.putine", { t: AS.alegeTrail(inU(12), cfU(12, -0.05)).motiv }, [["t", "deCe"]]);
  pune("stopul care urcă: profilul câștigă", "actiuni", "alegeTrail.prof", { t: AS.alegeTrail(inU(40), cfU(40, -0.02)).motiv }, [["t", "deCe"]]);
  pune("stopul care urcă: −15% rămâne", "actiuni", "alegeTrail.u15", { t: AS.alegeTrail(inU(40), cfU(40, -0.12)).motiv }, [["t", "deCe"]]);
  pune("stopul care urcă: sursa din profil", "actiuni", "trailPozitie.prof", { t: AS.trailPozitie({ cheie: "prof", motiv: "" }, { dist: 0.118, sursa: "profilul NVDA pe 2 ani" }).sursaTrail }, [["t", "detalii"]]);

  // consilierul: piata, sfaturile pe pozitie si pe bot, situatiile, rezumatul de dimineata, socoteala
  const qqq = urca.slice(-60), vix = zilnice(30, () => 27), spy = urca.slice(-2);
  const pi = CS.piata({ qqq: coboara.slice(-200), spy, vix, fg: { valoare: 18, clasa: "Extreme Fear" } });
  pune("piața: în jos, VIX mare", "actiuni", "consilier.piata", { t: pi.text }, [["t", "detalii"]]);
  const pz = (o) => Object.assign({ ticker: "APLD_US_EQ", simbol: "APLD", pret: 27, pretMediu: 29.5, pctLei: -0.09, ppl: -300, de: T0 - 12 * ZI, niv: { tintaPozitie: 33 } }, o || {});
  const ctx = { inchise: inchise.map((t, i) => Object.assign({}, t, { durataOre: 200, rezultat: i % 2 ? -40 : 15 })), piata: { ton: "rau", text: pi.text }, stiri: [{ titlu: "APLD semnează un contract", la: T0 - 5 * ORA }], acum: T0 };
  const sp = (sit, p) => CS.sfaturiPozitie(p, ctx).forEach((s) => pune(sit + " · " + s.sursa, "actiuni", "consilier.pozitie." + s.sursa, s, [["titlu", "titlu"], ["text", "deCe"], ["ceAsFace", "faCe"]]));
  sp("poziție pe minus în a 12-a zi", pz());
  sp("poziție aproape de țintă", pz({ pret: 32.4, pctLei: 0.16 }));
  sp("poziție care nu acoperă comisionul", pz({ pret: 29.55, pctLei: 0.001 }));
  CS.situatiiAsemanatoare(inchise, cf, { dupaMiscare: true, langaMax7z: true, trendJos: true, suma: 800, ticker: "APLD_US_EQ" })
    .forEach((x, i) => pune("biletul: " + x.et, "actiuni", "consilier.situatii" + (i + 1), x, [["text", "deCe"]]));
  CS.sfaturiBot({ baza: "CRV.PERP" }, { trades: Array.from({ length: 6 }, (_, i) => ({ moneda: "CRV", rezultat: i % 2 ? -2 : 1 })), fg: { valoare: 82, clasa: "Extreme Greed" }, stiri: [], acum: T0 })
    .forEach((s) => pune("sfat pe bot · " + s.sursa, "actiuni", "consilier.bot." + s.sursa, s, [["titlu", "titlu"], ["text", "deCe"], ["ceAsFace", "faCe"]]));
  const rd = CS.rezumatDimineata({ acum: T0, piata: pi, deIesit: [{ simbol: "APLD", pctLei: -0.21 }], rezultate: [{ simbol: "NVDA", data: "2026-10-03" }], plafon: [{ simbol: "NVDA", pond: 0.24 }],
    boti: [{ nume: "CRV", lich: 12.4 }], stiri: [{ simbol: "APLD", titlu: "APLD semnează un contract" }], idei: ["MSFT", "AMD"], ideiBoti: ["CRV"], link: "https://mau.tail9144fe.ts.net:8443/" });
  pune("rezumatul de dimineață (titlul)", "actiuni", "consilier.dimineata.titlu", { t: rd.titlu }, [["t", "alertaTitlu"]]);
  rd.linii.forEach((l, i) => pune("rezumatul de dimineață", "actiuni", "consilier.dimineata.l" + (i + 1), { t: l }, RAP));
  pune("rezumatul de dimineață: nimic de făcut", "actiuni", "consilier.dimineata.nimic", { t: CS.rezumatDimineata({ acum: T0 }).linii.join("\n") }, RAP);
  const soc = CS.socotealaSfaturi(Array.from({ length: 12 }, (_, i) => ({ zi: "2026-09-" + String(10 + i).padStart(2, "0"), ticker: "APLD_US_EQ", nivel: ["iesi", "atentie", "tine"][i % 3], pret: 30, p5: 29 + i % 3, p10: 28 + i % 4 })));
  pune("socoteala sfaturilor pe acțiuni", "actiuni", "consilier.socoteala", { t: soc.text }, [["t", "detalii"]]);

  // randurile 🎲: actiunea (stopul maine, cursa in 5 zile, saritura, rezultatele) si botul (Consilierul)
  const x = (o) => Object.assign({ p: 0.31, k: 31, n: 100, nIndep: 24, ic: [0.22, 0.41], nivel: "exact", stare: "sus-liniste", conditionat: true }, o || {});
  const rezA = { stop1: x({ p: 0.08, k: 8 }), sare1: x({ p: 0.03, k: 3, nIndep: 7 }), cursa5: { tinta: x({ p: 0.44, k: 44 }), stop: { p: 0.21 } }, niv: {} };
  PB.randActiune(rezA, { rezumat: { n: 26, pMed: 0.41, rata: 0.38, saptamani: 9 } }, { rezultateZile: 2, evenimente: { mediana: 0.06, max: 0.18 } })
    .forEach((r, i) => pune("🎲 acțiunea: " + r.titlu, "actiuni", "probabilitati.actiune" + (i + 1), r, [["titlu", "titlu"], ["text", "detalii"]]));
  PB.randActiune({ motiv: "fără stop" }, null, {}).forEach((r) => pune("🎲 acțiunea fără stop", "actiuni", "probabilitati.faraStop", r, [["titlu", "titlu"]]));
  const rezB = { niveluri: { jos: 0.3676, sus: 0.4331, lichidare: 0.3383, tinta: 0.401, stop: 0.36 }, cursa: { tinta: x({ nIndep: 8 }) }, iese: { jos24: x({ p: 0.33, k: 127, n: 390, nIndep: 65 }), sus24: x({ nIndep: 3, nivel: "regim", stare: "liniste" }) },
    lichidare7: x({ p: 0.02, k: 2, n: 120 }), liniste: { z1: x({ conditionat: false }) } };
  const calB = { "iese-jos-24": { cutii: [{ n: 1, k: 0 }, { n: 25, k: 9 }, { n: 0, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }] }, "lichidare-7": { cutii: [{ n: 30, k: 0 }] } };
  PB.randuri(rezB, calB, {}).forEach((r) => pune("🎲 botul: " + r.cod, "actiuni", "probabilitati.bot." + r.cod, r, [["titlu", "titlu"], ["text", "detalii"]]));
  pune("🎲 rândul din Consilier", "actiuni", "probabilitati.rand", { t: PB.rand(rezB, calB, "long", {}) }, [["t", "detalii"]]);

  // Consilierul pozitiei (Consiliu.alcatuiesteActiune): verdictul, ce as face, banii, motivele si restul - pe pagina T212, in poza si pe Discord
  const CO = globalThis.Consiliu, probA = PB.randActiune(rezA, { rezumat: { n: 26, pMed: 0.41, rata: 0.38, saptamani: 9 } }, { rezultateZile: 2, evenimente: { mediana: 0.06, max: 0.18 } });
  const probMaine = probA.map((r) => /Atinge stopul mâine/.test(r.titlu) ? Object.assign({}, r, { p: 0.31 }) : r);
  const NIV = (o) => Object.assign({ nivel: "ok", stopAtins: false, stopPozitie: 24.1, tintaPozitie: 33, sursaTrail: "−15% de la maxim (măsurat pe trade-urile tale)" }, o || {});
  const ca = (sit, poz, bare, o) => {
    const sem = AS.semafor(poz, bare ? AS.stare(bare, poz.pret) : null);
    const c = CO.alcatuiesteActiune(Object.assign({ sem, niv: NIV(), prob: [], sfaturi: [], plan: poz.plan, pret: poz.pret, pretMediu: poz.pretMediu, qty: poz.qty, costLei: poz.qty * poz.pretMediu * 4.35, simbol: poz.simbol }, o || {}));
    pune(sit, "actiuni", "consilierPozitie.titlu", { t: c.titlu }, [["t", "titlu"]]);
    pune(sit, "actiuni", "consilierPozitie.faCe", { t: c.faCe, titlu: c.titlu }, [["t", "faCe"]]);
    pune(sit, "actiuni", "consilierPozitie.bani", { t: c.bani }, [["t", "detalii"]]);
    (c.motive || []).forEach((m, i) => { pune(sit, "actiuni", "consilierPozitie.motiv" + (i + 1), { t: m.titlu }, [["t", "titlu"]]); pune(sit, "actiuni", "consilierPozitie.motiv" + (i + 1) + ".text", { t: m.text }, [["t", "deCe"]]); });
    (c.rest || []).forEach((r, i) => pune(sit, "actiuni", "consilierPozitie.rest" + (i + 1), { t: [r.titlu, r.text].filter(Boolean).join(" · ") }, [["t", "detalii"]]));
    pune(sit, "actiuni", "consilierPozitie.poza", { t: CO.pentruPozaActiune(c).ceAsFace.replace(/^👉 Ce aș face eu: /, "") }, [["t", "detalii"]]);
  };
  ca("Consilierul poziției: stopul din plan atins", P({ pret: 25.2, plan: { stop: 26 } }), urca, { prob: probA, sfaturi: CS.sfaturiPozitie(pz({ pret: 25.2, pctLei: -0.15 }), ctx) });
  ca("Consilierul poziției: stopul care urcă atins", P({ pretMediu: 22, pret: 29 }), urca, { niv: NIV({ stopAtins: true, stopPozitie: 30.12 }) });
  ca("Consilierul poziției: stopul mâine 31% și rezultatele", P({ pretMediu: 28, pret: 29 }), lateral, { prob: probMaine });
  ca("Consilierul poziției: trend în jos, pe minus în a 12-a zi", P({ pretMediu: 28, pret: 26.5 }), coboara, { sfaturi: CS.sfaturiPozitie(pz({ pret: 26.5, pretMediu: 28 }), ctx) });
  ca("Consilierul poziției: totul bine", P({ pretMediu: 22, pret: 36, plan: { trailPct: 15 } }), urca);
  ca("Consilierul poziției: fără prețuri", P({ pretMediu: 29, pret: 28 }), zilnice(20, () => 28));
}
