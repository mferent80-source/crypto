// I-888 — partea nevăzută a lumânării: același grid, același motor, pe lumânări de 1 minut față de 5 / 15 minute și 1 oră ADUNATE din ele.
// Regulile: docs/cercetare/2026-11-17-i888-lumanarea-si-bilantul.md (secțiunea A), scrise ÎNAINTEA datelor. Aici doar logica.
//   node scripts/cercetare-v100355-lumanarea.mjs --ce=aduce      (universul + lumânările de 1 minut, pe disc, se poate relua)
//   node scripts/cercetare-v100355-lumanarea.mjs --ce=masoara    (măsurătoarea A, verdictele după reguli)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { incarcaLib } from "./lib/motor-pagina.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([^=]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true]; }));
const CE = String(ARG.ce || ""), CACHE = ARG.cache || path.join(os.tmpdir(), "radar-cercetare-i888"); fs.mkdirSync(CACHE, { recursive: true });
const ZI = 86400000, MIN = 60000, FAPI = "https://fapi.binance.com";
export const A = Object.freeze({ deLa: Date.UTC(2026, 9, 18), pana: Date.UTC(2026, 10, 17), samanta: 20261117, monede: 40, acoperire: 0.95,
  lat: [0.06, 0.12, 0.24], pas: [0.003, 0.006, 0.012], dir: ["long", "neutru", "short"], H: [1, 3, 7],
  instr: [["5m", 5 * MIN], ["15m", 15 * MIN], ["1h", 60 * MIN]], prag: 0.10, pragT: 3, pragC1: 0.05 });
const L = incarcaLib(["text-ro.js", "grid-calcul.js", "grid-clasament.js", "grid-proba.js"], "({ G: GridCalcul, GC: GridClasament, GP: GridProba })"), G = L.G, GC = L.GC, GP = L.GP;
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asteapta = (ms) => new Promise((r) => setTimeout(r, ms));
const nr = (x, z = 2) => (Number.isFinite(x) ? x.toFixed(z).replace(".", ",") : "—");
const scrie = (n, o) => fs.writeFileSync(path.join(CACHE, n), JSON.stringify(o)), citeste = (n) => JSON.parse(fs.readFileSync(path.join(CACHE, n), "utf8")), exista = (n) => fs.existsSync(path.join(CACHE, n));

