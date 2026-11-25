// Proba v100.389 (I-940, pasul 2, el: „continua”): al doilea bloc al Tabloului iese din public/app.js — cifrele mari, mișcarea,
// ferestrele de timp, direcția și calculul indicatorilor (tbKpi*, tbMi*, tbTf*, tbFereastra*, …) în public/lib/tablou-kpi.js.
//   A  tablou-kpi.js e în MODULE_TABLOU, în index.html ÎNAINTEA lui app.js (fără defer) și în APP_SHELL din sw.js
//   C  tablou-kpi.js se încarcă SINGUR (doar definiții, nimic rulat la încărcare) și face cele 49 de nume ale blocului
//   D  niciun nume definit de două ori în app.js + toate modulele (app.js, încărcat după, l-ar înlocui tăcut)
//   E  mutat NESCHIMBAT: corpul modulului = rândurile 7681–8077 din app.js la v100.388 (commitul e1514a7c), la literă
//   O  ordinea: inițializările var din modul rulează acum ÎNAINTEA întregului app.js ⇒ niciun cod de nivel 0 din app.js
//      (în afara definițiilor de funcții) nu le atinge; și nimic din bloc nu citește app.js la încărcare (C o arată)
//   F  modulul lucrează singur, fără app.js: rotunjirea procentelor, textele goale pe date lipsă, perioadele graficului
//   V  versiunea v100.389, proba în lanț după v100.388
// Rulare: node scripts/proba-v100389.mjs
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
console.log("\nv100.389 · Tabloul în module, pasul 2: cifrele mari (I-940) · proba\n");

