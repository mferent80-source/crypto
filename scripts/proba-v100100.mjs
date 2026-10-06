// Proba v100.100 / colector v101.68 (05.10, I-530, el: „FA TOATE”): ADX la pornire vs cum s-a terminat botul, pe arhiva LUI.
// Prima măsurare (05.10, scratchpad, regula fixată înainte): 528 de boți pe 51 de monede - loc (sub 20) 65,3% pe plus, trend (peste 25) 62,3%;
// diferența pe plus +3,0 pp IC [−20,9; +12,9], pe mediană +0,1 pp IC [−2,1; +1,1] ⇒ NEDOVEDIT. Rândul ADX o spune pe față.
// (1) cazurile primesc ADX la pornire, fără privit în viitor · (2) bilantAdx pe cazuri cu răspuns cunoscut · (3) textul · (4) citirea + pagina
// (5) colectorul · (E) versiunile. Depozitul e PUBLIC ⇒ cazuri construite.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnApp = (nume) => { const s = citeste("public", "app.js"), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const AS = new Function("GridCalcul", `${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(globalThis.GridCalcul);
const P = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(globalThis.GridCalcul, AS);
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const ASM = new Function("Probabilitati", "GraficBot", `${lib("asemanatoare.js")}; return Asemanatoare;`)(P, GB);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.100 · colector v101.68 · I-530 ADX la pornire pe boții lui");

const ORA = 3600000, T0 = Date.UTC(2026, 3, 1);
const bare = (n, f) => Array.from({ length: n }, (_, i) => { const o = 1 + f(i), c = 1 + f(i + 1); return { t: T0 + i * ORA, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 1 }; });
const urca = (i) => i * 0.004, pe_loc = (i) => (i % 2 ? 0.004 : -0.004);
const trade = (id, moneda, pornit, net) => ({ id, moneda, dir: "long", levier: 3, jos: 0.9, sus: 1.1, pretInit: 1, pus: 100, net, pornit, durataOre: 10 });

await test("(1) cazurile primesc ADX 14 la ultima bară ÎNCHEIATĂ înainte de pornire și ora pornirii; barele de DUPĂ nu-l schimbă", () => {
  // zigzag pe loc, apoi un trend care pornește la bara 70: ADX crește de la o bară la alta, deci bara 79 ≠ bara 80 (o urcare curată stă la 100 și n-ar prinde nimic)
  const B = bare(120, (i) => (i < 70 ? pe_loc(i) : (i - 70) * 0.01)), por = T0 + 80 * ORA + 1000, A = GB.adx(B, 14).adx;
  assert.ok(Math.abs(A[79] - A[80]) > 0.5, "seria de probă trebuie să schimbe ADX-ul între bara 79 și 80: " + A[79] + " / " + A[80]);
  const c = ASM.cazuri([trade("a", "AAA", por, 2)], () => B)[0];
  assert.equal(c.t, por);
  assert.equal(c.adx, Math.round(A[79] * 10) / 10, "bara 79 (închisă la 80:00), nu bara 80 încă deschisă la pornire");
  const B2 = B.map((b, i) => (i >= 80 ? { ...b, h: b.h * 1.5, c: b.c * 1.3 } : b));
  assert.equal(ASM.cazuri([trade("a", "AAA", por, 2)], () => B2)[0].adx, c.adx, "viitorul nu intră");
  // fără GraficBot (cum îl încarcă probele vechi) ⇒ adx null, nu eroare; grafic-bot.js se pune singur pe globalThis ⇒ îl scot pe durata probei
  const gb0 = globalThis.GraficBot; delete globalThis.GraficBot;
  try { const fara = new Function("Probabilitati", `${lib("asemanatoare.js")}; return Asemanatoare;`)(P); assert.equal(fara.cazuri([trade("a", "AAA", por, 2)], () => B)[0].adx, null); }
  finally { globalThis.GraficBot = gb0; }
});

