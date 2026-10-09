// I-579 (10.10.2026): VALIDAREA „Monte Carlo pe regimul Busolei”, pe date reale - în AFARA npm test (are nevoie de serverul 8788 și de
// jurnalul de stări al Busolei de pe același PC). Scrie verdictul în data/mc-regim-verdict.json; colectorul îl citește ca POARTĂ:
// doar cu `trece: true` Tabloul arată „în regimul de acum: …”. Până atunci regimul se socotește în umbră (KV, nevalidat).
//
// Metoda (walk-forward, cinstit): pe monedele boților deschiși, la fiecare 12 ore din istoricul de 15 min (≥ 14 zile înainte, 7 zile după):
//   · baza: GridSim.simuleaza pe barele de până la tăietură (ca în Tablou) ⇒ P(net > 0 la 7 zile);
//   · regim: aceeași simulare, dar drumurile doar din ferestrele cu starea Busolei de la tăietură (ferestreRegim, jurnal-stari);
//   · realizat: GridProba pe barele REALE din cele 7 zile de după ⇒ net > 0 sau nu;
//   · scorul Brier pe fiecare metodă; „trece” = ≥ 30 de tăieturi cu regim și Brier-ul regimului mai mic decât al bazei.
// Sub 30 de tăieturi ⇒ „prea puține” (trece: false, motivul scris). Nimic optimist: aceeași setare, aceleași bare, fără privire înainte.
//
//   node scripts/proba-mc-regim.mjs [adresa 8788]
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ferestreRegim } from "./lib/tura-monte-carlo-bot.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/+$/, "");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const lib = new Function(`${citeste("public", "lib", "text-ro.js")}; ${citeste("public", "lib", "grid-calcul.js")}; ${citeste("public", "lib", "grid-proba.js")}; ${citeste("public", "lib", "monte-simbol.js")}; ${citeste("public", "lib", "grid-sim.js")}; return { GridSim, GridCalcul, GridProba };`)();
const { GridSim, GridCalcul, GridProba } = lib;
const JURNAL = process.env.BUSOLA_JURNAL_STARI || "C:/Users/Cimin/busola/cron/stare/jurnal-stari.json";
const H = 3600000, ZI = 24 * H, BZ = 96;

