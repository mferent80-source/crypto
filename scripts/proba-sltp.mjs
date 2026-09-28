// Probele SL/TP pe alerts (spec 2026-09-28-sl-tp-pe-alerts): sugestiePoza + poza + yahoo-extra.bare. Fara retea.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construiestePoza, sugestiePoza, alerteSLTP } from "./lib/poza.mjs";
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

// v101.1 (el, 28.09: „alerte discord fă”): alertele SL/TP din poza - aproape de stop (ultimul sfert), SL / TP sugerat atins
// (doar fara plan - cu plan le da deja alertePlan), intrarea sugerata atinsa la simbolurile urmarite; o data pe zi (cheia cu ziua)
const ACUM_A = Date.UTC(2026, 8, 28, 19, 0), ZI_A = "2026-09-28";
const pozaA = () => ({ t212: [
  { s: "AVGO", pret: 350.8, plan: { stop: 350.63, tinta: 413.47 }, sugestie: { stop: 350.62, tinta: 412, k: 3, proba: { n: 105, pePlus: 0.41, medie: 0.02 } } },
  { s: "UHS", pret: 179, plan: { stop: 157.15, tinta: 210.4 }, sugestie: null },
  { s: "NOU", pret: 88, plan: null, sugestie: { stop: 90, tinta: 130, k: 2, proba: { n: 50, pePlus: 0.5, medie: 0.01 } } },
  { s: "SUS", pret: 131, plan: null, sugestie: { stop: 90, tinta: 130, k: 2, proba: { n: 50, pePlus: 0.5, medie: 0.01 } } },
  { s: "APLD", pret: 24.86, plan: { stop: 26.09, tinta: 34.44 }, sugestie: null }],
  simboluri: [
    { s: "INTC", moneda: "$", pret: 112.2, sugestie: { intrare: { pret: 111.99, motiv: "retragere" }, stop: 94.68, tinta: 146.61, k: 3, trend: "sus", proba: { n: 140, pePlus: 0.571, medie: 0.0703 } } },
    { s: "WDC", moneda: "$", pret: 454, sugestie: { intrare: { pret: 413.3, motiv: "lateral" }, stop: 345.1, tinta: 549.7, k: 3, trend: "lateral", proba: { n: 171, pePlus: 0.66, medie: 0.125 } } },
    { s: "RHM.DE", moneda: "€", pret: 900, sugestie: { intrare: null, stop: 917.3, tinta: 1064.29, k: 1.5, trend: "jos", proba: { n: 141, pePlus: 0.25, medie: -0.025 } } },
    { s: "NOUX", moneda: "$", pret: 5, sugestie: { nivel: "fara-date", motiv: "prea puține zile" } }] });
await test("alerteSLTP: AVGO aproape de stopul din plan (ultimul sfert) -> atentie, o cheie pe zi; UHS departe -> nimic", () => {
  const l = alerteSLTP(pozaA(), ACUM_A), a = l.find((x) => x.cheie === "sltp-aproape-AVGO-" + ZI_A);
  assert.ok(a, JSON.stringify(l.map((x) => x.cheie))); assert.equal(a.nivel, "atentie"); assert.match(a.titlu, /^AVGO: chiar la stopul din planul tău \(\$350\.63\)/, "sub 0,05% nu scrie „la 0,0%”");
  const b = alerteSLTP({ t212: [{ s: "MPC", pret: 355, plan: { stop: 344, tinta: 481.72 } }], simboluri: [] }, ACUM_A)[0];
  assert.match(b.titlu, /^MPC: la 3,1% de stopul din planul tău \(\$344\.00\)/);
  assert.ok(!l.some((x) => x.cheie.includes("UHS")));
});
await test("alerteSLTP: fara plan -> SL / TP sugerat atins (critic / info); CU plan nu se dubleaza alertele existente (APLD sub stop)", () => {
  const l = alerteSLTP(pozaA(), ACUM_A);
  const sl = l.find((x) => x.cheie === "sltp-sl-NOU-" + ZI_A), tp = l.find((x) => x.cheie === "sltp-tp-SUS-" + ZI_A);
  assert.equal(sl.nivel, "critic"); assert.match(sl.titlu, /NOU: a atins stopul sugerat \(\$90\.00\)/);
  assert.equal(tp.nivel, "info"); assert.match(tp.titlu, /SUS: a atins ținta sugerată \(\$130\.00\)/);
  assert.ok(!l.some((x) => x.cheie.includes("APLD")), "APLD are plan: „a atins stopul din plan” vine deja din alertePlan");
  assert.ok(!l.some((x) => x.cheie === "sltp-aproape-NOU-" + ZI_A), "sub stop nu e „aproape”");
});
await test("alerteSLTP: simbol urmarit la intrarea sugerata -> info cu SL, TP si istoricul; departe / trend in jos / fara-date -> nimic", () => {
  const l = alerteSLTP(pozaA(), ACUM_A), i = l.find((x) => x.cheie === "sltp-intrare-INTC-" + ZI_A);
  assert.ok(i); assert.equal(i.nivel, "info"); assert.match(i.titlu, /INTC: a ajuns la intrarea sugerată \(\$111\.99\)/);
  assert.match(i.mesaj, /SL \$94\.68/); assert.match(i.mesaj, /TP \$146\.61/); assert.match(i.mesaj, /\+7,0% pe trade/);
  assert.ok(!l.some((x) => /WDC|RHM|NOUX/.test(x.cheie)));
  assert.deepEqual(alerteSLTP({ t212: [], simboluri: [] }, ACUM_A), []); assert.deepEqual(alerteSLTP(null, ACUM_A), []);
});

console.log(`\nSLTP ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exitCode = picate ? 1 : 0;
