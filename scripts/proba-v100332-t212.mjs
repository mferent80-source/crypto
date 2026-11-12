// Proba v100.332 · pagina Trading 212 (auditul din 12.11.2026 ⇒ el: „repară tot”). Fiecare test rulează funcția adevărată pe date:
//   R1  prețurile zilnice picate nu mai trec drept „nimic roșu” (eroarea rămâne null, se reîncearcă, apoi „N poziții fără date”);
//   R2  barele zilnice se readuc la citirea întreagă obișnuită când lipsește o ședință închisă (fără cereri când sunt la zi);
//   Y1  pozițiile nu se judecă pe bare vechi sau nepotrivite cu prețul din Trading 212;   Y2  recitirea la 30 s picată se vede;
//   Y3  lumânările de 15 min – 4 ore se readuc și la recitirea vie, iar bara adusă în formare nu e „închisă”;
//   Y4  ședința pe bursa poziției + moneda ei;   Y5  „Piața azi” se readuce și își spune ora;   Y6  Poarta aude frâna contului;
//   Y7  câmpurile de preț citesc „1.234,56” și refuză cu mesaj;   Y8  Poarta: prețul proaspăt și ora lui;
//   4   „Țintă” = cea din plan când există;   🔵  zilele scurte NYSE, sursa lumânărilor, limita de timp, istoricul incomplet;
//   6   Consilierul din KV se cere doar pentru fișa deschisă.
//   node scripts/proba-v100332-t212.mjs
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
console.log("\nV100.332 · Trading 212, reparațiile auditului · proba\n");

const ZI = 86400000, MIN = 60000;
const T212 = lib("t212-ecran.js");
const LIBS = ["grid-calcul.js", "calendar-bursa.js", "t212.js", "actiuni-semnale.js", "macro.js", "acasa.js", "consilier.js", "consiliu.js", "indicatori-bot.js", "tv-note.js"];
const ziNY = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(t));
// n zile de bursă care se termină la `ultZi`; ora = deschiderea (14:30 UTC iarna la New York; 08:00 UTC la Xetra)
function bareZi(n, ultZi, f, ora) {
  const zile = []; let t = Date.parse(ultZi + "T" + (ora || "14:30") + ":00Z");
  while (zile.length < n) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) zile.push(t); t -= ZI; }
  return zile.reverse().map((tt, i) => { const c = f(i, n); return { time: tt, open: c * 0.995, high: c * 1.01, low: c * 0.985, close: c, volume: 1e6 }; });
}
const scurge = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };

// pagina întreagă într-un vm: ceas fals, DOM fals, server fals (S.raspunde), cronometre ținute în listă
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
// serverul de bază: cont, poziții, BNR, planuri, piața; `bare` = { tk: (url) => rânduri | aruncă }
function server(L, o) {
  L.S.raspunde = (url) => {
    if (/action=cont/.test(url)) return { moneda: "RON", cash: { total: 50000, free: 5000, ppl: 100, result: 0 } };
    if (/action=pozitii/.test(url)) { if (o.pozPica) throw Object.assign(new Error("Trading 212 a limitat cererile"), { status: 429 }); return { pozitii: o.poz }; }
    if (/action=preturi/.test(url)) { const tk = decodeURIComponent((url.match(/ticker=([^&]+)/) || [])[1] || ""), f = o.bare && o.bare[tk]; if (!f) throw new Error("Fără prețuri pentru " + tk); return { simbol: tk.split("_")[0], sursa: o.sursa || "twelvedata", randuri: f(url), la: L.ceas.t }; }
    if (/curs-bnr/.test(url)) return { curs: { "2026-11-09": 4.6 } };
    if (/action=plan/.test(url)) { const tk = decodeURIComponent((url.match(/bot=t212-([^&]+)/) || [])[1] || ""); return { plan: o.planuri && o.planuri[tk] || null }; }
    if (/stiri\?action=piata/.test(url)) { const q = bareZi(260, "2026-11-11", (i) => 400 + i * 0.3); return { qqq: q, spy: q, vix: bareZi(30, "2026-11-11", () => o.vix || 18), fg: null }; }
    throw new Error("404");
  };
}
const zilnice = (L, f, ora) => () => bareZi(300, ziNY(L.ceas.t), f, ora);

