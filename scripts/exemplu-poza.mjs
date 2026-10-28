// Contractul pozei (v100.263, auditul Radar din 28.10, I-786): un exemplu COMPLET al pozei pe care colectorul o urcă la Paznic și pe care
// pagina Alerte din Trading Tools o randează - produs chiar de construiestePoza (scripts/lib/poza.mjs), cu toate câmpurile pe care le
// poate avea o poziție, un bot, un simbol urmărit, un rând Salt, o cerere Salt și o alertă. Determinist (ceas fixat).
//
//   node scripts/exemplu-poza.mjs            scrie paznic/exemplu-poza.json
//   node scripts/exemplu-poza.mjs --check    iese 1 dacă fișierul de pe disc nu e cel produs acum (câmp nou în poză ⇒ regenerezi și îl copiezi
//                                            în premarket_scanner.html/tools/exemplu-poza.json, unde testul paginii pune HTML în fiecare frunză)
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construiestePoza, nivDinNiveluri } from "./lib/poza.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FISIER = path.join(RAD, "paznic", "exemplu-poza.json");
export const ACUM = Date.UTC(2026, 9, 28, 11, 20);   // 28.10.2026 13:20, ora României

const tranzactii = [
  { startDate: { fmt: "2026-10-20" }, transactionText: "Purchase at price 95.10 per share.", filerName: "TAN LIP-BU", filerRelation: "Chief Executive Officer", shares: { raw: 105263 }, value: { raw: 9999985 } },
  { startDate: { fmt: "2026-10-12" }, transactionText: "Sale at price 101.00 per share.", filerName: "ZINSNER DAVID", filerRelation: "Chief Financial Officer", shares: { raw: 20000 }, value: { raw: 2020000 } },
  { startDate: { fmt: "2026-10-05" }, transactionText: "Stock Award(Grant) at price 0.00 per share.", filerName: "X Y", filerRelation: "Director", shares: { raw: 500 }, value: { raw: 0 } },
];
const bare = Array.from({ length: 40 }, (_, i) => ({ t: Date.UTC(2026, 8, 1 + i, 13, 30), o: 100 + i * 0.4, h: 101 + i * 0.4, l: 99 + i * 0.4, c: 100.5 + i * 0.4 }));
const niveluriPozitie = { nivel: "ok", stopPozitie: 98.6, tintaPozitie: 128.4, stop: 97.1, tinta: 121.2, trend: { dir: "sus" }, k: 2.5, d: 4.2, riscPct: 0.034, proba: { n: 23, pePlus: 0.57, medie: 0.0121 }, intrare: null };
const niveluriUrmarit = { nivel: "ok", stop: 118.4, tinta: 136.9, trend: { dir: "sus" }, k: 2, d: 3.1, riscPct: 0.028, proba: { n: 31, pePlus: 0.52, medie: -0.0043 }, intrare: { pret: 121.9, motiv: "revenire la media de 20 de zile" } };
const plan = { trailPct: 15, tinta: 128.4, stop: 97.5, proba: false };

