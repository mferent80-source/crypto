// Proba v100.385 (24.11.2026, el: „fă tot” după auditul paginii botului — valul 2, prima parte):
//   A  I-930 curba botului de la pornire: totalul, din grile, din poziție (total − realizat); cea mai mare cădere și cel mai bun moment, cu ora; rărită la ≤ 300 de puncte
//   B  I-930 desenul: SVG cu cele trei linii, punctele MAE / MFE, rândul de sub el; sub 3 puncte ⇒ nimic; pagina o pune sub „Banii botului” și redesenează la istoria sosită
//   C  I-931 fluxul: OI pe 1 h / 24 h (prețul din aceleași puncte), funding-ul Pionex în bani pe poziție (plătește / încasează, pe plată și pe zi), long/short
//   D  I-931 semnele contra botului (OI cu prețul contra, funding plătit peste 0,1% / zi, mulțimea pe partea botului) și culoarea doar la ≥ 2; lichidările spuse
//   E  I-931 pagina: cererea (futures + funding Pionex, 5 minute pe monedă), locul după #tbConcret, legată la deschiderea botului
//   V  versiunea v100.385, proba în lanț după v100.384
// Rulare: node scripts/proba-v100385.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n") : "";
const LIBF = (f) => citeste("../public/lib/" + f), APP = citeste("../public/app.js");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
const J = (x) => JSON.parse(JSON.stringify(x));
console.log("\nv100.385 · Tabloul botului, valul 2: curba botului (I-930) și fluxul monedei (I-931) · proba\n");

const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js"]) vm.runInContext(LIBF(f), c, { filename: f });
const TE = c.TabloExtra;
const T0 = Date.UTC(2026, 10, 24, 13, 37);
const intr = (n, f) => Array.from({ length: n }, (_, i) => f(i)).map((x) => ({ investit: 222.68, ...x }));

await test("A  I-930 curbaBot: din grile / din poziție, MAE și MFE cu ora, intrările dinainte de pornire scoase, rărită la ≤ 300", () => {
  const l = intr(500, (i) => ({ t: T0 + i * 60000, profitTotal: i === 100 ? -30 : i === 50 ? 4 : -i * 0.01, profitNet: -0.5, gridProfitBrut: i * 0.005 }));
  l.push({ t: T0 - 3600000, profitTotal: 99, profitNet: 0 });   // dinainte de pornire: nu intră
  const k = J(TE.curbaBot(l, T0));
  assert.equal(k.n, 500); assert.ok(k.puncte.length <= 300 && k.puncte.length >= 200); assert.equal(k.puncte[k.puncte.length - 1].t, T0 + 499 * 60000, "ultimul punct rămâne");
  assert.deepEqual(k.mae, { v: -30, t: T0 + 100 * 60000 }); assert.deepEqual(k.mfe, { v: 4, t: T0 + 50 * 60000 });
  assert.equal(k.acum.total, -4.99); assert.ok(Math.abs(k.acum.poz - (-4.99 + 0.5)) < 1e-9, "poziția = total − realizat"); assert.ok(Math.abs(k.acum.grile - 2.495) < 1e-9);
  assert.equal(TE.curbaBot(l.slice(0, 2), T0), null, "sub 3 puncte");
});

await test("B  I-930 curbaBotHtml: trei linii, MAE / MFE, rândul cu banii; pagina îl pune sub „Banii botului” și redesenează la istoria sosită", () => {
  const l = intr(30, (i) => ({ t: T0 + i * 60000, profitTotal: [0, -2, -23, 3.5][i % 4], profitNet: -1, gridProfitBrut: i * 0.1 }));
  const h = TE.curbaBotHtml(l, { pornitLa: T0 }, T0 + 40 * 60000);
  assert.equal((h.match(/<path /g) || []).length, 3); assert.equal((h.match(/<circle /g) || []).length, 2);
  assert.match(h, /cea mai mare cădere de la pornire: <b>−23,0 USDT<\/b>/); assert.match(h, /cel mai bun moment: <b>\+3,5 USDT<\/b>/); assert.match(h, /din istoria colectorului \(30 de puncte, cam unul pe minut\)/);
  assert.equal(TE.curbaBotHtml([], { pornitLa: T0 }, T0), "");
  assert.match(APP, /tbRandUmpleri\(b\)\+\(typeof TabloExtra!=="undefined"&&TabloExtra\.curbaBotHtml\?TabloExtra\.curbaBotHtml\(typeof tbSapt!=="undefined"&&tbSapt&&tbSapt\.botId===b\.id\?tbSapt\.intrari:null,b,Date\.now\(\)\):""\);/);
  assert.match(APP, /tbDeseneazaSaptPlan\(tbStare\.bot\);if\(typeof tbDeseneazaBanii==="function"\)try\{tbDeseneazaBanii\(tbStare\.bot\)\}catch\(e\)\{\}\}   \/\* v100\.385 \(I-930\)/);
});

