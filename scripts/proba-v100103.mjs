// Proba v100.103 / colector v101.72 (05.10, el: „FA TOT” pe ideile I-533..I-536 de după v100.102):
// (1) I-533 hârtia și jurnalul pornesc fereastra aleasă (ÎNGUST / LARG), nu gridul des pliat la „Alte setări”
// (2) I-534 regula „gridul încape în pragul de pierdere” în lista ✓/✗ a porții + „Ce aș face eu”
// (3) I-535 ÎNGUST vs LARG pe boții reali: recunoașterea la pornire (doar ferestre oferite ÎNAINTE de pornire) + bilanțul cu verdict
// (4) I-536 pragul de pierdere ca % din sumă, setat o dată (server + poartă), folosit înaintea planului împrumutat · (E) versiunile
// Depozit PUBLIC ⇒ cifre construite.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridProba = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
const GP = new Function(`${lib("grid-plan.js")}; return GridPlan;`)();
globalThis.GridPlan = GP;
const TE = new Function(`${lib("tablou-extra.js")}; return TabloExtra;`)();
const GJ = new Function(`${lib("grid-jurnal.js")}; return GridJurnal;`)();
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(globalThis.GridCalcul);
const OB = new Function("GridCalcul", "GridProba", "JurnalTrade", `${lib("obiceiuri.js")}; return Obiceiuri;`)(globalThis.GridCalcul, globalThis.GridProba, JT);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.103 · colector v101.72 · I-533..I-536");

const FER = (lev, jos, sus) => ({ dir: "long", pret: 1, jos, sus, grile: 20, pas: 0.003, levier: lev, suma: 100, d: 1 - jos, u: sus - 1, stop: { jos: jos * 0.9985, sus: sus * 1.0015 }, lichidare: { jos: lev > 1 ? jos * 0.85 : null, sus: null },
  laStop: -15, laTinta: 5, proba: { n: 100, stop: lev > 1 ? 40 : 15, tinta: 50, inGrid: 5, mediaUsdt: lev > 1 ? -0.5 : 0.7, oreTipic: 5, zile: 30, ferestreZile: 3, independente: 10 } });
const TA = FER(5, 0.97, 1.02), MEA = FER(1, 0.89, 1.11);