// ───────────── R1. prețurile zilnice picate ─────────────
await test("R1. cererea de prețuri pică ⇒ barele rămân null (nu []), `nrIesi` e null, banda zice „aduc prețurile…” și se programează reîncercarea", async () => {
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ", { currentPrice: 30, ppl: -9200 })], bare: {}, planuri: { ABCD_US_EQ: { trailPct: 15, tinta: 60, la: 1 } } });
  await L.run("t212Porneste(false)");
  assert.ok(!L.run("t212.bare.ABCD_US_EQ"), "eroarea nu mai e un [] „adevărat”");
  assert.equal(L.run("t212.nrIesi"), null, "semaforul nu s-a putut socoti ⇒ nu e 0");
  const banda = text(L.els.__banda.innerHTML);
  assert.ok(!/nimic roșu/.test(banda), "fără bifa verde: " + banda); assert.match(banda, /aduc prețurile/);
  assert.ok(L.timere.some((x) => x.ms >= 30000 && x.ms <= 120000), "reîncercarea e programată, cu pauză");
});
await test("R1. după 3 încercări picate: `nrFaraDate` = 1, banda zice „1 poziție fără date”, „Ce ai de făcut” nu mai zice „Nimic urgent”; când vin barele, iese IEȘI", async () => {
  const L = lume(), o = { poz: [POZ("ABCD_US_EQ", { currentPrice: 30, ppl: -9200 })], bare: {}, planuri: { ABCD_US_EQ: { trailPct: 15, tinta: 60, la: 1 } } }; server(L, o);
  await L.run("t212Porneste(false)");
  for (let k = 0; k < 4; k++) { L.ceas.t += 61000; const t = L.timere.splice(0); for (const x of t) await x.f(); await scurge(); }
  assert.equal(L.cate(/preturi&interval=1d&ticker=ABCD/), 3, "trei încercări, apoi se oprește (nu la fiecare tic)");
  assert.equal(L.run("t212.nrFaraDate"), 1); assert.equal(L.run("t212.nrIesi"), null, "tot nu e 0: Piața azi nu scrie „nimic roșu”");
  const banda = text(L.els.__banda.innerHTML);
  assert.match(banda, /1 poziție fără date/); assert.ok(!/nimic roșu/.test(banda));
  const todo = text(L.els.t212TodoBox.innerHTML);
  assert.ok(!/Nimic urgent/.test(todo) && /fără prețuri zilnice/.test(todo), todo.slice(0, 200));
  // sursa își revine; citirea întreagă de peste 10 minute le cere din nou
  o.bare.ABCD_US_EQ = zilnice(L, (i, n) => (i < n - 40 ? 45 + i * 0.05 : 60 - (i - (n - 40)) * 0.75));
  L.ceas.t += 11 * MIN; await L.run("t212Porneste(false)");
  assert.equal(L.run("t212.nrIesi"), 1); assert.equal(L.run("t212.nrFaraDate"), 0);
  assert.match(text(L.els.__banda.innerHTML), /1 acțiune de ieșit/);
});

// ───────────── R2. barele zilnice la zi ─────────────
await test("R2. citirea întreagă obișnuită readuce barele când lipsește o ședință închisă; la zi fiind, nicio cerere în plus", async () => {
  const L = lume({ acum: Date.parse("2026-11-09T19:00:00Z") });   // luni, 14:00 la New York
  server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } });
  await L.run("t212Porneste(false)");
  const ult = () => new Date(L.run("t212.bare.ABCD_US_EQ[t212.bare.ABCD_US_EQ.length - 1].t")).toISOString().slice(0, 10);
  assert.equal(L.cate(/preturi&interval=1d&ticker=ABCD/), 1); assert.equal(ult(), "2026-11-06", "luni în ședință: ultima zi închisă e vineri");
  L.ceas.t = Date.parse("2026-11-12T22:30:00Z");   // joi, după închidere
  await L.run("t212Porneste(false)");
  assert.equal(L.cate(/preturi&interval=1d&ticker=ABCD/), 2, "lipseau ședințe închise ⇒ o cerere");
  assert.equal(ult(), "2026-11-12");
  L.ceas.t += 3 * MIN; await L.run("t212Porneste(false)"); L.ceas.t += 40 * MIN; await L.run("t212Porneste(false)");
  assert.equal(L.cate(/preturi&interval=1d&ticker=ABCD/), 2, "barele sunt la zi ⇒ nicio cerere în plus");
});

