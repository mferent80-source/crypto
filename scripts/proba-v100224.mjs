// Proba v100.224 (20.10, el: „fa idei și regimul macro să fie mereu actualizat”):
// (1) pe Piața azi propoziția e rândul mare, fără prefixul „Ce aș face eu”; Scan își păstrează prefixul;
// (2) prețul live stă lângă verb, iar #tbPretViu rămâne în pagină;
// (3) bara de sus a paginilor de zi ascunde cipurile de cercetare;
// (4) cardul macro spune ora doar cu al treilea argument; poarta citește ștampila din macro.la și, dacă e veche, citirea de acum.
// Pragurile 1 % / 20 % / 55 % și cele 30 de minute după o citire reușită nu se mută.
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
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 500)}`); }); }
console.log("\nV100.224 · ecran, regim · proba\n");

const ae = citeste("public", "lib", "acasa-ecran.js");
const verd = ae.slice(ae.indexOf("function acasaVerd"), ae.indexOf("function acCadran"));
const css = citeste("public", "app.css");
const paz = citeste("public", "lib", "asezare-paznic.js");
const app = citeste("public", "app.js");
const idx = citeste("public", "index.html");
const t212 = citeste("public", "lib", "t212-ecran.js");
const scan = citeste("public", "lib", "scan-ecran.js");
const poarta = t212.slice(t212.indexOf("async function t212RegimAdu"), t212.indexOf("function t212MarimeCalc"));

await test("Piața azi: faCe fără prefix; fără faCe eticheta rămâne; Scan își ține „Ce aș face eu”", () => {
  assert.match(verd, /acFac/);
  assert.doesNotMatch(verd, /Ce aș face eu|👉/);
  assert.match(citeste("public", "lib", "acasa.js"), /N-aș porni boți grid noi/);
  assert.match(scan, /scFac">👉 <b>Ce aș face eu:<\/b>/);
  assert.match(css, /#dash \.acVerd \.acFac\{[^}]*font-size:20px/);
  assert.match(css, /#dash \.acVerd:has\(\.acFac\) \.acNiv/);
});
await test("Tablou: #pzPret lângă verb, #tbPretViu rămâne, cipul se ascunde doar cu PAZNIC", () => {
  assert.match(paz, /id="pzPret"/);
  assert.match(paz, /pzPretUmple/);
  assert.match(app, /\$\("pzPret"\)/);
  assert.match(idx, /id="tbPretViu"/);
  assert.match(app, /tbPretViuVal/);
  assert.match(css, /html\.pzDemo #tabloubot \.tbPretViu\{display:none!important\}/);
  assert.match(css, /\.pzPret:empty\{display:none\}/);
});
await test("bara de sus: paginile de zi ascund cercetarea; analiza monedei și laboratorul nu sunt în regulă", () => {
  assert.match(css, /body\.peAcasa:not\(\.acMonedaDeschisa\) \.topLeft/);
  assert.match(css, /body\.peTablou \.topLeft/);
  assert.match(css, /body\.pePaginaNoua #topLive\{display:none!important\}/);
  assert.doesNotMatch(css, /body\.peScan \.topLeft\{display:none/);
  assert.doesNotMatch(css, /body\.peLaborator \.topLeft\{display:none/);
  assert.doesNotMatch(css, /#botStrip\{display:none/);
});
await test("cardul: ora și nota doar cu al treilea argument; două argumente rămân egale", () => {
  const N = 60, T0 = Date.UTC(2026, 7, 1), ZI = 86400000;
  const zil = (f) => Array.from({ length: N }, (_, i) => ({ time: T0 + i * ZI, close: f(i) }));
  const r = MC.scor({ vix: zil(() => 20), tnx: zil(() => 4.5), dxy: zil(() => 100), spy: zil((i) => 100 + i), btc: zil((i) => 100 + i), fg: { valoare: 50 } }, T0);
  const vechi = { cod: "neutru", scor: 1, la: Date.now() - 3 * 3600000 };
  assert.equal(MC.htmlCard(r, vechi), MC.htmlCard(r));
  const la = Date.UTC(2026, 9, 20, 10, 5);
  const ora = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(la));
  const h = MC.htmlCard(r, vechi, la);
  assert.match(h, new RegExp("actualizat " + ora.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(h, /Colectorul n-a publicat regimul de curând\. Asta e citirea de acum\./);
  assert.ok(h.length < 8000);
});
await test("poarta: ștampila din macro.la, citirea de acum când KV e vechi, fără scriere în KV", () => {
  assert.match(poarta, /pc\.la \|\| \(pc\.macro && pc\.macro\.la\)/);
  assert.match(poarta, /t212MacroDin/);
  assert.match(poarta, /viu = true/);
  assert.doesNotMatch(poarta, /trimite|method:\s*"POST"|action=piata",\s*\{/);
  assert.match(t212, /regimul e citirea de acum: colectorul nu l-a publicat în ultimele 2 ore/);
  assert.match(citeste("public", "lib", "actiuni-semnale.js"), /riscPct: 0\.01, motiv: null/);
});
await test("versiunea de la v100.224 în sus și colectorul de la v101.131 în sus", () => {
  const P = JSON.parse(citeste("package.json"));
  const minor = Number(P.version.split(".")[1]);
  assert.ok(minor >= 224);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.(1[3-9]\d|[2-9]\d\d)"/);
  assert.equal((idx.match(new RegExp("v100\\." + minor, "g")) || []).length, 4);
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + minor));
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
