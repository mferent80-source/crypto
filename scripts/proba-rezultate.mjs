// Proba paginii „Rezultate” (11.10.2026, direcția lui „o aplicație și atât”, pasul 4.2): pagina earnings-hub din
// premarket_scanner se mută în Radar, cu logica ei (calendarul Finnhub pe TOATĂ piața, 7/14/30 de zile, ⭐ + „doar ⭐”,
// la clic reacția prețului după raportările trecute) și în designul nou. Diferențe voite: cheia Finnhub stă pe serverul
// de acasă (KV), nu în browser; ⭐ se pune singură pe ce deține (T212, Salt) și ce urmărește; fără anunț (colectorul îl
// trimite pe Discord) și fără AI.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); }); }
const J = (x) => JSON.parse(JSON.stringify(x));
console.log("\nRezultate (calendarul raportărilor) · proba\n");

// ── A. biblioteca paginii (pură) ─────────────────────────────────────────────
const ctx = { console, Date, Math, Object, Array, String, Number, JSON, isFinite, TextRo: globalThis.TextRo };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(citeste("public", "lib", "rezultate.js"), ctx);
const RZ = ctx.Rezultate;
const ACUM = Date.UTC(2026, 9, 11, 21, 0, 0); // duminică 11.10.2026
const ITEMS = [
  { s: "JPM", data: "2026-10-14", ora: "bmo", epsEst: 4.9, epsAct: null, venitEst: 45e9 },
  { s: "ASML", data: "2026-10-14", ora: "bmo", epsEst: 10.66, epsAct: null, venitEst: 8e9 },
  { s: "WFC", data: "2026-10-14", ora: "bmo", epsEst: 1.6, epsAct: null, venitEst: 20e9 },
  { s: "ISRG", data: "2026-10-20", ora: "amc", epsEst: 2.64, epsAct: null, venitEst: 2.4e9 },
  { s: "<b>X</b>", data: "2026-10-20", ora: "", epsEst: null, epsAct: null, venitEst: 1 },
];
const STELE = { ISRG: "detii", ASML: "urmaresti" };

