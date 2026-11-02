// Proba v100.293 (el, 02.11: „gata?” ⇒ verificarea de după livrarea v100.292 a găsit în poza de pe 8788, la 412 px: fișa HYPE
// „Mișcarea pe 24 h +29,1% · pe 4 h: +57,6%”, lângă „fără mișcare mare în ultimele 24 h”).
// Cauza: regim.r24h / r4h (GridCalcul.regimPeBare) sunt RAPOARTE față de mișcarea obișnuită a monedei (percentila 75 a mișcărilor ei),
// nu procente; restul aplicației le arată „0,3×” (Acasă, alertele, sfaturile). Greșeala a venit din demo (pct(x.regim.r24h)) în pagină.
// Avertismentul „aproape de pragul de mișcare mare” compara raportul cu un procent și nu putea apărea: ruta clasamentului nu ține pragul.
// Ce probează:
//   1. celula „Mișcarea pe 24 h”: mișcarea reală pe 24 h (s24h), cu semn, și raportul „× obișnuitul”; fără s24h (clasamentul vechi din KV)
//      doar raportul; nicăieri raportul ca procent (și o gardă pe sursă);
//   2. avertismentul pragului: din mr (= GridCalcul.miscareMare(...).r, mișcarea de azi / pragul ei) ≥ 0,8; pragul = |s24h| / mr;
//      forma veche (r24h + mare.prag) nu mai aprinde nimic;
//   3. „pasul” fără semn (o mărime, nu un câștig);
//   4. colectorul (deTrimis) trimite s24h și mr, rotunjite (r4h / r24h la 4 zecimale: loc sub plafonul de 64 KB); ruta clasamentului le păstrează;
//   5. titlul US fără numărătoarea turei ale cărei liste au fost scoase (urcare, revers, gap); sub titlu: tăietura (cel mult 10, cea mai mare
//      cădere întâi) și câte trec regula, doar când tura o spune;
//   6. regula revenirii întreagă: și minimul vechi de cel puțin 3 zile, și prețul peste media pe 5 zile (din Reveniri.REGULI), pe US și pe EU;
//   7. stopul și ținta spun ce sunt; istoricul tău cu semn, ca rândul;
//   8. tura Idei numără câte trec regula (nReveniri), colectorul îl trimite, ruta îl păstrează;
//   9. versiunile v100.293, colectorul v101.160; v100.292 pe „≥”.
//   node scripts/proba-v100293.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deTrimis } from "./lib/tura-clasament.mjs";
import { turaIdei } from "./lib/tura-idei.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.293 · Sugestii: mișcarea pe 24 h cu unitatea ei, pragul viu, titlul US, regula întreagă · proba\n");

// ---------------------------------------------------------------- datele (forma rutelor; HYPE cu cifrele lui de pe 8788, 02.11 06:09)
const ACUM = Date.parse("2026-11-02T10:00:00Z");
const clone = (o) => JSON.parse(JSON.stringify(o));
const M = (s, regim, o) => Object.assign({ simbol: s + "_USDT_PERP", stare: "candidat", dir: "long", tarie: "mediu", regim, volum: 5e6, pret: 10, latime: 0.0857, pas: 0.00304, grile: 28, profitGrila: 0.00264, traversariZi: 15.2, scor: 0.0014 }, o || {});
const cl = { la: ACUM - 600000, monede: [
  M("HYPE", { r4h: 0.5763, r24h: 0.2908, s24h: 0.0123, mr: 0.31, miscare: false }, { pret: 88.61, volum: 6.6e6 }),
  M("SUI", { r4h: 1.2, r24h: 1.4, s24h: -0.051, mr: 0.85, miscare: false }, { dir: "short" }),
  M("ADA", { r4h: 0.58, r24h: 0.29, miscare: false, mare: { prag: 0.05 } })] };   // forma veche din KV (înainte de v101.160): fără s24h / mr
