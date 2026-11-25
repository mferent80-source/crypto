// Proba v100.383 (24.11.2026, el: „eu cred ca monte Carlo bate câmpii grav tu ce zici?” ⇒ „da, fă reparația”). Botul BULLA (short 3×, stopul −15% din
// investiție la 0,2% de preț, ținta +3%): cartela zicea stop 19,9% / TP 80,1% pe 24 h. Diagnosticul pe viu (doar citire):
//   1. reluarea botului de la pornire ajungea la −30,5 USDT, Pionex la −24,6 - stopul / ținta în procente se măsurau pe cifra reluării;
//   2. ținta în procente intra ca UN preț (al serverului, pe poziția de acum) și era „atinsă” pe drumul real deși Pionex n-o atinsese ⇒ cifrele săreau
//      de la „TP 100%” la „stop 73% într-o oră” pentru un sfert de punct pe stop;
// Reparația: drumurile pornesc din banii din Pionex (o.totalPionex), ținta în procente e prag pe bani, partea ieșirii vine din pragul care a închis.
//   A  GridProba: ținta în procente (short, jos) - iese pe partea țintei, la ~r din investiție
//   B  GridProba: pragul deja trecut la începutul drumului (pragurile mutate pe Pionex pot sta oriunde) ⇒ partea pragului (stop / țintă), long și short
//   C  GridSim.simuleaza cu totalPionex: ieșirea pe stop / țintă „de aici încolo” = pragul din Pionex − banii din Pionex (nu ai reluării)
//   D  fără totalPionex și fără ținta în procente: aceleași cifre ca motorul de dinainte (04dde498)
//   E  cu totalPionex: șansa stopului scade lin când stopul se depărtează (fără salturi „TP 100%” ⇄ „stop 73%”)
//   F  poziția nepotrivită cu Pionex ⇒ fără șansele pe ore (riscScurt gol) + nota; setariDinBot citește ținta în procente; variantele care mută ținta ies din raport
//   G  „Ce fac cu botul ăsta?” (hotarare) pornește și ea din banii din Pionex
//   H  pagina (Tablou, Simulator) și colectorul dau totalPionex; versiunea
// Rulare: node scripts/proba-v100383.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message).split("\n").slice(0, 3).join("\n       ")}`); } }
console.log("\nv100.383 · Monte Carlo pe botul care rulează pornește din banii din Pionex · proba\n");

const FIS = ["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"];
for (const f of FIS) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GridCalcul: G, GridProba: GP, GridSim: GS } = globalThis;
// motorul de dinainte (v100.382, 04dde498), într-un context separat
function motorVechi() {
  const c = { TextRo: globalThis.TextRo, console, Math, JSON, Object, Array, Number, String, isFinite, Infinity, NaN, Date };
  vm.createContext(c);
  for (const f of FIS) vm.runInContext(execFileSync("git", ["show", "04dde498:public/lib/" + f], { cwd: RAD, encoding: "utf8", maxBuffer: 64 << 20 }), c, { filename: "vechi-" + f });
  return c;
}

// lumânări de 15 minute din pași aleatori (mulberry32 - regula casei), 10 zile
function bare(n, seed, vol, p0) {
  let a = seed >>> 0; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const out = []; let p = p0, t = Date.UTC(2026, 10, 1);
  for (let i = 0; i < n; i++) { const o = p, r = (rnd() - 0.5) * 2 * vol, c = o * (1 + r), h = Math.max(o, c) * (1 + rnd() * vol * 0.6), l = Math.min(o, c) * (1 - rnd() * vol * 0.6); out.push({ t, o, h, l, c, v: 100 }); p = c; t += 9e5; }
  return out;
}

