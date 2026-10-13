// Probele v100.181 (13.10.2026, el: „fă idei” după v100.180) — ideile 1 și 2: 🧭 spre Busola pe fiecare monedă din
// cartelele de boți ale paginii Sugestii (pe 4h, intervalul clasamentului) și „Busola” în paleta de comenzi.
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
console.log("\nv100.181 · Busola din Sugestii și din paleta de comenzi · proba\n");
const URL0 = "https://busola.mferent80.workers.dev/";
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "busola.js"), ctx); vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);

await test("sugCartela: un rând cu adresa Busolei are 🧭 (link extern sigur, cu numele monedei pentru cititorul de ecran); fără adresă, nimic", () => {
  const h = ctx.sugCartela("T", null, [{ s: "PEPE", d: "x", b: URL0 + "?sym=PEPE&interval=4h" }, { s: "AAPL", d: "y" }], "gol");
  assert.match(h, /<li><b>PEPE<\/b> <span class="tbSub">x<\/span><a class="sugBusola" href="https:\/\/busola\.mferent80\.workers\.dev\/\?sym=PEPE&amp;interval=4h" target="_blank" rel="noopener" aria-label="deschide PEPE în Busola" title="deschide în Busola">🧭<\/a><\/li>/);
  assert.match(h, /<li><b>AAPL<\/b> <span class="tbSub">y<\/span><\/li>/);
});
await test("sugBoti: toate trei cartelele de boți (pornire, revenire, short) au 🧭 pe 4h; 1000PEPE ⇒ PEPE", () => {
  ctx.Idei = { ideiBoti: () => [{ moneda: "1000PEPE_USDT_PERP", latime: 0.05 }], reveniriBoti: () => [{ moneda: "SOL_USDT_PERP" }], shortBoti: () => [{ moneda: "TAKE_USDT_PERP" }] };
  const h = ctx.sugBoti({ x: 1 }, null);
  for (const s of ["PEPE", "SOL", "TAKE"]) assert.ok(h.includes(`href="${URL0}?sym=${s}&amp;interval=4h"`), s);
  assert.equal((h.match(/class="sugBusola"/g) || []).length, 3);
  delete ctx.Idei;
});
await test("sugBoti fără Busola încărcată: listele apar la fel, fără 🧭 (nu cade)", () => {
  const c2 = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
  c2.globalThis = c2; vm.createContext(c2); vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), c2);
  c2.Idei = { ideiBoti: () => [{ moneda: "BTC_USDT_PERP" }] };
  const h = c2.sugBoti({ x: 1 }, null); assert.match(h, /<b>BTC<\/b>/); assert.doesNotMatch(h, /sugBusola/);
});
await test("paleta de comenzi: „🧭 Busola ↗” cheamă deschideBusola() (nu navTo), iar celelalte comenzi rămân pe navTo", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("const COMMANDS=["), lista = app.slice(i, app.indexOf("];", i));
  assert.match(lista, /\["🧭 Busola ↗ \(moneda ta\)","busola","deschideBusola\(\)"\]/);
  const r = app.slice(app.indexOf("function renderCommandPalette("), app.indexOf("\n", app.indexOf("function renderCommandPalette(")));
  const doc = { items: "" }, c = { $: (id) => (id === "commandInput" ? { value: "busola" } : { set innerHTML(v) { doc.items = v; } }), COMMANDS: null };
  vm.createContext(c); vm.runInContext(lista.replace("const COMMANDS=", "COMMANDS=") + "];" + r, c);
  c.renderCommandPalette(); assert.match(doc.items, /data-action-click="toggleCommandPalette\(false\);deschideBusola\(\)">🧭 Busola ↗ \(moneda ta\)</);
  c.$ = (id) => (id === "commandInput" ? { value: "tablou" } : { set innerHTML(v) { doc.items = v; } });
  c.renderCommandPalette(); assert.match(doc.items, /toggleCommandPalette\(false\);navTo\(&#x27;tabloubot&#x27;,false\)/);
});
await test("stilul: 🧭 din Sugestii are țintă de deget (min 32 px) și nu lățește rândul", () => {
  const css = citeste("public", "app.css"); assert.match(css, /\.sugBusola\{[^}]*min-width:32px[^}]*min-height:32px/); assert.match(css, /\.sugBusola\{[^}]*margin-left:auto/);
  // poza 390 px: descrierea lungă împingea 🧭 singur pe rândul următor ⇒ pe rândurile cu 🧭 nu se mai rupe rândul, descrierea se înfășoară la mijloc
  // v100.182: regula s-a generalizat pe toate rândurile (și acțiunile se lungeau) - proba-v100182.mjs o păzește
  assert.match(css, /\.sugLista li\{display:flex;flex-wrap:nowrap;[^}]*\}\.sugLista li>b\{flex:none\}\.sugLista li>\.tbSub\{flex:1;min-width:0\}/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
