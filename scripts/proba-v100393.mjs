// Proba v100.393 (auditul sever 25.11.2026, el: „mai fă un audit sever și reverifică să fie gata de bani”): Pionex dă SHORT-ul botului de semnal
// cu MINUS — „qtyShort”: "-0.0009" (citit pe viu: botul BTC, 25.11 18:05–~18:40, 52,48 USDT în short). bot-orders.js cerea qtyShort > 0 ⇒ short-ul
// ieșea „poziție NECLARĂ” (cantitate 0 + bani > 0): fără direcție, fără alertă de intrare / ieșire în colector. proba v100380 testase short-ul POZITIV.
//   A  short-ul cu minus ⇒ SHORT, poziția −0,0009, banii poziției 52,48, nu neclar (cantitatea = mărimea, ca la gridul futures: Math.abs)
//   B  restul neschimbat: long, fără poziție, neclar (cantitate 0 + bani; long și short deodată), cantitate lipsă
//   C  textele paginii și alerta colectorului: SHORT în banda de sus; trecerea fără poziție → short cu minus dă „intrat”, short → fără „iesit”
//   V  versiunea v100.393, proba în lanț după v100.392
// Rulare: node scripts/proba-v100393.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import "./lib/text-ro-global.mjs";
import { normalizeaza } from "../functions/api/bot-orders.js";

const citeste = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const BS = new Function(`${citeste("../public/lib/bot-semnal.js")}; return BotSemnal;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
console.log("\nv100.393 · short-ul botului de semnal vine cu minus de la Pionex · proba\n");

/* forma botului din proba v100380 (id-urile contului înlocuite), doar câmpurile care contează aici */
const bot = (p = {}) => ({ quote: "USDT", base: "-", buOrderType: "smart_copy", status: "open", canceling: false, strategyId: "2660", buOrderId: "2b4f77e9", closeTime: 0, createTime: Date.UTC(2026, 10, 23, 18, 32),
  buOrderData: { profit: "0", tradeType: "futures", quoteTotalInvestment: "53.59", currentQuoteAmount: "53.59", status: "main_loop", signalName: "BTCUSDT.P", market: "perpFutures",
    portfolio: [Object.assign({ tradeBase: "BTC.PERP", base: "BTC", leverage: 1, qtyLong: "0", qtyShort: "0", amountLong: "0", amountShort: "0", initPrice: "61466.35", roundCount: 0 }, p)] } });
const HARTA = { "BTC.PERP|USDT": "BTC_USDT_PERP" }, PRETURI = { BTC_USDT_PERP: 58600 };
const N = (p) => normalizeaza(bot(p), PRETURI, HARTA);
/* exact ce a dat Pionex pe viu la 25.11 ~18:20 (câmpurile de poziție) */
const VIU = { qtyLong: "0", qtyShort: "-0.0009", amountLong: "0", amountShort: "52.48062" };

await test("A  short-ul cu minus (ca pe viu, 25.11) ⇒ SHORT, poziția −0,0009, banii poziției, nu neclar", () => {
  const s = N(VIU);
  assert.equal(s.pozitieNeclara, false, "nu e neclar"); assert.equal(s.directie, "short"); assert.equal(s.pozitie, -0.0009); assert.equal(s.pozitieBani, 52.48062); assert.equal(s.inPozitie, true);
});

await test("B  restul neschimbat: long, fără poziție, neclar, cantitate lipsă", () => {
  const l = N({ qtyLong: "0.0006", amountLong: "52.1" }); assert.equal(l.directie, "long"); assert.equal(l.pozitie, 0.0006);
  const f = N({}); assert.equal(f.directie, null); assert.equal(f.pozitie, 0); assert.equal(f.inPozitie, false);
  const s = N({ qtyShort: "0.0006", amountShort: "52.1" }); assert.equal(s.directie, "short"); assert.equal(s.pozitie, -0.0006, "short-ul pozitiv (forma veche din probă) tot short");
  const a = N({ amountLong: "52.1" }); assert.equal(a.pozitieNeclara, true, "cantitate 0 + bani = neclar"); assert.equal(a.directie, null);
  const d = N({ qtyLong: "0.0006", qtyShort: "-0.0002" }); assert.equal(d.pozitieNeclara, true, "long și short deodată = neclar"); assert.equal(d.directie, null);
  const x = N({ qtyLong: null, qtyShort: null, amountShort: "52.1" }); assert.equal(x.directie, "short", "fără cantitate, banii spun direcția"); assert.equal(x.pozitie, null);
});

await test("C  pagina și colectorul: SHORT în banda de sus; fără poziție → short = „intrat”, short → fără = „iesit”", () => {
  assert.equal(BS.stare(N(VIU)).titlu, "SHORT");
  const r0 = BS.schimbare(null, N({}), 1), r1 = BS.schimbare(r0.ref, N(VIU), 2), r2 = BS.schimbare(r1.ref, N({}), 3);
  assert.equal(r1.ev, "intrat"); assert.equal(r2.ev, "iesit");
});

await test("V  versiunea v100.393 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.394: „de la 393 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.394) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 393); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 393); assert.ok(bi.li393 && bi.li393.length > 100, "BUILD_INFO.li393");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 393).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 393); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 393);
  assert.match(pk.scripts.test, /npm run test:v100392 && npm run test:v100393/); assert.equal(pk.scripts["test:v100393"], "node scripts/proba-v100393.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
