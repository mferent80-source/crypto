// Proba colector v101.69 (05.10, el: „fă 5”): lumânările de 1 h pentru ARHIVA boților (toate monedele, de la cel mai vechi bot), ca
// măsurătorile pe arhivă (I-530 ADX, I-469 situațiile asemănătoare) să nu mai prindă doar 528 din 2.214 boți (barele erau doar pe 51 de monede,
// de la 6 luni). Fișierele separate (data/istoric-1h-arhiva) - profilul monedei rămâne pe istoric-1h, tăiat la 6 luni.
// (1) planul · (2) adusul înapoi, cu buget, reluat · (3) monedele care pică nu opresc tura · (4) legătura în colector · (E) versiunea.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GridCalcul = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "grid-calcul.js"), "utf8") + "; return GridCalcul;")();
const TA = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-arhiva-ore.mjs")).href);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba colector v101.69 · lumânările de 1 h pentru arhiva boților");

const ORA = 3600000, ZI = 24 * ORA, T = Date.UTC(2026, 9, 5, 12);
const z = (s) => Date.parse(s + "T00:00:00Z");

await test("(1) planul: pe monedă, de la cel mai vechi bot − 3 zile până la cel mai nou SAU până unde încep barele de acum; ce e acoperit nu intră", () => {
  const trades = [{ moneda: "AAA", pornit: z("2026-01-10") }, { moneda: "AAA", pornit: z("2026-03-01") }, { moneda: "AAA", pornit: z("2026-02-01") }, { moneda: "BBB", pornit: z("2026-05-01") }, { moneda: "CCC", pornit: z("2026-02-15") }, { moneda: "", pornit: 1 }];
  const p = TA.planArhiva(trades, (m) => (m === "BBB" ? z("2026-04-05") : m === "CCC" ? z("2026-02-20") : null));
  assert.deepEqual(p.map((x) => x.moneda), ["AAA", "CCC"], "BBB e acoperită de barele de acum; AAA (3 boți) înaintea CCC (1)");
  assert.equal(p[0].deLa, z("2026-01-10") - 3 * ZI); assert.equal(p[0].panaLa, z("2026-03-01") + ORA); assert.equal(p[0].boti, 3);
  assert.equal(p[1].panaLa, z("2026-02-15") + ORA, "CCC: până la botul ei (barele de acum încep după)");
  const p2 = TA.planArhiva([{ moneda: "DDD", pornit: z("2026-06-01") }], () => z("2026-01-01")); assert.equal(p2.length, 0, "botul e după începutul barelor de acum");
  const p3 = TA.planArhiva([{ moneda: "EEE", pornit: z("2026-03-01") }], () => z("2026-02-27")); assert.equal(p3[0].panaLa, z("2026-02-27"), "până unde încep barele de acum (fără gaură, fără dublură)");
});

// bursă falsă: 1 bară/oră, de la 2025-11-20; pagina = cele 500 de dinaintea lui endTime (sau ultimele 500); ZZZ pică
const START = z("2025-11-20");
function bursa() {
  const cereri = [];
  const cere = async (url) => {
    const u = new URL("http://x" + url), s = u.searchParams.get("symbol"), end = Number(u.searchParams.get("endTime")) || T; cereri.push(s + "@" + new Date(end).toISOString().slice(0, 13));
    if (/^ZZZ/.test(s)) return { result: false, code: "MARKET_INVALID_SYMBOL" };
    const ult = Math.floor(end / ORA) * ORA, r = [];
    for (let t = ult; t > ult - 500 * ORA && t >= START; t -= ORA) r.push({ time: t, open: "1", close: "1.01", high: "1.02", low: "0.99", volume: "5" });
    return { result: true, data: { klines: r.reverse() } };
  };
  return { cere, cereri };
}
function disc() { const f = {}; return { f, citeste: (m) => f[m] || [], scrie: (m, r) => { f[m] = r; } }; }
const D = (b, dsk, st, extra) => Object.assign({ acum: T, cere: b.cere, pauza: async () => {}, jurnal: () => {}, simbolPentru: async (m) => m + "_USDT_PERP",
  citeste: dsk.citeste, scrie: dsk.scrie, stare: st, scrieStare: () => {}, buget: 100, GridCalcul }, extra || {});

