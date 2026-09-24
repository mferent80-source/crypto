import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/tablou-bot.js", import.meta.url), "utf8");
const T = new Function(`${SRC}; return TabloBot;`)();

// Ceas fix, aliniat pe o granita de minut, pentru probele care ating
// istoricAdauga (decimare pe galeti de minut). Fara Date.now() aici - altfel
// proba trece sau pica dupa secunda in care ruleaza, in functie de faza
// ceasului real fata de granita de minut.
const ACUM = 1790000000000 - (1790000000000 % 60000);

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

console.log("\nV73 · tabloul botului · proba");

await test("traduce simbolul botului pentru ambele burse", () => {
  const s = T.simboluri("COTI.PERP", "USDT");
  assert.equal(s.pionex, "COTI_USDT_PERP");
  assert.equal(s.binance, "COTIUSDT");
});

await test("un simbol fara .PERP ramane pereche simpla", () => {
  const s = T.simboluri("COTI", "USDT");
  assert.equal(s.pionex, "COTI_USDT");
  assert.equal(s.binance, "COTIUSDT");
});

const BOT = {
  strategyId: "2377", base: "COTI.PERP", quote: "USDT",
  createTime: Date.now() - 5 * 3600000,
  buOrderData: {
    status: "running", bottom: "0.0153", top: "0.0158", row: 25,
    trend: "long", leverage: 5, position: "20628",
    gridProfit: "2.30", totalFee: "-0.45", totalRealizedProfit: "1.00",
    exchangeOrderPairedCount: 42,
    estimateLiquidationPriceDown: "0.0124", estimateLiquidationPriceUp: "0",
    riskStatus: "TRADING", marginStatus: "NORMAL",
  },
};
// 48 de lumanari care oscileaza: zigzag curat, eficienta aproape de zero.
// Cu mustati (high/low in jurul lui close) - Task 4 al revizei finale:
// amplitudinea trebuie sa foloseasca ATR adevarat, nu doar |delta close|.
const ZIGZAG = Array.from({ length: 48 }, (_, i) => {
  var c = i % 2 ? 0.0156 : 0.0154;
  return { close: c, high: c + 0.00003, low: c - 0.00003 };
});
// 48 de lumanari care urca drept: eficienta 1
const TREND = Array.from({ length: 48 }, (_, i) => ({ close: 0.0150 + i * 0.00002 }));
const ISTORIC = Array.from({ length: 400 }, (_, i) => ({
  t: Date.now() - (400 - i) * 60000, perechi: i, pretPerp: 0.0155, pretSpot: 0.0155,
}));
const INTRARI = { bot: BOT, klinePerp: ZIGZAG, pretSpot: 0.0155, istoric: ISTORIC, acum: Date.now() };

// --- Task 5 al revizei finale: pretul de verdict era vechi de pana la ~10
// minute (inchiderea ultimei lumanari de 5m, cache 300s pe ruta). Ruta are
// deja pretul viu din tickere - masoara() trebuie sa-l prefere cand exista.

await test("[revizie] pretPerpViu (tickerul live) bate inchiderea lumanarii", () => {
  const m = T.masoara({ ...INTRARI, pretPerpViu: 0.01700 });
  assert.equal(m.pretPerp, 0.01700, "pretPerp trebuie sa fie pretul viu, nu ultima inchidere de lumanare");
});

await test("[revizie] fara pretPerpViu, ramane inchiderea ultimei lumanari (compatibil)", () => {
  const m = T.masoara(INTRARI);
  assert.equal(m.pretPerp, 0.0156, "fara pret viu, cade inapoi pe ultima inchidere din klinePerp");
});

await test("[revizie] pretPerpViu nenumeric cade inapoi pe lumanari, nu crapa", () => {
  const m = T.masoara({ ...INTRARI, pretPerpViu: "nu-e-numar" });
  assert.equal(m.pretPerp, 0.0156);
});

await test("pozitia in interval se socoteste in procente", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.01555 }) });
  assert.ok(Math.abs(m.pozitieInterval.valoare - 50) < 1,
    `pozitia gresita: ${m.pozitieInterval.valoare}`);
  assert.equal(m.pozitieInterval.stare, "bine");
});

await test("pozitia lipita de marginea de sus e raportata ca margine", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.01577 }) });
  assert.equal(m.pozitieInterval.stare, "margine", `stare: ${m.pozitieInterval.stare}`);
});

await test("pretul iesit din interval e raportat ca afara", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0161 }) });
  assert.equal(m.pozitieInterval.stare, "afara");
  assert.ok(m.pozitieInterval.valoare > 100);
});

await test("zigzagul da eficienta mica, trendul o da mare", () => {
  const z = T.masoara({ ...INTRARI, klinePerp: ZIGZAG });
  const t = T.masoara({ ...INTRARI, klinePerp: TREND });
  assert.ok(z.eficienta.valoare < 0.30, `zigzag: ${z.eficienta.valoare}`);
  assert.ok(t.eficienta.valoare > 0.60, `trend: ${t.eficienta.valoare}`);
  assert.equal(t.eficienta.semn, 1, "trendul urca, semnul trebuie sa fie +1");
});

await test("amplitudinea se raporteaza la treapta grilei (ATR adevarat, cu mustati)", () => {
  const m = T.masoara(INTRARI);
  // treapta = (0.0158 - 0.0153) / 25 = 0.00002
  // ZIGZAG alterneaza 0.0154/0.0156 (delta close 0.0002) cu mustati de 0.00003
  // in fiecare parte => true range pe fiecare pas = 0.0002 + 0.00003 = 0.00023
  // => amplitudine medie ATR = 0.00023 => raport = 0.00023 / 0.00002 = 11.5
  assert.ok(Math.abs(m.amplitudine.valoare - 11.5) < 0.01,
    `amplitudine gresita: ${m.amplitudine.valoare}, asteptat ~11.5`);
});

await test("[revizie] amplitudinea foloseste high/low, nu doar |delta close|", () => {
  // 20 de lumanari cu close PLAT (delta 0) dar mustati mari: formula veche
  // (doar |delta close|) ar fi dat amplitudine 0 => "rau". ATR adevarat vede
  // oscilatia din mustati si da "bine" - exact bug-ul masurat in revizie:
  // media |delta close| 0.004 (rau) vs ATR adevarat 0.011 (bine).
  const plate = Array.from({ length: 20 }, () => ({ close: 0.0155, high: 0.01553, low: 0.01547 }));
  const m = T.masoara({ ...INTRARI, klinePerp: plate });
  // treapta = 0.00002; ATR = max(h-l, |h-prevClose|, |l-prevClose|) = 0.00006 => raport 3.0
  assert.ok(Math.abs(m.amplitudine.valoare - 3.0) < 0.01,
    `amplitudine gresita: ${m.amplitudine.valoare}, asteptat ~3.0 (nu 0)`);
  assert.equal(m.amplitudine.stare, "bine", "vechea formula ar fi dat rau (amplitudine 0)");
});

await test("[revizie] amplitudinea sare o lumanare fara high/low, nu ghiceste si nu crapa", () => {
  const cuGaura = ZIGZAG.slice(0, -1).concat({ close: 0.0157 }); // ultima, fara high/low
  const m = T.masoara({ ...INTRARI, klinePerp: cuGaura });
  assert.ok(Number.isFinite(m.amplitudine.valoare), `nu trebuie sa crape sau sa dea null: ${m.amplitudine.valoare}`);
});

// --- Task 9 al revizei finale: minuteLaMargine, socotit din istoric ---
const PRET_MARGINE = 0.01577; // ~94% din interval (0.0153..0.0158) - "margine" de sus
const KLINE_MARGINE = ZIGZAG.concat({ close: PRET_MARGINE, high: PRET_MARGINE, low: PRET_MARGINE });
function istoricLaMargine(minuteLaMargine, pretInainte) {
  var out = [], t0 = Date.now() - (minuteLaMargine + 60) * 60000, mi = 0;
  for (; mi < 60; mi++) out.push({ t: t0 + mi * 60000, perechi: mi, pretPerp: pretInainte, pretSpot: pretInainte });
  for (var j = 0; j <= minuteLaMargine; j++, mi++) out.push({ t: t0 + mi * 60000, perechi: mi, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE });
  return out;
}

await test("masoara: minuteLaMargine numara timpul CONTINUU petrecut la margine", () => {
  const ist = istoricLaMargine(20, 0.0155);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ist[ist.length - 1].t, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE });
  assert.ok(Math.abs(m.pozitieInterval.minuteLaMargine - 20) < 1.5,
    `minuteLaMargine: ${m.pozitieInterval.minuteLaMargine}, asteptat ~20`);
});

await test("masoara: minuteLaMargine se rupe daca pretul a iesit din banda intre timp", () => {
  // 60 minute la margine, apoi 3 minute in mijlocul intervalului, apoi 26 la margine
  var t0 = Date.now() - 88 * 60000, out = [], mi = 0;
  for (; mi < 60; mi++) out.push({ t: t0 + mi * 60000, perechi: mi, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE });
  for (var j = 0; j < 3; j++, mi++) out.push({ t: t0 + mi * 60000, perechi: mi, pretPerp: 0.0155, pretSpot: 0.0155 });
  for (; mi <= 88; mi++) out.push({ t: t0 + mi * 60000, perechi: mi, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE });
  const m = T.masoara({ ...INTRARI, istoric: out, acum: out[out.length - 1].t, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE });
  assert.ok(m.pozitieInterval.minuteLaMargine < 30,
    `ar trebui sa numere doar de la ultima intrerupere (~25 min), nu 88; a dat ${m.pozitieInterval.minuteLaMargine}`);
});

