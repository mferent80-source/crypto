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
  assert.match(css, /\.sugLista li\{display:flex;flex-wrap:nowrap;gap:6px;align-items:baseline\}\.sugLista li>b\{flex:none\}\.sugLista li>\.tbSub\{flex:1;min-width:0\}/);
  assert.doesNotMatch(css, /\.sugLista li\{[^}]*flex-wrap:wrap/, "regula veche (wrap) a rămas");
});
await test("regula numai-pe-rândurile-cu-🧭 (v100.181) e scoasă: cea generală o acoperă", () => {
  assert.doesNotMatch(css, /\.sugLista li:has\(\.sugBusola\)/);
  assert.match(css, /\.sugBusola\{margin-left:auto;flex:none;min-width:32px;min-height:32px/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