await test("(2) adusul: înapoi în timp, pagină cu pagină, până la începutul planului; o bară o singură dată; a doua rulare nu mai cere nimic", async () => {
  const b = bursa(), dsk = disc(), st = {}, plan = [{ moneda: "AAA", deLa: z("2026-01-07"), panaLa: z("2026-03-01") + ORA, boti: 3 }];
  const r = await TA.turaArhivaOre(D(b, dsk, st, { plan }));
  const t = dsk.f.AAA.map((x) => x.time);
  assert.ok(t[0] <= z("2026-01-07") && t[t.length - 1] >= z("2026-03-01"), "acoperă tot planul");
  assert.equal(new Set(t).size, t.length, "fără dubluri"); assert.ok(t.every((x, i) => !i || x > t[i - 1]), "în ordine");
  assert.equal(b.cereri.length, 3, "53 de zile ⇒ 3 pagini de 500 h: " + b.cereri.join(" "));
  assert.equal(st.gata.AAA, true); assert.equal(r.cereri, 3);
  b.cereri.length = 0; await TA.turaArhivaOre(D(b, dsk, st, { plan })); assert.equal(b.cereri.length, 0, "gata ⇒ nimic cerut");
});
await test("(2) bugetul: se oprește la N cereri și noaptea următoare continuă de unde a rămas (fără să ia de la capăt)", async () => {
  const b = bursa(), dsk = disc(), st = {}, plan = [{ moneda: "AAA", deLa: z("2025-12-01"), panaLa: z("2026-03-01") + ORA, boti: 9 }, { moneda: "BBB", deLa: z("2026-02-01"), panaLa: z("2026-02-10"), boti: 1 }];
  const r1 = await TA.turaArhivaOre(D(b, dsk, st, { plan, buget: 2 }));
  assert.equal(r1.cereri, 2); assert.equal(b.cereri.length, 2); assert.ok(!st.gata || !st.gata.AAA, "AAA nu e gata"); assert.equal(dsk.f.BBB, undefined, "BBB n-a început");
  const min1 = dsk.f.AAA[0].time; b.cereri.length = 0;
  await TA.turaArhivaOre(D(b, dsk, st, { plan, buget: 100 }));
  assert.ok(b.cereri[0].startsWith("AAA_USDT_PERP@" + new Date(min1 - 1).toISOString().slice(0, 13)), "continuă sub ce avea: " + b.cereri[0]);
  assert.ok(dsk.f.AAA[0].time <= z("2025-12-01") && st.gata.AAA && st.gata.BBB);
});
await test("(2) o monedă care începe DUPĂ planul ei (listată mai târziu) e gata când bursa nu mai dă nimic mai vechi, nu se cere la nesfârșit", async () => {
  const b = bursa(), dsk = disc(), st = {}, plan = [{ moneda: "NOU", deLa: z("2025-10-01"), panaLa: z("2025-12-01"), boti: 1 }];
  await TA.turaArhivaOre(D(b, dsk, st, { plan })); assert.equal(st.gata.NOU, true); assert.ok(b.cereri.length <= 3, b.cereri.join(" "));
});
await test("(3) moneda care pică se notează și se sare (cu așteptare care crește), restul merg mai departe", async () => {
  const b = bursa(), dsk = disc(), st = {}, plan = [{ moneda: "ZZZ", deLa: z("2026-02-01"), panaLa: z("2026-02-05"), boti: 5 }, { moneda: "AAA", deLa: z("2026-02-01"), panaLa: z("2026-02-05"), boti: 1 }];
  await TA.turaArhivaOre(D(b, dsk, st, { plan }));
  assert.equal(st.esuat.ZZZ.n, 1); assert.equal(st.gata.AAA, true);
  b.cereri.length = 0; await TA.turaArhivaOre(D(b, dsk, st, { plan })); assert.equal(b.cereri.filter((c) => c.startsWith("ZZZ")).length, 0, "în așteptare");
  await TA.turaArhivaOre(D(b, dsk, st, { plan, acum: T + 2 * ZI })); assert.equal(st.esuat.ZZZ.n, 2, "după așteptare se reîncearcă");
});
await test("(4) colectorul: tura arhivei noaptea, între profil și cazuri; cazurile citesc barele arhivei + cele de acum, unite; v101.69", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /import \{ turaArhivaOre as turaArhivaOreModul, planArhiva \} from "\.\/lib\/tura-arhiva-ore\.mjs";/);
  assert.match(col, /turaProfil\(\)\.then\(\(\) => turaArhivaOre\(\)\)\.then\(\(\) => turaCazuri\(\)\)/);
  assert.match(col, /const ORE_ARHIVA_DIR = path\.join\(DATA, "istoric-1h-arhiva"\)/);
  assert.match(col, /GridCalcul\.imbinaRanduri\(citesteArhiva\(m\), ore, 0\)/, "cazurile: arhiva + barele de acum");
  assert.match(col, /if \(!eNoapte\(Date\.now\(\)\)\) return;/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.(69|[7-9]\d)";/);
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
