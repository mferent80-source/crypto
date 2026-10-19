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

console.log(`\n${teste - picate}/${teste} ${picate ? "— PICĂ" : "ok"}`);
process.exit(picate ? 1 : 0);
