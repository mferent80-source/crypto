// Probele v100.182 (13.10.2026, el, după poza din v100.181: „e la fel și la acțiuni, fă și acolo, se face lungă și lungește lista”)
// — în TOATE listele din Sugestii (boți, US, EU) descrierea stă lângă nume și se înfășoară acolo, nu cade pe rândul următor.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.182 · listele din Sugestii pe un rând · proba\n");
const css = citeste("public", "app.css");

await test("rândul listei nu se mai rupe: numele fix, descrierea se înfășoară lângă el (pe toate listele, nu doar cu 🧭)", () => {
  /* v100.292: rândul e .sugRand (grilă: simbolul + prețul pe primul rând, descrierea dedesubt, înfășurată în lățimea rândului) - nu mai există .sugLista li */
  assert.match(css, /\.sugRand\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;grid-template-areas:"sim pret" "sub sub"/);
  assert.match(css, /\.sugRandSim\{grid-area:sim;min-width:0/); assert.match(css, /\.sugRandPret\{grid-area:pret;[^}]*white-space:nowrap/);
  assert.doesNotMatch(css, /\.sugLista li\{/, "regula veche a listei a rămas");
});
await test("regula numai-pe-rândurile-cu-🧭 (v100.181) e scoasă: cea generală o acoperă", () => {
  assert.doesNotMatch(css, /\.sugLista li:has\(\.sugBusola\)/);
  assert.match(css, /\.sugBusola\{margin-left:auto;flex:none;min-width:32px;min-height:32px/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
