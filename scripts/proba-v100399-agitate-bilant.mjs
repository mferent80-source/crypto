// Proba v100.399 (28.11.2026, el după livrarea v100.398: „fa idei” ⇒ I-976…I-978): BILANȚUL alertelor paginii „Agitate acum” - trei numărători
// ținute de colector, cu criteriile de verdict scrise ÎNAINTE de primele date (public/lib/agitate.js, BILANT):
//   I-976 mesaje pe zi: media ultimelor 7 zile întregi (zi întreagă = urmărită ≥ 20 h, ziua României) față de ținta de cel mult 5;
//   I-977 ce a urmat după aprindere, la +1 h și +4 h: doar aprinderile singure cu direcție; ≥ +0,5 puncte în sensul ei „a continuat”, ≤ −0,5
//         „s-a întors”; prețul întârziat peste 10 minute = ratat. Verdict O SINGURĂ dată pe orizont, la ≥ 30 de zile cu vot și ≥ 150 de cazuri,
//         cu testul t pe ZILE (suma zilei), alfa 0,025 pe orizont. De ce pe zile: simularea din 28.11 (scratchpad: putere-urmari.mjs,
//         putere-zile.mjs) - binomialul pe cazuri dă 7–21% verdicte false când cazurile aceleiași zile sunt corelate, t pe zile 2,3–2,7%;
//   I-978 „peste Binance”: colectorul compară la 15 minute; 14 zile urmărite fără apariții ⇒ „poate fi scos”.
//   A. formulele · D. tura colectorului (jurnalul, ce a urmat, probele „fără viitor”, Binance, verdictul înghețat) · C. ruta · B. pagina · E. legarea + versiunea
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const plain = (o) => JSON.parse(JSON.stringify(o));
const aproape = (a, b, eps) => assert.ok(Math.abs(a - b) < (eps || 1e-9), `${a} ≠ ${b}`);
const M5 = 300000, ORA = 3600000, ZI = 86400000, ACUM = Date.UTC(2026, 10, 28, 8, 2, 30), SLOT = Math.floor(ACUM / M5) * M5, ZI1 = "2026-11-28";
const A = new Function(citeste("public", "lib", "agitate.js") + "; return Agitate;")();
const P = (() => { const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date, Intl, TextRo: globalThis.TextRo, console }; vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "agitate.js") + "\n" + citeste("public", "lib", "agitate-ecran.js") + "\nthis.agHtml = agHtml; this.Agitate = Agitate;", ctx); return ctx; })();
const tick = (b, o, h, l, c, vol) => ({ symbol: b + "_USDT_PERP", time: ACUM, open: String(o), high: String(h), low: String(l), close: String(c), volume: "1", amount: String(vol == null ? 2e6 : vol), count: 10 });
const bare = (n, slot, sus) => Array.from({ length: n }, (_, i) => ({ t: (slot == null ? SLOT : slot) - (n - 1 - i) * M5, o: 100, h: 100 * (1 + (sus == null ? 0.01 : sus)), l: 100, c: 100 }));
const kl = (b) => ({ result: true, data: { klines: b.slice().reverse().map((x) => ({ time: x.t, open: String(x.o), high: String(x.h), low: String(x.l), close: String(x.c) })) } });
const ziDin = (k) => new Date(ACUM - k * ZI).toISOString().slice(0, 10);   /* ACUM e 10:02 la noi: ziua UTC = ziua României */
const RC = A.regulaAcum();   /* cheia regulii, fără partea turei: formulele o iau singure */
const rand = (zi, o) => Object.assign({ zi, r: RC, ms: 24 * ORA, m: 0, p: 0, a: 0, ap: 0, opr: 0, bc: 0, bp: [], cd: 0, fd: 0, x: 0, h1: [0, 0, 0, 0], h4: [0, 0, 0, 0] }, o || {});

