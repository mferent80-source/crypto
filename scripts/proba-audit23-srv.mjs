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
  // v100.267 (auditul 29.10): anunțul (la 15, apoi la 3 h - S.serverOpritPas) și revenirea pleacă prin anuntaMesaj ⇒ trimiteAlerta (KV, coada), nu direct pe Discord
  assert.match(bucata, /if \(esecuri === MAX_ESECURI\)/); assert.match(bucata, /S\.serverOpritPas\(mo, \{ esecuri, acum \}\)/); assert.match(bucata, /anuntaMesaj\(MesajeColector\.serverOprit\(so\.minute\)\)/);
  assert.ok(!/trimiteDiscord\(MesajeColector\.server/.test(c), "anunțul serverului pleacă iar direct pe Discord");
  assert.match(c, /setTimeout\(bucla, S\.pasDupaEsecuri\(esecuri, PAS_MS\)\);/);
  assert.match(c, /if \(esecuri >= MAX_ESECURI\) jurnal\("serverul răspunde din nou"\);/);
  /* v100.267 (revizia 29.10): încercarea contează - refuzat de Discord, mesajul e deja în coada de pe disc (fără dubluri pe tură) */
  assert.match(c, /S\.serverRevenitPas\(mo\)\.tip === "revenit"\) \{ await anuntaMesaj\(MesajeColector\.serverRevenit\(\)\); mo\.serverOpritAnuntat = 0; \}/);
  assert.match(c, /if \(so\.tip === "oprit"\) \{ await anuntaMesaj\(MesajeColector\.serverOprit\(so\.minute\)\); mo\.serverOpritAnuntat = acum; \}/);
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
// ---------- (8) tickerele PERP și lista de simboluri din bot-orders: prin cache (20 s), cererile identice legate ----------
const BO = await import("../functions/api/bot-orders.js");
await test("(8) preturiPerp: 3 cereri deodată = UN apel la Pionex; încă una în 20 s = din cache; după 20 s se cere iar; eroarea nu se ține minte", async () => {
  assert.equal(typeof BO.reseteazaCacheBotOrders, "function"); assert.equal(BO.PRETURI_PERP_TTL_MS, 20000);
  P.reseteazaRitmPionex(); BO.reseteazaCacheBotOrders();
  let rau = false;
  fetchFals(async () => { await pauza(10); return rau ? new Response("x", { status: 500 }) : new Response(JSON.stringify({ result: true, data: { tickers: [{ symbol: "SOL_USDT_PERP", close: "150" }] } }), { status: 200 }); });
  const t = Date.now(), r = await Promise.all([BO.preturiPerp(t), BO.preturiPerp(t), BO.preturiPerp(t)]);
  assert.equal(cereriFalse.length, 1); assert.deepEqual(r[0], { SOL_USDT_PERP: 150 }); assert.deepEqual(r[2], r[0]);
  await BO.preturiPerp(t + 19000); assert.equal(cereriFalse.length, 1, "în 20 s trebuia din cache");
  rau = true; await assert.rejects(() => BO.preturiPerp(t + 21000)); assert.equal(cereriFalse.length, 2);
  rau = false; await BO.preturiPerp(t + 22000); assert.equal(cereriFalse.length, 3, "eroarea a rămas ținută minte");
  BO.reseteazaCacheBotOrders(); P.reseteazaRitmPionex();
});
await test("(8) hartaSimboluri: cererile deodată legate (un apel); bot-orders folosește tot preturiPerp / hartaSimboluri", async () => {
  P.reseteazaRitmPionex(); BO.reseteazaCacheBotOrders();
  fetchFals(async () => { await pauza(10); return new Response(JSON.stringify({ result: true, data: { symbols: [{ symbol: "PUMP_USDT_PERP", baseCurrency: "PUMPFUN", quoteCurrency: "USDT" }] } }), { status: 200 }); });
  const r = await Promise.all([BO.hartaSimboluri(), BO.hartaSimboluri()]);
  assert.equal(cereriFalse.length, 1); assert.equal(r[1]["PUMPFUN.PERP|USDT"], "PUMP_USDT_PERP");
  BO.reseteazaCacheBotOrders(); P.reseteazaRitmPionex();
});
globalThis.fetch = fetchAdevarat;

