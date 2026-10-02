// Proba v100.80 (verificarea) - rețeaua neuronală, livrarea 1: retea/verifica.mjs - măsurile pe cifre știute, bootstrap-ul pe două trepte
// (mai larg când monedele se mișcă împreună într-o lună), blocurile independente, lunile de test, pauza cât orizontul, normalizarea
// doar din antrenare, judecarea unei luni cu un antrenor fals, reperul cel mai greu.
//   node scripts/proba-v10080-verifica.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V = await import(pathToFileURL(path.join(RAD, "retea", "verifica.mjs")).href);
const ORA = 3600000, ZI = 864e5;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const aprox = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " ≠ " + b);
console.log("Proba v100.80 (verificarea) · măsurile, bootstrap-ul, lunile, pauza");

await test("(4) Brier, log-loss și scorul față de reper pe cifre știute", () => {
  const l = [{ y: 1, p: 0.8, r1: 0.5 }, { y: 0, p: 0.3, r1: 0.5 }];
  aprox(V.brier(l, "p"), (0.04 + 0.09) / 2); aprox(V.brier(l, "r1"), 0.25);
  aprox(V.bss(l, "p", "r1"), 1 - 0.065 / 0.25); aprox(V.logloss(l, "p"), -(Math.log(0.8) + Math.log(0.7)) / 2);
  assert.equal(V.brier([], "p"), null);
});

await test("(4) bootstrap pe două trepte: același rezultat la aceeași sămânță; mai larg decât pe rânduri când toate monedele dintr-o lună merg la fel", () => {
  const l = [];
  for (let m = 0; m < 6; m++) for (let c = 0; c < 10; c++) for (let k = 0; k < 28; k++) { const bun = m % 2 === 0, y = (m * 7 + c * 3 + k) % 3 === 0 ? 1 : 0; l.push({ t: Date.UTC(2026, m, 1 + k), s: "M" + c, y, p: bun ? (y ? 0.8 : 0.2) : (y ? 0.1 : 0.9), r1: 0.4 }); }
  const a = V.bootstrap2(l, "p", "r1", 500, 3), b = V.bootstrap2(l, "p", "r1", 500, 3);
  assert.deepEqual(a, b);
  const r = (() => { let s = 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(), v = [];
  for (let q = 0; q < 500; q++) { let x = 0, y = 0; for (let z = 0; z < l.length; z++) { const w = l[Math.floor(r() * l.length)]; x += (w.p - w.y) ** 2; y += (w.r1 - w.y) ** 2; } v.push(1 - x / y); }
  v.sort((x, y) => x - y); const lat1 = v[487] - v[12], lat2 = a[1] - a[0];
  assert.ok(lat2 > 3 * lat1, "două trepte " + lat2.toFixed(3) + " vs rânduri " + lat1.toFixed(3));
});

await test("(4) blocurile independente: zilele distincte la 24 h; la 72 h se strâng", () => {
  const l = [0, 5, 30, 50].map((h) => ({ t: Date.UTC(2026, 0, 4) + h * ORA }));
  assert.equal(V.blocuri(l, 24), 3); assert.ok(V.blocuri(l, 72) <= 2);
});

await test("(4) lunile de test: după 60 de zile de istorie, doar lunile întregi încheiate; boții așteaptă 30 de zile după sfârșitul lunii", () => {
  const R = []; for (let t = Date.UTC(2025, 8, 15); t < Date.UTC(2026, 2, 10); t += ZI) R.push({ t, tEt: t + ZI });
  assert.deepEqual(V.luniDeTest(R, { minZile: 60, acum: Date.UTC(2026, 2, 20) }), ["2025-12", "2026-01", "2026-02"]);
  // boții: cu 3 cazuri știute, prima lună bună e octombrie; februarie cade (1 martie + 30 de zile trece de 20 martie)
  assert.deepEqual(V.luniDeTest(R, { minCazuri: 3, asteaptaZile: 30, acum: Date.UTC(2026, 2, 20) }), ["2025-10", "2025-11", "2025-12", "2026-01"]);
});

await test("(4) pauza cât orizontul: un rând de antrenare cu eticheta știută DUPĂ începutul lunii nu intră nici la antrenare, nici la test", () => {
  const start = Date.UTC(2025, 11, 1), R = [{ t: start - 2 * ORA, tEt: start + 22 * ORA, x: [1] }, { t: start - 30 * ORA, tEt: start - 6 * ORA, x: [2] }, { t: start + ORA, tEt: start + 25 * ORA, x: [3] }];
  const { antrenare, test } = V.impartire(R, "2025-12");
  assert.deepEqual(antrenare.map((r) => r.x[0]), [2]); assert.deepEqual(test.map((r) => r.x[0]), [3]);
});

await test("(4) normalizarea doar din antrenare; judecaLuna: 5 rețele + formula simplă (fără strat ascuns), aceleași cazuri pentru amândouă", async () => {
  const R = []; for (let d = 0; d < 120; d++) R.push({ t: Date.UTC(2025, 8, 1) + d * ZI, s: "A", tEt: Date.UTC(2025, 8, 1) + (d + 1) * ZI, y: d % 2, x: [d % 5, 1], r1: 0.5 });
  R[R.length - 1].x = [1e9, 1];   // o valoare uriașă în test
  const apeluri = [], o = { seminte: 5, maxRanduri: 1000, versiune: "r1", prezice: () => 0.5, antreneaza: async (X, y, nIn, asc, seed) => { apeluri.push({ asc, seed, nIn, max: Math.max(...X) }); return { straturi: [{ W: [[0], [0]], b: [0], act: "sigmoid" }] }; } };
  const { antrenare } = V.impartire(R, "2025-12"), a = await V.antreneazaAnsamblu(antrenare, o, true);
  assert.deepEqual(a.norm, V.normalizare(V.esantion(antrenare, 1000, 11)));
  assert.ok(a.norm.m[0] < 5, "media a văzut testul: " + a.norm.m[0]);
  apeluri.length = 0;
  const rows = await V.judecaLuna(R, "2025-12", o);
  assert.equal(apeluri.filter((c) => c.asc.length === 2).length, 5); assert.equal(apeluri.filter((c) => c.asc.length === 0).length, 1);
  assert.ok(rows.length > 20 && rows.every((r) => r.p === 0.5 && r.pLog === 0.5 && r.r1 === 0.5));
});

await test("(4) verificarea: ia reperul cel mai greu (Brier mai mic), scorul pe ultimele 3 luni, cazurile independente pe blocuri", () => {
  const l = []; for (let m = 0; m < 6; m++) for (let d = 0; d < 20; d++) { const y = (m + d) % 2; l.push({ t: Date.UTC(2026, m, 1 + d), s: "A", y, p: y ? 0.7 : 0.3, pLog: y ? 0.6 : 0.4, r1: 0.5, r2: y ? 0.65 : 0.35 }); }
  const v = V.verificare(l, { oreBloc: 24, numeReper: ["rata ta", "rata pe monedă"], luni: 6, luniGata: 6 });
  assert.equal(v.reper, "rata pe monedă"); assert.equal(v.nIndep, 120); assert.equal(v.n, 120);
  assert.ok(v.ic[0] > 0 && v.icLog[0] > 0 && v.bss3 > 0, JSON.stringify(v));
  assert.equal(V.verificare(l, { oreBloc: 24, numeReper: ["🎲"], luni: 6, luniGata: 6 }).reper, "🎲");
});

console.log("\n" + (pica ? "V100.80 VER PICA · " + pica + " din " + (ok + pica) : "V100.80 VER PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
