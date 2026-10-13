// Probele v100.176 (13.10.2026, el: „din prima recomandare 1–6”) — contul întreg: expunerea, riscul pe o zi (VaR / ES), corelațiile,
// stres-testele pe crizele reale, reconcilierea cu brokerii, randamentul ponderat în timp (TWR) față de BTC și S&P.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
console.log("\nv100.176 · contul întreg · proba\n");
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "cont-intreg.js"), ctx);
const C = ctx.ContIntreg, ZI = 86400000, T0 = Date.parse("2026-01-01T00:00:00Z");
const aproape = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= (eps || 1e-9), (m || "") + " " + a + " ≠ " + b);
const LEI = { USD: 4.4, EUR: 5.0, GBP: 5.8 };

await test("expunerea botului = poziția REALĂ × preț (cu semnul direcției), în lei; fără poziție ⇒ lipsă, nu 0", () => {
  const b = { activ: true, id: "1", baza: "SOL.PERP", directie: "long", levier: 3, pretCurent: 150, pozitie: 2, investit: 100, profitTotal: -10, gridJos: 120, gridSus: 180, lichidareJos: 90 };
  const e = C.dinBot(b, LEI); assert.equal(e.notional, 300); assert.equal(e.notionalLei, 1320); assert.equal(e.valoare, 90); assert.equal(e.cheie, "C:SOL");
  assert.equal(C.dinBot({ ...b, directie: "short" }, LEI).notional, -300);
  const f = C.dinBot({ ...b, pozitie: null }, LEI); assert.equal(f.notional, null); assert.match(f.lipsa, /poziția/);
});
await test("acțiunile: moneda după bursă (pence la Londra ÷ 100, euro la Xetra), în lei; fără curs ⇒ lipsă", () => {
  aproape(C.dinT212({ ticker: "AAPL_US_EQ", quantity: 2, currentPrice: 100 }, LEI).notionalLei, 880, 1e-9);
  aproape(C.dinT212({ ticker: "SAPd_EQ", quantity: 1, currentPrice: 200 }, LEI).notionalLei, 1000, 1e-9);
  aproape(C.dinT212({ ticker: "VODl_EQ", quantity: 100, currentPrice: 70 }, LEI).notionalLei, 406, 1e-9);
  aproape(C.dinSalt({ simbol: "RHM.DE", qty: 1, pret: 1500, moneda: "EUR" }, LEI).notionalLei, 7500, 1e-9);
  assert.equal(C.dinT212({ ticker: "SAPd_EQ", quantity: 1, currentPrice: 200 }, { USD: 4.4 }).notionalLei, null);
});
await test("valoarea contului: o parte necitită ⇒ „complet: false” și numele ei, nu o sumă mai mică dată drept întreagă", () => {
  const v = C.valoare({ boti: [{ activ: true, id: "1", baza: "X", pretCurent: 1, pozitie: 1, investit: 100, profitTotal: 5 }], pionexLiber: 10, t212Cash: { total: 5000 }, salt: null, leiPe: LEI });
  aproape(v.pionex, 115 * 4.4); assert.equal(v.t212, 5000); assert.equal(v.salt, null); assert.equal(v.complet, true);
  const w = C.valoare({ boti: null, t212Cash: null, salt: [], leiPe: LEI }); assert.equal(w.complet, false); assert.deepEqual(Array.from(w.lipsa), ["Pionex", "Trading 212"]);
});

