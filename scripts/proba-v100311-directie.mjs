// Proba v100.311 / colector v101.169 (07.11.2026, el: „nu vrei să-mi dai o direcție reală a unui coin” ⇒ „hai să facem ambele” ⇒
// „da, sunt de acord, fă-le pe amândouă”): „🎯 Direcția pe 7 zile (în probă)” - partea din Radar a probei
// pine-scripts\_proba-directie-2026-11-07 (jurnalul § 6, § 9; istoricul: toate patru întrebările N-AM AFLAT ⇒ aici doar urmărire).
//   1. Echivalența cu motorul Python: 150 de perechi zi-monedă OOS (scripts/date/echivalenta-directie-2026-11-07.json) - intrări, P1, P2, semne.
//   2. Convenția funding-ului, judecata la 7 zile, urmărirea pe grila săptămânală.
//   3. Tura cap-coadă cu un Binance fals: primele 10 de pe Pionex după volum, ziua pe disc, judecata după 7 zile, zilele lipsă.
//   4. Ruta /api/istoric-bot?action=directie, colectorul, pagina Sugestii (grupul „dir”, în probă - fără Poartă, fără sumă).
//   node scripts/proba-v100311-directie.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as D from "./lib/tura-directie.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.311 · direcția pe 7 zile (în probă) · proba\n");
const ZI = 86400000, ORA = 3600000;
const aproape = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ── 1. echivalența cu Python ──
const EQ = JSON.parse(citeste("scripts", "date", "echivalenta-directie-2026-11-07.json"));
await test("🔑 echivalența cu motorul Python: 174 de perechi (150 OOS reale + 24 sintetice CU GOLURI în bare / volume) - z28, z7, r28, vtr, fund, btc28, P1, P2 la 1e-9; s1, s2 identice", () => {
  assert.equal(EQ.cazuri.filter((c) => c.sintetic).length, 24, "golurile (sigma / mediane / vtr pe valori lipsă) - revizia 07.11");
  assert.ok(EQ.cazuri.filter((c) => c.sintetic).every((c) => c.C.some((v) => v == null) || c.Q.some((v) => v == null)));
  let bune = 0; const rele = [];
  for (const c of EQ.cazuri) {
    const n = c.C.length, zile = Array.from({ length: n }, (_, q) => new Date(Date.parse(c.zi + "T00:00:00Z") - (n - 1 - q) * ZI).toISOString().slice(0, 10));
    const p = { zile, sim: ["BTCUSDT", c.sim], C: zile.map((_, q) => [c.CB[q], c.C[q]]), Q: zile.map((_, q) => [c.QB[q], c.Q[q]]) };
    const x = D.intrari(p, n - 1, 1, 0, c.funding, c.astept.btcEma);
    const a = c.astept; let ok = !!x;
    if (x) { for (const k of ["z28", "z7", "r28", "vtr", "btc28"]) ok = ok && aproape(x[k], a[k]); ok = ok && Math.abs(x.fund - a.fund) < 1e-15; const s = D.semne(x); ok = ok && aproape(s.P1, a.P1, 1e-12) && aproape(s.P2, a.P2, 1e-9) && s.s1 === a.s1 && s.s2 === a.s2; }
    if (ok) bune++; else rele.push(c.sim + " " + c.zi + " " + JSON.stringify(x) + " vs " + JSON.stringify(a));
  }
  assert.equal(bune, EQ.cazuri.length, rele.slice(0, 2).join(" || "));
  assert.ok(EQ.cazuri.some((c) => c.astept.s1 > 0) && EQ.cazuri.some((c) => c.astept.s1 < 0) && EQ.cazuri.some((c) => c.astept.s2 > 0) && EQ.cazuri.some((c) => c.astept.s2 < 0));
});
await test("echivalența: EMA50 a BTC (ewm span 50, adjust=False) pe seria lungă dă btcEma-ul din Python", () => {
  assert.ok(aproape(D.emaBtc(EQ.btcLung.C), EQ.btcLung.btcEma, 1e-12), D.emaBtc(EQ.btcLung.C) + " vs " + EQ.btcLung.btcEma);
});

