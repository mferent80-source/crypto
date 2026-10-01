// Proba v100.58 (01.10, el: „griduri înguste cu profit rapid pe coinuri sugerate pe direcție”).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.58 · Griduri înguste · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const M15 = 900000;
// oscilatie curata: perioada 2 h (8 bare), +-1 % in jurul lui 100 -> prețul străbate un interval îngust de multe ori
const osc = (zile, f) => Array.from({ length: zile * 96 }, (_, i) => { const c = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * i / 8)) * (f ? f(i) : 1), o = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * (i - 1) / 8)) * (f ? f(i - 1) : 1); return { t: i * M15, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c }; });
// tendinta in sus puternica, fara oscilatie
const sus = (zile) => Array.from({ length: zile * 96 }, (_, i) => { const o = 100 * 1.0015 ** i, c = 100 * 1.0015 ** (i + 1); return { t: i * M15, o, h: c * 1.0005, l: o * 0.9995, c }; });

await test("oscilatie curata in interval, neutru: gridul ingust e PROPUS, pe plus dupa comisioane, cu >= 30 ferestre independente pe test", () => {
  are(GP.ingust, "GridProba.ingust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 });
  assert.equal(r.propus, true, r.motiv);
  assert.ok(r.test.mediana > 0 && r.test.nIndep >= 30 && r.test.ic[0] > 0.5, JSON.stringify(r.test));
  assert.ok([6, 12, 24].includes(r.ore)); assert.ok(r.setare && r.setare.grile >= 2 && r.setare.pas >= 0.0029, JSON.stringify(r.setare));
  assert.ok(r.test.perechiZi > 0);
});
await test("contra tendintei (short pe urcare puternica): NEpropus, cu motiv", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100 });
  assert.equal(r.propus, false); assert.ok(r.motiv && r.motiv.length > 10, r.motiv);
});
await test("fara privit in viitor: schimbarea barelor de TEST nu schimba celula aleasa (H, latime, pas)", () => {
  const b = osc(40), nA = Math.round(b.length * 2 / 3), b2 = b.map((x, i) => i < nA ? x : { ...x, o: x.o * 1.3, h: x.h * 1.3, l: x.l * 1.3, c: x.c * 1.3 });
  const r1 = GP.ingust(b, { dir: "neutru", pret: 100, suma: 100 }), r2 = GP.ingust(b2, { dir: "neutru", pret: 100, suma: 100 });
  assert.deepEqual([r1.ore, r1.latime, r1.pas], [r2.ore, r2.latime, r2.pas]);
});
await test("ferestrele independente: la 12 h = jumatate din ferestrele de test (pornirile sunt la 6 h)", () => {
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100, doarH: [0.5] });
  assert.equal(r.ore, 12); assert.equal(r.test.nIndep, Math.floor(r.test.n * 24 / 48));
});
await test("miscare mare / fara directie / istoric scurt -> nepropus, fara eroare; setarea pe pretul de ACUM", () => {
  assert.match(GP.ingust(osc(40), { dir: "long", miscare: true, pret: 100 }).motiv, /mișcare/);
  assert.equal(GP.ingust(osc(40), { dir: null, pret: 100 }).propus, false);
  assert.match(GP.ingust(osc(5), { dir: "neutru", pret: 100 }).motiv, /prea puțin istoric/);
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 120, suma: 100 });
  assert.ok(r.setare.jos < 120 && r.setare.sus > 120, "construita pe pretul de acum");
});
await test("toate celulele lichidate (levier urias) -> nepropus cu motiv, nu crapa", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100, levier: 100 });
  assert.equal(r.propus, false); assert.ok(typeof r.motiv === "string");
});
await test("rezumatul pentru idei: directie, interval, linii N+1, durata, cifrele de pe test; nepropus -> motivul", () => {
  are(GP.rezumatIngust, "GridProba.rezumatIngust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 }), t = GP.rezumatIngust(r);
  assert.match(t, /neutru/i); assert.match(t, new RegExp((r.setare.grile + 1) + " linii")); assert.match(t, new RegExp(r.ore + " h")); assert.match(t, /pe plus/);
  assert.match(GP.rezumatIngust({ propus: false, motiv: "ceva anume" }), /ceva anume/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
