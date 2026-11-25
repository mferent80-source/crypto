// Proba v100.386 (24.11.2026, el: „fă tot” după auditul paginii botului — valul 2, partea a doua):
//   A  I-938 riscul pieței monedei: vârsta contractului (lumânările 1D Pionex, cel mult 500), volumul de azi, mark Binance ↔ ultimul preț Pionex față de distanța la stop
//   B  I-937 harta liniilor gridului (din umplerile deduse, estimat): perechile pe linie, liniile fără umplere, liniile care țin poziție; spusă în bilanțul umplerilor
//   C  I-932 zoom în desen: indicatorii socotiți pe TOATE lumânările (aceleași valori), se desenează doar fereastra; umplerile din afară nu se strâng la margine
//   D  I-932 pagina: zoom-ul ține pe monedă + interval, butoanele permise, Ctrl + rotița, tragerea, dublu-clic, ecranul întreg, rândul crucii (fără popup)
//   V  versiunea v100.386, proba în lanț după v100.385
// Rulare: node scripts/proba-v100386.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n") : "";
const LIBF = (f) => citeste("../public/lib/" + f), APP = citeste("../public/app.js");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
const J = (x) => JSON.parse(JSON.stringify(x));
const functie = (src, n) => { const i = src.search(new RegExp("function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
console.log("\nv100.386 · Tabloul botului, valul 2: riscul pieței (I-938), harta liniilor (I-937), zoom pe grafic (I-932) · proba\n");
const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js", "grafic-bot.js"]) vm.runInContext(LIBF(f), c, { filename: f });
const TE = c.TabloExtra, GB = c.GraficBot;

await test("A  I-938 riscPiata: contractul nou (< 30 de zile) și diferența mark ↔ ultimul peste jumătate din distanța la stop ⇒ atenție; 500 de lumânări = „peste 500”", () => {
  const k = (n) => Array.from({ length: n }, (_, i) => ({ time: Date.UTC(2026, 9, 1) + i * 864e5, close: "0.025", volume: "1000000" }));
  const b = { pretCurent: 0.025 };
  const r = J(TE.riscPiata(k(12), b, 0.0254, 0.0256));
  assert.equal(r.zile, 12); assert.equal(r.plin, false); assert.equal(r.volAzi, 25000); assert.ok(Math.abs(r.markDif - 0.016) < 1e-12); assert.ok(Math.abs(r.stopDist - 0.024) < 1e-12);
  assert.equal(r.semne.length, 2); assert.equal(r.ton, "atentie");
  const v = J(TE.riscPiata(k(500), b, 0.025, 0.0275)); assert.equal(v.plin, true); assert.equal(v.semne.length, 0); assert.equal(v.ton, "info");
  assert.equal(TE.textRiscPiata(v), "Riscul pieței monedei: contract cu peste 500 de zile pe Pionex · tranzacționat azi pe Pionex ≈ 25,0 mii USDT · mark Binance față de ultimul preț Pionex: 0,0% (stopul e la 10,0%) · pe ce preț declanșează Pionex stopul (mark sau ultimul) nu se vede din API");
  assert.match(TE.textRiscPiata(r), / — atenție: contract nou: 12 zile de istorie pe Pionex .+; prețurile diferă cu \+1,6% /);
  assert.match(APP, /interval=1D&limit=500/); assert.match(APP, /er\.id="tbRiscPiata"/);
});

await test("B  I-937 hartaUmpleri: perechile pe linie, liniile fără umplere, poziția ținută; textul intră în bilanțul umplerilor (estimat)", () => {
  const U = { perechi: 4, umpleri: [{ k: 3, p: 1.03, pereche: true, t: 1 }, { k: 3, p: 1.03, pereche: true, t: 2 }, { k: 4, p: 1.04, pereche: true, t: 3 }, { k: 5, p: 1.05, pereche: false, inchisa: false, t: 4 }, { k: 2, p: 1.02, pereche: false, inchisa: true, t: 5 }, { k: 3, p: 1.03, pereche: true, t: 6 }] };
  const h = J(GB.hartaUmpleri(U, 10));
  assert.equal(h.lucrate, 4); assert.equal(h.moarte, 6); assert.equal(h.tin, 1); assert.deepEqual(h.top.map((x) => [x.p, x.perechi]), [[1.03, 3], [1.04, 1]]);
  assert.match(GB.textHarta(h), /^harta liniilor \(estimat\): cele mai multe perechi pe .+ \(3\), .+ \(1\) · 6 din 10 linii fără nicio umplere de la pornire · poziția stă acum pe 1 linie$/);
  const bl = GB.bilantUmpleri(U, { ordinePerechi: 4 }, { linii: 10, pornitInFereastra: true, acum: 10 });
  assert.match(bl.text, / · harta liniilor \(estimat\): /); assert.equal(GB.hartaUmpleri({ umpleri: [] }, 10), null);
  assert.match(APP, /if\(bl&&oG\.grila&&oG\.grila\.linii>1&&GraficBot\.hartaUmpleri\)\{var huG=GraficBot\.hartaUmpleri\(oG\.umpleri,oG\.grila\.linii\)/);
});

await test("C  I-932 desenul cu zoom: aceleași valori ale indicatorilor (socotite pe tot), doar fereastra desenată; fără zoom ca înainte", () => {
  const raw = Array.from({ length: 300 }, (_, i) => { const p = 1 + Math.sin(i / 9) * 0.02 + i * 0.0002; return { t: i * 300000, o: p, h: p * 1.003, l: p * 0.997, c: p * 1.001, v: 100 + i }; });
  const o = (z) => ({ bare: raw, W: 1000, niv: [], zoom: z, acum: 300 * 300000 });
  const d0 = GB.desen(o(null)), dz = GB.desen(o({ n: 60, dr: 0 })), dp = GB.desen(o({ n: 60, dr: 100 }));
  assert.equal(d0.harta.z0, 0); assert.equal(d0.harta.z1, 300); assert.equal(d0.harta.rawLen, 300);
  assert.equal(dz.harta.z0, 240); assert.equal(dz.harta.z1, 300); assert.equal(dz.harta.bare[0].k, 240); assert.equal(dz.harta.bare[dz.harta.bare.length - 1].k, 299);
  assert.equal(dp.harta.z0, 140); assert.equal(dp.harta.z1, 200);
  assert.equal(dz.harta.S.e20[250], d0.harta.S.e20[250], "EMA 20 aceeași cu și fără zoom (socotită pe toate lumânările)");
  assert.equal(GB.desen(o({ n: 10, dr: 0 })).harta.z0, 0, "sub 20 de lumânări: fără zoom");
  assert.match(LIBF("grafic-bot.js"), /if \(n && \(z0 > 0 && u\.t < B\[0\]\.t \|\| z1 < raw\.length && u\.t >= raw\[z1\]\.t\)\) return;/);
});

await test("D  I-932 pagina: zoom pe monedă + interval, butoanele permise, Ctrl + rotița, tragerea, dublu-clic, ecranul întreg, rândul crucii fără popup", () => {
  const ctx = vm.createContext({ tbGrafZoom: { cheie: null, n: null, dr: 0 }, Math });
  vm.runInContext(functie(APP, "tbGrafZoomPt"), ctx);
  ctx.tbGrafZoom = { cheie: "BULLA|5m", n: 80, dr: 10 }; assert.deepEqual(J(vm.runInContext('tbGrafZoomPt("BULLA|5m",300)', ctx)), { n: 80, dr: 10 });
  assert.equal(vm.runInContext('tbGrafZoomPt("BULLA|1h",300)', ctx), null, "alt interval ⇒ zoom-ul se pierde");
  assert.match(APP, /var ACTIUNI_PERMISE=new Set\("[^"]* tbGrafZoomPas tbGrafEcranIntreg /);
  assert.match(APP, /if\(!e\.ctrlKey\|\|!e\.target\.closest/, "rotița doar cu Ctrl (pagina lungă se derulează normal)");
  assert.match(APP, /el\.addEventListener\("dblclick"/); assert.match(APP, /data-action-click="tbGrafEcranIntreg\(\)"/); assert.match(APP, /<p class="tbSub gbLaCruce"/);
  assert.match(APP, /lc\.textContent!==txc\)lc\.textContent=txc/); assert.doesNotMatch(functie(APP, "tbLaCruceText"), /gbTip/, "fără popup");
  const t = vm.createContext({ TabloExtra: { totalCuGridLa: () => -12.34, pretStopLive: () => 0.0255, pretTpLive: () => 0.0240, dacaInchizi: () => ({ pretZero: 0.0249 }) }, GraficBot: { fmtP: (x) => String(x) }, TextRo: globalThis.TextRo, pvPretViuAcum: () => 0.025, Number, isFinite });
  vm.runInContext(functie(APP, "tbLaCruceText"), t); t.b = { opritorPierdereActiv: true, opritorProfitActiv: true, pretCurent: 0.025 };
  assert.equal(vm.runInContext("tbLaCruceText(b,0.0250)", t), "la cruce 0.025 (+0,0% de acum) · dacă închizi acolo: −12,3 USDT · stopul +2,0% · take-profit −4,0% · zero −0,4%");
});

await test("V  versiunea v100.386 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO), colectorul neatins", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.387: „de la 386 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.387) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 386); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 386); assert.ok(bi.li386 && bi.li386.length > 150, "BUILD_INFO.li386");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 386).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 386); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 386);
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("./colector.mjs")) || [])[1] >= 213);
  assert.match(pk.scripts.test, /npm run test:v100385 && npm run test:v100386/); assert.equal(pk.scripts["test:v100386"], "node scripts/proba-v100386.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
