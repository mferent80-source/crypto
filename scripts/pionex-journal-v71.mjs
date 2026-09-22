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

// `proaspat` da o instanta NOUA a modulului, ca starea de racire sa nu curga
// dintr-o proba in alta.
async function cheama(qs, modul = MOD) {
  const { onRequestGet } = await import(modul);
  const res = await onRequestGet({ request: cerere(qs), env: ENV });
  let corp = null;
  try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp };
}
const proaspat = () => `${MOD}?t=${Date.now()}_${Math.random()}`;

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

// ---- ritm si supravietuire la 429 ----
// Jurnalul trage pana la 128 de cereri (64 pentru fills + 64 pentru orders).
// Fara ritm si fara reincercare, un singur 429 omoara toata sincronizarea.

function fetchCu(status, headers = {}, corp = '{"result":true,"data":{"fills":[]}}') {
  cereri = [];
  globalThis.fetch = async (url) => {
    cereri.push({ url: String(url), cand: Date.now() });
    return new Response(corp, { status, headers });
  };
}

await test("cererile catre Pionex sunt distantate, nu trase in rafala", async () => {
  fetchCu(200);
  const m = proaspat();
  await Promise.all([
    cheama("action=fills&symbol=BTC_USDT", m),
    cheama("action=fills&symbol=ETH_USDT", m),
    cheama("action=fills&symbol=SOL_USDT", m),
  ]);
  assert.equal(cereri.length, 3, "nu s-au facut cele 3 apeluri");
  const momente = cereri.map((x) => x.cand).sort((a, b) => a - b);
  for (let i = 1; i < momente.length; i++) {
    const pauza = momente[i] - momente[i - 1];
    assert.ok(pauza >= 200, `pauza prea mica intre cereri: ${pauza}ms (a ${i + 1}-a)`);
  }
});

await test("un 429 de la Pionex se intoarce ca 429, cu retryAfter, nu ca 502 orb", async () => {
  fetchCu(429, { "retry-after": "7" }, "Too Many Requests");
  const r = await cheama("action=fills&symbol=BTC_USDT", proaspat());
  assert.equal(r.status, 429, `asteptam 429, am primit ${r.status} · ${JSON.stringify(r.corp)}`);
  assert.equal(r.corp?.retryAfter, 7, `retryAfter lipseste sau e gresit: ${JSON.stringify(r.corp)}`);
});

await test("dupa un 429, urmatoarea cerere NU mai loveste Pionex", async () => {
  fetchCu(429, { "retry-after": "30" }, "Too Many Requests");
  const m = proaspat();
  await cheama("action=fills&symbol=BTC_USDT", m);
  const dupaPrima = cereri.length;
  const r = await cheama("action=orders&symbol=BTC_USDT", m);
  assert.equal(cereri.length, dupaPrima, "a mai sunat Pionex desi era in racire");
  assert.equal(r.status, 429, `asteptam 429 din racire, am primit ${r.status}`);
  assert.ok(r.corp?.retryAfter > 0, `racirea nu spune cat sa astepte: ${JSON.stringify(r.corp)}`);
});

await test("racirea nu se aplica si la 'status', care nu suna Pionex", async () => {
  fetchCu(429, { "retry-after": "30" }, "Too Many Requests");
  const m = proaspat();
  await cheama("action=fills&symbol=BTC_USDT", m);
  const r = await cheama("action=status", m);
  assert.equal(r.status, 200, `'status' nu trebuie oprit de racire, a dat ${r.status}`);
});

// ---- partea din browser: sincronizarea trebuie sa SUPRAVIETUIASCA unui 429 ----
// Probele de mai jos iau codul CHIAR din public/app.js (nu o copie) si il ruleaza,
// ca sa nu pazeasca o copie care se desincronizeaza de fisierul livrat.
// `new Function` primeste aici DOAR text din propriul nostru public/app.js, citit
// de pe disc in proba locala — nu intra nimic din afara.
const fs = await import("node:fs");
const APP = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

