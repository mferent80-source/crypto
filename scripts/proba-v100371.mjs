// Proba v100.371 (20.11.2026, el: „fa tot” ⇒ ce rămăsese pe dinafară după Contul întreg): minusul „−” la lățimea pieței SUA de pe Piața azi.
// Proba de telefon pica la fiecare livrare pe „9▲/23▼ (net -14), slab (NL domina)” și pe „9 ▲ / 23 ▼ · net -14” (minusul ASCII ca semn).
//   node scripts/proba-v100371.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.371 · minusul pe Piața azi · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "latime-us.js"), ctx);
const LU = ctx.LatimeUS, ACUM = Date.parse("2026-11-20T12:00:00Z");
const MB = (nh, nl, text, randuri) => ({ schemaVersion: 1, sources: { sp500: { history: [{ date: "2026-11-19", above200: 0.5 }], latest: { date: "2026-11-19", above200: 0.5, above50: 0.4, ma8: 0.45, ma200: 0.6, bearish: true } },
  uptrend: { history: [{ date: "2026-11-19", ratio: 0.17 }], market: { ratio: 0.17, ma10: 0.15, trend: "up", count: 480, total: 2775 }, sectors: [] } },
  full: { engine: { data: { sp: { score: 27, zone: "Weakening", exposure: "40-60%", weakest: "Bearish Signal Status (10)", data_date: "2026-11-19" } },
    master: { score: -2, stance: "PRUDENTA / DEFENSIV", action: "Redu expunerea.", confidence: "MEDIE - acoperire partiala", net_ceiling: 40,
      scorecard: randuri || [["New Highs - New Lows", -1, text], ["Market timing (distribution days)", -2, "max 8 dist.days, 1/3 sub MM50"], ["Breadth participare (4/4 surse valide)", 0, "Mixt / racire (idx 41.4, min 27.0)"]] }, analysis: { flags: [] } },
    ideas: { asOf: "2026-11-19", nh_nl: { new_highs: nh, new_lows: nl, net: nh - nl } } } });