// ── A. formulele ──
await test("A1. criteriile sunt cele scrise ÎNAINTE de primele date (28.11.2026) - orice schimbare aici e o schimbare de regulă, nu o reglare", () => {
  assert.deepEqual(plain(A.BILANT), { tinta: 5, zileMesaje: 7, ziIntreagaMs: 20 * ORA, zileBinance: 14, citiriBinance: 60, ore: [1, 4], directie: 0.3, banda: 0.5, tarziuMs: 600000, zileVot: 30, cazuri: 150, alfa: 0.025 });
  /* revizia (R7): cheia regulii ține TOT ce schimbă mesajele - pragul aprinderii, regula pieței și, de la tură, plafonul, candidatul, așteptarea, liniștea */
  assert.equal(A.regulaAcum(), "5/3-3/3/0.15/8"); assert.equal(A.regulaAcum("8/0.8/24/60"), "5/3-3/3/0.15/8:8/0.8/24/60");
});
await test("A2. direcția aprinderii = semnul netului pe ora ei, doar când netul trece de 0,3 din mișcare; altfel „dus-întors”, fără direcție", () => {
  assert.equal(A.directia(1.6, 5), 1); assert.equal(A.directia(1.5, 5), 0, "exact 0,3 = încă dus-întors"); assert.equal(A.directia(-4, 5), -1); assert.equal(A.directia(-1.5, 5), 0);
  assert.equal(A.directia(null, 5), 0); assert.equal(A.directia(3, 0), 0); assert.equal(A.directia("x", 5), 0);
});
await test("A3. ce a urmat: prețul de după față de cel de la aprindere, ÎN SENSUL ei - de la +0,5 puncte „a continuat”, de la −0,5 „s-a întors”, între ele „pe loc”", () => {
  assert.deepEqual(plain(A.urmare(100, 100.5, 1)), { d: 0.5, fel: "continuat" }); assert.equal(A.urmare(100, 100.49, 1).fel, "peLoc"); assert.equal(A.urmare(100, 99.51, 1).fel, "peLoc"); assert.equal(A.urmare(100, 99.5, 1).fel, "intors");
  const jos = A.urmare(100, 99, -1); aproape(jos.d, 1); assert.equal(jos.fel, "continuat", "aprindere în jos, prețul mai jos = a continuat"); assert.equal(A.urmare(100, 101, -1).fel, "intors");
  assert.equal(A.urmare(100, 101, 0), null, "fără direcție nu are „în sensul ei”"); assert.equal(A.urmare(0, 101, 1), null); assert.equal(A.urmare(100, null, 1), null); assert.equal(A.urmare(100, "x", -1), null);
});
await test("A4. p-ul testului t pe două părți, verificat pe tabel (df 29: 2,045 ⇒ 0,05; 2,364 ⇒ 0,025 · df 13: 2,160 ⇒ 0,05)", () => {
  aproape(A.tDouaParti(2.045, 29), 0.05, 5e-4); aproape(A.tDouaParti(2.364, 29), 0.025, 5e-4); aproape(A.tDouaParti(2.160, 13), 0.05, 5e-4); aproape(A.tDouaParti(-2.045, 29), 0.05, 5e-4);
  assert.equal(A.tDouaParti(0, 29), 1); assert.equal(A.tDouaParti(Infinity, 29), 0); assert.equal(A.tDouaParti(-Infinity, 29), 0); assert.equal(A.tDouaParti(2, 0), null); assert.equal(A.tDouaParti(NaN, 29), null);
  /* revizia (R5): la valori uriașe pasul de integrare rămâne mic - înainte, t ≈ 4.900 dădea p = 0,21 */
  assert.ok(A.tDouaParti(41, 29) < 1e-9); assert.ok(A.tDouaParti(4887, 119) < 1e-9, "p " + A.tDouaParti(4887, 119)); assert.ok(A.tDouaParti(60000, 29) < 1e-9); aproape(A.tDouaParti(12.706, 1), 0.05, 5e-4);
});
await test("A5. I-976 mesaje pe zi: media ultimelor 7 zile ÎNTREGI (fără ziua de azi, fără zilele urmărite sub 20 h, fără zilele altei reguli); sub 7 ⇒ fără verdict; ≤ 5 ⇒ „ține”, peste ⇒ „peste”", () => {
  const azi = ziDin(0), zile = [rand(ziDin(3), { m: 4 }), rand(ziDin(2), { m: 5, p: 1 }), rand(ziDin(1), { m: 3 }), rand(azi, { m: 9, ms: 23 * ORA, opr: 2 })];
  let b = A.bilantMesaje(zile, azi); assert.deepEqual(plain(b), { intregi: 3, zile: 3, medie: 13 / 3, oprite: 2, verdict: "prea-putine" }, "azi nu intră în medie; mesajele oprite azi se spun");
  const sapte = (n) => Array.from({ length: 7 }, (_, k) => rand(ziDin(7 - k), { m: n[k] }));
  assert.equal(A.bilantMesaje(sapte([5, 5, 5, 5, 5, 5, 5]), azi).verdict, "tine", "exact 5 în medie = ține"); b = A.bilantMesaje(sapte([5, 5, 5, 5, 5, 5, 6]), azi); assert.equal(b.verdict, "peste"); aproape(b.medie, 36 / 7);
  /* doar ultimele 7 zile întregi: o săptămână veche cu 20 pe zi nu mai trage media */
  b = A.bilantMesaje(Array.from({ length: 7 }, (_, k) => rand(ziDin(14 - k), { m: 20 })).concat(sapte([2, 2, 2, 2, 2, 2, 2])), azi); assert.equal(b.intregi, 14); assert.equal(b.zile, 7); assert.equal(b.medie, 2); assert.equal(b.verdict, "tine");
  const cuGol = sapte([1, 1, 1, 1, 1, 1, 1]); cuGol[3].ms = 20 * ORA - 1; assert.equal(A.bilantMesaje(cuGol, azi).verdict, "prea-putine", "ziua urmărită sub 20 h nu e zi întreagă"); assert.equal(A.bilantMesaje(cuGol, azi).intregi, 6);
  const alta = sapte([1, 1, 1, 1, 1, 1, 1]); alta[0].r = "3/3"; assert.equal(A.bilantMesaje(alta, azi).intregi, 6, "ziua numărată cu altă regulă nu intră: schimbarea pragului repornește numărătoarea");
  assert.deepEqual(plain(A.bilantMesaje(null, azi)), { intregi: 0, zile: 0, medie: null, oprite: 0, verdict: "prea-putine" });
});
await test("A6. I-977 ce a urmat, pe un orizont: numărătorile, media PE CAZ, zilele cu vot; verdict doar la ≥ 30 de zile cu vot ȘI ≥ 150 de cazuri, cu testul t pe ZILE", () => {
  const zile = (f, n) => Array.from({ length: n == null ? 30 : n }, (_, k) => rand(ziDin(k + 1), f(k)));
  let b = A.bilantUrmare(zile((k) => ({ h1: k % 2 ? [1, 4, 0, -3] : [2, 4, 1, -2] })), "h1");
  assert.equal(b.continuat, 45); assert.equal(b.intors, 120); assert.equal(b.peLoc, 15); assert.equal(b.n, 165); aproape(b.media, -75 / 180); assert.equal(b.zileVot, 30); assert.equal(b.zileIntors, 30); assert.equal(b.zileContinuat, 0);
  assert.equal(b.gata, true); assert.ok(b.t > 20 && b.p < 1e-6); assert.equal(b.verdict, "intors");
  b = A.bilantUrmare(zile((k) => ({ h4: k % 2 ? [4, 1, 0, 3] : [4, 2, 1, 2] })), "h4"); assert.equal(b.verdict, "continuat"); assert.ok(b.t < -20); assert.equal(b.zileContinuat, 30);
  b = A.bilantUrmare(zile((k) => ({ h1: k % 2 ? [3, 2, 0, 1] : [2, 3, 0, -1] })), "h1"); assert.equal(b.n, 150); assert.equal(b.gata, true); assert.equal(b.t, 0); assert.equal(b.p, 1); assert.equal(b.verdict, "nimic", "jumătate-jumătate: nicio înclinare dovedită");
  /* 🔑 cazurile aceleiași zile se trag unele după altele: 3 zile cu câte 30 de întoarceri + 27 de zile egale = 68% întoarceri pe CAZURI (binomialul ar striga), dar pe ZILE nu e dovadă */
  b = A.bilantUrmare(zile((k) => ({ h1: k < 3 ? [0, 30, 0, -90] : [3, 3, 0, 0] })), "h1"); assert.equal(b.n, 252); aproape(b.intors / b.n, 171 / 252); assert.ok(b.intors / b.n > 0.67); aproape(b.t, 1.795, 0.01); assert.ok(b.p > 0.07 && b.p < 0.1, "p " + b.p); assert.equal(b.verdict, "nimic");
  /* pragurile de oprire: amândouă */
  b = A.bilantUrmare(zile(() => ({ h1: [1, 5, 0, -4] }), 29), "h1"); assert.equal(b.n, 174); assert.equal(b.zileVot, 29); assert.equal(b.gata, false); assert.equal(b.verdict, "prea-putine"); assert.equal(b.t, null); assert.equal(b.p, null);
  const z149 = zile(() => ({ h1: [1, 4, 0, -3] })); z149[0].h1 = [1, 3, 0, -2]; b = A.bilantUrmare(z149, "h1"); assert.equal(b.n, 149); assert.equal(b.gata, false); assert.equal(b.verdict, "prea-putine");
  /* ziua fără vot (doar „pe loc” sau nimic) nu e zi cu vot; ziua altei reguli nu intră; dispersie zero */
  const cuGoale = zile(() => ({ h1: [1, 4, 0, -3] })).concat([rand(ziDin(40), { h1: [0, 0, 6, 0.1] }), rand(ziDin(41)), rand(ziDin(42), { r: "3/3", h1: [50, 0, 0, 99] })]);
  b = A.bilantUrmare(cuGoale, "h1"); assert.equal(b.zileVot, 30); assert.equal(b.continuat, 30); assert.equal(b.peLoc, 6); aproape(b.media, (30 * -3 + 0.1) / 156); assert.equal(b.verdict, "intors", "toate zilele la fel (dispersie zero), înclinate: verdictul e al semnului"); assert.equal(b.p, 0);
  b = A.bilantUrmare(zile(() => ({ h1: [3, 3, 0, 0] })), "h1"); assert.equal(b.n, 180); assert.equal(b.verdict, "nimic"); assert.equal(b.p, 1);
  assert.deepEqual(plain(A.bilantUrmare(null, "h1")), { continuat: 0, intors: 0, peLoc: 0, n: 0, media: null, zileVot: 0, zileIntors: 0, zileContinuat: 0, gata: false, t: null, p: null, verdict: "prea-putine" });
});
await test("A7. I-978 „peste Binance”: zile urmărite = zile trecute cu cel puțin 60 de citiri; o apariție (și azi) ⇒ „rămâne”; 14 zile urmărite fără niciuna ⇒ „poate fi scos”", () => {
  const azi = ziDin(0), zile = (n, f) => Array.from({ length: n }, (_, k) => rand(ziDin(n - k), Object.assign({ bc: 96 }, f ? f(k) : {})));
  assert.deepEqual(plain(A.bilantBinance(zile(13), azi)), { urmarite: 13, citiriAzi: 0, aparitii: 0, monede: [], verdict: "prea-putine" }); assert.equal(A.bilantBinance(zile(14), azi).verdict, "poate-fi-scos");
  assert.equal(A.bilantBinance(zile(14, (k) => (k === 5 ? { bc: 59 } : {})), azi).urmarite, 13, "ziua cu sub 60 de citiri nu e zi urmărită"); assert.equal(A.bilantBinance(zile(14).concat([rand(azi, { bc: 96 })]), azi).urmarite, 14, "ziua de azi nu e încă zi urmărită");
  let b = A.bilantBinance(zile(3, (k) => (k === 1 ? { bp: ["WLFI", "FF"] } : {})).concat([rand(azi, { bc: 4, bp: ["WLFI"] })]), azi);
  assert.deepEqual(plain(b), { urmarite: 3, citiriAzi: 4, aparitii: 3, monede: ["FF", "WLFI"], verdict: "ramane" }, "o apariție hotărăște pe loc, fără să aștepte 14 zile; citirile de azi se văd (dacă stau pe zero, Binance nu răspunde colectorului)");
  assert.equal(A.bilantBinance(zile(20, (k) => (k === 0 ? { bp: ["SKY"] } : {})), azi).verdict, "ramane"); assert.deepEqual(plain(A.bilantBinance(null, azi)), { urmarite: 0, citiriAzi: 0, aparitii: 0, monede: [], verdict: "prea-putine" });
  /* regula alertei nu are legătură cu semnul: zilele altei reguli se numără */
  assert.equal(A.bilantBinance(zile(14, () => ({ r: "3/3" })), azi).urmarite, 14);
});

