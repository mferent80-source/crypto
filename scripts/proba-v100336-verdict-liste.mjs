// Proba v100.336 · verdictul graficului „Listele Radarului” spus în cuvinte (13.11, el: „vreau să modifici și verdictul din ultimul grafic, să-l faci
// mai explicit, ți-am mai cerut asta, fă și acolo un demo”).
//   1  direcția: mediana zilelor + în câte zile lista a bătut piața; dacă nu se potrivesc ⇒ „cam cât piața”; mereu „nedovedit”, cu ferestrele de 7 zile
//   2  sub 5 zile judecate sau sub 2 ferestre ⇒ „prea devreme” (pragul ales, deja la vedere)
//   3  „Ce aș face eu” pe fiecare listă, în direcția ei (long / short)
//   4  rândul „Verdict” pentru botul tău, PRIMUL: de partea botului / contra / nu e pe liste, cât cântărește lista
//   5  în cartelă: verdictul sus, în cerneala textului (fără verde / roșu), cifrele de până acum rămân (nimic pierdut)
//   node scripts/proba-v100336-verdict-liste.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.336 · verdictul „Listele Radarului” în cuvinte · proba\n");

const ctx = vm.createContext({ console, Math, Date, JSON, Intl, isFinite, isNaN, Number, String, Array, Object, RegExp, TextRo: globalThis.TextRo });
vm.runInContext(lib("indicatori-bot.js") + "\n;globalThis.IB = IndicatoriBot;", ctx);
const IB = ctx.IB;
// zile ca pe pagina vie din 13.11: revenire 29 de zile, mediana −3,2 pp, 10 bune; short 31 de zile, mediana +1,2 pp, 13 bune
function zile(n, bune, med, de) { const t0 = Date.parse(de + "T06:00:00Z"); return Array.from({ length: n }, (_, i) => ({ zi: new Date(t0 + i * 86400000).toISOString().slice(0, 10), n: 5, lista: 0, piata: 0, exces: i < bune ? 0.02 + i * 0.001 : -0.05 - i * 0.001 })).map((z, i, a) => (i === a.length - 1 ? z : z)); }
const rev = { zile: 29, exces: -0.032, zilePeste: 10 / 29, zileCuPiata: 29, ferestre: 5, peZile: zile(29, 10, -0.032, "2026-10-05") };
const sh = { zile: 31, exces: 0.012, zilePeste: 13 / 31, zileCuPiata: 31, ferestre: 5, peZile: zile(31, 13, 0.012, "2026-10-03") };
const bun = { zile: 20, exces: 0.015, zilePeste: 14 / 20, zileCuPiata: 20, ferestre: 3, peZile: zile(20, 14, 0.015, "2026-10-20") };

await test("1 direcția și „nedovedit” cu ferestrele", () => {
  assert.equal(typeof IB.listeVerdict, "function", "lipsește IndicatoriBot.listeVerdict");
  const r = IB.listeVerdict(rev, false), s = IB.listeVerdict(sh, true), b = IB.listeVerdict(bun, false);
  assert.equal(r.cod, "slab"); assert.equal(s.cod, "lafel"); assert.equal(b.cod, "bine");
  assert.equal(r.cuvant, "Mai slabă decât piața, până acum");
  assert.equal(s.cuvant, "Cam cât piața, până acum");
  assert.equal(b.cuvant, "Mai bună decât piața, până acum");
  assert.match(r.fraza, /^Lista de revenire a făcut mai rău decât piața: mediana −3,2 pp la 7 zile, mai bine decât piața doar în 10 din 29 de zile\.$/);
  assert.match(s.fraza, /mediana \+1,2 pp/); assert.match(s.fraza, /13 din 31 de zile/); assert.match(s.fraza, /pentru un short/);
  for (const v of [r, s, b]) assert.match(v.nota, /^nedovedit: doar \d+ ferestre de 7 zile care nu se suprapun/);
});
await test("2 prea devreme", () => {
  const v = IB.listeVerdict({ zile: 3, exces: 0.05, zilePeste: 1, ferestre: 1, peZile: [] }, false);
  assert.equal(v.cod, "devreme"); assert.match(v.cuvant, /^Prea devreme/);
  assert.equal(IB.listeVerdict(null, false).cod, "devreme");
});
await test("3 „Ce aș face eu” pe fiecare listă", () => {
  assert.match(IB.listeVerdict(rev, false).fac, /^N-aș porni și n-aș ține un bot long doar pentru că moneda e pe lista de revenire\.$/);
  assert.match(IB.listeVerdict(sh, true).fac, /n-a adus nimic peste piață/);
  assert.match(IB.listeVerdict(bun, false).fac, /n-aș mări un bot doar pe ea/);
});
await test("4 rândul „Verdict” pentru botul tău, primul", () => {
  const o = { moneda: "HYPE", dirBot: "short", rev: ["ZEC"], short: ["HYPE", "AKE"], fata: { revenire: rev, short: sh } };
  const r = IB.listeRadar(o);
  assert.equal(r[0].k, "liste-verdict"); assert.equal(r[0].eticheta, "Verdict");
  assert.equal(r[0].text, "HYPE e pe lista short, de partea botului tău, dar lista short a fost cam cât piața: nu e un motiv în plus să ții sau să mărești botul.");
  const c = IB.listeRadar(Object.assign({}, o, { rev: ["HYPE"], short: [] }));
  assert.equal(c[0].text, "HYPE e pe lista de revenire, contra botului tău short, iar lista de revenire a făcut mai rău decât piața: semnalul contra cântărește puțin.");
  const n = IB.listeRadar(Object.assign({}, o, { rev: [], short: [] }));
  assert.equal(n[0].text, "HYPE nu e azi pe liste: listele nu spun nimic despre botul tău.");
  assert.equal(r.map((x) => x.k).join(","), "liste-verdict,liste-azi,liste-rev,liste-short", "rândurile de până acum rămân");   /* tablouri din vm */
});
await test("5 în cartelă: verdictul sus, fără culori de câștig, cifrele rămân", () => {
  const h = IB.listeGraficHtml({ revenire: rev, short: sh }, esc), t = text(h);
  assert.match(h, /class="lrVerdict"/);
  assert.ok(t.indexOf("Mai slabă decât piața, până acum") < t.indexOf("mediana zilelor"), "verdictul stă deasupra cifrelor");
  assert.match(t, /👉 N-aș porni și n-aș ține un bot long doar pentru că moneda e pe lista de revenire\./);
  assert.match(t, /nedovedit: doar 5 ferestre de 7 zile/);
  assert.match(t, /mediana zilelor: −3,2 pp/, "cifrele de până acum rămân"); assert.match(t, /ultima zi, /);
  assert.doesNotMatch(h, /class="[^"]*\b(good|bad)\b/, "fără verde / roșu");
  const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.match(css, /\.lrVerdict\{/);
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
