// Tura de piata a colectorului (v94). Cererea lui 26.09: alerta cand se schimba "vremea pietei", Nasdaq la zi
// cat e bursa deschisa, "ce s-a schimbat de ieri", funding-ul pe toata piata si alerta pe fiecare moneda /
// actiune din portofoliu la MISCARE NEOBISNUITA (peste 2x obisnuitul ei si minim 3% - pragul ales de el).
// Fiecare parte are ritmul ei si nu opreste restul daca pica. Probat in scripts/tura-piata-v94.mjs.
// d = { cere, trimite, trimiteAlerta, jurnal, pauza, Acasa, Alerte, GridCalcul, GridClasament, Directie, NDX }
// st = starea ei (colectorul o tine in meta si o scrie pe disc)
const MIN = 60000, ORA = 3600000;
const RITM = { vreme: 10 * MIN, funding: ORA, boti: 30 * MIN, bursa: ORA };

function ceas(acum, tz) {
  const o = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)).forEach((x) => { o[x.type] = x.value; });
  return { zi: o.year + "-" + o.month + "-" + o.day, sapt: o.weekday, min: Number(o.hour) * 60 + Number(o.minute) };
}
function bursa(acum) {
  const n = ceas(acum, "America/New_York"), lucru = ["Sat", "Sun"].indexOf(n.sapt) < 0;
  return { zi: n.zi, deschisa: lucru && n.min >= 570 && n.min < 960, dupaInchidere: lucru && n.min >= 965 && n.min < 1080 };
}
const cheiaNume = (s) => String(s || "").replace(/_USDT_PERP$/, "").replace(/\.PERP$/, "");
function sumarClasament(c) {
  const m = c && Array.isArray(c.monede) ? c.monede : null; if (!m) return null;
  const o = { evita: 0, candidati: 0, faraDate: 0, dir: { long: 0, neutru: 0, short: 0 } };
  m.forEach((x) => { if (x.stare === "evita") o.evita++; else if (x.stare === "candidat") o.candidati++; else o.faraDate++; if (o.dir[x.dir] != null) o.dir[x.dir]++; });
  return o;
}
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("piata " + ce, e.message); return null; } }
// v95: socoteala alertelor - fiecare alerta de miscare, tinuta minte cu pretul ei (ultimele 300)
function noteaza(st, o) { st.soc = (st.soc || []).concat([o]).slice(-300); }
async function trimiteToate(d, mesaje) { let toate = true; for (const m of mesaje) if (!(await d.trimiteAlerta(m, null, m.cheie))) toate = false; return toate; }

