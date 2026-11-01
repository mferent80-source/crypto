// Proba v100.287 (01.11, el: „vezi așezarea în pagina comportament că e aiurea”): pagina „Comportament” se așază pe orice lățime, nu doar la
// 1440 / 390 (pozele demo-ului). Măsurat în Chrome pe 8788 (scratchpad asezare287.mjs): la 768 / 1024 „Porniți” rămânea singur pe rând,
// „Seara” (goală) se întindea cât „Azi”, iar de la 1440 în sus pagina se oprea la 1180 px lângă banda de sus întinsă pe tot ecranul.
// Aici: regulile de așezare din app.css (poza o face asezare287.mjs pe serverul probat; proba de telefon de la livrare, 390 px).
//   node scripts/proba-v100287.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.287 · AȘEZAREA PAGINII „COMPORTAMENT” · proba\n");
const C = citeste("public", "app.css");
const bloc = C.slice(C.indexOf("/* v100.286: pagina Comportament"), C.indexOf("/* v100.272 (ideile auditului 29.10): paleta"));
const regula = (sel) => { const m = new RegExp("(^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\{([^}]*)\\}").exec(bloc); return m ? m[2] : null; };
const media = (prag) => { const i = bloc.indexOf("@media (min-width:" + prag + "px){"); if (i < 0) return null; let d = 0, j = bloc.indexOf("{", i); for (let k = j; k < bloc.length; k++) { if (bloc[k] === "{") d++; else if (bloc[k] === "}" && --d === 0) return bloc.slice(j + 1, k); } return null; };

await test("pagina umple lățimea lui <main>, ca celelalte pagini (nu se mai oprește la 1180 px lângă banda de sus)", () => {
  assert.ok(bloc.length > 1000, "blocul CSS al paginii");
  const p = regula("#comportament .coPag"); assert.ok(p, "#comportament .coPag");
  assert.doesNotMatch(p, /max-width:\d/); assert.match(p, /max-width:none/);
});
await test("rândul de sus: unul sub altul pe telefon; Azi | Seara și Porniți pe tot rândul pe ecran mediu; trei pe rând de la 1320 px; fiecare card cât conținutul lui", () => {
  const r = regula("#comportament .coRand3"); assert.ok(r);
  assert.match(r, /grid-template-columns:minmax\(0,1fr\)/); assert.match(r, /align-items:start/); assert.doesNotMatch(r, /auto-fit/);
  const m760 = media(760), m1320 = media(1320); assert.ok(m760 && m1320, "pragurile 760 și 1320");
  assert.match(m760, /#comportament \.coRand3\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(m760, /#comportament \.coRand3>:nth-child\(3\)\{grid-column:1\/-1\}/);
  assert.match(m1320, /#comportament \.coRand3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(m1320, /#comportament \.coRand3>:nth-child\(3\)\{grid-column:auto\}/);
  assert.match(regula("#comportament .coRand2"), /align-items:start/);
});
await test("pe ecran foarte lat (de la 1600 px) evaluarea pe două coloane: sfatul și corecțiile pe tot rândul, disciplina | ce faci bine / greșești; corecțiile câte două", () => {
  const m = media(1600); assert.ok(m, "pragul 1600");
  assert.match(m, /#comportament \.coEval\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(m, /#comportament \.coEval>\.coBlocCap,#comportament \.coEval>\.coSfat,#comportament \.coEval>\.coCorectii\{grid-column:1\/-1\}/);
  assert.match(m, /#comportament \.coCorectii\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(m, /#comportament \.coCorectii>h4\{grid-column:1\/-1\}/);
  // ordinea copiilor pe care se bazează așezarea (pagina o scrie așa)
  const E = citeste("public", "lib", "comportament-ecran.js");
  const i = [E.indexOf("coBlocCap\"><h3 id=\"co-h-eval\""), E.indexOf("class=\"coSfat\""), E.indexOf("class=\"coDisc\""), E.indexOf("class=\"coDoua\""), E.indexOf("class=\"coCorectii\"")];
  assert.ok(i.every((x, k) => x > 0 && (k === 0 || x > i[k - 1])), "ordinea în coEvalHtml: " + i.join(","));
});
await test("versiunile: v100.287 în aplicație, colectorul neatins (v101.158); proba în lanț; v100286 de la v100.286 în sus", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.287"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.287"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.287</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-287/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.158"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.287.0", "versiunea din package.json (syntax-v71 o leagă de cache-ul sw.js)"); assert.equal(p.scripts["test:v100287"], "node scripts/proba-v100287.mjs"); assert.match(p.scripts.test, /npm run test:v100286 && npm run test:v100287/);
  assert.doesNotMatch(citeste("scripts", "proba-v100286.mjs"), /VERSIUNE = "v100\\\.286"\/\)/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