// ---------- (7) cheile cu doi scriitori, serializate (peCheie) ----------
const T2 = await import("../functions/api/t212.js");
const postT = (env, action, corp) => T2.onRequestPost({ request: cerere("/api/t212?action=" + action, "POST", corp), env }).then(async (r) => ({ status: r.status, j: await r.json() }));
await test("(7) config: colectorul (colectorLa) și pagina (prag, frână) deodată ⇒ toate rămân", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  await Promise.all([postIb(env, "config", { colectorLa: 123, canal: "discord" }), postIb(env, "config", { prag: { pierdere: 5, tinta: 3, afaraOre: 12 } }), postIb(env, "config", { frana: { zi: 10, sapt: 30, rand: 3 } })]);
  const c = JSON.parse(env.ISTORIC.m.get("config"));
  assert.equal(c.colectorLa, 123); assert.deepEqual(c.prag, { pierdere: 5, tinta: 3, afaraOre: 12 }); assert.deepEqual(c.frana, { zi: 10, sapt: 30, rand: 3 });
});
await test("(7) voci + vociDupa, contZi, teze:t212: scrieri deodată ⇒ niciuna pierdută", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t = Date.now() - 2 * ZI;
  await postIb(env, "voci", { intrare: { la: t, bot: "B1", simbol: "SOL_USDT_PERP", pret: 150, text: "a" } });
  await Promise.all([postIb(env, "voci", { intrare: { la: t + 1, bot: "B2", pret: 2, text: "b" } }), postIb(env, "vociDupa", { lista: [{ la: t, bot: "B1", pret24: 155, pretDir: 1 }] }), postIb(env, "voci", { intrare: { la: t + 2, bot: "B3", pret: 3, text: "c" } })]);
  const v = JSON.parse(env.ISTORIC.m.get("voci"));
  assert.equal(v.length, 3, "o voce s-a pierdut"); assert.deepEqual(v.find((x) => x.bot === "B1").dupa, { pret: 155, pretDir: 1 }, "judecata s-a pierdut");
  await Promise.all(["2026-10-20", "2026-10-21", "2026-10-22"].map((z, i) => postIb(env, "contZi", { z, valoare: 1000 + i })));
  assert.equal(JSON.parse(env.ISTORIC.m.get("cont:zile")).length, 3);
  await Promise.all(["AAPL_US_EQ", "MSFT_US_EQ", "NVDA_US_EQ"].map((tk) => postIb(env, "plan", { bot: "t212-" + tk, plan: { stop: 100, teza: "teza " + tk } })));
  assert.equal(JSON.parse(env.ISTORIC.m.get("teze:t212")).length, 3);
});
await test("(7) t212 istoric (t212:umpleri / t212:ordine): două pagini deodată ⇒ toate umplerile rămân", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, u = (id, t) => ({ id, t, side: "BUY", ticker: "AAPL_US_EQ", qty: 1, pret: 100, net: 450 });
  await Promise.all([postT(env, "istoric", { ordine: ["o1"], umpleri: [u("f1", 1e12)] }), postT(env, "istoric", { ordine: ["o2"], umpleri: [u("f2", 1e12 + 1)] }), postT(env, "istoric", { ordine: ["o3"], umpleri: [u("f3", 1e12 + 2)] })]);
  assert.equal(JSON.parse(env.ISTORIC.m.get("t212:umpleri")).length, 3); assert.equal(JSON.parse(env.ISTORIC.m.get("t212:ordine")).length, 3);
});
await test("(7) Salt: două „pune” deodată ⇒ ambele; lista întreagă a colectorului cu `inainte` diferit de KV ⇒ 409 (nu scrie peste pagină)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, poz = (isin, simbol) => ({ isin, simbol, nume: simbol, qty: 2, pretMediu: 10, de: "2026-10-01", plata: "EUR" });
  await Promise.all([postT(env, "saltPoz", { pune: poz("DE0007030009", "RHM.DE") }), postT(env, "saltPoz", { pune: poz("US0378331005", "AAPL") })]);
  const l = JSON.parse(env.ISTORIC.m.get("t212:salt-pozitii")); assert.equal(l.length, 2, "o poziție pusă deodată s-a pierdut");
  const r = await postT(env, "saltPozitii", { pozitii: [poz("NL0010273215", "ASML.AS")], inainte: [l[0]] });
  assert.equal(r.status, 409); assert.equal(JSON.parse(env.ISTORIC.m.get("t212:salt-pozitii")).length, 2, "lista colectorului a scris peste pagină");
  const ok = await postT(env, "saltPozitii", { pozitii: l.concat([poz("NL0010273215", "ASML.AS")]), inainte: l });
  assert.equal(ok.status, 200); assert.equal(JSON.parse(env.ISTORIC.m.get("t212:salt-pozitii")).length, 3);
  // o listă veche din KV, fără câmpul „plata” (formă mai veche), nu dă 409 la nesfârșit: comparația e pe aceeași curățare
  const veche = JSON.parse(env.ISTORIC.m.get("t212:salt-pozitii")).map(({ plata, ...x }) => x); env.ISTORIC.m.set("t212:salt-pozitii", JSON.stringify(veche));
  assert.equal((await postT(env, "saltPozitii", { pozitii: veche, inainte: veche })).status, 200, "forma veche dă 409 pentru totdeauna");
  assert.match(citeste("scripts", "colector.mjs"), /trimite\("\/api\/t212\?action=saltPozitii", \{ pozitii: a\.lista, inainte: citita \}\)/);
});
await test("(7) peCheie pe toate cheile cu doi scriitori (istoric-bot.js, t212.js)", () => {
  const s = citeste("functions", "api", "istoric-bot.js"), t = citeste("functions", "api", "t212.js");
  for (const k of ['"kv:config"', '"kv:voci"', '"kv:cont:zile"', '"kv:teze:t212"']) assert.ok(s.includes("peCheie(" + k), "istoric-bot: fără peCheie pe " + k);
  for (const k of ['"kv:t212:salt-pozitii"', '"kv:t212:umpleri"']) assert.ok(t.includes("peCheie(" + k), "t212: fără peCheie pe " + k);
});

