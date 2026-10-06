// Trading 212 (Invest) - DOAR CITIRE (v85). Cheile T212_API_KEY / T212_API_SECRET stau in .dev.vars
// (acasa); pe pagina publicata nu sunt puse. Probat in scripts/t212-v85.mjs cu fetch fals.
//   ?action=cont      -> sold (cash) + moneda contului
//   ?action=pozitii   -> pozitiile deschise (cere permisiunea "Portfolio" pe cheie)
//   ?action=ordine[&cursor=<cifre>] -> o pagina de istoric (50), cu cursorul paginii urmatoare
//   ?action=preturi&ticker=AAPL_US_EQ&interval=5m|15m|30m|1h|4h|1d -> lumanari (Twelve Data daca e cheia, altfel Yahoo)
//                                                       in forma randurilor Pionex {time, open, high, low, close}
//   ?action=istoric   -> istoricul COMPLET al umplerilor, strans de colector in KV-ul de acasa (ISTORIC)
//   POST ?action=istoric {ordine:[id], umpleri:[...], stare} -> colectorul adauga o pagina (dedup pe id)
// Verificat pe contul lui (25.09): istoricul vine ca items[{order, fill}], pagini cu nextPagePath.
import {requireApiAuth,authErrorResponse,sameOrigin} from "../_shared/auth.js";
import { candidati } from "../_shared/simboluri.js";

const H = { "content-type": "application/json", "cache-control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });
const BAZA = "https://live.trading212.com/api/v0";
const PERMISIUNE = { cont: "Account data", pozitii: "Portfolio", ordine: "History / Orders", dividende: "History / Dividends" };
const cache = new Map(); // cheie -> {pana, valoare} (in memoria serverului de acasa)

function dinCache(k) { const c = cache.get(k); return c && c.pana > Date.now() ? c.valoare : null; }
function inCache(k, v, sec) { cache.set(k, { pana: Date.now() + sec * 1000, valoare: v }); if (cache.size > 300) cache.delete(cache.keys().next().value); }
// v98.2 (audit 28.09, #1): cererile IDENTICE in zbor se leaga - trei ture ale colectorului care cer `pozitii` in aceeasi secunda
// = UN apel la Trading 212 (limitele lor: 1 la 5 s pe portofoliu, 1 la 30 s pe account/info; 88 de 429 in 36 de ore inainte).
// Toti chematorii primesc acelasi raspuns (sau aceeasi eroare); o eroare NU ramane in cache, urmatorul reincearca.
const inZbor = new Map();
function prinCache(k, sec, fn) {
  const c = dinCache(k); if (c) return Promise.resolve(c);
  if (inZbor.has(k)) return inZbor.get(k);
  const p = Promise.resolve().then(fn).then((v) => { if (v !== null && v !== undefined) inCache(k, v, sec); return v; }).finally(() => inZbor.delete(k));
  inZbor.set(k, p); return p;
}

async function t212(env, cale, actiune) {
  const r = await fetch(BAZA + cale, { headers: { Authorization: "Basic " + btoa(env.T212_API_KEY + ":" + env.T212_API_SECRET), accept: "application/json" } });
  if (r.status === 429) { const ra = Number(r.headers.get("x-ratelimit-reset")); throw Object.assign(new Error("Trading 212 a limitat cererile"), { status: 429, retryAfter: ra > 1e9 ? Math.max(1, Math.round(ra - Date.now() / 1000)) : 30 }); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error("Cheia Trading 212 n-are voie aici: bifează permisiunea „" + (PERMISIUNE[actiune] || actiune) + "” când generezi cheia (Settings → API)."), { status: 403 });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
  if (!r.ok) throw Object.assign(new Error("Trading 212: HTTP " + r.status), { status: 502 });
  if (j === null) throw Object.assign(new Error("Trading 212: răspuns care nu e JSON"), { status: 502 });
  return j;
}

// v100.108 (semaforul trendului pe acțiuni): intervalele pe care le dă ruta; orice altceva = zilnic
export function intervalPreturi(x) { return ["5m", "15m", "30m", "1h", "4h", "1d"].includes(x) ? x : "1d"; }
// 4 h din barele de 1 h: câte 4 în aceeași zi de bursă (New York), ca rezerva Yahoo din stocks.js
export function grupeaza4h(rows) {
  const zi = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(ms)), g = [];
  let cur = null, n = 0, z = "";
  for (const r of rows || []) {
    const zz = zi(r.time);
    if (!cur || zz !== z || n >= 4) { if (cur) g.push(cur); cur = { ...r }; z = zz; n = 1; continue; }
    cur.high = Math.max(cur.high, r.high); cur.low = Math.min(cur.low, r.low); cur.close = r.close; cur.volume = cur.volume === null || r.volume === null ? null : cur.volume + r.volume; n++;
  }
  if (cur) g.push(cur);
  return g;
}
const RANGE_Y = { "5m": "5d", "15m": "1mo", "30m": "1mo", "1h": "60d", "1d": "2y" };
async function yahoo(simbol, interval, rng, prepost) {
  if (interval === "4h") { const h = await yahoo(simbol, "1h", "730d"); return h ? grupeaza4h(h) : null; }   /* revizia: 60 de zile dădeau doar ~82 de bare de 4 h */
  const range = rng || RANGE_Y[interval] || "2y";
  // v100.119 (pagina Sugestii): prepost - și rândurile din pre-market (doar intraday; pre-market-ul US de la 16:00 RO)
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbol)}?interval=${interval}&range=${range}${prepost ? "&includePrePost=true" : ""}`, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
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
// v100.110 (bug din revizia v100.108): ziua Twelve Data („2026-10-05”) la ora DESCHIDERII la New York, ca bara zilnică Yahoo - altfel
// 00:00Z = ziua de dinainte la New York, GridCalcul.bareBursa nu scotea bara de azi în formare, iar arhiva ar fi avut zile dublate la schimbarea sursei
export function ziTd(d) {
  const t = Date.parse(String(d).slice(0, 10) + "T13:30:00Z"); if (!Number.isFinite(t)) return NaN;
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
  return h === 9 ? t : t + 3600000;
}
const TD_INTERVAL = { "5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h", "1d": "1day" };
async function twelve(env, simbol, interval) {
  const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbol)}&interval=${TD_INTERVAL[interval] || "1day"}&outputsize=500&order=asc&timezone=UTC&apikey=${encodeURIComponent(env.TWELVE_DATA_API_KEY)}`);
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || !Array.isArray(j.values)) return null;
  const out = j.values.map((v) => ({ time: String(v.datetime).length <= 10 ? ziTd(v.datetime) : Date.parse(String(v.datetime).replace(" ", "T") + "Z"), open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close), volume: v.volume == null ? null : Number(v.volume) }))
    .filter((x) => Number.isFinite(x.time) && [x.open, x.high, x.low, x.close].every((y) => Number.isFinite(y) && y > 0));
  return out.length ? out : null;
}

