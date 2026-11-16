// Proba v100.346 (16.11.2026, el: „CONTINUA” - din cererea lui: „aplicăm toate modificările din paginile refăcute”): mini-graficul pe fiecare rând
// al Sugestiilor, ca pe Trading 212 (ultimele 30 de închideri, verde dacă a urcat, roșu dacă a scăzut). Zero cereri în plus la încărcarea paginii:
// colectorul pune seria scurtă (`spark`, 4 cifre semnificative) lângă rândurile care pot apărea în liste - monedele lichide din clasament (bare de
// 4 ore), revenirile US (tura ideilor) și EU (tura acțiunilor), topul pe sectoare (bare zilnice). Trend 12 luni n-are prețuri în fișierul robotului:
// fără linie (nu se inventează cereri).
//   node scripts/proba-v100346.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spark } from "./lib/spark.mjs";
import { deTrimis } from "./lib/tura-clasament.mjs";
import { sugestiiDimineata } from "./lib/tura-sugestii-actiuni.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.346 · Sugestii: mini-graficul pe rând · proba\n");

await test("🔑 spark: ultimele 30 de închideri, 4 cifre semnificative, fără valori stricate", () => {
  const b = Array.from({ length: 40 }, (_, i) => ({ c: 100 + i * 0.123456 })).concat([{ c: NaN }, { c: 0 }, null]);
  const s = spark(b);
  assert.equal(s.length, 30); assert.equal(s[s.length - 1], Number((100 + 39 * 0.123456).toPrecision(4)));
  assert.deepEqual(spark([{ c: 1 }]), []);
});
await test("🔑 clasamentul: doar candidații lichizi primesc seria (tura), deTrimis o trimite, ruta o păstrează curățată (≤ 30, numere pozitive)", async () => {
  assert.match(citeste("scripts", "lib", "tura-clasament.mjs"), /if \(j\.stare === "candidat" && Number\(j\.volum\) >= FUND_PRAG\) j\.spark = spark\(/);
  const m = { simbol: "Z_USDT_PERP", stare: "candidat", volum: 5e6, scor: 0.001, spark: [1, 2, 3] };
  assert.deepEqual([...deTrimis(m).spark], [1, 2, 3]);
  const TOKEN = "t-346", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const sp = Array.from({ length: 40 }, (_, i) => i + 1).concat(["x", -1]);
  const req = new Request("https://exemplu.test/api/istoric-bot?action=clasament", { method: "POST", headers: { "cf-connecting-ip": "10.0.3.46", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify({ la: Date.now(), monede: [Object.assign({}, m, { spark: sp }), { simbol: "Y_USDT_PERP", stare: "evita" }] }) });
  const r = await mod.onRequestPost({ request: req, env }); assert.equal(r.status, 200);
  const s = JSON.parse(kv.get("clasament")).monede; assert.equal(s[0].spark.length, 30); assert.ok(s[0].spark.every((v) => v > 0)); assert.ok(!("spark" in s[1]), "fără serie ⇒ fără câmp");
});
await test("revenirile US: tura ideilor pune seria, ruta /api/t212?action=idei o păstrează", async () => {
  assert.match(citeste("scripts", "lib", "tura-idei.mjs"), /rev\.push\(\{ ticker: tk, simbol: s, \.\.\.rv, spark: spark\(bare\) \}\)/);
  assert.match(citeste("functions", "api", "t212.js"), /spark: Array\.isArray\(x && x\.spark\)/);
});
await test("revenirile EU (tura acțiunilor) și topul pe sectoare poartă seria", async () => {
  const zile = Array.from({ length: 60 }, (_, i) => Date.UTC(2026, 8, 1 + i, 16)), b = zile.map((t, i) => ({ t, o: 100, h: 101, l: 99, c: 100 + i }));
  const Rev = { actiunePeRevenire: () => ({ revine: true, cadere: 0.3, pret: 159 }), puncte: () => [], dovada: () => ({}), textDovada: () => "", REGULI: { actiune: {} } };
  const r = await sugestiiDimineata({ Reveniri: Rev, bareUS: new Map(), tickereEU: ["Y.DE"], cereBare: async () => b, acum: zile[59] + 30 * 3600000, istoric: [] });
  assert.equal(r.raport.eu.revine[0].spark.length, 30);
  assert.match(citeste("scripts", "lib", "tura-sectoare.mjs"), /x\.spark = spark\(bare\[x\.s\]\)/);
});
await test("🔑 pagina: rândul cu serie are mini-graficul (sus / jos, decor ascuns cititorului de ecran); fără serie, nimic", () => {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugListaHtml = sugListaHtml; this.sugStare = sugStare; this.sugSparkHtml = sugSparkHtml;", ctx);
  ctx.sugStare.vedere = "sugestii";
  const d = { idei: { idei: { la: Date.now(), zi: "2026-11-16", reveniri: [{ ticker: "AAA_US_EQ", simbol: "AAA", pret: 10, cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, stop: 9, tinta: 14, spark: [8, 9, 10] }, { ticker: "BBB_US_EQ", simbol: "BBB", pret: 10, cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, stop: 9, tinta: 14 }] } } };
  const h = ctx.sugListaHtml(d, Date.now());
  const rA = h.slice(h.indexOf('id="sugR-revUS:AAA"'), h.indexOf('id="sugR-revUS:BBB"')), rB = h.slice(h.indexOf('id="sugR-revUS:BBB"'));
  assert.match(rA, /<svg class="t212Spark sus"[^>]*aria-hidden="true"/); assert.doesNotMatch(rB.slice(0, rB.indexOf("</button>")), /t212Spark/);
  assert.match(ctx.sugSparkHtml([3, 2, 1]), /t212Spark jos/); assert.equal(ctx.sugSparkHtml([1]), "");
});

// ---- v100.346 (el: „DE CE TOT APARE N-AM AFLAT?” ⇒ „CUM CREZI CĂ E MAI OK” ⇒ împreună): eticheta listei CALCULATĂ din urmărire, nu scrisă de mână.
// Regula fixată ÎNAINTE de cifre (16.11): ferestrele care nu se suprapun (alese lacom, o zi nouă la ≥ L după precedenta); verdictul o singură dată,
// pe primele 26: t ≥ 2 și medie > 0 ⇒ „mai bine”, t ≤ −2 ⇒ „mai slab”, altfel „n-am aflat” (nedovedit ≠ egal); sub 26 „prea devreme”.
// Mărimea sub H0 simulată înainte (scratchpad sim-verdict.mjs): fals „mai bine” 2,6–2,8%, „mai slab” 2,6–2,9% (teoretic 2,8%).
const ZI = 86400000;
const { verdictFerestre, REG_VERDICT } = await import("./lib/verdict-ferestre.mjs").catch(() => ({}));
await test("🔑 verdictFerestre: ferestre lacome, prea devreme sub 26, verdict înghețat pe primele 26", () => {
  assert.equal(REG_VERDICT.ferestre, 26); assert.equal(REG_VERDICT.pragT, 2);
  const zile = (k, f) => Array.from({ length: k }, (_, i) => ({ t: Date.UTC(2026, 0, 1) + i * ZI, e: f(i) }));
  const v1 = verdictFerestre(zile(30, () => 0.01), 7 * ZI); assert.equal(v1.ferestre, 5); assert.equal(v1.verdict, "prea devreme"); assert.equal(v1.nVerdict, 26);
  const bun = (i) => 0.02 + (i % 2 ? 0.01 : -0.01);   // pe zile; ferestrele iau zilele 0, 7, 14… ⇒ alternează după paritatea zilei
  const vB = verdictFerestre(zile(26 * 7, bun), 7 * ZI); assert.equal(vB.ferestre, 26); assert.equal(vB.verdict, "mai bine");
  const vR = verdictFerestre(zile(26 * 7, (i) => -bun(i)), 7 * ZI); assert.equal(vR.verdict, "mai slab");
  const vZ = verdictFerestre(zile(26 * 7, (i) => (i % 2 ? 0.01 : -0.01)), 7 * ZI); assert.equal(vZ.verdict, "n-am aflat");
  // după 26, verdictul nu se mai schimbă (privitul repetat ar umfla falsurile); cifrele merg mai departe
  const vI = verdictFerestre(zile(26 * 7, bun).concat(zile(60 * 7, (i) => -0.05).map((x) => ({ t: x.t + 26 * 7 * ZI, e: x.e }))), 7 * ZI);
  assert.equal(vI.verdict, "mai bine"); assert.ok(vI.ferestre > 26 && vI.medie < 0);
  // zile lipsă și ordine amestecată
  const vL = verdictFerestre([{ t: 20 * ZI, e: 1 }, { t: 0, e: 1 }, { t: 3 * ZI, e: 9 }, { t: 9 * ZI, e: 1 }, { t: 15 * ZI, e: NaN }], 7 * ZI); assert.equal(vL.ferestre, 3);
});
await test("🔑 urmărirea monedelor (urmarireFixa) poartă vf; textul spune „din 26”, nu „din cel puțin 8”", async () => {
  const { urmarireFixa } = await import("./lib/tura-sugestii.mjs");
  const acum = Date.UTC(2026, 10, 30, 12), b = (s) => Array.from({ length: 80 * 6 }, (_, i) => ({ t: Date.UTC(2026, 9, 1) + i * 4 * 3600000, c: s === "A" ? 100 + i * 0.1 : 100 }));
  const ist = [{ zi: "2026-10-10", simbol: "A", lista: "porn", dir: "long" }, { zi: "2026-10-20", simbol: "A", lista: "porn", dir: "long" }];
  const u = urmarireFixa(ist, { zile: 7, acum, bare1h: b, toate: ["A", "B"], cost: 0 });
  assert.equal(u.vf.ferestre, 2); assert.equal(u.vf.verdict, "prea devreme"); assert.match(u.text, /2 ferestre din 26/); assert.doesNotMatch(u.text, /cel puțin 8/);
});
await test("urmărirea acțiunilor pe revenire (urmarireRevine) poartă vf, cu fereastra = pauza dintre semnale", async () => {
  const { urmarireRevine } = await import("./lib/tura-sugestii-actiuni.mjs");
  const zile = Array.from({ length: 80 }, (_, i) => Date.UTC(2026, 8, 1 + i, 14)), bb = zile.map((t, i) => ({ t, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));
  const q = zile.map((t) => ({ t, o: 100, h: 100, l: 100, c: 100 }));
  const ist = [{ zi: "2026-09-02", piata: "us", lista: "revine", ticker: "A_US_EQ", tBara: zile[1] }, { zi: "2026-09-20", piata: "us", lista: "revine", ticker: "B_US_EQ", tBara: zile[19] }];
  const u = urmarireRevine(ist, { A_US_EQ: bb, B_US_EQ: bb }, { us: q }, zile[79], { piata: "us" });
  assert.equal(u.vf.ferestre, 2); assert.equal(u.vf.verdict, "prea devreme"); assert.match(u.text, /din 26/);
});
await test("🔑 sectoarele: urmărire NOUĂ înainte - topul zilei față de media sectorului la 21 de zile de bursă, ferestre lunare", async () => {
  const { urmarireSectoare } = await import("./lib/tura-sectoare.mjs");
  const T = Array.from({ length: 70 }, (_, i) => Date.UTC(2026, 6, 1) + i * ZI), ser = (f) => T.map((t, i) => ({ t, c: f(i) }));
  const bare = { A: ser((i) => 100 + i), B: ser(() => 100), C: ser(() => 100), D: ser(() => 100), E: ser(() => 100) }, univ = ["A", "B", "C", "D", "E"].map((x) => ({ s: x, sector: "Tech" }));   // regula cere ≥ 5 firme pe sector
  const urm = [{ tb: T[0], top: { Tech: ["A"] } }, { tb: T[5], top: { Tech: ["A"] } }, { tb: T[40], top: { Tech: ["A"] } }, { tb: T[60], top: { Tech: ["A"] } }];
  const u = urmarireSectoare(urm, bare, univ, T[69]);
  assert.equal(u.zile, 3); assert.equal(u.inAsteptare, 1); assert.equal(u.vf.ferestre, 2); assert.ok(u.exces > 0); assert.equal(u.vf.verdict, "prea devreme");
  const s = citeste("scripts", "lib", "tura-sectoare.mjs"); assert.match(s, /st\.urm = /); assert.match(s, /urmarire: urmarireSectoare\(st\.urm, bare, top, acum\)/);
});
await test("ruta sugestii păstrează vf curățat (verdict doar din cele 4 cuvinte)", async () => {
  const TOKEN = "t-346b", kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); }, delete: async () => {}, list: async () => ({ keys: [] }) } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "b");
  const corp = { la: Date.now(), zi: "2026-11-16", urmarire: { porn: { n: 3, ferestre: 1, text: "x", vf: { ferestre: 1, nVerdict: 26, medie: 0.01, sd: null, t: null, verdict: "prea devreme" } }, short: { n: 1, vf: { ferestre: 1, verdict: "<b>rău</b>" } } } };
  const req = new Request("https://exemplu.test/api/istoric-bot?action=sugestii", { method: "POST", headers: { "cf-connecting-ip": "10.0.3.47", authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify(corp) });
  const r = await mod.onRequestPost({ request: req, env }); assert.equal(r.status, 200);
  const s = JSON.parse(kv.get("sugestii")).urmarire; assert.equal(s.porn.vf.verdict, "prea devreme"); assert.equal(s.porn.vf.ferestre, 1); assert.equal(s.short.vf.verdict, null);
});
await test("🔑 pagina: eticheta listei din vf - PREA DEVREME · k din 26 / MAI BINE / MAI SLAB / N-AM AFLAT la 26; fără date, cea veche", () => {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugVerdictEt = sugVerdictEt;", ctx);
  const sm = (vf) => ({ sugMonede: { sugestii: { urmarire: { porn: { n: 5, vf }, pornScor: { n: 9 } } } } });
  assert.deepEqual([...ctx.sugVerdictEt("porn", sm({ ferestre: 1, nVerdict: 26, verdict: "prea devreme" }))], ["PREA DEVREME · 1 DIN 26", "p"]);
  assert.deepEqual([...ctx.sugVerdictEt("porn", sm({ ferestre: 30, nVerdict: 26, verdict: "mai bine" }))], ["MAI BINE CA PIAȚA", "b"]);
  assert.deepEqual([...ctx.sugVerdictEt("porn", sm({ ferestre: 26, nVerdict: 26, verdict: "mai slab" }))], ["MAI SLAB CA PIAȚA", "r"]);
  assert.deepEqual([...ctx.sugVerdictEt("porn", sm({ ferestre: 26, nVerdict: 26, verdict: "n-am aflat" }))], ["N-AM AFLAT · 26 DE FERESTRE", "v"]);
  assert.deepEqual([...ctx.sugVerdictEt("sect", { sectoare: { urmarire: { vf: { ferestre: 26, nVerdict: 26, verdict: "mai bine" } } } })], ["MAI BINE CA SECTORUL", "b"]);
  // colectorul nou, dar regula nouă n-a început (doar cea veche) ⇒ 0 din 26; datele n-au venit ⇒ eticheta veche
  assert.deepEqual([...ctx.sugVerdictEt("porn", { sugMonede: { sugestii: { urmarire: { porn: { n: 9 } } } } })], ["PREA DEVREME · 0 DIN 26", "p"]);
  assert.deepEqual([...ctx.sugVerdictEt("revEU", {})], ["N-AM AFLAT", "v"]);
  assert.deepEqual([...ctx.sugVerdictEt("trend", {})], ["ÎN PROBĂ", "p"]);
  assert.match(citeste("public", "app.css"), /\.sugVerdict-b\{/); assert.match(citeste("public", "app.css"), /\.sugVerdict-r\{/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
