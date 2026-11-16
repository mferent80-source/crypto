// Proba v100.347 (16.11.2026, el: „CONTINUA” după livrarea v100.346 ⇒ revizia independentă a v100.346, constatări verificate pe cod):
//   🔴1 pragul de 26 de ferestre era imposibil (notările monedelor țin 150 z, ale acțiunilor 120 z, barele sectoarelor 2 ani) și verdictul nu era
//       înghețat (se recalcula din date care alunecă) ⇒ REGISTRU de ferestre pe disc, care doar crește; verdictul se scrie la a 26-a și rămâne;
//   🔴2 urmarireSectoare O(n²) cu toISOString (60 de notări ≈ 19 s sincron) ⇒ hărți zi → index, o dată pe simbol;
//   🔴3 sectoare părtinitoare: firma ieșită din universul de azi ⇒ sectorul zilei sărit, „în așteptare” pe veci ⇒ membrii salvați la notare,
//       barele aduse și pentru cei ieșiți, lipsa lor ⇒ „nejudecat”;
//   🟡4 reperul lipsă ⇒ vf 0 (registrul păstrează ferestrele), textul cu un singur număr de ferestre;
//   🟡5 pagina „0 DIN 26” cu colectorul vechi ⇒ fără vf nicăieri, eticheta veche (cum promitea comentariul);
//   🟡6 sectoare: intrarea la deschiderea de după ziua clasării (tura e dimineața următoare), nu la închiderea ei;
//   🟡7 spark doar la primii 40 lichizi după scor (corpul clasamentului rămâne mic); 🔵 textul 600; „în așteptare” spus; fereastra sectoarelor 32 z.
//   node scripts/proba-v100347.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const ZI = 86400000;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.347 · reparațiile reviziei v100.346 · proba\n");
const VF = await import("./lib/verdict-ferestre.mjs");

