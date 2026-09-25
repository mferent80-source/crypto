// Probele v87 ("fa toate", 25.09): frana de "cumparat in jos", "cat te-ar fi salvat stopul", regulile tale din
// jurnalul de actiuni, comisionul dus-intors in poarta, dividendele, data rezultatelor (Nasdaq), ritmul de
// recuperare al botului, comisionul din fiecare umplere (bot vs fisa), alerta opritorului care urca.
import assert from "node:assert/strict";
import fs from "node:fs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const aprox = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} vs ${b}`);
const lib = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const A = new Function(lib("grid-calcul.js") + lib("actiuni-semnale.js") + "; return ActiuniSemnale;")();
const X = new Function(lib("grid-calcul.js") + lib("tablou-extra.js") + "; return TabloExtra;")();
const T = new Function(lib("t212.js") + "; return T212;")();
const AL = new Function(lib("alerte.js") + "; return Alerte;")();
const ZI = 86400000, T0 = Date.UTC(2026, 5, 1, 14);
const u = (id, side, tk, qty, pret, zi, net) => ({ id: String(id), t: T0 + zi * ZI, side, ticker: tk, simbol: tk.split("_")[0], qty, pret, net: net || qty * pret * 4.4, fee: 1, realizat: side === "SELL" ? 0 : null });

console.log("\nV87 · pachetul 'fa toate' · proba\n");

// ---------------- T212 · 1) frana de "cumparat in jos" ----------------
await test("cumparari in jos: a doua cumparare sub pretul mediu -> nr 1, a treia -> nr 2; dupa vanzarea totala se ia de la capat; o cumparare peste medie rupe sirul", () => {
  const l = A.cumparariInJos([u(1, "BUY", "NPA_US_EQ", 19, 108, 0), u(2, "BUY", "NPA_US_EQ", 9, 99, 2), u(3, "BUY", "NPA_US_EQ", 11, 95.6, 2.1), u(4, "BUY", "NPA_US_EQ", 37, 89.35, 9),
    u(5, "SELL", "NPA_US_EQ", 76, 72, 20), u(6, "BUY", "NPA_US_EQ", 16, 71.66, 50), u(7, "BUY", "X_US_EQ", 1, 10, 1), u(8, "BUY", "X_US_EQ", 1, 9, 2), u(9, "BUY", "X_US_EQ", 1, 12, 3), u(10, "BUY", "X_US_EQ", 1, 9.5, 4)]);
  const npa = l.filter((x) => x.ticker === "NPA_US_EQ");
  assert.deepEqual(npa.map((x) => [x.id, x.nr]), [["2", 1], ["3", 2], ["4", 3]], JSON.stringify(npa));
  aprox(npa[0].mediu, 108, 1e-9); assert.ok(npa[2].sub < -0.1);
  const x = l.filter((y) => y.ticker === "X_US_EQ");
  assert.deepEqual(x.map((y) => [y.id, y.nr]), [["8", 1], ["10", 1]], "cumpararea la 12 (peste medie) a rupt sirul");
  assert.deepEqual(A.cumparariInJos(null), []);
});
await test("frana: mesajul spune pretul, cat sub medie, suma si 'ce as face eu'; a doua la rand -> critic", () => {
  const [a, b] = A.cumparariInJos([u(1, "BUY", "NPA_US_EQ", 19, 108, 0), u(2, "BUY", "NPA_US_EQ", 9, 99, 2), u(3, "BUY", "NPA_US_EQ", 11, 95.6, 2.1)]);
  const m1 = A.alertaFrana(a, "ASTS"), m2 = A.alertaFrana(b, "ASTS");
  assert.equal(m1.nivel, "atentie"); assert.equal(m2.nivel, "critic");
  assert.match(m1.titlu, /ASTS/); assert.match(m1.mesaj, /sub prețul tău mediu/); assert.match(m1.mesaj, /👉/); assert.match(m2.titlu, /a 2-a oară/);
});

