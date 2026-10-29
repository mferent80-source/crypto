// Proba v100.271-j (ideile auditului 29.10): riscul pe termen scurt al Monte Carlo VERIFICAT pe boții lui.
// Pagina botului arată „Pe termen scurt (riscul, nu câștigul): stopul atins în 1 h / 4 h / o zi, cele mai proaste 5% …” (GridSim.riscScurt).
// Auditul a arătat că e calibrat ÎN MEDIE (73 de monede); aici: un jurnal nou, separat de cel de 7 zile, pe 1 h / 4 h / 24 h, ferestre fără
// suprapunere, judecat pe ce a făcut botul (stopul din motivul închiderii, totalul față de p5); raportul pe ZILE, cu verdict abia de la
// 30 de judecate pe cel puțin 10 zile. Protocolul e scris în scripts/lib/tura-monte-carlo-bot.mjs (înainte de date).
//   node scripts/proba-v100271-j.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import "./lib/text-ro-global.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }
}
console.log("\nV100.271-j · RISCUL PE TERMEN SCURT VERIFICAT PE BOȚII LUI\n");
const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monte-carlo-bot.mjs")).href);
const H = 3600000, MIN = 60000, T0 = Date.UTC(2026, 9, 20, 10, 0, 0);
const SC = [{ ore: 1, pStop: 0.031, pLich: 0, p5: -1.2 }, { ore: 4, pStop: 0.07, pLich: 0, p5: -2.5 }, { ore: 24, pStop: 0.2, pLich: 0.004, p5: -6 }];
const fn = (n) => { assert.equal(typeof MC[n], "function", "lipsește " + n + " în tura-monte-carlo-bot.mjs"); return MC[n]; };
const trei = () => fn("noteazaScurt")([], { id: 2601, scurt: SC, total: -0.5, acum: T0 });
const pe = (j, ore) => j.filter((e) => e.ore === ore);
// mulberry32 - aleatorul casei
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- notarea
await test("1 notarea: câte o intrare pe 1 h / 4 h / 24 h cu pStop, p5 (USDT), totalul și ora; fără total sau fără cifre ⇒ nimic", () => {
  const j = trei();
  assert.equal(j.length, 3);
  /* revizia 29.10: + areStop (botul fără stop nu intră în scorul stopului); implicit true */
  assert.deepEqual(j[0], { id: "2601", ore: 1, t: T0, z: "2026-10-20", pStop: 0.031, p5: -1.2, total: -0.5, stare: "deschis", areStop: true });
  assert.deepEqual(j.map((e) => e.ore), [1, 4, 24]);
  const N = fn("noteazaScurt");
  assert.deepEqual(N([], { id: 1, scurt: SC, total: null, acum: T0 }), [], "fără total nu se notează");
  assert.deepEqual(N([], { id: 1, scurt: null, total: 1, acum: T0 }), []);
  const doar1 = N([], { id: 1, scurt: [SC[0], { ore: 4, pStop: 0.07, p5: NaN }, { ore: 99, pStop: 0.1, p5: -1 }], total: 1, acum: T0 });
  assert.deepEqual(doar1.map((e) => e.ore), [1], "orizontul fără p5 sau din afara listei nu se notează");
});
await test("2 ferestre FĂRĂ suprapunere: pe (bot, h) o notare nouă abia după ce cea dinainte s-a judecat; ceilalți boți au ferestrele lor", () => {
  const N = fn("noteazaScurt"), J = fn("judecaScurt");
  let j = trei();
  assert.equal(N(j, { id: 2601, scurt: SC, total: -0.4, acum: T0 + 15 * MIN }), j, "toate trei deschise ⇒ același jurnal, nimic nou");
  j = N(j, { id: 2602, scurt: SC, total: 3, acum: T0 + 15 * MIN }); assert.equal(j.length, 6, "alt bot se notează");
  j = J(j, new Map([["2601", -0.7], ["2602", 3.1]]), T0 + H + MIN);
  assert.equal(pe(j, 1).filter((e) => e.stare === "judecat").length, 1, "la 1 h + 1 min doar 2601 a ajuns la orizont (2602 abia la 1 h 15 min)");
  j = N(j, { id: 2601, scurt: SC, total: -0.7, acum: T0 + H + 10 * MIN });
  assert.equal(pe(j, 1).filter((e) => e.id === "2601").length, 2, "după judecată, o notare nouă pe 1 h");
  assert.equal(pe(j, 4).filter((e) => e.id === "2601").length, 1, "4 h încă deschisă ⇒ nicio notare nouă pe 4 h");
  assert.equal(pe(j, 24).filter((e) => e.id === "2601").length, 1);
});

