// Proba v100.121 (07.10, el: „aplicația crypto se vede aiurea pe telefon”) - măsurat la 390 px pe 8788:
// (1) Salt, Sugestii, Carnet aveau deasupra antetul vechi gol („Crypto · Analizează piața · WAIT · —”), un ecran întreg pe telefon;
// (2) tabelele `.rlTab` (Salt, Carnet) derulau doar pe #montecarlo ⇒ pe Salt pagina avea 527 px pe 390 (se mișca în lateral), pe Carnet coloana 4 tăiată;
// (3) `.sectionHead .small` nu se rupea ⇒ subtitlul paginii Salt ieșea din ecran.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.121 · Paginile noi pe telefon (antetul vechi, tabelele, subtitlul) · proba\n");

const css = citeste("public", "app.css"), app = citeste("public", "app.js");
// regulile CSS ca perechi {selectori, corp, media}: media = condiția @media din jur ('' în afara ei)
function reguli(text) {
  const out = []; let media = "", adanc = 0, i = 0, start = 0;
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  while (i < text.length) {
    const c = text[i];
    if (c === "{") {
      const sel = text.slice(start, i).trim();
      if (sel.startsWith("@media")) { media = sel; adanc = 1; start = i + 1; }
      else if (sel.startsWith("@")) { let a = 0, j = i; for (; j < text.length; j++) { if (text[j] === "{") a++; else if (text[j] === "}" && --a === 0) break; } i = j; start = j + 1; }   // @keyframes: sărit întreg
      else { const j = text.indexOf("}", i); out.push({ sel: sel.split(",").map((s) => s.trim()), corp: text.slice(i + 1, j), media }); i = j; start = j + 1; }
    } else if (c === "}") { if (adanc) { adanc = 0; media = ""; } start = i + 1; }
    i++;
  }
  return out;
}
const R = reguli(css);
const are = (selector, prop, val, laTelefon) => R.some((r) => r.sel.includes(selector) && new RegExp("(^|;)\\s*" + prop + "\\s*:\\s*" + val + "\\s*(!important)?\\s*(;|$)").test(r.corp)
  && (laTelefon ? (r.media === "" || /max-width:\s*(\d+)px/.test(r.media) && +r.media.match(/max-width:\s*(\d+)px/)[1] >= 390) : r.media === ""));

// show() REAL din app.js, cu un document de probă
function showReal() {
  const i = app.indexOf("function show(id){"); assert.ok(i > 0, "show() lipsește din app.js");
  let ad = 0, j = app.indexOf("{", i);
  for (; j < app.length; j++) { if (app[j] === "{") ad++; else if (app[j] === "}" && --ad === 0) break; }
  const clase = new Set();
  const doc = { body: { classList: { toggle: (c, on) => (on ? clase.add(c) : clase.delete(c)) } }, querySelector: () => null, querySelectorAll: () => [] };
  const ctx = { document: doc, $: () => ({ classList: { add() {}, remove() {} } }), opresteTabloBot() {} };
  vm.runInNewContext(app.slice(i, j + 1) + ";this.show=show;", ctx);
  return (id) => { ctx.show(id); return clase; };
}

await test("(1) Salt, Sugestii, Carnet ascund antetul vechi (toolbar, heroStrip, tabs), ca Grid și T212; laboratorul vechi îl păstrează", () => {
  const show = showReal();
  const ascunde = (id) => { const cl = [...show(id)]; return ["toolbar", "heroStrip", "tabs"].every((p) => cl.some((c) => are("body." + c + " ." + p, "display", "none", false))); };
  for (const id of ["salt", "sugestii", "carnet", "gridset", "t212"]) assert.ok(ascunde(id), id + ": antetul vechi rămâne vizibil");
  for (const id of ["engine", "mtf", "signals"]) assert.ok(!ascunde(id), id + ": pagina veche are nevoie de bara de alegere a monedei");
});

await test("(2) tabelele `.rlTab` derulează în ele pe orice pagină, nu doar pe #montecarlo (Salt 527 px pe 390, Carnet tăiat)", () => {
  assert.ok(are(".rlTab", "overflow-x", "auto", false), "lipsește `.rlTab{overflow-x:auto}` general");
  assert.ok(/class="rlTab"><table class="cnTab saltTab"/.test(citeste("public", "lib", "salt-ecran.js")), "tabelul Salt în .rlTab");
  assert.ok(/class="rlTab"><table class="cnTab"/.test(citeste("public", "lib", "carnet-ecran.js")), "tabelul Carnet în .rlTab");
});

await test("(3) pe telefon subtitlul paginii (`.sectionHead .small`) se rupe pe rânduri, iar capul se împachetează", () => {
  assert.ok(are(".sectionHead .small", "white-space", "normal", true), "`.sectionHead .small` rămâne nowrap la 390 px");
  assert.ok(are(".sectionHead", "flex-wrap", "wrap", true), "`.sectionHead` fără flex-wrap la 390 px");
  assert.ok(are(".sectionHead .small", "white-space", "nowrap", false), "pe PC rămâne cum era (un rând)");
});

await test("(E) versiunea de la v100.121 în sus (colectorul neatins, v101.82)", () => {
  const html = citeste("public", "index.html"); assert.match(html, /content="v100\.1(2[1-9]|[3-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(2[1-9]|[3-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(2[1-9]|[3-9]\d)</);   // v100.122: lărgit
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(2[1-9]|[3-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(2[1-9]|[3-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(2[1-9]|[3-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(2[1-9]|[3-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.82";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
