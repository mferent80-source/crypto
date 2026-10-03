// Proba v100.85 (03.10, el: reveniri + short) - public/lib/reveniri.js: regulile (pe bare ÎNCHISE), istoricul față de „o zi oarecare”,
// eticheta, frazele, urmărirea; idei.js: listele de monede. Regulile sunt cele FIXATE în specul 2026-10-03-reveniri-si-short-design.md.
//   node scripts/proba-v10085.mjs
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
let R0 = null; const R = () => R0 || (R0 = new Function(`${lib("reveniri.js")}; return Reveniri;`)());
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.85 · reveniri.js (regulile, istoricul, urmărirea) + idei.js (listele de monede)");

const H4 = 4 * 3600000, ZI = 864e5, T0 = Date.UTC(2026, 0, 1);
// n bare de durată d; închiderea dată de f(i), maximul/minimul ±0,2% în jurul ei
const bare = (n, f, d = H4) => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * d, o: c, h: c * 1.002, l: c * 0.998, c }; });
// moneda: 100 (0–149), cade liniar la 60 (150–179), stă la 60 (180–249), urcă la 66 (250–299)
const revine = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : i < 250 ? 60 : 60 + 6 * (i - 249) / 50);
const cutit = (i) => (i < 150 ? 100 : i < 180 ? 100 - 40 * (i - 149) / 30 : 60 - 2 * Math.max(0, i - 249) / 50);
const proaspat = (i) => (i === 296 ? 59 : revine(i));
const subMedie = (i) => (i < 250 ? revine(i) : i <= 285 ? 60 + 10 * (i - 249) / 36 : 70 - 5 * (i - 285) / 14);
// acțiunea: 100 (0–39), cade la 65 (40–59), stă la 65 (60–80), urcă la 72 (81–99)
const revA = (i) => (i < 40 ? 100 : i < 60 ? 100 - 35 * (i - 39) / 20 : i <= 80 ? 65 : 65 + 7 * (i - 80) / 19);

await test("(1) monedă: cădere 34% de la maximul pe 30 de zile, +10% de la minimul de acum ~10 zile, peste media pe 3 zile ⇒ revine", () => {
  const b = bare(300, revine), v = R().monedaPeRevenire(b, b[299].t + H4);
  assert.deepEqual(v, { cadere: 0.3413, deLaMin: 0.1022, zileDeLaMin: 9.8, revine: true });
});
await test("(1) monedă: cădere fără revenire (încă scade) / minim proaspăt (sub 2 zile) / sub media pe 3 zile ⇒ nu revine", () => {
  for (const [nume, f] of [["cuțit", cutit], ["minim proaspăt", proaspat], ["sub medie", subMedie]]) {
    const b = bare(300, f), v = R().monedaPeRevenire(b, b[299].t + H4); assert.ok(v, nume); assert.equal(v.revine, false, nume);
  }
  const p = R().monedaPeRevenire(bare(300, proaspat), bare(300, proaspat)[299].t + H4); assert.ok(p.deLaMin >= 0.08 && p.zileDeLaMin < 2, "doar vechimea minimului o oprește");
});
await test("(1) monedă: doar bare ÎNCHISE - bara în curs și barele de după `acum` nu schimbă verdictul; înainte să se închidă bara 299 se judecă 298", () => {
  const b = bare(300, revine), acum = b[299].t + H4, a = R().monedaPeRevenire(b, acum);
  const cuViitor = b.concat(bare(20, () => 10).map((x, k) => ({ ...x, t: b[299].t + (k + 1) * H4 })));
  assert.deepEqual(R().monedaPeRevenire(cuViitor, acum), a);
  assert.deepEqual(R().monedaPeRevenire(b, acum - 1), R().monedaPeRevenire(b.slice(0, 299), acum));
});
await test("(1) monedă: sub 180 de bare de 4h ⇒ nimic (nicio cifră inventată); listă goală / nu e listă ⇒ nimic", () => {
  const b = bare(179, revine); assert.equal(R().monedaPeRevenire(b, b[178].t + H4), null);
  assert.equal(R().monedaPeRevenire([], Date.now()), null); assert.equal(R().monedaPeRevenire(null, Date.now()), null);
});
await test("(1) acțiune: cădere 27% de la maximul pe 60 de zile, +11% de la minimul de acum 19 zile ⇒ revine, cu stopul sub minim și ținta la maxim", () => {
  const v = R().actiunePeRevenire(bare(100, revA, ZI));
  assert.deepEqual(v, { cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, revine: true, pret: 72, stop: 64.22, tinta: 98.45 });
});
await test("(1) acțiune: sub 60 de bare ⇒ nimic; fără cădere ⇒ nu revine", () => {
  assert.equal(R().actiunePeRevenire(bare(59, revA, ZI)), null);
  assert.equal(R().actiunePeRevenire(bare(100, () => 100, ZI)).revine, false);
});
await test("(1) regulile sunt cele din spec (fixate)", () => {
  assert.deepEqual(R().REGULI.moneda, { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 });
  assert.deepEqual(R().REGULI.actiune, { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 });
});

