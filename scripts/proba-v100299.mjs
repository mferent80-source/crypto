// Proba v100.299 / colector v101.163 (el, 03.11.2026: „alte idei?” → „fă”): ce a ieșit DOVEDIT din probele serii intră în Radar:
//   1. modelul pur: curba F(h) (cât din mișcarea zilei e format până la ora h; IS 2023–25, confirmat 2025–26 la 2,3 pp) - „format până acum”
//      și „mai rămâne”; factorul de weekend ×0,78 pe mișcarea așteptată (sâmbătă / duminică UTC), dovedit și în interiorul claselor de P3;
//   2. ecranul: rândul „din mișcarea zilei s-a format …”, nota de weekend, orele 15–18 RO în intro, proba prospectivă A în lista probelor;
//   3. tura Discord: capul mesajului spune cât s-a format și weekendul;
//   4. proba PROSPECTIVĂ a spargerii A (scripts/lib/tura-proba-a.mjs): portul exact al trade_A din Python, judecata zilei UTC închise fără viitor,
//      o dată pe zi după 00:10 UTC, rândurile în data/proba-a.jsonl fără dubluri, rândul de duminică fără verdict înainte de termen;
//   5. colectorul: importă tura, o cheamă după trade-ul zilei, rândul în raportul de duminică, v101.163; versiunile v100.299 peste tot.
//   node scripts/proba-v100299.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { liniiTradeZilei } from "./lib/tura-trade-zilei.mjs";
import { UNIVERS_A, tradeA, judecaZi, turaProbaA, liniaProbaA, VERDICT_DUPA } from "./lib/tura-proba-a.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.299 · ora zilei, weekendul, proba prospectivă A · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js"), ctx);
vm.runInContext(citeste("public", "lib", "tablou-bot.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei.js"), ctx);
vm.runInContext(citeste("public", "lib", "trade-zilei-ecran.js"), ctx);
const TZ = ctx.TradeZilei;
const ORA = 3600000, ZI = 86400000;
// 2025-11-01 (sâmbătă) … zilele sintetice pornesc de la T0; ziua 12 de la T0 = 2025-11-13 (joi)
const T0 = Math.floor(1761955200000 / ZI) * ZI;
function bare(ranges, oreAzi, pretAzi, t0) {
  const out = []; let p = 100; const T = t0 == null ? T0 : t0;
  ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) { const t = T + d * ZI + h * ORA, hi = p * (1 + r / 2), lo = p * (1 - r / 2); out.push({ t, o: p, h: h === 12 ? hi : p * 1.001, l: h === 6 ? lo : p * 0.999, c: p }); } });
  for (let h = 0; h < oreAzi; h++) out.push({ t: T + ranges.length * ZI + h * ORA, o: pretAzi, h: pretAzi * 1.001, l: pretAzi * 0.999, c: pretAzi });
  return out;
}
const r12 = Array(12).fill(0.04); r12[11] = 0.02; r12[10] = 0.025;

await test("1a. curba F(h): 24 de valori crescătoare, ultima 1; „format” = F la ultima oră închisă, 0 la ora 0; „rămâne” = 1 − format", () => {
  assert.equal(TZ.CURBA_F.length, 24); assert.equal(TZ.CURBA_F[23], 1);
  for (let h = 1; h < 24; h++) assert.ok(TZ.CURBA_F[h] > TZ.CURBA_F[h - 1], "crescătoare la " + h);
  const d3 = TZ.azi(bare(r12, 3, 100), T0 + 12 * ZI + 3 * ORA);   // 03:xx UTC: 3 ore închise ⇒ F(2)
  assert.equal(d3.oraUtc, 3); assert.equal(d3.format, TZ.CURBA_F[2]); assert.ok(Math.abs(d3.ramane - (1 - TZ.CURBA_F[2])) < 1e-12);
  const d0 = TZ.azi(bare(r12, 0, 100), T0 + 12 * ZI + 10 * 60000);   // 00:10 UTC: nicio oră închisă
  assert.equal(d0.format, 0); assert.equal(d0.ramane, 1);
  assert.ok(Math.abs(d3.ramaneAsteptat - d3.asteptat.med * d3.ramane) < 1e-12);
});

