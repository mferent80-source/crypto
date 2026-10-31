// Proba v100.281 / colector v101.153 (31.10, el: „vreau mesaj pe Discord după fiecare bot închis: evaluare, ce am greșit, ce am făcut
// bine, sfaturi” + canalul lui separat pentru evaluări + „da, toate 3” ideile de ieri):
// (A) evaluarea DECIZIILOR fiecărui bot închis (nu a norocului): boții porniți azi, frâna la pornire, orele în afara grilei, minutele,
//     lichidarea - judecate doar cu ce se știa ATUNCI, pe pragurile și cifrele LUI; verdictul 2×2 (decizii × rezultat) și un sfat;
// (B) botul pornit cu frâna trasă - un mesaj, în același canal; (C) frâna pe 7 zile trasă de peste 3 zile la rând ⇒ întrebarea despre prag;
// (D) în raportul de duminică: zilele cu frâna trasă, respectată / trecută, și ce au adus boții porniți peste ea.
// Canalul evaluărilor e separat (alt webhook, coada lui); nimic nu cade pe canalul alertelor.
//   node scripts/proba-v100281.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifica } from "./garda-texte.mjs";   // încarcă și modulele paginii (Obiceiuri, JurnalTrade…) din copia asta
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const OB = globalThis.Obiceiuri;
const CO = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "comportament.mjs")).href).catch(() => null);
const CS = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "canal-separat.mjs")).href).catch(() => null);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
const areCO = () => assert.ok(CO, "scripts/lib/comportament.mjs lipsește");
const fara = (ab, ce) => assert.deepEqual(ab, [], ce + ": " + ab.join("; "));
console.log("\nV100.281 · EVALUAREA DECIZIILOR · proba\n");

const ORA = 3600000, ZI = 86400000, T = (s) => Date.parse(s);
const ACUM = T("2026-10-31T18:00:00Z");   // 20:00 ora României; ziua de 31.10 începe la 30.10 22:00Z
const PR = { zi: 20, sapt: 60, rand: 3, boti: 7 };
const tr = (id, pornit, inchis, net, o) => Object.assign({ id, moneda: "M", dir: "long", pornit: T(pornit), inchis: T(inchis), net, rezultat: net, comisioane: 0, funding: 0 }, o || {});

