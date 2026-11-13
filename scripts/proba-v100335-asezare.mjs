// Proba v100.335 · așezarea „Detaliilor indicatorilor” (el, 13.11: „ia skill-ul de design, așază indicatorul mai bine că rămâne un mare gol”, apoi
// „fă demo” ⇒ „perfect”). Pe Tabloul botului, ≥ 1181 px, pliul DESCHIS creștea doar în coloana dreaptă (tabelul + „Listele Radarului”) și sub
// TradingView rămânea un gol de ~900 px. Acum pliul deschis ia toată lățimea cardului, înăuntru două coloane (tabelul stânga, listele dreapta),
// cartelele 15m…1z 2×2 lângă riglă; sub 1300 px de coloană graficul listelor stă sub rânduri. Pliul ÎNCHIS și telefonul rămân ca înainte.
//   node scripts/proba-v100335-asezare.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.335 · așezarea detaliilor indicatorilor · proba\n");

// blocurile @media / @container cu interiorul lor (potrivirea acoladelor), ca să știu sub ce condiție stă o regulă
function blocuri(prefix) {
  const o = []; let i = 0;
  while ((i = css.indexOf(prefix, i)) >= 0) {
    const st = css.indexOf("{", i); let d = 0, j = st;
    for (; j < css.length; j++) { if (css[j] === "{") d++; else if (css[j] === "}") { d--; if (!d) break; } }
    o.push({ cap: css.slice(i, st), corp: css.slice(st + 1, j), la: i }); i = j;
  }
  return o;
}
const fara = (s) => s.replace(/\s+/g, "");
const K = "html.pzDemo#tabloubot.on:not(.tbFaraBot).tbCadru:has(>#tbKpiDetalii:not([hidden]))#tbTrendCard";
const lat = blocuri("@media (min-width:1181px)").map((b) => ({ ...b, f: fara(b.corp) }));
const regula = (sel) => { for (const b of lat) { const i = b.f.indexOf(fara(sel) + "{"); if (i >= 0) return b.f.slice(i + fara(sel).length + 1, b.f.indexOf("}", i)); } return null; };

await test("1 · pliul DESCHIS ia toată lățimea cardului, pe rândul lui (sub TradingView și „Mediul botului”), doar ≥ 1181 px", () => {
  const r = regula(K + ">#tbTrendDet[open]");
  assert.ok(r, "lipsește regula pentru #tbTrendDet[open] în blocul ≥ 1181 px");
  assert.match(r, /grid-column:1\/-1/); assert.match(r, /grid-row:8/);
});
await test("2 · înăuntru două coloane: tabelul + predicția + nota în stânga, „Listele Radarului” în dreapta, pe toată înălțimea lor", () => {
  const g = regula(K + ">#tbTrendDet[open]#tbIndicatori");
  assert.ok(g && /display:grid/.test(g) && /grid-template-columns:minmax\(0,[\d.]+fr\)minmax\(0,[\d.]+fr\)/.test(g), "grila în două coloane");
  const st = regula(K + ">#tbTrendDet[open]#tbIndicatori>*"); assert.ok(st && /grid-column:1/.test(st), "copiii în stânga");
  const ls = regula(K + ">#tbTrendDet[open]#tbIndicatori>.tbListe"); assert.ok(ls && /grid-column:2/.test(ls) && /grid-row:1\/span4/.test(ls), "listele în dreapta, pe toate rândurile"); assert.match(g, /grid-template-rows:autoautoauto1fr/, "rândul elastic de la capăt");
});
await test("3 · rândul de sus fără gol: cartelele 15m…1z 2×2 lângă rigla scorului și scorul pe 4h", () => {
  const s = regula(K + ">#tbTrendDet[open].tbIndSumar:not([hidden])"); assert.ok(s && /display:grid/.test(s), "rândul cartelelor în grilă");
  const b = regula(K + ">#tbTrendDet[open].tbIndSumar.ibBanda"); assert.ok(b && /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/.test(b) && /max-width:none/.test(b), "banda 2×2");
});
await test("4 · coloana îngustă (ex. ecranul de 1280): graficul listelor nu se înghesuie lângă rânduri - stă dedesubt la orice lățime, cartelele una lângă alta doar când au loc", () => {
  assert.match(css, /#tabloubot \.tbListe\{display:grid;grid-template-columns:minmax\(0,1fr\);/);
  assert.match(css, /@container \(min-width:560px\)\{#tabloubot \.lrGrafice\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /@container \(max-width:1300px\)/, "regula veche de stivuire rămasă fără rost");
});
await test("5 · pliul ÎNCHIS rămâne în coloana dreaptă (regula veche neatinsă), iar regula nouă e mai specifică ([open])", () => {
  const r = regula(K + ">#tbTrendDet"); assert.ok(r && /grid-column:2/.test(r) && /grid-row:7/.test(r), "regula pliului închis");
});
await test("6 · ordinea cozii: blocul nou după graficul listelor (v100.333) și înaintea blocului v100.224, care rămâne ultimul", () => {
  const nou = css.indexOf("/* v100.335 (el, 13.11: „ia skill-ul de design"), sf = css.indexOf("/* v100.333: sfârșitul graficului"), u = css.lastIndexOf("/* v100.224: pe paginile de zi");
  assert.ok(nou > 0, "lipsește blocul v100.335"); assert.ok(sf > 0 && nou > sf, "înaintea graficului listelor"); assert.ok(u > nou, "după blocul v100.224");
});

console.log(`\n${teste - picate}/${teste} verzi${picate ? " · " + picate + " PICĂ" : ""}\n`);
if (picate) process.exit(1);
