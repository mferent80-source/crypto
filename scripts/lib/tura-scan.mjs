// Tura de SCAN a colectorului (v96): rezumatul zilnic al fiecarei monede din clasamentul top 100 PERP si al fiecarei
// actiuni (Nasdaq 100 + ce are el in T212), urcat in KV -> pagina Scan il citeste dintr-o singura cerere.
// Ritm: crypto o data pe ora; actiunile o data pe ora cat bursa e deschisa, o data dupa inchidere si oricand
// ultimul scan e mai vechi de 20 de ore (weekend, colector repornit). Numele: o data pe zi, doar ce lipseste.
// Probat in scripts/scan-v96.mjs (server fals).
// v96.2: o data pe zi, pe fiecare piata, "cat a mers reteta in trecut" (Scan.istoricRetete pe barele deja aduse) si,
// dupa fiecare scan, alerta pe Discord cand un simbol URMARIT de el intra intr-o reteta sau iese din ea.
// d = { cere, trimite, trimiteAlerta?, afara(url) -> JSON, jurnal, pauza, Scan, GridCalcul, NDX, pauzaMs? }
const ORA = 3600000;
function ceas(acum, tz) {
  const o = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)).forEach((x) => { o[x.type] = x.value; });
  return { zi: o.year + "-" + o.month + "-" + o.day, sapt: o.weekday, min: Number(o.hour) * 60 + Number(o.minute) };
}
function bursa(acum) {
  const n = ceas(acum, "America/New_York"), lucru = ["Sat", "Sun"].indexOf(n.sapt) < 0;
  return { zi: n.zi, deschisa: lucru && n.min >= 570 && n.min < 960, dupaInchidere: lucru && n.min >= 965 };
}
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("scan " + ce, e.message); return null; } }
// barele cu volum: GridCalcul le curata (fara volum), volumul se ia din randul brut cu acelasi timp
function cuVolum(G, randuri, cheieV) {
  const v = {}; (Array.isArray(randuri) ? randuri : []).forEach((r) => { if (r && !Array.isArray(r)) v[Number(r.time)] = Number(r[cheieV]); });
  return G.bareToate(randuri).map((b) => ({ ...b, v: Number.isFinite(v[b.t]) ? v[b.t] : null }));
}

export async function scanCrypto(d, acum) {
  const cl = await d.cere("/api/istoric-bot?action=clasament"), m = cl && cl.clasament && Array.isArray(cl.clasament.monede) ? cl.clasament.monede : [];
  if (!m.length) { d.jurnal("scan crypto: clasamentul e gol, astept"); return null; }
  const randuri = [], bare = [];
  for (let i = 0; i < m.length; i++) {
    const x = m[i], s = String(x.simbol || "").replace(/_USDT_PERP$/, "");
    if (i) await d.pauza(d.pauzaMs == null ? 900 : d.pauzaMs);
    const k = await incearca(d, s, () => d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(x.simbol) + "&interval=1D&limit=400"));
    const b = cuVolum(d.GridCalcul, k && k.data && k.data.klines, "volume"), z = d.Scan.rezumat(b);
    if (!z) continue;
    bare.push(b);
    randuri.push({ s, ...z, vol: Number(x.volum) || z.vol, rang: i + 1, gs: Number(x.scor) || 0, stare: x.stare, dir: x.dir, tarie: x.tarie, miscare: !!(x.regim && x.regim.miscare),
      grile: x.grile, pas: x.pas, traversari: x.traversariZi, latime: x.latime });
  }
  if (randuri.length < m.length * 0.8) { d.jurnal("scan crypto NEURCAT:", randuri.length, "din", m.length); return null; }
  await d.trimite("/api/istoric-bot?action=scan", { fel: "c", la: acum, randuri });
  randuri.bare = bare;
  return randuri;
}

