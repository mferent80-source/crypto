import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/tablou-bot.js", import.meta.url), "utf8");
const T = new Function(`${SRC}; return TabloBot;`)();

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
// 48 de lumanari care oscileaza: zigzag curat, eficienta aproape de zero
const ZIGZAG = Array.from({ length: 48 }, (_, i) => ({ close: i % 2 ? 0.0156 : 0.0154 }));
// 48 de lumanari care urca drept: eficienta 1
const TREND = Array.from({ length: 48 }, (_, i) => ({ close: 0.0150 + i * 0.00002 }));
const ISTORIC = Array.from({ length: 400 }, (_, i) => ({
  t: Date.now() - (400 - i) * 60000, perechi: i, pretPerp: 0.0155, pretSpot: 0.0155,
}));
const INTRARI = { bot: BOT, klinePerp: ZIGZAG, pretSpot: 0.0155, istoric: ISTORIC, acum: Date.now() };

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

await test("amplitudinea se raporteaza la treapta grilei", () => {
  const m = T.masoara(INTRARI);
  // treapta = (0.0158 - 0.0153) / 25 = 0.00002
  // ZIGZAG alterneaza strict 0.0154/0.0156 => fiecare pas = 0.0002 =>
  // amplitudine medie = 0.0002 => raportul la treapta = 0.0002 / 0.00002 = 10
  assert.ok(Math.abs(m.amplitudine.valoare - 10) < 0.01,
    `amplitudine gresita: ${m.amplitudine.valoare}, asteptat ~10`);
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
  assert.ok(Math.abs(m.comision.valoare - 0.45 / 2.30) < 1e-6, `comision: ${m.comision.valoare}`);
  assert.equal(m.comision.stare, "bine");
});

await test("comisionul care mananca peste jumatate din grid e rau", () => {
  const bot = { ...BOT, buOrderData: { ...BOT.buOrderData, totalFee: "-1.50" } };
  const m = T.masoara({ ...INTRARI, bot });
  assert.equal(m.comision.stare, "rau");
});

await test("fara bot, masurile care cer bot spun asta si nu crapa", () => {
  const m = T.masoara({ ...INTRARI, bot: null });
  for (const camp of ["pozitieInterval", "ritmPerechi", "amplitudine", "lichidare", "comision"]) {
    assert.equal(m[camp].stare, "nu-se-poate", `${camp}: ${m[camp].stare}`);
  }
  assert.ok(Number.isFinite(m.eficienta.valoare), "eficienta se poate socoti si fara bot");
});

console.log(`\nV73_TABLOU ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