await test("A  ținta în procente (short): iese pe partea țintei („jos”), la ~+3% din investiție, nu la un preț fix", () => {
  const P = 1, b = [{ t: 0, o: P, h: P, l: P, c: P }]; for (let i = 1; i <= 40; i++) { const o = b[i - 1].c, c = o * 0.997; b.push({ t: i * 9e5, o, h: o, l: c, c }); }
  const st = { jos: 0.9, sus: 1.05, grile: 10, levier: 3, dir: "short", tip: "aritmetic", stop: null, tpRaport: 0.03 };
  const r = GP.simuleaza(b, 0, b.length, st, {});
  assert.ok(r.oprit, "botul trebuia închis de țintă"); assert.equal(r.iesit, "jos");
  assert.ok(Math.abs(r.net - 0.03) < 0.006, "rezultatul la închidere " + r.net.toFixed(4) + ", așteptat ~0,03 (alunecarea la piață)");
  // fără tpRaport: aceeași mișcare nu închide nimic (ținta nu există)
  const r0 = GP.simuleaza(b, 0, b.length, Object.assign({}, st, { tpRaport: null }), {}); assert.equal(r0.oprit, false);
});

await test("B  pragul deja trecut la începutul drumului (pragurile mutate pe Pionex) ⇒ iese pe partea PRAGULUI: stopul pe a stopului, ținta pe a profitului", () => {
  for (const dir of ["long", "short"]) {
    const st = { jos: 0.9, sus: 1.1, grile: 10, levier: 3, dir, tip: "aritmetic", stop: null, pragAncorat: true }, P = 1.003;
    const net0 = GP.simuleaza([{ t: 0, o: P, h: P, l: P, c: P }], 0, 1, st, { traseu: true }).traseu.net[0], b = [{ t: 0, o: P, h: P, l: P, c: P }, { t: 9e5, o: P, h: P, l: P, c: P }];
    const rS = GP.simuleaza(b, 0, 2, Object.assign({}, st, { stopRaport: net0 + 1e-6 }), {}), rT = GP.simuleaza(b, 0, 2, Object.assign({}, st, { tpRaport: net0 - 1e-6 }), {});
    assert.ok(rS.oprit && rT.oprit, dir + ": amândouă trebuiau închise pe loc");
    assert.equal(rS.iesit, dir === "long" ? "jos" : "sus", dir + ": stopul"); assert.equal(rT.iesit, dir === "long" ? "sus" : "jos", dir + ": ținta");
    // fără pragAncorat un stop peste zero nu e stop (regula de până acum: stopul în procente e negativ)
    assert.equal(GP.simuleaza(b, 0, 2, Object.assign({}, st, { pragAncorat: false, stopRaport: 0.01 }), {}).oprit, false, dir + ": stop peste zero fără ancorare");
  }
});

// botul care rulează: short, pornit cu 8 bare înainte de capăt, gridul în jurul prețului de atunci
const B15 = bare(960, 20261124, 0.006, 1);
const iP = B15.length - 8, Pp = B15[iP].o, P0 = B15[B15.length - 1].c;
const stBot = () => ({ jos: Pp * 0.94, sus: Pp * 1.04, grile: 20, levier: 3, dir: "short", tip: "aritmetic", suma: 200, fundingZi: 0, stop: { sus: P0 * 1.5 }, stopRaport: -0.1, tp: P0 * 0.9, tpRaport: 0.03, tpRaportPret: P0 * 0.9 });
// „Pionex”: la jumătatea drumului dintre stop (−20 USDT) și țintă (+6 USDT), deci cu câțiva USDT altfel decât reluarea (ca la BULLA: ~6 USDT)
const TOTAL = (r1) => { const t = -7; return Math.abs(t - r1.acum.usdt) > 3 ? t : r1.acum.usdt - 5; };
const opt = (x) => Object.assign({ pornitLa: B15[iP].t - 60000, stPrefix: null, botRuleaza: true, n: 300, seed: 12, orizonturi: [1 / 24, 4 / 24, 1, 7], zile: 7 }, x);

