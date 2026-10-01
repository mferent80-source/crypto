// Proba v100.51 (01.10, el: „fă tot” - pachetul 4: graficul si autopsia, docs/superpowers/plans/2026-10-01-pachetul-4-graficul-si-autopsia.md).
// I-470 zona de valoare + pivotii confirmati (+ intrebarea din laborator); I-476 ziua obisnuita + liniile Consilierului pe grafic;
// I-477 perechile reale vs estimarea fisei + factorul pe moneda; I-478 autopsia sfaturilor gresite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const poate = (f, nume, par = [], arg = []) => { try { return new Function(...par, `${lib(f)}; return ${nume};`)(...arg); } catch (e) { return null; } };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const GP = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(G); globalThis.GridProba = GP;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();
const VA = poate("valoare.js", "Valoare"); if (VA) globalThis.Valoare = VA;
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const LAB = poate("grid-laborator.js", "GridLaborator", ["GridCalcul", "GridProba", "Valoare"], [G, GP, VA]);
const PER = poate("perechi.js", "Perechi", ["GridCalcul", "GridProba"], [G, GP]);
const JT = new Function("GridCalcul", `${lib("jurnal-trade.js")}; return JurnalTrade;`)(G); globalThis.JurnalTrade = JT;
const PR = new Function("GridCalcul", `${lib("probabilitati.js")}; return Probabilitati;`)(G); globalThis.Probabilitati = PR;
const OB = poate("obiceiuri.js", "Obiceiuri", ["GridCalcul", "GridProba", "JurnalTrade", "Probabilitati"], [G, GP, JT, PR]);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.51 · Graficul si autopsia: zona de valoare, ziua obisnuita, perechile, autopsia · proba\n");
const are = (x, nume) => assert.ok(x, "lipseste " + nume);

// ---- pasul 1: valoare.js (I-470) ----
await test("I-470 zona: 70% din volum in jurul POC; volumul lipsa -> dupa timp (TPO), spus pe fata", () => {
  are(VA, "valoare.js");
  const bare = []; for (let i = 0; i < 168; i++) { const p = 1 + 0.02 * Math.sin(i / 9); bare.push({ t: i * 3600000, o: p, h: p * 1.003, l: p * 0.997, c: p, v: i % 24 < 12 ? 100 : 10 }); }
  const z = VA.zona(bare, {}); assert.ok(z && z.val < z.poc && z.poc < z.vah && z.dupa === "volum", JSON.stringify(z)); assert.ok(z.acoperire >= 0.7 && z.acoperire < 0.8, String(z.acoperire));
  const fara = VA.zona(bare.map((b) => ({ ...b, v: null })), {}); assert.equal(fara.dupa, "timp");
  assert.equal(VA.zona(bare.slice(0, 10), {}), null);
});
await test("I-470 pivotii: doar CONFIRMATI (k bare dupa), varful de pe bara curenta nu intra; apropiati < 0,3% se comaseaza", () => {
  are(VA, "valoare.js");
  const p = [1, 1.01, 1.03, 1.01, 1, 0.98, 0.97, 0.98, 1, 1.02, 1.0301, 1.02, 1, 0.99, 1.05];
  const bare = p.map((c, i) => ({ t: i, o: c, h: c, l: c, c }));
  const v = VA.pivoti(bare, 2);
  assert.ok(v.some((x) => x.tip === "sus" && Math.abs(x.p - 1.03) < 0.002 && x.atingeri === 2), JSON.stringify(v));
  assert.ok(v.some((x) => x.tip === "jos" && x.p === 0.97)); assert.ok(!v.some((x) => x.p === 1.05), "ultima bara nu e confirmata");
});
await test("I-470 gridul fata de zona: cat din grid sta in zona de valoare si daca POC e in grid", () => {
  are(VA, "valoare.js");
  const f = VA.fataDeGrid({ poc: 1, vah: 1.02, val: 0.98 }, 0.99, 1.05);
  assert.ok(Math.abs(f.inZona - 0.5) < 1e-9); assert.equal(f.pocInGrid, true); assert.match(f.text, /50% din grid e în zona de valoare/);
});
await test("I-470 lumanarile pastreaza volumul (GridCalcul.bare), null cand lipseste", () => {
  const b = G.bare([{ time: 1, open: 1, high: 1.1, low: 0.9, close: 1, volume: 42 }, [2, 1, 1.1, 0.9, 1], [3, 1, 1.1, 0.9, 1, 5]]);   // ultima (in formare) cade
  assert.equal(b[0].v, 42); assert.equal(b[1].v, null);
});

