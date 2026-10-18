// Proba v100.209 (16.10.2026): proba de ecran NU mai bate în Pionex. Azi două livrări cu câte 55 de pagini au ars cota Pionex și
// IP-ul a stat blocat 3 ore (X-RateLimit-Lock) — măsurarea Busolei a rămas fără futures. Proba pune antetul `x-proba-ecran: 1`
// (CDP, pe toate cererile), middleware-ul aprinde steagul cât ține cererea, învelișul nu mai cheamă Pionex (503, spus pe nume).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pionexPrivatGet, cuProba, reseteazaRitmPionex } from "../functions/_shared/pionex.js";   // v100.214: cuProba în locul steagului comun
import { onRequest } from "../functions/_middleware.js";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.209 · proba de ecran fără Pionex · proba\n");
const ENV = { PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret" };
const fetchAdevarat = globalThis.fetch;
let cereri = 0;
globalThis.fetch = async () => { cereri++; return new Response(JSON.stringify({ result: true, data: {} }), { status: 200, headers: { "content-type": "application/json" } }); };

const CU_ANTET = new Request("https://radar.test/api/x", { headers: { "x-proba-ecran": "1" } });
await test("cererea cu antetul de probă NU pleacă spre Pionex (503, spus pe nume)", async () => {
  reseteazaRitmPionex(); cereri = 0;
  await assert.rejects(() => pionexPrivatGet(cuProba(ENV, CU_ANTET), "/api/v1/account/balances"), (e) => e.status === 503 && /probă de ecran/.test(e.message));
  assert.equal(cereri, 0);
});
await test("fără steag, cererea pleacă ca înainte", async () => {
  reseteazaRitmPionex(); cereri = 0;
  const r = await pionexPrivatGet(ENV, "/api/v1/account/balances");
  assert.equal(cereri, 1); assert.equal(r.r.status, 200);
});
await test("middleware-ul pune nosniff și lasă eroarea rutei să urce (v100.214: fără steag comun)", async () => {
  const r = await onRequest({ request: CU_ANTET, next: async () => new Response("{}", { headers: { "content-type": "application/json" } }) });
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  await assert.rejects(() => onRequest({ request: CU_ANTET, next: async () => { throw new Error("ruta a picat"); } }), /ruta a picat/);
});
globalThis.fetch = fetchAdevarat;
await test("proba de ecran pune antetul pe toate cererile (CDP Network.setExtraHTTPHeaders)", () => {
  assert.match(citeste("scripts", "proba-ecran-telefon.mjs"), /Network\.setExtraHTTPHeaders", \{ headers: \{ "x-proba-ecran": "1" \} \}/);
});
await test("versiunile: v100.209, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 209);   /* v100.210: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.208\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100208 && npm run test:v100209/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
