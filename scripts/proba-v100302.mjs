// Proba v100.302 (el, 05.11.2026: „vreau să reauditezi rf b&s script și integrarea din radar, să optimizezi și să vii cu idei” + „in pump
// filter in radar pune si o casuta unde sa analizez o moneda anume”) - re-auditul (AUDIT-RF-REAUDIT-2026-11-05: Radar 0 🔴 / 8 🟡 / 9 🔵):
//   1. motorul ca Pine: „de N bare” = ta.barssince(fdir != fdir[1]) (era +1); ținerea = MEDIANA (ca proba și Pine v2.4+); flip la X ATR;
//   2. DOVEDIT pe pagină corectat pentru câte monede se văd (Bonferroni pe marginea Wilson): pe 30 de monede, ~16 % din pagini aveau un DOVEDIT din noroc;
//   3. textele cinstite: „SEMNAL BUY pe ultima bară închisă” (nu „GO LONG ACUM”), „flip la X ATR” (nu „la un pas de flip”), pragul costului exact
//      („prag 0,26%”, nu „2× cost 0,1%”), DOVADA „k din n” sub 20 de cazuri, rezerva din CE FAC? rămâne și când e DOVEDIT;
//   4. căsuța „Analizează o monedă”: simbolul curățat (PEPE, pepe/usdt, PEPEUSDT.P), perp întâi, spot dacă perp-ul n-are lumânări, cartela „căutată”,
//      refăcută la schimbarea intervalului; textul tastat rămâne la redesenare;
//   5. căderea PARȚIALĂ se vede: „X monede necitite”, păstrată în cache-ul pe interval, citirea parțială nu e „proaspătă”;
//   6. cache-ul ține până la închiderea barei următoare (nu 10 min orbește); lumânările ținute pe (monedă, interval): DOVADA pe 1.000 cere doar
//      pagina a doua, „Recitește” în aceeași bară nu mai cere nimic;
//   7. Tabloul: refuzul se reîncearcă după 1 min (nu 10), „puține cazuri” ca pe pagină, CONTRA = info (RF nedovedit), citirea ținută minte;
//   8. redesenarea pe zone (intro-ul, căsuța nu se refac), butoanele dezactivate cât citește; doi boți LONG + SHORT pe aceeași monedă = AMBELE;
//   9. legarea: rfCauta / rfCautaScrie în lista albă, CSS (rând care se rupe pe telefon, căsuța, culorile casei), versiunile v100.302.
//   node scripts/proba-v100302.mjs
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
console.log("\nV100.302 · Range Filter re-auditat + căsuța „Analizează o monedă” · proba\n");

