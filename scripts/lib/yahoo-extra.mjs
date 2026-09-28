// Yahoo fara cheie, pentru poza (v98): inchiderile zilnice si "extra" (insideri, rezultate, analisti, short) pe un simbol.
// Crumb-ul si cookie-ul se iau o data pe zi (fc.yahoo.com -> set-cookie; /v1/test/getcrumb). Cache pe disc (data/poza-ext.json):
// extra 6 ore, inchideri 30 de minute - lista are cel mult 60 de simboluri, poza se face la 5 minute.
import fs from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36", accept: "*/*" };
const EXTRA_MS = 6 * 3600000, CLOSES_MS = 30 * 60000;
export function creeazaYahooExtra({ fisier, pauzaMs = 400, f = fetch, acum = () => Date.now(), jurnal = () => {} } = {}) {
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(fisier, "utf8")); } catch { cache = {}; }
  let crumb = null, cookie = "", crumbLa = 0;
  const salveaza = () => { try { fs.writeFileSync(fisier, JSON.stringify(cache)); } catch (e) { jurnal("yahoo-extra: cache nescris", e.message); } };
  const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
  async function iaCrumb() {
    if (crumb && acum() - crumbLa < 86400000) return;
    const r1 = await f("https://fc.yahoo.com", { headers: UA, redirect: "manual", signal: AbortSignal.timeout(15000) }).catch(() => null);
    const sc = r1 && r1.headers ? (typeof r1.headers.getSetCookie === "function" ? r1.headers.getSetCookie() : [r1.headers.get("set-cookie") || ""]) : [];
    cookie = sc.map((c) => String(c).split(";")[0].trim()).filter(Boolean).join("; ");
    const r2 = await f("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { ...UA, cookie }, signal: AbortSignal.timeout(15000) });
    const t = await r2.text(); if (!r2.ok || !t || t.includes("<")) throw new Error("crumb Yahoo: " + r2.status);
    crumb = t.trim(); crumbLa = acum();
  }
  async function json(u) { const r = await f(u, { headers: { ...UA, cookie }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error("Yahoo HTTP " + r.status); return r.json(); }
  return {
    async closes(simbol) {
      const k = "c:" + simbol, c = cache[k]; if (c && acum() - c.la < CLOSES_MS) return c.v;
      const j = (await json("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(simbol) + "?range=2mo&interval=1d")).chart.result[0];
      // v98.2: barele cu timp (tc), aliniate - o inchidere lipsa se sare cu tot cu timpul ei; din ele colectorul ia `prev` = ultima
      // sesiune INCHEIATA (prevSimbol), nu penultima inchidere orbeste (duminica arata mișcarea de vineri drept "azi")
      const inch = j.indicators.quote[0].close || [], ts = j.timestamp || [], tc = [];
      ts.forEach((t, i) => { if (typeof inch[i] === "number" && typeof t === "number") tc.push({ t: t * 1000, c: inch[i] }); });
      const cl = tc.map((b) => b.c);
      const v = { closes30: cl.slice(-30), pret: cl[cl.length - 1] ?? null, prev: cl[cl.length - 2] ?? null, tc: tc.slice(-31), la: ts.length ? ts[ts.length - 1] * 1000 : null, moneda: j.meta && j.meta.currency === "EUR" ? "€" : "$" };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    },
    async extra(simbol) {
      const k = "e:" + simbol, c = cache[k]; if (c && acum() - c.la < EXTRA_MS) return c.v;
      await iaCrumb();
      const j = (await json("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + encodeURIComponent(simbol) + "?modules=calendarEvents%2CinsiderTransactions%2CdefaultKeyStatistics%2CfinancialData&crumb=" + encodeURIComponent(crumb))).quoteSummary.result[0] || {};
      const ce = (j.calendarEvents || {}).earnings || {}, fd = j.financialData || {}, ks = j.defaultKeyStatistics || {};
      const v = { tranzactii: ((j.insiderTransactions || {}).transactions || []).slice(0, 60),
        rezultate: { data: ((ce.earningsDate || [])[0] || {}).fmt || null, eps: (ce.earningsAverage || {}).raw ?? null },
        analisti: { tinta: (fd.targetMeanPrice || {}).raw ?? null, recom: fd.recommendationKey || null, n: (fd.numberOfAnalystOpinions || {}).raw ?? null },
        shortFloat: (ks.shortPercentOfFloat || {}).raw ?? null };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    }
  };
}