const t212 = [{
  ticker: "INTC_US_EQ", simbol: "INTC", qty: 12.3456, pretMediu: 108.21, pret: 116.1, plan, maxDupaCumparare: 116, stopT212: 104.5, sursa: null,
  extra: { tranzactii, rezultate: { data: "2026-11-05", eps: 0.39 }, analisti: { tinta: 125.4, recom: "buy", n: 43 }, shortFloat: 0.031 },
  niveluri: niveluriPozitie, prev: 115.2, la: ACUM - 90000, ppl: 412.37, costLei: 6208.44, bare,
  sem: { nivel: "atentie", motive: ["a urcat 4 zile la rând: aș strânge stopul", "ponderea trece de 15 % din cont"], ceAsFace: "👉 Țin, cu stopul urcat la 104,5." },
  niv: nivDinNiveluri(niveluriPozitie, plan), pondere: 0.157,
}, {
  ticker: "RHMd_EQ", simbol: "RHM.DE", qty: 1, pretMediu: 1702, pret: 1655, plan: null, maxDupaCumparare: 1810, stopT212: null, sursa: null,
  extra: { tranzactii: [], rezultate: null, analisti: null, shortFloat: null }, niveluri: { nivel: "fara-date", motiv: "prea puține lumânări" }, prev: 1661, la: ACUM - 90000, ppl: -241.5, costLei: null, bare: [],
  sem: { nivel: "iesi", motive: ["a coborât sub stopul din plan"], ceAsFace: "aș ieși" }, niv: null, pondere: 0.21,
}];
const boti = [{
  id: "2386", baza: "JTO.PERP", simbolPionex: "JTO_USDT_PERP", directie: "LONG", levier: 5, investit: 98.14, gridJos: 0.5722, gridSus: 0.6572, pretCurent: 0.5912, distantaLichidarePct: 17.3,
  profitTotal: -8.84, ordinePerechi: 14, gridProfitBrut: 3.15, comisioane: -0.29, zero: 0.5951, plan: { plus: 5.2, minus: 14.9, afaraOre: 12 },
  semafor: { nivel: "atentie", cod: "aproape-de-prag", motiv: "pierderea e la 60 % din pragul planului", faCe: "👉 Aș lăsa botul, cu ochii pe prag.", deCe: "Gridul încă aduce.", componente: [{ nivel: "info", motiv: "în grid 22 %" }] },
  pret30: Array.from({ length: 30 }, (_, i) => 0.59 + Math.sin(i / 4) * 0.004), la: ACUM - 60000, pret24h: { pret: 0.6012, t: ACUM - 24 * 3600000, ore: 24 }, grila: { pct: 0.00196, usdt: 0.0801, grile: 12 }, ziPionex: { deschidere: 0.5961, t: ACUM - 48000000 },
}];
const simboluri = [{
  s: "AVGO", nota: "dublura germană e 1YD.DE", sursa: null, moneda: "$", pret: 352.81, prev: 350.36, closes30: Array.from({ length: 30 }, (_, i) => 340 + i * 0.45),
  extra: { tranzactii, rezultate: { data: "2026-12-11", eps: 1.62 }, analisti: { tinta: 410.5, recom: "strong_buy", n: 36 }, shortFloat: 0.012 }, niveluri: niveluriUrmarit, marime: { bucati: 3.21, suma: 5718, risc: 157, plafonat: false },
}, {
  s: "RHM.DE", nota: "", sursa: null, moneda: "€", pret: 1655, prev: 1661, closes30: [1700, 1690, 1655], extra: null, niveluri: { nivel: "ok", stop: 1540, tinta: 1880, trend: { dir: "jos" }, k: 2.5, d: 60, riscPct: 0.036, proba: { n: 9, pePlus: 0.44, medie: -0.012 }, intrare: null }, marime: null,
}];
const salt = { la: ACUM - 600000, randuri: [{
  simbol: "NFLX", isin: "US64110L1061", nume: "Netflix", qty: 14.43412, pretMediu: 79.84, moneda: "USD", plata: "EUR", de: "2026-04-21", pret: 88.12, prev: 87.4, mediuSimbol: 81.2, closes30: [80, 84, 88.12],
  rez: 97.6, cost: 1152.3, val: 1249.9, max: 91.3, niv: "tine", motive: ["peste prețul tău mediu cu 10 %"], sfat: "👉 Țin.", sugestie: { stop: 77.6, tinta: 98.1, k: 2, trend: "sus", proba: { n: 18, pePlus: 0.56, medie: 0.008 } }, motivFara: null,
}] };
const saltCereri = [{ id: "mh0x2a9k", simbol: "NFLX", op: "pune", stare: "ok", motiv: "pusă în listă", la: ACUM - 300000 }, { id: "mh0x2b1z", simbol: "ZZZ", op: "pune", stare: "respins", motiv: "Yahoo nu știe simbolul", la: ACUM - 240000 }];
const alerte = [
  { t: ACUM - 3600000, grup: "det", sim: "INTC", src: "t212", nivel: "atentie", titlu: "INTC: la 1,2 % de stopul din planul tău ($104,50)", mesaj: "Prețul e $105,80, în ultimul sfert al drumului spre stop.\n👉 N-aș adăuga acum.", zgomot: false },
  { t: ACUM - 1800000, grup: "det", sim: "JTO", src: "bot", nivel: "info", titlu: "JTO (long 5×): +1,0% în 42 min", mesaj: "0,5852 → 0,5912 · în grid 22%.", zgomot: true },
  { t: ACUM - 900000, grup: "urm", sim: "AVGO", src: "urm", nivel: "critic", titlu: "AVGO: a ajuns la intrarea sugerată ($121,90)", mesaj: "Prețul e $121,70 · stop $118,40 · țintă $136,90.\n👉 Aș intra doar cu stopul pus.", zgomot: false },
];

export function exemplu() {
  const poza = construiestePoza({ acum: ACUM, turaLa: ACUM - 45000, versiune: "v101.141", pid: 4242, tura: 317, radarUrl: "https://pc.tailabc.ts.net:8443", t212, t212La: ACUM - 90000, t212Eroare: null, boti, simboluri, salt, saltCereri });
  poza.alerte = alerte;
  return poza;
}
const text = JSON.stringify(exemplu(), null, 1) + "\n";
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const pe = fs.existsSync(FISIER) ? fs.readFileSync(FISIER, "utf8").replace(/\r\n/g, "\n") : "";
    if (pe !== text) { console.error("✗ paznic/exemplu-poza.json nu e cel produs de construiestePoza de acum: node scripts/exemplu-poza.mjs, apoi copiază-l în premarket_scanner.html/tools/"); process.exit(1); }
    console.log("✓ exemplul pozei e la zi (" + Math.round(text.length / 1024) + " KB)");
  } else { fs.writeFileSync(FISIER, text); console.log("scris " + path.relative(RAD, FISIER) + " (" + Math.round(text.length / 1024) + " KB)"); }
}
