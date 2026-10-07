// Proba v100.134 (07.10, el: „să pun valori din grid ca la TradingView și să calculeze el probabilitățile de câștig” → spec
// docs/superpowers/specs/2026-10-07-simulator-grid-design.md): (a) simulatorul gridului cu tipul aritmetic, traseul și funding-ul,
// implicit NESCHIMBAT; (b) GridSim: codul GRID-FISA dus-întors, setările din botul Pionex; (c) GridSim.simuleaza pe 1 / 3 / 7 / 14 zile,
// planul, botul care rulează reluat pe barele reale; (d) verdictul regulă cu regulă; (e) ecranul; (f) pagina + versiunea.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const exista = (...p) => fs.existsSync(path.join(RAD, ...p));
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
for (const f of ["grid-sim.js", "grid-sim-ecran.js"]) if (exista("public", "lib", f)) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, GC = G.GridCalcul, GP = G.GridProba, TE = G.TabloExtra, M = G.MonteSimbol, GS = G.GridSim;
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.134 · Simulator grid · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.UTC(2026, 8, 1) + i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare15(20, 3), ST = { jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 } };
const bot = (o) => Object.assign({ id: "2408", activ: true, baza: "PONS.PERP", simbolPionex: "PONS_USDT_PERP", directie: "long", gridJos: 0.38, gridSus: 0.44, levier: 3, investit: 47.83, opritorPierdereActiv: true, opritorPierdere: 0.36, opritorProfitActiv: true, opritorProfit: 0.47, lichidareJos: 0.3, lichidareSus: null, pornitLa: 1791301681464, profitNet: 0.67, pozitie: 120, pretDeschidere: 0.41, pretCurent: 0.40, pnlNerealizatSigur: true, brut: { buOrderData: { row: 30, gridType: "arithmetic" } } }, o);

// ---------------- (a) simulatorul ----------------
await test("(a1) GridCalcul.niveluriArit: N+1 linii la distanțe egale, capetele exacte", () => {
  const v = GC.niveluriArit(0.4, 0.5, 10); assert.equal(v.length, 11); assert.equal(v[0], 0.4); assert.equal(v[10], 0.5);
  for (let k = 1; k <= 10; k++) assert.ok(Math.abs(v[k] - v[k - 1] - 0.01) < 1e-12);
});
await test("(a2) simuleaza implicit NESCHIMBAT: aceeași cifră ca înainte pe aceleași bare (geometric, fără traseu, fără funding)", () => {
  const r = GP.simuleaza(B, 0, 672, ST);
  assert.equal(r.net, 0.035702746963977045); assert.equal(r.perechi, 20); assert.equal(r.iesiri, 18); assert.equal(r.oprit, false); assert.equal(r.bare, 672);
  assert.equal(GP.simuleaza(B, 0, 672, Object.assign({}, ST, { tip: "geometric" })).net, r.net);
  assert.equal(GP.simuleaza(B, 0, 672, { jos: 0.98, sus: 1.02, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: 1.05 } }).net, -0.07795654398882168);
  assert.equal(r.funding, 0); assert.equal(r.traseu, undefined);
});
await test("(a3) tipul aritmetic: pe un grid lat altă cifră decât geometric (liniile stau altundeva), pe unul îngust aproape la fel", () => {
  const lat = { jos: 0.5, sus: 1.5, grile: 10, levier: 2, dir: "long", suma: 50, stop: null };
  const g = GP.simuleaza(B, 0, 672, lat).net, a = GP.simuleaza(B, 0, 672, Object.assign({}, lat, { tip: "aritmetic" })).net;
  assert.equal(g, 0.006515978992602952); assert.ok(Math.abs(a - g) > 1e-6, "aritmetic ≠ geometric: " + a + " vs " + g);
  const ng = GC.niveluri(0.98, 1.02, 10), na = GC.niveluriArit(0.98, 1.02, 10);
  for (let k = 0; k <= 10; k++) assert.ok(Math.abs(na[k] / ng[k] - 1) < 0.0005, "grid îngust: liniile aproape la fel");
});
await test("(a4) traseul: o valoare pe bară, ultimul net = r.net; la stop se oprește la bara stopului; la lichidare ultimul = −1; perechi / ieșiri cumulate", () => {
  const r = GP.simuleaza(B, 0, 672, ST, { traseu: true });
  assert.equal(r.traseu.net.length, 672); assert.equal(r.traseu.net[671], r.net); assert.equal(r.traseu.perechi[671], r.perechi); assert.equal(r.traseu.iesiri[671], r.iesiri);
  for (let i = 1; i < 672; i++) { assert.ok(r.traseu.perechi[i] >= r.traseu.perechi[i - 1]); assert.ok(r.traseu.iesiri[i] >= r.traseu.iesiri[i - 1]); }
  const s = GP.simuleaza(B, 0, 672, { jos: 0.98, sus: 1.02, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: 1.05 } }, { traseu: true });
  assert.equal(s.oprit, true); assert.equal(s.traseu.net.length, s.bare); assert.equal(s.traseu.net[s.bare - 1], s.net);
  const l = GP.simuleaza(B, 0, 672, { jos: 0.99, sus: 1.01, grile: 5, levier: 100, dir: "long", suma: 50, stop: null }, { traseu: true });
  assert.equal(l.lichidat, true); assert.equal(l.traseu.net[l.traseu.net.length - 1], -1); assert.equal(l.traseu.net.length, l.bare);
});
await test("(a5) funding-ul: la fiecare 8 h rata / 3 × mărimea poziției; scade rezultatul exact cu r.funding; 0 când lipsește", () => {
  const r0 = GP.simuleaza(B, 0, 672, ST), r1 = GP.simuleaza(B, 0, 672, Object.assign({}, ST, { fundingZi: 0.01 }));
  assert.ok(r1.funding > 0); assert.ok(Math.abs((r0.net - r1.net) - r1.funding) < 1e-12, "net scade exact cu funding-ul");
  // mărimea: cam rata × poziția ținută × zile - long 2× pe un grid ±4% ține ~0,1–1× capitalul în poziție ⇒ 7 zile × 1% ⇒ 0,007–0,07 (măsurat 0,024)
  assert.ok(r1.funding > 0.005 && r1.funding < 0.2, "funding " + r1.funding);
  assert.equal(GP.simuleaza(B, 0, 672, Object.assign({}, ST, { fundingZi: 0 })).funding, 0);
});

