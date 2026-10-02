// Proba v100.38 (30.09, el: „verifică de ce botul trece prin liniile afișate pe GRID-FISA din TV dar pe Pionex nu apare linie închisă”
// + „acum liniile din tv sunt la fel ca la pionex?”). Gasit, pe ~2.000 de boti inchisi (numarul intreg de loturi cumparate la pornire:
// 94 % long / 95 % short) si pe botul CRV viu (cumparare la 0,4019, pretul mediu 0,40043, 3 ordine inchise, profit din grile 0,569):
// PIONEX NUMARA LINIILE - „Număr de grile” = linii (jos si sus incluse), intervalele = grile − 1; la pornire, linia cea mai apropiata de
// pret ramane fara ordin; la long, perechea se numara la fiecare VANZARE (si a loturilor de la pornire), la short la fiecare CUMPARARE.
// Radarul si GRID-FISA tratau numarul ca intervale -> o linie in plus, toate decalate. Conventia de acum: in calculele Radarului N =
// intervale; in Pionex se scrie N + 1; „row” citit din Pionex = linii.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G);
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G);
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }
console.log("\nV100.38 · Pionex numara LINIILE (grile = linii) + umplerile pe graficul Tabloului · proba\n");

// ---- botul CRV (30.09), cu forma rutei bot-orders ----
const CRV = { id: "2393", baza: "CRV.PERP", quote: "USDT", simbolPionex: "CRV_USDT_PERP", activ: true, directie: "long", levier: 5, gridJos: 0.3755, gridSus: 0.423, investit: 48.23, pretCurent: 0.4053,
  pornitLa: Date.UTC(2026, 8, 30, 10, 32), ordinePerechi: 1, brut: { buOrderData: { row: 8, gridType: "geometric", bottom: "0.3755", top: "0.423", initPrice: "0.3997", perVolume: "83.5" } } };
const LINII_CRV = [0.3755, 0.38195, 0.38850, 0.39517, 0.40195, 0.40885, 0.41587, 0.423];

await test("liniile Pionex ale botului CRV: 8 linii (7 intervale) - cea de 0,4019 exista (acolo a cumparat Pionex)", () => {
  const L = GB.liniiPionex(0.3755, 0.423, 8, true);
  assert.equal(L.length, 8); L.forEach((v, k) => assert.ok(Math.abs(v - LINII_CRV[k]) < 5e-5, k + ": " + v));
  const A = GB.liniiPionex(1, 2, 5, false); assert.deepEqual(A.map((v) => +v.toFixed(4)), [1, 1.25, 1.5, 1.75, 2]);
});

await test("umplerile CRV pe lumanari (modelul Pionex): la pornire fara ordin pe 0,4019; vanzare la 0,4089 (pereche, ca la Pionex), apoi recumparare la 0,4019; 0,3952 neatins la 0,3954", () => {
  const T0 = CRV.pornitLa, M = 60000, b = (i, o, h, l, c) => ({ t: T0 + i * M, o, h, l, c, v: 1 });
  const bare = [b(-1, 0.40, 0.401, 0.389, 0.39), b(0, 0.3997, 0.4001, 0.3990, 0.3995), b(29, 0.3995, 0.3996, 0.3954, 0.3960), b(60, 0.3960, 0.4020, 0.3958, 0.4015),
    b(81, 0.4015, 0.4097, 0.4010, 0.4080), b(103, 0.4080, 0.4085, 0.4014, 0.4021)];
  const r = GB.umpleri(bare, { jos: 0.3755, sus: 0.423, linii: 8, geo: true, p0: 0.3997, pornit: T0, dir: "long" });
  assert.deepEqual(r.umpleri.map((x) => [x.tip, x.pereche]), [["S", true], ["B", false]]);
  assert.ok(Math.abs(r.umpleri[0].p - 0.40885) < 5e-5 && Math.abs(r.umpleri[1].p - 0.40195) < 5e-5, JSON.stringify(r.umpleri));
  assert.equal(r.perechi, 1, "cat arata Pionex"); assert.equal(r.umpleri.length + 1, 3, "+ cumpararea de la pornire = 3 ordine inchise, cat arata Pionex");
});
await test("short: perechea la fiecare CUMPARARE; drumul lumanarii (verde: jos apoi sus; rosie: sus apoi jos)", () => {
  const T0 = Date.UTC(2026, 8, 1), b = (o, h, l, c) => ({ t: T0, o, h, l, c, v: 1 });
  // linii 1 · 1,25 · 1,5 · 1,75 · 2; pornit la 1,52 -> 1,5 (cea mai apropiata) fara ordin; lumanare rosie: intai sus (1,80), apoi jos (1,20)
  const s = GB.umpleri([b(1.52, 1.80, 1.20, 1.30)], { jos: 1, sus: 2, linii: 5, geo: false, p0: 1.52, pornit: T0, dir: "short" });
  assert.deepEqual(s.umpleri.map((x) => [x.tip, x.p, x.pereche]), [["S", 1.75, false], ["B", 1.5, true], ["B", 1.25, true]]);
  assert.equal(s.perechi, 2);
  // aceeasi lumanare, verde (intai jos, apoi sus): cumpararea de la 1,25, apoi vanzarile
  const v = GB.umpleri([b(1.52, 1.80, 1.20, 1.70)], { jos: 1, sus: 2, linii: 5, geo: false, p0: 1.52, pornit: T0, dir: "short" });
  assert.equal(v.umpleri[0].tip, "B"); assert.equal(v.umpleri[0].p, 1.25);
});

