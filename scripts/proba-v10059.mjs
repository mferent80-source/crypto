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
  assert.ok(GP.potrivireIngust({ jos: 98.8, sus: 101.3, directie: "neutral", pornitLa: 100 * H1 - 10 * 60000 }, ing), "rotunjirile si pornirea cu 10 min inainte de nota");
  // revizia 01.10 (I5): fereastra e intr-o singura parte - un bot pornit INAINTE de propunere (gridul lui) nu se potriveste; fara „la” -> null
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101, directie: "neutral", pornitLa: 98 * H1 }, ing), null, "pornit cu 2 h inainte de propunere");
  assert.equal(GP.potrivireIngust({ jos: 99, sus: 101, directie: "neutral", pornitLa: 101 * H1 }, { ...ing, la: undefined }), null, "fara ora propunerii");
});
await test("colectorul: ceasul pe fiecare bot activ, un singur mesaj la H ore; banda Tabloului arata ora de inchidere", async () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  /* v100.66: mesajul vine din scripts/lib/mesaje-colector.mjs - se verifica ce spune, nu unde e scris */
  const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
  assert.ok(col.includes("GridProba.potrivireIngust(") && col.includes("MesajeColector.ceasIngust(") && col.includes("st._ceasTrimis"), "colector");
  assert.match(MC.ceasIngust("CRV", 6, "14:30", false).titlu, /6 h/);
  const a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.ok(a.includes("action=ingustCeas&bot=") && a.includes("închide-l la "), "banda Tabloului (din ceasul colectorului)");
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
  assert.match(s.text, /propuse 40/); assert.match(s.text, /nepropuse 5/); assert.match(s.text, /puține cazuri/);   /* v100.72: „— puține cazuri încă” (era „— prea puține încă, zgomot”) */
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

// ---- revizia finala (Opus, 01.10) ceas + urmarire ----
await test("C1: o citire picata a listei NU sterge istoricul - fara lista, tura nu scrie urmarirea", async () => {
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  const bare = osc(40), klines = bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: 1 })), scrise = [];
  const cl = { monede: [{ simbol: "M0_USDT_PERP", stare: "candidat", scor: 1, dir: "neutru", regim: { miscare: false } }] };
  const Idei = { ideiBoti: (c, t, n) => c.monede.slice(0, n).map((x) => ({ ...x, moneda: "M0", istoric: { n: 0 } })) };
  await turaIngust({ clasament: cl, Idei, GridProba: GP, GridCalcul: G, pauza: async () => {}, jurnal: () => {}, urmarire: null, cere: async (s, end) => ({ data: { klines: end ? [] : klines } }), trimite: async (u, corp) => { scrise.push(u); return { ok: true }; } });
  assert.ok(!scrise.some((u) => /ingustUrmarire/.test(u)), "fara lista citita, nu scrie peste");
  assert.ok(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").includes("let urm = null;"), "colectorul: la eroare, null (nu [])");
});
await test("C2: ruta primeste lista intreaga (2000 de note, ~400 KB), nu doar ~320", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [], list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const l = Array.from({ length: 2000 }, (_, i) => ({ simbol: "MONEDA" + (i % 50) + "_USDT_PERP", la: 1790000000000 + i * 3600000, dir: "neutru", ore: 12, latime: 0.0221566713254, pas: 0.0057354950360, propus: i % 3 === 0, r: { net: 0.0123456789, oprit: false, lichidat: false } }));
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=ingustUrmarire", { lista: l }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=ingustUrmarire"), env })).json()).lista.length, 2000);
});
await test("I3 + I7: nota mai veche decat primele bare nu se judeca pe alte zile; notele fara date de peste 7 zile ies din asteptare", async () => {
  const b = osc(10, 50 * 864e5);
  assert.equal(GP.judecaUrmarire({ simbol: "X", la: 30 * 864e5, dir: "neutru", ore: 6, latime: 0.022, pas: 0.0057 }, b), null, "nota de dinaintea barelor");
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  const scrise = [], acum = 100 * 864e5;
  const urm = [{ simbol: "DISPARUTA_USDT_PERP", la: acum - 9 * 864e5, dir: "neutru", ore: 6, latime: 0.022, pas: 0.0057, propus: false }];
  await turaIngust({ clasament: { monede: [] }, Idei: { ideiBoti: () => [] }, GridProba: GP, GridCalcul: G, pauza: async () => {}, jurnal: () => {}, urmarire: urm, acum,
    cere: async () => ({ data: { klines: [] } }), trimite: async (u, corp) => { scrise.push(corp); return { ok: true }; } });
  const l = scrise.find((c) => c && c.lista).lista; assert.ok(l[0].r && l[0].r.lipsa, "fara date de 9 zile -> lipsa");
  const s = GP.socotealaUrmarire(l); assert.equal(s.nejudecate, 0); assert.equal(s.nepropuse.n, 0);
});
await test("I4: socoteala numara ferestre INDEPENDENTE pe moneda (nota la 6 h cu durata de 24 h = suprapuse)", () => {
  const H = 3600000, l = [];
  for (let i = 0; i < 8; i++) l.push({ simbol: "A", la: i * 6 * H, ore: 24, propus: true, r: { net: 0.01 } });
  const s = GP.socotealaUrmarire(l); assert.equal(s.propuse.n, 2, "8 note la 6 h, durata 24 h -> 2 ferestre independente"); assert.match(s.text, /propuse 2/);
});
await test("I6 + mici: banda Tabloului citeste ceasul tinut minte de colector (nu-l recalculeaza din rezultatul rescris); mesajul se scrie imediat in stare si spune ora", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); }, list: async () => ({ keys: [], list_complete: true }) } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=ingustCeas", { bot: "123", ceas: { ingust: true, ore: 6, inchideLa: 5 } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=ingustCeas&bot=123"), env })).json()).ceas.inchideLa, 5);
  const a = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.ok(a.includes("action=ingustCeas&bot=") && !a.includes("GridProba.potrivireIngust("), "banda citeste ceasul colectorului");
  assert.ok(col.includes('trimite("/api/istoric-bot?action=ingustCeas"') && col.includes("st._ceasTrimis = true; scrieStare();"), "colectorul publica ceasul si scrie starea imediat");
  /* v100.66: mesajul vine din scripts/lib/mesaje-colector.mjs */
  const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href), mi = MC.ceasIngust("CRV", 6, "14:30", true).mesaj;
  assert.ok(col.includes("MesajeColector.ceasIngust(nume, st._ceas.ore, hm, tarziu)") && mi.includes("14:30") && /întârziat/.test(mi), "mesajul spune ora inchiderii (si daca a intarziat)");
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
