// Proba pentru fereastra "Ce spun indicatorii" din Tabloul botului (v91.8, 26.09).
// Rulare: node scripts/indicatori-v918.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

vm.runInThisContext(fs.readFileSync(new URL("../public/lib/indicatori-bot.js", import.meta.url), "utf8"));
const I = globalThis.IndicatoriBot;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
// ce da calc() pe VVV in dimineata de 26.09 (15 min / 1 ora BEARISH, 4 ore NEUTRAL, 1 zi BULLISH)
const Q = (o) => ({ ver: "NEUTRAL", score: 50, ema: false, emaDir: "UP", supertrend: "BULL", macd: true, adx: 22, pdi: 20, mdi: 15, rsi: 55, stoch: 60, bbpos: 60, mfi: 55, ...o });
const VVV = [
  { eticheta: "15 min", q: Q({ ver: "BEARISH", score: 30, emaDir: "DOWN", supertrend: "BEAR", macd: false, rsi: 39, pdi: 12, mdi: 25, adx: 28 }) },
  { eticheta: "1 oră", q: Q({ ver: "BEARISH", score: 30, rsi: 43 }) },
  { eticheta: "4 ore", q: Q({ ver: "NEUTRAL", score: 59 }) },
  { eticheta: "1 zi", q: Q({ ver: "BULLISH", score: 81, ema: true, rsi: 67 }) },
];

await test("lumanarile Pionex -> forma lui calc: [t,o,h,l,c,v,...], in ordine de timp, fara randuri stricate", () => {
  const r = I.dinPionex([{ time: 2, open: "2", high: "3", low: "1", close: "2.5", volume: "10" }, { time: 1, open: "1", high: "2", low: "1", close: "1.5", volume: "4" }, null, { time: 3, close: "x" }]);
  assert.equal(r.length, 2); assert.equal(r[0][0], 1); assert.equal(r[1][4], "2.5"); assert.equal(r[1][2], "3"); assert.equal(r[1][3], "1");
});
// v91.8: celula e SCURTA (sageata + cifra, incape in 4 coloane pe ~300 px); cuvintele stau in titlu (mouse)
await test("celulele: scurte (cel mult 6 semne), verdict cu scor, culori pe directie, extremele in portocaliu; explicatia in titlu", () => {
  const c = I.celule(VVV[0].q);
  assert.deepEqual([c.verdict.t, c.verdict.c], ["↓ 30", "bad"]); assert.match(c.verdict.titlu, /coboară/);
  assert.equal(c.supertrend.c, "bad"); assert.equal(c.macd.t, "↓"); assert.equal(c.rsi.t, "39"); assert.equal(c.rsi.c, "bad"); assert.match(c.rsi.titlu, /vânzătorii/);
  assert.equal(c.adx.t, "28"); assert.equal(c.adx.c, "bad"); assert.match(c.adx.titlu, /trend/);
  const z = I.celule(VVV[3].q); assert.equal(z.verdict.c, "good"); assert.equal(z.ema.t, "↑"); assert.match(z.ema.titlu, /așezat/);
  const e = I.celule(Q({ rsi: 74, stoch: 92, bbpos: 12, adx: 14 }));
  assert.equal(e.rsi.c, "tbWarn"); assert.match(e.rsi.titlu, /încins/); assert.equal(e.stoch.c, "tbWarn"); assert.equal(e.bb.c, "tbWarn"); assert.equal(e.adx.c, "neutral"); assert.match(e.adx.titlu, /liniște/);
  for (const q of [VVV[0].q, VVV[3].q, Q({ rsi: 74, stoch: 92, bbpos: 12, adx: 14 })]) { const cc = I.celule(q); for (const r of I.RANDURI) assert.ok([...cc[r.k].t].length <= 6, `${r.k}: "${cc[r.k].t}" prea lung`); }
});
await test("valorile lipsa (MFI fara volum, NaN, null) -> '—', niciodata NaN pe ecran", () => {
  const c = I.celule(Q({ mfi: null, rsi: NaN, adx: undefined, bbpos: null, macd: undefined, supertrend: undefined }));
  for (const k of ["mfi", "rsi", "adx", "bb", "macd", "supertrend"]) assert.equal(c[k].t, "—", k);
  for (const r of I.RANDURI) assert.ok(!/NaN|undefined|null/.test(JSON.stringify(c[r.k])), r.k);
  assert.equal(I.celule(null), null);
});
await test("fiecare rand al ferestrei are eticheta si explicatia lui, si o celula calculata", () => {
  const c = I.celule(VVV[2].q);
  for (const r of I.RANDURI) { assert.ok(r.eticheta && r.titlu.length > 20, r.k); assert.ok(c[r.k] && c[r.k].t, r.k); }
});
await test("rezumat VVV long (dimineata 26.09): impotriva doar pe termen scurt -> atentie, spune ca 1 zi arata urcare", () => {
  const r = I.rezumat(VVV, "long");
  assert.equal(r.ton, "atentie"); assert.match(r.text, /Cu botul \(long\): 1 din 4/); assert.match(r.text, /15 min, 1 oră/); assert.match(r.text, /termen scurt/);
});
await test("rezumat: 4 ore SI 1 zi impotriva -> rau; unul din ele -> atentie; toate cu botul -> bine", () => {
  const contra = VVV.map((x) => ({ ...x, q: { ...x.q, ver: "BEARISH" } }));
  assert.equal(I.rezumat(contra, "long").ton, "rau");
  assert.equal(I.rezumat(contra, "short").ton, "bine");
  // 26.09 dupa-amiaza: 15m/1h/4h neutre, 1 zi urca -> spune si care sunt neutre, nu doar "1 din 4"
  const neutre = VVV.map((x) => ({ ...x, q: { ...x.q, ver: x.eticheta === "1 zi" ? "BULLISH" : "NEUTRAL" } }));
  const n = I.rezumat(neutre, "long"); assert.equal(n.ton, "bine"); assert.match(n.text, /1 din 4 \(1 zi\)/); assert.match(n.text, /neutru: 15 min, 1 oră, 4 ore/);
  const unul = VVV.map((x) => ({ ...x, q: { ...x.q, ver: x.eticheta === "4 ore" ? "BEARISH" : "BULLISH" } }));
  assert.equal(I.rezumat(unul, "long").ton, "atentie");
});
await test("rezumat fara directie de bot (neutru) sau fara date -> descrie, nu judeca; nu crapa", () => {
  assert.equal(I.rezumat(VVV, "neutru").ton, "neutru"); assert.match(I.rezumat(VVV, "neutru").text, /Urcă pe 1 zi/);
  assert.match(I.rezumat([], "long").text, /N-am destule/); assert.match(I.rezumat([{ eticheta: "1 zi", q: null }], "long").text, /N-am destule/);
  assert.match(I.rezumat(null, "long").text, /N-am destule/);
});

