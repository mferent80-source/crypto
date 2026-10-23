// Proba v100.253 (23.10, el: piața întinde fereastra; linia rămâne, celelalte stau lângă).
// Nu cheamă alte probe.
import "./lib/text-ro-global.mjs";
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
console.log("\nV100.253 · ALĂTURI · proba\n");

await test("șirurile vechi rămân, iar rândurile pieței stau lângă, după regula care întindea", () => {
  const css = citeste("public", "app.css");
  const i340 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 340px}");
  const i280 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 280px}");
  const i240 = css.indexOf("#tabloubot .tbGraficRand{grid-template-columns:minmax(0,1fr) 240px}");
  assert.ok(i340 >= 0 && i280 > i340 && i240 > i280);
  const stretch = css.indexOf("#tabloubot .tbGraficRand{align-items:stretch}");
  const flex = css.indexOf("#tabloubot .tbGrCol{display:flex;flex-direction:column;gap:8px;grid-column:2");
  const contents = css.indexOf("display:contents");
  assert.ok(contents >= 0 && contents < flex, [contents, flex].join(","));
  assert.match(css, /#tabloubot #tbTrendCard\{grid-column:auto;grid-row:auto;flex:1 1 auto/);
  assert.match(css, /#tabloubot #tbTrendCard\{flex:0 0 auto\}/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}/);
  const bloc = css.indexOf("#tabloubot #tbCitireCard{grid-column:1 / -1;grid-row:2;align-self:start}");
  assert.ok(stretch >= 0 && i240 >= 0 && bloc > stretch && bloc > i240, [stretch, i240, bloc].join(","));
  assert.ok(css.indexOf("#tabloubot .tbGrCol{display:contents}", flex) > flex);
  assert.match(css, /#tabloubot \.tbGraficRand\{align-items:start\}[\s\S]*#tabloubot \.tbGrStanga\{align-self:start\}[\s\S]*#tabloubot \.tbGrCol\{display:contents\}[\s\S]*#tabloubot #tbTrendCard\{grid-column:2;grid-row:1;align-self:start\}/);
  assert.match(css, /#tabloubot #tbCitire\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(280px,1fr\)\);column-gap:8px;align-items:start\}/);
  assert.match(css, /#tabloubot #tbCitire>\.tbCitScurt,#tabloubot #tbCitire>\.tbCitVoci\{grid-column:1 \/ -1\}/);
  assert.match(css, /#tabloubot #tbCitire>\.tbCitR\{min-width:0\}/);
  assert.match(css, /#tabloubot #tbCitire>\.tbCitR:has\(button,a\)\{grid-column:1 \/ -1\}/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("versiunea e cel puțin v100.253, colectorul cel puțin v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.ok(Number(P.version.split(".")[1]) >= 253);
  assert.equal(P.scripts["test:v100253"], "node scripts/proba-v100253.mjs");
  assert.equal((P.scripts.test.match(/test:v100253/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100252/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100253"], /npm run test:v100253/);
  const idx = citeste("public", "index.html");
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.engineContract, "54.1");
  assert.match(info.features.alaturi253, /unul lângă altul/);
  assert.match(info.features.clar252, /aproape/);
  const mv = citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/);
  assert.ok(mv && Number(mv[1]) >= 136);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
