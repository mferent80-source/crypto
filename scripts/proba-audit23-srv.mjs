// Probele auditului din 23.10.2026 - felia SERVERUL + COLECTORUL. Funcții pure / module importate, KV fals, fetch fals, fără rețea.
// Fiecare test poartă numărul constatării din audit: (1) alertele în KV pe timp · (2) stopurile T212 cu vârstă · (3) poza doar la schimbare
// · (4) colectorul nu mai iese · (5) proba de ecran pe rutele publice · (6) pornirea eșalonată · (7) scrierile cu doi scriitori pe rând
// · (8) cache pe tickerele PERP · (9) cererile abandonate ies din coadă · (10) contrafactualul · (11) lichidarea / „vede iar” · (12) alertele
// T212 fără poză · (13) peste 100 de boți · (14) CSP · (15) știrile picate · (16) jurnalul cu NUL · (17) semnalul de ieșire · (18) CMG_CA.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\naudit 23.10 · serverul + colectorul\n");
const MIN = 60000, ORA = 3600000, ZI = 86400000;
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
function kvFals() { const m = new Map(); return { m, async get(k) { await pauza(2); return m.has(k) ? m.get(k) : null; }, async put(k, v) { await pauza(2); m.set(k, String(v)); }, async list() { return { keys: [...m.keys()].map((name) => ({ name })), list_complete: true }; } }; }
const TOKEN = "proba-audit23-token-1234567890";
let ipN = 0;
const ip = () => "10.23." + (Math.floor(++ipN / 250) % 250) + "." + (ipN % 250);
const cerere = (url, metoda, corp) => new Request("https://radar.test" + url, { method: metoda, headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://radar.test", "x-forwarded-for": ip() }, ...(corp === undefined ? {} : { body: JSON.stringify(corp) }) });
const IB = await import("../functions/api/istoric-bot.js");
const postIb = (env, action, corp) => IB.onRequestPost({ request: cerere("/api/istoric-bot?action=" + action, "POST", corp), env }).then((r) => r.json());
const getIb = (env, q) => IB.onRequestGet({ request: cerere("/api/istoric-bot?" + q, "GET"), env }).then((r) => r.json());

// ---------- (1) alertele din KV: păstrate pe TIMP (7 zile), grilele separat ----------
await test("(1) 150 de alerte importante într-o zi ⇒ toate 150 rămân (înainte: ultimele 100, ~7,5 ore)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now() - ZI;
  for (let i = 0; i < 150; i++) await postIb(env, "alerte", { alerta: { t: t0 + i * 9 * MIN, nivel: i % 3 ? "info" : "critic", titlu: "a" + i, bot: "B1", pret: 1 } });
  const r = await getIb(env, "action=alerte");
  assert.equal(r.alerte.length, 150); assert.equal(r.alerte[0].titlu, "a149", "cea mai nouă prima"); assert.equal(r.alerte[149].titlu, "a0");
});
await test("(1) grilele („grila”) nu mai împing afară alerta critică de noapte; GET dă cel mult 100 de grile, cele mai noi", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now() - 20 * ORA;
  await postIb(env, "alerte", { alerta: { t: t0, nivel: "critic", titlu: "SOL: lichidarea la 4%", bot: "B1", cheie: "lichidare", pret: 150 } });
  for (let i = 1; i <= 160; i++) await postIb(env, "alerte", { alerta: { t: t0 + i * MIN, nivel: "info", titlu: "SOL: grilă atinsă " + i, bot: "B1", cheie: "grila", pret: 150 } });
  const r = await getIb(env, "action=alerte");
  assert.ok(r.alerte.some((x) => x.cheie === "lichidare"), "alerta critică a fost împinsă afară de grile");
  const g = r.alerte.filter((x) => x.cheie === "grila");
  assert.equal(g.length, 100); assert.equal(g[0].titlu, "SOL: grilă atinsă 160");
  assert.ok(r.alerte.every((x, i) => i === 0 || r.alerte[i - 1].t >= x.t), "lista nu e de la cea mai nouă la cea mai veche");
  assert.ok(JSON.parse(env.ISTORIC.m.get("alerte")).every((x) => x.cheie !== "grila"), "grilele stau tot în cheia „alerte”");
});
await test("(1) ce e mai vechi de 7 zile iese; plafonul de siguranță 3000 pe lista importantă (și mărimea sub 25 MB)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, acum = Date.now();
  const vechi = Array.from({ length: 3000 }, (_, i) => ({ t: acum - 8 * ZI + i, nivel: "info", titlu: "v" + i, mesaj: "", bot: null, cheie: null, pret: null, simbol: null }));
  env.ISTORIC.m.set("alerte", JSON.stringify(vechi.concat(Array.from({ length: 3000 }, (_, i) => ({ ...vechi[i], t: acum - 6 * ZI + i, titlu: "n" + i })))));
  await postIb(env, "alerte", { alerta: { t: acum, nivel: "critic", titlu: "nou" } });
  const l = JSON.parse(env.ISTORIC.m.get("alerte"));
  assert.equal(l.length, 3000); assert.ok(l.every((x) => x.t >= acum - 7 * ZI)); assert.equal(l[l.length - 1].titlu, "nou");
  assert.equal(IB.ALERTE_MAX, 3000);
  const plina = { t: acum, nivel: "critic", titlu: "ă".repeat(200), mesaj: "ă".repeat(600), bot: "x".repeat(64), cheie: "x".repeat(32), pret: 123456.789, simbol: "X".repeat(40) };
  assert.ok(Buffer.byteLength(JSON.stringify(Array(IB.ALERTE_MAX).fill(plina))) < 25 * 1024 * 1024 / 4, "3000 de alerte pline trec de un sfert din limita KV");
});
await test("(1) „ce a urmat” (alerte-dupa) se lipește și pe alertele de peste 24 h; turaDupa24h le găsește", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Date.now() - 30 * ORA;
  await postIb(env, "alerte", { alerta: { t, nivel: "atentie", titlu: "vechi", bot: "B7", pret: 2 } });
  for (let i = 0; i < 120; i++) await postIb(env, "alerte", { alerta: { t: t + (i + 1) * 5 * MIN, nivel: "info", titlu: "g" + i, bot: "B7", cheie: "grila", pret: 2 } });
  await postIb(env, "alerteDupa", { lista: [{ t, bot: "B7", pret24: 2.2 }] });
  const r = await getIb(env, "action=alerte"), v = r.alerte.find((x) => x.titlu === "vechi");
  assert.ok(v, "alerta de acum 30 h lipsește"); assert.deepEqual(v.dupa, { pret: 2.2 });
});