// ── D. tura colectorului ──
const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-agitate.mjs")).href);
function lumeTura(o = {}) {
  const L = { t: ACUM, monede: o.monede || ["AAA", "BBB", "CCC"], pret: {}, bareDe: {}, cereri: { top: 0, tick: 0, kl: {}, bin: 0 }, trimise: [], alerte: [], jurnal: [], disc: {}, st: {}, pica: {}, binanceLista: () => [], lipsa: new Set(), scrieri: 0, ordine: [], discNecitit: false, limita: () => new Promise(() => {}) };
  if (o.t) L.t = o.t;
  const harta = () => { const h = L.monede.map((s, i) => ({ simbol: s, rang: i + 1, nume: s })); while (h.length < 150) h.push({ simbol: "Z" + h.length, rang: h.length + 1, nume: "z" }); return h; };
  L.slot = () => Math.floor(L.t / M5) * M5;
  L.bare = (s) => (L.bareDe[s] ? L.bareDe[s](L.slot()) : bare(120, L.slot()));
  L.d = () => Object.assign({ acum: L.t, Agitate: A, TextRo: globalThis.TextRo, eCrypto: () => true, pauza: async () => {}, jurnal: (...a) => L.jurnal.push(a.join(" ")),
    cere: async (cale) => {
      const u = new URL(cale, "http://radar"), tip = u.searchParams.get("type");
      if (tip === "top_cap") { L.cereri.top++; return { result: true, sursa: "CoinGecko", la: L.t, monede: harta() }; }
      if (tip === "pionex_tickers") { L.cereri.tick++; if (L.pica.tick) return { result: false, error: "Pionex tickers unavailable", retryAfter: null };
        return { result: true, timestamp: L.t, data: { tickers: L.monede.filter((s) => !L.lipsa.has(s)).map((s) => tick(s, 100, 104, 100, L.pret[s] || 100)) } }; }
      if (tip === "pionex_klines") { const s = u.searchParams.get("symbol").replace("_USDT_PERP", ""); L.cereri.kl[s] = (L.cereri.kl[s] || 0) + 1; return kl(L.bare(s)); }
      throw new Error("cerere neașteptată: " + cale);
    },
    trimite: async (cale, corp) => { L.ordine.push("kv"); L.trimise.push([cale, plain(corp)]); return { ok: true }; },
    asteapta: (ms) => { L.limitaMs = ms; return L.limita(); },
    trimiteAlerta: async (m, bot, cheie) => { L.alerte.push({ m: plain(m), bot, cheie }); return true; },
    citesteDisc: () => (L.discNecitit ? null : plain(L.disc)), scrieDisc: (x) => { L.scrieri++; L.disc = plain(x); } },
  o.binance ? { binance: (url) => { L.ordine.push("bin"); L.cereri.bin++; L.binUrl = url; if (L.pica.bin === "agatat") return new Promise(() => {}); if (L.pica.bin === "arunca") return Promise.reject(new Error("ETIMEDOUT")); return Promise.resolve(L.pica.bin ? null : L.binanceLista()); } } : {});
  L.tura = async (ms) => { L.t += ms == null ? 60000 : ms; return T.turaAgitate(L.d(), L.st); };
  L.aprinde = (s, sus) => { L.bareDe[s] = (slot) => { const b = bare(120, slot); b[b.length - 1].h = 100 + sus; b[b.length - 1].c = 100 + sus; return b; }; L.pret[s] = 100 + sus; };
  L.stinge = (s) => { delete L.bareDe[s]; L.pret[s] = 100; };
  L.z = (zi) => (L.disc.jurnal || {})[zi || ZI1];
  L.corp = () => L.trimise[L.trimise.length - 1][1];
  return L;
}
const RK = A.regulaAcum([T.REGULA.maxZi, T.REGULA.candidat, T.REGULA.asteptareMs / ORA, T.REGULA.linisteMs / 60000].join("/"));
const ziRoT = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const GOL = { r: RK, ms: 0, m: 0, p: 0, a: 0, ap: 0, opr: 0, bc: 0, bp: [], cd: 0, fd: 0, x: 0, h1: [0, 0, 0, 0], h4: [0, 0, 0, 0] };
await test("D1. jurnalul zilei (ziua României, cu regula de acum): timpul urmărit, mesajele, aprinderile; fiecare aprindere e ținută cu prețul și direcția ei", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); await L.tura();
  assert.deepEqual(L.z(), { ...GOL, ms: 120000 }, "prima tură judecată doar pornește ceasul; apoi câte un minut");
  L.aprinde("BBB", 5.2); await L.tura();
  const z = L.z(); assert.equal(z.m, 1); assert.equal(z.p, 0); assert.equal(z.a, 1); assert.equal(z.ap, 0); assert.equal(z.cd, 1); assert.equal(z.fd, 0); assert.equal(z.ms, 180000);
  assert.equal(L.disc.urmari.length, 1); const c = L.disc.urmari[0];
  assert.equal(c.s, "BBB"); assert.equal(c.la, L.t); assert.equal(c.zi, ZI1); assert.equal(c.r, RK); assert.equal(RK, "5/3-3/3/0.15/8:8/0.8/24/60"); assert.equal(c.pret, 105.2); assert.equal(c.dir, 1); assert.equal(c.msg, true); aproape(c.amp, 5.2, 1e-6); aproape(c.net, 5.2, 1e-6); aproape(c.ori, 5.2, 1e-6);
  assert.ok(!("p1" in c) && !("p4" in c) && !("piata" in c), "rezultatul vine abia la termen");
});
await test("D2. ce a urmat: la o oră și la 4 ore după aprindere, prețul din lista Pionex de ATUNCI intră la caz și în numărătoarea zilei aprinderii", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); L.aprinde("BBB", 5.2); await L.tura(); const t0 = L.t;
  for (let k = 0; k < 11; k++) await L.tura(5 * 60000);
  assert.equal(L.t - t0, 55 * 60000); assert.ok(!("p1" in L.disc.urmari[0]), "la 55 de minute încă nu e termenul"); assert.deepEqual(L.z().h1, [0, 0, 0, 0]);
  L.pret.BBB = 106.3; await L.tura(5 * 60000);
  assert.equal(L.disc.urmari[0].p1, 106.3); assert.equal(L.z().h1[0], 1); assert.equal(L.z().h1[1], 0); assert.equal(L.z().h1[2], 0); aproape(L.z().h1[3], (106.3 / 105.2 - 1) * 100, 1e-9); assert.deepEqual(L.z().h4, [0, 0, 0, 0]);
  for (let k = 0; k < 35; k++) await L.tura(5 * 60000);
  assert.ok(!("p4" in L.disc.urmari[0])); L.pret.BBB = 104; await L.tura(5 * 60000); assert.equal(L.t - t0, 4 * ORA);
  assert.equal(L.disc.urmari[0].p4, 104); assert.deepEqual(L.z().h4.slice(0, 3), [0, 1, 0], "a coborât sub prețul aprinderii: s-a întors"); aproape(L.z().h4[3], (104 / 105.2 - 1) * 100, 1e-9);
  assert.equal(L.z().h1[0], 1, "rezultatul de la o oră a rămas cum era"); assert.equal(L.disc.urmari.length, 1); assert.equal(L.z().x, 0);
});
await test("D3. prețul întârziat NU se pune: colectorul căzut la termen (peste 10 minute întârziere) ⇒ „ratat”, pentru totdeauna; la 10 minute fix încă se pune", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura(); L.aprinde("BBB", 5.2); await L.tura(); const t0 = L.t;
  for (let k = 0; k < 11; k++) await L.tura(5 * 60000);
  L.pret.BBB = 111; await L.tura(20 * 60000); assert.equal(L.t - t0, 75 * 60000);
  let c = L.disc.urmari[0]; assert.ok(!("p1" in c), "prețul de la +75 de minute nu e prețul de la o oră"); assert.equal(c.x1, true); assert.deepEqual(L.z().h1, [0, 0, 0, 0]); assert.equal(L.z().x, 1);
  for (let k = 0; k < 6; k++) await L.tura(5 * 60000); c = L.disc.urmari[0]; assert.ok(!("p1" in c)); assert.equal(L.z().x, 1, "nu se mai umple și nu se numără de două ori");
  const M = lumeTura(); await M.tura(0); await M.tura(); M.aprinde("BBB", 5.2); await M.tura(); for (let k = 0; k < 10; k++) await M.tura(5 * 60000);
  M.pret.BBB = 103; await M.tura(20 * 60000); assert.equal(M.disc.urmari[0].p1, 103, "la exact 10 minute după termen prețul încă e bun"); assert.equal(M.z().h1[1], 1);
  /* revizia (R1): moneda lipsă din lista Pionex o singură tură, chiar la termen, NU e „ratat” - se așteaptă tura următoare, cât mai e în cele 10 minute */
  const N = lumeTura(); await N.tura(0); await N.tura(); N.aprinde("BBB", 5.2); await N.tura(); for (let k = 0; k < 11; k++) await N.tura(5 * 60000);
  N.lipsa.add("BBB"); await N.tura(5 * 60000); let cn = N.disc.urmari[0]; assert.ok(!("p1" in cn) && !cn.x1, "lista de la termen n-o are: nici preț, nici ratat"); assert.equal(N.z().x, 0);
  N.lipsa.delete("BBB"); N.pret.BBB = 104; await N.tura(); cn = N.disc.urmari[0]; assert.equal(cn.p1, 104, "prețul primei liste care o are, la un minut după termen"); assert.ok(!cn.x1); assert.equal(N.z().h1[1], 1);
  const Q = lumeTura(); await Q.tura(0); await Q.tura(); Q.aprinde("BBB", 5.2); await Q.tura(); for (let k = 0; k < 11; k++) await Q.tura(5 * 60000);
  Q.lipsa.add("BBB"); for (let k = 0; k < 3; k++) await Q.tura(5 * 60000); assert.ok(!Q.disc.urmari[0].x1, "la 10 minute după termen încă se așteaptă"); await Q.tura(); assert.equal(Q.disc.urmari[0].x1, true, "peste 10 minute fără preț: ratat"); assert.equal(Q.z().x, 1);
});
await test("D4. 🔑 FĂRĂ VIITOR: până la termen nu se scrie nimic; după ce s-a scris, niciun preț de mai târziu nu schimbă nici cazul, nici numărătoarea zilei", async () => {
  const mers = async (dupa) => { const L = lumeTura(); await L.tura(0); await L.tura(); L.aprinde("BBB", 5.2); await L.tura();
    for (let k = 0; k < 11; k++) await L.tura(5 * 60000); const inainte = plain(L.disc.urmari[0]);
    L.pret.BBB = 106.3; await L.tura(5 * 60000); const laTermen = { caz: plain(L.disc.urmari[0]), h1: plain(L.z().h1) };
    if (dupa) await dupa(L); return { L, inainte, laTermen }; };
  const curat = await mers(null), stricat = await mers(async (L) => { delete L.bareDe.BBB; /* lumânările exacte liniștite: prețurile stricate nu aprind alt caz */ for (const p of [9999, 0.0001, 250, 31]) { L.pret.BBB = p; for (let k = 0; k < 5; k++) await L.tura(5 * 60000); } });
  assert.ok(!("p1" in curat.inainte) && !("x1" in curat.inainte), "trunchiat înainte de termen: cazul n-are rezultat");
  assert.equal(stricat.L.disc.urmari[0].p1, curat.laTermen.caz.p1); assert.equal(stricat.L.disc.urmari[0].p1, 106.3);
  assert.deepEqual(stricat.L.z().h1, curat.laTermen.h1, "prețurile stricate de DUPĂ termen n-au schimbat numărătoarea de la o oră");
  assert.ok(!("p4" in stricat.L.disc.urmari[0]), "iar cel de la 4 ore încă n-a venit");
});
await test("D5. aprinderea „dus-întors” (netul sub 0,3 din mișcare) n-are direcție: se numără separat și nu intră la „a continuat / s-a întors”", async () => {
  const L = lumeTura(); await L.tura(0); await L.tura();
  L.bareDe.CCC = (slot) => { const b = bare(120, slot); b[b.length - 1].h = 106; b[b.length - 1].c = 100.5; return b; }; L.pret.CCC = 106;
  const r = await L.tura(); assert.deepEqual(r.notate, ["CCC"]);
  const c = L.disc.urmari[0]; assert.equal(c.dir, 0); aproape(c.amp, 6, 1e-6); aproape(c.net, 0.5, 1e-6); assert.equal(L.z().fd, 1); assert.equal(L.z().cd, 0); assert.equal(L.z().a, 1);
  L.pret.CCC = 100.5; for (let k = 0; k < 12; k++) await L.tura(5 * 60000);
  assert.equal(L.disc.urmari[0].p1, 100.5, "prețul se ține (date brute), dar fără direcție nu e vot"); assert.deepEqual(L.z().h1, [0, 0, 0, 0]);
});
await test("D6. aprinderile din mișcarea pieței întregi sunt UN eveniment: se țin cu semnul `piata`, se numără separat și nu intră la „ce a urmat”", async () => {
  const monede = Array.from({ length: 20 }, (_, i) => "P" + i), L = lumeTura({ monede }); await L.tura(0); await L.tura();
  for (let i = 0; i < 9; i++) L.aprinde("P" + i, 6); await L.tura();
  const z = L.z(); assert.equal(z.p, 1); assert.equal(z.m, 0); assert.equal(z.ap, 9); assert.equal(z.a, 0); assert.equal(z.cd, 0); assert.equal(z.fd, 0);
  assert.equal(L.disc.urmari.length, 9); assert.ok(L.disc.urmari.every((c) => c.piata === true && !c.msg));
  for (let k = 0; k < 12; k++) await L.tura(5 * 60000);
  assert.ok(L.disc.urmari.every((c) => c.p1 === 106)); assert.deepEqual(L.z().h1, [0, 0, 0, 0]);
});
await test("D7. mesajele pe zi: 8 plecate + 4 oprite de plafon se văd în jurnal; ziua se schimbă la miezul nopții României; fiecare caz își ține rezultatul în ziua aprinderii", async () => {
  const M = lumeTura({ monede: Array.from({ length: 12 }, (_, i) => "K" + i) }); await M.tura(0); await M.tura();
  for (let i = 0; i < 12; i++) { M.aprinde("K" + i, 6); await M.tura(); M.stinge("K" + i); for (let k = 0; k < 14; k++) await M.tura(5 * 60000); }
  const zile = Object.keys(M.disc.jurnal).sort(); assert.deepEqual(zile, [ZI1, "2026-11-29"]);
  const suma = (k) => zile.reduce((a, z) => a + M.disc.jurnal[z][k], 0); assert.equal(suma("m"), 8); assert.equal(suma("opr"), 4); assert.equal(suma("a"), 12); assert.equal(suma("cd"), 12);
  assert.equal(M.disc.jurnal["2026-11-29"].a, 0, "toate cele 12 s-au aprins pe 28"); assert.equal(M.disc.urmari.filter((c) => c.msg).length, 8);
  assert.deepEqual(M.z(ZI1).h1.slice(0, 3), [0, 12, 0], "prețul a revenit la 100 după fiecare: 12 întoarse, toate în ziua aprinderii (și cele hotărâte după miezul nopții)"); aproape(M.z(ZI1).h1[3], 12 * (100 / 106 - 1) * 100, 1e-6);
});
await test("D8. timpul urmărit: doar turele care judecă (cel puțin 60% din piață măsurată) și doar când vin una după alta; golul unei căderi nu se numără", async () => {
  const L = lumeTura(); await L.tura(0); for (let k = 0; k < 4; k++) await L.tura(); assert.equal(L.z().ms, 240000);
  await L.tura(20 * 60000); assert.equal(L.z().ms, 240000, "20 de minute fără colector nu sunt timp urmărit"); await L.tura(); assert.equal(L.z().ms, 300000);
  const N = lumeTura({ monede: Array.from({ length: 30 }, (_, i) => "N" + i) }); await N.tura(0); assert.equal(N.z().ms, 0);
  await N.tura(); assert.equal(N.z().ms, 0, "12 din 30 nu se judecă; la 24 din 30 abia pornește ceasul"); await N.tura(); assert.equal(N.z().ms, 60000);
});
await test("D9. I-978: colectorul compară cu Binance Futures cel mult o dată la 15 minute; citirea reușită se numără, moneda „peste” se ține o dată pe zi; Binance căzut nu strică tura", async () => {
  const L = lumeTura({ binance: true });
  L.binanceLista = () => Array.from({ length: 60 }, (_, i) => ({ symbol: "X" + i + "USDT", highPrice: "104", lowPrice: "100", closeTime: L.t, count: 5000 }))
    .concat([{ symbol: "AAAUSDT", highPrice: "102", lowPrice: "100", closeTime: L.t, count: 5000 }, { symbol: "BBBUSDT", highPrice: "104", lowPrice: "100", closeTime: L.t, count: 5000 }]);
  await L.tura(0); assert.equal(L.cereri.bin, 1); assert.equal(L.binUrl, "https://fapi.binance.com/fapi/v1/ticker/24hr");
  assert.equal(L.z().bc, 1); assert.deepEqual(L.z().bp, ["AAA"], "AAA: 4,0% pe Pionex față de 2,0% pe Binance; BBB la fel pe amândouă; CCC n-are contract acolo");
  for (let k = 0; k < 14; k++) await L.tura(); assert.equal(L.cereri.bin, 1, "sub 15 minute nu mai întreabă"); await L.tura(); assert.equal(L.cereri.bin, 2); assert.equal(L.z().bc, 2); assert.deepEqual(L.z().bp, ["AAA"], "aceeași monedă, o singură dată pe zi");
  L.pica.bin = true; for (let k = 0; k < 15; k++) await L.tura(); assert.equal(L.cereri.bin, 3); assert.equal(L.z().bc, 2, "Binance fără răspuns: citirea nu se numără");
  L.pica.bin = "arunca"; let r; for (let k = 0; k < 15; k++) r = await L.tura(); assert.equal(L.cereri.bin, 4); assert.equal(L.z().bc, 2); assert.equal(r.facut, true, "tura merge mai departe");
  L.pica.bin = false; L.binanceLista = () => [{ symbol: "AAAUSDT", highPrice: "102", lowPrice: "100", closeTime: L.t, count: 5000 }]; for (let k = 0; k < 15; k++) await L.tura(); assert.equal(L.z().bc, 2, "o listă cu sub 50 de contracte nu e o citire");
  const F = lumeTura(); await F.tura(0); assert.equal(F.cereri.bin, 0); assert.equal(F.z().bc, 0);
  /* revizia (R4): cererea spre Binance pleacă DUPĂ scrierea spre pagină și are limită de timp - un Binance care nu răspunde nu ține tura (și nici pe următoarele) */
  assert.deepEqual(L.ordine.slice(0, 2), ["kv", "bin"], "întâi pagina, apoi Binance"); assert.equal(T.BINANCE_LIMITA_MS, 8000); assert.equal(L.limitaMs, 8000);
  const G = lumeTura({ binance: true }); G.pica.bin = "agatat"; G.limita = async () => {};
  const rg = await G.tura(0); assert.equal(rg.facut, true, "tura se încheie fără răspunsul Binance"); assert.equal(G.trimise.length, 1); assert.equal(G.z().bc, 0); assert.equal((await G.tura()).facut, true);
});
await test("D10. verdictul „ce a urmat” se dă O SINGURĂ dată pe orizont (când sunt 30 de zile cu vot și 150 de cazuri) și rămâne înghețat; o regulă nouă nu-l moștenește", async () => {
  const L = lumeTura(), j = {};
  for (let k = 1; k <= 30; k++) j[ziDin(k)] = { ...GOL, ms: 24 * ORA, m: 3, a: 6, cd: 6, bc: 96, h1: k % 2 ? [1, 4, 0, -3] : [2, 4, 1, -2], h4: k % 2 ? [3, 2, 0, 0.1] : [2, 3, 0, -0.1] };
  L.disc = { jurnal: j }; await L.tura(0);
  const v = plain(L.disc.verdict); assert.equal(v.r, RK); assert.equal(v.h1.verdict, "intors"); assert.equal(v.h1.la, L.t); assert.equal(v.h1.n, 165); assert.equal(v.h1.zileVot, 30); assert.equal(v.h1.intors, 120); assert.equal(v.h1.continuat, 45);
  assert.equal(v.h4.verdict, "nimic"); assert.equal(v.h4.n, 150);
  L.disc.jurnal[ziDin(3)].h1 = [400, 0, 0, 900]; L.disc.jurnal[ziDin(4)].h4 = [0, 400, 0, -900]; await L.tura(); await L.tura();
  assert.deepEqual(plain(L.disc.verdict), v, "date noi nu redeschid judecata (fără priviri repetate)");
  const R = lumeTura(); R.disc = { verdict: { r: "3/3", h1: { verdict: "intors", la: 1, n: 999 } } }; await R.tura(0); assert.deepEqual(plain(R.disc.verdict), { r: RK });
  const P29 = lumeTura(), j29 = {}; for (let k = 1; k <= 29; k++) j29[ziDin(k)] = { ...GOL, ms: 24 * ORA, cd: 9, h1: [1, 8, 0, -9] }; P29.disc = { jurnal: j29 }; await P29.tura(0); assert.deepEqual(plain(P29.disc.verdict), { r: RK }, "29 de zile: încă nu se judecă, oricâte cazuri");
  /* revizia (R2): ziua de AZI, abia începută, nu intră în judecată - 29 de zile încheiate + azi cu voturi nu fac 30 */
  const Azi = lumeTura(), ja = {}; for (let k = 1; k <= 29; k++) ja[ziDin(k)] = { ...GOL, ms: 24 * ORA, cd: 6, h1: [1, 5, 0, -4] }; ja[ZI1] = { ...GOL, cd: 3, h1: [0, 3, 0, -3] };
  Azi.disc = { jurnal: ja }; await Azi.tura(0); assert.deepEqual(plain(Azi.disc.verdict), { r: RK }, "azi nu e zi încheiată"); assert.equal(Azi.corp().bilant.h1.zileVot, 30, "numărătoarea de pe pagină o arată, verdictul n-o ia");
  /* …și cât o aprindere dintr-o zi încheiată își așteaptă rezultatul, orizontul acela nu se judecă: la 00:30 (ora României), cazul de la 23:00 are o oră, dar nu 4 */
  const T0 = Date.UTC(2026, 10, 28, 22, 30, 0), W = lumeTura({ t: T0 }), jw = {};
  for (let k = 1; k <= 30; k++) jw[ziRoT(T0 - k * ZI)] = { ...GOL, ms: 24 * ORA, cd: 6, h1: k % 2 ? [1, 4, 0, -3] : [2, 4, 1, -2], h4: k % 2 ? [3, 2, 0, 0.1] : [2, 3, 0, -0.1] };
  W.disc = { jurnal: jw, urmari: [{ s: "AAA", la: T0 - 90 * 60000, zi: ziRoT(T0 - 90 * 60000), r: RK, pret: 100, net: 6, amp: 6, ori: 4, dir: 1, p1: 101 }] };
  await W.tura(0); assert.equal(ziRoT(T0), "2026-11-29"); assert.equal(W.disc.urmari[0].zi, "2026-11-28");
  assert.equal(W.disc.verdict.h1.verdict, "intors", "la o oră nimic în așteptare: se judecă"); assert.ok(!W.disc.verdict.h4, "la 4 ore un caz de ieri încă așteaptă: nu se judecă pe date parțiale");
  await W.tura(151 * 60000); assert.equal(W.disc.urmari[0].p4, 100); assert.equal(W.disc.verdict.h4.verdict, "nimic"); assert.equal(W.disc.verdict.h4.la, W.t, "judecat abia când rezultatul a venit");
});
await test("D11. ce pleacă spre pagină (KV): rezumatele socotite de colector cu aceleași formule - zilele din urmă, mesajele, cele două orizonturi, verdictul înghețat, Binance", async () => {
  const L = lumeTura(), j = {};
  for (let k = 1; k <= 30; k++) j[ziDin(k)] = { ...GOL, ms: 24 * ORA, m: 3, a: 6, cd: 5, fd: 1, ap: 2, x: 1, bc: 96, h1: k % 2 ? [1, 4, 0, -3] : [2, 4, 1, -2], h4: k % 2 ? [3, 2, 0, 0.1] : [2, 3, 0, -0.1] };
  j[ziDin(2)].p = 1;   /* o zi cu un mesaj de piață pe lângă cele 3 pe monedă */
  L.disc = { jurnal: j }; await L.tura(0); const b = L.corp().bilant;
  assert.equal(b.regula, "5/3"); assert.equal(b.azi, ZI1); assert.equal(b.deLa, ziDin(30)); assert.equal(b.zile.length, 8);
  assert.deepEqual(b.zile[0], { zi: ziDin(7), ms: 24 * ORA, n: 3 }); assert.deepEqual(b.zile[5], { zi: ziDin(2), ms: 24 * ORA, n: 4 }, "mesajul de piață se numără în ziua lui"); assert.deepEqual(b.zile[7], { zi: ZI1, ms: 0, n: 0 });
  assert.deepEqual(b.mesaje, { intregi: 30, zile: 7, medie: 22 / 7, oprite: 0, verdict: "tine" });
  assert.deepEqual(b.cazuri, { singure: 180, cuDirectie: 150, faraDirectie: 30, dePiata: 60, ratate: 30 });
  assert.equal(b.h1.n, 165); assert.equal(b.h1.intors, 120); assert.equal(b.h4.n, 150); assert.equal(b.verdict.h1.verdict, "intors"); assert.equal(b.verdict.h1.la, L.t); assert.equal(b.verdict.h4.verdict, "nimic");
  assert.deepEqual(b.binance, { urmarite: 30, citiriAzi: 0, aparitii: 0, monede: [], verdict: "poate-fi-scos" });
  assert.ok(JSON.stringify(b).length < 2500, "rezumatul e mic (" + JSON.stringify(b).length + " octeți): pleacă o dată pe minut");
  const N = lumeTura(); await N.tura(0); const n = N.corp().bilant; assert.equal(n.deLa, ZI1); assert.deepEqual(n.verdict, { h1: null, h4: null }); assert.equal(n.mesaje.verdict, "prea-putine"); assert.equal(n.binance.verdict, "prea-putine");
});
await test("D14. 🟡 revizia (R3): fișierul de pe disc care NU se poate citi nu e „fișier gol” - tura sare fără să scrie nimic; lipsa lui = pornire de la zero; stricat de 10 ori la rând ⇒ pus deoparte", async () => {
  const io = (ce) => { const x = { deoparte: 0, jurnal: [] }; return Object.assign(x, { citeste: () => { const v = ce(); if (v instanceof Error) throw v; return v; }, deoparte_: () => { x.deoparte++; }, jurnal_: (...a) => x.jurnal.push(a.join(" ")) }); };
  const cit = (x, st) => T.citesteStare({ citeste: x.citeste, deoparte: x.deoparte_, jurnal: x.jurnal_ }, st), err = (cod) => Object.assign(new Error(cod), { code: cod });
  let st = {}, x = io(() => err("ENOENT")); assert.deepEqual(cit(x, st), {}, "fișier lipsă: prima pornire");
  x = io(() => '{"jurnal":{"a":1}}'); assert.deepEqual(cit(x, st), { jurnal: { a: 1 } });
  x = io(() => err("EBUSY")); assert.equal(cit(x, st), null, "ținut de alt program: NU se întoarce {}"); assert.equal(st.necitit, 1); assert.equal(x.deoparte, 0);
  x = io(() => '{"jurnal":'); assert.equal(cit(x, st), null, "JSON tăiat"); assert.equal(st.necitit, 2); x = io(() => "[1,2]"); assert.equal(cit(x, st), null, "altceva decât starea turei"); assert.equal(st.necitit, 3);
  x = io(() => "{}"); assert.deepEqual(cit(x, st), {}); assert.equal(st.necitit, 0, "o citire bună golește numărătoarea");
  x = io(() => err("EPERM")); for (let i = 0; i < 9; i++) assert.equal(cit(x, st), null); assert.equal(x.deoparte, 0);
  assert.deepEqual(cit(x, st), {}, "a zecea oară la rând: pus deoparte, pornire de la zero (altfel alertele ar tăcea pentru totdeauna)"); assert.equal(x.deoparte, 1); assert.equal(x.jurnal.length, 1); assert.match(x.jurnal[0], /nu s-a putut citi de 10 ori la rând/); assert.equal(st.necitit, 0);
  /* tura: cu discul necitit nu scrie, nu trimite, nu anunță - iar aprinderea din minutul acela e anunțată la tura următoare, nu pierdută */
  const L = lumeTura(); await L.tura(0); await L.tura(); const scr = L.scrieri, kv = L.trimise.length; L.disc.jurnal[ZI1].m = 7;
  L.discNecitit = true; L.aprinde("BBB", 5.2); const r = await L.tura(); assert.equal(r.facut, false); assert.match(r.motiv, /starea de pe disc/); assert.equal(L.scrieri, scr, "nimic scris peste fișier"); assert.equal(L.trimise.length, kv); assert.equal(L.alerte.length, 0);
  L.discNecitit = false; const r2 = await L.tura(); assert.deepEqual(r2.noi, ["BBB"]); assert.equal(L.alerte.length, 1); assert.equal(L.z().m, 8, "istoria de pe disc e neatinsă");
});
await test("D12. jurnalul nu crește la nesfârșit: zilele mai vechi de 120 de zile și cazurile mai vechi de 90 de zile ies", async () => {
  const L = lumeTura(); L.disc = { jurnal: { [ziDin(121)]: { ...GOL, m: 4 }, [ziDin(119)]: { ...GOL, m: 2 } }, urmari: [{ s: "AAA", la: ACUM - 91 * ZI, zi: ziDin(91), r: RK, pret: 1, dir: 1, p1: 1, p4: 1 }, { s: "BBB", la: ACUM - 89 * ZI, zi: ziDin(89), r: RK, pret: 1, dir: 1, p1: 1, p4: 1 }] };
  await L.tura(0); assert.deepEqual(Object.keys(L.disc.jurnal).sort(), [ziDin(119), ZI1]); assert.deepEqual(L.disc.urmari.map((c) => c.s), ["BBB"]);
});
await test("D13. schimbarea regulii repornește numărătoarea: ziua de azi numărată cu altă regulă se ia de la zero, iar cazurile vechi nu mai intră în numărătoarea nouă", async () => {
  const L = lumeTura(); L.disc = { jurnal: { [ZI1]: { ...GOL, r: "3/3", ms: 999, m: 7, a: 9 } }, urmari: [{ s: "BBB", la: ACUM - 59 * 60000, zi: ZI1, r: "3/3", pret: 100, net: 4, amp: 4, ori: 4, dir: 1 }] };
  await L.tura(0); assert.deepEqual(L.z(), GOL); await L.tura();
  assert.equal(L.disc.urmari[0].p1, 100, "prețul cazului vechi se ține (date brute)"); assert.deepEqual(L.z().h1, [0, 0, 0, 0], "dar nu votează sub regula nouă");
});