// v91.8: "in functie de ce arata poate sa arate si o predictie, eu decid" - estimarea din istoric (kNN-ul lui
// "Analizeaza piata"), cu eticheta ONESTA: masurat, nimereste directia cat dat cu banul (48,8%).
const HP = (o) => ({ up: 64, down: 36, avg: 1.2, k: 40, banda: 11, nEff: 30, inBanda: false, ...o });
await test("estimarea pe interval: '↑64%' / '↓61%', gri cand e in zgomot, explicatia cu orizontul si 'nedovedit' in titlu", () => {
  const e = I.estimare(HP(), "16 ore");
  assert.deepEqual([e.t, e.c], ["↑64%", "good"]); assert.match(e.titlu, /16 ore/); assert.match(e.titlu, /40 situații/); assert.match(e.titlu, /nedovedit/i);
  const d = I.estimare(HP({ up: 39, down: 61 }), "4 ore"); assert.deepEqual([d.t, d.c], ["↓61%", "bad"]);
  const z = I.estimare(HP({ up: 55, down: 45, inBanda: true }), "1 oră"); assert.equal(z.c, "neutral"); assert.match(z.titlu, /zgomot/);
  assert.equal(I.estimare(null, "4 zile").t, "—"); assert.equal(I.estimare({ up: NaN }, "4 zile").t, "—");
});
await test("predictia: pe 4 ore (orizontul botului), cu directia, fata de bot si eticheta 'cat dat cu banul' MEREU", () => {
  const r = [{ eticheta: "15 min", hp: HP({ up: 30, down: 70 }) }, { eticheta: "4 ore", hp: HP() }, { eticheta: "1 zi", hp: null }];
  const p = I.predictie(r, "long");
  assert.match(p.text, /16 ore/); assert.match(p.text, /64%/); assert.match(p.text, /în favoarea botului/); assert.match(p.text, /48,8%/);
  assert.match(I.predictie([{ eticheta: "4 ore", hp: HP({ up: 35, down: 65 }) }], "long").text, /împotriva botului/);
  const z = I.predictie([{ eticheta: "4 ore", hp: HP({ up: 53, down: 47, inBanda: true }) }], "long");
  assert.match(z.text, /fără semn/); assert.match(z.text, /48,8%/);
  // 26.09: "a urcat in 32%, adica in zgomot" suna fals -> spune directia MAJORITARA si de ce nu conteaza (zgomotul)
  const zj = I.predictie([{ eticheta: "4 ore", hp: HP({ up: 32, down: 68, banda: 22, inBanda: true }) }], "long").text;
  assert.match(zj, /a coborât în 68%/); assert.match(zj, /±22/); assert.doesNotMatch(zj, /urcat în 32%/);
  assert.match(I.predictie([{ eticheta: "4 ore", hp: null }], "long").text, /n-am destule bare/i);
  assert.match(I.predictie(null, "long").text, /n-am destule bare/i);
});

