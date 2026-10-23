// Probele auditului din 19.10.2026 (el: „fă tot”) - felia SERVERUL + COLECTORUL. Funcții pure / module importate, KV fals, fără rețea.
// (1) lichidarea tace când tickerele PERP nu vin · (2) contrafactualul bate în gol · (3) scrierile KV citește-modifică-scrie, fără serializare
// (4) două porți de ritm Pionex · (5) lățimea pe Binance · (6) timeout ≠ server oprit · (7) mărunte · (8) livrarea repornește colectorul
// (9) proba de telefon pune antetul doar pe adresa serverului.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./lib/sanatate-colector.mjs";
import * as MC from "./lib/mesaje-colector.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).slice(0, 400)}`); }); }
console.log("\naudit 19.10 · serverul + colectorul\n");
const ACUM = Date.UTC(2026, 9, 19, 9, 0, 0), MIN = 60000;

// ---------- (1) lichidarea oarbă ----------
const botF = (id, pret, extra = {}) => ({ id, baza: id + ".PERP", quote: "USDT", simbolPionex: id + "_USDT_PERP", activ: true, pretCurent: pret, ...extra });
await test("(1) preturiPerpPas: 3 ture fără prețuri PERP ⇒ „orb” o singură dată (cu numele boților), apoi tace până la revenire", () => {
  assert.equal(typeof S.preturiPerpPas, "function");
  const m = {}, boti = [botF("SOL", null), botF("ONDO", null)], pr = { preturi: "tickere PERP: HTTP 503" };
  assert.equal(S.preturiPerpPas(m, { probleme: pr, boti, acum: ACUM }).tip, null);
  assert.equal(S.preturiPerpPas(m, { probleme: pr, boti, acum: ACUM + MIN }).tip, null);
  const r = S.preturiPerpPas(m, { probleme: pr, boti, acum: ACUM + 2 * MIN });
  assert.equal(r.tip, "orb"); assert.deepEqual(r.nume, ["SOL", "ONDO"]); assert.equal(r.minute, 2); assert.match(r.motiv, /HTTP 503/);
  m.perpOrb.anuntat = ACUM + 2 * MIN;   // apelantul notează după ce mesajul a plecat
  assert.equal(S.preturiPerpPas(m, { probleme: pr, boti, acum: ACUM + 3 * MIN }).tip, null, "a doua alertă în același episod");
  assert.equal(S.preturiPerpPas(m, { probleme: pr, boti, acum: ACUM + 90 * MIN }).tip, null, "repetată");
  const v = S.preturiPerpPas(m, { probleme: null, boti: [botF("SOL", 150), botF("ONDO", 0.9)], acum: ACUM + 91 * MIN });
  assert.equal(v.tip, "revenit"); assert.deepEqual(v.nume, ["SOL", "ONDO"]);
  m.perpOrb.anuntat = 0;
  assert.equal(S.preturiPerpPas(m, { probleme: null, boti: [botF("SOL", 150)], acum: ACUM + 92 * MIN }).tip, null);
});
await test("(1) preturiPerpPas: netrimisă ⇒ se reîncearcă tura următoare; pretCurent null pe un bot futures activ e tot „orb”; spot / oprit / listă goală nu", () => {
  const m = {};
  for (let i = 0; i < 3; i++) S.preturiPerpPas(m, { probleme: null, boti: [botF("SOL", null), botF("BTC", 60000)], acum: ACUM + i * MIN });
  assert.equal(S.preturiPerpPas(m, { probleme: null, boti: [botF("SOL", null), botF("BTC", 60000)], acum: ACUM + 3 * MIN }).tip, "orb", "netrimisă (anuntat=0) ⇒ încă o dată");
  const m2 = {}, spot = { id: "X", baza: "ETH", quote: "USDT", simbolPionex: "ETH_USDT", activ: true, pretCurent: null };
  for (let i = 0; i < 5; i++) assert.equal(S.preturiPerpPas(m2, { probleme: { preturi: "x" }, boti: [spot, botF("OP", null, { activ: false })], acum: ACUM + i * MIN }).tip, null);
  const m3 = {}; for (let i = 0; i < 3; i++) S.preturiPerpPas(m3, { probleme: { preturi: "x" }, boti: [botF("SOL", null)], acum: ACUM + i * MIN }); m3.perpOrb.anuntat = 1;
  assert.equal(S.preturiPerpPas(m3, { probleme: null, boti: [], acum: ACUM + 9 * MIN }).tip, null, "lista goală nu e „au revenit”");
  assert.equal(m3.perpOrb.anuntat, 1);
});
await test("(1) mesajele: „<bot>: nu mai pot judeca lichidarea” (critic, ≤ 60) cu „Pionex nu dă prețurile futures de N min”; revenirea, info", () => {
  const a = MC.lichidareOarba(["SOL", "ONDO"], 3, "tickere PERP: HTTP 503");
  assert.equal(a.nivel, "critic"); assert.equal(a.titlu, "SOL, ONDO: nu mai pot judeca lichidarea"); assert.ok(a.titlu.length <= 60);
  assert.match(a.mesaj, /Pionex nu dă prețurile futures de 3 min/); assert.match(a.mesaj, /\n👉 /);
  const b = MC.lichidareVedeIar(["SOL"]); assert.equal(b.nivel, "info"); assert.match(b.titlu, /prețurile futures au revenit/i);
  assert.ok(MC.lichidareOarba(Array.from({ length: 9 }, (_, i) => "MONEDA" + i), 5, "").titlu.length <= 60);
});
await test("(1) colectorul cheamă paza după lista boților și notează „anunțat” doar după ce mesajul a plecat; garda alertelor știe mesajele", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /S\.preturiPerpPas\(m, \{ probleme: d && d\.probleme, boti, acum \}\)/);
  assert.match(c, /po\.tip === "orb" && \(await anuntaMesaj\(MesajeColector\.lichidareOarba\(po\.nume, po\.minute, po\.motiv\)\)\)\) m\.perpOrb\.anuntat = acum/);
  assert.match(c, /po\.tip === "revenit" && \(await anuntaMesaj\(MesajeColector\.lichidareVedeIar\(po\.nume\)\)\)\) m\.perpOrb\.anuntat = 0/);
  const g = citeste("scripts", "lib", "garda-alerte.mjs"); assert.match(g, /"lichidareOarba"/); assert.match(g, /"lichidareVedeIar"/);
});

