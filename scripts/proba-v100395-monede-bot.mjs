// Proba v100.395 (26.11.2026, el: „caută automat mereu genul ăsta de monede … pune și în celelalte … mereu conectat la realitate și live”):
//   1. formulele (public/lib/monede-bot.js): ER, junk, amplitudinea, partea, ordinea, PPST pe ultima bară, rândul din Tablou, boții pe junk
//   2. tura colectorului (scripts/lib/tura-monede-bot.mjs) cu Binance / Pionex prefăcute: ce publică, Discord (nouă în primele 3, junk, 3 eșecuri,
//      revenirea), urmărirea înainte la 7 zile
//   3. serverul (POST / GET action=monedeBot, curățarea, plafonul), pagina Sugestii (grupul „mbot”, VECHE, fișa), Tabloul, index.html / sw.js
// Paritatea PPST cu portul Python (ppst_motor.py) s-a făcut separat pe 26.11: 8 / 8 serii (4 monede × 1h / 1m) identice la bară.
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
const M = (() => { const ctx = { Math, Number, Array, Object, String, JSON, isFinite, isNaN, Infinity, NaN, Date }; vm.createContext(ctx); vm.runInContext(citeste("public", "lib", "monede-bot.js") + "\nthis.M = MonedeBot;", ctx); return ctx.M; })();
const plain = (o) => JSON.parse(JSON.stringify(o));
const H = 3600000, ACUM = Date.UTC(2026, 10, 26, 18, 0);
// bare sintetice: tendința pe 14 zile (pas pe bară), zgomot, amplitudine
function bare(n, pasBara, t0, start, zgomot, latBara, samanta) {
  let s = samanta || 7; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 - 0.5; };
  const o = []; let c = start;
  for (let i = 0; i < n; i++) { const o_ = c; c = c * (1 + pasBara + zgomot * r()); const hi = Math.max(o_, c) * (1 + latBara), lo = Math.min(o_, c) * (1 - latBara); o.push({ t: t0 + i * H, o: o_, h: hi, l: lo, c }); }
  return o;
}
const date = (sym, pas, o = {}) => ({ sym, pret: 10, vol: 300e6, oi: 120e6, sprBp: 1, zile: 900, fund: 0.0001, pionex: true,
  b4: bare(85, pas * 4, ACUM - 85 * 4 * H, 100, 0.004, 0.01, 3), b1: bare(600, pas, ACUM - 600 * H, 100, 0.012, 0.02, 11), ...o });

