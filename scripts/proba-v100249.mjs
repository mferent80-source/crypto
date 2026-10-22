// Proba v100.249 (22.10, el: spațiile goale și graficul mai explicit).
// Regula veche display:contents și înălțimea 210–300 rămân în fișier.
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
console.log("\nV100.249 · STRÂNS · proba\n");

await test("coloana graficului se lipește, cardurile de jos iau rândul, regula veche rămâne", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /@media \(min-width:1181px\)\{#tabloubot \.tbGrCol\{display:contents\}#tabloubot \.tbGrStanga\{grid-column:1;grid-row:1\}#tabloubot #tbCitireCard\{grid-column:2;grid-row:1;align-self:start\}#tabloubot #tbTrendCard\{grid-column:1\/-1;grid-row:2\}/);
  assert.match(css, /@media \(min-width:1181px\)\{\s*#tabloubot \.tbGraficRand\{align-items:stretch\}/);
  assert.match(css, /#tabloubot \.tbGrCol\{display:flex;flex-direction:column;gap:8px;grid-column:2;grid-row:1/);
  assert.match(css, /#tabloubot #tbTrendCard\{grid-column:auto;grid-row:auto;flex:1 1 auto/);
  assert.ok(css.indexOf("display:contents") < css.indexOf("display:flex;flex-direction:column;gap:8px;grid-column:2"));
  assert.match(css, /\.pzDemo #tabloubot \.tbCadru>\.contTot\{order:60;grid-column:span 2\}/);
  assert.match(css, /\.pzDemo #tabloubot\.on \.tbCadru>\.contTot,/);
  assert.match(css, /\.pzDemo #tabloubot\.on \.tbCadru>#tbPl-port\{grid-column:1 \/ -1\}/);
  assert.match(css, /#tabloubot \.tbMotive,#tabloubot \.tbConcret,#tabloubot #tbAcumCard\{margin:0\}|#tabloubot \.tbMotive,#tabloubot \.tbConcret,#tabloubot #tbAcumCard,#tabloubot #tbSemaforCard/);
  assert.match(css, /@media \(max-width:1180px\)\{#tabloubot #tbCitireCard\{display:none\}/);
  assert.match(css, /#tabloubot \.gbValCap\{margin:8px 0 2px/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("graficul botului e mai înalt și își spune scara, fără să schimbe culorile", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  assert.match(g, /Math\.max\(210, Math\.min\(300, W \* 0\.18\)\)/);
  assert.match(g, /Math\.max\(360, Math\.min\(460, W \* 0\.46\)\)/);
  assert.match(g, /o\.actiune \? Math\.round\(Math\.max\(340, Math\.min\(520/);
  assert.match(g, /class="gbAxa"/);
  assert.match(g, /<p class="gbValCap">Ce e pe grafic<\/p><ul class="gbValori"/);
  assert.match(g, /#26A96C/);
  assert.match(g, /class="gbC"/);
  assert.match(g, /var cmp = true/);
});

await test("versiunea de la v100.249 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 249, P.version);   /* v100.250: insigna live nu mai e STRÂNS */
  assert.equal(P.scripts["test:v100249"], "node scripts/proba-v100249.mjs");
  assert.equal((P.scripts.test.match(/test:v100249/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100248/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100249"], /npm run test:v100249/);
  assert.match(citeste("public", "index.html"), /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