const idei = { idei: { la: ACUM, zi: "2026-11-02", judecate: 203, nReveniri: 14, reveniri: [
  { ticker: "CRBP_US_EQ", simbol: "CRBP", pret: 4.22, cadere: 0.6362, deLaMin: 0.0904, zileDeLaMin: 4, stop: 3.83, tinta: 11.6, istoric: { n: 5, pePlus: 4, total: 56.53 } },
  { ticker: "DASH_US_EQ", simbol: "DASH", pret: 178.99, cadere: 0.25, deLaMin: 0.09, zileDeLaMin: 4, stop: 162.04, tinta: 238.83, istoric: { n: 1, pePlus: 0, total: -236.4 } }],
  dovadaReveniri: { n: 1373, pePlus: 0.53, medie: 0.018, baza: { pePlus: 0.52, medie: 0.01 }, eticheta: "cam la fel" }, urmarireReveniri: { n: 69, pePlus: 0.29, medie: -0.074, text: "Din 69 de sugestii de cel puțin 14 zile: 29% pe plus, −7,4% în medie, după comision." } } };
const sugActiuni = { sugestii: { la: ACUM, us: { judecate: 202, fara: 1 }, eu: { judecate: 133, fara: 5, revine: [{ ticker: "SMSTm_EQ", simbol: "SMST", cadere: 0.9041, deLaMin: 0.6208, zileDeLaMin: 18, revine: true, pret: 0.8039, stop: 0.49, tinta: 8.38 }],
  dovada: { revine: { text: "După o cădere ca asta: 51% pe plus în 10 zile de bursă, +1,1% în medie." } } } } };
const D = { latime: { acum: { la: ACUM, n: 150, monede: [] }, istoric: [] }, boti: [], clasament: cl, sugMonede: { sugestii: { la: ACUM, urmarire: {} } }, idei, sugActiuni, sectoare: null, trend12: null };

