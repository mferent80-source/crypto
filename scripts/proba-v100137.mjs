// Proba v100.137 (08.10, el: „în Tabloul botului mută graficul să fie primul sub rezultate și fă să meargă ușor să schimb time frame-urile”;
// a ales „intervale ca în TradingView”): (a) rândul graficului imediat sub KPI-uri, înaintea consilierului; (b) intervale 5m · 15m · 1h · 4h · 1z,
// fiecare cu perioada lui, lumânările ținute minte pe interval (schimbarea e instantă) și aduse din spate pentru celelalte; (c) butoane mari.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const HTML = citeste("public", "index.html"), APP = citeste("public", "app.js"), CSS = citeste("public", "app.css");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.137 · Tablou: graficul sub rezultate, intervale ca în TradingView, schimbare instantă · proba\n");

await test("(a) rândul graficului (cu „Ce spune graficul acum” și trendul) vine imediat după KPI-uri, înaintea consilierului", () => {
  const sec = HTML.slice(HTML.indexOf('<section class="panel" id="tabloubot">'), HTML.indexOf('<section class="panel" id="t212">'));
  const iSus = sec.indexOf('<div class="tbSus">'), iGr = sec.indexOf('<div class="tbGraficRand"'), iSem = sec.indexOf('id="tbSemaforCard"'), iCc = sec.indexOf('id="tbConcret"');
  assert.ok(iSus > 0 && iGr > 0 && iSem > 0, "blocurile există");
  assert.ok(iSus < iGr && iGr < iSem, "ordinea: KPI (" + iSus + ") → grafic (" + iGr + ") → consilier (" + iSem + ")");
  assert.doesNotMatch(sec.slice(iSus, iGr), /<section/, "între KPI și grafic nu mai stă nimic");
  assert.ok(iCc < 0 || iCc > iGr, "„Acum, concret” rămâne după grafic");
  assert.equal((sec.match(/class="tbGraficRand"/g) || []).length, 1, "o singură dată");
});
await test("(b1) butoanele de interval: 5m · 15m · 1h · 4h · 1z, cu perioada în title; cele vechi (24 ore / 3 zile / 7 zile) nu mai sunt", () => {
  assert.match(HTML, /<div class="tbInterval tbTf" role="group" aria-label="Intervalul lumânărilor">/);
  for (const [id, et, cat] of [["5M", "5m", "24 de ore"], ["15M", "15m", "3 zile"], ["60M", "1h", "7 zile"], ["4H", "4h", "30 de zile"], ["1D", "1z", "200 de zile"]])
    assert.match(HTML, new RegExp('<button type="button" class="tbIntBtn" id="tbInt' + id + '" aria-pressed="(true|false)" data-action-click="tbAlegeInterval\\(\'' + id + '\'\\)" title="[^"]*' + cat + '[^"]*">' + et + '</button>'), id);
  assert.match(HTML, /id="tbInt5M" aria-pressed="true"/, "5m e cel apăsat la pornire, ca înainte (24 de ore)");
  assert.doesNotMatch(HTML, /id="tbInt24h"|id="tbInt3z"|id="tbInt7z"|tbAlegeInterval\('24h'\)/);
});
await test("(b2) app: TB_PERIOADE pe intervale (5M/15M/60M/4H/1D, fiecare cu perioada și eticheta axei), cheile vechi mapate, fără „24h” implicit împrăștiat", () => {
  assert.match(APP, /var TB_PERIOADE=\{"5M":\{i:"5M",l:288,per:"24h",[^}]*\},"15M":\{i:"15M",l:288,per:"3z",[^}]*\},"60M":\{i:"60M",l:168,per:"7z",[^}]*\},"4H":\{i:"4H",l:180,per:"30z",[^}]*\},"1D":\{i:"1D",l:200,per:"200z",[^}]*\}\}/);
  assert.match(APP, /var TB_TF_VECHI=\{"24h":"5M","3z":"15M","7z":"60M"\}/);
  assert.match(functie(APP, "tbTf"), /TB_PERIOADE\[tbStare\.graficInterval\]/); assert.doesNotMatch(APP, /graficInterval\|\|"24h"/);
  assert.match(APP, /per:TB_PERIOADE\[tbTf\(\)\]\.per,semafor:tbSemaforTf\(b\),tfGrafic:TB_PERIOADE\[tbTf\(\)\]\.i,trendIstoric:tbTrendIstoric\(b\)/);
  assert.match(APP, /semClic:\{"5M":"tbAlegeInterval\('5M'\)","15M":"tbAlegeInterval\('15M'\)","60M":"tbAlegeInterval\('60M'\)","4H":"tbAlegeInterval\('4H'\)","1D":"tbAlegeInterval\('1D'\)"\}/, "becurile de pe grafic comută și pe 4h / 1z");
});
await test("(b3) schimbarea e instantă: lumânările stau în tbStare.graficCache pe simbol|interval, tbAlegeInterval le arată pe loc (fără la=0), tbAduGraficul le aduce din spate pe celelalte", () => {
  assert.match(APP, /var tbStare=\{[^\n]*graficCache:\{\}/);
  const al = functie(APP, "tbAlegeInterval"); assert.match(al, /TB_TF_VECHI\[/); assert.match(al, /tbStare\.graficCache\[/); assert.doesNotMatch(al, /\.la=0/); assert.match(al, /renderTabloGrafic\(\)/);
  const ad = functie(APP, "tbAduGraficul"); assert.match(ad, /tbStare\.graficCache\[cheieG\]=/); assert.match(ad, /tbPreiaRestulTf\(/);
  const pr = functie(APP, "tbPreiaRestulTf"); assert.match(pr, /pionex_klines/); assert.match(pr, /tbPanouVizibil\(\)/); assert.match(pr, /graficPrefetch/); assert.match(pr, /tbStare\.graficCache\[/);
  assert.match(functie(APP, "tbAlegeBot"), /graficCache=\{\}/, "alt bot ⇒ cache gol (nu lumânările altei monede)");
});
await test("(c) butoanele de interval sunt mari (apăsabile cu degetul) și pe telefon umplu rândul", () => {
  assert.match(CSS, /#tabloubot #tbGraficCard \.tbTf \.tbIntBtn\{[^}]*min-width:44px[^}]*\}/);
  assert.match(CSS, /@media \(max-width:640px\)\{#tabloubot #tbGraficCard \.tbTf\{width:100%\}#tabloubot #tbGraficCard \.tbTf \.tbIntBtn\{flex:1 1 0;min-width:0\}\}/);
});
await test("(E) versiunea de la v100.137 în sus (colectorul neatins)", () => {
  assert.match(HTML, /content="v100\.1(3[7-9]|[4-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(3[7-9]|[4-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(3[7-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[7-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[7-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[7-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[7-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
