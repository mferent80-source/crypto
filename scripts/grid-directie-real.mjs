// Unealta de mana (27.09, intrebarea lui: "daca miscarea e CU botul, de ce ma sfatuieste sa ies?"): pe date Pionex REALE
// (15M, ~31 de zile, top N PERP dupa volum), griduri LONG si SHORT pornite dupa o miscare IN SENSUL lor, dupa una CONTRA
// si in liniste; castigul net pe urmatoarele H zile (GridProba.simuleaza, aceleasi setari ca laboratorul).
// Metoda ca in GridLaborator: pragurile din primele 2/3, comparatie separata pe 2/3 si pe ultima treime, ferestre
// independente = n / 8 pentru intervalele Wilson. Nu intra in npm test.
//   node scripts/grid-directie-real.mjs [--top=40] [--h=2]
import fs from "node:fs";
const src = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const M = new Function(`${src("grid-calcul.js")}\n${src("grid-proba.js")}\n${src("grid-clasament.js")}\n${src("grid-laborator.js")}; return { GridCalcul, GridProba, GridClasament, GridLaborator };`)();
const G = M.GridCalcul, P = M.GridProba, C = G.C;
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const TOP = Number(opt.top || 40), H = Number(opt.h || 2);
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function pionex(cale) { const j = await (await fetch("https://api.pionex.com" + cale)).json(); if (!j.result) throw new Error(j.message || "refuz"); return j.data; }

// ferestrele unei monede: pentru fiecare pornire (la 6 h), miscarea stiuta la pornire CU SEMN si gridul long / short
function ferestre(b) {
  const W = H * C.BARE_ZI, n = b.length, out = [];
  if (n < 2 * W + 7 * C.BARE_ZI) return out;
  const nA = Math.round(n * 2 / 3), A = b.slice(0, nA), lats = G.latimi(A, H), pasV = G.pasi(A);
  if (lats.length < 3 || !pasV) return out;
  const lat = G.percentila(lats, 0.75), pas = pasV[1];
  const m4 = [], m24 = [], l4 = [], l24 = [];
  for (let i = 0; i < n; i++) {
    m4[i] = i >= 16 ? (b[i].c - b[i - 16].c) / b[i - 16].c : null;
    m24[i] = i >= C.BARE_ZI ? (b[i].c - b[i - C.BARE_ZI].c) / b[i - C.BARE_ZI].c : null;
    if (i < nA) { if (m4[i] !== null) l4.push(Math.abs(m4[i])); if (m24[i] !== null) l24.push(Math.abs(m24[i])); }
  }
  const o4 = G.percentila(l4, 0.75), o24 = G.percentila(l24, 0.75);
  for (let s = 7 * C.BARE_ZI; s + W <= n; s += C.PAS_FERESTRE) {
    const parte = s + W <= nA ? "a" : s >= nA ? "t" : null; if (!parte) continue;
    const u = s - 1, t4 = m4[u] !== null && Math.abs(m4[u]) > C.PRAG_MISCARE * o4, t24 = m24[u] !== null && Math.abs(m24[u]) > C.PRAG_MISCARE * o24;
    // sensul miscarii: al celei care a trecut pragul (24 h are intaietate)
    const sens = t24 ? Math.sign(m24[u]) : t4 ? Math.sign(m4[u]) : 0;
    let mx = -Infinity, mn = Infinity; for (let i = s - 7 * C.BARE_ZI; i < s; i++) { if (b[i].h > mx) mx = b[i].h; if (b[i].l < mn) mn = b[i].l; }
    const poz = mx > mn ? (b[u].c - mn) / (mx - mn) : 0.5;
    for (const dir of ["long", "short"]) {
      const st = G.construieste({ pret: b[s].o, lat, pas, dir });
      const cu = sens !== 0 && (dir === "long" ? sens > 0 : sens < 0), contra = sens !== 0 && !cu;
      // "obosit": miscarea cu botul a dus pretul la marginea range-ului pe 7 zile (sus la long, jos la short)
      const laMargine = dir === "long" ? poz > 0.9 : poz < 0.1;
      out.push({ parte, dir, net: P.simuleaza(b, s, W, st).net, stare: cu ? "cu" : contra ? "contra" : "liniste", laMargine });
    }
  }
  return out;
}

const tk = await pionex("/api/v1/market/tickers?type=PERP");
const lista = M.GridClasament.topDupaVolum(tk.tickers, TOP);
let rows = [], monede = 0;
for (const m of lista) {
  try {
    let r15 = [], end = null;
    for (let p = 0; p < 6; p++) {
      const d = await pionex(`/api/v1/market/klines?symbol=${m.simbol}&interval=15M&limit=500${end ? "&endTime=" + end : ""}`);
      const r = d.klines || []; r15 = r15.concat(r);
      const t = r.map((x) => Number(x.time)).filter(Number.isFinite); if (r.length < 500 || !t.length) break;
      end = Math.min(...t) - 1; await pauza(300);
    }
    const f = ferestre(G.bare(r15)); if (f.length) { rows = rows.concat(f); monede++; }
  } catch (e) { console.error(m.simbol, e.message); }
  await pauza(300);
}
const pc = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const grupa = (x) => { const net = x.map((r) => r.net), plus = x.filter((r) => r.net > 0).length, nEf = Math.floor(x.length * C.PAS_FERESTRE / (H * C.BARE_ZI)), p = x.length ? plus / x.length : null;
  return { n: x.length, nEf, p, med: G.mediana(net), ic: p === null ? null : G.wilson(Math.round(p * nEf), nEf) }; };
const arata = (et, x) => { const g = grupa(x), a = grupa(x.filter((r) => r.parte === "a")), t = grupa(x.filter((r) => r.parte === "t"));
  console.log(`  ${et.padEnd(34)} n=${String(g.n).padStart(5)} (indep. ${String(g.nEf).padStart(4)})  pe plus ${pc(g.p).padStart(6)}  IC ${g.ic ? pc(g.ic[0]) + "–" + pc(g.ic[1]) : "—"}  mediana ${pc(g.med)}  · 2/3: ${pc(a.p)}  ultima 1/3: ${pc(t.p)}`);
  return g; };
console.log(`\n${monede} monede, ${rows.length} ferestre (long + short), grid pe ${H} zile\n`);
for (const dir of ["long", "short", "amandoua"]) {
  const r = dir === "amandoua" ? rows : rows.filter((x) => x.dir === dir);
  console.log(dir.toUpperCase());
  arata("după mișcare CU botul", r.filter((x) => x.stare === "cu"));
  arata("  · cu botul, la marginea range-ului", r.filter((x) => x.stare === "cu" && x.laMargine));
  arata("  · cu botul, încă în interior", r.filter((x) => x.stare === "cu" && !x.laMargine));
  arata("după mișcare CONTRA botului", r.filter((x) => x.stare === "contra"));
  arata("în liniște", r.filter((x) => x.stare === "liniste"));
}
