// Proba v100.384 (24.11.2026, el: „fă tot” după auditul paginii botului — valul 1 din I-930..I-941):
//   A  I-933 o singură cifră pentru „botul iese pe stop”: rândul din cap ia toate trei orizonturile din simulare și FĂRĂ take-profit (înainte: 1 h / 4 h din
//      simulare + 24 h din curbă în același rând, iar titlul Riscului și blocul Monte Carlo spuneau alte cifre); curba = reper numit („piața”)
//   B  I-933 Drumul și „Contează acum” spun aceeași cifră a simulării ca rândul din cap (și fără take-profit); titlul din „Contează” spune întrebarea curbei
//   C  I-934 fișa monedei: botul NOU pe aceeași monedă și sumă ia fișa ținută minte a altui bot (cel mult 2 h), nu mai așteaptă ~20 s
//   D  I-935 colectorul ține ultimele 48 de socotiri pe bot (scurte), serverul le lasă să treacă doar ca numere; pagina le arată și are „salvează clipa asta”
//   E  I-936 VWAP-ul de la pornirea botului (o lumânare fără volum sau barele care nu ajung la pornire ⇒ fără linie)
//   V  versiunea v100.384, colectorul v101.213, proba în lanț după v100.383
// Rulare: node scripts/proba-v100384.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8").replace(/\r\n/g, "\n") : "";
const LIBF = (f) => citeste("../public/lib/" + f), APP = citeste("../public/app.js");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
const J = (x) => JSON.parse(JSON.stringify(x));
console.log("\nv100.384 · Tabloul botului, valul 1 (I-933 / I-934 / I-935 / I-936) · proba\n");

const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl, TextRo: globalThis.TextRo }); c.globalThis = c; c.window = c;
for (const f of ["text-ro.js", "cap-margine.js"]) vm.runInContext(LIBF(f), c, { filename: f });
const CM = c.CapMargine;
// botul fără take-profit (short, stopul pe preț), simularea pe 1 h / 4 h / 24 h și curba stopului ~77%
const BOT = { dir: "short", pret: 0.02356, jos: 0.0215, sus: 0.024, stop: 0.02471, stopActiv: true, laMargine: (p) => (p === "sus" ? -14.1 : 20), laStop: -33.4, total: -2.9, sanse: {}, pas: 0.003,
  tp: null, laTp: null, stopDrum: 0.77, stopScurt: [{ ore: 1, pStop: 0.172, pTp: 0 }, { ore: 4, pStop: 0.345, pTp: 0 }, { ore: 24, pStop: 0.542, pTp: 0 }] };
const A = (x) => CM.alcatuieste({ ...BOT, ...x });

await test("A  I-933 fără take-profit: rândul „Atinge stopul” ia 1 h / 4 h / 24 h din simulare (54,2%, nu ~77%), cu curba ca reper numit", () => {
  const k = A({}), m = J(CM.metri(k)).find((q) => q.k === "stop");
  assert.equal(k.stopMc, true); assert.equal(k.stopImpreuna, undefined, "fără take-profit nu e „împreună”");
  assert.deepEqual(m.bare.map((q) => q.text), ["17,2%", "34,5%", "54,2%"]);
  assert.match(m.sursa, /^Monte Carlo pe botul tău: botul iese pe stop · .+ · reper: prețul ajunge la nivelul stopului în 24 h: ~77% \(curba stopului, piața\)$/);
  assert.doesNotMatch(m.sursa, /1 h și 4 h: Monte Carlo/, "fără amestecul de surse în același rând");
  assert.equal(CM.textStop(k), "stopul atins: în 1 h — 17,2% · în 4 h — 34,5% · în 24 h — 54,2% (Monte Carlo pe botul tău) · reper: prețul la nivelul stopului în 24 h — ~77% (curba stopului, piața)");
  // simularea fără 24 h (veche) ⇒ ca înainte: 1 h / 4 h din simulare, 24 h din curbă
  const v = J(CM.metri(A({ stopScurt: [{ ore: 1, pStop: 0.172 }, { ore: 4, pStop: 0.345 }] }))).find((q) => q.k === "stop");
  assert.deepEqual(v.bare.map((q) => q.text), ["17,2%", "34,5%", "~77%"]); assert.equal(v.sursa, "1 h și 4 h: Monte Carlo pe botul tău · 24 h: curba stopului, ca pe Drum");
  // titlul Riscului citește bara de 24 h din cap (o singură sursă)
  assert.match(functie(APP, "tbCapAzi"), /aria-label="Atinge stopul"\] \.pzBara/);
});

