// Proba v100.301 (el, 04.11.2026 seara: „auditează și îmbunătățește dacă ai idei” - auditul paginii Range Filter, 0 🔴 / 3 🟡 / 5 🔵):
//   1. DOVADA pe 1.000 de bare: a doua pagină cu endTime = prima bară − 1, rândurile se lipesc înaintea primei pagini, bara în formare cade;
//      refuzul Pionex (200 {result:false, retryAfter}) pe oricare pagină oprește bucla; implicit OFF (o singură cerere / monedă);
//   2. cache pe interval: rfTf păstrează citirea intervalului vechi și o întoarce fără cereri noi când revii (sub 10 min);
//   3. ordinea cartelelor (boții → semnale din ultimele 3 bare, cele mai noi primele → restul) + filtrele Toate / Semnale noi / Boții tăi;
//   4. rezumatul: „Contra boților tăi” din direcția botului (LONG / SHORT) față de direcția RF; ora barei următoare; intro-ul pliat (details);
//   5. rândul din Tablou: stopul (filtru) la X % + „NU TRECE” sub 2× cost; Trade-ul zilei: refuzul Pionex citit din răspuns;
//   6. legarea: rfFiltru / rfAdanc în lista albă; versiunile v100.301.
//   node scripts/proba-v100301.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); });
}
console.log("\nV100.301 · Range Filter auditat · proba\n");

const D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
const randuri = (bare) => bare.map((b) => ({ time: b.t, open: b.o, high: b.h, low: b.l, close: b.c }));
function context(getJSON, extra) {
  const c = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout, document: { getElementById: () => null } };
  c.window = c; c.module = undefined; c.getJSON = getJSON; Object.assign(c, extra || {});
  vm.createContext(c);
  for (const f of ["text-ro.js", "grid-calcul.js", "range-filter.js", "range-filter-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c);
  return c;
}
const simb = (b, cl) => [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata" }];
const clasament = async () => ({ clasament: { monede: [] } });

await test("1a. DOVADA pe 1.000 de bare: a doua pagină cu endTime = prima bară − 1, lipită înaintea primei; implicit OFF = o singură cerere", async () => {
  const B = D.bare, jum = Math.floor(B.length / 2), p1 = randuri(B.slice(jum)), p2 = randuri(B.slice(0, jum)); const ceruri = [];
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); ceruri.push(u); const m = u.match(/endTime=(\d+)/); return { result: true, data: { klines: m ? (Number(m[1]) === B[jum].t - 1 ? p2 : []) : p1 } }; };
  const c = context(getJSON, { tzSimboluri: simb });
  await vm.runInContext("rfPorneste(true)", c);
  assert.equal(ceruri.length, 1, "implicit o singură cerere"); assert.equal(c.rfStare.monede[0].c.n, p1.length - 1, "500 − bara în formare");
  ceruri.length = 0;
  await vm.runInContext("rfAdanc()", c);
  assert.equal(ceruri.length, 2, "cu DOVADA pe 1.000: două cereri"); assert.match(ceruri[1], /endTime=\d+/);
  assert.equal(c.rfStare.monede[0].c.n, B.length - 1, "ambele pagini, fără bara în formare");
  assert.equal(c.rfStare.adanc, true);
  const cPlin = c.RangeFilter.citire(B); assert.equal(c.rfStare.monede[0].c.dovada.n, cPlin.dovada.n, "aceeași DOVADA ca pe toate barele");
});

await test("1b. refuzul Pionez pe a doua pagină oprește bucla cu mesajul la vedere", async () => {
  const p1 = randuri(D.bare); let n = 0;
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); n++; return /endTime/.test(u) ? { result: false, error: "Pionex rate limit", retryAfter: 30 } : { result: true, data: { klines: p1 } }; };
  const c = context(getJSON, { tzSimboluri: (b, cl) => [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata" }, { simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata" }] });
  c.rfStare.adanc = true;
  await vm.runInContext("rfPorneste(true)", c);
  assert.equal(n, 2, "după refuz nu se mai cere a doua monedă"); assert.match(c.rfStare.eroare, /refuzat/); assert.equal(c.rfStare.monede.length, 1);
});

