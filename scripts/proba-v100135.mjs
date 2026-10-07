// Proba v100.135 (07.10, el: „fa ideile” după v100.134 - Simulator grid): (1) „Compară variante” și „Compară ținte (TP)” și pe pagina
// Simulator grid, pe orizontul ales; (2) butonul „⚄ Simulează” în Tablou deschide Simulatorul pe botul acela; (3) funding-ul REAL al monedei
// (ratele Pionex) în loc de costul fix, cu semn (long plătește, short încasează); (4) pierderea maximă pe drum și planul în INTERIORUL barei.
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
const G = globalThis, GP = G.GridProba, M = G.MonteSimbol, GS = G.GridSim, E = citeste("public", "lib", "grid-sim-ecran.js"), MSE = citeste("public", "lib", "monte-simbol-ecran.js");
const functie = (src, n) => { const i = src.search(new RegExp("(async )?function " + n + "\\(")); if (i < 0) throw new Error(n + "() lipsește"); let a = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") a++; else if (src[j] === "}" && --a === 0) break; } return src.slice(i, j + 1); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.135 · Simulator grid: variante + TP aici, Simulează din Tablou, funding real, min/max în bară · proba\n");
function bare15(zile, seed, pas) { const g = M.generator(seed), b = []; let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c = c * Math.exp((g() - 0.5) * (pas || 0.008)); b.push({ t: Date.UTC(2026, 8, 1) + i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare15(20, 3), ST = { jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 } };
const O = { zile: 14, orizonturi: [1, 3, 7, 14], n: 40, seed: 12, plan: { minus: 6.5, plus: 2.6 } };

// ---------------- (4) în interiorul barei ----------------
await test("(4a) traseul are min / max pe bară (pe cele 4 puncte ale drumului), cu min ≤ net ≤ max; pe o serie agitată minimul în bară e sub minimul pe închideri", () => {
  const r = GP.simuleaza(B, 0, 672, ST, { traseu: true }), t = r.traseu;
  assert.equal(t.min.length, 672); assert.equal(t.max.length, 672);
  for (let i = 0; i < 672; i++) { assert.ok(t.min[i] <= t.net[i] + 1e-12 && t.net[i] <= t.max[i] + 1e-12, "bara " + i); }
  const a = GP.simuleaza(bare15(10, 5, 0.03), 0, 672, { jos: 0.9, sus: 1.1, grile: 10, levier: 3, dir: "long", suma: 50, stop: null }, { traseu: true }).traseu;
  assert.ok(Math.min(...a.min) < Math.min(...a.net), "minimul în bară sub minimul pe închideri");
  const s = GP.simuleaza(B, 0, 672, { jos: 0.98, sus: 1.02, grile: 10, levier: 2, dir: "short", suma: 50, stop: { sus: 1.05 } }, { traseu: true });
  assert.equal(s.traseu.min.length, s.bare); assert.ok(s.traseu.min[s.bare - 1] <= s.net);
  assert.equal(GP.simuleaza(B, 0, 672, ST).traseu, undefined, "fără opt nimic nou");
});
await test("(4b) GridSim: pierderea maximă pe drum din minimul în bară (≤ cea pe închideri); planul: + și − în aceeași bară ⇒ minusul întâi (pesimist)", () => {
  const r = GS.simuleaza(B, ST, O), o = r.orizonturi[2];
  assert.ok(o.maxJos.p50 <= o.p50); assert.ok(o.maxJos.p5 <= o.maxJos.p50);
  const p = GS.simuleaza(B, ST, Object.assign({}, O, { plan: { minus: 0.000001, plus: 0.000001 }, orizonturi: [7] })).orizonturi[0].plan;
  assert.equal(p.pRau, 1); assert.equal(p.p, 0, "amândouă pe prima bară ⇒ minusul câștigă");
  assert.match(functie(citeste("public", "lib", "grid-sim.js"), "simuleaza"), /tr\.min\[/); assert.match(functie(citeste("public", "lib", "grid-sim.js"), "simuleaza"), /tr\.max\[/);
});

// ---------------- (3) funding-ul real ----------------
await test("(3a) simulatorul: funding-ul cu SEMN după poziție - long plătește (Ql), short încasează (Qs) la rată pozitivă; rată negativă invers", () => {
  const l = GP.simuleaza(B, 0, 672, Object.assign({}, ST, { fundingZi: 0.01 })), s = GP.simuleaza(B, 0, 672, { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "short", suma: 50, stop: null, fundingZi: 0.01 });
  assert.ok(l.funding > 0, "long plătește"); assert.ok(s.funding < 0, "short încasează: " + s.funding);
  const s0 = GP.simuleaza(B, 0, 672, { jos: 0.9, sus: 1.1, grile: 10, levier: 2, dir: "short", suma: 50, stop: null });
  assert.ok(Math.abs((s0.net - s.net) - s.funding) < 1e-12, "net-ul shortului crește cu ce încasează");
  assert.ok(GP.simuleaza(B, 0, 672, Object.assign({}, ST, { fundingZi: -0.01 })).funding < 0, "rată negativă: longul încasează");
});
await test("(3b) gsRataFunding(rates Pionex): media ratelor din ultimele 7 zile × perioade pe zi; intervalul din timpii ratelor; lipsă ⇒ null", () => {
  const T0 = Date.UTC(2026, 9, 7, 12), rates8 = Array.from({ length: 40 }, (_, i) => ({ fundingTime: T0 - i * 8 * 3600000, fundingRate: 0.0001 }));
  const r = G.gsRataFunding(rates8, T0); assert.equal(r.intervalOre, 8); assert.ok(Math.abs(r.rataZi - 0.0003) < 1e-12); assert.equal(r.zile, 7); assert.equal(r.n, 21);
  const rates4 = Array.from({ length: 60 }, (_, i) => ({ fundingTime: T0 - i * 4 * 3600000, fundingRate: i % 2 ? 0.0002 : 0 }));
  const r4 = G.gsRataFunding(rates4, T0); assert.equal(r4.intervalOre, 4); assert.ok(Math.abs(r4.rataZi - 0.0001 * 6) < 1e-9);
  assert.equal(G.gsRataFunding([], T0), null); assert.equal(G.gsRataFunding(null, T0), null);
  assert.ok(G.gsRataFunding([{ fundingTime: T0, fundingRate: -0.0003 }, { fundingTime: T0 - 8 * 3600000, fundingRate: -0.0003 }], T0).rataZi < 0, "rata negativă rămâne negativă");
});
await test("(3c) pagina: funding-ul real se aduce o dată pe monedă (pionex_funding) când câmpul nu e scris de mână; câmpul și nota arată sursa", () => {
  assert.match(functie(E, "gsSimuleaza"), /gsAduFunding\(/); assert.match(functie(E, "gsAduFunding"), /type=pionex_funding/); assert.match(functie(E, "gsAduFunding"), /gsRataFunding\(/);
  assert.match(functie(E, "gsCiteste"), /fundingSursa = "manual"/);
  const s = { mod: "nou", boti: [], sim: "PONS", st: { jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50, stop: { sus: 0.43 }, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: -0.00012, fundingSursa: "pionex", fundingInfo: { rataZi: -0.00012, intervalOre: 8, zile: 7, n: 21 }, pornitLa: null, rez: null, oriz: 2 };
  const h = G.gsFormHtml(s);
  assert.match(h, /<input id="gsFunding"[^>]*value="-0\.012"/); assert.match(h, /funding-ul real Pionex: −0,012% pe zi \(media ultimelor 7 zile, la 8 h\) · long plătește, short încasează/);
  assert.match(G.gsFormHtml(Object.assign({}, s, { fundingSursa: "manual" })), /funding scris de tine/);
  assert.match(G.gsFormHtml(Object.assign({}, s, { fundingSursa: null, fundingZi: 0.0003 })), /cost fix presupus/);
});

// ---------------- (1) variantele și TP-ul pe Simulator grid ----------------
await test("(1a) mcsCalcVariante / mcsCalcTinteBot primesc orizontul (o.zile); mcsVarHtml / mcsTpHtml primesc acțiunea butonului", () => {
  const b = bare15(20, 3, 0.012), st = { jos: 0.95, sus: 1.03, grile: 10, levier: 2, dir: "long", suma: 50, stop: { jos: 0.9 }, tp: null, botulTau: false };
  const rows = G.mcsCalcVariante(b, st, 1, { n: 30, zile: 3 }); assert.equal(rows[0].g.zile, 3); assert.equal(rows[1].g.zile, 3);
  const t = G.mcsCalcTinteBot(b, st, 1, { n: 30, zile: 3 }); assert.equal(t[1].g.zile, 3);
  assert.equal(G.mcsCalcVariante(b, st, 1, { n: 30 })[0].g.zile, 7, "implicit 7, ca în Monte Carlo");
  assert.match(G.mcsVarHtml({ setari: st }, "gsCompara()"), /data-action-click="gsCompara\(\)"/); assert.match(G.mcsVarHtml({ setari: st }), /data-action-click="mcsCompara\(\)"/);
  assert.match(G.mcsTpHtml({ setari: st }, "gsComparaTp()"), /data-action-click="gsComparaTp\(\)"/); assert.match(G.mcsTpHtml({ setari: st }), /data-action-click="mcsComparaTp\(\)"/);
  assert.match(G.mcsVarHtml({ setari: st, variante: rows }, "gsCompara()", 3), /Aceleași drumuri, 7 variante · 3 zile/);
});
await test("(1b) pagina Simulator grid: după rezultat, secțiunea „Alte setări, pe aceleași drumuri” cu cele două butoane; starea ei se golește la o simulare nouă", () => {
  const oz = { zile: 7, bare: 672, pCastig: 0.5, pPierde: 0.5, pZero: 0, marja: 4, p5: -9, p50: 1, p95: 8, hist: { lo: -10, hi: 10, n: 40, c: Array(24).fill(1) }, pLich: 0, pStop: 0.3, pTp: 0, pIesire: 1, perechi: 100, maxJos: { p50: -4, p5: -9 }, funding: 0.1, plan: null };
  const s = { mod: "nou", boti: [], sim: "PONS", st: { jos: 0.37, sus: 0.42, grile: 34, levier: 3, dir: "short", suma: 50, stop: { sus: 0.43 }, tp: null, tip: "geometric" }, plan: { minus: null, plus: null }, fundingZi: 0.0003, pornitLa: null, rez: { n: 40, zile: 14, zileIstoric: 20, suma: 50, acum: null, orizonturi: [oz, oz, oz, oz] }, oriz: 2 };
  const h = G.gsHtml(s);
  assert.match(h, /Alte setări, pe aceleași drumuri/); assert.match(h, /data-action-click="gsCompara\(\)"/); assert.match(h, /data-action-click="gsComparaTp\(\)"/);
  assert.match(functie(E, "gsCompara"), /mcsCalcVariante\(/); assert.match(functie(E, "gsCompara"), /GS_ORIZ\[gsStare\.oriz\]/); assert.match(functie(E, "gsComparaTp"), /mcsCalcTinteBot\(/);
  assert.match(functie(E, "gsSimuleaza"), /gsStare\.variante = null/);
});

// ---------------- (2) „Simulează” din Tablou ----------------
await test("(2a) Tabloul are butonul „⚄ Simulează” (vizibil când e un bot ales), iar gsDeschideBot deschide pagina pe botul acela și simulează", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js");
  assert.match(html, /<button type="button" class="t212BtnLinie tbSimBtn" id="tbSimBtn" data-action-click="gsDeschideBot\(\)" hidden>⚄ Simulează<\/button>/);
  assert.match(functie(app, "tbDeseneazaTvCod"), /tbSimBtn/);
  const f = functie(E, "gsDeschideBot");
  assert.match(f, /navTo\("gridsim", true\)/); assert.match(f, /gsAlegeBot\(/); assert.match(f, /gsSimuleaza\(\)/); assert.match(f, /tbStare\.bot/);
});

await test("(E) versiunea de la v100.135 în sus (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1(3[5-9]|[4-9]\d)"/); assert.match(html, /id="antetVersiune">v100\.1(3[5-9]|[4-9]\d) /); assert.match(html, /id="healthAppVersion">v100\.1(3[5-9]|[4-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(3[5-9]|[4-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(3[5-9]|[4-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(3[5-9]|[4-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(3[5-9]|[4-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
