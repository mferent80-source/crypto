// Proba v100.380 (el, 23.11.2026: „vede radarul botul meu spot?” ⇒ botul pornit e un bot de SEMNAL (Pionex „smart_copy”, TradingView,
// BTCUSDT.P, futures 1×), pe care Radarul îl arăta „-/USDT · oprit · GRID (presupus)” cu sfaturi de grid ⇒ „da”, Radarul să-l înțeleagă):
//   A. functions/api/bot-orders.js: botul de semnal tradus în câmpurile lui (moneda din portofoliu, rulează, suma, rezultatul Pionex, poziția),
//      fără câmpurile de grid inventate; tokenul webhook-ului (userSignals) NU pleacă spre pagină
//   B. public/lib/bot-semnal.js (pur): textele (starea, poziția, banda de sus) și schimbările de poziție pentru alertele colectorului
//   C. legăturile: Tabloul în felul „semnal”, Piața azi, banda de sus, colectorul, politica de noapte
// Rulare: node scripts/proba-v100380.mjs
import assert from "node:assert/strict";
import { cuTablou } from "./lib/sursa-app.mjs";
import fs from "node:fs";
import "./lib/text-ro-global.mjs";
import { normalizeaza } from "../functions/api/bot-orders.js";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const BSS = citeste("../public/lib/bot-semnal.js");
const BS = BSS ? new Function(`${BSS}; return BotSemnal;`)() : null;
const APP = cuTablou(citeste("../public/app.js")), HTML = citeste("../public/index.html"), CSS = citeste("../public/app.css"), SW = citeste("../public/sw.js");
const ACE = citeste("../public/lib/acasa-ecran.js"), PVS = citeste("../public/lib/pret-viu.js"), COL = citeste("./colector.mjs"), POL = citeste("./lib/politica-alerte.mjs");

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

// botul LUI din 23.11.2026 20:32, așa cum l-a dat Pionex (id-urile contului scoase; webhook-ul înlocuit cu unul de probă - forma e aceeași)
const ACUM = Date.UTC(2026, 10, 23, 19, 0);
const portofoliu = (o) => Object.assign({ amountShort: "0", buOrderId: "2b4f77e9", signalParam: "{}", profit: "0", closedPrice: null, currentRound: 1, closedQuoteAmount: "0", fundingFee: "0", totalFeeInBase: "0", qtyShort: "0",
  lossStopRatio: "0", closedBaseAmount: "0", maintPrice: "0", profitPositive: "0", signalType: "3a04", percent: "0", initPrice: "61466.35", profitRoundCount: 0, leverage: 1, tradeBase: "BTC.PERP", sharedAmount: "0",
  base: "BTC", amountSettle: "0", currentRoundMonth: "2026_11", expiredAt: null, roundCount: 0, status: null, currentBaseAmount: "0", qtyLong: "0", profitStopRatio: "0", amountLong: "0", totalFeeInQuote: "0" }, o);
const botSemnal = (oP = {}, oD = {}, oB = {}) => Object.assign({ quote: "USDT", closeNote: null, base: "-", createTime: ACUM - 28 * 60000, customizeName: null, copyFrom: null, note: null, copyType: null, buOrderType: "smart_copy",
  userId: "CONT-SECRET", exchange: "pionex.v2", status: "open", canceling: false, keyId: "CHEIE-SECRETA", strategyId: "2660", buOrderId: "2b4f77e9", closeTime: 0,
  buOrderData: Object.assign({ trx24h: 0, convertIntoEarnCoin: false, fundingFee: "0", roundCount24h: 0, kolSignalId: null, initQuotePrice: "1", closedSharedQuote: "0", profit: "0", tradeType: "futures",
    quoteTotalInvestment: "53.59", quoteOriginalInvestment: "53.59", quoteBaseAmount: "53.59", currentQuoteAmount: "53.59", status: "main_loop", signalName: "BTCUSDT.P", market: "perpFutures",
    shareProfitType: "period", shareProfitValue: "168", buOrderId: "2b4f77e9",
    userSignals: { tradingviewConfig: { webhookUrl: "https://www.pionex.com/signal/api/v1/signal_listener/trading_view?token=TOKEN-SECRET-DE-PROBA", message: "{\"data\":{}}" } },
    portfolio: [portofoliu(oP)] }, oD) }, oB);
