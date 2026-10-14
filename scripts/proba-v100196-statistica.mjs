// Probele v100.196 · zona STATISTICA (auditul sever din 14.10.2026, raport_statistica.md; el: „repară și fă tot”).
// Fiecare test statistic reparat MĂSOARĂ rata de „dovedit” / p ≤ 0,05 fals pe ≥ 200 de seturi FĂRĂ efect, cu structura reală
// (factor comun al pieței în timp, eticheta grupată în faze), și o cere la nivelul promis; plus puterea (cu efect, testul îl vede).
//  🔴1 obiceiurile (RiscLuna.verdict): al doilea test, pe blocuri de timp (ca Carnet.verdictMonede); p în registru = max(p, pBloc)
//  🔴2 / 🟡6 jurnalul verdictelor, Poarta T212 și Poarta gridului: unitatea = ziua (diferența favorabil − rest în aceeași zi)
//  🔴3 mc-regim: blocul = săptămâna (toate monedele împreună), semnele întoarse pe săptămâni, cel puțin 8 săptămâni
//  🔴4 probabilitățile: câmpul `scurt` nu e niciodată „0%” gol („sub X%”, X = limita de sus a intervalului)
//  🟡2 / 🟡3 registrul: ce familii cuprinde (textul nu promite „≤ 5 % false” pe tot), „Episod scurt” / „Marjă adăugată” = legătură, nu cauză
//  🟡4 ADX / becurile: testul pe blocuri de timp · 🟡5 calibrarea: o zi de piață = un caz, cifra brută reală în text
//  🔵 rata T212 fără viitor, laboratorul pe ferestre de timp, variantele de noapte „dintre N”, dublurile din coșuri, modelele în registru
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) { if (process.env.DOAR && !new RegExp(process.env.DOAR).test(nume)) return; teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.196 · zona statistica · proba\n");

const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const RL = new Function(`${lib("risc-luna.js")}; return RiscLuna;`)();
const AS = new Function("Probabilitati", "Directie", `${lib("asemanatoare.js")}; return Asemanatoare;`)({ stareLa: () => null }, {});
const V = new Function(`${lib("verdicte.js")}; return Verdicte;`)();
const PB = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G);
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const GL = new Function("GridCalcul", "GridProba", `${lib("grid-laborator.js")}; return GridLaborator;`)(G, GP);
const MCR = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mc-regim.mjs")).href);
const DT = await import(pathToFileURL(path.join(RAD, "retea", "date-t212.mjs")).href);
const VER = await import(pathToFileURL(path.join(RAD, "retea", "verifica.mjs")).href);
const RT = new Function(`${lib("retea.js")}; return Retea;`)();

const ZI = 864e5, ORA = 36e5, T0 = Date.UTC(2026, 0, 5);
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const N = (r) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
const pr = (k, n) => (k / Math.max(1, n) * 100).toFixed(1).replace(".", ",") + " %";

// ---------------- lumea FĂRĂ efect, cu structura reală: boții / episoadele ----------------
// factorul comun pe săptămână (sigmaSapt) și pe zi (sigmaZi, pe toată viața botului), eticheta grupată în faze de ~fazaZile zile
function lumeBoti(seed, o) {
  const r = mb(seed), Z = o.zile, zi = [], sapt = [], faza = [];
  for (let d = 0; d <= Z + 6; d++) zi.push((o.sigmaZi || 0) * N(r));
  for (let w = 0; w <= Z / 7 + 3; w++) sapt.push((o.sigmaSapt || 0) * N(r));
  let f = r() < 0.5; for (let d = 0; d <= Z; d++) { if (r() < 1 / o.fazaZile) f = !f; faza.push(f); }
  const l = [];
  for (let i = 0; i < o.boti; i++) {
    const tz = r() * Z, d = Math.floor(tz), viata = 0.2 + r() * 2.8, lab = o.negrupat ? r() < 0.35 : r() < (faza[d] ? 0.6 : 0.15);
    let piata = sapt[Math.floor(d / 7)]; for (let q = d; q <= Math.floor(tz + viata); q++) piata += zi[q];
    const m = "M" + Math.floor(r() * o.monede);
    l.push({ t: T0 + tz * ZI, m, moneda: m, ticker: m, lab, r: piata + (o.efect || 0) * (lab ? 1 : 0) + o.sigmaId * N(r) });
  }
  return l;
}
const STRUCTURI = [
  { nume: "520 de boți, 180 de zile, factor pe săptămână (ICC ~0,4)", zile: 180, boti: 520, monede: 50, sigmaSapt: 0.03, sigmaId: 0.04, fazaZile: 25 },
  { nume: "2.000 de boți, 365 de zile, factor pe săptămână (ICC ~0,1)", zile: 365, boti: 2000, monede: 60, sigmaSapt: 0.015, sigmaId: 0.045, fazaZile: 30 },
  { nume: "1.000 de boți, 270 de zile, factor ZILNIC pe viața botului", zile: 270, boti: 1000, monede: 50, sigmaZi: 0.015, sigmaId: 0.04, fazaZile: 30 }
];
const obicei = (l, o) => RL.verdict(l, (x) => x.lab, Object.assign({ min: 30, putini: "prea puțini", cheie: "m", timp: "t", reps: 1000, seed: 11, S: () => 45 }, o || {}));
const SETURI = 300;