// v91.9: "fa toate 3 si lasa tabelul cum e" - Mediul botului: miscarea (singurul semnal DOVEDIT pentru grid),
// funding-ul (cost + cine e inghesuit) si BTC (monedele mici merg dupa el).
const F = (rate, hist) => ({ rate, hist: hist || Array(90).fill(0.00005), intervalOre: 4 });
await test("mediul: miscarea - liniste sub prag = bine; peste 1,5x pe 4h sau 24h = rau, cu motivul dovedit", () => {
  const m = I.mediu({ regim: { r4h: 0.3, r24h: 0.48, miscare: false } }, "long").find((x) => x.k === "miscare");
  assert.equal(m.ton, "bine"); assert.match(m.text, /liniște/); assert.match(m.text, /0,3×/); assert.match(m.text, /0,48×|0,5×/); assert.match(m.titlu, /1,5×/);
  const r = I.mediu({ regim: { r4h: 2.1, r24h: 0.9, miscare: true } }, "long").find((x) => x.k === "miscare");
  assert.equal(r.ton, "rau"); assert.match(r.text, /mișcare/); assert.match(r.titlu, /după mișcare/);
  assert.equal(I.mediu({ regim: null }, "long").find((x) => x.k === "miscare").ton, "neutru");
});
await test("mediul: funding - cine plateste, cat pe zi (din bot), fata de obisnuit; mult peste obisnuit pe partea botului = atentie", () => {
  const n = I.mediu({ funding: F(0.00005), fundingZi: -0.0548 }, "long").find((x) => x.k === "funding");
  assert.equal(n.ton, "neutru"); assert.match(n.text, /0,005%/); assert.match(n.text, /plătesc long/); assert.match(n.text, /−0,05 USDT pe zi/); assert.match(n.text, /ca de obicei/);
  const mare = I.mediu({ funding: F(0.0004), fundingZi: -0.3 }, "long").find((x) => x.k === "funding");
  assert.equal(mare.ton, "atentie"); assert.match(mare.text, /8× față de obicei/); assert.match(mare.titlu, /înghesui/);
  const sh = I.mediu({ funding: F(0.0004) }, "short").find((x) => x.k === "funding"); assert.match(sh.text, /încasezi/); assert.equal(sh.ton, "bine");
  const neg = I.mediu({ funding: F(-0.0002) }, "long").find((x) => x.k === "funding"); assert.match(neg.text, /plătesc short/); assert.match(neg.text, /încasezi/);
  assert.equal(I.mediu({ funding: null }, "long").find((x) => x.k === "funding").ton, "neutru");
});
await test("mediul: BTC - directia pe 4h + miscarea; BTC coboara in miscare contra unui bot long = rau, doar coboara = atentie", () => {
  const b = I.mediu({ btc: { dir: "urca", regim: { r4h: 0.25, r24h: 0.48, miscare: false } } }, "long").find((x) => x.k === "btc");
  assert.equal(b.ton, "bine"); assert.match(b.text, /↑ urcă/); assert.match(b.text, /liniște/);
  assert.equal(I.mediu({ btc: { dir: "coboara", regim: { r4h: 1.8, r24h: 1.2, miscare: true } } }, "long").find((x) => x.k === "btc").ton, "rau");
  assert.equal(I.mediu({ btc: { dir: "coboara", regim: { r4h: 0.4, r24h: 0.5, miscare: false } } }, "long").find((x) => x.k === "btc").ton, "atentie");
  assert.equal(I.mediu({ btc: null }, "long").find((x) => x.k === "btc").ton, "neutru");
});
await test("mediul: mereu 3 randuri, in ordinea miscare / funding / BTC; fara NaN pe date stricate", () => {
  const l = I.mediu({ regim: { r4h: NaN, r24h: null }, funding: { rate: NaN, hist: [] }, btc: { dir: null, regim: null } }, "long");
  assert.deepEqual(l.map((x) => x.k), ["miscare", "funding", "btc"]);
  assert.ok(!/NaN|undefined|null/.test(JSON.stringify(l)), JSON.stringify(l));
  assert.deepEqual(I.mediu(null, null).map((x) => x.k), ["miscare", "funding", "btc"]);
});

console.log(`\nINDICATORI_V918 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
