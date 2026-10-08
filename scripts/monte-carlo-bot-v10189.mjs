// Proba turei Monte Carlo pe boți (colector v101.89, el 08.10: „fa ideile” - ideea B): la 15 minute, pe fiecare bot activ, același motor ca
// Tabloul (GridSim din pagină, botul reluat); pe Discord DOAR când verdictul își schimbă felul. Fără rețea. Rulare: node scripts/monte-carlo-bot-v10189.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import { mcsDinPagina } from "./lib/tura-variante-noapte.mjs";
import { gridSimDinPagina, categorie, turaMonteCarloBot } from "./lib/tura-monte-carlo-bot.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const GridCalcul = new Function(lib("grid-calcul.js") + "; return GridCalcul;")();
const GridProba = new Function("GridCalcul", lib("grid-proba.js") + "; return GridProba;")(GridCalcul);
const Mcs = mcsDinPagina(lib("monte-simbol.js"), lib("monte-simbol-ecran.js"), GridCalcul, GridProba);
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack).split("\n").slice(0, 4).join(" | ")}`); } }
console.log("\nV101.89 · Monte Carlo pe boți la 15 minute, pe Discord doar la schimbarea verdictului · proba\n");

function klines(zile, seed) { const g = Mcs.MonteSimbol.generator(seed), r = []; let c = 0.4; const t0 = Date.now() - zile * 96 * 9e5;
  for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * 0.008); r.push({ time: t0 + i * 9e5, open: o, high: Math.max(o, c) * 1.001, low: Math.min(o, c) * 0.999, close: c, volume: 1 }); }
  return r; }
const K = klines(31, 5), P0 = K[K.length - 1].close;
const bot = (o) => Object.assign({ id: "2408", activ: true, baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP", gridJos: P0 * 0.9, gridSus: P0 * 1.1, levier: 2, directie: "long", investit: 50, opritorPierdereActiv: true, opritorPierdere: P0 * 0.85, pornitLa: K[K.length - 288].time, brut: { buOrderData: { row: 11 } }, profitNet: 0.3 }, o || {});
const GridSim = gridSimDinPagina(lib("grid-sim.js"), GridCalcul, GridProba, Mcs.MonteSimbol);
const deps = (o) => { const trimise = []; return Object.assign({ trimise, boti: [bot()], GridSim, GridCalcul, randuri15: async () => K, stare: { boti: {} }, jurnal: () => {}, n: 60, anunta: async (m, b, cheie) => { trimise.push({ m, b, cheie }); return true; } }, o || {}); };

await test("gridSimDinPagina: motorul paginii, fără să murdărească globalThis", () => {
  assert.equal(typeof GridSim.simuleaza, "function"); assert.equal(typeof GridSim.verdictScurt, "function"); assert.equal(globalThis.GridSim, undefined);
});
await test("categorie: felul verdictului din «ce aș face»", () => {
  assert.equal(categorie("Aș ține: de aici încolo câștigă…"), "tine"); assert.equal(categorie("Aș opri: …"), "opreste"); assert.equal(categorie("L-aș opri: lichidare…"), "opreste"); assert.equal(categorie("N-aș porni așa: …"), "opreste");
  assert.equal(categorie("Reluarea arată botul OPRIT pe drumul real: …"), "opreste"); assert.equal(categorie("Nu se potrivește cu planul tău: …"), "plan"); assert.equal(categorie("Stopul e în zgomot: atins…"), "zgomot");
  assert.equal(categorie("O aruncare de ban de aici încolo: …"), "ban"); assert.equal(categorie(""), "alt");
});
await test("prima socotire pe un bot TACE (nimic de comparat) și ține minte felul; a doua, cu același fel, tot tace", async () => {
  const d = deps(); const r = await turaMonteCarloBot(d);
  assert.deepEqual([r.boti, r.simulati, r.anuntate, r.erori], [1, 1, 0, 0]); assert.equal(d.trimise.length, 0);
  const s = d.stare.boti["2408"]; assert.ok(s && s.cat && s.text && s.la > 0, JSON.stringify(s)); assert.match(s.text, /^de aici încolo, 7 zile: /);
  const la = s.la; const r2 = await turaMonteCarloBot(d); assert.equal(r2.anuntate, 0); assert.equal(d.stare.boti["2408"].la, la, "„de când” rămâne de la prima dată cu felul ăsta");
});
await test("felul s-a schimbat ⇒ UN mesaj pe Discord, cu felul vechi și de când; nivel „atentie” la oprește / plan; cheia pe fel", async () => {
  const d = deps(); await turaMonteCarloBot(d); const acum = d.stare.boti["2408"].cat, altul = acum === "tine" ? "zgomot" : "tine";
  d.stare.boti["2408"] = { cat: altul, text: "x", la: Date.now() - 3600000, ultima: Date.now() - 900000 };
  const r = await turaMonteCarloBot(d); assert.equal(r.anuntate, 1); assert.equal(d.trimise.length, 1);
  const t = d.trimise[0]; assert.equal(t.b, "2408"); assert.equal(t.cheie, "mc-verdict-" + acum); assert.match(t.m.titlu, /^🎰 PONS: Monte Carlo zice acum «[^»]+» \(era «[^»]+» de la \d\d:\d\d\)$/); assert.match(t.m.mesaj, / · șanse pe drumuri ca ultimele 14 zile, nu o predicție$/);
  assert.equal(t.m.nivel, acum === "opreste" || acum === "plan" ? "atentie" : "info"); assert.equal(d.stare.boti["2408"].cat, acum); assert.ok(Date.now() - d.stare.boti["2408"].la < 5000, "de când = acum (fel nou)");
});
await test("botul închis iese din stare; botul fără grid se sare; lumânările picate ⇒ eroare numărată, nu crăpare; botul mai vechi decât lumânările ⇒ ca bot nou, spus", async () => {
  const d = deps(); await turaMonteCarloBot(d); d.boti = []; await turaMonteCarloBot(d); assert.deepEqual(Object.keys(d.stare.boti), []);
  const d2 = deps({ boti: [bot({ gridJos: 0, gridSus: 0 })] }); const r2 = await turaMonteCarloBot(d2); assert.deepEqual([r2.boti, r2.simulati], [0, 0]);
  const d3 = deps({ randuri15: async () => { throw new Error("Pionex n-a răspuns"); } }); const r3 = await turaMonteCarloBot(d3); assert.deepEqual([r3.boti, r3.simulati, r3.erori], [1, 0, 1]);
  const d4 = deps({ boti: [bot({ pornitLa: K[0].time - 10 * 86400000 })] }); await turaMonteCarloBot(d4); assert.match(d4.stare.boti["2408"].text, /^ca bot pornit acum \(/);
});
await test("colectorul: tura la 15 minute, starea în ritm (mcBoti), lumânările colectorului, planul botului; versiunea v101.89", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /import \{ turaMonteCarloBot as turaMonteCarloBotModul, gridSimDinPagina \} from "\.\/lib\/tura-monte-carlo-bot\.mjs"/);
  assert.match(col, /const GridSim = gridSimDinPagina\(fs\.readFileSync\(path\.join\(RAD, "public", "lib", "grid-sim\.js"\), "utf8"\), GridCalcul, GridProba, Mcs\.MonteSimbol\)/);
  const i = col.indexOf("async function turaMonteCarloBot()"), f = col.slice(i, i + 1600); assert.ok(i > 0, "tura există");
  assert.match(f, /Date\.now\(\) - mcBotLa < 15 \* 60000/); assert.match(f, /randuri15: lumanari15M/); assert.match(f, /tineRitm\("mcBoti", st\.boti\)/); assert.match(f, /anunta: \(m, bot, cheie\) => trimiteAlerta\(m, bot, cheie\)/);
  assert.match(col, /turaMonteCarloBot\(\)\.catch\(\(e\) => jurnal\("monte carlo boți", e\.message\)\)/); assert.match(col, /VERSIUNE_COLECTOR = "v101\.89"/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "PICA" : "trec"}`);
if (picate) process.exit(1);
