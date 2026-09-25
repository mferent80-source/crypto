// Trading 212 (Invest) - DOAR CITIRE (v85). Cheile T212_API_KEY / T212_API_SECRET stau in .dev.vars
// (acasa); pe pagina publicata nu sunt puse. Probat in scripts/t212-v85.mjs cu fetch fals.
//   ?action=cont      -> sold (cash) + moneda contului
//   ?action=pozitii   -> pozitiile deschise (cere permisiunea "Portfolio" pe cheie)
//   ?action=ordine[&cursor=<cifre>] -> o pagina de istoric (50), cu cursorul paginii urmatoare
//   ?action=preturi&ticker=AAPL_US_EQ&interval=1d|1h -> lumanari (Twelve Data daca e cheia, altfel Yahoo)
//                                                       in forma randurilor Pionex {time, open, high, low, close}
//   ?action=istoric   -> istoricul COMPLET al umplerilor, strans de colector in KV-ul de acasa (ISTORIC)
//   POST ?action=istoric {ordine:[id], umpleri:[...], stare} -> colectorul adauga o pagina (dedup pe id)
// Verificat pe contul lui (25.09): istoricul vine ca items[{order, fill}], pagini cu nextPagePath.
import {requireApiAuth,authErrorResponse,sameOrigin} from "../_shared/auth.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const BAZA = "https://live.trading212.com/api/v0";
const PERMISIUNE = { cont: "Account data", pozitii: "Portfolio", ordine: "History / Orders", dividende: "History / Dividends" };
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

