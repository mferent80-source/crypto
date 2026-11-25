// Proba v100.391 (el, 25.11.2026: OK pe demo): fila „Riscul” goală pe botul de SEMNAL — scăparea din v100.387 (I-939).
// Cauza: app.css (regula v100.380 „.tbSemnal”) ascundea butoanele cuprinsului după `tbSariLa('decizia'|'risc')`, iar tbFilaAplica le rescrie în
// `tbFilaAlege('…')` ⇒ pe botul de semnal reapăreau Decizia / Riscul și duceau la o pagină goală; la fel fila „risc” ținută minte de pe un bot de grid.
//   A  app.css ascunde pe .tbSemnal și butoanele-file tbFilaAlege('decizia') / tbFilaAlege('risc') (și pe cele vechi tbSariLa)
//   B  pe botul de semnal, fila ținută minte „risc” sau „decizia” se arată ca „Toate”: nimic ascuns, „Toate” apăsat; alegerea rămâne ținută minte
//   C  pe botul de grid fila „risc” lucrează ca înainte (Banii / Piața / Jurnalul / Decizia ascunse, „Riscul” apăsat)
//   D  pe botul de semnal o legătură spre Riscul (tbSariLa) nu mai schimbă fila; spre Banii da
//   E  app.js potrivește fila PE LOC când botul trece pe semnal / grid (tbFilaAplica imediat după comutarea clasei tbSemnal)
//   V  versiunea v100.391, proba în lanț după v100.390
// Rulare: node scripts/proba-v100391.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { cuTablou } from "./lib/sursa-app.mjs";   /* v100.392: app.js lipit de modulele Tabloului (paza G din proba v100392) */

const RAD = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
console.log("\nv100.391 · fila „Riscul” pe botul de semnal · proba\n");

const APP = cuTablou(citeste("public", "app.js")), CSS = citeste("public", "app.css"), MOD = citeste("public", "lib", "tablou-citire.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");

/* o pagină falsă, cât îi trebuie lui tbFilaAplica / tbSariLa: elementele fiecărui selector din TB_FILE, bara cu butoanele, panoul cu clasa lui */
function lume(semnal, salvat) {
  const el = (o) => { const a = new Map(); return Object.assign({ getAttribute: (k) => (a.has(k) ? a.get(k) : null), setAttribute: (k, v) => a.set(k, String(v)), hasAttribute: (k) => a.has(k), removeAttribute: (k) => a.delete(k), textContent: "" }, o || {}); };
  const reg = new Map(), ids = new Map();
  const span = el({ textContent: "Arată" });
  const butoane = [["Toate", "toate"], ["Decizia", "decizia"], ["Riscul", "risc"], ["Banii", "bani"], ["Piața", "piata"], ["Jurnalul", "jurnal"]].map(([t, k]) => { const b = el({ textContent: t }); b.setAttribute("data-action-click", "tbFilaAlege('" + k + "')"); return b; });
  const nav = el({ querySelector: (s) => (s === "span" ? span : s === ".tbFilaToate" ? butoane[0] : null), querySelectorAll: (s) => (s === "button" ? butoane : []), insertBefore: () => {} });
  const cls = new Set(semnal ? ["tbSemnal"] : []);
  ids.set("tbCuprins", nav); ids.set("tabloubot", el({ classList: { contains: (c) => cls.has(c) } }));
  const store = new Map(salvat ? [["tbFila", salvat]] : []);
  const document = { getElementById: (i) => ids.get(i) || null, querySelectorAll: (s) => { if (!reg.has(s)) reg.set(s, [el()]); return reg.get(s); }, createElement: () => el(), head: { appendChild: () => {} } };
  const c = { document, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }, Math, String, Number, Array, JSON, Object, isFinite };
  c.$ = (i) => document.getElementById(i); vm.createContext(c); vm.runInContext(MOD, c);
  const ascunse = () => { const f = vm.runInContext("TB_FILE", c), r = {}; for (const k of Object.keys(f)) r[k] = f[k].filter((s) => document.querySelectorAll(s)[0].getAttribute("data-fila-ascuns") === "1").length; return r; };
  const apasat = () => butoane.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent).join(" ");
  return { c, ascunse, apasat, store };
}
const nimic = { decizia: 0, risc: 0, bani: 0, piata: 0, jurnal: 0 };