// fluxul: 289 de puncte la 5 minute, prețul = valoare / cantitate
const oiH = (fq, fp) => Array.from({ length: 289 }, (_, i) => { const q = fq(i), p = fp(i); return { sumOpenInterest: String(q), sumOpenInterestValue: String(q * p), timestamp: T0 + i * 300000 }; });
const F = (o) => ({ oiUsd: 1e7, longShort: 1.42, topLs: 2.02, funding: 0.0009, fundingIntervalHours: 4, oiHist5m: oiH((i) => 1000, (i) => 1), ...o });
const PX = [{ fundingRate: "0.0002", fundingTime: T0 }, { fundingRate: "0.0001", fundingTime: T0 - 4 * 3600000 }];
const BOT = (o) => ({ directie: "long", pozitie: 18744, pretCurent: 0.02343, investit: 222.68, ...o });

await test("C  I-931 fluxBot: OI și prețul pe 1 h / 24 h, funding-ul Pionex în bani (long plătește la rată pozitivă, short încasează), long/short", () => {
  const r = J(TE.fluxBot(F({ oiHist5m: oiH((i) => (i < 277 ? 1000 : 1100), (i) => (i < 277 ? 1 : 1.02)) }), PX, BOT()));
  assert.ok(Math.abs(r.oi1h - (1100 * 1.02 / 1000 - 1)) < 1e-9); assert.ok(Math.abs(r.p1h - 0.02) < 1e-9); assert.ok(Math.abs(r.oi24h - (1100 * 1.02 / 1000 - 1)) < 1e-9);
  assert.equal(r.fundOre, 4); assert.ok(Math.abs(r.plata - -0.0002 * 18744 * 0.02343) < 1e-12, "long plătește"); assert.ok(Math.abs(r.peZi - r.plata * 6) < 1e-12);
  const s = J(TE.fluxBot(F(), PX, BOT({ directie: "short", pozitie: -18744 }))); assert.ok(s.plata > 0, "short încasează");
  assert.equal(TE.fluxBot(null, PX, BOT()), null);
  const t = TE.textFlux(r, "BULLA");
  assert.match(t, /^Fluxul pe BULLA \(Binance futures\): interesul deschis 10,0 mil\. USDT · 1 h \+12,2% · 24 h \+12,2% \(prețul: 1 h \+2,0%, 24 h \+2,0%\) · funding Pionex \+0,0200% la 4 h ⇒ botul plătește ~0,09 USDT pe plată, ~0,5 pe zi · long\/short pe conturi 1,42, la cei mai mari 2,02 · lichidările din piață nu le am/);
});

await test("D  I-931 semnele contra botului (ipoteze): OI cu prețul contra, funding plătit, mulțimea pe partea lui; culoarea doar la ≥ 2", () => {
  // short: prețul urcă 2% cu OI +10% într-o oră, mulțimea pe short (0,7), funding plătit de short la rată negativă
  const PXn = [{ fundingRate: "-0.002", fundingTime: T0 }, { fundingRate: "-0.002", fundingTime: T0 - 4 * 3600000 }];
  const r = J(TE.fluxBot(F({ longShort: 0.7, oiHist5m: oiH((i) => (i < 277 ? 1000 : 1080), (i) => (i < 277 ? 1 : 1.02)) }), PXn, BOT({ directie: "short", pozitie: -18744 })));
  assert.equal(r.semne.length, 3); assert.equal(r.ton, "rau"); assert.match(r.semne[0], /^interesul deschis crește cu prețul contra botului/); assert.match(r.semne[2], /squeeze/);
  const una = J(TE.fluxBot(F(), PX, BOT({ pozitie: 400000 }))); assert.equal(una.semne.length, 1); assert.equal(una.ton, "atentie");
  const nimic = J(TE.fluxBot(F(), PX, BOT({ directie: "short", pozitie: -18744 }))); assert.equal(nimic.semne.length, 0); assert.equal(nimic.ton, "info");
  assert.match(TE.textFlux(nimic, "BULLA"), /— niciun semn contra botului acum$/);
  assert.match(TE.textFlux(r, "BULLA"), /— semne contra botului \(ipoteze, nedovedite pe boții tăi\): /);
});

await test("E  I-931 pagina: futures + funding Pionex o dată la 5 minute pe monedă, rândul după #tbConcret, legat la deschiderea botului", () => {
  assert.match(APP, /tbAduSaptamana\(b\);if\(typeof tbAduFlux==="function"\)tbAduFlux\(b\);tbAduSemnale\(b\);/);
  assert.match(APP, /getJSON\("\/api\/market\?type=futures&symbol="\+encodeURIComponent\(sim\)\)/); assert.match(APP, /getJSON\("\/api\/market\?type=pionex_funding&symbol="\+encodeURIComponent\(px\)\)/);
  assert.match(APP, /if\(tbFlux\.sim===sim&&Date\.now\(\)-tbFlux\.la<5\*60000\)/); assert.match(APP, /el=document\.createElement\("p"\);el\.id="tbFlux";el\.className="tbSub tbFlux";cc\.parentNode\.insertBefore\(el,cc\.nextSibling\)/);
  assert.doesNotMatch(citeste("../public/index.html"), /id="tbFlux"/, "index.html neatins");
});

await test("V  versiunea v100.385 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO), colectorul neatins (v101.213)", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.386: „de la 385 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.386) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 385); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 385); assert.ok(bi.li385 && bi.li385.length > 150, "BUILD_INFO.li385");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 385).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 385); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 385);
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("./colector.mjs")) || [])[1] >= 213);
  assert.match(pk.scripts.test, /npm run test:v100384 && npm run test:v100385/); assert.equal(pk.scripts["test:v100385"], "node scripts/proba-v100385.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
