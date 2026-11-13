// Proba v100.333 · pagina Trading 212, rămășițele auditului din 12.11.2026 (el: „rezolvă tot ce a mai rămas”):
//   B6  moneda contului (nu „lei” scris fix; fără curs inventat când contul nu e în lei);  B8  simbolurile: pagina și serverul dau la fel;
//   B9  „Șterge” planul nu lasă un plan fără niciun prag ascuns ca „cu plan”, iar „Pune planurile” nu mai șterge teza;
//   B10 „48,8%” e măsurat pe crypto: pe acțiuni se spune așa;  B12 care trend face semaforul;  B13 știrile se readuc;
//   B14 dividendele cu o zecimală;  R-a banda contului spune și „fără date”, și „Pionex nu răspunde”;
//   R-b un stop cu trei zecimale nu mai e refuzat când lipsește prețul poziției.
//   node scripts/proba-v100333-t212.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.333 · Trading 212, rămășițele auditului · proba\n");

const ZI = 86400000, MIN = 60000;
const T212 = lib("t212-ecran.js"), APP = citeste("public", "app.js");
const LIBS = ["grid-calcul.js", "calendar-bursa.js", "t212.js", "actiuni-semnale.js", "macro.js", "acasa.js", "consilier.js", "consiliu.js", "indicatori-bot.js", "tv-note.js"];
const ziNY = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(t));
function bareZi(n, ultZi, f, ora) {
  const zile = []; let t = Date.parse(ultZi + "T" + (ora || "14:30") + ":00Z");
  while (zile.length < n) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) zile.push(t); t -= ZI; }
  return zile.reverse().map((tt, i) => { const c = f(i, n); return { time: tt, open: c * 0.995, high: c * 1.01, low: c * 0.985, close: c, volume: 1e6 }; });
}
const scurge = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
// pagina întreagă într-un vm (ca proba v100.332): ceas fals, DOM fals, server fals
function lume(o = {}) {
  const ceas = { t: o.acum || Date.parse("2026-11-12T19:00:00Z") }, els = {}, timere = [], cereri = [], toasturi = [], trimise = [];
  const el = (id) => {
    if (els[id]) return els[id];
    const cls = new Set();
    return (els[id] = { id, innerHTML: "", textContent: "", hidden: false, value: "", defaultValue: "", style: {}, clientWidth: 1200,
      classList: { contains: (c) => cls.has(c), toggle: (c, v) => { if (v === undefined ? !cls.has(c) : v) cls.add(c); else cls.delete(c); }, add: (c) => cls.add(c), remove: (c) => cls.delete(c) },
      querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => false, getAttribute: () => null, setAttribute() {}, getBoundingClientRect: () => ({ width: 1000, top: 0 }), scrollIntoView() {} });
  };
  class D extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.t); } static now() { return ceas.t; } }
  const S = { raspunde: () => { throw new Error("404"); } };
  const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite, isNaN, Date: D, RegExp, Intl, Promise, Set, Map, Error, parseFloat, parseInt, AbortSignal, TextRo: globalThis.TextRo,
    setTimeout: (f, ms) => { timere.push({ f, ms }); return timere.length; }, clearTimeout() {}, setInterval: () => 0,
    escapeHtml: esc, toast: (m, k) => toasturi.push({ m: String(m), k: k || "" }), navTo() {},
    getJSON: async (url) => { cereri.push(String(url)); return S.raspunde(String(url)); },
    apiFetch: async (url, opt) => { const corp = opt && opt.body ? JSON.parse(opt.body) : null; trimise.push({ url: String(url), corp }); const r = S.scrie ? S.scrie(String(url), corp) : { plan: corp && corp.plan ? Object.assign({ la: ceas.t }, corp.plan) : null }; return { ok: true, status: 200, json: async () => r }; },
    localStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: (id) => el(id), querySelectorAll: (s) => (s === "[data-cont-tot]" ? [el("__banda")] : s === "[data-piata-azi]" ? [el("__piata")] : []), querySelector: () => null, addEventListener() {}, activeElement: null, visibilityState: "visible", hidden: false } };
  ctx.$ = (id) => el(id); ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of LIBS) vm.runInContext(lib(f), ctx, { filename: f });
  vm.runInContext(T212, ctx, { filename: "t212-ecran.js" });
  const run = (s) => vm.runInContext(s, ctx);
  run('$("t212").classList.add("on")');
  return { ctx, run, ceas, els, el, timere, cereri, toasturi, trimise, S, cate: (re) => cereri.filter((u) => re.test(u)).length };
}
const POZ = (tk, o = {}) => Object.assign({ ticker: tk, quantity: 100, averagePrice: 50, currentPrice: 58, ppl: 100, fxPpl: 0, initialFillDate: "2026-08-03T15:00:00Z" }, o);
function server(L, o) {
  L.S.raspunde = (url) => {
    if (/action=cont/.test(url)) return { moneda: o.moneda || "RON", cash: { total: 50000, free: 5000, ppl: 100, result: 0 } };
    if (/action=pozitii/.test(url)) return { pozitii: o.poz };
    if (/action=preturi/.test(url)) { const tk = decodeURIComponent((url.match(/ticker=([^&]+)/) || [])[1] || ""), f = o.bare && o.bare[tk]; if (!f) throw new Error("Fără prețuri pentru " + tk); return { simbol: tk.split("_")[0], sursa: "twelvedata", randuri: f(url), la: L.ceas.t }; }
    if (/curs-bnr/.test(url)) return { curs: { "2026-11-09": 4.6 } };
    if (/action=plan/.test(url)) { const tk = decodeURIComponent((url.match(/bot=t212-([^&]+)/) || [])[1] || ""); return { plan: o.planuri && o.planuri[tk] || null }; }
    if (/stiri\?action=actiune/.test(url)) return { stiri: o.stiri ? o.stiri() : [] };
    if (/action=istoric&|action=istoric$/.test(url) && o.istoric) return o.istoric;
    throw new Error("404");
  };
}
const zilnice = (L, f) => () => bareZi(300, ziNY(L.ceas.t), f);

