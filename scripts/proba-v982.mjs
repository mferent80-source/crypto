// Probele v98.2 - reparatiile din auditul sever din 28.09 (AUDIT-SEVER-CLAUDE-2026-09-28.md), etapa A:
//   1. /api/t212: cererile identice in zbor se leaga (trei ture ale colectorului = UN apel la Trading 212, nu trei -> fara 429)
//   2. `prev` la simbolurile paginii = inchiderea ultimei sesiuni INCHEIATE (ca la pozitii), nu penultima inchidere orbeste
//   3. KV-ul paznicului: fara bataie separata cat poza curge; cronul anunta singur "a revenit" (nu mai e nimeni sa bata)
//   4. "cumparare de insider" doar cand exista o stare anterioara si cumpararea e recenta (nu la prima vedere, nu din august)
//   5. Health: CoinGecko si cotatiile de actiuni se PROBEAZA (nu se citeste doar cheia); stratul nelegat (D1) nu e FAIL acasa
//   6. /api/market?type=health poarta versiunea reala, nu "v56"
// Fara retea: fetch fals peste tot. Rulare: node scripts/proba-v982.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prevClose, prevSimbol, insideri, alerteSimboluri, bataieNecesara, pret30DinIstoric } from "./lib/poza.mjs";
import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";
import { verifica } from "../paznic/worker.mjs";

let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const TOKEN = "proba-token-1234567890", ZI = 86400000, MIN = 60000;
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
const raspuns = (corp, status = 200) => new Response(typeof corp === "string" ? corp : JSON.stringify(corp), { status, headers: { "content-type": "application/json" } });

console.log("\nV98.2 · reparatiile auditului (etapa A) · proba\n");