// ---- pasul 2: graficul botului (I-476 + I-470) ----
await test("I-476 ziua obisnuita: banda P50/P75 pe 24 h de la pretul de acum, din profil; fara profil -> null", () => {
  are(GB.ziObisnuita, "GraficBot.ziObisnuita");
  const q = (a) => Array.from({ length: 21 }, (_, k) => a * k / 20);
  const z = GB.ziObisnuita(1, { z24: { jos: q(0.08), sus: q(0.06) }, simbol: "CRV_USDT_PERP", zile: 185 });
  assert.ok(Math.abs(z.p50Jos - 0.96) < 1e-9 && Math.abs(z.p75Jos - 0.94) < 1e-9 && Math.abs(z.p75Sus - 1.045) < 1e-9, JSON.stringify(z)); assert.match(z.sursa, /185 de zile/);
  assert.equal(GB.ziObisnuita(1, null), null);
});
await test("I-476/I-470 desen: banda zilei, zona de valoare, POC, pivotii DOAR cu comutatorul pornit; stopul planului mereu (e linie de Consilier)", () => {
  const bare = Array.from({ length: 60 }, (_, i) => ({ t: i * 9e5, o: 1, h: 1.01, l: 0.99, c: 1 + (i % 5) / 500, v: 10 }));
  const baza = { bare, W: 900, niv: [], grila: { jos: 0.95, sus: 1.05, linii: 11 }, zi: { p50Jos: 0.97, p75Jos: 0.95, p50Sus: 1.02, p75Sus: 1.04, sursa: "x" },
    val: { zona: { poc: 1, vah: 1.01, val: 0.99, dupa: "volum" }, pivoti: [{ p: 1.008, tip: "sus", atingeri: 2 }] }, consLinii: { stopAcum: 0.93, stopPlan: 0.945 } };
  const cu = GB.desen({ ...baza, st: { zi: true, val: true } }).svg, fara = GB.desen({ ...baza, st: { zi: false, val: false } }).svg;
  for (const c of ["gbZi", "gbVa", "gbPoc", "gbPivot"]) { assert.match(cu, new RegExp('class="' + c)); assert.ok(!new RegExp('class="' + c).test(fara), c + " fara comutator"); }
  assert.match(cu, /class="gbStopPlan/); assert.match(fara, /class="gbStopPlan/, "stopul planului e linie de Consilier, nu indicator");
});
await test("Tabloul: comutatoarele „Ziua obișnuită” si „Zona de valoare” in sistemul existent (aria-pressed, TB_IND_KEY)", () => {
  const html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(html, /id="tbInd-zi"[^>]*aria-pressed/); assert.match(html, /id="tbInd-val"[^>]*aria-pressed/);
  assert.match(app, /var d=\{bb:true,ema:true,rsi:true,vp:true,zi:true,val:true\}/); assert.match(app, /GraficBot\.ziObisnuita\(/); assert.match(app, /Valoare\.zona\(/);
  assert.match(app, /tbStare\.consLinii=/); assert.match(app, /Valoare\.fataDeGrid\(/);
});

// ---- pasul 3: laboratorul (I-470, ipoteza) ----
await test("I-470 laboratorul: intrebarea „valoare” - acelasi pret, grid ancorat VAL–VAH vs standard, doar cu informatia de la pornire", () => {
  are(LAB, "grid-laborator.js");
  const n = 30 * 96, b = Array.from({ length: n }, (_, i) => { const c = 1 + 0.03 * Math.sin(i / 40) + 0.01 * Math.sin(i / 7); return { t: i * 9e5, o: c, h: c * 1.002, l: c * 0.998, c, v: 50 + (i % 13) }; });
  const rows = LAB.ferestre(b, 2); assert.ok(rows.length && rows.some((r) => r.inValoare === true && typeof r.netVa === "number"), "niciun rand cu inValoare/netVa");
  const q = LAB.intrebari(rows, 2).filter((x) => x.id === "valoare")[0]; assert.ok(q, "lipseste intrebarea valoare"); assert.match(q.titlu, /zona de valoare/);
  const b2 = b.map((x) => ({ ...x })); b2[n - 1] = { ...b2[n - 1], h: 9, c: 9 };   // o bara din viitor schimbata nu are voie sa schimbe zona ferestrelor de dinainte
  assert.deepEqual(LAB.ferestre(b2, 2).slice(0, 5).map((r) => r.netVa), rows.slice(0, 5).map((r) => r.netVa));
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), /new Function\("GridCalcul", "GridProba", "Valoare"[^\n]*grid-laborator\.js/);
});

// ---- pasul 4: perechile reale vs estimarea fisei (I-477) ----
await test("I-477 estimarea: gridul botului mutat relativ pe ferestrele de DINAINTEA pornirii; sub 7 zile -> eroare", () => {
  are(PER, "perechi.js");
  const n = 20 * 96, b = Array.from({ length: n }, (_, i) => { const c = 1 + 0.01 * Math.sin(i / 3); return { t: i * 9e5, o: c, h: c * 1.001, l: c * 0.999, c }; });
  const o = { pornit: b[n - 1].t + 9e5, jos: 0.98, sus: 1.02, linii: 11, dir: "neutru", levier: 2, pretPornire: 1, H: 2 };
  const e = PER.estimare(b, o); assert.ok(e.peZi > 1 && e.zile >= 7, JSON.stringify(e));
  assert.match(PER.estimare(b, { ...o, pornit: b[5 * 96].t }).eroare, /7 zile/);
  assert.equal(PER.estimare(b.concat([{ t: o.pornit + 9e5, o: 5, h: 5, l: 5, c: 5 }]), o).peZi, e.peZi, "barele de dupa pornire nu intra");
});
await test("I-477 raportul real/estimat: sub o zi -> null; factorul pe moneda de la 10 boti, cu P25–P75", () => {
  are(PER, "perechi.js");
  assert.equal(PER.raport(0, 0, 12 * 3600000, { peZi: 4 }), null);
  const r = PER.raport(6, 0, 3 * 86400000, { peZi: 4 }); assert.equal(r.real, 2); assert.equal(r.raport, 0.5);
  assert.equal(PER.factor(Array.from({ length: 9 }, () => ({ raport: 0.6 }))).lipsa, 1);
  const f = PER.factor([0.2, 0.4, 0.5, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1.2].map((raport) => ({ raport }))); assert.equal(f.n, 10); assert.ok(Math.abs(f.factor - 0.65) < 1e-9, String(f.factor));
});
await test("I-477 Consilierul: sub jumatate din perechile asteptate -> motiv „perechi” (atentie); peste -> nimic", () => {
  const s = { nivel: "tine", cod: "tine", motiv: "nimic", faCe: "", componente: [] };
  const c = CS.alcatuieste({ sm: s, perechi: { real: 1.2, est: 4, raport: 0.3 } }); assert.equal(c.nivel, "atentie"); assert.equal(c.motive[0].cod, "perechi"); assert.match(c.motive[0].titlu, /1,2 perechi pe zi.*4/);
  assert.equal(CS.alcatuieste({ sm: s, perechi: { real: 3, est: 4, raport: 0.75 } }).nivel, "tine");
});
await test("I-477 rutele: estimarile pe bot si corectia pe moneda in KV; colectorul le face (turaPerechi), Tabloul le citeste", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=perechiEst", { est: { "2394": { simbol: "CRV_USDT_PERP", peZi: 4, la: 1 } } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=perechiEst"), env })).json()).est["2394"].peZi, 4);
  assert.equal((await mod.onRequestPost({ request: cer("POST", "action=perechiCorectie", { corectie: { CRV_USDT_PERP: { factor: 0.65, n: 10 } } }), env })).status, 200);
  assert.equal((await (await mod.onRequestGet({ request: cer("GET", "action=perechiCorectie"), env })).json()).corectie.CRV_USDT_PERP.factor, 0.65);
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8"), app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(col, /async function turaPerechi/); assert.match(col, /perechi: Perechi\.raport\(/); assert.match(app, /action=perechiCorectie/); assert.match(app, /perechi:tbPerechiPt\(b\)/);
  assert.equal(JT.din([{ strategyId: "9", base: "CRV", createTime: 1, closeTime: 2, buOrderType: "futures_grid", buOrderData: { exchangeOrderPairedCount: 7, totalRealizedProfit: 1 } }])[0]?.perechi ?? "fara-trade", 7);
});

