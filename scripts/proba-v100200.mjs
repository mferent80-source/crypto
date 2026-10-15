// Probele v100.200 (15.10.2026, el: „fă tot” — ideile rămase din audit): „Cât cumperi” din tabelul „Pe revenire” cu ACEEAȘI regulă ca Poarta
// (riscul după regim, banii liberi, plafonul pe total) și spus cinstit „la prețul ideii”; regimul BLOCAT nu mai dă o sumă nici în Scan / reveniri
// (înainte: riscul 0 al regimului blocat cădea pe 1 % ⇒ suma întreagă, deși Poarta spunea „n-aș deschide poziții noi”).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message).slice(0, 400)}`); }); }
console.log("\nv100.200 · reveniri cu regula Porții, regimul blocat fără sumă · proba\n");

const ACUM = Date.parse("2026-10-15T09:00:00Z");
class Ceas extends Date { constructor(...a) { if (a.length) super(...a); else super(ACUM); } static now() { return ACUM; } }
function pagina(regim) {
  const c = { console, Date: Ceas, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0, $: () => null, getJSON: async () => null,
    escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])), toast() {}, navTo() {},
    localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [], addEventListener() {}, getElementById: () => null }, fetch: async () => ({ ok: false }) };
  c.window = c; c.globalThis = c; vm.createContext(c);
  for (const f of ["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js", "reveniri.js", "t212.js", "t212-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c, { filename: f });
  c.t212.cont = { cash: { total: 27500, free: 20000 } }; c.t212.bnr = { zi: "2026-10-15", curs: 4.4 }; c.t212.poz = [];
  if (regim) c.t212.regimPiata = Object.assign({ adus: ACUM, la: ACUM }, regim);
  return c;
}
const REV = { reveniri: [{ simbol: "ABC", ticker: "ABC_US_EQ", pret: 100, stop: 90, tinta: 120, cadere: 0.3, deLaMin: 0.08, zileMin: 3, istoric: null }], dovadaReveniri: null };

await test("t212MarimeCalc: regimul BLOCAT (fuga de risc / Market Breadth risk-off) ⇒ fără sumă, cu motivul — ca Poarta", () => {
  const c = pagina({ macro: "riskoff", mb: null }), m = c.t212MarimeCalc("ABC_US_EQ", 100, 90, 100);
  assert.equal(m.blocat, true); assert.match(m.motiv, /n-aș deschide poziții noi/);
  const n = pagina(null).t212MarimeCalc("ABC_US_EQ", 100, 90, 100);
  assert.ok(n && !n.blocat && n.suma > 0, "fără regim adus: suma pe 1 %, ca înainte");
});
await test("t212MarimeCalc: regimul „prudent” ⇒ riscul 0,5 % din cont (jumătate din normal)", () => {
  const p = pagina({ macro: "prudent", mb: null }).t212MarimeCalc("ABC_US_EQ", 100, 90, 100), n = pagina({ macro: "riskon", mb: null }).t212MarimeCalc("ABC_US_EQ", 100, 90, 100);
  assert.ok(Math.abs(p.riscPctReal - 0.005) < 1e-9, "0,5 %: " + p.riscPctReal); assert.ok(Math.abs(n.riscPctReal - 0.01) < 1e-9);
});
await test("„Pe revenire”: „Cât cumperi” cu regula Porții (regim prudent ⇒ 0,5 % din cont), capul spune „la prețul ideii”", () => {
  const h = pagina({ macro: "prudent", mb: null }).t212ReveniriCorp(REV);
  assert.match(h, /<th>Cât cumperi · la prețul ideii<\/th>/);
  assert.match(h, /\(0,5% din cont\)/);
});
await test("„Pe revenire” cu regimul blocat: „nimic azi” + motivul, fără sumă", () => {
  const h = pagina({ macro: "stres", mb: null }).t212ReveniriCorp(REV);
  assert.match(h, /nimic azi/); assert.ok(!/la stop pierzi/.test(h.slice(h.indexOf("Cât cumperi"))), "fără sumă");
});
await test("Scan: regimul blocat ⇒ „Cât cumperi: nimic azi” cu motivul, nu suma întreagă", () => {
  const s = citeste("public", "lib", "scan-ecran.js");
  assert.match(s, /ma\.blocat \? '<div class="scLin"><span>Cât cumperi<\/span><b class="bad">nimic azi/);
});
await test("versiunile: de la v100.200 în sus, proba în lanțul `test`", () => {   /* v100.201: ≥, nu egal */
  const idx = citeste("public", "index.html"), ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 200, String(ver));
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4);
  assert.match(citeste("package.json"), /npm run test:v100199 && npm run test:v100200/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