await test("1b. weekendul: sâmbătă / duminică UTC mișcarea așteptată ×0,85 (p25 / med / p75), în zilele lucrătoare ×1,06 (CALIB e pe toate zilele); gridul merge pe cifra înmulțită", () => {
  const joi = TZ.azi(bare(r12, 3, 100), T0 + 12 * ZI + 3 * ORA);   // 2025-11-13 joi
  const sam = TZ.azi(bare(r12, 3, 100, T0 + 2 * ZI), T0 + 14 * ZI + 3 * ORA);   // 2025-11-15 sâmbătă (aceleași 12 zile, mutate cu 2)
  assert.equal(joi.weekend, false); assert.equal(joi.factorZi, 1.06); assert.equal(sam.weekend, true); assert.equal(sam.factorZi, 0.85);
  const cls = TZ.clasa(joi.p3), r = 0.85 / 1.06;
  assert.ok(Math.abs(joi.asteptat.med - joi.media10 * cls.med * 1.06) < 1e-12, "lucrătoare = CALIB × 1,06");
  assert.ok(Math.abs(sam.asteptat.med - joi.asteptat.med * r) < 1e-12 && Math.abs(sam.asteptat.p75 - joi.asteptat.p75 * r) < 1e-12 && Math.abs(sam.asteptat.p25 - joi.asteptat.p25 * r) < 1e-12);
  assert.ok(Math.abs(TZ.grid(sam).latime - TZ.grid(joi).latime * r) < 1e-12);
  assert.equal(TZ.FACTOR_WEEKEND, 0.85); assert.equal(TZ.FACTOR_LUCRATOARE, 1.06);
});

await test("2. ecranul: rândul „format până acum”, nota de weekend doar sâmbăta / duminica, intro cu orele 15–18, proba prospectivă A în listă", () => {
  const joi = TZ.azi(bare(r12, 3, 100), T0 + 12 * ZI + 3 * ORA), sam = TZ.azi(bare(r12, 3, 100, T0 + 2 * ZI), T0 + 14 * ZI + 3 * ORA);
  const st = (d) => ({ monede: [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d }], simboluri: [1], la: Date.now(), zi: 0, inLucru: false, eroare: null });
  const hj = ctx.tzHtml(st(joi), Date.now()), hs = ctx.tzHtml(st(sam), Date.now());
  assert.match(hj, /Din mișcarea zilei, până la ora asta/); assert.match(hj, /mai rămân/); assert.doesNotMatch(hj, /weekend/i);
  assert.match(hs, /weekend/i); assert.match(hs, /×0,85 inclus/);
  assert.match(hj, /15–18/); assert.match(hj, /prospectiv/i); assert.match(hj, /2027/);
  assert.doesNotMatch(hj, /\d\.\d+ %/, "procentele cu virgulă");
});

await test("3. tura Discord: capul spune cât s-a format și weekendul; rândurile rămân ≤ 160", () => {
  const joi = TZ.azi(bare(r12, 3, 100), T0 + 12 * ZI + 3 * ORA), sam = TZ.azi(bare(r12, 3, 100, T0 + 2 * ZI), T0 + 14 * ZI + 3 * ORA);
  const lj = liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: joi }], TZ), ls = liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: sam }], TZ);
  assert.match(lj[0], /format până acum ~\d+ %/); assert.doesNotMatch(lj[0], /weekend/); assert.match(ls[0], /weekend ×0,85/);
  assert.ok(lj.concat(ls).every((l) => l.length <= 160));
});