// ---------- (10) contrafactualul: plafonul nu mai taie boții „fara-date” ca să-i reia roata ----------
await test("(10) taieContrafactual: „fara-date” (mici) se țin până la ARHIVA_MAX; cei cu verdict, cel mult 3000; peste total ies întâi „fara-date” cei mai vechi", () => {
  assert.equal(typeof IB.taieContrafactual, "function"); assert.equal(IB.CF_REALI_MAX, 3000);
  const fd = (la) => ({ nivel: "fara-date", motive: ["Pionex nu mai dă lumânările de atunci"], dirTrend: null, la }), real = (la) => ({ nivel: "nu", motive: ["m"], dirTrend: "sus", la });
  const m = {}; for (let i = 0; i < 3500; i++) m["f" + i] = fd(1000 + i); for (let i = 0; i < 3100; i++) m["r" + i] = real(1000 + i);
  IB.taieContrafactual(m);
  assert.equal(Object.keys(m).filter((k) => k[0] === "f").length, 3500, "„fara-date” tăiați (roata reîncepe)"); assert.equal(Object.keys(m).filter((k) => k[0] === "r").length, 3000);
  assert.ok(!m.r0 && !m.r99 && m.r100, "trebuiau tăiați cei mai vechi cu verdict");
  const m2 = {}; for (let i = 0; i < 25; i++) m2["f" + i] = fd(i); for (let i = 0; i < 5; i++) m2["r" + i] = real(100 + i);
  IB.taieContrafactual(m2, 3000, 20);
  assert.equal(Object.keys(m2).length, 20); assert.ok(m2.r0 && m2.r4, "peste total ies întâi „fara-date”"); assert.ok(!m2.f0 && !m2.f9 && m2.f10);
  // mărimea: ARHIVA_MAX „fara-date” + 3000 cu verdict plin (4 motive × 200 de semne) ⇒ sub 25 MB
  const plin = { nivel: "nu", motive: Array(4).fill("ă".repeat(200)), dirTrend: "jos", la: Date.now() }, f = fd(Date.now());
  const marime = 20000 * (JSON.stringify(f).length + 24) + 3000 * (Buffer.byteLength(JSON.stringify(plin)) + 24);
  assert.ok(marime < 25 * 1024 * 1024 / 2, "contrafactualul plin: " + Math.round(marime / 1048576) + " MB");
});
await test("(10) serverul: 3200 de „fara-date” trimiși în loturi rămân toți (arhiva are 2343 de boți, peste 3000 roata reîncepea)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  for (let p = 0; p < 16; p++) await postIb(env, "contrafactual", { boti: Array.from({ length: 200 }, (_, i) => ({ id: "b" + (p * 200 + i), zice: { nivel: "fara-date", motive: ["Pionex nu mai dă lumânările de atunci"] } })) });
  const m = JSON.parse(env.ISTORIC.m.get("contrafactual")); assert.equal(Object.keys(m).length, 3200); assert.ok(m.b0 && m.b3199);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /taieContrafactual\(m\);/);
});

