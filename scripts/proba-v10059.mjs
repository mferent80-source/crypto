// Proba v100.59 (01.10, el „da”: I-481 ceasul gridului ingust + I-480 gridul ingust urmarit INAINTE).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function(`${lib("grid-proba.js")}; return GridProba;`)();
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); }); }
console.log("\nV100.59 · Ceasul gridului ingust + urmarirea inainte · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const H1 = 3600000, M15 = 900000;
const osc = (zile, t0) => Array.from({ length: zile * 96 }, (_, i) => { const c = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * i / 8)), o = 100 * (1 + 0.01 * Math.sin(2 * Math.PI * (i - 1) / 8)); return { t: (t0 || 0) + i * M15, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c }; });

// ---- I-481: ceasul ----
const ing = { propus: true, dir: "neutru", latime: 0.02, ore: 6, la: 100 * H1 };
await test("potrivireIngust: botul pornit cu setarile ingustei (aceeasi directie, latime +-35 %, in 12 h de la propunere) -> inchide-l la pornire + H", () => {
  are(GP.potrivireIngust, "GridProba.potrivireIngust");
  const r = GP.potrivireIngust({ jos: 99, sus: 101, directie: "NEUTRAL", pornitLa: 101 * H1 }, ing);
  assert.ok(r && r.ingust, JSON.stringify(r)); assert.equal(r.inchideLa, 101 * H1 + 6 * H1); assert.equal(r.ore, 6);
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101, directie: "long", pornitLa: 101 * H1 }, ing), null, "alta directie");
  assert.equal(GP.potrivireIngust({ jos: 95, sus: 105, directie: "neutral", pornitLa: 101 * H1 }, ing), null, "interval de 5 ori mai lat");
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101, directie: "neutral", pornitLa: 130 * H1 }, ing), null, "pornit la o zi dupa propunere");
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101, directie: "neutral", pornitLa: 101 * H1 }, { ...ing, propus: false }), null, "nepropus");
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101 }, null), null);
  assert.ok(GP.potrivireIngust({ jos: 98.8, sus: 101.3, directie: "neutral", pornitLa: 99 * H1 }, ing), "rotunjirile si pornirea putin inainte de nota");
});
await test("colectorul: ceasul pe fiecare bot activ, un singur mesaj la H ore; banda Tabloului arata ora de inchidere", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.ok(col.includes("GridProba.potrivireIngust(") && col.includes("gridul îngust a ajuns la") && col.includes("st._ceasTrimis"), "colector");
  const a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.ok(a.includes("GridProba.potrivireIngust(") && a.includes("închide-l la "), "banda Tabloului");
});

// ---- I-480: urmarirea inainte ----
await test("judecaUrmarire: nota se judeca pe barele de DUPA ea (acelasi simulator), sub H ore de bare -> inca nu (null)", () => {
  are(GP.judecaUrmarire, "GridProba.judecaUrmarire");
  const b = osc(10), rec = { simbol: "X", la: 3 * 96 * M15, dir: "neutru", ore: 6, latime: 0.022, pas: 0.0057, propus: true };
  const j = GP.judecaUrmarire(rec, b); assert.ok(j && typeof j.net === "number", JSON.stringify(j));
  const st = G.construieste({ pret: b[3 * 96].o, lat: 0.022, pas: 0.0057, dir: "neutru" });
  assert.equal(j.net, GP.simuleaza(b, 3 * 96, 24, st).net, "acelasi simulator, pornit la prima bara de dupa nota");
  assert.equal(GP.judecaUrmarire({ ...rec, la: (10 * 96 - 10) * M15 }, b), null, "sub 6 h de bare dupa nota");
});
await test("socotealaUrmarire: propuse si nepropuse separat (n, % pe plus, mediana, medie); sub 30 -> „prea puține”", () => {
  are(GP.socotealaUrmarire, "GridProba.socotealaUrmarire");
  const l = [];
  for (let i = 0; i < 40; i++) l.push({ propus: true, r: { net: i % 4 === 0 ? -0.02 : 0.01 } });
  for (let i = 0; i < 5; i++) l.push({ propus: false, r: { net: -0.01 } });
  l.push({ propus: true });   // nejudecata inca
  const s = GP.socotealaUrmarire(l);
  assert.equal(s.propuse.n, 40); assert.equal(Math.round(s.propuse.pePlus * 100), 75); assert.equal(s.nepropuse.n, 5); assert.equal(s.nejudecate, 1);
  assert.match(s.text, /propuse 40/); assert.match(s.text, /nepropuse 5/); assert.match(s.text, /prea puține/);
  assert.match(GP.socotealaUrmarire([]).text, /începe/);
});
await test("tura: noteaza fiecare moneda si judeca notele vechi (si pe monedele care nu mai sunt sugerate); ruta pastreaza lista", async () => {
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  const bare = osc(40), klines = bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: 1 }));
  const cl = { monede: Array.from({ length: 3 }, (_, i) => ({ simbol: "M" + i + "_USDT_PERP", stare: "candidat", scor: 3 - i, dir: "neutru", regim: { miscare: false } })) };
  const Idei = { ideiBoti: (c, t, n) => c.monede.slice(0, n).map((x) => ({ ...x, moneda: x.simbol.split("_")[0], istoric: { n: 0 } })) };
  const vechi = [{ simbol: "VECHE_USDT_PERP", la: bare[100].t, dir: "neutru", ore: 6, latime: 0.022, pas: 0.0057, propus: false }];
  const scrise = [];
  const r = await turaIngust({ clasament: cl, Idei, GridProba: GP, GridCalcul: G, pauza: async () => {}, jurnal: () => {}, urmarire: vechi, acum: bare[bare.length - 1].t + M15,
    cere: async (simbol, end) => ({ data: { klines: end ? [] : klines } }), trimite: async (u, corp) => { scrise.push({ u, corp }); return { ok: true }; } });
  const u = scrise.find((x) => /ingustUrmarire/.test(x.u)); assert.ok(u, "lista urmaririi trimisa");
  const l = u.corp.lista; assert.equal(l.length, 4, "nota veche + 3 noi");
  assert.ok(l.find((x) => x.simbol === "VECHE_USDT_PERP").r, "nota veche judecata (moneda nu mai e sugerata)");
  assert.equal(r.monede, 3);
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [], list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=ingustUrmarire", { lista: l.concat([{ simbol: "<b>", la: "x" }]) }), env })).status, 200);
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=ingustUrmarire"), env })).json();
  assert.equal(g.lista.length, 4, "nota invalida aruncata"); assert.ok(g.lista.find((x) => x.r));
});
await test("pagina: randul „urmărit înainte” in idei si in fisa (o singura cerere, cu cache)", () => {
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8"), a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.ok(e.includes("GridProba.socotealaUrmarire(") && e.includes("action=ingustUrmarire"), "idei");
  assert.ok(a.includes("GridProba.socotealaUrmarire("), "fisa");
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
