// Proba v100.272-s (ideile auditului 29.10, felia 3 „acțiuni / T212 / Acasă” și felia 4 „serverul”) - fiecare reparație cu testul ei,
// care pica pe codul de dinainte (65bfc4f). Totul cu fetch / KV simulate: nicio cerere la Trading 212, Finnhub, Yahoo sau Twelve Data.
//  1. GridCalcul.bareBursa(randuri, acum, simbol): la Xetra / Londra bara de azi e în formare până la închiderea bursei LOR (nu după New York)
//  2. Acasă: „bursa e deschisă” cu sărbătorile NYSE; „se redeschide la HH:MM” din calendar (15:30 în săptămânile cu decalaj de oră);
//     „Regulile tale”: înainte / după deschidere pe ora New York-ului, la minut (16:00–16:29 la noi nu mai e „după deschidere”)
//  3. moneda acțiunii (€, £, pence, fără semn când nu se știe) în Consilierul poziției, în semafor și în planul Porții - nu mereu „$”
//  4. Rezultate: „doar N raportări” lângă mișcarea medie; coloana spune „Ziua reacției” (la „înainte de deschidere” e chiar ziua raportării)
//  5. citirile independente deodată: pagina T212, datele de rezultate pe Acasă și pe Scan (ActiuniSemnale.inParalel, cu limită)
//  6. batch_series Yahoo câte 4 deodată (nu 20 la rând)
//  7. cheile API în antet: Finnhub (X-Finnhub-Token), Twelve Data (Authorization: apikey …) - nu în URL
//  8. corpul cererii plafonat ÎNAINTE de citirea întreagă (Content-Length + citire plafonată): istoric-bot, t212, push, history
//  9. KV: t212:umpleri / t212:ordine cu plafon; planurile cu metadate (ultimulPlan / planuri fără o citire pe cheie), planul șters = cheie ștearsă
// Rulare: node scripts/proba-v100272-s.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); });
}
console.log("\nV100.272-s · AUDITUL 29.10 · acțiuni, T212, Acasă + serverul\n");

