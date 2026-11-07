// Proba v100.308 / colector v101.168 (07.11.2026, el: „ok fă așa dar fă și sugestie de coinuri”): „📉 După o cădere mare (în probă)”.
//   1. Regulile din scripts/lib/tura-caderi.mjs pe serii construite (rezultatul știut dinainte) - aceleași ca proba Python
//      (pine-scripts\_proba-revenire-2026-11-07\revenire_motor.py; echivalența pe arhiva Binance: 630 de căderi identice, scratchpad echiv-caderi.mjs).
//   2. Tura cap-coadă cu un Binance fals: ziua de ieri, zilele lipsă recuperate, rezultatele la 3 / 7 zile, moneda care n-a venit nu se închide.
//   3. Ruta /api/istoric-bot?action=caderi (GET / POST) și plafonul ei.
//   4. Pagina Sugestii (în vm): grupul „cad”, rândurile, fișa, celula de verdict; în probă - fără Poartă, fără sumă.
//   node scripts/proba-v100308-caderi.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as K from "./lib/tura-caderi.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.308 · după o cădere mare (în probă) · proba\n");
const ZI = 864e5, ORA = 36e5, T0 = Date.parse("2026-04-22T00:00:00Z");
const z = (i) => K.ziUtc(T0 + i * ZI);
// un panou construit: n zile, simbolurile cu închiderile date (null = fără bară), volum 1e7
function pan(n, cols) { const s = Object.keys(cols).sort(); return { zile: Array.from({ length: n }, (_, i) => z(i)), sim: s, C: Array.from({ length: n }, (_, i) => s.map((k) => cols[k][i])), Q: Array.from({ length: n }, (_, i) => s.map((k) => cols[k][i] == null ? null : (cols[k].qv ? cols[k].qv[i] : 1e7))) }; }
const plat = (n, v = 100) => Array.from({ length: n }, () => v);

