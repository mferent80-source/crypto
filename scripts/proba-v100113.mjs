// Proba v100.113 / colector v101.76 (06.10, el: „1. amândouă — în Tablou probabilități despre bot sau stock, în pagina din meniu tot ce
// poate 2. îi numeri tu 3. pune 4. fă explicit, așa aflu dacă am un comportament greșit — pentru boți și pentru stock”).
// Planul: docs/superpowers/plans/2026-10-06-riscul-botilor-si-actiunilor.md · etapa 1: RiscLuna (pur)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const exista = (...p) => fs.existsSync(path.join(RAD, ...p));
vm.runInThisContext(citeste("public", "lib", "t212.js"), { filename: "t212.js" });
if (exista("public", "lib", "risc-luna.js")) vm.runInThisContext(citeste("public", "lib", "risc-luna.js"), { filename: "risc-luna.js" });
const RL = globalThis.RiscLuna || {};
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.113 · riscul boților și al acțiunilor · proba\n");

const ZI = 864e5, ORA = 36e5, T0 = Date.UTC(2026, 9, 6, 12, 0);
// un bot din arhivă (forma Pionex compactată, ca /api/istoric-bot?action=botiInchisi)
const B = (o) => { const p = Object.assign({ m: "AAA", t: T0 - 10 * ZI, ore: 2, r: 0.01, inv: 50, lev: 3, tip: "futures_grid", dir: "long", stop: 0, extra: 0, jos: 1, sus: 1.2, init: 1.1, fee: -0.05 }, o);
  return { strategyId: String(Math.random()).slice(2), base: p.m + ".PERP", buOrderType: p.tip, createTime: p.t, closeTime: p.t + p.ore * ORA,
    buOrderData: { totalRealizedProfit: String(p.r * p.inv), gridProfit: String(Math.max(0, p.r * p.inv) + 0.1), totalFee: String(p.fee), totalFundingFee: "-0.01", usdtInvestment: String(p.inv), leverage: String(p.lev), trend: p.dir,
      bottom: String(p.jos), top: String(p.sus), initPrice: String(p.init), closedPrice: String(p.init * (1 + p.r)), lossStop: String(p.stop), extraMargin: String(p.extra) } }; };