const D = JSON.parse(citeste("scripts", "proba-date", "rf-btc-1h.json"));
const H = 3600000;
const randuri = (bare, dt) => bare.map((b) => ({ time: b.t + (dt || 0), open: b.o, high: b.h, low: b.l, close: b.c }));
// lumânările mutate în prezent: ultima e bara în formare (GridCalcul.bare o aruncă), ultima închisă = ora trecută
const dtAcum = Math.floor(Date.now() / H) * H - D.bare[D.bare.length - 1].t;
function context(getJSON, extra) {
  const c = { console, Intl, Date, Math, Number, String, Object, Array, isFinite, JSON, Promise, setTimeout, document: { getElementById: () => null } };
  c.window = c; c.module = undefined; c.getJSON = getJSON; Object.assign(c, extra || {});
  vm.createContext(c);
  for (const f of ["text-ro.js", "grid-calcul.js", "range-filter.js", "range-filter-ecran.js"]) vm.runInContext(citeste("public", "lib", f), c);
  return c;
}
const unul = () => [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata" }];
const trei = () => [{ simbol: "BTC", pionex: "BTC_USDT_PERP", fel: "piata" }, { simbol: "ETH", pionex: "ETH_USDT_PERP", fel: "piata" }, { simbol: "SOL", pionex: "SOL_USDT_PERP", fel: "piata" }];
const clasament = async () => ({ clasament: { monede: [] } });

await test("1. motorul ca Pine: „de N bare” = ta.barssince (fără +1), ținerea = MEDIANA, flip la X ATR din bandă", () => {
  const c = context(async () => ({}));
  const R = c.RangeFilter, cit = R.citire(D.bare), cl = D.bare.map((b) => b.c), m = R.motor(cl), L = cl.length - 1;
  let F = L; while (F > 0 && m.fdir[F] === m.fdir[F - 1]) F--;
  assert.equal(cit.bareDir, L - F, "barele de la flip, ca ta.barssince(fdir != fdir[1])");
  const warm = 3 * (2 * R.PER - 1), idx = []; for (let j = warm; j < cl.length; j++) if (m.buy[j] || m.sell[j]) idx.push(j);
  const tin = idx.slice(1).map((j, i) => j - idx[i]).sort((a, b) => a - b), med = tin.length % 2 ? tin[tin.length >> 1] : (tin[tin.length / 2 - 1] + tin[tin.length / 2]) / 2;
  assert.equal(cit.tinere, med, "mediana ținerilor");
  const flip = cit.dir === 1 ? cit.distAtr + cit.bandAtr : cit.bandAtr - cit.distAtr;
  assert.ok(Math.abs(cit.flipAtr - flip) < 1e-12 && cit.flipAtr > 0, "flip = distanța până la banda opusă");
});

await test("2. DOVEDIT corectat pe pagină (Bonferroni): z(1) ≈ 1,96, z(30) ≈ 3,14; 28 din 40 = DOVEDIT singur, NU pe o pagină de 30", () => {
  const c = context(async () => ({}));
  const R = c.RangeFilter;
  assert.ok(Math.abs(R.zBonf(1) - 1.96) < 0.01, "z(1) = " + R.zBonf(1)); assert.ok(Math.abs(R.zBonf(30) - 3.14) < 0.02, "z(30) = " + R.zBonf(30));
  assert.ok(R.wilsonLo(28, 40) > 0.5 && R.wilsonLo(28, 40, R.zBonf(30)) < 0.5);
  const cit = R.citire(D.bare), d = { n: 40, k: 28, hit: 70, lo: R.wilsonLo(28, 40) * 100, dovedit: true };
  const moneda = (s) => ({ simbol: s, pionex: s + "_USDT_PERP", fel: "top", c: Object.assign({}, cit, { dovada: d }) });
  const una = c.rfTexte(moneda("AAA").c, c.rfZPagina([moneda("AAA")]));
  assert.match(una.dovadaR, /· DOVEDIT/); assert.doesNotMatch(una.dovadaR, /NEDOVEDIT/); assert.match(una.ceFac, /DOVADA e pe direcție, fără cost/, "rezerva rămâne și când e DOVEDIT");
  const pagina = Array.from({ length: 30 }, (_, i) => moneda("M" + i));
  const t30 = c.rfTexte(pagina[0].c, c.rfZPagina(pagina));
  assert.match(t30.dovadaR, /NEDOVEDIT/); assert.match(t30.dovadaR, /30 de monede/);
  const h = c.rfHtml({ monede: pagina, la: Date.now(), inLucru: false, eroare: null, simboluri: pagina, tf: "60M", filtru: "toate", adanc: false, perTf: {}, cauta: {} });
  assert.doesNotMatch(h, /· DOVEDIT/, "pe pagina de 30 niciun DOVEDIT din 28 / 40");
});

await test("3. textele cinstite: SEMNAL pe bara închisă (nu GO … ACUM), flip la X ATR, prag 0,26%, DOVADA „k din n” sub 20 de cazuri", () => {
  const c = context(async () => ({}));
  const cit = c.RangeFilter.citire(D.bare);
  const acum = Object.assign({}, cit, { semnalAcum: true, semnal: { fel: "BUY", acum: 0, pret: cit.pret }, costNu: true, distPct: 0.0021, dovada: { n: 12, k: 7, hit: 58.3, lo: 31, dovedit: false } });
  const t = c.rfTexte(acum, 1.96);
  assert.match(t.trigger, /^SEMNAL BUY pe ultima bară închisă/); assert.doesNotMatch(t.trigger, /GO (LONG|SHORT) ACUM/);
  assert.match(t.triggerR, /prag 0,26%/, t.triggerR); assert.match(t.triggerR, /NU TRECE/);
  assert.match(t.ceFac, /nu intru/);
  assert.match(t.locR, /flip la \d+,\d ATR/); assert.doesNotMatch(JSON.stringify(t), /la un pas de flip/);
  assert.match(t.dovada, /^7 din 12/, t.dovada); assert.match(t.dovadaR, /puține cazuri|PUȚINE CAZURI/);
  assert.doesNotMatch(citeste("public", "lib", "range-filter-ecran.js"), /la un pas de flip/);
  assert.match(t.detalii, /ținere mediană/);
});

await test("4a. căsuța: simbolul curățat; perp întâi, apoi spot; cartela „căutată”; nimic cerut pe un simbol stricat", async () => {
  const c = context(async () => ({}));
  for (const [x, y] of [["pepe", "PEPE"], [" PEPE/usdt ", "PEPE"], ["pepeusdt.p", "PEPE"], ["PEPE_USDT_PERP", "PEPE"], ["1000bonk", "1000BONK"], ["btc-usdt", "BTC"]]) assert.equal(c.rfNormalizeaza(x), y, x);
  for (const x of ["", "  ", "<script>", "a b", "USDT", "XXXXXXXXXXXXXXXXXXXXXX"]) assert.equal(c.rfNormalizeaza(x), null, JSON.stringify(x));
  const ceruri = [], p = randuri(D.bare, dtAcum);
  const getJSON = async (u) => { ceruri.push(u); if (/PEPE_USDT_PERP/.test(u)) return { result: true, data: { klines: p } }; if (/WIF_USDT_PERP/.test(u)) return { result: false, error: "Pionex klines unavailable", retryAfter: null }; if (/WIF_USDT&/.test(u)) return { result: true, data: { klines: p } }; return { result: false, error: "Pionex klines unavailable", retryAfter: null }; };
  const c2 = context(getJSON);
  c2.rfStare.cauta.text = "pepe"; await vm.runInContext("rfCauta()", c2);
  assert.equal(c2.rfStare.cauta.simbol, "PEPE"); assert.equal(c2.rfStare.cauta.m.fel, "cautata"); assert.equal(c2.rfStare.cauta.m.pionex, "PEPE_USDT_PERP"); assert.ok(c2.rfStare.cauta.m.c && !c2.rfStare.cauta.m.c.eroare);
  let h = c2.rfHtml(c2.rfStare); assert.match(h, /aria-label="PEPE"/); assert.match(h, /căutată/); assert.match(h, /id="rfCautaIn"[^>]*value="pepe"/, "textul tastat rămâne");
  c2.rfStare.cauta.text = "wif"; await vm.runInContext("rfCauta()", c2);
  assert.equal(c2.rfStare.cauta.m.pionex, "WIF_USDT", "perp fără lumânări ⇒ spot"); assert.ok(ceruri.some((u) => /WIF_USDT_PERP/.test(u)) && ceruri.some((u) => /WIF_USDT&/.test(u)));
  c2.rfStare.cauta.text = "zzz"; await vm.runInContext("rfCauta()", c2);
  assert.match(c2.rfStare.cauta.eroare, /Pionex n-are lumânări pentru ZZZ/); assert.doesNotMatch(c2.rfHtml(c2.rfStare), /klines unavailable/, "fără text englezesc pe ecran");
  const n0 = ceruri.length; c2.rfStare.cauta.text = "<b>"; await vm.runInContext("rfCauta()", c2);
  assert.equal(ceruri.length, n0, "simbol stricat ⇒ nicio cerere"); assert.match(c2.rfStare.cauta.eroare, /Scrie simbolul/);
  h = c2.rfHtml(c2.rfStare); assert.doesNotMatch(h, /<b>"/); assert.match(h, /&lt;b&gt;/, "textul tastat e scăpat în HTML");
});

await test("4b. căsuța: la schimbarea intervalului moneda căutată se recitește pe intervalul nou", async () => {
  const ceruri = [], p = randuri(D.bare, dtAcum);
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); ceruri.push(u); return { result: true, data: { klines: p } }; };
  const c = context(getJSON, { tzSimboluri: unul });
  c.rfStare.cauta.text = "pepe"; await vm.runInContext("rfCauta()", c);
  await vm.runInContext("rfTf('4H')", c);
  assert.ok(ceruri.some((u) => /PEPE_USDT_PERP&interval=4H/.test(u)), ceruri.join(" | ")); assert.equal(c.rfStare.cauta.tf, "4H");
});