const MINUS_ASCII = /(^|[\s(:=·/[])-(?=\d)/;   /* regula probei de telefon (proba-ecran-telefon-conventii.mjs) */

await test("textul robotului pe minus: „9▲/23▼ (net -14), slab (NL domina)” ⇒ „… · net −14 · slab (minimele domină)”; forma veche pe plus rămâne la fel", () => {
  const sc = (t) => (LU.extins(MB(9, 23, t), ACUM).scorecard.find((c) => /New Highs/.test(c.ce)) || {}).text;
  assert.equal(sc("9▲/23▼ (net -14), slab (NL domina)"), "9 maxime ▲ / 23 minime ▼ · net −14 · slab (minimele domină)");
  assert.equal(sc("33▲/23▼ (net +10), mixt"), "33 maxime ▲ / 23 minime ▼ · net +10 · mixt");
  assert.equal(sc("40▲/5▼ (net +35), puternic (NH domina)"), "40 maxime ▲ / 5 minime ▼ · net +35 · puternic (maximele domină)");
});
await test("orice minus ASCII ca semn din textele robotului devine „−”; intervalele („60-80%”) și datele rămân", () => {
  const sc = (t) => LU.extins(MB(9, 23, t), ACUM).scorecard[0].text;
  assert.equal(sc("randament -3.5% (fata de -1.2%)"), "randament −3,5% (fata de −1,2%)"); assert.equal(sc("expunere 60-80%"), "expunere 60-80%"); assert.equal(sc("din 2026-11-05"), "din 2026-11-05");
  for (const c of LU.extins(MB(9, 23, "9▲/23▼ (net -14), slab (NL domina)"), ACUM).scorecard) assert.doesNotMatch(c.text, MINUS_ASCII, c.text);
});
await test("cardul „Market Breadth · SUA”: „New Highs − New Lows … 9 ▲ / 23 ▼ · net −14” (minime peste maxime); pe plus „net +10”, la egal „net 0”", () => {
  const src = citeste("public", "lib", "latime-us.js");
  assert.match(src, /x\.nhnl\.maxime - x\.nhnl\.minime > 0 \? "\+" : x\.nhnl\.maxime - x\.nhnl\.minime < 0 \? "−" : ""\) \+ Math\.abs\(x\.nhnl\.maxime - x\.nhnl\.minime\)/);
  const card = (ma, mi) => { const x = LU.extins(MB(ma, mi, "x"), ACUM); assert.equal(x.nhnl.maxime, ma); return LU.htmlCard(x).replace(/<[^>]+>/g, " "); };
  assert.match(card(9, 23), /9 ▲ \/ 23 ▼ · net −14/); assert.match(card(33, 23), /33 ▲ \/ 23 ▼ · net \+10/); assert.match(card(5, 5), /5 ▲ \/ 5 ▼ · net 0/);
  assert.doesNotMatch(card(9, 23), /net -\d/);
});
await test("celelalte texte ale robotului (toate formele din breadth_dashboard.py): follow-through, „pe preț”, date vechi, washout, small-caps, „sănătos”", () => {
  const sc = (r) => { const c = LU.extins(MB(9, 23, "", [r]), ACUM).scorecard[0]; return c.ce + " ¦ " + c.text; };
  assert.equal(sc(["Market timing (distribution days)", -1, "max 9 dist.days, 3/3 sub MM50, follow-through recent"]), "Market Timing · Distribution Days ¦ până la 9 zile de distribuție · 3 din 3 indici sub MM50 · Follow-Through Day recent");
  assert.equal(sc(["Market timing (distribution days)", -2, "max 8 dist.days, 1/3 sub MM50"]), "Market Timing · Distribution Days ¦ până la 8 zile de distribuție · 1 din 3 indici sub MM50");
  assert.equal(sc(["Market timing (distribution days)", -2, "max 21 dist.days, 2/3 sub MM50"]), "Market Timing · Distribution Days ¦ până la 21 de zile de distribuție · 2 din 3 indici sub MM50");   /* „de” de la 20 (garda v100.75 a oprit prima livrare) */
  assert.equal(sc(["Confirmare risc (VIX/credit/breadth pret)", 1, "mixt / neconcludent (VIX 28.4)"]), "Confirmare risc ¦ VIX, credit, breadth pe preț · mixt / neconcludent (VIX 28,4)");
  assert.equal(sc(["Breadth participare (2/4 surse valide)", 0, "Mixt / racire (idx 41.4, min 27.0) ⚠️ STALE 8z - vot neutralizat"]), "Breadth participare ¦ 2/4 surse valide · mixt / răcire · media 41,4, minimul 27 · date vechi de 8 zile, vot neutralizat");
  assert.equal(sc(["Breadth participare (4/4 surse valide)", 0, "Mixt / racire (idx 41.4, min 27.0) (date vechi de 5z)"]), "Breadth participare ¦ 4/4 surse valide · mixt / răcire · media 41,4, minimul 27 · date vechi de 5 zile");
  assert.equal(sc(["Washout contrarian (8MA<0.40)", 1, "istoric BULLISH (+9.9%/60z)"]).split(" ¦ ")[1].replace(/^.* · /, ""), "istoric bullish (+9,9% la 60 de zile)");
  assert.equal(sc(["Small-caps", -1, "raman in urma (risk-off incipient)"]), "Small-caps ¦ rămân în urmă (risk-off incipient)"); assert.equal(sc(["Small-caps", 1, "conduc (risk-on)"]), "Small-caps ¦ conduc (risk-on)");
  assert.equal(sc(["New Highs - New Lows", 1, "90▲/10▼ (net +80), sanatos (NH domina)"]), "New Highs − New Lows ¦ 90 maxime ▲ / 10 minime ▼ · net +80 · sănătos (maximele domină)");
});
await test("proba 196-statistica (în afara lanțului) e aliniată la textul din v100.352: numără variantele fără eroare", () => {
  const p = citeste("scripts", "proba-v100196-statistica.mjs"), s = citeste("scripts", "lib", "tura-variante-noapte.mjs");
  assert.match(p, /rowsV\\\.filter\\\(\\\(r\\\) => !\\\(r\\\.g && r\\\.g\\\.eroare\\\)\\\)\\\.length - 1/); assert.match(s, /aleasă dintre " \+ cate\(rowsV\.filter\(\(r\) => !\(r\.g && r\.g\.eroare\)\)\.length - 1, "variantă", "variante"\)/);
});
await test("V versiunile de la v100.371 încolo (index ×4, sw, versiune.js, package + lanț, BUILD_INFO)", () => {
  const H = citeste("public", "index.html"), vh = (H.match(/v100\.(\d{3})/g) || []).map((v) => +v.slice(5)); assert.equal(vh.length, 4); assert.ok(vh.every((v) => v >= 371 && v === vh[0]), "index: " + vh.join(", ")); assert.doesNotMatch(H, /v100\.370/);   /* v100.372: „de la încolo” */
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 371); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 371);
  const p = JSON.parse(citeste("package.json")); assert.ok(+(/^100\.(\d+)\.0$/.exec(p.version) || [])[1] >= 371, p.version); assert.match(p.scripts.test, /npm run test:v100370 && npm run test:v100371/); assert.equal(p.scripts["test:v100371"], "node scripts/proba-v100371.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(+(/^v100\.(\d+)/.exec(bi.badge) || [])[1] >= 371, bi.badge);   /* v100.380: „de la 371 încolo” și peste 379 (tiparul 37[1-9] se oprea la v100.379) */ assert.ok(bi.mi371 && bi.ci370);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
