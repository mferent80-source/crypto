// Proba v100.215 (18.10.2026, găsit pe poza de telefon după v100.214): caseta de sus din Setări (stratul asezare-paznic.js)
// scria încă „din: API Security · Data freshness”, adică titlurile vechi, traduse în v100.214 („Parola aplicației pe acest
// dispozitiv”, „Prospețimea datelor”). Sursa casetei trebuie să numească secțiunile cum le vede omul pe ecran.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.215 · caseta din Setări numește secțiunile cu titlurile de pe ecran · proba\n");
const AS = citeste("public", "lib", "asezare-paznic.js"), IDX = citeste("public", "index.html");

await test("caseta din Setări: „din:” numește secțiunile cu titlurile lor din română", () => {
  assert.ok(!AS.includes("API Security · Data freshness"), "a rămas textul vechi");
  assert.match(AS, /din: "Parola aplicației · Prospețimea datelor \(vârsta ultimelor date\)"/);
});
await test("titlurile numite există chiar pe pagina Setări", () => {
  const i = IDX.indexOf('id="settings"'), s = IDX.slice(i, IDX.indexOf('<section class="panel', i + 10));
  assert.ok(s.includes(">Parola aplicației pe acest dispozitiv<")); assert.ok(s.includes(">Prospețimea datelor<"));
});
await test("niciun titlu englezesc tradus în v100.214 nu mai e numit în stratul de casete", () => {
  for (const t of ["Run health check", "Run provider health", "API Security", "Data freshness"]) assert.ok(!AS.includes(t), "a rămas: " + t);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
