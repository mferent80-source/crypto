// Proba v100.356 (17.11.2026, el: „ce crezi că mai merită făcut?” ⇒ „fă tot”): I-892 (tura Monte Carlo pe un fir separat), I-894 (verdictul
// bilanțului pe Discord, o dată), I-893 (calibrarea tabelului „Ce fac”), I-895 (partea nevăzută re-măsurată lunar), I-890, I-891.
//   node scripts/proba-v100356.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import * as TMC from "./lib/tura-monte-carlo-bot.mjs";
import { firGridSim } from "./lib/fir-gridsim.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
new Function(lib("text-ro.js") + "; return TextRo;")();
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const GS = new Function("GridCalcul", "GridProba", "MonteSimbol", "globalThis", `${lib("grid-sim.js")}; return GridSim;`)(GridCalcul, GridProba, MonteSimbol, {});
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function bare(zile, P0, s, seed) { const r = mulberry(seed), out = [], T0 = Date.UTC(2026, 9, 1); let p = P0; for (let i = 0; i < zile * 96; i++) { const o = p; p = p * Math.exp(s * (r() * 2 - 1)); out.push({ t: T0 + i * 9e5, o, h: Math.max(o, p) * 1.001, l: Math.min(o, p) * 0.999, c: p, v: 1 }); } return out; }
console.log("\nV100.356 · fă tot după v100.355 · proba\n");

// ── I-892: tura Monte Carlo pe un fir separat ─────────────────────────────────────────────────────────────────────────────────────────────
const BL = bare(32, 1.0, 0.004, 35), ND = 31 * 96, BD = BL.slice(0, ND), PD = BD[ND - 1].c;
const BOT = { id: 5, activ: true, baza: "TST", gridJos: PD * 0.93, gridSus: PD * 1.03, brut: { buOrderData: { row: 15, gridType: "arithmetic" } }, levier: 3, directie: "short", investit: 80, pornitLa: BD[ND - 150].t, opritorPierdereActiv: true, opritorPierdere: PD * 1.08, pretCurent: PD };
const tura = (fir, extra) => { const stare = { boti: { "5": { cat: "tine", text: "x", la: 1, ultima: 1, hot: { cheie: "tine", nume: "îl țin așa", la: 1, ultima: 1, anuntatLa: 0 } } } };
  return TMC.turaMonteCarloBot(Object.assign({ boti: [BOT], GridSim: GS, GridCalcul, stare, fir, randuri15: async () => BD.map((b) => [b.t, b.o, b.h, b.l, b.c, b.v]), anunta: async () => true, acum: BD[ND - 1].t + 9e5, n: 300, nHot: 200,
    regim: async () => ({ stare: "x", ferestre: [{ de: BD[100].t, pana: BD[ND - 1].t }] }) }, extra || {})).then((out) => ({ out, stare })); };

