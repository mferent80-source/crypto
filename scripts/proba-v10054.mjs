// Proba v100.54 (01.10, el: actiunile T212 - pachetul 3: o singura voce pe pozitie,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-3-o-singura-voce.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;
const CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.54 · Actiunile T212: o singura voce pe pozitie · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);

// ---- pasul 1: Consilierul pe pozitie ----
const poz = (o) => ({ ticker: "INTC_US_EQ", simbol: "INTC", qty: 10, pretMediu: 20, pret: 18, costLei: 900, plan: null, maxDupaCumparare: 22, ...o });
const stJos = { trend: { dir: "jos", motive: ["EMA20 sub EMA50"] }, miscare: { mare: false } };
await test("semaforul are componentele cu cod (aditiv): stopul planului si trendul in jos", () => {
  const s = AS.semafor(poz({ plan: { stop: 18.5 } }), stJos);
  assert.ok(Array.isArray(s.componente), "lipsesc componentele"); assert.deepEqual(s.componente.map((c) => c.cod), ["stop-plan", "trend-jos"]); assert.equal(s.nivel, "iesi"); assert.ok(Array.isArray(s.motive));
});
await test("alcatuiesteActiune: siguranta intai, un singur IESI in varf, banii pana la stop in lei si dolari, sfaturile in motive sau in rest", () => {
  are(CS.alcatuiesteActiune, "Consiliu.alcatuiesteActiune");
  const p = poz({ plan: { stop: 18.5 } }), sem = AS.semafor(p, stJos), niv = { stopPozitie: 18.7, trailPct: 15, stopAtins: true, sursaTrail: "−15% de la maxim" };
  const sf = [{ nivel: "g", sursa: "istoric", titlu: "Istoricul tău pe INTC: 33 trade-uri", text: "", ceAsFace: "N-aș adăuga." }, { nivel: "n", sursa: "piata", titlu: "Piața întreagă e în jos", text: "", ceAsFace: null }];
  const c = CS.alcatuiesteActiune({ sem, niv, sfaturi: sf, plan: p.plan, pret: 18, pretMediu: 20, qty: 10, costLei: 900, simbol: "INTC" });
  assert.equal(c.nivel, "iesi"); assert.equal(c.motive[0].cod, "stop-plan"); assert.match(c.faCe, /ies/i);
  assert.match(c.bani, /\$/); assert.match(c.bani, /lei/);
  assert.ok(c.rest.some((r) => /Piața întreagă/.test(r.titlu)) || c.motive.some((m) => /Piața/.test(m.titlu)), "nimic nu se pierde");
  const pp = CS.pentruPozaActiune(c); assert.equal(pp.nivel, "iesi"); assert.ok(pp.motive.length >= 1 && pp.ceAsFace);
});
await test("fara date -> asteapta; fara costLei -> banii doar in dolari", () => {
  are(CS.alcatuiesteActiune, "Consiliu.alcatuiesteActiune");
  const c0 = CS.alcatuiesteActiune({ sem: { nivel: "fara-date", motive: ["n-am prețuri"], ceAsFace: "x", componente: [] }, pret: 18, pretMediu: 20, qty: 10, simbol: "INTC" });
  assert.equal(c0.nivel, "asteapta"); assert.equal(CS.pentruPozaActiune(c0).nivel, "fara-date");
  const p = poz({ costLei: null }), c = CS.alcatuiesteActiune({ sem: AS.semafor(p, stJos), niv: { stopPozitie: 17, trailPct: 15 }, pret: 18, pretMediu: 20, qty: 10, costLei: null, simbol: "INTC" });
  assert.ok(!/lei/.test(c.bani || ""), c.bani);
});
await test("crypto neschimbat: alcatuieste (boti) trece prin ordoneaza si da ordinea din proba v10050 (muta, costuri, trend)", () => {
  assert.equal(typeof CS.ordoneaza, "function");
  const comp = (cod, motiv) => ({ cod, nivel: "atentie", motiv, faCe: "fa " + cod }), k = [comp("costuri", "costurile"), comp("muta", "mută gridul"), comp("trend", "trendul")];
  const S = { costuri: { judecate: 15, corecte: 7, bani: -20, baniN: 15 }, muta: { judecate: 12, corecte: 6, bani: 30, baniN: 12 } };
  const c = CS.alcatuieste({ sm: { nivel: "atentie", cod: "trend", motiv: "trendul", faCe: "", componente: [k[2], k[0], k[1]] }, socoteala: S });
  assert.deepEqual(c.motive.map((m) => m.cod), ["muta", "costuri", "trend"]);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