// T212 pastreaza simbolul SPAC-ului de dinainte de listare (la fel in public/lib/t212.js)
const REDENUMIT = { NPA: "ASTS", XPOA: "QBTS", IPOB: "OPEN", ALUS: "TE", GWAC: "CIFR", SATS: "ECHO", FB: "META" };
// AAPL_US_EQ -> [AAPL]; SNDK1_US_EQ -> [SNDK1, SNDK]; BRK.B_US_EQ -> [BRK-B]; ne-US -> []
function candidati(ticker) {
  const m = String(ticker || "").match(/^([A-Za-z0-9.]+?)_+US_EQ$/);
  if (!m) return [];
  const s = m[1].toUpperCase().replace(/\./g, "-"), out = [s], fara = s.replace(/\d+$/, "");
  if (fara && fara !== s) out.push(fara);
  if (REDENUMIT[s]) out.unshift(REDENUMIT[s]);
  return out;
}
async function yahoo(simbol, interval) {
  const range = interval === "1h" ? "60d" : "2y";
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbol)}?interval=${interval}&range=${range}`, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  // refuzul Yahoo (prea multe cereri / pana) NU e "fara preturi": urca, ca cine cere sa reincerce mai tarziu
  if (r.status === 429) throw Object.assign(new Error("Yahoo a limitat cererile de prețuri"), { status: 429, retryAfter: 60 });
  if (r.status >= 500) throw Object.assign(new Error("Yahoo: HTTP " + r.status), { status: 502 });
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
// Rezerva: niciun simbol n-are preturi (redenumire noua) -> cauta compania dupa NUMELE din ordinele T212,
// doar pe bursele americane, si ia primul simbol care chiar are lumanari.
const BURSE_US = ["NMS", "NGM", "NCM", "NYQ", "ASE", "PCX", "BTS", "NAS", "NYS"];
async function dupaNume(nume) {
  const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(nume)}&quotesCount=6&newsCount=0`, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
  let j = null; try { j = await r.json(); } catch {}
  return (j && Array.isArray(j.quotes) ? j.quotes : []).filter((q) => q && q.quoteType === "EQUITY" && BURSE_US.includes(q.exchange) && /^[A-Z][A-Z0-9-]{0,9}$/.test(q.symbol || "")).map((q) => q.symbol).slice(0, 3);
}
// v87: data rezultatelor trimestriale, de la Nasdaq (fara cheie). Aceeasi regula ca T212.dataRezultate.
function dataRezultate(j) {
  const t = j && j.data && j.data.reportText; if (typeof t !== "string") return null;
  const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return null;
  return { data: m[3] + "-" + m[1] + "-" + m[2], sigur: !/estimated|expected/i.test(t) };
}
async function twelve(env, simbol, interval) {
  const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbol)}&interval=${interval === "1h" ? "1h" : "1day"}&outputsize=500&order=asc&timezone=UTC&apikey=${encodeURIComponent(env.TWELVE_DATA_API_KEY)}`);
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || !Array.isArray(j.values)) return null;
  const out = j.values.map((v) => ({ time: Date.parse(String(v.datetime).replace(" ", "T") + (String(v.datetime).length <= 10 ? "T00:00:00Z" : "Z")), open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close), volume: v.volume == null ? null : Number(v.volume) }))
    .filter((x) => Number.isFinite(x.time) && [x.open, x.high, x.low, x.close].every((y) => Number.isFinite(y) && y > 0));
  return out.length ? out : null;
}

// Istoricul complet: umplerile curatate (lipsa ramane null, nu 0), ordinele vazute (id-uri, ca tura
// colectorului sa stie unde se suprapune) si starea coborarii prin pagini.
const nr = (v) => { if (typeof v === "number") return Number.isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const txt = (v, m) => (typeof v === "string" ? v.slice(0, m) : "");
function curataUmplere(x) {
  if (!x || typeof x !== "object") return null;
  const id = txt(x.id, 40).replace(/[^A-Za-z0-9_-]/g, ""), t = nr(x.t), side = x.side === "BUY" || x.side === "SELL" ? x.side : null;
  const qty = nr(x.qty), pret = nr(x.pret), net = nr(x.net);
  if (!id || t === null || t <= 0 || !side || !(qty > 0) || !(pret > 0) || net === null) return null;
  return { id, t, side, ticker: txt(x.ticker, 40).replace(/[^A-Za-z0-9._]/g, ""), simbol: txt(x.simbol, 16).replace(/[^A-Za-z0-9.-]/g, ""), nume: txt(x.nume, 80),
    qty, pret, net, fee: nr(x.fee), moneda: txt(x.moneda, 3) || null, fx: nr(x.fx), ext: !!x.ext, realizat: side === "SELL" ? nr(x.realizat) : null };
}
async function citesteKv(env, k, implicit) { try { const v = JSON.parse((await env.ISTORIC.get(k)) || "null"); return v === null ? implicit : v; } catch { return implicit; } }
const faraKv = () => json({ error: "ISTORIC_DOAR_ACASA", detail: "Istoricul complet Trading 212 se strânge doar pe serverul de acasă (PORNESTE-CRYPTO-RADAR.bat), de colector." }, 503);

export async function onRequestPost({ request, env }) {
  const auth = await requireApiAuth(request, env, "t212-write", 30); if (!auth.ok) return authErrorResponse(auth, H);
  if (!sameOrigin(request)) return json({ error: "Origin rejected" }, 403);
  if (!env.ISTORIC?.put) return faraKv();
  const act = new URL(request.url).searchParams.get("action");
  if (act !== "istoric" && act !== "cf") return json({ error: "Acțiune necunoscută" }, 400);
  const text = await request.text(); if (text.length > 262144) return json({ error: "Corp prea mare" }, 413);
  let corp; try { corp = JSON.parse(text); } catch { return json({ error: "JSON invalid" }, 400); }
  if (act === "cf") {
    // "daca ascultai de Radar" pe actiuni: {id trade: {nivel, motive, greseli}}, scris de colector
    const NIV = ["cumpara", "asteapta", "nu", "fara-date"], GR = ["dupa-miscare", "langa-max7z"];
    const m = await citesteKv(env, "t212:cf", {}), v = corp && corp.verdicte && typeof corp.verdicte === "object" ? corp.verdicte : {};
    Object.keys(v).slice(0, 300).forEach((k) => {
      const id = txt(k, 40).replace(/[^A-Za-z0-9_-]/g, ""), x = v[k]; if (!id || !x || typeof x !== "object") return;
      m[id] = { nivel: NIV.includes(x.nivel) ? x.nivel : "fara-date", motive: (Array.isArray(x.motive) ? x.motive : []).slice(0, 4).map((z) => txt(z, 200)).filter(Boolean), greseli: (Array.isArray(x.greseli) ? x.greseli : []).filter((z) => GR.includes(z)) };
      // v87: proba cu stop (-8/-10/-15%): {pct, zi} sau null (neatins)
      if (x.stop && typeof x.stop === "object" && Object.keys(x.stop).length) { const st = {}; ["8", "10", "15"].forEach((p) => { const y = x.stop[p]; const pc = y && nr(y.pct); st[p] = pc !== null && pc > -1 && pc < 1 ? { pct: pc, zi: nr(y.zi) } : null; }); m[id].stop = st; }
    });
    const ids = Object.keys(m); if (ids.length > 6000) ids.slice(0, ids.length - 6000).forEach((k) => delete m[k]);
    await env.ISTORIC.put("t212:cf", JSON.stringify(m));
    return json({ ok: true, n: Object.keys(m).length });
  }
  const ordine = (Array.isArray(corp && corp.ordine) ? corp.ordine : []).slice(0, 200).map((x) => txt(String(x), 40).replace(/[^A-Za-z0-9_-]/g, "")).filter(Boolean);
  const vazute = new Set(await citesteKv(env, "t212:ordine", [])), inainte = vazute.size;
  ordine.forEach((o) => vazute.add(o));
  const umpleri = await citesteKv(env, "t212:umpleri", []), dupaId = new Map((Array.isArray(umpleri) ? umpleri : []).map((x) => [x.id, x]));
  (Array.isArray(corp && corp.umpleri) ? corp.umpleri : []).slice(0, 200).forEach((x) => { const c = curataUmplere(x); if (c) dupaId.set(c.id, c); });
  const lista = [...dupaId.values()].sort((a, b) => a.t - b.t);
  await env.ISTORIC.put("t212:ordine", JSON.stringify([...vazute]));
  await env.ISTORIC.put("t212:umpleri", JSON.stringify(lista));
  const s = corp && corp.stare;
  if (s && typeof s === "object") {
    const cur = typeof s.cursorVechi === "string" && /^\d{1,20}$/.test(s.cursorVechi) ? s.cursorVechi : null;
    await env.ISTORIC.put("t212:stare", JSON.stringify({ cursorVechi: cur, complet: s.complet === true, la: Date.now() }));
  }
  return json({ ok: true, noi: vazute.size - inainte, umpleri: lista.length });
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
      const nume = String(u.searchParams.get("nume") || "").replace(/[^\p{L}\p{N} .,&'-]/gu, "").trim().slice(0, 60);
      if (nume.length >= 3) {
        for (const s of await dupaNume(nume)) {
          if (cand.includes(s)) continue;
          const rows = await yahoo(s, iv);
          if (rows) { const v = { ticker: tk, simbol: s, sursa: "yahoo", interval: iv, randuri: rows, gasitDupaNume: true }; inCache(k, v, iv === "1h" ? 300 : 1800); return json(v); }
        }
      }
      return json({ error: "Fără prețuri pentru " + tk + " (poate a fost delistată sau redenumită)." }, 404);
    }
    if (a === "rezultate") {
      const tk = String(u.searchParams.get("ticker") || "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 32), cand = candidati(tk);
      if (!cand.length) return json({ error: "Doar acțiuni americane (_US_EQ)." }, 404);
      const k = "rez:" + tk, c = dinCache(k); if (c) return json(c);
      const r = await fetch("https://api.nasdaq.com/api/analyst/" + encodeURIComponent(cand[0]) + "/earnings-date", { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
      let j = null; try { j = await r.json(); } catch {}
      if (!r.ok && r.status !== 404) return json({ error: "Nasdaq: HTTP " + r.status }, 502);
      const d = dataRezultate(j), v = { ticker: tk, simbol: cand[0], data: d ? d.data : null, sigur: d ? d.sigur : null };
      inCache(k, v, 12 * 3600); return json(v);
    }
    if (a === "cf") {
      if (!env.ISTORIC?.get) return faraKv();
      const m = await citesteKv(env, "t212:cf", {});
      return json({ cf: m && typeof m === "object" ? m : {} });
    }
    if (a === "istoric") {
      if (!env.ISTORIC?.get) return faraKv();
      const [umpleri, stare, ordine] = await Promise.all([citesteKv(env, "t212:umpleri", []), citesteKv(env, "t212:stare", null), citesteKv(env, "t212:ordine", [])]);
      return json({ umpleri: Array.isArray(umpleri) ? umpleri : [], stare: Object.assign({ complet: false, cursorVechi: null, la: null }, stare || {}, { ordine: Array.isArray(ordine) ? ordine.length : 0 }) });
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
    if (a === "dividende") {
      const c = dinCache("div"); if (c) return json(c);
      let cur = null, items = [];
      for (let pag = 0; pag < 20; pag++) {
        const d = await t212(env, "/history/dividends?limit=50" + (cur ? "&cursor=" + cur : ""), "dividende");
        (Array.isArray(d && d.items) ? d.items : []).forEach((x) => { if (x && x.ticker) items.push({ ticker: String(x.ticker).slice(0, 40), amount: nr(x.amount), currency: txt(x.currency, 3) || null, paidOn: txt(x.paidOn, 40) || null }); });
        const np = d && typeof d.nextPagePath === "string" ? d.nextPagePath : "", m = np.startsWith("/api/v0/history/dividends?") ? np.match(/[?&]cursor=([A-Za-z0-9_-]{1,40})/) : null;
        if (!m) break; cur = m[1];
      }
      const v = { items }; inCache("div", v, 3600); return json(v);
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
