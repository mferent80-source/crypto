// Proba v97.4: pagina Alerts - categoriile alertelor de acasa (dupa cheia colectorului), drumul spre pagina lor, filtrele, zilele.
// Rulare: node scripts/alerte-centru-v974.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const src = fs.readFileSync(new URL("../public/lib/alerte-ecran.js", import.meta.url), "utf8");
vm.runInThisContext(src.slice(0, src.indexOf("// ---- ecranul ----")));
const A = globalThis.AlCentru;
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); } }
// cheile reale din lista lui (27.09)
const L = [
  { cheie: "grila", bot: "2384", nivel: "info" }, { cheie: "plan", bot: "2383", nivel: "atentie" }, { cheie: "s-iesi", bot: "2383", nivel: "critic" }, { cheie: "p-zero", bot: null, nivel: "atentie" },
  { cheie: "opritor", bot: null, nivel: "info" }, { cheie: "colector", bot: null, nivel: "critic" }, { cheie: "t212-conc-APLD_US_EQ-2026-09-27", bot: null, nivel: "atentie" },
  { cheie: "t212-AVGO_US_EQ-trail-2026-09-25", nivel: "atentie" }, { cheie: "act-NVDA", nivel: "atentie" }, { cheie: "reteta-aNVDA-trend", nivel: "info" }, { cheie: "reteta-cBTC-grid", nivel: "info" },
  { cheie: "vreme-crypto", nivel: "info" }, { cheie: "raport-3h", nivel: "info" }, { cheie: "dimineata", nivel: "info" }, { cheie: "raport-saptamana", nivel: "info" }, { cheie: null, nivel: "info" }];
await test("categorii: botii (cu sau fara id), actiunile (t212, act-, reteta-a), piata (vreme, rapoartele de piata, dimineata, restul); «Mediul botilor» (raport-3h) la boti", async () => {
  assert.deepEqual(L.map(A.categorie), ["boti", "boti", "boti", "boti", "boti", "boti", "actiuni", "actiuni", "actiuni", "actiuni", "boti", "piata", "boti", "piata", "piata", "piata"]);
});
await test("drumul: botii -> Tablou, actiunile -> Trading 212, retetele -> Scan, piata -> Home", async () => {
  assert.equal(A.drum(L[0]).pag, "tabloubot"); assert.equal(A.drum(L[6]).pag, "t212"); assert.equal(A.drum(L[9]).pag, "scan"); assert.equal(A.drum(L[10]).pag, "scan"); assert.equal(A.drum(L[11]).pag, "dash");
});
await test("numarul pe file si 'doar importante' (critic + atentie); filtrul combinat", async () => {
  const c = A.numara(L); assert.deepEqual(c, { toate: 16, boti: 8, actiuni: 4, piata: 4, importante: 7 });
  assert.equal(A.filtreaza(L, "boti", true).length, 4); assert.equal(A.filtreaza(L, "toate", false).length, 16); assert.deepEqual(A.filtreaza(null, "toate"), []);
});
await test("zilele: Azi / Ieri / data, pe ora Bucurestiului (23:30 UTC = a doua zi la Bucuresti)", async () => {
  const acum = Date.UTC(2026, 8, 27, 12, 0);
  assert.equal(A.zi(acum - 3600000, acum), "Azi"); assert.equal(A.zi(Date.UTC(2026, 8, 26, 22, 30), acum), "Azi", "01:30 la București e azi");
  assert.equal(A.zi(Date.UTC(2026, 8, 26, 10, 0), acum), "Ieri"); assert.match(A.zi(Date.UTC(2026, 8, 24, 10, 0), acum), /24 septembrie/);
});
console.log(`ALERTE_CENTRU_V974 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
