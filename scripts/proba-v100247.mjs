// Proba v100.247 (22.10, el: „fa tot”): titlurile urcă, motorul vechi se pliază,
// macro și sectoarele stau pe un rând. Nimic nu se șterge.
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
console.log("\nV100.247 · RÂND · proba\n");

await test("Monte Carlo: titlul și obiceiurile urcă, caseta de simbol rămâne în HTML înaintea raportului", () => {
  const html = citeste("public", "index.html");
  const i = html.indexOf('id="mcsPagina"'), j = html.indexOf('id="rlPagina"');
  assert.ok(i > 0 && i < j);
  assert.ok(html.indexOf('<details class="rlVechi">') > j);
  const css = citeste("public", "app.css");
  assert.match(css, /#montecarlo\.on\{[^}]*display:flex/);
  assert.match(css, /#montecarlo>\.sectionHead\{[^}]*order:1/);
  assert.match(css, /#montecarlo>#rlPagina\{[^}]*order:2/);
  assert.match(css, /#montecarlo>#mcsPagina\{[^}]*order:3/);
  assert.match(css, /#montecarlo>\.rlVechi\{[^}]*order:4/);
});

await test("simulatorul își spune numele, futures pune interpretarea întâi, motorul vechi e pliat, macro și sectoarele stau pe un rând", () => {
  const html = citeste("public", "index.html");
  const g = html.indexOf('id="gridsim"');
  assert.match(html.slice(g, g + 180), /<div class="sectionHead"><h3>Simulator grid<\/h3><span class="small">un bot grid Pionex<\/span><\/div>/);
  assert.ok(html.indexOf('id="gsPagina"', g) > g);
  assert.match(html, /<section class="panel cryptoContextOnly" id="deriv"><div class="sectionHead"><h3>Futures · funding și OI<\/h3><span class="small">Binance USDⓈ-M · doar citire<\/span><\/div><div class="grid">/);
  const css = citeste("public", "app.css");
  assert.match(css, /#deriv \.grid>\.card:has\(#ftext\)\{[^}]*order:-1[^}]*grid-column:1\/-1/);
  const sv = html.indexOf('<details class="settingsVechi"><summary>Motorul vechi<\/summary>');
  const parola = html.indexOf("Parola aplicației pe acest dispozitiv");
  assert.ok(parola > 0 && sv > parola);
  const inchide = html.indexOf("</details>", sv);
  assert.ok(html.indexOf("Profilul semnalelor (motorul vechi)", sv) > sv && html.indexOf("Profilul semnalelor (motorul vechi)", sv) < inchide);
  assert.ok(html.indexOf("Alertele din browser (motorul vechi)", sv) < inchide);
  assert.match(html, /<div class="acPereche"><div class="acDoua acDouaMb"><div class="acCol"><div class="acBloc" id="acMacro"><\/div>/);
  assert.match(html, /<div class="acDoua acDouaSug"><div class="acCol"><div class="acBloc" id="acSectoare"><\/div><div class="acBloc" id="acTopSector"><\/div><\/div><div class="acCol"><div class="acBloc acMbBloc" id="acMbSug"><\/div><\/div><\/div><\/div>/);
  assert.match(css, /#dash \.acPereche\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /@media \(min-width:1920px\)\{#dash \.acPereche\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /\.pzDemo #acasa>\.acPereche\{order:50\}/);
  assert.match(css, /#settings \.settingsVechi>summary\{[^}]*min-height:44px/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
});

await test("versiunea v100.247, insigna RÂND, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.247.0");
  assert.equal(P.scripts["test:v100247"], "node scripts/proba-v100247.mjs");
  assert.equal((P.scripts.test.match(/test:v100247/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100246/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100247"], /npm run test:v100247/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.247/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.247 · RÂND</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-247/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.247"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.247");
  assert.equal(info.badge, "v100.247 · RÂND");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