const APP = citeste("public", "app.js"), KPI = citeste("public", "lib", "tablou-kpi.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
const FUNCTII = "tbKpiTotalViuDeseneaza tbKpiPretDeseneaza tbKpiLichDeseneaza tbKpiAsezare tbMiLumPe tbMiAduBtc tbMiVarsta tbMiscareSchelet tbMiscareDeseneaza tbDeseneazaKpi tbTf tbTfButoane tbRotPct tbFereastraToataE tbFereastraToata tbFereastraButon tbBare1m tbAdu1m tbAlegeInterval tbPreiaRestulTf tbAduTf tbAduDirectie tbTineDe tbRandTrepte tbVerdictConfirmat tbCalculeazaIndicatorii tbIndTabelHtml tbFundingMediu tbPerechiDinDrumText tbRegimGridText".split(" ");
const VARS = "TB_KPI_DET tbMi TB_MI_BTC_MS TB_MI_BTC_VECHI_MS TB_MI_BTC_LIM TB_DIR_TF TB_SEM_EXTRA TB_DIR_REINCERCARE_MS TB_DIR_MS TB_GRAFIC_MS TB_PERIOADE TB_TF_VECHI TB_TF_CHEIE TB_FER_CHEIE tbUm1m TB_UM1M_MS TB_UM1M_PAGINI TB_TF_CALC tbVerAnt".split(" ");
const NUME = FUNCTII.concat(VARS);

await test("A  tablou-kpi.js: în MODULE_TABLOU, în index.html înaintea lui app.js (fără defer), în APP_SHELL", () => {
  assert.ok(MODULE_TABLOU.includes("tablou-kpi.js") && MODULE_TABLOU.includes("tablou-mc.js"));
  const i = HTML.indexOf('<script src="/lib/tablou-kpi.js"></script>'), iApp = HTML.indexOf('<script defer="" src="/app.js">');
  assert.ok(i > 0 && iApp > i, "înaintea lui app.js");
  assert.ok(SW.includes('"/lib/tablou-kpi.js"'), "APP_SHELL");
  assert.ok(cuTablou("x").includes("function tbDeseneazaKpi("), "probele vechi îl văd prin cuTablou");
});

await test("C  tablou-kpi.js se încarcă singur (doar definiții) și face cele 49 de nume", () => {
  assert.equal(NUME.length, 49);
  const c = {}; vm.createContext(c); vm.runInContext(KPI, c);
  assert.deepEqual(Object.keys(c).sort(), NUME.slice().sort());
});

await test("D  niciun nume definit de două ori în app.js + module", () => {
  const def = (src, n) => (src.match(new RegExp("(^|[\\n;])\\s*(?:async\\s+)?function\\s+" + n + "\\s*\\(", "g")) || []).length
    + (src.match(new RegExp("(^|\\n)(?:var|let|const)\\s(?:[^\\n]*?[\\s,])?" + n + "\\s*=", "g")) || []).length;
  const tot = cuTablou(APP);
  for (const n of NUME) { assert.equal(def(APP, n), 0, n + " a rămas în app.js"); assert.equal(def(tot, n), 1, n + ": o singură definiție"); }
});

await test("E  mutat NESCHIMBAT: corpul modulului = rândurile 7681–8077 din app.js la v100.388 (e1514a7c)", () => {
  let vechi; try { vechi = execFileSync("git", ["show", "e1514a7c:public/app.js"], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) { console.log("       (fără git aici — sar comparația la literă)"); return; }
  /* git ține fișierul cu LF, copia de lucru cu CRLF ⇒ comparația pe LF */
  const bloc = vechi.replace(/\r\n/g, "\n").split("\n").slice(7680, 8077).join("\n");
  const corp = KPI.replace(/\r\n/g, "\n"), corpFaraCap = corp.slice(corp.indexOf("*/") + 3).replace(/\n$/, "");
  assert.equal(corpFaraCap, bloc);
  assert.match(APP, /\/\/ v100\.389 \(I-940\): cifrele mari[^\n]*mutat în public\/lib\/tablou-kpi\.js/);
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

await test("F  modulul lucrează singur, fără app.js (procente, texte goale pe date lipsă, perioadele graficului)", () => {
  const c = { TextRo: globalThis.TextRo, Math, String, Number, Array, JSON, isFinite, Date };
  vm.createContext(c); vm.runInContext(KPI, c);
  assert.equal(vm.runInContext("tbRotPct('−1,25% și +3,04%')", c), "−1,3% și +3,0%", "o singură zecimală");
  assert.equal(vm.runInContext("tbPerechiDinDrumText(null)", c), "");
  assert.equal(vm.runInContext("tbRegimGridText(null)", c), "");
  assert.equal(vm.runInContext("TB_PERIOADE['5M'].l + '/' + TB_PERIOADE['1D'].cat", c), "288/200 de zile");
  assert.equal(vm.runInContext("TB_TF_CHEIE + '|' + TB_FER_CHEIE", c), "tabloBotTf_v1|tabloBotFereastra_v2", "cheile salvate în browser rămân aceleași");
});

await test("M  motorul probelor (scripts/lib/motor-pagina.mjs) vede funcțiile mutate în module (picase la pasul 2: citea app.js singur)", async () => {
  const { incarcaMotor } = await import("./lib/motor-pagina.mjs");
  const m = incarcaMotor({ extra: ["tbCalculeazaIndicatorii", "tbRegimGridText"] });
  assert.ok(m.functii.includes("tbCalculeazaIndicatorii") && m.functii.includes("tbRegimGridText"));
  /* nicio unealtă din scripts/lib nu mai pomenește "app.js" fără cuTablou (motor-pagina îl citea prin citeste(rad, "public", "app.js"));
     excepții: sursa-app.mjs (e chiar lipitorul) și amprenta-ecran.mjs (amprenta ia tot public/lib; „servește depozitul?” compară app.js ca identitate) */
  const lib = fs.readdirSync(path.join(RAD, "scripts", "lib")).filter((x) => x.endsWith(".mjs") && !["sursa-app.mjs", "amprenta-ecran.mjs"].includes(x));
  const fara = lib.filter((f) => { const s = citeste("scripts", "lib", f); return /["']app\.js["']/.test(s) && !s.includes("cuTablou"); });
  assert.deepEqual(fara, []);
  /* paza prinde forma veche a lui motor-pagina */
  assert.ok(/["']app\.js["']/.test('APP = citeste(rad, "public", "app.js");'));
});

await test("V  versiunea v100.389 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(pk.version, "100.389.0"); assert.equal(bi.version, "v100.389"); assert.ok(bi.li389 && bi.li389.length > 100, "BUILD_INFO.li389");
  assert.ok((HTML.match(/v100\.389/g) || []).length >= 4); assert.match(SW, /crypto-radar-v100-389/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.389"/);
  assert.match(pk.scripts.test, /npm run test:v100388 && npm run test:v100389 && node scripts\/mutatii\.mjs --doar-tiparele/); assert.equal(pk.scripts["test:v100389"], "node scripts/proba-v100389.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