// ── 1. formulele ──
await test("1a. ER: linie dreaptă = ±1, dus-întors = 0, zig-zag mic", () => {
  assert.equal(M.er([1, 2, 3, 4]), 1); assert.equal(M.er([4, 3, 2, 1]), -1); assert.equal(M.er([1, 2, 1]), 0);
  assert.ok(Math.abs(M.er([10, 11, 10, 11, 10, 11]) - 0.2) < 1e-12); assert.equal(M.er([5]), null);
});
await test("1b. junk: fiecare prag mușcă singur (volum, OI, volum/OI, vechime, spread); moneda curată n-are motive", () => {
  const ok = { vol: 300e6, oi: 120e6, zile: 900, sprBp: 1 };
  assert.deepEqual(plain(M.motiveJunk(ok)), []);
  assert.match(M.motiveJunk({ ...ok, vol: 90e6 }).join(), /volum 90 M \$ \(sub 100 M \$\)/);
  assert.match(M.motiveJunk({ ...ok, oi: 30e6, vol: 140e6 }).join(), /OI 30 M/);
  assert.match(M.motiveJunk({ ...ok, vol: 327e6, oi: 18.3e6 }).join(), /volumul de 17,9× OI-ul/);   // MMT 26.11
  assert.match(M.motiveJunk({ ...ok, zile: 200 }).join(), /listată de 200 de zile/);
  assert.match(M.motiveJunk({ ...ok, sprBp: 12 }).join(), /spread 12,0 bp/);
  assert.equal(M.motiveJunk({ ...ok, vol: 600e6, oi: 120e6 }).length, 0, "exact 5× trece");
});
await test("1c. masoara: o monedă care scade drept și agitat ⇒ short, agitată, fără junk; una care urcă ⇒ long; una plată ⇒ fără parte", () => {
  const j = M.masoara(date("JOSUSDT", -0.0015)), s = M.masoara(date("SUSUSDT", 0.0015)), p = M.masoara(date("PLATUSDT", 0, { b4: bare(85, 0, 0, 100, 0.0005, 0.001, 5), b1: bare(600, 0, 0, 100, 0.0005, 0.001, 9) }));
  assert.equal(j.parte, "short"); assert.ok(j.er14 < -0.1 && j.r14 < 0 && j.agitata && !j.junk.length, plain(j));
  assert.equal(s.parte, "long"); assert.ok(s.er14 > 0.1 && s.r14 > 0);
  assert.equal(p.agitata, false);
  assert.ok(j.ppst1h && (j.ppst1h.dir === "SUS" || j.ppst1h.dir === "JOS") && j.ppst1h.bare >= 1);
  assert.equal(M.masoara(date("X", 0, { b1: bare(100, 0, 0, 100, 0.01, 0.01) })), null, "sub 168 de bare de 1 h ⇒ nimic");
});
await test("1d. liste: doar fără junk + agitate + cu parte + pe Pionex; ordinea după tărie; cel mult 10 pe parte", () => {
  const zig = bare(85, -0.004, ACUM - 85 * 4 * H, 100, 0.03, 0.01, 5);   // B: scade, dar în zig-zag ⇒ ER mai mic ⇒ a doua
  const m = [M.masoara(date("AUSDT", -0.002)), M.masoara(date("BUSDT", -0.002, { b4: zig })), M.masoara(date("JUNKUSDT", -0.002, { vol: 327e6, oi: 18e6 })), M.masoara(date("NOPIOUSDT", -0.002, { pionex: false })), M.masoara(date("CUSDT", 0.0015)), M.masoara(date("LINUSDT", -0.001))];
  assert.ok(m[1].taria < m[0].taria && m[1].parte === "short" && m[1].agitata, JSON.stringify([m[0].taria, m[1].taria, m[1].parte]));
  assert.equal(m[5].agitata, false, "LIN: 7,2% pe zi, sub pragul de 8%");
  const L = M.liste(m);
  assert.deepEqual(L.short.map((x) => x.s), ["A", "B"]);
  assert.deepEqual(L.long.map((x) => x.s), ["C"]);
  const multe = Array.from({ length: 14 }, (_, i) => M.masoara(date("M" + i + "USDT", -0.002 - i * 0.0001)));
  assert.equal(M.liste(multe).short.length, 10);
});
await test("1d2. tăria: 3 zile în aceeași parte adună; o revenire pe 3 zile (revine) nu adună și nu scade", () => {
  const jos = bare(67, -0.008, ACUM - 85 * 4 * H, 100, 0.002, 0.01, 3), c0 = jos[jos.length - 1].c;
  const sus = bare(18, 0.004, ACUM - 18 * 4 * H, c0, 0.002, 0.01, 4), m = M.masoara(date("REVUSDT", -0.002, { b4: jos.concat(sus) }));
  assert.equal(m.parte, "short"); assert.ok(m.er3 > 0 && m.revine, JSON.stringify([m.er3, m.revine]));
  assert.ok(Math.abs(m.taria - Math.abs(m.er14)) < 1e-12, "revine ⇒ tăria = |ER 14 z|");
  const d = M.masoara(date("JOSUSDT", -0.002)); assert.ok(d.er3 < 0 && !d.revine && Math.abs(d.taria - (Math.abs(d.er14) + Math.abs(d.er3))) < 1e-12);
});
await test("1d3. direcția probabilă: tabelul înghețat are cele 6 celule; treapta după |ER 14 z|; câștigul mediu stă lângă procent; rezumatul e socotit din tabel", () => {
  assert.deepEqual(Object.keys(M.PROBABIL.celule).sort(), ["long:0", "long:1", "long:2", "short:0", "short:1", "short:2"]);
  for (const c of Object.values(M.PROBABIL.celule)) assert.ok(c.p > 0 && c.p < 1 && c.n > 100 && c.sapt >= 10 && Number.isFinite(c.medie) && /^(nedovedit|mai des decât 50%|mai rar decât 50%)$/.test(c.verdict), JSON.stringify(c));
  assert.equal(M.treapta(-0.12), 0); assert.equal(M.treapta(0.15), 1); assert.equal(M.treapta(-0.4), 2); assert.equal(M.treapta(0.05), -1);
  const p = M.probabil({ parte: "short", er14: -0.12, agitata: true, junk: [] }), c = M.PROBABIL.celule["short:0"];
  assert.equal(p.p, c.p); assert.match(p.scurt, new RegExp("câștig mediu " + M.pct(c.medie).replace(/[+.]/g, "\\$&")));
  assert.equal(M.probabil({ parte: null, er14: 0.02 }), null);
  // revizia (🟡2): studiul e pe monede agitate și fără junk ⇒ pe celelalte, nicio cifră
  assert.equal(M.probabil({ parte: "short", er14: -0.12, agitata: false, junk: [] }), null); assert.equal(M.probabil({ parte: "short", er14: -0.12, agitata: true, junk: ["OI mic"] }), null); assert.equal(M.probabil({ parte: "short", er14: -0.12 }), null);
  // fraza „continuă mai des, dar…” DOAR pe celula care trece regula; pe una nedovedită (chiar cu p > 50%) - niciodată
  for (const [k, c] of Object.entries(M.PROBABIL.celule)) {
    const [parte, t] = k.split(":"), er = (parte === "short" ? -1 : 1) * [0.12, 0.2, 0.3][+t], q = M.probabil({ parte, er14: er, agitata: true, junk: [] });
    assert.equal(/continuă mai des/.test(q.text), c.verdict === "mai des decât 50%" && c.medie < 0, k + " " + q.text);
    assert.equal(/\(nedovedit\)/.test(q.scurt), c.verdict === "nedovedit", k + " " + q.scurt);
  }
  const nedov = Object.values(M.PROBABIL.celule).filter((x) => x.verdict === "nedovedit").length;
  assert.match(M.rezumatStudiu(), new RegExp("^pe jumătatea de test, " + nedov + " din 6 situații NEDOVEDITE"));
});
await test("1d4. cele trei feluri (el, 26.11: „direcție, range și revenire”): fiecare monedă bună intră într-unul singur; revenirea și range-ul au ordinea lor", () => {
  const jos = bare(67, -0.008, ACUM - 85 * 4 * H, 100, 0.002, 0.01, 3), c0 = jos[jos.length - 1].c;
  const rev = M.masoara(date("REVUSDT", -0.002, { b4: jos.concat(bare(18, 0.004, ACUM - 18 * 4 * H, c0, 0.002, 0.01, 4)) }));
  const agit = bare(600, 0, ACUM - 600 * H, 100, 0.02, 0.03, 9);   // 1 h agitate, fără tendință
  const rng = M.masoara(date("RNGUSDT", 0, { b4: bare(85, 0, ACUM - 85 * 4 * H, 100, 0.03, 0.01, 8), b1: agit }));
  const dir = M.masoara(date("DIRUSDT", -0.002)), junk = M.masoara(date("JNKUSDT", 0, { vol: 327e6, oi: 18e6, b4: bare(85, 0, ACUM - 85 * 4 * H, 100, 0.03, 0.01, 8), b1: agit }));
  assert.equal(M.fel(rev), "revenire"); assert.equal(M.fel(rng), "range"); assert.equal(M.fel(dir), "short"); assert.ok(rng.agitata && Math.abs(rng.er14) < 0.1, JSON.stringify([rng.er14, rng.amp]));
  const L = M.liste([rev, rng, dir, junk]);
  assert.deepEqual([L.short.map((x) => x.s), L.long.map((x) => x.s), L.revenire.map((x) => x.s), L.range.map((x) => x.s)], [["DIR"], [], ["REV"], ["RNG"]]);
  assert.equal(M.eticheta("revenire", rev), "Revenire ↑"); assert.equal(M.eticheta("range", rng), "Range"); assert.equal(M.eticheta("long", null), "Direcție ↑");
});
await test("1e. cheia: 1000PEPEUSDT = PEPE = PEPE.PERP = PEPE_USDT_PERP", () => {
  for (const s of ["1000PEPEUSDT", "PEPE", "pepe.perp", "PEPE_USDT_PERP", "PEPEUSDT"]) assert.equal(M.cheie(s), "PEPE");
});
// el, 26.11: „grupați doar pe direcție, range și revenire” ⇒ short / long = direcție, plus revenire și range
const KV = { la: ACUM - 20 * 60000, n: 3, short: ["ZEC", "UNI"], long: ["PIEVERSE"], revenire: ["ENA"], range: ["SOL"], monede: [
  { sym: "ZECUSDT", s: "ZEC", junk: [], parte: "short", agitata: true, r14: -0.27, er14: -0.17, r3: -0.18, er3: -0.43, amp: 0.146, pret: 400, vol: 1.6e9, oi: 355e6, fund: 0.0001, ppst1h: { dir: "JOS", bare: 3, dist: 0.01 }, ppstCuParte: true },
  { sym: "UNIUSDT", s: "UNI", junk: [], parte: "short", agitata: true, r14: -0.23, er14: -0.21, r3: -0.09, er3: -0.3, amp: 0.097, pret: 4.6, vol: 110e6, oi: 79e6, fund: -0.0002, ppst1h: { dir: "SUS", bare: 21, dist: 0.02 }, ppstCuParte: false },
  { sym: "SOLUSDT", s: "SOL", junk: [], parte: null, agitata: true, r14: -0.04, er14: -0.04, r3: 0.03, er3: 0.2, amp: 0.085, pret: 130, vol: 1.1e9, oi: 538e6 },
  { sym: "ENAUSDT", s: "ENA", junk: [], parte: "short", agitata: true, revine: true, r14: -0.28, er14: -0.25, r3: -0.08, er3: 0.05, amp: 0.10, pret: 0.3, vol: 134e6, oi: 52e6, fund: -0.0002, ppst1h: { dir: "SUS", bare: 21, dist: 0.02 }, ppstCuParte: false },
  { sym: "PIEVERSEUSDT", s: "PIEVERSE", junk: [], parte: "long", agitata: true, r14: 1.4, er14: 0.21, r3: 0.22, amp: 0.31, pret: 1, vol: 205e6, oi: 52e6 },
  { sym: "MMTUSDT", s: "MMT", junk: ["OI 19 M $ (sub 40 M $)", "volumul de 17,6× OI-ul (umflat: peste 5×)"], parte: "short", agitata: true, r14: -0.3, er14: -0.09, amp: 0.33, pret: 0.3, vol: 327e6, oi: 19e6 },
  { sym: "BNBUSDT", s: "BNB", junk: [], parte: null, agitata: false, r14: -0.05, er14: -0.07, amp: 0.059, pret: 800, vol: 210e6, oi: 279e6 }] };
