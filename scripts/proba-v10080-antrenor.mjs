// Proba v100.80 (antrenorul) - retea/antreneaza.mjs pe un dosar de date mic (2 monede + BTC, ~150 de zile): modelul de azi, lunile
// păstrate (a doua rulare le ia din cache), bugetul 0 nu atinge nimic, cheia schimbată reface lunile, ținta fără date nu strică restul.
//   node scripts/proba-v10080-antrenor.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "retea-proba-")), DATA = path.join(TMP, "data", "retea"), ORE = path.join(DATA, "ore");
fs.mkdirSync(ORE, { recursive: true });
const pionex = (l) => l.map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
const t0 = Date.UTC(2025, 5, 1);
fs.writeFileSync(path.join(ORE, "AAA_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 31, t0 }))));
fs.writeFileSync(path.join(ORE, "BBB_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 32, t0, p0: 5 }))));
fs.writeFileSync(path.join(ORE, "BTC_USDT_PERP.json"), JSON.stringify(pionex(bare(3600, { seed: 33, t0, p0: 60000 }))));
const ruleaza = (...a) => spawnSync(process.execPath, [path.join(RAD, "retea", "antreneaza.mjs"), "--rad", TMP, "--seminte", "1", "--max-randuri", "1500", ...a], { encoding: "utf8", timeout: 600000 });
const modele = () => JSON.parse(fs.readFileSync(path.join(DATA, "modele.json"), "utf8"));
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.80 (antrenorul) · modelele, lunile, bugetul");

await test("(6) prima rulare: modelul de azi (17 intrări, 1 sămânță) și lunile de verificare scrise; verificarea are forma citită de Retea.decide", () => {
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stdout + r.stderr);
  const m = modele().modele.directie;
  assert.equal(m.versiune, "r1"); assert.equal(m.norm.m.length, 17); assert.equal(m.ansamblu.length, 1);
  assert.ok(m.verificare && m.verificare.luni >= 2 && m.verificare.luniGata === m.verificare.luni, JSON.stringify(m.verificare));
  for (const k of ["nIndep", "brier", "brierReper", "brierLog", "ic", "icLog", "logloss", "loglossReper", "loglossLog", "reper"]) assert.ok(m.verificare[k] !== undefined, k);
  assert.ok(fs.existsSync(path.join(DATA, "luni-directie.json")));
});

await test("(6) a doua rulare ia lunile din cache (nu le reface)", () => {
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /directie: (\d+) luni din cache, 0 noi/, r.stdout);
});

await test("(6) bugetul 0 nu atinge nimic (modelele de ieri rămân)", () => {
  const inainte = fs.statSync(path.join(DATA, "modele.json")).mtimeMs, r = ruleaza("--tinta", "directie", "--buget-min", "0");
  assert.equal(r.status, 0); assert.match(r.stdout, /buget 0/); assert.equal(fs.statSync(path.join(DATA, "modele.json")).mtimeMs, inainte);
});

await test("(6) cheia schimbată (altă versiune a trăsăturilor / a rețelei) reface lunile", () => {
  const f = path.join(DATA, "luni-directie.json"), c = JSON.parse(fs.readFileSync(f, "utf8")); c.cheie = "alta"; fs.writeFileSync(f, JSON.stringify(c));
  const r = ruleaza("--tinta", "directie"); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /directie: 0 luni din cache, \d+ noi/, r.stdout);
});

await test("(6) ținta fără date (rezultatul tău fără boti.json) nu face model și nu șterge modelul altei ținte", () => {
  const r = ruleaza("--tinta", "rezultat"); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /rezultat: prea puține rânduri \(0\)/); assert.ok(modele().modele.directie, "modelul directie a dispărut");
});

fs.rmSync(TMP, { recursive: true, force: true });
console.log("\n" + (pica ? "V100.80 ANTRENOR PICA · " + pica + " din " + (ok + pica) : "V100.80 ANTRENOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
