// Stirile si piata de azi pentru consilier (v89). Surse fara cheie, probate pe 25.09:
//   ?action=actiune&ticker=AAPL_US_EQ -> titlurile Yahoo pentru simbolul de bursa (RSS), cel mult 6
//   ?action=crypto&moneda=MET          -> titlurile Cointelegraph + CoinDesk care pomenesc moneda (cuvant intreg) + generale
//   ?action=piata                      -> QQQ, SPY, ^VIX (Yahoo, zilnic, un an) + frica/lacomia crypto (alternative.me)
// Stirile NU se interpreteaza: titlu, ora, link. Lipsa unei surse -> null / [], nu 0. Probat in scripts/consilier-v89.mjs.
import { requireApiAuth, authErrorResponse } from "../_shared/auth.js";
import { candidati } from "../_shared/simboluri.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const cache = new Map();
const dinCache = (k) => { const c = cache.get(k); return c && c.pana > Date.now() ? c.v : null; };
const inCache = (k, v, sec) => { cache.set(k, { pana: Date.now() + sec * 1000, v }); if (cache.size > 200) cache.delete(cache.keys().next().value); };
const UA = { "user-agent": "Mozilla/5.0", accept: "application/rss+xml, application/xml, application/json, */*" };

function decodeaza(t) { return t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))); }
function rss(xml, max) {
  const out = [], re = /<item>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(xml)) && out.length < max) {
    const g = (tag) => { const x = m[1].match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return x ? x[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").replace(/<[^>]+>/g, "").trim() : ""; };
    const titlu = decodeaza(g("title")), link = g("link").trim(), la = Date.parse(g("pubDate"));
    if (titlu && /^https?:\/\/[^\s"'<>]+$/.test(link)) out.push({ titlu: titlu.slice(0, 220), link: link.slice(0, 500), la: Number.isFinite(la) ? la : null });
  }
  return out;
}
async function aduRss(url, max) {
  try { const r = await fetch(url, { headers: UA }); if (!r.ok) return []; return rss(await r.text(), max); } catch { return []; }
}
async function chart(simbol) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbol)}?interval=1d&range=1y`, { headers: UA });
    if (!r.ok) return null;
    const j = await r.json(), res = j && j.chart && Array.isArray(j.chart.result) ? j.chart.result[0] : null;
    if (!res || !Array.isArray(res.timestamp)) return null;
    const q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {}, out = [];
    res.timestamp.forEach((t, i) => { const o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], c = q.close && q.close[i]; if ([o, h, l, c].every((x) => typeof x === "number" && x > 0)) out.push({ time: t * 1000, open: o, high: h, low: l, close: c }); });
    return out.length ? out : null;
  } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const auth = await requireApiAuth(request, env, "stiri", 60); if (!auth.ok) return authErrorResponse(auth, H);
  const u = new URL(request.url), a = u.searchParams.get("action") || "";
  if (a === "actiune") {
    const tk = String(u.searchParams.get("ticker") || "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 32), cand = candidati(tk);
    if (!cand.length) return json({ error: "Simbol necunoscut." }, 400);
    const k = "a:" + tk, c = dinCache(k); if (c) return json(c);
    const v = { ticker: tk, simbol: cand[0], stiri: await aduRss(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(cand[0])}&region=US&lang=en-US`, 6) };
    inCache(k, v, 1800); return json(v);
  }
  if (a === "crypto") {
    const m = String(u.searchParams.get("moneda") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    const k = "c:" + m, c = dinCache(k); if (c) return json(c);
    const [ct, cd] = await Promise.all([aduRss("https://cointelegraph.com/rss", 40), aduRss("https://www.coindesk.com/arc/outboundfeeds/rss", 40)]);
    const re = m ? new RegExp("(^|[^A-Za-z0-9])" + m + "([^A-Za-z0-9]|$)") : null;
    const v = { moneda: re ? ct.concat(cd).filter((x) => re.test(x.titlu)).slice(0, 6) : [], general: ct.slice(0, 5) };
    inCache(k, v, 1800); return json(v);
  }
  if (a === "piata") {
    const c = dinCache("piata"); if (c) return json(c);
    const [qqq, spy, vix, fgR] = await Promise.all([chart("QQQ"), chart("SPY"), chart("^VIX"), fetch("https://api.alternative.me/fng/?limit=1", { headers: UA }).then((r) => (r.ok ? r.json() : null)).catch(() => null)]);
    const f = fgR && Array.isArray(fgR.data) && fgR.data[0], val = f ? Number(f.value) : NaN;
    const v = { qqq, spy, vix, fg: Number.isFinite(val) ? { valoare: val, clasa: String(f.value_classification || "").slice(0, 20) } : null };
    inCache("piata", v, 1800); return json(v);
  }
  return json({ error: "Acțiune necunoscută" }, 400);
}
