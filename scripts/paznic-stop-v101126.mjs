// Proba alarmei „fără stop loss” (v101.126, 17.10.2026): lista din Decision App (/stopuri), pozițiile din poză, planul din Radar,
// alarma la :00 :15 :30 :45 cu @here, „toate au stop” o singură dată, poza veche = nicio alarmă, cronul la 5 minute. Fără rețea.
// Rulare: node scripts/paznic-stop-v101126.mjs
import assert from "node:assert/strict";
import paznic, { faraStop, mesajFaraStop, stopuriScrie, verificaStopuri } from "../paznic/worker.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const T0 = Date.UTC(2026, 9, 17, 15, 0);
function lume() {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abcDEF_-x", PAZNIC_TOKEN: "t".repeat(32), CHEIE_CITIRE: "c".repeat(32) };
  const f = async (u, init) => { trimise.push(JSON.parse(init.body)); return { ok: true }; };
  return { env, kv, trimise, f };
}
const poz = (t212, o = {}) => ({ s: t212.split("_")[0], t212, mediu: 100, pret: 97, pctPret: -0.03, pplLei: -42, ...o });
const poza = (t212, la = T0) => JSON.stringify({ la, t212 });

await test("fără stop = nici în lista aplicației, nici plan cu stop fix / stop mobil în Radar", async () => {
  const l = faraStop({ t212: [poz("AAPL_US_EQ"), poz("TSLA_US_EQ"), poz("NVDA_US_EQ", { plan: { stopFix: 90 } }), poz("MU_US_EQ", { plan: { trailPct: 8 } }), poz("AMD_US_EQ", { plan: { stopFix: null, trailPct: null } })] }, { cuStop: ["AAPL_US_EQ"] });
  assert.deepEqual(l.map((p) => p.t212), ["TSLA_US_EQ", "AMD_US_EQ"]);
});
await test("mesajul: titlul cu numărul, fiecare poziție cu stopul −5% de la intrare și semnul când prețul e deja sub el", async () => {
  const m = mesajFaraStop([poz("TSLA_US_EQ", { mediu: 420, pret: 395, pctPret: -0.0595 })]);
  assert.match(m.titlu, /FĂRĂ STOP LOSS · TSLA/); assert.match(m.mesaj, /stop −5% = 399,00/); assert.match(m.mesaj, /DEJA sub −5%/); assert.match(m.mesaj, /la fiecare 15 minute/);
});
await test("/stopuri: lista curățată și sortată; identică = nicio scriere; prea des = 429", async () => {
  const w = lume();
  assert.equal((await stopuriScrie(w.env, JSON.stringify({ cuStop: ["TSLA_US_EQ", "AAPL_US_EQ", "AAPL_US_EQ", "<x>"] }), T0)).status, 200);
  assert.deepEqual(JSON.parse(w.kv.get("stopuri")).cuStop, ["AAPL_US_EQ", "TSLA_US_EQ", "x"]);
  const scris = w.kv.get("stopuri"); assert.equal((await stopuriScrie(w.env, JSON.stringify({ cuStop: ["AAPL_US_EQ", "TSLA_US_EQ", "x"] }), T0 + 60000)).corp.neschimbat, true); assert.equal(w.kv.get("stopuri"), scris);
  assert.equal((await stopuriScrie(w.env, JSON.stringify({ cuStop: [] }), T0 + 1000)).status, 429);
  assert.equal((await stopuriScrie(w.env, "{", T0)).status, 400);
});
await test("ruta /stopuri cere cheia de citire (tokenul colectorului NU merge)", async () => {
  const w = lume(), req = (k) => new Request("https://p.test/stopuri", { method: "POST", headers: { authorization: "Bearer " + k }, body: JSON.stringify({ cuStop: ["A_US_EQ"] }) });
  assert.equal((await paznic.fetch(req("t".repeat(32)), w.env)).status, 401); assert.equal((await paznic.fetch(req("c".repeat(32)), w.env)).status, 200);
});
await test("alarma: @here, roșu, toate pozițiile fără stop; apoi „toate au stop” O SINGURĂ dată", async () => {
  const w = lume(); w.kv.set("poza", poza([poz("AAPL_US_EQ"), poz("TSLA_US_EQ")]));
  let r = await verificaStopuri(w.env, T0 + 60000, w.f); assert.equal(r.stare, "alarma"); assert.equal(r.n, 2);
  assert.match(w.trimise[0].content, /^@here/); assert.equal(w.trimise[0].embeds[0].color, 0xff0000); assert.deepEqual(w.trimise[0].allowed_mentions, { parse: ["everyone"] });
  await stopuriScrie(w.env, JSON.stringify({ cuStop: ["AAPL_US_EQ", "TSLA_US_EQ"] }), T0 + 120000);
  r = await verificaStopuri(w.env, T0 + 15 * 60000, w.f); assert.equal(r.stare, "toate-au-stop"); assert.match(w.trimise[1].embeds[0].title, /Toate pozițiile/);
  await verificaStopuri(w.env, T0 + 30 * 60000, w.f); assert.equal(w.trimise.length, 2, "liniște după");
});
await test("poza mai veche de 2 ore (colectorul tace) = nicio alarmă pe poziții", async () => {
  const w = lume(); w.kv.set("poza", poza([poz("AAPL_US_EQ")], T0 - 3 * 3600000));
  assert.equal((await verificaStopuri(w.env, T0, w.f)).stare, "fara-poza"); assert.equal(w.trimise.length, 0);
});
await test("cronul la 5 minute: paznicul colectorului la :00 :10 :20…, alarma la :00 :15 :30 :45", async () => {
  const w = lume(); w.kv.set("poza", poza([poz("AAPL_US_EQ")], T0));
  const rulari = []; const ctx = { waitUntil: (p) => rulari.push(p) }, fetchVechi = globalThis.fetch; globalThis.fetch = w.f; // fără rețea: cronul folosește fetch-ul global
  for (const mm of [0, 5, 10, 15, 20, 25, 30, 45]) await paznic.scheduled({ scheduledTime: T0 + mm * 60000 }, w.env, ctx);
  await Promise.all(rulari); globalThis.fetch = fetchVechi;
  assert.equal(w.trimise.filter((x) => /STOP LOSS/.test(x.username || "")).length, 4, "alarma la 0, 15, 30, 45");
});
console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