// ---------------------------------------------------------------- judecata, botul pornit
await test("3 judecata pe botul pornit: prima citire din [t+h, t+h+20 min]; stopul 0; „sub p5” strict (schimbarea < p5); fără total sau bot lipsă ⇒ așteaptă", () => {
  const J = fn("judecaScurt"), j = trei();
  assert.equal(J(j, new Map([["2601", -9]]), T0 + 59 * MIN), j, "înainte de orizont: neatins (același jurnal)");
  const a = J(j, new Map([["2601", -1.8]]), T0 + H + MIN), e1 = pe(a, 1)[0];
  assert.deepEqual([e1.stare, e1.stop, e1.sub5, e1.totalDupa, e1.la], ["judecat", 0, 1, -1.8, T0 + H + MIN], "−1,8 − (−0,5) = −1,3 < −1,2 ⇒ sub p5");
  assert.equal(pe(a, 4)[0].stare, "deschis"); assert.equal(pe(a, 24)[0].stare, "deschis");
  assert.equal(pe(J(j, new Map([["2601", -1.7]]), T0 + H + MIN), 1)[0].sub5, 0, "−1,2 fix nu e SUB p5");
  assert.equal(pe(J(j, new Map([["2601", 2]]), T0 + H + 20 * MIN), 1)[0].sub5, 0, "la t+h+20 min încă în fereastră");
  assert.equal(J(j, new Map(), T0 + H + MIN), j, "botul lipsă din listă: se așteaptă închiderea");
  assert.equal(J(j, new Map([["2601", null]]), T0 + H + MIN), j, "fără total: nu se judecă");
});
await test("4 fereastra ratată: botul pornit și trecut de t+h+20 min ⇒ „expirat”; botul lipsă ⇒ încă 6 h pentru judecata la închidere, apoi „expirat”", () => {
  const J = fn("judecaScurt"), j = trei();
  assert.equal(pe(J(j, new Map([["2601", -1]]), T0 + H + 21 * MIN), 1)[0].stare, "expirat");
  assert.equal(pe(J(j, new Map(), T0 + H + 21 * MIN), 1)[0].stare, "deschis", "botul lipsă: poate s-a închis - judecata la închidere");
  assert.equal(pe(J(j, new Map(), T0 + H + 20 * MIN + 6 * H + MIN), 1)[0].stare, "expirat", "închiderea n-a venit nici după 6 h");
});

// ---------------------------------------------------------------- judecata la închidere
await test("5 la închidere (până la t+h): loss_stop ⇒ stopul 1; țintă / lichidare / Pionex ⇒ 0; „sub p5” pe totalul final; motivul ținut", () => {
  const I = fn("judecaScurtLaInchidere"), j = trei(), la = T0 + 30 * MIN;
  const s = I(j, "2601", { total: -5, motiv: "loss_stop", inchisLa: la });
  assert.deepEqual(s.map((e) => [e.stare, e.stop, e.sub5, e.motiv, e.laInchidere, e.totalDupa, e.la]), [["judecat", 1, 1, "stop", true, -5, la], ["judecat", 1, 1, "stop", true, -5, la], ["judecat", 1, 0, "stop", true, -5, la]], "−4,5 < −1,2 și < −2,5, dar nu < −6");
  for (const [m, c] of [["profit_stop", "tinta"], ["liquidation", "lichidare"], ["liquidated", "lichidare"], ["system_cancel", "pionex"]]) {
    const r = I(j, "2601", { total: 1, motiv: m, inchisLa: la });
    assert.deepEqual([r[0].stare, r[0].stop, r[0].sub5, r[0].motiv], ["judecat", 0, 0, c], m);
  }
  const fara = I(j, "2601", { total: null, motiv: "loss_stop", inchisLa: la });
  assert.deepEqual([fara[0].stare, fara[0].stop, fara[0].sub5], ["judecat", 1, null], "fără totalul final se judecă doar ce se poate: stopul");
});
/* revizia 29.10: scos din scor, „închis de tine” umfla rata stopului ⇒ acum judecat cu stopul NEATINS, șansa pe cât a stat deschis (pExp) */
await test("6 închis de TINE ⇒ judecat cu stopul neatins, șansa pe cât a stat deschis (30 min din 1 h ⇒ jumătate); motiv necunoscut / lipsă / fără ora ⇒ „necitit”", () => {
  const I = fn("judecaScurtLaInchidere"), j = trei(), la = T0 + 30 * MIN;
  const tu = I(j, "2601", { total: 1, motiv: "user_cancel", inchisLa: la });
  assert.deepEqual(tu.map((e) => e.stare), ["judecat", "judecat", "judecat"]);
  assert.deepEqual(tu.map((e) => [e.stop, e.deTine]), [[0, true], [0, true], [0, true]]);
  assert.equal(pe(tu, 1)[0].pExp, 0.0155, "pe 1 h: 0,031 × 30 min / 60 min"); assert.equal(fn("raportScurt")(tu).ore[0].tine, 1, "numărat ca „închis de tine”");
  const nou = I(j, "2601", { total: 1, motiv: "ceva_nou", inchisLa: la });
  assert.deepEqual(nou.map((e) => e.stare), ["necitit", "necitit", "necitit"]); assert.equal(nou[0].motivBrut, "ceva_nou", "motivul brut rămâne pentru diagnostic");
  assert.equal(I(j, "2601", { total: 1, motiv: null, inchisLa: la })[0].stare, "necitit");
  assert.equal(I(j, "2601", { total: 1, motiv: "loss_stop", inchisLa: null })[0].stare, "necitit", "fără ora închiderii nu se știe dacă a fost înainte de orizont");
});
await test("7 închis DUPĂ orizont: în (t+h, t+h+20 min] ⇒ era pornit la t+h: stopul 0, pe totalul final; mai târziu ⇒ „expirat”; notat după închidere ⇒ „expirat”", () => {
  const I = fn("judecaScurtLaInchidere"), j = trei();
  const a = I(j, "2601", { total: -5, motiv: "loss_stop", inchisLa: T0 + H + 5 * MIN });
  assert.deepEqual([pe(a, 1)[0].stare, pe(a, 1)[0].stop, pe(a, 1)[0].sub5], ["judecat", 0, 1], "stopul a venit DUPĂ ora: pe 1 h nu se numără");
  assert.deepEqual([pe(a, 4)[0].stop, pe(a, 24)[0].stop], [1, 1], "pe 4 h și 24 h stopul a venit înăuntru");
  assert.equal(pe(I(j, "2601", { total: 1, motiv: "user_cancel", inchisLa: T0 + H + 5 * MIN }), 1)[0].stare, "judecat", "închis de tine DUPĂ ora: e o citire din fereastră");
  assert.equal(pe(I(j, "2601", { total: -5, motiv: "loss_stop", inchisLa: T0 + H + 25 * MIN }), 1)[0].stare, "expirat");
  assert.equal(I(j, "2601", { total: -5, motiv: "loss_stop", inchisLa: T0 - MIN })[0].stare, "expirat", "notare făcută pe un bot deja închis");
  const alt = fn("noteazaScurt")(j, { id: 77, scurt: SC, total: 0, acum: T0 });
  assert.equal(I(alt, "2601", { total: -5, motiv: "loss_stop", inchisLa: T0 + 30 * MIN }).filter((e) => e.id === "77" && e.stare === "deschis").length, 3, "alt bot nu se atinge");
  assert.equal(I(j, "999", { total: 1, motiv: "loss_stop", inchisLa: T0 }), j, "botul fără notări deschise: același jurnal");
});