// ── 2. funding, judecata, urmărirea ──
await test("🔑 funding-ul: media pe [T−72 h, T); decontarea de la 00:00 a zilei t+1 (cu ms în plus) e a ȚINERII, nu a celor 72 h", () => {
  const T = Date.parse("2026-11-08T00:00:00Z");
  const f = [{ fundingTime: T - 72 * ORA + 7, fundingRate: "0.001" }, { fundingTime: T - 8 * ORA + 12, fundingRate: "0.003" }, { fundingTime: T + 9, fundingRate: "0.5" }, { fundingTime: T - 80 * ORA, fundingRate: "0.9" }];
  const a = D.fundingIn(f, T - 72 * ORA, T); assert.equal(a.n, 2); assert.ok(Math.abs(a.s - 0.004) < 1e-15);
  const b = D.fundingIn(f, T, T + 7 * ZI); assert.equal(b.n, 1); assert.equal(b.s, 0.5);
});
await test("🔑 judecata: y = s·r7 − 0,2% − s·Σf (long plătește funding-ul pozitiv), față de piață, Brier față de climatologie", () => {
  const o = D.judeca({ s1: 1, P1: 0.6, s2: -1, P2: 0.3 }, 0.05, 0.002, 0.01);
  assert.ok(Math.abs(o.y1 - (0.05 - 0.002 - 0.002)) < 1e-15 && Math.abs(o.y2 - (-0.05 - 0.002 + 0.002)) < 1e-15);
  assert.ok(Math.abs(o.yr1 - (0.04 - 0.002 - 0.002)) < 1e-15 && Math.abs(o.yr2 - (-0.04 - 0.002 + 0.002)) < 1e-15);
  assert.equal(o.u, 1); assert.ok(Math.abs(o.b1 - 0.16) < 1e-15 && Math.abs(o.b2 - 0.49) < 1e-15 && Math.abs(o.bClim - (D.COEF.bazaIs - 1) ** 2) < 1e-15);
});
await test("urmărirea: perechile (nimerirea, media), grila săptămânală de la start (doar zilele start + 7k), zilele incomplete nu intră", () => {
  const z = (zi, s1, r7, incomplet = false) => ({ zi, gata7: true, incomplet, piata7: 0, monede: [{ s1, P1: 0.5, s2: s1, P2: 0.5, j7: D.judeca({ s1, P1: 0.5, s2: s1, P2: 0.5 }, r7, 0, 0) }] });
  const zile = [z("2026-11-07", 1, 0.1), z("2026-11-08", 1, -0.1), z("2026-11-14", -1, -0.05), z("2026-11-15", 1, 0.2, true)];
  const u = D.urmarire(zile, "2026-11-07");
  assert.equal(u.zile, 3); assert.equal(u.perechi, 3); assert.equal(u.M1.abs.n, 3);
  assert.ok(Math.abs(u.M1.abs.nimerire - 2 / 3) < 1e-12); assert.equal(u.M1.abs.sapt, 2, "doar 07.11 și 14.11 sunt pe grilă");
  assert.ok(Math.abs(u.M1.abs.medieSapt - ((0.1 - 0.002) + (0.05 - 0.002)) / 2) < 1e-12); assert.equal(u.M1.abs.p, null, "sub 8 săptămâni: fără p");
});