await test("4a. tradeA = portul exact al trade_A din Python: intrarea la prima închidere peste PDH, stopul la ½ r1 × deschiderea zilei pe drum pesimist, ieșirea la ultima bară, costul", () => {
  // ziua judecată: PDH 101, PDL 99, r1 = 0,04 (fracție); scara stopului = ÎNCHIDEREA primei bare (Python: r1 * c[0]), nu deschiderea (o[0] = 100 e pus
  // dinadins altfel, ca testul să prindă confuzia din revizia 03.11) ⇒ stopul long = e − 0,5 × 0,04 × 100,5 = e − 2,01
  const zi = (baza) => { const z = []; for (let h = 0; h < 24; h++) z.push({ t: h * ORA, o: baza, h: baza + 0.05, l: baza - 0.05, c: baza }); z[0].o = 100; return z; };
  const z1 = zi(100.5); z1[3] = { t: 3 * ORA, o: 100.5, h: 102.5, l: 100.3, c: 102 };   // prima închidere > 101 ⇒ long la 102, stop 99,99
  z1[10] = { t: 10 * ORA, o: 100.8, h: 101, l: 99.5, c: 100.2 };                        // low 99,5 ≤ 99,99 ⇒ umplut la min(stop, open) = 99,99
  const stopL = 102 - 0.5 * 0.04 * 100.5, r = tradeA(z1, 101, 99, 0.04);
  assert.equal(r.fel, "stop"); assert.ok(Math.abs(r.net - ((stopL / 102 - 1) - 0.001)) < 1e-12, String(r.net));
  // fără stop ⇒ ieșire la ultima închidere; short la prima închidere sub PDL
  const z2 = zi(100.5); z2[3] = { ...z1[3] }; z2[23] = { t: 23 * ORA, o: 103, h: 103.5, l: 102.9, c: 103 };
  const r2 = tradeA(z2, 101, 99, 0.04); assert.equal(r2.fel, "ora"); assert.ok(Math.abs(r2.net - ((103 / 102 - 1) - 0.001)) < 1e-12);
  const z3 = zi(99.5); z3[3] = { t: 3 * ORA, o: 99.5, h: 99.7, l: 97.5, c: 98 }; z3[10] = { t: 10 * ORA, o: 99.3, h: 100.6, l: 99.1, c: 99.5 };   // short la 98, stop 98 + 1,99 = 99,99; high 100,6 ≥ stop ⇒ max(stop, open) = 99,99
  const stopS = 98 + 0.5 * 0.04 * 99.5, r3 = tradeA(z3, 101, 99, 0.04); assert.equal(r3.fel, "stop"); assert.ok(Math.abs(r3.net - ((1 - stopS / 98) - 0.001)) < 1e-12);
  assert.equal(tradeA(zi(100.5), 101, 99, 0.04), null, "nu intră ⇒ null");
  // ultima bară nu intră (ca în Python: for k in range(n − 1))
  const z4 = zi(100.5); z4[23] = { t: 23 * ORA, o: 100.5, h: 102, l: 100.4, c: 101.5 };
  assert.equal(tradeA(z4, 101, 99, 0.04), null);
});

