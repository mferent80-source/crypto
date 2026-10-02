// Proba v100.46 (01.10, el: „partea de probabilități bazate pe istoric ... mai aprofundată” + „bun” pe planul 2a:
// docs/superpowers/plans/2026-10-01-pachetul-2a-probabilitati-calibrate.md). Frecvente din trecut pe barele de 1 h, conditionate pe
// starea fisei, cu cazuri independente si IC; jurnalul, judecata si calibrarea; rutele; colectorul; Tabloul.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import "./lib/text-ro-global.mjs";   // v100.73 (RF4): probabilitati.js scrie „888 de porniri” prin TextRo.cate (rezerva fara TextRo nu stie „de”)

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
  // v100.47 (pachetul 2b): 6 stari (regim x directie) si cadere in trepte exact -> regim -> toate
  assert.ok(/^(liniste|miscare)-(sus|jos|lateral)$/.test(s), s); assert.equal(PB.stareLa(b, 100), null, "sub 30 de zile de istoric: fara stare");
  const f = PB.frecventa(b, 24, PB.atinge(-0.01), "da", s);
  assert.ok(f.nivel === "exact" ? f.stare === s && f.nIndep >= 5 : f.nivel === "regim" ? f.stare === s.split("-")[0] : f.stare === null);
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
  // v100.69 (sfaturile concise, pachetul 4): marcajul scurt ramane; avertizarea comuna („un semn, nu o regulă”) sta o data, in legenda
  assert.match(rr.find((r) => r.cod === "iese-jos-24").text, /puține cazuri independente/); assert.doesNotMatch(rr.find((r) => r.cod === "iese-jos-24").text, /un semn, nu o regulă/);
  assert.ok(!/puține cazuri/.test(rr.find((r) => r.cod === "iese-sus-24").text));
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

let TPR = null; try { TPR = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs")).href); } catch { TPR = null; }
await test("colector: o data pe ora pe bot, jurnalul la 4 h, judecata dupa orizont (fara bare -> nejudecat), curatenia la 90 de zile", async () => {
  assert.ok(TPR && typeof TPR.turaProbabilitati === "function", "lipseste scripts/lib/tura-probabilitati.mjs");
  const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
  const b = mers(200 * 24, 0.006, 5), u = b[b.length - 1], acum = u.t + ORA, rand = (x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c });
  let disc = b.map(rand); const scrise = [], stare = { jurnal: [
    { t: acum - 30 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e9, sus: false } },   // orice bara e sub 1e9 -> atins
    { t: acum - 2 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e-9, sus: false } },
    { t: acum - 100 * 24 * ORA, bot: "9", simbol: "X_USDT_PERP", tip: "iese-jos-24", p: 0.4, H: 24, ev: { fel: "atinge", nivel: 1e-9, sus: false } }] };
  const bot = { id: "1", baza: "X", directie: "long", pretCurent: u.c, gridJos: u.c * 0.95, gridSus: u.c * 1.05, lichidareJos: u.c * 0.7, opritorPierdereActiv: false, investit: 50, levier: 3, pozitie: 1, profitNet: 0, profitTotal: 0, brut: { buOrderData: { row: 11, gridType: "geometric" } } };
  const mk = (t) => ({ acum: t, boti: [bot], simbolDe: () => "X_USDT_PERP", planDe: async () => ({ plus: 5, minus: 10 }), cere: async () => ({ data: { klines: [] } }),
    trimite: async (cale, corp) => { scrise.push([cale, corp]); return { ok: true }; }, citesteBare: () => disc, scrieBare: (s, r) => { disc = r; },
    GridCalcul: G, Probabilitati: PB, TabloExtra: TE, stare, scrieStare: () => {}, pauza: async () => {}, jurnal: () => {} });
  await TPR.turaProbabilitati(mk(acum));
  const p1 = scrise.find(([c]) => /action=prob$/.test(c)); assert.ok(p1 && p1[1].rez && p1[1].rez.iese && p1[1].rez.iese.jos24, "prob cu iese.jos24: " + JSON.stringify(p1 && p1[1]).slice(0, 200));
  assert.ok(scrise.some(([c]) => /action=calibrare/.test(c))); assert.ok(stare.jurnal.some((e) => e.t === acum), "intrarile noi");
  assert.equal(stare.jurnal[0].r, 1, "intrarea de acum 30 h, cu barele ei pe disc, e judecata"); assert.equal(stare.jurnal[1].r, undefined, "orizont neincheiat");
  assert.ok(!stare.jurnal.some((e) => e.t === acum - 100 * 24 * ORA), "peste 90 de zile: sters");
  const j1 = stare.jurnal.length;
  await TPR.turaProbabilitati(mk(acum + 30 * 60000)); assert.equal(scrise.filter(([c]) => /action=prob$/.test(c)).length, 1, "o data pe ora");
  await TPR.turaProbabilitati(mk(acum + 2 * ORA)); assert.equal(scrise.filter(([c]) => /action=prob$/.test(c)).length, 2); assert.equal(stare.jurnal.length, j1, "jurnalul doar la 4 h");
  await TPR.turaProbabilitati(mk(acum + 4 * ORA)); assert.ok(stare.jurnal.length > j1);
});