// Istoricul complet: umplerile curatate (lipsa ramane null, nu 0), ordinele vazute (id-uri, ca tura
// colectorului sa stie unde se suprapune) si starea coborarii prin pagini.
const nr = (v) => { if (typeof v === "number") return Number.isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const txt = (v, m) => (typeof v === "string" ? v.slice(0, m) : "");
// "daca ascultai de Radar" pe actiuni: curatarea unui verdict {nivel, motive, greseli, stop, stopU, prob, sit} scris de colector
// (v100.55: scoasa din ruta ca s-o probeze proba-v10055 direct)
const NIV_CF = ["cumpara", "asteapta", "nu", "fara-date"], GR_CF = ["dupa-miscare", "langa-max7z"];
function curataCf(x) {
  const o = { nivel: NIV_CF.includes(x.nivel) ? x.nivel : "fara-date", motive: (Array.isArray(x.motive) ? x.motive : []).slice(0, 4).map((z) => txt(z, 200)).filter(Boolean), greseli: (Array.isArray(x.greseli) ? x.greseli : []).filter((z) => GR_CF.includes(z)) };
  // v87: proba cu stop (-8/-10/-15%): {pct, zi} sau null (neatins)
  // v88: stopul care URCA (planul Radarului, -15%, -25% de la maxim)
  // v89: proba GOALA se pastreaza goala ({}), altfel colectorul crede ca lipseste si o reface la fiecare tura
  if (x.stopU && typeof x.stopU === "object" && !Object.keys(x.stopU).length) o.stopU = {};
  else if (x.stopU && typeof x.stopU === "object") { const su = {}; ["plan", "u15", "u25", "prof"].forEach((p) => { const y = x.stopU[p]; const pc = y && nr(y.pct); su[p] = pc !== null && pc > -1 && pc < 5 ? { pct: pc, zi: nr(y.zi), trail: nr(y.trail) } : null; }); o.stopU = su; }
  // v100.53: calibrarea probabilitatilor - cifra de atunci si ce a urmat; null se pastreaza (altfel s-ar reface la nesfarsit)
  if ("prob" in x) { const pb = x.prob, pp = pb && nr(pb.p), rr = pb && nr(pb.r); o.prob = pp !== null && pp >= 0 && pp <= 1 && (rr === 0 || rr === 1) ? { p: pp, r: rr, zi: nr(pb.zi) } : null; }
  if (x.stop && typeof x.stop === "object" && !Object.keys(x.stop).length) o.stop = {};
  else if (x.stop && typeof x.stop === "object") { const st = {}; ["8", "10", "15"].forEach((p) => { const y = x.stop[p]; const pc = y && nr(y.pct); st[p] = pc !== null && pc > -1 && pc < 1 ? { pct: pc, zi: nr(y.zi) } : null; }); o.stop = st; }
  // v100.55: starea de la cumparare (trend|miscare|maxim); null se pastreaza (fara preturi) - altfel colectorul ar reface la nesfarsit
  if ("sit" in x) o.sit = typeof x.sit === "string" && /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/.test(x.sit) ? x.sit : null;
  return o;
}
export const __cfPentruProba = curataCf;
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

// v93/v94: rezumatul Nasdaq 100 (Home: largimea, cine se misca, cele 7 mari) - din tura de idei si din tura din timpul bursei
async function salveazaNdx(env, corp, zi) {
  if (Array.isArray(corp && corp.ndx)) {
    const b = (v) => v === true;
    const ndx = corp.ndx.slice(0, 150).map((x) => ({ s: String(x && x.s || "").toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 10), p: nr(x && x.p), ch: nr(x && x.ch), ch5: nr(x && x.ch5), e50: b(x && x.e50), e200: b(x && x.e200), rsi: nr(x && x.rsi), mis: nr(x && x.mis) }))
      .filter((x) => x.s && x.ch !== null);
    await env.ISTORIC.put("t212:ndx", JSON.stringify({ la: nr(corp && corp.la) || Date.now(), zi, actiuni: ndx }));
  }
}
export async function onRequestPost({ request, env }) {
  const auth = await requireApiAuth(request, env, "t212-write", 30); if (!auth.ok) return authErrorResponse(auth, H);
  if (!sameOrigin(request)) return json({ error: "Origin rejected" }, 403);
  if (!env.ISTORIC?.put) return faraKv();
  const act = new URL(request.url).searchParams.get("action");
  if (act !== "istoric" && act !== "cf" && act !== "idei" && act !== "lista" && act !== "sfaturi" && act !== "ndx" && act !== "sugestii" && act !== "premarket") return json({ error: "Acțiune necunoscută" }, 400);
  const text = await request.text(); if (text.length > 262144) return json({ error: "Corp prea mare" }, 413);
  let corp; try { corp = JSON.parse(text); } catch { return json({ error: "JSON invalid" }, 400); }
  if (act === "idei") {
    // v90: ideile de cumparare ale zilei (colectorul) + istoricul lor, ca sa se poata URMARI cum ies (o data pe zi pe simbol)
    const sim = (v) => txt(v, 16).replace(/[^A-Za-z0-9.-]/g, ""), tk = (v) => txt(v, 40).replace(/[^A-Za-z0-9._]/g, "");
    const curata = (x) => ({ ticker: tk(x && x.ticker), simbol: sim(x && x.simbol), pret: nr(x && x.pret), intrare: nr(x && x.intrare), stop: nr(x && x.stop), tinta: nr(x && x.tinta), scor: nr(x && x.scor), pePlusProba: nr(x && x.pePlusProba), nProba: nr(x && x.nProba), rezultate: txt(x && x.rezultate, 10) || null,
      motive: (Array.isArray(x && x.motive) ? x.motive : []).slice(0, 5).map((z) => txt(z, 200)), istoric: x && x.istoric ? { n: nr(x.istoric.n), pePlus: nr(x.istoric.pePlus), total: nr(x.istoric.total) } : null,
      // v100.55: starea ideii (aceeasi cheie ca t212:cf) si probabilitatile actiunii
      sit: /^(sus|lateral|jos)\|(calm|dupa-miscare)\|(departe|langa-max)$/.test(String(x && x.sit)) ? x.sit : null, prob: x && x.prob && typeof x.prob === "object" ? { tinta5: nr(x.prob.tinta5), stop1: nr(x.prob.stop1) } : null,
      // v100.94 (L2): a doua (🧠) și a treia părere (🌳) pe idee - „un trade ca ăsta iese pe plus” {p, dovedita}, scrise de colector
      retea: x && x.retea && typeof x.retea === "object" ? { p: nr(x.retea.p), dovedita: x.retea.dovedita === true } : null, arbori: x && x.arbori && typeof x.arbori === "object" ? { p: nr(x.arbori.p), dovedita: x.arbori.dovedita === true } : null,
      // v100.57: profilul actiunii pe idee (coborarea obisnuita pe 5 zile vs stopul, sariturile)
      prof: x && x.prof && typeof x.prof === "object" ? { dist: nr(x.prof.dist), strans: x.prof.strans === true, zile: nr(x.prof.zile), sar: x.prof.sar && typeof x.prof.sar === "object" ? { n: nr(x.prof.sar.n), med: nr(x.prof.sar.med), max: nr(x.prof.sar.max) } : null } : null });
    const act2 = (Array.isArray(corp && corp.actiuni) ? corp.actiuni : []).slice(0, 10).map(curata).filter((x) => x.ticker && x.pret > 0);
    // v100.82 (03.10, ideea 1): celelalte care trec de poartă - curățate la fel, cel mult 40, fără urmărire (istoricul ideilor rămâne pe primele 5)
    const rest2 = (Array.isArray(corp && corp.restul) ? corp.restul : []).slice(0, 40).map(curata).filter((x) => x.ticker && x.pret > 0);
    // v100.85 (reveniri): acțiunile pe revenire (≤ 10, doar long), istoricul regulii și urmărirea lor - notările separat de ale ideilor
    const curataRev = (x) => ({ ticker: tk(x && x.ticker), simbol: sim(x && x.simbol), pret: nr(x && x.pret), cadere: nr(x && x.cadere), deLaMin: nr(x && x.deLaMin), zileDeLaMin: nr(x && x.zileDeLaMin), stop: nr(x && x.stop), tinta: nr(x && x.tinta),
      istoric: x && x.istoric ? { n: nr(x.istoric.n), pePlus: nr(x.istoric.pePlus), total: nr(x.istoric.total) } : null });
    const rev2 = (Array.isArray(corp && corp.reveniri) ? corp.reveniri : []).slice(0, 10).map(curataRev).filter((x) => x.ticker && x.pret > 0);
    const dvR = corp && corp.dovadaReveniri, dov2 = dvR && typeof dvR === "object" ? { n: nr(dvR.n), saptamani: nr(dvR.saptamani), pePlus: nr(dvR.pePlus), medie: nr(dvR.medie), mediana: nr(dvR.mediana),
      baza: dvR.baza && typeof dvR.baza === "object" ? { n: nr(dvR.baza.n), pePlus: nr(dvR.baza.pePlus), medie: nr(dvR.baza.medie) } : null, eticheta: ["mai bine", "mai slab", "cam la fel"].includes(dvR.eticheta) ? dvR.eticheta : null, putine: dvR.putine === true } : null;
    const uR = corp && corp.urmarireReveniri, urm2 = uR && typeof uR === "object" ? { n: nr(uR.n), pePlus: nr(uR.pePlus), medie: nr(uR.medie), text: txt(uR.text, 300) } : null;
    const zi = /^\d{4}-\d{2}-\d{2}$/.test(String(corp && corp.zi)) ? corp.zi : new Date().toISOString().slice(0, 10);
    const u = corp && corp.urmarire, urm = u && typeof u === "object" ? { n: nr(u.n), pePlus: nr(u.pePlus), medie: nr(u.medie), text: txt(u.text, 300) } : null;
    await env.ISTORIC.put("t212:idei", JSON.stringify({ la: nr(corp && corp.la) || Date.now(), zi, judecate: nr(corp && corp.judecate), trecute: nr(corp && corp.trecute), actiuni: act2, restul: rest2, reveniri: rev2, dovadaReveniri: dov2, urmarireReveniri: urm2, urmarire: urm }));
    await salveazaNdx(env, corp, zi);
    const ist = await citesteKv(env, "t212:idei-istoric", []), l = Array.isArray(ist) ? ist : [];
    act2.forEach((x) => { if (!l.some((y) => y.zi === zi && y.ticker === x.ticker)) l.push({ zi, ticker: x.ticker, simbol: x.simbol, pret: x.pret }); });
    const de = new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10);
    await env.ISTORIC.put("t212:idei-istoric", JSON.stringify(l.filter((x) => x.zi >= de).slice(-1000)));
    const istR = await citesteKv(env, "t212:reveniri-istoric", []), lr = Array.isArray(istR) ? istR : [];
    rev2.forEach((x) => { if (!lr.some((y) => y.zi === zi && y.ticker === x.ticker)) lr.push({ zi, ticker: x.ticker, simbol: x.simbol, pret: x.pret }); });
    await env.ISTORIC.put("t212:reveniri-istoric", JSON.stringify(lr.filter((x) => x.zi >= de).slice(-1000)));
    return json({ ok: true, actiuni: act2.length });
  }
  // v94: rezumatul Nasdaq 100 si in timpul bursei (colectorul, o data pe ora) - fara idei
  if (act === "ndx") {
    const zi = /^\d{4}-\d{2}-\d{2}$/.test(String(corp && corp.zi)) ? corp.zi : new Date().toISOString().slice(0, 10);
    await salveazaNdx(env, corp, zi);
    return json({ ok: true });
  }
  if (act === "sfaturi") {
    // v91: socoteala sfaturilor - semaforul fiecarei pozitii, o data pe zi, si pretul dupa 5/10/20 zile
    const l = await citesteKv(env, "t212:sfaturi", []), lista = Array.isArray(l) ? l : [], ziOk = (z) => /^\d{4}-\d{2}-\d{2}$/.test(String(z || ""));
    (Array.isArray(corp && corp.intrari) ? corp.intrari : []).slice(0, 50).forEach((x) => {
      const tk = txt(x && x.ticker, 40).replace(/[^A-Za-z0-9._]/g, ""), pr = nr(x && x.pret);
      if (!ziOk(x && x.zi) || !tk || !["iesi", "atentie", "tine"].includes(x && x.nivel) || !(pr > 0)) return;
      if (!lista.some((y) => y.zi === x.zi && y.ticker === tk)) lista.push({ zi: x.zi, ticker: tk, nivel: x.nivel, pret: pr });
    });
    (Array.isArray(corp && corp.evaluari) ? corp.evaluari : []).slice(0, 300).forEach((e) => {
      const pr = nr(e && e.pret); if (!["p5", "p10", "p20"].includes(e && e.cheie) || !(pr > 0)) return;
      const y = lista.find((z) => z.zi === e.zi && z.ticker === e.ticker); if (y) y[e.cheie] = pr;
    });
    const de = new Date(Date.now() - 250 * 86400000).toISOString().slice(0, 10);
    await env.ISTORIC.put("t212:sfaturi", JSON.stringify(lista.filter((x) => x.zi >= de).slice(-2000)));
    return json({ ok: true, n: lista.length });
  }
  // v100.119 (pagina Sugestii): listele dimineții (US + EU, cu istoricul fiecărei reguli) și, separat, pre-market-ul US / gap-ul EU
  if (act === "sugestii") {
    const r = corp && corp.sugestii;
    if (!r || typeof r !== "object" || Array.isArray(r) || !(nr(r.la) > 0)) return json({ error: "sugestii: raportul cu „la”" }, 400);
    await env.ISTORIC.put("t212:sugestii", JSON.stringify(r)); return json({ ok: true });
  }
  if (act === "premarket") {
    const piata = corp && corp.piata, la = nr(corp && corp.la);
    if ((piata !== "us" && piata !== "eu") || !(la > 0) || !Array.isArray(corp.lista)) return json({ error: "premarket: piata us/eu, la și lista" }, 400);
    const v = await citesteKv(env, "t212:premarket", {}), o = v && typeof v === "object" && !Array.isArray(v) ? v : {};
    o[piata] = { la, lista: corp.lista.slice(0, 60), judecate: nr(corp.judecate), fara: nr(corp.fara) };
    await env.ISTORIC.put("t212:premarket", JSON.stringify(o)); return json({ ok: true });
  }
  if (act === "lista") {
    // v90: simbolurile urmarite de el (se adauga la universul ideilor)
    const l = (Array.isArray(corp && corp.simboluri) ? corp.simboluri : []).map((x) => String(x || "").toUpperCase().trim()).filter((x) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(x)).slice(0, 30);
    await env.ISTORIC.put("t212:lista", JSON.stringify([...new Set(l)]));
    return json({ ok: true, lista: [...new Set(l)] });
  }
  if (act === "cf") {
    // "daca ascultai de Radar" pe actiuni: {id trade: {nivel, motive, greseli}}, scris de colector
    const m = await citesteKv(env, "t212:cf", {}), v = corp && corp.verdicte && typeof corp.verdicte === "object" ? corp.verdicte : {};
    Object.keys(v).slice(0, 300).forEach((k) => {
      const id = txt(k, 40).replace(/[^A-Za-z0-9_-]/g, ""), x = v[k]; if (!id || !x || typeof x !== "object") return;
      m[id] = curataCf(x);
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
  const auth = await requireApiAuth(request, env, "t212", 180); if (!auth.ok) return authErrorResponse(auth, H);
  const u = new URL(request.url), a = u.searchParams.get("action") || "";
  try {
    if (a === "preturi") {
      const tk = String(u.searchParams.get("ticker") || "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 32), iv = intervalPreturi(u.searchParams.get("interval"));
      const cand = candidati(tk);
      if (!cand.length) return json({ error: "Nu știu simbolul de bursă pentru " + tk + "." }, 404);
      const nume = String(u.searchParams.get("nume") || "").replace(/[^\p{L}\p{N} .,&'-]/gu, "").trim().slice(0, 60);
      const pp = u.searchParams.get("prepost") === "1" && /m$|h$/.test(iv) && iv !== "4h";   // v100.119: pre-market doar intraday (Twelve Data nu-l dă)
      const v = await prinCache("p:" + tk + ":" + iv + (pp ? ":pp" : ""), iv === "1d" ? 1800 : 300, async () => {
        for (const s of cand) {
          let rows = null, sursa = null;
          if (env.TWELVE_DATA_API_KEY && !pp) { rows = await twelve(env, s, iv); sursa = "twelvedata"; }
          if (!rows) { rows = await yahoo(s, iv, null, pp); sursa = "yahoo"; }
          if (rows) return { ticker: tk, simbol: s, sursa, interval: iv, randuri: rows };
        }
        if (nume.length >= 3) {
          for (const s of await dupaNume(nume)) {
            if (cand.includes(s)) continue;
            const rows = await yahoo(s, iv);
            if (rows) return { ticker: tk, simbol: s, sursa: "yahoo", interval: iv, randuri: rows, gasitDupaNume: true };
          }
        }
        return null;
      });
      if (v) return json(v);
      return json({ error: "Fără prețuri pentru " + tk + " (poate a fost delistată sau redenumită)." }, 404);
    }
    if (a === "rezultate") {
      const tk = String(u.searchParams.get("ticker") || "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 32), cand = /_US_EQ$/.test(tk) ? candidati(tk) : [];
      if (!cand.length) return json({ error: "Data rezultatelor: doar acțiuni americane (_US_EQ)." }, 404);
      return json(await prinCache("rez:" + tk, 12 * 3600, async () => {
        const r = await fetch("https://api.nasdaq.com/api/analyst/" + encodeURIComponent(cand[0]) + "/earnings-date", { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
        let j = null; try { j = await r.json(); } catch {}
        if (!r.ok && r.status !== 404) throw Object.assign(new Error("Nasdaq: HTTP " + r.status), { status: 502 });
        const d = dataRezultate(j);
        return { ticker: tk, simbol: cand[0], data: d ? d.data : null, sigur: d ? d.sigur : null };
      }));
    }
    if (a === "sfaturi") {
      if (!env.ISTORIC?.get) return faraKv();
      const l = await citesteKv(env, "t212:sfaturi", []);
      return json({ sfaturi: Array.isArray(l) ? l : [] });
    }
    if (a === "ndx") {
      if (!env.ISTORIC?.get) return faraKv();
      const v = await citesteKv(env, "t212:ndx", null);
      return json(v && typeof v === "object" ? v : { la: null, zi: null, actiuni: [] });
    }
    if (a === "idei") {
      if (!env.ISTORIC?.get) return faraKv();
      const [idei, istoric, lista, istoricReveniri] = await Promise.all([citesteKv(env, "t212:idei", null), citesteKv(env, "t212:idei-istoric", []), citesteKv(env, "t212:lista", []), citesteKv(env, "t212:reveniri-istoric", [])]);
      return json({ idei, istoric: Array.isArray(istoric) ? istoric : [], lista: Array.isArray(lista) ? lista : [], istoricReveniri: Array.isArray(istoricReveniri) ? istoricReveniri : [] });
    }
    if (a === "sugestii") {
      if (!env.ISTORIC?.get) return faraKv();
      const [sugestii, premarket] = await Promise.all([citesteKv(env, "t212:sugestii", null), citesteKv(env, "t212:premarket", null)]);
      return json({ sugestii, premarket });
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
      return json(await prinCache("cont", 60, async () => {
        const cash = await t212(env, "/equity/account/cash", "cont"), info = await t212(env, "/equity/account/info", "cont");
        return { moneda: info && info.currencyCode || null, cash };
      }));
    }
    if (a === "pozitii") {
      return json(await prinCache("poz", 30, async () => { const p = await t212(env, "/equity/portfolio", "pozitii"); return { pozitii: Array.isArray(p) ? p : [] }; }));
    }
    if (a === "dividende") {
      return json(await prinCache("div", 3600, async () => {
        let cur = null, items = [];
        for (let pag = 0; pag < 20; pag++) {
          const d = await t212(env, "/history/dividends?limit=50" + (cur ? "&cursor=" + cur : ""), "dividende");
          (Array.isArray(d && d.items) ? d.items : []).forEach((x) => { if (x && x.ticker) items.push({ ticker: String(x.ticker).slice(0, 40), amount: nr(x.amount), currency: txt(x.currency, 3) || null, paidOn: txt(x.paidOn, 40) || null }); });
          const np = d && typeof d.nextPagePath === "string" ? d.nextPagePath : "", m = np.startsWith("/api/v0/history/dividends?") ? np.match(/[?&]cursor=([A-Za-z0-9_-]{1,40})/) : null;
          if (!m) break; cur = m[1];
        }
        return { items };
      }));
    }
    if (a === "ordine") {
      const cur = u.searchParams.get("cursor");
      if (cur !== null && !/^\d{1,20}$/.test(cur)) return json({ error: "cursor invalid" }, 400);
      return json(await prinCache("o:" + (cur || ""), 30, async () => {
        const d = await t212(env, "/equity/history/orders?limit=50" + (cur ? "&cursor=" + cur : ""), "ordine");
        const np = d && typeof d.nextPagePath === "string" ? d.nextPagePath : "";
        const m = np.startsWith("/api/v0/equity/history/orders?") ? np.match(/[?&]cursor=(\d{1,20})/) : null;
        return { items: Array.isArray(d && d.items) ? d.items : [], cursor: m ? m[1] : null };
      }));
    }
    return json({ error: "Acțiune necunoscută" }, 400);
  } catch (e) {
    const s = e.status || 502;
    return json(Object.assign({ error: e.message }, s === 429 ? { retryAfter: e.retryAfter || 30 } : {}), s);
  }
}
