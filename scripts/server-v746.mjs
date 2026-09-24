// Probele serverului pentru reparatiile auditului sever din 24.09 (v74.6).
// Fiecare proba cheama chiar ruta, cu `fetch` fals — niciun furnizor real nu e sunat.
//
// Rulare: node scripts/server-v746.mjs
import assert from "node:assert/strict";
import fs from "node:fs";

const TOKEN = "proba-token-1234567890";
const PIONEX_ENV = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" };
const { reseteazaRitmPionex } = await import("../functions/_shared/pionex.js");

let teste = 0, picate = 0;
function test(nume, fn) {
  teste++;
  reseteazaRitmPionex();
  return Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const proaspat = (mod) => `../functions/api/${mod}.js?t=${Date.now()}_${Math.random()}`;
let ip = 0;
const ipNou = () => `10.74.${Math.floor(++ip / 250)}.${ip % 250}`;
async function cheama(mod, qs, env, { token = TOKEN, ipFix = null, metoda = "onRequestGet", modul = null } = {}) {
  const m = await import(modul || proaspat(mod));
  const h = { "cf-connecting-ip": ipFix || ipNou() };
  if (token) h.authorization = `Bearer ${token}`;
  const res = await m[metoda]({ request: new Request(`https://exemplu.test/api/${mod}?${qs}`, { headers: h }), env });
  let corp = null; try { corp = JSON.parse(await res.clone().text()); } catch {}
  return { status: res.status, corp, headers: res.headers };
}
let cereri = [];
function fetchStub(fn) {
  cereri = [];
  globalThis.fetch = async (url, opt = {}) => {
    const u = String(url); cereri.push({ url: u, headers: new Headers(opt.headers || {}), opt });
    const r = await fn(u, opt);
    return new Response(typeof r.corp === "string" ? r.corp : JSON.stringify(r.corp ?? {}),
      { status: r.status ?? 200, headers: { "content-type": "application/json", ...(r.headers || {}) } });
  };
}

// ---- (6) timeout: un furnizor agatat nu are voie sa tina ruta (si poarta) pe loc ----
// AbortSignal.timeout e inlocuit: retinem cat a cerut codul (trebuie 8000) si
// il scurtam la 40 ms, ca proba sa nu astepte 8 s. Fetch-ul "agatat" se opreste
// DOAR daca primeste semnalul; fara semnal ar astepta la infinit.
const timeoutOriginal = AbortSignal.timeout.bind(AbortSignal);
let timeouturi = [];
AbortSignal.timeout = (ms) => { timeouturi.push(ms); return timeoutOriginal(40); };
const agatat = (opt) => new Promise((_, rej) => {
  const s = opt?.signal; if (!s) return;
  if (s.aborted) return rej(s.reason);
  s.addEventListener("abort", () => rej(s.reason));
});
const cuTermen = (p, ms = 4000, ce = "cererea") => Promise.race([p,
  new Promise((_, rej) => setTimeout(() => rej(Error(`${ce} a ramas AGATATA peste ${ms} ms (fetch fara timeout)`)), ms))]);
// Cele doua cereri pleaca in paralel; oricare ajunge prima la furnizor e cea agatata.
// Conteaza ca AMBELE se intorc, iar exact una e buna.
function unaPicaUnaTrece(a, b, bun = (x) => x.status === 200) {
  const bune = [a, b].filter(bun).length;
  assert.equal(bune, 1, `asteptam o cerere picata (cea agatata) si una buna: ${a.status} ${JSON.stringify(a.corp)} | ${b.status} ${JSON.stringify(b.corp)}`);
}
// Primul apel catre furnizor se agata; restul raspund normal cu `bun(url)`.
function primulAgatat(bun) {
  let n = 0;
  fetchStub((u, opt) => (n++ === 0 ? agatat(opt) : bun(u)));
}

console.log("\nV74.6 · serverul · probele reparatiilor");

await test("6 · pionex-account: fetch agatat -> a doua cerere NU se blocheaza in poarta", async () => {
  timeouturi = [];
  primulAgatat(() => ({ corp: { result: true, data: { balances: [] } } }));
  const m = proaspat("pionex-account");
  const [a, b] = await cuTermen(Promise.all([
    cheama("pionex-account", "action=balances", PIONEX_ENV, { modul: m }),
    cheama("pionex-account", "action=balances", PIONEX_ENV, { modul: m }),
  ]));
  unaPicaUnaTrece(a, b);
  assert.ok(timeouturi.includes(8000), `timeout cerut: ${timeouturi.join(",")} (asteptam 8000)`);
});

await test("6 · bot-orders: bot/orders agatat -> a doua cerere trece", async () => {
  timeouturi = [];
  primulAgatat((u) => u.includes("/bot/orders") ? { corp: { result: true, data: { results: [] } } } : { corp: { result: true, data: { tickers: [] } } });
  const m = proaspat("bot-orders");
  const [a, b] = await cuTermen(Promise.all([cheama("bot-orders", "", PIONEX_ENV, { modul: m }), cheama("bot-orders", "", PIONEX_ENV, { modul: m })]));
  unaPicaUnaTrece(a, b);
  assert.ok(timeouturi.every((x) => x === 8000) && timeouturi.length >= 2, `timeouturi: ${timeouturi}`);
});

await test("6 · bot-orders: tickerele PERP agatate -> botii vin, lipsa pretului se spune", async () => {
  fetchStub((u, opt) => u.includes("/bot/orders") ? { corp: { result: true, data: { results: [] } } } : agatat(opt));
  const r = await cuTermen(cheama("bot-orders", "", PIONEX_ENV));
  assert.equal(r.status, 200); assert.ok(r.corp.probleme?.preturi, "lipsa pretului nu se spune");
});

await test("6 · market: pionex_tickers agatat -> a doua cerere trece prin poarta", async () => {
  timeouturi = [];
  primulAgatat(() => ({ corp: { result: true, data: { tickers: [] } } }));
  const m = proaspat("market");
  const [a, b] = await cuTermen(Promise.all([cheama("market", "type=pionex_tickers", { APP_API_TOKEN: TOKEN }, { modul: m }),
    cheama("market", "type=pionex_tickers", { APP_API_TOKEN: TOKEN }, { modul: m })]));
  unaPicaUnaTrece(a, b, (x) => x.corp?.result === true);
  assert.ok(timeouturi.includes(8000), `timeouturi: ${timeouturi}`);
});

await test("6 · market futures: Binance agatat -> raspuns cu probleme, nu agatat", async () => {
  timeouturi = [];
  fetchStub((u, opt) => agatat(opt));
  const r = await cuTermen(cheama("market", "type=futures&symbol=BTCUSDT", { APP_API_TOKEN: TOKEN }));
  assert.equal(r.status, 200); assert.ok(r.corp.probleme?.funding, "problema nu se spune");
  assert.ok(timeouturi.length >= 5 && timeouturi.every((x) => x === 8000), `timeouturi: ${timeouturi}`);
});

await test("6 · intel crypto_global: CoinGecko agatat -> eroare, nu agatat", async () => {
  timeouturi = [];
  fetchStub((u, opt) => agatat(opt));
  const r = await cuTermen(cheama("intel", "action=crypto_global", { APP_API_TOKEN: TOKEN }));
  assert.ok(r.status >= 500, `status ${r.status}`); assert.ok(timeouturi.includes(8000), `timeouturi: ${timeouturi}`);
});

await test("6 · external-intel options: Deribit agatat -> available:false, nu agatat", async () => {
  timeouturi = [];
  fetchStub((u, opt) => agatat(opt));
  const r = await cuTermen(cheama("external-intel", "action=options&symbol=BTC", { APP_API_TOKEN: TOKEN }));
  assert.equal(r.corp?.available, false); assert.ok(timeouturi.includes(8000), `timeouturi: ${timeouturi}`);
});

await test("6 · stocks quote: Twelve Data agatat -> a doua cerere trece prin poarta", async () => {
  timeouturi = [];
  primulAgatat(() => ({ corp: { symbol: "AAPL", close: "10", previous_close: "9" } }));
  const env = { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" }, m = proaspat("stocks");
  const [a, b] = await cuTermen(Promise.all([cheama("stocks", "action=quote&symbol=AAPL", env, { modul: m }), cheama("stocks", "action=quote&symbol=AAPL", env, { modul: m })]));
  unaPicaUnaTrece(a, b);
  assert.ok(timeouturi.includes(8000), `timeouturi: ${timeouturi}`);
});

// Baza D1 falsa, cat ii trebuie monitorului ca sa ruleze.
const dbFals = () => {
  const st = { bind: () => st, first: async () => null, run: async () => ({ meta: { last_row_id: 1 } }), all: async () => ({ results: [] }) };
  return { exec: async () => {}, prepare: () => st, batch: async () => [] };
};
await test("6 · radar-monitor: Pionex agatat -> rularea se termina cu ERROR, nu agatata", async () => {
  timeouturi = [];
  fetchStub((u, opt) => agatat(opt));
  const w = (await import(`../workers/radar-monitor.js?t=${Math.random()}`)).default;
  const res = await cuTermen(w.fetch(new Request("https://m.test/run", { method: "POST", headers: { authorization: "Bearer mt-1234567890" } }),
    { MONITOR_TOKEN: "mt-1234567890", DB: dbFals(), MONITOR_CRYPTO: "1" }));
  const corp = await res.json();
  assert.equal(corp.results?.[0]?.status, "ERROR", JSON.stringify(corp));
  assert.ok(timeouturi.includes(8000), `timeouturi: ${timeouturi}`);
});

await test("6 · provider-health: citirea cheii Pionex agatata -> rand FAIL, ruta raspunde", async () => {
  fetchStub((u, opt) => agatat(opt));
  const r = await cuTermen(cheama("provider-health", "deep=0", PIONEX_ENV));
  assert.equal(r.status, 200);
  const px = r.corp.providers.find((p) => /pionex/i.test(p.name));
  assert.notEqual(px.state, "OK"); assert.notEqual(px.state, "CONFIGURED");
});

AbortSignal.timeout = timeoutOriginal;

// ---- (8) auth: limita pe incercarile GRESITE, inainte de verificarea tokenului ----
await test("8 · 11 tokenuri gresite de pe acelasi IP -> a 11-a e 429", async () => {
  fetchStub(() => ({ corp: { result: true, data: { balances: [] } } }));
  const ipFix = "10.99.0.8", st = [];
  for (let i = 0; i < 11; i++) st.push((await cheama("pionex-account", "action=status", PIONEX_ENV, { token: `gresit-${i}-xxxxxxxx`, ipFix })).status);
  assert.deepEqual(st.slice(0, 10), Array(10).fill(401), `primele 10: ${st}`);
  assert.equal(st[10], 429, `a 11-a: ${st[10]}`);
  // inainte de verificare: nici tokenul BUN nu mai trece in minutul asta, de pe IP-ul asta
  const bun = await cheama("pionex-account", "action=status", PIONEX_ENV, { ipFix });
  assert.equal(bun.status, 429, `tokenul bun a trecut in timpul blocarii: ${bun.status}`);
  assert.ok(Number(bun.headers.get("retry-after")) > 0, "429 fara retry-after");
  // alt IP nu e atins
  const altIp = await cheama("pionex-account", "action=status", PIONEX_ENV, { ipFix: "10.99.0.9" });
  assert.equal(altIp.status, 200, `alt IP: ${altIp.status}`);
});

await test("8 · limita merge si cu KV (API_RATE_LIMIT)", async () => {
  const kv = new Map();
  const env = { ...PIONEX_ENV, API_RATE_LIMIT: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const ipFix = "10.99.1.8", st = [];
  for (let i = 0; i < 11; i++) st.push((await cheama("pionex-account", "action=status", env, { token: `gresit-${i}-xxxxxxxx`, ipFix })).status);
  assert.equal(st[10], 429, `a 11-a cu KV: ${st}`);
  assert.ok([...kv.keys()].some((k) => k.includes("auth-fail:10.99.1.8")), `cheia KV: ${[...kv.keys()]}`);
});

// Runda 1: numaratoarea se citea inainte de verificare si crestea dupa `await`, deci
// cererile SIMULTANE treceau toate de limita (200 concurente -> 200 de 401, niciun 429).
await test("8 · 50 de tokenuri gresite SIMULTANE, acelasi IP -> cel mult 10 de 401, restul 429", async () => {
  const ipFix = "10.99.3.8", m = proaspat("pionex-account");
  const r = await Promise.all(Array.from({ length: 50 }, (_, i) =>
    cheama("pionex-account", "action=status", PIONEX_ENV, { token: `simultan-${i}-xxxxxxxx`, ipFix, modul: m })));
  const n401 = r.filter((x) => x.status === 401).length, n429 = r.filter((x) => x.status === 429).length;
  assert.ok(n401 <= 10, `au trecut la verificare ${n401} ghiciri simultane (maxim 10)`);
  assert.equal(n401 + n429, 50, `alte statusuri: ${r.map((x) => x.status)}`);
});

await test("8 · 20 de cereri SIMULTANE cu tokenul BUN, acelasi IP -> toate trec (limita nu loveste omul)", async () => {
  const ipFix = "10.99.4.8", m = proaspat("pionex-account");
  const r = await Promise.all(Array.from({ length: 20 }, () => cheama("pionex-account", "action=status", PIONEX_ENV, { ipFix, modul: m })));
  assert.deepEqual(r.map((x) => x.status), Array(20).fill(200), `tokenul bun, simultan: ${r.map((x) => x.status)}`);
});

// Runda 2: comparatia sincrona trebuie sa refuze tot ce nu e EXACT tokenul.
await test("8 · prefix / prefix+1 caracter / lungime diferita / sir gol -> 401", async () => {
  const cazuri = { prefix: TOKEN.slice(0, -1), "prefix scurt": TOKEN.slice(0, 4), "token+1 caracter": TOKEN + "x",
    "alt caracter la final": TOKEN.slice(0, -1) + "#", "lungime diferita": "x", "doar spatii": "   " };
  for (const [ce, t] of Object.entries(cazuri)) {
    const r = await cheama("pionex-account", "action=status", PIONEX_ENV, { token: t });
    assert.equal(r.status, 401, `${ce}: ${r.status}`);
  }
  const { onRequestGet } = await import(proaspat("pionex-account"));
  for (const h of [{ authorization: "Bearer " }, { authorization: "Bearer" }, { "x-app-token": "" }, { "x-app-token": TOKEN.slice(0, -1) }]) {
    const res = await onRequestGet({ request: new Request("https://exemplu.test/api/pionex-account?action=status", { headers: { ...h, "cf-connecting-ip": ipNou() } }), env: PIONEX_ENV });
    assert.equal(res.status, 401, `${JSON.stringify(h)}: ${res.status}`);
  }
  // si, pozitiv, x-app-token cu tokenul exact trece
  const res = await onRequestGet({ request: new Request("https://exemplu.test/api/pionex-account?action=status", { headers: { "x-app-token": TOKEN, "cf-connecting-ip": ipNou() } }), env: PIONEX_ENV });
  assert.equal(res.status, 200, `x-app-token exact: ${res.status}`);
});

await test("8 · APP_API_TOKEN gol / lipsa / undefined -> 503 (cu si fara token in cerere), nu fail-open", async () => {
  const envuri = { gol: { ...PIONEX_ENV, APP_API_TOKEN: "" }, lipsa: { PIONEX_API_KEY: "k", PIONEX_API_SECRET: "s" }, undefined: { ...PIONEX_ENV, APP_API_TOKEN: undefined } };
  for (const [ce, env] of Object.entries(envuri)) {
    for (const token of [TOKEN, "", null]) {
      const r = await cheama("pionex-account", "action=status", env, { token });
      assert.equal(r.status, 503, `APP_API_TOKEN ${ce}, token ${JSON.stringify(token)}: ${r.status}`);
    }
  }
});

await test("8 · cererile FARA token nu se numara ca ghicit (aplicatia fara token nu se incuie)", async () => {
  const ipFix = "10.99.2.8", st = [];
  for (let i = 0; i < 12; i++) st.push((await cheama("pionex-account", "action=status", PIONEX_ENV, { token: null, ipFix })).status);
  assert.ok(st.every((x) => x === 401), `fara token: ${st}`);
});

// ---- (9) market type=futures cere autentificare; health ramane public ----
await test("9 · market?type=futures fara token -> 401; cu token -> 200", async () => {
  fetchStub(() => ({ corp: "{}" }));
  const fara = await cheama("market", "type=futures&symbol=BTCUSDT", { APP_API_TOKEN: TOKEN }, { token: null });
  assert.equal(fara.status, 401, `fara token: ${fara.status}`);
  const cu = await cheama("market", "type=futures&symbol=BTCUSDT", { APP_API_TOKEN: TOKEN });
  assert.equal(cu.status, 200);
  const health = await cheama("market", "type=health", { APP_API_TOKEN: TOKEN }, { token: null });
  assert.equal(health.status, 200, "health trebuie sa ramana public");
});

// ---- (10) balances: forma ceruta ----
await test("10 · balances fara data.balances lista -> 502; cu lista -> 200", async () => {
  for (const data of [{}, { balances: null }, { balances: {} }]) {
    fetchStub(() => ({ corp: { result: true, data } }));
    const r = await cheama("pionex-account", "action=balances", PIONEX_ENV);
    assert.equal(r.status, 502, `data=${JSON.stringify(data)}: ${r.status}`);
  }
  fetchStub(() => ({ corp: { result: true, data: { balances: [] } } }));
  assert.equal((await cheama("pionex-account", "action=balances", PIONEX_ENV)).status, 200);
});

// ---- (11) limit nenumeric -> implicit, nu NaN ----
await test("11 · limit=abc pe klines/trades/depth -> valoarea implicita", async () => {
  const astept = { pionex_klines: "limit=300", pionex_trades: "limit=500", pionex_depth: "limit=100" };
  for (const [tip, lim] of Object.entries(astept)) {
    fetchStub(() => ({ corp: { result: true, data: {} } }));
    await cheama("market", `type=${tip}&symbol=BTC_USDT&limit=abc`, { APP_API_TOKEN: TOKEN });
    assert.ok(cereri[0], `${tip}: nicio cerere`);
    assert.ok(!/NaN/.test(cereri[0].url), `${tip}: ${cereri[0].url}`);
    assert.ok(cereri[0].url.includes(lim), `${tip}: ${cereri[0].url} (asteptam ${lim})`);
  }
});

// ---- (12) paginarea `next` doar pe gazda asteptata ----
await test("12 · Whale Alert / Coin Metrics: `next` pe alta gazda NU e urmat (cheia nu pleaca)", async () => {
  fetchStub((u) => {
    if (u.includes("coinmetrics")) return { corp: { data: [{ asset: "btc", time: "2026-09-01", PriceUSD: "1" }], next_page_url: "https://rau.test/cm?x=1" } };
    if (u.includes("height_at_time")) return { corp: { height: 100 } };
    if (u.includes("whale-alert")) return { corp: { transactions: [], next: "https://rau.test/wa" } };
    return { corp: {} };
  });
  const r = await cheama("external-intel", "action=onchain&symbol=BTC", { APP_API_TOKEN: TOKEN, WHALE_ALERT_API_KEY: "wa-secret" });
  const rele = cereri.filter((c) => c.url.includes("rau.test"));
  assert.equal(rele.length, 0, `a urmat paginarea pe alta gazda: ${rele.map((c) => c.url).join(" | ")}`);
  assert.equal(r.corp.whales?.complete, false, "paginarea respinsa trebuie sa lase complete:false");
});

await test("12 · `next` pe gazda asteptata (cale relativa sau absoluta) e urmat", async () => {
  let n = 0;
  fetchStub((u) => {
    if (u.includes("coinmetrics")) return { corp: { data: [] } };
    if (u.includes("height_at_time")) return { corp: { height: 100 } };
    if (u.includes("whale-alert")) return { corp: { transactions: [], next: n++ === 0 ? "https://leviathan.whale-alert.io/bitcoin/transactions?cursor=2" : null } };
    return { corp: {} };
  });
  await cheama("external-intel", "action=onchain&symbol=BTC", { APP_API_TOKEN: TOKEN, WHALE_ALERT_API_KEY: "wa-secret" });
  assert.ok(cereri.some((c) => c.url.includes("cursor=2")), "paginarea buna nu mai e urmata");
});

// ---- (13) motivFallback + stocks fara pret ----
await test("13 · intel news STOCKS: Twelve Data pica -> GDELT, cu motivFallback", async () => {
  fetchStub((u) => u.includes("twelvedata") ? { status: 500, corp: { message: "boom intern" } } : { corp: { articles: [] } });
  const r = await cheama("intel", "action=news&market=STOCKS&symbol=AAPL", { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" });
  assert.equal(r.corp.source, "GDELT");
  assert.match(String(r.corp.motivFallback || ""), /boom intern|500/, `motivFallback: ${JSON.stringify(r.corp)}`);
});

await test("13 · stocks quote fara close/price -> lastPrice null, nu \"0\"", async () => {
  fetchStub(() => ({ corp: { symbol: "AAPL", volume: "100" } }));
  const r = await cheama("stocks", "action=quote&symbol=AAPL", { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" });
  assert.equal(r.status, 200);
  assert.equal(r.corp.quote.lastPrice, null, `lastPrice: ${JSON.stringify(r.corp.quote.lastPrice)}`);
  assert.equal(r.corp.quote.quoteVolume, null, `quoteVolume: ${JSON.stringify(r.corp.quote.quoteVolume)}`);
});

await test("13 · stocks quote fara volume -> volume si quoteVolume null, nu 0 (runda 1, M4)", async () => {
  fetchStub(() => ({ corp: { symbol: "AAPL", close: "12.5", previous_close: "10" } }));
  const r = await cheama("stocks", "action=quote&symbol=AAPL", { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" });
  assert.equal(r.corp.quote.volume, null, `volume: ${JSON.stringify(r.corp.quote.volume)}`);
  assert.equal(r.corp.quote.quoteVolume, null, `quoteVolume: ${JSON.stringify(r.corp.quote.quoteVolume)}`);
  assert.equal(r.corp.quote.lastPrice, "12.5");
});

await test("13 · stocks series: lumanare fara volume -> volum null, nu 0 (runda 2)", async () => {
  fetchStub(() => ({ corp: { meta: {}, values: [{ datetime: "2026-09-01", open: "1", high: "2", low: "0.5", close: "1.5" },
    { datetime: "2026-09-02", open: "1.5", high: "2", low: "1", close: "1.8", volume: "300" }] } }));
  const r = await cheama("stocks", "action=series&symbol=AAPL&tf=1d", { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" });
  assert.equal(r.status, 200, JSON.stringify(r.corp));
  const [fara, cu] = r.corp.rows;
  assert.equal(fara[5], null, `volum lipsa: ${JSON.stringify(fara[5])}`);
  assert.equal(fara[7], null, `valoare tranzactionata cu volum lipsa: ${JSON.stringify(fara[7])}`);
  assert.equal(cu[5], "300"); assert.equal(cu[7], "540");
});

await test("13 · stocks quote cu close -> pretul real", async () => {
  fetchStub(() => ({ corp: { symbol: "AAPL", close: "12.5", previous_close: "10", volume: "2" } }));
  const r = await cheama("stocks", "action=quote&symbol=AAPL", { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "td" });
  assert.equal(r.corp.quote.lastPrice, "12.5"); assert.equal(r.corp.quote.quoteVolume, "25");
});

// ---- (14) provider-health: citire REALA a cheii Pionex ----
const randPionex = (r) => r.corp.providers.find((p) => /pionex/i.test(p.name) && !/acces/i.test(p.name));
await test("14 · cheia Pionex buna -> OK, dupa o citire reala bot/orders limit=1", async () => {
  fetchStub(() => ({ corp: { result: true, data: { results: [] } } }));
  const r = await cheama("provider-health", "deep=0", PIONEX_ENV);
  const px = randPionex(r);
  assert.equal(px.state, "OK", `stare: ${px.state} · ${px.detail}`);
  const c = cereri.find((x) => x.url.includes("/api/v1/bot/orders"));
  assert.ok(c, `nu s-a citit bot/orders: ${cereri.map((x) => x.url)}`);
  assert.match(c.url, /limit=1(&|$)/);
  assert.ok(!/read-only/i.test(px.name + " " + px.detail), `eticheta mai afirma read-only: ${px.name} · ${px.detail}`);
});

await test("14 · cheie invalida / fara Bot reading / 429 se spun pe nume", async () => {
  const cazuri = [
    [{ status: 401, corp: { result: false, code: "APIKEY_INVALID", message: "invalid" } }, "FAIL", /cheie invalid/i],
    [{ corp: { result: false, code: "SIGNATURE_MISMATCH" } }, "FAIL", /cheie invalid/i],
    [{ corp: { result: false, code: "PERMISSION_DENIED" } }, "FAIL", /Bot reading/],
    [{ status: 429, corp: "Too Many Requests", headers: { "retry-after": "20" } }, "DEGRADED", /429/],
  ];
  for (const [rasp, stare, tipar] of cazuri) {
    reseteazaRitmPionex();
    fetchStub(() => rasp);
    const px = randPionex(await cheama("provider-health", "deep=0", PIONEX_ENV));
    assert.equal(px.state, stare, `${JSON.stringify(rasp.corp)}: ${px.state} · ${px.detail}`);
    assert.match(px.detail, tipar, `${JSON.stringify(rasp.corp)}: ${px.detail}`);
  }
});

await test("14 · fara chei Pionex nu se suna nimic si randul e FAIL", async () => {
  fetchStub(() => ({ corp: {} }));
  const r = await cheama("provider-health", "deep=0", { APP_API_TOKEN: TOKEN });
  assert.equal(cereri.length, 0); assert.equal(randPionex(r).state, "FAIL");
});

// ---- (15) CoinGecko cere User-Agent descriptiv ----
await test("15 · cererile CoinGecko de pe server poarta user-agent CryptoRadar/74 (+read-only)", async () => {
  fetchStub(() => ({ corp: { data: {} } }));
  await cheama("intel", "action=crypto_global", { APP_API_TOKEN: TOKEN });
  const cg = cereri.filter((c) => c.url.includes("coingecko"));
  assert.ok(cg.length, "nicio cerere CoinGecko");
  for (const c of cg) assert.equal(c.headers.get("user-agent"), "CryptoRadar/74 (+read-only)", c.url);
  fetchStub(() => ({ corp: {} }));
  await cheama("provider-health", "deep=1", { APP_API_TOKEN: TOKEN });
  const ping = cereri.find((c) => c.url.includes("coingecko"));
  assert.ok(ping, "proba deep nu suna CoinGecko");
  assert.equal(ping.headers.get("user-agent"), "CryptoRadar/74 (+read-only)", "proba deep CoinGecko fara user-agent");
});

// ---- (16) /api/* inexistent -> 404 JSON, nu index.html cu 200 ----
await test("16 · functions/api/[[catchall]].js: orice /api/* inexistent -> 404 {error:NO_ROUTE}", async () => {
  const cale = new URL("../functions/api/[[catchall]].js", import.meta.url);
  assert.ok(fs.existsSync(cale), "lipseste functions/api/[[catchall]].js");
  const m = await import(cale.href);
  assert.equal(typeof m.onRequest, "function", "exportul trebuie sa fie onRequest (orice metoda)");
  for (const metoda of ["GET", "POST"]) {
    const res = await m.onRequest({ request: new Request("https://exemplu.test/api/nu-exista", { method: metoda }), env: {} });
    assert.equal(res.status, 404, `${metoda}: ${res.status}`);
    assert.match(res.headers.get("content-type") || "", /application\/json/);
    assert.deepEqual(await res.json(), { error: "NO_ROUTE" });
  }
});

// ---- (17) radar-monitor: token in timp constant; DB lipsa spusa limpede ----
const W = async () => (await import(`../workers/radar-monitor.js?t=${Math.random()}`)).default;
await test("17 · MONITOR_TOKEN: tokenul bun trece, cel gresit (aceeasi lungime) nu", async () => {
  const w = await W(), env = { MONITOR_TOKEN: "mt-1234567890" };
  const bun = await (await w.fetch(new Request("https://m.test/health", { headers: { authorization: "Bearer mt-1234567890" } }), env)).json();
  assert.equal(bun.service, "crypto-radar-monitor", `tokenul bun: ${JSON.stringify(bun)}`);
  const rau = await (await w.fetch(new Request("https://m.test/health", { headers: { authorization: "Bearer mt-1234567899" } }), env)).json();
  assert.equal(rau.service, undefined, "tokenul gresit vede detaliile");
  const run = await w.fetch(new Request("https://m.test/run", { method: "POST", headers: { authorization: "Bearer mt-1234567899" } }), env);
  assert.equal(run.status, 401);
});

await test("17 · MONITOR_TOKEN nu mai e comparat cu === / !== (scurgere de timp)", async () => {
  const src = fs.readFileSync(new URL("../workers/radar-monitor.js", import.meta.url), "utf8");
  const m = src.match(/token\s*[!=]==?\s*env\.MONITOR_TOKEN|env\.MONITOR_TOKEN\s*[!=]==?\s*token/);
  assert.ok(!m, `comparatie directa: ${m && m[0]}`);
});

await test("17 · /run fara DB -> 503 cu motiv limpede", async () => {
  const w = await W();
  const res = await w.fetch(new Request("https://m.test/run", { method: "POST", headers: { authorization: "Bearer mt-1234567890" } }), { MONITOR_TOKEN: "mt-1234567890" });
  const corp = await res.json();
  assert.equal(res.status, 503, `status ${res.status} · ${JSON.stringify(corp)}`);
  assert.equal(corp.error, "DB_NOT_BOUND", JSON.stringify(corp));
});

await test("17 · cron fara DB: log limpede, nu un throw inghitit de waitUntil", async () => {
  const w = await W(), promisiuni = [], loguri = [];
  const vechi = console.error; console.error = (...a) => loguri.push(a.join(" "));
  try {
    await w.scheduled({}, {}, { waitUntil: (p) => promisiuni.push(p) });
    const rez = await Promise.allSettled(promisiuni);
    assert.ok(rez.every((x) => x.status === "fulfilled"), `waitUntil a primit un throw: ${rez.map((x) => x.reason?.message)}`);
  } finally { console.error = vechi; }
  assert.ok(loguri.some((l) => /DB/.test(l)), `niciun log despre DB: ${loguri}`);
});

console.log(`\nV746_SERVER ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