// ───────────── Y1. bare vechi sau nepotrivite ─────────────
await test("Y1. ActiuniSemnale.verificaBare: bare la zi și potrivite ⇒ judec; vechi de peste 3 ședințe sau preț de 10× ⇒ nu judec, cu motiv; salt de −40% într-o zi ⇒ judec, dar avertizez", () => {
  const L = lume(), AS = L.run("ActiuniSemnale"), G = L.run("GridCalcul"), acum = L.ceas.t;
  const b = (ult, f) => G.bareToate(bareZi(300, ult, f));
  const ok = AS.verificaBare(b("2026-11-11", () => 50), 52, "ABCD_US_EQ", acum);
  assert.equal(ok.judec, true); assert.equal(ok.motiv, null);
  const vechi = AS.verificaBare(b("2026-10-22", () => 50), 52, "ABCD_US_EQ", acum);
  assert.equal(vechi.judec, false); assert.equal(vechi.cod, "vechi"); assert.match(vechi.motiv, /22\.10/); assert.match(vechi.motiv, /14 zile de bursă/);
  const alta = AS.verificaBare(b("2026-11-11", () => 500), 52, "ABCD_US_EQ", acum);
  assert.equal(alta.judec, false); assert.equal(alta.cod, "nepotrivit"); assert.match(alta.motiv, /nu se potrivesc/);
  const salt = AS.verificaBare(b("2026-11-11", () => 50), 30, "ABCD_US_EQ", acum);
  assert.equal(salt.judec, true, "o cădere mare într-o zi nu ascunde semaforul"); assert.equal(salt.cod, "departe"); assert.ok(salt.motiv);
  assert.equal(AS.verificaBare([], 52, "ABCD_US_EQ", acum).judec, false);
});
await test("Y1. pe pagină: barele altei firme (≈500, poziția la 52) nu mai dau „IEȘI · sub stopul care urcă”; poziția e „fără date”, cu motivul în fișă și în „Ce ai de făcut”", async () => {
  const L = lume(); server(L, { poz: [POZ("XYZ1_US_EQ", { quantity: 10, currentPrice: 52, ppl: 90 })], bare: { XYZ1_US_EQ: zilnice(L, (i) => 480 + i * 0.1) } });
  await L.run("t212Porneste(false)");
  const p = L.run("t212.pozPregatite[0]");
  assert.notEqual(p.sem.nivel, "iesi"); assert.equal(p.niv, null, "fără stop socotit pe barele altei firme");
  assert.equal(L.run("t212.nrFaraDate"), 1); assert.equal(L.run("t212.nrIesi"), null);
  assert.match(text(L.els.t212Continut.innerHTML), /nu se potrivesc/);
  assert.match(text(L.els.t212TodoBox.innerHTML), /XYZ: fără prețuri zilnice/);   // T212.simbol scoate cifra de la coadă (SNDK1 ⇒ SNDK)
  assert.match(text(L.els.__banda.innerHTML), /1 poziție fără date/);
});

// ───────────── Y2. recitirea la 30 s picată ─────────────
await test("Y2. recitirea la 30 s pică de două ori ⇒ cipul nu mai zice „se recitesc la 30 s”, ci de când e necitit; la prima reușită revine", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T15:00:00Z") }), o = { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } }; server(L, o);
  await L.run("t212Porneste(true)");
  assert.match(L.els.t212Bursa.textContent, /se recitesc la 30 s/);
  o.pozPica = true;
  for (let i = 0; i < 12; i++) { L.ceas.t += 30000; await L.run("t212ViuTic()"); }
  assert.ok(!/se recitesc la 30 s/.test(L.els.t212Bursa.textContent), L.els.t212Bursa.textContent);
  assert.match(L.els.t212Bursa.textContent, /necitit de 6 minute/); assert.match(L.els.t212Bursa.textContent, /limitat cererile/);
  o.pozPica = false; L.ceas.t += 30000; await L.run("t212ViuTic()");
  assert.match(L.els.t212Bursa.textContent, /se recitesc la 30 s/);
  const cip = L.run("t212CipBursa");
  assert.equal(cip({ deschisa: false, esecuri: 5, la: 0, acum: 1 }).avert, false, "cu bursa închisă nu se recitește, deci nu e „necitit”");
});

