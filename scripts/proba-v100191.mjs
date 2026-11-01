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
await test("v100.292: fiecare rând Trend poartă 12-1 (pastila) și 60 z (sub), cu o zecimală; raportarea în rând; saltul ≥ 50% e avertisment în fișă, cu o zecimală; sub 50% nu", () => {
  const d = { trend12: trendDinJson(jsonRobot(), null, ACUM) }, l = ctx.sugRanduri(d, ACUM).filter((x) => x.grup === "trend");
  assert.equal(l.length, 20); for (const r of l) assert.match(r.nume, / · 12-1 [+−]\d+,\d% · 60 z [+−]\d+,\d%/);
  assert.ok(l.some((r) => / · 12-1 \+150,0% · 60 z \+30,0%/.test(r.nume)));
  assert.equal(l.filter((r) => /raportează în 7z$/.test(r.nume)).length, 1, "raportarea e ultimul lucru din linia de cifre");
  const salturi = l.map((r) => ctx.sugFisa(r, d, ACUM)).flatMap((f) => f.avert.filter((a) => /^Salt /.test(a)));
  assert.equal(salturi.length, 1, "un singur salt peste prag"); assert.match(salturi[0], /^Salt \+177,0% într-o zi \(2026-05-12\): verifică seria/);
  assert.ok(!l.some((r) => r.s === "T3" && /⚠/.test(r.sub)) || !ctx.sugFisa(l.filter((r) => r.s === "T3")[0], d, ACUM).avert.some((a) => /^Salt/.test(a)), "0,2 nu e salt");
});
await test("CSS (v100.292): prețul rândului nu se rupe, avertismentul e galben, lista + fișa stau înaintea regulii pândei (ultima)", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /\.sugRandPret\{[^}]*white-space:nowrap/); assert.match(css, /\.sugAvert\{[^}]*border-left:3px solid var\(--warn\)/); assert.match(css, /\.sugAv\{color:var\(--warn\)/);
  const iLista = css.indexOf(".sugRand{"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead");
  assert.ok(iLista > 0 && iPanda > iLista, "pânda rămâne ultima regulă");
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
