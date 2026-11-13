// Proba v100.292 (el, 01.11: „analizează foarte bine pagina de sugestii, refă-o la fel ca pe Trade 212 și verifică foarte sever condițiile
// care sugerează poziții: cât mai reale, cât mai corecte” ⇒ auditul (agent Opus, numărat pe zile, față de piața din aceleași zile, după
// cost) ⇒ „da scoate” pentru listele fără avantaj ⇒ demo pe pânză ⇒ „da fă”).
// Ce probează:
//   1-3. sugRanduri: doar listele rămase (pornire, revenire US / EU, sectoare, trend 12); direcțiile numite amândouă + conflictul;
//        lichiditatea sub 1 M; pauza sezonului golește pornirea; avertismentele (salt, raportează, concentrare, supraviețuitori);
//   4.   sugFisa: celulele, de ce e în listă, regula, „cum a mers” cu URMĂRIREA la vedere, acțiunile (Fișa gridului / Busola / Poarta);
//   5.   sugHtml: fără cardurile scoase, cu rândul verdictelor, lista + fișa, pânda cu „Direcția pe 84 z”, textele corectate;
//   6.   sugAlege / sugAlegeTf: alegerea, redesenarea, aducerea lumânărilor (monede: Pionex 4H / 1D; acțiuni: Yahoo 1d / Twelve 1h);
//   7.   colectorul: urmărirea „Pe ce aș porni” la orizont FIX (7 zile, din barele de 1 h), pe zile, față de mediana pieței, după cost;
//   8.   ruta /api/istoric-bot?action=sugestii primește lista „porn” și urmarire.porn; 9. așezarea (CSS) + stratul PAZNIC; 10. versiunile.
//   node scripts/proba-v100292.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { urmarireFixa } from "./lib/tura-sugestii.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.292 · Sugestii: lista + fișa, listele fără avantaj scoase, urmărirea la vedere · proba\n");

// ---------------------------------------------------------------- datele (forma rutelor, cifrele sintetice)
const ZI = 86400000, ACUM = Date.parse("2026-11-02T10:00:00Z");
const cl = { la: ACUM - 600000, monede: [
  { simbol: "HYPE_USDT_PERP", stare: "candidat", dir: "long", tarie: "mediu", regim: { r4h: 0.6, r24h: 0.9, s24h: 0.047, mr: 0.94, miscare: false }, volum: 4987742, pret: 87.691, latime: 0.0857, pas: 0.00304, grile: 28, profitGrila: 0.00264, traversariZi: 15.2, scor: 0.0014 },
  { simbol: "CC_USDT_PERP", stare: "candidat", dir: "short", tarie: "mediu", regim: { r4h: 0.002, r24h: -0.01, miscare: false }, volum: 120000, pret: 0.5123, latime: 0.125, pas: 0.0046, grile: 27, profitGrila: 0.0026, traversariZi: 23, scor: 0.0013 },
  { simbol: "BTC_USDT_PERP", stare: "de evitat", dir: "long", tarie: "tare", regim: { r4h: 0.03, r24h: 0.08, miscare: true }, volum: 9e8, pret: 110000, latime: 0.03, pas: 0.001, grile: 30, profitGrila: 0.0008, traversariZi: 4, scor: 0.0002 }] };
const latime = { acum: { la: ACUM - 180000, n: 150, lipsa: 0, lat: { sus: 112, jos: 34, mariLong: 142, fundExtrem: 79, oiExtrem: 25, volExtrem: 24, bugetEpuizat: 31 }, regim: { cod: "LARG-SUS" }, monede: [
  { sym: "HYPEUSDT", dir: "SUS", zileDir: 70, pret: 87.7, volPctl: 50, extPctl: 40, adrUsed: 30, fundPctl: 60, oiPctl: 50, oiChg: 1, lMari: 60, lMici: 55, deltaPctl: 50 },
  { sym: "CCUSDT", dir: "SUS", zileDir: 5, pret: 0.51, volPctl: 95, extPctl: 10, adrUsed: 110, fundPctl: 95, oiPctl: 91, oiChg: 3, lMari: 70, lMici: 50, deltaPctl: 80 }] }, istoric: [] };
const sugMonede = { sugestii: { la: ACUM, zi: "2026-11-02", urmarire: { porn: { n: 12, zile: 4, pePlus: 0.42, medie: -0.004, exces: -0.007, zilePeste: 0.25, text: "Din 12 sugestii (4 zile) de cel puțin 7 zile: 42% pe plus, −0,4% în medie după cost, −0,7 pp față de piața din aceleași zile (peste piață în 25% din zile)." } } }, istoric: [] };
const idei = { idei: { la: ACUM, zi: "2026-11-02", judecate: 203, reveniri: [{ ticker: "CRBP_US_EQ", simbol: "CRBP", pret: 4.22, cadere: 0.6362, deLaMin: 0.0904, zileDeLaMin: 4, stop: 3.83, tinta: 11.6, istoric: { n: 5, pePlus: 4, total: 56.53 } }, { ticker: "DYN_US_EQ", simbol: "DYN", pret: 20.5, cadere: 0.85, deLaMin: 0.2, zileDeLaMin: 9, stop: 17, tinta: 30 }],
  dovadaReveniri: { n: 1373, pePlus: 0.53, medie: 0.018, baza: { pePlus: 0.52, medie: 0.01 }, eticheta: "cam la fel" }, urmarireReveniri: { n: 69, pePlus: 0.29, medie: -0.074, text: "Din 69 de sugestii de cel puțin 14 zile: 29% pe plus, −7,4% în medie, după comision." } } };
