// Proba v100.55 (01.10, el: actiunile T212 - pachetul 4: intrarea - poarta si ideile,
// docs/superpowers/plans/2026-10-01-actiuni-pachetul-4-intrarea.md).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function("GridCalcul", `${lib("semnale-bot.js")}; return SemnaleBot;`)(G); globalThis.SemnaleBot = SB;
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)(); globalThis.ActiuniSemnale = AS;

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.55 · Actiunile T212: intrarea (poarta si ideile) · proba\n");
const are = (x, n) => assert.ok(x, "lipseste " + n);
const Z = 864e5;

// ---- pasul 1: cheia starii si „in situatii ca asta” ----
const stSus = { trend: { dir: "sus", tarie: "puternic" }, miscare: { mare: false }, distMax7z: -0.05 };
await test("cheia starii: trend|miscare|maxim; fara date -> null", () => {
  are(AS.cheieSituatie, "ActiuniSemnale.cheieSituatie");
  assert.equal(AS.cheieSituatie(stSus), "sus|calm|departe");
  assert.equal(AS.cheieSituatie({ trend: { dir: "lateral" }, miscare: { mare: true }, distMax7z: -0.01 }), "lateral|dupa-miscare|langa-max");
  assert.equal(AS.cheieSituatie({ trend: { dir: "fara-date" } }), null);
  assert.equal(AS.cheieSituatie(null), null);
});
await test("laCumparare intoarce mereu sit (null la fara-date)", () => {
  const t = { ticker: "INTC_US_EQ", pornit: 200 * Z, pretCumparare: 100 };
  assert.ok("sit" in AS.laCumparare(t, [], []));
  assert.equal(AS.laCumparare(t, [], []).sit, null);
  const bare = Array.from({ length: 199 }, (_, i) => ({ t: i * Z, o: 50 + i * 0.25, h: 51 + i * 0.25, l: 49 + i * 0.25, c: 50 + i * 0.25 }));
  const r = AS.laCumparare({ ...t, pretCumparare: bare[198].c }, bare, []);
  assert.match(String(r.sit), /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/, JSON.stringify(r));
});
await test("situatiiCaAsta: doar aceeasi stare, median/pe plus/cel mai rau pe % din cost; costul 0 si cf vechi (fara sit) sar; sub 10 -> putine", () => {
  are(AS.situatiiCaAsta, "ActiuniSemnale.situatiiCaAsta");
  const inch = [], cf = {};
  for (let i = 0; i < 12; i++) { const id = "a" + i; inch.push({ id, ticker: i < 3 ? "INTC_US_EQ" : "AMD_US_EQ", cost: 1000, rezultat: i < 8 ? 50 : -100 }); cf[id] = { sit: "sus|calm|departe" }; }
  inch.push({ id: "alt", ticker: "AMD_US_EQ", cost: 1000, rezultat: -900 }); cf.alt = { sit: "jos|calm|departe" };
  inch.push({ id: "vechi", ticker: "AMD_US_EQ", cost: 1000, rezultat: -800 }); cf.vechi = { nivel: "cumpara" };
  inch.push({ id: "zero", ticker: "AMD_US_EQ", cost: 0, rezultat: -500 }); cf.zero = { sit: "sus|calm|departe" };
  const r = AS.situatiiCaAsta(inch, cf, "sus|calm|departe", "INTC_US_EQ");
  assert.equal(r.toate.n, 12); assert.equal(r.toate.putine, false);
  assert.equal(r.toate.median, 0.05); assert.equal(Math.round(r.toate.pePlus * 100), 67);
  assert.deepEqual(r.toate.celMaiRau, { pct: -0.1, lei: -100 }); assert.equal(r.toate.total, 8 * 50 - 4 * 100);
  assert.equal(r.actiune.n, 3); assert.equal(r.actiune.putine, true);
  const tx = AS.textSituatie(r);
  assert.match(tx, /12 cazuri/); assert.match(tx, /median \+5,0%/); assert.match(tx, /67% pe plus/); assert.match(tx, /cel mai rău −10,0%/);
  assert.match(tx, /INTC.*3.*prea puține/); assert.ok(!/sector/.test(tx), "nu pomeni sectorul: n-avem date");
});
await test("situatiiCaAsta: nicio potrivire / fara sit -> n 0 si text care o spune", () => {
  const r = AS.situatiiCaAsta([], {}, "sus|calm|departe", null);
  assert.equal(r.toate.n, 0); assert.equal(r.actiune, null);
  assert.match(AS.textSituatie(r), /niciun trade/);
  assert.equal(AS.situatiiCaAsta([], {}, null).toate.n, 0);
});

