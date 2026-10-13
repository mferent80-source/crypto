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
      else bare[k] = await incearca(d, "bare " + k, async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(k))).randuri || [], acum));
    }
    reper.QQQ = await incearca(d, "QQQ", async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ")).randuri || [], acum));
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
