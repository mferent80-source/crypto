// Proba v100.46 (01.10, el: „partea de probabilități bazate pe istoric ... mai aprofundată” + „bun” pe planul 2a:
// docs/superpowers/plans/2026-10-01-pachetul-2a-probabilitati-calibrate.md). Frecvente din trecut pe barele de 1 h, conditionate pe
// starea fisei, cu cazuri independente si IC; jurnalul, judecata si calibrarea; rutele; colectorul; Tabloul.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
let PB = null; try { PB = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G); } catch { PB = null; }

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.46 · Probabilitatile din istoric, cu calibrare (pachetul 2a) · proba\n");

const ORA = 3600000, T0 = Date.UTC(2026, 0, 1);
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// mers aleator fara deriva pe 1 h: in medie, +x inainte de -x in jumatate din cazuri
function mers(ore, sigma, seed) {
  const r = rng(seed), v = []; let c = 100;
  for (let i = 0; i < ore; i++) { const o = c; c = o * Math.exp(sigma * (r() + r() + r() - 1.5) * 2); v.push({ t: T0 + i * ORA, o, h: Math.max(o, c) * (1 + 0.002 * r()), l: Math.min(o, c) * (1 - 0.002 * r()), c }); }
  return v;
}
const plat = (ore) => Array.from({ length: ore }, (_, i) => ({ t: T0 + i * ORA, o: 100, h: 101, l: 99, c: 100 }));

await test("atinge: pret plat 99-101 -> -0,5% atins mereu, -2% niciodata; cazurile independente = n*4/H", () => {
  assert.ok(PB && typeof PB.frecventa === "function", "lipseste Probabilitati.frecventa");
  const b = plat(60 * 24);
  const a = PB.frecventa(b, 24, PB.atinge(-0.005), "da", null), z = PB.frecventa(b, 24, PB.atinge(-0.02), "da", null);
  assert.equal(a.p, 1); assert.equal(z.p, 0); assert.equal(a.nIndep, Math.floor(a.n * 4 / 24)); assert.ok(a.ic[0] > 0.5 && z.ic[1] < 0.5);
});
await test("cursa simetrica pe mers aleator: tinta +3% inaintea stopului -3% in ~jumatate din cazuri (IC o cuprinde pe 0,5)", () => {
  const b = mers(200 * 24, 0.006, 7), t = PB.frecventa(b, 168, PB.cursa(0.03, -0.03), "tinta", null), s = PB.frecventa(b, 168, PB.cursa(0.03, -0.03), "stop", null);
  assert.ok(t.p > 0.3 && t.p < 0.7, "p=" + t.p); assert.ok(t.ic[0] < 0.5 && t.ic[1] > 0.5, t.ic.join("-")); assert.ok(t.p + s.p <= 1 + 1e-9);
});
await test("doar ce se stia atunci: barele de DUPA acum (un crah de 50%) nu schimba nimic", () => {
  const b = mers(120 * 24, 0.006, 3), u = b[b.length - 1], acum = u.t + ORA;
  const crah = Array.from({ length: 48 }, (_, i) => ({ t: acum + i * ORA, o: 100, h: 100, l: 50, c: 50 }));
  const o = { acum, pret: u.c, dir: "long", jos: u.c * 0.95, sus: u.c * 1.05, lichidare: u.c * 0.8, tinta: u.c * 1.03, stop: u.c * 0.96 };
  const r1 = PB.pentruBot(b, o), r2 = PB.pentruBot(b.concat(crah), o);
  assert.ok(r1 && r1.iese.jos24); assert.deepEqual(r2, r1);
  const r3 = PB.pentruBot(b.concat(crah), { ...o, acum: acum + 48 * ORA }); assert.notDeepEqual(r3.iese.jos24, r1.iese.jos24, "testul are dinti");
});
await test("starea: din regimul fisei pe 1 h; conditionat doar cu >= 5 cazuri independente, altfel toate zilele (spus)", () => {
  const b = mers(120 * 24, 0.006, 11), s = PB.stareLa(b, b.length - 1);
  assert.ok(["liniste", "miscare-sus", "miscare-jos"].includes(s), s); assert.equal(PB.stareLa(b, 100), null, "sub 30 de zile de istoric: fara stare");
  const f = PB.frecventa(b, 24, PB.atinge(-0.01), "da", s);
  assert.ok(f.conditionat ? f.stare === s && f.nIndep >= 5 : f.stare === null);
});
await test("pentruBot: putin istoric -> null; neutru -> fara cursa si fara lichidare; tinta deja atinsa -> fara cursa", () => {
  assert.equal(PB.pentruBot(mers(20 * 24, 0.006, 1), { acum: T0 + 21 * 24 * ORA, pret: 100, dir: "long", jos: 95, sus: 105 }), null);
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const n = PB.pentruBot(b, { acum, pret: p, dir: "neutru", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.97 });
  assert.ok(n.iese.jos24 && n.iese.sus24); assert.equal(n.cursa, null); assert.equal(n.lichidare7, null);
  const l = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 0.99, stop: p * 0.96 });
  assert.equal(l.cursa, null, "tinta sub pret la long = deja atinsa"); assert.ok(l.lichidare7);
});