// ---------------- frâna la pornire, într-un singur loc ----------------
await test("frâna la pornire: doar ce se știa ATUNCI - închișii de dinainte, deschișii în clipa pornirii (din arhivă și cei încă deschiși); nimic de după", () => {
  assert.equal(typeof OB.franaLaPornire, "function", "Obiceiuri.franaLaPornire lipsește");
  const l = [
    tr("a", "2026-10-31T06:00:00Z", "2026-10-31T07:00:00Z", -1),
    tr("b", "2026-10-31T07:30:00Z", "2026-10-31T08:00:00Z", -1),
    tr("c", "2026-10-31T08:10:00Z", "2026-10-31T09:00:00Z", -1),
    tr("d", "2026-10-31T08:50:00Z", "2026-10-31T12:00:00Z", -5),    // deschis când pornește t: numărat, pierderea lui nu
    tr("t", "2026-10-31T09:30:00Z", "2026-10-31T10:00:00Z", 2),     // botul judecat
    tr("e", "2026-10-31T09:40:00Z", "2026-10-31T09:50:00Z", -30),   // pornit DUPĂ t
  ];
  const deschise = [{ id: "x", activ: true, pornitLa: T("2026-10-31T09:00:00Z") }, { id: "y", activ: true, pornitLa: T("2026-10-31T11:00:00Z") }, { id: "t", activ: true, pornitLa: T("2026-10-31T09:30:00Z") }];
  const f = OB.franaLaPornire(l[4], l, PR, deschise);
  assert.equal(f.pornitiAzi, 5, "a, b, c, d (deschis atunci) și x (încă deschis, pornit înainte); nu e, y sau el însuși");
  assert.equal(f.rand, 3); assert.ok(f.depasit.some((d) => d.cod === "rand"), "3 pierderi la rând ⇒ frâna trasă");
  assert.equal(Math.round(f.netZi * 10) / 10, -3, "doar a, b, c; d se închide după, e pornește după");
  assert.ok(!f.depasit.some((d) => d.cod === "boti"), "al 6-lea bot, pragul 7");
});
await test("frâna pe istorie (franaIstoric) trece prin aceeași funcție: aceleași porniri oprite", () => {
  const l = [
    tr("a", "2026-10-31T06:00:00Z", "2026-10-31T07:00:00Z", -1), tr("b", "2026-10-31T07:30:00Z", "2026-10-31T08:00:00Z", -1),
    tr("c", "2026-10-31T08:10:00Z", "2026-10-31T09:00:00Z", -1), tr("d", "2026-10-31T08:50:00Z", "2026-10-31T12:00:00Z", -5),
    tr("t", "2026-10-31T09:30:00Z", "2026-10-31T10:00:00Z", 2), tr("e", "2026-10-31T09:40:00Z", "2026-10-31T09:50:00Z", -30),
  ];
  const P = { zi: 2, sapt: 1000, rand: 99, boti: 99 }, ist = OB.franaIstoric(l, P), n = l.filter((t) => OB.franaLaPornire(t, l, P).activa).length;
  assert.ok(n > 0); assert.equal(ist.sarite, n);
  assert.match(citeste("public", "lib", "obiceiuri.js"), /function franaIstoric[\s\S]{0,700}franaLaPornire\(/, "franaIstoric nu folosește franaLaPornire");
});

// ---------------- (A) evaluarea ----------------
const T0 = T("2026-10-31T08:00:00Z");
const TT = (o) => Object.assign({ id: "1", moneda: "SOL", dir: "long", pornit: T0, inchis: T0 + 7.5 * ORA, durataOre: 7.5, net: -3.2, rezultat: -2.7, grile: 1.2, pozitie: -3.9, comisioane: -0.4, funding: -0.1 }, o || {});
const F = (o) => Object.assign({ pornitiAzi: 2, rand: 0, netZi: -1, netSapt: -10, depasit: [], praguri: PR, activa: false }, o || {});
const BANDA = { dv: { h: 6, intoarse: 0.41, n: 120 }, r: { h: 12, intoarse: 0.28, n: 80 } };
const DOV = { zile: { prag: 7, peste: { zile: 97, pe: -54.2 }, sub: { zile: 152, pe: -9.1 } }, minute: { n: 1057, grile: 340.7, comisioane: -1165.1 } };
const coduri = (ev, ok) => ev.decizii.filter((d) => d.ok === ok).map((d) => d.cod);

await test("(A) decizii bune + pierdere ⇒ „ghinion”, nu greșeală: în prag, frâna liberă, închis la 2 h după ieșirea din grilă", () => {
  areCO();
  const ev = CO.evalueaza({ t: TT(), frana: F(), afaraOre: 2, banda: BANDA, dovezi: DOV, motiv: "user_cancel" });
  assert.deepEqual(coduri(ev, true), ["boti", "frana", "banda"]); assert.deepEqual(coduri(ev, false), []);
  assert.equal(ev.verdict, "ghinion"); assert.equal(ev.sfat, null); assert.equal(ev.nivel, "info");
  assert.equal(CO.evalueaza({ t: TT({ net: 2.1 }), frana: F(), afaraOre: 2, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }).verdict, "bune");
});
await test("(A) al 9-lea bot, 3 pierderi la rând, 7 zile sub prag, 7,5 h în afara grilei ⇒ „greșeala a costat”, sfatul pe boți", () => {
  areCO();
  const fr = F({ pornitiAzi: 8, rand: 3, netSapt: -682, depasit: [{ cod: "rand" }, { cod: "sapt" }, { cod: "boti" }], activa: true });
  const ev = CO.evalueaza({ t: TT(), frana: fr, afaraOre: 7.5, banda: BANDA, dovezi: DOV, motiv: null });
  assert.deepEqual(coduri(ev, false), ["boti", "frana", "banda"]);
  const b = ev.decizii.find((d) => d.cod === "boti"); assert.equal(b.n, 9); assert.equal(b.prag, 7);
  const f = ev.decizii.find((d) => d.cod === "frana"); assert.ok(f.rand && f.sapt && !f.zi, "rand + 7 zile, nu ziua");
  assert.equal(ev.verdict, "cost"); assert.equal(ev.sfat, "boti"); assert.equal(ev.nivel, "atentie");
  assert.equal(CO.evalueaza({ t: TT({ net: 4.4 }), frana: fr, afaraOre: 7.5, banda: BANDA, dovezi: DOV, motiv: null }).verdict, "noroc", "câștig cu reguli încălcate");
});
await test("(A) al 7-lea bot e în prag (pragul 7), al 8-lea nu; pragul lui, nu cel implicit", () => {
  areCO();
  assert.equal(CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 6 }), afaraOre: null, banda: BANDA, dovezi: null, motiv: null }).decizii[0].ok, true);
  assert.equal(CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 7, depasit: [{ cod: "boti" }] }), afaraOre: null, banda: BANDA, dovezi: null, motiv: null }).decizii[0].ok, false);
  assert.equal(CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 4, praguri: Object.assign({}, PR, { boti: 4 }) }), afaraOre: null, banda: BANDA, dovezi: null, motiv: null }).decizii[0].ok, false);
});
await test("(A) banda: necunoscută (fără starea colectorului) sau închis în grilă ⇒ nejudecată; fără tabel ⇒ nejudecată; regula de 12 h când lipsește treapta", () => {
  areCO();
  const cu = (ore, banda) => CO.evalueaza({ t: TT(), frana: F(), afaraOre: ore, banda: banda || BANDA, dovezi: null, motiv: null }).decizii.find((d) => d.cod === "banda");
  assert.equal(cu(null), undefined); assert.equal(cu(0), undefined); assert.equal(cu(7, { dv: null, r: null }), undefined);
  assert.equal(cu(7, { dv: null, r: BANDA.r }).ok, true, "fără treapta timpurie: pragul e regula de 12 h");
  assert.equal(cu(13, { dv: null, r: BANDA.r }).ok, false);
  assert.equal(cu(6).ok, true, "exact la 6 h = încă la timp"); assert.equal(cu(6.5).ok, false);
});
await test("(A) minutele: închis de el sub 15 min ⇒ de îndreptat; închis de stop / țintă sau după 15 min ⇒ nejudecat; lichidat ⇒ primul sfat", () => {
  areCO();
  const sc = (min, motiv) => CO.evalueaza({ t: TT({ inchis: T0 + min * 60000, durataOre: min / 60, net: -0.7, grile: 0.2, comisioane: -0.6, funding: 0 }), frana: F(), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv });
  assert.deepEqual(coduri(sc(6, "user_cancel"), false), ["minute"]); assert.deepEqual(coduri(sc(6, null), false), ["minute"], "motiv necunoscut (arhiva veche) = al lui");
  assert.deepEqual(coduri(sc(6, "loss_stop"), false), []); assert.deepEqual(coduri(sc(6, "profit_stop"), false), []); assert.deepEqual(coduri(sc(20, "user_cancel"), false), []);
  const l = CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 8, depasit: [{ cod: "boti" }] }), afaraOre: 0, banda: BANDA, dovezi: null, motiv: "liquidation" });
  assert.deepEqual(coduri(l, false), ["boti", "lichidare"]); assert.equal(l.sfat, "lichidare");
});
await test("(A) sfatul: frâna pe 7 zile singură (starea lungă, nu a botului) trece după lecția botului; la rând / ziua rămân înaintea minutelor", () => {
  areCO();
  const min6 = TT({ inchis: T0 + 6 * 60000, durataOre: 0.1, net: -0.7, grile: 0.2, comisioane: -0.6, funding: 0 });
  assert.equal(CO.evalueaza({ t: min6, frana: F({ netSapt: -682, depasit: [{ cod: "sapt" }], activa: true }), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: null }).sfat, "minute");
  assert.equal(CO.evalueaza({ t: min6, frana: F({ rand: 3, depasit: [{ cod: "rand" }], activa: true }), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: null }).sfat, "frana");
  assert.equal(CO.evalueaza({ t: TT(), frana: F({ netSapt: -682, depasit: [{ cod: "sapt" }], activa: true }), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: null }).sfat, "frana", "singura încălcare ⇒ tot ea");
});
await test("(A) dovezile din istoria lui: netul pe zi cu peste prag față de restul (cel puțin 10 zile în fiecare grupă), minutele (cel puțin 30)", () => {
  areCO();
  const l = [], Z0 = T("2026-09-01T06:00:00Z");
  for (let d = 0; d < 24; d++) { const multi = d % 2 === 0, n = multi ? 9 : 3; for (let k = 0; k < n; k++) l.push({ id: d + "-" + k, pornit: Z0 + d * ZI + k * 600000, inchis: Z0 + d * ZI + k * 600000 + 2 * ORA, durataOre: 2, net: multi ? -1 : 1, grile: 0.5, comisioane: -0.2 }); }
  const d = CO.dovezi(l, 7);
  assert.equal(d.zile.prag, 7); assert.equal(d.zile.peste.zile, 12); assert.equal(d.zile.peste.pe, -9); assert.equal(d.zile.sub.zile, 12); assert.equal(d.zile.sub.pe, 3);
  assert.equal(CO.dovezi(l.slice(0, 30), 7).zile, null, "sub 10 zile într-o grupă ⇒ fără comparație");
  assert.equal(d.minute, null, "niciun bot de minute ⇒ fără cifră");
  // boții de minute: câte 2 pe zi (zilele lor rămân sub prag), 40 în total
  const m = Array.from({ length: 40 }, (_, k) => ({ id: "m" + k, pornit: Z0 + 40 * ZI + Math.floor(k / 2) * ZI + (k % 2) * ORA, inchis: Z0 + 40 * ZI + Math.floor(k / 2) * ZI + (k % 2) * ORA + 5 * 60000, durataOre: 5 / 60, net: -0.2, grile: 0.1, comisioane: -0.3 }));
  const dm = CO.dovezi(m, 7);
  assert.equal(dm.minute.n, 40); assert.equal(Math.round(dm.minute.grile * 10) / 10, 4); assert.equal(Math.round(dm.minute.comisioane * 10) / 10, -12);
  assert.equal(CO.dovezi(m.slice(0, 20), 7).minute, null, "sub 30 de boți de minute ⇒ fără cifră");
});
await test("(A) orele în afara grilei din starea colectorului: fără stare = nu știu; în grilă = 0; afară de la X = până la închidere", () => {
  areCO();
  const inch = T0 + 10 * ORA;
  assert.equal(CO.oreAfara(undefined, inch), null); assert.equal(CO.oreAfara({}, inch), null); assert.equal(CO.oreAfara({ _afaraDe: null }, inch), 0);
  assert.equal(CO.oreAfara({ _afaraDe: inch - 7.5 * ORA }, inch), 7.5);
});