// modulul ecranului, fără DOM (ca proba v100.292): Idei fals, Latime / Reveniri / TextRo reale, Busola / GraficBot / getJSON false
function ecran() {
  const ctx = { console, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    Idei: { ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 5) },
    Busola: { adresaBusola: (q) => "https://busola.local/?s=" + q.simbol + "&tf=" + q.tf },
    GraficBot: { desen: () => ({ svg: "<svg></svg>", legenda: "", valori: "" }) },
    getJSON: async () => ({ randuri: [] }), acPauzaSezon: undefined, acFrazaPauza: (n) => "pauza " + n,
    navTo() {}, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, Promise, TextRo: globalThis.TextRo, window: null };
  vm.createContext(ctx);
  for (const f of ["latime.js", "reveniri.js", "sugestii-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
  return ctx;
}
const plain = (o) => (o === null || o === undefined ? o : JSON.parse(JSON.stringify(o)));
const randuri = (c, d) => plain(c.sugRanduri(d || D, ACUM));
const fisa = (c, k, d) => plain(c.sugFisa(c.sugRanduri(d || D, ACUM).filter((x) => x.k === k)[0], d || D, ACUM));

// ================================================================ 1-3. fișa boților
await test("1. „Mișcarea pe 24 h”: mișcarea reală cu semn + raportul „× obișnuitul”; fără s24h, doar raportul; raportul nu e niciodată procent", () => {
  const c = ecran(), h = fisa(c, "porn:HYPE"), cel = h.cele.filter((x) => x.et === "Mișcarea pe 24 h")[0];
  assert.ok(cel, JSON.stringify(h.cele));
  assert.equal(cel.v, "+1,2%", "s24h 0,0123 = +1,2% pe 24 h");
  assert.match(cel.sub, /0,3× obișnuitul/); assert.match(cel.sub, /pe 4 h 0,6×/);
  assert.doesNotMatch(JSON.stringify(h.cele) + JSON.stringify(h.avert), /29,1%|57,6%/, "raportul 0,29 nu e „+29,1%”");
  const a = fisa(c, "porn:ADA"), ca = a.cele.filter((x) => x.et === "Mișcarea pe 24 h")[0];
  assert.equal(ca.v, "0,3× obișnuitul", "clasamentul vechi (fără s24h): doar raportul, cu unitatea lui"); assert.match(ca.sub, /pe 4 h 0,6×/);
  assert.doesNotMatch(JSON.stringify(a.cele), /29,0%|58,0%/);
  const src = citeste("public", "lib", "sugestii-ecran.js");
  assert.doesNotMatch(src, /sug(PctZ|Pr)\([^)]*regim\.r(4|24)h/, "garda: nicăieri în pagină raportul formatat ca procent");
});
await test("2. avertismentul „aproape de pragul de mișcare mare”: din mr ≥ 0,8, pragul = |s24h| / mr; departe de prag sau forma veche: nimic", () => {
  const c = ecran(), l = randuri(c), r = (k) => l.filter((x) => x.k === k)[0];
  assert.ok(r("porn:SUI").avert.some((t) => /Pe 24 h s-a mișcat −5,1%: aproape de pragul ei de „mișcare mare” \(6,0%, percentila 90 a mișcărilor ei pe o zi\)/.test(t)), JSON.stringify(r("porn:SUI").avert));
  assert.ok(!r("porn:HYPE").avert.some((t) => /prag/.test(t)), "mr 0,31: departe de prag");
  assert.ok(!r("porn:ADA").avert.some((t) => /prag|s-a mișcat/.test(t)), "forma veche (r24h + mare.prag): raportul nu se compară cu un procent: " + JSON.stringify(r("porn:ADA").avert));
  const D2 = clone(D); delete D2.clasament.monede[1].regim.s24h;
  const s2 = randuri(ecran(), D2).filter((x) => x.k === "porn:SUI")[0];
  assert.ok(s2.avert.some((t) => /Mișcarea pe 24 h e la 85% din pragul ei de „mișcare mare” \(percentila 90 a mișcărilor ei pe o zi\)/.test(t)), "fără s24h, procentul nu se inventează: " + JSON.stringify(s2.avert));
});
await test("3. „pasul” fără semn (o mărime, nu un câștig; ca intervalul și câștigul pe grilă)", () => {
  const g = fisa(ecran(), "porn:HYPE").cele.filter((x) => x.et === "Grile")[0];
  assert.equal(g.sub, "pasul 0,30%");
});

// ================================================================ 4. colectorul + ruta clasamentului
await test("4. deTrimis: s24h și mr (din regim.mare.r), rotunjite; r4h / r24h la 4 zecimale; restul lui mare nu pleacă; ruta reală le păstrează la fel din corpul întreg și din cel subțiat; 100 de monede sub 75% din plafon", async () => {
  const o = deTrimis({ simbol: "X_USDT_PERP", stare: "candidat", volum: 1, regim: { r4h: 0.5762899442801461, r24h: 0.29077185833651514, miscare: false, s4h: 0.004, s24h: 0.012345678, sens: null,
    mare: { k: 6, p: 0.9, n: 494, azi: 0.012345678, prag: 0.039, r: 0.316555, pct: 55, sens: "urca", mare: false, istoricScurt: false, rata: "~1 zi din 10" } } });
  assert.deepEqual(o.regim, { r4h: 0.5763, r24h: 0.2908, miscare: false, s24h: 0.01235, mr: 0.317 });
  assert.deepEqual(deTrimis({ simbol: "Y_USDT_PERP", regim: { r4h: 1, r24h: 2, miscare: true } }).regim, { r4h: 1, r24h: 2, miscare: true, s24h: null, mr: null }, "fără s24h / mare: null, nu 0");
  // ruta reală (ca proba v100.275): din corpul întreg (cu mare.r, nerotunjit) și din cel subțiat de colector păstrează ACELAȘI regim
  const kv = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [] }) }; };
  const posteaza = async (env, corp) => { const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href + "?t=" + Date.now() + "_" + Math.random());
    const req = new Request("https://exemplu.test/api/istoric-bot?action=clasament", { method: "POST", headers: { "cf-connecting-ip": "10.0.2.93", authorization: "Bearer t293", "content-type": "application/json", origin: "https://exemplu.test" }, body: JSON.stringify(corp) });
    const res = await mod.onRequestPost({ request: req, env }); return res.status; };
  const intreg = { simbol: "X_USDT_PERP", stare: "candidat", volum: 1, regim: { r4h: 0.5762899442801461, r24h: 0.29077185833651514, miscare: false, s4h: 0.004, s24h: 0.012345678, mare: { k: 6, p: 0.9, azi: 0.012345678, prag: 0.039, r: 0.316555, pct: 55 } } };
  const eA = { APP_API_TOKEN: "t293", ISTORIC: kv() }, eB = { APP_API_TOKEN: "t293", ISTORIC: kv() };
  assert.equal(await posteaza(eA, { la: 5, monede: [intreg] }), 200); assert.equal(await posteaza(eB, { la: 5, monede: [deTrimis(intreg)] }), 200);
  const rA = JSON.parse(eA.ISTORIC.m.get("clasament")).monede[0].regim, rB = JSON.parse(eB.ISTORIC.m.get("clasament")).monede[0].regim;
  assert.deepEqual(rA, { r4h: 0.5763, r24h: 0.2908, miscare: false, s24h: 0.01235, mr: 0.317 }, "corpul întreg: rotunjit, mr din mare.r"); assert.deepEqual(rB, rA, "corpul subțiat: la fel");
  const lung = { simbol: "ABCDEFGH_USDT_PERP", stare: "candidat", dir: "neutru", tarie: "slab", volum: 123456789.12345678, pret: 0.123456789012, latime: 0.123456789012345, pas: 0.0030398181213022735, grile: 28, profitGrila: 0.0026398181213022735, traversariZi: 15.123456789012345, scor: 0.0014123456789012345,
    revenire: { cadere: 0.1234, deLaMin: 0.0567, zileDeLaMin: 3.5, revine: false }, regim: { r4h: 0.5762899442801461, r24h: 0.29077185833651514, miscare: false, s24h: -0.012345678912, mare: { r: 0.3165551234 } } };
  const corp = JSON.stringify({ la: ACUM, monede: Array.from({ length: 100 }, () => deTrimis(lung)) });
  assert.ok(Buffer.byteLength(corp) < 0.75 * 64 * 1024, "100 de monede: " + Buffer.byteLength(corp) + " octeți");
});