await test("oraRo: bmo = înainte de deschidere, amc = după închidere, altfel —", () => {
  assert.equal(RZ.oraRo("bmo"), "înainte de deschidere"); assert.equal(RZ.oraRo("amc"), "după închidere"); assert.equal(RZ.oraRo("dmh"), "în timpul ședinței"); assert.equal(RZ.oraRo(""), "—");
});
await test("simbolDin: AVGO_US_EQ → AVGO; NFLX → NFLX; gol → ''", () => {
  assert.equal(RZ.simbolDin("AVGO_US_EQ"), "AVGO"); assert.equal(RZ.simbolDin("nflx"), "NFLX"); assert.equal(RZ.simbolDin(null), "");
});
await test("grupeaza: pe zile; în aceeași zi întâi ⭐, apoi după venitul estimat; zile = luni..duminică în română", () => {
  const g = J(RZ.grupeaza(ITEMS, STELE, { doarStea: false }));
  assert.deepEqual(g.map((z) => [z.data, z.ziua, z.randuri.map((r) => r.s)]), [
    ["2026-10-14", "miercuri, 14.10", ["ASML", "JPM", "WFC"]],
    ["2026-10-20", "marți, 20.10", ["ISRG", "<b>X</b>"]],
  ]);
  assert.equal(g[0].randuri[0].stea, "urmaresti"); assert.equal(g[1].randuri[0].stea, "detii"); assert.equal(g[0].randuri[1].stea, null);
});
await test("grupeaza cu „doar ⭐”: rămân doar simbolurile tale", () => {
  assert.deepEqual(J(RZ.grupeaza(ITEMS, STELE, { doarStea: true })).map((z) => z.randuri.map((r) => r.s)), [["ASML"], ["ISRG"]]);
});
await test("htmlPagina fără cheie: câmpul cheii și butonul de salvare, fără tabel; spune unde se ține cheia", () => {
  const h = RZ.htmlPagina({ cheie: false });
  assert.match(h, /<input[^>]*id="rzCheie"[^>]*type="password"/); assert.match(h, /data-action-click="rzSalveazaCheie\(\)"/);
  assert.match(h, /serverul Radarului de acasă/); assert.ok(!/<table/.test(h));
});
await test("htmlPagina cu cheie: filtrele 7/14/30 + toate / doar ⭐ (n), antetul zilei cu regula „de”, rândurile cu ⭐ și eticheta, textul escapat", () => {
  const h = RZ.htmlPagina({ cheie: true, zile: 7, doarStea: false, cal: { items: ITEMS, la: ACUM }, stele: STELE, acum: ACUM });
  for (const z of [7, 14, 30]) assert.match(h, new RegExp(`data-action-click="rzZile\\(${z}\\)"`));
  assert.match(h, /aria-pressed="true"[^>]*>7 zile</); assert.match(h, /data-action-click="rzDoarStea\(\)"[^>]*>doar ⭐ \(2\)</);
  assert.match(h, /miercuri, 14\.10<\/b> <span class="tbSub">· 3 companii/); assert.match(h, /marți, 20\.10<\/b> <span class="tbSub">· 2 companii/);
  assert.match(h, /⭐ <b>ISRG<\/b> <span class="rzEt">deții<\/span>/); assert.match(h, /⭐ <b>ASML<\/b> <span class="rzEt">urmărești<\/span>/);
  assert.ok(!h.includes("<b>X</b>")); assert.ok(h.includes("&lt;b&gt;X&lt;/b&gt;"));
  assert.match(h, /data-action-click="rzDesfa\(&quot;ISRG&quot;\)"|data-action-click="rzDesfa\('ISRG'\)"/);
  assert.match(h, /10,66/); assert.match(h, /înainte de deschidere/);
});
await test("htmlPagina: regula „de” la companii (1 companie, 20 de companii) și zi fără nimic ⇒ mesaj, nu tabel gol", () => {
  const multe = Array.from({ length: 20 }, (_, i) => ({ s: "A" + i, data: "2026-10-14", ora: "bmo", epsEst: 1, venitEst: i }));
  assert.match(RZ.htmlPagina({ cheie: true, zile: 7, cal: { items: multe }, stele: {}, acum: ACUM }), /· 20 de companii/);
  assert.match(RZ.htmlPagina({ cheie: true, zile: 7, cal: { items: multe.slice(0, 1) }, stele: {}, acum: ACUM }), /· 1 companie/);
  assert.match(RZ.htmlPagina({ cheie: true, zile: 7, doarStea: true, cal: { items: multe }, stele: {}, acum: ACUM }), /Niciuna dintre companiile tale nu raportează/);
});
await test("htmlPagina cu eroare de la server: mesajul la vedere + butonul de reîncercare", () => {
  const h = RZ.htmlPagina({ cheie: true, zile: 7, cal: { eroare: "Finnhub a răspuns 429" }, stele: {}, acum: ACUM });
  assert.match(h, /Finnhub a răspuns 429/); assert.match(h, /data-action-click="rzReincarca\(\)"/);
});
await test("htmlIstoric: ziua de după și 5 zile cu o zecimală și semn; „nu știu” când lipsește ziua; mișcarea medie și câte în sus", () => {
  const h = RZ.htmlIstoric({ s: "ISRG", items: [
    { data: "2026-07-22", ora: "amc", reactie: 7.94, reactie5: 9.4, surpriza: 12.3 },
    { data: "2026-04-22", ora: "amc", reactie: -5.1, reactie5: -3, surpriza: -2 },
    { data: "2026-01-23", ora: "amc", reactie: null, reactie5: null, surpriza: null },
  ] });
  assert.match(h, /22\.07\.2026/); assert.match(h, /\+7,9%/); assert.match(h, /−5,1%/); assert.match(h, /nu știu/);
  assert.match(h, /Mișcarea medie după raport: 6,5% \(în orice direcție\) · 1 din 2 în sus/);
  assert.match(h, /nu e un semnal/);
});
await test("htmlIstoric gol / cu eroare: mesaj scurt", () => {
  assert.match(RZ.htmlIstoric({ s: "X", items: [] }), /n-am găsit raportări trecute/); assert.match(RZ.htmlIstoric({ s: "X", eroare: "nu a răspuns" }), /nu a răspuns/);
});
await test("randStocks: ce raportează în 7 zile din ce deții / urmărești, cu ziua; nimic ⇒ null", () => {
  const r = RZ.randStocks({ items: ITEMS }, STELE, ACUM);
  assert.match(r, /Raportează în 7 zile \(din ce deții \/ urmărești\): <b>ASML miercuri<\/b>/); assert.match(r, /data-action-click="navTo\('rezultate',true\)"/);
  assert.equal(RZ.randStocks({ items: ITEMS }, {}, ACUM), null); assert.equal(RZ.randStocks(null, STELE, ACUM), null);
});