await test("[revizie] end-to-end: REGLEAZA pe margine NU se aprinde sub 30 de minute", () => {
  const ist = istoricLaMargine(20, 0.0155);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ist[ist.length - 1].t, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE });
  const v = T.verdict(m, "GRID");
  assert.notEqual(v.nivel, "REGLEAZA", `sub 30 minute nu are voie sa dea REGLEAZA (a dat ${v.nivel})`);
});

await test("[revizie] end-to-end: REGLEAZA pe margine se aprinde dupa 30 de minute continue", () => {
  const ist = istoricLaMargine(35, 0.0155);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ist[ist.length - 1].t, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE });
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "pozitieInterval");
});

await test("fara `row` amplitudinea spune ca nu se poate, nu ghiceste", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, row: undefined } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.amplitudine.stare, "nu-se-poate");
  assert.equal(m.amplitudine.valoare, null);
});

await test("lichidarea la ~20% distanta e raportata bine", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "80", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 20) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.stare, "bine");
});

await test("lichidarea sub 15% e raportata margine", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "90", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 10) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.stare, "margine");
});

await test("lichidarea sub 8% e raportata rau", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "95", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 5) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.stare, "rau");
});

await test("pretul SUB pragul de lichidare da valoare negativa si rau, nu tace", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "110", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - (-10)) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.stare, "rau");
});

await test("botul short foloseste estimateLiquidationPriceUp, nu Down", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "short",
    estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "120" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 20) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.stare, "bine");
});

// --- Audit 24.09: lichidarea citea DOAR partea de jos cand exista. Un bot
// neutru are ambele parti; cea de SUS la 3,85% trecea drept "bine" (jos la 30%).

await test("[audit] neutru cu ambele lichidari: Sus la 3,85% bate Jos la 30% si da OPRESTE", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "",
    estimateLiquidationPriceDown: "70", estimateLiquidationPriceUp: "103.85" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 3.85) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.partea, "sus");
  assert.equal(m.lichidare.depasita, false);
  assert.equal(m.lichidare.stare, "rau");
  const mv = { ...masuriBune(), lichidare: m.lichidare };
  assert.equal(T.verdict(mv, "GRID").nivel, "OPRESTE");
});

await test("[audit] ambele lichidari, Jos mai aproape: se ia Jos", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "95", estimateLiquidationPriceUp: "130" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 5) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.partea, "jos");
});

await test("[audit] long cu Jos '0' si Sus > 0 foloseste Sus", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "long",
    estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "112" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - 12) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.partea, "sus");
});

await test("[audit] short cu Jos '0' ramane corect (Sus) si semnul depasirii se vede", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "short",
    estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "95" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.ok(Math.abs(m.lichidare.valoare - (-5)) < 1e-9, `lichidare: ${m.lichidare.valoare}`);
  assert.equal(m.lichidare.partea, "sus");
  assert.equal(m.lichidare.depasita, true, "pretul peste lichidarea de sus = DEPASITA");
  assert.equal(m.lichidare.stare, "rau");
});

await test("[audit] ambele parti '0' = nu exista lichidare, nu distanta 0", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData,
    estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot, klinePerp: ZIGZAG.concat({ close: 100 }) });
  assert.equal(m.lichidare.valoare, null);
  assert.equal(m.lichidare.stare, "nu-se-poate");
});

await test("basis-ul e diferenta procentuala perp fata de spot", () => {
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155 });
  assert.ok(Math.abs(m.basis.valoare - 3.2258) < 0.01, `basis: ${m.basis.valoare}`);
});

await test("un basis mare dar OBISNUIT nu tipa", () => {
  // istoric in care basis-ul sta de mult la ~3%
  const ist = ISTORIC.map((h) => ({ ...h, pretPerp: 0.01597, pretSpot: 0.0155 }));
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155, istoric: ist });
  assert.equal(m.basis.stare, "bine", "3% e normal aici, n-are ce alarma");
});

await test("basis-ul care SARE peste dublul medianei e raportat rau", () => {
  // istoric linistit la ~0.1%, acum sare la 3.2%
  const ist = ISTORIC.map((h) => ({ ...h, pretPerp: 0.015515, pretSpot: 0.0155 }));
  const m = T.masoara({ ...INTRARI, klinePerp: ZIGZAG.concat({ close: 0.0160 }), pretSpot: 0.0155, istoric: ist });
  assert.equal(m.basis.stare, "rau", `mediana ${m.basis.mediana}, acum ${m.basis.valoare}`);
});

await test("comisionul se raporteaza la profitul brut din grid", () => {
  const m = T.masoara(INTRARI);
  // Audit 24.09: comisionul vine deja in PROCENTE (unitatea afisata), nu fractie.
  assert.ok(Math.abs(m.comision.valoare - 100 * 0.45 / 2.30) < 1e-6, `comision: ${m.comision.valoare}`);
  assert.equal(m.comision.unitate, "%");
  assert.equal(m.comision.prag, 50);
  assert.equal(m.comision.stare, "bine");
});

await test("comisionul care mananca peste jumatate din grid e rau", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, totalFee: "-1.50" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "rau");
});

// --- Task 8 al revizei finale: comision nemasurabil exact cand e cel mai rau -
// taxe care curg fara profit brut (zero sau negativ) trebuie sa dea "rau",
// nu "nu-se-poate" (care cadea tacut pe LINISTE).

await test("[revizie] taxe care curg cu gridProfit ZERO dau rau, nu nu-se-poate", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, gridProfit: "0", totalFee: "-40" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "rau", "gridProfit=0 cu taxe curgand nu are voie sa tacoa");
});

await test("[revizie] taxe care curg cu gridProfit NEGATIV dau rau, nu nu-se-poate", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, gridProfit: "-5", totalFee: "-120" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "rau", "gridProfit negativ cu taxe curgand nu are voie sa tacoa");
});

await test("[revizie] fara profit SI fara taxe, comisionul ramane nu-se-poate (n-a curs nimic)", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, gridProfit: "0", totalFee: "0" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "nu-se-poate", "zero si zero nu e semnal de rau - e lipsa de activitate");
});

await test("[revizie] end-to-end: comision rau fara profit brut da REGLEAZA, nu LINISTE", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, gridProfit: "0", totalFee: "-40" } };
  const m = T.masoara({ ...INTRARI, bot });
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "comision");
  assert.doesNotMatch(v.ceFac, /jumătate/, "fara brut, mesajul 'peste jumatate' ar minti (jumatate din nimic)");
});

await test("fara bot, masurile care cer bot spun asta si nu crapa", () => {
  const m = T.masoara({ ...INTRARI, bot: null });
  for (const camp of ["pozitieInterval", "ritmPerechi", "amplitudine", "lichidare", "comision"]) {
    assert.equal(m[camp].stare, "nu-se-poate", `${camp}: ${m[camp].stare}`);
  }
  assert.ok(Number.isFinite(m.eficienta.valoare), "eficienta se poate socoti si fara bot");
});

// istoric de 7 ore: 10 perechi pe ora in primele 6, apoi 3 in ultima
function istoricCuRitm(peOra, ultimaOra) {
  var out = [], t0 = Date.now() - 7 * 3600000, perechi = 0;
  for (var min = 0; min <= 7 * 60; min++) {
    var rata = min < 6 * 60 ? peOra : ultimaOra;
    if (min % Math.round(60 / rata) === 0) perechi++;
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  return out;
}

await test("ritmul compara ultima ora cu media ultimelor sase", () => {
  const ist = istoricCuRitm(10, 10);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ist[ist.length - 1].t });
  assert.ok(Math.abs(m.ritmPerechi.valoare / m.ritmPerechi.baza - 1) < 0.35,
    `ritm ${m.ritmPerechi.valoare} fata de baza ${m.ritmPerechi.baza}`);
  assert.equal(m.ritmPerechi.stare, "bine");
});

await test("ritmul cazut sub 40% din baza e raportat rau", () => {
  const ist = istoricCuRitm(12, 3);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ist[ist.length - 1].t });
  assert.equal(m.ritmPerechi.stare, "rau", `raport: ${m.ritmPerechi.valoare / m.ritmPerechi.baza}`);
});

await test("fara sase ore de istoric, ritmul spune ca n-are baza", () => {
  const scurt = istoricCuRitm(10, 10).slice(-60);
  const m = T.masoara({ ...INTRARI, istoric: scurt, acum: scurt[scurt.length - 1].t });
  assert.equal(m.ritmPerechi.stare, "nu-se-poate");
});

