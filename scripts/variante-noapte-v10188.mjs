// Proba verificării de noapte (colector v101.88, el 07.10: „fa idei”): pe fiecare bot activ, „Compară variante” și „Compară ținte (TP)”
// pe aceleași drumuri, cu ACELEAȘI funcții ca pagina Monte Carlo; pe Discord doar sfaturile sigure, o dată (nu aceeași noapte de noapte).
// Fără rețea. Rulare: node scripts/variante-noapte-v10188.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import { mcsDinPagina, turaVarianteNoapte, cheieSfat } from "./lib/tura-variante-noapte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const GridProba = new Function("GridCalcul", lib("grid-proba.js") + "; return GridProba;")(GridCalcul);
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack).split("\n").slice(0, 4).join(" | ")}`); } }
console.log("\nV101.88 · verificarea de noapte (variante + TP pe aceleași drumuri) · proba\n");

const Mcs = mcsDinPagina(lib("monte-simbol.js"), lib("monte-simbol-ecran.js"), GridCalcul, GridProba);
// lumânări Pionex false (15M), mers aleator; cere(simbol, end) dă 500 pe pagină, de la end înapoi
function klines(zile, seed) { const g = Mcs.MonteSimbol.generator(seed), r = []; let c = 0.4; const t0 = Date.UTC(2026, 8, 1);
  for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); r.push({ time: t0 + i * 9e5, open: o, high: Math.max(o, c) * 1.001, low: Math.min(o, c) * 0.999, close: c, volume: 1 }); }
  return r; }
const K = klines(31, 5);
const cere = async (simbol, end) => { const l = K.filter((x) => end == null || x.time <= end), p = l.slice(-500); return { data: { klines: p.slice().reverse() } }; };
const bot = (o) => Object.assign({ id: "2408", activ: true, baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP", gridJos: 0.37, gridSus: 0.42, levier: 3, directie: "short", investit: 50, opritorPierdereActiv: true, opritorPierdere: 0.43, opritorProfitActiv: false, brut: { buOrderData: { row: 35 } } }, o);

await test("mcsDinPagina: aceleași funcții ca pagina (rulată în vm) ⇒ aceleași cifre pe aceleași date", () => {
  const ctx = {}; vm.createContext(ctx); ctx.GridCalcul = GridCalcul; ctx.GridProba = GridProba; ctx.TextRo = globalThis.TextRo;
  vm.runInContext(lib("monte-simbol.js"), ctx); vm.runInContext(lib("monte-simbol-ecran.js"), ctx);
  const b = GridCalcul.bare(K), P = b[b.length - 1].c, st = Mcs.mcsSetariBot([bot({})], "PONS");
  const a = Mcs.MonteSimbol.grid(b, Object.assign({ pret: P }, st), { zile: 7, n: 60, seed: 12 }), c = ctx.MonteSimbol.grid(b, Object.assign({ pret: P }, st), { zile: 7, n: 60, seed: 12 });
  assert.equal(a.p50, c.p50); assert.equal(typeof Mcs.mcsVariantaBuna, "function"); assert.equal(typeof Mcs.mcsTpRecomandat, "function"); assert.equal(typeof Mcs.mcsTpValid, "function");
});
await test("cheieSfat: același bot + același fel + același sfat ⇒ aceeași cheie; alt sfat ⇒ alta", () => {
  assert.equal(cheieSfat("1", "variante", "Aș încerca „x”: de obicei −3,9 USDT"), cheieSfat("1", "variante", "Aș încerca „x”: de obicei −3,9 USDT"));
  assert.notEqual(cheieSfat("1", "variante", "Aș încerca „x”"), cheieSfat("1", "variante", "Aș încerca „y”"));
  assert.notEqual(cheieSfat("1", "variante", "a"), cheieSfat("1", "tp", "a"));
});
await test("tura reală pe mers aleator: botul activ e simulat (variante + TP), cei opriți nu; fără sfat sigur ⇒ nimic pe Discord", async () => {
  const anunturi = [], stare = {};
  const r = await turaVarianteNoapte({ boti: [bot({}), bot({ id: "9", activ: false })], Mcs, GridCalcul, cere, anunta: async (m) => { anunturi.push(m); return true; }, stare, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, n: 80, acum: Date.UTC(2026, 9, 8, 1) });
  assert.equal(r.boti, 1); assert.equal(r.rezultate.length, 1);
  const x = r.rezultate[0]; assert.equal(x.sim, "PONS"); assert.match(x.variante, /^(Păstrează|Aș încerca)/); assert.match(x.tp, /^(Rămâi|Păstrează|Aș)/);
  assert.equal(anunturi.length, r.anuntate);
});
await test("un sfat sigur ⇒ un anunț (titlu cu moneda, mesajul = sfatul); aceeași noapte următoare, același sfat ⇒ nu din nou; sfat schimbat ⇒ da", async () => {
  const anunturi = [], stare = {}, McsS = Object.assign({}, Mcs, { mcsVariantaBuna: () => "Aș încerca „levier mai mic”: de obicei −3,9 USDT în loc de −5,8 USDT.", mcsTpRecomandat: () => "Rămâi fără TP: nimic." });
  const d = { boti: [bot({})], Mcs: McsS, GridCalcul, cere, anunta: async (m) => { anunturi.push(m); return true; }, stare, jurnal: () => {}, pauza: async () => {}, pauzaMs: 0, n: 40 };
  await turaVarianteNoapte(Object.assign({ acum: Date.UTC(2026, 9, 8, 1) }, d));
  assert.equal(anunturi.length, 1); assert.match(anunturi[0].titlu, /PONS/); assert.match(anunturi[0].mesaj, /^Aș încerca „levier mai mic”/); assert.equal(anunturi[0].nivel, "info");
  await turaVarianteNoapte(Object.assign({ acum: Date.UTC(2026, 9, 9, 1) }, d));
  assert.equal(anunturi.length, 1, "același sfat a doua noapte: tăcere");
  McsS.mcsVariantaBuna = () => "Aș încerca „jumătate din grile”: de obicei −4,0 USDT.";
  await turaVarianteNoapte(Object.assign({ acum: Date.UTC(2026, 9, 10, 1) }, d));
  assert.equal(anunturi.length, 2);
});
await test("TP-ul: la neutru nu se compară; TP de partea greșită ⇒ mcsTpValid îl scoate înainte; un bot care pică nu oprește tura", async () => {
  const vazute = [], McsS = Object.assign({}, Mcs, { mcsCalcTinteBot: (b, st) => { vazute.push(st); return Mcs.mcsCalcTinteBot(b, st, b[b.length - 1].c, { n: 30 }); } });
  const jurnalul = [];
  const r = await turaVarianteNoapte({ boti: [bot({ directie: "neutral" }), bot({ id: "7", directie: "long", gridJos: 0.37, gridSus: 0.42, opritorPierdere: 0.35, opritorProfitActiv: true, opritorProfit: 0.30 }), bot({ id: "8", baza: "XXX.PERP", simbolPionex: "XXX_USDT_PERP" })],
    Mcs: McsS, GridCalcul, cere: async (s, e) => { if (/XXX/.test(s)) throw new Error("Pionex 429"); return cere(s, e); }, anunta: async () => true, stare: {}, jurnal: (...a) => jurnalul.push(a.join(" ")), pauza: async () => {}, pauzaMs: 0, n: 30, acum: Date.UTC(2026, 9, 8, 1) });
  assert.equal(vazute.length, 1, "doar long-ul (neutru nu)"); assert.equal(vazute[0].tp, null, "TP sub preț la long ⇒ scos");
  assert.equal(r.rezultate.length, 2); assert.ok(jurnalul.some((l) => /XXX/.test(l) && /429/.test(l)));
});
await test("colectorul: încarcă modulele paginii, tura noaptea (eNoapte), o dată pe zi, v101.88", () => {
  const c = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.(8[8-9]|9\d)"/);
  assert.match(c, /mcsDinPagina\(/); assert.match(c, /monte-simbol-ecran\.js/);
  assert.match(c, /async function turaVarianteNoapte\(\)/); assert.match(c, /turaVarianteNoapteModul\(/);
  const f = c.slice(c.indexOf("async function turaVarianteNoapte()"), c.indexOf("async function turaVarianteNoapte()") + 1500);
  assert.match(f, /eNoapte\(/); assert.match(f, /tineRitm\("varianteNoapte"/);
  assert.match(c, /turaVarianteNoapte\(\)/.source && /turaVarianteNoapte\(\);|turaVarianteNoapte\(\)\)|\.then\(\(\) => turaVarianteNoapte\(\)\)/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