// ================================================================ 5-7. acțiunile
await test("5. titlul US fără numărătoarea turei listelor scoase; sub titlu: tăietura și câte trec regula (doar când tura o spune); EU își păstrează numărătoarea (lista vine din tura ei)", () => {
  const g = plain(ecran().sugGrupuri(D, ACUM)), us = g.filter((x) => x.k === "revUS")[0], eu = g.filter((x) => x.k === "revEU")[0];
  assert.equal(us.titlu, "📈 Acțiuni US · 🔁 Pe revenire", "fără „202 acțiuni judecate, 1 fără prețuri” (tura urcare / revers / gap, scoase de el)");
  assert.match(us.sub, /au scăzut puternic și acum revin · 2 din 203 acțiuni judecate la 8:00/, "propoziția veche rămâne");
  assert.match(us.sub, /cel mult 10 pe zi, cea mai mare cădere întâi/); assert.match(us.sub, /trec regula: 14/);
  assert.match(eu.titlu, /133 de acțiuni judecate, 5 fără prețuri/); assert.match(eu.sub, /cel mult 10 pe zi, cea mai mare cădere întâi/);
  const D2 = clone(D); delete D2.idei.idei.nReveniri;
  assert.doesNotMatch(plain(ecran().sugGrupuri(D2, ACUM)).filter((x) => x.k === "revUS")[0].sub, /trec regula/, "fără nReveniri (KV vechi) nu se inventează");
});
await test("6. regula revenirii întreagă (minimul vechi de cel puțin 3 zile, prețul peste media pe 5 zile, cel mult 10 pe zi), din Reveniri.REGULI; EU spune și saltul", () => {
  const c = ecran(), crbp = fisa(c, "revUS:CRBP"), smst = fisa(c, "revEU:SMST");
  for (const f of [crbp, smst]) {
    assert.match(f.regula, /Regula \(reveniri\.js\): cădere de cel puțin 20% de la maximul pe 60 de zile de bursă, apoi prețul urcat cu cel puțin 8% de la minimul pe 20 de zile\./, "propoziția veche rămâne întreagă");
    assert.match(f.regula, /Și: minimul e vechi de cel puțin 3 zile, iar prețul e peste media ultimelor 5 zile; cel mult 10 pe zi, cea mai mare cădere întâi/, f.regula);
    assert.match(f.regula, / Proba istorică: intrare la închiderea zilei semnalului, 10 zile de bursă, fără cost\.$/, "și ultimul rând al expresiei ajunge în text");
  }
  assert.match(smst.regula, /seriile în care prețul sare într-o zi de peste 3 ori, în sus sau în jos \(pence ↔ lire, split\), nu intră/); assert.doesNotMatch(crbp.regula, /seriile în care prețul sare/);
  const c2 = ecran(); c2.Reveniri.REGULI.actiune.vechimeZile = 4; c2.Reveniri.REGULI.actiune.medieZile = 7;
  assert.match(fisa(c2, "revUS:CRBP").regula, /cel puțin 4 zile, iar prețul e peste media ultimelor 7 zile/, "cifrele vin din regulă, nu scrise de mână");
});
await test("7. stopul și ținta spun ce sunt; „Istoricul tău” cu semn, ca rândul", () => {
  const c = ecran(), crbp = fisa(c, "revUS:CRBP"), cel = (f, et) => f.cele.filter((x) => x.et === et)[0];
  assert.equal(cel(crbp, "Stop propus").sub, "−9,2% de acum · 1% sub minimul pe 20 de zile");
  assert.equal(cel(crbp, "Țintă").sub, "+174,9% · vechiul maxim pe 60 de zile, nu o prognoză");
  assert.equal(cel(crbp, "Istoricul tău").sub, "4 pe plus · +57 lei");
  assert.equal(cel(fisa(c, "revUS:DASH"), "Istoricul tău").sub, "0 pe plus · −236 lei");
  assert.equal(cel(fisa(c, "revEU:SMST"), "Țintă").sub, "+942,4% · vechiul maxim pe 60 de zile, nu o prognoză");
});

