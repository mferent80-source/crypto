// Proba v100.390 (I-940, pasul 3, el: „MAI DEPARTE?”): al treilea bloc al Tabloului iese din public/app.js — citirea de sus, șansele stopului
// și ale TP-ului, costul, „Ce contează”, filele capitolelor, setările graficului (indicatori, modul simplu) și lățimea pieței ⇒ public/lib/tablou-citire.js.
//   A  tablou-citire.js e în MODULE_TABLOU, în index.html ÎNAINTEA lui app.js (fără defer) și în APP_SHELL din sw.js
//   C  tablou-citire.js se încarcă SINGUR (doar definiții, nimic rulat la încărcare) și face cele 72 de nume ale blocului
//   D  niciun nume definit de două ori în app.js + toate modulele (app.js, încărcat după, l-ar înlocui tăcut)
//   E  mutat NESCHIMBAT: corpul modulului = rândurile 7858–8197 din app.js la v100.389 (commitul d9a366d6), la literă
//   O  ordinea: inițializările var din modul rulează acum ÎNAINTEA întregului app.js ⇒ niciun cod de nivel 0 din app.js
//      (în afara definițiilor de funcții) nu le atinge
//   M  motorul probelor vede funcțiile din modul
//   F  modulul lucrează singur, fără app.js: prețul scurt, cheia rândurilor „Ce contează”, fila implicită, cheile salvate în browser
//   V  versiunea v100.390, proba în lanț după v100.389
// Rulare: node scripts/proba-v100390.mjs
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
console.log("\nv100.390 · Tabloul în module, pasul 3: citirea și setările (I-940) · proba\n");

const APP = citeste("public", "app.js"), MOD = citeste("public", "lib", "tablou-citire.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
const FUNCTII = "tbPretScurt tbIndStare tbSincInd tbModSimplu tbSincMod tbAlegeMod tbFundingPt tbLaPret tbSansePt tbCurbaPt tbStopZgomot tbStopSansa tbStopSansaDrum tbDovadaBoti tbNotaDurata tbCapMargine tbAfaraContra tbDovadaFaraStop tbSanseMargine tbBandaPt tbCostDeseneaza tbProbRanduriHtml tbMcIntai24 tbStopCuIntai tbConteazaLista tbCapParte tbCtOra tbCtUsdt tbPozitieLa tbTotalLa tbCtBani tbCtCheie tbVazutAscultator tbCtMemorie tbConteazaImbogateste tbConcretSusHtml tbCutieFaraAlarma tbRenderConteaza tbEsteSus tbCheieDir tbSemaforTf tbReiaLipsa tbTrendIstoric tbCitireSchelet tbCitirePeLoc tbStopMcDrum tbTpSansaDrum tbTpGrile tbZeroGrile tbFluxLoc tbFilaAcum tbFilaAplica tbFilaAlege tbSariLa tbCapAzi tbCitGriStare tbCitGriPune tbCitGriComuta tbCitGri tbDeseneazaCitire tbHotHtml tbVociBilant tbLatimeDinKv".split(" ");
const VARS = "TB_IND_KEY tbGrafRz TB_MOD_KEY tbCurba tbDovB TB_FILE TB_CIT_GRI_KEY tbVociKv tbLatimeKv".split(" ");
const NUME = FUNCTII.concat(VARS);

await test("A  tablou-citire.js: în MODULE_TABLOU, în index.html înaintea lui app.js (fără defer), în APP_SHELL", () => {
  for (const f of ["tablou-mc.js", "tablou-kpi.js", "tablou-citire.js"]) assert.ok(MODULE_TABLOU.includes(f), f);
  const i = HTML.indexOf('<script src="/lib/tablou-citire.js"></script>'), iApp = HTML.indexOf('<script defer="" src="/app.js">');
  assert.ok(i > 0 && iApp > i, "înaintea lui app.js");
  assert.ok(SW.includes('"/lib/tablou-citire.js"'), "APP_SHELL");
  assert.ok(cuTablou("x").includes("function tbFilaAlege("), "probele vechi îl văd prin cuTablou");
});

await test("C  tablou-citire.js se încarcă singur (doar definiții) și face cele 72 de nume", () => {
  assert.equal(NUME.length, 72);
  const c = {}; vm.createContext(c); vm.runInContext(MOD, c);
  assert.deepEqual(Object.keys(c).sort(), NUME.slice().sort());
});

await test("D  niciun nume definit de două ori în app.js + module", () => {
  const def = (src, n) => (src.match(new RegExp("(^|[\\n;])\\s*(?:async\\s+)?function\\s+" + n + "\\s*\\(", "g")) || []).length
    + (src.match(new RegExp("(^|\\n)(?:var|let|const)\\s(?:[^\\n]*?[\\s,])?" + n + "\\s*=", "g")) || []).length;
  const tot = cuTablou(APP);
  for (const n of NUME) { assert.equal(def(APP, n), 0, n + " a rămas în app.js"); assert.equal(def(tot, n), 1, n + ": o singură definiție"); }
});

await test("E  mutat NESCHIMBAT: corpul modulului = rândurile 7858–8197 din app.js la v100.389 (d9a366d6)", () => {
  let vechi; try { vechi = execFileSync("git", ["show", "d9a366d6:public/app.js"], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) { console.log("       (fără git aici — sar comparația la literă)"); return; }
  /* git ține fișierul cu LF, copia de lucru cu CRLF ⇒ comparația pe LF */
  const bloc = vechi.replace(/\r\n/g, "\n").split("\n").slice(7857, 8197).join("\n");
  const corp = MOD.replace(/\r\n/g, "\n"), corpFaraCap = corp.slice(corp.indexOf("*/") + 3).replace(/\n$/, "");
  assert.equal(corpFaraCap, bloc);
  assert.match(APP, /\/\/ v100\.390 \(I-940\): citirea de sus[^\n]*mutat în public\/lib\/tablou-citire\.js/);
});

await test("O  ordinea: niciun cod de nivel 0 din app.js (în afara funcțiilor) nu atinge variabilele modulului", () => {
  /* adâncimea acoladelor rând cu rând; șirurile și comentariile scoase înainte de numărat */
  let ad = 0; const sus = [];
  for (const [i, l] of APP.replace(/\r\n/g, "\n").split("\n").entries()) {
    if (ad === 0 && !/^\s*(?:async\s+)?function\s/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l) && VARS.some((v) => new RegExp("\\b" + v + "\\b").test(l))) sus.push(i + 1 + ": " + l.slice(0, 80));
    for (const ch of l.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\*.*?\*\/|\/\/.*$/g, "")) { if (ch === "{") ad++; else if (ch === "}") ad = Math.max(0, ad - 1); }
  }
  assert.deepEqual(sus, []);
});

