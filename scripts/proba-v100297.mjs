// Proba v100.297 (el, 03.11.2026: „un soft care îmi spune ce trade fac azi … integrată în aplicația Radar”): pagina „Trade-ul zilei”.
// Ce probează:
//   1. modelul PUR (lib/trade-zilei.js) pe lumânări sintetice: P3 după formula înghețată (aceeași cifră ca portul Python), clasa de
//      calibrare, P1 = 1 când nivelul e atins deja, P1 scade cu distanța, nimic din viitor (barele de mâine nu schimbă azi);
//   2. trade-ul zilei: fără niciun trade dovedit ⇒ textul cinstit; cu unul dovedit (simulat) ⇒ propus doar când condiția e îndeplinită;
//   3. ecranul (lib/trade-zilei-ecran.js) în vm: cartela cu cifrele, starea de încărcare / eroare, lista probei A/B/C;
//   4. legarea: meniul, secțiunea, butonul „mai multe”, navTo, pagina zilnică, scripturile, CSS; versiunile v100.297 peste tot.
//   node scripts/proba-v100297.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as panda from "./lib/panda-ultima.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.297 · Trade-ul zilei · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);        // TextRo.cate („12 ore”, „21 de ore”, „1 oră”) - ca în aplicație
vm.runInContext(citeste("public", "lib", "trade-zilei.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei-ecran.js"), ctx);
const TZ = ctx.TradeZilei;
const ORA = 3600000, ZI = 86400000, T0 = Math.floor(1761955200000 / ZI) * ZI;   // 2025-11-01 00:00 UTC

// lumânări sintetice: `zile` zile întregi cu range-ul dat (fracție), apoi `oreAzi` ore din ziua de azi
function bare(ranges, oreAzi, pretAzi) {
  const out = []; let p = 100;
  ranges.forEach((r, d) => {
    for (let h = 0; h < 24; h++) {
      const t = T0 + d * ZI + h * ORA, hi = p * (1 + r / 2), lo = p * (1 - r / 2);
      out.push({ t, o: p, h: h === 12 ? hi : p * 1.001, l: h === 6 ? lo : p * 0.999, c: p });
    }
  });
  for (let h = 0; h < oreAzi; h++) out.push({ t: T0 + ranges.length * ZI + h * ORA, o: pretAzi, h: pretAzi * 1.001, l: pretAzi * 0.999, c: pretAzi });
  return out;
}
const sigm = (z) => 1 / (1 + Math.exp(-z));

await test("1a. P3 = formula înghețată (comp = ieri / media d-11..d-2, r1 / r2), aceeași cifră ca portul Python", () => {
  const r = Array(12).fill(0.04); r[11] = 0.02; r[10] = 0.025;     // ieri 2 %, alaltăieri 2,5 %; media d-11..d-2 (alaltăieri INCLUS, ca în Python) = (9×4 + 2,5)/10 = 3,85 % ⇒ comp 0,519
  const d = TZ.azi(bare(r, 3, 100), T0 + 12 * ZI + 3 * ORA);
  assert.ok(!d.eroare, d.eroare);
  const comp = 0.02 / ((9 * 0.04 + 0.025) / 10);
  const ast = sigm(TZ.COEF_P3[0] + TZ.COEF_P3[1] * Math.log(comp) + TZ.COEF_P3[2] * Math.log(0.02 / 0.025));
  assert.ok(Math.abs(d.p3 - ast) < 1e-9, `${d.p3} vs ${ast}`);
  assert.ok(Math.abs(d.comp - comp) < 1e-9 && Math.abs(d.r1 - 0.02) < 1e-9);
  assert.ok(Math.abs(d.media10 - (8 * 0.04 + 0.025 + 0.02) / 10) < 1e-12, "media10 = d-10..d-1, ieri inclus");
  assert.equal(TZ.clasa(d.p3).deLa, Math.floor(d.p3 * 10) / 10);
  assert.ok(Math.abs(d.asteptat.med - d.media10 * TZ.clasa(d.p3).med * (d.factorZi || 1)) < 1e-12, "range-ul așteptat = media10 × mediana clasei (× factorul zilei, v100.299)");
  assert.equal(d.bareAzi, 3); assert.equal(d.bareRamase, 21);   // 3 ore închise, acum = 03:00 ⇒ 21 rămase, cu cea în curs (ca în Python: cnt − pos)
});

