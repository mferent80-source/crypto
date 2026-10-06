// Garda textelor, grupul „alerte” (v100.66, specul „sfaturi concise”, pachetul 3): genereaza TOATE alertele, pe fiecare ramura,
// cu modulele adevarate - Alerte (public/lib/alerte.js, din garda-texte.mjs), TabloExtra.fisaInchidere, mesajele colectorului
// (scripts/lib/mesaje-colector.mjs), avertizarea la pornire, alertele simbolurilor si SL/TP (poza.mjs), retetele, funding-ul pietei.
// v100.70 (revizia pachetului 3): textele de baza vin din producatorii REALI (SemnaleBot, IndicatoriBot.mediu, Acasa.vreme/vremeBursa,
// Obiceiuri.istoricMoneda/subOOra/frana, TabloExtra.propunePlan) - fixturile inventate ascundeau abateri reale.
import * as MC from "./mesaje-colector.mjs";
import { alerteSimboluri, alerteSLTP, alerteT212Pasi, alertaBotPas } from "./poza.mjs";
import { mesajReteta } from "./tura-scan.mjs";
import { mesajFundingPiata } from "./tura-piata.mjs";
import { mesajPornire } from "./tura-pornire.mjs";
import { pazaBot, notaVeche } from "./paza-boti.mjs";
import { titluDimineata } from "./dimineata-titlu.mjs";   // v101.62 (I-526)
import { liniiBecuri } from "./tura-dimineata.mjs";   // v101.75 (I-552)

const T0 = Date.UTC(2026, 9, 1, 16, 0), ORA = 3600000, ZI = 86400000;
const AL = [["titlu", "alertaTitlu"], ["mesaj", "alertaMesaj"]], RAP = [["titlu", "alertaTitlu"], ["mesaj", "raport"]];

