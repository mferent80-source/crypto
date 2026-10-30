// Rezultate (calendarul raportărilor) — v100.163, 11.10.2026. Pagina earnings-hub din premarket_scanner mutată în Radar.
// Cheia Finnhub stă în KV-ul de acasă (ISTORIC, „finnhub:cheie”), pusă o singură dată din pagină; nu se întoarce niciodată.
//   GET  ?action=stare               -> { areCheie }
//   POST ?action=cheie {cheie}       -> salvează cheia (doar de pe aceeași origine)
//   GET  ?action=calendar&zile=7|14|30 -> { la, zile, items:[{s,data,ora,epsEst,epsAct,venitEst}] } — toată piața, doar SUA
//   GET  ?action=istoric&s=SIMBOL    -> { s, items:[{data,ora,oraDedusa?,epsEst,epsAct,surpriza,reactie,reactie5}] } — Nasdaq (ultimele 4) + Finnhub dacă dă; fără cheie merge
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
// v100.272 (ideile auditului 29.10): cheia în antetul X-Finnhub-Token (documentația Finnhub îl acceptă), nu în URL - un URL ajunge în jurnale
async function finnhub(url, k) {
  const r = await fetch(url, { headers: { accept: "application/json", "X-Finnhub-Token": k }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Finnhub a răspuns " + r.status);
  return r.json();
}

async function calendar(env, zile) {
  const k = await cheie(env); if (!k) return json({ error: "fără cheie — pune cheia Finnhub în pagina Rezultate" }, 409);
  const ck = "cal:" + zile + ":" + iso(Date.now()) + ":" + k.slice(-4);
  const c = dinCache(ck); if (c) return json(c);
  let d; try { d = await finnhub(BAZA + "/calendar/earnings?from=" + iso(Date.now()) + "&to=" + iso(Date.now() + zile * ZI), k); }
  catch (e) { return json({ error: e.message || "Finnhub nu a răspuns" }, 502); }
  const items = (Array.isArray(d && d.earningsCalendar) ? d.earningsCalendar : [])
    .filter((e) => e && /^[A-Z][A-Z0-9]{0,4}$/.test(String(e.symbol || "")) && (e.epsEstimate != null || e.revenueEstimate != null || e.epsActual != null))
    .map((e) => ({ s: e.symbol, data: String(e.date || ""), ora: String(e.hour || ""), epsEst: nr(e.epsEstimate), epsAct: nr(e.epsActual), venitEst: nr(e.revenueEstimate) }))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : (b.venitEst || 0) - (a.venitEst || 0)));
  const o = { la: Date.now(), zile, items };
  inCache(ck, o, 3600);
  return json(o);
}