// ---------- 1. coalescerea cererilor in zbor pe /api/t212 ----------
await test("t212: doua cereri `pozitii` in aceeasi clipa -> UN singur apel la /equity/portfolio; `cont` in paralel -> cash + info o singura data", async () => {
  const m = await import(`../functions/api/t212.js?v982_${Date.now()}`);
  const env = { APP_API_TOKEN: TOKEN, T212_API_KEY: "cheie", T212_API_SECRET: "secret" };
  const apeluri = [];
  globalThis.fetch = async (url) => { const u = String(url); apeluri.push(u); await pauza(60); if (/portfolio/.test(u)) return raspuns([{ ticker: "NWSA_US_EQ", quantity: 21.86, averagePrice: 29.2, currentPrice: 28.49 }]); if (/cash/.test(u)) return raspuns({ free: 10, total: 1000 }); if (/info/.test(u)) return raspuns({ currencyCode: "RON" }); return raspuns({}, 404); };
  let ip = 0;
  const cheama = (qs) => m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.98.2." + (++ip % 200) } }), env });
  const [a, b, c, d] = await Promise.all([cheama("action=pozitii"), cheama("action=pozitii"), cheama("action=cont"), cheama("action=cont")]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(c.status, 200); assert.equal(d.status, 200);
  assert.equal(apeluri.filter((u) => /portfolio/.test(u)).length, 1, "portofoliul cerut o singura data: " + apeluri.join(" "));
  assert.equal(apeluri.filter((u) => /account\/cash/.test(u)).length, 1, "cash o singura data");
  assert.equal(apeluri.filter((u) => /account\/info/.test(u)).length, 1, "info o singura data");
  assert.equal((await b.json()).pozitii[0].ticker, "NWSA_US_EQ", "al doilea chemator primeste acelasi raspuns");
});
await test("t212: cand apelul legat pica cu 429, TOTI chematorii primesc 429 cu retryAfter si NU se mai face alt apel; dupa aceea se poate reincerca", async () => {
  const m = await import(`../functions/api/t212.js?v982b_${Date.now()}`);
  const env = { APP_API_TOKEN: TOKEN, T212_API_KEY: "cheie", T212_API_SECRET: "secret" };
  let n = 0;
  globalThis.fetch = async () => { n++; await pauza(30); return n === 1 ? new Response("{}", { status: 429, headers: { "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 7) } }) : raspuns([]); };
  let ip = 0;
  const cheama = (qs) => m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.98.3." + (++ip % 200) } }), env });
  const [a, b] = await Promise.all([cheama("action=pozitii"), cheama("action=pozitii")]);
  assert.equal(a.status, 429); assert.equal(b.status, 429); assert.equal(n, 1, "un singur apel real");
  const ja = await a.json(); assert.ok(ja.retryAfter >= 1 && ja.retryAfter <= 8, "retryAfter din antet: " + ja.retryAfter);
  const c = await cheama("action=pozitii"); assert.equal(c.status, 200, "eroarea nu ramane lipita in cache"); assert.equal(n, 2);
});

// ---------- 2. prev la simboluri ----------
const T = (iso) => Date.parse(iso);
const chart = (bare, moneda = "USD") => ({ chart: { result: [{ timestamp: bare.map((b) => Math.floor(b.t / 1000)), indicators: { quote: [{ close: bare.map((b) => b.c) }] }, meta: { currency: moneda } }] } });
await test("yahoo-extra.closes: intoarce si barele cu timp (tc), aliniate (o inchidere null se sare cu tot cu timpul ei)", async () => {
  const fisier = path.join(os.tmpdir(), "proba-v982-" + process.pid + ".json");
  const bare = [{ t: T("2026-09-23T13:30:00Z"), c: 122.6 }, { t: T("2026-09-24T13:30:00Z"), c: null }, { t: T("2026-09-24T13:30:00Z"), c: 127.39 }, { t: T("2026-09-25T13:30:00Z"), c: 123 }];
  const y = creeazaYahooExtra({ fisier, pauzaMs: 0, f: async () => raspuns(chart(bare)) });
  const v = await y.closes("INTC");
  assert.deepEqual(v.tc, [{ t: T("2026-09-23T13:30:00Z"), c: 122.6 }, { t: T("2026-09-24T13:30:00Z"), c: 127.39 }, { t: T("2026-09-25T13:30:00Z"), c: 123 }]);
  assert.equal(v.pret, 123); assert.deepEqual(v.closes30, [122.6, 127.39, 123]);
  try { fs.unlinkSync(fisier); } catch {}
});
await test("prevSimbol: duminica seara prev = VINERI (nu joi) -> 'azi' 0%, ca la pozitii; in sedinta de luni prev = vineri, nu bara de luni; fara tc cade pe prev-ul vechi", () => {
  const c = { pret: 123, prev: 127.39, tc: [{ t: T("2026-09-24T13:30:00Z"), c: 127.39 }, { t: T("2026-09-25T13:30:00Z"), c: 123 }] };
  assert.equal(prevSimbol(c, T("2026-09-27T20:00:00Z")), 123, "duminica 16:00 NY: ultima sesiune incheiata e vineri");
  const luni = { pret: 125, prev: 123, tc: c.tc.concat([{ t: T("2026-09-28T13:30:00Z"), c: 125 }]) };
  assert.equal(prevSimbol(luni, T("2026-09-28T15:00:00Z")), 123, "luni 11:00 NY: bara de luni e 'azi', prev = vineri");
  assert.equal(prevSimbol({ pret: 1, prev: 0.9 }, T("2026-09-27T20:00:00Z")), 0.9, "cache vechi fara tc: ramane prev-ul lui");
  assert.equal(prevSimbol(null, T("2026-09-27T20:00:00Z")), null);
  assert.equal(prevClose(c.tc, T("2026-09-27T20:00:00Z")), 123, "aceeasi regula ca la pozitii");
});

// ---------- 3. bataia paznicului ----------
await test("bataieNecesara: cat poza a urcat in ultimele 10 minute NU se bate (poza e pulsul); altfel la 5 minute", () => {
  const acum = T("2026-09-28T06:00:00Z");
  assert.equal(bataieNecesara({ acum, pozaOkLa: acum - 2 * MIN, paznicLa: 0 }), false, "poza proaspata -> fara bataie, fara scriere KV");
  assert.equal(bataieNecesara({ acum, pozaOkLa: acum - 11 * MIN, paznicLa: acum - 6 * MIN }), true, "poza veche, ultima bataie acum 6 min -> bate");
  assert.equal(bataieNecesara({ acum, pozaOkLa: acum - 11 * MIN, paznicLa: acum - 4 * MIN }), false, "poza veche, bataie acum 4 min -> mai asteapta");
  assert.equal(bataieNecesara({ acum, pozaOkLa: 0, paznicLa: 0 }), true, "niciodata poza, niciodata bataie -> bate");
});
await test("worker verifica: dupa ce a anuntat tacerea, o poza proaspata (fara nicio bataie) -> 'a revenit' pe Discord o singura data si anuntatLa se sterge", async () => {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abcDEF_-x", PAZNIC_TOKEN: "t".repeat(32) };
  const f = async (u, o) => { trimise.push(JSON.parse(o.body)); return new Response("{}", { status: 200 }); };
  const T0 = T("2026-09-28T03:00:00Z");
  kv.set("stare", JSON.stringify({ la: T0 - 60 * MIN, pid: 1, versiune: "v98.1", anuntatLa: T0 - 20 * MIN }));
  kv.set("poza", JSON.stringify({ la: T0 - 1 * MIN, versiune: "v98.2", t212: [], boti: [], simboluri: [] }));
  const r = await verifica(env, T0, f);
  assert.equal(r.stare, "revenit");
  assert.equal(trimise.length, 1); assert.match(trimise[0].content, /a revenit/);
  const s = JSON.parse(kv.get("stare")); assert.equal(s.anuntatLa, undefined, "anuntatLa sters"); assert.equal(s.la, T0 - 1 * MIN, "ultimul semn = poza");
  assert.equal((await verifica(env, T0 + 2 * MIN, f)).stare, "bate"); assert.equal(trimise.length, 1, "revenirea nu se repeta");
});
await test("worker verifica: 'a revenit' spune de CAND tacuse (ultimul semn dinaintea tacerii, poza sau bataie), nu ultima bataie de acum zile", async () => {
  const kv = new Map(), trimise = [];
  const env = { PAZNIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abcDEF_-x", PAZNIC_TOKEN: "t".repeat(32) };
  const f = async (u, o) => { trimise.push(JSON.parse(o.body)); return new Response("{}", { status: 200 }); };
  const T0 = T("2026-09-28T03:00:00Z"), ultimaBataie = T0 - 3 * 24 * 60 * MIN, ultimaPoza = T0 - 50 * MIN;
  kv.set("stare", JSON.stringify({ la: ultimaBataie, pid: 1, versiune: "v99" }));
  kv.set("poza", JSON.stringify({ la: ultimaPoza, versiune: "v99", t212: [], boti: [], simboluri: [] }));
  assert.equal((await verifica(env, T0, f)).stare, "anuntat"); assert.equal(JSON.parse(kv.get("stare")).tacutDeLa, ultimaPoza, "tine minte ultimul semn dinaintea tacerii");
  kv.set("poza", JSON.stringify({ la: T0 + 1 * MIN, versiune: "v99", t212: [], boti: [], simboluri: [] }));
  assert.equal((await verifica(env, T0 + 2 * MIN, f)).stare, "revenit");
  const ora = (t) => new Date(t).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit" });
  assert.ok(trimise[1].embeds[0].description.includes(ora(ultimaPoza)), trimise[1].embeds[0].description); assert.ok(!trimise[1].embeds[0].description.includes(ora(ultimaBataie)));
  const s = JSON.parse(kv.get("stare")); assert.equal(s.tacutDeLa, undefined); assert.equal(s.anuntatLa, undefined);
});

// ---------- 3b. cele 30 de preturi ale botului (pagina alerts) supravietuiesc repornirii colectorului ----------
await test("pret30DinIstoric: lista celor 30 de preturi se umple din istoricul botului din KV (pretPerp, minut cu minut), nu doar din memoria colectorului - dupa o repornire pagina arata iar 'cat s-a miscat', nu 'putine poze inca'", () => {
  const T0 = T("2026-09-28T06:00:00Z");
  const ist = Array.from({ length: 50 }, (_, i) => ({ t: T0 - (50 - i) * MIN, pretPerp: 0.57 + i * 0.0001, perechi: i }));
  const r = pret30DinIstoric(ist, [0.5751, 0.5752]);
  assert.equal(r.length, 30, "cel mult 30"); assert.equal(r[r.length - 1], 0.5752, "memoria (cea mai noua) e la coada"); assert.equal(r[r.length - 2], 0.5751);
  assert.ok(r[0] < r[1] && r[27] < r[28], "cronologic: din istoric, cele mai noi 28, apoi memoria");
  assert.deepEqual(pret30DinIstoric([], [0.57]), [0.57], "fara istoric ramane memoria");
  assert.deepEqual(pret30DinIstoric([{ t: 1, pretPerp: null }, { t: 2, pretPerp: "x" }, { t: 3, pretPerp: 0.5 }], []), [0.5], "intrarile fara pret se sar");
  const dez = pret30DinIstoric([{ t: 3, pretPerp: 3 }, { t: 1, pretPerp: 1 }, { t: 2, pretPerp: 2 }], []); assert.deepEqual(dez, [1, 2, 3], "sortate dupa timp");
  assert.equal(pret30DinIstoric(null, null).length, 0);
});

// ---------- 4. insider "nou" ----------
await test("alerteSimboluri: la PRIMA vedere a simbolului nu e stire; cu stare anterioara neut + cumparare din ultimele 30 de zile -> alerta; cumparare mai veche de 30 de zile -> nimic; deja bull -> nimic", () => {
  const acum = T("2026-09-27T19:40:00Z");
  const tx = (d, ce) => ({ startDate: { fmt: d }, filerName: "TAN LIP-BU", filerRelation: "Chief Executive Officer", transactionText: ce, shares: { raw: 105263 }, value: { raw: 9999985 } });
  const vechi = { s: "INTC", pret: 123, prev: 123, closes30: [], insideri: insideri([tx("2026-08-11", "Purchase at price 95.00 per share.")], acum) };
  assert.equal(vechi.insideri.verdict, "bull1");
  assert.equal(alerteSimboluri([vechi], {}, acum).filter((a) => /insider/.test(a.cheie)).length, 0, "prima vedere: cumpararea din 11.08 NU e noua");
  const anteriorNeut = { INTC: { insideri: { verdict: "neut" } } };
  assert.equal(alerteSimboluri([vechi], anteriorNeut, acum).filter((a) => /insider/.test(a.cheie)).length, 0, "cumparare de acum 47 de zile: nu e stire nici cu stare anterioara");
  const nou = { ...vechi, insideri: insideri([tx("2026-09-24", "Purchase at price 120.00 per share.")], acum) };
  const a = alerteSimboluri([nou], anteriorNeut, acum).filter((x) => /insider/.test(x.cheie));
  assert.equal(a.length, 1); assert.match(a[0].mesaj, /24\.09|09\.24/); assert.match(a[0].mesaj, /Tan Lip-Bu/);
  assert.equal(alerteSimboluri([nou], { INTC: { insideri: { verdict: "bull1" } } }, acum).filter((x) => /insider/.test(x.cheie)).length, 0, "deja bull1 in poza anterioara: nimic");
  assert.equal(nou.insideri.ultimaCumparare.zi, "2026-09-24", "insideri() spune ziua ultimei cumparari");
  // revizie 🔵: verdictul poate deveni bull si cand vanzarile VECHI ies din fereastra de 60 z - fara o cumparare NOUA nu e stire
  const antCuAceeasi = { INTC: { insideri: { verdict: "neut", ultimaCumparare: { zi: "2026-09-24" } } } };
  assert.equal(alerteSimboluri([nou], antCuAceeasi, acum).filter((x) => /insider/.test(x.cheie)).length, 0, "aceeasi cumparare ca in poza anterioara: nu e noua");
  assert.equal(alerteSimboluri([nou], { INTC: { insideri: { verdict: "neut", ultimaCumparare: { zi: "2026-09-10" } } } }, acum).filter((x) => /insider/.test(x.cheie)).length, 1, "cumparare mai noua decat cea stiuta: stire");
});

// ---------- 5. Health cinstit ----------
await test("provider-health de ACASA: CoinGecko si cotatiile se probeaza (OK cand raspund), D1 nelegat nu e FAIL obligatoriu, push spune ca alertele merg pe Discord", async () => {
  const m = await import(`../functions/api/provider-health.js?v982_${Date.now()}`);
  const cereri = [];
  globalThis.fetch = async (url) => { cereri.push(String(url)); return raspuns(/finance\/chart/.test(String(url)) ? chart([{ t: T("2026-09-25T13:30:00Z"), c: 100 }]) : { gecko_says: "(V3) To the Moon!" }); };
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async () => null, put: async () => {} }, DISCORD_WEBHOOK: "https://discord.com/api/webhooks/123/abcDEF_-x" };
  const res = await m.onRequestGet({ request: new Request("http://127.0.0.1:8788/api/provider-health", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "127.0.0.1" } }), env });
  assert.equal(res.status, 200); const j = await res.json(); const p = (re) => j.providers.find((x) => re.test(x.name));
  const cg = p(/COINGECKO/i); assert.ok(cg, "randul CoinGecko"); assert.equal(cg.state, "OK", JSON.stringify(cg)); assert.ok(cereri.some((u) => /coingecko/.test(u)), "CoinGecko chiar probat");
  const ac = p(/ACȚIUNI|ACTIUNI|cota/i); assert.ok(ac, "randul cotatiilor de actiuni: " + j.providers.map((x) => x.name).join(" | ")); assert.equal(ac.state, "OK", JSON.stringify(ac)); assert.match(ac.detail, /Yahoo/i);
  assert.ok(!p(/TWELVE DATA · cheie/), "randul vechi 'Twelve Data · cheie' (modulul de actiuni e oprit) a disparut");
  const db = p(/D1/); assert.equal(db.required, false, "acasa D1 nu e obligatoriu"); assert.notEqual(db.state, "FAIL"); assert.match(db.detail, /KV|acasă|acasa/);
  const push = p(/PUSH/); assert.match(push.detail, /Discord/);
  // revizie 🔵: prin tunel (telefon) hostname-ul e *.trycloudflare.com, dar serverul e tot cel de acasa
  const res2 = await m.onRequestGet({ request: new Request("https://dice-scholarships-screens-grab.trycloudflare.com/api/provider-health", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.1.1.2" } }), env });
  const j2 = await res2.json(); assert.equal(j2.providers.find((x) => /COINGECKO/i.test(x.name)).state, "OK", "prin tunel tot acasa e"); assert.equal(j2.providers.find((x) => /D1/.test(x.name)).required, false);
});
await test("provider-health de pe Cloudflare (nu acasa): D1 nelegat ramane FAIL obligatoriu (regula veche, v69)", async () => {
  const m = await import(`../functions/api/provider-health.js?v982c_${Date.now()}`);
  globalThis.fetch = async () => raspuns({});
  const res = await m.onRequestGet({ request: new Request("https://crypto-wuy.pages.dev/api/provider-health", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.0.0.9" } }), env: { APP_API_TOKEN: TOKEN } });
  const j = await res.json(); const db = j.providers.find((x) => /D1/.test(x.name)); assert.equal(db.state, "FAIL"); assert.equal(db.required, true);
});

// ---------- 6. versiunea din health ----------
await test("/api/market?type=health poarta versiunea din BUILD_INFO.json (nu 'v56' scris de mana)", async () => {
  const m = await import(`../functions/api/market.js?v982_${Date.now()}`);
  const h = m.onRequestGet || m.onRequest;
  const res = await h({ request: new Request("http://127.0.0.1:8788/api/market?type=health"), env: {} });
  const j = await res.json(), bi = JSON.parse(fs.readFileSync(new URL("../BUILD_INFO.json", import.meta.url), "utf8"));
  assert.equal(j.service, "crypto-radar"); assert.equal(j.version, bi.version, "health " + j.version + " vs BUILD_INFO " + bi.version);
});

console.log(`\nV982 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute\n`);
process.exit(picate ? 1 : 0);