// ---------------------------------------------------------------- notarea din tura colectorului
await test("8 noteazaScurtBoti: doar boții activi socotiți ÎN tura asta, fără „Reluarea arată botul OPRIT”, cu total", () => {
  const B = fn("noteazaScurtBoti");
  const st = { "1": { ultima: T0, text: "de aici încolo, 7 zile: …", scurt: SC }, "2": { ultima: T0 - 15 * MIN, text: "x", scurt: SC },
    "3": { ultima: T0, text: "de aici încolo, 7 zile: … · «Reluarea arată botul OPRIT pe drumul real»", scurt: SC }, "4": { ultima: T0, text: "x", scurt: SC }, "5": { ultima: T0, text: "x", scurt: SC } };
  const boti = [{ id: 1, profitTotal: -0.5 }, { id: 2, profitTotal: 1 }, { id: 3, profitTotal: 1 }, { id: 4, profitTotal: null }, { id: 5, activ: false, profitTotal: 1 }, { id: 6, profitTotal: 1 }];
  const j = B([], { boti, stareBoti: st, la: T0 + MIN, deLa: T0 - 1 });
  assert.deepEqual([...new Set(j.map((e) => e.id))], ["1"], JSON.stringify(j));
  assert.equal(j[0].t, T0 + MIN, "ora = citirea totalului");
  assert.deepEqual(B([], { boti, stareBoti: st, la: T0, deLa: null }), [], "fără începutul turei nu se notează (nu știu ce e proaspăt)");
});

