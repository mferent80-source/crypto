// Proba v100.19 (30.09, el: „1 grilă”): stopul din setarile propuse de fisa (si din proba ei) sta la O GRILA dincolo de marginile
// gridului, nu la doua. Masurat inainte pe 12 monede (aceleasi lumanari, mediana pe monede): 2 grile tipic +2,5% / cea mai proasta
// −19,6% / nevazute +5,9%; 1 grila +1,8% / −16,3% / +5,1%; 1/2 grila +1,7% / −14,4% / +2,4%. Gridul dupa plan ramane la 1/2 pas.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const GridPlan = new Function("GridCalcul", "GridProba", `${lib("grid-plan.js")}; return GridPlan;`)(GridCalcul, GridProba);
const SemnaleBot = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(GridCalcul);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.19 · stopul setarilor propuse la o grila · proba\n");

await test("GridCalcul.stopuri: o grila dincolo de fiecare margine (gridul rar: pasul > 1/8 din latime); v100.39: la gridul des 1/8 din latime", () => {
  const s = GridCalcul.stopuri(100, 120, 0.03);   // 1/8 din 20% = 2,5% < 3% -> o grila
  assert.ok(Math.abs(s.jos - 97) < 1e-9, `jos ${s.jos}`); assert.ok(Math.abs(s.sus - 123.6) < 1e-9, `sus ${s.sus}`);
  const d = GridCalcul.stopuri(100, 120, 0.003);  // gridul des: 1/8 din 20% = 2,5% (el, 30.09: „stop la ~1/8 din lățime”)
  assert.ok(Math.abs(d.jos - 97.5) < 1e-9, `jos des ${d.jos}`); assert.ok(Math.abs(d.sus - 123) < 1e-9, `sus des ${d.sus}`);
});

await test("construieste (deci fisa si proba ei) pune stopul la o grila, iar lichidarea ramane dincolo de el", () => {
  const st = GridCalcul.construieste({ pret: 100, lat: 0.06, pas: 0.01, dir: "long", suma: 100 });   // v100.39: 1/8 din 6% < 1% -> o grila
  assert.ok(Math.abs(st.stop.jos - st.jos * (1 - st.pas)) < 1e-9, `stop ${st.stop.jos} jos ${st.jos} pas ${st.pas}`);
  assert.ok(Math.abs(st.stop.sus - st.sus * (1 + st.pas)) < 1e-9);
  assert.ok(st.lichidare.jos === null || st.lichidare.jos < st.stop.jos, `lichidare ${st.lichidare.jos}`);
});

await test("gridul dupa plan ramane cu stopul la 1/2 pas (acolo stopul e chiar planul)", () => {
  const b = Array.from({ length: 35 * 96 }, (_, i) => { const o = 4.473 * (1 + 0.012 * Math.sin(i / 7)), c = 4.473 * (1 + 0.012 * Math.sin((i + 1) / 7)); return { t: i * 900000, o, c, h: Math.max(o, c), l: Math.min(o, c) }; });
  const a = GridPlan.variante({ pret: 4.473, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003, b15: b }).ta;
  assert.ok(Math.abs(a.stop.jos - a.jos * (1 - a.pas / 2)) < 1e-9);
});

await test("cartela Stopul: protectia de rezerva (fara fisa) la o grila sub gridul de jos, textele spun „o grilă”", () => {
  const bot = { directie: "long", pretCurent: 4.3, gridJos: 4.085, gridSus: 4.837, opritorPierdere: null, opritorPierdereActiv: false, profitTotal: -3, brut: { buOrderData: { row: 16, gridType: "geometric" } } };
  const s = SemnaleBot.acumConcret({ bot, fisa: null, zero: { pretZero: 4.45 }, costuri: null, acum: 0 }).find((x) => x.cod === "stop");
  const g = SemnaleBot.pasBot(bot).pas, asteptat = 4.085 * (1 - g);
  assert.ok(s.act.includes(asteptat.toFixed(4)), `act: ${s.act} (astept ${asteptat.toFixed(4)})`);
  for (const f of ["semnale-bot.js"]) assert.doesNotMatch(lib(f), /două grile|doua grile/, `${f} mai spune „două grile”`);
  assert.doesNotMatch(fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8"), /la două grile dincolo/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