// ───────────── B6. moneda contului ─────────────
await test("B6. contul în lei ⇒ „lei” și cursul BNR; contul în altă monedă ⇒ moneda lui pe sume și FĂRĂ curs dolar/leu (nu se dau bucăți pe un curs greșit)", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } });
  await L.run("t212Porneste(false)");
  assert.equal(L.run("t212Suma(1234)"), "1.234 lei"); assert.ok(L.run("t212Fx()") > 0);
  L.run('t212.cont.moneda = "EUR"');
  assert.equal(L.run("t212Suma(1234)"), "1.234 EUR"); assert.equal(L.run("t212Lei(-12.4, 1)"), "−12,4 EUR");
  assert.equal(L.run("t212Fx()"), null, "curs USD/RON pe un cont în euro ⇒ fără curs");
  L.run("t212Render()"); assert.match(text(L.els.t212Sus.innerHTML), /Contul e în EUR/);
});

// ───────────── B8. simbolurile ─────────────
await test("B8. candidati: pagina (public/lib/t212.js) și serverul (functions/_shared/simboluri.js) dau la fel pe toate simbolurile cunoscute; dataRezultate la fel; serverul n-o mai ține de două ori", async () => {
  const L = lume(), P = L.run("T212");
  const S = await import(pathToFileURL(path.join(RAD, "functions", "_shared", "simboluri.js")).href + "?p333=" + Date.now());
  const corp = ["AAPL_US_EQ", "BRK.B_US_EQ", "SNDK1_US_EQ", "VUSAl_EQ", "SAPd_EQ", "AIRp_EQ", "ASMLa_EQ", "NESNs_EQ", "ENIm_EQ", "XYZ_AT_EQ", "SHOP_CA_EQ", "QQQ_US_EQ", "", "nimic", "ABCx_EQ"]
    .concat(Object.keys(S.REDENUMIT).map((k) => k + "_US_EQ"));
  for (const t of corp) assert.deepEqual(JSON.parse(JSON.stringify(P.candidati(t))), S.candidati(t), t);
  assert.equal(typeof S.dataRezultate, "function", "dataRezultate stă în simboluri.js, lângă candidati");
  for (const j of [{ data: { reportText: "Earnings announcement* for AAPL: 01/29/2027, after market close." } }, { data: { reportText: "Expected 02/03/2027" } }, {}, null])
    assert.deepEqual(JSON.parse(JSON.stringify(P.dataRezultate(j))), S.dataRezultate(j));
  assert.ok(!/^function dataRezultate\(/m.test(citeste("functions", "api", "t212.js")), "t212.js o ia din simboluri.js");
});

// ───────────── B9. planul fără prag ─────────────
await test("B9. un plan doar cu teza (pragurile șterse) e „fără plan” în listă și în rând („teză, fără prag”); „Pune planurile” îl completează PĂSTRÂND teza", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) }, planuri: { ABCD_US_EQ: { stop: null, tinta: null, trailPct: null, teza: "rezultate bune", invalidare: "sub media de 50", orizont: 30, la: 1 } } });
  await L.run("t212Porneste(false)");
  assert.match(text(L.els.t212TodoBox.innerHTML), /Singura poziție e fără plan/);
  const rand = L.run("t212RandPozitie(t212.pozPregatite[0])"), plan = text((rand.match(/<td class="c-plan">(.*?)<\/td>/) || [])[1] || "");
  assert.ok(!/✓/.test(plan), plan); assert.match(plan, /teză, fără prag/);
  await L.run("t212PuneToate()");
  assert.equal(L.trimise.length, 1); const pl = L.trimise[0].corp.plan;
  assert.ok(pl.trailPct > 0 && pl.tinta > 0); assert.equal(pl.teza, "rezultate bune"); assert.equal(pl.invalidare, "sub media de 50"); assert.equal(pl.orizont, 30);
});