// riscul pe o zi
const serie = (n, f) => { const o = {}; for (let i = 0; i < n; i++) o[new Date(T0 + i * ZI).toISOString().slice(0, 10)] = f(i); return o; };
await test("VaR / ES pe o distribuție cunoscută: 100 de zile cu P&L −50…+49 ⇒ VaR95 ≈ 45, ES95 = media celor mai rele 5 ≈ 48", () => {
  const p = Array.from({ length: 100 }, (_, i) => ({ z: "d" + i, pnl: i - 50 })), r = C.varEs(p, 0.95);
  aproape(r.var, 45.05, 0.01); aproape(r.es, 48, 0.6); assert.equal(r.n, 100); assert.equal(C.varEs(p.slice(0, 10), 0.95), null, "sub 20 de zile: nimic");
});
await test("P&L-ul istoric: pozițiile de ACUM pe randamentele trecute, cu cursul leului; istoria prea scurtă iese și se spune", () => {
  const e = [{ cheie: "A", nume: "A", clasa: "actiuni", moneda: "USD", notionalLei: 1000 }, { cheie: "B", nume: "B", clasa: "crypto", moneda: "USD", notionalLei: 500 }];
  const serii = { A: serie(100, (i) => (i % 2 ? 0.01 : -0.01)), B: serie(10, () => 0.05) };
  const fx = { USD: serie(100, () => 0) };
  const r = C.pnlIstoric(e, serii, fx, {}); assert.deepEqual(Array.from(r.folosite), ["A"]); assert.equal(r.scoase.length, 1); assert.match(r.scoase[0].motiv, /istorie prea scurtă/);
  aproape(Math.abs(r.zile[5].pnl), 10, 1e-9);
  const r2 = C.pnlIstoric([e[0]], serii, { USD: serie(100, () => 0.01) }, {}); aproape(r2.zile[0].pnl, 1000 * ((1 - 0.01) * 1.01 - 1), 1e-9, "cursul leului intră în P&L");
});

// corelațiile
await test("corelații: două serii identice ⇒ ρ = 1, „același risc”; long + short pe aceeași mișcare ⇒ „se acoperă”", () => {
  const s = serie(80, (i) => Math.sin(i) / 50), e = [{ cheie: "A", nume: "A", notionalLei: 1000 }, { cheie: "B", nume: "B", notionalLei: 800 }, { cheie: "C", nume: "C", notionalLei: -600 }];
  const p = C.corelatii(e, { A: s, B: s, C: s }, {}); assert.equal(p.length, 3);
  const ab = p.find((x) => x.a === "A" && x.b === "B"); aproape(ab.rho, 1, 1e-9); assert.equal(ab.acelasiRisc, true);
  const ac = p.find((x) => x.a === "A" && x.b === "C"); assert.equal(ac.seAcopera, true);
});
await test("diversificare: două poziții identice ⇒ un singur pariu; două independente ⇒ ~2", () => {
  const s1 = serie(300, (i) => ((i * 7919) % 101 - 50) / 2000), s2 = serie(300, (i) => ((i * 104729) % 97 - 48) / 2000);
  const e1 = [{ cheie: "A", nume: "A", clasa: "crypto", moneda: "USD", notionalLei: 1000 }, { cheie: "B", nume: "B", clasa: "crypto", moneda: "USD", notionalLei: 1000 }];
  const p1 = C.pnlIstoric(e1, { A: s1, B: s1 }, {}, {}); aproape(C.diversificare(e1, { A: s1, B: s1 }, p1.zile).pariuri, 1, 1e-6);
  const p2 = C.pnlIstoric(e1, { A: s1, B: s2 }, {}, {}), d2 = C.diversificare(e1, { A: s1, B: s2 }, p2.zile); assert.ok(d2.pariuri > 1.6 && d2.pariuri <= 2, "pariuri " + d2.pariuri);
});