// ---------------- mesajele (garda textelor) ----------------
const garda = (m, felMesaj) => {
  fara(verifica(m.titlu, "alertaTitlu"), "titlul „" + m.titlu + "”");
  fara(verifica(m.mesaj, felMesaj), "mesajul");
  const a = m.mesaj.split("\n").filter((l) => /^👉 /.test(l)); assert.equal(a.length, 1, "un singur rând „👉 ”");
  fara(verifica(a[0].slice(3), "faCe"), "sfatul „" + a[0] + "”");
};
await test("(A) mesajul: titlul cu moneda, direcția, verdictul și netul; faptul, ✅ / ❌ pe decizii cu cifrele lui, sfatul; garda textelor", () => {
  areCO();
  const fr = F({ pornitiAzi: 8, rand: 3, netSapt: -682, depasit: [{ cod: "rand" }, { cod: "sapt" }, { cod: "boti" }], activa: true });
  const m = MC.evaluareBot(CO.evalueaza({ t: TT(), frana: fr, afaraOre: 7.5, banda: BANDA, dovezi: DOV, motiv: null }));
  assert.equal(m.titlu, "SOL long: greșeala a costat −3,2 USDT"); assert.equal(m.nivel, "atentie");
  const r = m.mesaj.split("\n");
  assert.equal(r[0], "Ținut 7 h 30 min: grilele +1,2 USDT, poziția −3,9 USDT, comisioane și funding −0,5 USDT ⇒ net −3,2 USDT.");
  assert.ok(r.includes("❌ Al 9-lea bot pornit azi, peste pragul tău de 7: zilele tale cu peste 7 boți au dat −54,2 USDT/zi, celelalte −9,1 USDT/zi."), m.mesaj);
  assert.ok(r.includes("❌ Pornit cu frâna trasă: 3 pierderi la rând (pauza la 3), 7 zile −682,0 USDT (pragul −60)."), m.mesaj);
  assert.ok(r.includes("❌ Ai ținut 7 h 30 min cu prețul în afara grilei: la tine, după 6 h se mai întorc doar 41%."), m.mesaj);
  assert.equal(r[r.length - 1], "👉 Aș număra boții înainte să pornesc: după al 7-lea, gata ziua.");
  garda(m, "raport");
});
await test("(A) mesajul „ghinion”: întâi ce a mers (✅), apoi că pierderea nu e o greșeală, sfatul „aș repeta”", () => {
  areCO();
  const m = MC.evaluareBot(CO.evalueaza({ t: TT(), frana: F(), afaraOre: 2, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }));
  assert.equal(m.titlu, "SOL long: decizii bune, ghinion −3,2 USDT"); assert.equal(m.nivel, "info");
  assert.match(m.mesaj, /\n✅ Al 3-lea bot pornit azi, în pragul tău de 7\.\n/);
  assert.match(m.mesaj, /\n✅ Pierderile erau sub pragurile frânei când l-ai pornit\.\n/);
  assert.match(m.mesaj, /\n✅ Ai închis la 2 h după ieșirea prețului din grilă, înainte de pragul de 6 h\.\n/);
  assert.match(m.mesaj, /\n⚖️ /); assert.match(m.mesaj, /\n👉 Aș repeta la fel/); assert.doesNotMatch(m.mesaj, /❌/);
  garda(m, "raport");
});
await test("(A) mesajele celorlalte cazuri trec garda: noroc, minute, lichidare, primul bot, short, neutru, fără grile, net zero", () => {
  areCO();
  const cazuri = [
    CO.evalueaza({ t: TT({ net: 4.4, dir: "short" }), frana: F({ pornitiAzi: 9, depasit: [{ cod: "boti" }] }), afaraOre: 13, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }),
    CO.evalueaza({ t: TT({ inchis: T0 + 6 * 60000, durataOre: 0.1, net: -0.7, grile: 0.2, pozitie: -0.3, comisioane: -0.6, funding: 0 }), frana: F({ pornitiAzi: 0 }), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }),
    CO.evalueaza({ t: TT({ inchis: T0 + 6 * 60000, durataOre: 0.1, net: -0.7, grile: 0, pozitie: -0.1, comisioane: -0.6, funding: 0 }), frana: F({ pornitiAzi: 0 }), afaraOre: 0, banda: BANDA, dovezi: null, motiv: null }),
    CO.evalueaza({ t: TT({ net: -98.4, moneda: "1000BONK", dir: "neutru" }), frana: F({ pornitiAzi: 30, netZi: -40, depasit: [{ cod: "zi" }, { cod: "boti" }] }), afaraOre: 50, banda: BANDA, dovezi: DOV, motiv: "liquidation" }),
    CO.evalueaza({ t: TT({ net: 0, grile: null, pozitie: null }), frana: F({ pornitiAzi: 0 }), afaraOre: null, banda: { dv: null, r: null }, dovezi: null, motiv: null }),
  ];
  const tit = cazuri.map((ev) => MC.evaluareBot(ev).titlu);
  assert.equal(tit[0], "SOL short: câștig cu noroc +4,4 USDT"); assert.equal(tit[3], "1000BONK: greșeala a costat −98,4 USDT"); assert.equal(tit[4], "SOL long: decizii bune +0,0 USDT");
  assert.match(MC.evaluareBot(cazuri[0]).mesaj, /după 6 h se mai întorc doar 41%, după 12 h 28%\./);
  assert.match(MC.evaluareBot(cazuri[1]).mesaj, /❌ Închis după 6 min: comisioanele −0,6 USDT = 3,0× cât au prins grilele \(\+0,2 USDT\); la tine, sub 15 min comisioanele sunt 3,4× grilele\./);
  assert.match(MC.evaluareBot(cazuri[1]).mesaj, /✅ Primul bot pornit azi/);
  assert.match(MC.evaluareBot(cazuri[2]).mesaj, /❌ Închis după 6 min: comisioanele −0,6 USDT, grilele n-au prins nimic\./);
  assert.match(MC.evaluareBot(cazuri[3]).mesaj, /❌ Lichidat: botul n-a avut un stop înaintea lichidării\./);
  assert.match(MC.evaluareBot(cazuri[3]).mesaj, /zilele tale cu peste 7 boți/);
  assert.match(MC.evaluareBot(cazuri[4]).mesaj, /^Ținut 7 h 30 min ⇒ net \+0,0 USDT\./);
  for (const ev of cazuri) garda(MC.evaluareBot(ev), "raport");
});
await test("(B) botul pornit cu frâna trasă: titlul, faptul cu pragurile depășite, „n-aș mai porni altul azi” (nu „închide-l”: minutele costă)", () => {
  assert.equal(typeof MC.pornitCuFrana, "function");
  const m = MC.pornitCuFrana("SOL", "long", F({ pornitiAzi: 8, netSapt: -682, depasit: [{ cod: "boti" }, { cod: "sapt" }], activa: true }));
  assert.equal(m.titlu, "SOL long: pornit cu frâna trasă");
  assert.equal(m.mesaj.split("\n")[0], "Frâna trasă la pornire: al 9-lea bot azi (pragul 7), 7 zile −682,0 USDT (pragul −60).");
  assert.match(m.mesaj, /\n👉 N-aș mai porni altul azi; pe acesta l-aș lăsa să lucreze, cu stopul pus\.$/);
  fara(verifica(m.titlu, "alertaTitlu"), "titlul"); fara(verifica(m.mesaj, "alertaMesaj"), "mesajul");
  const z = MC.pornitCuFrana("PUMPFUN", "neutru", F({ pornitiAzi: 2, rand: 4, netZi: -25.04, depasit: [{ cod: "zi" }, { cod: "rand" }], activa: true }));
  assert.equal(z.titlu, "PUMPFUN: pornit cu frâna trasă"); assert.match(z.mesaj, /4 pierderi la rând \(pauza la 3\), ziua −25,0 USDT \(pragul −20\)/);
  fara(verifica(z.mesaj, "alertaMesaj"), "mesajul cu ziua");
  // cazul cel mai rău: toate cele 4 praguri depășite, sume mari - rândul faptului rămâne ≤ 160
  const toate = MC.pornitCuFrana("1000BONK", "short", F({ pornitiAzi: 99, rand: 12, netZi: -1234.5, netSapt: -12345.6, depasit: [{ cod: "sapt" }, { cod: "zi" }, { cod: "rand" }, { cod: "boti" }], activa: true }));
  fara(verifica(toate.mesaj, "alertaMesaj"), "toate pragurile depășite");
});
await test("(C) întrebarea despre pragul pe 7 zile + mesajul de legătură al canalului: garda textelor", () => {
  assert.equal(typeof MC.pragSaptIntrebare, "function"); assert.equal(typeof MC.legatEvaluari, "function");
  const q = MC.pragSaptIntrebare(F({ netSapt: -682 }), 4);
  assert.equal(q.titlu, "Frâna pe 7 zile e trasă de 4 zile la rând");
  assert.match(q.mesaj, /−682,0 USDT/); assert.match(q.mesaj, /−60 USDT/); assert.match(q.mesaj, /\n👉 Aș hotărî azi: /);
  fara(verifica(q.titlu, "alertaTitlu"), "titlul"); fara(verifica(q.mesaj, "alertaMesaj"), "mesajul");
  const l = MC.legatEvaluari(); fara(verifica(l.titlu, "alertaTitlu"), "titlul legăturii"); fara(verifica(l.mesaj, "alertaMesaj"), "mesajul legăturii");
  assert.equal(MC.pragSaptIntrebare(F({ netSapt: -682 }), 21).titlu, "Frâna pe 7 zile e trasă de 21 de zile la rând");
});

