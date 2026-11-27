// Tura monedelor de bot direcțional (v101.214, Radar v100.395, el 26.11: „caută automat mereu genul ăsta de monede … mereu conectat la realitate și live”).
// O dată pe oră, DIRECT la Binance Futures (prin cererile comune binanceDirect: pauza la 429 / 418 e a tuturor turelor):
//   exchangeInfo + ticker/24hr + premiumIndex + bookTicker (toate monedele, 4 cereri) ⇒ cele de peste 50 M USDT/zi + monedele boților tăi
//   ⇒ pentru fiecare: openInterest, 85 de bare de 4 h (14 zile), 600 de bare de 1 h (amplitudinea pe 7 zile + PPST 1h) ⇒ MonedeBot.masoara
//   ⇒ KV `monede-bot` (ruta action=monedeBot). Lista Pionex PERP vine prin /api/market (Pionex public); fără ea lista NU se publică drept bună.
// Discord: (1) o monedă intră în primele 3 pe o parte (o dată pe 24 h pe monedă și parte); (2) un bot de-al tău stă pe o monedă junk (o dată pe 24 h
// pe monedă); (3) tura nu reușește de 3 ori la rând (lista rămâne veche) + revenirea. Urmărirea înainte (conectarea la realitate): o dată pe zi UTC,
// primele 5 pe fiecare parte și prețurile tuturor monedelor citite; la 7 zile, s × randamentul lor față de media monedelor citite (aceeași parte).
// d = { acum, binance(url), cere(cale), trimite(cale, corp), trimiteAlerta(m, bot, cheie), jurnal, MonedeBot, boti(): [{ s, dir, id }], citesteDisc(), scrieDisc(o) }
// st = starea turei (în memorie; urmărirea și cheile Discordului stau pe disc, prin citesteDisc / scrieDisc)
export const RITM_MS = 60 * 60000;
const FAPI = "https://fapi.binance.com";
const ZI = 86400000;
async function inParalel(lista, n, fn) { const out = new Array(lista.length); let k = 0; await Promise.all(Array.from({ length: Math.min(n, lista.length) }, async () => { while (k < lista.length) { const i = k++; out[i] = await fn(lista[i], i); } })); return out; }
const bara = (k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] });
const ziUtc = (t) => new Date(t).toISOString().slice(0, 10);

// lista Pionex PERP: bazele (fără „1000”); null = n-a venit
export function bazePionex(r) {
  const s = r && r.data && Array.isArray(r.data.symbols) ? r.data.symbols : null; if (!s) return null;
  const o = new Set(); for (const x of s) { if (!x || x.enable === false) continue; const b = String(x.baseCurrency || String(x.symbol || "").split("_")[0] || "").toUpperCase().replace(/^1000+/, ""); if (b) o.add(b); }
  return o.size ? o : null;
}

