// Proba v100.207 / colector v101.123 (16.10.2026, auditul Busolei, ideea 7 „om mort”): măsurarea Busolei picată (PC oprit, wrangler
// agățat, login expirat) nu anunța pe nimeni — nota „rezumatul are N ore” era `doarRadar` și pragul fix 4,5 h (ziua Busola măsoară
// din oră în oră). Acum: pragul urmează programul Busolei (1 h ziua 08–23 RO, 4 h noaptea, + 50 min), iar nota pleacă pe Discord
// o dată pe rezumat, „critic” peste 3 h ziua.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as P from "./lib/paza-boti.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\nv100.207 · omul mort al măsurării Busolei · proba\n");
const ctx = Object.assign({ console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo }); vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "busola.js"), ctx);
const B = ctx.Busola, H = 3600000;
const ZIUA = Date.UTC(2026, 9, 16, 8, 5), NOAPTEA = Date.UTC(2026, 9, 15, 23, 5);   // 11:05 RO · 02:05 RO (vara, UTC+3)
const REZ = (la) => ({ la, monede: {}, grid: {}, perp: {} });

await test("pragul programului Busolei: ziua 1 h + 50 min, noaptea 4 h + 50 min", () => {
  assert.equal(B.pragVechime(ZIUA), H + 50 * 60000); assert.equal(B.pragVechime(NOAPTEA), 4 * H + 50 * 60000);
});
await test("ziua: rezumat de 1,5 h ⇒ nimic; de 2 h ⇒ nota pleacă pe DISCORD (nu doar în Radar)", () => {
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(ZIUA), acum: ZIUA + 1.5 * H, anuntat: null }), null);
  const n = P.notaVeche({ Busola: B, rez: REZ(ZIUA), acum: ZIUA + 2 * H, anuntat: null });
  assert.ok(n); assert.equal(n.doarRadar, false); assert.match(n.titlu, /Busola n-a mai măsurat de 2 ore/); assert.match(n.mesaj, /PC-ul|wrangler|login/);
});
await test("noaptea: rezumat de 3 h ⇒ nimic (înainte: 4,5 h fix nu anunța nici ziua)", () => {
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(NOAPTEA), acum: NOAPTEA + 3 * H, anuntat: null }), null);
  assert.ok(P.notaVeche({ Busola: B, rez: REZ(NOAPTEA), acum: NOAPTEA + 5 * H, anuntat: null }));
});
await test("o dată pe rezumat (anuntat = la ⇒ tăcere); peste 3 h ziua ⇒ nivel critic", () => {
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(ZIUA), acum: ZIUA + 2 * H, anuntat: ZIUA }), null);
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(ZIUA), acum: ZIUA + 2 * H, anuntat: null }).nivel, "atentie");
  assert.equal(P.notaVeche({ Busola: B, rez: REZ(ZIUA), acum: ZIUA + 4 * H, anuntat: null }).nivel, "critic");
});
await test("paza boților folosește același prag (pazaStare.vechi), nu 4,5 h fixe", () => {
  assert.equal(B.pazaStare(REZ(ZIUA), "MET_USDT_PERP", ZIUA + 2 * H).vechi, true, "ziua, 2 h = vechi");
  assert.equal(B.pazaStare(REZ(NOAPTEA), "MET_USDT_PERP", NOAPTEA + 3 * H).vechi, false, "noaptea, 3 h = nu e vechi");
});
await test("versiunile: v100.207, colectorul v101.123, proba în lanțul `test`", () => {
  const idx = citeste("public", "index.html");
  const ver = Number(JSON.parse(citeste("package.json")).version.split(".")[1]); assert.ok(ver >= 207);   /* v100.208: ≥, nu egal */
  assert.match(citeste("public", "sw.js"), new RegExp('^const CACHE="crypto-radar-v100-' + ver + '";')); assert.equal(JSON.parse(citeste("BUILD_INFO.json")).version, "v100." + ver);
  assert.match(citeste("functions", "_shared", "versiune.js"), new RegExp('VERSIUNE = "v100\\.' + ver + '"'));
  assert.equal((idx.match(new RegExp("v100\\." + ver, "g")) || []).length, 4); assert.ok(!/v100\.206\b/.test(idx));
  assert.match(citeste("scripts", "colector.mjs"), /const VERSIUNE_COLECTOR = "v101\.123"/);
  assert.match(citeste("package.json"), /npm run test:v100206 && npm run test:v100207/);
});
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