// ── C. ruta ──
await test("C1. serverul ține rezumatul curățat: doar numere, semne și șiruri scurte fără marcaj; un rezumat prea mare sau stricat cade singur, aprinderile rămân", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=agitate", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = async () => (await (await m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=agitate", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV })).json()).agitate;
  const bun = { la: ACUM, n: 85, masurate: 85, prag: { amp: 5, ori: 3 }, mesaje24: 2, aprinse: [{ s: "XMR", la: ACUM - 1000, amp: 5.2, net: 3.1, ori: 4.1, pret: 400 }] };
  const bilant = { regula: "5/3", deLa: "2026-11-28", azi: "2026-11-29", zile: [{ zi: "2026-11-28", ms: 72000000, n: 4, rau: "<script>x</script>", "cheie<rea>": 1 }], mesaje: { intregi: 1, zile: 1, medie: 4.5, oprite: 0, verdict: "prea-putine" },
    verdict: { h1: null, h4: { la: ACUM, verdict: "nimic", n: 150 } }, binance: { urmarite: 1, aparitii: 1, monede: ["WLFI", "<img src=x>"], verdict: "ramane", adanc: { a: { b: { c: { d: 1 } } } } }, nan: "NaN" };
  let r = await post({ ...bun, bilant }); assert.equal(r.status, 200); let v = await get();
  assert.deepEqual(v.bilant, { regula: "5/3", deLa: "2026-11-28", azi: "2026-11-29", zile: [{ zi: "2026-11-28", ms: 72000000, n: 4 }], mesaje: { intregi: 1, zile: 1, medie: 4.5, oprite: 0, verdict: "prea-putine" },
    verdict: { h1: null, h4: { la: ACUM, verdict: "nimic", n: 150 } }, binance: { urmarite: 1, aparitii: 1, monede: ["WLFI"], verdict: "ramane", adanc: { a: { b: {} } } }, nan: "NaN" });
  assert.equal(v.aprinse.length, 1); assert.equal(v.mesaje24, 2);
  r = await post({ ...bun, bilant: { zile: Array.from({ length: 40 }, (_, i) => ({ zi: "2026-11-28", ms: i, n: i, a: "x".repeat(20), b: "y".repeat(20), c: "z".repeat(20), d: "w".repeat(20), e: "v".repeat(20), f: "u".repeat(20), g: "t".repeat(20), h: "s".repeat(20) })) } }); assert.equal(r.status, 200);
  v = await get(); assert.equal(v.bilant, null, "peste 6.000 de octeți: rezumatul nu se ține"); assert.equal(v.aprinse.length, 1, "aprinderile nu se pierd din cauza lui");
  await post({ ...bun, bilant: "text" }); assert.equal((await get()).bilant, null); await post({ ...bun, bilant: [1, 2] }); assert.equal((await get()).bilant, null); await post(bun); assert.equal((await get()).bilant, null, "colectorul vechi nu trimite rezumat");
});