// ---------- (11) lichidarea critică nu se retrimite la oscilația critic ↔ atenție; „vede iar” doar pe boții încă activi ----------
const Alerte = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "alerte.js"), "utf8") + "; return Alerte;")();
await test("(11a) evalueaza: critic → atenție → critic (sub o oră) NU retrimite critica; repetarea critică tot la o oră; după ieșirea stabilă, din nou", () => {
  const b = (d) => ({ id: "7", baza: "SOL.PERP", quote: "USDT", activ: true, distantaLichidarePct: d, pretCurent: 100, pretLichidare: 100 * (1 - d / 100), lichidareDepasita: false, directie: "long" });
  const t0 = Date.UTC(2026, 9, 23, 2, 0); let st = {}, trimise = [];
  const pas = (d, t) => { const r = Alerte.evalueaza(b(d), {}, st, t); st = r.stare; const m = r.mesaje.filter((x) => x.cheie === "lich"); trimise.push(...m.map((x) => x.nivel)); return m; };
  pas(7, t0); assert.deepEqual(trimise, ["critic"]);
  pas(12, t0 + 2 * MIN); pas(7, t0 + 4 * MIN); pas(12, t0 + 6 * MIN); pas(7, t0 + 8 * MIN);
  assert.deepEqual(trimise, ["critic"], "critica s-a retrimis la oscilație: " + trimise.join(", "));
  pas(7, t0 + 61 * MIN); assert.deepEqual(trimise, ["critic", "critic"], "repetarea critică (o oră) trebuia să plece");
  pas(30, t0 + 62 * MIN); pas(30, t0 + 73 * MIN); assert.equal(trimise[trimise.length - 1], "info", "ieșirea stabilă (10 min) nu s-a spus");
  pas(7, t0 + 80 * MIN); assert.equal(trimise[trimise.length - 1], "critic", "după ieșirea stabilă, o critică nouă trebuie să plece");
});
await test("(11b) preturiPerpPas: botul închis cât era orb NU primește „vede iar”; cel încă activ, da", () => {
  const botF = (id, pret, extra = {}) => ({ id, baza: id + ".PERP", quote: "USDT", simbolPionex: id + "_USDT_PERP", activ: true, pretCurent: pret, ...extra });
  const m = {}, A = Date.UTC(2026, 9, 23, 2, 0);
  for (let i = 0; i < 3; i++) S.preturiPerpPas(m, { probleme: { preturi: "x" }, boti: [botF("SOL", null), botF("ONDO", null)], acum: A + i * MIN });
  m.perpOrb.anuntat = A + 2 * MIN;
  const r = S.preturiPerpPas(m, { probleme: null, boti: [botF("SOL", 150)], acum: A + 9 * MIN });   // ONDO s-a închis cât era orb
  assert.equal(r.tip, "revenit"); assert.deepEqual(r.nume, ["SOL"]);
  const m2 = {}; for (let i = 0; i < 3; i++) S.preturiPerpPas(m2, { probleme: { preturi: "x" }, boti: [botF("ONDO", null), botF("BTC", 60000)], acum: A + i * MIN }); m2.perpOrb.anuntat = 1;
  const r2 = S.preturiPerpPas(m2, { probleme: null, boti: [botF("BTC", 60000)], acum: A + 9 * MIN });
  assert.equal(r2.tip, null, "„vede iar” fals pe un bot închis"); assert.equal(m2.perpOrb.anuntat, 0, "episodul trebuia închis tăcut");
});

