// Proba v100.329 (12.11.2026, el: „verifică că nu s-a pierdut nimic și auditează pagina azi că arată la fel verdictele și la crypto și la
//   nasdaq” ⇒ auditul ⇒ „Ambele, o versiune” + trendul Nasdaq „cea a paginii”). Partea A: O SINGURĂ vreme a pieței.
//   - direcția Nasdaq: aceeași regulă ca verdictul paginii (preț > EMA50 > EMA200) și în fâșia „Piața azi” din Tablou / T212, în biletul
//     și în sfatul T212 (înainte: alt scor - EMA20/50 + pantă + EMA200 - care a zis altceva în 18 din 52 de zile);
//   - VIX-ul cu aceleași cuvinte ca pe cardul paginii (Macro.vixTreapta), frica / lăcomia pe o singură scară (Acasa.fgNume);
//   - tonul „rău” al fâșiei doar când verdictul paginii e roșu (BURSA SCADE sau FRICĂ), cu motivul adevărat în sfatul T212;
//   - Crypto și Nasdaq: aceleași date (acasa.d), același BTC (lumânările de o oră, altfel clasamentul), aceeași frână - pe Piața azi,
//     în Scan și în Tabloul fără bot (înainte Scan / Tabloul spuneau „Aș porni boți…” când pagina spunea frâna).
//   Pragurile nu se schimbă. node scripts/proba-v100329.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// RAD_PROBA = altă copie (ex. principalul de dinainte) - ca să se vadă că testele pică pe codul vechi
const RAD = process.env.RAD_PROBA || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const LIB = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join("\n       ")}`); }); }
console.log("\nV100.329 · o singură vreme a pieței (Piața azi, fâșia Tablou / T212, Scan, Tabloul fără bot) · proba\n");
// funcția întreagă, din sursă (se închide cu „}” la început de rând)
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește funcția " + nume); const j = src.indexOf("\n}\n", i); assert.ok(j > i, "funcția " + nume + " nu se închide"); return src.slice(i, j + 2); };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// aleator reproductibil: mulberry32 (regula: niciodată LCG)
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ZI = 86400000, T0 = Date.UTC(2025, 10, 3);
// bare zilnice în forma rutei (Pionex / Yahoo): {time, open, high, low, close}
const zile = (l) => l.map((c, i) => ({ time: T0 + i * ZI, open: c, high: c * 1.006, low: c * 0.994, close: c }));
const serie = (n, f) => zile(Array.from({ length: n }, (_, i) => f(i)));

function ctxPur() {
  const c = { console, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, Date, RegExp, Intl, TextRo: globalThis.TextRo };
  vm.createContext(c);
  vm.runInContext(["grid-calcul.js", "macro.js", "acasa.js", "actiuni-semnale.js", "consilier.js"].map(LIB).join("\n;\n")
    + "\n;this.G = GridCalcul; this.A = Acasa; this.C = Consilier; this.AS = ActiuniSemnale; this.M = Macro;", c);
  return c;
}
const P = ctxPur(), G = P.G, A = P.A, C = P.C, AS = P.AS, M = P.M;
const directiaFasiei = (r) => { const p = r.parti.find((x) => /Nasdaq/.test(x.et)); return p ? p.val : null; };

await test("sensBursa: regula verdictului paginii (preț > EMA50 > EMA200 ⇒ sus; invers ⇒ jos; altfel lateral; sub 200 de zile ⇒ null), exportată și folosită de vremeBursa", () => {
  assert.equal(typeof A.sensBursa, "function", "Acasa.sensBursa lipsește");
  const urca = G.bareToate(serie(260, (i) => 100 * Math.pow(1.002, i))), coboara = G.bareToate(serie(260, (i) => 100 * Math.pow(0.998, i)));
  assert.equal(A.sensBursa(urca), "sus"); assert.equal(A.sensBursa(coboara), "jos"); assert.equal(A.sensBursa(urca.slice(0, 150)), null);
  assert.equal(A.vremeBursa({ qqq: coboara, vix: 18 }).nivel, "scade");
  assert.match(fn(LIB("acasa.js").replace(/^  /gm, ""), "vremeBursa"), /sensBursa\(/, "vremeBursa citește aceeași funcție");
});

await test("fâșia (Consilier.piata) spune direcția PAGINII: pe seria în care scorul vechi zicea „↓ trend jos” și pagina „LATERAL” (ca 30.10–10.11), fâșia zice „→ lateral”; pe 600 de serii aleatoare fâșia = pagina", () => {
  let gasit = null;
  for (let k = 3; k <= 90 && !gasit; k++) {
    const b = G.bareToate(serie(250 + k, (i) => (i < 250 ? 100 * Math.pow(1.0025, i) : 100 * Math.pow(1.0025, 250) * Math.pow(0.986, i - 250))));
    if (A.sensBursa(b) === "lateral" && AS.stare(b).trend.dir === "jos") gasit = b;
  }
  assert.ok(gasit, "precondiție: există seria pe care cele două reguli vechi nu se potrivesc");
  assert.match(directiaFasiei(C.piata({ qqq: gasit })), /^→ lateral/);
  const rnd = mulberry32(329); let n = 0;
  for (let s = 0; s < 60; s++) {
    let c = 100; const l = [];
    for (let i = 0; i < 300; i++) { c *= 1 + (rnd() - 0.48) * 0.03; l.push(c); }
    const b = G.bareToate(zile(l));
    for (let e = 210; e <= 300; e += 10) {
      const x = b.slice(0, e), sp = A.sensBursa(x), f = directiaFasiei(C.piata({ qqq: x }));
      const asteptat = sp === "sus" ? "↑ trend sus" : sp === "jos" ? "↓ trend jos" : "→ lateral";
      assert.ok(f && f.indexOf(asteptat) === 0, "seria " + s + ", ziua " + e + ": pagina " + sp + ", fâșia " + f); n++;
    }
  }
  assert.equal(n, 600);
});

await test("VIX în fâșie = cuvintele cardului paginii (Macro.vixTreapta): 15 calm · 19 prudență (nu „liniște”) · 26 frică · 31 panică", () => {
  const urca = G.bareToate(serie(260, (i) => 100 * Math.pow(1.002, i)));
  const vixT = (v) => { const r = C.piata({ qqq: urca, vix: [{ t: T0, o: v, h: v, l: v, c: v }] }); const p = r.parti.find((x) => x.et === "VIX"); return p && p.val; };
  for (const [v, cuv] of [[15, "calm"], [19, "prudență"], [26, "frică"], [31, "panică"]]) {
    assert.equal(M.vixTreapta(v).text.split(" (")[0], cuv, "precondiție: cardul paginii la " + v);
    assert.match(vixT(v), new RegExp("\\(" + cuv + "\\)"), "VIX " + v);
  }
  assert.doesNotMatch(vixT(19), /liniște|agitat/);
});

await test("tonul „rău” al fâșiei doar când verdictul paginii e roșu (SCADE / FRICĂ, VIX ≥ 30); sfatul T212 spune motivul adevărat", () => {
  const urca = G.bareToate(serie(260, (i) => 100 * Math.pow(1.002, i))), coboara = G.bareToate(serie(260, (i) => 100 * Math.pow(0.998, i)));
  const V = (v) => [{ t: T0, o: v, h: v, l: v, c: v }];
  assert.notEqual(A.vremeBursa({ qqq: urca, vix: 27 }).nivel, "frica", "precondiție: pagina la VIX 27 cu trend sus nu e roșie");
  assert.notEqual(C.piata({ qqq: urca, vix: V(27) }).ton, "rau", "VIX 27 + trend sus: pagina verde ⇒ fâșia nu „rău”");
  assert.equal(C.piata({ qqq: urca, vix: V(32) }).ton, "rau");
  assert.equal(C.piata({ qqq: coboara, vix: V(16) }).ton, "rau");
  const poz = { ticker: "X_US_EQ", simbol: "X", pret: 10, pretMediu: 10, pctLei: 0, sem: null, niv: null, pond: null, de: null };
  const sf = (pi) => C.sfaturiPozitie(poz, { piata: pi, inchise: [], stiri: [], acum: T0 }).filter((x) => x.sursa === "piata");
  const panica = sf(C.piata({ qqq: urca, vix: V(32) })), jos = sf(C.piata({ qqq: coboara, vix: V(16) }));
  assert.equal(panica.length, 1); assert.doesNotMatch(panica[0].titlu, /e în jos/); assert.match(panica[0].titlu, /panică/i);
  assert.equal(jos.length, 1); assert.equal(jos[0].titlu, "Piața întreagă e în jos");
});

await test("frica / lăcomia: o singură scară de cuvinte (Acasa.fgNume) - cardul paginii, fâșia și textul verdictului crypto", () => {
  assert.equal(typeof A.fgNume, "function", "Acasa.fgNume lipsește");
  assert.deepEqual([20, 25, 28, 45, 50, 55, 74, 75, 90].map((v) => A.fgNume(v)), ["frică extremă", "frică extremă", "frică", "frică", "neutru", "lăcomie", "lăcomie", "lăcomie extremă", "lăcomie extremă"]);
  const urca = G.bareToate(serie(260, (i) => 100 * Math.pow(1.002, i)));
  const fgF = (v, cl) => { const p = C.piata({ qqq: urca, fg: { valoare: v, clasa: cl } }).parti.find((x) => /Frica/.test(x.et)); return p && p.val; };
  assert.equal(fgF(25, "Fear"), "25 (frică extremă)", "25: aceeași treaptă ca cardul, nu clasa sursei");
  assert.equal(fgF(28, "Fear"), "28 (frică)");
  const CL = { evita: 12, candidati: 88, faraDate: 0, dir: { long: 5, neutru: 32, short: 63 } };
  const v = A.vreme({ clasament: CL, btc: { miscare: false }, fg: 28 });
  assert.match(v.text, /cu frică \(28\)/); assert.doesNotMatch(v.text, /frică mare/);
  assert.equal(v.nivel, "liniste", "pragurile verdictului nu se schimbă");
  assert.match(v.faCe, /fără vânzări în panică \(frica e la 28\)/, "„ce aș face” rămâne (pragul de 30 rămâne)");
  assert.match(fn(LIB("acasa-ecran.js"), "acasaDeseneaza"), /Acasa\.fgNume\(/, "cardul „Frică / lăcomie” folosește aceeași scară");
});

// ---- partea de ecran: acasa-ecran.js într-un vm cu DOM-ul minim ----
function ctxEcran(getJSON) {
  const ls = new Map();
  const c = { console, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, Date, RegExp, Intl, Promise, TextRo: globalThis.TextRo, escapeHtml: esc,
    setInterval: () => 0, setTimeout: () => 0, $: () => null, document: { getElementById: () => null, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) }, getJSON: getJSON || (async () => null) };
  vm.createContext(c);
  vm.runInContext(["grid-calcul.js", "macro.js", "acasa.js", "acasa-ecran.js"].map(LIB).join("\n;\n") + "\n;this.A = Acasa; this.acasaRef = acasa;", c);
  return c;
}
const monede = (ev, btcMis) => Array.from({ length: 100 }, (_, i) => ({ simbol: i === 0 ? "BTC_USDT_PERP" : "M" + i + "_USDT_PERP", stare: i > 0 && i <= ev ? "evita" : "candidat", dir: i < 64 ? "short" : "neutru", regim: i === 0 ? { miscare: !!btcMis, r4h: 0.8, r24h: 0.2 } : { miscare: false } }));
const k1h = (n, f) => Array.from({ length: n }, (_, i) => ({ time: T0 + i * 3600000, open: f(i), high: f(i) * 1.001, low: f(i) * 0.999, close: f(i) }));
const qqqUrca = serie(260, (i) => 100 * Math.pow(1.002, i));
function dateZi(o) {
  o = o || {};
  const acum = Date.now();
  return { clasament: { monede: monede(o.ev == null ? 12 : o.ev, o.btcClasament) }, clasamentLa: acum, piata: { qqq: qqqUrca, vix: [{ time: T0, open: 17, high: 17, low: 17, close: 17 }], fg: { valoare: 28, clasa: "Fear", istoric: [40, 35, 28] } },
    ndx: { actiuni: Array.from({ length: 98 }, (_, i) => ({ s: "A" + i, ch: 1, e50: i < 54, e200: true, rsi: 55 })) }, btc1h: o.btc1h === undefined ? k1h(500, (i) => 100 + Math.sin(i / 7)) : o.btc1h,
    contRaport: o.contRaport === undefined ? { cont: { la: acum - 3600000, valoare: { total: 10000 }, risc: { var95: 570 } } } : o.contRaport, calendar: { evenimente: [] }, piataCol: { funding: null } };
}

await test("acVremeCrypto / acVremeBursa: din aceleași date ⇒ același verdict, CU frâna (VaR 5,7% > 4%) pe ambele - oriunde sunt chemate", () => {
  const c = ctxEcran();
  assert.equal(typeof c.acVremeCrypto, "function", "acVremeCrypto lipsește"); assert.equal(typeof c.acVremeBursa, "function", "acVremeBursa lipsește");
  c.acasaRef.d = dateZi();
  const vc = c.acVremeCrypto(c.acasaRef.d), vb = c.acVremeBursa(c.acasaRef.d);
  assert.equal(vc.nivel, "liniste"); assert.equal(vb.nivel, "ingusta");
  const FRANA = "Aș reduce expunerea până sub 4% pe zi: o zi proastă îți ia ~5,7% din cont.";
  // v100.330 (el: „păi nu voiam verdicte la fel crypto și nasdaq” ⇒ „Fiecare cu verdictul lui”): frâna CONTULUI nu mai stă pe carduri - banda ei, o dată
  assert.notEqual(vc.faCe, FRANA); assert.notEqual(vb.faCe, FRANA); assert.notEqual(vc.faCe, vb.faCe, "fiecare card cu fraza lui");
  assert.equal(c.acFranaContText(), FRANA, "frâna contului, separat, aceeași pentru Piața azi, Scan și Tablou");
  c.acasaRef.d = dateZi({ contRaport: { cont: { la: Date.now() - 3600000, valoare: { total: 10000 }, risc: { var95: 100 } } } });
  assert.match(c.acVremeCrypto(c.acasaRef.d).faCe, /^Aș porni boți grid doar unde fișa monedei zice PORNEȘTE/, "fără frână: fraza vremii");
});

await test("BTC „în mișcare” dintr-o singură regulă (acBtcMiscare): lumânările de o oră când există, altfel regimul BTC din clasament", () => {
  const c = ctxEcran();
  assert.equal(typeof c.acBtcMiscare, "function", "acBtcMiscare lipsește");
  assert.equal(c.acBtcMiscare(dateZi({ btcClasament: true })), false, "lumânările de o oră (liniștite) au întâietate");
  assert.equal(c.acBtcMiscare(dateZi({ btcClasament: true, btc1h: null })), true, "fără lumânări: clasamentul");
  assert.equal(c.acBtcMiscare(dateZi({ btcClasament: false, btc1h: null })), false);
  c.acasaRef.d = dateZi({ btcClasament: true, btc1h: null, ev: 10 });
  assert.equal(c.acVremeCrypto(c.acasaRef.d).nivel, "miscare", "BTC în mișcare ⇒ MIȘCARE");
  assert.match(fn(LIB("acasa-ecran.js"), "acVremeAziNu"), /acBtcMiscare\(/, "regula comună „azi nu” citește același BTC");
});

await test("acVremeAsigura: aduce DOAR ce lipsește sau e mai vechi de 10 minute, cu aceleași adrese ca pagina; a doua chemare nu mai cere nimic", async () => {
  const cerute = [];
  const c = ctxEcran(async (u) => { cerute.push(u); return /clasament/.test(u) ? { clasament: { monede: monede(12) } } : /pionex_klines/.test(u) ? { data: { klines: k1h(500, (i) => 100 + Math.sin(i / 7)) } } : {}; });
  assert.equal(typeof c.acVremeAsigura, "function", "acVremeAsigura lipsește");
  c.acasaRef.d = {};
  await c.acVremeAsigura();
  for (const u of ["/api/istoric-bot?action=clasament", "/api/stiri?action=piata", "/api/t212?action=ndx", "/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500", "/api/istoric-bot?action=cont", "/api/stiri?action=calendar", "/api/istoric-bot?action=piata"])
    assert.ok(cerute.includes(u), "cere " + u);
  assert.ok(c.acasaRef.d.clasament && c.acasaRef.d.btc1h && c.acasaRef.d.btc1h.length === 500, "le pune în acasa.d, în forma paginii");
  const n = cerute.length; await c.acVremeAsigura();
  assert.equal(cerute.length, n, "a doua chemare: nimic nou");
  c.acasaRef.d.clasamentLa = Date.now() - 11 * 60000; await c.acVremeAsigura();
  assert.deepEqual(cerute.slice(n), ["/api/istoric-bot?action=clasament"], "doar ce a îmbătrânit");
});

await test("Piața azi, Scan și Tabloul fără bot cheamă funcțiile comune (nicio vreme socotită separat, nicio frână uitată)", () => {
  const AE = LIB("acasa-ecran.js"), SC = LIB("scan-ecran.js"), APP = citeste("public", "app.js");
  const des = fn(AE, "acasaDeseneaza");
  assert.match(des, /acVremeCrypto\(d\)/); assert.match(des, /acVremeBursa\(d\)/);
  assert.doesNotMatch(des, /Acasa\.vreme\(|Acasa\.vremeBursa\(/, "pagina nu mai socotește separat");
  const ctxS = fn(SC, "scanContext");
  assert.match(ctxS, /acVremeCrypto\(/); assert.match(ctxS, /acVremeBursa\(/); assert.doesNotMatch(ctxS, /Acasa\.vreme\(|Acasa\.vremeBursa\(/);
  assert.match(fn(SC, "scanPorneste"), /acVremeAsigura\(/, "Scan aduce datele vremii");
  const adu = APP.slice(APP.indexOf("tbPreg.fisa=TabloExtra"), APP.indexOf("function tbPregatire("));
  assert.match(adu, /acVremeAsigura\(/); assert.doesNotMatch(adu, /Acasa\.vreme\(/, "Tabloul fără bot nu mai socotește vremea fără frână");
  const preg = APP.slice(APP.indexOf("function tbPregatire("), APP.indexOf("function tbPregatire(") + 3000);
  assert.match(preg.slice(0, preg.indexOf("Vremea pieței") + 200), /acVremeCrypto\(/, "cardul „Vremea pieței” citește vremea comună");
});

await test("cardurile simetrice: „ce aș face” pe AMESTECAT galben ca LATERAL / ÎNGUSTĂ; cardul Nasdaq spune când fraza lui e frâna (măsura rămâne la Crypto)", () => {
  const CSS = citeste("public", "app.css");
  assert.match(CSS, /#dash \.acVerd-amestecat \.acFac[^{]*\{color:var\(--warn\)\}/, "AMESTECAT fără culoare (înainte: alb)");
  // v100.330 (el: „nu voiam verdicte la fel crypto și nasdaq” ⇒ „Fiecare cu verdictul lui”): nota de pe Nasdaq („fraza de sus e frâna”) nu mai are
  // rost - frâna contului stă în banda ei, o dată, cu măsura (mutată de pe cardul Crypto); proba v100.330 ține banda
  const AE = LIB("acasa-ecran.js"), des = fn(AE, "acasaDeseneaza");
  assert.doesNotMatch(AE, /acFranaNota/);
  assert.match(des, /acFranaContHtml\(acFranaContText\(\), acMasuraLin\(\)\)/, "măsura frânei în banda frânei");
});

// ---------------------------------------------------------------- partea B: Piața azi ca Tabloul ----------------------------------------------------------------
await test("tema Tabloului și pe Piața azi: rădăcina #dash în generator, stratul la zi, comutatorul pune tbZi pe #dash, butonul „Temă închisă” în antetul paginii", async () => {
  const GEN = citeste("scripts", "face-tema-tablou.mjs"), CSS = citeste("public", "app.css"), APP = citeste("public", "app.js"), HTML = citeste("public", "index.html");
  assert.match(GEN, /export const RADACINI = \["tabloubot", "t212", "dash"\];/);
  assert.ok(CSS.includes(":is(#tabloubot,#t212,#dash).tbZi{"), "variabilele de zi pe toate trei rădăcinile");
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [path.join(RAD, "scripts", "face-tema-tablou.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, "stratul generat e la zi: " + (r.stdout || r.stderr));
  const ap = APP.slice(APP.indexOf("function tbTemaAplica("), APP.indexOf("function tbTemaComuta("));
  assert.match(ap, /\["tabloubot","t212","dash"\]/); assert.match(ap, /"acTemaBtn"/);
  assert.match(APP.slice(APP.indexOf("function tbTemaComuta("), APP.indexOf("function tbTemaComuta(") + 600), /acasaDeseneaza\(\)/, "comutarea redesenează Piața azi");
  const antet = HTML.slice(HTML.indexOf('<div class="acAntet">'), HTML.indexOf('<div class="acVerdicte">'));
  assert.match(antet, /<button class="acBtn" type="button" id="acTemaBtn" aria-pressed="false" data-action-click="tbTemaComuta\(\)">Temă închisă<\/button>/);
});

await test("generatorul cu trei rădăcini: regulile scrise pe DOUĂ (:is(#tabloubot,#t212) .x, v100.326–328) primesc tema după paranteză, nu pe Tablou singur (altfel T212 lua culorile de zi și noaptea)", async () => {
  const { selectorSub } = await import("file:///" + path.join(RAD, "scripts", "face-tema-tablou.mjs").replace(/\\/g, "/"));
  assert.equal(selectorSub(":is(#tabloubot,#t212) .tbIndTab th", "#tabloubot.tbZi", ["scan"]), ":is(#tabloubot,#t212).tbZi .tbIndTab th");
  assert.equal(selectorSub(":is(#tabloubot,#t212,#dash) .x", "#tabloubot.tbZi", ["scan"]), ":is(#tabloubot,#t212,#dash).tbZi .x");
  assert.equal(selectorSub("html:has(:is(#tabloubot,#t212,#dash).on) .x", "#tabloubot.tbZi", ["scan"]), "html:has(:is(#tabloubot,#t212,#dash).tbZi.on) .x");
  assert.equal(selectorSub(":is(#tabloubot,#t212) .ibTf", "#tabloubot", ["scan"]), ":is(#tabloubot,#t212) .ibTf", "scara (fără sufix) neschimbată");
  const CSS = citeste("public", "app.css");
  assert.ok(!CSS.includes(":is(#tabloubot.tbZi,"), "nicio regulă de zi doar pe Tablou într-un :is cu T212");
  assert.ok(CSS.includes(":is(#tabloubot,#t212).tbZi .tbIndTab th{"), "tabelul indicatorilor pe zi, pe ambele pagini (ca în v100.328)");
});

await test("rama și litera: meniul, bara de sus și fondul ca pe Tablou și cât e deschisă Piața azi; IBM Plex cu culoarea pe rădăcină; nicio regulă a ramei rămasă doar pe Tablou / T212", () => {
  const CSS = citeste("public", "app.css"), coada = CSS.slice(CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */"));
  assert.equal(coada.split("html:has(:is(#tabloubot,#t212).on").length - 1, 0, "regulile ramei fără #dash");
  assert.ok(coada.split("html:has(:is(#tabloubot,#t212,#dash).on").length - 1 >= 20, "rama pe toate trei");
  assert.ok(coada.includes("html:has(:is(#tabloubot,#t212,#dash).on.tbZi) .sideNav{background:#FFFFFF"));
  assert.match(coada, /html\.pzDemo #dash\{[^}]*font-family:"IBM Plex Sans"[^}]*color:var\(--pzT0\)\}/);
  assert.ok(coada.includes("html.pzDemo #dash *{font-family:inherit!important}"));
});

await test("desenele pe tema de zi: acul și capetele cadranelor, liniile mici - culoarea de zi din CSS peste atributele SVG (acul alb #E6EDF3 dispărea pe alb)", () => {
  const CSS = citeste("public", "app.css");
  assert.ok(CSS.includes("#dash.tbZi .acCadran line{stroke:#0E1A2B}") && CSS.includes("#dash.tbZi .acCadran circle{fill:#0E1A2B}") && CSS.includes("#dash.tbZi .acCadran text{fill:#66768B}"));
  // v100.333: + #E0524A (graficele mici roșii când seria coboară, acSparkCul) - regexul de mai jos nu prinde culoarea pusă prin funcție
  for (const c of ["#26A96C", "#E9B949", "#9FB3C4", "#5B8FC7", "#E0524A"]) assert.ok(CSS.includes('#dash.tbZi .acSp polyline[stroke="' + c + '"]'), "linia mică " + c);
  // fiecare culoare scrisă în atribute în acasa-ecran.js are perechea de zi
  const AE = LIB("acasa-ecran.js"), atr = [...new Set([...AE.matchAll(/(?:stroke|fill|stop-color)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]))];
  const lin = [...new Set([...AE.matchAll(/acSpark\([^;]*?"(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]).concat([...AE.matchAll(/macroRand\("[^"]+", p\.\w+, "(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1])))];
  assert.ok(atr.length >= 2 && lin.length >= 3, "precondiție: culorile găsite");
  for (const c of lin) assert.ok(CSS.includes('#dash.tbZi .acSp polyline[stroke="' + c + '"]'), "fără pereche de zi: " + c);
});

await test("fără goluri: măsura frânei de pe cardul Crypto - fraza de început la vedere, lista lungă de ore la un clic (cardul Nasdaq rămânea gol pe jumătate); textul întreg rămâne", () => {
  const c = ctxEcran();
  const LUNG = "Frâna de azi, pusă pe zilele salvate (23.10.2026 – 12.11.2026): în 12 zile din 21 ar fi zis „nu porni”, de la: 23.10.2026 06:08, 27.10.2026 05:16, 28.10.2026 05:19 (ora României). Boții pe care i-ar fi oprit: 15.002,4 pași, rezultat −526,9. Asta nu arată că frâna face bani.";
  c.Acasa.masuraFranei = () => ({ text: LUNG, complete: 21 });
  c.acFranaZileCitite = () => [];
  c.acasaRef.d = { contZile: { zile: [] } };
  const h = c.acMasuraLin();
  // revizia Opus (🔴1): în pliu intră DOAR lista de ore (decorul); rezultatul boților și avertismentul sunt fapte ⇒ rămân la vedere
  const vizibil = h.slice(0, h.indexOf("<details"));
  assert.match(vizibil, /^<p class="acMut">Frâna de azi, pusă pe zilele salvate \(23\.10\.2026 – 12\.11\.2026\): în 12 zile din 21 ar fi zis „nu porni”\. Boții pe care i-ar fi oprit: 15\.002,4 pași, rezultat −526,9\. Asta nu arată că frâna face bani\.<\/p>/, "rezultatul și avertismentul la vedere");
  assert.match(h, /<details class="acMasura"><summary>Orele celor 3 zile ›<\/summary><p class="acMut">23\.10\.2026 06:08, 27\.10\.2026 05:16, 28\.10\.2026 05:19<\/p><\/details>/, "doar orele în pliu");
  c.document.querySelector = (s) => (s === "#acFranaCont details.acMasura[open]" ? {} : null);   /* v100.330: măsura stă în banda frânei */
  assert.match(c.acMasuraLin(), /<details class="acMasura" open>/, "pliul deschis rămâne deschis la redesen (60 s)");
  c.document.querySelector = () => null;
  c.Acasa.masuraFranei = () => ({ text: "Frâna de azi, pusă pe zilele salvate (21.10.2026): n-ar fi zis „nu porni” în nicio zi.", complete: 1 });
  assert.match(c.acMasuraLin(), /^<p class="acMut">/, "fraza scurtă rămâne cum era, fără pliu");
});

await test("anulările nu se întorc pe zi: fraza mare fără fond (stratul punea la loc fondul albastru); pe telefon fraza mare rămâne mai mică (scara urca 24 → 30)", () => {
  const CSS = citeste("public", "app.css"), i = CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */"), dupa = CSS.slice(i);
  assert.ok(CSS.slice(0, i).includes("#dash.tbZi .acFac{background:rgba(36,86,230,.07)}"), "precondiție: stratul generat pune fondul pe zi");
  assert.ok(dupa.includes("#dash.tbZi .acVerd .acFac{background:none}"), "anularea pe zi, după strat");
  assert.ok(CSS.slice(0, i).includes("@media (max-width:640px){#dash .acVerd .acFac{font-size:30px}"), "precondiție: scara urcă fraza de telefon la 30");
  assert.match(dupa, /@media \(max-width:640px\)\{#dash \.acVerd \.acFac\{font-size:20px\}\}/, "pe telefon: treapta de 20");
  // contrastul pe zi (atelier/culori-azi.js, pliurile deschise, 1920 / 412): „Refresh” și rezumatul barei „BTC · 4h · Auto” ieșeau alb pe alb (contrast 1)
  assert.ok(dupa.includes("#dash.tbZi :is(.actionGhost,.tbarRezumat){color:var(--pzT0);background:var(--pzF1);border:1px solid var(--pzLi2)}"), "butoanele vechi din pliuri, pe zi");
  // atelier/anulari-azi.js (noapte → zi, 412): rândul botului (.pzRandBot, all:unset) primea fond + chenar de la „button” de zi; ultimul .ofRow linia de jos
  // scoasă de „.ofRow:last-child{border-bottom:0}”; butonul „Analizează piața” un chenar
  assert.ok(dupa.includes("#dash.tbZi .pzRandBot{background:transparent;border:0;border-top:1px solid var(--pzLi)}"), "rândul botului");
  assert.ok(dupa.includes("#dash.tbZi .ofRow:last-child{border-bottom:0}"), "ultimul rând fără linie");
  assert.ok(dupa.includes("#dash.tbZi #analyzeBtn{border:0}"), "butonul albastru fără chenar");
});

// ---------------------------------------------------------------- revizia Opus ----------------------------------------------------------------
await test("revizia: cardul „Nasdaq 100 · Direcția” din aceeași regulă (sensBursa) - pe FRICĂ (VIX ≥ 30) nu mai zice „trend sus”; frica/lăcomia și în Scorul zilei și în sfatul botului pe scara cardului", () => {
  const AE = LIB("acasa-ecran.js"), des = fn(AE, "acasaDeseneaza");
  assert.match(des, /var sQ = qqq \? Acasa\.sensBursa\(qqq\) : null, dirQ = sQ === "jos" \?/, "Direcția din sensBursa");
  assert.doesNotMatch(des, /dirQ = vb\.nivel === "scade"/);
  const SZ = LIB("scor-zi.js"); assert.doesNotMatch(SZ, /lăcomie moderată|frică moderată/);
  const CS = LIB("consilier.js"); assert.match(fn(CS.replace(/^  /gm, ""), "sfaturiBot"), /fgNumePagina\(fg\.valoare\)/);
  const poz = { baza: "BTC.PERP", directie: "long", pretCurent: 1, gridJos: 0.9, gridSus: 1.1, profitTotal: 0, investit: 10 };
  const sf = C.sfaturiBot ? C.sfaturiBot(poz, { trades: [], fg: { valoare: 25, clasa: "Fear" }, stiri: [], acum: T0 }) : [];
  const t = sf.find((x) => /Frica\/lăcomia/.test(x.titlu));
  assert.ok(t && /\(frică extremă\)/.test(t.titlu), "25 = frică extremă, ca pe card (sursa zicea „Fear”): " + (t && t.titlu));
});

await test("revizia: Scan ia cifrele și eticheta din ACEEAȘI sursă; datele vremii nu țin pe loc rândurile Scan / Tabloului; pauza sezonului se aduce și când lipsește doar configurația", () => {
  const SC = LIB("scan-ecran.js"), ctxS = fn(SC, "scanContext"), por = fn(SC, "scanPorneste");
  assert.match(ctxS, /var cl = acClasamentSumar\(ad\.clasament\)/); assert.match(ctxS, /ndxL = ad\.ndx && Array\.isArray\(ad\.ndx\.actiuni\)/);
  assert.doesNotMatch(por, /pas\("vreme"/, "nu mai e în Promise.all");
  assert.match(por, /acVremeAsigura\(\)\.then\(function \(\) \{ scanDeseneaza\(\); \}/, "vremea vine în paralel și redesenează");
  const APP = citeste("public", "app.js"), adu = APP.slice(APP.indexOf("async function tbPregatireAdu("), APP.indexOf("function tbPregatire("));
  assert.ok(adu.indexOf("acVremeAsigura") > adu.indexOf("tbPreg.grid="), "candidații grid nu mai așteaptă vremea");
  assert.match(fn(LIB("acasa-ecran.js"), "acVremeAsigura"), /!scStare\.la \|\| !scStare\.la\.pionex/, "configurația sezonului cerută o dată (după ora cererii, nu după cfg, care poate rămâne null)");
});

await test("revizia: tema pusă devreme (fără clipire închis → alb la pornire), linkurile fără cutie pe zi, butonul Crypto / Bursa își arată starea, generatorul prinde și :is( … ) cu spații / :where și nu întoarce :not(#dash)", async () => {
  const HTML = citeste("public", "index.html"), SW = citeste("public", "sw.js"), TD = LIB("tema-devreme.js");
  assert.ok(HTML.indexOf('<script src="/lib/tema-devreme.js"></script>') >= 0 && HTML.indexOf('<script src="/lib/tema-devreme.js"></script>') < HTML.indexOf('<script src="/lib/text-ro.js"></script>'), "primul script din pagină");
  assert.ok(SW.includes('"/lib/tema-devreme.js"'), "și în cache-ul offline");
  assert.match(TD, /localStorage\.getItem\("tbTema"\) !== "noapte"/); assert.match(TD, /\["tabloubot", "t212", "dash"\]/);
  const CSS = citeste("public", "app.css"), dupa = CSS.slice(CSS.indexOf("/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */"));
  assert.ok(dupa.includes("#dash.tbZi .acLink{background:none;border:0}") && dupa.includes("#dash.tbZi .acSym{background:transparent}"));
  assert.ok(dupa.includes('#dash .acPiataBtn[aria-pressed="true"]{border-color:var(--accent);color:var(--text)}'), "starea apăsată bate #dash .acBtn");
  const { selectorSub } = await import("file:///" + path.join(RAD, "scripts", "face-tema-tablou.mjs").replace(/\\/g, "/"));
  assert.equal(selectorSub(":is(#tabloubot, #t212) .x", "#tabloubot.tbZi", ["scan"]), ":is(#tabloubot, #t212).tbZi .x");
  assert.equal(selectorSub(":where(#tabloubot,#t212) .x", "#tabloubot.tbZi", ["scan"]), ":where(#tabloubot,#t212).tbZi .x");
  assert.equal(selectorSub(".acBtn:not(#dash .z)", "#tabloubot.tbZi", ["scan"]), ":is(#tabloubot,#t212,#dash).tbZi .acBtn:not(#dash .z)", ":not(#dash) nu e rădăcina");
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " · " + picate + " PICĂ" : ""}\n`);
process.exit(picate ? 1 : 0);
