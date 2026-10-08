// Proba v100.139 (08.10, el: „tot acolo pune Monte Carlo cu un scan automat pe bot la 15 min să spună predicția” - a ales A, în pagină):
// (a) GridSim.verdictScurt = rândul scurt (7 zile + „pe o zi”); (b) Tabloul socotește la 15 min + la schimbarea botului (tbMc), rândul e primul
// în „Ce spune piața acum”, cu „socotit hh:mm · următorul hh:mm”, „șanse … nu o predicție” și clic spre Simulator; (c) comportamentul cu
// funcțiile adevărate (GridSim real, lumânări sintetice, mcsAduCoin stub).
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
const G = globalThis, GS = G.GridSim, M = G.MonteSimbol, APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), CSS = citeste("public", "app.css");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.139 · Monte Carlo în „Ce spune piața acum”, la 15 minute · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.now() - (zile * 96 - i) * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare15(20, 3), P0 = B[B.length - 1].c, ST = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: P0 * 0.85 }, tp: null, tip: "geometric" };
const RE_RAND = /(CÂȘTIGĂ|PIERDE) în \d+% din drumuri · (CÂȘTIGĂ|PIERDE) în \d+%/, RE_FACE = / · «(Aș ține|Aș opri|L-aș opri|Stopul e în zgomot|O aruncare de ban( de aici încolo)?|Nu se potrivește cu planul tău|Reluarea arată botul (OPRIT|LICHIDAT) pe drumul real)»/;

