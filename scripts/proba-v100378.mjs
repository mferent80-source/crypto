// Proba v100.378 (I-922…I-926; el, 23.11.2026: „în Radar, și la bot și la Trade 212, să fie vizibilă mișcarea live, cât a crescut astăzi sau
// scăzut, 3 zile, 5-7” ⇒ „fă toate, 24 de ore, și 3 zile la acțiuni”):
//   A. public/lib/miscare.js (pur): mișcarea prețului pe 24 h / 3 zile / 7 zile / 30 de zile, ziua obișnuită, față de reper,
//      banii botului pe ferestre (din istoria de 7 zile), ședințele și mișcarea acțiunilor (azi / 3 / 5 / 30), leii, ziua contului
//   B. public/lib/acasa.js: „față de acum 3 / 7 zile” din aceleași poze zilnice ca „față de ieri dimineață”
//   C. legăturile: modulul e încărcat (index.html, sw.js), Tabloul are blocul #tbMiscare, T212 are celula c-misc și rândul contului
// Rulare: node scripts/proba-v100378.mjs
import assert from "node:assert/strict";
import { cuTablou } from "./lib/sursa-app.mjs";
import fs from "node:fs";

const citeste = (f) => fs.existsSync(new URL(f, import.meta.url)) ? fs.readFileSync(new URL(f, import.meta.url), "utf8") : "";
const SRC = citeste("../public/lib/miscare.js");
const M = SRC ? new Function(`${SRC}; return Miscare;`)() : null;
const TEXT = citeste("../public/lib/text-ro.js"), ACASA = citeste("../public/lib/acasa.js");
const A = ACASA && TEXT ? new Function(`${TEXT}; ${ACASA}; return Acasa;`)() : null;
const APP = cuTablou(citeste("../public/app.js")), HTML = citeste("../public/index.html"), CSS = citeste("../public/app.css"), SW = citeste("../public/sw.js");
const T212E = citeste("../public/lib/t212-ecran.js"), ACE = citeste("../public/lib/acasa-ecran.js");

