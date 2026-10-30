// Proba v100.272-d (ideile auditului 29.10, felia 6 - motorul vechi) - cinci reparații, fiecare cu testul care pica pe codul de dinainte.
//  1. Scannerul vechi (butonul de pe Scan: rapid, adânc, acțiuni) și Market overview socoteau scorul pe bara ÎN FORMARE, analiza pe bare
//     închise (bareInchise) ⇒ aceeași monedă avea alt scor în listă și în analiză și se repicta. Măsurat pe 840 de bare de 4 h reale (70 de
//     monede Pionex): bara în formare mută scorul cu mediana 3,8 / p90 15,6 puncte și schimbă verdictul în 17,9% din cazuri; lungimea istoriei
//     (320 vs 750 de bare închise) îl schimbă în 0,5% ⇒ scannerul rapid și Market overview iau și ei câte bare ia analiza.
//  2. Backtestul (backtestCurrent) punea sus expectanța, PF-ul și DD-ul pe TOT eșantionul, inclusiv pe cei 60% pe care s-a ales pragul;
//     acum întâi partea nevăzută (OOS), cu „insuficient” sub 30 de tranzacții; tot eșantionul rămâne, sub ea, marcat „include partea de alegere”.
//  3. „Risk / reward” în Verdict Center: TP2 = 1,8 × riscul prin construcție (buildTradeMap) ⇒ avertismentul „< 1,2” nu se putea aprinde.
//     Rândul spune acum că e prin construcție; avertismentul rămâne doar pentru o hartă care NU e construită așa.
//  4. Dispecerul data-action-* chema ORICE funcție globală (eval, setTimeout cu text…); acum doar lista albă ACTIUNI_PERMISE, adunată din ce
//     folosesc azi index.html, app.js și public/lib (proba le enumeră singură, ca să nu pice niciun buton). Argumentele text din atribute trec
//     prin argActiune (escaparea pentru JS-în-atribut), nu prin escapeHtml.
//  5. Paleta Ctrl+K: comenzile sunt opțiuni ARIA (listbox / option, câmpul e combobox), se ating cu Tab, săgețile / Home / End mută focusul,
//     Enter (sau Spațiu pe o comandă) o pornește, Escape închide și întoarce focusul.
// Funcțiile se iau din public/app.js după text și rulează în vm cu dependențele injectate (ca proba-v100267-b / proba-v100269-v).
// PROBA_APP_JS / PROBA_INDEX_HTML / PROBA_APP_CSS = copii mutate (pentru mutații); PROBA_DOAR=1a,4c rulează doar acele teste.
// `node scripts/proba-v100272-d.mjs --lista` tipărește acțiunile găsite (lista albă, gata de lipit în app.js).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import { pandaInainteaCozii } from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const dinEnv = (v, ...p) => (process.env[v] ? fs.readFileSync(process.env[v], "utf8").replace(/\r\n/g, "\n") : citeste(...p));
const APP = dinEnv("PROBA_APP_JS", "public", "app.js");
const HTML = dinEnv("PROBA_INDEX_HTML", "public", "index.html");
const CSS = dinEnv("PROBA_APP_CSS", "public", "app.css");
const LIB = fs.readdirSync(path.join(RAD, "public", "lib")).filter((f) => f.endsWith(".js")).sort().map((f) => ["public/lib/" + f, citeste("public", "lib", f)]);

/* de la „function nume(” (sau „async function nume(”) la început de rând până unde declarația se încheie: se adaugă rânduri până compilează
   (codul de după funcție - const-uri, ascultători - nu intră; un comentariu care conține „function nume(” nu păcălește: căutarea e la început de rând) */
const fnApp = (nume) => {
  const i = APP.search(new RegExp("\\n(async )?function " + nume.replace(/\$/g, "\\$") + "\\(")); assert.ok(i >= 0, "lipsește " + nume + " în app.js");
  const r = APP.slice(i + 1).split("\n"); let s = "";
  for (let k = 0; k < r.length && k < 4000; k++) { s += (k ? "\n" : "") + r[k]; try { new vm.Script(s); return s; } catch { /* încă neterminată */ } }
  throw Error("nu pot închide " + nume);
};
const areFn = (nume) => new RegExp("\\n(async )?function " + nume.replace(/\$/g, "\\$") + "\\(").test(APP);
const blocApp = (inceput) => { const i = APP.indexOf("\n" + inceput); if (i < 0) return null; const r = APP.slice(i + 1).split("\n"); let s = ""; for (let k = 0; k < r.length && k < 400; k++) { s += (k ? "\n" : "") + r[k]; try { new vm.Script(s); return s; } catch { /* încă */ } } return null; };

