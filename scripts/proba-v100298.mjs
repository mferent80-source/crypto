// Proba v100.298 / colector v101.162 (el, 03.11.2026: „pagina, ca să fie de folos dimineața”):
//   1. modelul pur: TradeZilei.grid - ± p75/2, pasul lățime/10, stopul = mediana, prețurile jos/sus (v100.306, I-825: ± BANDA_K[ora UTC] ×
//      mișcarea așteptată, măsurată; stopul = max(mediana, marginea benzii));
//   2. ecranul în vm: monedele = boții (simbolul lor Pionex) + BTC/ETH/SOL + top 20 din clasament după volum, fără dubluri, boții primii;
//      cartela cu gridul / stopul / butonul „Grid: ce setez?”, rezumatul zilei cu TextRo.cate, tzLaGrid trece prin lista albă;
//   3. tura Discord (scripts/lib/tura-trade-zilei.mjs): monedele, rândurile ≤ 160 cu cifrele, nimic înainte de 9:00, o dată pe zi, starea;
//   4. colectorul: importă tura, încarcă TradeZilei, o cheamă după rezumat cu cheia „tradezilei”, versiunea v101.162;
//   5. versiunile v100.298 (index, meta, BUILD_INFO + feature, versiune.js, sw, package, lanțul), CSS-ul nou înaintea pândei.
//   node scripts/proba-v100298.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as panda from "./lib/panda-ultima.mjs";
import { monedeTradeZilei, liniiTradeZilei, turaTradeZilei } from "./lib/tura-trade-zilei.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.298 · Trade-ul zilei dimineața · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);
vm.runInContext(citeste("public", "lib", "tablou-bot.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei-ecran.js"), ctx);
const TZ = ctx.TradeZilei;
const ORA = 3600000, ZI = 86400000, T0 = Math.floor(1761955200000 / ZI) * ZI;
function bare(ranges, oreAzi, pretAzi, t0) {
  const out = []; let p = 100; const T = t0 == null ? T0 : t0;
  ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) { const t = T + d * ZI + h * ORA, hi = p * (1 + r / 2), lo = p * (1 - r / 2); out.push({ t, o: p, h: h === 12 ? hi : p * 1.001, l: h === 6 ? lo : p * 0.999, c: p }); } });
  for (let h = 0; h < oreAzi; h++) out.push({ t: T + ranges.length * ZI + h * ORA, o: pretAzi, h: pretAzi * 1.001, l: pretAzi * 0.999, c: pretAzi });
  return out;
}
const r12 = Array(12).fill(0.04); r12[11] = 0.02; r12[10] = 0.025;
const D = TZ.azi(bare(r12, 3, 100), T0 + 12 * ZI + 3 * ORA);
// v100.306 (I-825, auditul final din 05.11, 🔴 3): garda de pe ADEVĂRUL frazei „cuprinde restul zilei … în N % din zile”. Pe barele REALE de 1 h
// din zile nevăzute la învățarea benzii (proba-date/tz-bare-1h.json, 8 monede, 24.08 … 02.11.2026), la orele date: cât de des stă restul zilei
// UTC în banda „Grid azi” față de frecvența scrisă în cartelă, ±10 pp (~2 erori standard pe ~70 de zile). Toate cele 24 de ore: proba-v100306-b.
function adevarBanda(ore) {
  const FX = JSON.parse(citeste("scripts", "proba-date", "tz-bare-1h.json")), rez = [];
  for (const h of ore) {
    let n = 0, cup = 0, spus = null;
    for (const m of FX.monede) {
      const b = []; let cp = m.b[0][2]; m.b.forEach(([hi, lo, c], i) => { b.push({ t: m.t0 + i * ORA, o: cp, h: hi, l: lo, c }); cp = c; });
      const z0 = Math.ceil(m.t0 / ZI) * ZI + 22 * ZI;
      for (let z = z0; z + ZI <= m.t0 + b.length * ORA; z += ZI) {
        const i0 = (z - m.t0) / ORA, i = i0 + h, d = TZ.azi(b.slice(Math.max(0, i - 600), i), z + h * ORA + 300000), g = d && !d.eroare ? TZ.grid(d) : null; if (!g) continue;
        let mx = -Infinity, mn = Infinity; for (let q = i; q <= i0 + 23; q++) { mx = Math.max(mx, b[q].h); mn = Math.min(mn, b[q].l); }
        n++; if (mx <= g.sus && mn >= g.jos) cup++;
        if (spus === null) { const f = ctx.tzCartela({ simbol: m.s, pionex: m.s, fel: "piata", d }).match(/cuprinde [^<·]*?în (\d+) % din zile/); spus = f ? Number(f[1]) / 100 : NaN; }
      }
    }
    rez.push({ h, n, masurat: cup / n, spus });
  }
  const rele = rez.filter((r) => !(Math.abs(r.masurat - r.spus) <= 0.10) || r.n < 400);
  assert.equal(rele.length, 0, rele.map((r) => r.h + ":05 UTC măsurat " + Math.round(r.masurat * 100) + " % pe " + r.n + ", spus " + Math.round(r.spus * 100) + " %").join("; "));
}

