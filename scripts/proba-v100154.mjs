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

const telV = G.desen(Object.assign({}, baza, { W: 344, ingust: true })).valori, mareV = G.desen(Object.assign({}, baza, { W: 1400, ingust: false })).valori;
await test("(1) v100.157 (el: „aș integra altfel valorile în grafic” → fâșia de valori): pe telefon valorile NU mai stau pe grafic, ci sub el, câte una pe rând, în ordinea prețului, cu șansa la vedere (faptă, cerută pe 08.10); ecranul mare la fel ca înainte", () => {
  assert.doesNotMatch(tel, /class="gbTag"|grid↓\+ 1\.9800|>↓ lichidare|>botul pornit/, "pe grafic: doar liniile și prețul de acum");
  assert.match(telV, /<li title="23% din drumuri ating linia"><i style="background:#5B8FC7"><\/i><span class="gbVN">grila de jos<\/span><b class="gbVP">1\.9800<\/b><span class="gbVD">−2,5%<\/span><span class="gbVS">23%<\/span><\/li>/, "rândul: culoarea liniei · nume · preț · față de acum · șansa");
  assert.match(telV, /<span class="gbVN">↓ lichidare<\/span><b class="gbVP">1\.5000<\/b>/, "și cele din afara graficului, cu săgeata");
  const ord = [...telV.matchAll(/<b class="gbVP">([\d.]+)<\/b>/g)].map((m) => +m[1]); assert.deepEqual(ord, ord.slice().sort((a, b) => b - a), "în ordinea prețului: " + ord);
  assert.equal(mareV, "", "ecranul mare: fără fâșie");
  assert.match(mare, /class="gbTag"/); assert.match(mare, /class="gbSansa"[^>]*>23%/);
});
await test("(2) prețul de acum: pe telefon chenar pe fondul graficului, cifra deschisă (nu cutie albă plină); pe ecranul mare neschimbat", () => {
  const C = G.COL;
  assert.match(tel, new RegExp(`height="22" rx="2" fill="${C.fond}" stroke="${C.text}" stroke-width="1.2"/><text [^>]*font-size="13.5" font-weight="700" fill="${C.text}">`));
  assert.match(mare, new RegExp(`height="22" rx="2" fill="${C.text}"/><text [^>]*fill="#0E141A">acum `));
});
await test("(3)(4) „botul pornit hh:mm”: pe telefon ultimul rând din fâșie (linia lui rămâne pe grafic); pe ecranul mare neatins", () => {
  assert.match(tel, /class="gbPornit"/, "linia pornirii rămâne");
  assert.match(telV, /<span class="gbVN">botul pornit<\/span><b class="gbVP">\d\d:\d\d<\/b><span class="gbVD"><\/span><span class="gbVS"><\/span><\/li><\/ul>$/, "ultimul rând");
  const yLichMare = +(mare.match(/<text x="8" y="([\d.]+)"[^>]*>↓ lichidare/) || [])[1], yPornitMare = +(mare.match(/y="([\d.]+)"[^>]*>botul pornit/) || [])[1];
  assert.equal(yLichMare, yPornitMare - 1, "ecranul mare neatins (cerut: doar pe telefon)");
});
await test("(4b) RSI: cifra pragului 70 rămâne la vedere și nu calcă „RSI nn” - pe telefon și pe ecranul mare (v100.155)", () => {
  const g = citeste("public", "lib", "grafic-bot.js");
  assert.match(g, /if \(v === 70 && yt - \(ry0 \+ 14\) < 14\) yt = RY\(v\) \+ 14;/);
  for (const s of [tel, mare]) {
    const yR = +(s.match(/y="([\d.]+)" font-size="12\.5" fill="[^"]+">RSI /) || [])[1], y70 = +(s.match(/y="([\d.]+)" font-size="12" fill="[^"]+">70<\/text>/) || [])[1], y30 = +(s.match(/y="([\d.]+)" font-size="12" fill="[^"]+">30<\/text>/) || [])[1];
    assert.ok(yR > 0 && y70 > 0 && y30 > 0, [yR, y70, y30].join(" / ")); assert.ok(y70 - yR >= 14 && y30 - y70 >= 14, "rânduri separate: " + [yR, y70, y30].join(" / "));
  }
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
  assert.match(CSS, /#grAlte\+p\{order:61\}/, "regula NU era moartă (revizia a treia, M4): prinde nota „✓ Rândul Pentru TradingView…”");
});

await test("(6) v100.155: bara de analiză la 981–1359 px - butoanele pe rândul de sub câmpuri („Analizează piața” acoperea sursa); bara de sus - grupul din stânga nu se strânge sub banda botului", () => {
  assert.ok(CSS.includes("@media (min-width:981px) and (max-width:1359px){.toolbar{grid-template-columns:minmax(0,1fr)}.toolbar>.actions{grid-column:1;grid-row:2;margin-top:7px}"), "rândul butoanelor");
  assert.ok(CSS.includes(".topStatus>.topLeft{flex:0 0 auto}"), "grupul din stânga");
  assert.ok(CSS.trim().split("\n").pop().startsWith("@media (max-width:640px){.sugPandaTab thead"), "regula pandei rămâne ultima");
});

await test("(7) v100.156 (poza lui de pe telefon): fără contur sub literele graficului pe telefon (browserul care întunecă singur pagina îl făcea ALB); pe ecranul mare rămâne; pagina se declară întunecată în <head>; bara de jos opacă", () => {
  assert.doesNotMatch(tel, /paint-order="stroke"/, "telefon: niciun contur");
  assert.match(mare, /paint-order="stroke" stroke="#0E141A"/, "ecranul mare: conturul rămâne");
  const HTML = citeste("public", "index.html");
  assert.match(HTML, /<meta content="dark" name="color-scheme"\/>/);
  assert.match(CSS, /background:#141C24;backdrop-filter:none;\s*\/\* v100\.156/, "bara de jos opacă");
});

await test("(8) revizia a treia: Jurnal pe Acțiuni = „Câștigat REAL” (toată istoria, ca pe Crypto), pe Tot cu perioada aleasă; antetul urmează fila pe loc; pliatul fâșiei legat de strat; nota de sub „Alte setări” la locul ei; bara de sus nu fuge din ecran", () => {
  assert.match(AS, /if \(fila === "actiuni"\) \{ cel = ref && ref\.querySelector\("\.jtKpi \.tbKpiCel"\)/);
  assert.match(AS, /tx\("\.stGrup \[aria-pressed=\\"true\\"\]", ref\)/, "Tot: perioada aleasă");
  assert.match(AS, /closest\("#jurnaltrade \.jtFiltru"\)\) setTimeout\(function \(\) \{ try \{ pagJurnal\(\); \}/);
  assert.match(AS, /"CRYPTO: " \+ \(v \? v\.textContent\.trim\(\) : "—"\)/);
  assert.ok(CSS.includes("html.pzDemo body:not(.pzFasiaDeschisa):has(main>#cloud.on,main>#settings.on,main>#health.on) main :is(.heroStrip,.tabs){display:none}"), "fără strat fâșia rămâne la vedere");
  assert.ok(CSS.includes(".pzDemo #grFisa>#grAlte+p{order:61}") && CSS.includes(".topStatus>.topRight{justify-content:safe center}"));
});

console.log(`\n${teste - picate}/${teste} verzi`);
if (picate) process.exit(1);
