// Proba v100.39 (30.09, el: „rezolvăm tot, mai ales problema cu gridurile dese, acum sunt mult prea rare”; a ales „stop la ~1/8 din
// lățime” si „gridul des mereu, rarul alături”). Cauza, masurata pe 8 monede x 3 directii (CRV JTO LIT SOL ETH BTC PUMP DOGE, 31 z
// de 15M): gridul des (0,30%) iesea pe plus pe istoric doar in 9/24 cazuri -> respins -> fisa propunea platoul de 1–3% (5–9 grile).
// Doua cauze: (1) stopul sta la „o grilă” de margine = 0,30% la gridul des -> scos la prima fluctuatie (singur: 17/24); (2) comisionul
// 0,05% pe fiecare umplere, dar Pionex ia 0,02% pe ordinele limita ale grilelor (masurat pe CRV 2393/2394) (singur: 13/24). Ambele: 21/24.
// Plus restul pachetului „grid” din auditul 30.09: v100.38 dus peste tot (alerta „mută gridul”, Scenariu, GridUmpleri, Scan, Tablou,
// jurnal), fisa = setarea probata, linia de langa pret fara ordin in simulator, costurile la bot tanar, histerezis pe planul de minus,
// stop-loss la gridul propus SHORT, Scan-ul fara actiuni/marfuri tokenizate si pe gridul des.
// LIB=<dosar> ruleaza proba pe alt cod (ex. versiunea veche scoasa din git) - asa s-a vazut picand inainte de reparatie.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const LIB = process.env.LIB || new URL("../public/lib/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const APP = process.env.APP || new URL("../public/app.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const lib = (f) => fs.readFileSync(path.join(LIB, f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
globalThis.GridCalcul = G;
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G);
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const AL = new Function("GridCalcul", `${lib("alerte.js")}; return Alerte;`)(G);
const SC = new Function(`${lib("scenariu.js")}; return Scenariu;`)();
const CL = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(G);
const AC = new Function("GridCalcul", `${lib("acasa.js")}; return Acasa;`)(G);
const app = fs.readFileSync(APP, "utf8");
const scanEcran = lib("scan-ecran.js"), jurnal = lib("jurnal-trade.js");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, (m || "") + " " + a + " != " + b);
console.log("\nV100.39 · gridurile dese (stopul la 1/8 din lățime, comisionul maker, gridul des mereu) + restul pachetului grid · proba\n");

await test("comisionul pe GRILE e 0,02% (maker), cel de pornire/inchidere ramane 0,05%; profitul pe grila = pas − 2×0,02%", () => {
  assert.equal(G.C.COMISION_GRILA, 0.0002); assert.equal(G.C.COMISION, 0.0005);
  const s = G.construieste({ pret: 100, lat: 0.06, pas: 0.003, dir: "neutru" });
  aprox(s.profitGrila, s.pas - 0.0004, 1e-12, "profitGrila");
});

await test("stopul la gridul DES sta la 1/8 din latime, nu la 0,30% de margine; la gridul rar ramane un pas (cand pasul > lat/8)", () => {
  const d = G.construieste({ pret: 100, lat: 0.12, pas: 0.003, dir: "long" }), lat = d.sus / d.jos - 1;
  aprox(d.stop.jos, d.jos * (1 - lat / 8), 1e-9, "stop jos des"); aprox(d.stop.sus, d.sus * (1 + lat / 8), 1e-9, "stop sus des");
  const r = G.construieste({ pret: 100, lat: 0.12, pas: 0.03, dir: "long" });
  aprox(r.stop.jos, r.jos * (1 - r.pas), 1e-9, "stop la gridul rar = un pas");
});

// lumanari sintetice: 15M, un pret care oscileaza +-0,6% in jurul lui 100 (piata laterala), cateva zile
function bareLaterale(zile, amp) {
  const b = [], T0 = Date.UTC(2026, 8, 1);
  for (let i = 0; i < zile * 96; i++) { const m = 100 * (1 + amp * Math.sin(i / 3)); b.push({ t: T0 + i * 900000, o: m, h: m * 1.004, l: m * 0.996, c: m * (1 + amp * Math.sin((i + 1) / 3)) / (1 + amp * Math.sin(i / 3)) }); }
  return b;
}
await test("simulatorul: umplerile de grila platesc 0,02%, pornirea 0,05% (o pereche = 2 x 0,02% pe ordin)", () => {
  const st = G.construieste({ pret: 100, lat: 0.04, pas: 0.003, dir: "neutru" });
  const b = [{ t: 0, o: 100, h: 100, l: 100, c: 100 }, { t: 1, o: 100, h: 100, l: 99, c: 99.2 }, { t: 2, o: 99.2, h: 99.9, l: 99.2, c: 99.9 }];
  const r = GP.simuleaza(b, 0, 3, Object.assign({}, st, { levier: 1 }));
  assert.ok(r.perechi >= 1, "cel putin o pereche: " + r.perechi);
  // acelasi drum cu comisionul de grila pus (temporar) la 0,05%: comisioanele trebuie sa creasca - adica simulatorul chiar il foloseste
  const vechi = G.C.COMISION_GRILA; G.C.COMISION_GRILA = 0.0005;
  let r5; try { r5 = GP.simuleaza(b, 0, 3, Object.assign({}, st, { levier: 1 })); } finally { G.C.COMISION_GRILA = vechi; }
  assert.ok(r.comisioane < r5.comisioane * 0.9, "umplerile de grila nu platesc comisionul de grila: " + r.comisioane + " vs " + r5.comisioane);
});