// ---------------- starea: ce se evaluează, o dată ----------------
await test("(A) ce se evaluează: după pragul de timp, din ultimele 24 h, o singură dată, cei mai vechi întâi, cel mult 10 pe tură", () => {
  areCO();
  const st = {}; CO.initStare(st, ACUM);
  assert.equal(st.de, ACUM - 24 * ORA, "prima rulare: și boții din ultimele 24 h"); CO.initStare(st, ACUM + ORA); assert.equal(st.de, ACUM - 24 * ORA, "pragul nu se mută");
  const l = Array.from({ length: 12 }, (_, i) => tr("n" + i, "2026-10-31T05:00:00Z", new Date(ACUM - (12 - i) * 60000).toISOString(), -1));
  l.push(tr("vechi", "2026-10-29T05:00:00Z", "2026-10-30T16:00:00Z", -1));   // închis înainte de prag
  const x = CO.deEvaluat(l, st, ACUM);
  assert.equal(x.length, 10); assert.equal(x[0].id, "n0"); assert.ok(!x.some((t) => t.id === "vechi"));
  CO.noteaza(st, x[0], { decizii: [{ cod: "boti", ok: false }, { cod: "frana", ok: true }] }, ACUM);
  assert.deepEqual(st.evaluati.n0.rele, ["boti"]); assert.equal(st.evaluati.n0.net, -1);
  assert.ok(!CO.deEvaluat(l, st, ACUM).some((t) => t.id === "n0"), "evaluat o dată");
  const st2 = { de: ACUM - 48 * ORA }; assert.ok(!CO.deEvaluat([tr("z", "2026-10-29T10:00:00Z", "2026-10-30T12:00:00Z", -1)], st2, ACUM).length, "peste 24 h: nu mai vine");
  st.evaluati.batran = { inchis: ACUM - 4 * ZI }; st.porniri = { p1: { la: ACUM - 31 * ZI }, p2: { la: ACUM }, p3: ACUM - 31 * ZI }; CO.curata(st, ACUM);
  assert.ok(!st.evaluati.batran && st.evaluati.n0 && !st.porniri.p1 && st.porniri.p2 && !st.porniri.p3, "curățenie: evaluările > 3 zile (jurnalul lor e în fișierul lui), pornirile > 30 de zile");
  // peste 24 h (colector oprit, arhivă lipsă): nu se mai evaluează, dar se spun și se notează o dată
  const st3 = { de: ACUM - 72 * ORA, evaluati: {} }, vechi = [tr("v1", "2026-10-29T08:00:00Z", "2026-10-30T10:00:00Z", -1), tr("v2", "2026-10-29T09:00:00Z", "2026-10-31T17:00:00Z", -1)];
  assert.deepEqual(CO.preaVechi(vechi, st3, ACUM).map((t) => t.id), ["v1"]);
  st3.evaluati.v1 = { inchis: vechi[0].inchis, sarit: true }; assert.deepEqual(CO.preaVechi(vechi, st3, ACUM), []);
});
await test("(B) pornirile noi: după pragul de timp, din ultimele 2 h, o singură dată; cele dinainte de prima rulare nu", () => {
  areCO();
  const st = { de: ACUM - ORA, porniri: { vazut: ACUM - 600000 } };
  const boti = [{ id: "inainte", activ: true, pornitLa: ACUM - 90 * 60000 }, { id: "vazut", activ: true, pornitLa: ACUM - 20 * 60000 }, { id: "nou", activ: true, pornitLa: ACUM - 5 * 60000 }, { id: "oprit", activ: false, pornitLa: ACUM - 5 * 60000 }, { id: "fara", activ: true }];
  assert.deepEqual(CO.porniriNoi(boti, st, ACUM).map((b) => b.id), ["nou"]);
  const st2 = { de: ACUM - 5 * ORA }; assert.deepEqual(CO.porniriNoi([{ id: "vechi", activ: true, pornitLa: ACUM - 3 * ORA }], st2, ACUM), [], "peste 2 h: nu");
});
await test("(C) frâna pe 7 zile trasă: întrebarea în a 4-a zi la rând, de la 8 dimineața, o dată; iar abia după 7 zile; o zi fără ⇒ de la capăt", () => {
  areCO();
  const st = {}, tras = F({ netSapt: -682, depasit: [{ cod: "sapt" }], activa: true }), liber = F();
  const zi = (d) => new Date(Date.UTC(2026, 9, 27 + d, 12)).toISOString().slice(0, 10);
  assert.equal(CO.pasPragSapt(st, tras, zi(0), 10).intreaba, false);
  assert.equal(CO.pasPragSapt(st, tras, zi(1), 10).intreaba, false);
  assert.equal(CO.pasPragSapt(st, tras, zi(2), 10).intreaba, false);
  assert.equal(CO.pasPragSapt(st, tras, zi(3), 7).intreaba, false, "înainte de 8 nu");
  const q = CO.pasPragSapt(st, tras, zi(3), 9); assert.equal(q.intreaba, true); assert.equal(q.zile, 4);
  CO.marcheazaIntrebat(st, zi(3));
  assert.equal(CO.pasPragSapt(st, tras, zi(3), 15).intreaba, false, "o dată");
  for (let d = 4; d < 10; d++) assert.equal(CO.pasPragSapt(st, tras, zi(d), 10).intreaba, false, "nu înainte de 7 zile (" + zi(d) + ")");
  assert.equal(CO.pasPragSapt(st, tras, zi(10), 10).intreaba, true, "după 7 zile, iar");
  const s2 = {}; CO.pasPragSapt(s2, tras, zi(0), 10); CO.pasPragSapt(s2, tras, zi(1), 10); CO.pasPragSapt(s2, liber, zi(2), 10);
  CO.pasPragSapt(s2, tras, zi(3), 10); assert.equal(CO.pasPragSapt(s2, tras, zi(4), 10).zile, 2, "o zi liberă rupe șirul");
});

