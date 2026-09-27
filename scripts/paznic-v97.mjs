// Proba paznicului colectorului (v97): bataia, tacerea de 30 de minute, amintirea la 6 ore, revenirea, tokenul. Fara retea.
// Rulare: node scripts/paznic-v97.mjs
import assert from "node:assert/strict";
import paznic, { bataie, verifica } from "../paznic/worker.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const MIN = 60000, T0 = Date.UTC(2026, 8, 27, 12, 0);
function lume(o = {}) {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } },
    DISCORD_WEBHOOK: o.webhook ?? "https://discord.com/api/webhooks/123/abcDEF_-x", PAZNIC_TOKEN: "t".repeat(32) };
  const f = async (u, init) => { trimise.push(JSON.parse(init.body)); return { ok: o.discordPicat ? false : true }; };
  return { env, kv, trimise, f };
}

await test("fara nicio bataie inca: tacere (nu anunta un colector care n-a pornit niciodata)", async () => {
  const w = lume(); assert.deepEqual(await verifica(w.env, T0, w.f), { stare: "fara-bataie" }); assert.equal(w.trimise.length, 0);
});
await test("bate la 5 min: nimic; tace 30 de minute: UN mesaj rosu; inca 6 ore: amintire; bataia revine: 'a revenit'", async () => {
  const w = lume();
  await bataie(w.env, { pid: 3304 }, T0, w.f);
  assert.equal((await verifica(w.env, T0 + 29 * MIN, w.f)).stare, "bate");
  assert.equal((await verifica(w.env, T0 + 31 * MIN, w.f)).stare, "anuntat");
  assert.equal(w.trimise.length, 1); assert.match(w.trimise[0].content, /^🔴 Crypto Radar: colectorul tace de 31 de minute$/); assert.match(w.trimise[0].embeds[0].description, /NU primești alertele botului/);
  assert.equal((await verifica(w.env, T0 + 41 * MIN, w.f)).stare, "tace-anuntat"); assert.equal(w.trimise.length, 1, "nu la fiecare 10 minute");
  assert.equal((await verifica(w.env, T0 + 31 * MIN + 6 * 60 * MIN, w.f)).stare, "anuntat"); assert.match(w.trimise[1].embeds[0].description, /Încă tace/);
  await bataie(w.env, { pid: 4000 }, T0 + 7 * 60 * MIN, w.f);
  assert.equal(w.trimise.length, 3); assert.match(w.trimise[2].content, /^🟢 Crypto Radar: colectorul a revenit/); assert.match(w.trimise[2].embeds[0].description, /7,0 ore/);
  await bataie(w.env, { pid: 4000 }, T0 + 7 * 60 * MIN + 5 * MIN, w.f); assert.equal(w.trimise.length, 3, "a doua bătaie nu mai anunță revenirea");
});
await test("Discord picat: tacerea NU se trece ca anuntata (reincearca la urmatorul cron); webhook stricat = nimic trimis", async () => {
  const w = lume({ discordPicat: true }); await bataie(w.env, {}, T0, w.f);
  assert.equal((await verifica(w.env, T0 + 40 * MIN, w.f)).stare, "discord-picat"); assert.equal(JSON.parse(w.kv.get("stare")).anuntatLa, undefined);
  const r = lume({ webhook: "https://rau.exemplu/x" }); await bataie(r.env, {}, T0, r.f); await verifica(r.env, T0 + 40 * MIN, r.f); assert.equal(r.trimise.length, 0);
});
await test("ruta /bataie: doar POST cu tokenul bun; altceva nu atinge starea", async () => {
  const w = lume(), cere = (m, h, corp) => paznic.fetch(new Request("https://paznic.test/bataie", { method: m, headers: h, body: corp }), w.env);
  assert.equal((await cere("POST", { authorization: "Bearer gresit" }, "{}")).status, 401);
  assert.equal((await cere("GET", {})).status, 405); assert.equal(w.kv.size, 0);
  const r = await cere("POST", { authorization: "Bearer " + "t".repeat(32) }, JSON.stringify({ pid: 3304, versiune: "v97.0" }));
  assert.equal(r.status, 200); assert.equal(JSON.parse(w.kv.get("stare")).pid, 3304);
  const scurt = lume(); scurt.env.PAZNIC_TOKEN = "scurt";
  assert.equal((await paznic.fetch(new Request("https://p/bataie", { method: "POST", headers: { authorization: "Bearer scurt" }, body: "{}" }), scurt.env)).status, 401, "token prea scurt = închis");
});

console.log(`PAZNIC_V97 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
