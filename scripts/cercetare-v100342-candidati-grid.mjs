// G1 — „Candidați de grid”: aduc primele din clasament mai mult decât ceilalți candidați? Regulile sunt în
// docs/cercetare/2026-11-13-tablou-acuratete.md („G1 — …”), scrise ÎNAINTEA oricărei lumânări; logica e în scripts/lib/g1-candidati-grid.mjs
// și rulează codul paginii (GridCalcul, GridClasament, GridProba), nu o copie a formulelor. Date publice: lista perpetuelor Pionex (o cerere),
// lumânări și funding Binance perp. Nimic din vreun cont; nu scrie nimic în afara dosarului de cache.
//   node scripts/cercetare-v100342-candidati-grid.mjs --ce=aduce|g1h0|g1 [--cache=<dosar>]
// aduce = universul (top 100 PERP Pionex după volum, cu perechea Binance) + lumânările de 4 h și de 15 min + funding-ul, până la capătul fix
//         din reguli; se poate relua (ce e deja pe disc nu se mai cere).
// g1h0  = înaintea cifrei adevărate: autenticitatea (viitor stricat ⇒ aceleași clase și rezultate), P1 (etichete la întâmplare în fiecare zi:
//         mărimea testului pe structura reală), puterea, P2 (aceeași ordine întâmplătoare mereu - doar de știut). NU arată cifra adevărată.
// g1    = cifra adevărată și verdictele; refuză dacă g1h0 lipsește, e făcut pe alte date sau P1 a trecut de limită.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { incarcaLib } from "./lib/motor-pagina.mjs";
import { G1, primaZi, ziIso, coinZile, valoriBlocuri, verdictG1, placebo, sansaDovedit, stricaViitorul } from "./lib/g1-candidati-grid.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true]; }));
const CE = String(ARG.ce || ""), CACHE = ARG.cache || path.join(os.tmpdir(), "radar-cercetare-g1"); fs.mkdirSync(CACHE, { recursive: true });
const ZI = 86400000, FAPI = "https://fapi.binance.com", SAMANTA = 20261114;
const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js", "grid-proba.js"], "({ G: GridCalcul, GC: GridClasament, GP: GridProba })"), G = L.G, GC = L.GC, GP = L.GP;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const nr = (x, z) => (Number.isFinite(x) ? x.toFixed(z).replace(".", ",") : "—"), pc = (x, z = 2) => nr(100 * x, z) + "%";
const scrie = (nume, o) => fs.writeFileSync(path.join(CACHE, nume), JSON.stringify(o)), citeste = (nume) => JSON.parse(fs.readFileSync(path.join(CACHE, nume), "utf8"));
const exista = (nume) => fs.existsSync(path.join(CACHE, nume));

