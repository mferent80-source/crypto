// Proba v100.344 · partea 2 (16.11.2026, el a ales „Costuri de acum”): lista „Pe ce aș porni un bot” răspunde la starea de ACUM fără să inventeze
// un avantaj - auditul a arătat că scorul e o trăsătură a monedei pe 83 de zile (14 monede în 11 zile; aceeași repetare și pe mers aleator),
// iar azi 4 din 5 erau sub 1 M USDT/zi și toate short (35 din 55 de notări erau și în lista „Short” scoasă pe 01.11). Regula nouă, scrisă înainte:
//   1. doar candidații cu volum ≥ 1 M USDT/zi;
//   2. câștigul pe 7 zile estimat = 7 × scor − s × funding-ul pe 7 zile × 0,5 (s = +1 long, −1 short, 0 neutru; expunerea medie a unui grid
//      direcționat ≈ jumătate) - funding-ul la rata medie din ultimele 7 zile (GridSim.rataFunding, același motor ca Simulatorul);
//   3. cel mult 2 pe aceeași direcție (restul ar fi același pariu);
//   4. colectorul aduce funding-ul doar pentru primii 20 lichizi, ținut 4 ore (fără cereri Pionex în plus la fiecare oră).
//   node scripts/proba-v100344-boti.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deTrimis, adaugaFunding } from "./lib/tura-clasament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.344 · Pe ce aș porni un bot: costurile de acum · proba\n");

const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "grid-calcul.js") + "\n" + citeste("public", "lib", "idei.js") + "\nthis.Idei = Idei;", ctx);
const Idei = ctx.Idei;
const m = (s, o) => Object.assign({ simbol: s + "_USDT_PERP", stare: "candidat", dir: "short", tarie: "tare", volum: 5e6, scor: 0.001, f7: 0 }, o);

await test("🔑 sub 1 M USDT/zi nu intră, oricât de mare e scorul", () => {
  const l = Idei.ideiBoti({ monede: [m("ATOM", { volum: 0.1e6, scor: 0.01 }), m("BTC", { volum: 4e9, scor: 0.001 })] }, [], 5);
  assert.deepEqual([...l.map((x) => x.moneda)], ["BTC"]);
});
await test("🔑 cel mult 2 pe aceeași direcție: 5 short-uri lichide ⇒ 2 short + restul din alte direcții", () => {
  const c = { monede: [m("A", { scor: 0.005 }), m("B", { scor: 0.004 }), m("C", { scor: 0.0035 }), m("D", { scor: 0.003 }), m("L", { dir: "long", scor: 0.001 }), m("N", { dir: "neutru", scor: 0.0009 }), m("L2", { dir: "long", scor: 0.0008 }), m("L3", { dir: "long", scor: 0.0007 })] };
  const l = Idei.ideiBoti(c, [], 5);
  assert.deepEqual([...l.map((x) => x.moneda)], ["A", "B", "L", "N", "L2"]);
  const info = Idei.ideiBotiInfo(c, 5);
  assert.equal(info.sarite, 2); assert.equal(info.subPrag, 0);
});
await test("🔑 funding-ul pe 7 zile intră în ordine: short încasează funding pozitiv, long îl plătește (expunerea 0,5)", () => {
  const c = { monede: [m("S", { dir: "short", scor: 0.001, f7: 0.004 }), m("L", { dir: "long", scor: 0.0012, f7: 0.004 })] };
  const l = Idei.ideiBoti(c, [], 5);
  // S: 0,007 + 0,002 = 0,009 ; L: 0,0084 − 0,002 = 0,0064
  assert.deepEqual([...l.map((x) => x.moneda)], ["S", "L"]);
  assert.ok(Math.abs(l[0].net7 - 0.009) < 1e-12); assert.ok(Math.abs(l[1].net7 - 0.0064) < 1e-12);
});
await test("revizia Opus: funding NECERUT (colectorul vechi, f7 lipsă) ≠ funding care n-a putut fi citit (f7 = null)", () => {
  const l = Idei.ideiBoti({ monede: [m("U", { f7: undefined, scor: 0.002 }), m("N", { f7: null, scor: 0.001, dir: "long" })] }, [], 5);
  assert.equal(l[0].fNecerut, true); assert.equal(l[0].fNecitit, false); assert.equal(l[1].fNecitit, true); assert.equal(l[1].fNecerut, false);
});
await test("funding necitit ⇒ ordinea doar după scor pentru moneda aceea, marcat „fNecitit”, nu 0 tăcut", () => {
  const l = Idei.ideiBoti({ monede: [m("X", { f7: null, scor: 0.002 })] }, [], 5);
  assert.equal(l[0].fNecitit, true); assert.ok(Math.abs(l[0].net7 - 0.014) < 1e-12);
});
await test("neutru nu plătește și nu încasează funding (s = 0)", () => {
  const l = Idei.ideiBoti({ monede: [m("N", { dir: "neutru", scor: 0.001, f7: 0.01 })] }, [], 5);
  assert.ok(Math.abs(l[0].net7 - 0.007) < 1e-12);
});
await test("info: câți candidați sunt sub prag și câți au fost săriți ca același pariu", () => {
  const info = Idei.ideiBotiInfo({ monede: [m("A", { volum: 0.5e6 }), m("B"), m("C"), m("D")] }, 5);
  assert.equal(info.subPrag, 1); assert.equal(info.sarite, 1); assert.equal(info.lista.length, 2);
});