await test("simulatorul: la pornire LONG linia cea mai apropiata de pret (deasupra) ramane fara ordin - celula de sub ea nu se cumpara", () => {
  // linii 90..110 cu 10 intervale (pas geometric ~2%); pornit la 100,4 -> linia cea mai apropiata e ~100,0? nu: alegem pretul sub o linie
  const st = { dir: "long", jos: 90, sus: 110, grile: 10, levier: 1, stop: null };
  const niv = G.niveluri(90, 110, 10), k = niv.findIndex((v) => v > 100), P = niv[k] * 0.999;   // chiar sub o linie
  const b = [{ t: 0, o: P, h: P, l: P, c: P }];
  const r = GP.simuleaza(b, 0, 1, st);
  const peste = niv.filter((v, i) => i > 0 && v > P).length;   // celule long cumparate de modelul vechi = cele cu linia de sus > P
  assert.equal(r.umpleri, peste - 1, "o celula mai putin la pornire: " + r.umpleri + " vs " + (peste - 1));
});

await test("fisa propune gridul DES si in miscare, cand proba nu l-a respins (el: „gridul des mereu, rarul alături”)", () => {
  const d = { setare: { grile: 40, pesteSigur: false, sigur: true }, respinsa: false };
  assert.equal(GP.propune({ regim: { miscare: true }, deasa: d, setare: { grile: 8 } }), "deasa");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: d, setare: { grile: 8 } }), "deasa");
  assert.equal(GP.propune({ regim: { miscare: false }, deasa: Object.assign({}, d, { respinsa: true }), setare: { grile: 8 } }), "aleasa");
});

await test("fisa pe o piata laterala: propune gridul des (0,30%), setarea afisata = latimea PROBATA (o singura sursa)", () => {
  const b15 = bareLaterale(30, 0.006), b4h = G.agrega(b15, 4 * 3600000), b1d = G.agrega(b15, 86400000);
  const f = GP.fisa({ simbol: "TEST_USDT_PERP", pret: 100, b15, b4h, b1d, suma: 1000, H: 2, dir: "neutru", levier: 2 });
  assert.ok(!f.eroare, f.eroare);
  assert.equal(f.propusa, "deasa", "propusa=" + f.propusa + " motiv desa: " + (f.deasa && f.deasa.motiv));
  assert.ok(f.setare.pas < 0.0035, "pasul propus " + f.setare.pas);
  const e = f.proba.pe.neutru, lat = f.proba.latimi[e.wi];
  aprox((f.setare.sus - f.setare.jos) / 100, lat, 1e-9, "latimea afisata = latimea probata");
});

await test("alerta Discord „mută gridul” scrie numarul de LINII Pionex (N+1), ca Tabloul", () => {
  const b = { id: "2394", baza: "CRV.PERP", directie: "long", levier: 5, investit: 100, profitTotal: -1, pretCurent: 0.386, gridJos: 0.3755, gridSus: 0.423, distantaLichidarePct: 19 };
  const ctx = { semnale: { semafor: { nivel: "tine" }, muta: { nivel: "atentie", motiv: "prețul stă la marginea de jos", des: true, treceriZi: 12, setare: { dir: "long", jos: 0.38, sus: 0.42, grile: 5, levier: 5 } } } };
  const m = AL.reguli(b, ctx, {})["s-muta"].mesaj;
  assert.match(m, /6 grile în Pionex/, m);
});

await test("Scenariu: row = LINII, liniile geometrice - la jos, pozitia are cate un lot pe fiecare linie de sub pret (row 5, pret sub linia de sus)", () => {
  const brut = { buOrderData: { bottom: "1", top: "2", row: "5", perVolume: "1", position: "0", positionOpenPrice: "0", marginBalance: "100", gridType: "geometric", trend: "long" } };
  const g = SC.grid(brut, { investit: 100, pretCurent: 1.99, directie: "long" });
  assert.equal(g.lipsa.length, 0, g.lipsa.join(","));
  const r = SC.la(g, 1.0);
  assert.equal(r.pozitie, 4, "4 linii sub 1,99 (1 · 1,19 · 1,41 · 1,68), nu 5 niveluri aritmetice: " + r.pozitie);
  aprox(r.pretMediu, (1 + Math.pow(2, 0.25) + Math.pow(2, 0.5) + Math.pow(2, 0.75)) / 4, 1e-9, "pretul mediu pe liniile geometrice");
});

