// Probele v100.192 / colector v101.113 (14.10.2026, el: „fă tot” pe I-622…I-631): rigla Trend în jurnalul verdictelor (20/60 z, peste SPY),
// lista pliată pe telefon, „au intrat” + VECHI în Sugestii, proba de telefon care vede grupurile rupte și secțiunile late, proba PAZNIC
// zilnic din colector, rândul Trend în raportul de duminică. (I-624 și I-625 au PICAT pe criteriile pre-înregistrate ⇒ nimic în cod.)
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
console.log("\nv100.192 · rigla Trend + telefon + PAZNIC zilnic · proba\n");

const ACUM = Date.parse("2026-10-15T06:30:00Z");   // joi 15.10, 09:30 RO ⇒ ziua NY 2026-10-15
function jsonRobot(dataUltimei, n) {
  return { versiune: 1, la: "2026-10-15T00:40:00Z", dataUltimei: dataUltimei || "2026-10-14", regim: { inchidere: 780, sma200: 724, peste: true }, sectoare: { Technology: 11, Energy: 9 },
    raportari: { sursa: "finnhub", n: 800 }, intrari: ["ATI", "GH"], iesiri: [{ s: "DOCN", motiv: "a căzut la top 23,0 %" }],
    clasament: Array.from({ length: n || 20 }, (_, i) => ({ s: "T" + i, nume: "Firma " + i, sector: "Technology", pret: 50 + i, m12: 1.5 - i / 20, m6: 0.4, r60: 0.3, rang: i / 588, spark: [1, 2] })) };
}

