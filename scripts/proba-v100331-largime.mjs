// Proba v100.331 · lărgimea crypto pe server (12.11.2026, el: „3 … fă tot”): Piața azi făcea la fiecare deschidere 32 de cereri la Binance
//   (24 de monede × 1d × 260 de bare) și stătea pe „Calculez lărgimea pe 24 de monede…”. Acum colectorul o socotește o dată la 30 de minute, cu
//   ACELEAȘI formule și ACELAȘI univers ca pagina (paritatea de mai jos), o pune în KV, iar pagina o citește (sub 90 de minute); altfel ca înainte.
//   node scripts/proba-v100331-largime.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = APP.indexOf("\nfunction ", i + 10), k = APP.indexOf("\nasync function ", i + 10); const e = [j, k].filter((x) => x > 0); return APP.slice(i + 1, e.length ? Math.min(...e) : undefined); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.331 · lărgimea crypto pe server, aceleași cifre ca pagina · proba\n");

// pagina: funcțiile ei (v64BreadthRow / v64AggregateBreadth cu ema / RSI / volBara)
const pag = (() => { const ctx = { Math, Number, Array, Set, Map, Date, JSON, isFinite, assetClass: () => "CRYPTO", analysisSource: () => "BINANCE" }; vm.createContext(ctx);
  vm.runInContext(["ema", "RSI", "volBara", "v64BreadthRow", "v64AggregateBreadth"].map(fnApp).join("\n") + "\nthis.rand=v64BreadthRow;this.agrega=v64AggregateBreadth;", ctx); return ctx; })();
const LC = (() => { const ctx = { Math, Number, Array, Set, Map, Date, JSON, isFinite }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "largime-crypto.js") + "\nthis.L = LargimeCrypto;", ctx); return ctx.L; })();

// serii zilnice în forma Binance: [openTime, open, high, low, close, volume, ...] ca șiruri; generator mulberry32 (regula lui: fără LCG)
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const serie = (seed, n, faraVol) => { const r = mulberry32(seed); let p = 10 + r() * 90; const o = []; for (let i = 0; i < n; i++) { const c = p * (1 + (r() - 0.49) * 0.06); o.push([String(1.7e12 + i * 864e5), String(p), String(Math.max(p, c) * 1.01), String(Math.min(p, c) * 0.99), String(c), faraVol ? "" : String(1000 + r() * 9000)]); p = c; } return o; };

await test("paritate: rândul unei monede (LargimeCrypto.rand) = v64BreadthRow din pagină, pe 40 de serii (cu / fără volum, scurte, sub 200 de bare)", () => {
  for (let s = 1; s <= 40; s++) {
    const n = s % 7 === 0 ? 50 : s % 5 === 0 ? 120 : 260, k = serie(s, n, s % 9 === 0);
    assert.deepEqual(JSON.parse(JSON.stringify(LC.rand("M" + s, k))), JSON.parse(JSON.stringify(pag.rand("M" + s, k))), "seria " + s);
  }
});
await test("paritate: agregarea (LargimeCrypto.agrega) = v64AggregateBreadth (fără ts și rows), cu BTC ca reper", () => {
  const rows = Array.from({ length: 24 }, (_, i) => pag.rand(i === 0 ? "BTC" : "M" + i, serie(100 + i, 260, i === 5)));
  const meta = { market: "CRYPTO", source: "BINANCE", total: 24, depth: "FAST", universe: "PIONEX TOP24 / BINANCE DAILY", benchmarkReturn: 3.4 };
  const a = JSON.parse(JSON.stringify(LC.agrega(rows, meta))), b = JSON.parse(JSON.stringify(pag.agrega(rows, meta)));
  delete a.ts; delete b.ts; delete b.rows;
  assert.equal(a.rows, undefined, "fără rândurile monedelor (mari, nefolosite de pagină)");
  assert.deepEqual(a, b);
  assert.equal(JSON.parse(JSON.stringify(LC.agrega([], meta))).state, "UNAVAILABLE");
});
await test("universul = pionexTop100 din pagină: SPOT/USDT, fără stabile / levier / dezactivate, după volum, doar crypto, primele 24", () => {
  const sym = (b, o) => Object.assign({ symbol: b + "_USDT", baseCurrency: b, quoteCurrency: "USDT", type: "SPOT", enable: true }, o || {});
  const symbols = [sym("BTC"), sym("ETH"), sym("USDC"), sym("BTC3L"), sym("SOL", { enable: false }), sym("XRP", { quoteCurrency: "USDC", symbol: "XRP_USDC" }), sym("AAPLX"), sym("DOGE"), sym("PEPE")];
  const tickers = [["BTC_USDT", 900, 1], ["ETH_USDT", 800, 1], ["USDC_USDT", 1000, 1], ["BTC3L_USDT", 950, 1], ["SOL_USDT", 990, 1], ["XRP_USDC", 980, 1], ["AAPLX_USDT", 700, 1], ["DOGE_USDT", 600, 1], ["PEPE_USDT", 0, 1]].map(([s, a, c]) => ({ symbol: s, amount: String(a), close: String(c), open: String(c) }));
  const eCrypto = (b) => b !== "AAPLX";
  assert.deepEqual(LC.univers(symbols, tickers, eCrypto, 24), ["BTC", "ETH", "DOGE"]);
  assert.deepEqual(LC.univers(symbols, tickers, eCrypto, 2), ["BTC", "ETH"]);
  assert.match(APP, /const PIONEX_STABLE_BASES=new Set\(\["USDT","USDC","FDUSD","TUSD","USDP","DAI","USDE","PYUSD"\]\);/, "stabilele paginii (aceeași listă)");
  assert.match(APP, /return \/\(3L\|3S\|5L\|5S\|BULL\|BEAR\)\$\/i\.test\(base\|\|""\)/, "levierul paginii (același tipar)");
});