const HARTA = { "BTC.PERP|USDT": "BTC_USDT_PERP" }, PRETURI = { BTC_USDT_PERP: 87250.5 };

console.log("\nV100.380 · botul de semnal · proba\n");

console.log("A. serverul (bot-orders.js)");
await test("botul de semnal are tipul lui, moneda din portofoliu (nu „-”) și tickerul perp", () => {
  const b = normalizeaza(botSemnal(), PRETURI, HARTA);
  assert.equal(b.tip, "semnal"); assert.equal(b.semnal, "BTCUSDT.P"); assert.equal(b.baza, "BTC.PERP"); assert.equal(b.simbol, "BTC/USDT"); assert.equal(b.simbolPionex, "BTC_USDT_PERP"); assert.equal(b.pretCurent, 87250.5);
});
await test("rulează = pornit la Pionex; «activ» rămâne al GRIDULUI (logica de grid - alerte, Monte Carlo, probe - nu-l ia drept grid)", () => {
  const b = normalizeaza(botSemnal(), PRETURI, HARTA); assert.equal(b.ruleaza, true); assert.equal(b.activ, false);
  assert.equal(normalizeaza(botSemnal({}, {}, { status: "closed", closeTime: ACUM }), PRETURI, HARTA).ruleaza, false);
  assert.equal(normalizeaza(botSemnal({}, {}, { canceling: true }), PRETURI, HARTA).ruleaza, false, "în curs de oprire = nu mai rulează");
});
await test("banii: suma pusă, suma de acum, rezultatul după Pionex (profit; fără el, suma de acum − suma pusă), levierul", () => {
  const b = normalizeaza(botSemnal(), PRETURI, HARTA); assert.equal(b.investit, 53.59); assert.equal(b.sumaAcum, 53.59); assert.equal(b.profitTotal, 0); assert.equal(b.levier, 1);
  assert.equal(normalizeaza(botSemnal({}, { profit: "-1.25", currentQuoteAmount: "52.34" }), PRETURI, HARTA).profitTotal, -1.25);
  const f = normalizeaza(botSemnal({}, { profit: null, currentQuoteAmount: "55.09" }), PRETURI, HARTA); assert.ok(Math.abs(f.profitTotal - 1.5) < 1e-9);
  /* revizia (🟡): cu poziția deschisă, suma de acum poate fi doar USDT-ul rămas (restul stă în poziție) ⇒ fără „profit”, nicio cifră (nu −50) */
  const g = normalizeaza(botSemnal({ qtyLong: "0.0006" }, { profit: null, currentQuoteAmount: "1.5" }), PRETURI, HARTA); assert.equal(g.profitTotal, null); assert.equal(g.rezultatNeverificat, true);
  assert.equal(normalizeaza(botSemnal(), PRETURI, HARTA).rezultatNeverificat, false);
});
await test("poziția: fără ⇒ directie null, pozitie 0; long / short din cantitățile Pionex (qtyLong / qtyShort), cu banii ei (amountLong / amountShort)", () => {
  const f = normalizeaza(botSemnal(), PRETURI, HARTA); assert.equal(f.directie, null); assert.equal(f.pozitie, 0); assert.equal(f.inPozitie, false);
  const l = normalizeaza(botSemnal({ qtyLong: "0.0006", amountLong: "52.1" }), PRETURI, HARTA); assert.equal(l.directie, "long"); assert.equal(l.pozitie, 0.0006); assert.equal(l.pozitieBani, 52.1); assert.equal(l.inPozitie, true);
  const s = normalizeaza(botSemnal({ qtyShort: "0.0006", amountShort: "52.1" }), PRETURI, HARTA); assert.equal(s.directie, "short"); assert.equal(s.pozitie, -0.0006);
  /* revizia (🔴): cantitatea citită hotărăște; banii doar când cantitatea lipsește; cantitatea 0 cu bani > 0 (sau long și short deodată) = NECLAR, fără direcție */
  const a = normalizeaza(botSemnal({ qtyLong: "0", qtyShort: "0", amountLong: "52.1" }), PRETURI, HARTA); assert.equal(a.directie, null); assert.equal(a.pozitieNeclara, true); assert.equal(a.pozitie, null);
  const a2 = normalizeaza(botSemnal({ qtyLong: null, qtyShort: null, amountLong: "52.1" }), PRETURI, HARTA); assert.equal(a2.directie, "long", "fără cantitate, banii spun direcția"); assert.equal(a2.pozitie, null, "cantitatea necunoscută rămâne lipsă, nu 0"); assert.equal(a2.pozitieNeclara, false);
  const a3 = normalizeaza(botSemnal({ qtyLong: "0.0006", qtyShort: "0.0002" }), PRETURI, HARTA); assert.equal(a3.directie, null); assert.equal(a3.pozitieNeclara, true);
});
await test("nimic de grid inventat: gridul, grilele, lichidarea și prețul de intrare rămân lipsă (Pionex nu le dă la botul de semnal); fără avertismente de grid", () => {
  const b = normalizeaza(botSemnal({ qtyLong: "0.0006" }), PRETURI, HARTA);
  for (const k of ["gridJos", "gridSus", "gridProfitBrut", "ordinePerechi", "pretLichidare", "distantaLichidarePct", "pretDeschidere", "opritorPierdere", "opritorProfit"]) assert.equal(b[k], null, k);
  assert.deepEqual(b.avertismente, []); assert.equal(b.motivFaraDistanta, "semnal");
});
await test("rundele (câte intrări a făcut și câte pe plus), prețul de la pornire și funding-ul, din portofoliu", () => {
  const b = normalizeaza(botSemnal({ roundCount: 5, profitRoundCount: 2, currentRound: 6, fundingFee: "-0.012" }), PRETURI, HARTA);
  assert.equal(b.runde, 5); assert.equal(b.rundePePlus, 2); assert.equal(b.pretPornire, 61466.35); assert.equal(b.finantare, -0.012);
});
await test("🔒 tokenul webhook-ului NU pleacă spre pagină: răspunsul brut fără userSignals (cine are adresa poate trimite semnale botului)", () => {
  const b = normalizeaza(botSemnal(), PRETURI, HARTA), j = JSON.stringify(b);
  assert.ok(!/TOKEN-SECRET|signal_listener|webhookUrl|userSignals/.test(j), "webhook-ul a rămas în răspuns"); assert.ok(!/CONT-SECRET|CHEIE-SECRETA/.test(j));
  assert.equal(b.brut.buOrderData.signalName, "BTCUSDT.P", "restul răspunsului brut rămâne"); assert.equal(b.brut.buOrderData.portfolio[0].tradeBase, "BTC.PERP");
});
await test("fără portofoliu (formă necunoscută) ⇒ moneda din base, fără poziție, fără să crape", () => {
  const b = normalizeaza(botSemnal({}, { portfolio: [] }, { base: "SOL" }), {}, null); assert.equal(b.tip, "semnal"); assert.equal(b.baza, "SOL"); assert.equal(b.directie, null); assert.equal(b.pozitie, null);
  const c = normalizeaza(botSemnal({}, { portfolio: null }, { base: "-" }), {}, null); assert.equal(c.baza, null, "„-” nu e o monedă"); assert.equal(c.simbolPionex, null);
});
await test("botul de GRID iese neschimbat (aceleași câmpuri, aceleași valori)", () => {
  const g = { strategyId: "9", base: "JTO.PERP", quote: "USDT", status: "running", buOrderType: "futures_grid", createTime: ACUM - 3600000, buOrderData: { status: "running", trend: "long", bottom: "1", top: "2", usdtInvestment: "50", marginBalance: "51", totalRealizedProfit: "1", totalFee: "-0.1", totalFundingFee: "0", gridProfit: "1.1", leverage: "3", position: "10", positionOpenPrice: "1.5" } };
  const b = normalizeaza(g, { JTO_USDT_PERP: 1.6 }, null);
  assert.equal(b.tip, undefined); assert.equal(b.activ, true); assert.equal(b.gridJos, 1); assert.equal(b.profitNet, 1); assert.equal(b.baza, "JTO.PERP"); assert.equal(b.simbolPionex, "JTO_USDT_PERP");
});

