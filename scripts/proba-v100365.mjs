// Proba v100.365 (19.11.2026, el: „MAI DEPARTE?” ⇒ Salt „ca Jurnalul”; hotărârile LUI după auditul cu 2 revizori: ideile „spun cinstit +
// urmăresc”, listele „față de aceeași zi”, aspectul „ca paginile refăcute”, toate 4 graficele; bugurile B1–B5 reparate fără întrebare).
//  Y  - B1: Yahoo dă bara zilei la Xetra / Paris / Londra cu close: null după închidere ⇒ ruta o arunca și „Acum / Ieri” era de alaltăieri
//  K  - B5: KV-ul citit cu eroare nu mai e „listă goală” (pagina / colectorul / „Adaugă” scriau peste lista bună)
//  D  - listele față de ACEEAȘI zi (Salt.dovadaZi), cu interval pe blocuri de 28 de zile; H0 nu dă „dovedit” mai des de ~5 %
//  U  - registrul zilnic al ideilor (Salt.pozaZi / Salt.urmarire): excesul ideilor față de lista Salt din aceeași zi, după ~20 de zile de bursă
//  C  - tura colectorului: poza zilnică, urmărirea și dovada pe aceeași zi în raport; ideile NU mai sunt ordonate / tăiate după scor
//   node scripts/proba-v100365.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["salt.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Salt: S } = globalThis;
const ZI = 86400000, T0 = Date.UTC(2025, 0, 6, 8);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
console.log("V100.365 · Salt cinstit\n");

// ---------------- (Y) ruta: bara zilei cu close null ----------------
function kvFals(rau) { const m = new Map(); return { m, get: async (k) => { if (rau && rau(k)) throw new Error("KV stricat"); return m.has(k) ? m.get(k) : null; }, put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "t".repeat(40);
const cheama = async (env, metoda, qs, corp) => { const mod = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.9." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env }); return { status: res.status, d: await res.json().catch(() => null) }; };
async function cuYahoo(raspuns, f) { const vechi = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify(raspuns), { status: 200, headers: { "content-type": "application/json" } }); try { return await f(); } finally { globalThis.fetch = vechi; } }
const t17 = Date.UTC(2026, 10, 17, 8) / 1000, t18 = Date.UTC(2026, 10, 18, 8) / 1000;
await test("Y B1: ultima bară cu close null (Yahoo după închiderea la EU) ⇒ închiderea = regularMarketPrice din aceeași zi; high / low o cuprind", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const yh = { chart: { result: [{ meta: { regularMarketPrice: 21.78, regularMarketTime: Date.UTC(2026, 10, 18, 16, 35) / 1000 }, timestamp: [t17, t18],
    indicators: { quote: [{ open: [21.9, 22.1], high: [22.2, 22.52], low: [21.7, 21.8], close: [22.08, null], volume: [10, null] }] } }] } };
  const r = await cuYahoo(yh, () => cheama(env, "GET", "action=preturi&yahoo=EVK.DE&interval=1d"));
  assert.equal(r.status, 200, JSON.stringify(r.d)); const l = r.d.randuri || r.d.bare || r.d.klines;
  assert.ok(Array.isArray(l), Object.keys(r.d).join(",")); assert.equal(l.length, 2, "bara din 18.11 nu se mai aruncă");
  const u = l[l.length - 1]; assert.equal(u.close, 21.78); assert.ok(u.low <= 21.78 && u.high >= 21.78); assert.equal(u.open, 22.1);
});
await test("Y B1: close null la o bară din MIJLOC sau prețul pieței din altă zi ⇒ bara rămâne aruncată (fără prețuri inventate)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const yh = { chart: { result: [{ meta: { regularMarketPrice: 21.78, regularMarketTime: Date.UTC(2026, 10, 19, 16, 35) / 1000 }, timestamp: [t17, t18],
    indicators: { quote: [{ open: [21.9, 22.1], high: [22.2, 22.52], low: [21.7, 21.8], close: [null, null], volume: [10, null] }] } }] } };
  const r = await cuYahoo(yh, () => cheama(env, "GET", "action=preturi&yahoo=EVK.DE&interval=1d"));
  assert.ok(r.status === 200 || r.status === 404, String(r.status)); const l = (r.d && (r.d.randuri || r.d.bare)) || [];
  assert.equal(l.length, 0, JSON.stringify(l));
});

