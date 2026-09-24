// Unealta de mana: laboratorul de grid pe date Pionex REALE (de acasa). Nu intra in npm test.
//   node scripts/grid-laborator-real.mjs [--top=20] [--h=2]
import fs from "node:fs";
import { turaLaborator } from "./lib/tura-laborator.mjs";
const src = (f) => fs.readFileSync(new URL("../public/lib/" + f, import.meta.url), "utf8");
const M = new Function(`${src("grid-calcul.js")}\n${src("grid-proba.js")}\n${src("grid-clasament.js")}\n${src("grid-laborator.js")}; return { GridCalcul, GridProba, GridClasament, GridLaborator };`)();
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
async function cere(tip, simbol, end) {
  const cale = tip === "tickers" ? "/api/v1/market/tickers?type=PERP" : `/api/v1/market/klines?symbol=${simbol}&interval=15M&limit=500${end ? "&endTime=" + end : ""}`;
  const j = await (await fetch("https://api.pionex.com" + cale)).json();
  return j.result ? { data: j.data } : { error: j.message || "refuz" };
}
const r = await turaLaborator({ cere, jurnal: (...a) => console.log(a.join(" ")), pauza: (ms) => new Promise((x) => setTimeout(x, ms)), ...M, top: Number(opt.top || 20), H: Number(opt.h || 2), pauzaMs: 350 });
const P = M.GridCalcul.procent;
for (const q of r.intrebari) {
  const g = (x) => `n=${x.n} (indep. ${x.nEf}) pe plus ${P(x.pePlus)} IC ${x.ic ? P(x.ic[0]) + "-" + P(x.ic[1]) : "-"} mediana ${P(x.mediana)}`;
  console.log(`\n${q.verdict.toUpperCase()} · ${q.titlu}\n  ${q.eticheteA}: ${g(q.A)}\n  ${q.eticheteB}: ${g(q.B)}\n  alegere: ${P(q.alegere.A.pePlus)} vs ${P(q.alegere.B.pePlus)} · nevazut: ${P(q.nevazut.A.pePlus)} vs ${P(q.nevazut.B.pePlus)}`);
}