// ---------------- (b) codul GRID-FISA ----------------
const EXTRA = { copiatLa: 1791302056000, margJos: 0.031, margSus: 0.034 };
await test("(b1) dinCod: codul din Tablou (20 de câmpuri) ⇒ setările: linii − 1 = intervale, stopul / TP-ul după rol, tipul, planul, pornirea, tpAprox", () => {
  const c = TE.codTVBot(bot({ opritorProfitTip: "raport" }), { minus: 7.5, plus: 2.6, afaraOre: 12 }, EXTRA).cod, d = GS.dinCod(c);
  assert.equal(d.eroare, null);
  assert.deepEqual(d.st, { jos: 0.38, sus: 0.44, grile: 29, levier: 3, dir: "long", suma: 47.83, stop: { jos: 0.36 }, tp: 0.47, tip: "aritmetic" });
  assert.deepEqual(d.plan, { minus: 7.5, plus: 2.6, afaraOre: 12 }); assert.equal(d.pornitLa, 1791301681464); assert.equal(d.tpAprox, true); assert.equal(d.lich.jos, 0.3);
  const s = GS.dinCod("short;0.37;0.42;35;3;0;0.43;0;0.5867;50.12;geometric"); assert.deepEqual(s.st, { jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50.12, stop: { sus: 0.43 }, tp: null, tip: "geometric" }); assert.equal(s.plan, null);
  const n = GS.dinCod("neutru;0.37;0.42;35;3;0.33;0;0;0"); assert.deepEqual(n.st.stop, { jos: 0.33 }); assert.equal(n.st.tp, null); assert.equal(n.st.suma, null); assert.equal(n.st.tip, null);
});
await test("(b2) dinCod: erorile pe nume (câmpuri, direcția, un câmp care nu e număr, liniile)", () => {
  assert.match(GS.dinCod("long;1;2").eroare, /între 9 și 20 de câmpuri.*are 3/);
  assert.match(GS.dinCod("sus;1;2;10;1;0;0;0;0").eroare, /Direcția.*long \/ short \/ neutru/);
  assert.match(GS.dinCod("long;x;2;10;1;0;0;0;0").eroare, /Câmpul 2 \(jos\) nu e un număr: „x”/);
  assert.match(GS.dinCod("long;1;2;2;1;0;0;0;0").eroare, /liniilor.*între 3 și 151/);
  assert.match(GS.dinCod("long;2;1;10;1;0;0;0;0").eroare, /sus.*peste.*jos/i);
  assert.match(GS.dinCod("").eroare, /gol/);
});
await test("(b3) inCod ↔ dinCod dus-întors; inCod ↔ codTVBot pe primele 14 câmpuri", () => {
  const st = { jos: 0.38, sus: 0.44, grile: 29, levier: 3, dir: "long", suma: 47.83, stop: { jos: 0.36 }, tp: 0.47, tip: "aritmetic" }, plan = { minus: 7.5, plus: 2.6, afaraOre: 0 };
  const c = GS.inCod(st, plan); assert.equal(c, "long;0.38;0.44;30;3;0.36;0.47;0;0;47.83;aritmetic;7.5;2.6;0");
  const d = GS.dinCod(c); assert.deepEqual(d.st, st); assert.deepEqual(d.plan, plan);
  assert.equal(GS.inCod({ jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50, stop: { sus: 0.43 }, tp: null, tip: null }, null), "short;0.37;0.42;35;3;0;0.43;0;0;50");
  assert.equal(TE.codTVBot(bot({}), { minus: 7.5, plus: 2.6, afaraOre: 0 }).cod.split(";").slice(0, 7).join(";"), GS.inCod(GS.setariDinBot(bot({})).st, { minus: 7.5, plus: 2.6, afaraOre: 0 }).split(";").slice(0, 7).join(";"));
});
await test("(b4) setariDinBot: ca mcsSetariBot + tipul gridului, pornirea, tpAprox; neutru fără TP", () => {
  const s = GS.setariDinBot(bot({ opritorProfitTip: "raport" }));
  assert.deepEqual(s.st, { jos: 0.38, sus: 0.44, grile: 29, levier: 3, dir: "long", suma: 47.83, stop: { jos: 0.36 }, tp: 0.47, tip: "aritmetic" }); assert.equal(s.pornitLa, 1791301681464); assert.equal(s.tpAprox, true);
  assert.equal(GS.setariDinBot(bot({ directie: "neutral", brut: { buOrderData: { row: 30, gridType: "geometric" } } })).st.tp, null);
  assert.equal(GS.setariDinBot(bot({ directie: "neutral", brut: { buOrderData: { row: 30, gridType: "geometric" } } })).st.tip, "geometric");
});