await test("1b. P1: nivelul atins deja ⇒ 1; mai departe de nivel ⇒ probabilitate mai mică; peste maxim ⇒ atins", () => {
  const r = Array(12).fill(0.04);
  const aproape = TZ.azi(bare(r, 3, 101.5), T0 + 12 * ZI + 3 * ORA);       // maximul de ieri = 102
  const departe = TZ.azi(bare(r, 3, 100.5), T0 + 12 * ZI + 3 * ORA);
  assert.ok(aproape.p1Sus.p > departe.p1Sus.p, `${aproape.p1Sus.p} vs ${departe.p1Sus.p}`);
  assert.ok(!aproape.p1Sus.atins && aproape.p1Sus.dist > 0);
  const peste = TZ.azi(bare(r, 3, 102.5), T0 + 12 * ZI + 3 * ORA);
  assert.equal(peste.p1Sus.p, 1); assert.equal(peste.p1Sus.atins, true);
});

await test("1c. nimic din viitor: barele de mâine nu schimbă cifrele de azi (azi se judecă după `acum`)", () => {
  const r = Array(12).fill(0.04); r[11] = 0.02;
  const b1 = bare(r, 3, 100), acum = T0 + 12 * ZI + 3 * ORA;
  const b2 = b1.concat(bare(Array(0), 0, 100), [{ t: T0 + 13 * ZI, o: 100, h: 130, l: 70, c: 90 }]);   // o bară „de mâine”, sălbatică
  const d1 = TZ.azi(b1, acum), d2 = TZ.azi(b2, acum);
  assert.equal(d1.p3, d2.p3); assert.equal(d1.pdh, d2.pdh); assert.equal(d1.panaAcum, d2.panaAcum);
});

await test("1d. prea puține zile ⇒ eroare cinstită, nu cifre", () => {
  const d = TZ.azi(bare(Array(5).fill(0.04), 3, 100), T0 + 5 * ZI + 3 * ORA);
  assert.match(d.eroare, /prea puține zile/);
});

await test("2. trade-ul zilei: nimic dovedit ⇒ textul cinstit; un trade dovedit (simulat) ⇒ doar când e îndeplinită condiția", () => {
  const r = Array(12).fill(0.04); r[11] = 0.02; r[10] = 0.025;
  const d = TZ.azi(bare(r, 3, 100), T0 + 12 * ZI + 3 * ORA);
  assert.ok(Object.values(TZ.PROBA).every((p) => p.dovedit === false), "proba din 03.11: nimic dovedit");
  assert.match(TZ.trade(d).text, /Niciun trade cu avantaj dovedit/);
  const salv = TZ.PROBA.A.dovedit; TZ.PROBA.A.dovedit = true;
  try {
    assert.equal(TZ.trade(Object.assign({}, d, { p3: 0.8 })).fel, "A");
    assert.equal(TZ.trade(Object.assign({}, d, { p3: 0.5 })).fel, "niciunul");
  } finally { TZ.PROBA.A.dovedit = salv; }
  assert.equal(TZ.trade({ eroare: "x" }).fel, "eroare");
});

