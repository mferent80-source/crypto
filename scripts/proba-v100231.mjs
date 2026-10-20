// Proba v100.231 (20.10, el: „fa tot”): duminica citește mișcarea reală a BTC, pauza câștigă gura de pornire,
// lista de la 8 se subțiază la poarta vie, Scan nu mai tipărește lei pe un nume nejudecat, abaterea T212 stă în față.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "macro.js"), ctx);
vm.runInContext(citeste("public", "lib", "actiuni-semnale.js"), ctx);
vm.runInContext(citeste("public", "lib", "acasa.js"), ctx);
vm.runInContext(citeste("public", "lib", "idei.js"), ctx);
const AC = ctx.Acasa, ID = ctx.Idei;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.231 · FRÂNĂ · proba\n");

const tp = citeste("scripts", "lib", "tura-piata.mjs");
const scan = citeste("public", "lib", "scan-ecran.js");
const ae = citeste("public", "lib", "acasa-ecran.js");
const t212 = citeste("public", "lib", "t212-ecran.js");
const cont = citeste("public", "lib", "cont-ecran.js");
const col = citeste("scripts", "colector.mjs");
const idx = citeste("public", "index.html");
const raport = tp.slice(tp.indexOf("async function raportSaptamana"), tp.indexOf("export async function turaPiata"));
const rej = t212.slice(t212.indexOf("async function t212IdeiRejudeca"), t212.indexOf("function deschideT212"));
const ci = cont.slice(cont.indexOf("function ciFac"), cont.indexOf("function ciZileHtml"));
const lin = () => AC.vreme({ clasament: { evita: 10, candidati: 90, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const ros = () => AC.vreme({ clasament: { evita: 70, candidati: 30, dir: { long: 45, short: 45, neutru: 10 } }, btc: { miscare: false }, fg: 50 });
const sus = (i) => 100 + i * 0.2, jos = (i) => 200 - i * 0.3;
const serie = (f) => Array.from({ length: 260 }, (_, i) => ({ c: f(i) }));
const larga = () => AC.vremeBursa({ qqq: serie(sus), vix: 14, ndx: { e50: 70, n: 100 } });
const frica = () => AC.vremeBursa({ qqq: serie(jos), vix: 31, ndx: { e50: 30, n: 100 } });
const rap5 = { valoare: { total: 100000 }, risc: { var95: 5000 } };

await test("duminica folosește mișcarea reală a BTC, nu un fals fix", () => {
  assert.match(raport, /regimPeBare/);
  assert.match(raport, /interval=60M/);
  assert.doesNotMatch(raport, /btc:\s*\{\s*miscare:\s*false\s*\}/);
});

await test("pauza câștigă gura crypto, și pe verb roșu; bursa n-o ia", () => {
  const p = AC.franaVerb(lin(), { fel: "crypto", pauza: true, pauzaN: 3 });
  assert.equal(p.faCe, "N-aș porni alt bot azi: 3 pierderi la rând.");
  assert.equal(AC.franaVerb(ros(), { fel: "crypto", pauza: true, pauzaN: 3 }).faCe, p.faCe);
  assert.match(AC.franaVerb(larga(), { fel: "bursa", pauza: true, pauzaN: 3 }).faCe, /^Aș cumpăra/);
  assert.equal(AC.frazaPauza(21), "N-aș porni alt bot azi: 21 de pierderi la rând.");
});

await test("verbul care invită citește raportul, VaR și evenimentul doar când sunt știute", () => {
  assert.match(AC.franaVerb(lin(), { raportStare: "lipsa" }).faCe, /raportul pe tot contul lipsește/);
  assert.match(AC.franaVerb(lin(), { raportStare: "vechi", raportOre: 14 }).faCe, /vechi de 14 ore/);
  assert.match(AC.franaVerb(lin(), { raportStare: "vechi", raportOre: 21 }).faCe, /vechi de 21 de ore/);
  const z = AC.franaVerb(lin(), { raportStare: "ok", raport: rap5 });
  assert.match(z.faCe, /^Aș reduce expunerea până sub 3% pe zi: o zi proastă îți ia ~5,0% din cont\.$/);
  assert.match(AC.franaVerb(lin(), { raportStare: "ok", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } }, eveniment: "CPI m/m." }).faCe, /chiar înainte de CPI m\/m\.$/);
  assert.equal(AC.franaVerb(lin(), { raportStare: "necunoscut" }).faCe, lin().faCe);
  assert.equal(AC.franaVerb(lin(), {}).faCe, lin().faCe);
  assert.equal(AC.franaVerb(ros(), { raportStare: "lipsa" }).faCe, ros().faCe);
  assert.equal(AC.franaVerb(frica(), { fel: "bursa", raportStare: "lipsa" }).faCe, frica().faCe);
  const lung = "X".repeat(80);
  assert.equal(AC.franaVerb(lin(), { eveniment: lung }).faCe, lin().faCe);
  assert.match(AC.franaVerb(larga(), { fel: "bursa", raportStare: "ok", raport: rap5 }).faCe, /^Aș reduce expunerea/);
});

await test("ordinea frânei: pauza, apoi lipsa, apoi vechi, apoi VaR, apoi evenimentul de azi", () => {
  const o = { fel: "crypto", pauza: true, pauzaN: 3, raportStare: "ok", raport: rap5, eveniment: "CPI m/m" };
  assert.match(AC.franaVerb(lin(), o).faCe, /alt bot azi/);
  assert.match(AC.franaVerb(lin(), { raportStare: "lipsa", raport: rap5, eveniment: "CPI m/m" }).faCe, /lipsește/);
  assert.match(AC.franaVerb(lin(), { raportStare: "vechi", raportOre: 14, raport: rap5, eveniment: "CPI m/m" }).faCe, /vechi de/);
  assert.match(AC.franaVerb(lin(), { raportStare: "ok", raport: rap5, eveniment: "CPI m/m" }).faCe, /^Aș reduce/);
});

await test("lista de la 8 cade când poarta vie nu mai zice cumpără", () => {
  const acum = Date.parse("2026-10-20T12:00:00Z");
  const id = { actiuni: [{ ticker: "AAA_US_EQ", simbol: "AAA" }, { ticker: "BBB_US_EQ", simbol: "BBB", rezultate: "2026-10-25" }, { ticker: "CCC_US_EQ", simbol: "CCC", rezultate: "nu-e-o-zi" }, { ticker: "DDD_US_EQ", simbol: "DDD", scos: true }], restul: [{ ticker: "EEE_US_EQ", simbol: "EEE", rezultate: "2026-11-20" }, { ticker: "FFF_US_EQ", simbol: "FFF" }, { ticker: "GGG_US_EQ", simbol: "GGG" }, { ticker: "HHH_US_EQ", simbol: "HHH" }] };
  const bloc = ID.ideiInca(id, { regim: { macro: "riskoff" }, acum });
  assert.equal(bloc.trecute, 0);
  assert.equal(ID.ideiInca(id, { regim: { macro: "stres" }, acum }).trecute, 0);
  const ramas = ID.ideiInca(id, { acum });
  assert.deepEqual(Array.from(ramas.actiuni, (x) => x.simbol), ["AAA", "CCC", "EEE", "FFF", "GGG"]);
  assert.deepEqual(Array.from(ramas.restul, (x) => x.simbol), ["HHH"]);
  assert.equal(ramas.trecute, 6);
  const mb = ID.ideiInca(id, { regim: { mb: { stare: "rau", vechi: false } }, acum });
  assert.equal(mb.trecute, 0);
});

await test("Scan nu mai tipărește planul de dimineață și lei la 1% pe un nume nejudecat", () => {
  assert.doesNotMatch(scan, /Mărime la 1% risc din cont/);
  assert.doesNotMatch(scan, /Planul de la poarta T212 \(din tura de dimineață\)/);
  assert.match(scan, /Scan\.plan\(x, null\)/);
  assert.match(scan, /acPauzaSezon\(\)/);
  assert.match(scan, /Pentru un bot grid/);
  assert.match(scan, /Funding \(la 4 ore\)/);
});

await test("gura de pauză e aceeași pe Acasă, Sugestii, Scan și Tablou; ciFac pune abaterea T212 înainte de criză", () => {
  assert.match(ae, /pas\("contRaport"/);
  assert.match(ae, /else v = acFraneaza\(v, "crypto"\)/);
  assert.match(ae, /acFraneaza\(Acasa\.vremeBursa/);
  assert.match(ae, /act\.slice\(0, 3\)\.map\(function \(x\) \{ return acSym\(/);
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /acFrazaPauza\(pzS\)/);
  assert.match(t212, /acFrazaPauza\(pzT\)/);
  const iU = ci.indexOf("rec.urmarire"), iT = ci.indexOf("rec.t212"), iS = ci.indexOf("r.stres");
  assert.ok(iU >= 0 && iU < iT && iT < iS, "urmarire " + iU + " t212 " + iT + " stres " + iS);
  assert.match(col, /ScorSezon, StatisticaTrade, JurnalTrade/);
  assert.match(rej, /if \(!id \|\| typeof Idei === "undefined" \|\| !Idei\.judecaActiune\) return;/);
  assert.ok(rej.indexOf("if (!id") < rej.indexOf("await t212RegimAdu"));
  assert.match(rej, /catch \(e\) \{ tine = true; \}/);
  assert.match(rej, /!bare \|\| !bare\.length \|\| !\(pret > 0\)\) tine = false/);
  assert.doesNotMatch(rej, /apiFetch|action=idei/);
  assert.match(tp, /async function citire/);
  assert.doesNotMatch(tp.slice(tp.indexOf("async function franaAzi"), tp.indexOf("function aplicaFrana")), /incearca\(/);
});

await test("versiunea v100.231, insigna FRÂNĂ, colectorul v101.132", () => {
  const P = JSON.parse(citeste("package.json"));
  assert.equal(P.version, "100.231.0");
  assert.equal(P.scripts["test:v100231"], "node scripts/proba-v100231.mjs");
  assert.equal((P.scripts.test.match(/test:v100231/g) || []).length, 1);
  assert.equal((P.scripts.test.match(/test:v100230/g) || []).length, 1);
  assert.doesNotMatch(P.scripts["test:v100231"], /npm run test:v100231/);
  assert.equal((idx.match(/v100\.231/g) || []).length, 4);
  assert.match(idx, /id="sideVersiune"[^>]*>v100\.231 · FRÂNĂ</);
  assert.match(idx, /id="topVersiune">v100\.38 · doar citire</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-231/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.231"/);
  const info = JSON.parse(citeste("BUILD_INFO.json"));
  assert.equal(info.version, "v100.231");
  assert.equal(info.badge, "v100.231 · FRÂNĂ");
  assert.equal(info.engineContract, "54.1");
  assert.match(col, /if \(S\.eLimitaDeRitm\(e\)\) return;/);
  assert.match(col, /VERSIUNE_COLECTOR = "v101\.132"/);
  assert.match(citeste("public", "lib", "grid-sim.js"), /"Aș porni: câștigă în "/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
