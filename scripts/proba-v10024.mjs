// Proba v100.24 (30.09, el: „FA IDEILE” - ideea 1 din trei): statistica trade-urilor pe PERIOADA aleasa - ultima luna,
// ultimele 3 luni sau tot - pe fiecare fila a Jurnalului, ca sa vada daca se imbunatateste.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const ST = new Function(`${lib("statistica-trade.js")}; return StatisticaTrade;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.24 · statistica pe perioada aleasa · proba\n");
const Z = 86400000, ACUM = Date.UTC(2026, 8, 30, 12);
// un trade la fiecare 10 zile, inapoi 200 de zile
const TR = Array.from({ length: 20 }, (_, i) => ({ id: "p" + i, eticheta: "A", pornit: ACUM - (i * 10 + 1) * Z, inchis: ACUM - i * 10 * Z, rezultat: i % 2 ? -5 : 8, baza: 100, durataOre: 24 }));

await test("dinPerioada: ultima luna (30 z), ultimele 3 luni (90 z), tot; dupa ora inchiderii", () => {
  assert.equal(ST.dinPerioada(TR, "30", ACUM).length, 4);    // 0, 10, 20, 30 zile
  assert.equal(ST.dinPerioada(TR, "90", ACUM).length, 10);   // 0..90
  assert.equal(ST.dinPerioada(TR, "tot", ACUM).length, 20);
  assert.equal(ST.dinPerioada(TR, "orice altceva", ACUM).length, 20, "necunoscut = tot");
  assert.deepEqual(ST.PERIOADE.map((p) => p.cheie), ["30", "90", "tot"]);
});

await test("html: butoanele de perioada in capul statisticii, cu cea aleasa apasata si actiunea paginii", () => {
  const s = ST.calc(ST.dinPerioada(TR, "90", ACUM), { moneda: "lei" });
  const h = ST.html(s, { titlu: "Statistica · Trading 212", piata: "actiuni", perioada: "90", actiunePerioada: "jtStatPerioada" });
  assert.ok(h.includes(`data-action-click="jtStatPerioada('actiuni','30')"`), "butonul Ultima lună");
  assert.ok(h.includes(`data-action-click="jtStatPerioada('actiuni','tot')"`), "butonul Tot");
  assert.match(h, /aria-pressed="true"[^>]*>Ultimele 3 luni</);
  assert.match(h, /ultimele 3 luni/i, "subtitlul spune perioada");
});

await test("perioada fara niciun trade: mesaj, dar butoanele raman (ca sa te poti intoarce)", () => {
  const s = ST.calc([], { moneda: "USDT" }), h = ST.html(s, { titlu: "Statistica · Pionex", piata: "crypto", perioada: "30", actiunePerioada: "jtStatPerioada" });
  assert.match(h, /niciun trade închis în ultima lună/i);
  assert.ok(h.includes(`jtStatPerioada('crypto','tot')`));
});

await test("fara actiunePerioada (demo vechi / alte locuri) -> fara butoane, ca inainte", () => {
  const h = ST.html(ST.calc(TR, { moneda: "lei" }), { titlu: "x" });
  assert.doesNotMatch(h, /Ultimele 3 luni/);
});

await test("pagina: perioada tinuta pe fiecare fila, in cheia calculului, cu actiunea jtStatPerioada", () => {
  const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /function jtStatPerioada\(/);
  assert.match(app, /perioada:\{crypto:"tot",actiuni:"tot",tot:"tot"\}/);
  assert.match(app, /StatisticaTrade\.dinPerioada\(/);
  assert.match(app, /actiunePerioada:"jtStatPerioada"/);
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