// ---- 1. vremea pietei (crypto + Nasdaq + legatura BTC - bursa), la 10 minute ----
async function vreme(d, st, acum) {
  const A = d.Acasa, G = d.GridCalcul;
  const cl = await incearca(d, "clasament", async () => sumarClasament((await d.cere("/api/istoric-bot?action=clasament")).clasament));
  const p = await incearca(d, "bursele", () => d.cere("/api/stiri?action=piata")) || {};
  const nd = await incearca(d, "ndx", () => d.cere("/api/t212?action=ndx"));
  const b1h = await incearca(d, "BTC 1h", async () => G.bare((await d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=60M&limit=500")).data.klines));
  const b1d = await incearca(d, "BTC 1z", async () => G.bareToate((await d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=200")).data.klines));
  const reg = b1h && b1h.length ? G.regimPeBare(b1h, 4, 24) : null, fg = p.fg ? p.fg.valoare : null;
  const qqq = p.qqq ? G.bareToate(p.qqq) : null, vixB = p.vix ? G.bareToate(p.vix) : null, vix = vixB && vixB.length ? vixB[vixB.length - 1].c : null;
  const ndL = nd && Array.isArray(nd.actiuni) ? A.largimeNdx(nd.actiuni) : null;
  const v = A.vreme({ clasament: cl, btc: { miscare: reg ? !!reg.miscare : false }, fg }), vb = A.vremeBursa({ qqq, vix, ndx: ndL });
  const co = b1d && qqq ? A.corelatie(b1d, qqq, 30) : null;
  const r = d.Alerte.schimbareVreme(st.vreme || null, { crypto: v, bursa: vb, corelatie: co }, acum);
  if (await trimiteToate(d, r.mesaje)) {
    st.vreme = r.stare;
    // v95: dupa "crypto in MISCARE" se masoara cat s-a mai miscat BTC
    if (b1h && b1h.length && r.mesaje.some((m) => m.cheie === "vreme-crypto" && m.nivel === "critic")) noteaza(st, { t: acum, cheie: "vreme-crypto", sim: "BTC", fel: "vreme", pret: b1h[b1h.length - 1].c });
  }
  st.ult = { fg, inMiscare: cl ? cl.evita : null, vix, ndxE50: ndL ? ndL.e50 : null, btc: b1h && b1h.length ? b1h[b1h.length - 1].c : null };
}

// ---- 2. funding-ul pe toata piata (primele 30 de futures dupa volum), o data pe ora ----
async function funding(d, st, acum) {
  const t = await d.cere("/api/market?type=pionex_tickers&market=PERP"), top = d.GridClasament.topDupaVolum(t && t.data && t.data.tickers, 30), l = [];
  for (const x of top) {
    const r = await incearca(d, "funding " + x.simbol, () => d.cere("/api/market?type=pionex_funding&symbol=" + encodeURIComponent(x.simbol)));
    const rates = (r && r.data && Array.isArray(r.data.rates) ? r.data.rates : []).slice().sort((a, b) => Number(b.fundingTime) - Number(a.fundingTime)).map((z) => Number(z.fundingRate)).filter(Number.isFinite);
    if (rates.length) l.push({ s: cheiaNume(x.simbol), rate: rates[0], hist: rates });
  }
  const f = d.Acasa.fundingPiata(l); if (!f) return;
  st.funding = f;
  await d.trimite("/api/istoric-bot?action=piata", { la: acum, funding: f });
  // o singura alerta pe zi cand funding-ul pe piata iese din obicei (multi inghesuiti pe long)
  const zi = ceas(acum, "Europe/Bucharest").zi;
  if (f.ton === "atentie" && st.fundingAlertZi !== zi && await d.trimiteAlerta({ cheie: "funding-piata", nivel: "atentie", titlu: "Funding-ul pe piață e mult peste obicei", mesaj: f.text + " Ce aș face eu: n-aș porni boți long noi până nu se descarcă." }, null, "funding-piata")) st.fundingAlertZi = zi;
}

// ---- 3. miscarea neobisnuita pe monedele botilor, la 30 de minute ----
async function boti(d, st, acum) {
  const r = await d.cere("/api/bot-orders"), l = (r && Array.isArray(r.bots) ? r.bots : []).filter((b) => b && b.activ !== false);
  st.miscari = st.miscari || {};
  for (const b of l.slice(0, 6)) {
    const nume = cheiaNume(b.baza); if (!nume) continue;
    const k = await incearca(d, "bot " + nume, () => d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(b.simbolPionex || nume + "_USDT_PERP") + "&interval=60M&limit=500"));   // v100.13: tickerul real
    const c = k && k.data && Array.isArray(k.data.klines) ? k.data.klines.slice().sort((x, y) => Number(x.time) - Number(y.time)).map((x) => Number(x.close)).filter((v) => v > 0) : [];
    if (c.length < 60) continue;
    const ch = (c[c.length - 1] / c[c.length - 25] - 1) * 100, tip = d.Acasa.miscareTipica(c.slice(0, -1), 24), cheie = "bot-" + nume;
    const x = d.Alerte.miscareNeobisnuita({ cheie, nume, fel: "monedă", ch, tipic: tip, pret: c[c.length - 1] }, st.miscari[cheie] || null, acum);
    if (!x.mesaj || await d.trimiteAlerta(x.mesaj, b.id || null, x.mesaj.cheie)) { st.miscari[cheie] = x.stare; if (x.mesaj) noteaza(st, { t: acum, cheie, sim: nume, fel: "monedă", dir: ch > 0 ? "sus" : "jos", pret: c[c.length - 1] }); }
  }
}

// ---- 4. bursa: Nasdaq 100 la zi + actiunile lui, o data pe ora cat e deschisa si o data dupa inchidere ----
async function bursaLaZi(d, st, acum, zi) {
  const A = d.Acasa, G = d.GridCalcul, bare = {};
  const ia = async (sim) => { if (bare[sim] !== undefined) return bare[sim]; await d.pauza(600); const r = await incearca(d, "pret " + sim, () => d.cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(sim + "_US_EQ"))); bare[sim] = r && Array.isArray(r.randuri) ? G.bareToate(r.randuri) : null; return bare[sim]; };
  const ndx = [];
  for (const s of d.NDX || []) { const b = await ia(s); const z = b ? A.rezumatActiune(b) : null; if (z) ndx.push({ s, ...z }); }
  if (ndx.length) await d.trimite("/api/t212?action=ndx", { la: acum, zi, ndx });
  // actiunile americane din portofoliu
  const poz = await incearca(d, "pozitii", () => d.cere("/api/t212?action=pozitii"));
  const tk = (Array.isArray(poz) ? poz : poz && (poz.items || poz.pozitii) || []).map((x) => x && x.ticker).filter((t) => /_US_EQ$/.test(String(t)));
  st.miscari = st.miscari || {};
  for (const t of tk.slice(0, 20)) {
    const sim = t.replace(/_US_EQ$/, ""), b = await ia(sim); if (!b || b.length < 30) continue;
    const c = b.map((x) => x.c), ch = (c[c.length - 1] / c[c.length - 2] - 1) * 100, tip = A.miscareTipica(c.slice(-122, -1), 1), cheie = "act-" + sim;
    const x = d.Alerte.miscareNeobisnuita({ cheie, nume: sim, fel: "acțiune", ch, tipic: tip, pret: c[c.length - 1] }, st.miscari[cheie] || null, acum);
    if (!x.mesaj || await d.trimiteAlerta(x.mesaj, null, x.mesaj.cheie)) { st.miscari[cheie] = x.stare; if (x.mesaj) noteaza(st, { t: acum, cheie, sim, fel: "acțiune", dir: ch > 0 ? "sus" : "jos", pret: c[c.length - 1] }); }
  }
}

// ---- 5. poza zilnica a pietei (pentru "ce s-a schimbat de ieri"), dupa ora 9 ----
async function poza(d, st, acum) {
  const r = ceas(acum, "Europe/Bucharest");
  if (r.min < 540 || st.pozaZi === r.zi || !st.ult) return;
  // v95: si botii (suma totalurilor) + contul T212 -> Home: "ziua ta" (castig / pierdere fata de ieri dimineata)
  const bo = await incearca(d, "boti poza", () => d.cere("/api/bot-orders")), co = await incearca(d, "cont poza", () => d.cere("/api/t212?action=cont"));
  const act = (bo && Array.isArray(bo.bots) ? bo.bots : []).filter((b) => b && b.activ !== false && Number.isFinite(Number(b.profitTotal)));
  const ca = co && co.cash, eu = { botiTotal: act.length ? Math.round(act.reduce((s, b) => s + Number(b.profitTotal), 0) * 100) / 100 : null, t212Total: ca && Number.isFinite(Number(ca.total)) ? Number(ca.total) : null, t212Ppl: ca && Number.isFinite(Number(ca.ppl)) ? Number(ca.ppl) : null };
  await d.trimite("/api/istoric-bot?action=piata", { la: acum, instantaneu: Object.assign({ zi: r.zi, fundingMed: st.funding ? st.funding.mediana : null }, st.ult, eu) });
  st.pozaZi = r.zi;
}

// ---- 6. socoteala alertelor: pretul dupa 24 h si dupa 3 zile, apoi socoteala trimisa (Home + raport) ----
async function socoteala(d, st, acum) {
  const l = st.soc || []; let schimbat = false;
  const pretAcum = async (x) => {
    if (x.fel === "acțiune") { const r = await d.cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.sim + "_US_EQ")); const b = d.GridCalcul.bareToate(r && r.randuri); return b.length ? b[b.length - 1].c : null; }
    const k = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(x.sim + "_USDT_PERP") + "&interval=60M&limit=5");
    const c = (k && k.data && k.data.klines || []).slice().sort((a, b) => Number(a.time) - Number(b.time)); return c.length ? Number(c[c.length - 1].close) : null;
  };
  for (const x of l) for (const [k, ore] of [["p1", 24], ["p3", 72]]) {
    if (x[k] !== undefined || acum - x.t < ore * ORA) continue;
    // evaluat la cel mult 6 h dupa termen: pretul de acum ~ pretul de atunci; mai tarziu (colector oprit) -> se renunta
    if (acum - x.t > (ore + 6) * ORA) { x[k] = 0; schimbat = true; continue; }
    const p = await incearca(d, "socoteala " + x.sim, () => pretAcum(x)); if (p > 0) { x[k] = p; schimbat = true; }
  }
  if (schimbat || st.socTrimisN !== l.length) { await d.trimite("/api/istoric-bot?action=piata", { la: acum, socoteala: d.Acasa.socotealaAlerte(l) }); st.socTrimisN = l.length; }
}

// ---- 7. raportul de duminica seara (dupa 20:00 Bucuresti), o data ----
async function raportSaptamana(d, st, acum) {
  const r = ceas(acum, "Europe/Bucharest");
  if (r.sapt !== "Sun" || r.min < 1200 || st.raportSaptZi === r.zi) return;
  const A = d.Acasa, G = d.GridCalcul;
  const p = await incearca(d, "raport bursele", () => d.cere("/api/stiri?action=piata")) || {};
  const qqq = p.qqq ? G.bareToate(p.qqq) : null, vixB = p.vix ? G.bareToate(p.vix) : null, vix = vixB && vixB.length ? vixB[vixB.length - 1].c : null;
  const b1d = await incearca(d, "raport BTC", async () => G.bareToate((await d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=30")).data.klines));
  const nd = await incearca(d, "raport ndx", () => d.cere("/api/t212?action=ndx")), l = nd && Array.isArray(nd.actiuni) ? nd.actiuni.filter((x) => Number.isFinite(x.ch5)) : [];
  const s5 = l.slice().sort((a, b) => b.ch5 - a.ch5);
  const cl = await incearca(d, "raport clasament", async () => sumarClasament((await d.cere("/api/istoric-bot?action=clasament")).clasament));
  const bo = await incearca(d, "raport boti", () => d.cere("/api/bot-orders")), act = (bo && Array.isArray(bo.bots) ? bo.bots : []).filter((b) => b && b.activ !== false && Number.isFinite(Number(b.profitTotal)));
  const co = await incearca(d, "raport cont", () => d.cere("/api/t212?action=cont"));
  const ca = await incearca(d, "raport calendar", () => d.cere("/api/stiri?action=calendar")), cal = A.calendar(ca && ca.evenimente, acum).urmatoare;
  const poz = await incearca(d, "raport pozitii", () => d.cere("/api/t212?action=pozitii")), rz = [];
  for (const t of (Array.isArray(poz) ? poz : poz && (poz.items || poz.pozitii) || []).map((x) => x && x.ticker).filter((t) => /_US_EQ$/.test(String(t))).slice(0, 10)) {
    const x = await incearca(d, "raport rezultate", () => d.cere("/api/t212?action=rezultate&ticker=" + encodeURIComponent(t)));
    if (x && x.data && Date.parse(x.data) - acum < 14 * 86400000) rz.push({ simbol: x.simbol || t.split("_")[0], data: x.data });
  }
  rz.sort((a, b) => (a.data < b.data ? -1 : 1));
  const m = A.raportSaptamana({ btc7: b1d && b1d.length > 7 ? (b1d[b1d.length - 1].c / b1d[b1d.length - 8].c - 1) * 100 : null,
    vreme: A.vreme({ clasament: cl, btc: { miscare: false }, fg: p.fg ? p.fg.valoare : null }), qqq5: qqq && qqq.length > 5 ? (qqq[qqq.length - 1].c / qqq[qqq.length - 6].c - 1) * 100 : null, vix,
    vremeBursa: A.vremeBursa({ qqq, vix, ndx: A.largimeNdx(l) }), sus: s5.slice(0, 3), jos: s5.slice(-3).reverse(),
    botiTotal: act.length ? act.reduce((s, b) => s + Number(b.profitTotal), 0) : null, t212Ppl: co && co.cash ? Number(co.cash.ppl) : null, calendar: cal, rezultate: rz });
  if (await d.trimiteAlerta(m, null, "raport-saptamana")) st.raportSaptZi = r.zi;
}

export async function turaPiata(d, st, acum) {
  acum = acum || Date.now();
  const la = (k) => st["la_" + k] || 0, facut = (k) => { st["la_" + k] = acum; };
  if (acum - la("vreme") >= RITM.vreme) { facut("vreme"); await incearca(d, "vreme", () => vreme(d, st, acum)); }
  if (acum - la("funding") >= RITM.funding) { facut("funding"); await incearca(d, "funding", () => funding(d, st, acum)); }
  if (acum - la("boti") >= RITM.boti) { facut("boti"); await incearca(d, "boti", () => boti(d, st, acum)); }
  const bu = bursa(acum);
  if ((bu.deschisa && acum - la("bursa") >= RITM.bursa) || (bu.dupaInchidere && st.bursaInchisaZi !== bu.zi)) {
    facut("bursa"); if (bu.dupaInchidere) st.bursaInchisaZi = bu.zi;
    await incearca(d, "bursa", () => bursaLaZi(d, st, acum, bu.zi));
  }
  await incearca(d, "poza", () => poza(d, st, acum));
  if (acum - la("soc") >= ORA) { facut("soc"); await incearca(d, "socoteala", () => socoteala(d, st, acum)); }
  await incearca(d, "raport saptamana", () => raportSaptamana(d, st, acum));
  return st;
}
