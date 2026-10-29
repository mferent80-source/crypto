// Proba v100.267-b (auditul 29.10 al Crypto Radar) - patru reparații, fiecare cu testul care pica pe codul de dinainte.
//  1. Master Verdict: contextul (risk-on) și lățimea pieței sunt DIRECȚIONALE în sine (peste 50 = susțin urcarea), ca on-chain;
//     înmulțite cu dir, pe un SHORT o lățime de 85 împingea verdictul spre „cel mai short” (familia CONTEXT −0,70, scor 26),
//     iar cipurile de risc (v64BreadthAlignment) spuneau invers.
//  2. Poarta EDGE_WEAK: edge-ul se măsoară în direcția setup-ului (signed*dir), nu |signed| - un LONG cu scor 35/100 trecea
//     și explicația scria „setup LONG validat de gate-urile curente”.
//  3. Probabilitatea calibrată: fără rezultate ieșea încrederea brută (N=0 ⇒ „LONG 72%”, familia MODEL +0,44 în verdict).
//     Sub 30 de rezultate e null („—”), nu intră în verdict; lângă cifră stă N.
//  4. Tabloul botului: la schimbarea botului, direcția, lumânările de 4 h și funding-ul monedei VECHI apăreau lângă botul nou
//     (KPI „Piața”, rezumatul direcției, banda, Sfaturile, pivoții de 4 h) până sosea tura nouă (5–20 s).
// Funcțiile se iau din public/app.js după text și se rulează cu dependențele injectate (ca proba-v100264 / proba-audit23-ecran).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";   // TextRo ca global (tbDeseneazaKpi îl folosește)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const APP = citeste("public", "app.js");
/* de la „function nume(” la început de rând până la următorul „\nfunction ” (un comentariu cu același text nu păcălește) */
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.267-b · AUDITUL 29.10 · verdict + calibrare + tabloul botului\n");

class El {
  constructor() { this.textContent = ""; this.className = ""; this.innerHTML = ""; this.hidden = false; this.style = {}; this.children = []; this.classList = { contains: (c) => String(this.className).split(/\s+/).includes(c) }; }
  append(...x) { this.children.push(...x); } appendChild(x) { this.children.push(x); return x; } replaceChildren(...x) { this.children = [...x]; }
}
const pagina = () => { const els = {}; return { els, $: (id) => (els[id] ??= new El()) }; };
/* un context nou pe fiecare rulare: funcțiile extrase văd DOAR ce le dăm (un nume uitat = ReferenceError, nu o trecere tăcută) */
const ruleaza = (nume, box) => { vm.createContext(box); vm.runInContext(nume.map(fnApp).join("\n"), box, { filename: "app-extras.js" }); return box; };
const aprox = (a, b, eps = 0.005, msg) => assert.ok(Number.isFinite(a) && Math.abs(a - b) <= eps, (msg || "") + ` așteptat ≈${b}, primit ${a}`);

