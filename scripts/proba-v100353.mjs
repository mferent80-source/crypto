// Proba v100.353 (17.11.2026, el: „o listă de boți care stau într-un canal de ±5–10% și oscilează acolo”, „pe fiecare parte”, „14 zile”,
// apoi „continuă”): „🔁 Oscilo (în probă)” - tura colectorului (scripts/lib/tura-oscilo.mjs), ruta sugestii:oscilo, grupul de pe Probe.
//   node scripts/proba-v100353.mjs   (DATE_1H=<dosar> ⇒ și echivalența cu proba pe istoric; altfel C:/Users/Cimin/crypto/data/istoric-1h dacă există)
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const GridCalcul = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const GridProba = new Function("GridCalcul", `${lib("grid-proba.js")}; return GridProba;`)(GridCalcul);
const GridClasament = new Function("GridCalcul", `${lib("grid-clasament.js")}; return GridClasament;`)(GridCalcul);
const M = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-oscilo.mjs")).href);
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ORA = 3600000, ZI = 86400000, T0 = Date.UTC(2026, 9, 1);
// bare de 1 h: f(i) = prețul la ora i (cu zgomot mic), fitilurile ±0,3%
function serie(ore, f, seed) { const r = mulberry(seed), out = []; let p = f(0); for (let i = 0; i < ore; i++) { const o = p; p = f(i) * (1 + (r() - 0.5) * 0.002); out.push({ t: T0 + i * ORA, o, h: Math.max(o, p) * 1.003, l: Math.min(o, p) * 0.997, c: p }); } return out; }
const osc = (A, per) => (i) => 100 * (1 + A * Math.sin(2 * Math.PI * i / per));   // canal ±A, o oscilare la `per` ore
// definiția din proba pre-înregistrată (scratchpad oscilo/proba-oscilo.mjs), scrisă din nou aici ca martor
function martor(C) { const s = C.slice().sort((a, b) => a - b), c = s[Math.floor(s.length / 2)]; let h = 0; for (const x of C) h = Math.max(h, Math.abs(x / c - 1)); let tr = 0, sg = 0; for (const x of C) { const g = Math.sign(x - c); if (g && sg && g !== sg) tr++; if (g) sg = g; } const net = Math.abs(C[C.length - 1] / C[0] - 1); return { c, h, tr, intra: h >= 0.05 && h <= 0.10 && net <= h / 2 && tr >= 6 }; }

console.log("\nV100.353 · Oscilo (în probă) · proba\n");
const START = T0 + 20 * ZI;