await test("3. ecranul în vm: cartela cu cifrele, trade-ul cinstit, stările, lista probei", () => {
  const r = Array(12).fill(0.04); r[11] = 0.02; r[10] = 0.025;
  const d = TZ.azi(bare(r, 3, 100), T0 + 12 * ZI + 3 * ORA);
  const h = ctx.tzHtml({ monede: [{ simbol: "BTC", d }, { simbol: "XYZ", eroare: "nu am putut citi lumânările (x)" }], la: Date.now(), inLucru: false, eroare: null }, Date.now());
  assert.match(h, /Azi se mișcă mai mult ca ieri/); assert.match(h, /Cât se mișcă azi, de obicei/); assert.match(h, /Maximul de ieri/); assert.match(h, /Minimul de ieri/);
  assert.match(h, /Niciun trade cu avantaj dovedit/); assert.match(h, /nu am putut citi lumânările/);
  assert.match(h, /De ce nu-ți propun un trade/); assert.match(h, /NEDOVEDIT/);
  assert.doesNotMatch(h, /\d\.\d+ %/, "procentele cu virgulă, nu cu punct");
  assert.match(h, /3 ore închise, 21 de ore rămase/, "numerele cu „de” de la 20 și singular la 1 (TextRo.cate)");
  assert.match(h, /NEDOVEDIT · pe anul de confirmare/, "cifrele OOS ale probei apar în listă");
  assert.match(ctx.tzHtml({ monede: [], la: 0, inLucru: true, eroare: null }), /Aduc lumânările/);
  assert.match(ctx.tzHtml({ monede: [], la: 0, inLucru: false, eroare: "pică" }), /pică/);
  assert.equal(JSON.stringify(ctx.tzSimboluri().map((x) => x.simbol + ":" + x.pionex)), JSON.stringify(["BTC:BTC_USDT_PERP", "ETH:ETH_USDT_PERP", "SOL:SOL_USDT_PERP"]));   // alt realm vm ⇒ prototipuri diferite
});

await test("4. legarea în aplicație: meniu, secțiune, „mai multe”, navTo, pagină zilnică, scripturi, CSS", () => {
  const H = citeste("public", "index.html"), A = citeste("public", "app.js"), C = citeste("public", "app.css");
  assert.match(H, /data-action-click="navTo\('tradezilei',true\)" data-nav="tradezilei"/);
  assert.match(H, /<section class="panel" id="tradezilei">/); assert.match(H, /id="tzPagina"/);
  assert.match(H, /moreNav\('tradezilei',true\)/);
  assert.ok(H.indexOf('<script src="/lib/trade-zilei.js"></script>') > 0 && H.indexOf('<script src="/lib/trade-zilei-ecran.js"></script>') > H.indexOf('<script src="/lib/trade-zilei.js"></script>'), "scripturile, pur înainte de ecran");
  assert.ok(H.indexOf('<script src="/lib/grid-calcul.js"></script>') < H.indexOf('<script src="/lib/trade-zilei-ecran.js"></script>'), "GridCalcul înaintea ecranului");
  assert.match(A, /id==="tradezilei"\)\{if\(typeof tzPorneste==="function"\)tzPorneste\(false\)\}/);
  assert.match(A, /PAGINI_ZILNICE=\[[^\]]*"tradezilei"/);
  assert.match(A, /"comportament","tradezilei"(,"rangefilter")?\]\.includes\(id\)/);   /* v100.300: + rangefilter */
  assert.match(C, /#tradezilei \.tzPag\{/); assert.match(C, /#tradezilei \.tzGrila\{/);
  // revizia Opus din 03.11: lista albă a dispecerului, cache-ul offline, paleta Ctrl+K, NAV_CU_LOAD, CSS-ul ÎNAINTEA pândei (blocul v100.224 rămâne ultimul)
  assert.match(A, /var ACTIUNI_PERMISE=new Set\("[^"]*\btzPorneste\b/, "tzPorneste lipsește din ACTIUNI_PERMISE ⇒ „Recitește” n-ar face nimic");
  assert.match(A, /\["Trade-ul zilei","tradezilei"\]/, "paleta Ctrl+K");
  assert.match(A, /NAV_CU_LOAD=new Set\(\[[^\]]*"tradezilei"/);
  const SW = citeste("public", "sw.js"); assert.ok(SW.includes('"/lib/trade-zilei.js"') && SW.includes('"/lib/trade-zilei-ecran.js"'), "scripturile noi lipsesc din APP_SHELL");
  assert.ok(C.indexOf("/* v100.297: pagina Trade-ul zilei") < C.indexOf("/* v100.258: pânda"), "CSS-ul paginii trebuie să stea înaintea pândei");
  assert.equal(panda.pandaInainteaCozii(C), "", "pânda / blocul v100.224");
  assert.ok(JSON.parse(citeste("BUILD_INFO.json")).features.tradeZilei297, "BUILD_INFO: feature-ul tradeZilei297");
});

