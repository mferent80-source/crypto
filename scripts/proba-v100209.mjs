// Proba v100.209 (16.10.2026): proba de ecran NU mai bate în Pionex. Azi două livrări cu câte 55 de pagini au ars cota Pionex și
// IP-ul a stat blocat 3 ore (X-RateLimit-Lock) — măsurarea Busolei a rămas fără futures. Proba pune antetul `x-proba-ecran: 1`
// (CDP, pe toate cererile), middleware-ul aprinde steagul cât ține cererea, învelișul nu mai cheamă Pionex (503, spus pe nume).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pionexPrivatGet, marcheazaProba, esteProba, reseteazaRitmPionex } from "../functions/_shared/pionex.js";
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

await test("cu steagul de probă aprins, cererea către Pionex NU pleacă (503, spus pe nume)", async () => {
  reseteazaRitmPionex(); marcheazaProba(true); cereri = 0;
  await assert.rejects(() => pionexPrivatGet(ENV, "/api/v1/account/balances"), (e) => e.status === 503 && /probă de ecran/.test(e.message));
  assert.equal(cereri, 0);
  marcheazaProba(false);
});
await test("fără steag, cererea pleacă ca înainte", async () => {
  reseteazaRitmPionex(); cereri = 0;
  const r = await pionexPrivatGet(ENV, "/api/v1/account/balances");
  assert.equal(cereri, 1); assert.equal(r.r.status, 200);
});
await test("middleware-ul: antetul x-proba-ecran aprinde steagul DOAR cât ține cererea, apoi îl stinge", async () => {
  let inTimpul = null;
  const ctx = { request: new Request("https://radar.test/api/x", { headers: { "x-proba-ecran": "1" } }), next: async () => { inTimpul = esteProba(); return new Response("{}", { headers: { "content-type": "application/json" } }); } };
  const r = await onRequest(ctx);
  assert.equal(inTimpul, true); assert.equal(esteProba(), false); assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  const ctx2 = { request: new Request("https://radar.test/api/x"), next: async () => { inTimpul = esteProba(); return new Response("{}"); } };
  await onRequest(ctx2); assert.equal(inTimpul, false);
});
await test("middleware-ul stinge steagul și când ruta aruncă", async () => {
  const ctx = { request: new Request("https://radar.test/api/x", { headers: { "x-proba-ecran": "1" } }), next: async () => { throw new Error("ruta a picat"); } };
  await assert.rejects(() => onRequest(ctx), /ruta a picat/);
  assert.equal(esteProba(), false);
});
globalThis.fetch = fetchAdevarat;
await test("proba de ecran pune antetul pe toate cererile (CDP Network.setExtraHTTPHeaders)", () => {
  assert.match(citeste("scripts", "proba-ecran-telefon.mjs"), /Network\.setExtraHTTPHeaders", \{ headers: \{ "x-proba-ecran": "1" \} \}/);
});
await test("versiunile: v100.209, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  assert.equal(JSON.parse(citeste("package.json")).version, "100.209.0"); assert.match(citeste("public", "sw.js"), /^const CACHE="crypto-radar-v100-209";/);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.209"); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.209"/);
  assert.equal((idx.match(/v100\.209/g) || []).length, 4); assert.ok(!/v100\.208\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100208 && npm run test:v100209/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
