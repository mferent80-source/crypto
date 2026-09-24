// Proba jurnalului FIFO (v74.6) - fara browser, fara retea, fara Pionex.
//
// Scoate din public/app.js CHIAR functiile jurnalului (v71NormalizeFill,
// v71FeeUsd, v71BuildTrades, pauza dintre cereri) si le cheama cu cazuri
// numerice cunoscute. Auditul din 24.09 a gasit:
//   - taxa luata in moneda de BAZA la cumparare lasa un "lot-fantoma"
//     (remaining = qty, desi in cont au intrat qty - taxa);
//   - un fill fara timestamp primea Date.now() - adica "tocmai acum";
//   - feeCoin lipsa era presupus "USDT" (acoperire EXACTA inventata);
//   - sincronizarea trimitea cererile una dupa alta, fara pauza.
//
// Rulare: node scripts/jurnal-fifo-v746.mjs

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const SURSA = readFileSync(new URL("../public/app.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");

// Textul unei functii de nivel de sus, dupa nume. Pe un rand (stilul
// minificat) sau pe mai multe, pana la "}" singur pe rand.
function extrage(nume) {
  const re = new RegExp("^(async\\s+)?function\\s+" + nume + "\\(", "m");
  const m = re.exec(SURSA);
  if (!m) throw new Error(`nu gasesc functia ${nume} in public/app.js`);
  const rest = SURSA.slice(m.index);
  const primul = rest.split("\n")[0];
  const echilibru = (t) => (t.match(/{/g) || []).length - (t.match(/}/g) || []).length;
  if (echilibru(primul) === 0) return primul;
  const sf = rest.indexOf("\n}\n");
  if (sf < 0) throw new Error(`nu gasesc sfarsitul functiei ${nume}`);
  return rest.slice(0, sf + 2);
}
// Variabilele de nivel de sus pe care le folosesc (let/const pe un rand).
function extrageDecl(nume) {
  const m = new RegExp("^(let|const|var)\\s+" + nume + "\\b[^\\n]*", "m").exec(SURSA);
  if (!m) throw new Error(`nu gasesc declaratia ${nume}`);
  return m[0];
}

function incarca(nume, decl = [], mediu = {}) {
  const cod = decl.map(extrageDecl).join("\n") + "\n" + nume.map(extrage).join("\n") +
    "\nreturn {" + nume.join(",") + "};";
  const chei = Object.keys(mediu);
  return new Function(...chei, cod)(...chei.map((k) => mediu[k]));
}

const J = incarca(["v71SafeSymbol", "v71Id", "v71FeeUsd", "v71NormalizeFill", "v71Dedupe", "v71BuildTrades"]);

let ok = 0, picate = 0;
async function test(nume, fn) {
  try { await fn(); ok++; console.log(`  ok   ${nume}`); }
  catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
const aproape = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const T0 = 1750000000000;
const fill = (o) => Object.assign({ symbol: "BTC_USDT", feeCoin: "USDT", fee: "0" }, o);

console.log("\nV74.6 · jurnal FIFO · proba");

await test("FIFO, nu LIFO: 1@100, 1@200, vand 1@300 => intrarea e 100, castig brut 200", async () => {
  const fills = [
    fill({ id: "a", orderId: "o1", side: "BUY", price: "100", size: "1", timestamp: T0 }),
    fill({ id: "b", orderId: "o2", side: "BUY", price: "200", size: "1", timestamp: T0 + 1000 }),
    fill({ id: "c", orderId: "o3", side: "SELL", price: "300", size: "1", timestamp: T0 + 2000 }),
  ].map((x) => J.v71NormalizeFill(x, "BTC_USDT"));
  const r = J.v71BuildTrades(fills);
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].entry, 100, `FIFO inchide lotul VECHI (100); LIFO ar fi dat ${r.trades[0].entry}`);
  assert.ok(aproape(r.trades[0].grossPnl, 200), `brut ${r.trades[0].grossPnl}, asteptat 200 (LIFO: 100)`);
  assert.equal(r.openLots.length, 1); assert.equal(r.openLots[0].price, 200);
});

await test("vanzare peste doua loturi: 2@10 + 3@12, vand 4@15 => brut 10 + 6, ramane 1@12", async () => {
  const fills = [
    fill({ id: "a", side: "BUY", price: "10", size: "2", timestamp: T0 }),
    fill({ id: "b", side: "BUY", price: "12", size: "3", timestamp: T0 + 1 }),
    fill({ id: "c", side: "SELL", price: "15", size: "4", timestamp: T0 + 2 }),
  ].map((x) => J.v71NormalizeFill(x, "BTC_USDT"));
  const r = J.v71BuildTrades(fills);
  assert.deepEqual(r.trades.map((t) => [t.entry, t.qty, t.grossPnl]), [[10, 2, 10], [12, 2, 6]]);
  assert.equal(r.openLots.length, 1);
  assert.ok(aproape(r.openLots[0].remaining, 1));
});