// urmărirea înainte: notează ziua (o dată pe zi UTC) și judecă zilele de acum 7 zile cu prețurile de acum
export function urmareste(u, corp, preturi, acum, P) {
  u = u && typeof u === "object" ? u : {}; u.zile = Array.isArray(u.zile) ? u.zile : []; u.judecate = Array.isArray(u.judecate) ? u.judecate : [];
  const z = ziUtc(acum);
  if (!u.zile.some((x) => x.zi === z) && !u.judecate.some((x) => x.zi === z)) {
    const pr = {}; for (const m of corp.monede) if (m && m.pret > 0) pr[m.s] = m.pret;
    if (Object.keys(pr).length >= 10) u.zile.push({ zi: z, la: acum, short: corp.short.slice(0, 5), long: corp.long.slice(0, 5), pr });
  }
  // v100.396 (auditul 26.11, 🟡): (1) ultimul preț văzut al fiecărei monede notate se ține minte - o monedă delistată / în SETTLING nu mai iese din
  // listă și din medie (la short dispărea tocmai câștigul mare); (2) judecata doar la 7 zile ± 2 h - colectorul oprit mai mult ⇒ ziua „nejudecată”,
  // numărată (nu judecată tăcut pe 10 zile)
  u.ultim = u.ultim && typeof u.ultim === "object" ? u.ultim : {};
  const urmarite = new Set(); for (const x of u.zile) for (const s of Object.keys(x.pr)) urmarite.add(s);
  for (const s of urmarite) if (preturi[s] > 0) u.ultim[s] = { p: preturi[s], la: acum };
  for (const s of Object.keys(u.ultim)) if (!urmarite.has(s)) delete u.ultim[s];
  const ramase = [];
  for (const x of u.zile) {
    if (acum - x.la < 7 * ZI) { ramase.push(x); continue; }
    if (acum - x.la > 7 * ZI + 2 * 3600000) { u.judecate.push({ zi: x.zi, nejudecat: "colectorul n-a mers la 7 zile" }); continue; }
    const p1 = (s) => (preturi[s] > 0 ? preturi[s] : u.ultim[s] && u.ultim[s].p > 0 ? u.ultim[s].p : null);
    const ret = (s) => (x.pr[s] > 0 && p1(s) ? p1(s) / x.pr[s] - 1 : null);
    const toate = Object.keys(x.pr).map(ret).filter((v) => v != null), medie = toate.length ? toate.reduce((a, b) => a + b, 0) / toate.length : null;
    const parte = (lista, sg) => { const r = lista.map(ret).filter((v) => v != null); return r.length && medie != null ? { n: r.length, exces: sg * (r.reduce((a, b) => a + b, 0) / r.length - medie) } : null; };
    u.judecate.push({ zi: x.zi, la: x.la, short: parte(x.short, -1), long: parte(x.long, 1), nUnivers: toate.length });
  }
  u.zile = ramase; u.judecate = u.judecate.slice(-400);
  return u;
}
// ferestrele care NU se suprapun (la cel puțin 7 zile una de alta, de la cea mai veche) - regula casei pentru un verdict: 26 de ferestre
function independenteL(J) { let ultim = -Infinity; const o = []; for (const x of J.slice().sort((a, b) => String(a.zi).localeCompare(String(b.zi)))) { const t = Date.parse(x.zi + "T00:00:00Z"); if (t - ultim >= 7 * ZI) { o.push(x); ultim = t; } } return o; }
function independente(J) { return independenteL(J).length; }
export function rezumatUrmarire(u) {
  const J = u && Array.isArray(u.judecate) ? u.judecate : [], f = (k) => { const v = J.filter((x) => x[k] && Number.isFinite(x[k].exces)); if (!v.length) return { zile: 0, ferestre: 0 }; const I = independenteL(v);
    /* revizia valului 4 (27.11): fără „puterea dinainte” - urmărirea n-are regulă de verdict (e o descriere), deci n-are ce putere să spună */
    return { zile: v.length, ferestre: I.length, medie: v.reduce((a, b) => a + b[k].exces, 0) / v.length, pePlus: v.filter((x) => x[k].exces > 0).length / v.length }; };
  return { short: f("short"), long: f("long"), inAsteptare: u && Array.isArray(u.zile) ? u.zile.length : 0, nejudecate: J.filter((x) => x.nejudecat).length };
}

