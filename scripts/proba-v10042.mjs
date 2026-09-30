// Proba v100.42 (30.09, el: „fă 2 și 4” din ce rămăsese dupa audit):
// (2) worker-ul paznic: cheia de CITIRE a paginii alerts scria lista de simboluri fara nicio limita (o cota KV golita = paznicul tipa
//     pe Discord la 10 minute) si cheile se comparau cu === (timpul spune cat din cheie e ghicit). Acum: comparare in timp constant,
//     lista identica = nicio scriere, cel mult o scriere la 5 s si 200 pe zi, corp de cel mult 16 KB.
// (4) cele 22 de scripturi v54–v57 nechemate de npm test (3 crapau) - sterse; testele de comportament pentru research-worker.js
//     (cod inca viu) raman.
// WORKER=<fisier> ruleaza proba pe alt worker (cel vechi scos din git) - asa s-a vazut picand.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const W = process.env.WORKER || path.join(RAD, "paznic", "worker.mjs");
const mod = await import(pathToFileURL(W).href), paznic = mod.default, { simboluriScrie } = mod;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.42 · worker-ul paznic (cheile in timp constant, lista cu limite) + scripturile moarte scoase · proba\n");

const TOK = "t".repeat(32), CHEIE = "c".repeat(32);
function lume() {
  const kv = new Map(); let puneri = 0;
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { puneri++; kv.set(k, v); } }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CHEIE, DISCORD_WEBHOOK: "" };
  const cere = (cale, m, h = {}, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: h, body: corp }), env);
  return { env, kv, cere, puneri: () => puneri };
}
const L = (...s) => JSON.stringify({ simboluri: s.map((x) => ({ s: x })) });

await test("cheile: in timp constant (fara === pe secret); cheia buna trece, una de aceeasi lungime cu alt ultim caracter nu", async () => {
  const src = fs.readFileSync(W, "utf8");
  assert.match(src, /function egalConstant\(a, b\)/);
  assert.doesNotMatch(src, /request\.headers\.get\("authorization"\) === "Bearer " \+ s/);
  const w = lume();
  assert.equal((await w.cere("/simboluri", "GET", { authorization: "Bearer " + TOK })).status, 200);
  assert.equal((await w.cere("/simboluri", "GET", { authorization: "Bearer " + TOK.slice(0, -1) + "x" })).status, 401);
  assert.equal((await w.cere("/simboluri", "GET", { authorization: "Bearer " + TOK + "t" })).status, 401);
});

await test("lista IDENTICA nu mai scrie in KV (pagina o poate retrimite oricat)", async () => {
  const w = lume(), t0 = Date.UTC(2026, 8, 30, 10);
  assert.equal((await simboluriScrie(w.env, L("AVGO", "INTC"), t0)).status, 200); assert.equal(w.puneri(), 1);
  const r = await simboluriScrie(w.env, L("AVGO", "INTC"), t0 + 1000);
  assert.equal(r.status, 200); assert.equal(r.corp.neschimbat, true); assert.equal(w.puneri(), 1, "nicio scriere in plus");
});

await test("cel mult o scriere la 5 s: a doua schimbare imediata -> 429, peste 5 s trece", async () => {
  const w = lume(), t0 = Date.UTC(2026, 8, 30, 10);
  await simboluriScrie(w.env, L("A"), t0);
  assert.equal((await simboluriScrie(w.env, L("B"), t0 + 2000)).status, 429);
  assert.equal((await simboluriScrie(w.env, L("B"), t0 + 6000)).status, 200);
});

await test("cel mult 200 de schimbari pe zi; a doua zi se poate din nou", async () => {
  const w = lume(), t0 = Date.UTC(2026, 8, 30, 0, 1);
  for (let i = 0; i < 200; i++) assert.equal((await simboluriScrie(w.env, L("S" + i), t0 + i * 6000)).status, 200, "schimbarea " + i);
  const r = await simboluriScrie(w.env, L("X"), t0 + 201 * 6000);
  assert.equal(r.status, 429); assert.match(r.corp.error, /200/);
  assert.equal((await simboluriScrie(w.env, L("Y"), Date.UTC(2026, 9, 1, 0, 5))).status, 200, "ziua noua");
  assert.ok(w.puneri() <= 201);
});

await test("corpul peste 16 KB -> 413, nimic scris; ruta HTTP cu cheia de citire aplica aceleasi limite", async () => {
  const w = lume();
  assert.equal((await simboluriScrie(w.env, JSON.stringify({ simboluri: [{ s: "A", nota: "x".repeat(17000) }] }), Date.now())).status, 413); assert.equal(w.puneri(), 0);
  assert.equal((await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, L("A"))).status, 200);
  assert.equal((await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, L("B"))).status, 429);
});

await test("(4) scripturile v54–v57 nechemate de npm test sunt scoase; testele lui research-worker.js raman in npm test", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(RAD, "package.json"), "utf8")), toate = Object.values(pkg.scripts).join(" ");
  const ramase = fs.readdirSync(path.join(RAD, "scripts")).filter((f) => /-v5[4-7]\.mjs$/.test(f) && !toate.includes(f));
  assert.deepEqual(ramase, [], "nechemate: " + ramase.join(", "));
  assert.ok(/research-worker/.test(fs.readFileSync(path.join(RAD, "scripts", "proba-research-worker.mjs"), "utf8")), "proba research-worker");
  assert.match(toate, /proba-research-worker\.mjs/);
});

console.log(`\nV100.42 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