// ---- pasul 2: cheia starii ajunge in t212:cf ----
await test("ruta cf pastreaza sit (valid sau null - null ramane null, altfel s-ar reface la nesfarsit); colectorul reface O DATA verdictele fara sit", async () => {
  const src = fs.readFileSync(path.join(RAD, "functions", "api", "t212.js"), "utf8");
  assert.match(src, /"sit" in x/, "ruta cf: test de prezenta pentru sit");
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  are(mod.__cfPentruProba, "t212.js __cfPentruProba (curatarea unui verdict cf, exportata pentru proba)");
  assert.equal(mod.__cfPentruProba({ nivel: "cumpara", sit: "sus|calm|departe" }).sit, "sus|calm|departe");
  assert.equal(mod.__cfPentruProba({ nivel: "fara-date", sit: null }).sit, null);
  assert.equal(mod.__cfPentruProba({ nivel: "cumpara", sit: "<script>" }).sit, null);
  assert.ok(!("sit" in mod.__cfPentruProba({ nivel: "cumpara" })), "fara sit in corp -> nu inventez unul");
  const v = mod.__cfPentruProba({ nivel: "nu", motive: ["a"], greseli: ["dupa-miscare", "x"], stopU: {}, prob: null, stop: { 8: { pct: -0.08, zi: 3 } } });
  assert.deepEqual(v.greseli, ["dupa-miscare"]); assert.deepEqual(v.stopU, {}); assert.equal(v.prob, null); assert.equal(v.stop["8"].pct, -0.08);
  const tura = fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-t212.mjs"), "utf8");
  assert.match(tura, /!\("sit" in gata\[t\.id\]\)/);
  assert.match(tura, /stop: \{\}, stopU: \{\}, sit: null \}/, "fara preturi: sit null (altfel se reface la fiecare tura)");
});

