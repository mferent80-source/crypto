// Proba v100.269-t (ideile auditului 29.10, trei felii):
//  1. „Regulile tale” (pagina T212): până acum o grupă de ≥ 30 de trade-uri cu 5 puncte sub medie și total pe minus devenea „regulă”, fără
//     test și fără corecție, pe ~15 grupe. Pe trade-uri FĂRĂ efect auditorul a găsit măcar o „regulă” în 93% din rulări (400 de trade-uri).
//     Acum: fiecare grupă = test de permutare pe ZILE (rata pe plus a grupei față de restul; trade-urile aceleiași zile se mișcă împreună),
//     corecția Benjamini–Hochberg (5%) pe toate grupele testate (Verdicte.registru), mulberry32 cu sămânță fixă. Ce nu trece = „de urmărit (nedovedit)”.
//  2. Lățimea Nasdaq 100 pe Acasă: 40–60% era „URCARE ÎNGUSTĂ” în verdict și „mixtă” în Scorul zilei. Acum Macro.PRAGURI.latime = [0,4; 0,6].
//  3. Poarta T212 cu bursa închisă: dacă există cotația extinsă (Yahoo 5m, prepost=1, prin ruta existentă), „pre-market $Y (±Z% față de
//     închidere)”, iar sub stop verdictul primește motivul „prețul de pre-market e deja sub stop”.
//   node scripts/proba-v100269-t.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { jurnalH0 } from "./lib/jurnal-sintetic-t212.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
let teste = 0, picate = 0;
async function test(nume, f) {
  teste++;
  await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 700)}`); });
}
console.log("\nV100.269-t · Regulile tale pe zile + lățimea Nasdaq + pre-market la Poartă · proba\n");

// ================================================================ 1. Regulile tale
const CU = new Function(`${lib("grid-calcul.js")}${lib("verdicte.js")}${lib("actiuni-semnale.js")}; return { AS: ActiuniSemnale, V: Verdicte };`)();
const FARA = new Function(`${lib("grid-calcul.js")}${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();   // fără verdicte.js (probele vechi, colectorul)
const AS = CU.AS, TZ = "Europe/Bucharest", ZI = 86400000;

await test("1a sub H0 (fără efect, ~3 trade-uri pe zi legate de piața zilei, 400 de trade-uri, 100 de jurnale): «cel puțin o regulă» în cel mult 10% (era ~90%)", () => {
  let cu = 0;
  for (let s = 1; s <= 100; s++) if (AS.reguliPersonale(jurnalH0(400, 9000 + s), TZ, { R: 500 }).reguli.length) cu++;
  assert.ok(cu <= 10, cu + " din 100 de jurnale fără efect au primit o „regulă”");
});

// 15 zile de bursă (3 săptămâni), 10 trade-uri pe zi la 17:00 ora României, toate la fel de scumpe, în orele bursei: grupele sunt doar zilele săptămânii.
// Fiecare zi iese întreagă pe plus sau întreagă pe minus (piața zilei); cele 3 joi pe minus, din celelalte 12 zile 6 pe minus.
function jurnalPeZile() {
  const l = [], minus = new Set(["2026-01-05", "2026-01-06", "2026-01-14", "2026-01-16", "2026-01-19", "2026-01-20"]);
  for (let sapt = 0; sapt < 3; sapt++) for (let w = 0; w < 5; w++) {
    const t0 = Date.UTC(2026, 0, 5 + 7 * sapt + w, 15), z = new Date(t0).toISOString().slice(0, 10), rau = w === 3 || minus.has(z);
    for (let j = 0; j < 10; j++) l.push({ id: z + "-" + j, ticker: "Z" + j + "_US_EQ", pornit: t0 + j * 60000, inchis: t0 + 3 * ZI, cost: 2000, rezultat: rau ? -50 : 30, extCumparare: false });
  }
  return l;
}
await test("1b ZIUA e unitatea: joile (3 zile × 10 trade-uri, toate pe minus) nu sunt regulă - pe zile e 3 din 15 zile (p ≈ 0,18), nu 30 de trade-uri independente", () => {
  const l = jurnalPeZile(), r = AS.reguliPersonale(l, TZ);
  assert.equal(r.suficient, true); assert.equal(r.zile, 15, "zilele numărate: " + r.zile);
  assert.deepEqual(r.reguli.map((x) => x.grupa), [], "„regulă” din 3 zile: " + JSON.stringify(r.reguli.map((x) => x.grupa + " p " + x.p)));
  const joi = (r.deUrmarit || []).find((x) => /joi/.test(x.grupa));
  assert.ok(joi, "joia nu e nici „de urmărit”: " + JSON.stringify(r.deUrmarit));
  assert.ok(joi.p > 0.1 && joi.p < 0.3, "p-ul pe zile al joii: " + joi.p);
});
await test("1c un efect ADEVĂRAT (cumpărate după 18 ies cu 2 puncte mai prost, 400 de trade-uri) rămâne regulă; textul spune „la celelalte”, cu o zecimală", () => {
  const l = jurnalH0(400, 4242, { efect: (t, c) => (c.oraRo >= 18 ? -0.02 : 0) }), r = AS.reguliPersonale(l, TZ);
  const g = r.reguli.find((x) => /după 18/.test(x.grupa));
  assert.ok(g, "regula reală lipsește: " + JSON.stringify(r.reguli.concat(r.deUrmarit || []).map((x) => x.grupa + " p " + x.p)));
  assert.ok(g.p <= 0.01 && g.treceBh === true, JSON.stringify(g));
  assert.match(g.text, /^Trade-urile cumpărate după 18: \d+ din \d+ pe plus \(\d+,\d%, față de \d+,\d% la celelalte\), total −[\d.]+ lei\.$/, g.text);
  assert.equal(AS.facReguli(r.reguli[0].grupa), "Aș evita deocamdată trade-urile " + r.reguli[0].grupa + ".");
  assert.ok(r.teste >= 5 && r.teste <= 20, "câte grupe testate: " + r.teste);
});
await test("1d același rezultat la reîncărcare (mulberry32, sămânță fixă) și ACELAȘI fără verdicte.js (rezerva BH = Verdicte.registru)", () => {
  const NOU = new Function(`${lib("grid-calcul.js")}${lib("verdicte.js")}${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();   // altă încărcare a paginii
  const jurnale = [jurnalPeZile(), jurnalH0(400, 4242, { efect: (t, c) => (c.oraRo >= 18 ? -0.02 : 0) })].concat(Array.from({ length: 12 }, (_, i) => jurnalH0(300, 77 + i)));
  let treceUndeva = 0;
  for (const l of jurnale) {
    const a = AS.reguliPersonale(l, TZ, { R: 1000 }), b = NOU.reguliPersonale(l.slice(), TZ, { R: 1000 }), c = FARA.reguliPersonale(l, TZ, { R: 1000 });
    const amp = (r) => JSON.stringify({ grupe: (r.grupe || []).map((x) => [x.grupa, x.p, x.treceBh, x.prag, !!x.regula]), reguli: r.reguli.map((x) => x.grupa), urm: (r.deUrmarit || []).map((x) => x.grupa), m: r.teste });
    assert.equal(amp(b), amp(a), "reîncărcarea schimbă rezultatul");
    assert.equal(amp(c), amp(a), "fără Verdicte rezultatul e altul");
    assert.ok((a.grupe || []).length && a.grupe.every((x) => x.testat ? typeof x.p === "number" && x.p > 0 && x.p <= 1 : x.p === null), "p lipsă la o grupă testată");
    treceUndeva += a.grupe.filter((x) => x.p !== null && x.p <= 0.05).length;
  }
  assert.ok(treceUndeva >= 3, "premisa: destule grupe cu p ≤ 0,05 ca rezerva BH să conteze (" + treceUndeva + ")");
});
await test("1e sub 60 de trade-uri: „mai trebuie”, ca până acum", () => {
  const r = AS.reguliPersonale(jurnalH0(40, 5), TZ);
  assert.equal(r.suficient, false); assert.equal(r.lipsa, 20); assert.deepEqual(r.reguli, []);
});

// ================================================================ pagina T212 în vm (ca proba v100.267-c), cu ceasul dat
function ceasLa(ACUM) { return class Ceas extends Date { constructor(...a) { if (a.length) super(...a); else super(ACUM); } static now() { return ACUM; } }; }
function context(acum, extra) {
  const c = Object.assign({ console, Date: ceasLa(acum), Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0 }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
const LIB = ["grid-calcul.js", "calendar-bursa.js", "verdicte.js", "actiuni-semnale.js"];
const cB = context(Date.parse("2026-10-14T22:00:00Z")); for (const f of LIB) vm.runInContext(lib(f), cB);
function zileBursa(n, panaLa) {
  const z = []; let t = Date.parse(new Date(panaLa).toISOString().slice(0, 10) + "T13:30:00Z");
  while (z.length < n) { const d = new Date(t).toISOString().slice(0, 10); if (cB.CalendarBursa.eZiDeBursa(d, "NYSE")) z.unshift(t); t -= ZI; }
  return z;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function bareDin(samanta, n, panaLa) {
  const t = zileBursa(n || 320, panaLa), r = mulberry32(samanta), b = []; let c = 100;
  for (let i = 0; i < t.length; i++) { const o = c; c *= 1 + 0.0015 + (r() - 0.5) * 0.04; b.push({ t: t[i], o, h: Math.max(o, c) * (1 + r() * 0.01), l: Math.min(o, c) * (1 - r() * 0.01), c, v: 1e6 }); }
  return b;
}
const RAND = (b) => b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v }));
function pagina(o) {
  o = o || {};
  const acum = o.acum || Date.parse("2026-10-14T22:00:00Z"), bare = o.bare || bareDin(7, 320, acum);
  const el = {}, $ = (id) => el[id] || (el[id] = { id, value: "", innerHTML: "", textContent: "", hidden: false, scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; }, querySelectorAll: () => [], closest: () => null, getBoundingClientRect: () => ({ width: 700 }) });
  const cereri = [], verdicte = [];
  const getJSON = async (u) => {
    cereri.push(u);
    const r = o.raspuns ? o.raspuns(u) : undefined; if (r instanceof Error) throw r; if (r !== undefined) return r;
    if (/action=preturi/.test(u) && /interval=5m/.test(u)) return { simbol: "BBB", randuri: [] };
    if (/action=preturi/.test(u)) return { simbol: (/ticker=([A-Z0-9.]+)_US_EQ/.exec(u) || [])[1], randuri: RAND(bare) };
    if (/action=rezultate/.test(u)) return { data: "2026-12-20" };
    if (/action=piata/.test(u) && /istoric-bot/.test(u)) return { la: acum - 600000, macro: { cod: "inclinat", scor: 3 } };
    if (/stiri/.test(u)) return { stiri: [] };
    return null;
  };
  const c = context(acum, { $, getJSON, escapeHtml: (s) => String(s == null ? "" : s), toast() {}, apiFetch: async () => ({ ok: true, json: async () => ({}) }), verdictTrimite(x) { verdicte.push(x); }, navTo() {},
    localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [], addEventListener() {} }, fetch: async () => ({ ok: false }) });
  for (const f of LIB.concat(["t212.js", "t212-ecran.js"])) vm.runInContext(lib(f), c, { filename: f });
  c.t212.cont = { cash: { total: 27549.75, free: 20000 } }; c.t212.bnr = { zi: "2026-10-14", curs: 4.7706 };
  c.t212.poz = []; c.t212.raportCont = { reconciliere: { t212: { abateri: [] } } }; c.t212.cititBine = acum;
  return { c, el, $, cereri, verdicte, bare };
}
const antet = (html) => { const i = html.indexOf('<div class="t212Verdict'); return i < 0 ? "" : html.slice(i, html.indexOf("</div>", i)); };

await test("1f ecranul: regulile doar cele care trec; ce nu trece stă la „De urmărit (nedovedit)”, fără „Ce aș face eu”; nota spune testul pe zile", () => {
  const P = pagina();
  const h = P.c.t212ReguliBloc(jurnalPeZile());
  assert.doesNotMatch(h, /Ce aș face eu/, "sfat dintr-o grupă nedovedită");
  assert.match(h, /De urmărit \(nedovedit/);
  assert.match(h, /<li class="warn">Trade-urile cumpărate joi: 0 din 30 pe plus/);
  const nota = /<p class="tbSub">Fiecare grupă e testată pe zile de bursă \(trade-urile din aceeași zi se mișcă împreună\), cu corecția pentru toate cele \d+ (de )?grupe testate\.<\/p>/;
  assert.match(h, nota, "nota metodei lipsește");
  const h2 = P.c.t212ReguliBloc(jurnalH0(400, 4242, { efect: (t, c) => (c.oraRo >= 18 ? -0.02 : 0) }));
  assert.match(h2, /<li class="bad">Trade-urile cumpărate după 18:/);
  assert.match(h2, /Ce aș face eu:<\/b> Aș evita deocamdată trade-urile cumpărate după 18\./);
  assert.match(h2, nota, "nota metodei lipsește lângă regulă");
});

// ================================================================ 2. lățimea Nasdaq 100: aceleași praguri
vm.runInThisContext(lib("acasa.js")); vm.runInThisContext(lib("scor-zi.js"));
const A = globalThis.Acasa, SZ = globalThis.ScorZi;
vm.runInThisContext(lib("macro.js"));
const M = globalThis.Macro;
const QQQ = Array.from({ length: 260 }, (_, i) => ({ t: Date.UTC(2025, 9, 1) + i * ZI, c: 100 + i * 0.5 }));   // trend de urcare: prețul > EMA 50 > EMA 200
const verdBursa = (cota) => A.vremeBursa({ qqq: QQQ, vix: 15, ndx: { n: 100, e50: Math.round(cota * 100) } });
const pieseNdx = (cota) => SZ.calc({ ndx: { n: 100, e50: Math.round(cota * 100), la: Date.UTC(2026, 9, 29, 10) }, acum: Date.UTC(2026, 9, 29, 11) }).actiuni.piese.find((p) => p.ce === "Market Breadth Nasdaq 100");
const treaptaV = (v) => /LARGĂ/.test(v.eticheta) ? "larga" : /MIXTĂ/.test(v.eticheta) ? "mixta" : /ÎNGUSTĂ/.test(v.eticheta) ? "ingusta" : v.eticheta;
const treaptaS = (p) => /· largă$/.test(p.val) ? "larga" : /· mixtă$/.test(p.val) ? "mixta" : /· îngustă$/.test(p.val) ? "ingusta" : p.val;
await test("2a Macro.PRAGURI.latime = [0,4; 0,6] (un singur loc)", () => {
  assert.deepEqual(M.PRAGURI.latime, [0.4, 0.6]);
  assert.deepEqual(M.PRAGURI.vix, [12, 18, 25, 30]); assert.deepEqual(M.PRAGURI.btc, [0.6, 0.2, -0.2]);
});
await test("2b verdictul bursei și Scorul zilei spun aceeași treaptă: sub 40% ÎNGUSTĂ, 40–60% MIXTĂ (🟡, nivel „ingusta”), de la 60% LARGĂ", () => {
  for (const c of [0.2, 0.39, 0.4, 0.45, 0.5, 0.59, 0.6, 0.75]) {
    const v = verdBursa(c), p = pieseNdx(c), asteptat = c < 0.4 ? "ingusta" : c < 0.6 ? "mixta" : "larga";
    assert.equal(treaptaV(v), asteptat, "verdictul la " + c + ": " + v.eticheta);
    assert.equal(treaptaS(p), asteptat, "Scorul zilei la " + c + ": " + p.val);
    if (asteptat !== "larga") { assert.equal(v.nivel, "ingusta", "codul nivelului rămâne „ingusta” (alerta vremii îl citește)"); assert.match(v.eticheta, /^🟡 URCARE /); }
  }
  assert.equal(verdBursa(0.5).eticheta, "🟡 URCARE MIXTĂ"); assert.equal(verdBursa(0.3).eticheta, "🟡 URCARE ÎNGUSTĂ");
  assert.equal(verdBursa(0.5).latime, "mixta"); assert.equal(verdBursa(0.3).latime, "ingusta");
});
await test("2c fără macro.js încărcat: rezerva din acasa.js și scor-zi.js are ACELEAȘI praguri", () => {
  const Mg = globalThis.Macro; delete globalThis.Macro;
  try {
    for (const c of [0.39, 0.4, 0.59, 0.6]) {
      const asteptat = c < 0.4 ? "ingusta" : c < 0.6 ? "mixta" : "larga";
      assert.equal(treaptaV(verdBursa(c)), asteptat, "fără macro.js, verdictul la " + c);
      assert.equal(treaptaS(pieseNdx(c)), asteptat, "fără macro.js, Scorul zilei la " + c);
    }
  } finally { globalThis.Macro = Mg; }
});
await test("2d cardul „Lărgimea Nasdaq 100” de pe Acasă scrie „mixtă” la 40–60% (nu „îngustă”), din verdict", () => {
  const ec = lib("acasa-ecran.js");
  assert.match(ec, /vb\.latime === "mixta" \? "mixtă" : "îngustă"/, "cardul nu deosebește mixtă de îngustă");
});

// ================================================================ 3. Poarta T212: pre-market cu prețul real
// barele de 5 minute (Yahoo, prepost=1): ședința din 14.10 (13:30–20:00 UTC) la închidere, după închidere (20:00–24:00) la `dupa`,
// pre-market-ul din 15.10 (08:00–13:30 UTC) la `pre`; doar barele care au început până „acum”
function bare5m(inchidere, dupa, pre, acum) {
  const r = [], ad = (t0, t1, p) => { for (let t = t0; t < t1; t += 300000) if (t <= acum) r.push({ time: t, open: p, high: p, low: p, close: p, volume: 100 }); };
  ad(Date.parse("2026-10-14T13:30:00Z"), Date.parse("2026-10-14T20:00:00Z"), inchidere);
  if (dupa) ad(Date.parse("2026-10-14T20:00:00Z"), Date.parse("2026-10-15T00:00:00Z"), dupa);
  if (pre) ad(Date.parse("2026-10-15T08:00:00Z"), Date.parse("2026-10-15T13:30:00Z"), pre);
  return r;
}
const poartaLa = async (acum, panaLa, cinci, extra) => {
  const bare = bareDin(7, 320, panaLa), C = bare[bare.length - 1].c;
  const P = pagina({ acum, bare, raspuns: (u) => /interval=5m/.test(u) ? (typeof cinci === "function" ? cinci(C, acum) : cinci) : undefined });
  P.$("t212PSimbol").value = "BBB"; if (extra) extra(P, C); await P.c.t212Poarta();
  return Object.assign(P, { html: P.$("t212PoartaRez").innerHTML, C });
};
const usd = (v) => cB.ActiuniSemnale.usd(v);
const JOI_8 = Date.parse("2026-10-15T12:00:00Z"), MIERCURI = Date.parse("2026-10-14T22:00:00Z");
await test("3a înainte de deschidere (joi 08:00 New York) cu cotația extinsă: „pre-market $Y (+3,0% față de închidere)” lângă „închiderea de ieri”; cererea = ruta existentă cu prepost=1", async () => {
  const r = await poartaLa(JOI_8, MIERCURI, (C, acum) => ({ simbol: "BBB", randuri: bare5m(C, C * 1.01, C * 1.03, acum) }));
  const a = antet(r.html);
  assert.match(a, /închiderea de ieri \$\d/, a);
  assert.ok(a.includes("pre-market " + usd(r.C * 1.03) + " (+3,0% față de închidere)"), a);
  const u = r.cereri.find((x) => /interval=5m/.test(x));
  assert.ok(u && /^\/api\/t212\?action=preturi&interval=5m&ticker=BBB_US_EQ&prepost=1$/.test(u), "cererea: " + u);
  assert.doesNotMatch(r.html, /e deja sub stop/);
});
await test("3b pre-market-ul deja sub stop: verdictul primește motivul „prețul de pre-market e deja sub stop” (și nu mai e CUMPĂR)", async () => {
  const r = await poartaLa(JOI_8, MIERCURI, (C, acum) => ({ simbol: "BBB", randuri: bare5m(C, C, C * 0.9, acum) }), (P, C) => { P.$("t212PStop").value = String((C * 0.95).toFixed(2)); });
  const v = r.c.t212.poarta.v;
  assert.ok(v.motive.some((m) => /^prețul de pre-market e deja sub stop \(\$[\d.]+, stopul \$[\d.]+\)/.test(m)), JSON.stringify(v.motive));
  assert.notEqual(v.nivel, "cumpara");
  assert.ok(antet(r.html).includes("pre-market " + usd(r.C * 0.9) + " (−10,0% față de închidere)"), antet(r.html));
});
await test("3c fără cotație extinsă (eroare, listă goală sau doar ședința) rămâne ca acum: „închiderea de ieri”, fără „pre-market”, fără motiv nou", async () => {
  for (const cinci of [new Error("Yahoo a limitat cererile"), { randuri: [] }, (C, acum) => ({ randuri: bare5m(C, null, null, acum) })]) {
    const r = await poartaLa(JOI_8, MIERCURI, cinci);
    assert.match(antet(r.html), /închiderea de ieri \$\d/);
    assert.doesNotMatch(r.html, /pre-market \$|după închidere \$|e deja sub stop/);
    assert.ok(r.c.t212.poarta && r.c.t212.poarta.v && r.c.t212.poarta.v.nivel !== "fara-date", "verdictul a căzut: " + JSON.stringify(r.c.t212.poarta));
  }
});
await test("3d în ședință (bursa deschisă) nu se cere nimic în plus: rămâne „acum $X”", async () => {
  const r = await poartaLa(Date.parse("2026-10-15T15:00:00Z"), Date.parse("2026-10-15T15:00:00Z"), () => { throw new Error("nu trebuia cerut"); });
  assert.match(antet(r.html), /acum \$\d/);
  assert.ok(!r.cereri.some((x) => /interval=5m/.test(x)), "a cerut barele de 5 minute în ședință");
});
await test("3e după închidere (miercuri 18:00 New York): „după închidere $Y (−2,0% față de închidere)”, iar sub stop motivul spune „după închidere”", async () => {
  const r = await poartaLa(MIERCURI, MIERCURI, (C, acum) => ({ randuri: bare5m(C, C * 0.98, null, acum) }));
  assert.ok(antet(r.html).includes("după închidere " + usd(r.C * 0.98) + " (−2,0% față de închidere)"), antet(r.html));
  const s = await poartaLa(MIERCURI, MIERCURI, (C, acum) => ({ randuri: bare5m(C, C * 0.8, null, acum) }), (P, C) => { P.$("t212PStop").value = String((C * 0.95).toFixed(2)); });
  assert.ok(s.c.t212.poarta.v.motive.some((m) => /^prețul de după închidere e deja sub stop/.test(m)), JSON.stringify(s.c.t212.poarta.v.motive));
});
await test("3f ActiuniSemnale.poarta: motivul vine doar sub stop; pragurile verdictului neschimbate (fără cotație = exact ca înainte)", () => {
  const AS2 = cB.ActiuniSemnale, b = bareDin(7, 320, MIERCURI), st = AS2.stare(b, b[b.length - 1].c), C = b[b.length - 1].c;
  const baza = { stare: st, plan: { stop: C * 0.95 } }, v0 = AS2.poarta(baza);
  assert.deepEqual(AS2.poarta(Object.assign({}, baza, { extins: { pret: C * 0.97, faza: "pre" } })), v0, "peste stop: verdictul s-a schimbat");
  const v1 = AS2.poarta(Object.assign({}, baza, { extins: { pret: C * 0.9, faza: "pre" } }));
  assert.equal(v1.motive.length, v0.motive.length + 1); assert.deepEqual(v1.motive.slice(0, v0.motive.length), v0.motive);
  assert.match(v1.motive[v1.motive.length - 1], /^prețul de pre-market e deja sub stop \(\$[\d.]+, stopul \$[\d.]+\): la deschidere s-ar atinge pe loc$/);
  assert.equal(v1.nivel, v0.nivel === "nu" ? "nu" : "asteapta");
  const v2 = AS2.poarta(Object.assign({}, baza, { extins: { pret: C * 0.9, faza: "pre", stop: C * 0.85 } }));
  assert.deepEqual(v2, v0, "stopul dat explicit (sub prețul extins) nu e atins");
});

console.log(picate ? `\n${picate} PICA din ${teste}\n` : `\ntoate ${teste} ok\n`);
process.exit(picate ? 1 : 0);
