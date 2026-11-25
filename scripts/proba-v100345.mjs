// Proba v100.345 (16.11.2026, el: „continua” după livrarea v100.344) - ce rămăsese deschis din v100.344:
//   1. urmărirea gridului îngust pe lista „Pe ce aș porni” amesteca regula veche (după scor) cu cea nouă (costurile de acum, de la 16.11):
//      notările noi poartă reg: 2, ruta le păstrează, iar Tabloul și pagina Grid socotesc separat regula nouă și pe cea veche;
//   2. cod mort: sugestiiIntraday (pre-market / gap) nu mai are chemător din v100.344 - scos din tura acțiunilor.
//   node scripts/proba-v100345.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.345 · urmărirea gridului îngust pe reguli, cod mort · proba\n");

const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, Date, Intl, RegExp }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "grid-calcul.js") + "\n" + citeste("public", "lib", "grid-proba.js") + "\nthis.GP = GridProba;", ctx);
const e = (net, o) => Object.assign({ simbol: "A" + Math.random(), la: 1, ore: 24, dir: "neutru", latime: 0.05, pas: 0.003, propus: true, r: { net } }, o);

await test("🔑 socoteala pe reguli: regula nouă (reg 2) separat de cea veche; textul spune ambele", () => {
  const l = [e(0.01, { reg: 2 }), e(-0.02, { reg: 2 }), e(0.03), e(0.04), e(0.05)];
  const s = ctx.GP.socotealaUrmarirePeReguli(l);
  assert.equal(s.nou.propuse.n, 2); assert.equal(s.vechi.propuse.n, 3);
  assert.match(s.text, /de la 16\.11/); assert.match(s.text, /Regula veche \(ordinea după scor, până la 16\.11\)/);
  const gol = ctx.GP.socotealaUrmarirePeReguli([e(0.01)]);
  assert.match(gol.text, /lista de la 16\.11 .* se urmărește de acum/i);
});
await test("🔑 tura gridului îngust: notările noi poartă reg 2", async () => {
  const { turaIngust } = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-ingust.mjs")).href);
  assert.match(citeste("scripts", "lib", "tura-ingust.mjs"), /lista\.push\(\{ simbol: x\.simbol, la: acum, dir: ing\.dir, ore: ing\.ore, latime: ing\.latime, pas: ing\.pas, propus: !!ing\.propus, reg: 2 \}\)/);
  assert.equal(typeof turaIngust, "function");
});
await test("🔑 ruta ingustUrmarire păstrează reg 2 (și nimic altceva nou)", async () => {
  const TOKEN = "t-345", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const lista = [{ simbol: "AAA_USDT_PERP", la: 5, dir: "long", ore: 24, latime: 0.05, pas: 0.003, propus: true, reg: 2 }, { simbol: "BBB_USDT_PERP", la: 5, dir: "short", ore: 24, latime: 0.05, pas: 0.003, propus: false, reg: 7 }];
  const req = new Request("https://exemplu.test/api/istoric-bot?action=ingustUrmarire", { method: "POST", headers: { "cf-connecting-ip": "10.0.3.45", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify({ lista }) });
  const r = await mod.onRequestPost({ request: req, env }); assert.equal(r.status, 200);
  const s = JSON.parse(kv.get("ingust-urmarire")); assert.equal(s[0].reg, 2); assert.ok(!("reg" in s[1]), "doar reg 2 se păstrează");
});
await test("Tabloul și pagina Grid folosesc socoteala pe reguli", () => {
  assert.match(citeste("public", "lib", "t212-ecran.js"), /GridProba\.socotealaUrmarirePeReguli\(tbUrm\.v\)\.text/);
  assert.match(cuTablou(citeste("public", "app.js")), /GridProba\.socotealaUrmarirePeReguli\(grUrm\.v\)\.text/);
});
await test("cod mort: sugestiiIntraday scos din tura acțiunilor (fără chemător din v100.344)", () => {
  assert.doesNotMatch(citeste("scripts", "lib", "tura-sugestii-actiuni.mjs"), /export async function sugestiiIntraday/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