// ---------- comun: KV fals (cu pauze, ca citește-modifică-scrie să se poată suprapune) și cereri spre istoric-bot ----------
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
function kvFals() { const m = new Map(); return { m, async get(k) { await pauza(3); return m.has(k) ? m.get(k) : null; }, async put(k, v) { await pauza(3); m.set(k, String(v)); }, async list() { return { keys: [...m.keys()].map((name) => ({ name })), list_complete: true }; } }; }
const TOKEN = "proba-audit19-token-1234567890";
const IB = await import("../functions/api/istoric-bot.js");
let ipN = 0;
const postIb = (env, action, corp) => IB.onRequestPost({ request: new Request("https://radar.test/api/istoric-bot?action=" + action, { method: "POST", headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://radar.test", "x-forwarded-for": "10.19.0." + (++ipN % 250) }, body: JSON.stringify(corp) }), env }).then((r) => r.json());

// ---------- (2) contrafactualul ----------
const { turaContrafactual } = await import("./lib/tura-contrafactual.mjs");
const ZI = 86400000;
function lumeCf(boti, cereKlines) {
  const jurnal = [], esuate = [], cerute = [];
  const d = { cereBoti: async () => boti, simbol: async (m) => m + "_USDT_PERP", esuat: (id) => esuate.push(id), acum: ACUM,
    cereKlines: async (s, iv, lim, end) => { cerute.push(s); return cereKlines(s, iv, lim, end); },
    gata: {}, GridCalcul: { bare: (a) => a }, GridProba: { fisa: () => ({ eroare: "x" }) }, Contrafactual: { taie: (a) => a, zice: () => ({ nivel: "nu", motive: ["m"] }) },
    JurnalTrade: { din: (l) => l }, jurnal: (...a) => jurnal.push(a.join(" ")), max: 5 };
  return { d, jurnal, esuate, cerute };
}
await test("(2b) boții porniți acum peste 95 de zile nu se mai cer: „fara-date” cu motivul, fără să ocupe locurile celor noi", async () => {
  const boti = [{ id: "v1", moneda: "ONDO", pornit: ACUM - 110 * ZI, inchis: ACUM - 100 * ZI }, { id: "v2", moneda: "ALGO", pornit: ACUM - 96 * ZI },
    ...Array.from({ length: 5 }, (_, i) => ({ id: "n" + i, moneda: "SOL", pornit: ACUM - (10 + i) * ZI, inchis: ACUM - i * ZI }))];
  const w = lumeCf(boti, async () => []);
  const rez = await turaContrafactual(w.d);
  const vechi = rez.filter((x) => x.id === "v1" || x.id === "v2");
  assert.equal(vechi.length, 2, "vechii n-au primit „fara-date”");
  for (const x of vechi) { assert.equal(x.zice.nivel, "fara-date"); assert.deepEqual(x.zice.motive, ["Pionex nu mai dă lumânările de atunci"]); }
  assert.ok(!w.cerute.includes("ONDO_USDT_PERP") && !w.cerute.includes("ALGO_USDT_PERP"), "a cerut lumânări pentru un bot vechi");
  assert.equal(rez.filter((x) => /^n/.test(x.id)).length, 5, "cei 5 noi trebuiau încercați toți");
});
await test("(2c) „endTime param error” / MARKET_INVALID_TIME ⇒ „fara-date” scris (nu reîncercare); altă eroare ⇒ reîncercare a doua zi, ca înainte", async () => {
  const boti = [{ id: "a", moneda: "ONDO", pornit: ACUM - 60 * ZI }, { id: "b", moneda: "ALGO", pornit: ACUM - 50 * ZI }, { id: "c", moneda: "BTC", pornit: ACUM - 40 * ZI }];
  const w = lumeCf(boti, async (s) => { if (s === "ONDO_USDT_PERP") throw new Error("endTime param error"); if (s === "ALGO_USDT_PERP") throw new Error("Pionex klines unavailable · MARKET_INVALID_TIME"); throw new Error("fara lumanari"); });
  const rez = await turaContrafactual(w.d);
  assert.deepEqual(rez.map((x) => x.id + "=" + x.zice.nivel).sort(), ["a=fara-date", "b=fara-date"]);
  assert.deepEqual(rez[0].zice.motive, ["Pionex nu mai dă lumânările de atunci"]);
  assert.deepEqual(w.esuate, ["c"]);
});
await test("(2a) serverul ține 3000 de boți în contrafactual (nu 500) și primește loturi de 200", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  for (let p = 0; p < 16; p++) {
    const boti = Array.from({ length: 200 }, (_, i) => ({ id: "b" + (p * 200 + i), zice: { nivel: "fara-date", motive: ["Pionex nu mai dă lumânările de atunci"] } }));
    const r = await postIb(env, "contrafactual", { boti }); assert.equal(r.ok, true);
  }
  const m = JSON.parse(env.ISTORIC.m.get("contrafactual"));
  assert.equal(Object.keys(m).length, 3000); assert.ok(m.b3199 && !m.b0, "se taie cei mai vechi");
  assert.equal(m.b3199.nivel, "fara-date"); assert.deepEqual(m.b3199.motive, ["Pionex nu mai dă lumânările de atunci"]);
});
await test("(2) colectorul dă turei ceasul; daca-ascultai-real merge tot cu tura", () => {
  assert.match(citeste("scripts", "colector.mjs"), /gata, GridCalcul, GridProba, JurnalTrade, Contrafactual, jurnal, max: 5, acum: Date\.now\(\) \}\)/);
});

// ---------- (3) scrierile KV citește-modifică-scrie, serializate pe cheie ----------
await test("(3) peCheie: aceeași cheie rulează pe rând, în ordine; o eroare nu rupe lanțul; chei diferite nu se așteaptă; lanțul se golește", async () => {
  const Ser = await import("../functions/_shared/serializare.js");
  const urme = [];
  const lucru = (n, ms, rau) => () => new Promise((res, rej) => { urme.push("start" + n); setTimeout(() => { urme.push("gata" + n); rau ? rej(new Error("rău")) : res(n); }, ms); });
  const p = [Ser.peCheie("k", lucru(1, 20)), Ser.peCheie("k", lucru(2, 5, true)), Ser.peCheie("k", lucru(3, 1)), Ser.peCheie("alta", lucru(4, 1))];
  const r = await Promise.allSettled(p);
  assert.deepEqual(r.map((x) => x.status), ["fulfilled", "rejected", "fulfilled", "fulfilled"]);
  assert.deepEqual(urme.filter((x) => /[123]$/.test(x)), ["start1", "gata1", "start2", "gata2", "start3", "gata3"]);
  assert.ok(urme.indexOf("start4") < urme.indexOf("gata1"), "cheia „alta” a așteptat după „k”");
  await pauza(5); assert.equal(Ser.lanturiDeschise(), 0);
});
await test("(3) alerte: 20 de scrieri deodată ⇒ toate 20 în listă (înainte se pierdeau)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now();
  await Promise.all(Array.from({ length: 20 }, (_, i) => postIb(env, "alerte", { alerta: { t: t0 + i, nivel: "info", titlu: "a" + i } })));
  assert.equal(JSON.parse(env.ISTORIC.m.get("alerte")).length, 20);
});
await test("(3) ferestre și verdict: scrieri deodată pe simboluri diferite ⇒ niciuna pierdută", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now(), f = { jos: 1, sus: 2, levier: 3 };
  await Promise.all(["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"].map((s, i) => postIb(env, "ferestre", { oferta: { simbol: s + "_USDT_PERP", t: t0 + i, dir: "long", ta: f, mea: f } })));
  assert.equal(JSON.parse(env.ISTORIC.m.get("ferestre")).length, 6);
  await Promise.all(["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"].map((s, i) => postIb(env, "verdict", { s: "idei", k: s, n: "cumpara", p: 10 + i, t: t0 - 1000 * i })));
  assert.equal(JSON.parse(env.ISTORIC.m.get("verdicte:jurnal")).length, 6);
});
await test("(3) decizie cu `lista` (colectorul): se UNEȘTE pe cheie — decizia pusă de om între citire și scriere nu se pierde", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now() - 3 * 86400000;
  const om = (cheie, t, urmat) => postIb(env, "decizie", { bot: "B1", cheie, t, urmat, nivel: "atentie", titlu: "T", faCe: "F", total: 5 });
  await om("k1", t0, true); await om("k2", t0 + 1000, false);
  const citita = JSON.parse(env.ISTORIC.m.get("decizii:B1"));   // colectorul citește…
  await om("k3", t0 + 2000, true);                               // …omul apasă „am făcut” pe o decizie nouă…
  await om("k2", t0 + 3000, true);                               // …și se răzgândește pe k2…
  const judecata = citita.map((e) => ({ ...e, r: 1, totalDupa: 7 }));
  await postIb(env, "decizie", { bot: "B1", lista: judecata });  // …apoi colectorul scrie lista judecată
  const l = JSON.parse(env.ISTORIC.m.get("decizii:B1")), pe = Object.fromEntries(l.map((e) => [e.cheie, e]));
  assert.deepEqual(Object.keys(pe).sort(), ["k1", "k2", "k3"], "decizia nouă a omului s-a pierdut");
  assert.equal(pe.k1.r, 1, "judecata colectorului pe k1 trebuia păstrată");
  assert.equal(pe.k2.urmat, true, "răzgândirea omului pe k2 s-a pierdut"); assert.equal(pe.k2.r, undefined, "judecata veche pe k2 nu se lipește de decizia nouă");
  assert.equal(pe.k3.urmat, true);
});
await test("(3) decizie: lista colectorului deodată cu omul (fără ordine) ⇒ tot 3 decizii; istoric-bot folosește peCheie pe cele patru acțiuni", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() }, t0 = Date.now() - 86400000;
  await postIb(env, "decizie", { bot: "B2", cheie: "k1", t: t0, urmat: true });
  const citita = JSON.parse(env.ISTORIC.m.get("decizii:B2"));
  await Promise.all([postIb(env, "decizie", { bot: "B2", lista: citita.map((e) => ({ ...e, r: 0 })) }), postIb(env, "decizie", { bot: "B2", cheie: "k2", t: t0 + 5, urmat: false }), postIb(env, "decizie", { bot: "B2", cheie: "k3", t: t0 + 6, urmat: true })]);
  assert.equal(JSON.parse(env.ISTORIC.m.get("decizii:B2")).length, 3);
  const s = citeste("functions", "api", "istoric-bot.js");
  for (const k of ['"kv:ferestre"', '"kv:verdicte:jurnal"', '"kv:alerte"', '"kv:decizii:"+bot', '"kv:contrafactual"']) assert.ok(s.includes("peCheie(" + k), "fără peCheie pe " + k);
});