const pt = (zi, f, x) => ({ t: T0 + zi * ZI, f, ...x });
await test("(2) puncte: unul pe zi, de la fereastra clasamentului (500 de bare); ieșirea la 7 zile după TIMP; `revine` = regula la acel punct", () => {
  const b = bare(700, (i) => (i < 600 ? revine(i % 300) : 66 + (i - 600) * 0.05)), p = R().puncte(b, { r: R().REGULI.moneda, dupaTimp: true, start: 499 });
  assert.equal(p[0].t, b[499].t); assert.equal(p[1].t - p[0].t, ZI);
  for (const x of p) {
    const j = b.findIndex((y) => y.t === x.t), k = b.findIndex((y) => y.t >= x.t + 7 * ZI);
    assert.ok(k > j, "ieșirea e după punct"); assert.equal(x.f, b[k].c / b[j].c - 1); assert.equal(x.revine, R().judeca(b, j, R().REGULI.moneda).revine);
  }
  assert.ok(p[p.length - 1].t + 7 * ZI <= b[b.length - 1].t, "niciun punct fără ieșire");
});
await test("(2) puncte acțiuni: ieșirea la 10 zile de bursă (după index), de la bara 59", () => {
  const b = bare(120, revA, ZI), p = R().puncte(b, { r: R().REGULI.actiune });
  assert.equal(p[0].t, b[59].t); assert.equal(p.length, 120 - 10 - 59); assert.equal(p[0].f, b[69].c / b[59].c - 1);
});
await test("(2) dovada: grupul (cel mult un caz pe serie la 7 zile) față de reperul pe aceleași puncte; eticheta și „puține”", () => {
  const A = Array.from({ length: 20 }, (_, z) => pt(z, z === 0 ? 0.05 : z === 3 ? 0.9 : z === 10 ? -0.02 : 0.01, { revine: z === 0 || z === 3 || z === 10 }));
  const d = R().dovada([A], "revine", { pauzaZile: 7 });
  assert.deepEqual(d, { n: 2, saptamani: 2, pePlus: 0.5, medie: 0.015, mediana: 0.05, baza: { n: 20, pePlus: 0.95, medie: 0.055 }, eticheta: "mai slab", putine: true });
  assert.equal(R().dovada([], "revine", {}), null, "fără puncte, fără istoric");
  const zero = R().dovada([A.map((x) => ({ ...x, revine: false }))], "revine", { pauzaZile: 7 }); assert.equal(zero.n, 0); assert.equal(zero.eticheta, null);
});
await test("(2) eticheta: +3 puncte și media peste ⇒ mai bine; −3 și media sub ⇒ mai slab; altfel cam la fel", () => {
  const E = R().eticheta, b = { pePlus: 0.5, medie: 0.01 };
  assert.equal(E({ pePlus: 0.53, medie: 0.02 }, b), "mai bine"); assert.equal(E({ pePlus: 0.52, medie: 0.02 }, b), "cam la fel");
  assert.equal(E({ pePlus: 0.47, medie: 0.0 }, b), "mai slab"); assert.equal(E({ pePlus: 0.47, medie: 0.02 }, b), "cam la fel");
  assert.equal(E({ pePlus: 0.6, medie: 0.005 }, b), "cam la fel"); assert.equal(E({ n: 0, pePlus: null, medie: null }, b), null);
});
await test("(2) dovada la short: câștigul = scăderea prețului (și la reper); 100+ cazuri pe 20+ săptămâni ⇒ nu „puține”", () => {
  const S = [pt(0, -0.02, { short: true }), pt(1, 0.01, { short: false })], d = R().dovada([S], "short", { pauzaZile: 7, short: true });
  assert.equal(d.pePlus, 1); assert.equal(d.medie, 0.02); assert.equal(d.baza.medie, 0.005);
  const multe = Array.from({ length: 5 }, (_, s) => Array.from({ length: 150 }, (_, z) => pt(z, 0.01, { revine: z % 7 === 0 })));
  const m = R().dovada(multe, "revine", { pauzaZile: 7 }); assert.ok(m.n >= 100 && m.saptamani >= 20, m.n + " / " + m.saptamani); assert.equal(m.putine, false);
});
await test("(2) boții lui: după starea monedei LA PORNIRE (bare închise înainte); short pe monede cu direcția short față de toți boții short", () => {
  const jos = (i) => 100 * Math.pow(0.997, i), bA = bare(300, revine), bB = bare(300, cutit), bS = bare(600, jos);
  const ferS = bS.slice(100, 600), dirS = G.directie(ferS, G.agrega(ferS, ZI)).dir;
  assert.equal(dirS, "short", "precondiția probei: seria de short trebuie să fie în jos pentru GridCalcul.directie");
  const bareDe = (s) => ({ AAA: bA, BBB: bB, SSS: bS }[s] || null);
  const boti = [{ simbol: "AAA", dir: "long", pornit: bA[299].t + H4, net: 5 }, { simbol: "BBB", dir: "long", pornit: bB[299].t + H4, net: -2 },
    { simbol: "SSS", dir: "short", pornit: bS[599].t + H4, net: 3 }, { simbol: "BBB", dir: "short", pornit: bB[299].t + H4, net: -1 }, { simbol: "ZZZ", dir: "long", pornit: 1, net: 9 }];
  const r = R().dovadaBoti(boti, bareDe, G);
  assert.deepEqual(r.revenire, { n: 1, pePlus: 1, mediana: 5, reper: { n: 4, pePlus: 0.5, mediana: 3 } });
  assert.equal(r.short.reper.n, 2); assert.equal(r.short.n, G.directie(bB.slice(0, 300), G.agrega(bB.slice(0, 300), ZI)).dir === "short" ? 2 : 1);
});
await test("(2) frazele: o singură frază sub 160 de caractere, cu reperul și eticheta; fără istoric / fără cazuri; boții lui", () => {
  const T = R().textDovada, B = R().textBoti;
  const slab = { n: 407, saptamani: 44, pePlus: 0.42, medie: -0.012, mediana: -0.021, baza: { n: 15119, pePlus: 0.45, medie: 0.01 }, eticheta: "mai slab", putine: false };
  assert.equal(T(slab, "monede"), "După o cădere ca asta: 42% pe plus în 7 zile, −1,2% în medie; o zi oarecare: 45%, +1,0% — mai slab (407 cazuri).");
  assert.equal(T({ ...slab, n: 66, putine: true }, "monede"), "După o cădere ca asta: 42% pe plus în 7 zile, −1,2% în medie; o zi oarecare: 45%, +1,0% — mai slab (66 de cazuri, puține).");
  assert.equal(T({ n: 393, saptamani: 72, pePlus: 0.59, medie: 0.026, baza: { n: 41457, pePlus: 0.54, medie: 0.013 }, eticheta: "mai bine", putine: false }, "actiuni"),
    "După o cădere ca asta: 59% pe plus în 10 zile de bursă, +2,6% în medie; o zi oarecare: 54%, +1,3% — mai bine (393 de cazuri).");
  assert.equal(T({ n: 512, saptamani: 46, pePlus: 0.55, medie: -0.003, baza: { n: 15119, pePlus: 0.55, medie: -0.01 }, eticheta: "cam la fel", putine: false }, "short"),
    "Ca short, pe monedele liniștite cu direcția short: 55% pe plus în 7 zile, −0,3% în medie; o zi oarecare: 55%, −1,0% — cam la fel (512 cazuri).");
  assert.equal(T(null, "monede"), "Istoricul se socotește azi de la 8:00.");
  assert.equal(T({ ...slab, n: 0, pePlus: null, medie: null, eticheta: null }, "monede"), "După o cădere ca asta: niciun caz încă în istoric; o zi oarecare: 45% pe plus în 7 zile.");
  assert.equal(B({ n: 66, pePlus: 0.53, mediana: 0.32, reper: { n: 832, pePlus: 0.59, mediana: 1.23 } }, "monede"), "Boții tăi porniți așa: 53% pe plus din 66, față de 59% la toți boții tăi.");
  assert.equal(B({ n: 83, pePlus: 0.49, mediana: -0.15, reper: { n: 374, pePlus: 0.56, mediana: 1.3 } }, "short"), "Boții tăi short pe monede cu direcția short: 49% pe plus din 83, față de 56% la toți boții tăi short.");
  assert.equal(B({ n: 0, pePlus: null, mediana: null, reper: { n: 832, pePlus: 0.59 } }, "short"), "N-ai pornit încă boți short pe monede cu direcția short.");
  assert.equal(B({ n: 0, pePlus: null, mediana: null, reper: null }, "monede"), "N-ai pornit încă boți așa."); assert.equal(B(null, "monede"), "");
  for (const t of [T(slab, "short"), T({ ...slab, n: 66, putine: true }, "short"), R().TEXT_SUPRAVIETUITORI]) assert.ok(t.length <= 160 && !/[.?]\s+[A-ZĂÂÎȘȚ]/.test(t), t);
});
await test("(2) urmărirea: doar notările destul de vechi, prețul lipsă sărit, comisionul scăzut, short cu semnul întors, pe `ticker` la acțiuni", () => {
  const U = R().urmarire, acum = Date.UTC(2026, 9, 20, 12);
  const ist = [{ zi: "2026-10-01", simbol: "A", pret: 1, lista: "revenire" }, { zi: "2026-10-02", simbol: "B", pret: 2, lista: "revenire" }, { zi: "2026-10-19", simbol: "A", pret: 1 }, { zi: "2026-10-01", simbol: "X", pret: 5 }];
  const u = U(ist, { A: 1.1, B: 1.8 }, acum, { zile: 7, cost: 0.001 });
  assert.equal(u.n, 2); assert.equal(u.pePlus, 1); assert.ok(Math.abs(u.medie - ((0.1 - 0.001) + (-0.1 - 0.001)) / 2) < 1e-12);
  assert.equal(u.text, "Din 2 sugestii de cel puțin 7 zile: 1 pe plus, −0,1% în medie de la prețul sugestiei, după comision (puține — mai așteaptă).");
  const s = U([{ zi: "2026-10-01", simbol: "B", pret: 2 }], { B: 1.8 }, acum, { zile: 7, cost: 0.001, short: true }); assert.equal(s.pePlus, 1); assert.ok(Math.abs(s.medie - (0.1 - 0.001)) < 1e-12);
  const t = U([{ zi: "2026-09-01", ticker: "AAPL_US_EQ", simbol: "AAPL", pret: 100 }], { AAPL_US_EQ: 110 }, acum, { zile: 14, cost: 0.003, cheie: "ticker" }); assert.equal(t.n, 1);
  assert.equal(U([], {}, acum, { zile: 7 }).text, "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită.");
});
const CL = { la: 5, monede: [
  { simbol: "AAA_USDT_PERP", volum: 10, stare: "evita", dir: "long", scor: 9, revenire: { cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, revine: true } },
  { simbol: "BBB_USDT_PERP", volum: 30, stare: "candidat", dir: "neutru", scor: 5, revenire: { cadere: 0.28, deLaMin: 0.09, zileDeLaMin: 3, revine: true } },
  { simbol: "CCC_USDT_PERP", volum: 20, stare: "candidat", dir: "short", scor: 2, revenire: { cadere: 0.1, deLaMin: 0.02, zileDeLaMin: 1, revine: false } },
  { simbol: "DDD_USDT_PERP", volum: 50, stare: "candidat", dir: "short", scor: 7, revenire: null },
  { simbol: "EEE_USDT_PERP", volum: 60, stare: "evita", dir: "short", scor: 8 } ] };
