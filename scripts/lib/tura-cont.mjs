// Tura „contul întreg” a colectorului (v100.176 / colector v101.102; el 13.10: „din prima recomandare 1–6”). La 6 ore: adună pozițiile
// (boții Pionex, Trading 212, Salt), prețurile zilnice și cursul leului, rulează ContIntreg (public/lib/cont-intreg.js - aceleași formule ca
// pagina) și trimite raportul acasă (KV cont:raport). O dată pe zi ține minte valoarea contului (cont:zile) și, dacă reconcilierea găsește
// o abatere, o spune pe Discord (o dată pe zi pentru fiecare). Doar CITIRE; o sursă căzută rămâne lipsă în raport, nu oprește restul.
// d = { cere, trimite, trimiteAlerta, jurnal, ContIntreg, T212, JurnalTrade, GridCalcul, botiInchisi() -> trades|throw, salt() -> rânduri,
//       cursBnr() -> {zi, curs}, yahooLung(simbol) -> [{t, c}] (10 ani, cache pe disc), bareZi(cale) -> răspunsul rutei (cache pe disc o zi,
//       cererile noi la 2,5 s - ruta de prețuri are limita ei pe minut), acum, MesajeColector }
import { CalendarBursa } from "./calendar-bursa.mjs";   // jurnalul de execuție: era bursa deschisă când ai dat ordinul?
const ORA = 3600000, PAS = 6 * ORA;
const ziRo = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t));
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("cont " + ce, e.message); return null; } }
const bareDinRanduri = (G, randuri) => G.bareBursa(randuri || [], Date.now()).map((b) => ({ t: b.t, c: b.c, h: b.h, l: b.l }));   // v100.178: + h / l (MAE / MFE)
// prețurile zilnice prin cache-ul de pe disc (d.bareZi) când există, altfel direct
const zilnic = (d, cale) => (d.bareZi ? d.bareZi(cale) : d.cere(cale));

// v100.234: o dată pe zi, același rând cont:zile primește și pauza, VaR-ul și evenimentul, când citirile au reușit.
// O citire picată nu inventează pauză și nu marchează ziua completă.
export async function campuriZiFrana(d, acum, raport) {
  const o = {};
  const tot = raport && raport.valoare ? Number(raport.valoare.total) : NaN;
  const va = raport && raport.risc ? Number(raport.risc.var95) : NaN;
  if (Number.isFinite(tot) || Number.isFinite(va)) o.raport = { valoare: Number.isFinite(tot) ? { total: tot } : null, risc: Number.isFinite(va) ? { var95: va } : null };
  if (!d || !d.cere || !d.Acasa || !d.ScorSezon || !d.StatisticaTrade || !d.JurnalTrade) return o;
  let pauza, eveniment;
  const ar = await incearca(d, "boți zi", () => d.cere("/api/istoric-bot?action=botiInchisi"));
  const cfg = await incearca(d, "sezon zi", () => d.cere("/api/scor-sezon?piata=pionex"));
  const boti = ar && Array.isArray(ar.boti) ? ar.boti : null;
  if (boti) {
    try {
      const tr = d.StatisticaTrade.dinPionex(d.JurnalTrade.din(boti)).concat(d.StatisticaTrade.dinPionexAlte ? d.StatisticaTrade.dinPionexAlte(d.JurnalTrade.alte(boti)) : []);
      const s = d.ScorSezon.calc(tr, cfg && cfg.sezon, acum, "pionex");
      if (s) pauza = !!s.pauza;
      if (pauza && s.serie && s.serie.n > 0) o.pauzaN = s.serie.n;
    } catch (e) { if (d.jurnal) d.jurnal("cont frana zi", e.message); }
  }
  const cal = await incearca(d, "calendar zi", () => d.cere("/api/stiri?action=calendar"));
  if (cal && d.Acasa.calendar) {
    try {
      const urm = d.Acasa.calendar(cal.evenimente, acum).urmatoare || [];
      const azi = ziRo(acum);
      const ev = urm.filter((x) => x && x.mare && x.t && ziRo(x.t) === azi)[0];
      eveniment = ev ? String(ev.titlu).slice(0, 160) : "";
    } catch (e) { if (d.jurnal) d.jurnal("cont frana zi", e.message); }
  }
  if (typeof pauza === "boolean" && typeof eveniment === "string") { o.pauza = pauza; o.eveniment = eveniment; o.raportStare = "ok"; }
  else delete o.pauzaN;
  return o;
}
export async function turaCont(d, st) {
  const acum = d.acum || Date.now();
  if (st.inLucru || acum - (st.la || 0) < PAS || acum - (st.esecLa || 0) < ORA) return null;   // (revizia, M4): după un eșec, o oră pauză
  st.inLucru = true;
  try { return await faRaport(d, st, acum); } catch (e) { st.esecLa = acum; throw e; } finally { st.inLucru = false; }
}