// ---------- (4) o singură stare de lacăt Pionex ----------
const P = await import("../functions/_shared/pionex.js");
const MK = await import("../functions/api/market.js");
const BO = await import("../functions/api/bot-orders.js");
const PH = await import("../functions/api/provider-health.js");
const fetchAdevarat = globalThis.fetch;
let cereriFalse = [];
const fetchFals = (raspuns) => { cereriFalse = []; globalThis.fetch = async (u) => { cereriFalse.push(String(u && u.url || u)); return raspuns(String(u && u.url || u)); }; };
const ENVP = { APP_API_TOKEN: TOKEN, PIONEX_API_KEY: "cheie", PIONEX_API_SECRET: "secret" };
const getApi = (mod, cale, env = ENVP) => mod.onRequestGet({ request: new Request("https://radar.test" + cale, { headers: { authorization: "Bearer " + TOKEN, "x-forwarded-for": "10.19.1." + (++ipN % 250) } }), env });
const lacat3h = () => ({ "x-ratelimit-lock": String(Math.floor((Date.now() + 3 * 3600000) / 1000)) });
await test("(4) poarta PRIVATĂ ia lacătul ⇒ poarta PUBLICĂ (market.js) nu mai trimite nimic până la deblocare și spune ora", async () => {
  P.reseteazaRitmPionex();
  fetchFals(() => new Response("Too Many Requests", { status: 429, headers: lacat3h() }));
  await assert.rejects(() => P.pionexPrivatGet(ENVP, "/api/v1/account/balances"), (e) => e.status === 429);
  assert.equal(cereriFalse.length, 1);
  const r = await (await getApi(MK, "/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=4H")).json();
  assert.equal(r.result, false); assert.ok(r.retryAfter > 3 * 3600 - 60, "retryAfter = până la deblocare, nu 60 s: " + r.retryAfter);
  assert.match(String(r.detail), /blocat până la \d\d:\d\d/);
  assert.equal(cereriFalse.length, 1, "poarta publică a trimis în timpul lacătului");
  P.reseteazaRitmPionex();
});
await test("(4) poarta PUBLICĂ citește și `x-ratelimit-lock` ⇒ lacătul ține ore (nu 75 s) și oprește și poarta privată", async () => {
  P.reseteazaRitmPionex();
  fetchFals(() => new Response("{}", { status: 429, headers: lacat3h() }));
  await (await getApi(MK, "/api/market?type=pionex_tickers&market=PERP")).json();
  assert.equal(cereriFalse.length, 1);
  const r2 = await (await getApi(MK, "/api/market?type=pionex_tickers&market=SPOT")).json();
  assert.ok(r2.retryAfter > 3 * 3600 - 60, "răcirea publică a rămas 75 s: " + r2.retryAfter);
  await assert.rejects(() => P.pionexPrivatGet(ENVP, "/api/v1/bot/orders"), (e) => e.status === 429 && e.retryAfter > 3 * 3600 - 60);
  assert.equal(cereriFalse.length, 1, "o cerere a plecat în timpul lacătului");
  P.reseteazaRitmPionex();
});
await test("(4) tickerele PERP, simbolurile din bot-orders și sonda `deep` respectă lacătul (nu trimit)", async () => {
  P.reseteazaRitmPionex();
  fetchFals(() => new Response("{}", { status: 429, headers: lacat3h() }));
  await assert.rejects(() => P.pionexPrivatGet(ENVP, "/api/v1/bot/orders"));
  cereriFalse = [];
  assert.equal(typeof BO.preturiPerp, "function"); assert.equal(typeof BO.hartaSimboluri, "function");
  await assert.rejects(() => BO.preturiPerp(), /blocat|rate limit/i);
  await assert.rejects(() => BO.hartaSimboluri(), /blocat|rate limit/i);
  const h = await (await getApi(PH, "/api/provider-health?deep=1")).json();
  const sonda = h.providers.find((x) => /PIONEX · acces/.test(x.name));
  assert.equal(sonda.state, "DEGRADED"); assert.match(sonda.detail, /lacăt|blocat/i);
  assert.ok(!cereriFalse.some((u) => /pionex\.com/.test(u)), "a plecat spre Pionex: " + cereriFalse.join(", "));
  P.reseteazaRitmPionex();
});
await test("(4) ritmul normal neschimbat: 1,1 s între cererile publice, 250 ms între cele private; fără lacăt totul pleacă", async () => {
  P.reseteazaRitmPionex();
  assert.match(citeste("functions", "api", "market.js"), /spacing=Math\.max\(1100,Math\.max\(1,weight\)\*300\)/);
  assert.match(citeste("functions", "_shared", "pionex.js"), /const PAUZA_MS=250, RACIRE_MIN_S=15;/);
  fetchFals((u) => new Response(JSON.stringify(/symbols/.test(u) ? { result: true, data: { symbols: [] } } : { result: true, data: { tickers: [] } }), { status: 200 }));
  assert.deepEqual(await BO.preturiPerp(), {}); assert.deepEqual(await BO.hartaSimboluri(), {});
  assert.equal(cereriFalse.length, 2);
  P.reseteazaRitmPionex();
});
globalThis.fetch = fetchAdevarat;

