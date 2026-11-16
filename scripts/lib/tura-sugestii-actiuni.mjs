// Sugestiile de ACȚIUNI pentru pagina „Sugestii” (v101.81; el 06.10: „o pagină de sugestii cu tot: boți, EU, US” + „early = toate trei”).
// (tura-sugestii.mjs e altceva: monedele pe revenire / short, v100.85.)
// sugestiiDimineata - după tura ideilor de la 8:00: listele zilei (început de urcare, revers timpuriu) pe US (barele aduse deja pentru idei)
//   și EU (aduse aici), istoricul fiecărei reguli pe 2 ani (SugestiiActiuni.dovada), baza pentru intraday (volumul mediu, închiderea de ieri)
//   și urmărirea înainte (fiecare listă a zilei, judecată la închiderea de după 14 zile, −0,3%; v100.196: orizont FIX, nu „prețul de acum”).
// sugestiiIntraday - pre-market US (~16:00 RO) / gap la deschidere EU (~10:20 RO), pe baza de dimineață.
const ZI = 86400000, URM_ZILE = 14, URM_COST = 0.003, PASTRARE = 120;
// numărătorile din jurnal - „1 acțiune”, „25 de acțiuni” (TextRo.cate; rezerva știe aceeași regulă, ca tura-laborator)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export const simbolTicker = (tk) => String(tk || "").replace(/_.*$/, "").replace(/[dpalsm]$/, "");

// v101.182 (auditul 16.11): urmărirea listei „Pe revenire” (US din tura ideilor, EU de aici) la ORIZONT FIX, față de reperul din aceleași zile.
// Un semnal = prima apariție a tickerului (pauză 14 zile calendaristice între semnale); intrarea la DESCHIDEREA primei bare de după bara
// semnalului (tura e la 8:00, înaintea deschiderii), ieșirea la închiderea barei a 10-a de bursă de la intrare (inclusiv); reperul (QQQ /
// EXW1 = Euro Stoxx 50) pe aceleași date; rezultatul = r − r_reper − 0,3%; numărat pe ZILE (semnalele unei zile = o observație).
const REV_ZILE = 10, REV_PAUZA = 14 * ZI, REPER = { us: "QQQ", eu: "Euro Stoxx 50 (EXW1)" };
const ziUtc = (t) => new Date(t).toISOString().slice(0, 10);
const pc = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%");
const pp = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(1).replace(".", ",") + " pp");
export function urmarireRevine(ist, barePe, reper, acum, o) {
  o = o || {}; const p = o.piata, cost = o.cost == null ? URM_COST : o.cost, Rp = reper && Array.isArray(reper[p]) ? reper[p] : null;
  const dupa = (bb, t) => { for (let i = 0; i < bb.length; i++) if (bb[i].t > t) return i; return -1; };
  const laZi = (bb, t) => { const z = ziUtc(t); for (let i = 0; i < bb.length; i++) if (ziUtc(bb[i].t) === z) return bb[i]; return null; };
  const ultim = new Map(), peZi = new Map(); let inAsteptare = 0, nejudecate = 0;
  const sem = (Array.isArray(ist) ? ist : []).filter((x) => x && x.piata === p && x.lista === "revine" && x.ticker && x.tBara > 0).sort((x, y) => x.tBara - y.tBara);
  for (const x of sem) {
    const u = ultim.get(x.ticker); if (u != null && x.tBara - u < REV_PAUZA) continue; ultim.set(x.ticker, x.tBara);
    const bb = barePe && barePe[x.ticker]; if (!Array.isArray(bb) || !bb.length) { nejudecate++; continue; }
    const i = dupa(bb, x.tBara); if (i < 0 || i + REV_ZILE - 1 >= bb.length) { inAsteptare++; continue; }
    const A = bb[i], Z = bb[i + REV_ZILE - 1]; if (!(A.o > 0) || !(Z.c > 0)) { nejudecate++; continue; }
    const r = Z.c / A.o - 1, ra = Rp ? laZi(Rp, A.t) : null, rz = Rp ? laZi(Rp, Z.t) : null;
    const e = ra && rz && ra.o > 0 && rz.c > 0 ? r - (rz.c / ra.o - 1) - cost : null;
    if (!peZi.has(x.zi)) peZi.set(x.zi, { t: x.tBara, r: [], e: [] });
    peZi.get(x.zi).r.push(r - cost); if (e != null) peZi.get(x.zi).e.push(e);
  }
  const med = (l) => (l.length ? l.reduce((s1, v) => s1 + v, 0) / l.length : null);
  const zileL = [...peZi.values()].sort((x, y) => x.t - y.t), mr = zileL.map((z) => med(z.r)), me = zileL.filter((z) => z.e.length).map((z) => med(z.e));
  let ferestre = 0, ultimaF = -Infinity; for (const z of zileL) if (z.t - ultimaF >= REV_PAUZA) { ferestre++; ultimaF = z.t; }
  const n = zileL.reduce((s1, z) => s1 + z.r.length, 0);
  const u = { n, zile: zileL.length, medie: med(mr), exces: me.length ? med(me) : null, zilePeste: me.length ? me.filter((v) => v > 0).length / me.length : null, ferestre, inAsteptare, nejudecate, reper: REPER[p] || null };
  const fara = !Rp ? " (fără reper: doar rezultatul brut)" : "";
  u.text = !n ? "Semnalele se judecă la " + cate(REV_ZILE, "zi", "zile") + " de bursă după intrare, față de " + (REPER[p] || "piață") + fara + ", după 0,3%: încă niciunul ajuns la capăt" + (inAsteptare ? " (" + cate(inAsteptare, "semnal", "semnale") + " în așteptare)" : "") + "."
    : "Din " + cate(n, "semnal", "semnale") + " (" + cate(u.zile, "zi", "zile") + ") la " + cate(REV_ZILE, "zi", "zile") + " de bursă, de la deschiderea de după semnal, după 0,3%: media " + pc(u.medie)
      + (u.exces != null ? ", față de " + REPER[p] + " din aceleași zile " + pp(u.exces) + " (peste el în " + Math.round(u.zilePeste * 100) + "% din zile)" : fara)
      + " · ferestre care nu se suprapun: " + ferestre + (ferestre < 8 ? " · prea devreme pentru o concluzie (cel puțin 8)" : "") + (inAsteptare ? " · " + inAsteptare + " în așteptare" : "") + (nejudecate ? " · " + nejudecate + " fără prețuri" : "") + ".";
  return u;
}

