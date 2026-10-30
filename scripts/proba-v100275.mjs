// Proba v100.275 / colector v101.149 (30.10, el: „piața azi de pe radar sună cam ciudat pe descrierea asta și nici nu arată nimic”):
// (1) clasamentul de 100 de monede trecea de plafonul de 64 KB al rutei (din v101.145 regimul poartă `mare`) ⇒ 413 la fiecare tură, Acasă „FĂRĂ DATE”;
//     acum colectorul trimite doar câmpurile pe care ruta le păstrează. (2) măsura frânei spusă pe limba lui, rezultatele cu o zecimală.
//   node scripts/proba-v100275.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { turaClasament, deTrimis } from "./lib/tura-clasament.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GC = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(G);
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.275 · PIAȚA AZI · proba\n");

// aleatorul: mulberry32 (capcana LCG)
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const H4 = 4 * 3600000, T0 = Date.UTC(2026, 5, 1);
function klines(seed) {
  const r = mulberry32(seed), out = []; let p = 0.5 + r() * 100;
  for (let i = 0; i < 501; i++) { const o = p; p = p * (1 + (r() - 0.5) * (i > 490 ? 0.2 : 0.04)); out.push({ time: T0 + i * H4, open: String(o), high: String(Math.max(o, p) * 1.01), low: String(Math.min(o, p) * 0.99), close: String(p), volume: "1" }); }
  return out;
}
const SIMBOLURI = Array.from({ length: 100 }, (_, i) => ["1000000BABYDOGE", "1000PEPE", "BTC", "ETH", "SOL", "FARTCOIN", "PARTI"][i % 7] + i + "_USDT_PERP");
const TOKEN = "token-de-proba-v100275";
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [] }) }; }
async function posteaza(env, corp) {
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "_" + Math.random());
  const req = new Request("https://exemplu.test/api/istoric-bot?action=clasament", { method: "POST", headers: { "cf-connecting-ip": "10.0.2.75", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify(corp) });
  const res = await m.onRequestPost({ request: req, env });
  return { status: res.status, d: await res.json() };
}
async function tura() {
  const trimise = [];
  const r = await turaClasament({
    cere: async (u) => (/pionex_tickers/.test(u) ? { data: { tickers: SIMBOLURI.map((s, i) => ({ symbol: s, amount: String(1e9 - i * 1e6), close: "1" })) } } : { data: { klines: klines(SIMBOLURI.indexOf(decodeURIComponent(u.match(/symbol=([^&]+)/)[1])) + 1) } }),
    trimite: async (u, c) => { trimise.push(c); return { ok: true }; }, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0,
    GridCalcul: G, GridClasament: GC, Reveniri: R, top: 100, acum: () => T0 + 500 * H4,
  });
  return { r, trimise };
}

await test("clasamentul de 100 de monede: corpul de până acum e refuzat de ruta reală (413), cel nou trece și ruta păstrează aceleași câmpuri", async () => {
  const { r, trimise } = await tura();
  assert.equal(r.monede.length, 100); assert.equal(trimise.length, 1);
  assert.ok(r.monede.some((m) => m.regim && m.regim.mare && typeof m.regim.mare === "object"), "fixtura poartă `mare` ca tura reală");
  assert.ok(r.monede.some((m) => m.stare === "evita") && r.monede.some((m) => m.stare === "candidat"), "fixtura are și monede în mișcare, și liniștite");
  const vechi = JSON.stringify({ la: 1, monede: r.monede }), nou = JSON.stringify(trimise[0]);
  assert.ok(vechi.length > 65536, "corpul vechi trecea de 64 KB: " + vechi.length);
  assert.ok(nou.length < 0.8 * 65536, "corpul nou stă cu loc sub 64 KB: " + nou.length);
  const envV = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await posteaza(envV, { la: 1, monede: r.monede })).status, 413, "bugul reprodus pe ruta reală");
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const w = await posteaza(env, trimise[0]);
  assert.equal(w.status, 200); assert.equal(w.d.monede, 100);
  // ruta păstrează exact ce păstra din corpul întreg: 10 monede întregi (sub plafon) față de aceleași 10 subțiate
  const envA = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, envB = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  assert.equal((await posteaza(envA, { la: 5, monede: r.monede.slice(0, 10) })).status, 200);
  assert.equal((await posteaza(envB, { la: 5, monede: r.monede.slice(0, 10).map(deTrimis) })).status, 200);
  assert.deepEqual(JSON.parse(envB.ISTORIC.m.get("clasament")), JSON.parse(envA.ISTORIC.m.get("clasament")));
  // `monede` întoarse colectorului rămân întregi
  assert.ok(r.monede.every((m) => Array.isArray(m.motive)));
});