// ---------------------------------------------------------------- raportul
const jud = (ore, zi, pStop, stop, sub5, extra) => Object.assign({ id: "b" + zi, ore, t: T0 + zi * 86400000, z: new Date(T0 + zi * 86400000).toISOString().slice(0, 10), pStop, p5: -1, total: 0, stare: "judecat", stop, sub5 }, extra || {});
await test("9 raportul: trei orizonturi, numărătorile (judecate, zile, închise de tine, necitite, expirate, deschise), media prezisă și rata atinsă", () => {
  const R = fn("raportScurt"), gol = R([]);
  assert.deepEqual(gol.ore.map((x) => [x.ore, x.n, x.verdictStop, x.verdictP5]), [[1, 0, "putine", "putine"], [4, 0, "putine", "putine"], [24, 0, "putine", "putine"]]);
  const j = [jud(1, 0, 0.1, 1, 1), jud(1, 0, 0.3, 0, 0), jud(1, 1, 0.2, 0, null), jud(4, 1, 0.1, 0, 0), Object.assign(jud(1, 2, 0.1, null, null), { stare: "tine" }),
    Object.assign(jud(1, 2, 0.1, null, null), { stare: "tine" }), Object.assign(jud(1, 2, 0.1, null, null), { stare: "necitit" }), Object.assign(jud(1, 3, 0.1, null, null), { stare: "expirat" }), Object.assign(jud(1, 3, 0.1, null, null), { stare: "deschis" })];
  const o = R(j).ore[0];
  assert.deepEqual([o.n, o.zile, o.tine, o.necitit, o.expirat, o.deschise, o.nSub5], [3, 2, 2, 1, 1, 1, 2]);
  assert.equal(o.pStopMed, 0.2); assert.equal(o.stopRata, 0.3333); assert.equal(o.sub5Rata, 0.5);
  assert.equal(R(j).ore[1].n, 1);
});
// podeaua: suma zilei ca aruncări cu șansele prezise, corelate în zi cu 0,1 ⇒ Var = Σ p(1−p) + 0,1·[(Σ √(p(1−p)))² − Σ p(1−p)]
const podea = (j) => { const z = new Map(); for (const e of j) { const a = z.get(e.z) || [0, 0]; a[0] += e.pStop * (1 - e.pStop); a[1] += Math.sqrt(e.pStop * (1 - e.pStop)); z.set(e.z, a); } return [...z.values()].reduce((s, [v, q]) => s + v + 0.1 * (q * q - v), 0); };
await test("10 intervalul pe ZILE: media (atins − prezis), varianța pe zile (CR1) cu podeaua (corelație în zi 0,1), t cu zile − 1 grade la 97,5% (Bonferroni pe 2 cifre) - socotit și aici, independent", () => {
  const R = fn("raportScurt"), r = mulberry32(7), j = [];
  for (let z = 0; z < 10; z++) for (let k = 0; k < 4; k++) j.push(jud(1, z, 0.25, r() < 0.35 ? 1 : 0, 0));
  const o = R(j).ore[0], n = j.length, dif = j.reduce((s, e) => s + e.stop - e.pStop, 0) / n;
  const zile = new Map(); for (const e of j) zile.set(e.z, (zile.get(e.z) || 0) + (e.stop - e.pStop - dif));
  const D = zile.size, vcl = D / (D - 1) * [...zile.values()].reduce((s, v) => s + v * v, 0) / (n * n), v0 = podea(j) / (n * n);
  const m = 2.685 * Math.sqrt(Math.max(vcl, v0));   /* t(0,9875; 9 grade) = 2,685 din tabele */
  assert.ok(Math.abs(o.stopDifJos - (dif - m)) < 0.001 && Math.abs(o.stopDifSus - (dif + m)) < 0.001, JSON.stringify({ o, dif, m, vcl, v0 }));
  // la 20 de grade t = 2,423 (tabele); aici câștigă varianța pe zile
  const j2 = []; for (let z = 0; z < 21; z++) for (let k = 0; k < 2; k++) j2.push(jud(1, z, 0.2, z < 5 ? 1 : 0, 0));   /* stopurile strânse în 5 zile */
  const o2 = R(j2).ore[0], n2 = j2.length, d2 = j2.reduce((s, e) => s + e.stop - e.pStop, 0) / n2, z2 = new Map(); for (const e of j2) z2.set(e.z, (z2.get(e.z) || 0) + (e.stop - e.pStop - d2));
  const vc2 = 21 / 20 * [...z2.values()].reduce((s, v) => s + v * v, 0) / (n2 * n2), v02 = podea(j2) / (n2 * n2), m2 = 2.423 * Math.sqrt(Math.max(vc2, v02));
  assert.ok(vc2 > v02, "exemplul trebuie să aibă varianța pe zile peste podea");
  assert.ok(Math.abs(o2.stopDifSus - (d2 + m2)) < 0.001, JSON.stringify({ o2, d2, m2 }));
  assert.ok(v0 * n * n > j.reduce((s, e) => s + e.pStop * (1 - e.pStop), 0), "podeaua e peste aruncările independente");
});
await test("11 capcana evenimentelor rare: 30 de judecate pe 10 zile, stopul prezis 3% și niciun stop atins ⇒ NU „prezice prea mult” (podeaua aruncărilor independente)", () => {
  const R = fn("raportScurt"), j = [];
  for (let z = 0; z < 10; z++) for (let k = 0; k < 3; k++) j.push(jud(1, z, 0.025 + 0.002 * k, 0, 0));
  const o = R(j).ore[0];
  assert.equal(o.n, 30); assert.equal(o.zile, 10);
  assert.notEqual(o.verdictStop, "prea-mult", "zilele fără stop au varianța pe zile aproape 0 - fără podea intervalul ar fi strâmt: " + JSON.stringify(o));
  assert.notEqual(o.verdictP5, "prea-mult", "nicio pierdere sub p5 în 30 nu arată nimic: " + JSON.stringify(o));
});
await test("12 cuvintele: sub 30 de judecate sau sub 10 zile ⇒ „putine”; stopuri mult peste prezis ⇒ „prea-putin”; mult sub ⇒ „prea-mult”; multe date potrivite ⇒ „potrivit”", () => {
  const R = fn("raportScurt");
  const sub30 = []; for (let z = 0; z < 10; z++) for (let k = 0; k < 2; k++) sub30.push(jud(1, z, 0.03, k ? 1 : 0, 1));
  assert.equal(R(sub30).ore[0].verdictStop, "putine", "20 de judecate"); assert.equal(R(sub30).ore[0].verdictP5, "putine");
  const sub10 = []; for (let z = 0; z < 9; z++) for (let k = 0; k < 5; k++) sub10.push(jud(1, z, 0.03, k < 3 ? 1 : 0, 1));
  assert.equal(R(sub10).ore[0].verdictStop, "putine", "9 zile");
  const mult = []; for (let z = 0; z < 10; z++) for (let k = 0; k < 4; k++) mult.push(jud(1, z, 0.03, k === 0 || (k === 1 && z % 2 === 0) ? 1 : 0, k === 0 ? 1 : 0));
  assert.equal(R(mult).ore[0].verdictStop, "prea-putin", JSON.stringify(R(mult).ore[0]));
  assert.equal(R(mult).ore[0].verdictP5, "prea-putin", "25% sub p5 față de 5%");
  const putin = []; for (let z = 0; z < 12; z++) for (let k = 0; k < 5; k++) putin.push(jud(4, z, 0.5, k === 0 && z % 3 === 0 ? 1 : 0, 0));
  assert.equal(R(putin).ore[1].verdictStop, "prea-mult", JSON.stringify(R(putin).ore[1]));
  const bun = []; for (let z = 0; z < 60; z++) for (let k = 0; k < 10; k++) bun.push(jud(24, z, 0.1, k === 0 ? 1 : 0, k === 0 && z % 2 === 0 ? 1 : 0));
  assert.equal(R(bun).ore[2].verdictStop, "potrivit", JSON.stringify(R(bun).ore[2])); assert.equal(R(bun).ore[2].verdictP5, "potrivit");
  const nedecis = []; for (let z = 0; z < 10; z++) for (let k = 0; k < 3; k++) nedecis.push(jud(1, z, 0.1, k === 0 && z < 4 ? 1 : 0, 0));
  assert.equal(R(nedecis).ore[0].verdictStop, "nedecis", "nici peste, nici sub, nici strâmt: fără cuvânt " + JSON.stringify(R(nedecis).ore[0]));
});
await test("13 sub H0 (riscul corect, zile cu piață comună): „prezice prea puțin / prea mult” pe ecran în cel mult ~5% din seturi (mică simulare; cea mare în sim-h0-v100271-j.mjs)", () => {
  const R = fn("raportScurt"), r = mulberry32(271), gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
  const Phi = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
  let rele = 0; const N = 400;
  for (let s = 0; s < N; s++) {
    const j = [];
    for (let z = 0; z < 14; z++) {
      const u = gauss(), u5 = gauss(), k = 1 + Math.floor(r() * 5);
      for (let i = 0; i < k; i++) {
        const p = r() < 0.2 ? 0 : 0.005 + r() * 0.1, x = Phi(Math.sqrt(0.3) * u + Math.sqrt(0.7) * gauss()) < p ? 1 : 0, y = Phi(Math.sqrt(0.3) * u5 + Math.sqrt(0.7) * gauss()) < 0.05 ? 1 : 0;
        j.push(jud(1, z, p, x, y));
      }
    }
    const o = R(j).ore[0];
    if (/^prea-/.test(o.verdictStop) || /^prea-/.test(o.verdictP5)) rele++;
  }
  assert.ok(rele / N <= 0.06, "pe date fără efect „prea …” în " + (100 * rele / N).toFixed(1) + "% din seturi");
});

