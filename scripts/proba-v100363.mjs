// Proba v100.363 (18.11.2026, el: „mai departe” ⇒ Scanner „ca Jurnalul”; hotărârile LUI: scorul spus cinstit, rețetele reparate + poza zilnică,
// aspectul ca paginile refăcute, toate 4 grafice; demo ⇒ „ok”). Dovezile măsurate și graficele lor, textul istoricului față de aceeași zi (și
// eticheta cinstită când istoricul e vechi), colectorul (răcirea alertelor, prețul în Discord, poza zilnică), ruta, pagina (nimic pierdut), tema, versiunile.
//   node scripts/proba-v100363.mjs
import "./lib/text-ro-global.mjs";
import { cuTablou } from "./lib/sursa-app.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
for (const f of ["scan.js", "scan-dovezi.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Scan: S, ScDovezi: SD } = globalThis;
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("V100.363 · Scannerul cinstit\n");

await test("D1 dovezile: 10 zecimi pe fiecare univers (randamentul la 7 zile și plaja pe 3 zile), rețetele la 7 / 30 de zile, candidații de grid; data măsurării", () => {
  const D = SD.D; assert.equal(D.la, "18.11.2026");
  for (const k of ["scor7", "scorR3"]) for (const u of ["B", "P"]) { assert.equal(D[k][u].length, 10, k + u); D[k][u].forEach((r, i) => { assert.equal(r[0], i + 1); assert.ok(r[2] <= r[1] && r[1] <= r[3], k + u + " intervalul conține media"); }); }
  for (const u of ["B", "P"]) for (const k of ["trend", "revenire", "spargere", "miscare"]) for (const z of [7, 30]) assert.ok(Array.isArray(D.retete[u][k + "|" + z]), u + k + z);
  assert.ok(D.grid.B.miscare[0] < 0 && D.grid.B.miscare[2] < 0, "candidații: clar mai calmi decât cele în mișcare (intervalul sub zero)");
  // ce spune pagina trebuie să se vadă în cifre: plaja urcă cu scorul (zecimea 10 > zecimea 1 cu intervale despărțite), randamentul nu
  const R3 = D.scorR3.B, R7 = D.scor7.B; assert.ok(R3[9][2] > R3[0][3], "plaja: zecimea 10 peste zecimea 1");
  assert.ok(!(R7[9][2] > R7[0][3]), "randamentul la 7 zile: zecimea 10 NU e clar peste zecimea 1 (altfel textul „nu prezice” minte)");
});
await test("D2 graficele: SVG fără NaN, bara + mustăți + cercul monedelor de azi; plaja și candidații pe culoare neutră; pe telefon etichetele scurte nu se taie", () => {
  const D = SD.D;
  for (const h of [SD.decile(D.scor7.B, D.scor7.P, { lat: 520 }), SD.decile(D.scorR3.B, D.scorR3.P, { lat: 380, neutru: true }), SD.retete({ lat: 520 }), SD.retete({ lat: 380 }), SD.grid({ lat: 380 })]) {
    assert.match(h, /^<svg class="jgSvg"/); assert.doesNotMatch(h, /NaN|undefined|Infinity/); assert.match(h, /class="jgNou"/); assert.match(h, /class="jgIc"/);
  }
  assert.match(SD.decile(D.scorR3.B, D.scorR3.P, { neutru: true }), /jgBara jgNeutru/); assert.doesNotMatch(SD.decile(D.scorR3.B, D.scorR3.P, { neutru: true }), /jgPoz|jgNeg/);
  assert.match(SD.grid({}), /jgBara jgNeutru/); assert.match(SD.decile(D.scor7.B, D.scor7.P, {}), /jgPoz/);
  const tel = SD.retete({ lat: 380 }); assert.match(tel, />Mișcare neob\. · 30 z</); assert.doesNotMatch(tel, /neobișnuită/);
  assert.match(SD.retete({ lat: 900 }), />Mișcare neobișnuită · 30 zile</);
  // eticheta are loc: lățimea ei = textul cel mai lung (≈ 6,3 px pe literă), nu o treime fixă din grafic
  const lbl = Number((tel.match(/<text class="jgEt" x="([\d.]+)"/) || [])[1]); assert.ok(lbl >= "Mișcare neob. · 30 z".length * 6.3, "eticheta pe telefon: " + lbl);
  assert.equal(SD.spark([1]), ""); assert.equal(SD.spark(null), ""); assert.match(SD.spark([1, 2, 3]), /jgSparkSus/); assert.match(SD.spark([3, 2, 1]), /jgSparkJos/);
  assert.equal(SD.pp(-0.04), "0,0 pp"); assert.equal(SD.pp(-1.25), "−1,3 pp");
});
await test("I istoricul: cu excesul știut ⇒ „față de aceeași zi”, semnificația din interval; fără interval ⇒ nimic; istoricul vechi ⇒ fataDeZi fals", () => {
  const baza = { s: { n: 900, pe: 48, med: -1, zile: 400 }, l: { n: 800, pe: 47, med: -2, zile: 380 } };
  const nou = (lo, hi) => ({ ore: [7, 30], baza, trend: { s: { n: 300, pe: 44, med: -2, zile: 120, ex: (lo + hi) / 2, exLo: lo, exHi: hi }, l: { n: 280, pe: 45, med: -3, zile: 110, ex: -2, exLo: -4, exHi: 0.5 } } });
  let t = S.textIstoric(nou(-3, -0.5), "trend"); assert.equal(t.fataDeZi, true); assert.equal(t.semnif, -1); assert.match(t.text, /^față de aceeași zi: după o săptămână −1,8 pp \(−3,0 pp … −0,5 pp\), după o lună −2,0 pp/);
  assert.equal(S.textIstoric(nou(-1, 2), "trend").semnif, 0); assert.equal(S.textIstoric(nou(0.4, 2), "trend").semnif, 1);
  const fara = nou(0, 0); fara.trend.s.exLo = null; fara.trend.s.exHi = null; assert.equal(S.textIstoric(fara, "trend").semnif, null, "ex fără interval: nicio judecată");
  const vechi = { ore: [7, 30], baza, trend: { s: { n: 300, pe: 44, med: -2, zile: 120 }, l: { n: 280, pe: 45, med: -3 } } };
  t = S.textIstoric(vechi, "trend"); assert.equal(t.fataDeZi, false); assert.match(t.text, /^după o săptămână 44% pe plus/);
  // pagina: istoricul vechi spune „o zi oarecare”, nu „ziua ei”
  const E = citeste("public", "lib", "scan-ecran.js");
  assert.match(E, /\(t\.fataDeZi \? "ziua ei" : "o zi oarecare: istoricul vechi, fără ziua ei"\)/); assert.match(E, /t\.semnif == null \? ""/);
});
await test("C colectorul: prețul în Discord după mărime; răcirea alertelor 12 h pe simbol + rețetă + sens; poza zilnică o dată pe zi și piață; colector v101.200", async () => {
  const T = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "tura-scan.mjs")).href);
  assert.equal(T.pretDiscord(10), "10,00"); assert.equal(T.pretDiscord(0.0012345), "0,00123"); assert.equal(T.pretDiscord(2345.6), "2.346"); assert.equal(T.pretDiscord(0), "—");
  assert.equal(T.RACIRE_MS, 12 * 3600000);
  const trimise = [], d = { Scan: { RETETE: [{ k: "grid", t: "Candidați de grid" }], retete: (x) => x.r }, trimiteAlerta: async (m) => { trimise.push(m); } }, st = {}, H = 3600000, T0 = Date.UTC(2026, 10, 18);
  const pas = (r, ore) => T.anuntaUrmarite(d, st, "c", [{ s: "SOL", p: 140.5, ch: 1, r }], ["cSOL"], T0 + ore * H);
  await pas([], 0); assert.equal(trimise.length, 0, "prima vedere nu anunță");
  await pas(["grid"], 1); assert.equal(trimise.length, 1, "intră ⇒ anunță");
  await pas([], 2); assert.equal(trimise.length, 2, "iese ⇒ anunță (alt sens)");
  await pas(["grid"], 3); await pas([], 4); await pas(["grid"], 5); assert.equal(trimise.length, 2, "du-te-vino în 12 h ⇒ tăcere");
  await pas([], 14); assert.equal(trimise.length, 3, "după 12 h ieșirea se anunță din nou");
  const C = citeste("scripts", "colector.mjs"), TS = citeste("scripts", "lib", "tura-scan.mjs");
  assert.ok(Number((C.match(/const VERSIUNE_COLECTOR = "v101\.(\d+)";/) || [])[1]) >= 200, "colector de la v101.200 încolo"); assert.match(C, /scriePoza: \(o\) => fs\.appendFileSync\(path\.join\(DATA, "scan-poze\.jsonl"\)/);
  assert.match(TS, /if \(d\.scriePoza\) for \(const \[fel, l\] of \[\["c", cr\], \["a", ac\]\]\)/); assert.match(TS, /st\["poza" \+ fel\] === ziU\) continue;/); assert.match(TS, /if \(ok\) st\["poza" \+ fel\] = ziU;/);
});
await test("R ruta: scanul păstrează prețul și mișcarea de azi (pAzi, chAzi, mare) și excesul din istoric (zile, ex, exLo, exHi, exPe)", () => {
  const F = citeste("functions", "api", "istoric-bot.js");
  assert.match(F, /const NR=\[[^\]]*"pAzi","chAzi"\]/); assert.match(F, /BO=\[[^\]]*"mare"/);
  for (const k of ["zile", "ex", "exLo", "exHi", "exPe"]) assert.ok(new RegExp("\\b" + k + "\\b").test(F), k);
  assert.match(citeste("public", "lib", "scan.js"), /p = nr\(x\.pAzi\) !== null \? nr\(x\.pAzi\) : nr\(x\.p\)/, "planul pe prețul de acum");
});
await test("P pagina: capul cu vechimea pe piețe și tema, fraza + De unde știu, rândurile pliate, nimic pierdut (toate ID-urile vechi), ordinea nouă, pompa, cardurile de telefon, funding", () => {
  const H = citeste("public", "index.html"), E = citeste("public", "lib", "scan-ecran.js");
  for (const id of ["scCand", "scRescan", "scContext", "scRetete", "scExplic", "scFile", "scMele", "scCaut", "scOrdine", "scLista", "scVechi", "scNou", "scTemaBtn", "scFraza", "scSVreme", "scSIst", "scSUrm", "scSCum", "scIstorie", "scUrmarite"]) assert.match(H, new RegExp('id="' + id + '"'), id);
  assert.match(H, /<p class="scNota">Scorul \(0–100\)[^<]*nu spune ce va urca[^<]*dar spune ce se va mișca mult \(dovedit\)/); assert.match(H, /<p class="scPachet">/);
  assert.match(H, /<option value="atrPct">Ordine: mișcare pe zi<\/option><option value="gs">Ordine: scor de grid<\/option>/);
  assert.match(H, /<script src="\/lib\/scan\.js"><\/script><script src="\/lib\/scan-dovezi\.js"><\/script>/); assert.match(citeste("public", "sw.js"), /"\/lib\/scan-dovezi\.js"/);
  // ordinea în pagină (pzDemo dă 900 copiilor necunoscuți): fraza și vremea sus, istoricul / urmăritele / cum se citește după listă
  const css = citeste("public", "app.css"); assert.match(css, /\.pzDemo #scNou>#scFraza\{order:5\}\.pzDemo #scNou>#scSVreme\{order:10\}\.pzDemo #scNou>#scSIst\{order:50\}/);
  assert.match(E, /var SC_RAND_KEY = "scRanduri", SC_RANDURI = \{ scSVreme: "Vremea pieței", scSIst: "Cât a mers rețeta în trecut", scSUrm: "🔔 Urmărite", scSCum: "Cum se citește" \}, SC_RAND_DESCHIS = \{ scSVreme: 1 \};/);
  assert.match(E, /function scFrazaHtml\(R\)/); assert.match(E, /<summary>De unde știu<\/summary>/); assert.match(E, /scanul crypto e vechi: colectorul n-a mai scris/); assert.match(E, /reîmprospătarea n-a mers: /);
  assert.match(E, /o\.pompa = chA !== null && chA >= 25;/); assert.match(E, /verde: trend curat \(nu „cumpără”: pe istoric nu prezice randamentul\)/);
  for (const et of ["preț", "azi", "7 zile", "față de piață", "trend", "RSI", "mișcare azi", "la max. 20 z", "scor", "mișcă/zi"]) assert.ok(E.includes('data-et="' + et + '"'), et);
  assert.match(E, /ScDovezi\.spark\(x\.spark\)/); assert.match(E, /Frâna contului e trasă azi: lista e de urmărit, nu de pornit\./);
  assert.match(E, /Funding' \+ \(fu && fu\.ore \? " \(la " \+ scCate\(fu\.ore, "oră", "ore"\)/); assert.doesNotMatch(E, /Funding \(la 4 ore\)/); assert.match(E, /fu === false \? "nu l-am putut citi"/);
  assert.match(E, /serie === false && scanSt\.deschisAcum === id/, "graficul se reîncearcă la redeschidere");
  // telefonul: regulile vechi (4 coloane ascunse) au ieșit, cardul pune toate cifrele cu eticheta lor
  assert.doesNotMatch(css, /grid-template-areas:"s n p z" "s i t k"/); assert.match(css, /#scan \.scRand>span\[data-et\]::before\{content:attr\(data-et\)/);
});
await test("T tema și legăturile: RADACINI cu scan, tbTemaAplica + scTemaBtn, tema devreme, tbRandComuta ⇒ scRandComuta, generatorul la zi", () => {
  assert.match(citeste("scripts", "face-tema-tablou.mjs"), /export const RADACINI = \[[^\]]*"carnet", "scan"(, "[a-z]+")*\]/);
  const A = cuTablou(citeste("public", "app.js")); assert.match(A, /"tradezilei","carnet","scan","salt","alerts","contintreg"\]\.forEach/); assert.match(A, /"tzTemaBtn","cnTemaBtn","scTemaBtn","slTemaBtn","alTemaBtn","ciTemaBtn"\]/); assert.match(A, /return scRandComuta\(id,deschis\);/);
  assert.match(citeste("public", "lib", "tema-devreme.js"), /"tradezilei", "carnet", "scan", "salt", "alerts", "contintreg"\]/);
  assert.match(citeste("public", "app.css"), /#tradezilei,#carnet,#scan,#salt,#alerts,#contintreg\)/);
});
await test("V versiunile de la v100.363 încolo (v100.364: versiunea curentă o verifică proba ei)", () => {
  const nr = (t) => Number((String(t).match(/100[.-](\d{3})/) || [])[1]);
  assert.ok(nr(citeste("functions", "_shared", "versiune.js")) >= 363 && nr(citeste("public", "sw.js")) >= 363);
  const p = JSON.parse(citeste("package.json")); assert.ok(nr(p.version) >= 363); assert.match(p.scripts.test, /npm run test:v100362 && npm run test:v100363/); assert.equal(p.scripts["test:v100363"], "node scripts/proba-v100363.mjs");
  const bi = JSON.parse(citeste("BUILD_INFO.json")); assert.ok(nr(bi.badge) >= 363); assert.ok(bi.sc363 && bi.cf362);
});
console.log(`\n${teste - picate}/${teste} trec`);
process.exit(picate ? 1 : 0);
