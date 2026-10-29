// Proba v100.269-v (ideile auditului 29.10 al Crypto Radar) - UN SINGUR MOTOR DE SCOR.
// Auditorul a găsit:
//  - același concept cu ponderi diferite: Verdict Center dădea bazei 0,12 / regimului 0,055 / calibrării 0,05,
//    Master Verdict 0,26 / 0,14 / 0,12;
//  - patru definiții LONG/SHORT pe aceeași analiză: q.signal (scorul tehnic), sm.direction (motorul), mc.comp
//    (planul de invalidare) și direcția din Master; pe date vii q.signal ≠ sm.direction în 5,4–7,3% din bare;
//  - MACD, RSI și Supertrend numărați de 2–3 ori (în motorul de bază și din nou ca module separate).
// Partea A fixează comportamentul pe 8 situații tipice (ACUM = v100.268, capturat ÎNAINTE de schimbare) și arată exact
// ce se schimbă; partea B are testele fiecărei schimbări (roșii pe v100.268).
// Funcțiile se iau din public/app.js după text și rulează cu dependențele injectate (ca proba-v100267-b).
// `node scripts/proba-v100269-v.mjs --instantaneu` tipărește tabelul situațiilor pe codul de acum.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
/* PROBA_APP_JS = o copie mutată a lui app.js (pentru mutații: scoți reparația și vezi că proba o prinde) */
const APP = process.env.PROBA_APP_JS ? fs.readFileSync(process.env.PROBA_APP_JS, "utf8").replace(/\r\n/g, "\n") : citeste("public", "app.js");
/* de la „function nume(” la început de rând până la următorul „\nfunction ” / „\nasync function ” */
const fnApp = (nume) => {
  const i = APP.search(new RegExp("\\n(async )?function " + nume + "\\(")); assert.ok(i >= 0, "lipsește " + nume + " în app.js");
  const f = [APP.indexOf("\nfunction ", i + 10), APP.indexOf("\nasync function ", i + 10)].filter((x) => x > 0);
  return APP.slice(i + 1, f.length ? Math.min(...f) : undefined);
};
const areFn = (nume) => APP.includes("\nfunction " + nume + "(");
/* constanta de module (o declarație `var NUME={...};` la început de rând) */
const constApp = (nume) => { const i = APP.indexOf("\nvar " + nume + "="); if (i < 0) return null; const j = APP.indexOf("};", i); return APP.slice(i + 1, j + 2); };

let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
const aprox = (a, b, eps = 0.005, msg) => assert.ok(Number.isFinite(a) && Math.abs(a - b) <= eps, (msg || "") + ` așteptat ≈${b}, primit ${a}`);

class El {
  constructor() { this.textContent = ""; this.className = ""; this.innerHTML = ""; this.hidden = false; this.style = {}; this.children = []; }
  append(...x) { this.children.push(...x); } appendChild(x) { this.children.push(x); return x; } replaceChildren(...x) { this.children = [...x]; }
}

// ───────────── lumea: o analiză ETH 4h swing cu toate modulele verdictului ─────────────
const FN = ["clamp", "contextScoreFrom", "v64BreadthAlignment", "currentRegimeProbabilities", "mtfComposite", "signalModel", "buildTradeMap",
  "vcBiasLabel", "vcSafe", "vcItem", "vcStatusItem", "vcScoreBias", "vcBoolBias", "vcTextBias", "buildVerdictCenterSnapshot", "renderMasterVerdict",
  "v65Clamp", "v65Module", "v65RegimeClass", "v65RegimeIntelligence", "v65LiquidityStructure", "v65CrossAssetConfirmation"];
const COD = () => {
  const fns = FN.concat(areFn("directieUnica") ? ["directieUnica"] : []);
  const mp = constApp("MOTOR_PONDERI");
  return (mp ? mp + "\n" : "") + fns.map(fnApp).join("\n");
};
const ANALYZE = fnApp("analyze");
/* cartela „Adaptive signal engine” și planul de invalidare, luate din analyze() după text */
const felieCartela = () => { const a = ANALYZE.indexOf('$("signal").textContent='), b = ANALYZE.indexOf('$("enginefill")', a); assert.ok(a > 0 && b > a, "nu găsesc cartela semnalului în analyze"); return ANALYZE.slice(a, b); };
const feliePlan = () => { const a = ANALYZE.indexOf("let dir=", ANALYZE.indexOf('$("engineNotes")')), b = ANALYZE.indexOf("\n  risk=", a); assert.ok(a > 0 && b > a, "nu găsesc planul de invalidare în analyze"); return ANALYZE.slice(a, b); };

