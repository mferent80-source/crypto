// Proba v100.382 (24.11.2026, ideea 2 din „DE FĂCUT 24.11” la botul Combo Pionex, el: „continuă”): ruta brută /api/bot-orders?brut=1 (colectorul:
// arhiva boților închiși și reconcilierea contului) întorcea lista Pionex NEATINSĂ - cu adresa webhook-ului TradingView CU TOKENUL ei (buOrderData.userSignals)
// și cu userId / keyId. Ruta obișnuită le scotea din v100.380 (faraIdCont); acum și cea brută. Cei care o folosesc citesc doar strategyId / buOrderId /
// buOrderData (fără userSignals), deci nimic nu se strică.
// Rulare: node scripts/proba-v100382.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import "./lib/text-ro-global.mjs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }

const TOKEN = "proba-token-1234567890";
let ip = 0;
function fetchStub(fn) { const cereri = []; globalThis.fetch = async (url) => { cereri.push(String(url)); return new Response(JSON.stringify(fn(String(url))), { status: 200, headers: { "content-type": "application/json" } }); }; return cereri; }
async function botOrders(qs) {
  const m = await import(`../functions/api/bot-orders.js?t=${Date.now()}_${Math.random()}`);
  const r = await m.onRequestGet({ request: new Request("https://exemplu.test/api/bot-orders" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.82.0." + (++ip) } }), env: { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" } });
  return { status: r.status, corp: JSON.parse(await r.text()), text: "" };
}
/* botul de semnal așa cum îl dă Pionex (id-urile contului înlocuite; adresa webhook-ului e una de probă, forma e aceeași) + un bot de grid închis */
const semnal = () => ({ strategyId: "2660", buOrderId: "2b4f77e9", buOrderType: "smart_copy", status: "open", userId: "CONT-SECRET", keyId: "CHEIE-SECRETA", base: "-", quote: "USDT",
  buOrderData: { signalName: "BTCUSDT.P", status: "main_loop", quoteTotalInvestment: "53.59", userSignals: { tradingviewConfig: { webhookUrl: "https://www.pionex.com/signal/api/v1/signal_listener/trading_view?token=TOKEN-SECRET-DE-PROBA", message: "{\"data\":{}}" } },
    portfolio: [{ base: "BTC", tradeBase: "BTC.PERP", qtyLong: "0", qtyShort: "0", roundCount: 0 }] } });
const grid = () => ({ strategyId: "s1", buOrderId: "b1", buOrderType: "futures_grid", status: "closed", userId: "CONT-SECRET", keyId: "CHEIE-SECRETA", base: "BULLA.PERP", quote: "USDT", buOrderData: { status: "closed", row: 54, closeReason: "stop" } });
const nativ = globalThis.fetch;

console.log("\nV100.382 · ruta brută fără adresa webhook-ului · proba\n");
await test("🔒 /api/bot-orders?brut=1: fără userSignals (adresa webhook-ului cu token), fără userId / keyId; restul formei Pionex rămâne", async () => {
  try {
    fetchStub((u) => u.includes("/bot/orders") ? { result: true, data: { results: [semnal(), grid()], nextPageToken: "1a0c7a4704b", previousPageToken: null } } : { result: true, data: { tickers: [], symbols: [] } });
    const r = await botOrders("?status=finished&brut=1"), j = JSON.stringify(r.corp);
    assert.equal(r.status, 200); assert.equal(r.corp.bots.length, 2); assert.equal(r.corp.nextPageToken, "1a0c7a4704b");
    assert.ok(!/TOKEN-SECRET|signal_listener|webhookUrl|userSignals/.test(j), "adresa webhook-ului a rămas în răspunsul brut");
    assert.ok(!/CONT-SECRET|CHEIE-SECRETA|"userId"|"keyId"/.test(j), "userId / keyId au rămas în răspunsul brut");
    /* ce citesc colectorul (tura-arhiva-boti, tura-cont) și arhiva rămâne */
    assert.equal(r.corp.bots[0].strategyId, "2660"); assert.equal(r.corp.bots[0].buOrderId, "2b4f77e9"); assert.equal(r.corp.bots[0].buOrderData.signalName, "BTCUSDT.P");
    assert.equal(r.corp.bots[0].buOrderData.portfolio[0].tradeBase, "BTC.PERP"); assert.equal(r.corp.bots[1].buOrderData.closeReason, "stop"); assert.equal(r.corp.bots[1].base, "BULLA.PERP");
  } finally { globalThis.fetch = nativ; }
});
await test("ruta obișnuită: tot fără adresa webhook-ului (v100.380, neschimbată)", async () => {
  try {
    fetchStub((u) => u.includes("/bot/orders") ? { result: true, data: { results: [semnal()], nextPageToken: null } } : { result: true, data: { tickers: [], symbols: [] } });
    const r = await botOrders("?status=running"), j = JSON.stringify(r.corp);
    assert.equal(r.status, 200); assert.ok(!/TOKEN-SECRET|webhookUrl|userSignals|CONT-SECRET|CHEIE-SECRETA/.test(j));
  } finally { globalThis.fetch = nativ; }
});

console.log("\nversiunea");
await test("v100.382 e pusă peste tot (colectorul neatins, v101.211), proba e în lanț după v100.381", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.383: „de la 382 încolo” (versiunea și colectorul merg mai departe; după ea în lanț vine proba v100.383) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 382, "package.json"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 382); assert.ok(bi.li382 && bi.li382.length > 150, "BUILD_INFO.li382");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 382).length >= 4, true, "index.html: v100.382 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 382, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 382, "versiune.js");
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("./colector.mjs")) || [])[1] >= 211, "colectorul de la v101.211 încolo");
  assert.match(pk.scripts.test, /npm run test:v100381 && npm run test:v100382/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100382"], "node scripts/proba-v100382.mjs");
});

console.log(`\n${teste - picate} / ${teste} teste trec.\n`);
process.exit(picate ? 1 : 0);
