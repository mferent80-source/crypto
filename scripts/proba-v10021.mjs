// Proba v100.21 / colector v101.11 (30.09, el: „fa si ideile”): tabelul „Gridul după planul tău” din laborator
//   1) arata si CEA MAI PROASTA pornire (riscul, nu doar media) - si in blocul de pe pagina Grid / Tablou;
//   2) laboratorul pe DOUA LUNI (60 de zile de 15M, 12 pagini), ca o moneda sa nu fie judecata dupa o singura luna.
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
console.log("\nV100.21 · cea mai proasta pornire + laboratorul pe doua luni · proba\n");

const ZI = 96, bare = (f, n) => Array.from({ length: n }, (_, i) => { const o = f(i), c = f(i + 1); return { t: i * 900000, o, c, h: Math.max(o, c), l: Math.min(o, c) }; });
const CADE = bare((i) => 4.473 * Math.exp(-0.0012 * i), 65 * ZI), LAT = bare((i) => 4.473 * (1 + 0.012 * Math.sin(i / 7)), 65 * ZI);
const O = (x) => Object.assign({ pret: 4.473, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003, b15: LAT }, x || {});

await test("1: proba spune cea mai proasta pornire in USDT (pe cadere ≈ stopul, lateral mult mai putin)", () => {
  const c = GridPlan.variante(O({ b15: CADE })).ta.proba, l = GridPlan.variante(O()).ta.proba;
  assert.ok(c.ceaMaiProastaUsdt < -14 && c.ceaMaiProastaUsdt > -19, `cadere ${c.ceaMaiProastaUsdt}`);
  assert.ok(l.ceaMaiProastaUsdt > c.ceaMaiProastaUsdt && l.ceaMaiProastaUsdt <= l.mediaUsdt, `lateral ${l.ceaMaiProastaUsdt} / media ${l.mediaUsdt}`);
});

await test("2: proba pe 60 de zile cand i se cere (≈ 229 de porniri, ~20 independente); implicit tot 30", () => {
  const p60 = GridPlan.variante(O({ zile: 60 })).ta.proba, p30 = GridPlan.variante(O()).ta.proba;
  assert.equal(p60.zile, 60); assert.equal(p60.independente, 20); assert.ok(p60.n >= 220 && p60.n <= 240, `${p60.n}`);
  assert.equal(p30.zile, 30); assert.equal(p30.n, 109);
  assert.equal(GridPlan.variante(O({ zile: 60, b15: LAT.slice(-40 * ZI) })).ta.proba, null, "prea putine lumanari pentru 60 de zile -> null");
});

// Pionex fals cu 65 de zile: laboratorul cere pana la 12 pagini cand i se spune
const ACUM = Date.UTC(2026, 8, 30, 6), N = 65 * ZI, pagini = {};
const randuri = (sim) => Array.from({ length: N }, (_, i) => { const o = 1 + 0.012 * Math.sin(i / 7), c = 1 + 0.012 * Math.sin((i + 1) / 7); return { time: ACUM - (N - i) * 900000, open: o, close: c, high: Math.max(o, c), low: Math.min(o, c) }; });
const cere = async (tip, sim, end) => {
  if (tip === "tickers") return { data: { tickers: [{ symbol: "LAT_USDT_PERP", amount: "1000" }] } };
  pagini[sim] = (pagini[sim] || 0) + 1;
  const r = randuri(sim).filter((x) => !end || x.time <= end);
  return { data: { klines: r.slice(-500).reverse() } };
};

await test("2: laboratorul cu pagini: 12 si zile: 60 aduce doua luni si scrie zile: 60 in planMonede", async () => {
  const r = await turaLaborator({ cere, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, GridCalcul, GridLaborator, GridClasament, top: 1, H: 2, pagini: 12, zile: 60,
    GridPlan, plan: { plus: 5.5, minus: 15.7 }, suma: 103.38, levier: 5, notaPlan: "n", miscareZi: TabloExtra.miscareZi });
  assert.equal(pagini.LAT_USDT_PERP, 12);
  assert.equal(r.planMonede.zile, 60);
  assert.equal(r.planMonede.monede[0].ta.n > 200, true, `${r.planMonede.monede[0].ta.n}`);
  assert.equal(typeof r.planMonede.monede[0].ta.ceaMaiProastaUsdt, "number");
});

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
async function cheama(metoda, qs, env, corp) {
  const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.3." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN };
  if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env });
  return { status: res.status, d: await res.json() };
}

await test("serverul pastreaza ceaMaiProastaUsdt si zile", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, v = { levier: 5, n: 229, stop: 1, tinta: 2, inGrid: 3, lichidari: 0, mediaUsdt: 1, ceaMaiProastaUsdt: "-15.9", oreTipic: 7 };
  await cheama("POST", "action=laborator", env, { la: Date.now(), H: 2, monede: 1, ferestre: 1, intrebari: [], planMonede: { dir: "long", zile: 60, plan: { plus: 5.5, minus: 15.7 }, suma: 100, levier: 5, nota: "", monede: [{ simbol: "A_USDT_PERP", ta: v, mea: v }] } });
  const pm = (await cheama("GET", "action=laborator", env)).d.laborator.planMonede;
  assert.equal(pm.zile, 60); assert.equal(pm.monede[0].ta.ceaMaiProastaUsdt, -15.9);
});

await test("colectorul cere doua luni (pagini: 12, zile: 60); pagina arata coloana „cea mai proastă” si zilele din date", () => {
  const src = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8"), app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(src, /turaLaboratorModul\(\{[^}]*pagini: 12[^}]*zile: 60[^}]*\}/);
  const i = app.indexOf("function grLabPlanHtml("), corp = app.slice(i, app.indexOf("\nfunction ", i + 10));
  assert.match(corp, /cea mai proastă/); assert.match(corp, /ceaMaiProastaUsdt/); assert.match(corp, /pm\.zile/);
  const j = app.indexOf("function grPlanVarHtml("), corp2 = app.slice(j, app.indexOf("\nfunction ", j + 10));
  assert.match(corp2, /ceaMaiProastaUsdt/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
