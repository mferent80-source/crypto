// Proba v100.343 („fă tot”, 14.11.2026): cele cinci idei propuse la livrarea v100.342.
//   I-883 / I-886  G2, pe date nevăzute: „merită gridul, în medie?” (M) și tăietura după volum a rețetei (V) - logica, regulile, textul paginii
//   I-884  Tabloul fără bot: candidații o singură dată (banda „Pe ce aș porni”), Consilierul trimite la ea; detaliile lui trec în bandă
//   I-885  banda contului de pe Tablou se reîmprospătează singură, la 5 minute, cât pagina e la vedere
//   I-887  perpetuele noi care nu sunt crypto (acțiuni tokenizate, metale) ies din clasament; regula de formă le prinde pe cele viitoare
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { incarcaLib, taie } from "./lib/motor-pagina.mjs";
import { turaClasament } from "./lib/tura-clasament.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.343 · ideile I-883..I-887 · proba\n");
const APP = citeste("public", "app.js"), T212 = citeste("public", "lib", "t212-ecran.js"), COL = citeste("scripts", "colector.mjs");
const fnApp = (nume) => { const s = taie(APP, nume); assert.ok(s, "nu găsesc funcția " + nume + " în app.js"); return s; }, fnT = (nume) => { const s = taie(T212, nume); assert.ok(s, "nu găsesc funcția " + nume + " în t212-ecran.js"); return s; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ---------------- I-887: ce nu e crypto ----------------
await test("(I-887) perpetuele listate după 30.09 care nu sunt crypto ies din lista monedelor: acțiunile tokenizate cu X, cele fără X verificate după nume, metalele; monedele adevărate (și cele cu X) rămân", () => {
  const G = incarcaLib(["text-ro.js", "grid-calcul.js"], "GridCalcul");
  for (const s of ["3SOXXX", "EWZX", "GMEX", "PENGX", "SKHX", "TTWOX", "URNMX", "CF", "SKHY", "SMSN", "XPD", "XPT"]) { assert.equal(G.eCrypto(s + "_USDT_PERP"), false, s + " nu e monedă"); assert.equal(G.eCrypto(s), false); }
  for (const s of ["AAPLX", "XAU", "NATGAS", "OPENAI"]) assert.equal(G.eCrypto(s + "_USDT_PERP"), false, "cele știute rămân scoase: " + s);
  for (const s of ["BTC", "ETH", "AAVE", "BNB", "QNT", "TAO", "ZEC", "AVAX", "GMX", "TRX", "SNX", "STX", "IMX", "DYDX"]) assert.equal(G.eCrypto(s + "_USDT_PERP"), true, s + " e monedă");
});
await test("(I-887) regula de formă: din lista simbolurilor Pionex, baza terminată în X cu prețul la 2 zecimale e acțiune tokenizată - afară de monedele știute cu X și de ce e deja în listă; odată învățată, moneda iese din eCrypto", () => {
  const G = incarcaLib(["text-ro.js", "grid-calcul.js"], "GridCalcul");
  const lista = [{ symbol: "FOOX_USDT_PERP", quotePrecision: 2 }, { symbol: "BARX_USDT_PERP", quotePrecision: 4 }, { symbol: "AVAX_USDT_PERP", quotePrecision: 2 }, { symbol: "AAPLX_USDT_PERP", quotePrecision: 2 },
    { symbol: "BAZ_USDT_PERP", quotePrecision: 2 }, { symbol: "QUXX_BTC_PERP", quotePrecision: 2 }, { symbol: "zetx_usdt_perp", quotePrecision: "2" }, null, { symbol: "FOOX_USDT_PERP", quotePrecision: 2 }];
  assert.deepEqual(Array.from(G.nuCryptoDupaForma(lista)), ["FOOX", "ZETX"], "doar cele noi, o dată fiecare, în ordine");
  assert.deepEqual(Array.from(G.nuCryptoDupaForma(null)), []); assert.equal(G.eCrypto("FOOX_USDT_PERP"), true, "până nu e învățată rămâne monedă");
  assert.deepEqual(Array.from(G.invataNuCrypto(["FOOX", "AVAX", "zetx_usdt_perp", ""])), ["FOOX", "ZETX"], "moneda știută cu X nu se învață niciodată ca acțiune");
  assert.equal(G.eCrypto("FOOX_USDT_PERP"), false); assert.equal(G.eCrypto("ZETX"), false); assert.equal(G.eCrypto("AVAX_USDT_PERP"), true);
  assert.deepEqual(Array.from(G.invataNuCrypto(["FOOX"])), [], "a doua oară nu mai e nouă"); assert.deepEqual(Array.from(G.nuCryptoDupaForma(lista)), []);
});
await test("(I-887) tura de clasament a colectorului citește lista simbolurilor, scoate acțiunile noi după formă ÎNAINTE de alegerea după volum și o spune o singură dată în jurnal; fără listă merge ca înainte", async () => {
  const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js"], "({ G: GridCalcul, GC: GridClasament })"), jurnal = [];
  const tickers = [{ symbol: "BTC_USDT_PERP", amount: "900", close: "1" }, { symbol: "NOUX_USDT_PERP", amount: "800", close: "1" }, { symbol: "ETH_USDT_PERP", amount: "700", close: "1" }, { symbol: "AVAX_USDT_PERP", amount: "600", close: "1" }];
  const d = { cere: async (c) => (/pionex_tickers/.test(c) ? { data: { tickers } } : { data: { klines: [] } }), trimite: async () => ({ ok: true }), jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, GridCalcul: L.G, GridClasament: L.GC, top: 3, pauzaMs: 0,
    simboluriPerp: async () => [{ symbol: "NOUX_USDT_PERP", quotePrecision: 2 }, { symbol: "AVAX_USDT_PERP", quotePrecision: 3 }, { symbol: "BTC_USDT_PERP", quotePrecision: 1 }] };
  const r = await turaClasament(d), nume = r.monede.map((m) => m.simbol);
  assert.deepEqual(nume, ["BTC_USDT_PERP", "ETH_USDT_PERP", "AVAX_USDT_PERP"], "acțiunea nouă nu ocupă un loc din primele după volum");
  assert.equal(jurnal.filter((x) => /simboluri noi cu formă de acțiune/.test(x) && /NOUX/.test(x)).length, 1, "spus în jurnal: " + jurnal.join(" | "));
  await turaClasament(d); assert.equal(jurnal.filter((x) => /simboluri noi cu formă de acțiune/.test(x)).length, 1, "a doua tură nu mai repetă");
  // fără lista simbolurilor (probele vechi) și cu lista picată: tura merge, doar spune eroarea
  const L2 = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js"], "({ G: GridCalcul, GC: GridClasament })"), j2 = [];
  const r2 = await turaClasament(Object.assign({}, d, { GridCalcul: L2.G, GridClasament: L2.GC, simboluriPerp: undefined, jurnal: (...a) => j2.push(a.join(" ")) })); assert.deepEqual(r2.monede.map((m) => m.simbol), ["BTC_USDT_PERP", "NOUX_USDT_PERP", "ETH_USDT_PERP"]);
  const r3 = await turaClasament(Object.assign({}, d, { GridCalcul: L2.G, GridClasament: L2.GC, simboluriPerp: async () => { throw new Error("Pionex a refuzat"); }, jurnal: (...a) => j2.push(a.join(" ")) })); assert.equal(r3.monede.length, 3); assert.ok(j2.some((x) => /lista simbolurilor/.test(x) && /Pionex a refuzat/.test(x)));
  assert.match(COL, /const VERSIUNE_COLECTOR = "v101\.(1(?:8[1-9]|9\d)|[2-9]\d\d)";/);   /* v100.344: de la v101.181 în sus */ assert.match(COL, /simboluriPerp: simboluriPerpLista,/, "colectorul dă turei lista simbolurilor");
});

// ---------------- I-885: banda contului se reîmprospătează ----------------
await test("(I-885) banda contului de pe Tablou: cu contul deja adus, aducerea se reia la 5 minute cât Tabloul e la vedere și fila e în față; ascuns sau pe altă pagină nu cere nimic; cât contul lipsește rămâne frâna de un minut", () => {
  let ceas = Date.UTC(2026, 10, 14, 18, 0), render = 0, asigura = 0, vizibil = true; class Ceas extends Date { static now() { return ceas; } }
  const ctx = vm.createContext({ Date: Ceas, document: { hidden: false }, contTot: { inLucru: false }, t212: { cont: {}, istoric: {} }, contTotRender: () => { render++; }, contTotAsigura: () => { asigura++; }, tbPanouVizibil: () => vizibil });
  vm.runInContext(fnApp("tbContTot"), ctx);
  ctx.tbContTot(); assert.equal(render, 1); assert.equal(asigura, 1, "prima dată, la deschidere (nu se știe cât de vechi e contul adus de altă pagină)");
  ceas += 4 * 60000; ctx.tbContTot(); assert.equal(asigura, 1, "sub 5 minute nu se mai cere"); ceas += 61000; ctx.tbContTot(); assert.equal(asigura, 2, "la 5 minute se reia"); assert.equal(render, 3);
  ceas += 6 * 60000; ctx.document.hidden = true; ctx.tbContTot(); assert.equal(asigura, 2, "fila ascunsă nu cere"); ctx.document.hidden = false; vizibil = false; ctx.tbContTot(); assert.equal(asigura, 2, "pe altă pagină nu cere");
  vizibil = true; ctx.tbContTot(); assert.equal(asigura, 3);
  ceas += 6 * 60000; ctx.contTot.inLucru = true; ctx.tbContTot(); assert.equal(asigura, 3, "o aducere în curs nu se dublează"); ctx.contTot.inLucru = false;
  // contul lipsește: frâna de un minut, ca în v100.342, oricum ar sta pagina
  ctx.t212.cont = null; ctx.tbContTot(); assert.equal(asigura, 4); ceas += 20000; ctx.tbContTot(); assert.equal(asigura, 4); ceas += 41000; ctx.tbContTot(); assert.equal(asigura, 5);
});

// ---------------- I-884: candidații o singură dată ----------------
await test("(I-884) Tabloul fără bot: cartela Consilierului nu mai repetă lista de candidați - trimite într-un rând la banda „Pe ce aș porni” și la Scan; „ultimul bot închis” și „vremea pieței” rămân", () => {
  const el = { innerHTML: "" }, G3 = [{ s: "AAA", grile: 58, pas: 0.003, traversari: 34.4, ch7: -2.7 }, { s: "BBB", grile: 39, pas: 0.003, traversari: 22.3, ch7: 3.1 }];
  const cu = (nu) => { const ctx = vm.createContext({ console, Date, Math, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), argActiune: (s) => String(s), tbStare: { citireGoala: false },
      tbPreg: { la: Date.now(), inLucru: false, fisa: { nivel: "info", titlu: "🔍 XYZ închis: +1,0 USDT", mesaj: "De ce: ținta." }, vreme: { eticheta: "🟡 PRUDENT", titlu: "piața e amestecată", faCe: "Aș porni doar grid neutru." }, grid: G3 },
      tbPregatireAdu: () => {}, acAziNu: () => (nu ? { nu: true, motiv: "piața e în MIȘCARE" } : null), acAziNuHtml: () => "<p>Azi nu: piața e în MIȘCARE.</p>" });
    vm.runInContext(fnApp("tbPregatire"), ctx); ctx.tbPregatire(el); return el.innerHTML; };
  const h = cu(false), t = text(h);
  assert.doesNotMatch(h, /tbPregMon/, "rândurile de candidați nu se mai desenează aici"); assert.doesNotMatch(t, /AAA|BBB|treceri\/zi/);
  assert.match(t, /Pe ce aș porni/); assert.match(t, /Lista e o singură dată, în „Pe ce aș porni un bot acum”, mai sus pe pagină/); assert.match(h, /data-action-click="navTo\('scan',true\)"/, "un clic până la toți candidații din Scan");
  assert.match(t, /Ultimul bot închis/); assert.match(t, /Vremea pieței/); assert.match(t, /Ce aș face eu: Aș porni doar grid neutru\./);
  const n = text(cu(true)); assert.match(n, /azi nu pornesc/); assert.match(n, /în „Candidatele pentru un bot”, mai sus pe pagină/, "numele benzii e cel pe care îl poartă ea în ziua aceea");
  // fără candidați aduși încă, blocul nu apare deloc (ca înainte)
  const ctx0 = vm.createContext({ console, Date, Math, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), tbStare: { citireGoala: false }, tbPreg: { la: Date.now(), inLucru: false, fisa: null, vreme: { eticheta: "x", titlu: "y", faCe: "" }, grid: null }, tbPregatireAdu: () => {} });
  vm.runInContext(fnApp("tbPregatire"), ctx0); ctx0.tbPregatire(el); assert.doesNotMatch(text(el.innerHTML), /Lista e o singură dată/);
});
await test("(I-884) banda „Pe ce aș porni” poartă acum și detaliile care erau doar în cartela Consilierului: câte grile, pasul, mișcarea pe 7 zile (din Scan, când e adusă); restul rândului e neschimbat", () => {
  const box = { innerHTML: "", _contH: null }, R = [{ moneda: "AAA", simbol: "AAA_USDT_PERP", latime: 0.092, profitGrila: 0.0026, traversariZi: 17.2, grile: 58, pas: 0.003, istoric: null }, { moneda: "BBB", simbol: "BBB_USDT_PERP", latime: 0.15, profitGrila: 0.0026, traversariZi: 9, grile: null, pas: null, istoric: null }];
  const ctx = vm.createContext({ console, Date, Math, TextRo: globalThis.TextRo, escapeHtml: (s) => String(s), $: (id) => (id === "tbIdei" ? box : null), Idei: { ideiBoti: () => R }, contTot: { clasament: { la: Date.UTC(2026, 10, 14, 20, 0), monede: [] }, inchise: [] },
    acAziNu: () => null, acAziNuHtml: () => "", tbIngustAdu: () => {}, tbIstoricBoti: () => "fără istoric pe monedă", tbIstoricRosu: () => false, tbUrmAdu: () => {}, tbUrm: { v: null }, GridCalcul: { procent: (x) => (100 * x).toFixed(1).replace(".", ",") + "%" },
    tbPreg: { ch7: { AAA: -2.74, BBB: 3.1 } } });
  vm.runInContext(fnT("tbIdeiRender"), ctx); ctx.tbIdeiRender(); const t = text(box.innerHTML);
  assert.match(t, /AAA interval 9,2% · 0,3% net pe grilă · ~17 treceri pe zi · 59 de grile · pas 0,30% · 7 zile −2,7%/, "rândul cu toate detaliile: " + t.slice(0, 300));
  assert.match(t, /BBB interval 15,0% · 0,3% net pe grilă · ~9 treceri pe zi · 7 zile \+3,1%/, "fără grile aduse nu inventează; mișcarea pe 7 zile cu semn");
  assert.match(box.innerHTML, /gridDeschideMoneda\('AAA'\)/); assert.match(t, /Un filtru \(liniște, interval, treceri\), nu o predicție/);
  // fără Scan adus (tbPreg.ch7 lipsă) rândul rămâne cel de dinainte, fără „7 zile”
  ctx.tbPreg = {}; box._contH = null; ctx.tbIdeiRender(); assert.doesNotMatch(text(box.innerHTML), /7 zile/); assert.match(text(box.innerHTML), /AAA interval 9,2% · 0,3% net pe grilă · ~17 treceri pe zi · 59 de grile · pas 0,30%/);
  // candidații din Scan pe care îi arăta cartela Consilierului rămân în aceeași listă: cel care nu e printre primii 5 după scor intră la coadă,
  // cu eticheta lui; cel care e deja acolo nu apare de două ori (aici cu modulul Idei adevărat și un clasament de 7 candidați)
  const IdeiA = incarcaLib(["idei.js"], "Idei"), mon = (s, scor, extra) => Object.assign({ simbol: s + "_USDT_PERP", stare: "candidat", volum: 5e6, scor, latime: 0.1, profitGrila: 0.0026, traversariZi: 10, grile: 30, pas: 0.003 }, extra || {});
  const clasament = { la: Date.UTC(2026, 10, 14, 20, 0), monede: [mon("A1", 9, { dir: "long" }), mon("A2", 8, { dir: "long" }), mon("A3", 7, { dir: "short" }), mon("A4", 6, { dir: "short" }), mon("A5", 5, { dir: "neutru" }), mon("A6", 4, { dir: "neutru" }), mon("A7", 3, { dir: "neutru" }), mon("A8", 2, { stare: "evita" })] };   /* v100.344: cel mult 2 pe aceeași direcție */
  ctx.Idei = IdeiA; ctx.contTot = { clasament, inchise: [] }; ctx.tbPreg = { grid: [{ s: "A2" }, { s: "A7" }, { s: "A8" }], ch7: { A7: 1.26 } }; box._contH = null; ctx.tbIdeiRender();
  const u = text(box.innerHTML), nume = (box.innerHTML.match(/gridDeschideMoneda\('([A-Z0-9]+)'\)/g) || []).map((x) => x.replace(/^.*\('|'\)$/g, ""));
  assert.deepEqual(nume, ["A1", "A2", "A3", "A4", "A5", "A7"], "primii 5 după scor + cel din Scan care lipsea; A2 o singură dată; A8 (de evitat) nu intră");
  assert.match(u, /A7 interval 10,0% · 0,3% net pe grilă · ~10 treceri pe zi · 31 de grile · pas 0,30% · 7 zile \+1,3% · din Scan 🟦/); assert.equal((u.match(/din Scan 🟦/g) || []).length, 1, "doar cel adăugat poartă eticheta");
  // cu bot pornit cartela nu arăta lista, deci banda rămâne cea de dinainte chiar dacă pagina mai ține lista din Scan
  ctx.tbStare = { bot: { id: "x" } }; box._contH = null; ctx.tbIdeiRender(); assert.doesNotMatch(text(box.innerHTML), /din Scan 🟦|A7 interval/); ctx.tbStare = { bot: null }; box._contH = null; ctx.tbIdeiRender(); assert.match(text(box.innerHTML), /A7 interval/);
  assert.match(fnApp("tbPregatireAdu"), /tbPreg\.ch7=\{\};\(sc\.crypto\.randuri\|\|\[\]\)\.forEach\(function\(q\)\{if\(q&&q\.s&&isFinite\(q\.ch7\)\)tbPreg\.ch7\[q\.s\]=q\.ch7\}\)/, "mișcarea pe 7 zile a tuturor monedelor din Scan se ține pentru bandă");
});

