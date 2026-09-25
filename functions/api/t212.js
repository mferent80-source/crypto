// Trading 212 (Invest) - DOAR CITIRE (v85). Cheile T212_API_KEY / T212_API_SECRET stau in .dev.vars
// (acasa); pe pagina publicata nu sunt puse. Probat in scripts/t212-v85.mjs cu fetch fals.
//   ?action=cont      -> sold (cash) + moneda contului
//   ?action=pozitii   -> pozitiile deschise (cere permisiunea "Portfolio" pe cheie)
//   ?action=ordine[&cursor=<cifre>] -> o pagina de istoric (50), cu cursorul paginii urmatoare
//   ?action=preturi&ticker=AAPL_US_EQ&interval=1d|1h -> lumanari (Twelve Data daca e cheia, altfel Yahoo)
//                                                       in forma randurilor Pionex {time, open, high, low, close}
// Verificat pe contul lui (25.09): istoricul vine ca items[{order, fill}], pagini cu nextPagePath.
import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const BAZA = "https://live.trading212.com/api/v0";
const PERMISIUNE = { cont: "Account data", pozitii: "Portfolio", ordine: "History / Orders" };
const cache = new Map(); // cheie -> {pana, valoare} (in memoria serverului de acasa)

function dinCache(k) { const c = cache.get(k); return c && c.pana > Date.now() ? c.valoare : null; }
function inCache(k, v, sec) { cache.set(k, { pana: Date.now() + sec * 1000, valoare: v }); if (cache.size > 300) cache.delete(cache.keys().next().value); }

async function t212(env, cale, actiune) {
  const r = await fetch(BAZA + cale, { headers: { Authorization: "Basic " + btoa(env.T212_API_KEY + ":" + env.T212_API_SECRET), accept: "application/json" } });
  if (r.status === 429) { const ra = Number(r.headers.get("x-ratelimit-reset")); throw Object.assign(new Error("Trading 212 a limitat cererile"), { status: 429, retryAfter: ra > 1e9 ? Math.max(1, Math.round(ra - Date.now() / 1000)) : 30 }); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error("Cheia Trading 212 n-are voie aici: bifează permisiunea „" + (PERMISIUNE[actiune] || actiune) + "” când generezi cheia (Settings → API)."), { status: 403 });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
  if (!r.ok) throw Object.assign(new Error("Trading 212: HTTP " + r.status), { status: 502 });
  if (j === null) throw Object.assign(new Error("Trading 212: răspuns care nu e JSON"), { status: 502 });
  return j;
}

