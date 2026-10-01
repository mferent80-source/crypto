// v101.27 (pachetul 2a, 01.10): PROBABILITATILE din istoric pentru botii care ruleaza - o data pe ora pe bot: pagina noua de bare de
// 1 h (aduOre, incremental), Probabilitati.pentruBot cu preturile botului si ale planului -> KV prob:<bot>; la 4 h intrarile in
// jurnalul de pe disc (data/prob-jurnal.json); ce si-a incheiat orizontul se judeca din bare -> calibrarea -> KV calibrare.
// Probat in scripts/proba-v10046.mjs.
import { aduOre } from "./tura-profil.mjs";
const ORA = 3600000, PASTRARE = 90 * 24 * ORA, NOTARE = 4 * ORA;
const nr = (v) => { const x = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(x) ? null : x; };
export async function turaProbabilitati(d) {
  const st = d.stare; st.la = st.la || {}; st.notat = st.notat || {}; st.jurnal = Array.isArray(st.jurnal) ? st.jurnal : [];
  let facute = 0;
  for (const b of d.boti || []) {
    if (!b || !b.id || d.acum - (st.la[b.id] || 0) < ORA) continue;
    try {
      const simbol = d.simbolDe(b); if (!simbol) continue;
      if (facute++) await d.pauza(1600);
      const randuri = await aduOre(simbol, d.citesteBare(simbol), d); d.scrieBare(simbol, randuri);
      const bare = d.GridCalcul.bare(randuri), plan = await d.planDe(b.id), dir = String(b.directie || "").toLowerCase();
      const tinta = plan && nr(plan.plus) > 0 ? d.TabloExtra.pretTintaPentru(b, nr(plan.plus)) : null;
      const stop = b.opritorPierdereActiv && nr(b.opritorPierdere) > 0 ? nr(b.opritorPierdere) : plan && nr(plan.minus) > 0 ? d.TabloExtra.pretOpritorPentru(b, -nr(plan.minus)) : null;
      const rez = d.Probabilitati.pentruBot(bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus), lichidare: dir === "short" ? nr(b.lichidareSus) : nr(b.lichidareJos), tinta, stop });
      await d.trimite("/api/istoric-bot?action=prob", { bot: b.id, rez: rez || { la: d.acum, gol: "puțin istoric de 1 h pe moneda asta" } });
      st.la[b.id] = d.acum;
      if (rez && d.acum - (st.notat[b.id] || 0) >= NOTARE) { st.jurnal.push(...d.Probabilitati.intrari(rez, { t: d.acum, bot: b.id, simbol })); st.notat[b.id] = d.acum; }
    } catch (e) { d.jurnal("probabilitati ESEC", b.id, e.message); }
  }
  // judecata: ce si-a incheiat orizontul, din barele de pe disc (fara bare complete -> ramane nejudecat)
  const peSimbol = {};
  for (const e of st.jurnal) {
    if (e.r === 0 || e.r === 1 || d.acum < e.t + e.H * ORA) continue;
    const bare = peSimbol[e.simbol] || (peSimbol[e.simbol] = d.GridCalcul.bare(d.citesteBare(e.simbol)));
    const r = d.Probabilitati.judeca(e, bare); if (r === 0 || r === 1) e.r = r;
  }
  st.jurnal = st.jurnal.filter((e) => d.acum - e.t < PASTRARE);
  d.scrieStare(st);
  if (facute) await d.trimite("/api/istoric-bot?action=calibrare", { la: d.acum, cal: d.Probabilitati.calibreaza(st.jurnal) });
}
