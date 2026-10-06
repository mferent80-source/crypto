// Proba v100.109 (06.10, el: „sub «Ce ai de făcut acum» rămâne un mare gol, verifică te rog”). Măsurat pe 8788 la 1920: stânga (graficul +
// „Ce ai de făcut acum”) se termina la 2.462 px, dreapta (citirea 1.123 + „Ce spun indicatorii” 769 + „Direcția pieței” 431) la 3.531 px
// ⇒ ~1.070 px goi sub listă (golul exista ~770 px; rândurile pe TF-uri din citire, v100.106, l-au mărit). Pe ecranul lat, cele două cartele
// coboară pe un rând al lor, sub grafic, una lângă alta; pe telefon (o coloană) nimic nu se schimbă.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.109 · golul de sub „Ce ai de făcut acum” · proba\n");

await test("(1) ecran lat: coloana dreaptă ține doar citirea; „Ce spun indicatorii” și „Direcția pieței” stau pe rândul de dedesubt, una lângă alta", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /@media \(min-width:1181px\)\{#tabloubot \.tbGrCol\{display:contents\}#tabloubot \.tbGrStanga\{grid-column:1;grid-row:1\}#tabloubot #tbCitireCard\{grid-column:2;grid-row:1;align-self:start\}#tabloubot #tbIndicatoriCard\{grid-column:1;grid-row:2\}#tabloubot #tbDirectieCard\{grid-column:2;grid-row:2\}\}/);
});
await test("(2) structura pe care se sprijină regula: cele trei cartele sunt chiar copiii lui .tbGrCol, iar rândul are două coloane", () => {
  const html = citeste("public", "index.html"), i = html.indexOf('<div class="tbGrCol">'), bucata = html.slice(i, i + 40000);
  assert.ok(i > 0); for (const id of ["tbCitireCard", "tbIndicatoriCard", "tbDirectieCard"]) assert.ok(bucata.includes('id="' + id + '"'), id);
  assert.match(citeste("public", "app.css"), /#tabloubot \.tbGraficRand\{grid-template-columns:minmax\(0,1fr\) 340px\}/);
});
await test("(E) versiunea v100.109 peste tot", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.109"/); assert.match(html, /id="sideVersiune"[^>]*>v100\.109/); assert.match(html, /id="antetVersiune">v100\.109/); assert.match(html, /id="healthAppVersion">v100\.109</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.109.0");
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-109";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