await test("🔴1 obiceiurile: pe 300 de seturi FĂRĂ efect (eticheta grupată în timp, factor comun) ⇒ „dovedit” fals ≤ 1,5 % și p ≤ 0,05 ≤ 7 %, în fiecare structură", () => {
  const rap = [];
  for (const S of STRUCTURI) {
    let n = 0, dov = 0, p05 = 0;
    for (let s = 0; s < SETURI; s++) { const v = obicei(lumeBoti(7000 + s, S), { seed: 13 + s }); if (/^prea/.test(v.stare)) continue; n++; if (/^dovedit/.test(v.stare)) dov++; if (v.p !== null && v.p <= 0.05) p05++; }
    rap.push(S.nume + ": testate " + n + ", „dovedit” fals " + pr(dov, n) + ", p ≤ 0,05 în " + pr(p05, n));
    assert.ok(n >= 200, "cel puțin 200 de seturi judecate (" + n + ") · " + S.nume);
    assert.ok(dov / n <= 0.015, "„dovedit” fals " + pr(dov, n) + " · " + S.nume);
    assert.ok(p05 / n <= 0.07, "p ≤ 0,05 în " + pr(p05, n) + " (p intră în registrul BH) · " + S.nume);
  }
  console.log("       " + rap.join("\n       "));
});
await test("🔴1 puterea rămâne: cu un efect real (+3 % pe obicei, zgomot 4 %) „dovedit-bun” în ≥ 80 % din 100 de seturi", () => {
  let dov = 0; for (let s = 0; s < 100; s++) { const v = obicei(lumeBoti(9100 + s, Object.assign({}, STRUCTURI[0], { efect: 0.03 })), { seed: 3 + s }); if (v.stare === "dovedit-bun") dov++; }
  console.log("       putere: „dovedit-bun” în " + dov + " din 100");
  assert.ok(dov >= 80, "doar " + dov + " din 100");
});
await test("🔴1 forma: pBloc și blocuri în rezultat; p (pentru registru) = max(p bootstrap, pBloc); sub 8 blocuri de timp ⇒ „prea puțini”, motivul „zile”, cu textul lui", () => {
  const v = obicei(lumeBoti(42, STRUCTURI[0]));
  assert.ok(Number.isFinite(v.pBloc) && v.blocuri >= 8, "pBloc " + v.pBloc + ", blocuri " + v.blocuri);
  assert.ok(v.p >= v.pBloc && v.p >= v.pBoot, "p = max(pBoot " + v.pBoot + ", pBloc " + v.pBloc + ") = " + v.p);
  // 80 de boți în 12 zile ⇒ cel mult 4 blocuri de 3 zile
  const scurt = lumeBoti(43, Object.assign({}, STRUCTURI[0], { zile: 12, boti: 160, negrupat: true })), vs = obicei(scurt);
  assert.equal(vs.stare, "prea puțini"); assert.equal(vs.motiv, "zile");
  const t = RL.textObicei(Object.assign({ k: "O1" }, vs), "boti");
  assert.match(t, /perioade/, t); assert.doesNotMatch(t, /^Prea puține cazuri/, t);
  // comportamentActiuni (episoadele) are aceeași regulă
  const ep = lumeBoti(44, STRUCTURI[0]).map((x) => ({ ticker: x.m, pct: x.r, final: x.t, A1: false, A2: false, A3: x.lab, pus: 100 }));
  const a3 = RL.comportamentActiuni(ep, { reps: 500 }).find((y) => y.k === "A3"); assert.ok(Number.isFinite(a3.pBloc), "A3 are pBloc");
});

await test("🟡4 ADX la pornire și becurile (Asemanatoare): pe 200 de seturi FĂRĂ efect ⇒ „dovedit / pe dos” fals ≤ 1,5 %, p ≤ 0,05 ≤ 7 %", () => {
  const rap = [];
  for (const S of STRUCTURI) {
    let nA = 0, fA = 0, pA = 0, nS = 0, fS = 0, pS = 0;
    for (let s = 0; s < 200; s++) {
      const l = lumeBoti(8000 + s, Object.assign({}, S, { boti: Math.min(S.boti, 1000) }));   /* medianele sunt scumpe: 1.000 de boți, 400 de trageri */
      const bA = AS.bilantAdx(l.map((x) => ({ moneda: x.m, adx: x.lab ? 15 : 30, pct: x.r, t: x.t })), { rep: 400 });
      if (bA.verdict !== "puține") { nA++; if (bA.verdict === "dovedit" || bA.verdict === "pe dos") fA++; if (bA.p <= 0.05) pA++; }
      const bS = AS.bilantSemafor(l.map((x) => ({ moneda: x.m, tf: x.lab ? "lcc" : "luu", dir: "long", pct: x.r, t: x.t })), { rep: 400 });
      if (bS.verdict !== "puține") { nS++; if (bS.verdict === "dovedit" || bS.verdict === "pe dos") fS++; if (bS.p <= 0.05) pS++; }
    }
    rap.push(S.nume + ": ADX " + pr(fA, nA) + " (p ≤ 0,05 " + pr(pA, nA) + ") · becuri " + pr(fS, nS) + " (p ≤ 0,05 " + pr(pS, nS) + ")");
    assert.ok(nA >= 200 && nS >= 200, "seturi judecate: ADX " + nA + ", becuri " + nS);
    assert.ok(fA / nA <= 0.015, "ADX fals " + pr(fA, nA) + " · " + S.nume); assert.ok(fS / nS <= 0.015, "becuri fals " + pr(fS, nS) + " · " + S.nume);
    assert.ok(pA / nA <= 0.07 && pS / nS <= 0.07, "p ≤ 0,05: ADX " + pr(pA, nA) + ", becuri " + pr(pS, nS) + " · " + S.nume);
  }
  console.log("       " + rap.join("\n       "));
});
await test("🟡4 ADX: puterea rămâne (efect +3 % pe mediană ⇒ „dovedit” în ≥ 80 % din 100) și p = max(p bootstrap, pBloc)", () => {
  let dov = 0, ultim = null;
  for (let s = 0; s < 100; s++) { const l = lumeBoti(9300 + s, Object.assign({}, STRUCTURI[0], { efect: 0.03 })); ultim = AS.bilantAdx(l.map((x) => ({ moneda: x.m, adx: x.lab ? 15 : 30, pct: x.r, t: x.t })), { rep: 1000 }); if (ultim.verdict === "dovedit") dov++; }
  console.log("       putere ADX: " + dov + " din 100");
  assert.ok(dov >= 80, "doar " + dov); assert.ok(Number.isFinite(ultim.pBloc) && ultim.p >= ultim.pBloc && ultim.p >= ultim.pBoot, JSON.stringify({ p: ultim.p, pBloc: ultim.pBloc, pBoot: ultim.pBoot }));
});