// ───────────── Master Verdict (renderMasterVerdict întreg, cu modulele din jur ca stub-uri) ─────────────
function verdict({ dir = "SHORT", conf = 60, latime = null, context = null, cal = null, flux = null, regim = null } = {}) {
  const { els, $ } = pagina(); let expl = null;
  const window = {
    __radarState: { symbol: "ETHUSDT", tf: "4h" },
    __signalState: { tm: { direction: dir, entryLow: 100, entryHigh: 101, stop: 105, tp1: 95, tp2: 90, tp3: 85 }, sm: { long: dir === "LONG" ? conf : 100 - conf, short: dir === "SHORT" ? conf : 100 - conf } },
  };
  if (latime != null) window.__marketBreadthV64 = { score: latime, ts: Date.now(), state: latime >= 65 ? "BULLISH" : latime <= 35 ? "BEARISH" : "NEUTRAL", n: 24, total: 24, divergence: "NONE" };
  if (context != null) window.__intelContext = { global: {}, macro: { riskOnScore: context } };
  const box = ruleaza(["clamp", "contextScoreFrom", "v64BreadthAlignment", "renderMasterVerdict"], {
    window, $,
    renderVerdictCenter: () => ({}), renderVerdictExplainer: (a) => { expl = a; return {}; }, masterDataQuality: () => 92,
    regimeV2State: regim == null ? null : { probs: { TREND_UP: regim > 0 ? 1 : 0, TREND_DOWN: regim < 0 ? 1 : 0 }, state: regim > 0 ? "TREND_UP" : "TREND_DOWN", confidence: 0.8 }, renderRegimeV2: () => null, currentMetaDecision: () => ({ action: "WAIT", p: NaN, state: "LEARNING" }),
    calibrationV2State: cal, renderCalibrationV2: () => null,
    decisionStateMatches: (x) => !!x, trueFlowState: flux == null ? null : { delta: flux, state: flux < 0 ? "SELL" : "BUY" },
    observedLiquidationHeatmap: () => ({ rows: [], short: 0, long: 0 }), setupQualityCurrent: () => null,
    portfolioBudgetSummary: () => ({ state: "PASS" }), governedComponents: () => ({}),
    strategyLifecycle: () => ({ state: "ACTIVE" }), riskGuard: () => ({ state: "OK", mult: 1 }), externalIntelState: {},
    v65DecisionSuite: () => ({ killSwitch: { state: "NORMAL", detail: "" }, conflict: { state: "CLEAR", score: 80, detail: "" }, failure: { state: "NONE" }, eventRisk: { state: "CLEAR" }, entry: { action: "ENTER", state: "OK" }, exit: { action: "HOLD", state: "OK" }, summary: { state: "OK", quality: 80 } }),
    v66EdgeValidationSuite: () => ({ state: "OK", score: 70, quality: { score: 70 }, hardBlock: false, hardReasons: [], decay: { state: "STABLE", detail: "" }, dna: { state: "NEUTRAL", current: { n: 0 } }, sufficiency: { state: "OK", score: 70 } }),
    assetClass: () => "CRYPTO", FuturesCitire: { inVerdict: () => null }, metaEnsembleV2: null, driftSnapshot: null,
    verdictChip: (x) => x, num: (x) => String(x), compact: (x) => String(x), activeModelVersionId: null, metaLabelState: null, mlShadow: null, extMinsText: String,
    renderProfitReadiness: () => {}, renderV65DecisionOS: () => {}, renderV66EdgeValidation: () => {},
  });
  const mv = box.renderMasterVerdict();
  const fam = Object.fromEntries((window.__masterFamilyScores || []).map((f) => [f.family, f.v]));
  return { mv, expl, els, fam, gates: (expl && expl.gates || []).map((g) => g.code) };
}

await test("1a SHORT cu lățimea 85 (piața urcă larg): familia CONTEXT e +0,70 (contra short-ului), nu −0,70", () => {
  const r = verdict({ dir: "SHORT", latime: 85 });
  aprox(r.fam.CONTEXT, 0.7, 0.005, "CONTEXT la SHORT/lățime 85:");
});
await test("1b SHORT: lățimea 85 dă un scor MAI PUȚIN short decât lățimea 15 (înainte: 85 ⇒ cel mai short)", () => {
  const sus = verdict({ dir: "SHORT", latime: 85 }).mv.score, jos = verdict({ dir: "SHORT", latime: 15 }).mv.score;
  assert.ok(sus > jos, `scor la lățime 85 = ${sus.toFixed(1)}, la 15 = ${jos.toFixed(1)}`);
});
await test("1c SHORT cu lățimea 85: niciun cip „confirms participation”; riscul spune că lățimea e contra (ca v64BreadthAlignment)", () => {
  const r = verdict({ dir: "SHORT", latime: 85 });
  assert.ok(!r.expl.pos.includes("Market breadth confirms participation"), "pos: " + JSON.stringify(r.expl.pos));
  assert.ok(r.expl.risks.includes("Market breadth opposes the setup"), "risks: " + JSON.stringify(r.expl.risks));
  assert.ok(r.expl.risks.some((x) => /^Market breadth opposes setup · 85\/100$/.test(x)), "cipul v64 rămâne: " + JSON.stringify(r.expl.risks));
});
await test("1d SHORT cu contextul risk-on 85: familia CONTEXT e +0,70 (contra short-ului)", () => {
  const r = verdict({ dir: "SHORT", context: 85 });
  aprox(r.fam.CONTEXT, 0.7, 0.005, "CONTEXT la SHORT/context 85:");
});
await test("1e simetria: SHORT cu lățimea 15 ⇒ CONTEXT −0,70 și cip de confirmare; LONG cu lățimea 85 ⇒ +0,70, confirmare (neschimbat)", () => {
  const s = verdict({ dir: "SHORT", latime: 15 }), l = verdict({ dir: "LONG", latime: 85 }), lc = verdict({ dir: "LONG", context: 85 });
  aprox(s.fam.CONTEXT, -0.7, 0.005, "SHORT/15:"); assert.ok(s.expl.pos.includes("Market breadth confirms participation"), "SHORT/15 pos: " + JSON.stringify(s.expl.pos));
  aprox(l.fam.CONTEXT, 0.7, 0.005, "LONG/85:"); assert.ok(l.expl.pos.includes("Market breadth confirms participation"));
  aprox(lc.fam.CONTEXT, 0.7, 0.005, "LONG/context 85:");
});