// jetonul serverului, ca în colector (.dev.vars: APP_API_TOKEN)
const TOKEN = (() => { try { const linie = fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN")); return linie ? linie.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "") : ""; } catch { return ""; } })();
async function json(u) { const r = await fetch(URL + u, { headers: { authorization: "Bearer " + TOKEN, accept: "application/json", "x-radar-client": "proba-mc-regim" }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error("HTTP " + r.status + " " + u); return r.json(); }
async function bare15(simbol) {
  // paginile de 500 cu endTime, ca lumanari15M din colector - ~31 de zile
  let end = null, tot = [];
  for (let p = 0; p < 7; p++) {
    const r = await json("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=15M&limit=500" + (end ? "&endTime=" + end : ""));
    const l = r && r.data && Array.isArray(r.data.klines) ? r.data.klines : []; if (!l.length) break;
    tot = tot.concat(l); const minT = Math.min(...l.map((x) => Number(x.time))); if (!(minT > 0)) break; end = minT - 1;
    if (l.length < 500) break;
  }
  return GridCalcul.bare(tot);
}
const cheieBusola = (s) => String(s).toUpperCase().replace(/_USDT_PERP$|_USDT$|USDT$/, "").replace(/^1000+/, "");

(async () => {
  let stari = []; try { stari = JSON.parse(fs.readFileSync(JURNAL, "utf8")); } catch { stari = []; }
  let boti = []; try { boti = (JSON.parse(fs.readFileSync(path.join(RAD, "data", "pentru-busola.json"), "utf8")).boti || []).filter((b) => b.inchis === null); } catch { boti = []; }
  const simboluri = [...new Set(boti.map((b) => b.simbol + "_USDT_PERP"))];
  console.log(`\nMonte Carlo pe regim · validare pe date reale · ${simboluri.length} monede (boții deschiși) · ${stari.length} rulări ale Busolei în jurnal\n`);
  const taieturi = [];
  for (const s of simboluri) {
    let b; try { b = await bare15(s); } catch (e) { console.log(`  ${s}: fără bare (${e.message})`); continue; }
    if (b.length < 21 * BZ) { console.log(`  ${s}: doar ${Math.floor(b.length / BZ)} zile de bare (trebuie 21)`); continue; }
    const cheie = cheieBusola(s), st = { suma: 100, dir: "long", linii: 10, geo: false, jos: 0, sus: 0, levier: 3 };
    for (let cut = 14 * BZ; cut + 7 * BZ <= b.length; cut += 48) {
      const inainte = b.slice(0, cut), dupa = b.slice(cut, cut + 7 * BZ), p0 = inainte[inainte.length - 1].c, t0 = inainte[inainte.length - 1].t;
      const set = Object.assign({}, st, { jos: p0 * 0.92, sus: p0 * 1.08 });   // gridul lui obișnuit: ±8% în jurul prețului, 10 linii, long ×3
      const stare = (() => { let x = null; for (const r of stari) if (r.la <= t0) x = r; return x && x.monede ? x.monede[cheie] : null; })();
      if (!stare || stare === "nemasurat") continue;
      const fer = ferestreRegim(stari, cheie, stare, t0), starturi = GridSim.starturiRegim(inainte, fer, BZ);
      const baza = GridSim.simuleaza(inainte, set, { n: 300, seed: 7, orizonturi: [7], zile: 14 }), reg = GridSim.simuleaza(inainte, set, { n: 300, seed: 7, orizonturi: [7], zile: 14, starturi });
      if (baza.eroare || reg.eroare) continue;
      const pr = (r) => { const c = r.col && r.col[0] ? r.col[0] : r.orizonturi && r.orizonturi[0]; const net = c && c.net; return Array.isArray(net) && net.length ? net.filter((x) => x > 0).length / net.length : null; };
      const pB = pr(baza), pR = pr(reg); if (pB === null || pR === null) continue;
      const real = GridProba.simuleaza(dupa, 0, dupa.length, set, {}), y = real && real.net > 0 ? 1 : 0;
      taieturi.push({ s, t0, stare, zileRegim: Math.floor(starturi.length / BZ), pB, pR, y });
    }
    console.log(`  ${s}: ${taieturi.filter((x) => x.s === s).length} tăieturi`);
  }
  const n = taieturi.length, brier = (k) => taieturi.reduce((a, x) => a + (x[k] - x.y) ** 2, 0) / Math.max(1, n);
  const bB = brier("pB"), bR = brier("pR"), trece = n >= 30 && bR < bB;
  const verdict = { la: Date.now(), n, brierBaza: +bB.toFixed(4), brierRegim: +bR.toFixed(4), trece, motiv: n < 30 ? `prea puține tăieturi (${n}, trebuie 30): jurnalul de stări al Busolei e prea scurt încă` : trece ? "Brier-ul regimului e mai mic decât al bazei" : "regimul nu bate baza (Brier)", monede: simboluri.length, rulariBusola: stari.length };
  fs.mkdirSync(path.join(RAD, "data"), { recursive: true });
  fs.writeFileSync(path.join(RAD, "data", "mc-regim-verdict.json"), JSON.stringify(verdict, null, 2));
  console.log(`\nverdict: ${trece ? "TRECE" : "NU TRECE"} · n=${n} · Brier baza ${bB.toFixed(4)} · regim ${bR.toFixed(4)} · ${verdict.motiv}\nscris în data/mc-regim-verdict.json`);
})().catch((e) => { console.error("validarea n-a mers:", e.message); process.exit(1); });
