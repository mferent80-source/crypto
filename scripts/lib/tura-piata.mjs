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
  if (await trimiteToate(d, r.mesaje)) st.vreme = r.stare;
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
    const k = await incearca(d, "bot " + nume, () => d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(nume + "_USDT_PERP") + "&interval=60M&limit=500"));
    const c = k && k.data && Array.isArray(k.data.klines) ? k.data.klines.slice().sort((x, y) => Number(x.time) - Number(y.time)).map((x) => Number(x.close)).filter((v) => v > 0) : [];
    if (c.length < 60) continue;
    const ch = (c[c.length - 1] / c[c.length - 25] - 1) * 100, tip = d.Acasa.miscareTipica(c.slice(0, -1), 24), cheie = "bot-" + nume;
    const x = d.Alerte.miscareNeobisnuita({ cheie, nume, fel: "monedă", ch, tipic: tip, pret: c[c.length - 1] }, st.miscari[cheie] || null, acum);
    if (!x.mesaj || await d.trimiteAlerta(x.mesaj, b.id || null, x.mesaj.cheie)) st.miscari[cheie] = x.stare;
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
    if (!x.mesaj || await d.trimiteAlerta(x.mesaj, null, x.mesaj.cheie)) st.miscari[cheie] = x.stare;
  }
}

// ---- 5. poza zilnica a pietei (pentru "ce s-a schimbat de ieri"), dupa ora 9 ----
async function poza(d, st, acum) {
  const r = ceas(acum, "Europe/Bucharest");
  if (r.min < 540 || st.pozaZi === r.zi || !st.ult) return;
  await d.trimite("/api/istoric-bot?action=piata", { la: acum, instantaneu: Object.assign({ zi: r.zi, fundingMed: st.funding ? st.funding.mediana : null }, st.ult) });
  st.pozaZi = r.zi;
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
  return st;
}