/* q tipic; `scor` dă q.signal după regula din calc() (profilul swing: prag 64 ⇒ LONG ≥ 66, SHORT ≤ 34) */
function faQ(o) {
  const score = o.score, signal = score >= 66 ? "LONG" : score <= 34 ? "SHORT" : "WAIT";
  return Object.assign({
    price: 100, atr: 2, atrPct: 2, sup: 94, res: 106, score, signal, trendScore: 50, momScore: 50, volScore: 50, structureScore: 50,
    rsi: 50, macd: true, supertrend: "BULL", ichimoku: "INSIDE", vwapAbove: true, breakout: "NONE", divergence: "NONE", cmf: 0, mfi: 50,
    adx: 20, chop: 50, efficiency: 0.35, rvPercentile: 50, regime: "RANGE", smc: { trap: false, bos: "NONE", sweep: "NONE", fvg: "NONE" }, liquidity: {}, ttm: { state: "" }, vr: 1,
  }, o, { signal: o.signal || signal });
}
const tf = (tfn, score) => ({ tf: tfn, score, ver: score >= 64 ? "BULLISH" : score <= 36 ? "BEARISH" : "NEUTRAL", adx: 22, chop: 50, rvPercentile: 50, breakout: "NONE", ttm: { state: "" } });
const mtf = (a, b, c, d) => Object.assign([tf("15m", a), tf("1h", b), tf("4h", c), tf("1d", d)], { expected: 4, coverage: 1 });

function lume(sc, opt = {}) {
  const q = faQ(sc.q), m = sc.m, c = sc.ctx || {}, els = {}, $ = (id) => (els[id] ??= new El());
  let expl = null;
  const window = {
    __radarState: { symbol: "ETHUSDT", tf: "4h", mode: "swing", source: "BINANCE", q, m, j: [] },
    __structureV38: c.sweep ? { sweep: c.sweep } : {},
  };
  if (c.latime != null) window.__marketBreadthV64 = { score: c.latime, ts: Date.now(), state: c.latime >= 65 ? "BULLISH" : c.latime <= 35 ? "BEARISH" : "NEUTRAL", n: 24, total: 24, divergence: "NONE", universe: "SCAN" };
  if (c.context != null) window.__intelContext = { global: {}, macro: { riskOnScore: c.context } };
  const ext = {};
  if (c.histCvd != null) ext.histCvd = { available: true, coverage: 0.9, summary: { deltaPct: c.histCvd, state: c.histCvd < 0 ? "SELL" : "BUY" }, windowState: "COMPLETE_WINDOW" };
  if (c.onchain != null) ext.onchain = { contextScore: c.onchain, whales: { available: false } };
  if (c.options != null) ext.options = { available: true, context: { score: c.options, state: "BALANCED" }, putCallOiRatio: 0.8 };
  const v65 = (b) => ({
    regime: b.v65RegimeIntelligence(), structure: b.v65LiquidityStructure(), crossAsset: b.v65CrossAssetConfirmation(),
    conflict: { state: "CLEAR", score: 80, detail: "", severity: "INFO" }, entry: { state: "OK", action: "ENTER", severity: "INFO" }, exit: { state: "OK", action: "HOLD" },
    allocator: { state: "OK", detail: "", severity: "INFO" }, failure: { state: "LEARNING", detail: "", severity: "INFO" }, eventRisk: { state: "CLEAR", detail: "", severity: "INFO" },
    replay: { state: "OK", detail: "" }, control: { state: "OK", detail: "", severity: "INFO" }, killSwitch: { state: "NORMAL", detail: "" }, summary: { state: "OK", quality: 80 },
  });
  const box = {
    window, $, console, Math, Number, Array, Object, JSON, Date, String, Map, Set, Error,
    assetClass: () => "CRYPTO", regimeV2State: null, renderRegimeV2: () => null,
    currentMetaDecision: () => c.meta || { action: "WAIT", p: NaN, state: "LEARNING" },
    calibrationV2State: c.cal || null, renderCalibrationV2: () => null,
    governedComponents: () => (c.gov != null ? { ensemble: c.gov } : {}), empiricalLens: () => null, setupQualityCurrent: () => c.sq || null,
    observedLiquidationHeatmap: () => ({ rows: [], short: 0, long: 0 }), decisionStateMatches: (x) => !!x,
    trueFlowState: c.flux == null ? null : { delta: c.flux, state: c.flux < 0 ? "SELL" : "BUY" }, externalIntelState: ext,
    masterDataQuality: () => 92, volumeProfile: () => null, num: (x) => String(x), compact: (x) => String(x), money: (x) => String(x),
    metaEnsembleV2: null, ensembleCurrentPrediction: () => null, segmentReliability: () => null, driftSnapshot: null,
    v66EdgeValidationSuite: () => ({ state: "OK", score: 70, quality: { score: 70, detail: "" }, hardBlock: false, hardReasons: [], decay: { state: "STABLE", detail: "" }, dna: { state: "NEUTRAL", current: { n: 0 }, detail: "" }, sufficiency: { state: "OK", score: 70, detail: "" } }),
    extMinsText: String, riskGuard: () => ({ state: "OK", mult: 1 }), portfolioBudgetSummary: () => ({ state: "PASS" }), strategyLifecycle: () => ({ state: "ACTIVE" }),
    paperCircuitBreaker: () => null, v63LiveReadiness: () => null, volatilityIntelligenceState: null, macroPairText: () => "—",
    FuturesCitire: { inVerdict: () => null }, verdictChip: (x) => x, activeModelVersionId: null, metaLabelState: null, mlShadow: null,
    renderVerdictCenter: () => ({}), renderVerdictExplainer: (a) => { expl = a; return {}; }, renderProfitReadiness: () => {}, renderV65DecisionOS: () => {}, renderV66EdgeValidation: () => {},
  };
  box.v65DecisionSuite = () => v65(box);
  vm.createContext(box);
  vm.runInContext(COD(), box, { filename: "app-extras.js" });
  if (opt.ponderi) opt.ponderi(box);
  const mc = box.mtfComposite(m), sm = box.signalModel(q, {}, mc), tm = box.buildTradeMap(q, sm);
  window.__signalState = { sm, tm, q, hs: {}, mc };
  box.regimeV2State = box.currentRegimeProbabilities();
  /* cartela „Adaptive signal engine” + planul de invalidare, exact cum le scrie analyze() */
  const ss = window.__signalState;
  new Function("$", "q", "ss", felieCartela())($, q, ss);
  const plan = new Function("q", "mc", "ss", feliePlan() + "\nreturn {dir,inv,tar,trail,txt};")(q, mc, ss);
  const mv = box.renderMasterVerdict();
  const vc = box.buildVerdictCenterSnapshot();
  return { q, mc, sm, tm, plan, cartela: els.signal.textContent, mv, vc, expl, box, fam: Object.fromEntries((window.__masterFamilyScores || []).map((f) => [f.family, f.v])) };
}

