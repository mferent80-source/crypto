// Proba v100.34 (30.09, el: „fa idei” - ideea 2 din trei): UN SINGUR CSV pentru contabil - vanzarile Trading 212 (in lei, cum le da
// T212), dividendele si botii Pionex (USDT + ziua si cursul BNR + lei), pe anul ales; TOTAL pe fiecare sursa (nu unul general:
// actiunile, dividendele si crypto sunt categorii diferite la impozit). Excel romanesc: ; si virgula zecimala.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const T212 = new Function(`${lib("t212.js")}; return T212;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.34 · un singur CSV pentru contabil (T212 + Pionex) · proba\n");
const CURS = { "2026-09-29": 4.6568 };
// date INVENTATE, cu forma T212.perechi().inchise, a dividendelor T212 si a botilor din jurnal
const inchise = [
  { ticker: "AAPL_US_EQ", simbol: "AAPL", qty: 2, inchis: Date.parse("2026-03-02T15:00:00Z"), cost: 1000, incasat: 1100.5, rezultat: 95.25, comisioane: 5.25 },
  { ticker: "NVDA_US_EQ", simbol: "NVDA", qty: 1.5, inchis: Date.parse("2026-02-10T15:00:00Z"), cost: 700, incasat: 650, rezultat: -52.1, comisioane: 2.1 },
  { ticker: "OLD_US_EQ", simbol: "OLD", qty: 1, inchis: Date.parse("2025-05-10T15:00:00Z"), cost: 10, incasat: 11, rezultat: 1, comisioane: 0 },
];
const dividende = [{ ticker: "AAPL_US_EQ", amount: "4.5", paidOn: "2026-05-15T10:00:00Z" }, { ticker: "KO_US_EQ", amount: "1.25", paidOn: "2026-04-01T10:00:00Z" }];
const boti = [{ inchis: Date.parse("2026-09-29T10:00:00Z"), moneda: "LIGHTER", rezultat: -58.52, comisioane: -0.5, funding: -0.02 }];

await test("raportAnual tine si randurile T212: vanzarile (simbol, cantitate, cost, incasat, rezultat) si dividendele, doar din anul ales", () => {
  const r = T212.raportAnual({ inchise, dividende, boti, an: 2026, cursUsd: CURS });
  const v = r.t212.randuri.filter((x) => x.tip === "vânzare"), d = r.t212.randuri.filter((x) => x.tip === "dividend");
  assert.equal(v.length, 2); assert.equal(d.length, 2);
  const a = v.find((x) => x.instrument === "AAPL");
  assert.equal(a.zi, "2026-03-02"); assert.equal(a.cantitate, 2); assert.equal(a.cost, 1000); assert.equal(a.incasat, 1100.5); assert.equal(a.rezultat, 95.25);
  assert.equal(d.find((x) => x.instrument === "KO").rezultat, 1.25);
  assert.ok(Math.abs(v.reduce((s, x) => s + x.rezultat, 0) - r.t212.net) < 1e-9); assert.ok(Math.abs(d.reduce((s, x) => s + x.rezultat, 0) - r.t212.dividende) < 1e-9);
});

await test("csvDeclaratie: antet, vanzari T212 (cele mai vechi primele), dividende, Pionex cu cursul BNR, TOTAL pe fiecare sursa", () => {
  const c = T212.csvDeclaratie(T212.raportAnual({ inchise, dividende, boti, an: 2026, cursUsd: CURS }));
  const r = c.trim().split("\n");
  assert.equal(r[0], "sursa;tip;data;instrument;cantitate;cost_lei;incasat_lei;rezultat;moneda;ziua_cursului_bnr;curs_bnr_usd;rezultat_lei");
  // v100.40 (audit 30.09): costul din CSV SE LEAGA cu rezultatul (incasat − rezultat); inainte 700 + (−52,10) ≠ 650
  assert.match(r[1], /^Trading 212;vânzare;2026-02-10;NVDA;1,5;702,10;650,00;-52,10;lei;;;-52,10$/);
  assert.match(r[2], /^Trading 212;vânzare;2026-03-02;AAPL;2;1005,25;1100,50;95,25;lei;;;95,25$/);
  assert.match(r[3], /^Trading 212;dividend;2026-04-01;KO;;;;1,25;lei;;;1,25$/);
  assert.match(r[4], /^Trading 212;dividend;2026-05-15;AAPL;;;;4,50;lei;;;4,50$/);
  assert.match(r[5], /^Pionex;futures grid;2026-09-29;LIGHTER;;;;-59,04;USDT;2026-09-29;4,6568;-274,94$/);
  assert.match(r[6], /^TOTAL Trading 212 vânzări;;;;;;;43,15;lei;;;43,15$/);
  assert.match(r[7], /^TOTAL Trading 212 dividende;;;;;;;5,75;lei;;;5,75$/);
  assert.match(r[8], /^TOTAL Pionex;;;;;;;-59,04;USDT;;;-274,94$/);
  assert.equal(r.length, 9);
  assert.doesNotMatch(c, /\d\.\d/, "fara punct zecimal");
});

await test("vanzarile raman grupate inaintea dividendelor, chiar si cand un dividend e mai vechi decat vanzarile", () => {
  const d2 = dividende.concat([{ ticker: "MSFT_US_EQ", amount: "2", paidOn: "2026-01-15T10:00:00Z" }]);
  const r = T212.csvDeclaratie(T212.raportAnual({ inchise, dividende: d2, boti, an: 2026, cursUsd: CURS })).trim().split("\n").filter((l) => l.startsWith("Trading 212;"));
  const tipuri = r.map((l) => l.split(";")[1]);
  assert.deepEqual(tipuri, ["vânzare", "vânzare", "dividend", "dividend", "dividend"]);
  assert.match(r[2], /;2026-01-15;MSFT;/);
});

await test("fara cursuri: Pionex fara lei (gol, nu 0); fara boti sau fara T212: sectiunea lipsa, dar TOTAL-ul ei spune 0", () => {
  const c = T212.csvDeclaratie(T212.raportAnual({ inchise, dividende: [], boti, an: 2026 })).trim().split("\n");
  assert.match(c.find((l) => l.startsWith("Pionex;")), /;-59,04;USDT;;;$/);
  assert.match(c.find((l) => l.startsWith("TOTAL Pionex")), /;-59,04;USDT;;;$/);
  assert.match(c.find((l) => l.startsWith("TOTAL Trading 212 dividende")), /;0,00;lei;;;0,00$/);
});

await test("pagina: un singur buton „CSV pentru contabil (T212 + Pionex)” care descarca fisierul anului ales", () => {
  const t2 = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8");
  assert.match(t2, /data-action-click="t212CsvDeclaratie\(\)">⬇ CSV pentru contabil \(T212 \+ Pionex\)/);
  assert.doesNotMatch(t2, /data-action-click="t212CsvPionex\(\)"/, "nu doua butoane");
  const i = t2.indexOf("function t212CsvDeclaratie("), corp = t2.slice(i, t2.indexOf("\n}", i));
  assert.match(corp, /T212\.csvDeclaratie\(/); assert.match(corp, /new Blob/); assert.match(corp, /\\ufeff|﻿/); assert.match(corp, /declaratie-/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
