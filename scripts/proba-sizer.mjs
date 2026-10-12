// Proba planului tău în Poartă (v100.169, 12.10.2026, direcția lui „o aplicație și atât”, pasul 4.6):
// din pagina market-events a premarket_scanner se mută DOAR Sizerul (el: „Mut doar Sizerul”, apoi „Completez Poarta”, „ok” pe machetă).
// Radarul avea deja „Cât cumperi” (lei, contul T212, 1 % risc, plafon 20 %, curs, comision), dar doar pe stopul CALCULAT.
// Acum, la „am deja un plan în minte”: intrarea, stopul (sau −X %), ținta și riscul % din cont ale LUI; câmpurile goale rămân calculate;
// peste 1 % risc se avertizează, nu se refuză; riscul arătat e cel REAL (după plafonul de 20 %). Fără short (T212 acțiuni = doar long).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nPlanul tău în Poartă (Sizerul) · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "actiuni-semnale.js"), ctx);
const AS = ctx.ActiuniSemnale;
const J = (x) => JSON.parse(JSON.stringify(x));
const aprox = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), (m || "") + " " + a + " ≠ " + b);

// fx ca în pagină: dolari pe un leu (t212Fx); 0,25 ⇒ 1 $ = 4 lei
const FX = 0.25, CONT = 30000;

await test("marime: fără riscPct rămâne exact ca înainte (1 % din cont)", () => {
  const m = AS.marime({ intrare: 100, stop: 90, cont: CONT, fx: FX });
  aprox(m.risc, 300, 1e-6, "riscul în lei"); aprox(m.bucati, 7.5, 1e-4, "bucăți"); assert.equal(m.plafonat, false);
});
await test("marime: riscPct 0,015 ⇒ 1,5 % din cont și riscul real în %", () => {
  const m = AS.marime({ intrare: 100, stop: 90, cont: CONT, fx: FX, riscPct: 0.015 });
  aprox(m.risc, 450, 1e-6, "riscul în lei"); aprox(m.riscPctReal, 0.015, 1e-9, "riscul real");
});
await test("marime: plafonul de 20 % scade riscul real sub cel cerut", () => {
  const m = AS.marime({ intrare: 100, stop: 98, cont: CONT, fx: FX, riscPct: 0.015 });
  assert.equal(m.plafonat, true); aprox(m.suma, 6000, 1e-6, "suma tăiată"); assert.ok(m.riscPctReal < 0.015, "riscul real " + m.riscPctReal);
  aprox(m.riscPctReal, 0.004, 1e-9, "6000 lei × 2 % = 120 lei = 0,4 %");
});

const CALC = { intrare: 101, stop: 95, tinta: 113 };
await test("planulMeu: planul complet — bucăți, câștig/risc, câștigul la țintă, avertizarea peste 1 %", () => {
  const r = J(AS.planulMeu({ intrare: 100, stop: 92, tinta: 120, riscPct: 1.5, cont: CONT, fx: FX, calc: CALC }));
  assert.equal(r.eroare, null); assert.deepEqual(r.ale, { intrare: true, stop: true, tinta: true, risc: true });
  assert.equal(r.intrare, 100); assert.equal(r.stop, 92); assert.equal(r.tinta, 120);
  aprox(r.m.risc, 450, 1e-6, "riscul în lei"); aprox(r.rr, 2.5, 1e-9, "câștig/risc"); aprox(r.castig, r.m.bucati * 20 / FX, 1e-6, "câștigul la țintă");
  assert.equal(r.avert.length, 1); assert.match(r.avert[0], /1,5% din cont/); assert.match(r.avert[0], /peste regula ta de 1%/); assert.match(r.avert[0], /3 stopuri la rând/);
});
await test("planulMeu: câmpurile goale rămân pe valorile calculate, riscul gol = 1 %, fără avertizare", () => {
  const r = J(AS.planulMeu({ stop: 93, cont: CONT, fx: FX, calc: CALC }));
  assert.deepEqual(r.ale, { intrare: false, stop: true, tinta: false, risc: false });
  assert.equal(r.intrare, 101); assert.equal(r.tinta, 113); assert.equal(r.riscPct, 1); assert.deepEqual(r.avert, []);
  aprox(r.m.risc, 300, 1e-6, "1 % din cont");
});
await test("planulMeu: stopul peste intrare ⇒ eroare, fără mărime", () => {
  const r = J(AS.planulMeu({ intrare: 100, stop: 100, cont: CONT, fx: FX, calc: CALC }));
  assert.match(r.eroare, /Stopul trebuie să fie sub intrare/); assert.equal(r.m, null);
});
await test("planulMeu: ținta sub intrare ⇒ avertizare, fără câștig/risc, mărimea rămâne", () => {
  const r = J(AS.planulMeu({ intrare: 100, stop: 92, tinta: 99, cont: CONT, fx: FX, calc: CALC }));
  assert.equal(r.eroare, null); assert.ok(r.m && r.m.bucati > 0); assert.equal(r.rr, null); assert.equal(r.castig, null);
  assert.ok(r.avert.some((a) => /Ținta trebuie să fie peste intrare/.test(a)), JSON.stringify(r.avert));
});
await test("planulMeu: plafonul de 20 % ⇒ textul spune riscul REAL, nu cel cerut", () => {
  const r = J(AS.planulMeu({ intrare: 100, stop: 98, riscPct: 1.5, cont: CONT, fx: FX, calc: CALC }));
  assert.equal(r.m.plafonat, true); aprox(r.riscReal, 0.004, 1e-9, "riscul real");
});
await test("planulMeu: fără cont sau fără stop ⇒ null (pagina scrie „citește întâi contul”)", () => {
  assert.equal(AS.planulMeu({ intrare: 100, stop: 92, cont: 0, fx: FX, calc: CALC }), null);
  assert.equal(AS.planulMeu({ intrare: 100, cont: CONT, fx: FX, calc: {} }), null);
});

