// Proba v100.118 (06.10, el: „fa idei toate” - I-566). Codul din Tablou pentru GRID-FISA v2.4 primeste al 19-lea camp = momentul
// pornirii botului (ms, b.pornitLa din Pionex createTime). PONS 06.10: botul pornit la 18:48, GRID-FISA v2.3 zicea „ÎNAINTE DE
// PORNIRE” si toate alertele botului taceau, fiindca nimic din cod nu spunea ca botul ruleaza. Semnatura (alt grid) nu se schimba.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const TE = new Function("GridCalcul", `${lib("tablou-extra.js")}; return TabloExtra;`)(G);
const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.118 · Pornirea botului in codul pentru GRID-FISA v2.4 · proba\n");

// PONS 06.10: short 3x, 45.92 USDT, pornit 1791301681464 (06.10.2026 18:48:01 Bucuresti)
const pons = (o) => ({ id: "2408", directie: "short", gridJos: 0.3534, gridSus: 0.4623, levier: 3, investit: 45.92, opritorPierdereActiv: true, opritorPierdere: 0.463, lichidareJos: null, lichidareSus: 0.5867, pornitLa: 1791301681464, brut: { buOrderData: { row: 90, gridType: "geometric" } }, ...o });
const EXTRA = { copiatLa: 1791302056000, margJos: 0.031, margSus: 0.034 };

await test("cu „extra” (butonul din Tablou): 19 campuri, al 19-lea = pornirea in ms, verdictul fisei ramane gol", () => {
  const p = TE.codTVBot(pons(), null, EXTRA).cod.split(";");
  assert.equal(p.length, 19, p.join(";"));
  assert.equal(p[18], "1791301681464");
  assert.equal(p[14], "", "verdictul fisei gol = botul ruleaza");
  assert.equal(p[15], "1791302056000");
});
await test("pornirea necunoscuta: campul 19 e „0” (GRID-FISA il citeste „fara”), pozitiile nu aluneca", () => {
  for (const v of [null, undefined, 0, "", "abc", -5]) {
    const p = TE.codTVBot(pons({ pornitLa: v }), null, EXTRA).cod.split(";");
    assert.equal(p.length, 19, String(v)); assert.equal(p[18], "0", String(v));
  }
});
await test("fara „extra” codul ramane ca inainte (semnatura si gridDiferitDeBot neatinse, fara pornire)", () => {
  const c = TE.codTVBot(pons(), null);
  assert.equal(c.cod.split(";").length, 11);
  assert.equal(TE.codTVBot(pons({ pornitLa: 1 }), null, EXTRA).sig, TE.codTVBot(pons(), null, EXTRA).sig, "alta pornire nu e alt grid");
});
await test("cu plan: 19 campuri, planul la locul lui (12-14), pornirea la 19", () => {
  const p = TE.codTVBot(pons(), { minus: 7.5, plus: 2.6, afaraOre: 12 }, EXTRA).cod.split(";");
  assert.equal(p.length, 19); assert.deepEqual(p.slice(11, 14), ["7.5", "2.6", "12"]); assert.equal(p[18], "1791301681464");
});
await test("Tabloul spune GRID-FISA v2.4 (v2.3 si mai vechi refuza 19 campuri)", () => {
  assert.ok(/lipește-l în indicatorul GRID-FISA v2\.4/.test(app), "textul din Tablou nu spune v2.4");
  assert.ok(!/lipește-l în indicatorul GRID-FISA v2\.[0-3]/.test(app), "a ramas o versiune veche in textul din Tablou");
});

await test("fisa fara verdict trimite „fara-date”, nu gol (golul inseamna „botul ruleaza” pentru GRID-FISA v2.4 ⇒ 🟡 BOTUL PARE PORNIT fals)", () => {
  const f = app.slice(app.indexOf("function grCodTV("), app.indexOf("function grCodTV(") + 1500);
  assert.ok(/String\(extra\.verdict\|\|"fara-date"\)/.test(f), "grCodTV inca trimite verdictul gol");
});

console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