// ---------- (2) stopurile T212 ținute cu vârstă ----------
const S = await import("./lib/sanatate-colector.mjs");
await test("(2) stopuriT212Pas: citirea bună le ține; eroarea până la 15 min păstrează ultimele (fără pâlpâit); peste 15 min ⇒ niciun stop + „nesigur”", () => {
  assert.equal(typeof S.stopuriT212Pas, "function"); assert.equal(S.STOPURI_T212_MAX_MS, 15 * MIN);
  const st = {}, t0 = Date.UTC(2026, 9, 23, 12, 0);
  assert.deepEqual(S.stopuriT212Pas(st, { stopuri: { AAPL_US_EQ: 180 }, eroare: null, acum: t0 }), { stopuri: { AAPL_US_EQ: 180 }, eroare: null });
  assert.deepEqual(S.stopuriT212Pas(st, { stopuri: null, eroare: "HTTP 429", acum: t0 + 10 * MIN }), { stopuri: { AAPL_US_EQ: 180 }, eroare: null }, "sub 15 min: ultimele cunoscute");
  const r = S.stopuriT212Pas(st, { stopuri: null, eroare: "HTTP 403", acum: t0 + 16 * MIN });
  assert.deepEqual(r.stopuri, {}, "peste 15 min stopul vechi tot „există”"); assert.match(r.eroare, /stop/); assert.match(r.eroare, /16 min/); assert.match(r.eroare, /HTTP 403/);
  assert.deepEqual(S.stopuriT212Pas(st, { stopuri: {}, eroare: null, acum: t0 + 17 * MIN }), { stopuri: {}, eroare: null }, "revenirea: lista goală bună = fără stopuri, sigur");
  const st2 = {}; const r2 = S.stopuriT212Pas(st2, { stopuri: null, eroare: "x", acum: t0 });
  assert.deepEqual(r2.stopuri, {}); assert.match(r2.eroare, /de la pornire/, "fără nicio citire bună: nesigur de la început");
});
await test("(2) colectorul: stopT212 din stopuriT212Pas, iar eroarea lui intră în t212Eroare (paznicul spune „nesigur”, nu „ai stop”)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /S\.stopuriT212Pas\(stopuriT212, \{ stopuri: o && o\.stopuri, eroare: eo, acum: Date\.now\(\) \}\)/);
  assert.match(c, /stopT212: sp\.stopuri\[x\.ticker\] \?\? null/);
  assert.match(c, /if \(!t212Eroare && stopuriT212Nesigur\) t212Eroare = stopuriT212Nesigur;/);
  assert.ok(!/stopuriT212Ultim/.test(c), "a rămas lista ținută fără vârstă");
  const w = citeste("paznic", "worker.mjs"); assert.match(w, /if \(poza\.t212Eroare \|\|/, "paznicul nu mai citește t212Eroare");
});

