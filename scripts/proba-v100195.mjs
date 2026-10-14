// Probele v100.195 / colector v101.115 (14.10.2026 seara, el: „REPARA TOATE” după auditul „probă statistică” din premarket_scanner,
// docs/AUDIT-PROBA-TREND-SCOR-2026-10-14.md; plus nr. 1: „DA POȚI FACE NR1” = Trend 12 luni sus, lângă „Ce aș cumpăra azi”):
//  1. jurnalul verdictelor: coșurile zilnice (Trend 12 luni, topul pe sectoare, ideile zilei) se judecă pe ZI, nu pe simbol
//  2. Trend 12 luni: „indiciu”, nu „probat”; bilanțul cu t (> 3,2 pe ≥ 12 ferestre) și ABATEREA scrisă înainte, în Sugestii și pe card
//  3. Scorul zilei: cartela spune când îl poate judeca jurnalul
//  4. cardul Trend 12 luni urcă imediat sub „Ce aș cumpăra azi”
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { trendDinJson } from "./lib/tura-trend.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.195 · auditul de seară reparat + Trend 12 luni sus · proba\n");

const vc = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; vc.window = vc; vm.createContext(vc);
vm.runInContext(citeste("public", "lib", "verdicte.js"), vc);
const V = vc.Verdicte, ZI = 86400000, T0 = Date.parse("2025-01-06T15:00:00Z");
// 20 de nume pe zi, aceleași 20 în fiecare zi; ziua aduce un șoc COMUN (asta e corelația din audit: ICC 0,13 pe date reale)
function cos(sursa, zile, soc, h) {
  const ev = [];
  for (let d = 0; d < zile; d++) for (let k = 0; k < 20; k++) ev.push({ s: sursa, k: "N" + k, n: "top", t: T0 + d * 30 * ZI + k * 1000, h, r: 0, val: soc(d) + (k % 2 ? 0.001 : -0.001) });
  return ev;
}
const gasit = (cal, s, h) => cal.find((c) => c.sursa === s && c.h === h);

