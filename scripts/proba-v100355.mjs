// Proba v100.355 (17.11.2026, el: „mai departe?” ⇒ „favtot”): (1) I-888 - partea nevăzută a lumânării măsurată pe lumânări de 1 minut (regulile în
// docs/cercetare/2026-11-17-i888-lumanarea-si-bilantul.md, scrise înainte); (2) regula B a bilanțului hotărârilor (verdictul la 30 / 60 de zile, Johnson
// |t_J| ≥ 2,5, urmarea „au pierdut”); (3) I-889 - regula de formă a acțiunilor tokenizate și pe pagină + în colector la pornire.
//   node scripts/proba-v100355.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as TMC from "./lib/tura-monte-carlo-bot.mjs";
import { A as REG_A, aduna, verdict as verdictA, griduri } from "./cercetare-v100355-lumanarea.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(lib(f), { filename: f });
const G = globalThis, M = G.MonteSimbol, GS = G.GridSim, GC = G.GridCalcul;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.355 · partea nevăzută a lumânării, regula bilanțului, acțiunile tokenizate pe pagină · proba\n");

function bare(seed, zile = 31) { const g = M.generator(seed), b = [], T0 = Date.UTC(2026, 9, 1); let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c *= Math.exp((g() - 0.5) * 0.01); b.push({ t: T0 + i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare(31), P = B[B.length - 1].c, O = { pornitLa: B[B.length - 200].t, n: 150, seed: 12, orizonturi: [1, 7], verifica: false };
const LONG = (lev, stop, o) => Object.assign({ jos: P * 0.9, sus: P * 1.04, grile: 20, levier: lev, dir: "long", suma: 50, stop: { jos: P * stop }, tip: "aritmetic", fundingZi: 0 }, o || {});
const ZI = 86400000, ziIso = (k) => new Date(Date.UTC(2026, 10, 18) + k * ZI).toISOString().slice(0, 10);
// jurnalul: pe fiecare zi k o hotărâre „altceva” (bot separat pe zi ⇒ fără suprapuneri) cu diferența d(k) față de ținere
const jurnalAlt = (n, d) => Array.from({ length: n }, (_, k) => ({ id: "b" + k, sim: "X", z: ziIso(k), nota: { t: Date.UTC(2026, 10, 18) + k * ZI, tUrm: 0, v: GS.VERS_HOT, ales: "inchide" }, y7: { val: { tine: 0, inchide: d(k) } } }));

// ── (2) regula B a bilanțului ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
await test("🔑 B1 verdictBilant: sub 30 de zile ⇒ „prea puține”; la 30 clar pe minus ⇒ „au pierdut” (privirea 1, înghețat); zgomot ⇒ „n-am aflat” până la 60, apoi final; pe plus ⇒ „au bătut”", () => {
  assert.equal(TMC.BILANT.prag, 2.6); assert.deepEqual([...TMC.BILANT.priviri], [30, 60]);
  assert.equal(TMC.verdictBilant(Array(29).fill(-1)).stare, "prea-putine");
  const rau = Array.from({ length: 30 }, (_, k) => -1 + 0.3 * Math.sin(k)), v1 = TMC.verdictBilant(rau);
  assert.equal(v1.stare, "au-pierdut"); assert.equal(v1.privire, 1); assert.equal(v1.final, true);
  // înghețat: zilele de după privire nu-l mai mișcă (primele 30 hotărăsc)
  assert.equal(TMC.verdictBilant(rau.concat(Array(40).fill(5))).stare, "au-pierdut");
  const zg = Array.from({ length: 45 }, (_, k) => Math.sin(k * 2.3)), v2 = TMC.verdictBilant(zg); assert.equal(v2.stare, "n-am-aflat"); assert.equal(v2.final, false);
  const zg60 = Array.from({ length: 60 }, (_, k) => Math.sin(k * 2.3)), v3 = TMC.verdictBilant(zg60); assert.equal(v3.stare, "n-am-aflat"); assert.equal(v3.privire, 2); assert.equal(v3.final, true);
  assert.equal(TMC.verdictBilant(rau.map((x) => -x)).stare, "au-batut");
});
await test("B2 t-ul lui Hall (1992): √n·[x + γx²/3 + γ²x³/27 + γ/(6n)], x = m/s; simetric ⇒ t simplu; MONOTON în medie (Johnson nu era: pe „pierde des puțin, câștigă rar mult” își pierdea puterea)", () => {
  const v = [1, 2, 3, 4, 20], n = 5, m = 6, d = v.map((x) => x - m), sd = Math.sqrt(d.reduce((s, x) => s + x * x, 0) / 4), g = d.reduce((s, x) => s + x ** 3, 0) / 5 / sd ** 3, x = m / sd;
  assert.ok(Math.abs(TMC.tHall(v) - Math.sqrt(n) * (x + g * x * x / 3 + g * g * x ** 3 / 27 + g / (6 * n))) < 1e-9);
  const sim = [-2, -1, 0, 1, 2, 3], ms = 0.5, sds = Math.sqrt(sim.reduce((s, y) => s + (y - ms) ** 2, 0) / 5); assert.ok(Math.abs(TMC.tHall(sim) - ms / (sds / Math.sqrt(6))) < 1e-9, "simetric ⇒ t simplu");
  const baza = Array.from({ length: 30 }, (_, k) => (k % 10 === 0 ? 4.5 : -0.5)); let prev = Infinity;
  for (let s = 0; s <= 3; s += 0.25) { const t = TMC.tHall(baza.map((y) => y - s)); assert.ok(t < prev, "monoton: " + s); prev = t; }
});
await test("🔑 B3 raportHotarari: verdictul în rezultat și în text - sub 30 „acum N”, la 30 pe minus „VERDICT … au pierdut … nu mai recomandă singur”", () => {
  const r1 = TMC.raportHotarari(jurnalAlt(12, () => -2));
  assert.equal(r1.verdict.stare, "prea-putine"); assert.ok(/verdictul \(regula scrisă pe 17\.11\): la 30 de zile cu «altceva» judecate \(acum 12\)/.test(r1.text), r1.text);
  const r2 = TMC.raportHotarari(jurnalAlt(30, (k) => -2 + 0.5 * Math.sin(k)));
  assert.equal(r2.verdict.stare, "au-pierdut"); assert.ok(/VERDICT \(la 30 de zile, t −?-?[\d,]+\): sfaturile «altceva» au pierdut față de ținere ⇒ tabelul nu mai recomandă singur altceva decât «îl țin» \(planul tău rămâne\)/.test(r2.text), r2.text);
  assert.ok(!/verdict/i.test(TMC.raportHotarari([]).text), "fără hotărâri judecate: fără rând de verdict");
});
await test("🔑 B4 urmarea în tabel: „au pierdut” ⇒ altceva decât „îl țin” coboară la „îl țin”, cu motivul; fără verdict rămâne ce era; planul tău bate verdictul", () => {
  const st = LONG(20, 0.85), h0 = GS.hotarare(B, st, O); assert.ok(h0.ales.cheie !== "tine", "scenariul are o recomandare «altceva»: " + h0.ales.cheie);
  const h1 = GS.hotarare(B, st, Object.assign({}, O, { bilantPierdut: true }));
  assert.equal(h1.ales.cheie, "tine"); assert.equal(h1.ales.bilant, true); assert.equal(h1.ales.inLocDe, h0.ales.cheie);
  assert.ok(/^aș fi zis „[^”]+”, dar bilanțul hotărârilor judecate pe barele reale arată că sfaturile de felul ăsta au pierdut față de ținere: îl țin$/.test(h1.ales.motiv), h1.ales.motiv);
  assert.equal(JSON.stringify(h1.actiuni.map((a) => a.cheie)), JSON.stringify(h0.actiuni.map((a) => a.cheie)), "rândurile rămân");
  const hp = GS.hotarare(B, st, Object.assign({}, O, { bilantPierdut: true, plan: { minus: 0.01, plus: 50 } })); assert.equal(hp.ales.cheie, "inchide"); assert.equal(hp.ales.plan, true);
});
await test("B5 legăturile: colectorul socotește verdictul ÎNAINTE de tură și îl dă tabelului; tura îl trece la hotărâre; pagina încarcă bilanțul ÎNAINTE; ruta îl păstrează (stare din listă)", () => {
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /const bilantPierdut = \(\(\) => \{ try \{ const v = verdictDinRegistru\(citesteHotBilant\(\), GridSim\.VERS_HOT\); return !!\(v && v\.stare === "au-pierdut"\); \} catch \{ return false; \} \}\)\(\);\n    const tStart = Date\.now\(\);[^\n]*\n    const r = await turaMonteCarloBotModul\(/);
  assert.match(c, /anunta: \(m, bot, cheie\) => trimiteAlerta\(m, bot, cheie\), bilantPierdut \}\);/);
  assert.match(c, /const regB = actualizeazaBilant\(citesteHotBilant\(\), hotarari, GridSim\.VERS_HOT, acumH\); scrieHotBilant\(regB\); hotarari = raportHotarari\(jh, GridSim\.VERS_HOT, regB\);/);
  assert.match(c, /const HOT_BILANT_F = path\.join\(DATA, "hot-bilant\.json"\);/); assert.match(c, /scrieSigur\(HOT_BILANT_F, r\); scrieSigur\(HOT_BILANT_F \+ "\.bak", r\);/);
  assert.match(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), /(?:d\.GridSim\.hotarare\(|calc\(d, "hotarare", )b15, set, \{[^}]*bilantPierdut: !!d\.bilantPierdut/);
  const e = lib("grid-sim-ecran.js"), i1 = e.indexOf("var bilP = "), i2 = e.indexOf('gsInWorker("hotarare"'); assert.ok(i1 > 0 && i1 < i2, "bilanțul înaintea hotărârii"); assert.match(e, /gsInWorker\("hotarare", d\.b15, st, \{ bilantPierdut: bilP,/);
  const ruta = citeste("functions", "api", "istoric-bot.js"); assert.match(ruta, /\["prea-putine","n-am-aflat","au-pierdut","au-batut"\]\.includes\(hh\.verdict\.stare\)/);
  assert.match(e, /Bilanțul are o regulă scrisă înainte de date \(17\.11\)/);
});
await test("B6 ruta mc-verdict păstrează verdictul bilanțului (rulată) și aruncă o stare necunoscută", async () => {
  const src = citeste("functions", "api", "istoric-bot.js"), m = src.match(/const hh=corp&&corp\.hotarari,hotarari=[\s\S]*?:null\}:null;/);
  assert.ok(m, "bucata rutei"); const nr = (x) => (x === null || x === undefined || x === "" ? null : Number.isFinite(Number(x)) ? Number(x) : null);
  const f = new Function("corp", "nr", m[0] + " return hotarari;");
  const a = f({ hotarari: { j7: 31, text: "x", verdict: { stare: "au-pierdut", n: 31, privire: 1, t: -2.8, final: true } } }, nr); assert.deepEqual(a.verdict, { stare: "au-pierdut", n: 31, privire: 1, t: -2.8, final: true });
  assert.equal(f({ hotarari: { j7: 1, text: "x", verdict: { stare: "<b>rau</b>" } } }, nr).verdict, null);
});

// ── revizia Opus (17.11): registrul regulii B, planul, lista goală, t cu o zecimală ──────────────────────────────────────────────────────────
await test("🔑 R1 (revizia 🔴) verdictul se îngheață în REGISTRU: jurnalul tăiat (primele zile ieșite) nu-l mai mută; fără registru ar fi căzut la „prea puține”", () => {
  const j = jurnalAlt(30, (k) => -2 + 0.5 * Math.sin(k)), rap = TMC.raportHotarari(j), reg = TMC.actualizeazaBilant(null, rap, GS.VERS_HOT, 1);
  assert.equal(reg.verdict.stare, "au-pierdut"); assert.equal(reg.verdict.final, true); assert.equal(reg.verdict.zile.length, 30); assert.equal(reg.zile.length, 30);
  const j2 = j.slice(5), rap2 = TMC.raportHotarari(j2); assert.equal(rap2.verdict.stare, "prea-putine", "fără registru, verdictul cădea");
  const reg2 = TMC.actualizeazaBilant(reg, rap2, GS.VERS_HOT, 2); assert.equal(reg2.verdict.stare, "au-pierdut"); assert.equal(reg2.verdict.la, 1, "înghețat la prima scriere");
  assert.equal(TMC.raportHotarari(j2, GS.VERS_HOT, reg2).verdict.stare, "au-pierdut"); assert.equal(TMC.verdictDinRegistru(reg2).stare, "au-pierdut");
  assert.equal(TMC.verdictDinRegistru(reg2, GS.VERS_HOT + 1).stare, "prea-putine", "VERS_HOT nou ⇒ de la zero"); assert.equal(TMC.actualizeazaBilant(reg2, rap2, GS.VERS_HOT + 1, 3).zile.length, 25);
});
await test("🔑 R2 (revizia 🔴) doar zilele ÎNCHISE intră în registru: o notă mai veche care așteaptă judecata oprește adăugarea de la ziua ei încolo; după judecată, zilele intră o singură dată, în ordine", () => {
  const j = jurnalAlt(10, () => -1), astept = { id: "p", sim: "X", z: ziIso(3), nota: { t: Date.UTC(2026, 10, 18) + 3 * ZI + 1, tUrm: 0, v: GS.VERS_HOT, ales: "inchide" }, y7: null };
  const rap = TMC.raportHotarari(j.concat([astept])); assert.equal(rap.deschisDe, ziIso(3));
  const reg = TMC.actualizeazaBilant(null, rap, GS.VERS_HOT, 1); assert.deepEqual(reg.zile.map((x) => x[0]), [ziIso(0), ziIso(1), ziIso(2)]);
  const jud = Object.assign({}, astept, { y7: { val: { tine: 0, inchide: -5 } } }), rap2 = TMC.raportHotarari(j.concat([jud])), reg2 = TMC.actualizeazaBilant(reg, rap2, GS.VERS_HOT, 2);
  assert.equal(rap2.deschisDe, null); assert.equal(reg2.zile.length, 10); assert.equal(reg2.zile[3][1], -3, "ziua 3: media celor două note (−1 și −5)");
  assert.deepEqual(TMC.actualizeazaBilant(reg2, rap2, GS.VERS_HOT, 3).zile, reg2.zile, "nimic adăugat de două ori");
});
await test("R3 (revizia 🟡) închiderile cerute de planul LUI nu intră în bilanț (nu sunt sfatul tabelului) - se spun separat", () => {
  const j = jurnalAlt(30, () => -3).map((e) => Object.assign({}, e, { nota: Object.assign({}, e.nota, { plan: true }) })), r = TMC.raportHotarari(j);
  assert.equal(r.alt, 0); assert.equal(r.plan, 30); assert.equal(r.verdict.stare, "prea-putine"); assert.match(r.text, /30 de închideri cerute de planul tău \(nu intră în verdict: e regula ta, nu sfatul tabelului\)/);
});
await test("R4 (revizia 🔵) t pe pagină cu O zecimală și „−”; „n-am aflat” spune pragul, nu o cifră rotunjită lângă el", () => {
  assert.match(TMC.textVerdictBilant({ stare: "au-pierdut", n: 30, privire: 1, t: -2.734, final: true }), /\(la 30 de zile, t −2,7\): sfaturile/);
  assert.equal(TMC.textVerdictBilant({ stare: "n-am-aflat", n: 35, privire: 1, t: -2.46, final: false }), " · la 30 de zile: n-am aflat (|t| sub 2,6), mai judec o dată la 60");
  assert.equal(TMC.textVerdictBilant({ stare: "n-am-aflat", n: 60, privire: 2, t: 1.2, final: true }), " · verdict (la 60 de zile): n-am aflat - |t| sub 2,6 (rămâne așa)");
});
await test("R5 (revizia 🟡) lista PERP venită goală (Pionex a refuzat) nu se ține minte: următoarea cerere reîncearcă", async () => {
  const A = citeste("public", "app.js"), s = A.slice(A.indexOf("var grSimbPerpP=null;"), A.indexOf("var nuCryptoNoi=[];")); let cereri = 0;
  const ctx = { getJSON: async () => { cereri++; return { data: { symbols: [] } }; } }; vm.createContext(ctx); vm.runInContext(s + "; this.g = grSimbPerp;", ctx);
  await ctx.g(); await ctx.g(); assert.equal(cereri, 2);
});
await test("R6 (revizia 🔵) „Ce fac”: cifra pe 7 zile spusă „măsurată pe doar 4 săptămâni”; bilanțul reîmprospătat la fiecare hotărâre; cârligul fără NaN la jos 0", () => {
  const E = lib("grid-sim-ecran.js"); assert.match(E, /cifra pe 7 zile e măsurată pe doar 4 săptămâni, fără verdict/); assert.ok(!/if \(!gsStare\.hotBilant\) \{ try/.test(E));
  const r = G.GridProba.simuleaza(B, 0, 50, { dir: "neutru", jos: 0, sus: P * 1.05, grile: 10, levier: 1, tip: "aritmetic" }, { nevazut: { a: 0.014, b: 2.6 } }); assert.ok(!Number.isNaN(r.nevazut));
});

// ── (3) I-889 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await test("🔑 I1 pagina: lista simbolurilor PERP o dată ⇒ formele de acțiune noi scoase (eCrypto) și Acasă redesenată; o monedă cu X și preț la 4 zecimale rămâne", async () => {
  const A = citeste("public", "app.js"), s = A.slice(A.indexOf("var grSimbPerpP=null;"), A.indexOf('if(typeof window!=="undefined")window.addEventListener("DOMContentLoaded",function(){setTimeout(nuCryptoInvataPagina,1500)});'));
  let cereri = 0, desenat = 0; const ctx = { GridCalcul: GC, acasa: { d: { tickers: [] } }, acasaDeseneaza: () => { desenat++; }, getJSON: async () => { cereri++; return { data: { symbols: [{ symbol: "NOUAX_USDT_PERP", quotePrecision: 2 }, { symbol: "MONEDAX_USDT_PERP", quotePrecision: 4 }, { symbol: "BTC_USDT_PERP", quotePrecision: 1 }] } }; } };
  vm.createContext(ctx); vm.runInContext(s + "; this.f = nuCryptoInvataPagina; this.g = grSimbPerp; this.noi = () => nuCryptoNoi;", ctx);
  assert.equal(GC.eCrypto("NOUAX_USDT_PERP"), true, "înainte");
  await ctx.f(); assert.equal(GC.eCrypto("NOUAX_USDT_PERP"), false); assert.equal(GC.eCrypto("MONEDAX_USDT_PERP"), true); assert.deepEqual([...ctx.noi()], ["NOUAX"]); assert.equal(desenat, 1);
  await ctx.g(); assert.equal(cereri, 1, "o singură cerere pe încărcare (fișa Grid o împarte)");
  assert.match(A, /async function grAduMonede\(\)\{\n  if\(grStare\.monede\)return;\n  try\{\n    var d=await grSimbPerp\(\);/);
});
await test("I2 Acasă: ce s-a scos după formă se vede în legenda „top 100 futures” (escapat, cel mult 6 nume); fără nimic, nimic", () => {
  const E = lib("acasa-ecran.js"), s = E.slice(E.indexOf("function acNuCryptoTxt() {"), E.indexOf("function acasaDeseneaza() {"));
  const run = (l) => { const c = { nuCryptoNoi: l, escapeHtml: (x) => String(x).replace(/</g, "&lt;") }; vm.createContext(c); vm.runInContext(s + "; this.r = acNuCryptoTxt();", c); return c.r; };
  assert.equal(run([]), ""); assert.equal(run(["AAX", "<B>X"]), " · scoase din listele crypto (par acțiuni: se termină în X, preț cu 2 zecimale): AAX, &lt;B>X");
  assert.match(run(["A1X", "A2X", "A3X", "A4X", "A5X", "A6X", "A7X", "A8X"]), /: A1X, A2X, A3X, A4X, A5X, A6X \+2$/);
  assert.match(E, /<span class="acMut">top 100 futures' \+ acNuCryptoTxt\(\) \+ '<\/span>/);
});
await test("I3 colectorul învață formele la PORNIRE (după linia „pornit”), cu rândul în jurnal; tura de clasament le învață în continuare", () => {
  const c = citeste("scripts", "colector.mjs"), i = c.indexOf('jurnal("pornit, PID '), j = c.indexOf("simboluriPerpLista().then((l) => { const noi = GridCalcul.invataNuCrypto(GridCalcul.nuCryptoDupaForma(l));");
  assert.ok(i > 0 && j > i && j - i < 400, "imediat după pornire"); assert.match(citeste("scripts", "lib", "tura-clasament.mjs"), /invataNuCrypto\(d\.GridCalcul\.nuCryptoDupaForma\(await d\.simboluriPerp\(\)\)\)/);
});

// ── (1) I-888 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const GP = G.GridProba;
await test("🔑 A1 cifrele măsurate, o singură sursă (GridProba.NEVAZUT), spuse cu O zecimală: 15 minute ~0,2–0,5% pe zi (0,8% la pasul 0,3%), o oră ~0,5–1,0% (1,5%)", () => {
  assert.equal(GP.NEVAZUT.la, "17.11.2026"); assert.deepEqual({ ...GP.NEVAZUT.m15 }, { zi1: 0.46, zi3: 0.23, zi7: 0.11, pasMic: 0.79 }); assert.deepEqual({ ...GP.NEVAZUT.h1 }, { zi1: 0.98, zi3: 0.49, zi7: 0.26, pasMic: 1.46 });
  assert.ok(/^pe lumânări de 15 minute motorul vede doar 4 puncte \(deschidere, minim, maxim, închidere\), nu dus-întorsurile dintre ele; măsurat pe lumânări de 1 minut \(17\.11\.2026, 40 de monede, 30 de zile\), cifrele gridului ies cu ~0,2–0,5% din sumă pe zi SUB adevăr \(~0,8% la pasul de 0,3%\), deci sunt prudente$/.test(GP.nevazutText("15m")), GP.nevazutText("15m"));
  assert.ok(/pe lumânări de o oră .* ~0,5–1,0% din sumă pe zi SUB adevăr \(~1,5% la pasul de 0,3%\)/.test(GP.nevazutText("1h")));
});
await test("🔑 A2 reparația C1 a picat ⇒ motorul NESCHIMBAT pe pagină: fără opt.nevazut aceleași cifre (și nevazut 0); cârligul, cerut explicit, adaugă câștig fără să mute poziția; lumânare în afara gridului ⇒ nimic", () => {
  const st = { dir: "neutru", jos: P * 0.95, sus: P * 1.05, grile: 20, levier: 2, tip: "aritmetic", stop: null };
  const a = GP.simuleaza(B, 0, 400, st), b = GP.simuleaza(B, 0, 400, st, {}), c = GP.simuleaza(B, 0, 400, st, { nevazut: { a: 0.014, b: 2.6 } });
  assert.equal(a.net, b.net); assert.equal(a.nevazut, 0); assert.ok(c.nevazut > 0 && c.net > a.net, c.nevazut + " / " + (c.net - a.net)); assert.equal(c.perechi, a.perechi, "dus-întorsurile nevăzute nu se numără ca perechi");
  const sus = [{ t: 0, o: 2 * P, h: 2.1 * P, l: 1.9 * P, c: 2 * P }, { t: 1, o: 2 * P, h: 2.2 * P, l: 1.8 * P, c: 2 * P }];
  const d0 = GP.simuleaza(sus, 0, 2, Object.assign({}, st, { jos: P * 0.95, sus: P * 1.05 })), d1 = GP.simuleaza(sus, 0, 2, Object.assign({}, st, { jos: P * 0.95, sus: P * 1.05 }), { nevazut: { a: 0.014, b: 2.6 } });
  assert.equal(d1.nevazut, 0); assert.equal(d1.net, d0.net);
  for (const f of ["grid-sim.js", "monte-simbol.js", "grid-proba.js"]) assert.ok(!/nevazut: \{ a:|nevazut: GridProba\.NEVAZUT|nevazut: N/.test(lib(f).replace(/\/\/[^\n]*/g, "")), f + " nu cere corecția");
});
await test("A3 aparatul măsurătorii: lumânările adunate pe găleți de timp (un minut lipsă nu mută găleata), cele 27 de griduri, verdictul după regula scrisă", () => {
  const M1 = 60000, b = [0, 1, 2, 4, 5, 6, 7, 8].map((k) => ({ t: REG_A.deLa + k * M1, o: 10 + k, h: 11 + k, l: 9 + k, c: 10.5 + k }));
  const a5 = aduna(b, 5 * M1); assert.equal(a5.length, 2); assert.deepEqual(a5[0], { t: REG_A.deLa, o: 10, h: 15, l: 9, c: 14.5 }); assert.deepEqual(a5[1], { t: REG_A.deLa + 5 * M1, o: 15, h: 19, l: 14, c: 18.5 });
  const g = griduri(100); assert.equal(g.length, 27); assert.deepEqual([...new Set(g.map((x) => x.dir))], ["long", "neutru", "short"]);
  assert.equal(verdictA({ m: -0.2, t: -5, jos: -0.25, sus: -0.15 }), "contează"); assert.equal(verdictA({ m: -0.02, t: -1, jos: -0.06, sus: 0.02 }), "cifrele stau"); assert.equal(verdictA({ m: -0.12, t: -2, jos: -0.25, sus: 0.01 }), "neclar");
  assert.equal(REG_A.prag, 0.10); assert.equal(REG_A.pragT, 3); assert.equal(REG_A.pragC1, 0.05); assert.equal(REG_A.samanta, 20261117);
});
await test("A4 documentul: regulile scrise ÎNAINTE (ora), apoi „După rezultat — A” (contează) și „— C1” (PICĂ ⇒ motorul rămâne); revizia regulii B cu oră, înainte de date", () => {
  const d = citeste("docs", "cercetare", "2026-11-17-i888-lumanarea-si-bilantul.md"), iR = d.indexOf("scrise 17.11.2026 ~12:40"), iA = d.indexOf("## După rezultat — A"), iC = d.indexOf("## După rezultat — C1");
  assert.ok(iR >= 0 && iA > iR && iC > iA, "ordinea"); assert.match(d, /PICĂ ⇒ motorul rămâne/); assert.match(d, /Revizia regulii B — 17\.11\.2026 ~13:05, tot ÎNAINTEA oricărei hotărâri judecate/);
  assert.match(d, /\| H = 1 \(30 de ferestre\) \| −0,190/);
});
await test("🔑 A5 pe pagină: „Ce fac” spune înclinarea spre închidere în USDT la suma lui (rulat); Simulatorul, Monte Carlo și fișa spun partea nevăzută (fișa: 1 oră când a probat pe 1 oră)", () => {
  const E = lib("grid-sim-ecran.js"), s = E.slice(E.indexOf("function gsHotNevazut(s, h) {"), E.indexOf("async function gsHotPorneste() {"));
  const c = { GridProba: GP, gsCate: (n, a, b) => n + " " + (n === 1 ? a : b), gsNr: (x, z) => x.toFixed(z).replace(".", ",") }; vm.createContext(c); vm.runInContext(s + "; this.f = gsHotNevazut;", c);
  const t = c.f({ st: { suma: 50 } }, { oriz: [1, 7] }); assert.ok(/^Partea nevăzută: pe lumânări de 15 minute .*„îl țin” și setările care lasă botul pornit sunt socotite deci prea jos față de „îl închid acum” \(care nu trece prin lumânări\) - pe 7 zile, la suma ta, de ordinul a 0,4 USDT \(cifra pe 7 zile e măsurată pe doar 4 săptămâni, fără verdict\): tabelul înclină puțin spre închidere\./.test(t), t);
  assert.match(E, /gsHotNevazut\(s, h\),/); assert.match(E, /if \(typeof GridProba !== "undefined" && GridProba\.nevazutText\) surse\.push\(GridProba\.nevazutText\("15m"\) \+ "\."\);/);
  assert.match(lib("monte-simbol-ecran.js"), /GridProba\.nevazutText\("15m"\)\.replace\(\/\^\.\/, function \(c\) \{ return c\.toUpperCase\(\); \}\)/);
  assert.match(citeste("public", "app.js"), /escapeHtml\(GridProba\.nevazutText\(f\.proba&&f\.proba\.barePeZi===24\?"1h":"15m"\)\)\+'\. Deci un minus pe istoric nu e o dovadă, iar „media pe test peste zero” e o ștachetă mai înaltă decât pare\./);
});
await test("V versiunile de la v100.355 încolo (index, sw, versiune.js, package + lanț, BUILD_INFO) + colector ≥ v101.193; VERS_HOT ≥ 3, același în motor și în bilanț", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);   // v100.356: versiunea curentă o verifică proba ei
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 355 && nr(citeste("public", "sw.js")) >= 355 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 355);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 355); assert.match(p.scripts.test, /npm run test:v100354 && npm run test:v100355/);
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(bi.i888 && bi.rest354);
  assert.ok(Number((citeste("scripts", "colector.mjs").match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 193); assert.ok(GS.VERS_HOT >= 3); assert.equal(TMC.VERS_HOT, GS.VERS_HOT);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