await test("4b. revizia 03.11: prețul sub 1 USDT fără punct de mii în zecimale; monedele boților cu simbolul lor Pionex; fără „atins” la 00:xx fără bare; range zero ⇒ eroare cinstită", () => {
  assert.equal(ctx.tzPret(0.1234), "0,1234"); assert.equal(ctx.tzPret(0.00001234), "0,000012"); assert.equal(ctx.tzPret(77081.9), "77.081,90"); assert.equal(ctx.tzPret(2.5), "2,50");
  ctx.tbStare = { boti: [{ activ: true, baza: "DOGE", quote: "USDT", simbolPionex: "DOGE_USDT" }, { activ: true, baza: "BTC.PERP" }, { activ: false, baza: "XRP.PERP" }] };
  ctx.TabloBot = { simboluri: (b, q, r) => r ? { pionex: r, moneda: r.split("_")[0] } : { pionex: String(b).replace(/\.PERP$/, "") + "_" + (q || "USDT") + (/\.PERP$/.test(b) ? "_PERP" : ""), moneda: String(b).replace(/\.PERP$/, "") } };
  const l = ctx.tzSimboluri(ctx.tbStare.boti, null); assert.equal(JSON.stringify(l.map((x) => x.simbol)), JSON.stringify(["DOGE", "BTC", "ETH", "SOL"])); assert.equal(l[0].pionex, "DOGE_USDT");   /* v100.298: boții primii, lista vine ca argument */
  delete ctx.tbStare; delete ctx.TabloBot;
  const r = Array(13).fill(0.04);
  const b0 = bare(r, 0, 100);                                                   // 00:30 UTC, nicio bară închisă azi
  b0.forEach((b) => { if (b.t >= T0 + 12 * ZI) { b.c = 102; } });                   // ieri închide pe maximul lui (102)
  const d0 = TZ.azi(b0, T0 + 13 * ZI + 30 * 60000);
  assert.ok(!d0.eroare, d0.eroare); assert.equal(d0.bareAzi, 0); assert.equal(d0.p1Sus.atins, false, "fără bare azi nu știm că a atins");
  const bz = bare(Array(12).fill(0.04), 3, 100);
  bz.forEach((b) => { if (b.t >= T0 + 10 * ZI && b.t < T0 + 12 * ZI) { b.o = b.h = b.l = b.c = 100; } });   // ieri și alaltăieri perfect plate ⇒ range zero
  assert.match(TZ.azi(bz, T0 + 12 * ZI + 3 * ORA).eroare || "", /range zero|P3 nu se poate/);
});

await test("5. versiunile v100.297 peste tot (index ×3, sw, package)", () => {
  const H = citeste("public", "index.html");
  assert.ok((H.match(/v100\.(29[7-9]|[3-9]\d\d)/g) || []).length >= 3, "index.html: sub 3 locuri");
  assert.doesNotMatch(H, /v100\.296 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(29[7-9]|[3-9]\d\d)"/);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 297);
  assert.match(citeste("package.json"), /"test:v100297": "node scripts\/proba-v100297.mjs"/);
  assert.match(citeste("package.json"), /npm run test:v100296 && npm run test:v100297/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