// ---------------- 🔴2 / 🟡6 jurnalul verdictelor pe sursele cu multe simboluri ----------------
// generatorul auditului (sim_verdicte.mjs): randamente zilnice i.i.d. (H0 adevărat), factor comun al pieței, poarta după trendul pieței pe 20 de zile
function lumePoarta(seed, o) {
  const r = mb(seed), Z = o.zile, S = o.simb, m = [], id = [];
  for (let d = 0; d < Z + 70; d++) m.push(0.0004 + o.sigmaPiata * N(r));
  for (let k = 0; k < S; k++) { const a = []; for (let d = 0; d < Z + 70; d++) a.push(o.sigmaId * N(r)); id.push(a); }
  const ev = [], H = o.sursa === "poarta-grid" ? [1, 3] : [5, 20];
  for (let d = 30; d < Z; d++) {
    let tr = 0; for (let q = d - 20; q < d; q++) tr += m[q];
    const pFav = tr > 0 ? 0.65 : 0.2;
    for (let c = 0; c < o.peZi; c++) {
      /* eticheta: regimul pieței (comun) sau și trendul PROPRIU al simbolului pe 20 de zile (persistent - același simbol „cumpără” zile la rând) */
      const k = Math.floor(r() * S); let tk = 0; if (o.propriu) for (let q = d - 20; q < d; q++) tk += m[q] + id[k][q];
      const fav = o.propriu ? (tk > 0 && r() < 0.85) : r() < pFav, n = o.sursa === "poarta-grid" ? (fav ? "porneste" : "asteapta") : (fav ? "cumpara" : "nu");
      for (const h of H) {
        let v = 0, lo = 0, hi = 0; for (let q = d + 1; q <= d + h; q++) { v += m[q] + id[k][q]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
        const ef = fav ? (o.efect || 0) : 0, val = o.sursa === "poarta-grid" ? (lo > -0.06 - ef && hi < 0.06 + ef ? 1 : 0) : v + ef;
        ev.push({ s: o.sursa, k: "S" + k, n, t: T0 + d * ZI + c * 1000, h, r: v, val });
      }
    }
  }
  return V.calibrare(ev).filter((x) => x.sursa === o.sursa);
}
/* pragul unei rate măsurate pe n seturi: nivelul promis + z erori standard (ales în lumea FĂRĂ efect, nu după rezultat) */
const prag = (p0, n, z) => p0 + z * Math.sqrt(p0 * (1 - p0) / Math.max(1, n));
await test("🔴2 Poarta T212: unitatea = ziua; 300 de seturi FĂRĂ efect (poarta după regimul pieței sau după trendul propriu) ⇒ cumulat p ≤ 0,05 la ~5 % (+2,5 ES), la pragul BH 0,0036 la ~0,36 % (+3 ES); pe celulă ≤ 9 %", () => {
  const rap = []; let N0 = 0, A0 = 0, B0 = 0;
  for (const cfg of [{ zile: 365, simb: 40, peZi: 6 }, { zile: 730, simb: 60, peZi: 8 }, { zile: 730, simb: 40, peZi: 8, propriu: true }]) {
    const rez = { 5: [0, 0, 0], 20: [0, 0, 0] };
    for (let s = 0; s < 300; s++) for (const c of lumePoarta(1000 + s, Object.assign({ sursa: "poarta-t212", sigmaPiata: 0.012, sigmaId: 0.02 }, cfg))) {
      assert.equal(c.unitate, "zi"); const t = c.test; if (t.stare !== "testat") continue; rez[c.h][0]++; if (t.p <= 0.05) rez[c.h][1]++; if (t.p <= 0.05 / 14) rez[c.h][2]++;
    }
    for (const h of [5, 20]) {
      const [n, a, b] = rez[h]; rap.push((cfg.propriu ? "trendul propriu, " : "regimul pieței, ") + cfg.zile + " de zile, h = " + h + ": testate " + n + ", p ≤ 0,05 " + pr(a, n) + ", p ≤ 0,0036 " + pr(b, n));
      N0 += n; A0 += a; B0 += b;
      assert.ok(n >= 200, "testate " + n + " · " + rap[rap.length - 1]); assert.ok(a / n <= 0.09, rap[rap.length - 1]);
    }
  }
  rap.push("cumulat: testate " + N0 + ", p ≤ 0,05 " + pr(A0, N0) + " (prag " + pr(prag(0.05, N0, 2.5) * N0, N0) + "), p ≤ 0,0036 " + pr(B0, N0) + " (prag " + pr(prag(0.05 / 14, N0, 3) * N0, N0) + ")");
  console.log("       " + rap.join("\n       "));
  assert.ok(A0 / N0 <= prag(0.05, N0, 2.5), rap[rap.length - 1]); assert.ok(B0 / N0 <= prag(0.05 / 14, N0, 3), rap[rap.length - 1]);
});
await test("🟡6 Poarta gridului („a stat în bandă?”): unitatea = ziua; 300 de seturi FĂRĂ efect ⇒ cumulat p ≤ 0,05 la ~5 % (+2,5 ES), p ≤ 0,0036 la ~0,36 % (+3 ES)", () => {
  const rez = { 1: [0, 0, 0], 3: [0, 0, 0] };
  for (let s = 0; s < 300; s++) for (const c of lumePoarta(3000 + s, { sursa: "poarta-grid", zile: 365, simb: 30, peZi: 6, sigmaPiata: 0.025, sigmaId: 0.02 })) {
    assert.equal(c.unitate, "zi"); const t = c.test; if (t.stare !== "testat") continue; rez[c.h][0]++; if (t.p <= 0.05) rez[c.h][1]++; if (t.p <= 0.05 / 14) rez[c.h][2]++;
  }
  const rap = [1, 3].map((h) => "h = " + h + ": testate " + rez[h][0] + ", p ≤ 0,05 " + pr(rez[h][1], rez[h][0]) + ", p ≤ 0,0036 " + pr(rez[h][2], rez[h][0]));
  console.log("       " + rap.join(" · "));
  const N0 = rez[1][0] + rez[3][0], A0 = rez[1][1] + rez[3][1], B0 = rez[1][2] + rez[3][2];
  for (const h of [1, 3]) { const [n, a] = rez[h]; assert.ok(n >= 200, "testate " + n); assert.ok(a / n <= 0.09, rap.join(" · ")); }
  assert.ok(A0 / N0 <= prag(0.05, N0, 2.5) && B0 / N0 <= prag(0.05 / 14, N0, 3), "cumulat: p ≤ 0,05 " + pr(A0, N0) + ", p ≤ 0,0036 " + pr(B0, N0));
});
await test("🔴2 puterea: o poartă care chiar știe (+1,5 % la „cumpără”) iese p < 0,01 în ≥ 80 % din 100 de seturi (h = 5)", () => {
  let k = 0; for (let s = 0; s < 100; s++) { const c = lumePoarta(5000 + s, { sursa: "poarta-t212", zile: 365, simb: 40, peZi: 6, sigmaPiata: 0.012, sigmaId: 0.02, efect: 0.015 }).find((x) => x.h === 5); if (c && c.test.stare === "testat" && c.test.p < 0.01 && c.test.dif > 0) k++; }
  console.log("       putere Poarta: " + k + " din 100"); assert.ok(k >= 80, "doar " + k);
});
await test("🔴2 sursele cu UN simbol (macro, scorul zilei) rămân pe simbol; coșurile rămân pe zi cu fataDeZero", () => {
  assert.equal(V.SURSE["poarta-t212"].zi, true); assert.equal(V.SURSE["poarta-grid"].zi, true);
  assert.ok(!V.SURSE.macro.zi && !V.SURSE["scor-zi-actiuni"].zi && !V.SURSE["scor-zi-crypto"].zi && !V.SURSE.idei.zi);
  const ev = []; for (let d = 0; d < 80; d++) ev.push({ s: "macro", k: "SPY", n: d % 2 ? "riskon" : "neutru", t: T0 + d * 7 * ZI, h: 5, r: 0, val: 0.001 * (d % 3) });
  assert.equal(V.calibrare(ev).find((c) => c.sursa === "macro" && c.h === 5).unitate, "simbol");
});
await test("🔴2 zilele fără ambele feluri de verdict nu compară nimic: sub 12 zile amestecate ⇒ „puține”, cu numărul zilelor", () => {
  const ev = []; for (let d = 0; d < 60; d++) for (let k = 0; k < 4; k++) ev.push({ s: "poarta-t212", k: "S" + k, n: d < 30 ? "cumpara" : "nu", t: T0 + d * 7 * ZI + k, h: 5, r: 0, val: 0.01 });
  const c = V.calibrare(ev).find((x) => x.sursa === "poarta-t212" && x.h === 5);
  assert.equal(c.test.stare, "putine"); assert.equal(c.test.unitati, 0, "nicio zi cu ambele feluri"); assert.equal(c.test.minU, 12);
});

// ---------------- 🔴3 Monte Carlo pe regimul Busolei ----------------
// generatorul auditului (sim_mcregim.mjs) cu mai multe săptămâni: deznodământul comun pe săptămână (fereastra de 7 zile trece în săptămâna
// următoare), regimul nu știe nimic (delta independent de rezultat, comun pe săptămână)
function lumeRegim(seed, monede, sapt, efect) {
  const r = mb(seed), l = [], piata = [], delta = [];
  for (let w = 0; w < sapt + 2; w++) { piata.push(N(r)); delta.push(0.15 * N(r)); }
  for (let c = 0; c < monede; c++) for (let k = 0; k < sapt * 14; k++) {
    const t0 = Date.UTC(2026, 9, 5) + k * ZI / 2, w = Math.floor(k / 14), wf = Math.floor((k + 14) / 14);
    const lat = 0.6 * (piata[w] + piata[wf]) / 2 + 0.6 * N(r), y = lat > 0 ? 1 : 0;
    const pB = Math.min(0.95, Math.max(0.05, 0.5 + 0.05 * N(r)));
    const pR = efect ? Math.min(0.95, Math.max(0.05, pB + efect * (y - pB) + 0.05 * N(r))) : Math.min(0.95, Math.max(0.05, pB + delta[w]));
    l.push({ s: "M" + c, t0, pB, pR, y });
  }
  return l;
}
await test("🔴3 mc-regim: pe 400 de seturi FĂRĂ efect ⇒ „trece” fals ≤ 2,5 %, în structurile auditului (3–6 săpt.) și pe 8–16 săptămâni", () => {
  const rap = [];
  for (const [monede, sapt] of [[4, 3], [8, 3], [8, 6], [4, 10], [8, 12], [8, 16]]) {
    let trece = 0; for (let s = 0; s < 400; s++) if (MCR.verdictRegim(lumeRegim(900 + s, monede, sapt), { rep: 500 }).trece) trece++;
    rap.push(monede + " × " + sapt + " săpt.: " + pr(trece, 400)); assert.ok(trece / 400 <= 0.025, rap[rap.length - 1]);
  }
  console.log("       „trece” fals: " + rap.join(" · "));
});
await test("🔴3 mc-regim: puterea (regimul chiar știe ⇒ trece în ≥ 80 % pe 12 săptămâni) și sub 8 săptămâni ⇒ nu trece, cu motivul pe săptămâni", () => {
  let k = 0; for (let s = 0; s < 100; s++) if (MCR.verdictRegim(lumeRegim(400 + s, 8, 12, 0.3), { rep: 500 }).trece) k++;
  console.log("       putere mc-regim: " + k + " din 100"); assert.ok(k >= 80, "doar " + k);
  const v = MCR.verdictRegim(lumeRegim(1, 8, 4, 0.5));
  assert.equal(v.trece, false); assert.match(v.motiv, /săptămâni/); assert.ok(v.blocuri <= 5, "blocurile = săptămânile: " + v.blocuri);
  assert.equal(v.p, null, "sub 8 săptămâni nu se socotește p");
  const v12 = MCR.verdictRegim(lumeRegim(2, 8, 12, 0.3)); assert.ok(Number.isFinite(v12.p) && v12.p <= 0.025 && v12.trece, "pe 12 săptămâni p-ul e în rezultat: " + v12.motiv);
});

// ---------------- 🟡2 / 🟡3 / 🔵1 registrul ----------------
await test("🟡3 registrul: „Episod scurt” (A3) și „Marjă adăugată pe drum” (O2) nu sunt reguli (se știu abia la ieșire) — intră cu limita lor", () => {
  const risc = { actiuni: { comportament: [{ k: "A3", nume: "Episod scurt (cel mult 5 zile)", p: 0.0005, dif: 0.04, stare: "dovedit-bun" }, { k: "A1", nume: "Ai cumpărat la preț mai mic", p: 0.0004, dif: -0.05, stare: "dovedit-rau" }] },
    boti: { comportament: [{ k: "O2", nume: "Marjă adăugată pe drum", p: 0.0003, dif: -0.06, stare: "dovedit-rau" }] } };
  const reg = V.registru({ calibrare: [], risc });
  const a3 = reg.find((x) => /Episod scurt/.test(x.afirmatie)), o2 = reg.find((x) => /Marjă/.test(x.afirmatie)), a1 = reg.find((x) => /mai mic/.test(x.afirmatie));
  assert.equal(a3.regula, false); assert.equal(a3.ramane, false); assert.equal(a3.treceBh, true); assert.equal(a3.cauza, false); assert.match(a3.limita, /legătură, nu cauză/);
  assert.equal(o2.ramane, false); assert.match(o2.limita, /legătură, nu cauză/);
  assert.equal(a1.ramane, true, "A1 se știe la cumpărare ⇒ rămâne regulă");
});
await test("🟡2 caseta registrului: spune ce familii cuprinde și că restul (modelele, laboratorul, carnetul, Dovada) nu sunt în corecție; legăturile se arată ca legături", () => {
  const ce = lib("cont-ecran.js");
  assert.doesNotMatch(ce, /Radarul are " \+ ciCate\(rg\.length, "test", "teste"\) \+ " deschise/, "textul vechi promitea „cel mult 5 %” pe tot Radarul");
  for (const re of [/ciFamiliiRegistru\(rg\)/, /[Îî]n afara corecției, cu regulile lor proprii/, /legătură, nu cauză/, /x\.cauza === false && x\.limita/]) assert.ok(re.test(ce), "lipsește " + re);
  const f = new Function(ce.slice(ce.indexOf("function ciFamiliiRegistru"), ce.indexOf("function ciFamiliiRegistru") + ce.slice(ce.indexOf("function ciFamiliiRegistru")).indexOf("\n}\n") + 2) + "; return ciFamiliiRegistru;")();
  assert.equal(f([{ felul: "verdict" }, { felul: "obicei" }, { felul: "obicei" }, { felul: "bec" }]), "jurnalul verdictelor, obiceiurile din Riscul tău, becurile și ADX-ul boților");
});
await test("🟡2 / 🔵1 registrul primește și alte familii (carnetul, laboratorul, modelele 🧠/🌳): p, regula și direcția lor intră în aceeași corecție", () => {
  const reg = V.registru({ calibrare: [], alte: [
    { sursa: "Carnetul", afirmatie: "Varianta aleasă bate cealaltă", p: 0.001, dif: 0.02, felul: "carnet", regula: true },
    { sursa: "Rețeaua", afirmatie: "atinge-24 🧠", p: 0.004, dif: 0.02, felul: "model", regula: true },
    { sursa: "Laboratorul", afirmatie: "x", p: null, felul: "laborator", regula: false }] });
  assert.equal(reg.length, 2, "fără p nu intră"); assert.equal(reg[0].m, 2); assert.ok(reg.every((x) => x.ramane));
  // modelele dau p din aceeași distribuție bootstrap ca IC-ul (verifica.mjs)
  const l = []; const r = mb(5); for (let i = 0; i < 400; i++) { const y = r() < 0.4 ? 1 : 0; l.push({ t: Date.UTC(2026, i % 10, 3), s: "M" + (i % 7), y, p: 0.4 + 0.3 * (y - 0.4), r1: 0.4 }); }
  const pb = VER.pBootstrap2(l, "p", "r1"); assert.ok(pb > 0 && pb < 0.05, "modelul care bate clar reperul are p mic: " + pb);
});

await test("🔵1 modelele 🧠 / 🌳 și carnetul dau rândurile lor pentru registru (Retea.pentruRegistru, Carnet.pentruRegistru)", () => {
  const v = { p: 0.003, bss: 0.02, reper: "🎲", nIndep: 120, oreBloc: 24, ic: [0.01, 0.03], icLog: [0.005, 0.02], bss3: 0.01, logloss: 0.5, loglossReper: 0.52, loglossLog: 0.51 };
  const r = RT.pentruRegistru({ "atinge-24": { versiune: RT.VERSIUNE, tinta: "atinge-24", verificare: v }, "atinge-72": { versiune: "veche", verificare: v }, cursa: { versiune: RT.VERSIUNE, verificare: { p: null } } }, "🧠");
  assert.equal(r.length, 1, "doar modelul pe versiunea de azi, cu p"); assert.equal(r[0].felul, "model"); assert.equal(r[0].regula, true); assert.equal(r[0].p, 0.003); assert.match(r[0].afirmatie, /🧠/);
  new Function(lib("carnet.js"))(); const CA = globalThis.Carnet;
  const q = CA.pentruRegistru({ alegere: { stare: "dovedit-bun", p: 0.002, pBloc: 0.006, dif: 0.01 }, asteapta: { stare: "prea puține" } });
  assert.equal(q.length, 1); assert.equal(q[0].p, 0.006, "max(p, pBloc)"); assert.equal(q[0].regula, true); assert.equal(q[0].felul, "carnet");
  const reg = V.registru({ calibrare: [], alte: r.concat(q) }); assert.equal(reg.length, 2); assert.ok(reg.every((x) => x.ramane));
});

// ---------------- 🟡5 calibrarea probabilităților pe monedă × zi ----------------
await test("🟡5 calibrarea: doi boți pe aceeași monedă = un caz; cinci monede în aceeași zi = o zi de piață; pragul de 20 e pe zile distincte", () => {
  const e = (t, bot, simbol, p, r0) => ({ t, bot, simbol, tip: "liniste-24", H: 24, p, r: r0 });
  const doi = PB.calibreaza([e(T0, "1", "X", 0.9, 1), e(T0 + 60000, "2", "X", 0.9, 1)]);
  assert.equal(doi["liniste-24"].cutii[4].n, 1, "aceeași monedă, aceeași oră ⇒ un caz");
  const cinci = []; for (let d = 0; d < 10; d++) for (let c = 0; c < 5; c++) cinci.push(e(T0 + d * ZI + c * 1000, "b" + c, "M" + c, 0.9, d % 2));
  const cal = PB.calibreaza(cinci); assert.equal(cal["liniste-24"].cutii[4].n, 10, "10 zile de piață, nu 50 de cazuri"); assert.equal(PB.corecteaza(0.9, "liniste-24", cal).calibrat, false, "10 zile < 20");
  const mult = []; for (let d = 0; d < 25; d++) for (let c = 0; c < 3; c++) mult.push(e(T0 + d * ZI + c * 1000, "b" + c, "M" + c, 0.85, d < 10 ? 1 : 0));
  const cm = PB.calibreaza(mult); assert.equal(cm["liniste-24"].cutii[4].n, 25); assert.ok(Math.abs(cm["liniste-24"].cutii[4].sp - 25 * 0.85) < 1e-9, "suma cifrelor zise: " + cm["liniste-24"].cutii[4].sp);
  assert.equal(PB.corecteaza(0.85, "liniste-24", cm).calibrat, true);
});
await test("🟡5 corecția: deplasarea cutiei (spus în medie → s-a întâmplat), nu înlocuirea cu rata cutiei; textul spune cifra brută reală", () => {
  const e = (d, p, r0) => ({ t: T0 + d * ZI, bot: "1", simbol: "X", tip: "iese-jos-24", H: 24, p, r: r0 });
  const l = []; for (let d = 0; d < 25; d++) l.push(e(d, 0.02, d < 5 ? 1 : 0));   // a zis 2 %, s-a întâmplat 20 %
  const cal = PB.calibreaza(l), c1 = PB.corecteaza(0.02, "iese-jos-24", cal), c2 = PB.corecteaza(0.15, "iese-jos-24", cal);
  assert.equal(c1.calibrat, true); assert.ok(Math.abs(c1.p - 0.2) < 1e-9, "0,02 + (0,20 − 0,02) = " + c1.p); assert.ok(Math.abs(c2.p - 0.33) < 1e-9, "0,15 + 0,18 = " + c2.p + " (rezoluția din cutie rămâne)");
  assert.match(c1.text, /când am zis în medie ~2%/, c1.text); assert.doesNotMatch(c1.text, /~10%/);
  // calibrarea veche (fără `sp`, de pe server) ⇒ textul spune intervalul cutiei, nu un „~10%” inventat
  const vechi = { "iese-jos-24": { cutii: [{ n: 25, k: 5 }, { n: 0, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }] } };
  assert.match(PB.corecteaza(0.02, "iese-jos-24", vechi).text, /când am zis între 0% și 20%/);
});

await test("🟡5 calibrarea pe acțiuni: cinci acțiuni cumpărate în aceeași săptămână = o săptămână de piață pe cutie (cursa pe 5 zile)", () => {
  const inch = [], cf = {}; for (let w = 0; w < 6; w++) for (let k = 0; k < 5; k++) { const id = "t" + w + k; inch.push({ id, ticker: "T" + k, pornit: Date.UTC(2026, 0, 5) + w * 7 * ZI + k * ORA }); cf[id] = { prob: { p: 0.5, r: k % 2 } }; }
  const c = PB.calibrareActiuni(inch, cf);
  assert.equal(c["act-cursa5"].cutii[2].n, 6, "6 săptămâni, nu 30 de cumpărări"); assert.ok(Math.abs(c["act-cursa5"].cutii[2].sp - 3) < 1e-9); assert.equal(c.rezumat.saptamani, 6);
});

// ---------------- 🔴4 lichidarea „0 %” ----------------
await test("🔴4 rândurile 🎲 au `scurt`: niciodată „0%” gol (sub X%, X = limita de sus a intervalului); forma intervalului `ic` nu se schimbă", () => {
  const x0 = { p: 0, n: 300, k: 0, nIndep: 40, ic: G.wilson(0, 40), orizontOre: 168, conditionat: false, nivel: "toate", stare: null };
  const rr = PB.randuri({ niveluri: { lichidare: 1 }, lichidare7: x0, iese: { jos24: Object.assign({}, x0, { p: 0.4, k: 120, ic: [0.3, 0.5] }) } }, null);
  const li = rr.find((r) => r.cod === "lichidare"), jo = rr.find((r) => r.cod === "iese-jos-24");
  assert.equal(li.scurt, "sub " + Math.ceil(x0.ic[1] * 100) + "%"); assert.notEqual(li.scurt, "0%");
  assert.equal(jo.scurt, "40%"); assert.deepEqual(jo.ic, [0.3, 0.5]); assert.ok(Array.isArray(li.ic) && li.ic.length === 2);
});

// ---------------- 🔵 ----------------
await test("🔵2 rata lui pe acțiune (T212) nu vede viitorul: doar perechile închise până la decizie (Retea.inchisZi), nu până la bara de mâine", () => {
  const b = []; for (let i = 0; i < 260; i++) b.push({ t: Date.UTC(2025, 0, 1) + i * ZI + 13.5 * ORA, o: 10, h: 10.5, l: 9.5, c: 10 });
  const i = 250, dec = RT.inchisZi(b[i].t), trades = [{ ticker: "X", pornit: b[i].t - 5 * ZI, inchis: dec + 6 * ORA, cost: 100, rezultat: -10 }];
  const memo = {}; DT.randuriActiune("directie-t212", "X", b, [], trades, { R: { trasaturiZilnice: () => null, inchisZi: RT.inchisZi } }, memo);
  assert.equal(memo.rata[i].nPe, 0, "vânzarea de la 07:30 UTC a doua zi nu se știa la 01:30 UTC");
});
await test("🔵8 laboratorul: ferestrele independente se numără pe TIMP (20 de monede în aceeași perioadă nu înmulțesc dovezile)", () => {
  const rows = (monede) => { const o = []; for (let m = 0; m < monede; m++) for (let s = 0; s < 80; s++) o.push({ s: 672 + s * 24, parte: s < 50 ? "a" : "t", net: (s * 7 + m) % 5 - 2, miscare: s % 3 === 0 }); return o; };
  const unu = GL.compara(rows(1), (r) => r.miscare, (r) => !r.miscare, 2), douazeci = GL.compara(rows(20), (r) => r.miscare, (r) => !r.miscare, 2);
  assert.equal(douazeci.A.nEf, unu.A.nEf, "nEf pe 20 de monede = pe una: " + douazeci.A.nEf + " / " + unu.A.nEf); assert.equal(douazeci.A.n, 20 * unu.A.n);
});
await test("🔵7 variantele de noapte: mesajul spune din câte variante s-a ales (alegerea e în eșantion)", () => {
  const src = citeste("scripts", "lib", "tura-variante-noapte.mjs");
  assert.match(src, /aleasă dintre " \+ cate\(rowsV\.length, "variantă", "variante"\)/); assert.match(src, /cea mai bună dintre " \+ cate\(/);
});
await test("🔵4 coșurile: același preț în aceeași oră (SNDK / SNDK1) intră o singură dată în ziua lui", () => {
  const ev = []; for (let d = 0; d < 14; d++) { ev.push({ s: "idei", k: "SNDK_US_EQ", n: "cumpar", t: T0 + d * 30 * ZI, h: 5, r: 0.05, val: 0.05, p: 100 }); ev.push({ s: "idei", k: "SNDK1_US_EQ", n: "cumpar", t: T0 + d * 30 * ZI + 1000, h: 5, r: 0.05, val: 0.05, p: 100 }); ev.push({ s: "idei", k: "MU", n: "cumpar", t: T0 + d * 30 * ZI + 2000, h: 5, r: -0.01, val: -0.01, p: 80 }); }
  const c = V.calibrare(ev).find((x) => x.sursa === "idei" && x.h === 5);
  assert.equal(c.niveluri[0].n, 28, "14 zile × 2 nume, nu × 3");
  // evalueaza pune prețul verdictului pe eveniment (cheia dublurii)
  const j = [{ s: "idei", k: "A", n: "cumpar", p: 10, t: T0 }], bare = { A: [{ t: T0 + ZI, c: 11 }, { t: T0 + 2 * ZI, c: 11 }, { t: T0 + 3 * ZI, c: 11 }, { t: T0 + 4 * ZI, c: 11 }, { t: T0 + 5 * ZI, c: 11 }] }, q = [{ t: T0 - ZI, c: 1 }, ...bare.A.map((x) => ({ t: x.t, c: 1 }))];
  assert.equal(V.evalueaza(j, bare, { QQQ: q })[0].p, 10);
});
await test("🟡1 (lateral) „peste QQQ / SPY”: verdictul dat în ședință cu prețul de ieri ⇒ reperul pornește tot de la închiderea de ieri (fără o zi nehedjată)", () => {
  const D = Date.UTC(2026, 9, 12, 13, 30), bara = (k, c) => ({ t: D + k * ZI, c }), mers = [100, 102, 103, 104, 105, 106, 107, 108];
  const bare = { X: mers.map((c, k) => bara(k - 1, c)) }, q = mers.map((c, k) => bara(k - 1, c));   /* acțiunea și QQQ se mișcă identic */
  const j = [{ s: "top-sector", k: "X", n: "top", p: 100, t: D + 2 * ORA + 20 * 60000 }];   /* 15:50 UTC în ziua D, cu închiderea lui D−1 */
  const e = V.evalueaza(j, bare, { QQQ: q }).find((x) => x.h === 5);
  assert.ok(e && Math.abs(e.val) < 1e-12, "peste QQQ ar trebui 0, e " + (e && e.val));
});
await test("🔵9 bootstrap2 pe 10 luni: „bate reperul” (IC 95 % peste 0) fals ≤ 2,5 % pe 300 de seturi FĂRĂ efect cu factor lunar", () => {
  const fals = [0, 0];
  for (let s = 0; s < 300; s++) for (const fel of [0, 1]) {
    const r = mb(2000 + s + 7777 * fel), l = [];
    /* fel 0: factor lunar comun; fel 1: în fiecare lună UNUL din cei doi (aruncat cu banul) are zgomot în plus - avantajul se schimbă pe luni, 10 unități */
    for (let lu = 0; lu < 10; lu++) { const f = 0.25 * N(r), cine = r() < 0.5; for (let m = 0; m < 20; m++) for (let k = 0; k < 15; k++) { const base = Math.min(0.9, Math.max(0.1, 0.4 + 0.1 * N(r))), y = r() < Math.min(0.95, Math.max(0.05, base + f * 0.4)) ? 1 : 0, zp = fel ? (cine ? 0.12 : 0.03) : 0.06, zr = fel ? (cine ? 0.03 : 0.12) : 0.06; l.push({ t: Date.UTC(2026, lu, 1 + k), s: "M" + m, y, p: Math.min(0.97, Math.max(0.03, base + zp * N(r) + 0.05 * f)), r1: Math.min(0.97, Math.max(0.03, base + zr * N(r) + 0.05 * f)) }); } }
    const ic = VER.bootstrap2(l, "p", "r1", 500, 7); if (ic[0] > 0) fals[fel]++;
  }
  console.log("       bootstrap2: „bate reperul” fals " + pr(fals[0], 300) + " (factor lunar) · " + pr(fals[1], 300) + " (avantajul se schimbă pe luni)"); assert.ok(fals[0] / 300 <= 0.025 && fals[1] / 300 <= 0.025, pr(fals[0], 300) + " / " + pr(fals[1], 300));
});
await test("probele vechi atinse: proba-v100149 cu tăieturile pe 13 săptămâni (30 de zile de piață comună nu mai validează regimul)", () => {
  assert.match(citeste("scripts", "proba-v100149.mjs"), /t0: ACUM \+ k \* 36 \* 3600000/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
