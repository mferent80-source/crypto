// Proba v100.77 - ideile din raportul ideilor (el, 02.10: „fa idei”): (1) pragul de ore la aceeași precizie pe Tablou și în alertă
// (TextRo.oreN: „1 oră”, „24 de ore”, „2,25 ore”); (2) nota cu numele botului pe rândul ei în poarta fișei; (3) autopsia acțiunilor T212
// cu rânduri ≤ 160, rupte la granița de sens, fără nimic tăiat - și sub gardă.
//   node scripts/proba-v10077.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea modulelor
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica } from "./garda-texte.mjs";   // incarca modulele (Alerte, Obiceiuri, Consiliu, JurnalTrade…)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Alerte: AL, Obiceiuri: OB, Consiliu: CS, JurnalTrade: JT, TextRo: TR } = globalThis;
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 4, 18, 0), ZI = 86400000, ORA = 3600000;

console.log("Proba v100.77 · ideile: orele pragului, nota pe rândul ei, autopsia acțiunilor ≤ 160");

await test("(1) orele pragului: TextRo.oreN („1 oră”, „2 ore”, „24 de ore”, „2,25 ore”, „1,5 ore”) - aceeași formă pe Tablou și în alertă", () => {
  assert.equal(typeof TR.oreN, "function", "TextRo.oreN lipsește");
  assert.deepEqual([1, 2, 24, 2.25, 1.5, 101].map(TR.oreN), ["1 oră", "2 ore", "24 de ore", "2,25 ore", "1,5 ore", "101 ore"]);
  assert.match(app(), /Afară din grid peste '\+TextRo\.oreN\(st\.afara\.prag\)\+'<\/span>/, "Tabloul nu folosește TextRo.oreN");
  const bot = { id: "1", baza: "CRV.PERP", directie: "long", levier: 5, pretCurent: 0.38, gridJos: 0.35, gridSus: 0.42, profitTotal: -1.2 };
  const r = AL.reguli(bot, { plan: { atins: ["afara"], afara: { prag: 2.25 } } }, null), t = JSON.stringify(r);
  assert.match(t, /2,25 ore/, t.slice(0, 300));
});

await test("(2) poarta fișei: nota cu numele botului pe rândul ei (gri, sub frază), nu în paranteza frazei; costul rămâne înaintea punctului", () => {
  const tr = (m, rez, o) => Object.assign({ id: "q" + Math.random(), moneda: m, rezultat: rez, net: rez, inchis: T0 - 2 * ZI, pornit: T0 - 3 * ZI, durataOre: 30, comisioane: -0.2, funding: 0, dir: "long", greseli: [] }, o || {});
  const ist = Array.from({ length: 113 }, (_, i) => tr("LIGHTER", i % 3 ? -12.3456 : 4.2, { inchis: T0 - (i + 2) * 6 * ORA, pornit: T0 - (i + 3) * 6 * ORA }));
  const f = { simbol: "LIT_USDT_PERP", dir: "long", verdict: { nivel: "porneste", motive: [] }, setare: { levierSigur: 4 }, directie: { dir: "long", tarie: "mediu" } };
  const rez = OB.poarta({ acum: T0, fisa: f, levier: 3, dir: "long", plan: { plus: 5, minus: 10 }, trades: ist, numeBot: "LIGHTER.PERP" });
  const s = app(), i = s.indexOf("function grPoartaHtml("), corp = s.slice(i, s.indexOf("\nfunction ", i + 10));
  // v100.80: rândul 🧠 de la poartă are proba lui (proba-v10080-ecran); aici doar rândul „moneda”
  const ctx = { Obiceiuri: OB, $: () => null, grPlanDinScan: () => null, escapeHtml: (x) => String(x), grPoartaRez: { simbol: "LIT_USDT_PERP", rez }, grReteaPoartaHtml: () => "", grPoartaGridForm: () => "", grPragVal: () => "" };
  vm.createContext(ctx); vm.runInContext(corp + ";this.f=grPoartaHtml;", ctx);
  const h = ctx.f({ simbol: "LIT_USDT_PERP" }), li = (h.match(/<li class="bad">✗ Pe LIGHTER[\s\S]*?<\/li>/) || [""])[0];
  assert.ok(li, "rândul „moneda” lipsește");
  assert.match(li, /<br><span class="tbSub">LIT = LIGHTER la boții Pionex<\/span><\/li>$/, li);
  const vizibil = li.split("<br>")[0].replace(/<[^>]+>/g, ""); assert.ok(vizibil.length <= 160, vizibil.length + ": " + vizibil);
});

// (3) jurnalele reale de semnale pe acțiuni au forma din proba v100.56 (ticker, coduri, stare „x|y|z”, pret, c5, bani în lei)
const Z = ZI, acum = 60 * Z;
const e = (zi, nivel, cod, bani, stare, r = 0) => ({ t: acum - zi * Z, coduri: cod.split(","), nivel, pret: 1234.56, qty: 10, fx: 4.5, r, bani, inLei: true, c5: 1310.25, ...(stare ? { stare } : {}) });
const LUNG = () => {
  const intc = [e(2, "iesi", "trend-jos,stop-atins,miscare-jos", -1234.56, "lateral|dupa-miscare|departe"), e(3, "atentie", "trend-jos,rezultate-curand", -420.5, "jos|calm|departe"), e(4, "iesi", "trend-jos", -55, null)];
  const tip = []; for (let d = 15; d < 27; d++) tip.push(e(d, "iesi", "trend-jos,stop-atins", -310.5, "lateral|dupa-miscare|departe"));
  return CS.autopsieActiuni([{ ticker: "SUPERMICRO_US_EQ", log: intc }, { ticker: "AMD_US_EQ", log: tip }], acum);
};
await test("(3) autopsia acțiunilor: fiecare rând ≤ 160 pe datele lungi (trei motive, starea lungă, sume în mii de lei, tiparul pe două zile), nimic tăiat", () => {
  const a = LUNG(); assert.ok(a.tipar, "tiparul trebuie să apară");
  const toate = a.linii.join("\n"), lung = toate.split("\n").filter((l) => l.length > 160);
  assert.equal(lung.length, 0, lung.map((l) => l.length + ": " + l).join("\n"));
  for (const x of ["SUPERMICRO", "trend-jos, stop-atins, miscare-jos", "starea de atunci", "în 5 zile de bursă", "1.234,56 lei", "Regulă propusă pe acțiuni", "ipoteză, n-am schimbat nimic", "în ultimele 30", "-l urmai, te-ar fi costat", "Spune-mi dacă vrei regula"])
    assert.ok(toate.replace(/\n/g, " ").includes(x), "lipsește: " + x + "\n" + toate);
});

await test("(3) garda „actiuni” are autopsia pe datele lungi (raport ≤ 160 pe rând) și trece", () => {
  const s = situatii().filter((x) => x.mod === "actiuni" && /^autopsie/.test(x.sursa));
  assert.ok(s.length >= 3 && s.some((x) => /SUPERMICRO/.test(x.text)), "garda nu generează autopsia lungă: " + s.map((x) => x.sursa).join(", "));
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.ab.join("; ") + " — " + q.x.text.slice(0, 120)).join("\n"));
});

console.log("\n" + (pica ? "V100.77 PICA · " + pica + " din " + (ok + pica) : "V100.77 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
