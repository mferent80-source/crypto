// v101.170 (07.11.2026, I-843, el: „fă tot”): caietul de păreri judecate. O părere = moneda, șansa ca prețul să fie MAI SUS peste N zile,
// autorul (el sau Claude), ora notării (o pune serverul). Colectorul citește lista din KV (`pareri:lista`, scrisă de pagina Probe), ia din
// Binance (perpetuele) închiderea lumânării de 1 minut de la ora notării și pe cea de la termen, și scrie judecățile ÎNTREGI în
// `pareri:judecate` (pagina nu le atinge ⇒ nicio cursă între cele două scrieri). O dată pe oră; o judecată scrisă nu se mai schimbă.
// „Mai sus” = închiderea de la termen strict peste cea de la notare (egal = nu mai sus). Fără cost, fără funding: e un pariu pe direcție.
export const FAPI = "https://fapi.binance.com";
const MIN = 60000, ZI = 864e5, ORA = 3600000;
export const PAUZA_ORE = 1, ASTEPT_TERMEN_MIN = 2, RENUNT_ZILE = 3;

// simbolurile Binance în care se poate afla moneda (PEPE e „1000PEPEUSDT”): primul care există în exchangeInfo
export function variante(s) {
  const b = String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return b ? [[b + "USDT", 1], ["1000" + b + "USDT", 1000], ["1000000" + b + "USDT", 1e6], ["1M" + b + "USDT", 1e6]] : [];
}
export function simbolPentru(s, existente) { for (const [sim, mult] of variante(s)) if (existente.has(sim)) return { sim, mult }; return null; }
export function simboluriPerp(info) {
  const l = info && Array.isArray(info.symbols) ? info.symbols : [];
  return new Set(l.filter((x) => x && x.contractType === "PERPETUAL" && x.quoteAsset === "USDT").map((x) => String(x.symbol)));
}
// închiderea lumânării de 1 minut care CONȚINE momentul t (startTime = minutul lui t); null dacă Binance n-a dat exact minutul acela
export function inchidereMinut(k, t) {
  const m = Math.floor(t / MIN) * MIN, r = Array.isArray(k) ? k[0] : null;
  if (!Array.isArray(r) || Number(r[0]) !== m) return null;
  const c = Number(r[4]); return Number.isFinite(c) && c > 0 ? c : null;
}
export function termen(p) { return Number(p.la) + Number(p.zile) * ZI; }

// o trecere peste listă: ce judecăți noi se pot scrie acum. `bare(sim, t)` ⇒ răspunsul klines (sau null la eroare de rețea).
// Întoarce { judecate, schimbat } - judecățile vechi rămân neatinse (o judecată scrisă nu se rescrie).
export async function judecaLista(lista, vechi, existente, bare, acum) {
  const j = { ...(vechi && typeof vechi === "object" ? vechi : {}) }; let schimbat = false;
  const vii = new Set((Array.isArray(lista) ? lista : []).map((p) => p && p.id));
  for (const id of Object.keys(j)) if (!vii.has(id)) { delete j[id]; schimbat = true; }   // părere ștearsă în primele 15 minute
  for (const p of Array.isArray(lista) ? lista : []) {
    if (!p || !p.id || !(Number(p.la) > 0)) continue;
    const x = { ...(j[p.id] || {}) }, T = termen(p);
    if (x.y === 0 || x.y === 1 || x.eroare) continue;   // gata
    if (!x.sim) {
      const g = simbolPentru(p.s, existente);
      if (!g) { j[p.id] = { eroare: "moneda nu e pe Binance (perpetue USDT)", la: acum }; schimbat = true; continue; }
      x.sim = g.sim; x.mult = g.mult;
    }
    if (!(x.p0 > 0)) {
      if (acum - p.la < ASTEPT_TERMEN_MIN * MIN) { if (x.sim !== (j[p.id] || {}).sim) { j[p.id] = x; schimbat = true; } continue; }
      const c = inchidereMinut(await bare(x.sim, p.la), p.la);
      if (c == null) { if (acum - Math.max(Number(p.la), Number(p.creat) || 0) > RENUNT_ZILE * ZI) { j[p.id] = { ...x, eroare: "Binance n-a dat prețul de la ora notării" , la: acum }; schimbat = true; } else if (x.sim !== (j[p.id] || {}).sim) { j[p.id] = x; schimbat = true; } continue; }
      x.p0 = c; j[p.id] = x; schimbat = true;
    }
    if (acum < T + ASTEPT_TERMEN_MIN * MIN) continue;
    const c = inchidereMinut(await bare(x.sim, T), T);
    if (c == null) { if (acum - T > RENUNT_ZILE * ZI) { j[p.id] = { ...x, eroare: "Binance n-a dat prețul de la termen", la: acum }; schimbat = true; } continue; }
    j[p.id] = { ...x, pT: c, y: c > x.p0 ? 1 : 0, la: acum }; schimbat = true;
  }
  return { judecate: j, schimbat };
}

// tura din colector: o dată pe oră (stare.la), exchangeInfo o dată pe zi (stare.simZi)
export async function turaPareri(d, stare) {
  const acum = d.acum || Date.now();
  if (stare.inLucru || acum - (stare.la || 0) < PAUZA_ORE * ORA) return null;
  stare.inLucru = true;
  try {
    const r = await d.cere("/api/istoric-bot?action=pareri");
    const lista = r && Array.isArray(r.pareri) ? r.pareri : null;
    if (!lista) return null;   // serverul n-a răspuns: încerc la bucla următoare
    stare.la = acum;
    if (!lista.length && !Object.keys(r.judecate || {}).length) return { scrise: 0 };
    const zi = new Date(acum).toISOString().slice(0, 10);
    if (stare.simZi !== zi || !Array.isArray(stare.sim) || !stare.sim.length) {
      const info = await d.binance(FAPI + "/fapi/v1/exchangeInfo"), s = simboluriPerp(info);
      if (!s.size) { stare.la = acum - (PAUZA_ORE * ORA) + 10 * MIN; return null; }   // Binance n-a răspuns: reîncerc peste 10 minute
      stare.sim = [...s]; stare.simZi = zi;
    }
    const existente = new Set(stare.sim);
    const bare = (sim, t) => d.binance(`${FAPI}/fapi/v1/klines?symbol=${encodeURIComponent(sim)}&interval=1m&startTime=${Math.floor(t / MIN) * MIN}&limit=1`);
    const { judecate, schimbat } = await judecaLista(lista, r.judecate, existente, bare, acum);
    if (schimbat) await d.trimite("/api/istoric-bot?action=pareriJudecate", { la: acum, judecate });
    return { scrise: schimbat ? Object.keys(judecate).length : 0 };
  } finally { stare.inLucru = false; }
}