// ---------------- I-883 / I-886: G2, logica (date făcute de mână, fără rețea) ----------------
const { G2, primaZi2, claseVolumLaZi, coinZileVolum, verdictV, testJohnson, verdictM, perioade, rezultatGridStop, stricaViitorul2, adunaLumanari, intoarceLumanari, reperM } = await import("./lib/g2-grid-date-nevazute.mjs");
const { rezultatGrid, testCuGarda, ziIso } = await import("./lib/g1-candidati-grid.mjs");
const { testBlocuri } = await import("./lib/statistica-blocuri.mjs");
const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js", "grid-proba.js"], "({ G: GridCalcul, GC: GridClasament, GP: GridProba })"), G = L.G, GC = L.GC, GP = L.GP;
const ZI = 86400000, H4 = 14400000, M15 = 900000, T0 = Date.UTC(2026, 0, 31), ISTORIC = 30, FEREASTRA = 14;
// 10 monede, mers la întâmplare pe 15 minute; volumul pe 4 ore ține de monedă (moneda 0 cea mai mare) cu puțin zgomot; funding la 8 ore
function seriiDeProba(samanta) {
  const rnd = mulberry32(samanta), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }, date = {};
  for (let i = 0; i < 10; i++) { const sg = 0.0012 + 0.0005 * i, b15 = [], b4h = []; let p = 50 * (1 + i);
    for (let t = T0 - ISTORIC * ZI; t < T0 + FEREASTRA * ZI; t += M15) { const o = p, c = o * Math.exp(sg * norm()), h = Math.max(o, c) * (1 + Math.abs(sg * norm()) / 3), l = Math.min(o, c) * (1 - Math.abs(sg * norm()) / 3); b15.push({ t, o, h, l, c }); p = c; }
    for (let k = 0; k + 16 <= b15.length; k += 16) { const f = b15.slice(k, k + 16); b4h.push({ t: f[0].t, o: f[0].o, h: Math.max(...f.map((x) => x.h)), l: Math.min(...f.map((x) => x.l)), c: f[15].c, qv: 1e6 * (10 - i) * (0.9 + 0.2 * rnd()) }); }
    const f = []; for (let t = T0 + 8 * 3600000; t <= T0 + FEREASTRA * ZI; t += 8 * 3600000) f.push([t, 0.0001]);
    date["M" + i + "USDT"] = { b4h, b15, f }; }
  return date;
}
const DATE = seriiDeProba(20261115), cuTaietura = (n, f) => { const v = G2.taieturaVolum; G2.taieturaVolum = n; try { return f(); } finally { G2.taieturaVolum = v; } };
const clona = (o) => JSON.parse(JSON.stringify(o));