// ---------------- datele ----------------
let greutate = 0;
async function binance(cale) {
  if (greutate > 1500) { console.log("   (greutatea Binance e la " + greutate + ": aștept 25 s)"); await asteapta(25000); }
  const r = await fetch(FAPI + cale, { signal: AbortSignal.timeout(30000) });
  greutate = Number(r.headers.get("x-mbx-used-weight-1m")) || greutate;
  if (r.status === 429 || r.status === 418) throw new Error("Binance a cerut pauză (HTTP " + r.status + "): mă opresc, nu insist. Reia mai târziu cu aceeași comandă.");
  const j = await r.json(); if (!r.ok) throw new Error("Binance HTTP " + r.status + " la " + cale.split("?")[0] + ": " + JSON.stringify(j).slice(0, 120));
  return j;
}
async function lumanari(sym, interval, pasMs, deLa, pana) {
  let start = deLa; const toate = [];
  for (let p = 0; p < 60 && start < pana; p++) {
    const k = await binance(`/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=1500&startTime=${start}&endTime=${pana - 1}`);
    if (!Array.isArray(k)) throw new Error("Binance n-a dat lumânări pentru " + sym + " " + interval);
    if (!k.length) break;
    for (const x of k) if (+x[0] + pasMs <= pana) toate.push([+x[0], +x[1], +x[2], +x[3], +x[4]]);   /* doar barele închise până la capăt */
    start = +k[k.length - 1][0] + pasMs; await asteapta(380);
    if (k.length < 1500) break;
  }
  return toate;
}
async function funding(sym, deLa, pana) {
  let start = deLa; const toate = [];
  for (let p = 0; p < 20 && start <= pana; p++) {
    const k = await binance(`/fapi/v1/fundingRate?symbol=${sym}&startTime=${start}&endTime=${pana}&limit=1000`);
    if (!Array.isArray(k)) throw new Error("Binance n-a dat funding pentru " + sym);
    if (!k.length) break;
    for (const x of k) toate.push([Math.round(+x.fundingTime / 1000) * 1000, +x.fundingRate]);   /* fundingTime are câteva ms peste ora exactă */
    start = +k[k.length - 1].fundingTime + 1; await asteapta(700);
    if (k.length < 1000) break;
  }
  return toate;
}
async function aduce() {
  if (!exista("univers.json")) {
    const tk = await (await fetch("https://api.pionex.com/api/v1/market/tickers?type=PERP", { signal: AbortSignal.timeout(30000) })).json();
    const top = GC.topDupaVolum(tk && tk.data && tk.data.tickers, 100); if (top.length < 80) throw new Error("lista Pionex a venit scurtă: " + top.length);
    const ei = await binance("/fapi/v1/exchangeInfo"), are = new Set(ei.symbols.filter((s) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT").map((s) => s.symbol));
    const monede = top.map((m) => { const baza = String(m.simbol).replace(/_USDT_PERP$/, ""); const b = [baza + "USDT", "1000" + baza + "USDT", "1000000" + baza + "USDT", "1M" + baza + "USDT"].find((x) => are.has(x)) || null; return { pionex: m.simbol, binance: b }; });
    scrie("univers.json", { la: Date.now(), pana: G1.pana, monede });
  }
  const u = citeste("univers.json"), cu = u.monede.filter((m) => m.binance);
  console.log("universul: " + u.monede.length + " perpetue Pionex, " + cu.length + " cu pereche pe Binance, " + (u.monede.length - cu.length) + " fără (rămân pe dinafară) · capătul datelor " + new Date(G1.pana).toISOString());
  const t0 = primaZi(); let k = 0;
  for (const m of cu) { k++;
    if (!exista(m.binance + "-4h.json")) scrie(m.binance + "-4h.json", await lumanari(m.binance, "4h", 14400000, t0 - 84 * ZI, G1.pana));
    if (!exista(m.binance + "-15m.json")) scrie(m.binance + "-15m.json", await lumanari(m.binance, "15m", 900000, t0, G1.pana));
    if (!exista(m.binance + "-f.json")) scrie(m.binance + "-f.json", await funding(m.binance, t0, G1.pana));
    if (k % 10 === 0 || k === cu.length) console.log("  " + k + " din " + cu.length + " monede pe disc · greutatea Binance pe ultimul minut: " + greutate);
  }
  console.log("GATA aducerea: " + cu.length + " monede în " + CACHE);
}
function incarca() {
  if (!exista("univers.json")) throw new Error("nu există datele: rulează întâi --ce=aduce");
  const u = citeste("univers.json"); if (u.pana !== G1.pana) throw new Error("datele de pe disc au alt capăt decât cel din reguli");
  const date = {}, ob = (x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] }), amprenta = crypto.createHash("sha256");
  for (const m of u.monede.filter((x) => x.binance)) { for (const f of ["-4h.json", "-15m.json", "-f.json"]) if (!exista(m.binance + f)) throw new Error("lipsește " + m.binance + f + ": aducerea nu s-a încheiat");
    const a = fs.readFileSync(path.join(CACHE, m.binance + "-4h.json")), b = fs.readFileSync(path.join(CACHE, m.binance + "-15m.json")), c = fs.readFileSync(path.join(CACHE, m.binance + "-f.json"));
    amprenta.update(m.binance).update(a).update(b).update(c);
    date[m.binance] = { b4h: JSON.parse(a).map(ob), b15: JSON.parse(b).map(ob), f: JSON.parse(c) }; }
  return { date, univers: u, amprenta: amprenta.digest("hex").slice(0, 16) };
}
function rezumatDate(randuri, sarite, D) {
  const zile = new Set(randuri.map((r) => r.zi)), nTop = randuri.filter((r) => r.clasa === "top").length, nRest = randuri.length - nTop;
  console.log("date: " + Object.keys(D.date).length + " monede · amprenta " + D.amprenta + " · " + zile.size + " zile din " + G1.zile + " · " + randuri.length + " monede-zi (primele " + nTop + ", ceilalți " + nRest
    + "; pe zi în medie " + nr(nTop / zile.size, 1) + " / " + nr(nRest / zile.size, 1) + ") · sărite: " + sarite.faraBare15 + " fără lumânări de 15 min, " + sarite.grilaImposibila + " fără grid");
}