// ---------- (5) lățimea pieței pe Binance: o pauză comună tuturor lucrătorilor ----------
const { cereBinance, turaLatime } = await import("./lib/tura-latime.mjs");
function ceasFals(t0) { const w = { t: t0, pauze: [], jurnal: [] }; w.ceas = () => w.t; w.pauza = async (ms) => { w.pauze.push(ms); w.t += ms; }; w.jurnalF = (...a) => w.jurnal.push(a.join(" ")); return w; }
const rasp = (status, antete = {}, corp = "{}") => new Response(corp, { status, headers: antete });
await test("(5) 429 cu retry-after pe un lucrător ⇒ și cererile celorlalți așteaptă până la aceeași oră (verificată înaintea fiecărei cereri)", async () => {
  const w = ceasFals(Date.UTC(2026, 9, 19, 9, 0, 0)), trimise = [];
  const f = async (u) => { trimise.push({ u, t: w.t }); return u.endsWith("/a") && trimise.length === 1 ? rasp(429, { "retry-after": "30" }) : rasp(200); };
  const b = cereBinance({ fetch: f, pauza: w.pauza, jurnal: w.jurnalF, ceas: w.ceas });
  await b("https://fapi.binance.com/a");
  const t1 = w.t; await b("https://fapi.binance.com/b");
  assert.ok(trimise.every((x, i) => i === 0 || x.t >= trimise[0].t + 60000 - 1), "o cerere a plecat înainte de sfârșitul pauzei: " + JSON.stringify(trimise.map((x) => x.t - trimise[0].t)));
  assert.equal(typeof b.stare, "object"); assert.ok(b.stare.pauzaPana > 0);
  assert.equal(w.t, t1, "a doua cerere (alt lucrător) n-a mai așteptat: pauza trecuse");
});
await test("(5) două cereri în paralel: după 429-ul uneia, cealaltă nu pleacă până la ora pauzei", async () => {
  const w = ceasFals(Date.UTC(2026, 9, 19, 9, 0, 0)), trimise = [];
  let n = 0;
  const f = async (u) => { n++; trimise.push({ u, t: w.t }); if (n === 1) return rasp(429, { "retry-after": "90" }); return rasp(200); };
  const b = cereBinance({ fetch: f, pauza: w.pauza, jurnal: w.jurnalF, ceas: w.ceas });
  await b("https://fapi.binance.com/x");          // lucrătorul 1: 429, pauza comună 90 s
  w.t = Date.UTC(2026, 9, 19, 9, 0, 10);           // lucrătorul 2 vine după 10 s (ceasul real nu așteaptă după primul)
  b.stare.pauzaPana = Date.UTC(2026, 9, 19, 9, 1, 30);
  w.pauze.length = 0; await b("https://fapi.binance.com/y");
  assert.deepEqual(w.pauze, [80000], "lucrătorul 2 trebuia să aștepte cele 80 s rămase");
});
await test("(5) greutatea pe minut peste 1800 ⇒ lucrătorii așteaptă minutul următor (cu 1 s marjă)", async () => {
  const w = ceasFals(Date.UTC(2026, 9, 19, 9, 0, 10));
  const b = cereBinance({ fetch: async () => rasp(200, { "x-mbx-used-weight-1m": "1850" }), pauza: w.pauza, jurnal: w.jurnalF, ceas: w.ceas });
  await b("https://fapi.binance.com/a"); assert.deepEqual(w.pauze, []);
  await b("https://fapi.binance.com/b"); assert.deepEqual(w.pauze, [51000]);
  const w2 = ceasFals(Date.UTC(2026, 9, 19, 9, 0, 10)), b2 = cereBinance({ fetch: async () => rasp(200, { "x-mbx-used-weight-1m": "1800" }), pauza: w2.pauza, jurnal: w2.jurnalF, ceas: w2.ceas });
  await b2("https://fapi.binance.com/a"); await b2("https://fapi.binance.com/b"); assert.deepEqual(w2.pauze, [], "1800 nu trece de 1800");
});
await test("(5) 418 ⇒ se oprește toată tura (nicio cerere după, fără publicare) și se scrie în jurnal; tura următoare, în interdicție, se sare", async () => {
  const w = ceasFals(Date.UTC(2026, 9, 19, 9, 0, 0)); let n = 0;
  const L = { PRAGURI: { minZileListate: 0, nSimboluri: 3, paralel: 5, bare4h: 10 }, latimea: () => ({ lipsa: 0, sus: 0, jos: 0 }), regimPietei: () => ({ cod: "AMESTECAT" }), masuraMoneda: () => ({}) };
  const f = async (u) => { n++;
    if (/exchangeInfo/.test(u)) return rasp(200, {}, JSON.stringify({ symbols: ["A", "B", "C"].map((s) => ({ symbol: s + "USDT", quoteAsset: "USDT", status: "TRADING", contractType: "PERPETUAL", underlyingType: "COIN", onboardDate: 0 })) }));
    if (/ticker\/24hr/.test(u)) return rasp(200, {}, JSON.stringify(["A", "B", "C"].map((s) => ({ symbol: s + "USDT", quoteVolume: "1" }))));
    return rasp(418, { "retry-after": "3600" }); };
  const b = cereBinance({ fetch: f, pauza: w.pauza, jurnal: w.jurnalF, ceas: w.ceas }), trimise = [];
  const d = { binance: b, trimite: async (c, x) => trimise.push(x), jurnal: w.jurnalF, pauza: w.pauza, Latime: L, botiSimboluri: () => [] };
  await turaLatime(d, {}, w.t);
  const dupa418 = n;
  assert.ok(b.stare.oprit, "starea nu spune că tura e oprită"); assert.ok(dupa418 <= 3, "după 418 au mai plecat cereri: " + dupa418);
  assert.equal(trimise.length, 0, "a publicat o tură oprită"); assert.ok(w.jurnal.some((j) => /418/.test(j) && /opr/.test(j)), "jurnalul nu spune: " + w.jurnal.join(" | "));
  const st = {}; w.jurnal.length = 0; w.t += 15 * 60000; await turaLatime(d, st, w.t);
  assert.equal(n, dupa418, "în interdicție (retry-after 3600 s) tura următoare a trimis"); assert.ok(w.jurnal.some((j) => /sar/.test(j)));
  w.t += 3600000; await turaLatime(d, {}, w.t); assert.ok(n > dupa418, "după interdicție tura nu și-a reluat cererile");
});

