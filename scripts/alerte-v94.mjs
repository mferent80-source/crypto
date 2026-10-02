// Probele v94 (26.09: "fa toate, plus funding si alerte pentru fiecare coin sau actiune din portofoliu cand se
// misca" - pragul ales de el: MISCARE NEOBISNUITA = peste 2x miscarea obisnuita a fiecareia si minim 3%).
// Rulare: node scripts/alerte-v94.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

for (const f of ["alerte.js", "acasa.js"]) vm.runInThisContext(fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8"));
const Al = globalThis.Alerte, A = globalThis.Acasa;
let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); }
}
const T0 = Date.UTC(2026, 8, 28, 14, 0), MIN = 60000, ORA = 3600000;

// ---------------- miscarea obisnuita ----------------
await test("miscareTipica: percentila 75 a miscarilor pe k bare (actiuni: zilnic k=1; crypto: 24 de bare de 1 ora); prea putine -> null", () => {
  const c = Array.from({ length: 121 }, (_, i) => 100 * (1 + (i % 2 ? 0.01 : -0.01)));
  const t = A.miscareTipica(c, 1); assert.ok(t > 1.9 && t < 2.1, "±1% alternativ -> ~2% de la o zi la alta: " + t);
  assert.equal(A.miscareTipica([1, 2, 3], 1), null); assert.equal(A.miscareTipica(null, 1), null);
});

// ---------------- alerta pe portofoliu: miscare neobisnuita ----------------
const M = (o) => ({ cheie: "APLD", nume: "APLD", fel: "acțiune", ch: 0, tipic: 3.7, pret: 30, ...o });
await test("neobisnuit: peste 2x obisnuitul SI minim 3% -> alerta cu directia, cat e fata de obisnuit si pretul; sub prag -> nimic", () => {
  assert.equal(Al.miscareNeobisnuita(M({ ch: 6 }), null, T0).mesaj, null, "APLD +6% e sub 2x3,7%");
  const r = Al.miscareNeobisnuita(M({ ch: 8.1 }), null, T0);
  assert.ok(r.mesaj); assert.match(r.mesaj.titlu, /APLD/); assert.match(r.mesaj.titlu, /\+8,1%/); assert.match(r.mesaj.titlu, /urcă/);
  assert.match(r.mesaj.mesaj, /2,2× mișcarea ei obișnuită/);
  assert.equal(Al.miscareNeobisnuita(M({ nume: "NWSA", cheie: "NWSA", ch: -2.8, tipic: 1.2 }), null, T0).mesaj, null, "sub 3% nu suna nici la o actiune linistita");
  assert.match(Al.miscareNeobisnuita(M({ nume: "NWSA", cheie: "NWSA", ch: -3.4, tipic: 1.2 }), null, T0).mesaj.titlu, /scade/);
});
await test("neobisnuit: o data pe zi pe fiecare directie; din nou doar daca miscarea s-a DUBLAT; a doua zi de la capat", () => {
  let r = Al.miscareNeobisnuita(M({ ch: 8 }), null, T0);
  r = Al.miscareNeobisnuita(M({ ch: 9 }), r.stare, T0 + ORA); assert.equal(r.mesaj, null, "s-a repetat in aceeasi zi");
  r = Al.miscareNeobisnuita(M({ ch: 16.5 }), r.stare, T0 + 2 * ORA); assert.ok(r.mesaj, "nu a anuntat dublarea"); assert.match(r.mesaj.titlu, /\+16,5%/);
  r = Al.miscareNeobisnuita(M({ ch: -9 }), r.stare, T0 + 3 * ORA); assert.ok(r.mesaj, "cealalta directie e alt anunt");
  r = Al.miscareNeobisnuita(M({ ch: 8 }), r.stare, T0 + 24 * ORA); assert.ok(r.mesaj, "a doua zi nu a mai anuntat");
});
await test("neobisnuit: date lipsa (ch/tipic null, NaN) -> nimic si fara sa strice starea", () => {
  const r0 = Al.miscareNeobisnuita(M({ ch: 8 }), null, T0);
  const r = Al.miscareNeobisnuita(M({ ch: NaN }), r0.stare, T0 + ORA); assert.equal(r.mesaj, null); assert.deepEqual(r.stare, r0.stare);
  assert.equal(Al.miscareNeobisnuita(M({ ch: 8, tipic: null }), null, T0).mesaj.titlu.includes("APLD"), true, "fara obisnuit: pragul ramane 3%");
});