// ---------- (13) peste 100 de boți (bot-orders: probleme.trunchiat) ⇒ spus, nu tăcere ----------
await test("(13) trunchiatPas: lista tăiată ⇒ „trunchiat” o dată, repetat cel mult la 24 h; netăiată ⇒ episodul se închide", () => {
  assert.equal(typeof S.trunchiatPas, "function");
  const m = {}, A = Date.UTC(2026, 9, 23, 9, 0);
  assert.equal(S.trunchiatPas(m, { trunchiat: false, acum: A }).tip, null);
  assert.equal(S.trunchiatPas(m, { trunchiat: true, acum: A }).tip, "trunchiat");
  assert.equal(S.trunchiatPas(m, { trunchiat: true, acum: A + MIN }).tip, "trunchiat", "netrimisă (apelantul n-a notat) ⇒ se reîncearcă");
  m.trunchiatAnuntat = A + MIN;
  assert.equal(S.trunchiatPas(m, { trunchiat: true, acum: A + 23 * ORA }).tip, null);
  assert.equal(S.trunchiatPas(m, { trunchiat: true, acum: A + 25 * ORA }).tip, "trunchiat");
  S.trunchiatPas(m, { trunchiat: false, acum: A + 26 * ORA }); assert.equal(m.trunchiatAnuntat, 0);
});
await test("(13) mesajul (atenție, ≤ 60) și colectorul îl trimite din d.probleme.trunchiat, notând doar după ce a plecat", () => {
  const a = MC.botiTrunchiati(100); assert.equal(a.nivel, "atentie"); assert.ok(a.titlu.length <= 60); assert.match(a.titlu, /100 de boți/); assert.match(a.mesaj, /\n👉 /);
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /S\.trunchiatPas\(m, \{ trunchiat: !!\(d && d\.probleme && d\.probleme\.trunchiat\), acum \}\)/);
  assert.match(c, /tr\.tip === "trunchiat" && \(await anuntaMesaj\(MesajeColector\.botiTrunchiati\(boti\.length\)\)\)\) m\.trunchiatAnuntat = acum/);
  assert.match(citeste("scripts", "lib", "garda-alerte.mjs"), /"botiTrunchiati"/);
});

// ---------- (6) pornirea eșalonată + cererile identice în zbor legate (botiInchisiToti) ----------
await test("(6) valPornire: prima tură = doar alertele; a doua = turele medii; de la a treia, toate (cele grele)", () => {
  assert.equal(typeof S.valPornire, "function");
  assert.deepEqual([1, 2, 3, 50].map(S.valPornire), [{ medii: false, grele: false }, { medii: true, grele: false }, { medii: true, grele: true }, { medii: true, grele: true }]);
});
await test("(6) unaInZbor: 3 chemări deodată = UN apel, fiecare cu copia ei (cu `complet`); după terminare se cheamă iar; eroarea ajunge la toți", async () => {
  assert.equal(typeof S.unaInZbor, "function");
  let n = 0, rau = false; const f = S.unaInZbor(async () => { n++; await pauza(10); if (rau) throw new Error("arhiva"); const l = [{ id: 1 }, { id: 2 }]; l.complet = true; return l; });
  const r = await Promise.all([f(), f(), f()]);
  assert.equal(n, 1); assert.ok(r.every((x) => x.length === 2 && x.complet === true)); assert.notEqual(r[0], r[1], "aceeași listă dată tuturor (unul o poate strica)");
  r[0].push({ id: 3 }); assert.equal(r[1].length, 2);
  await f(); assert.equal(n, 2, "după terminare trebuia chemat iar");
  rau = true; const e = await Promise.allSettled([f(), f()]); assert.equal(n, 3); assert.ok(e.every((x) => x.status === "rejected"));
});
await test("(6) colectorul: botiInchisiToti prin unaInZbor; bucla pornește turele medii / grele după valPornire(turaNr)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /var botiInchisiToti = S\.unaInZbor\(botiInchisiTotiCorp\);/);
  const b = c.slice(c.indexOf("async function bucla()"), c.indexOf("\nbucla();"));
  assert.match(b, /const val = process\.env\.COLECTOR_O_TURA \? \{ medii: true, grele: true \} : S\.valPornire\(turaNr\);/);
  assert.match(b, /if \(val\.grele && greleOk && !process\.env\.COLECTOR_FARA_CLASAMENT\) turaClasament\(\)/);
  assert.match(b, /if \(val\.grele && greleOk\) turaProfil\(\)/);
  assert.match(b, /if \(val\.medii\) turaArhivaBoti\(\)/);
  assert.match(b, /turaPlanuriT212\(\)\.catch/, "alertele T212 trebuie să plece din prima tură");
  assert.ok(!/if \(val\.[a-z]+\) turaPlanuriT212/.test(b));
});

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