export async function sugestiiDimineata(d) {
  const acum = d.acum || Date.now(), zi = new Date(acum).toISOString().slice(0, 10), barePe = {};
  // v101.182 (auditul 16.11): doar ce arată pagina - „Pe revenire” EU (regula Reveniri.actiune) și urmărirea revenirii US / EU. Listele scoase
  // pe 01.11 (început de urcare, revers timpuriu, gap / pre-market) nu se mai calculează: 3 × 2.000 de repetări pe 2 piețe, zilnic, pentru nimeni.
  async function piata(p, tickere, bareDe, sesiuneOre) {
    const cuRevine = p === "eu" && !!d.Reveniri, serieRev = [], revine = []; let judecate = 0, fara = 0;
    for (const tk of tickere) {
      let b = null; try { b = await bareDe(tk); } catch { b = null; }
      if (p === "eu" && d.pauza) await d.pauza(d.pauzaMs || 1000);   // revizia (M8/M9): pauza și după eșec, ca tura ideilor (1 s)
      if (!Array.isArray(b) || b.length < 31) { fara++; continue; }
      judecate++;
      // revizia (M5): fără bara EU încă în lucru (dimineața târzie)
      const bInch = acum - b[b.length - 1].t < sesiuneOre * 3600000 ? b.slice(0, -1) : b; barePe[tk] = bInch;
      // regula veche (Reveniri) n-are igiena: seria cu un salt de unitate iese de tot
      if (cuRevine && !(d.SA && d.SA.areSalt && d.SA.areSalt(b, 1, b.length - 1))) { try { const rv = d.Reveniri.actiunePeRevenire(bInch); if (rv && rv.revine) revine.push({ ticker: tk, simbol: simbolTicker(tk), ...rv, tBara: bInch[bInch.length - 1].t }); serieRev.push(d.Reveniri.puncte(bInch, { r: d.Reveniri.REGULI.actiune })); } catch {} }
    }
    if (d.jurnal) d.jurnal("sugestii " + p + ": " + cate(judecate, "acțiune judecată", "acțiuni judecate") + ", fără prețuri: " + fara + (cuRevine ? " · pe revenire: " + revine.length : ""));
    const rez = { judecate, fara };
    if (cuRevine) { const dr = d.Reveniri.dovada(serieRev, "revine", { pauzaZile: 14 }); rez.revine = revine.sort((x, y) => y.cadere - x.cadere).slice(0, 10); rez.dovada = { revine: { ...dr, text: d.Reveniri.textDovada(dr, "actiuni") } }; }
    return rez;
  }
  const us = await piata("us", [...(d.bareUS || new Map()).keys()], async (tk) => d.bareUS.get(tk), 7);
  const eu = await piata("eu", d.tickereEU || [], d.cereBare, 9);
  // istoricul: doar semnalele „revine” (US din tura ideilor, EU de aici), o intrare pe bara semnalului; cele vechi (urcare / revers) ies
  const cheieU = (x) => x.piata + "|" + x.lista + "|" + x.ticker + "|" + (x.tBara || x.zi);
  const ist = (Array.isArray(d.istoric) ? d.istoric : []).filter((x) => x && x.lista === "revine" && x.t >= acum - PASTRARE * ZI), vazut = new Set(ist.map(cheieU));
  const adauga = (p, x, tBara) => { const e = { zi, piata: p, lista: "revine", ticker: x.ticker, pret: x.pret, t: acum, tBara }; if (!(x.pret > 0) || !(tBara > 0) || vazut.has(cheieU(e))) return; vazut.add(cheieU(e)); ist.push(e); };
  for (const x of eu.revine || []) adauga("eu", x, x.tBara);
  for (const x of Array.isArray(d.reveniriUS) ? d.reveniriUS : []) { const bb = barePe[x.ticker]; if (bb && bb.length) adauga("us", x, bb[bb.length - 1].t); }
  const urmarire = { us: { revine: urmarireRevine(ist, barePe, d.reper, acum, { piata: "us" }) }, eu: { revine: urmarireRevine(ist, barePe, d.reper, acum, { piata: "eu" }) } };
  return { raport: { la: acum, zi, us, eu, urmarire }, baza: {}, istoric: ist };
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