// ---------------- T212 · 2) cat te-ar fi salvat stopul ----------------
const bare = (valori) => valori.map((v, i) => ({ t: Date.UTC(2026, 5, 1, 13, 30) + i * ZI, o: v[0], h: v[1], l: v[2], c: v[3] }));
await test("cu stop: prima zi DUPA cumparare in care minimul atinge stopul -> iesire la stop (sau la deschidere, daca a deschis sub el), minus 0,3% comision; ziua cumpararii si a vanzarii nu intra", () => {
  const b = bare([[100, 101, 99, 100], [100, 100, 95, 96], [96, 96, 90, 91], [85, 86, 80, 82], [82, 83, 70, 71]]);
  const t = { pornit: b[0].t + 3600000, inchis: b[4].t + 3600000, pretCumparare: 100 };
  const r = A.cuStop(t, b, [8, 10, 15]);
  aprox(r[8].pct, 0.92 - 1 - 0.003, 1e-12); assert.equal(r[8].zi, b[2].t);
  aprox(r[10].pct, 0.90 - 1 - 0.003, 1e-12);
  aprox(r[15].pct, 0.85 - 1 - 0.003, 1e-12, "a deschis la 85 = chiar stopul"); assert.equal(r[15].zi, b[3].t);
  const nu = A.cuStop({ pornit: b[0].t + 1, inchis: b[1].t + 1, pretCumparare: 100 }, b, [8]); assert.strictEqual(nu[8], null, "vandut inainte sa atinga");
  const gap = A.cuStop({ pornit: b[0].t + 1, inchis: b[4].t + 1, pretCumparare: 100 }, bare([[100, 100, 99, 100], [80, 81, 79, 80], [80, 80, 80, 80], [80, 80, 80, 80], [80, 80, 80, 80]]), [8]);
  aprox(gap[8].pct, 0.80 - 1 - 0.003, 1e-12, "gol peste noapte: iesi la deschidere, nu la stop");
});
await test("rezumatul stopului: pe trade-urile judecate - total real vs total cu stop, cate atinse, cate castigatoare ar fi fost TAIATE (cinstit: stopul costa si el)", () => {
  const tr = [{ id: "a", cost: 1000, rezultat: -300, pct: -0.3 }, { id: "b", cost: 1000, rezultat: 50, pct: 0.05 }, { id: "c", cost: 1000, rezultat: 20, pct: 0.02 }, { id: "d", cost: 1000, rezultat: 5 }];
  const cf = { a: { stop: { 10: { pct: -0.103 } } }, b: { stop: { 10: { pct: -0.103 } } }, c: { stop: { 10: null } }, d: {} };
  const r = A.rezumatStop(tr, cf, [10]);
  assert.equal(r.judecate, 3, "d n-are proba de stop");
  aprox(r.real, -230, 1e-9); aprox(r.praguri[10].total, -103 - 103 + 20, 1e-9);
  assert.equal(r.praguri[10].atinse, 2); assert.equal(r.praguri[10].castigatoareTaiate, 1);
  aprox(r.praguri[10].dif, (-103 - 103 + 20) - (-230), 1e-9);
});

// ---------------- T212 · 3) regulile tale ----------------
await test("regulile tale: grupa cu destule trade-uri (>=30) care iese clar mai rau decat restul apare cu cifrele ei; sub 30 de trade-uri -> 'nu e destul'", () => {
  const ora = (h) => Date.UTC(2026, 5, 3, h - 3);   // ora Romaniei vara = UTC+3
  const l = [];
  for (let i = 0; i < 60; i++) l.push({ id: "n" + i, pornit: ora(17), inchis: ora(20), extCumparare: false, cost: 1000, rezultat: i % 3 === 0 ? -20 : 30, durataOre: 3 });
  for (let i = 0; i < 40; i++) l.push({ id: "e" + i, pornit: ora(2), inchis: ora(20), extCumparare: true, cost: 1000, rezultat: i % 3 === 0 ? 20 : -40, durataOre: 18 });
  const r = A.reguliPersonale(l, "Europe/Bucharest");
  assert.equal(r.suficient, true);
  const e = r.reguli.find((x) => /afara orelor|după 23|noaptea/i.test(x.text));
  assert.ok(e, JSON.stringify(r.reguli.map((x) => x.text))); assert.ok(e.total < 0); assert.match(e.text, /din \d+ pe plus/);
  assert.equal(A.reguliPersonale(l.slice(0, 20), "Europe/Bucharest").suficient, false);
});

