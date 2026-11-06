// Proba v100.307-a (I-841, 06.11.2026: „Trade-ul zilei: P3 condiționat de ziua deja făcută”). Pozele de pe VPS din 06.11 00:20: BTC „7 %”
// deși ziua era la 7,1 % față de 6,8 % ieri cu ~96 % din zi format; ETH „6 %” la 9,8 % față de 9,3 %. Modelul P3 vede doar ieri și alaltăieri.
// Ipoteza (scrisă ÎNAINTE de cifre, comentariul din lib/trade-zilei.js): dată fiind ora h și cât s-a mișcat deja ziua, P(întinderea finală
// > ieri) se citește dintr-o repartiție măsurată pe ore. ÎNCERCAREA 2 (după revizia independentă: încercarea 1 presupunea închiderea = prețul
// de acum și sărea la x = 1): G_h = întinderea finală relativă (cu închiderea reală) / întinderea relativă de până acum (panaAcum);
// P3c = P(G_h ≥ r1 / panaAcum); apoi P3 nou = logistica (pe blocuri de ore, învățată pe zilele de ÎNVĂȚAT) din logit(P3 model) și logit(P3c).
//   1. constantele înghețate au forma scrisă; P(G ≥ t) e 1 la 0, descrescătoare; FĂRĂ SALT la x = 1 (garda structurală a reviziei);
//   2. pe barele REALE ale fixture-ului (proba-date/tz-p3z-1h.json: 7 monede alese după o regulă fixă - primele în ordine alfabetică cu
//      toate barele 03.05 … 02.11.2026), zilele de ÎNVĂȚAT (până la 24.08): sub cuantila înghețată p stau p din zile;
//   3. zilele NEVĂZUTE din fixture (de la 25.08): Brier P3 nou < modelul de dimineață și < P3c singur; calibrarea; cifra „N au ieșit așa”;
//   4. cazurile din 06.11 (BTC 7,1 / 6,8 și ETH 9,8 / 9,3 la 22:05 UTC, fără „deja”) ⇒ P3 mare; seara liniștită ⇒ P3 mic;
//   5. 00:00 UTC (proba A pre-înregistrată, tura-proba-a.mjs) NEATINS: nicio bară de azi ⇒ P3 = modelul;
//   6. ecranul (cifra mare = P3 nou pe ton normal, prognoza de la 00:00 UTC ca rând mic; „de obicei” și gridul spun că vin din prognoză),
//      rezumatul de sus și Discord numără cu P3 nou; regulile pre-înregistrate A / B (trade() și proba A) citesc P3-ul de la 00:00 UTC.
// Toleranțele: percentila 99 a abaterilor pe 300 de submulțimi ALEATOARE de 7 monede din cele 77 (nu din fixture-ul ales; scratchpad
// i841/toleranta2.mjs): PIT 9,0 pp pe (oră, nivel) / 3,1 pp în medie; calibrarea 13,1 pp pe zecime / ECE 4,4 pp; tabela 12,7 pp; Brier-ul nou
// a bătut ambele în 300 din 300. Garda x ≈ 1 pe fixture (orele 17–23, x ∈ [0,95; 1) și [1; 1,05), toate zilele) cere 10 pp, cum a cerut
// revizia, deși zgomotul pe 7 monede oarecare e 5,6 pp la mediană și 16,6 pp la p99 - de aceea o dublează garda structurală (testul 1).
//   node scripts/proba-v100307-a.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { liniiTradeZilei } from "./lib/tura-trade-zilei.mjs";
import { judecaZi } from "./lib/tura-proba-a.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); });
}
console.log("\nV100.307-a · Trade-ul zilei: P3 condiționat de ziua făcută (I-841) · proba\n");