const sugActiuni = { sugestii: { la: ACUM, eu: { judecate: 120, fara: 3, revine: [{ ticker: "SMSTm_EQ", simbol: "SMST", cadere: 0.9041, deLaMin: 0.6208, zileDeLaMin: 18, revine: true, pret: 0.8039, stop: 0.49, tinta: 8.38 }], dovada: { revine: { text: "După o cădere ca asta: 51% pe plus în 10 zile de bursă, +1,1% în medie; o zi oarecare: 52%, +0,4% — cam la fel (396 de cazuri)." } } } } };
const sectoare = { la: ACUM, istoric: { luni: 9, medie: -0.0057, luniPlus: 4, n: 9 }, univers: 250, sectoare: [{ sector: "Technology", ro: "Tehnologie", etf: "XLK", n: 24, top: [{ s: "CRWD", nume: "CrowdStrike Holdings Inc.", r3: 0.24, r6: 1.2, peste3: 0.19, peste6: 1.15, max52: -0.10, pret: 250 }, { s: "MRNA", nume: "Moderna Inc.", r3: 3.02, r6: 3.89, peste3: 2.8, peste6: 3.6, max52: -0.1, pret: 50 }] }] };
const trend12 = { dataUltimei: "2026-10-30", regim: { peste: true }, bilant: { zile: 9, n20: 0, ferestre20: 0, verdict: "în probă" }, concentrare: { sector: "Technology", n: 13 }, top: [
  { s: "SNDK", nume: "Sandisk Corporation", sector: "Technology", pret: 1150.89, m12: 7.75, m6: 0.5, r60: -0.0856, rang: 0, raporteaza: null, salt: { pct: 0.2756, d: "2026-01-06" } },
  { s: "MRNA", nume: "Moderna Inc.", sector: "Health Care", pret: 50, m12: 6.6, m6: 3.1, r60: 3.1, rang: 1, raporteaza: { d: "2026-11-05" }, salt: { pct: 1.77, d: "2026-08-19" } }] };
const D = { latime, boti: [], clasament: cl, sugMonede, idei, sugActiuni, sectoare, trend12 };

