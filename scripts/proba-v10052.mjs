// Proba v100.52 (01.10, el: actiunile T212 - „adaptat… partea de sfaturi, probabilități, măsurători”; pachetul 1: profilul actiunii,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-1-profilul-actiunii.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.52 · Actiunile T212: profilul actiunii · proba\n");

// ---- pasul 1: adaptorul pentru actiuni ----
await test("profilul actiunii: 1 si 5 zile de bursa, saritura separat, evenimentele scoase din distributii", () => {
  const bare = []; let c = 100;
  for (let i = 0; i < 300; i++) { const gap = i === 150 ? 0.82 : i % 40 === 0 ? 0.97 : 1; const o = c * gap, h = o * 1.012, l = o * 0.985; c = o * (1 + 0.004 * Math.sin(i)); bare.push({ t: Date.UTC(2025, 0, 1) + i * 864e5, o, h, l, c }); }
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "INTC_US_EQ", acum: bare[299].t + 864e5 });
  assert.ok(p, "lipseste profilul"); assert.equal(p.piata, "actiuni"); assert.equal(p.z1.jos.length, 21); assert.equal(p.z5.jos.length, 21); assert.ok(p.z5.nIndep >= 50, String(p.z5.nIndep));
  assert.ok(p.evenimente.n >= 1 && p.evenimente.max >= 0.17, JSON.stringify(p.evenimente)); assert.ok(p.z1.jos[20] < 0.1, "saritura de 18% nu intra in ziua obisnuita: " + p.z1.jos[20]);
  assert.ok(p.sar.jos[20] >= 0.02 && p.sar.n > 200, JSON.stringify(p.sar.jos.slice(-3)) + " n=" + p.sar.n);
  const s = PM.pragStopActiune(p); assert.ok(s && s.dist > 0 && s.dist < 0.1, JSON.stringify(s)); assert.match(s.sursa, /INTC.*zile de bursă/);
  assert.equal(PM.calculeaza(bare.slice(0, 100), { piata: "actiuni" }), null, "sub 120 de zile");
});
await test("crypto neschimbat: fara piata -> forma de azi (z24/z12, fara z5)", () => {
  const b = Array.from({ length: 24 * 40 }, (_, i) => ({ t: i * 36e5, o: 1, h: 1.01, l: 0.99, c: 1 }));
  const p = PM.calculeaza(b, { simbol: "CRV_USDT_PERP", acum: 24 * 41 * 36e5 }); assert.ok(p && p.z24 && p.z12 && !p.z5 && !p.piata);
});
await test("split (|saritura| > 40%) nu intra in nicio distributie", () => {
  const bare = Array.from({ length: 200 }, (_, i) => { const k = i < 100 ? 1 : 0.5; return { t: i * 864e5, o: 100 * k, h: 101 * k, l: 99 * k, c: 100 * k }; });
  const p = PM.calculeaza(bare, { piata: "actiuni", simbol: "X_US_EQ", acum: 201 * 864e5 }); assert.ok(p && p.sar.jos[20] < 0.4 && p.z5.jos[20] < 0.4, p ? JSON.stringify(p.sar.jos.slice(-2)) : "null");
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
