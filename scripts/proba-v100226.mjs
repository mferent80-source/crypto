// Proba v100.226 (20.10, el: „fa idei”): pe T212 poarta recitește KV,
// „publicat” e ora României, candidatul colectorului se spune când diferă de citirea de acum,
// verbul de pe Tablou se rupe sub 550 px ca prețul să-și păstreze lățimea.
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
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.226 · ora ro · proba\n");

const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
const r = MC.scor({ vix: zil(() => 14.8), tnx: zil((i) => (i < N - 22 ? 4.94 : 4.94 + 0.3)), dxy: zil((i) => (i < N - 1 ? 100 : 103.1)), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i * 2), fg: { valoare: 69 } }, T0 + N * ZI);
const la = Date.now() - 10 * 60000;
const oraRo = (t) => new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(t));

await test("publicat e ora României; actualizat e același fus; regimul vechi nu primește publicat", () => {
  const citire = Date.now() - 5 * 60000;
  const h = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la }, citire);
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(h, new RegExp("ora României · actualizat " + escRe(oraRo(citire)) + " · publicat " + escRe(oraRo(la))));
  assert.doesNotMatch(h, /, ora României/);
  const vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r));
  assert.doesNotMatch(MC.htmlCard(r, vechi), /publicat /);
});

await test("candidatul colectorului se spune doar când diferă de citirea de acum, sub fraza de pe Discord", () => {
  assert.equal(r.partial, false);
  const NUME = { riskon: "pofta de risc mare (risk-on)", inclinat: "înclinat spre risc", neutru: "neutru", prudent: "prudent", riskoff: "fuga de risc (risk-off)", stres: "stres" };
  const BANDA = { riskon: 5, inclinat: 4, neutru: 3, prudent: 2, riskoff: 1, stres: 0 };
  const coduri = Object.keys(NUME);
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alt = r.treapta.cod === "prudent" ? "riskoff" : "prudent";
  const laFel = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la, candidat: { cod: alt, la } });
  assert.match(laFel, new RegExp(escRe(NUME[alt]) + " se confirmă la citirea următoare\\."));
  assert.doesNotMatch(laFel, /Colectorul așteaptă/);
  const tinut = coduri.find((c) => Math.abs(BANDA[c] - BANDA[r.treapta.cod]) > 1);
  const cand = coduri.find((c) => c !== tinut && c !== r.treapta.cod);
  const sch = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: cand, la } });
  assert.match(sch, new RegExp("Pe Discord e încă „" + escRe(NUME[tinut]) + "”"));
  assert.doesNotMatch(sch, /se confirmă la citirea următoare\./);
  const linie = sch.match(/Colectorul așteaptă „[^”]+”\./);
  assert.ok(linie, "lipsește fraza colectorului");
  assert.match(linie[0], new RegExp(escRe(NUME[cand])));
  assert.doesNotMatch(linie[0], /!|vezi|null|NaN|-\d/);
  const tacut = MC.htmlCard(r, { cod: tinut, scor: 0, la, candidat: { cod: r.treapta.cod, la } });
  assert.match(tacut, /Pe Discord e încă /);
  assert.doesNotMatch(tacut, /Colectorul așteaptă/);
  assert.match(tacut, new RegExp("<b>" + escRe(r.treapta.text) + "</b>"));
});

await test("poarta citește KV în afara Pieței azi; sub 550 px verbul se rupe și prețul își păstrează coloana", () => {
  const t212 = citeste("public", "lib", "t212-ecran.js");
  const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));
  assert.match(poarta, /typeof acasaPe === "function" && acasaPe\(\)/);
  assert.match(poarta, /r\.acasaLa === semn/);
  assert.match(poarta, /getJSON\("\/api\/istoric-bot\?action=piata"\)/);
  const css = citeste("public", "app.css");
  assert.match(css, /#pzVerdict \.pzVerbRand\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /#pzVerdict \.pzVerb\{white-space:normal;overflow-wrap:break-word;min-width:0\}/);
  assert.match(css, /\.pzVerbRand\{flex-direction:column/);
  assert.match(css, /\.pzVerb\{font-size:30px;line-height:1;font-weight:600;letter-spacing:\.01em;color:var\(--pzT1\);white-space:nowrap\}/);
  assert.match(css, /\.pzPret\{[^}]*white-space:nowrap\}/);
});

await test("versiunea de la v100.226 în sus și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const idx = citeste("public", "index.html");
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 226);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.132"/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