// ── 3. tura cap-coadă ──
const T0 = Date.parse("2026-01-01T00:00:00Z");
// revizia 07.11: funding-ul DIFERĂ de la o decontare la alta (ciclu de 5 decontări = 40 h; NU 7: o săptămână are 21 = 3 × 7 decontări și
// fereastra de ținere mutată cu o decontare ar schimba două rate egale), ca o fereastră mutată cu 8 h să se vadă
const fRate = (t) => 1e-5 * (1 + (Math.round(t / (8 * ORA)) % 5));
const fSuma = (a, b) => { let s = 0; for (let t = a; t < b; t += 8 * ORA) s += fRate(t); return s; };
// C105 își triplează volumul de la 27.10 ⇒ pe 07.11 e a 11-a (12 zile mari din 30), pe 12.11 urcă în primele 10 (17 din 30) și scoate C106
const VOL_PAS = Date.parse("2026-10-27T00:00:00Z");
function lume({ ultimaZi, lipsa = new Set(), faraFunding = new Set(), delistate = new Set() }) {
  const t1 = Date.parse(ultimaZi + "T00:00:00Z"), simb = ["BTCUSDT", ...Array.from({ length: 119 }, (_, k) => "C" + k + "USDT")];
  const pret = (s, t) => { const k = simb.indexOf(s), dn = (t - T0) / ZI; return 100 * Math.exp((k % 2 ? -1 : 1) * 0.004 * (1 + (k % 5)) * dn + 0.03 * Math.sin(dn / 3 + k)); };
  const cereri = [];
  const binance = async (url) => {
    cereri.push(url);
    if (url.includes("/exchangeInfo")) return { symbols: simb.filter((s) => !delistate.has(s)).map((s) => ({ symbol: s, contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" })) };
    const s = decodeURIComponent((url.match(/symbol=([^&]+)/) || [])[1] || ""), lim = Number((url.match(/limit=(\d+)/) || [])[1] || 0);
    if (url.includes("/klines")) { if (lipsa.has(s) || delistate.has(s)) return null; return Array.from({ length: lim }, (_, i) => { const t = t1 - (lim - 1 - i) * ZI; return [t, "1", "1", "1", String(pret(s, t)), "0", t + ZI - 1, String(s === "BTCUSDT" ? 5e9 : 1e7 * (1 + simb.indexOf(s)) * (s === "C105USDT" && t >= VOL_PAS ? 3 : 1))]; }); }
    if (url.includes("fundingRate")) { if (faraFunding.has(s)) return null; const st = Number(url.match(/startTime=(\d+)/)[1]), en = Number(url.match(/endTime=(\d+)/)[1]), l = []; for (let t = Math.ceil(st / (8 * ORA)) * 8 * ORA; t <= en; t += 8 * ORA) l.push({ fundingTime: t + 9, fundingRate: String(fRate(t)) }); return l; }
    return null;
  };
  binance.reia = () => true; binance.stare = { oprit: null };
  return { binance, cereri, pret };
}
function disc() { const m = new Map(); return { m, listaZile: () => [...m.keys()].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort(), citesteZi: (x) => (m.has(x) ? JSON.parse(m.get(x)) : null), scrieZi: (x, o) => m.set(x, JSON.stringify(o)) }; }
// pe Pionex: BTC + C100 … C114 (C114 are cel mai mare volum dintre altcoin-uri)
const pionexCere = async (c) => (c.includes("pionex_tickers") ? { data: { tickers: [{ symbol: "BTC_USDT_PERP" }, ...Array.from({ length: 15 }, (_, k) => ({ symbol: "C" + (100 + k) + "_USDT_PERP" }))] } } : null);

await test("🔑 tura: ziua de ieri pe disc cu primele 10 de pe Pionex după volum (BTC, C114 … C106), direcții + probabilități; KV o dată; a doua oară azi: nimic", async () => {
  const Dk = disc(), trimise = [], jur = [], st = {};
  const L = lume({ ultimaZi: "2026-11-07" });
  const r = await D.turaDirectie({ binance: L.binance, cere: pionexCere, trimite: async (c, o) => trimise.push([c, o]), jurnal: (...a) => jur.push(a.join(" ")), acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st);
  assert.ok(r, jur.join(" | "));
  assert.equal(st.start, "2026-11-07"); assert.equal(st.zi, "2026-11-08");
  const z = Dk.citesteZi("2026-11-07");
  assert.deepEqual(z.monede.map((m) => m.b), ["BTCUSDT", "C114USDT", "C113USDT", "C112USDT", "C111USDT", "C110USDT", "C109USDT", "C108USDT", "C107USDT", "C106USDT"]);
  assert.deepEqual(z.monede.map((m) => m.s).slice(0, 2), ["BTC_USDT_PERP", "C114_USDT_PERP"]);
  assert.equal(z.nElig, 120); assert.equal(Object.keys(z.eligibili).length, 120);
  for (const m of z.monede) { assert.ok(m.s1 === 1 || m.s1 === -1); assert.ok(m.s2 === 1 || m.s2 === -1); assert.ok(m.P1 > 0 && m.P1 < 1 && m.P2 > 0 && m.P2 < 1); const T = Date.parse("2026-11-08T00:00:00Z"); assert.ok(Math.abs(m.fund - fSuma(T - 72 * ORA, T) / 9) < 1e-15, "media celor 9 decontări din [T−72 h, T): " + m.fund); }
  assert.ok(z.monede.some((m) => m.s1 === 1) && z.monede.some((m) => m.s1 === -1), "trendurile alternează ⇒ ambele direcții");
  assert.equal(trimise.length, 1); assert.equal(trimise[0][0], "/api/istoric-bot?action=directie");
  const c = trimise[0][1]; assert.equal(c.zi, "2026-11-07"); assert.equal(c.start, "2026-11-07"); assert.equal(c.lista.length, 10); assert.ok(c.istoric && c.istoric.saptOos === 124 && c.urmarire);
  assert.match(jur.join("\n"), /directie: ziua 2026-11-07 · 10 monede \(M1 sus: \d+, M2 sus: \d+\)/);
  assert.equal(await D.turaDirectie({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T12:00:00Z"), ...Dk }, st), null);
});
await test("tura: înainte de 8:00 ora României nu pornește; Binance cu IP interzis ⇒ sare, reîncearcă peste 2 ore; bara BTC a zilei lipsă ⇒ nimic scris", async () => {
  const L = lume({ ultimaZi: "2026-11-07" }), Dk = disc();
  assert.equal(await D.turaDirectie({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T05:30:00Z"), ...Dk }, {}), null);
  assert.equal(L.cereri.length, 0);
  const b = lume({ ultimaZi: "2026-11-07" }).binance; b.reia = () => false; const st = {};
  assert.equal(await D.turaDirectie({ binance: b, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st), null); assert.ok(st.esecLa > 0);
  const L2 = lume({ ultimaZi: "2026-11-06" }), st2 = {};
  assert.equal(await D.turaDirectie({ binance: L2.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st2), null);
  assert.equal(Dk.listaZile().length, 0); assert.ok(st2.esecLa > 0);
});
await test("🔑 tura: după 7 zile ziua se judecă (r7 din închideri, funding-ul de ținere 21 × 0,01%), zilele lipsă 08–14.11 se recuperează din barele lor", async () => {
  const Dk = disc(), st = {}, trimise = [];
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st);
  const L = lume({ ultimaZi: "2026-11-14" });
  await D.turaDirectie({ binance: L.binance, cere: pionexCere, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2026-11-15T07:30:00Z"), ...Dk }, st);
  assert.deepEqual(Dk.listaZile(), ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
  const z = Dk.citesteZi("2026-11-07"); assert.equal(z.gata7, true);
  const t7 = Date.parse("2026-11-14T00:00:00Z"), t0 = Date.parse("2026-11-07T00:00:00Z");
  for (const m of z.monede) {
    const r7 = L.pret(m.b, t7) / L.pret(m.b, t0) - 1;
    const fh = fSuma(Date.parse("2026-11-08T00:00:00Z"), Date.parse("2026-11-15T00:00:00Z"));   // [T, T+7 z): 21 de decontări, cu cea de la T
    assert.ok(Math.abs(m.j7.r7 - r7) < 1e-12, m.b); assert.ok(Math.abs(m.j7.fh - fh) < 1e-15, m.b + " " + m.j7.fh + " vs " + fh);
    assert.ok(Math.abs(m.j7.y1 - (m.s1 * r7 - 0.002 - m.s1 * fh)) < 1e-12);
  }
  assert.ok(Math.abs(z.piata7 - Object.keys(z.eligibili).reduce((s, sym) => s + L.pret(sym, t7) / L.pret(sym, t0) - 1, 0) / 120) < 1e-12);
  assert.ok(Math.abs(z.piata10 - z.monede.reduce((s, m) => s + m.j7.r7, 0) / 10) < 1e-12, "piața celor 10 (rel10)");
  for (const m of z.monede) assert.ok(Math.abs(m.j7.yq1 - (m.s1 * (m.j7.r7 - z.piata10) - 0.002 - m.s1 * m.j7.fh)) < 1e-12);
  assert.equal(Dk.citesteZi("2026-11-08").gata7, undefined, "08.11 + 7 = 15.11 > ziua de ieri ⇒ încă nejudecată");
  const u = trimise[0].urmarire; assert.equal(u.zile, 1); assert.equal(u.perechi, 10); assert.equal(u.M1.abs.sapt, 1);
});
await test("tura: o monedă din cele 10 fără bare la judecată (încă listată) ⇒ ziua NU se judecă (se reîncearcă); funding picat la alegere ⇒ ziua nu se scrie", async () => {
  const Dk = disc(), st = {};
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st);
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-14", lipsa: new Set(["C110USDT"]) }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-15T07:30:00Z"), ...Dk }, st);
  assert.equal(Dk.citesteZi("2026-11-07").gata7, undefined);
  const Dk2 = disc(), st2 = {};
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07", faraFunding: new Set(["C112USDT"]) }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk2 }, st2);
  assert.equal(Dk2.citesteZi("2026-11-07"), null, "ziua cu funding picat nu se scrie pentru totdeauna"); assert.ok(st2.esecLa > 0);
});
await test("tura: o monedă DELISTATĂ în ținere iese la ultima închidere văzută (z.ultim), nu blochează judecata", async () => {
  const Dk = disc(), st = {};
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st);
  st.zi = null; st.esecLa = 0;
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-10" }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-11T07:30:00Z"), ...Dk }, st);
  assert.equal(Dk.citesteZi("2026-11-07").ultim.C108USDT[0], "2026-11-10");
  st.zi = null; st.esecLa = 0;
  const L = lume({ ultimaZi: "2026-11-14", delistate: new Set(["C108USDT"]) });
  await D.turaDirectie({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-15T07:30:00Z"), ...Dk }, st);
  const z = Dk.citesteZi("2026-11-07"), m = z.monede.find((x) => x.b === "C108USDT");
  assert.equal(z.gata7, true); assert.ok(Math.abs(m.j7.r7 - (L.pret("C108USDT", Date.parse("2026-11-10T00:00:00Z")) / L.pret("C108USDT", Date.parse("2026-11-07T00:00:00Z")) - 1)) < 1e-12);
});
// ── revizia 07.11 ──
const fara = { trimite: async () => {}, jurnal: () => {} };
await test("🔑 revizia: ziua RECUPERATĂ (07.11 refăcută pe 13.11) e identică cu cea calculată în ziua ei; pe 12.11 C105 a intrat în primele 10 și a scos C106", async () => {
  const D1 = disc(); await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T07:30:00Z"), ...D1 }, {});
  const D2 = disc(); await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-12" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-13T07:30:00Z"), ...D2 }, { start: "2026-11-07" });
  const a = D1.citesteZi("2026-11-07"), b = D2.citesteZi("2026-11-07");
  assert.deepEqual(b.monede.map((m) => m.b), a.monede.map((m) => m.b), "aceleași 10 (C105 încă a 11-a pe 07.11)");
  b.monede.forEach((m, q) => { for (const k of ["z28", "z7", "btc28", "btcEma", "fund", "vtr", "P1", "P2"]) assert.ok(Math.abs(m[k] - a.monede[q][k]) < 1e-12, m.b + " " + k); assert.equal(m.s2, a.monede[q].s2); });
  const z12 = D2.citesteZi("2026-11-12").monede.map((m) => m.b); assert.ok(z12.includes("C105USDT") && !z12.includes("C106USDT"), z12.join(","));
});
await test("🔑 revizia: lista Pionex picată ⇒ nicio zi scrisă (nu una goală pentru totdeauna), reîncearcă peste 2 ore; cu lista ⇒ ziua cu 10 monede", async () => {
  const Dk = disc(), st = {}, tr = [];
  assert.equal(await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: async () => { throw new Error("Pionex 503"); }, trimite: async (c, o) => tr.push(o), jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st), null);
  assert.equal(Dk.listaZile().length, 0); assert.equal(tr.length, 0); assert.ok(st.esecLa > 0);
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T10:00:00Z"), ...Dk }, st);
  assert.equal(Dk.citesteZi("2026-11-07").monede.length, 10);
});
await test("revizia: o monedă de pe Pionex fără bare azi (poate fi din primele 10) ⇒ ziua nu se scrie; un eligibil fără bare la judecată ⇒ ziua nu se judecă", async () => {
  const Dk = disc(), st = {};
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07", lipsa: new Set(["C107USDT"]) }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st);
  assert.equal(Dk.citesteZi("2026-11-07"), null, "C108..C105 ar fi intrat în locul lui C107"); assert.ok(st.esecLa > 0);
  const Dk2 = disc();
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk2 }, {});
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-14", lipsa: new Set(["C5USDT"]) }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-15T07:30:00Z"), ...Dk2 }, {});
  assert.equal(Dk2.citesteZi("2026-11-07").gata7, undefined, "C5 (nu e pe Pionex, dar e în piață) fără bare ⇒ reîncerc, nu închid cu piața pe 119");
});
await test("revizia: starea pierdută ⇒ startul rămâne prima zi de pe disc (grila săptămânală nu se mută)", async () => {
  const Dk = disc();
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, {});
  const st2 = {}; await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-09" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-10T07:30:00Z"), ...Dk }, st2);
  assert.equal(st2.start, "2026-11-07");
});
await test("revizia: privirea se scrie O DATĂ după data ei și apoi se citește de pe disc (nu se recalculează)", async () => {
  const Dk = disc(), st = {}, R = { ...D.REG, priviri: ["2026-11-10"] };
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-07" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-08T07:30:00Z"), ...Dk }, st, R);
  assert.equal(Dk.citesteZi("privire-2026-11-10"), null, "înainte de data ei: nimic");
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-11" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-12T07:30:00Z"), ...Dk }, st, R);
  const v1 = Dk.citesteZi("privire-2026-11-10"); assert.ok(v1 && v1.scrisLa === Date.parse("2026-11-12T07:30:00Z") && /doar urmărire/.test(v1.verdict));
  await D.turaDirectie({ binance: lume({ ultimaZi: "2026-11-12" }).binance, cere: pionexCere, ...fara, acum: Date.parse("2026-11-13T07:30:00Z"), ...Dk }, st, R);
  assert.equal(Dk.citesteZi("privire-2026-11-10").scrisLa, v1.scrisLa);
});
await test("🔑 revizia: p pe blocuri de 2 săptămâni = semnul schimbat pe bloc, media pe SĂPTĂMÂNI (ca Python); exact: [1, 2, −0,5, 3]% ⇒ p = 1/4", () => {
  assert.equal(D.pBlocuri([0.01, 0.02, -0.005, 0.03]), 0.25);
  // enumerarea completă scrisă separat (semn pe bloc, media pe săptămâni) pe 50 de vectori de 9 săptămâni (5 blocuri, ultimul de 1)
  let s = 12345; const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647) - 0.5;
  let deosebite = 0;
  for (let v = 0; v < 50; v++) {
    const W = Array.from({ length: 9 }, () => 0.04 * rnd()), nb = 5, obs = W.reduce((a, b) => a + b, 0) / 9 - 1e-15;
    let peste = 0, pesteB = 0; const mb = [0, 1, 2, 3, 4].map((b) => { const x = W.slice(2 * b, 2 * b + 2); return x.reduce((a, c) => a + c, 0) / x.length; }), obsB = mb.reduce((a, c) => a + c, 0) / nb - 1e-15;
    for (let k = 0; k < 32; k++) { let t = 0, tb = 0; for (let q = 0; q < 9; q++) t += ((k >> Math.floor(q / 2)) & 1 ? -1 : 1) * W[q]; for (let b = 0; b < nb; b++) tb += ((k >> b) & 1 ? -1 : 1) * mb[b]; if (t / 9 >= obs) peste++; if (tb / nb >= obsB) pesteB++; }
    assert.equal(D.pBlocuri(W), peste / 32, "vectorul " + v); if (peste !== pesteB) deosebite++;
  }
  assert.ok(deosebite > 0, "printre cei 50 există vectori unde media pe blocuri ar da alt p (testul deosebește cele două)");
});
await test("revizia: urmărirea față de piață cu piața NENULĂ (rel ≠ abs) și față de media celor 10 (rel10); p apare de la 8 săptămâni pe grilă", () => {
  const zile = [];
  for (let w = 0; w < 9; w++) { const zi = new Date(Date.parse("2026-11-07T00:00:00Z") + w * 7 * ZI).toISOString().slice(0, 10), r7 = 0.02 * (w % 3 - 1); zile.push({ zi, gata7: true, piata7: -0.01, piata10: 0.005, monede: [{ s1: 1, P1: 0.5, s2: -1, P2: 0.4, j7: D.judeca({ s1: 1, P1: 0.5, s2: -1, P2: 0.4 }, r7, 0, -0.01, D.REG, 0.005) }] }); }
  const u = D.urmarire(zile, "2026-11-07");
  assert.equal(u.M1.abs.sapt, 9); assert.ok(u.M1.abs.p > 0 && u.M1.abs.p <= 1); assert.ok(u.M1.rel.p != null && u.M1.rel10.p != null);
  assert.ok(Math.abs(u.M1.rel.medie - (u.M1.abs.medie + 0.01)) < 1e-12, "față de piață = abs + 1% (piața −1%)");
  assert.ok(Math.abs(u.M1.rel10.medie - (u.M1.abs.medie - 0.005)) < 1e-12);
  assert.ok(Math.abs(u.M2.rel.medie - (u.M2.abs.medie - 0.01)) < 1e-12, "M2 short: față de piață = abs − 1%");
});