let teste = 0, picate = 0;
function test(nume, fn) { teste++; try { fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).split("\n")[0]}`); } }
const aproape = (a, b, eps = 1e-9) => assert.ok(a !== null && a !== undefined && Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

const MIN = 60000, ORA = 3600000, ZI = 86400000;
const ACUM = Date.UTC(2026, 10, 23, 15, 2, 30);   /* 23.11.2026 15:02:30 UTC - în mijlocul unei lumânări */
// n lumânări de `per`, ultima în formare la ACUM; prețul lumânării i (0 = cea mai veche) dat de f(i) = închiderea; deschiderea = închiderea de dinainte
function lum(n, per, f) {
  const tUlt = Math.floor(ACUM / per) * per, v = [];
  for (let i = 0; i < n; i++) { const c = f(i), o = i ? f(i - 1) : c; v.push({ t: tUlt - (n - 1 - i) * per, o, h: Math.max(o, c), l: Math.min(o, c), c }); }
  return v;
}

console.log("\nV100.378 · mișcarea pe ferestre · proba\n");

console.log("A. modulul pur");
test("modulul Miscare există", () => assert.ok(M, "public/lib/miscare.js lipsește"));
test("ferestrele prețului: 24 h pe 5m, 3 zile pe 15m, 7 zile pe 1h, 30 de zile pe 4h", () => {
  assert.deepEqual(M.FERESTRE.map((f) => [f.k, f.tf, f.ms, f.per, f.et]), [["24h", "5M", ZI, 5 * MIN, "24 h"], ["3z", "15M", 3 * ZI, 15 * MIN, "3 zile"], ["7z", "60M", 7 * ZI, ORA, "7 zile"], ["30z", "4H", 30 * ZI, 4 * ORA, "30 de zile"]]);
  assert.deepEqual(M.FERESTRE_BOT.map((f) => [f.k, f.ms, f.et]), [["1h", ORA, "1 oră"], ["4h", 4 * ORA, "4 ore"], ["24h", ZI, "24 h"], ["3z", 3 * ZI, "3 zile"], ["7z", 7 * ZI, "7 zile"]]);
});
test("24 h cu exact 288 de lumânări de 5 min (cum le aduce pagina): reperul = deschiderea primei", () => {
  const b = lum(288, 5 * MIN, (i) => 100 + i * 0.1);   /* prima deschidere 100 */
  const r = M.fereastra(b, 110, ACUM, ZI, 5 * MIN);
  aproape(r.pct, 10); assert.equal(r.ref, 100);
});
test("cu istorie mai lungă: reperul e lumânarea care cuprinde clipa de acum 24 h, nu prima din listă", () => {
  const b = lum(500, 5 * MIN, (i) => 50 + i);          /* crește cu 1 pe lumânare */
  const r = M.fereastra(b, 600, ACUM, ZI, 5 * MIN);
  /* ACUM e la 2,5 min în lumânarea 499; clipa de acum 24 h e la 2,5 min în lumânarea 499 − 288 = 211 ⇒ a doua jumătate ⇒ închiderea ei = 50 + 211 */
  assert.equal(r.ref, 261); aproape(r.pct, (600 / 261 - 1) * 100);
});
test("clipa căutată în PRIMA jumătate a lumânării ⇒ reperul e deschiderea ei (revizia: ramura nu era probată)", () => {
  const b = lum(500, 5 * MIN, (i) => 50 + i), acum1 = Math.floor(ACUM / (5 * MIN)) * 5 * MIN + MIN;   /* la un minut în lumânare */
  assert.equal(M.fereastra(b, 600, acum1, ZI, 5 * MIN).ref, 260);   /* lumânarea 211: deschiderea ei = închiderea celei dinainte = 50 + 210 */
});
test("scădere: procent negativ, simetric", () => { const r = M.fereastra(lum(288, 5 * MIN, () => 200), 180, ACUM, ZI, 5 * MIN); aproape(r.pct, -10); });
test("locul prețului între minimul și maximul ferestrei (0 = jos, 1 = sus)", () => {
  const b = lum(288, 5 * MIN, (i) => i === 100 ? 80 : i === 200 ? 120 : 100);
  const r = M.fereastra(b, 90, ACUM, ZI, 5 * MIN);
  assert.equal(r.min, 80); assert.equal(r.max, 120); aproape(r.loc, 0.25);
});
test("prețul de acum peste maximul lumânărilor mută maximul (loc = 1), sub minim mută minimul (loc = 0)", () => {
  const b = lum(288, 5 * MIN, () => 100);
  assert.equal(M.fereastra(b, 130, ACUM, ZI, 5 * MIN).loc, 1); assert.equal(M.fereastra(b, 70, ACUM, ZI, 5 * MIN).loc, 0);
});
test("istorie mai scurtă decât fereastra (monedă nouă) ⇒ null, nu o cifră pe mai puține zile", () => {
  assert.equal(M.fereastra(lum(100, 5 * MIN, () => 100), 110, ACUM, ZI, 5 * MIN), null);
  assert.equal(M.fereastra(lum(288, 5 * MIN, () => 100), 110, ACUM, 3 * ZI, 5 * MIN), null);
});
test("fără preț, fără lumânări sau cu reper zero ⇒ null", () => {
  assert.equal(M.fereastra(lum(288, 5 * MIN, () => 100), null, ACUM, ZI, 5 * MIN), null);
  assert.equal(M.fereastra([], 100, ACUM, ZI, 5 * MIN), null);
  assert.equal(M.fereastra(null, 100, ACUM, ZI, 5 * MIN), null);
  assert.equal(M.fereastra(lum(288, 5 * MIN, () => 0), 100, ACUM, ZI, 5 * MIN), null);
});
test("ferestre(): cele patru deodată, fiecare din intervalul ei; lipsa unui interval lasă doar fereastra lui goală", () => {
  const pe = { "5M": lum(288, 5 * MIN, () => 100), "15M": lum(288, 15 * MIN, () => 80), "60M": lum(168, ORA, () => 125) };
  const r = M.ferestre(pe, 100, ACUM);
  aproape(r["24h"].pct, 0); aproape(r["3z"].pct, 25); aproape(r["7z"].pct, -20); assert.equal(r["30z"], null);
});
test("ziua obișnuită: mediana mișcării absolute pe 24 h din lumânările de 4 ore; sub 60 de ferestre ⇒ null", () => {
  /* închiderile alternează 100 / 102 la fiecare 6 lumânări ⇒ |mișcarea pe 24 h| e mereu 2% sau 1,96% */
  const b = lum(181, 4 * ORA, (i) => Math.floor(i / 6) % 2 ? 102 : 100);
  const z = M.ziObisnuita(b); assert.ok(z.mediana > 1.9 && z.mediana <= 2.0001, String(z.mediana)); assert.equal(z.n, 174);
  assert.equal(M.ziObisnuita(lum(40, 4 * ORA, (i) => Math.floor(i / 6) % 2 ? 102 : 100)), null, "40 de lumânări care se mișcă = 33 de ferestre, sub 60");
  assert.equal(M.ziObisnuita(lum(181, 4 * ORA, () => 100)), null, "moneda care nu se mișcă n-are «obișnuit»");
});
test("ziua obișnuită ia doar ultimele 30 de zile (180 de lumânări închise de 4 ore), oricâte ar fi aduse (revizia: 500 de lumânări = 83 de zile)", () => {
  const b = lum(500, 4 * ORA, (i) => i < 319 ? (Math.floor(i / 6) % 2 ? 150 : 100) : (Math.floor(i / 6) % 2 ? 102 : 100));
  const z = M.ziObisnuita(b); assert.equal(z.n, 174); assert.ok(z.mediana <= 2.0001, "mișcările de acum două luni nu intră: " + z.mediana);
});
test("rotunjirea pentru afișare: un zero rotunjit e zero fără semn (fără «−0,0%» și «−0 lei»)", () => {
  assert.ok(Object.is(M.rot(-0.03, 1), 0)); assert.ok(Object.is(M.rot(-0.4, 0), 0)); assert.equal(M.rot(-0.06, 1), -0.1); assert.equal(M.rot(12.34, 1), 12.3); assert.equal(M.rot(null, 1), null);
});
test("de câte ori: mărimea mișcării față de ziua obișnuită, fără semn", () => {
  aproape(M.deCateOri(-4, { mediana: 2 }), 2); aproape(M.deCateOri(3, { mediana: 2 }), 1.5); assert.equal(M.deCateOri(3, null), null); assert.equal(M.deCateOri(null, { mediana: 2 }), null);
});
test("față de reper: puncte procentuale pe aceeași fereastră, simetric; fără una din ele ⇒ null", () => {
  aproape(M.fataDe({ pct: -6.2 }, { pct: -1.1 }), -5.1, 1e-9); aproape(M.fataDe({ pct: 3 }, { pct: -2 }), 5); assert.equal(M.fataDe(null, { pct: 1 }), null); assert.equal(M.fataDe({ pct: 1 }, null), null);
});

console.log("\nA2. banii botului");
// istoria botului: un punct pe minut, 7 zile; totalul scade cu 0,001 pe minut, grilele cresc cu 0,0005 pe minut
const ist = (minute, f) => { const v = []; for (let i = minute; i >= 0; i--) v.push(Object.assign({ t: ACUM - i * MIN }, f(i))); return v; };
const IST = ist(7 * 1440, (i) => ({ profitTotal: -20 + i * 0.001, gridProfitBrut: 30 - i * 0.0005, gridJos: 0.37, gridSus: 0.4 }));
const ACUM_BOT = { total: -20, grile: 30, pornitLa: ACUM - 20 * ZI, gridJos: 0.37, gridSus: 0.4 };
test("24 h: total = acum − atunci; grile = cât au adus grilele; rest = total − grile", () => {
  const r = M.bot(IST, ACUM, ZI, ACUM_BOT);
  aproape(r.total, -1.44, 1e-9); aproape(r.grile, 0.72, 1e-9); aproape(r.rest, -2.16, 1e-9); assert.equal(r.gridMutat, false); assert.equal(r.deLa, ACUM - ZI);
});
test("1 oră și 4 ore: botul lui trăiește ore, nu zile - ferestrele scurte au cifră", () => {
  const r = M.botFerestre(IST, ACUM, ACUM_BOT);
  aproape(r["1h"].total, -0.06, 1e-9); aproape(r["1h"].grile, 0.03, 1e-9); aproape(r["4h"].total, -0.24, 1e-9);
  const tanar = M.botFerestre(IST, ACUM, Object.assign({}, ACUM_BOT, { pornitLa: ACUM - 5 * ORA }));
  assert.ok(isFinite(tanar["1h"].total) && isFinite(tanar["4h"].total)); assert.equal(tanar["24h"].motiv, "tanar"); assert.equal(tanar["3z"].motiv, "tanar"); assert.equal(tanar["7z"].motiv, "tanar");
});
test("toleranța punctului scade cu fereastra: la 1 oră cel mult 5 minute (30 de minute ar fi jumătate din fereastră)", () => {
  assert.equal(M.tolBot(ORA), 5 * MIN); assert.equal(M.tolBot(4 * ORA), 20 * MIN); assert.equal(M.tolBot(ZI), 30 * MIN); assert.equal(M.tolBot(7 * ZI), 30 * MIN);
  const gaura = IST.filter((x) => Math.abs(x.t - (ACUM - ORA)) > 8 * MIN);
  assert.deepEqual(M.bot(gaura, ACUM, ORA, ACUM_BOT), { motiv: "gol" }, "8 minute lipsă în jurul clipei de acum o oră ⇒ gol");
  assert.ok(isFinite(M.bot(IST.filter((x) => Math.abs(x.t - (ACUM - ORA)) > 3 * MIN), ACUM, ORA, ACUM_BOT).total), "3 minute lipsă se sar");
});
test("3 zile și 7 zile din aceeași istorie", () => {
  const r = M.botFerestre(IST, ACUM, ACUM_BOT);
  aproape(r["3z"].total, -4.32, 1e-9); aproape(r["7z"].total, -10.08, 1e-9); aproape(r["7z"].grile, 5.04, 1e-9);
});
test("botul mai tânăr decât fereastra ⇒ «tânăr» cu vârsta lui, nu o cifră pe mai puțin timp", () => {
  const r = M.bot(IST, ACUM, 3 * ZI, Object.assign({}, ACUM_BOT, { pornitLa: ACUM - 2 * ZI }));
  assert.deepEqual(r, { motiv: "tanar", varsta: 2 * ZI });
  assert.equal(M.bot(IST, ACUM, ZI, Object.assign({}, ACUM_BOT, { pornitLa: ACUM - 2 * ZI })).motiv, undefined, "pe 24 h botul de 2 zile are cifră");
});
test("colectorul a stat în jurul clipei căutate (peste 30 de minute) ⇒ «gol», nu punctul cel mai apropiat", () => {
  const gaura = IST.filter((x) => Math.abs(x.t - (ACUM - ZI)) > 45 * MIN);
  assert.deepEqual(M.bot(gaura, ACUM, ZI, ACUM_BOT), { motiv: "gol" });
  const mica = IST.filter((x) => Math.abs(x.t - (ACUM - ZI)) > 10 * MIN);
  assert.ok(isFinite(M.bot(mica, ACUM, ZI, ACUM_BOT).total), "o gaură de 10 minute se sare");
});
test("istoria începe după începutul ferestrei (pagina are doar 2 zile) ⇒ «scurt»; fără istorie ⇒ «scurt»", () => {
  assert.deepEqual(M.bot(IST.filter((x) => x.t > ACUM - 2 * ZI), ACUM, 3 * ZI, ACUM_BOT), { motiv: "scurt" });
  assert.deepEqual(M.bot([], ACUM, ZI, ACUM_BOT), { motiv: "scurt" }); assert.deepEqual(M.bot(null, ACUM, ZI, ACUM_BOT), { motiv: "scurt" });
});
test("fără totalul de acum ⇒ null; fără grile ⇒ totalul rămâne, grilele și restul lipsesc (nu zero)", () => {
  assert.equal(M.bot(IST, ACUM, ZI, { total: null }), null);
  const r = M.bot(IST, ACUM, ZI, { total: -20, grile: null, pornitLa: ACUM - 20 * ZI }); aproape(r.total, -1.44, 1e-9); assert.equal(r.grile, null); assert.equal(r.rest, null);
});
test("gridul mutat în fereastră (marginile de atunci ≠ cele de acum) se marchează", () => {
  assert.equal(M.bot(IST, ACUM, ZI, Object.assign({}, ACUM_BOT, { gridJos: 0.35 })).gridMutat, true);
  assert.equal(M.bot(IST.map((x) => Object.assign({}, x, { gridJos: null, gridSus: null })), ACUM, ZI, ACUM_BOT).gridMutat, false, "fără margini salvate nu se inventează o mutare");
});
test("un punct fără total (citire picată) nu e luat drept reper", () => {
  const cu = IST.map((x) => x.t === ACUM - ZI ? Object.assign({}, x, { profitTotal: null }) : x);
  const r = M.bot(cu, ACUM, ZI, ACUM_BOT); assert.ok(Math.abs(r.deLa - (ACUM - ZI)) === MIN, "ia vecinul de la un minut");
});

console.log("\nA3. acțiunile");
const zi = (t) => new Date(t).toISOString().slice(0, 10);
const zilnice = (n, f, ultimaZi) => { const v = [], t0 = Date.parse(ultimaZi + "T21:00:00Z"); for (let i = 0; i < n; i++) v.push({ t: t0 - (n - 1 - i) * ZI, c: f(i) }); return v; };
test("ședințe: ultima bară e de azi ⇒ ședința curentă e azi, închiderile de dinainte nu o cuprind", () => {
  const b = zilnice(40, (i) => 100 + i, "2026-11-23"), s = M.sedinte(b, "2026-11-23", zi, false);
  assert.equal(s.eAzi, true); assert.equal(s.ant.length, 39); assert.equal(s.ant[38], 138);
});
test("ședințe: ultima bară e de ieri și bursa e deschisă ⇒ azi încă n-are bară, toate închiderile sunt «de dinainte»", () => {
  const s = M.sedinte(zilnice(40, (i) => 100 + i, "2026-11-20"), "2026-11-23", zi, true);
  assert.equal(s.eAzi, true); assert.equal(s.ant.length, 40); assert.equal(s.ant[39], 139);
});
test("ședințe: ultima bară e de vineri și bursa e închisă (luni dimineața) ⇒ «ultima ședință» = vineri", () => {
  const s = M.sedinte(zilnice(40, (i) => 100 + i, "2026-11-20"), "2026-11-23", zi, false);
  assert.equal(s.eAzi, false); assert.equal(s.zi, "2026-11-20"); assert.equal(s.ant.length, 39); assert.equal(s.ant[38], 138);
});
test("ședințe: fără bare ⇒ gol, fără eroare", () => assert.deepEqual(M.sedinte(null, "2026-11-23", zi, true), { ant: [], eAzi: false, zi: null, inchidere: null }));
// revizia independentă (🔴): cu ultima zi ÎNCHISĂ a bursei dată, „ultima ședință” nu mai adună două ședințe când bara celei de azi încă n-a sosit
test("ședința tocmai închisă încă n-are bară (bursa închisă, ultima bară de ieri): prețul de acum e al ei, toate închiderile sunt «de dinainte»", () => {
  const s = M.sedinte(zilnice(40, (i) => 100 + i, "2026-11-22"), "2026-11-23", zi, false, "2026-11-23");
  assert.equal(s.eAzi, true); assert.equal(s.zi, "2026-11-23"); assert.equal(s.ant.length, 40); assert.equal(s.ant[39], 139); assert.equal(s.inchidere, null);
});
test("ședință scurtă (vineri 27.11, închisă de la 13:00, ultima bară e de miercuri): mișcarea e doar a ședinței de vineri", () => {
  const b = [...zilnice(38, () => 100, "2026-11-23"), { t: Date.parse("2026-11-24T21:00:00Z"), c: 104 }, { t: Date.parse("2026-11-25T21:00:00Z"), c: 110 }];
  const s = M.sedinte(b, "2026-11-27", zi, false, "2026-11-27"), r = M.actiune(s.ant, 111);
  assert.equal(s.zi, "2026-11-27"); aproape(r.azi, (111 / 110 - 1) * 100);   /* +0,9%, nu +6,7% (două ședințe la un loc) */
});
test("bursa închisă și ultima bară e chiar ultima ședință închisă (weekend): «ultima ședință» se socotește pe ÎNCHIDEREA ei", () => {
  const s = M.sedinte(zilnice(40, (i) => 100 + i, "2026-11-20"), "2026-11-23", zi, false, "2026-11-20");
  assert.equal(s.eAzi, false); assert.equal(s.zi, "2026-11-20"); assert.equal(s.inchidere, 139); assert.equal(s.ant[38], 138);
});
test("după închidere, cu bara zilei sosită: e azi, pe închiderea barei; cu bursa deschisă: pe prețul viu (inchidere = null)", () => {
  const b = zilnice(40, (i) => 100 + i, "2026-11-23");
  const s = M.sedinte(b, "2026-11-23", zi, false, "2026-11-23"); assert.equal(s.eAzi, true); assert.equal(s.inchidere, 139); assert.equal(s.ant[38], 138);
  assert.equal(M.sedinte(b, "2026-11-23", zi, true, "2026-11-20").inchidere, null);
  assert.equal(M.sedinte(zilnice(40, (i) => 100 + i, "2026-11-20"), "2026-11-23", zi, true, "2026-11-20").inchidere, null);
});
test("ziua contului pe ședință: se adună doar pozițiile de AZI; cele de pe o bursă care n-a deschis azi se numără separat", () => {
  const r = M.contSedinta([{ simbol: "RHM", lei: 50, eAzi: true, zi: "2026-11-23" }, { simbol: "NVDA", lei: -190, eAzi: false, zi: "2026-11-20" }, { simbol: "SAP", lei: null, eAzi: true, zi: "2026-11-23" }]);
  aproape(r.total, 50, 1e-9); assert.equal(r.eAzi, true); assert.equal(r.zi, "2026-11-23"); assert.equal(r.n, 1); assert.equal(r.lipsa, 1); assert.equal(r.altele, 1); assert.deepEqual(r.top.map((x) => x.simbol), ["RHM"]);
});
test("ziua contului pe ședință: nimeni azi ⇒ ședința cea mai nouă; fără nicio poziție cu ședință ⇒ fără total", () => {
  const r = M.contSedinta([{ simbol: "A", lei: 10, eAzi: false, zi: "2026-11-20" }, { simbol: "B", lei: -4, eAzi: false, zi: "2026-11-20" }, { simbol: "C", lei: 7, eAzi: false, zi: "2026-11-19" }]);
  aproape(r.total, 6, 1e-9); assert.equal(r.eAzi, false); assert.equal(r.zi, "2026-11-20"); assert.equal(r.altele, 1);
  assert.equal(M.contSedinta([{ simbol: "X", lei: null, eAzi: false, zi: null }]).total, null); assert.equal(M.contSedinta([]).total, null);
});
test("acțiunea: azi față de ultima închidere de dinainte, 3 / 5 / 30 față de închiderea de acum 3 / 5 / 30 de ședințe", () => {
  const ant = Array.from({ length: 39 }, (_, i) => 100 + i);   /* …, 136, 137, 138 */
  const r = M.actiune(ant, 140);
  aproape(r.azi, (140 / 138 - 1) * 100); aproape(r.z3, (140 / 136 - 1) * 100); aproape(r.z5, (140 / 134 - 1) * 100); aproape(r.z30, (140 / 109 - 1) * 100); assert.equal(r.nesigur, false);
});
test("acțiunea: cu puține ședințe, ferestrele lungi lipsesc (null), cele scurte rămân", () => {
  const r = M.actiune([10, 11, 12, 13], 13); aproape(r.azi, 0); aproape(r.z3, (13 / 11 - 1) * 100); assert.equal(r.z5, null); assert.equal(r.z30, null);
});
test("acțiunea: prețul la peste 50% de ultima închidere (pence / lire, split) ⇒ nesigur, nicio cifră", () => {
  assert.deepEqual(M.actiune([100, 101, 102], 10200), { azi: null, z3: null, z5: null, z30: null, nesigur: true });
  assert.deepEqual(M.actiune([100, 101, 102], 40), { azi: null, z3: null, z5: null, z30: null, nesigur: true });
  assert.equal(M.actiune([100, 101, 102], 150).nesigur, false, "+47% într-o zi e mult, dar posibil");
});
test("acțiunea: fără preț sau fără închideri ⇒ toate null", () => { assert.equal(M.actiune([], 10).azi, null); assert.equal(M.actiune([1, 2], null).azi, null); });
test("leii mișcării: din valoarea de ACUM a poziției (10.200 lei după +2% ⇒ +200 lei), simetric", () => {
  aproape(M.leiDinPct(10200, 2), 200, 1e-9); aproape(M.leiDinPct(9800, -2), -200, 1e-9); assert.equal(M.leiDinPct(null, 2), null); assert.equal(M.leiDinPct(100, null), null);
});
test("ziua contului: suma pozițiilor cu cifră, câte lipsesc, primele 3 după mărime (plus și minus la un loc)", () => {
  const r = M.contAzi([{ simbol: "NVDA", lei: -190 }, { simbol: "MU", lei: 85.5 }, { simbol: "DELL", lei: -12 }, { simbol: "LITE", lei: 40 }, { simbol: "RBRK", lei: null }]);
  aproape(r.total, -76.5, 1e-9); assert.equal(r.n, 4); assert.equal(r.lipsa, 1); assert.deepEqual(r.top.map((x) => x.simbol), ["NVDA", "MU", "LITE"]);
  assert.equal(M.contAzi([{ simbol: "X", lei: null }]).total, null, "nicio poziție cu cifră ⇒ fără total (nu zero)");
});

console.log("\nB. Piața azi: față de acum 3 / 7 zile, din pozele zilnice");
const POZE = [
  { zi: "2026-11-16", botiPeId: { a: -10, b: 5 }, t212Total: 40000, la: Date.parse("2026-11-16T07:05:00Z") },
  { zi: "2026-11-20", botiPeId: { a: -12, b: 6 }, t212Total: 41000, la: Date.parse("2026-11-20T07:05:00Z") },
  { zi: "2026-11-22", botiPeId: { a: -14, b: 6 }, t212Total: 40800, la: Date.parse("2026-11-22T07:05:00Z") }];
const AZI = { botiPeId: { a: -15, b: 8 }, botiTotal: -7, t212Total: 40500 };
test("modulul Acasa are ziuaTaInapoi", () => assert.ok(A && typeof A.ziuaTaInapoi === "function"));
test("3 zile: poza din ziua de acum 3 zile (20.11) - boții prezenți în ambele, contul T212", () => {
  const r = A.ziuaTaInapoi(AZI, POZE, "2026-11-23", [], 3);
  assert.equal(r.de, "2026-11-20"); aproape(r.boti, -1, 1e-9); aproape(r.t212, -500, 1e-9);
});
test("7 zile: poza din 16.11", () => { const r = A.ziuaTaInapoi(AZI, POZE, "2026-11-23", [], 7); assert.equal(r.de, "2026-11-16"); aproape(r.boti, -2, 1e-9); aproape(r.t212, 500, 1e-9); });
test("fără poză în ziua căutată (colectorul a stat) ⇒ null, nu poza cea mai apropiată", () => {
  assert.equal(A.ziuaTaInapoi(AZI, POZE, "2026-11-23", [], 5), null); assert.equal(A.ziuaTaInapoi(AZI, [], "2026-11-23", [], 3), null);
});
test("«față de ieri dimineață» rămâne cum era (poza cea mai nouă de dinainte de azi)", () => {
  const r = A.ziuaTa(AZI, POZE, "2026-11-23", []); assert.equal(r.de, "2026-11-22"); aproape(r.boti, 1, 1e-9); aproape(r.t212, -300, 1e-9);
});

console.log("\nC. legăturile");
test("modulul e încărcat de pagină și ținut de service worker", () => { assert.ok(HTML.includes('<script src="/lib/miscare.js"></script>')); assert.ok(SW.includes('"/lib/miscare.js"')); });
test("Tabloul: blocul #tbMiscare stă deasupra cardului graficului, în aceeași coloană", () => {
  const i = HTML.indexOf('id="tbMiscare"'), g = HTML.indexOf('id="tbGraficCard"'), s = HTML.indexOf('class="tbGrStanga"');
  assert.ok(i > 0 && s > 0 && s < i && i < g, "ordinea: tbGrStanga, tbMiscare, tbGraficCard");
});
test("Tabloul: desenul benzii există, e chemat la prețul viu și atinge doar ce s-a schimbat", () => {
  assert.ok(/function tbMiscareDeseneaza\(/.test(APP)); assert.ok(/tbMiscareDeseneaza\(b[^)]*\)/.test(APP.slice(APP.indexOf("function pvArata("), APP.indexOf("function pvArata(") + 4000)), "pvArata o cheamă");
  assert.ok(/Miscare\.ferestre\(/.test(APP) && /Miscare\.botFerestre\(/.test(APP));
});
test("Tabloul: căsuțele ferestrelor trec graficul pe intervalul lor", () => { for (const tf of ["5M", "15M", "60M", "4H"]) assert.ok(APP.includes("tbAlegeInterval('" + tf + "')") || HTML.includes("tbAlegeInterval('" + tf + "')")); assert.ok(/data-mi-tf/.test(APP)); });
test("Trading 212: celula c-misc pe rând, rândul «Contul azi» și reperul Nasdaq", () => {
  assert.ok(/class="c-misc"/.test(T212E)); assert.ok(/id="t212ContAzi"/.test(T212E)); assert.ok(/Miscare\.actiune\(/.test(T212E) && /Miscare\.sedinte\(/.test(T212E) && /Miscare\.contSedinta\(/.test(T212E)); assert.ok(/QQQ_US_EQ/.test(T212E.slice(T212E.indexOf("function t212Miscare("), T212E.indexOf("function t212Miscare(") + 3000)));
});
test("Trading 212, după revizie: ultima zi închisă a bursei intră în socoteală (și la Nasdaq), «cumpărată azi» fără lei, QQQ în întreținere, zero fără semn", () => {
  const f = T212E.slice(T212E.indexOf("function t212Miscare("), T212E.indexOf("function t212MiscareHtml("));
  assert.ok((f.match(/t212MiZiInchisa\(/g) || []).length >= 2 && /function t212MiZiInchisa\([^)]*\) \{[^\n]*CalendarBursa\.ultimaZiInchisa\(acum, tk\)/.test(T212E), "poziția și QQQ, fiecare cu ultima ei zi închisă");
  assert.ok(f.includes("Miscare.actiune(s.ant, s.inchidere !== null ? s.inchidere : p.pret)") && f.includes("pq = sq.inchidere;"), "ședința închisă se socotește pe închiderea ei");
  assert.ok(/cumparataAzi/.test(f) && /initialFillDate/.test(f)); assert.ok(/cumpărată azi/.test(T212E));
  const it = T212E.slice(T212E.indexOf("async function t212Intretinere("), T212E.indexOf("async function t212Intretinere(") + 2500); assert.ok(it.includes('t212BareTrebuie("QQQ_US_EQ", false, acum) && (await t212BareAdu("QQQ_US_EQ", false))'), "QQQ se readuce odată cu pozițiile");
  const h = T212E.slice(T212E.indexOf("function t212MiscareHtml("), T212E.indexOf("function t212ContAziHtml(") + 3000); assert.ok((h.match(/Miscare\.rot\(/g) || []).length >= 3, "semnul și culoarea după cifra rotunjită");
});
test("«față de BTC» și «față de Nasdaq» în cuvinte (el, 23.11: „ce înseamnă 2.1p?”): „2,1 peste” / „4,1 sub” / „la fel”, fără prescurtarea «p.»", () => {
  assert.ok(APP.includes('rd===0?"la fel":TextRo.num(Math.abs(rd),1)+(rd>0?" peste":" sub")')); assert.ok(!/" p\."/.test(APP.slice(APP.indexOf("function tbMiscareDeseneaza("), APP.indexOf("function tbMiscareDeseneaza(") + 6000)));
  const h = T212E.slice(T212E.indexOf("function t212MiscareHtml("), T212E.indexOf("function t212ContAziHtml(")); assert.ok(h.includes('r === 0 ? "la fel" : TextRo.num(Math.abs(r), 1) + (r > 0 ? " peste" : " sub")')); assert.ok(!/" p\."/.test(h));
});
test("lista Trading 212 își păstrează șirurile vechi (probele dinainte le caută literă cu literă); rândul contului se pune în fața ei, după desen", () => {
  assert.ok(T212E.includes("if (t212Ingust()) box.innerHTML = '<div class=\"t212TabWrap\" style=\"--n:' + poz.length + '\"><table class=\"t212Tab\">' + cap212 + '<tbody>' + poz.map(t212RandPozitie).join(\"\")"));
  assert.ok(T212E.includes('box.insertAdjacentHTML("afterbegin", t212ContAziHtml(poz))'));
});
test("Piața azi și Tablou, după revizie: zero rotunjit fără semn; BTC vechi nu se arată ca proaspăt; banii botului nu se resocotesc la fiecare secundă", () => {
  const f = ACE.slice(ACE.indexOf("function acZileInapoiHtml("), ACE.indexOf("function acZileInapoiHtml(") + 900); assert.ok(/rot\(/.test(f) && /=== 0/.test(f));
  assert.ok(APP.includes("proaspat=laB>0&&acum-laB<TB_MI_BTC_VECHI_MS,lb=bp&&proaspat?bp[f.tf]:null") && APP.includes("laPe[f.tf]=Date.now()}catch(e){") && /TB_MI_BTC_VECHI_MS=15\*60000/.test(APP), "ora citirii pe fiecare interval, pusă doar la reușită; peste 15 minute nu se folosește");
  assert.ok(/tbMi\.botMemo/.test(APP));
});
test("Trading 212: celula nouă are loc în grila rândului (aria «misc») și nu e ascunsă", () => { assert.ok(/grid-template-areas:[^;]*"misc misc misc misc"/.test(CSS)); assert.ok(/td\.c-misc\{[^}]*grid-area:misc/.test(CSS)); });
test("Piața azi: rândurile de 3 și 7 zile, lângă «față de ieri dimineață»", () => { assert.ok(/ziuaTaInapoi\(/.test(ACE)); assert.ok(/Față de acum/.test(ACE)); });
test("nimic scos: „azi” de lângă prețul viu, „Față de ieri dimineață” și curba pe 30 de zile rămân", () => {
  assert.ok(/PretViu\.textZi\(PretViu\.procentZi\(/.test(APP)); assert.ok((ACE.match(/Față de ieri dimineață/g) || []).length >= 2); assert.ok(/class="c-spark"/.test(T212E) && /t212SparkHtml\(/.test(T212E));
});

console.log("\nD. versiunea");
test("v100.378 e pusă peste tot și proba e în lanț, după v100.377", () => {
  const pk = JSON.parse(citeste("../package.json")), bi = JSON.parse(citeste("../BUILD_INFO.json"));
  /* v100.379: „de la 378 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.379) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 378, "package.json: de la 100.378 încolo"); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 378); assert.ok(bi.li378 && bi.li378.length > 200, "BUILD_INFO.li378");
  assert.equal((HTML.match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 378).length >= 4, true, "index.html: v100.378 sau mai nou, de cel puțin 4 ori");
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(SW) || [])[1] >= 378, "sw.js"); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("../functions/_shared/versiune.js")) || [])[1] >= 378, "versiune.js");
  assert.match(pk.scripts.test, /npm run test:v100377 && npm run test:v100378/); assert.match(pk.scripts.test, /node scripts\/mutatii\.mjs --doar-tiparele && node scripts\/stare-probe-ecran\.mjs$/); assert.equal(pk.scripts["test:v100378"], "node scripts/proba-v100378.mjs");
});

console.log(`\n${teste - picate} / ${teste} teste trec.\n`);
process.exit(picate ? 1 : 0);