// ───────────── Poarta EDGE_WEAK ─────────────
await test("2a LONG cu consensul contra (signed ≈ −0,29, scor ≈ 36): poarta EDGE_WEAK ⇒ WAIT, nu „LONG validat”", () => {
  const r = verdict({ dir: "LONG", conf: 60, flux: -35, latime: 0 });
  aprox(r.mv.signed, -0.289, 0.01, "signed:");
  assert.ok(r.gates.includes("EDGE_WEAK"), "porți: " + JSON.stringify(r.gates));
  assert.equal(r.mv.verdict, "WAIT"); assert.equal(r.els.masterVerdict.textContent, "WAIT");
});
/* 2b folosește regimul și fluxul (direcționale în sine, neatinse de bugul 1) ca să probeze poarta singură */
await test("2b simetria: SHORT cu consensul contra (signed ≈ +0,38) ⇒ EDGE_WEAK; SHORT cu consensul pe direcție (≈ −0,85) trece", () => {
  const contra = verdict({ dir: "SHORT", conf: 60, flux: 35, regim: 1 });
  aprox(contra.mv.signed, 0.384, 0.01, "signed contra:");
  assert.ok(contra.gates.includes("EDGE_WEAK"), "porți: " + JSON.stringify(contra.gates)); assert.equal(contra.mv.verdict, "WAIT");
  const pe = verdict({ dir: "SHORT", conf: 60, flux: -35, regim: -1 });
  assert.ok(pe.mv.signed < -0.5, "signed pe direcție: " + pe.mv.signed);
  assert.ok(!pe.gates.includes("EDGE_WEAK"), "porți: " + JSON.stringify(pe.gates)); assert.equal(pe.mv.verdict, "SHORT");
});
await test("2c textul porții spune direcția setup-ului și edge-ul cu semn (nu |signed|)", () => {
  const r = verdict({ dir: "LONG", conf: 60, flux: -35, latime: 0 });
  const g = r.expl.gates.find((x) => x.code === "EDGE_WEAK");
  assert.ok(g, "lipsește EDGE_WEAK");
  assert.match(g.why, /LONG/); assert.match(g.why, /−29\/100/); assert.match(g.why, /12/);
});