await test("1f. rândul din Tablou: în listă (bine), JUNK (atenție), prea liniștită, necitită, VECHE, botul contra direcției", () => {
  let t = M.textMoneda(KV, "ZEC.PERP", "short", ACUM); assert.equal(t.stare, "bine"); assert.match(t.text, /în listă: Direcție ↓ #1/); assert.match(t.text, /Acum ↓ JOS: 14 z −27,0% · 3 z ↓ −18,0% · PPST 1h ↓ JOS \(ER −0,17\)/); assert.match(t.text, /Probabil 7 z: ↓ continuă \d+%.* · câștig mediu −/); assert.match(t.text, /acum 20 min/);
  t = M.textMoneda(KV, "MMT", "short", ACUM); assert.equal(t.stare, "atentie"); assert.ok(t.junk); assert.match(t.text, /^JUNK: OI 19 M/);
  t = M.textMoneda(KV, "BNB", "short", ACUM); assert.match(t.text, /prea liniștită: 5,9% pe zi/);
  t = M.textMoneda(KV, "XYZ", "long", ACUM); assert.match(t.text, /n-a fost citită/);
  t = M.textMoneda({ ...KV, la: ACUM - 3 * H }, "ZEC", "short", ACUM); assert.equal(t.stare, "atentie"); assert.match(t.text, /VECHE, de 3 ore/);
  t = M.textMoneda(KV, "ZEC", "long", ACUM); assert.ok(t.contra); assert.match(t.text, /botul tău e LONG, moneda merge în JOS/);
  t = M.textMoneda(null, "ZEC", "long", ACUM); assert.match(t.text, /aștept lista/);
  assert.deepEqual(plain(M.botiPeJunk(KV, [{ s: "MMT", dir: "short", id: 1 }, { s: "ZEC", dir: "short" }])).map((x) => x.s), ["MMT"]);
});

// ── 2. tura colectorului ──
const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-monede-bot.mjs")).href);
function binanceFals(o = {}) {
  const syms = ["ZECUSDT", "ENAUSDT", "MMTUSDT", "UPUSDT", "BTCUSDT", "AUSDT", "BUSDT", "CUSDT", "DUSDT", "EUSDT", "FUSDT", "GUSDT"];
  const pas = { ZECUSDT: -0.002, ENAUSDT: -0.0015, MMTUSDT: -0.002, UPUSDT: 0.0015, BTCUSDT: 0.0001 };
  const k = (b) => b.map((x) => [x.t, String(x.o), String(x.h), String(x.l), String(x.c), "0"]);
  const f = async (u) => {
    if (o.mut) return null;
    if (u.endsWith("/exchangeInfo")) return { symbols: syms.map((s) => ({ symbol: s, quoteAsset: "USDT", status: "TRADING", contractType: "PERPETUAL", underlyingType: "COIN", onboardDate: ACUM - (s === "UPUSDT" ? 100 : 900) * 86400000 })) };
    if (u.endsWith("/ticker/24hr")) return syms.map((s) => ({ symbol: s, lastPrice: "10", quoteVolume: s === "MMTUSDT" ? "327000000" : "300000000" }));
    if (u.endsWith("/premiumIndex")) return syms.map((s) => ({ symbol: s, lastFundingRate: "0.0001" }));
    if (u.endsWith("/ticker/bookTicker")) return syms.map((s) => ({ symbol: s, bidPrice: "9.999", askPrice: "10.000" }));
    const m = /symbol=([A-Z0-9]+)/.exec(u), s = m && m[1], p = pas[s] != null ? pas[s] : (syms.indexOf(s) % 2 ? -0.0012 : 0.0012) * (o.intors && s === "AUSDT" ? -1 : 1);
    if (u.includes("/openInterest")) return { openInterest: s === "MMTUSDT" ? "1800000" : "12000000" };   // × preț 10
    if (u.includes("interval=4h")) return k(bare(86, p * 4, ACUM - 86 * 4 * H, 100, 0.004, 0.01, 3));
    if (u.includes("interval=1h")) return k(bare(601, p, ACUM - 601 * H, 100, 0.012, 0.02, 11));
    return null;
  };
  f.reia = () => true; f.stare = {}; return f;
}
const pionexFals = (lipsa) => async (cale) => { assert.match(cale, /pionex_symbols&market=PERP/); return lipsa ? null : { data: { symbols: ["ZEC", "ENA", "MMT", "UP", "BTC", "A", "B", "C", "D", "E", "F", "G"].map((b) => ({ symbol: b + "_USDT_PERP", baseCurrency: b, enable: true })) } }; };
function mediu(o = {}) {
  const trimise = [], mesaje = [], disc = { v: o.disc || {} };
  return { trimise, mesaje, disc, d: (acum, x = {}) => ({ acum, binance: x.binance || binanceFals(x), cere: pionexFals(x.faraPionex), trimite: async (c, corp) => { trimise.push([c, corp]); return { ok: true }; },
    trimiteAlerta: async (m, bot, cheie) => { mesaje.push({ ...m, bot, cheie }); return true; }, jurnal: () => {}, MonedeBot: M, boti: () => x.boti || [], citesteDisc: () => JSON.parse(JSON.stringify(disc.v)), scrieDisc: (v) => { disc.v = JSON.parse(JSON.stringify(v)); } }) };
}
await test("2a. tura publică lista: junk (MMT: volum/OI), monedele nou-listate (UP: 100 de zile) nu intră, ZEC / ENA pe short; prima tură fără mesaje „nouă”", async () => {
  const E = mediu(), st = {};
  const r = await T.turaMonedeBot(E.d(ACUM), st);
  assert.ok(r.facut, JSON.stringify(r)); assert.equal(E.trimise.length, 1); assert.equal(E.trimise[0][0], "/api/istoric-bot?action=monedeBot");
  const c = E.trimise[0][1];
  assert.ok(c.short.includes("ZEC") && c.short.includes("ENA") && !c.short.includes("MMT") && !c.long.includes("UP"), JSON.stringify([c.short, c.long]));
  assert.match(c.monede.find((m) => m.s === "MMT").junk.join(), /OI 18 M \$ \(sub 40 M \$\),volumul de 18,2× OI-ul/);   // 1,8 M contracte × prețul 10; 327 / 18
  assert.match(c.monede.find((m) => m.s === "UP").junk.join(), /listată de 100 de zile/);
  assert.equal(E.mesaje.filter((m) => String(m.cheie).startsWith("monede-bot-nou:")).length, 0, "prima tură doar ține minte");
  assert.ok(E.disc.v.pornit && E.disc.v.vazut["short:ZEC"] === ACUM && E.disc.v.vazut["short:ENA"] === ACUM, JSON.stringify(E.disc.v.vazut));
  const r2 = await T.turaMonedeBot(E.d(ACUM + 10 * 60000), st); assert.equal(r2, null, "ritmul: o dată pe oră");
});
await test("2b. Discord: botul tău pe MMT ⇒ „junk” o dată pe 24 h; o monedă NOUĂ în primele 3 ⇒ un mesaj", async () => {
  const E = mediu({ disc: { pornit: true, vazut: {} } }), st = {}, boti = [{ s: "MMT", dir: "short", id: 2692 }];
  await T.turaMonedeBot(E.d(ACUM, { boti }), st);
  const j = E.mesaje.filter((m) => m.cheie === "monede-bot-junk:MMT"); assert.equal(j.length, 1); assert.equal(j[0].bot, 2692); assert.match(j[0].titlu, /monedă junk: MMT/); assert.equal(j[0].nivel, "atentie");
  const n = E.mesaje.filter((m) => String(m.cheie).startsWith("monede-bot-nou:")); assert.equal(n.length, 1); assert.match(n[0].mesaj, /Direcție ↓ #1: /); assert.match(n[0].mesaj, /nu o predicție/);
  st.la = 0; await T.turaMonedeBot(E.d(ACUM + 2 * H, { boti }), st);
  assert.equal(E.mesaje.filter((m) => m.cheie === "monede-bot-junk:MMT").length, 1, "junk: nu din nou sub 24 h");
  assert.equal(E.mesaje.filter((m) => String(m.cheie).startsWith("monede-bot-nou:")).length, 1, "aceleași monede ⇒ fără mesaj nou");
  st.la = 0; await T.turaMonedeBot(E.d(ACUM + 25 * H, { boti }), st);
  assert.equal(E.mesaje.filter((m) => m.cheie === "monede-bot-junk:MMT").length, 2, "junk: din nou după 24 h");
});
await test("2c. „mereu conectat la realitate”: Binance mut / Pionex lipsă ⇒ nu publică; la al 3-lea eșec la rând ⇒ Discord o dată; revenirea ⇒ mesajul de revenire", async () => {
  const E = mediu({ disc: { pornit: true } }), st = {};
  for (let i = 0; i < 4; i++) { st.la = 0; const r = await T.turaMonedeBot(E.d(ACUM + i * H, { mut: i < 2, faraPionex: i >= 2 }), st); assert.equal(r.facut, false); }
  assert.equal(E.trimise.length, 0, "nicio listă publicată fără date");
  const e = E.mesaje.filter((m) => m.cheie === "monede-bot-esec"); assert.equal(e.length, 1); assert.match(e[0].titlu, /nu se mai reface/); assert.match(e[0].mesaj, /VECHE/);
  st.la = 0; const r = await T.turaMonedeBot(E.d(ACUM + 5 * H), st); assert.ok(r.facut);
  const e2 = E.mesaje.filter((m) => m.cheie === "monede-bot-revenit"); assert.equal(e2.length, 1); assert.match(e2[0].titlu, /s-a refăcut/); assert.equal(st.esecuri, 0);   /* revizia (🟡1): cheie separată, altfel politica de repetare o tăia */
});
await test("2c2. revizia: refuzul serverului (400 / 413) e eșec numărat (alerta la al 3-lea); cheia mesajului „nouă” poartă monedele", async () => {
  const E = mediu({ disc: { pornit: true } }), st = {};
  for (let i = 0; i < 3; i++) { st.la = 0; const d = E.d(ACUM + i * H); d.trimite = async () => { throw new Error("HTTP 400 monedeBot: moneda stricata"); }; const r = await T.turaMonedeBot(d, st); assert.equal(r.facut, false); assert.match(r.motiv, /serverul a refuzat lista/); }
  assert.equal(st.esecuri, 3); assert.equal(E.mesaje.filter((m) => m.cheie === "monede-bot-esec").length, 1);
  const n = E.mesaje.filter((m) => String(m.cheie).startsWith("monede-bot-nou:"));
  assert.equal(n.length, 0, "lista refuzată de server ⇒ niciun mesaj „nouă” (Discordul ar vorbi de o listă pe care Radarul n-o are)");
  st.la = 0; await T.turaMonedeBot(E.d(ACUM + 5 * H), st); st.la = 0; await T.turaMonedeBot(E.d(ACUM + 6 * H, { intors: true }), st);
  const chei = E.mesaje.filter((m) => String(m.cheie).startsWith("monede-bot-nou:")).map((m) => m.cheie);
  assert.ok(chei.length >= 1 && chei.every((k) => /^monede-bot-nou:(short|long):[A-Z]+(,(short|long):[A-Z]+)*$/.test(k)), JSON.stringify(chei));
  assert.equal(new Set(chei).size, chei.length, "fiecare mesaj „nouă” cu cheia monedelor lui");
});
await test("2d. urmărirea înainte: o notare pe zi UTC (primele 5 + prețurile); la 7 zile s × randamentul față de media monedelor citite", () => {
  const corp = { short: ["A", "B"], long: ["C"], monede: "ABCDEFGHIJKL".split("").map((s) => ({ s, pret: 100 })) };
  let u = T.urmareste(null, corp, {}, ACUM); assert.equal(u.zile.length, 1); u = T.urmareste(u, corp, {}, ACUM + 2 * H); assert.equal(u.zile.length, 1, "aceeași zi UTC ⇒ o singură notare");
  const pr = {}; "ABCDEFGHIJKL".split("").forEach((s) => (pr[s] = 100)); pr.A = 80; pr.B = 90; pr.C = 120;   // media = (80+90+120+9×100)/12 - 100 = −0,833%
  u = T.urmareste(u, { ...corp, monede: [] }, pr, ACUM + 7 * 86400000 + H);
  assert.equal(u.judecate.length, 1); const j = u.judecate[0], medie = (80 + 90 + 120 + 900) / 12 / 100 - 1;
  assert.ok(Math.abs(j.short.exces - (-1) * (((-0.2) + (-0.1)) / 2 - medie)) < 1e-12, JSON.stringify(j));
  assert.ok(Math.abs(j.long.exces - (0.2 - medie)) < 1e-12); assert.equal(j.nUnivers, 12);
  const R = T.rezumatUrmarire(u); assert.equal(R.short.zile, 1); assert.equal(R.short.pePlus, 1); assert.equal(R.long.zile, 1);
});

// ── 3. serverul, pagina, Tabloul ──
await test("3a. serverul: POST monedeBot curăță și ține; refuză simboluri stricate / liste > 10; GET o dă înapoi; plafonul 256 KB", async () => {
  const TOKEN = "proba-token-1234567890", kv = new Map(), ENV = { APP_API_TOKEN: TOKEN, ISTORIC: { get: async (k) => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => { kv.set(k, v); } } };
  const m = await import("../functions/api/istoric-bot.js");
  const post = (corp) => m.onRequestPost({ request: new Request("https://exemplu.test/api/istoric-bot?action=monedeBot", { method: "POST", headers: { authorization: "Bearer " + TOKEN, origin: "https://exemplu.test", "cf-connecting-ip": "10.96.0.3", "content-type": "application/json" }, body: JSON.stringify(corp) }), env: ENV });
  const get = () => m.onRequestGet({ request: new Request("https://exemplu.test/api/istoric-bot?action=monedeBot", { headers: { authorization: "Bearer " + TOKEN, "cf-connecting-ip": "10.96.0.3" } }), env: ENV });
  assert.equal((await post({ la: ACUM, monede: [], short: [], long: [] })).status, 400);
  assert.equal((await post({ la: ACUM, monede: [{ sym: "zec", s: "ZEC" }], short: [], long: [] })).status, 400);
  assert.equal((await post({ la: ACUM, monede: [{ sym: "ZECUSDT", s: "ZEC" }], short: Array(11).fill("ZEC"), long: [] })).status, 400);
  const r = await post({ la: ACUM, n: 5, monede: [{ sym: "ZECUSDT", s: "ZEC", junk: ["x".repeat(500)], parte: "short", er14: -0.17, ppst1h: { dir: "JOS", bare: 3, dist: 0.01, rau: 1 }, rau: "<script>" }], short: ["ZEC"], long: [], urmarire: { short: { zile: 2, medie: 0.01, pePlus: 0.5 } } });
  assert.equal(r.status, 200);
  const g = await (await get()).json(), z = g.monedeBot.monede[0];
  assert.equal(z.junk[0].length, 120); assert.equal(z.rau, undefined); assert.equal(z.ppst1h.rau, undefined); assert.equal(z.er14, -0.17); assert.equal(g.monedeBot.urmarire.short.zile, 2); assert.equal(g.monedeBot.urmarire.long.zile, 0);
  const { plafonIstoricBot } = await import("../functions/_shared/plafon-corp.js"); assert.equal(plafonIstoricBot("monedeBot"), 262144);
});
function ecran(d) {
  const ctx = { console, escapeHtml: (s) => String(s), sugStare: { panda: {} }, getJSON: async () => ({}), navTo() {}, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, Number, String, Intl, isFinite, isNaN, Promise, TextRo: globalThis.TextRo, window: null };
  vm.createContext(ctx);
  for (const f of ["latime.js", "reveniri.js", "monede-bot.js", "sugestii-ecran.js"]) vm.runInContext(citeste("public", "lib", f), ctx, { filename: f });
  return ctx;
}
await test("3b. Sugestii: grupul „mbot” după „Pe ce aș porni”, rândurile Direcție ↓ / ↑, Revenire, Range și avertismentele lor (PPST contra, funding plătit, bot pe aceeași monedă)", () => {
  const c = ecran(), d = { monedeBot: KV, boti: [{ s: "ZEC", dir: "short" }] };
  const g = plain(c.sugGrupuri(d, ACUM, "sugestii")); assert.deepEqual(g.map((x) => x.k).slice(0, 2), ["porn", "mbot"]);
  const gm = g.find((x) => x.k === "mbot"); assert.match(gm.sub, /^tura de la .* \(acum 20 min\)/); assert.match(gm.sub, /direcție 3 \(2 ↓, 1 ↑\) · revenire 1 · range 1/); assert.match(gm.verdict, /FILTRU/);
  const l = plain(c.sugRanduri(d, ACUM, "sugestii")).filter((x) => x.grup === "mbot");
  assert.deepEqual(l.map((x) => x.dir), ["Direcție ↓ #1", "Direcție ↓ #2", "Direcție ↑ #1", "Revenire ↑ #1", "Range #1"]);
  assert.deepEqual(l.map((x) => x.dirC), ["short", "short", "long", "long", "neutru"]);
  const uni = l.find((x) => x.s === "UNI").avert.join(" | "), ena = l.find((x) => x.s === "ENA").avert.join(" | "), sol = l.find((x) => x.s === "SOL").avert.join(" | ");
  assert.match(uni, /PPST pe 1 h e SUS de 21 de ore: o alertă Doar Short așteaptă primul SELL \(linia la 2,0% sub preț\)/); assert.match(uni, /TU plătești funding-ul/);
  assert.match(ena, /Pe 14 zile ↓ JOS \(−28,0%\), pe ultimele 3 zile revine −8,0%/); assert.ok(!/TU plătești|așteaptă primul/.test(ena), "la revenire, fără sfaturi de parte");
  assert.match(sol, /Fără direcție pe 14 zile \(ER −0,04\), dar se mișcă 8,5% pe zi: pentru grid neutru/);
  assert.equal(M.linia({ dist: -0.099 }), "linia la 9,9% deasupra prețului"); assert.equal(M.linia(null), "");
  assert.match(M.textMoneda(KV, "SOL", "", ACUM).text, /în listă: Range #1/); assert.match(M.textMoneda(KV, "ENA", "short", ACUM).text, /în listă: Revenire ↑ #1/);
  const fs1 = plain(c.sugFisa(c.sugRanduri(d, ACUM, "sugestii").find((x) => x.k === "mbot:range:SOL"), d, ACUM));
  assert.equal(fs1.cele[0].v, "→ RANGE"); assert.equal(fs1.cele[1].v, "—"); assert.match(fs1.cele[1].sub, /studiul nu se aplică/); assert.match(fs1.motiv, /⇒ range \(grid neutru\)/);
  const fs2 = plain(c.sugFisa(c.sugRanduri(d, ACUM, "sugestii").find((x) => x.k === "mbot:revenire:ENA"), d, ACUM));
  assert.equal(fs2.cele[0].v, "↓ JOS · revine ↑"); assert.match(fs2.regula, /REVENIRE = .* RANGE = /);
  assert.match(l.find((x) => x.s === "ZEC").avert.join(" | "), /Ai deja un bot SHORT pe ZEC/);
  // „direcția actuală + direcția probabilă” (el, 26.11): Acum (14 z, 3 z, PPST 1h) + Probabil 7 z din tabelul înghețat (ZEC: short, ER 0,17 ⇒ treapta 1)
  const c1 = M.PROBABIL.celule["short:1"];
  assert.equal(l[0].sub, "Acum ↓ JOS: 14 z −27,0% · 3 z ↓ −18,0% · PPST 1h ↓ JOS · Probabil 7 z: ↓ continuă " + Math.round(c1.p * 100) + "%" + (c1.verdict === "nedovedit" ? " (nedovedit)" : "") + " · câștig mediu " + M.pct(c1.medie) + " · ER 14 z −0,17 · 14,6%/zi · vol 1,6 mld. $ · OI 355 M $");
});
await test("3c. Sugestii: lista VECHE (peste 90 min) se spune pe rândul de sub titlu; boții pe junk tot acolo; fără listă ⇒ „aștept”", () => {
  const c = ecran();
  const g = (d) => plain(c.sugGrupuri(d, ACUM, "sugestii")).find((x) => x.k === "mbot");
  assert.match(g({ monedeBot: { ...KV, la: ACUM - 3 * H }, boti: [] }).sub, /^LISTĂ VECHE: colectorul n-a mai reușit din .* \(3 ore\) - nu porni după ea/);
  assert.match(g({ monedeBot: KV, boti: [{ s: "MMT", dir: "short" }] }).sub, /⚠ boții tăi pe monede junk: MMT/);
  // boții de semnal pornit (activ:false, ruleaza:true, fără poziție ⇒ fără direcție) vin în botiToti, nu în boti (pânda rămâne cum era)
  assert.match(g({ monedeBot: KV, boti: [], botiToti: [{ s: "MMT", dir: "" }] }).sub, /⚠ boții tăi pe monede junk: MMT/);
  const z = plain(c.sugRanduri({ monedeBot: KV, boti: [], botiToti: [{ s: "ZEC", dir: "" }] }, ACUM, "sugestii")).find((x) => x.s === "ZEC");
  assert.match(z.avert.join(" | "), /Ai deja un bot pe ZEC \(fără poziție acum\)/);
  const src = citeste("public", "lib", "sugestii-ecran.js");
  assert.match(src, /d\.botiToti = r && Array\.isArray\(r\.bots\) \? r\.bots\.filter\(function \(b\) \{ return b && \(b\.activ !== false \|\| b\.ruleaza === true\); \}\)/);
  assert.match(citeste("scripts", "colector.mjs"), /\(ultimiiBoti \|\| \[\]\)\.filter\(\(b\) => b && \(b\.activ !== false \|\| b\.ruleaza === true\)\)/);
  assert.match(g({}).sub, /^aștept lista/); assert.equal(plain(c.sugRanduri({}, ACUM, "sugestii")).filter((x) => x.grup === "mbot").length, 0);
});
await test("3d. Sugestii: fișa unui rând „mbot” - celulele, regula cu pragurile, urmărirea, fără Poartă și fără sumă", () => {
  const c = ecran(), d = { monedeBot: { ...KV, urmarire: { short: { zile: 3, medie: 0.012, pePlus: 2 / 3 }, long: { zile: 0 } } }, boti: [] };
  const r = c.sugRanduri(d, ACUM, "sugestii").find((x) => x.k === "mbot:short:ZEC"), f = plain(c.sugFisa(r, d, ACUM));
  assert.equal(f.cele[0].v, "↓ JOS"); assert.match(f.cele[1].v, /^continuă \d+%$/); assert.match(f.cele[1].sub, /câștig mediu/);
  assert.match(f.dovada[0], /^Direcția probabilă: pe istoric, în situația asta/); assert.match(f.dovada[1], /NEDOVEDITE/);
  assert.deepEqual(f.cele.map((x) => x.et), ["Direcția acum", "Direcția probabilă, 7 z", "14 zile", "3 zile", "Pe zi", "Volum 24 h", "Open interest", "Funding", "PPST 1h", "Spread"]);
  assert.match(f.regula, /volum ≥ 100 M \$/); assert.match(f.regula, /cel mult 5× OI-ul/); assert.match(f.regula, /cel puțin 8% pe zi/);
  assert.match(f.dovada[2], /Doar Short: 3 zile judecate \(0 ferestre independente\), \+1,2% față de media monedelor citite, la 7 zile, pe plus în 67% din zile/);   /* v100.396: + ferestrele independente; revizia valului 4: fără „din 26” (urmărirea n-are verdict) */ assert.match(f.dovada[2], /Doar Long: nicio zi judecată încă/);
  assert.match(f.actNota, /nu duce la Poartă și nu dă o sumă/); assert.equal(f.actiuni[0].act, "gridDeschideMonedaDir('ZEC','short')");
});
await test("3e. pagina încarcă /lib/monede-bot.js (înaintea Sugestiilor și a app.js), sw.js îl ține; Sugestii cere action=monedeBot; Tabloul pune rândul după lățimea monedei", () => {
  const H_ = citeste("public", "index.html"), i = H_.indexOf('<script src="/lib/monede-bot.js"></script>');
  assert.ok(i > 0 && i < H_.indexOf('<script src="/lib/sugestii-ecran.js') && i < H_.indexOf('src="/app.js"') && i < H_.indexOf('<script src="/lib/tablou-citire.js'));
  assert.ok(citeste("public", "sw.js").includes('"/lib/monede-bot.js"'));
  assert.match(citeste("public", "lib", "sugestii-ecran.js"), /pas\("monedeBot", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=monedeBot"\)/);
  assert.match(citeste("public", "lib", "tablou-citire.js"), /if\(ex\.latimeMoneda\)out\.push\(rd\(ex\.latimeMoneda\)\);if\(ex\.monedeBot\)out\.push\(rd\(ex\.monedeBot\)\);/);
  assert.match(cuTablou(citeste("public", "app.js")), /out\.monedeBot=typeof MonedeBot!=="undefined"&&typeof tbMonedeBotKv!=="undefined"\?Object\.assign\(MonedeBot\.textMoneda\(tbMonedeBotKv\.d,b\.baza,b\.directie,Date\.now\(\)\)/);
  const col = citeste("scripts", "colector.mjs");
  assert.match(col, /import \{ turaMonedeBot \} from "\.\/lib\/tura-monede-bot\.mjs"/); assert.match(col, /if \(val\.grele\) turaMonedeBotColector\(\)/); assert.match(col, /const MonedeBot = incarca\("monede-bot\.js", "MonedeBot"\)/);
});
await test("V. versiunea v100.395 (index ×4, sw, versiune.js, package + lanț după v100.394, BUILD_INFO), colectorul v101.214", () => {
  const pk = JSON.parse(citeste("package.json")), bi = JSON.parse(citeste("BUILD_INFO.json"));
  /* v100.396: „de la 395 încolo” (versiunea merge mai departe; după ea în lanț vine proba v100.396) */
  assert.ok(+(/^100\.(\d+)\.0$/.exec(pk.version) || [])[1] >= 395); assert.ok(+(/^v100\.(\d+)$/.exec(bi.version) || [])[1] >= 395); assert.ok(bi.li395 && bi.li395.length > 100);
  assert.ok((citeste("public", "index.html").match(/v100\.(\d+)/g) || []).filter((v) => +v.slice(5) >= 395).length >= 4); assert.ok(+(/crypto-radar-v100-(\d+)/.exec(citeste("public", "sw.js")) || [])[1] >= 395); assert.ok(+(/"v100\.(\d+)"/.exec(citeste("functions", "_shared", "versiune.js")) || [])[1] >= 395);
  assert.match(pk.scripts.test, /npm run test:v100394 && npm run test:v100395/); assert.equal(pk.scripts["test:v100395"], "node scripts/proba-v100395-monede-bot.mjs");
  assert.ok(+(/const VERSIUNE_COLECTOR = "v101\.(\d+)"/.exec(citeste("scripts", "colector.mjs")) || [])[1] >= 214);
});
console.log(`\nproba v100.395 (monedele de bot direcțional): ${teste - picate} / ${teste}`);
process.exit(picate ? 1 : 0);
