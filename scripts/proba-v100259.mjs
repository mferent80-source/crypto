// Proba v100.259 (23.10, el: „hai să facem tot” după auditul „absolut tot”): integrarea celor trei copii (srv, ecran, logica)
// și paza nouă: colectorul pornește DOAR din dosarul principal. Azi un colector pornit dintr-o copie de lucru (data\ al copiei,
// alt colector.pid) a trimis 28 de mesaje duplicate pe Discord în ~2 minute. Probele proprii ale copiilor rămân separate.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); }
}
console.log("\nV100.259 · TOT · proba\n");

await test("colectorul pornit din altă rădăcină decât cea principală iese imediat (cod 0) și spune de ce", () => {
  // serverul spre un port mort: chiar dacă paza ar lipsi, colectorul n-are pe unde trimite ceva
  const radPrincipal = path.join(RAD, "..", "nu-e-aici-radar-principal");
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], {
    cwd: RAD, encoding: "utf8", timeout: 8000,
    env: { ...process.env, COLECTOR_DOAR_INCARCA: "", COLECTOR_RADACINA: radPrincipal, RADAR_URL: "http://127.0.0.1:9", PAZNIC_URL: "", PAZNIC_TOKEN: "" } });
  assert.notEqual(r.error && r.error.code, "ETIMEDOUT", "colectorul a rămas pornit: paza de rădăcină lipsește");
  assert.equal(r.status, 0, (r.stderr || "") + (r.stdout || ""));
  assert.match((r.stdout || "") + (r.stderr || ""), /colectorul pornește doar din dosarul principal/);
});
await test("paza de rădăcină stă înaintea pazei de PID și nu lovește probele (COLECTOR_DOAR_INCARCA)", () => {
  const col = citeste("scripts", "colector.mjs");
  const iRad = col.indexOf("colectorul pornește doar din dosarul principal"), iPid = col.indexOf("let pidVerificat = 0;");
  assert.ok(iRad > 0 && iPid > iRad, "paza de rădăcină înaintea celei de PID");
  assert.match(col, /if \(!DOAR_INCARCA && path\.resolve\(RAD\)\.toLowerCase\(\) !== path\.resolve\(RAD_PRINCIPAL\)\.toLowerCase\(\)\)/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
