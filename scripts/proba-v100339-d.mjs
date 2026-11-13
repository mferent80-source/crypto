// Proba v100.339-d (I-875): jurnalul notei TradingView cu bara în curs, ținut de colector (scripts/lib/tura-nota-tv.mjs) - o notare pe bară de
// 4 ore, la mijlocul ei; judecata după 4 bare cu prețul de atunci; nicio aruncare la o pană a scannerului; nimic în afară de citire.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { turaNotaTv, raportNotaTv, eVremea, felia, ORIZONT_MS, PAUZA_MS } from "./lib/tura-nota-tv.mjs";
import * as TV from "../functions/_shared/tv-note.js";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.339-d · jurnalul notei TradingView · proba\n");
const ORA = 3600000, BARA = 4 * ORA, T0 = Math.floor(Date.UTC(2026, 10, 14, 0) / BARA) * BARA;   // începutul unei bare de 4 ore
const rand = (s, close, n4h, nZ) => { const col = TV.tvColoane(); return { s, d: col.map((c) => (c === "name" ? s.split(":")[1] : c === "exchange" ? s.split(":")[0] : c === "close" ? close : c === "Recommend.All|240" ? n4h : c === "Recommend.All" ? nZ : 0) ) }; };
const lume = (randuri) => { const cereri = []; return { cereri, cere: async (c) => { cereri.push(c); return { data: typeof randuri === "function" ? randuri() : randuri }; } }; };