// stres
const bot = { tip: "bot", cheie: "C:SOL", nume: "SOL", clasa: "crypto", moneda: "USD", pret: 100, notional: 150, notionalLei: 660, valoare: 100, dir: "long", levier: 3, investit: 100, gridJos: 80, gridSus: 120, lichJos: 60, lichSus: null };
await test("gridul long la scădere pierde MAI MULT decât poziția statică (cumpără pe drum), dar nu mai mult decât are", () => {
  const g = C.pnlBot(bot, -0.15), st = 150 * -0.15; assert.ok(g.pnl < st, "grid " + g.pnl + " vs static " + st); assert.equal(g.lichidat, false);
  const sus = C.pnlBot(bot, 0.1); assert.ok(sus.pnl > 0 && sus.pnl < 150 * 0.1, "la urcare vinde pe drum: câștigă mai puțin decât static (" + sus.pnl + ")");
});
await test("trecerea prețului de lichidare ⇒ pierzi tot ce e în bot (valoarea), nu mai mult; short-ul pierde la urcare", () => {
  const l = C.pnlBot(bot, -0.45); assert.equal(l.lichidat, true); assert.equal(l.pnl, -100);
  const sh = C.pnlBot({ ...bot, dir: "short", notional: -150, lichJos: null, lichSus: 140 }, 0.1); assert.ok(sh.pnl < 0);
  assert.equal(C.pnlBot({ ...bot, dir: "short", notional: -150, lichJos: null, lichSus: 140 }, 0.5).lichidat, true);
});
await test("stres: randamentele crizei se iau din date (fereastra), poziția cu istorie proprie folosește randamentul EI, restul β × factor", () => {
  const bare = (pr) => pr.map(([z, c]) => ({ t: Date.parse(z + "T00:00:00Z"), c }));
  const btc = bare([["2022-11-04", 21000], ["2022-11-07", 20600], ["2022-11-08", 18500], ["2022-11-09", 15900], ["2022-11-10", 17500]]);
  const qqq = bare([["2022-11-07", 270], ["2022-11-08", 272], ["2022-11-09", 265]]);
  aproape(C.randFereastra(btc, "2022-11-07", "2022-11-09"), 15900 / 20600 - 1, 1e-12);
  const act = { tip: "t212", cheie: "T:AAPL", nume: "AAPL", clasa: "actiuni", moneda: "USD", notionalLei: 4400 };
  const s = C.stres([act, bot], { crize: [{ cod: "ftx", nume: "FTX", de: "2022-11-07", pana: "2022-11-09" }], factori: { BTC: btc, QQQ: qqq }, betas: { "C:SOL": 1.5 }, leiPe: LEI,
    bareLungi: { "T:AAPL": bare([["2022-11-07", 100], ["2022-11-09", 95]]) } });
  assert.equal(s.length, 1); const pa = s[0].pozitii.find((x) => x.nume === "AAPL"); aproape(pa.r, -0.05, 1e-12); assert.equal(pa.cum, "a ei");
  const ps = s[0].pozitii.find((x) => x.nume === "SOL"); aproape(ps.r, 1.5 * (15900 / 20600 - 1), 1e-12); assert.match(ps.cum, /β 1,5 × BTC/);
  assert.equal(C.CRIZE.length >= 5, true);
});

// reconcilierea
await test("reconcilierea T212: cantitățile din jurnal față de cont — umplere lipsă, vânzare lipsă, diferențe; egale ⇒ ok", () => {
  const r = C.reconciliereT212([{ ticker: "A", quantity: 10 }, { ticker: "B", quantity: 5 }, { ticker: "C", quantity: 3 }], [{ ticker: "A", qty: 4 }, { ticker: "A", qty: 6 }, { ticker: "B", qty: 4 }, { ticker: "D", qty: 2 }]);
  assert.equal(r.ok, false); assert.deepEqual(Array.from(r.abateri.map((x) => x.ticker)), ["B", "C", "D"]);
  assert.match(r.abateri[1].motiv, /umplere lipsă/); assert.match(r.abateri[2].motiv, /vânzare lipsă/);
  assert.equal(C.reconciliereT212([{ ticker: "A", quantity: 10 }], [{ ticker: "A", qty: 10.000001 }]).ok, true);
});
await test("reconcilierea arhivei și a urmăririi: boții din prima pagină Pionex lipsă din arhivă; boții porniți fără istoric proaspăt", () => {
  assert.deepEqual(Array.from(C.reconciliereArhiva(["1", "2", "3"], ["1", "3"]).lipsa), ["2"]);
  const u = C.reconciliereUrmarire([{ id: "a", nume: "A" }, { id: "b", nume: "B" }], { a: 1000 * 60000 }, 1010 * 60000, 20); assert.deepEqual(Array.from(u.lipsa.map((x) => x.id)), ["b"]);
});