// ---------- (14) CSP: pagina trece prin proxy, nu mai are voie direct la api.pionex.com ----------
await test("(14) public/_headers: connect-src fără https://api.pionex.com (pagina cere prin /api/market); restul neatins", () => {
  const h = citeste("public", "_headers"), csp = (h.match(/Content-Security-Policy:\s*([^\n]+)/) || [])[1] || "", cs = ((csp.match(/connect-src([^;]*)/) || [])[1] || "").trim().split(/\s+/);
  assert.ok(!cs.includes("https://api.pionex.com"), "connect-src tot permite api.pionex.com");
  for (const x of ["'self'", "https://fapi.binance.com", "https://api.alternative.me", "https://busola.mferent80.workers.dev", "wss://fstream.binance.com"]) assert.ok(cs.includes(x), "lipsește " + x);
  // garda veche (garzi-v746) nu mai socotește „chemată” o adresă ținută doar într-o constantă nefolosită (PIONEX_BASE din app.js)
  assert.match(citeste("scripts", "garzi-v746.mjs"), /constantaMoarta\(src, m\.index\)/);
});

// ---------- (15) știrile picate nu se mai țin 30 de minute ca „nicio știre” ----------
const ST = await import("../functions/api/stiri.js");
const getSt = (q) => ST.onRequestGet({ request: new Request("https://radar.test/api/stiri?" + q, { headers: { authorization: "Bearer " + TOKEN, "x-forwarded-for": ip() } }), env: { APP_API_TOKEN: TOKEN } }).then((r) => r.json());
const RSS = '<rss><channel><item><title>Titlu A</title><link>https://x.test/a</link><pubDate>Thu, 23 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>';
await test("(15) actiune / crypto / bursa: sursa picată ⇒ câmpul `eroare` și NU se ține în cache (cererea următoare reîncearcă); reușita se ține", async () => {
  let rau = true; fetchFals(async () => (rau ? new Response("x", { status: 503 }) : new Response(RSS, { status: 200 })));
  for (const q of ["action=actiune&ticker=ZZZ_US_EQ", "action=crypto&moneda=ZZZ", "action=bursa"]) {
    const n0 = cereriFalse.length, r = await getSt(q);
    assert.ok(r.eroare, q + ": fără `eroare` la sursa picată"); assert.ok(cereriFalse.length > n0, q);
    const n1 = cereriFalse.length; rau = false; const r2 = await getSt(q);
    assert.ok(cereriFalse.length > n1, q + ": eșecul a fost ținut în cache"); assert.equal(r2.eroare, undefined, q);
    const n2 = cereriFalse.length; await getSt(q); assert.equal(cereriFalse.length, n2, q + ": reușita nu s-a ținut"); rau = true;
  }
  rau = false;
});
globalThis.fetch = fetchAdevarat;

// ---------- (16) jurnalul colectorului după o oprire bruscă: NUL curățat, 3 rotiri ----------
function fsFals(fisiere = {}) { const f = { ...fisiere }; return { f, existsSync: (p) => p in f, statSync: (p) => ({ size: Buffer.byteLength(f[p] || ""), mtimeMs: (f.__mtime && f.__mtime[p]) || 0 }), readFileSync: (p) => { if (!(p in f)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); return f[p]; }, writeFileSync: (p, t) => { f[p] = String(t); }, renameSync: (a, b) => { f[b] = f[a]; delete f[a]; }, unlinkSync: (p) => { delete f[p]; } }; }
await test("(16) curataNulJurnal: octeții NUL de la oprirea bruscă ies la pornire (câți au fost); fără NUL nu rescrie", () => {
  assert.equal(typeof S.curataNulJurnal, "function");
  const fx = fsFals({ "L": "a\n" + "\u0000".repeat(500) + "b\n" });
  assert.equal(S.curataNulJurnal(fx, "L"), 500); assert.equal(fx.f.L, "a\nb\n");
  assert.equal(S.curataNulJurnal(fx, "L"), 0); assert.equal(S.curataNulJurnal(fsFals(), "L"), 0, "fără jurnal: nimic");
});
await test("(16) rotesteJurnal: peste 1 MB ⇒ L→L.1→L.2→L.3, al patrulea iese; sub 1 MB nimic; colectorul le folosește", () => {
  assert.equal(typeof S.rotesteJurnal, "function");
  const mare = "x".repeat(1_000_001), fx = fsFals({ L: mare, "L.1": "u1", "L.2": "u2", "L.3": "u3" });
  assert.equal(S.rotesteJurnal(fx, "L"), true);
  assert.deepEqual([fx.f.L, fx.f["L.1"], fx.f["L.2"], fx.f["L.3"]], [undefined, mare, "u1", "u2"]);
  assert.equal(S.rotesteJurnal(fsFals({ L: "mic" }), "L"), false);
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /S\.rotesteJurnal\(fs, LOG\)/); assert.match(c, /const nul = S\.curataNulJurnal\(fs, LOG\);/); assert.ok(!/LOG \+ "\.vechi"/.test(c), "a rămas rotirea veche, una singură");
});

