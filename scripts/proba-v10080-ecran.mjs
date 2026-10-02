// Proba v100.80 (ecranul) - rețeaua neuronală, livrarea 1: rândurile 🧠 (aceleași titluri ca 🎲, cifra rețelei, 🎲 alături, starea),
// direcția „cât dat cu banul” până e dovedită, rezultatul tău lângă rata ta, capul (modelul vechi), „Cum s-a verificat”; sub-blocul pe
// Tablou (fără modele - nimic), retea.js încărcat și pus în cache, garda STRICTĂ „retea” fără abateri.
//   node scripts/proba-v10080-ecran.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Retea: R } = globalThis;
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
const fn = (nume) => { const s = app(), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); return s.slice(i, s.indexOf("\nfunction ", i + 10)); };
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const ACUM = Date.UTC(2026, 9, 4, 12), V = { luni: 11, luniGata: 11, nIndep: 312, reper: "🎲", brier: 0.1834, brierReper: 0.1801, brierLog: 0.1822, ic: [-0.0412, 0.0123], icLog: [-0.02, 0.01], bss3: -0.004, logloss: 0.5412, loglossReper: 0.5388, loglossLog: 0.54 };
const MOD = Object.fromEntries(Object.keys(R.TINTE).map((t) => [t, { tinta: t, versiune: R.VERSIUNE, la: ACUM - 3600000, verificare: { ...V, reper: t === "rezultat" ? "rata pe monedă" : V.reper } }]));
const ZAR = [{ cod: "iese-jos-24", titlu: "Atinge marginea de jos (0.3605) în 24 h", p: 0.18 }, { cod: "lichidare", titlu: "Atinge lichidarea (0.2104) în 7 zile", p: 0.02 }];
const RT = { la: ACUM, v: R.VERSIUNE, p: { "iese-jos-24": 0.21, lichidare: 0.03, "directie-24": 0.51 } };
console.log("Proba v100.80 (ecranul) · rândurile 🧠, Tabloul, garda");

await test("(8) rândurile: titlul 🎲, cifra rețelei, „🎲 18% · nedovedită: nu bate 🎲 (Brier 0,183 față de 0,180)”; direcția; rezultatul tău", () => {
  const l = R.randuri(MOD, RT, ZAR, { acum: ACUM, pornire: { p: 0.41, rata: 0.524, n: 431 } });
  assert.deepEqual(l.map((x) => x.cod), ["iese-jos-24", "lichidare", "directie-24", "rezultat"]);
  assert.equal(l[0].titlu, ZAR[0].titlu); assert.equal(l[0].p, 0.21); assert.equal(l[0].text, "🎲 18% · nedovedită: nu bate 🎲 (Brier 0,183 față de 0,180)");
  assert.equal(l[2].titlu, "Prețul mai sus peste 24 h"); assert.match(l[2].text, /^cât dat cu banul — nedovedită: /);
  assert.equal(l[3].titlu, "La pornire, un bot ca ăsta ieșea pe plus"); assert.equal(l[3].text, "rata ta: 52% · nedovedită: nu bate rata pe monedă (Brier 0,183 față de 0,180)");
  const dov = { ...MOD, "atinge-24": { ...MOD["atinge-24"], verificare: { ...V, brier: 0.17, ic: [0.01, 0.08], icLog: [0.004, 0.03], bss3: 0.02, logloss: 0.52, loglossLog: 0.53 } } };
  assert.equal(R.randuri(dov, RT, ZAR, { acum: ACUM })[0].text, "🎲 18% · dovedită pe 312 zile independente");
});

await test("(8) fără modele, pe altă versiune sau fără cifra rețelei: niciun rând (nu „NaN%”, nu „0%”)", () => {
  assert.deepEqual(R.randuri(null, RT, ZAR, { acum: ACUM }), []);
  assert.deepEqual(R.randuri(MOD, { ...RT, v: "r0" }, ZAR, { acum: ACUM }), []);
  assert.deepEqual(R.randuri(MOD, { la: ACUM, v: R.VERSIUNE, p: {} }, ZAR, { acum: ACUM }), []);
});