// ---------------- (K) B5: KV citit cu eroare ----------------
await test("K B5: lista Salt necitită ⇒ GET salt dă 503 (nu „pozitii: []”), iar „Adaugă” NU scrie peste ea", async () => {
  const kv = kvFals((k) => k === "t212:salt-pozitii"), env = { APP_API_TOKEN: TOKEN, ISTORIC: kv };
  kv.m.set("t212:salt-pozitii", JSON.stringify([{ isin: "US0231351067", simbol: "AMZN", qty: 10, pretMediu: 180 }]));
  const g = await cheama(env, "GET", "action=salt"); assert.equal(g.status, 503, JSON.stringify(g.d)); assert.match(g.d.error, /pozițiile Salt/);
  const p = await cheama(env, "POST", "action=saltPoz", { pune: { isin: "DE000A1EWWW0", simbol: "ADS.DE", nume: "adidas", qty: 3, pretMediu: 170, de: "2026-11-01" } });
  assert.equal(p.status, 503, JSON.stringify(p.d)); assert.equal(JSON.parse(kv.m.get("t212:salt-pozitii")).length, 1, "lista bună a rămas");
  const s = await cheama(env, "POST", "action=saltPoz", { scoate: "US0231351067" }); assert.equal(s.status, 503); assert.equal(JSON.parse(kv.m.get("t212:salt-pozitii")).length, 1);
});
await test("K B5: cheia lipsă (nicio poziție scrisă încă) rămâne listă goală - nu e eroare", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const g = await cheama(env, "GET", "action=salt"); assert.equal(g.status, 200); assert.deepEqual(g.d.pozitii, []);
  const p = await cheama(env, "POST", "action=saltPoz", { pune: { isin: "DE000A1EWWW0", simbol: "ADS.DE", nume: "adidas", qty: 3, pretMediu: 170, de: "2026-11-01" } }); assert.equal(p.status, 200); assert.equal(p.d.pozitii.length, 1);
});

// ---------------- (D) listele față de aceeași zi ----------------
// 60 de instrumente, 300 de zile; ziua are un „vânt” comun mare (toate se mișcă împreună); semnalul cade în zilele cu vânt bun
function lume(rnd, efect, cuVantPeSemnal) {
  const serii = []; const vant = Array.from({ length: 300 }, () => (rnd() - 0.5) * 0.08);
  for (let k = 0; k < 60; k++) { const puncte = []; for (let z = 0; z < 300; z++) { const semnal = cuVantPeSemnal ? vant[z] > 0.02 && rnd() < 0.3 : rnd() < 0.03; puncte.push({ t: T0 + z * ZI, r: vant[z] + (rnd() - 0.5) * 0.06 + (semnal ? efect : 0), semnal }); } serii.push({ ticker: "S" + k, puncte }); }
  return serii;
}
await test("D dovadaZi: semnalul care doar prinde zilele bune ale pieței NU iese dovedit față de aceeași zi (față de „o zi oarecare” ar fi ieșit)", () => {
  const d = S.dovadaZi(lume(mulberry32(1), 0, true));
  assert.ok(d.n >= 30 && d.blocuri >= 8, JSON.stringify(d)); assert.ok(Math.abs(d.medie) < 0.01, String(d.medie)); assert.equal(d.verdict, "n-am-aflat");
  assert.ok(d.lo < 0 && d.hi > 0); assert.ok(Array.isArray(d.serie) && d.serie.length === d.blocuri && d.serie.every((b) => b.t > 0 && b.n > 0 && Number.isFinite(b.m)));
});
await test("D dovadaZi: un avantaj real de +2 % față de aceeași zi iese „peste”; puține cazuri ⇒ „prea-putine”, fără medie", () => {
  const d = S.dovadaZi(lume(mulberry32(2), 0.02, false)); assert.equal(d.verdict, "peste", JSON.stringify(d)); assert.ok(d.lo > 0 && Math.abs(d.medie - 0.02) < 0.006);
  const p = S.dovadaZi([{ ticker: "A", puncte: [{ t: T0, r: 0.1, semnal: true }] }]); assert.equal(p.verdict, "prea-putine"); assert.equal(p.medie, null);
  const sem = new Set([0, 1, 2, 20]), mic = [{ ticker: "A", puncte: Array.from({ length: 26 }, (_, z) => ({ t: T0 + z * ZI, r: 0.01, semnal: sem.has(z) })) }, { ticker: "B", puncte: Array.from({ length: 26 }, (_, z) => ({ t: T0 + z * ZI, r: 0, semnal: false })) }];
  const o1 = { minZi: 2, minN: 1, minBlocuri: 1 };
  assert.equal(S.dovadaZi(mic, o1).n, 4); assert.equal(S.dovadaZi(mic, { ...o1, pauzaZile: 14 }).n, 2, "zilele 0 și 20: o cădere = un caz (ca regula listei)");
});
await test("D dovadaZi sub H0 (semnale amestecate între instrumente în aceeași zi, 400 de lumi, mulberry32 sămânța 20261119): fals „dovedit” ≤ 8 %", () => {
  const rnd = mulberry32(20261119); let fals = 0; const L = 400;
  for (let w = 0; w < L; w++) { const s = lume(rnd, 0, false), d = S.dovadaZi(s, { minN: 30 }); if (d.verdict === "peste" || d.verdict === "sub") fals++; }
  assert.ok(fals / L <= 0.08, "fals dovedit " + (fals / L * 100).toFixed(1) + " %");
});
await test("D textDovadaZi: spune reperul (aceleași zile), orizontul, intervalul, cazurile; „n-am aflat”, nu „cam la fel”; procente cu spațiu", () => {
  const t = S.textDovadaZi(S.dovadaZi(lume(mulberry32(3), 0, true)), "urcare");
  assert.match(t, /față de celelalte instrumente Salt în aceleași zile/); assert.match(t, /10 zile/); assert.match(t, /n-am aflat/); assert.doesNotMatch(t, /cam la fel|\d%/);
  assert.match(S.textDovadaZi({ verdict: "prea-putine", n: 4 }, "revine"), /prea puține/);
});