// ───────────── B10. 48,8% e de pe crypto ─────────────
await test("B10. „Detaliile indicatorilor” din fișa T212: măsurătoarea de 48,8% se spune ca fiind de pe crypto, iar pe acțiuni nemăsurată; pe Tablou textul rămâne", () => {
  const L = lume(); L.run(fnDin(APP, "tbIndTabelHtml"));
  const Q = (score, ver) => ({ ver, score, prag: 64, ema: false, emaDir: "UP", e20Now: 3, e50Now: 2, e200Now: 1 }), HP = (up) => ({ up, k: 30, banda: 5, inBanda: false, avg: 1.2 });
  L.ctx.__l = [{ tf: "15M", eticheta: "15 min", q: Q(70, "BULLISH"), hp: HP(55) }, { tf: "60M", eticheta: "1 oră", q: Q(50, "NEUTRAL"), hp: HP(48) }, { tf: "4H", eticheta: "4 ore", q: Q(68, "BULLISH"), hp: HP(62) }, { tf: "1D", eticheta: "1 zi", q: Q(30, "BEARISH"), hp: HP(41) }];
  const h = L.run('t212IndHtml("ABCD_US_EQ", __l, null, null, null, true)');
  assert.ok(!/metoda asta a nimerit direcția în 48,8%/.test(h), "nu mai pretinde că e măsurat aici");
  assert.match(h, /pe acțiuni n-a fost măsurată/); assert.match(h, /pe crypto a nimerit direcția în 48,8%/);
  assert.match(L.run('tbIndTabelHtml(__l, "long")'), /metoda asta a nimerit direcția în 48,8%/, "Tabloul botului (crypto): neschimbat");
});

// ───────────── B12. care trend ─────────────
await test("B12. fișa spune care trend face semaforul și stopul (mediile zilnice) și că restul (becul 1z, indicatorii, TradingView, Piața azi) sunt informație", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } });
  await L.run("t212Porneste(false)");
  const f = text(L.run("t212RandPozitie(t212.pozPregatite[0])"));
  assert.match(f, /Semaforul și stopul folosesc trendul din mediile zilnice/); assert.match(f, /TradingView/);
});

// ───────────── B13. știrile ─────────────
await test("B13. știrile unei poziții se readuc la citirea întreagă după 30 de minute (serverul le ține 30), nu mai des", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) }, stiri: () => [] });
  await L.run("t212Porneste(false)"); const n = () => L.cate(/stiri\?action=actiune/);
  assert.equal(n(), 1);
  L.ceas.t += 10 * MIN; await L.run("t212Porneste(false)"); assert.equal(n(), 1, "sub 30 de minute: nimic");
  L.ceas.t += 25 * MIN; await L.run("t212Porneste(false)"); assert.equal(n(), 2, "peste 30 de minute: din nou");
});

// ───────────── B14. dividendele cu o zecimală ─────────────
await test("B14. Jurnal → Acțiuni: dividendele de lângă „Câștigat REAL” au o zecimală (+18,8 lei), nu două", async () => {
  const L = lume();
  L.run('jtFiltru = "actiuni"; $("jtActiuni").hidden = false');
  L.ctx.__u = [{ id: "1", t: Date.parse("2026-08-03T15:00:00Z"), side: "BUY", ticker: "ABCD_US_EQ", simbol: "ABCD", nume: "ABCD", qty: 100, pret: 50, net: 23000, fee: 34, fx: 0.217 },
    { id: "2", t: Date.parse("2026-09-03T15:00:00Z"), side: "SELL", ticker: "ABCD_US_EQ", simbol: "ABCD", nume: "ABCD", qty: 100, pret: 55, net: 25200, fee: 38, fx: 0.217, realizat: 2200 }];
  L.run("t212.istoric = { umpleri: __u, stare: { complet: true, ordine: 2 } }; t212.dividende = { n: 2, total: 18.84 }; t212.dividendeItems = []; t212.cf = null;");   // fără „Dacă ascultai de Radar” (Contrafactual nu e încărcat aici)
  L.run("jtRenderActiuni()");
  const h = text(L.els.jtActiuni.innerHTML);
  assert.match(h, /\+ dividende \+18,8 lei/); assert.ok(!/18,84/.test(h));
});