// ---------------- datele ----------------
let greutate = 0;
async function binance(cale) {
  if (greutate > 1500) { console.log("   (greutatea Binance e la " + greutate + ": aștept 30 s)"); await asteapta(30000); greutate = 0; }
  const r = await fetch(FAPI + cale, { signal: AbortSignal.timeout(30000) });
  greutate = Number(r.headers.get("x-mbx-used-weight-1m")) || greutate;
  if (r.status === 429 || r.status === 418) throw new Error("Binance a cerut pauză (HTTP " + r.status + "): mă opresc, nu insist. Reia mai târziu cu aceeași comandă.");
  const j = await r.json(); if (!r.ok) throw new Error("Binance HTTP " + r.status + " la " + cale.split("?")[0] + ": " + JSON.stringify(j).slice(0, 120));
  return j;
}
async function minute(sym) {
  let start = A.deLa; const toate = [];
  for (let p = 0; p < 40 && start < A.pana; p++) {
    const k = await binance(`/fapi/v1/klines?symbol=${sym}&interval=1m&limit=1500&startTime=${start}&endTime=${A.pana - 1}`);
    if (!Array.isArray(k)) throw new Error("Binance n-a dat lumânări pentru " + sym);
    if (!k.length) break;
    for (const x of k) if (+x[0] >= A.deLa && +x[0] + MIN <= A.pana) toate.push([+x[0], +x[1], +x[2], +x[3], +x[4]]);
    start = +k[k.length - 1][0] + MIN; await asteapta(450);
    if (k.length < 1500) break;
  }
  return toate;
}
// tragerea la sorți: Fisher-Yates cu mulberry32(samanta) pe lista cu pereche Binance (în ordinea volumului Pionex) - ordinea tragerii hotărăște
// calibrarea (pozițiile pare) și proba (impare) pentru C1
export function trage(lista, samanta = A.samanta, n = A.monede) {
  const l = lista.slice(), r = mulberry32(samanta);
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = l[i]; l[i] = l[j]; l[j] = t; }
  return l.slice(0, n);
}
async function aduce() {
  if (!exista("univers.json")) {
    const tk = await (await fetch("https://api.pionex.com/api/v1/market/tickers?type=PERP", { signal: AbortSignal.timeout(30000) })).json();
    const top = GC.topDupaVolum(tk && tk.data && tk.data.tickers, 100); if (top.length < 80) throw new Error("lista Pionex a venit scurtă: " + top.length);
    const ei = await binance("/fapi/v1/exchangeInfo"), are = new Set(ei.symbols.filter((s) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT").map((s) => s.symbol));
    const cu = top.map((m) => { const baza = String(m.simbol).replace(/_USDT_PERP$/, ""); const b = [baza + "USDT", "1000" + baza + "USDT", "1000000" + baza + "USDT", "1M" + baza + "USDT"].find((x) => are.has(x)) || null; return { pionex: m.simbol, binance: b }; }).filter((m) => m.binance);
    scrie("univers.json", { la: Date.now(), deLa: A.deLa, pana: A.pana, top: top.length, cuBinance: cu.length, trase: trage(cu) });
  }
  const u = citeste("univers.json");
  console.log("universul: " + u.top + " perpetue Pionex, " + u.cuBinance + " cu pereche pe Binance; trase " + u.trase.length + " (mulberry32(" + A.samanta + "))");
  let k = 0;
  for (const m of u.trase) { k++;
    if (!exista(m.binance + "-1m.json")) scrie(m.binance + "-1m.json", await minute(m.binance));
    if (k % 5 === 0 || k === u.trase.length) console.log("  " + k + " din " + u.trase.length + " pe disc · greutatea Binance: " + greutate);
  }
  console.log("GATA aducerea în " + CACHE);
}

// ---------------- măsurătoarea ----------------
// lumânările de ms adunate din cele de 1 minut, pe găleți de timp (un minut lipsă nu mută găleata)
export function aduna(b, ms) {
  const o = []; let cur = null;
  for (const x of b) { const t = Math.floor(x.t / ms) * ms;
    if (!cur || cur.t !== t) { cur = { t, o: x.o, h: x.h, l: x.l, c: x.c }; o.push(cur); } else { if (x.h > cur.h) cur.h = x.h; if (x.l < cur.l) cur.l = x.l; cur.c = x.c; } }
  return o;
}
export function griduri(pret) {
  const l = [];
  for (const lat of A.lat) for (const pas of A.pas) for (const dir of A.dir) l.push({ lat, pas, dir, st: G.construieste({ pret, lat, pas, dir }) });
  return l;
}
const fel = (b, t0, t1) => { let i = 0; while (i < b.length && b[i].t < t0) i++; let j = i; while (j < b.length && b[j].t < t1) j++; return b.slice(i, j); };
// pentru o monedă: { H: [ { w, t0, d: { "5m": [Δ pe grid], ... }, pas: [pas pe grid] } ] }
export function masoaraMoneda(b1, sim, opt = {}) {
  const inst = { "1m": b1 }; for (const [n, ms] of A.instr) inst[n] = aduna(b1, ms);
  const out = {};
  for (const H of A.H) { out[H] = [];
    for (let w = 0; w * H < (A.pana - A.deLa) / ZI; w++) {
      const t0 = A.deLa + w * H * ZI, t1 = t0 + H * ZI, f = {}; for (const n of Object.keys(inst)) f[n] = fel(inst[n], t0, t1);
      if (f["1m"].length < H * 1440 * A.acoperire) { out[H].push({ w, t0, sarit: "minute lipsă (" + f["1m"].length + ")" }); continue; }
      const gr = griduri(f["1m"][0].o), rez = { w, t0, d: {}, pas: gr.map((g) => g.pas), lich: 0 };
      const r1 = gr.map((g) => GP.simuleaza(f["1m"], 0, f["1m"].length, g.st)); rez.lich += r1.filter((r) => r.lichidat).length;
      for (const [n] of A.instr) rez.d[n] = gr.map((g, k) => { const r = GP.simuleaza(f[n], 0, f[n].length, g.st, opt.optSim ? opt.optSim(n) : undefined); return 100 * (r.net - r1[k].net); });
      out[H].push(rez);
    }
  }
  return out;
}
export function statT(v) { const n = v.length; if (n < 2) return { n, m: n ? v[0] : NaN, sd: NaN, t: NaN, jos: NaN, sus: NaN };
  const m = v.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)), se = sd / Math.sqrt(n), tc = n - 1 <= 3 ? [12.71, 4.30, 3.18][n - 2] : n - 1 <= 9 ? [2.78, 2.57, 2.45, 2.36, 2.31, 2.26][n - 5] : n - 1 <= 29 ? 2.05 : 2.0;
  return { n, m, sd, t: m / se, jos: m - tc * se, sus: m + tc * se }; }
