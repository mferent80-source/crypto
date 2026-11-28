// Proba v100.397 (28.11.2026, el: „un tool simplu, integrat în Radar, care să-mi caute în Pionex cele mai agitate și volatile monede live” +
// „doar top 150 de coinuri”): pagina „Agitate acum”.
//   1. formulele (public/lib/agitate.js, fără DOM / rețea / ceas): rangurile, universul, lumânările, fereastra, „față de obișnuit”, prețul viu
//      pus în lumânări, măsura, clasamentul, ordinea de măsurare
//   2. serverul (functions/api/market.js): lista primelor monede după capitalizare (type=top_cap)
//   3. pagina (public/lib/agitate-ecran.js): stările (aduc / fără listă / plină), fraza, rândurile, textele cinstite, numele străine scăpate
//   4. legarea în Radar: meniul, secțiunea, scripturile, listele din app.js, sw.js, versiunea, lanțul de teste
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const exista = (...p) => fs.existsSync(path.join(RAD, ...p));
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const plain = (o) => JSON.parse(JSON.stringify(o));
const aproape = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-9), `${a} ≠ ${b}`);
function incarca() {
  const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date, TextRo: globalThis.TextRo, console };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "agitate.js") + "\nthis.Agitate = Agitate;", ctx);
  if (exista("public", "lib", "agitate-ecran.js")) vm.runInContext(citeste("public", "lib", "agitate-ecran.js") + "\nthis.agHtml = agHtml; this.agStare = agStare; this.agFraza = agFraza;", ctx);
  return ctx;
}
const C = exista("public", "lib", "agitate.js") ? incarca() : {};
const A = C.Agitate || {};
const M5 = 300000, ACUM = Date.UTC(2026, 10, 28, 6, 2, 30), SLOT = Math.floor(ACUM / M5) * M5;
// n lumânări de 5 min care se termină cu cea în formare (SLOT); toate o = c = pret, h = pret × (1 + sus), l = pret
const bare = (n, pret, sus) => Array.from({ length: n }, (_, i) => ({ t: SLOT - (n - 1 - i) * M5, o: pret, h: pret * (1 + (sus == null ? 0.01 : sus)), l: pret, c: pret }));
const tick = (b, o, h, l, c, vol) => ({ symbol: b + "_USDT_PERP", time: ACUM, open: String(o), high: String(h), low: String(l), close: String(c), volume: "1", amount: String(vol == null ? 2e6 : vol), count: 10 });
const HARTA = () => A.ranguri([{ simbol: "btc", rang: 1, nume: "Bitcoin" }, { simbol: "ETH", rang: 2, nume: "Ethereum" }, { simbol: "USDC", rang: 6, nume: "USDC" },
  { simbol: "WLFI", rang: 90, nume: "World Liberty" }, { simbol: "PAXG", rang: 60, nume: "PAX Gold" }, { simbol: "XMR", rang: 14, nume: "Monero" }, { simbol: "VVV", rang: 57, nume: "Venice" }], 150);

