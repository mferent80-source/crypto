// Probele v93: Home mixt crypto + Nasdaq (demo v4 aprobat 26.09: "arata foarte bine") + "fa toate":
// calendarul saptamanii, corelatia BTC-Nasdaq, cele 7 mari, stirile. Rulare: node scripts/acasa-v93.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

vm.runInThisContext(fs.readFileSync(new URL("../public/lib/acasa.js", import.meta.url), "utf8"));
const A = globalThis.Acasa;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
const ZI = 86400000, T0 = Date.UTC(2026, 5, 1);
const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * ZI, o: f(i), h: f(i) * 1.01, l: f(i) * 0.99, c: f(i) }));

// ---------------- rezumatul unei actiuni (colectorul, tura de idei) ----------------
await test("rezumatActiune: ultima zi, 5 zile, peste EMA50/200, RSI, miscarea fata de obisnuit; prea putine bare -> null", () => {
  const b = zile(260, (i) => 100 * Math.pow(1.002, i)); b[259] = { ...b[259], c: b[258].c * 1.05 };
  const r = A.rezumatActiune(b);
  assert.ok(Math.abs(r.ch - 5) < 1e-6); assert.ok(r.ch5 > 5); assert.equal(r.e50, true); assert.equal(r.e200, true); assert.ok(r.rsi > 50);
  assert.ok(r.mis > 1.5, "+5% intr-o zi, la o actiune care misca 0,2% pe zi, e miscare"); assert.equal(r.p, b[259].c);
  assert.equal(A.rezumatActiune(zile(100, () => 10)), null); assert.equal(A.rezumatActiune(null), null);
});

// ---------------- largimea Nasdaq 100 + cele 7 mari ----------------
const X = (s, ch, e50, e200, rsi, mis) => ({ s, ch, ch5: ch, e50, e200, rsi, mis, p: 100 });
const NDX = [X("MCHP", 5.4, true, true, 60, 2), X("PYPL", 4.6, false, false, 55, 1.8), X("AAPL", 1, true, true, 58, 0.5), X("MSFT", -1.2, false, true, 45, 1.6), X("NVDA", 2, true, true, 62, 0.8),
  X("GOOGL", 0.5, true, true, 51, 0.3), X("AMZN", -0.3, false, true, 48, 0.2), X("META", -3.3, false, true, 40, 1.2), X("TSLA", 1.1, true, false, 52, 0.4), X("PANW", -3.9, false, false, 35, 1.1)];
