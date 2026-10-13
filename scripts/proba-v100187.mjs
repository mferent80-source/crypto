// Proba v100.187 / colector v101.108 (13.10.2026, el: „fă idei” — ideile 1 și 2 din v100.186)
// 1) alerta „contra” din pândă spune și cât de departe e lichidarea, în zile obișnuite ale monedei (amplitudinea medie pe zi, din pândă)
// 2) bilanțul alertei: episoadele „contra” și un MARTOR (o zi fără contra pe bot, cel mult una la 24 h), judecate la 72 h pe profitul botului;
//    în raportul de duminică, „prea puține” sub 10 de fiecare fel
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import "./lib/text-ro-global.mjs";
import * as P from "./lib/paza-boti.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 600)}`); }); }
console.log("\nv100.187 / colector v101.108 · lichidarea în zile obișnuite + bilanțul alertei „contra” · proba\n");

const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo }; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "latime.js"), ctx);
const L = ctx.Latime, ACUM = Date.UTC(2026, 9, 13, 14, 0, 0), H = 3600000;
const lat = (o = {}) => ({ acum: Object.assign({ la: ACUM - 5 * 60000, n: 1, lat: {}, regim: { cod: "LARG-SUS" }, eroare: null, monede: [
  { sym: "PLUMEUSDT", dir: "SUS", zileDir: 51, volPctl: 50, extPctl: 40, adrUsed: 50, adrPct: 4.7, fundPctl: 50, oiPctl: 10 }] }, o) });
const bot = (o = {}) => Object.assign({ id: "b1", baza: "PLUME.PERP", simbolPionex: "PLUME_USDT_PERP", directie: "SHORT", levier: 5, distantaLichidarePct: 14.2, profitTotal: -3 }, o);