// ---------- (17) repornirea colectorului fără administrator: fișierul-semnal ----------
await test("(17) verificaSemnal: semnalul mai nou decât pornirea ⇒ „iesi” (și-l șterge); cel vechi ⇒ „vechi” (șters, nu iese); lipsă ⇒ null", () => {
  assert.equal(typeof S.verificaSemnal, "function");
  const fx = fsFals({ "D/colector-iesi.semnal": "x", __mtime: { "D/colector-iesi.semnal": 2000 } });
  assert.equal(S.verificaSemnal(fx, "D/colector-iesi.semnal", 1000), "iesi"); assert.ok(!("D/colector-iesi.semnal" in fx.f));
  const fv = fsFals({ s: "x", __mtime: { s: 500 } }); assert.equal(S.verificaSemnal(fv, "s", 1000), "vechi"); assert.ok(!("s" in fv.f));
  assert.equal(S.verificaSemnal(fsFals(), "s", 1000), null);
});
await test("(17) colectorul verifică semnalul în bucla lui și în ceasul de 10 s, scrie în jurnal și iese curat (exit 0)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const SEMNAL_IESIRE = path\.join\(DATA, "colector-iesi\.semnal"\), PORNIT_LA = Date\.now\(\);/);
  assert.match(c, /function iesiLaSemnal\(\) \{ if \(DOAR_INCARCA\) return; if \(S\.verificaSemnal\(fs, SEMNAL_IESIRE, PORNIT_LA\) === "iesi"\) \{ jurnal\("semnal de ieșire/);
  assert.match(c, /process\.exit\(0\); \} \}/);
  const b = c.slice(c.indexOf("async function bucla()"), c.indexOf("\nbucla();"));
  assert.match(b, /^  iesiLaSemnal\(\);/m); assert.match(b, /setInterval\(\(\) => \{ iesiLaSemnal\(\); bate\(\);/);
});
const CL = await import("./copie-de-lucru.mjs");
function lumeSemnal({ moareDupa = 3, nouPid = 4242, versiune = "v101.141", ruleazaOk = true } = {}) {
  const w = { urme: [], t: 0, vechiViu: true, pid: 1111, vers: { versiune: "v101.140", la: 0 }, verifVechi: 0 };
  w.d = { pidVechi: 1111, versiuneAsteptata: "v101.141", acum: () => w.t,
    scrieSemnal: () => w.urme.push("semnal"), stergeSemnal: () => w.urme.push("sters"),
    eViu: (p) => { if (p === 1111) { w.verifVechi++; if (w.verifVechi > moareDupa) w.vechiViu = false; return w.vechiViu; } return p === nouPid; },
    asteaptaMs: (ms) => { w.t += ms; if (!w.vechiViu && w.urme.includes("schtasks") && w.t > w.tRun + 6000) { w.pid = nouPid; w.vers = { versiune, la: w.t }; } },
    ruleaza: (cmd, args) => { w.urme.push(cmd === "schtasks" ? "schtasks" : cmd); w.tRun = w.t; w.args = args; return ruleazaOk; },
    citestePid: () => w.pid, citesteVersiune: () => w.vers, scrie: (m) => w.urme.push("» " + m) };
  return w;
}
await test("(17) repornestePrinSemnal: semnal ⇒ așteaptă ieșirea PID-ului vechi ⇒ schtasks /run ⇒ PID nou viu + versiunea nouă în pentru-busola.json", () => {
  assert.equal(typeof CL.repornestePrinSemnal, "function");
  const w = lumeSemnal(), r = CL.repornestePrinSemnal(w.d);
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.pid, 4242);
  assert.deepEqual(w.urme.filter((x) => !x.startsWith("»")), ["semnal", "schtasks"]);
  assert.deepEqual(w.args, ["/run", "/tn", "Crypto Radar pornire"]);
});
await test("(17) repornestePrinSemnal: colectorul nu iese în 90 s ⇒ semnalul șters, FĂRĂ schtasks; schtasks picat sau versiunea veche ⇒ ok:false, spus", () => {
  const w = lumeSemnal({ moareDupa: 1e9 }), r = CL.repornestePrinSemnal(w.d);
  assert.equal(r.ok, false); assert.equal(r.motiv, "nu-a-iesit"); assert.ok(w.urme.includes("sters")); assert.ok(!w.urme.includes("schtasks"));
  assert.ok(w.t <= 92000, "a așteptat prea mult: " + w.t);
  const w2 = lumeSemnal({ ruleazaOk: false }); assert.equal(CL.repornestePrinSemnal(w2.d).motiv, "schtasks");
  const w3 = lumeSemnal({ versiune: "v101.140" }); assert.equal(CL.repornestePrinSemnal(w3.d).motiv, "versiunea-veche");
});
await test("(17) livrarea: la „alta-sesiune” repornește prin semnal (nu doar sfatul); calea semnalului = data\\colector-iesi.semnal", () => {
  const s = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(s, /if \(d\.motiv === "alta-sesiune" && process\.platform === "win32"\) return repornestePrinSemnal\(depSemnal\(rad, pid\)\)\.ok;/);
  assert.match(s, /path\.join\(rad, "data", "colector-iesi\.semnal"\)/);
  assert.match(s, /err && err\.code === "EPERM"/, "eViu: EPERM = rulează în altă sesiune, ESRCH = a ieșit");
});

// ---------- (18) CMG_CA: vânzarea lipsă = umplerea unui ordin PARTIALLY_FILLED, aruncată de filtrul „FILLED” ----------
const TT = await import("./lib/tura-t212.mjs");
const T212L = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "t212.js"), "utf8") + "; return T212;")();
const itemCMG = (status, oid, fid, q, p, net) => ({ order: { id: oid, status, side: q < 0 ? "SELL" : "BUY", type: "LIMIT", ticker: "CMG_CA_EQ", quantity: -60.83983836, filledQuantity: q, createdAt: "2025-10-27T17:49:18.000Z", instrument: { name: "Computer Modelling" } },
  fill: { id: fid, quantity: q, price: p, filledAt: "2025-10-27T17:51:57.000Z", type: "TRADE", walletImpact: { currency: "RON", netValue: net, fxRate: 0.32, realisedProfitLoss: -0.87, taxes: [] } } });