await test("(I-883 / I-886) constantele G2 sunt cele din jurnal: fereastra nevăzută de 400 de zile până la 28.04.2026, 41 de teste ⇒ 0,05 ÷ 82, tăietura după volum la 60, 10.000 de ordini, orizonturi de 3 și 7 zile; regulile stau în jurnal înaintea rezultatului", () => {
  assert.equal(G2.pana, Date.UTC(2026, 3, 28)); assert.equal(G2.zile, 400); assert.equal(ziIso(primaZi2()), "2025-03-24"); assert.equal(G2.teste, 41); assert.equal(G2.alfa, 0.05 / 82); assert.equal(G2.taieturaVolum, 60);
  assert.equal(G2.permutari, 10000); assert.deepEqual(G2.orizonturi, [3, 7]); assert.equal(G2.minPeZi, 0.001); assert.equal(G2.minRaport, 1.2); assert.equal(G2.minDiferenta, 0.0005); assert.equal(G2.zilePeBloc, 5);
  const J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md"), iR = J.indexOf("## G2 — pe date nevăzute"), iRez = J.indexOf("### G2 — rezultatul");
  assert.ok(iR > J.indexOf("### G1 — îndreptări după revizia independentă"), "regulile G2 stau după G1"); assert.ok(iRez < 0 || iRez > iR, "rezultatul stă după reguli");
  const R = J.slice(iR, iRez > 0 ? iRez : undefined);
  for (const cer of [/ÎNAINTEA oricărei lumânări/, /24\.03\.2025 – 27\.04\.2026/, /Universul, ales la început/, /nu se vede în lumânări/, /locul 1–60/, /o poartă pe etichete statornice/, /DOVEDIT cere amândouă/, /133 de perioade de 3 zile și 57 de perioade de 7 zile/, /stopul casei/, /Johnson \(1978\)/,
    /p ≤ 0,05 ÷ 82 într-o parte/, /pe seria ADEVĂRATĂ/, /cu comisioanele dublate/, /Ce se scrie pe pagină, hotărât acum/, /G2-M ajunge pe pagină doar dacă iese DOVEDIT/]) assert.match(R, cer, "din regulile G2 lipsește " + cer);
  assert.match(J, /\| G2-V \| 14\.11\.2026 \|[^\n]*\| 2 \|/); assert.match(J, /\| G2-M \| 14\.11\.2026 \|[^\n]*\| 2 \|/);
});
await test("(I-886) clasele după volum: locul = locul în univers după volumul celor 6 lumânări de 4 ore închise înaintea zilei; „mari” = candidații de pe primele locuri; viitorul stricat (prețuri și volume) nu schimbă nimic, volumul ultimelor 24 h stricat schimbă locurile", () => {
  cuTaietura(5, () => {
    const t = T0 + 5 * ZI, b4 = {}; for (const s of Object.keys(DATE)) b4[s] = DATE[s].b4h;
    const cl = claseVolumLaZi(GC, b4, t); assert.equal(cl.length, 10);
    assert.deepEqual(cl.map((x) => x.simbol), ["M0USDT", "M1USDT", "M2USDT", "M3USDT", "M4USDT", "M5USDT", "M6USDT", "M7USDT", "M8USDT", "M9USDT"], "ordinea e a volumului");
    cl.forEach((x, i) => { assert.equal(x.loc, i + 1); assert.equal(x.clasa, x.j.stare === "candidat" ? (x.loc <= 5 ? "top" : "rest") : null); });
    const v0 = b4.M0USDT.filter((x) => x.t >= t - 6 * H4 && x.t < t).reduce((a, x) => a + x.qv, 0); assert.equal(cl[0].vol, v0, "volumul e al celor 6 lumânări de dinainte");
    assert.ok(cl.some((x) => x.clasa === "top") && cl.some((x) => x.clasa === "rest"), "premisa: sunt și mari, și mici");
    const stricat = stricaViitorul2(DATE, t, t + ZI, mulberry32(4)), b4s = {}; for (const s of Object.keys(stricat)) b4s[s] = stricat[s].b4h;
    assert.deepEqual(clona(claseVolumLaZi(GC, b4s, t)), clona(cl), "viitorul stricat a schimbat clasele sau locurile");
    // volumul ultimelor 24 h al monedei de pe locul 10 umflat ⇒ urcă pe locul 1 (proba e sensibilă la volum)
    const umflat = Object.assign({}, b4, { M9USDT: b4.M9USDT.map((x) => (x.t >= t - 6 * H4 && x.t < t ? Object.assign({}, x, { qv: x.qv * 1000 }) : x)) });
    assert.equal(claseVolumLaZi(GC, umflat, t)[0].simbol, "M9USDT");
    // fără una dintre cele 6 lumânări ale ultimelor 24 h moneda nu primește loc
    const gaura = Object.assign({}, b4, { M3USDT: b4.M3USDT.filter((x) => x.t !== t - 2 * H4) }); assert.ok(!claseVolumLaZi(GC, gaura, t).some((x) => x.simbol === "M3USDT"));
  });
});
await test("(I-886) monedele-zi ale lui V: gridul clasamentului pe 24 de ore, fără stop; o zi folosește doar lumânările ei; viitorul stricat lasă rândurile neschimbate, ziua însăși stricată le schimbă", () => {
  cuTaietura(5, () => {
    const tot = coinZileVolum(G, GC, GP, DATE, { deLa: T0, zile: FEREASTRA }); assert.ok(tot.randuri.length >= 80, "monede-zi: " + tot.randuri.length); assert.equal(tot.sarite.faraBare15, 0);
    assert.ok(tot.randuri.every((r) => (r.clasa === "top") === (r.loc <= 5)), "clasa urmează locul după volum");
    for (const d of [0, 6, 13]) { const t = T0 + d * ZI, curat = coinZileVolum(G, GC, GP, DATE, { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri;
      assert.deepEqual(curat, tot.randuri.filter((r) => r.zi === ziIso(t)));
      assert.deepEqual(coinZileVolum(G, GC, GP, stricaViitorul2(DATE, t, t + ZI, mulberry32(d + 1)), { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri, curat, "ziua " + d + ": viitorul stricat a schimbat ceva");
      assert.notDeepEqual(coinZileVolum(G, GC, GP, stricaViitorul2(DATE, t - 2 * ZI, t, mulberry32(d + 1)), { deLa: T0, zile: FEREASTRA, doarZilele: [d] }).randuri, curat, "ziua " + d + ": stricarea zilei ar fi trebuit să se vadă"); }
  });
});
await test("(I-886) verdictul lui V cere AMÂNDOUĂ porțile: testul cu gardă sub prag și t-ul adevărat peste aproape toate ordinile statornice; cu poarta statornică netrecută rămâne nedovedit oricât de mare ar fi t; pe dos la fel; fără ordini e nemăsurat", () => {
  const cu = (m, z) => Array.from({ length: 80 }, (_, i) => m + (i % 2 ? z : -z)), v = cu(Math.log(1.5), 0.05), T = testCuGarda(v);
  const mici = Array.from({ length: 10000 }, (_, i) => -3 + 6 * (i / 10000)), mari = mici.map((x, i) => (i < 30 ? T.tGarda + 1 : x));
  assert.ok(T.p < G2.alfa, "premisa: testul cu gardă trece (p = " + T.p + ")");
  const A = verdictV(v, "a", mici); assert.equal(A.verdict, "DOVEDIT"); assert.ok(A.pPerm < G2.alfa && A.permutari === 10000); assert.ok(Math.abs(A.marime - 1.5) < 1e-9);
  const B = verdictV(v, "a", mari); assert.equal(B.verdict, "NEDOVEDIT", "30 din 10.000 de ordini întâmplătoare ajung t-ul adevărat ⇒ p de permutare " + B.pPerm + " peste prag"); assert.ok(B.pPerm > G2.alfa);
  assert.equal(verdictV(cu(Math.log(1.1), 0.02), "a", mici).verdict, "EXISTĂ, DAR MIC"); assert.equal(verdictV(cu(-Math.log(1.5), 0.05), "a", mici).verdict, "PE DOS");
  assert.equal(verdictV(cu(-Math.log(1.5), 0.05), "a", mici.map((x, i) => (i < 30 ? -T.tGarda - 1 : x))).verdict, "NEDOVEDIT", "și „pe dos” trece prin poarta statornică");
  assert.equal(verdictV(cu(0.002, 0.0005), "b", mici).verdict, "DOVEDIT"); assert.equal(verdictV(cu(0.01, 0.2), "a", mici).verdict, "NEDOVEDIT");
  assert.equal(verdictV(v, "a", []).verdict, "NEMĂSURAT"); assert.equal(verdictV([0.5, 0.5, 0.6, 0.4], "a", mici).verdict, "NEMĂSURAT");
  assert.equal(A.pPerm, 1 / 10001, "niciuna nu-l ajunge ⇒ (1 + 0) ÷ 10.001");
});
await test("(I-883) testul lui M: statistica Johnson - pe valori simetrice e chiar t, pe valori cu coadă în jos îl coboară (nu mai „dovedește” fals plusul); cele două părți se completează; sub 8 valori nu judecă", () => {
  const sim = Array.from({ length: 60 }, (_, i) => 0.4 + (i % 2 ? 0.3 : -0.3)), S = testJohnson(sim), Tb = testBlocuri(sim);
  assert.ok(Math.abs(S.asimetrie) < 1e-9 && Math.abs(S.tJ - S.t) < 1e-9, "fără asimetrie, Johnson = Student"); assert.ok(Math.abs(S.t - Tb.t) < 1e-9); assert.ok(Math.abs(S.pPlus + S.pMinus - 1) < 1e-12);
  // coadă în jos: 57 de valori mici pozitive și 3 pierderi mari, media tot pozitivă
  const coada = Array.from({ length: 60 }, (_, i) => (i % 20 === 7 ? -0.9 : 0.1 + 0.01 * (i % 3))), C = testJohnson(coada);
  assert.ok(C.medie > 0 && C.asimetrie < -2, "premisa: medie pe plus, coadă în jos (asimetria " + C.asimetrie + ")"); assert.ok(C.tJ < C.t, "Johnson coboară t-ul: " + C.tJ + " față de " + C.t);
  const m3 = coada.reduce((a, x) => a + (x - C.medie) ** 3, 0) / 60, s2 = C.sd * C.sd; assert.ok(Math.abs(C.tJ - (C.medie + m3 / (6 * s2 * 60) + m3 * C.medie * C.medie / (3 * s2 * s2)) * Math.sqrt(60) / C.sd) < 1e-9, "formula din jurnal");
  // garda de autocorelație e activă pe valori legate între ele: coboară |t| și gradele de libertate; pe valori care alternează e oprită
  const rndJ = mulberry32(17), leg = []; let xj = 0; for (let i = 0; i < 60; i++) { xj = 0.8 * xj + (rndJ() - 0.5); leg.push(0.3 + xj); }
  const Lg = testJohnson(leg); assert.ok(Lg.r1 > 0.4 && Lg.rGarda > 0.5, "premisa: seria e legată (r = " + Lg.r1 + ")"); assert.ok(Math.abs(Lg.tGarda) < 0.6 * Math.abs(Lg.tJ), "cu gardă " + Lg.tGarda + " față de " + Lg.tJ); assert.ok(Lg.df < 30 && Lg.df >= 2);
  assert.ok(Math.abs(Lg.tGarda - Lg.tJ * Math.sqrt((1 - Lg.rGarda) / (1 + Lg.rGarda))) < 1e-12); assert.equal(S.tGarda, S.tJ, "pe valori care alternează garda nu se aplică"); assert.equal(S.df, 59);
  assert.ok(Number.isNaN(testJohnson([1, 2, 3, 4, 5, 6, 7]).pPlus)); assert.ok(testJohnson(Array(9).fill(0.2)).pPlus < 1e-30, "fără nicio împrăștiere, plusul e sigur");
});
await test("(I-883) verdictele lui M: dovedit pe plus / pe minus doar cu p sub prag ȘI cel puțin 0,1% pe zi; sub ea „există, dar mic”; altfel nedovedit; sub 8 perioade nemăsurat", () => {
  const cu = (m, z, n = 57) => Array.from({ length: n }, (_, i) => m + (i % 2 ? z : -z));
  assert.equal(verdictM(cu(0.02, 0.004), 7).verdict, "DOVEDIT PE PLUS"); assert.equal(verdictM(cu(-0.02, 0.004), 7).verdict, "DOVEDIT PE MINUS");
  assert.equal(verdictM(cu(0.004, 0.0005), 7).verdict, "EXISTĂ, DAR MIC", "0,4% la 7 zile e sub 0,1% pe zi"); assert.equal(verdictM(cu(0.004, 0.0005), 3).verdict, "DOVEDIT PE PLUS", "aceeași cifră la 3 zile e peste");
  assert.equal(verdictM(cu(-0.004, 0.0005), 7).verdict, "EXISTĂ, DAR MIC"); assert.equal(verdictM(cu(0.002, 0.03), 7).verdict, "NEDOVEDIT"); assert.equal(verdictM([0.1, 0.1, 0.2, 0.1, 0.2], 7).verdict, "NEMĂSURAT");
  const V = verdictM(cu(0.02, 0.004), 7); assert.equal(V.minim, 0.007); assert.equal(V.n, 57);
});
await test("(I-883) perioadele lui M nu se suprapun, iau toți candidații, rulează gridul cu STOPUL casei și cu funding-ul mediu pe zi; comisioanele duble coboară media și sunt puse la loc; viitorul stricat nu schimbă perioada", () => {
  const P3 = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA, cuRanduri: true }), P7 = perioade(G, GC, GP, DATE, 7, { deLa: T0, zile: FEREASTRA });
  assert.equal(P3.perioade.length, 4); assert.equal(P7.perioade.length, 2); assert.deepEqual(P3.perioade.map((p) => p.zi), [0, 3, 6, 9].map((d) => ziIso(T0 + d * ZI)), "una după alta, din 3 în 3 zile");
  const b4 = {}; for (const s of Object.keys(DATE)) b4[s] = DATE[s].b4h; const cand = claseVolumLaZi(GC, b4, T0).filter((x) => x.clasa);
  assert.equal(P3.perioade[0].n, cand.length, "toți candidații, oricare ar fi volumul"); assert.ok(Math.abs(P3.perioade[0].medie - P3.perioade[0].randuri.reduce((a, r) => a + r.b, 0) / P3.perioade[0].n) < 1e-15);
  // stopul casei: pe o prăbușire de 40%, gridul cu stop se oprește și pierde mai puțin decât cel fără stop
  const j = cand[0].j, c = G.construieste({ pret: j.pret, lat: j.latime, dir: "long", pas: G.C.PAS_MIN, levier: 1 }), jl = Object.assign({}, j, { dir: "long" });
  const cade = Array.from({ length: 288 }, (_, i) => { const o = j.pret * (1 - 0.4 * i / 288), cl = j.pret * (1 - 0.4 * (i + 1) / 288); return { t: T0 + i * M15, o, h: o, l: cl, c: cl }; });
  const cuStop = rezultatGridStop(G, GP, jl, cade, 0, 288, 0), fara = rezultatGrid(G, GP, jl, cade, 0, 288, 0);
  assert.equal(cuStop.oprit, true); assert.equal(cuStop.iesit, "jos"); assert.ok(cuStop.b > fara.b && cuStop.b < 0, "cu stop " + cuStop.b + ", fără " + fara.b); assert.ok(c.stop.jos < c.jos && c.stop.sus > c.sus, "stopul casei e în afara intervalului");
  const com0 = G.C.COMISION, com1 = G.C.COMISION_GRILA, D2 = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA, comision: 2 });
  assert.equal(G.C.COMISION, com0); assert.equal(G.C.COMISION_GRILA, com1, "comisioanele motorului sunt puse la loc"); assert.equal(D2.perioade.length, 4); assert.ok(D2.perioade.every((p, i) => p.n > 0 && p.medie < P3.perioade[i].medie), "cu comisioane duble fiecare perioadă iese mai jos: " + D2.perioade.map((p) => p.medie).join(" ") + " față de " + P3.perioade.map((p) => p.medie).join(" "));
  // în test intră doar perioadele cu destui candidați (pe datele de probă, cu 10 monede, pragul se coboară anume)
  assert.equal(G2.minMonedePerioada, 10); assert.deepEqual(P3.valori, P3.perioade.filter((p) => p.n >= 10).map((p) => p.medie)); const vechiMin = G2.minMonedePerioada; G2.minMonedePerioada = 3;
  try { const Q = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA }); assert.equal(Q.valori.length, 4, "cu pragul coborât, toate cele 4 perioade intră"); assert.deepEqual(Q.valori, Q.perioade.map((p) => p.medie)); } finally { G2.minMonedePerioada = vechiMin; }
  for (const k of [0, 2]) { const t = T0 + k * 3 * ZI, curat = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA, doarPerioadele: [k], cuRanduri: true }).perioade;
    assert.deepEqual(perioade(G, GC, GP, stricaViitorul2(DATE, t, t + 3 * ZI, mulberry32(k + 9)), 3, { deLa: T0, zile: FEREASTRA, doarPerioadele: [k], cuRanduri: true }).perioade, curat, "perioada " + k + ": viitorul stricat a schimbat ceva");
    assert.notDeepEqual(perioade(G, GC, GP, stricaViitorul2(DATE, t - ZI, t + ZI, mulberry32(k + 9)), 3, { deLa: T0, zile: FEREASTRA, doarPerioadele: [k], cuRanduri: true }).perioade, curat, "perioada " + k + ": stricarea ei ar fi trebuit să se vadă"); }
  // funding-ul: media pe zi a perioadei intră în rezultat (longul plătește rata pozitivă)
  const scump = clona(DATE); for (const s of Object.keys(scump)) scump[s].f = scump[s].f.map(([t, r]) => [t, 0.01]);
  const Pf = perioade(G, GC, GP, scump, 3, { deLa: T0, zile: FEREASTRA, doarPerioadele: [0], cuRanduri: true }).perioade[0], lung = P3.perioade[0].randuri.findIndex((r, i) => cand[i].j.dir === "long");
  assert.ok(lung >= 0, "premisa: printre candidații primei perioade e cel puțin un long"); assert.ok(Pf.randuri[lung].b < P3.perioade[0].randuri[lung].b, "funding-ul mare coboară rezultatul unui long");
  // pragul de candidați pe un caz amestecat: cu pragul pus între cea mai săracă și cea mai bogată perioadă, intră doar cele de peste el
  const nuri = P3.perioade.map((p) => p.n), minN = Math.min(...nuri), maxN = Math.max(...nuri);
  if (minN < maxN) { const v0 = G2.minMonedePerioada; G2.minMonedePerioada = minN + 1; try { const Q2 = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA }); assert.equal(Q2.valori.length, nuri.filter((n) => n >= minN + 1).length); assert.ok(Q2.valori.length > 0 && Q2.valori.length < 4, "caz amestecat: " + nuri); } finally { G2.minMonedePerioada = v0; } }
  else { const v0 = G2.minMonedePerioada; G2.minMonedePerioada = maxN + 1; try { assert.equal(perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA }).valori.length, 0, "peste numărul de candidați nu intră nicio perioadă"); } finally { G2.minMonedePerioada = v0; } }
});
await test("(I-883 / I-886) scriptul refuză cifrele adevărate înaintea pașilor de dinaintea lor și nu arată nicio medie adevărată în pasul acela", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "g2-proba-")); try {
    const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "cercetare-v100343-grid-date-nevazute.mjs"), "--ce=g2", "--cache=" + tmp], { encoding: "utf8", timeout: 60000 });
    assert.equal(r.status, 1, "codul de ieșire: " + r.status + " · " + String(r.stderr).slice(0, 200)); assert.match(r.stdout, /REFUZ: întâi --ce=g2h0/); assert.deepEqual(fs.readdirSync(tmp), []);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const S = citeste("scripts", "cercetare-v100343-grid-date-nevazute.mjs"), h0 = S.slice(S.indexOf("function h0()"), S.indexOf("function g2()"));
  assert.match(S, /if \(H0\.amprenta !== D\.amprenta\)/); assert.match(S, /if \(!H0\.valid\)/);
  assert.doesNotMatch(h0, /medieTop|medieRest|\.marime|T\.medie\)|pc\(m\b|nr\(m\b/, "pasul de dinaintea cifrelor nu scrie nicio medie adevărată"); assert.match(h0, /x - m \+ /, "valorile se trec prin verdict doar cu media scoasă și mutată la efectul pus");
});

