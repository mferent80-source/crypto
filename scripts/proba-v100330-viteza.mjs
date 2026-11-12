// Proba v100.330 · viteza Piața azi (12.11.2026, auditul de design: 179 de cereri / 2,1 MB la deschidere ⇒ el: „fa tot acum”):
//   datele grele care se schimbă rar și veneau de DOUĂ ori în aceeași deschidere (boții închiși 406 kb ×2 - scorul sezonului + contul;
//   istoricul T212 200 kb ×2; clasamentul ×2; știrile pieței 76 kb ×2; știrile crypto ×2) se țin minte 60 s în getJsonBrut, nu 3 s.
//   Restul rămâne la 3 s (lumânările, boții deschiși, alertele, planul...). Orice scriere golește tot (getJsonGoleste), ca înainte.
//   node scripts/proba-v100330-viteza.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 2).join(" | ").slice(0, 500)}`); }); }
console.log("\nV100.330 · datele grele cerute o singură dată pe minut · proba\n");
const fn = (nume) => { const i = app.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = app.indexOf("\nfunction ", i + 10), k = app.indexOf("\nasync function ", i + 10); const e = [j, k].filter((x) => x > 0); return app.slice(i, e.length ? Math.min(...e) : undefined); };
function lume() {
  const ctx = { Date: { now: () => ctx.ceas }, ceas: 1e12, apeluri: [], Promise, Map, String, RegExp };
  ctx.apiFetch = async (u) => { ctx.apeluri.push(String(u)); return { ok: true, status: 200, text: async () => '{"ok":true}' }; };
  vm.createContext(ctx);
  const decl = app.match(/var getJsonDrum=null,getJsonProaspat=null,getJsonGen=0,GET_PROASPAT_MS=3000;/);
  assert.ok(decl, "declarația memoriei cererilor");
  vm.runInContext(decl[0].replace(/^var /, "var ") + "\n" + fn("getJsonTtl") + "\n" + fn("getJsonGoleste") + "\n" + fn("getJsonBrut") + "\nthis.brut=getJsonBrut;this.ttl=getJsonTtl;this.goleste=getJsonGoleste;", ctx);
  return ctx;
}
const asteapta = () => new Promise((r) => setTimeout(r, 0));
const GRELE = ["/api/istoric-bot?action=botiInchisi", "/api/t212?action=istoric", "/api/istoric-bot?action=clasament", "/api/stiri?action=piata", "/api/stiri?action=crypto&moneda=BTC", "/api/istoric-bot?action=sugestii&scurt=1"];   // revizia: + sugestiile (o dată pe zi)

await test("getJsonTtl: 60 s pentru cele cinci date grele cerute de două ori; 3 s pentru restul", () => {
  const c = lume();
  for (const u of GRELE) assert.equal(c.ttl(u), 60000, u);
  for (const u of ["/api/bot-orders", "/api/bot-orders?status=finished", "/api/market?type=pionex_klines&symbol=HYPE_USDT_PERP&interval=4H", "/api/istoric-bot?action=alerte", "/api/istoric-bot?action=plan&id=1", "/api/t212?action=cont", "/api/stiri?action=actiune&t=AAPL"]) assert.equal(c.ttl(u), 3000, u);
});
await test("boții închiși ceruți la 10 s distanță (scorul sezonului, apoi contul) ⇒ o singură cerere; la 70 s ⇒ a doua", async () => {
  const c = lume(), u = "/api/istoric-bot?action=botiInchisi";
  await c.brut(u); await asteapta(); c.ceas += 10000; await c.brut(u);
  assert.equal(c.apeluri.length, 1);
  c.ceas += 60000; await c.brut(u);
  assert.equal(c.apeluri.length, 2);
});
await test("boții deschiși (bot-orders) rămân la 3 s: la 10 s distanță ⇒ două cereri", async () => {
  const c = lume(), u = "/api/bot-orders";
  await c.brut(u); await asteapta(); c.ceas += 10000; await c.brut(u);
  assert.equal(c.apeluri.length, 2);
});
await test("o scriere (getJsonGoleste) golește și datele de 60 s", async () => {
  const c = lume(), u = "/api/t212?action=istoric";
  await c.brut(u); await asteapta(); c.goleste(); c.ceas += 1000; await c.brut(u);
  assert.equal(c.apeluri.length, 2);
});
await test("curățarea memoriei folosește timpul fiecărei adrese (cele de 60 s nu ies după 3 s)", async () => {
  const c = lume(), u = "/api/stiri?action=piata";
  await c.brut(u); await asteapta(); c.ceas += 5000; await c.brut("/api/bot-orders"); await asteapta(); c.ceas += 1000; await c.brut(u);
  assert.equal(c.apeluri.filter((x) => x === u).length, 1, "știrile pieței au rămas în memorie după curățarea de la a doua cerere");
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
