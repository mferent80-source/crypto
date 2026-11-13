// Proba v100.336 · I-867 pachetul paginii Piața azi: o singură cerere cu ce ține serverul de la colector, fiecare parte = răspunsul rutei ei.
//   1  paritate: fiecare parte a pachetului e EXACT răspunsul cererii ei de până acum (aceeași funcție pe server)
//   2  KV gol: părțile vin goale ca rutele lor (nu inventează), pachetul nu pică
//   3  fără parolă: pachetul e refuzat ca orice citire
//   4  pagina: o singură cerere „pachet”; fiecare parte se ia din el, iar partea lipsă sau picată cade pe cererea ei
//   node scripts/proba-v100336-pachet.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.336 · pachetul Piața azi · proba\n");

function kvFals(init) { const m = new Map(Object.entries(init || {}).map(([k, v]) => [k, JSON.stringify(v)])); return { m, async get(k) { return m.has(k) ? m.get(k) : null; }, async put(k, v) { m.set(k, String(v)); }, async list() { return { keys: [...m.keys()].map((name) => ({ name })), list_complete: true }; }, async delete(k) { m.delete(k); } }; }
const TOKEN = "proba-v100336-pachet-token-123456";
const IB = await import("../functions/api/istoric-bot.js");
let ip = 0;
const get = (env, q, tok = TOKEN) => IB.onRequestGet({ request: new Request("https://radar.test/api/istoric-bot?" + q, { headers: Object.assign({ origin: "https://radar.test", "x-forwarded-for": "10.36.0." + (++ip % 250) }, tok ? { authorization: "Bearer " + tok } : {}) }), env });
const ACUM = Date.now();
const KV = {
  clasament: { la: ACUM - 600000, monede: [{ simbol: "BTC_USDT_PERP", scor: 1 }] }, "clasament:stare": { esecuri: 0 },
  "piata:funding": { la: ACUM, l: [1, 2] }, "piata:instantanee": [{ zi: "2026-11-13", fg: 20 }],
  cont: { la: ACUM - 3600000, cont: { la: ACUM - 3600000, valoare: { total: 25000 } } }, "cont:zile": [{ zi: "2026-11-12" }],
  config: { frana: { pierderi: 3 } }, sugestii: { la: ACUM, zi: "2026-11-13" }, "verdicte:calibrare": { la: ACUM, calibrare: [] },
  "sugestii:trend12": { la: ACUM, top: [1] }, "sugestii:sectoare": { la: ACUM, sectoare: [] }, latime: { acum: { la: ACUM }, istoric: [] }, "largime-crypto": { la: ACUM, largime: { x: 1 } }
};
const PARTI = ["clasament", "piata", "cont", "contZile", "config", "sugestii", "verdicteCalibrare", "trend12", "sectoareTop", "latime", "largimeCrypto"];

await test("1 paritate: fiecare parte = răspunsul cererii ei", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals(KV) };
  const r = await get(env, "action=pachet");
  assert.equal(r.status, 200, "pachetul nu există");
  const p = await r.json();
  assert.ok(p.la > 0 && p.parti, "fără la / parti");
  for (const a of PARTI) {
    const unu = await (await get(env, "action=" + a + (a === "sugestii" ? "&scurt=1" : ""))).json();
    assert.deepEqual(p.parti[a], unu, "partea " + a + " diferă de cererea ei");
  }
});
await test("2 KV gol: părțile goale ca rutele lor, pachetul nu pică", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals({}) };
  const p = await (await get(env, "action=pachet")).json();
  assert.equal(Object.keys(p.parti).length, PARTI.length);
  assert.equal(p.parti.clasament.clasament, null);
  assert.equal(p.parti.largimeCrypto.largime, null);
});
await test("3 fără parolă: refuzat", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals(KV) };
  const r = await get(env, "action=pachet", "");
  assert.ok(r.status === 401 || r.status === 403, "status " + r.status);
});

const EC = citeste("public", "lib", "acasa-ecran.js");
await test("4 pagina: o cerere „pachet”; fiecare parte din el, cu cererea ei ca rezervă", () => {
  const i0 = EC.indexOf("function acDinPachet("); assert.ok(i0 >= 0, "lipsește acDinPachet");
  const din = new Function(EC.slice(i0, EC.indexOf("\n", i0)) + "\nreturn acDinPachet;")();   /* funcția stă pe un rând; după ea vine o „async function” */
  const pk = { parti: { clasament: { clasament: { la: 1 } }, cont: { eroare: "HTTP 500" }, config: { error: "x" } } };
  assert.deepEqual(din(pk, "clasament"), { clasament: { la: 1 } });
  assert.equal(din(pk, "cont"), null); assert.equal(din(pk, "config"), null); assert.equal(din(null, "clasament"), null); assert.equal(din(pk, "latime"), null);
  const porn = fnDin(EC, "acasaPorneste");
  assert.equal((porn.match(/action=pachet/g) || []).length, 1, "pachetul se cere o dată");
  for (const a of PARTI) {
    const re = new RegExp('acDinPachet\\(pk, "' + a + '"\\) \\|\\| (await )?getJSON\\("/api/istoric-bot\\?action=' + a + '[&"]');
    assert.match(porn, re, "partea " + a + " nu se ia din pachet cu rezerva ei");
  }
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