// ---------- (6) timeout ≠ server oprit ----------
await test("(6) eServerOprit: conexiune refuzată / eroare de rețea = oprit; TimeoutError / AbortError / răspuns HTTP = nu", () => {
  assert.equal(typeof S.eServerOprit, "function");
  const refuz = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8788"), { code: "ECONNREFUSED" }) });
  assert.equal(S.eServerOprit(refuz), true); assert.equal(S.eServerOprit(new TypeError("fetch failed")), true);
  const ceas = new DOMException("The operation was aborted due to timeout", "TimeoutError"), abandon = new DOMException("This operation was aborted", "AbortError");
  assert.equal(S.eServerOprit(ceas), false); assert.equal(S.eServerOprit(abandon), false);
  assert.equal(S.eServerOprit(Object.assign(new Error("HTTP 502"), { status: 502 })), false); assert.equal(S.eServerOprit(null), false);
});
await test("(6) colectorul numără la „serverul nu răspunde” (ieșirea după 15) DOAR pe S.eServerOprit; timeout-ul trece pe „nu pot citi”", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /catch \(e\) \{\n    \/\/ [^\n]*\n(    \/\/ [^\n]*\n)*    if \(S\.eServerOprit\(e\)\) \{ esecuri\+\+;/);
  assert.ok(!/if \(!e\.status\) \{ esecuri\+\+/.test(c), "a rămas numărătoarea pe orice eroare fără status");
});

// ---------- (7) mărunte ----------
await test("(7) pret-viu: conexiunea spre Pionex are termen de 8 s (cuTermen); conexiunea venită târziu se închide", async () => {
  const PV = await import("../functions/api/pret-viu.js");
  assert.equal(typeof PV.cuTermen, "function");
  await assert.rejects(() => PV.cuTermen(new Promise(() => {}), 20), (e) => e.name === "TimeoutError");
  let inchisa = 0; const tarziu = new Promise((r) => setTimeout(() => r({ webSocket: { close: () => inchisa++ } }), 40));
  await assert.rejects(() => PV.cuTermen(tarziu, 10, (r) => r.webSocket.close()));
  await pauza(60); assert.equal(inchisa, 1, "conexiunea venită după termen a rămas deschisă");
  assert.equal(await PV.cuTermen(Promise.resolve(7), 50), 7);
  assert.match(citeste("functions", "api", "pret-viu.js"), /await cuTermen\(fetch\("https:\/\/ws\.pionex\.com\/wsPub",\{headers:\{Upgrade:"websocket"\}\}\),8000,/);
});
await test("(7) verdict: ziua după Europe/Bucharest, nu UTC (20:00Z și 21:30Z pe 10.10 = două zile la București)", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  await postIb(env, "verdict", { verdicte: [{ s: "idei", k: "AAPL", n: "cumpara", p: 10, t: Date.UTC(2026, 9, 10, 20, 0) }, { s: "idei", k: "AAPL", n: "nu", p: 11, t: Date.UTC(2026, 9, 10, 21, 30) }, { s: "idei", k: "AAPL", n: "nu", p: 12, t: Date.UTC(2026, 9, 10, 22, 30) }] });
  const l = JSON.parse(env.ISTORIC.m.get("verdicte:jurnal"));
  assert.deepEqual(l.map((x) => x.p), [10, 11], "pe (sursă, simbol, zi la București) rămâne primul");
});
await test("(7) t212: la 429 se ține minte răcirea (retry-after, altfel 60 s) pe cale și nu se mai trimite până atunci", async () => {
  const T = await import("../functions/api/t212.js");
  assert.equal(typeof T.cereT212, "function"); assert.equal(typeof T.reseteazaRacireT212, "function");
  const env = { T212_API_KEY: "k", T212_API_SECRET: "s" };
  T.reseteazaRacireT212();
  fetchFals(() => new Response("", { status: 429, headers: { "retry-after": "40" } }));
  await assert.rejects(() => T.cereT212(env, "/equity/portfolio", "pozitii"), (e) => e.status === 429 && e.retryAfter === 40);
  await assert.rejects(() => T.cereT212(env, "/equity/portfolio", "pozitii"), (e) => e.status === 429 && e.retryAfter > 30 && e.retryAfter <= 40);
  assert.equal(cereriFalse.length, 1, "a trimis în timpul răcirii");
  fetchFals(() => new Response("{}", { status: 200 }));
  assert.deepEqual(await T.cereT212(env, "/equity/account/cash", "cont"), {}, "altă cale nu e răcită");
  T.reseteazaRacireT212();
  fetchFals(() => new Response("", { status: 429 }));
  await assert.rejects(() => T.cereT212(env, "/equity/account/info", "cont"), (e) => e.retryAfter === 60);
  T.reseteazaRacireT212(); globalThis.fetch = fetchAdevarat;
});
await test("(7) scanul de acțiuni: simbolul fără prețuri (404) se ține minte o oră ca lipsă - nu se mai cere, nu se mai scrie în jurnal", async () => {
  const { scanActiuni } = await import("./lib/tura-scan.mjs");
  const cerute = [], jurnal = [];
  const d = { NDX: ["WBD", "AAPL"], jurnal: (...a) => jurnal.push(a.join(" ")), pauza: async () => {}, pauzaMs: 0, trimite: async () => {}, GridCalcul: { bareToate: () => [] }, Scan: { rezumat: () => null },
    cere: async (u) => { cerute.push(u); if (/pozitii/.test(u)) return []; if (/WBD/.test(u)) throw Object.assign(new Error("Fără prețuri pentru WBD_US_EQ (poate a fost delistată sau redenumită)."), { status: 404 }); throw new Error("Yahoo a limitat"); } };
  const t0 = Date.UTC(2026, 9, 19, 15, 0);
  await scanActiuni(d, t0);
  const n1 = cerute.filter((u) => /WBD/.test(u)).length; assert.equal(n1, 1);
  jurnal.length = 0; await scanActiuni(d, t0 + 30 * MIN);
  assert.equal(cerute.filter((u) => /WBD/.test(u)).length, 1, "WBD cerut din nou în aceeași oră"); assert.ok(!jurnal.some((j) => /WBD/.test(j)), "WBD tot în jurnal");
  assert.ok(cerute.filter((u) => /AAPL/.test(u)).length === 2, "o eroare care nu e 404 nu se ține minte");
  await scanActiuni(d, t0 + 61 * MIN); assert.equal(cerute.filter((u) => /WBD/.test(u)).length, 2, "după o oră se cere iar");
});
await test("(7) colectorul curăță lumanari15 / mediuPe / pret30 de ce n-a fost atins de 2 zile (curataNeatinse)", () => {
  assert.equal(typeof S.curataNeatinse, "function");
  const h = { A: { la: ACUM - 3 * ZI }, B: { la: ACUM - ZI }, C: {} };
  assert.equal(S.curataNeatinse(h, (k) => h[k].la, ACUM), 2); assert.deepEqual(Object.keys(h), ["B"]);
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /S\.curataNeatinse\(lumanari15, \(k\) => lumanari15\[k\] && lumanari15\[k\]\.la, acum\)/);
  assert.match(c, /S\.curataNeatinse\(mediuPe, \(k\) => mediuPe\[k\] && mediuPe\[k\]\.la, acum\)/);
  assert.match(c, /S\.curataNeatinse\(pret30, \(k\) => pret30La\[k\], acum\)/);
  assert.match(c, /mediuPe\[b\.id\] = \{ b, mediu: ctx\.mediu, la: acum \}/);
  assert.match(c, /pret30La\[b\.id\] = acum;/);
});
await test("(7) cod mort scos: tokenValid (și equalBytes, folosit doar de el), ENGINE_CONTRACT_VERSION din market.js și external-intel.js", () => {
  const a = citeste("functions", "_shared", "auth.js");
  assert.ok(!/tokenValid/.test(a)); assert.ok(!/equalBytes/.test(a)); assert.match(a, /async function digest/, "digest rămâne (tenantKey)");
  assert.ok(!/ENGINE_CONTRACT_VERSION/.test(citeste("functions", "api", "market.js"))); assert.ok(!/ENGINE_CONTRACT_VERSION/.test(citeste("functions", "api", "external-intel.js")));
});

