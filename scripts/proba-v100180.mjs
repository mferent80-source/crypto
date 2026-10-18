// Probele v100.180 (13.10.2026, el: „poți face așa”) — Busola rămâne separată; Radarul are drumul scurt spre ea:
// „🧭 Busola ↗” în meniu (moneda botului din Tablou sau moneda din Radar, pe intervalul tău) + rândul din fișa botului.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.180 · drumul scurt spre Busola · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "busola.js"), ctx);
const B = ctx.Busola, URL0 = "https://busola.mferent80.workers.dev/";

await test("intervalul Radarului ⇒ intervalul Busolei (15m, 1h, 4h, 1d); necunoscut ⇒ 4h", () => {
  const p = { "5M": "15m", "15M": "15m", "60M": "1h", "4H": "4h", "1D": "1d", "1h": "1h", "4h": "4h", "15m": "15m", "1d": "1d", "1z": "1d", "5m": "15m", "": "4h", "abc": "4h" };
  for (const [k, v] of Object.entries(p)) assert.equal(B.intervalBusola(k), v, k);
  assert.equal(B.intervalBusola(undefined), "4h");
});
await test("adresa după context: botul din Tablou bate moneda din Radar; 1000X ⇒ X; acțiuni / fără monedă ⇒ capul Busolei", () => {
  assert.equal(B.adresaBusola({ bot: "1000BONK_USDT_PERP", tfBot: "60M", simbol: "ETH", tf: "4h" }), URL0 + "?sym=BONK&interval=1h");
  assert.equal(B.adresaBusola({ simbol: "SOLUSDT", tf: "15m" }), URL0 + "?sym=SOL&interval=15m");
  assert.equal(B.adresaBusola({ simbol: "AAPL", tf: "1d", actiuni: true }), URL0, "acțiunile nu sunt în Busola");
  assert.equal(B.adresaBusola({}), URL0);
  assert.equal(B.adresaBusola(null), URL0);
});
await test("meniul: „🧭 Busola ↗” imediat după Tabloul botului, cu deschideBusola(), fără data-nav (nu e o pagină a Radarului)", () => {
  const html = citeste("public", "index.html");
  const m = /<button class="sideBtn" data-action-click="navTo\('tabloubot',true\)" data-nav="tabloubot">[^\n]*?<\/button>\n?(<button[^>]*>.*?<\/button>)/.exec(html);
  assert.ok(m, "butonul de după Tabloul botului");
  assert.match(m[1], /data-action-click="deschideBusola\(\)"/); assert.match(m[1], /🧭/); assert.match(m[1], /Busola ↗/); assert.doesNotMatch(m[1], /data-nav=/);
});
await test("telefon: sertarul „⋯ More” are și el „🧭 Busola ↗”, imediat după „Tablou bot” (meniul lateral e ascuns pe telefon)", () => {   /* v100.214: foaia pe grupe, un buton pe rând ⇒ spațiu alb permis între ele */
  const html = citeste("public", "index.html");
  assert.match(html, /<button class="moreBtn" data-action-click="moreNav\('tabloubot',true\)"><b>◉<\/b>Tablou bot<\/button>\s*<button class="moreBtn" data-action-click="closeMoreDrawer\(\);deschideBusola\(\)"><b>🧭<\/b>Busola ↗<\/button>/);
});
await test("deschideBusola(): pe Tablou cu bot ⇒ moneda botului pe intervalul graficului; altfel moneda și intervalul din Radar; fereastră nouă, noopener", () => {
  const src = citeste("public", "app.js"), i = src.indexOf("function deschideBusola(");
  assert.ok(i > 0, "deschideBusola există"); const f = src.slice(i, src.indexOf("\n", i));
  const deschise = [], el = { symbol: { value: "ETH" }, tf: { value: "1h" } };
  const c = { Busola: B, deschise, tbStare: { bot: { simbolPionex: "TAKE_USDT_PERP" } }, paginaActiva: "tabloubot", tbTf: () => "4H", tbCheieBusola: (b) => b.simbolPionex,
    assetClass: () => "CRYPTO", $: (id) => el[id] || null, window: { open: (u, t, o) => { deschise.push([u, t, o]); return {}; } }, document: { querySelector: () => ({ dataset: { nav: c.paginaActiva } }) } };
  vm.createContext(c); vm.runInContext(f, c);
  c.deschideBusola(); assert.deepEqual(deschise.pop(), [URL0 + "?sym=TAKE&interval=4h", "_blank", "noopener"]);
  c.paginaActiva = "dash"; c.deschideBusola(); assert.deepEqual(deschise.pop(), [URL0 + "?sym=ETH&interval=1h", "_blank", "noopener"], "pe altă pagină: moneda din Radar");
  c.paginaActiva = "tabloubot"; c.tbStare.bot = null; c.deschideBusola(); assert.equal(deschise.pop()[0], URL0 + "?sym=ETH&interval=1h", "Tablou fără bot");
  c.assetClass = () => "STOCKS"; c.paginaActiva = "dash"; c.deschideBusola(); assert.equal(deschise.pop()[0], URL0, "pe acțiuni: capul Busolei");
});
await test("fișa botului: rândul „🧭 deschide în Busola ↗” pe moneda botului și intervalul graficului, link extern sigur", () => {
  const src = citeste("public", "app.js"), i = src.indexOf("function tbBusolaLinie("), corp = src.slice(i, src.indexOf("\nfunction ", i + 10));
  assert.match(corp, /Busola\.adresaBusola\(\{bot:tbCheieBusola\(b\),tfBot:tbTf\(\)\}\)/);
  assert.match(corp, /target="_blank" rel="noopener"/); assert.match(corp, /🧭 deschide în Busola ↗/);
});
await test("Busola rămâne neatinsă: Radarul doar deschide adresa ei (fără iframe, fără frame-src)", () => {
  const html = citeste("public", "index.html"), h = citeste("public", "_headers");
  assert.doesNotMatch(html, /<iframe[^>]*busola/i); assert.doesNotMatch(h, /frame-src/); assert.match(h, /frame-ancestors 'none'/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
