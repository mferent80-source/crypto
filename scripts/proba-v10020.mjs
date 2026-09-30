// Proba v100.20 / colector v101.10 (30.09, el: „fă și ambele idei”): tabelul „Gridul după planul tău” din laborator
//   A) are si moneda BOTULUI CARE RULEAZA (chiar daca nu e in top 20), primul rand, marcat „botul tău” (+ cat are acum botul);
//   B) are si SHORT langa long (comutator Long / Short).
import assert from "node:assert/strict";
import fs from "node:fs";
import { turaLaborator } from "./lib/tura-laborator.mjs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const GridPlan = new Function("GridCalcul", "GridProba", `${lib("grid-plan.js")}; return GridPlan;`)(GridCalcul, GridProba);
const GridLaborator = new Function("GridCalcul", "GridProba", `${lib("grid-laborator.js")}; return GridLaborator;`)(GridCalcul, GridProba);
const GridClasament = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(GridCalcul);
const TabloExtra = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(GridCalcul);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.20 · laboratorul: botul tau in tabel + short langa long · proba\n");

const ACUM = Date.UTC(2026, 8, 30, 6), N = 3000;
const DRUM = { UP_USDT_PERP: (i) => Math.exp(0.0004 * i), JOS_USDT_PERP: (i) => Math.exp(-0.0004 * i), LAT_USDT_PERP: (i) => 1 + 0.012 * Math.sin(i / 7), BOT_USDT_PERP: (i) => 4 * (1 + 0.01 * Math.sin(i / 9)) };
const TOP = ["UP_USDT_PERP", "JOS_USDT_PERP", "LAT_USDT_PERP"];   // BOT nu e in top dupa volum
const randuri = (sim) => Array.from({ length: N }, (_, i) => { const f = DRUM[sim], o = f(i), c = f(i + 1); return { time: ACUM - (N - i) * 900000, open: o, close: c, high: Math.max(o, c), low: Math.min(o, c), volume: 1 }; });
const cereri = [];
const cere = async (tip, sim, end) => {
  cereri.push(tip + ":" + (sim || ""));
  if (tip === "tickers") return { data: { tickers: TOP.map((s, k) => ({ symbol: s, amount: String(1e6 - k) })) } };
  const r = randuri(sim).filter((x) => !end || x.time <= end);
  return { data: { klines: r.slice(-500).reverse() } };
};
const DEPS = { cere, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, GridCalcul, GridLaborator, GridClasament, top: 3, H: 2,
  GridPlan, plan: { plus: 5.5, minus: 15.7 }, suma: 103.38, levier: 5, notaPlan: "planul LIGHTER", miscareZi: TabloExtra.miscareZi };

await test("A: moneda botului care ruleaza intra in tabel (nu era in top), marcata botulTau; cea din top se marcheaza fara dublura; intrebarile raman pe top", async () => {
  cereri.length = 0;
  const r = await turaLaborator(Object.assign({}, DEPS, { extraSimboluri: ["BOT_USDT_PERP", "UP_USDT_PERP"] }));
  const m = r.planMonede.monede, pe = Object.fromEntries(m.map((x) => [x.simbol, x]));
  assert.equal(m.length, 4, m.map((x) => x.simbol).join(","));
  assert.equal(pe.BOT_USDT_PERP.botulTau, true); assert.equal(pe.UP_USDT_PERP.botulTau, true); assert.equal(pe.JOS_USDT_PERP.botulTau, false);
  assert.equal(m.filter((x) => x.simbol === "UP_USDT_PERP").length, 1);
  assert.equal(r.monede, 3, "intrebarile laboratorului raman pe top");
  assert.ok(cereri.some((c) => c === "klines:BOT_USDT_PERP"), "lumanarile botului n-au fost cerute");
});

await test("B: fiecare moneda are si SHORT (taS, meaS): pe cadere shortul iese pe tinta, pe urcare pe stop", async () => {
  const r = await turaLaborator(DEPS), pe = Object.fromEntries(r.planMonede.monede.map((x) => [x.simbol, x]));
  assert.ok(pe.JOS_USDT_PERP.taS && pe.JOS_USDT_PERP.meaS, "short lipseste");
  assert.equal(pe.JOS_USDT_PERP.taS.tinta, pe.JOS_USDT_PERP.taS.n);
  assert.equal(pe.UP_USDT_PERP.taS.stop, pe.UP_USDT_PERP.taS.n);
  assert.ok(pe.JOS_USDT_PERP.taS.jos < 0 && pe.JOS_USDT_PERP.taS.sus > 0);
});

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
async function cheama(metoda, qs, env, corp) {
  const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.2." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN };
  if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env });
  return { status: res.status, d: await res.json() };
}

await test("serverul pastreaza botulTau (doar true) si short-ul (taS, meaS), curatate", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const v = { levier: 5, jos: -0.04, sus: 0.04, n: 109, stop: 50, tinta: 59, inGrid: 0, lichidari: 0, mediaUsdt: -1, oreTipic: 7 };
  const w = await cheama("POST", "action=laborator", env, { la: Date.now(), H: 2, monede: 3, ferestre: 9, intrebari: [], planMonede: { dir: "long", plan: { plus: 5.5, minus: 15.7 }, suma: 103.38, levier: 5, nota: "n",
    monede: [{ simbol: "LIT_USDT_PERP", botulTau: true, ta: v, mea: v, taS: Object.assign({}, v, { mediaUsdt: "2" }), meaS: null }, { simbol: "BTC_USDT_PERP", botulTau: "da", ta: v, mea: v }] } });
  assert.equal(w.status, 200);
  const pm = (await cheama("GET", "action=laborator", env)).d.laborator.planMonede;
  assert.equal(pm.monede[0].botulTau, true); assert.equal(pm.monede[1].botulTau, false);
  assert.equal(pm.monede[0].taS.mediaUsdt, 2); assert.strictEqual(pm.monede[0].meaS, null); assert.strictEqual(pm.monede[1].taS, null);
});

await test("colectorul da laboratorului monedele botilor care ruleaza (extraSimboluri din /api/bot-orders)", () => {
  const src = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(src, /turaLaboratorModul\(\{[^}]*extraSimboluri[^}]*\}/);
  assert.match(src, /simbolPionex/);
});

await test("pagina: comutator Long / Short, randul botului primul si marcat „botul tău”", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /function grLabPlanDir\(/);
  assert.match(app, /data-action-click="grLabPlanDir\(\\'short\\'\)"|grLabPlanDir\(\\\x27short\\\x27\)/);
  assert.match(app, /botul tău/);
  // se deseneaza cu setul ales: pe short citeste taS / meaS
  const inceput = app.indexOf("function grLabPlanHtml("), corp = app.slice(inceput, app.indexOf("\nfunction ", inceput + 10));
  assert.match(corp, /taS/); assert.match(corp, /meaS/); assert.match(corp, /botulTau/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
