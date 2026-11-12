// Proba v100.330 · golurile Piața azi (12.11.2026, auditul de design ⇒ el: „fa tot acum”):
//   1. golul „Ce înseamnă pentru tine”: la 1920, „Acțiunile tale” și „Idei de azi” aveau ~550 px goi (cartelele întinse cât „Boții tăi”, 849 px,
//      butonul lipit de fund) ⇒ „Ce aș cumpăra azi” intră în grila .acTine: „Boții tăi” pe două rânduri în stânga, „Ce aș cumpăra azi” în dreapta,
//      sub cele două cartele mici; cartelele cât conținutul. Sub 900 px grila se desface (display:contents) și ordinea rămâne EXACT cea de dinainte
//      (cartelele 21, „Ce aș cumpăra azi” 30; pe telefon ≤ 640 urcă la 15, deasupra grupului - v100.196).
//   2. golul blocului bursei (≥ 1700 px, patru coloane 1593 / 1295 / 636 / 1122 px) ⇒ coloanele: Dobânzi + Regim · Market Breadth SUA ·
//      Scorul zilei + Sectoare + Cele mai tari · Sugestii MB. Sub 900 px blocul se desface și ordinea de pe telefon rămâne cea de dinainte:
//      Dobânzi, Scorul zilei, Market Breadth, Regim, Sectoare, Sugestii MB, Cele mai tari.
//   node scripts/proba-v100330-design.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 2).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.330 · golurile Piața azi: „Ce aș cumpăra azi” lângă cartele, coloanele bursei echilibrate · proba\n");
const idx = citeste("public", "index.html"), css = citeste("public", "app.css");

await test("1. index.html: „Ce aș cumpăra azi” e a patra cartelă din .acTine (o singură dată în pagină)", () => {
  assert.match(idx, /<div class="acTine"><div class="acBloc" id="acBoti"><\/div><div class="acBloc" id="acT212"><\/div><div class="acBloc" id="acIdei"><\/div><div class="acLegatura acCumpar" id="acCumpar"><\/div><div class="acBloc acTrendSus" id="acTrendZi"><\/div><\/div>/);   /* v100.331: + Trend 12 luni sub ea */
  assert.equal(idx.split('id="acCumpar"').length - 1, 1);
});
await test("1. peste 900 px: „Boții tăi” pe două rânduri, „Ce aș cumpăra azi” pe coloanele 2–3 sub cartelele mici; cartelele cât conținutul", () => {
  assert.match(css, /#dash \.acTine\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:auto auto 1fr;align-items:start;gap:8px\}/);   /* v100.331: trei rânduri */
  assert.match(css, /#dash \.acTine>#acBoti\{grid-column:1;grid-row:1 \/ span 3\}#dash \.acTine>#acCumpar\{grid-column:2 \/ 4;grid-row:2\}#dash \.acTine>#acTrendZi\{grid-column:2 \/ 4;grid-row:3\}/);
});
await test("1. sub 900 px: .acTine se desface, ordinea rămâne (cartelele 21, „Ce aș cumpăra azi” 30; ≤ 640 la 15, deasupra grupului)", () => {
  assert.match(css, /@media \(max-width:900px\)\{\.pzDemo #acasa \.acTine\{display:contents\}\.pzDemo #acasa \.acTine>\.acBloc\{order:21\}\}/);
  assert.match(css, /\.pzDemo #acasa #acCumpar\{order:30\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.pzDemo #acasa #acCumpar\{order:15\}\.pzDemo #acasa #acTrendZi\{order:16\}\}/);
  assert.doesNotMatch(css, /\.pzDemo #acasa>#acCumpar\{/, "vechiul selector (copil direct) nu mai prinde nimic");
});
await test("2. index.html: coloanele bursei - Dobânzi + Regim · Market Breadth SUA | Scorul zilei + Sectoare + Cele mai tari · Sugestii MB", () => {
  assert.match(idx, /<div class="acPereche"><div class="acDoua acDouaMb"><div class="acCol"><div class="acBloc" id="acMacro"><\/div><div class="acBloc" id="acRegim"><\/div><\/div><div class="acCol"><div class="acBloc acMbBloc" id="acMb"><\/div><\/div><\/div><div class="acDoua acDouaSug"><div class="acCol"><div class="acBloc acSzBloc" id="acScorZi"><\/div><div class="acBloc" id="acSectoare"><\/div><div class="acBloc" id="acTopSector"><\/div><\/div><div class="acCol"><div class="acBloc acMbBloc" id="acMbSug"><\/div><\/div><\/div><\/div>/);
});
await test("2. sub 900 px: blocul bursei se desface și ordinea de pe telefon rămâne cea de dinainte", () => {
  assert.match(css, /@media \(max-width:900px\)\{#dash \.acCol\{display:contents\}#dash \.acPereche>\.acDoua\{display:contents\}#dash \.acPereche #acMacro\{order:1\}#dash \.acPereche #acScorZi\{order:2\}#dash \.acPereche #acMb\{order:3\}#dash \.acPereche #acRegim\{order:4\}\n  #dash \.acPereche #acSectoare\{order:5\}#dash \.acPereche #acMbSug\{order:6\}#dash \.acPereche #acTopSector\{order:7\}\}/);
});
await test("stratul temei e la zi (generatorul nu se ceartă cu regulile de mână)", async () => {
  const { execFileSync } = await import("node:child_process");
  const o = execFileSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { encoding: "utf8" });
  assert.match(o, /la zi/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