// ───────────── Y3. lumânările intraday ─────────────
await test("Y3. t212IndInchise: bara care era în formare la ADUCERE rămâne afară oricât ar trece ceasul și după închidere; adusă cu bursa închisă, rămâne", () => {
  const L = lume(), inch = L.run("t212IndInchise"), t0 = Date.parse("2026-11-12T15:00:00Z");
  const j = [[t0 - 15 * MIN, "100", "101", "99", "100.5", "1000"], [t0, "100.5", "100.6", "100.4", "100.55", "50"]];
  const adus = { la: t0 + MIN, deschisa: true };
  assert.equal(inch(j, 15, t0 + MIN, true, adus).length, 1);
  assert.equal(inch(j, 15, t0 + 40 * MIN, true, adus).length, 1, "la 15:40 bara de 15:00 are tot un minut de preț: nu e închisă");
  assert.equal(inch(j, 15, t0 + 8 * 60 * MIN, false, adus).length, 1, "nici după închiderea bursei");
  assert.equal(inch(j, 15, t0 + 8 * 60 * MIN, false, { la: t0 + 7 * 60 * MIN, deschisa: false }).length, 2, "adusă după închidere ⇒ toate sunt închise");
  assert.equal(inch(j, 15, t0 + 20 * MIN, true, { la: t0 + 16 * MIN, deschisa: true }).length, 2, "adusă după ce bara s-a încheiat ⇒ închisă");
  assert.equal(inch(j, 15, t0 + MIN, true).length, 1, "fără ora aducerii: ca înainte, după ceas");
});
await test("Y3. recitirea vie readuce lumânările fișei deschise la 15 minute (nu la fiecare tic), iar nota spune sursa și ora lor", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T15:00:00Z") });
  const intra = (url) => { const m = Number((url.match(/interval=(\d+)m/) || [0, 60])[1]) * MIN, n = 80, t1 = Math.floor(L.ceas.t / m) * m; return Array.from({ length: n }, (_, i) => ({ time: t1 - (n - 1 - i) * m, open: 58, high: 58.5, low: 57.5, close: 58, volume: 10 })); };
  server(L, { sursa: "yahoo", poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: (url) => (/interval=1d/.test(url) ? bareZi(300, ziNY(L.ceas.t), (i) => 45 + i * 0.045) : intra(url)) } });
  await L.run("t212Porneste(true)"); await scurge();
  const n0 = L.cate(/interval=15m/); assert.equal(n0, 1, "fișa deschisă le aduce o dată");
  L.ceas.t += 30000; L.run("t212Render(true)"); await scurge();
  assert.equal(L.cate(/interval=15m/), n0, "la 30 s nu se cer din nou");
  L.ceas.t += 16 * MIN; L.run("t212Render(true)"); await scurge();
  assert.equal(L.cate(/interval=15m/), n0 + 1, "după 15 minute recitirea vie le readuce");
  const nota = L.run('t212TfNota("ABCD_US_EQ", "15M", "15 minute", true)');
  assert.match(nota, /Yahoo/); assert.ok(!/Twelve Data/.test(nota)); assert.match(nota, /aduse la \d\d:\d\d/);
});

// ───────────── Y4. ședința și moneda poziției ─────────────
await test("Y4. poziție la Xetra, joi 11:30 ora României: ședința ei e deschisă, recitirea la 30 s pornește, cipul nu zice „bursa închisă”", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T09:30:00Z") });
  server(L, { poz: [POZ("SAPd_EQ", { averagePrice: 200, currentPrice: 210 })], bare: { SAPd_EQ: zilnice(L, (i) => 180 + i * 0.1, "08:00") } });
  await L.run("t212Porneste(true)");
  assert.equal(L.run('t212SedintaPt("SAPd_EQ", Date.now())'), true); assert.equal(L.run('t212SedintaPt("ABCD_US_EQ", Date.now())'), false);
  assert.equal(L.run("t212ViuStare(Date.now()).deschisa"), true);
  assert.match(L.els.t212Bursa.textContent, /Xetra deschisă/); assert.match(L.els.t212Bursa.textContent, /se recitesc la 30 s/);
  L.ceas.t += 31000; assert.equal(L.run("t212ViuTrebuie(t212ViuStare(Date.now()))"), true);
});
await test("Y4. sumele unei poziții în euro au „€”, nu „$”: „Ce ai de făcut” și sfatul Consilierului", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T18:00:00Z") });
  server(L, { poz: [POZ("SAPd_EQ", { averagePrice: 200, currentPrice: 150, ppl: -5000 })], bare: { SAPd_EQ: zilnice(L, (i, n) => (i < n - 30 ? 180 + i * 0.1 : 205 - (i - (n - 30)) * 1.8), "08:00") } });
  await L.run("t212Porneste(true)");
  const p = L.run("t212.pozPregatite[0]"); assert.equal(p.sem.nivel, "iesi");
  const todo = text(L.els.t212TodoBox.innerHTML);
  assert.match(todo, /SAP\.DE a coborât sub stopul calculat \(€/); assert.ok(!/\$/.test(todo), todo.slice(0, 200));
  const sf = L.run("Consilier").sfaturiPozitie({ ticker: "SAPd_EQ", simbol: "SAP", moneda: "EUR", pret: 260, pretMediu: 200, pctLei: 0.3, niv: { tintaPozitie: 250 } }, { inchise: [] });
  const v = sf.filter((x) => x.nivel === "v")[0]; assert.ok(v, "sfatul de profit"); assert.match(v.titlu + v.ceAsFace, /€250/); assert.ok(!/\$/.test(v.titlu + v.ceAsFace));
  const us = L.run("Consilier").sfaturiPozitie({ ticker: "A_US_EQ", simbol: "A", pret: 260, pretMediu: 200, pctLei: 0.3, niv: { tintaPozitie: 250 } }, { inchise: [] }).filter((x) => x.nivel === "v")[0];
  assert.match(us.titlu, /\$250/, "fără monedă dată: dolari, ca până acum");
});