await test("4b. judecaZi: P3 din zilele de dinainte (nimic din ziua judecată sau de după), semnalul la P3 ≥ 0,70, net și fel; ziua ciuntită ⇒ eroare", () => {
  const b = bare(r12, 0, 100); const ziJ = T0 + 12 * ZI;   // ziua 12 întreagă, construită de mână: spargere la ora 3
  for (let h = 0; h < 24; h++) b.push({ t: ziJ + h * ORA, o: 100, h: 100.5, l: 99.5, c: 100 });
  const i3 = b.findIndex((x) => x.t === ziJ + 3 * ORA); b[i3] = { t: ziJ + 3 * ORA, o: 100, h: 102.5, l: 99.8, c: 102 };
  for (let h = 0; h < 5; h++) b.push({ t: ziJ + ZI + h * ORA, o: 300, h: 300, l: 300, c: 300 });   // ziua de DUPĂ, stricată: nu are voie să conteze
  const j = judecaZi(b, Math.floor(ziJ / ZI), TZ);
  const d = TZ.azi(bare(r12, 0, 100), ziJ);
  // long la 102 (ora 3), stop = 102 − ½ × 0,02 × 100 = 101; ora 4 are low 99,5 ⇒ umplut la min(101, open 100) = 100
  assert.ok(Math.abs(j.p3 - d.p3) < 1e-12, "P3 = cel de la începutul zilei"); assert.equal(j.semnal, d.p3 >= 0.70); assert.equal(j.fel, "stop"); assert.ok(Math.abs(j.net - ((100 / 102 - 1) - 0.001)) < 1e-12);
  const b2 = b.filter((x) => !(x.t >= ziJ + 20 * ORA && x.t < ziJ + ZI)); assert.ok(judecaZi(b2, Math.floor(ziJ / ZI), TZ).eroare, "ziua ciuntită");
});

await test("4c. turaProbaA: nimic înainte de 00:10 UTC, nimic pentru zilele dinainte de 04.11.2026, judecă ziua de ieri pe fiecare simbol o singură dată, scrie rândurile, starea; simbolul fără lumânări se numără; zi fără niciun rând ⇒ se reia până la 06:00", async () => {
  const T4 = Date.UTC(2026, 10, 4) - 12 * ZI;   // 12 zile întregi înainte de 04.11.2026 (prima zi a probei)
  const b = bare(r12, 0, 100, T4); const ziJ = T4 + 12 * ZI; for (let h = 0; h < 24; h++) b.push({ t: ziJ + h * ORA, o: 100, h: 100.5, l: 99.5, c: 100 });
  const scrise = []; let existente = "";
  const deps = (acum, stare, simboluri, bareFn) => ({ acum, stare, jurnal: () => {}, TradeZilei: TZ, simboluri, pauzaMs: 0, citeste: () => existente, scrie: (l) => { scrise.push(...l); existente += l.map((x) => JSON.stringify(x)).join("\n") + "\n"; },
    bare: bareFn || (async (s) => { if (s === "FARA_USDT_PERP") throw new Error("Pionex: simbol necunoscut"); return b; }) });
  // ziua de 03.11 (cea în care s-au scris regulile) NU se judecă, chiar dacă e 04.11 00:15
  const b3 = bare(r12, 0, 100, T4 - ZI); for (let h = 0; h < 24; h++) b3.push({ t: ziJ - ZI + h * ORA, o: 100, h: 100.5, l: 99.5, c: 100 });
  const st0 = {}; assert.equal((await turaProbaA(deps(ziJ + 15 * 60000, st0, ["BTC_USDT_PERP"], async () => b3))).judecat, false, "03.11 nu se judecă"); assert.equal(st0.probaAZi, undefined);
  // toate simbolurile picate la 00:20 ⇒ ziua rămâne nejudecată (se reia); după 06:00 se închide
  const stE = {}; const rE = await turaProbaA(deps(ziJ + ZI + 20 * 60000, stE, ["BTC_USDT_PERP"], async () => { throw new Error("HTTP 500"); }));
  assert.equal(rE.judecat, true); assert.equal(rE.scrise, 0); assert.equal(stE.probaAZi, undefined, "fără niciun rând, ziua nu se marchează");
  await turaProbaA(deps(ziJ + ZI + 6 * ORA + 60000, stE, ["BTC_USDT_PERP"], async () => { throw new Error("HTTP 500"); })); assert.equal(stE.probaAZi, Math.floor(ziJ / ZI), "după 06:00 se închide");
  const st = {};
  assert.equal((await turaProbaA(deps(ziJ + ZI + 5 * 60000, st, ["BTC_USDT_PERP"]))).judecat, false, "00:05 UTC e prea devreme");
  const r = await turaProbaA(deps(ziJ + ZI + 15 * 60000, st, ["BTC_USDT_PERP", "ETH_USDT_PERP", "FARA_USDT_PERP"]));
  assert.equal(r.judecat, true); assert.equal(r.scrise, 2); assert.equal(r.fara, 1); assert.equal(scrise.length, 2); assert.equal(scrise[0].zi, Math.floor(ziJ / ZI)); assert.equal(scrise[0].simbol, "BTC");
  assert.equal(st.probaAZi, Math.floor(ziJ / ZI));
  assert.equal((await turaProbaA(deps(ziJ + ZI + 3 * ORA, st, ["BTC_USDT_PERP"]))).judecat, false, "aceeași zi nu se judecă de două ori");
  const st2 = {}; const r2 = await turaProbaA(deps(ziJ + ZI + 3 * ORA, st2, ["BTC_USDT_PERP", "SOL_USDT_PERP"]));
  assert.equal(r2.scrise, 1, "BTC era deja scris pentru ziua asta (din fișier), doar SOL se adaugă");
  assert.equal(UNIVERS_A.length, 21); assert.ok(UNIVERS_A.every((s) => /_USDT_PERP$/.test(s)));
});

