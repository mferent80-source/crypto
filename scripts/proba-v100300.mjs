// Proba v100.300 (el, 04.11.2026: „integrează și în Crypto Radar ca dash și în panel”): pagina „Range Filter” + rândul din Tabloul botului.
// Ce probează:
//   1. motorul PUR (lib/range-filter.js) = portul Python (pine-scripts/RANGE-FILTER/_proba-rf-2026-11-04/rf_motor.py + trender_motor.py) pe
//      500 de bare BTCUSDT 1h reale (scripts/proba-date/rf-btc-1h.json, cifrele așteptate scrise de export_proba_js.py): semnale, direcția,
//      filtrul, ATR, DOVADA, consolidarea, unghiul, MA; nimic din viitor (barele de după nu schimbă citirea de până atunci); prea puține bare ⇒ eroare;
//   2. ecranul (lib/range-filter-ecran.js) în vm: cartela cu rândurile, rezumatul, stările de încărcare / eroare, procentele cu virgulă;
//   3. rândul din Tablou (tbRangeFilterRand, extras din app.js) pe aceleași bare: textul, CONTRA botului, drumul spre pagină;
//   4. legarea: meniul, secțiunea, „mai multe”, navTo, pagina zilnică, lista albă, paleta, NAV_CU_LOAD, scripturile, sw, CSS înaintea pândei;
//   5. versiunile v100.300 peste tot.
//   node scripts/proba-v100300.mjs
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
console.log("\nV100.300 · Range Filter · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);        // TextRo.cate („21 de bare”, „1 caz”) - garda v100.75
vm.runInContext(citeste("public", "lib", "range-filter.js"), ctx);
vm.runInContext(citeste("public", "lib", "range-filter-ecran.js"), ctx);
const RF = ctx.RangeFilter;
const D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
const aprox = (a, b, eps) => Math.abs(a - b) <= (eps == null ? 1e-6 : eps) * Math.max(1, Math.abs(b));

await test("1a. portul JS = Python pe BTC 1h (500 de bare reale): semnale, direcția, filtrul, r, ATR, DOVADA, consolidarea, unghiul, MA", () => {
  const c = RF.citire(D.bare), A = D.asteptat;
  assert.ok(!c.eroare, c.eroare);
  assert.equal(c.buyuri, A.buyuri); assert.equal(c.selluri, A.selluri); assert.equal(c.dir, A.dir); assert.equal(c.bareDir, A.bareDir - 1, "v100.302: „de N bare” = ta.barssince din Pine; proba-date ține numărătoarea veche (cu bara flip-ului)");
  assert.ok(aprox(c.filt, A.filt), `filt ${c.filt} vs ${A.filt}`); assert.ok(aprox(c.r, A.r), `r ${c.r} vs ${A.r}`); assert.ok(aprox(c.atr, A.atr), `atr ${c.atr} vs ${A.atr}`);
  assert.equal(c.dovada.n, A.dovada_n); assert.equal(c.dovada.k, A.dovada_k);
  assert.equal(c.regim.cons, A.cons); assert.ok(aprox(c.regim.ang, A.ang)); assert.equal(c.ma.col, A.maCol); assert.ok(aprox(c.regim.consPct, A.consPct, 1e-9));
  assert.equal(c.dovada.dovedit, false, "11 cazuri < 20 ⇒ nedovedit");
  assert.ok(c.semnal && /^(BUY|SELL)$/.test(c.semnal.fel) && c.semnal.acum >= 0);
});

await test("1b. nimic din viitor: citirea pe primele 400 de bare nu se schimbă când adaugi barele de după", () => {
  const c1 = RF.citire(D.bare.slice(0, 400)), c2 = RF.citire(D.bare);
  // aceeași istorie ⇒ aceleași semnale până la bara 399 (filtrul la bara 399 e același, direcția la fel)
  const m1 = RF.motor(D.bare.slice(0, 400).map((b) => b.c), 20, 3.5), m2 = RF.motor(D.bare.map((b) => b.c), 20, 3.5);
  for (let i = 0; i < 400; i++) { assert.ok(isFinite(m2.filt[i]) || i === 0, "filt nenumeric la " + i); assert.equal(m1.filt[i], m2.filt[i]); assert.equal(m1.buy[i], m2.buy[i]); assert.equal(m1.sell[i], m2.sell[i]); }
  assert.equal(c1.dir, m2.fdir[399]);
  assert.ok(c2.n === 500 && c1.n === 400);
});

await test("1c. prea puține bare ⇒ eroare cinstită; lumânare fără preț ⇒ eroare; filtrul nu se mișcă în interiorul benzii", () => {
  assert.match(RF.citire(D.bare.slice(0, 50)).eroare, /prea puține lumânări/);
  assert.match(RF.citire(D.bare.slice(0, 200).concat([{ t: 1, o: 1, h: null, l: 1, c: 1 }])).eroare, /fără preț/);
  const c = D.bare.map((b) => b.c), m = RF.motor(c, 20, 3.5);
  for (let i = 2; i < c.length; i++) if (Math.abs(c[i] - m.filt[i - 1]) <= m.r[i]) assert.equal(m.filt[i], m.filt[i - 1], `filtrul s-a mișcat în bandă la ${i}`);
  assert.ok(!m.buy.some((x, i) => x && m.sell[i]), "BUY și SELL pe aceeași bară");
});

await test("2. ecranul în vm: cartela cu rândurile, rezumatul, stările, procentele cu virgulă, butonul spre Grid", () => {
  const c = RF.citire(D.bare);
  const h = ctx.rfHtml({ monede: [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "bot", c }, { simbol: "XYZ", pionex: "XYZ_USDT_PERP", eroare: "nu am putut citi lumânările (x)" }], la: Date.now(), inLucru: false, eroare: null, simboluri: [1, 2], tf: "60M" });
  for (const r of ["TREND", "TRIGGER", "CE FAC?", "LOC", "BANDA", "REGIM", "MA", "APRINDERE", "DOVADA", "SEMNAL"]) assert.ok(h.includes(r), "lipsește rândul " + r);
  assert.match(h, /botul tău/); assert.match(h, /nu am putut citi lumânările/); assert.match(h, /Din 1 monedă: (1|niciuna) în trend sus, (1|niciuna) în trend jos/);   /* v100.306 (I-836): numărătoarea nouă */
  assert.match(h, /rfLaGrid\('BTC_USDT_PERP'\)/); assert.match(h, /rfTf\('4H'\)/); assert.match(h, /rfPorneste\(true\)/);
  assert.doesNotMatch(h, /\d\.\d+ (%|ATR)/, "cifrele cu virgulă, nu cu punct");
  assert.match(h, /NIMIC nu s-a dovedit/, "textul cinstit al probei");
  assert.match(ctx.rfHtml({ monede: [], la: 0, inLucru: true, eroare: null, simboluri: [], tf: "60M" }), /Aduc lumânările/);
  assert.match(ctx.rfHtml({ monede: [], la: 0, inLucru: false, eroare: "pică", simboluri: [], tf: "60M" }), /pică/);
  const t = ctx.rfTexte(c); assert.ok(/TREND (SUS|JOS)/.test(t.verdict)); assert.ok(/AȘTEAPTĂ|GO (LONG|SHORT) ACUM|SEMNAL (BUY|SELL)/.test(t.trigger));   /* v100.306 (I-837): cu diacritice */
  assert.equal(ctx.rfPret(0.1234), "0,1234"); assert.equal(ctx.rfPret(77081.9), "77.081,90");
});

