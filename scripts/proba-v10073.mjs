// Proba v100.73 - revizia Opus a pachetului 5 (sfaturile concise: Acasă, rapoartele, fișa): I1 frâna pe istorie (netul nu mai e
// „economisiți”), I2 „de” de la 20 în sus și singularul la 1 (regula TextRo.cate, acum și în gardă), M3 anul păstrat pe datele din alt an,
// M4 „pe aceeași monedă” înapoi în sfatul jurnalului, M7 garda pe motivele REALE ale gridului îngust (nu scrise de mână).
//   node scripts/proba-v10073.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea modulelor
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica } from "./garda-texte.mjs";   // incarca modulele (Acasa, Obiceiuri, GridCalcul, GridProba, JurnalTrade)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Acasa: AC, Obiceiuri: OB, GridProba: GP, JurnalTrade: JT } = globalThis;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 4, 18, 0), ZI = 86400000, ORA = 3600000;
// trade-urile in forma reala (JurnalTrade.din pe botii lui inchisi, fixtura din 24.09), ca in garda „acasa”
const REALE = JT.din(JSON.parse(fs.readFileSync(path.join(RAD, "scripts", "fixturi", "boti-inchisi-2026-09-24.json"), "utf8"))), TPL = REALE[0];
let nId = 0;
const tr = (m, rez, o) => Object.assign({}, TPL, { id: "p" + (++nId), moneda: m, rezultat: rez, net: rez, inchis: T0 - 5 * ZI, pornit: T0 - 6 * ZI, durataOre: 30, comisioane: -0.2, funding: 0, dir: "long", greseli: [] }, o || {});
const num = (s) => Number(String(s).replace(/\./g, "").replace(",", ".").replace("−", "-"));
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");

console.log("Proba v100.73 · revizia Opus a pachetului 5 (Acasă, rapoartele, fișa)");

await test("I1 frâna pe istorie: netul spus „net”, cu pierderile evitate − câștigurile pierdute care dau chiar netul (nu „economisiți” pe o cifră netă)", () => {
  const fi = OB.franaIstoric(Array.from({ length: 40 }, (_, i) => tr("M" + (i % 6), i % 3 ? -6 : 4, { inchis: T0 - (40 - i) * 6 * ORA, pornit: T0 - (40 - i) * 6 * ORA - 3 * ORA })), null);
  assert.ok(fi.sarite > 0 && fi.cedat > 0, "fixtura nu sare nimic: " + fi.text);
  assert.doesNotMatch(fi.text, /economisiți/, fi.text);
  const m = fi.text.match(/net ([+−][\d,]+) USDT \(pierderi evitate ([\d,]+) − câștiguri pierdute ([\d,]+)\)/);
  assert.ok(m, "forma „net X USDT (pierderi evitate Y − câștiguri pierdute Z)”: " + fi.text);
  assert.ok(Math.abs(num(m[2]) - num(m[3]) - num(m[1])) < 0.011, "Y − Z ≠ X: " + fi.text);
  assert.ok(Math.abs(num(m[1]) - fi.economisit) < 0.011 && Math.abs(num(m[3]) - fi.cedat) < 0.011, fi.text);
  assert.deepEqual(verifica(fi.text, "detalii"), [], fi.text);
});

await test("I2 garda știe regula „de”/singularul (TextRo.cate): „62 boți”, „1 boți”, „12 de zile” pică; „62 de boți”, „101 cazuri”, „2 zile”, „1,6 zile” trec", () => {
  for (const t of ["— 62 boți, −3,00 USDT.", "— 1 boți, −3,00 USDT.", "pe 12 de zile — mai puține ferestre", "x din 30 monede: plătesc long", "1 alerte trimise"]) assert.notDeepEqual(verifica(t, "detalii"), [], "trece: " + t);
  for (const t of ["— 62 de boți, −3,00 USDT.", "— 1 bot, −3,00 USDT.", "Din 101 cazuri independente.", "pe 2 zile", "Liniște de 1,6 zile (pe 24 h).", "1723 de porniri", "pe 100 de monede"]) assert.deepEqual(verifica(t, "detalii"), [], t);
});

await test("I2 obiceiurile: greșeala cea mai scumpă „1 bot” / „25 de boți”, frâna „20 de boți pe minus la rând” (producătorii reali, greșeala reală din jurnal)", () => {
  const g = REALE.map((t) => t.greseli && t.greseli[0]).find(Boolean); assert.ok(g, "nicio greșeală în fixtura reală");
  const rand = (n) => OB.raportDuminica({ trades: Array.from({ length: n }, () => tr("CRV", -3, { inchis: T0 - ZI, greseli: [g] })), acum: T0 }).linii.find((l) => /^Greșeala cea mai scumpă/.test(l)) || "";
  assert.match(rand(1), /” — 1 bot, /, rand(1)); assert.match(rand(25), /” — 25 de boți, /, rand(25));
  const f = OB.frana({ trades: Array.from({ length: 20 }, (_, i) => tr("A" + i, -0.4, { inchis: T0 - (i + 1) * 60000 })), acum: T0 });
  assert.match(f.text, /20 de boți pe minus la rând/, f.text);
});

