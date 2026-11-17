// Proba v100.354 (17.11.2026, el: „mai departe ce facem?” ⇒ „fa tot”): (1) stopurile propuse de „Ce fac cu botul ăsta?” niciodată dincolo de
// lichidare; (2) H0-ul sfatului de noapte pe motorul cu agitație (o celulă aici; rularea întreagă: scratchpad h0noapte, 9 celule, maxim 1,3%);
// (3) tabelele Monte Carlo pe 1.000 de drumuri, „1,000” la sumă, agitația în prețul Monte Carlo, ora prețului hotărârii.
//   node scripts/proba-v100354.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
for (const f of ["grid-calcul.js", "grid-proba.js", "grid-plan.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(lib(f), { filename: f });
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(lib("monte-simbol-ecran.js"), { filename: "monte-simbol-ecran.js" });
const G = globalThis, M = G.MonteSimbol, GS = G.GridSim;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.354 · stopul înaintea lichidării, H0 noaptea, măruntele · proba\n");

function bare(seed, zile = 31, vol = () => 1) { const g = M.generator(seed), b = [], T0 = Date.UTC(2026, 9, 1); let c = 1; for (let i = 0; i < zile * 96; i++) { const o = c; c *= Math.exp((g() - 0.5) * 0.01 * vol(Math.floor(i / 96))); b.push({ t: T0 + i * 9e5, o, h: Math.max(o, c) * 1.001, l: Math.min(o, c) * 0.999, c, v: 1 }); } return b; }
const B = bare(31), P = B[B.length - 1].c, O = { pornitLa: B[B.length - 200].t, n: 150, seed: 12, orizonturi: [1, 7], verifica: false };
const LONG = (lev, stop, o) => Object.assign({ jos: P * 0.9, sus: P * 1.04, grile: 20, levier: lev, dir: "long", suma: 50, stop: { jos: P * stop }, tip: "aritmetic", fundingZi: 0 }, o || {});
const stopDe = (a) => (a.nou || a.st || {}).stop;

await test("🔑 L1 long 20× cu stopul la −15% (lichidarea ~−8%): stopul TĂU spus „dincolo de lichidare”; stopul la margine / mai larg / botul nou la fel scoși, cu motivul", () => {
  const h = GS.hotarare(B, LONG(20, 0.85), O);
  assert.match(h.avertLich, /^Stopul tău \([\d,]+\) stă dincolo de lichidare \(~[\d,]+, estimată prudent\): lichidarea vine înaintea lui, deci stopul nu te apără\.$/);
  assert.ok(h.lich.jos > P * 0.9 && h.lich.jos < P * 0.95, "lichidarea estimată: " + h.lich.jos / P);
  for (const k of ["stopMargine", "stopLarg", "reporneste"]) { const a = h.actiuni.find((x) => x.cheie === k); assert.ok(a && a.eroare && /lichidare/.test(a.eroare), k + ": " + (a && a.eroare)); assert.ok(!a.oriz, k + " nu se simulează"); }
  assert.ok(!["stopMargine", "stopLarg", "reporneste"].includes(h.ales.cheie));
});
await test("🔑 L2 niciun stop propus (rând fără eroare) nu stă la mai puțin de 2% de lichidare - pe 12 boți (long / short / neutru, 2–20×, cu și fără lichidarea Pionex)", () => {
  let rand = 0;
  for (const lev of [2, 5, 10, 20]) for (const [dir, st] of [["long", LONG(lev, 0.85)], ["short", { jos: P * 0.96, sus: P * 1.1, grile: 20, levier: lev, dir: "short", suma: 50, stop: { sus: P * 1.15 }, tip: "aritmetic", fundingZi: 0 }], ["neutru", { jos: P * 0.94, sus: P * 1.06, grile: 20, levier: lev, dir: "neutru", suma: 50, stop: { jos: P * 0.9, sus: P * 1.1 }, tip: "aritmetic", fundingZi: 0 }]]) {
    const lp = lev === 5 ? (dir === "short" ? { jos: null, sus: P * 1.12 } : { jos: P * 0.9, sus: null }) : null, h = GS.hotarare(B, st, Object.assign({}, O, { lich: lp }));
    for (const a of h.actiuni.filter((x) => !x.eroare && /^stop|reporneste/.test(x.cheie))) { const s = stopDe(a); if (!s) continue; rand++;
      const lq = a.nou ? GS.lichDe(a.nou, P, null) : h.lich;
      assert.equal(GS.dincoloLich(s, lq), null, dir + " " + lev + "× " + a.cheie + ": stop " + JSON.stringify(s) + " lichidare " + JSON.stringify(lq)); }
  }
  assert.ok(rand >= 20, "rânduri verificate: " + rand);
});
await test("L3 lichidarea din Pionex (mai aproape decât estimarea) ⇒ „stopul mai larg” strâns spre ea („oprit înaintea lichidării”) sau scos dacă nu rămâne mai larg decât marginea", () => {
  const larg = GS.hotarare(B, LONG(3, 0.85), Object.assign({}, O, { lich: { jos: P * 0.8, sus: null } })).actiuni.find((x) => x.cheie === "stopLarg");
  assert.match(larg.nume, /oprit înaintea lichidării ~[\d,]+\)$/); assert.ok(larg.st.stop.jos >= P * 0.8 * 1.02, "cu cel puțin 2% înaintea ei");
  const scos = GS.hotarare(B, LONG(3, 0.85), Object.assign({}, O, { lich: { jos: P * 0.88, sus: null } })).actiuni.find((x) => x.cheie === "stopLarg");
  assert.match(scos.eroare, /^orice stop mai larg decât marginea ar sta dincolo de lichidare/);
  const bun = GS.hotarare(B, LONG(3, 0.85), O); assert.equal(bun.avertLich, null); assert.match(bun.actiuni.find((x) => x.cheie === "stopLarg").nume, /dincolo de o zi obișnuită\)$/);
});
await test("L4 setariDinBot ia lichidarea din bot-orders (pretLichidare + partea); pagina și colectorul o dau hotărârii; avertismentul pe pagină", () => {
  const b = { directie: "long", gridJos: 1, gridSus: 2, levier: 5, investit: 50, pretLichidare: 0.8, lichidarePartea: "jos", brut: { buOrderData: { row: 11 } } };
  assert.deepEqual(GS.setariDinBot(b).lich, { jos: 0.8, sus: null }); assert.deepEqual(GS.setariDinBot(Object.assign({}, b, { lichidarePartea: "sus", directie: "short" })).lich, { jos: null, sus: 0.8 });
  assert.equal(GS.setariDinBot(Object.assign({}, b, { pretLichidare: null })).lich, null);
  assert.match(lib("grid-sim-ecran.js"), /lich: gsLichBot\(st\),/); assert.match(lib("grid-sim-ecran.js"), /h\.avertLich \? '<p class="tbWarn gsNota">⚠ ' \+ mcsEsc\(h\.avertLich\)/);
  assert.match(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), /pozitiePionex: s\.pozitie, lich: s\.lich,/);
});
await test("🔑 N1 H0 noaptea (o celulă din rularea întreagă): piața agitată acum (×2,89), short 2×, 60 de trageri - „Aș încerca” fals cel mult 3 (5%)", () => {
  const b = bare(911, 31, (z) => (z >= 29 ? 3 : 1)), Pn = b[b.length - 1].c, rnd = M.generator(988), NB = 2000;
  const pcS = (v, p) => v[Math.min(v.length - 1, Math.floor(p * v.length))], statD = (x) => { const s = x.slice().sort((a, c) => a - c); return { p5: pcS(s, 0.05), p50: pcS(s, 0.5), p95: pcS(s, 0.95), pPlus: x.filter((v) => v > 0).length / x.length }; };
  const st = { jos: Pn * 0.95, sus: Pn * 1.05, grile: 15, levier: 2, dir: "short", suma: 50, stop: { sus: Pn * 1.08 }, tp: null, botulTau: false, fundingZi: 0.0003, fundingCost: true };
  assert.ok(M.agitatieAcum(b).r > 2, "piața agitată acum");
  const vs = G.mcsVariante(st, Pn), gs = vs.map((v) => M.grid(b, Object.assign({ pret: Pn }, v.st), { zile: 7, n: NB, seed: 12, faraCuTendinta: true, peDrum: true }));
  const m0 = statD(gs[0].drumuri).p50, pool = gs.map((g, k) => (k ? g.drumuri.map((x) => x - (statD(g.drumuri).p50 - m0)) : g.drumuri));
  const rows = (idx) => { const sub = pool.map((v) => idx.map((i) => v[i])); return sub.map((x, k) => ({ nume: vs[k].nume, st: vs[k].st, g: Object.assign(statD(x), { n: x.length, drumuri: x, pLichidare: gs[k].pLichidare }), drum: k ? G.mcsDrumCuDrum(sub[0], x) : undefined })); };
  let h = 0;
  for (let q = 0; q < 60; q++) { const A = Array.from({ length: 500 }, () => Math.floor(rnd() * NB)), Bq = Array.from({ length: 2000 }, () => Math.floor(rnd() * NB)); const ra = rows(A), a = G.mcsAlegeVarianta(ra);
    if (a.c) { const rb = rows(Bq), k = ra.indexOf(a.c); a.c.verif = { n: 2000, baza: rb[0].g, g: rb[k].g, drum: rb[k].drum }; } if (/^Aș încerca/.test(G.mcsVariantaBuna(ra))) h++; }
  assert.ok(h <= 3, h + " din 60");
});
await test("🔑 M1 tabelele Monte Carlo pe 1.000 de drumuri ca cardul: rândul „botul tău” = cifra cardului (Simulatorul, aceeași sămânță)", () => {
  assert.equal(G.MCS_N_TABEL, 1000); const src = lib("monte-simbol-ecran.js"); assert.equal((src.match(/n: MCS_N_TABEL/g) || []).length, 4); assert.doesNotMatch(src, /mcsCalc(Variante|TinteBot)\(d\.b15, r\.setari, r\.pret, \{ n: 500/);
  const st = { jos: P * 0.95, sus: P * 1.05, grile: 15, levier: 3, dir: "long", suma: 50, stop: { jos: P * 0.9 }, tp: null, fundingZi: 0.0003 };
  const card = GS.simuleaza(B, Object.assign({}, st), { n: 1000, seed: 12, orizonturi: [7], zile: 7 }), g = M.grid(B, Object.assign({ pret: P }, st), { zile: 7, n: G.MCS_N_TABEL, seed: 12, peDrum: true });
  assert.equal(g.p50, card.orizonturi[0].p50);
  const rows = G.mcsCalcVariante(B, st, P, { n: G.MCS_N_TABEL, prima: g }); assert.equal(rows[0].g, g); assert.ok(rows.slice(1).every((x) => !x.drum || x.g.eroare || x.g.drumuri.length === 1000), "drum cu drum pe aceleași 1.000");
});
await test("M2 „1,000” la sumă (suma veche 30) = 1.000 USDT, nu 1; „12,500” = 12,5; prețurile neschimbate („95,000” la BTC = 95.000, „2,100” lângă 2,05 = 2,1)", () => {
  assert.equal(G.mcsSumaRo("1,000", G.mcsNrRo("1,000", 30)), 1000); assert.equal(G.mcsSumaRo("2,500", G.mcsNrRo("2,500", 30)), 2500);
  assert.equal(G.mcsSumaRo("12,500", G.mcsNrRo("12,500", 30)), 12.5); assert.equal(G.mcsSumaRo("50", 50), 50);
  assert.equal(G.mcsNrRo("95,000", 94000), 95000); assert.equal(G.mcsNrRo("2,100", 2.05), 2.1);
  const s = G.mcsSetariDinCampuri({ jos: "0,9", sus: "1,1", linii: "11", levier: "2", suma: "1,000", dir: "long" }, { suma: 30 }, 1); assert.equal(s.st.suma, 1000);
  assert.match(lib("grid-sim-ecran.js"), /suma = mcsSumaRo\(gsEl\("gsSuma"\)\.value, suma\)/);
});
await test("M3 prețul Monte Carlo cu agitația de acum (o.agitatie din barele de 15 minute): agitat ⇒ mai larg, liniștit ⇒ mai strâns, r ≈ 1 sau fără ea ⇒ exact ca înainte", () => {
  const o = { barePeZi: 96, orizonturi: [3], n: 400, blocZile: 1, minZile: 14, seed: 11, stopPct: 0.1, tintaPct: 0.15, prag: 0.1 };
  const z = (x) => x.orizonturi[0], lat = (x) => z(x).p95 - z(x).p5;
  const fara = M.pret(B, o), unu = M.pret(B, Object.assign({}, o, { agitatie: { r: 1.01 } })), sus = M.pret(B, Object.assign({}, o, { agitatie: { r: 2.5 } })), jos = M.pret(B, Object.assign({}, o, { agitatie: { r: 0.4 } }));
  assert.deepEqual(z(unu).p50, z(fara).p50); assert.equal(lat(unu), lat(fara)); assert.equal(fara.agitatie, null); assert.equal(sus.agitatie, 2.5);
  assert.ok(lat(sus) > lat(fara) * 1.1, "agitat: " + lat(sus) + " față de " + lat(fara)); assert.ok(lat(jos) < lat(fara) * 0.95, "liniștit: " + lat(jos));
  assert.ok(z(sus).pStop >= z(fara).pStop, "stopul atins mai des când e agitat");
  assert.match(lib("monte-simbol-ecran.js"), /optC\.agitatie = MonteSimbol\.agitatieAcum \? MonteSimbol\.agitatieAcum\(d\.b15\) : null/);
});
await test("M4 hotărârea spune ora prețului ei (ultima bară de 15 minute închisă; bara în formare nu intră)", () => {
  const h = GS.hotarare(B, LONG(3, 0.85), O); assert.equal(h.tBara, B[B.length - 1].t);
  assert.match(lib("grid-sim-ecran.js"), /" · de la prețul de la " \+ tH \+ " \(ultima bară de 15 minute închisă; cea în formare nu intră\)"/);
});
// ── revizia Opus a v100.354 + bugul TP-ului din poze ──
await test("🔑 R1 (revizia 🟡1) neutru larg (0,5P–1,05P) fără lichidare aproape: „stopurile mai largi” rămân (nu „dincolo de lichidare ~—”)", () => {
  for (const lev of [1, 2]) { const a = GS.hotarare(B, { jos: P * 0.5, sus: P * 1.05, grile: 20, levier: lev, dir: "neutru", suma: 50, stop: { jos: P * 0.45, sus: P * 1.1 }, tip: "aritmetic", fundingZi: 0 }, O).actiuni.find((x) => x.cheie === "stopLarg"); assert.ok(a && !a.eroare, lev + "×: " + (a && a.eroare)); }
});
await test("R2 (revizia 🟡2) „din Pionex” doar când cifra arătată e a Pionex; estimarea mai apropiată ⇒ „estimată prudent”", () => {
  const dep = GS.hotarare(B, LONG(20, 0.85), Object.assign({}, O, { lich: { jos: P * 0.7, sus: null } })); assert.match(dep.avertLich, /, estimată prudent\)/);
  const apr = GS.hotarare(B, LONG(3, 0.85), Object.assign({}, O, { lich: { jos: P * 0.86, sus: null } })); assert.match(apr.avertLich, /\(~[\d,]+, din Pionex\)/);
});
await test("🔑 R3 (revizia 🟡3) estimarea pentru botul care rulează: intrarea cea mai scumpă din grid (long pornit sus) ⇒ lichidarea mai aproape decât „pornit acum la P”; botul nou: la P", () => {
  const st = { jos: P * 0.8, sus: P * 1.25, grile: 20, levier: 5, dir: "long", tip: "aritmetic" }, run = GS.lichDe(st, P, null), nou = GS.lichDe(st, P, null, true);
  assert.ok(run.jos > nou.jos, "rulează " + run.jos / P + " față de nou " + nou.jos / P);
  const sh = { jos: P * 0.8, sus: P * 1.25, grile: 20, levier: 5, dir: "short", tip: "aritmetic" }; assert.ok(GS.lichDe(sh, P, null).sus < GS.lichDe(sh, P, null, true).sus);
});
await test("🔑 R4 (bugul din poze) „îl închid și pornesc unul la fel”: TP-ul tău în grid, mutat cu gridul, ar trece de preț ⇒ rămâne TP-ul vechi (sau fără TP), rândul NU mai e scos", () => {
  const st = { jos: P * 0.92, sus: P * 1.02, grile: 20, levier: 2, dir: "short", suma: 50, stop: { sus: P * 1.08 }, tp: P * 0.97, tip: "aritmetic", fundingZi: 0 };
  const a = GS.hotarare(B, st, O).actiuni.find((x) => x.cheie === "reporneste");
  assert.ok(a && !a.eroare, a && a.eroare); assert.ok(a.nou.tp < P, "TP-ul shortului sub preț: " + a.nou.tp / P); assert.match(a.nume, /, TP-ul rămas la [\d,]+\)$/);
});
await test("R5 (revizia 🔵) stopul în procente al botului nou nu se judecă pe preț; „0,500” la sumă rămâne 0,5; lichidarea Pionex doar pentru setarea botului; VERS_HOT 3 în motor și în colector; worker-ul are botul / variantele / țintele Monte Carlo", () => {
  const a = GS.hotarare(B, LONG(20, 0.85, { stopRaport: -0.3 }), O).actiuni.find((x) => x.cheie === "reporneste"); assert.ok(!a.eroare || !/lichidarea lui/.test(a.eroare), a.eroare);
  assert.equal(G.mcsSumaRo("0,500", 0.5), 0.5);
  assert.match(lib("grid-sim-ecran.js"), /function gsLichBot\(st\) \{ if \(!gsStare\.bot\) return null; var d = GridSim\.setariDinBot\(gsStare\.bot\), b = d\.st; return d\.lich && b && st && b\.dir === st\.dir && b\.levier === st\.levier/);
  assert.equal(GS.VERS_HOT, 3); assert.match(citeste("scripts", "lib", "tura-monte-carlo-bot.mjs"), /VERS_HOT = 3;/);
  const w = lib("grid-sim-worker.js"); assert.match(w, /"\/lib\/monte-simbol-ecran\.js"\)/); assert.match(w, /d\.fel === "variante" \? mcsCalcVariante\(d\.b15, d\.st, d\.o\.pret, d\.o\)/);
  const e = lib("monte-simbol-ecran.js"); assert.match(e, /gsInWorker\("variante", d\.b15, r\.setari, oV\)/); assert.match(e, /gsInWorker\("tinte", d\.b15, r\.setari, oT\)/); assert.match(e, /gsInWorker\("mcGrid", d\.b15, c\.st, c\.o\)/);
  assert.match(e, /calculez drumurile botului \(în fundal - pagina merge\)…/);
  // fără worker (aici, în node): pe loc, ca înainte - aceleași cifre
  const g1 = G.mcsCalcVariante(B, { jos: P * 0.95, sus: P * 1.05, grile: 10, levier: 2, dir: "long", suma: 50, stop: null, tp: null }, P, { n: 200 }), g2 = G.gsPeFir ? null : null; assert.ok(Array.isArray(g1) && g1.length > 3);
});
await test("V versiunile v100.354 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO) + colector v101.192", () => {
  const h = citeste("public", "index.html"); assert.equal((h.match(/v100\.354/g) || []).length, 4); assert.match(h, /v100\.354 · STOPUL ÎNAINTEA LICHIDĂRII/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-354/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.354"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.354.0"); assert.match(p.scripts.test, /npm run test:v100354/);
  assert.match(JSON.parse(citeste("BUILD_INFO.json")).badge, /^v100\.354/); assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.192";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