// ───────────── tura colectorului ─────────────
const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-largime-crypto.mjs")).href);
function deps(o) {
  const trimise = [], jurnal = [], cerute = [];
  const syms = Array.from({ length: 30 }, (_, i) => ({ symbol: (i === 0 ? "BTC" : "C" + i) + "_USDT", baseCurrency: i === 0 ? "BTC" : "C" + i, quoteCurrency: "USDT", type: "SPOT", enable: true }));
  const tks = syms.map((s, i) => ({ symbol: s.symbol, amount: String(1000 - i), close: "1", open: "1" }));
  return Object.assign({ acum: Date.parse("2026-11-12T12:00:00Z"), LargimeCrypto: LC, eCrypto: () => true, trimise, jurnalLista: jurnal, cerute,
    cere: async (c) => (/pionex_symbols/.test(c) ? { data: { symbols: syms } } : /pionex_tickers/.test(c) ? { data: { tickers: tks } } : null),
    binance: async (u) => { cerute.push(u); const m = u.match(/symbol=([A-Z0-9]+)USDT/); return serie(m[1].length * 7 + m[1].charCodeAt(m[1].length - 1), 260); },
    trimite: async (c, corp) => { trimise.push([c, corp]); return { ok: true }; }, jurnal: (...a) => jurnal.push(a.join(" ")) }, o || {});
}
await test("tura: 24 de monede (Binance spot 1d × 260), agregarea fără rânduri trimisă la ruta largimeCrypto; a doua oară sub 30 min nu mai lucrează", async () => {
  const d = deps(), st = {};
  const r = await T.turaLargimeCrypto(d, st);
  assert.equal(r.facut, true); assert.equal(d.cerute.length, 24);
  assert.ok(d.cerute.every((u) => /^https:\/\/api\.binance\.com\/api\/v3\/klines\?symbol=[A-Z0-9]+USDT&interval=1d&limit=260$/.test(u)), d.cerute[0]);
  assert.equal(d.trimise.length, 1); assert.equal(d.trimise[0][0], "/api/istoric-bot?action=largimeCrypto");
  const L = d.trimise[0][1].largime; assert.equal(L.n, 24); assert.equal(L.total, 24); assert.equal(L.rows, undefined); assert.ok(["BULLISH", "BEARISH", "NEUTRAL"].includes(L.state));
  assert.equal(d.trimise[0][1].la, d.acum);
  const d2 = deps({ acum: d.acum + 10 * 60000 }); assert.equal(await T.turaLargimeCrypto(d2, st), null); assert.equal(d2.cerute.length, 0);
});
await test("tura: sub 10 monede (Pionex picat) ⇒ nu trimite nimic, scrie în jurnal; Binance null pe o monedă ⇒ o sare", async () => {
  const d = deps({ cere: async () => null }), st = {};
  const r = await T.turaLargimeCrypto(d, st); assert.equal(r.facut, false); assert.equal(d.trimise.length, 0); assert.ok(d.jurnalLista.some((x) => /lărgimea crypto/.test(x)));
  const d2 = deps({ binance: async (u) => (/C3USDT/.test(u) ? null : serie(5, 260)) }); const r2 = await T.turaLargimeCrypto(d2, {});
  assert.equal(r2.facut, true); assert.equal(d2.trimise[0][1].largime.n, 23);
});
await test("colectorul încarcă modulul și cheamă tura (după curba stopului)", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /const LargimeCrypto = incarca\("largime-crypto\.js", "LargimeCrypto"\);/);
  assert.match(C, /await turaLargimeCryptoColector\(\);/);
  assert.match(C, /turaLargimeCrypto\(\{ acum: Date\.now\(\), cere, binance: binanceDirect, LargimeCrypto, eCrypto: \(b\) => GridCalcul\.eCrypto\(b\), trimite, jurnal \}, largimeStare\)/);
});

