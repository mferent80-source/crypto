// Proba v100.269-g (ideile auditului 29.10 al Crypto Radar, felia G) - fișa gridului la H = 2–3 zile și marja Monte Carlo pe zile.
//  1. PORNEȘTE era imposibil din construcție la H = 2 / 3: pe ~1000 de bare de 15 min de test rămâneau 5, respectiv 3 ferestre independente (cer 10).
//     Acum, la H ≥ 2, proba fișei se face pe bare de 1 h pe ~6 luni (30 / 20 de ferestre independente de test), cu aceeași regulă, plus cerința ca
//     media pe ferestrele de test care nu se suprapun să se vadă peste zero (t ≥ 1,65) - sub H0 aceeași regulă singură zicea PORNEȘTE în 12,3% / 18,3%
//     (scripts/sim-h0-v100269.mjs; la H = 1, azi: 25,3%). Barele de după momentul fișei nu intră. Pagina (KV + Pionex 60M), colectorul (discul) și
//     contrafactualul (discul, altfel Pionex 60M până la pornire) dau barele.
//  2. Marja „pe zile” a Monte Carlo nu mai sare cu sămânța: P(1−P)·(1−ρ²)/D (fiecare zi distinctă = o observație, fără partea explicată de mișcarea
//     drumului, pe care drumurile o scot oricum). Semințele 12…20 o mută cu cel mult ~3 puncte; Tabloul (500) și Simulatorul (2000) se potrivesc.
// Bare SINTETICE (mulberry32); nicio cerere la Pionex.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = process.env.PROBA_RAD ? path.resolve(process.env.PROBA_RAD) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RADS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RADS, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), { filename: f });
const { GridCalcul: G, GridProba: GP, GridSim: GS, MonteSimbol: M } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  try { await f(); console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ").slice(0, 900)}`); }
}
console.log("\nV100.269-g · FIȘA LA 2–3 ZILE PE BARE DE 1 H + MARJA MONTE CARLO STABILĂ\n");