// ───────────── Probabilitatea calibrată ─────────────
const randuri = (n) => Array.from({ length: n }, (_, i) => ({ market: "CRYPTO", tf: "4h", regim: "TREND", longConf: 70, shortConf: 20, r: i % 3 === 0 ? -1 : 1 }));
function calibrare(n) {
  const box = ruleaza(["clamp", "confidenceOfRow", "weightedCalibration", "calibrationV2"], {
    window: { __radarState: { tf: "4h", q: { regime: "TREND" } }, __signalState: { sm: { long: 72, short: 20 } } },
    analysisSource: () => "BINANCE", resolvedChronological: () => randuri(n), assetClass: () => "CRYPTO", canonicalRegime: (x) => x.regim || x.regime || "TREND",
  });
  return box.calibrationV2();
}
await test("3a fără niciun rezultat: probabilitatea calibrată e null (înainte: încrederea brută 0,72), N=0", () => {
  const c = calibrare(0);
  assert.equal(c.p, null, "p=" + c.p); assert.equal(c.n, 0); aprox(c.raw, 0.72, 1e-9, "raw rămâne afișat separat:");
});
await test("3b sub 30 de rezultate (12): tot null", () => {
  const c = calibrare(12);
  assert.equal(c.p, null, "p=" + c.p); assert.equal(c.n, 12);
});
await test("3c de la 30 de rezultate: cifra există, cu N lângă ea", () => {
  const c = calibrare(40);
  assert.ok(Number.isFinite(c.p) && c.p > 0 && c.p < 1, "p=" + c.p); assert.equal(c.n, 40);
});
await test("3d verdictul: calibrarea fără rezultate nu intră (familia MODEL lipsește; înainte +0,44)", () => {
  const r = verdict({ dir: "LONG", conf: 72, cal: calibrare(0) });
  assert.equal(r.fam.MODEL, undefined, "MODEL=" + r.fam.MODEL);
  assert.equal(r.els.masterCalibrated.textContent, "—");
  const r12 = verdict({ dir: "SHORT", conf: 72, cal: calibrare(12) });
  assert.equal(r12.fam.MODEL, undefined, "MODEL la N=12: " + r12.fam.MODEL);
});
await test("3e verdictul: cu 40 de rezultate calibrarea intră și „Calibrated probability” arată N", () => {
  const c = calibrare(40), r = verdict({ dir: "LONG", conf: 72, cal: c });
  aprox(r.fam.MODEL, (c.p - 0.5) * 2, 1e-9, "MODEL:");
  assert.equal(r.els.masterCalibrated.textContent, `${(c.p * 100).toFixed(0)}% · N40`);
});
function explicatie(cal, dir = 1) {
  const { els, $ } = pagina();
  const box = ruleaza(["veSetList", "veModuleScore", "veModuleText", "renderVerdictExplainer"], {
    $, document: { createElement: () => new El() }, masterDataQuality: () => 92, num: (v) => Number(v).toFixed(4),
    calibrationV2State: null, buildVerdictCenterSnapshot: () => vc,
    window: { __radarState: { symbol: "ETHUSDT" }, __signalState: { tm: { direction: dir > 0 ? "LONG" : "SHORT", entryLow: 100, entryHigh: 102, stop: 95, tp1: 104, tp2: 108 } } },
  });
  const vc = { modules: [], agreement: 67, coverage: 88, weightedBias: 0.2, conviction: 30, consensus: "BULLISH" };
  box.renderVerdictExplainer({ verdict: "WAIT", dir, quality: 92, cal, gates: [], vc });
  return els.decisionCalibrated.textContent;
}
await test("3f „Piața azi”: fără rezultate „Prob. calibrată” e „—” (înainte „LONG 72%”); cu 40 arată N lângă cifră", () => {
  assert.equal(explicatie(calibrare(0)), "—");
  const c = calibrare(40);
  assert.equal(explicatie(c), `LONG ${(c.p * 100).toFixed(0)}% · N40`);
  assert.equal(explicatie({ p: 0.64 }, -1), "SHORT 64%", "fără N (obiect vechi) rămâne ca înainte");
});
await test("3g Verdict Center: modulul „Calibration v2” nu e disponibil fără rezultate (înainte: 72,0%, cu bias)", () => {
  const sursa = fnApp("buildVerdictCenterSnapshot"), a = sursa.indexOf("const calBias="), b = sursa.indexOf("\n", sursa.indexOf('add(vcItem("Calibration v2"', a));
  assert.ok(a > 0 && b > a, "nu găsesc rândurile calibrării în buildVerdictCenterSnapshot");
  const ruleazaFrag = (cal, dir) => { let item = null; new Function("cal", "dir", "add", "vcItem", sursa.slice(a, b))(cal, dir, (x) => { item = x; }, (name, family, bias, value, detail, o) => ({ name, bias, value, ...o })); return item; };
  const gol = ruleazaFrag(calibrare(0), 1);
  assert.equal(gol.available, false, JSON.stringify(gol)); assert.ok(!Number.isFinite(gol.bias), "bias=" + gol.bias);
  const c = calibrare(40), plin = ruleazaFrag(c, 1);
  assert.equal(plin.available, true); aprox(plin.bias, (c.p - 0.5) * 2, 1e-9, "bias:"); assert.match(plin.value, /· N40/);
});
await test("3h Decision Core: „Context calibrated” e „—” fără rezultate, cu N lângă cifră când există", () => {
  const ruleazaR = (c) => { const { els, $ } = pagina(); ruleaza(["renderCalibrationV2"], { $, calibrationV2: () => c, calibrationV2State: null }).renderCalibrationV2(); return els; };
  assert.equal(ruleazaR(calibrare(0)).calV2Prob.textContent, "—");
  const c = calibrare(40);
  assert.equal(ruleazaR(c).calV2Prob.textContent, `${(c.p * 100).toFixed(0)}% · N40`);
});

