#!/usr/bin/env node
// Bilanțul jurnalului „nota TradingView + verdictul Radarului” ținut de colector (I-869, I-875, I-878).
// Doar citește și numără: câte note cu direcție au fost judecate după 4 bare și câte au nimerit, pentru TradingView și pentru Radar
// (verdictul ARĂTAT de pagină, cel confirmat pe două bare; verdictul barei stă în jurnal alături, în rb4 / rbZ).
// Rulare: npm run raport:nota-tv            (fișierele colectorului de pe mașina asta, din data/)
//         node scripts/raport-nota-tv.mjs <cale-către-nota-tv.json>     (zilele și judecata se caută lângă el)
// Citește, în ordine: zilele ținute de colector (nota-tv-zile.json, care rămân și după ce jurnalul își taie zilele vechi) îmbinate cu
// jurnalul; judecata ÎNGHEȚATĂ de colector (nota-tv-judecata.json), dacă există - nu o reface. Regulile judecății (blocuri de 5 zile
// încheiate, prag, mărime minimă) sunt în docs/cercetare/2026-11-13-tablou-acuratete.md, „Jurnalul notei pe viu”.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zileDinJurnal, imbinaZile, bilantDinZile, judecataDinZile, N1 } from "./lib/tura-nota-tv.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fis = process.argv[2] || path.join(RAD, "data", "nota-tv.json"), dosar = path.dirname(fis);
const json = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const jurnal = json(fis);
if (!Array.isArray(jurnal)) { console.log("Nu pot citi jurnalul (" + fis + ") sau nu e o listă."); process.exit(1); }
const zile = imbinaZile(json(path.join(dosar, "nota-tv-zile.json")), zileDinJurnal(jurnal)), b = bilantDinZile(zile), inghetata = json(path.join(dosar, "nota-tv-judecata.json")) || {}, acum = judecataDinZile(zile);
const pc = (x) => (100 * x).toFixed(1).replace(".", ",") + "%";
const rand = (nume, x) => nume + ": " + (x.n ? x.k + " din " + x.n + " (" + pc(x.k / x.n) + "), în " + x.zile + " zile" : "nicio notă judecată");
console.log("Jurnalul notei TradingView: " + jurnal.length + " de intrări în jurnal, " + b.zile + " zile cu note judecate pe 4 ore (de la " + new Date(N1.deLa).toISOString().slice(0, 16).replace("T", " ") + " UTC)");
console.log(rand("TradingView, 4 ore (după 4 bare)", b.serii.tv4h));
console.log(rand("Radarul, 4 ore (verdictul arătat; același preț de după)", b.serii.radar4h));
console.log(rand("TradingView, 1 zi (după 4 zile; doar numărat, nu se judecă)", b.serii.tv1D));
console.log(rand("Radarul, 1 zi (doar numărat, nu se judecă)", b.serii.radar1D));
// judecata, pe serie: cea înghețată de colector dacă există; altfel starea de acum (câte blocuri încheiate și valide sunt)
let vreunaGata = false;
for (const [s, nume] of [["tv4h", "TradingView"], ["radar4h", "Radarul"]]) { const j = inghetata[s] && inghetata[s].gata ? inghetata[s] : acum[s];
  if (j.gata) { vreunaGata = true; console.log("Judecata " + nume + (inghetata[s] && inghetata[s].gata ? " (înghețată de colector)" : " (din zilele de acum; colectorul o îngheață la prima lui tură)") + ", pe primele " + j.blocuri + " de blocuri de 5 zile (" + j.deLa + " … " + j.panaLa + "): " + j.verdict + " — media blocurilor " + pc(j.medie) + ", p = " + (100 * j.p).toFixed(3).replace(".", ",") + "%"); }
  else console.log("Judecata " + nume + ": încă nu — " + j.blocuri + " din " + j.trebuie + " blocuri de 5 zile încheiate și valide."); }
console.log(vreunaGata ? "Judecata se face o singură dată pe serie; cifrele de mai sus ale notelor sunt doar numărătoare."
  : b.zile < N1.zileArata ? "E prea devreme: sub " + N1.zileArata + " de zile cu note judecate (" + b.zile + "). Cifrele arată doar că jurnalul se umple."
    : "Numărătoare simplă, nu o dovadă: notele vecine se mișcă împreună, deci testul se face pe blocuri de 5 zile, o singură dată.");