// ── B. ruta de pe server (modulul real, env, KV și fetch false) ──────────────
const API = await import("../functions/api/rezultate.js");
const kv = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [], list_complete: true }) }; };
const env = (ist, extra) => Object.assign({ APP_API_TOKEN: "proba-jeton", ISTORIC: ist, PAZNIC_URL: "https://paznic.test", PAZNIC_TOKEN: "t".repeat(24) }, extra || {});
const cerere = (q, corp, faraJeton) => new Request("http://127.0.0.1:8788/api/rezultate?" + q, { method: corp ? "POST" : "GET", headers: Object.assign({ origin: "http://127.0.0.1:8788", "content-type": "application/json" }, faraJeton ? {} : { authorization: "Bearer proba-jeton" }), body: corp ? JSON.stringify(corp) : undefined });
const cereri = [];
const fetchOrig = globalThis.fetch;
function puneFetch(fn) { globalThis.fetch = async (url, o) => { cereri.push(String(url)); return fn(String(url), o); }; }
const raspuns = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json" } });
const CHEIE = "d1abcdefghijklmnop12";

await test("(B) fără jeton ⇒ 401", async () => {
  const r = await API.onRequestGet({ request: cerere("action=stare", null, true), env: env(kv()) }); assert.equal(r.status, 401);
});
await test("(B) stare fără cheie ⇒ areCheie:false; POST cheie nevalidă ⇒ 400; validă ⇒ salvată în KV, stare true, cheia NU se întoarce", async () => {
  const ist = kv();
  assert.deepEqual(await (await API.onRequestGet({ request: cerere("action=stare"), env: env(ist) })).json(), { areCheie: false });
  assert.equal((await API.onRequestPost({ request: cerere("action=cheie", { cheie: "ab c" }), env: env(ist) })).status, 400);
  const r = await API.onRequestPost({ request: cerere("action=cheie", { cheie: CHEIE }), env: env(ist) }); assert.equal(r.status, 200);
  assert.equal(ist.m.get("finnhub:cheie"), CHEIE);
  const s = await (await API.onRequestGet({ request: cerere("action=stare"), env: env(ist) })).text(); assert.equal(JSON.parse(s).areCheie, true); assert.ok(!s.includes(CHEIE));
});
await test("(B) POST cheie cu altă origine ⇒ 403", async () => {
  const rq = new Request("http://127.0.0.1:8788/api/rezultate?action=cheie", { method: "POST", headers: { authorization: "Bearer proba-jeton", origin: "https://rau.test", "content-type": "application/json" }, body: JSON.stringify({ cheie: CHEIE }) });
  assert.equal((await API.onRequestPost({ request: rq, env: env(kv()) })).status, 403);
});
await test("(B) calendar fără cheie ⇒ 409 „fără cheie”", async () => {
  const r = await API.onRequestGet({ request: cerere("action=calendar&zile=7"), env: env(kv()) }); assert.equal(r.status, 409); assert.match((await r.json()).error, /fără cheie/);
});
await test("(B) calendar: doar US (1–5 caractere, fără punct), doar cu estimări; normalizat; a doua cerere vine din cache (fără Finnhub)", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE); cereri.length = 0;
  puneFetch((url) => raspuns({ earningsCalendar: [
    { symbol: "JPM", date: "2026-10-14", hour: "bmo", epsEstimate: 4.9, revenueEstimate: 45e9 },
    { symbol: "0700.HK", date: "2026-10-14", hour: "amc", epsEstimate: 1 },
    { symbol: "ZZZ", date: "2026-10-15", hour: "amc" },
    { symbol: "ISRG", date: "2026-10-20", hour: "amc", epsEstimate: 2.64, revenueEstimate: 2.4e9, epsActual: null },
  ] }));
  const a = await (await API.onRequestGet({ request: cerere("action=calendar&zile=14"), env: env(ist) })).json();
  assert.deepEqual(a.items.map((x) => [x.s, x.data, x.ora, x.epsEst]), [["JPM", "2026-10-14", "bmo", 4.9], ["ISRG", "2026-10-20", "amc", 2.64]]);
  assert.equal(a.zile, 14); assert.ok(cereri[0].includes("finnhub.io/api/v1/calendar/earnings?from=")); assert.ok(cereri[0].includes("token=" + CHEIE));
  const n = cereri.length; await API.onRequestGet({ request: cerere("action=calendar&zile=14"), env: env(ist) }); assert.equal(cereri.length, n, "din cache");
});
await test("(B) calendar: zile în afara 7/14/30 ⇒ 14; Finnhub 429 ⇒ 502 cu motivul (nu listă goală tăcută)", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE); API._golesteCache();
  puneFetch(() => raspuns({ error: "limit" }, 429));
  const r = await API.onRequestGet({ request: cerere("action=calendar&zile=99"), env: env(ist) }); assert.equal(r.status, 502); assert.match((await r.json()).error, /429/);
});
await test("(B) istoric: reacția = închiderea de după vs cea de dinainte (amc ⇒ ziua următoare; bmo ⇒ chiar ziua), plus 5 zile; ziua lipsă ⇒ null", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE);
  const zile = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
  const pret = [100, 100, 100, 110, 111, 112, 113, 120, 121];
  puneFetch((url) => url.includes("finnhub.io")
    ? raspuns({ earningsCalendar: [{ symbol: "ISRG", date: "2026-07-22", hour: "amc", epsEstimate: 2, epsActual: 2.2 }, { symbol: "ISRG", date: "2026-07-28", hour: "bmo", epsEstimate: 1, epsActual: 0.9 }, { symbol: "ISRG", date: "2025-01-01", hour: "amc" }] })
    : raspuns({ chart: { result: [{ timestamp: zile.map((z) => Date.parse(z + "T20:00:00Z") / 1000), indicators: { quote: [{ close: pret }] } }] } }));
  const r = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(ist) })).json();
  assert.deepEqual(r.items.map((x) => [x.data, x.ora, x.reactie == null ? null : Math.round(x.reactie * 10) / 10, x.reactie5 == null ? null : Math.round(x.reactie5 * 10) / 10]), [
    ["2026-07-28", "bmo", 0.9, null], ["2026-07-22", "amc", 10, 20], ["2025-01-01", "amc", null, null],
  ]);
  assert.ok(Math.abs(r.items[1].surpriza - 10) < 1e-9);
});
// v100.165 (12.10, cu cheia LUI): Finnhub gratuit NU dă calendarul în urmă (gol chiar și pe o lună) ⇒ istoricul era gol pentru orice simbol.
// Datele + EPS vin din Nasdaq (fără cheie, ultimele 4); ora nu o dă nimeni pentru trecut ⇒ dedusă din saltul la deschidere.
const ZILE_N = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
const INCH_N = [100, 100, 100, 110, 111, 112, 113, 120, 121];
const DESC_N = [100, 100, 100, 109, 110.5, 111.8, 113, 113.5, 120.5];
const yahooN = () => raspuns({ chart: { result: [{ timestamp: ZILE_N.map((z) => Date.parse(z + "T20:00:00Z") / 1000), indicators: { quote: [{ open: DESC_N, close: INCH_N }] } }] } });
const nasdaqN = () => raspuns({ data: { earningsSurpriseTable: { rows: [
  { fiscalQtrEnd: "Jun 2026", dateReported: "7/28/2026", eps: 0.9, consensusForecast: "1.00", percentageSurprise: "-10" },
  { fiscalQtrEnd: "Mar 2026", dateReported: "7/22/2026", eps: "2.2", consensusForecast: "2.00", percentageSurprise: "10" },
] } } });
await test("(B) istoric: Finnhub gol în urmă ⇒ datele și EPS din Nasdaq, ora DEDUSĂ din saltul la deschidere (salt a doua zi ⇒ după închidere)", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE); API._golesteCache(); cereri.length = 0;
  puneFetch((url) => url.includes("finnhub.io") ? raspuns({ earningsCalendar: [] }) : url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const r = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(ist) })).json();
  assert.deepEqual(r.items.map((x) => [x.data, x.ora, x.oraDedusa, x.reactie == null ? null : Math.round(x.reactie * 10) / 10, x.reactie5 == null ? null : Math.round(x.reactie5 * 10) / 10]), [
    ["2026-07-28", "bmo", true, 0.9, null], ["2026-07-22", "amc", true, 10, 20],
  ]);
  assert.ok(Math.abs(r.items[1].surpriza - 10) < 1e-9); assert.equal(r.items[1].epsAct, 2.2); assert.equal(r.items[1].epsEst, 2);
  assert.ok(cereri.some((u) => u.startsWith("https://api.nasdaq.com/api/company/ISRG/earnings-surprise")));
});
await test("(B) istoric: ora din OBICEIUL firmei (următoarea raportare confirmată la Finnhub) bate deducția din preț — pe date reale prețul a greșit JPM și NVDA", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE); API._golesteCache();
  const azi = new Date().toISOString().slice(0, 10);
  puneFetch((url) => url.includes("finnhub.io")
    ? (url.includes("&to=" + azi) ? raspuns({ earningsCalendar: [] }) : raspuns({ earningsCalendar: [{ symbol: "ISRG", date: "2099-01-20", hour: "amc" }, { symbol: "ISRG", date: "2098-10-20", hour: "bmo" }, { symbol: "ISRG", date: "2098-09-01", hour: "" }] }))
    : url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const r = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(ist) })).json();
  assert.deepEqual(r.items.map((x) => [x.data, x.ora, !!x.oraDedusa, x.reactie == null ? null : Math.round(x.reactie * 10) / 10]), [["2026-07-28", "bmo", false, 0.9], ["2026-07-22", "bmo", false, 0]]);
});
await test("(B) istoric merge și FĂRĂ cheia Finnhub (Nasdaq + Yahoo nu cer cheie) și nu mai cheamă Finnhub", async () => {
  API._golesteCache(); cereri.length = 0;
  puneFetch((url) => url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const rs = await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) });
  assert.equal(rs.status, 200); assert.equal((await rs.json()).items.length, 2); assert.ok(!cereri.some((u) => u.includes("finnhub.io")));
});
// revizia Opus v100.171 (Important): Nasdaq / Yahoo căzute ⇒ istoricul gol se ținea minte 6 ore („n-am găsit raportări” în loc de „nu am date”)
await test("v100.171 istoric: Nasdaq nu răspunde (și Finnhub n-are trecutul) ⇒ „eroare” spusă, nimic ținut minte; data viitoare vin raportările", async () => {
  API._golesteCache();
  puneFetch((url) => { if (url.includes("api.nasdaq.com")) throw new Error("blocat"); return yahooN(); });
  const a = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) })).json();
  assert.match(a.eroare || "", /Nasdaq/); assert.equal((a.items || []).length, 0);
  puneFetch((url) => url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const b = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) })).json();
  assert.equal(b.items.length, 2, "eșecul nu s-a ținut minte"); assert.equal(b.eroare, undefined);
});
await test("v100.171 istoric: Yahoo nu răspunde ⇒ raportările rămân, reacțiile lipsesc cu motivul spus; nimic ținut minte", async () => {
  API._golesteCache();
  puneFetch((url) => { if (url.includes("api.nasdaq.com")) return nasdaqN(); throw new Error("yahoo căzut"); });
  const a = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) })).json();
  assert.equal(a.items.length, 2); assert.ok(a.items.every((x) => x.reactie === null)); assert.match(a.eroarePret || "", /Yahoo/);
  assert.match(RZ.htmlIstoric(a), /prețurile \(Yahoo\) n-au venit/);
  puneFetch((url) => url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const b = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) })).json();
  assert.ok(b.items.some((x) => x.reactie !== null), "eșecul Yahoo nu s-a ținut minte"); assert.equal(b.eroarePret, undefined);
});
await test("v100.171 htmlIstoric: data ciudată de la sursă se scrie cu escape", () => {
  assert.ok(!/<img/.test(RZ.htmlIstoric({ s: "X", items: [{ data: "<img src=x onerror=alert(1)>", ora: "bmo", reactie: 1, reactie5: 2 }] })));
});
// v100.172 (minorele din revizia Opus): ora necunoscută nu mai e presupusă „înainte de deschidere”; ora luată din obiceiul firmei se marchează
await test("v100.172 istoric: ora nu se știe și nu se poate deduce (ultima zi cu preț) ⇒ reacția lipsește, nu se presupune „înainte de deschidere”", async () => {
  API._golesteCache();
  const nasdaqUltima = () => raspuns({ data: { earningsSurpriseTable: { rows: [{ dateReported: "7/30/2026", eps: 1, consensusForecast: "1.00" }] } } });
  puneFetch((url) => url.includes("api.nasdaq.com") ? nasdaqUltima() : yahooN());
  const r = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(kv()) })).json();
  assert.equal(r.items.length, 1); assert.equal(r.items[0].ora, ""); assert.equal(r.items[0].reactie, null); assert.equal(r.items[0].reactie5, null);
});
await test("v100.172 istoric: ora luată din obiceiul firmei e marcată (oraObicei) și pagina spune „după obiceiul firmei”", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE); API._golesteCache();
  const azi = new Date().toISOString().slice(0, 10);
  puneFetch((url) => url.includes("finnhub.io")
    ? (url.includes("&to=" + azi) ? raspuns({ earningsCalendar: [] }) : raspuns({ earningsCalendar: [{ symbol: "ISRG", date: "2098-10-20", hour: "bmo" }] }))
    : url.includes("api.nasdaq.com") ? nasdaqN() : yahooN());
  const r = await (await API.onRequestGet({ request: cerere("action=istoric&s=ISRG"), env: env(ist) })).json();
  assert.ok(r.items.every((x) => x.oraObicei === true && !x.oraDedusa));
  assert.match(RZ.htmlIstoric(r), /înainte de deschidere · după obiceiul firmei/);
});
await test("(A) htmlIstoric: ora dedusă se spune („după preț”), cea știută nu", () => {
  const h = RZ.htmlIstoric({ s: "ISRG", items: [{ data: "2026-07-22", ora: "amc", oraDedusa: true, reactie: 10, reactie5: 20, surpriza: 10 }, { data: "2026-04-22", ora: "bmo", reactie: 1, reactie5: 2, surpriza: 1 }] });
  assert.match(h, /după închidere · după preț/); assert.match(h, /înainte de deschidere</);
});
await test("(B) istoric: simbol nevalid ⇒ 400", async () => {
  const ist = kv(); ist.m.set("finnhub:cheie", CHEIE);
  assert.equal((await API.onRequestGet({ request: cerere("action=istoric&s=" + encodeURIComponent("<x>")), env: env(ist) })).status, 400);
});
await test("(B) simboluri: lista urmărită din workerul paznic-radar, cu tokenul de acasă; workerul tace ⇒ listă goală cu motivul", async () => {
  cereri.length = 0;
  puneFetch((url, o) => { assert.equal(o.headers.authorization, "Bearer " + "t".repeat(24)); return raspuns({ simboluri: [{ s: "AAPL" }, { s: "ASML.AS" }, { s: "" }] }); });
  const r = await (await API.onRequestGet({ request: cerere("action=simboluri"), env: env(kv()) })).json();
  assert.deepEqual(r.simboluri, ["AAPL", "ASML.AS"]); assert.ok(cereri[0].startsWith("https://paznic.test/simboluri"));
  API._golesteCache(); puneFetch(() => raspuns({}, 500));
  const r2 = await (await API.onRequestGet({ request: cerere("action=simboluri"), env: env(kv()) })).json();
  assert.deepEqual(r2.simboluri, []); assert.match(r2.eroare, /500/);
});
globalThis.fetch = fetchOrig;