// ---------------- (c) GridSim.simuleaza ----------------
const O = { zile: 14, orizonturi: [1, 3, 7, 14], n: 40, seed: 12, plan: { minus: 6.5, plus: 2.6 } };
await test("(c1) forma rezultatului: 4 orizonturi cu barele 96 / 288 / 672 / 1344; sumele la 1; cuantilele în ordine; aceeași sămânță ⇒ identic", () => {
  const r = GS.simuleaza(B, ST, O);
  assert.equal(r.n, 40); assert.deepEqual(r.orizonturi.map((o) => o.bare), [96, 288, 672, 1344]); assert.deepEqual(r.orizonturi.map((o) => o.zile), [1, 3, 7, 14]);
  for (const o of r.orizonturi) {
    assert.ok(Math.abs(o.pCastig + o.pPierde + o.pZero - 1) < 1e-9); assert.ok(o.marja > 0 && o.marja < 50); assert.ok(o.p5 <= o.p50 && o.p50 <= o.p95);
    for (const k of ["pLich", "pStop", "pTp", "pIesire", "plan.p", "plan.pRau"]) { const v = k.split(".").reduce((x, y) => x[y], o); assert.ok(v >= 0 && v <= 1, k); }
    assert.ok(o.hist && o.hist.c.length === 24); assert.ok(o.maxJos.p50 <= 0 && o.maxJos.p5 <= o.maxJos.p50); assert.ok(o.perechi >= 0); assert.ok(o.funding >= 0);
  }
  assert.equal(r.acum, null); assert.equal(r.zileIstoric, 20); assert.equal(r.orizonturi[3].scurt, true, "14 zile din 20: istoric scurt"); assert.equal(r.orizonturi[1].scurt, false);
  assert.deepEqual(GS.simuleaza(B, ST, O), r);
});
await test("(c2) planul (stricare): plan uriaș ⇒ 0% (și pRau 0%); pierdere minusculă ⇒ pRau ≈ 100%; un plan atins are zilele mediană ≥ 1 bară", () => {
  const u = GS.simuleaza(B, ST, Object.assign({}, O, { plan: { minus: 1e9, plus: 1e9 } })).orizonturi[3].plan; assert.equal(u.p, 0); assert.equal(u.pRau, 0); assert.equal(u.zileMediana, null);
  const m = GS.simuleaza(B, ST, Object.assign({}, O, { plan: { minus: 0.0001, plus: 1e9 } })).orizonturi[3].plan; assert.ok(m.pRau > 0.95, "pRau " + m.pRau); assert.equal(m.p, 0);
  const p = GS.simuleaza(B, ST, Object.assign({}, O, { plan: { minus: 1e9, plus: 0.0001 } })).orizonturi[0].plan; assert.ok(p.p > 0.5); assert.ok(p.zileMediana > 0 && p.zileMediana <= 1);
  assert.equal(GS.simuleaza(B, ST, Object.assign({}, O, { plan: null })).orizonturi[0].plan, null);
});
await test("(c3) botul care rulează (pornitLa): prefixul real = GridProba pe barele reale; „până acum” identic pe toate drumurile; orizonturile încep după prefix", () => {
  const s = B.length - 3 * 96, t0 = B[s].t, r = GS.simuleaza(B, ST, Object.assign({}, O, { pornitLa: t0, orizonturi: [1, 7] }));
  const real = GP.simuleaza(B, s, B.length - s, ST, { traseu: true });
  assert.equal(r.acum.bare, B.length - s); assert.equal(r.acum.net, real.net); assert.equal(r.acum.usdt, real.net * 50); assert.equal(r.acum.t, B[B.length - 1].t); assert.equal(r.acum.perechi, real.perechi);
  assert.deepEqual(r.orizonturi.map((o) => o.bare), [B.length - s + 96, B.length - s + 672]);
  assert.ok(r.orizonturi[0].deAici && typeof r.orizonturi[0].deAici.p50 === "number", "de aici încolo: rezultatul față de acum");
  assert.equal(GS.simuleaza(B, ST, Object.assign({}, O, { pornitLa: B[0].t - 1 })).eroare, undefined, "pornit înaintea barelor: se ia de la prima bară");
  assert.match(GS.simuleaza(B, ST, Object.assign({}, O, { pornitLa: B[B.length - 1].t + 1 })).eroare, /pornit/i);
});
await test("(c4) marja: 1,96·√(p(1−p)/n) în puncte", () => { assert.equal(GS.marja(0.5, 500), 4); assert.equal(GS.marja(0.9, 100), 6); assert.equal(GS.marja(0, 500), 0); });

