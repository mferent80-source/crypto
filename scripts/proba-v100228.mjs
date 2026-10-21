// Proba v100.228 (20.10, el: „fa idei”): fiecare poartă cere KV,
// fraza de pe Discord e scurtă, verbul de pe Tablou nu se rupe, antetele se rup la cuvânt.
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
console.log("\nV100.228 · rând · proba\n");

const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
const r = MC.scor({ vix: zil(() => 14.8), tnx: zil((i) => (i < N - 22 ? 4.94 : 4.94 + 0.3)), dxy: zil((i) => (i < N - 1 ? 100 : 103.1)), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i * 2), fg: { valoare: 69 } }, T0 + N * ZI);
const la = Date.now() - 10 * 60000;
const oraRo = (t) => new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(t));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

await test("poarta cere KV la fiecare apăsare; copia paginii e doar rezerva", () => {
  const t212 = citeste("public", "lib", "t212-ecran.js");
  const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));
  assert.match(poarta, /typeof ACASA_MS === "number" && ACASA_MS > 0 \? ACASA_MS : 5 \* 60000/);
  assert.match(poarta, /try \{ pc = await getJSON\("\/api\/istoric-bot\?action=piata"\); \} catch \(e\) \{\}/);
  assert.match(poarta, /if \(!\(pc && pc\.macro && pc\.macro\.cod\) && paginaProaspata && ac && ac\.piataCol && ac\.piataCol\.macro\) pc = ac\.piataCol;/);
  assert.ok(poarta.indexOf("await getJSON(\"/api/istoric-bot?action=piata\")") < poarta.indexOf("pc = ac.piataCol"));
  assert.match(poarta, /acasaLa: semn/);
  assert.doesNotMatch(poarta, /r && paginaProaspata && r\.acasaLa === semn/);
  assert.doesNotMatch(poarta, /paginaProaspata && ac && ac\.piataCol && ac\.piataCol\.macro \? ac\.piataCol/);
  assert.doesNotMatch(poarta, /return r/);
  assert.doesNotMatch(poarta, /10 \* 60000/);
});

await test("fraza de pe Discord e scurtă și stă într-un singur rând", () => {
  assert.equal(r.partial, false);
  const NUME = { riskon: "pofta de risc mare (risk-on)", inclinat: "înclinat spre risc", neutru: "neutru", prudent: "prudent", riskoff: "fuga de risc (risk-off)", stres: "stres" };
  const BANDA = { riskon: 5, inclinat: 4, neutru: 3, prudent: 2, riskoff: 1, stres: 0 };
  const coduri = Object.keys(NUME);
  const tinut = coduri.find((c) => Math.abs(BANDA[c] - BANDA[r.treapta.cod]) > 1);
  const cand = coduri.find((c) => c !== tinut && c !== r.treapta.cod);
  const sch = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: cand, la } });
  const fraza = "<p class=\"acEt\">Pe Discord e încă „" + NUME[tinut] + "”. Colectorul așteaptă „" + NUME[cand] + "”.</p>";
  assert.match(sch, new RegExp(escRe(fraza)));
  assert.doesNotMatch(fraza, /3 ore|se anunță/);
  assert.doesNotMatch(sch, /se anunță|se confirmă la citirea următoare\./);
  assert.match(sch, /Între două alerte de regim trec cel puțin 3 ore\./);
  assert.equal((sch.match(/3 ore/g) || []).length, 1);
  assert.doesNotMatch(sch, /<\/p><p class="acEt">Colectorul așteaptă/);
  assert.doesNotMatch(fraza, /!|vezi|null|NaN|-\d/);
  assert.match(sch, new RegExp("<b>" + escRe(r.treapta.text) + "</b>"));
  const tacut = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: r.treapta.cod, la } });
  assert.match(tacut, new RegExp("<p class=\"acEt\">Pe Discord e încă „" + escRe(NUME[tinut]) + "”\\.</p>"));
  assert.doesNotMatch(tacut, /Colectorul așteaptă/);
  const alt = r.treapta.cod === "prudent" ? "riskoff" : "prudent";
  const laFel = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la, candidat: { cod: alt, la } });
  assert.match(laFel, new RegExp(escRe(NUME[alt]) + " se confirmă la citirea următoare\\."));
  assert.doesNotMatch(laFel, /Pe Discord e încă |Colectorul așteaptă/);
  const citire = Date.now() - 5 * 60000;
  const h = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la }, citire);
  assert.match(h, new RegExp("ora României · actualizat " + escRe(oraRo(citire)) + " · publicat " + escRe(oraRo(la))));
  const vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r));
  assert.doesNotMatch(MC.htmlCard(r, vechi, citire), / · publicat /);
});

await test("sub 550 px verbul de pe Tablou nu se rupe; celelalte antete se rup la cuvânt", () => {
  const css = citeste("public", "app.css");
  assert.match(css, /#pzVerdict \.pzVerbRand\{display:flex;flex-direction:row;flex-wrap:wrap;column-gap:12px;row-gap:6px;align-items:center\}/);
  assert.match(css, /#pzVerdict \.pzVerb\{order:1;white-space:nowrap;flex:0 0 auto\}/);
  assert.match(css, /#pzVerdict \.pzPret\{order:2;margin-left:auto\}/);
  assert.match(css, /#pzVerdict \.pzVerbTxt\{order:3;flex:1 0 100%\}/);
  assert.match(css, /\.pzVerbRand\{flex-direction:column/);
  assert.match(css, /\.pzPret\{[^}]*white-space:nowrap\}/);
  assert.match(css, /@media \(max-width:550px\)\{\.pzVerb\{white-space:normal;overflow-wrap:normal;word-break:keep-all\}\}/);
  assert.match(css, /@media \(max-width:550px\)\{\.pzAntet \.pzVerb\{max-width:none;overflow:visible;overflow-wrap:normal;word-break:keep-all\}\}/);
  assert.doesNotMatch(css, /@media \(max-width:550px\)\{\.pzVerb\{[^}]*overflow-wrap:break-word/);
  assert.doesNotMatch(css, /@media \(max-width:550px\)\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.pzAntet \.pzVerb\{white-space:normal;overflow-wrap:break-word;max-width:62%\}/);
  assert.doesNotMatch(css, /#pzVerdict \.pzVerb\{white-space:normal/);
  assert.doesNotMatch(css, /#pzVerdict \.pzVerbRand\{display:grid/);
});

await test("versiunea de la v100.228 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const idx = citeste("public", "index.html");
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 228);
  assert.equal(P.scripts["test:v100228"], "node scripts/proba-v100228.mjs");
  assert.equal((P.scripts.test.match(/test:v100228/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100227/g) || []).length, 1);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.13[2-9]"/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp("VERSIUNE = \"v100\\." + minor + "\""));
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100." + minor);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
