// Proba v100.128 (07.10, el: „fă montecarlo să facă și analiza pe un coin sau stock ales” → „toate trei” → „da” pe demo
// https://claude.ai/artifact/LBAQV8R6oHipZgjrHnMRSh): modulul pur MonteSimbol (prețul fără tendința perioadei, botul grid cu
// GridProba.simuleaza, istoria lui) și caseta din pagina Monte Carlo (monte-simbol-ecran.js).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "actiuni-semnale.js", "risc-luna.js", "t212.js", "monte-simbol.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
const M = globalThis.MonteSimbol;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.128 · Monte Carlo pe un coin sau un stock ales · proba\n");
const ZI = 864e5;
// bare zilnice: pași de +1% / −1% alternativ (medie ~0), cu o zi mare de −20% la mijloc
function bareZi(n, pas) { const b = []; let c = 100; for (let i = 0; i < n; i++) { const o = c; c = i === Math.floor(n / 2) ? c * 0.8 : c * (1 + (i % 2 ? -pas : pas)); b.push({ t: i * ZI, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 1 }); } return b; }

await test("(1) drumul: bucăți reale lipite, rescalate să continue de la prețul curent (gap-urile dintre zile păstrate); aceeași sămânță ⇒ același drum", () => {
  const b = bareZi(60, 0.01), g1 = M.generator(7), g2 = M.generator(7);
  const d1 = M.drum(b, 10, 5, 200, g1), d2 = M.drum(b, 10, 5, 200, g2);
  assert.equal(d1.length, 10); assert.deepEqual(d1, d2);
  assert.ok(Math.abs(d1[0].o / 200 - 1) < 0.03, "pornește de la prețul dat (cu gap-ul real al primei zile)");
  for (let i = 1; i < d1.length; i++) assert.ok(d1[i].o > 0 && d1[i].h >= Math.max(d1[i].o, d1[i].c) - 1e-9 && d1[i].l <= Math.min(d1[i].o, d1[i].c) + 1e-9);
  const g3 = M.generator(8); assert.notDeepEqual(M.drum(b, 10, 5, 200, g3), d1);
});
await test("(2) prețul: percentile crescătoare, frecvențele în [0,1] și pStop + pTinta + pNiciuna = 1; în aceeași zi stopul ȘI ținta ⇒ stopul (pesimist)", () => {
  const b = bareZi(300, 0.01), r = M.pret(b, { orizonturi: [7, 30], n: 800, bloc: 5, seed: 3, stopPct: 0.05, tintaPct: 0.05, prag: 0.1 });
  assert.equal(r.orizonturi.length, 2);
  for (const o of r.orizonturi) {
    assert.ok(o.p5 <= o.p25 && o.p25 <= o.p50 && o.p50 <= o.p75 && o.p75 <= o.p95, JSON.stringify(o));
    assert.ok(Math.abs(o.pStop + o.pTinta + o.pNiciuna - 1) < 1e-9);
    for (const k of ["pSus", "pJos", "pStop", "pTinta"]) assert.ok(o[k] >= 0 && o[k] <= 1, k);
  }
  assert.ok(r.orizonturi[1].pStop + r.orizonturi[1].pTinta >= r.orizonturi[0].pStop + r.orizonturi[0].pTinta - 1e-9, "pe mai multe zile, atins mai des");
  // o zi care atinge ambele (h ≥ țintă și l ≤ stop) se numără la stop
  const b2 = [{ t: 0, o: 100, h: 100, l: 100, c: 100 }].concat(Array.from({ length: 20 }, (_, i) => ({ t: (i + 1) * ZI, o: 100, h: 110, l: 90, c: 100 })));
  const r2 = M.pret(b2, { orizonturi: [1], n: 50, bloc: 1, seed: 1, stopPct: 0.05, tintaPct: 0.05, minZile: 10 });
  assert.equal(r2.orizonturi[0].pStop, 1);
  assert.equal(r.zileIstoric, 300); assert.equal(r.n, 800);
});
await test("(3) prețul: puțin istoric ⇒ eroare spusă (nu cifre din 10 zile)", () => {
  assert.match(M.pret(bareZi(20, 0.01), { orizonturi: [7], n: 100 }).eroare, /prea puțin istoric/i);
});
await test("(3b) monedă nouă: prețul pe bare de 15 minute (barePeZi 96), orizontul în zile; istoricul sub 3× orizontul ⇒ „scurt”", () => {
  const b = []; let c = 1; for (let i = 0; i < 31 * 96; i++) { const o = c; c = o * (1 + Math.sin(i / 9) * 0.003); b.push({ t: i * 9e5, o, h: Math.max(o, c), l: Math.min(o, c), c, v: 1 }); }
  const r = M.pret(b, { barePeZi: 96, orizonturi: [7, 30], n: 200, blocZile: 1, minZile: 14, seed: 2 });
  assert.equal(r.zileIstoric, 31); assert.equal(r.orizonturi[0].H, 7); assert.equal(r.orizonturi[0].scurt, false); assert.equal(r.orizonturi[1].scurt, true);
  assert.match(M.pret(b.slice(0, 10 * 96), { barePeZi: 96, orizonturi: [7], n: 10, minZile: 14 }).eroare, /10 zile/);
});
await test("(3c) fără tendință (implicit): o lună care a scăzut 50% nu se „prezice” mai departe - mediana ~0; cu tendința lunii se spune separat", () => {
  const b = []; let c = 1; for (let i = 0; i < 31 * 96; i++) { const o = c; c = o * Math.exp(-Math.log(2) / (31 * 96)) * (1 + Math.sin(i / 5) * 0.004); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); }
  const r = M.pret(b, { barePeZi: 96, orizonturi: [7], n: 300, blocZile: 1, minZile: 14, seed: 4 });
  assert.ok(Math.abs(r.orizonturi[0].p50) < 0.02, "fără tendință: mediana ~0, nu " + r.orizonturi[0].p50);
  assert.ok(r.orizonturi[0].cuTendinta.p50 < -0.08, "cu tendința lunii: " + r.orizonturi[0].cuTendinta.p50);
  assert.ok(r.tendintaPeZi < -0.015, String(r.tendintaPeZi));
  const d = M.drum(b, 96, 96, 1, M.generator(1), 0), e = M.drum(b, 96, 96, 1, M.generator(1));
  assert.deepEqual(d, e, "mu = 0 ⇒ drumul de dinainte");
});
await test("(4) botul grid: aceeași simulare ca fișa (GridProba.simuleaza) pe drumuri de 15 minute; lichidările, ieșirile, rezultatul în USDT", () => {
  // 15 min: 40 de zile, o oscilație mică ⇒ grid larg nu se lichidează; un grid strâns cu levier mare ⇒ lichidări pe zilele mari
  const b = []; let c = 1; for (let i = 0; i < 40 * 96; i++) { const o = c; c = o * (1 + Math.sin(i / 7) * 0.002) * (i % 960 === 500 ? 0.85 : 1); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); }
  const larg = M.grid(b, { jos: 0.5, sus: 1.6, grile: 20, levier: 1, dir: "long", suma: 100 }, { zile: 7, n: 200, seed: 5 });
  const strans = M.grid(b, { jos: 0.97, sus: 1.03, grile: 20, levier: 20, dir: "long", suma: 100 }, { zile: 7, n: 200, seed: 5 });
  assert.equal(larg.n, 200); assert.equal(larg.pLichidare, 0); assert.ok(strans.pLichidare > 0.2, String(strans.pLichidare));
  for (const k of ["pLichidare", "pIesire", "pStop"]) assert.ok(larg[k] >= 0 && larg[k] <= 1, k);
  assert.ok(larg.p5 <= larg.p50 && larg.p50 <= larg.p95); assert.ok(strans.p5 <= -90, "lichidarea = toată suma (−100 USDT)");
  assert.match(M.grid(b.slice(0, 96 * 3), { jos: 0.9, sus: 1.1, grile: 10, levier: 1, dir: "long", suma: 100 }, { zile: 7, n: 10 }).eroare, /prea puțin istoric/i);
});
await test("(4b) botul grid fără tendință (implicit): un short pe o lună care a căzut nu iese „bun” doar din cădere; cu tendința, separat", () => {
  const b = []; let c = 1; for (let i = 0; i < 31 * 96; i++) { const o = c; c = o * Math.exp(-Math.log(2) / (31 * 96)) * (1 + Math.sin(i / 5) * 0.004); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); }
  const st = { jos: 0.85, sus: 1.15, grile: 20, levier: 2, dir: "short", suma: 100, pret: 1 };
  const r = M.grid(b, st, { zile: 7, n: 150, seed: 6 });
  assert.ok(r.cuTendinta && r.cuTendinta.p50 > r.p50 + 3, "cu tendința (cădere) shortul iese mai bine: " + r.p50 + " vs " + (r.cuTendinta && r.cuTendinta.p50));
  assert.equal(r.faraTendinta, true);
});
await test("(5) istoria ta: o lună cu K cazuri trase din ale tale; sub 10 cazuri ⇒ „prea puține” + lista", () => {
  const l = Array.from({ length: 30 }, (_, i) => ({ t: i * ZI, r: (i % 3 === 0 ? -0.04 : 0.02), bani: (i % 3 === 0 ? -4 : 2) }));
  const r = M.istorie(l, { K: 4, n: 1000, seed: 9 });
  assert.equal(r.cazuri, 30); assert.ok(r.p5 <= r.p50 && r.p50 <= r.p95); assert.ok(r.pPlus >= 0 && r.pPlus <= 1);
  const p = M.istorie(l.slice(0, 6), { K: 4, n: 1000, seed: 9 }); assert.equal(p.putine, true); assert.equal(p.lista.length, 6);
  assert.equal(M.istorie([], { K: 4 }).cazuri, 0);
});
// ---------------- caseta din pagina Monte Carlo ----------------
await test("(6) simbolul curățat: litere mari, fără spații, doar caractere de simbol; altfel gol", () => {
  assert.equal(globalThis.mcsCurata(" pons "), "PONS"); assert.equal(globalThis.mcsCurata("rhm.de"), "RHM.DE");
  assert.equal(globalThis.mcsCurata("A<b>"), ""); assert.equal(globalThis.mcsCurata(""), "");
});
await test("(7) setările botului tău de pe coin: linii Pionex − 1 = intervale, stopul pe partea direcției; fără bot activ ⇒ null", () => {
  const bot = { activ: true, baza: "PONS.PERP", gridJos: 0.38, gridSus: 0.44, levier: 3, directie: "short", investit: 47.83, opritorPierdereActiv: true, opritorPierdere: 0.44, brut: { buOrderData: { row: 30 } } };
  assert.deepEqual(globalThis.mcsSetariBot([bot], "PONS"), { jos: 0.38, sus: 0.44, grile: 29, levier: 3, dir: "short", suma: 47.83, stop: { sus: 0.44 }, botulTau: true });
  assert.equal(globalThis.mcsSetariBot([Object.assign({}, bot, { activ: false })], "PONS"), null); assert.equal(globalThis.mcsSetariBot([bot], "LIT"), null);
  const p = globalThis.mcsSetariProba(0.5); assert.ok(p.jos < 0.5 && p.sus > 0.5 && p.grile > 0 && p.levier >= 1 && p.botulTau === false);
});
await test("(8) istoria: pe coin boții închiși de pe moneda aleasă (arhiva Pionex, ca pagina Riscului), pe stock trade-urile T212 închise (lei)", () => {
  const z = Date.UTC(2026, 9, 6);
  const arh = [{ base: "PONS.PERP", buOrderType: "futures_grid", createTime: z, closeTime: z + 36e5, buOrderData: { usdtInvestment: 45.92, totalRealizedProfit: 0.9618, trend: "SHORT", leverage: 3 } },
    { base: "LIT.PERP", buOrderType: "futures_grid", createTime: z, closeTime: z + 36e5, buOrderData: { usdtInvestment: 50, totalRealizedProfit: -2, trend: "LONG", leverage: 2 } }];
  const c = globalThis.mcsIstorieCoin(arh, "PONS", z + 2 * 36e5); assert.equal(c.l.length, 1); assert.ok(Math.abs(c.l[0].bani - 0.9618) < 1e-6); assert.equal(c.unit, "USDT"); assert.equal(c.K, 1);
  const u = [{ id: "1", ticker: "AAPL_US_EQ", simbol: "AAPL", t: z - 5 * 864e5, side: "BUY", qty: 2, pret: 100, net: 900, fee: 0 }, { id: "2", ticker: "AAPL_US_EQ", simbol: "AAPL", t: z, side: "SELL", qty: 2, pret: 110, net: 990, fee: 0 },
    { id: "3", ticker: "MSFT_US_EQ", simbol: "MSFT", t: z - 864e5, side: "BUY", qty: 1, pret: 1, net: 5, fee: 0 }, { id: "4", ticker: "MSFT_US_EQ", simbol: "MSFT", t: z, side: "SELL", qty: 1, pret: 1, net: 4, fee: 0 }];
  const s = globalThis.mcsIstorieStock(u, "AAPL", z + 36e5); assert.equal(s.unit, "lei"); assert.equal(s.l.length, 1); assert.equal(s.l[0].bani, 90);
  assert.equal(globalThis.mcsIstorieStock([], "AAPL", z).l.length, 0);
});
await test("(9) caseta: câmpul, Analizează, scurtăturile tale; rezultatele - prețul (2 orizonturi, stop/țintă), botul (doar coin), istoria (prea puține ⇒ lista), avertismentul; escapat, fără NaN", () => {
  let h = globalThis.mcsHtml({ sim: "", scurtaturi: ["PONS", "<x>"], rez: null });
  assert.match(h, /id="mcsSim"/); assert.match(h, /data-action-click="mcsAnalizeaza\(\)"/); assert.match(h, /data-action-click="mcsAlege\('PONS'\)"/); assert.doesNotMatch(h, /<x>/);
  const b = []; let c = 1; for (let i = 0; i < 31 * 96; i++) { const o = c; c = o * (1 + Math.sin(i / 7) * 0.003); b.push({ t: i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); }
  const pretMc = M.pret(b, { barePeZi: 96, orizonturi: [7, 30], n: 120, blocZile: 1, minZile: 14, seed: 1, stopPct: 0.1, tintaPct: 0.15 });
  const st = { jos: 0.9, sus: 1.1, grile: 20, levier: 2, dir: "long", suma: 50, botulTau: false };
  const grid = M.grid(b, st, { zile: 7, n: 60, seed: 2 });
  const rez = { sim: "PONS", tip: "coin", pret: b.at(-1).c, pretMc, setari: st, grid, ist: { l: [{ t: 1, bani: 1.2, ore: 3, dir: "short", lev: 3, inv: 45 }], unit: "USDT", K: 1, r: M.istorie([{ bani: 1.2 }], { K: 1, n: 50 }) }, nivelText: "−10% / +15%" };
  h = globalThis.mcsHtml({ sim: "PONS", scurtaturi: [], rez });
  for (const t of ["Încotro poate merge prețul", "Peste 7 zile", "Peste 30 de zile", "stopul întâi", "ținta întâi", "Un bot grid", "lichidare", "Istoria ta pe PONS", "Prea puține", "nu o predicție", "setări de probă"]) assert.ok(h.includes(t), t);
  assert.match(h, /id="mcsStop"/); assert.match(h, /id="mcsTinta"/); assert.match(h, /data-action-click="mcsResimuleaza\(\)"/);
  assert.doesNotMatch(h, /NaN|undefined/);
  h = globalThis.mcsHtml({ sim: "RHM.DE", scurtaturi: [], rez: Object.assign({}, rez, { sim: "RHM.DE", tip: "stock", grid: null, setari: null, ist: { l: [], unit: "lei", K: 1, r: { cazuri: 0 } } }) });
  assert.match(h, /Doar la coinuri/); assert.match(h, /N-ai tranzacții închise pe RHM\.DE/);
  assert.match(globalThis.mcsHtml({ sim: "ZZZ", scurtaturi: [], eroare: "Nu găsesc <ZZZ>" }), /Nu găsesc &lt;ZZZ&gt;/);
});
await test("(9b) stock scris fără bursă (RHM): caută în lista Salt chiar dacă pagina Salt n-a fost deschisă (o aduce o dată); textul de așteptare spune cât durează", async () => {
  const f = citeste("public", "lib", "monte-simbol-ecran.js");
  assert.match(f, /fetch\("\/data\/salt-univers\.json"\)/); assert.match(f, /mcsStare\.univers/);
  assert.match(globalThis.mcsHtml({ sim: "PONS", inLucru: true }), /~15 secunde/);
});
await test("(10) pagina: caseta deasupra „riscului tău”, scripturile după risc-ecran și în cache, navTo o desenează", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js"), sw = citeste("public", "sw.js");
  const i = html.indexOf('id="mcsPagina"'), j = html.indexOf('id="rlPagina"'); assert.ok(i > 0 && i < j, "deasupra raportului de risc");
  const a = html.indexOf('src="/lib/risc-ecran.js"'), b1 = html.indexOf('src="/lib/monte-simbol.js"'), b2 = html.indexOf('src="/lib/monte-simbol-ecran.js"'); assert.ok(a > 0 && b1 > a && b2 > b1);
  for (const f of ["/lib/monte-simbol.js", "/lib/monte-simbol-ecran.js"]) assert.ok(sw.includes('"' + f + '"'), f);
  assert.match(app, /if\(id==="montecarlo"\)\{if\(typeof rlPorneste==="function"\)rlPorneste\(false\);if\(typeof mcsDeseneaza==="function"\)mcsDeseneaza\(\)\}/);
});
await test("(E) versiunea v100.128 (colectorul neatins)", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.128"/); assert.match(html, /id="antetVersiune">v100\.128 /); assert.match(html, /id="healthAppVersion">v100\.128</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.128.0"); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-128";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.128"/); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.128");
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
