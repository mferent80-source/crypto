// Proba v100.358 (18.11, auditul jurnalului de acțiuni, fila „Acțiuni · Trading 212”):
//  A. „în afara orelor” = ora EXECUȚIEI față de ședința regulată a bursei acțiunii (CalendarBursa), nu permisiunea extendedHours de pe ordin;
//     cumpărate și vândute separat; câmpurile vechi (extCumparare / extVanzare / r.ext) rămân pentru cine le citește.
//  B. sfatul de stop doar dacă varianta cea mai bună trece proba: pe plus fără cel mai mare câștig adus de stop ȘI cea mai bună în ≥ 80%
//     din reeșantionările pe zile (mulberry32, sămânță fixă ⇒ același răspuns).
//  C. grupa decisă de un singur trade (> 50%) ⇒ „din care X lei un singur trade (SIMBOL)”; „minus-20” = descriere, nu cost.
//  D. ecranul: KPI-ul, eticheta pe trade, ora României, o zecimală, blocul stopului.
// Node pur: modulele din public/lib în vm (ca proba v100.196), pagina T212 în vm cu un DOM de jucărie. Iese 0 la succes, cu „N/N”.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nv100.358 · jurnalul de acțiuni (Trading 212) · proba\n");

function context(extra) {
  const c = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0 }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
const LIB = ["grid-calcul.js", "t212.js", "calendar-bursa.js", "actiuni-semnale.js"];   // ordinea din index.html (t212.js înaintea calendarului)
const c = context(); for (const f of LIB) vm.runInContext(citeste("public", "lib", f), c);
const AS = c.ActiuniSemnale, T = c.T212, CB = c.CalendarBursa;
const fara = context(); vm.runInContext(citeste("public", "lib", "t212.js"), fara);   // fără calendar (colectorul, unde CalendarBursa nu e global)

// noiembrie 2026: New York pe EST (UTC−5) ⇒ 15:00 NY = 20:00 UTC; marți 17.11 e zi de bursă
const ny = (zi, hh, mm) => Date.parse(zi + "T" + String(hh + 5).padStart(2, "0") + ":" + String(mm || 0).padStart(2, "0") + ":00Z");
const ZI = 86400000;

await test("A1. ora execuției: 15:00 NY în ședință, 19:00 NY afară, sâmbătă afară, Thanksgiving afară", () => {
  assert.equal(T.afaraOrelor(ny("2026-11-17", 15), "AAPL_US_EQ"), false, "15:00 NY marți");
  assert.equal(T.afaraOrelor(ny("2026-11-17", 19), "AAPL_US_EQ"), true, "19:00 NY marți (după închidere)");
  assert.equal(T.afaraOrelor(ny("2026-11-14", 15), "AAPL_US_EQ"), true, "sâmbătă 14.11");
  assert.equal(CB.sarbatori(2026, "NYSE")["2026-11-26"], true, "Thanksgiving 2026 în calendar");
  assert.equal(T.afaraOrelor(ny("2026-11-26", 15), "AAPL_US_EQ"), true, "Thanksgiving 26.11");
});

await test("A2. marginile ședinței: 9:29 afară, 9:30 în, 15:59 în, 16:00 afară; ziua scurtă de după Thanksgiving se închide la 13:00", () => {
  assert.equal(T.afaraOrelor(ny("2026-11-17", 9, 29), "NVDA_US_EQ"), true);
  assert.equal(T.afaraOrelor(ny("2026-11-17", 9, 30), "NVDA_US_EQ"), false);
  assert.equal(T.afaraOrelor(ny("2026-11-17", 15, 59), "NVDA_US_EQ"), false);
  assert.equal(T.afaraOrelor(ny("2026-11-17", 16, 0), "NVDA_US_EQ"), true);
  assert.equal(T.afaraOrelor(ny("2026-11-27", 12), "NVDA_US_EQ"), false, "27.11 la 12:00");
  assert.equal(T.afaraOrelor(ny("2026-11-27", 14), "NVDA_US_EQ"), true, "27.11 la 14:00 (zi scurtă)");
});

await test("A3. bursa acțiunii, nu New York: Londra (VUSAl_EQ) la 10:00 în, la 17:00 afară", () => {
  assert.equal(T.afaraOrelor(Date.parse("2026-11-17T10:00:00Z"), "VUSAl_EQ"), false);
  assert.equal(T.afaraOrelor(Date.parse("2026-11-17T17:00:00Z"), "VUSAl_EQ"), true);
});