// ---- pasul 3: poarta - in situatii ca asta, profilul si probabilitatile actiunii propuse ----
const PM = new Function(`${lib("profil-moneda.js")}; return ProfilMoneda;`)();
const PB = new Function("GridCalcul", "ActiuniSemnale", `${lib("probabilitati.js")}; return Probabilitati;`)(G, AS);
const bareAct = (n, f) => Array.from({ length: n }, (_, i) => { const c = 100 * (1 + 0.002 * i) * (1 + 0.03 * Math.sin(i / 3)); return { t: i * Z, o: c * (f ? 0.995 : 1), h: c * 1.02, l: c * 0.98, c }; });
await test("profilul la poarta: stopul propus fata de coborarea obisnuita pe 5 zile; saltul mare; sub 120 de zile -> null", () => {
  are(PM.comparaStopActiune, "ProfilMoneda.comparaStopActiune"); are(PM.textSarituri, "ProfilMoneda.textSarituri");
  const pf = PM.calculeaza(bareAct(300), { piata: "actiuni", simbol: "INTC_US_EQ", acum: 400 * Z });
  const d = PM.pragStopActiune(pf).dist;
  const strans = PM.comparaStopActiune(pf, d / 2), larg = PM.comparaStopActiune(pf, d * 2);
  assert.equal(strans.strans, true); assert.match(strans.text, /mai strâns/);
  assert.equal(larg.strans, false); assert.ok(!/mai strâns/.test(larg.text));
  assert.equal(PM.comparaStopActiune(null, 0.05), null);
  assert.equal(PM.calculeaza(bareAct(80), { piata: "actiuni", acum: 400 * Z }), null, "IPO recent: fara profil");
  assert.equal(typeof PM.textSarituri(pf), "string");
  assert.equal(PM.textSarituri(null), "");
});
await test("pagina: poarta arata in situatii ca asta + profilul + probabilitatile; fara stop/niveluri -> fara randuri; randarea comuna cu pozitia", () => {
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.match(e, /function t212ProbListaHtml\(/);
  assert.match(e, /ActiuniSemnale\.situatiiCaAsta\(/);
  assert.match(e, /ProfilMoneda\.comparaStopActiune\(/);
  assert.match(e, /t212\.poarta\.prob = /);
  assert.match(e, /p\.niv && p\.niv\.nivel === "ok"/, "probabilitatile doar cu niveluri calculate");
  assert.ok((e.match(/t212ProbListaHtml\(/g) || []).length >= 3, "definita + folosita la pozitie + la poarta");
  assert.match(e, /t212ProfilPoarta\(p\)/, "chemata in t212RenderPoarta");
});
await test("probabilitatile actiunii propuse: cu stopul si tinta portii, de la pretul de intrare; stopul peste pret -> motiv, nu cifre", () => {
  const b = bareAct(300), pret = b[299].c;
  const r = PB.randActiune(PB.pentruActiune(b, { pret, stop: pret * 0.95, tinta: pret * 1.1, acum: 400 * Z }), null, {});
  assert.ok(r.some((x) => /stopul mâine/.test(x.titlu)), JSON.stringify(r.map((x) => x.titlu)));
  const r2 = PB.randActiune(PB.pentruActiune(b, { pret, stop: pret * 1.01, tinta: pret * 1.1, acum: 400 * Z }), null, {});
  assert.equal(r2.length, 1); assert.equal(r2[0].p, null);
});

// ---- pasul 4: ideile - cheia starii si probabilitatile, de la colector ----
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const bareIdee = (n) => Array.from({ length: n }, (_, i) => { const c = 100 * 1.003 ** i * (1 + 0.04 * Math.sin(i * 2 * Math.PI / 5)); return { t: i * Z, o: c * 0.999, h: c * 1.01, l: c * 0.99, c }; });
await test("ideile: sit si probabilitatile (tinta inaintea stopului in 5 zile, atinge stopul maine) cand vine Probabilitati; fara el, ca azi", () => {
  const b = bareIdee(250), pret = b[249].c;
  const fara = ID.judecaActiune(b, pret, { acum: 251 * Z });
  const cu = ID.judecaActiune(b, pret, { acum: 251 * Z, Probabilitati: PB });
  assert.ok(cu.trece, "fixture-ul trebuie sa treaca de poarta");
  assert.equal(cu.trece, fara.trece, "probabilitatile nu schimba filtrul (avertizeaza, nu blocheaza)");
  assert.equal(cu.sit, "sus|calm|departe");
  assert.ok(cu.prob && "tinta5" in cu.prob && "stop1" in cu.prob, JSON.stringify(cu.prob));
  assert.ok(cu.prob.stop1 >= 0 && cu.prob.stop1 <= 1, JSON.stringify(cu.prob));
  assert.equal(fara.prob, null, "fara Probabilitati: prob null");
  const src = fs.readFileSync(path.join(RAD, "functions", "api", "t212.js"), "utf8");
  assert.ok(/sit: .*x\.sit/.test(src), "ruta idei pastreaza sit");
  assert.ok(/tinta5/.test(src), "ruta idei pastreaza probabilitatile");
  assert.ok(/turaIdeiModul\(\{[^)]*Probabilitati/.test(fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8")), "colectorul da Probabilitati ideilor");
  assert.ok(/Probabilitati: d\.Probabilitati/.test(fs.readFileSync(path.join(RAD, "scripts", "lib", "tura-idei.mjs"), "utf8")), "tura ideilor le trece mai departe");
  assert.ok(/t212IdeiSit\(/.test(fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8")), "pagina: linia 📊 la idei");
});

// ---- revizia finala (Opus, 01.10): I1 tranșele = un caz; I2 stopul LUI la poarta; codul nou nu blocheaza poarta/ideile ----
await test("I1: aceeasi actiune cumparata in aceeasi zi si vanduta in transe = UN caz (rezultat si cost adunate) - altfel N umflat ascundea „prea puține”", () => {
  const inch = [], cf = {};
  for (let i = 0; i < 10; i++) { const id = "t" + i; inch.push({ id, ticker: "NPA_US_EQ", pornit: 5 * Z + i * 60000, cost: 100, rezultat: i < 9 ? -5 : 20 }); cf[id] = { sit: "sus|calm|departe" }; }
  inch.push({ id: "alta", ticker: "NPA_US_EQ", pornit: 9 * Z, cost: 200, rezultat: 10 }); cf.alta = { sit: "sus|calm|departe" };
  const r = AS.situatiiCaAsta(inch, cf, "sus|calm|departe", "NPA_US_EQ");
  assert.equal(r.toate.n, 2, JSON.stringify(r.toate)); assert.equal(r.toate.putine, true);
  assert.deepEqual(r.toate.celMaiRau, { pct: -0.025, lei: -25 });
  assert.equal(r.toate.total, -15);
});
await test("I2: stopul de la poarta e al LUI cand l-a scris (stop sau −X% de la maxim), altfel cel calculat", () => {
  are(AS.stopPoarta, "ActiuniSemnale.stopPoarta");
  const niv = { nivel: "ok", stop: 90 };
  assert.deepEqual(AS.stopPoarta({ stop: 97 }, niv, 100), { stop: 97, alTau: true });
  assert.deepEqual(AS.stopPoarta({ trailPct: 4 }, niv, 100), { stop: 96, alTau: true });
  assert.deepEqual(AS.stopPoarta({}, niv, 100), { stop: 90, alTau: false });
  assert.equal(AS.stopPoarta({}, { nivel: "fara-date" }, 100), null);
  assert.equal(AS.stopPoarta({ stop: 120 }, niv, 100).stop, 90, "un stop peste pret nu e stop: ramane cel calculat");
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.ok(/ActiuniSemnale\.stopPoarta\(plan, n4, baza4\)/.test(e), "t212Poarta foloseste stopul lui");
  assert.ok(/stopul tău/.test(e), "antetul spune al cui e stopul");
});
await test("codul nou nu blocheaza: probabilitatile care arunca -> ideea trece cu prob null; la poarta, blocul nou are try/catch-ul lui", () => {
  const b = bareIdee(250), pret = b[249].c;
  const r = ID.judecaActiune(b, pret, { acum: 251 * Z, Probabilitati: { pentruActiune() { throw new Error("bum"); } } });
  assert.ok(r.trece); assert.equal(r.prob, null);
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
  assert.ok(/\} catch \(e4\) \{ t212\.poarta\.prof = null; t212\.poarta\.prob = \[\]; t212\.poarta\.sit = null;/.test(e), "blocul nou al portii in try propriu (verdictul ramane)");
});

console.log(`\n${teste - picate}/${teste} trecute`);
if (picate) process.exit(1);