// ───────────── Y5. „Piața azi” ─────────────
await test("Y5. cu recitirea vie pornită, întoarcerea pe pagină după 5 minute face citirea întreagă (piața se readuce); fâșia își spune ora; pe pagina lăsată deschisă piața se readuce la 10 minute", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T15:00:00Z") }); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } });
  await L.run("t212Porneste(true)");
  assert.equal(L.cate(/stiri\?action=piata/), 1);
  assert.match(text(L.els.__piata.innerHTML), /citită la \d\d:\d\d/);
  for (let i = 0; i < 10; i++) { L.ceas.t += 30000; await L.run("t212ViuTic()"); }
  L.ceas.t += 10000; await L.run("t212Porneste(false)");
  assert.equal(L.cate(/stiri\?action=piata/), 2, "recitirea vie nu mai ține pe loc citirea întreagă");
  L.ceas.t += 4 * MIN; await L.run("t212Intretinere()"); assert.equal(L.cate(/stiri\?action=piata/), 2, "sub 10 minute: nimic");
  L.ceas.t += 7 * MIN; await L.run("t212Intretinere()"); assert.equal(L.cate(/stiri\?action=piata/), 3, "peste 10 minute: piața se readuce");
});

// ───────────── Y6. frâna contului în Poartă ─────────────
await test("Y6. t212CuFrana: frâna contului face din 🟢 CUMPĂR un AȘTEAPTĂ, cu fraza ei ca motiv; pe roșu rămâne roșu; fără frână, nimic", () => {
  const L = lume(), f = L.run("t212CuFrana"), fr = "N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI.";
  const v = f({ nivel: "cumpara", motive: [], note: [], riscPct: 0.01 }, fr);
  assert.equal(v.nivel, "asteapta"); assert.equal(v.motive.length, 1); assert.match(v.motive[0], /frâna contului/); assert.match(v.motive[0], /înainte de CPI/);
  assert.equal(f({ nivel: "nu", motive: ["trend jos"], note: [] }, fr).nivel, "nu");
  const la = { nivel: "cumpara", motive: [], note: [] }; assert.equal(f(la, ""), la);
  assert.equal(f({ nivel: "fara-date", motive: ["x"], note: [] }, fr).motive.length, 1, "fără date: nu se adaugă nimic");
});
await test("Y6. t212FranaCont: fraza de pe Piața azi (acFranaContText) când există; altfel raportul contului mai vechi de 12 ore, prin Acasa.franaCont", () => {
  const L = lume();
  assert.equal(L.run("t212FranaCont()"), "", "fără raport și fără Piața azi: nimic de spus aici (Poarta zice deja „n-am o reconciliere”)");
  L.run("t212.raportCont = { la: Date.now() - 13 * 3600000, reconciliere: { t212: { abateri: [] } } }");
  assert.match(L.run("t212FranaCont()"), /raportul pe tot contul e vechi de 13 ore/);
  L.run("t212.raportCont = { la: Date.now() - 3600000, reconciliere: { t212: { abateri: [] } }, valoare: { total: 1000 }, risc: { var95: 80 } }");
  assert.match(L.run("t212FranaCont()"), /Aș reduce expunerea/);
  L.ctx.acFranaContText = () => "N-aș porni boți noi și n-aș cumpăra chiar înainte de CPI.";
  assert.match(L.run("t212FranaCont()"), /înainte de CPI/);
});