// v100.165 (12.10): cu cheia gratuită Finnhub NU dă calendarul în urmă (gol chiar și pe o lună) ⇒ istoricul ieșea gol pentru orice simbol.
// Datele + EPS vin acum din Nasdaq (fără cheie, ultimele 4 raportări); Finnhub se adaugă doar dacă dă ceva (cheie plătită, cu ora).
// Ora (înainte de deschidere / după închidere) n-o dă nimeni pentru trecut ⇒ întâi OBICEIUL firmei (ora următoarei raportări confirmate la Finnhub —
// firmele o păstrează), abia apoi prețul: ziua cu saltul mai mare la deschidere e ziua reacției (pe date reale prețul a greșit JPM și NVDA).
const UA_NASDAQ = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36", accept: "application/json, text/plain, */*" };
const nrText = (x) => { const v = typeof x === "number" ? x : parseFloat(String(x == null ? "" : x).replace(/[$,]/g, "")); return isFinite(v) ? v : null; };
async function nasdaqRaportari(s) {
  try {
    const r = await fetch("https://api.nasdaq.com/api/company/" + encodeURIComponent(s) + "/earnings-surprise", { headers: UA_NASDAQ, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return [];
    const d = await r.json();
    const rows = (d && d.data && d.data.earningsSurpriseTable && d.data.earningsSurpriseTable.rows) || [];
    return rows.map((x) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(x.dateReported || "").trim()); return m ? { date: m[3] + "-" + m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0"), hour: "", epsActual: nrText(x.eps), epsEstimate: nrText(x.consensusForecast) } : null; }).filter(Boolean);
  } catch { return []; }
}

async function istoric(env, s) {
  const ck = "ist:" + s + ":" + iso(Date.now());
  const c = dinCache(ck); if (c) return json(c);
  const k = await cheie(env);
  const de = iso(Date.now() - 2 * 365 * ZI), azi = iso(Date.now());
  let cal = null, pret = null, nasdaq = [], obicei = "";
  const yahoo = (async () => { try { const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(s) + "?interval=1d&range=2y", { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) }); if (r.ok) pret = await r.json(); } catch {} })();
  const fh = k ? (async () => { try { cal = await finnhub(BAZA + "/calendar/earnings?symbol=" + encodeURIComponent(s) + "&from=" + de + "&to=" + azi, k); } catch {} })() : null;
  const viitor = k ? (async () => { try { const v = await finnhub(BAZA + "/calendar/earnings?symbol=" + encodeURIComponent(s) + "&from=" + azi + "&to=" + iso(Date.now() + 120 * ZI), k); const l = (Array.isArray(v && v.earningsCalendar) ? v.earningsCalendar : []).filter((e) => e && e.date && (e.hour === "amc" || e.hour === "bmo")).sort((a, b) => (a.date < b.date ? -1 : 1)); if (l.length) obicei = l[0].hour; } catch {} })() : null;
  await Promise.all([yahoo, fh, viitor, (async () => { nasdaq = await nasdaqRaportari(s); })()]);
  const peZi = {}, deschPeZi = {}, zile = [];
  const res = pret && pret.chart && pret.chart.result && pret.chart.result[0];
  if (res && Array.isArray(res.timestamp)) {
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}, cl = q.close || [], op = q.open || [];
    res.timestamp.forEach((t, i) => { if (cl[i] == null) return; const z = iso(t * 1000); if (!(z in peZi)) zile.push(z); peZi[z] = cl[i]; if (op[i] != null) deschPeZi[z] = op[i]; });
  }
  zile.sort();
  const indexZi = (z) => zile.findIndex((x) => x >= z);
  const reactie = (iDupa, n) => { const iIn = iDupa - 1, iSf = iDupa + n - 1; if (iIn < 0 || iSf >= zile.length) return null; const a = peZi[zile[iIn]], b = peZi[zile[iSf]]; return a > 0 && b > 0 ? ((b - a) / a) * 100 : null; };
  const salt = (i) => { if (i < 1 || i >= zile.length) return null; const o = deschPeZi[zile[i]], a = peZi[zile[i - 1]]; return o > 0 && a > 0 ? Math.abs(o / a - 1) : null; };
  const pePeData = {};
  for (const e of nasdaq) pePeData[e.date] = e;
  for (const e of (Array.isArray(cal && cal.earningsCalendar) ? cal.earningsCalendar : [])) if (e && e.date) pePeData[e.date] = Object.assign({}, pePeData[e.date] || {}, e, { epsActual: nr(e.epsActual) !== null ? e.epsActual : (pePeData[e.date] || {}).epsActual, epsEstimate: nr(e.epsEstimate) !== null ? e.epsEstimate : (pePeData[e.date] || {}).epsEstimate });
  const items = Object.values(pePeData).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((e) => {
    let r1 = null, r5 = null, ora = String(e.hour || ""), oraDedusa = false, oraObicei = false;
    const i = indexZi(e.date);
    if (i >= 0 && zile[i] === e.date) {
      if (ora !== "amc" && ora !== "bmo" && ora !== "dmh" && obicei) { ora = obicei; oraObicei = true; }
      if (ora !== "amc" && ora !== "bmo" && ora !== "dmh") { const sZi = salt(i), sDupa = salt(i + 1); if (sZi !== null && sDupa !== null) { ora = sDupa > sZi ? "amc" : "bmo"; oraDedusa = true; } }
      // „amc” = după închidere ⇒ reacția e a ZILEI URMĂTOARE; „bmo” / „dmh” ⇒ chiar a zilei raportării.
      // v100.172: ora necunoscută NU se mai presupune „înainte de deschidere” (reacția ar fi putut fi a zilei greșite) ⇒ reacția lipsește
      if (ora === "amc" || ora === "bmo" || ora === "dmh") { const iDupa = ora === "amc" ? i + 1 : i; r1 = reactie(iDupa, 1); r5 = reactie(iDupa, 5); }
    }
    const ea = nr(e.epsActual), ee = nr(e.epsEstimate);
    const surpriza = ea !== null && ee !== null && ee !== 0 ? ((ea - ee) / Math.abs(ee)) * 100 : null;
    const o = { data: String(e.date), ora, epsEst: ee, epsAct: ea, surpriza, reactie: r1, reactie5: r5 };
    if (oraDedusa) o.oraDedusa = true;
    if (oraObicei) o.oraObicei = true;
    return o;
  });
  // revizia Opus v100.171: istoricul se ține minte 6 ore DOAR când sursele au răspuns; altfel se spune ce lipsește (nu „n-am găsit raportări”)
  const o = { s, items };
  const faraPret = !(res && Array.isArray(res.timestamp) && res.timestamp.length);
  if (!items.length) return json({ s, items: [], eroare: "n-am primit raportările trecute de la Nasdaq (n-a răspuns sau nu are simbolul) — încearcă din nou mai târziu" });
  if (faraPret) { o.eroarePret = "prețurile (Yahoo) n-au venit — reacțiile lipsesc, încearcă din nou mai târziu"; return json(o); }
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