await test("🔑 F1 (I-892) aceeași tură pe fir și pe loc ⇒ ACELAȘI rezultat (verdict, riscul scurt, regimul, hotărârea și nota ei) - motorul de pe fir e construit ca în colector", async () => {
  const fir = firGridSim({ RAD, GridSim: GS });
  try {
    const a = await tura(null), b = await tura(fir);
    assert.equal(a.out.erori, 0); assert.equal(a.out.hotNote.length, 1); assert.deepEqual(b.out, a.out); assert.deepEqual(b.stare, a.stare);
    assert.ok(a.stare.boti["5"].regim && !a.stare.boti["5"].regim.eroare, "regimul socotit și el");
    assert.equal(fir.stare().caderi, 0);
  } finally { fir.opreste(); }
});
await test("🔑 F2 (I-892) cât lucrează firul, bucla e liberă: un ceas de 20 ms nu stă mai mult de 250 ms (pe loc: o hotărâre ține bucla peste 300 ms)", async () => {
  const fir = firGridSim({ RAD, GridSim: GS }), set = GS.setariDinBot(BOT).st, o = { pornitLa: BOT.pornitLa, n: 800, seed: 12, orizonturi: [1, 7] };
  try {
    await fir.simuleaza(BD.slice(0, 800), set, { n: 10, seed: 1, orizonturi: [1], zile: 1 });   // firul pornit (încărcarea modulelor nu intră în măsurătoare)
    let max = 0, prev = performance.now(); const ceas = setInterval(() => { const t = performance.now(); max = Math.max(max, t - prev); prev = t; }, 20);
    const t0 = performance.now(); const h = await fir.hotarare(BD, set, o); const durata = performance.now() - t0; clearInterval(ceas);
    assert.ok(!h.eroare, h.eroare); assert.ok(durata > 300, "hotărârea durează " + Math.round(durata) + " ms (altfel proba nu spune nimic)");
    assert.ok(max < 250, "bucla a stat " + Math.round(max) + " ms");
  } finally { fir.opreste(); }
});
await test("🔑 F3 (I-892) firul căzut (fișier care aruncă) ⇒ calculul pe loc, același rezultat, o singură linie în jurnal; după 3 căderi nu se mai pornește", async () => {
  const rau = path.join(RAD, "scripts", "lib", "fir-gridsim-lucru.mjs") + ".nu-exista.mjs", j = [];
  const fir = firGridSim({ RAD, GridSim: GS, jurnal: (...a) => j.push(a.join(" ")), fisier: pathToFileURL(rau) });
  try {
    const a = await tura(null), b = await tura(fir);
    assert.deepEqual(b.out, a.out); assert.deepEqual(b.stare, a.stare);
    assert.equal(j.filter((x) => /se face pe loc/.test(x)).length, 1, j.join(" | "));
    await tura(fir); await tura(fir); assert.ok(fir.stare().caderi >= 3, "căderi: " + fir.stare().caderi); assert.equal(fir.stare().pornit, false);
  } finally { fir.opreste(); }
});
await test("F4 (I-892) o excepție a motorului pe fir ajunge în colector cu același mesaj ca pe loc (eroarea botului, nu căderea firului)", async () => {
  const fir = firGridSim({ RAD, GridSim: GS });
  try {
    let pe = null, fr = null; try { GS.hotarare(null, null, null); } catch (e) { pe = e.message; }
    try { const r = await fir.hotarare(null, null, null); fr = r && r.eroare ? "întors:" + r.eroare : "fără excepție"; } catch (e) { fr = e.message; }
    const peL = (() => { try { const r = GS.hotarare(null, null, null); return r && r.eroare ? "întors:" + r.eroare : "fără excepție"; } catch (e) { return e.message; } })();
    assert.equal(fr, pe || peL); assert.equal(fir.stare().caderi, 0, "o excepție a motorului nu e o cădere a firului");
  } finally { fir.opreste(); }
});
await test("F5 (I-892) colectorul dă firul turei (COLECTOR_FARA_FIR îl oprește); toate calculele grele ale turei trec prin calc(); firul are doar simuleaza / hotarare", () => {
  const C = citeste("scripts", "colector.mjs"), M = citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), L = citeste("scripts", "lib", "fir-gridsim-lucru.mjs");
  assert.match(C, /const FirGS = process\.env\.COLECTOR_FARA_FIR \? null : firGridSim\(\{ RAD, GridSim, jurnal \}\);/);
  assert.match(C, /turaMonteCarloBotModul\(\{ boti: ultimiiBoti, GridSim, fir: FirGS,/);
  const corp = M.slice(M.indexOf("export async function turaMonteCarloBot("), M.indexOf("// v101.118 (15.10"));
  assert.ok(!/d\.GridSim\.(simuleaza|hotarare)\(/.test(corp), "niciun calcul greu direct pe buclă"); assert.equal((corp.match(/await calc\(d, "(simuleaza|hotarare)"/g) || []).length, 5);
  assert.match(L, /const VOIE = new Set\(\["simuleaza", "hotarare"\]\);/);
  for (const f of ["text-ro.js", "grid-calcul.js", "grid-proba.js", "monte-simbol.js", "monte-simbol-ecran.js", "grid-sim.js"]) assert.ok(L.includes('src("' + f + '")'), f);
});

// ── I-894: verdictul bilanțului pe Discord, o singură dată pe privire ──────────────────────────────────────────────────────────────────────
const V = GS.VERS_HOT, zi = (k) => new Date(Date.UTC(2026, 10, 18) + k * 86400000).toISOString().slice(0, 10);
const regDin = (vals, anuntate) => ({ v: V, de: 1, zile: vals.map((d, k) => [zi(k), d]), verdict: null, anuntate: anuntate || [] });
await test("🔑 B1 (I-894) 30 de zile pe minus clar ⇒ un anunț „au pierdut” (atenție), cu textul verdictului; după ce a plecat (cheia în registru) ⇒ nimic", () => {
  const vals = Array.from({ length: 30 }, (_, k) => -2 + 0.5 * Math.sin(k)), r = TMC.actualizeazaBilant(regDin(vals.slice(0, 29)), { zileAlt: vals.map((d, k) => [zi(k), d]), deschisDe: null }, V, 5);
  assert.equal(r.verdict && r.verdict.stare, "au-pierdut"); const a = TMC.anuntBilant(r, V);
  assert.equal(a.cheie, V + "-1-au-pierdut"); assert.equal(a.nivel, "atentie"); assert.match(a.titlu, /^🧭 Bilanțul „Ce fac cu botul ăsta\?”: sfaturile «altceva» au pierdut față de ținere$/);
  assert.match(a.mesaj, /^VERDICT \(la 30 de zile, t −\d+,\d\): sfaturile «altceva» au pierdut/); assert.match(a.mesaj, /Regula e scrisă pe 17\.11/);
  r.anuntate.push(a.cheie); assert.equal(TMC.anuntBilant(r, V), null);
  assert.deepEqual(TMC.actualizeazaBilant(r, { zileAlt: [], deschisDe: null }, V, 6).anuntate, [a.cheie], "verdictul înghețat își ține anunțurile");
});
await test("🔑 B2 (I-894) „n-am aflat” la 30 ⇒ un anunț „(deocamdată)”, la 60 încă unul (final); sub 30 nimic; anunțurile trec prin actualizeazaBilant (nu se pierd la zile noi); VERS_HOT nou ⇒ nimic din registrul vechi", () => {
  const g = mulberry(7), vals = Array.from({ length: 60 }, () => g() - 0.5);
  assert.equal(TMC.anuntBilant(regDin(vals.slice(0, 29)), V), null);
  const r30 = TMC.actualizeazaBilant(regDin(vals.slice(0, 29)), { zileAlt: vals.slice(0, 31).map((d, k) => [zi(k), d]) }, V, 1), a1 = TMC.anuntBilant(r30, V);
  assert.equal(a1.cheie, V + "-1-n-am-aflat"); assert.match(a1.titlu, /n-am aflat \(deocamdată\)$/); assert.match(a1.mesaj, /^la 30 de zile: n-am aflat \(\|t\| sub 2,6\), mai judec o dată la 60/); assert.equal(a1.nivel, "info");
  r30.anuntate.push(a1.cheie); const r45 = TMC.actualizeazaBilant(r30, { zileAlt: vals.slice(0, 45).map((d, k) => [zi(k), d]) }, V, 2);
  assert.deepEqual(r45.anuntate, [a1.cheie]); assert.equal(TMC.anuntBilant(r45, V), null, "între priviri tace");
  const r60 = TMC.actualizeazaBilant(r45, { zileAlt: vals.map((d, k) => [zi(k), d]) }, V, 3), a2 = TMC.anuntBilant(r60, V);
  assert.equal(a2.cheie, V + "-2-n-am-aflat"); assert.ok(!/deocamdată/.test(a2.titlu)); assert.match(a2.mesaj, /^verdict \(la 60 de zile\): n-am aflat/);
  assert.equal(TMC.anuntBilant(r60, V + 1), null);
});
await test("B3 (I-894) colectorul trimite o dată, cu cheia „hot-bilant-” (noaptea așteaptă dimineața, ca restul „Ce fac”), și ține cheia în registru doar după ce alerta a plecat", async () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /const ab = anuntBilant\(regB, GridSim\.VERS_HOT\); if \(ab && await trimiteAlerta\(\{ nivel: ab\.nivel, titlu: ab\.titlu, mesaj: ab\.mesaj \}, null, "hot-bilant-" \+ ab\.cheie\)\) \{ regB\.anuntate = \(regB\.anuntate \|\| \[\]\)\.concat\(\[ab\.cheie\]\); scrieHotBilant\(regB\); \}/);
  const POL = await import("./lib/politica-alerte.mjs"); assert.equal(POL.deAmanatNoaptea({ nivel: "atentie", titlu: "x" }, "hot-bilant-3-1-au-pierdut"), true);
});

// ── I-893: calibrarea tabelului (cifra lui «îl țin» prezisă față de barele reale) ─────────────────────────────────────────────────────────
const ZI = 86400000, T0 = Date.UTC(2026, 10, 18);
const nota = (id, k, med, real, extra) => ({ id, sim: "X", z: zi(k), nota: Object.assign({ t: T0 + k * ZI, tUrm: 0, v: V, ales: "tine", st: { suma: 50 }, actiuni: [{ cheie: "tine", media: med }, { cheie: "inchide", fix: true, media: 0 }] }, extra || {}), y7: { val: { tine: real, inchide: 0 } } });
await test("🔑 C1 (I-893) eroarea = 100 × (real − prezis) / sumă, pe ORICE notă judecată (și «altceva», și planul); cel mult una pe bot la 7 zile; regula veche și notele fără cifră nu intră; zilele = media pe zi", () => {
  const j = [nota("a", 0, 1, 2), nota("b", 0, 0, -1, { ales: "inchide" }), nota("a", 3, 5, 0) /* suprapusă cu prima lui „a” */, nota("a", 7, 0, 0.5, { plan: true, ales: "inchide" }), nota("c", 8, 1, 1, { v: V - 1 }),
    Object.assign(nota("d", 9, 1, 1), { nota: Object.assign(nota("d", 9, 1, 1).nota, { actiuni: [{ cheie: "inchide", fix: true }] }) })];
  const r = TMC.raportHotarari(j);
  assert.equal(r.calN, 3); assert.deepEqual(r.zileCal, [[zi(0), (2 + -2) / 2], [zi(7), 1]]);
  assert.equal(r.cal.stare, "prea-putine"); assert.match(r.text, / · cifrele tabelului \(2 zile judecate\): pe barele reale «îl țin» a ieșit în medie \+0,5% din sumă față de cifra tabelului \(pe zile între −\d+,\d% și \+\d+,\d%\) - verdict la 30 de zile$/);
});
await test("🔑 C2 (I-893) registrul: zilele calibrării doar ÎNCHISE, o dată, în ordine; verdictul înghețat chiar dacă jurnalul se taie; bilanțul își vede de ale lui; după bilanț, calibrarea se anunță și ea o dată", () => {
  const j = Array.from({ length: 30 }, (_, k) => nota("b" + k, k, 0, 1 + 0.3 * Math.sin(k))), astept = { id: "p", sim: "X", z: zi(10), nota: { t: T0 + 10 * ZI + 1, tUrm: 0, v: V, ales: "tine" }, y7: null };
  const r1 = TMC.actualizeazaBilant(null, TMC.raportHotarari(j.concat([astept])), V, 1); assert.equal(r1.cal.zile.length, 10, "până la nota care așteaptă"); assert.equal(r1.cal.verdict, null);
  const r2 = TMC.actualizeazaBilant(r1, TMC.raportHotarari(j), V, 2); assert.equal(r2.cal.zile.length, 30); assert.equal(r2.cal.verdict.stare, "au-batut"); assert.equal(r2.cal.verdict.la, 2);
  const r3 = TMC.actualizeazaBilant(r2, TMC.raportHotarari(j.slice(20)), V, 3); assert.equal(r3.cal.verdict.la, 2, "înghețat"); assert.equal(r3.cal.zile.length, 30);
  assert.equal(TMC.raportHotarari(j.slice(20), V, r3).cal.stare, "au-batut"); assert.equal(r3.zile.length, 0, "bilanțul: nicio notă «altceva»");
  const a = TMC.anuntBilant(r3, V); assert.equal(a.cheie, "cal-" + V + "-1-au-batut"); assert.match(a.titlu, /^🧭 Cifrele „Ce fac cu botul ăsta\?” pe barele reale: tabelul socotește «îl țin» prea jos$/);
  assert.match(a.mesaj, /^cifrele tabelului \(30 de zile judecate\) · VERDICT \(la 30 de zile, t \d+,\d\): tabelul socotește «îl țin» prea jos, deci înclină spre închidere\. Regula e scrisă pe 17\.11/);
  r3.anuntate.push(a.cheie); assert.equal(TMC.anuntBilant(r3, V), null);
});
await test("C3 (I-893) textele: „prea sus” la t ≤ −2,6; la 60 fără abatere ⇒ „n-am găsit o abatere (… nu înseamnă că cifrele sunt bune)”; o zecimală, „−”", () => {
  assert.match(TMC.textCal({ stare: "au-pierdut", n: 30, privire: 1, t: -3.04, final: true }, { medie: -1.26, jos: -2, sus: -0.5 }), /în medie −1,3% din sumă .* \(pe zile între −2,0% și −0,5%\) · VERDICT \(la 30 de zile, t −3,0\): tabelul socotește «îl țin» prea sus, deci înclină spre ținere$/);
  assert.match(TMC.textCal({ stare: "n-am-aflat", n: 60, privire: 2, t: 1.1, final: true }, null), /^ · cifrele tabelului \(60 de zile judecate\) · la 60 de zile: n-am găsit o abatere \(\|t\| sub 2,6 - nu înseamnă că cifrele sunt bune\)$/);
  assert.equal(TMC.textCal({ stare: "prea-putine", n: 0 }, null), "");
});
await test("C4 (I-893) ruta mc-verdict păstrează verdictul calibrării și media (rulată), aruncă o stare necunoscută; textul până la 1.100 de caractere", () => {
  const src = citeste("functions", "api", "istoric-bot.js"), m = src.match(/const hh=corp&&corp\.hotarari,hotarari=[\s\S]*?:null\}:null;/); assert.ok(m);
  const nr = (x) => (x === null || x === undefined || x === "" ? null : Number.isFinite(Number(x)) ? Number(x) : null), f = new Function("corp", "nr", m[0] + " return hotarari;");
  const a = f({ hotarari: { j7: 3, text: "y".repeat(2000), cal: { stare: "au-batut", n: 30, privire: 1, t: 2.9, final: true, rau: "<b>" }, calMedie: "0.4" } }, nr);
  assert.deepEqual(a.cal, { stare: "au-batut", n: 30, privire: 1, t: 2.9, final: true }); assert.equal(a.calMedie, 0.4); assert.equal(a.text.length, 1100);
  assert.equal(f({ hotarari: { j7: 1, text: "x", cal: { stare: "<i>" } } }, nr).cal, null);
});
await test("C5 (I-893) aceeași regulă probată sub H0 și pe codul de aici: 4.000 de serii de 60 de zile, media 0 (normală și asimetrică) ⇒ verdict fals ≤ 6%", () => {
  const g = mulberry(20261117), gs = () => { let u = 0; while (!u) u = g(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * g()); };
  for (const [nume, f] of [["normală", () => gs()], ["asimetrică", () => (g() < 0.1 ? -4.5 + gs() : 0.5 + 0.3 * gs()) + 0.0]]) {
    let mu = 0; for (let i = 0; i < 200000; i++) mu += f(); mu /= 200000;
    let fals = 0; for (let k = 0; k < 4000; k++) { const s = Array.from({ length: 60 }, () => f() - mu); if (TMC.verdictBilant(s).stare.startsWith("au-")) fals++; }
    assert.ok(fals / 4000 <= 0.06, nume + ": " + (100 * fals / 4000).toFixed(1) + "%");
  }
});