await test("conversiile: fisa (N intervale) -> „Număr de grile” si codul pentru TV = N + 1; botul (row = linii) -> pasul pe row − 1 intervale", () => {
  // codul fisei pentru GRID-FISA
  const ctx = { grZec: () => 4, grFmt: (x, z) => x == null ? null : Number(x).toFixed(z) };
  vm.createContext(ctx); vm.runInContext(functia(app, "grCodTV") + ";this.f=grCodTV;", ctx);
  assert.equal(ctx.f({ dir: "long", jos: 0.38, sus: 0.43, grile: 5, levier: 5, stop: {}, lichidare: {}, suma: 100 }, {}).split(";")[3], "6");
  assert.match(functia(app, "renderGrid"), /grRand\("Număr de grile",\(st\.grile\+1\)/);
  // pasul botului: geometric (sus/jos)^(1/(row−1)) − 1
  const g = TE.geometrieBot(CRV);
  assert.ok(Math.abs(g.pasPct - (Math.pow(0.423 / 0.3755, 1 / 7) - 1)) < 1e-12, g.pasPct); assert.equal(g.grile, 8, "afisat ca in Pionex");
  const p = SB.pasBot(CRV); assert.ok(Math.abs(p.pas - (Math.pow(0.423 / 0.3755, 1 / 7) - 1)) < 1e-12); assert.equal(p.grile, 8);
  // Jurnalul: pasul net al botului inchis pe row − 1
  const t = JT.din([{ strategyId: "1", base: "CRV.PERP", createTime: 1, closeTime: 3600001, buOrderData: { totalRealizedProfit: "1", gridProfit: "1", totalFee: "0", totalFundingFee: "0", usdtInvestment: "50", leverage: "5", trend: "long", bottom: "0.3755", top: "0.423", row: 8, gridType: "geometric" } }])[0];
  assert.ok(Math.abs(t.pasNet - (Math.pow(0.423 / 0.3755, 1 / 7) - 1 - 2 * G.C.COMISION_GRILA)) < 1e-12, t.pasNet); assert.equal(t.grileN, 8);
});
await test("comparatia cu botul: propunerea de 7 intervale = botul cu 8 grile Pionex (acelasi grid)", () => {
  assert.equal(TE.gridDiferitDeBot({ jos: 0.3755, sus: 0.423, grile: 7 }, CRV).acelasi, true);
  assert.equal(TE.gridDiferitDeBot({ jos: 0.3755, sus: 0.423, grile: 8 }, CRV).acelasi, false);
});
await test("graficul Tabloului: treptele pe liniile Pionex (row linii), umplerile si legenda „perechi pe grafic: N · Pionex: M”", () => {
  const i = app.indexOf("var d=GraficBot.desen({"), corp = app.slice(i - 200, i + 900);
  assert.match(corp, /linii:botiNr\(xo\.row\)[,}]/);   // v100.39: cu [,}] - `linii:botiNr(xo.row)-1` nu mai trece assert.match(corp, /GraficBot\.umpleri\(bare,/); assert.match(corp, /perechiPionex:botiNr\(b\.ordinePerechi\)/); assert.match(corp, /dir:String\(b\.directie/);
  const T0 = CRV.pornitLa, bare = [{ t: T0, o: 0.3997, h: 0.4097, l: 0.3990, c: 0.4080, v: 1 }, { t: T0 + 60000, o: 0.4080, h: 0.4085, l: 0.4014, c: 0.4021, v: 1 }];
  const GR = { jos: 0.3755, sus: 0.423, linii: 8, geo: true };
  const d = GB.desen({ bare, W: 800, st: {}, niv: [], grila: GR, alerte: [], per: "24h", umpleri: GB.umpleri(bare, Object.assign({ p0: 0.3997, pornit: T0, dir: "long" }, GR)), perechiPionex: 1 });
  assert.equal((d.svg.match(/class="gbTreapta"/g) || []).length > 0, true);
  assert.match(d.svg, /vânzare la 0\.408[89][^<]*pereche închisă/);   // linia exacta 0,408849… (Pionex o rotunjeste la pasul de pret)
  assert.match(d.legenda, /perechi pe grafic: 1 · Pionex: 1/); assert.match(d.legenda, /8 linii/);
});
await test("GRID-FISA v2.1 (pe disc): numarul din cod = linii Pionex, intervalele = numarul − 1", () => {
  const p = "C:/Users/Cimin/pine-scripts/GRID-FISA/Grid_Fisa_v2_1.pine";
  assert.ok(fs.existsSync(p), "lipseste " + p);
  const s = fs.readFileSync(p, "utf8");
  assert.match(s, /indicator\("GRID-FISA v2\.1"/); assert.match(s, /nGrile := nLinii - 1/); assert.doesNotMatch(s, /nGrile := grileMan\b/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