await test("contor resetat (bot inchis si deschis) e raportat ca nu-se-poate, nu rau", () => {
  var out = [], t0 = Date.now() - 7 * 3600000;
  // Primele 6.5 ore: perechi crescatoare 0->200
  for (var min = 0; min < 6.5 * 60; min++) {
    var perechi = Math.floor(200 * min / (6.5 * 60));
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  // Ultima 0.5 ore: contor resetat (bot inchis, deschis), perechi de la 0->5
  for (var min = Math.floor(6.5 * 60); min <= 7 * 60; min++) {
    var perechi = Math.floor(5 * (min - 6.5 * 60) / (0.5 * 60));
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  const m = T.masoara({ ...INTRARI, istoric: out, acum: out[out.length - 1].t });
  assert.equal(m.ritmPerechi.stare, "nu-se-poate", `daca contor resetat, ultima e negativa, nu raportam`);
});

await test("zero perechi in ultimele sase ore dar una-doua in ultima ora e raportata bine", () => {
  var out = [], t0 = Date.now() - 7 * 3600000, perechi = 60;
  // Primele 6 ore: perechi stabile, nu cresc
  for (var min = 0; min < 6 * 60; min++) {
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  // Ultima ora: incepe sa creasca, 1-2 perechi
  for (var min = 6 * 60; min <= 7 * 60; min++) {
    if (min === 6 * 60 + 30) perechi++;
    out.push({ t: t0 + min * 60000, perechi: perechi, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  const m = T.masoara({ ...INTRARI, istoric: out, acum: out[out.length - 1].t });
  assert.equal(m.ritmPerechi.stare, "bine", `baza este 0, cand nu-i baza nu e rau`);
});

// --- Audit 24.09: ritmul impartea la 1h si 6h fixe, oricat de departe erau
// capetele reale, si numara peste gauri din istoric (ecran inchis).

function istoricRegulat(pasMin, peMinut, acum, oreInapoi, sari) {
  const out = [];
  for (let min = oreInapoi * 60; min >= 0; min -= pasMin) {
    if (sari && sari(min)) continue;
    out.push({ t: acum - min * 60000, perechi: (oreInapoi * 60 - min) * peMinut, pretPerp: 0.0155, pretSpot: 0.0155 });
  }
  return out;
}

await test("[audit] ritmul imparte la durata REALA dintre capete, nu la o ora fixa", () => {
  // o pereche pe minut = 60/ora. Mostre din minut in minut, dar lipsesc -60..-57
  // (gaura de 5 min, inca tolerata): capatul "de acum o ora" e de fapt la -61,
  // cu 61 de perechi. 61 in 61 de minute = 60/ora, nu 61 "in ultima ora".
  const ist = istoricRegulat(1, 1, ACUM, 8, (min) => min >= 57 && min <= 60);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ACUM });
  assert.equal(m.ritmPerechi.sursa, "istoric");
  assert.ok(Math.abs(m.ritmPerechi.valoare - 60) < 1e-9, `ritm/ora: ${m.ritmPerechi.valoare} (61 perechi in 61 min = 60/ora)`);
  assert.ok(Math.abs(m.ritmPerechi.baza - 60) < 1e-9, `baza/ora: ${m.ritmPerechi.baza}`);
  assert.equal(m.ritmPerechi.stare, "bine");
});

await test("[audit] o gaura de 90 de minute intre capete da NECUNOSCUT, nu un ritm inventat", () => {
  // 6 perechi/ora constant, dar ecranul a stat inchis intre -4h si -2h30.
  const ist = istoricRegulat(1, 0.1, ACUM, 7, (min) => min < 240 && min > 150);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ACUM });
  assert.equal(m.ritmPerechi.stare, "nu-se-poate", `stare: ${m.ritmPerechi.stare}, valoare ${m.ritmPerechi.valoare}`);
  assert.equal(m.ritmPerechi.valoare, null, "fara trx24h, nu are ce arata");
});

await test("[audit] ultima mostra veche de 30 de minute (ecran inchis) da NECUNOSCUT", () => {
  const ist = istoricRegulat(1, 0.1, ACUM - 30 * 60000, 7);
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ACUM });
  assert.equal(m.ritmPerechi.stare, "nu-se-poate");
});

await test("[audit] fara mostre destule, ritmul vine din trx24h marcat 'din Pionex 24h'", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trx24h: 48 } };
  const scurt = istoricRegulat(1, 0.1, ACUM, 1);
  const m = T.masoara({ ...INTRARI, bot, istoric: scurt, acum: ACUM });
  assert.equal(m.ritmPerechi.sursa, "pionex-24h");
  assert.equal(m.ritmPerechi.eticheta, "din Pionex 24h");
  assert.equal(m.ritmPerechi.valoare, 2, "48 de perechi in 24h = 2 pe ora");
  assert.equal(m.ritmPerechi.total24h, 48);
  assert.equal(m.ritmPerechi.stare, "nu-se-poate", "fara baza nu se judeca - nu da REGLEAZA");
});

await test("[audit] trx24h cu gaura in istoric: tot Pionex, nu ritmul peste gaura", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trx24h: "24" } };
  const ist = istoricRegulat(1, 0.1, ACUM, 7, (min) => min < 240 && min > 150);
  const m = T.masoara({ ...INTRARI, bot, istoric: ist, acum: ACUM });
  assert.equal(m.ritmPerechi.sursa, "pionex-24h");
  assert.equal(m.ritmPerechi.valoare, 1);
});

await test("[audit] trx24h lipsa / null / gol NU devine 0 perechi", () => {
  const scurt = istoricRegulat(1, 0.1, ACUM, 1);
  for (const v of [undefined, null, "", "abc"]) {
    const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trx24h: v } };
    const m = T.masoara({ ...INTRARI, bot, istoric: scurt, acum: ACUM });
    assert.equal(m.ritmPerechi.valoare, null, `trx24h=${JSON.stringify(v)} a dat ${m.ritmPerechi.valoare}`);
  }
  const bot0 = { ...BOT, buOrderData: { ...BOT.buOrderData, trx24h: 0 } };
  assert.equal(T.masoara({ ...INTRARI, bot: bot0, istoric: scurt, acum: ACUM }).ritmPerechi.valoare, 0,
    "0 trimis de Pionex e o cifra reala (nicio pereche in 24h)");
});

await test("[audit] mostra cu perechi lipsa (null) nu se socoteste ca 0", () => {
  const ist = istoricRegulat(1, 0.1, ACUM, 7);
  ist[ist.length - 1] = { ...ist[ist.length - 1], perechi: null };
  const m = T.masoara({ ...INTRARI, istoric: ist, acum: ACUM });
  assert.notEqual(m.ritmPerechi.stare, "rau", "perechi null ar da ultima = -X sau 0 - fals");
  assert.equal(m.ritmPerechi.sursa === "istoric" ? "gresit" : "ok", "ok");
});

// --- Audit 24.09, punctul 5: lipsa nu devine 0 nicaieri in masoara().

await test("[audit] totalFee lipsa (null) nu da comision 0% 'bine'", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, totalFee: null } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.valoare, null, `comision: ${m.comision.valoare}`);
  assert.equal(m.comision.stare, "nu-se-poate");
});

await test("[audit] bottom lipsa (null) nu face intervalul sa inceapa de la 0", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, bottom: null } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.pozitieInterval.valoare, null, `pozitie: ${m.pozitieInterval.valoare}`);
  assert.equal(m.pozitieInterval.stare, "nu-se-poate");
});

await test("[audit] pretSpot lipsa ramane null, nu 0", () => {
  assert.equal(T.masoara({ ...INTRARI, pretSpot: null }).pretSpot, null);
  assert.equal(T.masoara({ ...INTRARI, pretSpot: "" }).pretSpot, null);
});

await test("[audit] ora pornirii lipsa: varsta e null si verdictul nu scrie '0 minute'", () => {
  const bot = { ...BOT, createTime: undefined };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.varstaBotMin, null, `varsta: ${m.varstaBotMin}`);
  const v = T.verdict({ ...masuriBune(), varstaBotMin: null }, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.equal(v.declansator.masura, "varstaBot");
  assert.equal(v.declansator.valoare, null, "lipsa nu se scrie ca 0");
  assert.doesNotMatch(v.ceFac, /\b0 de minute/, v.ceFac);
});

await test("[audit] istoric cu prima mostra fara timp: istoricMin null si NEDOVEDIT, nu LINISTE", () => {
  const ist = ISTORIC.map((h, i) => (i === 0 ? { ...h, t: null } : h));
  const m = T.masoara({ ...INTRARI, istoric: ist });
  assert.equal(m.istoricMin, null, `istoricMin: ${m.istoricMin}`);
  const v = T.verdict({ ...masuriBune(), istoricMin: null }, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.equal(v.declansator.masura, "istoric");
  assert.equal(v.declansator.valoare, null);
});

await test("fara nimic pus, botul e presupus GRID", () => {
  const r = T.modBot(BOT, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("un camp moving* il face DIRECTIONAL, tot presupus", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "0.017" } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "DIRECTIONAL");
  assert.equal(r.presupus, true);
});

await test("alegerea omului bate deducerea", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "0.017" } };
  const r = T.modBot(bot, { 2377: "GRID" });
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, false, "cand omul a ales, nu mai e presupunere");
});

await test("fara bot, modul e GRID si nu crapa", () => {
  const r = T.modBot(null, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("moving* text \"0\" se considera nesetat, intoarce GRID", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "0" } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("moving* numar 0 se considera nesetat, intoarce GRID", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: 0 } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("moving* sir gol se considera nesetat, intoarce GRID", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: "" } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("moving* null se considera nesetat, intoarce GRID", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingTop: null } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "GRID");
  assert.equal(r.presupus, true);
});

await test("moving* cu valoare chiar pusă (numar nenul) intoarce DIRECTIONAL", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, movingIndicatorType: 2 } };
  const r = T.modBot(bot, {});
  assert.equal(r.mod, "DIRECTIONAL");
  assert.equal(r.presupus, true);
});

// masuri fabricate: pornim de la "totul bine" si stricam cate una
function masuriBune() {
  return {
    varstaBotMin: 300, lumanari: 60, istoricMin: 400,
    pretPerp: 0.01555, pretSpot: 0.01555,
    pozitieInterval: { valoare: 50, stare: "bine", prag: { margine: 15 } },
    ritmPerechi: { valoare: 10, baza: 10, stare: "bine", prag: 0.40 },
    eficienta: { valoare: 0.2, semn: 1, stare: "zigzag", prag: { trend: 0.60, zigzag: 0.30 } },
    amplitudine: { valoare: 2.0, stare: "bine", prag: 1.0 },
    lichidare: { valoare: 20, stare: "bine", prag: { grav: 8, atentie: 15 } },
    basis: { valoare: 0.1, stare: "bine", prag: 1.0 },
    comision: { valoare: 20, stare: "bine", prag: 50 },
    directieBot: 0,
    marginStatus: { valoare: "NORMAL", stare: "bine", prag: "NORMAL" },
    riskStatus: { valoare: "TRADING", stare: "bine", prag: "TRADING" },
  };
}

await test("cand totul e bine, verdictul e LINISTE", () => {
  assert.equal(T.verdict(masuriBune(), "GRID").nivel, "LINISTE");
});