await test("(3) pe revenire: doar `revenire.revine`, cele mai lichide întâi, cu istoricul lui pe monedă; clasament vechi (fără `revenire`) ⇒ nimic", () => {
  const l = ID.reveniriBoti(CL, [{ moneda: "AAA", rezultat: 2 }, { moneda: "AAA", rezultat: -1 }], 5);
  assert.deepEqual(l.map((x) => x.moneda), ["BBB", "AAA"]); assert.deepEqual(l[1].istoric, { n: 2, pePlus: 1, total: 1 }); assert.equal(l[0].revenire.cadere, 0.28);
  assert.deepEqual(ID.reveniriBoti({ monede: [{ simbol: "X_USDT_PERP", stare: "candidat" }] }, [], 5), []); assert.deepEqual(ID.reveniriBoti(null, [], 5), []);
  assert.equal(ID.reveniriBoti(CL, [], 1).length, 1);
});
await test("(3) pentru short: liniștite (candidat) cu direcția short, după scor; „evită” nu intră", () => {
  assert.deepEqual(ID.shortBoti(CL, [], 5).map((x) => x.moneda), ["DDD", "CCC"]); assert.deepEqual(ID.shortBoti(null, [], 5), []);
});
console.log("\n" + (pica ? "V100.85 PICA · " + pica + " din " + (ok + pica) : "V100.85 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