// ── I-895: partea nevăzută re-măsurată lunar ────────────────────────────────────────────────────────────────────────────────────────────
const LUM = await import("./cercetare-v100355-lumanarea.mjs");
await test("🔑 N1 (I-895) cifrele paginii scoase din măsurătoare exact ca pe 17.11 (tabelul I-888 ⇒ NEVAZUT de pe pagină); fereastra implicită = cea a lui I-888", () => {
  const c = (h1, h3, h7, p) => ({ 1: { s: { m: h1 }, pePas: { 0.003: { m: p } } }, 3: { s: { m: h3 } }, 7: { s: { m: h7 } } });
  const m15 = c(-0.462, -0.226, -0.111, -0.788), h = c(-0.982, -0.485, -0.261, -1.456), rap = { monede: 40, amprenta: "x", H: { 1: { "15m": m15[1], "1h": h[1] }, 3: { "15m": m15[3], "1h": h[3] }, 7: { "15m": m15[7], "1h": h[7] } } };
  const o = LUM.cifrePagina(rap, Date.UTC(2026, 10, 17)), N = GridProba.NEVAZUT;
  assert.equal(o.la, N.la); assert.deepEqual(o.m15, { ...N.m15 }); assert.deepEqual(o.h1, { ...N.h1 }); assert.equal(o.monede, 40);
  assert.deepEqual({ ...LUM.F }, { deLa: LUM.A.deLa, pana: LUM.A.pana });
  const S = citeste("scripts", "cercetare-v100355-lumanarea.mjs");
  assert.match(S, /CE === "lunar" \? \{ deLa: Math\.floor\(Date\.now\(\) \/ ZI\) \* ZI - 30 \* ZI, pana: Math\.floor\(Date\.now\(\) \/ ZI\) \* ZI \}/);
  assert.match(S, /if \(!\(rap\.monede >= 30\)\) throw/); assert.match(S, /if \(!ARG\.pastreaza\) fs\.rmSync\(CACHE, \{ recursive: true, force: true \}\);/); assert.ok(!/A\.deLa(?!, pana: A\.pana)|A\.pana(?! \})/.test(S.replace(/F\.deLa === A\.deLa && F\.pana === A\.pana/, "")), "doar fereastra F în calcule");
});
await test("🔑 N2 (I-895) pagina ia doar o măsurătoare întreagă și plauzibilă; textul spune data și câte monede; altfel rămân cifrele din 17.11", () => {
  const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul), t0 = GP.nevazutText("1h");
  for (const rau of [null, { la: "2026-12-17", m15: GP.NEVAZUT.m15, h1: GP.NEVAZUT.h1 }, { la: "17.12.2026", m15: { zi1: -1, zi3: 0, zi7: 0, pasMic: 0 }, h1: GP.NEVAZUT.h1 }, { la: "17.12.2026", m15: GP.NEVAZUT.m15 }, { la: "17.12.2026", m15: { zi1: 12, zi3: 0, zi7: 0, pasMic: 0 }, h1: GP.NEVAZUT.h1 }])
    assert.equal(GP.puneNevazut(rau), false);
  assert.equal(GP.nevazutText("1h"), t0); assert.match(t0, /\(17\.11\.2026, 40 de monede, 30 de zile\)/);
  assert.equal(GP.puneNevazut({ la: "17.12.2026", monede: 38, m15: { zi1: 0.31, zi3: 0.15, zi7: 0.08, pasMic: 0.6 }, h1: { zi1: 0.7, zi3: 0.36, zi7: 0.2, pasMic: 1.12 } }), true);
  assert.match(GP.nevazutText("1h"), /\(17\.12\.2026, 38 de monede, 30 de zile\), cifrele gridului ies cu ~0,4–0,7% din sumă pe zi SUB adevăr \(~1,1% la pasul de 0,3%\)/);
  assert.equal(GP.NEVAZUT.m15.zi7, 0.08, "GridProba.NEVAZUT ține pasul (îl citesc „Ce fac” și fișa)");
});
await test("N3 (I-895) ruta ține în KV doar cifrele plauzibile (rulată); colectorul le trimite cu verdictul MC; pagina le pune din KV, și la încărcare", () => {
  const src = citeste("functions", "api", "istoric-bot.js"), m = src.match(/const nv=corp&&corp\.nevazut[\s\S]*?:null;/); assert.ok(m, "bucata rutei");
  const nr = (x) => (x === null || x === undefined || x === "" ? null : Number.isFinite(Number(x)) ? Number(x) : null), f = new Function("corp", "nr", m[0] + " return nevazut;");
  const bun = { la: "17.12.2026", monede: "38", m15: { zi1: 0.3, zi3: 0.1, zi7: 0.1, pasMic: 0.6, x: "<b>" }, h1: { zi1: 0.7, zi3: 0.3, zi7: 0.2, pasMic: 1.1 } };
  assert.deepEqual(f({ nevazut: bun }, nr), { la: "17.12.2026", monede: 38, m15: { zi1: 0.3, zi3: 0.1, zi7: 0.1, pasMic: 0.6 }, h1: { zi1: 0.7, zi3: 0.3, zi7: 0.2, pasMic: 1.1 } });
  assert.equal(f({ nevazut: Object.assign({}, bun, { la: "<script>" }) }, nr), null); assert.equal(f({ nevazut: Object.assign({}, bun, { h1: { zi1: 99 } }) }, nr), null); assert.equal(f({}, nr), null);
  assert.match(src, /put\("mc-verdict",JSON\.stringify\(\{la,boti,calibrare,calibrareScurt,hotarari,nevazut\}\)\)/);
  const C = citeste("scripts", "colector.mjs"), A = citeste("public", "app.js");
  assert.match(C, /hotarari: hotarari, nevazut: citesteNevazut\(\)/);
  assert.match(A, /GridProba\.puneNevazut\(r\.mcVerdict\.nevazut\)/); assert.match(A, /setTimeout\(function\(\)\{try\{tbMcDinKv\(\)\}catch\(e\)\{\}\},2500\)/);
});
await test("🔑 N4 (I-895) colectorul: o dată la 30 de zile, DOAR noaptea și fără antrenori în lucru, proces separat cu prioritate scăzută (oprit cu colectorul, oprit la 90 de min), reîncercare după 20 h", () => {
  const C = citeste("scripts", "colector.mjs"), f = C.slice(C.indexOf("async function turaNevazutLunar()"), C.indexOf("async function turaReteaColector()"));
  assert.match(f, /!eNoapte\(acum\) \|\| reteaStare\.inLucru \|\| antrenori\.vii\(\)\.length \|\|/);
  assert.ok(C.indexOf("if (val.grele) turaReteaColector()") < C.indexOf("if (val.grele) turaNevazutLunar()"), "revizia 🔵5: după rețea (care se marchează „în lucru” pe loc)");
  assert.match(f, /acum - ultima < 30 \* 86400000 \|\| acum - \(Number\(ritm\.nevazutIncercat\) \|\| 0\) < 20 \* 3600000\) return;/);
  assert.match(f, /"--ce=lunar", "--iesire=" \+ NEVAZUT_F\]/); assert.match(f, /antrenori\.adauga\(c, "partea nevăzută"\); try \{ os\.setPriority\(c\.pid, os\.constants\.priority\.PRIORITY_BELOW_NORMAL\); \}/);
  assert.match(f, /90 \* 60000/); assert.match(C, /if \(val\.grele\) turaNevazutLunar\(\)\.catch/);
  assert.match(C, /NEVAZUT_PRIMA = Date\.UTC\(2026, 10, 17\)/, "prima re-măsurare la 30 de zile după I-888");
});

