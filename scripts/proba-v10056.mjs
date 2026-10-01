// Proba v100.56 (01.10, el: actiunile T212 - pachetul 5: graficul actiunii si autopsia,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-5-graficul-si-autopsia.md).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 400)}`); });
}
console.log("\nV100.56 · Actiunile T212: graficul actiunii si autopsia · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const Z = 864e5;

// ---- pasul 1: desenul ----
const GB = new Function(`${lib("grafic-bot.js")}; return GraficBot;`)();
const VA = new Function(`${lib("valoare.js")}; return Valoare;`)();
const q = (m) => Array.from({ length: 21 }, (_, i) => Math.round(m * i / 10 * 1e6) / 1e6);   // P50 = m, P75 = 1,5 m
const bareZ = (n, cuVol) => Array.from({ length: n }, (_, i) => { const c = 100 + 5 * Math.sin(i / 4); return { t: i * Z, o: c, h: c * 1.01, l: c * 0.99, c, v: cuVol ? 1000 + i : null }; });
await test("ziua obisnuita a actiunii: 1 zi din z1, 5 zile din z5; fara profil -> null", () => {
  are(GB.ziObisnuitaActiune, "GraficBot.ziObisnuitaActiune");
  const pf = { piata: "actiuni", simbol: "INTC_US_EQ", zile: 500, z1: { jos: q(0.02), sus: q(0.03) }, z5: { jos: q(0.05), sus: q(0.06) } };
  const z1 = GB.ziObisnuitaActiune(100, pf, 1), z5 = GB.ziObisnuitaActiune(100, pf, 5);
  const r2 = (x) => Math.round(x * 100) / 100;
  assert.equal(r2(z1.p50Jos), 98); assert.equal(r2(z1.p50Sus), 103); assert.equal(z1.et, "zi obișnuită");
  assert.equal(r2(z5.p50Jos), 95); assert.equal(r2(z5.p75Sus), 109); assert.equal(z5.et, "5 zile obișnuite");
  assert.match(z1.sursa, /500 de zile de bursă/);
  assert.equal(GB.ziObisnuitaActiune(100, null, 1), null);
  assert.equal(GB.ziObisnuitaActiune(100, { z1: { jos: [1], sus: [1] } }, 1), null);
});
await test("zona de valoare pe 20 de zile de bursa: minBare; fara volum -> dupa timp; implicit tot 24 (botii neschimbati)", () => {
  assert.equal(VA.zona(bareZ(20, true), {}), null, "implicit: sub 24 -> null, ca pana acum");
  const z = VA.zona(bareZ(20, true), { minBare: 15, bins: 24 }); assert.ok(z && z.dupa === "volum", JSON.stringify(z));
  assert.equal(VA.zona(bareZ(20, false), { minBare: 15, bins: 24 }).dupa, "timp");
  assert.equal(VA.zona(bareZ(12, true), { minBare: 15 }), null);
});
await test("desen: banda de 5 zile doar cu comutatorul, etichetele actiunii (20 z, zilnic, stopul propus); botii pastreaza etichetele vechi", () => {
  are(GB.niveluriActiune, "GraficBot.niveluriActiune");
  const bare = bareZ(60, true), pf = { zile: 500, z1: { jos: q(0.02), sus: q(0.03) }, z5: { jos: q(0.05), sus: q(0.06) } };
  const niv = GB.niveluriActiune({ pretMediu: 101, stop: 96, tinta: 110 });
  assert.deepEqual(niv.map((x) => x.k), ["tinta", "intrare", "stop"]);
  const baza = { bare, W: 800, niv, zi: GB.ziObisnuitaActiune(100, pf, 1), zi5: GB.ziObisnuitaActiune(100, pf, 5),
    val: { zona: VA.zona(bare.slice(-20), { minBare: 15, bins: 24 }), pivoti: [], et: "20 z", etLung: "20 de zile de bursă", etPivoti: "zilnic" },
    consLinii: { stopAcum: 96, stopPlan: 97, et: "stopul propus", etLung: "stopul propus (din profilul acțiunii)" } };
  const cu = GB.desen({ ...baza, st: { zi: true, zi5: true, val: true } }), fara = GB.desen({ ...baza, st: { zi: true, zi5: false, val: true } });
  assert.match(cu.svg, /class="gbZi5"/); assert.ok(!/class="gbZi5"/.test(fara.svg));
  assert.match(cu.svg, /POC 20 z/); assert.match(cu.legenda, /20 de zile de bursă/); assert.match(cu.svg, /stopul propus/); assert.match(cu.legenda, /5 zile de bursă obișnuite/);
  const bot = GB.desen({ bare, W: 800, niv: [], st: { zi: true, val: true }, zi: GB.ziObisnuita(100, { z24: { jos: q(0.02), sus: q(0.02) }, zile: 185 }),
    val: { zona: VA.zona(bareZ(30, true), {}), pivoti: [] }, consLinii: { stopAcum: 90, stopPlan: 95 } });
  assert.match(bot.svg, />zi obișnuită</); assert.match(bot.svg, /POC 7 z/); assert.match(bot.legenda, /zona de valoare, 7 zile/); assert.match(bot.legenda, /stopul planului \(Consilierul\)/);
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
