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

// ---------- (3) stopul în PROCENTE în Monte Carlo: „totalul ≤ r · investiție” pe drum, nu prețul serverului ----------
// bare sintetice de 15M: mers aleator cu mulberry32 (lecția: niciodată LCG)
function bareSint(n, seed, vol = 0.004, drift = 0, p0 = 100) {
  const rnd = M.generator(seed), out = []; let p = p0, t = Date.UTC(2026, 8, 1);
  for (let i = 0; i < n; i++) {
    const z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const o = p, c = p * Math.exp(drift + vol * z);
    out.push({ t, o, h: Math.max(o, c) * (1 + Math.abs(vol * 0.5 * rnd())), l: Math.min(o, c) * (1 - Math.abs(vol * 0.5 * rnd())), c, v: 1 }); p = c; t += 900000;
  }
  return out;
}
const cadere = (de, la, n) => Array.from({ length: n }, (_, i) => { const o = de + (la - de) * i / n, c = de + (la - de) * (i + 1) / n; return { t: i * 9e5, o, h: o, l: c, c, v: 1 }; });
const ST3 = { dir: "long", jos: 80, sus: 110, grile: 30, levier: 3, tip: "aritmetic" };
await test("(3) GridProba.simuleaza: stopul în procente (−10%) iese când totalul CU grilele de pe drum ajunge la −10%", () => {
  const b = cadere(100, 70, 120);
  const r = GP.simuleaza(b, 0, b.length, { ...ST3, stopRaport: -0.1 });
  assert.equal(r.oprit, true); assert.equal(r.lichidat, false);
  assert.ok(r.net <= -0.099 && r.net >= -0.106, "net " + r.net);
  // prețul serverului (poziția de la pornire, fără grilele de pe drum) ⇒ ieșirea mult mai jos și pierderea peste −10%
  const r0 = GP.simuleaza(b, 0, 1, ST3), q = 3 / 30 * [...Array(30).keys()].filter((k) => 80 + k + 1 > 100).reduce((s, k) => s + 1 / (80 + k), 0);
  const pServer = 100 + (-0.1 - r0.net) / q, rf = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: pServer } });
  assert.ok(rf.net < -0.12, "la prețul serverului totalul e mult sub −10%: " + rf.net + " (preț " + pServer + ")");
});
await test("(3) fără stopRaport, simulatorul dă exact aceleași cifre ca înainte", () => {
  const b = bareSint(96 * 3, 5);
  const a = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: 78, sus: 113 } }), c = GP.simuleaza(b, 0, b.length, { ...ST3, stop: { jos: 78, sus: 113 }, stopRaport: null });
  assert.deepEqual(c, a);
});
const BOT3 = { id: "R", baza: "XYZ.PERP", directie: "long", activ: true, investit: 100, levier: 3, pretCurent: 100, gridJos: 80, gridSus: 110,
  opritorPierdereActiv: true, opritorPierdereTip: "raport", opritorPierdereRaport: -0.1, opritorPierdere: 91, brut: { buOrderData: { row: 31, gridType: "arithmetic" } } };
await test("(3) setariDinBot: stopul în procente ajunge în setări ca raport (prețul serverului rămâne doar de afișat)", () => {
  const d = GS.setariDinBot(BOT3);
  assert.equal(d.st.stopRaport, -0.1);
  assert.deepEqual(d.st.stop, { jos: 91 });
  const pret = GS.setariDinBot({ ...BOT3, opritorPierdereTip: "pret" });
  assert.equal(pret.st.stopRaport, undefined);
});
await test("(3) Simulatorul și Monte Carlo pe drumuri: cu raportul, cel mai rău drum oprit nu trece mult de −10 USDT; cu prețul serverului, da", () => {
  const b = bareSint(96 * 20, 7, 0.006);
  const P0 = b[b.length - 1].c, k = P0 / 100, st = { ...GS.setariDinBot(BOT3).st, jos: 80 * k, sus: 110 * k, suma: 100 };
  // prețul serverului pentru botul pornit acum: poziția de la pornire (grilele 100–110, câte 3/30 din marjă) fără grilele de pe drum
  let Ql = 0; for (let i = 20; i < 30; i++) Ql += 0.1 / ((80 + i) * k);
  st.stop = { jos: P0 + (-0.1 + 0.0005 * Ql * P0) / Ql };
  const cu = GS.simuleaza(b, st, { n: 200, seed: 3, zile: 7, orizonturi: [7] }).orizonturi[0];
  const fara = GS.simuleaza(b, { ...st, stopRaport: undefined }, { n: 200, seed: 3, zile: 7, orizonturi: [7] }).orizonturi[0];
  assert.ok(cu.pStop > fara.pStop, "raportul se atinge mai des decât prețul serverului: " + cu.pStop + " / " + fara.pStop);
  assert.ok(cu.p5 >= -11.5, "coada cu raportul ≈ −10: " + cu.p5);
  const mc = M.grid(b, { ...st }, { n: 200, seed: 3, zile: 7, GridProba: GP });
  const mc0 = M.grid(b, { ...st, stopRaport: undefined }, { n: 200, seed: 3, zile: 7, GridProba: GP });
  assert.ok(mc.pStop > mc0.pStop, "Monte Carlo: " + mc.pStop + " / " + mc0.pStop);
  assert.ok(mc.p5 >= -11.5, "Monte Carlo coada: " + mc.p5);
});

// ---------- (4) un singur prag de lichidări, în motor ----------
await test("(4) GridSim.LICHIDARI_ACCEPTATE = 0 și lichidareAcceptata: orice lichidare pe drumuri ⇒ nu", () => {
  assert.equal(GS.LICHIDARI_ACCEPTATE, 0);
  assert.equal(GS.lichidareAcceptata(0), true);
  assert.equal(GS.lichidareAcceptata(0.01), false);
  assert.equal(GS.lichidareAcceptata(null), false);
  assert.match(citeste("public", "lib", "grid-sim.js"), /else if \(!lichidareAcceptata\(o\.pLich\)\) faCe = /);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exitCode = picate ? 1 : 0;