// ── 4. serverul, colectorul, pagina ──
await test("🔑 serverul: POST directie cere la + zi + lista (≤ 20) + urmarire; GET o dă înapoi; plafonul 128 KB", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=directie", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=directie", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.2" } }), env: ENV });
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: [] })).status, 400, "fără urmarire");
  assert.equal((await post({ la: 1, zi: "7.11", lista: [], urmarire: {} })).status, 400);
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: Array(21).fill({}), urmarire: {} })).status, 400);
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: [{ s: "BTC_USDT_PERP" }], urmarire: { zile: 0 } })).status, 200);
  assert.deepEqual((await (await get()).json()).directie, { la: 1, zi: "2026-11-07", lista: [{ s: "BTC_USDT_PERP" }], urmarire: { zile: 0 } });
  const { plafonIstoricBot } = await import("../functions/_shared/plafon-corp.js");
  assert.equal(plafonIstoricBot("directie"), 131072);
});
await test("colectorul: importă turaDirectie, o pornește o dată pe zi la turele grele, zilele în data/directie, v101.169", () => {
  const C = citeste("scripts", "colector.mjs");
  assert.match(C, /import \{ turaDirectie as turaDirectieModul \} from "\.\/lib\/tura-directie\.mjs";/);
  assert.match(C, /const VERSIUNE_COLECTOR = "v101\.169"/);
  assert.match(C, /const DIRECTIE_DIR = path\.join\(DATA, "directie"\)/);
  // după căderi, nu în paralel: amândouă cer ~520 de bare zilnice (ponderea 2) ⇒ împreună s-ar apropia de 2.400 / minut la Binance
  assert.match(C, /if \(val\.grele\) turaCaderiColector\(\)\.catch\(\(e\) => jurnal\("caderi", e\.message\)\)\.then\(\(\) => turaDirectieColector\(\)\)\.catch\(\(e\) => jurnal\("directie", e\.message\)\);/);
  assert.match(C, /stareDeDisc\("directie-stare\.json"\)/);
});