await test("1. TradeZilei.grid: ± BANDA_K[ora UTC] × mișcarea așteptată (v100.306), pasul lățime/10, stopul = max(mediana, marginea), prețurile jos/sus; fără date ⇒ null", () => {
  const g = TZ.grid(D); assert.ok(g); const K = TZ.BANDA_K[D.oraUtc]; assert.ok(K > 0 && TZ.BANDA_K.length === 24 && TZ.BANDA_ACOPERIRE.length === 24);
  assert.ok(Math.abs(g.jumatate - K * D.asteptat.med) < 1e-12 && Math.abs(g.latime - 2 * g.jumatate) < 1e-12 && Math.abs(g.pas - g.latime / 10) < 1e-12 && Math.abs(g.stop - Math.max(D.asteptat.med, g.jumatate)) < 1e-12);
  assert.equal(g.grilePeParte, 5); assert.equal(g.acoperire, TZ.BANDA_ACOPERIRE[D.oraUtc]);
  assert.ok(Math.abs(g.jos - 100 * (1 - g.jumatate)) < 1e-9 && Math.abs(g.sus - 100 * (1 + g.jumatate)) < 1e-9);
  assert.equal(TZ.grid({ eroare: "x" }), null); assert.equal(TZ.grid(null), null);
});

await test("2a. monedele paginii: boții (simbolul lor), BTC/ETH/SOL, top 20 după volum, fără dubluri, cel mult 30, boții primii", () => {
  const boti = [{ activ: true, baza: "DOGE", quote: "USDT", simbolPionex: "DOGE_USDT" }, { activ: true, baza: "BTC.PERP" }, { activ: false, baza: "XRP.PERP" }];
  const monede = []; for (let i = 0; i < 40; i++) monede.push({ simbol: "C" + i + "_USDT_PERP", volum: 1000 - i * 10 });
  monede.push({ simbol: "ETH_USDT_PERP", volum: 99999 }, { simbol: "FARA_USDT_PERP", volum: 0 });
  const l = ctx.tzSimboluri(boti, { monede });
  assert.equal(l[0].simbol + ":" + l[0].pionex + ":" + l[0].fel, "DOGE:DOGE_USDT:bot"); assert.equal(l[1].simbol + ":" + l[1].pionex, "BTC:BTC_USDT_PERP"); assert.equal(l[1].fel, "bot");
  assert.ok(!l.some((x) => x.simbol === "XRP"), "botul oprit nu intră"); assert.equal(l.filter((x) => x.simbol === "ETH").length, 1, "ETH o singură dată");
  assert.ok(!l.some((x) => x.simbol === "FARA"), "volum zero nu intră"); assert.ok(l.length <= 30 && l.length >= 23, "lungimea: " + l.length);
  assert.equal(l.filter((x) => x.fel === "top").length, 19, "top 20 din clasament, dintre care ETH era deja (implicit)");
  assert.equal(JSON.stringify(ctx.tzSimboluri([], null).map((x) => x.simbol)), JSON.stringify(["BTC", "ETH", "SOL"]));
});