const html = citeste("public", "index.html"), ecran = citeste("public", "lib", "t212-ecran.js");
await test("pagina: „am deja un plan în minte” cu intrare, stop, −X %, țintă, risc %", () => {
  assert.ok(html.includes("<summary>am deja un plan în minte</summary>"), "lipsește titlul nou");
  for (const id of ["t212PIntrare", "t212PStop", "t212PTrail", "t212PTinta", "t212PRisc"]) assert.ok(html.includes('id="' + id + '"'), "lipsește " + id);
  assert.ok(!/SHORT/.test(html.slice(html.indexOf("t212StopulMeu"), html.indexOf("t212PoartaRez"))), "fără short");
});
await test("Poarta citește câmpurile noi și „Cât cumperi” merge pe planulMeu", () => {
  for (const id of ["t212PIntrare", "t212PTinta", "t212PRisc"]) assert.ok(ecran.includes('"' + id + '"'), "t212Poarta nu citește " + id);
  assert.match(ecran, /ActiuniSemnale\.planulMeu\(/); assert.match(ecran, /pe planul tău/);
});
await test("o singură sursă pentru suma propusă: t212MarimePoarta folosește planul când e scris", () => {
  const f = ecran.slice(ecran.indexOf("function t212MarimePoarta"), ecran.indexOf("function t212PreturiPoarta"));
  assert.match(f, /planulMeu|t212PlanPoarta/);
});

// v100.172 (minorele din revizia Opus pe v100.163–170)
await test("v100.172 planulMeu: fără stop scris și intrarea lui sub stopul CALCULAT ⇒ mesajul spune asta și cere stopul lui (nu „stopul sub intrare”)", () => {
  const r = J(AS.planulMeu({ intrare: 90, cont: CONT, fx: FX, calc: CALC }));
  assert.equal(r.m, null); assert.doesNotMatch(r.eroare, /Stopul trebuie să fie sub intrare/);
  assert.match(r.eroare, /sub stopul calculat/); assert.match(r.eroare, /scrie/i);
});
await test("v100.172 „un trade ca ăsta” judecă trade-ul din planul LUI (intrarea, stopul și ținta lui), nu prețurile calculate", () => {
  const c2 = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, localStorage: { getItem: () => null, setItem() {} } };
  c2.window = c2; c2.globalThis = c2; vm.createContext(c2);
  vm.runInContext(citeste("public", "lib", "actiuni-semnale.js"), c2);
  vm.runInContext(citeste("public", "lib", "t212-ecran.js"), c2);
  let primit = null;
  c2.t212ReteaHtml = (o) => { primit = o; return ""; }; c2.t212Fx = () => FX; c2.escapeHtml = (s) => String(s);
  const p = { niv: { nivel: "ok", intrare: { pret: 101 }, stop: 95, tinta: 113, proba: {} }, st: { pret: 102 }, tot: CONT, baza4: 101, stopP: { stop: 95 }, ticker: "X_US_EQ", prof: null, prob: null, bareZi: [],
    planMeu: { scris: true, intrare: 100, stop: 92, tinta: 130, riscPct: 1 } };
  c2.t212ProfilPoarta(p);
  assert.ok(primit, "t212ReteaHtml nechemat"); assert.equal(primit.pret, 100); assert.equal(primit.stop, 92); assert.equal(primit.tinta, 130);
  primit = null; c2.t212ProfilPoarta(Object.assign({}, p, { planMeu: null }));
  assert.equal(primit.pret, 101); assert.equal(primit.stop, 95); assert.equal(primit.tinta, 113);
});

console.log(`\n${teste - picate}/${teste} probe trecute`);
if (picate) process.exit(1);