// ---------------------------------------------------------------- serverul
await test("14 serverul (istoric-bot?action=mcVerdict) păstrează raportul riscului scurt curățat: 3 orizonturi 1 / 4 / 24, numere, verdicte din listă", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now());
  const Hh = { authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://exemplu.test" };
  const unul = (ore) => ({ ore, n: 44, zile: 12, pStopMed: 0.07, stopRata: 0.091, stopDifJos: 0.001, stopDifSus: 0.04, verdictStop: "prea-putin", nSub5: 44, sub5Rata: 0.068, sub5Jos: 0.01, sub5Sus: 0.12, verdictP5: "nedecis", tine: 3, necitit: 0, expirat: 1, deschise: 2 });
  const calibrareScurt = { ore: [unul(99), Object.assign(unul(1), { rau: "<script>", verdictStop: "<b>da</b>" }), unul(4), unul(24)], strain: 1 };   /* orizontul străin PRIMUL: tăierea la 3 nu-l scoate singură */
  const p = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: Hh, body: JSON.stringify({ la: 7, boti: {}, calibrareScurt }) }), env });
  assert.equal(p.status, 200, await p.clone().text());
  const g = await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: Hh }), env });
  const c = (await g.json()).mcVerdict.calibrareScurt;
  assert.ok(c && Array.isArray(c.ore), "raportul s-a pierdut pe server");
  assert.deepEqual(c.ore.map((x) => x.ore), [1, 4, 24], "doar 1 / 4 / 24");
  assert.deepEqual(c.ore[1], unul(4));
  assert.equal(c.ore[0].rau, undefined); assert.equal(c.ore[0].verdictStop, null, "verdictul doar din listă"); assert.equal(c.strain, undefined);
  const g0 = await mod.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { method: "POST", headers: Hh, body: JSON.stringify({ la: 8, boti: {} }) }), env });
  assert.equal(g0.status, 200);
  const c0 = (await (await mod.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=mcVerdict", { headers: Hh }), env })).json()).mcVerdict.calibrareScurt;
  assert.equal(c0, null, "fără raport: null");
});