export async function scanActiuni(d, acum) {
  const poz = await incearca(d, "pozitii", () => d.cere("/api/t212?action=pozitii"));
  const ale = (Array.isArray(poz) ? poz : poz && (poz.items || poz.pozitii) || []).map((x) => x && x.ticker).filter((t) => /_US_EQ$/.test(String(t)));
  const lista = [], vazut = new Set();
  for (const s of d.NDX || []) if (!vazut.has(s)) { vazut.add(s); lista.push({ s, tk: s + "_US_EQ" }); }
  for (const tk of ale) { const s = tk.replace(/_US_EQ$/, "").replace(/\d+$/, ""); if (!vazut.has(s)) { vazut.add(s); lista.push({ s, tk, al: true }); } }
  const randuri = [], bare = [];
  for (let i = 0; i < lista.length; i++) {
    const x = lista[i];
    if (i) await d.pauza(d.pauzaMs == null ? 700 : d.pauzaMs);
    const r = await incearca(d, x.s, () => d.cere("/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.tk)));
    const b = cuVolum(d.GridCalcul, r && r.randuri, "volume"), z = d.Scan.rezumat(b);
    if (z) bare.push(b);
    if (z) randuri.push({ s: x.s, tk: x.tk, ...z, ...(x.al ? { inafara: !new Set(d.NDX || []).has(x.s) } : {}) });
  }
  if (randuri.length < lista.length * 0.8) { d.jurnal("scan actiuni NEURCAT:", randuri.length, "din", lista.length); return null; }
  await d.trimite("/api/istoric-bot?action=scan", { fel: "a", la: acum, randuri });
  randuri.bare = bare;
  return randuri;
}

// numele: CoinGecko (primele 500 dupa capitalizare; la simbol dublu castiga cea mai mare) + Yahoo pentru actiuni
export async function scanNume(d, cr, ac, vechi) {
  const nume = { ...(vechi || {}) }, lipsaC = (cr || []).filter((x) => !nume["c" + x.s]), lipsaA = (ac || []).filter((x) => !nume["a" + x.s]);
  if (lipsaC.length) {
    const gasit = {};
    for (const pg of [1, 2]) {
      const l = await incearca(d, "coingecko", () => d.afara("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=" + pg));
      (Array.isArray(l) ? l : []).forEach((x) => { const s = String(x && x.symbol || "").toUpperCase(); if (s && !gasit[s]) gasit[s] = String(x.name || "").slice(0, 60); });
      await d.pauza(1500);
    }
    lipsaC.forEach((x) => { if (gasit[x.s]) nume["c" + x.s] = gasit[x.s]; });
  }
  for (const x of lipsaA.slice(0, 120)) {
    const j = await incearca(d, "nume " + x.s, () => d.afara("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(x.s) + "?range=5d&interval=1d"));
    const mt = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
    if (mt && (mt.longName || mt.shortName)) nume["a" + x.s] = String(mt.longName || mt.shortName).slice(0, 80);
    await d.pauza(300);
  }
  if (Object.keys(nume).length !== Object.keys(vechi || {}).length) await d.trimite("/api/istoric-bot?action=scan", { nume });
  return nume;
}

// alerta pentru simbolurile urmarite: intrare / iesire din reteta fata de scanul trecut (primul scan doar tine minte)
export async function anuntaUrmarite(d, st, fel, randuri, urmarite) {
  st.urm = st.urm || {};
  const pe = new Set((urmarite || []).filter((id) => id[0] === fel)), R = d.Scan.RETETE;
  for (const x of randuri || []) {
    const id = fel + x.s; if (!pe.has(id)) { delete st.urm[id]; continue; }
    const acum = d.Scan.retete({ ...x, fel }), vechi = st.urm[id];
    st.urm[id] = acum;
    if (!vechi) continue;
    const nume = (k) => (R.find((r) => r.k === k) || {}).t || k, pret = (fel === "a" ? "$" : "") + x.p;
    const ch = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + "%";
    for (const k of acum.filter((k) => !vechi.includes(k))) {
      const m = { nivel: "info", titlu: "🔔 " + x.s + " a intrat în " + nume(k), mesaj: "Preț " + pret + " · azi " + ch(x.ch) + " · 7 zile " + ch(x.ch7) + " · RSI " + Math.round(x.rsi) + ". Pe Scan, rândul " + x.s + " arată graficul și planul.", cheie: "reteta-" + id + "-" + k };
      if (d.trimiteAlerta) await d.trimiteAlerta(m, null, m.cheie);
    }
    for (const k of vechi.filter((k) => !acum.includes(k))) {
      const m = { nivel: "info", titlu: "🔕 " + x.s + " a ieșit din " + nume(k), mesaj: "Preț " + pret + " · azi " + ch(x.ch) + " · 7 zile " + ch(x.ch7) + ".", cheie: "reteta-iesit-" + id + "-" + k };
      if (d.trimiteAlerta) await d.trimiteAlerta(m, null, m.cheie);
    }
  }
}

export async function turaScan(d, st, acum) {
  const la = (k) => st[k] || 0;
  let cr = null, ac = null;
  if (acum - la("crLa") >= ORA) { cr = await incearca(d, "crypto", () => scanCrypto(d, acum)); st.crLa = cr ? acum : acum - ORA + 10 * 60000; if (cr) st.crN = cr.length; }
  const bu = bursa(acum);
  const deFacut = acum - la("acLa") >= 20 * ORA || (bu.deschisa && acum - la("acLa") >= ORA) || (bu.dupaInchidere && st.acInchisZi !== bu.zi);
  if (deFacut) {
    ac = await incearca(d, "actiuni", () => scanActiuni(d, acum));
    st.acLa = ac ? acum : acum - ORA + 15 * 60000; if (ac) { st.acN = ac.length; if (bu.dupaInchidere) st.acInchisZi = bu.zi; }
  }
  const zi = ceas(acum, "Europe/Bucharest").zi;
  // urmaritele lui: dupa fiecare scan, intrare / iesire din retete
  if (cr || ac) {
    const v = await incearca(d, "urmarite", () => d.cere("/api/istoric-bot?action=scan&doar=urmarite")), urm = v && Array.isArray(v.urmarite) ? v.urmarite : [];
    if (cr) await incearca(d, "urmarite crypto", () => anuntaUrmarite(d, st, "c", cr, urm));
    if (ac) await incearca(d, "urmarite actiuni", () => anuntaUrmarite(d, st, "a", ac, urm));
  }
  // cat a mers fiecare reteta in trecut: o data pe zi pe fiecare piata (cateva secunde de calcul)
  for (const [fel, l] of [["c", cr], ["a", ac]]) {
    if (!l || !l.bare || st["ist" + fel] === zi) continue;
    const ist = d.Scan.istoricRetete(l.bare, fel);
    const r = await incearca(d, "istoric " + fel, () => d.trimite("/api/istoric-bot?action=scan", { istoric: { fel, la: acum, ...ist } }));
    if (r) { st["ist" + fel] = zi; d.jurnal("scan istoric " + fel + ":", ist.instr, "instrumente,", ist.trend.s.n, "intrari in trend"); }
  }
  if ((cr || ac) && st.numeZi !== zi) {
    const v = await incearca(d, "citesc numele", () => d.cere("/api/istoric-bot?action=scan"));
    const n = await incearca(d, "numele", () => scanNume(d, cr || (v && v.crypto && v.crypto.randuri) || [], ac || (v && v.actiuni && v.actiuni.randuri) || [], v && v.nume));
    if (n) st.numeZi = zi;
  }
  if (cr || ac) d.jurnal("scan:", cr ? cr.length + " monede" : "", ac ? ac.length + " actiuni" : "");
  return st;
}
