// Proba v100.140 (08.10, el: „fa ideile” după v100.139): (1) Monte Carlo pe bot într-un Web Worker (pagina nu îngheață), cu cădere pe fir;
// (3) rândul din citire mai scurt - nota „șanse… · socotit” separată, mai mică; (4) „CÂȘTIGĂ 97% · PIERDE 4%” nu mai face 101%.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, GS = G.GridSim, M = G.MonteSimbol, APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css"), SW = citeste("public", "sw.js");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.140 · Monte Carlo în Worker, rândul scurt, rotunjirea · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.now() - (zile * 96 - i) * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare15(20, 3), P0 = B[B.length - 1].c, ST = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: P0 * 0.85 }, tp: null, tip: "geometric" };
const REZ = (o) => ({ n: 60, zile: 14, suma: 50, acum: null, orizonturi: [Object.assign({ zile: 7, bare: 672, pCastig: 0.6, pPierde: 0.4, pZero: 0, marja: 4, p5: -2, p50: 1, p95: 3, hist: null, pLich: 0, pStop: 0, pTp: 0, pIesire: 1, perechi: 10, maxJos: { p50: -1, p5: -2 }, funding: 0, plan: null }, o)] });

await test("(4) rotunjirea: CÂȘTIGĂ 97% · PIERDE 3% (nu 4%: suma e 100); cu „pe zero” suma rămâne 100; sub 0,5% zero nu apare", () => {
  assert.match(GS.verdict(REZ({ pCastig: 0.965, pPierde: 0.035 }), ST, null, 0, null).rand, /^CÂȘTIGĂ în 97% din drumuri · PIERDE în 3%$/, "96,5 / 3,5 rotunjite separat făceau 97 + 4 = 101");
  assert.match(GS.verdict(REZ({ pCastig: 0.965, pPierde: 0.023, pZero: 0.012 }), ST, null, 0, null).rand, /^CÂȘTIGĂ în 97% din drumuri · PIERDE în 2% · pe zero 1%$/);
  assert.match(GS.verdict(REZ({ pCastig: 0.004, pPierde: 0.996 }), ST, null, 0, null).rand, /^CÂȘTIGĂ în 0% din drumuri · PIERDE în 100%$/);
  assert.match(GS.verdict(REZ({ pCastig: 0.5, pPierde: 0.496, pZero: 0.004 }), ST, null, 0, null).rand, /^CÂȘTIGĂ în 50% din drumuri · PIERDE în 50%$/);
  assert.match(GS.verdict(REZ({ pCastig: 0.995, pPierde: 0, pZero: 0.005 }), ST, null, 0, null).rand, /^CÂȘTIGĂ în 100% din drumuri · PIERDE în 0%$/, "revizia: 99,5 + 0,5 nu face 101");
  // revizia (2) colector: rata de funding e în motorul pur, ecranul doar o cheamă
  const T0 = Date.UTC(2026, 9, 7, 12), r8 = Array.from({ length: 40 }, (_, i) => ({ fundingTime: T0 - i * 8 * 3600000, fundingRate: 0.0001 })), f = GS.rataFunding(r8, T0);
  assert.equal(f.intervalOre, 8); assert.ok(Math.abs(f.rataZi - 0.0003) < 1e-12); assert.equal(GS.rataFunding([], T0), null);
  assert.match(functie(citeste("public", "lib", "grid-sim-ecran.js"), "gsRataFunding"), /return GridSim\.rataFunding\(rates, acum\)/);
});
await test("(3) tbMcRand: verdictul în text, „șanse… · socotit hh:mm · următorul hh:mm” în nota (mai mică, pe rândul ei); rândul le desenează pe amândouă", () => {
  const r = functie(APP, "tbMcRand"); assert.match(r, /nota:/); assert.match(r, /șanse pe drumuri ca ultimele 14 zile, nu o predicție/);
  const c = functie(APP, "tbDeseneazaCitire"); assert.match(c, /<span class="tbSub tbMcNota">'\+escapeHtml\(mc\.nota\)\+'<\/span>/);
  assert.match(CSS, /#tabloubot \.tbMcNota\{/);
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, GridSim: GS, TextRo: G.TextRo };
  ctx.tbStare = { routeOk: true, bot: { id: "1" } }; ctx.tbPlan = { botId: null, plan: null }; ctx.tbPanouVizibil = () => true; ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
  const src = APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + functie(APP, "tbMcRand");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.tbMc.botId = "1"; ctx.tbMc.la = Date.now(); ctx.tbMc.randLa = ctx.tbMc.la; ctx.tbMc.urmatorul = ctx.tbMc.la + 15 * 60000; ctx.tbMc.rand = { stare: "rau", text: "de aici încolo, 7 zile: CÂȘTIGĂ în 22% din drumuri · PIERDE în 78%" };
  const x = ctx.tbMcRand(ctx.tbStare.bot);
  assert.equal(x.text, "de aici încolo, 7 zile: CÂȘTIGĂ în 22% din drumuri · PIERDE în 78%"); assert.match(x.nota, /^șanse pe drumuri ca ultimele 14 zile, nu o predicție · socotit \d\d:\d\d · următorul \d\d:\d\d$/);
  ctx.tbMc.eroare = "Pionex n-a răspuns"; assert.match(ctx.tbMcRand(ctx.tbStare.bot).nota, /^șanse pe drumuri ca ultimele 14 zile, nu o predicție · din \d\d:\d\d; acum n-a mers: Pionex n-a răspuns · reîncerc \d\d:\d\d$/);
});
await test("(1a) lib/grid-sim-worker.js: rulează în afara paginii (fără window / document), cu modulele paginii, și dă ACELAȘI rezultat ca pe fir", () => {
  const W = citeste("public", "lib", "grid-sim-worker.js"), trimise = [];
  assert.match(W, /importScripts\("\/lib\/text-ro\.js", "\/lib\/grid-calcul\.js", "\/lib\/grid-proba\.js", "\/lib\/monte-simbol\.js", "\/lib\/grid-sim\.js"\)/);
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise };
  ctx.self = ctx; ctx.postMessage = (m) => trimise.push(m);
  ctx.importScripts = (...f) => f.forEach((p) => vm.runInContext(citeste("public", p.replace(/^\//, "").replace(/\//g, path.sep)), ctx, { filename: p }));
  vm.createContext(ctx); vm.runInContext(W, ctx, { filename: "grid-sim-worker.js" });
  assert.equal(typeof ctx.onmessage, "function");
  const o = { plan: null, pornitLa: B[B.length - 288].t, stPrefix: ST, n: 40, seed: 12, orizonturi: [1, 7], zile: 14 };
  ctx.onmessage({ data: { id: 7, b15: B, st: ST, o } });
  assert.equal(trimise.length, 1); assert.equal(trimise[0].id, 7); assert.ok(trimise[0].rez && !trimise[0].rez.eroare, JSON.stringify(trimise[0]).slice(0, 200));
  assert.deepEqual(trimise[0].rez.orizonturi[1].p50, GS.simuleaza(B, ST, o).orizonturi[1].p50, "același rezultat ca pe firul paginii");
  ctx.onmessage({ data: { id: 8, b15: null, st: ST, o } }); assert.ok(trimise[1].eroare || (trimise[1].rez && trimise[1].rez.eroare), "o intrare stricată întoarce eroare, nu tace");
  assert.match(SW, /"\/lib\/grid-sim\.js","\/lib\/grid-sim-worker\.js"/, "worker-ul e în APP_SHELL (merge și instalat / offline)");
});
await test("(1b) tbMcSimuleaza: cu Worker ⇒ rezultatul vine din worker (pagina nu socotește); fără Worker / worker picat ⇒ pe fir, același rezultat; tbMcPorneste îl folosește", async () => {
  assert.match(functie(APP, "tbMcPorneste"), /await tbMcSimuleaza\(tbMc\.b15,st,\{plan:plan,pornitLa:pornitLa,stPrefix:pornitLa\?st:null,n:500,seed:12,orizonturi:\[1,7\],zile:14\}\)/);
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + functie(APP, "tbMcWorkerAsteptare") + "\n" + functie(APP, "tbMcSimuleaza");
  const fa = (Worker) => { const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, clearTimeout, GridSim: GS }; if (Worker) ctx.Worker = Worker; vm.createContext(ctx); vm.runInContext(src, ctx); return ctx; };
  const o = { plan: null, n: 20, seed: 12, orizonturi: [7], zile: 14 }, peFir = GS.simuleaza(B, ST, o);
  let primite = 0; class WorkerFals { constructor(u) { this.url = u; } postMessage(m) { primite++; const self = this; setTimeout(() => self.onmessage({ data: { id: m.id, rez: { marcaj: "din worker", orizonturi: [{ p50: 1 }] } } }), 5); } terminate() {} }
  const r1 = await fa(WorkerFals).tbMcSimuleaza(B, ST, o); assert.equal(r1.marcaj, "din worker"); assert.equal(primite, 1);
  const r2 = await fa(undefined).tbMcSimuleaza(B, ST, o); assert.equal(r2.orizonturi[0].p50, peFir.orizonturi[0].p50, "fără Worker: pe fir");
  class WorkerStricat { constructor() { throw new Error("nu merge"); } }
  const r3 = await fa(WorkerStricat).tbMcSimuleaza(B, ST, o); assert.equal(r3.orizonturi[0].p50, peFir.orizonturi[0].p50, "worker picat la pornire: pe fir");
  class WorkerMut { constructor() {} postMessage() {} terminate() {} }
  const ctx4 = fa(WorkerMut); ctx4.TB_MC_WORKER_MS = 50; const r4 = await ctx4.tbMcSimuleaza(B, ST, o); assert.equal(r4.orizonturi[0].p50, peFir.orizonturi[0].p50, "worker care nu răspunde: pe fir după așteptare");
});
await test("(E) versiunea de la v100.140 în sus; colectorul v101.89", () => {
  assert.match(HTML, /content="v100\.1(4\d|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4\d|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4\d|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4\d|[5-9]\d)\.0$/); assert.match(SW, /const CACHE="crypto-radar-v100-1(4\d|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4\d|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4\d|[5-9]\d)$/);
  assert.match(citeste("scripts", "colector.mjs"), /VERSIUNE_COLECTOR = "v101\.(89|9\d)"/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
