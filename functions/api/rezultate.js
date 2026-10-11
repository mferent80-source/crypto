// Rezultate (calendarul raportărilor) — v100.163, 11.10.2026. Pagina earnings-hub din premarket_scanner mutată în Radar.
// Cheia Finnhub stă în KV-ul de acasă (ISTORIC, „finnhub:cheie”), pusă o singură dată din pagină; nu se întoarce niciodată.
//   GET  ?action=stare               -> { areCheie }
//   POST ?action=cheie {cheie}       -> salvează cheia (doar de pe aceeași origine)
//   GET  ?action=calendar&zile=7|14|30 -> { la, zile, items:[{s,data,ora,epsEst,epsAct,venitEst}] } — toată piața, doar SUA
//   GET  ?action=istoric&s=SIMBOL    -> { s, items:[{data,ora,epsEst,epsAct,surpriza,reactie,reactie5}] } — ultimii 2 ani
//   GET  ?action=simboluri           -> { simboluri:[...] } — lista urmărită, din workerul paznic-radar (PAZNIC_URL/TOKEN de acasă)
// Logica e cea din premarket_scanner/lib/earnings.js (filtrul de ticker SUA, reacția amc/bmo); în plus reacția pe 5 zile.
import { requireApiAuth, authErrorResponse, sameOrigin } from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const BAZA = "https://finnhub.io/api/v1";
const CHEIE_KV = "finnhub:cheie";
const ZI = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const nr = (x) => (typeof x === "number" && isFinite(x) ? x : null);
const cache = new Map(); // cheie -> {pana, valoare}, în memoria serverului de acasă
const dinCache = (k) => { const c = cache.get(k); return c && c.pana > Date.now() ? c.valoare : null; };
const inCache = (k, v, sec) => { cache.set(k, { pana: Date.now() + sec * 1000, valoare: v }); if (cache.size > 200) cache.delete(cache.keys().next().value); };

async function cheie(env) {
  try { const k = env.ISTORIC && env.ISTORIC.get ? await env.ISTORIC.get(CHEIE_KV) : null; if (k) return String(k); } catch {}
  return env.FINNHUB_API_KEY ? String(env.FINNHUB_API_KEY) : "";
}
async function finnhub(url) {
  const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Finnhub a răspuns " + r.status);
  return r.json();
}

async function calendar(env, zile) {
  const k = await cheie(env); if (!k) return json({ error: "fără cheie — pune cheia Finnhub în pagina Rezultate" }, 409);
  const ck = "cal:" + zile + ":" + iso(Date.now()) + ":" + k.slice(-4);
  const c = dinCache(ck); if (c) return json(c);
  let d; try { d = await finnhub(BAZA + "/calendar/earnings?from=" + iso(Date.now()) + "&to=" + iso(Date.now() + zile * ZI) + "&token=" + encodeURIComponent(k)); }
  catch (e) { return json({ error: e.message || "Finnhub nu a răspuns" }, 502); }
  const items = (Array.isArray(d && d.earningsCalendar) ? d.earningsCalendar : [])
    .filter((e) => e && /^[A-Z][A-Z0-9]{0,4}$/.test(String(e.symbol || "")) && (e.epsEstimate != null || e.revenueEstimate != null || e.epsActual != null))
    .map((e) => ({ s: e.symbol, data: String(e.date || ""), ora: String(e.hour || ""), epsEst: nr(e.epsEstimate), epsAct: nr(e.epsActual), venitEst: nr(e.revenueEstimate) }))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : (b.venitEst || 0) - (a.venitEst || 0)));
  const o = { la: Date.now(), zile, items };
  inCache(ck, o, 3600);
  return json(o);
}