// ---------------- înaintea cifrei adevărate ----------------
function h0() {
  const D = incarca(), t0 = Date.now(), { randuri, sarite } = coinZile(G, GC, GP, D.date);
  rezumatDate(randuri, sarite, D); console.log("monedele-zi socotite în " + Math.round((Date.now() - t0) / 1000) + " s");
  const rnd = mulberry32(SAMANTA), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  // 1. autenticitatea, pe 5 zile alese la întâmplare
  const alese = []; while (alese.length < 5) { const d = Math.floor(rnd() * G1.zile); if (!alese.includes(d)) alese.push(d); }
  const aut = alese.map((d) => { const t = primaZi() + d * ZI, curat = coinZile(G, GC, GP, D.date, { doarZilele: [d] }).randuri, stricat = coinZile(G, GC, GP, stricaViitorul(D.date, t, t + ZI, rnd), { doarZilele: [d] }).randuri;
    return { zi: ziIso(t), randuri: curat.length, identic: curat.length > 0 && JSON.stringify(curat) === JSON.stringify(stricat) }; });
  console.log("autenticitatea (viitorul stricat ⇒ aceleași clase și rezultate): " + aut.map((x) => x.zi + " " + (x.identic ? "identic" : "DIFERIT") + " (" + x.randuri + ")").join(" · "));
  if (!aut.every((x) => x.identic)) { scrie("g1h0.json", { la: Date.now(), amprenta: D.amprenta, autenticitate: aut, valid: false, motiv: "autenticitatea a picat" }); console.log("OPRIT: ceva din viitor intră în clasament sau în rezultat. Cifra adevărată nu se citește."); process.exit(1); }
  // 2. P1 și P2
  const p1 = placebo(randuri, "zi", G1.h0Rulari, rnd), p2 = placebo(randuri, "fix", G1.h0Rulari, rnd);
  const linie = (p, f) => "respingeri la 2,5% nominal: " + pc(p[f].rata25) + " · la pragul verdictului: " + p[f].respAlfa + " din " + p.rulari + " (nominal " + nr(p.rulari * G1.alfa, 1) + ") · abaterea valorilor pe blocuri: " + nr(p[f].sd, f === "a" ? 4 : 5);
  console.log("P1 (etichete la întâmplare în fiecare zi), " + G1.h0Rulari + " de rulări:\n  A (grilele încasate): " + linie(p1, "a") + "\n  B (rezultatul total):  " + linie(p1, "b"));
  console.log("P2 (aceeași ordine întâmplătoare a monedelor în toate zilele), doar de știut:\n  A: " + linie(p2, "a") + "\n  B: " + linie(p2, "b"));
  const valid = p1.a.rata25 < G1.h0Limita && p1.b.rata25 < G1.h0Limita;
  // 3. puterea: cel mai mic efect care ar ieși DOVEDIT în 4 cazuri din 5, pe blocuri independente cu abaterea din P1
  const nBloc = valoriBlocuri(randuri, "b").length, putere = {};
  for (const f of ["a", "b"]) { const sd = p1[f].sd, trepte = f === "a" ? [1.2, 1.25, 1.3, 1.4, 1.5, 1.75, 2] : [0.0005, 0.001, 0.0015, 0.002, 0.003, 0.005, 0.01];
    putere[f] = trepte.map((e) => ({ efect: e, sansa: sansaDovedit(f, f === "a" ? Math.log(e) : e, sd, nBloc, 4000, norm) })); }
  console.log("puterea pe " + nBloc + " blocuri (șansa de DOVEDIT dacă efectul adevărat ar fi …):\n  A: " + putere.a.map((x) => "×" + nr(x.efect, 2) + " ⇒ " + pc(x.sansa, 0)).join(" · ") + "\n  B: " + putere.b.map((x) => "+" + pc(x.efect) + " pe zi ⇒ " + pc(x.sansa, 0)).join(" · "));
  const t2 = (p, f) => { const s = p[f].t.filter(Number.isFinite).sort((x, y) => x - y); return { p50: s[Math.floor(s.length * 0.5)], p975: s[Math.floor(s.length * 0.975)], p995: s[Math.floor(s.length * 0.995)] }; };
  scrie("coinzile.json", { amprenta: D.amprenta, randuri, sarite });
  scrie("g1h0.json", { la: Date.now(), amprenta: D.amprenta, monede: Object.keys(D.date).length, monedeZi: randuri.length, sarite, blocuri: nBloc, autenticitate: aut, valid,
    p1: { a: { rata25: p1.a.rata25, respAlfa: p1.a.respAlfa, sd: p1.a.sd }, b: { rata25: p1.b.rata25, respAlfa: p1.b.respAlfa, sd: p1.b.sd } },
    p2: { a: { rata25: p2.a.rata25, respAlfa: p2.a.respAlfa, sd: p2.a.sd, t: t2(p2, "a") }, b: { rata25: p2.b.rata25, respAlfa: p2.b.respAlfa, sd: p2.b.sd, t: t2(p2, "b") } }, putere });
  console.log(valid ? "P1 sub limita de " + pc(G1.h0Limita, 0) + ": testul ține mărimea. Se poate rula --ce=g1." : "P1 a trecut de limita de " + pc(G1.h0Limita, 0) + ": testul NU ține mărimea pe datele acestea ⇒ „nemăsurat”. --ce=g1 va refuza.");
}