// ---------------- (D) frâna în raportul de duminică ----------------
await test("(D) săptămâna frânei: zilele trase, respectate (pragul atins, niciun bot după), trecute (boți porniți peste ea) și netul lor", () => {
  areCO();
  const DUM = T("2026-11-01T18:30:00Z"), P = { zi: 1000, sapt: 100000, rand: 99, boti: 7 }, l = [];
  // marți 27.10: 9 boți ⇒ al 8-lea și al 9-lea peste frână (−3 și −4); joi 29.10: exact 7 ⇒ frâna trasă seara, respectată; vineri 30.10: 2 boți
  for (let k = 0; k < 9; k++) l.push(tr("ma" + k, new Date(T("2026-10-27T06:00:00Z") + k * ORA).toISOString(), new Date(T("2026-10-27T06:30:00Z") + k * ORA).toISOString(), k === 7 ? -3 : k === 8 ? -4 : 1));
  for (let k = 0; k < 7; k++) l.push(tr("jo" + k, new Date(T("2026-10-29T06:00:00Z") + k * ORA).toISOString(), new Date(T("2026-10-29T06:30:00Z") + k * ORA).toISOString(), 1));
  for (let k = 0; k < 2; k++) l.push(tr("vi" + k, new Date(T("2026-10-30T06:00:00Z") + k * ORA).toISOString(), new Date(T("2026-10-30T06:30:00Z") + k * ORA).toISOString(), 1));
  const r = CO.franaPeSaptamana(l, P, DUM, OB.franaLaPornire);
  assert.equal(r.zile.length, 7); assert.equal(r.zile[0].zi, "2026-10-26"); assert.equal(r.zile[6].zi, "2026-11-01");
  const ma = r.zile.find((z) => z.zi === "2026-10-27"), jo = r.zile.find((z) => z.zi === "2026-10-29"), vi = r.zile.find((z) => z.zi === "2026-10-30");
  assert.equal(ma.peste, 2); assert.equal(ma.netPeste, -7); assert.ok(ma.trasa && !ma.respectata);
  assert.ok(jo.trasa && jo.respectata && jo.peste === 0, "7 boți = pragul atins, al 8-lea nepornit");
  assert.ok(!vi.trasa);
  assert.equal(r.trase, 2); assert.equal(r.respectate, 1); assert.equal(r.trecute, 1); assert.equal(r.nPeste, 2); assert.equal(r.netPeste, -7);
  const lin = CO.liniiFranaSaptamana(r);
  assert.equal(lin[0], "Frâna săptămânii: trasă în 2 zile din 7; respectată în 1, trecută în 1 (2 boți porniți peste ea, net −7,0 USDT).");
  assert.equal(lin[1], "Zilele peste frână: 27.10: 2 boți, −7,0 USDT.");
  for (const x of lin) fara(verifica(x, "raport"), "rândul raportului");
  assert.deepEqual(CO.liniiFranaSaptamana(CO.franaPeSaptamana([], P, DUM, OB.franaLaPornire)), ["Frâna săptămânii: n-a fost trasă în nicio zi."]);
  // 7 zile cu boți peste frână: rândurile se rup doar între zile („29.10: 8 boți” nu se desparte)
  const sapte = { trase: 7, respectate: 0, trecute: 7, nPeste: 140, netPeste: -1234.5, zile: Array.from({ length: 7 }, (_, i) => ({ zi: "2026-10-2" + (5 + i > 9 ? 9 : 5 + i), peste: 20 + i, netPeste: -123.45 - i, trasa: true, respectata: false })) };
  const rs = CO.liniiFranaSaptamana(sapte).join("\n").split("\n");
  assert.ok(rs.length >= 3, rs.join(" | "));
  for (const x of rs) { fara(verifica(x, "raport"), "rândul „" + x + "”"); assert.match(x, /^(Frâna săptămânii|Zilele peste frână: \d\d\.\d\d: |\d\d\.\d\d: )/, "rând început în mijlocul unei zile: „" + x + "”"); }
});
await test("(D) raportul lung pleacă pe Discord în părți ≤ 1900, rupt doar între rânduri, nimic pierdut (Discord tăia la 2000: din 25.10 se pierdeau Trend și acțiunile)", () => {
  assert.equal(typeof MC.raportParti, "function");
  const linii = Array.from({ length: 22 }, (_, i) => "Rândul " + (i + 1) + ": " + "x".repeat(100 + (i % 3) * 20));
  const p = MC.raportParti("2026-11-01", linii);
  assert.equal(p.length, 2); assert.deepEqual(p.map((x) => x.titlu), ["Raportul de duminică (2026-11-01) · 1/2", "Raportul de duminică (2026-11-01) · 2/2"]);
  for (const x of p) { assert.ok(x.mesaj.length <= 1900, String(x.mesaj.length)); assert.equal(x.nivel, "info"); fara(verifica(x.titlu, "alertaTitlu"), "titlul"); }
  assert.deepEqual(p.map((x) => x.mesaj).join("\n").split("\n"), linii, "nimic pierdut, nimic rupt");
  const scurt = MC.raportParti("2026-11-01", ["a", "b"]);
  assert.equal(scurt.length, 1); assert.deepEqual(scurt[0], MC.raport("2026-11-01", ["a", "b"]), "scurt ⇒ exact ca înainte");
  const s = citeste("scripts", "colector.mjs"), r = s.slice(s.indexOf("async function turaRaport("), s.indexOf("\n}\n", s.indexOf("async function turaRaport(")));
  assert.match(r, /MesajeColector\.raportParti\(r\.data, rap\.linii\)/); assert.doesNotMatch(r, /trimiteAlerta\(MesajeColector\.raport\(r\.data, rap\.linii\)/);
});
await test("(C) la prima rulare, șirul zilelor cu frâna pe 7 zile trasă se ia din istorie (nu de la zero): întrebarea vine azi dacă e trasă de peste 3 zile", () => {
  areCO();
  assert.equal(typeof CO.seriaSaptInapoi, "function"); assert.equal(typeof CO.pornesteSeriaSapt, "function");
  // pierderi zilnice de −30 în ultimele 10 zile ⇒ pe 7 zile sub −60 de la a 2-a zi încoace
  const l = Array.from({ length: 10 }, (_, d) => tr("p" + d, new Date(ACUM - (10 - d) * ZI).toISOString(), new Date(ACUM - (10 - d) * ZI + ORA).toISOString(), -30));
  const n = CO.seriaSaptInapoi(l, PR, ACUM, OB.frana);
  assert.ok(n >= 8 && n <= 9, String(n));
  const st = {}; CO.pornesteSeriaSapt(st, n, "2026-10-31");
  assert.equal(st.sapt.zi, "2026-10-30"); assert.equal(st.sapt.zile, n);
  const q = CO.pasPragSapt(st, F({ netSapt: -300, depasit: [{ cod: "sapt" }], activa: true }), "2026-10-31", 9);
  assert.equal(q.intreaba, true); assert.equal(q.zile, n + 1);
  const st2 = { sapt: { zi: "2026-10-31", zile: 1, intrebat: null } }; CO.pornesteSeriaSapt(st2, 9, "2026-10-31"); assert.equal(st2.sapt.zile, 1, "starea existentă nu se rescrie");
  assert.equal(CO.seriaSaptInapoi([], PR, ACUM, OB.frana), 0);
});

// ---------------- revizia independentă (31.10): reparațiile ----------------
await test("(revizia C1) motivul închiderii stă în buOrderData.reasonBy (arhiva compactă și pagina Pionex): lichidarea se vede, stopul nu e pus pe el", () => {
  areCO(); assert.equal(typeof CO.motivDin, "function");
  const arhiva = { strategyId: "1", createTime: T0, closeTime: T0 + 40 * 60000, buOrderData: { reasonBy: "liquidation" } }, pionex = { buOrderData: { reasonBy: "loss_stop" } };
  assert.equal(CO.motivDin(arhiva), "liquidation"); assert.equal(CO.motivDin(pionex), "loss_stop"); assert.equal(CO.motivDin({ reasonBy: "user_cancel" }), "user_cancel"); assert.equal(CO.motivDin({ buOrderData: {} }), null);
  const ev = CO.evalueaza({ t: TT({ inchis: T0 + 40 * 60000, durataOre: 0.67, net: -48.7 }), frana: F({ pornitiAzi: 0 }), afaraOre: 0.3, banda: BANDA, dovezi: DOV, motiv: CO.motivDin(arhiva) });
  assert.deepEqual(coduri(ev, false), ["lichidare"]); assert.equal(ev.verdict, "cost"); assert.ok(!ev.decizii.some((d) => d.cod === "banda"), "lichidat: banda nu e decizia lui");
  const sist = CO.evalueaza({ t: TT({ inchis: T0 + 6 * 60000, durataOre: 0.1 }), frana: F(), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: "system_cancel" });
  assert.ok(!sist.decizii.some((d) => d.cod === "minute"), "închis de Pionex: nu e închiderea lui");
  assert.match(citeste("scripts", "colector.mjs"), /Comportament\.motivDin\(x\)/);
});
await test("(revizia C2) „frâna” de la evaluare = pierderile (azi, 7 zile, la rând); pragul de boți e decizia lui separată ⇒ niciodată „frâna era liberă” lângă „peste pragul de boți”", () => {
  areCO();
  const m = MC.evaluareBot(CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 7, depasit: [{ cod: "boti" }], activa: true }), afaraOre: 2, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }));
  assert.match(m.mesaj, /❌ Al 8-lea bot pornit azi, peste pragul tău de 7/); assert.match(m.mesaj, /✅ Pierderile erau sub pragurile frânei când l-ai pornit\./);
  assert.doesNotMatch(m.mesaj, /Frâna era liberă/);
});
await test("(revizia I1) botul pornit: frâna văzută ATUNCI, cu pierderea boților încă deschiși, ținută ca instantaneu - evaluarea de la închidere o folosește", () => {
  areCO(); assert.equal(typeof CO.instantaneu, "function");
  const l = [tr("a", "2026-10-31T06:00:00Z", "2026-10-31T07:00:00Z", -15)], desc = [{ id: "x", activ: true, pornitLa: T("2026-10-31T08:00:00Z"), profitTotal: -10 }], nou = { id: "n", pornit: T("2026-10-31T09:00:00Z") };
  assert.equal(OB.franaLaPornire(nou, l, PR, desc).activa, false, "fără pierderea deschișilor (istoria): −15");
  const f = OB.franaLaPornire(nou, l, PR, desc, true); assert.equal(f.activa, true, "cu pierderea deschișilor (acum): −25 ⇒ trasă pe zi"); assert.equal(Math.round(f.netZi), -25);
  const sn = CO.instantaneu(f); assert.deepEqual(sn.depasit, [{ cod: "zi" }]); assert.equal(sn.netZi, -25); assert.deepEqual(sn.praguri, PR); assert.equal(sn.pornitiAzi, 2);
  const ev = CO.evalueaza({ t: TT(), frana: sn, afaraOre: null, banda: BANDA, dovezi: null, motiv: null });
  assert.equal(ev.decizii.find((d) => d.cod === "frana").ok, false, "instantaneul ține frâna trasă de atunci");
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /st\.porniri\[String\(b\.id\)\] = \{ la: acum, f: Comportament\.instantaneu\(fr\) \}/);
  assert.match(s, /Obiceiuri\.franaLaPornire\(\{ id: b\.id, pornit: Number\(b\.pornitLa\) \}, tr, P, deschise, true\)/);
  assert.match(s, /sn && sn\.f \? sn\.f : Obiceiuri\.franaLaPornire\(t, tr, P, deschise\)/);
});
await test("(revizia I2b) orele în afara grilei: dacă colectorul n-a mai văzut botul cu peste 15 min înainte de închidere ⇒ nu știu (nu „7 h afară” după o oprire)", () => {
  areCO();
  const inch = T0 + 10 * ORA;
  assert.equal(CO.oreAfara({ _afaraDe: inch - 8 * ORA, _afaraVazut: inch - 7 * ORA }, inch), null);
  assert.equal(CO.oreAfara({ _afaraDe: inch - 8 * ORA, _afaraVazut: inch - 5 * 60000 }, inch), 8);
  assert.equal(CO.oreAfara({ _afaraDe: inch - 8 * ORA }, inch), 8, "starea de dinainte (fără _afaraVazut) rămâne");
  assert.match(citeste("scripts", "colector.mjs"), /st\._afaraDe = afara \? \(st\._afaraDe \|\| acum\) : null; st\._afaraVazut = acum;/);
});
await test("(revizia I3) banda se judecă doar când închiderea e a lui (închis de el sau motiv necunoscut) și după cel puțin 15 min", () => {
  areCO();
  const b = (motiv, min, ore) => CO.evalueaza({ t: TT({ inchis: T0 + min * 60000, durataOre: min / 60 }), frana: F(), afaraOre: ore, banda: BANDA, dovezi: null, motiv }).decizii.find((d) => d.cod === "banda");
  assert.equal(b("loss_stop", 450, 7), undefined); assert.equal(b("profit_stop", 450, 7), undefined); assert.equal(b("system_cancel", 450, 7), undefined);
  assert.equal(b("user_cancel", 8, 0.1), undefined, "închis în minute: lecția e a minutelor, nu a benzii");
  assert.equal(b("user_cancel", 450, 7).ok, false); assert.equal(b(null, 450, 2).ok, true);
});
await test("(revizia I4) raportul de duminică: boții încă deschiși intră la porniți și la frână; cei peste frână se spun ca „încă deschiși”", () => {
  areCO();
  const DUM = T("2026-11-01T18:30:00Z"), P = { zi: 1000, sapt: 100000, rand: 99, boti: 7 }, l = [];
  for (let k = 0; k < 7; k++) l.push(tr("du" + k, new Date(T("2026-11-01T06:00:00Z") + k * ORA).toISOString(), new Date(T("2026-11-01T06:30:00Z") + k * ORA).toISOString(), 1));
  const desc = [{ id: "d8", activ: true, pornitLa: T("2026-11-01T14:00:00Z"), profitTotal: -2 }];
  const r = CO.franaPeSaptamana(l, P, DUM, OB.franaLaPornire, desc), du = r.zile.find((z) => z.zi === "2026-11-01");
  assert.equal(du.porniti, 8); assert.equal(du.peste, 1); assert.equal(du.deschisi, 1); assert.equal(du.netPeste, 0); assert.ok(du.trasa && !du.respectata);
  const lin = CO.liniiFranaSaptamana(r);
  assert.equal(lin[0], "Frâna săptămânii: trasă în 1 zi din 7; respectată în 0, trecută în 1 (1 bot pornit peste ea, net +0,0 USDT pe cei închiși; 1 bot încă deschis).");
  assert.equal(lin[1], "Zilele peste frână: 01.11: 1 bot (1 deschis), +0,0 USDT.");
  for (const x of lin) fara(verifica(x, "raport"), "rândul raportului");
  assert.match(citeste("scripts", "colector.mjs"), /Comportament\.franaPeSaptamana\(trades, pr, acum, Obiceiuri\.franaLaPornire, \(ultimiiBoti \|\| \[\]\)\.filter\(/);
});
await test("(revizia I2 + I5) tura nu judecă pe citiri proaste (configurarea picată, lista Pionex nulă) și nu pornește peste ea însăși", () => {
  const s = citeste("scripts", "colector.mjs"), tc = s.slice(s.indexOf("async function turaComportament("), s.indexOf("\n}\n", s.indexOf("async function turaComportament(")));
  assert.match(s, /turaComportament\(\{ toti, act, praguri, f, cfgOk: !!cfg \}\)/);
  assert.match(tc, /if \(!cfgOk \|\| !act \|\| !Array\.isArray\(act\.bots\) \|\| \(act\.probleme && act\.probleme\.listaNula\)\)/);
  assert.match(tc, /comportamentInLucru/); assert.match(s, /var comportamentInLucru = false/);
  assert.match(tc, /Comportament\.noteaza\(st, t, ev, acum\); scrieStareAcum\(\)/, "evaluarea notată pe disc pe loc (o pană de curent nu o mai dublează)");
  assert.match(tc, /evaluari\.jsonl/, "jurnalul evaluărilor, în fișierul lui"); assert.match(tc, /Comportament\.preaVechi\(/);
});
await test("(revizia, mărunte) praguri egale fără text dublat; dovezile doar când susțin regula; sfatul minutelor adevărat și când grilele bat comisioanele; pornirea cu praguri mari ≤ 160", () => {
  areCO();
  const egal = MC.evaluareBot(CO.evalueaza({ t: TT(), frana: F(), afaraOre: 7, banda: { dv: { h: 6, intoarse: 0.25, n: 40 }, r: { h: 6, intoarse: 0.25, n: 40 } }, dovezi: null, motiv: "user_cancel" }));
  assert.doesNotMatch(egal.mesaj, /după 6 h se mai întorc doar 25%, după 6 h/);
  const contra = { zile: { prag: 3, peste: { zile: 120, pe: 2.1 }, sub: { zile: 90, pe: -5.3 } }, minute: null };
  const mc = MC.evaluareBot(CO.evalueaza({ t: TT(), frana: F({ pornitiAzi: 5, praguri: Object.assign({}, PR, { boti: 3 }), depasit: [{ cod: "boti" }] }), afaraOre: null, banda: BANDA, dovezi: contra, motiv: null }));
  assert.match(mc.mesaj, /❌ Al 6-lea bot pornit azi, peste pragul tău de 3\./); assert.doesNotMatch(mc.mesaj, /zilele tale cu peste/, "dovada contra regulii nu se arată ca dovadă");
  const mn = MC.evaluareBot(CO.evalueaza({ t: TT({ inchis: T0 + 6 * 60000, durataOre: 0.1, net: 0.4, grile: 1.2, comisioane: -0.6, funding: 0 }), frana: F(), afaraOre: 0, banda: BANDA, dovezi: DOV, motiv: "user_cancel" }));
  assert.doesNotMatch(mn.mesaj, /fără grile/); assert.match(mn.mesaj, /\n👉 Aș porni gridul doar când îl las să lucreze: /);
  garda(mn, "raport");
  const mare = MC.pornitCuFrana("1000000BABYDOGE", "short", F({ pornitiAzi: 120, rand: 15, netZi: -12345.6, netSapt: -123456.7, praguri: { zi: 1000, sapt: 10000, rand: 10, boti: 100 }, depasit: [{ cod: "sapt" }, { cod: "zi" }, { cod: "rand" }, { cod: "boti" }], activa: true }));
  fara(verifica(mare.mesaj, "alertaMesaj"), "pornirea cu praguri mari");
  const q = MC.pragSaptIntrebare(F({ netSapt: -682 }), 4); assert.doesNotMatch(q.mesaj, /nu te mai oprește/, "întrebarea nu presupune că n-a respectat-o");
});

// ---------------- canalul separat ----------------
const fetchFals = (raspunsuri) => { const urls = [], corpuri = []; const f = async (u, o) => { urls.push(u); corpuri.push(JSON.parse(o.body)); const r = raspunsuri.length > 1 ? raspunsuri.shift() : raspunsuri[0]; return { ok: r.status >= 200 && r.status < 300, status: r.status, headers: { get: () => null }, text: async () => r.corp || "" }; }; f.urls = urls; f.corpuri = corpuri; return f; };
const W = "https://discord.com/api/webhooks/1/abc_DEF-123";
await test("canalul separat: fără webhook ⇒ nimic trimis, spus o dată în jurnal; cu webhook ⇒ DOAR la el", async () => {
  assert.ok(CS && typeof CS.creeazaCanal === "function", "scripts/lib/canal-separat.mjs / creeazaCanal lipsește");
  const fis = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "canal-")), "coada.json"), j = [];
  const f0 = fetchFals([{ status: 204 }]), c0 = CS.creeazaCanal({ nume: "evaluări", webhook: "", fis, fetch: f0, jurnal: (...a) => j.push(a.join(" ")) });
  assert.equal(c0.legat, false); assert.equal(await c0.trimite({ nivel: "info", titlu: "x", mesaj: "y" }), false); await c0.trimite({ nivel: "info", titlu: "x", mesaj: "y" });
  assert.equal(f0.urls.length, 0); assert.equal(j.filter((x) => /nu e legat/.test(x)).length, 1); assert.ok(!j.some((x) => /https:/.test(x)), "adresa nu apare în jurnal");
  const f1 = fetchFals([{ status: 204 }]), c1 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis, fetch: f1, jurnal: () => {} });
  assert.equal(await c1.trimite({ nivel: "atentie", titlu: "SOL long: greșeala a costat −3,2 USDT", mesaj: "a\nb" }), true);
  assert.deepEqual(f1.urls, [W + "?wait=true"]); assert.equal(f1.corpuri[0].embeds[0].title, "SOL long: greșeala a costat −3,2 USDT");
});
await test("canalul separat: refuzat ⇒ coada lui pe disc, golită la tura următoare în ordine, cu „întârziat”; 429 ⇒ pauză fără cereri", async () => {
  assert.ok(CS, "canal-separat lipsește");
  const fis = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "canal-")), "coada.json");
  const f1 = fetchFals([{ status: 500 }]), c1 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis, fetch: f1, jurnal: () => {} });
  assert.equal(await c1.trimite({ nivel: "info", titlu: "unu", mesaj: "m" }), true, "intrat la coadă = primit");
  assert.equal(c1.coada().length, 1); assert.equal(JSON.parse(fs.readFileSync(fis, "utf8")).length, 1, "coada pe disc");
  const f2 = fetchFals([{ status: 204 }]), c2 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis, fetch: f2, jurnal: () => {} });
  assert.equal(c2.coada().length, 1, "coada citită la pornire"); await c2.goleste();
  assert.equal(c2.coada().length, 0); assert.match(f2.corpuri[0].embeds[0].title, /^unu \(întârziat \d+ min\)$/);
  const f3 = fetchFals([{ status: 429, corp: JSON.stringify({ retry_after: 60 }) }, { status: 204 }]), c3 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis, fetch: f3, jurnal: () => {} });
  assert.equal(await c3.trimite({ nivel: "info", titlu: "doi", mesaj: "m" }), true); const n = f3.urls.length;
  assert.equal(await c3.trimite({ nivel: "info", titlu: "trei", mesaj: "m" }), true); await c3.goleste();
  assert.equal(f3.urls.length, n, "în pauza cerută de Discord, nicio cerere"); assert.equal(c3.coada().length, 2);
  // trimiterea fără confirmare (conexiune ruptă după plecare) ⇒ reîncercată cu „poate e o dublură”, ca pe canalul alertelor
  const fis4 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "canal-")), "coada.json");
  const f4 = async () => { throw new Error("socket hang up"); }, c4 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis: fis4, fetch: f4, jurnal: () => {} });
  assert.equal(await c4.trimite({ nivel: "info", titlu: "patru", mesaj: "m" }), true);
  const f5 = fetchFals([{ status: 204 }]), c5 = CS.creeazaCanal({ nume: "evaluări", webhook: W, fis: fis4, fetch: f5, jurnal: () => {} });
  await c5.goleste(); assert.match(f5.corpuri[0].embeds[0].title, /^patru \(întârziat \d+ min · poate e o dublură\)$/);
});

