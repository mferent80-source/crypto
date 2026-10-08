// Proba v100.136 (08.10, el: „fa ideile” după v100.135): (1) la botul care rulează, „așa cum e” și țintele (TP) pornesc din STAREA de acum
// (pozițiile deschise), celelalte variante ca bot pornit acum (= dacă l-ai opri și ai porni varianta); (2) funding-ul real Pionex și pe
// pagina Monte Carlo; (3) funding-ul monedei în Tablou, lângă „din grid”; (4) „Compară” ține minte orizontul și se reface la schimbarea lui.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "tablou-extra.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
for (const f of ["monte-simbol-ecran.js", "grid-sim.js", "grid-sim-ecran.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const G = globalThis, GP = G.GridProba, M = G.MonteSimbol, GS = G.GridSim, TE = G.TabloExtra, E = citeste("public", "lib", "grid-sim-ecran.js"), MSE = citeste("public", "lib", "monte-simbol-ecran.js"), APP = citeste("public", "app.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.136 · din starea de acum, funding pe Monte Carlo și în Tablou, orizontul comparațiilor · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.UTC(2026, 8, 1) + i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
function bareDrum(cs) { const b = []; let o = cs[0]; cs.forEach((c, i) => { b.push({ t: Date.UTC(2026, 9, 1) + i * 9e5, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 }); o = c; }); return b; }
const B = bare15(20, 3), P0 = B[B.length - 1].c;

// ---------------- (1) din starea de acum ----------------
await test("(1a) GridProba: opt.dinBara + opt.stopDupa - stopul / ținta se schimbă DIN bara dată (înainte rămâne cel din st.stop)", () => {
  const cs = []; for (let i = 0; i <= 10; i++) cs.push(+(1 - 0.01 * i).toFixed(4)); for (let i = 1; i <= 10; i++) cs.push(+(0.9 + 0.01 * i).toFixed(4)); for (let i = 0; i < 10; i++) cs.push(1);
  const bd = bareDrum(cs), st = { jos: 0.95, sus: 1.05, grile: 10, levier: 2, dir: "long", suma: 50, stop: null };
  assert.equal(GP.simuleaza(bd, 0, bd.length, st).oprit, false, "fără stop nu se oprește");
  assert.equal(GP.simuleaza(bd, 0, bd.length, st, { dinBara: 15, stopDupa: { jos: 0.93 } }).oprit, false, "stopul pus de la bara 15: căderea a fost înainte");
  const r0 = GP.simuleaza(bd, 0, bd.length, st, { dinBara: 0, stopDupa: { jos: 0.93 } }); assert.equal(r0.oprit, true); assert.equal(r0.iesit, "jos"); assert.equal(r0.bare, 8);
  const r1 = GP.simuleaza(bd, 0, bd.length, Object.assign({}, st, { stop: { jos: 0.93 } }), { dinBara: 15, stopDupa: {} }); assert.equal(r1.oprit, true); assert.equal(r1.bare, 8, "stopul din st.stop e activ până la bara 15");
  const r2 = GP.simuleaza(bd, 0, bd.length, st, { dinBara: 12, stopDupa: { sus: 0.99 } }); assert.equal(r2.oprit, true); assert.equal(r2.iesit, "sus"); assert.equal(r2.bare, 20, "ținta pusă de la bara 12 se atinge la 0,99 (bara 20)");
});
await test("(1b) GridSim.simuleaza: o.stPrefix = setarea botului PE prefix (ținta nouă abia de acum); o.peDrum ⇒ drumuri + drumuriDeAici", () => {
  const pre = 288, pornitLa = B[B.length - pre].t, maxPre = Math.max(...B.slice(-pre).map((x) => x.h));
  assert.ok(maxPre > P0 * 1.003, "precondiție: prefixul a trecut peste prețul de acum");
  const tp = P0 + 0.5 * (maxPre - P0), st = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: tp }, O = { zile: 14, orizonturi: [1, 7], n: 40, seed: 12, pornitLa, peDrum: true };
  const fara = GS.simuleaza(B, st, O); assert.equal(fara.acum.oprit, "oprit", "ținta aplicată și pe prefix ⇒ botul s-ar fi închis deja");
  const cu = GS.simuleaza(B, st, Object.assign({}, O, { stPrefix: Object.assign({}, st, { tp: null }) }));
  assert.equal(cu.acum.oprit, null, "ținta abia de acum: pe prefix nu se închide"); assert.ok(cu.orizonturi[0].pTp > 0, "de acum încolo ținta se atinge pe unele drumuri");
  assert.equal(cu.orizonturi[0].drumuri.length, 40); assert.equal(cu.orizonturi[0].drumuriDeAici.length, 40);
  assert.ok(Math.abs(cu.orizonturi[1].drumuriDeAici.reduce((s, x) => s + x, 0) / 40 - cu.orizonturi[1].deAici.p50) < 20, "de aici încolo = net − acum");
  assert.equal(GS.simuleaza(B, st, { zile: 14, orizonturi: [1], n: 10, seed: 12 }).orizonturi[0].drumuri, undefined, "fără peDrum nimic nou");
});
await test("(1c) GridSim.compara: rândul cu dinStare = botul cu pozițiile de acum (de aici încolo), celelalte pornite acum; drum cu drum între ele", () => {
  const pornitLa = B[B.length - 288].t, st = { jos: P0 * 0.9, sus: P0 * 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: P0 * 0.85 }, tp: null, tip: "geometric" };
  const o = { zile: 14, orizonturi: [7], n: 40, seed: 12, oriz: 7 }, ref = GS.simuleaza(B, st, Object.assign({}, o, { pornitLa })).orizonturi[0];
  const lista = G.mcsVariante(st); lista[0].dinStare = true;
  const rows = GS.compara(B, lista, Object.assign({}, o, { pornitLa, stPrefix: st })), proaspat = GS.compara(B, G.mcsVariante(st), o);
  assert.equal(rows[0].g.deAici, true); assert.equal(rows[0].g.p50, ref.deAici.p50); assert.equal(rows[0].g.pPlus, ref.deAici.pCastig); assert.equal(rows[0].g.drumuri.length, 40);
  assert.ok(!rows[1].g.deAici); assert.equal(rows[1].g.p50, proaspat[1].g.p50, "varianta = bot pornit acum, ca înainte");
  assert.ok(rows[1].drum && Math.abs(rows[1].drum.maiBun + rows[1].drum.maiRau + rows[1].drum.egal - 1) < 1e-9);
  assert.notEqual(rows[0].g.p50, proaspat[0].g.p50, "al tău cu pozițiile de acum ≠ al tău pornit acum");
  const tinte = G.mcsTinteBot(st, P0).map((x) => ({ nume: x.nume, tp: x.tp, tu: x.tu, dinStare: true, st: Object.assign({}, st, { tp: x.tp }) }));
  const t = GS.compara(B, tinte, Object.assign({}, o, { pornitLa, stPrefix: st })); assert.ok(t.length >= 2); t.forEach((x) => { assert.equal(x.g.deAici, true, x.nume); });
  assert.equal(t.filter((x) => x.tu)[0].g.p50, ref.deAici.p50, "rândul „al tău” la ținte = de aici încolo al botului");
});
await test("(1d) pagina: la botul care rulează gsCompara trimite pornitLa + stPrefix și dinStare pe „așa cum e”, gsComparaTp pe toate țintele; nota spune", () => {
  const c = functie(E, "gsCompara"), t = functie(E, "gsComparaTp");
  assert.match(c, /dinStare = /); assert.match(c, /pornitLa: meu \? gsStare\.pornitLa : null/); assert.match(c, /stPrefix: /);
  assert.match(t, /dinStare: meu/); assert.match(t, /pornitLa: meu \? gsStare\.pornitLa : null/);
  const oz = { zile: 7, bare: 672, pCastig: 0.5, pPierde: 0.5, pZero: 0, marja: 4, p5: -9, p50: 1, p95: 8, hist: { lo: -10, hi: 10, n: 40, c: Array(24).fill(1) }, pLich: 0, pStop: 0.3, pTp: 0, pIesire: 1, perechi: 100, maxJos: { p50: -4, p5: -9 }, funding: 0.1, plan: null, deAici: { p5: -5, p50: 0.5, p95: 6, pCastig: 0.5, pPierde: 0.5, pZero: 0, marja: 4, hist: { lo: -10, hi: 10, n: 40, c: Array(24).fill(1) } } };
  const s = { mod: "meu", boti: [], sim: "PONS", st: { jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50, stop: { sus: 0.43 }, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: 0.0003, pornitLa: Date.UTC(2026, 9, 7, 13, 38), bot: {}, rez: { n: 40, zile: 14, zileIstoric: 20, suma: 50, acum: { net: -0.01, usdt: -0.6, bare: 20, t: Date.UTC(2026, 9, 7, 19), perechi: 48, oprit: null }, orizonturi: [oz, oz, oz, oz] }, oriz: 2 };
  assert.match(G.gsHtml(s), /„așa cum e” și țintele: botul tău cu pozițiile de acum, de aici încolo · celelalte variante: pornite acum, de la zero \(ca și cum l-ai opri și ai porni varianta\)/);
  assert.doesNotMatch(G.gsHtml(Object.assign({}, s, { mod: "nou", rez: Object.assign({}, s.rez, { acum: null }) })), /pozițiile de acum/);
});

// ---------------- (2) funding-ul real pe Monte Carlo ----------------
await test("(2a) MonteSimbol.grid: funding-ul (USDT, în medie) în rezultat; tip și fundingZi trec la simulator", () => {
  const b = bare15(20, 3, 0.012), st = { pret: 1, jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "long", suma: 50, stop: null };
  const g0 = M.grid(b, st, { zile: 3, n: 30, seed: 12, faraCuTendinta: true }), g1 = M.grid(b, Object.assign({}, st, { fundingZi: 0.01 }), { zile: 3, n: 30, seed: 12, faraCuTendinta: true });
  assert.equal(g0.funding, 0); assert.ok(g1.funding > 0, "funding " + g1.funding); assert.ok(g1.p50 < g0.p50);
  assert.ok(M.grid(b, Object.assign({}, st, { dir: "short", fundingZi: 0.01 }), { zile: 3, n: 30, seed: 12, faraCuTendinta: true }).funding < 0, "shortul încasează");
});
await test("(2b) mcsAduCoin aduce și ratele (pionex_funding) ⇒ fundingInfo; mcsCalculeaza pune fundingZi din ele; Simulatorul le refolosește (gsPuneFunding), fără a doua cerere", () => {
  const a = functie(MSE, "mcsAduCoin"); assert.match(a, /type=pionex_funding/); assert.match(a, /gsRataFunding\(/); assert.match(a, /fundingInfo: /);
  assert.match(MSE, /fundingInfo: c\.fundingInfo/); assert.match(functie(MSE, "mcsCalculeaza"), /fundingZi: d\.fundingInfo \? d\.fundingInfo\.rataZi : 0/); assert.match(functie(MSE, "mcsCalculeaza"), /fundingInfo: d\.fundingInfo/);
  assert.match(functie(E, "gsSimuleaza"), /gsPuneFunding\(sim, gsStare\.date\.fundingInfo\)/); assert.doesNotMatch(functie(E, "gsSimuleaza"), /gsAduFunding/); assert.doesNotMatch(E, /type=pionex_funding/);
  assert.match(functie(E, "gsPuneFunding"), /fundingZi = 0\.0003; gsStare\.fundingSursa = null; gsStare\.fundingInfo = null/);
});
await test("(2c) cardul Monte Carlo: rândul „funding (rata reală Pionex x% pe zi)” cu banii; fără rate ⇒ spune că simularea e fără funding", () => {
  const b = bare15(20, 3, 0.012), st = { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "short", suma: 50, stop: null, tp: null, botulTau: false, fundingZi: 0.00085 };
  const g = M.grid(b, Object.assign({ pret: 1 }, st), { zile: 3, n: 30, seed: 12, faraCuTendinta: true, peDrum: true });
  const h = G.mcsGridHtml({ tip: "coin", sim: "PONS", setari: st, grid: g, fundingInfo: { sim: "PONS", rataZi: 0.00085, intervalOre: 4, zile: 7, n: 42 } });
  assert.match(h, /funding \(rata reală Pionex, 0,085% pe zi, la 4 h\), în medie/); assert.match(h, /încasat |sub 0,1 USDT/);
  const h0 = G.mcsGridHtml({ tip: "coin", sim: "PONS", setari: Object.assign({}, st, { fundingZi: 0 }), grid: Object.assign({}, g, { funding: 0 }), fundingInfo: null });
  assert.match(h0, /fără funding \(Pionex n-a dat ratele monedei\)/);
});

// ---------------- (3) funding-ul în Tablou ----------------
await test("(3a) TabloExtra.fundingBot(b, info): rata pe zi cu semn ⇒ cine plătește, cât pe săptămână din poziția deschisă (sau investit × levier)", () => {
  const info = { rataZi: 0.00085, intervalOre: 4 };
  const s = TE.fundingBot({ directie: "SHORT", pozitie: 220, pretCurent: 0.4, investit: 50, levier: 3 }, info);
  assert.equal(s.text, "funding 0,085% pe zi · încasezi ≈ 0,5 USDT pe săptămână"); assert.equal(s.ton, "good");
  const l = TE.fundingBot({ directie: "long", pozitie: 220, pretCurent: 0.4 }, info); assert.equal(l.text, "funding 0,085% pe zi · plătești ≈ 0,5 USDT pe săptămână"); assert.equal(l.ton, "bad");
  assert.equal(TE.fundingBot({ directie: "short", pozitie: 220, pretCurent: 0.4 }, { rataZi: -0.0006 }).text, "funding −0,06% pe zi · plătești ≈ 0,4 USDT pe săptămână");
  assert.equal(TE.fundingBot({ directie: "long", investit: 50, levier: 3 }, info).text, "funding 0,085% pe zi · plătești ≈ 0,9 USDT pe săptămână", "fără poziție: investit × levier");
  assert.equal(TE.fundingBot({ directie: "neutral", pozitie: 0, investit: 50, levier: 3 }, info).text, "funding 0,085% pe zi · pe poziția netă (long plătește, short încasează)");
  assert.equal(TE.fundingBot({ directie: "long" }, null), null); assert.equal(TE.fundingBot(null, info), null);
});
await test("(3b) Tabloul aduce ratele monedei botului (o dată la 30 min, pe simbol) și le pune lângă „din grid”", () => {
  assert.match(functie(APP, "tbAduDate"), /type=pionex_funding/); assert.match(functie(APP, "tbAduDate"), /tbStare\.funding=/);
  assert.match(functie(APP, "tbDeseneazaKpi"), /TabloExtra\.fundingBot\(/); assert.match(APP, /var tbStare=\{bot:null,[^\n]*funding:null/);
});

// ---------------- (4) orizontul comparațiilor ----------------
await test("(4) „Compară” ține minte orizontul calculat (titlul îl spune) și se reface când schimbi orizontul", () => {
  assert.match(functie(E, "gsCompara"), /varianteZile = zile/); assert.match(functie(E, "gsComparaTp"), /tinteBotZile = zile/);
  const o = functie(E, "gsOriz"); assert.match(o, /gsCompara\(\)/); assert.match(o, /gsComparaTp\(\)/); assert.match(o, /varianteZile !== /);
  const st = { jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50, stop: { sus: 0.43 }, tp: null, tip: "geometric" }, g = { zile: 3, n: 40, drumuri: [1, 2], p5: -1, p50: 0.5, p95: 2, pPlus: 0.5, pLichidare: 0, pStop: 0.1, pTp: 0, pIesire: 1, perechiMedii: 3, hist: null };
  const rows = G.mcsVariante(st).map((v, i) => ({ nume: v.nume, st: v.st, g, drum: i ? { maiBun: 0.5, maiRau: 0.5, egal: 0 } : null }));
  const s = { mod: "nou", boti: [], sim: "PONS", st, plan: {}, fundingZi: 0.0003, rez: { n: 40, zile: 14, zileIstoric: 20, suma: 50, acum: null, orizonturi: [] }, oriz: 2, variante: rows, varianteZile: 3 };
  assert.match(G.gsAlteSetariHtml(s), /Aceleași drumuri, 7 variante · 3 zile/, "titlul spune orizontul CALCULAT (3), nu cel ales (7)");
});

await test("(E) versiunea de la v100.136 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[6-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[6-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[6-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[6-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[6-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[6-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[6-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