// ── 1. regulile ──
await test("universul: doar perpetue USDT TRADING crypto, fără indici / stablecoin / acțiuni / livrări", () => {
  const info = { symbols: [
    { symbol: "BTCUSDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" },
    { symbol: "TSLAUSDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "EQUITY" },
    { symbol: "BTCDOMUSDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "INDEX" },
    { symbol: "USDCUSDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" },
    { symbol: "ETHUSDT_261225", contractType: "CURRENT_QUARTER", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" },
    { symbol: "XUSDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "SETTLING", underlyingType: "COIN" },
    { symbol: "ETHUSDC", contractType: "PERPETUAL", quoteAsset: "USDC", status: "TRADING", underlyingType: "COIN" }] };
  assert.deepEqual(K.univers(info), ["BTCUSDT"]);
});
await test("barele: doar cele ÎNCHISE (closeTime < acum), ordonate", () => {
  const k = [[T0 + ZI, "1", "1", "1", "11", "0", T0 + 2 * ZI - 1, "500"], [T0, "1", "1", "1", "10", "0", T0 + ZI - 1, "400"], [T0 + 2 * ZI, "1", "1", "1", "12", "0", T0 + 3 * ZI - 1, "600"]];
  assert.deepEqual(K.bareInchise(k, T0 + 2 * ZI + 5).map((b) => b.c), [10, 11]);
});
await test("E: prima zi sub −25% (ziua 150) și a doua după pauză (171), nimic în pauză; −24% nu; listată de 30 de zile nu", () => {
  const n = 200, X = plat(n), Y = plat(n), N = plat(n), B = plat(n);
  for (let i = 150; i < n; i++) X[i] = 74; for (let i = 160; i < 163; i++) X[i] = 99; for (let i = 163; i < n; i++) X[i] = 70; for (let i = 170; i < n; i++) X[i] = 99; for (let i = 171; i < n; i++) X[i] = 72;
  for (let i = 100; i < n; i++) Y[i] = 76; for (let i = 0; i < 120; i++) N[i] = null; for (let i = 150; i < n; i++) N[i] = 50;
  const p = pan(n, { BTCUSDT: B, XUSDT: X, YUSDT: Y, NUSDT: N }), { el } = K.eligibil(p);
  assert.deepEqual(K.evenimente(p, el).map(([i, j]) => [i, p.sim[j]]), [[150, "XUSDT"], [171, "XUSDT"]]);
});
await test("E: exact −25% intră (≤); volumul median pe 30 de zile (cu ziua t) sub 5 M ⇒ neeligibilă", () => {
  const n = 200, X = plat(n); for (let i = 150; i < n; i++) X[i] = 75;
  let p = pan(n, { BTCUSDT: plat(n), XUSDT: X });
  assert.deepEqual(K.evenimente(p, K.eligibil(p).el).map(([i]) => i), [150]);
  const qv = plat(n, 1e7); for (let i = 135; i <= 150; i++) qv[i] = 1e6; X.qv = qv;   // 16 zile mici din 30 în [121, 150] ⇒ mediana 1 M
  p = pan(n, { BTCUSDT: plat(n), XUSDT: X });
  assert.deepEqual(K.evenimente(p, K.eligibil(p).el), []);
  const qv2 = plat(n, 1e7); for (let i = 135; i <= 149; i++) qv2[i] = 1e6; X.qv = qv2;   // [121, 150]: 15 mici + 15 mari ⇒ mediana 5,5 M ⇒ eligibilă (fără ziua t: 15 din 29 mici ⇒ nu)
  p = pan(n, { BTCUSDT: plat(n), XUSDT: X });
  assert.deepEqual(K.evenimente(p, K.eligibil(p).el).map(([i]) => i), [150], "ziua t intră în mediana volumului");
});
await test("eligibil: listată de 80 de zile (< 90) ⇒ fără eveniment; de 91 ⇒ da", () => {
  const n = 200, Y = plat(n), W = plat(n);
  for (let i = 0; i < 70; i++) Y[i] = null; for (let i = 150; i < n; i++) Y[i] = 70;   // 80 de bare înainte de 150
  for (let i = 0; i < 59; i++) W[i] = null; for (let i = 150; i < n; i++) W[i] = 70;   // 91 de bare înainte de 150
  const p = pan(n, { BTCUSDT: plat(n), WUSDT: W, YUSDT: Y });
  assert.deepEqual(K.evenimente(p, K.eligibil(p).el).map(([i, j]) => [i, p.sim[j]]), [[150, "WUSDT"]]);
});
await test("B: monedă = BTC^1,5 ⇒ β 1,5 și s ≈ 0; BTC plat și moneda −30% singură ⇒ s ≈ 1", () => {
  let a = 7; const rnd = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const n = 200, lb = []; let s = 0; for (let i = 0; i < n; i++) { s += (rnd() - 0.5) * 0.06; lb.push(s); }
  const B = lb.map((v) => 100 * Math.exp(v)), X = lb.map((v) => 100 * Math.exp(1.5 * v)), p = pan(n, { BTCUSDT: B, XUSDT: X });
  const jx = p.sim.indexOf("XUSDT"), jb = p.sim.indexOf("BTCUSDT");
  let i = 190; while (i < n && !(Math.log(X[i] / Math.max(...X.slice(i - 29, i + 1))) < 0)) i++;
  const pp = K.parteProprie(p.C, i, jx, jb);
  assert.ok(pp && Math.abs(pp.beta - 1.5) < 1e-9 && Math.abs(pp.s) < 1e-9, JSON.stringify(pp));
  const B2 = B.slice(), X2 = B.map((v) => v); for (let k = 160; k < n; k++) B2[k] = B[159]; X2[175] = Math.max(...X2.slice(150, 176)) * 1.5; for (let k = 176; k < n; k++) X2[k] = X2[175] * 0.7;
  const p2 = pan(n, { BTCUSDT: B2, XUSDT: X2 }), pp2 = K.parteProprie(p2.C, 190, p2.sim.indexOf("XUSDT"), p2.sim.indexOf("BTCUSDT"));
  assert.ok(pp2 && pp2.m === 175 && pp2.s > 0.9, JSON.stringify(pp2));
});
await test("C: rangul de volum între eligibili (1 = cel mai mare)", () => {
  const n = 200, mk = (v) => Object.assign(plat(n), { qv: plat(n, v) }), p = pan(n, { AUSDT: mk(9e7), BUSDT: mk(5e7), CUSDT: mk(2e7), BTCUSDT: mk(1e9) }), { el, med } = K.eligibil(p);
  assert.deepEqual(["BTCUSDT", "AUSDT", "BUSDT", "CUSDT"].map((s) => K.rangVolum(el, med, n - 1, p.sim.indexOf(s))), [1, 2, 3, 4]);
});
const intrare = Date.parse("2026-11-08T00:00:00Z");
const oiSerie = (v1, v0) => { const l = []; for (let t = intrare - 80 * ORA; t < intrare + ORA; t += 15 * 60000) l.push({ timestamp: t, sumOpenInterest: String(t < intrare - 3 * ZI ? v0 : v1) }); return l; };
await test("A: OI −12% în 3 zile + funding negativ ⇒ A; −8% ⇒ nu; funding pozitiv ⇒ nu; fără OI ⇒ neclasificat (null)", () => {
  const fneg = [{ fundingTime: intrare - 8 * ORA + 7, fundingRate: "-0.0002" }, { fundingTime: intrare + 14, fundingRate: "-0.0004" }];
  let a = K.clasaA(oiSerie(880, 1000), fneg, intrare);
  assert.ok(a.A === true && Math.abs(a.oi + 0.12) < 1e-12 && Math.abs(a.f72 + 0.0003) < 1e-12, JSON.stringify(a));   // decontarea de la 00:00:00.014 = la intrare (rotunjită la secundă) ⇒ intră
  assert.equal(K.clasaA(oiSerie(920, 1000), fneg, intrare).A, false);
  assert.equal(K.clasaA(oiSerie(880, 1000), [{ fundingTime: intrare - ORA, fundingRate: "0.0001" }], intrare).A, false);
  assert.equal(K.clasaA([], fneg, intrare).A, null);
  assert.equal(K.clasaA(oiSerie(880, 1000).filter((x) => x.timestamp < intrare - 3 * ZI - 3 * ORA), fneg, intrare).A, null, "instantaneul de la sfârșitul zilei t lipsește (mai vechi de 2 h) ⇒ null");
  assert.equal(K.clasaA(oiSerie(880, 1000), [{ fundingTime: intrare - 73 * ORA, fundingRate: "-0.01" }], intrare).A, null, "decontarea în afara celor 72 h ⇒ fără funding");
});
await test("funding pe ținere: suma pe (intrare, ieșire], long plătește rata pozitivă", () => {
  const f = [{ fundingTime: 0, fundingRate: "0.001" }, { fundingTime: 8 * ORA + 3, fundingRate: "-0.002" }, { fundingTime: 16 * ORA, fundingRate: "0.003" }, { fundingTime: 24 * ORA, fundingRate: "0.004" }];
  assert.ok(Math.abs(K.fundingSuma(f, 8 * ORA, 24 * ORA) - 0.007) < 1e-12);
});
await test("ieșirea: ultima închidere ≤ t+h (delistată ⇒ ultima știută), nu înainte de intrare", () => {
  const C = [[10], [11], [null], [null]];
  assert.equal(K.inchidereLa(C, 0, 1, 3), 11); assert.equal(K.inchidereLa(C, 0, 2, 3), null);
});
await test("Pionex ↔ Binance: 1000PEPE / 1000000MOG / 1MBABYDOGE ⇒ baza; doar _USDT_PERP", () => {
  assert.deepEqual(["1000PEPEUSDT", "1000000MOGUSDT", "1MBABYDOGEUSDT", "SOLUSDT", "1INCHUSDT"].map(K.bazaBinance), ["PEPE", "MOG", "BABYDOGE", "SOL", "1INCH"]);
  assert.deepEqual(K.hartaPionex([{ symbol: "PEPE_USDT_PERP" }, { symbol: "AAVE_ETH_PERP" }, { symbol: "SOL_USDT_PERP" }]), { PEPE: "PEPE_USDT_PERP", SOL: "SOL_USDT_PERP" });
});
await test("testul: schimbarea semnelor exactă ([1,1,1] ⇒ 1/8; [1,−1] ⇒ 3/4); Holm se oprește la primul care nu trece", () => {
  assert.equal(K.pSemne([1, 1, 1]), 0.125); assert.equal(K.pSemne([1, -1]), 0.75);
  assert.deepEqual(K.holm({ A: 0.03, B: 0.001, C: 0.04 }, 0.05), { B: true, A: false, C: false });
  assert.deepEqual(K.holm({ A: 0.02, B: 0.001, C: 0.03 }, 0.05), { B: true, A: true, C: true });
});
await test("testGrup: sub 30 de evenimente / 8 blocuri ⇒ „prea devreme”; efect clar ⇒ p mic", () => {
  const l = []; for (let k = 0; k < 120; k++) l.push({ zi: K.ziUtc(Date.parse("2026-11-07T00:00:00Z") + Math.floor(k / 1) * ZI), s: "S" + (k % 12), y: 0.05 + ((k * 7919) % 13 - 6) / 1000 });
  assert.equal(K.testGrup(l.slice(0, 20)).motiv, "prea devreme");
  const t = K.testGrup(l); assert.ok(t.p != null && t.p < 0.01 && Math.abs(t.stat - 0.05) < 0.01, JSON.stringify(t));
});
await test("proba P: zilele cu ≥ 2 spălări (o zi cu 1 nu); la ≤ 3 zile = același episod; verdict abia de la 8 episoade", () => {
  const zile = []; for (let k = 0; k < 40; k++) zile.push({ zi: K.ziUtc(Date.parse("2026-11-07T00:00:00Z") + k * ZI), piata3: 0.03, reperP: 0, nA: [0, 5, 10, 11, 20, 24, 30].includes(k) ? 3 : k === 2 ? 1 : 0, gata3: true });
  const u = K.urmarire(zile, Date.parse("2026-12-30T00:00:00Z"));
  assert.equal(u.P.episoade, 6, "zilele 0, 5, 10 (+11 același), 20, 24, 30 ⇒ 6 episoade");
  assert.deepEqual(u.P.ultime.map((e) => e.zi), ["2026-11-12", "2026-11-17", "2026-11-27", "2026-12-01", "2026-12-07"]);
  assert.equal(u.P.verdict, undefined, "sub 8 episoade ⇒ fără verdict");
  assert.ok(Math.abs(u.P.medie - (0.03 - 0.002)) < 1e-12);
});
await test("urmărirea: fără verdict înainte de 01.03.2027; de la privire, verdictul pe A / B / C (Holm)", () => {
  const ev = (k) => ({ s: "S" + (k % 10), A: k % 2 === 0, B: k % 3 ? "piata" : "singura", C: k % 4 === 0, y3: 0.001, y7: 0.001, yb7: 0.001, r3: 0.001, r7: 0.001 });
  const zile = []; for (let k = 0; k < 140; k++) zile.push({ zi: K.ziUtc(Date.parse("2026-11-07T00:00:00Z") + k * ZI), ev: [ev(k), ev(k + 1)], gata3: true, gata7: true });
  assert.equal(K.urmarire(zile, Date.parse("2027-02-28T12:00:00Z")).verdict, null);
  const v = K.urmarire(zile, Date.parse("2027-03-01T12:00:00Z")).verdict;
  assert.ok(v && v.la === "2027-03-01" && v.alfa === 0.01 && ["A", "B", "C"].every((k) => typeof v[k] === "string"), JSON.stringify(v));
  const inc = zile.map((x, k) => k < 10 ? { ...x, incomplet: true } : x), u = K.urmarire(inc, Date.parse("2027-01-01T00:00:00Z"));
  assert.equal(u.zileIncomplete, 10); assert.equal(u.grupuri.E.n, 260, "zilele incomplete nu intră în probă");
});

// ── 2. tura cap-coadă, cu un Binance fals ──
function lumeBinance({ zileBare = 200, ultimaZi, crash = { s: "XUSDT", zi: null }, lipsa = new Set(), faraOI = new Set(), faraFunding = new Set(), delistate = new Set(), extra = [] }) {
  const t1 = Date.parse(ultimaZi + "T00:00:00Z"), simb = ["BTCUSDT", "XUSDT", ...Array.from({ length: 118 }, (_, k) => "C" + k + "USDT"), ...extra];
  const pret = (s, i) => { if ((s === "XUSDT" || s === crash.alta) && crash.zi && i >= Math.round((Date.parse(crash.zi + "T00:00:00Z") - t1) / ZI) + zileBare - 1) return 60; return 100 * (1 + 0.001 * (simb.indexOf(s) % 7) * Math.sin(i / 5)); };
  const cereri = [];
  const binance = async (url) => {
    cereri.push(url);
    if (url.includes("/exchangeInfo")) return { symbols: simb.filter((s) => !delistate.has(s)).map((s) => ({ symbol: s, contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" })) };
    const s = decodeURIComponent((url.match(/symbol=([^&]+)/) || [])[1] || "");
    if (url.includes("/klines")) { if (lipsa.has(s) || delistate.has(s)) return null; return Array.from({ length: zileBare }, (_, i) => { const t = t1 - (zileBare - 1 - i) * ZI; return [t, "1", "1", "1", String(pret(s, i)), "0", t + ZI - 1, String(s === "BTCUSDT" ? 5e9 : 2e7)]; }); }
    if (url.includes("openInterestHist")) { if (faraOI.has(s)) return null; const st = Number(url.match(/startTime=(\d+)/)[1]), en = Number(url.match(/endTime=(\d+)/)[1]), l = []; for (let t = st; t <= en; t += 15 * 60000) l.push({ timestamp: t, sumOpenInterest: String(t < en - ORA - 3 * ZI + ORA ? 1000 : 850) }); return l; }
    if (url.includes("fundingRate")) { if (faraFunding.has(s)) return null; const st = Number(url.match(/startTime=(\d+)/)[1]), en = Number(url.match(/endTime=(\d+)/)[1]), l = []; for (let t = Math.ceil(st / (8 * ORA)) * 8 * ORA; t <= en; t += 8 * ORA) l.push({ fundingTime: t + 9, fundingRate: "-0.0003" }); return l; }
    return null;
  };
  binance.reia = () => true; binance.stare = { oprit: null };
  return { binance, cereri };
}
function disc() { const m = new Map(); return { m, listaZile: () => [...m.keys()].filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort(), citesteZi: (x) => (m.has(x) ? JSON.parse(m.get(x)) : null), scrieZi: (x, o) => m.set(x, JSON.stringify(o)) }; }
const pionexCere = async (c) => (c.includes("pionex_tickers") ? { data: { tickers: [{ symbol: "X_USDT_PERP" }, { symbol: "C3_USDT_PERP" }] } } : null);

await test("🔑 tura: ziua de ieri pe disc, X căzută cu spălare (OI −15%, funding −0,03%), pe Pionex ⇒ în listă; KV o dată; jurnalul spune ziua", async () => {
  const D = disc(), trimise = [], jur = [], st = {};
  const L = lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07", alta: "C5USDT" } });
  const r = await K.turaCaderi({ binance: L.binance, cere: pionexCere, trimite: async (c, o) => trimise.push([c, o]), jurnal: (...a) => jur.push(a.join(" ")), acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, st);
  assert.ok(r, "tura a mers");
  const zi = D.citesteZi("2026-11-07");
  assert.deepEqual(zi.ev.map((e) => [e.s, e.pionex]), [["C5USDT", null], ["XUSDT", "X_USDT_PERP"]], "C5 a căzut și ea, dar nu e pe Pionex");
  zi.ev = zi.ev.filter((e) => e.s === "XUSDT");
  assert.ok(zi.ev[0].A === true, JSON.stringify(zi.ev));
  assert.ok(Math.abs(zi.ev[0].oi + 0.15) < 1e-9 && Math.abs(zi.ev[0].f72 + 0.0003) < 1e-12, JSON.stringify(zi.ev[0]));
  assert.equal(zi.nElig, 120); assert.equal(zi.incomplet, false);
  assert.equal(trimise.length, 1); assert.equal(trimise[0][0], "/api/istoric-bot?action=caderi");
  const c = trimise[0][1]; assert.equal(c.zi, "2026-11-07"); assert.equal(c.nE, 2); assert.equal(c.lista.length, 1, "lista: doar monedele care sunt și pe Pionex"); assert.equal(c.lista[0].s, "X_USDT_PERP"); assert.equal(c.lista[0].b, "XUSDT"); assert.equal(c.nPionex, 1); assert.equal(c.nA, 2);
  assert.ok(c.istoric && c.istoric.E.n === 6932 && c.urmarire && c.start === "2026-11-07");
  assert.match(jur.join("\n"), /caderi: ziua 2026-11-07 · 120 de monede eligibile · 2 căderi \(pe Pionex: 1; cu spălare: 2\)/);
  assert.equal(st.zi, "2026-11-08");
  // a doua oară în aceeași zi: nimic
  assert.equal(await K.turaCaderi({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T12:00:00Z"), ...D }, st), null);
});
await test("tura: înainte de 8:00 ora României nu pornește; Binance cu IP interzis (418) ⇒ sare ziua, reîncearcă peste 2 ore", async () => {
  const L = lumeBinance({ ultimaZi: "2026-11-07" }), D = disc();
  assert.equal(await K.turaCaderi({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T05:30:00Z"), ...D }, {}), null);
  assert.equal(L.cereri.length, 0);
  const b = L.binance; b.reia = () => false; const st = {};
  assert.equal(await K.turaCaderi({ binance: b, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, st), null);
  assert.ok(st.esecLa > 0 && L.cereri.length === 0);
});
await test("🔑 tura: zilele LIPSĂ (colectorul oprit) se recuperează, fiecare doar cu barele de până la ea; nu înainte de începutul probei", async () => {
  const D = disc(), L = lumeBinance({ ultimaZi: "2026-11-10", crash: { s: "XUSDT", zi: "2026-11-08" } });
  await K.turaCaderi({ binance: L.binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-11T07:30:00Z"), ...D }, {});
  assert.deepEqual(D.listaZile(), ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"]);
  assert.equal(D.citesteZi("2026-11-08").ev.length, 1); assert.equal(D.citesteZi("2026-11-08").recuperata, true);
  assert.equal(D.citesteZi("2026-11-09").ev.length, 0, "a doua zi sub prag nu mai e „prima zi”");
  assert.equal(D.citesteZi("2026-11-07").ev.length, 0);
});
await test("🔑 tura: la 3 zile rezultatul (net de cost și funding, față de piață); moneda care n-a venit ⇒ ziua se reia, nu se închide goală", async () => {
  const D = disc(), st = {};
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07" } }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, st);
  // peste 3 zile, dar klines pentru X pică ⇒ nu se închide
  st.zi = null;
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-10", crash: { s: "XUSDT", zi: "2026-11-07" }, lipsa: new Set(["XUSDT"]) }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-11T07:30:00Z"), ...D }, st);
  assert.ok(!D.citesteZi("2026-11-07").gata3, "X n-a venit ⇒ ziua rămâne deschisă");
  st.zi = null; const trimise = [];
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-10", crash: { s: "XUSDT", zi: "2026-11-07" } }).binance, cere: pionexCere, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2026-11-11T09:30:00Z"), ...D }, st);
  const zi = D.citesteZi("2026-11-07"), e = zi.ev[0];
  assert.ok(zi.gata3 && !zi.gata7, "3 zile da, 7 încă nu");
  assert.ok(Math.abs(e.g3 - 0) < 1e-12, "X stă la 60 după cădere ⇒ g3 = 0");
  assert.ok(Math.abs(e.f3 - (-0.0003 * 9)) < 1e-12, "9 decontări de 8 h în (intrare, intrare + 3 z] (00:00 + 9 ms ⇒ rotunjit la 00:00 ⇒ cea de la intrare nu intră, cea de la ieșire da)");
  assert.ok(Math.abs(e.r3 - (0 - 0.002 + 0.0027)) < 1e-12 && Math.abs(e.y3 - (e.r3 - zi.piata3)) < 1e-12, JSON.stringify(e));
  assert.ok(trimise[0].urmarire.zile >= 1);
});

// ── 3. serverul ──
await test("serverul: POST caderi cere la + zi + lista (≤ 20) + urmarire; GET o dă înapoi; plafonul 128 KB", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=caderi", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.2", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=caderi", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.2" } }), env: ENV });
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: [] })).status, 400, "fără urmarire");
  assert.equal((await post({ la: 1, zi: "7.11", lista: [], urmarire: {} })).status, 400);
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: Array(21).fill({}), urmarire: {} })).status, 400);
  assert.equal((await post({ la: 1, zi: "2026-11-07", lista: [{ s: "X_USDT_PERP" }], urmarire: { zile: 0 } })).status, 200);
  assert.deepEqual((await (await get()).json()).caderi, { la: 1, zi: "2026-11-07", lista: [{ s: "X_USDT_PERP" }], urmarire: { zile: 0 } });
  const { plafonIstoricBot } = await import("../functions/_shared/plafon-corp.js");
  assert.equal(plafonIstoricBot("caderi"), 131072);
});

