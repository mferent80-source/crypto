// Proba v100.364 (19.11.2026, el: „continua” după verificarea de dimineață ⇒ cele 3 mărunțișuri văzute pe viu):
//  S - „scan  symbol error” la fiecare scan crypto (de la 17.11): Pionex are monede cu nume chinezești (币安人生_USDT_PERP); ruta clasamentului
//      păstrează doar [A-Z0-9_] ⇒ în clasament ajungea „_USDT_PERP” (simbol gol), iar scanul îl cerea în fiecare oră. Universul crypto = doar simboluri
//      pe care Radarul le poate scrie (litere latine și cifre).
//  O - „carnet: ofertă ORDER_USDT_PERP symbol error” în fiecare noapte: oferta pe o monedă scoasă de pe bursă nu se mai poate judeca niciodată ⇒
//      după 3 zile de scadență + 3 zile de „simbol invalid” (ca lista neagră) devine nejudecabilă, cu motivul spus; altă eroare (Pionex lent) nu o atinge.
//  T - „sub 30%” ⇒ „sub 30 %” (casa scrie procentul cu spațiu, ca „23 %” de lângă el).
//   node scripts/proba-v100364.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "tablou-extra.js", "risc-luna.js", "carnet.js", "grid-laborator.js", "grid-clasament.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GridCalcul: G, GridPlan: GP, TabloExtra: TE, Carnet: CN, GridClasament: GCL } = globalThis;
const ZI = 86400000;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.364 · mărunțișurile de dimineață\n");

await test("S universul crypto: fără simboluri pe care ruta le-ar goli (nume chinezești, simbol gol); BTC, 1000PEPE rămân; ordinea după volum", () => {
  const t = [{ symbol: "币安人生_USDT_PERP", amount: "9000" }, { symbol: "BTC_USDT_PERP", amount: "8000" }, { symbol: "_USDT_PERP", amount: "7000" }, { symbol: "龙虾_USDT_PERP", amount: "6000" },
    { symbol: "1000PEPE_USDT_PERP", amount: "5000" }, { symbol: "BTC_ETH_PERP", amount: "4000" }];
  assert.deepEqual(GCL.topDupaVolum(t, 10).map((x) => x.simbol), ["BTC_USDT_PERP", "1000PEPE_USDT_PERP"]);
  assert.deepEqual(GCL.topDupaVolum(t, 1).map((x) => x.simbol), ["BTC_USDT_PERP"], "tăierea la n după filtru: locul nu-l ia moneda care nu se poate scrie");
});

const tl = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-laborator.mjs")).href);
await test("O ofertele pe o monedă scoasă: după 6 zile de la ofertă + „symbol error” ⇒ nejudecabilă cu motivul; mai tânără sau altă eroare ⇒ rămâne de judecat", async () => {
  const ACUM = Date.UTC(2026, 10, 19, 3), st = { jos: 0.98, sus: 1.02, grile: 8, levier: 2, stop: { jos: 0.975, sus: 1.025 }, pStop: 0.3 }, jurnal = [];
  const of = (simbol, zile) => ({ simbol, t: ACUM - zile * ZI, dir: "long", sursa: "fisa", cine: "ta", asteapta: false, egale: true, ta: st, mea: st });
  const deJ = [of("ORDER_USDT_PERP", 10), of("TANAR_USDT_PERP", 4), of("LENT_USDT_PERP", 10), of("ORDER_USDT_PERP", 8)];
  const cere = async (tip, sim) => {
    if (tip === "tickers") return { data: { tickers: [] } };
    if (sim === "LENT_USDT_PERP") throw new Error("timeout");
    throw new Error(sim + " symbol error");
  };
  const r = await tl.turaLaborator({ cere, jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, pauzaMs: 0, GridCalcul: G, GridLaborator: globalThis.GridLaborator, GridClasament: GCL, top: 1, H: 2, pagini: 12, zile: 60,
    GridPlan: GP, plan: { plus: 3, minus: 15 }, suma: 100, levier: 5, miscareZi: TE.miscareZi, Carnet: CN, carnetDeJudecat: deJ, acum: ACUM });
  assert.ok(r.carnet, "rez.carnet");
  assert.deepEqual(deJ[0].r, { nejudecabil: true, motiv: "simbol scos de pe bursă" });
  assert.deepEqual(deJ[3].r, { nejudecabil: true, motiv: "simbol scos de pe bursă" }, "ambele oferte pe aceeași monedă");
  assert.equal(deJ[1].r, undefined, "4 zile: încă poate fi o pană a bursei");
  assert.equal(deJ[2].r, undefined, "altă eroare nu închide oferta");
  assert.ok(jurnal.some((l) => /carnet: ofert/.test(l) && /ORDER_USDT_PERP/.test(l) && /nejudecabil/.test(l)), jurnal.join(" | "));
  // raportul: oferta închisă se numără la nejudecabile, nu mai „așteaptă”
  const rap = CN.raport({ cazuri: [], oferte: deJ, acum: ACUM, reps: 50 });
  assert.equal(rap.inainte.nejudecabile, 2); assert.equal(rap.inainte.asteapta, 2);
  // și rămâne închisă la unirea de mâine cu aceeași ofertă venită iar din fișă (fără .r)
  const m = CN.uneste(deJ, [of("ORDER_USDT_PERP", 10)], ACUM);
  assert.equal(m.length, 4); assert.equal(m[0].r.nejudecabil, true);
});

await test("T stopul promis: coșurile scrise cu spațiu înainte de % (sub 30 %, 30–50 %, peste 50 %), ca restul paginii", () => {
  const l = [{ simbol: "A", t: 1, cine: "ta", egale: false, asteapta: false, ta: { net: 0, stop: true, pStop: 0.2 }, mea: { net: 0, stop: false, pStop: 0.2 } }];
  assert.deepEqual(CN.calibrare(l).map((x) => x.cos), ["sub 30 %", "30–50 %", "peste 50 %"]);
  assert.doesNotMatch(citeste("public", "lib", "carnet.js"), /"(sub 30|30–50|peste 50)%"/);
});

await test("C colectorul v101.201 (tura de laborator închide ofertele pe monede scoase)", () => {
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 201, "colector de la v101.201 încolo");
});

await test("V versiunile de la v100.364 încolo (v100.365: versiunea curentă o verifică proba ei)", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 364 && nr(citeste("public", "sw.js")) >= 364);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 364); assert.match(p.scripts.test, /npm run test:v100363 && npm run test:v100364/); assert.equal(p.scripts["test:v100364"], "node scripts/proba-v100364.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(nr(bi.badge) >= 364); assert.ok(bi.mi364 && bi.sc363);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