const J = (x) => JSON.parse(JSON.stringify(x));
function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugHtml = sugHtml; this.sugGrupuri = sugGrupuri; this.sugRanduri = sugRanduri; this.sugFisa = sugFisa; this.sugStare = sugStare; this.SUG_GRUPURI = SUG_GRUPURI;", ctx);
  return ctx;
}
const m1 = (s, s1, P1, s2, P2, extra = {}) => ({ s, b: s.replace("_USDT_PERP", "USDT"), mult: 1, c: 1.5, med: 2e8, z28: 1.2, z7: -0.4, r28: 0.15, btc28: 0.3, btcEma: -0.04, fund: 0.0001, vtr: 0.1, s1, P1, s2, P2, ...extra });
const DIR = { la: Date.parse("2026-11-08T07:30:00Z"), zi: "2026-11-07", start: "2026-11-07", nElig: 190, incomplet: false, pionexLipsa: false,
  lista: [m1("BTC_USDT_PERP", -1, 0.468, -1, 0.41), m1("SOL_USDT_PERP", 1, 0.49, 1, 0.64)], urmarire: { zile: 0, perechi: 0, brier: {}, M1: { abs: { n: 0 }, rel: { n: 0 } }, M2: { abs: { n: 0 }, rel: { n: 0 } }, priviri: [] }, istoric: D.ISTORIC };