// ── 4. pagina ──
const J = (x) => JSON.parse(JSON.stringify(x));   // tablourile din vm vin din alt realm
function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(citeste("public", "lib", "text-ro.js") + "\n" + citeste("public", "lib", "sugestii-ecran.js") + "\nthis.sugHtml = sugHtml; this.sugGrupuri = sugGrupuri; this.sugRanduri = sugRanduri; this.sugFisa = sugFisa; this.sugStare = sugStare; this.SUG_GRUPURI = SUG_GRUPURI;", ctx);
  return ctx;
}
const CAD = { la: Date.parse("2026-11-08T07:30:00Z"), zi: "2026-11-07", nElig: 188, nE: 3, nPionex: 2, nA: 1, incomplet: false, start: "2026-11-07",
  lista: [{ s: "X_USDT_PERP", b: "XUSDT", c: 0.6123, cadere: 0.31, vol: 1.2e7, rang: 45, A: true, oi: -0.15, f72: -0.0015, B: "singura", bs: 0.8, beta: 1.4, C: false },
    { s: "SOL_USDT_PERP", b: "SOLUSDT", c: 120.5, cadere: 0.26, vol: 9e8, rang: 3, A: false, oi: 0.02, f72: 0.0001, B: "piata", bs: 0.2, beta: 1.6, C: true }],
  urmarire: { zile: 0, evenimente: 0, zileIncomplete: 0, grupuri: { E: { n: 0 } }, verdict: null, P: { episoade: 0 } }, istoric: K.ISTORIC };