await test("5. căderea PARȚIALĂ se vede: „1 monedă necitită”, ținută în cache-ul pe interval, citirea parțială se reface", async () => {
  const p = randuri(D.bare, dtAcum); let n = 0;
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); n++; if (/ETH_USDT_PERP/.test(u)) throw new Error("HTTP 500"); return { result: true, data: { klines: p } }; };
  const c = context(getJSON, { tzSimboluri: trei });
  await vm.runInContext("rfPorneste(true)", c);
  assert.match(c.rfStare.eroare || "", /1 monedă necitită din 3/); assert.match(c.rfStare.perTf["60M"].eroare || "", /necitită/);
  await vm.runInContext("rfTf('4H')", c); await vm.runInContext("rfTf('60M')", c);
  assert.match(c.rfStare.eroare || "", /necitită/, "eroarea se întoarce cu cache-ul");
  const h = c.rfHtml(Object.assign({}, c.rfStare, { filtru: "semnale" }));
  assert.match(h, /necitit/, "filtrul gol spune că lipsesc monede");
  const n0 = n; await vm.runInContext("rfPorneste(false)", c);
  assert.ok(n > n0, "citirea parțială nu e „proaspătă”: se reface");
});

await test("6. cache-ul ține până la închiderea barei; lumânările pe (monedă, interval): DOVADA pe 1.000 = doar pagina a doua, Recitește în aceeași bară = 0 cereri", async () => {
  const B = D.bare, jum = Math.floor(B.length / 2), p1 = randuri(B.slice(jum), dtAcum), p2 = randuri(B.slice(0, jum), dtAcum); const ceruri = [];
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); ceruri.push(u); const m = u.match(/endTime=(\d+)/); return { result: true, data: { klines: m ? p2 : p1 } }; };
  const c = context(getJSON, { tzSimboluri: unul });
  await vm.runInContext("rfPorneste(true)", c); assert.equal(ceruri.length, 1);
  await vm.runInContext("rfPorneste(true)", c); assert.equal(ceruri.length, 1, "Recitește în aceeași bară: lumânările din cache");
  await vm.runInContext("rfAdanc()", c); assert.equal(ceruri.length, 2, "DOVADA pe 1.000: doar pagina a doua"); assert.match(ceruri[1], /endTime=/);
  assert.equal(c.rfStare.monede[0].c.n, B.length - 1);
  // lumânări VECHI (ultima închisă acum o zi): nu sunt „proaspete”, chiar dacă citirea e de acum 1 min
  const vechi = randuri(D.bare); const cv = []; const c2 = context(async (u) => { if (/clasament/.test(u)) return clasament(); cv.push(u); return { result: true, data: { klines: vechi } }; }, { tzSimboluri: unul });
  await vm.runInContext("rfPorneste(true)", c2); await vm.runInContext("rfPorneste(false)", c2);
  assert.equal(cv.length, 2, "după închiderea barei următoare se citește din nou");
  assert.equal(c.RF_PAUZA_MS, 0, "pauza din pagină e de prisos: serverul ține deja 1,1 s între cererile spre Pionex");
});

