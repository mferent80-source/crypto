// Proba v100.35 (30.09, el: „fa idei” - ideea 3 din trei): in statistica, „Dacă țineai măcar o oră” - comparatie CINSTITA intre trade-urile
// inchise in prima ora si cele tinute peste o ora, in AMBELE sensuri (simetria): daca ținerea a mers mai bine, cat ar fi insemnat (cu
// „comparație, nu dovadă”); daca NU (cazul lui pe toata istoria: −1,40/trade sub o ora, dar peste o zi −20…−25), o spune si arata de unde
// vine costul inchiderilor repezi (comisioanele) si fereastra cea mai buna. Doar de la 10 trade-uri in fiecare grupa.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.35 · „Dacă țineai măcar o oră” · proba\n");
const T0 = Date.UTC(2026, 5, 1), H = 3600000;
let k = 0;
const tr = (nr, rez, ore, com) => Array.from({ length: nr }, () => { k++; return { id: "t" + k, eticheta: "A", pornit: T0 + k * H, inchis: T0 + k * H + ore * H, rezultat: rez, baza: 100, durataOre: ore, comisioane: com }; });

await test("tinerea a mers mai bine: cat ar fi insemnat pentru cei din prima ora, cu „comparație, nu dovadă”", () => {
  const s = ST.calc(tr(12, -1, 0.5, 0.8).concat(tr(12, 2, 3, 0.3)), { moneda: "USDT" });
  const p = s.primaOra;
  assert.ok(p, "blocul exista"); assert.equal(p.sub.n, 12); assert.equal(p.peste.n, 12);
  assert.ok(Math.abs(p.sub.medie - (-1)) < 1e-9); assert.ok(Math.abs(p.peste.medie - 2) < 1e-9); assert.ok(Math.abs(p.sub.comisioane - 9.6) < 1e-9);
  assert.equal(p.maiBine, true); assert.ok(Math.abs(p.diferenta - 36) < 1e-9);
  assert.match(p.text, /≈ \+36,00 USDT/); assert.match(p.text, /comparație, nu o dovadă/);
});

await test("tinerea NU a mers mai bine (cazul lui): o spune, arata comisioanele inchiderilor repezi si fereastra cea mai buna", () => {
  const l = tr(20, -1.4, 0.5, 1.1).concat(tr(15, -0.8, 3, 0.4)).concat(tr(12, -20, 40, 1)).concat(tr(10, -25, 100, 1));
  const s = ST.calc(l, { moneda: "USDT" }), p = s.primaOra;
  assert.equal(p.maiBine, false); assert.equal(p.diferenta, null);
  assert.match(p.text, /Ținerea mai lungă NU a mers mai bine în medie/);
  assert.match(p.text, /comisioane −22,00 USDT din −28,00 USDT/);
  assert.match(p.text, /Cea mai bună fereastră: 1–6 ore/);
});

await test("sub 10 trade-uri intr-o grupa -> fara bloc (sub 10 nu se trag concluzii)", () => {
  assert.equal(ST.calc(tr(9, -1, 0.5, 0.8).concat(tr(20, 2, 3, 0.3)), { moneda: "USDT" }).primaOra, null);
  assert.equal(ST.calc(tr(20, -1, 0.5, 0.8).concat(tr(9, 2, 3, 0.3)), { moneda: "USDT" }).primaOra, null);
});

await test("html: blocul „Dacă țineai măcar o oră” cu tabelul celor doua grupe si textul; lipseste cand nu sunt destule", () => {
  const s = ST.calc(tr(12, -1, 0.5, 0.8).concat(tr(12, 2, 3, 0.3)), { moneda: "USDT" }), h = ST.html(s, { titlu: "x", piata: "crypto" });
  assert.match(h, /<h4>Dacă țineai măcar o oră<\/h4>/); assert.match(h, /Închise în prima oră/); assert.match(h, /Ținute peste o oră/);
  assert.doesNotMatch(ST.html(ST.calc(tr(5, -1, 0.5, 0.8), { moneda: "USDT" }), { titlu: "x" }), /Dacă țineai măcar o oră/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
