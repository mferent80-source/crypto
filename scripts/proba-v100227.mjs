// Proba v100.227 (20.10, el: „fa idei”): pe Piața azi copia ține cât ACASA_MS,
// ambele ceasuri sunt ora României, candidatul stă în fraza de pe Discord,
// verbul de pe Tablou se rupe la cuvânt.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
const MC = ctx.Macro;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.227 · ceas · proba\n");

const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
const r = MC.scor({ vix: zil(() => 14.8), tnx: zil((i) => (i < N - 22 ? 4.94 : 4.94 + 0.3)), dxy: zil((i) => (i < N - 1 ? 100 : 103.1)), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i * 2), fg: { valoare: 69 } }, T0 + N * ZI);
const la = Date.now() - 10 * 60000;
const oraRo = (t) => new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(t));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

await test("ambele ceasuri sunt ora României, eticheta o dată, înaintea lor", () => {
  const citire = Date.now() - 5 * 60000;
  const h = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la }, citire);
  assert.match(h, new RegExp("ora României · actualizat " + escRe(oraRo(citire)) + " · publicat " + escRe(oraRo(la))));
  assert.equal((h.match(/ora României/g) || []).length, 1);
  const doar = MC.htmlCard(r, { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 }, citire);
  assert.match(doar, new RegExp("ora României · actualizat " + escRe(oraRo(citire))));
  assert.doesNotMatch(doar, / · publicat /);
  const vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r));
  assert.doesNotMatch(MC.htmlCard(r, vechi), /ora României|publicat /);
});

await test("candidatul stă în fraza de pe Discord, nu într-un al doilea rând", () => {
  assert.equal(r.partial, false);
  const NUME = { riskon: "pofta de risc mare (risk-on)", inclinat: "înclinat spre risc", neutru: "neutru", prudent: "prudent", riskoff: "fuga de risc (risk-off)", stres: "stres" };
  const BANDA = { riskon: 5, inclinat: 4, neutru: 3, prudent: 2, riskoff: 1, stres: 0 };
  const coduri = Object.keys(NUME);
  const tinut = coduri.find((c) => Math.abs(BANDA[c] - BANDA[r.treapta.cod]) > 1);
  const cand = coduri.find((c) => c !== tinut && c !== r.treapta.cod);
  const sch = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: cand, la } });
  assert.match(sch, new RegExp("<p class=\"acEt\">Pe Discord e încă „" + escRe(NUME[tinut]) + "”\\."));
  assert.match(sch, new RegExp("Colectorul așteaptă „" + escRe(NUME[cand]) + "”\\."));
  assert.doesNotMatch(sch, /<\/p><p class="acEt">Colectorul așteaptă/);
  assert.doesNotMatch(sch, /se confirmă la citirea următoare\./);
  assert.match(sch, new RegExp("<b>" + escRe(r.treapta.text) + "</b>"));
  const tacut = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: r.treapta.cod, la } });
  assert.match(tacut, /Pe Discord e încă /);
  assert.doesNotMatch(tacut, /Colectorul așteaptă/);
  const alt = r.treapta.cod === "prudent" ? "riskoff" : "prudent";
  const laFel = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la, candidat: { cod: alt, la } });
  assert.match(laFel, new RegExp(escRe(NUME[alt]) + " se confirmă la citirea următoare\\."));
  assert.doesNotMatch(laFel, /Pe Discord e încă |Colectorul așteaptă/);
});

await test("poarta ține copia paginii doar cât ACASA_MS; verbul de pe Tablou se rupe la cuvânt", () => {
  const t212 = citeste("public", "lib", "t212-ecran.js");
  const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));
  assert.match(poarta, /typeof ACASA_MS === "number" && ACASA_MS > 0 \? ACASA_MS : 5 \* 60000/);
  assert.match(poarta, /await getJSON\("\/api\/istoric-bot\?action=piata"\)/);
  assert.match(poarta, /acasaLa: semn/);
  assert.doesNotMatch(poarta, /r\.acasaLa === semn/);
  assert.doesNotMatch(poarta, /10 \* 60000/);
  const css = citeste("public", "app.css");
  assert.match(css, /#pzVerdict \.pzVerb\{order:1;white-space:nowrap/);
  assert.match(css, /@media \(max-width:550px\)\{\.pzVerb\{white-space:normal;overflow-wrap:break-word\}\}/);
  assert.match(css, /\.pzPret\{[^}]*white-space:nowrap\}/);
});

await test("versiunea de la v100.227 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const idx = citeste("public", "index.html");
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 227);
  assert.equal((P.scripts.test.match(/test:v100227/g) || []).length, 1);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.(13[2-9]|1[4-9]\d)"/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp("v100\\." + minor));
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
