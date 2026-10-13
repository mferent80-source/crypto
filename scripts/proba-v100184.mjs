// Probele v100.184 (13.10.2026, el: „fă idei”) — pânda pliată are și „monedele boților mei (N) ›”,
// care desface tabelul direct pe filtrul boților (până acum filtrul se vedea abia după „arată cele 149”)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.184 · boții tăi la un clic din pânda pliată · proba\n");

const ctx = { console, navTo() {}, getJSON() {}, $: () => null, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "latime.js"), ctx);
vm.runInContext(citeste("public", "lib", "busola.js"), ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
const l = { acum: { la: 0, n: 3, lat: { sus: 2, jos: 1, mariLong: 2 }, regim: { cod: "LARG-SUS" }, monede: [{ sym: "PLUMEUSDT", dir: "SUS" }, { sym: "ADAUSDT", dir: "JOS" }, { sym: "BTCUSDT", dir: "SUS" }] }, istoric: [] };

await test("pliată, cu un bot pe o monedă din listă: butonul „monedele boților mei (1) ›” cheamă filtrul boților", () => {
  ctx.sugStare.panda.desfacut = false;
  const h = ctx.sugPandaHtml(l, [{ s: "PLUME", dir: "long" }], 0);
  assert.match(h, /data-action-click="sugPanda\('boti'\)">monedele boților mei \(1\) ›<\/button>/);
  assert.match(h, /arată cele 3 ›/, "butonul vechi rămâne");
});
await test("fără boți (sau boți pe monede din afara celor 150): butonul nu apare", () => {
  ctx.sugStare.panda.desfacut = false;
  assert.doesNotMatch(ctx.sugPandaHtml(l, [], 0), /monedele boților mei/);
  assert.doesNotMatch(ctx.sugPandaHtml(l, [{ s: "XYZ", dir: "long" }], 0), /monedele boților mei/);
});
await test("clicul desface tabelul pe filtrul boților: rămâne doar moneda botului", () => {
  ctx.sugDeseneaza = () => {};
  ctx.sugPanda("boti");
  const h = ctx.sugPandaHtml(l, [{ s: "PLUME", dir: "long" }], 0);
  assert.equal((h.match(/<tr class="sugPandaRand/g) || []).length, 1);
  assert.match(h, /<b>PLUME<\/b>/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