// ---- v100.396 (I-949, auditul 26.11): proba listei cu REGULA LUI, după cost și funding, față de un martor ----
// Regula lui de pe boții de semnal (PPST_Pionex_IND v1.3 / v1.4: intrarea pe MACD Expo, ieșirea pe PPST / stopul 60 %), portul RegulaLui (la literă cu
// motorul Python al Probei 13). Regulile probei, SCRISE ÎNAINTE de prima zi (27.11.2026), nu după cifre:
//  - intervalul 1 h (cel al Probei 13); costul 0,13 % pe tranzacție (Proba 13) + funding-ul real Binance (long plătește rata, short o primește)
//  - o dată pe zi UTC: primele 5 din lista short (regula Doar Short), primele 5 din lista long (Doar Long), martorul = cele mai lichide 5 monede
//    fără junk, de pe Pionex, care NU sunt în listele short / long (aceeași regulă pe fiecare parte)
//  - intră tranzacțiile deschise în cele 24 h de după notare și închise până la 48 h (cele încă deschise nu intră, se numără); judecata la 48 h,
//    cel mult 6 h mai târziu (altfel ziua e „nejudecată”, numărată)
//  - pe zi și parte: media netă pe tranzacție a listei și a martorului; diferența = lista − martorul
//  - verdictul abia la 26 de ferestre care nu se suprapun (≥ 2 zile una de alta), o singură dată, înghețat: „merge” = lista pe plus (IC 95 % peste
//    zero) ȘI peste martor (IC peste zero); „lista ajută, regula tot pierde” = peste martor, nu pe plus; „lista nu ajută” = sub martor (IC sub
//    zero); altfel „n-am aflat”. Pe 26.11 (Proba 13, un an, 1 h): regula pierdea −0,2 % pe zi pe monedă; ZEC +201 %, ENA +37 % - de aici întrebarea.
export const PROBA_REGULA = { cost: 0.13, f: 0.6, n: 5, ferestre: 26, gapZile: 2, judecaMs: 48 * 3600000, tolerantaMs: 6 * 3600000 };
// v100.396 (I-961, el 27.11: „fa tot plus idei”): PUTEREA DINAINTE, aceeași formulă ca AlReg.mde (K = 1) - efectul minim detectabil la 80% putere
// la nT ferestre, din abaterea ferestrelor independente de până acum (sub 5 ⇒ null), cu intervalul din nesiguranța abaterii (χ², Wilson–Hilferty).
// Efectul care ar conta pe bani, SCRIS ÎNAINTE (27.11): proba regulii = comisionul unei tranzacții (0,13 pp) între listă și martor - o diferență mai
// mică nu schimbă pe ce monedă pui botul. (Urmărirea listei n-are verdict, deci nici putere - revizia 27.11.)
export const BANI_PUTERE = { regula: PROBA_REGULA.cost };
const Z975 = 1.959964, Z80 = 0.841621, tqM = (z, gl) => z * (1 + (z * z + 1) / (4 * gl)), chi2M = (z, k) => { const a = 2 / (9 * k); return k * (1 - a + z * Math.sqrt(a)) ** 3; };
export function putereDinainte(v, nT, bani) {
  const n = Array.isArray(v) ? v.length : 0; if (n < 5) return null;
  const m = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)); if (!(sd > 0)) return null;
  const mde = (tqM(Z975, nT - 1) + tqM(Z80, nT - 1)) / Math.sqrt(nT) * sd, lo = mde * Math.sqrt((n - 1) / chi2M(Z975, n - 1)), hi = mde * Math.sqrt((n - 1) / chi2M(-Z975, n - 1));
  return { mde, lo, hi, n, nT, bani, poate: !(bani > 0) ? null : hi <= bani ? "da" : lo > bani ? "nu" : "la-limita" };
}
const T975 = { 25: 2.06 };
export function noteazaRegula(r, corp, acum) {
  r = r && typeof r === "object" ? r : {}; r.zile = Array.isArray(r.zile) ? r.zile : []; r.judecate = Array.isArray(r.judecate) ? r.judecate : [];
  const z = ziUtc(acum); if (r.zile.some((x) => x.zi === z) || r.judecate.some((x) => x.zi === z)) return r;
  const dupaS = new Map(corp.monede.map((m) => [m.s, m])), simb = (s) => { const m = dupaS.get(s); return m && m.sym ? { s, sym: m.sym } : null; };
  const inListe = new Set([...corp.short, ...corp.long]);
  const ctrl = corp.monede.filter((m) => m && m.sym && m.pionex && !(m.junk && m.junk.length) && !inListe.has(m.s)).sort((a, b) => b.vol - a.vol).slice(0, PROBA_REGULA.n).map((m) => ({ s: m.s, sym: m.sym }));
  const sh = corp.short.slice(0, PROBA_REGULA.n).map(simb).filter(Boolean), lg = corp.long.slice(0, PROBA_REGULA.n).map(simb).filter(Boolean);
  if (ctrl.length === PROBA_REGULA.n && (sh.length || lg.length)) r.zile.push({ zi: z, la: acum, short: sh, long: lg, ctrl });
  return r;
}
// tranzacțiile regulii pe o monedă, în fereastra zilei: { net: [...], deschise }
export function netZi(bare, funding, dirn, la, RL, P = PROBA_REGULA) {
  const H1 = 3600000, tr = RL.pe(bare, dirn, P.f), out = []; let deschise = 0;
  for (const x of tr) {
    const te = bare[x.bar].t + H1, tx = bare[x.exit].t + H1; if (te < la || te >= la + 86400000) continue;
    if (tx > la + P.judecaMs) { deschise++; continue; }
    const fund = (funding || []).filter((f) => f.t > te && f.t <= tx).reduce((a, f) => a + f.r, 0) * 100 * x.dir;
    out.push(x.r - P.cost - fund);
  }
  // intrată în fereastră și încă deschisă la ultima bară: nu intră în medie, se numără
  if (tr.deschisa) { const te = bare[tr.deschisa.bar].t + H1; if (te >= la && te < la + 86400000) deschise++; }
  return { net: out, deschise };
}
export async function judecaRegula(r, d, acum, P = PROBA_REGULA) {
  if (!r || !Array.isArray(r.zile) || !d.RegulaLui) return r;
  const ramase = [];
  for (const x of r.zile) {
    if (acum - x.la < P.judecaMs) { ramase.push(x); continue; }
    if (acum - x.la > P.judecaMs + P.tolerantaMs) { r.judecate.push({ zi: x.zi, nejudecat: "colectorul n-a mers la 48 h" }); continue; }
    const pana = x.la + P.judecaMs, cache = {};
    const adu = async (sym) => {
      if (cache[sym]) return cache[sym];
      const [k, f] = await Promise.all([d.binance(FAPI + "/fapi/v1/klines?symbol=" + sym + "&interval=1h&endTime=" + pana + "&limit=600"), d.binance(FAPI + "/fapi/v1/fundingRate?symbol=" + sym + "&startTime=" + x.la + "&endTime=" + pana + "&limit=100")]);
      const bare = Array.isArray(k) ? k.map(bara).filter((b) => b.t + 3600000 <= pana) : null;
      return (cache[sym] = bare && bare.length >= 400 ? { bare, fund: Array.isArray(f) ? f.map((y) => ({ t: +y.fundingTime, r: +y.fundingRate })).filter((y) => y.t > 0 && Number.isFinite(y.r)) : [] } : null);
    };
    const parte = async (lista, dirn) => {
      const L = [], C = []; let lipsa = 0, deschise = 0;
      for (const m of lista) { const a = await adu(m.sym); if (!a) { lipsa++; continue; } const z = netZi(a.bare, a.fund, dirn, x.la, d.RegulaLui, P); L.push(...z.net); deschise += z.deschise; }
      for (const m of x.ctrl) { const a = await adu(m.sym); if (!a) { lipsa++; continue; } const z = netZi(a.bare, a.fund, dirn, x.la, d.RegulaLui, P); C.push(...z.net); }
      const med = (v) => (v.length ? v.reduce((s, y) => s + y, 0) / v.length : null);
      return { nL: L.length, mL: med(L), nC: C.length, mC: med(C), deschise, lipsa };
    };
    const sh = x.short.length ? await parte(x.short, -1) : null, lg = x.long.length ? await parte(x.long, 1) : null;
    // o monedă n-a venit (Binance 429 / rețea) ⇒ ziua se reia la tura următoare, cât încape în toleranță; la capăt se judecă cu ce a venit (spus)
    if (((sh && sh.lipsa) || (lg && lg.lipsa)) && acum - x.la < P.judecaMs + P.tolerantaMs - 3600000) { ramase.push(x); continue; }
    r.judecate.push({ zi: x.zi, la: x.la, short: sh, long: lg });
  }
  r.zile = ramase; r.judecate = r.judecate.slice(-400);
  return r;
}
// rezumatul pe parte: ferestrele (zile cu tranzacții și în listă, și în martor, la ≥ 2 zile una de alta), mediile, intervalele; verdictul înghețat la 26
export function rezumatRegula(r, P = PROBA_REGULA) {
  const J = r && Array.isArray(r.judecate) ? r.judecate : [], out = { nejudecate: J.filter((x) => x.nejudecat).length, inAsteptare: r && Array.isArray(r.zile) ? r.zile.length : 0, nVerdict: P.ferestre };
  r.verdict = r.verdict && typeof r.verdict === "object" ? r.verdict : {};
  for (const k of ["short", "long"]) {
    let ultim = -Infinity; const F = [];
    for (const x of J.filter((y) => y[k] && y[k].nL > 0 && y[k].nC > 0).sort((a, b) => String(a.zi).localeCompare(String(b.zi)))) { const t = Date.parse(x.zi + "T00:00:00Z"); if (t - ultim >= P.gapZile * ZI) { F.push(x[k]); ultim = t; } }
    const st = (v) => { const n = v.length, m = n ? v.reduce((a, b) => a + b, 0) / n : null, sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : null, tc = n >= P.ferestre ? T975[25] : null; return { m, lo: tc && sd !== null ? m - tc * sd / Math.sqrt(n) : null, hi: tc && sd !== null ? m + tc * sd / Math.sqrt(n) : null }; };
    const F26 = F.slice(0, P.ferestre), dif = st(F26.map((y) => y.mL - y.mC)), lista = st(F26.map((y) => y.mL)), mart = st(F26.map((y) => y.mC));
    const o = { ferestre: F.length, tranzactiiLista: F.reduce((a, y) => a + y.nL, 0), tranzactiiMartor: F.reduce((a, y) => a + y.nC, 0), lista: lista.m, martor: mart.m, dif: dif.m, verdict: "se-aduna",
      putere: F.length < P.ferestre ? putereDinainte(F.map((y) => y.mL - y.mC), P.ferestre, BANI_PUTERE.regula) : null };   /* v100.396 (I-961) */
    if (F.length >= P.ferestre) o.verdict = lista.lo > 0 && dif.lo > 0 ? "merge" : dif.lo > 0 ? "ajuta-dar-pierde" : dif.hi < 0 ? "nu-ajuta" : "n-am-aflat";
    if (!r.verdict[k] && o.verdict !== "se-aduna") r.verdict[k] = { verdict: o.verdict, la: Date.now(), lista: lista.m, dif: dif.m, ic: [dif.lo, dif.hi] };   /* dat o dată */
    if (r.verdict[k]) { o.verdict = r.verdict[k].verdict; o.inghetat = r.verdict[k].la; }
    out[k] = o;
  }
  return out;
}

