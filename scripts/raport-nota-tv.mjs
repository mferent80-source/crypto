#!/usr/bin/env node
// Bilanțul jurnalului „nota TradingView + verdictul Radarului” ținut de colector (data/nota-tv.json; I-869 și I-875).
// Doar citește și numără: câte note cu direcție au fost judecate după 4 bare și câte au nimerit, pentru TradingView și pentru Radar
// (verdictul ARĂTAT de pagină, cel confirmat pe două bare; verdictul barei stă în jurnal alături, în rb4 / rbZ).
// Rulare: npm run raport:nota-tv            (jurnalul colectorului de pe mașina asta)
//         node scripts/raport-nota-tv.mjs <cale-către-nota-tv.json>
// Nu e o dovadă: regulile unei dovezi (zile, blocuri, prag) sunt în docs/cercetare/2026-11-13-tablou-acuratete.md. Sub 30 de zile cu note
// judecate cifrele sunt doar un semn că jurnalul se umple.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { raportNotaTv } from "./lib/tura-nota-tv.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fis = process.argv[2] || path.join(RAD, "data", "nota-tv.json");
let jurnal;
try { jurnal = JSON.parse(fs.readFileSync(fis, "utf8")); } catch (e) { console.log("Nu pot citi jurnalul (" + fis + "): " + e.message); process.exit(1); }
if (!Array.isArray(jurnal)) { console.log("Jurnalul nu e o listă: " + fis); process.exit(1); }
const r = raportNotaTv(jurnal), ZILE_MIN = 30;
const rand = (nume, x) => nume + ": " + (x.n ? x.k + " din " + x.n + " (" + (100 * x.k / x.n).toFixed(1).replace(".", ",") + "%)" : "nicio notă judecată");
console.log("Jurnalul notei TradingView: " + jurnal.length + " de intrări, " + r.zile + " zile cu note judecate");
console.log(rand("TradingView, 4 ore (după 4 bare)", r["4h"]));
console.log(rand("Radarul, 4 ore (verdictul arătat; același preț de după)", r.radar4h));
console.log(rand("TradingView, 1 zi (după 4 zile)", r["1D"]));
console.log(rand("Radarul, 1 zi (verdictul arătat; același preț de după)", r.radar1D));
console.log(r.zile < ZILE_MIN
  ? "E prea devreme pentru o concluzie: sub " + ZILE_MIN + " de zile cu note judecate (" + r.zile + "). Cifrele arată doar că jurnalul se umple."
  : "Numărătoare simplă, nu o dovadă: notele aceleiași zile se mișcă împreună, deci testul se face pe zile, după regulile din jurnalul de cercetare.");