// ───────────── Y7. câmpurile de preț ─────────────
await test("Y7. t212CitesteNr: forma paginii („1.234,56”), virgula, punctul; „1.234” se lămurește după prețul poziției; ce nu se înțelege e refuzat cu mesaj", () => {
  const L = lume(), c = L.run("t212CitesteNr");
  assert.equal(c("1.234,56").v, 1234.56); assert.equal(c("1234,56").v, 1234.56); assert.equal(c("12,5").v, 12.5); assert.equal(c("45.1").v, 45.1);
  assert.equal(c("$45,10").v, 45.1); assert.equal(c(" 1 234,5 ").v, 1234.5); assert.equal(c("1.234.567").v, 1234567);
  assert.equal(c("1.234", { ref: 1300 }).v, 1234, "lângă un preț de 1.300, „1.234” e o mie două sute"); assert.equal(c("34.441", { ref: 30 }).v, 34.441, "lângă un preț de 30, e 34,441");
  assert.equal(c("1.234").v, null); assert.match(c("1.234").eroare, /1234/); assert.match(c("1.234").eroare, /1,234/);
  assert.equal(c("").gol, true); assert.equal(c("").eroare, null);
  for (const rau of ["12abc", "1,2,3", "-5", "0", "abc"]) { const r = c(rau); assert.equal(r.v, null, rau); assert.ok(r.eroare, rau + " ⇒ mesaj"); }
  assert.equal(c("12,5", { pct: true, max: 90 }).v, 12.5); assert.ok(c("95", { pct: true, max: 90 }).eroare, "peste 90% se refuză, cu mesaj");
});
await test("Y7. planul: „1.234,56” se salvează ca 1234,56; o valoare neînțeleasă sau aruncată de server nu mai dă „Planul e salvat”", async () => {
  const L = lume(); server(L, { poz: [POZ("BKNG_US_EQ", { quantity: 1, averagePrice: 1250, currentPrice: 1300 })], bare: { BKNG_US_EQ: zilnice(L, (i) => 1100 + i * 0.6) } });
  await L.run("t212Porneste(false)");
  const camp = (k, v) => { L.el(k + "BKNG_US_EQ").value = v; };
  camp("t212Stop-", "1.234,56"); camp("t212Tinta-", "1.400"); camp("t212Trail-", "12,5");
  await L.run('t212PlanSalveaza("BKNG_US_EQ")');
  assert.equal(L.trimise.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(L.trimise[0].corp.plan)), { stop: 1234.56, tinta: 1400, trailPct: 12.5, teza: "", invalidare: "", orizont: null });
  assert.ok(L.toasturi.some((x) => /Planul e salvat/.test(x.m)));
  L.trimise.length = 0; L.toasturi.length = 0; camp("t212Stop-", "12abc");
  await L.run('t212PlanSalveaza("BKNG_US_EQ")');
  assert.equal(L.trimise.length, 0, "nimic trimis"); assert.ok(L.toasturi.some((x) => x.k === "bad" && /Stop/.test(x.m) && /nu înțeleg/.test(x.m))); assert.ok(!L.toasturi.some((x) => /Planul e salvat/.test(x.m)));
  L.toasturi.length = 0; camp("t212Stop-", ""); camp("t212Trail-", "95");
  await L.run('t212PlanSalveaza("BKNG_US_EQ")');
  assert.equal(L.trimise.length, 0, "−95% de la maxim nu pleacă (serverul l-ar arunca)"); assert.ok(L.toasturi.some((x) => x.k === "bad" && /90/.test(x.m)));
  L.toasturi.length = 0; camp("t212Trail-", "12"); camp("t212Stop-", "1200");
  L.S.scrie = (u, corp) => ({ plan: Object.assign({}, corp.plan, { stop: null, la: 1 }) });
  await L.run('t212PlanSalveaza("BKNG_US_EQ")');
  assert.ok(!L.toasturi.some((x) => /Planul e salvat/.test(x.m)), "serverul a aruncat stopul ⇒ nu „salvat”"); assert.ok(L.toasturi.some((x) => x.k === "bad" && /stop/i.test(x.m)));
  L.S.scrie = null; L.toasturi.length = 0; camp("t212Stop-", "1350");
  await L.run('t212PlanSalveaza("BKNG_US_EQ")');
  assert.ok(L.toasturi.some((x) => /Planul e salvat/.test(x.m) && /peste prețul de acum/.test(x.m)), "stop peste preț: se salvează, dar avertizează");
});

