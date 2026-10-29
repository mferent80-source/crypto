// "Daca ascultai de Radar" (v83) pentru botii inchisi: pentru fiecare bot care nu are inca
// raspuns, reface fisa LA ORA PORNIRII (doar lumanari inchise inainte) si noteaza ce ar fi zis.
// Folosit de colector (o data pe ora) si de scripts/daca-ascultai-real.mjs.
// deps: { cereBoti() -> [boti bruti Pionex], cereKlines(simbol, interval, limit, endTime) -> [randuri],
//         gata: {id: true}, GridCalcul, GridProba, JurnalTrade, Contrafactual, jurnal, pauza, max (5) }
// audit 19.10: Pionex nu mai da lumanarile mai vechi de ~3,5 luni (MARKET_INVALID_TIME „endTime param error”; ONDO din 01.07 pica, 60 de zile
// merge) ⇒ botii porniti acum peste 95 de zile nu se mai cer: primesc „fara-date” cu motivul (scris in KV, deci nu mai sunt „de facut”),
// cel mult maxVechi pe tura, fara sa ocupe cele `max` locuri ale celor noi; eroarea endTime la ceilalti = tot „fara-date”, nu reincercare.
export const VECHI_MS = 95 * 86400000;
export const MOTIV_VECHI = "Pionex nu mai dă lumânările de atunci";
const eEndTime = (e) => /MARKET_INVALID_TIME|endTime param error/i.test(String(e && e.message || e));
const faraDate = (t) => ({ id: t.id, moneda: t.moneda, dir: t.dir, pornit: t.pornit, rezultat: t.rezultat, zice: { nivel: "fara-date", motive: [MOTIV_VECHI] } });
// v100.269 (ideile auditului 29.10): barele de 1 h dinaintea pornirii (~6 luni) - la H = 2 proba fișei se face pe ele (pe 15 minute avea 5 ferestre
// independente de test, sub cele 10 cerute: găleata PORNEȘTE era goală din construcție). Întâi discul colectorului (data/istoric-1h, d.citesteOre),
// dacă ajunge înapoi ~5 luni înainte de pornire; altfel Pionex 60M în urmă de la pornire (500 pe pagină, cel mult 9, cu pauza din cereKlines).
// Picat ⇒ [] (fișa rămâne pe 15 minute, botul NU devine „fara-date”). Barele de după pornire ies (doar cele închise înainte de ea).
export const ZILE_1H = 183, ZILE_1H_DESTUL = 150;
const ORA = 3600000, ZI = 86400000, tBara = (r) => Number(Array.isArray(r) ? r[0] : r && r.time);
async function ore1h(d, s, pornit) {
  try {
    const disc = d.citesteOre ? (d.citesteOre(s) || []).filter((r) => tBara(r) + ORA <= pornit) : [];
    if (disc.length && disc.reduce((m, r) => Math.min(m, tBara(r)), Infinity) <= pornit - ZILE_1H_DESTUL * ZI) return disc;
    let r1h = [], end = pornit - 1;
    for (let p = 0; p < 9; p++) {
      const k = await d.cereKlines(s, "60M", 500, end);
      r1h = r1h.concat(k);
      const t = k.map(tBara).filter(Number.isFinite);
      if (k.length < 500 || !t.length) break;
      const cea = Math.min(...t);
      if (cea <= pornit - ZILE_1H * ZI) break;
      end = cea - 1;
    }
    return r1h;
  } catch (e) { return []; }
}
export async function turaContrafactual(d) {
  const Q = 15 * 60000, lista = d.JurnalTrade.din(await d.cereBoti()), rez = [], acum = d.acum || Date.now();
  const vechi = (t) => Number(t.pornit) > 0 && acum - Number(t.pornit) > VECHI_MS;
  for (const t of lista.filter((x) => !d.gata[x.id] && vechi(x)).slice(0, d.maxVechi || 100)) rez.push(faraDate(t));
  // v100.40: cei mai NOI intai (arhiva are ~2.200 de boti; raspunsul conteaza intai pentru ce s-a inchis acum)
  const deFacut = lista.filter((t) => !d.gata[t.id] && !vechi(t)).sort((a, b) => (b.inchis || b.pornit || 0) - (a.inchis || a.pornit || 0)).slice(0, d.max || 5);
  for (const t of deFacut) {
    const s = d.simbol ? await d.simbol(t.moneda) : t.moneda + "_USDT_PERP";   // v100.40: tickerul real (LIGHTER -> LIT)
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
      const r1h = await ore1h(d, s, t.pornit);   // v100.269: proba la H = 2 pe ~6 luni de 1 h
      const f = d.GridProba.fisa({ simbol: s, pret: t.pretInit, b15: d.GridCalcul.bare(coada(r15, Q)), b4h: d.GridCalcul.bare(coada(r4, 4 * 3600000)), b1d: d.GridCalcul.bare(coada(r1, 86400000)), b1h: r1h.length ? d.GridCalcul.bare(coada(r1h, ORA)) : null, suma: t.investit || 100, H: 2, dir: null, levier: null, minNotional: null, faraMc: true });   // v100.259: rejocul fără Monte Carlo (30–80 ms pe caz)
      const z = d.Contrafactual.zice(f && !f.eroare ? f : null, t);
      rez.push({ id: t.id, moneda: t.moneda, dir: t.dir, pornit: t.pornit, rezultat: t.rezultat, zice: z });
    } catch (e) {
      if (eEndTime(e)) { rez.push(faraDate(t)); continue; }   // audit 19.10: lumanarile de atunci nu mai exista la Pionex - nu se reincearca
      d.jurnal("contrafactual", t.moneda, s, e.message); if (d.esuat) d.esuat(t.id);
    }
  }
  if (rez.length) d.jurnal("contrafactual:", rez.map((x) => x.moneda + "=" + x.zice.nivel).join(" "));
  return rez;
}
