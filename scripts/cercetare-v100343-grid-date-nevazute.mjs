// G2 — pe date nevăzute: tăietura după volum a rețetei „Candidați de grid” (V) și „merită gridul, în medie?” (M). Regulile sunt în
// docs/cercetare/2026-11-13-tablou-acuratete.md („G2 — pe date nevăzute…”), scrise ÎNAINTEA oricărei lumânări a ferestrei; logica e în
// scripts/lib/g2-grid-date-nevazute.mjs și rulează codul paginii (GridCalcul, GridClasament, GridProba). Date publice Binance perp (lista
// simbolurilor, lumânări, funding). Nimic din vreun cont; nu scrie nimic în afara dosarului de cache.
//   node --max-old-space-size=8192 scripts/cercetare-v100343-grid-date-nevazute.mjs --ce=aduce|g2h0|g2|reper [--cache=<dosar>]
// aduce = universul ales la ÎNCEPUTUL ferestrei (primele 100 de perpetue USDT după volumul celor 7 zile de dinaintea ei, listate de cel puțin
//         84 de zile, monede) + lumânările de 4 h cu volum + cele de 15 min + funding-ul; se poate relua.
// g2h0  = înaintea cifrelor adevărate: autenticitatea (viitor stricat ⇒ aceleași clase, locuri după volum și rezultate), ce putea vedea
//         fiecare test pe seria ADEVĂRATĂ cu media scoasă, poarta pe etichete statornice (10.000 de ordini). NU arată nicio medie adevărată.
// g2    = cifrele adevărate, verdictele și cele de văzut alături; refuză dacă g2h0 lipsește sau e făcut pe alte date.
// reper = adăugat DUPĂ rezultat (revizia independentă): G2-M pe lumânări mai mari și pe un preț fără direcție (aceleași lumânări întoarse la
//         întâmplare), prin același motor. Fără verdict: arată cât din media lui M e al instrumentului.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { incarcaLib } from "./lib/motor-pagina.mjs";
import { G2, primaZi2, claseVolumLaZi, coinZileVolum, verdictV, permutariStatornice, testJohnson, verdictM, perioade, stricaViitorul2, valoriBlocuri, testCuGarda, ziIso, reperM } from "./lib/g2-grid-date-nevazute.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true]; }));
const CE = String(ARG.ce || ""), CACHE = ARG.cache || path.join(os.tmpdir(), "radar-cercetare-g2"); fs.mkdirSync(CACHE, { recursive: true });
const ZI = 86400000, FAPI = "https://fapi.binance.com", SAMANTA = 20261115;
const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js", "grid-proba.js"], "({ G: GridCalcul, GC: GridClasament, GP: GridProba })"), G = L.G, GC = L.GC, GP = L.GP;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const nr = (x, z) => (Number.isFinite(x) ? x.toFixed(z).replace(".", ",") : "—"), pc = (x, z = 2) => nr(100 * x, z) + "%", ps = (p) => (p < 1e-4 ? p.toExponential(1) : nr(p, 4));
const scrie = (nume, o) => fs.writeFileSync(path.join(CACHE, nume), JSON.stringify(o)), citeste = (nume) => JSON.parse(fs.readFileSync(path.join(CACHE, nume), "utf8"));
const exista = (nume) => fs.existsSync(path.join(CACHE, nume));