// randamentul
await test("T212 refăcut din umpleri: cumpăr 10 buc cu 4.400 lei, a doua zi prețul +10 % ⇒ +10 % în ziua aceea; vânzarea nu e „câștig”", () => {
  const z = (i) => new Date(Date.parse("2026-03-02T00:00:00Z") + i * ZI).toISOString().slice(0, 10);
  const u = [{ t: Date.parse(z(0) + "T15:00:00Z"), ticker: "AAPL_US_EQ", side: "BUY", qty: 10, net: 4400 }, { t: Date.parse(z(2) + "T15:00:00Z"), ticker: "AAPL_US_EQ", side: "SELL", qty: 10, net: 4840 }];
  const bare = { AAPL_US_EQ: [0, 1, 2].map((i) => ({ t: Date.parse(z(i) + "T13:30:00Z"), c: i === 0 ? 100 : 110 })) };
  const s = C.seriaT212(u, bare, { USD: { [z(0)]: 4.4 } }, { pana: z(3) });
  aproape(s[0].r, 0, 1e-12, "ziua cumpărării la preț"); aproape(s[1].r, 0.1, 1e-12); aproape(s[2].r, 0, 1e-12, "vânzarea la închiderea zilei: fără câștig inventat");
});
await test("moneda după litera bursei din tickerul T212 (p/a/m = euro, s = franci, l = pence) și reancorarea după o zi fără preț", () => {
  assert.equal(C.monedaTicker("ALTOOp_EQ"), "EUR"); assert.equal(C.monedaTicker("NOVNs_EQ"), "CHF"); assert.equal(C.monedaTicker("RRl_EQ"), "GBX"); assert.equal(C.monedaTicker("SAPd_EQ"), "EUR"); assert.equal(C.monedaTicker("AAPL_US_EQ"), "USD");
  const z = (i) => new Date(Date.parse("2026-03-02T00:00:00Z") + i * ZI).toISOString().slice(0, 10);
  // A are bare doar din ziua 3; B are bare mereu; ziua 1 n-are curs ⇒ cursul cel mai apropiat; nicio zi nu iese cu câștigul „acumulat”
  const u = [{ t: Date.parse(z(0) + "T15:00:00Z"), ticker: "A_US_EQ", side: "BUY", qty: 1, net: 400, pret: 100 }, { t: Date.parse(z(0) + "T15:00:00Z"), ticker: "B_US_EQ", side: "BUY", qty: 1, net: 400, pret: 100 }];
  const bare = { A_US_EQ: [3, 4].map((i) => ({ t: Date.parse(z(i) + "T13:30:00Z"), c: 100 })), B_US_EQ: [0, 1, 2, 3, 4].map((i) => ({ t: Date.parse(z(i) + "T13:30:00Z"), c: 100 + i })) };
  const s = C.seriaT212(u, bare, { USD: { [z(0)]: 4, [z(2)]: 4 } }, { pana: z(4) });
  assert.ok(s.length >= 4, "zile " + s.length); assert.ok(s.every((x) => Math.abs(x.r) < 0.02), JSON.stringify(s.map((x) => x.r)));
});
await test("statistici: TWR înlănțuit, scăderea maximă, Sharpe; față de reper (randamentul lui pe aceleași zile, beta)", () => {
  const l = Array.from({ length: 40 }, (_, i) => ({ z: "2026-01-" + String(i + 1).padStart(2, "0"), r: i === 10 ? -0.2 : 0.01, pnl: 1 }));
  const st = C.statistici(l); aproape(st.twr, Math.pow(1.01, 39) * 0.8 - 1, 1e-9); aproape(st.maxDd, -0.2, 1e-9); assert.ok(st.sharpe > 0);
  const rep = {}; l.forEach((x) => { rep[x.z] = x.r / 2; }); const f = C.fataDe(l, rep); aproape(f.beta, 2, 1e-9); aproape(f.rho, 1, 1e-9);
  assert.equal(C.statistici(l.slice(0, 10)), null, "sub 20 de zile: nimic");
});
await test("boții: rezultatul net împărțit egal pe zilele lor, capitalul = suma pusă a celor în viață", () => {
  const a = Date.parse("2026-02-01T10:00:00Z"), s = C.seriaBoti([{ pornit: a, inchis: a + 3 * ZI, investit: 100, rezultat: 8 }], { USD: { "2026-01-01": 4 } }, {});
  assert.equal(s.length, 4); aproape(s[0].r, 0.02, 1e-12); aproape(s[0].pnl, 8, 1e-12); aproape(s[0].cap, 400, 1e-12);
  const c = C.combina([s, [{ z: s[0].z, pnl: 10, cap: 600 }]]); aproape(c[0].r, 18 / 1000, 1e-12);
});

