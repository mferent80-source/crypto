// Proba v100.369 (20.11.2026, el: „continua cu radar” ⇒ pagina „Contul întreg” „ca Jurnalul”; hotărârile LUI după auditul cu 2 revizori:
// câștigul „lei net, pe bucăți” (boții FĂRĂ procent), riscul „cifra de acum + proba”, graficele TOATE 4, aspectul ca paginile refăcute;
// bugurile 🔴 / 🟡 reparate fără întrebare). Faptele, nu forma HTML-ului:
//  A - modulul: banii boților NET în lei la cursul zilei închiderii, pe bucăți + „proces sau ghinion”; riscul pe agitația de acum (EWMA) cu
//      proba Kupiec pe zilele de dinainte; reperul în lei; Sharpe cu interval; scăderea cărții; lipsa ≠ 0
//  B - colectorul: netul (nu brutul), fără procentul boților, toate perechile, Salt necitit = lipsă, ziua valorii = închiderea, săptămâna lecției
//  C - pagina: fraza + De unde știu, 3 cifre, rândurile CI_RANDURI, „Ce aș face eu” în ordinea nouă, o zecimală, semnul benzii, „de” de la 20,
//      cheile traduse, căderile rutelor spuse, nimic pierdut (titlurile vechi), 4 grafice; tema; versiunile
//   node scripts/proba-v100369.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.369 · Contul întreg cinstit, ca Jurnalul · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, RegExp, TextRo: globalThis.TextRo, document: { getElementById: () => null } };
ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
for (const f of ["cont-intreg.js", "cont-grafice.js", "factori.js", "disciplina.js", "cont-ecran.js"]) vm.runInContext(citeste("public", "lib", f) + (f === "cont-ecran.js" ? "\n;globalThis.ciZiInchidere=ciZiInchidere;globalThis.ciHtml=ciHtml;globalThis.ciFac=ciFac;globalThis.ciZileHtml=ciZileHtml;globalThis.ciDisciplinaHtml=ciDisciplinaHtml;globalThis.ciVerdicteHtml=ciVerdicteHtml;globalThis.CI_RANDURI=CI_RANDURI;globalThis.ciPct=ciPct;" : ""), ctx, { filename: f });
const C = ctx.ContIntreg, ZI = 86400000, T0 = Date.parse("2026-01-05T12:00:00Z");
const aproape = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (m || "") + " " + a + " ≠ " + b);