// ---------------- alerta cand se schimba vremea pietei ----------------
const V = (nc, nb, r) => ({ crypto: { nivel: nc, eticheta: nc === "miscare" ? "🔴 MIȘCARE" : "🟡 AMESTECAT", titlu: "t", faCe: "fac ceva" }, bursa: { nivel: nb, eticheta: nb === "frica" ? "🔴 FRICĂ PE BURSĂ" : "🟡 URCARE ÎNGUSTĂ", titlu: "tb", faCe: "fac b" }, corelatie: r == null ? null : { r } });
await test("vremea: prima citire doar tine minte; schimbarea se anunta abia cand se confirma de 2 ori la rand (fara palpaieli)", () => {
  let r = Al.schimbareVreme(null, V("amestecat", "ingusta", 0.4), T0); assert.deepEqual(r.mesaje, []);
  r = Al.schimbareVreme(r.stare, V("miscare", "ingusta", 0.4), T0 + 10 * MIN); assert.deepEqual(r.mesaje, [], "a anuntat de la prima citire");
  r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.4), T0 + 20 * MIN); assert.deepEqual(r.mesaje, [], "palpaiala");
  r = Al.schimbareVreme(r.stare, V("miscare", "ingusta", 0.4), T0 + 30 * MIN);
  r = Al.schimbareVreme(r.stare, V("miscare", "ingusta", 0.4), T0 + 40 * MIN);
  assert.equal(r.mesaje.length, 1); assert.match(r.mesaje[0].titlu, /Crypto/); assert.match(r.mesaje[0].titlu, /MIȘCARE/); assert.match(r.mesaje[0].mesaj, /\n👉 fac ceva/i); assert.equal(r.mesaje[0].nivel, "critic");   /* v100.68: acțiunea pe rândul „👉” */
  r = Al.schimbareVreme(r.stare, V("miscare", "ingusta", 0.4), T0 + 50 * MIN); assert.deepEqual(r.mesaje, [], "a repetat");
});
await test("vremea: bursa in FRICA -> critic; revenirea -> info; BTC incepe sa urmeze bursa (r >= 0,5) / nu mai urmeaza (< 0,3) -> info", () => {
  let r = Al.schimbareVreme(null, V("amestecat", "ingusta", 0.4), T0);
  r = Al.schimbareVreme(r.stare, V("amestecat", "frica", 0.4), T0 + 10 * MIN); r = Al.schimbareVreme(r.stare, V("amestecat", "frica", 0.4), T0 + 20 * MIN);
  assert.equal(r.mesaje[0].nivel, "critic"); assert.match(r.mesaje[0].titlu, /Nasdaq/);
  r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.4), T0 + 30 * MIN); r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.4), T0 + 40 * MIN);
  assert.equal(r.mesaje[0].nivel, "info");
  r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.62), T0 + 50 * MIN); r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.63), T0 + 60 * MIN);
  assert.match(r.mesaje[0].titlu, /BTC urmează bursa/);
  r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.45), T0 + 70 * MIN); r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.45), T0 + 80 * MIN);
  assert.deepEqual(r.mesaje, [], "intre 0,3 si 0,5 nu se schimba nimic (histerezis)");
  r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.2), T0 + 90 * MIN); r = Al.schimbareVreme(r.stare, V("amestecat", "ingusta", 0.2), T0 + 100 * MIN);
  assert.match(r.mesaje[0].titlu, /pe drumul lui/);
});
await test("vremea: 'fara-date' nu e o schimbare (serverul n-a raspuns) - starea ramane", () => {
  let r = Al.schimbareVreme(null, V("amestecat", "ingusta", 0.4), T0);
  r = Al.schimbareVreme(r.stare, V("fara-date", "fara-date", null), T0 + 10 * MIN); r = Al.schimbareVreme(r.stare, V("fara-date", "fara-date", null), T0 + 20 * MIN);
  assert.deepEqual(r.mesaje, []); assert.equal(r.stare.crypto.nivel, "amestecat");
});