await test("o notare pe bară de 4 ore, abia de la mijlocul ei; a doua tură din aceeași bară nu mai notează și nu mai cere nimic", async () => {
  assert.equal(eVremea(null, T0 + ORA), false); assert.equal(eVremea(null, T0 + 2 * ORA + 1), true); assert.equal(eVremea({ felia: felia(T0) }, T0 + 3 * ORA), false);
  const L = lume([rand("PIONEX:ABCUSDT.P", 10, -0.4, 0.2)]);
  const devreme = await turaNotaTv({ acum: T0 + ORA, simboluri: ["ABC_USDT_PERP"], stare: null, cere: L.cere }); assert.equal(devreme.notate, 0); assert.equal(L.cereri.length, 0);
  const a = await turaNotaTv({ acum: T0 + 2 * ORA + 60000, simboluri: ["ABC_USDT_PERP", "ABC_USDT_PERP"], stare: devreme.stare, cere: L.cere });
  assert.equal(a.notate, 1); assert.equal(L.cereri.length, 1); assert.equal(L.cereri[0].piata, "global");
  const e = a.stare.jurnal[0]; assert.deepEqual({ s: e.s, tv: e.tv, tv4h: e.tv4h, tvZ: e.tvZ, p: e.p, d4: e.d4, dZ: e.dZ }, { s: "ABC_USDT_PERP", tv: "PIONEX:ABCUSDT.P", tv4h: -0.4, tvZ: 0.2, p: 10, d4: null, dZ: null });
  const b = await turaNotaTv({ acum: T0 + 3 * ORA, simboluri: ["ABC_USDT_PERP"], stare: a.stare, cere: L.cere }); assert.equal(b.notate, 0); assert.equal(L.cereri.length, 1, "nicio cerere în plus");
});
await test("judecata: după 16 ore pune prețul de atunci lângă nota de 4h, după 4 zile lângă cea de 1 zi; bilanțul numără doar notele cu direcție", async () => {
  let pret = 10; const L = lume(() => [rand("PIONEX:ABCUSDT.P", pret, -0.4, 0.2)]);
  let st = (await turaNotaTv({ acum: T0 + 2 * ORA + 1, simboluri: ["ABC_USDT_PERP"], stare: null, cere: L.cere })).stare;
  pret = 9; const dupa16 = await turaNotaTv({ acum: T0 + 2 * ORA + 1 + ORIZONT_MS["4h"] + ORA, simboluri: ["ABC_USDT_PERP"], stare: st, cere: L.cere }); st = dupa16.stare;
  assert.equal(st.jurnal[0].d4, 9); assert.equal(st.jurnal[0].dZ, null); assert.ok(dupa16.judecate >= 1);
  pret = 9.5; const dupa4z = await turaNotaTv({ acum: T0 + 2 * ORA + 1 + ORIZONT_MS["1D"] + ORA, simboluri: ["ABC_USDT_PERP"], stare: st, cere: L.cere }); st = dupa4z.stare;
  assert.equal(st.jurnal[0].dZ, 9.5);
  const r = raportNotaTv(st.jurnal.slice(0, 1)); assert.deepEqual(r["4h"], { n: 1, k: 1 }, "nota −0,4 și prețul a coborât: nimerit"); assert.deepEqual(r["1D"], { n: 1, k: 0 }, "nota +0,2 și prețul a coborât: ratat");
  assert.deepEqual(raportNotaTv([{ t: T0, s: "X", p: 10, tv4h: 0.05, d4: 11, tvZ: null, dZ: null }])["4h"], { n: 0, k: 0 }, "nota neutră nu se numără");
});
await test("scannerul picat sau moneda negăsită: nicio aruncare, nimic notat, bara rămâne de notat (după pauza de un sfert de oră)", async () => {
  const pica = await turaNotaTv({ acum: T0 + 3 * ORA, simboluri: ["ABC_USDT_PERP"], stare: null, cere: async () => { throw new Error("TradingView HTTP 429"); } });
  assert.equal(pica.notate, 0); assert.match(pica.eroare, /429/); assert.equal(pica.stare.felia, null); assert.equal(pica.stare.incercat, T0 + 3 * ORA);
  const lipsa = await turaNotaTv({ acum: T0 + 3 * ORA, simboluri: ["ABC_USDT_PERP", "ZZZ_EUR"], stare: null, cere: lume([]).cere }); assert.equal(lipsa.notate, 0); assert.equal(lipsa.stare.jurnal.length, 0);
  assert.equal((await turaNotaTv({ acum: T0 + 3 * ORA, simboluri: [], stare: null, cere: async () => { throw new Error("nu trebuia cerut"); } })).notate, 0);
});
// ---- revizia independentă (14.11): cererile la scanner sunt numărate ----
const MIN = 60000;
// ca în colector: starea (bara, clipa cererii, jurnalul) merge de la o tură la alta; turele vin din minut în minut
async function ture(deLa, panaLa, simboluri, stare, cere) { let st = stare, cerute = 0; for (let t = deLa; t <= panaLa; t += MIN) { const r = await turaNotaTv({ acum: t, simboluri, stare: st, cere }); if (r.cerut) cerute++; st = r.stare; } return { st, cerute }; }
await test("scanner care răspunde fără nimic de notat: O cerere pe bară, nu una pe minut (înainte: 115 din 115 ture)", async () => {
  const L = lume([]), r = await ture(T0 + 2 * ORA + MIN, T0 + 4 * ORA - MIN, ["ABC_USDT_PERP"], null, L.cere);
  assert.equal(L.cereri.length, 1, "cereri: " + L.cereri.length); assert.equal(r.cerute, 1); assert.equal(r.st.felia, felia(T0)); assert.equal(r.st.jurnal.length, 0);
});
await test("scanner picat: reîncearcă cel mult o dată la un sfert de oră, apoi notează când revine", async () => {
  let pica = true, n = 0; const cere = async () => { n++; if (pica) throw new Error("TradingView HTTP 503"); return { data: [rand("PIONEX:ABCUSDT.P", 10, -0.4, 0.2)] }; };
  const a = await ture(T0 + 2 * ORA + MIN, T0 + 3 * ORA, ["ABC_USDT_PERP"], null, cere); assert.ok(n >= 3 && n <= 4, "cereri într-o oră de pană: " + n); assert.equal(a.st.jurnal.length, 0);
  pica = false; const b = await ture(T0 + 3 * ORA + MIN, T0 + 4 * ORA - MIN, ["ABC_USDT_PERP"], a.st, cere); assert.equal(b.st.jurnal.length, 1, "notat după revenire"); assert.ok(n <= 6, "cereri în total: " + n);
  assert.equal(PAUZA_MS, 15 * MIN);
});
await test("nota a cărei monedă nu mai e în scanner: cerută cel mult la un sfert de oră, expiră la 2× orizontul și nu se mai cere (înainte: la fiecare tură, la nesfârșit)", async () => {
  let gol = false; const L = lume(() => (gol ? [] : [rand("PIONEX:ABCUSDT.P", 10, -0.4, 0.2)]));
  let st = (await turaNotaTv({ acum: T0 + 2 * ORA + 1, simboluri: ["ABC_USDT_PERP"], stare: null, cere: L.cere })).stare; assert.equal(st.jurnal.length, 1);
  gol = true; const t16 = T0 + 2 * ORA + 1 + ORIZONT_MS["4h"];   // botul s-a închis: nicio monedă de notat, doar nota veche de judecat
  const o = await ture(t16 + MIN, t16 + 3 * ORA, [], st, L.cere); assert.ok(o.cerute >= 11 && o.cerute <= 13, "cereri în 3 ore: " + o.cerute); assert.equal(o.st.jurnal[0].d4, null); assert.ok(!o.st.jurnal[0].x4);
  const inainte = L.cereri.length, e = await turaNotaTv({ acum: T0 + 2 * ORA + 1 + 2 * ORIZONT_MS["4h"], simboluri: [], stare: o.st, cere: L.cere });
  assert.equal(e.expirate, 1); assert.equal(e.stare.jurnal[0].x4, 1); assert.equal(e.stare.jurnal[0].d4, null); assert.equal(L.cereri.length, inainte, "la expirare nu mai cere");
  const dupa = await ture(T0 + 2 * ORA + 1 + 2 * ORIZONT_MS["4h"] + MIN, T0 + 2 * ORA + 1 + 2 * ORIZONT_MS["4h"] + 2 * ORA, [], e.stare, L.cere); assert.equal(dupa.cerute, 0, "nota expirată nu se mai cere");
  assert.deepEqual(raportNotaTv(e.stare.jurnal)["4h"], { n: 0, k: 0 }, "nota expirată nu intră în bilanț");
  // nota judecată târziu, dar înăuntrul ferestrei (colectorul oprit câteva ore), se judecă; peste 2× orizontul nu
  gol = false; const tarziu = await turaNotaTv({ acum: T0 + 2 * ORA + 1 + ORIZONT_MS["4h"] + 5 * ORA, simboluri: [], stare: { felia: st.felia, incercat: null, jurnal: [{ t: T0 + 2 * ORA + 1, s: "ABC_USDT_PERP", tv: "PIONEX:ABCUSDT.P", tv4h: -0.4, tvZ: 0.2, p: 10, d4: null, dZ: null }] }, cere: L.cere }); assert.equal(tarziu.stare.jurnal[0].d4, 10); assert.equal(tarziu.judecate, 1);   /* intrare nouă: cea din stare e aceeași referință și a expirat mai sus */
});
await test("colectorul: jurnalul notei are fișierul lui (nu se rescrie cu ritmul), iar bara și clipa cererii se țin minte și când n-a avut ce nota", () => {
  const C = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n"), i = C.indexOf("async function turaNotaTvColector()"), f = C.slice(i, C.indexOf("\n}\n", i));
  assert.match(C, /const NOTA_TV_FIS = path\.join\(DATA, "nota-tv\.json"\);/); assert.match(f, /scrieAtomic\(NOTA_TV_FIS, notaTvJurnal\)/);
  assert.match(f, /if \(r\.stare\.felia !== stV\.felia \|\| r\.stare\.incercat !== stV\.incercat\) tineRitm\("notaTv", \{ felia: r\.stare\.felia, incercat: r\.stare\.incercat \}\);/);
  assert.doesNotMatch(f, /tineRitm\("notaTv", r\.stare\)/, "jurnalul nu mai intră în ritm");
});
await test("colectorul: tura e legată cu .catch, ține starea în ritm („notaTv”), cere doar scannerul public și nu trimite nimic pe Discord", () => {
  const C = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8").replace(/\r\n/g, "\n"), i = C.indexOf("async function turaNotaTvColector()"); assert.ok(i > 0, "turaNotaTvColector lipsește");
  const f = C.slice(i, C.indexOf("\n}\n", i)); assert.match(f, /tineRitm\("notaTv"/); assert.match(f, /https:\/\/scanner\.tradingview\.com\//); assert.doesNotMatch(f, /trimiteAlerta|trimite\(/);
  assert.match(C, /turaNotaTvColector\(\)\.catch\(\(e\) => jurnal\("nota tv", e\.message\)\)/); assert.match(C, /const VERSIUNE_COLECTOR = "v101\.(17[8-9]|1[89]\d|[2-9]\d\d)"/);
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