// ---------------- datele ----------------
let greutate = 0;
async function binance(cale) {
  while (greutate > 1700) { await asteapta(8000); greutate = Math.max(0, greutate - 400); }
  // o cerere care nu răspunde (rețeaua, nu refuzul Binance) se reia de cel mult 3 ori, cu pauză; un refuz (429 / 418) oprește tot, mai jos
  let r = null, eroare = null;
  for (let incercare = 0; incercare < 4 && !r; incercare++) { try { r = await fetch(FAPI + cale, { signal: AbortSignal.timeout(30000) }); } catch (e) { eroare = e; await asteapta(3000 * (incercare + 1)); } }
  if (!r) throw new Error("Binance nu răspunde la " + cale.split("?")[0] + " (" + String(eroare && eroare.message || eroare).slice(0, 80) + "). Reia cu aceeași comandă.");
  const folosit = Number(r.headers.get("x-mbx-used-weight-1m")); if (folosit > 0) greutate = folosit;   /* greutatea folosită în ultimul minut, spusă de Binance */
  if (r.status === 429 || r.status === 418) throw new Error("Binance a cerut pauză (HTTP " + r.status + "): mă opresc, nu insist. Reia mai târziu cu aceeași comandă.");
  const j = await r.json(); if (!r.ok) throw new Error("Binance HTTP " + r.status + " la " + cale.split("?")[0] + ": " + JSON.stringify(j).slice(0, 120));
  return j;
}
async function lumanari(sym, interval, pasMs, deLa, pana, cuVolum) {
  let start = deLa; const toate = [];
  for (let p = 0; p < 80 && start < pana; p++) {
    const k = await binance(`/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=1500&startTime=${start}&endTime=${pana - 1}`);
    if (!Array.isArray(k)) throw new Error("Binance n-a dat lumânări pentru " + sym + " " + interval);
    if (!k.length) break;
    for (const x of k) if (+x[0] + pasMs <= pana) toate.push(cuVolum ? [+x[0], +x[1], +x[2], +x[3], +x[4], +x[7]] : [+x[0], +x[1], +x[2], +x[3], +x[4]]);   /* doar barele închise până la capăt; x[7] = volumul în USDT */
    start = +k[k.length - 1][0] + pasMs; await asteapta(120);
    if (k.length < 1500) break;
  }
  return toate;
}
async function funding(sym, deLa, pana) {
  let start = deLa; const toate = [];
  for (let p = 0; p < 30 && start <= pana; p++) {
    const k = await binance(`/fapi/v1/fundingRate?symbol=${sym}&startTime=${start}&endTime=${pana}&limit=1000`);
    if (!Array.isArray(k)) throw new Error("Binance n-a dat funding pentru " + sym);
    if (!k.length) break;
    for (const x of k) toate.push([Math.round(+x.fundingTime / 1000) * 1000, +x.fundingRate]);
    start = +k[k.length - 1].fundingTime + 1; await asteapta(650);
    if (k.length < 1000) break;
  }
  return toate;
}
async function aduce() {
  const t0 = primaZi2();
  if (!exista("univers.json")) {
    const ei = await binance("/fapi/v1/exchangeInfo");
    const baza = (s) => String(s.baseAsset || "").replace(/^(1000000|1000|1M)(?=[A-Z0-9])/, "");
    const bune = ei.symbols.filter((s) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT" && (!s.underlyingType || s.underlyingType === "COIN") && Number(s.onboardDate) > 0 && Number(s.onboardDate) <= t0 - 84 * ZI && G.eCrypto(baza(s)));
    console.log("perpetue USDT (monede) listate de cel puțin 84 de zile la începutul ferestrei: " + bune.length + " din " + ei.symbols.length);
    const cuVol = []; let k = 0;
    for (const s of bune) { const z = await binance(`/fapi/v1/klines?symbol=${s.symbol}&interval=1d&startTime=${t0 - 7 * ZI}&endTime=${t0 - 1}&limit=7`); await asteapta(60);
      const v = Array.isArray(z) ? z.reduce((a, x) => a + (+x[7] || 0), 0) : 0; if (Array.isArray(z) && z.length >= 5 && v > 0) cuVol.push({ binance: s.symbol, vol7: v }); if (++k % 100 === 0) console.log("  volumul de dinaintea ferestrei: " + k + " din " + bune.length); }
    cuVol.sort((a, b) => b.vol7 - a.vol7);
    if (cuVol.length < 100) throw new Error("prea puține monede cu volum înaintea ferestrei: " + cuVol.length);
    scrie("univers.json", { la: Date.now(), pana: G2.pana, deLa: t0, eligibile: cuVol.length, monede: cuVol.slice(0, 100) });
  }
  const u = citeste("univers.json");
  console.log("universul (ales la începutul ferestrei, " + ziIso(u.deLa) + "): " + u.monede.length + " monede din " + u.eligibile + " cu volum · fereastra " + ziIso(t0) + " … " + ziIso(G2.pana - ZI));
  let facute = 0; const coada = u.monede.slice();
  const lucrator = async () => { for (;;) { const m = coada.shift(); if (!m) return;
    if (!exista(m.binance + "-4h.json")) scrie(m.binance + "-4h.json", await lumanari(m.binance, "4h", 14400000, t0 - 84 * ZI, G2.pana, true));
    if (!exista(m.binance + "-15m.json")) scrie(m.binance + "-15m.json", await lumanari(m.binance, "15m", 900000, t0, G2.pana, false));
    if (!exista(m.binance + "-f.json")) scrie(m.binance + "-f.json", await funding(m.binance, t0, G2.pana));
    if (++facute % 10 === 0 || facute === u.monede.length) console.log("  " + facute + " din " + u.monede.length + " monede pe disc · greutatea Binance pe ultimul minut: " + greutate); } };
  await Promise.all([lucrator(), lucrator()]);
  console.log("GATA aducerea: " + u.monede.length + " monede în " + CACHE);
}
function incarca() {
  if (!exista("univers.json")) throw new Error("nu există datele: rulează întâi --ce=aduce");
  const u = citeste("univers.json"); if (u.pana !== G2.pana || u.deLa !== primaZi2()) throw new Error("datele de pe disc au altă fereastră decât cea din reguli");
  const date = {}, amprenta = crypto.createHash("sha256");
  for (const m of u.monede) { for (const f of ["-4h.json", "-15m.json", "-f.json"]) if (!exista(m.binance + f)) throw new Error("lipsește " + m.binance + f + ": aducerea nu s-a încheiat");
    const a = fs.readFileSync(path.join(CACHE, m.binance + "-4h.json")), b = fs.readFileSync(path.join(CACHE, m.binance + "-15m.json")), c = fs.readFileSync(path.join(CACHE, m.binance + "-f.json"));
    amprenta.update(m.binance).update(a).update(b).update(c);
    date[m.binance] = { b4h: JSON.parse(a).map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4], qv: x[5] })), b15: JSON.parse(b).map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] })), f: JSON.parse(c) }; }
  return { date, univers: u, amprenta: amprenta.digest("hex").slice(0, 16) };
}
function rezumat(D, V, M) {
  const zile = new Set(V.randuri.map((r) => r.zi)), nT = V.randuri.filter((r) => r.clasa === "top").length, nR = V.randuri.length - nT;
  console.log("date: " + Object.keys(D.date).length + " monede · amprenta " + D.amprenta + " · V: " + zile.size + " zile din " + G2.zile + ", " + V.randuri.length + " monede-zi (mari " + nT + ", mici " + nR + "; pe zi " + nr(nT / zile.size, 1) + " / " + nr(nR / zile.size, 1)
    + "), sărite " + V.sarite.faraBare15 + " + " + V.sarite.grilaImposibila + " · M: " + G2.orizonturi.map((H) => M[H].valori.length + " perioade de " + H + " zile (din " + M[H].perioade.length + "; sărite " + M[H].sarite.faraBare15 + " + " + M[H].sarite.grilaImposibila + " monede-perioadă)").join(", "));
}
function socoteste(D) {
  const V = coinZileVolum(G, GC, GP, D.date), M = {}; for (const H of G2.orizonturi) M[H] = perioade(G, GC, GP, D.date, H);
  return { V, M };
}

