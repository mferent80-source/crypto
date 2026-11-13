// Proba v100.333 · graficul din „Listele Radarului” (el, 13.11: „în detaliile indicatorilor, în partea dreaptă mai ai spațiu gol, vreau să creezi și să
// pui acolo un grafic cu asta”). Pe fiecare zi judecată (7 zile după sugestie): câte pp a făcut lista față de mediana pieței din aceleași zile;
// revenire și short, câte un grafic mic, aceeași scară; linia 0 = piața; o singură culoare (listele n-au avantaj dovedit ⇒ fără verde / roșu).
//   node scripts/proba-v100333-grafic.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<title>[^<]*<\/title>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; try { await f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n")[0]}`); } }
console.log("\nV100.333 · graficul „Listele Radarului” · proba\n");

const IB = new Function(lib("indicatori-bot.js") + "; return IndicatoriBot;")();
const zi = (i) => new Date(Date.UTC(2026, 9, 3) + i * 86400000).toISOString().slice(0, 10);
const REV = { zile: 4, exces: -0.01, peZile: [{ zi: zi(0), n: 3, lista: 0.02, piata: 0.005, exces: 0.016 }, { zi: zi(1), n: 2, lista: -0.05, piata: -0.01, exces: -0.04 }, { zi: zi(2), n: 1, lista: 0.0, piata: 0.0, exces: 0.0 }, { zi: zi(3), n: 2, lista: 0.01, piata: 0.02, exces: -0.011 }] };
const SH = { zile: 2, exces: 0.02, peZile: [{ zi: zi(5), n: 4, lista: 0.03, piata: -0.02, exces: 0.05 }, { zi: zi(6), n: 1, lista: -0.01, piata: 0, exces: -0.01 }] };

await test("1 · două grafice mici (revenire, short), câte o bară pe zi, aceeași scară; sus = mai bine decât piața, jos = mai rău", () => {
  assert.equal(typeof IB.listeGraficHtml, "function", "lipsește IndicatoriBot.listeGraficHtml");
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc);
  assert.equal((h.match(/<svg class="lrGraf"/g) || []).length, 2);
  const bare = [...h.matchAll(/<rect class="lrBar" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  assert.equal(bare.length, 4 + 2, "o bară pe fiecare zi judecată");
  const zero = Number((/<line class="lrZero" x1="0" y1="([\d.]+)"/.exec(h) || [])[1]); assert.ok(zero > 0, "linia pieței");
  // revenire: +1,6 pp ⇒ deasupra liniei; −4 pp ⇒ dedesubt; 0 ⇒ o linie subțire, nu dispare
  assert.ok(bare[0][1] + bare[0][3] <= zero + 1e-9 && bare[0][1] < zero, "ziua pe plus nu stă deasupra liniei");
  assert.ok(Math.abs(bare[1][1] - zero) < 1e-9 && bare[1][3] > 0, "ziua pe minus nu pleacă în jos de la linie");
  assert.ok(bare[2][3] > 0, "ziua la zero a dispărut");
  // aceeași scară: cea mai mare abatere (+5 pp, short) are cea mai înaltă bară; −4 pp (revenire) e 4/5 din ea
  const hMax = Math.max(...bare.map((b) => b[3])); assert.ok(Math.abs(bare[4][3] - hMax) < 1e-9); assert.ok(Math.abs(bare[1][3] / hMax - 0.8) < 0.02, "scări diferite");
});
await test("2 · hover pe fiecare zi: data, lista, piața, diferența, câte monede - cu o zecimală; ținta de hover e cât toată coloana", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc);
  const tit = [...h.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1]);
  assert.ok(tit.includes("03.10: lista +2,0% · piața +0,5% · față de piață +1,6 pp · 3 monede"), "titlul zilei: " + tit[0]);
  assert.ok(tit.some((t) => /^04\.10: lista −5,0% · piața −1,0% · față de piață −4,0 pp · 2 monede$/.test(t)));
  assert.ok(tit.some((t) => / · 1 monedă$/.test(t)), "numărătoarea prin TextRo.cate");
  const hit = [...h.matchAll(/<rect class="lrHit" x="[\d.]+" y="0" width="([\d.]+)" height="([\d.]+)"/g)];
  assert.equal(hit.length, 6); assert.ok(hit.every((m) => Number(m[2]) >= 40), "ținta de hover mai mică decât coloana");
});
await test("3 · etichetele: numele listei, prima și ultima zi, scara (±X pp), „piața” la linia 0; fără culoare de câștig / pierdere", () => {
  const h = IB.listeGraficHtml({ revenire: REV, short: SH }, esc), t = text(h);
  assert.match(t, /Revenire/); assert.match(t, /Short/); assert.match(t, /03\.10/); assert.match(t, /06\.10/); assert.match(t, /\+5,0 pp piața −5,0 pp/); assert.match(t, /piața/);
  assert.doesNotMatch(h, /class="[^"]*\b(good|bad|tbWarn)\b/, "verde / roșu pe o listă fără avantaj dovedit");
});
await test("4 · fără zile judecate / fără tură: un rând care spune de ce, nu un grafic gol", () => {
  const t1 = text(IB.listeGraficHtml({ revenire: null, short: null }, esc));
  assert.match(t1, /graficul apare după tura de dimineață/);
  const t2 = text(IB.listeGraficHtml({ revenire: { zile: 0, peZile: [] }, short: SH }, esc));
  assert.match(t2, /Revenire: încă nicio zi judecată/); assert.equal((IB.listeGraficHtml({ revenire: { zile: 0, peZile: [] }, short: SH }, esc).match(/<svg class="lrGraf"/g) || []).length, 1);
  assert.equal(IB.listeGraficHtml({ revenire: { peZile: [{ zi: "<x>", exces: 0.1 }] } }, esc).includes("<x>"), false, "data nevalidă intră în pagină");
});
/* v100.335 (el, 13.11: „fă ultimul grafic mai explicit în stilul nostru”): blocul stă acum în coloana dreaptă a detaliilor deschise pe toată lățimea -
   rândurile sus, cartelele graficului dedesubt (una lângă alta când au loc); proba acestei așezări: proba-v100335-grafic.mjs (testul 6). */
await test("5 · Tabloul: „Listele Radarului” - rândurile sus, graficul dedesubt (v100.335; înainte: două coloane)", () => {
  const A = citeste("public", "app.js"), src = fnDin(A, "tbListeRadarHtml");
  assert.match(src, /IndicatoriBot\.listeGraficHtml\(\{revenire:um\.revenireFata\|\|null,short:um\.shortFata\|\|null\},escapeHtml\)/);
  assert.match(src, /<div class="tbListeTxt">/); assert.match(src, /<div class="tbListeGr">/);
  const C = citeste("public", "app.css");
  assert.match(C, /#tabloubot \.tbListe\{display:grid;grid-template-columns:minmax\(0,1fr\);/);
  assert.match(C, /#tabloubot \.lrBar\{fill:var\(--lrBar\);pointer-events:none\}/);   /* revizia Opus: bara nu fură hover-ul țintei de sub ea */ assert.match(C, /--lrBar:#5B8FC7/); assert.match(C, /#tabloubot\.tbZi\{--lrBar:#2456E6\}/, "ziua din blocul generat (face-tema-tablou)");
  assert.doesNotMatch(C, /--lrBar:#3F72AF/, "două reguli de zi");
});

console.log(`\n${picate ? "PICĂ" : "trec"} ${teste - picate}/${teste}`);
process.exit(picate ? 1 : 0);
