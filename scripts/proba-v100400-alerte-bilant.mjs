// Proba v100.400 (28.11.2026, el după livrarea v100.399: „mai departe?” ⇒ „fa tot”; ideile I-979 și I-980):
//   A. botul de SEMNAL care rulează FĂRĂ Stop Loss în Pionex se anunță (I-979): câmpurile noi din normalizare (`stopRaport`, `tintaRaport`, din
//      `portfolio[0].lossStopRatio` / `profitStopRatio`: „0” = nepus, lipsă = nu se știe ⇒ nu se anunță), alerta din paza botului (după 10 minute
//      de la pornire, apoi din nou la 24 h cât rămâne fără; stopul pus ⇒ gata), noaptea așteaptă rezumatul de dimineață;
//   C. verdictul din „Bilanțul alertelor” pleacă pe Discord O DATĂ (I-980): mesajele pe zi (prima dată + la schimbare, cel mult o dată la 7 zile),
//      verdictul înghețat „după aprindere” (1 h, 4 h), „peste Binance” (a apărut / n-a apărut în 14 zile). Nu intră la plafonul alertelor și nici
//      la „mesaje pe zi”; alerta netrimisă se reia la tura următoare; o regulă nouă pornește de la zero.
// (Al treilea lucru cerut, verificatorul orar - „alertă creată în mijlocul unei poziții” - e în pine-scripts\PIONEX-COMBO, cu testele lui.)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const plain = (o) => JSON.parse(JSON.stringify(o));
const M5 = 300000, ORA = 3600000, ZI = 86400000, ACUM = Date.UTC(2026, 10, 28, 8, 2, 30), ZI1 = "2026-11-28";
const A = new Function(citeste("public", "lib", "agitate.js") + "; return Agitate;")();
const BS = new Function(citeste("public", "lib", "bot-semnal.js") + "; return BotSemnal;")();
const POL = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "politica-alerte.mjs")).href);
const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-agitate.mjs")).href);
const ziDin = (k) => new Date(ACUM - k * ZI).toISOString().slice(0, 10);

// ── A. botul de semnal fără Stop Loss ──
const brut = (p) => ({ buOrderType: "smart_copy", status: "open", createTime: ACUM - 2 * ORA, strategyId: 2726, base: "-", quote: "USDT",
  buOrderData: { status: "main_loop", quoteTotalInvestment: "242.76", currentQuoteAmount: "242.76", profit: "0", portfolio: [Object.assign({ tradeBase: "WLFI.PERP", leverage: "1", qtyLong: "0", qtyShort: "0" }, p)] } });
