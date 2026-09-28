// Probele SL/TP pe alerts (spec 2026-09-28-sl-tp-pe-alerts): sugestiePoza + poza + yahoo-extra.bare. Fara retea.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construiestePoza, sugestiePoza } from "./lib/poza.mjs";
import { creeazaYahooExtra } from "./lib/yahoo-extra.mjs";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GC = new Function(fs.readFileSync(path.join(RAD, "public/lib/grid-calcul.js"), "utf8") + "; return GridCalcul;")();
const AS = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public/lib/actiuni-semnale.js"), "utf8") + "; return ActiuniSemnale;")(GC);
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; try { await fn(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${String(e.stack || e.message).split("\n").slice(0, 3).join(" | ")}`); } }
const ZI = 86400000, T0 = Date.UTC(2025, 8, 29);
// n zile de lumanari: trend (+ sus, - jos, 0 lateral) + oscilatie ca volatilitatea sa existe
function bare(n, trend, p0 = 100) { const o = []; let p = p0; for (let i = 0; i < n; i++) { p = p * (1 + trend / 1000) + Math.sin(i / 3) * p0 * 0.01; const c = p; o.push({ t: T0 + i * ZI, o: c * 0.995, h: c * 1.012, l: c * 0.988, c, v: 1e6 }); } return o; }
console.log("\nSL/TP pe alerts · proba\n");

await test("sugestiePoza: pozitie -> stopul care urca si tinta de la pret, riscPct, k, proba", () => {
  const b = bare(250, 2), pret = b[b.length - 1].c, n = AS.niveluri(b, pret, { pretMediu: pret * 0.9, maxDupaCumparare: pret, minTrail: 0.15 });
  const s = sugestiePoza(n, pret, "pozitie");
  assert.ok(s.stop < pret && s.tinta > pret, JSON.stringify(s)); assert.ok(s.stop <= pret * 0.85 + 1e-4, "cel putin -15% de la maxim (rotunjit la 4 zecimale)");
  assert.ok([1.5, 2, 2.5, 3].includes(s.k)); assert.ok(s.proba.n > 0 && s.proba.pePlus >= 0 && s.proba.pePlus <= 1); assert.equal("intrare" in s, false);
});
await test("sugestiePoza: urmarit cu trend sus -> intrare sub pret; trend jos -> intrare null (orientativ)", () => {
  const sus = bare(250, 3), ps = sus[sus.length - 1].c, a = sugestiePoza(AS.niveluri(sus, ps, {}), ps, "urmarit");
  assert.ok(a.intrare && a.intrare.pret <= ps && a.intrare.motiv.length > 5, JSON.stringify(a.intrare)); assert.ok(a.stop < a.intrare.pret && a.tinta > a.intrare.pret);
  const jos = bare(250, -3), pj = jos[jos.length - 1].c, z = sugestiePoza(AS.niveluri(jos, pj, {}), pj, "urmarit");
  assert.equal(z.trend, "jos"); assert.equal(z.intrare, null); assert.ok(z.stop < pj && z.tinta > pj, "de la pretul de acum");
});
await test("sugestiePoza: sub 120 de zile -> fara-date cu motivul; nimic -> null", () => {
  const b = bare(60, 1), p = b[b.length - 1].c;
  assert.deepEqual(sugestiePoza(AS.niveluri(b, p, {}), p, "urmarit"), { nivel: "fara-date", motiv: "prea puține zile de prețuri (60 din 120)" });
  assert.equal(sugestiePoza(null, 10, "pozitie"), null); assert.equal(sugestiePoza({ nivel: "ok", stop: null, tinta: 5 }, 10, "urmarit"), null, "fara stop nu inventam");
});
await test("construiestePoza: t212[].sugestie la FIECARE pozitie (si cu plan), simboluri[].sugestie; fara niveluri = null; sub 512 KB", () => {
  const b = bare(250, 2), pret = b[b.length - 1].c, n = AS.niveluri(b, pret, { pretMediu: 90, maxDupaCumparare: pret, minTrail: 0.15 });
  const baza = { qty: 1, pretMediu: 90, pret, prev: pret, ppl: 4, costLei: 46, bare: [], maxDupaCumparare: pret, pondere: 0.1, sem: null, niv: null };
  const p = construiestePoza({ acum: Date.now(), versiune: "v101.0", boti: [], t212: [
    { ...baza, ticker: "AAA_US_EQ", simbol: "AAA", plan: { trailPct: 15, tinta: 130 }, niveluri: n },
    { ...baza, ticker: "BBB_US_EQ", simbol: "BBB", plan: null, niveluri: n },
    { ...baza, ticker: "CCC_US_EQ", simbol: "CCC", plan: null }],
    simboluri: [{ s: "DDD", pret, prev: pret, closes30: [], niveluri: AS.niveluri(b, pret, {}) }, { s: "EEE", pret: 5, closes30: [] }] });
  assert.ok(p.t212[0].sugestie && p.t212[0].plan, "cu plan: si planul, si sugestia (dovada „ce ar fi sugerat”)");
  assert.ok(p.t212[1].sugestie.stop > 0); assert.equal(p.t212[2].sugestie, null);
  assert.ok(p.simboluri[0].sugestie && "intrare" in p.simboluri[0].sugestie); assert.equal(p.simboluri[1].sugestie, null);
  const t = JSON.stringify(p); assert.equal(t.includes("undefined"), false); assert.equal(t.includes("NaN"), false); assert.ok(t.length < 512 * 1024);
});

const raspuns = (corp, status = 200) => ({ ok: status < 400, status, json: async () => corp, text: async () => JSON.stringify(corp), headers: { get: () => null } });
const chart1y = (n) => ({ chart: { result: [{ timestamp: Array.from({ length: n }, (_, i) => Math.floor((T0 + i * ZI) / 1000)), meta: { currency: "USD" },
  indicators: { quote: [{ open: Array(n).fill(10), high: Array(n).fill(11), low: Array(n).fill(9), close: Array.from({ length: n }, (_, i) => (i === 3 ? null : 10 + i / 100)), volume: Array(n).fill(5) }] } }] } });
await test("yahooExtra.bare: 1 an OHLC, bara cu null sarita; cache 6 h (a doua cerere nu suna); 404 -> null, fara exceptie", async () => {
  const fisierBare = path.join(os.tmpdir(), "proba-sltp-" + process.pid + ".json"); let apeluri = 0, url = "";
  const y = creeazaYahooExtra({ fisier: path.join(os.tmpdir(), "proba-sltp-e-" + process.pid + ".json"), fisierBare, pauzaMs: 0, f: async (u) => { apeluri++; url = u; return raspuns(chart1y(252)); } });
  const b = await y.bare("AVGO");
  assert.equal(b.length, 251); assert.deepEqual(Object.keys(b[0]).sort(), ["c", "h", "l", "o", "t", "v"]); assert.match(url, /range=1y&interval=1d/);
  await y.bare("AVGO"); assert.equal(apeluri, 1, "din cache");
  const y2 = creeazaYahooExtra({ fisier: path.join(os.tmpdir(), "proba-sltp-e2-" + process.pid + ".json"), fisierBare: fisierBare + "2", pauzaMs: 0, f: async () => raspuns({ chart: { result: null, error: { code: "Not Found" } } }, 404) });
  assert.equal(await y2.bare("SATS"), null);
  for (const f of [fisierBare, fisierBare + "2"]) try { fs.unlinkSync(f); } catch {}
});

console.log(`\nSLTP ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exitCode = picate ? 1 : 0;
