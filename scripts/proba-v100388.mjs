// Proba v100.388 (I-940, el: „fă tot” / „continua” după auditul paginii botului): Tabloul iese din public/app.js pe bucăți.
//   A  cuTablou(): lipește modulele Tabloului de app.js cu același capăt de rând (CRLF / LF) ca textul primit
//   B  MODULE_TABLOU în pas cu pagina: fiecare modul e în index.html ÎNAINTEA lui app.js și în APP_SHELL din sw.js; orice
//      public/lib/tablou-*.js cu capul „mutat NESCHIMBAT din public/app.js” e în listă
//   C  tablou-mc.js se încarcă SINGUR (doar definiții, nimic rulat la încărcare) și face cele 25 de nume ale blocului
//   D  niciun nume definit de două ori: app.js (încărcat DUPĂ) ar înlocui tăcut funcția din modul
//   E  mutat NESCHIMBAT: corpul modulului = rândurile 8774–8957 din app.js la v100.387 (commitul 217e97ee), la literă
//   F  modulul lucrează singur, fără app.js: tbMcScurtHtml / tbMcScorHtml / tbMcSapt în vm, cu intrări de probă
//   V  versiunea v100.388, proba în lanț după v100.387
// Rulare: node scripts/proba-v100388.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { cuTablou, MODULE_TABLOU } from "./lib/sursa-app.mjs";

const RAD = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
console.log("\nv100.388 · Tabloul în module, pasul 1: Monte Carlo (I-940) · proba\n");

const APP = citeste("public", "app.js"), MC = citeste("public", "lib", "tablou-mc.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
const NUME = "tbMcWorkerAsteptare tbMcSimuleaza tbMcDinKv tbMcCheie tbMcTick tbMcBareTinute tbMcTineBare tbMcPorneste tbMcDeseneaza tbMcScorHtml tbMcSapt tbMcScurtHtml tbMcScurtVerifHtml tbMcIstoricHtml tbInstantaneu tbMcRand tbMcWorker tbMcWorkerId tbMcWorkerCereri TB_MC_WORKER_MS TB_MC_MS TB_MC_REINCERCARE_MS TB_MC_KV_PROASPAT_MS tbMc tbMcKv".split(" ");

await test("A  cuTablou(): app.js + modulele, cu capătul de rând al textului primit", () => {
  const crlf = cuTablou("x\r\ny"), lf = cuTablou("x\ny");
  assert.ok(crlf.startsWith("x\r\ny\r\n") && !/[^\r]\n/.test(crlf), "CRLF peste tot");
  assert.ok(lf.startsWith("x\ny\n") && !lf.includes("\r"), "LF peste tot");
  assert.ok(lf.includes("function tbMcRand("), "modulul e lipit");
  assert.equal(cuTablou(null), null);
});

await test("B  MODULE_TABLOU în pas cu index.html (înaintea lui app.js) și cu sw.js; nimic mutat rămas pe dinafară", () => {
  assert.ok(MODULE_TABLOU.includes("tablou-mc.js"));
  const iApp = HTML.indexOf('src="/app.js"'); assert.ok(iApp > 0);
  for (const f of MODULE_TABLOU) {
    const i = HTML.indexOf('<script src="/lib/' + f + '"></script>'); assert.ok(i > 0 && i < iApp, f + ": în index.html înaintea lui app.js, fără defer");
    assert.ok(SW.includes('"/lib/' + f + '"'), f + ": în APP_SHELL");
  }
  const mutate = fs.readdirSync(path.join(RAD, "public", "lib")).filter((f) => /^tablou-.*\.js$/.test(f) && /mutat NESCHIMBAT din public\/app\.js/.test(citeste("public", "lib", f)));
  assert.deepEqual(mutate.sort(), MODULE_TABLOU.slice().sort());
});

await test("C  tablou-mc.js se încarcă singur (doar definiții) și face cele 25 de nume", () => {
  const c = {}; vm.createContext(c); vm.runInContext(MC, c);
  assert.deepEqual(Object.keys(c).sort(), NUME.slice().sort());
});

await test("D  niciun nume definit de două ori (app.js, încărcat după, l-ar înlocui tăcut)", () => {
  const def = (src, n) => (src.match(new RegExp("(^|[\\n;])\\s*(?:async\\s+)?function\\s+" + n + "\\s*\\(|(^|\\n)(?:var|let|const)\\s[^\\n]*?\\b" + n + "\\s*=", "g")) || []).length;
  const tot = cuTablou(APP);
  for (const n of NUME) { assert.equal(def(APP, n), 0, n + " a rămas în app.js"); assert.equal(def(tot, n), 1, n + ": o singură definiție"); }
});

await test("E  mutat NESCHIMBAT: corpul modulului = rândurile 8774–8957 din app.js la v100.387 (217e97ee)", () => {
  let vechi; try { vechi = execFileSync("git", ["show", "217e97ee:public/app.js"], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) { console.log("       (fără git aici — sar comparația la literă)"); return; }
  /* git ține fișierul cu LF, copia de lucru cu CRLF ⇒ comparația pe LF */
  const bloc = vechi.replace(/\r\n/g, "\n").split("\n").slice(8773, 8957).join("\n");
  const corp = MC.replace(/\r\n/g, "\n"), corpFaraCap = corp.slice(corp.indexOf("*/") + 3).replace(/\n$/, "");
  const corpCmp = corpFaraCap;
  assert.equal(corpCmp, bloc);
  assert.match(APP, /\/\/ v100\.388 \(I-940\): Monte Carlo pe botul tău[^\n]*mutat în public\/lib\/tablou-mc\.js/);
});

await test("F  modulul lucrează singur, fără app.js (rândul pe termen scurt, scorul, săptămâna)", () => {
  const c = { TextRo: globalThis.TextRo, escapeHtml: (s) => String(s).replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]), Math, String, Number, Array, JSON, isFinite, Date };
  vm.createContext(c); vm.runInContext(MC, c);
  assert.equal(vm.runInContext("tbMcSapt(null,null,null)", c), null, "fără GridSim ⇒ nimic, fără eroare");
  assert.equal(typeof vm.runInContext("tbMcScurtHtml([],false,false)", c), "string");
  assert.equal(typeof vm.runInContext("tbMcScorHtml(null,'1')", c), "string");
  assert.equal(vm.runInContext("tbMcBareTinute('BTC')", c), null, "fără memoria lumânărilor ⇒ null");
});

await test("V  versiunea v100.388 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  /* v100.389: „de la 388 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.389) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 388); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 388); assert.ok(bi.li388 && bi.li388.length > 100, "BUILD_INFO.li388");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 388).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(SW) || [])[1] >= 388); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 388);
  assert.match(pk.scripts.test, /npm run test:v100387 && npm run test:v100388/); assert.equal(pk.scripts["test:v100388"], "node scripts/proba-v100388.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