// Atentie: lista de parametri poate contine acolade (`budget={requests:0,...}`),
// asa ca sarim intai peste paranteza semnaturii si abia apoi cautam corpul.
// Prima versiune a acestei functii taia dupa acolada din parametri si dadea rosu
// pe nedrept.
function sursaFunctiei(nume) {
  const cuAsync = APP.indexOf(`async function ${nume}(`);
  const start = cuAsync >= 0 ? cuAsync : APP.indexOf(`function ${nume}(`);
  if (start < 0) return null;
  // sari peste lista de parametri
  let i = APP.indexOf("(", start), paranteze = 0;
  for (; i < APP.length; i++) {
    if (APP[i] === "(") paranteze++;
    else if (APP[i] === ")") { paranteze--; if (!paranteze) { i++; break; } }
  }
  const corp = APP.indexOf("{", i);
  if (corp < 0) return null;
  let adancime = 0;
  for (let j = corp; j < APP.length; j++) {
    if (APP[j] === "{") adancime++;
    else if (APP[j] === "}") { adancime--; if (!adancime) return APP.slice(start, j + 1); }
  }
  return null;
}

await test("getJSON duce mai departe statusul si retryAfter, nu doar textul", async () => {
  const src = sursaFunctiei("getJSON");
  assert.ok(src, "nu gasesc getJSON in app.js");
  assert.match(src, /\.status\s*=/, "getJSON nu pune `status` pe eroare");
  assert.match(src, /retryAfter/, "getJSON pierde `retryAfter` din corpul raspunsului");
});

await test("v71CereCuRabdare reia dupa 429 si intoarce datele", async () => {
  const src = sursaFunctiei("v71CereCuRabdare");
  assert.ok(src, "functia v71CereCuRabdare nu exista in app.js");
  let incercari = 0;
  const getJSON = async () => {
    incercari++;
    if (incercari <= 2) throw Object.assign(Error("Pionex rate limit"), { status: 429, retryAfter: 0.01 });
    return { result: true, data: { fills: [1, 2] } };
  };
  const fn = new Function("getJSON", `${src}; return v71CereCuRabdare;`)(getJSON);
  const t0 = Date.now();
  const r = await fn("/api/pionex-account?action=fills");
  assert.equal(incercari, 3, `asteptam 3 incercari, au fost ${incercari}`);
  assert.deepEqual(r.data.fills, [1, 2], "nu s-au intors datele dupa reluare");
  assert.ok(Date.now() - t0 >= 10, "a reluat instant, fara sa astepte deloc");
});

await test("v71CereCuRabdare NU reia la alte erori, doar la 429", async () => {
  const src = sursaFunctiei("v71CereCuRabdare");
  let incercari = 0;
  const getJSON = async () => { incercari++; throw Object.assign(Error("cheie invalida"), { status: 502 }); };
  const fn = new Function("getJSON", `${src}; return v71CereCuRabdare;`)(getJSON);
  await assert.rejects(() => fn("/x"), /cheie invalida/);
  assert.equal(incercari, 1, `a reluat degeaba de ${incercari} ori la o eroare care nu e 429`);
});

await test("v71HistoryWindow chiar CHEAMA v71CereCuRabdare, nu getJSON direct", async () => {
  const src = sursaFunctiei("v71HistoryWindow");
  assert.ok(src, "nu gasesc v71HistoryWindow");
  assert.match(src, /v71CereCuRabdare\(/, "v71HistoryWindow inca cheama getJSON direct — reluarea nu se aplica");
});

await test("fills si orders nu mai trag in paralel prin acelasi Promise.all", async () => {
  const src = sursaFunctiei("v71SyncPionexJournal");
  assert.ok(src, "nu gasesc v71SyncPionexJournal");
  const paralel = /Promise\.all\(\[[^\]]*v71FetchHistory\("fills"[^\]]*v71FetchHistory\("orders"/.test(src);
  assert.ok(!paralel, "fills si orders inca pornesc simultan in Promise.all — dubleaza rafala");
});

console.log(`\nV71_PIONEX_JOURNAL ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