await test("botul prea tanar da NEDOVEDIT, nu verde", () => {
  const m = masuriBune(); m.varstaBotMin = 47;
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.match(v.titlu + v.ceFac, /47/, "trebuie sa spuna cate minute are");
});

await test("lichidarea sub 8% da OPRESTE", () => {
  const m = masuriBune(); m.lichidare = { valoare: 6.2, stare: "rau", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "lichidare");
  assert.equal(v.declansator.valoare, 6.2);
  assert.equal(v.declansator.prag, 8);
});

// --- Task 1 al revizei finale: marginStatus/riskStatus nu erau citite deloc -
// un bot altfel sanatos (lichidare 16,88%) trecea LINISTE cu MARGIN_CALL,
// LIQUIDATING sau REDUCE_ONLY/LIQUIDATION. Masurate exact aceste patru valori.

await test("[revizie] marginStatus=MARGIN_CALL da OPRESTE, nu LINISTE", () => {
  const m = masuriBune();
  m.marginStatus = { valoare: "MARGIN_CALL", stare: "rau", prag: "NORMAL" };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "marginStatus");
  assert.equal(v.declansator.valoare, "MARGIN_CALL");
});

await test("[revizie] marginStatus=LIQUIDATING da OPRESTE, nu LINISTE", () => {
  const m = masuriBune();
  m.marginStatus = { valoare: "LIQUIDATING", stare: "rau", prag: "NORMAL" };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "marginStatus");
});

await test("[revizie] riskStatus=REDUCE_ONLY da OPRESTE, nu LINISTE", () => {
  const m = masuriBune();
  m.riskStatus = { valoare: "REDUCE_ONLY", stare: "rau", prag: "TRADING" };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "riskStatus");
});

await test("[revizie] riskStatus=LIQUIDATION da OPRESTE, nu LINISTE", () => {
  const m = masuriBune();
  m.riskStatus = { valoare: "LIQUIDATION", stare: "rau", prag: "TRADING" };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.equal(v.declansator.masura, "riskStatus");
});

await test("[revizie] marginStatus rau bate lichidarea calculata (Pionex e mai autoritar)", () => {
  const m = masuriBune();
  m.lichidare = { valoare: 40, stare: "bine", prag: { grav: 8, atentie: 15 } }; // distanta calculata arata bine
  m.marginStatus = { valoare: "LIQUIDATING", stare: "rau", prag: "NORMAL" };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", "starea de cont de la Pionex trebuie sa bata o lichidare calculata linistitoare");
  // Nivelul singur NU masoara ordinea: si calea lichidarii duce tot la OPRESTE.
  // Ce deosebeste e DECLANSATORUL - el ii spune omului DE CE se opreste.
  assert.equal(v.declansator && v.declansator.masura, "marginStatus",
    "declansatorul trebuie sa arate starea de cont, nu lichidarea calculata");
});

await test("[revizie] marginStatus/riskStatus NECUNOSCUT (camp lipsa) NU declanseaza OPRESTE", () => {
  const m = masuriBune();
  m.marginStatus = { valoare: null, stare: "nu-se-poate", prag: null };
  m.riskStatus = { valoare: null, stare: "nu-se-poate", prag: null };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "LINISTE", "camp lipsa nu are de unde sa stie - nu se declanseaza, dar nici nu se trateaza ca NORMAL cu zgomot");
});

await test("[revizie] masoara: citeste marginStatus/riskStatus din buOrderData", () => {
  const botRau = { ...BOT, buOrderData: { ...BOT.buOrderData, marginStatus: "MARGIN_CALL", riskStatus: "REDUCE_ONLY" } };
  const m = T.masoara({ ...INTRARI, bot: botRau });
  assert.equal(m.marginStatus.valoare, "MARGIN_CALL");
  assert.equal(m.marginStatus.stare, "rau");
  assert.equal(m.riskStatus.valoare, "REDUCE_ONLY");
  assert.equal(m.riskStatus.stare, "rau");
});

await test("[revizie] masoara: marginStatus/riskStatus normale dau stare bine", () => {
  const m = T.masoara(INTRARI); // BOT are riskStatus:TRADING, marginStatus:NORMAL
  assert.equal(m.marginStatus.stare, "bine");
  assert.equal(m.riskStatus.stare, "bine");
});

await test("[revizie] masoara: camp lipsa (undefined) da nu-se-poate, nu NORMAL/TRADING tacut", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, marginStatus: undefined, riskStatus: undefined } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.marginStatus.stare, "nu-se-poate");
  assert.equal(m.marginStatus.valoare, null);
  assert.equal(m.riskStatus.stare, "nu-se-poate");
  assert.equal(m.riskStatus.valoare, null);
});

await test("[revizie] end-to-end: bot cu lichidare 16,88% (sanatoasa) dar marginStatus MARGIN_CALL da OPRESTE", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, marginStatus: "MARGIN_CALL",
    estimateLiquidationPriceDown: "0.013", estimateLiquidationPriceUp: "0" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.ok(m.lichidare.valoare > 15, `precheck: lichidarea trebuie sa fie linistitoare, e ${m.lichidare.valoare}`);
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", "marginStatus anormal trebuie sa opreasca chiar cu lichidare departe");
  assert.equal(v.declansator.masura, "marginStatus");
});

await test("pretul iesit din interval da PAZESTE in GRID", () => {
  const m = masuriBune(); m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE");
});

await test("amplitudinea moarta da REGLEAZA", () => {
  const m = masuriBune(); m.amplitudine = { valoare: 0.7, stare: "rau", prag: 1.0 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "amplitudine");
});

await test("ORDINEA scarii: cea mai grava bate, nu prima gasita", () => {
  const m = masuriBune();
  m.amplitudine = { valoare: 0.7, stare: "rau", prag: 1.0 };            // REGLEAZA
  m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } }; // PAZESTE
  m.lichidare = { valoare: 6, stare: "rau", prag: { grav: 8, atentie: 15 } };  // OPRESTE
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
});

await test("exact pe prag NU aprinde, un pas peste aprinde", () => {
  const m = masuriBune();
  m.lichidare = { valoare: 8, stare: "margine", prag: { grav: 8, atentie: 15 } };
  // assert pe nivelul EXACT asteptat, nu doar "diferit de OPRESTE" - altfel
  // o cadere accidentala pe LINISTE ar trece la fel de bine.
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE", "8% fix e sub 15%, deci PAZESTE, nu OPRESTE");
  m.lichidare = { valoare: 7.99, stare: "rau", prag: { grav: 8, atentie: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
});

await test("fara bot, verdictul e FARA_BOT si nu inventeaza cifre", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: null, stare: "nu-se-poate", prag: null };
  m.lichidare = { valoare: null, stare: "nu-se-poate", prag: null };
  const v = T.verdict(m, "GRID", { faraBot: true });
  assert.equal(v.nivel, "FARA_BOT");
  assert.equal(v.declansator, null);
});

await test("fiecare verdict poarta cifra si pragul care l-au dat", () => {
  const m = masuriBune(); m.comision = { valoare: 70, stare: "rau", prag: 50 };
  const v = T.verdict(m, "GRID");
  assert.ok(v.declansator, "lipseste declansatorul");
  assert.equal(v.declansator.masura, "comision");
  assert.equal(v.declansator.prag, 50, "pragul in aceeasi unitate ca valoarea (procente)");
  assert.equal(v.declansator.valoare, 70);
  assert.equal(v.declansator.unitate, "%", "declansatorul poarta si unitatea");
});

// --- Audit 24.09: fiecare masura poarta `unitate`, iar valoarea e deja in
// unitatea afisata. Ecranul (Task 3) doar o lipeste langa cifra.
const UNITATI = { pozitieInterval: "%", ritmPerechi: "perechi/oră", eficienta: "",
  amplitudine: "×", lichidare: "%", comision: "%", basis: "%",
  marginStatus: "", riskStatus: "", stareBot: "" };

await test("[audit] fiecare masura intoarsa poarta unitatea ei (bot sanatos)", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trx24h: 24 } };
  const m = T.masoara({ ...INTRARI, bot });
  for (const [camp, u] of Object.entries(UNITATI)) {
    assert.ok(m[camp], `lipseste masura ${camp}`);
    assert.equal(m[camp].unitate, u, `${camp}.unitate = ${JSON.stringify(m[camp].unitate)}, asteptat ${JSON.stringify(u)}`);
  }
});

await test("[audit] unitatea exista si pe masurile care nu se pot socoti (fara bot)", () => {
  const m = T.masoara({ ...INTRARI, bot: null });
  for (const [camp, u] of Object.entries(UNITATI)) {
    assert.equal(m[camp].unitate, u, `${camp} (nu-se-poate).unitate = ${JSON.stringify(m[camp].unitate)}`);
  }
  assert.notEqual(m.lichidare, m.comision, "masurile lipsa nu au voie sa impartaseasca acelasi obiect");
});

await test("[audit] declansatorul lichidarii poarta %", () => {
  const m = masuriBune(); m.lichidare = { valoare: 5, stare: "rau", prag: { grav: 8, atentie: 15 }, unitate: "%" };
  assert.equal(T.verdict(m, "GRID").declansator.unitate, "%");
});

// --- reparatiile din revizia Task 4: fals LINISTE, NEDOVEDIT pe o singura cauza,
// garda DIRECTIONAL neterminata, si probele care nu apara treptele mijlocii ---

await test("lichidarea necunoscuta pentru un bot pornit da NEDOVEDIT, nu LINISTE", () => {
  const m = masuriBune();
  m.lichidare = { valoare: null, stare: "nu-se-poate", prag: null };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT", "lichidare nesocotita nu are voie sa cada pe LINISTE");
  assert.equal(v.declansator.masura, "lichidare");
});

await test("pozitia in interval necunoscuta pentru un bot pornit da NEDOVEDIT, nu LINISTE", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: null, stare: "nu-se-poate", prag: null };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT", "pozitia nesocotita nu are voie sa cada pe LINISTE");
  assert.equal(v.declansator.masura, "pozitieInterval");
});

