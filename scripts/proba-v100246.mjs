// Proba v100.246 (22.10, el: „refă designul paginii fără să se piardă nimic”):
// Sugestii poartă aceleași cartele ca Tabloul. Listele, filtrele, istoricul și butoanele rămân.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.246 · FEL · proba\n");

await test("cartelele Sugestiilor au fondul și chenarul Tabloului; titlurile au aceeași măsură", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#sugestii\{[^}]*--tb-fond:#141C24[^}]*--tb-fond2:#1A242E/);
  assert.match(css, /#sugPagina \.tbBloc\{[^}]*background:var\(--tb-fond\)[^}]*border:1px solid var\(--tb-linie\)[^}]*border-radius:var\(--tb-r\)/);
  assert.match(css, /#sugPagina \.sugCap,#sugPagina \.rlSec>h3\{[^}]*font-size:14px/);
  assert.match(css, /#sugPagina>\.rlRasp,#sugPagina>\[data-sug="nota"\]\{[^}]*max-width:90ch/);
  assert.match(css, /#sugPagina>\.sugTrend\{[^}]*background:var\(--tb-fond\)/);
  assert.match(css, /#sugPagina \.sugSect\{[^}]*background:var\(--tb-fond\)/);
  assert.match(css, /@media \(max-width:640px\)\{#sugPagina \.t212BtnLinie\{min-height:44px\}/);
});

await test("istoricul, pânda, rândul și ultima linie rămân", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#sugPagina \.sugIstoric,#sugPagina \.sugUrm\{[^}]*white-space:nowrap[^}]*min-height:1\.35em/);
  assert.match(css, /#sugPagina>\.sugPanda\{[^}]*min-height:14em/);
  assert.match(css, /\.sugLista li\{display:flex;flex-wrap:nowrap/);
  assert.match(css.trim().split("\n").pop(), /#topLive\{display:none!important\}/);
  const fis = citeste("public", "lib", "sugestii-ecran.js");
  assert.ok(fis.includes('<div class="tbBloc sugPanda">'));
  assert.match(fis, /title="' \+ sugEsc\(istoric\) \+ '"/);
  assert.match(fis, /arată toate /);
  assert.match(fis, /monedele boților mei/);
  assert.match(fis, /sugBusola/);
  const idx = citeste("public", "index.html");
  const i = idx.indexOf('id="sugPagina"');
  const bloc = idx.slice(i, idx.indexOf('id="carnet"'));
  assert.match(bloc, /Aștept sugestiile/);
  assert.deepEqual([...bloc.matchAll(/data-sug="([^"]+)"/g)].map((m) => m[1]), ["rasp", "panda", "boti", "us", "sect", "trend", "eu", "nota"]);
});

await test("versiunea v100.246, insigna FEL, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.246.0");
  assert.equal(P.scripts["test:v100246"], "node scripts/proba-v100246.mjs");
  assert.equal((P.scripts.test.match(/test:v100246/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100245/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100246"], /npm run test:v100246/);
  const idx = citeste("public", "index.html");
  assert.equal((idx.match(/v100\.246/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.246 · FEL</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-246/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.246"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.246");
  assert.equal(info.badge, "v100.246 · FEL");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.136"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