console.log("\nB. modulul BotSemnal (pur)");
const N = (oP, oD, oB) => normalizeaza(botSemnal(oP, oD, oB), PRETURI, HARTA);
await test("modulul există și recunoaște doar botul de semnal", () => { assert.ok(BS, "public/lib/bot-semnal.js lipsește"); assert.equal(BS.eSemnal(N()), true); assert.equal(BS.eSemnal({ tip: undefined, activ: true }), false); assert.equal(BS.eSemnal(null), false); });
await test("starea: fără poziție / LONG cu cantitatea și banii / SHORT / oprit", () => {
  assert.deepEqual(BS.stare(N()), { cod: "fara", titlu: "fără poziție", sub: "așteaptă semnalul din TradingView", ton: "gri" });
  const l = BS.stare(N({ qtyLong: "0.0006", amountLong: "52.14" })); assert.equal(l.cod, "long"); assert.equal(l.titlu, "LONG"); assert.equal(l.sub, "0,0006 BTC · 52,1 USDT"); assert.equal(l.ton, "sus");
  assert.equal(BS.stare(N({ qtyShort: "0.0006" })).titlu, "SHORT"); assert.equal(BS.stare(N({}, {}, { canceling: true })).cod, "oprit");
  const nc = BS.stare(N({ qtyLong: "0", qtyShort: "0", amountLong: "52.1" })); assert.equal(nc.cod, "neclar"); assert.match(nc.sub, /verifică în aplicația Pionex/);
});
await test("numele și banda de sus: „BTC semnal 1× · fără poziție”, „BTC semnal 1× · LONG 0,0006 BTC”", () => {
  assert.equal(BS.nume(N()), "BTC semnal 1×"); assert.equal(BS.textBanda(N()), "BTC semnal 1× · fără poziție"); assert.equal(BS.textBanda(N({ qtyLong: "0.0006" })), "BTC semnal 1× · LONG 0,0006 BTC");
});
await test("cardul din Tablou: semnalul, poziția, rezultatul cu o zecimală (fără „−0,0”), intrările, de când merge; spune că nu e grid", () => {
  const h = BS.cardHtml(N({ roundCount: 3, profitRoundCount: 1 }, { profit: "-0.04" }), (x) => String(x), { acum: ACUM });
  assert.match(h, /Botul de semnal · BTC/); assert.match(h, /TradingView „BTCUSDT\.P”/); assert.match(h, /fără poziție/); assert.match(h, />0,0</); assert.ok(!/−0,0/.test(h));
  assert.match(h, /pe plus 1 din 3/); assert.match(h, /acum 28 min/); assert.match(h, /BTC perpetual · levier 1× · prețul la pornire 61\.466,35/); assert.match(h, /Nu e un bot de grid/);
  assert.equal(BS.cardHtml({ activ: true }, String, {}), "", "botul de grid nu primește cardul");
  const hp = BS.cardHtml(N({ qtyLong: "0.0006" }, { profit: "0.3" }), (x) => String(x), { acum: ACUM }); assert.match(hp, /Pionex dă doar încasatul; poziția o adaugă Radarul/);   /* v100.396 (revizia, I-967): verificat pe viu 27.11 - „profit” e doar încasatul */
  const hf = BS.cardHtml(N({}, { quoteTotalInvestment: null, quoteOriginalInvestment: null }), (x) => String(x), { acum: ACUM }); assert.ok(!/<span class="tbSub"> · /.test(hf), "rândul de sub cifră nu începe cu „ · ”");
});
await test("schimbările de poziție: prima citire doar fixează; intrat / ieșit / întors / mărit / micșorat; fără schimbare ⇒ nimic", () => {
  let r = BS.schimbare(null, N(), 1); assert.equal(r.ev, null); assert.equal(r.ref.d, null);
  assert.equal(BS.schimbare(null, N({ qtyLong: "0.0006" }), 1).ev, null, "prima citire, chiar în poziție, doar fixează (fără alertă)");
  r = BS.schimbare(r.ref, N({ qtyLong: "0.0006" }), 2); assert.equal(r.ev, "intrat"); assert.equal(r.ref.n, 1);
  r = BS.schimbare(r.ref, N({ qtyLong: "0.0006" }), 3); assert.equal(r.ev, null);
  r = BS.schimbare(r.ref, N({ qtyLong: "0.0009" }), 4); assert.equal(r.ev, "marit");
  r = BS.schimbare(r.ref, N({ qtyLong: "0.0003" }), 5); assert.equal(r.ev, "micsorat");
  r = BS.schimbare(r.ref, N({ qtyShort: "0.0006" }), 6); assert.equal(r.ev, "intors");
  r = BS.schimbare(r.ref, N(), 7); assert.equal(r.ev, "iesit"); assert.equal(r.ref.n, 5); assert.equal(r.ant.d, "short");
  const k = BS.schimbare(r.ref, N({}, {}, { canceling: true }), 8); assert.equal(k.ev, null, "oprirea nu e o ieșire din poziție");
  /* revizia: poziția neclară nu dă nicio alertă și nu mută referința */
  const l1 = BS.schimbare(null, N({ qtyLong: "0.0006" }), 1), l2 = BS.schimbare(l1.ref, N({ qtyLong: "0", qtyShort: "0", amountLong: "52" }), 2); assert.equal(l2.ev, null); assert.equal(l2.ref.d, "long");
  /* revizia (🔵): o intrare și o ieșire între două citiri ⇒ rundele au crescut fără schimbare de poziție ⇒ „runda” */
  const q1 = BS.schimbare(null, N({ roundCount: 2 }), 1), q2 = BS.schimbare(q1.ref, N({ roundCount: 3 }), 2); assert.equal(q2.ev, "runda"); assert.equal(BS.schimbare(q2.ref, N({ roundCount: 3 }), 3).ev, null);
});
await test("alertele: intrarea, ieșirea și întoarcerea pe Discord, cu prețul și rezultatul pe poziție; mărirea doar în Radar; cheie nouă la fiecare eveniment", () => {
  const r0 = BS.schimbare(null, N({}, { profit: "0.5" }), 1), r1 = BS.schimbare(r0.ref, N({ qtyLong: "0.0006", amountLong: "52.1" }, { profit: "0.5" }), 2);
  const m1 = BS.mesaj(r1, N({ qtyLong: "0.0006", amountLong: "52.1" }, { profit: "0.5" }));
  assert.equal(m1.titlu, "BTC semnal: a intrat LONG · prețul acum 87.250,50"); assert.match(m1.mesaj, /0,0006 BTC · 52,1 USDT · rezultatul botului: \+0,5 USDT până acum · semnal TradingView „BTCUSDT\.P”/); assert.ok(!m1.doarRadar);
  assert.equal(m1.cheie, "semnal-intrat-2660-2", "cheia poartă ora evenimentului (după o repornire nu se repetă una de dinainte)");
  const r1b = BS.schimbare(r1.ref, N({ qtyLong: "0.0006", amountLong: "52.1" }, { profit: "0.9" }), 2.5); assert.equal(r1b.ev, null);   /* o citire pe drum: rezultatul se mișcă, poziția nu */
  const r2 = BS.schimbare(r1b.ref, N({}, { profit: "1.75" }), 3), m2 = BS.mesaj(r2, N({}, { profit: "1.75" }));
  assert.equal(m2.titlu, "BTC semnal: a ieșit din LONG · prețul acum 87.250,50"); assert.match(m2.mesaj, /rezultatul botului: \+1,8 USDT \(pe poziția asta \+1,3\)/); assert.equal(m2.cheie, "semnal-iesit-2660-3");
  const q1 = BS.schimbare(null, N({ roundCount: 2 }, { profit: "1" }), 1), q2 = BS.schimbare(q1.ref, N({ roundCount: 3 }, { profit: "0.4" }), 2), mq = BS.mesaj(q2, N({ roundCount: 3 }, { profit: "0.4" }));
  assert.equal(mq.titlu, "BTC semnal: o intrare și o ieșire între două citiri"); assert.match(mq.mesaj, /rezultatul botului: \+0,4 USDT \(pe runda asta −0,6\)/); assert.ok(!mq.doarRadar);
  const r3 = BS.schimbare(r1.ref, N({ qtyLong: "0.0009" }, { profit: "0.5" }), 3); assert.equal(BS.mesaj(r3, N({ qtyLong: "0.0009" })).doarRadar, true);
  assert.equal(BS.mesaj({ ev: null }, N()), null);
});
await test("oprirea botului: mesajul de la sfârșit, cu rezultatul, suma pusă, cât a ținut și intrările", () => {
  const x = N({ roundCount: 4, profitRoundCount: 3 }, { profit: "2.04" }, { status: "closed", closeTime: ACUM + 5 * 3600000 });
  const m = BS.mesajInchis(x); assert.equal(m.titlu, "BTC semnal: botul s-a oprit · +2,0 USDT"); assert.equal(m.mesaj, "din 53,6 USDT puși · a ținut 5 ore · 4 intrări, 3 pe plus"); assert.equal(m.cheie, "semnal-oprit-2660");
});
await test("🔒 poza de pe disc (pentru verificarea câmpurilor Pionex) are doar cifre și texte scurte - fără webhook, fără token", () => {
  const b = N({ qtyLong: "0.0006" }); b.brut.buOrderData.userSignals = { tradingviewConfig: { webhookUrl: "https://x/?token=T" } }; b.brut.buOrderData.alt = "https://x/?token=T2";
  b.brut.buOrderData.campNou = "secret-scurt"; b.brut.buOrderData.portfolio[0].altCamp = "x";
  const o = BS.poza(b, 5), j = JSON.stringify(o); assert.ok(!/token|https?:|secret-scurt|altCamp/.test(j), j.slice(0, 200)); assert.equal(o.p.qtyLong, "0.0006"); assert.equal(o.bot.currentQuoteAmount, "53.59"); assert.equal(o.t, 5);
});

