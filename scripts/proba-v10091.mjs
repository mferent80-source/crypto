// Proba v100.91 / colector v101.61 (04.10, el: „ok fă” pe ideile din raportul v100.90): (1) „Cât cumperi” la bucăți ÎNTREGI sub 10 $/acțiune
// (în tabelul reveniri și în bilet, același ajutor) - „144,118 buc” (fracție, format ro-RO) se citea „144 de mii”; (2) „Busola nu răspunde”
// pe cartela botului când încărcarea a picat (nu „aștept rezumatul…” la nesfârșit); (3) bilanțul pazei Busolei (`perp.bilant.verdict`) pe
// pagină, la mișcare: „pe date noi: dovedit / pe dos / n-am aflat” în eticheta botului și în nota rândului din fișă - nu la „prea puține”;
// (4) rândul de dimineață „🧭 Busola, pe 4h: …”, cu vârsta rezumatului când e vechi, tăiat la 160 cu tot cu prefix, o singură cerere bot-orders.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { situatii, verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const B = new Function(`${lib("busola.js")}; return Busola;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.91 · bucăți întregi sub 10 $, „Busola nu răspunde”, bilanțul pazei pe pagină, rândul de dimineață");

const ORA = 3600000, ACUM = Date.UTC(2026, 9, 4, 6, 0), LA = ACUM - 2 * ORA;
const REZ = (o) => Object.assign({ la: LA, versiune: "1.41.0",
  monede: { AAVE: { grid4h: "miscare", fisa4h: { jos: 159.35, sus: 201.927, linii: 17 } }, BONK: { grid4h: "liniste" }, PUMP: { perp4h: "nu-stiu" } },
  grid: { interval: "4h", canal: "±2×ATR", miscare: -0.011341049, liniste: -0.0081260081, oricand: -0.0094456786, dovedit: true, miscareDovedita: true, canal4h: "+4,2/−3,9 ATR", fisa4hLa: LA },
  perp: { la: LA, monede: 102, prag: 200000, bilant: { de: 1, notari: 498, judecate: 120, monede: 24, dif: -0.0017, icJos: -0.003, icSus: -0.0004, verdict: "dovedit" } } }, o || {});
const cuVerdict = (v) => REZ({ perp: { ...REZ().perp, bilant: { ...REZ().perp.bilant, verdict: v } } });