// ───────────── cele 8 situații tipice ─────────────
const BULL = { trendScore: 85, momScore: 80, volScore: 70, structureScore: 74, rsi: 64, macd: true, supertrend: "BULL", ichimoku: "BULL", vwapAbove: true, breakout: "UP", adx: 32, chop: 38, efficiency: 0.55, regime: "TREND BULL", cmf: 0.12, mfi: 62 };
const BEAR = { trendScore: 15, momScore: 20, volScore: 30, structureScore: 26, rsi: 36, macd: false, supertrend: "BEAR", ichimoku: "BEAR", vwapAbove: false, breakout: "DOWN", adx: 32, chop: 38, efficiency: 0.55, regime: "TREND BEAR", cmf: -0.12, mfi: 38 };
const SITUATII = [
  { id: "S1", nume: "LONG puternic (tot aliniat)", q: Object.assign({ score: 78 }, BULL), m: mtf(72, 75, 78, 70),
    ctx: { flux: 20, latime: 68, context: 62, cal: { p: 0.58, n: 45, state: "CALIBRATED" }, gov: 0.6, histCvd: 6, onchain: 60, options: 58, sweep: { type: "SELL-SIDE SWEEP", score: 60 } } },
  { id: "S2", nume: "SHORT puternic (tot aliniat)", q: Object.assign({ score: 22 }, BEAR), m: mtf(28, 25, 22, 30),
    ctx: { flux: -20, latime: 32, context: 38, cal: { p: 0.58, n: 45, state: "CALIBRATED" }, gov: 0.6, histCvd: -6, onchain: 40, options: 42, sweep: { type: "BUY-SIDE SWEEP", score: 60 } } },
  { id: "S3", nume: "WAIT (piață plată)", q: { score: 50, rsi: 51, macd: true, supertrend: "BULL" }, m: mtf(50, 52, 48, 50),
    ctx: { flux: 2, latime: 50, context: 50 } },
  { id: "S4", nume: "Conflict: motorul LONG, fluxul și piața contra", q: Object.assign({ score: 70 }, BULL, { trendScore: 75, momScore: 70, structureScore: 68, volScore: 60, breakout: "NONE" }), m: mtf(66, 68, 70, 64),
    ctx: { flux: -35, latime: 18, context: 22, histCvd: -12, onchain: 35, options: 35 } },
  { id: "S5", nume: "Definiții în dezacord: scorul tehnic LONG, motorul WAIT (MTF slab)", q: { score: 67, trendScore: 70, momScore: 66, structureScore: 55, volScore: 55, rsi: 58 }, m: mtf(45, 44, 46, 45),
    ctx: { flux: 5, latime: 55, context: 55 } },
  { id: "S6", nume: "Planul contra direcției: motorul LONG, MTF BEARISH (3 TF-uri)", q: Object.assign({ score: 90 }, BULL, { trendScore: 90, momScore: 88, structureScore: 90, volScore: 90 }), m: mtf(85, 30, 33, 35),
    ctx: { flux: 10, latime: 60, context: 58 } },
  { id: "S7", nume: "SHORT cu modelele contra (meta SKIP utilizabil, calibrare 42%)", q: Object.assign({ score: 24 }, BEAR), m: mtf(30, 28, 27, 33),
    ctx: { flux: -15, latime: 40, context: 45, cal: { p: 0.42, n: 40, state: "CALIBRATED" }, meta: { action: "SKIP", p: 0.38, state: "USABLE META" } } },
  { id: "S8", nume: "LONG la limită: dublurile tehnice trag, fluxul și lățimea contra", q: Object.assign({ score: 72 }, BULL, { structureScore: 60, volScore: 55, breakout: "NONE", divergence: "BULL DIV" }), m: mtf(62, 63, 64, 60),
    ctx: { flux: -12, latime: 40, context: 44, histCvd: -4 } },
];
const rezumat = (r) => ({
  qSignal: r.q.signal, sm: r.sm.direction, long: +r.sm.long.toFixed(2), short: +r.sm.short.toFixed(2), mcComp: r.mc.comp,
  cartela: r.cartela, planDir: r.plan.dir, master: r.mv.verdict, scor: +r.mv.score.toFixed(2), signed: +r.mv.signed.toFixed(4), porti: Array.from(r.mv.gates),
  vcConsens: r.vc.consensus, vcBias: +r.vc.weightedBias.toFixed(4), vcAcord: Number.isFinite(r.vc.agreement) ? +r.vc.agreement.toFixed(1) : null,
});

