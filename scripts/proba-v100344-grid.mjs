// Proba v100.344 · partea 5: simulatorul probei gridului (scripts/lib/proba-grid.mjs) - GARDA scrisă înainte de date:
//   1. pe un mers aleator (martingală, drumul fin necunoscut simulatorului: 10 pași în fiecare minut) media câștigului ÎNAINTE de comisioane
//      e ~0 (în 3 erori standard) - altfel simulatorul inventează câștig / pierdere (capcana I-888: minusul fals din drumul prin lumânare);
//   2. socotelile de bază: o trecere în jos și înapoi în sus prin aceeași grilă = câștigul unei grile; funding-ul pe poziția long se plătește;
//   3. alegerea zilei e reproductibilă (mulberry32 pe zi), nu ia monede din listă și nici sub 1 M; rezumatul nu dă verdict sub 26 de ferestre.
//   node scripts/proba-v100344-grid.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { simGrid, niveluri, mulberry32, alegeZi, rezumat, simbolBinance, REGULI } from "./lib/proba-grid.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join(" | ")}`); }); }
console.log("\nV100.344 · proba gridului: simulatorul · proba\n");

// mers aleator multiplicativ (martingală), 10 pași pe minut, agregat în bare de 1 minut
function mers(seed, minute, sigmaPas) {
  const r = mulberry32(seed), b = []; let p = 100, t = 0;
  for (let m = 0; m < minute; m++) { const o = p; let h = p, l = p; for (let k = 0; k < 10; k++) { p *= 1 + (r() < 0.5 ? -sigmaPas : sigmaPas); if (p > h) h = p; if (p < l) l = p; } b.push({ t: t += 60000, o, h, l, c: p }); }
  return b;
}
await test("🔑 GARDA: pe mers aleator media ÎNAINTE de comisioane e ~0 (fără minusul fals din I-888), la toate trei direcțiile", () => {
  for (const dir of ["neutru", "long", "short"]) {
    const v = [];
    for (let s = 1; s <= 300; s++) { const b = mers(1000 + s, 2 * 1440, 0.0004); const g = simGrid({ jos: 92, sus: 108, n: 30, dir }, b, { rnd: mulberry32(s) }); v.push(g.brut); }
    const m = v.reduce((a, x) => a + x, 0) / v.length, sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)), se = sd / Math.sqrt(v.length);
    assert.ok(Math.abs(m) < 3 * se + 1e-4, dir + ": media brută " + (m * 100).toFixed(3) + "% (EȘ " + (se * 100).toFixed(3) + "%)");
  }
});
// revizia Opus (16.11, 🔴1): la 1–3 pași de grilă pe minut, ordinea min / max trasă la sorți INVENTA dus-întorsuri (+0,42% pe zi la ~1,4 pași) - exact pe
// monedele alese de listă (scorul crește cu mișcarea / pasul). Garda nouă: pe drumul fin (adevărul), drumul cel mai scurt prin bară dă o margine de JOS
// și ordinea la sorți una de SUS; verdictul probei se dă doar dacă amândouă îl dau.
function mersFin(seed, minute, sigmaPas, pasi) {
  const r = mulberry32(seed), b = [], fin = []; let p = 100, t = 0;
  for (let m = 0; m < minute; m++) { const o = p; let h = p, l = p; for (let k = 0; k < pasi; k++) { p *= 1 + (r() < 0.5 ? -sigmaPas : sigmaPas); if (p > h) h = p; if (p < l) l = p; t += 60000 / pasi; fin.push({ t, o: p, h: p, l: p, c: p }); } b.push({ t: fin[fin.length - 1].t, o, h, l, c: p }); }
  return { b, fin };
}
await test("🔑 GARDA la mișcare mare (1–2 pași pe minut): drumul cel mai scurt ≤ adevărul (drumul fin) ≤ ordinea la sorți, în medie", () => {
  let scurt = 0, sorti = 0, adev = 0; const N = 120;
  for (let s = 1; s <= N; s++) {
    const { b, fin } = mersFin(5000 + s, 720, 0.0012, 30), p = { jos: 80, sus: 120, n: 80, dir: "neutru" };   // pasul ~0,5%, mișcarea pe minut ~0,66% (~1,3 pași)
    adev += simGrid(p, fin, { comision: 0, rnd: () => 0 }).brut;
    scurt += simGrid(p, b, { comision: 0, drum: "scurt" }).brut;
    sorti += simGrid(p, b, { comision: 0, rnd: mulberry32(s) }).brut;
  }
  scurt /= N; sorti /= N; adev /= N;
  assert.ok(scurt <= adev + 1e-4 && adev <= sorti + 1e-4, "scurt " + (scurt * 100).toFixed(3) + "% · adevăr " + (adev * 100).toFixed(3) + "% · la sorți " + (sorti * 100).toFixed(3) + "%");
});
await test("comisioanele: 0,02% pe umplerile grilei, 0,05% la pornire și la închiderea poziției de la final", () => {
  assert.equal(REGULI.comisionGrila, 0.0002); assert.equal(REGULI.comisionCapete, 0.0005);
  const b = [{ t: 0, o: 100, h: 100, l: 100, c: 100 }, { t: 60000, o: 100, h: 100, l: 100, c: 100 }];
  const g = simGrid({ jos: 90, sus: 110, n: 10, dir: "long" }, b, { rnd: () => 0 });   // long: grilele de deasupra cumpărate la pornire și închise la final, fără umpleri
  assert.ok(Math.abs(g.comisioane - 2 * Math.abs(g.pozFinala) * 100 * 0.0005) < 1e-12, String(g.comisioane));
});
await test("o grilă: cumpără la nivelul ei de jos, vinde la cel de sus = câștigul grilei (fără comision), poziția revine", () => {
  const L = niveluri(90, 110, 10), p0 = (L[5] + L[6]) / 2;
  const b = [{ t: 1, o: p0, h: p0, l: p0, c: p0 }, { t: 2, o: p0, h: p0, l: (L[4] + L[5]) / 2, c: (L[4] + L[5]) / 2 }, { t: 3, o: (L[4] + L[5]) / 2, h: (L[6] + L[7]) / 2, l: (L[4] + L[5]) / 2, c: (L[6] + L[7]) / 2 }];   // cumpără la L5, vinde la L6 (nivelul de deasupra)
  const g = simGrid({ jos: 90, sus: 110, n: 10, dir: "neutru" }, b, { comision: 0, rnd: () => 0.9 });   // drumul o → minim → maxim → închidere (fără dus-întors în aceeași bară)
  const q = 1 / (10 * p0);
  assert.equal(g.umpleri, 2); assert.ok(Math.abs(g.brut - q * (L[6] - L[5])) < 1e-12, g.brut + " vs " + q * (L[6] - L[5])); assert.ok(Math.abs(g.pozFinala) < 1e-15);
});
await test("funding pozitiv: un grid long plătește, unul short încasează", () => {
  const b = [{ t: 0, o: 100, h: 100, l: 100, c: 100 }, { t: 60000, o: 100, h: 100, l: 100, c: 100 }];
  const f = [{ t: 30000, r: 0.001 }];
  const lg = simGrid({ jos: 90, sus: 110, n: 10, dir: "long" }, b, { comision: 0, funding: f, rnd: () => 0 });
  const sh = simGrid({ jos: 90, sus: 110, n: 10, dir: "short" }, b, { comision: 0, funding: f, rnd: () => 0 });
  assert.ok(lg.r < 0 && sh.r > 0, lg.r + " / " + sh.r);
});
const C = (s, o) => Object.assign({ simbol: s + "_USDT_PERP", stare: "candidat", volum: 5e6, pret: 10, latime: 0.1, grile: 30, dir: "neutru" }, o);
const ctx = { console, Math, JSON, Number, String, Array, Object, isFinite }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", "grid-calcul.js"), "utf8") + "\nthis.G = GridCalcul;", ctx);
await test("🔑 alegerea zilei: cele 5 din listă + 5 aleatori lichizi, nu din listă, reproductibil pe zi", () => {
  const lista = ["A", "B", "C", "D", "E"].map((s) => C(s)), cand = lista.concat(Array.from({ length: 20 }, (_, i) => C("X" + i)), [C("MIC", { volum: 0.5e6 }), C("EV", { stare: "evita" })]);
  const a = alegeZi(lista, cand, "2026-11-17", ctx.G), b = alegeZi(lista, cand, "2026-11-17", ctx.G), c = alegeZi(lista, cand, "2026-11-18", ctx.G);
  assert.equal(a.length, 10); assert.deepEqual(a.map((x) => x.simbol), b.map((x) => x.simbol));
  assert.notDeepEqual(a.filter((x) => x.grup === "aleator").map((x) => x.simbol), c.filter((x) => x.grup === "aleator").map((x) => x.simbol));
  assert.ok(!a.some((x) => x.grup === "aleator" && /_(A|B|C|D|E|MIC|EV)_/.test("_" + x.simbol.replace("_USDT_PERP", "") + "_")));
  assert.ok(a.every((x) => x.jos > 0 && x.sus > x.jos && x.n === 30));
});
await test("rezumatul: sub 26 de ferestre „în probă”, ferestrele la 7 zile; simbolul Binance", () => {
  const zile = Array.from({ length: 30 }, (_, i) => ({ zi: new Date(Date.UTC(2026, 10, 17 + i)).toISOString().slice(0, 10), D: 0.01 }));
  const r = rezumat(zile);
  assert.equal(r.zile, 30); assert.equal(r.ferestre, 5); assert.equal(r.verdict, "în probă");
  assert.equal(simbolBinance("HYPE_USDT_PERP"), "HYPEUSDT"); assert.equal(REGULI.ferestreVerdict, 26);
});
// revizia Opus (🟡): verdictul o singură dată, pe primele 26 de ferestre; și doar dacă ambele drumuri prin bară îl dau
const zileF = (n, f) => Array.from({ length: n }, (_, i) => Object.assign({ zi: new Date(Date.UTC(2026, 10, 17 + 7 * i)).toISOString().slice(0, 10) }, f(i)));
await test("🔑 verdictul: o singură dată, pe primele 26 de ferestre (ce vine după nu-l mai schimbă); doar dacă ambele drumuri îl dau", () => {
  const bun = (i) => ({ D: 0.01 + (i % 2 ? 0.002 : -0.002), Dsus: 0.012 + (i % 2 ? 0.002 : -0.002) });
  assert.equal(rezumat(zileF(26, bun)).verdict, "alege mai bine decât întâmplarea");
  const dupa = zileF(60, (i) => (i < 26 ? bun(i) : { D: -0.05 + (i % 2 ? 0.002 : -0.002), Dsus: -0.05 }));
  assert.equal(rezumat(dupa).verdict, "alege mai bine decât întâmplarea", "ferestrele de după a 26-a nu mai schimbă verdictul");
  const certati = zileF(26, (i) => ({ D: (i % 2 ? 0.002 : -0.002), Dsus: 0.012 + (i % 2 ? 0.002 : -0.002) }));
  const r = rezumat(certati); assert.equal(r.verdict, "n-am aflat"); assert.equal(r.drumuriDeAcord, false); assert.equal(r.sus.verdict, "alege mai bine decât întâmplarea");
});
await test("🔑 tura: alege de la 8:00 RO, nu judecă înainte de 7 zile + 1 oră, apoi judecă pe barele de 1 minut și trimite rezumatul", async () => {
  const { turaProbaGrid } = await import("./lib/proba-grid.mjs");
  const t0 = Date.parse("2026-11-17T06:30:00Z");   // 08:30 RO
  const lista = ["A", "B", "C", "D", "E"].map((s) => C(s)), cl = { la: t0 - 600000, monede: lista.concat(Array.from({ length: 12 }, (_, i) => C("X" + i))) };
  const Idei = { ideiBoti: (c) => c.monede.slice(0, 5) }, trimise = [];
  const binance = async (u) => {
    if (/fundingRate/.test(u)) return [];
    const m = u.match(/symbol=([A-Z0-9]+).*startTime=(\d+).*endTime=(\d+)/), st0 = Number(m[2]), en = Number(m[3]), r = mulberry32(st0 % 100000 + m[1].length);
    const o = []; let p = 10; for (let t = st0; t <= en && o.length < 1500; t += 60000) { const a = p; p *= 1 + (r() - 0.5) * 0.004; o.push([t, String(a), String(Math.max(a, p) * 1.0005), String(Math.min(a, p) * 0.9995), String(p)]); }
    return o;
  };
  const st = {}, d = (acum) => ({ acum, binance, Idei, G: ctx.G, jurnal() {}, cere: async () => ({ clasament: cl }), trimite: async (c, b) => { trimise.push([c, b]); return { ok: true }; } });
  await turaProbaGrid(d(t0), st);
  assert.equal(st.deschise.length, 1); assert.equal(st.deschise[0].lista.length, 10);
  await turaProbaGrid(d(t0 + 7 * 86400000), st);   // încă nu (+ 1 oră)
  assert.equal(st.judecate.length, 0);
  await turaProbaGrid(d(t0 + 7 * 86400000 + 3600000 + 60000), st);
  assert.equal(st.judecate.length, 1); assert.ok(Number.isFinite(st.judecate[0].D), JSON.stringify(st.judecate[0]));
  const ult = trimise[trimise.length - 1]; assert.match(ult[0], /action=probaGrid/); assert.equal(ult[1].rezumat.verdict, "în probă");
  assert.ok(Number.isFinite(st.judecate[0].Dsus) && Number.isFinite(st.judecate[0].mpL), "marginea de sus și mișcarea / pasul notate");
  // revizia Opus: o zi stricată de rețea nu dispare - rămâne deschisă și se reîncearcă (de cel mult 3 ori în total)
  const st2 = {}, rau = async () => { throw new Error("fetch failed"); };
  const d2 = (acum) => Object.assign(d(acum), { binance: rau });
  await turaProbaGrid(d(t0), st2);
  await turaProbaGrid(d2(t0 + 7 * 86400000 + 3600000 + 60000), st2);
  assert.equal(st2.deschise.length, 1, "ziua rămâne deschisă după erorile de rețea"); assert.equal(st2.judecate.length, 0);
  for (let k = 1; k <= 3; k++) await turaProbaGrid(d2(t0 + 7 * 86400000 + 3600000 + 60000 + k * 3 * 3600000), st2);
  assert.equal(st2.deschise.length, 0, "după 3 încercări ziua se închide"); assert.equal(st2.judecate.length, 1); assert.equal(st2.judecate[0].D, null);
});

console.log(`\n${teste - picate}/${teste} trec${picate ? ` · ${picate} PICĂ` : ""}\n`);
process.exit(picate ? 1 : 0);
