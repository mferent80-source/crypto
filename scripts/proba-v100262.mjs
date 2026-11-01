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
await test("v100.292: rândul de bot cu direcție are pastila „4h+1z” lângă nume; rândul fără direcție n-are pastilă (nu „neutru”); numele se escapează", () => {
  const c = ecran({ ideiBoti: () => [{ moneda: "ADA_USDT_PERP", dir: "long", tarie: "tare", latime: 0.05 }, { moneda: "DOT_USDT_PERP", latime: 0.04 }], reveniriBoti: () => [{ moneda: "SOL_USDT_PERP", dir: "neutru", tarie: "slab" }], shortBoti: () => [{ moneda: "TAKE_USDT_PERP", dir: "short", tarie: "mediu" }] });
  const d = { clasament: CL }, l = plain(c.sugRanduri(d, Date.now())), h = c.sugListaHtml(d, Date.now());
  assert.deepEqual(l.map((x) => x.s), ["ADA", "DOT"], "doar pornirea (revenirea și short-ul monedelor: scoase la cererea lui, 01.11)");
  assert.match(h, /<b>ADA<\/b> <span class="sugDir long">4h\+1z ↑ long · tare<\/span>/); assert.match(h, /<b>DOT<\/b><\/span><span class="sugRandPret">/, "fără dir în clasament: fără pastilă"); assert.match(l[1].sub, /interval 4,0%/);
  const e = ecran({ ideiBoti: () => [{ moneda: "X_USDT_PERP", dir: "<b>rau</b>", latime: 0.01 }] }).sugListaHtml(d, Date.now()); assert.doesNotMatch(e, /<b>rau<\/b>/);
});

await test("CSS: pastila are culoarea direcției (long verde, short roșu, neutru gri)", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /\.sugDir\{flex:none;[^}]*white-space:nowrap[^}]*\}\.sugDir\.long\{color:var\(--good\);border-color:var\(--good\)\}\.sugDir\.short\{color:var\(--bad\);border-color:var\(--bad\)\}/);
  assert.match(css, /\.sugDir\.neutru\{color:var\(--muted\)\}/, "v100.292: și „neutru” gri, pe rândul nou");
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
