// Proba v100.237 (21.10, el: „e ok continua”): ordinea fișei după calcul.
// Nimic nu cade. Calculul, pragurile și textele rămân.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.237 · ORDINE · proba\n");

const app = citeste("public", "app.js");
const idx = citeste("public", "index.html");
const css = citeste("public", "app.css");
const r = app.slice(app.indexOf("function renderGrid("), app.indexOf("function tbPanouVizibil("));

await test("în fișă, după calcul: Direcția, trendul, verdictul, modelele, ferestrele, Busola, poarta, istoricul, setările", () => {
  const m = [
    "<h4>Direcția</h4>",
    "grTrendTfHtml(f)",
    'class="grVerdict ',
    'id="grRezumat"',
    'id="grPlanVar"',
    "grPlanVarHtml(",
    "Busola.htmlRand",
    "grPoartaHtml(f)",
    "grBiletTu(f)",
    'id="grAlte"',
    "grBusolaFisaHtml(f,i)",
    "grTvAvertHtml(",
    "grIngustHtml(f)",
    'id="grProb"',
    "Ce înseamnă în bani",
    "Când îl închizi",
  ];
  let p = -1;
  for (const s of m) {
    const i = r.indexOf(s);
    assert.ok(i > p, "lipsește sau e prea devreme: " + s + " la " + i);
    p = i;
  }
  const intre = r.slice(r.indexOf("grTrendTfHtml(f)"), r.indexOf('class="grVerdict '));
  assert.match(intre, /h\+='<\/div>'/);
  assert.doesNotMatch(intre, /grAlte/);
  assert.ok(!r.includes("'</div><details class=\"grAlte\""));
  assert.ok(r.indexOf("grStare.eroare") < r.indexOf("<h4>Direcția</h4>"));
  assert.ok(r.includes("grFerestreTine(f,vG,dirG)"));
  assert.ok(r.includes("Busola.incarca("));
});

await test("pagina: formularul, fișa, hârtia, jurnalul, apoi clasamentul și laboratorul", () => {
  const g = idx.slice(idx.indexOf('id="gridset"'), idx.indexOf('id="dash"'));
  const formular = g.indexOf('class="tbBloc grIntrari"');
  assert.ok(formular >= 0 && formular < g.indexOf('id="grFisa"'), "formularul stă deasupra fișei");
  const ids = ["grFisa", "grHartieCard", "grJurnalCard", "grClasamentCard", "grLaboratorCard"];
  let p = formular;
  for (const id of ids) {
    const i = g.indexOf('id="' + id + '"');
    assert.ok(i > p, id);
    p = i;
  }
});

await test("CSS-ul pzDemo arată aceeași ordine; șirurile vechi 65 și 61 rămân", () => {
  assert.match(css, /\.pzDemo #grFisa>\*\{order:65\}/);
  assert.ok(css.includes(".pzDemo #grFisa>#grAlte+p{order:61}"));
  const ord = [
    ".pzDemo #grFisa>.tbRand:has(.grDir){order:10}",
    ".pzDemo #grFisa>.grVerdict{order:20}",
    ".pzDemo #grFisa>.grListaJos{order:21}",
    ".pzDemo #grFisa>#grRezumat{order:22}",
    ".pzDemo #grFisa>#grPlanVar{order:30}",
    ".pzDemo #grFisa>.grBusola{order:40}",
    ".pzDemo #grFisa>.grPoarta{order:50}",
    ".pzDemo #grFisa>.grBilet{order:55}",
    ".pzDemo #grFisa>#grAlte{order:60}",
    ".pzDemo #grFisa>.grTvAvert{order:71}",
    ".pzDemo #grFisa>.grIngustBloc{order:72}",
    ".pzDemo #grFisa>#grProb{order:80}",
    ".pzDemo #grFisa>.tbRand:has(.grTabel){order:85}",
    ".pzDemo #grFisa>.grInchide{order:90}",
    ".pzDemo #gridset.on:has(#grFisa>.emptyState)>#grClasamentCard{order:15}",
    ".pzDemo #gridset.on>#grHartieCard{order:80}",
    ".pzDemo #gridset.on>#grJurnalCard{order:85}",
    ".pzDemo #gridset.on>#grClasamentCard{order:90}",
    ".pzDemo #gridset.on>#grLaboratorCard{order:95}",
  ];
  for (const s of ord) assert.ok(css.includes(s), s);
  assert.ok(!css.includes(".pzDemo #grFisa>.grVerdict{order:0}"));
  assert.ok(css.includes(".pzDemo #gsPagina:has(.gsVerdict)>.gsSec:has(.gsVerdict){order:10}"));
});

await test("blocurile rămân: Busola pe 4h, setările, poarta, îngustă, banii, istoricul, trendul", () => {
  assert.match(app, /Setările de pus în Pionex/);
  assert.match(app, /Poarta de pornire/);
  assert.match(app, /Varianta îngustă/);
  assert.match(app, /Cât investesc\?/);
  assert.match(app, /Trendul pe intervale/);
  assert.match(app, /Ce aș alege eu acum/);
  assert.match(app, /Folosește ÎNGUST sau LARG de mai sus/);
  assert.match(app, /class="tbBloc grIngustBloc"/);
  assert.match(app, /class="tbBloc grInchide"/);
  assert.match(citeste("public", "lib", "t212-ecran.js"), /Ce spune istoricul tău/);
  assert.match(citeste("public", "lib", "busola.js"), /class="tbBloc grBusola"/);
  assert.match(citeste("public", "lib", "busola.js"), /grBusolaMasurat/);
});

await test("pe telefon Direcția stă deschisă; ÎNGUST, LARG, poarta, trendul și setările la fel; restul se pliază", () => {
  const pl = (app.match(/function grPliabil\(t\)\{.*?\}(?=\s)/) || [""])[0];
  assert.ok(pl.includes("Direcția"));
  const f = new Function(pl + "; return grPliabil;")();
  assert.equal(f("Direcția"), false);
  assert.equal(f("Trendul pe intervale"), false);
  assert.equal(f("Poarta de pornire"), false);
  assert.equal(f("🚦 Poarta de pornire"), false);
  assert.equal(f("Setările de pus în Pionex"), false);
  assert.equal(f("ÎNGUST"), false);
  assert.equal(f("LARG"), false);
  assert.equal(f("Varianta îngustă"), true);
  assert.equal(f("Când îl închizi"), true);
  assert.equal(f("Ce înseamnă în bani"), true);
  assert.equal(f("Proba pe ultimele 31 de zile"), true);
});

await test("versiunea v100.237, insigna ORDINE, colectorul rămâne v101.134", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.237.0");
  assert.equal(P.scripts["test:v100237"], "node scripts/proba-v100237.mjs");
  assert.equal((P.scripts.test.match(/test:v100237/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100236/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100237"], /npm run test:v100237/);
  assert.equal((idx.match(/v100\.237/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.237 · ORDINE</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-237/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.237"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.237");
  assert.equal(info.badge, "v100.237 · ORDINE");
  assert.equal(info.engineContract, "54.1");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.134"/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