await test("masuraMoneda dă și amplitudinea medie pe zi în % din preț (adrPct)", () => {
  const b1d = Array.from({ length: 20 }, (_, i) => ({ o: 100, h: 102, l: 98, c: 100 }));
  const b4 = Array.from({ length: 600 }, (_, i) => ({ o: 100, h: 101, l: 99, c: 100 + Math.sin(i) }));
  const m = L.masuraMoneda({ sym: "XUSDT", pret: 100, b4, b1d, frAcum: null }, L.PRAGURI);
  assert.equal(m.adrPct, 4);
});
await test("alerta „contra”: lichidarea față de amplitudinea pe zi (14,2% / 4,7% ⇒ 3,0×), cu o zecimală", () => {
  const a = P.pazaPanda({ Latime: L, latime: lat(), bot: bot(), inainte: undefined, acum: ACUM });
  assert.match(a.mesaj.mesaj, /Lichidarea e la 14,2%, de 3,0× amplitudinea obișnuită a monedei pe o zi \(~4,7%\)\./);
});
await test("alerta „contra”: sub o zi obișnuită o spune; fără distanță sau fără amplitudine ⇒ fără propoziție", () => {
  assert.match(P.pazaPanda({ Latime: L, latime: lat(), bot: bot({ distantaLichidarePct: 3.1 }), inainte: undefined, acum: ACUM }).mesaj.mesaj, /Lichidarea e la 3,1%, sub amplitudinea obișnuită a monedei pe o zi/);
  assert.doesNotMatch(P.pazaPanda({ Latime: L, latime: lat(), bot: bot({ distantaLichidarePct: null }), inainte: undefined, acum: ACUM }).mesaj.mesaj, /Lichidarea/);
  const l2 = lat(); l2.acum.monede[0].adrPct = null;
  assert.doesNotMatch(P.pazaPanda({ Latime: L, latime: l2, bot: bot(), inainte: undefined, acum: ACUM }).mesaj.mesaj, /Lichidarea/);
});
await test("bilanț: episodul nou se notează o dată (anuntat schimbat), martorul cel mult o dată pe zi pe bot și doar fără contra", () => {
  const lista = [];
  P.pandaNoteaza(lista, { bot: bot(), inainte: undefined, dupa: { contra: true, anuntat: ACUM }, acum: ACUM });
  P.pandaNoteaza(lista, { bot: bot(), inainte: { contra: true, anuntat: ACUM }, dupa: { contra: true, anuntat: ACUM }, acum: ACUM + H });
  assert.equal(lista.length, 1); assert.deepEqual({ ...lista[0] }, { tip: "contra", id: "b1", nume: "PLUME", la: ACUM, p0: -3, ultim: -3 });
  const l2 = [];
  P.pandaNoteaza(l2, { bot: bot({ id: "b2" }), inainte: undefined, dupa: { contra: false, anuntat: 0 }, acum: ACUM });
  P.pandaNoteaza(l2, { bot: bot({ id: "b2" }), inainte: { contra: false }, dupa: { contra: false, anuntat: 0 }, acum: ACUM + 23 * H });
  P.pandaNoteaza(l2, { bot: bot({ id: "b2" }), inainte: { contra: false }, dupa: { contra: false, anuntat: 0 }, acum: ACUM + 25 * H });
  assert.equal(l2.length, 2); assert.equal(l2[0].tip, "martor");
  P.pandaNoteaza(l2, { bot: bot({ id: "b3", profitTotal: "x" }), inainte: undefined, dupa: { contra: false }, acum: ACUM });
  assert.equal(l2.length, 2, "fără profit numeric nu se notează");
});
await test("bilanț: judecarea la 72 h (profitul ultim văzut − cel de la notare); botul închis rămâne pe ultimul profit văzut", () => {
  const lista = [{ tip: "contra", id: "b1", nume: "PLUME", la: ACUM, p0: -3, ultim: -3 }, { tip: "martor", id: "b9", nume: "ADA", la: ACUM, p0: 1, ultim: 1 }];
  P.pandaJudeca(lista, [bot({ profitTotal: -5 })], ACUM + 10 * H);
  assert.equal(lista[0].ultim, -5); assert.equal(lista[0].delta, undefined, "încă nu e judecat");
  P.pandaJudeca(lista, [bot({ profitTotal: -7 })], ACUM + 72 * H);
  assert.equal(lista[0].delta, -4); assert.equal(lista[1].delta, 0, "b9 închis: ultimul profit văzut");
  P.pandaJudeca(lista, [bot({ profitTotal: 100 })], ACUM + 80 * H);
  assert.equal(lista[0].delta, -4, "judecat o singură dată");
});
await test("bilanț: textul — prea puține sub 10 de fiecare fel; altfel procentul pe pierdere la ambele, fără verdict „dovedit”", () => {
  const ep = (tip, d, n) => Array.from({ length: n }, () => ({ tip, delta: d }));
  assert.equal(P.pandaBilant([]), "Alerta „contra” din pândă (bilanț la 72 h): încă nimic judecat.");
  assert.match(P.pandaBilant(ep("contra", -1, 3).concat(ep("martor", 1, 20))), /^Alerta „contra” din pândă \(bilanț la 72 h\): 3 episoade, botul a pierdut în 3 \(100%\) · martorul \(zile fără contra\): 20, pierdut în 0 \(0%\) · prea puține ca să spună ceva \(trebuie cel puțin 10 de fiecare\)\.$/);
  const t = P.pandaBilant(ep("contra", -1, 6).concat(ep("contra", 2, 4), ep("martor", -1, 4), ep("martor", 1, 6)));
  assert.match(t, /10 episoade, botul a pierdut în 6 \(60%\) · martorul \(zile fără contra\): 10, pierdut în 4 \(40%\) · diferența e de 20 de puncte; nedovedită pe atât de puține, o urmăresc\.$/);
  assert.doesNotMatch(t, /(?<!ne)dovedit/, "niciun „dovedit”, doar „nedovedită”");
});
await test("colectorul: notează după paza fiecărui bot, judecă la fiecare tură, bilanțul intră în raportul de duminică; v101.108", () => {
  const COL = citeste("scripts", "colector.mjs");
  assert.match(COL, /const VERSIUNE_COLECTOR = "v101\.108";/);
  assert.match(COL, /const pandaInainte = stareAlerte\[b\.id\] && stareAlerte\[b\.id\]\._panda;/);
  assert.match(COL, /pandaNoteaza\(meta\(\)\.pandaContra \|\| \(meta\(\)\.pandaContra = \[\]\), \{ bot: b, inainte: pandaInainte, dupa: stareAlerte\[b\.id\]\._panda, acum \}\)/);
  assert.match(COL, /pandaJudeca\(meta\(\)\.pandaContra \|\| \(meta\(\)\.pandaContra = \[\]\), boti, acum\)/);
  assert.match(COL, /rap\.linii\.push\(pandaBilant\(m\.pandaContra \|\| \[\]\)\);/);
});

console.log(`\n${teste - picate}/${teste} trecute\n`);
process.exit(picate ? 1 : 0);