// ───────────── Y8. Poarta: prețul proaspăt ─────────────
await test("Y8. ruta preturi: răspunsul își spune ora (`la`); cu proaspat=1 o copie mai veche de 2 minute nu se mai servește, fără el rămâne cea ținută", async () => {
  const TOKEN = "t".repeat(40), ENV = { APP_API_TOKEN: TOKEN };
  const m = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href + "?p332=" + Date.now());
  let nFetch = 0; const fetchVechi = globalThis.fetch, acumVechi = Date.now; let acum = Date.parse("2026-11-12T15:00:00Z"); Date.now = () => acum;
  globalThis.fetch = async () => { nFetch++; const ts = [], c = []; for (let i = 0; i < 30; i++) { ts.push(1700000000 + i * 86400); c.push(100 + i + nFetch); } return new Response(JSON.stringify({ chart: { result: [{ timestamp: ts, indicators: { quote: [{ open: c, high: c, low: c, close: c, volume: c }] } }] } }), { status: 200 }); };
  const cer = async (qs) => { const r = await m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.33.2.1" } }), env: ENV }); return { status: r.status, corp: JSON.parse(await r.text()) }; };
  try {
    const a = await cer("action=preturi&ticker=PRSP_US_EQ&interval=1d"); assert.equal(a.status, 200); assert.equal(a.corp.la, acum, "ora aducerii"); assert.equal(nFetch, 1);
    acum += 5 * MIN; const b = await cer("action=preturi&ticker=PRSP_US_EQ&interval=1d"); assert.equal(nFetch, 1, "fără proaspat: copia ținută"); assert.equal(b.corp.la, a.corp.la);
    const c = await cer("action=preturi&ticker=PRSP_US_EQ&interval=1d&proaspat=1"); assert.equal(nFetch, 2, "cu proaspat=1: adus din nou"); assert.equal(c.corp.la, acum);
    acum += MIN; await cer("action=preturi&ticker=PRSP_US_EQ&interval=1d&proaspat=1"); assert.equal(nFetch, 2, "sub 2 minute: copia e destul de proaspătă");
  } finally { globalThis.fetch = fetchVechi; Date.now = acumVechi; }
});
await test("Y8. Poarta, în ședință: cere prețul proaspăt și scrie ora lui lângă „acum”", async () => {
  const L = lume({ acum: Date.parse("2026-11-12T16:00:00Z") }); server(L, { poz: [], bare: { ASTS_US_EQ: zilnice(L, (i) => 40 + i * 0.05) } });
  L.run("t212.cont = { cash: { total: 50000, free: 5000 } }");
  L.el("t212PSimbol").value = "ASTS";
  await L.run("t212Poarta()");
  assert.ok(L.cereri.some((u) => /preturi&interval=1d&ticker=ASTS_US_EQ/.test(u) && /proaspat=1/.test(u)), "cu bursa deschisă cere proaspat=1");
  assert.match(text(L.els.t212PoartaRez.innerHTML), /acum \$[\d.,]+ \(adus la \d\d:\d\d\)/);
});

// ───────────── 4. „Țintă” ─────────────
await test("4. „Țintă”: cu plan salvat arată ținta DIN PLAN (cea pe care sună colectorul și o desenează graficul), spusă ca atare; fără plan, cea calculată", async () => {
  const L = lume(), o = { poz: [POZ("APLD_US_EQ", { averagePrice: 30, currentPrice: 31 })], bare: { APLD_US_EQ: zilnice(L, (i) => 20 + i * 0.035) }, planuri: { APLD_US_EQ: { trailPct: 15, tinta: 34.44, la: 1 } } }; server(L, o);
  await L.run("t212Porneste(false)");
  const calc = L.run("t212.pozPregatite[0].niv.tintaPozitie"); assert.ok(Math.abs(calc - 34.44) > 0.005, "ținta calculată azi e alta");
  const rand = L.run("t212RandPozitie(t212.pozPregatite[0])"), cel = text((rand.match(/<td class="c-tinta"[^>]*>(.*?)<\/td>/) || [])[1] || "");
  assert.match(cel, /\$34,44/); assert.match(cel, /din plan/); assert.ok(!cel.includes(L.run("t212Usd")(calc)), "nu cea calculată");
  L.run("t212.planuri = {}; t212Render()");
  const cel2 = text((L.run("t212RandPozitie(t212.pozPregatite[0])").match(/<td class="c-tinta"[^>]*>(.*?)<\/td>/) || [])[1] || "");
  assert.ok(cel2.includes(L.run("t212Usd")(calc))); assert.match(cel2, /calculată/);
});

