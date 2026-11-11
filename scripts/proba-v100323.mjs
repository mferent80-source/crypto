// Proba v100.323 (11.11.2026, el, după v100.322: „pune drumul botului deasupra graficului”):
//   pe calculator (≥ 1181 px) „Drumul botului” urcă din „sub grafic” în partea de sus: sub verdict, cele 4 cifre și avertismentul de levier,
//   pe coloanele lor (1 / 5; la 1181–1699: 1 / 4), deasupra capului graficului; „Contează acum” coboară în dreapta până la el (rândurile 2–5),
//   ca sus să nu rămână goluri și niciun rând să nu fie liber pe toată lățimea (altfel „dense” urcă acolo ce se nimerește).
//   Graficul (capul + desenul + „Ce e pe grafic”) coboară un rând. Sub 1181 px Drumul era deja deasupra graficului (ordinea 5) - neatins.
//   node scripts/proba-v100323.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.323 · Drumul botului deasupra graficului · proba\n");
const CSS = citeste("public", "app.css");
const i = CSS.indexOf("/* v100.322 · așezarea Tabloului"), j = CSS.indexOf("/* v100.322: sfârșitul așezării Tabloului */");
const B = CSS.slice(i, j);
const P = "html.pzDemo #tabloubot.on:not(.tbFaraBot) .tbCadru:has(>#tbKpiDetalii:not([hidden]))";
const media = (cap) => { const k = B.indexOf(cap); assert.ok(k >= 0, "lipsește " + cap); let a = 0, x = B.indexOf("{", k); for (; x < B.length; x++) { if (B[x] === "{") a++; else if (B[x] === "}" && --a === 0) break; } return B.slice(k, x + 1); };

await test("≥ 1181 px: Drumul botului stă sus, pe rândul 5, pe coloanele cifrelor (1 / 5), deasupra capului graficului — nu mai e sub grafic", () => {
  assert.ok(i > 0 && j > i, "blocul de așezare lipsește");
  assert.ok(B.includes(P + ">#pzDrumCard{grid-column:1 / 5!important;grid-row:5!important;order:0"), "Drumul pe rândul 5, coloanele 1 / 5");
  assert.doesNotMatch(B, /#pzDrumCard\{[^}]*order:21/, "nu mai e în ordinea de sub grafic");
});
await test("graficul coboară un rând: capul pe 6, desenul 7 / span 7, „Ce e pe grafic” 7–13, textul gol pe 7", () => {
  for (const r of [P + " #tbGraficCard>.tbBlocCap{grid-column:1 / 5;grid-row:6;", P + " #tbGrafic>.gbZona{grid-column:1 / 5;grid-row:7 / span 7;",
    P + " #tbGrafic>.emptyState{grid-column:1 / 5;grid-row:7}", P + " #tbGrafic>.gbValCap{grid-row:7;", P + " #tbGrafic>.gbValori{grid-row:8;",
    P + " #tbGrafic>.gbBilant{grid-row:9;", P + " #tbGrafic>.gbUlt{grid-row:10;", P + " #tbGrafic>.gbValGrid{grid-row:11;", P + " #tbGrafic>.gbLeg{grid-row:12;",
    P + " #tbGraficCard>#pzUltimii{grid-row:13;"])
    assert.ok(B.includes(r), "lipsește: " + r.slice(P.length));
});
await test("„Contează acum” coboară în dreapta până la Drum (rândurile 2–5), pe ambele intervale ⇒ niciun rând de sus liber pe toată lățimea", () => {
  assert.ok(B.includes(P + ">#ctAcum:not([hidden]){grid-column:5 / -1!important;grid-row:2 / span 4!important;"));
  const M = media("@media (min-width:1181px) and (max-width:1699px){");
  assert.ok(M.includes(P + ">#ctAcum:not([hidden]){grid-column:4 / -1!important;grid-row:2 / span 4!important}"), "1181–1699: Contează acum 2 / span 4");
  assert.ok(M.includes(P + ">#pzDrumCard{grid-column:1 / 4!important}"), "1181–1699: Drumul pe jumătatea din stânga, cu verdictul și cifrele");
  assert.ok(M.includes(P + ">#tbGridLarg{grid-column:1 / 4!important}"));
});
await test("sub grafic rămân, în ordine: detaliile cifrelor (20), Trendul (23), Ce ai de făcut (24), Ce spune piața (25), apoi Monte Carlo (34)", () => {
  assert.match(B, /#tbKpiDetalii:not\(\[hidden\]\)\{grid-column:1 \/ -1;grid-row:auto;order:20;/);
  assert.match(B, /#tbTrendCard\{grid-column:1 \/ -1!important;grid-row:auto!important;order:23;/);
  assert.match(B, /\.tbGrStanga>#tbTodo\{grid-column:1 \/ -1!important;grid-row:auto!important;order:24\}/);
  assert.match(B, /\.tbGrCol>#tbCitireCard\{grid-column:1 \/ -1!important;grid-row:auto!important;order:25;/);
  assert.doesNotMatch(B, /grid-row:1[4-9]/, "niciun rând fix sub grafic");
});
await test("sub 1181 px Drumul rămâne cum era (deasupra graficului, ordinea 5 din stratul v100.319)", () => {
  assert.match(CSS, /\.pzDemo #tabloubot \.tbCadru>#pzDrumCard\{order:5\}/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