// ── jurnalul verdictelor ──
const vctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; vctx.window = vctx; vm.createContext(vctx);
vm.runInContext(citeste("public", "lib", "verdicte.js"), vctx);
await test("I-622 + I-623: sursa trend-12-1 e judecată la 20 și 60 de zile, peste SPY; evaluarea scade randamentul SPY pe aceleași zile; calibrarea o tratează ca test față de zero", () => {
  const S = vctx.Verdicte.SURSE["trend-12-1"]; assert.equal(S.h.join(","), "20,60"); assert.equal(S.masura, "pesteSpy"); assert.match(S.text, /SPY/);
  const t0 = Date.parse("2026-09-01T20:00:00Z"), zi = 86400000;
  const serie = (p0, pas) => Array.from({ length: 70 }, (_, i) => ({ t: t0 + i * zi, o: p0 * (1 + pas * i), h: p0 * (1 + pas * i) * 1.01, l: p0 * (1 + pas * i) * 0.99, c: p0 * (1 + pas * i) }));
  const ev = vctx.Verdicte.evalueaza([{ s: "trend-12-1", k: "NVDA", n: "top", p: 100, t: t0 + 1 }], { NVDA: serie(100, 0.005) }, { SPY: serie(500, 0.002), QQQ: serie(400, 0.01) });
  const e20 = ev.find((x) => x.h === 20); assert.ok(e20, "există evaluarea la 20"); assert.ok(ev.find((x) => x.h === 60), "și la 60"); assert.ok(!ev.find((x) => x.h === 5), "nu la 5");
  assert.ok(Math.abs(e20.val - (e20.r - 0.002 * 19 / (1 + 0.002 * 0))) < 0.02, "val = r − randamentul SPY (nu QQQ): " + e20.val + " / r " + e20.r);
  const cal = vctx.Verdicte.calibrare(ev), c = cal.find((x) => x.sursa === "trend-12-1" && x.h === 20); assert.ok(c); assert.equal(c.masura, "pesteSpy"); assert.equal(c.test.nRest, 0, "test față de zero, nu favorabil contra rest");
  assert.match(citeste("scripts", "lib", "tura-verdicte.mjs"), /reper\.SPY = await incearca\(d, "SPY"[^\n]*yahoo=SPY/, "colectorul aduce seria SPY");
  assert.match(citeste("public", "lib", "cont-ecran.js"), /r\.masura === "pesteSpy" \? "Față de SPY"/, "antetul tabelului");
});

// ── pagina Sugestii ──
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, setTimeout, clearTimeout, TextRo: globalThis.TextRo,
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, location: { hash: "" } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "sugestii-ecran.js"), ctx);
await test("I-627: nota spune „au intrat: ATI, GH” și „au ieșit: DOCN”; EOD de ieri nu e VECHI; EOD de vinerea trecută (3 zile de bursă nepublicate) e VECHI, galben", () => {
  const h = ctx.sugTrendHtml(trendDinJson(jsonRobot("2026-10-14"), null, ACUM), ACUM);
  assert.match(h, /au intrat: ATI, GH · au ieșit: DOCN/); assert.ok(!/VECHI/.test(h), "EOD 14.10 văzut pe 15.10 = proaspăt");
  const v = ctx.sugTrendHtml(trendDinJson(jsonRobot("2026-10-09"), null, ACUM), ACUM);
  assert.match(v, /<b class="sugTrendVechi">VECHI de 3 zile de bursă — robotul n-a publicat<\/b> · EOD 2026-10-09/);
  const l = ctx.sugTrendHtml(trendDinJson(jsonRobot("2026-10-10"), null, Date.parse("2026-10-13T06:30:00Z")), Date.parse("2026-10-13T06:30:00Z"));   // vineri ⇒ luni dimineață
  assert.ok(!/VECHI/.test(l), "EOD de vineri, luni dimineață = proaspăt");
});
await test("I-626: cu 20 de rânduri apare butonul „arată toate 20 ›” (sugTrendTot); cu 10 nu; funcția există și nu crapă fără listă", () => {
  const h = ctx.sugTrendHtml(trendDinJson(jsonRobot("2026-10-14", 20), null, ACUM), ACUM);
  assert.match(h, /<\/ol><button type="button" class="t212BtnLinie sugTrendTotBtn" data-action-click="sugTrendTot\(\)">arată toate 20 ›<\/button>/);
  const h10 = ctx.sugTrendHtml(trendDinJson(jsonRobot("2026-10-14", 10), null, ACUM), ACUM); assert.ok(!/sugTrendTotBtn/.test(h10));
  assert.equal(typeof ctx.sugTrendTot, "function"); ctx.sugTrendTot();
  const css = citeste("public", "app.css");
  assert.match(css, /@media \(max-width:640px\)\{\.sugTrendLista:not\(\.sugTrendTot\) li:nth-child\(n\+11\)\{display:none\}\.sugTrendLista:not\(\.sugTrendTot\)\+\.sugTrendTotBtn\{display:inline-block/);
  assert.match(css, /\.sugTrendVechi\{color:var\(--warn\)/); assert.match(css, /\.sugTrendTotBtn\{display:none\}/);
  const iTrend = css.indexOf(".sugTrendVechi"), iPanda = css.lastIndexOf("@media (max-width:640px){.sugPandaTab thead"); assert.ok(iTrend > 0 && iPanda > iTrend, "pânda rămâne ultima regulă");
});

// ── colectorul + proba de telefon (pe sursă) ──
await test("I-630 + I-631: colectorul rulează proba PAZNIC–lățime o dată pe zi de la 12:00 cât există stare.json, iar raportul de duminică are rândul Trend (nemăsurat ≠ +0,0 %)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /async function turaProbaLatimePaznic\(\)/); assert.match(c, /r\.ora < 12 \|\| probaLatimeStare\.data === r\.data \|\| !fs\.existsSync\(PAZNIC_STARE\)/);
  assert.match(c, /execFile\(process\.execPath, \[path\.join\(RAD, "scripts", "proba-latime-vs-paznic\.mjs"\)\]/); assert.match(c, /turaProbaLatimePaznic\(\)\.catch/);
  assert.match(c, /function liniaTrendRaport\(t, b\)/); assert.match(c, /rap\.linii\.push\(liniaTrendRaport\(t, b\)\)/);
  const src = c.slice(c.indexOf("function liniaTrendRaport"), c.indexOf("async function turaRaport"));
  const f = new Function("cate", src + "; return liniaTrendRaport;")((n, s, p) => globalThis.TextRo.cate(n, s, p));
  assert.equal(f({ dataUltimei: "2026-10-14", regim: { peste: true } }, { n20: 0, ferestre20: 0, diferenta20: { medie: null }, verdict: "în probă" }), "Trend 12 luni (în probă): EOD 2026-10-14 · regim pornit · proba: 0 zile cu rezultat (0 ferestre de 20 z) · în probă");
  assert.equal(f({ dataUltimei: "2026-10-14", regim: { peste: false } }, { n20: 37, ferestre20: 1, diferenta20: { medie: 0.86 }, verdict: "în probă" }), "Trend 12 luni (în probă): EOD 2026-10-14 · regim oprit · proba: 37 de zile cu rezultat (1 fereastră de 20 z), +0,9 % față de univers · în probă");
  assert.equal(f({ dataUltimei: "2026-10-14", regim: null }, null), "Trend 12 luni (în probă): EOD 2026-10-14 · regim oprit · fără bilanț încă");
  const vc = /const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(c); assert.ok(vc && Number(vc[1]) >= 113, "colector v101.113+");
});
await test("I-628: proba de telefon numără grupurile nelegabile rupte și secțiunile care ies din ecran și pică pe ele; pozele înalte doar la cerere", () => {
  const p = citeste("scripts", "proba-ecran-telefon.mjs");
  assert.match(p, /cs\.whiteSpace === "nowrap" && cs\.display === "inline" && e\.getClientRects\(\)\.length > 1/);
  assert.match(p, /querySelectorAll\("\.rlSec, section"\)[^\n]*getBoundingClientRect\(\)\.right > W \+ 1/);
  assert.match(p, /if \(r\.nRupte\) rele\.push/); assert.match(p, /if \(r\.nLate\) rele\.push/); assert.match(p, /PROBA_POZE_INALTE \? \{ format: "png", captureBeyondViewport: true \}/);
});
await test("versiunile: v100.192 peste tot, lanțul npm test cu proba nouă", () => {
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 192);
  const idx = citeste("public", "index.html"); assert.ok(!/v100\.191\b/.test(idx)); assert.match(idx, /v100\.(19[2-9]|[2-9]\d\d)/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-(19[2-9]|[2-9]\d\d)/); assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.(19[2-9]|[2-9]\d\d)"/); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(19[2-9]|[2-9]\d\d)"/);
  assert.match(citeste("package.json"), /npm run test:v100191 && npm run test:v100192/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
