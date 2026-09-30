// Proba v100.32 (30.09, el: „fa 1/2/3” - ideea 3): cand un bot se inchide in PRIMA ORA, fisa de inchidere (alerta colectorului)
// spune cat l-au costat comisioanele - fata de ce au facut grilele - si cifra din istoria lui (pe toata istoria: 1469 de boti
// inchisi in prima ora, net −2.065 USDT, din care comisioane −1.642). Doar fapte; nu opreste nimic.
import assert from "node:assert/strict";
import fs from "node:fs";

const lib = (f) => fs.readFileSync(new URL(`../public/lib/${f}`, import.meta.url), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.32 · fisa de inchidere in prima ora, cu comisioanele · proba\n");
const T0 = Date.UTC(2026, 8, 30, 8);
// bot INCHIS inventat (forma rutei bot-orders?status=finished)
const bot = (min, o) => Object.assign({ id: "9", baza: "ABC.PERP", pornitLa: T0, inchisLa: T0 + min * 60000, profitTotal: -1.2, investit: 100, gridProfitBrut: 0.6, comisioane: -0.9, motivInchidere: "user_cancel", levier: 5, ordinePerechi: 3 }, o || {});
const ISTORIE = { n: 1469, net: -2065.22, comisioane: -1642.22 };

await test("inchis dupa 25 de minute: randul „Închis în prima oră” cu comisioanele lui si cat din grile au mancat, plus cifra din istorie", () => {
  const f = TE.fisaInchidere(bot(25), { subOOra: ISTORIE });
  assert.match(f.mesaj, /Închis în prima oră \(25 min\): comisioanele lui −0,90 USDT/);
  assert.match(f.mesaj, /150% din ce au făcut grilele/);
  assert.match(f.mesaj, /pe istoria ta: 1469 de boți închiși în prima oră, net −2065,22 USDT, din care comisioane −1642,22 USDT/);
});
await test("fara istorie data: doar randul botului; fara grile pe plus: fara procent", () => {
  const f = TE.fisaInchidere(bot(25, { gridProfitBrut: 0 }), {});
  assert.match(f.mesaj, /Închis în prima oră \(25 min\): comisioanele lui −0,90 USDT\./);
  assert.doesNotMatch(f.mesaj, /din ce au făcut grilele|pe istoria ta/);
});
await test("inchis dupa o ora sau mai mult (ori durata necunoscuta): niciun rand nou", () => {
  assert.doesNotMatch(TE.fisaInchidere(bot(61), { subOOra: ISTORIE }).mesaj, /prima oră/);
  assert.doesNotMatch(TE.fisaInchidere(bot(25, { inchisLa: null }), { subOOra: ISTORIE }).mesaj, /prima oră/);
  // si fara comisioane cunoscute: nimic inventat
  assert.doesNotMatch(TE.fisaInchidere(bot(25, { comisioane: null }), { subOOra: ISTORIE }).mesaj, /comisioanele lui/);
});
await test("colectorul da fisei cifra din istorie (arhiva de acasa), cerut doar cand botul a tinut sub o ora; versiunea v101.17", () => {
  const c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  const i = c.indexOf("fisa = TabloExtra.fisaInchidere(x, {"), corp = c.slice(i - 900, i + 200);
  assert.ok(i > 0, "apelul fisei");
  assert.match(corp, /Obiceiuri\.subOOra\(JurnalTrade\.din\(/); assert.match(corp, /action=botiInchisi/); assert.match(corp, /3600000/);
  assert.match(c, /fisa = TabloExtra\.fisaInchidere\(x, \{ plan, atrPct, subOOra \}\)/);
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.(1[7-9]|[2-9]\d)";/, "cel putin v101.17");
});

console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