// ---- (1) bucăți întregi sub 10 $ ----
await test("(1) t212Bucati: sub 10 $/acțiune ⇒ bucăți întregi („250 buc”, „262 buc”, „1.012 buc”); de la 10 $ în sus ⇒ ca până acum, cu 3 zecimale („8,151 buc”)", () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fnDin("t212-ecran.js", "t212Bucati") + "\n;this.f=t212Bucati;", ctx);
  assert.equal(ctx.f(250, 3.92), "250 buc"); assert.equal(ctx.f(261.9, 3.92), "262 buc"); assert.equal(ctx.f(1012.4, 0.88), "1.012 buc", "miile cu punct, ca restul cifrelor");
  assert.equal(ctx.f(8.151, 72), "8,151 buc"); assert.equal(ctx.f(144.118, 10), "144,118 buc", "exact 10 $ ⇒ cu zecimale (regula e „sub 10”)");
  assert.equal(ctx.f(0.4, 3.92), "0 buc", "sub o bucată întreagă rămâne 0, nu se inventează 1");
});
await test("(1) tabelul reveniri și biletul folosesc același ajutor; TE la 3,92 $ cu stopul 3,48 și 50.000 lei în cont ⇒ „250 buc ≈ 4.455 lei”", () => {
  const s = lib("t212-ecran.js"); assert.equal((s.match(/t212Bucati\(m\.bucati, /g) || []).length, 2, "două locuri: rândul de revenire și „Cât cumperi” din bilet");
  const ctx = { Reveniri: R, escapeHtml: esc, TextRo: globalThis.TextRo, t212Usd: (v) => "$" + v, t212Lei: (v) => v + " lei", ActiuniSemnale: AS, t212Fx: () => 0.22, t212Suma: (v) => Math.round(v).toLocaleString("ro-RO") + " lei", t212: { cont: { cash: { total: 50000 } } } }; vm.createContext(ctx);
  vm.runInContext(fnDin("t212-ecran.js", "t212Cate").split("\n")[0] + "\n" + fnDin("t212-ecran.js", "t212Bucati") + "\n" + fnDin("t212-ecran.js", "t212ReveniriHtml") + "\n" + fnDin("t212-ecran.js", "t212ReveniriCorp") + "\n;this.f=t212ReveniriHtml;", ctx);
  const t = text(ctx.f({ reveniri: [{ ticker: "TE_US_EQ", simbol: "TE", pret: 3.92, cadere: 0.45, deLaMin: 0.11, zileDeLaMin: 3, stop: 3.48, tinta: 7.18, istoric: null }], dovadaReveniri: null }));
  assert.ok(t.includes("250 buc ≈ 4.455 lei · la stop pierzi ~500 lei (1% din cont)"), t);
});

// ---- (2) Busola nu răspunde ----
await test("(2) Busola.nuRaspunde(): false la început; true după o încărcare picată fără rezumat; false după una reușită; un eșec DUPĂ un rezumat bun nu-l șterge (rămâne cel vechi)", async () => {
  assert.equal(typeof B.nuRaspunde, "function", "lipsește Busola.nuRaspunde");
  B._reset(); assert.equal(B.nuRaspunde(), false);
  assert.equal(await B.incarca(async () => { throw new Error("rețea"); }, ACUM), false); assert.equal(B.nuRaspunde(), true); assert.equal(B.rezumat(), null);
  B._reset(); assert.equal(await B.incarca(async () => ({ ok: true, json: async () => REZ() }), ACUM), true); assert.equal(B.nuRaspunde(), false);
  assert.equal(await B.incarca(async () => ({ ok: false, status: 503 }), ACUM + 31 * 60000), false); assert.equal(B.nuRaspunde(), false, "avem rezumatul vechi, nu e „nu răspunde”"); assert.ok(B.rezumat());
  B._reset();
});
await test("(2) cartela botului: fără rezumat ⇒ „aștept rezumatul…”, iar după o încărcare picată ⇒ „Busola nu răspunde”", () => {
  const a = citeste("public", "app.js"), f = a.slice(a.indexOf("function tbBusolaLinie(b){"), a.indexOf("\nfunction tbDeseneazaExtra("));
  assert.ok(f.includes('Busola.nuRaspunde()?"Busola nu răspunde":"aștept rezumatul…"'), "tbBusolaLinie nu deosebește eșecul de așteptare");
});

// ---- (3) bilanțul pazei pe pagină ----
await test("(3) eticheta: la mișcare, cu bilanțul Busolei „dovedit” ⇒ nota se încheie cu „pe date noi: dovedit”; „pe dos” / „n-am aflat” la fel; „prea puține” ⇒ nimic; la liniște nimic", () => {
  assert.equal(B.eticheta(REZ(), "AAVE", ACUM, null).nota, "măsurat acum 2 h · pe date noi: dovedit");
  assert.equal(B.eticheta(REZ(), "AAVE", ACUM, { stare: "miscare", de: ACUM - 8 * ORA }).nota, "de 8 h · măsurat acum 2 h · pe date noi: dovedit");
  assert.equal(B.eticheta(cuVerdict("pe dos"), "AAVE", ACUM, null).nota, "măsurat acum 2 h · pe date noi: pe dos");
  assert.equal(B.eticheta(cuVerdict("n-am aflat"), "AAVE", ACUM, null).nota, "măsurat acum 2 h · pe date noi: n-am aflat");
  assert.equal(B.eticheta(cuVerdict("prea puține"), "AAVE", ACUM, null).nota, "măsurat acum 2 h");
  assert.equal(B.eticheta(REZ(), "BONK", ACUM, null).nota, "măsurat acum 2 h", "liniștea n-are bilanț (bilanțul judecă alerta de mișcare)");
  const fara = REZ(); delete fara.perp; assert.equal(B.eticheta(fara, "AAVE", ACUM, null).nota, "măsurat acum 2 h");
});
await test("(3) fișa: nota rândului de mișcare primește bilanțul („grid pe ±2×ATR, pe date noi: dovedit”); la „prea puține” rămâne ca până acum", () => {
  assert.equal(B.randGrid(REZ(), "AAVE_USDT_PERP", ACUM).nota, "grid pe ±2×ATR, pe date noi: dovedit");
  assert.equal(B.randGrid(cuVerdict("prea puține"), "AAVE", ACUM).nota, "grid pe ±2×ATR");
  assert.equal(B.randGrid(REZ(), "BONK", ACUM).nota, "grid pe ±2×ATR, dovedit", "liniștea neatinsă");
});

// ---- (4) rândul de dimineață ----
await test("(4) liniaBoti ține cont de locul rezervat prefixului: implicit ≤ 142 (160 − „🧭 Busola, pe 4h: ”); cu un maxim dat, ≤ el", () => {
  const multi = Array.from({ length: 12 }, () => ({ nume: "MARSCOIN", stare: "miscare", de: ACUM - 8 * ORA }));
  assert.ok(B.liniaBoti(multi, ACUM).length <= 142, "implicit 142"); assert.ok(B.liniaBoti(multi, ACUM, 100).length <= 100, "maxim dat");
  assert.equal(B.liniaBoti([{ nume: "AAVE", stare: "miscare", de: ACUM - 8 * ORA }], ACUM, 100), "AAVE mai agitată de 8 h");
});
await test("(4) colectorul: rândul „🧭 Busola, pe 4h: …”, cu „(rezumat de acum N h)” când starea e veche de peste 4,5 h, lungimea rezervată, o singură cerere bot-orders în dateDimineata", () => {
  const c = citeste("scripts", "colector.mjs"), d = c.slice(c.indexOf("async function dateDimineata()"), c.indexOf("async function turaDimineata()"));
  assert.equal((d.match(/cere\("\/api\/bot-orders"\)/g) || []).length, 1, "bot-orders se cere o singură dată");
  assert.ok(d.includes('"🧭 Busola, pe 4h: "') && d.includes("rezumat de acum") && /Busola\.liniaBoti\(l, acum, 142 - /.test(d), "prefixul cu emoji, vârsta și lungimea rezervată");
  assert.ok(/const VERSIUNE_COLECTOR = "v101\.6\d";/.test(c), "versiunea colectorului");   /* v101.62 (I-526): versiunea merge înainte */
});
await test("(4) garda: rândurile Busolei de dimineață cu prefixul nou (și cel cu vârsta) trec regula de raport (≤ 160)", () => {
  const s = situatii().filter((x) => /^busola\.linia/.test(x.sursa)); assert.ok(s.length >= 4, "situații: " + s.length);
  assert.ok(s.every((x) => x.text.startsWith("🧭 Busola, pe 4h: ")), s.map((x) => x.text.slice(0, 30)).join(" | "));
  assert.ok(s.some((x) => /\(rezumat de acum \d/.test(x.text)), "lipsește situația cu rezumatul vechi");
  const rele = s.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((q) => q.ab.length);
  assert.equal(rele.length, 0, rele.map((q) => q.x.sit + ": " + q.ab.join("; ") + " ⇐ " + q.x.text).join("\n"));
});

console.log("\n" + (pica ? "V100.91 PICA · " + pica + " din " + (ok + pica) : "V100.91 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