await test("jurnal: intrarile poarta preturi ABSOLUTE; judeca dupa orizont, null pana sunt bare complete", () => {
  assert.ok(typeof PB.intrari === "function", "lipseste Probabilitati.intrari");
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const rez = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.96 });
  const l = PB.intrari(rez, { t: acum, bot: "1", simbol: "X_USDT_PERP" });
  const j = l.find((e) => e.tip === "iese-jos-24"); assert.ok(j && Math.abs(j.ev.nivel - p * 0.95) < 1e-9 && j.ev.sus === false && j.H === 24);
  assert.ok(l.some((e) => e.tip === "cursa-tinta" && e.ev.tinta > p && e.ev.stop < p));
  assert.equal(PB.judeca(j, b), null, "inca n-a trecut orizontul");
  const dupa = Array.from({ length: 30 }, (_, i) => ({ t: acum + i * ORA, o: p, h: p, l: p * 0.94, c: p }));
  assert.equal(PB.judeca(j, b.concat(dupa)), 1);
  const linistit = Array.from({ length: 30 }, (_, i) => ({ t: acum + i * ORA, o: p, h: p * 1.001, l: p * 0.999, c: p }));
  assert.equal(PB.judeca(j, b.concat(linistit)), 0);
  assert.equal(PB.judeca(j, b.concat(linistit.slice(0, 10))), null, "bare incomplete -> nejudecat (colectorul oprit nu inventeaza)");
  assert.equal(PB.judeca({ ...j, t: acum - 25 * 60000 }, b.concat(dupa)), 1, "notarea nu cade pe ora fixa: fereastra incepe la ora intreaga urmatoare");
});
await test("calibrarea: zise 70%, intamplate 40% (25 de cazuri) -> cifra corectata 40% cu avertisment; sub 20 -> necalibrat", () => {
  const l = Array.from({ length: 25 }, (_, i) => ({ tip: "iese-jos-24", p: 0.7, r: i < 10 ? 1 : 0 }));
  const cal = PB.calibreaza(l), c = PB.corecteaza(0.72, "iese-jos-24", cal);
  assert.equal(c.calibrat, true); assert.equal(c.p, 0.4); assert.equal(c.brut, 0.72); assert.equal(c.avertizare, true); assert.match(c.text, /40% din 25/);
  const c2 = PB.corecteaza(0.3, "iese-jos-24", cal); assert.equal(c2.calibrat, false); assert.match(c2.text, /necalibrat/);
  assert.equal(PB.calibreaza(l.concat([{ tip: "iese-jos-24", p: 0.7, r: null }]))["iese-jos-24"].cutii[3].n, 25, "nejudecatele nu se numara");
});
await test("textele: rand pentru Consilier (cursa daca exista, altfel iesirea pe partea de pierdere) cu n, independente si IC", () => {
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const rez = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.7, tinta: p * 1.03, stop: p * 0.96 });
  const r = PB.rand(rez, null, "long"); assert.match(r, /ținta/); assert.match(r, /din \d+/); assert.match(r, /IC \d+–\d+%/); assert.match(r, /necalibrat/);
  const fara = PB.rand({ ...rez, cursa: null }, null, "long"); assert.match(fara, /marginea de jos/);
  const rr = PB.randuri(rez, null, "long"); assert.ok(rr.length >= 5 && rr.every((x) => x.titlu && x.text));
});
await test("trader.md §1 / backtest-expert: sub 10 cazuri independente textul spune „un semn, nu o regulă”; de la 10, nu", () => {
  const x = { p: 0.4, n: 30, k: 12, nIndep: 5, ic: [0.1, 0.8], orizontOre: 168, conditionat: true, stare: "liniste" };
  const rez = { stare: "liniste", bare: 4000, niveluri: { jos: 1, sus: 2 }, iese: { jos24: x, sus24: { ...x, nIndep: 12 } } };
  const rr = PB.randuri(rez, null, "long");
  assert.match(rr.find((r) => r.cod === "iese-jos-24").text, /puține cazuri independente — un semn, nu o regulă/);
  assert.ok(!/un semn, nu o regulă/.test(rr.find((r) => r.cod === "iese-sus-24").text));
});

await test("server: prob:<bot> si calibrarea se scriu si se citesc; cutii stricate -> 400; prob prea mare -> 413", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.has(k) ? kv.get(k) : null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const rez = { la: 1, stare: "liniste", bare: 4000, niveluri: { jos: 0.38 }, iese: { jos24: { p: 0.3, n: 50, k: 15, nIndep: 8, ic: [0.1, 0.6], orizontOre: 24, conditionat: true, stare: "liniste" } } };
  let r = await mod.onRequestPost({ request: cer("POST", "action=prob", { bot: "2394", rez }), env }); assert.equal(r.status, 200, await r.clone().text());
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=prob&bot=2394"), env })).json(); assert.deepEqual(g.prob, rez);
  const cal = { "iese-jos-24": { cutii: [{ n: 1, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }, { n: 25, k: 10 }, { n: 0, k: 0 }] } };
  r = await mod.onRequestPost({ request: cer("POST", "action=calibrare", { la: 5, cal }), env }); assert.equal(r.status, 200, await r.clone().text());
  const gc = await (await mod.onRequestGet({ request: cer("GET", "action=calibrare"), env })).json(); assert.deepEqual(gc.calibrare.cal, cal); assert.equal(gc.calibrare.la, 5);
  r = await mod.onRequestPost({ request: cer("POST", "action=calibrare", { la: 5, cal: { x: { cutii: [{ n: 1, k: 0 }] } } }), env }); assert.equal(r.status, 400);
  r = await mod.onRequestPost({ request: cer("POST", "action=prob", { bot: "2394", rez: { x: "a".repeat(20000) } }), env }); assert.ok(r.status === 413 || r.status === 400, String(r.status));
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
