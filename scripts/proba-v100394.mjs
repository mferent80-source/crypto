// Proba v100.394 (I-940, pasul 5, el: „continua”): al cincilea bloc al Tabloului iese din public/app.js — banii botului, identitatea lui,
// extra (cifrele Pionex, citite la 5 min) și scenariile (lichidarea, ținta, TP-ul în procente, costurile pe zi) ⇒ public/lib/tablou-banii.js.
//   A  tablou-banii.js e în MODULE_TABLOU, în index.html ÎNAINTEA lui app.js (fără defer) și în APP_SHELL din sw.js
//   C  tablou-banii.js se încarcă SINGUR (doar definiții, nimic rulat la încărcare) și face cele 12 nume ale blocului
//   D  niciun nume definit de două ori în app.js + toate modulele (app.js, încărcat după, l-ar înlocui tăcut)
//   E  mutat NESCHIMBAT: corpul modulului = rândurile 7058–7197 din app.js la v100.393 (commitul d97d64b2), la literă
//   O  ordinea: inițializarea var din modul (TB_EXTRA_MS) rulează acum ÎNAINTEA întregului app.js ⇒ niciun cod de nivel 0 din app.js
//      (în afara definițiilor de funcții) nu o atinge
//   M  motorul probelor vede funcțiile din modul
//   F  modulul lucrează singur, fără app.js: citirea Pionex la 5 min, ora citirii, scenariul „lichidat”
//   V  versiunea v100.394, proba în lanț după v100.393
// Rulare: node scripts/proba-v100394.mjs
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
console.log("\nv100.394 · Tabloul în module, pasul 5: banii și scenariile (I-940) · proba\n");

const APP = citeste("public", "app.js"), MOD = citeste("public", "lib", "tablou-banii.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
const FUNCTII = "tbDeseneazaExtra tbPeGrilaUsdt tbIdentitateBot tbDeseneazaBanii tbAduExtra tbTinteScenariu tbOraCitirii tbCosturiZi tbScenLichidat tbScenariuPropriu tbScenNotaTp".split(" ");
const VARS = ["TB_EXTRA_MS"];
const NUME = FUNCTII.concat(VARS);

await test("A  tablou-banii.js: în MODULE_TABLOU, în index.html înaintea lui app.js (fără defer), în APP_SHELL", () => {
  for (const f of ["tablou-mc.js", "tablou-kpi.js", "tablou-citire.js", "tablou-consilier.js", "tablou-banii.js"]) assert.ok(MODULE_TABLOU.includes(f), f);
  const i = HTML.indexOf('<script src="/lib/tablou-banii.js"></script>'), iApp = HTML.indexOf('<script defer="" src="/app.js">');
  assert.ok(i > 0 && iApp > i, "înaintea lui app.js");
  assert.ok(SW.includes('"/lib/tablou-banii.js"'), "APP_SHELL");
  assert.ok(cuTablou("x").includes("function tbDeseneazaBanii("), "probele vechi îl văd prin cuTablou");
});

await test("C  tablou-banii.js se încarcă singur (doar definiții) și face cele 12 nume", () => {
  assert.equal(NUME.length, 12);
  const c = {}; vm.createContext(c); vm.runInContext(MOD, c);
  assert.deepEqual(Object.keys(c).sort(), NUME.slice().sort());
});

await test("D  niciun nume definit de două ori în app.js + module", () => {
  const def = (src, n) => (src.match(new RegExp("(^|[\\n;])\\s*(?:async\\s+)?function\\s+" + n + "\\s*\\(", "g")) || []).length
    + (src.match(new RegExp("(^|\\n)(?:var|let|const)\\s(?:[^\\n]*?[\\s,])?" + n + "\\s*=", "g")) || []).length;
  const tot = cuTablou(APP);
  for (const n of NUME) { assert.equal(def(APP, n), 0, n + " a rămas în app.js"); assert.equal(def(tot, n), 1, n + ": o singură definiție"); }
});

await test("E  mutat NESCHIMBAT: corpul modulului = rândurile 7058–7197 din app.js la v100.393 (d97d64b2)", () => {
  let vechi; try { vechi = execFileSync("git", ["show", "d97d64b2:public/app.js"], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) { console.log("       (fără git aici — sar comparația la literă)"); return; }
  /* git ține fișierul cu LF, copia de lucru cu CRLF ⇒ comparația pe LF. Dacă modulul se schimbă după mutare, comparația trece pe ISTORIC
     (modulul din commitul mutării), ca la proba v100390 */
  const bloc = vechi.replace(/\r\n/g, "\n").split("\n").slice(7057, 7197).join("\n");
  const corp = MOD.replace(/\r\n/g, "\n"), corpFaraCap = corp.slice(corp.indexOf("*/") + 3).replace(/\n$/, "");
  assert.equal(corpFaraCap, bloc);
  assert.match(APP, /(?:\/\/|\/\*) v100\.394 \(I-940\): banii botului[^\n]*mutat în public\/lib\/tablou-banii\.js/);
});

await test("O  ordinea: niciun cod de nivel 0 din app.js (în afara funcțiilor) nu atinge variabila modulului", () => {
  /* adâncimea acoladelor rând cu rând; șirurile și comentariile scoase înainte de numărat */
  let ad = 0; const sus = [];
  for (const [i, l] of APP.replace(/\r\n/g, "\n").split("\n").entries()) {
    if (ad === 0 && !/^\s*(?:async\s+)?function\s/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l) && VARS.some((v) => new RegExp("\\b" + v + "\\b").test(l))) sus.push(i + 1 + ": " + l.slice(0, 80));
    for (const ch of l.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\*.*?\*\/|\/\/.*$/g, "")) { if (ch === "{") ad++; else if (ch === "}") ad = Math.max(0, ad - 1); }
  }
  assert.deepEqual(sus, []);
});