await test("(18) itemeUmplute: umplerea reală a unui ordin PARTIALLY_FILLED / CANCELLED (fill cu cantitate) intră în jurnal; ordinele fără umplere nu", () => {
  assert.equal(typeof TT.itemeUmplute, "function");
  const items = [itemCMG("PARTIALLY_FILLED", 40964582621, 40964582731, -9.38, 5.77, 168.45), { order: { id: 1, status: "CANCELLED", side: "SELL", ticker: "CMG_CA_EQ", filledQuantity: 0 }, fill: null }];
  assert.equal(T212L.umpleri(items).length, 0, "(dovada) filtrul vechi „FILLED” o arunca");
  const u = T212L.umpleri(TT.itemeUmplute(items));
  assert.equal(u.length, 1); assert.equal(u[0].side, "SELL"); assert.equal(u[0].qty, 9.38); assert.equal(u[0].id, "40964582731");
  assert.equal(items[0].order.status, "PARTIALLY_FILLED", "lista primită a fost modificată");
});
await test("(18) colectorul dă turelor T212 umplerile prin itemeUmplute și recitește o dată istoricul (data\\t212-exec-partiale.json)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const umpleriT212 = \(items\) => T212\.umpleri\(itemeUmplute\(items\)\);/);
  assert.ok(!/umpleri: T212\.umpleri[,\s]/.test(c), "a rămas T212.umpleri direct");
  assert.match(c, /path\.join\(DATA, "t212-exec-partiale\.json"\)/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exitCode = picate ? 1 : 0;