// ───────────── Tabloul botului: moneda veche lângă botul nou ─────────────
const TabloBot = {
  simboluri: (baza, quote, sp) => ({ pionex: sp || `${baza}_${quote}_PERP`, binance: `${baza}${quote}` }),
  alegeBot: (boti, id) => ({ bot: boti.find((b) => String(b.id) === id) || null, motiv: "ales" }),
};
const ETH = { id: "b1", baza: "ETH", quote: "USDT", directie: "long", simbol: "ETH" }, SOL = { id: "b2", baza: "SOL", quote: "USDT", directie: "long", simbol: "SOL" };
const rez = (moneda) => [{ tf: "4H", dir: "urca", eticheta: "4 ore", fata: { ton: "bine" }, formare: { pct: 7.1 }, moneda }, { tf: "1D", dir: "urca", eticheta: "1 zi", moneda }];
const directie = (b) => ({ la: Date.now(), simbol: `${b.baza}_${b.quote}_PERP|${b.directie}`, rez: rez(b.baza), randuri4h: [["bare " + b.baza]], inLucru: false });
const extra = (b, funding) => ({ la: Date.now(), bot: b.id, inLucru: false, funding, fundingHist: [funding] });
const Directie = { rezumat: (r) => ({ ton: "bine", text: "rezumat " + r[0].moneda }) };
const stare = (bot, d, e) => ({ bot, botBrut: null, boti: [ETH, SOL], routeOk: true, directie: d, extra: e, klinePerp: [], graficCache: {}, istoric: [] });

