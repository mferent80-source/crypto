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
    comision: { valoare: 0.2, stare: "bine", prag: 0.50 },
    directieBot: 0,
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
  const m = masuriBune(); m.comision = { valoare: 0.7, stare: "rau", prag: 0.50 };
  const v = T.verdict(m, "GRID");
  assert.ok(v.declansator, "lipseste declansatorul");
  assert.equal(v.declansator.masura, "comision");
  assert.equal(v.declansator.prag, 0.50);
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

await test("date insuficiente SI lichidare sub 8 cer tot NEDOVEDIT, nu OPRESTE", () => {
  const m = masuriBune();
  m.varstaBotMin = 47;
  m.lichidare = { valoare: 6, stare: "rau", prag: { grav: 8, atentie: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "NEDOVEDIT", "NEDOVEDIT trebuie sa ramana prima treapta, inaintea lui OPRESTE");
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
  m.comision = { valoare: 0.7, stare: "rau", prag: 0.50 };
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

await test("pozitia lipita de margine da REGLEAZA (nu doar declansatorul - si nivelul)", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 90, stare: "margine", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.masura, "pozitieInterval");
  assert.equal(v.declansator.prag, 85, "la marginea de sus, pragul rupt e 85, nu unul fix");
});

await test("pozitia lipita de marginea de JOS raporteaza pragul 15, nu 85", () => {
  const m = masuriBune();
  m.pozitieInterval = { valoare: 10, stare: "margine", prag: { margine: 15 } };
  const v = T.verdict(m, "GRID");
  assert.equal(v.nivel, "REGLEAZA");
  assert.equal(v.declansator.prag, 15, "10% e sub pragul de JOS (15), nu peste cel de sus (85)");
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
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) {
    ist = T.istoricAdauga(ist, { t: t0 + i * 20000, perechi: i }, t0 + i * 20000);
  }
  assert.ok(ist.length > 50 && ist.length < 200, `lungime ${ist.length}, asteptat ~66`);
});

await test("plafon 1440: verifica ca se pastreaza cele NOI si se arunca cele VECHI", () => {
  const acum = Date.now();
  let ist = Array.from({ length: 1500 }, (_, i) => ({ t: acum - (1500 - i) * 60000, perechi: i }));
  ist = T.istoricAdauga(ist, { t: acum, perechi: 1500 }, acum);
  assert.ok(ist.length <= 1440, `au ramas ${ist.length}`);
  const prima = ist[0].perechi;
  const ultima = ist[ist.length - 1].perechi;
  assert.ok(prima > 60, `prima intrare ar trebui sa fie de la sfarsit (>60), nu ${prima}`);
  assert.equal(ultima, 1500, `ultima intrare ar trebui sa fie cea mai noua`);
});

await test("taie ce e mai vechi de 24 de ore, verifica granita la exact 24h", () => {
  const acum = Date.now();
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
  const acum = Date.now();
  let ist = [{ t: acum - 60000, perechi: 1 }, { t: acum - 30000, perechi: 2 }];
  const lungimeOrig = ist.length;
  const perechiOrig = ist.map((x) => x.perechi);
  ist = T.istoricAdauga(ist, { t: acum - 65000, perechi: 99 }, acum);
  assert.equal(ist.length, lungimeOrig, "intrarea cu t mai vechi se respinge");
  assert.deepEqual(ist.map((x) => x.perechi), perechiOrig, "lista ramane neatinsa la ceas mai vechi");
});

console.log(`\nV73_TABLOU ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
