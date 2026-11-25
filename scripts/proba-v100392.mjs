// Proba v100.392 (I-940, pasul 4, el: „CONTINUA”): al patrulea bloc al Tabloului iese din public/app.js — probabilitățile din istoric, profilul botului,
// Consilierul și planul, fluxul pieței, săptămâna, semnalele, portofoliul, semaforul și starea Busolei ⇒ public/lib/tablou-consilier.js.
//   A  tablou-consilier.js e în MODULE_TABLOU, în index.html ÎNAINTEA lui app.js (fără defer) și în APP_SHELL din sw.js
//   C  tablou-consilier.js se încarcă SINGUR (doar definiții, nimic rulat la încărcare) și face cele 43 de nume ale blocului
//   D  niciun nume definit de două ori în app.js + toate modulele (app.js, încărcat după, l-ar înlocui tăcut)
//   E  mutat NESCHIMBAT: corpul modulului = rândurile 7034–7404 din app.js la v100.391 (commitul 9064bd9f), la literă
//   O  ordinea: inițializările var din modul rulează acum ÎNAINTEA întregului app.js ⇒ niciun cod de nivel 0 din app.js
//      (în afara definițiilor de funcții) nu le atinge
//   M  motorul probelor vede funcțiile din modul
//   F  modulul lucrează singur, fără app.js: starea de pornire a profilului / Consilierului / Busolei, textele goale pe date lipsă
//   V  versiunea v100.392, proba în lanț după v100.391
// Rulare: node scripts/proba-v100392.mjs
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
console.log("\nv100.392 · Tabloul în module, pasul 4: Consilierul și profilul (I-940) · proba\n");

