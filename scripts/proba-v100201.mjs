// Probele v100.201 / colector v101.118 (15.10.2026, el: „fă tot” — ultima idee din audit, B1): verdictul Monte Carlo pe boți VERIFICAT pe ce a urmat.
// Colectorul ține, o dată pe zi pe fiecare bot activ, șansa „pe plus în 7 zile” dată de simulator + totalul botului de atunci; după 7 zile (sau
// la închiderea botului, cu totalul final) vede dacă botul chiar a câștigat de atunci. Raportul: câte verdicte judecate, pe câte zile, scorul
// Brier față de „aruncarea de ban”, și cutiile (sub 40 % / 40–60 % / peste 60 %). Sub 30 de verdicte judecate ⇒ „puține”, fără verdict.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { pCastig7, noteazaMc, judecaMc, judecaMcLaInchidere, raportMc } from "./lib/tura-monte-carlo-bot.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message).slice(0, 400)}`); }); }
console.log("\nv100.201 · verdictul Monte Carlo verificat pe ce a urmat · proba\n");
const ZI = 86400000, T0 = Date.parse("2026-10-15T10:00:00Z");

await test("pCastig7: șansa pe plus la 7 zile, „de aici încolo” când există (bot pornit), altfel a drumului întreg; fără 7 zile ⇒ null", () => {
  assert.equal(pCastig7({ orizonturi: [{ zile: 1, pCastig: 0.4 }, { zile: 7, pCastig: 0.55, deAici: { pCastig: 0.62 } }] }), 0.62);
  assert.equal(pCastig7({ orizonturi: [{ zile: 7, pCastig: 0.55 }] }), 0.55);
  assert.equal(pCastig7({ orizonturi: [{ zile: 1, pCastig: 0.4 }] }), null); assert.equal(pCastig7(null), null);
});
await test("noteazaMc: o singură intrare pe bot pe zi (UTC); fără șansă sau fără total ⇒ nimic; cel mult 800 de intrări", () => {
  let j = noteazaMc([], { id: "7", p: 0.6, cat: "tine", total: 1.5, acum: T0 });
  j = noteazaMc(j, { id: "7", p: 0.7, cat: "tine", total: 1.9, acum: T0 + 3600000 });
  assert.equal(j.length, 1); assert.equal(j[0].p, 0.6); assert.equal(j[0].z, "2026-10-15"); assert.equal(j[0].y, null);
  j = noteazaMc(j, { id: "7", p: 0.5, cat: "tine", total: 2, acum: T0 + ZI }); assert.equal(j.length, 2);
  assert.equal(noteazaMc(j, { id: "8", p: null, cat: "tine", total: 1, acum: T0 }).length, 2); assert.equal(noteazaMc(j, { id: "8", p: 0.5, cat: "tine", total: null, acum: T0 }).length, 2);
  let mare = []; for (let i = 0; i < 900; i++) mare = noteazaMc(mare, { id: String(i), p: 0.5, cat: "tine", total: 0, acum: T0 }); assert.equal(mare.length, 800);
});
await test("judecaMc: după 7 zile (cel mult 9), botul activ e pe plus FAȚĂ DE ATUNCI ⇒ y = 1, altfel 0; mai devreme nu se judecă; peste 9 ⇒ expirat", () => {
  const j = noteazaMc(noteazaMc([], { id: "7", p: 0.6, cat: "tine", total: 1.5, acum: T0 }), { id: "9", p: 0.3, cat: "opreste", total: 4, acum: T0 });
  const devreme = judecaMc(j, new Map([["7", 3], ["9", 1]]), T0 + 6 * ZI); assert.ok(devreme.every((e) => e.y === null));
  const r = judecaMc(j, new Map([["7", 3], ["9", 1]]), T0 + 7 * ZI + 1);
  assert.equal(r.find((e) => e.id === "7").y, 1); assert.equal(r.find((e) => e.id === "9").y, 0); assert.equal(r.find((e) => e.id === "7").totalDupa, 3);
  assert.equal(judecaMc(j, new Map([["7", 1.5]]), T0 + 8 * ZI).find((e) => e.id === "7").y, 0, "pe loc = nu pe plus");
  const tarziu = judecaMc(j, new Map([["7", 3]]), T0 + 10 * ZI).find((e) => e.id === "7"); assert.equal(tarziu.y, null); assert.equal(tarziu.expirat, true, "peste 9 zile (colectorul oprit) ⇒ expirat, nu judecat pe altă fereastră");
});
await test("judecaMcLaInchidere: botul închis înainte de 7 zile se judecă pe totalul final; intrările de după închidere nu", () => {
  const j = noteazaMc([], { id: "7", p: 0.8, cat: "tine", total: 2, acum: T0 });
  const r = judecaMcLaInchidere(j, "7", 1.2, T0 + 2 * ZI); assert.equal(r[0].y, 0); assert.equal(r[0].laInchidere, true);
  assert.equal(judecaMcLaInchidere(j, "7", 5, T0 - ZI)[0].y, null, "închis înainte de verdict ⇒ nu se judecă");
});
await test("raportMc: sub 30 judecate ⇒ „puține”; peste: Brier, rata de bază, cutiile, câte zile; calibrat perfect ⇒ Brier sub aruncarea de ban", () => {
  assert.equal(raportMc([]).stare, "putine");
  const j = []; for (let i = 0; i < 60; i++) { const p = i < 30 ? 0.8 : 0.2; j.push({ id: String(i), z: "2026-10-" + String(1 + (i % 10)).padStart(2, "0"), t: T0, p, cat: "tine", total: 0, y: i < 30 ? (i % 5 === 0 ? 0 : 1) : (i % 5 === 0 ? 1 : 0) }); }
  const r = raportMc(j);
  assert.equal(r.stare, "testat"); assert.equal(r.n, 60); assert.equal(r.zile, 10);
  assert.ok(Math.abs(r.brier - (0.8 * 0.04 + 0.2 * 0.64)) < 1e-9, "Brier = 0,8·0,04 + 0,2·0,64 = 0,16: " + r.brier);
  assert.ok(Math.abs(r.baza - 0.5) < 1e-9); assert.ok(Math.abs(r.brierBan - 0.25) < 1e-9); assert.ok(Math.abs(r.brierBaza - 0.25) < 1e-9);
  const sus = r.cutii.find((c) => c.de === 0.6), jos = r.cutii.find((c) => c.de === 0);
  assert.equal(sus.n, 30); assert.ok(Math.abs(sus.rata - 0.8) < 1e-9); assert.equal(jos.n, 30); assert.ok(Math.abs(jos.rata - 0.2) < 1e-9);
});
await test("pagina: textul calibrării (GridSim.textCalibrareMc) — puține ⇒ „N din 30”; testat ⇒ Brier față de 0,25 și cutia de sus, Brier ×100 și procentele cu o zecimală", () => {
  const c = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo }; c.window = c; vm.createContext(c);
  for (const f of ["grid-calcul.js", "grid-proba.js", "monte-simbol.js", "grid-sim.js"]) vm.runInContext(citeste("public", "lib", f), c, { filename: f });
  assert.match(c.GridSim.textCalibrareMc({ stare: "putine", n: 4 }), /4 din 30 de verdicte judecate/);
  const t = c.GridSim.textCalibrareMc({ stare: "testat", n: 60, zile: 10, brier: 0.16, brierBan: 0.25, brierBaza: 0.25, baza: 0.5, cutii: [{ de: 0, la: 0.4, n: 30, pMed: 0.2, rata: 0.2 }, { de: 0.4, la: 0.6, n: 0, pMed: null, rata: null }, { de: 0.6, la: 1, n: 30, pMed: 0.8, rata: 0.8 }] });
  assert.match(t, /60 de verdicte judecate pe 10 zile/); assert.match(t, /Brier 16,0 \(aruncarea de ban: 25,0; mai mic = mai bine\)/); assert.match(t, /când zicea peste 60%: pe plus în 80,0% \(30\)/);
  assert.equal(c.GridSim.textCalibrareMc(null), "");
});
await test("legarea: colectorul notează / judecă / trimite raportul; serverul îl păstrează (`calibrare`); Tabloul îl pune în nota Monte Carlo", () => {
  const col = citeste("scripts", "colector.mjs"), srv = citeste("functions", "api", "istoric-bot.js"), app = citeste("public", "app.js");
  assert.match(col, /noteazaMc\(/); assert.match(col, /judecaMc\(/); assert.match(col, /judecaMcLaInchidere\(/); assert.match(col, /tineRitm\("mcCalibrare"/);
  assert.match(col, /action=mcVerdict", \{ la: Date\.now\(\), boti: st\.boti, calibrare: /);
  assert.match(srv, /calibrare:/); assert.match(app, /GridSim\.textCalibrareMc\(/);
});
await test("versiunile: v100.201, colectorul v101.118, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  assert.equal(JSON.parse(citeste("package.json")).version, "100.201.0"); assert.match(citeste("public", "sw.js"), /^const CACHE="crypto-radar-v100-201";/);
  assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100.201"); assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.201"/);
  assert.equal((idx.match(/v100\.201/g) || []).length, 4);
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.118"/);
  assert.match(citeste("package.json"), /npm run test:v100200 && npm run test:v100201/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