await test("7. Tabloul: refuzul se reîncearcă după 1 min, „puține cazuri”, CONTRA = info, citirea ținută minte", async () => {
  const A = citeste("public", "app.js");
  const i0 = A.indexOf("var tbRfStare={"), i1 = A.indexOf("function tbCitireExtra(b,o){");
  let n = 0, raspuns = null;
  const c2 = { console, Math, Number, String, Object, Array, isFinite, JSON, Date, Promise, TabloBot: { simboluri: (baza) => ({ pionex: baza + "_USDT", moneda: baza }) }, getJSON: async () => { n++; if (!raspuns) throw new Error("HTTP 500"); return raspuns; }, tbPanouVizibil: () => false, tbStare: {} };
  vm.createContext(c2);
  for (const f of ["text-ro.js", "grid-calcul.js", "range-filter.js"]) vm.runInContext(citeste("public", "lib", f), c2);
  vm.runInContext(A.slice(i0, i1), c2);
  const b = { baza: "BTC", quote: "USDT", directie: "LONG" };
  c2.tbRangeFilterRand(b); await c2.tbRfStare.inLucru; assert.equal(n, 1);
  c2.tbRangeFilterRand(b); assert.equal(n, 1, "imediat după refuz: nu bate iar");
  c2.tbRfStare.la = Date.now() - 61000; c2.tbRangeFilterRand(b); await c2.tbRfStare.inLucru; assert.equal(n, 2, "după 1 min se reîncearcă");
  raspuns = { result: true, data: { klines: randuri(D.bare, dtAcum) } }; c2.tbRfStare.la = Date.now() - 61000; c2.tbRangeFilterRand(b); await c2.tbRfStare.inLucru;
  const cit = c2.RangeFilter.citire(c2.tbRfStare.bare), contra = { baza: "BTC", quote: "USDT", directie: cit.dir === 1 ? "SHORT" : "LONG" };
  const r = c2.tbRangeFilterRand(contra);
  assert.match(r.text, /puține cazuri|nedovedit/); if (cit.dovada.n < 20) assert.match(r.text, /puține cazuri/);
  assert.match(r.text, /CONTRA botului/); assert.equal(r.stare, "info", "RF nedovedit ⇒ CONTRA nu e alarmă");
  const c1 = c2.tbRfStare.citire; c2.tbRangeFilterRand(contra); assert.equal(c2.tbRfStare.citire, c1, "citirea ținută minte, nu refăcută la fiecare desen");
  assert.equal(n, 3, "lumânările proaspete nu se mai cer până la bara următoare");
});

