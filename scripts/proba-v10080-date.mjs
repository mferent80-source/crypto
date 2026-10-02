// Proba v100.80 (date) - rețeaua neuronală, livrarea 1: retea/date.mjs - rândurile pe țintă: trăsăturile = Retea.trasaturiBare la i,
// etichetele DOAR din barele de după t (în orizont), fereastra cu gaură nu dă rând, reperul 🎲 = Probabilitati.frecventa pe barele
// de până la t, „rezultatul tău” fără boții închiși după pornire.
//   node scripts/proba-v10080-date.mjs
import "./lib/text-ro-global.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const D = await import(pathToFileURL(path.join(RAD, "retea", "date.mjs")).href);
const M = D.incarcaModulele(RAD), { P, R } = M, ORA = 3600000;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.80 (date) · rândurile, etichetele, reperul 🎲");
const b = bare(1400, { seed: 21 }), btc = bare(1400, { seed: 22, p0: 60000 });

await test("(3) rândurile atinge-24: la fiecare 4 h de la bara 720, trăsăturile = Retea.trasaturiBare(b, i), tEt = t + 24 h", () => {
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, {});
  assert.ok(r.length > 100, String(r.length));
  for (const x of r.slice(0, 20)) {
    assert.equal(x.i % 4, 0); assert.ok(x.i >= 720);
    assert.deepEqual(x.x, R.intrare("atinge-24", R.trasaturiBare(b, x.i, btc), x.e));
    assert.equal(x.tEt, x.t + 24 * ORA); assert.equal(x.t, b[x.i].t + ORA);
  }
});

await test("(3) eticheta vine DOAR din barele i+1..i+H: barele de după fereastră nu o schimbă; o bară din fereastră care atinge nivelul o face 1", () => {
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, {}), x = r.find((q) => q.e.rel < 0 && q.y === 0 && q.i + 60 < b.length);
  assert.ok(x, "niciun rând neatins");
  const b2 = b.map((q) => ({ ...q })); for (let k = x.i + 25; k < b2.length; k++) b2[k].l = b2[k].l * 0.5;   // după fereastră: prăbușire
  assert.equal(D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b2, btc, M, {}).find((q) => q.i === x.i).y, 0);
  const b3 = b.map((q) => ({ ...q })); b3[x.i + 24].l = b3[x.i].c * (1 + x.e.rel) * 0.999;               // ultima bară din fereastră
  assert.equal(D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b3, btc, M, {}).find((q) => q.i === x.i).y, 1);
});

await test("(3) fereastra cu gaură (o oră lipsă) nu dă rând - ca la 🎲", () => {
  const cuGaura = b.slice(0, 1000).concat(b.slice(1001));
  const r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", cuGaura, btc, M, {});
  assert.ok(!r.some((q) => q.i < 1000 && q.i + 24 >= 1000), "un rând traversează gaura");
});

await test("(3) cursa, liniștea, direcția: etichetele lor (ținta întâi; starea la i+h; închiderea de peste 24 h mai sus)", () => {
  const memo = {};
  for (const x of D.randuriMoneda("cursa", "AAA_USDT_PERP", b, btc, M, memo).slice(0, 30)) assert.equal(x.y, P.cursa(x.e.relT, x.e.relS)(b, x.i, 168) === "tinta" ? 1 : 0);
  const lin = D.randuriMoneda("liniste", "AAA_USDT_PERP", b, btc, M, memo);
  for (const x of lin.slice(0, 30)) { assert.ok(P.stareLa(b, x.i).indexOf("liniste") === 0); assert.equal(x.y, P.stareLa(b, x.i + x.e.H).indexOf("liniste") === 0 ? 1 : 0); assert.equal(x.tEt, x.t + x.e.H * ORA); }
  for (const x of D.randuriMoneda("directie", "AAA_USDT_PERP", b, btc, M, memo).slice(0, 30)) assert.equal(x.y, b[x.i + 24].c > b[x.i].c ? 1 : 0);
});

await test("(3) reperul 🎲 al unui rând = Probabilitati.frecventa pe barele de până la t (felia), nu pe toate", () => {
  const memo = {}, r = D.randuriMoneda("atinge-24", "AAA_USDT_PERP", b, btc, M, memo).filter((q) => q.i > 1000)[0];
  const asteptat = P.frecventa(b.slice(0, r.i + 1), 24, P.atinge(r.e.rel), "da", P.stareLa(b, r.i), {});
  assert.equal(D.reperRand("atinge-24", b, r, M, memo), asteptat.p);
  assert.equal(D.reperRand("atinge-24", b.concat(bare(200, { seed: 99, t0: b[b.length - 1].t + ORA, p0: 1 })), r, M, {}), asteptat.p, "barele de după t au schimbat reperul");
});

await test("(3) rezultatul tău: rândul la pornire, y = net > 0, tEt = închiderea; rata ta nu vede boții închiși după pornire", () => {
  const t0 = b[900].t + ORA + 600000, bot = (o) => ({ moneda: "AAA", simbol: "AAA_USDT_PERP", dir: "long", levier: 3, jos: 95, sus: 105, pasNet: 0.003, pus: 40, ...o });
  const boti = [bot({ pornit: t0, inchis: t0 + 5 * ORA, net: 1.2 }), bot({ pornit: t0 + 2 * ORA, inchis: t0 + 30 * ORA, net: -2 }), bot({ pornit: t0 + 40 * ORA, inchis: t0 + 50 * ORA, net: 0.5 })];
  const r = D.randuriBoti(boti, () => b, btc, M);
  assert.equal(r.length, 3); assert.deepEqual(r.map((x) => x.y), [1, 0, 1]); assert.deepEqual(r.map((x) => x.tEt), boti.map((x) => x.inchis));
  assert.equal(r[1].r1, 0.5, "al doilea pornește înainte să se închidă primul: nicio rată știută -> 0,5");
  assert.equal(r[2].r1, 0.5, "al treilea: unul pe plus, unul pe minus închiși înainte");
});

console.log("\n" + (pica ? "V100.80 DATE PICA · " + pica + " din " + (ok + pica) : "V100.80 DATE PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