// ---------------- (U) registrul zilnic al ideilor ----------------
const zi = (k) => new Date(Date.UTC(2026, 0, 5) + k * ZI).toISOString().slice(0, 10);
function poze(efect, nZile) {
  const rnd = mulberry32(7), pret = {}, l = []; for (let i = 0; i < 80; i++) pret["U" + i] = 100;
  for (let k = 0; k < nZile; k++) {
    const univ = Object.keys(pret).map((s) => [s, Math.round(pret[s] * 100) / 100]), idei = Object.keys(pret).slice((k * 3) % 70, (k * 3) % 70 + 8).map((s) => ({ s, p: pret[s] }));
    l.push({ zi: zi(k), la: Date.parse(zi(k) + "T08:00:00Z"), idei, univ });
    const vant = (rnd() - 0.5) * 0.04; for (const s of Object.keys(pret)) pret[s] *= 1 + vant + (rnd() - 0.5) * 0.03 + (idei.some((x) => x.s === s) ? efect : 0);
  }
  return l;
}
await test("U pozaZi: din raportul turei - ziua, ideile (simbol + preț), universul compact [simbol, preț]; fără idei sau fără tabel ⇒ null", () => {
  const p = S.pozaZi({ la: Date.UTC(2026, 10, 19, 6, 9), idei: [{ simbol: "MRNA", pret: 196.79, intrare: 196.79 }], tabel: [{ simbol: "MRNA", pret: 196.79 }, { simbol: "EVK.DE", pret: 21.78 }, { simbol: "X", pret: null }] });
  assert.deepEqual(p, { zi: "2026-11-19", la: Date.UTC(2026, 10, 19, 6, 9), idei: [{ s: "MRNA", p: 196.79 }], univ: [["MRNA", 196.79], ["EVK.DE", 21.78]] });
  assert.equal(S.pozaZi({ la: 1, idei: [], tabel: [] }), null);
});
await test("U urmarire: ideile judecate după 28 de zile față de universul din aceeași zi; avantaj 0 ⇒ medie ~0; puține zile ⇒ „prea-putine” cu cât mai e", () => {
  const u0 = S.urmarire(poze(0, 200)); assert.ok(u0.judecate > 100, JSON.stringify(u0).slice(0, 300)); assert.ok(Math.abs(u0.medie) < 0.03, String(u0.medie)); assert.equal(u0.deLa, zi(0));
  assert.ok(u0.serie.length === u0.blocuri && u0.serie.every((b) => Number.isFinite(b.m)));
  const u1 = S.urmarire(poze(0, 20)); assert.equal(u1.judecate, 0); assert.equal(u1.verdict, "prea-putine"); assert.equal(u1.poze, 20); assert.equal(u1.primaJudecataZi, zi(28));
  assert.equal(S.urmarire([]).verdict, "prea-putine");
});
await test("U textUrmarire: de când, câte zile judecate, ce s-a aflat, cât mai trebuie (+2 % ⇒ ~1,4 ani)", () => {
  assert.match(S.textUrmarire(S.urmarire(poze(0, 20)), Date.parse(zi(20))), /Urmăresc ideile din 05\.01\.2026.*prima judecată.*02\.02\.2026/);
  assert.match(S.textUrmarire(S.urmarire(poze(0, 200)), Date.parse(zi(200))), /zile judecate/);
});