// jurnalul de execuție
await test("execuția: conversia (comisionul + cursul față de BNR), stopul atins sub preț, limita, ordinul dat cu bursa închisă, ieșirea sub stopul din plan", () => {
  const z = (s) => Date.parse(s), lei = { USD: { "2026-09-24": 4.6 } };
  const u = [
    { t: z("2026-09-24T13:33:00Z"), ticker: "UHS_US_EQ", side: "BUY", qty: 3.6, pret: 186.6, net: 3090.54, fee: 4.63, fx: 0.21524801, tip: "MARKET", creat: z("2026-09-24T07:15:55Z") },
    { t: z("2026-09-25T15:00:00Z"), ticker: "AAA_US_EQ", side: "SELL", qty: 10, pret: 9.5, net: 437, fee: 0, tip: "STOP", stopPret: 10 },
    { t: z("2026-09-25T15:00:00Z"), ticker: "BBB_US_EQ", side: "BUY", qty: 10, pret: 19.9, net: 915, fee: 0, tip: "LIMIT", limita: 20 },
    { t: z("2026-09-26T15:00:00Z"), ticker: "CCC_US_EQ", side: "SELL", qty: 5, pret: 45, net: 1035, fee: 0, tip: "MARKET", creat: z("2026-09-26T14:59:00Z") },
  ];
  const bare = { UHS_US_EQ: [{ t: z("2026-09-23T13:30:00Z"), c: 180 }, { t: z("2026-09-24T13:30:00Z"), c: 187 }] };
  const sedinta = (t) => { const h = new Date(t).getUTCHours() * 60 + new Date(t).getUTCMinutes(); return h >= 810 && h < 1200; };
  const e = C.executie(u, { leiZi: lei, bare, sedinta, planuri: { CCC_US_EQ: { stop: 50, la: z("2026-09-01T00:00:00Z") } }, de: z("2026-01-01T00:00:00Z") });
  assert.equal(e.n, 4); assert.equal(e.cuTip, 4);
  aproape(e.conversie.lei, 4.63, 1e-9); aproape(e.conversie.fataBnr.mediana, -((1 / 0.21524801) / 4.6 - 1), 1e-9, "a cumpărat dolari mai scump decât BNR");
  aproape(e.stop.mediana, -0.05, 1e-12); aproape(e.stop.bani, -5, 1e-9);
  aproape(e.limita.mediana, 20 / 19.9 - 1, 1e-12);
  assert.equal(e.pesteNoapte.n, 1); aproape(e.pesteNoapte.mediana, 180 / 186.6 - 1, 1e-12, "a plătit mai mult decât închiderea dinainte"); assert.ok(e.pesteNoapte.cele[0].ore > 6);
  assert.equal(e.subPlan.n, 1); aproape(e.subPlan.mediana, -0.1, 1e-12); aproape(e.subPlan.bani, -25, 1e-9);
});
await test("T212.umpleri păstrează tipul ordinului, ora, limita și stopul; serverul le păstrează la curățare", async () => {
  const c2 = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl }; c2.globalThis = c2; vm.createContext(c2); vm.runInContext(citeste("public", "lib", "t212.js"), c2);
  const u = c2.T212.umpleri([{ order: { id: 1, type: "STOP", status: "FILLED", side: "SELL", ticker: "X_US_EQ", createdAt: "2026-09-24T07:15:55.000Z", stopPrice: 10 }, fill: { id: 9, quantity: -2, price: 9.5, filledAt: "2026-09-24T13:33:00.000Z", walletImpact: { netValue: 80, fxRate: 0.215, taxes: [] } } }]);
  assert.equal(u[0].tip, "STOP"); assert.equal(u[0].stopPret, 10); assert.equal(u[0].creat, Date.parse("2026-09-24T07:15:55.000Z"));
  assert.match(citeste("functions", "api", "t212.js"), /creat: nr\(x\.creat\), limita: nr\(x\.limita\), stopPret: nr\(x\.stopPret\)/);
});
// pagina, serverul, legarea
const RAP = { la: Date.parse("2026-10-13T10:00:00Z"), valoare: { pionex: 150, t212: 28000, salt: 0, total: 28150, complet: true, lipsa: [] },
  expuneri: [{ nume: "APLD", lei: 5800, beta: 2.85 }, { nume: "PLUME (bot long 5×)", lei: 1146, beta: 1.1 }],
  risc: { n: 250, var95: 1190, es95: 1494, var99: 1611, es99: 1982, ziRea: { z: "2026-06-05", lei: -2496 }, scoase: [], pnl: Array.from({ length: 250 }, (_, i) => ["2026-01-01", (i % 50) * 40 - 1000]) },
  corelatii: [{ a: "WDC", b: "STX", rho: 0.89, n: 90, acelasiRisc: true, seAcopera: false }], diversificare: { raport: 1.49, pariuri: 2.2, pozitii: 11 },
  stres: [{ nume: "Covid, martie 2020", de: "2020-03-06", pana: "2020-03-16", btc: -0.45, qqq: -0.186, lei: -9694, pozitii: [{ nume: "APLD", lei: -2500, lichidat: false }] }],
  reconciliere: { t212: { ok: false, abateri: [{ ticker: "CMG_CA_EQ", broker: 0, radar: 9.38, motiv: "în jurnal, dar nu în cont (vânzare lipsă din jurnal)" }], verificate: 10 }, arhiva: { ok: true, lipsa: [], verificate: 10 }, urmarire: { ok: true, lipsa: [], verificate: 1 } },
  executie: { n: 40, cuTip: 12, conversie: { n: 40, lei: 180, mediana: 0.0015, fataBnr: { n: 30, mediana: -0.004 } }, stop: { n: 2, mediana: -0.03, cel: -0.06, bani: -40, cele: [] }, limita: { n: 0 }, pesteNoapte: { n: 3, mediana: -0.02, cel: -0.05, cele: [{ ticker: "UHS_US_EQ", r: -0.05 }] }, subPlan: { n: 0 } },
  randament: { tot: { n: 300, de: "2025-10-16", pana: "2026-10-13", twr: -0.12, maxDd: -0.3, ziMaxDd: "2026-07-16", sharpe: -0.4, sortino: -0.5, zilePlus: 0.48 }, fataBtc: { reper: -0.08 }, fataSpy: { reper: 0.16 }, t212Aprox: ["X_US_EQ"], t212Nepotrivite: [] } };
