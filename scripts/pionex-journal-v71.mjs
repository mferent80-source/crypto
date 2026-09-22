// Proba pentru jurnalul Pionex v71.
// Cheama chiar functia din functions/api/pionex-account.js, cu fetch inlocuit,
// si verifica faptul care conteaza: actiunile pe care le cere app.js exista.
//
// Rulare: node scripts/pionex-journal-v71.mjs
import assert from "node:assert/strict";

const MOD = "../functions/api/pionex-account.js";
const TOKEN = "proba-token-1234567890";
const ENV = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret" };

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

// fetch de proba: retine ce s-a cerut si intoarce ce ii dam noi
let cereri = [];
function pregatesteFetch(raspuns) {
  cereri = [];
  globalThis.fetch = async (url, opt = {}) => {
    cereri.push({ url: String(url), headers: opt.headers || {} });
    return new Response(JSON.stringify(raspuns), { status: 200, headers: { "content-type": "application/json" } });
  };
}

function cerere(qs) {
  return new Request(`https://exemplu.test/api/pionex-account?${qs}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

async function cheama(qs) {
  const { onRequestGet } = await import(MOD);
  const res = await onRequestGet({ request: cerere(qs), env: ENV });
  let corp = null;
  try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp };
}

// ---- ce cere chiar app.js, cuvant cu cuvant ----
// v71FetchHistory("fills", symbol) si v71FetchHistory("orders", symbol) trimit:
//   action, symbol, limit=100, startTime, endTime
const FEREASTRA = "symbol=BTC_USDT&limit=100&startTime=1750000000000&endTime=1750086400000";

console.log("\nV71 · jurnal Pionex · proba actiunilor");

await test("actiunea 'fills' exista si ajunge la Pionex", async () => {
  pregatesteFetch({ result: true, data: { fills: [{ id: "1", symbol: "BTC_USDT" }] } });
  const r = await cheama(`action=fills&${FEREASTRA}`);
  assert.notEqual(r.corp?.error, "Unsupported read-only action", "serverul nu cunoaste actiunea 'fills'");
  assert.equal(r.status, 200, `asteptam 200, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.equal(cereri.length, 1, "nu s-a facut niciun apel catre Pionex");
  assert.match(cereri[0].url, /\/api\/v1\/trade\/fills\?/, `ruta gresita: ${cereri[0].url}`);
  assert.ok(Array.isArray(r.corp?.data?.fills), "raspunsul nu poarta data.fills, cum citeste app.js");
});

await test("actiunea 'orders' exista si ajunge la Pionex", async () => {
  pregatesteFetch({ result: true, data: { orders: [{ orderId: "9", symbol: "BTC_USDT" }] } });
  const r = await cheama(`action=orders&${FEREASTRA}`);
  assert.notEqual(r.corp?.error, "Unsupported read-only action", "serverul nu cunoaste actiunea 'orders'");
  assert.equal(r.status, 200, `asteptam 200, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.match(cereri[0].url, /\/api\/v1\/trade\/allOrders\?/, `ruta gresita: ${cereri[0].url}`);
  assert.ok(Array.isArray(r.corp?.data?.orders), "raspunsul nu poarta data.orders, cum citeste app.js");
});

await test("fereastra de timp ajunge la Pionex, nu se pierde pe drum", async () => {
  pregatesteFetch({ result: true, data: { fills: [] } });
  await cheama(`action=fills&${FEREASTRA}`);
  const u = cereri[0].url;
  assert.match(u, /startTime=1750000000000/, `startTime lipseste: ${u}`);
  assert.match(u, /endTime=1750086400000/, `endTime lipseste: ${u}`);
  assert.match(u, /limit=100/, `limit lipseste: ${u}`);
  assert.match(u, /symbol=BTC_USDT/, `symbol lipseste: ${u}`);
});

await test("parametrii sunt sortati ASCII si timestamp e in semnatura", async () => {
  pregatesteFetch({ result: true, data: { fills: [] } });
  await cheama(`action=fills&${FEREASTRA}`);
  const query = cereri[0].url.split("?")[1];
  const chei = query.split("&").map((x) => x.split("=")[0]);
  assert.deepEqual([...chei].sort(), chei, `parametrii nu sunt sortati ASCII: ${chei.join(",")}`);
  assert.ok(chei.includes("timestamp"), "timestamp lipseste din query");
  const h = cereri[0].headers;
  const get = (k) => (typeof h.get === "function" ? h.get(k) : h[k]);
  assert.ok(get("PIONEX-KEY"), "antetul PIONEX-KEY lipseste");
  assert.match(String(get("PIONEX-SIGNATURE") || ""), /^[0-9a-f]{64}$/, "semnatura nu e HMAC-SHA256 hex");
});

await test("limita e strunita, nu trece orice numar catre Pionex", async () => {
  pregatesteFetch({ result: true, data: { fills: [] } });
  await cheama("action=fills&symbol=BTC_USDT&limit=99999");
  assert.match(cereri[0].url, /limit=100(&|$)/, `limita n-a fost strunita: ${cereri[0].url}`);
});

await test("simbolul e curatat, nu se injecteaza parametri in query", async () => {
  pregatesteFetch({ result: true, data: { fills: [] } });
  await cheama("action=fills&symbol=BTC_USDT%26evil%3D1");
  const query = cereri[0].url.split("?")[1];
  const chei = query.split("&").map((x) => x.split("=")[0]);
  assert.deepEqual(chei, ["limit", "symbol", "timestamp"], `au aparut parametri straini: ${chei.join(",")}`);
  const symbol = query.split("&").find((x) => x.startsWith("symbol=")).slice(7);
  assert.match(symbol, /^[A-Z0-9_]+$/, `simbol necuratat: ${symbol}`);
});

await test("nicio ruta de tranzactionare nu s-a strecurat", async () => {
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL(MOD, import.meta.url), "utf8"));
  for (const interzis of ["/trade/order", "submit", "cancel", "POST", "DELETE"]) {
    assert.ok(!src.includes(interzis), `pionex-account.js contine "${interzis}" — build-ul trebuie sa ramana read-only`);
  }
});

console.log(`\nV71_PIONEX_JOURNAL ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