// ---------- (8) livrarea repornește colectorul ----------
await test("(8) trebuieRepornitColectorul: da pe scripts/colector.mjs, scripts/lib/, public/lib/; nu pe rest", async () => {
  const CL = await import("./copie-de-lucru.mjs");
  assert.equal(typeof CL.trebuieRepornitColectorul, "function");
  assert.equal(CL.trebuieRepornitColectorul(["scripts/colector.mjs"]), true);
  assert.equal(CL.trebuieRepornitColectorul(["README.md", "scripts/lib/tura-scan.mjs"]), true);
  assert.equal(CL.trebuieRepornitColectorul(["public/lib/alerte.js"]), true);
  assert.equal(CL.trebuieRepornitColectorul(["public/app.js", "functions/api/market.js", "scripts/proba-v1.mjs", "scripts/colector-v77.mjs", "public/library.js"]), false);
  assert.equal(CL.trebuieRepornitColectorul([]), false);
});
await test("(8) PID-ul și linia de comandă: se oprește DOAR un proces a cărui linie e scripts\\colector.mjs", async () => {
  const CL = await import("./copie-de-lucru.mjs");
  assert.equal(CL.pidDinFisier("12345 1760860000000"), 12345); assert.equal(CL.pidDinFisier(""), null); assert.equal(CL.pidDinFisier("abc"), null);
  assert.equal(CL.eLiniaColectorului('"C:\\Program Files\\nodejs\\node.exe" scripts\\colector.mjs'), true);
  assert.equal(CL.eLiniaColectorului("node scripts/colector.mjs"), true);
  assert.equal(CL.eLiniaColectorului("node scripts\\colector-v77.mjs"), false);
  assert.equal(CL.eLiniaColectorului("C:\\Windows\\notepad.exe"), false); assert.equal(CL.eLiniaColectorului(null), false);
});
await test("(8) livreaza: după aducerea principalului repornește colectorul (oprit doar după linie, pornit detașat ca lansatorul, verificat la 20 s)", () => {
  const s = citeste("scripts", "copie-de-lucru.mjs");
  const iAdus = s.indexOf("Principalul adus la"), iRep = s.indexOf("if (trebuieRepornitColectorul(atinse))");
  assert.ok(iAdus > 0 && iRep > iAdus, "repornirea trebuie să vină după aducerea principalului");
  // v100.258: oprirea decisă de decizieRepornire (doar linia colectorului ⇒ opreste); în sesiunea 0 (EPERM) nu oprește și nu pornește
  assert.match(s, /if \(linie && eLiniaColectorului\(linie\)\) return \{ opreste: true, porneste: true, motiv: "al-meu" \};/);
  assert.match(s, /if \(d\.opreste\) \{ ps\(`Stop-Process -Id \$\{pid\} -Force/);
  assert.match(s, /Start-Process -FilePath node -ArgumentList 'scripts\\\\colector\.mjs' -WorkingDirectory/);
  assert.match(s, /-WindowStyle Hidden -PassThru/);
  assert.match(s, /asteaptaMs\(20000\)/);
  assert.ok(!/Ai atins colectorul ⇒ repornește-l ca să ia codul nou\."\);\n  \/\/ v100\.211/.test(s), "a rămas doar sfatul vechi");
});
await test("(8b) .dev.vars: „porneste” îl copiază, „curata” îl șterge înainte de a scoate copia", () => {
  const s = citeste("scripts", "copie-de-lucru.mjs");
  assert.match(s, /fs\.copyFileSync\(path\.join\(RAD, "\.dev\.vars"\), path\.join\(dest, "\.dev\.vars"\)\)/);
  const iSt = s.indexOf('fs.rmSync(path.join(dest, ".dev.vars")'), iRm = s.indexOf('"worktree", "remove"');
  assert.ok(iSt > 0 && iSt < iRm);
});

// ---------- (9) proba de telefon: antetul doar pe adresa serverului ----------
await test("(9) proba-ecran-telefon pune `x-proba-ecran` DOAR pe cererile spre serverul probat (Fetch.enable pe origine + continueRequest), nu pe toate", () => {
  const s = citeste("scripts", "proba-ecran-telefon.mjs");
  assert.ok(!/Network\.setExtraHTTPHeaders/.test(s), "antetul pe TOATE cererile (preflight CORS refuzat spre GitHub Pages / Binance)");
  assert.match(s, /const ORIGINE = new URL\(URL_T\)\.origin;/);
  assert.match(s, /tr\("Fetch\.enable", \{ patterns: \[\{ urlPattern: ORIGINE \+ "\/\*" \}\] \}\)/);
  assert.match(s, /x\.method === "Fetch\.requestPaused"/);
  assert.match(s, /method: "Fetch\.continueRequest", params: \{ requestId: x\.params\.requestId, headers: h \}/);
  assert.match(s, /h\.push\(\{ name: "x-proba-ecran", value: "1" \}\)/);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
