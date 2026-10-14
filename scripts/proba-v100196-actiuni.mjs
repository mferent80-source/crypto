// Probele v100.196 — zona ACȚIUNI / TRADING 212 / PIAȚA (14.10.2026 seara; el: „repară și fă tot” după auditul sever
// AUDIT-SEVER-CLAUDE-2026-10-14.md, raportul zonei „actiuni”, plus 🔴5 din raportul UI și RSI-ul din sinteză).
// Node pur: modulele din public/lib în vm, pagina T212 încărcată întreagă în vm cu un DOM de jucărie; exit 1 la picare.
//  A. Poarta T212: poziția deja deținută în plafon (🔴1), rezultatele în verdict (🔴2), o singură mărime (🟡1), media negativă (🟡2),
//     regimul pieței (🟡3), banii liberi (🟡4), vârsta datelor (🟡5), data rezultatelor reîncercată (🟡6), Trend 12 luni fără mărime (🟡7),
//     monedele în ponderi (🟡13), „profit așteptat” cinstit (🟡14), corelația spune când scoate acțiunea însăși
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message).slice(0, 500)}`); }); }
console.log("\nv100.196 · acțiunile, Trading 212 și piața · proba\n");

const ZI = 86400000, ACUM = Date.parse("2026-10-14T22:00:00Z");   // miercuri, după închiderea NYSE
class Ceas extends Date { constructor(...a) { if (a.length) super(...a); else super(ACUM); } static now() { return ACUM; } }
const LIB = ["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js"];
function context(extra) {
  const c = Object.assign({ console, Date: Ceas, Math, Object, Array, String, Number, JSON, isFinite, Intl, TextRo: globalThis.TextRo, setTimeout: () => 0 }, extra || {});
  c.window = c; c.globalThis = c; vm.createContext(c);
  return c;
}
const cB = context(); for (const f of LIB) vm.runInContext(citeste("public", "lib", f), cB);
const AS = cB.ActiuniSemnale, G = cB.GridCalcul;
const J = (x) => JSON.parse(JSON.stringify(x));

// zilele de bursă NYSE până la ACUM (13:30 UTC = deschiderea), cea mai veche prima
function zileBursa(n, panaLa) {
  const z = []; let t = Date.parse(new Date(panaLa || ACUM).toISOString().slice(0, 10) + "T13:30:00Z");
  while (z.length < n) { const d = new Date(t).toISOString().slice(0, 10); if (cB.CalendarBursa.eZiDeBursa(d, "NYSE")) z.unshift(t); t -= ZI; }
  return z;
}
// generatorul casei (mulberry32): seriile de probă sunt aceleași la fiecare rulare
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// trend în sus cu zgomot (+0,25 %/zi, ~1,5 % pe zi) și o retragere obișnuită la capăt; sămânța e prima pe care poarta zice CUMPĂR,
// cu preț de intrare și cu media pozitivă pe istoric — altfel probele de mai jos n-ar spune nimic
function bareDin(samanta, n, panaLa) {
  const t = zileBursa(n || 320, panaLa), r = mulberry32(samanta), b = []; let c = 100;
  for (let i = 0; i < t.length; i++) { const o = c; c *= 1 + 0.0025 + (r() - 0.5) * 0.05 - (i >= t.length - 4 ? 0.012 : 0); b.push({ t: t[i], o, h: Math.max(o, c) * (1 + r() * 0.01), l: Math.min(o, c) * (1 - r() * 0.01), c, v: 1e6 }); }
  return b;
}
let SAMANTA = null;
for (let s = 1; s < 500 && SAMANTA === null; s++) {
  const b = bareDin(s), st = AS.stare(b, b[b.length - 1].c), n = AS.niveluri(b, b[b.length - 1].c, {});
  if (AS.poarta({ stare: st, plan: { stop: b[b.length - 1].c * 0.9 } }).nivel === "cumpara" && n.nivel === "ok" && n.intrare && n.proba.medie > 0 && n.proba.nIndep < 30) SAMANTA = s;
}
const bareSus = (n, panaLa) => bareDin(SAMANTA, n, panaLa);
const RAND = (b) => b.map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v }));

// ---------------- A. Poarta, ca funcții pure ----------------
const B0 = bareSus(), ST = AS.stare(B0, B0[B0.length - 1].c), PLAN = { stop: B0[B0.length - 1].c * 0.9 };
await test("A0. pregătirea: pe barele de probă poarta zice CUMPĂR fără intrările noi (altfel probele de mai jos nu spun nimic)", () => {
  const v = AS.poarta({ stare: ST, plan: PLAN });
  assert.equal(v.nivel, "cumpara", JSON.stringify(v.motive));
});
await test("A1 (🔴1). marime: ce ai DEJA în acțiune intră în plafonul de 20 % — 21,1 % deja ⇒ nimic în plus, „plin”", () => {
  const m = AS.marime({ intrare: 100, stop: 90, cont: 27549.75, fx: 0.2096, deja: 5751 });
  assert.equal(m.plin, true); assert.equal(m.suma, 0); assert.equal(m.bucati, 0); assert.equal(m.plafonat, true);
});
await test("A2 (🔴1). marime: 10,9 % deja ⇒ cumpărarea nouă e tăiată ca totalul să rămână la 20 %; riscul pe TOATĂ poziția la stop", () => {
  const cont = 27549.75, m = AS.marime({ intrare: 100, stop: 90, cont, fx: 0.2096, deja: 3000, pretAcum: 100 });
  assert.ok(Math.abs(m.suma - (cont * 0.2 - 3000)) < 1e-6, "suma " + m.suma); assert.equal(m.plafonat, true); assert.ok(!m.plin);
  assert.ok(Math.abs(m.riscDeja - 300) < 1e-6, "riscul pe ce ai deja: 3000 lei × 10 % = 300 lei, nu " + m.riscDeja);
  assert.ok(Math.abs(m.riscTotal - (m.risc + 300)) < 1e-6); assert.ok(Math.abs(m.riscTotalPct - m.riscTotal / cont) < 1e-12);
});
await test("A3 (🔴1). poarta: „ai deja 21,1% din cont în MU” ⇒ cel puțin AȘTEAPTĂ; sub plafon doar o notă", () => {
  const v = AS.poarta({ stare: ST, plan: PLAN, dejaPct: 0.211, simbol: "MU" });
  assert.equal(v.nivel, "asteapta"); assert.ok(v.motive.some((m) => /ai deja 21,1% din cont în MU/.test(m)), JSON.stringify(v.motive));
  const w = AS.poarta({ stare: ST, plan: PLAN, dejaPct: 0.109, simbol: "MU" });
  assert.equal(w.nivel, "cumpara"); assert.ok(w.note.some((m) => /ai deja 10,9% din cont în MU/.test(m)), JSON.stringify(w.note));
});
await test("A4 (🔴2). poarta: rezultatele peste 0–10 zile ⇒ AȘTEAPTĂ cu motivul; data necunoscută ⇒ se spune; fără câmp ⇒ nimic", () => {
  const v = AS.poarta({ stare: ST, plan: PLAN, rezultateZile: 8 });
  assert.equal(v.nivel, "asteapta"); assert.ok(v.motive.some((m) => /rezultatele trimestriale peste 8 zile/.test(m)), JSON.stringify(v.motive));
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, rezultateZile: 0 }).nivel, "asteapta");
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, rezultateZile: 11 }).nivel, "cumpara");
  const n = AS.poarta({ stare: ST, plan: PLAN, rezultateZile: null });
  assert.equal(n.nivel, "cumpara"); assert.ok(n.note.some((m) => /nu știu data rezultatelor/.test(m)), JSON.stringify(n.note));
  assert.deepEqual(J(AS.poarta({ stare: ST, plan: PLAN }).note), []);
});
await test("A5 (🟡2). poarta: media pe istoricul ei ≤ 0 ⇒ AȘTEAPTĂ, nu verde lângă „aș sări peste”", () => {
  const v = AS.poarta({ stare: ST, plan: PLAN, medie: -0.0045 });
  assert.equal(v.nivel, "asteapta"); assert.ok(v.motive.some((m) => /pe minus în medie \(−0,45%\)/.test(m)), JSON.stringify(v.motive));
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, medie: 0.02 }).nivel, "cumpara");
});
await test("A6 (🟡3). regimul pieței, fixat dinainte: fuga de risc / stres / MB „risk-off” ⇒ AȘTEAPTĂ; prudent ⇒ risc 0,5 %; necunoscut ⇒ se spune", () => {
  for (const r of [{ macro: "riskoff" }, { macro: "stres" }, { mb: { stare: "rau" } }]) assert.equal(AS.poarta({ stare: ST, plan: PLAN, regim: r }).nivel, "asteapta", JSON.stringify(r));
  const p = AS.poarta({ stare: ST, plan: PLAN, regim: { macro: "prudent" } });
  assert.equal(p.nivel, "cumpara"); assert.equal(p.riscPct, 0.005); assert.ok(p.note.some((m) => /0,5% din cont/.test(m)));
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, regim: { mb: { stare: "atentie" } } }).riscPct, 0.005);
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, regim: { mb: { stare: "rau", vechi: true } } }).nivel, "cumpara", "lățimea veche nu blochează");
  const u = AS.poarta({ stare: ST, plan: PLAN, regim: {} });
  assert.equal(u.riscPct, 0.01); assert.ok(u.note.some((m) => /regimul pieței necunoscut/.test(m)));
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, regim: { macro: "inclinat", mb: { stare: "bine" } } }).riscPct, 0.01);
});
await test("A7 (🟡5). vârsta datelor: zileLipsa pe calendarul bursei; peste 3 zile de bursă lipsă ⇒ FĂRĂ DATE", () => {
  assert.equal(AS.zileLipsa(B0[B0.length - 1].t, ACUM, "MU_US_EQ"), 0);
  const vechi = Date.parse("2026-09-01T13:30:00Z"), z = AS.zileLipsa(vechi, ACUM, "MU_US_EQ");
  assert.ok(z >= 29 && z <= 31, "1.09 → 14.10: ~30 de zile de bursă lipsă, nu " + z);
  const v = AS.poarta({ stare: ST, plan: PLAN, zileLipsa: 30 });
  assert.equal(v.nivel, "fara-date"); assert.match(v.motive[0], /datele sunt vechi/);
  assert.equal(AS.poarta({ stare: ST, plan: PLAN, zileLipsa: 1 }).nivel, "cumpara", "o zi lipsă după închidere e normal (Yahoo întârzie)");
});
await test("A8 (🟡1, 🟡4). facPoarta: suma din „Cât cumperi” (1 % risc), nu 20 % din cont; 0 lei liberi ⇒ întâi depui", () => {
  assert.equal(AS.facPoarta("cumpara", { suma: 1837.4 }), "Aș cumpăra ~1.837 lei și aș pune stopul imediat după.");
  const f = AS.facPoarta("cumpara", { suma: 1837.4, pesteLiber: true, liber: 0 });
  assert.match(f, /ai doar 0 lei liberi/); assert.ok(f.length <= 110, f.length);
  assert.match(AS.facPoarta("cumpara", null), /contul/);
  assert.match(AS.facPoarta("cumpara", null, { faraMarime: "trend12" }), /Trend 12 luni e în probă/);
  const m = AS.marime({ intrare: 100, stop: 90, cont: 27549.75, fx: 0.2096, liber: 0 });
  assert.equal(m.pesteLiber, true); assert.equal(m.liber, 0);
  assert.equal(AS.marime({ intrare: 100, stop: 90, cont: 27549.75, fx: 0.2096, liber: 1e6 }).pesteLiber, false);
});
await test("A9. planulMeu duce mai departe ce ai deja și banii liberi (planul LUI respectă și el plafonul pe total)", () => {
  const r = AS.planulMeu({ intrare: 100, stop: 90, cont: 27549.75, fx: 0.2096, deja: 5751, liber: 0, calc: { intrare: 100, stop: 90, tinta: 120 } });
  assert.equal(r.m.plin, true); assert.equal(r.m.pesteLiber, false, "0 lei de cumpărat încap în 0 lei liberi");
});

// ---------------- A'. Pagina T212 întreagă în vm ----------------
function pagina(o) {
  o = o || {};
  const el = {}, $ = (id) => el[id] || (el[id] = { id, value: "", innerHTML: "", textContent: "", hidden: false, scrollIntoView() {}, setAttribute() {}, getAttribute() { return null; }, querySelectorAll: () => [], closest: () => null, getBoundingClientRect: () => ({ width: 700 }) });
  const cereri = [];
  const getJSON = async (u) => {
    cereri.push(u);
    const r = o.raspuns ? o.raspuns(u) : undefined; if (r instanceof Error) throw r; if (r !== undefined) return r;
    if (/action=preturi/.test(u)) return { simbol: (/ticker=([A-Z0-9.]+)_US_EQ/.exec(u) || [])[1], randuri: RAND(o.bare || B0) };
    if (/action=rezultate/.test(u)) return { data: o.rezultate === undefined ? "2026-11-20" : o.rezultate };
    if (/action=piata/.test(u) && /istoric-bot/.test(u)) return o.piata || { la: ACUM - 600000, macro: { cod: "inclinat", scor: 3 } };
    if (/stiri/.test(u)) return { stiri: [] };
    return null;
  };
  const c = context({ $, getJSON, escapeHtml: (s) => String(s == null ? "" : s), toast() {}, apiFetch: async () => ({ ok: true, json: async () => ({}) }), verdictTrimite() {}, navTo() {},
    localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [], addEventListener() {} }, fetch: async () => ({ ok: false }) });
  for (const f of LIB.concat(["t212.js", "t212-ecran.js"])) vm.runInContext(citeste("public", "lib", f), c, { filename: f });
  c.t212.cont = { cash: { total: 27549.75, free: o.liber === undefined ? 20000 : o.liber } }; c.t212.bnr = { zi: "2026-10-14", curs: 4.7706 };
  c.t212.poz = o.poz || [];
  return { c, el, $, cereri };
}
async function poarta(o, simbol) {
  const P = pagina(o); P.$("t212PSimbol").value = simbol || "ABC";
  if (o && o.inainte) o.inainte(P);
  await P.c.t212Poarta();
  return Object.assign(P, { p: P.c.t212.poarta, html: P.$("t212PoartaRez").innerHTML });
}
await test("A10 (🔴2). pagina: data rezultatelor se aduce ÎNAINTE de verdict și îl schimbă (peste 8 zile ⇒ AȘTEAPTĂ)", async () => {
  const r = await poarta({ rezultate: "2026-10-22" });
  assert.equal(r.p.v.nivel, "asteapta", JSON.stringify(r.p.v.motive));
  assert.ok(r.cereri.findIndex((u) => /rezultate/.test(u)) >= 0);
  assert.match(r.html, /rezultatele trimestriale peste 8 zile/);
});
await test("A11 (🟡6). pagina: Nasdaq fără dată ⇒ „nu știu data rezultatelor” pe ecran; o eroare nu se ține minte (Reîncarcă întreabă din nou)", async () => {
  const r = await poarta({ rezultate: null });
  assert.match(r.html, /nu știu data rezultatelor/);
  const P = pagina({ raspuns: (u) => (/rezultate/.test(u) ? new Error("Nasdaq: HTTP 502") : undefined) });
  P.c.t212.poz = [{ ticker: "MU_US_EQ", quantity: 1, averagePrice: 900, currentPrice: 930, ppl: 10 }];
  await P.c.t212Porneste(true);
  assert.equal(P.c.t212.rezultate.MU_US_EQ, undefined, "eroarea a rămas ținută minte: " + JSON.stringify(P.c.t212.rezultate.MU_US_EQ));
});
await test("A12 (🔴1). pagina: poziția deținută intră în Poartă — rândul „ai deja X% din cont”, mărimea pe total, riscul pe toată poziția", async () => {
  const pret = B0[B0.length - 1].c, q = 5751 * 0.2096 / pret;   // ~5.751 lei = 21 % din cont
  const r = await poarta({ poz: [{ ticker: "ABC_US_EQ", quantity: q, averagePrice: pret, currentPrice: pret, ppl: 0 }] });
  assert.equal(r.p.v.nivel, "asteapta"); assert.match(r.html, /ai deja 20,9% din cont în ABC/);
  const r2 = await poarta({ poz: [{ ticker: "ABC_US_EQ", quantity: q / 2, averagePrice: pret, currentPrice: pret, ppl: 0 }] });
  const m = r2.c.t212MarimePoarta(r2.p);
  assert.ok(Math.abs(r2.p.deja - 2875) < 2, "ce ai deja, în lei: " + r2.p.deja); assert.ok(m && Math.abs(m.suma - (27549.75 * 0.2 - r2.p.deja)) < 1e-6, "suma " + (m && m.suma)); assert.ok(m.riscTotal > m.risc);
  assert.match(r2.html, /cu ce ai deja în ABC/);
  if (process.env.ARATA) console.log(r2.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
});
await test("A13 (🟡1). pagina: „Ce aș face eu” spune EXACT suma din „Cât cumperi”, nu 20 % din cont", async () => {
  const r = await poarta({});
  const m = r.c.t212MarimePoarta(r.p), s = Math.round(m.suma).toLocaleString("ro-RO");
  assert.match(r.html, new RegExp("Ce aș face eu:</b> Aș cumpăra ~" + s.replace(".", "\\.") + " lei"));
  assert.ok(!/20% din cont\) și aș pune/.test(r.html));
});
await test("A14 (🟡4). pagina: 0 lei liberi ⇒ rândul cu banii liberi lângă „Cât cumperi” și în „Ce aș face eu”", async () => {
  const r = await poarta({ liber: 0 });
  assert.match(r.html, /ai doar 0 lei liberi/);
});
await test("A15 (🟡3). pagina: regimul macro ținut „fuga de risc” ⇒ AȘTEAPTĂ; „prudent” ⇒ mărimea pe 0,5 % risc; ținut mai vechi de 2 h ⇒ necunoscut", async () => {
  const r = await poarta({ piata: { la: ACUM - 600000, macro: { cod: "riskoff", scor: -6 } } });
  assert.equal(r.p.v.nivel, "asteapta"); assert.match(r.html, /fuga de risc/);
  const p = await poarta({ piata: { la: ACUM - 600000, macro: { cod: "prudent", scor: -3 } } }), m = p.c.t212MarimePoarta(p.p);
  assert.ok(Math.abs(m.riscPctReal - 0.005) < 1e-9 || m.plafonat, "riscul " + m.riscPctReal);
  const v = await poarta({ piata: { la: ACUM - 3 * 3600000, macro: { cod: "riskoff", scor: -6 } } });
  assert.notEqual(v.p.v.nivel, "asteapta", "regimul ținut vechi de 3 h a blocat poarta");
});
await test("A16 (🟡5). pagina: bare oprite de 6 săptămâni ⇒ FĂRĂ DATE (nu CUMPĂR); antetul spune ziua ultimei bare", async () => {
  const r = await poarta({ bare: bareSus(320, Date.parse("2026-09-01T20:00:00Z")) });
  assert.equal(r.p.v.nivel, "fara-date"); assert.match(r.html, /datele sunt vechi/);
  const ok = await poarta({});
  assert.match(ok.html, /ultima zi închisă 14\.10/);
});
await test("A17 (🟡2). pagina: media negativă pe istoric ⇒ verdictul nu mai e verde lângă „aș sări peste ea”", async () => {
  // aceeași stare, dar proba niveluri cu medie negativă
  const r = await poarta({ inainte: (P) => { const vechi = P.c.ActiuniSemnale.niveluri; P.c.ActiuniSemnale.niveluri = function () { const n = vechi.apply(null, arguments); if (n.proba) n.proba.medie = -0.0045; return n; }; } });
  assert.equal(r.p.v.nivel, "asteapta"); assert.ok(!/🟢 CUMPĂR/.test(r.html));
});
await test("A18 (🟡7). Trend 12 luni: din lista lui Poarta dă verdictul, dar FĂRĂ mărime până la „probat”; scris pe ecran", async () => {
  const r = await poarta({ inainte: (P) => { P.c.t212.poartaSursa = { s: "ABC", k: "trend12", probat: false }; } });
  assert.equal(r.c.t212MarimePoarta(r.p), null); assert.match(r.html, /Trend 12 luni e în probă/);
  const p = await poarta({ inainte: (P) => { P.c.t212.poartaSursa = { s: "ABC", k: "trend12", probat: true }; } });
  assert.ok(p.c.t212MarimePoarta(p.p), "probat ⇒ mărimea obișnuită");
  const alt = await poarta({ inainte: (P) => { P.c.t212.poartaSursa = { s: "XYZ", k: "trend12", probat: false }; } });
  assert.ok(alt.c.t212MarimePoarta(alt.p), "sursa altui simbol nu se lipește de ABC");
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /sugLaPoarta\(\\'' \+ String\(t\.s\)\.replace\([^)]*\) \+ '\\',\\'trend12\\'/);
});
await test("A19 (🟡14). „Profit așteptat”: sub 30 de ferestre independente fără cifră; eticheta spune „aleasă pe aceleași date”, fără spread și gap", async () => {
  const r = await poarta({});
  assert.ok(!/Profit așteptat:<\/b> [+−]/.test(r.html), "a rămas o cifră de profit pe ~12 ferestre");
  assert.match(r.html, /prea puține cazuri/); assert.match(r.html, /aleasă pe aceleași date/); assert.match(r.html, /spread/);
});
await test("A20 (🔴1). corelația cu ce ai deja: când scoate acțiunea însăși, spune asta", () => {
  const T = citeste("public", "lib", "t212-ecran.js");
  assert.match(T, /fără ea însăși/);
});
await test("A21 (🟡13). ponderile: fiecare poziție în lei pe moneda EI — un ETF de la Londra în pence nu iese de 100 de ori prea mare", () => {
  const P = pagina({}); const c = P.c;
  c.t212.poz = [{ ticker: "MU_US_EQ", quantity: 1, averagePrice: 900, currentPrice: 1000, ppl: 0 }, { ticker: "VUSAl_EQ", quantity: 10, averagePrice: 9000, currentPrice: 9500, ppl: 50 }];
  c.t212.monede = { MU_US_EQ: "USD", VUSAl_EQ: "GBX" };
  c.t212Jurnal = () => ({ p: { deschise: [{ ticker: "VUSAl_EQ", qty: 10, costBuc: 545 }], inchise: [] }, r: { total: 0, comisioane: 0, greseli: [] } });
  const v = c.t212ValoriLei(c.t212.poz);
  assert.ok(Math.abs(v.MU_US_EQ - 1000 * 4.7706) < 1e-6, "MU: 1000 $ × 4,7706 lei = " + v.MU_US_EQ);
  assert.ok(Math.abs(v.VUSAl_EQ - (5450 + 50)) < 1e-6, "VUSA: costul FIFO în lei + rezultatul, nu 95.000 × curs: " + v.VUSAl_EQ);
});

// ---------------- B. „Idei de cumpărare” (🔴5 din raportul UI) și tabelele de pe telefon (🟡 UI 1) ----------------
const IDEE = { ticker: "LITE_US_EQ", simbol: "LITE", pret: 987.99, intrare: 987.99, stop: 839.79, riscPct: 0.15, tinta: 1284.39, motive: ["a", "b", "c"], istoric: { n: 0 } };
const REV = { ticker: "INTC_US_EQ", simbol: "INTC", pret: 72, cadere: 0.2686, deLaMin: 0.1099, zileDeLaMin: 19, stop: 64.22, tinta: 98.45, istoric: { n: 3, pePlus: 2, total: 34 } };
function ideiHtml() {
  const P = pagina({}); P.c.t212.idei = { idei: { la: Date.parse("2026-10-14T05:05:00Z"), zi: "2026-10-14", judecate: 120, trecute: 7, actiuni: [IDEE], restul: [IDEE], reveniri: [REV] }, lista: [] };
  P.c.t212.sfaturiIst = [];
  P.c.Consilier = { socotealaSfaturi: () => { const g = { 5: { n: 3, dreptate: 2, medie: 0.01 }, 10: { n: 0 }, 20: { n: 0 } }; return { iesi: g, atentie: g, tine: g, text: "x." }; } };
  P.c.Reveniri = { textDovada: () => "dovada", TEXT_SUPRAVIETUITORI: "supraviețuitori" };
  P.c.t212IdeiRender(); return P.$("t212Idei").innerHTML;
}
await test("B1 (🔴5). Idei: coloana nu mai minte „Acum” — „La idee” + ora turei; nota spune că „Biletul” le reface pe prețul de acum", () => {
  const h = ideiHtml();
  const tab = h.slice(h.indexOf("t212IdeiTab"), h.indexOf("</thead>", h.indexOf("t212IdeiTab")));
  assert.ok(!/<th>Acum<\/th>/.test(tab), "antetul ideilor tot „Acum”"); assert.match(tab, /<th>La idee<\/th>/);
  assert.match(h, /judecate pe 14\.10, la 08:05/); assert.match(h, /„Biletul” le reface pe prețul de acum/);
});
await test("B2 (🟡 UI 1). Pe telefon: fiecare celulă din Idei, „Pe revenire” și „Socoteala sfaturilor” își spune coloana (data-et)", () => {
  const h = ideiHtml();
  for (const et of ["Acțiune", "La idee", "Intrare", "Stop", "Țintă", "Istoricul tău"]) assert.ok(h.includes('data-et="' + et + '"'), "idei fără data-et " + et);
  for (const et of ["Căderea", "De la minim", "Cât cumperi"]) assert.ok(h.includes('data-et="' + et + '"'), "revenire fără data-et " + et);
  for (const et of ["după 5 zile", "după 10 zile", "după 20 de zile"]) assert.ok(h.includes('data-et="' + et + '"'), "socoteala fără data-et " + et);
  assert.match(h, /class="t212Tab t212SocTab"/);
});
await test("B3. „Pe revenire”: „(1% din cont)” doar când chiar e 1% — tăiat la 20% spune riscul real", () => {
  const P = pagina({}); P.c.t212.cont.cash.total = 3000;
  P.c.Reveniri = { textDovada: () => "dovada", TEXT_SUPRAVIETUITORI: "supraviețuitori" };
  const h = P.c.t212ReveniriCorp({ reveniri: [Object.assign({}, REV, { stop: 71.5 })], dovadaReveniri: null });
  assert.match(h, /tăiat la 20% din cont/); assert.ok(!/\(1% din cont\) · tăiat/.test(h), "plafonat și tot „1% din cont”");
});

function randPoz(P, o) {
  const pret = B0[B0.length - 1].c, n = AS.niveluri(B0, pret, { pretMediu: pret * 1.1, minTrail: 0.15 });
  const p = Object.assign({ ticker: "MU_US_EQ", simbol: "MU", qty: 1.29, pretMediu: pret * 1.1, pret, ppl: -50, pctLei: -0.05, plan: null, st: AS.stare(B0, pret), sem: { nivel: "atentie", motive: ["x"], ceAsFace: "👉 Ce aș face eu: Aș sta." }, niv: n, pond: 0.1, sfaturi: [], prob: [] }, o || {});
  return P.c.t212RandPozitie(p);
}
await test("B4 (🔵 UI 5). Poziții: stopul la 0% de preț nu mai scrie „−0,0% de acum”, ci „la stop”", () => {
  const P = pagina({}), pret = B0[B0.length - 1].c, h0 = randPoz(P);
  const n = AS.niveluri(B0, pret, { pretMediu: pret * 1.1, minTrail: 0.15 }); n.stopPozitie = pret * 0.9998; n.stopAtins = false;
  const h = randPoz(P, { niv: n });
  assert.ok(!/−0,0% de acum/.test(h), "a rămas −0,0%"); assert.match(h, /la stop/); assert.match(h0, /% de acum/);
});
await test("B5 (🟡13). Prețul unei poziții din afara SUA în moneda ei (€, £, pence), nu cu „$”", () => {
  const P = pagina({}); P.c.t212.monede = { VUSAl_EQ: "GBX", RHMd_EQ: "EUR", EQQQl_EQ: "GBP" };
  assert.equal(P.c.t212PretIn(9500, "VUSAl_EQ"), "9500.00 p"); assert.equal(P.c.t212PretIn(1520.5, "RHMd_EQ"), "€1520.50");
  assert.equal(P.c.t212PretIn(412, "EQQQl_EQ"), "£412.00"); assert.equal(P.c.t212PretIn(29.5, "MU_US_EQ"), "$29.50");
  const h = randPoz(P, { ticker: "RHMd_EQ", simbol: "RHM" });
  assert.match(h, /<td class="c-acum">€\d/, "„Acum” pe RHM în euro"); assert.match(h, /mediu €\d/); assert.ok(!/<td class="c-acum">\$/.test(h));
});
await test("B6 (🟡6). Poziții: Nasdaq a răspuns fără dată ⇒ „rezultate: dată necunoscută”, nu nimic", () => {
  const P = pagina({}); P.c.t212.rezultate.MU_US_EQ = { data: null };
  assert.match(randPoz(P), /rezultate: dată necunoscută/);
  P.c.t212.rezultate.MU_US_EQ = { data: "2026-10-28" }; assert.match(randPoz(P), /rezultate 28\.10/);
});

await test("B7 (🔵9). „Bursa e deschisă acum?” pe pagina T212 știe sărbătorile NYSE (Ziua Recunoștinței 26.11.2026, ora 17:00 UTC)", () => {
  const P = pagina({});
  assert.equal(P.c.t212SedintaDeschisa(Date.parse("2026-11-26T17:00:00Z")), false, "Thanksgiving");
  assert.equal(P.c.t212SedintaDeschisa(Date.parse("2026-11-25T17:00:00Z")), true, "miercuri obișnuită");
});

await test("B8 (🟡5). Fără calendarul bursei încărcat (pagina de azi nu-l are în index.html), zileLipsa merge pe zilele lucrătoare", () => {
  const c = context(); for (const f of ["grid-calcul.js", "actiuni-semnale.js"]) vm.runInContext(citeste("public", "lib", f), c);
  assert.equal(typeof c.CalendarBursa, "undefined");
  const z = c.ActiuniSemnale.zileLipsa(Date.parse("2026-09-01T13:30:00Z"), ACUM, "MU_US_EQ");
  assert.ok(z >= 29 && z <= 31, "zile lucrătoare lipsă: " + z);
  assert.ok(c.ActiuniSemnale.zileLipsa(Date.parse("2026-10-13T13:30:00Z"), ACUM, "MU_US_EQ") <= 1, "ieri ⇒ proaspăt");
});

// ---------------- C. RSI unic, culorile, zecimalele, scanul pe bare închise, Wilson pe zile, Scan = Poarta ----------------
const cC = context(); for (const f of ["grid-calcul.js", "calendar-bursa.js", "actiuni-semnale.js", "acasa.js", "scan.js", "consilier.js", "grafic-bot.js"]) vm.runInContext(citeste("public", "lib", f), cC, { filename: f });
// RSI Wilder de referință — exact ca app.js:3154 / grafic-bot.js / TradingView (media netezită pe toată seria)
function rsiWilder(v, n) { let g = 0, p = 0, o = null; for (let i = 1; i < v.length; i++) { const d = v[i] - v[i - 1], up = d > 0 ? d : 0, dn = d < 0 ? -d : 0; if (i <= n) { g += up; p += dn; if (i === n) { g /= n; p /= n; o = p === 0 ? 100 : 100 - 100 / (1 + g / p); } } else { g = (g * (n - 1) + up) / n; p = (p * (n - 1) + dn) / n; o = p === 0 ? 100 : 100 - 100 / (1 + g / p); } } return o; }
await test("C1 (🟡 RSI unic, sinteza). Acasa.rezumatActiune și Scan.rezumat dau RSI-ul Wilder (ca graficul și TradingView), nu media simplă pe 14", () => {
  const b = bareSus(320), c = b.map((x) => x.c), ref = Math.round(rsiWilder(c, 14) * 10) / 10;
  assert.equal(cC.Acasa.rezumatActiune(b).rsi, ref, "acasa.js");
  assert.equal(cC.Scan.rezumat(b).rsi, ref, "scan.js");
  const gb = cC.GraficBot && cC.GraficBot.rsi ? cC.GraficBot.rsi(c, 14) : null;
  if (gb) assert.equal(Math.round(gb[gb.length - 1] * 10) / 10, ref, "grafic-bot.js");
});
await test("C2 (🟡 UI 5). „Piața azi”: „↑ trend sus” verde și „ultima zi −1,7%” roșu, separat; textul rămâne același", () => {
  const q = bareSus(320).map((x) => Object.assign({}, x)); const u = q[q.length - 1]; u.c = q[q.length - 2].c * 0.983;
  const p = cC.Consilier.piata({ qqq: q }), x = p.parti[0];
  assert.match(x.val, /ultima zi −1,7%/); assert.ok(Array.isArray(x.bucati) && x.bucati.length === 2, JSON.stringify(x));
  assert.equal(x.bucati[1].cls, "bad"); assert.match(p.text, /Nasdaq \(QQQ\): .* · ultima zi −1,7%/);
  const P = pagina({}); P.c.t212.piata = p; const el = { innerHTML: "" }; P.c.document.querySelectorAll = () => [el]; P.c.piataAziRender();
  assert.match(el.innerHTML, /<b class="bad">[^<]*ultima zi −1,7%<\/b>/);
});
await test("C3 (🟡 UI 2, o singură zecimală). „Față de ieri dimineață” cu o zecimală (−9,1 USDT, nu −9,11)", () => {
  const s = citeste("public", "lib", "acasa-ecran.js");
  assert.ok(!/Math\.abs\(zt\.boti\)\.toFixed\(2\)/.test(s)); assert.match(s, /Math\.abs\(zt\.boti\)\.toFixed\(1\)/);
});
// scanul din colector, pe un server fals: azi (miercuri 14.10) în ședință, bara de azi în formare sare peste maximul pe 20 de zile
const { scanActiuni, mesajReteta } = await import("./lib/tura-scan.mjs");
await test("C4 (🟡9). Scanul de acțiuni: rețetele (și alertele lor) pe bare ÎNCHISE; prețul și schimbarea de azi doar pentru coloana „azi”", async () => {
  const sedinta = Date.parse("2026-10-14T17:00:00Z"), b = bareSus(320).map((x) => Object.assign({}, x)), ult = b[b.length - 1];
  ult.c = ult.h = Math.max(...b.slice(-21).map((x) => x.h)) * 1.05;   // bara de AZI, încă în formare, sparge maximul
  const trimise = [];
  const d = { cere: async (u) => (/pozitii/.test(u) ? { pozitii: [] } : { randuri: RAND(b) }), trimite: async (u, x) => { trimise.push(x); return true; }, jurnal() {}, pauza: async () => 0, pauzaMs: 0, Scan: cC.Scan, GridCalcul: cC.GridCalcul, NDX: ["AAA"] };
  const r = await scanActiuni(d, sedinta), x = r[0];
  const inchise = cC.Scan.rezumat(b.slice(0, -1));
  assert.equal(x.sparge, inchise.sparge, "rețeta „Spargere” pe bara în formare"); assert.equal(x.p, inchise.p, "prețul rețetelor = închiderea de ieri");
  assert.ok(Math.abs(x.pAzi - ult.c) < 1e-9, "prețul de acum pentru coloana „azi”: " + x.pAzi); assert.ok(x.chAzi > 4, "schimbarea de azi: " + x.chAzi);
  const m = mesajReteta(x, "🚀 Spargere", "a", true, "aAAA", "spargere");
  assert.match(m.mesaj, /închiderea/);
  const s = citeste("public", "lib", "scan-ecran.js"); assert.match(s, /x\.pAzi != null \? x\.pAzi : x\.p/); assert.match(s, /x\.chAzi != null \? x\.chAzi : x\.ch/);
});
await test("C5 (🔵8). Wilson în „cât a mers rețeta”: cazurile independente pe ZILE distincte, nu pe ~100 de acțiuni din aceeași zi", () => {
  const ist = { trend: { s: { n: 500, pe: 75, med: 1, zile: 10 }, l: { n: 500, pe: 60, med: 2 } }, baza: { s: { n: 5000, pe: 50, med: 0.5, zile: 200 }, l: { n: 5000, pe: 52, med: 1 } } };
  assert.equal(cC.Scan.textIstoric(ist, "trend").semnif, 0, "10 zile de intrări nu fac 100 de cazuri independente");
  const vechi = { trend: { s: { n: 500, pe: 75, med: 1 }, l: { n: 500, pe: 60, med: 2 } }, baza: { s: { n: 5000, pe: 50, med: 0.5 }, l: { n: 5000, pe: 52, med: 1 } } };
  assert.equal(cC.Scan.textIstoric(vechi, "trend").semnif, 1, "istoricul vechi fără zile rămâne pe n/5 (cum era)");
  const r = cC.Scan.istoricRetete([bareSus(320), bareSus(320)], "a");
  assert.ok(r.baza.s.zile > 0 && r.baza.s.zile <= 320, "zilele distincte se numără: " + r.baza.s.zile);
});
await test("C6 (🟡12). Scan pe acțiuni: același stop și aceeași intrare ca Poarta (ActiuniSemnale.niveluri), nu 2× ATR separat", () => {
  const b = bareSus(320), pret = b[b.length - 1].c, n = cC.ActiuniSemnale.niveluri(b, pret, {}), pl = cC.Scan.planActiune(b, pret);
  assert.equal(pl.stop, n.stop); assert.equal(pl.intrare, n.intrare.pret); assert.equal(pl.tinta, n.tinta);
  const s = citeste("public", "lib", "scan-ecran.js"); assert.match(s, /Scan\.planActiune\(/); assert.match(s, /t212MarimeCalc\(/);
});

console.log(`\n${teste - picate} din ${teste} trec`);
if (picate) { console.log(`V100.196 ACȚIUNI PICA · ${picate} din ${teste}`); process.exit(1); }