await test("2. cache pe interval: 1h → 4h → 1h nu reface cererile pe 1h (sub 10 min)", async () => {
  // v100.302: cache-ul ține doar până se închide bara următoare ⇒ lumânările probei mutate în prezent (ultima = bara în formare)
  const dt = Math.floor(Date.now() / 3600000) * 3600000 - D.bare[D.bare.length - 1].t;
  const p1 = randuri(D.bare).map((r) => Object.assign({}, r, { time: r.time + dt })); const ceruri = [];
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); ceruri.push(u); return { result: true, data: { klines: p1 } }; };
  const c = context(getJSON, { tzSimboluri: simb });
  await vm.runInContext("rfPorneste(true)", c); assert.equal(ceruri.length, 1); assert.match(ceruri[0], /interval=60M/);
  await vm.runInContext("rfTf('4H')", c); assert.equal(ceruri.length, 2); assert.match(ceruri[1], /interval=4H/); assert.equal(c.rfStare.tf, "4H");
  await vm.runInContext("rfTf('60M')", c); assert.equal(ceruri.length, 2, "1h vine din cache"); assert.equal(c.rfStare.tf, "60M"); assert.equal(c.rfStare.monede.length, 1);
  assert.ok(c.rfStare.perTf["4H"] && c.rfStare.perTf["4H"].monede.length === 1, "4h rămâne în cache");
});

await test("3. ordinea cartelelor + filtrele: boții primii, apoi semnalele noi (cele mai noi primele), apoi restul; „Semnale noi” / „Boții tăi”", () => {
  const c = context(async () => ({}), {});
  const cit = c.RangeFilter.citire(D.bare), vechi = Object.assign({}, cit, { semnal: { fel: "SELL", acum: 40, pret: 1 } }), nou = Object.assign({}, cit, { semnal: { fel: "BUY", acum: 1, pret: 1 } }), nou3 = Object.assign({}, cit, { semnal: { fel: "SELL", acum: 3, pret: 1 } });
  const monede = [{ simbol: "AAA", fel: "top", c: vechi }, { simbol: "BBB", fel: "top", c: nou3 }, { simbol: "CCC", fel: "top", c: nou }, { simbol: "DOGE", fel: "bot", c: vechi, directie: "LONG" }];
  const ord = c.rfOrdoneaza(monede).map((m) => m.simbol);
  assert.deepEqual(ord, ["DOGE", "CCC", "BBB", "AAA"]);
  assert.deepEqual(c.rfFiltreaza(monede, "semnale").map((m) => m.simbol), ["BBB", "CCC"]);
  assert.deepEqual(c.rfFiltreaza(monede, "boti").map((m) => m.simbol), ["DOGE"]);
  const h = c.rfHtml({ monede, la: Date.now(), inLucru: false, eroare: null, simboluri: monede, tf: "60M", filtru: "semnale", adanc: false, perTf: {} });
  assert.ok(h.indexOf('aria-label="CCC"') < h.indexOf('aria-label="BBB"') && h.indexOf('aria-label="AAA"') < 0 && h.indexOf('aria-label="DOGE"') < 0, "filtrul Semnale noi arată doar BBB și CCC, în ordinea noutății");
  assert.match(h, /semnal nou/); assert.match(h, /rfFiltru\('boti'\)/); assert.match(h, /rfAdanc\(\)/);
  const h2 = c.rfHtml({ monede: [monede[0]], la: Date.now(), inLucru: false, eroare: null, simboluri: [1], tf: "60M", filtru: "boti", adanc: false, perTf: {} });
  assert.match(h2, /Niciun bot activ/);
});

await test("4. rezumatul: „Contra boților tăi” din direcția botului față de RF; ora barei următoare; intro pliat (details); textul cinstit rămâne", () => {
  const c = context(async () => ({}), {});
  const cit = c.RangeFilter.citire(D.bare);   // BTC: dir din date
  const contra = cit.dir === 1 ? "SHORT" : "LONG", cu = cit.dir === 1 ? "LONG" : "SHORT";
  const st = { monede: [{ simbol: "DOGE", fel: "bot", c: cit, directie: contra }, { simbol: "XRP", fel: "bot", c: cit, directie: cu }, { simbol: "BTC", fel: "piata", c: cit }], la: Date.now(), inLucru: false, eroare: null, simboluri: [1, 2, 3], tf: "60M", filtru: "toate", adanc: false, perTf: {} };
  const h = c.rfHtml(st);
  // v100.302: după „DOGE (…)” urmează „(RF e nedovedit: de privit…)” - comentariul pe rândul LUI, ca să nu înghită aserțiunea de după
  assert.match(h, /Contra boților tăi: DOGE \((long|short), RF (sus|jos)\)[ .]/); assert.doesNotMatch(h, /Contra boților tăi: [^.]*XRP/);
  assert.match(h, /botul tău · CONTRA/); assert.match(h, /bara următoare se închide la \d{2}:\d{2}/);
  assert.equal(c.rfUrmatoarea(st), cit.t + 2 * 3600000);
  assert.match(h, /<details class="rfIntro"><summary>/); assert.match(h, /NIMIC nu s-a dovedit/); assert.match(h, /colorant de trend/);
  const dir = c.rfDirectiiBoti([{ activ: true, baza: "DOGE", quote: "USDT", directie: "LONG" }, { activ: false, baza: "XRP", directie: "SHORT" }, { activ: true, baza: "BTC.PERP", directie: "SHORT" }]);
  assert.equal(JSON.stringify(dir), JSON.stringify({ DOGE: "LONG", BTC: "SHORT" }));   // alt realm vm ⇒ prototipuri diferite
});