await test("B  I-933 Drumul și „Contează acum” spun cifra simulării și fără take-profit; „Contează” păstrează pragul pe curbă și spune întrebarea", () => {
  const ctx = vm.createContext({ tbMc: { botId: "7", rand: { scurt: [{ ore: 24, pStop: 0.542, pTp: 0 }] } }, tbStopSansa: () => ({ p24: 0.77, stop: 0.02471 }), TextRo: globalThis.TextRo, isFinite, String, Array, Object });
  vm.runInContext(functie(APP, "tbMcIntai24") + functie(APP, "tbStopCuIntai") + functie(APP, "tbStopMcDrum"), ctx);
  ctx.b = { id: 7, opritorProfitActiv: false };
  assert.deepEqual(J(vm.runInContext("tbStopCuIntai(b)", ctx)), { p24: 0.77, stop: 0.02471, intai: { stop: 0.542, tp: 0, faraTp: true } });
  assert.equal(vm.runInContext("tbStopMcDrum(b)", ctx), "24 h: 54,2%");
  assert.match(LIBF("asezare-paznic.js"), /v100\.384 \(I-933\)[\s\S]{0,400}if \(s && typeof tbStopMcDrum === "function"\)/, "Drumul ia cifra simulării și fără take-profit");
  const k = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo }); k.globalThis = k; k.window = k;
  vm.runInContext(LIBF("conteaza.js"), k, { filename: "conteaza.js" });
  const r = J(k.Conteaza.alege({ stop: { p24: 0.77, stop: 0.02471, d: 0.8, perechi: 21, zile: 30, intai: { stop: 0.542, tp: 0, faraTp: true } }, sfaturi: [], lista: [], sanse: [], acum: Date.now() }))[0];
  assert.equal(r.cheie, "stop"); assert.equal(r.nr, "77", "pragul și cifra mare rămân pe curbă");
  assert.match(r.titlu, /^Prețul ajunge la stopul tău/); assert.match(r.sub, /^botul iese pe stop într-o zi în ~54 din 100 \(simularea pe botul tău, ca în cap\) · /);
});

await test("C  I-934 fișa: botul nou pe aceeași monedă și sumă ia fișa altui bot (≤ 2 h); altă sumă / altă monedă / prea veche ⇒ nu", () => {
  const ls = {}; const ctx = vm.createContext({ localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; } }, JSON, Date, Object, Math, Number, Array,
    TabloBot: { simboluri: (b) => ({ pionex: String(b).replace(/\.PERP$/, "") + "_USDT_PERP" }) }, botiNr: (v) => (v == null || v === "" ? null : +v), tbFisa: { botId: null, inLucru: false } });
  vm.runInContext("var tbFisa={botId:null,inLucru:false};" + functie(APP, "tbFisaTine") + functie(APP, "tbFisaRestaureaza"), ctx);
  const acum = Date.now();
  vm.runInContext(`tbFisaTine({botId:"2661",la:${acum - 3600000},fisa:{x:1},pret:0.0245,amp:0.05,simbol:"BULLA_USDT_PERP",suma:222.68})`, ctx);
  const ia = (b) => { vm.runInContext("tbFisa={botId:null,inLucru:false}", ctx); ctx.b = b; vm.runInContext("tbFisaRestaureaza(b)", ctx); return J(vm.runInContext("tbFisa", ctx)); };
  const f = ia({ id: "2665", baza: "BULLA.PERP", investit: 222.68 });
  assert.equal(f.botId, "2665"); assert.deepEqual(f.fisa, { x: 1 }); assert.equal(f.veche, true);
  assert.equal(ia({ id: "2666", baza: "BULLA.PERP", investit: 100 }).fisa, undefined, "altă sumă");
  assert.equal(ia({ id: "2667", baza: "PUMPFUN.PERP", investit: 222.68 }).fisa, undefined, "altă monedă");
  vm.runInContext(`tbFisaTine({botId:"2661",la:${acum - 3 * 3600000},fisa:{x:1},simbol:"BULLA_USDT_PERP",suma:222.68})`, ctx);
  assert.equal(ia({ id: "2668", baza: "BULLA.PERP", investit: 222.68 }).fisa, undefined, "peste 2 ore");
});