const ctxE = { TextRo: globalThis.TextRo }; vm.createContext(ctxE); vm.runInContext(citeste("public", "lib", "cont-ecran.js"), ctxE);
await test("pagina: răspunsul în cuvinte (valoarea, ziua proastă, criza), „Ce aș face eu”, cifrele, histograma, crizele, reconcilierea, execuția, randamentul", () => {
  const h = ctxE.ciHtml(RAP, { acum: RAP.la + 3600000 });
  assert.match(h, /Contul tău: 28\.150 lei\. Într-o zi proastă \(1 din 20\) pozițiile de acum pierd cel puțin ~1\.190 lei/);
  assert.match(h, /Cea mai rea criză din trecut, pe ce ai acum: Covid, martie 2020, −9\.694 lei/);
  assert.match(h, /👉 <b>Ce aș face eu:<\/b> WDC și STX se mișcă aproape la fel/); assert.match(h, /<svg class="ciHisto"/);
  assert.match(h, /✗ <b>Trading 212: 1 abatere<\/b>/); assert.match(h, /CMG_CA: cont 0, jurnal 9,38/);
  assert.match(h, /Cât te costă execuția/); assert.match(h, /Ordine la piață date cu bursa închisă/);
  assert.match(h, /banii puși la lucru au făcut −12,0% ponderat în timp; BTC a făcut −8,0%, S&amp;P \+16,0%/);
  assert.match(h, /1 simbol fără prețuri \(delistat\) e ținut la ultimul preț de tranzacție/);
  assert.ok(!/vechi de/.test(h), "proaspăt: fără avertisment");
  assert.match(ctxE.ciHtml(RAP, { acum: RAP.la + 20 * 3600000 }), /Raportul e vechi de 20 de ore/);
  assert.match(ctxE.ciHtml(null, {}), /Încă nu există: pornește colectorul/);
});
await test("pagina: un bot pornit pe care Radarul nu-l mai urmărește bate orice alt sfat", () => {
  const r = JSON.parse(JSON.stringify(RAP)); r.reconciliere.urmarire = { ok: false, lipsa: [{ id: "1", nume: "PLUME" }], verificate: 1 };
  assert.match(ctxE.ciHtml(r, { acum: r.la }), /Ce aș face eu:<\/b> Aș verifica acum botul PLUME direct în Pionex/);
});
await test("serverul: raportul (cu „la”) și valoarea zilei (o intrare pe zi) se scriu și se citesc din KV", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: "proba-token-1234567890", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`); let ip = 0;
  const h = () => ({ authorization: "Bearer proba-token-1234567890", "content-type": "application/json", origin: "https://ex.test", "cf-connecting-ip": "10.176.1." + (++ip) });
  const post = async (a, c) => (await m.onRequestPost({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { method: "POST", headers: h(), body: JSON.stringify(c) }), env })).status;
  const get = async (a) => JSON.parse(await (await m.onRequestGet({ request: new Request("https://ex.test/api/istoric-bot?action=" + a, { headers: h() }), env })).text());
  assert.equal(await post("cont", { cont: { valoare: 1 } }), 400, "fără „la” e refuzat"); assert.equal(await post("cont", { cont: RAP }), 200);
  assert.equal((await get("cont")).cont.valoare.total, 28150);
  assert.equal(await post("contZi", { z: "2026-10-13", valoare: 28150, complet: true }), 200); assert.equal(await post("contZi", { z: "2026-10-13", valoare: 28200 }), 200); assert.equal(await post("contZi", { z: "13.10", valoare: 1 }), 400);
  const z = (await get("contZile")).zile; assert.equal(z.length, 1); assert.equal(z[0].valoare, 28200);
});
await test("legarea paginii: meniul din stânga, sertarul „More” de pe telefon, secțiunea, scripturile, cache-ul aplicației, navTo", () => {
  const html = citeste("public", "index.html"), sw = citeste("public", "sw.js"), app = citeste("public", "app.js");
  assert.match(html, /data-nav="contintreg"><span class="sideIcon">Σ<\/span>Contul întreg<\/button>/); assert.match(html, /moreNav\('contintreg',true\)"><b>Σ<\/b>Contul întreg<\/button>/);
  assert.match(html, /<section class="panel" id="contintreg">/); assert.match(html, /<div class="card full" id="ciPagina">/);
  assert.match(html, /<script src="\/lib\/cont-intreg\.js"><\/script>(<script src="\/lib\/verdicte\.js"><\/script>)?<script src="\/lib\/cont-ecran\.js"><\/script>/); assert.match(sw, /"\/lib\/cont-intreg\.js",("\/lib\/verdicte\.js",)?"\/lib\/cont-ecran\.js"/);
  assert.match(app, /else if\(id==="contintreg"\)\{if\(typeof ciPorneste==="function"\)ciPorneste\(false\)\}/);
});
await test("colectorul: tura contului la 6 ore, cu formulele paginii; istoria lungă pe disc o săptămână; prețurile zilnice pe disc o zi, la 2,5 s", () => {
  const c = citeste("scripts", "colector.mjs"); assert.match(c, /const ContIntreg = incarca\("cont-intreg\.js", "ContIntreg"\)/); assert.match(c, /turaContColector\(\)\.catch/);
  assert.match(c, /Date\.now\(\) - x\.la < 7 \* 86400000/); assert.match(c, /contBareUltima \+ 2500 - Date\.now\(\)/);
  assert.match(citeste("scripts", "lib", "tura-cont.mjs"), /const ORA = 3600000, PAS = 6 \* ORA;/);
});
const T212M = await import("./lib/tura-t212.mjs");
await test("completarea istoricului T212: pagină cu pagină de la cap, 12 pe tură, ține minte cursorul, „gata” la capăt", async () => {
  const pag = { null: { items: [{ order: { id: 1 } }], cursor: "2" }, 2: { items: [{ order: { id: 2 } }], cursor: "3" }, 3: { items: [{ order: { id: 3 } }], cursor: null } }, trimise = [];
  const st = {}, d = { cerePagina: async (c) => pag[c], salveaza: async (b) => { trimise.push(b.ordine[0]); return { noi: 0 }; }, umpleri: () => [], pauza: async () => {}, max: 2 };
  let r = await T212M.turaT212Exec(d, st); assert.equal(r.pagini, 2); assert.equal(st.cursor, "3"); assert.ok(!st.gata);
  r = await T212M.turaT212Exec(d, st); assert.equal(r.gata, true); assert.deepEqual(trimise, ["1", "2", "3"]);
  r = await T212M.turaT212Exec(d, st); assert.equal(r.pagini, 0, "după capăt nu mai cere nimic");
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