// ---------- monede sintetice: pași de 1 minut ⇒ bare de 15 min / 1 h / 4 h / 1 zi din ACELAȘI drum ----------
function mulberry32(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// mers aleator (martingală) cu agitația grupată opțional; osc > 0 ⇒ preț care oscilează în jurul lui 100 (un grid are avantaj)
function moneda(seed, zile, o = {}) {
  const rnd = mulberry32(seed), volZi = o.volZi || 0.035, n = zile * 1440, sMin = volZi / Math.sqrt(1440), T0 = Date.UTC(2026, 3, 1);
  const m1 = new Float64Array(n + 1); let p = 100, mult = 1, pana = 0, x = 0; m1[0] = p;
  for (let i = 1; i <= n; i++) {
    if (o.grupat && i >= pana) { mult = 0.5 + 2 * rnd() * rnd(); pana = i + Math.floor(1440 * (1 + 4 * rnd())); }
    const s = sMin * mult, z = Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    if (o.osc) { x = x * (1 - o.k) + s * z; m1[i] = 100 * Math.exp(o.osc * Math.sin(2 * Math.PI * (i + (o.faza || 0)) / (o.T || 360)) + x); }
    else { p = p * Math.exp(s * z - s * s / 2); m1[i] = p; }
  }
  const agr = (min) => { const out = []; for (let s = 0; s + min <= n; s += min) { let h = -Infinity, l = Infinity; for (let k = s; k <= s + min; k++) { const v = m1[k]; if (v > h) h = v; if (v < l) l = v; } out.push({ t: T0 + s * 60000, o: m1[s], h, l, c: m1[s + min], v: 1 }); } return out; };
  return { b15: agr(15).slice(-3000), b1h: agr(60), b4h: agr(240).slice(-300), b1d: agr(1440).slice(-200) };
}
const fisaDe = (m, H, extra = {}) => GP.fisa(Object.assign({ simbol: "SINT", pret: m.b15[m.b15.length - 1].c, b15: m.b15, b4h: m.b4h, b1d: m.b1d, suma: 100, H, dir: null, levier: null, minNotional: null }, extra));
const RW = moneda(101, 183), OSC = moneda(77, 183, { volZi: 0.01, osc: 0.015, k: 0.01, T: 360, faza: 120 });

// ================================ IDEEA 1 ================================
await test("1a GridCalcul.latimi pe bare de 1 h: fereastra = 24·H bare, una nouă la 6 h (6 bare); fără bz, ca înainte", () => {
  const b = RW.b1h, n = b.length;
  assert.equal(G.latimi(b, 2, 24).length, Math.floor((n - 48) / 6) + 1);
  assert.equal(G.latimi(b, 3, 24).length, Math.floor((n - 72) / 6) + 1);
  assert.equal(G.latimi(RW.b15, 2).length, Math.floor((RW.b15.length - 192) / 24) + 1);
});
await test("1b GridProba.proba pe ~6 luni de 1 h: 30 (H = 2) și 20 (H = 3) de ferestre independente de test; zilele și barele pe zi spuse", () => {
  const n = RW.b1h.length;
  for (const [H, ind] of [[2, 30], [3, 20]]) {
    const pr = GP.proba(RW.b1h, H, null, { barePeZi: 24 });
    assert.ok(pr, "proba pe 1 h a întors null");
    assert.equal(pr.barePeZi, 24);
    assert.equal(pr.ferestre.testIndependente, Math.floor((n - Math.round(n * 2 / 3)) / (24 * H)));
    assert.equal(pr.ferestre.testIndependente, ind);
    assert.ok(Math.abs(pr.zile - n / 24) < 1e-9, "zile " + pr.zile);
    const pe = pr.pe[pr.recomandata || "neutru"].test;
    assert.ok(pe.ind && pe.ind.n >= ind - 1 && pe.ind.n <= ind + 1, "ferestrele de test care nu se suprapun: " + JSON.stringify(pe.ind));
  }
  assert.equal(GP.proba(RW.b15, 2).barePeZi, 96, "pe 15 minute rămâne 96");
});
await test("1c funding-ul pe bare de 1 h e tot la 8 h (3 plăți pe zi), ca pe 15 minute", () => {
  const plat = (k, pas) => Array.from({ length: k }, (_, i) => ({ t: i * pas, o: 100, h: 100.0001, l: 99.9999, c: 100 }));
  const st = () => ({ ...G.construieste({ pret: 100, lat: 0.06, pas: 0.01, dir: "long" }), fundingZi: 0.003 });
  const r15 = GP.simuleaza(plat(96, 900000), 0, 96, st()), r1 = GP.simuleaza(plat(24, 3600000), 0, 24, st(), { barePeZi: 24 });
  assert.ok(r15.funding > 0, "pe 15 minute se plătește funding");
  assert.ok(Math.abs(r1.funding - r15.funding) < 1e-12, "1 h: " + r1.funding + " față de 15 min: " + r15.funding);
});
await test("1d fișa la H = 2 / 3 cu barele de 1 h: proba pe ele (24 de bare pe zi), fără motivul „prea puține ferestre independente”", () => {
  for (const H of [2, 3]) {
    const f = fisaDe(RW, H, { b1h: RW.b1h });
    assert.ok(!f.eroare, f.eroare);
    assert.equal(f.proba.barePeZi, 24, "H = " + H + ": proba nu e pe bare de 1 h");
    assert.ok(f.proba.ferestre.testIndependente >= 10, "H = " + H + ": " + f.proba.ferestre.testIndependente);
    assert.ok(!f.verdict.motive.some((m) => /ferestre independente.*prea puțin/.test(m)), f.verdict.motive.join(" | "));
    // fișa cere t pe ferestrele independente (cereT): pe mers aleator media nu se vede peste zero ⇒ motivul e în verdict
    const ti = f.stat.test.ind;
    assert.ok(ti && ti.n >= 19, "ferestrele independente ale setării: " + JSON.stringify(ti));
    if (!(ti.t >= 1.65)) assert.ok(f.verdict.motive.some((m) => /nu se vede peste zero \(t /.test(m)), "H = " + H + ", t " + ti.t + ": " + f.verdict.motive.join(" | "));
  }
  assert.ok([2, 3].some((H) => !(fisaDe(RW, H, { b1h: RW.b1h, faraMc: true }).stat.test.ind.t >= 1.65)), "pe mers aleator măcar un t sub prag (altfel testul de mai sus nu probează nimic)");
});
await test("1e fără privit în viitor: barele de 1 h de după ultima bară de 15 min nu schimbă nimic (fișa refăcută la pornirea unui bot)", () => {
  const tF = RW.b15[RW.b15.length - 1].t + 900000, last = RW.b1h[RW.b1h.length - 1];
  const viitor = Array.from({ length: 200 }, (_, i) => { const p = last.c * Math.pow(0.99, i + 1); return { t: tF + i * 3600000, o: p * 1.01, h: p * 1.02, l: p * 0.97, c: p }; });
  const doarTrecut = RW.b1h.filter((x) => x.t + 3600000 <= tF);
  const a = fisaDe(RW, 2, { b1h: doarTrecut, faraMc: true }), b = fisaDe(RW, 2, { b1h: RW.b1h.concat(viitor), faraMc: true });
  assert.equal(a.proba.barePeZi, 24);
  assert.deepEqual(b.setare, a.setare); assert.deepEqual(b.verdict, a.verdict); assert.deepEqual(b.stat, a.stat);
});
/* v100.270 (el, 29.10: „Da, și la 1 zi”): și H = 1 trece pe barele de 1 h (~60 de ferestre independente față de ~10 pe 15 minute), cu aceeași cerință t */
await test("1f H = 1 trece și el pe barele de 1 h (cu cerința t); la H = 2 cu doar ~20 de zile de 1 h (nu aduc mai multe ferestre) tot pe 15 minute", () => {
  const f1 = fisaDe(RW, 1, { b1h: RW.b1h, faraMc: true });
  assert.equal(f1.proba.barePeZi, 24, "H = 1 a rămas pe 15 minute");
  assert.equal(fisaDe(RW, 1, { faraMc: true }).proba.barePeZi, 96, "H = 1 fără barele de 1 h: pe 15 minute, ca înainte");
  assert.equal(fisaDe(RW, 2, { b1h: RW.b1h.slice(-480), faraMc: true }).proba.barePeZi, 96);
  assert.equal(fisaDe(RW, 2, { faraMc: true }).proba.barePeZi, 96, "fără barele de 1 h, ca înainte");
});
await test("1g PORNEȘTE e posibil la H = 2 și H = 3 pe o monedă cu avantaj (oscilează), cu Monte Carlo; pe 15 minute nu era", () => {
  for (const H of [2, 3]) {
    const f = fisaDe(OSC, H, { b1h: OSC.b1h });
    assert.equal(f.verdict.nivel, "porneste", "H = " + H + ": " + f.verdict.nivel + " · " + f.verdict.motive.join(" | "));
    assert.ok(f.mc && !f.mc.contrazice, "Monte Carlo a contrazis");
    const vechi = fisaDe(OSC, H, { faraMc: true });
    assert.notEqual(vechi.verdict.nivel, "porneste", "pe 15 minute (5 / 3 ferestre) n-ar fi trebuit");
  }
});
await test("1g' și la H = 1: pe moneda cu avantaj (oscilează) PORNEȘTE rămâne posibil pe barele de 1 h; pe mersul aleator, nu", () => {
  const f = fisaDe(OSC, 1, { b1h: OSC.b1h });
  assert.equal(f.proba.barePeZi, 24);
  assert.equal(f.verdict.nivel, "porneste", "H = 1 pe moneda cu avantaj: " + f.verdict.nivel + " · " + f.verdict.motive.join(" | "));
  const r = fisaDe(RW, 1, { b1h: RW.b1h });
  assert.notEqual(r.verdict.nivel, "porneste", "pe mers aleator H = 1 a zis PORNEȘTE: " + r.verdict.motive.join(" | "));
});
await test("1h media pe ferestrele de test care nu se suprapun trebuie să se vadă peste zero (t ≥ 1,65) la proba pe 1 h - motivul, cu o zecimală", () => {
  const st = { antren: { mediana: 0.01, lichidari: 0 }, test: { mediana: 0.004, medie: 0.002, lichidari: 0, ind: { n: 30, medie: 0.002, abatere: 0.03, t: 0.37 } } };
  const v = G.verdict({ regim: { miscare: false }, stat: st, zile: 183, pozitie: 0.5, ferestreTest: 30, incercate: 36, cereT: true });
  assert.equal(v.nivel, "asteapta");
  assert.ok(v.motive.includes("pe zilele nevăzute, media pe cele 30 de ferestre independente (+0,2%) nu se vede peste zero (t 0,4, cer cel puțin 1,65)"), v.motive.join(" | "));
  const bun = { ...st, test: { ...st.test, ind: { n: 30, medie: 0.012, abatere: 0.02, t: 3.29 } } };
  assert.equal(G.verdict({ regim: { miscare: false }, stat: bun, zile: 183, pozitie: 0.5, ferestreTest: 30, incercate: 36, cereT: true }).nivel, "porneste");
  assert.equal(G.verdict({ regim: { miscare: false }, stat: st, zile: 31, pozitie: 0.5, ferestreTest: 10, incercate: 36 }).nivel, "porneste", "fără cereT (H = 1, 15 min): ca înainte");
});
await test("1l pe 1 h, culoarul pasului rămâne pe scara de 15 minute (mișcarea barei de 1 h × 0,5); setarea afișată re-rulată tot pe barele de 1 h", () => {
  const n = RW.b1h.length, A = RW.b1h.slice(0, Math.round(n * 2 / 3)), pr = GP.proba(RW.b1h, 2, null, { barePeZi: 24 });
  const med = G.mediana(A.map((x) => (x.h - x.l) / x.c)) * 0.5, p15 = G.pasi(RW.b15.slice(0, 2000));
  assert.ok(Math.abs(pr.pasi[3] - Math.max(0.003, 3 * med)) < 1e-12, "pasul maxim " + pr.pasi[3]);
  assert.ok(Math.abs(pr.pasi[3] / p15[3] - 1) < 0.3, "1 h " + pr.pasi[3] + " față de 15 min " + p15[3]);
  const f0 = fisaDe(RW, 2, { b1h: RW.b1h, faraMc: true }), L = f0.setare.levierSigur === 1 ? 2 : 1;
  const f = fisaDe(RW, 2, { b1h: RW.b1h, faraMc: true, levier: L });
  assert.equal(f.probaLa.reRulata, true, "setarea la " + L + "× n-a fost re-rulată");
  assert.ok(f.stat.test.ind && f.stat.test.ind.n >= 28 && f.stat.test.ind.n <= 32, "ferestrele independente ale setării re-rulate: " + JSON.stringify(f.stat.test.ind));
});
await test("1i sub H0, pe 12 monede de mers aleator, regula nouă nu zice PORNEȘTE (sim-h0-v100269: 300 de monede, rata mică)", () => {
  let k = 0;
  for (let s = 0; s < 12; s++) { const m = moneda(700000 + s, 183, { volZi: 0.02 + 0.004 * s }); for (const H of [2, 3]) if (fisaDe(m, H, { b1h: m.b1h, faraMc: true }).verdict.nivel === "porneste") k++; }
  assert.ok(k <= 1, "PORNEȘTE în " + k + " din 24 de fișe fără avantaj");
});

// ---------- 1j contrafactualul: barele de 1 h dinaintea pornirii (discul, altfel Pionex 60M), tăiate la pornire ----------
const { turaContrafactual } = await import(pathToFileURL(path.join(RADS, "scripts", "lib", "tura-contrafactual.mjs")).href);
const CF = { taie: (a, pornit, pas) => a.filter((r) => Number(r.time) + pas <= pornit), zice: (f) => ({ nivel: f ? f.verdict.nivel : "fara-date", motive: [] }) };
const randuriDe = (b, pasMs) => b.map((x) => ({ time: x.t, open: String(x.o), high: String(x.h), low: String(x.l), close: String(x.c) }));
function lumeCf(o = {}) {
  const PORNIT = RW.b15[RW.b15.length - 1].t + 900000, cerute = [], fise = [];
  const surse = { "15M": randuriDe(RW.b15), "4H": randuriDe(RW.b4h), "1D": randuriDe(RW.b1d), "60M": randuriDe(RW.b1h.concat(Array.from({ length: 48 }, (_, i) => ({ t: PORNIT + i * 3600000, o: 1, h: 1, l: 1, c: 1 })))) };
  const d = { cereBoti: async () => [{ id: "b1", moneda: "SINT", pornit: PORNIT, pretInit: RW.b15[RW.b15.length - 1].c, investit: 100 }], simbol: async (m) => m + "_USDT_PERP", acum: PORNIT + 86400000,
    cereKlines: async (s, iv, lim, end) => { cerute.push(iv); if (o.rau60 && iv === "60M") throw new Error("endTime param error"); return surse[iv].filter((r) => Number(r.time) <= end).slice(-lim); },
    citesteOre: o.disc ? () => surse["60M"] : undefined,
    gata: {}, GridCalcul: G, GridProba: { fisa: (x) => { fise.push(x); return GP.fisa(Object.assign({}, x, { faraMc: true })); } }, Contrafactual: CF, JurnalTrade: { din: (l) => l }, jurnal: () => {}, max: 5 };
  return { d, cerute, fise, PORNIT };
}
await test("1j contrafactualul dă fișei barele de 1 h dinaintea pornirii (~6 luni, Pionex 60M pe pagini), tăiate la pornire", async () => {
  const w = lumeCf(), rez = await turaContrafactual(w.d);
  assert.equal(w.fise.length, 1); const b1h = w.fise[0].b1h;
  assert.ok(Array.isArray(b1h) && b1h.length >= 24 * 150, "barele de 1 h: " + (b1h ? b1h.length : b1h));
  assert.ok(b1h.every((x) => x.t + 3600000 <= w.PORNIT), "o bară de 1 h de după pornire");
  assert.ok(w.cerute.filter((x) => x === "60M").length >= 8 && w.cerute.filter((x) => x === "60M").length <= 10, "pagini 60M: " + w.cerute.join(","));
  assert.equal(rez[0].zice.nivel !== "fara-date", true);
});
await test("1j contrafactualul: barele de 1 h de pe disc ajung ⇒ nicio cerere 60M la Pionex; 60M picat ⇒ fișa merge pe 15 minute, nu „fara-date”", async () => {
  const w = lumeCf({ disc: true }); await turaContrafactual(w.d);
  assert.ok(!w.cerute.includes("60M"), "a cerut 60M deși discul avea barele: " + w.cerute.join(","));
  assert.ok(w.fise[0].b1h.length >= 24 * 150 && w.fise[0].b1h.every((x) => x.t + 3600000 <= w.PORNIT));
  const r = lumeCf({ rau60: true }), rez = await turaContrafactual(r.d);
  assert.equal(rez.length, 1); assert.notEqual(rez[0].zice.nivel, "fara-date");
  assert.ok(!r.fise[0].b1h || !r.fise[0].b1h.length, "fără 60M n-ar trebui să existe bare de 1 h");
});

// ---------- 1k pagina și colectorul dau barele de 1 h fișei ----------
const APP = citeste("public", "app.js"), COL = citeste("scripts", "colector.mjs");
const fnApp = (nume) => { const i = APP.indexOf("\nfunction " + nume + "(") >= 0 ? APP.indexOf("\nfunction " + nume + "(") : APP.indexOf("\nasync function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); const j = APP.slice(i + 10).search(/\n(async )?function /); return APP.slice(i + 1, j < 0 ? undefined : i + 10 + j); };
await test("1k app.js: ambele GridProba.fisa( primesc b1h la H ≥ 2 (grOreFisa); colectorul (semnale) ia barele de 1 h de pe disc", () => {
  const apeluri = APP.split("GridProba.fisa(").slice(1).map((x) => x.slice(0, 600));
  assert.equal(apeluri.length, 2);
  for (const a of apeluri) assert.match(a, /b1h:/, "un apel al fișei fără b1h: " + a.slice(0, 200));
  assert.match(APP, /grStare\.H>=1\?await grOreFisa\(simbol,d\.r60\)/, "pagina Grid dă barele de 1 h și la H = 1");   /* v100.269b: și la 1 zi */
  const c = COL.split("GridProba.fisa(").slice(1).map((x) => x.slice(0, 500));
  assert.equal(c.length, 1); assert.match(c[0], /b1h/);
  assert.match(COL, /b1h = GridCalcul\.bare\(JSON\.parse\(fs\.readFileSync\(fisOre\(s\), "utf8"\)\)\)/);
  const cf = COL.slice(COL.indexOf("async function turaCf("), COL.indexOf("\n}\n", COL.indexOf("async function turaCf(")));
  assert.ok(cf.length > 100, "lipsește turaCf în colector");
  assert.match(cf, /citesteOre: \(s\) => \{ try \{ return JSON\.parse\(fs\.readFileSync\(fisOre\(s\), "utf8"\)\); \} catch \{ return \[\]; \} \}/, "contrafactualul din colector nu primește discul");
});
await test("1k grOreFisa: KV-ul colectorului întâi (fără Pionex), lipit cu pagina nouă; fără KV, Pionex 60M în urmă (cel mult 8 pagini); a doua oară din memorie", async () => {
  const ACUM = Date.now(), H1 = 3600000, rand = (t) => ({ time: t, open: "1", high: "1.1", low: "0.9", close: "1" });
  const pag = (end, n) => Array.from({ length: n }, (_, i) => rand(Math.floor(end / H1) * H1 - i * H1)).reverse();
  const r60 = pag(ACUM, 500), cereri = [];
  const kvPlin = Array.from({ length: 183 * 24 }, (_, i) => { const t = Math.floor((ACUM - 86400000) / H1) * H1 - i * H1; return [t, 1, 1.1, 0.9, 1]; }).reverse();
  const lume = (kv) => { const box = { GridCalcul: G, grPauza: async () => {}, getJSON: async (u) => { cereri.push(u); if (/action=ore/.test(u)) return { ore: kv ? { b: kv } : null }; const m = /endTime=(\d+)/.exec(u); return { data: { klines: pag(m ? Number(m[1]) : ACUM, 500) } }; } }; vm.createContext(box); vm.runInContext(["grRanduri", "grOreFisa"].map(fnApp).join("\n") + "\nvar grOre={};", box); return box; };
  const a = lume(kvPlin), va = await a.grOreFisa("SINT_USDT_PERP", r60);
  assert.equal(cereri.filter((u) => /pionex_klines/.test(u)).length, 0, "KV-ul avea ~6 luni: " + cereri.join(" "));
  const ta = G.bare(va); assert.ok(ta.length >= 24 * 180, "bare: " + ta.length); assert.ok(ta[ta.length - 1].t >= r60[r60.length - 2].time, "pagina nouă nu e lipită");
  cereri.length = 0; const b = lume(null), vb = await b.grOreFisa("ALT_USDT_PERP", r60), pg = cereri.filter((u) => /pionex_klines/.test(u));
  assert.ok(pg.length >= 7 && pg.length <= 8, "pagini Pionex: " + pg.length); assert.ok(pg.every((u) => /interval=60M&limit=500&endTime=\d+/.test(u)));
  assert.ok(G.bare(vb).length >= 24 * 175, "bare din Pionex: " + G.bare(vb).length);
  cereri.length = 0; await b.grOreFisa("ALT_USDT_PERP", r60); assert.equal(cereri.length, 0, "a doua oară: din memorie, fără cereri");
});

// ================================ IDEEA 2 ================================
const MG = moneda(22, 31, { grupat: true }), BG = MG.b15.slice(-2976), PG = BG[BG.length - 1].c;
const SETG = (dir, lat = 0.08) => { const f = dir === "long" ? 0.6 : dir === "short" ? 0.4 : 0.5, jos = PG * (1 - lat * (1 - f)), sus = PG * (1 + lat * f), d = lat / 8; return { jos, sus, grile: 20, levier: 3, dir, suma: 100, fundingZi: 0.0003, fundingCost: true, tip: "geometric", stop: dir === "long" ? { jos: jos * (1 - d) } : dir === "short" ? { sus: sus * (1 + d) } : { jos: jos * (1 - d), sus: sus * (1 + d) } }; };
const SEMINTE = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const peSeminte = (st, n, oriz) => SEMINTE.map((seed) => GS.simuleaza(BG, st, { n, seed, orizonturi: oriz, zile: 14 }));
const RL = peSeminte(SETG("long"), 500, [1, 7]), RN = peSeminte(SETG("neutru"), 500, [1, 7]);
await test("2a aceeași monedă, semințele 12…20 (500 de drumuri): marja pe zile variază cu cel mult 3 puncte, la 1 și la 7 zile, long și neutru", () => {
  for (const [nume, R] of [["long", RL], ["neutru", RN]]) for (const h of [0, 1]) {
    const v = R.map((r) => r.orizonturi[h].marjaZile);
    assert.ok(v.every((x) => typeof x === "number"), nume + ": marja lipsește " + v.join(","));
    assert.ok(Math.max(...v) - Math.min(...v) <= 3, nume + " " + R[0].orizonturi[h].zile + "z: ±" + v.join(" ±"));
    assert.ok(Math.min(...v) >= 5, nume + ": marja pe ~31 de zile nu e aproape zero: " + v.join(","));
  }
});
// setarea fără stop, lățimea și grilele date (neutru: jumătate deasupra prețului)
const SETF = (lat, grile, levier) => ({ jos: PG * (1 - lat / 2), sus: PG * (1 + lat / 2), grile, levier, dir: "neutru", suma: 100, fundingZi: 0.0003, fundingCost: true, tip: "geometric", stop: null });
const faCe7 = (st) => { const R = peSeminte(st, 500, [7]); return { R, fc: R.map((r) => String(GS.verdict(r, st, null, 0, null).faCe).split(/[.:]/)[0]), P: R.map((r) => Math.round(r.orizonturi[0].pCastig * 100)) }; };
await test("2b verdictul pe 7 zile nu se schimbă de la o sămânță la alta: neutru lat (P ~65%; înainte «Aș porni» la 2 din 9 semințe) și neutru strâns (P ~8%: «N-aș porni»)", () => {
  const lat = faCe7(SETF(0.15, 10, 1));
  assert.ok(Math.min(...lat.P) >= 60 && Math.max(...lat.P) <= 70, "P " + lat.P.join(","));
  assert.equal(new Set(lat.fc).size, 1, "verdicte: " + lat.fc.join(" | ") + " · marje ±" + lat.R.map((r) => r.orizonturi[0].marja).join(" ±"));
  const str = faCe7(SETF(0.03, 60, 2));
  assert.ok(Math.max(...str.P) <= 15, "P " + str.P.join(","));
  assert.deepEqual([...new Set(str.fc)], ["N-aș porni"], str.fc.join(" | "));
  assert.ok(str.R.every((r) => GS.verdict(r, SETF(0.03, 60, 2), null, 0, null).rauConfirmat === true));
});
await test("2c Tabloul (500 de drumuri, [1, 7]) și Simulatorul (2000, [1, 3, 7, 14]) dau aceeași marjă pe 7 zile (±3) pe aceeași monedă", () => {
  const st = SETG("neutru"), t = GS.simuleaza(BG, st, { n: 500, seed: 12, orizonturi: [1, 7], zile: 14 }), s = GS.simuleaza(BG, st, { n: 2000, seed: 12, orizonturi: [1, 3, 7, 14], zile: 14 });
  const mt = t.orizonturi[1].marjaZile, ms = s.orizonturi[2].marjaZile;
  assert.ok(Math.abs(mt - ms) <= 3, "Tablou ±" + mt + " · Simulator ±" + ms);
});
await test("2d botul care rulează: și „de aici încolo” are marja pe zile; pe regim, zilele distincte sunt ale regimului", () => {
  const meu = GS.simuleaza(BG, SETG("neutru"), { n: 300, seed: 12, orizonturi: [1], zile: 7, pornitLa: BG[BG.length - 200].t });
  assert.equal(typeof meu.orizonturi[0].deAici.marjaZile, "number");
  const ST = []; for (let i = 96; i < 96 + 10 * 96; i++) ST.push(i);
  const rg = GS.simuleaza(BG, SETG("neutru"), { n: 300, seed: 12, orizonturi: [1], zile: 7, starturi: ST });
  assert.equal(rg.orizonturi[0].zileDistincte, 10, "zilele regimului: " + rg.orizonturi[0].zileDistincte);
  assert.equal(GS.simuleaza(BG, SETG("neutru"), { n: 100, seed: 12, orizonturi: [1], zile: 7 }).orizonturi[0].zileDistincte, 31);
});
await test("2e costul: marja nu adaugă peste 50% la timpul drumurilor (gardă; Tabloul rulează în Worker, cu limită pe telefon)", () => {
  const st = SETG("long"), n = 500;
  const t0 = performance.now(); GS.simuleaza(BG, st, { n, seed: 12, orizonturi: [1, 7], zile: 14 }); const tSim = performance.now() - t0;
  const t1 = performance.now(), rnd = M.generator(12); for (let i = 0; i < n; i++) { const d = M.drum(BG, 14 * 96, 96, PG, rnd, 0); GP.simuleaza(d, 0, d.length, st, { traseu: true }); } const tBaza = performance.now() - t1;
  assert.ok(tSim <= 1.5 * tBaza * 1.3, "simularea " + Math.round(tSim) + " ms față de drumuri " + Math.round(tBaza) + " ms");
});
await test("2g marja scoate partea explicată de mișcarea drumului: la long sub binomialul pe ~31 de zile, la neutru cât el", () => {
  const binom = (o) => Math.round(1.96 * Math.sqrt(o.pCastig * (1 - o.pCastig) / 31) * 100);
  const l = RL[0].orizonturi[0], nn = RN[0].orizonturi[0];
  assert.ok(l.marjaZile <= binom(l) - 2, "long: ±" + l.marjaZile + " față de binomial ±" + binom(l));
  assert.ok(Math.abs(nn.marjaZile - binom(nn)) <= 1, "neutru: ±" + nn.marjaZile + " față de binomial ±" + binom(nn));
});
await test("2f Simulatorul spune cum e socotită marja (pe zile distincte, fără partea tendinței)", () => {
  const E = citeste("public", "lib", "grid-sim-ecran.js");
  assert.match(E, /fiecare zi distinctă din istoric e o observație, fără partea pe care drumurile o scot oricum \(tendința\)/);
  assert.doesNotMatch(E, /cu fiecare grupă de zile scoasă pe rând/);
});

// ---------- revizia independentă (29.10): barele de 1 h vechi sau cu goluri nu au voie să intre în fișă ----------
// KV-ul `ore:` nu expiră; o monedă ieșită din profil are fișierul vechi pe disc ⇒ fără gardă, fișa judeca pe altă perioadă (sau peste o gaură de 79 de zile).
await test("R1 bare de 1 h oprite acum 100 de zile: fișa NU le folosește (rămâne pe 15M)", () => {
  assert.equal(typeof GP.bareOraFisa, "function", "lipsește GridProba.bareOraFisa");
  const vechi = RW.b1h.slice(0, RW.b1h.length - 100 * 24);
  assert.equal(GP.bareOraFisa({ H: 2, b1h: vechi, b15: RW.b15 }), null, "bare vechi de 100 de zile folosite");
});
await test("R2 o gaură mare în barele de 1 h (KV vechi lipit de ultimele 500 h): se folosește doar bucata continuă de la capăt", () => {
  const n = RW.b1h.length, cuGaura = RW.b1h.slice(0, n - 79 * 24 - 500).concat(RW.b1h.slice(n - 500));
  const r = GP.bareOraFisa({ H: 2, b1h: cuGaura, b15: RW.b15 });
  if (r !== null) { for (let i = 1; i < r.length; i++) assert.ok(r[i].t - r[i - 1].t <= 2 * 3600000, "gaură de " + ((r[i].t - r[i - 1].t) / 3600000) + " h în barele folosite"); }
});
await test("R3 bare continue și proaspete (~6 luni): folosite ca înainte", () => {
  const r = GP.bareOraFisa({ H: 2, b1h: RW.b1h, b15: RW.b15 });
  assert.ok(Array.isArray(r) && r.length > 4000, "barele bune nu mai trec: " + (r && r.length));
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
