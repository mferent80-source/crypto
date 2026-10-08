// Proba v100.143 (08.10, el: „graficul e foarte îngrămădit, mai că nu se înțelege nimic unde e activitate”; a ales toate patru):
// (1) pe intervalele de zi fereastra începe cu 2 ore înaintea pornirii botului (ora botului stătea într-a 12-a parte din 24 h);
// (2) o singură săgeată ▲▼ pe lumânare și fel, cu „×n”; (3) nivelurile aproape pe aceeași linie au O etichetă, iar etichetele împinse
// primesc o liniuță spre linia lor; (4) șansele măsurate stau în eticheta din dreapta, nu peste lumânări.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const G = new Function(`${citeste("public", "lib", "grafic-bot.js")}; return GraficBot;`)();
const HTML = citeste("public", "index.html");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).slice(0, 700)}`); }); }
console.log("\nV100.143 · graficul aerisit: fereastra botului, săgețile grupate, etichetele, șansele în margine · proba\n");
const ACUM = Date.UTC(2026, 9, 8, 9, 0, 0), M5 = 300000;
// 288 de bare de 5 min (24 h), prețul 0.50 → 0.55 lin, ultima închisă chiar înainte de ACUM
function bare(n, pas, p0, p1) { const l = []; for (let i = 0; i < n; i++) { const t = ACUM - (n - i) * pas, c = p0 + (p1 - p0) * i / (n - 1), o = i ? l[i - 1].c : c; l.push({ t, o, h: Math.max(o, c) * 1.002, l: Math.min(o, c) * 0.998, c, v: 10 + (i % 7) }); } return l; }
const B5 = bare(288, M5, 0.50, 0.55), B60 = bare(168, 3600000, 0.50, 0.55);
const niv = (p, k, t, s, c, st, extra) => Object.assign({ k, p, t, s, c: c || "#f00", st: st || "solid" }, extra || {});
const umpl = (ri, tip, p, pereche) => ({ t: B5[ri].t, ri, k: 0, p, tip, pereche: !!pereche });

await test("(1) fereastraBot: pe 5 min fereastra începe cu 2 h înaintea pornirii (cel puțin 48 de bare); fără pornire / bot mai vechi decât fereastra / interval de 1 h ⇒ neschimbat", () => {
  assert.equal(G.fereastraBot(B5, null, ACUM).length, 288, "fără pornire");
  const f1 = G.fereastraBot(B5, ACUM - 60 * 60000, ACUM); assert.equal(f1.length, 48, "bot de o oră ⇒ minimul de 48 de bare"); assert.equal(f1[f1.length - 1].t, B5[287].t, "ultima bară rămâne ultima");
  const f5 = G.fereastraBot(B5, ACUM - 5 * 3600000, ACUM); assert.equal(f5.length, 84, "5 h de bot + 2 h înainte = 84 de bare"); assert.ok(f5[0].t <= ACUM - 7 * 3600000 && f5[1].t > ACUM - 7 * 3600000, "prima bară e cea de la −7 h");
  assert.equal(G.fereastraBot(B5, ACUM - 30 * 3600000, ACUM).length, 288, "bot mai vechi decât fereastra");
  assert.equal(G.fereastraBot(B60, ACUM - 60 * 60000, ACUM).length, 168, "pe 1 h (și mai lungi) fereastra rămâne întreagă");
  const iB = G.intrareBot({ bot: { id: "1", pornitLa: ACUM - 5 * 3600000, gridJos: 0.5, gridSus: 0.55, directie: "LONG" }, bare: B5, acum: ACUM, W: 1000 });
  assert.equal(iB.bare.length, 84, "intrareBot taie fereastra"); assert.equal(iB.fereastraBot, true);
  const iT = G.intrareBot({ bot: { id: "1", gridJos: 0.5, gridSus: 0.55 }, bare: B5, acum: ACUM, W: 1000 }); assert.equal(iT.bare.length, 288); assert.equal(iT.fereastraBot, false);
  const d = G.desen({ bare: iB.bare, W: 1000, st: {}, niv: [], alerte: [], per: "24h", pornit: ACUM - 5 * 3600000, fereastraBot: true });
  assert.match(d.legenda, /de la pornirea botului, cu 2 ore înainte \(84 de bare\)/);
  assert.doesNotMatch(G.desen({ bare: B5, W: 1000, st: {}, niv: [], alerte: [], per: "24h" }).legenda, /de la pornirea botului/);
});
await test("(2) umplerile: 5 cumpărări pe aceeași lumânare ⇒ UN ▲ cu „×5” (la linia cea mai de jos), titlul le înșiră; ▲ și ▼ pe aceeași lumânare ⇒ două; pe lumânări diferite ⇒ câte una, fără „×”", () => {
  const baza = { bare: B5, W: 1000, st: {}, niv: [], alerte: [], per: "24h", acum: B5[210].t + M5 + 60000 };   // v100.145: „acum” = la un minut după bara 210, altfel umplerile deschise (barele 200 / 210) ar fi „de peste o oră” (galbene, cu vârsta lângă „×5”)
  const u5 = [0.531, 0.533, 0.535, 0.537, 0.539].map((p) => umpl(200, "B", p)), s1 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: u5, perechi: 0 } })).svg;
  assert.equal((s1.match(/class="gbUmplere/g) || []).length, 1, "o singură săgeată"); assert.match(s1, />×5</); assert.match(s1, /<title>cumpărare la 0\.5310[^<]*\ncumpărare la 0\.5330/);
  const yMin = Number(s1.match(/class="gbUmplere[^"]*"><title>[^<]*<\/title><polygon points="[\d.]+,([\d.]+)/)[1]); assert.ok(yMin > 0);
  const s2 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531), umpl(200, "S", 0.539, true)], perechi: 1 } })).svg;
  assert.equal((s2.match(/class="gbUmplere/g) || []).length, 2, "▲ și ▼ separat"); assert.doesNotMatch(s2, />×\d</); assert.equal((s2.match(/gbPereche/g) || []).length, 1);
  const s3 = G.desen(Object.assign({}, baza, { umpleri: { umpleri: [umpl(200, "B", 0.531), umpl(210, "B", 0.533)], perechi: 0 } })).svg;
  assert.equal((s3.match(/class="gbUmplere/g) || []).length, 2, "lumânări diferite"); assert.doesNotMatch(s3, />×\d</);
});
await test("(3) etichetele: lichidarea și stopul planului pe aceeași linie (sub 8 px) ⇒ O etichetă „lichidare · stopul tău 0.5523”; etichetele împinse de pe linia lor primesc liniuța gbLeg; nivelurile rare ⇒ fără liniuțe", () => {
  const baza = { bare: B5, W: 1000, st: {}, alerte: [], per: "24h" };
  const apropiate = [niv(0.5523, "lich", "lichidare", "lich.", "#f00", "lich"), niv(0.5528, "stop", "stopul tău", "stop", "#f00", "solid")];
  const s1 = G.desen(Object.assign({}, baza, { niv: apropiate })).svg;
  assert.match(s1, /<text[^>]*><title>stopul tău 0\.5528 · lichidare 0\.5523<\/title>stopul tău · lichidare 0\.5528<\/text>/, "o singură etichetă (cea de sus întâi) cu ambele nume și prețul ei; titlul cu ambele prețuri"); assert.doesNotMatch(s1, />lichidare 0\.5523</);
  assert.equal((s1.match(/class="gbNiv"/g) || []).length, 2, "liniile rămân amândouă");
  // din POZA la 390: „lich. · grid↑ 0.5533 60%” ieșea din marginea de 108 px ⇒ pe telefon eticheta unită = primul nume scurt + „+”
  assert.match(G.desen(Object.assign({}, baza, { W: 390, ingust: true, niv: apropiate })).svg, /<text[^>]*><title>stopul tău 0\.5528 · lichidare 0\.5523<\/title>stop\+ 0\.5528<\/text>/, "pe telefon: „stop+ 0.5528”, titlul cu amândouă");
  // din POZĂ: „lichidare · stopul planului 0.5532” ieșea din marginea dreaptă ⇒ eticheta unită lungă folosește numele scurte
  const lungi = [niv(0.5523, "lich", "lichidare", "lich.", "#f00", "lich", { sansa: "7 zile: 83%", sansaScurt: "83%", sansaLung: "Atinge lichidarea în 7 zile: 83%" }), niv(0.5528, "stopPlan", "stopul planului", "stop plan", "#f00", "dash")];
  const s4 = G.desen(Object.assign({}, baza, { niv: lungi })).svg;
  assert.match(s4, />stop plan · lich\. 0\.5528 · <tspan class="gbSansa"[^>]*>7 zile: 83%<\/tspan><\/text>/, "nume scurte când eticheta unită e lungă; șansa o ia eticheta unită");
  const dese = [0.540, 0.542, 0.544, 0.546, 0.548, 0.550, 0.552].map((p, i) => niv(p, "n" + i, "nivel " + i, "n" + i, "#0f0", "dash"));   // la ~13 px una de alta: nu se unesc (sub 8), dar se împing (sub 20)
  const s2 = G.desen(Object.assign({}, baza, { niv: dese })).svg;
  assert.ok((s2.match(/class="gbLeg"/g) || []).length >= 3, "etichete împinse ⇒ liniuțe spre linia lor: " + (s2.match(/class="gbLeg"/g) || []).length);
  const rare = [niv(0.505, "a", "nivel a", "a", "#0f0", "dash"), niv(0.545, "b", "nivel b", "b", "#0f0", "dash")];
  assert.equal((G.desen(Object.assign({}, baza, { niv: rare })).svg.match(/class="gbLeg"/g) || []).length, 0, "niveluri rare ⇒ fără liniuțe");
});
await test("(4) șansele măsurate: nu mai stau peste lumânări (niciun text gbSansa cu text-anchor=end în cadru), ci în eticheta din dreapta a liniei, după preț; titlul lung rămâne", () => {
  const n = [niv(0.55, "gridSus", "grid sus", "grid↑", "#0af", "fine", { sansa: "24 h: 67%", sansaScurt: "67%", sansaLung: "Atinge marginea de sus (0.55) în 24 h: 67% · 76 din 113 situații" })];
  const s = G.desen({ bare: B5, W: 1000, st: {}, niv: n, alerte: [], per: "24h" }).svg;
  assert.doesNotMatch(s, /<text class="gbSansa" x="[\d.]+" y="[\d.]+" text-anchor="end"/, "nu peste lumânări");
  assert.match(s, /<text x="[\d.]+" y="[\d.]+" font-size="13" fill="#0af"><title>Atinge marginea de sus \(0\.55\) în 24 h: 67%[^<]*<\/title>grid sus 0\.5500 · <tspan class="gbSansa"[^>]*>24 h: 67%<\/tspan><\/text>/, "în eticheta din dreapta");
  const t = G.desen({ bare: B5, W: 400, ingust: true, st: {}, niv: n, alerte: [], per: "24h" }).svg; assert.match(t, /grid↑ 0\.5500 <tspan class="gbSansa"[^>]*>67%<\/tspan>/, "pe telefon forma scurtă, fără „·” (marginea e de 108 px)");
});
await test("(5) marginea din dreapta crește cu cea mai lungă etichetă (nume + preț + șansă), cel mult un sfert din lățime; fără șanse rămâne 176", () => {
  const d0 = G.desen({ bare: B5, W: 1000, st: {}, niv: [niv(0.55, "gridSus", "grid sus", "grid↑", "#0af", "fine")], alerte: [], per: "24h" });
  assert.equal(d0.harta.plotW, 1000 - 176, "fără șanse: 176 ca până acum");
  const d1 = G.desen({ bare: B5, W: 1000, st: {}, niv: [niv(0.55, "gridSus", "grid sus", "grid↑", "#0af", "fine", { sansa: "24 h: 67%", sansaScurt: "67%", sansaLung: "x" })], alerte: [], per: "24h" });
  assert.ok(d1.harta.plotW < d0.harta.plotW && 1000 - d1.harta.plotW <= 240, "cu șansă marginea crește, dar nu peste 24%: " + (1000 - d1.harta.plotW));
  const dT = G.desen({ bare: B5, W: 390, ingust: true, st: {}, niv: [niv(0.55, "gridSus", "grid sus", "grid↑", "#0af", "fine", { sansa: "24 h: 67%", sansaScurt: "67%", sansaLung: "x" })], alerte: [], per: "24h" });
  assert.equal(dT.harta.plotW, 390 - 108, "pe telefon marginea rămâne 108");
});
await test("(E) versiunea de la v100.143 în sus", () => {
  assert.match(HTML, /content="v100\.1(4[3-9]|[5-9]\d)"/); assert.match(HTML, /id="antetVersiune">v100\.1(4[3-9]|[5-9]\d) /); assert.match(HTML, /id="healthAppVersion">v100\.1(4[3-9]|[5-9]\d)</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1(4[3-9]|[5-9]\d)\.0$/); assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1(4[3-9]|[5-9]\d)";/);
  assert.match(citeste("functions", "_shared", "versiune.js"), /VERSIUNE = "v100\.1(4[3-9]|[5-9]\d)"/); assert.match(JSON.parse(citeste("BUILD_INFO.json")).version, /^v100\.1(4[3-9]|[5-9]\d)$/);
});
console.log(`\n${teste - picate}/${teste} ok`);
if (picate) process.exit(1);
