// Proba v100.119 / colector v101.81 (06.10, el: „mai bine o pagină de sugestii unde pui tot: boți, EU, US, absolut toate”):
// specul docs/superpowers/specs/2026-10-06-pagina-sugestii-design.md, planul docs/superpowers/plans/2026-10-06-pagina-sugestii.md
// (1) regulile noi (început de urcare, revers timpuriu, gap) + istoricul fără privit în viitor · (2) pre-market US / gap EU pe rânduri intraday
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["grid-calcul.js", "risc-luna.js", "carnet.js", "sugestii-actiuni.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { SugestiiActiuni: SA } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nV100.119 · Pagina „Sugestii”: regulile noi, istoricul, pre-market · proba\n");

const ZI = 86400000, T0 = Date.UTC(2025, 0, 6, 14, 30);
// bare zilnice construite: { t, o, h, l, c, v }
const bara = (i, c, o) => Object.assign({ t: T0 + i * ZI, o: c, h: c * 1.005, l: c * 0.995, c, v: 1000 }, o || {});
function linistit(n, p0) { return Array.from({ length: n }, (_, i) => bara(i, p0 * (1 + 0.004 * Math.sin(i / 2)))); }

await test("(1a) început de urcare: după zile liniștite, închiderea trece de maximul pe 20 de zile cu volum ≥ 1,5× și peste media pe 50 ⇒ da; fără volum / fără liniște / sub medie ⇒ nu", () => {
  const b = linistit(60, 100); b.push(bara(60, 103, { v: 2000 }));
  const s = SA.semnalLa(b, 60, "urcare"); assert.equal(s.da, true); assert.ok(s.volX >= 1.9 && s.volX <= 2.1, String(s.volX)); assert.ok(s.ruptura > 0);
  const b2 = linistit(60, 100); b2.push(bara(60, 103, { v: 1300 })); assert.equal(SA.semnalLa(b2, 60, "urcare").da, false, "volum mic");
  const b3 = linistit(60, 100); b3[55] = bara(55, 92); b3.push(bara(60, 103, { v: 2000 })); assert.equal(SA.semnalLa(b3, 60, "urcare").da, false, "zilele dinainte n-au fost liniștite (8%+)");
  const b4 = Array.from({ length: 60 }, (_, i) => bara(i, 140 - i * 0.6)); b4.push(bara(60, b4[59].c * 1.03, { v: 2000 })); assert.equal(SA.semnalLa(b4, 60, "urcare").da, false, "sub media pe 50");
});
await test("(1b) revers timpuriu: după o cădere ≥ 15% de la maximul pe 30 de zile, PRIMA închidere peste maximul zilei de dinainte ⇒ da; a doua zi de urcare ⇒ nu", () => {
  const b = []; for (let i = 0; i < 20; i++) b.push(bara(i, 100 + i)); for (let i = 20; i < 35; i++) b.push(bara(i, 119 - (i - 19) * 1.8));
  const j = b.length; b.push(bara(j, b[j - 1].h * 1.01));
  const s = SA.semnalLa(b, j, "revers"); assert.equal(s.da, true); assert.ok(s.cadere >= 0.15, String(s.cadere));
  b.push(bara(j + 1, b[j].h * 1.01)); assert.equal(SA.semnalLa(b, j + 1, "revers").da, false, "nu mai e prima zi");
  const c = []; for (let i = 0; i < 20; i++) c.push(bara(i, 100 + i)); for (let i = 20; i < 35; i++) c.push(bara(i, 119 - (i - 19) * 0.5)); const k = c.length; c.push(bara(k, c[k - 1].h * 1.01));
  assert.equal(SA.semnalLa(c, k, "revers").da, false, "cădere sub 15%");
});
await test("(1c) fără privit în viitor: semnalul pe ziua j e același cu barele de după tăiate (toate cele 3 reguli, pe o serie lungă)", () => {
  const rnd = globalThis.RiscLuna.generator(7);   // mulberry32 (regula de casă: niciodată LCG-ul)
  let p = 100; const b = []; for (let i = 0; i < 300; i++) { const o = p; p = p * (1 + (rnd() - 0.5) * 0.06); b.push({ t: T0 + i * ZI, o, h: Math.max(o, p) * (1 + rnd() * 0.01), l: Math.min(o, p) * (1 - rnd() * 0.01), c: p, v: 800 + rnd() * 1500 }); }
  for (const r of ["urcare", "revers", "gap"]) for (let j = 60; j < 300; j++) assert.deepEqual(SA.semnalLa(b.slice(0, j + 1), j, r), SA.semnalLa(b, j, r), r + " j=" + j);
});
await test("(1d) punctele istoricului: intrare la deschiderea zilei de după (gap: aceeași zi), ieșire după 10 zile de bursă, −0,3%; un semnal la cel mult 14 zile pe ticker", () => {
  const b = linistit(80, 100); b.push(bara(80, 103, { v: 2000 })); for (let i = 81; i < 100; i++) b.push(bara(i, 103 + (i - 80), { o: 103 + (i - 81) }));
  const pt = SA.puncte(b, "urcare"), s = pt.find((q) => q.t === b[80].t);
  assert.equal(s.semnal, true); assert.ok(Math.abs(s.r - (b[90].c / b[81].o - 1 - 0.003)) < 1e-12, String(s.r));
  assert.ok(pt.every((q) => q.t <= b[b.length - 11].t), "fără zile cu fereastra neîncheiată");
  const g = [bara(0, 100)]; for (let i = 1; i < 40; i++) g.push(bara(i, 100, { o: i === 20 || i === 25 ? 103 : 100 }));
  const pg = SA.puncte(g, "gap"); assert.equal(pg.find((q) => q.t === g[20].t).semnal, true); assert.equal(pg.find((q) => q.t === g[25].t), undefined, "al doilea gap la 5 zile: scos (nici semnal, nici zi oarecare)");
  assert.ok(Math.abs(pg.find((q) => q.t === g[20].t).r - (g[29].c / g[20].o - 1 - 0.003)) < 1e-12);
});
await test("(1e) istoricul unei reguli: pe serii unde zilele cu semnal câștigă +3% ⇒ „dovedit-bun”, „mai bine”; textul spune cifrele cu o zecimală", () => {
  const serii = [];
  for (let k = 0; k < 20; k++) { const rnd = globalThis.RiscLuna.generator(11 + k);
    const pt = []; for (let d = 0; d < 400; d++) { const sem = d % 20 === k % 20; pt.push({ t: T0 + d * ZI, r: (rnd() - 0.5) * 0.06 + (sem ? 0.03 : 0), semnal: sem }); }
    serii.push({ ticker: "T" + k + "_US_EQ", puncte: pt }); }
  const d = SA.dovada(serii, { reps: 400 }); assert.equal(d.verdict.stare, "dovedit-bun"); assert.equal(d.eticheta, "mai bine"); assert.ok(d.n >= 300);
  const t = SA.textDovada(d, "urcare"); assert.match(t, /pe plus/); assert.doesNotMatch(t, /\d,\d\d%/); assert.doesNotMatch(t, /undefined|NaN/);
});
await test("(1f) lista de azi: doar pe bara ÎNCHISĂ (bara de azi, încă în lucru, se lasă deoparte); fără semnal ⇒ null", () => {
  const b = linistit(60, 100); b.push(bara(60, 103, { v: 2000 }));
  assert.equal(SA.azi(b, "urcare", b[60].t + 8 * 3600000).da, true);
  const b2 = b.concat([bara(61, 101)]); assert.equal(SA.azi(b2, "urcare", b2[61].t + 2 * 3600000).da, true, "bara de azi (2 h de la deschidere) se ignoră ⇒ semnalul de ieri");
  assert.equal(SA.azi(linistit(61, 100), "urcare", T0 + 70 * ZI), null);
});
await test("(1g) igiena datelor (măsurat 06.10 pe EU: salturi ×100 / ×227 la ETP-urile de la Londra, pence ↔ lire): o fereastră cu un salt de peste ×3 sau sub ÷3 într-o zi iese din istoric și din lista zilei", () => {
  const b = linistit(80, 100); b.push(bara(80, 103, { v: 2000 })); for (let i = 81; i < 100; i++) b.push(bara(i, i === 85 ? 10300 : 103));
  const pt = SA.puncte(b, "urcare"); assert.equal(pt.find((q) => q.t === b[80].t), undefined, "fereastra 81..90 are saltul ×100 de la 85");
  assert.ok(pt.some((q) => q.t === b[60].t), "zilele fără salt în fereastră rămân");
  const c = linistit(60, 100); c[40] = bara(40, 1); c.push(bara(60, 103, { v: 2000 })); assert.equal(SA.azi(c, "urcare", c[60].t + 9 * 3600000), null, "salt în cele 50 de zile ale regulii ⇒ fără semnal");
});
// ---------------- (2) pre-market / gap la deschidere ----------------
await test("(2a) ora deschiderii la New York în UTC: 13:30 vara (EDT), 14:30 iarna (EST)", () => {
  assert.equal(new Date(SA.deschidereNY(Date.UTC(2026, 9, 6, 12))).toISOString(), "2026-10-06T13:30:00.000Z");
  assert.equal(new Date(SA.deschidereNY(Date.UTC(2026, 11, 7, 12))).toISOString(), "2026-12-07T14:30:00.000Z");
});
await test("(2b) pre-market US: rândurile de azi dinaintea deschiderii; gap ≥ +2% și volum ≥ 1% din media zilnică ⇒ da; fără rânduri de pre-market ⇒ „fara”", () => {
  const acum = Date.UTC(2026, 9, 6, 13, 0), r = [];
  for (let m = 0; m < 120; m += 5) r.push({ time: Date.UTC(2026, 9, 6, 11, m), open: 103, high: 103.2, low: 102.8, close: 103, volume: 2000 });
  r.push({ time: Date.UTC(2026, 9, 5, 19, 55), open: 100, high: 100, low: 100, close: 100, volume: 99999 });   // ieri: nu intră
  const p = SA.premarket(r, 100, 1e6, acum); assert.equal(p.da, true); assert.ok(Math.abs(p.gap - 0.03) < 1e-9); assert.equal(p.randuri, 24);   // revizia (C1): fără volum (Yahoo dă 0)
  assert.equal(SA.premarket([], 100, 1e6, acum).fara, true);
});
await test("(2c) gap la deschidere EU: deschiderea de azi ≥ +2% și volumul primelor 20 de minute ≥ 3% din media ⇒ da", () => {
  const acum = Date.UTC(2026, 9, 6, 7, 20), d0 = Date.UTC(2026, 9, 6, 7, 0), r = [];
  for (let m = 0; m < 25; m += 5) r.push({ time: d0 + m * 60000, open: m ? 102.5 : 102.4, high: 103, low: 102, close: 102.6, volume: 10000 });   // + rândul de după primele 20 de minute (revizia I4)
  const g = SA.gapEU(r, 100, 1e6, acum); assert.equal(g.da, true); assert.ok(Math.abs(g.gap - 0.024) < 1e-9); assert.equal(g.vol, 40000);
  assert.equal(SA.gapEU(r, 100, 1e7, acum).da, false, "volum sub 3%");
});
// ---------------- (3) serverul ----------------
function kvFals() { const m = new Map(); return { m, get: async (k, o) => { const v = m.has(k) ? m.get(k) : null; return v !== null && o && (o === "json" || o.type === "json") ? JSON.parse(v) : v; }, put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })) }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp, brut) => { const mod = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.6." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp || brut) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: metoda, headers: h, body: brut || (corp ? JSON.stringify(corp) : undefined) }), env }); return { status: res.status, d: await res.json().catch(() => null) }; };
await test("(3a) ruta sugestii: colectorul scrie listele dimineții, pagina le citește; pre-market-ul US și gap-ul EU se țin separat (unul nu-l șterge pe celălalt)", async () => {
  assert.deepEqual((await cheama("GET", "action=sugestii")).d, { sugestii: null, premarket: null });
  const s = { la: T0, us: { urcare: [] }, eu: { revers: [] } };
  assert.equal((await cheama("POST", "action=sugestii", { sugestii: s })).status, 200);
  assert.equal((await cheama("POST", "action=premarket", { piata: "eu", la: T0 + 1, lista: [{ ticker: "SAPd_EQ", gap: 0.03 }] })).status, 200);
  assert.equal((await cheama("POST", "action=premarket", { piata: "us", la: T0 + 2, lista: [] })).status, 200);
  const g = (await cheama("GET", "action=sugestii")).d; assert.deepEqual(g.sugestii, s); assert.equal(g.premarket.eu.lista[0].ticker, "SAPd_EQ"); assert.equal(g.premarket.us.la, T0 + 2);
  assert.equal((await cheama("POST", "action=sugestii", { sugestii: { us: {} } })).status, 400); assert.equal((await cheama("POST", "action=premarket", { piata: "jp", la: 1, lista: [] })).status, 400);
  assert.equal((await cheama("POST", "action=sugestii", null, JSON.stringify({ sugestii: { la: 1, x: "a".repeat(270000) } }))).status, 413);
});
await test("(3b) prețurile cu prepost=1: Yahoo primește includePrePost=true (doar intraday), cheia de cache e alta; fără ⇒ ca până acum", async () => {
  const urls = [], vechi = globalThis.fetch;
  globalThis.fetch = async (u) => { urls.push(String(u)); return new Response(JSON.stringify({ chart: { result: [{ timestamp: [1759748400], indicators: { quote: [{ open: [1], high: [1], low: [1], close: [1], volume: [5] }] } }] } }), { status: 200, headers: { "content-type": "application/json" } }); };
  try {
    assert.equal((await cheama("GET", "action=preturi&ticker=AAPL_US_EQ&interval=5m&prepost=1")).status, 200);
    assert.equal((await cheama("GET", "action=preturi&ticker=MSFT_US_EQ&interval=5m")).status, 200);
    assert.equal((await cheama("GET", "action=preturi&ticker=NVDA_US_EQ&interval=1d&prepost=1")).status, 200);
  } finally { globalThis.fetch = vechi; }
  assert.ok(urls.some((u) => /AAPL/.test(u) && /includePrePost=true/.test(u)), urls.join(" "));
  assert.ok(urls.filter((u) => /MSFT|NVDA/.test(u)).every((u) => !/includePrePost/.test(u)), "fără prepost / pe zile: neschimbat");
});
// ---------------- (4) colectorul: tura de dimineață și cele intraday ----------------
const TS = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-sugestii-actiuni.mjs")).href);   // tura-sugestii.mjs = monedele (v100.85), alt modul
const UE = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "univers-eu.mjs")).href);
function cuUrcare(p0) { const b = linistit(60, p0); b.push(bara(60, p0 * 1.03, { v: 2000 })); return b; }
function cuRevers() { const b = []; for (let i = 0; i < 20; i++) b.push(bara(i, 100 + i)); for (let i = 20; i < 35; i++) b.push(bara(i, 119 - (i - 19) * 1.8)); b.push(bara(35, b[34].h * 1.01)); return b; }
await test("(4a) dimineața: listele US din barele aduse deja + EU (aduse acum; tickerul fără prețuri se numără), istoricul fiecărei reguli, baza pentru intraday, urmărirea înainte", async () => {
  const acumU = cuUrcare(100), acum = acumU[60].t + 10 * 3600000, cerute = [];
  const bareUS = new Map([["AAA_US_EQ", acumU], ["BBB_US_EQ", linistit(61, 50)]]);
  const r = await TS.sugestiiDimineata({ SA, bareUS, tickereEU: ["SAPd_EQ", "LIPSAd_EQ"], cereBare: async (tk) => { cerute.push(tk); return tk === "SAPd_EQ" ? cuRevers().map((x) => Object.assign({}, x, { t: x.t + 25 * ZI })) : null; },
    acum: acum + 25 * ZI, jurnal: () => {}, pauza: async () => {}, istoric: [{ zi: "2025-01-01", piata: "us", lista: "urcare", ticker: "AAA_US_EQ", pret: 50, t: T0 }] });
  assert.deepEqual(cerute, ["SAPd_EQ", "LIPSAd_EQ"]);
  assert.equal(r.raport.us.urcare.length, 1); assert.equal(r.raport.us.urcare[0].ticker, "AAA_US_EQ"); assert.equal(r.raport.us.urcare[0].simbol, "AAA");
  assert.equal(r.raport.eu.revers[0].ticker, "SAPd_EQ"); assert.equal(r.raport.eu.fara, 1); assert.equal(r.raport.us.judecate, 2);
  for (const p of ["us", "eu"]) for (const k of ["urcare", "revers", "gap"]) assert.ok(r.raport[p].dovada[k] && "verdict" in r.raport[p].dovada[k], p + " " + k);
  assert.ok(r.baza["AAA_US_EQ"].vol > 0 && r.baza["AAA_US_EQ"].inchidere > 0); assert.ok(r.baza["SAPd_EQ"]);
  assert.ok(r.istoric.some((x) => x.ticker === "AAA_US_EQ" && x.lista === "urcare" && x.zi !== "2025-01-01"), "lista de azi intră în istoric");
  assert.ok(r.raport.urmarire && r.raport.urmarire.us && r.raport.urmarire.us.urcare.n === 1, "intrarea veche (>14 zile) e judecată: " + JSON.stringify(r.raport.urmarire));
});
await test("(4b) intraday: pre-market US / gap EU pe baza de dimineață; tickerele fără rânduri se numără; lista e sortată după gap", async () => {
  const acum = Date.UTC(2026, 9, 6, 13, 0), rows = (g) => Array.from({ length: 12 }, (_, i) => ({ time: Date.UTC(2026, 9, 6, 12, i * 5), open: 100 * (1 + g), high: 100 * (1 + g), low: 100 * (1 + g), close: 100 * (1 + g), volume: 5000 }));
  const baza = { "A_US_EQ": { vol: 1e6, inchidere: 100 }, "B_US_EQ": { vol: 1e6, inchidere: 100 }, "C_US_EQ": { vol: 1e6, inchidere: 100 }, "D_US_EQ": { vol: 1e6, inchidere: 100 } };
  const r = await TS.sugestiiIntraday({ SA, piata: "us", baza, acum, pauza: async () => {}, jurnal: () => {}, cere5m: async (tk) => tk === "A_US_EQ" ? rows(0.03) : tk === "B_US_EQ" ? rows(0.05) : tk === "C_US_EQ" ? rows(0.005) : [] });
  assert.deepEqual(r.lista.map((x) => x.ticker), ["B_US_EQ", "A_US_EQ"]); assert.equal(r.judecate, 3); assert.equal(r.fara, 1); assert.ok(r.la > 0);
});
await test("(4c) universul EU: DAX 40 + CAC 40 + AEX 25 + ale lui (din istoricul T212), fără dubluri, doar burse cunoscute", () => {
  assert.equal(UE.DAX40.length, 40); assert.equal(UE.AEX25.length, 25); assert.ok(UE.CAC40.length >= 36);
  const u = UE.universEU([{ ticker: "RHMd_EQ" }, { ticker: "VUSAl_EQ" }, { ticker: "AAPL_US_EQ" }, { ticker: "WEED_CA_EQ" }, { ticker: "SAPd_EQ" }]);
  assert.ok(u.includes("VUSAl_EQ") && u.includes("RHMd_EQ")); assert.ok(!u.includes("AAPL_US_EQ") && !u.includes("WEED_CA_EQ")); assert.equal(u.length, new Set(u).size);
  const e = UE.universEU([{ ticker: "SMI3l_EQ" }, { ticker: "3SGGl_EQ" }, { ticker: "MET1l_EQ" }, { ticker: "FOXl_EQ" }]);
  assert.ok(!e.includes("SMI3l_EQ") && !e.includes("3SGGl_EQ") && !e.includes("MET1l_EQ"), "ETP-urile cu levier de la Londra (cifră în simbol) nu intră"); assert.ok(e.includes("FOXl_EQ"));
});
await test("(4d) colectorul: SugestiiActiuni încărcat, dimineața după idei, intraday la 10:20 (EU) și 15:50 (US) în zilele lucrătoare, o dată pe zi; fără rânduri azi ⇒ nu scrie peste lista bună", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const SugestiiActiuni = incarca\("sugestii-actiuni\.js", "SugestiiActiuni"\);/);
  assert.match(c, /import \{ sugestiiDimineata, sugestiiIntraday \} from "\.\/lib\/tura-sugestii-actiuni\.mjs";/); assert.match(c, /import \{ universEU \} from "\.\/lib\/univers-eu\.mjs";/);
  assert.match(c, /await trimite\("\/api\/t212\?action=sugestii", \{ sugestii: /); assert.match(c, /await trimite\("\/api\/t212\?action=premarket", /);
  assert.match(c, /async function turaSugestiiIntraday\(\)/); assert.match(c, /turaSugestiiIntraday\(\)\.catch\(/);
  const f = c.slice(c.indexOf("async function turaSugestiiIntraday()"), c.indexOf("async function turaSugestiiIntraday()") + 2500);
  assert.match(f, /10 \* 60 \+ 20/); assert.match(f, /sugEuZi/);   /* US: din deschiderea NY, nu 15:50 fix (R-I3) */ assert.match(f, /sugUsZi/); assert.match(f, /if \(r\.judecate > 0\)/);
});
await test("(4e) EU are și „Pe revenire” (regula existentă Reveniri.actiune) cu istoricul ei, când colectorul dă Reveniri", async () => {
  vm.runInThisContext(citeste("public", "lib", "reveniri.js"), { filename: "reveniri.js" });
  const R = await TS.sugestiiDimineata({ SA, Reveniri: globalThis.Reveniri, bareUS: new Map(), tickereEU: ["SAPd_EQ"], cereBare: async () => cuRevers(), acum: cuRevers()[35].t + 10 * 3600000, jurnal: () => {}, istoric: [] });
  assert.ok(Array.isArray(R.raport.eu.revine)); assert.ok(R.raport.eu.dovada.revine && typeof R.raport.eu.dovada.revine.text === "string");
  assert.equal(R.raport.us.revine, undefined, "US are deja „Pe revenire” din tura ideilor");
});
// ---------------- revizia Opus (C1, I1–I6, minorele) ----------------
await test("(R-C1) pre-market cu volum 0 (așa vin rândurile reale de la Yahoo, verificat 06.10): judecat pe gap + cel puțin 6 rânduri cu preț, volumul nu se cere", () => {
  const acum = Date.UTC(2026, 9, 6, 13, 0), r = [];
  for (let m = 0; m < 60; m += 5) r.push({ time: Date.UTC(2026, 9, 6, 12, m), open: 103, high: 103, low: 103, close: 103, volume: 0 });
  const p = SA.premarket(r, 100, 1e6, acum); assert.equal(p.da, true); assert.equal(p.volPct, null);
  assert.equal(SA.premarket(r.slice(0, 4), 100, 1e6, acum).da, false, "sub 6 rânduri cu preț: prea subțire");
});
await test("(R-I4) gap EU: fără un rând de după primele 20 de minute (Yahoo întârzie EU ~15 min) ⇒ „aștept”, nu „nu”; tura numără așteptările", async () => {
  const acum = Date.UTC(2026, 9, 6, 7, 20), d0 = Date.UTC(2026, 9, 6, 7, 0), r = [];
  for (let m = 0; m < 10; m += 5) r.push({ time: d0 + m * 60000, open: 103, high: 103, low: 103, close: 103, volume: 50000 });
  assert.equal(SA.gapEU(r, 100, 1e6, acum).asteapta, true);
  const t = await TS.sugestiiIntraday({ SA, piata: "eu", baza: { "SAPd_EQ": { vol: 1e6, inchidere: 100 } }, acum, cere5m: async () => r, jurnal: () => {} }); assert.equal(t.asteapta, 1); assert.equal(t.judecate, 0);
});
await test("(R-I2) urmărirea: același semnal (aceeași bară) intră o singură dată, chiar dacă tura rulează sâmbătă, duminică și luni", async () => {
  const b = cuUrcare(100), m = new Map([["AAA_US_EQ", b]]); let ist = [];
  for (const z of [1, 2, 3]) { const r = await TS.sugestiiDimineata({ SA, bareUS: m, tickereEU: [], cereBare: async () => null, acum: b[60].t + z * ZI, jurnal: () => {}, istoric: ist }); ist = r.istoric; }
  assert.equal(ist.filter((x) => x.ticker === "AAA_US_EQ").length, 1);
});
await test("(R-I5) textul spune sensul: „dovedit mai slab” / „la limită, mai bun”; fără istoric nu scrie „0%”", () => {
  const d = (st) => ({ n: 300, pePlus: 0.5, medie: 0.001, baza: { n: 5000, pePlus: 0.5, medie: 0.002 }, eticheta: "cam la fel", verdict: { stare: st } });
  assert.match(SA.textDovada(d("dovedit-rau"), "urcare"), /dovedit mai slab/); assert.match(SA.textDovada(d("la-limita-bun"), "urcare"), /la limită, mai bun/);
  assert.doesNotMatch(SA.textDovada({ n: 0, pePlus: null, medie: null, baza: { n: 0, pePlus: null, medie: null }, verdict: null }, "gap"), /0%/);
});
await test("(R-I6) istoricul gap-ului EU cumpără la ÎNCHIDEREA zilei (la 10:20 deschiderea a trecut); US rămâne la deschidere (lista e înainte de ea)", () => {
  const g = [bara(0, 100)]; for (let i = 1; i < 40; i++) g.push(bara(i, 100, { o: i === 20 ? 103 : 100 }));
  const pu = SA.puncte(g, "gap").find((q) => q.t === g[20].t), pe = SA.puncte(g, "gap", { intrare: "inchidere" }).find((q) => q.t === g[20].t);
  assert.ok(Math.abs(pu.r - (g[29].c / g[20].o - 1 - 0.003)) < 1e-12); assert.ok(Math.abs(pe.r - (g[29].c / g[20].c - 1 - 0.003)) < 1e-12);
  assert.match(citeste("scripts", "lib", "tura-sugestii-actiuni.mjs"), /SA\.puncte\(b, "gap", p === "eu" \? \{ intrare: "inchidere" \} : null\)/);
});
await test("(R-I1/I3) colectorul: baza are ziua ei și intraday rulează doar pe baza de azi; fereastra US = din deschiderea NY (−40 min), nu 15:50 fix; EU reîncearcă până vin primele 20 de minute", () => {
  const c = citeste("scripts", "colector.mjs"), f = c.slice(c.indexOf("async function turaSugestiiIntraday()"), c.indexOf("async function turaSugestiiIntraday()") + 3000);
  assert.match(c, /scrieAtomic\(SUG_BAZA_FIS, \{ zi, la: Date\.now\(\), tickere: s\.baza \}\)/);   // zi = ziua din România a turei de idei
  assert.match(f, /baza\.zi !== zi/); assert.match(f, /SugestiiActiuni\.deschidereNY\(acum\)/); assert.match(f, /deschNY - 40 \* 60000/);
  assert.match(f, /if \(r\.asteapta > 0 && min < 11 \* 60 \+ 20\) return;/);
});
await test("(R-min) textul urmăririi „de cel puțin 14 zile, la prețul de acum”; lista intraday veche își spune data; acțiunile tale din Elveția / Milano intră în EU", () => {
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /de cel puțin 14 zile, la prețul de acum/);
  assert.ok(UE.universEU([{ ticker: "NESNs_EQ" }, { ticker: "ENIm_EQ" }]).includes("NESNs_EQ") && UE.universEU([{ ticker: "ENIm_EQ" }]).includes("ENIm_EQ"));
  assert.equal(TS.simbolTicker("NESNs_EQ"), "NESN");
});
// ---------------- (5) pagina ----------------
for (const f of ["text-ro.js", "idei.js"]) { try { vm.runInThisContext(citeste("public", "lib", f), { filename: f }); } catch (e) {} }
globalThis.escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
vm.runInThisContext(citeste("public", "lib", "sugestii-ecran.js"), { filename: "sugestii-ecran.js" });
const dv = (n) => ({ n, pePlus: 0.51, medie: 0.004, baza: { n: 5000, pePlus: 0.5, medie: 0.001 }, eticheta: "cam la fel", verdict: { stare: "nedovedit" }, text: "După un început de urcare, pe 2 ani: 51% pe plus în 10 zile de bursă, +0,4% în medie (346 de cazuri); o zi oarecare: 50%, +0,1% - cam la fel, nedovedit." });
const DATE = {
  sugActiuni: { sugestii: { la: T0, zi: "2026-10-06", us: { judecate: 99, fara: 2, urcare: [{ ticker: "AAA_US_EQ", simbol: "AAA", pret: 103, ruptura: 0.021, volX: 2.3, schimbare: 0.03 }], revers: [], dovada: { urcare: dv(180), revers: dv(624), gap: dv(1704) } },
    eu: { judecate: 120, fara: 5, urcare: [], revers: [{ ticker: "MCp_EQ", simbol: "MC", pret: 560, cadere: 0.16, schimbare: 0.012 }], revine: [], dovada: { urcare: dv(346), revers: dv(594), gap: dv(1538), revine: dv(80) } },
    urmarire: { us: { urcare: { n: 0, pePlus: null, medie: null }, revers: { n: 3, pePlus: 0.66, medie: 0.012 } }, eu: { urcare: { n: 0 }, revers: { n: 0 } } } },
    premarket: { eu: { la: T0 + 3600000, lista: [{ ticker: "SAPd_EQ", simbol: "SAP", gap: 0.031, pret: 210, volPct: 0.05 }], judecate: 118, fara: 2 } } },
  idei: { idei: { zi: "2026-10-06", actiuni: [{ ticker: "NVDA_US_EQ", simbol: "NVDA", intrare: 180, stop: 170, tinta: 200, scor: 2 }], reveniri: [{ ticker: "INTU_US_EQ", simbol: "INTU", cadere: 0.24 }], judecate: 201, trecute: 24, dovadaReveniri: { n: 50, pePlus: 0.42, medie: -0.012, baza: { pePlus: 0.45, medie: 0.01 } } } },
  clasament: null, sugMonede: null };
await test("(5a) pagina: trei secțiuni (boți, US, EU), fiecare listă cu rândurile ei, istoricul pe 2 ani și urmărirea; pre-market-ul US se spune că vine la 15:50; totul escapat", () => {
  const h = globalThis.sugHtml(DATE, T0 + 2 * 3600000);
  for (const t of ["🤖 Boți", "📈 Acțiuni US", "📈 Acțiuni EU", "Început de urcare", "Revers timpuriu", "Pre-market", "Gap la deschidere", "Idei de cumpărare", "Pe revenire"]) assert.ok(h.includes(t), t);
  for (const t of ["AAA", "MC", "SAP", "NVDA", "INTU"]) assert.ok(h.includes(">" + t + "<"), t);
  assert.ok(h.includes("După un început de urcare, pe 2 ani"), "istoricul"); assert.match(h, /Urmărit înainte [^:]*: 3/); assert.match(h, /deschiderea de la New York/);
  assert.doesNotMatch(h, /undefined|NaN|null/);
  const r = globalThis.sugHtml(Object.assign({}, DATE, { idei: { idei: { actiuni: [{ ticker: "X", simbol: "<img src=x>" }] } } }), T0); assert.doesNotMatch(r, /<img src=x>/);
});
await test("(5a') din poză (06.10): fără steaguri (pe Windows ies litere), fără „scor 0” la boți (detaliile Tabloului), „se face la 15:50” o singură dată, prețurile cu virgulă", () => {
  const cl = { monede: [{ simbol: "LIT_USDT_PERP", stare: "candidat", latime: 0.06, profitGrila: 0.004, traversariZi: 3.2 }] };
  const h = globalThis.sugHtml(Object.assign({}, DATE, { clasament: cl, sugActiuni: { sugestii: DATE.sugActiuni.sugestii, premarket: null } }), T0);
  assert.doesNotMatch(h, /🇺🇸|🇪🇺/); assert.doesNotMatch(h, /scor 0/); assert.match(h, />LIT</); assert.match(h, /treceri pe zi/);
  assert.equal((h.match(/se face înainte de deschiderea de la New York/g) || []).length, 1); assert.match(h, /intrare 180,00/);
  const v = globalThis.sugHtml(DATE, T0 + 3 * ZI); assert.match(v, /la \d\d\.\d\d \d\d:\d\d/, "lista intraday de altă zi își spune data");
});
await test("(4f) EU „Pe revenire”: tickerul cu un salt de unitate (×100) iese și din istoricul regulii vechi (Reveniri n-are igiena; poza: +49,4% în medie)", async () => {
  vm.runInThisContext(citeste("public", "lib", "reveniri.js"), { filename: "reveniri.js" });
  const rau = cuRevers().map((x, i) => i === 5 ? Object.assign({}, x, { c: x.c * 100, o: x.o * 100, h: x.h * 100, l: x.l * 100 }) : x);
  const R = await TS.sugestiiDimineata({ SA, Reveniri: globalThis.Reveniri, bareUS: new Map(), tickereEU: ["RAUl_EQ"], cereBare: async () => rau, acum: rau[35].t + 10 * 3600000, jurnal: () => {}, istoric: [] });
  assert.equal(R.raport.eu.revine.length, 0); assert.ok(!R.raport.eu.dovada.revine.n, "seria cu salt nu intră în istoric");
  assert.equal(typeof SA.areSalt, "function");
});
await test("(5b) fără date: fiecare secțiune spune ce așteaptă (tura de la 8:00, clasamentul), nu cade", () => {
  const h = globalThis.sugHtml({}, T0); assert.match(h, /8:00/); assert.doesNotMatch(h, /undefined|NaN/);
});
await test("(5c) pagina în aplicație: secțiunea #sugestii, butonul în Zilnic după „Tabloul botului”, scripturile în ordine și în cache, navTo o pornește, butonul de pe Acasă, sertarul „More”", () => {
  const html = citeste("public", "index.html"), app = citeste("public", "app.js"), sw = citeste("public", "sw.js"), ac = citeste("public", "lib", "acasa-ecran.js");
  assert.match(html, /<section class="panel" id="sugestii">/); assert.match(html, /id="sugPagina"/);
  const z = html.slice(html.indexOf('id="sideZilnic"'), html.indexOf('id="sideUnelte"')); assert.ok(z.indexOf('data-nav="sugestii"') > z.indexOf('data-nav="tabloubot"') && z.indexOf('data-nav="sugestii"') < z.indexOf('data-nav="gridset"'));
  const i1 = html.indexOf('src="/lib/sugestii-actiuni.js"'), i2 = html.indexOf('src="/lib/sugestii-ecran.js"'); assert.ok(i1 > 0 && i2 > i1 && i1 > html.indexOf('src="/lib/carnet.js"') && i2 > html.indexOf('src="/lib/idei.js"'));
  assert.match(sw, /"\/lib\/sugestii-actiuni\.js"/); assert.match(sw, /"\/lib\/sugestii-ecran\.js"/);
  assert.match(app, /if\(id==="sugestii"\)\{if\(typeof sugPorneste==="function"\)sugPorneste\(false\)\}/); assert.match(html, /moreNav\('sugestii',true\)/);
  assert.match(ac, /navTo\(\\'sugestii\\',true\)/);
});
await test("(G) garda textelor: grupul „sugestii-act” (strict) cu istoricul fiecărei reguli în toate stările", () => {
  const g = citeste("scripts", "garda-texte.mjs"); assert.match(g, /import \{ situatiiSugestiiAct \} from "\.\/lib\/garda-sugestii-act\.mjs";/); assert.match(g, /"sugestii-act"\]\);/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
