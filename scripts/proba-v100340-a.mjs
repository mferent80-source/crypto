// Proba v100.340-a (I-872, restul): regimul pentru grid - clasificatorul din ADX și din lățimea benzilor Bollinger, cu pragurile scrise în
// docs/cercetare/2026-11-13-tablou-acuratete.md (M5) ÎNAINTE de măsurătoare. Același modul (public/lib/regim-grid.js) e folosit de pagină și de
// scriptul de măsurare; aici se ține: pragurile, lipsa datelor, „fără privit înainte” și măsurile de pe următoarele bare.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import { botBrut, GRID } from "./lib/bot-de-proba.mjs";
import { taie, incarcaMotor, incarcaLib } from "./lib/motor-pagina.mjs";
import { etichetaM5 } from "./lib/m5-etichete.mjs";
import { pStudentSus, testBlocuri, blocuriDinZile, valoriPeBlocuri } from "./lib/statistica-blocuri.mjs";

const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.340-a · regimul pentru grid · proba\n");
vm.runInThisContext(citeste("public", "lib", "regim-grid.js"), { filename: "regim-grid.js" });
const R = globalThis.RegimGrid;
// mulberry32 (regula casei) pentru seriile de probă
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// n bare cu zgomot de amplitudine dată pe bucăți: [[câte, amplitudine], …]
const serie = (bucati, samanta = 7) => { const rnd = mulberry32(samanta), c = []; let p = 100; for (const [n, a] of bucati) for (let i = 0; i < n; i++) { p += (rnd() - 0.5) * a; c.push(p); } return c; };

await test("pragurile sunt cele scrise în jurnal înainte de măsurătoare: ADX 25 / 20, percentila lățimii 30 / 70, fereastra 100, benzile (20; 2)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(R.PRAGURI)), { adxTrend: 25, adxLateral: 20, volJos: 30, volSus: 70, fereastra: 100, bbN: 20, bbK: 2, minLatimi: 60 });
  const J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md"); assert.match(J, /ADX\(14\) al paginii \(`calc`\) ≥ 25 ⇒ „trend”; < 20 ⇒ „lateral”/); assert.match(J, /< 30 ⇒ „joasă”; > 70 ⇒ „ridicată”/);
});
await test("axa trendului: ADX ≥ 25 trend, sub 20 lateral, între ele tranziție; fără ADX ⇒ necunoscut (nu „lateral”)", () => {
  const c = serie([[160, 1]]), t = (adx) => R.clasifica(c, c.length - 1, adx).trend;
  assert.equal(t(25), "trend"); assert.equal(t(40), "trend"); assert.equal(t(24.99), "tranzitie"); assert.equal(t(20), "tranzitie"); assert.equal(t(19.99), "lateral"); assert.equal(t(0), "lateral");
  for (const x of [null, undefined, NaN, "", -1]) assert.equal(t(x), null, String(x));
});
await test("axa volatilității: lățimea benzilor ca percentilă în ultimele 100 de bare - cea mai largă ⇒ ridicată, cea mai strânsă ⇒ joasă; sub 60 de lățimi ⇒ necunoscut", () => {
  const larg = serie([[140, 0.4], [25, 6]]), strans = serie([[140, 4], [25, 0.05]]);
  const a = R.clasifica(larg, larg.length - 1, 15), b = R.clasifica(strans, strans.length - 1, 15);
  assert.equal(a.vol, "ridicata", JSON.stringify(a)); assert.ok(a.percentila > 95); assert.equal(b.vol, "joasa", JSON.stringify(b)); assert.ok(b.percentila < 10);
  const scurt = serie([[70, 1]]); assert.equal(R.clasifica(scurt, scurt.length - 1, 15).vol, null, "70 de bare = 51 de lățimi");
  const plat = Array(150).fill(100), p = R.clasifica(plat, 149, 15); assert.equal(p.vol, null, "preț perfect plat: lățimea e zero, percentila nu spune nimic"); assert.equal(p.percentila, null); assert.equal(R.latimeBB(plat, 149), 0);
  assert.equal(R.latimeBB(larg, 10), null, "sub 20 de bare n-are benzi");
});
await test("fără privit înainte: eticheta de la bara i nu se schimbă când barele de după ea sunt altele", () => {
  const c = serie([[120, 1], [60, 3]]), i = 150, r1 = R.clasifica(c, i, 22), alt = c.slice(); for (let k = i + 1; k < alt.length; k++) alt[k] = alt[k] * 3 + 50;
  assert.deepEqual(R.clasifica(alt, i, 22), r1); assert.deepEqual(R.clasifica(c.slice(0, i + 1), i, 22), r1);
});
await test("măsurile de pe următoarele bare: eficiența (0 = numai oscilație, 1 = numai înaintare) și drumul în procente; fără destule bare ⇒ null", () => {
  const drept = Array.from({ length: 40 }, (_, k) => 100 + k), zig = Array.from({ length: 41 }, (_, k) => 100 + (k % 2));
  assert.equal(R.eficientaInainte(drept, 5, 24), 1); assert.equal(R.eficientaInainte(zig, 0, 24), 0); assert.ok(Math.abs(R.eficientaInainte(zig, 0, 25) - 1 / 25) < 1e-12);
  assert.ok(Math.abs(R.drumInainte(drept, 5, 24) - 100 * 24 / 105) < 1e-9); assert.ok(Math.abs(R.drumInainte(zig, 0, 24) - 24) < 1e-9);
  assert.equal(R.eficientaInainte(drept, 30, 24), null); assert.equal(R.drumInainte(drept, 30, 24), null); assert.equal(R.eficientaInainte(Array(40).fill(7), 0, 24), null, "preț pe loc: fără drum, fără eficiență");
  // eficiența ultimelor bare (descrierea trecutului) e aceeași formulă, privită înapoi
  assert.equal(R.eficientaInapoi(drept, 30, 24), 1); assert.equal(R.eficientaInapoi(zig, 24, 24), 0); assert.equal(R.eficientaInapoi(drept, 10, 24), null);
});
await test("vorbele: regimul spus pentru grid, fără culoare; ce urmează se spune doar dacă măsurătoarea l-a dovedit pe intervalul acela", () => {
  const lat = { trend: "lateral", vol: "joasa", adx: 14.2, percentila: 12 }, tr = { trend: "trend", vol: "ridicata", adx: 31, percentila: 88 };
  const nedov = R.text(lat, { tf: "1 oră", masurat: null }); assert.match(nedov, /^pe 1 oră: lateral \(ADX 14\), benzile strânse \(percentila 12\)/); assert.match(nedov, /ce urmează: nedovedit/);
  const dov = R.text(lat, { tf: "1 oră", masurat: { A: { lateral: 0.21, trend: 0.26 }, B: null } }); assert.match(dov, /după „lateral”, în următoarele 24 h prețul a oscilat mai mult decât a înaintat \(eficiența 0,21 față de 0,26 după „trend”; măsurat\)/); assert.doesNotMatch(dov, /nedovedit/);
  const dovB = R.text(tr, { tf: "4 ore", masurat: { A: null, B: { raport: 1.6 } } }); assert.match(dovB, /^pe 4 ore: trend \(ADX 31\), benzile largi \(percentila 88\)/); assert.match(dovB, /după benzi largi drumul următoarelor 24 h a fost de 1,6 ori mai lung decât după benzi strânse \(măsurat\)/); assert.match(dovB, /oscilație sau înaintare: nedovedit/);
  assert.equal(R.text({ trend: null, vol: null, adx: null, percentila: null }, { tf: "1 oră" }), ""); assert.equal(R.text(null, {}), "");
  // cifra scrisă nu contrazice pragul: lângă prag apare zecimala (19,6 e „lateral”, nu „ADX 20”)
  assert.match(R.text({ trend: "lateral", vol: "joasa", adx: 19.6, percentila: 29.6 }, { tf: "1 oră" }), /lateral \(ADX 19,6\), benzile strânse \(percentila 29,6\)/);
  assert.match(R.text({ trend: "tranzitie", vol: "ridicata", adx: 24.6, percentila: 70.4 }, { tf: "1 oră" }), /între lateral și trend \(ADX 24,6\), benzile largi \(percentila 70,4\)/);
  assert.match(R.text({ trend: "trend", vol: "normala", adx: 25.4, percentila: 69.6 }, { tf: "1 oră" }), /trend \(ADX 25,4\), benzile obișnuite \(percentila 69,6\)/, "rotunjite ar cădea chiar pe prag (25, 70): se scrie zecimala");
  assert.match(R.text({ trend: "trend", vol: "normala", adx: 31.4, percentila: 55.2 }, { tf: "1 oră" }), /trend \(ADX 31\), benzile obișnuite \(percentila 55\)/, "departe de praguri: cifre întregi");
  const tranz = R.text({ trend: "tranzitie", vol: "normala", adx: 22.4, percentila: 55 }, { tf: "1 oră", masurat: null }); assert.match(tranz, /între lateral și trend \(ADX 22\)/); assert.match(tranz, /benzile obișnuite/);
});