await test("M  motorul probelor (scripts/lib/motor-pagina.mjs) vede funcțiile din tablou-citire.js", async () => {
  const { incarcaMotor } = await import("./lib/motor-pagina.mjs");
  const m = incarcaMotor({ extra: ["tbPretScurt", "tbCtCheie"] });
  assert.ok(m.functii.includes("tbPretScurt") && m.functii.includes("tbCtCheie"));
  /* pasul 3 a picat și proba-v100272-d (lista albă a acțiunilor): căuta tbConteazaImbogateste și funcțiile-acțiuni doar în app.js și ar fi
     scăpat atributele data-action din module ⇒ vede app.js lipit de module, iar modulele nu se mai citesc a doua oară */
  const p = citeste("scripts", "proba-v100272-d.mjs");
  assert.match(p, /const APP = cuTablou\(dinEnv\("PROBA_APP_JS"/); assert.match(p, /TOATE_JS = \[\["public\/app\.js", APP\], \.\.\.LIB\.filter\(\(\[f\]\) => !MODULE_TABLOU\.includes/);
});

await test("F  modulul lucrează singur, fără app.js (prețul scurt, cheia „Ce contează”, fila implicită, cheile salvate)", () => {
  const c = { Math, String, Number, Array, JSON, isFinite, Date, Object };
  vm.createContext(c); vm.runInContext(MOD, c);
  assert.equal(vm.runInContext("tbPretScurt(null)", c), "—");
  assert.equal(vm.runInContext("tbPretScurt(123.456)", c), "123.46");
  assert.equal(vm.runInContext("tbPretScurt(5)", c), "5.0000");
  assert.equal(vm.runInContext("tbCtCheie({cheie:'stop',titlu:'Stopul  la 1,5% din preț'})", c), "stop|stopul la #% din preț", "cifrele nu schimbă cheia rândului");
  assert.equal(vm.runInContext("tbFilaAcum()", c), "toate", "fără localStorage ⇒ „Toate”");
  assert.equal(vm.runInContext("[TB_IND_KEY, TB_MOD_KEY, TB_CIT_GRI_KEY].join('|')", c), "tbGraficInd|tbGraficMod|tbCitGriDeschisV1", "cheile salvate în browser rămân aceleași");
  assert.ok(vm.runInContext("['decizia','risc'].every(function(k){return Array.isArray(TB_FILE[k])})", c), "filele capitolelor");
});

await test("V  versiunea v100.390 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(pk.version, "100.390.0"); assert.equal(bi.version, "v100.390"); assert.ok(bi.li390 && bi.li390.length > 100, "BUILD_INFO.li390");
  assert.ok((HTML.match(/v100\.390/g) || []).length >= 4); assert.match(SW, /crypto-radar-v100-390/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.390"/);
  assert.match(pk.scripts.test, /npm run test:v100389 && npm run test:v100390 && node scripts\/mutatii\.mjs --doar-tiparele/); assert.equal(pk.scripts["test:v100390"], "node scripts/proba-v100390.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