// ---------------- înaintea cifrelor adevărate ----------------
function h0() {
  const D = incarca(), t0 = Date.now(), { V, M } = socoteste(D); rezumat(D, V, M); console.log("socotit în " + Math.round((Date.now() - t0) / 1000) + " s");
  const rnd = mulberry32(SAMANTA);
  // 1. autenticitatea: 5 zile (V) și 3 perioade pe fiecare orizont (M)
  const aut = []; const alese = []; while (alese.length < 5) { const d = Math.floor(rnd() * G2.zile); if (!alese.includes(d)) alese.push(d); }
  for (const d of alese) { const t = primaZi2() + d * ZI, curat = coinZileVolum(G, GC, GP, D.date, { doarZilele: [d] }).randuri, stricat = coinZileVolum(G, GC, GP, stricaViitorul2(D.date, t, t + ZI, rnd), { doarZilele: [d] }).randuri;
    aut.push({ ce: "V " + ziIso(t), randuri: curat.length, identic: curat.length > 0 && JSON.stringify(curat) === JSON.stringify(stricat) }); }
  for (const H of G2.orizonturi) { const nPer = Math.floor(G2.zile / H), al = []; while (al.length < 3) { const k = Math.floor(rnd() * nPer); if (!al.includes(k)) al.push(k); }
    for (const k of al) { const t = primaZi2() + k * H * ZI, curat = perioade(G, GC, GP, D.date, H, { doarPerioadele: [k], cuRanduri: true }).perioade, stricat = perioade(G, GC, GP, stricaViitorul2(D.date, t, t + H * ZI, rnd), H, { doarPerioadele: [k], cuRanduri: true }).perioade;
      aut.push({ ce: "M" + H + " " + ziIso(t), randuri: curat[0] ? curat[0].n : 0, identic: !!curat[0] && curat[0].n > 0 && JSON.stringify(curat) === JSON.stringify(stricat) }); } }
  console.log("autenticitatea (viitorul stricat ⇒ aceleași clase, locuri după volum și rezultate): " + aut.map((x) => x.ce + " " + (x.identic ? "identic" : "DIFERIT") + " (" + x.randuri + ")").join(" · "));
  if (!aut.every((x) => x.identic)) { scrie("g2h0.json", { la: Date.now(), amprenta: D.amprenta, autenticitate: aut, valid: false, motiv: "autenticitatea a picat" }); console.log("OPRIT: ceva din viitor intră în clase sau în rezultat. Cifrele adevărate nu se citesc."); process.exit(1); }
  // 2. poarta pe etichete statornice (V)
  const t1 = Date.now(), perm = permutariStatornice(V.randuri, G2.permutari, rnd); console.log("poarta pe etichete statornice: " + G2.permutari + " de ordini în " + Math.round((Date.now() - t1) / 1000) + " s");
  // t-ul de trecut la poarta statornică: p de permutare = (1 + câte ordini îl ajung) ÷ (N + 1) ≤ prag ⇒ cel mult k ordini îl pot ajunge ⇒ trebuie
  // să treacă de al (k + 1)-lea de sus (revizia independentă: înainte se afișa al (k + 2)-lea; verdictele nu țin de cifra aceasta)
  const pragPerm = (l) => { const s = l.filter(Number.isFinite).sort((x, y) => y - x), k = Math.floor(G2.alfa * (s.length + 1) - 1); return k >= 0 && k < s.length ? s[k] : Infinity; };
  // 3. ce putea vedea fiecare test, pe seria ADEVĂRATĂ cu media scoasă (media adevărată nu se arată)
  const putere = { v: {}, m: {} };
  for (const f of ["a", "b"]) { const v = valoriBlocuri(V.randuri, f, { deLa: primaZi2() }), m = v.reduce((s, x) => s + x, 0) / v.length, T = testCuGarda(v), trepte = f === "a" ? [1.05, 1.1, 1.2, 1.3, 1.5, 2, 3, 5] : [0.0005, 0.001, 0.002, 0.003, 0.005, 0.0075, 0.01, 0.02];
    putere.v[f] = { blocuri: v.length, sd: T.sd, r1: T.r1, df: T.df, tCritPerm: pragPerm(perm[f]), trepte: trepte.map((e) => ({ efect: e, verdict: verdictV(v.map((x) => x - m + (f === "a" ? Math.log(e) : e)), f, perm[f]).verdict })) };
    console.log("V-" + f.toUpperCase() + ": " + v.length + " blocuri · abaterea " + nr(T.sd, f === "a" ? 4 : 5) + " · autocorelația " + nr(T.r1, 2) + " ⇒ " + nr(T.df, 1) + " grade de libertate · t-ul de trecut la poarta statornică: " + nr(putere.v[f].tCritPerm, 2)
      + "\n   seria adevărată mutată la: " + putere.v[f].trepte.map((x) => (f === "a" ? "×" + nr(x.efect, 2) : "+" + pc(x.efect)) + " ⇒ " + x.verdict).join(" · ")); }
  for (const H of G2.orizonturi) { const v = M[H].valori, T = testJohnson(v), m = T.medie, trepte = [0.0005, 0.001, 0.002, 0.003, 0.005, 0.01].map((z) => z * H);
    putere.m[H] = { perioade: v.length, sd: T.sd, asimetrie: T.asimetrie, r1: T.r1, df: T.df, plus: trepte.map((e) => ({ efect: e, verdict: verdictM(v.map((x) => x - m + e), H).verdict })), minus: trepte.map((e) => ({ efect: -e, verdict: verdictM(v.map((x) => x - m - e), H).verdict })) };
    console.log("M-" + H + " zile: " + v.length + " perioade · abaterea " + pc(T.sd) + " · asimetria " + nr(T.asimetrie, 2) + " · autocorelația " + nr(T.r1, 2) + " ⇒ " + nr(T.df, 1) + " grade de libertate"
      + "\n   seria adevărată mutată la: " + putere.m[H].plus.map((x) => "+" + pc(x.efect / H) + " pe zi ⇒ " + x.verdict).join(" · ") + "\n   și la: " + putere.m[H].minus.map((x) => "−" + pc(-x.efect / H) + " pe zi ⇒ " + x.verdict).join(" · ")); }
  scrie("coinzile.json", { amprenta: D.amprenta, randuri: V.randuri }); scrie("perm.json", { amprenta: D.amprenta, a: perm.a, b: perm.b });
  scrie("g2h0.json", { la: Date.now(), amprenta: D.amprenta, valid: true, autenticitate: aut, putere });
  console.log("Pașii de dinaintea cifrelor sunt făcuți. Se poate rula --ce=g2.");
}

