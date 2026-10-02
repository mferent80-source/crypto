// Garda textelor, grupul „alerte” (v100.66, specul „sfaturi concise”, pachetul 3): genereaza TOATE alertele, pe fiecare ramura,
// cu modulele adevarate - Alerte (public/lib/alerte.js, din garda-texte.mjs), TabloExtra.fisaInchidere, mesajele colectorului
// (scripts/lib/mesaje-colector.mjs), avertizarea la pornire, alertele simbolurilor si SL/TP (poza.mjs), retetele, funding-ul pietei.
// Textele de baza care vin din pachetele 4 si 5 (istoricul monedei, funding-ul pietei, raportul) sunt fixturi: aici se verifica invelisul.
import * as MC from "./mesaje-colector.mjs";
import { alerteSimboluri, alerteSLTP } from "./poza.mjs";
import { mesajReteta } from "./tura-scan.mjs";
import { mesajFundingPiata } from "./tura-piata.mjs";
import { mesajPornire } from "./tura-pornire.mjs";

const T0 = Date.UTC(2026, 9, 1, 16, 0), ORA = 3600000, ZI = 86400000;
const AL = [["titlu", "alertaTitlu"], ["mesaj", "alertaMesaj"]], RAP = [["titlu", "alertaTitlu"], ["mesaj", "raport"]];

export function situatiiAlerte(pune) {
  const A = globalThis.Alerte, TE = globalThis.TabloExtra;
  // botul CRV al lui (long, 0.3841-0.4331); LIGHTER pe short; BTC cu preturi de 5 cifre; PUMP sub 0,01
  const CRV = (o) => Object.assign({ baza: "CRV.PERP", directie: "long", pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30, pretLichidare: 0.3382876201448984,
    investit: 49.67, levier: 5, pornitLa: T0 - 4 * ZI }, o || {});
  const LIT = (o) => Object.assign({ baza: "LIGHTER.PERP", directie: "short", pretCurent: 4.912, gridJos: 4.2, gridSus: 5.1, distantaLichidarePct: 25, pretLichidare: 6.1234,
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
  const sem = { semafor: { nivel: "iesi", cod: "lichidare", motiv: "Lichidarea la 6,2%", faCe: "Aș adăuga marjă sau aș închide botul acum.", deCe: "Sub 8% e zona de ieșire." },
    iaProfit: { text: "Botul e pe plus cu +4,20 USDT, iar mișcarea contra a început." }, muta: { motiv: "prețul stă lângă marginea de jos", deCe: "De 2 zile prețul e sub mijlocul gridului.", des: true,
      setare: { jos: 0.37, sus: 0.40, grile: 6, levier: 4 }, treceriZi: 3.4 }, btc: { text: "BTC în mișcare (1,9× obișnuitul lui), moneda botului încă liniștită." },
    aglomerare: { nivel: "atentie", text: "Funding +0,060% și 2,1 long la 1 short: mulțimea e pe partea botului." } };
  al("semnalele: IEȘI, încasează, mută gridul, BTC, aglomerare", CRV(), { semnale: sem }, null, ["s-iesi", "s-ia-profit", "s-muta", "s-btc", "s-aglomerare"]);
  al("mediul: BTC contra și funding mare", CRV(), { mediu: [{ k: "btc", ton: "rau", text: "pe 4 ore coboară (−2,1%), iar botul e long" }, { k: "funding", ton: "atentie", text: "+0,060% la 8 ore, de 4× obișnuitul" }] }, null, ["m-btc", "m-funding"]);
  al("mediul: din nou normal", CRV(), { mediu: [{ k: "btc", ton: "bine", text: "pe 4 ore urcă (+1,2%)" }, { k: "funding", ton: "bine", text: "+0,010% la 8 ore" }] }, null, ["m-btc", "m-funding"]);
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
  let sv = A.schimbareVreme(null, { crypto: { nivel: "liniste" }, bursa: { nivel: "larga" }, corelatie: { r: 0.2 } }, T0).stare;
  const v1 = { crypto: { nivel: "miscare", eticheta: "mișcare", titlu: "Crypto a intrat în mișcare: BTC 1,9× obișnuitul pe 4 h.", faCe: "n-aș porni boți noi azi." }, bursa: { nivel: "scade", eticheta: "scade", titlu: "Nasdaq scade: −1,8% azi.", faCe: "aș aștepta închiderea." }, corelatie: { r: 0.62 } };
  sv = A.schimbareVreme(sv, v1, T0 + 600000).stare;
  for (const m of A.schimbareVreme(sv, v1, T0 + 1200000).mesaje) pune("vremea pieței: " + m.cheie, "alerte", m.cheie === "vreme-corelatie" ? "schimbareVreme.corelatie" : "schimbareVreme.crypto", m, AL);

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

  // avertizarea la pornire (textul de baza vine din Obiceiuri - pachetul 5), retetele scanului, funding-ul pietei
  pune("bot nou pe o monedă unde pierzi", "alerte", "pornire.mesaj", mesajPornire({ id: "b1" }, "LIGHTER", { text: "Pe LIGHTER ai închis 12 boți, net −57,30 USDT." },
    { text: "Boții închiși în prima oră: 34, net −21,40 USDT." }, "LIT", "https://mau.tail9144fe.ts.net:8443/#ecran=gridset&moneda=LIT"), AL);
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
  co("botul n-are plan, cu propunere", "faraPlan", MC.faraPlan("CRV", { plus: 2.6, minus: 7.6, afaraOre: 12, nota: "după planul tău de la CRV" }));
  co("botul n-are plan, fără propunere", "faraPlan", MC.faraPlan("CRV", null));
  co("gridul îngust a ajuns la durata probată", "ceasIngust", MC.ceasIngust("CRV", 6, "14:30", false));
  co("gridul îngust, mesaj întârziat", "ceasIngust", MC.ceasIngust("CRV", 6, "14:30", true));
  co("Trading 212 nu mai răspunde (cheia)", "t212Rau", MC.t212Rau(18, 401, "HTTP 401"));
  co("Trading 212 răspunde din nou", "t212DinNou", MC.t212DinNou());
  co("o acțiune peste 20% din cont", "pondereT212", MC.pondereT212("NVDA", 0.236));
  co("perechile pe oră", "perechiOra", MC.perechiOra("CRV", 3, 0.42));
  co("frâna contului", "frana", MC.frana("Azi ai închis 3 boți pe minus, −24,10 USDT, peste pragul de −20."));
  co("alertele sunt legate", "legat", MC.legat());
  co("raportul de duminică (titlul)", "raport", { titlu: MC.raport("2026-09-27", ["—"]).titlu });
  co("autopsia acțiunilor (titlul)", "autopsie", { titlu: MC.autopsie("2026-09-27", ["—"]).titlu });
  co("mesaj întârziat în coada Discord", "intarziat", { titlu: MC.intarziat("CRV: lichidarea la 6,2%", 34) });
}