// ───────────── R-a. banda contului ─────────────
await test("R-a. banda contului: o poziție fără date ȘI Pionex căzut ⇒ le spune pe amândouă; cu o acțiune de ieșit ⇒ și pe aceea", () => {
  const L = lume();
  L.run('t212.cont = { cash: { total: 1000, ppl: 0 } }; t212.poz = [{ ticker: "A_US_EQ", quantity: 1 }]; t212.nrFaraDate = 1; t212.nrIesi = null; contTot.boti = null; contTot.botiEroare = "Pionex HTTP 502";');
  L.run("contTotRender()"); let b = text(L.els.__banda.innerHTML);
  assert.match(b, /1 poziție fără date/); assert.match(b, /Pionex nu răspunde/);
  L.run("t212.nrIesi = 1; contTotRender()"); b = text(L.els.__banda.innerHTML);
  assert.match(b, /1 acțiune de ieșit/); assert.match(b, /1 poziție fără date/); assert.match(b, /Pionex nu răspunde/);
  L.run('contTot.botiEroare = null; contTot.boti = []; t212.nrFaraDate = 0; t212.nrIesi = 0; contTotRender()');
  assert.match(text(L.els.__banda.innerHTML), /nimic roșu/, "fără nimic de spus: bifa rămâne");
});

// ───────────── R-b. stopul cu trei zecimale ─────────────
await test("R-b. t212CitesteNr: valoarea salvată (cum a pus-o pagina în câmp) se ia ca atare; reperul poate fi și stopul calculat / planul; ambiguu doar fără niciun reper", () => {
  const L = lume(), c = L.run("t212CitesteNr");
  assert.equal(c("45.123", { salvat: 45.123 }).v, 45.123, "exact valoarea salvată");
  assert.equal(c("45.123", { ref: [null, 44] }).v, 45.123, "primul reper știut: stopul calculat");
  assert.ok(c("45.123").eroare, "fără niciun reper: tot refuzat, cu mesaj"); assert.equal(c("45.123").ambiguu, true);
  assert.equal(c("1.234", { ref: 1300 }).v, 1234, "reperul simplu merge ca înainte");
});
await test("R-b. planul: poziția fără preț în listă, stopul salvat 45,123 rămâne în câmp ⇒ se salvează din nou, nu e refuzat", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) }, planuri: { ABCD_US_EQ: { stop: 45.123, tinta: 70, trailPct: null, la: 1 } } });
  await L.run("t212Porneste(false)");
  L.run("t212.poz[0].currentPrice = null");
  L.el("t212Stop-ABCD_US_EQ").value = "45.123"; L.el("t212Tinta-ABCD_US_EQ").value = "70"; L.el("t212Trail-ABCD_US_EQ").value = "";
  await L.run('t212PlanSalveaza("ABCD_US_EQ")');
  assert.ok(!L.toasturi.some((x) => /două feluri/.test(x.m)), JSON.stringify(L.toasturi));
  assert.equal(L.trimise.length, 1); assert.equal(L.trimise[0].corp.plan.stop, 45.123);
});
await test("R-b. Poarta: stopul „45.123” scris fără reper se lămurește după prețul adus (≈45), nu oprește verificarea", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T22:00:00Z") }); server(L, { poz: [], bare: { ASTS_US_EQ: zilnice(L, (i) => 40 + i * 0.02) } });
  L.run("t212.cont = { cash: { total: 50000, free: 5000 } }");
  L.el("t212PSimbol").value = "ASTS"; L.el("t212PStop").value = "45.123";
  await L.run("t212Poarta()");
  const h = text(L.els.t212PoartaRez.innerHTML);
  assert.ok(!/două feluri/.test(h), h.slice(0, 200)); assert.ok(L.cate(/preturi&interval=1d&ticker=ASTS/) >= 1);
  assert.match(h, /\$45,12/, "stopul lui, citit 45,123");
});

await test("planulMeu: câștig/risc se socotește și când lipsește cursul / contul; biletul cu planul lui nu mai aruncă (găsit la proba R-b)", async () => {
  const L = lume(), AS = L.run("ActiuniSemnale");
  const r = AS.planulMeu({ intrare: 40, stop: 38, tinta: 46, cont: 50000, fx: null, deja: 0, calc: { intrare: 40, stop: 38, tinta: 44 } });
  assert.ok(r.eroare, "fără curs: spune"); assert.equal(r.rr, 3);
  const L2 = lume({ acum: Date.parse("2026-11-12T22:00:00Z") }); server(L2, { poz: [], bare: { ASTS_US_EQ: zilnice(L2, (i) => 40 + i * 0.02) } });
  L2.run("t212.cont = { cash: { total: 50000, free: 5000 } }"); L2.el("t212PSimbol").value = "ASTS"; L2.el("t212PStop").value = "40"; L2.el("t212PTinta").value = "60";
  await L2.run("t212Poarta()");
  assert.match(text(L2.els.t212PoartaRez.innerHTML), /Planul tău pentru ASTS/); assert.match(text(L2.els.t212PoartaRez.innerHTML), /câștig\/risc/);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