// ── 1. formulele ──
await test("1a. rangurile: doar primele N, cu litere mari; la simbol dublu câștigă rangul mai mic; gunoiul nu intră", () => {
  const h = A.ranguri([{ simbol: "btc", rang: 1, nume: "Bitcoin" }, { simbol: "PEPE", rang: 151, nume: "Pepe" }, { simbol: "SOL", rang: 150, nume: "Solana" },
    { simbol: "SOL", rang: 7, nume: "Solana adevărată" }, { simbol: "", rang: 3 }, { simbol: "XRP", rang: "x" }, null, { simbol: "ADA", rang: 0 }], 150);
  assert.deepEqual(plain(h), { BTC: { rang: 1, nume: "Bitcoin" }, SOL: { rang: 7, nume: "Solana adevărată" } });
  assert.deepEqual(plain(A.ranguri(null, 150)), {});
  assert.equal(A.TOP, 150);
});
await test("1b. universul: doar perpetuele pe USDT din primele 150; amplitudinea, netul, locul în zi, volumul; ordinea după amplitudine", () => {
  const u = A.univers([tick("BTC", 100, 104, 98, 102, 5e9), tick("WLFI", 0.04, 0.042, 0.016, 0.018, 6.5e5), tick("XMR", 400, 410, 350, 360, 1e6),
    tick("PORTAL", 1, 4.6, 1, 1.3, 13e6), { symbol: "ETH_USDT", open: "1", high: "2", low: "1", close: "1", amount: "9" }], HARTA(), {});
  assert.deepEqual(plain(u.monede.map((m) => m.simbol)), ["WLFI", "XMR", "BTC"]);            /* PORTAL nu e în primele 150; ETH_USDT e spot */
  const b = u.monede[2];
  assert.equal(b.pionex, "BTC_USDT_PERP"); assert.equal(b.rang, 1); assert.equal(b.nume, "Bitcoin"); assert.equal(b.pret, 102); assert.equal(b.vol, 5e9);
  aproape(b.amp24, (104 - 98) / 98 * 100); aproape(b.net24, 2); aproape(b.loc24, (102 - 98) / 6);
  aproape(u.monede[0].amp24, (0.042 - 0.016) / 0.016 * 100, 1e-6); aproape(u.monede[0].net24, -55, 1e-6);
  assert.equal(u.scoase.faraRang, 1);
});
await test("1c. universul: stabilele și ce nu e crypto (aurul) ies cu numele; rândurile stricate se numără; „subțire” sub 0,3 M USDT pe Pionex", () => {
  const u = A.univers([tick("USDC", 1, 1.0001, 0.9999, 1), tick("PAXG", 4000, 4040, 3960, 4000), tick("BTC", 100, 0, 98, 102), tick("ETH", 100, 90, 98, 102),
    tick("XMR", "abc", 410, 350, 360), tick("VVV", 5, 5.5, 5, 5.2, 299999), tick("WLFI", 1, 1.1, 1, 1.05, 300000)], HARTA(), { eCrypto: (s) => s !== "PAXG" });
  assert.deepEqual(plain(u.monede.map((m) => m.simbol)).sort(), ["VVV", "WLFI"]);
  assert.deepEqual(plain(u.scoase.stabile), ["USDC"]); assert.deepEqual(plain(u.scoase.nuCrypto), ["PAXG"]); assert.equal(u.scoase.stricate, 3);
  assert.equal(u.monede.find((m) => m.simbol === "VVV").subtire, true); assert.equal(u.monede.find((m) => m.simbol === "WLFI").subtire, false);
  assert.equal(A.SUBTIRE, 300000);
  assert.deepEqual(plain(A.univers(null, HARTA(), {}).monede), []); assert.deepEqual(plain(A.univers([tick("BTC", 1, 2, 1, 1)], null, {}).monede), []);
});
await test("1d. lumânările Pionex (vin de la cea mai nouă): crescător, cu cea în formare; rândurile stricate cad", () => {
  const r = A.bare([{ time: 3 * M5, open: "3", high: "4", low: "2", close: "3.5" }, { time: 2 * M5, open: "x", high: "4", low: "2", close: "3" },
    { time: 1 * M5, open: "1", high: "2", low: "0.5", close: "1.5" }, { time: 0, open: "1", high: "0.5", low: "1", close: "1" }, null]);
  assert.deepEqual(plain(r), [{ t: M5, o: 1, h: 2, l: 0.5, c: 1.5 }, { t: 3 * M5, o: 3, h: 4, l: 2, c: 3.5 }]);
  assert.deepEqual(plain(A.bare(null)), []);
});
await test("1e. fereastra: ultimele n lumânări după TIMP (cu cea în formare) - amplitudinea din maxim / minim, netul de la prima deschidere", () => {
  const b = bare(100, 100, 0); b[b.length - 5].h = 110; b[b.length - 12].o = 100; b[b.length - 12].c = 102; b[b.length - 12].h = 102; b[b.length - 1].c = 105; b[b.length - 1].h = 105;   /* prima lumânare a ferestrei: deschisă la 100, închisă la 102 ⇒ netul se ia de la DESCHIDERE */
  const f = A.fereastra(b, 12, ACUM);
  aproape(f.amp, 10); aproape(f.net, 5); assert.equal(f.min, 100); assert.equal(f.max, 110); assert.equal(f.bare, 12);
  b[b.length - 13].h = 500;                                   /* a 13-a din urmă e în afara ferestrei de o oră */
  aproape(A.fereastra(b, 12, ACUM).amp, 10);
  aproape(A.fereastra(b, 3, ACUM).amp, 5);                    /* pe 15 minute nu mai intră vârful de 110 */
});
await test("1f. fereastra: lumânări lipsă ⇒ tot după timp (nu „ultimele n rânduri”); istorie prea scurtă sau veche ⇒ null", () => {
  const b = bare(100, 100, 0); b[b.length - 20].h = 150;      /* cu 20 de lumânări în urmă: în afara orei */
  const cuGol = b.filter((x, i) => i < b.length - 12 || i >= b.length - 4);   /* lipsesc 8 lumânări din ultima oră */
  const f = A.fereastra(cuGol, 12, ACUM); assert.equal(f.bare, 4); aproape(f.amp, 0);
  assert.equal(A.fereastra(bare(11, 100, 0), 12, ACUM), null);                /* istoria nu acoperă o oră */
  assert.ok(A.fereastra(bare(12, 100, 0), 12, ACUM));
  assert.equal(A.fereastra(b, 12, ACUM + 2 * M5), null);                       /* ultima lumânare e cu două în urmă ⇒ veche */
  assert.ok(A.fereastra(b, 12, ACUM + M5));                                    /* cu una în urmă: încă bună (cererea e ținută 45 s pe server) */
  assert.equal(A.fereastra([], 12, ACUM), null); assert.equal(A.fereastra(null, 12, ACUM), null);
});
await test("1g. „față de obișnuit”: mediana amplitudinii pe ferestrele de aceeași lungime dinainte; sub 6 ferestre ⇒ null", () => {
  const b = bare(12 * 9, 100, 0.01);                          /* 8 ore întregi înainte + ora de acum, fiecare lumânare 1% */
  const o = A.obisnuit(b, 12);
  assert.equal(o.blocuri, 8); aproape(o.med, 1);
  for (let i = 0; i < 12; i++) b[i].h = 150;                  /* o singură oră nebună, cea mai veche: mediana nu se mișcă */
  aproape(A.obisnuit(b, 12).med, 1);
  for (let k = 1; k <= 4; k++) for (let i = 0; i < 12; i++) b[k * 12 + i].h = 103;   /* 5 din 8 ore peste 1% ⇒ mediana urcă */
  aproape(A.obisnuit(b, 12).med, 3);
  assert.equal(A.obisnuit(bare(12 * 6, 100, 0.01), 12), null);                       /* 5 ferestre înainte: prea puține */
  assert.ok(A.obisnuit(bare(12 * 7, 100, 0.01), 12));
  assert.equal(A.MIN_BLOCURI, 6);
});
await test("1h. prețul viu pus în lumânări: ține maximul / minimul celei în formare, deschide una nouă la 5 minute; nu strică intrarea", () => {
  const b = bare(3, 100, 0), copie = plain(b);
  let r = A.cuPret(b, ACUM, 103);
  assert.deepEqual(plain(b), copie); assert.equal(r.length, 3);
  assert.deepEqual(plain(r[2]), { t: SLOT, o: 100, h: 103, l: 100, c: 103 });
  r = A.cuPret(r, ACUM + 1000, 97); assert.deepEqual(plain(r[2]), { t: SLOT, o: 100, h: 103, l: 97, c: 97 });
  r = A.cuPret(r, SLOT + M5 + 5, 99); assert.equal(r.length, 4); assert.deepEqual(plain(r[3]), { t: SLOT + M5, o: 97, h: 99, l: 97, c: 99 });
  assert.equal(A.cuPret(r, SLOT - M5, 500).length, 4); assert.equal(A.cuPret(r, SLOT - M5, 500)[2].h, 103);   /* preț vechi: nu intră */
  assert.equal(A.cuPret(r, ACUM, NaN)[3].c, 99); assert.equal(A.cuPret(r, ACUM, 0)[3].c, 99);
  assert.deepEqual(plain(A.cuPret([], ACUM, 5)), []);                                                          /* fără istorie nu inventăm lumânări */
});
await test("1i. măsura: 24 h din lista Pionex (fără lumânări); ferestrele scurte cer lumânări; „×” = acum / obișnuit; felul mișcării", () => {
  const m = { amp24: 8, net24: -6, bare: null };
  assert.deepEqual(plain(A.masura(m, "24h", ACUM)), { masurat: true, amp: 8, net: -6, ori: null, blocuri: 0, fel: "jos" });
  assert.equal(A.masura(m, "1h", ACUM).masurat, false);
  const b = bare(12 * 9, 100, 0.01); b[b.length - 1].h = 104; b[b.length - 1].c = 104;
  const x = A.masura({ amp24: 8, net24: 1, bare: b }, "1h", ACUM);
  assert.equal(x.masurat, true); aproape(x.amp, 4); aproape(x.net, 4); aproape(x.ori, 4); assert.equal(x.blocuri, 8); assert.equal(x.fel, "sus");
  b[b.length - 1].c = 100.5; assert.equal(A.masura({ amp24: 8, net24: 1, bare: b }, "1h", ACUM).fel, "dus");   /* 4% drum, 0,5% net */
  b[b.length - 1].c = 102; assert.equal(A.masura({ amp24: 8, net24: 1, bare: b }, "1h", ACUM).fel, "");
  assert.equal(A.masura({ amp24: 8, net24: 1, bare: bare(12, 100, 0.01) }, "1h", ACUM).ori, null);              /* fără istorie pentru „obișnuit” */
  assert.equal(A.masura(m, "prostie", ACUM).masurat, false);
  assert.deepEqual(plain(A.FERESTRE.map((f) => f.k)), ["15m", "1h", "4h", "24h"]);
});
await test("1j. treptele față de obișnuit sunt simetrice (1,5× și 1 / 1,5)", () => {
  assert.equal(A.treapta(1.5), "peste"); assert.equal(A.treapta(1.49), "obisnuit"); assert.equal(A.treapta(1 / 1.5), "sub"); assert.equal(A.treapta(0.68), "obisnuit");
  assert.equal(A.treapta(null), null); assert.equal(A.treapta(NaN), null);
});
await test("1k. clasamentul: măsuratele după amplitudinea ferestrei; nemăsuratele la coadă, după 24 h; la egalitate, rangul mai mic", () => {
  const cu = (s, rang, amp24, susUltima) => { const b = bare(30, 100, 0); b[b.length - 1].h = 100 + susUltima; return { simbol: s, rang, amp24, net24: 0, bare: b }; };
  const l = [cu("A", 5, 3, 2), cu("B", 9, 50, 1), { simbol: "C", rang: 1, amp24: 9, net24: 0, bare: null }, cu("D", 2, 4, 2), { simbol: "E", rang: 3, amp24: 20, net24: 0, bare: null }];
  assert.deepEqual(A.clasament(l, "1h", ACUM).map((r) => r.m.simbol), ["D", "A", "B", "E", "C"]);
  assert.deepEqual(A.clasament(l, "24h", ACUM).map((r) => r.m.simbol), ["B", "E", "C", "D", "A"]);
  assert.equal(A.clasament(l, "1h", ACUM)[0].x.masurat, true); assert.equal(A.clasament(l, "1h", ACUM)[4].x.masurat, false);
  assert.deepEqual(plain(A.clasament(null, "1h", ACUM)), []);
});
await test("1l. ordinea de măsurare: boții tăi întâi, apoi cele mai agitate pe 24 h; cu plafon", () => {
  const l = [{ simbol: "A", amp24: 3 }, { simbol: "B", amp24: 50 }, { simbol: "C", amp24: 9 }, { simbol: "D", amp24: 4 }];
  assert.deepEqual(A.deMasurat(l, { D: 1 }).map((m) => m.simbol), ["D", "B", "C", "A"]);
  assert.deepEqual(A.deMasurat(l, null, 2).map((m) => m.simbol), ["B", "C"]);
});