// pe ferestre: media pe griduri ⇒ pe (monedă, fereastră); media pe monede ⇒ pe fereastră; ÷ H ⇒ pe zi
export function agrega(perMoneda, H, n, filtruPas) {
  const peF = new Map();
  for (const m of Object.values(perMoneda)) for (const r of m[H] || []) { if (!r.d) continue;
    const v = r.d[n].filter((_, k) => !filtruPas || r.pas[k] === filtruPas); if (!v.length) continue;
    const l = peF.get(r.w) || []; l.push(v.reduce((s, x) => s + x, 0) / v.length); peF.set(r.w, l); }
  const zile = [...peF.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l.reduce((s, x) => s + x, 0) / l.length / H);
  return statT(zile);
}
export function verdict(s) {
  if (Math.abs(s.m) >= A.prag && Math.abs(s.t) >= A.pragT) return "contează";
  if (Math.max(Math.abs(s.jos), Math.abs(s.sus)) < A.prag) return "cifrele stau";
  return "neclar";
}
function incarca() {
  const u = citeste("univers.json"), date = {}, sarite = [], amp = crypto.createHash("sha256");
  for (const m of u.trase) { if (!exista(m.binance + "-1m.json")) throw new Error("lipsește " + m.binance + ": aducerea nu s-a încheiat");
    const raw = fs.readFileSync(path.join(CACHE, m.binance + "-1m.json")); amp.update(m.binance).update(raw);
    const b = JSON.parse(raw).map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] }));
    if (b.length < (A.pana - A.deLa) / MIN * A.acoperire) { sarite.push(m.binance + " (" + b.length + " minute)"); continue; }
    date[m.binance] = b; }
  return { u, date, sarite, amprenta: amp.digest("hex").slice(0, 16) };
}
function masoara() {
  const { u, date, sarite, amprenta } = incarca(), per = {}, t0 = Date.now();
  console.log("monede: " + Object.keys(date).length + " din " + u.trase.length + (sarite.length ? " · scoase (sub 95% din minute): " + sarite.join(", ") : "") + " · amprenta datelor " + amprenta);
  for (const s of Object.keys(date)) per[s] = masoaraMoneda(date[s], s);
  console.log("socotit în " + Math.round((Date.now() - t0) / 1000) + " s");
  let lich = 0; for (const m of Object.values(per)) for (const H of A.H) for (const r of m[H]) lich += r.lich || 0;
  const rap = { amprenta, monede: Object.keys(date).length, lichidari1m: lich, H: {} };
  for (const H of A.H) { rap.H[H] = {};
    for (const [n] of A.instr) { const s = agrega(per, H, n), pp = {}; for (const p of A.pas) pp[p] = agrega(per, H, n, p);
      rap.H[H][n] = { s, verdict: H === 7 ? "(doar raportat)" : verdict(s), pePas: pp };
      console.log("H = " + H + " · " + n.padEnd(3) + " Δ pe zi " + nr(s.m, 3) + " puncte (95%: " + nr(s.jos, 3) + " … " + nr(s.sus, 3) + ", t " + nr(s.t, 1) + ", " + s.n + " ferestre) ⇒ " + rap.H[H][n].verdict
        + " · pe pas: " + A.pas.map((p) => nr(100 * p, 1) + "% " + nr(pp[p].m, 3)).join(" / ")); } }
  const c5 = rap.H[3]["5m"].s.m, c15 = rap.H[3]["15m"].s.m;
  console.log("1 minutul ca adevăr (H = 3): |Δ5m| / |Δ15m| = " + nr(Math.abs(c5) / Math.abs(c15), 2) + (Math.abs(c5) > 0.5 * Math.abs(c15) ? " ⇒ NU s-a așezat: cifrele sunt limita de jos" : " ⇒ s-a așezat"));
  console.log("lichidări pe 1 minut (în toate rulările): " + lich);
  scrie("rezultat-A.json", rap); fs.writeFileSync(path.join(CACHE, "per-moneda-A.json"), JSON.stringify(per));
}

