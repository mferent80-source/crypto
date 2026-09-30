// Proba v100.31 (30.09, el: „fa 1/2/3” - ideea 2): CSV pentru contabil - fiecare bot Pionex inchis in anul ales: data inchiderii
// (ora Romaniei), moneda, felul botului, rezultatul net in USDT, ziua si cursul BNR folosit, rezultatul in lei; rand de TOTAL.
// Excel romanesc: separator ; si zecimale cu virgula.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const T212 = new Function(`${lib("t212.js")}; return T212;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.31 · CSV Pionex pentru contabil · proba\n");
const CURS = { "2025-12-31": 4.3417, "2026-09-25": 4.62, "2026-09-29": 4.6568 };
const boti = [
  { inchis: Date.parse("2026-09-29T10:00:00Z"), moneda: "LIGHTER", rezultat: -58.52, comisioane: -0.5, funding: -0.02 },
  { inchis: Date.parse("2026-09-27T12:00:00Z"), moneda: "BTC", tip: "spot grid", rezultat: 3.5, comisioane: null, funding: null },
  { inchis: Date.parse("2026-01-02T12:00:00Z"), moneda: "SOLANA", tip: "smart copy", rezultat: -1.98 },
  { inchis: Date.parse("2025-06-01T12:00:00Z"), moneda: "ALT", rezultat: 9 },
];

await test("raportAnual tine randurile Pionex: zi (ora RO), moneda, fel, net, ziua cursului folosit (weekend -> vineri), cursul, lei", () => {
  const r = T212.raportAnual({ boti, an: 2026, cursUsd: CURS });
  const l = r.pionex.randuri;
  assert.equal(l.length, 3, "doar anul ales");
  const lig = l.find((x) => x.moneda === "LIGHTER"), btc = l.find((x) => x.moneda === "BTC"), sol = l.find((x) => x.moneda === "SOLANA");
  assert.equal(lig.tip, "futures grid"); assert.equal(btc.tip, "spot grid"); assert.equal(sol.tip, "smart copy");
  assert.equal(lig.zi, "2026-09-29"); assert.equal(lig.ziCurs, "2026-09-29"); assert.ok(Math.abs(lig.net - (-59.04)) < 1e-9); assert.ok(Math.abs(lig.lei - (-59.04 * 4.6568)) < 1e-9);
  assert.equal(btc.zi, "2026-09-27"); assert.equal(btc.ziCurs, "2026-09-25"); assert.equal(btc.curs, 4.62);
  assert.equal(sol.ziCurs, "2025-12-31");
  assert.ok(Math.abs(l.reduce((a, x) => a + x.lei, 0) - r.pionex.lei) < 1e-9, "randurile dau totalul");
});

await test("csvPionex: antet, un rand pe bot (cel mai vechi primul), ; si virgula zecimala, rand de TOTAL", () => {
  const c = T212.csvPionex(T212.raportAnual({ boti, an: 2026, cursUsd: CURS }));
  const r = c.trim().split("\n");
  assert.equal(r[0], "data_inchiderii;moneda;tip;rezultat_usdt;ziua_cursului_bnr;curs_bnr_usd;rezultat_lei");
  assert.equal(r.length, 5);
  assert.match(r[1], /^2026-01-02;SOLANA;smart copy;-1,98;2025-12-31;4,3417;-8,6/);
  assert.match(r[3], /^2026-09-29;LIGHTER;futures grid;-59,04;2026-09-29;4,6568;-274,9/);
  assert.match(r[4], /^TOTAL;;;-57,52;;;-/);
  assert.doesNotMatch(c, /\d\.\d/, "fara punct zecimal");
});

await test("csvPionex fara cursuri: coloanele de curs si lei goale (nu 0), totalul in lei gol", () => {
  const c = T212.csvPionex(T212.raportAnual({ boti, an: 2026 }));
  const r = c.trim().split("\n");
  assert.match(r[3], /^2026-09-29;LIGHTER;futures grid;-59,04;;;$/);
  assert.match(r[4], /^TOTAL;;;-57,52;;;$/);
});

await test("pagina: butonul din Declaratie descarca CSV-ul anului ales (cu BOM pentru Excel)", () => {
  const t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
  // v100.34: butonul doar-Pionex a fost inlocuit de CSV-ul comun (T212 + Pionex) - randurile Pionex sunt aceleasi (probate in v10034)
  assert.match(t2, /data-action-click="t212CsvDeclaratie\(\)"/);
  const i = t2.indexOf("function t212CsvDeclaratie("), corp = t2.slice(i, t2.indexOf("\n}", i));
  assert.match(corp, /T212\.csvDeclaratie\(/); assert.match(corp, /new Blob/); assert.match(corp, /\\ufeff|﻿/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
