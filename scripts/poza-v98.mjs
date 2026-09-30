// Proba pozei colectorului (v98): construirea din fixture-uri, regula insiderilor, campurile lipsa, marimea. Fara retea.
// Rulare: node scripts/poza-v98.mjs
import assert from "node:assert/strict";
import { construiestePoza, insideri, clasifica, esantion, costLeiDinLoturi, nivDinNiveluri, prevClose, cadentaPoza, alerteSimboluri } from "./lib/poza.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }
const ACUM = Date.UTC(2026, 8, 27, 13, 20);
const ZI = 86400000;
const bare = (n, de) => Array.from({ length: n }, (_, i) => ({ t: ACUM - (n - i) * ZI, o: de + i, h: de + i + 1, l: de + i - 1, c: de + i * 0.5 }));

await test("clasifica: Purchase = buy, Sale/Gift = sell, grant/conversie/gol = null", () => {
  assert.equal(clasifica("Purchase at price 95.00 per share."), "buy");
  assert.equal(clasifica("Sale at price 401.33 per share."), "sell");
  assert.equal(clasifica("Stock Gift at price 0.00 per share."), "sell");
  assert.equal(clasifica("Stock Award(Grant) at price 0.00 per share."), null);
  assert.equal(clasifica("Conversion of Exercise of derivative security at price 18.24"), null);
  assert.equal(clasifica(""), null); assert.equal(clasifica(null), null);
});
await test("insideri: 60 de zile, verdict bull1 / bear / neut, top 3 dupa valoare, fara Form 4", () => {
  const tx = (d, cine, ce, act, val) => ({ startDate: { fmt: d }, filerName: cine, filerRelation: "Officer", transactionText: ce, shares: { raw: act }, value: { raw: val } });
  const i = insideri([tx("2026-08-11", "TAN LIP-BU", "Purchase at price 95.00 per share.", 105263, 9999985), tx("2026-05-01", "VECHI", "Purchase at 1", 5, 5)], ACUM);
  assert.equal(i.form4, true); assert.equal(i.buys, 1); assert.equal(i.sells, 0); assert.equal(i.verdict, "bull1"); assert.equal(i.net, 105263); assert.equal(i.top[0].cine, "Tan Lip-Bu");
  const v = insideri([tx("2026-09-14", "A", "Sale at price 1", 10, 100), tx("2026-09-13", "B", "Sale at price 1", 20, 900), tx("2026-09-12", "C", "Sale at price 1", 30, 500), tx("2026-09-11", "D", "Sale at price 1", 40, 50)], ACUM);
  assert.equal(v.verdict, "bear"); assert.equal(v.sp, 4); assert.deepEqual(v.top.map((t) => t.cine), ["B", "C", "A"]);
  assert.equal(insideri([tx("2026-09-01", "X", "Stock Award(Grant)", 1000, 0)], ACUM).verdict, "neut");
  assert.equal(insideri([], ACUM).form4, false); assert.equal(insideri(null, ACUM).form4, false);
});
await test("esantion: 30 din 1755 puncte, capetele pastrate; lista scurta ramane intreaga", () => {
  const l = Array.from({ length: 1755 }, (_, i) => i);
  const e = esantion(l, 30); assert.equal(e.length, 30); assert.equal(e[0], 0); assert.equal(e[29], 1754);
  assert.deepEqual(esantion([1, 2, 3], 30), [1, 2, 3]); assert.deepEqual(esantion([], 30), []);
});
await test("costLeiDinLoturi: FIFO pe loturile deschise ale tickerului; cantitate nepotrivita > 2% -> null", () => {
  const lot = [{ ticker: "AVGO_US_EQ", qty: 2, costBuc: 1800 }, { ticker: "AVGO_US_EQ", qty: 0.8187, costBuc: 1850 }, { ticker: "APLD_US_EQ", qty: 50, costBuc: 130 }];
  assert.ok(Math.abs(costLeiDinLoturi(lot, "AVGO_US_EQ", 2.8187) - (2 * 1800 + 0.8187 * 1850)) < 0.01);
  assert.equal(costLeiDinLoturi(lot, "AVGO_US_EQ", 5), null); assert.equal(costLeiDinLoturi([], "X", 1), null);
});
await test("construiestePoza: T212 cu plan, fara plan, fara bare; bot cu grile si fara plan; simbol fara Form 4; gol", () => {
  const p = construiestePoza({
    acum: ACUM, versiune: "v98.0", pid: 7, tura: 3,
    t212: [
      { ticker: "AVGO_US_EQ", simbol: "AVGO", qty: 2.8187, pretMediu: 399.96, pret: 352.81, prev: 350.36, ppl: -615, costLei: 5211, bare: bare(60, 340), plan: { trailPct: 15, tinta: 413.47 }, maxDupaCumparare: 412.5, pondere: 0.157, sem: { nivel: "atentie", motive: ["trend în jos"], ceAsFace: "👉 aș ieși" }, niv: { nivel: "ok", stop: 350.63, tinta: 413.47, trend: "jos" } },
      { ticker: "UHS_US_EQ", simbol: "UHS", qty: 3.6, pretMediu: 184.51, pret: 178.86, prev: 176.99, ppl: -94, costLei: null, bare: bare(60, 170), plan: null, maxDupaCumparare: 181.39, pondere: 0.1, sem: { nivel: "tine", motive: [], ceAsFace: "" }, niv: null },
      { ticker: "NOU_US_EQ", simbol: "NOU", qty: 1, pretMediu: 10, pret: 11, prev: null, ppl: 4, costLei: 46, bare: [], plan: null, maxDupaCumparare: null, pondere: 0.01, sem: null, niv: null }
    ],
    boti: [{ id: "2383", baza: "VVV.PERP", directie: "long", levier: 4, investit: 91.9, gridJos: 28.464, gridSus: 33.346, pretCurent: 29.64, distantaLichidarePct: 25.05, ordinePerechi: 0, gridProfitBrut: 0, profitNet: -0.185, comisioane: -0.106, profitTotal: -4.42, plan: null, zero: 30.1548, pret30: [30.4, 29.6, 29.64], semafor: { nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc ce aduc grilele", faCe: "aș ieși pe zero", componente: [{ nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc ce aduc grilele", faCe: "aș ieși pe zero" }, { nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului", faCe: "n-aș adăuga bani" }] } }],
    simboluri: [
      { s: "INTC", nota: "", sursa: null, moneda: "$", pret: 123, prev: 127.39, closes30: [100, 123], extra: { tranzactii: [{ startDate: { fmt: "2026-08-11" }, filerName: "TAN", transactionText: "Purchase at 95", shares: { raw: 5 }, value: { raw: 475 } }], rezultate: { data: "2026-10-22", eps: 0.39 }, analisti: { tinta: 116.37, recom: "buy", n: 43 }, shortFloat: 0.03 } },
      { s: "RHM.DE", nota: "Rheinmetall", sursa: null, moneda: "€", pret: 982.4, prev: 990, closes30: [], extra: { tranzactii: [], rezultate: { data: "2026-11-05", eps: 6.66 }, analisti: { tinta: 1641.29, recom: "strong_buy", n: 20 }, shortFloat: null } },
      { s: "1QZ.DE", nota: "", sursa: "COIN", moneda: "€", pret: 170.12, prev: 172.54, closes30: [150, 170.12], extra: null }
    ]
  });
  assert.equal(p.la, ACUM); assert.equal(p.versiune, "v98.0"); assert.deepEqual(p.colector, { pid: 7, tura: 3 });
  const a = p.t212[0]; assert.equal(a.s, "AVGO"); assert.equal(a.plan.stop, 350.63); assert.equal(a.plan.max, 412.5); assert.equal(a.niv, "atentie"); assert.equal(a.trend, "jos"); assert.ok(Math.abs(a.pctLei - (-615 / 5211)) < 1e-6); assert.equal(a.closes30.length, 30); assert.equal(a.pplLei, -615);
  const u = p.t212[1]; assert.equal(u.plan, null, "fara plan = null, nu stop 0"); assert.equal(u.pctLei, null); assert.ok(Math.abs(u.pctPret - (178.86 / 184.51 - 1)) < 1e-6);
  const n = p.t212[2]; assert.deepEqual(n.closes30, []); assert.equal(n.prev, null); assert.equal(n.niv, null); assert.deepEqual(n.motive, []);
  const b = p.boti[0]; assert.equal(b.s, "VVV"); assert.equal(b.dir, "long"); assert.ok(Math.abs(b.inGrid - (29.64 - 28.464) / (33.346 - 28.464)) < 1e-4); assert.equal(b.pozitie, -4.31, "poziția = total − grile − comisioane, rotunjită la 2 zecimale"); assert.equal(b.plan, null); assert.equal(b.zero, 30.1548); assert.deepEqual(b.pret30, [30.4, 29.6, 29.64]);
  assert.equal(b.niv, "atentie"); assert.deepEqual(b.motive, ["costurile pe zi depășesc ce aduc grilele", "trendul e împotriva botului"]); assert.equal(b.sfat, "aș ieși pe zero");
  const i = p.simboluri[0]; assert.equal(i.insideri.verdict, "bull1"); assert.equal(i.rezultate.zile, 25); assert.equal(i.analisti.recom, "buy");
  const r = p.simboluri[1]; assert.equal(r.insideri.form4, false); assert.equal(r.shortFloat, null); assert.deepEqual(r.closes30, []);
  const q = p.simboluri[2]; assert.equal(q.sursa, "COIN"); assert.equal(q.insideri, null); assert.equal(q.rezultate, null);
  assert.equal(JSON.stringify(p).includes("NaN"), false); assert.equal(JSON.stringify(p).includes("undefined"), false);
  const gol = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: [], boti: [], simboluri: [] });
  assert.deepEqual(gol.gol, { boti: "niciun bot activ", t212: "nicio poziție deschisă" }); assert.equal(p.gol.boti, null);
  assert.equal(p.t212La, null); assert.equal(p.t212Eroare, null);
});
await test("Trading 212 n-a raspuns: pozitiile de la poza anterioara raman, cu ora lor si cu eroarea la vedere; lista goala + eroare nu inseamna 'nicio pozitie'", () => {
  const veche = [{ ticker: "UHS_US_EQ", simbol: "UHS", qty: 3.6, pretMediu: 184.51, pret: 178.86, prev: 176.99, ppl: -94, costLei: null, bare: [], plan: null, maxDupaCumparare: null, pondere: 0.1, sem: null, niv: null }];
  const p = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: veche, t212La: ACUM - 600000, t212Eroare: "Trading 212 a limitat cererile", boti: [], simboluri: [] });
  assert.equal(p.t212.length, 1); assert.equal(p.t212La, ACUM - 600000); assert.match(p.t212Eroare, /limitat/); assert.equal(p.gol.t212, null);
  const g = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: [], t212La: null, t212Eroare: "Trading 212 a limitat cererile", boti: [], simboluri: [] });
  assert.match(g.gol.t212, /n-a răspuns/); assert.doesNotMatch(g.gol.t212, /nicio poziție/);
});
await test("nivDinNiveluri: stopul POZITIEI (stopPozitie, cel care urca dupa maxim), nu stopul de intrare; tinta din plan bate tintaPozitie; trend string sau {dir}", () => {
  // forma reala a lui ActiuniSemnale.niveluri(): stop/tinta sunt pentru o CUMPARARE NOUA; stopPozitie/tintaPozitie sunt ale pozitiei
  const n = { nivel: "ok", trend: "jos", stop: 323.23, tinta: 400.0, stopPozitie: 350.63, tintaPozitie: 413.47, stopAtins: false, trailPct: 15 };
  assert.deepEqual(nivDinNiveluri(n, null), { stop: 350.63, tinta: 413.47, trend: "jos" });
  assert.deepEqual(nivDinNiveluri(n, { tinta: 420 }), { stop: 350.63, tinta: 420, trend: "jos" });
  assert.deepEqual(nivDinNiveluri({ ...n, trend: { dir: "sus" } }, null).trend, "sus");
  assert.equal(nivDinNiveluri({ nivel: "fara-date", motiv: "prea putine zile" }, null), null);
  assert.equal(nivDinNiveluri(null, null), null);
});
await test("prevClose: inchiderea ultimei sesiuni INCHEIATE (ziua New York), nu bara de azi", () => {
  const b = [{ t: Date.UTC(2026, 8, 24), c: 350.36 }, { t: Date.UTC(2026, 8, 25), c: 352.81 }];
  assert.equal(prevClose(b, ACUM), 352.81, "duminica: vineri e ultima sesiune incheiata");
  const cuLuni = b.concat([{ t: Date.UTC(2026, 8, 28), c: 360 }]);
  assert.equal(prevClose(cuLuni, Date.UTC(2026, 8, 28, 15)), 352.81, "luni in sesiune: bara de azi nu e 'prev'");
  assert.equal(prevClose(cuLuni, Date.UTC(2026, 8, 28, 21, 30)), 352.81, "luni dupa inchidere (17:30 NY): tot vineri");
  assert.equal(prevClose(cuLuni, Date.UTC(2026, 8, 29, 10)), 360, "marti pre-market: luni");
  assert.equal(prevClose([], ACUM), null); assert.equal(prevClose(null, ACUM), null);
});
await test("cadentaPoza: 2 minute cat e un bot activ sau bursa US e in ore extinse (4-20 NY, luni-vineri); altfel 5 minute", () => {
  assert.equal(cadentaPoza({ acum: Date.UTC(2026, 8, 28, 18, 0), botiActivi: 0 }), 120000, "luni 14:00 NY");
  assert.equal(cadentaPoza({ acum: Date.UTC(2026, 8, 28, 9, 0), botiActivi: 0 }), 120000, "luni 5:00 NY = pre-market");
  assert.equal(cadentaPoza({ acum: Date.UTC(2026, 8, 29, 1, 0), botiActivi: 0 }), 300000, "luni 21:00 NY = noapte");
  assert.equal(cadentaPoza({ acum: ACUM, botiActivi: 0 }), 300000, "duminica");
  assert.equal(cadentaPoza({ acum: ACUM, botiActivi: 1 }), 120000, "bot activ = 2 minute oricand");
});
await test("alerteSimboluri: miscare peste 2x ATR-ul propriu (o data pe zi) si cumparare noua de insider (fata de poza anterioara)", () => {
  const c = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 ? 0.5 : -0.5));   // ~1%/zi -> ATR ~1%
  // v98.2: alerta cere si ultimaCumparare RECENTA (sub 30 de zile) - forma pe care o da insideri()
  const ins = (verdict) => ({ form4: true, verdict, bp: verdict === "neut" ? 0 : 1, net: 5000, top: [{ d: "09-25", zi: "2026-09-25", cine: "Ion Pop", rol: "Chief Executive Officer", f: "buy", act: 5000, val: 250000 }],
    ultimaCumparare: verdict === "neut" ? null : { d: "09-25", zi: "2026-09-25", cine: "Ion Pop", rol: "Chief Executive Officer", f: "buy", act: 5000, val: 250000 } });
  const linistit = { s: "AAA", moneda: "$", pret: 100.4, prev: 100, closes30: c, insideri: ins("neut") };
  const miscat = { s: "BBB", moneda: "$", pret: 104, prev: 100, closes30: c, insideri: ins("neut") };
  const cumparat = { s: "CCC", moneda: "$", pret: 100, prev: 100, closes30: c, insideri: ins("bull1") };
  const a = alerteSimboluri([linistit, miscat, cumparat], { CCC: { insideri: { verdict: "neut" } } }, ACUM);
  // v100.40: cheia poarta ziua SESIUNII NY (duminica 27.09 -> sesiunea de vineri 25.09), nu ziua UTC
  assert.deepEqual(a.map((x) => x.cheie), ["sim-miscare-BBB-2026-09-25", "sim-insider-CCC-2026-09-25"]);
  assert.match(a[0].titlu, /BBB/); assert.match(a[0].mesaj, /ATR/); assert.match(a[0].mesaj, /ipotez/i, "pragul e o ipoteza, se spune");
  assert.match(a[1].titlu, /CCC/); assert.match(a[1].mesaj, /Ion Pop/);
  assert.equal(alerteSimboluri([cumparat], { CCC: { insideri: { verdict: "bull1" } } }, ACUM).length, 0, "acelasi verdict ca la poza anterioara = nimic nou");
  assert.equal(alerteSimboluri([cumparat], {}, ACUM).length, 0, "v98.2: prima poza cu simbolul (fara anterior) NU e stire - INTC a fost anuntat pe 27.09 pentru o cumparare din 11.08");
  assert.equal(alerteSimboluri([{ ...miscat, closes30: c.slice(0, 5) }], {}, ACUM).length, 0, "sub 15 inchideri nu judecam miscarea");
});
await test("marimea: 12 boti x 30 poze + 60 simboluri x top 3 ramane sub 512 KB", () => {
  const b = Array.from({ length: 12 }, (_, i) => ({ id: String(i), baza: "X" + i + ".PERP", directie: "long", levier: 3, investit: 100, gridJos: 1, gridSus: 2, pretCurent: 1.5, distantaLichidarePct: 20, ordinePerechi: 10, gridProfitBrut: 1, profitNet: 0.5, comisioane: -0.1, profitTotal: 0.4, plan: null, zero: 1.4, pret30: Array.from({ length: 30 }, () => 1.5), semafor: null }));
  const s = Array.from({ length: 60 }, (_, i) => ({ s: "S" + i, nota: "n".repeat(80), sursa: null, moneda: "$", pret: 10, prev: 9, closes30: Array.from({ length: 30 }, () => 10), extra: { tranzactii: Array.from({ length: 40 }, (_, k) => ({ startDate: { fmt: "2026-09-0" + (1 + k % 9) }, filerName: "Nume Lung " + k, filerRelation: "Chief Executive Officer", transactionText: "Sale at price 10", shares: { raw: 1000 }, value: { raw: 10000 } })), rezultate: { data: "2026-10-22", eps: 1 }, analisti: { tinta: 12, recom: "buy", n: 10 }, shortFloat: 0.1 } }));
  const p = construiestePoza({ acum: ACUM, versiune: "v98.0", t212: [], boti: b, simboluri: s });
  assert.ok(JSON.stringify(p).length < 512 * 1024, "sub limita worker-ului");
});