await test("(1) I-533: setarea unei ferestre pentru hârtie/jurnal = gridul ferestrei (jos, sus, grile, levier, sumă, stop), nu f.setare", () => {
  assert.deepEqual(GP.setareFereastra(MEA), { dir: "long", jos: 0.89, sus: 1.11, grile: 20, levier: 1, suma: 100, stop: { jos: 0.89 * 0.9985, sus: 1.11 * 1.0015 } });
  assert.equal(GP.setareFereastra(null), null);
  const f = { simbol: "ABC_USDT_PERP", dir: "long", pret: 1, verdict: { nivel: "porneste" }, setare: { jos: 0.99, sus: 1.01, grile: 5, levier: 4, suma: 100 }, stat: { antren: { mediana: 0.01, ceaMaiProasta: -0.1 } } };
  const l = GJ.adauga([], f, 1000, { eticheta: "larg", setare: GP.setareFereastra(MEA) });
  assert.equal(l[0].fereastra, "larg"); assert.deepEqual([l[0].jos, l[0].sus, l[0].levier, l[0].grile, l[0].suma], [0.89, 1.11, 1, 20, 100]);
  assert.equal(l[0].mediana, null, "mediana probei e a gridului des, nu a ferestrei ⇒ nu se amestecă");
  assert.equal(GJ.adauga([], f, 1000)[0].fereastra, "alte", "fără fereastră = gridul din „Alte setări”");
});
await test("(1) I-533 pagina: butoane „pe hârtie” / „am pornit-o” pe fiecare fereastră (doar pe fișă), cu cheia ca text; hârtia și jurnalul le folosesc", () => {
  const c = { GridPlan: GP, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), grRand: (a, b) => a + ": " + b, grPret: (v) => String(v) }; vm.createContext(c);
  vm.runInContext(fnApp("grPlanVarHtml") + ";this.f=grPlanVarHtml;", c);
  const pv = { ta: TA, mea: MEA, plan: { plus: 5, minus: 15, afaraOre: 12 }, nota: "", amp: 0.1 };
  const h = c.f(pv, null, "", true);
  for (const k of ["ta", "mea"]) { assert.ok(h.includes(`data-action-click="gridHartiePorneste('${k}')"`), "hârtie " + k); assert.ok(h.includes(`data-action-click="gridJurnalAdauga('${k}')"`), "jurnal " + k); }
  assert.ok(!c.f(pv, null, "").includes("gridHartiePorneste"), "pe Tablou fără butoane");
  assert.match(fnApp("gridHartiePorneste"), /grFereastraAleasa\(k\)/); assert.match(fnApp("grFereastraAleasa"), /GridPlan\.setareFereastra\(/); assert.match(fnApp("gridJurnalAdauga"), /GridJurnal\.adauga\(grJurnalCitit\(\),f,Date\.now\(\),fe\|\|/);   /* v100.104: fără fereastră merge doar recomandarea */
  assert.match(fnApp("grFereastraAleasa"), /grPlanMemo\.grid/);
});
const PG = (laMargine) => ({ r: { laMargine, procent: laMargine / 100, parte: "jos", stopPlan: 0.95, moarte: 0.5, plan: 15, preaLarg: laMargine > 18 }, prag: 15 });
await test("(2) I-534: regula „grid-prag” în poartă (✗ peste 1,2× pragul, ✓ altfel, lipsește fără gridul completat) și „Ce aș face eu” când doar ea pică", () => {
  const baza = { fisa: { simbol: "ABC_USDT_PERP", verdict: { nivel: "porneste" }, setare: {} }, trades: [], acum: 1, dir: "long", levier: 1, plan: { plus: 5, minus: 15 } };
  const rau = OB.poarta(Object.assign({}, baza, { gridPrag: PG(26.3) })), r = rau.reguli.find((x) => x.cod === "grid-prag");
  assert.equal(r.ok, false); assert.equal(r.text, "Gridul nu încape în pragul tău de pierdere: la marginea de jos pierzi ≈ 26,3 USDT, pragul e −15."); assert.equal(rau.trecut, false);
  assert.equal(OB.facPoarta(rau).fac, "Aș porni ÎNGUST sau LARG din fișă: gridul ăsta nu încape în pragul tău de pierdere.");
  const bun = OB.poarta(Object.assign({}, baza, { gridPrag: PG(14.2) })).reguli.find((x) => x.cod === "grid-prag");
  assert.equal(bun.ok, true); assert.equal(bun.text, "Gridul încape în pragul tău de pierdere (≈ 14,2 USDT la marginea de jos, pragul −15).");
  assert.equal(OB.poarta(baza).reguli.some((x) => x.cod === "grid-prag"), false);
  assert.match(fnApp("gridPoarta"), /gridPrag:grPoartaGridPrag\(\)/);
});
await test("(3) I-535 recunoașterea: un bot pornit DUPĂ ce fișa a oferit ferestrele, pe aceeași monedă și direcție, cu setările unei ferestre (±2%, același levier)", () => {
  assert.equal(GP.recunoaste({ dir: "long", jos: 0.892, sus: 1.105, levier: 1 }, { ta: TA, mea: MEA }), "larg");
  assert.equal(GP.recunoaste({ dir: "long", jos: 0.97, sus: 1.02, levier: 5 }, { ta: TA, mea: MEA }), "ingust");
  assert.equal(GP.recunoaste({ dir: "long", jos: 0.97, sus: 1.02, levier: 3 }, { ta: TA, mea: MEA }), "ingust", "v100.114 (ZAMA): alt levier, aceeași bandă = aceeași fereastră");
  assert.equal(GP.recunoaste({ dir: "short", jos: 0.892, sus: 1.105, levier: 1 }, { ta: TA, mea: MEA }), null, "altă direcție");
  const of = [{ simbol: "ABC_USDT_PERP", t: 1000, dir: "long", ta: { jos: 0.97, sus: 1.02, levier: 5 }, mea: { jos: 0.89, sus: 1.11, levier: 1 } }];
  const bot = { id: "9", baza: "ABC.PERP", directie: "long", gridJos: 0.891, gridSus: 1.108, levier: 1, investit: 100, pornitLa: 5000, activ: true };
  const l = GJ.recunoaste([], [bot], of, 9000);
  assert.equal(l.length, 1); assert.equal(l[0].fereastra, "larg"); assert.equal(l[0].botId, "9"); assert.equal(l[0].auto, true); assert.equal(l[0].t, 5000);
  assert.equal(GJ.recunoaste(l, [bot], of, 9000).length, 1, "o singură dată");
  assert.equal(GJ.recunoaste([], [Object.assign({}, bot, { pornitLa: 500 })], of, 9000).length, 0, "pornit ÎNAINTE de ofertă ⇒ nu (informația nu era disponibilă atunci)");
  assert.equal(GJ.recunoaste([], [Object.assign({}, bot, { pornitLa: 1000 + 13 * 3600000 })], of, 2e8).length, 0, "la peste 12 h după ofertă ⇒ nu");
  assert.equal(GJ.recunoaste([], [Object.assign({}, bot, { baza: "ABC" })], of, 9000).length, 0, "spot nu se leagă de fișa PERP");
});
const Z = (fer, moneda, pct, k) => ({ id: fer + moneda + k, t: k, simbol: moneda + "_USDT_PERP", fereastra: fer, botId: "b" + fer + moneda + k, activ: false, investit: 100, suma: 100, rezultat: pct * 100 });
const set = (fn) => { const l = []; ["AA", "BB", "CC", "DD", "EE", "FF"].forEach((m, i) => { for (let k = 0; k < 2; k++) { l.push(Z("ingust", m, fn("ingust", i, k), k)); l.push(Z("larg", m, fn("larg", i, k), k + 10)); } }); return l; };
await test("(3) I-535 bilanțul (regula fixată dinainte: media rezultatului în % din investiție, LARG − ÎNGUST; IC 90% bootstrap pe monede)", () => {
  const d = GJ.bilantFerestre(set((f, i, k) => (f === "larg" ? 0.02 : -0.03) + (i % 3) * 0.002 + k * 0.001));
  assert.equal(d.verdict, "dovedit"); assert.equal(d.larg.n, 12); assert.equal(d.ingust.monede, 6); assert.ok(d.ic[0] > 0);
  assert.equal(GJ.bilantFerestre(set((f, i, k) => (f === "larg" ? -0.03 : 0.02) + (i % 3) * 0.002 + k * 0.001)).verdict, "pe dos");
  assert.equal(GJ.bilantFerestre(set((f, i, k) => ((i + k) % 2 ? 0.04 : -0.04) * (f === "larg" ? 1 : -1) + (i % 2 ? 0.01 : -0.01))).verdict, "nedovedit");
  const p = GJ.bilantFerestre(set(() => 0.01).slice(0, 6)); assert.equal(p.verdict, "puține");
  assert.equal(GJ.bilantFerestre(set(() => 0.01).map((e) => Object.assign({}, e, { activ: true }))).larg.n, 0, "doar boții închiși");
  assert.equal(GJ.textFerestre(p), "ÎNGUST vs LARG pe boții tăi: ÎNGUST 3 boți, media +1,0% · LARG 3 boți, media +1,0% — puține cazuri (trebuie cel puțin 5 pe fiecare, din cel puțin 3 monede).");
  assert.match(GJ.textFerestre(d), /^ÎNGUST vs LARG pe boții tăi: ÎNGUST 12 boți, media −2,\d% · LARG 12 boți, media \+2,\d% — LARG a adus mai mult \(dovedit\)\.$/);
  assert.equal(GJ.textFerestre(GJ.bilantFerestre([])), null, "fără boți pe ferestre ⇒ tace");
});
await test("(3) I-535 pagina: ferestrele oferite se țin minte; jurnalul recunoaște boții; bilanțul pe fișă și în jurnal", () => {
  assert.match(fnApp("grFerestreTine"), /localStorage\.setItem\("grFerestre"/);
  assert.match(fnApp("gridJurnalActualizeaza"), /GridJurnal\.recunoaste\(GridJurnal\.actualizeaza\(l,boti,Date\.now\(\)\),boti,grFerestreCitite\(\),Date\.now\(\),grJurnalIgnoratiCititi\(\)\)/);
  assert.match(fnApp("renderGridJurnal"), /GridJurnal\.textFerestre\(GridJurnal\.bilantFerestre\(l\)\)/);
  assert.match(fnApp("grPlanVarHtml"), /GridJurnal\.textFerestre\(GridJurnal\.bilantFerestre\(grJurnalCitit\(\)\)\)/);
});
await test("(4) I-536 propunePlan: pragul lui (% din sumă) bate planul împrumutat; planul scris pe bot rămâne mai tare (chematorul)", () => {
  const p = TE.propunePlan({ plus: 2, minus: 6, investit: 40, nume: "ABC" }, 100, { pierdere: 15, tinta: 3, afaraOre: 12 });
  assert.deepEqual([p.plus, p.minus, p.afaraOre], [3, 15, 12]); assert.equal(p.nota, "pragul tău: −15% / +3% din sumă, 12 h afară (setat în poartă)");
  assert.equal(TE.propunePlan(null, 100, { pierdere: 0 }).nota, "propunerea mea: +3% / −15% din investiție / 12 h afară din grid", "prag invalid ⇒ ignorat");
  assert.equal(TE.propunePlan(null, 100, null).minus, 15);
});
await test("(4) I-536 serverul păstrează pragul (validat) în config; pagina îl salvează din poartă și îl dă fișei, Tabloului; colectorul îl citește", async () => {
  function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
  const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const cheama = async (metoda, qs, corp) => { const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
    const h = { "cf-connecting-ip": "10.0.2." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
    const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env }); return { status: res.status, d: await res.json() }; };
  assert.equal((await cheama("POST", "action=config", { prag: { pierdere: 15, tinta: 3, afaraOre: 12 } })).status, 200);
  assert.deepEqual((await cheama("GET", "action=config")).d.config.prag, { pierdere: 15, tinta: 3, afaraOre: 12 });
  assert.equal((await cheama("POST", "action=config", { prag: { pierdere: 150, tinta: 3, afaraOre: 12 } })).status, 400, "peste 100% ⇒ refuzat");
  assert.equal((await cheama("POST", "action=config", { prag: null })).status, 200); assert.equal((await cheama("GET", "action=config")).d.config.prag, undefined, "null = șters");
  assert.match(fnApp("grPragSalveaza"), /body:JSON\.stringify\(\{prag:/); assert.match(fnApp("grFranaAdu"), /grFrana\.prag=/);
  for (const id of ["grPragPierdere", "grPragTinta", "grPragOre"]) assert.ok(fnApp("grPoartaHtml").includes('id="' + id + '"'), id);
  assert.match(fnApp("grPlanPentruVariante"), /TabloExtra\.propunePlan\(grPlanUlt\.ult,suma,grFrana\.prag\)/);
  assert.match(fnApp("tbAduPropunerePlan"), /TabloExtra\.propunePlan\(ult,b\.investit,grFrana\.prag\)/);
  const col = citeste("scripts", "colector.mjs"); assert.match(col, /TabloExtra\.propunePlan\(ult, b\.investit, pragCfg\)/); assert.match(col, /TabloExtra\.propunePlan\(null, b\.investit, pragCfg\)/);
});
await test("(E) versiunile v100.103 / colector v101.72", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1(0[3-9]|[1-9]\d)$/); const V2 = bi.version; assert.ok(bi.badge.startsWith(V2 + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V2 + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V2.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V2.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4);
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V2.slice(1) + ".0"); assert.ok(/npm run test:v100102 && npm run test:v100103( && |")/.test(pk));
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.(7[2-9]|[89]\d)";/);
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