async function istoric(env, s) {
  const k = await cheie(env); if (!k) return json({ error: "fără cheie — pune cheia Finnhub în pagina Rezultate" }, 409);
  const ck = "ist:" + s + ":" + iso(Date.now());
  const c = dinCache(ck); if (c) return json(c);
  const de = iso(Date.now() - 2 * 365 * ZI), azi = iso(Date.now());
  let cal, pret = null;
  try { cal = await finnhub(BAZA + "/calendar/earnings?symbol=" + encodeURIComponent(s) + "&from=" + de + "&to=" + azi + "&token=" + encodeURIComponent(k)); }
  catch (e) { return json({ error: e.message || "Finnhub nu a răspuns" }, 502); }
  try { const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(s) + "?interval=1d&range=2y", { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) }); if (r.ok) pret = await r.json(); } catch {}
  const peZi = {}, zile = [];
  const res = pret && pret.chart && pret.chart.result && pret.chart.result[0];
  if (res && Array.isArray(res.timestamp)) {
    const cl = ((res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}).close || [];
    res.timestamp.forEach((t, i) => { if (cl[i] == null) return; const z = iso(t * 1000); if (!(z in peZi)) zile.push(z); peZi[z] = cl[i]; });
  }
  zile.sort();
  const indexZi = (z) => zile.findIndex((x) => x >= z);
  const reactie = (iDupa, n) => { const iIn = iDupa - 1, iSf = iDupa + n - 1; if (iIn < 0 || iSf >= zile.length) return null; const a = peZi[zile[iIn]], b = peZi[zile[iSf]]; return a > 0 && b > 0 ? ((b - a) / a) * 100 : null; };
  const items = (Array.isArray(cal && cal.earningsCalendar) ? cal.earningsCalendar : []).filter((e) => e && e.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((e) => {
      let r1 = null, r5 = null;
      const i = indexZi(e.date);
      // „amc” = după închidere ⇒ reacția e a ZILEI URMĂTOARE; „bmo” = înainte de deschidere ⇒ chiar a zilei raportării
      if (i >= 0 && zile[i] === e.date) { const iDupa = e.hour === "amc" ? i + 1 : i; r1 = reactie(iDupa, 1); r5 = reactie(iDupa, 5); }
      const surpriza = nr(e.epsActual) !== null && nr(e.epsEstimate) !== null && e.epsEstimate !== 0 ? ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100 : null;
      return { data: String(e.date), ora: String(e.hour || ""), epsEst: nr(e.epsEstimate), epsAct: nr(e.epsActual), surpriza, reactie: r1, reactie5: r5 };
    });
  const o = { s, items };
  inCache(ck, o, 6 * 3600);
  return json(o);
}

async function simboluri(env) {
  const url = String(env.PAZNIC_URL || "").replace(/\/+$/, ""), tok = String(env.PAZNIC_TOKEN || "");
  if (!url || !tok) return json({ simboluri: [], eroare: "PAZNIC_URL / PAZNIC_TOKEN lipsesc din .dev.vars" });
  const c = dinCache("sim"); if (c) return json(c);
  try {
    const r = await fetch(url + "/simboluri", { headers: { authorization: "Bearer " + tok }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return json({ simboluri: [], eroare: "lista urmărită: workerul a răspuns " + r.status });
    const d = await r.json();
    const o = { simboluri: (Array.isArray(d && d.simboluri) ? d.simboluri : []).map((x) => String((x && x.s) || "").toUpperCase()).filter((x) => /^[A-Z0-9][A-Z0-9.\-]{0,19}$/.test(x)) };
    inCache("sim", o, 600);
    return json(o);
  } catch (e) { return json({ simboluri: [], eroare: "lista urmărită: " + (e.message || "workerul nu a răspuns") }); }
}

// doar pentru probe: memoria e a izolatului, iar probele cheamă modulul de mai multe ori în același proces
export function _golesteCache() { cache.clear(); }

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "rezultate", 120); if (!auth.ok) return authErrorResponse(auth, H);
  const u = new URL(request.url), a = u.searchParams.get("action") || "";
  if (a === "stare") return json({ areCheie: !!(await cheie(env)) });
  if (a === "calendar") { const z = Number(u.searchParams.get("zile")); return calendar(env, [7, 14, 30].includes(z) ? z : 14); }
  if (a === "istoric") { const s = String(u.searchParams.get("s") || "").toUpperCase(); if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(s)) return json({ error: "Simbol nevalid." }, 400); return istoric(env, s); }
  if (a === "simboluri") return simboluri(env);
  return json({ error: "Acțiune necunoscută." }, 400);
}

export async function onRequestPost({ request, env }) {
  const auth = await requireApiAuth(request, env, "rezultate-scrie", 20); if (!auth.ok) return authErrorResponse(auth, H);
  if (!sameOrigin(request)) return json({ error: "Origin rejected" }, 403);
  if (new URL(request.url).searchParams.get("action") !== "cheie") return json({ error: "Acțiune necunoscută." }, 400);
  if (!env.ISTORIC || !env.ISTORIC.put) return json({ error: "KV-ul de acasă lipsește" }, 503);
  let corp; try { corp = JSON.parse((await request.text()).slice(0, 2000)); } catch { return json({ error: "JSON invalid" }, 400); }
  const k = String((corp && corp.cheie) || "").trim();
  if (!/^[A-Za-z0-9]{16,64}$/.test(k)) return json({ error: "Cheia Finnhub are doar litere și cifre (16–64)." }, 400);
  await env.ISTORIC.put(CHEIE_KV, k);
  cache.clear();
  return json({ ok: true, areCheie: true });
}