// ── colectorul ──
const ratele = (rZi, n, acum) => Array.from({ length: n }, (_, i) => ({ fundingTime: acum - i * 8 * 3600000, fundingRate: rZi / 3 }));
await test("🔑 colectorul pune f7 = 7 × rata pe zi (GridSim.rataFunding) pe toți candidații lichizi (cel mult 40; revizia Opus: înainte doar primii 20 după scor); ținut 4 ore", async () => {
  const acum = Date.parse("2026-11-16T08:00:00Z"), cereri = [];
  const GridSim = { rataFunding: (rates) => (rates && rates.length ? { rataZi: rates.reduce((s, z) => s + z.fundingRate, 0) / 7, veche: false } : null) };
  const mon = Array.from({ length: 30 }, (_, i) => m("C" + i, { scor: 0.01 - i * 1e-4, volum: i === 3 ? 0.2e6 : 5e6 })).concat([m("EV", { stare: "evita", scor: 1 })]);
  const d = { acum: () => acum, pauza: async () => {}, GridSim, cere: async (u) => { cereri.push(u); return { data: { rates: ratele(0.0003, 21, acum) } }; } };
  await adaugaFunding(mon, d);
  assert.equal(cereri.length, 29); assert.ok(!cereri.some((u) => /C3_USDT|EV_USDT/.test(u)), "a cerut pentru sub prag / de evitat");
  assert.ok(Math.abs(mon[0].f7 - 7 * (21 * 0.0001) / 7) < 1e-12);
  cereri.length = 0; await adaugaFunding(mon, d); assert.equal(cereri.length, 0, "în 4 ore nu se cere din nou");
  d.acum = () => acum + 4 * 3600000 + 1; await adaugaFunding(mon, d); assert.equal(cereri.length, 29);
});
await test("o cerere de funding picată ⇒ f7 = null pe moneda aceea, restul merg", async () => {
  const mon = [m("P1", { scor: 0.002 }), m("P2", { scor: 0.001 })];
  const d = { acum: () => Date.parse("2026-11-20T08:00:00Z"), pauza: async () => {}, GridSim: { rataFunding: () => ({ rataZi: 0.001, veche: false }) },
    cere: async (u) => { if (/P1_/.test(u)) throw new Error("Pionex 429"); return { data: { rates: [1, 2] } }; } };
  await adaugaFunding(mon, d);
  assert.equal(mon[0].f7, null); assert.ok(Math.abs(mon[1].f7 - 0.007) < 1e-12);
});
await test("🔑 f7 ajunge pe server: deTrimis îl trimite, ruta îl păstrează", async () => {
  assert.equal(deTrimis(m("Z", { f7: 0.00123456 })).f7, 0.00123456);
  const TOKEN = "t-344", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const req = new Request("https://exemplu.test/api/istoric-bot?action=clasament", { method: "POST", headers: { "cf-connecting-ip": "10.0.3.44", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify({ la: Date.now(), monede: [deTrimis(m("Z", { f7: 0.00123 }))] }) });
  const r = await mod.onRequestPost({ request: req, env });
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(kv.get("clasament")).monede[0].f7, 0.00123);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