await test("D  I-935 istoricul socotirilor: colectorul (48, cifre rotunjite), serverul (doar numere, ore 1/4/24), pagina (rândul + „salvează clipa asta”, permis)", async () => {
  const T = await import("./lib/tura-monte-carlo-bot.mjs");
  let l = []; for (let i = 0; i < 60; i++) l = T.adaugaIstoricMc(l, { la: 1000 + i, pret: 0.0235, total: -4.6666, scurt: [{ ore: 24, pStop: 0.54219, pTp: 0.0012 }, { ore: 1, pStop: 0.1 }], dif: 4.1333, cat: "ban" });
  assert.equal(l.length, T.ISTORIC_MC_MAX); assert.equal(l[0].la, 1012); assert.deepEqual(l[47], { la: 1059, pret: 0.0235, total: -4.67, sc: [[24, 0.542, 0.001], [1, 0.1, null]], dif: 4.13, cat: "ban" });
  assert.match(citeste("./lib/tura-monte-carlo-bot.mjs"), /regimLa, scurt, sapt, hot, istoric: istMc \}/);
  const S = citeste("../functions/api/istoric-bot.js");
  assert.match(S, /const istMc=l=>Array\.isArray\(l\)\?l\.slice\(-48\)/); assert.match(S, /,istoric:istMc\(x\.istoric\)\}\}/);
  assert.match(APP, /var ACTIUNI_PERMISE=new Set\("[^"]* tbInstantaneu /); assert.match(APP, /data-action-click="tbInstantaneu\(\)"/);
  const ctx = vm.createContext({ tbMcKv: { d: { boti: { "7": { istoric: [{ la: Date.UTC(2026, 10, 24, 17, 30), pret: 0.0236, total: -4.7, sc: [[24, 0.43, 0.57]] }, { la: Date.UTC(2026, 10, 24, 17, 45), pret: 0.02356, total: -2.9, sc: [[24, 0.402, 0.598]] }] } } } }, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), Number, String, Array, Date });
  vm.runInContext(functie(APP, "tbMcIstoricHtml"), ctx); ctx.b = { id: 7 };
  const h = vm.runInContext("tbMcIstoricHtml(b)", ctx);
  assert.match(h, /Ultimele socotiri ale colectorului \(pe 24 h\): \d\d:\d\d la 0\.02356: stop 40,2% \/ TP 59,8% \(Pionex −2,9\) · \d\d:\d\d la 0\.0236: stop 43,0% \/ TP 57,0% \(Pionex −4,7\)/);
  assert.match(functie(APP, "tbInstantaneu"), /bot\.brut=\{buOrderData:\{row:bu\.row,gridType:bu\.gridType\}\}/, "fără userId / keyId / userSignals: doar câmpurile numite");
  assert.doesNotMatch(functie(APP, "tbInstantaneu"), /userSignals|userId|keyId/);
});

await test("E  I-936 VWAP de la pornire: Σ(tipic × volum) / Σ volum de la lumânarea pornirii; fără volum sau fereastră scurtă ⇒ fără linie", () => {
  const g = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, TextRo: globalThis.TextRo }); g.globalThis = g; g.window = g;
  vm.runInContext(LIBF("grafic-bot.js"), g, { filename: "grafic-bot.js" });
  const B = [{ t: 0, h: 11, l: 9, c: 10, v: 100 }, { t: 60, h: 12, l: 10, c: 11, v: 50 }, { t: 120, h: 14, l: 12, c: 13, v: 50 }];
  assert.equal(g.GraficBot.vwapDeLa(B, 70), (11 * 50 + 13 * 50) / 100, "pornit în lumânarea a doua: de acolo încolo");
  assert.equal(g.GraficBot.vwapDeLa(B, 0), (10 * 100 + 11 * 50 + 13 * 50) / 200);
  assert.equal(g.GraficBot.vwapDeLa(B.map((x, i) => (i === 2 ? { ...x, v: 0 } : x)), 0), null, "o lumânare fără volum");
  assert.equal(g.GraficBot.vwapDeLa(B, -500), null, "lumânările nu ajung la pornire");
  assert.match(LIBF("grafic-bot.js"), /ad\("vwap", o\.vwap, "VWAP de la pornirea botului"/);
});

await test("V  versiunea v100.384 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO), colectorul v101.213", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json")), HTML = citeste("../public/index.html");
  /* v100.385: „de la 384 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.385) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 384); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 384); assert.ok(bi.li384 && bi.li384.length > 200, "BUILD_INFO.li384");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 384).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("../public/sw.js")) || [])[1] >= 384); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 384);
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("./colector.mjs")) || [])[1] >= 213);
  assert.match(pk.scripts.test, /npm run test:v100383 && npm run test:v100384/); assert.equal(pk.scripts["test:v100384"], "node scripts/proba-v100384.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