await test("coșurile: Trend 12 luni, topul pe sectoare și ideile zilei au `cos`; Poarta și regimul macro rămân pe simbol", () => {
  assert.equal(V.SURSE["trend-12-1"].cos, true); assert.equal(V.SURSE["top-sector"].cos, true); assert.equal(V.SURSE.idei.cos, true);
  assert.ok(!V.SURSE["poarta-t212"].cos && !V.SURSE.macro.cos && !V.SURSE["scor-zi-actiuni"].cos);
});
await test("un șoc comun pe zi NU mai iese „dovedit”: 14 zile × 20 de nume (8 zile +3 %, 6 zile −2 %) ⇒ pe zi p mare; pe simbol ar fi fost ~0", () => {
  const soc = (d) => (d < 8 ? 0.03 : -0.02), ev = cos("trend-12-1", 14, soc, 20), c = gasit(V.calibrare(ev), "trend-12-1", 20);
  assert.equal(c.unitate, "zi"); assert.equal(c.test.stare, "testat"); assert.equal(c.test.unitati, 14, "14 zile independente, nu 20 de simboluri");
  assert.ok(c.test.p > 0.05, "p pe zi = " + c.test.p);
  // aceleași date, judecate ca înainte (simbolul = unitatea): fiecare simbol are aceeași sumă pozitivă ⇒ p minuscul — exact greșeala reparată
  V.SURSE["trend-12-1"].cos = false;
  try { const vechi = gasit(V.calibrare(ev), "trend-12-1", 20); assert.equal(vechi.test.unitati, 20); assert.ok(vechi.test.p < 0.01, "pe simbol p = " + vechi.test.p); }
  finally { V.SURSE["trend-12-1"].cos = true; }
});
await test("sub 12 zile independente ⇒ „puține”, cu numărul zilelor; zilele cu ferestre suprapuse se iau o singură dată", () => {
  const c = gasit(V.calibrare(cos("trend-12-1", 10, () => 0.01, 20)), "trend-12-1", 20);
  assert.equal(c.test.stare, "putine"); assert.equal(c.test.unitati, 10); assert.equal(c.test.minU, 12);
  // 40 de zile la 1 zi distanță, fereastra de 20 de zile de bursă (28 calendaristice) ⇒ doar zilele 0 și 28 rămân
  const ev = []; for (let d = 0; d < 40; d++) for (let k = 0; k < 20; k++) ev.push({ s: "trend-12-1", k: "N" + k, n: "top", t: T0 + d * ZI + k, h: 20, r: 0, val: 0.01 });
  const ns = gasit(V.calibrare(ev), "trend-12-1", 20);
  assert.equal(ns.test.unitati, 2); assert.equal(ns.niveluri[0].n, 40, "toate numele celor 2 zile alese (2 × 20)");
});
await test("v100.196 (🔴2): Poarta T212 se judecă PE ZI (favorabil față de rest în aceeași zi); 2 zile ⇒ „puține”, cu 2 zile amestecate", () => {
  const ev = []; for (let i = 0; i < 80; i++) ev.push({ s: "poarta-t212", k: "S" + (i % 40), n: i % 2 ? "cumpara" : "asteapta", t: T0 + Math.floor(i / 40) * 40 * ZI + i * 1000, h: 5, r: 0, val: i % 2 ? 0.01 : 0 });
  const c = gasit(V.calibrare(ev), "poarta-t212", 5);
  assert.equal(c.unitate, "zi"); assert.equal(c.test.stare, "putine"); assert.equal(c.test.unitati, 2); assert.equal(c.test.minU, 12);
});
await test("pagina jurnalului: la coșuri „puține zile independente încă” / „pe N zile independente”", () => {
  const ce = citeste("public", "lib", "cont-ecran.js");
  assert.match(ce, /puține zile independente încă \(/); assert.match(ce, /"zi independentă", "zile independente"/); assert.match(ce, /var zi1 = r\.unitate === "zi";/);
});

// ── Trend 12 luni: „indiciu”, bilanțul cu t și abaterea ──
const jsonRobot = () => ({ versiune: 1, la: "2026-10-14T08:49:23Z", dataUltimei: "2026-10-13", regim: { peste: true },
  eticheta: "indiciu față de acțiunile din aceeași zi (5 ani: +0,8 % pe 20 de zile, t ≈ 1,5 pe ferestre independente — sub pragul de „probat”); neprobat pe listă istorică; în probă — nu e un buton de cumpărat",
  sectoare: { Technology: 11 }, univers: { n: 588 }, clasament: Array.from({ length: 20 }, (_, i) => ({ s: "T" + i, nume: "Firma " + i, sector: "Technology", pret: 100 + i, m12: 1.2, r60: 0.2, rang: i / 588 })) });
const bilant = { versiune: 1, zile: 130, n20: 110, ferestre20: 6, exces20: -2.1, nulB20: 1.9, diferenta20: { medie: -4.2, interval: [-6, -2.4] }, t20: -2.37, pragT: 3.2,
  abatere: { k: 6, medie: -4.21, prag: -1.8, atinsa: true }, verdict: "în probă" };
await test("tura Trend (colectorul): bilanțul trece t-ul și abaterea; eticheta „indiciu” ajunge întreagă (≤ 240 de caractere)", () => {
  const t = trendDinJson(jsonRobot(), bilant, Date.parse("2026-10-14T12:00:00Z"));
  assert.equal(t.bilant.t20, -2.37); assert.deepEqual(JSON.parse(JSON.stringify(t.bilant.abatere)), { k: 6, medie: -4.21, prag: -1.8, atinsa: true });
  assert.match(t.eticheta, /^indiciu față de acțiunile din aceeași zi/); assert.ok(t.eticheta.endsWith("nu e un buton de cumpărat"), "netăiată");
  assert.equal(trendDinJson(jsonRobot(), { ...bilant, abatere: "x" }, Date.now()).bilant.abatere, null, "abaterea stricată ⇒ nimic");
  assert.ok(!/probat pe 14\.10 față de alte/.test(citeste("scripts", "lib", "tura-trend.mjs")));
});
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, location: { hash: "" } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
await test("Sugestii: regula spune „indiciu” (t ≈ 1,5, sub pragul de „probat”), nu „Probat pe 5 ani”; nota arată t-ul și ABATEREA", () => {
  const h = ctx.sugTrendHtml(trendDinJson(jsonRobot(), bilant, Date.parse("2026-10-14T12:00:00Z")), Date.parse("2026-10-14T12:00:00Z"));
  assert.ok(!/Probat pe 5 ani/.test(h)); assert.match(h, /doar un <b>indiciu<\/b> \(\+0,8% pe 20 de zile, t ≈ 1,5 pe ferestre care nu se suprapun — sub pragul de „probat”\)/);
  assert.match(h, /t −2,4 \(„probat” cere t &gt; 3,2 pe ≥ 12 ferestre\)|t -2,4 \(„probat” cere t &gt; 3,2 pe ≥ 12 ferestre\)/);
  assert.match(h, /ABATERE: media −4,2% sub pragul scris înainte −1,8%/);
  const fara = ctx.sugTrendHtml(trendDinJson(jsonRobot(), { ...bilant, t20: null, abatere: null }, Date.now()), Date.now());
  assert.ok(!/ABATERE/.test(fara) && !/cere t/.test(fara), "fără t / fără abatere ⇒ nimic în plus");
});
await test("cardul din „Piața azi”: ABATEREA apare doar când e atinsă", () => {
  const c = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])), $: () => null, setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {}, addEventListener() {}, document: { getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] } };
  c.window = c; vm.createContext(c); vm.runInContext(citeste("public", "lib", "acasa-ecran.js"), c);
  const x = trendDinJson(jsonRobot(), bilant, Date.parse("2026-10-14T12:00:00Z"));
  const h = c.acTrendZi({ ...x, top: x.top });
  assert.match(h, /<b class="bad">ABATERE<\/b>: media pe 6 ferestre de 20 z, −4,2% față de alte acțiuni, sub pragul scris înainte \(−1,8%\)/);
  assert.ok(!/ABATERE/.test(c.acTrendZi({ ...x, bilant: { ...x.bilant, abatere: { ...x.bilant.abatere, atinsa: false } } })));
});

