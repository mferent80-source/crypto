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

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