export function situatiiAlerte(pune) {
  const A = globalThis.Alerte, TE = globalThis.TabloExtra;
  // botul CRV al lui (long, 0.3841-0.4331); LIGHTER pe short; BTC cu preturi de 5 cifre; PUMP sub 0,01
  const CRV = (o) => Object.assign({ baza: "CRV.PERP", directie: "long", pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30, pretLichidare: 0.3382876201448984,
    investit: 49.67, levier: 5, pornitLa: T0 - 4 * ZI }, o || {});
  const LIT = (o) => Object.assign({ baza: "LIGHTER.PERP", simbolPionex: "LIT_USDT_PERP", directie: "short", pretCurent: 4.912, gridJos: 4.2, gridSus: 5.1, distantaLichidarePct: 25, pretLichidare: 6.1234,
    investit: 120, levier: 4, pornitLa: T0 - 2 * ZI }, o || {});
  const BTC = (o) => Object.assign({ baza: "BTC.PERP", directie: "long", pretCurent: 64123.45, gridJos: 60000, gridSus: 72000, distantaLichidarePct: 30, pretLichidare: 45123.67,
    investit: 2500, levier: 3, pornitLa: T0 - 6 * ZI }, o || {});
  const PUMP = (o) => Object.assign({ baza: "PUMP.PERP", directie: "long", pretCurent: 0.0041234, gridJos: 0.0039, gridSus: 0.0048, distantaLichidarePct: 30, pretLichidare: 0.0031234,
    investit: 60, levier: 3, pornitLa: T0 - 3 * ZI }, o || {});
  const al = (sit, b, ctx, vechi, chei) => {
    const r = A.reguli(b, ctx || null, vechi || {});
    for (const k of chei || Object.keys(r)) { const a = r[k]; if (a && a.titlu) pune(sit, "alerte", "alerta." + k + "." + a.nivel, a, AL); }
    return r;
  };
  const in2 = (k, nivel) => ({ [k]: { nivel: nivel || "atentie", la: T0 - ORA } });

  // lichidarea, Pionex, botul oprit, pretul fata de grid
  al("lichidarea depășită (CRV)", CRV({ lichidareDepasita: true, pretCurent: 0.33 }), null, null, ["lich"]);
  al("lichidarea la 6,2% (CRV)", CRV({ distantaLichidarePct: 6.2 }), null, null, ["lich"]);
  al("lichidarea la 12,4% (CRV)", CRV({ distantaLichidarePct: 12.4 }), null, null, ["lich"]);
  al("lichidarea la 12,4% (BTC)", BTC({ distantaLichidarePct: 12.4 }), null, null, ["lich"]);
  al("lichidarea la 9% (PUMP, sub 0,01)", PUMP({ distantaLichidarePct: 9 }), null, null, ["lich"]);
  al("lichidarea s-a îndepărtat", CRV({ distantaLichidarePct: 18.3 }), null, in2("lich", "atentie"), ["lich"]);
  al("Pionex: marja MARGIN_CALL", CRV({ stareMargine: "MARGIN_CALL", stareRisc: "TRADING" }), null, null, ["status"]);
  al("Pionex: riscul LIQUIDATING", CRV({ stareMargine: "NORMAL", stareRisc: "LIQUIDATING" }), null, null, ["status"]);
  al("Pionex: din nou normal", CRV({ stareMargine: "NORMAL", stareRisc: "TRADING" }), null, null, ["status"]);
  al("botul oprit", CRV({ activ: false, stareInterna: "paused" }), null, null, ["activ"]);
  al("botul rulează din nou", CRV({ activ: true }), null, null, ["activ"]);
  al("prețul sub grid (CRV)", CRV({ pretCurent: 0.3801 }), null, null, ["grid"]);
  al("prețul peste grid (BTC)", BTC({ pretCurent: 72345.67 }), null, null, ["grid"]);
  al("prețul sub grid (PUMP)", PUMP({ pretCurent: 0.0038123 }), null, null, ["grid"]);
  al("prețul din nou în grid", CRV({ pretCurent: 0.40 }), null, in2("grid"), ["grid"]);
  // piata pe 4 ore, miscarea mare
  al("piața pe 4 ore contra (long, coboară)", CRV(), { fata4h: "rau", dir4h: "coboara" }, null, ["directie"]);
  al("piața pe 4 ore nu mai e contra", CRV(), { fata4h: "bine", dir4h: "urca" }, null, ["directie"]);
  al("mișcare mare cu botul (long, urcă)", CRV(), { regim: { r4h: 2.4, r24h: 1.3, sens: "urca", miscare: true }, pretZero: 0.38 }, null, ["miscare"]);
  al("mișcare mare cu botul, botul pe minus (zero-ul peste preț)", CRV(), { regim: { r4h: 2.4, r24h: 1.3, sens: "urca", miscare: true }, pretZero: 0.3925 }, null, ["miscare"]);
  al("mișcare mare contra (long, coboară, 10×)", CRV(), { regim: { r4h: 10.4, r24h: 10.2, sens: "coboara", miscare: true } }, null, ["miscare"]);
  al("mișcare mare, bot neutru", CRV({ directie: "no_trend" }), { regim: { r4h: 2.6, r24h: 1.4, sens: "urca", miscare: true } }, null, ["miscare"]);
  al("liniște din nou", CRV(), { regim: { r4h: 0.9, r24h: 1.1, sens: null, miscare: false } }, in2("miscare"), ["miscare"]);
  // planul lui
  al("planul: pierderea a atins pragul", CRV(), { plan: { atins: ["minus"], minus: { prag: 7.6 } } }, null, ["plan"]);
  al("planul: ținta atinsă, condiții bune, stopul încă nu e la podea", CRV({ pretCurent: 0.41 }), { plan: { atins: ["plus"], plus: { prag: 2.6, podea: 0.4012, opritorPastreaza: null } } }, null, ["plan"]);
  al("planul: ținta atinsă și la adăpost", CRV({ pretCurent: 0.41, opritorPierdereActiv: true, opritorPierdere: 0.402 }), { plan: { atins: ["plus"], plus: { prag: 2.6, podea: 0.4012, opritorPastreaza: 2.8 } } }, null, ["plan"]);
  al("planul: ținta atinsă, condiții proaste", CRV({ pretCurent: 0.41, distantaLichidarePct: 12 }), { plan: { atins: ["plus"], plus: { prag: 2.6, podea: 0.4012 } } }, null, ["plan"]);
  al("planul: afară din grid de prea mult", CRV({ pretCurent: 0.38 }), { plan: { atins: ["afara"], afara: { prag: 12 } } }, null, ["plan"]);
  const minus = (o) => Object.assign({ prag: 7.6, laOpritor: -12.2, opritorPlan: 0.36952, laMargine: -9.1, iesire: 0.045, ampZi: 0.062, levierPotrivit: { levier: 3, laMargine: -5.4, iesire: 0.071 } }, o || {});
  al("fără stop activ (stopul setat, dar stins)", CRV({ opritorPierdere: 0.362, opritorPierdereActiv: false, distantaLichidarePct: 30 }), { plan: { atins: [], minus: minus() } }, null, ["plan-stop"]);
  al("fără stop în Pionex, planul în procente", CRV(), { plan: { atins: [], minus: minus({ opritorPlan: null }) } }, null, ["plan-stop"]);
  al("stopul din Pionex pierde peste plan (atenție)", CRV({ opritorPierdere: 0.362, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -10.2 }) } }, null, ["plan-stop"]);
  al("stopul din Pionex pierde de 2× planul (critic)", CRV({ opritorPierdere: 0.33, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -21.4 }) } }, null, ["plan-stop"]);
  al("stopul în procente pierde peste plan", CRV({ opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.42 }), { plan: { atins: [], minus: minus({ laOpritor: -20.9 }) } }, null, ["plan-stop"]);
  al("stopul se potrivește din nou cu planul", CRV({ opritorPierdere: 0.372, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -7.9 }) } }, in2("plan-stop"), ["plan-stop"]);
  al("gridul e mai larg decât planul (long)", CRV({ opritorPierdere: 0.372, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -7.9, laMargine: -14.2 }) } }, null, ["grid-plan"]);
  al("planul se atinge sub o zi obișnuită", CRV({ opritorPierdere: 0.372, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -7.9, laMargine: -8, iesire: 0.02, levierPotrivit: null }) } }, null, ["grid-plan"]);
  al("gridul încape din nou în plan", CRV({ opritorPierdere: 0.372, opritorPierdereActiv: true }), { plan: { atins: [], minus: minus({ laOpritor: -7.9, laMargine: -7, iesire: 0.08 }) } }, in2("grid-plan"), ["grid-plan"]);
  const plus = (o) => Object.assign({ prag: 2.6, laTinta: 5.9, tintaPlan: 0.39364 }, o || {});
  al("fără țintă în Pionex", CRV(), { plan: { atins: [], plus: plus() } }, null, ["plan-tinta"]);
  al("ținta din Pionex departe de plan, peste grid", CRV({ opritorProfit: 0.4512, opritorProfitActiv: true }), { plan: { atins: [], plus: plus() } }, null, ["plan-tinta"]);
  al("ținta în procente departe de plan", CRV({ opritorProfitActiv: true, opritorProfitTip: "raport", opritorProfitRaport: 0.12 }), { plan: { atins: [], plus: plus({ laTinta: 6.1 }) } }, null, ["plan-tinta"]);
  al("ținta se potrivește din nou", CRV({ opritorProfit: 0.394, opritorProfitActiv: true }), { plan: { atins: [], plus: plus({ laTinta: 2.7 }) } }, in2("plan-tinta"), ["plan-tinta"]);
  // semnalele (SemnaleBot, in colector)
  // v100.70 (revizia pachetului 3, I4): semnalele din SemnaleBot REAL (semaforul IEȘI pe lichidare, încasează, mută gridul cu motivul lui,
  // BTC, aglomerarea cu semnele) - textele inventate de aici ascundeau randul 1 de 169 de caractere si titlul taiat al mutarii
  const SB = globalThis.SemnaleBot, FM = { setare: { jos: 0.37, sus: 0.40, grile: 6, levier: 4 }, treceriZi: 3.4, regim: { r4h: 2.4, r24h: 1.6, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } };
  const sem = { semafor: SB.semafor({ bot: CRV({ distantaLichidarePct: 6.2, pretLichidare: 0.362 }), fisa: null }), iaProfit: SB.iaProfit(CRV({ profitTotal: 4.2 }), FM),
    muta: SB.mutaGridul(CRV({ pretCurent: 0.3846 }), FM, 0, null), btc: SB.btcAvertizare({ miscare: true, r4h: 2.3, r24h: 1.9 }, { miscare: false }),
    aglomerare: SB.aglomerare({ funding: 0.0006, longShort: 2.15, oiHist5m: [{ sumOpenInterest: 1000 }, { sumOpenInterest: 1182 }] }, "long") };
  for (const k of Object.keys(sem)) if (!sem[k]) throw new Error("garda-alerte: semnalul " + k + " n-a ieșit din producătorul real");
  al("mută gridul, prețul afară din grid de 14 h", CRV({ pretCurent: 0.3790 }), { semnale: { semafor: { nivel: "atentie" }, muta: SB.mutaGridul(CRV({ pretCurent: 0.3790 }), FM, 14, null) } }, null, ["s-muta"]);
  al("semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare", CRV(), { semnale: sem }, null, ["s-iesi", "s-ia-profit", "s-muta", "s-btc", "s-aglomerare"]);
  // v100.70 (revizia pachetului 3, I4/I8): mediul din IndicatoriBot.mediu REAL (textul funding-ului are ~85 de caractere), pe long si pe short
  const med = (dir, rate, bdir, mis, ori = 6) => globalThis.IndicatoriBot.mediu({ regim: { r4h: 0.8, r24h: 0.9, miscare: false }, funding: { rate, intervalOre: 8, hist: Array.from({ length: 20 }, () => rate / ori) },
    fundingZi: -0.85, btc: { dir: bdir, regim: { r4h: 2.3, miscare: mis } } }, dir);
  al("mediul: BTC contra și funding mare (long)", CRV(), { mediu: med("long", 0.0006, "coboara", true) }, null, ["m-btc", "m-funding"]);
  al("mediul: BTC contra și funding mare (short)", LIT(), { mediu: med("short", -0.0006, "urca", true) }, null, ["m-btc", "m-funding"]);
  al("mediul: din nou normal", CRV(), { mediu: med("long", 0.0001, "urca", false, 1) }, null, ["m-btc", "m-funding"]);
  // pragurile puse de Radar: pe zero, langa margine; stopul stins
  al("botul a ajuns pe zero (long)", CRV({ pretCurent: 0.3926, pornitLa: T0 - 3 * ZI }), { pretZero: 0.3925 }, null, ["p-zero"]);
  al("prețul la 0,4% de marginea de jos", CRV({ pretCurent: 0.3856 }), null, null, ["p-margine"]);
  al("prețul la 0,5% de marginea de sus (short)", LIT({ pretCurent: 5.075 }), null, null, ["p-margine"]);
  al("stopul stins, lichidarea la 8%", CRV({ opritorPierdere: 0.362, opritorPierdereActiv: false, distantaLichidarePct: 8 }), null, null, ["opritor"]);
  al("stopul stins, lichidarea la 17%", CRV({ opritorPierdere: 0.362, opritorPierdereActiv: false, distantaLichidarePct: 17 }), null, null, ["opritor"]);
  // sfatul tacut pe Discord (I-466)
  const ev = A.evalueaza(CRV(), { semnale: sem, taci: { muta: true } }, {}, T0);
  const tac = ev.mesaje.find((m) => m.cheie === "s-muta");
  if (tac) pune("sfatul tăcut pe Discord (mută gridul)", "alerte", "alerta.tacut", tac, AL);

  // grila / perechea (evenimente), stopul care urca, preturile, mediul botilor
  const bu = (u, per, g, poz) => ({ baza: "CRV.PERP", directie: "long", pretCurent: 0.3858, ordinePerechi: per, gridProfitBrut: g, pozitie: poz, brut: { buOrderData: { closedExchangeOrderCount: u } } });
  const g1 = A.grila(bu(121, 41, 3.24, 160), { u: 120, per: 40, g: 3.2, poz: 150 }).mesaje[0];
  if (g1) pune("o pereche încheiată", "alerte", "grila.pereche", g1, AL);
  const g2 = A.grila(bu(122, 40, 3.2, 170), { u: 120, per: 40, g: 3.2, poz: 150 }).mesaje[0];
  if (g2) pune("2 grile atinse, a cumpărat", "alerte", "grila.atinsa", g2, AL);
  const pu = A.podeaUrca(CRV({ pretCurent: 0.42 }), { atins: ["plus"], plus: { prag: 2.6, urca: { pastrezi: 4.1, pret: 0.4137, perna: 0.015, opritor: 0.402, opritorPastreaza: 2.8 } } }, { regim: null }, null).mesaje[0];
  if (pu) pune("stopul poate urca", "alerte", "podeaUrca.mesaj", pu, AL);
  const pr = A.preturi({ reaDe: T0 - 12 * 60000, anuntatLa: null }, { ok: false, eroare: "HTTP 503 de la Pionex" }, T0).mesaj;
  if (pr) pune("prețurile nu mai vin", "alerte", "preturi.rea", pr, AL);
  const pd = A.preturi({ reaDe: T0 - 30 * 60000, anuntatLa: T0 - 20 * 60000 }, { ok: true }, T0).mesaj;
  if (pd) pune("prețurile vin din nou", "alerte", "preturi.dinNou", pd, AL);
  const rb = A.raportBoti([{ b: CRV({ profitTotal: -3.2 }), mediu: [{ ton: "atentie", eticheta: "Mișcarea", text: "1,9× obișnuitul pe 4 h" }, { ton: "bine", eticheta: "BTC", text: "pe 4 ore urcă" }] },
    { b: BTC({ profitTotal: 123.4 }), mediu: [] }], T0);
  if (rb) pune("mediul boților (raport la ore fixe)", "alerte", "raportBoti.mesaj", rb, RAP);
  const mn1 = A.miscareNeobisnuita({ cheie: "CRV", nume: "CRV", fel: "monedă", ch: 7.4, tipic: 3.1, pret: 0.4012 }, null, T0).mesaj;
  if (mn1) pune("mișcare neobișnuită pe o monedă", "alerte", "miscareNeobisnuita.moneda", mn1, AL);
  const mn2 = A.miscareNeobisnuita({ cheie: "NVDA", nume: "NVDA", fel: "acțiune", ch: -6.2, tipic: null, pret: 118.42 }, null, T0).mesaj;
  if (mn2) pune("mișcare neobișnuită pe o acțiune (fără obișnuit)", "alerte", "miscareNeobisnuita.actiune", mn2, AL);
  // v100.70 (revizia pachetului 3, I4): vremea din Acasa.vreme / vremeBursa REALE (inainte: o fixtura inventata ascundea titlul „🔴 MIȘCARE”
  // si actiunea de 207 caractere cu lacomia); fiecare ramura, confirmata de doua ori ca in colector
  const AC = globalThis.Acasa, cr = (evita, dir, fg, btc) => AC.vreme({ clasament: { evita, candidati: 100 - evita, dir }, btc: { miscare: !!btc }, fg });
  const serie = (f) => Array.from({ length: 260 }, (_, i) => ({ c: f(i) })), bv = (q, vix, e50) => AC.vremeBursa({ qqq: serie(q), vix, ndx: { e50, n: 100 } });
  const SUS = (i) => 100 + i * 0.2, JOS = (i) => 200 - i * 0.3, LAT = (i) => 100 + 3 * Math.sin(i / 9);
  const V0 = { crypto: cr(10, { long: 45, short: 45, neutru: 10 }, 50), bursa: bv(SUS, 15, 75), corelatie: { r: 0.2 } };
  const vr = (sit, v1) => { let st = A.schimbareVreme(null, V0, T0).stare; st = A.schimbareVreme(st, v1, T0 + 600000).stare;
    for (const m of A.schimbareVreme(st, v1, T0 + 1200000).mesaje) pune("vremea pieței (" + sit + "): " + m.cheie, "alerte", "schimbareVreme." + m.cheie.replace("vreme-", ""), m, AL); };
  vr("mișcare + lăcomie, VIX 31, BTC urmează bursa", { crypto: cr(60, { long: 70, short: 20, neutru: 10 }, 78), bursa: bv(JOS, 31, 30), corelatie: { r: 0.62 } });
  vr("amestecat + lăcomie, bursa scade", { crypto: cr(30, { long: 70, short: 20, neutru: 10 }, 74), bursa: bv(JOS, 22, 30), corelatie: { r: 0.2 } });
  vr("mișcare BTC + frică, bursa laterală", { crypto: cr(20, { long: 15, short: 75, neutru: 10 }, 18, true), bursa: bv(LAT, 21, 50), corelatie: { r: 0.2 } });
  vr("liniște + frică, urcare îngustă", { crypto: cr(10, { long: 15, short: 75, neutru: 10 }, 22), bursa: bv(SUS, 18, 40), corelatie: { r: 0.2 } });
  vr("amestecat, urcare largă", { crypto: cr(30, { long: 45, short: 45, neutru: 10 }, 55), bursa: bv(SUS, 14, 70), corelatie: { r: 0.2 } });

  // fisa de inchidere (TabloExtra.fisaInchidere)
  const fi = (sit, f, b, o) => { const x = TE.fisaInchidere(Object.assign({ baza: "CRV.PERP", investit: 49.67, levier: 5, pornitLa: T0 - 30 * ORA, inchisLa: T0 }, b), o || {}); pune(sit, "alerte", "fisaInchidere." + f, x, RAP); };
  fi("închis pe minus de stop, cu plan", "minus", { profitTotal: -7.9, gridProfitBrut: 3.2, ordinePerechi: 41, motivInchidere: "loss_stop", opritorPierdereTip: "raport", opritorPierdereRaport: -0.16 }, { plan: { plus: 2.6, minus: 7.6 }, atrPct: 4.2 });
  fi("închis pe plus de el, peste țintă", "plus", { profitTotal: 4.1, gridProfitBrut: 4.6, ordinePerechi: 52, motivInchidere: "user_cancel" }, { plan: { plus: 2.6, minus: 7.6 } });
  fi("lichidat, fără plan", "lichidat", { profitTotal: -49.1, gridProfitBrut: 1.1, motivInchidere: "liquidation" }, {});
  fi("închis în prima oră", "primaOra", { profitTotal: -0.42, gridProfitBrut: 0.08, comisioane: -0.31, pornitLa: T0 - 40 * 60000, motivInchidere: "user_cancel" }, { subOOra: { n: 34, net: -21.4, comisioane: -12.9 } });

  // alertele simbolurilor si SL/TP (poza.mjs)
  const c30 = Array.from({ length: 20 }, (_, i) => 100 * (1 + (i % 2 ? 0.01 : -0.01)));
  const sim = { s: "NVDA", closes30: c30, pret: 108, prev: 100, insideri: { verdict: "bull", ultimaCumparare: { zi: "2026-09-29", cine: "Jensen Huang", rol: "CEO", act: 12000, val: 1420000 } } };
  for (const a of alerteSimboluri([sim], { NVDA: { insideri: { verdict: "neutru", ultimaCumparare: { zi: "2026-08-01" } } } }, T0))
    pune("simbolul NVDA: " + a.cheie.split("-")[1], "alerte", a.cheie.indexOf("insider") >= 0 ? "alerteSimboluri.insider" : "alerteSimboluri.miscare", a, AL);
  const poza = { t212: [{ s: "AMD", pret: 141.2, plan: { stop: 138.5, tinta: 168 } }, { s: "INTC", pret: 19.1, sugestie: { stop: 19.6, tinta: 26.4 } }, { s: "PLTR", pret: 151.3, sugestie: { stop: 118.2, tinta: 150 } }],
    simboluri: [{ s: "MSFT", pret: 402.1, moneda: "$", sugestie: { intrare: { pret: 401 }, stop: 384.5, tinta: 436, proba: { medie: 0.021, pePlus: 0.58, n: 41 }, marime: { bucati: 1.42, suma: 2610, risc: 98, plafonat: false } } }] };
  for (const a of alerteSLTP(poza, T0)) pune("SL/TP: " + a.cheie.split("-").slice(0, 2).join("-"), "alerte", "alerteSLTP." + a.cheie.split("-")[1], a, AL);

  // v101.67 (el, 05.10: „±1% la ce dețin”): treptele T212 fata de ieri si 1% pe boti fata de ultima alerta (BTC 5 cifre, PUMP sub 0,01, short)
  for (const a of alerteT212Pasi({ t212: [{ s: "AVGO", pret: 312.4, prev: 306.3, mediu: 322.4 }, { s: "RHM.DE", pret: 1488, prev: 1520.5 }] }, {}, T0)) pune("T212 ±1%: " + a.titlu.split(":")[0], "alerte", "alerteT212Pasi", a, AL);
  for (const [n, b, p] of [["CRV", CRV({ id: "b1" }), 0.3897], ["LIGHTER short", LIT({ id: "b2" }), 4.85], ["BTC", BTC({ id: "b3" }), 64850], ["PUMP noaptea", PUMP({ id: "b4" }), 0.00418]])
    pune("bot ±1%: " + n, "alerte", "alertaBotPas", alertaBotPas(Object.assign({}, b, { pretCurent: p }), { p: b.pretCurent, t: T0 - 40 * 60000 }, n === "PUMP noaptea" ? Date.UTC(2026, 9, 2, 1, 0) : T0).alerta, AL);

  // avertizarea la pornire (textul de baza vine din Obiceiuri - pachetul 5), retetele scanului, funding-ul pietei
  // v100.70 (revizia pachetului 3, I4): istoria monedei si prima ora din Obiceiuri REAL (textele lor aveau 3 fraze si sume cu punct)
  const OB = globalThis.Obiceiuri, url = "https://mau.tail9144fe.ts.net:8443/#ecran=gridset&moneda=LIT";
  const trP = (plus) => Array.from({ length: 12 }, (_, i) => ({ moneda: "LIGHTER", rezultat: i < plus ? 1.5 : i === plus ? -40.12 : -6.1, net: i < plus ? 1.5 : i === plus ? -40.12 : -6.1, inchis: T0 - (20 - i) * ZI, durataOre: 30 }))
    .concat(Array.from({ length: 48 }, (_, i) => ({ moneda: "X" + (i % 5), rezultat: i % 3 ? -0.4 : 0.2, net: i % 3 ? -0.4 : 0.2, comisioane: -0.17, inchis: T0 - (30 - i % 30) * ZI, durataOre: 0.5 })));
  pune("bot nou pe o monedă unde pierzi (câștigi des, dar pierderile mari)", "alerte", "pornire.mesaj", mesajPornire({ id: "b1" }, "LIGHTER", OB.istoricMoneda(trP(7), "LIGHTER"), OB.subOOra(trP(7)), "LIT", url), AL);
  pune("bot nou pe o monedă unde pierzi (rar pe plus, fără link)", "alerte", "pornire.mesaj", mesajPornire({ id: "b2" }, "LIGHTER", OB.istoricMoneda(trP(3), "LIGHTER"), null, "LIT", null), AL);
  const xr = { s: "AMD", p: 141.2, ch: 2.31, ch7: -4.12, rsi: 38.6 };
  pune("rețetă: AMD a intrat", "alerte", "reteta.intrat", mesajReteta(xr, "Revenire după scădere", "a", true, "aAMD", "rev"), AL);
  pune("rețetă: AMD a ieșit", "alerte", "reteta.iesit", mesajReteta(xr, "Revenire după scădere", "a", false, "aAMD", "rev"), AL);
  pune("funding-ul pe piață", "alerte", "fundingPiata.mesaj", mesajFundingPiata({ text: "Funding-ul mediu pe piață e +0,045% la 8 ore, de 3× obișnuitul." }), AL);

  // mesajele colectorului
  const co = (sit, f, m) => pune(sit, "alerte", "colector." + f, m, AL);
  co("serverul de acasă nu mai răspunde", "serverOprit", MC.serverOprit(15));
  co("colectorul nu mai poate citi botul", "citireRea", MC.citireRea(12, "HTTP 502"));
  co("colectorul citește din nou", "citireDinNou", MC.citireDinNou());
  co("botul nu mai apare în Pionex", "lipsaPionex", MC.lipsaPionex("CRV"));
  // v100.70 (revizia pachetului 3, I4): propunerea din TabloExtra.propunePlan REAL (nota implicita repeta „Propun” si orele)
  co("botul n-are plan, propunerea mea (implicită)", "faraPlan", MC.faraPlan("CRV", TE.propunePlan(null, 49.67)));
  co("botul n-are plan, după planul de dinainte", "faraPlan", MC.faraPlan("CRV", TE.propunePlan({ plus: 5.5, minus: 15.7, afaraOre: 12, nume: "LIGHTER", investit: 103.38 }, 49.67)));
  co("botul n-are plan, fără propunere", "faraPlan", MC.faraPlan("CRV", null));
  // v101.70: botul nou cu gridul prea larg pentru levier (cu și fără stopul planului în grid)
  co("botul nou cu gridul prea larg pentru levier", "gridPreaLarg", MC.gridPreaLarg("TAKE", { laMargine: 24.9, procent: 0.62, parte: "jos", plan: 6.5, stopPlan: 0.0614, moarte: 22, intervale: 49 }));
  // v101.73: pornit ca LARG / ÎNGUST / alt grid; ceasul LARG
  co("botul nou seamănă cu LARG din fișă", "pornitCa", MC.pornitCa("ABC", { k: "larg", t: Date.UTC(2026, 9, 5, 11, 20), stop: 15, n: 100, oreTipic: 24 }));
  co("botul nou seamănă cu ÎNGUST din fișă", "pornitCa", MC.pornitCa("ABC", { k: "ingust", t: Date.UTC(2026, 9, 5, 11, 20), stop: 40, n: 100, oreTipic: 5 }));
  co("botul nou nu seamănă cu nicio fereastră", "pornitCa", MC.pornitCa("ABC", { k: null, t: Date.UTC(2026, 9, 5, 11, 20) }));
  co("botul LARG stă de 2× durata tipică", "ceasLarg", MC.ceasLarg("ABC", 50, 24));
  co("gridul prea larg, fără grile numărate", "gridPreaLarg", MC.gridPreaLarg("CRV", { laMargine: 12.4, procent: 0.25, parte: "sus", plan: 5, stopPlan: null, moarte: null, intervale: null }));
  // v100.86 (§2 „paza boților”): mesajele pazei din producătorul REAL (pazaBot cu Busola și Alerte.pret, nota din notaVeche) -
  // CRV long 5×, LIGHTER short 4×, BTC (prețuri de 5 cifre), PUMP (sub 0,01), bot nou, neutru fără levier, nedovedit, fără cifră
  const BU = globalThis.Busola, GR = { canal: "±2×ATR", miscare: -0.0021398053, miscareDovedita: true };
  const REZB = (g) => ({ la: T0 - 2 * ORA, monede: { CRV: { perp4h: "miscare" }, LIT: { perp4h: "miscare" }, BTC: { grid4h: "miscare" }, PUMP: { perp4h: "miscare" }, MARSCOIN: { perp4h: "miscare" } }, grid: g || GR, perp: { prag: 200000 } });
  const paz = (sit, b, g, prim) => co(sit, "busolaMiscare", pazaBot({ Busola: BU, rez: REZB(g), bot: b, inainte: prim ? undefined : { stare: "liniste", la: 1 }, acum: T0, pret: A.pret }).mesaj);
  paz("Busola: mai agitată (CRV long 5×, dovedit)", CRV());
  paz("Busola: mai agitată (LIGHTER short 4×)", LIT());
  paz("Busola: mai agitată (BTC, prețuri de 5 cifre)", BTC());
  paz("Busola: mai agitată (PUMP, sub 0,01)", PUMP());
  paz("Busola: bot nou pe monedă agitată (CRV)", CRV({ pornitLa: T0 - 10 * 60000 }), null, true);
  paz("Busola: mai agitată, bot neutru fără levier", CRV({ directie: "no_trend", levier: null }));
  paz("Busola: mai agitată, nedovedit (LIGHTER)", LIT(), Object.assign({}, GR, { miscareDovedita: false }));
  paz("Busola: mai agitată, rezumat fără cifră și fără canal", CRV(), {});
  co("Busola: rezumatul vechi (6 ore)", "busolaVeche", notaVeche({ Busola: BU, rez: REZB(), acum: T0 + 4 * ORA + 1, anuntat: null }));
  // v100.90 (I-511): mesajul pazei cu cifra de pe futures („futures ±2×ATR”, aceeași lungime ca „grid pe ±2×ATR”)
  paz("Busola: mai agitată, cifra de pe futures (MARSCOIN)", CRV({ baza: "MARSCOIN.PERP" }), Object.assign({}, GR, { futures: { canal: "±2×ATR", miscare: -0.011375026, liniste: -0.0081966036, oricand: -0.0094983709, dovedit: false, miscareDovedita: true } }));
  // v100.90 (I-513): rândul Busolei din rezumatul de dimineață (raport: rânduri ≤ 160), din producătorul real (Busola.liniaBoti)
  const lb = (sit, l) => pune(sit, "alerte", "busola.linia", { t: "🧭 Busola, pe 4h: " + BU.liniaBoti(l, T0) }, [["t", "raport"]]);   /* v100.91: „🧭”, 142 + 18 = 160 */
  const SUFIX = " (rezumat de acum 6 h)";   /* v100.91: rezumatul vechi își spune vârsta; lungimea rezervată din rând */
  pune("Busola dimineața: 12 boți, rezumat vechi (6 ore)", "alerte", "busola.linia", { t: "🧭 Busola, pe 4h: " + BU.liniaBoti(Array.from({ length: 12 }, (_, i) => ({ nume: "MARSCOIN" + i, stare: "miscare", de: T0 - 9 * ORA })), T0, 142 - SUFIX.length) + SUFIX }, [["t", "raport"]]);
  lb("Busola dimineața: 4 boți, toate stările", [{ nume: "CRV", stare: "miscare", de: T0 - 8 * ORA }, { nume: "LIGHTER", stare: "liniste", de: T0 - 2.5 * ORA }, { nume: "PUMP", stare: "nu-stiu", de: T0 - 30 * 60000 }, { nume: "BTC", stare: null }]);
  lb("Busola dimineața: un bot", [{ nume: "CRV", stare: "miscare", de: T0 - 50 * ORA }]);
  // v101.62 (I-526): rândul-verdict din capul rezumatului (raport: ≤ 160), din producătorul real
  const td = (sit, o) => pune(sit, "alerte", "dimineata.titlu", { t: titluDimineata(o) }, [["t", "raport"]]);
  td("dimineața: rândul-verdict, 3 boți", { boti: [{ nume: "CRV", stare: "miscare" }, { nume: "LIGHTER", stare: "liniste" }, { nume: "PUMP", stare: "liniste" }], bilant: "dovedit", reveniri: 9, eticheta: "cam la fel", deIesit: 0 });
  td("dimineața: rândul-verdict, 40 de boți, 2 de ieșit", { boti: Array.from({ length: 40 }, (_, i) => ({ nume: "M" + i, stare: i % 2 ? "miscare" : "liniste" })), bilant: "prea puține", reveniri: 123, eticheta: "mai slab", deIesit: 2 });
  td("dimineața: rândul-verdict, nimic", { boti: [{ nume: "SOL", stare: "nemasurat" }], reveniri: 0, deIesit: 0 });
  // v101.75 (I-552): becurile 4h · 1z și ce s-a schimbat (raport: rânduri ≤ 160), din producătorul real
  const bc = (sit, l, ieri, et) => liniiBecuri(l, ieri, et).linii.forEach((t, i) => pune(sit + " · rândul " + (i + 1), "alerte", "dimineata.becuri", { t }, [["t", "raport"]]));
  bc("dimineața: becurile, 3 boți + 2 acțiuni", [{ cheie: "a", nume: "CRV", dir: "long", h4: "urca", z1: "lateral" }, { cheie: "b", nume: "LIGHTER", dir: "short", h4: "urca", z1: "coboara" }, { cheie: "c", nume: "LIGHTER", dir: "long", h4: "lateral", z1: null },
    { cheie: "d", nume: "AAPL", dir: "long", h4: "coboara", z1: "lateral" }, { cheie: "e", nume: "SAP", dir: "long", h4: "urca", faraZ1: true }], { a: { h4: "coboara", z1: "lateral" }, b: { h4: "urca", z1: "urca" } }, "Peste noapte");
  bc("dimineața: becurile, 30 de poziții", Array.from({ length: 30 }, (_, i) => ({ cheie: "p" + i, nume: "MARSCOIN" + i, dir: "long", h4: "lateral", z1: "coboara" })), Object.fromEntries(Array.from({ length: 30 }, (_, i) => ["p" + i, { h4: "urca", z1: "urca" }])), "Față de 03.10");
  // v100.93 (A2): comparația fișei cu intervalul Busolei (I-524) - cele trei forme, rând ≤ 110
  for (const [sit, j, s] of [["mai îngust", 3.177, 3.962], ["mai larg", 2.5, 4.9], ["cam la fel", 3.0, 4.25]]) pune("Busola, comparația: " + sit, "alerte", "busola.comparatie", { t: BU.comparaInterval({ jos: 3.009, sus: 4.224 }, j, s).text }, [["t", "rand"]]);
  lb("Busola dimineața: 12 boți (tăiat la 145)", Array.from({ length: 12 }, (_, i) => ({ nume: "MARSCOIN" + i, stare: "miscare", de: T0 - ORA })));
  co("gridul îngust a ajuns la durata probată", "ceasIngust", MC.ceasIngust("CRV", 6, "14:30", false));
  // v101.78 (I-563): 24 h pe minus - cu cifrele lui și fără raport
  const t24 = "Din boții tăi care au ajuns la 24 h (76), 57% au ieșit pe plus și 29% au pierdut peste 5% (media −12,6%).";
  for (const [k, p] of [["media pe plus", { pePlus: 0.6, medie: 0.02 }], ["mulți revin", { pePlus: 0.57, medie: -0.126 }], ["rău", { pePlus: 0.4, medie: -0.126 }]]) co("24 h pe minus, " + k, "minus24h", MC.minus24h("MARSCOIN", 26.4, -12.345, t24, p));
  co("24 h pe minus, fără raport", "minus24h", MC.minus24h("CRV", 30, -1.2, null, null));
  co("gridul îngust, mesaj întârziat", "ceasIngust", MC.ceasIngust("CRV", 6, "14:30", true));
  co("Trading 212 nu mai răspunde (cheia)", "t212Rau", MC.t212Rau(18, 401, "HTTP 401"));
  co("Trading 212 răspunde din nou", "t212DinNou", MC.t212DinNou());
  co("o acțiune peste 20% din cont", "pondereT212", MC.pondereT212("NVDA", 0.236));
  co("perechile pe oră", "perechiOra", MC.perechiOra("CRV", 3, 0.42));
  // v100.70 (revizia pachetului 3, I3): frana din Obiceiuri.frana REAL - textul ei repeta titlul si actiunea; mesajul se face din cifre
  const OBf = globalThis.Obiceiuri;
  co("frâna contului: pragul pe zi", "frana", MC.frana(OBf.frana({ trades: [{ inchis: T0 - 2 * ORA, net: -12.05 }, { inchis: T0 - 3 * ORA, net: -12.05 }], acum: T0 })));
  co("frâna contului: zi + 7 zile + 3 la rând", "frana", MC.frana(OBf.frana({ trades: [{ inchis: T0 - 1 * ORA, net: -9 }, { inchis: T0 - 2 * ORA, net: -8 }, { inchis: T0 - 3 * ORA, net: -7.5 }, { inchis: T0 - 3 * ZI, net: -40 }], acum: T0 })));
  co("alertele sunt legate", "legat", MC.legat());
  co("raportul de duminică (titlul)", "raport", { titlu: MC.raport("2026-09-27", ["—"]).titlu });
  co("autopsia acțiunilor (titlul)", "autopsie", { titlu: MC.autopsie("2026-09-27", ["—"]).titlu });
  co("mesaj întârziat în coada Discord", "intarziat", { titlu: MC.intarziat("CRV: lichidarea la 6,2%", 34) });
}
