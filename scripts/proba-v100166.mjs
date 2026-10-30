// Proba v100.166 / colector v101.94 (12.10.2026, el: „completez raportul de duminică”): pagina Weekly Review din premarket_scanner
// NU se mută ca pagină - Radarul are deja raportul de duminică (boții, T212 închise, autopsia) și „Săptămâna pieței” (BTC, Nasdaq,
// VIX, ce a urcat / scăzut, boții + acțiunile deschise, calendarul, rezultatele). Lipseau: lățimea pieței (crypto + US) în raport
// și „Săptămâna pieței” în Radar (era doar pe Discord). Tura pieței e probată în tura-piata-v94, ruta în colector-v77; aici Jurnalul.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nV100.166 · „Săptămâna pieței” în Jurnalul de trade · proba\n");
const app = citeste("public", "app.js"), acasa = citeste("public", "lib", "acasa.js");

await test("Jurnalul aduce „Săptămâna pieței” de acasă (action=raportPiata), lângă raportul de duminică", () => {
  /* v100.272: cererea pleacă odată cu boții, prin luat() = getJSON cu eroarea prinsă (null la eroare, ca înainte) */
  assert.match(app, /var luat=function\(u\)\{return getJSON\(u\)\.then\(/); assert.match(app, /luat\("\/api\/istoric-bot\?action=raportPiata"\)/);
  assert.match(app, /jtStare\.raportPiata=rpp\.ok\?\(rpp\.v&&rpp\.v\.raport\|\|null\):null;/);
  assert.match(app, /jtStare\.raportPiata=/);
});
await test("Jurnalul o desenează sub raportul de duminică, cu titlul și rândurile ei (escapate), doar când există", () => {
  const i = app.indexOf('var rap=$("jtRaport")'), j = app.indexOf('var rg=$("jtReguli")', i), bloc = app.slice(i, j);
  assert.ok(i > 0 && j > i);
  assert.match(bloc, /jtStare\.raportPiata/); assert.match(bloc, /escapeHtml\(TextRo\.cifreNoi\(x\)\)/);
  assert.match(bloc, /class="jtRaportPiata"/);
});
await test("acasa.raportSaptamana: rândurile lățimii stau după Nasdaq 100 și înaintea calendarului", () => {
  const a = acasa.indexOf("↕ Nasdaq 100 pe săptămână"), b = acasa.indexOf("🌐 Lățimea crypto (150 perp-uri): "), c = acasa.indexOf("🗽 Acțiuni US: "), d = acasa.indexOf("📅 Săptămâna asta: ");
  assert.ok(a > 0 && b > a && c > b && d > c);
});

console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
