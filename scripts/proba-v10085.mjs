// Proba v100.85 (03.10, el: reveniri + short) - public/lib/reveniri.js: regulile (pe bare ÎNCHISE), istoricul față de „o zi oarecare”,
// eticheta, frazele, urmărirea; idei.js: listele de monede. Regulile sunt cele FIXATE în specul 2026-10-03-reveniri-si-short-design.md.
//   node scripts/proba-v10085.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
let R0 = null; const R = () => R0 || (R0 = new Function(`${lib("reveniri.js")}; return Reveniri;`)());
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 · reveniri.js (regulile, istoricul, urmărirea) + idei.js (listele de monede)");

const H4 = 4 * 3600000, ZI = 864e5, T0 = Date.UTC(2026, 0, 1);
// n bare de durată d; închiderea dată de f(i), maximul/minimul ±0,2% în jurul ei
const bare = (n, f, d = H4) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * d, o: c, h: c * 1.002, l: c * 0.998, c }; });
// moneda: 100 (0–149), cade liniar la 60 (150–179), stă la 60 (180–249), urcă la 66 (250–299)
const revine = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : i < 250 ? 60 : 60 + 6 * (i - 249) / 50);
const cutit = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : 60 - 2 * Math.max(0, i - 249) / 50);
const proaspat = (i) => (i === 296 ? 59 : revine(i));
const subMedie = (i) => (i < 250 ? revine(i) : i <= 285 ? 60 + 10 * (i - 249) / 36 : 70 - 5 * (i - 285) / 14);
// acțiunea: 100 (0–39), cade la 65 (40–59), stă la 65 (60–80), urcă la 72 (81–99)
const revA = (i) => (i < 40 ? 100 : i < 60 ? 100 - 35 * (i - 39) / 20 : i <= 80 ? 65 : 65 + 7 * (i - 80) / 19);

await test("(1) monedă: cădere 34% de la maximul pe 30 de zile, +10% de la minimul de acum ~10 zile, peste media pe 3 zile ⇒ revine", () => {
  const b = bare(300, revine), v = R().monedaPeRevenire(b, b[299].t + H4);
  assert.deepEqual(v, { cadere: 0.3413, deLaMin: 0.1022, zileDeLaMin: 9.8, revine: true });
});
await test("(1) monedă: cădere fără revenire (încă scade) / minim proaspăt (sub 2 zile) / sub media pe 3 zile ⇒ nu revine", () => {
  for (const [nume, f] of [["cuțit", cutit], ["minim proaspăt", proaspat], ["sub medie", subMedie]]) {
    const b = bare(300, f), v = R().monedaPeRevenire(b, b[299].t + H4); assert.ok(v, nume); assert.equal(v.revine, false, nume);
  }
  const p = R().monedaPeRevenire(bare(300, proaspat), bare(300, proaspat)[299].t + H4); assert.ok(p.deLaMin >= 0.08 && p.zileDeLaMin < 2, "doar vechimea minimului o oprește");
});
await test("(1) monedă: doar bare ÎNCHISE - bara în curs și barele de după `acum` nu schimbă verdictul; înainte să se închidă bara 299 se judecă 298", () => {
  const b = bare(300, revine), acum = b[299].t + H4, a = R().monedaPeRevenire(b, acum);
  const cuViitor = b.concat(bare(20, () => 10).map((x, k) => ({ ...x, t: b[299].t + (k + 1) * H4 })));
  assert.deepEqual(R().monedaPeRevenire(cuViitor, acum), a);
  assert.deepEqual(R().monedaPeRevenire(b, acum - 1), R().monedaPeRevenire(b.slice(0, 299), acum));
});
await test("(1) monedă: sub 180 de bare de 4h ⇒ nimic (nicio cifră inventată); listă goală / nu e listă ⇒ nimic", () => {
  const b = bare(179, revine); assert.equal(R().monedaPeRevenire(b, b[178].t + H4), null);
  assert.equal(R().monedaPeRevenire([], Date.now()), null); assert.equal(R().monedaPeRevenire(null, Date.now()), null);
});
await test("(1) acțiune: cădere 27% de la maximul pe 60 de zile, +11% de la minimul de acum 19 zile ⇒ revine, cu stopul sub minim și ținta la maxim", () => {
  const v = R().actiunePeRevenire(bare(100, revA, ZI));
  assert.deepEqual(v, { cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, revine: true, pret: 72, stop: 64.22, tinta: 98.45 });
});
await test("(1) acțiune: sub 60 de bare ⇒ nimic; fără cădere ⇒ nu revine", () => {
  assert.equal(R().actiunePeRevenire(bare(59, revA, ZI)), null);
  assert.equal(R().actiunePeRevenire(bare(100, () => 100, ZI)).revine, false);
});
await test("(1) regulile sunt cele din spec (fixate)", () => {
  assert.deepEqual(R().REGULI.moneda, { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 });
  assert.deepEqual(R().REGULI.actiune, { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 });
});

console.log("\n" + (pica ? "V100.85 PICA · " + pica + " din " + (ok + pica) : "V100.85 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
