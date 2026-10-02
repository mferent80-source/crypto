// Proba v100.37 (30.09, el: „fa idei” - ideea 1 din trei): in fereastra Grid, langa codul fisei pentru TradingView, avertisment cand pe
// moneda aceea RULEAZA un bot cu alt grid (cazul CRV: fisa propunea 0,3822–0,4307 / 5 grile, botul avea 0,3755–0,423 / 8 grile) -
// „liniile din TV nu vor fi ale botului” + butonul cu codul BOTULUI; cand gridul e acelasi, o spune.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import "./lib/text-ro-global.mjs";   // v100.76: fișa scrie grilele prin TextRo.cate („8 grile”, „47 de grile”), ca în pagină

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
function functia(src, nume) { let i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipseste " + nume); let a = src.indexOf("{", i), k = 0, j = a; for (; j < src.length; j++) { if (src[j] === "{") k++; else if (src[j] === "}" && --k === 0) break; } return src.slice(i, j + 1); }
console.log("\nV100.37 · avertisment: codul fisei nu e gridul botului · proba\n");
// botul INVENTAT, cu forma rutei bot-orders (normalizat + .brut)
const bot = { id: "7", baza: "CRV.PERP", quote: "USDT", simbolPionex: "CRV_USDT_PERP", activ: true, directie: "long", levier: 5, gridJos: 0.3755, gridSus: 0.423, investit: 100, brut: { buOrderData: { row: 8, gridType: "geometric" } } };
const propunere = { dir: "long", jos: 0.3822, sus: 0.4307, grile: 5, levier: 5 };

await test("gridDiferitDeBot: alt interval sau alt numar de grile -> gridul botului + codul lui pentru TV (cu tipul)", () => {
  const d = TE.gridDiferitDeBot(propunere, bot);
  assert.ok(d); assert.equal(d.jos, 0.3755); assert.equal(d.sus, 0.423); assert.equal(d.grile, 8); assert.equal(d.tip, "geometric");
  assert.match(d.cod, /^long;0\.3755;0\.423;8;5;/); assert.equal(d.cod.split(";")[10], "geometric");
});
await test("gridDiferitDeBot: acelasi grid (in 0,2%) -> {acelasi: true}; fara bot / bot oprit -> null", () => {
  // v100.38: setarea are N intervale; botul cu row 8 (linii Pionex) are 7 intervale
  assert.deepEqual(TE.gridDiferitDeBot({ jos: 0.37555, sus: 0.4231, grile: 7 }, bot).acelasi, true);
  assert.notEqual(TE.gridDiferitDeBot({ jos: 0.3755, sus: 0.423, grile: 8 }, bot).acelasi, true);
  // aceleasi grile, dar intervalul mutat cu ~1% -> alte linii (peste pragul de 0,2%)
  assert.equal(TE.gridDiferitDeBot({ jos: 0.3793, sus: 0.4272, grile: 7 }, bot).acelasi, false);
  assert.equal(TE.gridDiferitDeBot(propunere, null), null);
  assert.equal(TE.gridDiferitDeBot(propunere, Object.assign({}, bot, { activ: false })), null);
});

await test("pagina: sub codul fisei, pentru moneda cu bot care ruleaza - avertismentul + „Copiază codul botului”; acelasi grid -> „e chiar gridul botului”", () => {
  const ctx = { TextRo: globalThis.TextRo, TabloExtra: TE, TabloBot: { simboluri: (b, q, s) => ({ pionex: s }) }, escapeHtml: (s) => String(s), tbPretScurt: (x) => String(x), tbStare: { boti: [bot] } };
  vm.createContext(ctx); vm.runInContext(functia(app, "grBotPeMoneda") + functia(app, "grTvAvertHtml") + ";this.f=grTvAvertHtml;", ctx);
  const h = ctx.f("CRV_USDT_PERP", propunere);
  assert.match(h, /rulează botul tău cu alt grid/); assert.match(h, /0\.3755 – 0\.423, 8 grile/); assert.match(h, /nu vor fi ale botului/);
  assert.match(h, /data-action-click="gridCopiaza\(this\.value\)">Copiază codul botului/); assert.match(h, /value="long;0\.3755;0\.423;8;5;/);
  assert.match(ctx.f("CRV_USDT_PERP", { jos: 0.3755, sus: 0.423, grile: 7 }), /e chiar gridul botului/);   // v100.38: 7 intervale = 8 grile Pionex
  assert.equal(ctx.f("BTC_USDT_PERP", propunere), "", "fara bot pe moneda: nimic");
  assert.match(functia(app, "renderGrid"), /grTvAvertHtml\(f\.simbol,st\)/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