await test("5. rândul din Tablou: stopul (filtru) la X % și NU TRECE sub 2× cost; Trade-ul zilei citește refuzul Pionex din răspuns", async () => {
  const A = citeste("public", "app.js");
  const i0 = A.indexOf("var tbRfStare={"), i1 = A.indexOf("function tbCitireExtra(b,o){");
  const c2 = { console, Math, Number, String, Object, Array, isFinite, JSON, Date, TabloBot: { simboluri: (baza) => ({ pionex: baza + "_USDT_PERP", moneda: baza }) } };
  vm.createContext(c2);
  for (const f of ["text-ro.js", "grid-calcul.js", "range-filter.js"]) vm.runInContext(citeste("public", "lib", f), c2);
  vm.runInContext(A.slice(i0, i1), c2);
  c2.tbRfStare.cheie = "BTC_USDT_PERP"; c2.tbRfStare.bare = c2.GridCalcul.bare(randuri(D.bare)); c2.tbRfStare.la = Date.now();
  const r = c2.tbRangeFilterRand({ baza: "BTC", quote: "USDT", directie: "LONG" });
  assert.match(r.text, /stop \(filtru\) la \d+,\d%/, r.text);
  const cit = c2.RangeFilter.citire(c2.tbRfStare.bare);
  if (cit.costNu) assert.match(r.text, /NU TRECE/); else assert.doesNotMatch(r.text, /NU TRECE/);
  const T = citeste("public", "lib", "trade-zilei-ecran.js");
  assert.match(T, /if \(k && k\.result === false && k\.retryAfter != null\) \{[^\n]*tzStare\.eroare = "Pionex a refuzat/, "tz: refuzul citit din răspuns");
  // în vm: refuz la prima monedă ⇒ o singură cerere de lumânări, mesajul la vedere
  const c3 = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout, document: { getElementById: () => null } }; let n = 0;
  c3.getJSON = async (u) => { if (/clasament/.test(u)) return { clasament: { monede: [{ simbol: "AAA_USDT_PERP", volum: 2 }] } }; if (/bot-orders/.test(u)) return { bots: [] }; n++; return { result: false, error: "rate", retryAfter: 9 }; };
  vm.createContext(c3); for (const f of ["text-ro.js", "grid-calcul.js", "trade-zilei.js", "trade-zilei-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c3);
  await vm.runInContext("tzPorneste(true)", c3);
  assert.equal(n, 1); assert.match(c3.tzStare.eroare, /refuzat/);
});

await test("6. legarea: rfFiltru / rfAdanc în lista albă (cuvinte separate); CSS-ul filtrelor; versiunile v100.301 peste tot", () => {
  const A = citeste("public", "app.js"), C = citeste("public", "app.css"), H = citeste("public", "index.html");
  const lista = A.match(/var ACTIUNI_PERMISE=new Set\("([^"]*)"/)[1].split(/\s+/);
  for (const n of ["rfFiltru", "rfAdanc", "rfPorneste", "rfTf", "rfLaGrid", "tzLaGrid", "acasaDeschideAnaliza"]) assert.ok(lista.includes(n), "lipsește: " + n);
  assert.match(C, /#rangefilter \.rfFiltre\{/); assert.match(C, /details\.rfIntro summary/);
  assert.ok((H.match(/v100\.(30[1-9]|3[1-9]\d|[4-9]\d\d)/g) || []).length >= 3); assert.doesNotMatch(H, /v100\.300 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(30[1-9]|3[1-9]\d|[4-9]\d\d)"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(30[1-9]|3[1-9]\d|[4-9]\d\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, /^v100\.(30[1-9]|3[1-9]\d|[4-9]\d\d)$/); assert.ok(B.features.rangeFilterAudit301);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 301);
  assert.match(citeste("package.json"), /npm run test:v100300 && npm run test:v100301/);
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