// ---------------- cifra adevărată ----------------
function g1() {
  if (!exista("g1h0.json") || !exista("coinzile.json")) { console.log("REFUZ: întâi --ce=g1h0 (autenticitatea, mărimea, puterea), abia apoi cifra adevărată."); process.exit(1); }
  const H = citeste("g1h0.json"), D = incarca();
  if (H.amprenta !== D.amprenta) { console.log("REFUZ: g1h0 a fost făcut pe alte date (amprenta " + H.amprenta + " față de " + D.amprenta + ")."); process.exit(1); }
  if (!H.valid) { console.log("REFUZ: " + (H.motiv || "P1 a trecut de limită") + " ⇒ rezultatul e „nemăsurat — testul nu ține mărimea”."); process.exit(1); }
  const { randuri, sarite } = coinZile(G, GC, GP, D.date); rezumatDate(randuri, sarite, D);
  if (JSON.stringify(randuri) !== JSON.stringify(citeste("coinzile.json").randuri)) { console.log("REFUZ: monedele-zi nu ies ca la g1h0."); process.exit(1); }
  const out = { la: Date.now(), amprenta: D.amprenta, alfa: G1.alfa, teste: G1.teste };
  for (const f of ["a", "b"]) { const v = valoriBlocuri(randuri, f), V = verdictG1(v, f); out[f] = { ...V, valori: v };
    const top = randuri.filter((r) => r.clasa === "top"), rest = randuri.filter((r) => r.clasa === "rest"), med = (l) => l.reduce((s, r) => s + r[f], 0) / l.length;
    out[f].medieTop = med(top); out[f].medieRest = med(rest);
    console.log((f === "a" ? "A — grilele încasate (din sumă, pe zi)" : "B — rezultatul total (din sumă, pe zi)") + ": primele " + pc(out[f].medieTop, 3) + " · ceilalți " + pc(out[f].medieRest, 3)
      + "\n   pe blocuri (" + V.n + "): " + (f === "a" ? "raportul ×" + nr(V.marime, 2) : "diferența " + (V.marime >= 0 ? "+" : "−") + pc(Math.abs(V.marime), 3) + " pe zi") + " · t = " + nr(V.t, 2) + " · autocorelația " + nr(V.r1, 2) + " ⇒ t cu gardă = " + nr(V.tGarda, 2)
      + " · p = " + (V.p < 1e-4 ? V.p.toExponential(1) : nr(V.p, 4)) + " (invers: " + (V.pInvers < 1e-4 ? V.pInvers.toExponential(1) : nr(V.pInvers, 4)) + ") · prag 0,05 ÷ " + 2 * G1.teste + " = " + nr(G1.alfa, 5) + "\n   VERDICT: " + V.verdict); }
  scrie("g1.json", out);
}

if (CE === "aduce") await aduce(); else if (CE === "g1h0") h0(); else if (CE === "g1") g1();
else { console.log("folosire: node scripts/cercetare-v100342-candidati-grid.mjs --ce=aduce|g1h0|g1 [--cache=<dosar>]"); process.exit(2); }