export async function turaMonedeBot(d, st) {
  const acum = d.acum; if (acum - (st.la || 0) < RITM_MS) return null;
  st.la = acum;
  const M = d.MonedeBot, P = M.PRAGURI, disc = (typeof d.citesteDisc === "function" && d.citesteDisc()) || {};
  const esec = async (motiv) => {
    st.esecuri = (st.esecuri || 0) + 1; d.jurnal("monede de bot: " + motiv + " (eșecul " + st.esecuri + " la rând)");
    if (st.esecuri === 3 && typeof d.trimiteAlerta === "function") await d.trimiteAlerta({ nivel: "atentie", titlu: "🎯 Lista monedelor de bot nu se mai reface", mesaj: "De 3 ore la rând colectorul n-a putut reface lista (" + motiv + "). Pe Radar lista rămâne cea veche și scrie VECHE; nu porni un bot nou după ea până nu revine." }, null, "monede-bot-esec");
    return { facut: false, motiv };
  };
  if (d.binance && typeof d.binance.reia === "function" && !d.binance.reia()) return esec("Binance a interzis IP-ul (418)");
  const [info, tick, prem, book] = await Promise.all([d.binance(FAPI + "/fapi/v1/exchangeInfo"), d.binance(FAPI + "/fapi/v1/ticker/24hr"), d.binance(FAPI + "/fapi/v1/premiumIndex"), d.binance(FAPI + "/fapi/v1/ticker/bookTicker")]);
  if (!info || !Array.isArray(info.symbols) || !Array.isArray(tick)) return esec("Binance n-a dat lista contractelor sau volumele");
  let pion = null; try { pion = bazePionex(await d.cere("/api/market?type=pionex_symbols&market=PERP")); } catch { pion = null; }
  if (!pion) return esec("lista Pionex PERP n-a venit");
  const onb = new Map(info.symbols.filter((x) => x && x.quoteAsset === "USDT" && x.status === "TRADING" && x.contractType === "PERPETUAL" && x.underlyingType === "COIN").map((x) => [x.symbol, x]));
  const fr = new Map(Array.isArray(prem) ? prem.map((x) => [x.symbol, +x.lastFundingRate]) : []), bk = new Map(Array.isArray(book) ? book.map((x) => [x.symbol, x]) : []);
  const ale = new Set((typeof d.boti === "function" ? d.boti() : []).map((b) => M.cheie(b.s)));
  const tk = tick.filter((x) => onb.has(x.symbol) && (+x.quoteVolume >= P.preFiltruVol || ale.has(M.cheie(x.symbol))));
  if (tk.length < 10) return esec("doar " + M.cate(tk.length, "contract", "contracte") + " peste " + Math.round(P.preFiltruVol / 1e6) + " M USDT/zi");
  const rand = await inParalel(tk, 4, async (t) => {
    const sym = t.symbol, [oi, k4, k1] = await Promise.all([d.binance(FAPI + "/fapi/v1/openInterest?symbol=" + sym), d.binance(FAPI + "/fapi/v1/klines?symbol=" + sym + "&interval=4h&limit=86"), d.binance(FAPI + "/fapi/v1/klines?symbol=" + sym + "&interval=1h&limit=601")]);
    if (!Array.isArray(k4) || !Array.isArray(k1) || !oi) return null;
    const pret = +t.lastPrice, b = bk.get(sym), spr = b && pret > 0 ? (+b.askPrice - +b.bidPrice) / pret * 1e4 : null, ob = onb.get(sym);
    // bara în curs nu intră: ultima e cea deschisă (k4 / k1 cer una în plus)
    return M.masoara({ sym, pret, vol: +t.quoteVolume, oi: +oi.openInterest * pret, sprBp: spr, zile: ob && +ob.onboardDate > 0 ? (acum - +ob.onboardDate) / ZI : null, fund: fr.has(sym) ? fr.get(sym) : null,
      b4: k4.slice(0, -1).map(bara), b1: k1.slice(0, -1).map(bara), pionex: pion.has(M.cheie(sym)) }, P);
  });
  if (d.binance && d.binance.stare && d.binance.stare.oprit) return esec("tura oprită (" + d.binance.stare.oprit + ")");
  const monede = rand.filter(Boolean);
  if (monede.length < 0.8 * tk.length) return esec("doar " + monede.length + " din " + M.cate(tk.length, "monedă citită", "monede citite"));
  const L = M.liste(monede, P), slim = (m) => ({ sym: m.sym, s: m.s, pret: m.pret, vol: m.vol, oi: m.oi, sprBp: m.sprBp, zile: m.zile, fund: m.fund, pionex: m.pionex, r14: m.r14, er14: m.er14, r3: m.r3, er3: m.er3, r24: m.r24, amp: m.amp, ppst1h: m.ppst1h, junk: m.junk, parte: m.parte, agitata: m.agitata, taria: m.taria, revine: m.revine, ppstCuParte: m.ppstCuParte });
  const corp = { la: acum, n: tk.length, nPionex: pion.size, monede: monede.map(slim), short: L.short.map((m) => m.s), long: L.long.map((m) => m.s), revenire: L.revenire.map((m) => m.s), range: L.range.map((m) => m.s) };   // el, 26.11: direcție / revenire / range
  if (corp.monede.length > 300) corp.monede = corp.monede.sort((a, b) => b.vol - a.vol).slice(0, 300);   // revizia (🟡3): ruta ține cel mult 300 (într-o piață fierbinte pot fi mai multe peste 50 M)
  // urmărirea înainte: prețurile de acum ale tuturor monedelor citite
  // revizia (🟡4): prețurile de judecată din ticker-ul TUTUROR contractelor (o monedă din listă care a căzut sub 50 M se judecă și ea)
  const preturi = {}; for (const t of tick) if (onb.has(t.symbol) && +t.lastPrice > 0) preturi[M.cheie(t.symbol)] = +t.lastPrice;
  disc.urm = urmareste(disc.urm, corp, preturi, acum, P); corp.urmarire = rezumatUrmarire(disc.urm);
  // v100.396 (I-949): proba listei cu regula lui - notarea zilei, judecata la 48 h (o cerere picată nu oprește lista), rezumatul spre pagină
  if (d.RegulaLui) { disc.reg = noteazaRegula(disc.reg, corp, acum); try { await judecaRegula(disc.reg, d, acum); } catch (e) { d.jurnal("monede de bot: proba regulii", String(e && e.message || e).slice(0, 120)); } corp.regula = rezumatRegula(disc.reg); }
  // revizia (🟡3): un refuz al serverului (400 / 413) e un eșec al turei - numărat, cu alerta după 3 la rând (înainte: excepția ocolea numărătoarea)
  try { await d.trimite("/api/istoric-bot?action=monedeBot", corp); } catch (e) { return esec("serverul a refuzat lista (" + String(e && e.message || e).slice(0, 80) + ")"); }
  if (st.esecuri >= 3 && typeof d.trimiteAlerta === "function") await d.trimiteAlerta({ nivel: "info", titlu: "🎯 Lista monedelor de bot s-a refăcut", mesaj: "După " + st.esecuri + " ture fără reușită, lista e iar la zi (" + M.cate(monede.length, "monedă citită", "monede citite") + ")." }, null, "monede-bot-revenit");
  st.esecuri = 0;
  // Discord (1): o monedă nouă în primele 3 pe o parte - o dată pe 24 h pe monedă și parte; prima tură după pornire doar ține minte (fără val de mesaje)
  disc.vazut = disc.vazut || {}; const noi = [];
  for (const parte of ["short", "long"]) L[parte].slice(0, P.nTop).forEach((m, i) => { const k = parte + ":" + m.s; if (!disc.vazut[k] || acum - disc.vazut[k] > ZI) { if (disc.pornit) noi.push({ m, parte, loc: i + 1 }); } disc.vazut[k] = acum; });
  for (const k of Object.keys(disc.vazut)) if (acum - disc.vazut[k] > 3 * ZI) delete disc.vazut[k];
  if (noi.length && typeof d.trimiteAlerta === "function") await d.trimiteAlerta({ nivel: "info", titlu: "🎯 Monedă nouă în capul listei de bot direcțional",
    mesaj: noi.map((x) => M.eticheta(x.parte, x.m) + " #" + x.loc + ": " + x.m.s + " · " + M.acum(x.m) + " · " + (M.probabil(x.m) ? M.probabil(x.m).scurt + " · " : "") + M.pr(x.m.amp) + "/zi · vol " + M.mil(x.m.vol) + " · OI " + M.mil(x.m.oi)).join("\n") + "\nUn filtru (volum real, agitată, merge drept), nu o predicție." }, null, "monede-bot-nou:" + noi.map((x) => x.parte + ":" + x.m.s).sort().join(","));   // revizia (🟡1): cheia poartă monedele (politica de repetare taie aceeași cheie sub 24 h)
  // Discord (2): boții tăi pe monede junk - o dată pe 24 h pe monedă
  disc.junk = disc.junk || {}; const pj = M.botiPeJunk(corp, typeof d.boti === "function" ? d.boti() : []);
  for (const b of pj) {
    if (disc.junk[b.s] && acum - disc.junk[b.s] < ZI) continue;
    if (typeof d.trimiteAlerta === "function" && await d.trimiteAlerta({ nivel: "atentie", titlu: "⚠ Botul tău e pe o monedă junk: " + b.s, mesaj: b.s + " pică filtrul de monede reale: " + b.motive.join(", ") + ". Volumul de pe ecran poate fi umflat, iar mișcările bruște și alunecarea sunt mai mari decât arată cifrele." }, b.id || null, "monede-bot-junk:" + b.s)) disc.junk[b.s] = acum;
  }
  for (const k of Object.keys(disc.junk)) if (acum - disc.junk[k] > 3 * ZI) delete disc.junk[k];
  disc.pornit = true; if (typeof d.scrieDisc === "function") d.scrieDisc(disc);
  return { facut: true, n: monede.length, short: corp.short, long: corp.long, junkBoti: pj.map((b) => b.s), noi: noi.length };
}