await test("A1. normalizarea botului de semnal ține stopul și ținta din Pionex ca raport (câmpuri noi): „0” = nepus, lipsă = nu se știe; câmpurile de grid rămân cum erau", async () => {
  const { normalizeaza } = await import("../functions/api/bot-orders.js");
  let b = normalizeaza(brut({ lossStopRatio: "0", profitStopRatio: "0.01" }), {}, null);
  assert.equal(b.tip, "semnal"); assert.equal(b.stopRaport, 0); assert.equal(b.tintaRaport, 0.01); assert.equal(b.ruleaza, true); assert.equal(b.pornitLa, ACUM - 2 * ORA);
  assert.equal(b.opritorPierdereActiv, false); assert.equal(b.opritorPierdere, null); assert.deepEqual(b.avertismente, [], "ce citesc paginile de grid nu s-a schimbat");
  b = normalizeaza(brut({ lossStopRatio: "-0.15", profitStopRatio: "0" }), {}, null); assert.equal(b.stopRaport, -0.15); assert.equal(b.tintaRaport, 0);
  b = normalizeaza(brut({}), {}, null); assert.equal(b.stopRaport, null, "Pionex nu l-a dat: nu se știe (nu „nepus”)"); assert.equal(b.tintaRaport, null);
  b = normalizeaza(brut({ lossStopRatio: "x", profitStopRatio: "" }), {}, null); assert.equal(b.stopRaport, null); assert.equal(b.tintaRaport, null);
});
const sem = (o) => Object.assign({ tip: "semnal", id: "2726", baza: "WLFI.PERP", ruleaza: true, directie: null, pozitie: 0, pozitieBani: null, pretCurent: 0.0192, levier: 1, investit: 242.76, profitTotal: 0, pornitLa: ACUM - 2 * ORA, stopRaport: 0, tintaRaport: 0.01 }, o);
const fs_ = (r) => r.alerte.filter((a) => /^farastop-semnal-/.test(a.cheie));
await test("A2. paza: botul care rulează de peste 10 minute fără Stop Loss dă O alertă (faptul, apoi „👉”), cu ținta dacă o are; sub 10 minute, cu stopul pus sau neștiut ⇒ nimic", () => {
  let r = BS.paza(sem(), null, ACUM); const a = fs_(r); assert.equal(a.length, 1);
  assert.equal(a[0].nivel, "atentie"); assert.equal(a[0].cheie, "farastop-semnal-2726"); assert.equal(a[0].titlu, "WLFI semnal: fără Stop Loss în Pionex"); assert.ok(a[0].titlu.length <= 60);
  assert.equal(a[0].mesaj, "Botul rulează de 2 ore fără Stop Loss (are doar ținta de +1,0%). Regula ta de oprire e −15% din suma pusă.\n👉 Aș pune Stop Loss în botul din Pionex. Până atunci te anunț la −10% și la −15%, dar nu-l oprește nimeni.");
  assert.equal(fs_(BS.paza(sem({ tintaRaport: 0 }), null, ACUM))[0].mesaj.split("\n")[0], "Botul rulează de 2 ore fără Stop Loss. Regula ta de oprire e −15% din suma pusă.");
  assert.equal(fs_(BS.paza(sem({ tintaRaport: null }), null, ACUM))[0].mesaj.split("\n")[0], "Botul rulează de 2 ore fără Stop Loss. Regula ta de oprire e −15% din suma pusă.");
  assert.equal(fs_(BS.paza(sem({ pornitLa: ACUM - 9 * 60000 }), null, ACUM)).length, 0, "abia pornit: îi las 10 minute să-l pună"); assert.equal(fs_(BS.paza(sem({ pornitLa: ACUM - 10 * 60000 }), null, ACUM)).length, 1);
  assert.equal(fs_(BS.paza(sem({ pornitLa: null }), null, ACUM)).length, 1, "fără ora pornirii nu aștept");
  assert.equal(fs_(BS.paza(sem({ stopRaport: -0.15 }), null, ACUM)).length, 0); assert.equal(fs_(BS.paza(sem({ stopRaport: null }), null, ACUM)).length, 0, "nu se știe ≠ nepus"); assert.equal(fs_(BS.paza(sem({ stopRaport: undefined }), null, ACUM)).length, 0);
  assert.equal(fs_(BS.paza(sem({ ruleaza: false }), null, ACUM)).length, 0); assert.equal(fs_(BS.paza(sem({ tip: "grid" }), null, ACUM)).length, 0);
  assert.equal(fs_(BS.paza(sem({ directie: "short", pozitie: -1000, pozitieBani: 19.2 }), null, ACUM)).length, 1, "și cu poziția deschisă");
});
await test("A3. o singură dată, apoi din nou la 24 h cât rămâne fără; stopul pus oprește amintirea, iar scos din nou se anunță iar; celelalte paze merg ca înainte", () => {
  let r = BS.paza(sem(), null, ACUM); assert.equal(fs_(r).length, 1); assert.equal(r.st.faraStopLa, ACUM);
  r = BS.paza(sem(), r.st, ACUM + 60000); assert.equal(fs_(r).length, 0); r = BS.paza(sem(), r.st, ACUM + 23 * ORA); assert.equal(fs_(r).length, 0, "sub 24 h tace");
  /* revizia: la 24 h FIX politica de repetare a casei (aceeași cheie sub 24 h ⇒ doar în Radar) ar ține amintirea departe de telefon ⇒ la 25 h */
  r = BS.paza(sem(), r.st, ACUM + 24 * ORA); assert.equal(fs_(r).length, 0, "la 24 h încă tace");
  r = BS.paza(sem(), r.st, ACUM + 25 * ORA); assert.equal(fs_(r).length, 1, "a doua zi îl amintește"); assert.match(fs_(r)[0].mesaj, /^Botul rulează de 27 de ore fără Stop Loss/); assert.equal(r.st.faraStopLa, ACUM + 25 * ORA);
  const m0 = fs_(BS.paza(sem(), null, ACUM))[0], sr = {}; assert.equal(POL.repetare(sr, m0, m0.cheie, "2726", ACUM + 5000), false);
  assert.equal(POL.repetare(sr, m0, m0.cheie, "2726", ACUM + 24 * ORA + 3000), true, "de ce nu 24 h: la 24 h și 3 secunde ar fi stat doar în Radar"); assert.equal(POL.repetare(sr, m0, m0.cheie, "2726", ACUM + 25 * ORA + 6000), false, "la 25 h ajunge pe telefon");
  r = BS.paza(sem({ stopRaport: -0.1 }), r.st, ACUM + 26 * ORA); assert.equal(fs_(r).length, 0); assert.ok(!r.st.faraStopLa, "stopul pus: gata");
  r = BS.paza(sem(), r.st, ACUM + 27 * ORA); assert.equal(fs_(r).length, 1, "scos din nou ⇒ se anunță pe loc");
  r = BS.paza(sem({ stopRaport: null }), r.st, ACUM + 28 * ORA); assert.equal(fs_(r).length, 0); assert.equal(r.st.faraStopLa, ACUM + 27 * ORA, "o citire fără câmp nu șterge ce se știa");
  r = BS.paza(sem({ stopRaport: 0.15 }), r.st, ACUM + 29 * ORA); assert.equal(fs_(r).length, 0); assert.ok(!r.st.faraStopLa, "orice valoare diferită de zero = stop pus (și dacă Pionex l-ar da cu plus)");
  /* paza de pierdere (−10% / −15%) nu s-a schimbat: același bot la −16% dă tot alerta ei, pe lângă cea de stop */
  r = BS.paza(sem({ profitTotal: -40 }), null, ACUM); assert.equal(r.alerte.filter((x) => /^pierdere-semnal-/.test(x.cheie)).length, 1); assert.equal(fs_(r).length, 1);
});
await test("A4. noaptea (23–07) amintirea așteaptă rezumatul de dimineață, cu numele ei; ziua pleacă pe loc; colectorul trimite tot ce dă paza", () => {
  const m = fs_(BS.paza(sem(), null, ACUM))[0], noaptea = Date.UTC(2026, 10, 28, 1, 0), ziua = Date.UTC(2026, 10, 28, 10, 0);
  let r = POL.politicaNoapte(m, m.cheie, noaptea); assert.equal(r.doarRadar, true); assert.equal(r.noapte, true); assert.ok(!POL.politicaNoapte(m, m.cheie, ziua).doarRadar);
  assert.match(citeste("scripts", "lib", "politica-alerte.mjs"), /\[\/\^farastop-semnal-\/, "farastop"\]/); assert.match(citeste("scripts", "lib", "politica-alerte.mjs"), /farastop: \["bot de semnal fără Stop Loss", "boți de semnal fără Stop Loss"\]/);
  assert.match(citeste("scripts", "colector.mjs"), /for \(const a of pz\.alerte\) \{ let okA = false; try \{ okA = await trimiteAlerta\(a, b\.id, a\.cheie\); \}/);
});

// ── C. verdictul bilanțului pe Discord ──
const tick = (b, c) => ({ symbol: b + "_USDT_PERP", time: ACUM, open: "100", high: "104", low: "100", close: String(c), volume: "1", amount: "2000000", count: 10 });
const bare = (slot) => Array.from({ length: 120 }, (_, i) => ({ time: slot - i * M5, open: "100", high: "101", low: "100", close: "100" }));
function lume(o = {}) {
  const L = { t: o.t || ACUM, monede: ["AAA", "BBB", "CCC"], alerte: [], trimise: [], jurnal: [], disc: {}, st: {}, alertaPica: false };
  const harta = () => { const h = L.monede.map((s, i) => ({ simbol: s, rang: i + 1, nume: s })); while (h.length < 150) h.push({ simbol: "Z" + h.length, rang: h.length + 1, nume: "z" }); return h; };
  L.d = () => ({ acum: L.t, Agitate: A, TextRo: globalThis.TextRo, eCrypto: () => true, pauza: async () => {}, jurnal: (...a) => L.jurnal.push(a.join(" ")), asteapta: () => new Promise(() => {}),
    cere: async (cale) => { const tip = new URL(cale, "http://radar").searchParams.get("type");
      if (tip === "top_cap") return { result: true, monede: harta() }; if (tip === "pionex_tickers") return { result: true, timestamp: L.t, data: { tickers: L.monede.map((s) => tick(s, 100)) } };
      return { result: true, data: { klines: bare(Math.floor(L.t / M5) * M5) } }; },
    trimite: async (cale, corp) => { L.trimise.push(plain(corp)); return { ok: true }; },
    trimiteAlerta: async (m, bot, cheie) => { if (L.alertaPica === "arunca") throw new Error("Discord"); if (L.alertaPica) return false; L.alerte.push({ m: plain(m), bot, cheie }); return true; },
    citesteDisc: () => plain(L.disc), scrieDisc: (x) => { L.disc = plain(x); } });
  L.tura = async (ms) => { L.t += ms == null ? 60000 : ms; return T.turaAgitate(L.d(), L.st); };
  L.bl = () => L.alerte.filter((a) => /^agitate-bilant:/.test(a.cheie)); L.corp = () => L.trimise[L.trimise.length - 1];
  return L;
}
const RK = A.regulaAcum([T.REGULA.maxZi, T.REGULA.candidat, T.REGULA.asteptareMs / ORA, T.REGULA.linisteMs / 60000].join("/"));
const GOL = { r: RK, ms: 0, m: 0, p: 0, a: 0, ap: 0, opr: 0, bc: 0, bp: [], cd: 0, fd: 0, x: 0, h1: [0, 0, 0, 0], h4: [0, 0, 0, 0] };
const zile = (n, f) => { const j = {}; for (let k = 1; k <= n; k++) j[ziDin(k)] = Object.assign({}, GOL, { ms: 24 * ORA }, f(k)); return j; };
await test("C1. mesajele pe zi: primul verdict (după 7 zile întregi) pleacă O DATĂ, cu media și ținta; fără verdict nu pleacă nimic", async () => {
  const N = lume(); N.disc = { jurnal: zile(6, () => ({ m: 3 })) }; await N.tura(0); await N.tura(); assert.equal(N.bl().length, 0, "6 zile: încă fără verdict");
  const L = lume(); L.disc = { jurnal: zile(7, () => ({ m: 3 })) }; await L.tura(0);
  assert.equal(L.bl().length, 1); const a = L.bl()[0]; assert.equal(a.cheie, "agitate-bilant:mesaje"); assert.equal(a.bot, null); assert.equal(a.m.nivel, "info");
  assert.equal(a.m.titlu, "📊 Agitate: mesajele țin ținta"); assert.ok(a.m.titlu.length <= 60);
  assert.equal(a.m.mesaj, "În ultimele 7 zile întregi au plecat în medie 3,0 mesaje pe zi; ținta e cel mult 5. Pragul rămâne cum e.\nNumărătoarea e în Radar, pe pagina „Agitate acum”, la Bilanțul alertelor.");
  assert.equal(L.disc.anuntat.mesaje, "tine"); assert.equal(L.disc.anuntat.mesajeLa, L.t); assert.equal(L.disc.anuntat.r, RK);
  for (let k = 0; k < 5; k++) await L.tura(); assert.equal(L.bl().length, 1, "același verdict nu se repetă");
  L.disc.anuntat.mesajeLa = L.t - 8 * ZI; await L.tura(); assert.equal(L.bl().length, 1, "nici după cele 7 zile: doar un verdict SCHIMBAT se mai anunță");
  const P = lume(); P.disc = { jurnal: zile(7, (k) => ({ m: 7, p: k === 2 ? 1 : 0, opr: k === 3 ? 2 : 0 })) }; await P.tura(0);
  assert.equal(P.bl()[0].m.titlu, "📊 Agitate: mesajele sunt peste țintă"); assert.match(P.bl()[0].m.mesaj, /^În ultimele 7 zile întregi au plecat în medie 7,1 mesaje pe zi; ținta e cel mult 5; plafonul a oprit 2 mesaje\. Pragul nu se schimbă singur: hotărăști tu\.\n/);
});
await test("C2. verdictul se schimbă (ține ⇒ peste): se anunță, dar cel mult o dată la 7 zile - o medie care joacă în jurul țintei nu dă un mesaj pe zi", async () => {
  const L = lume(); L.disc = { jurnal: zile(7, () => ({ m: 3 })) }; await L.tura(0); assert.equal(L.bl().length, 1);
  for (const k of Object.keys(L.disc.jurnal)) if (k !== ZI1) L.disc.jurnal[k].m = 9;
  await L.tura(); assert.equal(L.corp().bilant.mesaje.verdict, "peste"); assert.equal(L.bl().length, 1, "schimbat a doua zi: încă tace"); assert.equal(L.disc.anuntat.mesaje, "tine");
  L.disc.anuntat.mesajeLa = L.t - 7 * ZI; await L.tura(); assert.equal(L.bl().length, 2); assert.equal(L.bl()[1].m.titlu, "📊 Agitate: mesajele sunt peste țintă"); assert.equal(L.disc.anuntat.mesaje, "peste");
});
await test("C3. verdictul înghețat „după aprindere” pleacă o dată pe orizont, cu dovada lângă el (câte cazuri, din câte zile) și cu „nu e probă de strategie”", async () => {
  const L = lume(); L.disc = { jurnal: zile(30, (k) => ({ cd: 6, h1: k % 2 ? [1, 4, 0, -3] : [2, 4, 1, -2], h4: k % 2 ? [3, 2, 0, 0.1] : [2, 3, 0, -0.1] })) }; await L.tura(0);
  const h1 = L.bl().find((a) => a.cheie === "agitate-bilant:h1"), h4 = L.bl().find((a) => a.cheie === "agitate-bilant:h4"); assert.ok(h1 && h4);
  assert.equal(h1.m.titlu, "📊 Agitate: verdict la 1 h după aprindere"); assert.ok(h1.m.titlu.length <= 60);
  assert.equal(h1.m.mesaj, "Pe 165 de cazuri din 30 de zile: se întorc mai des decât continuă (120 față de 45).\nJudecat o singură dată, pe zile. Nu e probă de strategie: fără costuri, fără intrări.");
  assert.equal(h4.m.titlu, "📊 Agitate: verdict la 4 h după aprindere"); assert.match(h4.m.mesaj, /^Pe 150 de cazuri din 30 de zile: nicio înclinare dovedită \(75 întoarse, 75 continuate\): aprinderea nu spune direcția\.\n/);
  assert.deepEqual([L.disc.anuntat.h1, L.disc.anuntat.h4], [true, true]); const n = L.bl().length; for (let k = 0; k < 4; k++) await L.tura(); assert.equal(L.bl().length, n, "niciodată a doua oară");
  const C = lume(); C.disc = { jurnal: zile(30, (k) => ({ cd: 6, h1: k % 2 ? [4, 1, 0, 3] : [4, 2, 1, 2] })) }; await C.tura(0);
  assert.match(C.bl().find((a) => a.cheie === "agitate-bilant:h1").m.mesaj, /^Pe 165 de cazuri din 30 de zile: continuă mai des decât se întorc \(120 față de 45\)\./);
});
await test("C4. „peste Binance”: prima apariție se anunță o dată, cu monedele; 14 zile urmărite fără niciuna ⇒ „poate fi scos”, o dată", async () => {
  const L = lume(); L.disc = { jurnal: zile(3, (k) => ({ bc: 96, bp: k === 2 ? ["WLFI", "FF"] : [] })) }; await L.tura(0);
  let a = L.bl().filter((x) => x.cheie === "agitate-bilant:binance"); assert.equal(a.length, 1); assert.equal(a[0].m.titlu, "📊 Agitate: „peste Binance” a apărut");
  assert.equal(a[0].m.mesaj, "Semnul a apărut la 2 monede (FF, WLFI): rămâne pe pagină.\nPe Pionex mișcarea de 24 h a fost de cel puțin 1,5× cea de pe Binance Futures."); assert.equal(L.disc.anuntat.binance, "ramane");
  await L.tura(); assert.equal(L.bl().filter((x) => x.cheie === "agitate-bilant:binance").length, 1);
  const S = lume(); S.disc = { jurnal: zile(14, () => ({ bc: 96 })) }; await S.tura(0); a = S.bl().filter((x) => x.cheie === "agitate-bilant:binance"); assert.equal(a.length, 1);
  assert.equal(a[0].m.titlu, "📊 Agitate: „peste Binance” n-a apărut în 14 zile"); assert.ok(a[0].m.titlu.length <= 60); assert.match(a[0].m.mesaj, /^În 14 zile urmărite semnul n-a apărut la nicio monedă: poate fi scos de pe pagină\. Hotărârea e a ta\.\n/);
  const P = lume(); P.disc = { jurnal: zile(13, () => ({ bc: 96 })) }; await P.tura(0); assert.equal(P.bl().filter((x) => x.cheie === "agitate-bilant:binance").length, 0, "13 zile: fără verdict, fără mesaj");
});
await test("C5. mesajele de bilanț nu intră la plafonul alertelor și nici la „mesaje pe zi”; netrimise se reiau la tura următoare; o regulă nouă pornește de la zero; noaptea așteaptă", async () => {
  const L = lume(); L.disc = { jurnal: zile(14, () => ({ m: 3, bc: 96 })) }; L.alertaPica = true; await L.tura(0);
  assert.equal(L.bl().length, 0); assert.ok(!L.disc.anuntat || (!L.disc.anuntat.mesaje && !L.disc.anuntat.binance), "netrimis ⇒ neanunțat");
  L.alertaPica = "arunca"; const r = await L.tura(); assert.equal(r.facut, true, "o alertă care aruncă nu strică tura"); assert.equal(L.bl().length, 0);
  L.alertaPica = false; await L.tura(); assert.equal(L.bl().length, 2); assert.deepEqual(L.bl().map((a) => a.cheie).sort(), ["agitate-bilant:binance", "agitate-bilant:mesaje"]);
  assert.deepEqual(L.disc.mesaje, [], "nu consumă din cele 8 pe 24 h"); assert.equal(L.disc.jurnal[ZI1].m, 0); assert.equal(L.disc.jurnal[ZI1].p, 0); assert.equal(L.corp().mesaje24, 0);
  const R = lume(); R.disc = { jurnal: zile(7, () => ({ m: 3 })), anuntat: { r: "3/3", mesaje: "tine", mesajeLa: ACUM, h1: true, binance: "ramane" } }; await R.tura(0);
  assert.equal(R.bl().length, 1, "regula s-a schimbat: ce s-a anunțat sub cea veche nu mai contează"); assert.equal(R.disc.anuntat.r, RK); assert.ok(!R.disc.anuntat.h1);
  assert.equal(R.disc.anuntat.binance, "ramane", "„peste Binance” nu ține de regula alertei: ce s-a anunțat rămâne anunțat");
});
await test("C6. 🔴 revizia: NOAPTEA verdictul nu se trimite deloc (politica l-ar ține doar în Radar, iar rezumatul de dimineață dă doar numărul) - pleacă la prima tură de după 07:00, cu textul întreg", async () => {
  const Tn = Date.UTC(2026, 10, 28, 23, 0), j = {}; for (let k = 1; k <= 14; k++) j[POL.ziRo(Tn - k * ZI)] = Object.assign({}, GOL, { ms: 24 * ORA, m: 3, bc: 96 });   /* 01:00 în România, ziua abia schimbată */
  const N = lume({ t: Tn }); N.disc = { jurnal: j }; await N.tura(0); assert.equal(N.corp().bilant.mesaje.verdict, "tine"); assert.equal(N.corp().bilant.binance.verdict, "poate-fi-scos");
  assert.equal(N.bl().length, 0, "la 01:00 nu pleacă nimic"); assert.ok(!N.disc.anuntat || (!N.disc.anuntat.mesaje && !N.disc.anuntat.binance), "și nu e socotit anunțat");
  await N.tura(5 * ORA); assert.equal(N.bl().length, 0, "06:00: tot noapte");
  await N.tura(ORA + 60000); assert.equal(N.bl().length, 2, "07:01: pleacă amândouă, cu textul lor"); assert.match(N.bl().find((a) => a.cheie === "agitate-bilant:mesaje").m.mesaj, /în medie 3,0 mesaje pe zi/); assert.equal(N.disc.anuntat.mesaje, "tine");
});

// ── versiunea ──
await test("V. versiunea de la v100.400 în sus (index ×4, sw, versiune.js, package + lanț după v100.399, BUILD_INFO, colector de la 218)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(+pk.version.split(".")[1] >= 400); assert.ok(bi.li400 && bi.li400.length > 100);
  assert.ok((citeste("public", "index.html").match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 400).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 400);
  assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 400); assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")) || [])[1] >= 218);
  assert.match(pk.scripts.test, /npm run test:v100399 && npm run test:v100400 && /); assert.equal(pk.scripts["test:v100400"], "node scripts/proba-v100400-alerte-bilant.mjs");
});
console.log(`\nproba v100.400 (botul de semnal fără Stop Loss + verdictul bilanțului pe Discord): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