await test("I2 Acasă: funding-ul „din 30 de monede”, socoteala alertelor „1 alertă trimisă”, „Din 25 de mișcări neobișnuite, 1 din 25 a continuat”, „(1 caz)”", () => {
  const fu = AC.fundingPiata(Array.from({ length: 30 }, (_, i) => ({ s: "M" + i + "_USDT_PERP", rate: i % 3 ? 0.0001 : -0.00005, hist: [0.0001, 0.0001, 0.0001] })));
  assert.match(fu.text, / din 30 de monede: /, fu.text);
  assert.match(AC.socotealaAlerte([{ fel: "miscare", pret: 100, dir: "sus" }]).text, /^1 alertă trimisă;/);
  const mi = Array.from({ length: 25 }, (_, i) => ({ fel: "miscare", pret: 100, dir: "sus", p1: i ? 99 : 101 }));
  const s = AC.socotealaAlerte(mi.concat([{ fel: "vreme", pret: 100, p1: 102 }]));
  assert.match(s.text, /^Din 25 de mișcări neobișnuite, 1 din 25 a continuat /, s.text); assert.match(s.textVreme, /\(1 caz\)\.$/, s.textVreme);
});

await test("I2 fișa și jurnalul din app.js: „Aș începe cu greșeala „X”: … pe 572 de boți”, „N de boți” prin TextRo.cate, „pe 12 zile” fără „de” în plus", () => {
  const s = app();
  assert.doesNotMatch(s, /Ce aș face eu:<\/b> încep cu „/, "acțiunea jurnalului nu e la persoana I („încep cu”)");
  assert.match(s, /Ce aș face eu:<\/b> Aș începe cu greșeala „'\+escapeHtml\(r\.greseli\[0\]\.titlu\)\+'”: a costat '\+U\(r\.greseli\[0\]\.cost\)\+' pe '\+TextRo\.cate\(r\.greseli\[0\]\.n,"bot","boți"\)/);
  assert.doesNotMatch(s, /"pe "\+r\.zile\+" de zile — mai puține ferestre"/, "„pe 12 de zile”");
  assert.doesNotMatch(s, /rp2\.n\+' boți|'Pe '\+rp2\.n\+' boți|· "\+r\.n\+" boți, "/, "„N boți” fără TextRo.cate în jurnal");
});

await test("M3 istoricul monedei: data celui mai rău bot păstrează anul când nu e anul de acum („28.12.25”), fără an în anul curent", () => {
  const an = new Date().getUTCFullYear(), vechi = Date.UTC(an - 1, 11, 28, 12), nou = Date.UTC(an, 0, 5, 12);
  const t1 = OB.istoricMoneda([tr("ABC", -40, { inchis: vechi }), tr("ABC", -2), tr("ABC", -3), tr("ABC", 1)], "ABC").text;
  assert.match(t1, new RegExp("pe 28\\.12\\." + String(an - 1).slice(2)), t1);
  const t2 = OB.istoricMoneda([tr("ABC", -40, { inchis: nou }), tr("ABC", -2), tr("ABC", -3), tr("ABC", 1)], "ABC").text;
  assert.match(t2, /pe 05\.01\.$|pe 05\.01\b(?!\.\d)/, t2);
});

await test("M4 jurnalul crypto: „n-aș reporni pe aceeași monedă în primele 10 minute” rămâne (cifra pe rândul de sub acțiune, acțiunea ≤ 110)", () => {
  const s = app(), i = s.indexOf("Aș porni doar pe 🟢"), linie = s.slice(i, s.indexOf("\n", i));
  assert.ok(i > 0, "acțiunea jurnalului lipsește");
  assert.match(linie, /^Aș porni doar pe 🟢 și n-aș reporni pe aceeași monedă în primele 10 minute\./, linie.slice(0, 160));
  const fac = linie.match(/^([^<"]+)/)[1]; assert.ok(fac.length <= 110, fac.length + ": " + fac);
});

await test("M7 garda „acasa”: rândul ideilor „nu” vine din GridProba.ingust REAL și din ramura „!best” citită din sursă (nu un motiv scris de mână)", () => {
  const g = fs.readFileSync(path.join(RAD, "scripts", "lib", "garda-acasa.mjs"), "utf8");
  assert.doesNotMatch(g, /motiv: "pe istoric, toate variantele înguste/, "motivul scris de mână, în forma veche");
  const ri = situatii().filter((x) => x.mod === "acasa" && x.sursa === "rezumatIngust.t").map((x) => x.text);
  assert.ok(ri.some((t) => /prea puține ferestre independente pe partea de test \(\d+ din 30 la \d+ h\)/.test(t)), "lipsește motivul real „prea puține ferestre”: " + ri.join(" | "));
  assert.ok(ri.some((t) => /toate variantele înguste s-au lichidat sau n-au avut ferestre: gridul lat rămâne mai bun/.test(t)), "lipsește ramura „!best” din sursă: " + ri.join(" | "));
});

console.log("\n" + (pica ? "V100.73 PICA · " + pica + " din " + (ok + pica) : "V100.73 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