await test("4a tbAlegeBot golește direcția și partea botului din extra (funding-ul lui); soldul futures al CONTULUI rămâne", () => {
  const vechi = Object.assign(extra(ETH, 0.0005), { inLucru: true, futures: { total: 250 }, futuresEroare: null, istoricEroare: "doar-acasa" });
  const tbStare = stare(ETH, directie(ETH), vechi);
  const box = ruleaza(["tbAlegeBot"], { tbStare, TabloBot, TB_BOT_ALES: "k", tbScrie: () => true, renderTabloBot: () => {}, tbAduDate: () => Promise.resolve() });
  box.tbAlegeBot("b2");
  assert.equal(tbStare.bot.id, "b2");
  assert.equal(tbStare.directie ?? null, null, "directie: " + JSON.stringify(tbStare.directie && tbStare.directie.simbol));
  const e = tbStare.extra || {};
  assert.equal(e.bot ?? null, null, "extra.bot: " + e.bot); assert.equal(e.funding ?? null, null, "extra.funding: " + e.funding); assert.equal(e.fundingHist ?? null, null);
  assert.ok(!e.inLucru && !e.la, "o tură în lucru pe botul vechi nu ține pe loc tura nouă: " + JSON.stringify({ inLucru: e.inLucru, la: e.la }));
  assert.equal(e.futures && e.futures.total, 250, "soldul futures al contului nu ține de bot - nu dispare la schimbare");
  assert.equal(e.istoricEroare, "doar-acasa");
  assert.equal(vechi.funding, 0.0005, "obiectul vechi rămâne al turei vechi (scrie acolo, nu în cel nou)");
});
function sfaturi(tbStare) {
  let intrare = null; const { $ } = pagina();
  ruleaza(["tbCheieDir", "renderTabloSfaturi"], {
    $, tbStare, TabloBot, Directie, Scenariu: {}, escapeHtml: String, tbTextFaraBot: () => "fără bot", tbFisa: { botId: null }, tbRenderTodo: () => {},
    Sfaturi: { intrare: (x) => { intrare = x; return x; }, sfaturi: () => [] },
  }).renderTabloSfaturi();
  return intrare;
}
await test("4b Sfaturile botului nou nu primesc lumânările, rezumatul și funding-ul monedei vechi; ale lui trec", () => {
  const x = sfaturi(stare(SOL, directie(ETH), extra(ETH, 0.0005)));
  assert.equal(x.k4 ?? null, null, "k4: " + JSON.stringify(x.k4)); assert.equal(x.rezumat ?? null, null, "rezumat: " + JSON.stringify(x.rezumat));
  assert.equal(x.fata4h ?? null, null); assert.ok(!x.dir4h, "dir4h: " + x.dir4h);
  assert.equal(x.funding ?? null, null, "funding: " + x.funding); assert.equal(x.fundingHist ?? null, null);
  const y = sfaturi(stare(SOL, directie(SOL), extra(SOL, 0.0001)));
  assert.deepEqual(JSON.parse(JSON.stringify(y.k4)), [["bare SOL"]]); assert.equal(y.rezumat.text, "rezumat SOL"); assert.equal(y.dir4h, "urca"); assert.equal(y.funding, 0.0001);
});
function kpi(tbStare) {
  const { els, $ } = pagina();
  ruleaza(["tbFormateazaSemn", "tbTon", "tbCheieDir", "tbDeseneazaKpi"], {
    $, tbStare, TabloBot, Directie, TextRo: globalThis.TextRo, tbTextFaraBot: () => "fără bot",
    botiNr: (v) => (v == null || v === "" || typeof v === "boolean" ? null : Number.isFinite(+v) ? +v : null), botiClasa: () => "", tbKpiPretDeseneaza: () => {}, tbPretScurt: String,
  }).tbDeseneazaKpi();
  return els;
}
await test("4c KPI „Piața” pe botul nou: „—” / „aștept lumânările” cât direcția e a monedei vechi; a lui se arată", () => {
  const e = kpi(stare(SOL, directie(ETH), null));
  assert.equal(e.tbKpiPiata.textContent, "—"); assert.equal(e.tbKpiPiataSub.textContent, "aștept lumânările");
  const f = kpi(stare(SOL, directie(SOL), null));
  assert.equal(f.tbKpiPiata.textContent, "Cu botul"); assert.match(f.tbKpiPiataSub.textContent, /bara de 4 ore acum 7,1%/);
});
function directiaRez(tbStare) {
  const { els, $ } = pagina();
  ruleaza(["tbTon", "tbCheieDir", "renderTabloDirectia"], { $, tbStare, TabloBot, Directie, renderTabloTrend: () => {}, tbDeseneazaKpi: () => {}, tbActualizeazaBanda: () => {} }).renderTabloDirectia();
  return els.tbDirectieRezumat.textContent;
}
await test("4d rezumatul direcției pe botul nou: „Aștept lumânările…”, nu rezumatul monedei vechi", () => {
  assert.equal(directiaRez(stare(SOL, directie(ETH), null)), "Aștept lumânările…");
  assert.equal(directiaRez(stare(SOL, directie(SOL), null)), "rezumat SOL");
});
function banda(tbStare) {
  let primit; const { $ } = pagina();
  ruleaza(["tbCheieDir", "tbActualizeazaBanda"], {
    $, tbStare, TabloBot, Directie, pvOpreste: () => {}, pvArata: () => {}, pvPorneste: () => {}, pvAduZi: () => {}, pvPretPentru: () => null, pvZiPentru: () => null,
    PretViu: { banda: (o) => { primit = o; return null; } },
  }).tbActualizeazaBanda();
  return primit;
}
await test("4e banda de sus pe botul nou: fără „piața” monedei vechi", () => {
  assert.equal(banda(stare(SOL, directie(ETH), null)).piata ?? null, null);
  assert.equal(banda(stare(SOL, directie(SOL), null)).piata.text, "rezumat SOL");
});
function pivoti(tbStare) {
  const box = ruleaza(["tbCheieDir", "tbValoarePt"], {
    tbStare, TabloBot, tbValoare: { simbol: "SOL_USDT_PERP", la: Date.now(), inLucru: false, zona: { z: 1 } }, getJSON: () => Promise.reject(new Error("fără rețea în probă")), renderTabloGrafic: () => {},
    GraficBot: { bare: (x) => x }, Valoare: { pivoti: (bare) => bare.map((x) => "pivot " + x[0]), zona: () => null },
  });
  return JSON.parse(JSON.stringify(vm.runInContext("tbValoarePt(tbStare.bot)", box)));
}
await test("4f pivoții de 4 h pe graficul botului nou nu vin din lumânările monedei vechi", () => {
  assert.deepEqual(pivoti(stare(SOL, directie(ETH), null)).pivoti, []);
  assert.deepEqual(pivoti(stare(SOL, directie(SOL), null)).pivoti, ["pivot bare SOL"]);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