await test("largimeNdx: cate urca / peste medii / RSI>50 / in miscare; top 5 sus-jos cu eticheta; cele 7 mari cu cate urca", () => {
  const l = A.largimeNdx(NDX);
  assert.equal(l.n, 10); assert.equal(l.urca, 6); assert.equal(l.e50, 5); assert.equal(l.e200, 7); assert.equal(l.rsi, 6);
  assert.deepEqual(l.inMiscare, ["MCHP", "PYPL", "MSFT"]);
  assert.equal(l.sus[0].s, "MCHP"); assert.equal(l.sus[0].miscare, true); assert.equal(l.jos[0].s, "PANW");
  assert.deepEqual(l.mag7.map((x) => x.s), ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"]);
  assert.equal(l.mag7Urca, 4); assert.match(l.mag7Text, /4 din 7/);
  assert.equal(A.largimeNdx([]), null); assert.equal(A.largimeNdx(null), null);
});

// ---------------- vremea bursei ----------------
const urca = zile(260, (i) => 100 * Math.pow(1.002, i)), coboara = zile(260, (i) => 100 * Math.pow(0.998, i));
await test("vremeBursa: trend sus + jumatate sub EMA50 -> URCARE INGUSTA; trend sus + majoritatea peste -> URCARE LARGA; cu 'ce as face'", () => {
  const ing = A.vremeBursa({ qqq: urca, vix: 14.87, ndx: A.largimeNdx(NDX) });
  assert.equal(ing.nivel, "ingusta"); assert.match(ing.eticheta, /URCARE ÎNGUSTĂ/); assert.match(ing.text, /5 din 10/); assert.match(ing.faCe, /deja pe trend/);
  const larg = A.vremeBursa({ qqq: urca, vix: 14.87, ndx: A.largimeNdx(NDX.map((x) => ({ ...x, e50: true }))) });
  assert.equal(larg.nivel, "larga");
});
await test("vremeBursa: VIX >= 30 -> FRICA; Nasdaq pe coborare -> SCADE; fara date -> fara-date (nu inventeaza)", () => {
  assert.equal(A.vremeBursa({ qqq: urca, vix: 32, ndx: A.largimeNdx(NDX) }).nivel, "frica");
  assert.equal(A.vremeBursa({ qqq: coboara, vix: 18, ndx: A.largimeNdx(NDX) }).nivel, "scade");
  assert.equal(A.vremeBursa({}).nivel, "fara-date");
  assert.equal(A.vremeBursa({ qqq: urca, vix: 15 }).nivel, "larga", "fara largime: judeca din indice");
});

// ---------------- corelatia BTC - Nasdaq ----------------
await test("corelatie: zilele comune, randamente zilnice, Pearson pe ultimele 30; text dupa prag; prea putine zile -> null", () => {
  const q = zile(60, (i) => 100 + 10 * Math.sin(i / 3)), b = q.map((x) => ({ ...x, c: x.c * 800 }));
  const r = A.corelatie(b, q, 30);
  assert.ok(r.r > 0.99); assert.equal(r.n, 30); assert.match(r.text, /urmează bursa/);
  const inv = A.corelatie(q.map((x, i) => ({ ...x, c: 20000 - x.c * 100 })), q, 30); assert.ok(inv.r < -0.9); assert.match(inv.text, /invers/);
  const t = q.map((x, i) => ({ ...x, c: 100 + ((i * 37) % 11) })); assert.match(A.corelatie(t, q, 30).text, /drumul lui/);
  assert.equal(A.corelatie(b.slice(0, 5), q.slice(0, 5), 30), null);
  // weekend: BTC are si sambata/duminica, bursa nu -> doar zilele comune
  const bw = zile(90, (i) => 100 + i), qw = bw.filter((x, i) => i % 7 < 5);
  assert.ok(A.corelatie(bw, qw, 30).n <= 30);
});

// ---------------- calendarul saptamanii ----------------
const EV = (d, titlu, impact, tara) => ({ date: d, title: titlu, impact, country: tara || "USD", forecast: "3.1%", previous: "3.0%" });
await test("calendar: doar SUA, impact mare/mediu, doar ce urmeaza, in ordine; mare = ⚠️; sambata fara nimic -> spune cand apare cel nou", () => {
  const acum = Date.parse("2026-09-29T12:00:00Z");
  const l = [EV("2026-09-30T14:00:00-04:00", "FOMC Statement", "High"), EV("2026-09-28T08:30:00-04:00", "Trecut", "High"), EV("2026-10-01T08:30:00-04:00", "CPI m/m", "High"),
    EV("2026-09-30T10:00:00-04:00", "Pending Home Sales", "Medium"), EV("2026-09-30T10:00:00-04:00", "Mic", "Low"), EV("2026-09-30T09:00:00+01:00", "BoE", "High", "GBP")];
  const c = A.calendar(l, acum);
  assert.deepEqual(c.urmatoare.map((x) => x.titlu), ["Pending Home Sales", "FOMC Statement", "CPI m/m"]);
  assert.equal(c.urmatoare[1].mare, true); assert.equal(c.urmatoare[0].mare, false); assert.ok(c.urmatoare[1].t === Date.parse("2026-09-30T18:00:00Z"));
  assert.match(c.text, /2 evenimente mari/);
  const gol = A.calendar([EV("2026-09-24T08:30:00-04:00", "Trecut", "High")], Date.parse("2026-09-26T12:00:00Z"));
  assert.equal(gol.urmatoare.length, 0); assert.match(gol.text, /duminică seara/);
  assert.equal(A.calendar(null, acum).urmatoare.length, 0);
});

// ---------------- rutele noi ----------------
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
let ip = 0;
async function stiri(qs, fn) {
  globalThis.fetch = async (url) => { const r = fn(String(url)); return new Response(r.corp, { status: r.status || 200, headers: { "content-type": r.tip || "application/json" } }); };
  const m = await import(`../functions/api/stiri.js?t=${Date.now()}_${Math.random()}`);
  const res = await m.onRequestGet({ request: new Request("https://exemplu.test/api/stiri?" + qs, { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.93.0." + (++ip % 250) } }), env: ENV });
  return { status: res.status, corp: JSON.parse(await res.text()) };
}
await test("ruta calendar: calendarul saptamanii (faireconomy), campurile curatate, doar SUA mare/mediu", async () => {
  const r = await stiri("action=calendar", (u) => /faireconomy/.test(u) ? { corp: JSON.stringify([EV("2026-09-30T14:00:00-04:00", "FOMC <b>Statement</b>", "High"), EV("2026-09-30T10:00:00-04:00", "Mic", "Low"), EV("2026-09-30T09:00:00+01:00", "BoE", "High", "GBP")]) } : { status: 404, corp: "" });
  assert.equal(r.status, 200); assert.equal(r.corp.evenimente.length, 1);
  assert.equal(r.corp.evenimente[0].title, "FOMC Statement"); assert.equal(r.corp.evenimente[0].impact, "High");
});
await test("ruta bursa: stirile de piata CNBC, cele mai noi 3, titlu curatat, doar linkuri http(s)", async () => {
  const RSS = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Vechi]]></title><link>https://cnbc.com/1</link><pubDate>Thu, 24 Sep 2026 08:00:00 GMT</pubDate></item>
    <item><title><![CDATA[Fed &amp; yields]]></title><link>https://cnbc.com/2</link><pubDate>Fri, 25 Sep 2026 11:08:00 GMT</pubDate></item><item><title>Rau</title><link>javascript:alert(1)</link><pubDate>Fri, 25 Sep 2026 12:00:00 GMT</pubDate></item>
    <item><title>Mijloc</title><link>https://cnbc.com/3</link><pubDate>Fri, 25 Sep 2026 10:25:00 GMT</pubDate></item><item><title>Al patrulea</title><link>https://cnbc.com/4</link><pubDate>Wed, 23 Sep 2026 10:25:00 GMT</pubDate></item></channel></rss>`;
  const r = await stiri("action=bursa", (u) => /cnbc/.test(u) ? { tip: "application/rss+xml", corp: RSS } : { status: 404, corp: "" });
  assert.equal(r.status, 200); assert.deepEqual(r.corp.stiri.map((x) => x.titlu), ["Fed & yields", "Mijloc", "Vechi"]);
});
await test("ruta t212 ndx: colectorul trimite rezumatul Nasdaq 100 odata cu ideile; GET action=ndx il intoarce, curatat", async () => {
  const kv = new Map(), env = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const m = await import(`../functions/api/t212.js?t=${Date.now()}`);
  const h = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.93.1.1" };
  const corp = { zi: "2026-09-26", judecate: 201, trecute: 27, actiuni: [], ndx: [{ s: "MCHP", p: 71.2, ch: 5.4, ch5: 6, e50: true, e200: true, rsi: 60.3, mis: 2.1 }, { s: "<b>", ch: "x" }] };
  const p = await m.onRequestPost({ request: new Request("https://exemplu.test/api/t212?action=idei", { method: "POST", headers: h, body: JSON.stringify(corp) }), env });
  assert.equal(p.status, 200);
  const g = await m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?action=ndx", { headers: h }), env });
  const c = JSON.parse(await g.text());
  assert.equal(c.zi, "2026-09-26"); assert.equal(c.actiuni.length, 1); assert.deepEqual(c.actiuni[0], { s: "MCHP", p: 71.2, ch: 5.4, ch5: 6, e50: true, e200: true, rsi: 60.3, mis: 2.1 });
});

await test("tura de idei: pentru fiecare actiune din Nasdaq 100 (si doar pentru ele) pune rezumatul zilei in r.ndx", async () => {
  const { turaIdei } = await import("./lib/tura-idei.mjs");
  const b = zile(260, (i) => 100 * Math.pow(1.002, i));
  const Idei = { judecaActiune: () => ({ trece: false }), alegeActiuni: () => [] };
  const r = await turaIdei({ tickere: ["AAPL_US_EQ", "XYZ_US_EQ", "MSFT_US_EQ"], Idei, inchise: [], jurnal: () => {}, pauza: async () => {}, acum: T0, cereBare: async () => b, cereRezultate: async () => null,
    ndx: new Set(["AAPL", "MSFT"]), rezumat: A.rezumatActiune });
  assert.deepEqual(r.ndx.map((x) => x.s), ["AAPL", "MSFT"]); assert.equal(r.ndx[0].e50, true); assert.ok(typeof r.ndx[0].ch === "number");
  const fara = await turaIdei({ tickere: ["AAPL_US_EQ"], Idei, inchise: [], jurnal: () => {}, pauza: async () => {}, acum: T0, cereBare: async () => b, cereRezultate: async () => null });
  assert.deepEqual(fara.ndx, []);
});

console.log(`\nACASA_V93 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