const TOKEN = "proba-token-1234567890";
const ZI = 86400000;
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
function context(extra) {
  const c = Object.assign({ console, Math, Object, Array, String, Number, JSON, isFinite, isNaN, Intl, Date, Promise, RegExp, Error, TextRo: globalThis.TextRo, setTimeout, clearTimeout, encodeURIComponent }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
function cuLib(fis, extra) { const c = context(extra); for (const f of fis) vm.runInContext(citeste("public", "lib", f), c, { filename: f }); return c; }
/* de la „function nume(” (sau „async function nume(”) la început de rând până la următoarea funcție de la început de rând */
function fnDin(src, nume) {
  let i = src.indexOf("\nfunction " + nume + "("); if (i < 0) i = src.indexOf("\nasync function " + nume + "(");
  assert.ok(i >= 0, "lipsește funcția " + nume);
  const j = src.slice(i + 12).search(/\n(async )?function /);
  return src.slice(i + 1, j < 0 ? undefined : i + 12 + j);
}
/* un getJSON care răspunde după o clipă și numără câte cereri sunt în zbor deodată (pe toate și pe un filtru) */
function getJSONcuCeas(raspuns, ms, filtru) {
  const st = { cereri: [], inZbor: 0, max: 0, inZborF: 0, maxF: 0, maxLaPrimaF: null };
  st.getJSON = async (u) => {
    st.cereri.push(u); const f = !filtru || filtru.test(u); if (f && st.maxLaPrimaF === null) st.maxLaPrimaF = st.max;
    st.inZbor++; st.max = Math.max(st.max, st.inZbor); if (f) { st.inZborF++; st.maxF = Math.max(st.maxF, st.inZborF); }
    try { await asteapta(ms || 10); const r = raspuns(u); if (r instanceof Error) throw r; return r; }
    finally { st.inZbor--; if (f) st.inZborF--; }
  };
  return st;
}

// =============== 1. bareBursa pe bursa simbolului ===============
const LG = cuLib(["grid-calcul.js", "calendar-bursa.js"]), G = LG.GridCalcul;
const zi = (iso, c) => ({ time: Date.parse(iso), open: c, high: c, low: c, close: c });
await test("1a. Xetra: bara de azi (30.10) e în formare cât Xetra e deschisă (13:00 Berlin, NY încă închis) și închisă după 17:30 Berlin (NY deschis)", () => {
  const r = [zi("2026-10-29T08:00:00Z", 1), zi("2026-10-30T08:00:00Z", 2)];
  assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-10-30T12:00:00Z"), "SAPd_EQ")).map((b) => b.c), [1], "13:00 Berlin: bara de azi a intrat ca închisă");
  assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-10-30T16:45:00Z"), "SAP.DE")).map((b) => b.c), [1, 2], "17:45 Berlin: bara închisă a fost aruncată (după ora New York-ului)");
  assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-10-31T10:00:00Z"), "SAPd_EQ")).map((b) => b.c), [1, 2], "sâmbătă: vinerea e închisă");
});
await test("1b. Londra: bara de azi în formare până la 16:30 Londra; după, închisă", () => {
  const r = [zi("2026-10-29T08:00:00Z", 1), zi("2026-10-30T08:00:00Z", 2)];
  assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-10-30T13:00:00Z"), "VUSAl_EQ")).map((b) => b.c), [1], "13:00 Londra: bara de azi a intrat ca închisă");
  assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-10-30T16:45:00Z"), "VUSA.L")).map((b) => b.c), [1, 2]);
});
await test("1c. NYSE și apelurile fără simbol: exact ca înainte (cazurile din acasa-v95)", () => {
  const r = [zi("2026-09-24T13:30:00Z", 1), zi("2026-09-25T13:30:00Z", 2)];
  for (const s of [undefined, "AAPL_US_EQ", "AAPL"]) {
    assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-09-26T12:00:00Z"), s)).map((b) => b.c), [1, 2], "sâmbătă " + s);
    assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-09-25T21:30:00Z"), s)).map((b) => b.c), [1, 2], "vineri seara " + s);
    assert.deepEqual(Array.from(G.bareBursa(r, Date.parse("2026-09-25T15:00:00Z"), s)).map((b) => b.c), [1], "vineri 11:00 NY " + s);
  }
  assert.deepEqual(Array.from(G.bareBursa(null, Date.now(), "SAPd_EQ")), []);
});
await test("1d. pagina T212 dă simbolul la bareBursa (pozițiile, ideile, Poarta); doar QQQ (NYSE) rămâne fără", () => {
  const src = citeste("public", "lib", "t212-ecran.js");
  const apeluri = src.split("\n").filter((l) => /GridCalcul\.bareBursa\(/.test(l));
  assert.ok(apeluri.length >= 4, "apelurile bareBursa: " + apeluri.length);
  const faraSimbol = apeluri.filter((l) => /GridCalcul\.bareBursa\([^()]*(\([^()]*\))?[^()]*,\s*Date\.now\(\)\)/.test(l) && !/QQQ_US_EQ/.test(l));
  assert.deepEqual(faraSimbol.map((l) => l.trim().slice(0, 120)), [], "apeluri fără simbol");
});

// =============== 2. Acasă: orele din CalendarBursa ===============
const AE = citeste("public", "lib", "acasa-ecran.js");
const LC = cuLib(["calendar-bursa.js"]);
await test("2a. acBursaDeschisa: Thanksgiving (26.11) e închis; miercuri la 11:00 NY deschis; sâmbăta închis", () => {
  vm.runInContext(fnDin(AE, "acBursaDeschisa"), LC);
  assert.equal(LC.acBursaDeschisa(new Date("2026-11-26T16:00:00Z")), false, "Thanksgiving la 11:00 NY: „deschisă”");
  assert.equal(LC.acBursaDeschisa(new Date("2026-10-28T15:00:00Z")), true);
  assert.equal(LC.acBursaDeschisa(new Date("2026-10-31T15:00:00Z")), false);
});
await test("2b. acOraRedeschidere: 15:30 în săptămâna cu decalaj (27–30.10), 16:30 după 1.11; sare peste Thanksgiving", () => {
  vm.runInContext(fnDin(AE, "acOraRedeschidere"), LC);
  const o = (iso) => LC.acOraRedeschidere(new Date(iso));
  assert.equal(o("2026-10-27T21:00:00Z"), "15:30", "marți seara ⇒ miercuri 28.10, ora României 15:30");
  assert.equal(o("2026-10-28T10:00:00Z"), "15:30", "miercuri dimineața ⇒ azi la 15:30");
  assert.equal(o("2026-10-30T21:00:00Z"), "16:30", "vineri seara ⇒ luni 2.11 (SUA a trecut la ora de iarnă)");
  assert.equal(o("2026-11-25T22:00:00Z"), "16:30", "miercuri înainte de Thanksgiving ⇒ vineri 27.11");
  assert.equal(o("2026-07-03T21:00:00Z"), "16:30");
});
await test("2c. rândul „bursa se redeschide” folosește ora din calendar, nu „16:30” scris de mână", () => {
  const l = AE.split("\n").find((x) => /bursa se redeschide/.test(x)) || "";
  assert.ok(/acOraRedeschidere\(/.test(l), l.trim().slice(0, 200));
  assert.ok(!/lucrătoare la 16:30/.test(l), "„la 16:30” încă scris de mână");
});
await test("2d. „Regulile tale”: 16:10 la noi (09:10 NY) e ÎNAINTE de deschidere; 15:45 în săptămâna cu decalaj (09:45 NY) e DUPĂ", () => {
  const LA = cuLib(["calendar-bursa.js", "actiuni-semnale.js"]), AS = LA.ActiuniSemnale;
  const zileNorm = ["05", "06", "07", "08", "09", "12", "13", "14", "15", "16", "19", "20", "21", "22", "23"].map((d) => "2026-10-" + d);
  const zileDecalaj = ["26", "27", "28", "29", "30"].map((d) => "2026-10-" + d);
  const tr = [];
  const ad = (iso, i) => tr.push({ id: "t" + tr.length, pornit: Date.parse(iso), rezultat: i % 2 ? 10 : -12, cost: 500 });
  for (let i = 0; i < 25; i++) ad(zileNorm[i % 15] + "T13:10:00Z", i);      // 16:10 la noi (EEST), 09:10 NY
  for (let i = 0; i < 15; i++) ad(zileDecalaj[i % 5] + "T13:45:00Z", i);    // 15:45 la noi (EET), 09:45 NY - după deschidere
  for (let i = 0; i < 20; i++) ad(zileNorm[i % 15] + "T17:00:00Z", i);      // 20:00 la noi, 13:00 NY
  for (let i = 0; i < 10; i++) ad(zileDecalaj[i % 5] + "T15:15:00Z", i);    // 17:15 la noi în săptămâna cu decalaj = 11:15 NY: trecuse prima oră și jumătate
  const r = AS.reguliPersonale(tr, "Europe/Bucharest", { R: 20 });
  const n = (re) => { const g = r.grupe.find((x) => re.test(x.grupa)); return g ? g.n : 0; };
  assert.equal(n(/înainte de deschidere/), 25, "„înainte de deschidere”: " + n(/înainte de deschidere/));
  assert.equal(n(/prima oră și jumătate după deschidere/), 15, "„prima oră și jumătate”: " + n(/prima oră și jumătate/));
  assert.equal(n(/după 18 \(17 în săptămânile cu decalaj de oră\)$/), 30, "„după 18” (după prima oră și jumătate de bursă): " + n(/după 18 \(17 în săptămânile cu decalaj de oră\)$/));   // v100.274: eticheta cu pragul din săptămânile cu decalaj
});

// =============== 3. moneda acțiunii ===============
const LM = cuLib(["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js", "consiliu.js"]), AS = LM.ActiuniSemnale, CO = LM.Consiliu;
await test("3a. ActiuniSemnale.monedaTicker + pretIn: metadatele T212 întâi, apoi bursa; Londra fără metadate = fără semn", () => {
  assert.equal(typeof AS.monedaTicker, "function", "lipsește ActiuniSemnale.monedaTicker"); assert.equal(typeof AS.pretIn, "function", "lipsește ActiuniSemnale.pretIn");
  assert.deepEqual(["AAPL_US_EQ", "AAPL", "BRK-B", "SAPd_EQ", "SAP.DE", "MCp_EQ", "VUSAl_EQ", "VUSA.L", "NESNs_EQ"].map((t) => AS.monedaTicker(t)), ["USD", "USD", "USD", "EUR", "EUR", "EUR", null, null, "CHF"]);
  assert.equal(AS.monedaTicker("VUSAl_EQ", { VUSAl_EQ: "GBp" }), "GBX"); assert.equal(AS.monedaTicker("VUSAl_EQ", { VUSAl_EQ: "USD" }), "USD");
  assert.deepEqual(["USD", "EUR", "GBP", "GBX", "CHF", null].map((m) => AS.pretIn(30.123, m)), ["$30.12", "€30.12", "£30.12", "30.12 p", "30.12 CHF", "30.12"]);
  assert.equal(AS.pretIn(null, "EUR"), "—");
});
const POZ = (o) => Object.assign({ sem: { nivel: "tine", componente: [] }, niv: { stopPozitie: 90 }, prob: [], sfaturi: [], plan: null, pret: 100, pretMediu: 95, qty: 10, costLei: null }, o);
await test("3b. Consilierul poziției: banii și stopul în moneda acțiunii (€ / pence ⇒ £ / fără semn), dolarii rămân la fel", () => {
  assert.equal(CO.alcatuiesteActiune(POZ({ simbol: "AAPL" })).bani, "dacă vinzi acum: +50,0 $ · dacă atinge stopul care urcă ($90.00): −50,0 $", "SUA s-a schimbat");
  assert.equal(CO.alcatuiesteActiune(POZ({ simbol: "SAP.DE", moneda: "EUR" })).bani, "dacă vinzi acum: +50,0 € · dacă atinge stopul care urcă (€90.00): −50,0 €");
  assert.equal(CO.alcatuiesteActiune(POZ({ simbol: "SAP.DE" })).bani, "dacă vinzi acum: +50,0 € · dacă atinge stopul care urcă (€90.00): −50,0 €", "fără moneda dată: din simbol");
  assert.equal(CO.alcatuiesteActiune(POZ({ simbol: "VUSA.L", moneda: "GBX", pret: 9000, pretMediu: 8500, niv: { stopPozitie: 8000 } })).bani, "dacă vinzi acum: +50,0 £ · dacă atinge stopul care urcă (8000.00 p): −50,0 £");
  const l = CO.alcatuiesteActiune(POZ({ simbol: "VUSA.L", ticker: "VUSAl_EQ" })).bani; assert.ok(!/[$€£]/.test(l), l);
  const at = CO.alcatuiesteActiune(POZ({ simbol: "SAP.DE", moneda: "EUR", pret: 85, niv: { stopPozitie: 90, stopAtins: true, sursaTrail: "−15% de la maxim" } }));
  assert.ok(at.motive.concat(at.rest).some((m) => /stopul care urcă \(€90\.00\)/.test(m.titlu)), JSON.stringify(at.motive.map((m) => m.titlu)));
});
await test("3c. semaforul poziției: stopul / ținta din plan în moneda acțiunii", () => {
  const st = { trend: { dir: "lateral", motive: ["x"] }, miscare: null, max7z: 120 };
  const s = AS.semafor({ ticker: "SAPd_EQ", simbol: "SAP.DE", pret: 85, pretMediu: 95, qty: 1, plan: { stop: 90 } }, st);
  assert.ok(s.motive.some((m) => /stopul din planul tău \(€90\.00\)/.test(m)), JSON.stringify(s.motive));
  const u = AS.semafor({ ticker: "AAPL_US_EQ", simbol: "AAPL", pret: 85, pretMediu: 95, qty: 1, plan: { stop: 90 } }, st);
  assert.ok(u.motive.some((m) => /stopul din planul tău \(\$90\.00\)/.test(m)), JSON.stringify(u.motive));
  const t = AS.semafor({ ticker: "SAPd_EQ", simbol: "SAP.DE", pret: 130, pretMediu: 95, qty: 1, plan: { tinta: 120 } }, st);
  assert.ok(/prețul de intrare \(€95\.00\)/.test(t.ceAsFace), t.ceAsFace);
});
await test("3d. planulMeu: moneda dată (o.moneda) în mesaj; fără ea, dolari ca înainte", () => {
  const e = AS.planulMeu({ intrare: 95, calc: { intrare: 95, stop: 100 }, moneda: "EUR" });
  assert.equal(e.eroare, "Intrarea ta (95,00 €) e sub stopul calculat (100,00 €): scrie-ți și stopul tău.");
  assert.equal(AS.planulMeu({ intrare: 95, calc: { intrare: 95, stop: 100 } }).eroare, "Intrarea ta (95,00 $) e sub stopul calculat (100,00 $): scrie-ți și stopul tău.");
});
await test("3e. pagina T212 dă moneda poziției Consilierului, semaforului (t212Pozitie) și planului Porții", () => {
  const src = citeste("public", "lib", "t212-ecran.js");
  assert.ok(/Consiliu\.alcatuiesteActiune\(\{[^\n]*moneda: /.test(src), "Consilierul fără moneda");
  assert.ok(/ActiuniSemnale\.planulMeu\(\{[^\n]*moneda: /.test(src), "planulMeu fără moneda");
  assert.ok(/function t212Pozitie\(x\) \{[\s\S]{0,600}moneda: t212MonedaPt\(tk\)/.test(src), "t212Pozitie fără moneda");
});

// =============== 4. Rezultate: puține raportări, ziua reacției ===============
const RZ = cuLib(["rezultate.js"]).Rezultate;
await test("4a. htmlIstoric: „doar 4 raportări” lângă mișcarea medie; coloana „Ziua reacției” + ce zi e", () => {
  const h = RZ.htmlIstoric({ s: "ABC", items: [{ data: "2026-07-22", ora: "bmo", reactie: 10, reactie5: 6 }, { data: "2026-04-22", ora: "amc", reactie: -4, reactie5: 1 }, { data: "2026-01-22", ora: "amc", reactie: 2, reactie5: 3 }, { data: "2025-10-22", ora: "bmo", reactie: -6, reactie5: -2 }] });
  assert.match(h, /Mișcarea medie după raport: 5,5% \(în orice direcție\) · 2 din 4 în sus/);
  assert.match(h, /doar 4 raportări/);
  assert.ok(!/>Ziua de după</.test(h), "antetul încă „Ziua de după”");
  assert.match(h, /<th class="num">Ziua reacției<\/th>/);
  assert.match(h, /ziua raportării când anunță înainte de deschidere/);
});
const RS = await import(`../functions/api/rezultate.js?t=${Math.random()}`);
const CHEIE_FH = "abcdefghij0123456789";
const fetchOrig = globalThis.fetch;
function graficYahoo(zileC) { const ts = Object.keys(zileC).sort().map((d) => Date.parse(d + "T13:30:00Z") / 1000); return { chart: { result: [{ timestamp: ts, indicators: { quote: [{ close: Object.keys(zileC).sort().map((d) => zileC[d]), open: Object.keys(zileC).sort().map((d) => zileC[d]) }] } }] } }; }
await test("4b (gardă, verde și înainte). serverul: „înainte de deschidere” ⇒ reacția ZILEI raportării; „după închidere” ⇒ a zilei de după", async () => {
  const cereri = [];
  globalThis.fetch = async (u, init) => {
    const url = String(u); cereri.push({ url, h: new Headers(init && init.headers || {}) });
    if (url.includes("finnhub.io") && url.includes("symbol=")) return new Response(JSON.stringify({ earningsCalendar: url.includes("from=" + new Date().toISOString().slice(0, 10)) ? [] : [{ date: "2026-07-22", hour: "bmo", epsActual: 1, epsEstimate: 1 }, { date: "2026-04-22", hour: "amc", epsActual: 1, epsEstimate: 1 }] }), { status: 200 });
    if (url.includes("finnhub.io")) return new Response(JSON.stringify({ earningsCalendar: [] }), { status: 200 });
    if (url.includes("api.nasdaq.com")) return new Response(JSON.stringify({ data: { earningsSurpriseTable: { rows: [] } } }), { status: 200 });
    if (url.includes("finance.yahoo.com")) return new Response(JSON.stringify(graficYahoo({ "2026-04-20": 39, "2026-04-21": 40, "2026-04-22": 50, "2026-04-23": 45, "2026-04-24": 45, "2026-07-20": 99, "2026-07-21": 100, "2026-07-22": 110, "2026-07-23": 99, "2026-07-24": 99 })), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  try {
    RS._golesteCache();
    const r = await RS.onRequestGet({ request: new Request("http://x.test/api/rezultate?action=istoric&s=ABC", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.4.1" } }), env: { APP_API_TOKEN: TOKEN, FINNHUB_API_KEY: CHEIE_FH } });
    const d = await r.json(), b = d.items.find((x) => x.data === "2026-07-22"), a = d.items.find((x) => x.data === "2026-04-22");
    assert.ok(b && a, JSON.stringify(d).slice(0, 300));
    assert.ok(Math.abs(b.reactie - 10) < 1e-9, "bmo: reacția zilei raportării (+10%), nu " + b.reactie);
    assert.ok(Math.abs(a.reactie + 10) < 1e-9, "amc: reacția zilei de după (−10%), nu " + a.reactie);
  } finally { globalThis.fetch = fetchOrig; }
});

// =============== 5. citirile deodată ===============
await test("5a. ActiuniSemnale.inParalel: cel mult n deodată, rezultatele în ordine, o eroare nu le oprește pe celelalte", async () => {
  assert.equal(typeof AS.inParalel, "function", "lipsește ActiuniSemnale.inParalel");
  let inZ = 0, max = 0;
  const r = await AS.inParalel([1, 2, 3, 4, 5, 6, 7], 3, async (x) => { inZ++; max = Math.max(max, inZ); await asteapta(5 + (x % 3) * 3); inZ--; if (x === 4) throw new Error("x"); return x * 10; });
  assert.equal(max, 3); assert.deepEqual(r, [10, 20, 30, undefined, 50, 60, 70]);
  assert.deepEqual(await AS.inParalel([], 4, async () => 1), []);
});
const ACUM_T = Date.now();
const bareT = () => { const b = []; let t = Date.parse(new Date(ACUM_T - 400 * ZI).toISOString().slice(0, 10) + "T13:30:00Z"), c = 100; while (b.length < 300) { const d = new Date(t).getUTCDay(); if (d && d < 6) { c *= 1.001; b.push({ time: t, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1e6 }); } t += ZI; } return b; };
function paginaT212(raspuns) {
  const el = {}, $ = (id) => el[id] || (el[id] = { id, value: "", innerHTML: "", textContent: "", hidden: false, scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; }, querySelectorAll: () => [], closest: () => null, getBoundingClientRect: () => ({ width: 700 }) });
  const G2 = getJSONcuCeas(raspuns, 12, /stiri\?action=actiune|action=rezultate|action=plan&|action=preturi/);
  const c = context({ $, getJSON: G2.getJSON, escapeHtml: (s) => String(s == null ? "" : s), toast() {}, apiFetch: async () => ({ ok: true, json: async () => ({}) }), verdictTrimite() {}, navTo() {},
    localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [], addEventListener() {} }, fetch: async () => ({ ok: false }) });
  for (const f of ["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js", "t212.js", "t212-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c, { filename: f });
  return { c, G: G2 };
}
await test("5b. pagina T212: cele 9 citiri de la pornire pleacă deodată; pe poziție cele 4 (știri, rezultate, plan, prețuri) deodată", async () => {
  const POZ3 = ["AAA_US_EQ", "BBB_US_EQ", "CCC_US_EQ"].map((ticker) => ({ ticker, quantity: 1, averagePrice: 100, currentPrice: 105, ppl: 5 }));
  const P = paginaT212((u) => {
    if (/action=cont/.test(u)) return { moneda: "RON", cash: { total: 10000, free: 5000 } };
    if (/action=pozitii/.test(u)) return { pozitii: POZ3 };
    if (/action=istoric/.test(u) && /t212/.test(u)) return { umpleri: [], stare: {} };
    if (/action=preturi/.test(u)) return { simbol: "X", randuri: bareT() };
    if (/action=rezultate/.test(u)) return { data: "2026-12-01" };
    if (/stiri/.test(u)) return { stiri: [] };
    if (/action=plan&/.test(u)) return { plan: null };
    if (/action=sfaturi/.test(u)) return { sfaturi: [] };
    return null;
  });
  await P.c.t212Porneste(true);
  const pornire = P.G.cereri.slice(0, 8);
  assert.ok(P.G.maxLaPrimaF >= 6, "la pornire, cel mult " + P.G.maxLaPrimaF + " cereri deodată (erau una după alta)");
  assert.ok(P.G.maxF >= 8, "pe poziții cel mult " + P.G.maxF + " deodată (4 pe poziție, câte 3 poziții)");
  for (const tk of ["AAA_US_EQ", "BBB_US_EQ", "CCC_US_EQ"]) { assert.ok(P.c.t212.bare[tk] && P.c.t212.bare[tk].length > 200, "barele " + tk); assert.ok(Array.isArray(P.c.t212.stiri[tk])); assert.ok(P.c.t212.rezultate[tk]); }
  assert.ok(P.c.t212.istoric && P.c.t212.sfaturiIst && P.c.t212.cont && P.c.t212.inLucru === false, "starea de după citire");
  assert.ok(pornire.some((u) => /action=istoric/.test(u)) && pornire.some((u) => /action=sfaturi/.test(u)), "citirile de la pornire: " + pornire.join(" | "));
});
function cuRezultate(tickere) {
  return (u) => {
    if (/action=pozitii/.test(u)) return { pozitii: tickere.map((ticker) => ({ ticker, quantity: 1 })) };
    if (/action=rezultate/.test(u)) { const tk = /ticker=([^&]+)/.exec(u)[1]; return { simbol: tk.split("_")[0], data: "2026-11-" + String(10 + tickere.indexOf(decodeURIComponent(tk))).padStart(2, "0"), sigur: true }; }
    return null;
  };
}
const TK7 = ["A_US_EQ", "B_US_EQ", "C_US_EQ", "D_US_EQ", "E_US_EQ", "F_US_EQ", "SAPd_EQ"];
await test("5c. Acasă: datele de rezultate (până la 12) câte 4 deodată, nu una după alta; lista iese aceeași, sortată", async () => {
  const L = cuLib(["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js"]);
  const G3 = getJSONcuCeas(cuRezultate(TK7), 12, /action=rezultate/);
  Object.assign(L, { getJSON: G3.getJSON, acasa: { la: 0, inLucru: false, piataLa: 0, piataInLucru: false, d: {} }, ACASA_MS: 300000, acasaDeseneaza() {}, acasaPiataCol() {}, intelApi: async () => null });
  vm.runInContext(AE.slice(AE.indexOf("async function acasaPorneste("), AE.indexOf("\nsetInterval(", AE.indexOf("async function acasaPorneste("))), L);
  await L.acasaPorneste(true);
  assert.ok(G3.maxF >= 3 && G3.maxF <= 4, "rezultate deodată: " + G3.maxF);
  assert.deepEqual(Array.from(L.acasa.d.rezultate.l, (x) => x.simbol), ["A", "B", "C", "D", "E", "F"]);
});
await test("5d. Scan: la fel, datele de rezultate câte 4 deodată", async () => {
  const SE = citeste("public", "lib", "scan-ecran.js");
  const L = cuLib(["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js"]);
  const G4 = getJSONcuCeas(cuRezultate(TK7), 12, /action=rezultate/);
  Object.assign(L, { getJSON: G4.getJSON, scanSt: { la: 0, inLucru: false, d: {} }, SCAN_MS: 300000, scanDeseneaza() {} });
  vm.runInContext(SE.slice(SE.indexOf("async function scanPorneste("), SE.indexOf("\nsetInterval(", SE.indexOf("async function scanPorneste("))), L);
  await L.scanPorneste(true);
  assert.ok(G4.maxF >= 3 && G4.maxF <= 4, "rezultate deodată: " + G4.maxF);
  assert.deepEqual(Array.from(L.scanSt.d.rezultate.l, (x) => x.simbol), ["A", "B", "C", "D", "E", "F"]);
});

// =============== 6. batch_series Yahoo în paralel ===============
await test("6. stocks batch_series fără cheie Twelve Data: câte 4 cereri Yahoo deodată; răspunsul în ordinea simbolurilor", async () => {
  let inZ = 0, max = 0, n = 0;
  globalThis.fetch = async (u) => {
    n++; inZ++; max = Math.max(max, inZ); await asteapta(15); inZ--;
    const ts = [1, 2, 3].map((i) => 1761000000 + i * 86400);
    return new Response(JSON.stringify({ chart: { result: [{ meta: { exchangeName: "NMS", currency: "USD" }, timestamp: ts, indicators: { quote: [{ open: [1, 2, 3], high: [1, 2, 3], low: [1, 2, 3], close: [1, 2, 3], volume: [5, 5, 5] }] } }] } }), { status: 200 });
  };
  try {
    const S = await import(`../functions/api/stocks.js?t=${Math.random()}`);
    const sim = ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II"];
    const r = await S.onRequestGet({ request: new Request("http://x.test/api/stocks?action=batch_series&tf=1d&symbols=" + sim.join(","), { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.6.1" } }), env: { APP_API_TOKEN: TOKEN } });
    const d = await r.json();
    assert.equal(r.status, 200, JSON.stringify(d).slice(0, 200)); assert.equal(n, 9);
    assert.ok(max > 1 && max <= 4, "Yahoo deodată: " + max);
    assert.deepEqual(Object.keys(d.data), sim); assert.ok(sim.every((s) => d.data[s].rows.length === 3));
  } finally { globalThis.fetch = fetchOrig; }
});

// =============== 7. cheile API în antet ===============
await test("7a. Finnhub: cheia în antetul X-Finnhub-Token, nu în URL (calendarul și istoricul)", async () => {
  const cereri = [];
  globalThis.fetch = async (u, init) => {
    const url = String(u); cereri.push({ url, h: new Headers(init && init.headers || {}) });
    if (url.includes("finnhub.io")) return new Response(JSON.stringify({ earningsCalendar: [{ symbol: "ABC", date: "2026-11-02", hour: "bmo", epsEstimate: 1 }] }), { status: 200 });
    if (url.includes("api.nasdaq.com")) return new Response(JSON.stringify({ data: { earningsSurpriseTable: { rows: [{ dateReported: "7/22/2026", eps: "1", consensusForecast: "1" }] } } }), { status: 200 });
    return new Response(JSON.stringify(graficYahoo({ "2026-07-21": 1, "2026-07-22": 1, "2026-07-23": 1 })), { status: 200 });
  };
  try {
    RS._golesteCache();
    const env = { APP_API_TOKEN: TOKEN, FINNHUB_API_KEY: CHEIE_FH };
    await RS.onRequestGet({ request: new Request("http://x.test/api/rezultate?action=calendar&zile=7", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.7.1" } }), env });
    await RS.onRequestGet({ request: new Request("http://x.test/api/rezultate?action=istoric&s=ABC", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.7.1" } }), env });
    const fh = cereri.filter((c) => c.url.includes("finnhub.io"));
    assert.equal(fh.length, 3, "cererile Finnhub: " + fh.length);
    for (const c of fh) { assert.ok(!/token=/.test(c.url), "cheia încă în URL: " + c.url.replace(CHEIE_FH, "…")); assert.equal(c.h.get("x-finnhub-token"), CHEIE_FH); }
  } finally { globalThis.fetch = fetchOrig; }
});
await test("7b. Twelve Data (prețurile T212): cheia în antetul Authorization: apikey …, nu în URL", async () => {
  const cereri = [];
  globalThis.fetch = async (u, init) => {
    const url = String(u); cereri.push({ url, h: new Headers(init && init.headers || {}) });
    if (url.includes("twelvedata.com")) return new Response(JSON.stringify({ values: [{ datetime: "2026-10-27", open: "1", high: "1", low: "1", close: "1", volume: "5" }, { datetime: "2026-10-28", open: "1", high: "1", low: "1", close: "1", volume: "5" }] }), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  try {
    const T = await import(`../functions/api/t212.js?t=${Math.random()}`);
    const r = await T.onRequestGet({ request: new Request("http://x.test/api/t212?action=preturi&interval=1d&ticker=ZZTD_US_EQ", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.7.2" } }), env: { APP_API_TOKEN: TOKEN, TWELVE_DATA_API_KEY: "tdcheie123" } });
    assert.equal(r.status, 200);
    const td = cereri.filter((c) => c.url.includes("twelvedata.com"));
    assert.equal(td.length, 1); assert.ok(!/apikey=/.test(td[0].url), "cheia încă în URL"); assert.equal(td[0].h.get("authorization"), "apikey tdcheie123");
  } finally { globalThis.fetch = fetchOrig; }
});

// =============== 8. corpul cererii, plafonat înainte de citire ===============
/* un corp de 4 MB fără Content-Length (flux), care numără cât s-a tras din el */
function fluxMare(bucati = 64, marime = 65536) {
  const st = { trase: 0 }; let i = 0;
  st.body = new ReadableStream({ pull(c) { if (i++ >= bucati) { c.close(); return; } st.trase += marime; c.enqueue(new Uint8Array(marime).fill(32)); } });
  return st;
}
const post = (cale, ip, o) => new Request("http://x.test" + cale, Object.assign({ method: "POST", duplex: "half", headers: Object.assign({ authorization: "Bearer " + TOKEN, "cf-connecting-ip": ip, origin: "http://x.test", "content-type": "application/json" }, o && o.headers || {}) }, o && o.body !== undefined ? { body: o.body } : {}));
function kvFals() {
  const m = new Map(), meta = new Map(), citite = [];
  return { m, meta, citite,
    get: async (k) => { citite.push(k); return m.has(k) ? m.get(k) : null; },
    put: async (k, v, o) => { m.set(k, String(v)); if (o && o.metadata !== undefined) meta.set(k, o.metadata); else meta.delete(k); },
    delete: async (k) => { m.delete(k); meta.delete(k); },
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => (meta.has(name) ? { name, metadata: meta.get(name) } : { name })), list_complete: true }) };
}
const IB = await import(`../functions/api/istoric-bot.js?t=${Math.random()}`);
const T2 = await import(`../functions/api/t212.js?t=${Math.random()}`);
const PU = await import(`../functions/api/push.js?t=${Math.random()}`);
const HI = await import(`../functions/api/history.js?t=${Math.random()}`);
const DB = { prepare: () => { const s = { bind: () => s, all: async () => ({ results: ["monitor_runs", "monitor_items", "research_snapshots", "signal_snapshots", "app_events"].map((name) => ({ name })) }), run: async () => ({ meta: { last_row_id: 1 } }) }; return s; }, batch: async () => [] };
const RUTE = [
  { nume: "istoric-bot (ferestre, 64 KB)", f: (r) => IB.onRequestPost({ request: r, env: { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() } }), cale: "/api/istoric-bot?action=ferestre", max: 65536 },
  { nume: "t212 (istoric, 256 KB)", f: (r) => T2.onRequestPost({ request: r, env: { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() } }), cale: "/api/t212?action=istoric", max: 262144 },
  { nume: "push (16 KB)", f: (r) => PU.onRequestPost({ request: r, env: { APP_API_TOKEN: TOKEN, PUSH_SUBSCRIPTIONS: kvFals() } }), cale: "/api/push?action=subscribe", max: 16384 },
  { nume: "history (2 MB)", f: (r) => HI.onRequestPost({ request: r, env: { APP_API_TOKEN: TOKEN, DB, ALLOW_BROWSER_HISTORY_WRITES: "1" } }), cale: "/api/history?action=event", max: 2097152, bucati: 160 }
];
let ipN = 10;
for (const R of RUTE) {
  await test("8. " + R.nume + ": Content-Length peste plafon ⇒ 413 fără citire; fluxul fără lungime se oprește la plafon (nu se citește tot)", async () => {
    const r1 = await R.f(post(R.cale, "10.72.8." + ipN++, { headers: { "content-length": String(R.max * 4 + 10) }, body: "{}" }));
    assert.equal(r1.status, 413, "Content-Length mare: " + r1.status);
    const fl = fluxMare(R.bucati || 64);
    const r2 = await R.f(post(R.cale, "10.72.8." + ipN++, { body: fl.body }));
    assert.equal(r2.status, 413, "flux mare: " + r2.status);
    assert.ok(fl.trase <= R.max * 3 + 3 * 65536, "s-au tras " + fl.trase + " octeți (plafonul " + R.max + ")");
  });
}
await test("8e. corpurile obișnuite trec la fel ca înainte (ferestre, istoric T212, push, history)", async () => {
  const kv = kvFals();
  const a = await IB.onRequestPost({ request: post("/api/istoric-bot?action=ferestre", "10.72.8.90", { body: JSON.stringify({ oferta: { simbol: "BTC_USDT_PERP", t: 1000, dir: "long" } }) }), env: { APP_API_TOKEN: TOKEN, ISTORIC: kv } });
  assert.equal(a.status, 200, await a.clone().text()); assert.equal(JSON.parse(kv.m.get("ferestre")).length, 1);
  const b = await T2.onRequestPost({ request: post("/api/t212?action=istoric", "10.72.8.91", { body: JSON.stringify({ ordine: ["1"], umpleri: [] }) }), env: { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() } });
  assert.equal(b.status, 200);
  const c = await PU.onRequestPost({ request: post("/api/push?action=subscribe", "10.72.8.92", { body: JSON.stringify({ endpoint: "https://p.test/e", keys: { p256dh: "x", auth: "y" } }) }), env: { APP_API_TOKEN: TOKEN, PUSH_SUBSCRIPTIONS: kvFals() } });
  assert.equal(c.status, 200, await c.clone().text());
  const d = await HI.onRequestPost({ request: post("/api/history?action=event", "10.72.8.93", { body: JSON.stringify({ type: "X", title: "proba" }) }), env: { APP_API_TOKEN: TOKEN, DB, ALLOW_BROWSER_HISTORY_WRITES: "1" } });
  assert.equal(d.status, 200, await d.clone().text());
  const e = await IB.onRequestPost({ request: post("/api/istoric-bot?action=ferestre", "10.72.8.94", { body: "{nu e json" }), env: { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() } });
  assert.equal(e.status, 400, "JSON invalid rămâne 400");
});

// =============== 9. KV care crește ===============
await test("9a. t212:umpleri / t212:ordine cu plafon: se păstrează cele mai noi; „noi” se numără înainte de tăiere", async () => {
  const lim = T2.T212_KV_MAX; assert.ok(lim && lim.umpleri > 0 && lim.ordine > 0, "lipsește T212_KV_MAX");
  const vechi = { umpleri: lim.umpleri, ordine: lim.ordine };
  try {
    lim.umpleri = 3; lim.ordine = 5;
    const kv = kvFals();
    const um = Array.from({ length: 8 }, (_, i) => ({ id: "u" + i, t: 1000 + i, side: "BUY", qty: 1, pret: 10, net: -10, ticker: "AAA_US_EQ" }));
    const r = await T2.onRequestPost({ request: post("/api/t212?action=istoric", "10.72.9.1", { body: JSON.stringify({ ordine: ["1008", "999", "1001", "1002", "1003", "1004", "1005", "1006", "1007"], umpleri: um }) }), env: { APP_API_TOKEN: TOKEN, ISTORIC: kv } });
    const d = await r.json();
    assert.equal(d.noi, 9); assert.equal(d.umpleri, 3);
    assert.deepEqual(JSON.parse(kv.m.get("t212:umpleri")).map((x) => x.id), ["u5", "u6", "u7"]);
    assert.deepEqual(JSON.parse(kv.m.get("t212:ordine")).sort(), ["1004", "1005", "1006", "1007", "1008"]);
  } finally { Object.assign(lim || {}, vechi); }
  assert.ok(T2.T212_KV_MAX.umpleri >= 20000 && T2.T212_KV_MAX.umpleri <= 40000, "plafonul umplerilor: " + T2.T212_KV_MAX.umpleri);
});
await test("9b. planurile: metadatele în listă ⇒ ultimulPlan / planuri fără o citire pe cheie; planul șters ⇒ cheia ștearsă; cheile vechi tot se citesc", async () => {
  const kv = kvFals(), env = { APP_API_TOKEN: TOKEN, ISTORIC: kv };
  const scrie = async (bot, plan, ip) => { const r = await IB.onRequestPost({ request: post("/api/istoric-bot?action=plan", ip, { body: JSON.stringify({ bot, plan }) }), env }); assert.equal(r.status, 200); await asteapta(3); };
  kv.m.set("plan:2380", JSON.stringify({ plus: 4, minus: 4, la: 1 }));   // o cheie de dinainte (fără metadate)
  await scrie("2390", { plus: 2, minus: 10 }, "10.72.9.2");
  await scrie("2391", { plus: 3, minus: 14, afaraOre: 12 }, "10.72.9.2");
  await scrie("t212-AAA_US_EQ", { stop: 5 }, "10.72.9.2");
  await scrie("proba-1", { plus: 9, minus: 9, proba: true }, "10.72.9.2");
  await scrie("2392", { plus: 1, minus: 1 }, "10.72.9.2");
  await scrie("2392", null, "10.72.9.2");
  assert.equal(kv.m.has("plan:2392"), false, "planul șters a rămas „null” în KV");
  const get = async (a) => (await IB.onRequestGet({ request: new Request("http://x.test/api/istoric-bot?action=" + a, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.72.9.3" } }), env })).json();
  kv.citite.length = 0;
  const u = await get("ultimulPlan");
  assert.equal(u.bot, "2391"); assert.deepEqual([u.plan.plus, u.plan.minus, u.plan.afaraOre], [3, 14, 12]); assert.ok(u.plan.la > 0);
  assert.deepEqual(kv.citite.filter((k) => k.startsWith("plan:")), ["plan:2380"], "citiri pe chei: " + kv.citite.join(", "));
  kv.citite.length = 0;
  const p = await get("planuri");
  assert.deepEqual(p.planuri.map((x) => x.bot), ["2380", "2390", "2391"]);
  assert.deepEqual(p.planuri[2].plan, { plus: 3, minus: 14, afaraOre: 12 });
  assert.deepEqual(kv.citite.filter((k) => k.startsWith("plan:")), ["plan:2380"]);
  const unul = await get("plan&bot=2391"); assert.equal(unul.plan.plus, 3, "citirea unui plan rămâne la fel");
  const gol = await get("plan&bot=2392"); assert.equal(gol.plan, null);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
