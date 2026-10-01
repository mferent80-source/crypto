// Proba v100.50 (01.10, el: „fă tot” - pachetul 3: o singura voce, docs/superpowers/plans/2026-10-01-pachetul-3-o-singura-voce.md).
// I-479 motivele de acelasi nivel dupa banii MASURATI; I-473 de ce s-a schimbat verdictul; I-474 Consilierul in colector (poza, alerta,
// KV cons); I-472 jurnalul deciziilor.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.50 · O singura voce: ordinea dupa bani, de ce s-a schimbat, Consilierul in colector, deciziile · proba\n");

const comp = (cod, nivel, motiv) => ({ cod, nivel, motiv, faCe: "fa ceva pentru " + cod });
const sm = (componente, nivel) => ({ nivel: nivel || "atentie", cod: componente[0].cod, motiv: componente[0].motiv, faCe: componente[0].faCe, componente });
const soc = (o) => Object.fromEntries(Object.entries(o).map(([k, [jud, bani]]) => [k, { n: jud, judecate: jud, corecte: Math.round(jud / 2), bani, baniN: jud, stare: "nesigur", nume: k }]));

await test("I-479: doua motive „atentie” - costuri (15 judecate, −20 USDT) si trend (12 judecate, +50) -> trend intai (dupa banii masurati)", () => {
  const c = CS.alcatuieste({ sm: sm([comp("costuri", "atentie", "costurile pe zi depășesc grilele"), comp("trend", "atentie", "trendul e împotriva botului")]), socoteala: soc({ costuri: [15, -20], trend: [12, 50] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["trend", "costuri"]);
});
await test("I-479: sub 10 judecate -> ordinea fixa de azi (costuri inaintea trendului)", () => {
  const c = CS.alcatuieste({ sm: sm([comp("costuri", "atentie", "costurile"), comp("trend", "atentie", "trendul")]), socoteala: soc({ costuri: [15, -20], trend: [9, 50] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["costuri", "trend"]);
});
await test("I-479: planul (siguranta) ramane inaintea unui motiv „atentie” care a adus mai multi bani", () => {
  const c = CS.alcatuieste({ sm: sm([comp("trend", "atentie", "trendul"), comp("plan", "atentie", "planul: afară peste prag")]), socoteala: soc({ plan: [20, -100], trend: [30, 200] }) });
  assert.deepEqual(c.motive.map((m) => m.cod), ["plan", "trend"]);
});
await test("I-473: deCe - din ce verdict in care, ce motive au aparut si ce au disparut; nimic schimbat -> null", () => {
  assert.ok(typeof CS.deCe === "function", "lipseste Consiliu.deCe");
  const a = { nivel: "tine", motive: [{ cod: "liniste", titlu: "Piața e liniștită" }] }, b = { nivel: "atentie", motive: [{ cod: "stop", titlu: "Stopul e peste plan" }, { cod: "liniste", titlu: "Piața e liniștită" }] };
  const d = CS.deCe(a, b);
  assert.match(d.text, /din 🟢 Ține în 🟡 Atenție/); assert.match(d.text, /\+ Stopul e peste plan/); assert.ok(!/− Piața/.test(d.text));
  assert.match(CS.deCe(b, a).text, /− Stopul e peste plan/);
  assert.equal(CS.deCe(b, b), null);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