// ---------- (3) poza: urcată doar la schimbare (amprentă) + o bătaie la cel mult 8 min ----------
const PZ = await import("./lib/poza.mjs");
const pozaF = (o = {}) => ({ la: 1, turaLa: 1, versiune: "v", colector: { pid: 7, tura: 3 }, t212: [{ s: "AAPL", pret: 180.12, pctPret: 0.0123, niv: "tine", sfat: "Țin.", stopT212: 170, la: 5, closes30: [1, 2] }], t212La: 9, t212Eroare: null,
  boti: [{ id: "1", s: "SOL", pret: 150.123, lichidarePct: 24.31, niv: "ok", pret30: [1, 2, 3], la: 4, total: 3.21 }], simboluri: [], alerte: [{ t: 1, titlu: "x" }], ...o });
await test("(3) amprentaPoza: orele, tura, seriile de 30 și mișcările mici de preț NU schimbă amprenta; verdictul, stopul, alertele, eroarea DA", () => {
  assert.equal(typeof PZ.amprentaPoza, "function");
  const a = PZ.amprentaPoza(pozaF());
  assert.equal(PZ.amprentaPoza(pozaF({ la: 99, turaLa: 98, t212La: 97, colector: { pid: 7, tura: 50 } })), a, "ceasul / tura au schimbat amprenta");
  const p2 = pozaF(); p2.t212[0].pret = 180.4; p2.t212[0].la = 77; p2.boti[0].pret = 150.2; p2.boti[0].pret30 = [9, 9, 9]; p2.boti[0].total = 3.24;
  assert.equal(PZ.amprentaPoza(p2), a, "o mișcare mică de preț a schimbat amprenta");
  for (const [nume, f] of [["verdictul", (p) => { p.t212[0].niv = "iesi"; }], ["stopul T212", (p) => { p.t212[0].stopT212 = null; }], ["alertele", (p) => { p.alerte.push({ t: 2, titlu: "y" }); }],
    ["eroarea T212", (p) => { p.t212Eroare = "HTTP 429"; }], ["un bot nou", (p) => { p.boti.push({ id: "2", s: "BTC" }); }], ["lichidarea", (p) => { p.boti[0].lichidarePct = 9.5; }]]) {
    const p = pozaF(); f(p); assert.notEqual(PZ.amprentaPoza(p), a, nume + " n-a schimbat amprenta");
  }
});
await test("(3) urcaPoza: aceeași amprentă ⇒ nu urcă până la bătaia de 8 min (sub pragul de 10 min al bătăii separate și de 30 al paznicului)", () => {
  assert.equal(PZ.POZA_BATAIE_MS, 8 * MIN);
  const t = Date.UTC(2026, 9, 23, 10, 0);
  assert.equal(PZ.urcaPoza({ amprenta: "a", ultima: "a", ultimaLa: t, acum: t + 7 * MIN }), false);
  assert.equal(PZ.urcaPoza({ amprenta: "a", ultima: "a", ultimaLa: t, acum: t + 8 * MIN }), true);
  assert.equal(PZ.urcaPoza({ amprenta: "b", ultima: "a", ultimaLa: t, acum: t + MIN }), true);
  assert.equal(PZ.urcaPoza({ amprenta: "a", ultima: null, ultimaLa: 0, acum: t }), true);
  // cu poza urcată la cel mult ~9 min, bătaia separată (scriere KV în plus) nu pornește: bataieNecesara cere 10 min fără poză
  assert.equal(PZ.bataieNecesara({ acum: t + 9 * MIN, pozaOkLa: t, paznicLa: 0 }), false);
  const w = citeste("paznic", "worker.mjs"); assert.match(w, /const TACE_MS = 30 \* 60000/);
});
await test("(3) fereastra cea mai deasă rărită: 16–17 la 60 s (nu 30 s); scrierile pe o zi liniștită ≤ 130 (înainte ~520)", () => {
  assert.equal(PZ.cadentaPoza({ acum: Date.UTC(2026, 9, 23, 13, 30), botiActivi: 1 }), 60000, "16:30 RO");
  let urcate = 0, ultima = null, ultimaLa = 0, ultimaVerif = 0;
  for (let t = Date.UTC(2026, 9, 22, 21, 0); t < Date.UTC(2026, 9, 23, 21, 0); t += 10000) {   // o zi întreagă, ceasul de 10 s
    const cad = PZ.cadentaPoza({ acum: t, botiActivi: 2 }); if (cad === null || t - ultimaVerif < cad) continue; ultimaVerif = t;
    if (PZ.urcaPoza({ amprenta: "la-fel", ultima, ultimaLa, acum: t })) { urcate++; ultima = "la-fel"; ultimaLa = t; }
  }
  assert.ok(urcate <= 130, "urcări pe o zi fără schimbări: " + urcate);
});
await test("(3) colectorul urcă poza doar când urcaPoza zice da; amprenta ținută după urcarea reușită", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const amp = amprentaPoza\(poza\)/);
  assert.match(c, /if \(plan\.urca && urcaPoza\(\{ amprenta: amp, ultima: pozaAmprenta, ultimaLa: pozaOkLa, acum: Date\.now\(\) \}\)\) \{/);   // (12): și doar cu plan.urca
  assert.match(c, /pozaOkLa = Date\.now\(\); pozaAmprenta = amp;/);
});

