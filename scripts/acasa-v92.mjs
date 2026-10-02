// Probele v92: pagina Home "Piata azi" (cererea lui 26.09: "pagina Home trebuie sa arate contextul general,
// piata etc." + "mai adauga FG, market breadth"). Demo aprobat: claude.ai/artifact/CobyvP3cKMKpuegBsQHFJt (v3).
// Rulare: node scripts/acasa-v92.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const lib = new URL("../public/lib/acasa.js", import.meta.url);
if (fs.existsSync(lib)) vm.runInThisContext(fs.readFileSync(lib, "utf8"));
const A = globalThis.Acasa || {};

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}

// ---------------- ruta: frica/lacomia cu istoricul pe 30 de zile ----------------
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
let ip = 0;
async function piata(fn) {
  globalThis.fetch = async (url) => { const r = fn(String(url)); return new Response(r.corp, { status: r.status || 200, headers: { "content-type": "application/json" } }); };
  const m = await import(`../functions/api/stiri.js?t=${Date.now()}_${Math.random()}`);
  const res = await m.onRequestGet({ request: new Request("https://exemplu.test/api/stiri?action=piata", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.92.0." + (++ip % 250) } }), env: ENV });
  return JSON.parse(await res.text());
}
const chart = (c) => JSON.stringify({ chart: { result: [{ timestamp: [1790000000, 1790086400], indicators: { quote: [{ open: [c, c], high: [c, c], low: [c, c], close: [c, c], volume: [1, 1] }] } }] } });
await test("ruta piata: frica/lacomia vine cu istoricul pe 30 de zile, de la cel mai vechi la azi; valorile stricate se sar", async () => {
  let cerut = null;
  const c = await piata((u) => {
    if (/alternative\.me/.test(u)) { cerut = u; return { corp: JSON.stringify({ data: [{ value: "74", value_classification: "Greed" }, { value: "71" }, { value: "x" }, { value: "50" }] }) }; }
    return { corp: chart(500) };
  });
  assert.match(cerut, /limit=31/);
  assert.equal(c.fg.valoare, 74); assert.equal(c.fg.clasa, "Greed");
  assert.deepEqual(c.fg.istoric, [50, 71, 74]);
});

// ---------------- vremea pietei ----------------
const CL = (o) => ({ evita: 36, candidati: 63, faraDate: 1, dir: { long: 85, neutru: 10, short: 4 }, ...o });
await test("vremea: BTC linistit, 36 din 99 in miscare -> AMESTECAT, cu motivul si 'ce as face eu' pe monedele linistite", () => {
  const v = A.vreme({ clasament: CL(), btc: { miscare: false }, fg: 74 });
  assert.equal(v.nivel, "amestecat"); assert.match(v.eticheta, /AMESTECAT/);
  assert.match(v.titlu, /BTC e liniștit/); assert.match(v.text, /36 din cele 99/); assert.match(v.faCe, /monedele liniștite/);
});
await test("vremea: lacomie >= 70 si majoritatea urca -> nu mari pariurile pe urcare; frica <= 30 si majoritatea coboara -> nu vinde in panica", () => {
  // v100.70 (revizia pachetului 3): lacomia intra in actiune - „fără pariuri mari pe urcare (lăcomia e la 74)”; acelasi sfat, o fraza ≤ 110
  assert.match(A.vreme({ clasament: CL(), btc: { miscare: false }, fg: 74 }).faCe, /fără pariuri mari pe urcare \(lăcomia e la 74\)|n-aș mări pariurile pe urcare/i);
  assert.match(A.vreme({ clasament: CL(), btc: { miscare: false }, fg: 74 }).text, /urcă în general/);
  const f = A.vreme({ clasament: CL({ dir: { long: 5, neutru: 10, short: 84 } }), btc: { miscare: false }, fg: 22 });
  assert.match(f.text, /coboară în general/); assert.match(f.faCe, /panică/);
});
await test("vremea: sub un sfert in miscare -> LINISTE (bun pentru grid); BTC in miscare sau jumatate in miscare -> MISCARE", () => {
  assert.equal(A.vreme({ clasament: CL({ evita: 10, candidati: 89 }), btc: { miscare: false }, fg: 50 }).nivel, "liniste");
  assert.equal(A.vreme({ clasament: CL({ evita: 10, candidati: 89 }), btc: { miscare: true }, fg: 50 }).nivel, "miscare");
  const m = A.vreme({ clasament: CL({ evita: 55, candidati: 44 }), btc: { miscare: false }, fg: 50 });
  assert.equal(m.nivel, "miscare"); assert.match(m.faCe, /N-aș porni boți grid noi/);
});
await test("vremea: fara clasament -> fara-date (nu inventeaza); fara F&G / BTC -> tot judeca din clasament", () => {
  assert.equal(A.vreme({}).nivel, "fara-date"); assert.equal(A.vreme(null).nivel, "fara-date");
  assert.equal(A.vreme({ clasament: CL({ evita: 0, candidati: 0 }) }).nivel, "fara-date");
  assert.equal(A.vreme({ clasament: CL() }).nivel, "amestecat");
});

// ---------------- cine se misca azi ----------------
const TK = (s, amount, open, close) => ({ symbol: s + "_USDT_PERP", amount: String(amount), open: String(open), close: String(close) });
await test("cine se misca: doar PERP-urile din top dupa volum; 5 sus / 5 jos; eticheta 'miscare' din clasament; cate au urcat", () => {
  const l = [TK("BTC", 9e9, 100, 101), TK("QNT", 5e8, 100, 125.7), TK("LYN", 4e8, 100, 59.5), TK("KAS", 3e8, 100, 119.1), TK("MIC", 1, 100, 300), { symbol: "ETH_USDT", amount: "9e9", open: "1", close: "9" }];
  const r = A.miscari(l, { top: 4, inMiscare: ["QNT_USDT_PERP"] });
  assert.equal(r.n, 4); assert.equal(r.urca, 3);
  assert.deepEqual(r.sus.map((x) => x.s), ["QNT", "KAS", "BTC"]); assert.equal(r.sus[0].miscare, true); assert.equal(r.sus[1].miscare, false);
  assert.equal(r.jos[0].s, "LYN"); assert.ok(Math.abs(r.jos[0].ch + 40.5) < 1e-9);
  assert.ok(!r.sus.some((x) => x.s === "MIC"), "moneda fara volum a intrat in top");
  assert.deepEqual(A.miscari(null).sus, []);
});

// ---------------- frica / lacomia ----------------
await test("frica/lacomia: interval pe 30 de zile, unde e acum (aproape de varf / minim / la mijloc) si pragul extrem", () => {
  const f = A.fg([71, 73, 68, 50, 56, 78, 71, 74]);
  assert.equal(f.acum, 74); assert.equal(f.min, 50); assert.equal(f.max, 78);
  assert.match(f.text, /între 50 și 78/); assert.match(f.text, /aproape de vârf/); assert.match(f.text, /Peste 75/);
  assert.match(A.fg([60, 40, 22, 24]).text, /aproape de minim/); assert.match(A.fg([60, 40, 22, 24]).text, /Sub 25/);
  assert.equal(A.fg([]).acum, null); assert.equal(A.fg(null).text, "");
});

// ---------------- largimea pietei pe bare ----------------
await test("largimea: barele in ordinea din demo, procente rotunjite; volumul slab cu medii sus -> 'urcare larga, fara convingere'", () => {
  const x = { state: "BULLISH", score: 81, participation: 63, above20: 96, above50: 100, above200: 100, momentum: 96, volume: 45, altParticipation: 61, highs: 3, lows: 0, divergence: "NONE" };
  const r = A.largime(x);
  assert.deepEqual(r.bare.map((b) => b.eticheta), ["Participare", "Peste media de 20", "Peste media de 50", "Peste media de 200", "RSI peste 50", "Volumul participă", "Altcoinii participă"]);
  assert.equal(r.bare[5].ton, "atentie"); assert.equal(r.bare[1].pct, 96);
  assert.match(r.cap, /81\/100/); assert.match(r.cap, /urcare/); assert.match(r.maxMin, /3 \/ 0/);
  assert.match(r.concluzie, /fără multă convingere/);
  assert.equal(A.largime(null), null);
  assert.ok(!/NaN|undefined/.test(JSON.stringify(A.largime({ score: 50 }))));
});

await test("ro: starile englezesti ale modulelor Pro in romana (rezumatele grupurilor pliate); necunoscutul ramane cum e", () => {
  assert.equal(A.ro("CAUTION"), "prudență"); assert.equal(A.ro("NOT READY"), "nu încă"); assert.equal(A.ro("LEARNING"), "învață");
  assert.equal(A.ro("NORMAL"), "normal"); assert.equal(A.ro("N/A"), "fără date"); assert.equal(A.ro("  WAIT "), "așteaptă"); assert.equal(A.ro("XYZ 12"), "XYZ 12"); assert.equal(A.ro("WAIT DATA"), "așteaptă datele"); assert.equal(A.ro("LOW "), "puține"); assert.equal(A.ro(null), "");
});

// 26.09: "Piata azi" arata "ultima zi -0,01%, VIX 15,7" sambata, desi vineri Nasdaq a facut +0,46% si VIX 14,87:
// GridCalcul.bare arunca ULTIMA bara (la crypto e in formare), iar t212PiataDin o dubla inainte - dar bare()
// scoate intai dublurile, deci pleca tot vinerea. Barele zilnice de bursa se iau cu bareToate (fara pop).
await test("barele zilnice de bursa: bareToate pastreaza ultima zi; bare() (crypto) o scoate in continuare", () => {
  const G = new Function(fs.readFileSync(new URL("../public/lib/grid-calcul.js", import.meta.url), "utf8") + "; return GridCalcul;")();
  const r = [{ time: 3, open: 1, high: 1, low: 1, close: 744.5 }, { time: 1, open: 1, high: 1, low: 1, close: 741.21 }, { time: 2, open: 1, high: 1, low: 1, close: 741.1 }, { time: 2, open: 1, high: 1, low: 1, close: 741.1 }];
  assert.equal(typeof G.bareToate, "function");
  assert.deepEqual(G.bareToate(r).map((b) => b.c), [741.21, 741.1, 744.5]);
  assert.deepEqual(G.bare(r).map((b) => b.c), [741.21, 741.1]);
  assert.deepEqual(G.bareToate(null), []);
});
await test("t212PiataDin si colectorul nu mai folosesc bare() pe barele zilnice de bursa", () => {
  const e = fs.readFileSync(new URL("../public/lib/t212-ecran.js", import.meta.url), "utf8"), c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  const f = e.slice(e.indexOf("function t212PiataDin"), e.indexOf("function piataAziRender"));
  assert.match(f, /bareToate/); assert.doesNotMatch(f, /GridCalcul\.bare\(/);
  const l = c.split("\n").find((x) => /action=piata/.test(x)); assert.match(l, /bareToate/);
});

console.log(`\nACASA_V92 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
