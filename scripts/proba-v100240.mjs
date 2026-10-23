// Proba v100.240 (22.10, el: „poți trece la treabă”): așezarea Tabloului.
// Nimic nu cade din pagină. Calculul, pragul 55, textele și culorile lumânărilor rămân.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.240 · AȘEZ · proba\n");

const idx = citeste("public", "index.html");
const css = citeste("public", "app.css");
const app = citeste("public", "app.js");
const paz = citeste("public", "lib", "asezare-paznic.js");
const grafic = citeste("public", "lib", "grafic-bot.js");

await test("blocurile Tabloului rămân în pagină, plus locul Monte Carlo", () => {
  const i0 = idx.indexOf('id="tabloubot"'), i1 = idx.indexOf('id="tbDetalii"');
  assert.ok(i0 >= 0 && i1 > i0);
  const tab = idx.slice(i0, i1 + 40);
  for (const id of ["tbMcSus", "tbVerdictCard", "tbGridLarg", "tbKpi", "tbKpiTotal", "tbKpiLich", "tbKpiPret", "tbKpiPiata", "tbGrafic", "tbCitire", "tbCitireMobil", "tbTrendCard", "tbSemaforCard", "tbMotive", "tbConcret", "tbIdei", "tbAcumCard", "tbPl-plan", "tbPl-sfaturi", "tbPl-avert", "tbPl-alerte", "tbPl-prob", "tbPl-risc", "tbPl-fisa", "tbPl-sapt", "tbPl-socoteala", "tbPl-port", "tbGridNou", "tbTodo", "tbBotAles"]) {
    assert.ok(tab.includes('id="' + id + '"'), id);
  }
  assert.ok(tab.includes("contTot") && tab.includes("piataAzi") && tab.includes("tbGraficRand") && tab.includes("tbGrilaNoua"));
  assert.match(idx, /id="tbDovadaCard"/);
  assert.match(tab, /<section id="tbMcSus" class="tbBloc" hidden>/);
});

await test("ordinea veche rămâne în fișier; așezarea nouă o acoperă", () => {
  for (const s of [
    ".pzDemo #tabloubot .tbCadru>*{order:900}",
    ".pzDemo #tabloubot .tbCadru>.sectionHead{order:0}",
    ".pzDemo #tabloubot .tbCadru>#tbVerdictCard{order:5}",
    ".pzDemo #tabloubot .tbCadru>#pzVerdict{order:10}",
    ".pzDemo #tabloubot .tbCadru>#tbGridLarg{order:12}",
    ".pzDemo #tabloubot .tbCadru>#pzDrumCard{order:20}",
    ".pzDemo #tabloubot .tbCadru>.tbSus{order:30}",
    ".pzDemo #tabloubot .tbCadru>#tbConcret{order:40}",
    ".pzDemo #tabloubot .tbCadru>.contTot{order:50}",
    ".pzDemo #tabloubot .tbCadru>.piataAzi{order:55}",
    ".pzDemo #tabloubot .tbCadru>.tbGraficRand{order:60}",
    ".pzDemo #tabloubot .tbCadru>#tbSemaforCard{order:70}",
    ".pzDemo #tabloubot .tbCadru>#tbMotive{order:72}",
    ".pzDemo #tabloubot .tbCadru>.tbGrilaNoua{order:80}",
    ".pzDemo #tabloubot .tbCadru>#tbAcumCard{order:85}",
    ".pzDemo #tabloubot .tbCadru>#tbPl-plan{order:100}",
    ".pzDemo #tabloubot .tbCadru>#tbDetalii{order:990}",
    "#tabloubot.pzCuColoana.on{display:grid!important",
    "@media (min-width:1181px){#tabloubot .tbGrCol{display:contents}#tabloubot .tbGrStanga{grid-column:1;grid-row:1}#tabloubot #tbCitireCard{grid-column:2;grid-row:1;align-self:start}#tabloubot #tbTrendCard{grid-column:1/-1;grid-row:2}}",
    "#tabloubot #tbVerdictCard{display:none}",
  ]) assert.ok(css.includes(s), s);
  assert.match(css, /html\.pzDemo #tabloubot\.pzCuColoana\.on\{display:flex!important/);
  assert.match(css, /\.pzDemo #tabloubot \.tbCadru>#tbMcSus\{order:18\}/);
  assert.match(css, /\.pzDemo #tabloubot \.tbCadru>#pzDrumCard\{order:22\}/);
  assert.match(css, /\.pzDemo #tabloubot \.tbCadru>\.tbGraficRand\{order:28\}/);
  assert.match(css, /\.pzDemo #tabloubot \.tbCadru:has\(>#pzVerdict:not\(\[hidden\]\)\)>\.sectionHead\{grid-column:4 \/ -1;grid-row:1\}/);
  const ultima = css.trim().split("\n").pop();
  assert.match(ultima, /#topLive\{display:none!important\}/);
});

await test("Monte Carlo e același rând, nu o a doua socoteală; drumul e frate cu cifra", () => {
  const c = app.slice(app.indexOf("function tbDeseneazaCitire("), app.indexOf("function tbVociBilant("));
  assert.match(c, /out\.unshift\(/);
  assert.match(c, /data-action-click="gsDeschideBot\(\)">'\+escapeHtml\(mc\.buton\)\+'<\/button>/);
  assert.match(c, /\$\("tbMcSus"\)/);
  assert.doesNotMatch(c, /46%|51%/);
  const mostra = '<p class="tbCitScurt">x</p><div class="tbCitR info tbCitMc"><span class="tbCitIc">🎰</span><div><b>Monte Carlo:</b> <span class="tbCitTx">planul</span> <button type="button">deschide în Simulator</button></div></div><div class="tbCitR info"><span></span><div>alt</div></div>';
  const i = mostra.indexOf(" tbCitMc"), a = mostra.lastIndexOf("<div", i), b = mostra.indexOf("</div></div>", i);
  const frag = mostra.slice(a, b + 12);
  assert.match(frag, /^<div class="tbCitR info tbCitMc">/);
  assert.match(frag, /<\/button><\/div><\/div>$/);
  assert.doesNotMatch(frag, /alt/);
  assert.match(app, /function tbCitireGol\(text\)\{[\s\S]*\$\("tbMcSus"\)/);
  assert.match(paz, /classList\.contains\("tbCadru"\)/);
  assert.match(paz, /parinte\.insertBefore\(el, inainte\)/);
  assert.match(citeste("public", "lib", "grid-sim.js"), /P >= 55/);
  assert.match(grafic, /class="gbC"/);
  assert.match(grafic, /#26A96C/);
  assert.match(grafic, /o\.actiune \? Math\.round\(Math\.max\(340, Math\.min\(520/);
  assert.match(grafic, /Math\.max\(210, Math\.min\(300, W \* 0\.18\)\)/);
});

await test("versiunea de la v100.240 în sus, colectorul rămâne v101.136", () => {
  const P = JSON.parse(citeste("package.json"));
  const parti = P.version.split(".").map(Number);
  assert.ok(parti[0] === 100 && parti[1] >= 240, P.version);   /* v100.241: insigna live nu mai e AȘEZ */
  assert.equal(P.scripts["test:v100240"], "node scripts/proba-v100240.mjs");
  assert.equal((P.scripts.test.match(/test:v100240/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100239/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100240"], /npm run test:v100240/);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).engineContract, "54.1");
  const mv = citeste("scripts", "colector.mjs").match(/VERSIUNE_COLECTOR = "v101\.(\d+)"/);
  assert.ok(mv && Number(mv[1]) >= 136);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