await test("🔑 O1 definiția = cea din proba pre-înregistrată: canal ±7% cu oscilări intră; panta, canalul de ±15%, cel de ±3% și cel fără treceri NU", () => {
  const cazuri = { bun: serie(30 * 24, osc(0.07, 48), 1), panta: serie(30 * 24, (i) => 100 * (1 + 0.004 * i / 24) * (1 + 0.06 * Math.sin(2 * Math.PI * i / 48)), 2), larg: serie(30 * 24, osc(0.15, 48), 3), ingust: serie(30 * 24, osc(0.03, 48), 4), lent: serie(30 * 24, osc(0.07, 24 * 14), 5) };
  const n = M.noteaza(cazuri, START), O = n.O.map((x) => x.s).sort();
  assert.deepEqual(O, ["bun"], "O: " + O.join(","));
  for (const [s, b] of Object.entries(cazuri)) { const f = M.fereastra(b, START - 14 * ZI, START), k = M.canal(f.map((x) => x.c)), m = martor(f.map((x) => x.c)); assert.equal(k.intra, m.intra, s); assert.equal(k.trav, m.tr, s); assert.equal(k.c, m.c, s); assert.equal(k.h, m.h, s); }
  const x = n.O[0]; assert.ok(x.h >= 0.05 && x.h <= 0.1 && x.trav >= 6 && x.pret > 0 && isFinite(x.poz));
  for (const r of n.R) assert.ok(r.h >= 0.05 && r.h <= 0.10, "R cu h tăiat la [5%, 10%]: " + r.s + " " + r.h);
  assert.equal(n.R.length, 4); assert.equal(n.fara, 0);
});
await test("O2 doar trecutul la notare: barele de după start nu schimbă notarea (fără privire în viitor)", () => {
  const b = serie(30 * 24, osc(0.07, 48), 6), a = M.noteaza({ x: b }, START), b2 = b.map((y) => (y.t >= START ? Object.assign({}, y, { c: y.c * 3, h: y.h * 3 }) : y)), c = M.noteaza({ x: b2 }, START);
  assert.deepEqual(a, c);
});
await test("O3 barele: bara în formare iese, secundele devin ms, fără dubluri; o gaură de o oră ⇒ fereastra nu se ia (moneda trece la „fără date”)", () => {
  const k = [[T0 / 1000, "1", "1.1", "0.9", "1.05"], { time: T0 + ORA, open: 1.05, high: 1.1, low: 1, close: 1.02 }, { time: T0 + ORA, open: 1.05, high: 1.1, low: 1, close: 1.03 }, { time: T0 + 2 * ORA, open: 1, high: 1, low: 1, close: 1 }];
  const b = M.bare1h(k, T0 + 2 * ORA + 1000); assert.equal(b.length, 2); assert.equal(b[0].t, T0); assert.equal(b[1].c, 1.03);
  const s = serie(30 * 24, osc(0.07, 48), 7).filter((x) => x.t !== START - 5 * ZI); const n = M.noteaza({ g: s }, START);
  assert.equal(n.fara, 1); assert.equal(n.O.length + n.R.length, 0);
});
await test("🔑 O4 judecata la 7 zile: canalul ține / se sparge; G1 = gridul din probă (168 h, stop 1,5h), G2 = primele 72 h, G3 = stopul la 1,2h - același motor", () => {
  const b = serie(30 * 24, osc(0.07, 48), 8), n = M.noteaza({ b }, START), x = n.O[0], j = M.judeca(x, b, START, GridProba);
  assert.equal(j.tine, 1);
  const V = b.filter((y) => y.t >= START && y.t < START + 7 * ZI), st = (ore, k) => GridProba.simuleaza(V.slice(0, ore), 0, ore, { jos: x.c * (1 - x.h), sus: x.c * (1 + x.h), grile: 19, levier: 2, dir: "neutru", suma: 100, stop: { jos: x.c * (1 - k * x.h), sus: x.c * (1 + k * x.h) }, tip: "aritmetic", fundingZi: 0 }).net * 100;
  assert.ok(Math.abs(j.G1 - st(168, 1.5)) < 1e-4); assert.ok(Math.abs(j.G2 - st(72, 1.5)) < 1e-4); assert.ok(Math.abs(j.G3 - st(168, 1.2)) < 1e-4);
  const sp = b.map((y) => (y.t >= START + 2 * ZI ? Object.assign({}, y, { o: y.o * 1.3, h: y.h * 1.3, l: y.l * 1.3, c: y.c * 1.3 }) : y)), j2 = M.judeca(x, sp, START, GridProba);
  assert.equal(j2.tine, 0); assert.ok(j2.G1 < 0, "spargerea în sus ⇒ stopul ⇒ pe minus: " + j2.G1);
  assert.equal(M.judeca(x, b.slice(0, b.length - 200), START, GridProba), null, "fără cele 7 zile întregi ⇒ nejudecat");
});
function zileSint(n, f) { const z = []; for (let i = 0; i < n; i++) { const d = new Date(START + i * ZI).toISOString().slice(0, 10), r = mulberry(100 + i), O = [], R = []; for (let k = 0; k < 4; k++) O.push({ s: "O" + k, j: f("O", r) }); for (let k = 0; k < 20; k++) R.push({ s: "R" + k, j: f("R", r) }); z.push({ zi: d, judecat: 1, O, R }); } return z; }
await test("🔑 O5 raportul și verdictul după regula scrisă: privirile la 28 / 42 de zile judecate, verdictul doar la 42 (pe primele 42), t pe blocuri de 7 zile", () => {
  const nimic = (g, r) => ({ tine: r() < 0.2 ? 1 : 0, G1: (r() - 0.5) * 4, G2: (r() - 0.5) * 4, G3: (r() - 0.5) * 4 });
  assert.equal(M.raport(zileSint(20, nimic)).privire, 0); assert.equal(M.raport(zileSint(20, nimic)).verdict, null);
  assert.equal(M.raport(zileSint(30, nimic)).privire, 1); assert.equal(M.raport(zileSint(30, nimic)).verdict, null, "prima privire: doar cifrele");
  const r42 = M.raport(zileSint(50, nimic)); assert.equal(r42.privire, 2); assert.equal(r42.principal.zile, 42, "verdictul pe primele 42, nu pe toate"); assert.equal(r42.principal.blocuri, 6); assert.equal(r42.verdict, "n-am aflat");
  const tine = (g, r) => ({ tine: g === "O" ? (r() < 0.6 ? 1 : 0) : (r() < 0.2 ? 1 : 0), G1: (r() - 0.6) * 4, G2: (r() - 0.6) * 4, G3: (r() - 0.6) * 4 });
  assert.equal(M.raport(zileSint(42, tine)).verdict, "canalul ține mai des, gridul fără avantaj dovedit");
  const bun = (g, r) => ({ tine: g === "O" ? (r() < 0.6 ? 1 : 0) : (r() < 0.2 ? 1 : 0), G1: g === "O" ? 2 + r() : -1 + r(), G2: (r() - 0.6) * 4, G3: (r() - 0.6) * 4 });
  assert.equal(M.raport(zileSint(42, bun)).verdict, "aș porni: G1");
  const pierde = (g, r) => ({ tine: g === "O" ? (r() < 0.6 ? 1 : 0) : (r() < 0.2 ? 1 : 0), G1: g === "O" ? -0.5 + r() * 0.1 : -3 + r(), G2: -1, G3: -1 });
  assert.notEqual(M.raport(zileSint(42, pierde)).verdict, "aș porni: G1", "gridul pe Oscilo pe minus ⇒ nu „aș porni”, chiar dacă bate restul");
  const z = zileSint(10, nimic); z[3].O.forEach((x) => delete x.j); z[4].judecat = 0;
  const rz = M.raport(z); assert.equal(rz.zile, 3, "revizia: doar prefixul continuu de zile închise (ziua 4 nejudecată oprește; ziua 3 fără Oscilo judecat nu intră)"); assert.equal(rz.nejudecate, 1);
  z[4].judecat = 1; assert.equal(M.raport(z).zile, 9, "după ce ziua 4 se închide, intră și cele de după");
});
// colectorul în miniatură: discul în memorie, Pionex prefăcut
function lume(acum0) {
  const disc = {}, trimise = [], cereri = [], monede = {};
  for (let k = 0; k < 60; k++) monede["C" + k + "_USDT_PERP"] = serie(40 * 24, k < 3 ? osc(0.07, 48) : (i) => 100 * (1 + 0.003 * i / 24 * (k % 2 ? 1 : -1)), 50 + k);
  const d = { acum: acum0, GridClasament, GridProba, jurnal: () => {},
    cere: async (u) => { cereri.push(u); return { data: { tickers: Object.keys(monede).map((s, i) => ({ symbol: s, amount: String(1e7 - i * 1e4), close: "1" })) } }; },
    trimite: async (u, corp) => { trimise.push({ u, corp: JSON.parse(JSON.stringify(corp)) }); },
    klines1h: async (s) => monede[s].filter((x) => x.t + ORA <= d.acum).map((x) => ({ time: x.t, open: x.o, high: x.h, low: x.l, close: x.c })),
    zile: () => Object.keys(disc), citesteZi: (z) => (disc[z] ? JSON.parse(disc[z]) : null), scrieZi: (z, o) => { disc[z] = JSON.stringify(o); } };
  return { d, disc, trimise, cereri, monede };
}
await test("🔑 O6 tura: o dată pe zi UTC, după 00:30; notează în fișierul zilei, trimite lista (≤ 30) care trece de validarea rutei; la 7 zile judecă ziua", async () => {
  const L = lume(T0 + 20 * ZI + 10 * 60000), st = {};
  assert.equal(await M.turaOscilo(L.d, st), null, "înainte de 00:30 UTC nu lucrează"); assert.equal(L.trimise.length, 0);
  L.d.acum = T0 + 20 * ZI + 40 * 60000; const r = await M.turaOscilo(L.d, st);
  assert.equal(r.O, 3); assert.equal(r.R, 57); assert.equal(st.zi, "2026-10-21"); assert.equal(st.start, "2026-10-21");
  assert.ok(L.disc["2026-10-21"]); const t = L.trimise[0]; assert.equal(t.u, "/api/istoric-bot?action=oscilo");
  const c = t.corp; assert.ok(c.la > 0 && /^\d{4}-\d{2}-\d{2}$/.test(c.zi) && Array.isArray(c.lista) && c.lista.length <= 30 && c.urmarire && typeof c.urmarire === "object", "corpul trece de ruta");
  assert.equal(c.nO, 3); assert.equal(c.nR, 57); assert.ok(c.lista.every((x) => x.vol > 0));
  assert.equal(await M.turaOscilo(L.d, st), null, "a doua oară în aceeași zi: nimic");
  for (let z = 1; z <= 8; z++) { L.d.acum = T0 + (20 + z) * ZI + 40 * 60000; await M.turaOscilo(L.d, st); }
  const prima = JSON.parse(L.disc["2026-10-21"]); assert.ok(prima.judecat > 0, "ziua de acum 8 zile e judecată"); assert.equal(prima.lipsa, 0);
  assert.ok(prima.O.every((x) => x.j && (x.j.tine === 0 || x.j.tine === 1) && isFinite(x.j.G1) && isFinite(x.j.G2) && isFinite(x.j.G3)));
  const ult = L.trimise[L.trimise.length - 1].corp.urmarire; assert.ok(ult.zile >= 1 && ult.principal.nO === 3 && ult.principal.O >= 0 && ult.principal.O <= 1 && isFinite(ult.G.G1.O), "urmărirea cu ziua judecată: " + JSON.stringify(ult));
});
await test("O7 o monedă ieșită din top 100 după notare tot se judecă (barele ei se cer în continuare); o zi cu prea puține monede nu intră în urmărire", async () => {
  const L = lume(T0 + 20 * ZI + 40 * 60000), st = {}; await M.turaOscilo(L.d, st);
  const scos = "C0_USDT_PERP", toate = L.d.cere; L.d.cere = async (u) => { const r = await toate(u); r.data.tickers = r.data.tickers.filter((x) => x.symbol !== scos); return r; };
  const ceruteK = []; const k0 = L.d.klines1h; L.d.klines1h = async (s) => { ceruteK.push(s); return k0(s); };
  L.d.acum = T0 + 28 * ZI + 40 * 60000; await M.turaOscilo(L.d, st);
  assert.ok(ceruteK.includes(scos)); assert.ok(JSON.parse(L.disc["2026-10-21"]).O.find((x) => x.s === scos).j, "judecată și după ce a ieșit");
  const P = lume(T0 + 20 * ZI + 40 * 60000); P.d.cere = async () => ({ data: { tickers: Object.keys(P.monede).slice(0, 10).map((s) => ({ symbol: s, amount: "1000000", close: "1" })) } });
  const s2 = {}; await M.turaOscilo(P.d, s2); assert.equal(Object.keys(P.disc).length, 0, "ziua incompletă nu se scrie"); assert.equal(P.trimise[0].corp.incomplet, true);
});
// revizia (🔴): verdictul de la 42 înghețat; o zi veche închisă târziu nu mută setul; notarea târzie nu intră; ziua incompletă se reîncearcă
await test("🔑 O13 (revizia 🔴) verdictul de la 42 se îngheață: zilele noi (și 120+ zile mai târziu) nu-l mai schimbă; raportul citește toate zilele de la start", async () => {
  const nimic = (g, r) => ({ tine: r() < 0.2 ? 1 : 0, G1: (r() - 0.5) * 4, G2: (r() - 0.5) * 4, G3: (r() - 0.5) * 4 });
  const bun = (g, r) => ({ tine: g === "O" ? (r() < 0.6 ? 1 : 0) : (r() < 0.2 ? 1 : 0), G1: g === "O" ? 2 + r() : -1 + r(), G2: -1, G3: -1 });
  const z42 = zileSint(42, nimic), mai = zileSint(200, bun).slice(42), toate = z42.concat(mai);
  assert.equal(M.raport(toate).verdict, "n-am aflat", "primele 42 decid, nu ultimele");
  assert.equal(M.raport(toate).zileVerdict, 42);
  const src = citeste("scripts", "lib", "tura-oscilo.mjs"); assert.doesNotMatch(src, /slice\(-REG\.pastrez\)/, "fără tăietura la 120 de zile");
  assert.doesNotMatch(citeste("scripts", "colector.mjs"), /OSCILO_DIR\)\.filter\([^\n]*\.slice\(-200\)/, "colectorul dă toate zilele");
  // înghețarea în stare: verdictul ținut nu se mai socotește din nou
  const L = lume(T0 + 20 * ZI + 40 * 60000), st = { start: "2026-09-01", verdict: { la: 1, verdict: "n-am aflat", principal: { O: 0.1 }, G: {}, zile: 42 } };
  for (const z of zileSint(45, bun)) L.disc[z.zi] = JSON.stringify(z);
  await M.turaOscilo(L.d, st); const u = L.trimise[0].corp.urmarire;
  assert.equal(u.privire, 2); assert.equal(u.verdict, "n-am aflat", "verdictul înghețat rămâne"); assert.equal(u.inghetatLa, 1);
});
await test("O14 (revizia 🟡) notarea după 03:00 UTC nu intră în urmărire (târziu); ziua incompletă se reîncearcă de cel mult 3 ori; startul din cea mai veche zi de pe disc", async () => {
  const L = lume(T0 + 20 * ZI + 5 * ORA), st = {};
  await M.turaOscilo(L.d, st); assert.equal(L.trimise[0].corp.tarziu, true); assert.equal(Object.keys(L.disc).length, 0, "notată târziu ⇒ nescrisă"); assert.equal(st.zi, "2026-10-21");
  const P = lume(T0 + 20 * ZI + 40 * 60000); P.d.cere = async () => ({ data: { tickers: Object.keys(P.monede).slice(0, 10).map((s) => ({ symbol: s, amount: "1000000", close: "1" })) } });
  const s2 = {}; await M.turaOscilo(P.d, s2); assert.equal(s2.zi, undefined, "incompletă ⇒ reîncerc"); await M.turaOscilo(P.d, s2); assert.equal(s2.zi, undefined); await M.turaOscilo(P.d, s2); assert.equal(s2.zi, "2026-10-21", "a treia oară ⇒ las ziua"); assert.equal(P.trimise.length, 3);
  const Q = lume(T0 + 20 * ZI + 40 * 60000); Q.disc["2026-10-10"] = JSON.stringify({ zi: "2026-10-10", O: [], R: [], judecat: 1 }); const s3 = {}; await M.turaOscilo(Q.d, s3); assert.equal(s3.start, "2026-10-10");
  // trimiterea picată ⇒ ziua deja notată nu se renotează (și nici nu devine „târzie”)
  const W = lume(T0 + 20 * ZI + 40 * 60000), s4 = {}; let pica = true; const tr = W.d.trimite; W.d.trimite = async (u, c) => { if (pica) { pica = false; throw new Error("server oprit"); } return tr(u, c); };
  await assert.rejects(M.turaOscilo(W.d, s4)); assert.equal(s4.zi, undefined); const prima = W.disc["2026-10-21"];
  W.d.acum = T0 + 20 * ZI + 6 * ORA; await M.turaOscilo(W.d, s4); assert.equal(W.disc["2026-10-21"], prima); assert.equal(W.trimise[0].corp.tarziu, false); assert.equal(s4.zi, "2026-10-21");
});
await test("🔑 O8 echivalența cu proba pe istoric (aceleași bare ⇒ aceleași cifre: ține 23,4% la Oscilo, +17,7 pp, t 3,11; G1 −2,67%, −0,17 pp, t −0,64)", () => {
  const dir = process.env.DATE_1H || "C:/Users/Cimin/crypto/data/istoric-1h/";
  if (!fs.existsSync(dir)) { console.log("       (sărit: nu e istoric-1h pe disc)"); return; }
  const serii = {}; for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) { try { serii[f] = M.bare1h(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), Date.UTC(2026, 10, 17)); } catch {} }
  const ts = new Set(); for (const b of Object.values(serii)) for (const x of b) if (new Date(x.t).getUTCHours() === 0 && x.t < Date.UTC(2026, 9, 30)) ts.add(x.t);
  const med = (v) => v.reduce((s, x) => s + x, 0) / v.length, st = { tine: { d: [], o: [], r: [] }, G1: { d: [], o: [], r: [] } };
  for (const s0 of [...ts].sort((a, b) => a - b)) {
    if (s0 < Date.UTC(2026, 6, 31)) continue; const n = M.noteaza(serii, s0), O = [], R = [];
    for (const x of n.O) { const j = M.judeca(x, serii[x.s], s0, GridProba); if (j) O.push(j); } for (const x of n.R) { const j = M.judeca(x, serii[x.s], s0, GridProba); if (j) R.push(j); }
    if (!O.length || !R.length) continue; for (const k of ["tine", "G1"]) { st[k].d.push(med(O.map((j) => j[k])) - med(R.map((j) => j[k]))); st[k].o.push(...O.map((j) => j[k])); }
  }
  const tb = (d) => { const bl = []; for (let i = 0; i + 7 <= d.length; i += 7) bl.push(med(d.slice(i, i + 7))); const m = med(bl), sd = Math.sqrt(bl.reduce((s, x) => s + (x - m) ** 2, 0) / (bl.length - 1)); return m / (sd / Math.sqrt(bl.length)); };
  assert.equal(st.tine.d.length, 80, "80 de zile de verificare ca în probă");
  assert.equal(med(st.tine.o).toFixed(3), "0.234"); assert.equal((med(st.tine.d) * 100).toFixed(1), "17.7"); assert.equal(tb(st.tine.d).toFixed(2), "3.11");
  assert.equal(med(st.G1.o).toFixed(2), "-2.67"); assert.equal(med(st.G1.d).toFixed(2), "-0.17"); assert.equal(tb(st.G1.d).toFixed(2), "-0.64");
});
// pagina în vm
function pagina() {
  const ctx = { console, Intl, Date, Math, JSON, isFinite, Number, String, Array, Object, RegExp, setTimeout, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(["text-ro.js", "caiet.js", "sugestii-ecran.js", "probe-ecran.js"].map((f) => lib(f)).join("\n")
    + "\nthis.sugGrupuri = sugGrupuri; this.sugRanduri = sugRanduri; this.sugFisa = sugFisa; this.prProbe = prProbe; this.sugHtml = sugHtml; this.sugStare = sugStare; this.oscUrm = oscUrm;", ctx);
  return ctx;
}
const ACUM = Date.parse("2026-12-20T10:00:00Z");
const OSC = { la: ACUM - 8 * ORA, zi: "2026-12-20", start: "2026-11-18", nO: 34, nR: 62, incomplet: false,
  lista: [{ s: "PENDLE_USDT_PERP", c: 3.214, h: 0.0734, trav: 11, net: 0.012, pret: 3.402, poz: 0.0585, vol: 2.4e7 }, { s: "1000PEPE_USDT_PERP", c: 0.01234, h: 0.0912, trav: 7, net: 0.031, pret: 0.0121, poz: -0.0194, vol: 6e5 }],
  urmarire: { zile: 30, privire: 1, verdict: null, nejudecate: 7, intrari: 120, principal: { zile: 30, dif: 0.112, O: 0.243, R: 0.131, nO: 96, blocuri: 4, t: 1.84 }, G: { G1: { O: -2.413, R: -1.18 }, G2: { O: -1.02, R: -0.61 }, G3: { O: -1.9, R: -0.9 } } } };
const vizibil = (s) => String(s).replace(/<[^>]+>/g, " ");
await test("🔑 O9 pagina Probe: grupul „🔁 Oscilo (în probă)” cu rândurile (canalul jos – sus, trecerile, acum față de centru), fără „Aș porni”; în Sugestii nu apare", () => {
  const P = pagina(), d = { oscilo: OSC };
  const g = P.sugGrupuri(d, ACUM, "probe").find((x) => x.k === "osc"); assert.ok(g, "grupul pe Probe"); assert.match(g.titlu, /Oscilo/); assert.equal(g.verdict, "ÎN PROBĂ");
  assert.match(g.sub, /^ziua UTC .* · 34 din 96 de monede \(primele 100 Pionex după volum\) stau de 14 zile într-un canal de ±5–10% · arătate primele 2, după oscilări · pe istoric gridul pe canal a pierdut · fapte, nu semnal$/);
  assert.ok(!P.sugGrupuri(d, ACUM, "sugestii").some((x) => x.k === "osc"));
  const r = P.sugRanduri(d, ACUM, "probe").filter((x) => x.grup === "osc"); assert.equal(r.length, 2);
  assert.equal(r[0].s, "PENDLE"); assert.equal(r[0].tk, "PENDLE_USDT_PERP"); assert.equal(r[0].dir, "±7,3%");
  assert.match(r[0].sub, /^canal 2,98 – 3,45 · 11 treceri prin centru în 14 zile · acum \+5,9% față de centru · 24,0 M USDT\/zi$/);
  assert.ok(r[0].avert[0].includes("a pierdut −2,7% în 7 zile") && r[0].avert.some((a) => /lângă marginea de sus/.test(a)), r[0].avert.join(" | "));
  assert.ok(r[1].avert.some((a) => /Lichiditate mică/.test(a)));
  const f = P.sugFisa(r[0], d, ACUM); assert.ok(f.cele.length >= 6); assert.match(f.regula, /fixate pe 17\.11, înainte de date/); assert.match(f.dovada[1], /^Urmărit înainte de la 18\.11.*30 de zile judecate \(96 de intrări Oscilo\)\. Canalul a ținut 7 zile la Oscilo în 24%, la restul în 13% \(pe zile \+11,2 pp, t 1,8 pe 4 blocuri de 7 zile\)/);
  assert.match(f.dovada[1], /G1 \(ca în probă\) Oscilo −2,4%, restul −1,2%/); assert.match(f.dovada[1], /Prima privire \(28 de zile\): doar cifrele, fără verdict\./);
  assert.ok(!/Aș porni/.test(JSON.stringify(f.actiuni)) && !/Poart/.test(JSON.stringify(f.actiuni)), "fără Poartă");
  const gol = P.sugGrupuri({}, ACUM, "probe").find((x) => x.k === "osc"); assert.match(gol.sub, /^Lista vine o dată pe zi \(după 00:30 UTC, adică 02:30 iarna \/ 03:30 vara, ora României\)/);
  const vechi = P.sugGrupuri({ oscilo: Object.assign({}, OSC, { la: ACUM - 40 * ORA }) }, ACUM, "probe").find((x) => x.k === "osc"); assert.match(vechi.sub, /^LISTĂ VECHE/);
});
await test("O10 „Unde e fiecare probă”: rândul Oscilo la capăt, cu judecate / cum stă / drumul până la 42 (privirea la 28)", () => {
  const P = pagina(), R = JSON.parse(JSON.stringify(P.prProbe({ oscilo: OSC }, ACUM))), o = R[R.length - 1];
  assert.equal(o.k, "osc"); assert.equal(o.jud, "30 de zile judecate, 96 de intrări Oscilo"); assert.match(o.sta, /^canalul a ținut 7 zile la Oscilo în 24%, la restul în 13%; gridul ca în probă: Oscilo −2,4%, restul −1,2%$/);
  assert.match(o.drum.svg, /aria-label="Oscilo: 30 din cele 42 de zile judecate ale verdictului"/); assert.match(o.drum.svg, /x1="66\.7"/);
  const g = JSON.parse(JSON.stringify(P.prProbe({}, ACUM))).pop(); assert.match(g.jud, /nicio zi judecată/); assert.match(g.sta, /canalul ține mai des.*gridul pe canal a pierdut/);
});
await test("🔑 O11 convențiile pe textul Oscilo (rânduri, fișă, „unde e”): virgula zecimală, minusul tipografic, fără cifre cu punct zecimal, fără engleză", () => {
  const P = pagina(), d = { oscilo: OSC }, r = P.sugRanduri(d, ACUM, "probe").filter((x) => x.grup === "osc");
  const tot = [P.sugGrupuri(d, ACUM, "probe").find((x) => x.k === "osc").sub, ...r.map((x) => x.sub + " " + x.avert.join(" ")), ...r.map((x) => { const f = P.sugFisa(x, d, ACUM); return [f.motiv, f.regula, f.dovada.join(" "), f.cele.map((c) => c.et + " " + c.v + " " + c.sub).join(" ")].join(" "); }), (({ drum, ...x }) => JSON.stringify(x) + " " + drum.text)(P.prProbe(d, ACUM).pop())].join(" ");
  assert.doesNotMatch(vizibil(tot).replace(/\b\d{1,2}\.\d{2}(\.\d{4})?\b/g, "DATA"), /\d\.\d/, "punct zecimal (datele zz.ll.aaaa sunt scoase întâi)");
  assert.doesNotMatch(tot, /(^|[\s(])-\d/, "minus ASCII"); assert.doesNotMatch(tot, /\b(channel|grid bot|trades?|NaN|undefined|null)\b/i);
});
await test("O12 colectorul și ruta: tura legată (o dată pe zi, 2 h după un eșec), barele de 1 h incremental în data/pionex-1h, ruta sugestii:oscilo cu validare; versiunile", () => {
  const c = citeste("scripts", "colector.mjs"), r = citeste("functions", "api", "istoric-bot.js");
  assert.ok(Number((c.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 191, "colectorul de la v101.191 încolo");   /* v100.354: versiunea curentă o verifică proba ei */ assert.match(c, /import \{ turaOscilo as turaOsciloModul \} from "\.\/lib\/tura-oscilo\.mjs";/);
  assert.match(c, /function klines1hDisc\(s\) \{ return klinesDisc\("pionex-1h", lumanariMem1h, 3600000, 500, "60M", s, null\); \}/);
  assert.match(c, /if \(val\.medii\) turaOsciloColector\(\)\.catch/); assert.match(c, /osciloStare\.esecLa \|\| 0\) < 2 \* 3600000/);
  assert.match(r, /if\(action==="oscilo"\)\{let v=null;try\{v=JSON\.parse\(await env\.ISTORIC\.get\("sugestii:oscilo"\)/);
  assert.match(r, /corp\.lista\.length>30\|\|!corp\.urmarire/);
  assert.match(citeste("public", "lib", "probe-ecran.js"), /pas\("oscilo", function \(\) \{ return getJSON\("\/api\/istoric-bot\?action=oscilo"\)/);
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);   // v100.354: de la v100.353 încolo (versiunea curentă o verifică proba ei)
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 353 && nr(citeste("public", "sw.js")) >= 353 && nr(JSON.parse(citeste("BUILD_INFO.json")).badge) >= 353);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 353); assert.match(p.scripts.test, /npm run test:v100353/);
  assert.ok(JSON.parse(citeste("BUILD_INFO.json")).oscilo353, "intrarea oscilo353 rămâne în BUILD_INFO");
  assert.deepEqual(M.REG.variante, { G1: { ore: 168, stop: 1.5 }, G2: { ore: 72, stop: 1.5 }, G3: { ore: 168, stop: 1.2 } }, "variantele fixate înainte nu se mișcă");
  assert.deepEqual([M.REG.W, M.REG.hMin, M.REG.hMax, M.REG.trav, M.REG.viitor, M.REG.tPrincipal, M.REG.tGrid], [14, 0.05, 0.1, 6, 7, 2, 2.5]); assert.deepEqual(M.REG.priviri, [28, 42]);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