// v100.8 (el, 28.09: „în alerts la Trading 212 de ce nu apar și aici insiderii”)
await test("v100.8: pozițiile T212 poartă insiderii pe 60 de zile (aceeași regulă ca la simboluri); fără date = null, dubla germană = sursa din SUA", () => {
  const baza = { qty: 1, pretMediu: 10, pret: 11, prev: 10.5, ppl: 4, costLei: 46, bare: [], plan: null, maxDupaCumparare: null, pondere: 0.1, sem: null, niv: null };
  const p = construiestePoza({ acum: ACUM, versiune: "v100.8", boti: [], simboluri: [], t212: [
    { ...baza, ticker: "INTC_US_EQ", simbol: "INTC", extra: { tranzactii: [{ startDate: { fmt: "2026-08-11" }, filerName: "TAN", filerRelation: "CEO", transactionText: "Purchase at 95", shares: { raw: 5 }, value: { raw: 475 } }] } },
    { ...baza, ticker: "UHS_US_EQ", simbol: "UHS", extra: null },
    { ...baza, ticker: "1QZd_EQ", simbol: "1QZ.DE", sursa: "COIN", extra: { tranzactii: [] } }] });
  assert.equal(p.t212[0].insideri.verdict, "bull1"); assert.equal(p.t212[0].insideri.top[0].cine, "Tan");
  assert.equal(p.t212[1].insideri, null, "Yahoo n-a dat nimic = null, nu „fără insideri”"); assert.equal(p.t212[1].sursa, null);
  assert.equal(p.t212[2].sursa, "COIN"); assert.equal(p.t212[2].insideri.form4, false);
  assert.equal(JSON.stringify(p).includes("undefined"), false);
});

console.log(`POZA_V98 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
