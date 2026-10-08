// Proba v100.141 + colector v101.90 (08.10, el: „fa idei” după v100.140): (1) rezumatul de dimineață pomenește felul Monte Carlo pe fiecare
// bot; (2) colectorul publică verdictul în KV (ruta mcVerdict), pagina îl citește și nu mai socotește când e proaspăt; (3) worker-ul așteaptă
// mai puțin pe telefon; (4) «Reluarea arată botul OPRIT» ⇒ butonul „verifică setările în Simulator”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { liniaMonteCarlo, turaMonteCarloBot, gridSimDinPagina } from "./lib/tura-monte-carlo-bot.mjs";
import { mcsDinPagina } from "./lib/tura-variante-noapte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, GS = G.GridSim, M = G.MonteSimbol, APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), COL = citeste("scripts", "colector.mjs");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.141 / v101.90 · Monte Carlo din colector în KV și în rezumatul de dimineață · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.now() - (zile * 96 - i) * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare15(20, 3), P0 = B[B.length - 1].c, ST = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: P0 * 0.85 }, tp: null, tip: "geometric" };
const ACUM = Date.now();

await test("(2a) ruta istoric-bot: POST mcVerdict curăță (fel / culoare știute, text tăiat la 400, cel mult 60 de boți, cifre sau null); GET întoarce {mcVerdict}", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.95.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.95.0.2" } }), env: ENV });
  let r = await get(); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { mcVerdict: null });
  assert.equal((await post({})).status, 400, "fără boti");
  r = await post({ la: ACUM, boti: { 2413: { cat: "tine", stare: "bine", text: "x".repeat(500), la: ACUM - 7200000, ultima: ACUM }, "rau id": { cat: "tine", stare: "bine", text: "y", la: ACUM, ultima: ACUM }, 7: { cat: "nimic", stare: "bine", text: "y", la: ACUM, ultima: ACUM }, 8: { cat: "opreste", stare: "mov", text: "z", la: "acum", ultima: ACUM } } });
  assert.equal(r.status, 200, await r.text());
  r = await get(); const j = (await r.json()).mcVerdict; assert.equal(j.la, ACUM); assert.deepEqual(Object.keys(j.boti).sort(), ["2413", "8"]);
  assert.equal(j.boti["2413"].text.length, 400); assert.equal(j.boti["2413"].cat, "tine"); assert.equal(j.boti["2413"].la, ACUM - 7200000); assert.equal(j.boti["8"].stare, null, "culoare necunoscută ⇒ null"); assert.equal(j.boti["8"].la, null, "cifră stricată ⇒ null");
});
await test("(1) liniaMonteCarlo: „MET «aș ține» de 2 zile · PONS «aș opri» de 3 h” din starea turei, doar boții activi cu fel; nimic ⇒ null; starea ține și culoarea", async () => {
  const boti = [{ id: "1", baza: "MET.PERP", activ: true }, { id: "2", baza: "PONS.PERP", activ: true }, { id: "3", baza: "XYZ.PERP", activ: false }, { id: "4", baza: "ABC.PERP", activ: true }];
  const U = ACUM - 5 * 60000, st = { 1: { cat: "tine", la: ACUM - 2 * 86400000 - 3600000, ultima: U }, 2: { cat: "opreste", la: ACUM - 3 * 3600000 - 60000, ultima: U }, 3: { cat: "tine", la: ACUM, ultima: U }, 5: { cat: "ban", la: ACUM, ultima: U } };
  assert.equal(liniaMonteCarlo(st, boti, ACUM), "MET «aș ține» de 2 zile · PONS «aș opri» de 3 h"); assert.equal(liniaMonteCarlo({}, boti, ACUM), null); assert.equal(liniaMonteCarlo(null, [], ACUM), null);
  assert.equal(liniaMonteCarlo({ 1: { cat: "plan", la: ACUM - 20 * 60000, ultima: U } }, boti, ACUM), "MET «nu se potrivește cu planul» de 20 min");
  // revizia Opus (5): PC-ul pornit după ora rezumatului ⇒ starea e de aseară - boții cu socotirea mai veche de 30 de minute (sau fără) nu intră; toți vechi ⇒ fără rând
  assert.equal(liniaMonteCarlo({ 1: { cat: "tine", la: ACUM - 14 * 3600000, ultima: ACUM - 9 * 3600000 }, 2: { cat: "opreste", la: ACUM - 3600000, ultima: U } }, boti, ACUM), "PONS «aș opri» de 1 h");
  assert.equal(liniaMonteCarlo({ 1: { cat: "tine", la: ACUM - 3600000 } }, boti, ACUM), null, "fără ultima ⇒ nu intră");
  // revizia Opus (4): rândul ≤ 160 ca al Busolei („🎰 Monte Carlo: ” are 16 ⇒ 144): întâi fără „de când”, apoi „· +N”
  const multi = Array.from({ length: 8 }, (_, i) => ({ id: String(10 + i), baza: "MARSCOIN" + i + ".PERP", activ: true })), stM = {}; multi.forEach((b) => { stM[b.id] = { cat: "plan", la: ACUM - 2 * 86400000, ultima: U }; });
  const lm = liniaMonteCarlo(stM, multi, ACUM); assert.ok(lm.length <= 144, lm.length + ": " + lm); assert.match(lm, / · \+\d$/); assert.doesNotMatch(lm, /de 2 zile/);
  const trei = liniaMonteCarlo(stM, multi.slice(0, 3), ACUM); assert.ok(trei.length <= 144); assert.doesNotMatch(trei, /\+\d$/);
  const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), GC = new Function(lib("grid-calcul.js") + "; return GridCalcul;")(), GP = new Function("GridCalcul", lib("grid-proba.js") + "; return GridProba;")(GC);
  const Mcs = mcsDinPagina(lib("monte-simbol.js"), lib("monte-simbol-ecran.js"), GC, GP), GSc = gridSimDinPagina(lib("grid-sim.js"), GC, GP, Mcs.MonteSimbol);
  const rows = B.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: 1 })), d = { boti: [{ id: "9", activ: true, baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP", gridJos: ST.jos, gridSus: ST.sus, levier: 2, directie: "long", investit: 50, opritorPierdereActiv: true, opritorPierdere: ST.stop.jos, pornitLa: B[B.length - 288].t, brut: { buOrderData: { row: 11 } } }], GridSim: GSc, GridCalcul: GC, randuri15: async () => rows, stare: { boti: {} }, jurnal: () => {}, n: 40, anunta: async () => true };
  await turaMonteCarloBot(d); assert.ok(["bine", "rau", "atentie"].includes(d.stare.boti["9"].stare), "culoarea e în stare, pentru KV: " + JSON.stringify(d.stare.boti["9"]));
  assert.match(COL, /liniaMonteCarlo\(ritm\.mcBoti, boti, acum\)/); assert.match(COL, /"🎰 Monte Carlo: " \+ /); assert.match(COL, /trimite\("\/api\/istoric-bot\?action=mcVerdict", \{ la: Date\.now\(\), boti: st\.boti \}\)/); assert.match(COL, /VERSIUNE_COLECTOR = "v101\.90"/);
});
await test("(2b) pagina: tbMcTick ia verdictul colectorului din KV (proaspăt, sub 20 de minute) și NU mai socotește; vechi sau lipsă ⇒ socotește local; nota spune „socotit de colector”", async () => {
  assert.match(functie(APP, "tbMcTick"), /await tbMcDinKv\(\)/); assert.match(functie(APP, "tbMcDinKv"), /action=mcVerdict/); assert.match(functie(APP, "tbMcRand"), /socotit de colector/);
  const fa = (kvBoti, kvLa) => { const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, clearTimeout, GridSim: GS, TextRo: G.TextRo };
    let aduceri = 0; ctx.mcsAduCoin = async () => { aduceri++; return { b15: B, b1: [], fundingInfo: null }; }; ctx.mcsSimbolBot = () => "PONS"; ctx.tbPanouVizibil = () => true; ctx.textEroare = (e) => String(e && e.message || e);
    ctx.getJSON = async (u) => (/mcVerdict/.test(u) ? { mcVerdict: kvBoti ? { la: kvLa, boti: kvBoti } : null } : null); ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
    ctx.tbStare = { routeOk: true, bot: { id: "1", baza: "PONS.PERP", quote: "USDT", directie: "LONG", gridJos: ST.jos, gridSus: ST.sus, levier: 2, investit: 50, pornitLa: B[B.length - 288].t, opritorPierdereActiv: true, opritorPierdere: ST.stop.jos, brut: { buOrderData: { row: 11 } } }, citireO: null, funding: null }; ctx.tbPlan = { botId: null, plan: null }; ctx.tbDeseneazaCitire = () => {};
    const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + "var tbMcKv={la:0,d:null,inLucru:null};\n" + ["tbMcWorkerAsteptare", "tbMcSimuleaza", "tbMcDinKv", "tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
    vm.createContext(ctx); vm.runInContext(src, ctx); return { ctx, aduceri: () => aduceri }; };
  const kvFresh = { 1: { cat: "tine", stare: "bine", text: "de aici încolo, 7 zile: CÂȘTIGĂ în 61% din drumuri · PIERDE în 39%", la: ACUM - 3600000, ultima: ACUM - 5 * 60000 } };
  const a = fa(kvFresh, ACUM - 5 * 60000); await a.ctx.tbMcTick(); await new Promise((r) => setTimeout(r, 80));
  assert.equal(a.aduceri(), 0, "cu verdict proaspăt din colector nu se aduc lumânări și nu se socotește"); assert.equal(a.ctx.tbMc.rand.text, kvFresh[1].text); assert.equal(a.ctx.tbMc.sursa, "colector"); assert.equal(a.ctx.tbMc.rand.stare, "bine");
  const r = a.ctx.tbMcRand(a.ctx.tbStare.bot); assert.match(r.nota, / · socotit de colector \d\d:\d\d · următorul \d\d:\d\d$/); assert.equal(r.text, kvFresh[1].text);
  const b = fa({ 1: Object.assign({}, kvFresh[1], { ultima: ACUM - 45 * 60000 }) }, ACUM - 45 * 60000); b.ctx.tbMcTick(); for (let i = 0; i < 100 && (b.aduceri() === 0 || b.ctx.tbMc.inLucru); i++) await new Promise((r) => setTimeout(r, 50)); await new Promise((r) => setTimeout(r, 60));
  assert.equal(b.aduceri(), 1, "verdict vechi de 45 de minute ⇒ se socotește local"); assert.equal(b.ctx.tbMc.sursa, "pagina");
  const c = fa(null, null); c.ctx.tbMcTick(); for (let i = 0; i < 100 && (c.aduceri() === 0 || c.ctx.tbMc.inLucru); i++) await new Promise((r) => setTimeout(r, 50)); assert.equal(c.aduceri(), 1, "fără KV ⇒ local");
  // revizia Opus (6): pragul de prospețime 30 de minute (tura la 15 min + bucla + copia paginii de 2 min ajungeau la ~20)
  assert.equal(a.ctx.TB_MC_KV_PROASPAT_MS, 30 * 60000); const d = fa({ 1: Object.assign({}, kvFresh[1], { ultima: ACUM - 25 * 60000 }) }, ACUM - 25 * 60000); await d.ctx.tbMcTick(); await new Promise((r) => setTimeout(r, 80)); assert.equal(d.aduceri(), 0, "25 de minute e încă proaspăt");
  const gata = async (x) => { for (let i = 0; i < 100 && (x.aduceri() === 0 || x.ctx.tbMc.inLucru); i++) await new Promise((r) => setTimeout(r, 50)); await new Promise((r) => setTimeout(r, 60)); };
  // revizia Opus (2): două tic-uri în zbor (schimbarea botului cheamă tura de două ori) ⇒ O singură socotire
  const e = fa(null, null); e.ctx.tbMcTick(); e.ctx.tbMcTick(); await gata(e); assert.equal(e.aduceri(), 1, "două tic-uri în paralel ⇒ o socotire");
  // revizia Opus (1): setările / planul schimbate cât verdictul din KV e proaspăt ⇒ verdictul colectorului e pe setările vechi ⇒ local, până vine unul socotit DUPĂ schimbare
  const f = fa(kvFresh, ACUM - 5 * 60000); await f.ctx.tbMcTick(); assert.equal(f.ctx.tbMc.sursa, "colector");
  f.ctx.tbStare.bot = Object.assign({}, f.ctx.tbStare.bot, { opritorPierdere: ST.stop.jos * 0.98 }); f.ctx.tbMcTick(); await gata(f); assert.equal(f.aduceri(), 1, "cheia schimbată ⇒ socotit local"); assert.equal(f.ctx.tbMc.sursa, "pagina");
  f.ctx.tbMcKv.la = 0; f.ctx.getJSON = async () => ({ mcVerdict: { la: Date.now(), boti: { 1: Object.assign({}, kvFresh[1], { ultima: Date.now() + 1000, text: "verdict nou" }) } } }); await f.ctx.tbMcTick(); await new Promise((r) => setTimeout(r, 80));
  assert.equal(f.ctx.tbMc.sursa, "colector", "verdict socotit după schimbare ⇒ iar colectorul"); assert.equal(f.ctx.tbMc.rand.text, "verdict nou");
  // revizia Opus (🔵): pagina publicată n-are KV (503) ⇒ getJSON aruncă ⇒ local, fără excepție scăpată
  const g = fa(null, null); g.ctx.getJSON = async () => { throw new Error("HTTP 503"); }; await g.ctx.tbMcTick(); await gata(g); assert.equal(g.aduceri(), 1, "503 ⇒ local");
});
await test("(R7) worker-ul care nu răspunde: la depășire e OPRIT (terminate, tbMcWorker=null) și cererea pică cu eroare - NU se socotește pe fir (pe telefon pagina îngheța); verdictul vechi rămâne, reîncercare în 2 min", async () => {
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + functie(APP, "tbMcWorkerAsteptare") + "\n" + functie(APP, "tbMcSimuleaza");
  let terminari = 0; class WorkerMut { constructor() {} postMessage() {} terminate() { terminari++; } }
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, clearTimeout, GridSim: GS, Worker: WorkerMut }; vm.createContext(ctx); vm.runInContext(src, ctx); ctx.TB_MC_WORKER_MS = 50;
  await assert.rejects(() => ctx.tbMcSimuleaza(B, ST, { plan: null, n: 20, seed: 12, orizonturi: [7], zile: 14 }), /n-a răspuns/); assert.equal(terminari, 1); assert.equal(ctx.tbMcWorker, null);
  assert.match(functie(APP, "tbDeseneazaTabloulUnic"), /tbMcTick\(\)\.catch\(function\(\)\{\}\)/, "promisiunea async nu rămâne neprinsă");
});
await test("(3) worker-ul așteaptă 10 s pe telefon (ecran îngust), TB_MC_WORKER_MS altfel; tbMcSimuleaza folosește așteptarea", () => {
  const src = APP.match(/var tbMcWorker=null[^\n]*\n/)[0] + functie(APP, "tbMcWorkerAsteptare");
  const fa = (w) => { const ctx = { Math, Number }; if (w) ctx.window = w; vm.createContext(ctx); vm.runInContext(src, ctx); return ctx.tbMcWorkerAsteptare(); };
  assert.equal(fa(undefined), 20000); assert.equal(fa({ innerWidth: 1920 }), 20000); assert.equal(fa({ innerWidth: 390 }), 10000);
  assert.match(functie(APP, "tbMcSimuleaza"), /tbMcWorkerAsteptare\(\)/);
});
await test("(4) «Reluarea arată botul OPRIT» ⇒ butonul rândului zice „verifică setările în Simulator”; altfel „deschide în Simulator”", () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, GridSim: GS, TextRo: G.TextRo };
  ctx.tbStare = { routeOk: true, bot: { id: "1" } }; ctx.tbPlan = { botId: null, plan: null }; ctx.tbPanouVizibil = () => true; ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
  const src = APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + functie(APP, "tbMcRand");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.tbMc.botId = "1"; ctx.tbMc.la = Date.now(); ctx.tbMc.randLa = ctx.tbMc.la; ctx.tbMc.urmatorul = ctx.tbMc.la + 15 * 60000; ctx.tbMc.rand = { stare: "rau", text: "de aici încolo, 7 zile: …", faCe: "Reluarea arată botul OPRIT pe drumul real: setările…", cat: "reluare" };
  assert.equal(ctx.tbMcRand(ctx.tbStare.bot).buton, "verifică setările în Simulator");
  ctx.tbMc.rand = { stare: "bine", text: "x", faCe: "Aș ține: …", cat: "tine" }; assert.equal(ctx.tbMcRand(ctx.tbStare.bot).buton, "deschide în Simulator");
  // revizia Opus (3): din KV felul (cat) e cel CONFIRMAT, textul e al ultimei socotiri ⇒ butonul urmează TEXTUL de pe ecran, nu felul
  ctx.tbMc.rand = { stare: "rau", text: "de aici încolo, 7 zile: PIERDE în 70% · «Reluarea arată botul OPRIT pe drumul real» · pe o zi: …", cat: "tine" }; assert.equal(ctx.tbMcRand(ctx.tbStare.bot).buton, "verifică setările în Simulator", "textul zice reluare, felul încă nu");
  ctx.tbMc.rand = { stare: "bine", text: "de aici încolo, 7 zile: CÂȘTIGĂ în 61% · «Aș ține»", cat: "reluare" }; assert.equal(ctx.tbMcRand(ctx.tbStare.bot).buton, "deschide în Simulator", "felul zice reluare, textul nu");
  // revizia Opus (🔵): la trecerea de la colector la socotit local, nota spune „socotit de colector” cât textul e încă al lui
  ctx.tbMc.sursa = "pagina"; ctx.tbMc.randSursa = "colector"; ctx.tbMc.inLucru = true; assert.match(ctx.tbMcRand(ctx.tbStare.bot).nota, /socotit de colector \d\d:\d\d · următorul \d\d:\d\d · socotesc din nou…$/);
  assert.match(functie(APP, "tbDeseneazaCitire"), /escapeHtml\(mc\.buton\)/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /return json\(\{paza:p\}\)\}\s+\/\/ v100\.90 \(I-513\)/, "comentariul rutei paza stă la ruta paza");
});
await test("(E) versiunea de la v100.141 în sus; colectorul v101.90", () => {
  assert.match(HTML, /content="v100\.1(4[1-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[1-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[1-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[1-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[1-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[1-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[1-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
