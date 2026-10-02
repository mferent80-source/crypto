// Proba v100.80 (colectorul) - rețeaua neuronală, livrarea 1: Retea.pentruBot / pentruPornire (codurile 🎲, semnele la short, fără
// modele -> nimic), istoria de 400 de zile (paginile, bugetul, „Pionex nu mai are”), tura de noapte (antrenorul care pică lasă modelele de
// ieri), rez.retea în pachetul 🎲, ruta `retea`, colectorul se încarcă întreg.
//   node scripts/proba-v10080-colector.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { bare } from "./lib/bare-proba.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const ActiuniSemnale = new Function("GridCalcul", lib("actiuni-semnale.js") + "; return ActiuniSemnale;")(GridCalcul);
const Probabilitati = new Function("GridCalcul", "ActiuniSemnale", lib("probabilitati.js") + "; return Probabilitati;")(GridCalcul, ActiuniSemnale);
const TabloExtra = new Function("GridCalcul", lib("tablou-extra.js") + "; return TabloExtra;")(GridCalcul);
const Retea = new Function("Probabilitati", lib("retea.js") + "; return Retea;")(Probabilitati);
const { aduInapoi, turaRetea } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-retea.mjs")).href);
const { turaProbabilitati } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs")).href);
const ORA = 3600000;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
// un model care zice mereu 50% (W zero, bias 0), cu numărul potrivit de intrări pe țintă
const N_IN = { "atinge-24": 20, "atinge-72": 20, "atinge-168": 20, cursa: 21, liniste: 18, directie: 17, rezultat: 26 };
const model = (t, v) => ({ tinta: t, versiune: v || Retea.VERSIUNE, la: Date.now(), norm: { m: Array(N_IN[t]).fill(0), s: Array(N_IN[t]).fill(1) }, ansamblu: [[{ W: Array.from({ length: N_IN[t] }, () => [0]), b: [0], act: "sigmoid" }]], verificare: null });
const MODELE = Object.fromEntries(Object.keys(N_IN).map((t) => [t, model(t)]));
console.log("Proba v100.80 (colectorul) · pentruBot, istoria, tura de noapte, rez.retea, ruta");
const acum = Date.UTC(2026, 9, 4, 12), b = bare(1400, { seed: 41, t0: acum - 1400 * ORA }), c = b[b.length - 1].c;

await test("(7) pentruBot pe un long: codurile 🎲 (marginile 24/72 h, lichidarea JOS, cursa) + direcția; fără modele -> null; altă versiune -> null", () => {
  const o = { acum, pret: c, dir: "long", jos: c * 0.95, sus: c * 1.05, lichidare: c * 0.7, tinta: c * 1.08, stop: c * 0.92 };
  const r = Retea.pentruBot(MODELE, b, o, null);
  for (const k of ["iese-jos-24", "iese-sus-24", "iese-jos-72", "iese-sus-72", "lichidare", "cursa", "directie-24"]) assert.equal(r.p[k], 0.5, k);
  assert.equal(r.v, Retea.VERSIUNE); assert.equal(r.la, acum);
  assert.equal(Retea.pentruBot(null, b, o, null), null);
  assert.equal(Retea.pentruBot(Object.fromEntries(Object.keys(N_IN).map((t) => [t, model(t, "r0")])), b, o, null), null);
});

await test("(7) pe un short: lichidarea e SUS (apare); o lichidare JOS la short nu dă cod; cursa cu ținta JOS și stopul SUS", () => {
  const sh = Retea.pentruBot(MODELE, b, { acum, pret: c, dir: "short", jos: c * 0.95, sus: c * 1.05, lichidare: c * 1.3, tinta: c * 0.92, stop: c * 1.08 }, null);
  assert.equal(sh.p.lichidare, 0.5); assert.equal(sh.p.cursa, 0.5);
  const rau = Retea.pentruBot(MODELE, b, { acum, pret: c, dir: "short", jos: c * 0.95, sus: c * 1.05, lichidare: c * 0.7 }, null);
  assert.ok(!("lichidare" in rau.p) && !("cursa" in rau.p));
});