await test("A3b. Xetra (SAPd_EQ): 08:30 UTC (09:30 Berlin) în ședință, 16:45 UTC (17:45) afară; fără calendar ⇒ null", () => {
  assert.equal(T.afaraOrelor(Date.parse("2026-11-17T08:30:00Z"), "SAPd_EQ"), false);
  assert.equal(T.afaraOrelor(Date.parse("2026-11-17T16:45:00Z"), "SAPd_EQ"), true);
  assert.equal(fara.T212.afaraOrelor(ny("2026-11-17", 19), "AAPL_US_EQ"), null);
});

// umplerile (forma din istoricul T212, după T212.umpleri): ext = permisiunea de pe ordin
const u = (id, side, t, o) => Object.assign({ id, t, side, ticker: "AAPL_US_EQ", simbol: "AAPL", nume: "Apple", qty: 1, pret: 100, net: 450, fee: 0.7, moneda: "RON", fx: 0.22, ext: true, realizat: null }, o || {});
const UMPLERI = [
  u("b1", "BUY", ny("2026-11-10", 15), { ext: true }),                 // permis afară, executat ÎN ședință
  u("s1", "SELL", ny("2026-11-12", 15), { ext: true, net: 470, realizat: 20 }),    // vândută în ședință, deși ext
  u("b2", "BUY", ny("2026-11-12", 18), { ext: false }),                // cumpărată chiar afară (18:00 NY)
  u("s2", "SELL", ny("2026-11-13", 19), { ext: true, net: 430, realizat: -20 }),   // vândută chiar afară (19:00 NY)
];

await test("A4. perechi: afaraVanzare / afaraCumparare după ora execuției; extVanzare / extCumparare rămân permisiunea", () => {
  const p = T.perechi(UMPLERI), a = p.inchise.find((x) => x.id === "s1"), b = p.inchise.find((x) => x.id === "s2");
  assert.equal(a.extVanzare, true); assert.equal(a.afaraVanzare, false); assert.equal(a.extCumparare, true); assert.equal(a.afaraCumparare, false);
  assert.equal(b.extVanzare, true); assert.equal(b.afaraVanzare, true); assert.equal(b.extCumparare, false); assert.equal(b.afaraCumparare, true);
  const pf = fara.T212.perechi(UMPLERI);
  assert.ok(pf.inchise.every((x) => x.afaraVanzare === null && x.afaraCumparare === null), "fără calendar câmpurile noi sunt null");
  assert.equal(pf.inchise.find((x) => x.id === "s1").extVanzare, true, "câmpul vechi rămâne și fără calendar");
});

await test("A5. rezumatJurnal: r.afara numără doar execuțiile chiar afară, separat; r.ext (permisiunea, cumpărare SAU vânzare) neschimbat", () => {
  const p = T.perechi(UMPLERI), r = AS.rezumatJurnal(p.inchise, { umpleri: UMPLERI });
  assert.equal(r.ext.n, 2, "permisiunea: ambele trade-uri au ext");
  assert.equal(r.afara.vandute.n, 1); assert.equal(Math.round(r.afara.vandute.total), Math.round(p.inchise.find((x) => x.id === "s2").rezultat));
  assert.equal(r.afara.cumparate.n, 1); assert.equal(r.afara.nestiut, 0);
  // trade-uri vechi, fără câmpurile noi (formele din probele vechi) ⇒ socotite din pornit / inchis
  const vechi = [{ id: "v", ticker: "AAPL_US_EQ", pornit: ny("2026-11-10", 15), inchis: ny("2026-11-13", 19), rezultat: -5, pct: -0.01, cost: 500, extVanzare: false }];
  const rv = AS.rezumatJurnal(vechi, {});
  assert.equal(rv.afara.vandute.n, 1); assert.equal(rv.afara.cumparate.n, 0); assert.equal(rv.ext.n, 0);
});

await test("C1. unSingurTrade: −8.165 din −10.196 ⇒ notă; grupa uniformă sau un singur trade ⇒ fără notă; semnul contează", () => {
  const g = [{ rezultat: -8165, simbol: "ASTS" }, { rezultat: -1200, simbol: "X" }, { rezultat: -831, simbol: "Y" }];
  const m = AS.unSingurTrade(g); assert.ok(m); assert.equal(m.simbol, "ASTS"); assert.equal(m.lei, -8165);
  assert.equal(AS.unSingurTrade([{ rezultat: -100 }, { rezultat: -120 }, { rezultat: -90 }]), null);
  assert.equal(AS.unSingurTrade([{ rezultat: -8165, simbol: "ASTS" }]), null, "un singur trade în grupă");
  assert.equal(AS.unSingurTrade([{ rezultat: 900, simbol: "Z" }, { rezultat: -100 }, { rezultat: -50 }]).simbol, "Z", "grupa pe plus, decisă de câștigul mare");
});