await test("8. redesenarea pe zone (intro-ul și căsuța nu se refac), butoanele dezactivate cât citește; LONG + SHORT pe aceeași monedă = AMBELE", () => {
  const c = context(async () => ({}));
  const h = c.rfHtml({ monede: [], la: 0, inLucru: true, eroare: null, simboluri: [1, 2], tf: "60M", filtru: "toate", adanc: false, perTf: {}, cauta: {} });
  for (const id of ["rfZonaAntet", "rfZonaFiltre", "rfZonaCauta", "rfZonaCautaRez", "rfZonaCorp"]) assert.match(h, new RegExp('id="' + id + '"'), id);
  assert.ok(h.indexOf('<details class="rfIntro"') > -1 && h.indexOf('<details class="rfIntro"') < h.indexOf('id="rfZonaCorp"'));
  assert.match(h, /data-action-click="rfTf\('4H'\)" disabled/); assert.match(h, /data-action-click="rfAdanc\(\)" disabled/); assert.match(h, /citesc…/);
  const E = citeste("public", "lib", "range-filter-ecran.js");
  assert.match(E, /function rfDeseneaza\(\)[\s\S]{0,900}rfZonaCorp/, "rfDeseneaza schimbă doar zonele, nu toată pagina");
  const d = c.rfDirectiiBoti([{ activ: true, baza: "DOGE", quote: "USDT", directie: "LONG" }, { activ: true, baza: "DOGE", quote: "USDT", directie: "SHORT" }]);
  assert.equal(d.DOGE, "AMBELE");
  const cit = c.RangeFilter.citire(D.bare);
  const card = c.rfCartela({ simbol: "DOGE", pionex: "DOGE_USDT_PERP", fel: "bot", directie: "AMBELE", c: cit });
  assert.doesNotMatch(card, /CONTRA/); assert.match(card, /LONG \+ SHORT/);
});

await test("9. legarea: rfCauta / rfCautaScrie în lista albă; CSS (rând care se rupe, căsuța, culorile casei); versiunile v100.302", () => {
  const A = citeste("public", "app.js"), C = citeste("public", "app.css"), Hh = citeste("public", "index.html");
  const lista = A.match(/var ACTIUNI_PERMISE=new Set\("([^"]*)"/)[1].split(/\s+/);
  for (const n of ["rfCauta", "rfCautaScrie", "rfFiltru", "rfAdanc", "rfPorneste", "rfTf", "rfLaGrid"]) assert.ok(lista.includes(n), "lipsește: " + n);
  assert.match(C, /#rangefilter \.rfDr\{[^}]*flex-wrap:wrap/); assert.match(C, /#rangefilter \.rfCauta\{/); assert.match(C, /#rangefilter \.rfTon-sus\{color:var\(--pzSus/);
  assert.ok((Hh.match(/v100\.(30[2-9]|3[1-9]\d|[4-9]\d\d)/g) || []).length >= 3); assert.doesNotMatch(Hh, /v100\.301 · /);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-(30[2-9]|3[1-9]\d|[4-9]\d\d)"/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.(30[2-9]|3[1-9]\d|[4-9]\d\d)"/);
  const B = JSON.parse(citeste("BUILD_INFO.json")); assert.match(B.version, /^v100\.(30[2-9]|3[1-9]\d|[4-9]\d\d)$/); assert.ok(B.features.rangeFilterReaudit302);
  assert.ok(Number(JSON.parse(citeste("package.json")).version.split(".")[1]) >= 302);
  assert.match(citeste("package.json"), /npm run test:v100301 && npm run test:v100302/);
});