// ── B. pagina ──
const stPlin = () => {
  const harta = A.ranguri([{ simbol: "BTC", rang: 1, nume: "Bitcoin" }, { simbol: "XMR", rang: 14, nume: "Monero" }], 150), u = A.univers([tick("BTC", 100, 104, 98, 102, 5e9), tick("XMR", 400, 410, 350, 360, 1e6)], harta, {});
  return { k: "1h", monede: u.monede, scoase: u.scoase, harta, hartaLa: ACUM - 3600000, hartaSursa: "CoinGecko", tickLa: ACUM - 12000, faraContract: 61, inLucru: false, boti: {}, toate: false, eroare: null };
};
const orizont = (o) => Object.assign({ continuat: 0, intors: 0, peLoc: 0, n: 0, media: null, zileVot: 0, zileIntors: 0, zileContinuat: 0, gata: false, t: null, p: null, verdict: "prea-putine" }, o || {});
const bl = (o) => Object.assign({ regula: "5/3", deLa: "2026-11-28", azi: "2026-12-01", zile: [{ zi: "2026-11-28", ms: 12 * ORA, n: 3 }, { zi: "2026-11-29", ms: 24 * ORA, n: 6 }, { zi: "2026-11-30", ms: 24 * ORA, n: 4 }, { zi: "2026-12-01", ms: 9 * ORA, n: 2 }],
  mesaje: { intregi: 2, zile: 2, medie: 5, oprite: 0, verdict: "prea-putine" }, cazuri: { singure: 15, cuDirectie: 12, faraDirectie: 3, dePiata: 36, ratate: 1 },
  h1: orizont({ continuat: 5, intors: 6, peLoc: 1, n: 11, media: -0.42, zileVot: 3 }), h4: orizont(), verdict: { h1: null, h4: null }, binance: { urmarite: 2, citiriAzi: 31, aparitii: 0, monede: [], verdict: "prea-putine" } }, o || {});