if (process.argv.includes("--instantaneu")) {
  const o = {}; for (const s of SITUATII) o[s.id] = rezumat(lume(s));
  console.log(JSON.stringify(o, null, 1));
  process.exit(0);
}

/* ACUM = v100.268 (0d0e7c3), capturat cu --instantaneu ÎNAINTE de orice schimbare. Nu se rescrie: e reperul. */
const ACUM = {
  S1: { qSignal: "LONG", sm: "LONG", long: 73.23, short: 29.77, mcComp: "BULLISH", cartela: "LONG", planDir: 1, master: "LONG", scor: 68.95, signed: 0.3789, porti: [], vcConsens: "BULLISH", vcBias: 0.4451, vcAcord: 100 },
  S2: { qSignal: "SHORT", sm: "SHORT", long: 29.77, short: 73.23, mcComp: "BEARISH", cartela: "SHORT", planDir: -1, master: "SHORT", scor: 31.05, signed: -0.3789, porti: [], vcConsens: "BEARISH", vcBias: -0.4451, vcAcord: 100 },
  S3: { qSignal: "WAIT", sm: "WAIT", long: 49.96, short: 50.04, mcComp: "NEUTRAL", cartela: "WAIT", planDir: 0, master: "WAIT", scor: 50.87, signed: 0.0175, porti: ["BASE_WAIT", "EDGE_WEAK"], vcConsens: "MIXED / NEUTRAL", vcBias: 0.073, vcAcord: null },
  S4: { qSignal: "LONG", sm: "LONG", long: 67.28, short: 35.72, mcComp: "BULLISH", cartela: "LONG", planDir: 1, master: "WAIT", scor: 40.23, signed: -0.1954, porti: ["EDGE_WEAK"], vcConsens: "MIXED / NEUTRAL", vcBias: 0.0718, vcAcord: 66.7 },
  S5: { qSignal: "LONG", sm: "WAIT", long: 56.96, short: 43.04, mcComp: "NEUTRAL", cartela: "LONG", planDir: 0, master: "WAIT", scor: 54.05, signed: 0.0811, porti: ["BASE_WAIT", "EDGE_WEAK"], vcConsens: "BULLISH", vcBias: 0.1783, vcAcord: null },
  S6: { qSignal: "LONG", sm: "LONG", long: 74.31, short: 28.69, mcComp: "BEARISH", cartela: "LONG", planDir: -1, master: "LONG", scor: 68.69, signed: 0.3738, porti: [], vcConsens: "BULLISH", vcBias: 0.4683, vcAcord: 95 },
  S7: { qSignal: "SHORT", sm: "SHORT", long: 31.32, short: 71.68, mcComp: "BEARISH", cartela: "SHORT", planDir: -1, master: "WAIT", scor: 38.45, signed: -0.2309, porti: ["META_SKIP"], vcConsens: "BEARISH", vcBias: -0.3745, vcAcord: 90 },
  S8: { qSignal: "LONG", sm: "LONG", long: 70.03, short: 36.97, mcComp: "BULLISH", cartela: "LONG", planDir: 1, master: "WAIT", scor: 54.29, signed: 0.0858, porti: ["EDGE_WEAK"], vcConsens: "BULLISH", vcBias: 0.254, vcAcord: 77.8 },
};