// ================================================================ 8. tura Idei: câte trec regula
await test("8. turaIdei numără câte trec regula înainte de tăietura la 10 (nReveniri); colectorul îl trimite; ruta /api/t212?action=idei îl păstrează", async () => {
  const tickere = Array.from({ length: 12 }, (_, i) => "T" + i + "_US_EQ"), bare = [{ t: 1, o: 1, h: 1, l: 1, c: 1 }];
  const r = await turaIdei({ tickere, cereBare: async () => bare, cereRezultate: async () => null, pauza: async () => {}, jurnal() {}, acum: ACUM, inchise: [],
    Idei: { judecaActiune: () => ({ trece: false }), alegeActiuni: () => [] },
    Reveniri: { REGULI: { actiune: {} }, actiunePeRevenire: () => ({ revine: true, cadere: 0.3, deLaMin: 0.1, zileDeLaMin: 4, pret: 1, stop: 0.9, tinta: 1.4 }), puncte: () => [], dovada: () => null } });
  assert.equal(r.reveniri.length, 10, "cel mult 10"); assert.equal(r.nReveniri, 12, "câte trec regula, înainte de tăietură");
  assert.match(citeste("scripts", "colector.mjs"), /urmarireReveniri: urmRev, nReveniri: r\.nReveniri,/);
  assert.match(citeste("functions", "api", "t212.js"), /reveniri: rev2, nReveniri: nr\(corp && corp\.nReveniri\),/);
});

// ================================================================ 9. versiunile
await test("9. versiunile v100.293 (aplicația, BUILD_INFO, pagina, cache-ul, package.json, lanțul), colectorul v101.160; v100.292 pe „≥”", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.293"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.equal(B.version, "v100.293"); assert.match(B.badge, /v100\.293/); assert.equal(Object.keys(B.features)[0], "sugestii293"); assert.ok(B.features.sugestii292, "cheia v100.292 rămâne");
  const H = citeste("public", "index.html");
  for (const re of [/<meta content="v100\.293" name="app-version"\/>/, /id="sideVersiune"[^>]*>v100\.293/, /id="antetVersiune"[^>]*>v100\.293/, /healthAppVersion[^>]*>v100\.293/]) assert.match(H, re);
  assert.match(citeste("public", "sw.js"), /CACHE="crypto-radar-v100-293"/);
  const pk = JSON.parse(citeste("package.json")); assert.equal(pk.version, "100.293.0"); assert.equal(pk.scripts["test:v100293"], "node scripts/proba-v100293.mjs"); assert.match(pk.scripts.test, /npm run test:v100292-desen && npm run test:v100293/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.160"/);
  assert.doesNotMatch(citeste("scripts", "proba-v100292.mjs"), /VERSIUNE = "v100\\\.292"\/\)/); assert.doesNotMatch(citeste("scripts", "proba-v100292.mjs"), /VERSIUNE_COLECTOR = "v101\\\.159"\/\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