// AAPL_US_EQ -> [AAPL]; SNDK1_US_EQ -> [SNDK1, SNDK]; BRK.B_US_EQ -> [BRK-B]; ne-US -> []
function candidati(ticker) {
  const m = String(ticker || "").match(/^([A-Za-z0-9.]+)_US_EQ$/);
  if (!m) return [];
  const s = m[1].toUpperCase().replace(/\./g, "-"), out = [s], fara = s.replace(/\d+$/, "");
  if (fara && fara !== s) out.push(fara);
  return out;
}
async function yahoo(simbol, interval) {
  const range = interval === "1h" ? "60d" : "2y";
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbol)}?interval=${interval}&range=${range}`, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  let j = null; try { j = await r.json(); } catch {}
  const res = j && j.chart && Array.isArray(j.chart.result) ? j.chart.result[0] : null;
  if (!r.ok || !res || !Array.isArray(res.timestamp)) return null;
  const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}, out = [];
  res.timestamp.forEach((t, i) => {
    const o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], c = q.close && q.close[i];
    if ([o, h, l, c].every((x) => typeof x === "number" && x > 0)) out.push({ time: t * 1000, open: o, high: h, low: l, close: c, volume: typeof (q.volume && q.volume[i]) === "number" ? q.volume[i] : null });
  });
  return out.length ? out : null;
}
async function twelve(env, simbol, interval) {
  const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbol)}&interval=${interval === "1h" ? "1h" : "1day"}&outputsize=500&order=asc&timezone=UTC&apikey=${encodeURIComponent(env.TWELVE_DATA_API_KEY)}`);
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || !Array.isArray(j.values)) return null;
  const out = j.values.map((v) => ({ time: Date.parse(String(v.datetime).replace(" ", "T") + (String(v.datetime).length <= 10 ? "T00:00:00Z" : "Z")), open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close), volume: v.volume == null ? null : Number(v.volume) }))
    .filter((x) => Number.isFinite(x.time) && [x.open, x.high, x.low, x.close].every((y) => Number.isFinite(y) && y > 0));
  return out.length ? out : null;
}

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "t212", 60); if (!auth.ok) return authErrorResponse(auth, H);
  const u = new URL(request.url), a = u.searchParams.get("action") || "";
  try {
    if (a === "preturi") {
      const tk = String(u.searchParams.get("ticker") || "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 32), iv = u.searchParams.get("interval") === "1h" ? "1h" : "1d";
      const cand = candidati(tk);
      if (!cand.length) return json({ error: "Nu știu simbolul american pentru " + tk + " (doar acțiuni _US_EQ)." }, 404);
      const k = "p:" + tk + ":" + iv, c = dinCache(k); if (c) return json(c);
      for (const s of cand) {
        let rows = null, sursa = null;
        if (env.TWELVE_DATA_API_KEY) { rows = await twelve(env, s, iv); sursa = "twelvedata"; }
        if (!rows) { rows = await yahoo(s, iv); sursa = "yahoo"; }
        if (rows) { const v = { ticker: tk, simbol: s, sursa, interval: iv, randuri: rows }; inCache(k, v, iv === "1h" ? 300 : 1800); return json(v); }
      }
      return json({ error: "Fără prețuri pentru " + tk + " (poate a fost delistată sau redenumită)." }, 404);
    }
    if (!(env.T212_API_KEY && env.T212_API_SECRET)) return json({ error: "Lipsesc T212_API_KEY / T212_API_SECRET în .dev.vars — pune-le cu PUNE-CHEILE-T212.bat și repornește Radarul." }, 503);
    if (a === "cont") {
      const c = dinCache("cont"); if (c) return json(c);
      const cash = await t212(env, "/equity/account/cash", "cont"), info = await t212(env, "/equity/account/info", "cont");
      const v = { moneda: info && info.currencyCode || null, cash }; inCache("cont", v, 60); return json(v);
    }
    if (a === "pozitii") {
      const c = dinCache("poz"); if (c) return json(c);
      const p = await t212(env, "/equity/portfolio", "pozitii");
      const v = { pozitii: Array.isArray(p) ? p : [] }; inCache("poz", v, 30); return json(v);
    }
    if (a === "ordine") {
      const cur = u.searchParams.get("cursor");
      if (cur !== null && !/^\d{1,20}$/.test(cur)) return json({ error: "cursor invalid" }, 400);
      const k = "o:" + (cur || ""), c = dinCache(k); if (c) return json(c);
      const d = await t212(env, "/equity/history/orders?limit=50" + (cur ? "&cursor=" + cur : ""), "ordine");
      const np = d && typeof d.nextPagePath === "string" ? d.nextPagePath : "";
      const m = np.startsWith("/api/v0/equity/history/orders?") ? np.match(/[?&]cursor=(\d{1,20})/) : null;
      const v = { items: Array.isArray(d && d.items) ? d.items : [], cursor: m ? m[1] : null }; inCache(k, v, 30); return json(v);
    }
    return json({ error: "Acțiune necunoscută" }, 400);
  } catch (e) {
    const s = e.status || 502;
    return json(Object.assign({ error: e.message }, s === 429 ? { retryAfter: e.retryAfter || 30 } : {}), s);
  }
}