// ---------------- cifrele adevărate ----------------
function g2() {
  if (!exista("g2h0.json") || !exista("perm.json") || !exista("coinzile.json")) { console.log("REFUZ: întâi --ce=g2h0 (autenticitatea, ce putea vedea fiecare test, poarta pe etichete statornice), abia apoi cifrele adevărate."); process.exit(1); }
  const H0 = citeste("g2h0.json"), D = incarca();
  if (H0.amprenta !== D.amprenta) { console.log("REFUZ: g2h0 a fost făcut pe alte date (amprenta " + H0.amprenta + " față de " + D.amprenta + ")."); process.exit(1); }
  if (!H0.valid) { console.log("REFUZ: " + (H0.motiv || "pașii de dinaintea cifrelor n-au trecut") + "."); process.exit(1); }
  const { V, M } = socoteste(D), perm = citeste("perm.json"); rezumat(D, V, M);
  if (JSON.stringify(V.randuri) !== JSON.stringify(citeste("coinzile.json").randuri)) { console.log("REFUZ: monedele-zi nu ies ca la g2h0."); process.exit(1); }
  const out = { la: Date.now(), amprenta: D.amprenta, alfa: G2.alfa, teste: G2.teste, v: {}, m: {} }, med = (l, f) => l.reduce((s, r) => s + r[f], 0) / l.length;
  const top = V.randuri.filter((r) => r.clasa === "top"), rest = V.randuri.filter((r) => r.clasa === "rest"), mij = primaZi2() + (G2.zile / 2) * ZI;
  for (const f of ["a", "b"]) { const v = valoriBlocuri(V.randuri, f, { deLa: primaZi2() }), R = verdictV(v, f, perm[f]);
    const jum = [0, 1].map((h) => { const l = V.randuri.filter((r) => (Date.parse(r.zi + "T00:00:00Z") < mij) === (h === 0)), a = med(l.filter((r) => r.clasa === "top"), f), b = med(l.filter((r) => r.clasa === "rest"), f); return f === "a" ? a / b : a - b; });
    out.v[f] = Object.assign({ valori: v, medieTop: med(top, f), medieRest: med(rest, f), jumatati: jum }, R);
    console.log("V-" + f.toUpperCase() + (f === "a" ? " — grilele încasate" : " — rezultatul total") + " (din sumă, pe zi): mari " + pc(out.v[f].medieTop, 3) + " · mici " + pc(out.v[f].medieRest, 3)
      + "\n   pe blocuri (" + R.n + "): " + (f === "a" ? "raportul ×" + nr(R.marime, 2) : "diferența " + (R.marime >= 0 ? "+" : "−") + pc(Math.abs(R.marime), 3) + " pe zi") + " · t = " + nr(R.t, 2) + " · autocorelația " + nr(R.r1, 2) + " ⇒ t cu gardă = " + nr(R.tGarda, 2) + " (" + nr(R.df, 1) + " g.l.)"
      + " · p = " + ps(R.p) + " (invers " + ps(R.pInvers) + ") · p de permutare = " + ps(R.pPerm) + " (invers " + ps(R.pPermInvers) + ") · prag " + nr(G2.alfa, 5)
      + "\n   pe jumătăți: " + jum.map((x) => (f === "a" ? "×" + nr(x, 2) : (x >= 0 ? "+" : "−") + pc(Math.abs(x), 3))).join(" · ") + "\n   VERDICT: " + R.verdict); }
  const lichV = V.randuri.filter((r) => r.b <= -0.999); console.log("   lichidări la V (rezultat −100%): " + lichV.length + " · mari " + lichV.filter((r) => r.clasa === "top").length + ", mici " + lichV.filter((r) => r.clasa === "rest").length);
  out.v.lichidari = { toate: lichV.length, top: lichV.filter((r) => r.clasa === "top").length, rest: lichV.filter((r) => r.clasa === "rest").length };
  for (const H of G2.orizonturi) { const P = M[H], v = P.valori, R = verdictM(v, H), s = v.slice().sort((x, y) => x - y), bune = P.perioade.filter((p) => p.n >= G2.minMonedePerioada);
    const jum = [0, 1].map((h) => { const l = bune.filter((p, i) => (i < bune.length / 2) === (h === 0)).map((p) => p.medie); return l.reduce((a, x) => a + x, 0) / l.length; });
    const monede = bune.reduce((a, p) => a + p.n, 0), stop = bune.reduce((a, p) => a + p.stopuri, 0), lich = bune.reduce((a, p) => a + p.lichidari, 0);
    const D2 = perioade(G, GC, GP, D.date, H, { comision: 2 }).valori, m2 = D2.reduce((a, x) => a + x, 0) / D2.length;
    out.m[H] = Object.assign({ valori: v, plus: v.filter((x) => x > 0).length, mediana: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1], jumatati: jum, monedePerioada: monede, stopuri: stop, lichidari: lich, medieComisionDublu: m2 }, R);
    console.log("M-" + H + " zile — gridul cu stopul casei, media pe perioadă (din sumă): " + (R.medie >= 0 ? "+" : "−") + pc(Math.abs(R.medie), 3) + " (" + (R.medie >= 0 ? "+" : "−") + pc(Math.abs(R.medie) / H, 3) + " pe zi) · " + R.n + " perioade"
      + "\n   t = " + nr(R.t, 2) + " · Johnson " + nr(R.tJ, 2) + " · asimetria " + nr(R.asimetrie, 2) + " · autocorelația " + nr(R.r1, 2) + " ⇒ cu gardă " + nr(R.tGarda, 2) + " (" + nr(R.df, 1) + " g.l.) · p „pe plus” = " + ps(R.pPlus) + " · p „pe minus” = " + ps(R.pMinus) + " · prag " + nr(G2.alfa, 5) + " · minim " + pc(R.minim)
      + "\n   de văzut: " + out.m[H].plus + " perioade pe plus din " + R.n + " · mediana " + pc(out.m[H].mediana) + " · cea mai proastă " + pc(s[0]) + " · cea mai bună " + pc(s[s.length - 1]) + " · pe jumătăți " + jum.map((x) => pc(x, 3)).join(" / ")
      + " · oprite pe stop " + pc(stop / monede, 0) + " din monedele-perioadă · lichidări " + lich + " · cu comisioane duble media " + pc(m2, 3) + "\n   VERDICT: " + R.verdict); }
  scrie("g2.json", out);
}