// ───────────── ruta și pagina ─────────────
await test("ruta: POST action=largimeCrypto curăță (numere, stări cunoscute) și ține în KV; GET o dă cu ora ei", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=largimeCrypto", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=largimeCrypto", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV })).json();
  assert.equal((await get()).largime, null);
  const r = await post({ la: 1794480000000, largime: { state: "NEUTRAL", score: 48.2, participation: 41.6, above20: 37.5, above50: 29.1, above200: 20.8, momentum: 33.3, volume: 44, highs: 1, lows: 3, divergence: "NONE", n: 24, total: 24, altParticipation: 39, benchmarkReturn: -0.5, rau: "<script>", rows: [1, 2] } });
  assert.equal(r.status, 200);
  const g = await get();
  assert.equal(g.la, 1794480000000); assert.equal(g.largime.state, "NEUTRAL"); assert.equal(g.largime.score, 48.2); assert.equal(g.largime.rau, undefined); assert.equal(g.largime.rows, undefined);
  const r2 = await post({ la: 1, largime: { state: "<b>", score: 1 } }); assert.equal(r2.status, 400, "stare necunoscută ⇒ refuzată");
});
await test("pagina: întâi lărgimea colectorului (sub 90 de minute), altfel calculul din telefon ca înainte", () => {
  const A = citeste("public", "lib", "acasa-ecran.js");
  assert.match(A, /pas\("largime", async function \(\) \{[\s\S]{0,400}getJSON\("\/api\/istoric-bot\?action=largimeCrypto"\)[\s\S]{0,200}Date\.now\(\) - r\.la < 90 \* 60000\) return acLargimeDinServer\(r\.largime\);[\s\S]{0,300}refreshMarketBreadthV64\(false, false\)/);
});

// ───────────── revizia Opus (12.11) ─────────────
await test("revizia 🔴2: valoarea serverului umple și pliul „Lărgimea pieței, pe larg” (renderMarketBreadthV64), cu null ⇒ NaN („—”, nu „0%”)", () => {
  const A = citeste("public", "lib", "acasa-ecran.js"), i = A.indexOf("function acLargimeDinServer("); assert.ok(i >= 0, "lipsește acLargimeDinServer");
  const fnS = A.slice(i, A.indexOf("\nfunction ", i + 10));
  const ctx = { Number, isFinite, Object, window: {}, randat: null, renderMarketBreadthV64: (x) => { ctx.randat = x; }, marketBreadthV64State: null };
  vm.createContext(ctx); vm.runInContext(fnS + "\nthis.f=acLargimeDinServer;", ctx);
  const x = ctx.f({ state: "NEUTRAL", score: 48, above200: null, momentum: null, n: 24, total: 24 });
  assert.ok(Number.isNaN(x.above200) && Number.isNaN(x.momentum)); assert.equal(x.score, 48);
  assert.equal(ctx.randat, x, "pliul desenat"); assert.equal(ctx.window.__marketBreadthV64, x);
  assert.match(A, /if \(r && r\.largime && r\.la > 0 && Date\.now\(\) - r\.la < 90 \* 60000\) return acLargimeDinServer\(r\.largime\);/);
});
await test("revizia 🔵7: tura cere voie de la Binance (reia, ca celelalte ture) și ține minte azi monedele lipsă de pe Binance spot", async () => {
  let reia = 0; const b = async (u) => (/C2USDT/.test(u) ? null : serie(9, 260)); b.reia = () => { reia++; return true; };
  const d = deps({ binance: b }), st = {};
  await T.turaLargimeCrypto(d, st);
  assert.equal(reia, 1); assert.ok(st.lipsa && st.lipsa.C2, "C2 ținută minte ca lipsă");
  const d2 = deps({ acum: d.acum + 31 * 60000, binance: b }); await T.turaLargimeCrypto(d2, st);
  assert.ok(!d2.cerute.some((u) => /C2USDT/.test(u)), "a doua tură (aceeași zi) n-o mai cere");
  const nu = async () => null; nu.reia = () => false; const d3 = deps({ binance: nu }); const r3 = await T.turaLargimeCrypto(d3, {});
  assert.equal(r3.facut, false); assert.equal(d3.cerute.length, 0);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
