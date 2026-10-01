// Proba v100.58 (01.10, el: „griduri înguste cu profit rapid pe coinuri sugerate pe direcție”).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.58 · Griduri înguste · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const M15 = 900000;
// oscilatie curata: perioada 2 h (8 bare), +-1 % in jurul lui 100 -> prețul străbate un interval îngust de multe ori
const osc = (zile, f) => Array.from({ length: zile * 96 }, (_, i) => { const c = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * i / 8)) * (f ? f(i) : 1), o = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * (i - 1) / 8)) * (f ? f(i - 1) : 1); return { t: i * M15, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c }; });
// tendinta in sus puternica, fara oscilatie
const sus = (zile) => Array.from({ length: zile * 96 }, (_, i) => { const o = 100 * 1.0015 ** i, c = 100 * 1.0015 ** (i + 1); return { t: i * M15, o, h: c * 1.0005, l: o * 0.9995, c }; });

await test("oscilatie curata in interval, neutru: gridul ingust e PROPUS, pe plus dupa comisioane, cu >= 30 ferestre independente pe test", () => {
  are(GP.ingust, "GridProba.ingust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 });
  assert.equal(r.propus, true, r.motiv);
  assert.ok(r.test.mediana > 0 && r.test.nIndep >= 30 && r.test.ic[0] > 0.5, JSON.stringify(r.test));
  assert.ok([6, 12, 24].includes(r.ore)); assert.ok(r.setare && r.setare.grile >= 2 && r.setare.pas >= 0.0029, JSON.stringify(r.setare));
  assert.ok(r.test.perechiZi > 0);
});
await test("contra tendintei (short pe urcare puternica): NEpropus, cu motiv", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100 });
  assert.equal(r.propus, false); assert.ok(r.motiv && r.motiv.length > 10, r.motiv);
});
await test("fara privit in viitor: schimbarea barelor de TEST nu schimba celula aleasa (H, latime, pas)", () => {
  const b = osc(40), nA = Math.round(b.length * 2 / 3), b2 = b.map((x, i) => i < nA ? x : { ...x, o: x.o * 1.3, h: x.h * 1.3, l: x.l * 1.3, c: x.c * 1.3 });
  const r1 = GP.ingust(b, { dir: "neutru", pret: 100, suma: 100 }), r2 = GP.ingust(b2, { dir: "neutru", pret: 100, suma: 100 });
  assert.deepEqual([r1.ore, r1.latime, r1.pas], [r2.ore, r2.latime, r2.pas]);
});
await test("ferestrele independente: la 12 h = jumatate din ferestrele de test (pornirile sunt la 6 h)", () => {
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100, doarH: [0.5] });
  assert.equal(r.ore, 12); assert.equal(r.test.nIndep, Math.floor(r.test.n * 24 / 48));
});
await test("miscare mare / fara directie / istoric scurt -> nepropus, fara eroare; setarea pe pretul de ACUM", () => {
  assert.match(GP.ingust(osc(40), { dir: "long", miscare: true, pret: 100 }).motiv, /mișcare/);
  assert.equal(GP.ingust(osc(40), { dir: null, pret: 100 }).propus, false);
  assert.match(GP.ingust(osc(5), { dir: "neutru", pret: 100 }).motiv, /prea puțin istoric/);
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 120, suma: 100 });
  assert.ok(r.setare.jos < 120 && r.setare.sus > 120, "construita pe pretul de acum");
});
await test("toate celulele lichidate (levier urias) -> nepropus cu motiv, nu crapa", () => {
  const r = GP.ingust(sus(40), { dir: "short", pret: 100, suma: 100, levier: 100 });
  assert.equal(r.propus, false); assert.ok(typeof r.motiv === "string");
});
await test("rezumatul pentru idei: directie, interval, linii N+1, durata, cifrele de pe test; nepropus -> motivul", () => {
  are(GP.rezumatIngust, "GridProba.rezumatIngust");
  const r = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 }), t = GP.rezumatIngust(r);
  assert.match(t, /neutru/i); assert.match(t, new RegExp((r.setare.grile + 1) + " linii")); assert.match(t, new RegExp(r.ore + " h")); assert.match(t, /pe plus/);
  assert.match(GP.rezumatIngust({ propus: false, motiv: "ceva anume" }), /ceva anume/);
});

await test("ruta ingust: POST + GET pastreaza rezultatul (curatat); colectorul il calculeaza pe <= 5 monede sugerate, 12 pagini, la 6 h", async () => {
  const { pathToFileURL } = await import("node:url");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const ing = GP.ingust(osc(40), { dir: "neutru", pret: 100, suma: 100 });
  const p = await mod.onRequestPost({ request: cer("POST", "action=ingust", { simbol: "CRV_USDT_PERP", ingust: { ...ing, la: 5, zile: 40, rau: "<script>" } }), env });
  assert.equal(p.status, 200);
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=ingust&simbol=CRV_USDT_PERP"), env })).json();
  assert.equal(g.ingust.propus, ing.propus); assert.equal(g.ingust.ore, ing.ore); assert.equal(g.ingust.setare.grile, ing.setare.grile); assert.equal(g.ingust.la, 5);
  assert.ok(!("rau" in g.ingust), "doar campurile cunoscute");
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  const cerute = [], scrise = [];
  const bare = osc(40), klines = bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: 1 }));
  const cl = { monede: Array.from({ length: 8 }, (_, i) => ({ simbol: "M" + i + "_USDT_PERP", stare: "candidat", scor: 8 - i, dir: "neutru", regim: { miscare: false }, pret: 100 })) };
  const Idei = { ideiBoti: (c, t, n) => c.monede.slice(0, n).map((x) => ({ ...x, moneda: x.simbol.split("_")[0], istoric: { n: 0 } })) };
  const r = await turaIngust({ clasament: cl, Idei, GridProba: GP, GridCalcul: G, pauza: async () => {}, jurnal: () => {},
    cere: async (simbol, end) => { cerute.push(simbol); return { data: { klines: end ? [] : klines } }; }, trimite: async (u, corp) => { scrise.push(corp); return { ok: true }; } });
  assert.equal(r.monede, 5); assert.equal(scrise.length, 5); assert.ok(scrise[0].ingust && "propus" in scrise[0].ingust);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /INGUST_MS = 6 \* 3600000/); assert.match(col, /turaIngustModul\(/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
