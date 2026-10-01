// Proba v100.55 (01.10, el: actiunile T212 - pachetul 4: intrarea - poarta si ideile,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-4-intrarea.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.55 · Actiunile T212: intrarea (poarta si ideile) · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const Z = 864e5;

// ---- pasul 1: cheia starii si „in situatii ca asta” ----
const stSus = { trend: { dir: "sus", tarie: "puternic" }, miscare: { mare: false }, distMax7z: -0.05 };
await test("cheia starii: trend|miscare|maxim; fara date -> null", () => {
  are(AS.cheieSituatie, "ActiuniSemnale.cheieSituatie");
  assert.equal(AS.cheieSituatie(stSus), "sus|calm|departe");
  assert.equal(AS.cheieSituatie({ trend: { dir: "lateral" }, miscare: { mare: true }, distMax7z: -0.01 }), "lateral|dupa-miscare|langa-max");
  assert.equal(AS.cheieSituatie({ trend: { dir: "fara-date" } }), null);
  assert.equal(AS.cheieSituatie(null), null);
});
await test("laCumparare intoarce mereu sit (null la fara-date)", () => {
  const t = { ticker: "INTC_US_EQ", pornit: 200 * Z, pretCumparare: 100 };
  assert.ok("sit" in AS.laCumparare(t, [], []));
  assert.equal(AS.laCumparare(t, [], []).sit, null);
  const bare = Array.from({ length: 199 }, (_, i) => ({ t: i * Z, o: 50 + i * 0.25, h: 51 + i * 0.25, l: 49 + i * 0.25, c: 50 + i * 0.25 }));
  const r = AS.laCumparare({ ...t, pretCumparare: bare[198].c }, bare, []);
  assert.match(String(r.sit), /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/, JSON.stringify(r));
});
await test("situatiiCaAsta: doar aceeasi stare, median/pe plus/cel mai rau pe % din cost; costul 0 si cf vechi (fara sit) sar; sub 10 -> putine", () => {
  are(AS.situatiiCaAsta, "ActiuniSemnale.situatiiCaAsta");
  const inch = [], cf = {};
  for (let i = 0; i < 12; i++) { const id = "a" + i; inch.push({ id, ticker: i < 3 ? "INTC_US_EQ" : "AMD_US_EQ", cost: 1000, rezultat: i < 8 ? 50 : -100 }); cf[id] = { sit: "sus|calm|departe" }; }
  inch.push({ id: "alt", ticker: "AMD_US_EQ", cost: 1000, rezultat: -900 }); cf.alt = { sit: "jos|calm|departe" };
  inch.push({ id: "vechi", ticker: "AMD_US_EQ", cost: 1000, rezultat: -800 }); cf.vechi = { nivel: "cumpara" };
  inch.push({ id: "zero", ticker: "AMD_US_EQ", cost: 0, rezultat: -500 }); cf.zero = { sit: "sus|calm|departe" };
  const r = AS.situatiiCaAsta(inch, cf, "sus|calm|departe", "INTC_US_EQ");
  assert.equal(r.toate.n, 12); assert.equal(r.toate.putine, false);
  assert.equal(r.toate.median, 0.05); assert.equal(Math.round(r.toate.pePlus * 100), 67);
  assert.deepEqual(r.toate.celMaiRau, { pct: -0.1, lei: -100 }); assert.equal(r.toate.total, 8 * 50 - 4 * 100);
  assert.equal(r.actiune.n, 3); assert.equal(r.actiune.putine, true);
  const tx = AS.textSituatie(r);
  assert.match(tx, /12 cazuri/); assert.match(tx, /median \+5,0%/); assert.match(tx, /67% pe plus/); assert.match(tx, /cel mai rău −10,0%/);
  assert.match(tx, /INTC.*3.*prea puține/); assert.ok(!/sector/.test(tx), "nu pomeni sectorul: n-avem date");
});
await test("situatiiCaAsta: nicio potrivire / fara sit -> n 0 si text care o spune", () => {
  const r = AS.situatiiCaAsta([], {}, "sus|calm|departe", null);
  assert.equal(r.toate.n, 0); assert.equal(r.actiune, null);
  assert.match(AS.textSituatie(r), /niciun trade/);
  assert.equal(AS.situatiiCaAsta([], {}, null).toate.n, 0);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
