// Proba v100.225 (20.10, el: „fa idei”): cache-ul porții urmărește acasa.la,
// candidatul neconfirmat apare pe card fără să ia locul codului ținut,
// ceasul „publicat” e ora din KV cât e proaspătă, prețul de pe Tablou stă pe rândul verbului sub 550 px.
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
console.log("\nV100.225 · confirmă · proba\n");

const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
const r = MC.scor({ vix: zil(() => 14.8), tnx: zil((i) => (i < N - 22 ? 4.94 : 4.94 + 0.3)), dxy: zil((i) => (i < N - 1 ? 100 : 103.1)), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i * 2), fg: { valoare: 69 } }, T0 + N * ZI);
const la = Date.now() - 10 * 60000;

await test("card: publicat doar pe regim proaspăt; candidatul nu schimbă verdictul; cel vechi rămâne egal", () => {
  const ora = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(la));
  const alt = r.treapta.cod === "prudent" ? "riskoff" : "prudent";
  const nume = alt === "prudent" ? "prudent" : "fuga de risc \\(risk-off\\)";
  const h = MC.htmlCard(r, { cod: r.treapta.cod, scor: r.scor, la, candidat: { cod: alt, la } });
  assert.match(h, new RegExp("<b>" + r.treapta.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</b>"));
  assert.match(h, new RegExp("publicat " + ora.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(h, new RegExp(nume + " se confirmă la citirea următoare\\."));
  const vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000, candidat: { cod: "prudent", la: Date.now() - 3 * 3600000 } };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r));
  assert.notEqual(r.treapta.cod, "prudent");
  assert.doesNotMatch(MC.htmlCard(r, { cod: "prudent", scor: -3, la, candidat: { cod: "riskoff", la } }), /se confirmă la citirea următoare\./);
});

await test("poarta: cache-ul ține minte acasa.la; sub 550 px prețul stă pe rândul verbului", () => {
  const t212 = citeste("public", "lib", "t212-ecran.js");
  const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));
  assert.match(poarta, /r\.acasaLa === semn/);
  assert.match(poarta, /acasaLa: semn/);
  const css = citeste("public", "app.css");
  assert.match(css, /#pzVerdict \.pzVerbRand\{display:grid;grid-template-columns:auto minmax\(0,1fr\)/);
  assert.match(css, /#pzVerdict \.pzVerbTxt\{grid-column:1 \/ -1\}/);
  assert.match(css, /\.pzVerbRand\{flex-direction:column/);
});

await test("versiunea v100.225 și colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  const idx = citeste("public", "index.html");
  assert.equal(P.version, "100.225.0");
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.132"/);
  assert.equal((idx.match(/v100\.225/g) || []).length, 4);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-225/);
  assert.match(idx, /v100\.225 · CONFIRMĂ/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /v100\.225/);
  assert.match(citeste("scripts", "lib", "tura-piata.mjs"), /candidat: st\.macroCandidat \|\| null/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