// cazuri construite: 20 de monede, câte 4 la „loc” și 4 la „trend”, rezultat după regula dată
const fac = (fLoc, fTrend, monede = 20) => { const l = []; for (let m = 0; m < monede; m++) for (let k = 0; k < 8; k++) { const loc = k < 4, t = T0 + (m * 8 + k) * ORA; l.push({ moneda: "M" + m, adx: loc ? 15 : 32, pct: loc ? fLoc(m, k, t) : fTrend(m, k, t), t }); } return l; };
await test("(2) bilantAdx: loc clar mai bun ⇒ dovedit; invers ⇒ pe dos; la fel ⇒ nedovedit; doar în primele 70% ⇒ nedovedit; puține ⇒ puține", () => {
  const d = ASM.bilantAdx(fac(() => 0.02, () => -0.02), { rep: 300 });
  assert.equal(d.verdict, "dovedit"); assert.equal(d.loc.n, 80); assert.equal(d.trend.n, 80); assert.equal(d.monede, 20); assert.ok(d.icPlus[0] > 0 && d.icMed[0] > 0);
  assert.equal(ASM.bilantAdx(fac(() => -0.02, () => 0.02), { rep: 300 }).verdict, "pe dos");
  const la = ASM.bilantAdx(fac((m, k) => (k % 2 ? 0.01 : -0.01), (m, k) => (k % 2 ? 0.01 : -0.01)), { rep: 300 }); assert.equal(la.verdict, "nedovedit");
  const T70 = T0 + Math.floor(160 * 0.7) * ORA;   // efectul doar în trecut, apoi pe dos ⇒ nu ține pe date noi
  assert.equal(ASM.bilantAdx(fac((m, k, t) => (t < T70 ? 0.03 : -0.01), (m, k, t) => (t < T70 ? -0.03 : 0.01)), { rep: 300 }).verdict, "nedovedit");
  assert.equal(ASM.bilantAdx(fac(() => 0.02, () => -0.02, 5), { rep: 50 }).verdict, "puține", "sub 10 monede / 30 pe grupă");
  assert.equal(ASM.bilantAdx([{ moneda: "X", adx: null, pct: 1 }]).n, 0, "fără ADX nu intră");
});
await test("(3) textAdx: spune verdictul cu cifrele, fără să promită când nu e dovedit", () => {
  const nd = { verdict: "nedovedit", n: 528, loc: { plus: 0.653 }, trend: { plus: 0.623 } };
  assert.equal(ASM.textAdx(nd), "pe boții tăi nu s-a dovedit că ajută (sub 20: 65% pe plus · peste 25: 62%, din 528)");
  assert.match(ASM.textAdx({ ...nd, verdict: "dovedit" }), /^pe boții tăi, porniți sub 20 au ieșit mai bine/);
  assert.match(ASM.textAdx({ ...nd, verdict: "pe dos" }), /^pe boții tăi, porniți în trend au ieșit mai bine/);
  assert.equal(ASM.textAdx({ verdict: "puține", n: 12 }), "pe boții tăi: prea puține cazuri (12)"); assert.equal(ASM.textAdx(null), null);
  assert.equal(ASM.textAdx(ASM.bilantAdx([{ moneda: "X", pct: 0.1, adx: null }])), null, "cazuri fără ADX (colector vechi) ⇒ tace, nu „prea puține (0)”");
});
await test("(4) citirea: rândul ADX poartă ce s-a măsurat pe boții lui; pagina îl socotește la aducerea cazurilor și-l dă intrării", () => {
  const B = bare(80, pe_loc), o = GB.intrareBot({ bot: { id: "x", directie: "long" }, bare: B, W: 900, adxPeBoti: "pe boții tăi nu s-a dovedit că ajută (…)", TabloExtra: null });
  const r = GB.citire(o, { directie: "long" }, B[B.length - 1].c).randuri.find((x) => x.ce === "ADX 14");
  assert.ok(r && r.text.endsWith(" · pe boții tăi nu s-a dovedit că ajută (…)"), r && r.text);
  assert.match(fnApp("tbCazuriAdu"), /tbCazuri\.adx=bl&&typeof bl\.adx==="string"\?bl\.adx:tbCazuri\.l&&typeof Asemanatoare!=="undefined"\?Asemanatoare\.textAdx\(Asemanatoare\.bilantAdx\(tbCazuri\.l\)\)/);   /* v100.110: întâi ce a socotit colectorul (bilant), apoi calculul vechi */
  assert.match(fnApp("renderTabloGrafic"), /adxPeBoti:\(tbCazuriAdu\(\),tbCazuri\.adx\|\|null\)/);
});
await test("(5) colectorul dă GraficBot modulului de cazuri (ADX noaptea) și scrie câte cazuri au ADX; versiunea v101.68", () => {
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /new Function\("Probabilitati", "GraficBot", fs\.readFileSync\(path\.join\(RAD, "public", "lib", "asemanatoare\.js"\)/); assert.match(col, /\)\(Probabilitati, GraficBot\);/);
  assert.ok(col.indexOf("const GraficBot = ") < col.indexOf("const Asemanatoare = "), "GraficBot înainte");
  assert.match(col, /"cu ADX:", cz\.filter\(\(c\) => c\.adx != null\)\.length/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.(6[8-9]|[7-9]\d)";/);
});
await test("(E) versiunile v100.100 (BUILD_INFO, versiune.js, sw, index ×4, package.json, lanțul cu v100100)", () => {
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.version, /^v100\.1\d\d$/); const V = bi.version; assert.ok(bi.badge.startsWith(V + " · "));
  assert.ok(citeste("functions", "_shared", "versiune.js").includes('export const VERSIUNE = "' + V + '";'));
  assert.ok(citeste("public", "sw.js").includes('const CACHE="crypto-radar-' + V.replace(".", "-") + '";'));
  const ix = citeste("public", "index.html"); assert.equal((ix.match(new RegExp(V.replace(".", "\\.") + "(?!\\d)", "g")) || []).length, 4, "index.html ×4");
  const pk = citeste("package.json"); assert.equal(JSON.parse(pk).version, V.slice(1) + ".0"); assert.ok(/npm run test:v10099 && npm run test:v100100( && |")/.test(pk), "lanțul de teste");
});

console.log(`\n${ok} trec · ${pica} pică`);
process.exit(pica ? 1 : 0);