await test("🔑 🔴1 registrul: doar crește, nu depinde de cât se păstrează datele; verdictul scris la a 26-a rămâne", () => {
  assert.equal(typeof VF.registruFerestre, "function");
  let reg = null; const L = 7 * ZI, bun = (i) => 0.02 + (i % 2 ? 0.01 : -0.01);
  // 300 de zile, dar datele de la fiecare tură țin doar ultimele 150 (ca ruta) - registrul strânge totuși peste 26
  for (let zi = 0; zi < 300; zi += 1) {
    const zile = []; for (let k = Math.max(0, zi - 150); k <= zi; k++) zile.push({ t: k * ZI, e: bun(k / 7 | 0) });
    const r = VF.registruFerestre(reg, zile, L); reg = r.reg;
  }
  assert.ok(reg.f.length >= 40, "ferestre: " + reg.f.length); assert.equal(reg.verdict.v, "mai bine"); const la = reg.verdict.la;
  // după 26, ferestre proaste nu schimbă verdictul; ferestrele vechi nu se rescriu
  const f0 = reg.f.slice(0, 26).map((x) => x.t).join();
  for (let zi = 300; zi < 700; zi++) { const r = VF.registruFerestre(reg, [{ t: zi * ZI, e: -0.2 }], L); reg = r.reg; }
  const r = VF.registruFerestre(reg, [], L);
  assert.equal(r.vf.verdict, "mai bine"); assert.equal(reg.verdict.la, la); assert.equal(reg.f.slice(0, 26).map((x) => x.t).join(), f0); assert.ok(r.vf.medie < 0, "cifrele merg mai departe");
  // o zi mai veche decât ultima fereastră (judecată târziu) nu intră; altă lungime de fereastră ⇒ registru nou
  const n0 = reg.f.length; assert.equal(VF.registruFerestre(reg, [{ t: 5 * ZI, e: 1 }], L).reg.f.length, n0);
  assert.equal(VF.registruFerestre(reg, [{ t: 0, e: 1 }], 14 * ZI).reg.f.length, 1);
});
await test("🔴1 urmarireFixa / urmarireRevine folosesc registrul primit și îl dau înapoi (laRegistru); fără registru, ca înainte", async () => {
  const { urmarireFixa } = await import("./lib/tura-sugestii.mjs"), { urmarireRevine } = await import("./lib/tura-sugestii-actiuni.mjs");
  const acum = Date.UTC(2026, 10, 30, 12), b = (s) => Array.from({ length: 80 * 6 }, (_, i) => ({ t: Date.UTC(2026, 9, 1) + i * 4 * 3600000, c: s === "A" ? 100 + i * 0.1 : 100 }));
  const ist = [{ zi: "2026-10-10", simbol: "A", lista: "porn", dir: "long" }, { zi: "2026-10-20", simbol: "A", lista: "porn", dir: "long" }];
  const vechi = { L: 7 * ZI, f: Array.from({ length: 10 }, (_, i) => ({ t: Date.UTC(2026, 6, 1) + i * 7 * ZI, e: 0.01 })), verdict: null };
  let nou = null; const u = urmarireFixa(ist, { zile: 7, acum, bare1h: b, toate: ["A", "B"], cost: 0, registru: vechi, laRegistru: (r) => { nou = r; } });
  assert.equal(u.vf.ferestre, 12); assert.equal(nou.f.length, 12); assert.equal(u.ferestre, 12, "un singur număr de ferestre în text"); assert.match(u.text, /12 ferestre din 26/);
  const zile = Array.from({ length: 80 }, (_, i) => Date.UTC(2026, 8, 1 + i, 14)), bb = zile.map((t, i) => ({ t, o: 100 + i, h: 101 + i, l: 99 + i, c: 100 + i }));
  const istR = [{ zi: "2026-09-02", piata: "us", lista: "revine", ticker: "A_US_EQ", tBara: zile[1] }];
  // 🟡4: reperul lipsă azi ⇒ registrul vechi rămâne (nu 0)
  let nouR = null; const uR = urmarireRevine(istR, { A_US_EQ: bb }, { us: null }, zile[79], { piata: "us", registru: { L: 14 * ZI, f: [{ t: zile[0] - 30 * ZI, e: 0.01 }], verdict: null }, laRegistru: (r) => { nouR = r; } });
  assert.equal(uR.vf.ferestre, 1); assert.equal(nouR.f.length, 1);
  assert.equal(urmarireFixa(ist, { zile: 7, acum, bare1h: b, toate: ["A", "B"], cost: 0 }).vf.ferestre, 2);
});
await test("🔴1 colectorul ține registrele pe disc și le dă celor trei ture (porn2, revUS / revEU, sect)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /verdict-registre\.json/); assert.ok((c.match(/registru: registruVf/g) || []).length >= 3, "turele monede, acțiuni, sectoare");
  assert.match(citeste("scripts", "lib", "tura-sugestii.mjs"), /registruPe\(d, "porn2"\)/);
  assert.match(citeste("scripts", "lib", "tura-sugestii-actiuni.mjs"), /registruPe\(d, "revUS"\)/); assert.match(citeste("scripts", "lib", "tura-sugestii-actiuni.mjs"), /registruPe\(d, "revEU"\)/);
  assert.match(citeste("scripts", "lib", "tura-sectoare.mjs"), /registruPe\(d, "sect"\)/);
});
await test("🔑 🔴2 urmarireSectoare: 60 de notări × 11 sectoare × 25 de firme × 500 de bare sub 1 s", async () => {
  const { urmarireSectoare } = await import("./lib/tura-sectoare.mjs");
  const T = Array.from({ length: 500 }, (_, i) => Date.UTC(2025, 0, 1) + i * ZI), bare = {}, univ = [], urm = [];
  for (let s = 0; s < 11; s++) for (let k = 0; k < 25; k++) { const x = "S" + s + "_" + k; bare[x] = T.map((t, i) => ({ t, o: 100 + i * (k % 3), c: 100 + i * (k % 3) })); univ.push({ s: x, sector: "Sec" + s }); }
  for (let n = 0; n < 60; n++) { const tb = T[400 + n], top = {}, mem = {}; for (let s = 0; s < 11; s++) { top["Sec" + s] = ["S" + s + "_0", "S" + s + "_1", "S" + s + "_2"]; mem["Sec" + s] = Array.from({ length: 25 }, (_, k) => "S" + s + "_" + k); } urm.push({ tb, top, mem }); }
  const t0 = Date.now(); const u = urmarireSectoare(urm, bare, univ, T[499]); const ms = Date.now() - t0;
  assert.ok(ms < 1000, ms + " ms"); assert.ok(u.zile > 0);
});
await test("🔑 🔴3 + 🟡6 sectoare: membrii de la notare, firma fără bare ⇒ nejudecat (nu „în așteptare”), intrarea la deschiderea următoare", async () => {
  const { urmarireSectoare } = await import("./lib/tura-sectoare.mjs");
  const T = Array.from({ length: 70 }, (_, i) => Date.UTC(2026, 6, 1) + i * ZI), ser = (f) => T.map((t, i) => ({ t, o: f(i) + 0.5, c: f(i) }));
  const bare = { A: ser((i) => 100 + i), B: ser(() => 100), C: ser(() => 100), D: ser(() => 100), E: ser(() => 100) };
  const mem = { Tech: ["A", "B", "C", "D", "E"] }, univAzi = [{ s: "B", sector: "Tech" }];   // azi în univers doar B: media vine din membrii notării
  const u = urmarireSectoare([{ tb: T[0], top: { Tech: ["A"] }, mem }], bare, univAzi, T[69]);
  assert.equal(u.zile, 1); assert.equal(u.inAsteptare, 0);
  // intrarea: deschiderea zilei T[1] (100+1+0,5), ieșirea: închiderea T[21] (100+21) ⇒ A: 121/101,5 − 1; ceilalți 100/100,5 − 1
  const ra = 121 / 101.5 - 1, rm = (ra + 4 * (100 / 100.5 - 1)) / 5; assert.ok(Math.abs(u.exces - (ra - 0.003 - rm)) < 1e-9, u.exces + " vs " + (ra - 0.003 - rm));
  const u2 = urmarireSectoare([{ tb: T[0], top: { Tech: ["Z"] }, mem }], bare, univAzi, T[69]);
  assert.equal(u2.zile, 0); assert.equal(u2.inAsteptare, 0); assert.equal(u2.nejudecate, 1);
  const u3 = urmarireSectoare([{ tb: T[60], top: { Tech: ["A"] }, mem }], bare, univAzi, T[69]); assert.equal(u3.inAsteptare, 1);
  const s = citeste("scripts", "lib", "tura-sectoare.mjs");
  assert.match(s, /mem: Object\.fromEntries/); assert.match(s, /lipsa\.length/); assert.match(s, /32 \* 86400000|32 \* ZI/);
});
await test("🟡5 pagina: fără vf nicăieri (colectorul vechi) ⇒ eticheta veche; cu colectorul nou și lista neîncepută ⇒ 0 din 26", () => {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugVerdictEt = sugVerdictEt; this.sugSectUrm = sugSectUrm;", ctx);
  assert.deepEqual([...ctx.sugVerdictEt("porn", { sugMonede: { sugestii: { urmarire: { porn: { n: 9, text: "x" } } } } })], ["N-AM AFLAT", "v"]);
  assert.deepEqual([...ctx.sugVerdictEt("porn", { sugMonede: { sugestii: { urmarire: { pornScor: { n: 9, vf: { ferestre: 3, verdict: "prea devreme" } } } } } })], ["PREA DEVREME · 0 DIN 26", "p"]);
  assert.deepEqual([...ctx.sugVerdictEt("revUS", { sugActiuni: { sugestii: { urmarire: { us: { revine: { n: 2 } } } } } })], ["N-AM AFLAT", "v"]);
  assert.deepEqual([...ctx.sugVerdictEt("revEU", { sugActiuni: { sugestii: { urmarire: { us: { revine: { n: 2, vf: { ferestre: 1, verdict: "prea devreme" } } }, eu: { revine: { n: 0 } } } } } })], ["PREA DEVREME · 0 DIN 26", "p"]);
  assert.deepEqual([...ctx.sugVerdictEt("sect", { sectoare: { sectoare: [] } })], ["N-AM AFLAT", "v"]);
  assert.match(ctx.sugSectUrm({ urmarire: { zile: 0, inAsteptare: 3, vf: { ferestre: 0 } } }), /3 zile notate, judecate la 21 de zile de bursă/);
});
await test("🟡7 spark doar la primii 40 lichizi după scor; 🔵 ruta ține textul urmăririi până la 600 de semne", () => {
  const s = citeste("scripts", "lib", "tura-clasament.mjs"); assert.match(s, /FUND_TOP/); assert.match(s, /delete m\.spark/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /text:typeof x\.text==="string"\?x\.text\.slice\(0,600\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