await test("🔑 pagina: grupul „🎯 Monede Pionex · direcția pe 7 zile (în probă)” după căderi, cu ÎN PROBĂ; rândurile cu M1 / M2 ▲▼ și probabilitățile", () => {
  const P = pagina(), d = { directie: DIR };
  assert.deepEqual(J(P.SUG_GRUPURI.map((g) => g[0])), ["porn", "cad", "dir", "revUS", "revEU", "sect", "trend"]);
  const g = P.sugGrupuri(d, DIR.la).find((x) => x.k === "dir");
  assert.equal(g.verdict, "ÎN PROBĂ"); assert.match(g.sub, /ziua UTC 07\.11\.2026 · primele 10 monede Pionex după volum/);
  const r = P.sugRanduri(d, DIR.la).filter((x) => x.grup === "dir");
  assert.deepEqual(J(r.map((x) => [x.s, x.dir])), [["BTC", "M1 ▼ · M2 ▼"], ["SOL", "M1 ▲ · M2 ▲"]]);
  assert.match(r[1].sub, /P sus: M1 49% · M2 64% · 28 z \+15% · BTC sub EMA50/);
  assert.ok(r[1].avert.some((a) => /Probabilitățile M2 nu se țin pe istoric: când a spus ~64% „sus”, a urcat 42% din cazuri\./.test(a)), "M2 la 64% ⇒ istoric 42% (calibrarea)");
  assert.ok(r[0].avert.some((a) => /când a spus ~43% „sus”, a urcat 44% din cazuri/.test(a)), "BTC cu P2 41% ⇒ coșul cel mai apropiat (43% ⇒ 44%)");
});
await test("🔑 pagina: fișa direcției - celulele, istoricul probei (N-AM AFLAT pe toate 4), urmărirea; fără Poartă și fără sumă", () => {
  const P = pagina(), d = { directie: DIR }, r = P.sugRanduri(d, DIR.la).find((x) => x.grup === "dir" && x.s === "SOL"), f = P.sugFisa(r, d, DIR.la);
  assert.deepEqual(J(f.cele.map((c) => c.et)), ["M1 · momentum", "M2 · combinat", "28 de zile", "7 zile", "BTC", "Funding 72 h"]);
  assert.equal(f.verdict, "ÎN PROBĂ");
  assert.match(f.dovada.join(" "), /124 de săptămâni/); assert.match(f.dovada.join(" "), /N-AM AFLAT/); assert.match(f.dovada.join(" "), /Urmărit înainte de la 07\.11\.2026/);
  assert.ok(!f.actiuni.some((a) => /Poart/.test(a.et)), "fără Poartă"); assert.match(f.actNota, /fără Poartă și fără sumă/);
  const h = P.sugHtml(d, DIR.la); assert.match(h, /🎯 Monede Pionex · direcția pe 7 zile \(în probă\)/);
});
await test("pagina: fără date ⇒ „aștept tura de la 8:00”; lista veche (> 30 h) spusă; fetch pe action=directie", () => {
  const P = pagina();
  const g = P.sugGrupuri({}, Date.now()).find((x) => x.k === "dir"); assert.match(g.sub, /după 8:00/);
  const g2 = P.sugGrupuri({ directie: DIR }, DIR.la + 40 * ORA).find((x) => x.k === "dir"); assert.match(g2.sub, /LISTĂ VECHE/);
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /pas\("directie", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=directie"\)/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " — " + picate + " PICATE" : ""}\n`);
process.exit(picate ? 1 : 0);
