// Proba v100.269-l (ideile auditului 29.10 al Crypto Radar) - trei idei, fiecare cu testul care pica pe codul de dinainte.
//  1. Laboratorul doarme când nu ești pe el: fluxul de lichidări Binance (!forceOrder@arr) curge doar cât se vede Context Intelligence
//     (banda) sau Decision Core (harta) și cu fila vizibilă; localStorage se scrie cel mult o dată la 30 s (și la oprire).
//     Paznicul v67 rulează la 30 s doar cât panoul lui se vede, altfel cel mult o dată la 5 min; bătăile din IndexedDB mai vechi
//     de 7 zile (sau peste 3.000) se șterg singure.
//  2. Verificările v67 nu mai zic „OK” când n-au măsurat nimic: a treia stare NEVERIFICAT („încă nemăsurat”, gri, fără penalizare,
//     fără blocare); la fel „Sentiment” pe Starea aplicației cât Fear & Greed e încă „—”.
//  3. Porțile ML: n_test ≥ 100 ȘI limita de jos a IC 95% a AUC peste 0,5 (eroarea standard = max(Hanley–McNeil, bootstrap pe ZILE)),
//     pragul corectat Bonferroni pe încercări (reantrenări pe date/setări diferite); contorul se spune lângă poartă.
// Funcțiile se iau din public/app.js după text și se rulează cu dependențele injectate (ca proba-v100267-b).
//   node scripts/proba-v100269-l.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* APP_JS = altă copie de app.js (pentru mutații: aceeași probă pe codul cu o reparație scoasă) */
const APP = fs.readFileSync(process.env.APP_JS || path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
/* de la „function nume(” (sau „async function nume(”) la început de rând până la următoarea funcție de la început de rând */
const fnApp = (nume) => {
  let k = APP.indexOf("\nfunction " + nume + "(");
  if (k < 0) k = APP.indexOf("\nasync function " + nume + "(");
  assert.ok(k >= 0, "lipsește " + nume + " în app.js");
  const re = /\n(?:async )?function /g; re.lastIndex = k + 10; const m = re.exec(APP);
  return APP.slice(k + 1, m ? m.index : undefined);
};
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => {
    picate++;
    console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`);
  });
}
console.log("\nV100.269-l · AUDITUL 29.10 · laboratorul doarme + NEVERIFICAT + porțile ML\n");

class El {
  constructor(id) { this.id = id; this.textContent = ""; this.className = ""; this.innerHTML = ""; this.title = ""; this.open = false; const self = this; this.classList = { contains: (c) => String(self.className).split(/\s+/).includes(c) }; }
}
const pagina = () => { const els = {}; return { els, $: (id) => (els[id] ??= new El(id)) }; };
const ruleaza = (nume, box) => { vm.createContext(box); vm.runInContext(nume.map(fnApp).join("\n"), box, { filename: "app-extras.js" }); return box; };
const asteapta = () => new Promise((r) => setTimeout(r, 0));

// ───────────── 1a. fluxul de lichidări ─────────────
function cutieLiq({ peste = "dash", ascuns = false } = {}) {
  const { els, $ } = pagina(), socketuri = [], scrieri = [], ls = {}, desene = { banda: 0, harta: 0 }, ceas = { t: Date.UTC(2026, 9, 29, 10, 0) };
  const arata = (id) => { for (const p of ["dash", "intel", "decisioncore", "health", "decision"]) $(p).className = p === id ? "panel on" : "panel"; };
  arata(peste);
  class FakeWS { constructor(url) { this.url = url; this.readyState = 0; this.inchis = false; socketuri.push(this); } close() { this.inchis = true; this.readyState = 3; } }
  const document = { hidden: ascuns, addEventListener: () => {} };
  const box = ruleaza(["normalizeLiqEvent", "pruneLiq", "stopLiquidationTape", "startLiquidationTape", "persistObservedLiquidations", "ensureLiquidationTape", "liqPaginaVizibila", "liqUrmeazaPagina"], {
    $, document, WebSocket: FakeWS, JSON, Math, Array, Number, String,
    Date: { now: () => ceas.t },
    localStorage: { setItem: (k, v) => { scrieri.push({ k, t: ceas.t, n: JSON.parse(v).length }); ls[k] = v; }, getItem: (k) => ls[k] ?? null },
    appSettings: () => ({ privacySessionOnly: false }), assetClass: () => "CRYPTO", toast: () => {},
    localDbPutMany: async () => true, renderLiquidationTape: () => { desene.banda++; }, renderObservedLiquidationHeatmap: () => { desene.harta++; },
    liqSocket: null, liqSeq: 0, liqEvents: [], lastLiqDbArchiveTs: 0, LIQ_HISTORY_KEY: "observedLiquidationsV47", liqLsScrisLa: 0, liqLsMurdar: false,
  });
  const mesaj = (i = 0) => box.liqSocket.onmessage({ data: JSON.stringify({ e: "forceOrder", E: ceas.t, o: { s: "BTCUSDT", S: i % 2 ? "BUY" : "SELL", ap: String(60000 + i), q: "0.01", z: "0.01", T: ceas.t } }) });
  return { box, els, socketuri, scrieri, desene, ceas, document, arata, mesaj, ls };
}

await test("1a ensureLiquidationTape pe Acasă (după o analiză crypto): NU deschide fluxul de lichidări", () => {
  const c = cutieLiq({ peste: "dash" });
  c.box.ensureLiquidationTape();
  assert.equal(c.socketuri.length, 0, "s-a deschis !forceOrder@arr cât ești pe Acasă");
});
await test("1b pe Decision Core / Context Intelligence fluxul pornește; plecarea (liqUrmeazaPagina) îl închide și scrie DOARME", () => {
  for (const p of ["decisioncore", "intel"]) {
    const c = cutieLiq({ peste: p });
    c.box.ensureLiquidationTape();
    assert.equal(c.socketuri.length, 1, p + ": fluxul nu pornește"); assert.match(c.socketuri[0].url, /!forceOrder@arr/);
    c.arata("dash"); c.box.liqUrmeazaPagina();
    assert.equal(c.socketuri[0].inchis, true, p + ": fluxul rămâne deschis după plecare");
    assert.equal(c.box.liqSocket, null);
    assert.equal(c.els.liqWsStatus.textContent, "DOARME");
    c.arata(p); c.box.liqUrmeazaPagina();
    assert.equal(c.socketuri.length, 2, p + ": la întoarcere fluxul nu repornește");
  }
});
await test("1c fila ascunsă (visibilitychange) oprește fluxul; vizibilă din nou pe pagina lui îl repornește", () => {
  const c = cutieLiq({ peste: "decisioncore" });
  c.box.ensureLiquidationTape(); assert.equal(c.socketuri.length, 1);
  c.document.hidden = true; c.box.liqUrmeazaPagina();
  assert.equal(c.socketuri[0].inchis, true, "fila ascunsă, fluxul curge");
  c.document.hidden = false; c.box.liqUrmeazaPagina();
  assert.equal(c.socketuri.length, 2, "fila vizibilă din nou, fluxul nu repornește");
  assert.match(APP, /document\.addEventListener\("visibilitychange",\s*(?:function\s*\(\)\s*\{|\(\)\s*=>\s*\{?)\s*try\s*\{\s*liqUrmeazaPagina\(\)/, "lipsește ascultătorul visibilitychange → liqUrmeazaPagina");
});
await test("1d navTo cheamă liqUrmeazaPagina imediat după show(id) (plecarea de pe pagină oprește fluxul)", () => {
  const f = fnApp("navTo");
  assert.match(f, /show\(id\);[^\n]*\n[^\n]*liqUrmeazaPagina\(\)/, "navTo nu cheamă liqUrmeazaPagina după show(id)");
});
await test("1e un mesaj venit după ce ai plecat altfel (show direct, fără navTo) închide fluxul fără să deseneze", () => {
  const c = cutieLiq({ peste: "intel" });
  c.box.ensureLiquidationTape(); c.mesaj(0); assert.equal(c.desene.banda, 1);
  c.arata("dash"); c.mesaj(1);
  assert.equal(c.socketuri[0].inchis, true, "fluxul curge mai departe pe Acasă");
  assert.equal(c.desene.banda, 1, "a desenat banda pe o pagină care nu se vede");
});
await test("1f 50 de mesaje în 10 s ⇒ localStorage scris O dată; după 30 s încă o dată; oprirea scrie restul", () => {
  const c = cutieLiq({ peste: "decisioncore" });
  c.box.ensureLiquidationTape();
  for (let i = 0; i < 50; i++) { c.ceas.t += 200; c.mesaj(i); }
  const lichid = () => c.scrieri.filter((x) => x.k === "observedLiquidationsV47");
  assert.equal(lichid().length, 1, "scrieri în 10 s: " + lichid().length);
  c.ceas.t += 30000; c.mesaj(51);
  assert.equal(lichid().length, 2, "după 30 s: " + lichid().length);
  c.ceas.t += 1000; c.mesaj(52); c.mesaj(53);
  assert.equal(lichid().length, 2);
  c.arata("dash"); c.box.liqUrmeazaPagina();
  assert.equal(lichid().length, 3, "oprirea nu scrie evenimentele rămase");
  assert.equal(lichid().at(-1).n, 53, "la oprire se scriu toate evenimentele: " + lichid().at(-1).n);
  /* forțat (hydrateLiquidationArchive) scrie pe loc */
  c.box.persistObservedLiquidations(true); assert.equal(lichid().length, 4);
  assert.match(fnApp("hydrateLiquidationArchive"), /persistObservedLiquidations\(true\)/, "încărcarea arhivei trebuie să scrie pe loc");
});

// ───────────── 1b. paznicul v67 ─────────────
function cutiePaznic({ peste = "dash", ascuns = false, pliuDeschis = false } = {}) {
  const { els, $ } = pagina(), ceas = { t: Date.UTC(2026, 9, 29, 10, 0) }, rulari = [], retentii = [];
  for (const p of ["dash", "health", "decision", "intel"]) $(p).className = p === peste ? "panel on" : "panel";
  $("acPl-operatiuni").open = pliuDeschis;
  const document = { hidden: ascuns, addEventListener: () => {} };
  const box = ruleaza(["v67PaginaVizibila", "v67PaznicTic", "v67RetentieAuto"], {
    $, document, v67Now: () => ceas.t, Math, Number,
    refreshV67Operations: (p) => { rulari.push({ t: ceas.t, p }); box.v67UltimaRulare = ceas.t; return {}; },
    localDbSupported: () => true, appSettings: () => ({ privacySessionOnly: false }),
    localDbStergeVechi: async (tip, prag, max) => { retentii.push({ tip, prag, max, t: ceas.t }); return 0; },
    v67UltimaRulare: 0, v67RetentieLa: 0,
  });
  return { box, els, ceas, rulari, retentii, document };
}
await test("1g paznicul pe Acasă (pliul „Operațiunile” închis): o rulare, apoi nimic 4 min 30 s, apoi iar la 5 min", () => {
  const c = cutiePaznic({ peste: "dash" });
  for (let i = 0; i < 10; i++) { c.box.v67PaznicTic(); c.ceas.t += 30000; }   // 0 … 4 min 30 s
  assert.equal(c.rulari.length, 1, "rulări în 5 min pe Acasă: " + c.rulari.length);
  c.box.v67PaznicTic();   // 5 min
  assert.equal(c.rulari.length, 2);
  assert.ok(c.rulari.every((r) => r.p === true), "bătaia trebuie scrisă (persist)");
});
await test("1h paznicul pe Starea aplicației / Decision Center / pliul deschis: la fiecare tic de 30 s; fila ascunsă: o dată la 5 min", () => {
  for (const [peste, pliu] of [["health", false], ["decision", false], ["dash", true]]) {
    const c = cutiePaznic({ peste, pliuDeschis: pliu });
    for (let i = 0; i < 4; i++) { c.box.v67PaznicTic(); c.ceas.t += 30000; }
    assert.equal(c.rulari.length, 4, peste + ": " + c.rulari.length);
  }
  const h = cutiePaznic({ peste: "health", ascuns: true });
  for (let i = 0; i < 10; i++) { h.box.v67PaznicTic(); h.ceas.t += 30000; }
  assert.equal(h.rulari.length, 1, "fila ascunsă: " + h.rulari.length);
  assert.match(fnApp("initV67Operations"), /setInterval\(\(\)=>v67PaznicTic\(\)/, "ceasul paznicului trebuie să treacă prin v67PaznicTic");
  assert.match(fnApp("refreshV67Operations"), /if\(persist\)v67UltimaRulare=v67Now\(\)/, "o rulare manuală / la revenire trebuie să conteze ca ultima rulare");
});
await test("1i retenția bătăilor v67 e automată: ops_heartbeat_v67, 7 zile, plafon 3.000, cel mult o dată la 6 ore", () => {
  const c = cutiePaznic({ peste: "dash" });
  c.box.v67PaznicTic();
  assert.equal(c.retentii.length, 1, "retenția nu pornește singură");
  assert.deepEqual({ tip: c.retentii[0].tip, zile: (c.ceas.t - c.retentii[0].prag) / 86400000, max: c.retentii[0].max }, { tip: "ops_heartbeat_v67", zile: 7, max: 3000 });
  for (let i = 0; i < 700; i++) { c.ceas.t += 30000; c.box.v67PaznicTic(); }   // ~5 h 50 min
  assert.equal(c.retentii.length, 1, "retenția rulează prea des: " + c.retentii.length);
  c.ceas.t += 15 * 60000; c.box.v67PaznicTic();
  assert.equal(c.retentii.length, 2, "după 6 ore retenția nu mai rulează");
});
await test("1j localDbStergeVechi: șterge cu cursorul (cele mai vechi întâi) ce e peste 7 zile ȘI ce trece de plafon; restul rămâne", async () => {
  const T = Date.UTC(2026, 9, 29), ZI = 86400000;
  const rec = [];
  for (let i = 0; i < 20; i++) rec.push({ key: "ops_heartbeat_v67|" + i, type: "ops_heartbeat_v67", ts: T - (19 - i) * ZI / 2 });   // 9,5 zile … 0
  rec.push({ key: "signals|x", type: "signals", ts: T - 30 * ZI });
  const inRange = (r, g) => r.type === g.lo[0] && r.ts >= g.lo[1] && r.ts <= g.hi[1];
  const db = { transaction() {
    const tx = { oncomplete: null, onerror: null }; let pending = 0; const gata = () => { if (pending === 0) setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); };
    tx.objectStore = () => ({ index: () => ({
      count: (g) => { const req = {}; pending++; setTimeout(() => { req.result = rec.filter((r) => inRange(r, g)).length; pending--; req.onsuccess && req.onsuccess(); gata(); }, 0); return req; },
      openCursor: (g) => { const req = {}; const l = rec.filter((r) => inRange(r, g)).sort((a, b) => a.ts - b.ts); let i = 0; pending++;
        const pas = () => { let cont = false; if (i >= l.length) req.result = null; else { const r = l[i]; req.result = { value: r, key: [r.type, r.ts], delete: () => { rec.splice(rec.indexOf(r), 1); }, continue: () => { cont = true; i++; setTimeout(pas, 0); } }; }
          req.onsuccess && req.onsuccess(); if (!cont) { pending--; gata(); } };
        setTimeout(pas, 0); return req; },
    }) });
    return tx;
  } };
  const box = ruleaza(["localDbStergeVechi"], { localDbSupported: () => true, localDbOpen: async () => db, IDBKeyRange: { bound: (lo, hi) => ({ lo, hi }) }, Number, Math });
  const sterse = await box.localDbStergeVechi("ops_heartbeat_v67", T - 7 * ZI, 10);
  const ramase = rec.filter((r) => r.type === "ops_heartbeat_v67");
  assert.equal(ramase.length, 10, "rămase: " + ramase.length); assert.equal(sterse, 10);
  assert.ok(ramase.every((r) => r.ts >= T - 7 * ZI), "a rămas ceva mai vechi de 7 zile");
  assert.equal(Math.min(...ramase.map((r) => r.ts)), T - 9 * ZI / 2, "nu a șters cele mai vechi întâi");
  assert.equal(rec.filter((r) => r.type === "signals").length, 1, "a șters alt tip de înregistrări");
  /* sub plafon și nimic vechi: nimic de șters */
  assert.equal(await box.localDbStergeVechi("ops_heartbeat_v67", T - 7 * ZI, 3000), 0);
});

// ───────────── 2. NEVERIFICAT ─────────────
function cutieOps({ radar = null, provider = null, tick = 0, crypto = true, acum = Date.UTC(2026, 9, 29, 10, 0) } = {}) {
  const { els, $ } = pagina(), mag = {};
  const box = ruleaza(["v67OpsSettings", "v67OpsScore", "v67Incidents", "v67ManualState", "v67SignalFingerprintFrom", "v67ReconcileArrays", "v67HeartbeatAge", "v67OperationsSnapshot", "v67OpsToolHtml", "v67IncidentMarkup", "renderV67Operations", "escapeHtml", "healthSentStare"], {
    $, TextRo: globalThis.TextRo, Math, Number, String, JSON, Date, Set, navigator: { onLine: true },
    window: { __radarState: radar, __providerHealthV62: provider, __decisionIntelV65: null },
    v67Now: () => acum, v60StoreGet: (k, d) => mag[k] ?? d, v60StoreSet: (k, v) => { mag[k] = v; },
    paperTrades: () => [], shadowTradesV60: () => [], paperMigrateTrade: () => {}, paperOrderActive: () => false,
    assetClass: () => (crypto ? "CRYPTO" : "STOCKS"), lastWsTick: tick, localDbSupported: () => true, appSettings: () => ({ privacySessionOnly: false }),
    localDbPutRecord: async () => true, v67RecoverySnapshot: () => ({}), v67LastReconcile: null,
    V67_OPS_KEY: "opsControlV67", V67_INCIDENT_KEY: "opsIncidentsV67", V67_LEDGER_KEY: "opsSignalLedgerV67", V67_RECOVERY_KEY: "opsRecoveryV67",
  });
  return { box, els, $ };
}
await test("2a fără analiză și fără verificarea furnizorilor: WS și PROVIDER sunt NEMĂSURATE (ok null), nu OK", () => {
  const c = cutieOps(); const s = c.box.v67OperationsSnapshot(false);
  const ws = s.checks.find((x) => x.code === "WS"), pr = s.checks.find((x) => x.code === "PROVIDER");
  assert.equal(ws.ok, null, "WS: " + JSON.stringify(ws)); assert.equal(ws.nemasurat, true);
  assert.equal(pr.ok, null, "PROVIDER: " + JSON.stringify(pr)); assert.equal(pr.nemasurat, true);
  const c2 = cutieOps({ provider: { state: "NEÎNCERCAT", score: null } }); const p2 = c2.box.v67OperationsSnapshot(false).checks.find((x) => x.code === "PROVIDER");
  assert.equal(p2.ok, null, "PROVIDER NEÎNCERCAT: " + JSON.stringify(p2));
});
await test("2b NEMĂSURAT: fără penalizare, fără blocare, dar nu e numărat ca OK (scorul spune câte sunt nemăsurate)", () => {
  const c = cutieOps(); const s = c.box.v67OperationsSnapshot(false);
  assert.equal(s.score, 100); assert.equal(s.hardBlock, false); assert.equal(s.state, "NORMAL");
  assert.deepEqual([...s.nemasurate].sort(), ["PROVIDER", "WS"]);
  assert.equal(s.okN, s.checks.length - 2, "OK numărate: " + s.okN);
  c.box.renderV67Operations(false);
  assert.equal(c.els.v67HealthScore.textContent, "100/100 · 2 nemăsurate");
  assert.match(c.els.v67DashSummary.textContent, /încă nemăsurat: (WS, PROVIDER|PROVIDER, WS)/);
  assert.doesNotMatch(c.els.v67DashSummary.textContent, /runtime checks clear/, "„runtime checks clear” deși WS și PROVIDER nu s-au măsurat");
});
await test("2c cardul unei verificări nemăsurate: NEVERIFICAT, „încă nemăsurat”, gri - nu „Operational check passed.”", () => {
  const c = cutieOps(); const html = c.box.v67OpsToolHtml({ code: "WS", ok: null, nemasurat: true, severity: "WARN", label: "Live websocket stale", penalty: 15 });
  assert.match(html, /decisionTool mutedInfo/); assert.match(html, />NEVERIFICAT</); assert.match(html, /încă nemăsurat/);
  assert.doesNotMatch(html, /Operational check passed/);
  assert.doesNotMatch(html, /blocked/);
  /* OK măsurat rămâne ca înainte */
  assert.match(c.box.v67OpsToolHtml({ code: "ONLINE", ok: true, severity: "HARD" }), /decisionTool good.*>OK<.*Operational check passed\./s);
});
await test("2d măsurate: WS proaspăt = OK, WS vechi = WARN cu penalizare (neschimbat); PROVIDER 80/100 = OK, 40/100 = HARD (neschimbat)", () => {
  const acum = Date.UTC(2026, 9, 29, 10, 0), radar = { symbol: "BTCUSDT" };
  const viu = cutieOps({ radar, tick: acum - 5000, provider: { state: "OK", score: 80, ts: acum - 1000 } }).box.v67OperationsSnapshot(false);
  assert.equal(viu.checks.find((x) => x.code === "WS").ok, true); assert.equal(viu.checks.find((x) => x.code === "PROVIDER").ok, true);
  assert.deepEqual([...viu.nemasurate], []); assert.equal(viu.score, 100);
  const vechi = cutieOps({ radar, tick: acum - 120000, provider: { state: "FAIL", score: 40, ts: acum - 1000 } }).box.v67OperationsSnapshot(false);
  assert.equal(vechi.checks.find((x) => x.code === "WS").ok, false);
  assert.equal(vechi.score, 100 - 15 - 25); assert.equal(vechi.hardBlock, true); assert.equal(vechi.state, "SAFE MODE");
});
await test("2e v67OpsScore: o listă de verificări măsurate dă exact scorul/starea de dinainte (nimic nou blocat)", () => {
  const c = cutieOps();
  const r = c.box.v67OpsScore([{ code: "A", ok: true, severity: "HARD" }, { code: "B", ok: false, severity: "WARN", label: "b", penalty: 15 }, { code: "C", ok: null, nemasurat: true, severity: "HARD", penalty: 50 }]);
  assert.equal(r.score, 85); assert.equal(r.state, "DEGRADED"); assert.equal(r.hardBlock, false); assert.deepEqual([...r.reasons], ["b"]); assert.deepEqual([...r.nemasurate], ["C"]); assert.equal(r.okN, 1);
  /* fără nicio verificare nemăsurată: exact rezultatul de dinainte (aceleași câmpuri vechi) */
  const v = c.box.v67OpsScore([{ code: "M", ok: false, severity: "HARD", label: "m", penalty: 55 }, { code: "O", ok: true, severity: "HARD" }, { code: "W", ok: false, severity: "WARN", label: "w", penalty: 15 }]);
  assert.deepEqual({ score: v.score, state: v.state, hardBlock: v.hardBlock, reasons: [...v.reasons] }, { score: 30, state: "SAFE MODE", hardBlock: true, reasons: ["m", "w"] });
  /* o verificare fără câmpul ok (formă veche) rămâne picată, ca înainte - nu devine „nemăsurată” */
  assert.equal(c.box.v67OpsScore([{ code: "X", severity: "WARN", penalty: 15 }]).score, 85);
});
await test("2f Starea aplicației · Sentiment: „—” ⇒ NEVERIFICAT · încă nemăsurat (gri); cifră ⇒ OK; N/A ⇒ OPTIONAL", () => {
  const c = cutieOps();
  assert.deepEqual({ ...c.box.healthSentStare("—") }, { t: "NEVERIFICAT · încă nemăsurat", cls: "mutedInfo" });
  assert.deepEqual({ ...c.box.healthSentStare("") }, { t: "NEVERIFICAT · încă nemăsurat", cls: "mutedInfo" });
  assert.deepEqual({ ...c.box.healthSentStare("62 · Greed") }, { t: "OK", cls: "" });
  assert.deepEqual({ ...c.box.healthSentStare("N/A") }, { t: "OPTIONAL", cls: "" });
  const f = fnApp("runHealthCheck");
  assert.match(f, /healthSentStare\(\$\("fearGreed"\)\?\.textContent\)/, "runHealthCheck nu folosește healthSentStare");
  assert.doesNotMatch(f, /textContent!=="N\/A"\?"OK"/, "regula veche (orice în afară de N/A = OK) a rămas");
});

// ───────────── 3. porțile ML ─────────────
const fnML = ["aucMetric", "aucRang", "aucSeHanleyMcNeil", "mlZiDin", "aucSeZile", "mlZUnilateral", "mlPoartaOOS", "metricR", "mcMulberry", "deterministicRng", "modelEval", "evalPredictions", "mlIncercariCitite", "mlIncercareNoua", "mlStareSubPoartaNoua", "mlPoartaText"];
function cutieML(ls = {}) {
  return ruleaza(fnML, { Math, Number, Array, Map, Set, JSON, String, TextRo: globalThis.TextRo, appSettings: () => ({ privacySessionOnly: false }),
    localStorage: { getItem: (k) => ls[k] ?? null, setItem: (k, v) => { ls[k] = v; } }, mlIncercariSesiune: {} });
}
let ML = null; try { ML = cutieML(); } catch (e) { console.log("  (porțile ML nu se încarcă: " + String(e.message).split("\n")[0] + ")"); }
const ZI = 86400000, T0 = Date.UTC(2026, 0, 1);
/* predicții cu AUC ≈ Φ(d/√2): scorul s = y·d + zgomot, p = 0,45 + 0,08·(s − 0,45·d) (calibrat în jurul ratei de bază 0,45, ca skill-ul să poată fi > 0) */
function predictii(n, d, seed, pePeZi = 1) { const r = ML.mcMulberry(seed), nrm = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  return Array.from({ length: n }, (_, i) => { const y = r() < 0.45 ? 1 : 0, s = y * d + nrm(); return { p: Math.max(0.01, Math.min(0.99, 0.45 + 0.08 * (s - 0.45 * d))), y, utility: y ? 1.2 : -0.8, ts: T0 + Math.floor(i / pePeZi) * ZI + (i % pePeZi) * 60000 }; }); }

await test("3a aucRang = aucMetric (și cu egalități); Hanley–McNeil la AUC 0,5 cu 50/50 = 0,0580; z(0,025) = 1,960, z(0,025/20) = 3,023", () => {
  for (const s of [1, 2, 3]) { const p = predictii(137, 0.7, s).map((x, i) => (i % 5 ? x : { ...x, p: 0.5 })); assert.ok(Math.abs(ML.aucRang(p) - ML.aucMetric(p)) < 1e-12, `seed ${s}: ${ML.aucRang(p)} vs ${ML.aucMetric(p)}`); }
  assert.ok(Math.abs(ML.aucSeHanleyMcNeil(0.5, 50, 50) - 0.05802) < 2e-5, String(ML.aucSeHanleyMcNeil(0.5, 50, 50)));
  assert.ok(Math.abs(ML.mlZUnilateral(0.025) - 1.95996) < 1e-4); assert.ok(Math.abs(ML.mlZUnilateral(0.025 / 20) - 3.0233) < 1e-3, String(ML.mlZUnilateral(0.025 / 20)));
});
/* un „model” care dă exact p-urile date (modelEval chemă model.predict(r.vals)) */
const evalPe = (pred, k = 1) => ML.modelEval({ predict: (v) => v[0], baseRate: 0.45 }, pred.map((x) => ({ vals: [x.p], label: x.y, utility: x.utility, row: { ts: x.ts } })), k);
await test("3b n_test 60 cu AUC ≈ 0,70: poarta veche (n ≥ 20, AUC ≥ 0,55) trecea; acum WEAK - sub 100 de rezultate de test", () => {
  const p = predictii(60, 1.1, 7); const m = evalPe(p);
  assert.ok(m.auc >= 0.62, "AUC " + m.auc);
  assert.equal(m.state, "WEAK", JSON.stringify(m));
});
await test("3c n_test 120 cu AUC ≈ 0,58 (limita de jos sub 0,5) ⇒ WEAK; un model bun (n 200, AUC ≈ 0,75) ⇒ USABLE cu aucJos > 0,5", () => {
  /* un caz pe care poarta veche îl trecea: AUC 0,56–0,60, skill > 0, ≥ 8 intrări, expectanță > 0 */
  let gasit = null; for (let s = 1; s < 400 && !gasit; s++) { const p = predictii(120, 0.35, s), m = evalPe(p); if (m.auc >= 0.56 && m.auc <= 0.6 && m.skill > 0 && m.tradeN >= 8 && m.expectancy > 0) gasit = m; }
  assert.ok(gasit, "nu s-a găsit un caz cu AUC 0,56–0,60");
  assert.equal(gasit.state, "WEAK", JSON.stringify(gasit)); assert.ok(gasit.aucJos < 0.5, "aucJos " + gasit.aucJos);
  const bun = evalPe(predictii(200, 2.2, 11));
  assert.equal(bun.state, "USABLE", JSON.stringify(bun)); assert.ok(bun.aucJos > 0.5 && bun.aucJos < bun.auc); assert.equal(bun.poartaV, 269); assert.equal(bun.incercari, 1);
});
await test("3d încercările: același model trece la prima încercare și pică la a 20-a (prag Bonferroni); ansamblul (evalPredictions) la fel", () => {
  let p = null, m1 = null; for (let s = 1; s < 300; s++) { const q = predictii(160, 0.45, s), m = evalPe(q, 1); if (m.state === "USABLE" && m.aucJos < 0.56) { p = q; m1 = m; break; } }
  assert.ok(p, "nu s-a găsit un caz la limită");
  const m20 = evalPe(p, 20);
  assert.equal(m20.state, "WEAK", `k=20: aucJos ${m20.aucJos}`); assert.equal(m20.incercari, 20); assert.ok(m20.aucJos < m1.aucJos);
  assert.equal(ML.evalPredictions(p, 0.45, 1).state, "USABLE"); assert.equal(ML.evalPredictions(p, 0.45, 20).state, "WEAK");
});
await test("3e unitatea = ZIUA: 120 de rânduri în 6 zile ⇒ WEAK (6 dovezi, nu 120); pe 30 de zile cu rânduri legate în zi, HM ar trece dar bootstrapul pe zile nu; desfăcute pe zile ⇒ trec", () => {
  const r = ML.mcMulberry(5), nrm = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const rows = [];
  for (let z = 0; z < 6; z++) { const bun = z % 2 === 0; for (let i = 0; i < 20; i++) { const y = r() < (bun ? 0.8 : 0.15) ? 1 : 0; rows.push({ p: (bun ? 0.62 : 0.38) + 0.04 * r(), y, utility: y ? 1.2 : -0.8, ts: T0 + z * ZI + i * 60000 }); } }
  const pe6 = ML.mlPoartaOOS(rows, 1);
  assert.ok(pe6.auc > 0.7 && pe6.aucJos > 0.5, "cazul nu e unul care trece pe IC: " + JSON.stringify(pe6)); assert.equal(pe6.zile, 6);
  assert.equal(pe6.trece, false, "6 zile: " + JSON.stringify(pe6));
  /* modelEval dă porții ziua fiecărui rând (r.row.ts) - fără ea, cele 120 de rânduri ar conta drept 120 de dovezi */
  const m6 = evalPe(rows); assert.equal(m6.zile, 6, "modelEval nu vede zilele: " + m6.zile); assert.equal(m6.state, "WEAK");
  /* 30 de zile × 5 rânduri: ziua mișcă împreună p și y (legătură doar la nivel de zi, 30 de dovezi) */
  let caz = null;
  for (let s = 1; s < 400 && !caz; s++) { const q = ML.mcMulberry(1000 + s), nq = () => { let u = 0; while (u === 0) u = q(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * q()); }; const a = [];
    for (let z = 0; z < 30; z++) { const e = nq(); for (let i = 0; i < 5; i++) { const y = q() < 1 / (1 + Math.exp(-(-0.2 + 0.9 * e))) ? 1 : 0; a.push({ p: 0.45 + 0.1 * e + 0.01 * nq(), y, ts: T0 + z * ZI + i * 60000 }); } }
    const g = ML.mlPoartaOOS(a, 1); if (g.auc - g.z * g.seHM > 0.5 && !g.trece) caz = { a, g }; }
  assert.ok(caz, "nu s-a găsit un caz în care doar bootstrapul pe zile oprește");
  assert.ok(caz.g.seZile > caz.g.seHM, `seZile ${caz.g.seZile} vs seHM ${caz.g.seHM}`); assert.equal(caz.g.zile, 30);
  const desfacute = ML.mlPoartaOOS(caz.a.map((x, i) => ({ ...x, ts: T0 + i * ZI })), 1);
  assert.equal(desfacute.trece, true, "aceleași rânduri, fiecare în ziua lui: " + JSON.stringify(desfacute));
});
await test("3f contorul de încercări: aceeași dată + aceleași setări nu e o încercare nouă; altele da; se ține în localStorage", () => {
  const ls = {}; const B = cutieML(ls);
  assert.equal(B.mlIncercareNoua("ensemble", "fp1|cfg"), 1); assert.equal(B.mlIncercareNoua("ensemble", "fp1|cfg"), 1);
  assert.equal(B.mlIncercareNoua("ensemble", "fp2|cfg"), 2); assert.equal(B.mlIncercareNoua("ensemble", "fp2|cfg2"), 3);
  assert.equal(B.mlIncercareNoua("meta", "fp1"), 1);
  assert.equal(cutieML(ls).mlIncercareNoua("ensemble", "fp1|cfg"), 3, "după reîncărcare contorul se pierde");
});
await test("3g o stare USABLE salvată de poarta veche (fără poartaV) nu mai trece: USABLE ENSEMBLE ⇒ RESEARCH ONLY, USABLE / USABLE SHADOW ⇒ WEAK OOS", () => {
  assert.equal(ML.mlStareSubPoartaNoua("USABLE ENSEMBLE", { auc: 0.6, n: 40 }), "RESEARCH ONLY");
  assert.equal(ML.mlStareSubPoartaNoua("USABLE", {}), "WEAK OOS"); assert.equal(ML.mlStareSubPoartaNoua("USABLE SHADOW", null), "WEAK OOS");
  assert.equal(ML.mlStareSubPoartaNoua("USABLE ENSEMBLE", { poartaV: 269 }), "USABLE ENSEMBLE");
  assert.equal(ML.mlStareSubPoartaNoua("WEAK OOS", {}), "WEAK OOS"); assert.equal(ML.mlStareSubPoartaNoua("RESTORED", {}), "RESTORED");
  assert.match(fnApp("restoreMetaEnsembleV2"), /mlStareSubPoartaNoua\(x\.state,x\.metrics\)/);
  assert.equal((fnApp("activateModelVersion") + fnApp("restoreActiveModelVersion")).match(/mlStareSubPoartaNoua\(x\.state\|\|"RESTORED",x\.metrics\)/g)?.length, 4, "versiunile restaurate (META și SHADOW, în ambele funcții) trec prin poarta nouă");
});
await test("3h cele patru antrenări numără încercările și le dau porții; contorul se spune lângă poartă", () => {
  assert.match(fnApp("trainMetaEnsembleV2"), /mlIncercareNoua\("ensemble"/); assert.match(fnApp("trainMetaEnsembleV2"), /evalPredictions\(pred,baseRate,k\)/); assert.match(fnApp("trainMetaEnsembleV2"), /ts:r\.row\?\.ts/);
  assert.match(fnApp("trainMetaLabelModel"), /mlIncercareNoua\("meta"/); assert.match(fnApp("trainMetaLabelModel"), /modelEval\(model,test,k\)/);
  assert.match(fnApp("runResearchML"), /mlIncercareNoua\("shadow"/); assert.match(fnApp("runResearchML"), /modelEval\(model,test,k\)/);
  assert.match(fnApp("trainGovernedEnsemble"), /mlIncercareNoua\("governed"/);
  assert.match(fnApp("renderMetaEnsembleV2"), /mlPoartaText\(x\?\.metrics\)/); assert.match(fnApp("runResearchML"), /mlPoartaText\(metrics\)/);
  const t = ML.mlPoartaText({ poartaV: 269, n: 140, zile: 31, auc: 0.6123, aucJos: 0.5214, incercari: 3 });
  assert.equal(t, "Poarta OOS: 140 de rezultate de test în 31 de zile (minim 100 și 20 de zile) · AUC 61,2%, limita de jos 52,1% (trebuie peste 50%) · 3 încercări pe date sau setări diferite, pragul e corectat pentru ele.");
  assert.equal(ML.mlPoartaText({ auc: 0.6 }), "", "fără poartaV nu se scrie nimic");
});
/* simularea scurtă sub H0 (predicții fără legătură cu rezultatul; simularea întreagă cu antrenarea reală: scripts/sim-v100269-poarta-ml.mjs) */
/* SARI_H0=1: doar la rularea mutațiilor (simularea durează ~1 min; porțile sunt prinse și de 3b–3e) */
if (!process.env.SARI_H0) await test("3i sub H0, poarta de AUC: veche (n ≥ 20 și AUC ≥ 0,55) ≥ 10%; nouă ≤ 4% pe rânduri independente și ≤ 6% pe 5 rânduri/zi", () => {
  const r = ML.mcMulberry(26910029), nrm = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const sim = (pePeZi, R) => { let v = 0, nn = 0; for (let k = 0; k < R; k++) { const p = []; let ef = 0, efy = 0; for (let i = 0; i < 150; i++) { if (i % pePeZi === 0) { ef = nrm(); efy = nrm(); } const y = r() < 1 / (1 + Math.exp(-(-0.3 + (pePeZi > 1 ? efy : 0)))) ? 1 : 0; p.push({ p: 1 / (1 + Math.exp(-((pePeZi > 1 ? 0.8 * ef : 0) + 0.6 * nrm()))), y, ts: T0 + Math.floor(i / pePeZi) * ZI }); }
    const a = ML.aucMetric(p); v += p.length >= 20 && a >= 0.55; nn += ML.mlPoartaOOS(p, 1).trece; } return { vechi: v / R, nou: nn / R }; };
  const ind = sim(1, 600), zi = sim(5, 400);
  const pc = (x) => (x * 100).toFixed(1).replace(".", ",") + "%";
  console.log(`       H0, n_test 150: independente vechi ${pc(ind.vechi)} → nou ${pc(ind.nou)} · 5 pe zi vechi ${pc(zi.vechi)} → nou ${pc(zi.nou)}`);
  assert.ok(ind.vechi >= 0.10 && zi.vechi >= 0.10, JSON.stringify({ ind, zi }));
  assert.ok(ind.nou <= 0.04, "independente nou " + ind.nou); assert.ok(zi.nou <= 0.06, "5 pe zi nou " + zi.nou);
});

console.log(`\n${picate ? picate + " PICA din " + teste : "toate " + teste + " ok"}\n`);
process.exit(picate ? 1 : 0);
