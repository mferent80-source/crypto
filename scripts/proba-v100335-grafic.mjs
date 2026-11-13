// Proba v100.335 · graficul „Listele Radarului” mai explicit, în stilul casei (el, 13.11: „fă ultimul grafic mai explicit în stilul nostru”).
// Ca „Scorul pe 4h”: fiecare listă într-o cartelă (ramă, titlu mic), scara scrisă pe axă în dreapta (+X pp / piața / −X pp), sub desen în cuvinte
// mediana zilelor și „peste piață în k din n zile”, ultima zi marcată și scrisă cu cifre; rândurile listelor sus, cartelele dedesubt, una lângă alta
// când au loc. O singură culoare (fără verde / roșu: listele n-au avantaj dovedit); textele în cerneala textului, nu în culoarea barei.
//   node scripts/proba-v100335-grafic.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<title>[^<]*<\/title>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.335 · graficul „Listele Radarului”, mai explicit · proba\n");

const IB = new Function(citeste("public", "lib", "indicatori-bot.js") + "; return IndicatoriBot;")();
const zi = (i) => new Date(Date.UTC(2026, 9, 3) + i * 86400000).toISOString().slice(0, 10);
const REV = { zile: 4, exces: -0.01, peZile: [{ zi: zi(0), n: 3, lista: 0.02, piata: 0.005, exces: 0.016 }, { zi: zi(1), n: 2, lista: -0.05, piata: -0.01, exces: -0.04 }, { zi: zi(2), n: 1, lista: 0.0, piata: 0.0, exces: 0.0 }, { zi: zi(3), n: 2, lista: 0.01, piata: 0.02, exces: -0.011 }] };
const SH = { zile: 2, exces: 0.02, peZile: [{ zi: zi(5), n: 4, lista: 0.03, piata: -0.02, exces: 0.05 }, { zi: zi(6), n: 1, lista: -0.01, piata: 0, exces: -0.01 }] };
const H = () => IB.listeGraficHtml({ revenire: REV, short: SH }, esc);
const carte = (h) => h.split('<div class="lrUnu">').slice(1);

await test("1 · fiecare listă în cartela ei, cu titlul în cuvinte: numele, „față de piață”, câte zile", () => {
  const c = carte(H()); assert.equal(c.length, 2, "două cartele");
  assert.match(text(c[0]), /^Revenire · față de piață, 4 zile/); assert.match(text(c[1]), /^Short · față de piață, 2 zile/);
});
await test("2 · scara scrisă pe axă, în dreapta desenului: +X pp sus, „piața” la linia 0, −X pp jos (aceeași scară la ambele)", () => {
  const sc = [...H().matchAll(/<svg class="lrScara"[^>]*>([\s\S]*?)<\/svg>/g)].map((m) => text(m[1]));
  assert.equal(sc.length, 2); sc.forEach((s) => assert.equal(s, "+5,0 pp piața −5,0 pp"));
});
await test("3 · sub desen, în cuvinte: mediana zilelor față de piață și în câte zile lista a fost peste piață", () => {
  const c = carte(H()).map(text);
  assert.match(c[0], /mediana zilelor: −1,0 pp față de piață · mai bine decât piața în 1 din 4 zile/);
  assert.match(c[1], /mediana zilelor: \+2,0 pp față de piață · mai bine decât piața \(pentru un short\) în 1 din 2 zile/);
  // fără mediana rutei (zilele diferă) ⇒ mediana barelor: −4; −1,1; +1,6 ⇒ −1,1 pp
  const t = text(IB.listeGraficHtml({ revenire: { zile: 9, exces: 0.3, peZile: REV.peZile.filter((z) => z.exces !== 0) } }, esc));
  assert.match(t, /mediana zilelor: −1,1 pp față de piață · mai bine decât piața în 1 din 3 zile/);
});
await test("4 · ultima zi marcată pe desen și scrisă cu cifrele ei (lista, piața)", () => {
  const h = H(), c = carte(h);
  assert.equal((h.match(/<rect class="lrUlt"/g) || []).length, 2, "marcajul ultimei zile");
  assert.match(text(c[0]), /ultima zi, 06\.10: −1,1 pp \(lista \+1,0% · piața \+2,0%\)/);
  assert.match(text(c[1]), /ultima zi, 09\.10: −1,0 pp \(lista −1,0% · piața \+0,0%\)/);
});
await test("5 · aceleași fapte ca înainte: o bară pe zi, hover pe toată coloana, linia pieței; fără verde / roșu, textele fără culoarea barei", () => {
  const h = H();
  assert.equal((h.match(/<rect class="lrBar" /g) || []).length, 6); assert.equal((h.match(/<rect class="lrHit" /g) || []).length, 6);
  assert.equal((h.match(/<line class="lrZero" /g) || []).length, 2);
  assert.doesNotMatch(h, /class="[^"]*\b(good|bad|tbWarn|ibLbun|ibLrau)\b/); assert.doesNotMatch(h, /<text[^>]*fill=/, "text vopsit în culoarea seriei");
});
await test("6 · CSS: cartela în rama casei, scara în coloana ei; rândurile listelor sus, cartelele dedesubt, una lângă alta când au loc", () => {
  const C = citeste("public", "app.css");
  assert.match(C, /#tabloubot \.lrUnu\{[^}]*border:1px solid var\(--pzLi\);border-radius:4px[^}]*\}/);
  assert.match(C, /#tabloubot \.lrDes\{display:flex;[^}]*\}/); assert.match(C, /#tabloubot \.lrScara\{flex:0 0 \d+px[^}]*\}/);
  assert.match(C, /#tabloubot \.tbListe\{display:grid;grid-template-columns:minmax\(0,1fr\);/);
  assert.match(C, /#tabloubot \.tbListeGr\{[^}]*container-type:inline-size[^}]*\}/);
  assert.match(C, /@container \(min-width:\s*560px\)\{#tabloubot \.lrGrafice\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

await test("7 · fără listele de azi (înainte de tura de la 8:00 sau ruta căzută) graficul pe zile tot se vede - datele lui sunt în sugestii", () => {
  const A = citeste("public", "app.js"), i = A.indexOf("function tbListeRadarHtml("), j = A.indexOf("\nfunction ", i + 10), src = A.slice(i, j);
  const ram = (/if\(!I\|\|!cl\)\{([\s\S]*?)\}\s*\/\*/.exec(src) || [])[1] || "";
  assert.ok(ram, "ramura „fără listele de azi” nu mai e un bloc"); assert.match(ram, /IndicatoriBot\.listeGraficHtml/, "ramura fără liste nu desenează graficul");
  assert.match(ram, /tbListe\.la>0\?"listele de azi nu sunt disponibile aici"/, "mesajul de acum rămâne");
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