// ---------------- T212 · 5) comisionul in poarta ----------------
await test("marimea pozitiei spune si comisionul dus-intors (0,30% din suma) si cat trebuie sa urce ca sa iesi pe zero", () => {
  const m = A.marime({ intrare: 100, stop: 95, cont: 30000 });
  aprox(m.comision, 6000 * 0.003, 1e-9); aprox(m.peZero, 0.003, 1e-12);
});

// ---------------- T212 · 6) dividendele ----------------
await test("dividendele: suma in moneda contului, pe actiune si in total, cea mai noua plata; randurile stricate se sar", () => {
  const d = T.dividende([{ ticker: "WDC_US_EQ", amount: 1.22, currency: "RON", paidOn: "2026-09-17T13:00:00Z" }, { ticker: "WDC_US_EQ", amount: 1.1, paidOn: "2026-06-17T13:00:00Z" }, { ticker: "MPC_US_EQ", amount: "2.5", paidOn: "2026-09-10T13:00:00Z" }, null, { ticker: "X", amount: "abc" }]);
  aprox(d.total, 4.82, 1e-9); assert.equal(d.n, 3); aprox(d.peActiune.WDC_US_EQ, 2.32, 1e-9); assert.equal(d.ultima, Date.parse("2026-09-17T13:00:00Z"));
});

// ---------------- T212 · 4) data rezultatelor ----------------
await test("data rezultatelor din raspunsul Nasdaq: 'estimated to report earnings on 10/20/2026' -> 2026-10-20; fara data -> null", () => {
  assert.deepEqual(T.dataRezultate({ data: { reportText: "Intuitive Surgical is estimated to report earnings on  10/20/2026. The upcoming…" } }), { data: "2026-10-20", sigur: false });
  assert.deepEqual(T.dataRezultate({ data: { reportText: "Marathon is expected* to report earnings on  11/03/2026" } }), { data: "2026-11-03", sigur: false });
  assert.deepEqual(T.dataRezultate({ data: { reportText: "X is scheduled to report earnings on 01/28/2027 after market close." } }), { data: "2027-01-28", sigur: true });
  assert.strictEqual(T.dataRezultate({ data: { reportText: "Our vendor, Zacks, hasn't provided us with the upcoming earnings report date." } }), null);
  assert.strictEqual(T.dataRezultate(null), null);
});