// ---------------- A. modulul ----------------
await test("A1 banii boților: NETUL (după comisioane și funding), în lei la cursul ZILEI închiderii, pe bucăți care se adună", () => {
  const tr = [{ inchis: T0, rezultat: 10, grile: 30, comisioane: -4, funding: -1, pus: 100 }, { inchis: T0 + 2 * ZI, rezultat: -20, grile: 5, comisioane: -3, funding: 0.5, pus: 200 }];
  const b = C.baniBoti(tr, { USD: { "2026-01-05": 4, "2026-01-07": 5 } }, 0);
  assert.equal(b.n, 2); aproape(b.grila, 30 * 4 + 5 * 5); aproape(b.directie, (10 - 30) * 4 + (-20 - 5) * 5); aproape(b.comisioane, -4 * 4 - 3 * 5); aproape(b.funding, -1 * 4 + 0.5 * 5);
  aproape(b.net, (10 - 4 - 1) * 4 + (-20 - 3 + 0.5) * 5, 1e-9, "netul la cursul zilei"); aproape(b.grila + b.directie + b.comisioane + b.funding, b.net, 1e-9, "bucățile dau netul");
  aproape(b.netUsdt, 5 - 22.5); assert.equal(b.cumulat.length, 2); aproape(b.cumulat[1][1], b.grila);
});
await test("A2 „proces sau ghinion”: pe zilele de închidere (o zi = o unitate) - toate pe minus ⇒ p mic; semne amestecate egal ⇒ p mare; sub 20 de zile ⇒ nimic", () => {
  const mk = (f) => Array.from({ length: 30 }, (_, i) => ({ inchis: T0 + i * ZI, rezultat: f(i), grile: 0, comisioane: 0, funding: 0, pus: 100 }));
  const L = {}; for (let i = 0; i < 40; i++) L[new Date(T0 + i * ZI).toISOString().slice(0, 10)] = 4.5;
  const rau = C.baniBoti(mk((i) => -1 - (i % 3)), { USD: L }, 0).proces; assert.ok(rau.p < 0.001, "p " + rau.p); assert.ok(rau.medie < 0 && rau.hi < 0); assert.equal(rau.zile, 30); assert.equal(rau.pePlus, 0);
  const egal = C.baniBoti(mk((i) => (i % 2 ? 1 : -1)), { USD: L }, 0).proces; assert.ok(egal.p > 0.5, "p " + egal.p);
  assert.equal(C.baniBoti(mk((i) => -1).slice(0, 10), { USD: L }, 0).proces, null);
  const a1 = C.baniBoti(mk((i) => -1 - (i % 3)), { USD: L }, 0).proces.p, a2 = C.baniBoti(mk((i) => -1 - (i % 3)), { USD: L }, 0).proces.p; assert.equal(a1, a2, "mulberry32 cu sămânță fixă: aceleași date ⇒ aceeași cifră");
});
await test("A3 Kupiec: 64 de depășiri din 905 zile la 5 % ⇒ p ≈ 0,007 (cifra revizorului); rata promisă ⇒ p mare", () => {
  const k = C.kupiec(905, 64, 0.05); aproape(k.p, 0.007, 0.0015, "p"); aproape(k.rata, 64 / 905); assert.ok(C.kupiec(1000, 50, 0.05).p > 0.9); assert.ok(C.kupiec(905, 0, 0.05).p < 1e-6);
});
await test("A4 riscul pe agitația de acum: după o perioadă liniștită urmată de una agitată, cifra de ACUM e mai mare decât cea veche; proba judecă doar cu zilele de dinainte", () => {
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const g = () => { let u = 0; for (let i = 0; i < 12; i++) u += rnd(); return u - 6; };
  const zile = Array.from({ length: 700 }, (_, i) => ({ z: new Date(T0 + i * ZI).toISOString().slice(0, 10), pnl: g() * (i < 640 ? 100 : 300) }));
  const r = C.riscAcum(zile, {});
  assert.ok(r.acum.var95 > r.vechi.var95 * 1.3, "acum " + r.acum.var95 + " vechi " + r.vechi.var95); assert.ok(r.acum.ic.var95[0] <= r.acum.var95 && r.acum.var95 <= r.acum.ic.var95[1], "cifra în interval");
  assert.equal(r.proba.zile, 700 - 250); assert.equal(r.serie.length, 450); assert.ok(r.proba.vechi95.rata > 0.05, "pragul vechi rămâne în urmă la agitația nouă");
  // fără lookahead: schimbarea UNEI zile din viitor nu schimbă pragul unei zile din trecut
  const z2 = zile.map((x) => ({ ...x })); z2[600].pnl = -1e6; const r2 = C.riscAcum(z2, {});
  assert.equal(r2.serie[100][2], r.serie[100][2]); assert.equal(r2.serie[100][3], r.serie[100][3]);
  assert.equal(C.riscAcum(zile.slice(0, 200), {}), null, "prea puține zile ⇒ nimic, nu o cifră");
});
await test("A5 reperul în LEI: randamentul în dolari compus cu leul; Sharpe cu interval; diferența față de reper cu p", () => {
  const rl = C.reperLei({ "2026-01-05": 0.1 }, { "2026-01-05": 0.05 }); aproape(rl["2026-01-05"], 1.1 * 1.05 - 1);
  const s = Array.from({ length: 120 }, (_, i) => ({ z: new Date(T0 + i * ZI).toISOString().slice(0, 10), r: (i % 2 ? 0.01 : -0.008) })), rep = {}; s.forEach((x) => { rep[x.z] = x.r; });
  const I = C.interval(s, rep); assert.ok(I.sharpeLo <= I.sharpe && I.sharpe <= I.sharpeHi); assert.ok(I.fata.p > 0.9, "aceeași serie ⇒ nicio diferență"); assert.equal(I.fata.n, 120);
});
await test("A6 scăderea cărții de acum: vârful, fundul, cele mai rele 5 / 20 de zile", () => {
  const z = (i) => new Date(T0 + i * ZI).toISOString().slice(0, 10), zile = Array.from({ length: 80 }, (_, i) => ({ z: z(i), pnl: i < 40 ? 10 : i < 50 ? -100 : 5 }));
  const c = C.scadereCarte(zile, 1000); assert.ok(c.max.dd < -0.6 && c.max.dd > -0.7, "dd " + c.max.dd); assert.equal(c.max.de, z(39)); assert.equal(c.max.pana, z(49)); assert.ok(c.z5.r < -0.4); assert.ok(c.acum < 0);
});
await test("A7 lipsa ≠ 0: fără soldul liber Pionex ⇒ partea Pionex „—” (null); Salt necitit ⇒ lipsă spusă; crizele noi pentru cartea de acum", () => {
  const LEI = { USD: 4.5 };
  const v = C.valoare({ boti: [], pionexLiber: null, t212Cash: { total: 100 }, salt: null, leiPe: LEI }); assert.equal(v.pionex, null); assert.equal(v.complet, false); assert.deepEqual(Array.from(v.lipsa), ["soldul liber Pionex", "Salt"]);
  assert.ok(C.CRIZE.some((c) => c.cod === "covidTot" && c.de === "2020-02-19" && c.pana === "2020-03-23")); assert.ok(C.CRIZE.some((c) => c.cod === "tarife25" && c.de === "2025-02-19" && c.pana === "2025-04-08"));
});

