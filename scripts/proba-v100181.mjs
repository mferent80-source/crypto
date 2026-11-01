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

await test("v100.292: fișa unei monede are 🧭 spre Busola pe 4h (link extern sigur); 1000PEPE ⇒ PEPE; fără Busola încărcată nu cade", () => {
  ctx.Idei = { ideiBoti: () => [{ moneda: "1000PEPE_USDT_PERP", latime: 0.05 }, { moneda: "SOL_USDT_PERP" }, { moneda: "TAKE_USDT_PERP" }] };
  const d = { clasament: { monede: [] } }, l = ctx.sugRanduri(d, Date.now()); assert.equal(l.length, 3);
  for (const [r, s] of [["1000PEPE", "PEPE"], ["SOL", "SOL"], ["TAKE", "TAKE"]]) { const f = ctx.sugFisa(l.filter((x) => x.s === r)[0], d, Date.now()); assert.ok(f.actiuni.some((a) => a.href === `${URL0}?sym=${s}&interval=4h` && /🧭/.test(a.et)), s); }
  assert.match(ctx.sugListaHtml(d, Date.now()), new RegExp('<a class="t212BtnLinie" href="' + URL0.replace(/[.?]/g, "\\$&") + '\\?sym=PEPE&amp;interval=4h" target="_blank" rel="noopener">🧭 Busola, 4h</a>'));
  delete ctx.Idei;
  const c2 = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
  c2.globalThis = c2; vm.createContext(c2); vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), c2);
  c2.Idei = { ideiBoti: () => [{ moneda: "BTC_USDT_PERP" }] };
  assert.match(c2.sugListaHtml(d, Date.now()), /<b>BTC<\/b>/); assert.ok(!c2.sugFisa(c2.sugRanduri(d, Date.now())[0], d, Date.now()).actiuni.some((a) => a.href), "fără Busola: doar Fișa gridului");
});
await test("paleta de comenzi: „🧭 Busola ↗” cheamă deschideBusola() (nu navTo), iar celelalte comenzi rămân pe navTo", () => {
  const app = citeste("public", "app.js"), i = app.indexOf("const COMMANDS=["), lista = app.slice(i, app.indexOf("];", i));
  assert.match(lista, /\["🧭 Busola ↗ \(moneda ta\)","busola","deschideBusola\(\)"\]/);
  const r = app.slice(app.indexOf("function renderCommandPalette("), app.indexOf("\n", app.indexOf("function renderCommandPalette(")));
  /* v100.272: renderCommandPalette pune și aria-activedescendant pe câmp (paleta din tastatură) ⇒ câmpul-stub are setAttribute / removeAttribute */
  const camp = (value) => ({ value, setAttribute() {}, removeAttribute() {} });
  const doc = { items: "" }, c = { $: (id) => (id === "commandInput" ? camp("busola") : { set innerHTML(v) { doc.items = v; } }), COMMANDS: null };
  vm.createContext(c); vm.runInContext(lista.replace("const COMMANDS=", "COMMANDS=") + "];" + r, c);
  c.renderCommandPalette(); assert.match(doc.items, /data-action-click="toggleCommandPalette\(false\);deschideBusola\(\)">🧭 Busola ↗ \(moneda ta\)</);
  c.$ = (id) => (id === "commandInput" ? camp("tablou") : { set innerHTML(v) { doc.items = v; } });
  c.renderCommandPalette(); assert.match(doc.items, /toggleCommandPalette\(false\);navTo\(&#x27;tabloubot&#x27;,false\)/);
});
await test("stilul: 🧭 din pândă are țintă de deget (min 32 px); în fișă, Busola e un buton-link pe rândul acțiunilor", () => {
  const css = citeste("public", "app.css"); assert.match(css, /\.sugBusola\{[^}]*min-width:32px[^}]*min-height:32px/); assert.match(css, /\.sugBusola\{[^}]*margin-left:auto/);
  assert.match(css, /\.sugActiuni a\.t212BtnLinie\{text-decoration:none;display:inline-flex;align-items:center\}/);   /* v100.292: rândurile cu 🧭 au devenit fișa */
});
console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