await test("C2. „minus-20” marcată descriere (definită prin rezultat), restul nu", () => {
  const l = [{ id: "a", ticker: "AAPL_US_EQ", pornit: ny("2026-11-10", 15), inchis: ny("2026-11-13", 15), rezultat: -300, rezultatOficial: -290, pct: -0.3, cost: 1000 },
    { id: "b", ticker: "AAPL_US_EQ", pornit: ny("2026-11-10", 15), inchis: ny("2026-11-13", 15), rezultat: -5, rezultatOficial: 2, pct: -0.005, cost: 1000 }];
  const r = AS.rezumatJurnal(l, {}), m20 = r.greseli.find((x) => x.cod === "minus-20"), com = r.greseli.find((x) => x.cod === "comision-a-mancat");
  assert.equal(m20.descriere, true); assert.equal(com.descriere, false);
});

// ---- B. sfatul de stop ----
const V = [{ camp: "stop", k: 8 }, { camp: "stop", k: 10 }, { camp: "stop", k: 15 }, { camp: "stopU", k: "plan" }, { camp: "stopU", k: "u15" }, { camp: "stopU", k: "u25" }];
// n trade-uri pe zile diferite de bursă; f(i) = { varianta: pct cu stop | null } ⇒ cf ca în colector
function jurnal(n, f) {
  const l = [], cf = {}; let t = ny("2026-03-02", 10);
  for (let i = 0; i < n; i++) {
    while (!CB.eZiDeBursa(new Date(t).toISOString().slice(0, 10), "NYSE")) t += ZI;
    const id = "t" + i, x = f(i);
    l.push({ id, ticker: "S" + (i % 7) + "_US_EQ", simbol: "S" + (i % 7), pornit: t, inchis: t + 5 * ZI, cost: 1000, rezultat: x.rez, pct: x.rez / 1000 });
    cf[id] = { nivel: "cumpara", stop: { 8: x[8] ?? null, 10: x[10] ?? null, 15: x[15] ?? null }, stopU: { plan: x.plan ?? null, u15: x.u15 ?? null, u25: x.u25 ?? null } };
    t += ZI;
  }
  return { l, cf };
}
const pc = (p) => ({ pct: p });

await test("B1. un trade uriaș: varianta „câștigă” doar prin el ⇒ nu trece; facStop / sfatStop fără „Aș folosi / Aș pune stopul”, cu trade-ul numit", () => {
  // 80 de trade-uri: u15 taie fiecare la −0,2% (pierde 2 lei față de rezultat +0), iar pe unul taie o cădere de −80% la −15% (+650 lei)
  const { l, cf } = jurnal(80, (i) => i === 40 ? { rez: -800, u15: pc(-0.15) } : { rez: 0, u15: pc(-0.002) });
  const rob = AS.robustetStop(l, cf, V), b = rob.variante[rob.best];
  assert.equal(rob.best, 4, "u15 e cea mai bună după rezultat"); assert.ok(b.dif > 0, "dif " + b.dif);
  assert.ok(b.faraMare < 0, "fără trade-ul mare iese pe minus: " + b.faraMare); assert.equal(b.mare.simbol, "S5");
  assert.equal(rob.trece, false);
  const fs1 = AS.facStop(false, { et: "urcă, −15% de la maxim", dif: b.dif, taiate: 0 }, rob);
  assert.doesNotMatch(fs1.fac, /Aș folosi stopul/); assert.match(fs1.nota, /^Nicio variantă de stop nu iese clar mai bună/); assert.match(fs1.nota, /S5/);
  assert.match(fs1.nota, /\+650,0 lei/, "o zecimală și virgulă: " + fs1.nota);
  const ss = AS.sfatStop(true, { et: "urcă, −15% de la maxim", dif: b.dif }, rob);
  assert.doesNotMatch(ss.fac, /Aș pune stopul/); assert.match(ss.nota, /Nicio variantă/);
  assert.ok(fs1.fac.length <= 110 && fs1.nota.length <= 160 && ss.fac.length <= 110, "lungimile gărzii");
});

await test("B2. un avantaj uniform (+10 lei pe fiecare trade, pe toate zilele) ⇒ trece, iar sfatul apare", () => {
  const { l, cf } = jurnal(80, (i) => ({ rez: i % 2 ? -50 : 30, u15: pc((i % 2 ? -50 : 30) / 1000 + 0.01), u25: pc((i % 2 ? -50 : 30) / 1000 + (i % 3 ? 0.004 : -0.004)) }));
  const rob = AS.robustetStop(l, cf, V), b = rob.variante[rob.best];
  assert.equal(rob.best, 4); assert.ok(b.faraMare > 0); assert.ok(rob.pBest >= 0.8, "pBest " + rob.pBest); assert.equal(rob.trece, true);
  assert.match(AS.facStop(false, { et: "urcă, −15% de la maxim", dif: b.dif, taiate: 3 }, rob).fac, /^Aș folosi stopul „urcă, −15% de la maxim”/);
  assert.match(AS.sfatStop(true, { et: "urcă, −15% de la maxim", dif: b.dif }, rob).fac, /^Aș pune stopul/);
});