await test("C  cu totalPionex: ieșirea „de aici încolo” pe stop = −10% × 200 − banii din Pionex; pe țintă = +3% × 200 − banii din Pionex", () => {
  const st = stBot(), r1 = GS.simuleaza(B15, st, opt({ stPrefix: Object.assign({}, st, { stop: null, tp: null, stopRaport: null, tpRaport: null }), n: 1 }));
  assert.ok(r1.acum && !r1.acum.oprit, "reluarea"); const tP = TOTAL(r1);
  assert.ok(tP > -0.1 * 200 + 2 && tP < 0.03 * 200 - 2, "Pionex între stop și țintă (" + tP.toFixed(2) + ")");
  const rez = GS.simuleaza(B15, st, opt({ stPrefix: st, totalPionex: tP }));
  assert.ok(rez.ancorat, "rez.ancorat"); assert.ok(Math.abs(rez.ancorat.diferenta - (tP - r1.acum.usdt)) < 1e-9 && Math.abs(rez.ancorat.diferenta) > 3, "diferența " + rez.ancorat.diferenta);
  const o7 = rez.orizonturi[3], t = (f) => (o7.deAici.terminari.find((x) => x.fel === f) || {}).p50;
  assert.ok(o7.pStop > 0.05 && o7.pTp > 0.05, "pe 7 zile ambele trebuie să apară (stop " + o7.pStop + ", TP " + o7.pTp + ")");
  const stopAsteptat = -0.1 * 200 - tP, tpAsteptat = 0.03 * 200 - tP;
  assert.ok(Math.abs(t("stop") - stopAsteptat) < 2, "stop de aici " + t("stop").toFixed(2) + " ≠ " + stopAsteptat.toFixed(2));
  assert.ok(Math.abs(t("tp") - tpAsteptat) < 2, "TP de aici " + t("tp").toFixed(2) + " ≠ " + tpAsteptat.toFixed(2));
  assert.ok(GS.notaAncorare(rez).startsWith("pornit din banii din Pionex ("), GS.notaAncorare(rez));
});

await test("D  fără totalPionex și fără ținta în procente: exact cifrele motorului de dinainte (04dde498)", () => {
  const V = motorVechi(), st = Object.assign(stBot(), { tpRaport: null, tpRaportPret: null }), o = opt({ stPrefix: st, n: 200 });
  const a = GS.simuleaza(B15, st, o), b = V.GridSim.simuleaza(B15, JSON.parse(JSON.stringify(st)), JSON.parse(JSON.stringify(o)));
  assert.ok(!a.eroare && !b.eroare, a.eroare || b.eroare); assert.equal(a.ancorat, undefined);
  a.orizonturi.forEach((x, h) => { const y = b.orizonturi[h]; assert.equal(x.pStop, y.pStop, "pStop h" + h); assert.equal(x.pTp, y.pTp, "pTp h" + h); assert.equal(x.p50, y.p50, "p50 h" + h); assert.equal(x.pCastig, y.pCastig, "pCastig h" + h); });
});

await test("E  cu totalPionex: șansa stopului pe o zi scade lin când stopul se depărtează (fără „TP 100%” ⇄ „stop 73%”)", () => {
  const st0 = stBot(), r1 = GS.simuleaza(B15, st0, opt({ stPrefix: Object.assign({}, st0, { stop: null, tp: null, stopRaport: null, tpRaport: null }), n: 1 })), tP = TOTAL(r1);
  let prev = 2; const sir = [];
  for (let s = -0.04; s >= -0.16; s -= 0.005) {
    const st = Object.assign(stBot(), { stopRaport: s }), rez = GS.simuleaza(B15, st, opt({ stPrefix: st, totalPionex: tP, n: 200 })), o1 = rez.orizonturi[2];
    assert.ok(!rez.eroare && rez.acum && !rez.acum.oprit, "s=" + s.toFixed(3) + ": " + (rez.eroare || "oprit")); sir.push((o1.pStop * 100).toFixed(1));
    assert.ok(o1.pStop <= prev + 1e-9, "stopul mai departe dar mai des atins: " + sir.join(" → ")); prev = o1.pStop;
  }
  assert.ok(+sir[0] > 20 && +sir[sir.length - 1] < +sir[0], "șirul trebuie să se miște (de la stopul aproape la cel departe): " + sir.join(" → "));
});

