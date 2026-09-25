// Probele v86: "Ce ai de facut acum" pe Tabloul botului (TabloExtra.ceAiDeFacut) - sfaturile, avertismentele
// serverului, alertele colectorului (stranse: aceeasi alerta de 5 ori = un rand "x5") si planul lipsa,
// fiecare o singura data, in ordinea urgentei.
import assert from "node:assert/strict";
import fs from "node:fs";

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
const SRC = ["grid-calcul.js", "tablou-extra.js"].map((f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8")).join("\n");
const X = new Function(`${SRC}; return TabloExtra;`)();
const ACUM = Date.UTC(2026, 8, 25, 10);
const al = (min, titlu, nivel = "atentie", mesaj = "E setat la 0.30000, dar nu e pornit.") => ({ t: ACUM - min * 60000, nivel, titlu, mesaj, bot: "b1" });
const OPRITOR = [al(30, "MET: opritorul pe pierdere e STINS"), al(90, "MET: opritorul pe pierdere e STINS"), al(200, "MET: opritorul pe pierdere e STINS"), al(300, "MET: opritorul pe pierdere e STINS"), al(500, "MET: opritorul pe pierdere e STINS")];

console.log("\nV86 · Tabloul botului · ce ai de facut acum\n");
await test("functia exista", () => assert.equal(typeof X.ceAiDeFacut, "function"));

await test("aceeasi alerta de 5 ori + avertismentul serverului care spune acelasi lucru -> UN singur rand, cu x5", () => {
  const l = X.ceAiDeFacut({ acum: ACUM, alerte: OPRITOR, avertismente: ["Opritorul pe pierdere e setat dar STINS — nu se va declanșa."], sfaturi: [], planGol: false });
  const op = l.filter((x) => /opritorul/i.test(x.titlu));
  assert.equal(op.length, 1, JSON.stringify(l)); assert.equal(op[0].n, 5);
});
await test("alertele mai vechi de 24 h si cele 'info' nu intra; critic -> rosu, atentie -> galben", () => {
  const l = X.ceAiDeFacut({ acum: ACUM, alerte: [al(25 * 60, "MET: ceva vechi"), al(10, "MET: pretul a iesit din grid", "info"), al(5, "MET: lichidare aproape", "critic", "Mai sunt 6%.")], avertismente: [], sfaturi: [], planGol: false });
  assert.deepEqual(l.map((x) => [x.c, x.titlu]), [["r", "lichidare aproape"]]);
});
await test("sfaturile: atentie -> galben (cu 'ce as face eu'), info CU sfat -> gri, info fara sfat si 'bine' -> nu apar; critic dublat de o alerta -> o data", () => {
  const l = X.ceAiDeFacut({ acum: ACUM, alerte: [al(5, "MET: lichidare aproape", "critic")], avertismente: [], planGol: false, sfaturi: [
    { ton: "critic", titlu: "Lichidare aproape", text: "Mai sunt 6% până la lichidare." },
    { ton: "atentie", titlu: "Costurile mănâncă grilele: −0.40 USDT pe zi, net", text: "x", faCe: "Aș opri botul." },
    { ton: "info", titlu: "Setarea botului", text: "grile prea dese", faCe: "La următorul bot: grile geometrice." },
    { ton: "info", titlu: "Finanțarea e mică", text: "0,01%" },
    { ton: "bine", titlu: "Trendul e cu botul", text: "y", faCe: "Aș lăsa botul." }] });
  assert.deepEqual(l.map((x) => x.c), ["r", "g", "n"]);
  assert.equal(l.filter((x) => /lichidare/i.test(x.titlu)).length, 1);
  assert.match(l[1].text, /👉 Aș opri botul/);
  assert.ok(!l.some((x) => /Finanțarea|Trendul/.test(x.titlu)));
});
await test("fara plan -> rand gri cu actiunea 'plan'; cu plan -> nu", () => {
  const a = X.ceAiDeFacut({ acum: ACUM, alerte: [], avertismente: [], sfaturi: [], planGol: true });
  assert.equal(a.length, 1); assert.equal(a[0].c, "n"); assert.equal(a[0].actiune, "plan");
  assert.equal(X.ceAiDeFacut({ acum: ACUM, alerte: [], avertismente: [], sfaturi: [], planGol: false })[0].c, "v");
});
await test("nimic de facut -> un singur rand verde 'Nimic urgent' (cu sfatul 'bine' daca exista)", () => {
  const l = X.ceAiDeFacut({ acum: ACUM, alerte: [], avertismente: [], planGol: false, sfaturi: [{ ton: "bine", titlu: "Nimic urgent", text: "Nu văd nimic.", faCe: "L-aș lăsa să lucreze." }] });
  assert.equal(l.length, 1); assert.equal(l[0].c, "v"); assert.match(l[0].text, /L-aș lăsa/);
});
await test("ordinea: rosu, galben, gri - oricum ar veni; intrari stricate (null, fara titlu) se sar", () => {
  const l = X.ceAiDeFacut({ acum: ACUM, planGol: true, avertismente: [null, "", "Profitul NET e negativ deși gridul câștigă"], sfaturi: [null, { ton: "atentie" }, { ton: "critic", titlu: "Lichidare aproape", text: "6%" }], alerte: [null, { t: ACUM }] });
  const c = l.map((x) => x.c); assert.deepEqual(c, c.slice().sort((a, b) => "rgnv".indexOf(a) - "rgnv".indexOf(b)));
  assert.equal(l[0].c, "r");
});
await test("v90: alertele altui bot, ale actiunilor T212 si cele vechi ale colectorului NU intra pe Tabloul botului afisat", () => {
  const f = X.alerteleBotului([{ t: ACUM - 60000, nivel: "critic", titlu: "MET nu mai apare", bot: "met1" }, { t: ACUM - 60000, nivel: "atentie", titlu: "VVV: lichidarea la 14%", bot: "vvv1" },
    { t: ACUM - 60000, nivel: "critic", titlu: "−12,9% de la maxim, cum ai scris în plan", bot: null, cheie: "t212-APLD_US_EQ-trail-2026-09-25" },
    { t: ACUM - 5 * 3600000, nivel: "critic", titlu: "Crypto Radar nu mai poate citi botul", bot: null, cheie: "colector" },
    { t: ACUM - 30 * 60000, nivel: "critic", titlu: "Colectorul nu mai vede Pionex", bot: null, cheie: "colector" }], "vvv1", ACUM);
  assert.deepEqual(f.map((a) => a.titlu), ["VVV: lichidarea la 14%", "Colectorul nu mai vede Pionex"]);
});
console.log(`\n${teste - picate}/${teste} probe trecute${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