// ---------------------------------------------------------------- pagina botului
const APP = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8").replace(/\r\n/g, "\n");
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.indexOf("\nfunction ", i + 10); return APP.slice(i + 1, j < 0 ? undefined : j); };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const verif = () => { const box = { TextRo: globalThis.TextRo, escapeHtml: esc }; vm.createContext(box); vm.runInContext(fnApp("tbMcScurtVerifHtml"), box); return box.tbMcScurtVerifHtml; };
const RAND = (ore, o) => Object.assign({ ore, n: 0, zile: 0, pStopMed: null, stopRata: null, stopDifJos: null, stopDifSus: null, verdictStop: "putine", nSub5: 0, sub5Rata: null, sub5Jos: null, sub5Sus: null, verdictP5: "putine", tine: 0, necitit: 0, expirat: 0, deschise: 0 }, o || {});
const txt = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
await test("15 pe pagina botului, sub rândul „Pe termen scurt…”: verificarea pe orizontul cu cele mai multe judecate, cu o zecimală, cuvintele doar din verdict", () => {
  const f = verif();
  const r = { ore: [RAND(1, { n: 20, zile: 5 }), RAND(4, { n: 44, zile: 12, pStopMed: 0.07, stopRata: 0.0909, verdictStop: "prea-putin", nSub5: 44, sub5Rata: 0.068, verdictP5: "nedecis", tine: 3 }), RAND(24, { n: 2, zile: 2 })] };
  const h = f(SC, r), t = txt(h);
  assert.match(h, /class="tbSub tbMcScurt tbMcScurtVerif"/, "aceeași așezare ca rândul riscului (display:block), cu clasa ei");
  assert.equal(t, "Verificat pe boții tăi: în 4 h stopul prezis 7,0%, atins 9,1% (44 de judecate pe 12 zile) — prezice prea puțin · sub cele mai proaste 5%: 6,8% (ar trebui ~5%) · 3 închise de tine");
  const r2 = { ore: [RAND(1, { n: 44, zile: 12, pStopMed: 0.031, stopRata: 0.02, verdictStop: "potrivit", nSub5: 40, sub5Rata: 0.05, verdictP5: "prea-mult", expirat: 1, necitit: 2 }), RAND(4, { n: 44, zile: 12 }), RAND(24)] };
  assert.equal(txt(f(SC, r2)), "Verificat pe boții tăi: în 1 h stopul prezis 3,1%, atins 2,0% (44 de judecate pe 12 zile) — se potrivește · sub cele mai proaste 5%: 5,0% (ar trebui ~5%) — prezice prea mult · 1 expirată · 2 închise cu motiv necitit", "la egalitate: orizontul mai scurt");
  const r3 = { ore: [RAND(1, { n: 44, zile: 12, pStopMed: 0.031, stopRata: 0.02, verdictStop: "nedecis", nSub5: 44, sub5Rata: 0.04, verdictP5: "putine" })] };
  assert.equal(txt(f(SC, r3)), "Verificat pe boții tăi: în 1 h stopul prezis 3,1%, atins 2,0% (44 de judecate pe 12 zile) · sub cele mai proaste 5%: 4,0% (ar trebui ~5%)", "fără verdict: fără cuvinte");
});
await test("16 „strâng date” sub 30 de judecate sau sub 10 zile (fără cifre de comparat); nimic fără rândul riscului sau fără nicio notare", () => {
  const f = verif();
  assert.equal(txt(f(SC, { ore: [RAND(1, { n: 12, zile: 4, pStopMed: 0.03, stopRata: 0.5, tine: 1 }), RAND(4, { n: 3, zile: 2 }), RAND(24)] })), "Verificat pe boții tăi: strâng date (12 judecate pe 4 zile, în 1 h) · 1 închisă de tine");
  assert.equal(txt(f(SC, { ore: [RAND(1, { n: 40, zile: 9 })] })), "Verificat pe boții tăi: strâng date (40 de judecate pe 9 zile, în 1 h)");
  assert.equal(txt(f(SC, { ore: [RAND(1, { deschise: 3 }), RAND(4), RAND(24)] })), "Verificat pe boții tăi: strâng date (0 judecate pe 0 zile, în 1 h)", "doar notări deschise: începe numărătoarea");
  assert.equal(f(SC, { ore: [RAND(1), RAND(4), RAND(24)] }), "", "nicio notare: nimic");
  assert.equal(f(SC, null), ""); assert.equal(f([], { ore: [RAND(1, { n: 40, zile: 12 })] }), "", "fără rândul riscului nu are ce verifica"); assert.equal(f(null, { ore: [] }), "");
  assert.doesNotMatch(txt(f(SC, { ore: [RAND(1, { n: 40, zile: 12, nSub5: 0 })] })), /NaN|undefined|null/);
});
await test("17 rândul Monte Carlo: verificarea chiar după rândul riscului, din raportul colectorului (tbMcKv.d.calibrareScurt)", () => {
  assert.match(APP, /tbMcScurtHtml\(mc\.scurt\)\+tbMcScurtVerifHtml\(mc\.scurt,typeof tbMcKv!=="undefined"&&tbMcKv&&tbMcKv\.d\?tbMcKv\.d\.calibrareScurt:null\)/, "apelul lipsește lângă tbMcScurtHtml");
  assert.equal((APP.match(/\nfunction tbMcScurtVerifHtml\(/g) || []).length, 1, "o singură funcție cu numele ăsta");
});

// ---------------------------------------------------------------- colectorul
const COL = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n");
const fnCol = (nume) => { const i = COL.indexOf("\nfunction " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în colector.mjs"); return COL.slice(i + 1, COL.indexOf("\n}\n", i) + 2); };
const colBox = (ritm) => { const scrise = [], box = { ritm, scrise, tineRitm: (k, v) => { ritm[k] = v; scrise.push(k); }, jurnal: () => {}, judecaScurt: MC.judecaScurt, judecaScurtLaInchidere: MC.judecaScurtLaInchidere, Number, Map, String, Array }; vm.createContext(box); vm.runInContext(fnCol("judecaScurtInchis") + "\n" + fnCol("judecaScurtCitire"), box); return box; };
await test("18 colectorul: la închidere judecă notările botului cu motivul (motivInchidere), ora (inchisLa) și totalul final (profitTotal)", () => {
  const ritm = { mcScurt: trei() }, box = colBox(ritm);
  box.judecaScurtInchis("2601", { id: "2601", motivInchidere: "loss_stop", inchisLa: T0 + 30 * MIN, profitTotal: -5 });
  assert.deepEqual(ritm.mcScurt.map((e) => [e.stare, e.stop, e.sub5]), [["judecat", 1, 1], ["judecat", 1, 1], ["judecat", 1, 0]]);
  assert.deepEqual(box.scrise, ["mcScurt"]);
  const r2 = { mcScurt: trei() }, b2 = colBox(r2);
  b2.judecaScurtInchis("2601", { id: "2601", motivInchidere: "loss_stop", inchisLa: T0 + 30 * MIN, profitTotal: null });
  assert.deepEqual(r2.mcScurt.map((e) => [e.stop, e.sub5]), [[1, null], [1, null], [1, null]], "profitTotal null nu e 0");
  const r3 = { mcScurt: trei() }, b3 = colBox(r3); b3.judecaScurtInchis("999", { motivInchidere: "loss_stop", inchisLa: T0, profitTotal: 1 });
  assert.deepEqual(b3.scrise, [], "nimic de judecat ⇒ fără scriere pe disc");
});
await test("19 colectorul: la fiecare citire a listei (bucla de 60 s) judecă notările ajunse la orizont, pe totalul boților pornit; scrie pe disc doar la schimbare", () => {
  const ritm = { mcScurt: trei() }, box = colBox(ritm);
  box.judecaScurtCitire([{ id: "2601", profitTotal: -1.8 }], T0 + 30 * MIN); assert.deepEqual(box.scrise, [], "înainte de orizont nu se scrie");
  box.judecaScurtCitire([{ id: "2601", profitTotal: -1.8 }, { id: "x", activ: false, profitTotal: 1 }], T0 + H + MIN);
  assert.deepEqual(box.scrise, ["mcScurt"]); assert.equal(pe(ritm.mcScurt, 1)[0].sub5, 1);
  const r2 = { mcScurt: trei() }, b2 = colBox(r2); b2.judecaScurtCitire([{ id: "2601", activ: false, profitTotal: -1.8 }], T0 + H + MIN);
  assert.equal(pe(r2.mcScurt, 1)[0].stare, "deschis", "botul oprit nu e „pornit la t+h”");
  const r3 = { mcScurt: trei() }, b3 = colBox(r3); b3.judecaScurtCitire([{ id: "2601", profitTotal: "" }], T0 + H + MIN);
  assert.equal(pe(r3.mcScurt, 1)[0].stare, "deschis", "totalul gol nu e 0");
});
await test("20 colectorul: notarea în tura Monte Carlo (proaspete din tura asta, totalul citit de cel mult 5 min), apelurile la închidere și la citire, raportul în KV", () => {
  assert.match(COL, /import \{[^}]*\bnoteazaScurtBoti\b[^}]*\bjudecaScurt\b[^}]*\bjudecaScurtLaInchidere\b[^}]*\braportScurt\b[^}]*\} from "\.\/lib\/tura-monte-carlo-bot\.mjs"/, "importul");
  const i = COL.indexOf("\nasync function turaMonteCarloBot("), t = COL.slice(i, COL.indexOf("\n}\n", i));
  assert.match(t, /const tStart = Date\.now\(\);[^\n]*\n\s*const r = await turaMonteCarloBotModul\(/, "începutul turei, înainte de socotire");
  assert.match(t, /Date\.now\(\) - ultimiiBotiLa <= 5 \* 60000/, "totalul citit de cel mult 5 min");
  assert.match(t, /noteazaScurtBoti\(js, \{ boti: ultimiiBoti, stareBoti: st\.boti, la: ultimiiBotiLa, deLa: tStart \}\)/);
  assert.match(t, /tineRitm\("mcScurt", js\); calibrareScurt = raportScurt\(js\)/);
  assert.match(t, /trimite\("\/api\/istoric-bot\?action=mcVerdict", \{ la: Date\.now\(\), boti: st\.boti, calibrare: calibrare, calibrareScurt: calibrareScurt \}\)/, "raportul în KV, lângă calibrare");
  assert.match(COL, /judecaMcInchis\(id, x\);[^\n]*\n\s*judecaScurtInchis\(id, x\);/, "la închidere, lângă jurnalul de 7 zile");
  const k = COL.indexOf("// v101.116 (auditul sever, C3): lista goală"), c = COL.lastIndexOf("judecaScurtCitire(", k);
  assert.ok(c > COL.indexOf("judecaScurtInchis(id, x);") && c < k, "citirea se judecă DUPĂ închideri (botul închis cât colectorul era oprit se judecă întâi la închidere)");
  assert.match(COL.slice(c - 40, c + 60), /if \(boti\.length\) judecaScurtCitire\(boti, ultimiiBotiLa\)/, "lista goală nu judecă nimic");
});

