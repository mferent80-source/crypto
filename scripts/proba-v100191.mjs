// Probele v100.191 / colector v101.112 (14.10.2026, el: „fă toate”): (1) în Sugestii, cifrele rândului Trend nu se mai rup pe
// telefon („12-” / „1 +458,1 %”, „+1227,5” / „%”), linia de cifre stă sub nume sub 640 px; (2) saltul într-o zi măsurat de robot
// (split neajustat / glitch / știre) ajunge în Sugestii ca avertisment galben „salt +177,0 % într-o zi — verifică seria”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { trendDinJson } from "./lib/tura-trend.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.191 · Trend pe telefon + saltul într-o zi · proba\n");

const ACUM = Date.parse("2026-10-15T06:30:00Z");
function jsonRobot() {
  return {
    versiune: 1, la: "2026-10-15T00:40:00Z", dataUltimei: "2026-10-14", regim: { inchidere: 780, sma200: 724, peste: true }, sectoare: { Technology: 11, Energy: 9 }, raportari: { sursa: "finnhub", n: 800 },
    clasament: Array.from({ length: 20 }, (_, i) => ({ s: "T" + i, nume: "Firma " + i, sector: i % 2 ? "Technology" : "Energy", pret: 50 + i, m12: 1.5 - i / 20, m6: 0.4, r60: 0.3, rang: i / 588, spark: [1, 2],
      ...(i === 1 ? { raporteaza: { d: "2026-10-22", ora: "amc", zile: 8 } } : {}), ...(i === 2 ? { salt: { pct: 1.77, d: "2026-05-12" } } : {}), ...(i === 3 ? { salt: { pct: 0.2, d: "2026-03-03" } } : {}) })),
  };
}

await test("trendDinJson: saltul într-o zi trece din JSON (pct + ziua); fără salt ⇒ null; pragul îl pune pagina, nu tura", () => {
  const t = trendDinJson(jsonRobot(), null, ACUM);
  assert.deepEqual(t.top[2].salt, { pct: 1.77, d: "2026-05-12" }); assert.deepEqual(t.top[3].salt, { pct: 0.2, d: "2026-03-03" }); assert.equal(t.top[0].salt, null);
});

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, location: { hash: "" } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
await test("sugTrendHtml: fiecare rând are linia de cifre separată cu două grupuri nelegabile (12-1, 60 z); raportarea stă în linia de cifre; saltul ≥ 50 % e avertisment galben cu o zecimală, sub 50 % nu", () => {
  const h = ctx.sugTrendHtml(trendDinJson(jsonRobot(), null, ACUM), ACUM);
  assert.equal((h.match(/class="tbSub sugTrendCifre"/g) || []).length, 20, "20 de linii de cifre");
  assert.equal((h.match(/class="sugTrendNr"/g) || []).length, 40, "două grupuri pe rând");
  assert.match(h, /<span class="sugTrendNr">12-1 \+150,0 %<\/span> · <span class="sugTrendNr">60 z \+30,0 %<\/span>/);
  const iRap = h.indexOf('<b class="sugTrendRap">'); assert.ok(iRap > 0, "raportarea există");
  assert.match(h.slice(iRap, h.indexOf("</li>", iRap)), /^<b class="sugTrendRap">raportează în 7z<\/b><\/span>$/, "raportarea e ultimul lucru din linia de cifre");
  assert.equal((h.match(/class="sugTrendSalt"/g) || []).length, 1, "un singur salt peste prag");
  assert.match(h, /T2<\/button> Firma 2 <span class="tbSub sugTrendCifre">[^]*?<b class="sugTrendSalt">salt \+177,0 % într-o zi \(2026-05-12\) — verifică seria<\/b><\/span><\/li>/);
  assert.ok(!/T3<\/button>[^]*?sugTrendSalt[^]*?T4<\/button>/.test(h), "0,2 nu e salt");
});
await test("CSS: grupurile nu se rup (nowrap), pe telefon linia de cifre e bloc sub nume, saltul e galben; blocul Trend rămâne ÎNAINTEA regulii pandei (ultima)", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /\.sugTrendNr,\.sugTrendRap,\.sugTrendSalt\{white-space:nowrap\}/);
  assert.match(css, /@media \(max-width:640px\)\{\.sugTrendCifre\{display:block;margin:2px 0 0\}\.sugTrendLista li\{margin:6px 0\}\}/);
  assert.match(css, /\.sugTrendSalt\{color:var\(--warn\)/);
  const iTrend = css.indexOf(".sugTrendNr,"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead");
  assert.ok(iTrend > 0 && iPanda > iTrend, "pânda rămâne ultima regulă");
});
await test("versiunile: v100.191 peste tot (package, index, sw, BUILD_INFO, versiune.js), colectorul de la v101.112 în sus", () => {
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 191, "package 100.191+");
  const idx = citeste("public", "index.html"); assert.ok(!/v100\.190\b/.test(idx), "index fără v100.190"); assert.match(idx, /v100\.(19[1-9]|[2-9]\d\d)/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-(19[1-9]|[2-9]\d\d)/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.(19[1-9]|[2-9]\d\d)"/); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(19[1-9]|[2-9]\d\d)"/);
  const vc = /const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")); assert.ok(vc && Number(vc[1]) >= 112, "colector v101.112+");
  assert.match(citeste("package.json"), /npm run test:v100190 && npm run test:v100191/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