await test("🔑 pagina: grupul „📉 … după o cădere mare (în probă)” cu ÎN PROBĂ, după boți; cele 2 rânduri cu etichetele A / B / C", () => {
  const P = pagina(), d = { caderi: CAD };
  assert.deepEqual(J(P.SUG_GRUPURI.map((g) => g[0])), ["porn", "cad", "revUS", "revEU", "sect", "trend"]);
  const g = P.sugGrupuri(d, CAD.la).find((x) => x.k === "cad");
  assert.equal(g.verdict, "ÎN PROBĂ"); assert.match(g.sub, /ziua UTC 07\.11\.2026: 3 căderi noi de −25% pe Binance, 2 și pe Pionex, 1 cu spălare de levier/);
  const r = P.sugRanduri(d, CAD.la).filter((x) => x.grup === "cad");
  assert.deepEqual(J(r.map((x) => [x.s, x.tk, x.dir])), [["X", "X_USDT_PERP", "A spălare · B singură"], ["SOL", "SOL_USDT_PERP", "B cu piața · C top 20"]]);
  assert.match(r[0].sub, /−31% de la maximul pe 30 z · OI −15% în 3 z · funding −0,150% · 12,0 M USDT\/zi \(locul 45\)/);
  assert.equal(r[0].avert.length, 5, "istoricul, spălarea, funding-ul foarte negativ, „singură”, lichiditatea mică"); assert.equal(r[1].avert.length, 1);
});
await test("🔑 pagina: fișa căderii - celulele, regula, istoricul probei, urmărirea; fără Poartă și fără sumă", () => {
  const P = pagina(), d = { caderi: CAD }, r = P.sugRanduri(d, CAD.la).find((x) => x.grup === "cad"), f = P.sugFisa(r, d, CAD.la);
  assert.deepEqual(J(f.cele.map((c) => c.et)), ["De la maxim", "Partea pieței", "OI pe 3 zile", "Funding 72 h", "Lichiditate", "Etichete"]);
  assert.equal(f.cele[1].v, "20%"); assert.equal(f.verdict, "ÎN PROBĂ");
  assert.match(f.dovada.join(" "), /6\.932 de căderi pe 583 de monede/); assert.match(f.dovada.join(" "), /Urmărit înainte de la 07\.11\.2026: 0 căderi/);
  assert.ok(!f.actiuni.some((a) => /Poart/.test(a.et)), "fără Poartă"); assert.match(f.actNota, /fără Poartă și fără sumă/);
  const h = P.sugHtml(d, CAD.la);
  assert.match(h, /După o cădere mare · monede/); assert.match(h, /📉 Monede Pionex · după o cădere mare \(în probă\)/);
});
await test("pagina: fără căderi ieri ⇒ fraza spune ziua; fără date ⇒ „aștept tura de la 8:00”", () => {
  const P = pagina();
  assert.match(P.sugHtml({ caderi: { ...CAD, lista: [], nPionex: 0 } }, CAD.la), /În ziua UTC 07\.11\.2026 nicio monedă de pe Pionex n-a trecut pentru prima dată de −25%/);
  assert.match(P.sugHtml({}, CAD.la), /aștept tura de la 8:00/);
});