async function faRaport(d, st, acum) {
  const C = d.ContIntreg, G = d.GridCalcul, lipsuri = [];
  // 1. pozițiile și banii
  const botiR = await incearca(d, "boți", () => d.cere("/api/bot-orders")), boti = botiR && Array.isArray(botiR.bots) ? botiR.bots : null;
  if (!boti) lipsuri.push("boții Pionex");
  let pionexLiber = null;
  try {
    const cf = await d.cere("/api/pionex-account?action=futures"), cs = await d.cere("/api/pionex-account?action=balances");
    const spot = (cs && cs.data && Array.isArray(cs.data.balances) ? cs.data.balances : []).reduce((s, x) => (x && (x.coin === "USDT" || x.coin === "USDC") ? s + (Number(x.free) || 0) + (Number(x.frozen) || 0) : s), 0);
    pionexLiber = cf && cf.usdt && cf.usdt.total !== null && Number.isFinite(Number(cf.usdt.total)) ? spot + Number(cf.usdt.total) : null;
  } catch (e) { d.jurnal("cont pionex liber", e.message); }
  const pozR = await incearca(d, "pozițiile T212", () => d.cere("/api/t212?action=pozitii")), poz = pozR && Array.isArray(pozR.pozitii) ? pozR.pozitii.filter((x) => x && x.quantity > 0) : null;
  const cashR = await incearca(d, "contul T212", () => d.cere("/api/t212?action=cont")), cash = cashR && cashR.cash || null;
  const istR = await incearca(d, "istoricul T212", () => d.cere("/api/t212?action=istoric")), umpleri = istR && Array.isArray(istR.umpleri) ? istR.umpleri : null;
  if (!poz) lipsuri.push("pozițiile Trading 212");
  const salt = await incearca(d, "Salt", async () => d.salt()) || [];
  // 2. cursul leului: USD din BNR (ca pagina), EUR și GBP din Yahoo; seriile zilnice ale cursului pentru risc și randament
  const bnr = await incearca(d, "BNR", () => d.cursBnr());
  const fxBare = {};
  for (const [m, s] of [["USD", "USDRON=X"], ["EUR", "EURRON=X"], ["GBP", "GBPRON=X"], ["CAD", "CADRON=X"], ["CHF", "CHFRON=X"]]) fxBare[m] = await incearca(d, "curs " + m, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(s))).randuri)) || [];
  const ultim = (b) => (b && b.length ? b[b.length - 1].c : null);
  const leiPe = { USD: bnr && bnr.curs > 0 ? bnr.curs : ultim(fxBare.USD), EUR: ultim(fxBare.EUR), GBP: ultim(fxBare.GBP), CAD: ultim(fxBare.CAD), CHF: ultim(fxBare.CHF) };
  const fxSerii = { USD: C.randamente(fxBare.USD), EUR: C.randamente(fxBare.EUR), GBP: C.randamente(fxBare.GBP), CAD: C.randamente(fxBare.CAD), CHF: C.randamente(fxBare.CHF) };
  const leiZi = {}; for (const m of Object.keys(fxBare)) { leiZi[m] = {}; for (const b of fxBare[m]) leiZi[m][new Date(b.t).toISOString().slice(0, 10)] = b.c; }
  if (bnr && bnr.toate) for (const [z, c] of Object.entries(bnr.toate)) leiZi.USD[z] = c;   // BNR bate Yahoo pe zilele pe care le are

  // (revizia, I8): moneda reală a instrumentelor T212
  const mon = await incearca(d, "monedele T212", () => d.cere("/api/t212?action=monede")); if (mon && mon.monede) C.setMonede(mon.monede);
  // 3. expunerile
  const e = [];
  for (const b of boti || []) { const x = C.dinBot(b, leiPe); if (x) e.push(x); }
  for (const p of poz || []) { const x = C.dinT212(p, leiPe); if (x) e.push(x); }
  for (const r of salt) { const x = C.dinSalt(r, leiPe); if (x) e.push(x); }

  // 4. seriile zilnice (2 ani) ale fiecărei poziții + factorii (BTC, QQQ) pentru beta; simbolul Yahoo al acțiunilor, pentru istoria lungă
  const serii = {}, yahooSimbol = {}, bareScurte = {};
  for (const x of e) {
    if (serii[x.cheie]) continue;
    let bare = null;
    if (x.tip === "bot" && x.simbolPionex) bare = await incearca(d, "bare " + x.nume, async () => G.bare((await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(x.simbolPionex) + "&interval=1D&limit=500")).data.klines).map((b) => ({ t: b.t, c: b.c })));
    else if (x.tip === "t212") bare = await incearca(d, "bare " + x.nume, async () => { const r = await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.id)); if (r && r.simbol) yahooSimbol[x.cheie] = r.simbol; return bareDinRanduri(G, r && r.randuri); });
    else if (x.tip === "salt") { bare = await incearca(d, "bare " + x.nume, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(x.id))).randuri)); yahooSimbol[x.cheie] = x.id; }
    if (bare && bare.length) { serii[x.cheie] = C.randamente(bare); bareScurte[x.cheie] = bare; }
  }
  const btcB = await incearca(d, "BTC", async () => G.bare((await d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=500")).data.klines).map((b) => ({ t: b.t, c: b.c }))) || [];
  const qqqB = await incearca(d, "QQQ", async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ")).randuri)) || [];
  const spyB = await incearca(d, "SPY", async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=SPY_US_EQ")).randuri)) || [];
  const fBtc = C.randamente(btcB), fQqq = C.randamente(qqqB), fSpy = C.randamente(spyB), betas = {};
  for (const x of e) if (serii[x.cheie] && betas[x.cheie] === undefined) betas[x.cheie] = C.beta(serii[x.cheie], x.clasa === "crypto" ? fBtc : fQqq, 180);

  // 5. riscul pe o zi, corelațiile, diversificarea
  const ist = C.pnlIstoric(e, serii, fxSerii, { n: 250 });
  const v95 = C.varEs(ist.zile, 0.95), v99 = C.varEs(ist.zile, 0.99), rea = C.ziuaCeaMaiRea(ist.zile);
  const folosite = e.filter((x) => ist.folosite.includes(x.cheie));
  const perechi = C.corelatii(e, serii, { zile: 90, min: 40, max: 12 }), div = C.diversificare(folosite, serii, ist.zileCal || ist.zile);

  // 6. stres-testele: factorii și pozițiile pe 10 ani (Yahoo, cache pe disc o săptămână); monedele pe BTC-USD / X-USD
  const lung = async (s) => (s ? await incearca(d, "istoria lungă " + s, () => d.yahooLung(s)) : null);
  const factori = { BTC: await lung("BTC-USD"), QQQ: await lung("QQQ"), SPY: await lung("SPY") }, bareLungi = {};
  for (const x of e) {
    if (bareLungi[x.cheie] !== undefined) continue;
    const s = x.tip === "bot" ? x.cheie.slice(2).replace(/^1000+/, "") + "-USD" : yahooSimbol[x.cheie];
    let bl = (await lung(s)) || null;
    // (revizia, M10): „X-USD” la Yahoo poate fi altă monedă cu același nume ⇒ ultima închidere trebuie să semene (±25 %) cu prețul de acum
    if (bl && bl.length && x.tip === "bot" && x.pret > 0 && Math.abs(bl[bl.length - 1].c / x.pret - 1) > 0.25) { d.jurnal("cont: " + s + " la Yahoo nu se potrivește cu prețul botului - folosesc β × BTC"); bl = null; }
    bareLungi[x.cheie] = bl;
  }
  const stres = C.stres(e, { factori, bareLungi, betas, leiPe });

  // 7. reconcilierea cu brokerii
  const recT212 = poz && umpleri ? C.reconciliereT212(poz, d.T212.perechi(umpleri).deschise) : null;
  let recArhiva = null;
  try {
    const p1 = await d.cere("/api/bot-orders?status=finished&brut=1"), toti = await d.botiInchisi();
    recArhiva = C.reconciliereArhiva((p1 && p1.bots || []).map((b) => b.strategyId || b.buOrderId).filter(Boolean), toti.map((b) => b.strategyId || b.buOrderId || b.id));
  } catch (err) { d.jurnal("cont reconciliere arhiva", err.message); }
  let recUrm = null;
  if (boti) {
    const ultima = {};
    for (const b of boti.filter((x) => x && x.activ)) { const r = await incearca(d, "istoric " + b.id, () => d.cere("/api/istoric-bot?bot=" + encodeURIComponent(b.id) + "&ore=1")); const l = r && Array.isArray(r.intrari) ? r.intrari : []; ultima[b.id] = l.length ? Math.max(...l.map((y) => Number(y.t) || 0)) : null; }
    recUrm = C.reconciliereUrmarire(boti.filter((x) => x && x.activ).map((b) => ({ id: b.id, nume: String(b.baza || "").replace(/\.PERP$/, "") })), ultima, acum, 20);
  }

  const val0 = () => C.valoare({ boti, pionexLiber, t212Cash: cash, salt, leiPe }).total;
  // 8. randamentul: T212 refăcut din umpleri (tickerele din ultimele ~400 de zile), boții din arhivă (+ cei porniți, cu profitul de acum)
  let serieT212 = [], serieBoti = [];
  const bareT = {};   // barele zilnice ale acțiunilor tranzacționate (randamentul și jurnalul de execuție)
  if (umpleri) {
    const recente = [...new Set(umpleri.filter((u) => acum - u.t < 420 * 86400000).map((u) => u.ticker))];
    // simbolurile fără prețuri (delistate) se țin minte o săptămână - altfel ~200 de cereri moarte la fiecare tură
    st.faraPreturi = st.faraPreturi || {};
    for (const tk of recente) {
      if (bareScurte["T:" + tk]) { bareT[tk] = bareScurte["T:" + tk]; continue; }
      if (acum - (st.faraPreturi[tk] || 0) < 7 * 86400000) continue;
      let b = null; try { b = bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri); } catch (err) { if (err.status === 404 || err.tinut || /HTTP 404/.test(err.message)) st.faraPreturi[tk] = acum; else d.jurnal("cont bare randament " + tk, err.message); }
      if (b && b.length) bareT[tk] = b;
    }
    serieT212 = C.seriaT212(umpleri.filter((u) => recente.includes(u.ticker)), bareT, leiZi, { pana: new Date(acum).toISOString().slice(0, 10) });
  }
  try {
    const inchise = d.JurnalTrade.din(await d.botiInchisi()).map((t) => ({ pornit: t.pornit, inchis: t.inchis, investit: t.pus || t.investit, rezultat: t.rezultat }));
    const pornite = (boti || []).filter((b) => b && b.activ).map((b) => ({ pornit: b.pornitLa, inchis: acum, investit: b.investit, rezultat: b.profitTotal }));
    serieBoti = C.seriaBoti(inchise.concat(pornite), leiZi, { acum });
  } catch (err) { d.jurnal("cont randament boti", err.message); }
  const tot = C.combina([serieT212, serieBoti]), an = (s) => s.filter((x) => x.z >= new Date(acum - 365 * 86400000).toISOString().slice(0, 10));
  const randament = {
    tot: C.statistici(an(tot)), t212: C.statistici(an(serieT212)), boti: C.statistici(an(serieBoti)),
    fataBtc: C.fataDe(an(tot), C.randamente(factori.BTC || btcB)), fataSpy: C.fataDe(an(tot), C.randamente(factori.SPY || spyB)),
    t212FataSpy: C.fataDe(an(serieT212), C.randamente(factori.SPY || spyB)), botiFataBtc: C.fataDe(an(serieBoti), C.randamente(factori.BTC || btcB)),
    curba: an(tot).map((x) => [x.z, Math.round(x.r * 1e6) / 1e6]),
    t212Aprox: serieT212.aprox || [], t212Nepotrivite: serieT212.nepotrivite || [], t212FaraCumparare: serieT212.faraCumparare || [], botiAprox: true,
  };

  // 8b. execuția: prețul plănuit față de cel obținut (conversia, stopurile, limitele, ordinele date cu bursa închisă, ieșirile sub planul tău)
  let executie = null;
  if (umpleri) {
    try {
      const vandute = [...new Set(umpleri.filter((x) => x.side === "SELL" && acum - x.t < 366 * 86400000).map((x) => x.ticker))], planuri = {};
      for (const tk of vandute) { const p = await incearca(d, "plan " + tk, () => d.cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk))); if (p && p.plan && !p.plan.proba && p.plan.stop > 0) planuri[tk] = { stop: p.plan.stop, la: p.plan.la }; }
      executie = C.executie(umpleri, { leiZi, bare: bareT, planuri, de: acum - 365 * 86400000, sedinta: (t, tk) => CalendarBursa.stare(t, tk).deschisa });
    } catch (err) { d.jurnal("cont executie", err.message); }
  }
  // 8c. v100.178: factorii și sectoarele, atribuirea, MAE / MFE, ținta de volatilitate (Factori)
  let factoriR = null, atribuireR = null, mae = null, vol = null;
  const rotF = (x, z) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * Math.pow(10, z || 0)) / Math.pow(10, z || 0));
  if (d.Factori) {
    try {
      const fz = {}; for (const etf of d.Factori.ETF_FACTORI) { const b = await incearca(d, "factorul " + etf, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + etf)).randuri)); if (b && b.length) fz[etf] = C.randamente(b); }
      const uh = await incearca(d, "universul SUA", async () => (await d.cere("/api/istoric-bot?action=universSua")).harta) || {};
      const info = {}, fb = {};
      for (const x of e) {
        if (x.clasa !== "actiuni") continue;
        x.simbol = x.tip === "t212" ? d.T212.simbol(x.id) : String(x.id).split(".")[0];
        const h = uh[String(x.simbol).toUpperCase()]; info[x.simbol] = h ? { sector: h[0], industrie: h[1] } : {};
        const etf = h && d.Factori.SECTOARE[h[0]] ? (/Semicond/i.test(h[1] || "") ? "SMH" : d.Factori.SECTOARE[h[0]].etf) : null;
        const f = d.Factori.factoriActiune(serii[x.cheie], fz, etf); if (f) fb[x.cheie] = f;
      }
      factoriR = d.Factori.expunere(e, info, fb, { prag: 0.4 });
      factoriR.perPozitie = e.filter((x) => fb[x.cheie]).map((x) => ({ nume: x.nume, lei: rotF(x.notionalLei), sector: info[x.simbol] && info[x.simbol].sector || null, industrie: info[x.simbol] && info[x.simbol].industrie || null, piata: rotF(fb[x.cheie].piata, 2), mici: rotF(fb[x.cheie].mici, 2), momentum: rotF(fb[x.cheie].momentum, 2), sectorBeta: rotF(fb[x.cheie].sector, 2), etf: fb[x.cheie].etf || null, r2: rotF(fb[x.cheie].r2, 2) }));
      factoriR.sectorPe = {}; e.forEach((x) => { if (x.simbol && info[x.simbol] && info[x.simbol].sector) factoriR.sectorPe[x.simbol] = info[x.simbol].sector; });
      const inchBoti = await incearca(d, "boții pentru atribuire", async () => d.JurnalTrade.din(await d.botiInchisi())) || [];
      atribuireR = { t212Spy: d.Factori.atribuire(an(serieT212), fz.SPY), t212Qqq: d.Factori.atribuire(an(serieT212), C.randamente(qqqB)), boti: d.Factori.descompunereBoti(inchBoti, acum - 365 * 86400000), usdLei: leiPe.USD };
      if (umpleri) { const m = d.Factori.maeMfe(d.T212.perechi(umpleri).inchise, bareT, { de: acum - 365 * 86400000 }); mae = { ...m, trades: undefined, celeMaiAdanci: m.trades.filter((x) => x.rez <= 0).sort((a, b) => a.mae - b.mae).slice(0, 5) }; }
      vol = d.Factori.tintaVol(ist.zile, val0(), 0.15, folosite, serii);
    } catch (err) { d.jurnal("cont factori", err.message); }
  }
  // 8d. v100.179: gărzile LUI (pragurile din datele lui) + lecția săptămânii (duminică seara)
  let garziR = null, lectieR = null;
  if (d.Disciplina) {
    try {
      const banda = await incearca(d, "banda", async () => (await d.cere("/api/istoric-bot?action=disciplinaBanda")).banda);
      const regulaOre = banda && banda.regula ? banda.regula.h : null;
      const pozPct = (poz || []).map((p) => ({ nume: d.T212.simbol(p.ticker), pct: Number(p.averagePrice) > 0 ? Number(p.currentPrice) / Number(p.averagePrice) - 1 : null }));
      const stopM = mae && mae.stopSugerat !== null && mae.stopSugerat !== undefined ? mae.stopSugerat : -0.08;
      garziR = d.Disciplina.garzi({ factori: factoriR, vol, pozitii: pozPct, stop: stopM, stopDinMae: !!(mae && mae.stopSugerat), boti: d.botiAfara ? d.botiAfara() : [], regulaOre });
      // lecția: duminică de la 19:00 sau luni până la 12:00 (ora României), o dată pe săptămână
      const ro = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)), w = (ro.find((x) => x.type === "weekday") || {}).value, h = Number((ro.find((x) => x.type === "hour") || {}).value);
      const duminica = w === "Sun" ? acum : w === "Mon" ? acum - 86400000 : null, sapt = duminica ? ziRo(duminica) : null;
      if (sapt && ((w === "Sun" && h >= 19) || (w === "Mon" && h < 12)) && st.lectieSapt !== sapt && umpleri) {
        const maeLista = d.Factori ? d.Factori.maeMfe(d.T212.perechi(umpleri).inchise, bareT, { de: acum - 9 * 86400000 }).trades : [], mfePe = {}; maeLista.forEach((x) => { mfePe[x.id] = x.mfe; });
        const tradesW = d.T212.perechi(umpleri).inchise.map((t) => ({ id: t.id, ticker: t.ticker, simbol: t.simbol, pornit: t.pornit, inchis: t.inchis, rezultat: t.rezultat, cost: t.cost, pct: t.pct, mfe: mfePe[t.id] !== undefined ? mfePe[t.id] : null }));
        const botiW = (await incearca(d, "boții săptămânii", async () => d.JurnalTrade.din(await d.botiInchisi())) || []).map((t) => ({ id: t.id, moneda: t.moneda, inchis: t.inchis, net: t.net, oreAfara: banda && banda.oreAfaraPe ? banda.oreAfaraPe[t.id] || 0 : 0 }));
        const verd = await incearca(d, "verdictele", async () => (await d.cere("/api/istoric-bot?action=verdicte")).verdicte) || [];
        const teze = await incearca(d, "tezele", async () => (await d.cere("/api/istoric-bot?action=teze")).teze) || [];
        const de = duminica - 7 * 86400000;
        lectieR = d.Disciplina.lectia({ de, pana: duminica + 86400000, trades: tradesW, boti: botiW, usdLei: leiPe.USD, stop: stopM, regulaOre, verdicte: verd, teze });
        const ver = d.Disciplina.verifica(st.regulaPrec || null, lectieR);
        await d.trimite("/api/istoric-bot?action=lectie", { la: acum, sapt, lectie: lectieR, verificare: ver });
        await d.trimiteAlerta(d.MesajeColector.lectiaSaptamanii(lectieR, ver), null, "lectia-" + sapt);
        st.lectieSapt = sapt; if (lectieR.regula) st.regulaPrec = lectieR.regula;
      }
    } catch (err) { d.jurnal("cont disciplina", err.message); }
  }
  // 9. raportul
  const val = C.valoare({ boti, pionexLiber, t212Cash: cash, salt, leiPe });
  const rot = (x, z) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * Math.pow(10, z || 0)) / Math.pow(10, z || 0));
  const raport = {
    la: acum, versiune: d.versiune || null, leiPe, valoare: val, lipsuri,
    expuneri: e.map((x) => ({ tip: x.tip, cheie: x.cheie, nume: x.nume, clasa: x.clasa, moneda: x.moneda, lei: rot(x.notionalLei), valoareLei: rot(x.valoareLei), beta: rot(betas[x.cheie], 2), lipsa: x.lipsa || null })),
    risc: { n: ist.zile.length, var95: v95 && rot(v95.var), es95: v95 && rot(v95.es), var99: v99 && rot(v99.var), es99: v99 && rot(v99.es), ziRea: rea ? { z: rea.z, lei: rot(rea.pnl) } : null,
      scoase: ist.scoase, pnl: ist.zile.map((x) => [x.z, rot(x.pnl)]) },
    corelatii: perechi.slice(0, 15).map((p) => ({ a: p.a, b: p.b, rho: rot(p.rho, 2), n: p.n, acelasiRisc: p.acelasiRisc, seAcopera: p.seAcopera })), diversificare: div ? { raport: rot(div.raport, 2), pariuri: rot(div.pariuri, 1), pozitii: div.pozitii } : null,
    stres: stres.map((s) => ({ cod: s.cod, nume: s.nume, de: s.de, pana: s.pana, btc: rot(s.btc, 4), qqq: rot(s.qqq, 4), lei: rot(s.pnl), lipsa: s.lipsa, pozitii: s.pozitii.slice(0, 6).map((p) => ({ nume: p.nume, r: rot(p.r, 4), lei: rot(p.lei), cum: p.cum, lichidat: p.lichidat })) })),
    reconciliere: { t212: recT212, arhiva: recArhiva, urmarire: recUrm },
    executie, factori: factoriR, atribuire: atribuireR, maeMfe: mae, vol, garzi: garziR,
    randament,
    // seriile ultimelor 120 de zile, pentru Poartă (corelația candidatului cu ce ai deja)
    serii: Object.fromEntries(Object.entries(serii).map(([k, s]) => [k, Object.fromEntries(Object.keys(s).sort().slice(-120).map((z) => [z, rot(s[z], 5)]))])),
  };
  await d.trimite("/api/istoric-bot?action=cont", { cont: raport });
  st.la = acum;
  const z = ziRo(acum);
  if (st.ziValoare !== z && val.total > 0) { const fr = await campuriZiFrana(d, acum, raport); const okZ = await incearca(d, "valoarea zilei", () => d.trimite("/api/istoric-bot?action=contZi", Object.assign({ z, valoare: rot(val.total), complet: val.complet, pionex: rot(val.pionex), t212: rot(val.t212), salt: rot(val.salt) }, fr))); if (okZ) st.ziValoare = z; }   // (revizia, M5): doar dacă a ajuns
  // 10. reconcilierea pe Discord: o dată pe zi pentru fiecare abatere
  const abateri = [];
  if (recT212 && !recT212.ok) for (const a of recT212.abateri) abateri.push({ cheie: "rec-t212-" + a.ticker, m: d.MesajeColector.reconciliereT212(a) });
  if (recArhiva && !recArhiva.ok) abateri.push({ cheie: "rec-arhiva", m: d.MesajeColector.reconciliereArhiva(recArhiva) });
  if (recUrm && !recUrm.ok) abateri.push({ cheie: "rec-urmarire", m: d.MesajeColector.reconciliereUrmarire(recUrm) });
  // v100.179: gărzile încălcate - o dată pe zi fiecare (aceeași coadă ca reconcilierea); banda o spune deja alerta pe viu
  for (const g of garziR || []) if (!g.ok && g.cod !== "banda" && d.MesajeColector.garda) abateri.push({ cheie: "garda-" + g.cod, m: d.MesajeColector.garda(g) });
  st.spuse = st.spuse && st.spuse.zi === z ? st.spuse : { zi: z, chei: {} };
  for (const a of abateri) { if (st.spuse.chei[a.cheie]) continue; if (await d.trimiteAlerta(a.m, null, a.cheie)) st.spuse.chei[a.cheie] = 1; }
  d.jurnal("cont: " + Math.round(val.total).toLocaleString("ro-RO") + " lei" + (val.complet ? "" : " (fără " + val.lipsa.join(", ") + ")") + " · VaR95 " + (v95 ? Math.round(v95.var) + " lei" : "—") + " · " + (stres[0] ? "cea mai rea criză " + stres[0].nume + " " + Math.round(stres[0].pnl) + " lei" : "fără stres") + " · abateri " + abateri.length);
  return raport;
}