await test("4d. rândul de duminică: numără zilele și semnalele, mediile, fără verdict înainte de termen; gol ⇒ „încă fără zile”", () => {
  const z = Math.floor(T0 / ZI); const l = [];
  for (let d = 0; d < 10; d++) ["BTC", "ETH"].forEach((s) => l.push({ zi: z + d, simbol: s, p3: d % 2 ? 0.8 : 0.3, semnal: !!(d % 2), net: d % 2 ? 0.01 : -0.005, fel: "ora" }));
  const t = liniaProbaA(l.map((x) => JSON.stringify(x)).join("\n") + "\n", T0 + 10 * ZI);
  assert.match(t, /^Proba A \(prospectivă/); assert.match(t, /10 zile/); assert.match(t, /10 zile-pereche cu semnal/); assert.match(t, /\+1,00 %/); assert.match(t, /−0,50 %/); assert.match(t, new RegExp("verdict după " + VERDICT_DUPA));
  assert.doesNotMatch(t, /DOVEDIT/); assert.match(liniaProbaA("", T0), /încă fără zile/);
});

await test("5. colectorul: importă tura, o cheamă după trade-ul zilei, rândul în raportul de duminică, v101.163; versiunile v100.299 peste tot", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /import \{ turaProbaA, liniaProbaA \} from "\.\/lib\/tura-proba-a\.mjs"/); assert.match(C, /const VERSIUNE_COLECTOR = "v101\.163"/);
  const i = C.indexOf("turaTradeZilei({"), j = C.indexOf("turaProbaA({"); assert.ok(i > 0 && j > i, "proba A vine după trade-ul zilei");
  assert.match(C, /proba-a\.jsonl/); assert.match(C, /rap\.linii\.push\(liniaProbaA\(/);
  /* v100.300 a relaxat pe „≥ 299” (ca v100.297 pe 296) */
  const I = citeste("public", "index.html"); assert.equal((I.match(/v100\.(299|[3-9]\d\d)/g) || []).length >= 3, true, "index ×3"); assert.match(I, /<meta content="v100\.(299|[3-9]\d\d)" name="app-version"\/>/);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(299|[3-9]\d\d)"/); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(299|[3-9]\d\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, /^v100\.(299|[3-9]\d\d)$/); assert.match(B.badge, /v100\.(299|[3-9]\d\d)/); assert.ok(B.features.oraZilei299, "feature-ul oraZilei299 rămâne");
  const P = JSON.parse(citeste("package.json")); assert.ok(Number(P.version.split(".")[1]) >= 299, "package.json sub 100.299"); assert.match(P.scripts.test, /test:v100299/); assert.equal(P.scripts["test:v100299"], "node scripts/proba-v100299.mjs");
});

console.log(`\n${teste - picate}/${teste} teste trecute`);
process.exit(picate ? 1 : 0);