await test("(I-883) reperul fără direcție: lumânările întoarse la întâmplare păstrează agitația fiecărei lumânări și pornesc de la același preț; întoarse toate, drumul e oglinda; neîntoarse, e chiar drumul; lumânările adunate câte k păstrează O, H, L, C", () => {
  const b = DATE.M4USDT.b15.slice(0, 96), toate = intoarceLumanari(b, () => 0), niciuna = intoarceLumanari(b, () => 0.99), unele = intoarceLumanari(b, mulberry32(5));
  assert.equal(unele.length, 96); assert.equal(unele[0].o, b[0].o, "același preț de pornire"); assert.deepEqual(intoarceLumanari(b, mulberry32(5)), unele, "aceeași sămânță, același drum");
  for (let i = 0; i < 96; i++) { assert.ok(Math.abs(Math.log(unele[i].h / unele[i].l) - Math.log(b[i].h / b[i].l)) < 1e-12, "lumânarea " + i + ": aceeași întindere"); assert.ok(Math.abs(Math.abs(Math.log(unele[i].c / unele[i].o)) - Math.abs(Math.log(b[i].c / b[i].o))) < 1e-12);
    assert.ok(unele[i].h >= Math.max(unele[i].o, unele[i].c) - 1e-9 && unele[i].l <= Math.min(unele[i].o, unele[i].c) + 1e-9); if (i) assert.ok(Math.abs(unele[i].o - unele[i - 1].c) < 1e-9, "lipite cap la cap"); }
  assert.ok(Math.abs(Math.log(toate[95].c / b[0].o) + [...b].reduce((a, x) => a + Math.log(x.c / x.o), 0)) < 1e-9, "toate întoarse: suma mișcărilor cu semnul schimbat"); assert.ok(Math.abs(Math.log(toate[10].h / toate[10].o) + Math.log(b[10].l / b[10].o)) < 1e-12, "fitilul de jos devine cel de sus");
  assert.ok(niciuna.every((x, i) => Math.abs(Math.log(x.c / x.o) - Math.log(b[i].c / b[i].o)) < 1e-12 && Math.abs(Math.log(x.h / x.o) - Math.log(b[i].h / b[i].o)) < 1e-12), "neîntoarse: aceleași lumânări, lipite");
  assert.ok(unele.some((x, i) => Math.sign(Math.log(x.c / x.o)) !== Math.sign(Math.log(b[i].c / b[i].o))) && unele.some((x, i) => Math.sign(Math.log(x.c / x.o)) === Math.sign(Math.log(b[i].c / b[i].o)) && b[i].c !== b[i].o), "unele întoarse, altele nu");
  const o4 = adunaLumanari(b.slice(0, 10), 4); assert.equal(o4.length, 2, "coada incompletă se lasă"); assert.equal(o4[0].t, b[0].t); assert.equal(o4[0].o, b[0].o); assert.equal(o4[0].c, b[3].c); assert.equal(o4[0].h, Math.max(b[0].h, b[1].h, b[2].h, b[3].h)); assert.equal(o4[1].l, Math.min(b[4].l, b[5].l, b[6].l, b[7].l));
});
await test("(I-883) reperM: pe fiecare perioadă, „adevărat” e chiar media din perioade(); pe lumânări mai mari motorul vede mai puține dus-întorsuri (rezultat mai mic); reperul trece aceleași griduri prin același motor", () => {
  const v0 = G2.minMonedePerioada; G2.minMonedePerioada = 3; try {
    const R = reperM(G, GC, GP, DATE, 3, mulberry32(8), { deLa: T0, zile: FEREASTRA }).perioade, P = perioade(G, GC, GP, DATE, 3, { deLa: T0, zile: FEREASTRA }).perioade;
    assert.equal(R.length, 4); R.forEach((r, i) => { assert.equal(r.zi, P[i].zi); assert.equal(r.n, P[i].n); assert.ok(Math.abs(r.real - P[i].medie) < 1e-15, "perioada " + i + ": " + r.real + " față de " + P[i].medie); assert.ok(Number.isFinite(r.reper) && Number.isFinite(r.real30) && Number.isFinite(r.real60)); });
    const med = (c) => R.reduce((a, r) => a + r[c], 0) / R.length; assert.ok(med("real60") < med("real30") && med("real30") < med("real"), "lumânarea mai mare ⇒ rezultat mai mic: " + [med("real"), med("real30"), med("real60")].join(" > "));
    assert.deepEqual(reperM(G, GC, GP, DATE, 3, mulberry32(8), { deLa: T0, zile: FEREASTRA }).perioade, R, "aceeași sămânță, aceleași cifre"); assert.notDeepEqual(reperM(G, GC, GP, DATE, 3, mulberry32(9), { deLa: T0, zile: FEREASTRA }).perioade.map((r) => r.reper), R.map((r) => r.reper));
  } finally { G2.minMonedePerioada = v0; }
});
await test("(I-883 / I-886) pagina și jurnalul după revizie: explicația din Scan spune doar ce ține (tăietura după volum: măsurată, nedovedit că ar conta) și NIMIC despre „gridul pierde”; jurnalul are verdictul formal, reperul motorului și îndreptările, și la E2", () => {
  const Scan = incarcaLib(["scan.js"], "Scan"), r = Scan.RETETE.find((x) => x.k === "grid"), J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md");
  assert.match(r.e, /Tăietura după volum: măsurată pe 400 de zile de lumânări, nedovedit că ar conta; rămâne o măsură de prudență, nu un câștig măsurat\. Măsurat din nou \(18\.11\.2026\): candidații se mișcă clar mai puțin decât monedele în mișcare/);   /* v100.363: + măsurătoarea nouă */ assert.doesNotMatch(r.e, /Tăietura după volum nu e măsurată/);
  assert.doesNotMatch(r.e, /pe minus|pierde|stopul casei|3 zile|7 zile/i, "despre G2-M nu se scrie nimic pe pagină"); assert.match(r.e, /dintre primele 60 după volum/); assert.match(r.e, /Că ordinea după scor ar conta e nedovedit/);
  const iReg = J.indexOf("## G2 — pe date nevăzute"), iRez = J.indexOf("### G2 — rezultatul"), iInd = J.indexOf("### G2 — îndreptări după revizia independentă"); assert.ok(iReg > 0 && iRez > iReg && iInd > iRez, "ordinea în jurnal: reguli, rezultat, îndreptări");
  const Rez = J.slice(iRez, iInd), Ind = J.slice(iInd);
  assert.match(Rez, /\| V-A — grilele încasate, din sumă pe zi \| 0,464% \| 0,457% \| ×1,01 \|[^\n]*\*\*NEDOVEDIT\*\* \|/); assert.match(Rez, /\| V-B — rezultatul total, din sumă pe zi \| −0,424% \| −0,425% \|[^\n]*\*\*NEDOVEDIT\*\* \|/);
  assert.match(Rez, /\| M — 3 zile, cu stopul casei \| −0,746% \|[^\n]*\*\*DOVEDIT PE MINUS\*\* \|/, "verdictul formal rămâne scris"); assert.match(Rez, /verdictul formal NU se poate citi ca „gridul pierde”/); assert.match(Rez, /\*\*Despre M nu se scrie nimic\.\*\*/);
  assert.doesNotMatch(Rez, /peste 9,63|peste 3,41|cu stopul lipit de el, iese pe stop în 53–85% din cazuri\. Și e o singură/, "cifrele și explicația îndreptate"); assert.match(Rez, /peste 9,80 la A și peste 3,42/);
  for (const cer of [/„Zeroul” motorului nu e zero/, /\| 3 zile \| −0,746% \| −0,829% \| \+0,082% \| 0,34 \|/, /\| 7 zile \| −1,292% \| −1,116% \| −0,176% \| −0,58 \|/, /\| 30 de minute \| −0,906% \| −1,520% \|/, /verdictul stătea pe muchie/, /„Pe zi” din tabel e diluat/, /Ce înseamnă pentru E2 \(ieri\) și pentru fișă/, /Pe pagină nu se scrie nimic despre M/, /cere întâi zeroul instrumentului/]) assert.match(Ind, cer, "din îndreptările G2 lipsește " + cer);
  const iE2 = J.indexOf("### E2 — de văzut, fără verdict"); assert.match(J.slice(iE2, iE2 + 900), /Îndreptare, 15\.11\.2026: media negativă de mai jos NU e „ce pierde gridul”/, "E2 poartă aceeași îndreptare");
  assert.match(J, /\| G2-M \| 14\.11\.2026 \|[^\n]*NU se citește ca „gridul pierde”/); assert.match(citeste("scripts", "cercetare-v100343-grid-date-nevazute.mjs"), /function reper\(\)/);
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
