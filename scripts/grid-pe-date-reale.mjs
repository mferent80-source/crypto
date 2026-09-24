// Unealta de mana: GridProba.fisa pe lumanari Pionex REALE (de acasa). Nu intra in npm test.
//   node scripts/grid-pe-date-reale.mjs [MET BTC ...] [--suma=100] [--h=2]
import fs from "node:fs";
const SRC = ["../public/lib/grid-calcul.js", "../public/lib/grid-proba.js"].map((f) => fs.readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
const { GC, GP } = new Function(`${SRC}; return { GC: GridCalcul, GP: GridProba };`)();
const arg = process.argv.slice(2), opt = Object.fromEntries(arg.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const monede = arg.filter((a) => !a.startsWith("--")); if (!monede.length) monede.push("MET", "BTC", "ETH", "SOL");
const suma = Number(opt.suma || 100), H = Number(opt.h || 2), pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function cere(cale) { const r = await fetch("https://api.pionex.com" + cale); const j = await r.json(); if (!j.result) throw Error(cale + " -> " + (j.message || r.status)); return j.data; }
const simb = (await cere("/api/v1/common/symbols?type=PERP")).symbols;
for (const m of monede) {
  const s = m.toUpperCase() + "_USDT_PERP", info = simb.find((x) => x.symbol === s);
  if (!info) { console.log(`\n${s}: nu exista ca PERP`); continue; }
  let r15 = [], end = null;
  for (let p = 0; p < 6; p++) {
    const k = (await cere(`/api/v1/market/klines?symbol=${s}&interval=15M&limit=500${end ? "&endTime=" + end : ""}`)).klines;
    r15 = r15.concat(k); if (k.length < 500) break; end = Math.min(...k.map((x) => x.time)) - 1; await pauza(400);
  }
  const r4 = (await cere(`/api/v1/market/klines?symbol=${s}&interval=4H&limit=300`)).klines; await pauza(400);
  const r1 = (await cere(`/api/v1/market/klines?symbol=${s}&interval=1D&limit=200`)).klines; await pauza(400);
  const t0 = Date.now();
  const f = GP.fisa({ simbol: s, pret: GC.pretCurent(r15), b15: GC.bare(r15), b4h: GC.bare(r4), b1d: GC.bare(r1), suma, H, dir: null, levier: null, minNotional: Number(info.minNotional) });
  const ms = Date.now() - t0, P = GC.procent;
  console.log(`\n=== ${s} · pret ${f.pret} · ${r15.length} lumanari 15M · ${ms} ms`);
  if (f.eroare) { console.log("  EROARE:", f.eroare); continue; }
  const st = f.setare;
  console.log(`  directie: ${f.dir} (${f.directie.tarie}) - ${f.directie.motive.join("; ")}`);
  console.log(`  setare: jos ${st.jos.toPrecision(5)} · sus ${st.sus.toPrecision(5)} · ${st.grile} grile (pas ${P(st.pas)}, net ${P(st.profitGrila)}) · ${st.levier}x (sigur ${st.levierSigur}x)`);
  console.log(`  stop: ${st.stop.jos.toPrecision(5)} / ${st.stop.sus.toPrecision(5)} · lichidare: ${st.lichidare.jos && st.lichidare.jos.toPrecision(5)} / ${st.lichidare.sus && st.lichidare.sus.toPrecision(5)} · pe ordin ${st.perOrdin.toFixed(2)} USDT`);
  console.log(`  VERDICT: ${f.verdict.nivel} - ${f.verdict.motive.join(" | ") || "liniste + proba pe plus"}`);
  console.log(`  regim: 4h ${f.regim && f.regim.r4h.toFixed(2)}x · 24h ${f.regim && f.regim.r24h.toFixed(2)}x · pozitie 7z ${f.pozitie && f.pozitie.toFixed(2)}`);
  const L = f.liniste; console.log(`  liniste (24h): ${L ? (L.linisteAcum ? `de ${L.zileLiniste.toFixed(1)} zile · ${L.k}/${L.n} au mai tinut ${L.H} z` + (L.p != null ? ` = ${P(L.p)} IC ${P(L.ic[0])}-${P(L.ic[1])}` : "") + (L.suficient ? "" : " · PREA PUTINE") : "acum e MISCARE") : "—"} · perioade in 30 z: ${L ? L.perioade : "—"}`);
  const pr = f.proba;
  console.log(`  proba ${pr.zile.toFixed(1)} zile · ferestre ${pr.ferestre.antren}+${pr.ferestre.test} (~${pr.ferestre.independente} independente) · latimi ${pr.latimi.map(P).join(" ")} · pasi ${pr.pasi.map(P).join(" ")} · recomandata ${pr.recomandata}${f.contra ? " (CONTRAZICE fisa)" : ""}`);
  for (const d of ["long", "neutru", "short"]) { const x = pr.pe[d]; console.log(`   ${d.padEnd(7)} [lat ${x.wi} pas ${x.pi}] antren ${P(x.antren.mediana)} (cea mai proasta ${P(x.antren.ceaMaiProasta)}, lich ${x.antren.lichidari}, stop ${x.antren.opriri}/${x.antren.n}) · nevazut ${x.test ? P(x.test.mediana) : "—"}${x.faraVarianta ? " · NICIO varianta fara lichidare" : ""}`); }
}
