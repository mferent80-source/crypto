// Proba v100.248 (22.10, el: „fa idei”): rândul pornește de la 1700,
// motorul vechi închis stă într-o celulă. Telefonul și coloana interioară rămân.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
console.log("\nV100.248 · LÂNGĂ · proba\n");

await test("macro și sectoarele stau pe un rând de la 1700, iar motorul vechi închis nu ia rândul întreg", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /@media \(min-width:1700px\)\{#dash \.acPereche\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /@media \(min-width:1920px\)\{#dash \.acPereche\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /#settings \.settingsVechi\{align-self:start\}/);
  assert.match(css, /#settings \.settingsVechi\[open\]\{[^}]*grid-column:1\/-1/);
  assert.doesNotMatch(css, /#settings \.settingsVechi\{[^}]*grid-column:1\/-1/);
  assert.match(css, /#settings \.settingsVechi>summary\{[^}]*min-height:44px/);
  assert.match(css, /@media \(max-width:900px\)\{#dash \.acVreme,#dash \.acDoua,#dash \.acTine,#dash \.acPuls\{grid-template-columns:1fr\}/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("versiunea v100.248, insigna LÂNGĂ, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.248.0");
  assert.equal(P.scripts["test:v100248"], "node scripts/proba-v100248.mjs");
  assert.equal((P.scripts.test.match(/test:v100248/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100247/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100248"], /npm run test:v100248/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.248/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.248 · LÂNGĂ</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-248/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.248"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.248");
  assert.equal(info.badge, "v100.248 · LÂNGĂ");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
