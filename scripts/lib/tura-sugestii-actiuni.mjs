// Sugestiile de ACȚIUNI pentru pagina „Sugestii” (v101.81; el 06.10: „o pagină de sugestii cu tot: boți, EU, US” + „early = toate trei”).
// (tura-sugestii.mjs e altceva: monedele pe revenire / short, v100.85.)
// sugestiiDimineata - după tura ideilor de la 8:00: listele zilei (început de urcare, revers timpuriu) pe US (barele aduse deja pentru idei)
//   și EU (aduse aici), istoricul fiecărei reguli pe 2 ani (SugestiiActiuni.dovada), baza pentru intraday (volumul mediu, închiderea de ieri)
//   și urmărirea înainte (fiecare listă a zilei, judecată după 14 zile la prețul de acum, −0,3%).
// sugestiiIntraday - pre-market US (~16:00 RO) / gap la deschidere EU (~10:20 RO), pe baza de dimineață.
const ZI = 86400000, URM_ZILE = 14, URM_COST = 0.003, PASTRARE = 120;
// numărătorile din jurnal - „1 acțiune”, „25 de acțiuni” (TextRo.cate; rezerva știe aceeași regulă, ca tura-laborator)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export const simbolTicker = (tk) => String(tk || "").replace(/_.*$/, "").replace(/[dpalsm]$/, "");

export async function sugestiiDimineata(d) {
  const SA = d.SA, acum = d.acum || Date.now(), zi = new Date(acum).toISOString().slice(0, 10), ultim = {}, baza = {};
  async function piata(p, tickere, bareDe, sesiuneOre) {
    // EU are și „Pe revenire” (regula existentă Reveniri.actiune) - US o are deja din tura ideilor
    const cuRevine = p === "eu" && !!d.Reveniri, serieRev = [], revine = [];
    const serii = { urcare: [], revers: [], gap: [] }, liste = { urcare: [], revers: [] }; let judecate = 0, fara = 0;
    for (const tk of tickere) {
      let b = null; try { b = await bareDe(tk); } catch { b = null; }
      if (p === "eu" && d.pauza) await d.pauza(d.pauzaMs || 1000);   // revizia (M8/M9): pauza și după eșec, ca tura ideilor (1 s)
      if (!Array.isArray(b) || b.length < 31) { fara++; continue; }
      judecate++; ultim[tk] = b[b.length - 1].c;
      for (const k of ["urcare", "revers"]) serii[k].push({ ticker: tk, puncte: SA.puncte(b, k) });
      serii.gap.push({ ticker: tk, puncte: SA.puncte(b, "gap", p === "eu" ? { intrare: "inchidere" } : null) });   // revizia (I6)
      for (const k of ["urcare", "revers"]) { const a = SA.azi(b, k, acum, { sesiuneOre }); if (a) liste[k].push({ ticker: tk, simbol: simbolTicker(tk), ...a }); }
      const vm = SA.volumMediu(b, acum, { sesiuneOre }); if (vm) baza[tk] = vm;
      // regula veche (Reveniri) n-are igiena: seria cu un salt de unitate iese de tot
      // revizia (M5): fără bara EU încă în lucru (dimineața târzie) - ca azi() la regulile noi
      const bInch = acum - b[b.length - 1].t < sesiuneOre * 3600000 ? b.slice(0, -1) : b;
      if (cuRevine && !SA.areSalt(b, 1, b.length - 1)) { try { const rv = d.Reveniri.actiunePeRevenire(bInch); if (rv && rv.revine) revine.push({ ticker: tk, simbol: simbolTicker(tk), ...rv }); serieRev.push(d.Reveniri.puncte(bInch, { r: d.Reveniri.REGULI.actiune })); } catch {} }
    }
    liste.urcare.sort((a, b) => b.volX - a.volX); liste.revers.sort((a, b) => b.cadere - a.cadere);
    const dovada = {};
    for (const k of ["urcare", "revers", "gap"]) { const dv = SA.dovada(serii[k], { reps: d.reps || 2000 }); dovada[k] = { ...dv, text: SA.textDovada(dv, k) }; }
    if (d.jurnal) d.jurnal("sugestii " + p + ": " + cate(judecate, "acțiune judecată", "acțiuni judecate") + ", fără prețuri: " + fara + " · început de urcare: " + liste.urcare.length + " · revers timpuriu: " + liste.revers.length);
    const rez = { judecate, fara, urcare: liste.urcare.slice(0, 10), revers: liste.revers.slice(0, 10), dovada };
    if (cuRevine) { const dr = d.Reveniri.dovada(serieRev, "revine", { pauzaZile: 14 }); rez.revine = revine.sort((a, b) => b.cadere - a.cadere).slice(0, 10); dovada.revine = { ...dr, text: d.Reveniri.textDovada(dr, "actiuni") }; }
    return rez;
  }
  const us = await piata("us", [...(d.bareUS || new Map()).keys()], async (tk) => d.bareUS.get(tk), 7);
  const eu = await piata("eu", d.tickereEU || [], d.cereBare, 9);
  // urmărirea înainte: listele de azi intră în istoric; cele de cel puțin 14 zile se judecă la prețul de acum
  // revizia (I2): o intrare = un semnal (bara lui), nu o tură - altfel semnalul de vineri intra și sâmbătă, și duminică, și luni
  const cheieU = (x) => x.piata + "|" + x.lista + "|" + x.ticker + "|" + (x.tBara || x.zi);
  const ist = (Array.isArray(d.istoric) ? d.istoric : []).filter((x) => x && x.t >= acum - PASTRARE * ZI), vazut = new Set(ist.map(cheieU));
  for (const [p, rez] of [["us", us], ["eu", eu]]) for (const k of ["urcare", "revers"]) for (const x of rez[k]) {
    const e = { zi, piata: p, lista: k, ticker: x.ticker, pret: x.pret, t: acum, tBara: x.t }; if (vazut.has(cheieU(e)) || !(x.pret > 0)) continue; vazut.add(cheieU(e)); ist.push(e);
  }
  const urmarire = {};
  for (const p of ["us", "eu"]) { urmarire[p] = {}; for (const k of ["urcare", "revers"]) {
    const v = ist.filter((x) => x.piata === p && x.lista === k && acum - x.t >= URM_ZILE * ZI && ultim[x.ticker] > 0).map((x) => ultim[x.ticker] / x.pret - 1 - URM_COST);
    urmarire[p][k] = { n: v.length, pePlus: v.length ? v.filter((r) => r > 0).length / v.length : null, medie: v.length ? v.reduce((s, r) => s + r, 0) / v.length : null };
  } }
  return { raport: { la: acum, zi, us, eu, urmarire }, baza, istoric: ist };
}

