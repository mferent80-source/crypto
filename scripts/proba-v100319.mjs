// Proba v100.319 (11.11.2026, el: „ia și toate skilurile de design și compară pagina botului cu o pagină a unui soft profesional și îmbunătățește”).
// Măsurat pe pagina vie v100.318 (1440 și 412 px, rândurile deschise) față de ce face un tablou profesional (pagina de bot din Pionex / Binance,
// TradingView): textul folosea deja o scară scurtă (12 / 13,5 / 15 / 20 / 24 / 30 px - abaterile erau doar în desenul graficului) și cifre
// tabulare peste tot; NU erau:
//   (1) antetul: cinci comenzi în trei stiluri, înșirate (pe telefon rupte în dreapta, pe trei rânduri);
//   (2) cifrele de sus: patru coloane de ~185 px la 768–1440 ⇒ etichetele cheie-valoare rupte pe 2–3 rânduri (6 din 9), valorile nealiniate;
//   (3) culoarea: tot blocul cheie-valoare colorat după stare ⇒ „intervalul gridului 0.2900 – 0.3100” roșu, „funding 0,001% pe zi” verde (fapte neutre);
//   (4) sfaturile „☞ Hotărăște acum…” scrise integral în auriu - culoarea de stare folosită pe propoziții întregi;
//   (5) grosimi 400/500/600/700/750/800 (butoanele: 500 în antet, 750 în rânduri) și colțuri 2/3/4/5 px pe același fel de lucru;
//   (6) rânduri de text de 1.142 px pe ecranul de 1440 (≈180 de caractere la 12 px; un tablou profesional ține 70–80).
// Reparațiile sunt DOAR în foaia de stil (stratul desenului nou): nimic scos, niciun text schimbat, nicio comandă mutată din pagină.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");   /* fișierele sunt CRLF */
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html");
const SFARSIT = "/* v100.316: sfârșitul desenului nou */";
const bloc = () => { const i = CSS.indexOf("/* v100.319 (el, 11.11.2026"), j = CSS.indexOf(SFARSIT); assert.ok(i > 0, "lipsește blocul v100.319"); assert.ok(j > i, "blocul v100.319 trebuie să stea în stratul desenului nou, înaintea sfârșitului lui"); return CSS.slice(i, j); };
const reguli = (b) => b.replace(/\/\*[^]*?\*\//g, "");

console.log("Proba v100.319 - Tabloul botului față de un soft profesional");

await test("(1) antetul: „Deschide tot | Strânge tot” e un singur comutator (chenar comun, colțuri doar la capete); tema și modul sunt comenzi liniștite", () => {
  const b = reguli(bloc());
  assert.match(b, /html\.pzDemo #tabloubot #tbRandDeschide,html\.pzDemo #tabloubot #tbRandStrange\{border:1px solid var\(--pzLi2\);background:var\(--pzF1\);color:var\(--pzT0\)/);
  assert.match(b, /html\.pzDemo #tabloubot #tbRandDeschide\{border-radius:4px 0 0 4px;margin-right:-8px\}/);
  assert.match(b, /html\.pzDemo #tabloubot #tbRandStrange\{border-radius:0 4px 4px 0;/);
  assert.match(b, /html\.pzDemo #tabloubot #tbTemaBtn,html\.pzDemo #tabloubot #tbSchimbaModulBtn\{border-color:transparent;background:none;color:var\(--pzT1\)\}/);
  // pe telefon: două coloane egale, aliniate la stânga (nu rupte în dreapta); comutatorul rămâne lipit
  assert.match(b, /@media \(max-width:640px\)\{\nhtml\.pzDemo #tabloubot \.tbAntet \.tbActiuni\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);column-gap:0;row-gap:4px;width:100%\}/);
});

await test("(2) cifrele de sus: între 641 și 1699 px pe două coloane (≈370 px în loc de ≈185), ca etichetele să încapă pe un rând; peste 1700 rămân patru", () => {
  const b = reguli(bloc());
  assert.match(b, /@media \(min-width:641px\) and \(max-width:1699px\)\{\nhtml\.pzDemo #tabloubot\.on \.tbCadru>\.tbSus>#tbKpi\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important;row-gap:16px\}\nhtml\.pzDemo #tabloubot #tbKpi>\.tbKpiCel:nth-child\(3\)\{border-left:0;padding-left:0\}\n\}/);
  // regula de bază (4 coloane) e tot acolo, mai sus: peste 1700 px se aplică ea
  assert.ok(CSS.includes("html.pzDemo #tabloubot.on .tbCadru>.tbSus>#tbKpi{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0}"));
});

await test("(3) culoarea în blocurile cheie-valoare ale cifrelor: doar primul rând (semnul / starea) e colorat; restul faptelor în cerneală", () => {
  const b = reguli(bloc());
  assert.ok(b.includes("html.pzDemo #tabloubot #tbKpi .pzKvBloc.good .pzKv b,html.pzDemo #tabloubot #tbKpi .pzKvBloc.bad .pzKv b,html.pzDemo #tabloubot #tbKpi .pzKvBloc.tbWarn .pzKv b{color:var(--pzT0)}"));
  assert.ok(b.includes("html.pzDemo #tabloubot #tbKpi .pzKvBloc.good .pzKv:first-child b{color:var(--pzSus)}"));
  assert.ok(b.includes("html.pzDemo #tabloubot #tbKpi .pzKvBloc.bad .pzKv:first-child b{color:var(--pzJos)}"));
  assert.ok(b.includes("html.pzDemo #tabloubot #tbKpi .pzKvBloc.tbWarn .pzKv:first-child b{color:var(--pzAur)}"));
});

await test("(4) sfatul „☞” din Contează acum: text în cerneală, semnalul de atenție rămâne ca bară aurie în stânga", () => {
  assert.ok(reguli(bloc()).includes("html.pzDemo #tabloubot #ctAcum .ctTxt>.ctFac{color:var(--pzT0);border-left:2px solid var(--pzAur);padding-left:8px}"));
});

await test("(5) o grosime pentru butoane (600) și un colț (4 px) pentru cartele, butoane și etichete; bulinele rotunde rămân rotunde", () => {
  const b = reguli(bloc());
  assert.ok(b.includes("html.pzDemo #tabloubot.on :is(button.actionGhost,button.t212BtnLinie,button.tbMcBtn,button.tbIntBtn,.stockBadge){font-weight:600}"));
  assert.ok(b.includes("html.pzDemo #tabloubot.on .tbMcScorCifre{font-weight:700}"));
  const raze = /html\.pzDemo #tabloubot\.on :is\(([^)]*)\)\{border-radius:4px\}/.exec(b);
  assert.ok(raze, "lipsește regula colțurilor");
  for (const c of [".actionGhost", ".t212BtnLinie", ".stockBadge", ".ctNr", ".tbInterval", ".pzVoce", ".pzChip", ".tbNr", ".tbTag", ".tbPill", ".tbConsEt", ".tbConsCip", ".tbCitR", ".tbCitScurt", ".tbCitVoci", ".tbFaraPlan", ".tbConsFac", ".ctSus"]) assert.ok(raze[1].split(",").includes(c), "lipsește " + c);
  assert.ok(!/50%|999px/.test(raze[1]));
  // DOAR clase în :is(): un id acolo dă regulii greutate de id și ar bate colțurile de capăt ale comutatorului (#tbRandDeschide / #tbRandStrange)
  assert.ok(!/#/.test(raze[1]), "id în lista generală de colțuri");
  assert.ok(b.includes("html.pzDemo #tabloubot.on .tbCadru>:is(#ctAcum,#pzVerdict){border-radius:4px}"));
});

await test("(6) rândurile de text: cel mult 80 de caractere pe rând (paragrafe, liste, textele citirii și ale Monte Carlo)", () => {
  assert.ok(reguli(bloc()).includes("html.pzDemo #tabloubot.on :is(p,li,.tbCitTx,.tbMcScurt,.tbMcNota,.tbMcScorTx){max-width:80ch}"));
});

await test("nimic scos: blocul nu ascunde, nu reordonează și nu schimbă texte; marcajul antetului e neatins; colțurile ≤ 5 px", () => {
  const b = reguli(bloc());
  assert.ok(!/display:none|visibility:hidden|(^|[;{\s])(content|order):|opacity:0/.test(b), "blocul v100.319 ascunde sau mută ceva");   /* „order:” cu graniță: altfel prinde „border:” */
  assert.ok(/(^|[;{\s])order:/.test("x{order:2}") && !/(^|[;{\s])order:/.test("x{border:1px}"), "garda de ordine însăși");
  for (const m of b.matchAll(/border-radius:([^;}]*)/g)) for (const v of m[1].split(/\s+/)) assert.ok(parseFloat(v) <= 5 || v === "0", "colț peste 5 px: " + m[1]);
  assert.ok(HTML.includes('<div class="tbActiuni"><select id="tbBotAles" class="actionGhost" hidden="" data-action-change="tbAlegeBot(this.value)" title="Care bot se judecă"></select><button type="button" class="actionGhost" id="tbRandDeschide" data-action-click="tbRandToate(true)" title="Deschide toate rândurile și pliurile paginii">Deschide tot</button><button type="button" class="actionGhost" id="tbRandStrange" data-action-click="tbRandToate(false)" title="Strânge toate rândurile și pliurile paginii">Strânge tot</button><button type="button" class="actionGhost" id="tbTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta()">Temă închisă</button><button class="actionGhost" id="tbSchimbaModulBtn" data-action-click="tbSchimbaModul()">Schimbă modul</button></div>'));
});

await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json; regula pândei tot la coadă", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:19|[2-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.318/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.pro319); assert.match(P.version, new RegExp("^100\\." + V + "\\."));
  assert.ok(P.scripts.test.includes("npm run test:v100318 && npm run test:v100319"));
  assert.equal(P.scripts["test:v100319"], "node scripts/proba-v100319.mjs");
  assert.equal(pandaInainteaCozii(CSS), "");
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
