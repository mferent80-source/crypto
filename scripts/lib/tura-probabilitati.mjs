// v101.27 (pachetul 2a, 01.10): PROBABILITATILE din istoric pentru botii care ruleaza - o data pe ora pe bot: pagina noua de bare de
// 1 h (aduOre, incremental), Probabilitati.pentruBot cu preturile botului si ale planului -> KV prob:<bot>; la 4 h intrarile in
// jurnalul de pe disc (data/prob-jurnal.json); ce si-a incheiat orizontul se judeca din bare -> calibrarea -> KV calibrare.
// Probat in scripts/proba-v10046.mjs.
import { aduOre } from "./tura-profil.mjs";
// v100.76 (revizia ideilor): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const ORA = 3600000, PASTRARE = 90 * 24 * ORA, NOTARE = 4 * ORA;
const nr = (v) => { const x = Number(v); return v === null || v === undefined || v === "" || !Number.isFinite(x) ? null : x; };
export async function turaProbabilitati(d) {
  const st = d.stare; st.la = st.la || {}; st.notat = st.notat || {}; st.jurnal = Array.isArray(st.jurnal) ? st.jurnal : [];
  let facute = 0, schimbat = false;
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
      // v101.28 (I-471): indicatorii aprinsi acum, cu dovada din trecutul monedei (Bonferroni)
      if (rez && d.Dovada) { try { rez.indicatori = d.Dovada.peBot(bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus) }); } catch (e) { d.jurnal("dovada ESEC", b.id, e.message); } }
      // v101.56 (rețeaua neuronală, livrarea 1): a doua părere 🧠 - aceleași bare și aceleași niveluri ca 🎲; nimic fără modele
      if (rez && d.Retea && d.modele) {
        try {
          const rt = d.Retea.pentruBot(d.modele, bare, { acum: d.acum, pret: nr(b.pretCurent), dir, jos: nr(b.gridJos), sus: nr(b.gridSus), lichidare: dir === "short" ? nr(b.lichidareSus) : nr(b.lichidareJos), tinta, stop }, d.btc || null);
          if (rt) { const pz = d.pornireDe ? d.pornireDe(b, bare) : null; if (pz) rt.pornire = pz; rez.retea = rt; if (d.noteazaRetea) d.noteazaRetea(b, rt); }
        } catch (e) { d.jurnal("retea ESEC", b.id, e.message); }
      }
      await d.trimite("/api/istoric-bot?action=prob", { bot: b.id, rez: rez || { la: d.acum, gol: bare.length < 37 * 24 ? "moneda are doar " + cate(Math.floor(bare.length / 24), "zi", "zile") + " de bare de 1 h; cifrele apar de la 37 de zile" : "lipsește prețul botului sau starea pieței" } });
      st.la[b.id] = d.acum; schimbat = true;
      if (rez && d.acum - (st.notat[b.id] || 0) >= NOTARE) { st.jurnal.push(...d.Probabilitati.intrari(rez, { t: d.acum, bot: b.id, simbol })); st.notat[b.id] = d.acum; }
    } catch (e) { d.jurnal("probabilitati ESEC", b.id, e.message); }
  }
  // judecata: ce si-a incheiat orizontul, din barele de pe disc (fara bare complete -> ramane nejudecat)
  const peSimbol = {};
  for (const e of st.jurnal) {
    if (e.r === 0 || e.r === 1 || d.acum < e.t + e.H * ORA) continue;
    const bare = peSimbol[e.simbol] || (peSimbol[e.simbol] = d.GridCalcul.bare(d.citesteBare(e.simbol)));
    const r = d.Probabilitati.judeca(e, bare); if (r === 0 || r === 1) { e.r = r; schimbat = true; }
  }
  const inainte = st.jurnal.length;
  st.jurnal = st.jurnal.filter((e) => d.acum - e.t < PASTRARE);
  // revizia 01.10: jurnalul (pana la ~1 MB pe bot) se rescrie doar cand s-a schimbat ceva, nu la fiecare 5 minute
  if (schimbat || st.jurnal.length !== inainte) d.scrieStare(st);
  if (facute) await d.trimite("/api/istoric-bot?action=calibrare", { la: d.acum, cal: d.Probabilitati.calibreaza(st.jurnal) });
}
