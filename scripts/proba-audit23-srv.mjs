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

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exitCode = picate ? 1 : 0;
