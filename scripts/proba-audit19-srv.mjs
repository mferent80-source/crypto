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

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