// ---------------- revizia independentă (29.10): cenzura „închis de tine” și boții fără stop ----------------
await test("R1 risc CORECT (stop 5% pe 1 h), 70% din boți închiși de tine la o oră oarecare: verificarea NU zice „prezice prea puțin” (închișii de tine intră cu stopul neatins, pe cât au stat deschiși)", () => {
  const rnd = mulberry32(2711); let j = [];
  for (let z = 0; z < 30; z++) for (let k = 0; k < 80; k++) {
    const t = T0 + z * 24 * H + k * 15 * MIN, id = 90000 + z * 100 + k;
    j = fn("noteazaScurt")(j, { id, scurt: [{ ore: 1, pStop: 0.05, pLich: 0, p5: -1 }], total: 0, acum: t, areStop: true });
    const tStop = rnd() < 0.05 ? t + rnd() * H : null, tTu = rnd() < 0.7 ? t + rnd() * H : null;
    if (tStop !== null && (tTu === null || tStop < tTu)) j = fn("judecaScurtLaInchidere")(j, String(id), { total: -2, motiv: "loss_stop", inchisLa: tStop });
    else if (tTu !== null) j = fn("judecaScurtLaInchidere")(j, String(id), { total: 0.1, motiv: "user_cancel", inchisLa: tTu });
    else { const m = new Map([[String(id), 0.2]]); j = fn("judecaScurt")(j, m, t + H + MIN); }
  }
  const r = fn("raportScurt")(j).ore.find((o) => o.ore === 1);
  assert.notEqual(r.verdictStop, "prea-putin", "fals „prezice prea puțin”: atins " + r.stopRata + " vs prezis " + r.pStopMed + " [" + r.stopDifJos + "; " + r.stopDifSus + "]");
  assert.ok(r.tine > 1200, "închișii de tine trebuie numărați (" + r.tine + ")");
});
await test("R2 boții FĂRĂ stop: nu intră în scorul stopului (prezis 0 = atins 0 nu e „se potrivește”); „sub cele mai proaste 5%” îi numără", () => {
  let j = [];
  for (let z = 0; z < 12; z++) for (let k = 0; k < 3; k++) {
    const t = T0 + z * 24 * H + k * H, id = 7000 + z * 10 + k;
    j = fn("noteazaScurt")(j, { id, scurt: [{ ore: 1, pStop: 0, pLich: 0, p5: -1 }], total: 0, acum: t, areStop: false });
    j = fn("judecaScurt")(j, new Map([[String(id), 0.1]]), t + H + MIN);
  }
  const r = fn("raportScurt")(j).ore.find((o) => o.ore === 1);
  assert.notEqual(r.verdictStop, "potrivit", "„se potrivește” gol pe boți fără stop");
  assert.equal(r.pStopMed, null, "boții fără stop nu au ce prezice la stop");
  assert.equal(r.nSub5, 36, "„sub p5” îi numără");
});
await test("R3 cifrele „ca bot pornit acum” (simularea n-a putut relua botul real) nu se notează", () => {
  const b = { id: 5501, activ: true, profitTotal: 1 };
  const j = fn("noteazaScurtBoti")([], { boti: [b], stareBoti: { "5501": { ultima: T0, text: "ca bot pornit acum (Reluarea…): Stopul e în zgomot", scurt: SC } }, la: T0, deLa: T0 - MIN });
  assert.equal(j.length, 0, "notate cifrele unui bot nou");
});

console.log(picate ? `\n${picate} PICA din ${teste}` : `\ntoate ${teste} ok`);
process.exit(picate ? 1 : 0);