console.log("\nC. legăturile");
await test("modulul e încărcat de pagină, ținut de service worker și încărcat de colector", () => { assert.ok(HTML.includes('<script src="/lib/bot-semnal.js"></script>')); assert.ok(SW.includes('"/lib/bot-semnal.js"')); assert.ok(COL.includes('incarca("bot-semnal.js", "BotSemnal")')); });
await test("Tabloul: cardul #tbSemnalCard după cardul „fără bot”, felul „semnal” pe panou, eticheta „SEMNAL”, fără „oprit” la botul care rulează", () => {
  assert.ok(HTML.indexOf('id="tbSemnalCard"') > HTML.indexOf('id="tbFaraBotCard"') && HTML.indexOf('id="tbSemnalCard"') < HTML.indexOf('id="tbGridLarg"'));
  const r = APP.slice(APP.indexOf("function renderTabloBot("), APP.indexOf("function renderTabloBot(") + 9000);
  assert.ok(/classList\.toggle\("tbSemnal",semnalTb\)/.test(r)); assert.ok(/BotSemnal\.cardHtml\(b,escapeHtml/.test(r)); assert.ok(/semnalTb\?"SEMNAL · TradingView"/.test(r)); assert.ok(/semnalTb\?\(b\.ruleaza\?"pornit":"oprit"\)/.test(r));
});
await test("Tabloul în felul „semnal” ascunde doar ce ține de grid (verdictul, cifrele de grid, Drumul, Consilierul, Monte Carlo, planul, riscul, fișa) și lasă graficul, mișcarea, trendul, piața, banii, jurnalul", () => {
  for (const sel of ["#pzVerdict", "#ctAcum", ".tbSus", "#tbKpiDetalii", "#pzDrumCard", "#tbGridLarg", "#tbSemaforCard", "#tbConcret", "#tbMcSus", "#tbAcumCard", "#tbCap-decizia", "#tbCap-risc", "#tbPl-plan", "#tbPl-sfaturi", "#tbPl-prob", "#tbPl-risc", "#tbPl-fisa", "#tbPl-sapt", ".tbGrilaNoua", "#tbGridNou", "#tbDetalii", "#tbSimBtn", "#tbSchimbaModulBtn", "#tbTodo"])
    assert.ok(new RegExp("#tabloubot\\.tbSemnal [^{]*" + sel.replace(/[.#-]/g, (c) => "\\" + c) + "[,{]").test(CSS), "ascuns: " + sel);
  for (const sel of ["#tbGraficCard", "#tbMiscare", "#tbTrendCard", ".piataAzi", ".contTot", "#tbPl-alerte", "#tbCap-jurnal", "#tbCap-bani"]) assert.ok(!new RegExp("#tabloubot\\.tbSemnal [^{]*" + sel.replace(/[.#-]/g, (c) => "\\" + c) + "[,{]").test(CSS), "rămâne: " + sel);
});
await test("banda de sus pe botul de semnal: numele și poziția lui, fără „lichidare —” și fără gridul inexistent", () => { assert.ok(/BotSemnal\.textBanda\(b\)/.test(PVS)); assert.ok(/if \(BS\) return \{ parti: parti/.test(PVS) || /eSemnal/.test(PVS)); });
await test("fâșia de sus, fără boți de grid: botul de semnal și rezultatul lui, nu „niciunul”; trendul spune „BTC semnal 1× · fără poziție”, nu „botul e ?”; vârsta sub o oră în minute", () => {
  const AP = citeste("../public/lib/asezare-paznic.js"); assert.ok(/x\.tip === "semnal" && x\.ruleaza/.test(AP) && /"botul de semnal"/.test(AP));
  assert.ok(/b\.tip==="semnal"&&typeof BotSemnal!=="undefined"\?BotSemnal\.textBanda\(b\):"botul e "/.test(APP)); assert.ok(APP.includes('function tbMiVarsta(ms){var h=ms/3600000;return h<1?Math.max(1,Math.round(ms/60000))+" min"'));
});
await test("Piața azi: boții de semnal porniți au rândul lor în „Boții tăi” (nu „niciun bot pornit”); fără boți de grid, „ultimul închis” rămâne", () => { assert.ok(/BotSemnal\.randAcasa\(/.test(ACE)); assert.ok(/tip === "semnal" && b\.ruleaza/.test(ACE));
  assert.ok(ACE.includes(`else if (boti && !act.length && !sem.length) hb += '<p class="acMut">Niciun bot pornit acum.</p>' + acUltimInchis(`) && ACE.includes(`else if (boti && !act.length) hb += acUltimInchis(`)); });
await test("colectorul: tura boților de semnal (schimbările de poziție, poza pe disc, oprirea) și noaptea intrările așteaptă rezumatul de la 08:00", () => {
  assert.ok(/async function turaSemnale\(/.test(COL)); assert.ok(/try \{ await turaSemnale\(boti, acum\); \}/.test(COL), "tura e chemată în tura colectorului");
  assert.ok(COL.includes('if (schimbat) { try { scrieStare(); }'), "starea se scrie la orice schimbare");
  const BO = citeste("../functions/api/bot-orders.js"); assert.ok(BO.includes('const grid=bots.filter(b=>b.tip!=="semnal");') && /grid\.some\(b=>b\[camp\]===null\)/.test(BO) && /grid\.reduce\(/.test(BO), "sumarul de grid fără botul de semnal"); assert.ok(/BotSemnal\.schimbare\(/.test(COL) && /BotSemnal\.mesaj\(/.test(COL) && /BotSemnal\.mesajInchis\(/.test(COL) && /BotSemnal\.poza\(/.test(COL)); assert.ok(/semnal-brut\.jsonl/.test(COL));
  assert.ok(/\[\/\^semnal-(\(\?!oprit\))?\/, "semnal"\]/.test(POL));   /* v100.396 (I-943): „semnal-oprit” pleacă imediat - comportamentul îl probează proba v100396 C4 */ assert.ok(/semnal: \["intrare \/ ieșire a botului de semnal"/.test(POL));
  const t = COL.slice(COL.indexOf("async function turaSemnale("), COL.indexOf("async function turaSemnale(") + 3500);
  assert.ok(/vii\[b\.id\] = true;\s*\r?\n\s*if \(!b\.ruleaza\) continue;/.test(t), "botul prezent în listă (chiar oprit) nu se caută printre cei închiși"); assert.ok(/scrieStare\(\)/.test(t), "starea urmărită se scrie pe disc");
  /* revizia (🟡): pe calculator rândul de avertismente nu se mută în cifrele de grid ascunse */
  assert.ok(/semnalAv=tbStare\.bot&&tbStare\.bot\.tip==="semnal"/.test(APP) && /if\(lat&&sus&&!faraBot&&!semnalAv\)/.test(APP));
});

console.log("\nD. versiunea");
await test("v100.380 e pusă peste tot, colectorul v101.211, proba e în lanț după v100.379", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json"));
  /* v100.381: „de la 380 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.381) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 380, "package.json: de la 100.380 încolo"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 380); assert.ok(bi.li380 && bi.li380.length > 200, "BUILD_INFO.li380");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 380).length >= 4, true, "index.html: v100.380 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(SW) || [])[1] >= 380, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 380, "versiune.js"); assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(COL) || [])[1] >= 211, "colectorul de la v101.211 încolo");
  assert.match(pk.scripts.test, /npm run test:v100379 && npm run test:v100380/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100380"], "node scripts/proba-v100380.mjs");
});

console.log(`\n${teste - picate} / ${teste} teste trec.\n`);
process.exit(picate ? 1 : 0);