await test("10. revizia: căutare în zbor + 1h → 4h ⇒ cartela ajunge pe 4h (nu date de 1h sub 4h); refuzul nu lasă cartela altei monede", async () => {
  const p = randuri(D.bare, dtAcum), ceruri = []; let elibereaza, prima = true; const tine = new Promise((r) => { elibereaza = r; });
  const getJSON = async (u) => { if (/clasament/.test(u)) return clasament(); ceruri.push(u); if (/PEPE/.test(u) && prima) { prima = false; await tine; } if (/WIF/.test(u)) return { result: false, error: "rate", retryAfter: 30 }; return { result: true, data: { klines: p } }; };
  const c = context(getJSON, { tzSimboluri: unul });
  await vm.runInContext("rfPorneste(true)", c);
  c.rfStare.cauta.text = "pepe"; const zbor = vm.runInContext("rfCauta()", c);
  await new Promise((r) => setTimeout(r, 5));
  await vm.runInContext("rfTf('4H')", c);
  elibereaza(); await zbor;
  assert.equal(c.rfStare.tf, "4H"); assert.equal(c.rfStare.cauta.m.tf, "4H", "cartela recitită pe intervalul paginii");
  assert.ok(ceruri.some((u) => /PEPE_USDT_PERP&interval=4H/.test(u)));
  assert.match(c.rfHtml(c.rfStare), /căutată · 4h/, "cartela își spune intervalul");
  c.rfStare.cauta.text = "wif"; await vm.runInContext("rfCauta()", c);
  assert.equal(c.rfStare.cauta.m, null, "refuz pe WIF ⇒ nu rămâne cartela PEPE"); assert.match(c.rfStare.cauta.eroare, /refuzat/);
  assert.doesNotMatch(c.rfHtml(c.rfStare), /aria-label="PEPE"/);
});

await test("11. revizia: monedă listată de curând ≠ cădere; corecția DOVEZII cât citește și fără dublură; PERP / BTC.PERP; DOVADA pe 1.000 = o singură recitire a căutării", async () => {
  const p = randuri(D.bare, dtAcum), scurt = randuri(D.bare.slice(-60), dtAcum);
  const c = context(async (u) => { if (/clasament/.test(u)) return clasament(); return { result: true, data: { klines: /ETH/.test(u) ? scurt : p } }; }, { tzSimboluri: trei });
  await vm.runInContext("rfPorneste(true)", c);
  assert.equal(c.rfStare.partial, false, "prea puține lumânări nu face citirea „parțială”"); assert.equal(c.rfStare.eroare, null);
  assert.match(c.rfHtml(c.rfStare), /prea puține lumânări/);
  const cit = c.RangeFilter.citire(D.bare), elig = Object.assign({}, cit, { dovada: { n: 40, k: 28, hit: 70, lo: 54, dovedit: true } });
  const z1 = c.rfZPaginaSt({ monede: [{ simbol: "AAA", c: elig }], simboluri: Array.from({ length: 30 }), inLucru: true, tf: "60M", cauta: {} });
  assert.ok(Math.abs(z1 - 3.14) < 0.02, "cât citește, z pornește de la toate cele 30: " + z1);
  const z2 = c.rfZPaginaSt({ monede: [{ simbol: "PEPE", c: elig }], simboluri: [1], inLucru: false, tf: "60M", cauta: { m: { simbol: "PEPE", tf: "60M", c: elig } } });
  assert.ok(Math.abs(z2 - 1.96) < 0.01, "căutata deja pe pagină nu se numără de două ori: " + z2);
  assert.equal(c.rfNormalizeaza("PERP"), "PERP"); assert.equal(c.rfNormalizeaza("btc.perp"), "BTC");
  assert.match(c.rfTexte(Object.assign({}, cit, { dir: 1, bareDir: 0 }), 1.96).verdict, /întors pe ultima bară/);
  c.rfStare.cauta.text = "pepe"; await vm.runInContext("rfCauta()", c);
  vm.runInContext("var _nCauta = 0, _cautaOrig = rfCauta; rfCauta = function (r) { _nCauta++; return _cautaOrig(r); };", c);
  await vm.runInContext("rfAdanc()", c);
  assert.equal(vm.runInContext("_nCauta", c), 1, "DOVADA pe 1.000 reface căutarea o singură dată");
  assert.match(citeste("public", "app.js"), /trece pe o singură monedă, necorectat/, "Tabloul nu mai scrie „dovedit” fără corecție");
});

console.log(`\n${teste - picate} / ${teste} teste trecute${picate ? " — PICATE: " + picate : ""}\n`);
process.exit(picate ? 1 : 0);