await test("A  app.css: pe .tbSemnal se ascund și butoanele-file Decizia / Riscul (tbFilaAlege), nu doar cele vechi (tbSariLa)", () => {
  const r = CSS.split("\n").find((l) => l.includes(".tbSemnal #tbCuprins") && l.includes("{display:none!important}"));
  assert.ok(r, "regula botului de semnal pentru cuprins");
  for (const k of ["decizia", "risc"]) for (const f of ["tbSariLa", "tbFilaAlege"]) assert.ok(r.includes(`.tbSemnal #tbCuprins [data-action-click="${f}('${k}')"]`), f + "('" + k + "')");
});

await test("B  semnal + fila ținută minte „risc” / „decizia” ⇒ se arată ca „Toate” (nimic ascuns, „Toate” apăsat); alegerea rămâne", () => {
  for (const k of ["risc", "decizia"]) {
    const w = lume(true, k); vm.runInContext("tbFilaAplica()", w.c);
    assert.deepEqual(w.ascunse(), nimic, k + ": pe semnal nu se ascunde nimic");
    assert.equal(w.apasat(), "Toate", k + ": „Toate” apăsat");
    assert.equal(w.store.get("tbFila"), k, k + ": alegerea rămâne pentru botul de grid");
  }
  const w = lume(true, "bani"); vm.runInContext("tbFilaAplica()", w.c);
  assert.deepEqual(w.ascunse(), { decizia: 6, risc: 8, bani: 0, piata: 6, jurnal: 4 }, "pe semnal, fila Banii lucrează");
});

await test("C  grid + fila „risc” ⇒ lucrează ca înainte (celelalte capitole ascunse, „Riscul” apăsat)", () => {
  const w = lume(false, "risc"); vm.runInContext("tbFilaAplica()", w.c);
  assert.deepEqual(w.ascunse(), { decizia: 6, risc: 0, bani: 7, piata: 6, jurnal: 4 });
  assert.equal(w.apasat(), "Riscul");
});

await test("D  semnal: legătura spre Riscul nu schimbă fila; spre Banii da", () => {
  const w = lume(true, "piata"); vm.runInContext("tbSariLa('risc')", w.c);
  assert.equal(w.store.get("tbFila"), "piata", "Riscul nu există pe semnal");
  vm.runInContext("tbSariLa('bani')", w.c); assert.equal(w.store.get("tbFila"), "bani");
  const g = lume(false, "piata"); vm.runInContext("tbSariLa('risc')", g.c); assert.equal(g.store.get("tbFila"), "risc", "pe grid, ca înainte");
});

await test("E  app.js: fila se potrivește pe loc după comutarea clasei tbSemnal", () => {
  const i = APP.indexOf('pnl.classList.toggle("tbSemnal",semnalTb);'); assert.ok(i > 0);
  assert.match(APP.slice(i, i + 200), /^pnl\.classList\.toggle\("tbSemnal",semnalTb\);\r?\n\s*if\(typeof tbFilaAplica==="function"\)try\{tbFilaAplica\(\)\}catch\(e\)\{\}/);
});

await test("V  versiunea v100.391 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  /* v100.392: „de la 391 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.392) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 391); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 391); assert.ok(bi.li391 && bi.li391.length > 100, "BUILD_INFO.li391");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 391).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(SW) || [])[1] >= 391); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 391);
  assert.match(pk.scripts.test, /npm run test:v100390 && npm run test:v100391/); assert.equal(pk.scripts["test:v100391"], "node scripts/proba-v100391.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