// ---------------- (d) verdictul ----------------
const oz = (o) => Object.assign({ zile: 7, bare: 672, pCastig: 0.62, pPierde: 0.38, pZero: 0, marja: 4, p5: -9.2, p50: 1.8, p95: 8.3, hist: { lo: -10, hi: 10, n: 500, c: Array(24).fill(1) }, pLich: 0, pStop: 0.31, pTp: 0, pIesire: 1, perechi: 152, maxJos: { p50: -4.1, p5: -12 }, funding: 0.6, plan: { p: 0.63, pRau: 0.2, zileMediana: 4, dejaAtins: null } }, o);
const rz = (o, acum) => ({ n: 500, orizonturi: [oz(o)], acum: acum || null });
await test("(d1) rândul mare: CÂȘTIGĂ / PIERDE cu procentele și marja; culoarea verde ≥ 55, roșie ≤ 45, galbenă între; „pe zero” doar ≥ 0,5%", () => {
  const v = GS.verdict(rz({}), ST, { minus: 6.5, plus: 2.6 }, 0);
  assert.equal(v.rand, "CÂȘTIGĂ în 62% din drumuri · PIERDE în 38%"); assert.equal(v.marja, "±4 puncte"); assert.equal(v.culoare, "good");
  assert.equal(GS.verdict(rz({ pCastig: 0.4, pPierde: 0.6 }), ST, null, 0).culoare, "bad"); assert.equal(GS.verdict(rz({ pCastig: 0.5, pPierde: 0.5 }), ST, null, 0).culoare, "mijl");
  assert.match(GS.verdict(rz({ pCastig: 0.6, pPierde: 0.38, pZero: 0.02 }), ST, null, 0).rand, /· pe zero 2%$/);
  assert.match(v.sub, /^de obicei \+1,8 USDT · cele mai proaste 5%: −9,2 USDT · cele mai bune 5%: \+8,3 USDT$/);
});
await test("(d2) „Ce aș face eu”, regulile în ordine: lichidare > 2% · planul · stopul în zgomot · aș porni · n-aș porni · aruncare de ban; modul 2 adaugă „de la pornire”", () => {
  const f = (o, plan, acum) => GS.verdict(rz(o, acum), ST, plan === undefined ? { minus: 6.5, plus: 2.6 } : plan, 0).faCe;
  assert.match(f({ pLich: 0.05 }), /^N-aș porni așa: lichidare în 5% din drumuri/);
  assert.match(f({ p5: -9.2 }), /^Nu se potrivește cu planul tău: în cele mai proaste 5% pierzi 9,2 USDT, planul tău zice −6,5/);
  assert.match(f({ p5: -5, pStop: 0.6 }), /^Stopul e în zgomot: atins în 60% din drumuri în 7 zile/);
  assert.match(f({ p5: -5 }), /^Aș porni: câștigă în 62% din drumuri, de obicei \+1,8 USDT; planul \+2,6 vine înainte de −6,5 în 63%/);
  assert.match(f({ p5: -5, pCastig: 0.4, pPierde: 0.6, p50: -1.2 }), /^N-aș porni: pierde în 60% din drumuri \(de obicei −1,2 USDT\)/);
  assert.match(f({ p5: -5, pCastig: 0.5, pPierde: 0.5 }), /^O aruncare de ban: 50% câștigă, 50% pierde/);
  assert.match(f({ p5: -5 }, null), /^Aș porni: câștigă în 62% din drumuri, de obicei \+1,8 USDT\./, "fără plan, fără partea cu planul");
  const m2 = GS.verdict(rz({ p5: -5, deAici: { p50: 1.2, pCastig: 0.58 } }, { net: 0.01, usdt: 0.5, bare: 300, t: 0, perechi: 10 }), ST, { minus: 6.5, plus: 2.6 }, 0, { profitNet: 0.67 });
  assert.match(m2.faCe, /De la pornire, botul tău are \+0,7 USDT \(Pionex\), \+0,5 estimat; de aici încolo, în 7 zile: câștigă în 58%, de obicei \+1,2 USDT/);
  assert.match(GS.verdict(rz({ p5: -5, plan: { p: 0.63, pRau: 0.2, zileMediana: 4, dejaAtins: "plus" } }, { net: 0.06, usdt: 3, bare: 300, t: 0, perechi: 10 }), ST, { minus: 6.5, plus: 2.6 }, 0, { profitNet: 3 }).faCe, /planul tău e deja atins \(\+2,6\): încasează, cum ți-ai propus/);
  assert.match(GS.verdict(rz({}), ST, null, 0).nota, /istoria monedei reluată, fără tendința perioadei/);
});