await test("2b. cartela: gridul / stopul / butonul „Grid: ce setez?”; rezumatul zilei; tzLaGrid în lista albă și cheamă gridClasamentAlege", () => {
  const h = ctx.tzHtml({ monede: [{ simbol: "DOGE", pionex: "DOGE_USDT", fel: "bot", d: D }, { simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: D }], simboluri: [1, 2], la: Date.now(), zi: 0, inLucru: false, eroare: null }, Date.now());
  assert.match(h, /Grid azi, din mișcare/); assert.match(h, /Stop, nu mai aproape de/); assert.match(h, /data-action-click="tzLaGrid\('DOGE_USDT'\)"/); assert.match(h, /botul tău/); assert.match(h, /tzCardBot/);
  assert.match(h, /Azi: 2 monede din 2 se mișcă probabil mai mult ca ieri|Azi: \d+ monede? din 2/); assert.match(h, /mișcarea așteptată, în medie \d+,\d %/);
  // v100.306 (I-825): garda fixa fraza („zece grile … cuprinde ziua în trei din patru cazuri”), falsă - acum garda e pe adevărul ei (adevarBanda)
  assert.doesNotMatch(h, /\d\.\d+ %/); assert.match(h, /cinci grile pe parte · cuprinde restul zilei UTC în \d+ % din zile/, "numerele mici din textul fix, în litere (garda v100.75)");
  adevarBanda([0, 7, 12, 18]);
  assert.match(citeste("public", "app.js"), /var ACTIUNI_PERMISE=new Set\("[^"]*\btzLaGrid\b/, "tzLaGrid lipsește din lista albă");
  let ales = null; ctx.navTo = () => {}; ctx.gridClasamentAlege = (s) => { ales = s; };
  ctx.tzLaGrid("DOGE_USDT"); return new Promise((r, rej) => setTimeout(() => { try { assert.equal(ales, "DOGE_USDT_PERP"); r(); } catch (e) { rej(e); } }, 500));
});

const TB = ctx.TabloBot;
await test("3a. tura Discord: monedele (boți + BTC/ETH/SOL, max 8) și rândurile ≤ 160 cu cifrele, coada cinstită", () => {
  const m = monedeTradeZilei([{ activ: true, baza: "DOGE", quote: "USDT", simbolPionex: "DOGE_USDT" }, { activ: true, baza: "BTC.PERP" }], TB);
  assert.equal(JSON.stringify(m.map((x) => x.simbol)), JSON.stringify(["DOGE", "BTC", "ETH", "SOL"])); assert.equal(m[0].pionex, "DOGE_USDT");
  const multi = []; for (let i = 0; i < 12; i++) multi.push({ activ: true, baza: "M" + i + ".PERP" });
  assert.equal(monedeTradeZilei(multi, TB).length, 8);
  const linii = liniiTradeZilei([{ simbol: "DOGE", fel: "bot", d: D }, { simbol: "BTC", fel: "piata", d: D }, { simbol: "SOL", fel: "piata", d: { eroare: "fără lumânări" } }], TZ);
  assert.ok(linii.every((l) => l.length <= 160), linii.map((l) => l.length).join(","));
  assert.match(linii[0], /^🎯 Azi: \d+ din 2 se mișcă/); assert.match(linii[1], /^🤖 DOGE 100,00 · >ieri \d+ % · azi ~\d+,\d % \(\d+,\d %–\d+,\d %\) · grid ±\d+,\d % pas \d+,\d\d % · stop ≥ \d+,\d % · max 101,00 (\d+ %|—|✓) · min 99,00 (\d+ %|—|✓)$/);
  assert.match(linii[3], /fără date: SOL/); assert.match(linii[4], /Niciun trade cu avantaj dovedit/);
});