await test("costurile pe zi nu se judeca la un bot sub o zi (taxa de pornire nu e un cost zilnic) - semaforul nu mai zice „costuri”", () => {
  const acum = Date.UTC(2026, 8, 30, 16), b = { pornitLa: acum - 3.5 * 3600000, finantare: -0.02, comisioane: -0.0998, brut: { buOrderData: { gridProfit24h: "0.156", trx24h: "3" } } };
  const c = TE.grileVsCosturi(b, acum);
  assert.equal(c.netZi, null, "netZi " + c.netZi); assert.equal(c.preaTanar, true);
  const sm = SB.semafor({ bot: { directie: "long" }, fisa: { regim: { miscare: false } }, costuri: c });
  assert.notEqual(sm.cod, "costuri");
  const mare = TE.grileVsCosturi(Object.assign({}, b, { pornitLa: acum - 2 * 86400000 }), acum);
  assert.ok(mare.netZi !== null, "de la o zi se judeca");
});

await test("planul pe minus are histerezis: atins ramane atins pana revine peste 80% din prag", () => {
  const plan = { minus: 10 }, bot = (t) => ({ profitTotal: t, directie: "long" });
  assert.deepEqual(TE.planStare(bot(-10.5), plan, {}, 0).atins, ["minus"]);
  assert.deepEqual(TE.planStare(bot(-9.2), plan, { minusAtins: true }, 0).atins, ["minus"], "la −9,2 dupa ce a atins −10: tot atins");
  assert.deepEqual(TE.planStare(bot(-9.2), plan, { minusAtins: false }, 0).atins, [], "fara sa fi atins: nu");
  assert.deepEqual(TE.planStare(bot(-7.5), plan, { minusAtins: true }, 0).atins, [], "revenit peste 80%: iese din atins");
});

await test("Scan si harta Acasa: fara actiuni/marfuri tokenizate (TSLAX, NVDAX, XAU, BRENTOIL); Scan-ul propune gridul des", () => {
  assert.equal(G.eCrypto("TSLAX_USDT_PERP"), false); assert.equal(G.eCrypto("XAU_USDT_PERP"), false); assert.equal(G.eCrypto("BRENTOIL"), false);
  assert.equal(G.eCrypto("BTC_USDT_PERP"), true); assert.equal(G.eCrypto("GMX_USDT_PERP"), true); assert.equal(G.eCrypto("CRV.PERP"), true);
  const tk = [{ symbol: "TSLAX_USDT_PERP", amount: "9e9", open: "1", close: "1.1" }, { symbol: "BTC_USDT_PERP", amount: "5e9", open: "1", close: "1.01" }, { symbol: "XAU_USDT_PERP", amount: "4e9", open: "1", close: "1" }];
  assert.deepEqual(CL.topDupaVolum(tk, 10).map((x) => x.simbol), ["BTC_USDT_PERP"]);
  assert.equal(AC.miscari(tk, { top: 10 }).n, 1);
  const b4h = []; for (let i = 0; i < 90; i++) { const m = 100 * (1 + 0.01 * Math.sin(i / 2)); b4h.push({ t: i * 14400000, o: m, h: m * 1.01, l: m * 0.99, c: m }); }
  const j = CL.judeca(b4h);
  assert.ok(j.pas < 0.0035, "pasul din Scan = gridul des: " + j.pas);
});

await test("afisarile de grile din pagina sunt in numarul Pionex (N+1): Scan, „Pe ce aș porni”, boti de hartie, jurnalul gridurilor, platoul", () => {
  assert.ok(/scNf\(x\.grile \+ 1, 0\)/.test(scanEcran), "Scan");
  /* v100.76: tot N+1, acum prin TextRo.cate („47 de grile”) */
  assert.ok(/TextRo\.cate\(q\.grile\+1,"grilă","grile"\)\+" · pas "/.test(app), "Pe ce as porni");
  assert.ok(/TextRo\.cate\(s\.grile\+1,"grilă","grile"\)\+" · "\+grPret\(s\.jos,null\)/.test(app), "boti de hartie");
  assert.ok(/\(e\.grile\?TextRo\.cate\(e\.grile\+1,"grilă","grile"\):"\? grile"\)\+" · "/.test(app), "jurnalul gridurilor");
  assert.ok(/gridul rar al probei: "\+TextRo\.cate\(f\.aleasa\.setare\.grile\+1,/.test(app), "platoul");
  assert.ok(/grile:Number\(bu\.row\)>1\?Number\(bu\.row\)-1:0/.test(app), "GridUmpleri primeste intervale (row − 1)");
  assert.ok(/levierSigur\(t\.jos, t\.sus, t\.pretInit, t\.dir, Math\.min\(150, t\.grileN - 1\)\)/.test(jurnal), "jurnalul: levierSigur pe intervale");
});

await test("gridul propus in Tablou pentru SHORT are rand de Stop-loss sus (inainte: niciun stop de copiat)", () => {
  assert.ok(/s\.stop&&s\.dir!=="long"\?grRand\("Stop-loss sus",grPret\(s\.stop\.sus,i\)/.test(app), "randul Stop-loss sus lipseste");
});

console.log(`\nV100.39 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
