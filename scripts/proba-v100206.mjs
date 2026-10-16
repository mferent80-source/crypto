// Proba v100.206 (16.10.2026, el: „fă idei”): în „Grid: ce setez acum?”, rândul Busolei („mai agitată / mai calmă” pe 4h) spune și
// cât de des a ieșit prețul din canal după cuvântul ăsta, MĂSURAT pe istorie (Busola 1.65.0, src/motor/miscareMasurata.ts: 4h — agitată
// 72,8%, de obicei 64,3%, calmă 58,1%, 10.830 de momente, 361 de zile, dovedit). Un câmp nou (`masurat`), desenat sub rând — textul și nota
// de dinainte rămân neatinse.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.206 · mișcarea măsurată în rândul Busolei din Grid · proba\n");
const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }); vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
const B = ctx.Busola, ACUM = Date.UTC(2026, 9, 16, 9), LA = ACUM - 20 * 60000;
const rez = (stare) => ({ la: LA, grid: { interval: "4h", canal: "±2×ATR", dovedit: true, miscareDovedita: true, liniste: -0.004, oricand: -0.006, miscare: -0.011 }, monede: { MET: { perp4h: stare } } });

await test("„mai agitată” pe 4h: rândul spune cât de des a ieșit prețul din canal (73%, de obicei 64%)", () => {
  const r = B.randGrid(rez("miscare"), "MET_USDT_PERP", ACUM);
  assert.match(r.masurat, /pe istorie, după „mai agitată” prețul a ieșit din canalul ±2 ATR în 2 zile în 73% din cazuri \(de obicei 64%\)/);
  assert.match(r.text, /mai agitată ca de obicei — aici gridul a pierdut cel mai mult/, "textul de dinainte rămâne");
});
await test("„mai calmă”: 58%, de obicei 64% (dovedit pe 4h)", () => {
  const r = B.randGrid(rez("liniste"), "MET_USDT_PERP", ACUM);
  assert.match(r.masurat, /după „mai calmă” prețul a ieșit din canalul ±2 ATR în 2 zile în 58% din cazuri \(de obicei 64%\)/); assert.ok(!/nedovedit/.test(r.masurat));
});
await test("„nimic neobișnuit” ⇒ fără rândul măsurat", () => { assert.equal(B.randGrid(rez("nu-stiu"), "MET_USDT_PERP", ACUM).masurat, undefined); });
await test("desenat sub rând, în gri", () => {
  const h = B.htmlRand(B.randGrid(rez("miscare"), "MET_USDT_PERP", ACUM), (x) => String(x));
  assert.match(h, /<p class="tbSub grBusolaMasurat">pe istorie, după „mai agitată”/);
});
await test("aceleași cifre ca în Busola (miscareMasurata, 16.10.2026)", () => {
  assert.match(citeste("public", "lib", "busola.js"), /MISCARE_MASURATA_4H = \{ agitata: 0\.728, obisnuita: 0\.643, calma: 0\.581 \}/);
});
await test("versiunile: v100.206, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 206);   /* v100.207: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.205\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100205 && npm run test:v100206/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
