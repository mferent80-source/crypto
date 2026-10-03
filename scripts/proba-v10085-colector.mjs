// Proba v100.85 (colectorul + serverul) - reveniri + short: clasamentul cu `revenire`, ruta lui; tura ideilor cu acțiunile pe revenire,
// istoricul și urmărirea lor (t212?action=idei); tura sugestiilor de monede (istoric-bot?action=sugestii). Server fals, KV fals.
//   node scripts/proba-v10085-colector.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { turaClasament } from "./lib/tura-clasament.mjs";

import { turaIdei } from "./lib/tura-idei.mjs";
import { turaSugestii } from "./lib/tura-sugestii.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GC = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(G);
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 (colectorul) · clasamentul cu revenire, acțiunile pe revenire, sugestiile de monede, rutele");

const H4 = 4 * 3600000, ZI = 864e5, T0 = Date.UTC(2026, 0, 1);
const bare = (n, f, d = H4) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * d, o: c, h: c * 1.002, l: c * 0.998, c }; });
const revine = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : i < 250 ? 60 : 60 + 6 * (i - 249) / 50);
const cutit = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : 60 - 2 * Math.max(0, i - 249) / 50);
// Pionex trimite și bara în formare la coadă - GridCalcul.bare o scoate (v.pop()), deci fixtura o adaugă: bara 299 rămâne ultima închisă
const kl = (b) => b.concat([{ ...b[b.length - 1], t: b[b.length - 1].t + H4 }]).map((x) => ({ time: x.t, open: String(x.o), close: String(x.c), high: String(x.h), low: String(x.l), volume: "1" }));
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async () => ({ keys: [] }) }; }
const TOKEN = "token-de-proba-v10085";
async function cheama(fis, metoda, qs, env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", fis)).href + "?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.85", authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/" + fis.replace(/\.js$/, "") + "?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}

// ---- (4) clasamentul cu `revenire`
const bA = bare(300, revine), bB = bare(300, cutit), ACUM = bA[299].t + H4;
function depsClasament(cuReveniri) {
  const trimise = [];
  return { trimise, d: { cere: async (u) => (/pionex_tickers/.test(u) ? { data: { tickers: [{ symbol: "AAA_USDT_PERP", amount: "2000000", close: "66" }, { symbol: "BBB_USDT_PERP", amount: "1000000", close: "58" }] } }
    : { data: { klines: kl(/AAA/.test(u) ? bA : bB) } }), trimite: async (u, c) => { trimise.push([u, c]); return { ok: true }; }, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0,
    GridCalcul: G, GridClasament: GC, top: 10, acum: () => ACUM, ...(cuReveniri ? { Reveniri: R } : {}) } };
}
await test("(4) tura clasamentului: fiecare monedă primește `revenire` din aceleași bare de 4h (fără cereri în plus); fără Reveniri - câmpul lipsește", async () => {
  const k = depsClasament(true), r = await turaClasament(k.d);
  const a = r.monede.find((x) => x.simbol === "AAA_USDT_PERP"), b = r.monede.find((x) => x.simbol === "BBB_USDT_PERP");
  assert.deepEqual(a.revenire, { cadere: 0.3413, deLaMin: 0.1022, zileDeLaMin: 9.8, revine: true }); assert.equal(b.revenire.revine, false);
  assert.equal(k.trimise.length, 1); assert.ok(k.trimise[0][1].monede.every((x) => "revenire" in x));
  const v = await turaClasament(depsClasament(false).d); assert.ok(v.monede.every((x) => !("revenire" in x)), "proba veche (colector-v77) nu se schimbă");
});
await test("(4) ruta clasamentului păstrează `revenire` curățat (numere, `revine` strict boolean); câmp stricat ⇒ null", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const monede = [{ simbol: "AAA_USDT_PERP", stare: "candidat", dir: "long", revenire: { cadere: "0.3", deLaMin: 0.1, zileDeLaMin: 4, revine: true, rau: 1 } },
    { simbol: "BBB_USDT_PERP", stare: "candidat", dir: "short", revenire: { cadere: 0.1, revine: "da" } }, { simbol: "CCC_USDT_PERP", stare: "evita", revenire: "x" }];
  assert.equal((await cheama("istoric-bot.js", "POST", "action=clasament", env, { la: 5, monede })).status, 200);
  const c = (await cheama("istoric-bot.js", "GET", "action=clasament", env)).d.clasament;
  assert.deepEqual(c.monede[0].revenire, { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true }); assert.deepEqual(c.monede[1].revenire, { cadere: 0.1, deLaMin: null, zileDeLaMin: null, revine: false });
  assert.equal(c.monede[2].revenire, null);
});
await test("(4) colectorul încarcă Reveniri și îl dă turei clasamentului", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /const Reveniri = incarca\("reveniri\.js", "Reveniri"\);/); assert.match(s, /turaClasamentModul\(\{.*GridClasament, Reveniri,/);
});

