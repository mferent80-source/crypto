// Proba v100.208 (16.10.2026, 12:21 — măsurat pe viu): după un 429 de ritm, Pionex BLOCHEAZĂ IP-ul ore întregi (antetul
// `X-RateLimit-Lock` = ora deblocării, azi 15:04) și FIECARE cerere din timpul blocării prelungește lacătul (+10 s). Învelișul
// serverului de acasă (functions/_shared/pionex.js) ținea răcirea doar din `retry-after` (lipsă ⇒ 15 s) ⇒ colectorul + paginile
// băteau la 15 s în Pionex și lacătul nu se mai stingea niciodată. Acum răcirea = lacătul din antet; eroarea spune ora.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pionexPrivatGet, reseteazaRitmPionex } from "../functions/_shared/pionex.js";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.208 · lacătul Pionex (X-RateLimit-Lock) în învelișul serverului · proba\n");
const ENV = { PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret" };
const fetchAdevarat = globalThis.fetch;
const cu429 = (lacatPesteS) => { let n = 0; globalThis.fetch = async () => { n++; return new Response("Too Many Requests", { status: 429, headers: lacatPesteS == null ? {} : { "x-ratelimit-lock": String((Date.now() + lacatPesteS * 1000) / 1000) } }); }; return () => n; };

await test("429 cu X-RateLimit-Lock la +2 h ⇒ răcirea ține până la lacăt (nu 15 s), eroarea spune ora", async () => {
  reseteazaRitmPionex(); const cate = cu429(7200);
  await assert.rejects(() => pionexPrivatGet(ENV, "/api/v1/account/balances"), (e) => e.status === 429 && e.retryAfter >= 7190 && /blocat până la \d\d:\d\d/.test(e.message));
  await assert.rejects(() => pionexPrivatGet(ENV, "/api/v1/account/balances"), (e) => e.status === 429 && /retry in \d+s/.test(e.message) && e.retryAfter >= 7180);
  assert.equal(cate(), 1, "a doua cerere NU a plecat spre Pionex (ar fi prelungit lacătul)");
});
await test("429 fără lacăt și fără retry-after ⇒ răcirea veche de 15 s (nimic pierdut)", async () => {
  reseteazaRitmPionex(); cu429(null);
  await assert.rejects(() => pionexPrivatGet(ENV, "/api/v1/account/balances"), (e) => e.status === 429 && e.retryAfter === 15);
});
await test("lacăt în trecut (antet vechi) ⇒ nu se ia în seamă", async () => {
  reseteazaRitmPionex(); cu429(-60);
  await assert.rejects(() => pionexPrivatGet(ENV, "/api/v1/account/balances"), (e) => e.status === 429 && e.retryAfter === 15);
});
globalThis.fetch = fetchAdevarat;
await test("versiunile: v100.208, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 208);   /* v100.209: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.207\b/.test(idx));
  assert.match(citeste("package.json"), /npm run test:v100207 && npm run test:v100208/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
