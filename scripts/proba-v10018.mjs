// Proba v100.18 / colector v101.9 (30.09, el: „ok, fă ideile” - ideea 3): laboratorul de acasa (o data pe zi, top 20 PERP, ~31 de
// zile de 15M pe moneda, deja aduse) ruleaza si „gridul dupa planul tau” pe fiecare moneda - long, cu planul lui cel mai nou, suma si
// levierul botului acela - iar pagina Grid arata tabelul: pe care monede a ta / a mea a iesit pe plus luna asta.
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
console.log("\nV100.18 · laboratorul: gridul dupa plan pe top monede · proba\n");

// Pionex fals: 3 monede, 6 pagini x 500 de lumanari de 15M (~31 zile), cea mai noua pagina intai
const ACUM = Date.UTC(2026, 8, 30, 6), N = 3000;
const DRUM = { UP_USDT_PERP: (i) => 1 * Math.exp(0.0004 * i), JOS_USDT_PERP: (i) => 1 * Math.exp(-0.0004 * i), LAT_USDT_PERP: (i) => 1 + 0.012 * Math.sin(i / 7) };
const randuri = (sim) => Array.from({ length: N }, (_, i) => { const f = DRUM[sim], o = f(i), c = f(i + 1); return { time: ACUM - (N - i) * 900000, open: o, close: c, high: Math.max(o, c), low: Math.min(o, c), volume: 1 }; });
const cere = async (tip, sim, end) => {
  if (tip === "tickers") return { data: { tickers: Object.keys(DRUM).map((s, k) => ({ symbol: s, amount: String(1e6 - k) })) } };
  const r = randuri(sim).filter((x) => !end || x.time <= end), pag = r.slice(-500);
  return { data: { klines: pag.slice().reverse() } };
};
const DEPS = { cere, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, GridCalcul, GridLaborator, GridClasament, top: 3, H: 2 };

await test("laboratorul cu GridPlan + planul lui: pe fiecare moneda cele doua variante (long) cu proba pe 30 de zile", async () => {
  const r = await turaLaborator(Object.assign({}, DEPS, { GridPlan, plan: { plus: 5.5, minus: 15.7 }, suma: 103.38, levier: 5, notaPlan: "după planul tău de la LIGHTER", miscareZi: TabloExtra.miscareZi }));
  const pm = r.planMonede;
  assert.ok(pm && pm.monede.length === 3, JSON.stringify(pm && pm.monede.length));
  assert.equal(pm.dir, "long"); assert.equal(pm.suma, 103.38); assert.equal(pm.levier, 5); assert.deepEqual(pm.plan, { plus: 5.5, minus: 15.7 });
  const m = Object.fromEntries(pm.monede.map((x) => [x.simbol, x]));
  assert.equal(m.UP_USDT_PERP.ta.tinta, m.UP_USDT_PERP.ta.n, "urcarea iese pe tinta");
  assert.equal(m.JOS_USDT_PERP.ta.stop, m.JOS_USDT_PERP.ta.n, "caderea iese pe stop");
  assert.equal(m.LAT_USDT_PERP.ta.inGrid, m.LAT_USDT_PERP.ta.n, "lateral ramane in grid");
  assert.ok(m.JOS_USDT_PERP.ta.mediaUsdt < -10, `${m.JOS_USDT_PERP.ta.mediaUsdt}`);
  assert.ok(m.UP_USDT_PERP.mea && m.UP_USDT_PERP.mea.levier >= 1, "varianta mea lipseste");
  assert.ok(m.UP_USDT_PERP.ta.sus > 0 && m.UP_USDT_PERP.ta.jos < 0, "banda ca fractie fata de pret");
});

await test("fara GridPlan / fara plan -> laboratorul de dinainte, neatins (planMonede null)", async () => {
  const r = await turaLaborator(DEPS);
  assert.strictEqual(r.planMonede, null);
  assert.ok(Array.isArray(r.intrebari) && r.monede === 3);
});

// ruta istoric-bot, cu un KV fals (ca in colector-v77)
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
async function cheama(metoda, qs, env, corp) {
  const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.1." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN };
  if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env });
  return { status: res.status, d: await res.json() };
}

await test("serverul pastreaza planMonede CURATAT (simbol doar A-Z0-9_, numere sau null, cel mult 30) si il da inapoi", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const v = { levier: 5, jos: -0.04, sus: 0.042, laStop: -15.7, laTinta: 5.5, n: 109, stop: 54, tinta: 55, inGrid: 0, lichidari: 0, mediaUsdt: "-3.1", oreTipic: 6 };
  const monede = [{ simbol: "LIT_USDT_PERP", ta: v, mea: Object.assign({}, v, { levier: 2, mediaUsdt: null }) }, { simbol: "<b>X</b>_USDT_PERP", ta: v, mea: null }, "gunoi"]
    .concat(Array.from({ length: 40 }, (_, k) => ({ simbol: "M" + k + "_USDT_PERP", ta: v, mea: v })));
  const w = await cheama("POST", "action=laborator", env, { la: Date.now(), H: 2, monede: 20, ferestre: 100, intrebari: [], planMonede: { dir: "long", plan: { plus: 5.5, minus: 15.7 }, suma: 103.38, levier: 5, nota: "după planul tău de la LIGHTER", monede } });
  assert.equal(w.status, 200, JSON.stringify(w.d));
  const r = (await cheama("GET", "action=laborator", env)).d.laborator, pm = r.planMonede;
  assert.equal(pm.monede.length, 30);
  assert.equal(pm.monede[0].simbol, "LIT_USDT_PERP"); assert.equal(pm.monede[0].ta.mediaUsdt, -3.1); assert.strictEqual(pm.monede[0].mea.mediaUsdt, null);
  assert.equal(pm.monede[1].simbol, "BXB_USDT_PERP"); assert.strictEqual(pm.monede[1].mea, null);
  assert.equal(pm.nota, "după planul tău de la LIGHTER"); assert.equal(pm.levier, 5);
});

await test("colectorul incarca grid-plan.js si da laboratorului GridPlan + planul lui (ultimulPlan, suma si levierul botului)", () => {
  const src = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.match(src, /grid-plan\.js/);
  assert.match(src, /turaLaboratorModul\(\{[^}]*GridPlan[^}]*\}/);
  assert.match(src, /async function planulPentruProbe\(/);
  assert.match(src, /action=ultimulPlan/);
});

await test("pagina Grid arata tabelul in laborator (clic pe moneda = fisa ei)", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /function grLabPlanHtml\(/);
  assert.match(app, /grLabPlanHtml\(L\.planMonede\)/);
  assert.match(app, /Gridul după planul tău, pe cele/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
