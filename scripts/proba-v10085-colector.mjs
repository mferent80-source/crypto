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

console.log("\n" + (pica ? "V100.85 COLECTOR PICA · " + pica + " din " + (ok + pica) : "V100.85 COLECTOR PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