// ---------------- botul · 1) ritmul de recuperare ----------------
await test("ritmul de recuperare: pe minus cu grile peste costuri -> cate zile pana pe zero; grilele nu acopera costurile -> nu se recupereaza; pe plus -> nimic de recuperat", () => {
  const r = X.ritmRecuperare(-13.7, 2.08);
  aprox(r.zile, 13.7 / 2.08, 1e-9); assert.match(r.text, /zile/);
  assert.strictEqual(X.ritmRecuperare(-5, -0.2).zile, null); assert.match(X.ritmRecuperare(-5, -0.2).text, /nu/);
  assert.equal(X.ritmRecuperare(3, 1).zile, 0);
  assert.strictEqual(X.ritmRecuperare(null, 1), null); assert.strictEqual(X.ritmRecuperare(-3, null), null);
});
// ---------------- botul · 3) cat te costa setarea ----------------
await test("comisionul din fiecare umplere: 0,22% net pe grila -> comisionul (0,10% dus-intors) ia ~31%; 0,80% net -> ~11%", () => {
  aprox(X.comisionDinUmplere(0.0022), 0.001 / 0.0032, 1e-12); aprox(X.comisionDinUmplere(0.008), 0.001 / 0.009, 1e-12);
  assert.strictEqual(X.comisionDinUmplere(null), null);
});
// ---------------- botul · 2) alerta opritorului care urca ----------------
await test("opritorul STINS: sub 20% -> atentie, se repeta cel mult o data pe zi (nu la 3 ore); sub 10% -> CRITIC (urca); iese abia peste 23% (nu mai clipeste la 20%)", () => {
  const b = (dist) => ({ baza: "MET.PERP", opritorPierdere: "0.3", opritorPierdereActiv: false, distantaLichidarePct: dist });
  const t0 = Date.UTC(2026, 8, 25, 1);
  let r = AL.evalueaza(b(19.9), {}, {}, t0);
  const op = (x) => x.mesaje.filter((m) => m.cheie === "opritor");
  assert.equal(op(r).length, 1); assert.equal(op(r)[0].nivel, "atentie");
  let st = r.stare;
  r = AL.evalueaza(b(19.8), {}, st, t0 + 4 * 3600000); assert.equal(op(r).length, 0, "nu la 4 ore");
  r = AL.evalueaza(b(20.4), {}, r.stare, t0 + 5 * 3600000); r = AL.evalueaza(b(19.9), {}, r.stare, t0 + 6 * 3600000);
  assert.equal(op(r).length, 0, "20,4% nu e 'a trecut': histerezis pana la 23%");
  r = AL.evalueaza(b(9.5), {}, r.stare, t0 + 7 * 3600000); assert.equal(op(r).length, 1); assert.equal(op(r)[0].nivel, "critic"); assert.match(op(r)[0].titlu, /STINS/);
  r = AL.evalueaza(b(19.9), {}, {}, t0 + 30 * 3600000); st = r.stare;
  r = AL.evalueaza(b(19.9), {}, st, t0 + 55 * 3600000); assert.equal(op(r).length, 1, "dupa o zi se repeta");
});