// ---------------- (e) ecranul (HTML pur, fără DOM) ----------------
const STP = { jos: 0.38, sus: 0.44, grile: 29, levier: 3, dir: "long", suma: 47.83, stop: { jos: 0.36 }, tp: 0.47, tip: "geometric" };
const REZ = () => ({ n: 500, zile: 14, zileIstoric: 31, suma: 47.83, tpIgnorat: null, acum: null, orizonturi: [1, 3, 7, 14].map((z, i) => oz({ zile: z, bare: z * 96, scurt: z === 14, pCastig: 0.5 + i * 0.04, pPierde: 0.5 - i * 0.04 })) });
const stare = (o) => Object.assign({ mod: "nou", botIdx: 0, boti: [], sim: "PONS", st: STP, plan: { minus: 6.5, plus: 2.6 }, fundingZi: 0.0003, pornitLa: null, tpAprox: false, bot: null, rez: null, oriz: 2, inLucru: false, eroare: null, cod: "", codEroare: null, pret: 0.3967, dateLa: 0 }, o);
await test("(e1) formularul: comutatorul, codul din fișă + codul pentru TV, câmpurile ca în GRID-FISA (linii = intervale + 1), planul, funding-ul, butonul Simulează", () => {
  const h = G.gsFormHtml(stare({}));
  assert.match(h, /<button type="button" class="tbIntBtn" aria-pressed="true" data-action-click="gsMod\('nou'\)">Bot nou<\/button>/);
  assert.match(h, /aria-pressed="false" data-action-click="gsMod\('meu'\)">Botul meu care rulează<\/button>/);
  assert.match(h, /<textarea id="gsCod"/); assert.match(h, /data-action-click="gsDinCod\(\)">Ia din cod<\/button>/);
  assert.match(h, /<code id="gsCodOut">long;0\.38;0\.44;30;3;0\.36;0\.47;0;0;47\.83;geometric;6\.5;2\.6;0<\/code>/); assert.match(h, /data-action-click="gsCopiazaCod\(\)"/);
  assert.match(h, /<input id="gsSim"[^>]*value="PONS"/); assert.match(h, /<select id="gsDir" data-action-change="gsDirectie\(this\.value\)"><option value="long" selected>long<\/option><option value="short">short<\/option><option value="neutru">neutru<\/option><\/select>/);
  for (const [id, v] of [["gsJos", "0.38"], ["gsSus", "0.44"], ["gsLinii", "30"], ["gsLev", "3"], ["gsStop", "0.36"], ["gsTp", "0.47"], ["gsSuma", "47.83"], ["gsPlanMinus", "6.5"], ["gsPlanPlus", "2.6"], ["gsFunding", "0.03"]]) assert.match(h, new RegExp('<input id="' + id + '"[^>]*value="' + v.replace(".", "\\.") + '"'), id);
  assert.match(h, /<span class="t212Mic" id="gsInterv">= 29 de intervale<\/span>/); assert.match(h, /<select id="gsTip"><option value="geometric" selected>geometric<\/option><option value="aritmetic">aritmetic<\/option><\/select>/);
  assert.doesNotMatch(h, /id="gsPornit"/); assert.match(h, /data-action-click="gsSimuleaza\(\)">Simulează<\/button>/);
  const m = G.gsFormHtml(stare({ mod: "meu", boti: ["PONS · short 3× · 0,3700–0,4200 · 50,12 USDT"], botIdx: 0, pornitLa: Date.UTC(2026, 9, 7, 5, 9), tpAprox: true }));
  assert.match(m, /<select id="gsBot" data-action-change="gsAlegeBot\(this\.value\)"><option value="0" selected>PONS · short 3× · 0,3700–0,4200 · 50,12 USDT<\/option><\/select>/);
  assert.match(m, /<input id="gsPornit"[^>]*readonly[^>]*value="07\.10\.2026, 08:09"/); assert.match(m, /TP-ul tău e în procente din investiție/);
  assert.match(G.gsFormHtml(stare({ mod: "meu", boti: [] })), /n-ai niciun bot activ/);
  assert.match(G.gsFormHtml(stare({ st: Object.assign({}, STP, { dir: "neutru", tp: null }) })), /<input id="gsTp"[^>]*disabled/);
  assert.match(G.gsFormHtml(stare({ codEroare: "Câmpul 2 (jos) nu e un număr: „x”." })), /tbWarn[^>]*>Câmpul 2 \(jos\) nu e un număr: „x”\./);
});
await test("(e2) gsDirectieSt: schimbarea direcției mută stopul și TP-ul pe partea lor (long ↔ short: numărul de deasupra = stop la short / TP la long); neutru stinge TP-ul", () => {
  const sh = G.gsDirectieSt(STP, "short"); assert.deepEqual(sh, Object.assign({}, STP, { dir: "short", stop: { sus: 0.47 }, tp: 0.36 }));
  assert.deepEqual(G.gsDirectieSt(sh, "long"), STP);
  const nt = G.gsDirectieSt(STP, "neutru"); assert.equal(nt.tp, null); assert.deepEqual(nt.stop, { jos: 0.36 });
  assert.deepEqual(G.gsDirectieSt(Object.assign({}, STP, { stop: null, tp: null }), "short").stop, null);
  assert.deepEqual(G.gsDirectieSt(Object.assign({}, STP, { stop: { jos: 0.36 }, tp: null }), "short"), Object.assign({}, STP, { dir: "short", stop: null, tp: 0.36 }));
});
await test("(e3) verdictul: rândul mare cu culoarea, marja, cifrele, histograma, „Ce aș face eu”, nota, orizontul", () => {
  const h = G.gsVerdictHtml(stare({ rez: REZ(), plan: null }));   // fără plan: p5 −9,2 ar declanșa „nu se potrivește cu planul” (−6,5)
  assert.match(h, /<div class="gsVerdict good"><b>CÂȘTIGĂ în 58% din drumuri · PIERDE în 42%<\/b><span class="t212Mic">±4 puncte<\/span><\/div>/);
  assert.match(h, /pe 7 zile/); assert.match(h, /de obicei \+1,8 USDT · cele mai proaste 5%: −9,2 USDT · cele mai bune 5%: \+8,3 USDT/);
  assert.match(h, /<svg class="mcsHist"/); assert.match(h, /👉 <b>Ce aș face eu:<\/b> Aș porni: câștigă în 58%/); assert.match(h, /istoria monedei reluată/);
  assert.match(G.gsVerdictHtml(stare({ rez: REZ(), oriz: 3, plan: null })), /pe 14 zile[\s\S]*Istoricul e scurt/);
  assert.match(G.gsVerdictHtml(stare({ rez: REZ() })), /Nu se potrivește cu planul tău/, "cu planul: regula planului");
});
await test("(e4) pe durate: 4 rânduri (clic = orizontul), cel ales marcat, planul cu „—” când lipsește", () => {
  const h = G.gsDurateHtml(stare({ rez: REZ() }));
  assert.equal((h.match(/<tr class="gsRand/g) || []).length, 4); assert.match(h, /<tr class="gsRand gsRandAles" aria-selected="true" data-action-click="gsOriz\(2\)"><td>7 zile<\/td><td class="good">58%<\/td><td class="good">\+1,8 USDT<\/td><td>−9,2 USDT<\/td><td>\+8,3 USDT<\/td><td>63%<\/td><td>4 z<\/td><td>0%<\/td><td>31%<\/td><td>0%<\/td><\/tr>/);
  assert.match(G.gsDurateHtml(stare({ rez: REZ(), st: Object.assign({}, STP, { tp: null }) })), /<td>31%<\/td><td>—<\/td><\/tr>/, "fără TP: „—”");
  assert.match(h, /<th>Planul \+2,6 înainte de −6,5<\/th>/);
  const r = REZ(); r.orizonturi.forEach((o) => { o.plan = null; }); assert.match(G.gsDurateHtml(stare({ rez: r, plan: null })), /<th>Planul tău<\/th>[\s\S]*<td>—<\/td><td>—<\/td>/);
});
await test("(e5) riscurile pe nume pe orizontul ales + prețul de zero la „Botul meu”", () => {
  const h = G.gsRiscuriHtml(stare({ rez: REZ() }));
  for (const t of ["lichidare", "atinge stopul", "atinge TP-ul", "iese din grid măcar o dată", "grile încasate, în medie", "pierderea maximă pe drum", "funding plătit"]) assert.ok(h.includes(t), t);
  assert.match(h, /pierderea maximă pe drum[\s\S]*?<b class="bad">−4,1 USDT de obicei · −12,0 USDT în cele mai proaste 5%<\/b>/); assert.doesNotMatch(h, /prețul de zero/);
  const m = G.gsRiscuriHtml(stare({ mod: "meu", rez: Object.assign(REZ(), { acum: { net: 0.01, usdt: 0.5, bare: 300, t: 0, perechi: 10 } }), bot: bot({}) }));
  assert.match(m, /prețul de zero[\s\S]*?0,4\d\d\d/);
});
await test("(e6) „Botul meu, de la pornire”: estimat vs Pionex, poziția, planul deja atins, de aici încolo", () => {
  const r = Object.assign(REZ(), { acum: { net: 0.01, usdt: 0.5, bare: 300, t: Date.UTC(2026, 9, 7, 12), perechi: 10 } }); r.orizonturi[2].deAici = { p5: -8, p50: 1.2, p95: 7, pCastig: 0.58 }; r.orizonturi[2].plan.dejaAtins = "plus";
  const h = G.gsBotulMeuHtml(stare({ mod: "meu", rez: r, bot: bot({}), pornitLa: Date.UTC(2026, 9, 7, 5, 9) }));
  assert.match(h, /reluat pe barele reale de la 07\.10\.2026, 08:09 până la 07\.10\.2026, 15:00: <b>\+0,5 USDT<\/b> estimat; Pionex spune <b>\+0,7 USDT<\/b>/);
  assert.match(h, /10 grile încasate/); assert.match(h, /poziția 120 PONS/); assert.match(h, /planul tău \(\+2,6\) e deja atins/);
  assert.match(h, /de aici încolo, în 7 zile: câștigă în 58% din drumuri, de obicei \+1,2 USDT \(5% sub −8,0, 5% peste \+7,0\)/);
});
await test("(e7) gsHtml: stările (calculez / eroare / fără rezultat / cu rezultat), TP ignorat spus; Enter = Simulează; starea paginii", () => {
  assert.match(G.gsHtml(stare({ inLucru: true })), /calculez/); assert.match(G.gsHtml(stare({ eroare: "Nu găsesc PONS pe Pionex" })), /tbWarn[^>]*>Nu găsesc PONS pe Pionex/);
  assert.match(G.gsHtml(stare({})), /Lipește codul din Tablou sau completează setarea, apoi apasă „Simulează”/);
  const h = G.gsHtml(stare({ rez: Object.assign(REZ(), { tpIgnorat: 0.3 }) })); assert.match(h, /gsVerdict/); assert.match(h, /TP-ul \(0,3000\) e de partea greșită a prețului/);
  const E = citeste("public", "lib", "grid-sim-ecran.js");
  assert.match(functie(E, "gsTasta"), /gsSimuleaza\(\)/); assert.match(E, /addEventListener\("keydown", gsTasta\)/);
  assert.match(functie(E, "gsSimuleaza"), /mcsAduCoin\(/); assert.match(functie(E, "gsSimuleaza"), /GridSim\.simuleaza\(/); assert.match(functie(E, "gsSimuleaza"), /setTimeout\(/);
  assert.match(functie(E, "gsAlegeBot"), /GridSim\.setariDinBot\(/); assert.match(functie(E, "gsDinCod"), /GridSim\.dinCod\(/);
});

// ---------------- (f) pagina ----------------
await test("(f1) pagina gridsim: meniul, panelul cu #gsPagina, script-urile după tablou-extra, show() ⇒ gsPorneste, SW-ul, CSS-ul", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js"), sw = citeste("public", "sw.js"), css = citeste("public", "app.css");
  assert.match(html, /<button class="sideBtn" data-action-click="navTo\('gridsim',true\)" data-nav="gridsim"><span class="sideIcon">⚄<\/span>Simulator grid<\/button>/);
  assert.match(html, /<section class="panel" id="gridsim">[\s\S]*?<div class="card full" id="gsPagina">/);
  const sc = [...html.matchAll(/<script src="\/lib\/([a-z0-9-]+)\.js"><\/script>/g)].map((m) => m[1]);
  assert.ok(sc.indexOf("grid-sim") > sc.indexOf("tablou-extra") && sc.indexOf("grid-sim-ecran") === sc.indexOf("grid-sim") + 1, "grid-sim după tablou-extra, ecranul imediat după");
  assert.match(app, /if\(id==="gridsim"\)\{if\(typeof gsPorneste==="function"\)gsPorneste\(\)\}/);
  assert.match(sw, /"\/lib\/grid-sim\.js","\/lib\/grid-sim-ecran\.js"/); assert.match(css, /#gsPagina \.gsVerdict\{/);
  assert.match(html, /moreNav\('gridsim',true\)/, "și în „Mai multe” pe telefon");
});
await test("(E) versiunea de la v100.134 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[4-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[4-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[4-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[4-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[4-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[4-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[4-9]|[4-9]\d)$/);
});

console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
