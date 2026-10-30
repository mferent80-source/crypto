// v100.273 (30.10.2026, el la întrebarea despre nota „Setup quality”: „Spune pe ecran”): partea de risc a notei (riskQ = rr / 2,2) iese
// mereu 81,8 („82/100”), fiindcă buildTradeMap pune TP2 la 1,8 × distanța până la stop - nu măsoară piața. Nota NU se schimbă (decizie de
// model, neluată); lângă cifră scrie „prin construcție”, cu explicația, ca rândul „Risk / reward” din v100.272. O hartă construită altfel
// (raportul ≠ tm.rr2) ⇒ cifra simplă, ca înainte.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnApp = (nume) => {
  const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js");
  const j = APP.slice(i + 10).search(/\n(async )?function /); return APP.slice(i + 1, j < 0 ? undefined : i + 10 + j);
};
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); });
}
console.log("\nV100.273 · „Setup quality”: partea de risc spusă „prin construcție”\n");

/* lumea notei: harta reală (buildTradeMap) sau una construită altfel; elementele de pe ecran ca obiecte simple */
function lume({ dir = "LONG", harta = "reala" } = {}) {
  const el = {}, $ = (id) => (el[id] = el[id] || { id, textContent: "", className: "", title: "", style: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); if (k === "title") this.title = String(v); }, removeAttribute(k) { delete this.attrs[k]; if (k === "title") this.title = ""; } });
  const q = { price: 100, atr: 2, sup: 98, res: 104, trendScore: 64, momScore: 58, structureScore: 60, volScore: 60, smc: { trap: false }, regime: "RANGE" };
  const sm = { direction: dir, long: dir === "LONG" ? 70 : 30, short: dir === "LONG" ? 30 : 70 };
  const box = { Math, Number, Date, String, isFinite, $, document: { getElementById: $ },
    assetClass: () => "CRYPTO", coin: (s) => String(s).replace(/USDT$/, ""), dataFresh: { rest: Date.now() }, analysisSource: () => "BINANCE", appSettings: () => ({ signalMin: 55 }),
    journalReliabilityForCoin: () => ({ n: 0, exp: 0 }), stockSymbol: (s) => s, gradeClass: (g) => "g" + g };
  vm.createContext(box);
  vm.runInContext(["clamp", "researchGrade", "buildTradeMap", "setupQualityCurrent", "setQuality", "renderSetupQuality"].map(fnApp).join("\n"), box);
  let tm = box.buildTradeMap(q, sm);
  if (harta === "alta") tm = Object.assign({}, tm, { tp2: dir === "LONG" ? tm.entryLow + 3 * (tm.entryLow - tm.stop) : tm.entryHigh - 3 * (tm.stop - tm.entryHigh) });   /* ținte puse altfel */
  box.window = { __radarState: { symbol: "ETHUSDT", source: "BINANCE", q }, __signalState: { sm, tm }, __microState: null };
  return { box, el, $, tm };
}

await test("1 harta reală: TP2 = 1,8 × stopul ⇒ partea de risc 81,8 (cifra NU se schimbă) și e marcată „prin construcție”", () => {
  for (const dir of ["LONG", "SHORT"]) {
    const { box } = lume({ dir }), z = box.setupQualityCurrent();
    assert.ok(Math.abs(z.risk - 1.8 / 2.2 * 100) < 1e-9, dir + ": riscul " + z.risk);
    assert.equal(z.riskConstr, true, dir + ": raportul fix nu e recunoscut");
  }
});
await test("2 pe ecran: „82/100 · prin construcție” + explicația; bara rămâne la aceeași lățime; nota totală neschimbată", () => {
  const { box, $ } = lume(), z = box.setupQualityCurrent();
  box.renderSetupQuality();
  assert.equal($("sqRisk").textContent, "82/100 · prin construcție");
  assert.match($("sqRisk").title, /Ținta TP2 e pusă la 1,8 × distanța până la stop/);
  assert.match($("sqRisk").title, /nu măsoară piața/);
  assert.equal($("sqmRisk").style.width, z.risk + "%", "bara");
  assert.equal($("setupGradeBadge").textContent, "GRADE " + z.grade + " · " + z.overall.toFixed(0));
  /* nota totală = formula de dinainte (riskQ intră cu 0,18, neschimbat) */
  const asteptat = Math.max(0, Math.min(100, 0.24 * z.trend + 0.18 * z.entry + 0.15 * z.liq + 0.18 * z.risk + 0.15 * z.micro + 0.10 * z.data));
  assert.ok(Math.abs(z.overall - asteptat) < 1e-9, "nota " + z.overall + " față de " + asteptat);
});
await test("3 o hartă construită altfel (raportul ≠ tm.rr2): cifra simplă, fără „prin construcție” și fără explicație - și după o redesenare cu ea", () => {
  for (const dir of ["LONG", "SHORT"]) {
    const w = lume({ dir }); w.box.renderSetupQuality();   /* întâi harta reală (cu explicație), apoi cealaltă pe același element */
    const z0 = w.box.setupQualityCurrent();
    w.box.window.__signalState.tm = lume({ dir, harta: "alta" }).tm;
    const z = w.box.setupQualityCurrent(); w.box.renderSetupQuality();
    assert.equal(z.riskConstr, false, dir); assert.notEqual(Math.round(z.risk), Math.round(z0.risk), dir + ": harta de probă trebuia să dea alt risc");
    assert.equal(w.$("sqRisk").textContent, Math.round(z.risk) + "/100", dir); assert.equal(w.$("sqRisk").title, "", dir + ": explicația rămasă");
  }
});
await test("4 WAIT: fără setup, nimic nou (nota arată „NO SETUP” sau cifrele de dinainte, fără „prin construcție”)", () => {
  const { box, $ } = lume({ dir: "WAIT" }); box.renderSetupQuality();
  assert.doesNotMatch($("sqRisk").textContent, /prin construcție/);
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
process.exit(picate ? 1 : 0);