await test("2b. revizia Opus: refuzul Pionex vine ca 200 {result:false, retryAfter} ⇒ bucla se oprește după prima monedă, cu mesajul la vedere; o singură zecimală, minus tipografic", async () => {
  const c3 = Object.assign({}, ctx); let klines = 0;
  c3.document = { getElementById: () => null };
  c3.getJSON = async (u) => { if (/clasament/.test(u)) return { clasament: { monede: [{ simbol: "AAA_USDT_PERP", volum: 9 }, { simbol: "BBB_USDT_PERP", volum: 8 }] } }; klines++; return { result: false, error: "Pionex a refuzat", retryAfter: 30 }; };
  c3.tzSimboluri = (b, cl) => [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata" }].concat(cl.monede.map((m) => ({ simbol: m.simbol.split("_")[0], pionex: m.simbol, fel: "top" })));
  vm.createContext(c3);
  vm.runInContext(citeste("public", "lib", "text-ro.js"), c3); vm.runInContext(citeste("public", "lib", "range-filter.js"), c3); vm.runInContext(citeste("public", "lib", "range-filter-ecran.js"), c3);
  await vm.runInContext("rfPorneste(true)", c3);
  assert.equal(klines, 1, "după refuz nu se mai cere nicio monedă"); assert.match(c3.rfStare.eroare, /refuzat/); assert.equal(c3.rfStare.monede.length, 1); assert.match(c3.rfStare.monede[0].eroare, /refuzat/);
  assert.equal(ctx.rfNr(-0.84), "−0,8"); assert.equal(ctx.rfPct(0.0135), "1,4%"); assert.equal(ctx.rfNr(2.46, 0), "2");
});

await test("3. rândul din Tablou (tbRangeFilterRand din app.js) pe aceleași bare: direcția, DOVADA, CONTRA botului, drumul spre pagină", () => {
  const A = citeste("public", "app.js");
  const i0 = A.indexOf("var tbRfStare={"), i1 = A.indexOf("function tbCitireExtra(b,o){");
  assert.ok(i0 > 0 && i1 > i0 && A.indexOf("function tbRangeFilterRand(b){") > i0, "tbRfStare + tbRangeFilterRand înaintea lui tbCitireExtra");
  const c2 = Object.assign({}, ctx); c2.TabloBot = { simboluri: (baza) => ({ pionex: baza + "_USDT_PERP", moneda: baza }) };
  vm.createContext(c2);
  vm.runInContext(citeste("public", "lib", "text-ro.js"), c2);
  vm.runInContext(citeste("public", "lib", "grid-calcul.js"), c2);
  vm.runInContext(citeste("public", "lib", "range-filter.js"), c2);
  vm.runInContext(A.slice(i0, i1), c2);
  // lumânările de 1 h sunt aduse separat (tbRangeFilterAdu, 500 bare, cache 10 min) - aici le punem gata aduse, ca sosite de la Pionex
  c2.tbRfStare.cheie = "BTC_USDT_PERP"; c2.tbRfStare.bare = c2.GridCalcul.bare(D.bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c }))); c2.tbRfStare.la = Date.now();
  assert.equal(c2.tbRfStare.bare.length, 499, "GridCalcul.bare aruncă ultima bară (în formare)");
  const c = RF.citire(c2.tbRfStare.bare);
  const r = c2.tbRangeFilterRand({ baza: "BTC", quote: "USDT", directie: c.dir === 1 ? "SHORT" : "LONG" });
  assert.ok(r && r.ce === "Range Filter" && /TREND (SUS|JOS) de \d+( de)? bare \(1h\)/.test(r.text), JSON.stringify(r));
  assert.equal(c2.tbRangeFilterRand({ baza: "ETH", quote: "USDT", directie: "LONG" }), null, "altă monedă decât cea din cache ⇒ nimic (nu cifrele alteia)");
  assert.match(r.text, /DOVADA (\d+ din 100 \(\d+( de)? cazuri, nedovedit\)|\d+ din \d+( de)? cazuri \(puține cazuri\))/); assert.match(r.text, /CONTRA botului/); assert.equal(r.stare, "info", "v100.302: RF e nedovedit ⇒ CONTRA e info, nu alarmă");
  assert.equal(r.actiune, "navTo('rangefilter',true)");
  const r2 = c2.tbRangeFilterRand({ baza: "BTC", quote: "USDT", directie: c.dir === 1 ? "LONG" : "SHORT" }); assert.equal(r2.stare, "info"); assert.doesNotMatch(r2.text, /CONTRA/);
  assert.match(A, /tbRfStare\.inLucru=getJSON\("\/api\/market\?type=pionex_klines&symbol="\+encodeURIComponent\(k\)\+"&interval=60M&limit=500"\)/, "lumânările de 1 h, 500, pentru Tablou");
  assert.match(A, /out\.rangeFilter=typeof tbRangeFilterRand==="function"\?tbRangeFilterRand\(b\):null/);
  assert.match(A, /if\(ex\.rangeFilter\)out\.push\(rd\(ex\.rangeFilter\)\)/);
});