await test("F  poziția nepotrivită ⇒ riscScurt gol + nota; setariDinBot: ținta în procente; o variantă care mută ținta iese din raport", () => {
  const rez = { orizonturi: [{ zile: 1 / 24, pStop: 0.5, pTp: 0.1, pLich: 0, p5: -1 }], pozitie: { avert: true, potrivit: false } };
  assert.deepEqual(GS.riscScurt(rez), []); assert.match(GS.notaAncorare(rez), /poziția reluată nu se potrivește cu Pionex/);
  assert.equal(GS.riscScurt(Object.assign({}, rez, { pozitie: { avert: false, potrivit: true } })).length, 1);
  const b = { directie: "short", gridJos: 0.0215, gridSus: 0.024, levier: 3, investit: 222.68, pretCurent: 0.0243, opritorProfitActiv: true, opritorProfit: 0.023127, opritorProfitTip: "raport", opritorProfitRaport: 0.03, opritorPierdereActiv: true, opritorPierdere: 0.02501, opritorPierdereTip: "raport", opritorPierdereRaport: -0.2, brut: { buOrderData: { row: 36 } } };
  const s = GS.setariDinBot(b).st; assert.equal(s.tpRaport, 0.03); assert.equal(s.tpRaportPret, 0.023127); assert.equal(s.stopRaport, -0.2);
  assert.equal(GS.setariDinBot(Object.assign({}, b, { opritorProfitTip: "pret" })).st.tpRaport, undefined, "ținta pe preț rămâne preț");
  assert.ok(Math.abs(GS.ancoreaza(s, 0.01).tpRaport - 0.02) < 1e-12); assert.equal(GS.ancoreaza(Object.assign({}, s, { tp: 0.0235 }), 0.01).tpRaport, null, "ținta mutată (alt preț) nu mai e raportul botului");
  assert.ok(Math.abs(GS.ancoreaza(s, 0.03).stopRaport + 0.23) < 1e-12);
});

await test("G  „Ce fac cu botul ăsta?” pornește și ea din banii din Pionex (fără eroare, cu rândul „îl țin”)", () => {
  const st = stBot(), r1 = GS.simuleaza(B15, st, opt({ stPrefix: Object.assign({}, st, { stop: null, tp: null, stopRaport: null, tpRaport: null }), n: 1 }));
  const h = GS.hotarare(B15, st, { pornitLa: B15[iP].t - 60000, totalPionex: TOTAL(r1), n: 150, seed: 12, orizonturi: [1, 7], verifica: false });
  assert.ok(h && !h.eroare, h && h.eroare); const sursa = citeste("public", "lib", "grid-sim.js");
  assert.match(sursa, /totalPionex: o\.totalPionex \}\)\);   \/\* v100\.383/); assert.match(sursa, /simuleazaBaza\(b15, anc\(cuK\(stA\)\), bazaK\)/);
});

await test("H  Tabloul, Simulatorul și colectorul dau totalPionex; versiunea v100.383, colectorul v101.212, proba în lanț după v100.382", () => {
  const APP = cuTablou(citeste("public", "app.js")), SIM = citeste("public", "lib", "grid-sim-ecran.js"), COL = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs");
  assert.match(APP, /pozitiePionex:pornitLa\?d\.pozitie:null,totalPionex:totalPx,/); assert.match(APP, /GridSim\.notaAncorare\(rez\)/);
  assert.equal((SIM.match(/totalPionex: /g) || []).length, 4, "Simulatorul: 4 apeluri"); assert.equal((COL.match(/totalPionex: totalPx/g) || []).length, 3, "colectorul: 3 apeluri");
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json")), HTML = citeste("public", "index.html");
  /* v100.384: „de la 383 încolo” (versiunea și colectorul merg mai departe; după ea în lanț vine proba v100.384) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 383, "package.json"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 383); assert.ok(bi.li383 && bi.li383.length > 200, "BUILD_INFO.li383");
  assert.ok((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 383).length >= 4, "index.html"); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 383); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 383);
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/.exec(citeste("scripts", "colector.mjs")) || [])[1] >= 212, "colectorul de la v101.212 încolo");
  assert.match(pk.scripts.test, /npm run test:v100382 && npm run test:v100383/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100383"], "node scripts/proba-v100383.mjs");
});

console.log(`\n${teste - picate}/${teste} trecute` + (picate ? ` · ${picate} PICATE` : ""));
process.exit(picate ? 1 : 0);