// ---------------- funding pe toata piata ----------------
const F = (s, rate, uzual) => ({ s, rate, hist: Array(90).fill(uzual == null ? 0.00005 : uzual) });
await test("fundingPiata: mediana, cati platesc long, fata de obisnuit, cei mai inghesuiti; text si ton", () => {
  const f = A.fundingPiata([F("BTC", 0.0001), F("ETH", 0.00008), F("SOL", 0.0006), F("XRP", 0.00005), F("DOGE", -0.0001)]);
  assert.equal(f.n, 5); assert.equal(f.long, 4); assert.ok(Math.abs(f.mediana - 0.00008) < 1e-12);
  assert.equal(f.inghesuiti[0].s, "SOL"); assert.match(f.text, /4 din 5/); assert.equal(f.ton, "neutru");
  const mult = A.fundingPiata(Array.from({ length: 10 }, (_, i) => F("C" + i, 0.0004)));
  assert.equal(mult.ton, "atentie"); assert.match(mult.text, /8× față de obicei/);
  assert.equal(A.fundingPiata([]), null);
});

// ---------------- ce s-a schimbat de ieri ----------------
await test("schimbari: fata de poza de ieri - sageata si diferenta pe fiecare cifra; fara ieri -> nimic", () => {
  const s = A.schimbari({ zi: "2026-09-28", fg: 74, inMiscare: 38, vix: 14.87, ndxE50: 49 }, [{ zi: "2026-09-26", fg: 70 }, { zi: "2026-09-27", fg: 71, inMiscare: 30, vix: 15.67, ndxE50: 49 }]);
  assert.deepEqual(s.fg, { d: 3, sag: "↑", de: 71 }); assert.equal(s.inMiscare.sag, "↑"); assert.equal(s.vix.sag, "↓"); assert.equal(s.ndxE50.sag, "=");
  assert.deepEqual(A.schimbari({ zi: "2026-09-28", fg: 74 }, []), {});
  assert.deepEqual(A.schimbari({ zi: "2026-09-28", fg: 74 }, [{ zi: "2026-09-28", fg: 70 }]), {}, "poza de azi nu e 'ieri'");
});

// ---------------- rutele ----------------
const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
const H = { authorization: "Bearer " + TOKEN, "content-type": "application/json", origin: "https://exemplu.test", "cf-connecting-ip": "10.94.0.1" };
await test("ruta piata (istoric-bot): funding-ul pe piata + poza zilnica (una pe zi, ultimele 14); GET le intoarce curatate", async () => {
  const m = await import(`../functions/api/istoric-bot.js?t=${Date.now()}`);
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=piata", { method: "POST", headers: H, body: JSON.stringify(corp) }), env: ENV });
  assert.equal((await post({ la: T0, funding: { n: 30, long: 24, mediana: 0.00006, raport: 1.2, ton: "neutru", text: "x", inghesuiti: [{ s: "SOL", rate: 0.0006 }] }, instantaneu: { zi: "2026-09-27", fg: 71, inMiscare: 30, vix: 15.67, ndxE50: 49 } })).status, 200);
  await post({ la: T0, instantaneu: { zi: "2026-09-28", fg: 74, inMiscare: 38, vix: 14.87, ndxE50: 49, rau: "<b>" } });
  await post({ la: T0, instantaneu: { zi: "2026-09-28", fg: 75 } });
  const g = JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=piata", { headers: H }), env: ENV })).text());
  assert.equal(g.funding.long, 24); assert.equal(g.funding.inghesuiti[0].s, "SOL");
  assert.deepEqual(g.instantanee.map((x) => x.zi), ["2026-09-27", "2026-09-28"]); assert.equal(g.instantanee[1].fg, 75, "aceeasi zi: se inlocuieste"); assert.equal(g.instantanee[1].rau, undefined);
});
await test("ruta t212 ndx POST: colectorul trimite rezumatul Nasdaq si in timpul bursei (fara idei)", async () => {
  const m = await import(`../functions/api/t212.js?t=${Date.now()}`);
  const p = await m.onRequestPost({ request: new Request("https://exemplu.test/api/t212?action=ndx", { method: "POST", headers: H, body: JSON.stringify({ la: T0, zi: "2026-09-28", ndx: [{ s: "MCHP", p: 71, ch: 1.2, ch5: 2, e50: true, e200: true, rsi: 55, mis: 0.5 }] }) }), env: ENV });
  assert.equal(p.status, 200);
  const g = JSON.parse(await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/t212?action=ndx", { headers: H }), env: ENV })).text());
  assert.equal(g.actiuni[0].s, "MCHP"); assert.equal(g.la, T0);
});

console.log(`\nALERTE_V94 ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