// modulul ecranului, fără DOM: Idei fals (ca în probele v100.181 / v100.262), Latime, Reveniri și TextRo reale, Busola / GraficBot / getJSON false
function ecran(o) {
  o = o || {};
  const cereri = [], ctx = { console, escapeHtml: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    Idei: { ideiBoti: (c) => ((c && c.monede) || []).filter((x) => x.stare === "candidat").slice(0, 5) },
    Busola: { adresaBusola: (q) => "https://busola.local/?s=" + q.simbol + "&tf=" + q.tf },
    GraficBot: { desen: (q) => ({ svg: '<svg class="gbSvg" data-bare="' + q.bare.length + '" data-tf="' + q.tfGrafic + '"></svg>', legenda: "legenda", valori: "" }) },
    getJSON: async (u) => { cereri.push(u); return o.raspuns ? o.raspuns(u) : { randuri: [] }; },
    acPauzaSezon: o.pauza ? () => o.pauza : undefined, acFrazaPauza: (n) => "N-aș porni alt bot azi: pauza sezonului, " + n + " zile",
    navTo() {}, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, Promise, TextRo: globalThis.TextRo, window: null };
  vm.createContext(ctx);
  for (const f of ["latime.js", "reveniri.js", "sugestii-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
  ctx.cereri = cereri;
  return ctx;
}
const plain = (o) => (o === null || o === undefined ? o : JSON.parse(JSON.stringify(o)));

// ================================================================ 1-3. rândurile
await test("1. sugRanduri: doar listele rămase, în ordinea paginii; niciun rând din listele scoase; fiecare rând are cheie, grup, simbol, preț, sub", () => {
  const c = ecran(), l = plain(c.sugRanduri(D, ACUM));
  const grupuri = [...new Set(l.map((x) => x.grup))];
  assert.deepEqual(grupuri, ["porn", "revUS", "revEU", "sect", "trend"]);
  assert.equal(l.filter((x) => x.grup === "porn").length, 2); assert.equal(l.filter((x) => x.grup === "revUS").length, 2); assert.equal(l.filter((x) => x.grup === "revEU").length, 1); assert.equal(l.filter((x) => x.grup === "sect").length, 2); assert.equal(l.filter((x) => x.grup === "trend").length, 2);
  for (const x of l) { assert.match(x.k, /^(porn|revUS|revEU|sect|trend):[A-Za-z0-9._-]+$/); assert.ok(x.s && x.pret && x.sub, x.k); }
  assert.ok(!l.some((x) => /short|revenire.*monede|urcare|revers|gap|pre-market|idei/i.test(x.grup)), "nimic din listele scoase");
});
await test("2. rândul de bot: direcția 4h+1z ȘI cea pe 84 de zile, numite; conflictul e avertisment; lichiditatea sub 1 M e avertisment; mișcarea pe 24 h aproape de prag", () => {
  const c = ecran(), l = plain(c.sugRanduri(D, ACUM)), h = l.filter((x) => x.k === "porn:HYPE")[0], cc = l.filter((x) => x.k === "porn:CC")[0];
  assert.equal(h.dir, "4h+1z ↑ long · mediu"); assert.match(h.sub, /84 z SUS/); assert.match(h.sub, /5,0 M USDT\/zi/); assert.match(h.sub, /interval 8,6%/); assert.match(h.sub, /0,26% net pe grilă/);
  assert.ok(!h.avert.some((a) => /Direcțiile nu se pun de acord/.test(a)), "HYPE: long și SUS - fără conflict"); assert.ok(!h.avert.some((a) => /Lichiditate/.test(a)), "HYPE are 5 M");
  assert.ok(h.avert.some((a) => /24 h s-a mișcat \+4,7%/.test(a)), "aproape de pragul de mișcare mare (v100.293: s24h 0,047, mr 0,94 ⇒ pragul 5,0%)");
  assert.equal(cc.dir, "4h+1z ↓ short · mediu"); assert.ok(cc.avert.some((a) => /Direcțiile nu se pun de acord: pe 4h\+1z trendul e short, pe 84 de zile moneda e SUS de 5 zile/.test(a)), JSON.stringify(cc.avert));
  assert.ok(cc.avert.some((a) => /Lichiditate mică: 0,1 M USDT\/zi, sub pragul de 1 M/.test(a)));
  assert.ok(!l.some((x) => x.s === "BTC"), "„de evitat” nu intră");
});
await test("3. pauza sezonului (v100.306, I-824: regula „azi nu”) NU mai golește lista de pornire: rândurile rămân, cu „azi nu” sub titlu și în fișă; avertismentele pe acțiuni: salt, raportează, concentrarea pe sector, revenirea prea tânără, căderea de peste 80%", () => {
  const cp = ecran({ pauza: 3 }), lp = plain(cp.sugRanduri(D, ACUM));
  assert.equal(lp.filter((x) => x.grup === "porn").length, 2); assert.match(plain(cp.sugGrupuri(D, ACUM)).filter((g) => g.k === "porn")[0].sub, /^azi nu: N-aș porni alt bot azi: pauza sezonului, 3 zile/);
  assert.ok(lp.filter((x) => x.grup === "porn").every((x) => x.aziNu && /^Azi nu: /.test(x.avert[0])), "fiecare rând de pornire spune „azi nu” întâi");
  const l = plain(ecran().sugRanduri(D, ACUM)), f = (k) => l.filter((x) => x.k === k)[0];
  assert.ok(f("sect:MRNA").avert.some((a) => /\+302% în 3 luni: verifică seria/.test(a)));
  assert.ok(f("trend:SNDK").avert.some((a) => /13 din cele 20 sunt în Technology/.test(a))); assert.ok(!f("trend:MRNA").avert.some((a) => /13 din cele 20/.test(a)), "MRNA e Health Care");
  assert.ok(f("trend:MRNA").avert.some((a) => /Salt \+177,0% într-o zi \(2026-08-19\)/.test(a))); assert.ok(f("trend:MRNA").avert.some((a) => /Raportează în \d+z \(2026-11-05\)/.test(a)));
  assert.ok(f("revUS:CRBP").avert.some((a) => /doar 4 zile/.test(a))); assert.ok(f("revUS:DYN").avert.some((a) => /Cădere de −85% de la maxim/.test(a)));
  assert.ok(f("revEU:SMST").sub.indexOf("−90% de la maxim, revine") >= 0 && /stop 0,49 · țintă 8,38/.test(f("revEU:SMST").sub), f("revEU:SMST").sub);
});

// ================================================================ 4. fișa
await test("4. sugFisa: celulele, de ce e în listă, regula, „cum a mers” cu urmărirea înainte la vedere (nu tăiată), verdictul, acțiunile potrivite", () => {
  const c = ecran(), l = plain(c.sugRanduri(D, ACUM)), fisa = (k) => plain(c.sugFisa(l.filter((x) => x.k === k)[0], D, ACUM));
  const h = fisa("porn:HYPE");
  assert.equal(h.verdict, "N-AM AFLAT"); assert.ok(h.cele.length >= 5); assert.ok(h.cele.some((x) => x.et === "Volum" && x.v === "5,0 M USDT/zi")); assert.match(h.regula, /Un filtru \(liniște, interval, treceri\), nu o predicție/);
  assert.match(h.motiv, /candidat/); assert.match(h.regula, /fără mișcare mare/);
  assert.ok(h.dovada.some((t) => /Din 12 sugestii \(4 zile\) de cel puțin 7 zile/.test(t)), "urmărirea colectorului, întreagă: " + JSON.stringify(h.dovada));
  assert.ok(h.dovada.some((t) => /941 de boți ai tăi/.test(t) && /−0,7 pp/.test(t)), "auditul din 01.11, pe boții lui");
  assert.deepEqual(h.actiuni.map((a) => a.et), ["Fișa gridului", "🧭 Busola, 4h"]); assert.match(h.actiuni[0].act, /gridDeschideMonedaDir\('HYPE','long'\)/); assert.equal(h.actiuni[1].href, "https://busola.local/?s=HYPE&tf=4h");
  const r = fisa("revUS:CRBP");
  assert.ok(r.dovada.some((t) => /Din 69 de sugestii de cel puțin 14 zile: 29% pe plus, −7,4% în medie/.test(t)), "urmărirea revenirii, din KV");
  assert.ok(r.dovada.some((t) => /53% pe plus în 10 zile de bursă/.test(t)), "dovada paginii"); assert.ok(r.dovada.some((t) => /supraviețuitor|cele care au căzut din listă lipsesc/i.test(t)));
  assert.ok(r.cele.some((x) => x.et === "Istoricul tău" && /5 trade-uri/.test(x.v)));
  assert.deepEqual(r.actiuni.map((a) => a.et), ["Poarta Trading 212"]); assert.match(r.actiuni[0].act, /sugLaPoarta\('CRBP'\)/);
  const t = fisa("trend:SNDK"); assert.equal(t.verdict, "ÎN PROBĂ"); assert.match(t.actiuni[0].act, /sugLaPoarta\('SNDK','trend12',''\)/); assert.ok(t.dovada.some((x) => /proba: 0 zile cu rezultat/.test(x)));
  const s = fisa("sect:CRWD"); assert.ok(s.dovada.some((x) => /9 luni/.test(x) && /4 din 9/.test(x))); assert.ok(s.dovada.some((x) => /\+1,1% pe lună, 8 din 11 luni/.test(x)), "refăcut pe date, după cost");
  const e = fisa("revEU:SMST"); assert.ok(e.dovada.some((x) => /nu e încă urmărire înainte/.test(x)));
});

// ================================================================ 5. pagina
await test("5. sugHtml: fără cardurile scoase; rândul celor 4 verdicte; lista + fișa cu primul rând ales; pânda cu „Direcția pe 84 z”; textele corectate", () => {
  const c = ecran(); c.sugStare.panda.desfacut = true;   // tabelul pândei (cu antetul coloanelor) se vede doar desfăcut
  const h = c.sugHtml(D, ACUM), fara = h.replace(/<p class="tbSub" data-sug="nota">[\s\S]*?<\/p>/, "");   // nota de subsol le NUMEȘTE pe cele scoase (cu motivul); în rest nu mai apar
  for (const t of ["Pentru short", "Idei de cumpărare", "Început de urcare", "Revers timpuriu", "Pre-market", "Gap la deschidere", "monede care au scăzut puternic"]) assert.ok(fara.indexOf(t) < 0, "scos: " + t);
  assert.match(h, /data-sug="nota">[^<]*Scoase de pe pagină la cererea ta \(01\.11\)[^<]*Pentru short/);
  assert.match(h, /class="sugVerdicte"/); const vb = h.slice(h.indexOf('data-sug="verdicte"'), h.indexOf('data-sug="lista"')); assert.equal((vb.match(/<span class="sugVerdict sugVerdict-/g) || []).length, 4, "rândul verdictelor: 4 celule (v100.308: + „După o cădere mare · monede”; v100.312: ea a plecat pe pagina Probe)"); assert.equal((h.match(/N-AM AFLAT/g) || []).length >= 4, true); assert.match(h, /ÎN PROBĂ/);
  assert.match(h, /<th>Direcția pe 84 z<\/th>/); assert.doesNotMatch(h, /Direcția 4h</);
  assert.match(h, /class="rlSec sugLista2"/); assert.match(h, /data-sug="lista"/); assert.match(h, /class="sugRand[^"]*" id="sugR-porn:HYPE"[^>]*aria-pressed="true"/, "primul rând e ales implicit"); assert.match(h, /id="sugFisa"/);
  assert.match(h, /<h4 class="sugGrup">🤖 Boți · 💡 Pe ce aș porni un bot/); assert.ok(h.indexOf("order:") < 0, "fără order: ordinea din DOM (alinierea pe loc nu sincronizează style-ul)"); assert.match(h, /📈 Acțiuni US · 🔁 Pe revenire/); assert.match(h, /🏆 Cele mai tari pe sectoare/); assert.match(h, /📈 Trend 12 luni \(în probă\)/);
  assert.doesNotMatch(h, /fiecare cu istoricul ei pe 2 ani/); assert.doesNotMatch(h, /la prețul de acum/); assert.doesNotMatch(h, /intrare la deschiderea zilei de după semnal \(gap-ul/);
  assert.match(h, /Nicio listă de mai jos n-are un avantaj dovedit/); assert.match(h, /fiecare listă își spune intrarea, ieșirea și costul/);
  assert.match(h, /Scoase de pe pagină la cererea ta \(01\.11\)/);
});
await test("6. sugAlege / sugAlegeTf: alegerea se ține minte, pagina se redesenează, lumânările vin pentru rândul ales (monede: Pionex 4H / 1D; acțiuni: Yahoo 1d, Twelve 1h) și se țin pe cheie", async () => {
  const c = ecran({ raspuns: (u) => (/pionex_klines/.test(u) ? { data: { klines: Array.from({ length: 30 }, (_, i) => ({ time: ACUM - (30 - i) * 14400000, open: 1, high: 2, low: 0.5, close: 1.5 })) } } : { randuri: Array.from({ length: 40 }, (_, i) => ({ time: ACUM - (40 - i) * ZI, open: 1, high: 2, low: 0.5, close: 1.5 })) }) });
  let desene = 0; c.sugDeseneaza = () => { desene++; };
  c.sugStare.d = D;
  await c.sugAlege("porn:CC"); assert.equal(c.sugStare.ales, "porn:CC"); assert.ok(desene >= 1);
  assert.ok(c.cereri.some((u) => /\/api\/market\?type=pionex_klines&symbol=CC_USDT_PERP&interval=4H/.test(u)), c.cereri.join(" | "));
  const gc = c.sugStare.graf["porn:CC|4h"]; assert.ok(gc && gc.la > 0, "cache: {la, html}"); assert.match(gc.html || "", /data-bare="30" data-tf="4H"/);
  await c.sugAlegeTf("1z"); assert.ok(c.cereri.some((u) => /symbol=CC_USDT_PERP&interval=1D/.test(u)));
  const n = c.cereri.length; await c.sugAlege("porn:CC"); assert.equal(c.cereri.length, n, "aceeași cheie ⇒ nicio cerere nouă");
  await c.sugAlege("trend:SNDK"); assert.ok(c.cereri.some((u) => /\/api\/t212\?action=preturi&interval=1d&ticker=SNDK_US_EQ/.test(u)), "acțiuni: zilnic de la Yahoo, prin ruta T212");
  await c.sugAlegeTf("1h"); assert.ok(c.cereri.some((u) => /action=preturi&interval=1h&ticker=SNDK_US_EQ/.test(u)));
  await c.sugAlege("revEU:SMST"); assert.ok(c.cereri.some((u) => /ticker=SMSTm_EQ/.test(u)), "EU: tickerul rândului");
  assert.match(c.sugHtml(D, ACUM), /id="sugR-revEU:SMST"[^>]*aria-pressed="true"/);
  assert.ok(c.sugAlegeTf("2h") === undefined && c.sugStare.tf !== "2h", "interval necunoscut ⇒ ignorat");
});

// ================================================================ 7-8. colectorul și ruta
await test("7. urmarireFixa (colector): fiecare sugestie judecată la 7 zile FIXE din barele de 1 h, după cost, față de mediana pieței din aceleași zile; numărat pe zile; fără bara de la orizont nu se judecă", () => {
  const t0 = Date.parse("2026-10-01T06:00:00Z"), bare = (p0, p7) => { const b = []; for (let i = 0; i <= 8 * 24; i++) b.push({ t: t0 + i * 3600000, o: p0, h: p0, l: p0, c: i < 7 * 24 ? p0 : p7 }); return b; };
  const B = { A_USDT_PERP: bare(10, 11), B_USDT_PERP: bare(10, 9), C_USDT_PERP: bare(10, 10.5), D_USDT_PERP: bare(10, 10.2), E_USDT_PERP: bare(10, 12) };
  B.F_USDT_PERP = bare(10, 11).filter((x) => x.t < t0 + 7 * ZI || x.t >= t0 + 7 * ZI + 6 * 3600000);   // gaură de 6 h chiar la orizont: nu se judecă pe o bară de peste 2 h mai târziu
  const ist = [{ zi: "2026-10-01", simbol: "A_USDT_PERP", pret: 10, lista: "porn" }, { zi: "2026-10-01", simbol: "B_USDT_PERP", pret: 10, lista: "porn" }, { zi: "2026-10-01", simbol: "X_USDT_PERP", pret: 10, lista: "porn" }, { zi: "2026-10-05", simbol: "A_USDT_PERP", pret: 10, lista: "porn" }, { zi: "2026-10-01", simbol: "F_USDT_PERP", pret: 10, lista: "porn" }];
  const u = urmarireFixa(ist, { zile: 7, cost: 0.001, bare1h: (s) => B[s] || null, toate: ["A_USDT_PERP", "B_USDT_PERP", "C_USDT_PERP", "D_USDT_PERP", "E_USDT_PERP"], acum: t0 + 9 * ZI });
  assert.equal(u.n, 2, "X n-are bare, 05.10 n-are încă 7 zile, F n-are bara de la orizont (gaură)"); assert.equal(u.zile, 1); assert.equal(u.nejudecate, 2, "X (fără bare) și F (fără bara de la orizont)"); assert.equal(u.inAsteptare, 1, "05.10 n-are încă 7 zile");
  assert.ok(Math.abs(u.medie - (0.1 - 0.001 + (-0.1 - 0.001)) / 2) < 1e-9, "media zilei: (+9,9% − 10,1%) / 2");
  assert.ok(Math.abs(u.exces - ((0.1 - 0.001 + (-0.1 - 0.001)) / 2 - 0.05)) < 1e-9, "față de mediana pieței în aceleași 7 zile: +5% (A 10, B −10, C 5, D 2, E 20 ⇒ mediana 5)");
  assert.equal(u.pePlus, 0.5); assert.equal(u.zilePeste, 0); assert.match(u.text, /Din 2 sugestii \(1 zi\) la 7 zile/); assert.match(u.text, /2 nejudecate \(fără bare la intrare sau la orizont\)/); assert.match(u.text, /ferestre de 7 zile care nu se suprapun: 1/); assert.match(u.text, /pp față de piața din aceleași zile/);
  assert.match(urmarireFixa([], { bare1h: () => null, toate: [] }).text, /se urmăresc de azi/);
});
await test("8. tura trimite notările „porn” ale zilei și urmarire.porn (orizont fix); ruta le primește și le păstrează", () => {
  const T = citeste("scripts", "lib", "tura-sugestii.mjs");
  assert.match(T, /export function urmarireFixa\(/); assert.match(T, /lista: "porn"/); assert.match(T, /urm\.porn = urmarireFixa\(ist\.filter\(\(x\) => x && x\.lista === "porn"\)/);   /* v100.333: urmăririle pe rând, cu respirație */
  assert.match(T, /d\.Idei\.ideiBoti\(cl, \[\], 5\)/);
  const R = citeste("functions", "api", "istoric-bot.js");
  assert.match(R, /x&&x\.lista==="porn"\?"porn":/); assert.match(R, /porn:ur\(w\.porn\)/);
  assert.match(T, /lista: "porn", dir: x\.dir/, "notarea de pornire poartă direcția botului"); assert.match(R, /x\.dir==="long"\|\|x\.dir==="short"\|\|x\.dir==="neutru"/); assert.match(R, /dir:dr/, "ruta păstrează direcția");
  const C = citeste("scripts", "colector.mjs"); assert.ok(Number(C.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/)[1]) >= 159, "colectorul v101.159 sau mai nou");
});

// ================================================================ 9. așezarea și stratul PAZNIC
await test("9. CSS: lista + fișa de la 900 px (container), fișa sub rând mai îngust; stilurile cardurilor scoase nu mai există; PAZNIC citește primul rând de pornire din lista nouă; acțiunile noi sunt permise", () => {
  const C = citeste("public", "app.css");
  assert.match(C, /\/\* v100\.292/); assert.match(C, /#sugPagina,#sugPagina \.sugLista2\{container-type:inline-size/); assert.match(C, /@container \(min-width:900px\)\{[^}]*\.sugLista2 \.sugCorp\{display:grid;grid-template-columns:330px minmax\(0,1fr\)/);
  assert.match(C, /\.sugLista2 #sugFisa\{grid-column:2;grid-row:1\/-1/); assert.doesNotMatch(C, /\.sugSectGrid\{/); assert.doesNotMatch(C, /\.sugTrendLista/); assert.doesNotMatch(C, /\.sugCartela\{/);
  const P = citeste("public", "lib", "asezare-paznic.js");
  assert.match(P, /#sugPagina \.sugRand\[data-grup="porn"\]/); assert.doesNotMatch(P, /Pe ce aș porni un bot\/\.test\(tx\("h4", c\)\)/);
  const A = citeste("public", "app.js").match(/ACTIUNI_PERMISE=new Set\("([^"]+)"/)[1].split(" "); for (const n of ["sugAlege", "sugAlegeTf"]) assert.ok(A.includes(n), n);
});

// ================================================================ 10. versiunile
await test("10. versiunile v100.292 (aplicația, BUILD_INFO, pagina, cache-ul, package.json, lanțul); v100291 pe „≥”", () => {
  assert.ok(Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]) >= 292, "v100.292 sau mai nouă");
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(Number(B.version.match(/v100\.(\d+)/)[1]) >= 292); assert.ok(B.features.sugestii292, "cheia v100.292 rămâne");
  const H = citeste("public", "index.html");
  assert.ok(Number(H.match(/id="healthAppVersion">v100\.(\d+)</)[1]) >= 292);
  assert.ok(Number(citeste("public", "sw.js").match(/crypto-radar-v100-(\d+)/)[1]) >= 292);
  const pk = JSON.parse(citeste("package.json")); assert.ok(Number(pk.version.split(".")[1]) >= 292); assert.equal(pk.scripts["test:v100292"], "node scripts/proba-v100292.mjs"); assert.match(pk.scripts.test, /npm run test:v100291 && npm run test:v100292( |")/);
  assert.doesNotMatch(citeste("scripts", "proba-v100291.mjs"), /VERSIUNE = "v100\\\.291"\/\)/);
});

// un nod fals, cât folosește alinierea pe loc (nodeType, tagName, className, childNodes, atributele, appendChild / removeChild, textele)
function nod(tag, atr, copii) {
  const n = { nodeType: 1, tagName: tag, className: (atr && atr.class) || "", _a: Object.assign({}, atr || {}), childNodes: [], parentNode: null,
    getAttribute(k) { return k === "class" ? this.className : (k in this._a ? this._a[k] : null); },
    setAttribute(k, v) { if (k === "class") this.className = String(v); else this._a[k] = String(v); },
    removeAttribute(k) { delete this._a[k]; },
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; },
    removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; } };
  delete n._a.class;
  for (const c of copii || []) n.appendChild(typeof c === "string" ? { nodeType: 3, nodeValue: c, parentNode: null } : c);
  return n;
}
await test("11. desenul pe loc (01.11, poza la 1920: gol după 5 rânduri): --n se pune după FIECARE desen din rândurile reale ale coloanei; alinierea sincronizează și aria-pressed", () => {
  const c = ecran();
  // --n: numărul copiilor din .sugCorp fără fișă, pus pe style (alinierea pe loc nu sincronizează style-ul, deci --n rămânea cel de la primul desen)
  const puse = {}, corp = { children: [{ id: "" }, { id: "" }, { id: "sugFisa" }, { id: "" }], style: { setProperty(k, v) { puse[k] = v; } } };
  assert.equal(c.sugPuneN({ querySelector: (s) => (s === ".sugCorp" ? corp : null) }), 3); assert.equal(puse["--n"], "3");
  assert.equal(c.sugPuneN({ querySelector: () => null }), 0, "fără .sugCorp: nimic, fără eroare"); assert.equal(c.sugPuneN(null), 0);
  const d = citeste("public", "lib", "sugestii-ecran.js"), fn = d.slice(d.indexOf("function sugDeseneaza()"), d.indexOf("async function sugPorneste"));
  assert.ok(fn.indexOf("sugPuneN(el)") > fn.indexOf("el._sugP = parti"), "sugDeseneaza pune --n după ce a desenat (pe loc sau întreg)");
  // aria-pressed: rândul ales se schimbă, nodurile rămân (aliniate), atributul urmează clasa
  const rand = (s, ales) => nod("BUTTON", { class: "sugRand" + (ales ? " ales" : ""), "aria-pressed": String(!!ales), "data-action-click": "sugAlege('porn:" + s + "')" }, [nod("B", {}, [s])]);
  const vechi = nod("DIV", { class: "sugCorp" }, [rand("HYPE", true), rand("CC", false)]), nou = nod("DIV", { class: "sugCorp" }, [rand("HYPE", false), rand("CC", true)]);
  const a = vechi.childNodes[0], b = vechi.childNodes[1];
  assert.equal(c.sugAlinia(vechi, nou), true);
  assert.equal(vechi.childNodes[0], a, "nodul HYPE a rămas"); assert.equal(a.className, "sugRand"); assert.equal(a.getAttribute("aria-pressed"), "false");
  assert.equal(vechi.childNodes[1], b); assert.equal(b.className, "sugRand ales"); assert.equal(b.getAttribute("aria-pressed"), "true");
});

await test("12. revizia 01.11, textele adevărate: maximul pe 60 de zile de bursă (nu „pe un an”); urmărirea US spusă cum e; fără Poarta pe EU (știe doar _US_EQ); „primele 100 după volum”; pragul mișcării e al monedei; cifrele fixe au data; un singur verdict; neutru nu e forțat long; prețurile EU în moneda bursei", () => {
  const c = ecran(), l = plain(c.sugRanduri(D, ACUM)), f = (k) => plain(c.sugFisa(l.filter((x) => x.k === k)[0], D, ACUM));
  const crbp = f("revUS:CRBP"), smst = f("revEU:SMST"), hype = f("porn:HYPE"), sect = f("sect:CRWD"), tr = f("trend:SNDK");
  for (const t of [crbp.motiv, crbp.regula, crbp.cele.map((x) => x.sub).join(" ")]) assert.doesNotMatch(t, /pe un an/);
  assert.match(crbp.regula, /maximul pe 60 de zile de bursă/); assert.ok(crbp.cele.some((x) => x.et === "De la maxim" && /60 de zile de bursă/.test(x.sub)), JSON.stringify(crbp.cele));
  assert.doesNotMatch(crbp.dovada.join(" | "), /14 zile fixe|orizont fix/); assert.match(crbp.dovada.join(" | "), /semnalele de cel puțin 14 zile, la prețul de azi, numărate pe semnal, fără comparație cu piața/);
  assert.equal(smst.actiuni.length, 0, "fără Poarta pe EU"); assert.match(smst.actNota, /Poarta știe doar acțiunile US/); assert.doesNotMatch(smst.dovada.join(" | "), /e „cam la fel” cu o zi oarecare/);
  assert.match(hype.motiv, /primele 100 PERP după volum, ordonate după scor/); assert.doesNotMatch(hype.motiv, /100 PERP după scor/);
  assert.equal(sect.dovada.filter((t) => /Verdict: n-am aflat/.test(t)).length, 1, sect.dovada.join(" | "));
  assert.ok(hype.dovada.some((t) => /Gridul îngust/.test(t) && /auditul din 01\.11/.test(t)), hype.dovada.join(" | ")); assert.match(tr.dovada[0], /auditul din 14\.10/);
  const h = l.filter((x) => x.k === "porn:HYPE")[0]; assert.ok(h.avert.some((a) => /24 h s-a mișcat \+4,7%: aproape de pragul ei de „mișcare mare” \(5,0%, percentila 90/.test(a)), JSON.stringify(h.avert));
  const D2 = JSON.parse(JSON.stringify(D)); delete D2.clasament.monede[0].regim.mr;
  assert.ok(!plain(c.sugRanduri(D2, ACUM)).filter((x) => x.k === "porn:HYPE")[0].avert.some((a) => /aproape de prag/.test(a)), "fără pragul monedei nu se inventează 4%");
  const D3 = JSON.parse(JSON.stringify(D)); D3.clasament.monede[0].dir = "neutru";
  assert.match(plain(c.sugFisa(plain(c.sugRanduri(D3, ACUM)).filter((x) => x.k === "porn:HYPE")[0], D3, ACUM)).actiuni[0].act, /gridDeschideMonedaDir\('HYPE','neutru'\)/);
  const se = l.filter((x) => x.k === "revEU:SMST")[0]; assert.equal(se.pret, "0,80"); assert.match(smst.pretNota, /moneda bursei/); assert.equal(l.filter((x) => x.k === "revUS:CRBP")[0].pret, "$4,22", "US: prețul cu virgula zecimală (v100.306, I-837)");
});
await test("13. urmarireFixa (revizia 01.11): intrarea e bara de la 06:00Z (aceeași ca piața), nu prețul turei; semnul urmează direcția botului (short câștigă când scade; neutru = ca long); textul spune direcția", () => {
  const t0 = Date.parse("2026-10-01T06:00:00Z"), bare = (p0, p7) => { const b = []; for (let i = 0; i <= 8 * 24; i++) b.push({ t: t0 + i * 3600000, o: p0, h: p0, l: p0, c: i < 7 * 24 ? p0 : p7 }); return b; };
  const B = { L_USDT_PERP: bare(100, 110), S_USDT_PERP: bare(100, 90), N_USDT_PERP: bare(100, 104), M_USDT_PERP: bare(100, 100) };
  const ist = [{ zi: "2026-10-01", simbol: "L_USDT_PERP", pret: 95, dir: "long", lista: "porn" }, { zi: "2026-10-01", simbol: "S_USDT_PERP", pret: 95, dir: "short", lista: "porn" }, { zi: "2026-10-01", simbol: "N_USDT_PERP", pret: 95, dir: "neutru", lista: "porn" }];
  const u = urmarireFixa(ist, { zile: 7, cost: 0.001, bare1h: (s) => B[s] || null, toate: Object.keys(B), acum: t0 + 9 * ZI });
  // piața: L +10, S −10, N +4, M 0 ⇒ mediana (0 + 4) / 2 = +2%
  assert.equal(u.n, 3); assert.ok(Math.abs(u.medie - ((0.1 - 0.001) + (0.1 - 0.001) + (0.04 - 0.001)) / 3) < 1e-9, "intrarea la 100 (bara de la 06:00Z), nu la 95; short: +10% când scade 10%: " + u.medie);
  assert.ok(Math.abs(u.exces - ((0.1 - 0.02 - 0.001) + (-(-0.1 - 0.02) - 0.001) + (0.04 - 0.02 - 0.001)) / 3) < 1e-9, "excesul în direcția botului: long r − piață, short −(r − piață): " + u.exces);
  assert.equal(u.pePlus, 1); assert.match(u.text, /la 7 zile/); assert.doesNotMatch(u.text, /de cel puțin/); assert.match(u.text, /în direcția botului \(neutru: ca long\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