await test("(8) capul: modelul mai vechi de 2 zile se spune; „Cum s-a verificat”: un rând pe țintă, cu blocurile ei", () => {
  assert.equal(R.antet(MOD, ACUM).titlu, "🧠 Rețeaua neuronală — a doua părere");
  assert.equal(R.antet(MOD, ACUM + 3 * 864e5).sub, "Model de acum 3 zile — antrenarea n-a mers de atunci.");
  const s = R.subsol(MOD); assert.equal(s.length, 7);
  assert.equal(s[0], "Atinge un nivel în 24 h: 312 zile independente, Brier 0,183 · 🎲 0,180 · formula simplă 0,182 · IC −0,04…0,01.");
  assert.match(s.find((x) => /^Atinge lichidarea/.test(x)), /: 312 săptămâni,/);   // 312: fără „de” (ultimele două cifre 12 < 20)
});

await test("(8) Tabloul: reteaHtml desenează sub-blocul (capul, rândurile, „Cum s-a verificat” pliat); fără modele -> nimic", () => {
  const ctx = { Retea: R, escapeHtml: (x) => String(x), reteaM: { m: MOD }, Date };
  vm.createContext(ctx); vm.runInContext(fn("tbProbRandHtml") + "\n" + fn("reteaHtml") + ";this.f=reteaHtml;", ctx);
  const h = ctx.f(RT, ZAR, { acum: ACUM });
  assert.match(h, /^<div class="tbRetea"><h4 class="tbProbH">🧠 Rețeaua neuronală — a doua părere<\/h4>/);
  assert.match(h, /<details class="tbProbFara"><summary>Cum s-a verificat<\/summary>/); assert.equal((h.match(/class="tbProbRand/g) || []).length, 3);
  ctx.reteaM.m = null; assert.equal(ctx.f(RT, ZAR, { acum: ACUM }), "");
  assert.match(fn("tbDeseneazaProb"), /\+reteaHtml\(rez\.retea,l,\{acum:Date\.now\(\),pornire:rez\.retea&&rez\.retea\.pornire\}\)/);
});

await test("(8) retea.js se încarcă după probabilitati.js și e în cache-ul aplicației", () => {
  assert.match(fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), /<script src="\/lib\/probabilitati\.js"><\/script><script src="\/lib\/retea\.js"><\/script>/);
  assert.match(fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8"), /"\/lib\/probabilitati\.js","\/lib\/retea\.js"/);
});

await test("(8) garda: grupul „retea” e STRICT și n-are abateri (toate formele verdictului, capul, verificarea, rândul de la poartă)", () => {
  assert.ok(STRICT.has("retea"));
  const s = situatii().filter((x) => x.mod === "retea"); assert.ok(s.length >= 60, String(s.length));
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " — " + q.x.text).join("\n"));
});

await test("(9) fișa: 🧠 pe aceleași bare și niveluri ca 🎲 (grProb.bare / grProb.o), cu BTC din Pionex; rândurile sub cele 🎲", () => {
  const f = fn("grProbDeseneaza");
  assert.match(f, /grProb\.bare=Probabilitati\.imbina\(b1,b15,Date\.now\(\)\)/); assert.match(f, /grProb\.rez=Probabilitati\.pentruBot\(grProb\.bare,grProb\.o\)/);
  assert.match(f, /Retea\.pentruBot\(reteaM\.m,grProb\.bare,grProb\.o,grRetea\.btc\)/); assert.match(f, /semnul e cifra\.<\/p>'\+reteaHtml\(rt,zar,\{acum:Date\.now\(\)\}\)\+'<\/div>'/);
});
await test("(9) poarta: rândul gri „🧠 Un bot ca ăsta ar ieși pe plus: …” din istoria ta; fără modele / bare / istoric, barele altei monede sau o eroare -> nimic; poarta neschimbată", () => {
  const ctx = { Retea: R, escapeHtml: (x) => String(x), reteaM: { m: null }, grProb: { bare: null, simbol: null }, grRetea: { btc: null }, grProbSetare: (f) => f.setare, Date,
    TabloExtra: { geometrieBot: () => ({ netPct: 0.004 }) }, JurnalTrade: { moneda: (x) => String(x).toUpperCase() }, grStare: { monede: { LIT_USDT_PERP: { baseCurrency: "LIGHTER" } } } };
  vm.createContext(ctx); vm.runInContext(fn("grReteaPoartaHtml") + ";this.f=grReteaPoartaHtml;", ctx);
  const f = { simbol: "LIT_USDT_PERP", dir: "long", pret: 1, setare: { jos: 0.9, sus: 1.1, grile: 20, suma: 50 } }, p = { trades: [{ moneda: "LIGHTER", net: 1, inchis: 1 }], lev: 3 };
  assert.equal(ctx.f(f, p), "");
  let primit = null; ctx.reteaM.m = { rezultat: { tinta: "rezultat", versiune: R.VERSIUNE, la: Date.now() - 1000, verificare: null } }; ctx.grProb.bare = []; ctx.grProb.simbol = "LIT_USDT_PERP";
  ctx.Retea = { ...R, pentruPornire: (m, t) => { primit = t; return { p: 0.41, rata: 0.524, n: 431 }; } };
  assert.equal(ctx.f(f, p), '<p class="tbSub grRetea">🧠 Un bot ca ăsta ar ieși pe plus: 41% · rata ta: 52% · nedovedită: neverificată încă.</p>');
  assert.equal(primit.moneda, "LIGHTER", "numele botului din lista Pionex (LIT = LIGHTER), ca la poartă"); assert.equal(primit.investit, 50); assert.ok(!("pus" in primit));
  assert.equal(ctx.f(f, { ...p, trades: [] }), "", "fără istoric nu se scrie „rata ta: 50%”");
  ctx.grProb.simbol = "BBB_USDT_PERP"; assert.equal(ctx.f(f, p), "", "barele altei monede");
  ctx.grProb.simbol = "LIT_USDT_PERP"; ctx.Retea = { ...R, pentruPornire: () => { throw new Error("x"); } }; assert.equal(ctx.f(f, p), "", "o eroare în rețea nu strică poarta");
  assert.match(fn("grPoartaHtml"), /\+grReteaPoartaHtml\(f,p\)/); assert.match(fn("gridPoarta"), /trades:trades,lev:lev/);
});
await test("(9) pe poză: nota 🎲 stă deasupra blocului 🧠 („Frecvențe din trecutul monedei… nu predicții” e despre 🎲, nu despre rețea) - pe fișă și pe Tablou", () => {
  for (const nume of ["grProbDeseneaza", "tbDeseneazaProb"]) { const f = fn(nume), nota = f.indexOf("tbProbNota"), creier = f.indexOf("+reteaHtml("); assert.ok(nota > 0 && creier > nota, nume + ": nota la " + nota + ", 🧠 la " + creier); }
});
await test("(9) revizia finală (M5): o eroare în rețea nu oprește desenul fișei / Tabloului (reteaHtml -> nimic; pentruBot în try)", () => {
  const ctx = { Retea: { ...R, randuri: () => { throw new Error("x"); } }, escapeHtml: (x) => String(x), reteaM: { m: { x: 1 } }, Date };
  vm.createContext(ctx); vm.runInContext(fn("tbProbRandHtml") + "\n" + fn("reteaHtml") + ";this.f=reteaHtml;", ctx);
  assert.equal(ctx.f({ p: {} }, [], { acum: 1 }), "");
  assert.match(fn("grProbDeseneaza"), /try\{rt=reteaM\.m&&grProb\.bare\?Retea\.pentruBot\(/);
});
console.log("\n" + (pica ? "V100.80 ECRAN PICA · " + pica + " din " + (ok + pica) : "V100.80 ECRAN PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
