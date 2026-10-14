// Probele v100.194 (14.10.2026, el: „de ce tot îmi spune că e colectorul mort și trebuie să dau refresh să pornească?” ⇒ „repară”):
// ora colectorului se aducea la 5 minute, dar Tabloul și banda de sus o comparau la fiecare redesenare cu ora de ACUM (prag 3 min) ⇒
// cu colectorul viu, ~2 minute din fiecare 5 scria „oprit de 4–5 min”; F5 aducea ora proaspătă. Acum se judecă la momentul aducerii.
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
console.log("\nv100.194 · colectorul nu mai apare fals „oprit” · proba\n");

const el = () => ({ classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, setAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} });
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, MutationObserver: function () { this.observe = () => {}; },
  document: { documentElement: el(), body: el(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: el }, addEventListener() {}, location: { hash: "" } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "asezare-paznic.js"), ctx);
const A = ctx.AsezarePaznic, MIN = 60000, T = Date.UTC(2026, 9, 14, 14, 0);

await test("cazul lui: ora adusă cu 1 min după semnul colectorului, privită după 5 min ⇒ „merge” (înainte: „oprit de 6 min”)", () => {
  const la = T - 6 * MIN, adus = la + 1 * MIN;
  const r = A.colectorDin({ colectorLa: la }, T, adus); assert.equal(r.viu, true); assert.equal(r.min, 6);
  assert.equal(A.colectorDin({ colectorLa: la }, T).viu, false, "regula veche (fără adusLa) ar fi zis „oprit”");
});
await test("colectorul chiar tăcea la aducere (semn cu 10 min înainte) ⇒ „oprit”; aducerea veche de peste 12 min ⇒ „oprit” (pagina n-are veste)", () => {
  assert.equal(A.colectorDin({ colectorLa: T - 12 * MIN }, T, T - 2 * MIN).viu, false);
  assert.equal(A.colectorDin({ colectorLa: T - 15 * MIN }, T, T - 14 * MIN).viu, false);
  assert.equal(A.colectorDin({ colectorLa: T - 3 * MIN }, T, T - 1 * MIN).viu, true);
  assert.equal(A.colectorDin(null, T, T), null);
});
await test("Tabloul și banda de sus folosesc aceeași regulă, cu ora aducerii; tbAduExtra ține minte când a sosit ora", () => {
  const app = citeste("public", "app.js"), ap = citeste("public", "lib", "asezare-paznic.js");
  assert.match(app, /config:ist\.config\|\|null,adusLa:Date\.now\(\)\}/);
  assert.match(app, /if\(!s\)\{el\.innerHTML='<p class="tbSub">Aștept datele serverului de acasă/, "datele încă nesosite nu mai înseamnă „colectorul n-a pornit”");
  assert.match(app, /AsezarePaznic\.colectorDin\(c,Date\.now\(\),s\.adusLa\)/);
  /* v100.196 (auditul UI 🟡8): sursa trece prin colectorSursa - istoricul Tabloului cu ora aducerii când există, altfel config-ul adus separat */
  assert.match(ap, /col: colectorDin\(cs\.cfg, Date\.now\(\), cs\.adusLa\)/); assert.match(ap, /if \(i && i\.config\) return \{ cfg: i\.config, adusLa: i\.adusLa \};/);
  assert.ok(!/var min=c\.colectorLa\?Math\.round\(\(Date\.now\(\)-c\.colectorLa\)\/60000\):null;\n\s*var viu=min!==null&&min<=3;/.test(app), "regula veche a ieșit din Tablou");
});
await test("versiunile: v100.194 peste tot", () => {
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 194); assert.ok(!/v100\.193\b/.test(citeste("public", "index.html")));
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-(19[4-9]|[2-9]\d\d)/); assert.match(citeste("package.json"), /npm run test:v100193 && npm run test:v100194/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