await test("LINISTE nu inventeaza un procent cand pozitia in interval e null", () => {
  // scenariu artificial (stare "bine" cu valoare null nu apare din masoara),
  // dar apara direct linia de text care altfel ar scrie "Esti la 0% din interval"
  const m = masuriBune();
  m.pozitieInterval = { valoare: null, stare: "bine", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "LINISTE");
  assert.doesNotMatch(v.ceFac, /\d/, "nu are voie sa scrie o cifra pe care n-o are");
});

await test("NEDOVEDIT din lipsa de lumanari nu da vina pe varsta", () => {
  const m = masuriBune(); m.lumanari = 20;
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.equal(v.declansator.masura, "lumanari");
  assert.equal(v.declansator.valoare, 20);
  assert.doesNotMatch(v.ceFac, /minute/, "cauza e lumanarile, nu varsta in minute");
});

await test("NEDOVEDIT din istoric scurt nu da vina pe varsta", () => {
  const m = masuriBune(); m.istoricMin = 10;
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT");
  assert.equal(v.declansator.masura, "istoric");
  assert.equal(v.declansator.valoare, 10);
});

// --- Audit sever 24.09: rosul nu se ascunde NICIODATA in spatele lui "Nu stiu inca".
// Regula veche ("NEDOVEDIT e prima dinadins") ascundea "Iesi" la un bot tanar cu
// lichidarea la 4,6% sau cu LIQUIDATING raportat de Pionex. NEDOVEDIT opreste
// doar verdictele verzi si pe cele de ritm.

await test("[audit] date insuficiente SI lichidare sub 8 dau OPRESTE, nu NEDOVEDIT", () => {
  const m = masuriBune();
  m.varstaBotMin = 47;
  m.lichidare = { valoare: 6, stare: "rau", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", "rosul nu are voie sa se ascunda in spatele lui 'Nu stiu inca'");
  assert.equal(v.declansator.masura, "lichidare");
});

// Bot long real ca forma: lichidarea JOS, partea de SUS vine "0" (nu exista).
const PRET_A = 0.0156; // ultima inchidere din ZIGZAG
function botAudit(peste) {
  const x = { ...BOT.buOrderData, ...(peste && peste.buOrderData) };
  return { ...BOT, status: "open", createTime: ACUM - 5 * 3600000, ...(peste || {}), buOrderData: x };
}
const LICH_46 = String(PRET_A * (1 - 0.046)); // lichidarea la 4,6% sub pret
const ISTORIC_COPT = Array.from({ length: 400 }, (_, i) => ({
  t: ACUM - (400 - i) * 60000, perechi: i, pretPerp: PRET_A, pretSpot: PRET_A,
}));
function intrariAudit(bot, peste) {
  return { bot, klinePerp: ZIGZAG, pretSpot: PRET_A, istoric: ISTORIC_COPT, acum: ACUM, ...(peste || {}) };
}

await test("[audit] bot de 60 de minute cu lichidarea la 4,6% da OPRESTE, nu NEDOVEDIT", () => {
  const bot = botAudit({ createTime: ACUM - 60 * 60000, buOrderData: { estimateLiquidationPriceDown: LICH_46 } });
  const m = T.masoara(intrariAudit(bot));
  assert.ok(Math.abs(m.lichidare.valoare - 4.6) < 1e-6, `precheck lichidare: ${m.lichidare.valoare}`);
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", `a dat ${v.nivel} (${v.titlu})`);
  assert.equal(v.titlu, "Ieși");
  assert.equal(v.declansator.masura, "lichidare");
});

await test("[audit] istoric de 1 minut + marginStatus LIQUIDATING da OPRESTE", () => {
  const bot = botAudit({ buOrderData: { marginStatus: "LIQUIDATING" } });
  const m = T.masoara(intrariAudit(bot, { istoric: [{ t: ACUM - 60000, perechi: 5, pretPerp: PRET_A, pretSpot: PRET_A }] }));
  assert.ok(m.istoricMin < 30, `precheck istoric scurt: ${m.istoricMin}`);
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", `a dat ${v.nivel} (${v.titlu})`);
  assert.equal(v.declansator.masura, "marginStatus");
});

await test("[audit] 30 de lumanari + lichidarea la 4,6% da OPRESTE", () => {
  const bot = botAudit({ buOrderData: { estimateLiquidationPriceDown: LICH_46 } });
  const m = T.masoara(intrariAudit(bot, { klinePerp: ZIGZAG.slice(-30) }));
  assert.equal(m.lumanari, 30, "precheck");
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", `a dat ${v.nivel} (${v.titlu})`);
});

await test("[audit] lichidare lipsa (ambele '0') + marginStatus LIQUIDATING da OPRESTE", () => {
  const bot = botAudit({ buOrderData: { marginStatus: "LIQUIDATING",
    estimateLiquidationPriceDown: "0", estimateLiquidationPriceUp: "0" } });
  const m = T.masoara(intrariAudit(bot));
  assert.equal(m.lichidare.stare, "nu-se-poate", "precheck");
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE", `a dat ${v.nivel} (${v.titlu})`);
  assert.equal(v.declansator.masura, "marginStatus");
});

await test("[audit] lichidarea 8-15% la un bot tanar da PAZESTE, nu NEDOVEDIT", () => {
  const m = masuriBune();
  m.varstaBotMin = 30;
  m.lichidare = { valoare: 10, stare: "margine", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "PAZESTE", `a dat ${v.nivel}`);
  assert.equal(v.declansator.masura, "lichidare");
});

await test("[audit] pretul iesit din interval la un bot tanar da PAZESTE, nu NEDOVEDIT", () => {
  const m = masuriBune();
  m.varstaBotMin = 30;
  m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE");
  m.directieBot = 1; m.pozitieInterval = { valoare: -5, stare: "afara", prag: { margine: 15 } };
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "PAZESTE", "impotriva pozitiei, in DIRECTIONAL");
});

await test("[audit] NEDOVEDIT opreste tot verdictele VERZI (iesire in favoare la un bot tanar)", () => {
  const m = masuriBune();
  m.varstaBotMin = 30; m.directieBot = 1;
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 108, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "NEDOVEDIT", "OPORTUNITATE e verde - asteapta dovada");
  m.varstaBotMin = 300;
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "OPORTUNITATE", "controlul: cu dovada, OPORTUNITATE");
});

await test("[audit] trendul pe mai putin de 48 de lumanari nu e dovedit - NEDOVEDIT, nu PAZESTE", () => {
  const m = masuriBune();
  m.lumanari = 30;
  m.eficienta = { valoare: 0.8, semn: 1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "NEDOVEDIT", "GRID: trend + margine pe 30 de lumanari");
  m.directieBot = -1; m.pozitieInterval = { valoare: 50, stare: "bine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "NEDOVEDIT", "DIRECTIONAL: trend contra pe 30 de lumanari");
  m.lumanari = 60;
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "PAZESTE", "controlul: cu 60 de lumanari, trendul contra alarmeaza");
});

await test("[audit] NEDOVEDIT opreste tot ritmul (REGLEAZA) la un bot tanar", () => {
  const m = masuriBune();
  m.varstaBotMin = 30;
  m.ritmPerechi = { valoare: 3, baza: 10, stare: "rau", prag: 0.40 };
  assert.equal(T.verdict(m, "GRID").nivel, "NEDOVEDIT");
});

await test("[audit] bot INCHIS (status closed) da OPRIT 'Botul e oprit', nu Merge", () => {
  const bot = botAudit({ status: "closed", buOrderData: { status: "closed" } });
  const m = T.masoara(intrariAudit(bot));
  assert.equal(m.stareBot && m.stareBot.stare, "oprit", `stareBot: ${JSON.stringify(m.stareBot)}`);
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRIT", `a dat ${v.nivel} (${v.titlu})`);
  assert.equal(v.titlu, "Botul e oprit");
});

await test("[audit] bot CLOSED doar la nivelul de sus (buOrderData fara status) da tot OPRIT", () => {
  const bot = botAudit({ status: "CLOSED", buOrderData: { status: undefined } });
  assert.equal(T.verdict(T.masoara(intrariAudit(bot)), "GRID").nivel, "OPRIT");
});

await test("[audit] bot care merge (open/running) NU e OPRIT", () => {
  const m = T.masoara(intrariAudit(botAudit()));
  assert.equal(m.stareBot && m.stareBot.stare, "bine");
  assert.notEqual(T.verdict(m, "GRID").nivel, "OPRIT");
});

await test("[audit] bot pe PAUZA cu lichidarea la 4,6% da OPRESTE (pozitia tot exista)", () => {
  const bot = botAudit({ buOrderData: { status: "paused", estimateLiquidationPriceDown: LICH_46 } });
  const v = T.verdict(T.masoara(intrariAudit(bot)), "GRID");
  assert.equal(v.nivel, "OPRESTE", `a dat ${v.nivel}`);
});

await test("[audit] bot pe PAUZA, altfel sanatos, da OPRIT si spune starea, nu Merge", () => {
  const bot = botAudit({ buOrderData: { status: "paused" } });
  const v = T.verdict(T.masoara(intrariAudit(bot)), "GRID");
  assert.equal(v.nivel, "OPRIT", `a dat ${v.nivel} (${v.titlu})`);
  assert.match(v.ceFac, /paused/i, "trebuie sa spuna ce stare raporteaza Pionex");
});

await test("DIRECTIONAL fara directieBot cunoscuta: iesirea din interval nu presupune impotriva", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 104, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE");
  assert.equal(v.titlu, "Prețul a ieșit din interval",
    "fara directieBot, formularea trebuie sa fie neutra, nu 'impotriva ta'");
});

