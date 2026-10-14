// Tura jurnalului de verdicte (v100.177 / colector v101.103; el 13.10: „din a doua recomandare 1–4 plus jurnalul verdictelor”).
// (1) zilnic, după ideile de dimineață: verdictele colectorului intră în jurnal - ideile zilei, reveniri, regimul macro (cu prețul de atunci);
//     o singură dată, istoricul ideilor păstrat de la 25.09 intră și el (cu prețul din ziua aceea);
// (2) la 6 ore: fiecare verdict mai vechi decât orizontul lui e pus lângă ce a urmat (Verdicte.evalueaza), calibrarea pe niveluri și registrul
//     TUTUROR testelor Radarului cu corecția Benjamini–Hochberg (verdictele + obiceiurile din riscul tău + becurile / ADX-ul boților) ⇒ KV.
// Verdictele paginii (Poarta T212, Poarta gridului) le trimite pagina, la fiecare verificare. Doar CITIRE de la brokeri.
// d = { cere, trimite, jurnal, Verdicte, GridCalcul, bareZi(cale), acum }
const ORA = 3600000;
const ziRo = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("verdicte " + ce, e.message); return null; } }
// v101.116 (auditul sever, C4 / statistica 🟡1): simbolul T212 (MU_US_EQ, VOW3d_EQ…) ⇒ ticker=; simbolul simplu al Trendului 12 luni și al topului
// pe sectoare (FFIV, SNDK) ⇒ yahoo=, ca tura-sectoare. Înainte toate mergeau pe ticker= ⇒ 404 „Nu știu simbolul” ⇒ cele două surse nu se judecau niciodată.
export function caleBareZi(k) { k = String(k || ""); return "/api/t212?action=preturi&interval=1d&" + (/_EQ$/.test(k) ? "ticker=" : "yahoo=") + encodeURIComponent(k); }

