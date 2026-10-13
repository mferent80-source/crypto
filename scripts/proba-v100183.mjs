// Probele v100.183 (13.10.2026, el: „poți face ideile” — ideile 1 și 2 din v100.182)
// 1) 🧭 pe fiecare monedă din tabelul pândei (Sugestii), Busola pe 4h (direcția din tabel e pe 4h)
// 2) prețurile ideilor de cumpărare (intrare / stop / țintă) cu O zecimală de la 10 în sus (regula lui, 03.10);
//    sub 10 rămân două — acolo 0,05 ar muta stopul cu peste 0,5%
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.183 · 🧭 în pândă + prețurile cu o zecimală · proba\n");
const sug = citeste("public", "lib", "sugestii-ecran.js"), css = citeste("public", "app.css");

const ctx = { console, navTo() {}, getJSON() {}, $: () => null, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "busola.js"), ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);

await test("sugBani: o zecimală de la 10 în sus, două sub 10, virgulă, gol pe 0/negativ", () => {
  assert.equal(ctx.sugBani(123.456), "123,5");
  assert.equal(ctx.sugBani(110.2), "110,2");
  assert.equal(ctx.sugBani(150), "150,0");
  assert.equal(ctx.sugBani(10), "10,0");
  assert.equal(ctx.sugBani(9.87), "9,87");
  assert.equal(ctx.sugBani(3.45), "3,45");
  assert.equal(ctx.sugBani(0), "");
  assert.equal(ctx.sugBani(-5), "");
});
await test("pânda: fiecare rând are 🧭 spre Busola pe 4h, cu simbolul fără USDT", () => {
  ctx.Latime = { textCitire: () => ({ text: "x", vechi: false }), regimText: {}, regimDeCand: () => ({ text: "" }), PRAGURI: {}, filtreaza: (m) => m, esteBotContra: () => false };
  ctx.sugStare.panda.desfacut = true;
  const l = { acum: { la: 0, n: 2, lat: {}, regim: null, monede: [{ sym: "PLUMEUSDT", pret: 0.1, dir: "SUS" }, { sym: "1000PEPEUSDT", pret: 0.01, dir: "JOS" }] }, istoric: [] };
  const h = ctx.sugPandaHtml(l, [], 0);
  const linkuri = h.match(/<a class="sugBusola"[^>]*>/g) || [];
  assert.equal(linkuri.length, 2, "un 🧭 pe fiecare rând");
  assert.match(linkuri[0], /sym=PLUME&amp;interval=4h/);
  assert.match(linkuri[1], /sym=PEPE&amp;interval=4h/, "1000PEPE ⇒ PEPE, cum o știe Busola");
});
await test("pânda pliată: niciun 🧭 (tabelul nu e desenat)", () => {
  ctx.sugStare.panda.desfacut = false;
  const h = ctx.sugPandaHtml({ acum: { la: 0, n: 1, lat: {}, monede: [{ sym: "ADAUSDT" }] }, istoric: [] }, [], 0);
  assert.doesNotMatch(h, /sugBusola/);
});
await test("în tabel 🧭 nu împinge rândul la dreapta (fără margin-left:auto)", () => {
  assert.match(css, /\.sugPandaTab \.sugBusola\{margin-left:4px;vertical-align:middle\}/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