// ---------------- pagina: perechile din drum și regimul, sub „Cele șapte măsuri” ----------------
const APP = citeste("public", "app.js"), HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js");
for (const f of ["grid-calcul.js", "tablou-extra.js", "tablou-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const TB = globalThis.TabloBot, ACUM = Date.UTC(2026, 10, 14, 9), MIN5 = 5 * 60000;
await test("perechile din drum se numără pe liniile gridului botului: zigzag pe o treaptă = o pereche la fiecare dus-întors; oscilația sub o treaptă și drumul din afara gridului = nicio pereche; ultima oră se numără și separat", () => {
  const lum = (inchideri) => inchideri.map((c, i) => ({ time: ACUM - (inchideri.length - i) * MIN5, open: c, high: c + 0.05, low: c - 0.05, close: c, volume: 10 }));
  const m = (inchideri) => TB.masoara({ bot: botBrut("short", 71, { acum: ACUM }), klinePerp: lum(inchideri), istoric: [], acum: ACUM, pretPerpViu: inchideri[inchideri.length - 1] });
  // 100 de închideri care sar o treaptă (0,5) sus-jos, chiar pe liniile 71,0 și 71,5: 49 de dus-întors pe același interval în 8,25 h
  const zig = m(Array.from({ length: 100 }, (_, i) => 71 + (i % 2 ? GRID.pas : 0)));
  assert.ok(Math.abs(zig.trepte.perechiDinDrum - 49 / 8.25) < 0.01, String(zig.trepte.perechiDinDrum)); assert.ok(Math.abs(zig.trepte.valoare - 99 / 8.25) < 0.01); assert.ok(Math.abs(zig.trepte.oreDrum - 8.25) < 1e-9);
  // revizia a doua (🟡 6): perechile din ULTIMA ORĂ (ultimele 12 închideri), ca să se compare cu ultima oră a botului pe aceeași fereastră: 6 dus-întors
  assert.equal(zig.trepte.perechiUltimaOra, 6); assert.equal(m(Array.from({ length: 100 }, (_, i) => 71.1 + (i % 2 ? 0.2 : 0))).trepte.perechiUltimaOra, 0);
  const drept = m(Array.from({ length: 100 }, (_, i) => 68 + i * 0.05)); assert.ok(Math.abs(drept.trepte.perechiDinDrum) < 1e-9, "numai înaintare: nicio pereche, " + drept.trepte.perechiDinDrum);
  // revizia (🟡 3): oscilația mai mică de o treaptă nu atinge nicio linie ⇒ nicio pereche (formula veche, (drum − înaintare) ÷ 2, dădea 19,6 pe oră)
  const marunt = m(Array.from({ length: 100 }, (_, i) => 71.1 + (i % 2 ? 0.2 : 0))); assert.equal(marunt.trepte.perechiDinDrum, 0, "sub o treaptă: " + marunt.trepte.perechiDinDrum); assert.ok(marunt.trepte.valoare > 4, "drumul rămâne un fapt separat");
  // două trepte dus-întors (71,0 ↔ 72,0): fiecare dus-întors închide câte o pereche pe DOUĂ intervale
  const lat = m(Array.from({ length: 100 }, (_, i) => 71 + (i % 2 ? 2 * GRID.pas : 0))); assert.ok(Math.abs(lat.trepte.perechiDinDrum - 98 / 8.25) < 0.01, String(lat.trepte.perechiDinDrum));
  // în afara gridului nu sunt linii, deci nici perechi
  assert.equal(m(Array.from({ length: 100 }, (_, i) => 80 + (i % 2 ? GRID.pas : 0))).trepte.perechiDinDrum, 0);
  assert.equal(m(Array.from({ length: 8 }, () => 71)).trepte.perechiDinDrum, undefined, "prea puține lumânări: fără cifră");
});
await test("perechile din drum țin seama de loturile pe care gridul le are deja la începutul ferestrei: long care urcă drept și short care coboară drept își închid loturile (câte o pereche pe linie); invers, nicio pereche; gridul neutru lucrează ca short peste prețul de pornire și ca long sub el", () => {
  const lum = (inchideri) => inchideri.map((c, i) => ({ time: ACUM - (inchideri.length - i) * MIN5, open: c, high: c + 0.05, low: c - 0.05, close: c, volume: 10 }));
  const m = (dir, inchideri) => TB.masoara({ bot: botBrut(dir, 71, { acum: ACUM }), klinePerp: lum(inchideri), istoric: [], acum: ACUM, pretPerpViu: inchideri[inchideri.length - 1] }).trepte.perechiDinDrum;
  const urca = Array.from({ length: 100 }, (_, i) => 68.2 + i * 0.05), coboara = Array.from({ length: 100 }, (_, i) => 72.8 - i * 0.05);   // 68,2 → 73,15 și 72,8 → 67,85
  // long, urcare: ține loturile de la 68,5 în sus; le vinde la 69, 69,5, … 73 = 9 perechi
  assert.ok(Math.abs(m("long", urca) - 9 / 8.25) < 1e-9, "long urcă: " + m("long", urca) * 8.25); assert.equal(m("long", coboara), 0, "long coboară: doar cumpără");
  // short, coborâre: ține loturile vândute până la 72,5; le răscumpără la 72, 71,5, … 68 = 9 perechi
  assert.ok(Math.abs(m("short", coboara) - 9 / 8.25) < 1e-9, "short coboară: " + m("short", coboara) * 8.25); assert.equal(m("short", urca), 0, "short urcă: doar vinde");
  // neutru (pornit la 71): zigzag 72 ↔ 72,5 peste pornire = regula short (vinde la 72,5, răscumpără la 72): 49 de perechi; 69,5 ↔ 70 sub pornire = regula long: 49
  const zig = (a) => Array.from({ length: 100 }, (_, i) => a + (i % 2 ? GRID.pas : 0));
  assert.ok(Math.abs(m("neutral", zig(72)) - 49 / 8.25) < 1e-9, "neutru sus: " + m("neutral", zig(72)) * 8.25); assert.ok(Math.abs(m("neutral", zig(69.5)) - 49 / 8.25) < 1e-9, "neutru jos: " + m("neutral", zig(69.5)) * 8.25);
  // neutru care se întoarce spre pornire își închide loturile: de la 73,3 în jos până la 71,05 răscumpără 73, 72,5, 72, 71,5 (4), apoi sub 71 doar cumpără
  assert.ok(Math.abs(m("neutral", Array.from({ length: 100 }, (_, i) => 73.3 - i * 0.05)) - 4 / 8.25) < 1e-9, "neutru se întoarce: " + m("neutral", Array.from({ length: 100 }, (_, i) => 73.3 - i * 0.05)) * 8.25);
  // verificare cu un simulator la nivel de ORDINE (revizia a doua: cel dinainte era aceeași mașină de stări ca pagina): ordine de vânzare pe liniile de
  // peste preț, de cumpărare pe cele de sub; un ordin executat își pune perechea pe linia vecină. O pereche = vânzarea executată (long) sau cumpărarea
  // executată (short). Pagina nu poate ști linia goală de lângă preț la începutul ferestrei ⇒ numără cel mult o pereche mai puțin, niciodată mai mult.
  const rnd = mulberry32(31), N = GRID.linii, linia = (k) => GRID.jos + k * GRID.pas;
  const simOrdine = (lung, dr) => { const cump = new Set(), vanz = new Set(); for (let k = 0; k < N; k++) { if (linia(k) < dr[0]) cump.add(k); else if (linia(k) > dr[0]) vanz.add(k); }
    let per = 0; for (let i = 1; i < dr.length; i++) { const c = dr[i];
      for (let k = 0; k < N; k++) if (vanz.has(k) && linia(k) <= c) { vanz.delete(k); if (k > 0) cump.add(k - 1); if (lung) per++; }
      for (let k = N - 1; k >= 0; k--) if (cump.has(k) && linia(k) >= c) { cump.delete(k); if (k < N - 1) vanz.add(k + 1); if (!lung) per++; } }
    return per; };
  let egale = 0, cuUna = 0;
  for (let proba = 0; proba < 400; proba++) { const lung = proba % 2 === 0, pas = 0.05 + rnd() * 0.6; let p = 66 + rnd() * 9; const dr = [p]; for (let i = 1; i < 100; i++) { p = Math.min(79, Math.max(62, p + (rnd() - 0.5) * 2 * pas)); dr.push(p); }
    const per = simOrdine(lung, dr), pag = Math.round(m(lung ? "long" : "short", dr) * 8.25 * 1e6) / 1e6, dif = per - pag;
    assert.ok(dif === 0 || dif === 1, (lung ? "long" : "short") + " #" + proba + ": pagina " + pag + ", ordinele " + per); if (dif) cuUna++; else egale++; }
  assert.ok(egale > 100 && cuUna > 20, "ambele cazuri apar: " + egale + " egale, " + cuUna + " cu o pereche mai puțin");
  // revizia a doua (🟡 4): gridul GEOMETRIC are liniile în progresie geometrică - zigzag între două linii geometrice vecine = o pereche la fiecare dus-întors
  // (pe linii aritmetice același drum, 69,79 ↔ 70,29, n-ar închide nimic)
  const geo = (k) => GRID.jos * Math.pow(GRID.sus / GRID.jos, k / (GRID.linii - 1)), brutG = botBrut("short", 71, { acum: ACUM, x: { gridType: "geometric" } }); assert.equal(brutG.buOrderData.gridType, "geometric");
  const mG = TB.masoara({ bot: brutG, klinePerp: lum(Array.from({ length: 100 }, (_, i) => (i % 2 ? geo(11) : geo(10)))), istoric: [], acum: ACUM, pretPerpViu: geo(11) }).trepte;
  assert.ok(Math.abs(mG.perechiDinDrum - 49 / 8.25) < 1e-9, "geometric: " + mG.perechiDinDrum * 8.25); assert.ok(geo(10) > 69.5 && geo(10) < 70 && geo(11) > 70 && geo(11) < 70.5, "premisa: drumul stă între liniile aritmetice 69,5 / 70 / 70,5");
  assert.equal(m("short", Array.from({ length: 100 }, (_, i) => (i % 2 ? geo(11) : geo(10)))), 0, "același drum pe gridul aritmetic nu închide nicio pereche");
  // revizia a doua (🟡 5): gridul neutru FĂRĂ preț de pornire - nu se poate ști ce loturi ține ⇒ fără cifră (înainte: numărat ca un long cu loturi)
  for (const init of ["", "0", undefined, "abc"]) { const bn = botBrut("neutral", 71, { acum: ACUM }); if (init === undefined) delete bn.buOrderData.initPrice; else bn.buOrderData.initPrice = init;
    const t = TB.masoara({ bot: bn, klinePerp: lum(urca), istoric: [], acum: ACUM, pretPerpViu: urca[urca.length - 1] }).trepte; assert.equal(t.perechiDinDrum, undefined, "initPrice " + JSON.stringify(init) + ": " + t.perechiDinDrum); assert.equal(t.perechiUltimaOra, undefined); assert.ok(t.valoare > 0, "drumul în trepte rămâne"); }
});
await test("pagina spune perechile din drum lângă cele făcute de bot, ca fapt (închiderile la 5 minute arată mai puțin drum decât a fost)", () => {
  const c = { TextRo: globalThis.TextRo, isFinite }; vm.createContext(c); vm.runInContext(taie(APP, "tbPerechiDinDrumText"), c);
  const COADA = " Între închideri prețul mai atinge linii, deci numărul adevărat poate fi mai mare.", CAP = "Pe liniile gridului, închiderile la 5 minute din ultimele 8,3 h ar fi dat cam ";
  // revizia a doua (🟡 6): ultima oră a botului (din istoric: are și „baza”) se pune lângă ULTIMA ORĂ a drumului, nu lângă media pe 8 ore
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 2.94, oreDrum: 8.25, perechiUltimaOra: 3 }, ritmPerechi: { valoare: 2.4, baza: 2 } }, 30), CAP + "2,9 perechi pe oră. În ultima oră ar fi dat 3, iar botul a făcut 2,4." + COADA);
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 2.94, oreDrum: 8.25 }, ritmPerechi: { valoare: 2.4, baza: 2 } }, 30), CAP + "2,9 perechi pe oră." + COADA, "fără numărătoarea ultimei ore nu se compară");
  // media pe 24 h (fără istoric) doar la botul de cel puțin 24 h și spusă ca ALTĂ fereastră; la unul mai nou nu se compară (un bot de 20 de minute ar ieși „0,0”)
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 2.94, oreDrum: 8.25 }, ritmPerechi: { valoare: 1.1, baza: null } }, 30), CAP + "2,9 perechi pe oră. Pe ultimele 24 h (altă fereastră) botul a făcut în medie 1,1 pe oră." + COADA);
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 0.9, oreDrum: 8.25, perechiUltimaOra: 1 }, ritmPerechi: { valoare: 0, baza: null } }, 0.4), CAP + "0,9 perechi pe oră." + COADA, "bot de 20 de minute: fără comparație");
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 0.9, oreDrum: 8.25 }, ritmPerechi: { valoare: 0.5, baza: null } }, null), CAP + "0,9 perechi pe oră." + COADA, "vârsta necunoscută: fără comparație");
  assert.equal(c.tbPerechiDinDrumText({ trepte: { perechiDinDrum: 0.04, oreDrum: 8.25 }, ritmPerechi: { valoare: null } }, 50), CAP + "0,04 perechi pe oră." + COADA);
  for (const x of [null, {}, { trepte: {} }, { trepte: { perechiDinDrum: NaN } }]) assert.equal(c.tbPerechiDinDrumText(x, 50), "");
  assert.match(taie(APP, "renderTabloBot"), /tbPerechiDinDrumText\(m,b&&Number\(b\.pornitLa\)>0\?\(Date\.now\(\)-Number\(b\.pornitLa\)\)\/3600000:null\)/);
});
await test("regimul pentru grid pe pagină: socotit pe barele închise de 1 oră și de 4 ore cu ADX-ul din calc, scris sub cele șapte măsuri; fără date nu apare", () => {
  const c = { RegimGrid: R }; vm.createContext(c); vm.runInContext(taie(APP, "tbRegimGridText"), c);
  const d = { indicatori: [{ tf: "15M", q: { regimGrid: { trend: "trend", vol: "normala", adx: 30, percentila: 50 } } }, { tf: "60M", q: { regimGrid: { trend: "lateral", vol: "joasa", adx: 14.2, percentila: 12 } } }, { tf: "4H", q: { regimGrid: { trend: "trend", vol: "ridicata", adx: 31, percentila: 88 } } }, { tf: "1D", q: null }] };
  const t = c.tbRegimGridText(d); assert.match(t, /^Regimul pentru grid\npe 1 oră: lateral \(ADX 14\), benzile strânse \(percentila 12\)/); assert.match(t, /\npe 4 ore: trend \(ADX 31\), benzile largi \(percentila 88\)/); assert.equal(t.split("\n").length, 3, "câte un rând pe interval");
  assert.match(citeste("public", "app.css"), /#tbRegimGrid\{white-space:pre-line\}/); assert.doesNotMatch(t, /15 min|ADX 30/, "doar 1 oră și 4 ore, cele măsurate");
  assert.equal(c.tbRegimGridText({ indicatori: [{ tf: "60M", q: { regimGrid: { trend: null, vol: null } } }] }), ""); assert.equal(c.tbRegimGridText(null), ""); assert.equal(c.tbRegimGridText({ indicatori: [] }), "");
  // „trend” după ADX lângă becul „lateral” al aceluiași interval: rândul spune de ce (ADX-ul rămâne mare după o mișcare trecută), ca tabelul trendului
  const NOTA = " · becul zice lateral: ADX-ul ține minte o mișcare mai veche", cuBec = (r) => c.tbRegimGridText(Object.assign({}, d, { rez: r })).split("\n");
  const amb = cuBec([{ tf: "60M", dir: "lateral" }, { tf: "4H", dir: "lateral" }]); assert.equal(amb[2], "pe 4 ore: trend (ADX 31), benzile largi (percentila 88)" + NOTA + " · ce urmează: nedovedit", "nota stă lângă etichetă, înaintea lui „ce urmează”");
  assert.equal(R.text({ trend: "trend", vol: null, adx: 31, percentila: null }, { tf: "4 ore", nota: "x" }), "pe 4 ore: trend (ADX 31) · x · ce urmează: nedovedit"); assert.equal(R.text({ trend: "trend", vol: null, adx: 31, percentila: null }, { tf: "4 ore", nota: "" }), "pe 4 ore: trend (ADX 31) · ce urmează: nedovedit"); assert.ok(!amb[1].includes("becul zice"), "regimul lateral cu becul lateral nu are ce împăca: " + amb[1]);
  assert.ok(!cuBec([{ tf: "4H", dir: "urca" }])[2].includes("becul zice")); assert.ok(!cuBec([{ tf: "4H", dir: null }])[2].includes("becul zice")); assert.ok(!cuBec(null)[2].includes("becul zice")); assert.ok(!t.includes("becul zice"), "fără becuri: fără notă");
  assert.match(taie(APP, "tbCalculeazaIndicatorii"), /regimGrid=RegimGrid\.clasifica\(/); assert.match(taie(APP, "renderTabloIndicatori"), /tbRegimGrid/);
  // revizia (🟡 5): regimul altei monede nu rămâne sub botul nou cât se aduce direcția lui
  assert.match(taie(APP, "renderTabloIndicatori"), /var rgT=bRg&&dRg&&dRg\.simbol===tbCheieDir\(bRg\)\?tbRegimGridText\(dRg\):"";/);
  assert.match(HTML, /<div class="accountRows" id="tbMasuri"><div class="emptyState">—<\/div><\/div><p class="tbSub" id="tbPerechiDinDrum" hidden(="")?><\/p><p class="tbSub" id="tbRegimGrid" hidden(="")?><\/p>/);
  assert.match(HTML, /<script src="\/lib\/tv-note\.js"><\/script><script src="\/lib\/regim-grid\.js"><\/script>/); assert.ok(SW.includes('"/lib/tv-note.js","/lib/regim-grid.js",'), "modulul în lista de cache");
});

// ---------------- M5: „fără privit înainte”, mecanic, pe drumul întreg al etichetelor ----------------
await test("M5: etichetele de la bara i (regimul din calc + lățimea benzilor + becul) ies aceleași cu barele de după i STRICATE și cu seria TĂIATĂ la i; scriptul de măsurare folosește aceeași funcție", () => {
  const M = incarcaMotor({ extra: ["regimProfil", "profilDinRegim"] }), Directie = incarcaLib(["text-ro.js", "directie.js"], "Directie"), rnd = mulberry32(41), FER = 499;
  const inCalc = (w) => w.map((x) => [x[0], String(x[1]), String(x[2]), String(x[3]), String(x[4]), String(x[5]), x[0] + 1, String(x[5] * x[4])]);
  let c = 100; const k = []; for (let i = 0; i < 760; i++) { const o = c; c = c * (1 + (rnd() - 0.5) * 0.02 + 0.0015 * Math.sin(i / 40)); k.push([i * 3600000, o, Math.max(o, c) * 1.002, Math.min(o, c) * 0.998, c, 1000 + i]); }
  const et = (kk, i) => etichetaM5({ k: kk, cl: kk.map((x) => x[4]), i, FER, C: M.c, RegimGrid: R, Directie, orizont: 24, msTf: 3600000, inCalc });
  const vazute = new Set();
  for (const i of [520, 575, 640, 700, 735]) {
    const curat = et(k, i); assert.ok(curat && (curat.trend || curat.vol || curat.bec), "fără etichetă la " + i); vazute.add(curat.trend + "/" + curat.vol + "/" + curat.bec);
    const stricat = k.map((x, j) => (j > i ? [x[0], x[1] * 7, x[2] * 9, x[3] * 0.1, x[4] * (j % 2 ? 5 : 0.2), 1] : x));
    assert.deepEqual(et(stricat, i), curat, "barele de după " + i + " au schimbat eticheta de la " + i);
    assert.deepEqual(et(k.slice(0, i + 1), i), curat, "seria tăiată la " + i + " dă altă etichetă");
  }
  assert.ok(vazute.size >= 2, "seria de probă trece prin mai multe regimuri: " + [...vazute].join(" · "));
  const S = citeste("scripts", "cercetare-v100339-acuratete.mjs"); assert.match(S, /import \{ etichetaM5 \} from "\.\/lib\/m5-etichete\.mjs";/);
  assert.match(S, /const e = etichetaM5\(\{ k, cl, i, FER, C, RegimGrid, Directie, orizont: TFS\[tf\]\.orizont, msTf: TFS\[tf\]\.ms, inCalc \}\);/);
});

// ---------------- dovada pe blocuri (amendamentul M5) ----------------
await test("coada Student e cea din tabele: t = 2,086 la 20 de grade ⇒ 2,5%; 3,850 ⇒ 0,05%; 1,812 la 10 ⇒ 5%; 4,032 la 5 ⇒ 0,5%; simetrică", () => {
  const ap = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + " față de " + b);
  ap(pStudentSus(2.085963, 20), 0.025, 2e-6); ap(pStudentSus(3.849516, 20), 0.0005, 2e-7); ap(pStudentSus(1.812461, 10), 0.05, 2e-6); ap(pStudentSus(4.032143, 5), 0.005, 2e-7);
  ap(pStudentSus(0, 7), 0.5, 1e-12); ap(pStudentSus(-2.085963, 20), 0.975, 2e-6); ap(pStudentSus(12.706205, 1), 0.025, 2e-6); ap(pStudentSus(1.959964, 1e6), 0.025, 2e-5);
  assert.ok(Number.isNaN(pStudentSus(1, 0)) && Number.isNaN(pStudentSus(NaN, 5)));
});
await test("testul pe blocuri: media și abaterea pe valorile blocurilor, p într-o singură parte; sub 5 blocuri nu se judecă; blocurile cu o clasă prea mică se sar", () => {
  const r = testBlocuri([1, 2, 3, 4, 5]); assert.equal(r.n, 5); assert.equal(r.medie, 3); assert.ok(Math.abs(r.sd - Math.sqrt(2.5)) < 1e-12); assert.ok(Math.abs(r.t - 3 / (Math.sqrt(2.5) / Math.sqrt(5))) < 1e-12); assert.ok(Math.abs(r.p - pStudentSus(r.t, 4)) < 1e-15);
  assert.ok(testBlocuri([-1, -2, -3, -4, -5]).p > 0.99, "media negativă nu e dovadă pentru „> 0”"); assert.ok(Number.isNaN(testBlocuri([1, 2, 3, 4]).p)); assert.equal(testBlocuri([1, NaN, 2, Infinity, 3, 4, 5]).n, 5);
  assert.equal(testBlocuri([2, 2, 2, 2, 2]).p, 0); assert.equal(testBlocuri([0, 0, 0, 0, 0]).p, 1);
  // zile ⇒ blocuri de 5 zile calendaristice (zilele lipsă nu mută granițele)
  const zile = {}; for (const [z, a, b] of [["2026-01-01", 30, 30], ["2026-01-03", 30, 30], ["2026-01-05", 10, 10], ["2026-01-06", 25, 25], ["2026-01-10", 5, 40], ["2026-01-12", 40, 40]]) zile[z] = { x: { n: a, s: a * 0.3 }, y: { n: b, s: b * 0.2 } };
  const bl = blocuriDinZile(zile, 5); assert.equal(bl.length, 3); assert.deepEqual([bl[0].x.n, bl[1].x.n, bl[2].x.n], [70, 30, 40]);
  const v = valoriPeBlocuri(bl, "x", "y", "diferenta", 20); assert.equal(v.length, 3); assert.ok(v.every((d) => Math.abs(d - 0.1) < 1e-12));
  assert.equal(valoriPeBlocuri(bl, "x", "y", "diferenta", 35).length, 2, "blocul cu 30 de eșantioane pe clasă e sărit la pragul 35");
  const lr = valoriPeBlocuri(bl, "x", "y", "logRaport", 20); assert.ok(lr.every((d) => Math.abs(d - Math.log(1.5)) < 1e-12)); assert.deepEqual(valoriPeBlocuri(bl, "x", "lipsa", "diferenta"), []);
});
await test("clasificarea pe toată seria deodată (pentru simularea de mărime) dă, bară cu bară, exact etichetele lui clasifica", () => {
  const rnd = mulberry32(77), c = []; let p = 100; for (let i = 0; i < 400; i++) { p *= 1 + (rnd() - 0.5) * (i > 250 ? 0.04 : 0.008); c.push(p); }
  const adx = c.map((_, i) => (i < 30 ? null : 10 + 25 * rnd())), S = R.clasificaSerie(c, adx); assert.equal(S.length, c.length);
  for (let i = 0; i < c.length; i++) assert.deepEqual(S[i], R.clasifica(c, i, adx[i]), "bara " + i);
  assert.ok(new Set(S.map((x) => x.vol)).size >= 3 && new Set(S.map((x) => x.trend)).size >= 3, "seria de probă trece prin toate clasele");
});

await test("(F7) becul lateral: fără „bun pentru grid”, fără verde; o piață laterală nu mai apare „cu botul” (rezumat, KPI, bandă, sfat) și nici „regimul potrivit unui grid”", () => {
  const D = new Function(citeste("public", "lib", "directie.js") + "; return Directie;")();
  for (const d of ["long", "short"]) assert.deepEqual(D.fataDeBot("lateral", d), { eticheta: "nici cu botul, nici împotrivă", ton: "neutru" });
  assert.deepEqual(D.fataDeBot("lateral", "neutral"), { eticheta: "nu împinge gridul spre o margine", ton: "neutru" });
  assert.equal(D.fataDeBot("urca", "long").ton, "bine"); assert.equal(D.fataDeBot("urca", "short").ton, "rau"); assert.equal(D.fataDeBot("urca", "neutral").ton, "atentie");
  const r = (tf, et, dir, bot, formare) => ({ tf, eticheta: et, dir, fata: D.fataDeBot(dir, bot), formare: formare || null });
  const lat = D.rezumat([r("4H", "4 ore", "lateral", "long"), r("1D", "1 zi", "lateral", "long")], "long");
  assert.equal(lat.ton, "lateral"); assert.equal(lat.text, "Piața e laterală (4 ore e laterală, 1 zi e laterală)."); assert.doesNotMatch(lat.text + lat.dovezi, /potrivit unui grid/);
  // lateral + cu botul rămâne „cu botul”; lateral + împotrivă rămâne „amestecate”; toate împotrivă rămâne „împotrivă”
  assert.equal(D.rezumat([r("4H", "4 ore", "lateral", "long"), r("1D", "1 zi", "urca", "long")], "long").ton, "bine");
  assert.equal(D.rezumat([r("4H", "4 ore", "lateral", "long"), r("1D", "1 zi", "coboara", "long")], "long").ton, "atentie");
  assert.equal(D.rezumat([r("4H", "4 ore", "coboara", "long"), r("1D", "1 zi", "coboara", "long")], "long").ton, "rau");
  // bara de 4 ore în formare care se mișcă tare coboară tonul și pe o piață laterală (ca până acum)
  const misc = D.rezumat([r("4H", "4 ore", "lateral", "long", { pct: -3.2 }), r("1D", "1 zi", "lateral", "long")], "long"); assert.equal(misc.ton, "atentie"); assert.match(misc.text, /dar în bara de 4 ore de acum prețul scade cu 3,2%/);
  // nicăieri în pagină sau în colector
  for (const f of [["public", "lib", "directie.js"], ["public", "lib", "indicatori-bot.js"], ["public", "lib", "grafic-bot.js"], ["public", "index.html"], ["public", "app.js"], ["public", "lib", "sfaturi.js"], ["public", "lib", "pret-viu.js"]]) {
    const t = citeste(...f); assert.doesNotMatch(t, /bun pentru grid/, f.join("/")); assert.doesNotMatch(t, /potrivit unui grid/, f.join("/")); assert.doesNotMatch(t, /e bine pentru un grid/, f.join("/") + " (revizia a doua: sfatul de trend mai lăuda lateralul)"); }
  assert.match(citeste("public", "lib", "indicatori-bot.js"), /titlu: "Tăria trendului: sub 20 = fără trend, peste 25 = trend\. Culoarea = cine trage \(\+DI \/ −DI\)\."/);
  // KPI-ul „Piața” și banda prețului viu: „Laterală”, nu „Cu botul”
  assert.match(taie(APP, "tbDeseneazaKpi"), /z\.ton==="rau"\?"Împotrivă":z\.ton==="bine"\?"Cu botul":z\.ton==="lateral"\?"Laterală":"Amestecat"/);
  assert.match(citeste("public", "lib", "pret-viu.js"), /z\.ton === "bine" \? "piața: cu botul" : z\.ton === "lateral" \? "piața: laterală" : "piața: amestecat"/);
  // sfatul „direcție”: titlul spune ce e, tonul e informativ (nici verde, nici „semnale amestecate”)
  globalThis.Directie = D; const S = incarcaLib(["text-ro.js", "sfaturi.js"], "Sfaturi", { global: { Directie: D } });
  const sf = (z) => S.sfaturi({ bot: { id: "x", baza: "ABC", directie: "long" }, rezumat: z, acum: Date.now() }).find((x) => x.cod === "directie");
  const sl = sf(lat); assert.equal(sl.titlu, "Piața e laterală"); assert.equal(sl.ton, "info"); assert.equal(sl.faCe, null);
  assert.equal(sf({ ton: "bine", text: "x", dovezi: "x" }).titlu, "Piața nu lucrează împotriva botului"); assert.equal(sf({ ton: "atentie", text: "x", dovezi: "x" }).titlu, "Piața dă semnale amestecate"); assert.equal(sf({ ton: "rau", text: "x", dovezi: "x" }).ton, "atentie");
  // semaforul și rândul lui: becul lateral e „neutru” (gri), se numără tot la „cu botul sau laterale”, dar singur nu mai face rândul verde
  const GB = incarcaLib(["text-ro.js", "directie.js", "grafic-bot.js"], "GraficBot");
  const bec = (dir, ton) => ({ dir, ton, text: "x" }), sumar = (l) => JSON.parse(JSON.stringify(GB.trendSumar(l)));   /* obiectul vine din alt context vm */
  assert.deepEqual(sumar([bec("lateral", "neutru"), bec("lateral", "neutru")]), { stare: "info", text: "2 din 2 cu botul sau laterale — tabelul de sub grafic" });
  assert.equal(sumar([bec("urca", "bine"), bec("lateral", "neutru")]).stare, "bine"); assert.equal(sumar([bec("urca", "bine"), bec("lateral", "neutru")]).text, "2 din 2 cu botul sau laterale — tabelul de sub grafic");
  // un singur bec împotrivă lângă cinci laterale rămâne „atenție”, nu „rău” (regula de dinainte: împotrivă > cu botul sau laterale)
  assert.equal(sumar([bec("coboara", "rau")].concat(Array.from({ length: 5 }, () => bec("lateral", "neutru")))).stare, "atentie");
  assert.equal(sumar([bec("coboara", "rau"), bec("coboara", "rau"), bec("lateral", "neutru")]).stare, "rau");
});

await test("ce scrie pagina ca „măsurat” e exact ce a dovedit M5 în jurnal (revizia: nimic nu lega RegimGrid.MASURAT de verdictul scris); becul lateral nu poartă nicio vorbă măsurată cât C e nedovedit", () => {
  const J = citeste("docs", "cercetare", "2026-11-13-tablou-acuratete.md"), m = /^Verdict M5 pentru pagină: 1h A=(\S+) B=(\S+) C=(\S+); 4h A=(\S+) B=(\S+) C=(\S+)$/m.exec(J);
  assert.ok(m, "rândul „Verdict M5 pentru pagină” lipsește din jurnal"); for (const v of m.slice(1)) assert.ok(["DOVEDIT", "NEDOVEDIT", "PREA PUȚINE"].includes(v.replace(/_/g, " ")), v);
  const V = { "1h": { A: m[1], B: m[2], C: m[3] }, "4h": { A: m[4], B: m[5], C: m[6] } };
  for (const tf of ["1h", "4h"]) { const M = R.MASURAT[tf], are = (K) => !!(M && M[K]);
    assert.equal(are("A"), V[tf].A === "DOVEDIT", tf + " A: pagina " + JSON.stringify(M) + ", jurnalul " + V[tf].A); assert.equal(are("B"), V[tf].B === "DOVEDIT", tf + " B: pagina " + JSON.stringify(M) + ", jurnalul " + V[tf].B);
    // textul chiar urmează MASURAT: fără nimic dovedit scrie „nedovedit” și nicio cifră „măsurată”
    const t = R.text({ trend: "lateral", vol: "ridicata", adx: 14, percentila: 88 }, { tf, masurat: M });
    if (!are("A") && !are("B")) { assert.match(t, / · ce urmează: nedovedit$/); assert.doesNotMatch(t, /măsurat/); } }
  // becul lateral: vorba măsurată („de obicei oscilează mai mult decât înaintează”) doar dacă C e DOVEDIT pe ambele intervale
  const D = new Function(citeste("public", "lib", "directie.js") + "; return Directie;")(), cDovedit = V["1h"].C === "DOVEDIT" && V["4h"].C === "DOVEDIT";
  assert.equal(/oscilează mai mult/.test(D.fataDeBot("lateral", "long").eticheta), cDovedit); assert.equal(D.fataDeBot("lateral", "long").ton, "neutru", "verde nu mai e, oricum ar fi ieșit C");
  // rezultatul chiar e scris: tabelul cu cele 12 teste și regula porții
  assert.match(J, /### M5 — rezultatul \(rulat 14\.11\.2026/); assert.equal((J.split("### M5 — rezultatul")[1].match(/^\| (1h|4h) \|/gm) || []).length, 12, "12 rânduri de test"); assert.match(J, /\*\*Poarta: trecută\*\*/);
});

await test("regimul din pagină, RULAT (revizia: era ținut doar de o expresie regulată): tbCalculeazaIndicatorii îl pune pe 1 oră și 4 ore, din închiderile barelor ÎNCHISE și din ADX-ul lui calc; pe 15 min și 1 zi nu", () => {
  const IB = new Function(citeste("public", "lib", "indicatori-bot.js") + "; return IndicatoriBot;")(), acum = Date.now(), rnd = mulberry32(9);
  const randuri = (ms, n) => { let p = 100; return Array.from({ length: n }, (_, i) => { const o = p; p *= 1 + (rnd() - 0.5) * 0.02; return { time: Math.floor(acum / ms) * ms - (n - 1 - i) * ms, open: o, high: Math.max(o, p) * 1.003, low: Math.min(o, p) * 0.997, close: p, volume: 500 + i }; }); };
  const TF = [{ tf: "15M", eticheta: "15 min" }, { tf: "60M", eticheta: "1 oră" }, { tf: "4H", eticheta: "4 ore" }, { tf: "1D", eticheta: "1 zi" }], CALC = { "15M": "15m", "60M": "1h", "4H": "4h", "1D": "1d" }, MS = { "15M": 900000, "60M": 3600000, "4H": 14400000, "1D": 86400000 };
  const M = incarcaMotor({ extra: ["tbCalculeazaIndicatorii"], global: { tbStare: { bot: null }, IndicatoriBot: IB, RegimGrid: R, TextRo: globalThis.TextRo, TB_DIR_TF: TF, TB_TF_CALC: CALC, tbIstoric4h() {}, tbVerdictConfirmat() {} } });
  const d = { simbol: "X|long", randuriPe: {} }; for (const x of TF) d.randuriPe[x.tf] = randuri(MS[x.tf], 320);
  M.c.tbCalculeazaIndicatorii(d); assert.equal(d.indicatori.length, 4);
  for (const x of d.indicatori) { assert.ok(x.q, x.tf + ": fără indicatori (" + x.eroare + ")");
    if (x.tf === "60M" || x.tf === "4H") { const j = M.c.bareInchise(IB.dinPionex(d.randuriPe[x.tf]), CALC[x.tf], Date.now()), cl = j.map((y) => +y[4]);
      assert.equal(j.length, 319, "bara în curs nu intră"); assert.deepEqual(x.q.regimGrid, R.clasifica(cl, cl.length - 1, x.q.adx), x.tf); assert.ok(x.q.regimGrid.trend && x.q.regimGrid.vol, x.tf + ": " + JSON.stringify(x.q.regimGrid)); }
    else assert.equal(x.q.regimGrid, undefined, x.tf + " nu e un interval măsurat"); }
});

console.log(`\n${teste - picate}/${teste} teste trecute${picate ? " — " + picate + " PICATE" : ""}`);
process.exit(picate ? 1 : 0);
