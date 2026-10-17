// Proba colector v101.124 (17.10.2026, Busola: „unde pleacă banii”): pentru-busola.json duce banii Pionex ai fiecărui bot.
import assert from "node:assert/strict";
import { alcatuieste, bani } from "./lib/pentru-busola.mjs";

let teste = 0, picate = 0;
function test(nume, f) { teste++; try { f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } }
console.log("\nv101.124 · banii Pionex în pentru-busola.json · proba\n");
const Busola = { simbolBusola: (s) => String(s).replace(/_USDT_PERP$|USDT$|\.PERP$/i, "") };
const acum = Date.UTC(2026, 9, 17, 12);
const ob = alcatuieste({ la: acum, versiune: "v101.124", acum, Busola, cheia: (m) => m, retea: [],
  deschisi: [{ id: 1, baza: "AXS.PERP", simbolPionex: "AXS", directie: "short", levier: 10, pornitLa: acum - 3600000, profitTotal: -1, investit: 50, gridProfitBrut: 0.84, comisioane: -0.21, finantare: 0.05 }],
  inchisi: [{ id: 2, moneda: "ONDO", dir: "long", levier: 5, pornit: acum - 7200000, inchis: acum - 3600000, pus: 100, net: -2, grile: 1.5, comisioane: -0.9, funding: -0.1 }] });
const d = ob.boti.find((b) => b.id === "1"), i = ob.boti.find((b) => b.id === "2");
test("botul deschis: grile, comisioane, funding, suma pusă (USDT, semnul Pionex)", () => assert.deepEqual([d.grileUsdt, d.comisioaneUsdt, d.fundingUsdt, d.pusUsdt], [0.84, -0.21, 0.05, 50]));
test("botul închis: aceleași, din jurnalul Radarului", () => assert.deepEqual([i.grileUsdt, i.comisioaneUsdt, i.fundingUsdt, i.pusUsdt], [1.5, -0.9, -0.1, 100]));
test("pnlPct rămâne cum era (netul / suma pusă)", () => assert.equal(i.pnlPct, -2));
test("lipsa rămâne LIPSĂ (fără câmp, nu 0)", () => { const o = bani({ grile: null, comisioane: "", funding: undefined, pus: 0 }); assert.deepEqual(o, {}); });
console.log(`\n${teste - picate}/${teste} ${picate ? "— PICATE" : "ok"}`);
process.exit(picate ? 1 : 0);
