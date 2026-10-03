// Proba v100.89 (03.10, el: „fa idei” după v100.88): (1) Acasă - moneda aflată în AMBELE liste ale Tabloului (pe revenire și la short,
// listele de 5) primește în rândul al doilea „⚠ Q e și pe revenire, și la short: aș sări peste ea”; (2) istoricul boților de pe rândurile
// Tabloului (candidații + listele noi) cu virgulă zecimală, dintr-un singur loc (tbIstoricBoti, TextRo.usdt): „−7,22 USDT”, nu „−7.22 USDT”.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.89 · Acasă: moneda din ambele liste ⇒ „aș sări peste ea” · Tabloul: istoricul boților cu virgulă zecimală");

const REV = (o) => ({ cadere: 0.62, deLaMin: 0.28, zileDeLaMin: 6, revine: true, ...o });
const SH = (s, scor, o) => ({ simbol: s + "_USDT_PERP", volum: 10, stare: "candidat", dir: "short", tarie: "mediu", scor, latime: 0.15, profitGrila: 0.0026, traversariZi: 20, revenire: REV({ revine: false }), ...o });
const CL = { la: 5, monede: [{ simbol: "AKE_USDT_PERP", volum: 90, stare: "evita", dir: "long", scor: 9, revenire: REV({ cadere: 0.79 }) }, SH("Q", 5, { volum: 30, revenire: REV() }), SH("LIT", 7)] };

// ---- (1) Acasă ----
function acasa2(d) {
  const ctx = { escapeHtml: esc, Idei: ID }; vm.createContext(ctx);
  vm.runInContext(fnDin("acasa-ecran.js", "acClasamentSumar") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2") + "\n" + fnDin("acasa-ecran.js", "acasaCumpar2Corp") + "\n;this.g=acasaCumpar2;", ctx);
  return ctx.g(d);
}
const II = { idei: { idei: { zi: "2026-10-03", judecate: 202, trecute: 0, actiuni: [], reveniri: [] } } };
await test("(1) Acasă: Q e și pe revenire, și la short ⇒ rândul al doilea se încheie cu „⚠ Q e și pe revenire, și la short: aș sări peste ea”, în culoarea de avertisment", () => {
  const h = acasa2({ ...II, clasament: CL, sugestii: null });
  assert.equal(text(h), "↩️ pe revenire: acțiunile nimic azi · monedele AKE, Q · 📉 short: LIT, Q · ⚠ Q e și pe revenire, și la short: aș sări peste ea");
  assert.match(h, /<span class="tbWarn">⚠ Q e și pe revenire, și la short: aș sări peste ea<\/span>/);
});
await test("(1) Acasă: două monede comune ⇒ „Q, ZZZ sunt … aș sări peste ele”; listele de 5 ale Tabloului (o monedă a 4-a la short, nearătată pe Acasă, tot se spune)", () => {
  const cl = { la: 5, monede: CL.monede.concat([SH("ZZZ", 1, { volum: 20, revenire: REV() }), SH("A1", 9), SH("A2", 8)]) };
  assert.ok(text(acasa2({ ...II, clasament: cl, sugestii: null })).endsWith(" · ⚠ Q, ZZZ sunt și pe revenire, și la short: aș sări peste ele"));
});
await test("(1) Acasă: fără monedă comună sau înainte de starea de revenire ⇒ fără notă (rândul de până acum)", () => {
  const fara = acasa2({ ...II, clasament: { la: 5, monede: CL.monede.filter((m) => m.simbol !== "Q_USDT_PERP") }, sugestii: null });
  assert.equal(text(fara), "↩️ pe revenire: acțiunile nimic azi · monedele AKE · 📉 short: LIT");
  const vechi = { la: 5, monede: [SH("Q", 5, { revenire: null }), SH("LIT", 7, { revenire: null })] };
  assert.ok(!/⚠/.test(acasa2({ ...II, clasament: vechi, sugestii: null })));
});

// ---- (2) istoricul cu virgulă ----
await test("(2) tbIstoricBoti: „istoricul tău: 5 boți, 3 pe plus, −7,22 USDT” / „1 bot, 1 pe plus, +2,00 USDT” / „17 boți, 10 pe plus, −173,55 USDT”; fără boți ⇒ „n-ai mai avut boți pe ea”", () => {
  const ctx = { TextRo: globalThis.TextRo }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbIstoricBoti") + "\n;this.f=tbIstoricBoti;", ctx);
  assert.equal(ctx.f({ n: 5, pePlus: 3, total: -7.22 }), "istoricul tău: 5 boți, 3 pe plus, −7,22 USDT");
  assert.equal(ctx.f({ n: 1, pePlus: 1, total: 2 }), "istoricul tău: 1 bot, 1 pe plus, +2,00 USDT");
  assert.equal(ctx.f({ n: 17, pePlus: 10, total: -173.55 }), "istoricul tău: 17 boți, 10 pe plus, −173,55 USDT");
  assert.equal(ctx.f({ n: 0, pePlus: 0, total: 0 }), "n-ai mai avut boți pe ea"); assert.equal(ctx.f(null), "n-ai mai avut boți pe ea");
});
await test("(2) Tabloul, candidații („Pe ce aș porni un bot acum”): rândul randat scrie „−121,18 USDT”, nu „−121.18”", () => {
  const box = { innerHTML: "" }, cl = { la: 5, monede: [{ simbol: "VVV_USDT_PERP", volum: 50, stare: "candidat", dir: "long", tarie: "mediu", scor: 7, latime: 0.1633, profitGrila: 0.0026, traversariZi: 28 }] };
  const ctx = { Idei: ID, GridCalcul: G, escapeHtml: esc, TextRo: globalThis.TextRo, contTot: { clasament: cl, inchise: [{ moneda: "VVV", rezultat: -100.5 }, { moneda: "VVV", rezultat: -20.68 }] },
    tbIngustAdu: () => {}, tbUrmAdu: () => {}, tbUrm: { v: null }, tbSugestiiHtml: () => "", $: (id) => (id === "tbIdei" ? box : null) };
  vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "tbIstoricBoti") + "\n" + fnDin("t212-ecran.js", "tbIdeiRender") + "\n;tbIdeiRender();", ctx);
  const t = text(box.innerHTML);
  assert.ok(t.includes("VVV interval 16,33%") && t.includes("istoricul tău: 2 boți, 0 pe plus, −121,18 USDT") && !t.includes("121.18"), t);
});

console.log("\n" + (pica ? "V100.89 PICA · " + pica + " din " + (ok + pica) : "V100.89 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