await test("preturi nepotrivite (split / alt simbol): pretul Yahoo din ziua cumpararii difera cu peste 30% de al lui -> nu se judeca (nici stopul, nici 'daca ascultai'); FB -> META", () => {
  const b = bare([[40, 41, 39, 40], [40, 40, 30, 31], [31, 31, 30, 30], [30, 30, 29, 29], [29, 29, 28, 28]]);
  const t = { pornit: b[0].t + 3600000, inchis: b[4].t + 3600000, pretCumparare: 750 };
  assert.deepEqual(A.cuStop(t, b, [8, 10]), {}, "Meta la $750 vs 'FB' de azi la $40");
  const r = A.rezumatStop([{ id: "a", cost: 1000, rezultat: 10 }], { a: { stop: A.cuStop(t, b, [8]) } }, [8]); assert.equal(r.judecate, 0);
  // serverul poate intoarce {8:null,...} pentru un trade fara preturi: verdictul "fara-date" il scoate din socoteala
  assert.equal(A.rezumatStop([{ id: "a", cost: 1000, rezultat: 10 }], { a: { nivel: "fara-date", stop: { 8: null } } }, [8]).judecate, 0);
  assert.deepEqual(T.candidati("FB_US_EQ"), ["META", "FB"]);
});
// ---------------- v88 ----------------
await test("v88 simboluri europene: litera bursei T212 -> sufixul Yahoo (l .L, d .DE, p .PA, a .AS, s .SW, m .MI, _AT .VI, _CA .TO); cifra de la coada se incearca si fara", () => {
  assert.deepEqual(T.candidati("VUSAl_EQ"), ["VUSA.L"]); assert.deepEqual(T.candidati("SAPd_EQ"), ["SAP.DE"]); assert.deepEqual(T.candidati("MCp_EQ"), ["MC.PA"]);
  assert.deepEqual(T.candidati("ASMLa_EQ"), ["ASML.AS"]); assert.deepEqual(T.candidati("NOVNs_EQ"), ["NOVN.SW"]); assert.deepEqual(T.candidati("3MSTm_EQ"), ["3MST.MI"]);
  assert.deepEqual(T.candidati("PAL_AT_EQ"), ["PAL.VI"]); assert.deepEqual(T.candidati("WEED_CA_EQ"), ["WEED.TO"]);
  assert.deepEqual(T.candidati("8JO1d_EQ"), ["8JO1.DE", "8JO.DE"]);
  assert.deepEqual(T.candidati("AAPL_US_EQ"), ["AAPL"], "americanele raman cum erau"); assert.deepEqual(T.candidati("XYZq_EQ"), [], "litera necunoscuta -> nimic, nu ghicit");
});
await test("v88 stopul care URCA dupa maxim: maximul din zilele DE DINAINTE (nu al zilei in care atinge), iesire la stop sau la deschidere; planul Radarului = trailPct din niveluri la ora cumpararii", () => {
  const b = bare([[100, 101, 99, 100], [100, 120, 100, 118], [118, 119, 112, 113], [113, 114, 100, 101], [101, 102, 95, 96]]);
  const t = { pornit: b[0].t + 3600000, inchis: b[4].t + 3600000, pretCumparare: 100 };
  const r = A.cuStopUrcator(t, b, [{ cheie: "u10", pct: 10 }, { cheie: "u25", pct: 25 }]);
  // max dupa ziua 2 = 120 -> stop 108; ziua 3 minim 112 (nu), ziua 4 minim 100 <= 108 -> iesire la 108
  assert.equal(r.u10.zi, b[3].t); ((a, e) => assert.ok(Math.abs(a - e) < 1e-12, a + " vs " + e))(r.u10.pct, 1.08 - 1 - 0.003);
  assert.strictEqual(r.u25, null, "120 * 0,75 = 90 nu e atins");
  const p = A.cuStopUrcator(t, b, [{ cheie: "plan", trailPct: 5 }]); assert.equal(p.plan.zi, b[2].t, "-5% din 120 = 114; ziua 3 minim 112");
  assert.deepEqual(A.cuStopUrcator({ ...t, pretCumparare: 750 }, b, [{ cheie: "u10", pct: 10 }]), {}, "pret nepotrivit -> nu se judeca");
});
await test("v88 rezumatul pe alt camp (stopU) si pe chei text (plan, u15, u25)", () => {
  const tr = [{ id: "a", cost: 1000, rezultat: -300 }, { id: "b", cost: 1000, rezultat: 50 }];
  const cf = { a: { stopU: { plan: { pct: -0.05 }, u15: { pct: -0.153 } } }, b: { stopU: { plan: null, u15: { pct: 0.02 } } } };
  const r = A.rezumatStop(tr, cf, ["plan", "u15"], "stopU");
  assert.equal(r.judecate, 2); ((a, e) => assert.ok(Math.abs(a - e) < 1e-9, a + " vs " + e))(r.praguri.plan.total, -50 + 50); assert.equal(r.praguri.u15.castigatoareTaiate, 1);
});
await test("v88 stopul propus pentru pozitii: cel putin -15% de la maxim (pe trade-urile lui, -15% care urca a iesit +1.001 lei; cele mai stranse, mai rau)", () => {
  const b = []; for (let i = 0; i < 300; i++) { const c = 100 * Math.pow(1.002, i) * (1 + 0.004 * Math.sin(i)); b.push({ t: Date.UTC(2025, 0, 1) + i * ZI, o: c, h: c * 1.01, l: c * 0.99, c }); }
  const p = b.at(-1).c, mx = p * 1.05;
  const n = A.niveluri(b, p, { pretMediu: p * 0.9, maxDupaCumparare: mx, minTrail: 0.15 });
  ((a, e) => assert.ok(Math.abs(a - e) < 1e-9, a + " vs " + e))(n.trailPct, 15); ((a, e) => assert.ok(Math.abs(a - e) < 1e-6, a + " vs " + e))(n.stopPozitie, mx * 0.85);
  const fara = A.niveluri(b, p, { pretMediu: p * 0.9, maxDupaCumparare: mx });
  assert.ok(fara.trailPct < 15, "fara minTrail ramane cel din ATR: " + fara.trailPct);
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
