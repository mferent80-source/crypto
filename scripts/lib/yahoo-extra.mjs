// Yahoo fara cheie, pentru poza (v98): inchiderile zilnice si "extra" (insideri, rezultate, analisti, short) pe un simbol.
// Crumb-ul si cookie-ul se iau o data pe zi (fc.yahoo.com -> set-cookie; /v1/test/getcrumb). Cache pe disc (data/poza-ext.json):
// extra 6 ore, inchideri 30 de minute - lista are cel mult 60 de simboluri, poza se face la 5 minute.
import fs from "node:fs";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36", accept: "*/*" };
const EXTRA_MS = 6 * 3600000, CLOSES_MS = 30 * 60000, BARE_MS = 6 * 3600000;
export function creeazaYahooExtra({ fisier, fisierBare = null, pauzaMs = 400, f = fetch, acum = () => Date.now(), jurnal = () => {} } = {}) {
  let cache = {}; try { cache = JSON.parse(fs.readFileSync(fisier, "utf8")); } catch { cache = {}; }
  let cacheBare = {}; if (fisierBare) { try { cacheBare = JSON.parse(fs.readFileSync(fisierBare, "utf8")); } catch { cacheBare = {}; } }
  const salveazaBare = () => { if (!fisierBare) return; try { fs.writeFileSync(fisierBare, JSON.stringify(cacheBare)); } catch (e) { jurnal("yahoo-extra: bare nescrise", e.message); } };
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
  async function json(u) { const r = await f(u, { headers: { ...UA, cookie }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw Object.assign(new Error("Yahoo HTTP " + r.status), { status: r.status }); return r.json(); }
  return {
    async closes(simbol) {
      const k = "c:" + simbol, c = cache[k]; if (c && acum() - c.la < (c.v === null ? BARE_MS : CLOSES_MS)) return c.v;
      // v100.40 (audit 30.09): simbolul pe care Yahoo nu-l are (COTIUSDT: 2 × 404 la fiecare poza, ~1.400 de linii de jurnal pe zi) ->
      // tinut minte 6 ore ca „nu exista” (null), nu cerut din nou la 2 minute
      let jj; try { jj = await json("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(simbol) + "?range=2mo&interval=1d"); } catch (e) { if (e.status === 404) { cache[k] = { la: acum(), v: null }; salveaza(); return null; } throw e; }
      const j = jj.chart.result[0];
      // v98.2: barele cu timp (tc), aliniate - o inchidere lipsa se sare cu tot cu timpul ei; din ele colectorul ia `prev` = ultima
      // sesiune INCHEIATA (prevSimbol), nu penultima inchidere orbeste (duminica arata mișcarea de vineri drept "azi")
      const inch = j.indicators.quote[0].close || [], ts = j.timestamp || [], tc = [];
      ts.forEach((t, i) => { if (typeof inch[i] === "number" && typeof t === "number") tc.push({ t: t * 1000, c: inch[i] }); });
      const cl = tc.map((b) => b.c);
      const v = { closes30: cl.slice(-30), pret: cl[cl.length - 1] ?? null, prev: cl[cl.length - 2] ?? null, tc: tc.slice(-31), la: ts.length ? ts[ts.length - 1] * 1000 : null, moneda: j.meta && j.meta.currency === "EUR" ? "€" : "$" };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    },
    // v101 (SL/TP pe alerts): lumanarile zilnice pe 1 an (OHLC) - ActiuniSemnale.niveluri cere cel putin 120 de zile.
    // Fisier separat (poza-bare.json), cache 6 h; 404 = Yahoo n-are simbolul -> null (tinut minte), nu exceptie.
    async bare(simbol) {
      const c = cacheBare[simbol]; if (c && acum() - c.la < BARE_MS) return c.v;
      const r = await f("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(simbol) + "?range=1y&interval=1d", { headers: { ...UA, cookie }, signal: AbortSignal.timeout(20000) });
      if (r.status === 404) { cacheBare[simbol] = { la: acum(), v: null }; salveazaBare(); return null; }
      if (!r.ok) throw new Error("Yahoo HTTP " + r.status);
      const js = await r.json(), j = js && js.chart && js.chart.result && js.chart.result[0];
      if (!j) { cacheBare[simbol] = { la: acum(), v: null }; salveazaBare(); return null; }
      const q = (j.indicators && j.indicators.quote && j.indicators.quote[0]) || {}, ts = j.timestamp || [], v = [];
      ts.forEach((t, i) => { const o = q.open && q.open[i], h = q.high && q.high[i], l = q.low && q.low[i], cl = q.close && q.close[i];
        if (typeof t === "number" && [o, h, l, cl].every((x) => typeof x === "number")) v.push({ t: t * 1000, o, h, l, c: cl, v: (q.volume && q.volume[i]) || 0 }); });
      cacheBare[simbol] = { la: acum(), v }; salveazaBare(); await pauza(pauzaMs); return v;
    },
    async extra(simbol) {
      const k = "e:" + simbol, c = cache[k]; if (c && acum() - c.la < EXTRA_MS) return c.v;
      // v100.40 (audit 30.09): la 401/403 crumb-ul se reface o data pe loc (era tinut 24 h -> insiderii, rezultatele si analistii mureau
      // pana la repornire); daca tot nu merge, ramane ultima valoare stiuta (veche, dar nu goala)
      const cereExtra = async () => { await iaCrumb(); return json("https://query2.finance.yahoo.com/v10/finance/quoteSummary/" + encodeURIComponent(simbol) + "?modules=calendarEvents%2CinsiderTransactions%2CdefaultKeyStatistics%2CfinancialData&crumb=" + encodeURIComponent(crumb)); };
      let jr;
      try { jr = await cereExtra(); }
      catch (e) {
        if (e.status === 401 || e.status === 403) { crumb = null; crumbLa = 0; try { jr = await cereExtra(); } catch (e2) { if (c) return c.v; throw e2; } }
        else if (e.status === 404) { cache[k] = { la: acum(), v: null }; salveaza(); return null; }   // simbolul n-are fisa la Yahoo: tinut minte 6 h
        else { if (c) return c.v; throw e; }
      }
      const j = jr.quoteSummary.result[0] || {};
      const ce = (j.calendarEvents || {}).earnings || {}, fd = j.financialData || {}, ks = j.defaultKeyStatistics || {};
      const v = { tranzactii: ((j.insiderTransactions || {}).transactions || []).slice(0, 60),
        rezultate: { data: ((ce.earningsDate || [])[0] || {}).fmt || null, eps: (ce.earningsAverage || {}).raw ?? null },
        analisti: { tinta: (fd.targetMeanPrice || {}).raw ?? null, recom: fd.recommendationKey || null, n: (fd.numberOfAnalystOpinions || {}).raw ?? null },
        shortFloat: (ks.shortPercentOfFloat || {}).raw ?? null };
      cache[k] = { la: acum(), v }; salveaza(); await pauza(pauzaMs); return v;
    }
  };
}
