// "Daca ascultai de Radar" (v83) pentru botii inchisi: pentru fiecare bot care nu are inca
// raspuns, reface fisa LA ORA PORNIRII (doar lumanari inchise inainte) si noteaza ce ar fi zis.
// Folosit de colector (o data pe ora) si de scripts/daca-ascultai-real.mjs.
// deps: { cereBoti() -> [boti bruti Pionex], cereKlines(simbol, interval, limit, endTime) -> [randuri],
//         gata: {id: true}, GridCalcul, GridProba, JurnalTrade, Contrafactual, jurnal, pauza, max (5) }
export async function turaContrafactual(d) {
  const Q = 15 * 60000, lista = d.JurnalTrade.din(await d.cereBoti()), rez = [];
  const deFacut = lista.filter((t) => !d.gata[t.id]).slice(0, d.max || 5);
  for (const t of deFacut) {
    const s = t.moneda + "_USDT_PERP";
    try {
      let r15 = [], end = t.pornit - 1;
      for (let p = 0; p < 6; p++) {
        const k = await d.cereKlines(s, "15M", 500, end);
        r15 = r15.concat(k);
        if (k.length < 500) break;
        end = Math.min(...k.map((x) => Number(x.time))) - 1;
      }
      const r4 = await d.cereKlines(s, "4H", 300, t.pornit - 1), r1 = await d.cereKlines(s, "1D", 200, t.pornit - 1);
      // barele in formare la pornire ies (taie); bare() scoate apoi ultima bara, deci pun una falsa la coada
      const coada = (a, pas) => d.Contrafactual.taie(a, t.pornit, pas).concat([{ time: t.pornit + 1, open: "1", high: "1", low: "1", close: "1" }]);
      const f = d.GridProba.fisa({ simbol: s, pret: t.pretInit, b15: d.GridCalcul.bare(coada(r15, Q)), b4h: d.GridCalcul.bare(coada(r4, 4 * 3600000)), b1d: d.GridCalcul.bare(coada(r1, 86400000)), suma: t.investit || 100, H: 2, dir: null, levier: null, minNotional: null });
      const z = d.Contrafactual.zice(f && !f.eroare ? f : null, t);
      rez.push({ id: t.id, moneda: t.moneda, dir: t.dir, pornit: t.pornit, rezultat: t.rezultat, zice: z });
    } catch (e) { d.jurnal("contrafactual", t.moneda, e.message); }
  }
  if (rez.length) d.jurnal("contrafactual:", rez.map((x) => x.moneda + "=" + x.zice.nivel).join(" "));
  return rez;
}