// ---------------- B. colectorul ----------------
const TC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-cont.mjs")).href);
await test("B1 ziua valorii: rândul se scrie o dată pe zi (frâna ține de ziua citirii) și duce ora citirii; pagina îl etichetează cu ziua pe care o ÎNCHIDE (00:11 pe 20.11 ⇒ 19.11; 08:00 ⇒ 20.11; fără oră ⇒ ziua lui)", () => {
  assert.equal(ctx.ciZiInchidere({ z: "2026-11-20", citit: Date.parse("2026-11-20T00:11:00+02:00") }), "2026-11-19"); assert.equal(ctx.ciZiInchidere({ z: "2026-11-20", la: Date.parse("2026-11-20T06:59:00+02:00") }), "2026-11-19");
  assert.equal(ctx.ciZiInchidere({ z: "2026-11-20", citit: Date.parse("2026-11-20T08:00:00+02:00") }), "2026-11-20"); assert.equal(ctx.ciZiInchidere({ z: "2026-10-15" }), "2026-10-15");
  const src = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(src, /citit: acum/); assert.match(src, /if \(st\.ziValoare !== z && val\.total > 0\)/); assert.match(src, /if \(okZ\) st\.ziValoare = z;/);
  const api = citeste("functions", "api", "istoric-bot.js"); assert.match(api, /const cit=nr\(corp\.citit\);if\(cit>0\)row\.citit=Math\.round\(cit\);/);
});
await test("B2 săptămâna lecției = luni 00:00 – duminică 24:00, ora României (7 zile, iarna +2, vara +3)", () => {
  assert.equal(TC.inceputZiRo("2026-11-16"), Date.parse("2026-11-16T00:00:00+02:00")); assert.equal(TC.inceputZiRo("2026-07-05"), Date.parse("2026-07-05T00:00:00+03:00"));
  const src = citeste("scripts", "lib", "tura-cont.mjs"); assert.match(src, /const pana = inceputZiRo\(sapt\) \+ 86400000, de = pana - 7 \* 86400000;/);
});
await test("B3 netul boților (nu brutul), fără procentul boților și fără „tot contul” ponderat în timp; toate perechile; Salt necitit = lipsă; raportul vechi se reface la livrare", () => {
  const src = citeste("scripts", "lib", "tura-cont.mjs");
  assert.match(src, /baniB = C\.baniBoti\(d\.JurnalTrade\.din\(await d\.botiInchisi\(\)\), leiZi, acum - 365 \* 86400000\)/); assert.doesNotMatch(src, /C\.seriaBoti\(/); assert.doesNotMatch(src, /C\.combina\(/); assert.doesNotMatch(src, /investit: t\.pus \|\| t\.investit, rezultat: t\.rezultat/);
  assert.match(src, /corelatii: perechi\.map\(/); assert.doesNotMatch(src, /perechi\.slice\(0, 15\)/); assert.match(src, /corelatiiN: perechi\.length/);
  assert.match(src, /if \(!Array\.isArray\(saltL\)\) lipsuri\.push\("Salt"\);/); assert.match(src, /const formaVeche = st\.forma !== FORMA_RAPORT && st\.la > 0;/); assert.equal(TC.FORMA_RAPORT, 369);
  assert.match(citeste("scripts", "colector.mjs"), /salt: async \(\) => \(ultimeleSalt && Array\.isArray\(ultimeleSalt\.randuri\) \? ultimeleSalt\.randuri : null\)/);
  assert.match(src, /CORECTII_INDUSTRIE = \{ QCOM: \["Technology", "Semiconductors"\] \}/);
});
await test("B4 graficele din raport: riscul pe zile, banii boților cumulat, pariurile pe ferestre, scăderea cărții; riscul de acum + proba", () => {
  const src = citeste("scripts", "lib", "tura-cont.mjs");
  assert.match(src, /riscA = C\.riscAcum\(istL\.zile, \{\}\)/); assert.match(src, /carte = C\.scadereCarte\(/); assert.match(src, /pariuriF = C\.pariuriFerestre\(/);
  for (const k of ["risc:", "boti:", "pariuri:", "carte:"]) assert.ok(src.includes("      " + k + " "), "grafice." + k);
});

// ---------------- C. pagina ----------------
const zz = (i) => new Date(T0 + i * ZI).toISOString().slice(0, 10);
const RAP = {
  la: Date.parse("2026-11-20T06:47:00+02:00"), valoare: { pionex: 446, t212: 22555, salt: 0, total: 23001, complet: true, lipsa: [] }, lipsuri: [],
  expuneri: [{ tip: "t212", nume: "AVGO", lei: 4700, beta: 1.46, clasa: "actiuni" }, { tip: "bot", nume: "STX (bot long 3×)", lei: 300, beta: 1.2, clasa: "crypto" }],
  risc: { n: 250, var95: 1257, es95: 1700, var99: 2062, es99: 2600, ziRea: { z: "2026-11-05", lei: -2998 }, pnl: Array.from({ length: 30 }, (_, i) => [zz(i), (i % 2 ? 1 : -1) * 300]), scoase: [] },
  riscAcum: { n: 1155, de: "2022-04-14", pana: "2026-11-19", fereastra: 250, lambda: 0.94, sigma: 1028, sigmaFer: 817, sigma20: 1220,
    acum: { var95: 1619, es95: 2413, var99: 2923, es99: 3336, ic: { var95: [1517, 2127], es95: [1900, 2900], var99: [2175, 3510], es99: [2500, 3600] } },
    vechi: { var95: 1257, es95: 1650, var99: 2062, es99: 2600 }, proba: { zile: 905, vechi95: { n: 905, x: 64, rata: 64 / 905, p: 0.007 }, vechi99: { n: 905, x: 15, rata: 15 / 905, p: 0.069 }, acum95: { n: 905, x: 56, rata: 56 / 905, p: 0.113 }, acum99: { n: 905, x: 14, rata: 14 / 905, p: 0.126 }, ani: { 2026: { n: 223, vechi: 22, acum: 18 } } } },
  corelatii: Array.from({ length: 17 }, (_, i) => ({ a: "A" + i, b: "B" + i, rho: 0.9 - i * 0.015, n: 90, acelasiRisc: true, seAcopera: false })).concat([{ a: "X", b: "Y", rho: 0.3, n: 90, acelasiRisc: false, seAcopera: false }]), corelatiiN: 28,
  diversificare: { raport: 1.3, pariuri: 1.7, pozitii: 8 },
  stres: [{ cod: "covidTot", nume: "Covid întreg, februarie–martie 2020 (de la vârf la fund)", de: "2020-02-19", pana: "2020-03-23", btc: -0.334, qqq: -0.281, lei: -9642, pozitii: [{ nume: "APLD", lei: -2719 }] }],
  reconciliere: { t212: { ok: true, abateri: [], verificate: 8 }, arhiva: { ok: true, lipsa: [], verificate: 100 }, urmarire: { ok: true, lipsa: [], verificate: 0 } },
  garzi: [{ cod: "stop", ok: false, titlu: "Nicio acțiune ținută sub stopul tău (−8 % de la cumpărare)", detaliu: "APLD −54 %, BE −45 %", sursa: "din MAE-ul tău" }, { cod: "vol", ok: true, titlu: "Contul se mișcă sub 30 % pe an", detaliu: "", sursa: "x" }],
  factori: { actiuniLei: 22000, factori: { piata: 32515, mici: 100, momentum: -50, sector: 20 }, sectoare: [{ nume: "Technology", ro: "Tehnologie", pondere: 0.95, pozitii: ["AVGO"], pestePrag: true }], industrii: [{ nume: "Semiconductors", ro: "Semiconductori", pondere: 0.69, pozitii: ["AVGO", "MU", "QCOM"], pestePrag: true }],
    perPozitie: [{ nume: "AVGO", piata: 1.46, mici: 0.12, momentum: -0.3, etf: "SMH", sectorBeta: 0.8, r2: 0.55 }] },
  atribuire: { t212Spy: { n: 251, pana: "2026-11-18", beta: 1.4, pasiv: 0.25, alfa: -0.31, eroare: 0.35, t: -0.9 }, boti: { n: 2463, grila: 4975, directie: -8488, comisioane: -3075, finantare: -180, net: -6768 }, reperLei: true },
  vol: { volAnual: 0.57, factor: 0.26, contrib: [{ nume: "APLD", pondere: 0.3 }] },
  randament: { t212: { n: 366, twr: -0.207, pnl: 1598, maxDd: -0.4, sharpe: -0.3 }, t212Interval: { n: 366, sharpe: -0.3, sharpeLo: -1.5, sharpeHi: 1.1, fata: { n: 251, tu: -0.196, reper: 0.198, p: 0.312 } }, btcLei: { reper: -0.256 }, t212Aprox: ["A_US_EQ"], t212Nepotrivite: [] },
  bani: { an: { de: "2025-11-20", pana: "2026-11-20" }, tot: -28586, t212: { pnl: 1598, twr: -0.207, n: 366 }, deschiseT212: { n: 8, lei: -9013 },
    boti: { n: 2463, zile: 262, grila: 22541, directie: -38210, comisioane: -13720, funding: -796, net: -30184, netUsdt: -6768, pornite: { n: 0, lei: 0 }, proces: { zile: 262, medie: -0.0161, lo: -0.0261, hi: -0.0071, p: 0.0017, pePlus: 0.496 } } },
  carte: { expunere: 22283, acum: -0.386, max: { dd: -0.446, de: "2026-06-22", pana: "2026-11-05" }, z5: { r: -0.265, de: "2026-10-29", pana: "2026-11-05" }, z20: { r: -0.322, de: "2026-10-08", pana: "2026-11-05" } },
  grafice: { risc: Array.from({ length: 40 }, (_, i) => [zz(i), (i % 5 ? 200 : -1400), 1257, 1619]), boti: Array.from({ length: 30 }, (_, i) => [zz(i), i * 700, -i * 1200, -i * 450, -i * 25]),
    pariuri: Array.from({ length: 20 }, (_, i) => [zz(i * 5), 2.4 - i * 0.05, 2.3 - i * 0.03]), carte: Array.from({ length: 60 }, (_, i) => [zz(i), -Math.min(0.45, i * 0.008)]) },
};
const NZ = (z) => Date.parse(z + "T00:11:00+02:00");   /* citirea de după miezul nopții */
const ZILE = [{ z: "2026-11-18", valoare: 23542, complet: true, pionex: 390, t212: 23152, salt: 0, la: NZ("2026-11-18") }, { z: "2026-11-19", valoare: 23400, complet: false, pionex: null, t212: 23400, salt: 0, la: NZ("2026-11-19") }, { z: "2026-11-20", valoare: 23000, complet: true, pionex: 446, t212: 22555, salt: 0, citit: NZ("2026-11-20") }];
const ST = { acum: RAP.la + 3600000, zile: ZILE, erori: {} };
const H = ctx.ciHtml(RAP, ST);
await test("C1 fraza cinstită: valoarea, câștigul NET pe un an în lei (boții după comisioane și funding, T212), riscul de acum; „De unde știu” și „Cum am socotit”", () => {
  assert.match(H, /Contul tău: 23\.001 lei\. Pe ultimul an ai pierdut 28\.586 lei net: boții −30\.184 lei \(după comisioane și funding\), Trading 212 \+1\.598 lei\. Într-o zi proastă \(1 din 20\) pozițiile de acum pierd ~1\.619 lei \(7,0 % din cont\), pe agitația de acum\./);
  assert.match(H, /Pierderea boților nu e ghinion: pe 262 de zile de închidere, −1,6 % din suma pusă pe zi \(între −2,6 % și −0,7 %\); din întâmplare ar ieși așa în ~0,2 % din cazuri/);
  assert.match(H, /<summary>De unde știu<\/summary>/); assert.match(H, /<summary>Cum am socotit<\/summary>/);
  assert.doesNotMatch(H, /banii puși la lucru au făcut/); assert.doesNotMatch(H, /Boții Pionex<\/td><td class="num[^"]*">[−+]?\d/, "boții fără procent");
});
await test("C2 trei cifre: valoarea · câștigul net pe ultimul an · riscul azi (cu cifra veche și cât a greșit)", () => {
  const c = H.slice(H.indexOf('id="ciCifre"'), H.indexOf("</div></div>", H.indexOf('id="ciCifre"'))); assert.equal((c.match(/class="cnCifra"/g) || []).length, 3);
  assert.match(c, /Valoarea contului<\/span><b class="cnMare">23\.001 lei/); assert.match(c, /Câștigul net pe ultimul an<\/span><b class="cnMare cnAtent">−28\.586 lei/);
  assert.match(c, /Riscul azi \(1 zi din 20\)<\/span><b class="cnMare cnAtent">−1\.619 lei/); assert.match(c, /cifra veche \(1\.257 lei\) a fost depășită în 7,1 % din zile, nu în 5 %/);
});
await test("C3 „Ce aș face eu” în ordinea nouă: reconcilierea ⇒ gărzile încălcate (stopul) ⇒ riscul peste 4 % ⇒ criza peste 35 % ⇒ perechea", () => {
  assert.match(ctx.ciFac(RAP), /^Aș hotărî întâi ce fac cu acțiunile sub stopul tău \(APLD −54 %, BE −45 %\): pe pozițiile deschise stau acum −9\.013 lei\./);
  const r1 = JSON.parse(JSON.stringify(RAP)); r1.reconciliere.urmarire = { ok: false, lipsa: [{ nume: "PLUME" }], verificate: 1 }; assert.match(ctx.ciFac(r1), /^Aș verifica acum botul PLUME/);
  const r2 = JSON.parse(JSON.stringify(RAP)); r2.garzi = []; assert.match(ctx.ciFac(r2), /^O zi proastă îți ia acum ~7,0 % din cont \(1\.619 lei\): aș reduce expunerea până sub 4 % pe zi\./);
  const r3 = JSON.parse(JSON.stringify(r2)); r3.riscAcum.acum.var95 = 500; assert.match(ctx.ciFac(r3), /^O criză ca „Covid întreg/);
  const r4 = JSON.parse(JSON.stringify(r3)); r4.stres = []; assert.match(ctx.ciFac(r4), /^A0 și B0 se mișcă aproape la fel \(ρ 0,9\)/);
});
await test("C4 banii pe bucăți: tabelul (T212 cu procentul lui, o singură dată; boții pe bucăți, net, tot contul, nerealizatul), graficul boților", () => {
  const b = H.slice(H.indexOf('id="ciSBani"'), H.indexOf('id="ciSRisc"'));
  assert.equal((b.match(/−20,7 %/g) || []).length, 1, "o singură cifră T212"); assert.doesNotMatch(b, /−19,6 %/);
  for (const re of [/Boții · grila<\/td><td class="num"><b>\+22\.541 lei/, /Boții · direcția prețului.*?−38\.210 lei/, /Boții · comisioanele.*?−13\.720 lei/, /Boții · funding-ul.*?−796 lei/, /Boții închiși · net.*?−30\.184 lei/, /Tot contul.*?−28\.586 lei/, /Pe pozițiile T212 deschise, acum.*?−9\.013 lei/]) assert.match(b, re);
  assert.match(b, /Sharpe −0,3 \(interval 90 %: −1,5 … 1,1\); față de S&amp;P în lei \(\+19,8 % pe aceleași 251 de zile de bursă\), diferența ar ieși din întâmplare în ~31,2 % din cazuri, deci nu e dovedită/);
  assert.match(b, /Banii boților închiși pe ultimul an, cumulat, pe bucăți/); assert.match(b, /<svg class="jgSvg"/);
  assert.match(b, /1 simbol fără prețuri primite e ținut/);
});
await test("C5 riscul: cifra de acum cu intervalul, cifra veche alături și proba (64 din 905 zile = 7,1 %), pe ani, „orientativ” la 1 din 100, graficul pe zile", () => {
  const r = H.slice(H.indexOf('id="ciSRisc"'), H.indexOf('id="ciSStres"'));
  assert.match(r, /−1\.619 lei<\/b><small>VaR 95 % pe agitația de acum · ES −2\.413 lei · interval 1\.517 … 2\.127 lei/); assert.match(r, /orientativ: o zi din 100 se vede rar/);
  assert.match(r, /Cifra veche \(ultimele 250 de zile, egal: −1\.257 lei\) ar fi fost depășită în 64 din 905 zile = 7,1 %, nu în 5 %: din întâmplare ar ieși așa în ~0,7 % din cazuri\. Cea de acum .* depășită în 56 din 905 zile = 6,2 %, cât se poate pune pe seama întâmplării/);
  assert.match(r, /<td>2026<\/td><td class="num">223<\/td>/); assert.match(r, /Riscul față de zilele reale/); assert.match(r, /class="ciLVechi"/); assert.match(r, /class="ciLAcum"/);
});
await test("C6 corelațiile: TOATE perechile numărate (17 din 28), primele 5 la vedere, restul pliate; pariurile pe ferestre", () => {
  const c = H.slice(H.indexOf('id="ciSCorel"'), H.indexOf('id="ciSExp"'));
  assert.match(c, /17 perechi sunt practic același risc \(ρ ≥ 0,6 pe ultimele 90 de zile\), din 28 de perechi:/); assert.match(c, /<summary>Încă 12 perechi<\/summary>/);
  assert.match(c, /Câte pariuri independente porți, pe ferestre/); assert.match(c, /ρ 0,9 /, "ρ cu o zecimală");
});
await test("C7 crizele pe cartea de acum + scăderea de la vârf (cu graficul); expunerile spun „· bot Pionex” (STX bot ≠ STX acțiune)", () => {
  const s = H.slice(H.indexOf('id="ciSStres"'), H.indexOf('id="ciSZile"'));
  assert.match(s, /Covid întreg, februarie–martie 2020/); assert.match(s, /acum sunt la −38,6 % \(−8\.601 lei\) de la vârf; cel mai jos au fost −44,6 %/); assert.match(s, /Scăderea de la vârf a pozițiilor de acum/);
  assert.match(H, /STX \(bot long 3×\)<span class="t212Mic"> · bot Pionex<\/span>/);
});
await test("C8 valoarea pe zile: închiderea + ora citirii; partea lipsă „—” (nu „0 lei”); schimbarea lângă o zi parțială spusă, nu socotită; ultimele 7 la vedere", () => {
  const z = ctx.ciZileHtml(ZILE, {});
  assert.match(z, /23\.000 lei<\/b> la închiderea din 19\.11\.2026 · față de 18\.11\.2026: <span class="t212Mic">— \(o zi e parțială\)<\/span><\/p><p class="tbSub ciZileCitit">citit pe 20\.11\.2026, 00:11<\/p>/); assert.match(z, /<td data-et="Ziua">17\.11\.2026<\/td>/, "rândul scris pe 18.11 la 00:11 poartă 17.11");
  assert.match(z, /<td data-et="Pionex">—<\/td>/); assert.doesNotMatch(z, /<td data-et="Pionex">0 lei<\/td>/);
  const multe = Array.from({ length: 12 }, (_, i) => ({ z: zz(i), valoare: 1000 + i, complet: true, pionex: 1, t212: 999 + i, salt: 0 })), m = ctx.ciZileHtml(multe, {});
  assert.match(m, /<summary>Toate zilele \(12\)<\/summary>/); assert.equal((m.slice(0, m.indexOf("<details")).match(/<tr>/g) || []).length, 8, "capul + 7");
});
await test("C9 banda: semnul (negativ în date = împotrivă) și pragul de 30 % în interval spus; lecția în ora României; verdictele traduse, cu miile și „de”", () => {
  const x = { h: 12, n: 44, intoarse: 0.27, intoarseLo: 0.16, intoarseHi: 0.42, miscareImpotriva: 0.0005, netMedian: -0.01 };
  const d1 = ctx.ciDisciplinaHtml({}, { tabel: [x], regula: x, grupe: [] }, []); assert.match(d1, /prețul a stat practic pe loc/); assert.doesNotMatch(d1, /împotriva botului/); assert.match(d1, /Intervalul cuprinde pragul de 30 %, deci regula nu e încă dovedită/);
  const d2 = ctx.ciDisciplinaHtml({}, { tabel: [{ ...x, miscareImpotriva: -0.03 }], regula: { ...x, miscareImpotriva: -0.03 }, grupe: [] }, []); assert.match(d2, /prețul a mers încă 3,0 % împotriva botului/);
  const d3 = ctx.ciDisciplinaHtml({}, { tabel: [{ ...x, miscareImpotriva: 0.02 }], regula: { ...x, miscareImpotriva: 0.02 }, grupe: [] }, []); assert.match(d3, /prețul s-a întors 2,0 % spre bot/);
  const lec = ctx.ciDisciplinaHtml({}, null, [{ sapt: "2026-11-15", la: Date.parse("2026-11-15T19:30:00+02:00"), lectie: { de: Date.parse("2026-11-08T22:03:00Z"), top: [{ ce: "STX (bot)", cost: 93, motive: [{ text: "a stat 14 ore afară" }] }] } }]);
  assert.match(lec, /Săptămâna 09\.11\.2026 – 15\.11\.2026/, "ziua de început în ora României"); assert.match(lec, /STX · bot Pionex/);
  const v = ctx.ciVerdicteHtml({ n: 1889, evaluate: 1806, calibrare: [{ nume: "Poarta Trading 212", h: 20, masura: "randament", intrebare: "„cumpără” față de rest", niveluri: [{ nivel: "usorpentru", n: 3, medie: 0.01, pePlus: 0.6 }], test: { stare: "putine", nFav: 3, nRest: 2 } }] }, {});
  assert.match(v, /1\.806 au fost judecate/); assert.match(v, /ușor pentru/); assert.doesNotMatch(v, /usorpentru/); assert.match(v, /după 20 de zile de bursă/); assert.match(v, /niciuna nu are încă destule cazuri/);
});
await test("C10 o singură zecimală: nicio cifră cu două zecimale în textul paginii (procente, ρ, β, Sharpe); minusul „−”", () => {
  const txt = H.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/λ 0,94/g, "λ");   /* λ e parametrul metodei, nu un rezultat */
  const doua = txt.match(/(^|[^\d.,])[−-]?\d+,\d\d(?!\d)/g); assert.equal(doua, null, "două zecimale: " + (doua || []).slice(0, 5).join(" | "));
  assert.doesNotMatch(txt, /\d-\d+,\d %|\s-\d+,\d %/, "minusul e „−”");
});
await test("C11 căderea unei rute se spune (nu „încă nu sunt date”), cu ultima citire bună la vedere", () => {
  const h = ctx.ciHtml(RAP, { acum: RAP.la, zile: null, erori: { contZile: "HTTP 502", verdicte: "fetch failed" } });
  assert.match(h, /⚠ N-am putut citi acum: valoarea pe zile \(HTTP 502\); verdictele \(fetch failed\)\. Ce vezi e ultima citire bună\./);
  assert.match(h, /N-am putut citi zilele acum \(HTTP 502\)/); assert.match(h, /N-am putut citi verdictele acum \(fetch failed\)/);
  assert.match(citeste("public", "lib", "cont-ecran.js"), /async function ciAdu\(cheie, cale, ia\)/);
});
await test("C12 nimic pierdut: titlurile paginii vechi sunt toate (blocuri, subtitluri, pliuri), butonul exportului și câmpul fișierului", () => {
  const h = ctx.ciHtml(RAP, { ...ST, banda: { tabel: [{ h: 12, n: 44, intoarse: 0.27 }], regula: null, grupe: [] }, lectii: [], verdicte: { n: 1, evaluate: 0, calibrare: [], registru: [{ felul: "verdict", sursa: "s", afirmatie: "a", p: 0.03, ramane: false }] }, masura: null });
  const VECHI = ["Valoarea contului pe zile", "Pe ce stă riscul", "Ce se mișcă împreună", "Dacă vine iar o criză", "Se potrivește cu brokerii?", "Pe ce pariezi de fapt", "Factorii fiecărei poziții (regresie pe 250 de zile)", "Piață sau alegere", "Cât de tare se mișcă contul", "Cât ai câștigat, corect socotit", "Cum am socotit", "A doua citire, din exportul tău", "Gărzile tale", "Lecția săptămânii", "Când iese botul din bandă", "Au avut dreptate verdictele?", "Ce e dovedit cu adevărat (după corecția pentru teste multiple)", "Toate testele (1)"];
  for (const t of VECHI) assert.ok(h.includes(">" + t.replace(/&/g, "&amp;") + "<"), "titlul „" + t + "”");
  assert.match(h, /<button type="button" class="actionGhost" id="ciExportBtn">Aduc exportul din T212<\/button>/); assert.match(h, /id="ciExportFisier"/);
  assert.match(h, /Ziua proastă \(1 din 20\)/); assert.match(h, /Ziua foarte proastă \(1 din 100\)/); assert.match(h, /Cea mai rea zi din ultimul an/); assert.match(h, /Pariuri independente/);
  assert.match(h, /<svg class="ciHisto"/);
});
await test("C13 rândurile pliate (CI_RANDURI): fapta la vedere (banii, riscul, crizele, zilele, gărzile), decorul pliat; brokerii se deschid la o abatere", () => {
  assert.deepEqual(Object.keys(ctx.CI_RANDURI), ["ciSBani", "ciSRisc", "ciSStres", "ciSZile", "ciSDisc", "ciSCorel", "ciSExp", "ciSBrokeri", "ciSFactori", "ciSVerd"]);
  for (const id of Object.keys(ctx.CI_RANDURI)) assert.equal((H.match(new RegExp('id="' + id + '"', "g")) || []).length, 1, id);
  const ce = citeste("public", "lib", "cont-ecran.js"); assert.match(ce, /var CI_RAND_DESCHIS = \{ ciSBani: 1, ciSRisc: 1, ciSStres: 1, ciSZile: 1, ciSDisc: 1 \};/); assert.match(ce, /id === "ciSBrokeri" && abatere/);
  assert.match(citeste("public", "app.js"), /if\(typeof CI_RANDURI!=="undefined"&&Object\.prototype\.hasOwnProperty\.call\(CI_RANDURI,id\)\)return ciRandComuta\(id,deschis\);/);
  assert.ok(H.indexOf('id="ciFraza"') < H.indexOf('id="ciSBani"') && H.indexOf('id="ciSStres"') < H.indexOf('id="ciSZile"'), "răspunsul întâi; zilele după crize (telefonul)");
});
await test("C14 graficele: patru noi (riscul pe zile, banii boților, pariurile, scăderea cărții) + linia zilelor + histograma; culorile doar prin clase", () => {
  const n = (H.match(/<svg class="jgSvg"/g) || []).length; assert.equal(n, 4, "cele 4 grafice noi");
  assert.equal((H.match(/<svg class="ciZileGraf"/g) || []).length, 1); assert.doesNotMatch(H.replace(/<svg class="ciZileGraf[\s\S]*?<\/svg>/, ""), /<svg[^>]*(fill|stroke)="#/, "fără culori scrise în SVG");
  const G = ctx.ContGrafice; assert.equal(G.riscZile([]), ""); assert.equal(G.carte([[zz(0), 0]]), "");
});

// ---------------- D. legarea + E. versiunile ----------------
await test("D legarea: capul ca paginile refăcute (titlul, Reîncarcă, tema), graficele încărcate și în cache, tema pe #contintreg, stilurile copiate", async () => {
  const html = citeste("public", "index.html"), sw = citeste("public", "sw.js"), css = citeste("public", "app.css");
  assert.match(html, /<div class="cnPag t212Card" id="ciCard"><header class="cnCapPag sectionHead"><div><h2 class="cnH1">💰 Contul întreg<\/h2>/); assert.match(html, /id="ciTemaBtn"/); assert.match(html, /data-action-click="ciPorneste\(true\)"/);
  assert.match(html, /<script src="\/lib\/cont-grafice\.js"><\/script><script src="\/lib\/cont-ecran\.js"><\/script>/); assert.match(sw, /"\/lib\/cont-grafice\.js","\/lib\/cont-ecran\.js"/);
  assert.match(citeste("public", "lib", "tema-devreme.js"), /"salt", "alerts", "contintreg"\]/); assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"salt", "alerts", "contintreg"\];/);
  assert.match(css, /#contintreg \.cnPag\{/); assert.match(css, /#contintreg svg \.ciLNet\{/); assert.match(css, /:is\([^)]*#alerts,#contintreg\)\.tbZi\{/);
  const { spawnSync } = await import("node:child_process"); const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { encoding: "utf8" }); assert.equal(r.status, 0, r.stdout + r.stderr);
});
await test("E versiunile v100.369 (index ×4, sw, versiune.js, package + lanț, BUILD_INFO) și colectorul v101.205", () => {
  const Hh = citeste("public", "index.html"); assert.equal((Hh.match(/v100\.369/g) || []).length, 4); assert.match(Hh, /v100\.369 · CONTUL ÎNTREG CINSTIT/); assert.doesNotMatch(Hh, /v100\.368/);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-369/); assert.match(citeste("functions", "_shared", "versiune.js"), /"v100\.369"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.version, "100.369.0"); assert.match(p.scripts.test, /npm run test:v100368 && npm run test:v100369/); assert.equal(p.scripts["test:v100369"], "node scripts/proba-v100369.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.match(bi.badge, /^v100\.369/); assert.ok(bi.ci369 && bi.tb368);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.205";/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