await test("(7) pentruPornire: rezultatul tău la pornire (prețul = închiderea barei de dinainte), cu rata ta; fără modelul „rezultat” -> null", () => {
  const t = { moneda: "AAA", dir: "long", levier: 3, jos: c * 0.9, sus: c * 1.1, pasNet: 0.004, pus: 40, pornit: acum - 48 * ORA };
  const r = Retea.pentruPornire(MODELE, t, b, null, [{ moneda: "AAA", net: 1, inchis: acum - 100 * ORA }]);
  assert.deepEqual(r, { p: 0.5, rata: Math.round((1 + 10 * 1) / 11 * 1000) / 1000, n: 1 });
  assert.equal(Retea.pentruPornire({ directie: MODELE.directie }, t, b, null, []), null);
});

// ---- istoria de 400 de zile: o serie Pionex de 450 de zile; Pionex refuză endTime mai vechi de 420 de zile
const SERIE = bare(450 * 24, { seed: 43, t0: acum - 450 * 24 * ORA }).map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
const pionex = (limitaZile) => async (s, end) => {
  if (end && end < acum - limitaZile * 864e5) return { result: false, code: "MARKET_INVALID_TIME", message: "endTime param error" };
  const pana = end || acum, l = SERIE.filter((r) => r.time <= pana).slice(-500).reverse(); return { result: true, data: { klines: l } };
};
await test("(7) aduInapoi: pornește de la ce e pe disc (185 de zile), aduce paginile mai vechi până la 400 de zile + pagina nouă; bugetul scade", async () => {
  const pe185 = SERIE.slice(-185 * 24), buget = { pagini: 50 };
  const r = await aduInapoi("AAA_USDT_PERP", pe185, { acum, cereKlines: pionex(420), pauza: async () => {} }, buget);
  assert.equal(r.complet, true); assert.ok(r.randuri[0].time <= acum - 400 * 864e5, new Date(r.randuri[0].time).toISOString());
  assert.equal(buget.pagini, 50 - r.pagini); assert.ok(r.pagini >= 11 && r.pagini <= 13, String(r.pagini));
  for (let i = 1; i < r.randuri.length; i++) assert.ok(r.randuri[i].time > r.randuri[i - 1].time, "ordinea / dublurile");
});
await test("(7) aduInapoi: bugetul mic se oprește la jumătate (incomplet); Pionex fără bare mai vechi -> complet; eroarea se spune", async () => {
  const b3 = { pagini: 3 }, r = await aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: pionex(420), pauza: async () => {} }, b3);
  assert.equal(r.complet, false); assert.equal(b3.pagini, 0);
  const s = await aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: pionex(30), pauza: async () => {} }, { pagini: 50 });
  assert.equal(s.complet, true, "MARKET_INVALID_TIME = nu mai are");
  await assert.rejects(aduInapoi("AAA_USDT_PERP", [], { acum, cereKlines: async () => ({ result: false, message: "boom" }), pauza: async () => {} }, { pagini: 5 }), /boom/);
});

// ---- tura de noapte
function deps(o = {}) {
  const j = [], urcat = [], scrise = {}, d = { acum, stare: o.stare || {}, forta: !!o.forta, eNoapte: () => !!o.noapte, ziRo: () => "2026-10-04", simboluri: ["AAA_USDT_PERP", "BTC_USDT_PERP"],
    cereKlines: pionex(420), pauza: async () => {}, citesteOre: () => SERIE.slice(-185 * 24), scrieOre: (s, r) => { scrise[s] = r.length; },
    boti: async () => [{ id: "1" }], scrieBoti: () => {}, porneste: async () => ({ cod: o.cod ?? 0, minute: 12 }), citesteModele: () => ({ la: 1, versiune: "r1", modele: { directie: { x: 1 } } }),
    trimite: async (u, corp) => urcat.push({ u, corp }), jurnal: (...a) => j.push(a.join(" ")), scrieStare: () => {} };
  return { d, j, urcat, scrise };
}
await test("(7) tura: ziua fără noapte și fără steag nu face nimic; noaptea - istoria, boții, antrenorul, modelele urcate, o dată pe zi", async () => {
  const z = deps(); assert.equal(await turaRetea(z.d), null); assert.equal(z.urcat.length, 0);
  const n = deps({ noapte: true }); assert.deepEqual(await turaRetea(n.d), { cod: 0 });
  assert.deepEqual(Object.keys(n.scrise).sort(), ["AAA_USDT_PERP", "BTC_USDT_PERP"]);
  assert.equal(n.urcat.length, 1); assert.match(n.urcat[0].u, /action=retea$/); assert.deepEqual(Object.keys(n.urcat[0].corp.modele), ["directie"]);
  assert.equal(await turaRetea(n.d), null, "a doua oară în aceeași zi");
});
await test("(7) antrenorul care pică: nimic urcat, modelele de ieri rămân, jurnalul spune; steagul pornește tura și ziua", async () => {
  const p = deps({ forta: true, cod: 1 }); assert.deepEqual(await turaRetea(p.d), { cod: 1 });
  assert.equal(p.urcat.length, 0); assert.ok(p.j.some((l) => /nimic urcat, modelele de ieri rămân/.test(l)), p.j.join("\n"));
});
await test("(7) monedele complete nu se mai cer (doar BTC, care nu e în istoric-1h, se ține la zi)", async () => {
  const k = deps({ noapte: true, stare: { complete: { AAA_USDT_PERP: true } } }); await turaRetea(k.d);
  assert.deepEqual(Object.keys(k.scrise), ["BTC_USDT_PERP"]);
});

