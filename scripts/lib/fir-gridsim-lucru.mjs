// v100.356 (I-892): firul de calcul al turei Monte Carlo / „Ce fac cu botul ăsta?” - ACELAȘI motor ca în colector (GridSim din pagină), construit
// la fel (text-ro → grid-calcul → grid-proba → monte-simbol + ecranul lui → grid-sim). Primește { id, fn, args } și întoarce { id, r } sau
// { id, eroare } - o excepție a motorului se aruncă din nou în colector, cu același mesaj (ca pe loc). Doar funcțiile din VOIE.
import { parentPort, workerData } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import { gridSimDinPagina } from "./tura-monte-carlo-bot.mjs";
import { mcsDinPagina } from "./tura-variante-noapte.mjs";

const RAD = workerData && workerData.RAD, src = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
new Function(src("text-ro.js") + "; return TextRo;")();   // globalThis.TextRo, ca incarca("text-ro.js") din colector
const GridCalcul = new Function(src("grid-calcul.js") + "; return GridCalcul;")();
const GridProba = new Function("GridCalcul", src("grid-proba.js") + "; return GridProba;")(GridCalcul);
const Mcs = mcsDinPagina(src("monte-simbol.js"), src("monte-simbol-ecran.js"), GridCalcul, GridProba);
const GridSim = gridSimDinPagina(src("grid-sim.js"), GridCalcul, GridProba, Mcs.MonteSimbol);
const VOIE = new Set(["simuleaza", "hotarare"]);

parentPort.on("message", (m) => {
  if (!m || !VOIE.has(m.fn) || !Array.isArray(m.args)) { parentPort.postMessage({ id: m && m.id, eroare: "funcție necunoscută pe fir: " + (m && m.fn), aruncat: false }); return; }
  let r;
  try { r = GridSim[m.fn](...m.args); } catch (e) { parentPort.postMessage({ id: m.id, eroare: String(e && e.message || e), aruncat: true }); return; }
  parentPort.postMessage({ id: m.id, r });
});
parentPort.postMessage({ gata: true, vers: GridSim.VERS_HOT });
