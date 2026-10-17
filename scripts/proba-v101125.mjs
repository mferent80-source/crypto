// Proba colector v101.125 (17.10.2026, colaborarea cu Busola, ideea 3): episoadele alertelor + martorii, în pentru-busola.json.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { alcatuieste, alertePentruBusola } from "./lib/pentru-busola.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
function test(nume, f) { teste++; try { f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } }
console.log("\nv101.125 · episoadele alertelor pentru Busola · proba\n");
const l = [{ tip: "voci", id: "2439", nume: "TAKE", la: 2000, p0: 0.7, ultim: -2.7, delta24: -3.45 }, { tip: "martor", id: "2440", la: 1000, p0: -0.09, delta24: 0.4, delta: 1.1 },
  { tip: "necunoscut", la: 3000 }, { tip: "contra", la: null }, { tip: "dir", id: 7, la: 4000 }];
test("doar tipurile știute, cu `la`; ordonate; d24 / d72 doar când există", () => assert.deepEqual(alertePentruBusola(l), [{ tip: "martor", id: "2440", la: 1000, d24: 0.4, d72: 1.1 }, { tip: "voci", id: "2439", la: 2000, d24: -3.45 }, { tip: "dir", id: "7", la: 4000 }]));
test("listă lipsă ⇒ []", () => assert.deepEqual(alertePentruBusola(null), []));
const B = { simbolBusola: (s) => s };
test("alcatuieste: `alerte` doar când colectorul le dă (altfel forma veche, neschimbată)", () => {
  assert.ok(!("alerte" in alcatuieste({ la: 1, versiune: "v", deschisi: [], inchisi: [], acum: 1, Busola: B })));
  assert.equal(alcatuieste({ la: 1, versiune: "v", deschisi: [], inchisi: [], acum: 1, Busola: B, alerte: l }).alerte.length, 3);
});
test("colectorul le trimite din lista pândei (stareAlerte._colector.pandaContra)", () => assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /alerte: stareAlerte && stareAlerte\._colector && stareAlerte\._colector\.pandaContra/));
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICATE" : "ok"}`);
process.exit(picate ? 1 : 0);
