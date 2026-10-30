// Proba v100.278 (30.10, poza de telefon a lui v100.277): o citire picată a boților închiși lăsa lista goală, iar „Boții tăi” scria
// „Niciun bot închis azi / în 7 zile” - fals. Acum lista citită (`inchiseOk`) se deosebește de cea picată; picată ⇒ spus pe față,
// reîncercat în 30 s. Simulez contTotAsigura cu jtAduBoti care pică / reușește și desenez cardul.
//   node scripts/proba-v100278.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(lib("acasa.js"), ctx);
const AC = ctx.Acasa;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 900)}`); }); }
console.log("\nV100.278 · PICAT ≠ ZERO · proba\n");
const ae = lib("acasa-ecran.js"), te = lib("t212-ecran.js");
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const card = new Function("Acasa", "escapeHtml", "acCate", ae.slice(ae.indexOf("function acUsd("), ae.indexOf("function acasaDeseneaza() {")) + "; return { acBotiStatHtml };")(AC, esc, (n, s, p) => globalThis.TextRo.cate(n, s, p));
const text = (h) => h.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").replace(/\u00a0/g, " ");   /* v100.279: spațiu care nu se rupe între sumă și „USDT” */
// argumentul din card, exact cum îl calculează acasaDeseneaza
const argCard = new Function("contTot", "return " + ae.match(/hb \+= acBotiStatHtml\(([^;]+), Date\.now\(\)\);/)[1] + ";");

// blocul din contTotAsigura, rulat cu un jtAduBoti fals
const bloc = te.slice(te.indexOf("    if ((!contTot.inchise || Date.now() - (contTot.inchiseLa"), te.indexOf("    if (Date.now() - contTot.clasamentLa"));
const ruleaza = new Function("contTot", "JurnalTrade", "jtAduBoti", "return (async () => {\n" + bloc + "\n})();");
const JT = { din: (b) => b.map((x) => ({ id: x.id, moneda: "PARTI", dir: "long", levier: 3, pornit: Date.now() - 600000, inchis: Date.now() - 60000, net: x.net })), alte: () => [] };

await test("citirea picată la prima încercare ⇒ cardul spune că n-a putut, nu „niciun bot”; reîncercare în 30 s", async () => {
  const ct = { inchise: null };
  await ruleaza(ct, JT, async () => null);
  assert.deepEqual(ct.inchise, []); assert.ok(!ct.inchiseOk);
  const peste = ct.inchiseLa + 5 * 60000 - Date.now();
  assert.ok(peste > 25000 && peste <= 30000, "reîncercare în ~30 s: " + peste);
  const h = text(card.acBotiStatHtml(argCard(ct), Date.now()));
  assert.equal(h, "|N-am putut aduce boții închiși; reîncerc în 30 de secunde.|");
  // și cu excepție
  const ct2 = { inchise: null };
  await ruleaza(ct2, JT, async () => { throw new Error("429"); });
  assert.equal(argCard(ct2), false);
});

await test("citirea reușită ⇒ lista și „Azi”; o picare ulterioară păstrează lista citită (nu trece pe „n-a putut”)", async () => {
  const ct = { inchise: null };
  await ruleaza(ct, JT, async () => [{ id: "1", net: 21.8 }, { id: "2", net: -24.8 }]);
  assert.equal(ct.inchiseOk, true); assert.equal(ct.inchise.length, 2);
  assert.match(text(card.acBotiStatHtml(argCard(ct), Date.now())), /\|Azi\|2 boți închiși · 1 pe plus, 1 pe minus\|−3,0 USDT\|/);
  ct.inchiseLa = 0;
  await ruleaza(ct, JT, async () => null);
  assert.equal(ct.inchise.length, 2); assert.equal(ct.inchiseOk, true);
  assert.match(text(card.acBotiStatHtml(argCard(ct), Date.now())), /\|Azi\|2 boți închiși/);
});

await test("încă necitită ⇒ „Aduc…”; ultimul închis doar din lista citită", () => {
  assert.equal(argCard({ inchise: null }), null);
  assert.equal(text(card.acBotiStatHtml(argCard({ inchise: null }), Date.now())), "|Aduc boții închiși…|");
  assert.match(ae, /acUltimInchis\(typeof contTot !== "undefined" && contTot\.inchiseOk \?/);
});

// v100.279: de la v100.278 în sus (ca probele vechi), nu exact
await test("versiunea de la v100.278", () => {
  const app = Number(citeste("functions", "_shared", "versiune.js").match(/VERSIUNE = "v100\.(\d+)"/)[1]);
  assert.ok(app >= 278, String(app));
  assert.match(citeste("public", "index.html"), new RegExp('id="healthAppVersion">v100\\.' + app + "<"));
  assert.match(citeste("public", "sw.js"), new RegExp("crypto-radar-v100-" + app));
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
