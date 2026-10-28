// Proba v100.262 (28.10, el: „în Sugestii să apară și direcția la boți”).
// Pe cele trei cartele de boți din Sugestii (pornire, revenire, short), lângă numele monedei stă direcția ei din clasament
// (GridCalcul.directie pe 4h + 1z, aceeași ca în Fișă) cu tăria: „↑ long · tare”, „↓ short · mediu”, „→ neutru · slab”.
// Rândurile fără direcție (acțiunile, un clasament vechi) rămân exact ca înainte. Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.262 · DIR · proba\n");

// modulul ecranului, fără DOM, cu Idei fals (ca în proba v100.181)
function ecran(Idei) {
  const ctx = { console, Idei, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])) };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx, { filename: "sugestii-ecran.js" });
  return ctx;
}
const CL = { monede: [] };
const plain = (o) => (o === null ? null : JSON.parse(JSON.stringify(o)));   // obiectele vin din alt context vm (alt Object.prototype)

await test("sugDir: long / short / neutru cu tăria; direcție necunoscută sau lipsă ⇒ null (nimic inventat)", () => {
  const c = ecran({});
  assert.deepEqual(plain(c.sugDir({ dir: "long", tarie: "tare" })), { c: "long", t: "↑ long · tare" });
  assert.deepEqual(plain(c.sugDir({ dir: "short", tarie: "mediu" })), { c: "short", t: "↓ short · mediu" });
  assert.deepEqual(plain(c.sugDir({ dir: "neutru", tarie: "slab" })), { c: "neutru", t: "→ neutru · slab" });
  assert.deepEqual(plain(c.sugDir({ dir: "neutru", tarie: "fara-date" })), { c: "neutru", t: "→ neutru" }, "tăria „fara-date” nu se scrie");
  assert.equal(c.sugDir({ dir: "sus" }), null); assert.equal(c.sugDir({}), null); assert.equal(c.sugDir(null), null);
});
await test("sugCartela: rândul cu direcție are pastila lângă nume (clasa direcției, textul escapat); rândul fără direcție e neschimbat (v100.181)", () => {
  const c = ecran({});
  const h = c.sugCartela("T", null, [{ s: "ADA", d: "x", dir: { c: "long", t: "↑ long · tare" } }, { s: "AAPL", d: "y" }], "gol");
  assert.match(h, /<li><b>ADA<\/b> <span class="sugDir long" title="[^"]+">↑ long · tare<\/span> <span class="tbSub">x<\/span><\/li>/);
  assert.match(h, /<li><b>AAPL<\/b> <span class="tbSub">y<\/span><\/li>/, "fără direcție: exact ca înainte");
  const rau = c.sugCartela("T", null, [{ s: "X", d: "x", dir: { c: "short", t: "<b>rau</b>" } }], "gol");
  assert.doesNotMatch(rau, /<b>rau<\/b>/); assert.match(rau, /&lt;b&gt;rau&lt;\/b&gt;/);
});
await test("sugBoti: toate trei cartelele (pornire, revenire, short) poartă direcția și tăria din clasament; un clasament vechi fără dir nu strică nimic", () => {
  const c = ecran({
    ideiBoti: () => [{ moneda: "ADA_USDT_PERP", dir: "long", tarie: "tare", latime: 0.05 }, { moneda: "DOT_USDT_PERP", latime: 0.04 }],
    reveniriBoti: () => [{ moneda: "SOL_USDT_PERP", dir: "neutru", tarie: "slab" }],
    shortBoti: () => [{ moneda: "TAKE_USDT_PERP", dir: "short", tarie: "mediu" }],
  });
  const h = c.sugBoti(CL, null);
  assert.match(h, /<b>ADA<\/b> <span class="sugDir long"[^>]*>↑ long · tare<\/span> <span class="tbSub">interval 5,0%<\/span>/);
  assert.match(h, /<b>DOT<\/b> <span class="tbSub">interval 4,0%<\/span>/, "fără dir în clasament: rândul vechi");
  assert.match(h, /<b>SOL<\/b> <span class="sugDir neutru"[^>]*>→ neutru · slab<\/span> <span class="tbSub">pe revenire<\/span>/);
  assert.match(h, /<b>TAKE<\/b> <span class="sugDir short"[^>]*>↓ short · mediu<\/span> <span class="tbSub">liniștită, direcția short<\/span>/);
});
await test("direcția vine chiar din GridClasament.judeca (dir, tarie) prin Idei.ideiBoti - câmpurile există în clasament", () => {
  const gc = citeste("public", "lib", "grid-clasament.js");
  assert.match(gc, /out\.dir = d\.dir; out\.tarie = d\.tarie;/);
  assert.match(citeste("public", "lib", "grid-calcul.js"), /dir: s >= 2 \? "long" : s <= -2 \? "short" : "neutru", tarie: a >= 4 \? "tare" : a >= 2 \? "mediu" : "slab"/);
  assert.match(citeste("public", "lib", "idei.js"), /function ideiBoti[\s\S]*?Object\.assign\(\{ moneda: mo, istoric: stat\([\s\S]*?\) \}, x\)/, "ideiBoti păstrează câmpurile monedei (dir, tarie)");
});
await test("CSS: pastila are culoarea direcției (long verde, short roșu, neutru gri), fără să atingă regula listei păzită de v100.181", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /\.sugDir\{flex:none;[^}]*white-space:nowrap[^}]*\}\.sugDir\.long\{color:var\(--good\);border-color:var\(--good\)\}\.sugDir\.short\{color:var\(--bad\);border-color:var\(--bad\)\}/);
  assert.match(css, /\.sugLista li\{display:flex;flex-wrap:nowrap;[^}]*\}\.sugLista li>b\{flex:none\}\.sugLista li>\.tbSub\{flex:1;min-width:0\}/);
});
await test("versiunea ≥ v100.262 peste tot (package, BUILD_INFO, index, sw, Functions; ≥ ca să țină și la versiunea următoare), nota DIR în BUILD_INFO", () => {
  const P = JSON.parse(citeste("package.json")), ver = Number(P.version.split(".")[1]), V = "v100." + ver;
  assert.ok(ver >= 262, "versiunea " + V); assert.equal(P.version, "100." + ver + ".0");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(bi.version, V); assert.ok(bi.badge.startsWith(V + " · "), "badge-ul " + bi.badge);
  assert.ok(typeof bi.features.dir262 === "string" && /direcția/.test(bi.features.dir262), "nota dir262");
  const html = citeste("public", "index.html");
  assert.match(html, new RegExp('content="' + V.replace(".", "\\.") + '" name="app-version"')); assert.equal(html.split(V).length - 1, 4, "index.html are 4 locuri cu versiunea");
  assert.ok(citeste("public", "sw.js").startsWith('const CACHE="crypto-radar-v100-' + ver + '";')); assert.ok(citeste("functions", "_shared", "versiune.js").includes('VERSIUNE = "' + V + '"'));
});

console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
