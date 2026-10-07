// Proba v101.87 (el 07.10: „DA LA TOT”): (1) pagina Salt din Radar nu mai rescrie TOATĂ lista din memoria ei - serverul primește
// o singură operație (pune / scoate) pe lista PROASPĂTĂ, deci o poziție adăugată între timp de pe pagina alerts rămâne;
// (2) alerta „rezultatele vin mâine” la simbolurile urmărite. Fără rețea. Rulare: node scripts/proba-salt-poz-v10187.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { alerteSimboluri, ziSesiune } from "./lib/poza.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); } }

function kvFals() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix || "")).map((name) => ({ name })), list_complete: true }) }; }
const TOKEN = "t".repeat(40), env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
const cheama = async (metoda, qs, corp) => { const mod = await import(`../functions/api/t212.js?t=${Date.now()}_${Math.random()}`);
  const h = { "cf-connecting-ip": "10.0.8." + Math.floor(Math.random() * 250), authorization: "Bearer " + TOKEN }; if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const res = await mod[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: new Request(`https://exemplu.test/api/t212?${qs}`, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined }), env });
  let d = null; try { d = await res.json(); } catch {} return { status: res.status, d }; };
const RHM = { isin: "DE0007030009", simbol: "RHM.DE", nume: "Rheinmetall", qty: 1.0456, pretMediu: 1349.6, de: "2026-05-11", plata: "EUR" };
const NFLX = { isin: "US64110L1061", simbol: "NFLX", nume: "Netflix", qty: 14.43412, pretMediu: 79.84, de: "2026-04-21", plata: "EUR" };

await test("(1a) saltPoz pune: o poziție pe lista PROASPĂTĂ - ce a adăugat alerts între timp rămâne; aceeași ISIN se înlocuiește", async () => {
  assert.equal((await cheama("POST", "action=saltPozitii", { pozitii: [RHM] })).status, 200);
  // între timp, colectorul (cererea de pe pagina alerts) a scris NFLX; pagina Salt, deschisă de dinainte, știe doar RHM
  assert.equal((await cheama("POST", "action=saltPozitii", { pozitii: [RHM, NFLX] })).status, 200);
  const r = await cheama("POST", "action=saltPoz", { pune: { ...RHM, qty: 2 } });
  assert.equal(r.status, 200); assert.deepEqual(r.d.pozitii.map((x) => x.simbol), ["RHM.DE", "NFLX"], "NFLX nu se pierde");
  assert.equal(r.d.pozitii[0].qty, 2);
  const g = (await cheama("GET", "action=salt")).d; assert.equal(g.pozitii.length, 2);
});
await test("(1b) saltPoz scoate: doar ISIN-ul cerut; poziție stricată sau operație lipsă ⇒ 400 și lista neatinsă", async () => {
  const r = await cheama("POST", "action=saltPoz", { scoate: "DE0007030009" });
  assert.equal(r.status, 200); assert.deepEqual(r.d.pozitii.map((x) => x.simbol), ["NFLX"]);
  assert.equal((await cheama("POST", "action=saltPoz", { pune: { isin: "rau", qty: -1 } })).status, 400);
  assert.equal((await cheama("POST", "action=saltPoz", {})).status, 400);
  assert.equal((await cheama("GET", "action=salt")).d.pozitii.length, 1);
});
await test("(1c) pagina Salt trimite operația (saltPoz), nu toată lista din memorie", () => {
  const s = fs.readFileSync(path.join(RAD, "public", "lib", "salt-ecran.js"), "utf8");
  assert.match(s, /action=saltPoz"/); assert.doesNotMatch(s, /action=saltPozitii/, "pagina nu mai rescrie toată lista");
  assert.match(s, /saltSalveaza\(\{ pune: p \}\)/); assert.match(s, /saltSalveaza\(\{ scoate: isin \}\)/);
});
const ACUM = Date.UTC(2026, 9, 7, 13, 0);
await test("(2) „rezultatele vin mâine” la simbolul urmărit: o dată pe zi, doar la zile === 1, cu data și EPS estimat", () => {
  const s = (sim, zile, eps) => ({ s: sim, pret: 100, prev: 100, closes30: [], rezultate: { data: "2026-10-08", zile, eps } });
  const a = alerteSimboluri([s("AAPL", 1, 1.98), s("MSFT", 2, 3.1), s("INTC", 0, 0.4)], {}, ACUM).filter((x) => x.cheie.startsWith("sim-rezultate-"));
  assert.equal(a.length, 1); assert.equal(a[0].cheie, "sim-rezultate-AAPL-" + ziSesiune(ACUM), "o dată pe zi, ca celelalte alerte ale simbolurilor (ziua sesiunii NY)"); assert.equal(a[0].nivel, "info");
  assert.match(a[0].titlu, /^AAPL: rezultatele vin mâine \(8 oct\)/); assert.match(a[0].mesaj, /EPS estimat 1,98/); assert.match(a[0].mesaj, /👉 /);
});
console.log(`\n${teste - picate}/${teste} trec`); if (picate) process.exit(1);