await test("declansatorul de pozitie raporteaza pragul chiar rupt, nu unul fix", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: -6, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "PAZESTE");
  assert.equal(v.declansator.prag, 0, "pretul a rupt pragul de JOS (0), nu cel de sus (100)");
});

await test("lichidarea negativa (deja trecuta) nu scrie minus in fata cifrei", () => {
  const m = masuriBune();
  m.lichidare = { valoare: -10, stare: "rau", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPRESTE");
  assert.doesNotMatch(v.ceFac, /-10/, "nu trebuie sa scrie minus in fata cifrei");
  assert.match(v.ceFac, /10/, "trebuie sa mentioneze cat a trecut deja de prag");
});

await test("comisionul care manaca gridul da REGLEAZA (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.comision = { valoare: 70, stare: "rau", prag: 50 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "comision");
});

await test("ritmul cazut da REGLEAZA (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.ritmPerechi = { valoare: 3, baza: 10, stare: "rau", prag: 0.40 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "ritmPerechi");
});

await test("pozitia lipita de margine da REGLEAZA dupa 30 de minute (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 }, minuteLaMargine: 30 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "pozitieInterval");
  assert.equal(v.declansator.prag, 85, "la marginea de sus, pragul rupt e 85, nu unul fix");
});

await test("pozitia lipita de marginea de JOS raporteaza pragul 15, nu 85", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 10, stare: "margine", prag: { margine: 15 }, minuteLaMargine: 45 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.prag, 15, "10% e sub pragul de JOS (15), nu peste cel de sus (85)");
});

// --- Revizie: REGLEAZA pe margine se aprindea instant - specul cere >=30 min ---

await test("[revizie] margine sub 30 de minute NU da REGLEAZA", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 }, minuteLaMargine: 29 };
  const v = T.verdict(m, "GRID");
  assert.notEqual(v.nivel, "REGLEAZA", `29 minute nu ajunge la 30, dar a dat ${v.nivel}`);
});

await test("[revizie] margine fara minuteLaMargine (fixtura veche) NU da REGLEAZA - nu se presupune instant", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.notEqual(v.nivel, "REGLEAZA", `fara minuteLaMargine nu are voie sa se aprinda instant, a dat ${v.nivel}`);
});

await test("[revizie] margine la exact 30 de minute da REGLEAZA (granita)", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 }, minuteLaMargine: 30 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA", "30 de minute fix trebuie sa aprinda (>=30)");
});

await test("basis sarit da OPORTUNITATE (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.basis = { valoare: 2.5, stare: "rau", prag: 1.0 };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "OPORTUNITATE");
  assert.equal(v.declansator.masura, "basis");
});

await test("trend cu pretul la margine da PAZESTE in GRID (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.eficienta = { valoare: 0.7, semn: 1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "PAZESTE");
  assert.equal(v.declansator.masura, "eficienta");
});

await test("zigzag in DIRECTIONAL da REGLEAZA (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "eficienta");
});

await test("lichidarea sub 15% dar peste 8% da PAZESTE (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.lichidare = { valoare: 10, stare: "margine", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "PAZESTE");
  assert.equal(v.declansator.masura, "lichidare");
  assert.equal(v.declansator.prag, 15);
});

// --- Task 5: oglindirea pentru modul directional ---

await test("aceleasi cifre dau verdicte DIFERITE in cele doua moduri", () => {
  const m = masuriBune();
  m.directieBot = 1;
  m.eficienta = { valoare: 0.8, semn: 1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 92, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "PAZESTE", "in GRID, trendul la margine e pericol");
  // assert EXACT, nu doar notEqual("PAZESTE") - notEqual trece si pentru
  // OPRESTE, REGLEAZA, OPORTUNITATE, NEDOVEDIT - adica pentru 5 din 6 trepte,
  // ceea ce lasa in viata mutantul care sterge garda de pe margine (punctul 3).
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE", "in DIRECTIONAL, trendul in favoare nu e pericol");
});

await test("in DIRECTIONAL, zigzagul e cel care da REGLEAZA", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.eficienta = { valoare: 0.15, semn: 1, stare: "zigzag", prag: { trend: 0.60, zigzag: 0.30 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "eficienta");
});

await test("in DIRECTIONAL, iesirea IN FAVOARE e OPORTUNITATE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: 108, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "OPORTUNITATE");
});

await test("in DIRECTIONAL, iesirea IMPOTRIVA e PAZESTE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: -5, stare: "afara", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "PAZESTE");
});

await test("in DIRECTIONAL, ritmul cazut NU mai declanseaza nimic", () => {
  const m = masuriBune(); m.directieBot = 1;
  // masuriBune() are eficienta implicit "zigzag", care singura da REGLEAZA in
  // DIRECTIONAL (treapta de mai jos) - fixtura originala din brief ar fi
  // coliziona cu ea. Punem eficienta pe "bine" ca sa izolam ritmPerechi.
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.ritmPerechi = { valoare: 2, baza: 10, stare: "rau", prag: 0.40 };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
  assert.equal(T.verdict(m, "GRID").nivel, "REGLEAZA");
});

await test("lichidarea nu se oglindeste: sub 8% e OPRESTE in ambele moduri", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.lichidare = { valoare: 5, stare: "rau", prag: { grav: 8, atentie: 15 } };
  assert.equal(T.verdict(m, "GRID").nivel, "OPRESTE");
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "OPRESTE");
});

await test("masoara scoate directia botului din `trend`", () => {
  const lung = T.masoara(INTRARI);
  assert.equal(lung.directieBot, 1, "trend: long => +1");
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "short" } };
  assert.equal(T.masoara({ ...INTRARI, bot }).directieBot, -1);
});

// --- Probe de omorat mutanti: ramura DIRECTIONAL cu directieBot setat era
// complet neexercitata inainte de Task 5. Astea aserteaza NIVELUL, nu doar
// declansatorul, ca sa prinda o treapta care cade pe LINISTE din greseala.

await test("[mutant] trend-contra in DIRECTIONAL da PAZESTE, nu LINISTE", () => {
  const m = masuriBune(); m.directieBot = 1; // bot long
  m.eficienta = { valoare: 0.8, semn: -1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } }; // trend in jos, impotriva
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE", "trendul hotarat impotriva pozitiei trebuie sa alarmeze");
  assert.equal(v.declansator.masura, "eficienta");
});

await test("[mutant] iesirea IN FAVOARE (long, rupt in sus) da OPORTUNITATE, nu PAZESTE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: 108, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "OPORTUNITATE", "long rupt in sus = castiga, nu 'sens invers'");
});

await test("[mutant] iesirea IMPOTRIVA (long, rupt in jos) da PAZESTE, nu OPORTUNITATE", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: -5, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE", "long rupt in jos = impotriva lui, trebuie alarma");
});

await test("[mutant] oglinda: short rupt in JOS (in favoarea lui) da tot OPORTUNITATE", () => {
  const m = masuriBune(); m.directieBot = -1; // bot short
  m.pozitieInterval = { valoare: -8, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "OPORTUNITATE", "short rupt in jos = castiga, oglinda lui long rupt in sus");
});

await test("[mutant] oglinda: short rupt in SUS (impotriva lui) da PAZESTE", () => {
  const m = masuriBune(); m.directieBot = -1; // bot short
  m.pozitieInterval = { valoare: 106, stare: "afara", prag: { margine: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE", "short rupt in sus = impotriva lui, trebuie alarma");
});

// --- Revizie: iesirea "in favoare" inghitea avertismentul de lichidare -----
// Lichidarea, ca si OPRESTE, NU se oglindeste - pragurile 8%/15% raman
// aceleasi in ambele moduri si trebuie sa bata orice ramura care tine de mod.

await test("[mutant] iesirea IN FAVOARE nu inghite lichidarea la 10% (long)", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.pozitieInterval = { valoare: 108, stare: "afara", prag: { margine: 15 } };
  m.lichidare = { valoare: 10, stare: "margine", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE", "lichidarea la 10% trebuie sa bata iesirea 'in favoare'");
  assert.equal(v.declansator.masura, "lichidare");
});

await test("[mutant] oglinda: iesirea IN FAVOARE nu inghite lichidarea la 10% (short)", () => {
  const m = masuriBune(); m.directieBot = -1;
  m.pozitieInterval = { valoare: -8, stare: "afara", prag: { margine: 15 } };
  m.lichidare = { valoare: 10, stare: "margine", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "DIRECTIONAL");
  assert.equal(v.nivel, "PAZESTE", "lichidarea la 10% trebuie sa bata iesirea 'in favoare', si pentru short");
  assert.equal(v.declansator.masura, "lichidare");
});

// --- Revizie: garda `m.directieBot &&` de pe trend-contra era neprobata ---
// Sora ei de pe ramura de iesire e probata (testele DIRECTIONAL fara
// directieBot cunoscuta, mai sus); asta acopera si trend-contra.

await test("[mutant] fara directieBot cunoscuta, trendul NU inventeaza alarma", () => {
  const m = masuriBune(); m.directieBot = 0;
  m.eficienta = { valoare: 0.8, semn: 1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE",
    "directieBot necunoscuta, trend in sus: fara alarma inventata");
  m.eficienta = { valoare: 0.8, semn: -1, stare: "trend", prag: { trend: 0.60, zigzag: 0.30 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE",
    "directieBot necunoscuta, trend in jos: tot fara alarma inventata");
});

// --- Revizie: garda `mod !== "DIRECTIONAL"` de pe treapta de margine era
// neprobata - marginea, spre deosebire de lichidare, CHIAR se oglindeste:
// un bot directional lasat dinadins pe directie nu are voie sa primeasca
// "cantareste mutarea intervalului" cand sta la marginea unde castiga.

await test("[mutant] garda margine in DIRECTIONAL: long la 92% da LINISTE, nu REGLEAZA", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 92, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
});

await test("[mutant] garda margine in DIRECTIONAL: long la 8% da LINISTE, nu REGLEAZA", () => {
  const m = masuriBune(); m.directieBot = 1;
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 8, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
});

await test("[mutant] oglinda: garda margine in DIRECTIONAL: short la 92% da LINISTE", () => {
  const m = masuriBune(); m.directieBot = -1;
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 92, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
});

await test("[mutant] oglinda: garda margine in DIRECTIONAL: short la 8% da LINISTE", () => {
  const m = masuriBune(); m.directieBot = -1;
  m.eficienta = { valoare: 0.45, semn: 1, stare: "bine", prag: { trend: 0.60, zigzag: 0.30 } };
  m.pozitieInterval = { valoare: 8, stare: "margine", prag: { margine: 15 } };
  assert.equal(T.verdict(m, "DIRECTIONAL").nivel, "LINISTE");
});

// --- Revizie: `.trim()` lipsea pe trend, ca la modBot ---

await test("masoara: trend cu spatii in jur tot da directia, nu 0", () => {
  const botLong = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "  long  " } };
  assert.equal(T.masoara({ ...INTRARI, bot: botLong }).directieBot, 1,
    "spatii in jurul lui long nu au voie sa stinga oglindirea");
  const botShort = { ...BOT, buOrderData: { ...BOT.buOrderData, trend: "  SHORT  " } };
  assert.equal(T.masoara({ ...INTRARI, bot: botShort }).directieBot, -1);
});