// ── I-890 (cârligul C2) și I-891 (reperul fișei) ─────────────────────────────────────────────────────────────────────────────────────────
// un drum pe pași de 1 minut (mers aleator, fără direcție) ⇒ lumânări de o oră - partea nevăzută există în ele (ca în sim-h0-v100269)
function drum1h(seed, zile) { const r = mulberry(seed), n = zile * 1440, s = 0.03 / Math.sqrt(1440), out = [], T = Date.UTC(2026, 3, 1); let p = 100, o = p, h = p, l = p;
  for (let i = 1; i <= n; i++) { const z = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); p = p * Math.exp(s * z - s * s / 2); if (p > h) h = p; if (p < l) l = p;
    if (i % 60 === 0) { out.push({ t: T + (i - 60) * 60000, o, h, l, c: p, v: 1 }); o = p; h = p; l = p; } } return out; }
const B1H = drum1h(4242, 120);
await test("🔑 K1 (I-890) cârligul C2: fără c ⇒ C1 neschimbat; cu c = b ⇒ aceeași cifră ca C1 (aceeași formulă); c > b ⇒ mai mult pe pasul mic", () => {
  const P = B1H[0].o, st = (pas) => GridCalcul.construieste({ pret: P, lat: 0.12, pas, dir: "neutru" }), w = B1H.slice(0, 72);
  const r = (s, nv) => GridProba.simuleaza(w, 0, w.length, s, { nevazut: nv }).net;
  assert.ok(Math.abs(r(st(0.006), { a: 0.02, b: 2 }) - r(st(0.006), { a: 0.02, b: 2, c: 2 })) < 1e-12);
  const extra = (pas, nv) => r(st(pas), nv) - GridProba.simuleaza(w, 0, w.length, st(pas)).net;
  assert.ok(extra(0.003, { a: 0.02, b: 2, c: 3 }) / extra(0.003, { a: 0.02, b: 2 }) > extra(0.012, { a: 0.02, b: 2, c: 3 }) / extra(0.012, { a: 0.02, b: 2 }), "exponentul pe pas apasă mai mult pe pasul mic");
  const S = citeste("scripts", "cercetare-v100355-lumanarea.mjs"); assert.match(S, /export const C2 = Object\.freeze\(\{ b: \[0\.5, 1, 1\.5, 2, 2\.5, 3\], c: \[0\.5, 1, 1\.5, 2, 2\.5, 3\], eps: 0\.05 \}\);/);
});
await test("🔑 R1 (I-891) lumânările întoarse: aceeași lărgime și aceeași mișcare în modul, pe fiecare lumânare; pornesc de la prețul primei; aceeași sămânță ⇒ același drum", () => {
  const w = B1H.slice(0, 48), g = (s) => { let a = s; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; }, q = GridProba.intoarceLumanari(w, g(7));
  assert.equal(q[0].o, w[0].o); assert.deepEqual(GridProba.intoarceLumanari(w, g(7)), q);
  for (let i = 0; i < w.length; i++) { assert.ok(Math.abs(Math.log(q[i].h / q[i].l) - Math.log(w[i].h / w[i].l)) < 1e-9); assert.ok(Math.abs(Math.abs(Math.log(q[i].c / q[i].o)) - Math.abs(Math.log(w[i].c / w[i].o))) < 1e-9); if (i) assert.ok(Math.abs(q[i].o - q[i - 1].c) < 1e-9 * q[i].o); }
});
await test("🔑 R2 (I-891) pe un mers aleator pe pași de 1 minut (lumânări de o oră): reperul ÎNAINTE de comisioane iese pe minus (partea nevăzută); d = net − reper stă peste media netă, iar diferența e cât reperul", () => {
  const fac = (pret) => GridCalcul.construieste({ pret, lat: 0.12, pas: 0.006, dir: "neutru" }), rep = GridProba.reperTest(B1H, 2, null, fac, 24);
  assert.ok(rep && rep.n >= 10, "ferestre de test: " + (rep && rep.n)); assert.ok(rep.reper < 0, "reperul (fără comisioane) arată minusul nevăzut: " + rep.reper);
  const net = []; const z = 24, W = 2 * z, PF = Math.max(1, Math.round(GridCalcul.C.PAS_FERESTRE * z / GridCalcul.C.BARE_ZI)), nA = Math.round(B1H.length * 2 / 3);
  const FZ = GridProba.fundingDe(null), cuF = (st) => Object.assign(st, { fundingZi: FZ.rataZi, fundingCost: FZ.presupus });   // ca în probă: funding-ul presupus
  for (let s = 0; s + W <= B1H.length; s += PF) if (s >= nA) net.push(GridProba.simuleaza(B1H, s, W, cuF(fac(B1H[s].o)), { barePeZi: z }).net);
  const mNet = net.reduce((a, x) => a + x, 0) / net.length; assert.ok(Math.abs(rep.dif.medie - (mNet - rep.reper)) < 1e-9);
});