const APP = citeste("public", "app.js"), MOD = citeste("public", "lib", "tablou-consilier.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
const FUNCTII = "tbDeseneazaProb tbProfilPt tbAduSocoteala tbConsKvPt tbConsCheie tbDecizie tbDecStareText tbAduFerestre tbPornitCaText tbPlanNecitit tbConsHtml tbIncredere tbPlanCitire tbAduPlan tbAduFlux tbDeseneazaFlux tbAduSaptamana tbAduPropunerePlan tbPunePlanPropus tbPlanFormSinc tbPlanInForm tbPlanSalveaza tbMarjaCalc tbDeseneazaSaptPlan tbAduSemnale tbDeseneazaPortofoliu tbBtcPortofoliu tbBusolaPortofoliu tbPregatireAdu tbPregatire tbMotiveComuta tbDeseneazaSemafor tbCheieBusola".split(" ");
const VARS = "tbProfil tbConsKv tbFer tbConsRestDeschis tbFlux tbPropPlan tbSem tbPreg tbMotiveDeschis tbPazaKv".split(" ");
const NUME = FUNCTII.concat(VARS);

await test("A  tablou-consilier.js: în MODULE_TABLOU, în index.html înaintea lui app.js (fără defer), în APP_SHELL", () => {
  for (const f of ["tablou-mc.js", "tablou-kpi.js", "tablou-citire.js", "tablou-consilier.js"]) assert.ok(MODULE_TABLOU.includes(f), f);
  const i = HTML.indexOf('<script src="/lib/tablou-consilier.js"></script>'), iApp = HTML.indexOf('<script defer="" src="/app.js">');
  assert.ok(i > 0 && iApp > i, "înaintea lui app.js");
  assert.ok(SW.includes('"/lib/tablou-consilier.js"'), "APP_SHELL");
  assert.ok(cuTablou("x").includes("function tbConsHtml("), "probele vechi îl văd prin cuTablou");
});

await test("C  tablou-consilier.js se încarcă singur (doar definiții) și face cele 43 de nume", () => {
  assert.equal(NUME.length, 43);
  const c = {}; vm.createContext(c); vm.runInContext(MOD, c);
  assert.deepEqual(Object.keys(c).sort(), NUME.slice().sort());
});

await test("D  niciun nume definit de două ori în app.js + module", () => {
  const def = (src, n) => (src.match(new RegExp("(^|[\\n;])\\s*(?:async\\s+)?function\\s+" + n + "\\s*\\(", "g")) || []).length
    + (src.match(new RegExp("(^|\\n)(?:var|let|const)\\s(?:[^\\n]*?[\\s,])?" + n + "\\s*=", "g")) || []).length;
  const tot = cuTablou(APP);
  for (const n of NUME) { assert.equal(def(APP, n), 0, n + " a rămas în app.js"); assert.equal(def(tot, n), 1, n + ": o singură definiție"); }
});

await test("E  mutat NESCHIMBAT: corpul modulului = rândurile 7034–7404 din app.js la v100.391 (9064bd9f)", () => {
  let vechi; try { vechi = execFileSync("git", ["show", "9064bd9f:public/app.js"], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) { console.log("       (fără git aici — sar comparația la literă)"); return; }
  /* git ține fișierul cu LF, copia de lucru cu CRLF ⇒ comparația pe LF. Dacă modulul se schimbă după mutare, comparația trece pe ISTORIC
     (modulul din commitul mutării), ca la proba v100390 */
  const bloc = vechi.replace(/\r\n/g, "\n").split("\n").slice(7033, 7404).join("\n");
  const corp = MOD.replace(/\r\n/g, "\n"), corpFaraCap = corp.slice(corp.indexOf("*/") + 3).replace(/\n$/, "");
  assert.equal(corpFaraCap, bloc);
  assert.match(APP, /(?:\/\/|\/\*) v100\.392 \(I-940\): probabilitățile din istoric[^\n]*mutat în public\/lib\/tablou-consilier\.js/);
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

await test("M  motorul probelor (scripts/lib/motor-pagina.mjs) vede funcțiile din tablou-consilier.js", async () => {
  const { incarcaMotor } = await import("./lib/motor-pagina.mjs");
  const m = incarcaMotor({ extra: ["tbCheieBusola", "tbPornitCaText"] });
  assert.ok(m.functii.includes("tbCheieBusola") && m.functii.includes("tbPornitCaText"));
});

await test("G  nicio probă nu mai citește app.js fără modulele Tabloului (pasul 4 a picat v10039: „Stop-loss sus” stă acum în modul)", () => {
  /* excepții: proba de ecran (browserul ia pagina întreagă) și audit19-srv (pomenește "public/app.js" doar ca nume de fișier, într-o listă) */
  const EXCEPTII = ["proba-ecran-tablou.mjs", "proba-audit19-srv.mjs"];
  const fara = fs.readdirSync(path.join(RAD, "scripts")).filter((f) => /^proba-.*\.mjs$/.test(f) && !EXCEPTII.includes(f)).filter((f) => {
    const s = citeste("scripts", f); return /["'(/]app\.js["')]|"public", "app\.js"|public\/app\.js/.test(s) && !s.includes("cuTablou");
  });
  /* strict: v10039 nu pomenea niciun nume tb* și tot a picat (textul căutat s-a mutat) ⇒ orice probă care citește app.js îl citește cu modulele */
  assert.equal(fara.length, 0, "probe care citesc app.js fără modulele Tabloului: " + fara.join(", "));
});

await test("F  modulul lucrează singur, fără app.js (starea de pornire, textele goale pe date lipsă)", () => {
  const c = { Math, String, Number, Array, JSON, isFinite, Date, Object };
  vm.createContext(c); vm.runInContext(MOD, c);
  assert.equal(vm.runInContext("tbPornitCaText(null)", c), null, "fără bot ⇒ nimic");
  assert.equal(vm.runInContext("tbPornitCaText({baza:'BTC.PERP'})", c), null, "fără GridPlan ⇒ nimic, fără eroare");
  assert.equal(vm.runInContext("tbCheieBusola({simbolPionex:'LIT_USDT_PERP'})", c), "LIT_USDT_PERP", "cheia Busolei din tickerul Pionex");
  assert.equal(vm.runInContext("JSON.stringify([tbProfil.simbol, tbConsKv.botId, tbConsKv.decizii.length, Object.keys(tbPazaKv.boti).length])", c), "[null,null,0,0]", "starea de pornire");
});

await test("V  versiunea v100.392 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(pk.version, "100.392.0"); assert.equal(bi.version, "v100.392"); assert.ok(bi.li392 && bi.li392.length > 100, "BUILD_INFO.li392");
  assert.ok((HTML.match(/v100\.392/g) || []).length >= 4); assert.match(SW, /crypto-radar-v100-392/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.392"/);
  assert.match(pk.scripts.test, /npm run test:v100391 && npm run test:v100392 && node scripts\/mutatii\.mjs --doar-tiparele/); assert.equal(pk.scripts["test:v100392"], "node scripts/proba-v100392.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