await test("Tablou: sectiunea probabilitatilor (ascunsa fara server) cu banda IC, adusa din prob + calibrare, randul in Consilier", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), sw = fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8"), css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.match(html, /<details class="tbPl" id="tbPl-prob" hidden>/); assert.match(html, /<div id="tbProb"><\/div>/);
  assert.match(html, /<script src="\/lib\/probabilitati\.js"><\/script>/); assert.match(sw, /"\/lib\/probabilitati\.js"/);
  assert.match(app, /action=prob&bot=/); assert.match(app, /action=calibrare/); assert.match(app, /Probabilitati\.randuri\(/); assert.match(app, /Probabilitati\.rand\(/);
  assert.match(app, /tbProbBanda/); assert.match(css, /\.tbProbBanda\{/); assert.match(app, /c\.sansa/);
  const x = { p: 0.4, n: 30, k: 12, nIndep: 12, ic: [0.25, 0.55], orizontOre: 24, conditionat: true, stare: "liniste" };
  assert.deepEqual(PB.randuri({ niveluri: { jos: 1 }, iese: { jos24: x } }, null)[0].ic, [0.25, 0.55], "banda are nevoie de intervalul fiecarui rand");
});

// ---- revizia finala 2a (01.10): reparatiile, fiecare cu testul ei vazut picand intai ----
await test("C1: calibrarea numara cazuri INDEPENDENTE (la cel putin H una de alta, pe bot si tip): 25 de notari la 4 h pe 7 zile = 1 caz -> necalibrat", () => {
  const l = Array.from({ length: 25 }, (_, i) => ({ t: T0 + i * 4 * ORA, bot: "1", tip: "cursa-tinta", H: 168, p: 0.72, r: 0 }));
  assert.equal(PB.corecteaza(0.72, "cursa-tinta", PB.calibreaza(l)).calibrat, false, "o singura saptamana de piata nu calibreaza nimic");
  const indep = Array.from({ length: 25 }, (_, i) => ({ t: T0 + i * 24 * ORA, bot: "1", tip: "iese-jos-24", H: 24, p: 0.7, r: i < 10 ? 1 : 0 }));
  assert.equal(PB.corecteaza(0.7, "iese-jos-24", PB.calibreaza(indep)).calibrat, true, "25 de zile distincte = 25 de cazuri");
});
await test("C1: lichidarea nu e coborata niciodata sub cifra bruta (corectarea se spune alaturi)", () => {
  const l = Array.from({ length: 25 }, (_, i) => ({ t: T0 + i * 168 * ORA, bot: "1", tip: "lichidare-7", H: 168, p: 0.12, r: 0 }));
  const c = PB.corecteaza(0.12, "lichidare-7", PB.calibreaza(l)); assert.equal(c.p, 0.12); assert.match(c.text, /0%/);
});
await test("I1: cifra corectata vine cu intervalul EI (Wilson pe cutie), nu cu al cifrei brute", () => {
  const l = Array.from({ length: 25 }, (_, i) => ({ t: T0 + i * 24 * ORA, bot: "1", tip: "iese-jos-24", H: 24, p: 0.7, r: i < 10 ? 1 : 0 }));
  const x = { p: 0.7, n: 300, k: 210, nIndep: 50, ic: [0.56, 0.81], orizontOre: 24, conditionat: true, stare: "liniste" };
  const r = PB.randuri({ niveluri: { jos: 1 }, iese: { jos24: x } }, PB.calibreaza(l))[0];
  assert.equal(r.p, 0.4); assert.ok(r.ic[0] < 0.4 && r.ic[1] > 0.4, "IC-ul cuprinde cifra aratata: " + r.ic); assert.match(r.text, /IC/);
});
await test("I2: stopul dincolo de lichidare -> cursa nu se socoteste (lichidarea vine intai)", () => {
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const l = PB.pentruBot(b, { acum, pret: p, dir: "long", jos: p * 0.95, sus: p * 1.05, lichidare: p * 0.9, tinta: p * 1.03, stop: p * 0.85 });
  assert.equal(l.cursa, null); assert.ok(l.lichidare7);
  const s = PB.pentruBot(b, { acum, pret: p, dir: "short", jos: p * 0.95, sus: p * 1.05, lichidare: p * 1.1, tinta: p * 0.97, stop: p * 1.15 });
  assert.equal(s.cursa, null);
});
await test("I3: textul spune „porniri la 4 h”, nu „zile”, cand nu e conditionat", () => {
  const x = { p: 0.5, n: 888, k: 450, nIndep: 148, ic: [0.4, 0.6], orizontOre: 24, conditionat: false, stare: null };
  const t = PB.randuri({ niveluri: { jos: 1 }, iese: { jos24: x } }, null)[0].text;
  assert.ok(!/888 zile/.test(t), t); assert.match(t, /888 de porniri la 4 h/);
});
await test("M1 (Important): lichidarea long se judeca pe JOS chiar fara gridJos - sensul din pretul de la notare", () => {
  const b = mers(120 * 24, 0.006, 5), p = b[b.length - 1].c, acum = b[b.length - 1].t + ORA;
  const rez = PB.pentruBot(b, { acum, pret: p, dir: "long", sus: p * 1.05, lichidare: p * 0.7 });
  const e = PB.intrari(rez, { t: acum, bot: "1", simbol: "X" }).find((x) => x.tip === "lichidare-7"); assert.ok(e); assert.equal(e.ev.sus, false);
});
await test("M2 (Important): rand cu sub 3 cazuri independente nu se arata (n-ar spune nimic)", () => {
  const x = { p: 0, n: 6, k: 0, nIndep: 1, ic: [0, 0.79], orizontOre: 168, conditionat: false, stare: null };
  assert.equal(PB.randuri({ niveluri: { lichidare: 1 }, lichidare7: x }, null).length, 0);
});
await test("I6: colectorul rescrie jurnalul doar cand s-a schimbat ceva", async () => {
  const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
  let scrieri = 0; const stare = { jurnal: [], la: { 1: Date.UTC(2026, 9, 1) } };
  await TPR.turaProbabilitati({ acum: Date.UTC(2026, 9, 1) + 10 * 60000, boti: [{ id: "1" }], simbolDe: () => "X", planDe: async () => null, cere: async () => ({}), trimite: async () => ({}), citesteBare: () => [], scrieBare: () => {},
    GridCalcul: G, Probabilitati: PB, TabloExtra: TE, stare, scrieStare: () => { scrieri++; }, pauza: async () => {}, jurnal: () => {} });
  assert.equal(scrieri, 0);
});
await test("M4 (Important): tura orara nu re-descarca de la zero o moneda mai noua de 6 luni (doar pagina noua; umplerea e a noptii)", async () => {
  const TP = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-profil.mjs")).href);
  const acum = T0 + 200 * 24 * ORA, vechi = Array.from({ length: 90 * 24 }, (_, i) => ({ time: acum - (90 * 24 - i) * ORA, open: "1", high: "1", low: "1", close: "1" }));
  let cereri = 0; const d = { acum, GridCalcul: G, pauza: async () => {}, cere: async () => { cereri++; return { data: { klines: [] } }; } };
  const r = await TP.aduOre("NOU_USDT_PERP", vechi, d); assert.equal(cereri, 1); assert.equal(r.length, vechi.length);
  cereri = 0; await TP.aduOre("NOU_USDT_PERP", vechi, { ...d, umple: true }); assert.equal(cereri, 1, "goala la prima pagina -> gata");
});
await test("I4/I5/M3: Tabloul arata vechimea (peste 3 h) si ascunde randul; nu deseneaza datele altui bot; mesajul „gol” nu promite noaptea", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), tp = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-probabilitati.mjs"), "utf8");
  assert.match(app, /tbProbVechi\(/); assert.match(app, /tbStare\.bot&&tbStare\.bot\.id===b\.id/); assert.match(app, /\$\("tbPl-prob"\)\.hidden=true/);
  assert.ok(!/le aduce noaptea/.test(app)); assert.ok(!/puțin istoric de 1 h pe moneda asta/.test(tp));
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