// ---------- (4) colectorul nu mai iese după 15 min fără server: așteaptă cu pauze tot mai lungi ----------
const MC = await import("./lib/mesaje-colector.mjs");
await test("(4) pasDupaEsecuri: primele 15 eșecuri la ritmul obișnuit, apoi 2, 4, 5, 5… minute (plafon 5 min), niciodată „ieși”", () => {
  assert.equal(typeof S.pasDupaEsecuri, "function"); assert.equal(S.PAUZA_FARA_SERVER_MAX_MS, 5 * MIN);
  assert.deepEqual([0, 1, 14, 15].map((n) => S.pasDupaEsecuri(n, MIN)), [MIN, MIN, MIN, MIN]);
  assert.deepEqual([16, 17, 18, 40, 5000].map((n) => S.pasDupaEsecuri(n, MIN)), [2 * MIN, 4 * MIN, 5 * MIN, 5 * MIN, 5 * MIN]);
});
await test("(4) colectorul: fără process.exit pe ramura „serverul nu răspunde”; bucla se reprogramează după pasDupaEsecuri; anunț la 15 și la revenire", () => {
  const c = citeste("scripts", "colector.mjs"), i = c.indexOf("if (S.eServerOprit(e)) { esecuri++;"), bucata = c.slice(i, c.indexOf("\n    else {", i));
  assert.ok(i > 0); assert.ok(!/process\.exit/.test(bucata), "colectorul tot iese singur");
  assert.match(bucata, /if \(esecuri === MAX_ESECURI\)/); assert.match(bucata, /trimiteDiscord\(MesajeColector\.serverOprit\(MAX_ESECURI\)/);
  assert.match(c, /setTimeout\(bucla, S\.pasDupaEsecuri\(esecuri, PAS_MS\)\);/);
  assert.match(c, /if \(esecuri >= MAX_ESECURI\) \{ jurnal\("serverul răspunde din nou"\); if \(CANAL === "discord"\) await trimiteDiscord\(MesajeColector\.serverRevenit\(\)/);
});
await test("(4) mesajele: „serverul nu răspunde” nu mai spune că s-a oprit colectorul; „serverul răspunde din nou” (info, ≤ 60)", () => {
  const a = MC.serverOprit(15); assert.ok(!/colectorul s-a oprit/.test(a.mesaj)); assert.match(a.mesaj, /reia singur/); assert.match(a.mesaj, /PORNESTE-CRYPTO-RADAR\.bat/);
  const b = MC.serverRevenit(); assert.equal(b.nivel, "info"); assert.ok(b.titlu.length <= 60); assert.match(b.titlu, /răspunde din nou/);
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /"serverRevenit"/);
});

// ---------- (5) proba de ecran nu cheamă Pionex nici pe rutele publice (market.js) ----------
const P = await import("../functions/_shared/pionex.js");
const MK = await import("../functions/api/market.js");
const fetchAdevarat = globalThis.fetch;
let cereriFalse = [];
const fetchFals = (raspuns) => { cereriFalse = []; globalThis.fetch = async (u, o) => { cereriFalse.push(String(u && u.url || u)); return raspuns(String(u && u.url || u), o); }; };
const getMk = (q, antete = {}) => MK.onRequestGet({ request: new Request("https://radar.test/api/market?" + q, { headers: { authorization: "Bearer " + TOKEN, "x-forwarded-for": ip(), ...antete } }), env: { APP_API_TOKEN: TOKEN } });
const PROBA = { "x-proba-ecran": "1" };
await test("(5) market.js: cu `x-proba-ecran: 1` klines / tickers / funding / simboluri / trades / depth NU pleacă spre Pionex (503 „probă”)", async () => {
  P.reseteazaRitmPionex(); fetchFals(() => new Response(JSON.stringify({ result: true, data: { klines: [] } }), { status: 200 }));
  for (const q of ["type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H", "type=pionex_tickers&market=PERP", "type=pionex_funding&symbol=BTC_USDT_PERP", "type=pionex_symbols&market=PERP", "type=pionex_trades&symbol=BTC_USDT", "type=pionex_depth&symbol=BTC_USDT"]) {
    const r = await getMk(q, PROBA), j = await r.json();
    assert.equal(r.status, 503, q); assert.equal(j.result, false); assert.equal(j.proba, true); assert.match(j.detail, /probă de ecran/);
  }
  assert.equal(cereriFalse.length, 0, "proba a chemat Pionex: " + cereriFalse.join(", "));
  const r = await (await getMk("type=pionex_klines&symbol=ETH_USDT_PERP&interval=4H")).json();
  assert.equal(r.result, true); assert.equal(cereriFalse.length, 1, "fără antet cererea trebuia să plece");
  P.reseteazaRitmPionex();
});
await test("(5) market.js: proba ia răspunsul din cache când există (fără Pionex)", async () => {
  const tinute = new Map(); globalThis.caches = { default: { match: async (k) => { const v = tinute.get(k.url); return v ? new Response(v) : undefined; }, put: async (k, r) => { tinute.set(k.url, await r.text()); } } };
  try {
    P.reseteazaRitmPionex(); fetchFals(() => new Response(JSON.stringify({ result: true, data: { tickers: [{ symbol: "X" }] } }), { status: 200 }));
    await getMk("type=pionex_tickers&market=SPOT"); assert.equal(cereriFalse.length, 1);
    const r = await getMk("type=pionex_tickers&market=SPOT", PROBA), j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.result, true); assert.deepEqual(j.data.tickers, [{ symbol: "X" }]); assert.equal(cereriFalse.length, 1);
  } finally { delete globalThis.caches; P.reseteazaRitmPionex(); }
});
// ---------- (9) cererile abandonate ies din coada de ritm (nu mai pleacă la Pionex) ----------
const PO = await import("../functions/_shared/poarta.js");
await test("(9) abandonata: semnalul anulat sau ≥ 20 s la coadă (colectorul renunță la 20 s, pagina la 12 s)", () => {
  assert.equal(typeof PO.abandonata, "function"); assert.equal(PO.COADA_MAX_MS, 20000);
  const ac = new AbortController(), t = 1e12;
  assert.equal(PO.abandonata(ac.signal, t, t + 19999), false); assert.equal(PO.abandonata(null, t, t + 20000), true);
  ac.abort(); assert.equal(PO.abandonata(ac.signal, t, t + 1), true);
});
await test("(9) poarta publică: cererea anulată cât aștepta la rând nu pleacă spre Pionex și nu împinge ritmul celor de după", async () => {
  P.reseteazaRitmPionex();
  fetchFals(async () => { await pauza(40); return new Response(JSON.stringify({ result: true, data: { klines: [] } }), { status: 200 }); });
  const cere = (s, signal) => MK.onRequestGet({ request: new Request("https://radar.test/api/market?type=pionex_klines&interval=4H&symbol=" + s, { signal, headers: { authorization: "Bearer " + TOKEN, "x-forwarded-for": ip() } }), env: { APP_API_TOKEN: TOKEN } }).then((r) => r.json());
  const ac = new AbortController(), a = cere("AAA_USDT"), b = cere("BBB_USDT", ac.signal); await pauza(5); ac.abort();
  const [ra, rb] = await Promise.all([a, b]);
  assert.equal(ra.result, true); assert.equal(rb.result, false); assert.match(String(rb.detail), /abandonat/);
  assert.deepEqual(cereriFalse.map((u) => /BBB/.test(u)), [false], "cererea abandonată a plecat spre Pionex");
  P.reseteazaRitmPionex();
});
await test("(9) poarta privată (bot-orders): la fel - anulată la coadă ⇒ nu pleacă; bot-orders dă semnalul cererii", async () => {
  P.reseteazaRitmPionex();
  fetchFals(async () => { await pauza(40); return new Response(JSON.stringify({ result: true, data: { results: [] } }), { status: 200 }); });
  const ENVP = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret" }, ac = new AbortController();
  const a = P.pionexPrivatGet(ENVP, "/api/v1/bot/orders", {}), b = P.pionexPrivatGet(ENVP, "/api/v1/bot/orders", { x: 1 }, ac.signal); await pauza(5); ac.abort();
  await a; await assert.rejects(b, (e) => e.abandonata === true);
  assert.equal(cereriFalse.length, 1, "cererea privată abandonată a plecat");
  assert.match(citeste("functions", "api", "bot-orders.js"), /citesteBoti\(env,params,request\.signal\)/);
  P.reseteazaRitmPionex();
});
globalThis.fetch = fetchAdevarat;

// ---------- (12) alertele T212 (Consilier, ±1%, SL/TP) și fără poză: fără cheile paznicului sau noaptea ----------
await test("(12) planTuraPoza: cu paznic ziua ⇒ ritmul pozei + urcare; fără paznic SAU noaptea ⇒ tot la 5 min, doar alertele (fără urcare, fără simbolurile paginii)", () => {
  assert.equal(typeof PZ.planTuraPoza, "function"); assert.equal(PZ.ALERTE_T212_FARA_POZA_MS, 5 * MIN);
  const zi = Date.UTC(2026, 9, 23, 9, 0), noapte = Date.UTC(2026, 9, 23, 22, 0);   // 12:00 și 01:00 RO
  assert.deepEqual(PZ.planTuraPoza({ acum: zi, cheiPaznic: true, botiActivi: 1 }), { intervalMs: 180000, urca: true, simboluri: true });
  assert.deepEqual(PZ.planTuraPoza({ acum: zi, cheiPaznic: false, botiActivi: 1 }), { intervalMs: 5 * MIN, urca: false, simboluri: false });
  assert.deepEqual(PZ.planTuraPoza({ acum: noapte, cheiPaznic: true, botiActivi: 1 }), { intervalMs: 5 * MIN, urca: false, simboluri: false });
});
await test("(12) colectorul: turaPoza pornește după planTuraPoza, urcă doar cu plan.urca, iar alertele T212 / SL-TP se judecă oricum", () => {
  const c = citeste("scripts", "colector.mjs"), i0 = c.indexOf("async function turaPoza()"), corp = c.slice(i0, c.indexOf("\nfunction turaCopie()", i0));
  assert.match(corp, /const plan = planTuraPoza\(\{ acum: Date\.now\(\), cheiPaznic: !!\(PAZNIC_URL && PAZNIC_TOKEN\), botiActivi \}\);/);
  assert.match(corp, /if \(pozaInLucru \|\| Date\.now\(\) - pozaLa < plan\.intervalMs\) return;/);
  assert.ok(!/!PAZNIC_URL \|\| !PAZNIC_TOKEN/.test(corp), "turaPoza tot iese fără cheile paznicului");
  const iUrca = corp.indexOf("if (plan.urca && urcaPoza("), iSLTP = corp.indexOf("alerteSLTP(poza, Date.now())"), iPasi = corp.indexOf("alerteT212Pasi(poza, st, Date.now())");
  assert.ok(iUrca > 0, "urcarea nu e sub plan.urca"); assert.ok(iSLTP > 0 && iPasi > 0);
  const blocUrca = corp.slice(iUrca, corp.indexOf("\n    }\n", iUrca));
  assert.ok(!blocUrca.includes("alerteSLTP") && !blocUrca.includes("alerteT212Pasi"), "alertele au rămas legate de urcarea pozei");
});

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exitCode = picate ? 1 : 0;