// ---------------- (C) tura colectorului ----------------
const ts = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-salt.mjs")).href);
await test("C tura: poza zilnică scrisă o dată, urmărirea din toate pozele în raport; dovada listelor pe aceeași zi (dovada.k.zi); ideile ordonate după ținta în 5 zile, NU după scor", async () => {
  const scrise = [], vechi = poze(0, 3);
  const bare = (k) => Array.from({ length: 140 }, (_, i) => ({ t: T0 + i * ZI, o: 100 + i * 0.1 + k, h: 101 + i * 0.1 + k, l: 99 + i * 0.1 + k, c: 100.5 + i * 0.1 + k }));
  const r = await ts.turaSalt({ Salt: S, SA: { puncte: () => [{ t: T0, r: 0.01, semnal: true }], azi: () => null, dovada: () => ({ n: 1, pePlus: 1, medie: 0.01, baza: {}, eticheta: "", verdict: {} }), textDovada: () => "vechi", areSalt: () => false },
    Idei: { judecaActiune: (b, p, o) => ({ trece: true, scor: o.simbol === "A" ? 9 : 1, pret: p, intrare: p, prob: { tinta5: o.simbol === "A" ? 0.01 : 0.2 } }) },
    univers: [{ isin: "US0000000001", simbol: "A", nume: "A" }, { isin: "US0000000002", simbol: "B", nume: "B" }], cereBare: async (s) => bare(s === "A" ? 0 : 5), acum: Date.UTC(2026, 10, 19, 6), pauzaMs: 0,
    poze: { citeste: () => vechi.concat(scrise), scrie: (p) => scrise.push(p) } });
  assert.deepEqual(r.idei.map((x) => x.simbol), ["B", "A"], "după ținta în 5 zile");
  assert.equal(scrise.length, 1); assert.equal(scrise[0].zi, "2026-11-19"); assert.equal(scrise[0].idei.length, 2);
  assert.ok(r.urmarire && r.urmarire.poze === 4, JSON.stringify(r.urmarire)); assert.ok(r.dovada.urcare.zi && r.dovada.urcare.zi.verdict, JSON.stringify(r.dovada.urcare));
  const r2 = await ts.turaSalt({ Salt: S, SA: { puncte: () => [], azi: () => null, dovada: () => ({ baza: {}, verdict: {} }), textDovada: () => "", areSalt: () => false }, univers: [{ isin: "US0000000001", simbol: "A", nume: "A" }],
    cereBare: async () => bare(0), acum: Date.UTC(2026, 10, 19, 9), pauzaMs: 0, poze: { citeste: () => vechi.concat(scrise), scrie: (p) => scrise.push(p) } });
  assert.equal(scrise.length, 1, "a doua tură din aceeași zi nu mai scrie poza"); assert.ok(r2);
});
await test("C colectorul: turaSaltZi dă turei pozele pe disc (data/salt-poze.jsonl); colector v101.202", () => {
  const c = citeste("scripts", "colector.mjs"), f = c.slice(c.indexOf("async function turaSaltZi()"), c.indexOf("async function turaSaltZi()") + 3000);
  assert.match(f, /salt-poze\.jsonl/); assert.match(f, /const poze = \{ citeste:/); assert.match(f, /pauza: \(ms\) => new Promise\(\(rs\) => setTimeout\(rs, ms\)\), poze,/); assert.ok(Number((c.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 202, "colector de la v101.202 încolo");
});
// ---------------- (P) pagina ----------------
for (const f of ["salt-dovezi.js", "salt-grafice.js", "carnet-grafice.js", "salt-ecran.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const RAP = { la: Date.UTC(2026, 10, 19, 6, 9), judecate: 508, fara: 2, tabel: [{ isin: "US60770K1079", simbol: "MRNA", nume: "Moderna", tip: "actiune", pret: 196.79, zi: 0.01, trend: "sus" }],
  liste: { urcare: [{ isin: "DE000EVNK013", simbol: "EVK.DE", nume: "Evonik", t: Date.UTC(2026, 10, 18, 8), pret: 21.78, ruptura: 0.01, volX: 2.4 }], revers: [], revine: [{ isin: "US44812J1043", simbol: "HUT", nume: "HUT 8", cadere: 0.48, deLaMin: 0.36, zileDeLaMin: 9, revine: true, pret: 57.19, stop: 41.77, tinta: 110.69 }] },
  dovada: { urcare: { text: "vechi: cam la fel", zi: { n: 1587, blocuri: 24, medie: 0.0015, lo: -0.0033, hi: 0.0062, verdict: "n-am-aflat", serie: [] }, textZi: "După un început de urcare, față de celelalte instrumente Salt în aceleași zile" }, revers: { text: "" }, revine: { text: "" } },
  idei: [{ isin: "US60770K1079", simbol: "MRNA", nume: "Moderna", moneda: "USD", trece: true, scor: 0.174, pret: 196.79, intrare: 196.79, stop: 167.27, riscPct: 0.15, tinta: 255.83, pePlusProba: 0.66, nProba: 203, prob: { tinta5: 0.066, stop1: 0.005 }, prof: { dist: 0.087, strans: false } }],
  urmarire: { poze: 1, judecate: 0, deLa: "2026-11-19", primaJudecataZi: "2026-12-17", verdict: "prea-putine", serie: [] } };
const D0 = () => ({ univers: [], raport: RAP, pozitii: [], analize: {}, incarcate: true, filtru: "", deschis: {}, bilet: {} });
await test("P pagina fără poziții: vârsta raportului, fraza cinstită + De unde știu, 3 cifre, ideile ÎNAINTEA pozițiilor, formularul deschis, 4 grafice fără NaN", () => {
  const h = globalThis.saltHtml(D0(), Date.UTC(2026, 10, 19, 9));
  assert.match(h, /id="saltVarsta">Raportul din 19\.11\.2026/); assert.match(h, /N-ai nicio poziție Salt scrisă; azi 1 din 508 instrumente trec de poarta ideilor - un filtru de trend, nu o idee dovedită\./);
  assert.match(h, /<summary>De unde știu<\/summary>/); assert.match(h, /fără regimul pieței/); assert.match(h, /~57/);
  assert.equal((h.match(/class="cnCifra"/g) || []).length, 3); assert.match(h, /Urmărirea pe viu/); assert.match(h, /prima judecată pe 17\.12\.2026/);
  assert.ok(h.indexOf('id="slSIdei"') < h.indexOf('id="slSPoz"'), "fără poziții: ideile întâi");
  assert.match(h, /<details class="saltForm" id="saltFormDet" open>/); assert.match(h, /id="saltDe" type="date" required/);
  assert.equal((h.match(/<svg/g) || []).length, 4); assert.doesNotMatch(h, /NaN|undefined/);
  for (const id of ["saltSus", "saltPozBox", "saltIdeiBox", "saltDreapta", "saltPf", "saltTabel", "saltCauta", "slSDovada", "slSToate"]) assert.match(h, new RegExp('id="' + id + '"'), id);
});
await test("P ideile spuse cinstit: „La raport” (nu „Acum”), stopul-plafon, istoricul fără „+Z % în medie”, cazuri independente; 🎲 și 📐 ca înainte", () => {
  const h = globalThis.saltIdeiHtml(D0());
  assert.match(h, /<th>La raport<\/th>/); assert.doesNotMatch(h, /<th>Acum<\/th>/); assert.match(h, /plafonul de 15 %, nu proba/);
  assert.match(h, /pe istoricul ei, în trendul de acum: 66 % pe plus în 20 de zile \(~10 cazuri independente, cifră optimistă\)/); assert.doesNotMatch(h, /în medie \(/);
  assert.match(h, /🎲 ținta înaintea stopului în 5 zile: 7\s% · stopul mâine: 1\s%/); assert.match(h, /📐 coborârea obișnuită pe 5 zile −8,7\s% · stopul e în afara ei/);
  assert.match(h, /Ordonate după șansa țintei în 5 zile, nu după scor/); assert.doesNotMatch(h, /Aceeași poartă ca la Trading 212/);
});
await test("P listele: prețul semnalului cu data, dovada față de aceeași zi întâi și reperul vechi mic; la revenire stopul regulii", () => {
  const d = D0(); d.fila = "urcare"; let h = globalThis.saltIdeiHtml(d);
  assert.match(h, /<th>La semnal<\/th>/); assert.match(h, /21,78 <span class="t212Mic">18\.11<\/span>|21,78<span class="t212Mic">18\.11<\/span>/);
  assert.match(h, /<b>După un început de urcare, față de celelalte instrumente Salt în aceleași zile<\/b> <span class="t212Mic">\(reperul vechi, o zi oarecare: vechi: cam la fel\)<\/span>/);
  d.fila = "revine"; h = globalThis.saltIdeiHtml(d); assert.match(h, /stopul regulii 41,77, ținta regulii 110,69/); assert.match(h, /\+36 % de la minim, în 9 zile/);
});
await test("P cu poziții: pozițiile întâi; poziția fără dată ⇒ roșu „alerta de stop NU poate suna”; ecoul exact al cantității și prețului", () => {
  const d = D0(); d.pozitii = [{ isin: "US60770K1079", simbol: "MRNA", nume: "Moderna", qty: 2.5, pretMediu: 12.3456, plata: "simbol" }];
  d.analize = { US60770K1079: { eroare: "fara-bare" } };
  const h = globalThis.saltHtml(d, Date.UTC(2026, 10, 19, 9));
  assert.ok(h.indexOf('id="slSPoz"') < h.indexOf('id="slSIdei"')); assert.match(h, /1 poziție la Salt/);
  assert.match(h, /t212Dunga r"><\/span><div><b>MRNA: fără data cumpărării - alerta de stop NU poate suna/); assert.match(h, /2,5 buc · mediu 12,3456/);
  assert.doesNotMatch(h, /<details class="saltForm" id="saltFormDet" open>/, "cu poziții formularul e pliat");
});
await test("P legăturile: rândurile SL_RANDURI în comutatorul comun, tema (RADACINI / app.js / tema devreme / butonul), scripturile noi în index + SW; asezare-paznic citește aceleași id-uri", () => {
  const ap = citeste("public", "app.js"), ix = citeste("public", "index.html");
  assert.match(ap, /return slRandComuta\(id,deschis\);/); assert.match(ap, /"scan","salt"\]\.forEach/); assert.match(ap, /"scTemaBtn","slTemaBtn"\]/);
  assert.match(citeste("public", "lib", "tema-devreme.js"), /"scan", "salt"\]/); assert.match(citeste("scripts", "face-tema-tablou.mjs"), /"scan", "salt"\]/);
  assert.match(ix, /id="slTemaBtn"/); assert.match(ix, /<script src="\/lib\/salt-dovezi\.js"><\/script><script src="\/lib\/salt-grafice\.js"><\/script>/);
  assert.match(citeste("public", "sw.js"), /"\/lib\/salt-dovezi\.js","\/lib\/salt-grafice\.js"/);
  const az = citeste("public", "lib", "asezare-paznic.js"); assert.match(az, /#saltPozBox tr\.t212Rand/); assert.match(az, /#saltSus \.t212TodoRand/);
  assert.match(citeste("public", "lib", "salt-ecran.js"), /if \(!p\.de\) \{ if \(m\) m\.textContent = "Scrie data cumpărării/); assert.match(citeste("public", "lib", "salt-ecran.js"), /confirm\("Șterg poziția/);
});
await test("P dovezile măsurate: SaltDovezi (19.11.2026) - 5 coșuri promis / venit, 13 blocuri, 300 de lumi H0 cu media 56,7 și 41 azi, puterea", () => {
  const D = globalThis.SaltDovezi; assert.equal(D.la, "19.11.2026"); assert.equal(D.calibrare.length, 5); assert.equal(D.blocuri.length, 13);
  assert.equal(D.h0.faraDrift.length, 300); assert.equal(D.h0.real, 41); assert.ok(Math.abs(D.h0.faraDrift.reduce((a, b) => a + b, 0) / 300 - 56.7) < 0.05);
  assert.equal(D.idei.medie, 0.004); assert.deepEqual(D.putere.map((x) => x[0]), [0.005, 0.01, 0.02]);
});
await test("V versiunile de la v100.365 încolo (v100.366: versiunea curentă o verifică proba ei)", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 365 && nr(citeste("public", "sw.js")) >= 365);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 365); assert.match(p.scripts.test, /npm run test:v100364 && npm run test:v100365/); assert.equal(p.scripts["test:v100365"], "node scripts/proba-v100365.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(nr(bi.badge) >= 365); assert.ok(bi.sl365 && bi.mi364);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