await test("(1a) bazinBoti: doar futures_grid, de la data dată, cu sumă; r = profit realizat / sumă; levierul maxim opțional", () => {
  const b = [B({ r: 0.02 }), B({ tip: "spot_grid" }), B({ t: Date.UTC(2025, 11, 20), ore: 1 }), B({ lev: 50 }), B({ inv: 0 })];
  const z = RL.bazinBoti(b, { de: Date.UTC(2026, 0, 1) });
  assert.equal(z.length, 2); assert.ok(Math.abs(z[0].r - 0.02) < 1e-12); assert.equal(z[0].m, "AAA"); assert.equal(z[0].ore, 2);
  assert.equal(RL.bazinBoti(b, { de: Date.UTC(2026, 0, 1), levMax: 5 }).length, 1);
});
await test("(1b) ritm: câți boți ai pornit în ultimele 30 de zile și suma lor tipică (mediana); fără boți recenți ⇒ ultimii 20", () => {
  const z = RL.bazinBoti([B({ t: T0 - 5 * ZI, inv: 40 }), B({ t: T0 - 6 * ZI, inv: 50 }), B({ t: T0 - 7 * ZI, inv: 60 }), B({ t: T0 - 60 * ZI, inv: 500 })], { de: 0 });
  assert.deepEqual(RL.ritm(z, T0), { K: 3, S: 50, n30: 3 });
  const vechi = RL.ritm(RL.bazinBoti([B({ t: T0 - 90 * ZI, inv: 30 }), B({ t: T0 - 80 * ZI, inv: 70 })], { de: 0 }), T0);
  assert.equal(vechi.K, 1); assert.equal(vechi.S, 50); assert.equal(vechi.n30, 0);
});
await test("(1c) monteCarlo: luni de K rezultate trase din ferestre reale de 30 de zile; determinist; cifrele știute pe date știute", () => {
  const plus = Array.from({ length: 60 }, (_, i) => ({ t: T0 - i * ZI, r: 0.01 }));
  const m = RL.monteCarlo(plus, { K: 10, S: 10, n: 2000, seed: 1 });
  assert.ok(Math.abs(m.med - 1) < 1e-9 && Math.abs(m.p5 - 1) < 1e-9); assert.equal(m.pMinus, 0); assert.equal(m.legat, true);
  const amestec = Array.from({ length: 200 }, (_, i) => ({ t: T0 - (i % 100) * ZI, r: i % 2 ? 0.1 : -0.1 }));
  const a = RL.monteCarlo(amestec, { K: 30, S: 10, n: 4000, seed: 2 }), b = RL.monteCarlo(amestec, { K: 30, S: 10, n: 4000, seed: 2 });
  assert.deepEqual(a, b, "aceeași sămânță ⇒ același rezultat"); assert.ok(a.p5 < a.med && a.med < a.p95 && a.p1 <= a.p5); assert.ok(a.pMinus > 0.3 && a.pMinus < 0.7);
  assert.equal(a.hist.h.reduce((s, x) => s + x, 0) > 3900, true); assert.equal(a.hist.h.length, 28);
  const putine = RL.monteCarlo(Array.from({ length: 8 }, (_, i) => ({ t: T0 - i * 40 * ZI, r: 0.02 })), { K: 5, S: 10, n: 500, seed: 3 });
  assert.equal(putine.legat, false, "fără ferestre cu destui boți ⇒ trage din tot bazinul și spune asta");
});
await test("(1d) supravietuire: din cele care au AJUNS la X ore / zile, câte pe plus, câte cu pierdere mare, media", () => {
  const l = [{ ore: 0.5, r: 0.01 }, { ore: 2, r: 0.02 }, { ore: 30, r: -0.08 }, { ore: 80, r: 0.03 }, { ore: 100, r: -0.2 }];
  const s = RL.supravietuire(l, [1, 24, 72], "ore");
  assert.deepEqual(s.map((x) => x.n), [4, 3, 2]); assert.equal(s[1].pePlus, 1 / 3); assert.equal(s[1].mari, 2 / 3); assert.ok(Math.abs(s[2].medie - (-0.085)) < 1e-12);
  assert.equal(RL.pragulAtins(s, 30).h, 24); assert.equal(RL.pragulAtins(s, 0.2), null);
});
// obiceiurile, pe date construite: stopul ajută clar, pe 40 de monede, în ambele jumătăți de timp
const obiceiuri = () => { const l = []; for (let i = 0; i < 40; i++) for (const ian of [true, false]) { const t = ian ? Date.UTC(2026, 1, 1) + i * ORA : Date.UTC(2026, 7, 1) + i * ORA; l.push(B({ m: "M" + i, t, stop: 0.9, r: 0.02 }), B({ m: "M" + i, t: t + 10 * ORA, stop: 0, r: -0.03 })); } return l; };
await test("(1e) comportamentBoti: lista închisă de obiceiuri, verdict după regula fixată (IC fără 0 + ambele jumătăți); prea puțini ⇒ spus", () => {
  const r = RL.comportamentBoti(obiceiuri(), { de: Date.UTC(2026, 0, 1), S: 40, reps: 400, seed: 4 });
  assert.deepEqual(r.map((x) => x.k), ["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "O9"]);
  const o1 = r[0]; assert.equal(o1.nume, "Stop pus"); assert.equal(o1.stare, "dovedit-bun"); assert.ok(o1.medieCu > o1.medieFara); assert.ok(o1.ic[0] > 0);
  assert.equal(r.find((x) => x.k === "O7").stare, "prea puțini");
  assert.equal(r.find((x) => x.k === "O9").stare, "prea puțini", "niciun short");
});
// T212: umplerile (forma /api/t212?action=istoric)
const U = (id, t, side, tk, qty, pret) => ({ id: String(id), t, side, ticker: tk + "_US_EQ", simbol: tk, nume: tk, qty, pret, net: qty * pret, fee: 0, moneda: "RON", fx: 1, ext: false, realizat: null });
await test("(1f) episoade: de la prima cumpărare până la zero; „ai cumpărat mai jos pe minus” (A1), suma mărită după pierdere (A2), scurt (A3); cele deschise, separat", () => {
  const u = [U(1, T0 - 40 * ZI, "BUY", "AAA", 10, 10), U(2, T0 - 38 * ZI, "BUY", "AAA", 10, 8), U(3, T0 - 30 * ZI, "SELL", "AAA", 20, 8.5),
    U(4, T0 - 20 * ZI, "BUY", "BBB", 30, 10), U(5, T0 - 18 * ZI, "SELL", "BBB", 30, 11), U(6, T0 - 3 * ZI, "BUY", "CCC", 5, 20), U(7, T0 - 2 * ZI, "BUY", "CCC", 5, 18)];
  const e = RL.episoade(u);
  assert.equal(e.inchise.length, 2); const a = e.inchise[0], b = e.inchise[1];
  assert.equal(a.simbol, "AAA"); assert.equal(a.A1, true); assert.equal(a.pus, 180); assert.equal(a.rez, -10); assert.ok(Math.abs(a.pct + 10 / 180) < 1e-12); assert.equal(a.A3, false);
  assert.equal(b.A2, true, "300 ≥ 1,5 × 180 după AAA pe minus"); assert.equal(b.A3, true); assert.equal(b.A1, false);
  assert.equal(e.deschise.length, 1); assert.equal(e.deschise[0].simbol, "CCC"); assert.equal(e.deschise[0].A1, true); assert.equal(e.deschise[0].start, T0 - 3 * ZI);
});
await test("(1g) comportamentActiuni: medierea pe minus dovedit rea pe date construite (40 de acțiuni, ambele jumătăți)", () => {
  const ep = []; for (let i = 0; i < 40; i++) for (const t of [Date.UTC(2026, 0, 10) + i * ZI, Date.UTC(2026, 6, 10) + i * ZI]) { ep.push({ ticker: "T" + i, start: t - 2 * ZI, final: t, pus: 100, rez: -8, pct: -0.08, A1: true, A2: false, A3: true }, { ticker: "T" + i, start: t, final: t + ZI, pus: 100, rez: 2, pct: 0.02, A1: false, A2: false, A3: true }); }
  const r = RL.comportamentActiuni(ep, { reps: 400, seed: 5 });
  assert.equal(r[0].k, "A1"); assert.equal(r[0].stare, "dovedit-rau"); assert.equal(r[0].nume, "Ai cumpărat mai jos pe o poziție pe minus");
  assert.equal(r.find((x) => x.k === "A3").stare, "prea puține");
});
await test("(1h) corelatie: aceeași mișcare ⇒ 1, invers ⇒ −1; doar orele comune, bare închise", () => {
  const s = (f) => Array.from({ length: 60 }, (_, i) => ({ t: i * ORA, c: f(i) }));
  const c = RL.corelatie({ A: s((i) => 100 + Math.sin(i)), B: s((i) => 50 + 0.5 * Math.sin(i)), C: s((i) => 100 - Math.sin(i)) });
  assert.deepEqual(c.monede, ["A", "B", "C"]); assert.ok(c.M[0][1] > 0.99); assert.ok(c.M[0][2] < -0.99); assert.equal(c.bare, 58, "ultima oră (în formare) iese");
  assert.deepEqual(RL.perechiCorelate(c, 0.5).map((p) => p.a + "-" + p.b), ["A-B"]);
});
await test("(1i) textele: probabilitatea botului după cât stă deja, a poziției, luna proastă la ritmul tău — o zecimală, „de” de la 20, minus −", () => {
  const sb = [{ h: 1, n: 1100, pePlus: 0.66, mari: 0.11, medie: -0.004 }, { h: 24, n: 76, pePlus: 0.58, mari: 0.29, medie: -0.124 }];
  assert.equal(RL.textBot(sb, 26.4), "Din boții tăi care au ajuns la 24 h (76), 58% au ieșit pe plus și 29% au pierdut peste 5% (media −12,4%).");
  assert.equal(RL.textBot(sb, 0.3), null);
  const sa = [{ h: 5, n: 227, pePlus: 0.45, mari: 0.26, medie: -0.0333 }];
  assert.equal(RL.textActiune(sa, 12, false), "Din pozițiile tale ținute peste 5 zile (227), 45% s-au încheiat pe plus și 26% cu o pierdere de peste 5% (media −3,3%).");
  assert.equal(RL.textMediere({ k: "A1", stare: "dovedit-rau", cu: 65, mariCu: 0.323, mariFara: 0.092 }), "Ai cumpărat mai jos pe ea cât era pe minus: la tine, pozițiile mediate așa s-au încheiat cu pierdere de peste 5% în 32% din cazuri, față de 9% (dovedit pe 65 de episoade). Mediezi doar ce scade deja, deci o parte din diferență ar fi venit oricum.");
  assert.equal(RL.textLuna({ K: 30, S: 43.72, p5: -56.04, pMinus: 0.51, legat: true }, "USDT"), "Luna proastă la ritmul tău (30 de boți în 30 de zile, ~43,7 USDT fiecare): −56,0 USDT; o lună din două iese pe minus.");
  assert.equal(RL.textLuna({ K: 16, S: 5174.985, p5: -4267.4, pMinus: 0.41 }, "lei", ["poziție", "poziții"]), "Luna proastă la ritmul tău (16 poziții în 30 de zile, ~5.175,0 lei fiecare): −4.267,4 lei; luna iese pe minus în 41% din simulări.");
});
await test("(1j) generatorul aleator nu se repetă (lecția Busolei din 04.10: LCG-ul pe numere zecimale avea perioada ~10.000) - mulberry32, ca Asemanatoare", () => {
  const g = RL.generator(558), v = new Set(); let s = 0; for (let i = 0; i < 50000; i++) { const x = g(); v.add(x); s += x; }
  assert.ok(v.size >= 49900, "valori diferite: " + v.size); assert.ok(Math.abs(s / 50000 - 0.5) < 0.01);
  assert.match(citeste("public", "lib", "risc-luna.js"), /Math\.imul/); assert.doesNotMatch(citeste("public", "lib", "risc-luna.js"), /1103515245/);
});
// ---------------- etapa 2: serverul și colectorul ----------------
function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })) }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp, brut) => { const mod = await import(`../functions/api/istoric-bot.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.4." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp || brut) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/istoric-bot?${qs}`, { method: metoda, headers: h, body: brut || (corp ? JSON.stringify(corp) : undefined) }), env }); return { status: res.status, d: await res.json() }; };
await test("(2a) ruta risc: colectorul scrie raportul, paginile îl citesc; fără „la” sau prea mare ⇒ refuzat", async () => {
  assert.deepEqual((await cheama("GET", "action=risc")).d, { risc: null });
  const r = { la: T0, versiune: 1, boti: { n: 3 } };
  assert.equal((await cheama("POST", "action=risc", { risc: r })).status, 200);
  assert.deepEqual((await cheama("GET", "action=risc")).d, { risc: r });
  assert.equal((await cheama("POST", "action=risc", { risc: { boti: {} } })).status, 400);
  assert.equal((await cheama("POST", "action=risc", null, JSON.stringify({ risc: { la: T0, x: "a".repeat(300000) } }))).status, 413);
});
await test("(2b) raportul primește tranzacțiile T212 gata făcute (în colector T212 nu e global) și dă ritmul, Monte Carlo, supraviețuirea, obiceiurile", () => {
  const boti = []; for (let i = 0; i < 60; i++) boti.push(B({ m: "M" + (i % 12), t: T0 - (i + 1) * 12 * ORA, ore: 1 + (i % 30), r: i % 4 ? 0.01 : -0.06 }));
  const u = [U(1, T0 - 40 * ZI, "BUY", "AAA", 10, 10), U(2, T0 - 30 * ZI, "SELL", "AAA", 10, 11)];
  const r = RL.raport({ boti, umpleri: u, perechi: T212.perechi(u), acum: T0, reps: 200, n: 500 });
  assert.equal(r.boti.ritm.K, 60); assert.ok(r.boti.mc.length >= 3 && r.boti.mc[0].K === 60); assert.equal(r.boti.supravietuire[0].h, 1); assert.equal(r.boti.comportament.length, 9);
  assert.equal(r.actiuni.desc.tranzactii, 1); assert.equal(r.actiuni.comportament.length, 3); assert.ok(JSON.stringify(r).length < 100000);
});
await test("(2c) colectorul: tura riscului o dată pe zi, după cazuri; arhiva + istoricul T212 (doar cu cheile T212); ziua se scrie după trimiterea reușită", () => {
  const col = citeste("scripts", "colector.mjs"), f = col.slice(col.indexOf("async function turaRisc("), col.indexOf("\n}\n", col.indexOf("async function turaRisc(")));
  assert.match(col, /const RiscLuna = incarca\("risc-luna\.js", "RiscLuna"\);/);
  assert.match(f, /profilStare\.riscZi === zi/); assert.match(f, /await botiInchisiToti\(\)/); assert.match(f, /\/api\/t212\?action=istoric/); assert.match(f, /RiscLuna\.raport\(\{ boti, umpleri, perechi: T212\.perechi\(umpleri\)/);
  assert.match(f, /await trimite\("\/api\/istoric-bot\?action=risc", \{ risc \}\);\s*profilStare\.riscZi = zi;/);
  assert.match(col, /turaCazuri\(\)\)\.then\(\(\) => turaRisc\(\)\)/);
});
// ---------------- etapa 3: pagina din meniu ----------------
const A1 = { k: "A1", nume: "Ai cumpărat mai jos pe o poziție pe minus", cu: 65, fara: 768, medieCu: -0.0389, medieFara: -0.002, mariCu: 0.323, mariFara: 0.092, stare: "dovedit-rau", banCu: -9006, banFara: 13450 };
await test("(3a) textObicei: verdictul spus explicit, cu cifrele și cu limita de cauză unde e cazul", () => {
  assert.equal(RL.textObicei(A1, "actiuni"), "Obicei rău, dovedit: media −3,9% față de −0,2%, pierderi de peste 5% în 32% din cazuri față de 9% (65 de episoade cu, 768 fără). Mediezi doar ce scade deja, deci o parte din diferență ar fi venit oricum.");
  assert.equal(RL.textObicei({ k: "O1", cu: 397, fara: 1338, medieCu: 0.0009, medieFara: -0.0068, mariCu: 0.154, mariFara: 0.109, stare: "nedovedit" }, "boti"), "Nedovedit: media +0,1% față de −0,7%, pierderi de peste 5% în 15% din cazuri față de 11% (397 de boți cu, 1338 fără); diferența poate fi întâmplare.");
  assert.equal(RL.textObicei({ k: "O7", cu: 28, fara: 1707, stare: "prea puțini" }, "boti"), "Prea puține cazuri ca să judec (28 de boți cu, 1707 fără).");
});
const RAPORT = () => ({ la: T0, boti: { n: 1735, ritm: { K: 159, S: 161.19, n30: 159 }, mc: [{ K: 159, S: 161.19, med: -75.4, p5: -751.3, p1: -1185, p95: 300, pMinus: 0.63, legat: true, hist: { lo: -900, hi: 400, w: 1300 / 28, h: Array(28).fill(10) } }],
  supravietuire: [{ h: 1, n: 692, pePlus: 0.66, mari: 0.14, medie: -0.016 }, { h: 24, n: 76, pePlus: 0.57, mari: 0.29, medie: -0.126 }],
  desc: { n: 1735, pePlus: 0.61, bani: { grile: 4287, comisioane: -2388, funding: -177, realizat: -2520 }, comisioaneLaS: -1400, grileLaS: 2500, realizatLaS: -1500, coada: { prag: -0.049, n: 174, laS: -5555, restLaS: 4139, monede: [["BEAT", -560]] },
    durate: [{ de: 0, pana: 0.25, n: 635, medie: 0.0014, pePlus: 0.53, laS: 150, comisionLaS: -600 }, { de: 0.25, pana: 1, n: 408, medie: 0.004, laS: 250, comisionLaS: -240 }, { de: 1, pana: 4, n: 317, medie: 0.001, laS: 60, comisionLaS: -170 }, { de: 4, pana: 24, n: 299, medie: -0.007, laS: -330, comisionLaS: -270 }, { de: 24, pana: 72, n: 46, medie: -0.0825, laS: -610, comisionLaS: -90 }, { de: 72, pana: null, n: 30, medie: -0.19, laS: -930, comisionLaS: -30 }],
    luni: [], dist: { b: [], h: [], s: [] } }, comportament: [] },
  actiuni: { n: 833, ritm: { K: 16, S: 5175, n30: 16 }, mc: [{ K: 16, S: 5175, med: 467, p5: -4267, p1: -6662, p95: 3000, pMinus: 0.41, legat: true, hist: { lo: -7000, hi: 5000, w: 12000 / 28, h: Array(28).fill(5) } }], supravietuire: [],
    desc: { tranzactii: 1070, comisioane: 6367, rezultat: 4659, oficial: 11026, mari: { n: 92, lei: -24422, restLei: 28866 }, durate: [], maiRele: [] }, comportament: [A1] } });
await test("(3b) concluziile: ce înseamnă pentru tine și ce aș face eu - din cifre, nimic scris de mână", () => {
  const c = RL.concluzii(RAPORT());
  const b = c.boti.map((x) => x.titlu), a = c.actiuni.map((x) => x.titlu);
  assert.deepEqual(b, ["Câțiva boți cu pierderi mari șterg câștigul celorlalți", "Boții ținuți peste o zi pierd", "Comisioanele iau 56% din câștigul grilelor", "Niciun obicei al boților nu e dovedit, nici bun, nici rău"]);
  assert.match(c.boti[0].text, /^Cei mai răi 10% \(174 de boți, fiecare sub −4,9%\) au pierdut 5\.555 USDT la suma ta de acum \(~161,2 USDT pe bot\), iar ceilalți 90% au câștigat 4\.139\.$/);
  assert.match(c.boti[1].text, /^Cei ținuți peste 24 h \(76\) au adus −1\.540 USDT, cei sub 4 h \(1360\) \+460\. /);
  assert.match(c.boti[2].text, /^Grilele au adus \+4\.287 USDT, comisioanele −2\.388 \(bani reali\)\. 635 de boți au stat sub 15 minute\.$/);
  assert.ok(c.boti.every((x) => !x.faCe || /^Aș /.test(x.faCe)), "„ce aș face eu” la persoana I");
  assert.deepEqual(a, ["Cumperi mai jos pe pozițiile pe minus", "Comisioanele de conversie îți iau o mare parte din câștig", "Câteva poziții mari pe minus șterg câștigul celorlalte"]);
  assert.match(c.actiuni[1].text, /^Ai plătit 6\.367 lei comision de conversie; rezultatul real e \+4\.659 lei \(T212 afișează \+11\.026, fără comisioane\)\.$/);
  for (const x of c.boti.concat(c.actiuni)) assert.ok((x.titlu + (x.text || "") + (x.faCe || "")).length && !/NaN|undefined|null/.test(x.titlu + x.text + (x.faCe || "")), x.titlu);
});
await test("(3c) pagina din meniu: „Monte Carlo · riscul tău” - pagina nouă sus, vechiul Monte Carlo pe semnale pliat (nimic pierdut); modulele în pagină și în cache", () => {
  const html = citeste("public", "index.html"), sw = citeste("public", "sw.js"), app = citeste("public", "app.js");
  const i = html.indexOf('<section class="panel" id="montecarlo">'), sec = html.slice(i, html.indexOf("</section>", i));
  assert.ok(sec.indexOf('id="rlPagina"') > 0 && sec.indexOf('id="rlPagina"') < sec.indexOf('<details class="rlVechi"'));
  for (const id of ["mcRuns", "mcTrades", "mcSource", "mcMethod", "mcBlock", "mcMedian", "mcP5", "mcP95", "mcDd", "mcLossProb", "mcNote"]) assert.ok(sec.includes('id="' + id + '"'), id);
  assert.match(html, /data-nav="montecarlo"><span class="sideIcon">∴<\/span>Monte Carlo · riscul tău</);
  assert.ok(html.indexOf('src="/lib/risc-luna.js"') > 0 && html.indexOf('src="/lib/risc-ecran.js"') > html.indexOf('src="/lib/risc-luna.js"') && html.indexOf('src="/lib/risc-ecran.js"') < html.indexOf('src="/app.js'));
  assert.match(sw, /"\/lib\/risc-luna\.js","\/lib\/risc-ecran\.js"/);
  assert.match(app, /if\(id==="montecarlo"\)\{if\(typeof rlPorneste==="function"\)rlPorneste\(false\)\}/);
});
await test("(3d) pagina desenată (fără browser): boții și acțiunile, alegerea ritmului, histograma, obiceiurile, concluziile; fără raport ⇒ spune de ce", () => {
  const ctx = { RiscLuna: RL, TextRo: globalThis.TextRo }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "risc-ecran.js"), ctx);
  const h = ctx.rlHtml(RAPORT(), { kBoti: 159, kAct: 16 });
  for (const s of ["Boții tăi", "Acțiunile tale", "Luna proastă la ritmul tău (159 de boți în 30 de zile", "Câțiva boți cu pierderi mari", "Cumperi mai jos pe pozițiile pe minus", "Obicei rău, dovedit", "<svg", "data-action-click=\"rlAlegeK('boti',159)\""]) assert.ok(h.includes(s), s);
  assert.doesNotMatch(h, /NaN|undefined/, (h.match(/.{0,80}(NaN|undefined).{0,40}/) || [])[0]);
  assert.match(ctx.rlHtml(null, {}), /Raportul se face o dată pe noapte/);
});
await test("(3e) fără raport sau cu cererea picată: NU buclă de cereri (cartela din Tablou cere raportul, raportul redesenează cartela) - o cerere pe minut", async () => {
  let cereri = 0;
  const ctx = { RiscLuna: RL, TextRo: globalThis.TextRo, getJSON: async () => { cereri++; throw new Error("pică"); }, Date };
  vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "risc-ecran.js"), ctx);
  vm.runInContext("function tbRiscDeseneaza(){ rlPorneste(false); }", ctx);   // ca în Tablou: cartela cere raportul când lipsește
  await ctx.rlPorneste(false); await new Promise((r) => setTimeout(r, 50));
  assert.equal(cereri, 1, "o singură cerere, nu buclă"); await ctx.rlPorneste(false); assert.equal(cereri, 1, "a doua chemare imediată nu cere din nou");
  const app = citeste("public", "app.js"), f = app.slice(app.indexOf("async function tbRiscAduCor("), app.indexOf("\nfunction ", app.indexOf("async function tbRiscAduCor(")));
  assert.match(f, /tbRiscCor\.inLucru=true;tbRiscCor\.cheie=cheie;tbRiscCor\.la=Date\.now\(\);/, "corelația: încercarea se notează înainte de cereri (altfel eroarea ar relua la nesfârșit)");
});
// ---------------- etapa 4 și 5: Tabloul și T212 ----------------
await test("(4a) textTotiBotii: banii din boți, pierderea dacă se ating toate stopurile, cel mai aproape de lichidare; boții fără stop spuși", () => {
  assert.equal(RL.textTotiBotii([{ nume: "ZAMA", investit: 44.94, laStop: -2.53, lichPct: 35.07 }]), "Toți boții deodată (1): 44,9 USDT în ei; dacă se ating toate stopurile pierzi −2,5 USDT (6% din bani); cel mai aproape de lichidare: ZAMA, la 35,1%.");
  assert.equal(RL.textTotiBotii([{ nume: "A", investit: 50, laStop: -3, lichPct: 20 }, { nume: "B", investit: 40, laStop: null, lichPct: 12.5 }]), "Toți boții deodată (2): 90,0 USDT în ei; dacă se ating toate stopurile pierzi −3,0 USDT (3% din bani), iar 1 bot n-are stop (pierderea lui nu are margine); cel mai aproape de lichidare: B, la 12,5%.");
  assert.equal(RL.textTotiBotii([]), null);
});
await test("(4b) textCorelatie: perechile care se mișcă împreună (≥ 0,5) sau cea mai mare corelație; un singur bot ⇒ spus", () => {
  assert.equal(RL.textCorelatie({ monede: ["ZAMA"], M: [[1]], bare: 499 }), "Un singur bot: nimic de corelat.");
  assert.equal(RL.textCorelatie({ monede: ["ZAMA", "NIL", "TAKE"], M: [[1, 0.11, 0.01], [0.11, 1, 0.09], [0.01, 0.09, 1]], bare: 499 }), "Monedele boților nu se mișcă împreună: cea mai mare corelație e 0,11 (ZAMA–NIL), pe lumânările de 1 h din ultimele 21 de zile.");
  assert.equal(RL.textCorelatie({ monede: ["HYPE", "AAVE", "CRV"], M: [[1, 0.39, 0.43], [0.39, 1, 0.53], [0.43, 0.53, 1]], bare: 499 }), "Se mișcă împreună: AAVE–CRV 0,53 - pentru risc sunt ca un singur bot mai mare.");
});
await test("(4c) Tabloul: cartela „Riscul tău” după probabilitățile din istoric; raportul de noapte + toți boții + corelația (lumânări 1 h, la 30 min)", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js");
  assert.ok(html.indexOf('id="tbPl-risc"') > html.indexOf('id="tbPl-prob"') && html.indexOf('id="tbPl-risc"') < html.indexOf('id="tbPl-plan"')); assert.match(html, /<div id="tbRisc">/);
  const f = app.slice(app.indexOf("function tbRiscDeseneaza("), app.indexOf("\nfunction ", app.indexOf("function tbRiscDeseneaza(") + 10));
  assert.match(f, /RiscLuna\.textBot\(rp\.boti\.supravietuire,/); assert.match(f, /RiscLuna\.textLuna\(rp\.boti\.mc\[0\],"USDT"\)/); assert.match(f, /RiscLuna\.textTotiBotii\(/); assert.match(f, /RiscLuna\.textCorelatie\(/); assert.match(f, /rlPorneste\(false\)/);
  assert.match(app, /function tbRiscAduCor\(/); assert.match(app.slice(app.indexOf("function tbRiscAduCor("), app.indexOf("\nfunction ", app.indexOf("function tbRiscAduCor(") + 10)), /interval=60M&limit=500/);
  assert.match(app, /function tbDeseneazaTabloulUnic\(\)\{[^\n]*tbRiscDeseneaza\(\)/);
});
await test("(5a) T212: sub graficul poziției, probabilitățile după cât o ții deja + avertismentul dovedit dacă ai mediat pe minus", () => {
  const e = citeste("public", "lib", "t212-ecran.js"), f = e.slice(e.indexOf("function t212RiscHtml("), e.indexOf("\nfunction ", e.indexOf("function t212RiscHtml(") + 10));
  assert.match(f, /RiscLuna\.episoade\(/); assert.match(f, /RiscLuna\.textActiune\(rp\.actiuni\.supravietuire,/); assert.match(f, /RiscLuna\.textMediere\(/); assert.match(f, /rlPorneste\(false\)/);
  assert.match(e, /'<div class="t212TfCit">' \+ t212TfCitHtml\(d\.semafor\) \+ '<\/div>' \+ t212RiscHtml\(p\);/);
});
// ---------------- revizia Opus (06.10) ----------------
await test("(R1) regula: dovedit = IC 99% fără 0 + ambele jumătăți; „la limită” = doar IC 95%; pe date AMESTECATE la întâmplare aproape niciodată „dovedit”", () => {
  const amest = (s) => { const g = RL.generator(s), ep = []; for (let i = 0; i < 40; i++) for (const t of [Date.UTC(2026, 0, 10) + i * ZI, Date.UTC(2026, 6, 10) + i * ZI]) for (let j = 0; j < 2; j++) ep.push({ ticker: "T" + i, start: t - ZI, final: t + j * ORA, pus: 100, pct: (g() - 0.5) * 0.2, A1: g() < 0.3, A2: g() < 0.3, A3: g() < 0.5 }); return ep.map((e) => Object.assign(e, { rez: e.pct * 100 })); };
  let dov = 0, lim = 0; for (let s = 1; s <= 40; s++) for (const r of RL.comportamentActiuni(amest(s), { reps: 400, seed: s })) { if (/^dovedit/.test(r.stare)) dov++; if (/^la-limita/.test(r.stare)) lim++; }
  assert.ok(dov <= 2, "pe 120 de obiceiuri fără niciun efect: „dovedit” de " + dov + " ori"); assert.ok(lim + dov <= 14, "„la limită” + „dovedit”: " + (lim + dov));
  const r = RL.comportamentActiuni((() => { const ep = []; for (let i = 0; i < 40; i++) for (const t of [Date.UTC(2026, 0, 10) + i * ZI, Date.UTC(2026, 6, 10) + i * ZI]) { ep.push({ ticker: "T" + i, start: t - 2 * ZI, final: t, pus: 100, rez: -8, pct: -0.08, A1: true, A2: false, A3: true }, { ticker: "T" + i, start: t, final: t + ZI, pus: 100, rez: 2, pct: 0.02, A1: false, A2: false, A3: true }); } return ep; })(), { reps: 400, seed: 5 });
  assert.equal(r[0].stare, "dovedit-rau", "efectul clar rămâne dovedit"); assert.ok(r[0].ic99, "IC 99% în rând");
  assert.match(RL.textObicei(Object.assign({}, A1, { stare: "la-limita-rau" }), "actiuni"), /^La limită \(semn de obicei rău, încă nesigur\): media −3,9%/);
});
await test("(R2) O7 nu se uită în viitor: „după o pierdere” = ultimul bot ÎNCHIS înainte de pornire, nu ultimul pornit", () => {
  const l = [B({ m: "A", t: T0 - 10 * ZI, ore: 100, r: -0.2, inv: 50 }), B({ m: "B", t: T0 - 9 * ZI, ore: 1, r: 0.02, inv: 100 })];
  const z = RL.comportamentBoti(l, { de: 0, reps: 50 }); assert.equal(z.find((x) => x.k === "O7").cu, 0, "botul A era încă deschis (pierderea nu se știa)");
  const l2 = [B({ m: "A", t: T0 - 10 * ZI, ore: 1, r: -0.2, inv: 50 }), B({ m: "B", t: T0 - 9 * ZI, ore: 1, r: 0.02, inv: 100 })];
  assert.equal(RL.comportamentBoti(l2, { de: 0, reps: 50 }).find((x) => x.k === "O7").cu, 1);
});
await test("(R3) T212: vânzarea și cumpărarea la aceeași oră - întâi cumpărarea (PLTR, 05.11.2025: nu mai rămâne o „poziție deschisă” inventată)", () => {
  const u = [U(1, T0 - 40 * ZI, "BUY", "PLTR", 1, 100), U(3, T0 - 30 * ZI, "SELL", "PLTR", 1, 110), U(2, T0 - 30 * ZI, "BUY", "PLTR", 1.4, 105), U(4, T0 - 20 * ZI, "SELL", "PLTR", 1.4, 106)];
  const e = RL.episoade(u); assert.equal(e.deschise.length, 0); assert.equal(e.inchise.length, 1);
});
await test("(R4) ritmul la acțiuni numără și pozițiile deschise pornite în 30 de zile (altfel luna proastă iese prea blândă)", () => {
  const u = [U(1, T0 - 20 * ZI, "BUY", "AAA", 10, 10), U(2, T0 - 10 * ZI, "SELL", "AAA", 10, 11), U(3, T0 - 5 * ZI, "BUY", "BBB", 10, 10), U(4, T0 - 3 * ZI, "BUY", "CCC", 10, 10)];
  const r = RL.raport({ boti: [], umpleri: u, perechi: T212.perechi(u), acum: T0, reps: 50, n: 200 });
  assert.equal(r.actiuni.ritm.K, 3); assert.equal(r.actiuni.ritm.n30, 3);
});
await test("(R5) titlul comisioanelor și cifrele de sub el - aceeași bază (bani reali)", () => {
  const rp = RAPORT(); rp.boti.desc.comisioaneLaS = -1725; rp.boti.desc.grileLaS = 2500;   // la „suma de acum” ar da 69%
  const c = RL.concluzii(rp).boti.find((x) => /^Comisioanele/.test(x.titlu)); assert.equal(c.titlu, "Comisioanele iau 56% din câștigul grilelor");
});
await test("(R6) toți boții: stopul pe plus nu e „pierzi”; stopul pus dar nesocotit e spus separat de „fără stop”", () => {
  assert.equal(RL.textTotiBotii([{ nume: "A", investit: 50, laStop: 1.2, lichPct: 30 }]), "Toți boții deodată (1): 50,0 USDT în ei; dacă se ating toate stopurile ieși cu +1,2 USDT; cel mai aproape de lichidare: A, la 30,0%.");
  assert.equal(RL.textTotiBotii([{ nume: "A", investit: 50, laStop: -3, lichPct: 30 }, { nume: "B", investit: 50, laStop: null, areStop: true, lichPct: 20 }]), "Toți boții deodată (2): 100,0 USDT în ei; dacă se ating toate stopurile pierzi −3,0 USDT (3% din bani), iar la 1 bot stopul nu se poate socoti acum; cel mai aproape de lichidare: B, la 20,0%.");
});
await test("(R7) corelația: doi boți pe aceeași monedă = un singur pariu; lista schimbată ⇒ nu se arată corelația veche", () => {
  assert.equal(RL.textCorelatie({ monede: ["ZAMA"], M: [[1]], bare: 0 }, [{ m: "ZAMA", n: 2 }]), "2 boți pe aceeași monedă (ZAMA): pentru risc sunt un singur pariu mai mare.");
  const app = citeste("public", "app.js"), f = app.slice(app.indexOf("async function tbRiscAduCor("), app.indexOf("\nfunction ", app.indexOf("async function tbRiscAduCor(")));
  assert.match(f, /if\(tbRiscCor\.cheie!==cheie\)tbRiscCor\.c=null;/); assert.match(f, /try\{var k=await getJSON/, "o monedă care pică nu le oprește pe celelalte");
});
await test("(R8) colectorul nu trimite un raport ciuntit: arhiva sau istoricul T212 picate ⇒ reîncerc peste o oră, ziua nemarcată", () => {
  const col = citeste("scripts", "colector.mjs"), f = col.slice(col.indexOf("async function turaRisc("), col.indexOf("\n}\n", col.indexOf("async function turaRisc(")));
  assert.match(f, /throw new Error\("arhiva boților n-a venit"\)/); assert.match(f, /throw new Error\("istoricul T212 n-a venit"\)/);
});
await test("(R9) monteCarlo pe listă goală ⇒ null (nu excepție); raportul fără boți cu levier ≤ 5 nu cade", () => {
  assert.equal(RL.monteCarlo([], { K: 5, S: 10 }), null);
  const r = RL.raport({ boti: [B({ lev: 20, t: T0 - 5 * ZI })], umpleri: [], acum: T0, reps: 50, n: 200 }); assert.deepEqual(r.boti.mc, []);
});
await test("(R10) textele: „pierdut 5.555” fără minus dublu, „1 din 20 ≈ o dată la 20 de luni”, mii la USDT, 0,25 h cu virgulă, alt ritm decât al tău spus ca atare, mediere cu limita de cauză", () => {
  const c = RL.concluzii(RAPORT()); assert.match(c.boti[0].text, /au pierdut 5\.555 USDT/);
  assert.equal(RL.textLuna({ K: 60, S: 43.72, p5: -94.8, pMinus: 0.58 }, "USDT", null, false), "Luna proastă cu 60 de boți pe lună (~43,7 USDT fiecare): −94,8 USDT; luna iese pe minus în 58% din simulări.");
  assert.match(RL.textMediere(A1), /\. Mediezi doar ce scade deja, deci o parte din diferență ar fi venit oricum\.$/);
  assert.equal(RL.textMediere(Object.assign({}, A1, { stare: "nedovedit" })), null, "fără avertisment când nu e măcar la limită");
  const ctx = { RiscLuna: RL, TextRo: globalThis.TextRo }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "risc-ecran.js"), ctx);
  const h = ctx.rlHtml(RAPORT(), { kBoti: 159, kAct: 16 }); assert.match(h, /0–0,25 h/); assert.match(h, /cam o dată la 20 de luni/); assert.doesNotMatch(h, /un an și jumătate/); assert.match(h, /Bani rulați într-o lună/);
});
await test("(E) versiunea v100.113 / colector v101.76", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.113"/); assert.match(html, /id="antetVersiune">v100\.113/); assert.match(html, /id="healthAppVersion">v100\.113</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.113.0"); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-113";/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.76";/);
  const sc = JSON.parse(citeste("package.json")).scripts; assert.equal(sc["test:v100113"], "node scripts/proba-v100113.mjs"); assert.match(sc.test, /npm run test:v100113/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
