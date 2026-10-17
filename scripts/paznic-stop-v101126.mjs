// Proba alarmei „fără stop loss” (v101.126, 17.10.2026): lista din Decision App (/stopuri), pozițiile din poză, planul din Radar,
// alarma la :00 :15 :30 :45 cu @here, „toate au stop” o singură dată, poza veche = nicio alarmă, cronul la 5 minute. Fără rețea.
// Rulare: node scripts/paznic-stop-v101126.mjs
import assert from "node:assert/strict";
import paznic, { faraStop, mesajFaraStop, stopuriScrie, verificaStopuri, dnd } from "../paznic/worker.mjs";
import { stopuriDinOrdine } from "../functions/api/t212.js";

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const T0 = Date.UTC(2026, 9, 16, 12, 0); // vineri 15:00 ora României (în afara DND)
function lume() {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abcDEF_-x", PAZNIC_TOKEN: "t".repeat(32), CHEIE_CITIRE: "c".repeat(32) };
  const f = async (u, init) => { trimise.push(JSON.parse(init.body)); return { ok: true }; };
  return { env, kv, trimise, f };
}
const poz = (t212, o = {}) => ({ s: t212.split("_")[0], t212, mediu: 100, pret: 97, pctPret: -0.03, pplLei: -42, ...o });
const poza = (t212, la = T0, extra = {}) => JSON.stringify({ la, t212La: la, t212, ...extra });

await test("fără stop = nici în lista aplicației, nici stop FIX în Radar; stopul mobil (15%) NU contează (alegerea lui, 17.10)", async () => {
  const l = faraStop({ t212: [poz("AAPL_US_EQ"), poz("TSLA_US_EQ"), poz("NVDA_US_EQ", { plan: { stopFix: 90 } }), poz("MU_US_EQ", { plan: { trailPct: 8 } }), poz("AMD_US_EQ", { plan: { stopFix: null, trailPct: null } })] }, { cuStop: ["AAPL_US_EQ"] });
  assert.deepEqual(l.map((p) => p.t212), ["TSLA_US_EQ", "MU_US_EQ", "AMD_US_EQ"]);
  assert.deepEqual(faraStop({ t212: [poz("TSLA_US_EQ", { stopT212: 380 })] }, { cuStop: [] }), [], "ordinul de stop din Trading 212 contează (v101.130)");
});
await test("mesajul: titlul cu numărul; stopul −5% de la intrare, iar sub −5% de la intrare — de la prețul de acum (18.10)", async () => {
  const m = mesajFaraStop([poz("TSLA_US_EQ", { mediu: 420, pret: 395, pctPret: -0.0595 })]);
  assert.match(m.titlu, /FĂRĂ STOP LOSS · TSLA/); assert.match(m.mesaj, /deja sub −5% de la intrare ⇒ \*\*stop −5% de la prețul de acum = 375,25/); assert.match(m.mesaj, /la fiecare 15 minute/);
  assert.match(mesajFaraStop([poz("MU_US_EQ", { mediu: 100, pret: 98 })]).mesaj, /stop −5% de la intrare = 95,00/);
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
await test("DND: sâmbăta, duminica și 22:00–08:00 ora României tace (și vara, și iarna); vineri 21:59 și luni 08:00 sună", async () => {
  assert.equal(dnd(Date.UTC(2026, 9, 17, 9, 0)), true, "sâmbătă");  assert.equal(dnd(Date.UTC(2026, 9, 18, 9, 0)), true, "duminică");
  assert.equal(dnd(Date.UTC(2026, 9, 16, 18, 59)), false, "vineri 21:59 (vara, UTC+3)"); assert.equal(dnd(Date.UTC(2026, 9, 16, 19, 0)), true, "vineri 22:00");
  assert.equal(dnd(Date.UTC(2026, 9, 19, 4, 59)), true, "luni 07:59"); assert.equal(dnd(Date.UTC(2026, 9, 19, 5, 0)), false, "luni 08:00");
  assert.equal(dnd(Date.UTC(2026, 11, 7, 6, 0)), false, "luni 08:00 iarna (UTC+2)"); assert.equal(dnd(Date.UTC(2026, 11, 7, 5, 59)), true, "luni 07:59 iarna");
  const w = lume(); w.kv.set("poza", poza([poz("AAPL_US_EQ")], Date.UTC(2026, 9, 17, 9, 0)));
  assert.equal((await verificaStopuri(w.env, Date.UTC(2026, 9, 17, 9, 0), w.f)).stare, "dnd"); assert.equal(w.trimise.length, 0);
});
await test("ordinele în așteptare din Trading 212: doar vânzările STOP / STOP_LIMIT, cel mai sus stop pe ticker", async () => {
  const o = stopuriDinOrdine([{ ticker: "MU_US_EQ", type: "STOP", quantity: -2, stopPrice: 900 }, { ticker: "MU_US_EQ", type: "STOP_LIMIT", quantity: -1, stopPrice: 950, limitPrice: 940 },
    { ticker: "TXN_US_EQ", type: "LIMIT", quantity: -1, limitPrice: 300 }, { ticker: "WDC_US_EQ", type: "STOP", quantity: 3, stopPrice: 400 }, { ticker: "AVGO_US_EQ", type: "STOP", quantity: -1, stopPrice: 0 }]);
  assert.deepEqual(o, { MU_US_EQ: 950 }); assert.deepEqual(stopuriDinOrdine(null), {});
});
await test("revizia 18.10: Trading 212 n-a răspuns (t212Eroare / poziții citite de mult) ⇒ nici alarmă, nici „✅ toate au stop”", async () => {
  const w = lume(); w.kv.set("faraStopStare", JSON.stringify({ n: 3 }));
  w.kv.set("poza", poza([], T0, { t212Eroare: "HTTP 503" })); assert.equal((await verificaStopuri(w.env, T0, w.f)).stare, "t212-nesigur");
  w.kv.set("poza", JSON.stringify({ la: T0, t212La: T0 - 3 * 3600000, t212: [] })); assert.equal((await verificaStopuri(w.env, T0, w.f)).stare, "t212-nesigur");
  assert.equal(w.trimise.length, 0); assert.equal(JSON.parse(w.kv.get("faraStopStare")).n, 3, "starea nu se rescrie");
});
console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