await test("3b. tura Discord: nimic înainte de 9:00 RO, trimite o dată pe zi, starea se ține, 429 oprește bucla, nicio cifră ⇒ nu trimite", async () => {
  const trimise = []; const deps = (ora, stare, bareFn) => ({
    acum: Date.UTC(2026, 10, 3, ora - 2, 5), stare, jurnal: () => {}, TradeZilei: TZ, TabloBot: TB,
    trimite: async (m) => { trimise.push(m); return true; }, boti: async () => [{ activ: true, baza: "DOGE", quote: "USDT", simbolPionex: "DOGE_USDT" }],
    bare: bareFn || (async () => bare(r12, 7, 100, Date.UTC(2026, 10, 3) - 12 * ZI))   // 12 zile întregi înainte de 03.11 + 7 ore din ziua de azi
  });
  const st = {};
  assert.equal((await turaTradeZilei(deps(8, st))).trimis, false, "înainte de 9");
  const r = await turaTradeZilei(deps(9, st)); assert.equal(r.trimis, true); assert.equal(st.tradeZileiTrimis, "2026-11-03"); assert.equal(trimise.length, 1); assert.match(trimise[0].titlu, /🎯 Trade-ul zilei \(03\.11\)/);
  assert.equal((await turaTradeZilei(deps(10, st))).trimis, false, "a doua oară în aceeași zi nu");
  const st2 = {}; let cereri = 0;
  assert.equal((await turaTradeZilei(deps(9, st2, async () => { cereri++; throw new Error("HTTP 429"); }))).trimis, false, "fără cifre nu trimite"); assert.equal(cereri, 1, "429 oprește bucla");
});

await test("4. colectorul: importă tura, încarcă TradeZilei, o cheamă după rezumat cu cheia „tradezilei”, v101.162", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /import \{ turaTradeZilei \} from "\.\/lib\/tura-trade-zilei\.mjs"/); assert.match(C, /const TradeZilei = incarca\("trade-zilei\.js", "TradeZilei"\)/);
  assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(16[2-9]|[2-9]\d\d)"/);   // v101.163: pe „≥ 162”
  const i = C.indexOf("turaDimineataModul({"), j = C.indexOf("turaTradeZilei({"); assert.ok(i > 0 && j > i, "tura trade-ului zilei vine după rezumatul de dimineață");
  assert.match(C, /trimiteAlerta\(m, null, "tradezilei"\)/); assert.match(C, /interval=60M&limit=500"\); return GridCalcul\.bare\(/);
});

await test("5. versiunile v100.298 peste tot, feature-ul în BUILD_INFO, CSS-ul nou înaintea pândei", () => {
  // v100.299: pe „≥ 298” (regula de casă: proba veche cu versiuni fixe se relaxează la următorul bump)
  const V = /v100\.(29[89]|[3-9]\d\d)/;
  const H = citeste("public", "index.html"); assert.ok((H.match(/v100\.(29[89]|[3-9]\d\d)/g) || []).length >= 4, "index.html: sub 4 locuri (3 badge-uri + meta)"); assert.doesNotMatch(H, /v100\.297 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(29[89]|[3-9]\d\d)"/); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(29[89]|[3-9]\d\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, V); assert.match(B.badge, V); assert.ok("tradeZileiDimineata298" in B.features);
  const pk = JSON.parse(citeste("package.json")); assert.match(pk.version, /^100\.(29[89]|[3-9]\d\d)\.0$/); assert.equal(pk.scripts["test:v100298"], "node scripts/proba-v100298.mjs"); assert.match(pk.scripts.test, /npm run test:v100297 && npm run test:v100298/);
  const CSS = citeste("public", "app.css"); assert.match(CSS, /#tradezilei \.tzGrid\{/); assert.match(CSS, /#tradezilei \.tzEticheta\{/); assert.match(CSS, /#tradezilei \.tzRezumat\{/);
  assert.ok(CSS.indexOf("#tradezilei .tzRezumat{") < CSS.indexOf("/* v100.258: pânda")); assert.equal(panda.pandaInainteaCozii(CSS), "");
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
