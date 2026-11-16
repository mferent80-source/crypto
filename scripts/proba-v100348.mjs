// Proba v100.348 (16.11.2026, el: „CONTINUA” după v100.347 ⇒ a doua revizie independentă, constatări verificate pe cod):
//   🟡1 registrul îngheța o zi judecată PARȚIAL (un ticker EU în așteptare din cauza unei sărbători, o cerere de bare picată ⇒ un sector scos) ⇒
//       o zi intră doar „gata” (nimic în așteptare); registrul se OPREȘTE la prima zi negata (nu sare peste ea - n-ar fi o selecție după date);
//       ce rămâne în așteptare prea mult (acțiuni 30 z, sectoare 45 z) devine lipsă definitivă;
//   🟡2 fișierul registrului stricat se golea în tăcere și se suprascria ⇒ păstrat `.stricat-<t>`, citit `.bak`, scris cu fsync + `.bak`;
//   🔵3 firmă din top delistată ⇒ „în așteptare” pe veci ⇒ după 45 z lipsă definitivă; 🔵4 sectoare toate nejudecate ⇒ text propriu;
//   + proba gridului: verdictul înghețat în starea turei (după ~400 de zile primele zile ies din `judecate`).
//   node scripts/proba-v100348.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ZI = 86400000;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.348 · a doua revizie: zile gata, registrul sigur, proba gridului înghețată · proba\n");
const { registruFerestre } = await import("./lib/verdict-ferestre.mjs");

await test("🔑 🟡1 registrul se oprește la prima zi negata (nu sare peste ea); când se completează, intră toate", () => {
  const L = 7 * ZI;
  const r1 = registruFerestre(null, [{ t: 0, e: 0.01 }, { t: 7 * ZI, gata: false }, { t: 14 * ZI, e: 0.03 }], L);
  assert.equal(r1.reg.f.length, 1, "ziua 14 nu sare peste ziua 7, încă negata");
  const r2 = registruFerestre(r1.reg, [{ t: 7 * ZI, e: 0.02 }, { t: 14 * ZI, e: 0.03 }], L);
  assert.deepEqual(r2.reg.f.map((x) => x.e), [0.01, 0.02, 0.03]);
  // o zi negata care oricum n-ar fi fereastră (prea aproape de precedenta) nu oprește nimic
  const r3 = registruFerestre(null, [{ t: 0, e: 0.01 }, { t: 3 * ZI, gata: false }, { t: 7 * ZI, e: 0.02 }], L); assert.equal(r3.reg.f.length, 2);
});
await test("🔑 🟡1 acțiuni: ziua cu un ticker încă în așteptare nu intră; după 30 de zile tickerul rămas e „fără prețuri”, ziua intră", async () => {
  const { urmarireRevine } = await import("./lib/tura-sugestii-actiuni.mjs");
  const zile = Array.from({ length: 60 }, (_, i) => Date.UTC(2026, 8, 1 + i, 14)), bb = (k) => zile.slice(0, k).map((t, i) => ({ t, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));
  const q = zile.map((t) => ({ t, o: 100, h: 100, l: 100, c: 100 }));
  const ist = [{ zi: "2026-09-02", piata: "eu", lista: "revine", ticker: "A_EQ", tBara: zile[1] }, { zi: "2026-09-02", piata: "eu", lista: "revine", ticker: "B_EQ", tBara: zile[1] }];
  let reg = null; const u = urmarireRevine(ist, { A_EQ: bb(60), B_EQ: bb(8) }, { eu: q }, zile[20], { piata: "eu", registru: null, laRegistru: (r) => { reg = r; } });
  assert.equal(u.inAsteptare, 1); assert.equal(reg.f.length, 0, "ziua parțială nu intră");
  let reg2 = null; const u2 = urmarireRevine(ist, { A_EQ: bb(60), B_EQ: bb(8) }, { eu: q }, zile[1] + 40 * ZI, { piata: "eu", registru: reg, laRegistru: (r) => { reg2 = r; } });
  assert.equal(u2.inAsteptare, 0); assert.equal(u2.nejudecate, 1); assert.equal(reg2.f.length, 1);
});
await test("🔑 🟡1 + 🔵3 sectoare: membru sau firmă din top fără bare ⇒ ziua așteaptă (nu iese cu jumătate); după 45 de zile ⇒ lipsă definitivă", async () => {
  const { urmarireSectoare } = await import("./lib/tura-sectoare.mjs");
  const T = Array.from({ length: 70 }, (_, i) => Date.UTC(2026, 6, 1) + i * ZI), ser = (f, k) => T.slice(0, k || 70).map((t, i) => ({ t, o: f(i), c: f(i) }));
  const bare = { A: ser((i) => 100 + i), B: ser(() => 100), C: ser(() => 100), D: ser(() => 100), E: ser(() => 100), F: ser(() => 100), X: ser(() => 50, 10) };
  const mem = { Tech: ["A", "B", "C", "D", "E", "F", "LIPSA"] }, urm = [{ tb: T[0], top: { Tech: ["A"] }, mem }];
  let reg = null; const u = urmarireSectoare(urm, bare, [], T[30], { registru: null, laRegistru: (r) => { reg = r; } });
  assert.equal(u.zile, 0); assert.equal(u.inAsteptare, 1); assert.equal(reg.f.length, 0, "membrul fără bare, la 30 de zile: încă așteaptă");
  const u2 = urmarireSectoare(urm, bare, [], T[0] + 50 * ZI); assert.equal(u2.zile, 1); assert.equal(u2.inAsteptare, 0);
  // firma din top cu barele oprite (delistată): în așteptare până la 45 de zile, apoi sectorul nu se judecă ⇒ ziua „nejudecată”, nu pe veci
  const urmX = [{ tb: T[0], top: { Tech: ["X"] }, mem: { Tech: ["B", "C", "D", "E", "F"] } }];
  assert.equal(urmarireSectoare(urmX, bare, [], T[30]).inAsteptare, 1);
  const uX = urmarireSectoare(urmX, bare, [], T[0] + 50 * ZI); assert.equal(uX.inAsteptare, 0); assert.equal(uX.nejudecate, 1);
});
await test("🔑 🟡2 colectorul: registrul stricat se păstrează (.stricat-), se citește .bak, se scrie cu fsync și .bak", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /\.stricat-/); assert.match(c, /\.bak/); assert.match(c, /fsyncSync/); assert.match(c, /function scrieSigur\(/);
  assert.match(c, /registrul verdictelor STRICAT/);
});
await test("proba gridului: verdictul se îngheață în starea turei la prima apariție și se trimite pe el", () => {
  const s = citeste("scripts", "lib", "proba-grid.mjs");
  assert.match(s, /st\.verdictInghetat/); assert.match(s, /rezumat: rz/);
});
await test("🔵4 pagina: sectoarele cu notări toate nejudecate au textul lor", () => {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugSectUrm = sugSectUrm;", ctx);
  assert.match(ctx.sugSectUrm({ urmarire: { zile: 0, inAsteptare: 0, nejudecate: 4 } }), /4 zile notate fără prețuri/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
