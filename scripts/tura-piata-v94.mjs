// Proba turei de piata din colector (v94): vremea pietei (alerta la schimbare), funding-ul pe piata, miscarea
// neobisnuita pe botii lui si pe actiunile lui, Nasdaq la zi cat e bursa deschisa, poza zilnica. Fara retea.
// Rulare: node scripts/tura-piata-v94.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { turaPiata } from "./lib/tura-piata.mjs";

for (const f of ["grid-calcul.js", "grid-clasament.js", "directie.js", "alerte.js", "acasa.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
const ORA = 3600000, MIN = 60000;
// sambata 26.09 21:00 Bucuresti (bursa inchisa) si luni 28.09 17:30 Bucuresti = 10:30 New York (deschisa)
const SAMBATA = Date.UTC(2026, 8, 26, 18, 0), LUNI = Date.UTC(2026, 8, 28, 14, 30);
const kl = (n, f, pas) => Array.from({ length: n }, (_, i) => ({ time: SAMBATA - (n - i) * pas, open: f(i), high: f(i) * 1.001, low: f(i) * 0.999, close: f(i), volume: 1 }));
const zil = (n, f) => Array.from({ length: n }, (_, i) => ({ time: LUNI - (n - i - 1) * 86400000, open: f(i), high: f(i), low: f(i), close: f(i) }));

function lume(o = {}) {
  const cereri = [], trimise = [], alerte = [];
  const clasament = { la: SAMBATA, monede: Array.from({ length: 100 }, (_, i) => ({ simbol: "C" + i + "_USDT_PERP", stare: i < (o.evita ?? 30) ? "evita" : "candidat", dir: "long" })) };
  const date = {
    "/api/istoric-bot?action=clasament": { clasament },
    "/api/stiri?action=piata": { qqq: zil(260, (i) => 100 * Math.pow(1.002, i)), spy: zil(260, (i) => 100), vix: zil(40, () => o.vix ?? 15), fg: { valoare: 74, clasa: "Greed", istoric: [70, 74] } },
    "/api/t212?action=ndx": { la: SAMBATA, zi: "2026-09-26", actiuni: [{ s: "AAPL", ch: 1, e50: true, e200: true, rsi: 60 }, { s: "MSFT", ch: -1, e50: false, e200: true, rsi: 40 }] },
    "/api/bot-orders": { bots: [{ id: "2383", baza: "VVV.PERP", activ: true, pretCurent: 29.7 }] },
    "/api/t212?action=pozitii": [{ ticker: "APLD_US_EQ" }, { ticker: "VOW3d_EQ" }],
    "/api/market?type=pionex_tickers&market=PERP": { data: { tickers: Array.from({ length: 40 }, (_, i) => ({ symbol: "C" + i + "_USDT_PERP", amount: String(1e9 - i), open: "1", close: "1" })) } },
  };
  const cere = async (u) => {
    cereri.push(u);
    if (date[u] !== undefined) return date[u];
    if (/pionex_klines&symbol=BTC_USDT_PERP&interval=60M/.test(u)) return { data: { klines: kl(500, (i) => 84000 + (i % 2), ORA) } };
    if (/pionex_klines&symbol=BTC_USDT_PERP&interval=1D/.test(u)) return { data: { klines: kl(200, (i) => 80000 + i * 10, 86400000) } };
    if (/pionex_klines&symbol=VVV_USDT_PERP&interval=60M/.test(u)) return { data: { klines: kl(500, (i) => (i >= 476 ? (o.vvvScade ? 26 : 30) : 30 * (1 + (i % 2 ? 0.003 : -0.003))), ORA) } };
    if (/pionex_funding/.test(u)) return { data: { rates: [{ fundingRate: String(o.funding ?? 0.00005), fundingTime: SAMBATA }, ...Array.from({ length: 30 }, (_, k) => ({ fundingRate: "0.00005", fundingTime: SAMBATA - (k + 1) * 4 * ORA }))] } };
    if (/action=preturi.*APLD_US_EQ/.test(u)) return { randuri: zil(260, (i) => (i === 259 && o.apldSare ? 40 * 1.2 : 40 * (1 + (i % 2 ? 0.01 : -0.01)))) };
    if (/action=preturi/.test(u)) return { randuri: zil(260, (i) => 100 * Math.pow(1.002, i)) };
    throw Object.assign(new Error("ruta necunoscuta in proba: " + u), { status: 404 });
  };
  const d = { cere, trimite: async (u, c) => { trimise.push([u, c]); return { ok: true } }, trimiteAlerta: async (m) => { alerte.push(m); return true; }, jurnal: () => {}, pauza: async () => {},
    Acasa: globalThis.Acasa, Alerte: globalThis.Alerte, GridCalcul: globalThis.GridCalcul, GridClasament: globalThis.GridClasament, Directie: globalThis.Directie, NDX: ["AAPL", "MSFT"] };
  return { d, cereri, trimise, alerte };
}

await test("sambata: vremea (prima citire tine minte), funding-ul pe piata trimis, botul verificat; bursa inchisa -> nicio cerere de actiuni", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  assert.ok(st.vreme && st.vreme.crypto, "nu tine minte vremea"); assert.deepEqual(w.alerte, []);
  const f = w.trimise.find((x) => /action=piata/.test(x[0]) && x[1].funding); assert.ok(f, "funding-ul nu s-a trimis"); assert.equal(f[1].funding.n, 30);
  assert.ok(!w.cereri.some((u) => /action=preturi/.test(u)), "a cerut actiuni cu bursa inchisa");
  assert.ok(w.cereri.some((u) => /VVV_USDT_PERP&interval=60M/.test(u)), "n-a verificat miscarea botului");
});
await test("ritmul: la 5 minute nu se repeta nimic; vremea la 10 min, funding-ul la o ora", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA); const n0 = w.cereri.length;
  await turaPiata(w.d, st, SAMBATA + 5 * MIN); assert.equal(w.cereri.length, n0, "a cerut din nou dupa 5 min");
  await turaPiata(w.d, st, SAMBATA + 11 * MIN); assert.ok(w.cereri.length > n0, "vremea nu s-a reverificat dupa 10 min");
  assert.equal(w.cereri.filter((u) => /pionex_funding/.test(u)).length, 30, "funding-ul s-a cerut din nou inainte de o ora");
});
await test("vremea se schimba (70 din 100 in miscare) -> alerta CRITIC dupa confirmare, o singura data", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  const w2 = lume({ evita: 70 }); w2.d.trimiteAlerta = w.d.trimiteAlerta;
  await turaPiata(w2.d, st, SAMBATA + 11 * MIN); await turaPiata(w2.d, st, SAMBATA + 22 * MIN); await turaPiata(w2.d, st, SAMBATA + 33 * MIN);
  const m = w.alerte.filter((x) => /Crypto/.test(x.titlu)); assert.equal(m.length, 1); assert.equal(m[0].nivel, "critic"); assert.match(m[0].titlu, /MIȘCARE/);
});
await test("botul VVV scade neobisnuit in 24 h (-13%) -> alerta pe moneda lui, o data", async () => {
  const w = lume({ vvvScade: true }), st = {};
  await turaPiata(w.d, st, SAMBATA); await turaPiata(w.d, st, SAMBATA + 31 * MIN);
  const m = w.alerte.filter((x) => /VVV/.test(x.titlu)); assert.equal(m.length, 1); assert.match(m[0].titlu, /scade/);
});
await test("luni, bursa deschisa: Nasdaq 100 la zi trimis (action=ndx), actiunile americane din portofoliu verificate; APLD +20% -> alerta", async () => {
  const w = lume({ apldSare: true }), st = {};
  await turaPiata(w.d, st, LUNI);
  const n = w.trimise.find((x) => /action=ndx/.test(x[0])); assert.ok(n, "Nasdaq nu s-a trimis"); assert.deepEqual(n[1].ndx.map((x) => x.s), ["AAPL", "MSFT"]);
  assert.ok(!w.cereri.some((u) => /VOW3d_EQ/.test(u)), "a cerut o actiune ne-americana");
  const m = w.alerte.filter((x) => /APLD/.test(x.titlu)); assert.equal(m.length, 1); assert.match(m[0].titlu, /urcă/);
  await turaPiata(w.d, st, LUNI + 30 * MIN); assert.equal(w.trimise.filter((x) => /action=ndx/.test(x[0])).length, 1, "Nasdaq s-a refacut inainte de o ora");
});
await test("poza zilnica: dupa ora 9 (Bucuresti), o data pe zi, cu cifrele citite (FG, in miscare, VIX, Nasdaq peste media de 50, BTC, funding)", async () => {
  const w = lume(), st = {};
  await turaPiata(w.d, st, SAMBATA);
  const p = w.trimise.filter((x) => /action=piata/.test(x[0]) && x[1].instantaneu); assert.equal(p.length, 1);
  const z = p[0][1].instantaneu; assert.equal(z.zi, "2026-09-26"); assert.equal(z.fg, 74); assert.equal(z.inMiscare, 30); assert.equal(z.vix, 15); assert.equal(z.ndxE50, 1); assert.ok(z.btc > 0);
  await turaPiata(w.d, st, SAMBATA + 2 * ORA); assert.equal(w.trimise.filter((x) => /action=piata/.test(x[0]) && x[1].instantaneu).length, 1, "a doua poza in aceeasi zi");
});
await test("o sursa picata nu opreste restul turei (pozitii T212 cu eroare -> Nasdaq si vremea merg)", async () => {
  const w = lume(), st = {}, c0 = w.d.cere;
  w.d.cere = async (u) => { if (/pozitii/.test(u)) throw Object.assign(new Error("T212 picat"), { status: 502 }); return c0(u); };
  await turaPiata(w.d, st, LUNI);
  assert.ok(w.trimise.some((x) => /action=ndx/.test(x[0]))); assert.ok(st.vreme && st.vreme.bursa);
});

console.log(`\nTURA_PIATA_V94 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