// ── revizia Opus (17.11): reparațiile ─────────────────────────────────────────────────────────────────────────────────────────────────────
await test("🔑 Z1 (revizia 🟡2) calibrarea: o judecată lipsă (val.tine null) sau o cifră prezisă lipsă NU intră ca 0 USDT", () => {
  const j = [nota("a", 0, 5, null), nota("b", 0, null, 1), nota("c", 0, 1, 2)], r = TMC.raportHotarari(j);
  assert.equal(r.calN, 1); assert.deepEqual(r.zileCal, [[zi(0), 2]]);
});
await test("🔑 Z2 (revizia 🟡4) firul care nu răspunde: cererea pică, dar NU se numără drept cădere (n-ar muta totul pe loc); căderile se uită după 6 h liniștite", async () => {
  const tacut = path.join(RAD, "scripts", "lib", ".fir-tacut-proba.mjs");
  fs.writeFileSync(tacut, 'import { parentPort } from "node:worker_threads"; parentPort.postMessage({ gata: true }); parentPort.on("message", () => {});\n');
  const fir = firGridSim({ RAD, GridSim: GS, timeoutMs: 300, fisier: pathToFileURL(tacut) });
  try {
    for (let k = 0; k < 4; k++) { let e = null; try { await fir.hotarare(1, 2, 3); } catch (x) { e = x; } assert.match(String(e && e.message), /n-a răspuns în 0 s/); }
    assert.equal(fir.stare().caderi, 0, "depășirile nu sunt căderi");
  } finally { fir.opreste(); fs.rmSync(tacut, { force: true }); }
  const F = citeste("scripts", "lib", "fir-gridsim.mjs"); assert.match(F, /if \(caderi >= maxCaderi && Date\.now\(\) - ultimaCadere > 6 \* 3600000\) \{ caderi = 0; spusPeLoc = false; \}/);
});
await test("Z4 (revizia 🟡3) re-măsurarea lunară: un singur dosar (reluarea pornește din el), golit când fereastra e alta", () => {
  const S = citeste("scripts", "cercetare-v100355-lumanarea.mjs");
  assert.match(S, /CE === "lunar" \? "radar-nevazut-lunar" :/); assert.match(S, /if \(u0\.deLa !== F\.deLa \|\| u0\.pana !== F\.pana\) \{ fs\.rmSync\(CACHE, \{ recursive: true, force: true \}\);/);
});
await test("🔑 R3 (I-891 PICAT la poartă) fișa rămâne cum era: verdictul pe rezultatele adevărate (media pe test peste zero), nicio „față de reper”; grid-calcul neatins; nota fișei de azi", () => {
  const P = citeste("public", "lib", "grid-proba.js"), A = citeste("public", "app.js"), C = citeste("public", "lib", "grid-calcul.js");
  assert.match(P, /var v = G\.verdict\(\{ regim: rg, stat: statAles, zile: pr\.zile,/); assert.match(P, /f\.verdict = G\.verdict\(\{ regim: rg, stat: f\.stat, zile: pr\.zile,/);
  assert.ok(!/reperTest\(bP|fataDeReper|statVD|reperTest: rep &&/.test(P), "fișa nu cheamă reperul"); assert.ok(!/fataDeReper|reperul fără direcție/.test(C)); assert.ok(!/f\.reperTest/.test(A));
  assert.match(A, /\+'\. Deci un minus pe istoric nu e o dovadă, iar „media pe test peste zero” e o ștachetă mai înaltă decât pare\./);
  assert.match(P, /a PICAT poarta scrisă dinainte \(17\.11: cu gridul des inclus, PORNEȘTE fals \+2,5 \/ \+2,5 \/ \+4,2 puncte, peste \+2\)/);
});
await test("V versiunile v100.356 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO) + colector v101.194", () => {
  const h = citeste("public", "index.html"); assert.equal((h.match(/v100\.356/g) || []).length, 4); assert.match(h, /v100\.356 · CIFRELE PE BARELE REALE/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-356/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.356"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.356.0"); assert.match(p.scripts.test, /npm run test:v100355 && npm run test:v100356/);
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.badge, /^v100\.356/); assert.ok(bi.tot356 && bi.i888);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.194";/); assert.equal(TMC.VERS_HOT, GS.VERS_HOT);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