const cuBilant = (b) => { const st = stPlin(); st.colector = { la: ACUM - 1000, mesaje24: 2, prag: { amp: 5, ori: 3 }, aprinse: [], bilant: b }; return P.agHtml(st, ACUM); };
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
await test("B1. fără rezumat (colectorul dinainte) blocul nu apare; cu el apare SUB listă (clasamentul rămâne sus), în zona lui, cu data de la care se numără", () => {
  const st = stPlin(); st.colector = { la: ACUM - 1000, aprinse: [] }; assert.ok(!/Bilanțul alertelor/.test(text(P.agHtml(st, ACUM)).split("Cum citesc lista")[0]));
  const h = cuBilant(bl()); const iB = h.indexOf('agApTitlu">Bilanțul alertelor'); assert.ok(iB > h.indexOf('<div id="agZonaLista">'), "sub listă: clasamentul e rostul paginii, bilanțul se schimbă o dată pe zi"); assert.ok(iB < h.indexOf('<div id="agZonaNote">'), "dar la vedere, înaintea notelor pliate");
  assert.match(h, /<div id="agZonaBilant"><div class="agAprinse agBilant">/); assert.ok(!/id="agZonaAprinse">[^]*Bilanțul alertelor[^]*id="agZonaLista"/.test(h), "nu mai stă între „Aprinse” și listă");
  assert.match(text(h), /Bilanțul alertelor numărat de colector din 28\.11 · verdictele se dau doar după criteriile scrise dinainte \(în „Cum citesc lista”\)/);
  assert.match(citeste("public", "lib", "agitate-ecran.js"), /var zB = agEl\("agZonaBilant"\);[^\n]*if \(zB\) zB\.innerHTML = agHtmlBilant\(agStare\);/, "și la redesenarea pe bucăți (fiecare citire) blocul se reface în zona lui");
  assert.equal(cuBilant("text").includes('agApTitlu">Bilanțul alertelor'), false); assert.equal(cuBilant(null).includes('agApTitlu">Bilanțul alertelor'), false); assert.ok(h.includes('agApTitlu">Bilanțul alertelor'));
});
await test("B2. I-976 pe pagină: mesajele fiecărei zile (azi și ziua neîntreagă se spun), media pe zilele întregi, apoi verdictul după criteriul scris - sau câte zile mai lipsesc", () => {
  let t = text(cuBilant(bl()));
  assert.match(t, /Mesaje pe zi: 28\.11: 3 \(zi neîntreagă\) · 29\.11: 6 · 30\.11: 4 · 01\.12: 2 \(azi\)\. Media pe 2 zile întregi: 5,0\. Fără verdict încă: 2 din 7 zile întregi \(ținta: cel mult 5 pe zi\)\./);
  t = text(cuBilant(bl({ mesaje: { intregi: 9, zile: 7, medie: 4.14, oprite: 0, verdict: "tine" } }))); assert.match(t, /Media pe 7 zile întregi: 4,1\. Ține ținta de cel mult 5 pe zi\./); assert.ok(!/Fără verdict încă: \d+ din 7/.test(t));
  t = text(cuBilant(bl({ mesaje: { intregi: 9, zile: 7, medie: 7.86, oprite: 3, verdict: "peste" } }))); assert.match(t, /Media pe 7 zile întregi: 7,9\. Peste ținta de cel mult 5 pe zi: pragul rămâne cum e până hotărăști tu\. Plafonul a oprit 3 mesaje\./);
  t = text(cuBilant(bl({ zile: [], mesaje: { intregi: 0, zile: 0, medie: null, oprite: 0, verdict: "prea-putine" } }))); assert.match(t, /Mesaje pe zi: Fără verdict încă: 0 din 7 zile întregi/); assert.ok(!/Media pe/.test(t.split("După aprindere")[0]));
  t = text(cuBilant(bl({ mesaje: { intregi: 0, zile: 0, medie: 4, oprite: 0, verdict: "prea-putine" } }))); assert.ok(!/Media pe/.test(t.split("După aprindere")[0]), "fără zile întregi nu se scrie nicio medie, orice ar spune rezumatul");
  t = text(cuBilant(bl({ mesaje: { intregi: 1, zile: 1, medie: 6, oprite: 1, verdict: "prea-putine" } }))); assert.match(t, /Media pe 1 zi întreagă: 6,0\. .*Plafonul a oprit 1 mesaj\./);
});
await test("B3. I-977 pe pagină: pe fiecare orizont câte au continuat, câte s-au întors, media în sensul aprinderii (o zecimală) și cât mai e până la verdict; verdictul înghețat își poartă dovada", () => {
  let t = text(cuBilant(bl()));
  assert.match(t, /După aprindere, la 1 h: 5 au continuat, 6 s-au întors, 1 pe loc; media −0,4% în sensul aprinderii\. Fără verdict încă: 3 din 30 de zile cu aprinderi, 11 din 150 de cazuri\./);
  assert.match(t, /După aprindere, la 4 h: încă niciun caz\. Fără verdict încă: 0 din 30 de zile cu aprinderi, 0 din 150 de cazuri\./);
  assert.match(t, /Numărate: 15 aprinderi singure \(12 cu direcție, 3 dus-întors\) · 36 în mișcarea pieței, care nu intră aici · 1 rezultat ratat \(fără preț la termen\)\./);
  const inghetat = { la: Date.UTC(2027, 0, 9, 12, 0, 0), continuat: 52, intors: 113, peLoc: 9, n: 165, zileVot: 31, verdict: "intors" };
  t = text(cuBilant(bl({ h1: orizont({ continuat: 60, intors: 130, peLoc: 10, n: 190, media: -1.26, zileVot: 36, gata: true, verdict: "intors" }), verdict: { h1: inghetat, h4: null } })));
  assert.match(t, /După aprindere, la 1 h: 60 au continuat, 130 s-au întors, 10 pe loc; media −1,3% în sensul aprinderii\. Verdict din 09\.01, pe 165 de cazuri din 31 de zile: se întorc mai des decât continuă \(113 față de 52\)\./);
  assert.ok(!/Fără verdict încă: \d+ din 30/.test(t.split("la 4 h")[0]), "cu verdict dat nu mai scrie „fără verdict”");
  t = text(cuBilant(bl({ verdict: { h1: { ...inghetat, verdict: "continuat", continuat: 113, intors: 52 }, h4: { ...inghetat, verdict: "nimic", continuat: 80, intors: 85 } } })));
  assert.match(t, /Verdict din 09\.01, pe 165 de cazuri din 31 de zile: continuă mai des decât se întorc \(113 față de 52\)\./);
  assert.match(t, /la 4 h: încă niciun caz\. Verdict din 09\.01, pe 165 de cazuri din 31 de zile: nicio înclinare dovedită \(85 întoarse, 80 continuate\)\./);
  /* revizia (R2): pragurile atinse, dar ziua încă neîncheiată - se spune, nu „fără verdict încă: 30 din 30” */
  t = text(cuBilant(bl({ h1: orizont({ continuat: 60, intors: 95, peLoc: 4, n: 155, media: -0.6, zileVot: 30, gata: true }) })));
  assert.match(t, /la 1 h: 60 au continuat, 95 s-au întors, 4 pe loc; media −0,6% în sensul aprinderii\. Pragurile sunt atinse \(30 de zile cu aprinderi, 155 de cazuri\): verdictul se dă după ce se încheie ziua și vin rezultatele ei\./); assert.ok(!/Fără verdict încă: 30 din 30/.test(t));
  t = text(cuBilant(bl({ verdict: { h1: { la: ACUM, verdict: "<b>altceva</b>" }, h4: "text" } }))); assert.match(t, /la 1 h: [^.]*\. Fără verdict încă: 3 din 30/, "un verdict necunoscut nu se afișează ca verdict");
  t = text(cuBilant(bl({ cazuri: { singure: 1, cuDirectie: 1, faraDirectie: 0, dePiata: 0, ratate: 0 } }))); assert.match(t, /Numărate: 1 aprindere singură \(1 cu direcție, 0 dus-întors\) · 0 în mișcarea pieței, care nu intră aici\./); const numarate = t.slice(t.indexOf("Numărate:"), t.indexOf("Peste Binance:")); assert.ok(numarate.length > 40 && !/ratat/.test(numarate), "fără rezultate ratate nu se pomenește de ele: " + numarate);
});
await test("B4. I-978 pe pagină: câte zile a urmărit colectorul, unde a apărut semnul și verdictul după cele 14 zile", () => {
  let t = text(cuBilant(bl())); assert.match(t, /Peste Binance: urmărit 2 zile \(azi: 31 de citiri\); apariții: niciuna\. Fără verdict încă: 2 din 14 zile\./);
  t = text(cuBilant(bl({ binance: { urmarite: 14, citiriAzi: 0, aparitii: 0, monede: [], verdict: "poate-fi-scos" } }))); assert.match(t, /Peste Binance: urmărit 14 zile \(azi: 0 citiri\); apariții: niciuna\. N-a apărut în 14 zile: semnul poate fi scos\./);
  t = text(cuBilant(bl({ binance: { urmarite: 5, citiriAzi: 96, aparitii: 3, monede: ["FF", "WLFI"], verdict: "ramane" } }))); assert.match(t, /Peste Binance: urmărit 5 zile \(azi: 96 de citiri\); apariții: la 2 monede \(FF, WLFI\)\. A apărut: semnul rămâne\./);
  /* revizia (R6): peste 12 monede nu se taie în tăcere */
  t = text(cuBilant(bl({ binance: { urmarite: 5, citiriAzi: 1, aparitii: 15, monede: Array.from({ length: 15 }, (_, i) => "S" + (i + 10)), verdict: "ramane" } })));
  assert.match(t, /apariții: la 15 monede \(S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21 și încă 3\)\./);
});
await test("B5. rezumatul e date din afară: marcajul nu ajunge în pagină, simbolurile stricate ies, numerele stricate devin zero sau liniuță", () => {
  const h = cuBilant(bl({ deLa: "<img src=x onerror=1>", azi: "<i>", zile: [{ zi: "<script>", ms: "x", n: "<b>9</b>" }], mesaje: { intregi: "<u>", zile: "x", medie: "y", oprite: "<s>", verdict: "<script>" },
    h1: orizont({ continuat: "<a>", intors: -5, peLoc: 1e999, n: "n", media: "m", zileVot: {} }), binance: { urmarite: "<q>", aparitii: 2, monede: ["<img>", "OK1", "a b"], verdict: "ramane" }, cazuri: "text" }));
  const zona = h.slice(h.indexOf('<div id="agZonaBilant">'), h.indexOf('<div id="agZonaNote">'));
  assert.ok(!/<(img|script|i|u|s|a|q)[\s>]/i.test(zona), "niciun marcaj venit din rezumat"); assert.match(text(zona), /numărat de colector din —/); assert.match(text(zona), /Mesaje pe zi: —: 0 \(zi neîntreagă\)\. Fără verdict încă: 0 din 7 zile întregi/);
  assert.match(text(zona), /urmărit 0 zile \(azi: 0 citiri\); apariții: la 1 monedă \(OK1\)/);
});
await test("B6. „Cum citesc lista” spune criteriile, scrise din aceleași constante: 7 zile și 5 pe zi; o oră și 4 ore, 0,5 puncte, 10 minute, 30 de zile și 150 de cazuri, pe zile; 14 zile", () => {
  const t = text(cuBilant(bl())), nota = t.slice(t.indexOf("Cum citesc lista"));
  assert.match(nota, /Bilanțul alertelor îl ține colectorul, pe zilele României\. Criteriile sunt scrise dinainte și nu se schimbă după ce se văd cifrele; o schimbare a pragului repornește numărătoarea\./);
  assert.match(nota, /Mesaje pe zi: media ultimelor 7 zile întregi \(zi întreagă = urmărită cel puțin 20 de ore\) față de ținta de cel mult 5 pe zi\./);
  assert.match(nota, /După aprindere: doar aprinderile singure care au o direcție \(netul orei trece de 0,3 din mișcare\)\. La o oră și la 4 ore după, prețul din lista Pionex față de cel de la aprindere: cu cel puțin 0,5 puncte în sensul ei „a continuat”, împotriva ei „s-a întors”, între ele „pe loc”; prețul citit cu peste 10 minute întârziere nu se pune\./);
  assert.match(nota, /Verdictul se dă o singură dată pe fiecare orizont, la cel puțin 30 de zile cu aprinderi și 150 de cazuri, și se judecă pe zile, fiindcă aprinderile aceleiași zile se trag unele după altele\. Nu e probă de strategie: fără costuri, fără intrări\./);
  assert.match(nota, /Peste Binance: colectorul compară la 15 minute; 14 zile urmărite fără nicio apariție înseamnă că semnul poate fi scos\./);
});