await test("4. legarea în aplicație: meniu, secțiune, „mai multe”, navTo, pagină zilnică, lista albă, paleta, NAV_CU_LOAD, scripturi, sw, CSS", () => {
  const H = citeste("public", "index.html"), A = citeste("public", "app.js"), C = citeste("public", "app.css"), SW = citeste("public", "sw.js");
  assert.match(H, /data-action-click="navTo\('rangefilter',true\)" data-nav="rangefilter"/);
  assert.match(H, /<section class="panel" id="rangefilter">/); assert.match(H, /id="rfPagina"/);
  assert.match(H, /moreNav\('rangefilter',true\)/);
  assert.ok(H.indexOf('<script src="/lib/range-filter.js"></script>') > 0 && H.indexOf('<script src="/lib/range-filter-ecran.js"></script>') > H.indexOf('<script src="/lib/range-filter.js"></script>'), "scripturile, pur înainte de ecran");
  assert.ok(H.indexOf('<script src="/lib/trade-zilei-ecran.js"></script>') < H.indexOf('<script src="/lib/range-filter-ecran.js"></script>'), "tzSimboluri / tzLaGrid înaintea ecranului RF");
  assert.match(A, /id==="rangefilter"\)\{if\(typeof rfPorneste==="function"\)rfPorneste\(false\)\}/);
  assert.match(A, /PAGINI_ZILNICE=\[[^\]]*"rangefilter"/);
  assert.match(A, /"comportament","tradezilei","rangefilter"(,"deriv")?(,"probe")?\]\.includes\(id\)/);
  assert.match(A, /var ACTIUNI_PERMISE=new Set\("[^"]*\brfPorneste\b[^"]*\brfTf\b[^"]*\brfLaGrid\b/, "rfPorneste / rfTf / rfLaGrid în lista albă");
  // revizia Opus (04.11): numele vecine rămân CUVINTE separate (o lipitură „tzLaGridacasaDeschideAnaliza” scotea două butoane din listă)
  const lista = A.match(/var ACTIUNI_PERMISE=new Set\("([^"]*)"/)[1].split(/\s+/);
  for (const n of ["tzLaGrid", "acasaDeschideAnaliza", "tzPorneste", "rfPorneste", "rfTf", "rfLaGrid"]) assert.ok(lista.includes(n), "lipsește din lista albă: " + n);
  assert.ok(lista.every((n) => /^[a-zA-Z0-9_]+$/.test(n) && n.length < 40), "nume lipite în lista albă");
  assert.match(A, /\["Range Filter","rangefilter"\]/, "paleta Ctrl+K");
  assert.match(A, /NAV_CU_LOAD=new Set\(\[[^\]]*"rangefilter"/);
  assert.ok(SW.includes('"/lib/range-filter.js"') && SW.includes('"/lib/range-filter-ecran.js"'), "scripturile noi lipsesc din APP_SHELL");
  assert.match(C, /#rangefilter \.rfPag\{/); assert.match(C, /#rangefilter \.rfGrila\{/);
  assert.ok(C.indexOf("/* v100.300: pagina Range Filter") < C.indexOf("/* v100.258: pânda"), "CSS-ul paginii trebuie să stea înaintea pândei");
  assert.equal(panda.pandaInainteaCozii(C), "", "pânda / blocul v100.224");
  assert.ok(JSON.parse(citeste("BUILD_INFO.json")).features.rangeFilter300, "BUILD_INFO: feature-ul rangeFilter300");
});

await test("5. versiunile v100.300 peste tot (index ×3, sw, versiune.js, BUILD_INFO, package)", () => {
  const H = citeste("public", "index.html");
  // v100.310: „≥ 300” scris ca 30\d|[4-9]\d\d sărea 310–399 ⇒ [3-9]\d\d
  assert.ok((H.match(/v100\.([3-9]\d\d)/g) || []).length >= 3, "index.html: sub 3 locuri");
  assert.doesNotMatch(H, /v100\.299 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-([3-9]\d\d)"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.([3-9]\d\d)"/);
  assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.([3-9]\d\d)$/);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 300);
  assert.match(citeste("package.json"), /"test:v100300": "node scripts\/proba-v100300.mjs"/);
  assert.match(citeste("package.json"), /npm run test:v100299 && npm run test:v100300/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