// ── Scorul zilei ──
await test("Scorul zilei: cartela spune cinstit când îl poate judeca jurnalul (~1 an la 5 zile, ~5 ani la 20)", () => {
  const sz = citeste("public", "lib", "scor-zi.js");
  assert.match(sz, /la 5 zile abia după ~1 an \(verdictele care nu se suprapun\), la 20 de zile după ~5 ani\. Până atunci e un rezumat, nu un semnal\./);
});

// ── nr. 1: Trend 12 luni sus ──
await test("„Piața azi”: cardul Trend 12 luni stă imediat sub „Ce aș cumpăra azi” (în HTML și în ordinea flex), nu mai e în rândul Sectoarelor", () => {
  const idx = citeste("public", "index.html"), css = citeste("public", "app.css");
  assert.match(idx, /<div class="acLegatura acCumpar" id="acCumpar"><\/div><div class="acBloc acTrendSus" id="acTrendZi"><\/div><div class="acLegatura" id="acLegatura"><\/div>/);
  assert.equal((idx.match(/id="acTrendZi"/g) || []).length, 1, "un singur card");
  assert.match(idx, /<div class="acDoua acDouaSug"><div class="acCol"><div class="acBloc" id="acSectoare"><\/div><div class="acBloc" id="acTopSector"><\/div><\/div><div class="acCol"><div class="acBloc acMbBloc" id="acMbSug"><\/div><\/div><\/div>/);
  assert.match(css, /\.pzDemo #acasa>#acCumpar\{order:30\}\.pzDemo #acasa>#acTrendZi\{order:31\}\.pzDemo #acasa>#acLegatura\{order:35\}/);
  assert.match(css, /#dash \.acDouaSug #acSectoare\{order:1\}#dash \.acDouaSug #acMbSug\{order:2\}#dash \.acDouaSug #acTopSector\{order:3\}\}/);
  assert.ok(!/\.acDouaSug #acTrendZi/.test(css));
  const iNou = css.indexOf("#acasa>#acTrendZi{order:31}"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead"); assert.ok(iNou > 0 && iPanda > iNou, "pânda rămâne ultima regulă");
});

await test("versiunile: de la v100.195 în sus peste tot, colectorul de la v101.115, proba în lanțul `test`", () => {   /* v100.196: ≥, nu egal */
  const idx = citeste("public", "index.html"), ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]);
  assert.ok(ver >= 195); assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";'));
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver); assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.ok(!/v100\.194\b/.test(idx)); assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4);
  assert.ok(Number((/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")) || [])[1]) >= 115);
  assert.match(citeste("package.json"), /npm run test:v100194 && npm run test:v100195/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