// ── C. legătura în pagină ────────────────────────────────────────────────────
const app = citeste("public", "app.js"), idx = citeste("public", "index.html"), sw = citeste("public", "sw.js"), css = citeste("public", "app.css");
await test("index.html: scriptul lib/rezultate.js, secțiunea #rezultate cu #rzPagina, locul rândului în #stocks", () => {
  assert.match(idx, /<script src="\/lib\/rezultate\.js"><\/script>/);
  assert.match(idx, /<section class="panel" id="rezultate">[\s\S]{0,300}id="rzPagina"/);
  const s = idx.indexOf('id="stocks"'), r = idx.indexOf('id="rzRandStocks"'), u = idx.indexOf("US Session Context"); assert.ok(s > 0 && r > s && r < u);
});
await test("meniul: „Rezultate” în grupa Unelte, imediat după acțiuni", () => {
  const g = idx.slice(idx.indexOf('id="sideUnelte"'), idx.indexOf("</div>", idx.indexOf('id="sideUnelte"') + 600) + 6);
  assert.match(g, /data-nav="stocks"[\s\S]{0,200}data-action-click="navTo\('rezultate',true\)" data-nav="rezultate"/);
});
await test("telefon: „Rezultate” și în sertarul „More” (pe telefon meniul din stânga nu se vede — el, 12.10: „nu văd pe telefon rezultate”)", () => {
  const j = idx.indexOf('id="moreDrawer"'), sertar = idx.slice(j, idx.indexOf("</div>", idx.indexOf("moreSheet", j) + 3000));
  assert.match(sertar, /<button class="moreBtn" data-action-click="moreNav\('rezultate',true\)"><b>📅<\/b>Rezultate<\/button>/);
});
await test("sw.js: lib/rezultate.js în APP_SHELL", () => { assert.match(sw, /"\/lib\/rezultate\.js"/); });
await test("app.js: navTo pornește pagina și rândul din acțiuni; funcțiile butoanelor există", () => {
  assert.match(app, /id==="rezultate"\)\{[^}]*rzPorneste\(/);
  assert.match(app, /id==="stocks"\)\{[^}]*rzRandStocksDeseneaza\(/);
  for (const f of ["rzPorneste", "rzZile", "rzDoarStea", "rzDesfa", "rzSalveazaCheie", "rzReincarca", "rzRandStocksDeseneaza"]) assert.match(app, new RegExp("function " + f + "\\("), f);
});
await test("CSS: rândul de pe telefon pe două linii (momentul și EPS-ul sub nume); regula pândei rămâne ultima", () => {
  assert.match(css, /@media \(max-width:640px\)\{[^}]*\.rzTab/);
  assert.ok(css.trimEnd().endsWith("}") && css.lastIndexOf(".sugPandaTab thead{display:table-header-group}") > css.lastIndexOf(".rzTab"));
  assert.match(css, /\.pzDemo #stocks\.on>\.rzRandStocks\{order:11\}/);
});

await test("CSS telefon: istoricul pe două linii (data + momentul, apoi ziua / 5 zile / EPS cu etichete), textul se rupe — poza 12.10 îl arăta celulă cu celulă, tăiat în dreapta", () => {
  const m = css.lastIndexOf(".rzTab tr.rzDet .rzIstTab tr{display:grid"); assert.ok(m > 0, "regula rândului de istoric");
  assert.ok(m > css.lastIndexOf(".rzTab tr.rzDet td{display:block"), "vine după regula care desface celulele");
  assert.match(css, /\.rzIstTab td:nth-child\(3\)::before\{content:"ziua de după "/);
  assert.match(css, /\.rzIst\{[^}]*white-space:normal/);
  assert.ok(css.lastIndexOf(".sugPandaTab thead{display:table-header-group}") > m, "regula pândei rămâne ultima");
});

console.log(`\n${teste - picate}/${teste} probe trec`);
if (picate) process.exit(1);
