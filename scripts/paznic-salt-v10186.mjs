// Proba rutelor /salt-cereri ale paznicului (v101.86, pagina alerts în două). Fără rețea. Rulare: node scripts/paznic-salt-v10186.mjs
import assert from "node:assert/strict";
import paznic from "../paznic/worker.mjs";
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const TOK = "t".repeat(32), CHEIE = "c".repeat(32);
function lume() {
  const kv = new Map(), env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CHEIE };
  const cere = (cale, m, h = {}, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: { "content-type": "application/json", ...h }, body: corp }), env);
  return { kv, cere };
}
const C = (o) => JSON.stringify(o);
await test("POST cu cheia de citire pune cererea; tokenul colectorului o citește și o confirmă; fără cheie 401", async () => {
  const w = lume();
  assert.equal((await w.cere("/salt-cereri", "POST", {}, C({ op: "pune", simbol: "NFLX", qty: 1, pretMediu: 2, moneda: "EUR" }))).status, 401);
  const r = await w.cere("/salt-cereri", "POST", { authorization: "Bearer " + CHEIE }, C({ op: "pune", simbol: "nflx", qty: 14.43412, pretMediu: 79.84, moneda: "EUR", de: "2026-04-21" }));
  assert.equal(r.status, 200); const { id } = await r.json(); assert.ok(id);
  assert.equal((await w.cere("/salt-cereri", "GET", { authorization: "Bearer " + CHEIE })).status, 401, "cheia de citire NU citește cererile");
  const g = await (await w.cere("/salt-cereri", "GET", { authorization: "Bearer " + TOK })).json();
  assert.equal(g.cereri.length, 1); assert.equal(g.cereri[0].simbol, "NFLX"); assert.equal(g.cereri[0].moneda, "EUR"); assert.equal(g.cereri[0].id, id); assert.equal(g.cereri[0].de, "2026-04-21");
  assert.equal((await w.cere("/salt-cereri/ack", "POST", { authorization: "Bearer " + CHEIE }, C({ iduri: [id] }))).status, 401, "cheia de citire NU confirmă");
  const a = await (await w.cere("/salt-cereri/ack", "POST", { authorization: "Bearer " + TOK }, C({ iduri: [id] }))).json();
  assert.equal(a.ramase, 0);
});
await test("validarea: op necunoscut, cantitate 0, moneda alta = 400; peste 20 în așteptare = 429", async () => {
  const w = lume(), H = { authorization: "Bearer " + CHEIE };
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "sterge-tot" }))).status, 400);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "pune", simbol: "NFLX", qty: 0, pretMediu: 1, moneda: "EUR" }))).status, 400);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "pune", simbol: "NFLX", qty: 1, pretMediu: 1, moneda: "GBP" }))).status, 400);
  for (let i = 0; i < 20; i++) assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "scoate", isin: "US64110L1061" }))).status, 200);
  assert.equal((await w.cere("/salt-cereri", "POST", H, C({ op: "scoate", isin: "US64110L1061" }))).status, 429);
});
console.log(`\n${teste - picate}/${teste} probe trec`); if (picate) process.exit(1);
