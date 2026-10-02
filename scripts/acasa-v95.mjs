// Probele v95 (26.09: "fa tot si publica"): semaforul T212 fara ziua pierduta in weekend, sectoarele Nasdaq,
// ziua ta (castig/pierdere fata de ieri), raportul de duminica, socoteala alertelor, dobanzi / dolar / aur / leu.
// Rulare: node scripts/acasa-v95.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

for (const f of ["grid-calcul.js", "acasa.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const G = globalThis.GridCalcul, A = globalThis.Acasa;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
const zi = (iso, c) => ({ time: Date.parse(iso), open: c, high: c, low: c, close: c });

// ---------------- C. semaforul T212: barele zilnice de bursa ----------------
await test("bareBursa: bara de AZI se scoate doar cat bursa e deschisa (e in formare); sambata / dupa inchidere ramane vinerea", () => {
  const r = [zi("2026-09-24T13:30:00Z", 1), zi("2026-09-25T13:30:00Z", 2)];
  assert.deepEqual(G.bareBursa(r, Date.parse("2026-09-26T12:00:00Z")).map((b) => b.c), [1, 2], "sambata a aruncat vinerea");
  assert.deepEqual(G.bareBursa(r, Date.parse("2026-09-25T21:30:00Z")).map((b) => b.c), [1, 2], "vineri dupa inchidere a aruncat vinerea");
  assert.deepEqual(G.bareBursa(r, Date.parse("2026-09-25T15:00:00Z")).map((b) => b.c), [1], "vineri 11:00 New York: bara de azi e in formare");
  assert.deepEqual(G.bareBursa(r, Date.parse("2026-09-28T15:00:00Z")).map((b) => b.c), [1, 2], "luni deschis, dar ultima bara e de vineri: ramane");
  assert.deepEqual(G.bareBursa(null, Date.now()), []);
});
await test("colectorul si pagina T212 nu mai judeca semaforul pe bare() zilnic", () => {
  const c = fs.readFileSync(new URL("./colector.mjs", import.meta.url), "utf8");
  assert.ok(!/action=preturi&interval=1d[^\n]*GridCalcul\.bare\(/.test(c), "colectorul inca foloseste bare() pe preturile zilnice");
});

// ---------------- 3. sectoarele Nasdaq ----------------
const X = (s, ch, ch5) => ({ s, ch, ch5, e50: true, e200: true, rsi: 55, mis: 1 });
await test("sectoare: fiecare actiune in sectorul ei, media pe zi si pe 5 zile, cate urca; ordonate dupa 5 zile; necunoscutele in 'Altele'", () => {
  const l = A.sectoare([X("NVDA", 2, 6), X("AMD", 4, 8), X("MSFT", -1, 1), X("ADBE", -3, -2), X("ISRG", 1, -4), X("ZZZZ", 5, 5)]);
  const cip = l.find((x) => x.nume === "Cipuri"); assert.equal(cip.n, 2); assert.equal(cip.ch, 3); assert.equal(cip.ch5, 7); assert.equal(cip.urca, 2);
  assert.equal(l[0].nume, "Cipuri"); assert.equal(l[l.length - 1].nume, "Sănătate");
  assert.ok(l.some((x) => x.nume === "Altele" && x.n === 1));
  assert.equal(A.SECTOR.GOOGL, "Internet & media"); assert.equal(A.SECTOR.TSLA, "Comerț & consum");
  assert.deepEqual(A.sectoare(null), []);
});

// ---------------- 1. ziua ta ----------------
await test("ziuaTa: boti si contul T212 fata de poza de ieri dimineata; fara poza -> null (nu inventeaza)", () => {
  const z = A.ziuaTa({ botiTotal: -7.75, t212Total: 29300 }, [{ zi: "2026-09-26", botiTotal: -5.5, t212Total: 29251 }], "2026-09-27");
  assert.equal(z.boti, -2.25); assert.equal(z.t212, 49); assert.equal(z.de, "2026-09-26");
  assert.equal(A.ziuaTa({ botiTotal: -7 }, [], "2026-09-27"), null);
  assert.equal(A.ziuaTa({ botiTotal: -7 }, [{ zi: "2026-09-27", botiTotal: -1 }], "2026-09-27"), null, "poza de azi nu e 'ieri'");
});

// ---------------- A. raportul de duminica ----------------
await test("raportSaptamana: crypto, Nasdaq, cine s-a miscat, portofoliul, ce vine (calendar + rezultate), ce as face; fara date -> tot iese, cu ce are", () => {
  const r = A.raportSaptamana({ btc7: 3.2, vreme: { eticheta: "🟡 AMESTECAT", faCe: "boti doar pe monedele linistite" }, qqq5: 3.19, vix: 14.87,
    vremeBursa: { eticheta: "🟡 URCARE ÎNGUSTĂ", faCe: "cumpar doar ce e pe trend" }, sus: [{ s: "MCHP", ch5: 9.1 }], jos: [{ s: "META", ch5: -4 }],
    botiTotal: -7.75, t212Ppl: -1447, calendar: [{ cand: "mie 21:00", titlu: "FOMC Statement", mare: true }], rezultate: [{ simbol: "APLD", data: "2026-10-08" }] });
  assert.match(r.titlu, /Săptămâna pieței/);
  for (const re of [/BTC \+3,2%/, /Nasdaq \+3,2%/, /VIX 14,9/, /MCHP \+9,1%/, /META −4,0%/, /−7,75 USDT/, /−1\.447 lei/, /FOMC Statement/, /APLD/, /\n👉 (Crypto|Bursă|N-aș|Aș) /]) assert.match(r.mesaj, re);   /* v100.72: acțiunile pe rânduri „👉 ” */
  const gol = A.raportSaptamana({}); assert.match(gol.titlu, /Săptămâna pieței/); assert.ok(!/NaN|undefined|null/.test(gol.mesaj), gol.mesaj);
});

// ---------------- B. socoteala alertelor ----------------
await test("socotealaAlerte: dupa 24 h / 3 zile, cate miscari neobisnuite au CONTINUAT in aceeasi directie si cu cat; vremea: cat s-a mai miscat BTC", () => {
  const l = [{ fel: "acțiune", dir: "sus", pret: 100, p1: 104, p3: 110 }, { fel: "acțiune", dir: "sus", pret: 100, p1: 97, p3: 95 }, { fel: "monedă", dir: "jos", pret: 30, p1: 28.5 },
    { fel: "vreme", pret: 84000, p1: 88200 }, { fel: "acțiune", dir: "sus", pret: 50 }];
  const s = A.socotealaAlerte(l);
  assert.equal(s.n, 5); assert.equal(s.n1, 3); assert.equal(s.continua1, 2); assert.equal(s.n3, 2); assert.equal(s.continua3, 1);
  assert.match(s.text, /2 din 3/); assert.match(s.textVreme, /5,0%/);
  assert.match(A.socotealaAlerte([]).text, /Nicio alertă/);
});

// ---------------- 2/4/6. ruta piata: dobanzi, dolar, aur, leu ----------------
const TOKEN = "proba-token-1234567890", ENV = { APP_API_TOKEN: TOKEN };
await test("ruta piata: pe langa QQQ/SPY/VIX aduce si dobanda pe 10 ani (^TNX), dolarul (DX-Y.NYB), aurul (GC=F), dolar/leu (RON=X); o sursa picata -> null", async () => {
  const cerute = [];
  const chart = (c) => JSON.stringify({ chart: { result: [{ timestamp: [1790000000, 1790086400], indicators: { quote: [{ open: [c, c], high: [c, c], low: [c, c], close: [c, c], volume: [1, 1] }] } }] } });
  globalThis.fetch = async (url) => { const u = String(url); cerute.push(u); if (/GC%3DF/.test(u)) return new Response("", { status: 500 }); if (/alternative/.test(u)) return new Response(JSON.stringify({ data: [{ value: "70" }] })); return new Response(chart(4.2)); };
  const m = await import(`../functions/api/stiri.js?t=${Date.now()}`);
  const res = await m.onRequestGet({ request: new Request("https://exemplu.test/api/stiri?action=piata", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.95.0.1" } }), env: ENV });
  const c = JSON.parse(await res.text());
  assert.equal(c.tnx.length, 2); assert.equal(c.dxy.length, 2); assert.equal(c.usdron.length, 2); assert.strictEqual(c.aur, null);
  for (const s of ["%5ETNX", "DX-Y.NYB", "GC%3DF", "RON%3DX"]) assert.ok(cerute.some((u) => u.includes(s)), "n-a cerut " + s);
});

console.log(`\nACASA_V95 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