await test("(a) GridSim.verdictScurt: 7 zile + «ce aș face» + pe o zi, într-un rând; la botul care rulează „de aici încolo”; eroarea ca text", () => {
  const pornitLa = B[B.length - 288].t, rez = GS.simuleaza(B, ST, { plan: null, pornitLa, stPrefix: ST, n: 60, seed: 12, orizonturi: [1, 7], zile: 14 });
  const v = GS.verdictScurt(rez, ST, null, { profitNet: 0.3 });
  assert.ok(["bine", "rau", "atentie"].includes(v.stare), v.stare);
  assert.match(v.text, /^de aici încolo, 7 zile: /); assert.match(v.text, RE_RAND); assert.match(v.text, RE_FACE); assert.match(v.text, / · pe o zi: (CÂȘTIGĂ|PIERDE) în \d+% · (CÂȘTIGĂ|PIERDE) în \d+%$/);
  assert.ok(v.culoare && v.faCe && v.rand);
  const aproape = Object.assign({}, ST, { stop: { jos: Math.min(P0, B[B.length - 288].o) * 0.985 } }), vs = GS.verdictScurt(GS.simuleaza(B, aproape, { plan: null, pornitLa, stPrefix: aproape, n: 60, seed: 12, orizonturi: [1, 7], zile: 14 }), aproape, null, null);
  assert.match(vs.text, / · stopul atins \d+%/, "stopul apropiat se vede: " + vs.text); assert.doesNotMatch(v.text, /stopul atins/, "stopul neatins nu umple rândul");
  const nou = GS.verdictScurt(GS.simuleaza(B, ST, { plan: null, n: 60, seed: 12, orizonturi: [1, 7], zile: 14 }), ST, null, null); assert.match(nou.text, /^7 zile: /);
  assert.equal(GS.verdictScurt({ eroare: "Prea puțin istoric" }, ST, null, null).text, "Prea puțin istoric"); assert.equal(GS.verdictScurt(null, ST, null, null).stare, "info");
  const f7 = GS.verdictScurt(GS.simuleaza(B, ST, { plan: null, n: 60, seed: 12, orizonturi: [3, 7], zile: 14 }), ST, null, null); assert.doesNotMatch(f7.text, /pe o zi/, "fără orizontul de o zi, fără „pe o zi”");
});
await test("(b) app: tbMc la 15 min (TB_MC_MS), pornit la tic și la alt bot; GridSim pe botul reluat (stPrefix, [1,7] zile), funding-ul real; rândul primul în citire, cu ceasul și clicul spre Simulator", () => {
  assert.match(APP, /var TB_MC_MS=15\*60000/); assert.match(functie(APP, "tbDeseneazaTabloulUnic"), /tbMcTick\(\)/);
  const p = functie(APP, "tbMcPorneste"); assert.match(p, /mcsAduCoin\(sim\)/); assert.match(p, /GridSim\.setariDinBot\(b\)/); assert.match(p, /GridSim\.simuleaza\(tbMc\.b15,st,\{plan:plan,pornitLa:pornitLa,stPrefix:pornitLa\?st:null,n:500,seed:12,orizonturi:\[1,7\],zile:14\}\)/); assert.match(p, /GridSim\.verdictScurt\(/); assert.match(p, /fundingZi:fi\?fi\.rataZi:0\.0003,fundingCost:!fi/);
  const t = functie(APP, "tbMcTick"); assert.match(t, /Date\.now\(\)-tbMc\.la<TB_MC_MS/); assert.match(t, /tbPanouVizibil\(\)/);
  const c = functie(APP, "tbDeseneazaCitire"); assert.match(c, /tbMcRand\(b\)/); assert.match(c, /out\.unshift\(/); assert.match(c, /data-action-click="gsDeschideBot\(\)"[^>]*>deschide în Simulator</);
  const r = functie(APP, "tbMcRand"); assert.match(r, /șanse pe drumuri ca ultimele 14 zile, nu o predicție/); assert.match(r, /socotit "\+hm\(tbMc\.la\)\+" · următorul "\+hm\(tbMc\.urmatorul\)/);
  assert.match(CSS, /#tabloubot \.tbCitR\.tbCitMc\{/);
});
await test("(c) comportamentul: primul tic socotește pe bot (lumânări prin mcsAduCoin o dată), al doilea tic în 15 minute nu; alt bot ⇒ din nou; rândul pentru alt bot e null", async () => {
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, GridSim: GS, TextRo: G.TextRo };
  let aduceri = 0; ctx.mcsAduCoin = async (sim) => { aduceri++; return { b15: B, b1: [], fundingInfo: { rataZi: 0.0005 } }; }; ctx.mcsSimbolBot = (b) => "PONS"; ctx.tbPanouVizibil = () => true; ctx.textEroare = (e) => String(e && e.message || e); ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
  const bot = (id) => ({ id, baza: "PONS.PERP", quote: "USDT", directie: "LONG", gridJos: ST.jos, gridSus: ST.sus, levier: 2, investit: 50, pornitLa: B[B.length - 288].t, opritorPierdereActiv: true, opritorPierdere: ST.stop.jos, brut: { buOrderData: { row: 11 } }, profitNet: 0.2 });
  ctx.tbStare = { routeOk: true, bot: bot("1"), citireO: null, funding: null }; ctx.tbPlan = { botId: null, plan: null }; ctx.tbDeseneazaCitire = () => {};
  const src = APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + ["tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.tbMcTick(); for (let i = 0; i < 100 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 50)); await new Promise((r) => setTimeout(r, 60));
  assert.equal(aduceri, 1); assert.ok(ctx.tbMc.rand, "verdictul e gata"); assert.equal(ctx.tbMc.botId, "1"); assert.ok(ctx.tbMc.urmatorul - ctx.tbMc.la === 15 * 60000);
  const r = ctx.tbMcRand(ctx.tbStare.bot); assert.equal(r.ce, "Monte Carlo"); assert.match(r.text, /^de aici încolo, 7 zile: /); assert.match(r.text, / · șanse pe drumuri ca ultimele 14 zile, nu o predicție — socotit \d\d:\d\d · următorul \d\d:\d\d$/);
  assert.equal(ctx.tbMcRand(bot("2")), null, "alt bot ⇒ nimic din verdictul vechi");
  const la = ctx.tbMc.la; ctx.tbMcTick(); await new Promise((r) => setTimeout(r, 80)); assert.equal(aduceri, 1); assert.equal(ctx.tbMc.la, la, "în 15 minute nu se socotește din nou");
  ctx.tbStare.bot = bot("2"); ctx.tbMcTick(); for (let i = 0; i < 100 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 50)); await new Promise((r) => setTimeout(r, 60));
  assert.equal(ctx.tbMc.botId, "2"); assert.equal(aduceri, 1, "aceeași monedă ⇒ lumânările se refolosesc"); assert.ok(ctx.tbMc.rand);
});
// ---------------- revizia Opus (7f5062b..9ebf358) ----------------
const REZ = (o, acum) => ({ n: 60, zile: 14, suma: 50, acum: acum === undefined ? { net: 0.01, usdt: 0.5, bare: 100, t: Date.now(), perechi: 3, oprit: null } : acum, orizonturi: [Object.assign({ zile: 7, bare: 672, pCastig: 0.6, pPierde: 0.4, pZero: 0, marja: 4, p5: -2, p50: 1, p95: 3, hist: null, pLich: 0, pStop: 0, pTp: 0, pIesire: 1, perechi: 10, maxJos: { p50: -1, p5: -2 }, funding: 0, plan: null, deAici: { p5: -2, p50: 1, p95: 3, pCastig: 0.6, pPierde: 0.4, pZero: 0, marja: 4, hist: null } }, o)] });
await test("(R2/R3/R5) rândul scurt: planul deja atins e spus primul; culoarea urmează textul (L-aș opri / N-aș porni / Nu se potrivește / Reluarea ⇒ rău); „stopul atins 0%” nu apare", () => {
  const plan = { minus: 1, plus: 2 };
  const atins = GS.verdictScurt(REZ({ plan: { p: 0.1, pRau: 0.6, zileMediana: null, dejaAtins: "minus" } }), ST, plan, { profitNet: -1.2 });
  assert.match(atins.text, /^de aici încolo, 7 zile: CÂȘTIGĂ în 60% din drumuri · PIERDE în 40% · planul atins: ieși · /); assert.equal(atins.stare, "rau");
  const plus = GS.verdictScurt(REZ({ plan: { p: 0.7, pRau: 0.1, zileMediana: 2, dejaAtins: "plus" } }), ST, plan, { profitNet: 2.5 }); assert.match(plus.text, / · planul atins: încasează · /); assert.equal(plus.stare, "bine");
  const lich = GS.verdictScurt(REZ({ pLich: 0.04, pCastig: 0.52, pPierde: 0.48, deAici: { p5: -2, p50: 0.2, p95: 3, pCastig: 0.52, pPierde: 0.48, pZero: 0, marja: 4, hist: null } }), ST, null, null); assert.match(lich.text, /«L-aș opri»/); assert.equal(lich.stare, "rau", "lichidare 4% ⇒ rău, nu galben");
  const planRau = GS.verdictScurt(REZ({ p5: -9, pCastig: 0.61, pPierde: 0.39, deAici: { p5: -9, p50: 1, p95: 3, pCastig: 0.61, pPierde: 0.39, pZero: 0, marja: 4, hist: null } }), ST, { minus: 3, plus: 5 }, null); assert.match(planRau.text, /«Nu se potrivește cu planul tău»/); assert.equal(planRau.stare, "rau");
  const oprit = GS.verdictScurt(REZ({}, { net: -0.1, usdt: -5, bare: 100, t: Date.now(), perechi: 3, oprit: "oprit" }), ST, null, null); assert.match(oprit.text, /«Reluarea arată botul OPRIT pe drumul real»/); assert.equal(oprit.stare, "rau");
  const mic = GS.verdictScurt(REZ({ pStop: 0.004, pTp: 0.003, pLich: 0.004 }), ST, null, null); assert.doesNotMatch(mic.text, /stopul atins|TP atins|lichidare/, "sub 0,5% nu se scrie „0%”: " + mic.text);
});
await test("(R1/R6/R7/R8/R9/R10) Tablou: botul OPRIT se socotește ca bot nou și o spune; motivul adevărat la „ca bot nou”; funding-ul doar al monedei botului; planul de probă nu intră; setarea / planul schimbate ⇒ se socotește din nou; eroarea păstrează verdictul vechi și reîncearcă în 2 min; grilele presupuse spuse", async () => {
  const p = functie(APP, "tbMcPorneste");
  assert.match(p, /b\.activ===false|!b\.activ/); assert.match(p, /gridJos/); assert.match(p, /tbMc\.funding\|\|\(tbStare\.funding&&tbStare\.funding\.sim===/); assert.match(p, /plan\.proba/); assert.match(p, /String\(rez\.eroare\)\.split\(\/\[\.:\]\/\)\[0\]/); assert.match(p, /am pus 20/);
  assert.match(APP, /TB_MC_REINCERCARE_MS=2\*60000/); assert.match(functie(APP, "tbMcTick"), /tbMcCheie\(b\)/); assert.match(functie(APP, "tbMcRand"), /acum n-a mers/);
  const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Promise, setTimeout, GridSim: GS, TextRo: G.TextRo };
  let aduceri = 0, cade = false; ctx.mcsAduCoin = async (sim) => { aduceri++; if (cade) throw new Error("Pionex n-a răspuns acum"); return { b15: B, b1: [], fundingInfo: { rataZi: 0.0005 } }; }; ctx.mcsSimbolBot = () => "PONS"; ctx.tbPanouVizibil = () => true; ctx.textEroare = (e) => String(e && e.message || e);
  ctx.TabloBot = { simboluri: () => ({ pionex: "PONS_USDT_PERP" }) };
  const bot = (id, activ) => ({ id, activ: activ !== false, baza: "PONS.PERP", quote: "USDT", directie: "LONG", gridJos: ST.jos, gridSus: ST.sus, levier: 2, investit: 50, pornitLa: B[B.length - 288].t, opritorPierdereActiv: true, opritorPierdere: ST.stop.jos, brut: { buOrderData: { row: 11 } }, profitNet: 0.2 });
  ctx.tbStare = { routeOk: true, bot: bot("1", false), citireO: null, funding: { sim: "BTC_USDT_PERP", info: { rataZi: 0.009 } } }; ctx.tbPlan = { botId: "1", plan: { minus: 1, plus: 2, proba: true } }; ctx.tbDeseneazaCitire = () => {};
  const src = APP.match(/var TB_MC_MS=15\*60000[^\n]*\n/)[0] + ["tbMcCheie", "tbMcTick", "tbMcPorneste", "tbMcDeseneaza", "tbMcRand"].map((n) => functie(APP, n)).join("\n");
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const gata = async () => { for (let i = 0; i < 100 && ctx.tbMc.inLucru; i++) await new Promise((r) => setTimeout(r, 50)); await new Promise((r) => setTimeout(r, 60)); };
  ctx.tbMcTick(); await gata();
  assert.match(ctx.tbMc.rand.text, /^bot oprit - socotit ca bot nou cu setările lui: 7 zile: /, ctx.tbMc.rand.text); assert.equal(ctx.tbMc.st.fundingZi, 0.0005, "funding-ul din lumânările monedei, nu al BTC"); assert.equal(ctx.tbMc.plan, null, "planul de probă nu intră");
  const la = ctx.tbMc.la; ctx.tbPlan = { botId: "1", plan: { minus: 1, plus: 2 } }; ctx.tbMcTick(); await gata(); assert.ok(ctx.tbMc.la > la, "planul schimbat ⇒ din nou"); assert.deepEqual(ctx.tbMc.plan, { minus: 1, plus: 2 });
  cade = true; ctx.tbMc.b15La = 0; ctx.tbMc.la = 0; const vechi = ctx.tbMc.rand.text; ctx.tbMcTick(); await gata();
  assert.equal(ctx.tbMc.rand.text, vechi, "verdictul vechi rămâne"); assert.match(ctx.tbMc.eroare || "", /n-a răspuns/); assert.ok(Date.now() - ctx.tbMc.la >= 15 * 60000 - 2 * 60000 - 1000, "reîncercare în ~2 minute, nu 15");
  assert.match(ctx.tbMcRand(ctx.tbStare.bot).text, / · din \d\d:\d\d; acum n-a mers: Pionex n-a răspuns acum/);
  cade = false; ctx.tbStare.bot = bot("3", true); ctx.tbStare.bot.brut = null; ctx.tbMcTick(); await gata(); assert.match(ctx.tbMc.rand.text, /număr de grile necunoscut, am pus 20/);
});
await test("(E) versiunea de la v100.139 în sus (colectorul neatins)", () => {
  assert.match(HTML, /content="v100\.1(39|[4-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(39|[4-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(39|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(39|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(39|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(39|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(39|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