// ---------------- legarea în colector ----------------
await test("colectorul: canalul evaluărilor din DISCORD_WEBHOOK_EVALUARI (coada lui), evaluările și pornirile în tura frânei, NICIODATĂ pe canalul alertelor", () => {
  const s = citeste("scripts", "colector.mjs");
  assert.match(s, /VARS\.DISCORD_WEBHOOK_EVALUARI/); assert.match(s, /creeazaCanal\(\{[^}]*de-trimis-evaluari\.json/);
  assert.match(s, /async function turaFrana\(\)[\s\S]*?turaComportament\(\{ toti, act, praguri, f, cfgOk: !!cfg \}\)[\s\S]*?\n\}\n/, "turaFrana nu cheamă turaComportament");
  const tc = s.slice(s.indexOf("async function turaComportament("), s.indexOf("\n}\n", s.indexOf("async function turaComportament(")));
  assert.ok(tc.length > 100, "turaComportament lipsește");
  for (const re of [/Comportament\.initStare\(/, /Obiceiuri\.franaLaPornire\(/, /Comportament\.evalueaza\(/, /Comportament\.oreAfara\(stareAlerte\[t\.id\], t\.inchis\)/, /canalEvaluari\.trimite\(MesajeColector\.evaluareBot\(/,
    /Comportament\.porniriNoi\(/, /canalEvaluari\.trimite\(MesajeColector\.pornitCuFrana\(/, /Comportament\.pornesteSeriaSapt\(st, Comportament\.seriaSaptInapoi\(tr, P, acum, Obiceiuri\.frana\), zi\)/, /Comportament\.pasPragSapt\(/, /canalEvaluari\.trimite\(MesajeColector\.pragSaptIntrebare\(/, /Comportament\.noteaza\(/, /Comportament\.curata\(/, /Comportament\.motivDin\(x\)/])
    assert.match(tc, re, "turaComportament: lipsește " + re);
  assert.doesNotMatch(s, /trimiteAlerta\(MesajeColector\.(evaluareBot|pornitCuFrana|pragSaptIntrebare|legatEvaluari)/, "un mesaj de evaluare pe canalul alertelor");
  assert.doesNotMatch(s, /anuntaMesaj\(MesajeColector\.(evaluareBot|pornitCuFrana|pragSaptIntrebare|legatEvaluari)/);
  assert.match(s, /async function bucla\(\)[\s\S]*?canalEvaluari\.goleste\(\)/, "bucla nu golește coada evaluărilor");
});
await test("colectorul: raportul de duminică primește săptămâna frânei (pragurile din configurare)", () => {
  const s = citeste("scripts", "colector.mjs"), r = s.slice(s.indexOf("async function turaRaport("), s.indexOf("\n}\n", s.indexOf("async function turaRaport(")));
  assert.match(r, /Comportament\.liniiFranaSaptamana\(Comportament\.franaPeSaptamana\(trades, /); assert.match(r, /action=config/);
});
await test("versiunile: v100.281 în aplicație, v101.153 în colector; proba în lanț", () => {
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.281"/);
  assert.match(citeste("BUILD_INFO.json"), /"version": "v100\.281"/);
  assert.match(citeste("public", "index.html"), /id="healthAppVersion">v100\.281</);
  assert.match(citeste("public", "sw.js"), /crypto-radar-v100-281/);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.153"/);
  const p = JSON.parse(citeste("package.json")); assert.equal(p.scripts["test:v100281"], "node scripts/proba-v100281.mjs"); assert.match(p.scripts.test, /npm run test:v100281/);
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