// ── 2. serverul ──
await test("2. serverul: lista după capitalizare din răspunsul CoinGecko (simbol, rang, nume); lista scurtă e refuzată; ruta cere cheia", async () => {
  const mk = await import(pathToFileURL(path.join(RAD, "functions", "api", "market.js")).href);
  const lista = Array.from({ length: 250 }, (_, i) => ({ id: "c" + i, symbol: "s" + i, name: "Moneda " + i, market_cap_rank: i + 1, market_cap: 1e9 - i }));
  lista[4] = { symbol: "x<y", name: "<b>rea</b>", market_cap_rank: 5 }; lista[7] = { symbol: "fara", name: "Fără rang", market_cap_rank: null };
  const r = mk.capDinCoinGecko(lista);
  assert.equal(r.length, 200); assert.deepEqual(r[0], { simbol: "S0", rang: 1, nume: "Moneda 0" });
  assert.ok(!r.some((x) => x.simbol === "FARA")); assert.ok(r.every((x) => /^[A-Z0-9]{1,15}$/.test(x.simbol) && x.rang >= 1 && x.nume.length <= 40));
  assert.ok(!r.some((x) => x.rang === 5));                                              /* simbolul cu semne nu trece */
  assert.equal(mk.capDinCoinGecko(lista.slice(0, 100)), null); assert.equal(mk.capDinCoinGecko({ status: { error_code: 429 } }), null);
  const s = citeste("functions", "api", "market.js");
  assert.match(s, /type==="top_cap"/); assert.match(s, /requireApiAuth\(request,env,"top-cap"/);
});

// ── 3. pagina ──
const stPlin = () => {
  const harta = HARTA();
  const u = A.univers([tick("BTC", 100, 104, 98, 102, 5e9), tick("WLFI", 0.04, 0.042, 0.016, 0.018, 2.9e5), tick("XMR", 400, 410, 350, 360, 1e6), tick("VVV", 5, 5.6, 5, 5.2, 1.2e6)], harta, {});
  const bx = bare(12 * 9, 100, 0.01); bx[bx.length - 1].h = 104.56; bx[bx.length - 1].c = 104.56;
  u.monede.find((m) => m.simbol === "XMR").bare = bx;
  return { k: "1h", monede: u.monede, scoase: u.scoase, harta, hartaLa: ACUM - 3600000, hartaSursa: "CoinGecko", tickLa: ACUM - 12000, faraContract: 61, inLucru: false, masurate: 1, deMasurat: 4, boti: { VVV: 1 }, toate: false, eroare: null };
};
await test("3a. stările: „aduc…” la început; fără lista primelor 150 ⇒ o spune și dă butonul de reîncercare, fără listă inventată", () => {
  const gol = C.agHtml({ k: "1h", monede: [], inLucru: true }, ACUM);
  assert.match(gol, /Agitate acum/); assert.match(gol, /Aduc lista de pe Pionex/);
  const er = C.agHtml({ k: "1h", monede: [], inLucru: false, eroare: "top" }, ACUM);
  assert.match(er, /N-am lista primelor 150 de monede/); assert.match(er, /data-action-click="agPorneste\(true\)"/); assert.ok(!/agRand/.test(er));
  const er2 = C.agHtml({ k: "1h", monede: [], inLucru: false, eroare: "pionex", detaliu: "Pionex rate limit" }, ACUM);
  assert.match(er2, /Pionex nu a răspuns/); assert.match(er2, /Pionex rate limit/);
});
await test("3b. plină: fraza numește cea mai agitată pe fereastra aleasă, cu o zecimală și virgulă; rândurile în ordinea clasamentului", () => {
  const st = stPlin(), h = C.agHtml(st, ACUM);
  assert.match(C.agFraza(st, ACUM), /^Cea mai agitată în ultima oră: XMR — 4,6% între minim și maxim/);
  assert.match(C.agFraza(st, ACUM), /de 4,6× cât obișnuiește/);
  const ordine = [...h.matchAll(/data-ag-simbol="([A-Z0-9]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ordine, ["XMR", "WLFI", "VVV", "BTC"]);                              /* măsurata întâi, apoi după 24 h */
  assert.match(h, /măsor/);                                                              /* nemăsuratele o spun, nu arată 0 */
  assert.ok(!/NaN|undefined|Infinity/.test(h)); assert.ok(!/\d\.\d+%/.test(h), "procent cu punct");
  st.k = "24h"; const h24 = C.agHtml(st, ACUM);
  assert.deepEqual([...h24.matchAll(/data-ag-simbol="([A-Z0-9]+)"/g)].map((x) => x[1]), ["WLFI", "XMR", "VVV", "BTC"]);
  assert.match(C.agFraza(st, ACUM), /în ultimele 24 de ore: WLFI — 162,5%/); assert.match(h24, /−55,0%/); assert.ok(!/măsor/.test(h24));
});
await test("3c. rândul: rangul, „botul tău”, „subțire” lângă volum, butonul „Grid ›” al monedei (nicio legătură în afară); fereastra aleasă e apăsată", () => {
  const st = stPlin(), h = C.agHtml(st, ACUM);
  assert.match(h, /#14/); assert.match(h, /botul tău/); assert.equal((h.match(/botul tău/g) || []).length, 1);
  assert.equal((h.match(/subțire/g) || []).filter(Boolean).length >= 1, true);
  assert.match(h, /<button class="agGrafic" type="button" data-action-click="agLaGrid\('XMR'\)"/); assert.ok(!/https?:\/\//.test(h), "pagina nu leagă în afară");
  assert.match(h, /<button[^>]*agSegOn[^>]*aria-pressed="true"[^>]*>1 oră<\/button>/);
  for (const f of ["15m", "1h", "4h", "24h"]) assert.ok(h.includes(`data-action-click="agFereastra('${f}')"`), f);
});
await test("3d. primele 15 la vedere, restul la „Arată toate (N)”; nimic nu se pierde când le deschizi", () => {
  const st = stPlin(), harta = {}; const t = [];
  for (let i = 0; i < 40; i++) { harta["M" + i] = { rang: i + 1, nume: "Moneda " + i }; t.push(tick("M" + i, 100, 100 + i + 1, 100, 100, 2e6)); }
  st.harta = harta; st.monede = A.univers(t, harta, {}).monede; st.k = "24h";
  let h = C.agHtml(st, ACUM);
  assert.equal((h.match(/data-ag-simbol=/g) || []).length, 15); assert.match(h, /Arată toate \(40\)/); assert.match(h, /data-action-click="agToate\(true\)"/);
  st.toate = true; h = C.agHtml(st, ACUM);
  assert.equal((h.match(/data-ag-simbol=/g) || []).length, 40); assert.match(h, /Arată doar primele 15/);
});
await test("3e. cinstit: fapte, nu semnale; de unde vin datele și cât de vechi; ce a rămas pe dinafară", () => {
  const h = C.agHtml(stPlin(), ACUM);
  assert.match(h, /nu încotro/); assert.match(h, /Pionex/); assert.match(h, /CoinGecko/); assert.match(h, /acum 12 s/);
  assert.match(h, /61 n-au contract pe Pionex/); assert.match(h, /măsurate 1 din 4/);
});
await test("3f. numele venite din afară (CoinGecko) nu pot scrie HTML în pagină", () => {
  const st = stPlin(); st.monede[0].nume = '<img src=x onerror="alert(1)">'; st.detaliu = "<script>";
  const h = C.agHtml(st, ACUM);
  assert.ok(!/<img/.test(h)); assert.ok(!/<script>/.test(h)); assert.match(h, /&lt;img/);
});
await test("3g. fiecare buton din pagină are funcția pe lista albă din app.js și există în fișierul paginii", () => {
  const st = stPlin(), harta = {}, t = []; for (let i = 0; i < 20; i++) { harta["M" + i] = { rang: i + 1, nume: "M" }; t.push(tick("M" + i, 100, 101 + i, 100, 100)); }
  const multe = Object.assign(stPlin(), { harta, monede: A.univers(t, harta, {}).monede, k: "24h" });   /* peste 15 monede ⇒ apare și „Arată toate” */
  const h = C.agHtml(st, ACUM) + C.agHtml(multe, ACUM) + C.agHtml({ k: "1h", monede: [], eroare: "top" }, ACUM);
  const fn = [...new Set([...h.matchAll(/data-action-click="([A-Za-z0-9_]+)\(/g)].map((x) => x[1]))];
  assert.ok(fn.includes("agPorneste") && fn.includes("agFereastra") && fn.includes("agToate"));
  const permise = /var ACTIUNI_PERMISE=new Set\("([^"]+)"/.exec(cuTablou(citeste("public", "app.js")))[1].split(" "), ecran = citeste("public", "lib", "agitate-ecran.js");
  for (const f of fn) { assert.ok(permise.includes(f), "lipsește din ACTIUNI_PERMISE: " + f); assert.ok(f === "tbTemaComuta" || new RegExp("function " + f + "\\(").test(ecran), "nedefinită: " + f); }
});

// ── 4. legarea în Radar ──
await test("4a. meniul, secțiunea, meniul de telefon și scripturile sunt în index.html; pagina e în listele din app.js", () => {
  const ix = citeste("public", "index.html"), app = cuTablou(citeste("public", "app.js"));
  assert.match(ix, /<button class="sideBtn" data-action-click="navTo\('agitate',true\)" data-nav="agitate">/);
  assert.match(ix, /<section class="panel" id="agitate">\s*<div class="agPag" id="agPagina">/);
  assert.match(ix, /<button class="moreBtn" data-action-click="moreNav\('agitate',true\)">/);
  assert.ok(ix.indexOf('<script src="/lib/agitate.js">') > 0 && ix.indexOf('<script src="/lib/agitate.js">') < ix.indexOf('<script src="/lib/agitate-ecran.js">'));
  assert.ok(ix.indexOf('<script src="/lib/text-ro.js">') < ix.indexOf('<script src="/lib/agitate.js">'));
  assert.match(app, /\["Agitate acum","agitate"\]/);
  for (const nume of ["NAV_CU_LOAD=new Set\\(\\[", "var PAGINI_ZILNICE=\\[", 'classList\\.toggle\\("pePaginaNoua",\\[', "function tbTemaAplica\\(\\)\\{var zi=tbTemaZi\\(\\);\\["])
    assert.ok(new RegExp(nume + '[^\\]]*"agitate"').test(app), "pagina lipsește din " + nume);
  assert.match(app, /else if\(id==="agitate"\)\{if\(typeof agPorneste==="function"\)agPorneste\(false\)\}/);
  assert.match(app, /"agTemaBtn"/);
});
await test("4b. sw.js ține fișierele noi; versiunea e cel puțin v100.397 peste tot; proba e în lanțul npm test", () => {
  const sw = citeste("public", "sw.js"), pk = JSON.parse(citeste("package.json"));
  assert.ok(sw.includes('"/lib/agitate.js"') && sw.includes('"/lib/agitate-ecran.js"'));
  assert.ok(+(/crypto-radar-v100-(\d+)/.exec(sw) || [])[1] >= 397);
  assert.ok((citeste("public", "index.html").match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 397).length >= 4);
  assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 397);
  assert.ok(+pk.version.split(".")[1] >= 397);
  assert.match(pk.scripts.test, /npm run test:v100396 && npm run test:v100397/); assert.equal(pk.scripts["test:v100397"], "node scripts/proba-v100397-agitate.mjs");
});
await test("4c. pagina nu bate în Pionex cât nu e pe ecran și nu cere lumânările de două ori", () => {
  const e = citeste("public", "lib", "agitate-ecran.js");
  assert.match(e, /function agPeEcran\(\)/); assert.match(e, /document\.hidden/);
  assert.match(e, /type=pionex_tickers&market=PERP/); assert.match(e, /type=pionex_klines&symbol=/); assert.match(e, /interval=5M&limit=500/); assert.match(e, /type=top_cap/);
  assert.ok(!/setInterval\([^)]*,\s*([1-9]\d{0,3})\)/.test(e), "ritm sub 10 s");
  assert.ok(!/\b(https|wss):\/\//.test(e) && !/\b(https|wss):\/\//.test(citeste("public", "lib", "agitate.js")), "nicio adresă din afară în pagină (garda de antete: connect-src rămâne cum e)");
});
// ── 5. după revizia independentă din 28.11 (1 🔴 + 5 🟡): fereastra la începutul lumânării, volumul lipsă, memoria listei de pe server și
//      pagina ÎN MERS într-o lume prefăcută (document, ceas, cereri numărate): fila ascunsă, eșecurile, pauza Pionex, ceasul PC-ului decalat ──
await test("5a. fereastra la ÎNCEPUTUL unei lumânări ia și lumânarea întreagă dinainte (altfel „o oră” ar fi 55 de minute, iar „×” ar scădea singur)", () => {
  const b = bare(100, 100, 0); b[b.length - 13].h = 108;                       /* a 13-a din urmă */
  const laInceput = A.fereastra(b, 12, SLOT + 10000);                          /* la 10 s de la deschidere: 12 întregi + cea abia începută */
  aproape(laInceput.amp, 8); assert.equal(laInceput.bare, 13);
  const laSfarsit = A.fereastra(b, 12, SLOT + 4 * 60000);                      /* la 4 minute: 11 întregi + cea în formare = 59 de minute */
  aproape(laSfarsit.amp, 0); assert.equal(laSfarsit.bare, 12);
  assert.equal(A.fereastra(bare(12, 100, 0), 12, SLOT + 10000), null);         /* la început de lumânare trebuie 13 în istorie */
  /* „obișnuitul” se numără dinaintea ferestrei folosite: lumânarea a 13-a, deja în fereastră, nu intră și în reper */
  const c = bare(12 * 9 + 1, 100, 0.01); c[c.length - 13].h = 150;
  const x = A.masura({ amp24: 60, net24: 0, bare: c }, "1h", SLOT + 10000);
  aproape(x.amp, 50); aproape(x.ori, 50); assert.equal(x.blocuri, 8);
});
await test("5b. volumul lipsă nu înseamnă „subțire”: nu se știe, deci nu se etichetează", () => {
  const t = tick("VVV", 5, 5.5, 5, 5.2); delete t.amount;
  const m = A.univers([t], HARTA(), {}).monede[0];
  assert.equal(m.vol, null); assert.equal(m.subtire, false);
  const h = C.agHtml(Object.assign(stPlin(), { monede: [m], k: "24h" }), ACUM);
  assert.ok(!/subțire/.test(h.slice(h.indexOf("agLista"))), "fără volum nu scriu „subțire”");
});
await test("5c. serverul: lista ținută 6 ore; la eșec lista veche (cu semn) și 5 minute fără altă cerere; peste 3 zile nu mai e listă pe NICIO cale; două cereri deodată = una", async () => {
  const mk = await import(pathToFileURL(path.join(RAD, "functions", "api", "market.js")).href);
  assert.equal(typeof mk.topCap, "function"); assert.equal(typeof mk.reseteazaCap, "function"); mk.reseteazaCap();
  const lista = Array.from({ length: 250 }, (_, i) => ({ symbol: "s" + i, name: "M" + i, market_cap_rank: i + 1 }));
  let n = 0, pica = false; const cere = async () => { n++; if (pica) throw new Error("HTTP 429"); return lista; };
  const T0 = 1.8e12, ORA = 3600000;
  let r = await mk.topCap({ acum: T0, cere }); assert.equal(r.monede.length, 200); assert.equal(r.la, T0); assert.equal(n, 1);
  r = await mk.topCap({ acum: T0 + 5 * ORA, cere }); assert.equal(n, 1, "în 6 ore nu se mai întreabă"); assert.ok(!r.vechi);
  pica = true; r = await mk.topCap({ acum: T0 + 7 * ORA, cere }); assert.equal(n, 2); assert.equal(r.vechi, true); assert.equal(r.la, T0); assert.match(r.detaliu, /429/);
  r = await mk.topCap({ acum: T0 + 7 * ORA + 60000, cere }); assert.equal(n, 2, "după un eșec, 5 minute fără altă cerere"); assert.equal(r.vechi, true);
  r = await mk.topCap({ acum: T0 + 7 * ORA + 6 * 60000, cere }); assert.equal(n, 3);
  await assert.rejects(mk.topCap({ acum: T0 + 73 * ORA, cere }), /429/); assert.equal(n, 4);
  await assert.rejects(mk.topCap({ acum: T0 + 73 * ORA + 10000, cere }), /reîncerc/); assert.equal(n, 4, "lista de peste 3 zile nu se mai dă nici în cele 5 minute; fără listă, o cerere pe minut");
  mk.reseteazaCap(); n = 0; pica = false; let dezleaga; const lent = () => { n++; return new Promise((ok) => { dezleaga = () => ok(lista); }); };
  const p1 = mk.topCap({ acum: T0, cere: lent }), p2 = mk.topCap({ acum: T0 + 5, cere: lent }); await new Promise((ok) => setImmediate(ok)); dezleaga();
  const doua = await Promise.all([p1, p2]); assert.equal(n, 1, "cererile venite deodată așteaptă aceeași cerere"); assert.equal(doua[0].monede.length, 200); assert.equal(doua[1].monede.length, 200);
  mk.reseteazaCap();
});
// lumea prefăcută: pagina adevărată (agitate.js + agitate-ecran.js) cu document, ceas și getJSON ale probei. o.klines(simbol, aCâtaCerere, acum) ⇒
// răspunsul la lumânări (null = 120 de lumânări bune); o.decalajPc = cu cât e ceasul PC-ului înaintea Pionex; o.tick(aCâtaCerere) ⇒ răspunsul la listă;
// o.varstaLista = de câte ms ține serverul lista (ora Pionex din răspuns e mai veche cu atât)
function lume(o = {}) {
  const ceas = { t: ACUM }, cereri = { tick: 0, top: 0, kl: {} }, asc = {}, el = {}, stoc = {}, ecran = { pe: true }, intervale = [];
  class DataFalsa extends Date { constructor(...a) { if (a.length) super(...a); else super(ceas.t); } static now() { return ceas.t; } }
  const elem = (id) => (el[id] = el[id] || { id, innerHTML: "", classList: { contains: (c) => id === "agitate" && c === "on" && ecran.pe, toggle() {} }, focus() {}, setAttribute() {} });
  const document = { hidden: false, activeElement: null, getElementById: (id) => (id === "agitate" || id === "agPagina" ? elem(id) : null), addEventListener: (tip, f) => { asc[tip] = f; } };
  const monede = o.monede || ["AAA", "BBB", "CCC"], harta = monede.map((s, i) => ({ simbol: s, rang: i + 1, nume: s }));
  while (harta.length < 150) harta.push({ simbol: "Z" + harta.length, rang: harta.length + 1, nume: "z" });
  const pionex = () => ceas.t - (o.decalajPc || 0);
  const getJSON = async (url) => {
    const u = new URL(url, "http://radar"), tip = u.searchParams.get("type");
    if (tip === "top_cap") { cereri.top++; return { result: true, sursa: "CoinGecko", la: ceas.t, monede: harta }; }
    if (tip === "pionex_tickers") { cereri.tick++; const r = o.tick ? o.tick(cereri.tick) : null; if (r) return r;
      return { result: true, timestamp: pionex() - (o.varstaLista || 0), data: { tickers: monede.map((s, i) => tick(s, 100, 100 + (i + 1) * 2, 100, 100 + (i + 1))) } }; }
    if (tip === "pionex_klines") { const s = u.searchParams.get("symbol").replace("_USDT_PERP", ""); cereri.kl[s] = (cereri.kl[s] || 0) + 1; const r = o.klines ? o.klines(s, cereri.kl[s], ceas.t) : null; if (r) return r;
      const slot = Math.floor(pionex() / M5) * M5; return { result: true, data: { klines: Array.from({ length: 120 }, (_, i) => ({ time: slot - i * M5, open: "100", high: "101", low: "100", close: "100" })) } }; }
    throw new Error("cerere neașteptată: " + url);
  };
  const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date: DataFalsa, Intl, Promise, Error, encodeURIComponent, TextRo: globalThis.TextRo, console, document, getJSON,
    localStorage: { getItem: (k) => (k in stoc ? stoc[k] : null), setItem: (k, v) => { stoc[k] = String(v); } },
    setInterval: (f) => { intervale.push({ f, viu: true }); return intervale.length; }, clearInterval: (id) => { if (intervale[id - 1]) intervale[id - 1].viu = false; } };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "agitate.js") + "\n" + citeste("public", "lib", "agitate-ecran.js") + "\nthis.agStare = agStare; this.agPorneste = agPorneste; this.agHtml = agHtml; this.Agitate = Agitate;", ctx);
  const linistit = async () => { for (let i = 0; i < 3000; i++) { await new Promise((ok) => setImmediate(ok)); if (!ctx.agStare.masor && !ctx.agStare.inLucru && !ctx.agStare.tickInZbor) return; } throw new Error("pagina nu s-a liniștit"); };
  const vii = () => intervale.filter((x) => x.viu);
  const bataie = async (ms) => { ceas.t += ms == null ? 30000 : ms; for (const x of vii()) await x.f(); await linistit(); };
  const porneste = async (forta) => { await ctx.agPorneste(!!forta); await linistit(); };
  return { ctx, ceas, cereri, asc, document, ecran, vii, linistit, bataie, porneste, pionex, kl: () => Object.values(cereri.kl).reduce((a, b) => a + b, 0), html: () => elem("agPagina").innerHTML, st: () => ctx.agStare };
}
await test("5d. 🔴 fila ascunsă: nicio cerere, dar ceasul rămâne; la întoarcere citește pe loc; dacă citirea pică, spune „vechi”, nu „acum 12 s”", async () => {
  const L = lume(); await L.porneste();
  assert.equal(L.cereri.tick, 1); assert.equal(L.kl(), 3); assert.equal(L.vii().length, 1);
  L.document.hidden = true; await L.bataie(); await L.bataie();
  assert.equal(L.cereri.tick, 1, "fila ascunsă nu cere nimic"); assert.equal(L.vii().length, 1, "ceasul nu se oprește cât pagina e deschisă");
  L.ceas.t += 3600000; L.document.hidden = false;
  assert.equal(typeof L.asc.visibilitychange, "function", "pagina ascultă întoarcerea pe filă"); await L.asc.visibilitychange(); await L.linistit();
  assert.equal(L.cereri.tick, 2, "la întoarcere citește pe loc, nu după 30 s"); assert.match(L.html(), /acum 0 s/);
  /* aceeași întoarcere, dar Pionex nu răspunde: prețurile de acum o oră se spun vechi */
  const P = lume({ tick: (n) => (n > 1 ? { result: false, error: "Pionex tickers unavailable", detail: "upstream HTTP 502", retryAfter: null } : null) }); await P.porneste();
  P.document.hidden = true; P.ceas.t += 3600000; P.document.hidden = false; await P.asc.visibilitychange(); await P.linistit();
  assert.match(P.html(), /acum 60 min — vechi/); assert.match(P.html(), /Ultima citire a picat/); assert.ok(!/acum \d+ s</.test(P.html()));
});
await test("5e. pe altă pagină a Radarului ceasul se oprește și nu mai pleacă nimic; la întoarcerea pe pagină pornește iar, o singură dată", async () => {
  const L = lume(); await L.porneste();
  L.ecran.pe = false; await L.bataie(); await L.bataie(); assert.equal(L.vii().length, 0); assert.equal(L.cereri.tick, 1);
  L.ecran.pe = true; await L.porneste(); await L.porneste(); assert.equal(L.vii().length, 1, "un singur ceas"); assert.equal(L.cereri.tick, 2);
});
await test("5f. 🟡 lumânările care pică nu se cer la fiecare 30 s: pauza se dublează, iar după 3 căderi rândul spune „fără lumânări”", async () => {
  const L = lume({ klines: (s) => (s === "BBB" ? { result: false, error: "Pionex klines unavailable", detail: "upstream HTTP 400", retryAfter: null } : null) }); await L.porneste();
  for (let i = 0; i < 8; i++) await L.bataie();                                 /* 4 minute */
  assert.equal(L.cereri.kl.BBB, 2, "o cădere, apoi o reîncercare după 2 minute (nu 9 cereri)"); assert.equal(L.cereri.kl.AAA, 1);
  for (let i = 0; i < 22; i++) await L.bataie();                                /* până la 15 minute */
  assert.equal(L.cereri.kl.BBB, 4, "la 0, 2, 6 și 14 minute"); assert.match(L.html(), /fără lumânări/);
  assert.ok(L.cereri.kl.AAA <= 4 && L.cereri.kl.AAA >= 3, "cele bune: doar citirea de la 5 minute (" + L.cereri.kl.AAA + ")");
});
await test("5g. 🟡 pauza cerută de Pionex (429): măsurarea se oprește, nimic nu pleacă până trece pauza, iar „Recitește” nu o șterge", async () => {
  let prima = true; const L = lume({ klines: () => { if (!prima) return null; prima = false; return { result: false, error: "Pionex klines unavailable", detail: "upstream cooldown", retryAfter: 120 }; } });
  await L.porneste(); assert.equal(L.kl(), 1, "după refuz nu mai cere celelalte"); assert.match(L.html(), /Pionex a cerut o pauză/);
  await L.bataie(); await L.bataie(); assert.equal(L.kl(), 1);
  await L.porneste(true); assert.equal(L.kl(), 1, "Recitește respectă pauza"); assert.match(L.html(), /Pionex a cerut o pauză/);
  await L.bataie(70000); await L.bataie(); assert.equal(L.kl(), 4, "după pauză le citește pe toate trei"); assert.ok(!/Pionex a cerut o pauză/.test(L.html()));
});
await test("5h. 🟡 ceasul PC-ului cu 20 de minute înaintea Pionex: lumânările rămân bune (ora Pionex), fără buclă de recitiri", async () => {
  const L = lume({ decalajPc: 20 * 60000 }); await L.porneste();
  for (let i = 0; i < 4; i++) await L.bataie();
  assert.equal(L.kl(), 3, "fiecare monedă citită o singură dată în primele 2 minute"); assert.ok(!/măsor|fără lumânări/.test(L.html()));
  assert.equal(L.st().decalaj, -20 * 60000, "decalajul ceasului PC-ului e ținut minte");
  const slotPionex = Math.floor(L.pionex() / M5) * M5, intrari = Object.values(L.st().bare);
  assert.ok(intrari.length === 3 && intrari.every((e) => !e.refa && e.b[e.b.length - 1].t === slotPionex), "lumânările rămân pe ora Pionex: niciuna din viitor, nicio gaură");
  assert.ok(L.ctx.Agitate.clasament(L.st().monede, "1h", L.pionex()).every((r) => r.x.masurat));
});
await test("5i. 🟡 la 5 minute se recitesc primele 24 din clasament (cele 15 la vedere + marjă), nu doar 12; restul rămân pe prețul viu până la citirea întreagă", async () => {
  const monede = Array.from({ length: 30 }, (_, i) => "M" + i), L = lume({ monede }); await L.porneste();
  assert.equal(L.kl(), 30);
  for (let i = 0; i < 10; i++) await L.bataie();                                /* 5 minute */
  assert.equal(L.kl(), 54, "30 la început + primele 24 la 5 minute"); assert.equal(L.cereri.kl.M29, 2); assert.equal(L.cereri.kl.M0, 1);
  for (let i = 0; i < 110; i++) await L.bataie();                               /* până la o oră: citirea întreagă */
  assert.ok(L.cereri.kl.M0 >= 2, "citirea întreagă, o dată pe oră, le ia pe toate");
});
await test("5j. 🔵 moneda nou listată (prea puține lumânări pentru 4 ore) spune „istorie scurtă”, nu „măsor…” la nesfârșit; lista după capitalizare se reîmprospătează și cu pagina ținută deschisă", async () => {
  const L = lume({ klines: (s, n, t) => (s === "AAA" ? { result: true, data: { klines: Array.from({ length: 20 }, (_, i) => ({ time: Math.floor(t / M5) * M5 - i * M5, open: "100", high: "101", low: "100", close: "100" })) } } : null) });
  await L.porneste(); L.st().k = "4h";
  const h = L.ctx.agHtml(L.st(), L.ceas.t), rand = h.slice(h.indexOf('data-ag-simbol="AAA"')); assert.match(rand.slice(0, rand.indexOf("</div></div>") > 0 ? 900 : 900), /istorie scurtă/); assert.ok(!/măsor/.test(h));
  assert.equal(L.cereri.top, 1); L.ceas.t += 6 * 3600000 + 60000; await L.bataie(); assert.equal(L.cereri.top, 2, "după 6 ore lista se cere din nou, fără să apeși nimic");
});
await test("5k. 🔵 „acum N s” e vârsta adevărată a prețurilor: lista ținută de server 20 s se spune „acum 20 s”, nu „acum 0 s”", async () => {
  const L = lume({ varstaLista: 20000 }); await L.porneste();
  assert.match(L.html(), /Prețuri: Pionex, contractele perpetue pe USDT, acum 20 s</); assert.equal(L.st().decalaj, 0, "20 s nu e ceas decalat, e lista ținută de server");
  assert.ok(L.ctx.Agitate.clasament(L.st().monede, "1h", L.ceas.t).every((r) => r.x.masurat));
});
console.log(`\nproba v100.397 (Agitate acum): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
