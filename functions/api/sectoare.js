// Rotația sectoarelor US (v100.167, 12.10.2026) — pagina sector-rotation din premarket_scanner mutată în Radar.
//   GET /api/sectoare -> { la, serii: { SPY:[{t,c}], XLK:[...], ... } } — închiderile zilnice pe 6 luni (Yahoo, fără cheie)
// Calculele (Δ, forța față de S&P, cadranele, regimul) le face public/lib/sectoare.js, în pagină și în colector.
// Un simbol fără închideri lipsește din `serii` (pagina spune „parțial”); Yahoo căzut pe tot ⇒ 502 cu motivul.
import { requireApiAuth, authErrorResponse } from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const SIMBOLURI = ["SPY", "XLK", "XLY", "XLC", "XLF", "XLI", "XLB", "XLE", "XLRE", "XLV", "XLP", "XLU"];
const UA = { "user-agent": "Mozilla/5.0" };
let cache = null;   // { pana, valoare } în memoria serverului de acasă

async function serie(s) {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(s) + "?interval=1d&range=6mo", { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const j = await r.json(), res = j && j.chart && Array.isArray(j.chart.result) ? j.chart.result[0] : null;
    if (!res || !Array.isArray(res.timestamp)) return null;
    const cl = ((res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}).close || [], out = [];
    res.timestamp.forEach((t, i) => { const c = cl[i]; if (typeof c === "number" && isFinite(c) && c > 0) out.push({ t: t * 1000, c }); });
    return out.length ? out : null;
  } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "sectoare", 30); if (!auth.ok) return authErrorResponse(auth, H);
  if (cache && cache.pana > Date.now()) return json(cache.valoare);
  const l = await Promise.all(SIMBOLURI.map(serie)), serii = {};
  SIMBOLURI.forEach((s, i) => { if (l[i]) serii[s] = l[i]; });
  if (!Object.keys(serii).length) return json({ error: "Yahoo nu a dat închiderile sectoarelor acum" }, 502);
  const valoare = { la: Date.now(), serii };
  cache = { pana: Date.now() + 30 * 60000, valoare };
  return json(valoare);
}
export function _golesteCache() { cache = null; }   // doar pentru probe