// ───────────── 🔵 mărunte ─────────────
await test("🔵 zilele scurte NYSE (a doua zi după Thanksgiving, 24.12, 3.07): bursa se închide la 13:00; zilele obișnuite și Xetra rămân", () => {
  const L = lume(), CB = L.run("CalendarBursa"), st = (iso, s) => CB.stare(Date.parse(iso), s || "SPY");
  assert.equal(st("2026-11-27T17:00:00Z").deschisa, true, "12:00 la New York"); assert.equal(st("2026-11-27T19:00:00Z").deschisa, false, "14:00: închisă");
  assert.equal(CB.ultimaZiInchisa(Date.parse("2026-11-27T19:00:00Z"), "SPY"), "2026-11-27");
  assert.equal(st("2026-12-24T19:00:00Z").deschisa, false); assert.equal(st("2025-07-03T18:30:00Z").deschisa, false, "3 iulie 2025, 14:30");
  assert.equal(st("2026-07-02T18:30:00Z").deschisa, true, "2 iulie 2026 e zi întreagă (4 iulie pică sâmbăta)");
  assert.equal(st("2026-11-12T19:00:00Z").deschisa, true, "zi obișnuită"); assert.equal(st("2026-11-27T15:00:00Z", "SAPd_EQ").deschisa, true, "Xetra: neschimbat");
  assert.equal(CB.inchideMin("2026-11-27", "NYSE"), 780); assert.equal(CB.inchideMin("2026-11-12", "NYSE"), 960);
  // inchidereLa rămâne pe ora obișnuită (margine prudentă; ora redeschiderii de pe Piața azi = închiderea − 6 h 30 min, acOraRedeschidere)
  assert.equal(new Date(CB.inchidereLa("2026-11-27", "SPY")).toISOString(), "2026-11-27T21:00:00.000Z");
});
await test("🔵 Market Breadth se cere cu limită de timp; „Câștigat real” spune când istoricul încă se coboară; cod mort scos", async () => {
  assert.match(fnDin(T212, "t212RegimAdu"), /fetch\(LatimeUS\.SURSA, \{[^}]*signal:/);
  assert.ok(!/p\.semVechi = p\.sem;/.test(T212), "p.semVechi nu era citit nicăieri");
  const L = lume(); server(L, { poz: [POZ("ABCD_US_EQ")], bare: { ABCD_US_EQ: zilnice(L, (i) => 45 + i * 0.045) } });
  const baza = L.S.raspunde;
  L.S.raspunde = (u) => (/action=istoric/.test(u) ? { umpleri: [{ id: "1", t: Date.parse("2026-08-03T15:00:00Z"), side: "BUY", ticker: "ABCD_US_EQ", simbol: "ABCD", nume: "ABCD", qty: 100, pret: 50, net: 23000, fee: 34, fx: 0.217 },
    { id: "2", t: Date.parse("2026-09-03T15:00:00Z"), side: "SELL", ticker: "ABCD_US_EQ", simbol: "ABCD", nume: "ABCD", qty: 50, pret: 55, net: 12600, fee: 19, fx: 0.217, realizat: 1100 }], stare: { complet: false, ordine: 2 } } : baza(u));
  await L.run("t212Porneste(false)");
  assert.match(text(L.els.t212Sus.innerHTML), /istoricul încă se coboară/);
});
await test("🔵 ideile: serverul păstrează riscul ideii (riscPct), ca rândul „−x%, din probă” să aibă de unde", async () => {
  const S = citeste("functions", "api", "t212.js");
  assert.match(S, /riscPct: \(\(r\) => \(r !== null && r > 0 && r < 1 \? r : null\)\)\(nr\(x && x\.riscPct\)\)/);
});

// ───────────── 6. cereri degeaba ─────────────
await test("6. Consilierul din KV (cons + decizie) se cere doar pentru fișa deschisă: 3 poziții ⇒ 2 cereri la desen, nu 6; fișa aleasă de mână le cere pe ale ei", async () => {
  const L = lume(), tk = ["AAA_US_EQ", "BBB_US_EQ", "CCC_US_EQ"], bare = {}; tk.forEach((k) => { bare[k] = zilnice(L, (i) => 45 + i * 0.045); });
  server(L, { poz: tk.map((k) => POZ(k)), bare });
  const baza = L.S.raspunde; L.S.raspunde = (u) => (/action=(cons|decizie)&bot=/.test(u) ? { cons: null, decizii: [] } : baza(u));
  await L.run("t212Porneste(false)"); await scurge();
  const n = L.cate(/action=(cons|decizie)&bot=t212-/);
  assert.equal(n, 2, "doar fișa deschisă (" + n + " cereri)");
  const alta = tk.filter((k) => k !== L.run("t212.ales"))[0]; L.run('t212Alege("' + alta + '")'); await scurge();
  assert.equal(L.cate(new RegExp("action=cons&bot=t212-" + alta)), 1);
});

console.log(`\n${teste - picate}/${teste} trec\n`);
process.exit(picate ? 1 : 0);