await test("deTrimis: regimul doar cu r4h / r24h / miscare; fără regim ⇒ null; revenire doar când există", () => {
  const m = { simbol: "X_USDT_PERP", stare: "evita", dir: "long", tarie: "slab", motive: ["a"], volum: 1, pret: 2, latime: 0.1, pas: 0.003, grile: 30, profitGrila: 0.002, traversariZi: 4, scor: 0.1, regim: { r4h: 1.2, r24h: 2.5, miscare: true, s4h: 1, s24h: 2, sens: "urca", mare: { k: 6, p: 0.9 } }, revenire: { cadere: 0.3, revine: true } };
  assert.deepEqual(deTrimis(m), { simbol: "X_USDT_PERP", stare: "evita", dir: "long", tarie: "slab", revenire: { cadere: 0.3, revine: true }, volum: 1, pret: 2, latime: 0.1, pas: 0.003, grile: 30, profitGrila: 0.002, traversariZi: 4, scor: 0.1, regim: { r4h: 1.2, r24h: 2.5, miscare: true } });
  const f = deTrimis({ simbol: "Y_USDT_PERP", stare: "fara-date", regim: null });
  assert.equal(f.regim, null); assert.ok(!("revenire" in f));
  // fiecare câmp pe care ruta îl citește e trimis (lista din rută = lista din colector)
  const api = citeste("functions", "api", "istoric-bot.js"), bloc = api.slice(api.indexOf('if(action==="clasament"){\n    const la'));
  const campNr = JSON.parse(bloc.match(/const CAMP_NR=(\[[^\]]+\])/)[1]);
  for (const k of campNr.concat(["simbol", "stare", "dir", "tarie", "revenire"])) assert.ok(k in deTrimis(m), "lipsește " + k);
});

// cifrele din captura lui (30.10): 10 zile salvate, 3 cu frână la 18:31 / 05:51 / 06:02, câte 10 boți pe fiecare parte
const zi = (d) => "2026-10-" + String(d).padStart(2, "0");
const baza = { raportStare: "ok", eveniment: "", raport: { valoare: { total: 100000 }, risc: { var95: 1000 } } };
const ORE = { 26: "2026-10-26T18:31:00+02:00", 27: "2026-10-27T05:51:00+02:00", 29: "2026-10-29T06:02:00+02:00" };
const zile = Array.from({ length: 10 }, (_, i) => { const d = 21 + i; return ORE[d] ? { z: zi(d), pauza: true, pauzaN: 3, la: Date.parse(ORE[d]), ...baza } : { z: zi(d), pauza: false, ...baza }; });
const zece = (t, sum, rez) => Array.from({ length: 10 }, () => ({ pornit: Date.parse(t), baza: sum / 10, rezultat: rez / 10 }));
const boti = zece("2026-10-26T20:00:00+02:00", 12425.60, -335.89).concat(zece("2026-10-27T03:00:00+02:00", 5437.54, -245.02), zece("2026-10-22T12:00:00+02:00", 16280.48, -110.12));

await test("textul pe cifrele lui: fără „gura” / „poza înghețată” / „partea liniștită”, cu o zecimală", () => {
  const m = AC.masuraFranei(boti, zile);
  assert.equal(m.text, "Frâna de azi, pusă pe zilele salvate (21.10.2026 – 30.10.2026): în 3 zile din 10 ar fi zis „nu porni”, de la: 26.10.2026 18:31, 27.10.2026 05:51, 29.10.2026 06:02 (ora României). "
    + "Boții pe care i-ar fi oprit: 12.425,6 puși, rezultat −335,9. Boții din aceleași zile, porniți mai devreme: 5.437,5 puși, rezultat −245,0. "
    + "În zilele fără frână (7 zile): 16.280,5 puși, rezultat −110,1. Prea puține zile ca să tragem o concluzie (trebuie cel puțin 10 de fiecare parte). Asta nu arată că frâna face bani.");
  assert.doesNotMatch(m.text, /gura|Poza|înghețat|Cartea|Partea liniștită|Eșantion|\d,\d\d\b/);
  // același obiect întors (cont-ecran și Acasă citesc aceleași câmpuri)
  assert.equal(m.schimbate, 3); assert.equal(m.complete, 10); assert.equal(m.insuficient, true);
});

await test("o zecimală fără „−0,0”; nicio zi cu frână se spune pe față", () => {
  const z = AC.masuraFranei(Array.from({ length: 10 }, () => ({ pornit: Date.parse("2026-10-22T12:00:00+02:00"), baza: 10, rezultat: -0.004 })), [{ z: "2026-10-22", pauza: false, ...baza }]);
  assert.match(z.text, /^Frâna de azi, pusă pe zilele salvate \(22\.10\.2026\): n-ar fi zis „nu porni” în nicio zi\. În zilele fără frână \(1 zi\): 100,0 puși, rezultat 0,0\./);
  assert.doesNotMatch(z.text, /−0,0/);
});

// v100.276: de la v100.275 / v101.149 în sus (ca probele vechi), nu exact
await test("versiunile: de la v100.275 în aplicație, de la v101.149 în colector", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 275, String(app));
  assert.match(citeste("BUILD_INFO.json"), new RegExp('"version": "v100\\.' + app + '"'));
  assert.match(citeste("public", "index.html"), new RegExp('content="v100\\.' + app + '" name="app-version"'));
  assert.ok(Number(citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 149);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
