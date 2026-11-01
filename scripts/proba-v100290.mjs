// Proba v100.290 (01.11, el, după „gata? ⇒ da”: „fă tot” - ce rămăsese din răspunsul meu, înainte de reproiectarea paginii Trading 212):
// (1) tabelele din Cont / Tablou (.accountRow) și rândul de indicatori de pe Tablou („Până la lichidare”) - celulele cât conținutul, ca în
//     restul paginilor (le lăsasem cât rândul);
// (2) stările de după o apăsare, măsurate (scratchpad asezare-toate.mjs --deschide: toate pliurile, rândurile pliate ale Paznicului,
//     „arată toate”, Simulatorul rulat; 54 de pagini + cele 17 cu datele lui redate, 7 lățimi): o singură problemă, și ea pe TOATE
//     paginile lungi de pe PC - `.mainArea{width:calc(100vw - var(--sidebar))}`: 100vw ține și bara de derulare ⇒ `main` se termina la 1024
//     din 1009 px utili (1920 din 1905), marginea din dreapta stătea sub bara de derulare; pe Scanner, cu tot deschis, pastila botului din
//     antet ieșea și ea. Unealta mea compara cu fereastra, nu cu lățimea utilă ⇒ n-o văzuse; acum compară cu lățimea utilă.
//   node scripts/proba-v100290.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.290 · FĂ TOT (AȘEZAREA) · proba\n");

const CSS = citeste("public", "app.css");
const bloc = () => { const i = CSS.indexOf("/* v100.290"), j0 = CSS.indexOf("/* v100.291"), j = j0 > i ? j0 : CSS.indexOf("/* v100.272 (ideile auditului 29.10): paleta"); assert.ok(i > 0 && i < j, "blocul v100.290 înaintea paletei"); return CSS.slice(i, j); };

await test("tabelele din Cont / Tablou și rândul de indicatori de pe Tablou: celulele cât conținutul", () => {
  assert.match(bloc(), /\.accountRow,#tabloubot \.tbKpi\{align-items:start\}/);
});
await test("pe PC `main` se termină la marginea lățimii UTILE (fără bara de derulare): .mainArea nu mai e 100vw, ci cât coloana ei din grilă; regula veche rămâne, cea nouă vine după ea", () => {
  const b = bloc();
  assert.match(b, /@media\(min-width:981px\)\{\.mainArea\{width:auto\}\}/);
  const vechi = CSS.indexOf(".mainArea{width:calc(100vw - var(--sidebar));"), nou = CSS.indexOf("@media(min-width:981px){.mainArea{width:auto}}");
  assert.ok(vechi > 0 && nou > vechi, "regula nouă după cea veche (aceeași specificitate ⇒ câștigă ultima)");
  // grila care o așază: a doua coloană e minmax(0,1fr), deci `auto` = cât rămâne din lățimea utilă după bara laterală
  assert.match(CSS, /\.appShell\{display:grid;grid-template-columns:var\(--sidebar\) minmax\(0,1fr\);min-height:100vh\}/);
});
await test("Scannerul vechi deschis: butonul „Scanează” nu mai iese din caseta lui (stilul scris pe el, width:100%, bătea regula calc(100% - 20px) ⇒ 10 px afară, pagina cu 5–9 px peste ecran la toate lățimile)", () => {
  assert.match(citeste("public", "index.html"), /<button data-action-click="scan\(\)" id="scanActionBtn" style="margin-top:7px">/);
  assert.match(CSS, /#scan details\.scVechi>\.card,#scan details\.scVechi>button\{margin:0 10px 10px;width:calc\(100% - 20px\)\}/);
});
await test("versiunile: v100.290 în aplicație, colectorul neatins (v101.158); proba în lanț; v100289 de la v100.289 în sus", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]); assert.ok(app >= 290, "v100.290 sau mai nouă");
  assert.ok(Number(citeste("BUILD_INFO.json").match(/"version": "v100\.(\d+)"/)[1]) >= 290);
  assert.ok(Number(citeste("public", "index.html").match(/id="healthAppVersion">v100\.(\d+)</)[1]) >= 290);
  assert.ok(Number(citeste("public", "sw.js").match(/crypto-radar-v100-(\d+)/)[1]) >= 290);
  const mc = citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/); assert.ok(mc && Number(mc[1]) >= 158, "colectorul de la v101.158 în sus (v100.292 l-a dus la v101.159)");
  const p = JSON.parse(citeste("package.json")); assert.ok(Number(p.version.split(".")[1]) >= 290, "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100290"], "node scripts/proba-v100290.mjs"); assert.match(p.scripts.test, /npm run test:v100289 && npm run test:v100290( |")/);
  assert.doesNotMatch(citeste("scripts", "proba-v100289.mjs"), /VERSIUNE = "v100\\\.289"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