// v101.114 (demo „Piața azi” aprobat 14.10): Scorul zilei, din ACELEAȘI date și cu aceeași funcție ca pagina (lib/scor-zi.js) ⇒ jurnal.
// Fără un modul (probele vechi) sau fără date ⇒ nimic; o linie cu sub 3 piese cu date nu intră (ScorZi.verdicte).
export async function scorZiDinDate(d, acum) {
  if (!d.ScorZi || !d.Macro || !d.Acasa || !d.GridCalcul) return null;
  const p = await incearca(d, "scor piata", () => d.cere("/api/stiri?action=piata"));
  if (!p) return null;
  const k = await incearca(d, "scor btc", () => d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=200"));
  const btc = k && k.data && k.data.klines || null, macro = d.Macro.scor({ vix: p.vix, tnx: p.tnx, dxy: p.dxy, spy: p.spy, btc, fg: p.fg }, acum);
  const ndx = await incearca(d, "scor ndx", () => d.cere("/api/t212?action=ndx"));
  const ndxL = ndx && Array.isArray(ndx.actiuni) ? d.Acasa.largimeNdx(ndx.actiuni) : null;
  const tr = await incearca(d, "scor trend", () => d.cere("/api/istoric-bot?action=trend12"));
  const lat = await incearca(d, "scor latime", () => d.cere("/api/istoric-bot?action=latime"));
  let mb = null;
  if (d.LatimeUS && d.LatimeUS.extins) mb = await incearca(d, "scor market breadth", async () => { const r = await (d.fetch || fetch)(d.LatimeUS.SURSA, { signal: AbortSignal.timeout(20000) }); return r && r.ok ? d.LatimeUS.extins(await r.json(), acum) : null; });
  const pi = await incearca(d, "scor regim tinut", () => d.cere("/api/istoric-bot?action=piata"));
  const sz = d.ScorZi.calc({ macro, macroTinut: pi && (pi.macro || (pi.piata && pi.piata.macro)), ndx: ndxL, trend: tr && tr.trend, mbUs: mb, latime: lat && lat.latime, acum });
  const bt = btc ? d.GridCalcul.bareToate(btc) : null;
  return { sz, pretBtc: bt && bt.length ? bt[bt.length - 1].c : null };
}

export async function turaVerdicte(d, st) {
  const acum = d.acum || Date.now();
  if (st.inLucru) return null;
  st.inLucru = true;
  try {
    const noi = [];
    // (0) o singură dată: istoricul ideilor (de la 25.09) și al revenirilor
    if (!st.umplutDinUrma) {
      const id = await incearca(d, "istoricul ideilor", () => d.cere("/api/t212?action=idei"));
      if (id) {
        for (const x of Array.isArray(id.istoric) ? id.istoric : []) if (x && x.zi && x.ticker && x.pret > 0) noi.push({ s: "idei", k: x.ticker, n: "cumpar", p: x.pret, t: Date.parse(x.zi + "T06:00:00Z") });
        st.deUmplut = true;
      }
    }
    // (1) verdictele zilei, după 9:00 ora României (ideile se fac la 8:00), o dată pe zi
    const z = ziRo(acum);
    if (st.ziLog !== z && oraRo(acum) >= 9) {
      const id = await incearca(d, "ideile zilei", () => d.cere("/api/t212?action=idei")), ide = id && id.idei;
      if (ide && ide.zi === z) for (const x of (ide.actiuni || []).concat(ide.restul || [])) if (x && x.ticker && x.pret > 0) noi.push({ s: "idei", k: x.ticker, n: "cumpar", p: x.pret, t: ide.la || acum });
      const pi = await incearca(d, "regimul macro", () => d.cere("/api/istoric-bot?action=piata")), mac = pi && (pi.macro || (pi.piata && pi.piata.macro));
      const spy = await incearca(d, "SPY", async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&ticker=SPY_US_EQ")).randuri || [], acum));
      if (mac && mac.cod && spy && spy.length) noi.push({ s: "macro", k: "SPY_US_EQ", n: mac.cod, p: spy[spy.length - 1].c, t: acum });
      // v101.114: Scorul zilei (acțiuni pe SPY, crypto pe BTC), judecat la 5 și 20 de zile ca regimul macro
      const sz = await incearca(d, "scorul zilei", () => scorZiDinDate(d, acum));
      if (sz && sz.sz && d.ScorZi) { const v = d.ScorZi.verdicte(sz.sz, spy && spy.length ? spy[spy.length - 1].c : null, sz.pretBtc, acum); noi.push(...v); if (v.length) d.jurnal("scorul zilei: acțiuni " + sz.sz.actiuni.scor + " (" + sz.sz.actiuni.text + "), crypto " + sz.sz.crypto.scor + " (" + sz.sz.crypto.text + ") ⇒ " + v.length + " în jurnal"); }
      st.deZi = z;
    }
    // (revizia, M6): loturi de cel mult 400 (serverul ia 500 și 64 KB pe cerere); steagurile se pun DOAR după ce au ajuns
    for (let i = 0; i < noi.length; i += 400) await d.trimite("/api/istoric-bot?action=verdict", { verdicte: noi.slice(i, i + 400) });
    if (st.deUmplut) { st.umplutDinUrma = true; delete st.deUmplut; }
    if (st.deZi) { st.ziLog = st.deZi; delete st.deZi; }

    // (2) evaluarea, la 6 ore
    if (acum - (st.evalLa || 0) < 6 * ORA) return { noi: noi.length };
    const jr = await d.cere("/api/istoric-bot?action=verdicte"), jurnal = d.Verdicte.adauga([], jr && jr.verdicte || []);
    const bare = {}, reper = {};
    const deEvaluat = jurnal.filter((v) => acum - v.t > 26 * ORA && acum - v.t < 400 * 86400000);
    for (const k of [...new Set(deEvaluat.map((v) => v.k))]) {
      const S = d.Verdicte.SURSE[deEvaluat.find((v) => v.k === k).s];
      if (S.piata === "crypto") bare[k] = await incearca(d, "bare " + k, async () => d.GridCalcul.bare((await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(k) + "&interval=1D&limit=500")).data.klines));
      else bare[k] = await incearca(d, "bare " + k, async () => d.GridCalcul.bareBursa((await d.bareZi(caleBareZi(k))).randuri || [], acum));
    }
    reper.QQQ = await incearca(d, "QQQ", async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ")).randuri || [], acum));
    reper.SPY = await incearca(d, "SPY", async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&yahoo=SPY")).randuri || [], acum));   // v101.113 (I-623): rigla Trend 12 luni = aceeași ca bilanțul robotului
    const ev = d.Verdicte.evalueaza(deEvaluat, bare, reper), cal = d.Verdicte.calibrare(ev);
    // registrul: + obiceiurile din riscul tău (p din bootstrap) + becurile / ADX-ul boților (din cazuri)
    const risc = await incearca(d, "riscul", async () => (await d.cere("/api/istoric-bot?action=risc")).risc);
    const caz = await incearca(d, "cazuri", async () => (await d.cere("/api/istoric-bot?action=cazuri")).cazuri);
    const reg = d.Verdicte.registru({ calibrare: cal, risc, asemanatoare: caz && caz.bilant && Array.isArray(caz.bilant.teste) ? caz.bilant.teste : [] });
    const pe = {}; jurnal.forEach((v) => { pe[v.s] = (pe[v.s] || 0) + 1; });
    await d.trimite("/api/istoric-bot?action=verdicteCalibrare", { la: acum, n: jurnal.length, peSursa: pe, evaluate: ev.length, calibrare: cal, registru: reg });
    st.evalLa = acum;
    d.jurnal("verdicte: " + jurnal.length + " în jurnal, " + ev.length + " evaluate, " + reg.length + " teste în registru, rămân după corecție " + reg.filter((x) => x.ramane).length);
    return { noi: noi.length, evaluate: ev.length };
  } finally { st.inLucru = false; }
}