export async function sugestiiIntraday(d) {
  const SA = d.SA, acum = d.acum || Date.now(), lista = []; let judecate = 0, fara = 0, asteapta = 0;
  for (const [tk, b] of Object.entries(d.baza || {})) {
    if (d.piata === "us" ? !/_US_EQ$/.test(tk) : /_US_EQ$/.test(tk)) continue;
    let r = null; try { r = await d.cere5m(tk); } catch { r = null; }
    const x = d.piata === "us" ? SA.premarket(r || [], b.inchidere, b.vol, acum) : SA.gapEU(r || [], b.inchidere, b.vol, acum);
    if (d.pauza) await d.pauza(d.pauzaMs || 200);   // și după eșec (revizia M8)
    if (x.asteapta) { asteapta++; continue; }   // revizia (I4): primele 20 de minute EU n-au venit încă
    if (x.fara) { fara++; continue; }
    judecate++;
    if (x.da) lista.push({ ticker: tk, simbol: simbolTicker(tk), gap: x.gap, pret: x.pret, volPct: x.volPct });
  }
  lista.sort((a, b) => b.gap - a.gap);
  if (d.jurnal) d.jurnal((d.piata === "us" ? "pre-market US" : "gap EU") + ": " + cate(judecate, "acțiune cu rânduri azi", "acțiuni cu rânduri azi") + ", fără rânduri: " + fara + " · peste +2%: " + lista.length);
  return { la: acum, lista: lista.slice(0, 20), judecate, fara, asteapta };
}