// ---- pasul 5: autopsia sfaturilor gresite (I-478) ----
await test("I-478 noteaza pastreaza starea de atunci (jurnalele vechi raman fara ea)", () => {
  const l = SB.noteaza([], { nivel: "iesi", cod: "lichidare", motiv: "x" }, -3, 1000, { stare: "liniste-jos" }); assert.equal(l[0].stare, "liniste-jos");
  const v = SB.noteaza([], { nivel: "iesi", cod: "lichidare", motiv: "x" }, -3, 1000); assert.equal(v.length, 1); assert.equal(v[0].stare, undefined);
});
await test("I-478 autopsia: cele mai scumpe 3 sfaturi gresite ale saptamanii, cu starea si ce a urmat; tiparul repetat -> regula PROPUSA (ipoteza)", () => {
  are(OB && OB.autopsie, "Obiceiuri.autopsie");
  const Z = 86400000, acum = 40 * Z, e = (cod, nivel, total, dupa, zi, stare) => ({ t: acum - zi * Z - Z, cod, nivel, motiv: cod + " zice", total, totalDupa: dupa, dreptate: false, judecatLa: acum - zi * Z, stare });
  const log = [e("lichidare", "iesi", -3, 2.5, 1, "liniste-jos"), e("muta", "atentie", 1, 4, 2, "liniste-lateral"), e("tine", "tine", 2, -6, 3), e("muta", "atentie", 0, 1, 4, "liniste-lateral"), e("muta", "atentie", 0, 0.5, 12, "liniste-lateral"), { ...e("btc", "atentie", 0, -1, 2), dreptate: true },
    { ...e("muta", "atentie", 0, -1, 5, "liniste-lateral"), dreptate: true }, { ...e("muta", "atentie", 0, -2, 6, "liniste-lateral"), dreptate: true }];   // muta in liniste-lateral: 3 gresite din 5 (0,6)
  const a = OB.autopsie([{ id: "1", moneda: "CRV", log }], acum);
  assert.deepEqual(a.scumpe.map((x) => x.cod), ["tine", "lichidare", "muta"]); assert.equal(a.scumpe[0].cost, -8);
  assert.match(a.linii.join("\n"), /starea de atunci: nenotată/); assert.match(a.linii.join("\n"), /liniște, coboară încet/);
  assert.ok(a.tipar && a.tipar.cod === "muta" && a.tipar.gresite === 3, JSON.stringify(a.tipar)); assert.match(a.tipar.text, /ipoteză/); assert.match(a.tipar.text, /n-am schimbat nimic/);
  const r = OB.raportDuminica({ trades: [{ inchis: acum - Z, rezultat: 1, net: 1, grile: 1, pozitie: 0, comisioane: 0, funding: 0, greseli: [] }], acum, socoteala: {}, autopsie: a });
  assert.match(r.linii.join("\n"), /Autopsia săptămânii/);
  assert.equal(OB.autopsie([], acum).scumpe.length, 0);
});
await test("I-478 colectorul: noteaza cu starea fisei, pastreaza jurnalele pe moneda si da autopsia raportului de duminica", () => {
  const col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  assert.match(col, /SemnaleBot\.noteaza\(log, x\.semafor, b\.profitTotal, acum, \{ stare: Probabilitati\.stareDinRegim\(/);
  assert.match(col, /socotealaLoguri/); assert.match(col, /autopsie: Obiceiuri\.autopsie\(socotealaLoguri, acum\)/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