const ctx = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout };
ctx.window = ctx; ctx.module = undefined;
vm.createContext(ctx);
for (const f of ["text-ro.js", "tablou-bot.js", "trade-zilei.js", "trade-zilei-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx);
const TZ = ctx.TradeZilei;
const ORA = 3600000, ZI = 86400000, T0 = Math.floor(1761955200000 / ZI) * ZI;
const TOL_PIT = 0.10, TOL_PIT_MEDIE = 0.04, TOL_CAL = 0.14, TOL_ECE = 0.05, TOL_TABEL = 0.13, TOL_X1 = 0.10;
const TAIE = Date.UTC(2026, 7, 25) / ZI;   // prima zi NEVĂZUTĂ la învățare

// ---------------------------------------------------------------- 1. constantele
await test("1. 🔑 constantele: cuantilele lui G pe 23 de ore × 23 de niveluri, crescătoare; P(G ≥ t) = 1 la 0, descrescătoare; FĂRĂ SALT la x = 1 (P3 continuu în x la fiecare oră)", () => {
  assert.ok(Array.isArray(TZ.NIV_G) && TZ.NIV_G.length === 23, "NIV_G");
  for (let k = 1; k < 23; k++) assert.ok(TZ.NIV_G[k] > TZ.NIV_G[k - 1]);
  assert.ok(Array.isArray(TZ.CUANT_G) && TZ.CUANT_G.length === 23, "CUANT_G: 23 de ore");
  TZ.CUANT_G.forEach((Q, i) => { assert.equal(Q.length, 23, "ora " + (i + 1)); Q.forEach((q, k) => { assert.ok(q > 0, "ora " + (i + 1) + " nivel " + k); if (k) assert.ok(q >= Q[k - 1], "crescătoare la ora " + (i + 1)); }); });
  for (let h = 2; h <= 23; h++) assert.ok(TZ.CUANT_G[h - 1][11] <= TZ.CUANT_G[h - 2][11] + 1e-9, "mediana lui G scade spre 1 cu ora (" + h + ")");
  assert.equal(TZ.BLOC_P3Z.length, 6); assert.equal(TZ.COEF_P3Z.length, 6); TZ.COEF_P3Z.forEach((w) => { assert.equal(w.length, 3); assert.ok(w[1] > 0 && w[2] > 0, "ambele intrări cântăresc pozitiv"); });
  assert.ok(TZ.COEF_P3Z[5][2] > TZ.COEF_P3Z[0][2] && TZ.COEF_P3Z[0][1] > TZ.COEF_P3Z[5][1], "dimineața modelul cântărește mai mult, seara ziua făcută");
  for (let h = 1; h <= 23; h++) {
    assert.equal(TZ.supravietuireG(h, 0), 1); assert.ok(TZ.supravietuireG(h, 1e9) < 1e-6);
    let ant = 1; for (let t = 0.05; t < 30; t *= 1.05) { const p = TZ.supravietuireG(h, t); assert.ok(p <= ant + 1e-12 && p >= 0, "ora " + h + " t " + t); ant = p; }
    // garda reviziei (continuitate, nu pantă): la x = 1 ± 0,001 % P3 se mișcă sub 0,5 pp și nu scade. Încercarea 1 sărea aici cu până la 87 pp
    // (închiderea luată egală cu prețul de acum). Panta poate fi abruptă și CONTINUĂ: la ora 23, între x 0,999 și 1,001, P3 urcă ~14 pp -
    // cu o oră rămasă, întinderea finală stă lângă cea de acum (pasul scade liniar cu intervalul: 14,2 / 1,6 / 0,16 pp la ±0,1 / 0,01 / 0,001 %)
    for (const pm of [0.1, 0.3, 0.6]) {
      const sub = TZ.combinaP3Z(h, pm, TZ.supravietuireG(h, 1 / (1 - 1e-5))), peste = TZ.combinaP3Z(h, pm, TZ.supravietuireG(h, 1 / (1 + 1e-5)));
      assert.ok(peste >= sub - 1e-12 && peste - sub <= 0.005, "ora " + h + ", model " + pm + ": P3 la x 0,99999 = " + sub.toFixed(4) + ", la x 1,00001 = " + peste.toFixed(4));
    }
  }
});

// ---------------------------------------------------------------- 2–3. pe barele reale ale fixture-ului
const FX = JSON.parse(citeste("scripts", "proba-date", "tz-p3z-1h.json"));
function decodeaza(m) { const out = []; let c = m.c0; for (let i = 0; i < m.d.length; i += 3) { const o = c; const h = c * Math.exp(m.d[i] / FX.k), l = c * Math.exp(m.d[i + 1] / FX.k); c = c * Math.exp(m.d[i + 2] / FX.k); out.push({ t: m.t0 + (i / 3) * ORA, o, h, l, c }); } return out; }
const randuri = [], bareFx = [];
for (const m of FX.monede) {
  const b = decodeaza(m); bareFx.push({ s: m.s, b });
  const z0 = Math.ceil(b[0].t / ZI) * ZI + 30 * ZI;
  for (let z = z0; ; z += ZI) {
    const i0 = (z - b[0].t) / ORA; if (!b[i0 + 23]) break;
    let H = -Infinity, L = Infinity; for (let q = i0; q <= i0 + 23; q++) { H = Math.max(H, b[q].h); L = Math.min(L, b[q].l); }
    const C = b[i0 + 23].c;
    for (let h = 1; h <= 23; h++) {
      const i = i0 + h, d = TZ.azi(b.slice(Math.max(0, i - 600), i), z + h * ORA + 300000); if (!d || d.eroare || d.bareAzi !== h) continue;
      randuri.push({ s: m.s, z: z / ZI, h, G: ((H - L) / C) / d.panaAcum, x: d.panaAcum / d.r1, y: (H - L) / C > d.r1 ? 1 : 0, deja: d.dejaMaiMult, p3: d.p3, p3m: d.p3Model, p3c: d.p3Ziua, cuZiua: d.cuZiua, iesit: d.iesitCuZiua, d });
    }
  }
}
const INV = randuri.filter((r) => r.z < TAIE), NEV = randuri.filter((r) => r.z >= TAIE);

await test("2. 🔑 cuantilele înghețate ale lui G reproduc măsurarea pe fixture (zilele de ÎNVĂȚAT, 7 monede reale): sub cuantila p stau p din zile, ±10 pp pe (oră, nivel), ±4 pp în medie", () => {
  assert.equal(FX.monede.length, 7); assert.ok(INV.length >= 7 * 80 * 23 * 0.95, "rânduri de învățat: " + INV.length);
  const PS = [0.1, 0.25, 0.5, 0.75, 0.9], abateri = [];
  for (let h = 1; h <= 23; h++) {
    const G = INV.filter((r) => r.h === h && r.G > 0 && isFinite(r.G)).map((r) => r.G);
    for (const p of PS) { const q = TZ.CUANT_G[h - 1][TZ.NIV_G.indexOf(p)]; const f = G.filter((x) => x <= q + 1e-9).length / G.length; abateri.push({ h, p, f, d: Math.abs(f - p) }); }
  }
  const rele = abateri.filter((a) => a.d > TOL_PIT), medie = abateri.reduce((s, a) => s + a.d, 0) / abateri.length;
  console.log("       PIT pe învățat: " + abateri.length + " (oră, nivel), abaterea medie " + (medie * 100).toFixed(1).replace(".", ",") + " pp, cea mai mare " + (Math.max(...abateri.map((a) => a.d)) * 100).toFixed(1).replace(".", ",") + " pp");
  assert.equal(rele.length, 0, rele.map((a) => a.h + ":00 p " + a.p + " ⇒ " + a.f.toFixed(3)).join("; "));
  assert.ok(medie <= TOL_PIT_MEDIE, "abaterea medie " + medie.toFixed(3));
});

await test("3. 🔑 zilele NEVĂZUTE din fixture: Brier P3 nou < modelul de dimineață și < P3c singur; calibrarea pe zecimi ±14 pp, ECE ≤ 5 pp; „N au ieșit așa” la ±13 pp; garda x ≈ 1 seara ±10 pp", () => {
  const S = NEV.filter((r) => !r.deja);
  assert.ok(S.length >= 5000, "rânduri nevăzute fără „deja”: " + S.length);
  assert.ok(S.every((r) => r.cuZiua === true && r.p3 === r.d.p3CuZiua && r.p3c > 0 && r.p3c <= 1), "cu ziua în curs și fără „deja”, P3 e cel condiționat");
  const br = (k) => S.reduce((s, r) => s + (r[k] - r.y) ** 2, 0) / S.length, bn = br("p3"), bm = br("p3m"), bc = br("p3c");
  const v4 = (x) => x.toFixed(4).replace(".", ",");
  console.log("       Brier pe nevăzut (" + S.length + " de rânduri, " + new Set(S.map((r) => r.z)).size + " de zile): nou " + v4(bn) + " · model " + v4(bm) + " · P3c " + v4(bc));
  assert.ok(bn < bm, "nou " + bn + " ≥ model " + bm); assert.ok(bn < bc, "nou " + bn + " ≥ P3c " + bc);
  const dec = Array.from({ length: 10 }, () => ({ n: 0, sp: 0, sy: 0 }));
  for (const r of S) { const i = Math.min(9, Math.floor(r.p3 * 10)); dec[i].n++; dec[i].sp += r.p3; dec[i].sy += r.y; }
  const ece = dec.reduce((s, e) => s + Math.abs(e.sy - e.sp), 0) / S.length;
  console.log("       zecimi (n / spus / ieșit / tabela): " + dec.map((e, i) => e.n ? e.n + "/" + Math.round(100 * e.sp / e.n) + "/" + Math.round(100 * e.sy / e.n) + "/" + Math.round(100 * TZ.IESIT_P3Z_TOATE[i]) : "0").join("  ") + " · ECE " + (ece * 100).toFixed(1).replace(".", ",") + " pp");
  dec.forEach((e, i) => { if (e.n >= 100) { assert.ok(Math.abs(e.sy / e.n - e.sp / e.n) <= TOL_CAL, "zecimea " + i + ": spus " + (e.sp / e.n).toFixed(3) + ", ieșit " + (e.sy / e.n).toFixed(3)); assert.ok(Math.abs(e.sy / e.n - TZ.IESIT_P3Z_TOATE[i]) <= TOL_TABEL, "tabela, zecimea " + i); } });
  assert.ok(ece <= TOL_ECE, "ECE " + ece.toFixed(3));
  // garda x ≈ 1 a reviziei: orele 17–23, fără „deja”, toate zilele fixture-ului (pe nevăzut singur sunt prea puține rânduri)
  for (const [lo, hi] of [[0.95, 1], [1, 1.05]]) {
    const B = randuri.filter((r) => !r.deja && r.h >= 17 && r.x >= lo && r.x < hi), sp = B.reduce((s, r) => s + r.p3, 0) / B.length, ie = B.reduce((s, r) => s + r.y, 0) / B.length;
    console.log("       x în [" + String(lo).replace(".", ",") + "; " + String(hi).replace(".", ",") + "), orele 17–23: " + B.length + " de rânduri, spus " + (sp * 100).toFixed(1).replace(".", ",") + " %, ieșit " + (ie * 100).toFixed(1).replace(".", ",") + " %");
    assert.ok(B.length >= 100, "prea puține rânduri: " + B.length); assert.ok(Math.abs(sp - ie) <= TOL_X1, "x în [" + lo + ", " + hi + "): spus " + sp.toFixed(3) + ", ieșit " + ie.toFixed(3));
  }
  // cifra din text = celula (blocul de ore, zecimea) a tabelei măsurate pe nevăzut, sau zecimea pe toate orele când celula are sub 200 de rânduri
  for (const r of S.slice(0, 400)) {
    assert.ok(Math.abs(r.iesit - TZ.iesitP3Z(r.h, r.p3)) < 1e-12);
    const h = ctx.tzCartela({ simbol: r.s, pionex: r.s + "_USDT_PERP", fel: "piata", d: r.d });
    // celula (bloc, zecime) goală ⇒ cifra vine din toate orele și textul o spune (revizia 🔵)
    const fraza = r.d.iesitToateOrele ? "din 100 de zile cu P3 ca azi (pe toate orele; la ora asta sunt prea puține), " : "din 100 de zile ca azi la ora asta, ";
    assert.ok(h.includes("din ziua de până acum și din ieri: " + fraza + Math.round(r.iesit * 100) + " au ieșit așa"), r.s + " " + r.z + " " + r.h);
  }
});

// ---------------------------------------------------------------- 4. cazurile din 06.11 (bare sintetice cu cifrele din poze)
// zile întregi cu range-urile date (maximul la 12:00, minimul la 06:00, închiderea 100), apoi `ore` bare de azi: maximul `sus` la 01:00, minimul `jos` la 03:00, prețul de acum 100
function bare(ranges, ore, sus, jos) {
  const out = [], p = 100;
  ranges.forEach((r, d) => { for (let h = 0; h < 24; h++) out.push({ t: T0 + d * ZI + h * ORA, o: p, h: h === 12 ? p * (1 + r / 2) : p * 1.001, l: h === 6 ? p * (1 - r / 2) : p * 0.999, c: p }); });
  for (let h = 0; h < ore; h++) out.push({ t: T0 + ranges.length * ZI + h * ORA, o: p, h: h === 1 ? sus : p * 1.0005, l: h === 3 ? jos : p * 0.9995, c: p });
  return out;
}
const zileCu = (rest, alalt, ieri) => { const r = Array(12).fill(rest); r[10] = alalt; r[11] = ieri; return r; };
const BTC = TZ.azi(bare(zileCu(0.02, 0.05, 0.068), 22, 105, 97.9), T0 + 12 * ZI + 22 * ORA + 300000);
const ETH = TZ.azi(bare(zileCu(0.03, 0.07, 0.093), 22, 106, 96.2), T0 + 12 * ZI + 22 * ORA + 300000);

await test("4a. 🔑 06.11, BTC la 22:05 UTC: 7,1 % până acum față de 6,8 % ieri, prețul sub maxim (fără „deja”) ⇒ P3 ≥ 85 %; ETH 9,8 / 9,3 la fel; modelul de dimineață rămâne alături", () => {
  for (const [n, d, pana, ieri] of [["BTC", BTC, 0.071, 0.068], ["ETH", ETH, 0.098, 0.093]]) {
    assert.ok(!d.eroare, d.eroare); assert.ok(Math.abs(d.panaAcum - pana) < 1e-9 && Math.abs(d.r1 - ieri) < 1e-9, n + ": " + d.panaAcum + " / " + d.r1);
    assert.equal(d.dejaMaiMult, false, n + ": (max − min) / max e sub ieri ⇒ nu „deja”"); assert.equal(d.oreZi, 22); assert.equal(d.cuZiua, true);
    assert.ok(d.p3Model < 0.15, n + ": modelul de dimineață spunea puțin (" + d.p3Model + ")");
    assert.ok(d.p3 >= 0.85, n + ": P3 cu ziua de până acum " + d.p3); assert.equal(d.p3, d.p3CuZiua); assert.ok(d.p3Ziua > 0.85 && d.p3Ziua < 1, n + ": P3c " + d.p3Ziua + " (o închidere spre maxim poate coborî procentul)");
  }
});

await test("4b. seara liniștită: ieri liniștit (modelul ~70 %), dar la 20:05 UTC ziua e la 0,5 % față de 2 % ieri ⇒ P3 sub 10 %; dimineața (07:05) aceeași zi rămâne aproape de model", () => {
  const d = TZ.azi(bare(zileCu(0.04, 0.025, 0.02), 20, 100.25, 99.75), T0 + 12 * ZI + 20 * ORA + 300000);
  assert.ok(d.p3Model > 0.6, "modelul " + d.p3Model); assert.ok(d.p3 < 0.10, "P3 nou " + d.p3); assert.equal(d.cuZiua, true);
  const d7 = TZ.azi(bare(zileCu(0.04, 0.025, 0.02), 7, 100.5, 99.5), T0 + 12 * ZI + 7 * ORA + 300000);   // 1 % până la 07:00, cât face de obicei
  assert.ok(Math.abs(d7.p3 - d7.p3Model) < 0.15, "dimineața: nou " + d7.p3 + ", model " + d7.p3Model);
});

// ---------------------------------------------------------------- 5. 00:00 UTC - proba A pre-înregistrată
await test("5. 🔑 00:00 UTC (proba A pre-înregistrată) NEATINS: nicio bară de azi ⇒ P3 = modelul, fără P3c; judecaZi pe fiecare zi nevăzută a fixture-ului dă P3-ul modelului; tura-proba-a.mjs neschimbată", () => {
  const d0 = TZ.azi(bare(zileCu(0.02, 0.05, 0.068), 0, 100, 100), T0 + 12 * ZI);
  assert.equal(d0.bareAzi, 0); assert.equal(d0.p3, d0.p3Model); assert.equal(d0.cuZiua, false); assert.equal(d0.p3Ziua, null); assert.equal(d0.p3CuZiua, null);
  let zile = 0;
  for (const { b } of bareFx.slice(0, 3)) {
    for (let z = TAIE; z < TAIE + 60; z += 3) {
      const j = judecaZi(b, z, TZ); if (j.eroare) continue; zile++;
      const inainte = TZ.azi(b.filter((x) => x.t < z * ZI), z * ZI);
      assert.equal(j.p3, inainte.p3Model, "ziua " + z); assert.equal(TZ.azi(b, z * ZI).bareAzi, 0);
    }
  }
  assert.ok(zile >= 50, "zile judecate: " + zile);
  const s = citeste("scripts", "lib", "tura-proba-a.mjs");
  assert.match(s, /const ziStart = zi \* ZI, d = TradeZilei\.azi\(bare, ziStart\);/); assert.match(s, /p3: d\.p3Model, semnal: d\.p3Model >= PRAG_P3/);
});

await test("5b. 🔑 regulile pre-înregistrate A / B din trade() citesc P3-ul de la 00:00 UTC (p3Model), nu P3 condiționat de ziua făcută", () => {
  const sA = TZ.PROBA.A.dovedit, sB = TZ.PROBA.B.dovedit;
  try {
    TZ.PROBA.A.dovedit = true;
    assert.equal(TZ.trade(Object.assign({}, BTC, { p3: 0.95, p3Model: 0.3 })).fel, "niciunul", "P3 condiționat mare, modelul mic ⇒ nu A");
    assert.equal(TZ.trade(Object.assign({}, BTC, { p3: 0.2, p3Model: 0.8 })).fel, "A");
    TZ.PROBA.A.dovedit = sA; TZ.PROBA.B.dovedit = true;
    assert.equal(TZ.trade(Object.assign({}, BTC, { p3: 0.1, p3Model: 0.6 })).fel, "niciunul", "P3 condiționat mic, modelul peste 45 % ⇒ nu B");
    assert.equal(TZ.trade(Object.assign({}, BTC, { p3: 0.9, p3Model: 0.4 })).fel, "B");
  } finally { TZ.PROBA.A.dovedit = sA; TZ.PROBA.B.dovedit = sB; }
});

// ---------------------------------------------------------------- 6. ecranul, rezumatul, Discord
await test("6a. 🔑 cartela cu ziua în curs: cifra mare = P3 nou pe ton normal, „din ziua de până acum și din ieri…”; prognoza de la 00:00 UTC rămâne ca rând (nimic pierdut)", () => {
  const h = ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: BTC });
  const p = Math.round(BTC.p3 * 100), m = Math.round(BTC.p3Model * 100), n = Math.round(BTC.iesitCuZiua * 100);
  assert.match(h, new RegExp('Azi se mișcă mai mult ca ieri</span><b class="tzCifra tzBun">' + p + ' %</b><span class="tzMut tzMic">din ziua de până acum și din ieri: din 100 de zile ca azi la ora asta, ' + n + " au ieșit așa · până acum 7,1 % față de 6,8 % ieri</span>"));
  assert.match(h, new RegExp('Prognoza de la 00:00 UTC</span><b class="tzCifra tzMut">' + m + ' %</b><span class="tzMut tzMic">din ieri și alaltăieri, nu vede ziua de azi: din 100 de zile după un ieri ca ăsta, \\d+ au ieșit așa</span>'));
  assert.doesNotMatch(h, /Azi se mișcă mai mult ca ieri <small/, "eticheta veche de pe cifra mare a plecat pe rândul ei");
  // revizia 🟡 2: „de obicei”, gridul și stopul vin din clasa modelului de dimineață ⇒ spus, ca să nu contrazică cifra mare
  assert.match(h, /Cât se mișcă azi, de obicei <small class="tzMut">· din prognoza de la 00:00 UTC<\/small><\/span>/);
  assert.match(h, /cuprinde restul zilei UTC în \d+ % din zile \(măsurat pe zile nevăzute, 75 de monede\) · lățimea din prognoza de la 00:00 UTC<\/span>/);
  const h0 = ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: TZ.azi(bare(zileCu(0.02, 0.05, 0.068), 0, 100, 100), T0 + 12 * ZI + 300000) });
  assert.match(h0, /calibrat: din 100 de zile ca azi, \d+ au ieșit așa/); assert.doesNotMatch(h0, /Prognoza de la 00:00 UTC/);
  const st = { monede: [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: BTC }], simboluri: [1], la: Date.now(), zi: 0, inLucru: false, eroare: null };
  assert.match(ctx.tzHtml(st, Date.now()), /cu ziua în curs ține cont și de cât s-a mișcat deja ziua, verificat pe 72 de zile nevăzute, 77 de monede Pionex - BTC și ETH nu sunt printre ele/, "introducerea spune ce e cifra mare de peste zi");
  const h0g = ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: TZ.azi(bare(zileCu(0.02, 0.05, 0.068), 0, 100, 100), T0 + 12 * ZI + 300000) });
  assert.doesNotMatch(h0g, /din prognoza de la 00:00 UTC/, "la 00:xx UTC totul e prognoza - fără etichetă");
  // celula goală: fraza „pe toate orele”
  const gol = Object.assign({}, BTC, { iesitToateOrele: true });
  assert.match(ctx.tzCartela({ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata", d: gol }), /din 100 de zile cu P3 ca azi \(pe toate orele; la ora asta sunt prea puține\), \d+ au ieșit așa/);
});

await test("6b. rezumatul de sus și Discord numără cu P3 nou și spun ce e; rândurile ≤ 160", () => {
  const linistit = TZ.azi(bare(zileCu(0.04, 0.025, 0.02), 20, 100.25, 99.75), T0 + 12 * ZI + 20 * ORA + 300000);   // modelul ~70 %, P3 nou < 10 %
  // fiecare singur, ca numărătoarea să despartă P3 nou de model (împreună ar ieși „1 din 2” în ambele feluri)
  assert.match(ctx.tzRezumat([{ simbol: "BTC", fel: "piata", d: BTC }]), /Azi: 1 monedă din 1 se mișcă probabil mai mult ca ieri, 0 stau probabil mai liniștite/);
  assert.match(ctx.tzRezumat([{ simbol: "DOGE", fel: "piata", d: linistit }]), /Azi: 0 monede din 1 se mișcă probabil mai mult ca ieri, 1 stă probabil mai liniștită/);
  const r = ctx.tzRezumat([{ simbol: "BTC", fel: "piata", d: BTC }, { simbol: "DOGE", fel: "piata", d: linistit }]);
  assert.match(r, /\(cu ziua de până acum\)/); assert.doesNotMatch(r, /prognoza de la 00:00 UTC; ziua e în curs/);
  const l = liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: BTC }, { simbol: "DOGE", fel: "bot", d: linistit }], TZ);
  assert.ok(l.every((x) => x.length <= 160), l.map((x) => x.length).join(","));
  assert.match(l[0], /^🎯 Azi: 1 din 2 se mișcă probabil mai mult ca ieri \(cu ziua de până acum\) · /);
  assert.match(liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: BTC }], TZ)[0], /^🎯 Azi: 1 din 1 se mișcă/); assert.match(liniiTradeZilei([{ simbol: "DOGE", fel: "bot", d: linistit }], TZ)[0], /^🎯 Azi: 0 din 1 se mișcă/);
  assert.match(l[1], new RegExp("^BTC 100,00 · >ieri " + Math.round(BTC.p3 * 100) + " % · ")); assert.match(l[2], new RegExp("^🤖 DOGE 100,00 · >ieri " + Math.round(linistit.p3 * 100) + " % · "));
  assert.equal(l[l.length - 1], "„>ieri” = din ziua de până acum și din ieri; „azi ~”, gridul și stopul = din prognoza de la 00:00 UTC și ce s-a mișcat deja.");
  const d0 = TZ.azi(bare(zileCu(0.02, 0.05, 0.068), 0, 100, 100), T0 + 12 * ZI + 300000), l0 = liniiTradeZilei([{ simbol: "BTC", fel: "piata", d: d0 }], TZ);
  assert.doesNotMatch(l0[0], /cu ziua de până acum/, "la 00:xx UTC e chiar prognoza"); assert.doesNotMatch(l0.join("\n"), /din prognoza de la 00:00 UTC/);
});

await test("6c. nimic din viitor: P3 nou nu se schimbă cu barele de după `acum` (fixture, 3 monede × 5 zile × 4 ore)", () => {
  for (const { b } of bareFx.slice(0, 3)) for (let z = TAIE + 2; z < TAIE + 50; z += 10) for (const h of [3, 9, 15, 21]) {
    const i = (z * ZI - b[0].t) / ORA + h, acum = z * ZI + h * ORA + 300000;
    const a = TZ.azi(b.slice(i - 600, i), acum), c = TZ.azi(b.slice(i - 600, i + 30), acum);
    assert.equal(a.cuZiua, !a.dejaMaiMult); assert.equal(a.p3, c.p3); assert.equal(a.p3Ziua, c.p3Ziua);
  }
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