await test("taxa in moneda de BAZA la cumparare: lotul e qty - taxa, fara lot-fantoma", async () => {
  // cumpar 1 BTC la 100, Pionex opreste 0.001 BTC taxa => in cont intra 0.999
  const fills = [
    fill({ id: "a", side: "BUY", price: "100", size: "1", fee: "0.001", feeCoin: "BTC", timestamp: T0 }),
    fill({ id: "b", side: "SELL", price: "110", size: "0.999", fee: "0.1099", feeCoin: "USDT", timestamp: T0 + 1 }),
  ].map((x) => J.v71NormalizeFill(x, "BTC_USDT"));
  const r = J.v71BuildTrades(fills);
  assert.equal(r.unmatched.length, 0, `nimic nu trebuie sa ramana nepotrivit: ${JSON.stringify(r.unmatched)}`);
  assert.equal(r.openLots.length, 0, `lot-fantoma ramas: ${JSON.stringify(r.openLots.map((l) => l.remaining))}`);
  assert.equal(r.trades.length, 1);
  const t = r.trades[0];
  assert.ok(aproape(t.grossPnl, 9.99), `brut ${t.grossPnl}, asteptat (110-100)*0.999 = 9.99`);
  // taxa de cumparare: 0.001 BTC * 100 = 0.1 USDT; de vanzare 0.1099 USDT
  assert.ok(aproape(t.fees, 0.2099), `taxe ${t.fees}, asteptat 0.2099`);
  assert.ok(aproape(t.netPnl, 9.7801), `net ${t.netPnl}, asteptat 9.7801`);
});

await test("fill fara timestamp: nu primeste 'acum' - merge la nepotrivite, cu motiv", async () => {
  const f = J.v71NormalizeFill(fill({ id: "x", side: "BUY", price: "100", size: "1" }), "BTC_USDT");
  assert.equal(f.ts, null, `timestamp inventat: ${f.ts}`);
  const r = J.v71BuildTrades([f, J.v71NormalizeFill(fill({ id: "y", side: "SELL", price: "110", size: "1", timestamp: T0 }), "BTC_USDT")]);
  const u = r.unmatched.find((x) => x.fillId === "x");
  assert.ok(u, "fill-ul fara timp trebuie sa fie in unmatched");
  assert.equal(u.reason, "MISSING_TIMESTAMP");
  assert.equal(r.trades.length, 0, "fara ora, cumpararea nu poate fi pusa in ordine FIFO - nu se inchide nimic pe ea");
});

await test("feeCoin lipsa: acoperirea taxei e UNRESOLVED, nu 'USDT exact'", async () => {
  const f = J.v71NormalizeFill({ id: "z", symbol: "BTC_USDT", side: "BUY", price: "100", size: "1", fee: "0.2", timestamp: T0 }, "BTC_USDT");
  assert.equal(f.feeCoverage, "UNRESOLVED", `acoperire inventata: ${f.feeCoverage}`);
  assert.equal(f.feeUsd, null);
  const zero = J.v71NormalizeFill({ id: "w", symbol: "BTC_USDT", side: "BUY", price: "100", size: "1", fee: "0", timestamp: T0 }, "BTC_USDT");
  assert.equal(zero.feeCoverage, "ZERO", "taxa zero ramane ZERO si fara moneda");
});

await test("sincronizarea: cel putin ~1,1 s intre doua cereri catre Pionex", async () => {
  const momente = [];
  // v71HistoryWindow e drumul real al sincronizarii: fiecare fereastra = o cerere
  const P = incarca(["v71Pauza", "v71CereCuRabdare", "v71Rows", "v71HistoryWindow"], ["v71UltimaCerere", "V71_PAUZA_MS"],
    { getJSON: async () => { momente.push(Date.now()); return { data: [] }; } });
  for (let i = 0; i < 3; i++) await P.v71HistoryWindow("fills", "BTC_USDT", T0, T0 + 1000);
  const pauze = momente.slice(1).map((t, i) => t - momente[i]);
  assert.ok(pauze.every((p) => p >= 1050), `pauze prea scurte intre cereri: ${pauze.join(", ")} ms`);
});

console.log(`\nV746_JURNAL_FIFO ${picate ? "FAIL" : "PASS"} · ${ok}/${ok + picate}\n`);
process.exit(picate ? 1 : 0);
