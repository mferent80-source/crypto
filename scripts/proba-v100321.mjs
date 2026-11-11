// Proba v100.321 (11.11.2026): reparația notei TradingView din pagina T212, găsită pe pozele de pe Radarul live (v100.320).
// Pe CALCULATOR pagina T212 e o listă de cartele (stânga) + fișa (dreapta); lista nu are coloana Trend, iar linia „TV 1D” de sub nume era
// arătată doar pe telefon ⇒ în listă nu se vedea. În capul fișei apărea de două ori: „.t212FisaVal .t212Mic{display:block}” (pagina) bătea
// „.tvMicTel{display:none}”. Acum: linia de sub nume în rândul / cartela listei la ORICE lățime; în capul fișei doar cea din celula Trend.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let trecute = 0, picate = 0;
const test = async (nume, f) => { try { await f(); trecute++; console.log("  ✓ " + nume); } catch (e) { picate++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
const CSS = citeste("public", "app.css"), HTML = citeste("public", "index.html");
console.log("Proba v100.321 - nota TradingView în lista T212 de pe calculator");
const ARATA = "#t212Continut tr.t212Rand .t212Sim .t212Mic.tvMicTel{display:block}", ASCUNDE_CAP = ".t212FisaVal .t212Mic.tvMicTel{display:none}";

await test("lista pozițiilor: linia „TV 1D” de sub nume se vede la ORICE lățime (nu doar pe telefon), după regula paginii care ascunde liniile mici", () => {
  const i = CSS.indexOf(ARATA); assert.ok(i > 0, "lipsește regula care arată linia în listă");
  assert.ok(!CSS.slice(Math.max(0, i - 40), i).includes("@media"), "regula nu mai stă într-un @media doar pentru telefon");
  assert.ok(CSS.indexOf("#t212Continut tr.t212Rand .t212Sim .t212Mic:not(.t212Modele){display:none}") < i, "aceeași greutate ⇒ trebuie să stea mai jos");
});

await test("capul fișei: linia de sub nume ascunsă (nota e deja în celula Trend), după regula paginii „.t212FisaVal .t212Mic{display:block}”", () => {
  const j = CSS.indexOf(ASCUNDE_CAP); assert.ok(j > 0, "lipsește regula din capul fișei");
  assert.ok(CSS.indexOf(".t212FisaVal .t212Mic{display:block}") < j, "trebuie să stea după regula paginii");
});

await test("blocul notei TradingView rămâne după stratul desenului și înaintea pândei", () => {
  const cap = CSS.indexOf("/* v100.316: sfârșitul desenului nou */"), a = CSS.indexOf("/* v100.320 (el, 11.11.2026"), z = CSS.indexOf("/* v100.320: sfârșitul notei TradingView */");
  assert.ok(cap > 0 && a > cap && z > a && CSS.indexOf(ARATA) > a && CSS.indexOf(ARATA) < z && CSS.indexOf(ASCUNDE_CAP) > a && CSS.indexOf(ASCUNDE_CAP) < z);
  assert.equal(pandaInainteaCozii(CSS), "");
});

await test("versiunile: pagina (de exact 4 ori), SW, serverul, BUILD_INFO, package.json", () => {
  const B = JSON.parse(citeste("BUILD_INFO.json")), P = JSON.parse(citeste("package.json")), V = "3(?:2[1-9]|[3-9]\\d)";
  assert.equal((HTML.match(new RegExp("v100\\." + V, "g")) || []).length, 4); assert.equal((HTML.match(/v100\.320/g) || []).length, 0);
  assert.match(citeste("public", "sw.js"), new RegExp('const CACHE="crypto-radar-v100-' + V + '";'));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + V + '"'));
  assert.match(B.version, new RegExp("^v100\\." + V + "$")); assert.ok(B.features.tvLista321); assert.match(P.version, new RegExp("^100\\." + V + "\\."));
  assert.ok(P.scripts.test.includes("npm run test:v100320 && npm run test:v100321")); assert.equal(P.scripts["test:v100321"], "node scripts/proba-v100321.mjs");
});

console.log("\n" + trecute + " trecute, " + picate + " picate");
process.exit(picate ? 1 : 0);
