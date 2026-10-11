// Proba v100.154 (11.10.2026, el: „graficul pe telefon se vede cu scris aiurea mult alb, e și încadrat rău. doar pe telefon”):
// (1) pe telefon (ingust) etichetele din dreapta fără cutie și fără procentul de șansă (rămâne în title); ecranul mare neatins
// (2) prețul de acum pe telefon: chenar, nu cutie albă plină · (3) „↓ lichidare …” nu mai stă pe rândul lui „botul pornit”
// (4) „botul pornit” lângă marginea dreaptă se scrie spre stânga · (5) Jurnal pe Acțiuni / Tot + Sugestii cu eroarea + aria-controls
// Poza la 390 px (0 suprapuneri, 0 texte ieșite) se face în browser; aici gărzile pe SVG și pe cititori.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const AS = citeste("public", "lib", "asezare-paznic.js"), CSS = citeste("public", "app.css");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.154 · graficul pe telefon + mărunte · proba\n");

const ACUM = Date.UTC(2026, 9, 11, 15, 0, 0), M5 = 300000;
const B = Array.from({ length: 40 }, (_, i) => { const c = 2 + Math.sin(i / 5) * 0.05; return { t: ACUM - (40 - i) * M5, o: c - 0.004, h: c + 0.01, l: c - 0.01, c, v: 10 + i }; });
const niv = [{ p: 1.98, t: "grila de jos", s: "grid↓+", c: "#5B8FC7", sansa: "23%", sansaLung: "23% din drumuri ating linia" }, { p: 1.5, t: "lichidare", s: "lich", c: "#E0524A", st: "lich" }];
const baza = { bare: B, st: { rsi: true }, niv, alerte: [], per: "5m", acum: ACUM, pornit: B[35].t, pretViu: 2.03 };
const tel = G.desen(Object.assign({}, baza, { W: 344, ingust: true })).svg, mare = G.desen(Object.assign({}, baza, { W: 1400, ingust: false })).svg;

await test("(1) etichetele din dreapta: pe telefon fără cutie colorată și cu litera 12 (cutia + litera 13 scoteau „23%” din grafic); șansa rămâne la vedere (faptă, cerută pe 08.10); ecranul mare la fel ca înainte", () => {
  assert.doesNotMatch(tel, /class="gbTag"/);
  assert.match(tel, /font-size="12" fill="#5B8FC7"><title>[^<]*23% din drumuri ating linia<\/title>grid↓\+ 1\.9800 <tspan class="gbSansa"[^>]*>23%<\/tspan>/, "șansa la vedere, în eticheta din dreapta");
  assert.match(mare, /class="gbTag"/); assert.match(mare, /class="gbSansa"[^>]*>23%/);
});
await test("(2) prețul de acum: pe telefon chenar pe fondul graficului, cifra deschisă (nu cutie albă plină); pe ecranul mare neschimbat", () => {
  const C = G.COL;
  assert.match(tel, new RegExp(`height="22" rx="2" fill="${C.fond}" stroke="${C.text}" stroke-width="1.2"/><text [^>]*font-size="13.5" font-weight="700" fill="${C.text}">`));
  assert.match(mare, new RegExp(`height="22" rx="2" fill="${C.text}"/><text [^>]*fill="#0E141A">acum `));
});
await test("(3)(4) jos în grafic: „↓ lichidare” urcă un rând când „botul pornit” e desenat; „botul pornit” lângă marginea dreaptă se scrie spre stânga", () => {
  const yPornit = +(tel.match(/<text x="[\d.]+"(?: text-anchor="end")? y="([\d.]+)"[^>]*>botul pornit/) || [])[1];
  const yLich = +(tel.match(/<text x="8" y="([\d.]+)"[^>]*>↓ lichidare/) || [])[1];
  assert.ok(yPornit > 0 && yLich > 0, yPornit + " / " + yLich); assert.ok(yPornit - yLich >= 14, "rânduri separate: " + yLich + " vs " + yPornit);
  assert.match(tel, /text-anchor="end" y="[\d.]+" font-size="12" fill="[^"]+" paint-order="stroke"[^>]*>botul pornit/, "pornit la bara 35 din 40 ⇒ spre stânga liniei");
  const yLichMare = +(mare.match(/<text x="8" y="([\d.]+)"[^>]*>↓ lichidare/) || [])[1], yPornitMare = +(mare.match(/y="([\d.]+)"[^>]*>botul pornit/) || [])[1];
  assert.equal(yLichMare, yPornitMare - 1, "ecranul mare neatins (cerut: doar pe telefon)");
});
await test("(4b) RSI pe telefon: cifra pragului 70 se scrie doar când nu calcă „RSI nn”", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  assert.match(g, /var loc = !ingust \|\| RY\(v\) \+ 4 - \(ry0 \+ 14\) >= 14;/);
  assert.match(mare, />70<\/text>/);
});
const doc = { documentElement: { classList: { add() {} } }, addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
const ctx = { document: doc, setInterval() {}, setTimeout() {}, clearTimeout() {}, addEventListener() {}, innerWidth: 1920, localStorage: { getItem: () => null, setItem() {} }, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(AS, ctx);
const A = ctx.AsezarePaznic;
await test("(5) Jurnal pe Acțiuni / Tot: „Rezultat total” citit în formatul paginii (ro-RO: mii cu punct); „—” e lipsă, nu zero; Sugestii: eroarea și lățimea veche în antet; aria-controls; regula moartă scoasă", () => {
  assert.equal(A.valBani("+0,00 lei"), 0); assert.equal(A.valBani("−1.234 lei"), -1234); assert.equal(A.valBani("−12,50 lei"), -12.5); assert.equal(A.valBani("+1.234,56 $"), 1234.56); assert.equal(A.valBani("—"), null);
  assert.match(AS, /if \(f === "actiuni" \|\| f === "tot"\) \{ pagJurnalAltaFila\(f\); return; \}/);
  assert.match(AS, /#sugPagina \.sugPanda p\.tbSub/); assert.match(AS, /lățimea e " \+ capSub/);
  assert.match(AS, /b\.setAttribute\("aria-controls", h\.id\)/);
  assert.doesNotMatch(CSS, /#grAlte\+p\{order/);
});

console.log(`\n${teste - picate}/${teste} verzi`);
if (picate) process.exit(1);