console.log("\nV100.269-v · AUDITUL 29.10 · un singur motor de scor (ponderi, direcție, dubluri)\n");
const R = {}; for (const s of SITUATII) R[s.id] = lume(s);
const SC = Object.fromEntries(SITUATII.map((s) => [s.id, s]));

// ───────────── B1. O singură listă de module cu ponderile lor ─────────────
/* perechile „același concept”: cheia din Master Verdict ⇒ numele modulului din Verdict Center */
const PERECHI = { base: "Base signal engine", regime: "Regime Engine v2", calibration: "Calibration v2", meta: "Meta-label TRADE/SKIP", governed: "Governed ML ensemble",
  flow: "True recent trade-flow CVD", liquidations: "Observed liquidation tape", histCvd: "Historical CVD", context: "Cross-market context", breadth: "Market Breadth Pro",
  onchain: "On-chain context", options: "Options context", structure: "Liquidity sweep confirmation" };
const P = () => R.S1.box.MOTOR_PONDERI;

await test("B1a există MOTOR_PONDERI, marcată IPOTEZE (nevalidate), cu ponderile Master pentru bază / regim / calibrare (0,26 / 0,14 / 0,12)", () => {
  const src = constApp("MOTOR_PONDERI");
  assert.ok(src, "lipsește `var MOTOR_PONDERI=` la început de rând în app.js");
  const i = APP.indexOf("\nvar MOTOR_PONDERI="), comentariu = APP.slice(Math.max(0, i - 900), i);
  assert.match(comentariu, /IPOTEZE/); assert.match(comentariu, /nevalidate/i);
  aprox(P().base.w, 0.26, 1e-12, "base:"); aprox(P().regime.w, 0.14, 1e-12, "regime:"); aprox(P().calibration.w, 0.12, 1e-12, "calibration:");
});
await test("B1b același concept, aceeași pondere: fiecare modul din Master are în Verdict Center ponderea din MOTOR_PONDERI (înainte 0,12 vs 0,26 …)", () => {
  const vcW = Object.fromEntries(R.S1.vc.modules.map((m) => [m.name, m.weight]));
  for (const [k, nume] of Object.entries(PERECHI)) {
    assert.ok(P()[k], "MOTOR_PONDERI nu are " + k);
    assert.ok(nume in vcW, "Verdict Center nu are modulul " + nume);
    assert.equal(vcW[nume], P()[k].w, `${k} / ${nume}: VC ${vcW[nume]} ≠ MOTOR_PONDERI ${P()[k].w}`);
  }
});
await test("B1c Verdict Center nu mai are ponderi scrise de mână (toate din MOTOR_PONDERI)", () => {
  const src = fnApp("buildVerdictCenterSnapshot");
  assert.doesNotMatch(src, /weight:\s*\.?\d/, "a rămas o pondere numerică în buildVerdictCenterSnapshot");
  assert.match(src, /MOTOR_PONDERI/);
});
await test("B1d Master Verdict citește ponderile și familiile din MOTOR_PONDERI (mutație: regimul la 0 ⇒ verdictul se mișcă exact ca fără regim)", () => {
  const src = fnApp("renderMasterVerdict");
  assert.doesNotMatch(src, /add\("[a-zA-Z]+",[^;]*?,\.\d+,"/, "a rămas o pondere numerică într-un add(…) din renderMasterVerdict");
  const cu = lume(SC.S8), fara = lume(SC.S8, { ponderi: (b) => { b.MOTOR_PONDERI.regime = Object.assign({}, b.MOTOR_PONDERI.regime, { w: 0 }); } });
  assert.notEqual(+fara.mv.signed.toFixed(6), +cu.mv.signed.toFixed(6), "Master nu reacționează la MOTOR_PONDERI.regime");
  /* referința: TECH fără regim = baza singură (+ setup/structură, absente în S8) */
  aprox(fara.fam.TECH, 0.7003, 0.001, "TECH fără regim = direcția × încrederea bazei:");
  const fam = lume(SC.S8, { ponderi: (b) => { b.MOTOR_PONDERI.breadth = Object.assign({}, b.MOTOR_PONDERI.breadth, { fam: "FLOW" }); } });
  assert.notEqual(+fam.fam.FLOW.toFixed(6), +cu.fam.FLOW.toFixed(6), "familia lățimii nu vine din MOTOR_PONDERI");
});

await test("B1e fiecare cheie citită de Master (add) și de Verdict Center (pw / dub) există în MOTOR_PONDERI - o cheie greșită ar opri tot verdictul", () => {
  const mv = fnApp("renderMasterVerdict"), vc = fnApp("buildVerdictCenterSnapshot");
  const chei = (re, s) => [...s.matchAll(re)].map((m) => m[1]);
  const master = chei(/\badd\("([A-Za-z0-9]+)",/g, mv), pw = chei(/\bpw\("([A-Za-z0-9]+)"/g, vc), dub = chei(/,"([A-Za-z0-9]+)"\)\);/g, vc.slice(vc.indexOf("add(dub(")));
  assert.equal(master.length, 14, "Master: " + master); assert.equal(pw.length, 23, "VC pw: " + pw); assert.equal(dub.length, 15, "VC dub: " + dub);
  for (const k of master) { assert.ok(P()[k], "Master: lipsește " + k); assert.ok(P()[k].fam, "Master: " + k + " fără familie"); assert.ok(!P()[k].inBaza, k + " e dublură, dar Master îl numără"); }
  for (const k of pw) { assert.ok(P()[k], "VC: lipsește " + k); assert.ok(!P()[k].inBaza, k + " e dublură, dar votează"); }
  for (const k of dub) { assert.ok(P()[k] && P()[k].inBaza, "VC: " + k + " nu e marcat inBaza"); assert.equal(P()[k].w, 0, k); }
});

// ───────────── B2. Dublurile scoase din a doua numărare ─────────────
const DUBLURI = ["Trend composite", "Momentum composite", "Volume / VWAP composite", "Structure composite", "Multi-timeframe composite", "RSI", "MACD histogram", "Supertrend",
  "Ichimoku", "VWAP position", "Breakout", "RSI divergence", "Regime Intelligence v65", "Liquidity / Structure v65", "Cross-Asset Confirmation v65"];
await test("B2a RSI, MACD, Supertrend și celelalte părți ale motorului de bază nu mai votează a doua oară (pondere 0, în afara acordului); rămân la vedere cu valoarea lor", () => {
  const mods = Object.fromEntries(R.S1.vc.modules.map((m) => [m.name, m]));
  for (const n of DUBLURI) {
    const m = mods[n]; assert.ok(m, "a dispărut modulul " + n + " (nimic pierdut: rămâne în tabel)");
    assert.equal(m.weight, 0, n + " pondere " + m.weight); assert.equal(m.directional, false, n + " încă direcțional");
    assert.notEqual(m.value, "—", n + " și-a pierdut valoarea"); assert.match(m.note, /motorul de bază|deja numărat/, n + " fără explicație: " + m.note);
  }
  assert.equal(mods.RSI.category, "BULLISH", "categoria rămâne (fapta la vedere)"); assert.equal(mods["MACD histogram"].category, "BULLISH");
  for (const n of ["Base signal engine", "CMF", "MFI", "True recent trade-flow CVD", "Market Breadth Pro"]) assert.equal(mods[n].directional, true, n + " trebuie să rămână direcțional");
});
await test("B2b acordul numără fiecare dovadă o singură dată: S8 = sprijin/(sprijin+opoziție) doar pe modulele care nu sunt dubluri", () => {
  const vc = R.S8.vc, dir = 1, d = vc.modules.filter((m) => m.directional && m.available && !m.severity && Math.abs(m.bias) >= 0.15 && !DUBLURI.includes(m.name));
  const sup = d.filter((m) => m.bias * dir > 0).length, opp = d.filter((m) => m.bias * dir < 0).length;
  aprox(vc.agreement, sup / (sup + opp) * 100, 1e-9, "acordul S8:");
  assert.ok(vc.agreement < ACUM.S8.vcAcord, `acordul S8 ${vc.agreement} nu a scăzut sub ${ACUM.S8.vcAcord} (dublurile îl umflau)`);
});
await test("B2c S4 (motor LONG, fluxul/piața contra): consensul VC nu mai iese „neutru spre bullish” din dubluri; are semnul lui Master (−)", () => {
  assert.ok(R.S4.mv.signed < 0, "premisa: Master vede dovezile contra");
  assert.ok(R.S4.vc.weightedBias < 0, `VC weightedBias ${R.S4.vc.weightedBias} (ACUM +0,07 din dubluri)`);
});
await test("B2d o dublură fără date rămâne indisponibilă (acoperirea nu crește): volum lipsă ⇒ „Volume / VWAP composite” și „VWAP position” —, MACD necunoscut ⇒ —", () => {
  const s = { q: Object.assign({ score: 78 }, BULL, { volScore: null, vwapAbove: null, macd: undefined }), m: mtf(72, 75, 78, 70), ctx: SC.S1.ctx };
  const mods = Object.fromEntries(lume(s).vc.modules.map((m) => [m.name, m]));
  for (const n of ["Volume / VWAP composite", "VWAP position", "MACD histogram"]) { assert.equal(mods[n].available, false, n + " a devenit disponibil fără date"); assert.equal(mods[n].category, "NEUTRAL", n); }
  assert.equal(mods.RSI.available, true, "RSI are date");
});

// ───────────── B3. O singură funcție de direcție ─────────────
await test("B3a directieUnica: LONG/SHORT doar cu încrederea ≥ prag ȘI diferența ≥ 8; altfel WAIT", () => {
  assert.ok(areFn("directieUnica"), "lipsește function directieUnica în app.js");
  const d = R.S1.box.directieUnica;
  assert.equal(d(70, 30, 64), "LONG"); assert.equal(d(30, 70, 64), "SHORT"); assert.equal(d(60, 30, 64), "WAIT", "sub prag");
  assert.equal(d(67, 60, 64), "WAIT", "diferență 7 < 8"); assert.equal(d(68, 60, 64), "LONG", "diferență 8"); assert.equal(d(64, 30, 64), "LONG", "exact pe prag");
});
await test("B3b motorul (signalModel) ia direcția din directieUnica (mutație: o directieUnica falsă ⇒ sm.direction o urmează)", () => {
  const r = lume(SC.S1, { ponderi: (b) => { b.directieUnica = () => "SHORT"; } });
  assert.equal(r.sm.direction, "SHORT");
  assert.equal(R.S1.sm.direction, "LONG");
});
await test("B3c cartela „Adaptive signal engine” spune direcția motorului (S5: WAIT ca în capul paginii, nu LONG din scorul tehnic)", () => {
  assert.equal(R.S5.cartela, R.S5.sm.direction); assert.equal(R.S5.cartela, "WAIT");
  for (const s of SITUATII) assert.equal(R[s.id].cartela, R[s.id].sm.direction, s.id);
});
await test("B3d planul de invalidare urmează direcția motorului (S6: motor LONG, MTF BEARISH ⇒ invalidare SUB preț, nu deasupra)", () => {
  assert.equal(R.S6.plan.dir, 1); assert.ok(R.S6.plan.inv < R.S6.q.price, "invalidarea " + R.S6.plan.inv);
  assert.match(R.S6.plan.txt, /bullish/);
  for (const s of SITUATII) assert.equal(R[s.id].plan.dir, R[s.id].sm.direction === "LONG" ? 1 : R[s.id].sm.direction === "SHORT" ? -1 : 0, s.id);
  const src = fnApp("analyze");
  assert.doesNotMatch(src.slice(src.indexOf('$("engineNotes")')), /let dir=mc\.comp/, "planul încă citește mc.comp");
});
await test("B3e Master Verdict și Verdict Center citesc aceeași direcție (tm.direction = sm.direction = directieUnica)", () => {
  for (const s of SITUATII) { const r = R[s.id], d = r.sm.direction === "LONG" ? 1 : r.sm.direction === "SHORT" ? -1 : 0; assert.equal(r.tm.direction, r.sm.direction, s.id); assert.equal(r.vc.dir, d, s.id); }
});

// ───────────── A. Ce se schimbă față de v100.268 pe cele 8 situații ─────────────
/* schimbările așteptate, fiecare explicată de unificare; orice altă diferență pică */
const ASTEPTAT = {
  S5: { cartela: "cartela spune direcția motorului (WAIT), nu scorul tehnic (LONG)" },
  S6: { planDir: "planul de invalidare urmează motorul (LONG), nu MTF-ul (BEARISH)" },
};
const VC_CAMPURI = ["vcConsens", "vcBias", "vcAcord"];   /* Verdict Center: descriptiv; se schimbă prin ponderile comune + dublurile scoase */
const DUPA = {};
for (const s of SITUATII) DUPA[s.id] = rezumat(R[s.id]);
await test("A1 verdictul final (Master) neschimbat pe toate 8 situațiile: verdict, scor, signed, porți", () => {
  for (const s of SITUATII) { const a = ACUM[s.id], d = DUPA[s.id];
    assert.equal(d.master, a.master, s.id + " verdict"); assert.equal(d.scor, a.scor, s.id + " scor"); assert.equal(d.signed, a.signed, s.id + " signed"); assert.deepEqual(d.porti, a.porti, s.id + " porți");
    assert.equal(d.sm, a.sm, s.id + " sm"); assert.equal(d.long, a.long, s.id + " long"); assert.equal(d.short, a.short, s.id + " short"); }
});
await test("A2 în afara Verdict Center, singurele diferențe sunt cele explicate (S5 cartela, S6 planul)", () => {
  const nexplicat = [];
  for (const s of SITUATII) for (const k of Object.keys(ACUM[s.id])) {
    if (VC_CAMPURI.includes(k)) continue;
    const a = JSON.stringify(ACUM[s.id][k]), d = JSON.stringify(DUPA[s.id][k]);
    if (a !== d && !(ASTEPTAT[s.id] && ASTEPTAT[s.id][k])) nexplicat.push(`${s.id}.${k}: ${a} → ${d}`);
    if (a === d && ASTEPTAT[s.id] && ASTEPTAT[s.id][k]) nexplicat.push(`${s.id}.${k}: trebuia să se schimbe (${ASTEPTAT[s.id][k]})`);
  }
  assert.deepEqual(nexplicat, []);
});

/* Verdict Center după unificare (descriptiv, nu dă verdictul): fixat ca să se vadă orice mișcare viitoare. De ce se mișcă:
   S1/S2/S3/S6 - dublurile tehnice nu mai împing consensul (aceeași parte, mai puțin umflat); S4/S5/S8 - consensul nu mai iese
   BULLISH / neutru-spre-bullish din RSI+MACD+Supertrend+compozite numărate a doua oară (acum de aceeași parte cu Master);
   S7 - calibrarea și meta-label-ul (contra short-ului) au acum ponderea din Master (0,12 / 0,14, nu 0,05 / 0,055). */
const DUPA_VC = {
  S1: { vcConsens: "BULLISH", vcBias: 0.3491, vcAcord: 100 }, S2: { vcConsens: "BEARISH", vcBias: -0.3491, vcAcord: 100 },
  S3: { vcConsens: "MIXED / NEUTRAL", vcBias: 0.0096, vcAcord: null }, S4: { vcConsens: "BEARISH", vcBias: -0.1526, vcAcord: 33.3 },
  S5: { vcConsens: "MIXED / NEUTRAL", vcBias: 0.1077, vcAcord: null }, S6: { vcConsens: "BULLISH", vcBias: 0.331, vcAcord: 100 },
  S7: { vcConsens: "BEARISH", vcBias: -0.1824, vcAcord: 71.4 }, S8: { vcConsens: "MIXED / NEUTRAL", vcBias: 0.0832, vcAcord: 50 },
};
await test("A3 Verdict Center după unificare: consensul, înclinarea și acordul fixate pe cele 8 situații", () => {
  for (const s of SITUATII) for (const k of VC_CAMPURI) assert.equal(DUPA[s.id][k], DUPA_VC[s.id][k], `${s.id}.${k}`);
});
/* Unificarea COMPLETĂ ar scoate și regimul v2 din Master (direcția lui = trend+momentum, deci tot din bază). N-am făcut-o: e în poarta
   EDGE_WEAK (proba v100267-b fixează signed cu el) și ar schimba verdictul final - aici se măsoară cât. */
/* Măsurat: S8 WAIT ⇒ LONG (signed 0,086 ⇒ 0,173, trece poarta de 0,12). Regimul e de aceeași parte cu baza, dar mai mic, deci
   în media familiei TECH o diluează: scos, motorul devine MAI AGRESIV (un trade în plus). Prudența și proba v100267-b ⇒ rămâne. */
await test("A4 (măsurătoare) fără regimul v2 în Master s-ar schimba verdictul final în 1 din 8 situații (S8: WAIT ⇒ LONG, mai agresiv) - de aceea a rămas", () => {
  const schimbate = [];
  for (const s of SITUATII) {
    const f = lume(s, { ponderi: (b) => { b.MOTOR_PONDERI.regime = Object.assign({}, b.MOTOR_PONDERI.regime, { w: 0 }); } });
    if (f.mv.verdict !== R[s.id].mv.verdict) schimbate.push(`${s.id} ${R[s.id].mv.verdict}→${f.mv.verdict} (signed ${R[s.id].mv.signed.toFixed(3)}→${f.mv.signed.toFixed(3)})`);
  }
  console.log("       fără regim: " + (schimbate.join(" · ") || "niciun verdict schimbat"));
  assert.deepEqual(schimbate.map((x) => x.split(" ")[0]), ["S8"]);
});

console.log("\n  Ce s-a schimbat față de v100.268:");
for (const s of SITUATII) {
  const dif = Object.keys(ACUM[s.id]).filter((k) => JSON.stringify(ACUM[s.id][k]) !== JSON.stringify(DUPA[s.id][k])).map((k) => `${k} ${JSON.stringify(ACUM[s.id][k])} → ${JSON.stringify(DUPA[s.id][k])}`);
  console.log(`   ${s.id} ${s.nume}: verdict ${ACUM[s.id].master} → ${DUPA[s.id].master}${dif.length ? " · " + dif.join(" · ") : " · nimic"}`);
}

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