// ── E. legarea și versiunea ──
await test("E1. colectorul dă turei cererea directă spre Binance (cea cu pauze și oprire la interdicție); versiunea v101.217", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /await turaAgitate\(\{ acum: Date\.now\(\), cere: \(cale\) => cere\(cale, \{ faraContorPret: true \}\), binance: binanceDirect, trimite, trimiteAlerta, jurnal,/);
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(c) || [])[1] >= 217);
  /* revizia (R3): colectorul citește starea prin citesteStare (fișier necitit ≠ fișier gol) */
  assert.match(c, /import \{ citesteStare \} from "\.\/lib\/tura-agitate\.mjs";/); assert.match(c, /citesteDisc: \(\) => citesteStare\(\{ citeste: \(\) => fs\.readFileSync\(AGITATE_F, "utf8"\), deoparte: \(\) => fs\.renameSync\(AGITATE_F, /);
  assert.ok(!/citesteDisc: \(\) => \{ try \{ return JSON\.parse\(fs\.readFileSync\(AGITATE_F/.test(c), "forma veche (orice eroare ⇒ {}) a ieșit");
  const t = citeste("scripts", "lib", "tura-agitate.mjs"); assert.match(t, /import \{ ziRo \} from "\.\/alerte-zi\.mjs";/); assert.equal(T.BINANCE_MS, 15 * 60000); assert.equal(T.JURNAL_ZILE, 120); assert.equal(T.URMARI_ZILE, 90);
});
await test("V. versiunea de la v100.399 în sus (index ×4, sw, versiune.js, package + lanț după v100.398, BUILD_INFO)", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  assert.ok(+pk.version.split(".")[1] >= 399); assert.ok(bi.li399 && bi.li399.length > 100);
  assert.ok((citeste("public", "index.html").match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 399).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 399);
  assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 399);
  assert.match(pk.scripts.test, /npm run test:v100398 && npm run test:v100399 && /); assert.equal(pk.scripts["test:v100399"], "node scripts/proba-v100399-agitate-bilant.mjs");
});
console.log(`\nproba v100.399 (bilanțul alertelor „Agitate acum”): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