// ---------------- reperul fără direcție (după rezultat; fără verdict) ----------------
function reper() {
  const D = incarca(), out = { la: Date.now(), amprenta: D.amprenta };
  for (const H of G2.orizonturi) { const P = reperM(G, GC, GP, D.date, H, mulberry32(SAMANTA + 100 + H)).perioade, med = (c) => P.reduce((a, p) => a + p[c], 0) / P.length, monede = P.reduce((a, p) => a + p.n, 0);
    const dif = P.map((p) => p.real - p.reper), T = testJohnson(dif), T0 = testJohnson(P.map((p) => p.real));
    out[H] = { perioade: P.length, real: med("real"), real30: med("real30"), real60: med("real60"), reper: med("reper"), diferenta: T.medie, sd: T.sd, tGarda: T.tGarda, pMinus: T.pMinus, pPlus: T.pPlus };
    console.log("M-" + H + " zile · " + P.length + " perioade, " + monede + " monede-perioadă\n   datele adevărate: lumânări de 15 min " + pc(out[H].real, 3) + " · de 30 min " + pc(out[H].real30, 3) + " · de 60 min " + pc(out[H].real60, 3)
      + "\n   reperul fără direcție (aceleași lumânări de 15 min, întoarse la întâmplare; două trageri): " + pc(out[H].reper, 3) + " · ieșite pe stop sau țintă: adevărat " + pc(P.reduce((a, p) => a + p.stopReal, 0) / monede, 0) + ", reper " + pc(P.reduce((a, p) => a + p.stopReper, 0) / monede, 0)
      + "\n   adevărat − reper, pe perioade: " + (T.medie >= 0 ? "+" : "−") + pc(Math.abs(T.medie), 3) + " · Johnson cu gardă " + nr(T.tGarda, 2) + " · p „pe minus” " + ps(T.pMinus) + " · p „pe plus” " + ps(T.pPlus) + "   (față de zero: " + nr(T0.tGarda, 2) + ", p „pe minus” " + ps(T0.pMinus) + ")"); }
  scrie("reper.json", out);
}

if (CE === "aduce") await aduce(); else if (CE === "g2h0") h0(); else if (CE === "g2") g2(); else if (CE === "reper") reper();
else { console.log("folosire: node --max-old-space-size=8192 scripts/cercetare-v100343-grid-date-nevazute.mjs --ce=aduce|g2h0|g2|reper [--cache=<dosar>]"); process.exit(2); }
