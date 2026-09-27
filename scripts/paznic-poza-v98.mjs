// Proba rutelor /poza si /simboluri ale paznicului (v98): tokenul colectorului, cheia de citire, ETag/304, CORS, marimea. Fara retea.
// Rulare: node scripts/paznic-poza-v98.mjs
import assert from "node:assert/strict";
import paznic, { pozaScrie, pozaCiteste, simboluriScrie, simboluriCiteste, origineOk, verifica } from "../paznic/worker.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const TOK = "t".repeat(32), CHEIE = "c".repeat(32);
function lume() {
  const kv = new Map();
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, PAZNIC_TOKEN: TOK, CHEIE_CITIRE: CHEIE, DISCORD_WEBHOOK: "" };
  const cere = (cale, m, h = {}, corp) => paznic.fetch(new Request("https://paznic.test" + cale, { method: m, headers: h, body: corp }), env);
  return { env, kv, cere };
}
const POZA = JSON.stringify({ la: 1790530000000, versiune: "v98.0", t212: [], boti: [], simboluri: [] });

await test("POST /poza: fara token 401; cu tokenul colectorului scrie poza si 'la'; JSON stricat 400; fara 'la' 400", async () => {
  const w = lume();
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + CHEIE }, POZA)).status, 401, "cheia de citire NU scrie poza");
  const r = await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.ok, true); assert.equal(j.la, 1790530000000); assert.equal(j.marime, POZA.length);
  assert.equal(w.kv.size, 1, "o singura scriere KV pe poza (limita zilnica a KV-ului, si fara doua chei ne-atomice)");
  assert.equal(w.kv.get("poza"), POZA);
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, "{nu e json")).status, 400);
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ t212: [] }))).status, 400);
});
await test("POST /poza peste 512 KB: 413, nimic scris", async () => {
  const w = lume(), mare = JSON.stringify({ la: 1, umplutura: "x".repeat(512 * 1024) });
  assert.equal((await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, mare)).status, 413); assert.equal(w.kv.size, 0);
});
await test("GET /poza: fara cheie 401; fara poza 404; cu cheie -> poza + ETag; If-None-Match -> 304", async () => {
  const w = lume();
  assert.equal((await w.cere("/poza", "GET", {})).status, 401);
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + TOK })).status, 401, "tokenul colectorului NU citeste poza");
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE })).status, 404);
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  const r = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE });
  assert.equal(r.status, 200); assert.equal(r.headers.get("etag"), '"1790530000000"'); assert.equal((await r.json()).versiune, "v98.0");
  assert.equal((await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, "if-none-match": '"1790530000000"' })).status, 304);
});
await test("simboluri: pagina scrie cu cheia (curatate, fara dubluri, max 60), colectorul citeste cu tokenul", async () => {
  const w = lume();
  assert.equal((await w.cere("/simboluri", "POST", { authorization: "Bearer " + TOK }, "{}")).status, 401);
  const l = { simboluri: [{ s: "avgo", nota: "x" }, { s: "AVGO" }, { s: "rhm.de", nota: "Rheinmetall" }, { s: "" }, { s: "1QZ.DE" }] };
  const r = await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, JSON.stringify(l));
  assert.equal(r.status, 200); assert.equal((await r.json()).n, 3);
  assert.equal((await w.cere("/simboluri", "GET", { authorization: "Bearer " + CHEIE })).status, 401, "cheia de citire NU citeste lista (nu are de ce)");
  const g = await (await w.cere("/simboluri", "GET", { authorization: "Bearer " + TOK })).json();
  assert.deepEqual(g.simboluri.map((x) => x.s), ["AVGO", "RHM.DE", "1QZ.DE"]); assert.equal(g.simboluri[1].nota, "Rheinmetall");
  const multe = { simboluri: Array.from({ length: 80 }, (_, i) => ({ s: "S" + i })) };
  assert.equal((await (await w.cere("/simboluri", "POST", { authorization: "Bearer " + CHEIE }, JSON.stringify(multe))).json()).n, 60);
});
await test("CORS: originea suitei primeste antetele, alta origine nu; OPTIONS = 204", async () => {
  const w = lume();
  assert.equal(origineOk("https://mferent80-source.github.io"), true); assert.equal(origineOk("http://localhost:8777"), true); assert.equal(origineOk("https://rau.exemplu"), false); assert.equal(origineOk(null), false);
  const o = await w.cere("/poza", "OPTIONS", { origin: "https://mferent80-source.github.io", "access-control-request-method": "GET" });
  assert.equal(o.status, 204); assert.equal(o.headers.get("access-control-allow-origin"), "https://mferent80-source.github.io"); assert.match(o.headers.get("access-control-allow-headers"), /authorization/i);
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, POZA);
  const r = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, origin: "https://mferent80-source.github.io" });
  assert.equal(r.headers.get("access-control-allow-origin"), "https://mferent80-source.github.io"); assert.equal(r.headers.get("access-control-expose-headers"), "etag");
  const s = await w.cere("/poza", "GET", { authorization: "Bearer " + CHEIE, origin: "https://rau.exemplu" });
  assert.equal(s.headers.get("access-control-allow-origin"), null, "alta origine nu primeste CORS (browserul ei nu poate citi)");
});
await test("/bataie merge ca inainte (nu s-a stricat v97)", async () => {
  const w = lume(); const r = await w.cere("/bataie", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ pid: 1 }));
  assert.equal(r.status, 200); assert.equal(JSON.parse(w.kv.get("stare")).pid, 1);
});
await test("poza tine loc de bataie: fara /bataie, cu poza de 3 minute paznicul zice 'bate'; poza de 40 de minute nu mai tine", async () => {
  const MIN = 60000, T0 = Date.UTC(2026, 8, 27, 12, 0), w = lume(), f = async () => ({ ok: true });
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ la: T0 - 3 * MIN, t212: [] }));
  assert.equal((await verifica(w.env, T0, f)).stare, "bate", "poza proaspata = colectorul traieste, fara scriere in plus");
  await w.cere("/poza", "POST", { authorization: "Bearer " + TOK }, JSON.stringify({ la: T0 - 40 * MIN, t212: [] }));
  assert.notEqual((await verifica(w.env, T0, f)).stare, "bate", "poza veche de 40 min nu mai tine loc de bataie");
});
await test("functiile pure: pozaScrie / pozaCiteste / simboluriScrie / simboluriCiteste", async () => {
  const w = lume();
  assert.equal((await pozaScrie(w.env, "{}")).status, 400);
  assert.equal((await pozaScrie(w.env, POZA)).status, 200);
  assert.equal((await pozaCiteste(w.env, null)).status, 200); assert.equal((await pozaCiteste(w.env, '"1790530000000"')).status, 304);
  assert.equal((await simboluriScrie(w.env, JSON.stringify({ simboluri: [{ s: "a" }] }))).corp.n, 1);
  assert.equal((await simboluriCiteste(w.env)).simboluri[0].s, "A");
});

console.log(`PAZNIC_POZA_V98 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