// ---- rez.retea în pachetul 🎲 (tura-probabilitati), cu dependențe false
const RANDURI = b.map((q) => ({ time: q.t, open: String(q.o), close: String(q.c), high: String(q.h), low: String(q.l), volume: "1" }));
async function prob(extra) {
  const trimise = [], bot = { id: "b1", baza: "AAA.PERP", directie: "long", pretCurent: c, gridJos: c * 0.95, gridSus: c * 1.05, lichidareJos: c * 0.7, levier: 3, investit: 50, pornitLa: acum - 240 * ORA, activ: true };
  await turaProbabilitati({ acum, boti: [bot], GridCalcul, Probabilitati, TabloExtra, cere: async () => ({ data: { klines: [] } }), trimite: async (u, corp) => trimise.push(corp), jurnal: () => {}, stare: {},
    simbolDe: () => "AAA_USDT_PERP", planDe: async () => null, citesteBare: () => RANDURI, scrieBare: () => {}, scrieStare: () => {}, pauza: async () => {}, ...extra });
  return trimise.find((x) => x && x.bot === "b1");
}
await test("(7) tura 🎲: cu modele, rez.retea are codurile și rezultatul la pornire; fără modele, nicio cheie retea (pagina publicată, prima noapte)", async () => {
  const cu = await prob({ Retea, modele: MODELE, btc: null, pornireDe: () => ({ p: 0.41, rata: 0.52, n: 431 }) });
  assert.ok(cu && cu.rez.retea && cu.rez.retea.p["iese-jos-24"] === 0.5 && cu.rez.retea.p["directie-24"] === 0.5, JSON.stringify(cu && cu.rez.retea));
  assert.deepEqual(cu.rez.retea.pornire, { p: 0.41, rata: 0.52, n: 431 });
  const fara = await prob({ Retea, modele: null });
  assert.ok(fara && fara.rez && !("retea" in fara.rez), JSON.stringify(fara && fara.rez).slice(0, 200));
});

// ---- ruta `retea` (KV fals)
function kvFals() { const m = new Map(); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "token-de-proba-v10080";
async function cheama(metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.79", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/istoric-bot?" + qs, { method: metoda, headers: h, body: corp ? (typeof corp === "string" ? corp : JSON.stringify(corp)) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}
await test("(7) ruta retea: se scrie și se citește înapoi; peste 512 KB -> 413; modele nevalide / fără versiune -> 400", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await cheama("GET", "action=retea", env)).d.retea, null);
  const p = await cheama("POST", "action=retea", env, { la: 5, versiune: "r1", modele: { directie: MODELE.directie } }); assert.equal(p.status, 200, JSON.stringify(p.d));
  const g = (await cheama("GET", "action=retea", env)).d.retea; assert.equal(g.versiune, "r1"); assert.deepEqual(g.modele.directie.norm, MODELE.directie.norm);
  assert.equal((await cheama("POST", "action=retea", env, JSON.stringify({ versiune: "r1", modele: { x: "y".repeat(530000) } }))).status, 413);
  assert.equal((await cheama("POST", "action=retea", env, { versiune: "r1", modele: { d: { norm: { m: [0] }, ansamblu: [1, 2, 3, 4, 5, 6] } } })).status, 400);
  assert.equal((await cheama("POST", "action=retea", env, { modele: { directie: MODELE.directie } })).status, 400);
});

await test("(7) colectorul se încarcă întreg (cu Retea și tura de noapte)", () => {
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/);
});

console.log("\n" + (pica ? "V100.80 COLECTOR PICA · " + pica + " din " + (ok + pica) : "V100.80 COLECTOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