// ---------------- C1: potrivirea pe calibrare, judecata pe probă ----------------
export const C1 = Object.freeze({ b: Array.from({ length: 26 }, (_, i) => Math.round((0.5 + 0.1 * i) * 10) / 10), eps: 0.05 });
// rulările unei monede pentru instrumentul n: { H, w, pas, d1 (net 1 minut), f (lumânările n ale ferestrei), st }
function rulari(b1, n, ms) {
  const bx = aduna(b1, ms), out = [];
  for (const H of A.H) for (let w = 0; w * H < (A.pana - A.deLa) / ZI; w++) {
    const t0 = A.deLa + w * H * ZI, t1 = t0 + H * ZI, f1 = fel(b1, t0, t1), fx = fel(bx, t0, t1); if (f1.length < H * 1440 * A.acoperire) continue;
    for (const g of griduri(f1[0].o)) out.push({ H, w, pas: g.pas, st: g.st, f: fx, net1: GP.simuleaza(f1, 0, f1.length, g.st).net });
  }
  return out;
}
export function potriveste(runs) {
  const base = runs.map((r) => GP.simuleaza(r.f, 0, r.f.length, r.st).net), D = runs.map((r, i) => base[i] - r.net1);
  let best = null;
  for (const b of C1.b) {
    const S = runs.map((r, i) => (GP.simuleaza(r.f, 0, r.f.length, r.st, { nevazut: { a: C1.eps, b } }).net - base[i]) / C1.eps);
    let sxy = 0, sxx = 0; for (let i = 0; i < S.length; i++) { sxy += D[i] * S[i]; sxx += S[i] * S[i]; }
    const a = sxx > 0 ? -sxy / sxx : 0; let sse = 0; for (let i = 0; i < S.length; i++) sse += (D[i] + a * S[i]) ** 2;
    if (!best || sse < best.sse) best = { a, b, sse };
  }
  return best;
}
function c1() {
  const { u, date, amprenta } = incarca(), cal = u.trase.filter((m, i) => i % 2 === 0 && date[m.binance]).map((m) => m.binance), prob = u.trase.filter((m, i) => i % 2 === 1 && date[m.binance]).map((m) => m.binance);
  console.log("C1 · amprenta " + amprenta + " · calibrare " + cal.length + " monede (pozițiile pare), probă " + prob.length + " (impare)");
  const par = {};
  for (const [n, ms] of A.instr.filter(([x]) => x !== "5m")) {
    const t0 = Date.now(), runs = []; for (const s of cal) runs.push(...rulari(date[s], n, ms));
    par[n] = potriveste(runs); console.log("  " + n + ": a = " + par[n].a.toPrecision(4) + ", b = " + par[n].b + " (" + runs.length + " rulări de calibrare, " + Math.round((Date.now() - t0) / 1000) + " s)");
  }
  // judecata pe PROBĂ: motorul corectat (nu aproximarea liniară), aceeași agregare ca A
  const fara = {}, cu = {}; for (const s of prob) { fara[s] = masoaraMoneda(date[s], s); cu[s] = masoaraMoneda(date[s], s, { optSim: (n) => (par[n] ? { nevazut: { a: par[n].a, b: par[n].b } } : undefined) }); }
  let trece = true; const rap = { amprenta, par, H: {} };
  for (const H of [1, 3]) { rap.H[H] = {};
    for (const n of Object.keys(par)) {
      const s0 = agrega(fara, H, n), s1 = agrega(cu, H, n), pp = A.pas.map((p) => agrega(cu, H, n, p).m);
      const ok1 = Math.abs(s1.m) <= A.pragC1, ok2 = Math.abs(s1.m) <= 0.5 * Math.abs(s0.m), ok3 = pp.every((v) => !(Math.sign(v) !== Math.sign(s0.m) && Math.abs(v) > A.prag));
      const ok = ok1 && ok2 && ok3; trece = trece && ok; rap.H[H][n] = { fara: s0, cu: s1, pePas: pp, ok1, ok2, ok3, ok };
      console.log("  H = " + H + " · " + n.padEnd(3) + " pe PROBĂ: fără C1 " + nr(s0.m, 3) + " ⇒ cu C1 " + nr(s1.m, 3) + " pe zi (95%: " + nr(s1.jos, 3) + " … " + nr(s1.sus, 3) + ") · pe pas " + pp.map((v) => nr(v, 3)).join(" / ")
        + " ⇒ " + (ok ? "TRECE" : "PICĂ") + " (|rămas| ≤ 0,05: " + (ok1 ? "da" : "NU") + "; scade ≥ 50%: " + (ok2 ? "da" : "NU") + "; nicio clasă de pas peste 0,10 în cealaltă parte: " + (ok3 ? "da" : "NU") + ")");
    } }
  rap.trece = trece; console.log("C1 " + (trece ? "TRECE ⇒ intră în motor (cu VERS_HOT 4 și H0-ul fișei refăcut)" : "PICĂ ⇒ motorul rămâne; partea nevăzută se scrie pe pagină"));
  scrie("rezultat-C1.json", rap);
}

if (CE === "aduce") await aduce();
else if (CE === "masoara") masoara();
else if (CE === "c1") c1();
else if (CE) { console.error("--ce=aduce | masoara | c1"); process.exit(2); }