let teste = 0, picate = 0;
const DOAR = String(process.env.PROBA_DOAR || "").split(",").filter(Boolean), LISTA = process.argv.includes("--lista");
async function test(nume, f) {
  if (LISTA || (DOAR.length && !DOAR.includes(nume.split(" ")[0]))) return;
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class El {
  constructor() { this.textContent = ""; this.className = ""; this.innerHTML = ""; this.hidden = false; this.style = {}; this.children = []; this.value = ""; }
  append(...x) { this.children.push(...x); } appendChild(x) { this.children.push(x); return x; } replaceChildren(...x) { this.children = [...x]; }
}
/* o lume vm: funcțiile cerute + ce le lipsește, adăugat la prima ReferenceError (doar funcții declarate în app.js) */
function lumeApp(box, nume) {
  vm.createContext(box);
  const are = new Set();
  const adauga = (n) => { if (are.has(n)) return; are.add(n); vm.runInContext(fnApp(n), box, { filename: n + ".js" }); };
  nume.forEach(adauga);
  box.__adauga = adauga;
  return box;
}
async function cuDependinte(box, f) {
  for (let k = 0; k < 150; k++) {
    try { return await f(); } catch (e) { const m = /^(\w+) is not defined$/.exec(e && e.message || ""); if (!m || !areFn(m[1])) throw e; box.__adauga(m[1]); }
  }
  throw Error("prea multe dependențe");
}

console.log("\nV100.272-d · AUDITUL 29.10 · felia 6: scorul pe bare închise, OOS întâi, R/R, lista albă a acțiunilor, paleta din tastatură\n");

// ═════════════ 1. scannerul vechi + Market overview pe bare închise ═════════════
const ANALYZE = fnApp("analyze");
const LIM_ANALIZA = (() => { const m = /analysisKlines\(sym,t,(\d+),src\)/.exec(ANALYZE); assert.ok(m, "nu găsesc câte bare ia analyze()"); return +m[1]; })();
assert.match(ANALYZE, /bareInchise\(j,t,Date\.now\(\),src\)/, "analyze() nu mai calculează pe bareInchise - proba trebuie revăzută");
const TF_MIN = { "15m": 15, "1h": 60, "4h": 240, "1d": 1440 };
/* 1000 de bare ÎNCHISE (ora de deschidere, ca Binance) + o bară în formare deschisă în intervalul curent, cu o mișcare de `formare` */
function serie(tf, seed, formare) {
  const ms = TF_MIN[tf] * 60000, r = mulberry32(seed), g = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const t0 = Math.floor(Date.now() / ms) * ms, bare = []; let p = 100;
  for (let k = 1000; k >= 1; k--) {
    const t = t0 - k * ms, o = p, c = o * Math.exp(0.012 * g() + 0.0003), h = Math.max(o, c) * (1 + Math.abs(0.004 * g())), l = Math.min(o, c) * (1 - Math.abs(0.004 * g()));
    bare.push([t, String(o), String(h), String(l), String(c), String(1000 + 800 * r()), t + ms - 1, String(c * 1000)]); p = c;
  }
  const o = p, c = o * formare;
  bare.push([t0, String(o), String(Math.max(o, c)), String(Math.min(o, c)), String(c), "9000", t0 + ms - 1, String(c * 9000)]);
  return bare;
}
async function lumeScan(formare = 1.08) {
  const SER = {}; let s = 11; for (const tf of Object.keys(TF_MIN)) SER[tf] = serie(tf, s++, formare);
  const els = {}, $ = (id) => (els[id] ??= new El()); $("mode").value = "auto";
  /* cererile de lumânări [tf, câte bare]: pe date sintetice 320 vs 750 de bare dau de obicei același scor (pe date reale 99,5%),
     deci „aceeași intrare ca analiza” se verifică și direct, pe numărul de bare cerut */
  const cereri = [];
  const box = lumeApp({
    console, Math, Number, Array, Object, JSON, Date, String, Map, Set, Error, Promise, isFinite, $,
    klines: async (sym, tf, l) => { cereri.push([tf, l]); return SER[tf].slice(-l); }, analysisSource: () => "BINANCE", assetClass: () => "CRYPTO",
    analysisTicker: async () => ({ lastPrice: "100", priceChangePercent: "1.5" }), renderMarketOverview: () => {}, marketCache: { ts: 0, rows: [], source: null },
  }, ["pionexScanFast", "pionexScanDeep", "pionexUniverseBinanceKlines", "scannerStatsFrom4h", "mtfComposite", "analysisMtfData", "analysisKlines", "bareInchise", "calc", "loadMarketOverview", "stockRowFromSeries"]);
  /* scannerul adânc și Market overview înghit erorile (try/catch pe fiecare monedă / interval) ⇒ dependențele lui calc se încarcă dinainte */
  await cuDependinte(box, () => box.calc(box.bareInchise(SER["4h"].slice(-300), "4h", Date.now(), "BINANCE"), "auto"));
  return { box, SER, els, cereri };
}
const cereri4h = (c) => c.filter((x) => x[0] === "4h").map((x) => x[1]);
/* scorul pe care îl arată analiza (analyze(): analysisKlines(sym,t,LIM,src) ⇒ bareInchise ⇒ calc) */
const scorAnaliza = (box, sym, tf) => cuDependinte(box, async () => { const j = await box.analysisKlines(sym, tf, LIM_ANALIZA, "BINANCE"); return box.calc(box.bareInchise(j, tf, Date.now(), "BINANCE"), "auto"); });
const ITEM = { base: "BTC", symbol: "BTC_USDT" };

await test("1a scannerul RAPID: scorul din listă = scorul analizei pe 4h pentru aceeași monedă", async () => {
  const { box, cereri } = await lumeScan();
  const r = await cuDependinte(box, () => box.pionexScanFast(ITEM)), cer = cereri4h(cereri), a = await scorAnaliza(box, "BTCUSDT", "4h");
  assert.ok(cer.length && cer.every((l) => l === LIM_ANALIZA), `scannerul cere ${cer.join(",")} bare de 4 h, analiza ${LIM_ANALIZA}`);
  assert.equal(r.avg, a.score, `listă ${r.avg}, analiză ${a.score}`);
  assert.equal(r.dir, a.ver);
});
await test("1b scannerul RAPID nu se repictează: aceeași istorie închisă, bara în formare +8% sau −8% ⇒ același scor", async () => {
  const sus = await lumeScan(1.08), jos = await lumeScan(0.92);
  const a = await cuDependinte(sus.box, () => sus.box.pionexScanFast(ITEM)), b = await cuDependinte(jos.box, () => jos.box.pionexScanFast(ITEM));
  assert.equal(a.avg, b.avg, `+8%: ${a.avg} · −8%: ${b.avg}`);
});
await test("1c scannerul ADÂNC: scorul MTF din listă = Weighted Multi-TF din analiză (analysisMtfData, bare închise pe fiecare interval)", async () => {
  const sus = await lumeScan(1.08), jos = await lumeScan(0.92);
  const r = await cuDependinte(sus.box, () => sus.box.pionexScanDeep(ITEM));
  const mc = sus.box.mtfComposite(await cuDependinte(sus.box, () => sus.box.analysisMtfData("BTCUSDT", "BINANCE")));
  assert.equal(r.avg, mc.avg, `listă ${r.avg}, analiză ${mc.avg}`);
  assert.equal(r.dir, mc.comp);
  const r2 = await cuDependinte(jos.box, () => jos.box.pionexScanDeep(ITEM));
  assert.equal(r.avg, r2.avg, "scannerul adânc se repictează cu bara în formare");
});
await test("1d Market overview: scorul plăcii = scorul analizei pe 4h; bara în formare nu-l mută", async () => {
  const sus = await lumeScan(1.08), jos = await lumeScan(0.92);
  await cuDependinte(sus.box, () => sus.box.loadMarketOverview(true)); await cuDependinte(jos.box, () => jos.box.loadMarketOverview(true));
  const cer = cereri4h(sus.cereri);
  assert.ok(cer.length >= 12 && cer.every((l) => l === LIM_ANALIZA), `plăcile cer ${[...new Set(cer)].join(",")} bare de 4 h, analiza ${LIM_ANALIZA}`);
  const t = sus.box.marketCache.rows.find((x) => x.c === "BTC"), t2 = jos.box.marketCache.rows.find((x) => x.c === "BTC"), a = await scorAnaliza(sus.box, "BTCUSDT", "4h");
  assert.ok(t && t2, "placa BTC lipsește");
  assert.equal(sus.box.marketCache.rows.length, 12, "Market overview a pierdut plăci");
  assert.equal(t.score, a.score, `placă ${t.score}, analiză ${a.score}`);
  assert.equal(t.ver, a.ver);
  assert.equal(t.score, t2.score, "placa se repictează cu bara în formare");
  assert.equal(t.price, 100, "prețul plăcii rămâne cel viu (tickerul)");
});
await test("1e scannerul de acțiuni: bara zilei în curs (Twelve Data, ora închiderii în viitor) nu intră în scor", async () => {
  const { box } = await lumeScan();
  const r = mulberry32(5), acum = Date.now(), rows = []; let p = 100;
  for (let k = 259; k >= 1; k--) { const o = p, c = o * (1 + (r() - 0.5) * 0.04); rows.push([acum - k * 86400000, String(o), String(Math.max(o, c) * 1.005), String(Math.min(o, c) * 0.995), String(c), String(1e6)]); p = c; }
  rows.push([acum + 3600000, String(p), String(p * 1.09), String(p), String(p * 1.09), "3000000"]);
  const x = await cuDependinte(box, () => box.stockRowFromSeries("AAPL", rows));
  const asteptat = box.calc(box.bareInchise(rows, "1d", Date.now(), "TWELVEDATA"), "auto");
  assert.equal(x.avg, asteptat.score, `listă ${x.avg}, pe bare închise ${asteptat.score}`);
  assert.ok(Number.isFinite(x.change), "schimbarea zilei (prețul viu) a dispărut din rând");
});

// ═════════════ 2. backtestCurrent: OOS întâi ═════════════
function lumeBt(oosN) {
  const els = {}, $ = (id) => (els[id] ??= new El());
  $("symbol").value = "BTCUSDT"; $("tf").value = "4h"; $("mode").value = "swing";
  const j = Array.from({ length: 420 }, (_, i) => [i, "100", "101", "99", "100", "1"]);
  const box = lumeApp({
    console, Math, Number, Array, Object, JSON, Date, String, Error, Promise, $, window: { __radarState: null },
    norm: (s) => String(s), appSettings: () => ({ feeBps: 5, slippageBps: 5 }), analysisSource: () => "BINANCE", analysisKlines: async () => j,
    calc: () => ({ score: 50, atr: 1 }),
    wfTrade: (points, th, cfg, start, end) => ({ th, start, end, len: points.length }),
    /* tot eșantionul / partea de alegere (pragul 68 câștigă) / partea nevăzută - valori ușor de recunoscut */
    statsR: (v) => v.start === 0 && v.end === v.len ? { n: 140, avg: 0.31, pf: 1.62, dd: 7.25 } : v.start === 0 ? { n: 40, avg: v.th === 68 ? 0.5 : 0.1, pf: 1.3, dd: 3 } : { n: oosN, avg: -0.12, pf: 0.81, dd: 5.5 },
  }, ["backtestCurrent"]);
  return { box, els };
}
const randuriBt = async (oosN) => {
  const { box, els } = lumeBt(oosN); await box.backtestCurrent();
  const h = els.backtestout.innerHTML;
  return { h, r: [...h.matchAll(/<div class="row"><span>(.*?)<\/span><b>(.*?)<\/b><\/div>/g)].map((m) => ({ et: m[1], v: m[2] })) };
};
const ALEGERE = "include partea de alegere";
await test("2a primul rezultat de sus e partea NEVĂZUTĂ (OOS); toate rândurile OOS stau deasupra celor pe tot eșantionul", async () => {
  const { r } = await randuriBt(45);
  assert.ok(r.length >= 8, "lipsesc rânduri: " + r.length);
  assert.match(r[0].et, /OOS/, "primul rând: " + r[0].et);
  const ultOos = Math.max(...r.map((x, i) => (/OOS/.test(x.et) ? i : -1))), primTot = Math.min(...r.map((x, i) => (x.et.includes(ALEGERE) ? i : 99)));
  assert.ok(primTot < 99, "niciun rând nu e marcat „" + ALEGERE + "”");
  assert.ok(ultOos < primTot, `un rând OOS (${ultOos}) stă sub tot eșantionul (${primTot})`);
});
await test("2b sub 30 de tranzacții OOS: eticheta „insuficient” lângă cifrele OOS; de la 30 în sus nu", async () => {
  const mic = await randuriBt(12), mare = await randuriBt(45);
  const oos = (x) => x.r.filter((y) => /OOS/.test(y.et));
  assert.ok(oos(mic).length >= 3, "rândurile OOS lipsesc");
  for (const y of oos(mic).filter((z) => /expectancy|profit factor|drawdown/i.test(z.et))) assert.match(y.v, /insuficient/, `„${y.et}” fără „insuficient” la n = 12`);
  assert.match(oos(mic).find((y) => /trades/.test(y.et)).v, /12.*insuficient/);
  assert.ok(!mare.h.includes("insuficient"), "„insuficient” apare și la n = 45");
});
await test("2c tot eșantionul rămâne (aceleași cifre), fiecare rând marcat „include partea de alegere”", async () => {
  const { r } = await randuriBt(45);
  const tot = r.filter((y) => y.et.includes(ALEGERE));
  for (const [et, v] of [["Total cost-aware trades", "140"], ["Net expectancy", "0.31 R"], ["Net profit factor", "1.62"], ["Max drawdown", "7.25 R"]]) {
    const y = tot.find((z) => z.et.startsWith(et)); assert.ok(y, `„${et}” nu e marcat „${ALEGERE}”`); assert.equal(y.v, v, et);
  }
  for (const y of r.filter((z) => /OOS/.test(z.et))) assert.ok(!/0\.31|1\.62|7\.25/.test(y.v), "un rând OOS arată cifra pe tot eșantionul: " + y.et);
  assert.match(r.find((y) => /OOS net expectancy/.test(y.et)).v, /^-0\.12 R/);
  assert.match(r.find((y) => /OOS profit factor/.test(y.et)).v, /^0\.81/);
});
await test("2d nimic scos de pe ecran: toate etichetele și nota de dinainte sunt încă acolo", async () => {
  const { h } = await randuriBt(45);
  for (const t of ["Selected threshold · train only", "Total cost-aware trades", "Net expectancy", "Net profit factor", "Max drawdown", "OOS trades · last 40%", "OOS net expectancy", "OOS profit factor", "Expanding-window heuristic. Threshold is selected only on the first 60%"]) assert.ok(h.includes(t), "lipsește: " + t);
  assert.match(h, /Selected threshold · train only<\/span><b>68</);
});

// ═════════════ 3. Risk / reward prin construcție ═════════════
const FN_VC = ["clamp", "contextScoreFrom", "v64BreadthAlignment", "currentRegimeProbabilities", "mtfComposite", "signalModel", "buildTradeMap",
  "vcBiasLabel", "vcSafe", "vcItem", "vcStatusItem", "vcScoreBias", "vcBoolBias", "vcTextBias", "buildVerdictCenterSnapshot",
  "v65Clamp", "v65Module", "v65RegimeClass", "v65RegimeIntelligence", "v65LiquidityStructure", "v65CrossAssetConfirmation"].concat(areFn("directieUnica") ? ["directieUnica"] : []);
const tfr = (t, score) => ({ tf: t, score, ver: score >= 64 ? "BULLISH" : score <= 36 ? "BEARISH" : "NEUTRAL", adx: 22, chop: 50, rvPercentile: 50, breakout: "NONE", ttm: { state: "" } });
const BULL = { score: 78, trendScore: 85, momScore: 80, volScore: 70, structureScore: 74, rsi: 64, macd: true, supertrend: "BULL", ichimoku: "BULL", vwapAbove: true, breakout: "UP", adx: 32, regime: "TREND BULL" };
const BEAR = { score: 22, trendScore: 15, momScore: 20, volScore: 30, structureScore: 26, rsi: 36, macd: false, supertrend: "BEAR", ichimoku: "BEAR", vwapAbove: false, breakout: "DOWN", adx: 32, regime: "TREND BEAR" };
function lumeVc(qo, mtfS, tmFortat = null) {
  const q = Object.assign({ price: 100, atr: 2, atrPct: 2, sup: 94, res: 106, signal: qo.score >= 66 ? "LONG" : qo.score <= 34 ? "SHORT" : "WAIT", cmf: 0, mfi: 50, divergence: "NONE", chop: 50, efficiency: 0.35, rvPercentile: 50,
    smc: { trap: false, bos: "NONE", sweep: "NONE", fvg: "NONE" }, liquidity: {}, ttm: { state: "" }, vr: 1 }, qo);
  const m = Object.assign(mtfS.map((s, i) => tfr(["15m", "1h", "4h", "1d"][i], s)), { expected: 4, coverage: 1 });
  const els = {}, $ = (id) => (els[id] ??= new El());
  const window = { __radarState: { symbol: "ETHUSDT", tf: "4h", mode: "swing", source: "BINANCE", q, m, j: [] }, __structureV38: {} };
  const box = {
    window, $, console, Math, Number, Array, Object, JSON, Date, String, Map, Set, Error,
    assetClass: () => "CRYPTO", regimeV2State: null, renderRegimeV2: () => null, currentMetaDecision: () => ({ action: "WAIT", p: NaN, state: "LEARNING" }),
    calibrationV2State: null, renderCalibrationV2: () => null, governedComponents: () => ({}), empiricalLens: () => null, setupQualityCurrent: () => null,
    observedLiquidationHeatmap: () => ({ rows: [], short: 0, long: 0 }), decisionStateMatches: (x) => !!x, trueFlowState: null, externalIntelState: {},
    masterDataQuality: () => 92, volumeProfile: () => null, num: (x) => String(x), compact: (x) => String(x), money: (x) => String(x),
    metaEnsembleV2: null, ensembleCurrentPrediction: () => null, segmentReliability: () => null, driftSnapshot: null,
    v66EdgeValidationSuite: () => ({ state: "OK", score: 70, quality: { score: 70, detail: "" }, hardBlock: false, hardReasons: [], decay: { state: "STABLE", detail: "" }, dna: { state: "NEUTRAL", current: { n: 0 }, detail: "" }, sufficiency: { state: "OK", score: 70, detail: "" } }),
    extMinsText: String, riskGuard: () => ({ state: "OK", mult: 1 }), portfolioBudgetSummary: () => ({ state: "PASS" }), strategyLifecycle: () => ({ state: "ACTIVE" }),
    paperCircuitBreaker: () => null, v63LiveReadiness: () => null, volatilityIntelligenceState: null, macroPairText: () => "—",
    FuturesCitire: { inVerdict: () => null }, verdictChip: (x) => x, activeModelVersionId: null, metaLabelState: null, mlShadow: null,
  };
  box.v65DecisionSuite = () => ({ regime: box.v65RegimeIntelligence(), structure: box.v65LiquidityStructure(), crossAsset: box.v65CrossAssetConfirmation(),
    conflict: { state: "CLEAR", score: 80, detail: "", severity: "INFO" }, entry: { state: "OK", action: "ENTER", severity: "INFO" }, exit: { state: "OK", action: "HOLD" },
    allocator: { state: "OK", detail: "", severity: "INFO" }, failure: { state: "LEARNING", detail: "", severity: "INFO" }, eventRisk: { state: "CLEAR", detail: "", severity: "INFO" },
    replay: { state: "OK", detail: "" }, control: { state: "OK", detail: "", severity: "INFO" }, killSwitch: { state: "NORMAL", detail: "" }, summary: { state: "OK", quality: 80 } });
  vm.createContext(box);
  const mp = blocApp("var MOTOR_PONDERI=");
  vm.runInContext((mp ? mp + "\n" : "") + FN_VC.map(fnApp).join("\n"), box, { filename: "app-extras.js" });
  const mc = box.mtfComposite(m), sm = box.signalModel(q, {}, mc), tm = tmFortat ? tmFortat(box.buildTradeMap(q, sm)) : box.buildTradeMap(q, sm);
  window.__signalState = { sm, tm, q, hs: {}, mc };
  box.regimeV2State = box.currentRegimeProbabilities();
  const vc = box.buildVerdictCenterSnapshot(), rr = vc.modules.find((x) => x.name === "Risk / reward");
  assert.ok(rr, "rândul „Risk / reward” a dispărut din Verdict Center");
  return { tm, rr };
}
await test("3a LONG: rândul „Risk / reward” spune că TP2 = 1,8R e prin construcție, fără avertisment", () => {
  const { tm, rr } = lumeVc(BULL, [72, 75, 78, 70]);
  assert.equal(tm.direction, "LONG");
  assert.match(rr.value, /1,8R/); assert.match(rr.value, /prin construcție/);
  assert.match(rr.note, /1,8 ×/, "nota nu spune cum e pusă ținta: " + rr.note);
  assert.equal(rr.severity, null); assert.equal(rr.available, true);
});
await test("3b SHORT: la fel", () => {
  const { tm, rr } = lumeVc(BEAR, [28, 25, 22, 30]);
  assert.equal(tm.direction, "SHORT");
  assert.match(rr.value, /prin construcție/); assert.equal(rr.severity, null);
});
await test("3c o hartă care NU e construită așa (TP2 la 1R) ⇒ cifra ei și avertismentul rămân vii", () => {
  const { rr } = lumeVc(BULL, [72, 75, 78, 70], (tm) => { const e = (tm.entryLow + tm.entryHigh) / 2; return Object.assign({}, tm, { tp2: e + (e - tm.stop) * 1.0 }); });
  assert.ok(!/prin construcție/.test(rr.value), rr.value); assert.match(rr.value, /TP2 1\.00R/);
  assert.equal(rr.severity, "WARN");
});
await test("3d faptul: pe 300 de hărți la întâmplare buildTradeMap dă mereu TP2 = 1,8 × riscul ⇒ „< 1,2” nu se putea aprinde", () => {
  const box = lumeApp({ Math, Number, Object }, ["buildTradeMap"]), r = mulberry32(7);
  for (let k = 0; k < 300; k++) {
    const p = 10 + r() * 1000, q = { price: p, atr: p * (0.002 + r() * 0.05), sup: p * (0.8 + r() * 0.19), res: p * (1.01 + r() * 0.2) }, dir = r() < 0.5 ? "LONG" : "SHORT";
    const tm = box.buildTradeMap(q, { direction: dir }), e = (tm.entryLow + tm.entryHigh) / 2;
    assert.ok(Math.abs(Math.abs(tm.tp2 - e) / Math.abs(e - tm.stop) - 1.8) < 1e-9 && tm.rr2 === 1.8);
  }
});

// ═════════════ 4. dispecerul: lista albă + argumentele pentru JS-în-atribut ═════════════
const ID = "[A-Za-z_$][\\w$]*";
const CUVINTE_JS = new Set(["if", "for", "while", "switch", "return", "function", "catch", "typeof", "new"]);
const decodeaza = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/* ca v54SplitTopLevel: taie la `sep` în afara ghilimelelor și parantezelor */
function taie(text, sep) {
  const out = []; let cur = "", q = null, esc = false, d = 0;
  for (const ch of String(text)) {
    if (esc) { cur += ch; esc = false; continue; } if (ch === "\\") { cur += ch; esc = true; continue; }
    if (q) { cur += ch; if (ch === q) q = null; continue; } if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") { d++; cur += ch; continue; } if (ch === ")" || ch === "]") { d = Math.max(0, d - 1); cur += ch; continue; }
    if (ch === sep && d === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim()); return out;
}
function numeDinExpresie(expr, unde) {
  const out = [];
  for (let st of taie(expr, ";")) {
    const cond = "if(event.target===this)"; if (st.startsWith(cond)) st = st.slice(cond.length).trim();
    if (/^document\.getElementById\(['"][^'"]+['"]\)\.click\(\)$/.test(st)) continue;
    const m = new RegExp("^(" + ID + ")\\((.*)\\)$").exec(st); if (!m) throw Error(`${unde}: formă necunoscută „${st}”`); out.push(m[1]);
  }
  return out;
}
const TOATE_JS = [["public/app.js", APP], ...LIB];
const culege = (re, surse = TOATE_JS) => { const o = []; for (const [, t] of surse) for (const m of t.matchAll(re)) o.push(m[1]); return o; };
/* locurile unde numele acțiunii vine dintr-o variabilă: de unde iau valorile (fiecare trebuie să dea măcar un nume - altfel codul s-a schimbat) */
const DINAMICE = [
  { fisier: "public/app.js", re: /^\$\{stockMode\?"(\w+)":"(\w+)"\}\(/, nume: (w) => { const m = /^\$\{stockMode\?"(\w+)":"(\w+)"\}/.exec(w); return [m[1], m[2]]; } },
  { fisier: "public/app.js", re: /^toggleCommandPalette\(false\);\$\{act\|\|`navTo\(/, nume: () => { const c = blocApp("const COMMANDS="); assert.ok(c, "lipsește COMMANDS"); return ["navTo", ...[...c.matchAll(new RegExp('"(' + ID + ')\\(', "g"))].map((m) => m[1])]; } },
  { fisier: "public/app.js", re: /^'\+escapeHtml\(x\.actiune\)\+'/, nume: () => culege(new RegExp("actiune\\s*:\\s*(?:[^,;{}]*?\\?\\s*)?[\"'](" + ID + ")\\(", "g")) },
  { fisier: "public/lib/grafic-bot.js", re: /^' \+ clic \+ '/, nume: () => culege(/semClic\s*:\s*\{([^}]*)\}/g).flatMap((s) => [...s.matchAll(new RegExp('"(' + ID + ')\\(', "g"))].map((m) => m[1])) },
  { fisier: "public/lib/monte-simbol-ecran.js", re: /^' \+ act \+ '/, nume: () => [...culege(new RegExp("act = act \\|\\| \"(" + ID + ")\\(", "g"), LIB.filter(([f]) => f.endsWith("monte-simbol-ecran.js"))), ...culege(new RegExp("mcs(?:Tp|Var)Html\\([^,()]+,\\s*\"(" + ID + ")\\(", "g"))] },
  { fisier: "public/lib/rezultate.js", re: /^' \+ act \+ '/, nume: () => culege(new RegExp('btn\\("(' + ID + ')\\(', "g"), LIB.filter(([f]) => f.endsWith("rezultate.js"))) },
  { fisier: "public/lib/statistica-trade.js", re: /^' \+ o\.actiune(Perioada|Ordine|Csv) \+ /, nume: (w) => { const k = /^' \+ o\.actiune(\w+) /.exec(w)[1]; return culege(new RegExp("actiune" + k + "\\s*:\\s*[\"'](" + ID + ")[\"']", "g")); } },
];
function actiuniFolosite() {
  const nume = new Map(), pune = (n, unde) => { if (!nume.has(n)) nume.set(n, new Set()); nume.get(n).add(unde); };
  for (const m of HTML.matchAll(/data-action-(?:click|change|input)="([^"]*)"/g)) numeDinExpresie(decodeaza(m[1]), "index.html").forEach((n) => pune(n, "index.html"));
  assert.ok(!/data-action-(?:click|change|input)='/.test(HTML), "index.html: atribut cu apostrof - proba nu-l citește");
  const neinreg = [];
  for (const [f, t] of TOATE_JS) {
    /* `data-action-click="…` într-un șir HTML sau `setAttribute("data-action-click","…")` (nu și listele de nume de atribute, ca în sugestii-ecran) */
    for (const m of t.matchAll(/(setAttribute\(\s*["'])?data-action-(?:click|change|input)(=\\?["']|["'],\s*["'])/g)) {
      if (/,/.test(m[2]) && !m[1]) continue;
      const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 500);
      let w;
      if (m[1]) w = rest.slice(0, rest.indexOf('")') >= 0 ? rest.indexOf('")') : 200);
      else { const k = rest.search(/(?<!=)>/); w = rest.slice(0, k < 0 ? 300 : k); }
      const unde = f + ":" + (t.slice(0, m.index).split("\n").length);
      let gasit = false;
      for (const d of DINAMICE) if (d.fisier === f && d.re.test(w)) { const n = d.nume(w).filter(Boolean); assert.ok(n.length, `${unde}: sursa acțiunii dinamice nu mai dă niciun nume`); n.forEach((x) => pune(x, unde)); gasit = true; }
      const st = new RegExp("^(" + ID + ")\\(").exec(w);
      if (st) pune(st[1], unde); else if (!gasit) neinreg.push(`${unde}: „${w.slice(0, 60)}”`);
      /* „;” care NU încheie o entitate HTML (&#x27; &#39; &quot;) = a doua acțiune din același atribut */
      if (/(?<!&#?\w+);\s*(\$\{|['"]\s*\+)/.test(w) && !gasit) neinreg.push(`${unde}: acțiune înlănțuită dinamic „${w.slice(0, 60)}”`);
      for (const c of w.matchAll(new RegExp("(?<!&#?\\w+);\\s*(" + ID + ")\\(", "g"))) if (!CUVINTE_JS.has(c[1])) pune(c[1], unde);
    }
  }
  assert.deepEqual(neinreg, [], "locuri data-action-* pe care proba nu le știe citi (adaugă-le în DINAMICE)");
  return nume;
}
const listaAlba = () => {
  const i = APP.indexOf("\nvar ACTIUNI_PERMISE="); assert.ok(i >= 0, "lipsește lista albă ACTIUNI_PERMISE în app.js");
  const linie = APP.slice(i + 1, APP.indexOf("\n", i + 1)), m = /^var ACTIUNI_PERMISE=new Set\("([^"]*)"\.split\(" "\)\);/.exec(linie);
  assert.ok(m, "forma listei albe s-a schimbat: " + linie.slice(0, 80)); return new Set(m[1].split(" "));
};
if (process.argv.includes("--lista")) { console.log([...actiuniFolosite().keys()].sort().join(" ")); process.exit(0); }
function lumeDispecer(lista = true) {
  const chemate = [], spion = (n) => function (...a) { chemate.push([n, ...a]); };
  const box = { console: { error() {}, warn() {}, log() {} }, Error, String, Number, globalThis: null, chemate, spion };
  box.document = { getElementById: (id) => ({ click: () => chemate.push(["#click", id]) }) };
  /* numele periculoase sunt SPIONI care doar notează chemarea (nimic nu se execută) - 4d verifică tocmai că dispecerul nu ajunge la ele */
  for (const n of ["eval", "setTimeout", "setInterval", "Function", "fetch", "open", "alert", "functieStrainaProba"]) box[n] = spion(n);
  vm.createContext(box); box.globalThis = vm.runInContext("this", box);
  if (lista) vm.runInContext(APP.slice(APP.indexOf("\nvar ACTIUNI_PERMISE=") + 1, APP.indexOf("\n", APP.indexOf("\nvar ACTIUNI_PERMISE=") + 1)), box);
  vm.runInContext(["v54SplitTopLevel", "v54ActionArg", "v54RunActionExpression"].map(fnApp).join("\n"), box, { filename: "dispecer.js" });
  return box;
}
await test("4a fiecare acțiune folosită azi (index.html + app.js + public/lib, găsite automat) e în lista albă", () => {
  const f = actiuniFolosite(), l = listaAlba(), lipsa = [...f.keys()].filter((n) => !l.has(n)).sort();
  assert.ok(f.size > 150, "prea puține acțiuni găsite: " + f.size);
  assert.deepEqual(lipsa, [], "butoane care n-ar mai merge: " + lipsa.map((n) => n + " (" + [...f.get(n)][0] + ")").join(", "));
});
await test("4b lista albă nu are nimic în plus și fiecare nume e o funcție a aplicației", () => {
  const f = actiuniFolosite(), l = listaAlba(), plus = [...l].filter((n) => !f.has(n)).sort();
  assert.deepEqual(plus, [], "nume în listă pe care nu le folosește nimic");
  const def = (n) => TOATE_JS.some(([, t]) => new RegExp("(^|\\n|[;}])\\s*(async )?function " + n.replace(/\$/g, "\\$") + "\\(|(window|globalThis)\\." + n + "\\s*=|\\b(var|let|const) " + n + "\\s*=\\s*(async\\s*)?(function|\\()").test(t));
  const nedef = [...l].filter((n) => !def(n)).sort();
  assert.deepEqual(nedef, [], "nume din listă fără funcție în app.js / public/lib");
});
await test("4c dispecerul cheamă FIECARE acțiune din listă (cu argumentele ei)", () => {
  const box = lumeDispecer(); const l = [...listaAlba()];
  for (const n of l) box[n] = box.spion(n);
  for (const n of l) box.v54RunActionExpression(n + "('x',2,true)", {}, {});
  const nechemate = l.filter((n) => !box.chemate.some((c) => c[0] === n && c[1] === "x" && c[2] === 2 && c[3] === true));
  assert.deepEqual(nechemate, []);
  box.chemate.length = 0;
  box.v54RunActionExpression("closeMoreDrawer();deschideBusola()", {}, {});
  box.v54RunActionExpression("if(event.target===this)toggleCommandPalette(false)", "EL", { target: "EL" });
  box.v54RunActionExpression("if(event.target===this)toggleCommandPalette(true)", "EL", { target: "ALT" });
  box.v54RunActionExpression("document.getElementById('backupFile').click()", {}, {});
  assert.deepEqual(box.chemate.map((c) => c.join("|")), ["closeMoreDrawer", "deschideBusola", "toggleCommandPalette|false", "#click|backupFile"]);
});
await test("4d o funcție din AFARA listei nu se cheamă (eval, setTimeout cu text, Function, fetch, open, o funcție globală oarecare)", () => {
  const box = lumeDispecer();
  for (const e of ["eval('globalThis.rau=1')", "setTimeout('rau()',0)", "setInterval('rau()',9)", "Function('return 1')", "fetch('https://exemplu.ro')", "open('https://exemplu.ro')", "alert('x')", "functieStrainaProba('1')", "navTo('dash');eval('2')"]) {
    box.navTo = box.spion("navTo"); box.v54RunActionExpression(e, {}, {});
  }
  const rele = box.chemate.filter((c) => c[0] !== "navTo").map((c) => c[0]);
  assert.deepEqual(rele, [], "chemate deși nu sunt în listă");
  assert.ok(box.chemate.some((c) => c[0] === "navTo"), "acțiunea permisă din același atribut nu s-a mai chemat");
});
/* simbolul ajunge în atribut, browserul decodează atributul, dispecerul îl citește: funcția trebuie să primească EXACT textul */
const CAPCANE = ["BTC", "A'B", 'x"y', "a\\b", "<i>&", "X');functieStrainaProba('1", "A', 'B", "Z\\');functieStrainaProba(\\'2"];
await test("4e argumentele text din atribute (Market overview → pick): funcția primește exact simbolul, nimic nu iese din ghilimele", () => {
  const els = {}, $ = (id) => (els[id] ??= new El());
  const b = lumeApp({ Math, Number, String, $, assetClass: () => "CRYPTO", num: String, TextRo: globalThis.TextRo, marketCache: { rows: CAPCANE.map((c) => ({ c, price: 1, ch: 1, score: 50, regime: "RANGE", ver: "NEUTRAL", adx: 20 })) } }, ["renderMarketOverview", "escapeHtml"]);
  if (areFn("argActiune")) b.__adauga("argActiune");
  if (areFn("simbolSigur")) b.__adauga("simbolSigur");
  b.renderMarketOverview();
  const atr = [...els.marketOverview.innerHTML.matchAll(/data-action-click="([^"]*)"/g)].map((m) => decodeaza(m[1]));
  assert.equal(atr.length, CAPCANE.length);
  const box = lumeDispecer(areFn("argActiune") || APP.includes("\nvar ACTIUNI_PERMISE=")); box.pick = box.spion("pick");
  atr.forEach((a) => { try { box.v54RunActionExpression(a, {}, {}); } catch (e) { box.chemate.push(["EROARE", e.message]); } });
  assert.deepEqual(box.chemate.filter((c) => c[0] !== "pick").map((c) => c.join("|")), [], "a ieșit din ghilimele");
  assert.deepEqual(box.chemate.map((c) => c[1]), CAPCANE);
});
await test("4f niciun argument de acțiune din app.js nu mai trece prin escapeHtml (escaparea HTML nu e escaparea pentru un șir JS); gridDeschideMoneda folosește argActiune", () => {
  const rele = [];
  for (const m of APP.matchAll(/data-action-(?:click|change|input)=\\?["']/g)) {
    const rest = APP.slice(m.index + m[0].length, m.index + m[0].length + 500), k = rest.search(/(?<!=)>/), w0 = rest.slice(0, k < 0 ? 300 : k);
    /* doar valoarea atributului: până la „)"” (sfârșitul acțiunii); aria-label / value de după sunt text HTML, unde escapeHtml e corect */
    const z = w0.search(/\)\\?"/), w = z >= 0 ? w0.slice(0, z + 1) : w0;
    if (/escapeHtml\(/.test(w) && !/^'\+escapeHtml\(x\.actiune\)\+'$/.test(w.replace(/"$/, ""))) rele.push(APP.slice(0, m.index).split("\n").length + ": " + w.slice(0, 70));
  }
  assert.deepEqual(rele, []);
  assert.match(fnApp("tbPregatire"), /gridDeschideMoneda\(\\''\+argActiune\(q\.s\)\+'\\'\)/);
  /* argActiune: escaparea JS (\ ' ") apoi cea HTML - aceeași cale ca în 4e */
  const b = lumeApp({ String }, ["escapeHtml", "argActiune"]);
  for (const s of CAPCANE) { const box = lumeDispecer(); box.gridDeschideMoneda = box.spion("gridDeschideMoneda"); box.v54RunActionExpression(decodeaza("gridDeschideMoneda('" + b.argActiune(s) + "')"), {}, {}); assert.deepEqual(box.chemate, [["gridDeschideMoneda", s]], s); }
});

// ═════════════ 5. paleta Ctrl+K din tastatură ═════════════
class Nod {
  constructor(tag, atr = {}) { this.tagName = tag; this.atr = { ...atr }; this.clicuri = 0; this.clase = new Set(String(atr.class || "").split(/\s+/).filter(Boolean)); this._html = ""; this._noduri = null; this.value = ""; }
  getAttribute(k) { return k in this.atr ? this.atr[k] : null; } setAttribute(k, v) { this.atr[k] = String(v); } removeAttribute(k) { delete this.atr[k]; }
  get classList() { const c = this.clase; return { contains: (x) => c.has(x), add: (x) => c.add(x), remove: (x) => c.delete(x), toggle: (x, on) => { const v = on === undefined ? !c.has(x) : !!on; v ? c.add(x) : c.delete(x); return v; } }; }
  get id() { return this.atr.id || ""; }
  focus() { DOC.activeElement = this; } click() { this.clicuri++; }
  set innerHTML(h) { this._html = h; this._noduri = null; } get innerHTML() { return this._html; }
  querySelectorAll(sel) {
    if (sel !== ".cmdItem") return [];
    if (!this._noduri) this._noduri = [...this._html.matchAll(/<div ([^>]*)>([\s\S]*?)<\/div>/g)].map((m) => { const a = {}; for (const x of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[x[1]] = x[2]; const n = new Nod("DIV", a); n.text = m[2]; return n; }).filter((n) => n.classList.contains("cmdItem"));
    return this._noduri;
  }
}
const DOC = { activeElement: null };
function lumePaleta() {
  const els = { commandPalette: new Nod("DIV", { class: "cmdPalette on" }), commandInput: new Nod("INPUT", { id: "commandInput" }), commandItems: new Nod("DIV", { id: "commandItems" }) };
  const toggle = []; const box = { console, Math, String, Array, Object, document: DOC, $: (id) => els[id] || null, toggleCommandPalette: (f) => toggle.push(f) };
  vm.createContext(box);
  const cmd = blocApp("const COMMANDS="); assert.ok(cmd, "lipsește COMMANDS");
  vm.runInContext(cmd.replace(/^const /, "var ") + "\n" + fnApp("renderCommandPalette") + "\n" + (areFn("cmdPaletaTaste") ? fnApp("cmdPaletaTaste") : "") + "\n" + (areFn("cmdPaletaActiv") ? fnApp("cmdPaletaActiv") : ""), box, { filename: "paleta.js" });
  box.renderCommandPalette(); els.commandInput.focus();
  const tasta = (key, target = DOC.activeElement, o = {}) => { const e = { key, target, prevent: false, preventDefault() { this.prevent = true; }, ctrlKey: false, metaKey: false, altKey: false, ...o }; assert.equal(typeof box.cmdPaletaTaste, "function", "lipsește cmdPaletaTaste"); e.rez = box.cmdPaletaTaste(e); return e; };
  return { box, els, toggle, tasta, it: () => els.commandItems.querySelectorAll(".cmdItem") };
}
await test("5a roluri ARIA: câmpul e combobox legat de listă, lista e listbox, fiecare comandă e o opțiune atinsă cu Tab, cu id; prima e evidențiată", () => {
  const inp = /<input[^>]*id="commandInput"[^>]*>/.exec(HTML)[0], lst = /<div[^>]*id="commandItems"[^>]*>/.exec(HTML)[0];
  assert.match(inp, /role="combobox"/); assert.match(inp, /aria-controls="commandItems"/); assert.match(inp, /aria-expanded="true"/);
  assert.match(lst, /role="listbox"/); assert.match(lst, /aria-label="[^"]+"/);
  const { it, box, els } = lumePaleta(), n = it();
  assert.equal(n.length, vm.runInContext("COMMANDS.length", box), "paleta a pierdut comenzi");
  const ids = new Set();
  n.forEach((x, i) => { assert.equal(x.getAttribute("role"), "option"); assert.equal(x.getAttribute("tabindex"), "0"); assert.ok(x.id); ids.add(x.id); assert.equal(x.getAttribute("aria-selected"), i === 0 ? "true" : "false"); });
  assert.equal(ids.size, n.length, "id-uri repetate");
  assert.equal(els.commandInput.getAttribute("aria-activedescendant"), n[0].id);
  /* nimic pierdut: aceleași texte și aceleași acțiuni ca înainte */
  assert.equal(n[0].text, "Tabloul botului"); assert.equal(n[0].getAttribute("data-action-click"), "toggleCommandPalette(false);navTo(&#x27;tabloubot&#x27;,false)");
  assert.equal(n[1].getAttribute("data-action-click"), "toggleCommandPalette(false);deschideBusola()");
});
await test("5b săgețile / Home / End mută focusul între comenzi (și înapoi în câmp), iar opțiunea evidențiată o urmează", () => {
  const { tasta, it, els } = lumePaleta(), n = it();
  let e = tasta("ArrowDown"); assert.equal(e.rez, true); assert.equal(e.prevent, true); assert.equal(DOC.activeElement, n[0]);
  tasta("ArrowDown"); assert.equal(DOC.activeElement, n[1]); assert.equal(n[1].getAttribute("aria-selected"), "true"); assert.equal(n[0].getAttribute("aria-selected"), "false");
  assert.equal(els.commandInput.getAttribute("aria-activedescendant"), n[1].id);
  tasta("ArrowUp"); assert.equal(DOC.activeElement, n[0]);
  tasta("ArrowUp"); assert.equal(DOC.activeElement, els.commandInput, "de pe prima comandă, săgeata sus duce în câmp");
  tasta("End"); assert.equal(DOC.activeElement, n.at(-1)); tasta("ArrowDown"); assert.equal(DOC.activeElement, n.at(-1));
  tasta("Home"); assert.equal(DOC.activeElement, n[0]);
});
await test("5c Enter / Spațiu pe o comandă o pornește; Enter în câmp pornește comanda evidențiată; Escape închide; o literă nu pornește scurtăturile", () => {
  const { tasta, it, els, toggle } = lumePaleta(), n = it();
  n[2].focus(); tasta("Enter"); assert.equal(n[2].clicuri, 1);
  n[3].focus(); tasta(" "); assert.equal(n[3].clicuri, 1);
  els.commandInput.focus(); tasta("Enter"); assert.equal(n[0].clicuri, 1, "Enter în câmp: prima comandă (cea evidențiată)");
  tasta("ArrowDown"); tasta("ArrowDown"); els.commandInput.focus(); tasta("Enter"); assert.equal(n[1].clicuri, 1, "Enter în câmp: comanda evidențiată cu săgețile");
  n[4].focus(); const a = tasta("a"); assert.equal(a.rez, true, "litera a ajuns la scurtăturile paginii (a = analiză)"); assert.equal(DOC.activeElement, els.commandInput, "litera nu s-a dus în căutare");
  const esc = tasta("Escape"); assert.equal(esc.rez, true); assert.deepEqual(toggle, [false]);
  els.commandPalette.classList.remove("on"); assert.equal(tasta("ArrowDown").rez, false, "paleta închisă nu mai prinde tastele");
});
await test("5d tastele ajung la paletă înaintea scurtăturilor; Tab o ia prin comenzi (capcana de focus le vede); focusul se vede (CSS înaintea cozii)", () => {
  const i = APP.indexOf('if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k")'), h = APP.slice(i, APP.indexOf("\n});", i));
  assert.ok(i > 0, "nu găsesc ascultătorul tastelor");
  const p = h.indexOf("if(cmdPaletaTaste(e))return"); assert.ok(p > 0, "ascultătorul nu cheamă cmdPaletaTaste");
  assert.ok(p < h.indexOf('e.key==="/"') && p < h.indexOf('e.key==="Escape"'), "cmdPaletaTaste vine după scurtături / Escape");
  assert.match(APP, /querySelectorAll\("button,input,select,textarea,\[tabindex\]:not\(\[tabindex=\\"-1\\"\]\)"\)/, "capcana de Tab nu mai vede elementele cu tabindex");
  assert.match(APP, /addEventListener\("focusin",[^\n]*cmdItem[^\n]*cmdPaletaActiv/, "Tab pe o comandă nu o evidențiază");
  const css = CSS, coada = css.indexOf("@media (max-width:640px){.sugPandaTab thead");
  const f = css.indexOf(".cmdItem:focus-visible"), s = css.indexOf('.cmdItem[aria-selected="true"]');
  assert.ok(f > 0 && s > 0, "lipsește stilul focusului / al opțiunii evidențiate"); assert.ok(f < coada && s < coada, "stilul paletei stă după pândă (coada fișierului)");
  assert.equal(pandaInainteaCozii(css), "");
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
process.exit(picate ? 1 : 0);
