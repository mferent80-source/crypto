// Proba v100.232 (21.10, el: „fa tot”): citirea picată se spune, cardul spune plafonul de 3 ore,
// un cuvânt mai lat decât coloana nu se taie sub 550 px, lansatorul la logare e în repo.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
const MC = ctx.Macro;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.232 · SPUS · proba\n");

const t212 = citeste("public", "lib", "t212-ecran.js");
const css = citeste("public", "app.css");
const idx = citeste("public", "index.html");
const col = citeste("scripts", "colector.mjs");
const tp = citeste("scripts", "lib", "tura-piata.mjs");
const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));
const lei = t212.slice(t212.indexOf("function t212CatText"), t212.indexOf("function t212RaportCont"));
const FRAZA_COPIE = "Citirea din KV a picat: pe poartă e copia de pe Piața azi, nu o citire nouă.";
const FRAZA_PICAT = "Citirea din KV a picat.";

const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
const r = MC.scor({ vix: zil(() => 14.8), tnx: zil((i) => (i < N - 22 ? 4.94 : 4.94 + 0.3)), dxy: zil((i) => (i < N - 1 ? 100 : 103.1)), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i * 2), fg: { valoare: 69 } }, T0 + N * ZI);

await test("cererea fără cod se spune; copia paginii rămâne rezervă, nu citire nouă", () => {
  assert.match(poarta, /try \{ pc = await getJSON\("\/api\/istoric-bot\?action=piata"\); \} catch \(e\) \{\}/);
  assert.match(poarta, /var dinKv = !!\(pc && pc\.macro && pc\.macro\.cod\);/);
  assert.match(poarta, /if \(!\(pc && pc\.macro && pc\.macro\.cod\) && paginaProaspata && ac && ac\.piataCol && ac\.piataCol\.macro\) pc = ac\.piataCol;/);
  assert.ok(poarta.indexOf("await getJSON(\"/api/istoric-bot?action=piata\")") < poarta.indexOf("pc = ac.piataCol"));
  assert.match(poarta, /citirePicata: !dinKv, rezerva: !!dinPagina/);
  assert.match(poarta, /if \(cod\) \{ macro = cod; la = Date\.now\(\); viu = true; dinPagina = false; \}/);
  assert.match(t212, /function t212FrazaCitire\(\)/);
  assert.match(t212, new RegExp(FRAZA_COPIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(t212, /return r\.rezerva \? "Citirea din KV a picat: pe poartă e copia de pe Piața azi, nu o citire nouă\." : "Citirea din KV a picat\."/);
  assert.match(t212, /var fzCit = t212FrazaCitire\(\); if \(fzCit\) v\.note\.push\(fzCit\)/);
  assert.match(t212, /var fzCit = t212FrazaCitire\(\); if \(fzCit\) h \+= '<p class="tbWarn">/);
  assert.doesNotMatch(lei, /Citirea din KV|de acum \d|vârst/);
  assert.doesNotMatch(t212.slice(t212.indexOf("function t212NotaRec"), t212.indexOf("function t212TextFaraSuma")), /Citirea din KV/);
  assert.doesNotMatch(poarta, /action=piata", \{ method: "POST"/);
});

await test("cardul spune plafonul de 3 ore o dată; fraza de Discord nu îl înghite", () => {
  const h = MC.htmlCard(r);
  assert.match(h, /Între două alerte de regim trec cel puțin 3 ore\./);
  assert.equal((h.match(/3 ore/g) || []).length, 1);
  assert.match(h, /nu semnal de intrare/);
  const disc = h.slice(h.indexOf("Pe Discord"), h.indexOf("Între două alerte"));
  assert.equal(disc.includes("3 ore"), false);
  assert.doesNotMatch(MC.htmlCard(null), /3 ore/);
  assert.match(tp, /acum - \(st\.macroAlertaLa \|\| 0\) < 3 \* 3600000/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.132"/);
  assert.doesNotMatch(col.slice(col.indexOf("VERSIUNE_COLECTOR"), col.indexOf("VERSIUNE_COLECTOR") + 40), /v101\.133/);
});

await test("sub 550 px un cuvânt mai lat decât coloana nu se taie; verbul de pe Tablou rămâne pe un rând", () => {
  assert.match(css, /@media \(max-width:550px\)\{\.pzVerb\{white-space:normal;overflow-wrap:normal;word-break:keep-all\}\}/);
  assert.match(css, /@media \(max-width:550px\)\{\.pzAntet \.pzVerb\{max-width:none;overflow:visible;overflow-wrap:normal;word-break:keep-all\}\}/);
  assert.match(css, /\.pzAntet \.pzVerb\{white-space:normal;overflow-wrap:break-word;max-width:62%\}/);
  assert.match(css, /#pzVerdict \.pzVerb\{order:1;white-space:nowrap;flex:0 0 auto\}/);
  assert.doesNotMatch(css, /#pzVerdict \.pzVerb\{white-space:normal/);
  const ultim = css.trim().split("\n").pop();
  assert.match(ultim, /#topLive\{display:none!important\}/);
});

await test("lansatorul la logare e în repo și nu ține o parolă", () => {
  const ps = citeste("scripts", "porneste-radar-la-logare.ps1");
  assert.match(ps, /PORNESTE-CRYPTO-RADAR\.bat/);
  assert.match(ps, /colector\.mjs/);
  assert.doesNotMatch(ps, /APP_API_TOKEN|password|parola\s*=/i);
});

await test("versiunea de la v100.232 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 232);
  assert.equal(P.scripts["test:v100232"], "node scripts/proba-v100232.mjs");
  assert.equal((P.scripts.test.match(/test:v100232/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100231/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100232"], /npm run test:v100232/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(idx, new RegExp('id="sideVersiune"[^>]*>v100\\.' + minor + " · "));
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + minor + '"'));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
  assert.match(info.badge, new RegExp("^v100\\." + minor + " · "));
  assert.equal(info.engineContract, "54.1");
  assert.match(col, /if \(S\.eLimitaDeRitm\(e\)\) return;/);
  assert.match(citeste("public", "lib", "grid-sim.js"), /"Aș porni: câștigă în "/);
  assert.equal(FRAZA_PICAT, "Citirea din KV a picat.");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