await test("decimare la 20 de secunde pe 66 de minute da ~66 intrari, nu 1", () => {
  let ist = [];
  const t0 = ACUM;
  for (let i = 0; i < 200; i++) {
    ist = T.istoricAdauga(ist, { t: t0 + i * 20000, perechi: i }, t0 + i * 20000);
  }
  assert.ok(ist.length > 50 && ist.length < 200, `lungime ${ist.length}, asteptat ~66`);
});

await test("plafon 1440: verifica ca se pastreaza cele NOI si se arunca cele VECHI", () => {
  const acum = ACUM;
  let ist = Array.from({ length: 1500 }, (_, i) => ({ t: acum - (1500 - i) * 60000, perechi: i }));
  ist = T.istoricAdauga(ist, { t: acum, perechi: 1500 }, acum);
  assert.ok(ist.length <= 1440, `au ramas ${ist.length}`);
  const prima = ist[0].perechi;
  const ultima = ist[ist.length - 1].perechi;
  assert.ok(prima > 60, `prima intrare ar trebui sa fie de la sfarsit (>60), nu ${prima}`);
  assert.equal(ultima, 1500, `ultima intrare ar trebui sa fie cea mai noua`);
});

await test("taie ce e mai vechi de 24 de ore, verifica granita la exact 24h", () => {
  const acum = ACUM;
  const exact24h = [
    { t: acum - 24 * 3600000, perechi: 1 },
    { t: acum - 24 * 3600000 - 1, perechi: 0 },
    { t: acum - 60000, perechi: 2 }
  ];
  const ist = T.istoricAdauga(exact24h, { t: acum, perechi: 3 }, acum);
  const perechiSet = new Set(ist.map((x) => x.perechi));
  assert.ok(perechiSet.has(1), "exact 24h ar trebui sa fie inclus");
  assert.ok(!perechiSet.has(0), "24h+1s ar trebui sa fie exclus");
  assert.ok(perechiSet.has(2), "60s ar trebui sa fie inclus");
  assert.ok(perechiSet.has(3), "acum ar trebui sa fie inclus");
});

await test("ceas dat inapoi (t mai vechi decat ultima) se respinge", () => {
  const acum = ACUM;
  let ist = [{ t: acum - 60000, perechi: 1 }, { t: acum - 30000, perechi: 2 }];
  const lungimeOrig = ist.length;
  const perechiOrig = ist.map((x) => x.perechi);
  ist = T.istoricAdauga(ist, { t: acum - 65000, perechi: 99 }, acum);
  assert.equal(ist.length, lungimeOrig, "intrarea cu t mai vechi se respinge");
  assert.deepEqual(ist.map((x) => x.perechi), perechiOrig, "lista ramane neatinsa la ceas mai vechi");
});

await test("pretPerpViu falsy (null/0/\"\"/false) cade pe ultima inchidere, nu pe 0", () => {
  const ultimaInchidere = ZIGZAG[ZIGZAG.length - 1].close;
  const bazaFaraViu = T.masoara({ ...INTRARI, acum: ACUM });
  assert.equal(bazaFaraViu.pretPerp, ultimaInchidere, "fara pretPerpViu se ia ultima inchidere");

  // app.js trimite EXPLICIT null la bot de grid SPOT sau la pana de tickere.
  // Number(null) === 0, iar un pretPerp de 0 fabrica basis -100% si pozitie -700%,
  // amandoua marcate "bine". Verdictul devine o cifra inventata din date lipsa.
  for (const falsy of [null, undefined, 0, "", false]) {
    const m = T.masoara({ ...INTRARI, pretPerpViu: falsy, acum: ACUM });
    assert.equal(m.pretPerp, ultimaInchidere,
      "pretPerpViu=" + JSON.stringify(falsy) + " ar trebui sa cada pe ultima inchidere, nu pe " + m.pretPerp);
    assert.ok(m.basis.valoare === null || Math.abs(m.basis.valoare) < 50,
      "pretPerpViu=" + JSON.stringify(falsy) + " nu are voie sa fabrice basis " + m.basis.valoare);
  }

  // un pret viu ADEVARAT trebuie sa bata lumanarea cache-uita 300 s
  const viu = T.masoara({ ...INTRARI, pretPerpViu: 0.0161, acum: ACUM });
  assert.equal(viu.pretPerp, 0.0161, "un pret viu pozitiv bate lumanarea");
});

/* ── I9: alegerea botului ─────────────────────────────────────────────────
   Pana acum ecranul judeca botul ales de el insusi (primul activ), fara sa-i
   dea omului cum sa aleaga altul. Logica de alegere sta in modulul PUR ca sa
   poata fi probata; ecranul doar o cheama si deseneaza lista. */

const B_ACTIV = { id: "a1", simbol: "COTI_USDT_PERP", activ: true };
const B_ACTIV2 = { id: "a2", simbol: "BTC_USDT_PERP", activ: true };
const B_OPRIT = { id: "o1", simbol: "ETH_USDT_PERP", activ: false };

await test("I9: fara preferinta, alege primul ACTIV, nu primul din lista", () => {
  const r = T.alegeBot([B_OPRIT, B_ACTIV], null);
  assert.equal(r.bot.id, "a1", "un bot activ bate unul oprit, oricare e ordinea rutei");
  assert.equal(r.motiv, "auto-activ");
});

await test("I9: fara niciun bot activ, alege primul si SPUNE ca e alegerea lui", () => {
  const r = T.alegeBot([B_OPRIT], null);
  assert.equal(r.bot.id, "o1");
  assert.equal(r.motiv, "auto-primul", "omul trebuie sa poata afla ca ecranul a ales singur");
});

await test("I9: preferinta omului bate alegerea automata, chiar daca botul e OPRIT", () => {
  const r = T.alegeBot([B_ACTIV, B_OPRIT], "o1");
  assert.equal(r.bot.id, "o1", "daca omul a ales anume botul oprit, aia se arata");
  assert.equal(r.motiv, "ales-de-om");
});

await test("I9: preferinta pentru un bot care a DISPARUT nu lasa ecranul gol si nu minte", () => {
  // Cazul real: omul alege un bot, botul se inchide, ruta nu-l mai intoarce.
  const r = T.alegeBot([B_ACTIV, B_ACTIV2], "fantoma");
  assert.equal(r.bot.id, "a1", "cade inapoi pe alegerea automata, nu pe null");
  assert.equal(r.motiv, "preferat-disparut",
    "motivul trebuie sa spuna ca preferatul a disparut - altfel omul crede ca se uita la botul lui");
});

await test("I9: lista goala sau nevalida da bot null, fara sa arunce", () => {
  for (const intrare of [[], null, undefined, "nu-e-lista"]) {
    const r = T.alegeBot(intrare, "a1");
    assert.equal(r.bot, null, `${JSON.stringify(intrare)} ar trebui sa dea bot null`);
    assert.equal(r.motiv, "fara-boti");
  }
});

await test("I9: id-ul se compara ca TEXT (ruta poate da numar, localStorage da mereu sir)", () => {
  const cuNumar = [{ id: 77, simbol: "X_USDT_PERP", activ: false }, B_ACTIV];
  const r = T.alegeBot(cuNumar, "77");
  assert.equal(r.bot.id, 77, "'77' din localStorage trebuie sa gaseasca id-ul numeric 77");
  assert.equal(r.motiv, "ales-de-om");
});

/* ── gaura din durata la margine ──────────────────────────────────────────
   minuteContinuuLaMargine numara intre PRIMA si ULTIMA intrare la margine,
   fara sa se uite daca intre ele istoricul are GAURI. Doua masuratori rare,
   la 200 de minute distanta, raportau 200 de minute "continue" - si aprindeau
   REGLEAZA pe o dovada care nu exista. */

await test("durata la margine NU numara peste o gaura din istoric", () => {
  const acum = ACUM;
  // Doua intrari la margine, la 200 min distanta, si NIMIC intre ele.
  const rar = [
    { t: acum - 200 * 60000, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE, perechi: 1 },
    { t: acum, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE, perechi: 2 }
  ];
  const m = T.masoara({ bot: BOT, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE, istoric: rar, acum });
  const durata = m.pozitieInterval.minuteLaMargine;
  assert.ok(typeof durata === "number" && durata < 60,
    `doua masuratori la 200 min distanta nu dovedesc 200 min continue la margine (a zis ${durata})`);

  // Si controlul: cu istoric DES, aceleasi 200 de minute chiar se numara.
  const des = [];
  for (let i = 200; i >= 0; i--) des.push({ t: acum - i * 60000, pretPerp: PRET_MARGINE, pretSpot: PRET_MARGINE, perechi: 1 });
  const m2 = T.masoara({ bot: BOT, klinePerp: KLINE_MARGINE, pretSpot: PRET_MARGINE, istoric: des, acum });
  assert.ok(m2.pozitieInterval.minuteLaMargine >= 199,
    `cu masuratori din minut in minut, 200 de minute la margine TREBUIE numarate (a zis ${m2.pozitieInterval.minuteLaMargine})`);
});