// ---- (5) acțiunile pe revenire
const ZIb = (n, f) => bare(n, f, ZI);
const revA = (i) => (i < 40 ? 100 : i < 60 ? 100 - 35 * (i - 39) / 20 : i <= 80 ? 65 : 65 + 7 * (i - 80) / 19);
const revA2 = (i) => (i < 40 ? 100 : i < 60 ? 100 - 45 * (i - 39) / 20 : i <= 80 ? 55 : 55 + 6 * (i - 80) / 19);
function depsIdei(serii) {
  return { tickere: Object.keys(serii), inchise: [{ ticker: "T1_US_EQ", rezultat: 40 }, { ticker: "T1_US_EQ", rezultat: -10 }], Idei: { judecaActiune: () => ({ trece: false }), alegeActiuni: ID.alegeActiuni },
    pauza: async () => {}, jurnal: () => {}, acum: 0, simbol: (tk) => tk.split("_")[0], cereBare: async (tk) => serii[tk], cereRezultate: async () => null, Reveniri: R };
}
await test("(5) tura ideilor: acțiunile pe revenire (doar „da”), cea mai mare cădere întâi, cu istoricul lui; istoricul regulii pe toate acțiunile judecate", async () => {
  const r = await turaIdei(depsIdei({ "T1_US_EQ": ZIb(100, revA), "T2_US_EQ": ZIb(100, () => 100), "T3_US_EQ": ZIb(100, revA2) }));
  assert.deepEqual(r.reveniri.map((x) => x.simbol), ["T3", "T1"]); assert.deepEqual(r.reveniri[1].istoric, { n: 2, pePlus: 1, total: 30 });
  assert.equal(r.reveniri[1].stop, 64.22); assert.equal(r.reveniri[1].tinta, 98.45); assert.equal(r.reveniri[1].ticker, "T1_US_EQ");
  assert.ok(r.dovadaReveniri && r.dovadaReveniri.baza.n > 0, JSON.stringify(r.dovadaReveniri)); assert.deepEqual(r.actiuni, []); assert.deepEqual(r.restul, []);
  const fara = await turaIdei({ ...depsIdei({ "T1_US_EQ": ZIb(100, revA) }), Reveniri: undefined }); assert.deepEqual(fara.reveniri, []); assert.equal(fara.dovadaReveniri, null);
});
await test("(5) ruta idei: `reveniri` curățate (≤ 10), istoricul și urmărirea lor; notările în `t212:reveniri-istoric`, separat de ideile urmărite", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, rv = (s) => ({ ticker: s + "_US_EQ", simbol: s, pret: 72, cadere: 0.27, deLaMin: 0.11, zileDeLaMin: 19, revine: true, stop: 64.22, tinta: 98.45, istoric: { n: 1, pePlus: 1, total: 5 }, rau: "x" });
  const dv = { n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, mediana: 0.02, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false };
  const p = await cheama("t212.js", "POST", "action=idei", env, { la: 5, zi: "2026-10-03", judecate: 202, trecute: 1, actiuni: [{ ticker: "AAA_US_EQ", simbol: "AAA", pret: 10 }],
    reveniri: Array.from({ length: 12 }, (_, i) => rv("R" + i)), dovadaReveniri: { ...dv, eticheta: "minunat" }, urmarireReveniri: { n: 3, pePlus: 2, medie: 0.01, text: "Din 3 sugestii…" }, ndx: [] });
  assert.equal(p.status, 200, JSON.stringify(p.d));
  const g = (await cheama("t212.js", "GET", "action=idei", env)).d;
  assert.equal(g.idei.reveniri.length, 10); assert.ok(!("rau" in g.idei.reveniri[0]) && !("revine" in g.idei.reveniri[0])); assert.equal(g.idei.reveniri[0].stop, 64.22);
  assert.equal(g.idei.dovadaReveniri.eticheta, null, "eticheta necunoscută ⇒ null"); assert.equal(g.idei.dovadaReveniri.baza.n, 41457); assert.equal(g.idei.urmarireReveniri.n, 3);
  assert.deepEqual(g.istoric.map((x) => x.simbol), ["AAA"], "urmărirea ideilor neschimbată"); assert.equal(g.istoricReveniri.length, 10); assert.equal(g.istoricReveniri[0].ticker, "R0_US_EQ");
});
await test("(5) colectorul: dă Reveniri turei, socotește urmărirea pe `ticker` (14 zile, 0,3%) și trimite cele trei câmpuri", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /turaIdeiModul\(\{ tickere, inchise, Idei, Reveniri,/);
  assert.match(s, /const urmRev = Reveniri\.urmarire\(id && Array\.isArray\(id\.istoricReveniri\) \? id\.istoricReveniri : \[\], r\.preturi, Date\.now\(\), \{ zile: 14, cost: 0\.003, cheie: "ticker" \}\);/);
  assert.match(s, /reveniri: r\.reveniri, dovadaReveniri: r\.dovadaReveniri, urmarireReveniri: urmRev,/);
});
// ---- (6) tura sugestiilor de monede
const ORA = 3600000;
// 2.400 de bare de 1 h (100 de zile), un val lent: destule pentru fereastra clasamentului (500 de bare de 4h) și ieșirea la 7 zile
const ore = (n, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * ORA, o: c, h: c * 1.003, l: c * 0.997, c }; });
const val = (i) => 100 * (1 + 0.2 * Math.sin(i / 300));
function depsSugestii(o) {
  const trimise = [], st = o.stare || { zi: null };
  const CL = { la: 5, monede: [{ simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 1, revenire: { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true } },
    { simbol: "BBB_USDT_PERP", volum: 5, stare: "candidat", dir: "short", scor: 2, revenire: null }] };
  return { trimise, stare: st, d: { acum: Date.UTC(2026, 9, 3, 9), zi: "2026-10-03", ora: o.ora === undefined ? 9 : o.ora, stare: st, Reveniri: R, Idei: ID, G,
    simboluriDepozit: () => ["AAA_USDT_PERP", "BBB_USDT_PERP"], bare1h: () => ore(2400, val),
    boti: async () => [{ simbol: "AAA_USDT_PERP", dir: "long", pornit: T0 + 2000 * ORA, net: 2 }, { simbol: "BBB_USDT_PERP", dir: "short", pornit: T0 + 2000 * ORA, net: -1 }],
    cere: async (u) => (/action=clasament/.test(u) ? { clasament: CL } : /pionex_tickers/.test(u) ? { data: { tickers: [{ symbol: "AAA_USDT_PERP", close: "1.1" }, { symbol: "BBB_USDT_PERP", close: "1.9" }] } }
      : /action=sugestii/.test(u) ? { istoric: [{ zi: "2026-09-20", simbol: "AAA_USDT_PERP", pret: 1, lista: "revenire" }, { zi: "2026-09-20", simbol: "BBB_USDT_PERP", pret: 2, lista: "short" }] } : null),
    trimite: async (u, c) => { trimise.push([u, c]); return { ok: true }; }, jurnal: () => {}, scrieStare: () => {} } };
}
await test("(6) tura sugestiilor: o dată pe zi, de la 8:00; istoricul pieței și al boților lui; urmărirea; notările zilei din clasament, cu prețul din tickere", async () => {
  const devreme = depsSugestii({ ora: 7 }); assert.equal(await turaSugestii(devreme.d), null); assert.equal(devreme.trimise.length, 0);
  const azi = depsSugestii({ stare: { zi: "2026-10-03" } }); assert.equal(await turaSugestii(azi.d), null);
  const k = depsSugestii({}), r = await turaSugestii(k.d);
  assert.equal(k.stare.zi, "2026-10-03"); assert.equal(k.trimise.length, 1); const [u, c] = k.trimise[0];
  assert.equal(u, "/api/istoric-bot?action=sugestii"); assert.equal(c.zi, "2026-10-03");
  assert.ok(c.dovada.revenire.piata && c.dovada.revenire.piata.baza.n > 0 && c.dovada.short.piata && c.dovada.short.piata.baza.n > 0, JSON.stringify(c.dovada).slice(0, 300));
  assert.ok(c.dovada.revenire.boti && c.dovada.revenire.boti.reper.n === 2 && c.dovada.short.boti.reper.n === 1);
  assert.equal(c.urmarire.revenire.n, 1); assert.equal(c.urmarire.revenire.pePlus, 1); assert.equal(c.urmarire.short.n, 1); assert.equal(c.urmarire.short.pePlus, 1);
  assert.deepEqual(c.noi, [{ simbol: "AAA_USDT_PERP", pret: 1.1, lista: "revenire" }, { simbol: "BBB_USDT_PERP", pret: 1.9, lista: "short" }]);
  assert.ok(r && r.noi.length === 2);
});
await test("(6) ruta sugestii: se scrie și se citește înapoi, curățată; notările fără dubluri (zi + simbol + listă), cel mult 20 pe trimitere", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, dv = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false, rau: 1 };
  const corp = { la: 7, zi: "2026-10-03", dovada: { revenire: { piata: dv, boti: { n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } } }, short: { piata: { ...dv, eticheta: "bomba" }, boti: null } },
    urmarire: { revenire: { n: 2, pePlus: 1, medie: 0.01, text: "Din 2 sugestii…" }, short: null },
    noi: [{ simbol: "aaa_usdt_perp", pret: 1.1, lista: "revenire" }, { simbol: "AAA_USDT_PERP", pret: 1.1, lista: "revenire" }, { simbol: "BBB_USDT_PERP", pret: 2, lista: "altceva" }, ...Array.from({ length: 30 }, (_, i) => ({ simbol: "X" + i + "_USDT_PERP", pret: 1, lista: "short" }))] };
  assert.equal((await cheama("istoric-bot.js", "POST", "action=sugestii", env, corp)).status, 200);
  const g = (await cheama("istoric-bot.js", "GET", "action=sugestii", env)).d;
  assert.ok(!("rau" in g.sugestii.dovada.revenire.piata)); assert.equal(g.sugestii.dovada.revenire.piata.eticheta, "mai slab"); assert.equal(g.sugestii.dovada.short.piata.eticheta, null);
  assert.equal(g.sugestii.dovada.revenire.boti.reper.n, 832); assert.equal(g.sugestii.dovada.short.boti, null); assert.equal(g.sugestii.urmarire.revenire.n, 2);
  assert.equal(g.istoric.filter((x) => x.simbol === "AAA_USDT_PERP").length, 1, "fără dubluri"); assert.ok(!g.istoric.some((x) => x.lista === "altceva"));
  assert.equal(g.istoric.length, 18, "cel mult 20 de rânduri citite pe trimitere: unul dublură și unul cu lista greșită ies");
  assert.deepEqual((await cheama("istoric-bot.js", "GET", "action=sugestii", { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() })).d, { sugestii: null, istoric: [] });
});
await test("(6) colectorul: tura sugestiilor legată în buclă și colectorul se încarcă întreg", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /import \{ turaSugestii as turaSugestiiModul \} from "\.\/lib\/tura-sugestii\.mjs";/); assert.match(s, /turaSugestiiColector\(\)\.catch\(\(e\) => jurnal\("sugestii", e\.message\)\);/);
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "colector.mjs")], { env: { ...process.env, COLECTOR_DOAR_INCARCA: "1" }, encoding: "utf8", timeout: 30000 });
  assert.equal(r.status, 0, (r.stderr || "").slice(0, 400)); assert.match(r.stdout, /INCARCAT true/);
});
console.log("\n" + (pica ? "V100.85 COLECTOR PICA · " + pica + " din " + (ok + pica) : "V100.85 COLECTOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
