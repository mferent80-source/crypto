// Probele auditului din 19.10.2026 (el: „fă tot”), felia LOGICA DE TRADING (public/lib: semnale, alerte, grid, statistici).
// (1) stopul propus ÎN grid (TAKE 05.10: long 5×, grid 0,05330–0,07224, plan −6,5 ⇒ prețul planului ~0,0614, în grid) · (2) „Cât investesc?”
// la levierul ales · (3) grilele reduse la minimul pe ordin · (4) Monte Carlo „Aș opri” simetric · (5) stopul din MAE pe net · (6) banda pe
// net + Wilson · (7) „dovedit” pe un prag de număr · (8) reveniri „mai bine / mai slab” cu eroarea standard · (9) gridul îngust = un singur
// bloc · (10) reparațiile mici. Depozit PUBLIC ⇒ cifre construite (forma botului TAKE din proba-v100101).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
globalThis.GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const G = globalThis.GridCalcul;
globalThis.GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 600)}`); }); }
console.log("\naudit 19.10 · logica de trading · proba\n");

// ---------- (1) stopul propus ÎN grid ----------
const TAKE = (o) => ({ id: "B", baza: "TAKE.PERP", directie: "long", activ: true, investit: 40, levier: 5, pretCurent: 0.06505, pretDeschidere: 0.066, pozitie: 1070, profitNet: -0.1, profitTotal: -1,
  gridJos: 0.0533, gridSus: 0.07224, pnlNerealizatSigur: true, brut: { buOrderData: { row: 50, gridType: "geometric", perVolume: "72" } }, ...o });
const cuStop = (op) => TAKE({ opritorPierdereActiv: true, opritorPierdere: op });
const cartelaStop = (b, extra) => { const z = TE.dacaInchizi(b); return SB.acumConcret({ bot: b, fisa: null, zero: z, costuri: null, plan: TE.planStare(b, { minus: 6.5 }, {}, 0), acum: 0, ...extra }).find((x) => x.cod === "stop"); };
const alertaStop = (b) => { const z = TE.dacaInchizi(b); return A.reguli(b, { plan: TE.planStare(b, { minus: 6.5 }, {}, 0), pretZero: z.pretZero }, {})["plan-stop"]; };
const PRET_PLAN = /0\.061\d*/;   // prețul planului (~0,0614), în grid
const totTxt = (c) => [c.act, c.deCe, c.text, c.mic].join(" | ");

await test("(1) planStare: prețul planului TAKE cade în grid (~0,0614) și se spune pe față (planInGrid), cu stopul de dincolo de marginea de jos", () => {
  const m = TE.planStare(TAKE(), { minus: 6.5 }, {}, 0).minus;
  assert.ok(m.opritorPlan > 0.0533 && m.opritorPlan < 0.07224, String(m.opritorPlan));
  assert.equal(m.planInGrid, true);
  assert.ok(m.stopAfara > 0 && m.stopAfara < 0.0533, "stopul propus stă sub grid: " + m.stopAfara);
  assert.ok(m.laStopAfara < -6.5 && m.laStopAfara < m.laMargine, "sub grid pierzi mai mult decât la margine: " + m.laStopAfara + " / " + m.laMargine);
  const larg = TE.planStare(TAKE({ gridJos: 0.0635 }), { minus: 6.5 }, {}, 0).minus;
  assert.equal(larg.planInGrid, false, "gridul strâmt (0,0635): planul cade sub grid");
});
await test("(1) cartela Stop, fără stop: NU „Aș pune stopul la 0,0614”; propune sub grid sau închiderea la zero, cu pierderea la marginea de jos față de plan", () => {
  const c = cartelaStop(TAKE());
  assert.ok(!/Aș (pune|muta) stopul la 0\.061/.test(totTxt(c)), totTxt(c));
  assert.ok(!/în procente: −16/.test(c.act), "procentul planului e același preț din grid: " + c.act);
  assert.match(c.act, /^Aș /); assert.ok(c.act.length <= 110, c.act.length + ": " + c.act);
  assert.match(c.act, /sub grid, la 0\.052\d+/); assert.match(c.act, /la zero \(0\.0662\d*\)/);
  assert.match(c.deCe, /cade în grid, la 0\.061\d+/); assert.match(c.deCe, /marginea de jos pierzi ≈ 28,2 USDT/); assert.ok(c.deCe.length <= 160, c.deCe.length + ": " + c.deCe);
  assert.match(c.text, /botul următor, grid mai îngust cât planul la 5×, sau același grid la levier 1×/);
  assert.ok(c.pretPropus > 0 && c.pretPropus < 0.0533, "stopul propus (și linia de pe grafic) stă sub grid: " + c.pretPropus);
});
await test("(1) cartela Stop, stopul LUI în grid (0,06097, atins ≈ planul): NU „pus” verde, ci „stop în grid” (warn) și ce parte a gridului moare", () => {
  const c = cartelaStop(cuStop(0.06097));
  assert.notEqual(c.tag.t, "pus"); assert.deepEqual(c.tag, { t: "stop în grid", c: "warn" });
  assert.match(c.deCe, /sub el, \d+ din 49 de grile nu lucrează/); assert.ok(c.deCe.length <= 160, c.deCe.length + ": " + c.deCe);
  assert.match(c.act, /^Aș /); assert.ok(c.act.length <= 110, c.act);
});
await test("(1) cartela Stop, stopul LUI departe (0,045, ≈ −40): „peste plan” rămâne roșu, dar NU „Aș muta stopul la 0,0614”", () => {
  const c = cartelaStop(cuStop(0.045));
  assert.deepEqual(c.tag, { t: "peste plan", c: "bad" });
  assert.ok(!/stopul la 0\.061/.test(c.act), c.act); assert.match(c.act, /sub grid/); assert.ok(c.act.length <= 110, c.act);
  assert.match(c.deCe, /te costă ≈ 40,0 USDT, nu 6,5/); assert.ok(c.deCe.length <= 160, c.deCe);
});
await test("(1) control: cu planul SUB grid (grid strâmt 0,0635), propunerea „Aș pune stopul la <prețul planului>” rămâne", () => {
  const b = TAKE({ gridJos: 0.0635 }), c = cartelaStop(b), m = TE.planStare(b, { minus: 6.5 }, {}, 0).minus;
  assert.ok(m.opritorPlan < 0.0635, String(m.opritorPlan));
  assert.match(c.act, /^Aș pune stopul la 0\.0\d+/, c.act);
});
await test("(1) alerta „plan-stop” fără stop: tot critică, dar nu cere stopul la 0,0614; spune că planul cade în grid și cât pierzi la margine", () => {
  const a = alertaStop(TAKE());
  assert.equal(a.nivel, "critic");
  assert.ok(!PRET_PLAN.test(a.mesaj.split("\n")[1]), a.mesaj);
  assert.match(a.mesaj, /cade în grid/); assert.match(a.mesaj, /≈ 28,2 USDT/);
  const [l1, l2] = a.mesaj.split("\n"); assert.ok(l1.length <= 160, l1.length + ": " + l1); assert.match(l2, /^👉 Aș /); assert.ok(l2.length - 3 <= 110, l2);
});
await test("(1) alerta „plan-stop” cu stopul departe (0,045): critică (≥ 2× planul), fără „Aș muta stopul în Pionex la 0,0614”", () => {
  const a = alertaStop(cuStop(0.045));
  assert.equal(a.nivel, "critic");
  assert.ok(!/stopul în Pionex la 0\.061/.test(a.mesaj), a.mesaj); assert.match(a.mesaj, /sub grid/); assert.match(a.mesaj, /cade în grid/);
  const [l1, l2] = a.mesaj.split("\n"); assert.ok(l1.length <= 160, l1.length + ": " + l1); assert.ok(l2.length - 3 <= 110, l2);
});
await test("(1) alerta „plan-stop” cu stopul LUI în grid (0,06097): spune ce parte a gridului moare", () => {
  const a = alertaStop(cuStop(0.06097));
  assert.match(a.mesaj, /stă în grid/); assert.match(a.mesaj, /\d+ din 49 de grile/);
});
await test("(1) simulatorul spune la fel: stopul în grid ⇒ ce parte moare și stopul sub grid", () => {
  const s = citeste("public", "lib", "grid-sim-ecran.js");
  assert.ok(!/e ÎN grid/.test(s), "textul vechi cu majuscule");
  assert.match(s, /stă în grid \(/); assert.match(s, /nu mai lucrează/);
});

console.log(`\n${teste - picate}/${teste} probe trecute${picate ? `, ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