// ── 6. revizia Opus (07.11): verdictul, cererile picate, delistatele, ziua de dinaintea probei ──
const evPrivire = (f, sp = 0.6) => { const l = []; for (let k = 0; k < 200; k++) { const zi = K.ziUtc(Date.parse("2026-11-07T00:00:00Z") + Math.floor(k * sp) * ZI); l.push({ zi, s: "S" + (k % 15), A: true, C: false, B: null, ...f(k, zi) }); } return l; };
await test("🔑 🔴1 privirea din 01.03.2027 se judecă DOAR pe căderile închise până la ea (A: zi ≤ 25.02); cele de după n-o schimbă", () => {
  const slab = (k, zi) => ({ y3: k % 2 ? 0.02 : -0.02, r3: 0.01 }), tare = (k, zi) => zi <= "2027-02-25" ? slab(k) : { y3: 0.5, r3: 0.5 };
  const a = K.privire(evPrivire(slab), "2027-03-01", 0.01), b = K.privire(evPrivire(tare), "2027-03-01", 0.01);
  assert.equal(a.pana.A, "2027-02-25"); assert.equal(a.pana.BC, "2027-02-21");
  assert.equal(a.A, "n-am aflat"); assert.equal(b.A, a.A, "căderile de după 25.02 nu intră"); assert.equal(b.p.A, a.p.A);
});
await test("🔑 🔴2 „confirmat” cere și costul dublu (privirea finală, 08.11.2027): +0,1% față de piață și p mic ⇒ n-am aflat", () => {
  const v = K.privire(evPrivire((k) => ({ y3: 0.001 + (k % 3 - 1) * 1e-5, r3: 0.01 }), 1.8), "2027-11-08", 0.04);
  assert.ok(v.p.A != null && v.p.A < 0.0133, "p " + v.p.A); assert.equal(v.A, "n-am aflat");
  const v2 = K.privire(evPrivire((k) => ({ y3: 0.01 + (k % 3 - 1) * 1e-4, r3: 0.01 }), 1.8), "2027-11-08", 0.04);
  assert.equal(v2.A, "confirmat pe date noi", "+1% față de piață, net pozitiv, Holm trece");
  const v3 = K.privire(evPrivire((k) => ({ y3: 0.01 + (k % 3 - 1) * 1e-4, r3: -0.01 }), 1.8), "2027-11-08", 0.04);
  assert.equal(v3.A, "n-am aflat", "bate piața, dar netul absolut e pe minus");
});
await test("proprietate scrisă în jurnal: la PRIMA privire (01.03.2027) sunt cel mult 8 blocuri ⇒ p ≥ 1/256 > 0,01/3 ⇒ nu poate confirma, doar arăta cifrele", () => {
  const v = K.privire(evPrivire((k) => ({ y3: 0.05, r3: 0.05 }), 0.55), "2027-03-01", 0.01);
  assert.ok(v.p.A >= 1 / 256 - 1e-12, "p " + v.p.A); assert.equal(v.A, "n-am aflat");
});
await test("🔵 Holm: familia rămâne de 3 când B e „prea devreme” (A 0,004 și C 0,009 la α 0,01 nu trec)", () => {
  assert.deepEqual(K.holm({ A: 0.004, B: null, C: 0.009 }, 0.01), { A: false, C: false, B: false });
  assert.deepEqual(K.holm({ A: 0.003, B: null, C: 0.004 }, 0.01), { A: true, C: true, B: false });
});
await test("🔑 🔴3 proba P se judecă O DATĂ, pe primele 8 episoade; episoadele de după nu schimbă verdictul", () => {
  const zile = []; for (let k = 0; k < 16; k++) zile.push({ zi: K.ziUtc(Date.parse("2026-11-07T00:00:00Z") + k * 5 * ZI), nA: 3, piata3: k < 8 ? (k % 2 ? 0.03 : -0.03) : 0.2, reperP: 0, gata3: true });
  const P = K.probaP(zile, Date.parse("2027-02-01T00:00:00Z"));
  assert.equal(P.episoade, 16); assert.equal(P.judecate, 8); assert.equal(P.pana, "2026-12-12"); assert.equal(P.verdict, "n-am aflat");
  assert.ok(P.medie > 0.05, "media tuturor e mare, dar verdictul e pe primele 8");
  const P2 = K.probaP(zile.slice(0, 5), Date.parse("2027-11-09T00:00:00Z"));
  assert.equal(P2.judecate, 5, "la 08.11.2027, sub 8 episoade: cele închise până atunci");
  assert.equal(K.probaP(zile.slice(0, 5), Date.parse("2027-06-01T00:00:00Z")).verdict, undefined, "sub 8 și înainte de 08.11.2027: fără verdict");
});
await test("🔑 🟡1 ziua de dinaintea probei (06.11): lista se calculează (cu A și Pionex), dar nu se scrie pe disc și spune că e înainte de probă", async () => {
  const D = disc(), trimise = [];
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-06", crash: { s: "XUSDT", zi: "2026-11-06" } }).binance, cere: pionexCere, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2026-11-07T09:30:00Z"), ...D }, {});
  assert.deepEqual(D.listaZile(), []);
  const c = trimise[0]; assert.equal(c.inainteDeProba, true); assert.equal(c.lista.length, 1); assert.equal(c.lista[0].s, "X_USDT_PERP"); assert.equal(c.lista[0].A, true);
});
await test("🔑 🟡2a OI picat la o cădere ⇒ ziua NU se scrie, lista se publică, tura se reia peste 2 ore (nu mâine)", async () => {
  const D = disc(), st = {}, trimise = [];
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07" }, faraOI: new Set(["XUSDT"]) }).binance, cere: pionexCere, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, st);
  assert.equal(D.citesteZi("2026-11-07"), null); assert.ok(st.esecLa > 0); assert.notEqual(st.zi, "2026-11-08");
  assert.equal(trimise[0].lista[0].A, null);
  st.esecLa = Date.parse("2026-11-08T07:30:00Z");
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07" } }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T09:45:00Z"), ...D }, st);
  assert.equal(D.citesteZi("2026-11-07").ev[0].A, true, "la reîncercare ziua se scrie, cu A"); assert.equal(st.zi, "2026-11-08");
});
const pregatit = async (o = {}) => { const D = disc(); await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07" }, ...o }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, {}); return D; };
const peste3 = async (D, o) => K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-10", crash: { s: "XUSDT", zi: "2026-11-07" }, ...o }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-11T07:30:00Z"), ...D }, {});
await test("🟡2b funding-ul de ținere picat ⇒ ziua nu se închide (nu se pune 0)", async () => {
  const D = await pregatit(); await peste3(D, { faraFunding: new Set(["XUSDT"]) });
  assert.ok(!D.citesteZi("2026-11-07").gata3);
  await peste3(D, {}); assert.ok(D.citesteZi("2026-11-07").gata3 && !D.citesteZi("2026-11-07").ev[0].faraFunding3);
});
await test("🟡2c o monedă ELIGIBILĂ (încă pe Binance) care n-a venit la judecată ⇒ ziua nu se închide cu piața parțială", async () => {
  const D = await pregatit(); await peste3(D, { lipsa: new Set(["C7USDT"]) });
  assert.ok(!D.citesteZi("2026-11-07").gata3);
});
await test("🔑 🟡3 moneda DELISTATĂ după cădere iese la ultima închidere văzută (nu dispare din probă)", async () => {
  const D = disc();
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-07", crash: { s: "XUSDT", zi: "2026-11-07" } }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...D }, {});
  await K.turaCaderi({ binance: lumeBinance({ ultimaZi: "2026-11-08", crash: { s: "XUSDT", zi: "2026-11-07" } }).binance, cere: pionexCere, trimite: async () => {}, jurnal: () => {}, acum: Date.parse("2026-11-09T07:30:00Z"), ...D }, {});
  assert.deepEqual(D.citesteZi("2026-11-07").ultim.XUSDT, ["2026-11-08", 60]);
  await peste3(D, { delistate: new Set(["XUSDT"]) });
  const e = D.citesteZi("2026-11-07").ev[0];
  assert.ok(D.citesteZi("2026-11-07").gata3 && e.delistat3 && Math.abs(e.g3) < 1e-12, JSON.stringify(e));
});
await test("1000PEPE ⇒ multiplicatorul 1.000 în listă; nume ne-ASCII în univers, codificat în adresă; Pionex picat nu strică tura", async () => {
  assert.equal(K.multBinance("1000PEPEUSDT"), 1000); assert.equal(K.multBinance("1000000MOGUSDT"), 1e6); assert.equal(K.multBinance("1MBABYDOGEUSDT"), 1e6); assert.equal(K.multBinance("1INCHUSDT"), 1);
  assert.deepEqual(K.univers({ symbols: [{ symbol: "币安人生USDT", contractType: "PERPETUAL", quoteAsset: "USDT", status: "TRADING", underlyingType: "COIN" }] }), ["币安人生USDT"]);
  const L = lumeBinance({ ultimaZi: "2026-11-07", extra: ["币安人生USDT"] }), trimise = [];
  await K.turaCaderi({ binance: L.binance, cere: async () => { throw new Error("Pionex nu răspunde"); }, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2026-11-08T07:30:00Z"), ...disc() }, {});
  assert.ok(L.cereri.some((u) => u.includes("symbol=" + encodeURIComponent("币安人生USDT"))));
  assert.equal(trimise[0].pionexLipsa, true); assert.equal(trimise[0].nElig, 121);
});
await test("🔑 privirea se scrie O DATĂ pe disc: rularea de după o citește, nu o recalculează", async () => {
  const D = disc(); D.scrieZi("privire-2027-03-01", { la: "2027-03-01", A: "n-am aflat", B: "prea devreme", C: "n-am aflat", pana: { A: "2027-02-25", BC: "2027-02-21" }, tinut: true });
  const L = lumeBinance({ ultimaZi: "2027-03-04" }), trimise = [];
  await K.turaCaderi({ binance: L.binance, cere: pionexCere, trimite: async (c, o) => trimise.push(o), jurnal: () => {}, acum: Date.parse("2027-03-05T08:30:00Z"), ...D }, {});
  assert.equal(trimise[0].urmarire.verdict.tinut, true);
});
await test("pagina: prețul 1000PEPE împărțit; lista veche spusă; Pionex picat spus; ziua de dinaintea probei spusă", () => {
  const P = pagina(), x = { s: "PEPE_USDT_PERP", b: "1000PEPEUSDT", mult: 1000, c: 6.5, cadere: 0.3, vol: 5e8, rang: 9, A: false, oi: 0, f72: 0, B: "piata", bs: 0.2, beta: 1.1, C: true };
  const r = P.sugRanduri({ caderi: { ...CAD, lista: [x] } }, CAD.la).find((y) => y.grup === "cad"); assert.equal(r.pret, "0,0065");
  assert.match(P.sugFisa(r, { caderi: { ...CAD, lista: [x] } }, CAD.la).pretNota, /împărțită la 1\.000 \(contractul 1000PEPEUSDT\)/);
  assert.match(P.sugHtml({ caderi: CAD }, CAD.la + 31 * 3600000), /LISTĂ VECHE \(colectorul n-a mai trimis din 07\.11\.2026\)/);
  assert.match(P.sugHtml({ caderi: { ...CAD, lista: [], pionexLipsa: true } }, CAD.la), /Lista Pionex n-a venit la tura de azi/);
  assert.match(P.sugHtml({ caderi: { ...CAD, inainteDeProba: true } }, CAD.la), /ziua de dinaintea probei \(arătată, nu intră în urmărire\)/);
  assert.doesNotMatch(P.sugHtml({ caderi: CAD }, CAD.la), /−0,02%/);
});

// ── 5. colectorul ──
await test("colectorul v101.168: importă tura, o cheamă din buclă între cele grele (o dată pe zi), zilele în data/caderi", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /const VERSIUNE_COLECTOR = "v101\.168"/);
  assert.match(c, /import \{ turaCaderi as turaCaderiModul \} from "\.\/lib\/tura-caderi\.mjs";/);
  assert.match(c, /if \(val\.grele\) turaCaderiColector\(\)\.catch\(/);
  assert.match(c, /const CADERI_DIR = path\.join\(DATA, "caderi"\)/);
  assert.match(c, /binance: binanceDirect/);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? " — " + picate + " PICATE" : ""}\n`);
process.exit(picate ? 1 : 0);