await test("M  motorul probelor (scripts/lib/motor-pagina.mjs) vede funcțiile din tablou-banii.js", async () => {
  const { incarcaMotor } = await import("./lib/motor-pagina.mjs");
  const m = incarcaMotor({ extra: ["tbScenLichidat", "tbOraCitirii"] });
  assert.ok(m.functii.includes("tbScenLichidat") && m.functii.includes("tbOraCitirii"));
});

await test("F  modulul lucrează singur, fără app.js (citirea la 5 min, ora citirii, scenariul „lichidat”)", () => {
  /* botiNr e din app.js — aici o copie identică, ca modulul să fie probat singur */
  const c = { Math, String, Number, Array, JSON, isFinite, Date, Object, tbStare: { botLa: 0 },
    botiNr: (v) => { if (v == null || v === "" || typeof v === "boolean") return null; const n = +v; return Number.isFinite(n) ? n : null; } };
  vm.createContext(c); vm.runInContext(MOD, c);
  assert.equal(vm.runInContext("TB_EXTRA_MS", c), 300000, "cifrele Pionex se recitesc la 5 min");
  assert.equal(vm.runInContext("tbOraCitirii()", c), "", "fără citire ⇒ nimic");
  c.tbStare.botLa = new Date(2026, 10, 25, 20, 5, 9).getTime();
  assert.equal(vm.runInContext("tbOraCitirii()", c), " · citit 20:05:09");
  assert.equal(vm.runInContext("tbScenLichidat({pret:90},{pretLichidare:'95',directie:'LONG'})", c), true, "long: prețul sub lichidare ⇒ lichidat");
  assert.equal(vm.runInContext("tbScenLichidat({pret:96},{pretLichidare:'95',directie:'long'})", c), false);
  assert.equal(vm.runInContext("tbScenLichidat({pret:100},{pretLichidare:'95',directie:'short'})", c), true, "short: prețul peste lichidare ⇒ lichidat");
  assert.equal(vm.runInContext("tbScenLichidat({pret:100,gol:true},{})", c), true, "golul de preț = lichidat");
  assert.equal(vm.runInContext("tbScenLichidat({pret:100},{})", c), false, "fără lichidare citită ⇒ nu");
});

await test("V  versiunea v100.394 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(pk.version, "100.394.0"); assert.equal(bi.version, "v100.394"); assert.ok(bi.li394 && bi.li394.length > 100, "BUILD_INFO.li394");
  assert.ok((HTML.match(/v100\.394/g) || []).length >= 4); assert.match(SW, /crypto-radar-v100-394/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.394"/);
  assert.match(pk.scripts.test, /npm run test:v100393 && npm run test:v100394 && node scripts\/mutatii\.mjs --doar-tiparele/); assert.equal(pk.scripts["test:v100394"], "node scripts/proba-v100394.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
