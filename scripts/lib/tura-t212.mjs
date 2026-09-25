// Istoricul COMPLET al ordinelor Trading 212 (v85), strans de colector in KV-ul de acasa.
// T212 da istoricul in pagini de 50, cele mai noi primele, si lasa 6 cereri pe minut => o pagina la ~11 s.
// Prima data: coboara pagina cu pagina pana la capat, cate `max` pagini pe tura, si tine minte unde a
// ramas (stare.cursorVechi) ca sa continue la tura urmatoare. Dupa aceea: citeste doar capul (ordinele
// noi) pana da de o pagina deja stiuta. Ordinele se deduplica pe id in ruta, deci o pagina citita de doua
// ori nu strica nimic.
// deps: { cereStare() -> {complet, cursorVechi}, cerePagina(cursor|null) -> {items, cursor},
//         salveaza({ordine:[id], umpleri:[...], stare|null}) -> {noi}, umpleri(items) -> [...],
//         pauza(ms), jurnal, max (12), pasMs (11000) }
export async function turaT212(d) {
  const max = d.max || 12, pas = d.pasMs == null ? 11000 : d.pasMs;
  const st = Object.assign({ complet: false, cursorVechi: null }, await d.cereStare());
  let pagini = 0, noi = 0;
  async function pagina(cursor, stare) {
    if (pagini > 0) await d.pauza(pas);
    const p = await d.cerePagina(cursor); pagini++;
    const items = Array.isArray(p && p.items) ? p.items : [];
    const ordine = items.map((x) => x && x.order && x.order.id).filter((id) => id !== null && id !== undefined).map(String);
    const next = p && p.cursor ? String(p.cursor) : null;
    const r = await d.salveaza({ ordine, umpleri: d.umpleri(items), stare: stare ? stare(next) : null });
    noi += (r && r.noi) || 0;
    return { next, noi: (r && r.noi) || 0 };
  }
  const primaData = !st.complet && !st.cursorVechi;
  // 1) capul istoricului (la prima data, capul E coborarea)
  let cur = null;
  while (pagini < max) {
    const p = await pagina(cur, primaData ? (next) => ({ cursorVechi: next, complet: !next }) : null);
    if (primaData) { st.cursorVechi = p.next; st.complet = !p.next; }
    if (!p.next || (!primaData && p.noi === 0)) break;
    cur = p.next;
  }
  // 2) coborarea ramasa de la turele trecute
  if (!primaData && !st.complet && st.cursorVechi) {
    cur = st.cursorVechi;
    while (pagini < max) {
      const p = await pagina(cur, (next) => ({ cursorVechi: next, complet: !next }));
      st.cursorVechi = p.next; st.complet = !p.next;
      if (!p.next) break;
      cur = p.next;
    }
  }
  if (noi || !st.complet) d.jurnal("t212: " + pagini + " pagini, " + noi + " ordine noi" + (st.complet ? "" : " · istoricul inca se coboara"));
  return { pagini, noi, complet: st.complet };
}

// Alertele planurilor pe pozitiile T212 (v85): pentru fiecare pozitie deschisa cu plan scris de el, pretul
// de acum fata de stop / tinta / "-X% de la maximul de dupa cumparare". O alerta o data pe cheie (pe zi).
// deps: { cerePozitii() -> [pozitie T212], cerePlan(ticker) -> plan|null, cereBare(ticker) -> [bare zilnice],
//         trimite(mesaj, cheie) -> true daca a ajuns, stare: {cheie: true}, ActiuniSemnale, T212, jurnal, acum }
export async function turaPlanuri(d) {
  const poz = (await d.cerePozitii()) || [];
  let trimise = 0;
  for (const x of poz) {
    try {
      if (!x || !(x.quantity > 0)) continue;
      const plan = await d.cerePlan(x.ticker);
      if (!plan) continue;
      const bare = (await d.cereBare(x.ticker)) || [], de = Date.parse(x.initialFillDate || "");
      let mx = null;
      if (Number.isFinite(de)) for (const b of bare) if (b.t + 86400000 > de) mx = mx === null ? b.h : Math.max(mx, b.h);
      if (mx !== null && x.currentPrice > mx) mx = x.currentPrice;
      const p = { ticker: x.ticker, simbol: d.T212.simbol(x.ticker), qty: x.quantity, pretMediu: x.averagePrice, pret: x.currentPrice, plan, maxDupaCumparare: mx };
      for (const a of d.ActiuniSemnale.alertePlan(p, d.acum || Date.now())) {
        if (d.stare[a.cheie]) continue;
        if (await d.trimite({ nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj }, a.cheie)) { d.stare[a.cheie] = true; trimise++; }
      }
    } catch (e) { d.jurnal("plan t212", x && x.ticker, e.message); }
  }
  return { trimise };
}