/* ── eroarea trebuie sa spuna CE SA FACA, nu doar ca a esuat ──────────────
   23.09: Marius a deschis versiunea publicata si a vazut "Nu am putut citi
   botii · AUTH_REQUIRED". Corect tehnic, inutil pentru el: nu-i spune nici
   unde e, nici ce are de facut. O eroare fara motiv e tot un ecran care tace
   cand ar trebui sa vorbeasca. */

await test("eroare: AUTH pe versiunea PUBLICATA spune unde sa se duca, nu codul", () => {
  const e = T.explicaEroarea("AUTH_REQUIRED", 401, "crypto-wuy.pages.dev");
  assert.ok(!/AUTH_REQUIRED|401/.test(e.titlu), `titlul nu are voie sa fie jargon: "${e.titlu}"`);
  assert.match(e.ceFac, /PORNESTE-CRYPTO-RADAR/,
    "trebuie sa-i spuna EXACT cu ce sa porneasca acasa");
  assert.match(e.ceFac, /Pionex/, "trebuie sa spuna de ce nu merge aici");
  assert.match(e.ceFac, /Pune parola în Setări \(butonul ⚙\)/, "audit 24.09: 401 = parola, si pe publicat");
  assert.equal(e.local, false);
});

/* ── Audit 24.09: 401 NU inseamna "lipsesc cheile Pionex" ────────────────
   401 vine din _shared/auth.js (AUTH_REQUIRED / AUTH_INVALID): lipseste sau e
   gresita PAROLA aplicatiei (APP_API_TOKEN), nu cheile Pionex. Mesajul vechi il
   trimitea sa reporneasca .bat-ul - degeaba. Cheile lipsa vin ca 503. */

const SETARI = /Pune parola în Setări \(butonul ⚙\)/;

await test("[audit] eroare: 401 AUTH_REQUIRED pe LOCAL -> parola in Setari, nu cheile", () => {
  for (const gazda of ["localhost", "127.0.0.1"]) {
    const e = T.explicaEroarea("AUTH_REQUIRED", 401, gazda);
    assert.equal(e.local, true, gazda + " trebuie recunoscut ca local");
    assert.match(e.ceFac, SETARI, `"${e.ceFac}"`);
    assert.doesNotMatch(e.titlu + e.ceFac, /AUTH_REQUIRED|401/, "fara jargon");
    assert.ok(!/pages\.dev/.test(e.ceFac), "pe local nu are rost sa-i vorbeasca despre versiunea publicata");
  }
});

await test("[audit] eroare: 401 AUTH_INVALID prin TUNEL (telefon) -> parola in Setari, nu 'du-te acasa'", () => {
  const e = T.explicaEroarea("AUTH_INVALID", 401, "athens-potato.trycloudflare.com");
  assert.match(e.ceFac, SETARI, `"${e.ceFac}"`);
  assert.doesNotMatch(e.ceFac, /refuză cererile venite de la Cloudflare/,
    "tunelul E serverul de acasa - nu are voie sa-l trimita acasa");
  assert.match(e.titlu, /nu se potrivește/, "parola gresita se spune altfel decat parola lipsa");
});

await test("[audit] eroare: codul AUTH_REQUIRED fara status tot da mesajul cu Setari", () => {
  const e = T.explicaEroarea("AUTH_REQUIRED", null, "127.0.0.1");
  assert.match(e.ceFac, SETARI);
});

await test("[audit] eroare: 403 fara 'Bot reading' -> bifeaza dreptul la cheia Pionex", () => {
  const e = T.explicaEroarea("Cheia Pionex nu are dreptul „Bot reading”. Bifează-l în Pionex › API Management (e doar citire) sau fă o cheie nouă cu el.", 403, "127.0.0.1");
  assert.match(e.ceFac, /Bifează «Bot reading» la cheia Pionex/, `"${e.ceFac}"`);
  assert.doesNotMatch(e.ceFac, /parola/i, "403 nu e o problema de parola");
});

await test("[audit] eroare de retea (Failed to fetch) -> serverul de acasa e oprit", () => {
  for (const mesaj of ["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed", "TypeError: Failed to fetch"]) {
    const e = T.explicaEroarea(mesaj, null, "127.0.0.1");
    assert.match(e.ceFac, /Serverul de acasă e oprit — pornește PORNESTE-CRYPTO-RADAR\.bat/, `${mesaj}: "${e.ceFac}"`);
  }
});

await test("[audit] eroare: cheile lipsa pe server (503 / NOT_CONFIGURED) -> mesajul cu .bat", () => {
  const cazuri = [
    ["Cheile PIONEX_API_KEY / PIONEX_API_SECRET nu sunt configurate.", 503],
    ["APP_API_TOKEN_NOT_CONFIGURED", 503],
    ["NOT_CONFIGURED", null],
  ];
  for (const [mesaj, st] of cazuri) {
    const e = T.explicaEroarea(mesaj, st, "127.0.0.1");
    assert.match(e.ceFac, /PORNESTE-CRYPTO-RADAR\.bat/, `${mesaj}: "${e.ceFac}"`);
    assert.match(e.ceFac, /chei/i, `${mesaj}: trebuie sa spuna ca e vorba de chei`);
    assert.doesNotMatch(e.ceFac, /fereastra neagră de pe calculator/, "nu e o cadere la Pionex, e configurare");
  }
});

await test("[audit] eroare: un cuvant care CONTINE 'rate' nu e limitare de ritm", () => {
  // /RATE/ prindea "configuRATE", "geneRATE"... si spunea "s-au cerut date prea des".
  const e = T.explicaEroarea("Pionex bot API: key expired, please regenerate", 502, "127.0.0.1");
  assert.doesNotMatch(e.ceFac, /prea des/, `"${e.ceFac}"`);
  assert.match(e.ceFac, /regenerate/, "mesajul brut ramane la vedere");
});

await test("[audit] eroare: 429 prin TUNEL e limitare de ritm, nu refuz de adresa Cloudflare", () => {
  const e = T.explicaEroarea("RATE_LIMITED", 429, "athens-potato.trycloudflare.com");
  assert.doesNotMatch(e.ceFac, /refuz de adresă/, `tunelul cere de acasa - "${e.ceFac}"`);
});

await test("eroare: 429 pe PUBLICAT e refuzul Pionex fata de IP, nu vina omului", () => {
  const e = T.explicaEroarea("RATE_LIMIT", 429, "crypto-wuy.pages.dev");
  assert.match(e.ceFac, /refuz/i, "429 cu galeata plina e REFUZ, nu limitare - asta s-a masurat");
});

await test("eroare: 429 pe LOCAL chiar e prea multe cereri - alt sfat", () => {
  const e = T.explicaEroarea("RATE_LIMIT", 429, "127.0.0.1");
  assert.ok(!/Cloudflare/i.test(e.ceFac),
    `de acasa 429 chiar inseamna prea des, nu refuz de IP: "${e.ceFac}"`);
});

await test("eroare: una necunoscuta se arata ca atare, nu se inventeaza sfat", () => {
  const e = T.explicaEroarea("Ceva ce nu stiu", 500, "127.0.0.1");
  assert.match(e.ceFac, /Ceva ce nu stiu/,
    "mesajul brut trebuie pastrat - altfel ascund o eroare pe care n-o inteleg");
});

await test("eroare: fara mesaj si fara status nu arunca si nu minte", () => {
  const e = T.explicaEroarea(null, null, null);
  assert.ok(e && typeof e.titlu === "string" && e.titlu.length > 0);
  assert.ok(typeof e.ceFac === "string" && e.ceFac.length > 0);
});

/* ── 5xx prin tunel: Cloudflare inghite motivul ───────────────────────────
   MASURAT 23.09 pe un tunel trycloudflare: 200 si 401 trec ca JSON, dar orice
   5xx de la serverul de acasa e INLOCUIT cu pagina de eroare a Cloudflare.
   getJSON nu mai poate parsa si arunca "Raspuns invalid · HTTP 502" - fara
   niciun motiv. Omul trebuie sa afle UNDE scrie motivul adevarat. */

await test("eroare: 5xx spune ca motivul e in fereastra neagra, nu doar codul", () => {
  const e = T.explicaEroarea("Răspuns invalid · HTTP 502", null, "athens-potato.trycloudflare.com");
  assert.ok(!/^Răspuns invalid/.test(e.ceFac),
    `un cod gol nu-i spune omului nimic: "${e.ceFac}"`);
  assert.match(e.ceFac, /fereastra neagr|calculator/i,
    "trebuie sa-i spuna unde se vede motivul adevarat");
});

await test("eroare: 5xx cu status pe eroare (nu in text) merge la fel", () => {
  const e = T.explicaEroarea("UPSTREAM", 503, "127.0.0.1");
  assert.match(e.ceFac, /fereastra neagr|calculator/i);
});

await test("eroare: 4xx necunoscut NU se confunda cu 5xx", () => {
  const e = T.explicaEroarea("BAD_REQUEST", 400, "127.0.0.1");
  assert.ok(!/fereastra neagr/i.test(e.ceFac),
    `400 nu e o cadere a serverului: "${e.ceFac}"`);
  assert.match(e.ceFac, /BAD_REQUEST/, "mesajul brut ramane la vedere");
});

console.log(`\nV73_TABLOU ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