await test("B3. determinism: aceeași intrare ⇒ același pBest (sămânța fixă); fără rob ⇒ textele de dinainte; niciun stop pe plus ⇒ „N-aș pune un stop strâns”", () => {
  const { l, cf } = jurnal(60, (i) => ({ rez: (i % 5) * 7 - 12, u15: pc(((i % 5) * 7 - 12) / 1000 + (i % 4 ? 0.003 : -0.006)), 8: pc(-0.08) }));
  const a = AS.robustetStop(l, cf, V), b = AS.robustetStop(l, cf, V);
  assert.equal(a.pBest, b.pBest); assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.match(AS.facStop(false, { et: "x", dif: 10, taiate: 1 }).fac, /^Aș folosi stopul/, "fără rob: ca înainte (garda veche)");
  const negativ = jurnal(30, () => ({ rez: 10, 8: pc(-0.08) })), rn = AS.robustetStop(negativ.l, negativ.cf, V);
  assert.equal(rn.trece, false); assert.equal(rn.pBest, null);
  assert.match(AS.facStop(true, null, rn).fac, /^N-aș pune un stop strâns/);
});

// ---- D. ecranul ----
await test("D1. ecranul: KPI-ul vândute / cumpărate după ora execuției, eticheta doar pe vânzarea chiar afară, ora României, o zecimală, sfatul stopului fără „Aș folosi”", () => {
  const box = { hidden: false, innerHTML: "" };
  const e = context({ escapeHtml: (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), localStorage: { getItem() { return null; }, setItem() {} }, $: (id) => (id === "jtActiuni" ? box : null) });
  for (const f of LIB) vm.runInContext(citeste("public", "lib", f), e);
  vm.runInContext(citeste("public", "lib", "t212-ecran.js"), e);
  e.t212Cireasa = () => ""; e.t212ReguliBloc = () => ""; e.t212DeclaratieBloc = () => "";
  // jurnalul: UMPLERI (2 trade-uri) + 80 de trade-uri cu un câștig uriaș adus de stop (B1), toate în același istoric
  const { l: lB, cf } = jurnal(80, (i) => i === 40 ? { rez: -800, u15: pc(-0.15) } : { rez: 0, u15: pc(-0.002) });
  const p = T.perechi(UMPLERI);
  const inchise = p.inchise.concat(lB.map((t) => Object.assign({ rezultatOficial: t.rezultat, comisioane: 0, qty: 1, pretCumparare: 100, pretVanzare: 100, durataOre: 120, extVanzare: true, afaraVanzare: false, afaraCumparare: false }, t)));
  e.T212.perechi = () => ({ inchise });
  e.t212.istoric = { umpleri: UMPLERI, stare: { complet: true, ordine: 4 } }; e.t212.cf = cf;
  e.jtFiltru = "actiuni"; e.t212JurnalCache = { n: -1, v: null };
  e.jtRenderActiuni();
  const h = box.innerHTML, kpi = h.slice(h.indexOf("Vândute în afara orelor"), h.indexOf("Vândute în afara orelor") + 600);
  assert.match(kpi, /1 trade · vânzarea executată în afara ședinței bursei/, kpi);
  assert.match(kpi, /Cumpărate în afara orelor: 1 trade, /);
  assert.equal((h.match(/vândut în afara orelor/g) || []).length, 1, "eticheta doar pe vânzarea de la 19:00 NY (82 de trade-uri cu ext)");
  // 13.11.2026 19:00 NY = 14.11 02:00 la București (fără timeZone ieșea ora mașinii)
  assert.match(h, /14\.11\.26,? 02:00/, "ora României pe vânzarea de la 19:00 NY");
  assert.match(h, /Câștigat REAL<\/span><b class="tbKpiVal [a-z]*">[−+]?[\d.]+,\d lei/, "rezultatul mare cu o zecimală");
  assert.match(h, /Nicio variantă de stop nu iese clar mai bună/); assert.doesNotMatch(h, /Aș folosi stopul|Aș pune stopul/);
  assert.match(h, /Fără cel mai mare câștig adus de stop/); assert.match(h, /Proba sfatului pentru „urcă, −15% de la maxim”/);
  assert.match(h, /din care −800,0 lei un singur trade, S5; fără el [−+]?\d[\d.]*,\d lei/, "„Cât ai ținut”: grupa 1–7 zile decisă de un trade");
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}\n`);
process.exit(picate ? 1 : 0);
