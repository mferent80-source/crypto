// Probele auditului sever din 23.10.2026, felia LOGICA DE TRADING (public/lib: semnale, alerte, Monte Carlo, fișa, statistici, texte).
// Fiecare punct al listei are aici testul care pica înainte de reparație. Cifrele sunt construite (depozit public).
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
const GP = globalThis.GridProba;
globalThis.MonteSimbol = new Function(`${lib("monte-simbol.js")}; return MonteSimbol;`)();
const M = globalThis.MonteSimbol;
globalThis.GridSim = new Function(`${lib("grid-sim.js")}; return GridSim;`)();
const GS = globalThis.GridSim;
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
globalThis.TabloExtra = TE;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
globalThis.SemnaleBot = SB;
const A = new Function(`${lib("alerte.js")}; return Alerte;`)();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); }); }
console.log("\naudit 23.10 · logica de trading · proba\n");

// ---------- (1) stopul „la zero” pe un bot pe PLUS cade în grid ----------
// long 3×, grid 90–110 aritmetic, 21 de linii (20 de intervale); prețul a urcat la 106, botul e pe plus (+7)
const BOT1 = (o) => ({ id: "X", baza: "XYZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: 106, pretDeschidere: 101,
  pozitie: 0.6, profitNet: 4, profitTotal: 7, gridJos: 90, gridSus: 110, pnlNerealizatSigur: true, pornitLa: Date.now() - 3 * 86400000,
  brut: { buOrderData: { row: 21, gridType: "arithmetic", perVolume: "0.15" } }, ...o });
const cartela = (b) => SB.acumConcret({ bot: b, fisa: null, zero: TE.dacaInchizi(b), costuri: null, plan: null, acum: Date.now() }).find((x) => x.cod === "stop");
await test("(1) zero-ul pe plus cade în grid ⇒ cartela spune câte grile mor și nu-l mai dă ca reparație simplă", () => {
  const z = TE.dacaInchizi(BOT1());
  assert.ok(z.pretZero > 90 && z.pretZero < 110, "premisa: zero-ul e în grid (" + z.pretZero + ")");
  const c = cartela(BOT1());
  const tot = [c.act, c.deCe, c.text].join(" | ");
  assert.match(tot, /10 din 20 de grile/, tot);
  assert.match(c.deCe, /cade în grid/);
  assert.equal(c.tag.t, "zero în grid");
  assert.equal(c.tag.c, "warn");
  assert.match(c.act, /^Aș /);
  assert.ok(c.act.length <= 110 && c.deCe.length <= 160, c.act.length + " / " + c.deCe.length);
  assert.match(c.deCe, /sub gridul de jos \(90\)[^]*totalul e ≈ [−+]\d/, "alternativa: dincolo de margine, cu banii de acolo");
});
await test("(1) zero-ul pe plus SUB grid (dincolo de margine) ⇒ rămâne propunerea de azi, fără grile moarte", () => {
  // poziție mică, profit mare: zero-ul coboară sub 90
  const b = BOT1({ pozitie: 0.05, profitNet: 30, profitTotal: 30.8, pretCurent: 106 });
  const z = TE.dacaInchizi(b);
  if (!(z.pretZero < 90)) throw new Error("premisa: zero sub grid (" + z.pretZero + ")");
  const c = cartela(b);
  assert.match(c.tag.t, /la zero/);
  assert.doesNotMatch([c.act, c.deCe].join(" "), /din 20 de grile/);
});
await test("(1) „mișcarea e cu botul” (pasiCuBotul) spune și ea grilele tăiate de stopul la zero", () => {
  const b = BOT1(), z = TE.dacaInchizi(b);
  const pc = SB.pasiCuBotul(b, "long", z);
  assert.match(pc.faCe, /zero-ul botului \([\d.]+\), știind că taie 10 din 20 de grile\./);
  assert.ok(pc.faCe.length <= 110, pc.faCe);
});
await test("(1) ținta devine podea: podeaua din grid ⇒ semaforul și alerta spun grilele tăiate", () => {
  const b = BOT1();
  const plan = { atins: ["plus"], plus: { prag: 5, podea: 104, opritorPastreaza: null, urca: null } };
  const s = SB.semafor({ bot: b, fisa: { regim: { r4h: 1, r24h: 1, miscare: false } }, plan });
  assert.equal(s.cod, "podea");
  assert.match(s.deCe, /^Cade în grid, sub el 14 din 20 de grile nu lucrează; /, s.deCe);
  assert.ok(s.deCe.length <= 160, s.deCe.length);
  const al = A.reguli(b, { plan }, {}).plan;
  assert.match(al.mesaj, /👉 Aș muta stopul din Pionex la 104\.00: câștigul rămâne, dar sub el 14 din 20 de grile nu lucrează\./, al.mesaj);
});
await test("(1) „poți urca stopul” (perna de 1,5%) spune grilele tăiate", () => {
  const b = BOT1();
  const plan = { atins: ["plus"], plus: { prag: 2, urca: { pret: 104.41, pastrezi: 6, perna: 0.015, opritor: null, opritorPastreaza: null } } };
  const r = A.podeaUrca(b, plan, { regim: null }, null);
  assert.equal(r.mesaje.length, 1);
  assert.match(r.mesaje[0].mesaj, /👉 Aș muta stopul în Pionex la 104\.41; sub el 14 din 20 de grile nu mai lucrează\./, r.mesaje[0].mesaj);
});

// ---------- (2) „botul a ajuns pe zero” doar la traversare ----------
const BOT2 = (p) => ({ id: "Z", baza: "ZZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: p, gridJos: 90, gridSus: 110, pornitLa: Date.now() - 5 * 86400000 });
await test("(2) long pe plus departe de zero (106 față de zero 99,6) ⇒ nicio alertă „a ajuns pe zero”", () => {
  const r = A.reguli(BOT2(106), { pretZero: 99.6 }, {});
  assert.notEqual(r["p-zero"] && r["p-zero"].nivel, "atentie");
});
await test("(2) prețul abia a trecut de zero (+0,3%) ⇒ alerta pleacă; în alertă rămâne până la +1%, apoi tace", () => {
  assert.equal(A.reguli(BOT2(99.9), { pretZero: 99.6 }, {})["p-zero"].nivel, "atentie");
  const fost = { "p-zero": { nivel: "atentie", la: 1 } };
  assert.equal(A.reguli(BOT2(100.4), { pretZero: 99.6 }, fost)["p-zero"].nivel, "atentie", "în banda de ieșire (sub +1%)");
  assert.equal(A.reguli(BOT2(101), { pretZero: 99.6 }, fost)["p-zero"].nivel, "ok", "peste +1% iese");
  assert.equal(A.reguli(BOT2(99.4), { pretZero: 99.6 }, fost)["p-zero"].nivel, "atentie", "histerezisul de jos rămâne (−0,3%)");
});
await test("(2) short: oglinda (zero 100, prețul 99,8 ⇒ alertă; 97 ⇒ nu)", () => {
  const s = (p) => ({ ...BOT2(p), directie: "short" });
  assert.equal(A.reguli(s(99.8), { pretZero: 100 }, {})["p-zero"].nivel, "atentie");
  assert.notEqual(A.reguli(s(97), { pretZero: 100 }, {})["p-zero"].nivel, "atentie");
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
