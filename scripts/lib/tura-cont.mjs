// Tura „contul întreg” a colectorului (v100.176 / colector v101.102; el 13.10: „din prima recomandare 1–6”). La 6 ore: adună pozițiile
// (boții Pionex, Trading 212, Salt), prețurile zilnice și cursul leului, rulează ContIntreg (public/lib/cont-intreg.js - aceleași formule ca
// pagina) și trimite raportul acasă (KV cont:raport). O dată pe zi ține minte valoarea contului (cont:zile) și, dacă reconcilierea găsește
// o abatere, o spune pe Discord (o dată pe zi pentru fiecare). Doar CITIRE; o sursă căzută rămâne lipsă în raport, nu oprește restul.
// d = { cere, trimite, trimiteAlerta, jurnal, ContIntreg, T212, JurnalTrade, GridCalcul, botiInchisi() -> trades|throw, salt() -> rânduri,
//       cursBnr() -> {zi, curs}, yahooLung(simbol) -> [{t, c}] (10 ani, cache pe disc), bareZi(cale) -> răspunsul rutei (cache pe disc o zi,
//       cererile noi la 2,5 s - ruta de prețuri are limita ei pe minut), acum, MesajeColector }
import { CalendarBursa } from "./calendar-bursa.mjs";   // jurnalul de execuție: era bursa deschisă când ai dat ordinul?
const ORA = 3600000, PAS = 6 * ORA;
const ziRo = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));   // v100.396
// v100.396 (revizia 27.11, 🟠5): rândul zilei (cont:zile) - scrie / marchează. Prima scriere a zilei merge la orice oră; un rând PARȚIAL se rescrie
// doar până la 07:00 RO (cât e încă închiderea de ieri); după 07:00 rândul parțial de noapte rămâne (nu se pune valoarea de la 09:00 în locul lui)
// și ziua se marchează făcută. { scrie, marcheaza } - `marcheaza` acum (fără scriere) sau după o scriere reușită (`marcheazaDupa`).
// v100.396 (I-959, el 27.11: „fa tot plus idei”): istoricul depunerilor / retragerilor T212 (ruta t212?action=tranzactii, o pagină pe cerere) - la
// FIECARE tură a contului (6 h; revizia: înainte o dată la 20 h ⇒ o retragere de după citire ieșea pierdere), cu 11 s între pagini (T212: 6 cereri pe
// minut): prima oară până la 420 de zile în urmă (sau capătul istoriei), apoi doar până la citirea de dinainte (de obicei o pagină). O pagină picată
// ⇒ lista veche, cu `la` vechi (frâna n-o folosește peste ora ei). { la, pana (cea mai veche oră acoperită), items: [{ t, s }] }
export async function tranzactiiT212(d, st, acum, pauzaMs = 11000) {
  const v = st.tranzT212 && typeof st.tranzT212 === "object" && Array.isArray(st.tranzT212.items) ? st.tranzT212 : { la: 0, pana: null, items: [] };
  /* fără scurtătură „citit acum 10 min”: lista refolosită ar avea `la` < ora citirii contului ⇒ garda frânei (tr.la ≥ t1) o refuză și frâna ar sta
     „nu se știe” până la tura următoare (6 h); incremental, o tură costă de obicei O pagină (se oprește la citirea de dinainte) */
  const LIMITA = acum - 420 * 86400000, noi = []; let cur = null, tm = null, pana = v.pana, pagini = 0;
  for (;;) {
    const r = await incearca(d, "tranzacțiile T212", () => d.cere("/api/t212?action=tranzactii" + (cur ? "&cursor=" + encodeURIComponent(cur) + (tm ? "&time=" + encodeURIComponent(tm) : "") : "")));
    if (!r) return v;   /* picată ⇒ se reia */
    pagini++; for (const x of r.bani || []) if (Number.isFinite(x.t) && Number.isFinite(x.s) && (!x.moneda || x.moneda === "RON")) noi.push({ t: x.t, s: x.s });   /* contul T212 e în lei (citit 27.11); altă monedă nu se adună cu lei */
    const vechi = Number(r.celMaiVechi) || null;
    if (!r.cursor) { pana = 1; break; }                                    /* capătul istoriei: acoperit tot */
    if (vechi && vechi < LIMITA) { pana = Math.min(pana || vechi, vechi); break; }
    if (v.la && vechi && vechi <= v.la && v.pana) break;                   /* am ajuns la citirea de ieri: restul e știut */
    if (pagini >= 40) return v;                                            /* gardă: ceva nu se termină - nu scriu o acoperire falsă */
    cur = r.cursor; tm = r.time; if (pauzaMs) await new Promise((x) => setTimeout(x, pauzaMs));
  }
  const toate = new Map(); for (const x of v.items.concat(noi)) toate.set(x.t + "|" + x.s, x);
  return { la: acum, pana: pana || v.pana, items: [...toate.values()].sort((a, b) => a.t - b.t).slice(-2000), pagini };
}
export function deciziaZilei(st, z, complet, ora) {
  if (st.ziValoare === z) return { scrie: false, marcheaza: false };
  if (st.ziPartial === z && ora >= 7) return { scrie: false, marcheaza: true };
  return { scrie: true, marcheaza: false, marcheazaDupa: !!complet || ora >= 7 };
}
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("cont " + ce, e.message); return null; } }
const bareDinRanduri = (G, randuri) => G.bareBursa(randuri || [], Date.now()).map((b) => ({ t: b.t, c: b.c, h: b.h, l: b.l }));   // v100.178: + h / l (MAE / MFE)
// prețurile zilnice prin cache-ul de pe disc (d.bareZi) când există, altfel direct
const zilnic = (d, cale) => (d.bareZi ? d.bareZi(cale) : d.cere(cale));
export const FORMA_RAPORT = 370;   // v100.369: forma raportului (bani, riscAcum, carte, grafice); alta ⇒ raportul se reface la prima tură (.1: istoria lungă pe ≥ 90 % din expunere)
const CORECTII_INDUSTRIE = { QCOM: ["Technology", "Semiconductors"] };
// începutul unei zile (AAAA-LL-ZZ) în ora României, în ms (ora de vară / iarnă din Intl)
export function inceputZiRo(z) {
  const u = Date.parse(z + "T00:00:00Z"), ro = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(u));
  const h = Number((ro.find((x) => x.type === "hour") || {}).value) || 0;
  return u - h * ORA;
}

// v100.234: o dată pe zi, același rând cont:zile primește și pauza, VaR-ul și evenimentul, când citirile au reușit.
// v100.238: același rând ține și `la`, ora citirii. Zilele vechi nu se reconstruiesc.
// v100.239: același rând ține și semnul funding-ului, long sau short, tot doar la citirea reușită. Golul nu se scrie.
// O citire picată nu inventează pauză, nu pune `la`, nu pune semnul și nu marchează ziua completă.
function semnFundingZi(d) {
  if (!d || !d.Acasa || typeof d.Acasa.fundingAtentie !== "function") return "";
  let f = d.funding;
  if (typeof f === "function") { try { f = f(); } catch (e) { return ""; } }
  try {
    const s = d.Acasa.fundingAtentie(f);
    return s === "long" || s === "short" ? s : "";
  } catch (e) { return ""; }
}
export async function campuriZiFrana(d, acum, raport) {
  const o = {};
  const tot = raport && raport.valoare ? Number(raport.valoare.total) : NaN;
  const va = raport && raport.risc ? Number(raport.risc.var95) : NaN;
  // v100.370 (ideea 2): lângă pragul vechi (var95) se ține și cel „de acum” (var95a), ca proba pe zilele reale să le judece pe amândouă
  const va2 = raport && raport.riscAcum && raport.riscAcum.acum ? Number(raport.riscAcum.acum.var95) : NaN;
  if (Number.isFinite(tot) || Number.isFinite(va)) o.raport = { valoare: Number.isFinite(tot) ? { total: tot } : null, risc: Number.isFinite(va) ? (Number.isFinite(va2) ? { var95: va, var95a: Math.round(va2) } : { var95: va }) : null };
  if (!d || !d.cere || !d.Acasa || !d.ScorSezon || !d.StatisticaTrade || !d.JurnalTrade) return o;
  let pauza, eveniment;
  const ar = await incearca(d, "boți zi", () => d.cere("/api/istoric-bot?action=botiInchisi"));
  const cfg = await incearca(d, "sezon zi", () => d.cere("/api/scor-sezon?piata=pionex"));
  const boti = ar && Array.isArray(ar.boti) ? ar.boti : null;
  if (boti) {
    try {
      const tr = d.StatisticaTrade.dinPionex(d.JurnalTrade.din(boti)).concat(d.StatisticaTrade.dinPionexAlte ? d.StatisticaTrade.dinPionexAlte(d.JurnalTrade.alte(boti)) : []);
      const s = d.ScorSezon.calc(tr, cfg && cfg.sezon, acum, "pionex");
      if (s) pauza = !!s.pauza;
      if (pauza && s.serie && s.serie.n > 0) o.pauzaN = s.serie.n;
    } catch (e) { if (d.jurnal) d.jurnal("cont frana zi", e.message); }
  }
  const cal = await incearca(d, "calendar zi", () => d.cere("/api/stiri?action=calendar"));
  // v100.332 (auditul 12.11, 🔴1): calendarul venit cu `eroare` (faireconomy n-a răspuns) e necunoscut - ziua nu se mai salvează „fără eveniment”
  if (cal && !cal.eroare && d.Acasa.calendar) {
    try {
      const urm = d.Acasa.calendar(cal.evenimente, acum).urmatoare || [];
      const azi = ziRo(acum);
      const ev = urm.filter((x) => x && x.mare && x.t && ziRo(x.t) === azi)[0];
      eveniment = ev ? String(ev.titlu).slice(0, 160) : "";
    } catch (e) { if (d.jurnal) d.jurnal("cont frana zi", e.message); }
  }
  if (typeof pauza === "boolean" && typeof eveniment === "string") {
    o.pauza = pauza; o.eveniment = eveniment; o.raportStare = "ok"; o.la = acum;
    const semn = semnFundingZi(d);
    if (semn) o.fundingAtentie = semn;
  }
  else delete o.pauzaN;
  return o;
}
// v100.369: banii pe bucăți, rotunjiți pentru raport (lei la ban, procentele la 4 zecimale - pagina le spune cu una)
function rotBani(b, rot) {
  if (!b) return null;
  const B = b.boti, P = B && B.proces;
  return { an: b.an, tot: rot(b.tot),
    t212: b.t212 ? { pnl: rot(b.t212.pnl), twr: rot(b.t212.twr, 4), n: b.t212.n } : null,
    deschiseT212: b.deschiseT212 ? { n: b.deschiseT212.n, lei: rot(b.deschiseT212.lei) } : null,
    boti: B ? { n: B.n, zile: B.zile, grila: rot(B.grila), directie: rot(B.directie), comisioane: rot(B.comisioane), funding: rot(B.funding), net: rot(B.net), netUsdt: rot(B.netUsdt),
      pornite: B.pornite ? { n: B.pornite.n, lei: rot(B.pornite.lei) } : null,
      proces: P ? { zile: P.zile, medie: rot(P.medie, 5), lo: rot(P.lo, 5), hi: rot(P.hi, 5), p: rot(P.p, 4), pePlus: rot(P.pePlus, 3) } : null } : null };
}
export async function turaCont(d, st) {
  const acum = d.acum || Date.now();
  // v100.369: un raport de formă veche se reface la prima tură după livrare (altfel pagina nouă ar aștepta până la 6 ore)
  const formaVeche = st.forma !== FORMA_RAPORT && st.la > 0;
  if (st.inLucru || (!formaVeche && acum - (st.la || 0) < PAS) || acum - (st.esecLa || 0) < ORA) return null;   // (revizia, M4): după un eșec, o oră pauză
  st.inLucru = true;
  try { return await faRaport(d, st, acum); } catch (e) { st.esecLa = acum; throw e; } finally { st.inLucru = false; }
}

async function faRaport(d, st, acum) {
  const C = d.ContIntreg, G = d.GridCalcul, lipsuri = [];
  // 1. pozițiile și banii
  const botiR = await incearca(d, "boți", () => d.cere("/api/bot-orders")), boti = botiR && Array.isArray(botiR.bots) ? botiR.bots : null;
  if (!boti) lipsuri.push("boții Pionex");
  let pionexLiber = null;
  try {
    const cf = await d.cere("/api/pionex-account?action=futures"), cs = await d.cere("/api/pionex-account?action=balances");
    const sold = cs && cs.data && Array.isArray(cs.data.balances) ? cs.data.balances : [], q = (x) => (Number(x.free) || 0) + (Number(x.frozen) || 0);
    let spot = sold.reduce((s, x) => (x && (x.coin === "USDT" || x.coin === "USDC") ? s + q(x) : s), 0);
    // v100.396 (auditul 26.11 🟡): și celelalte monede din soldul spot, la prețul Pionex de acum (o cerere pentru toate); una fără preț = lipsă spusă,
    // nu zero (pe viu, 27.11: doar 0,003 USDT, deci azi nu schimbă nimic - dar o monedă spot ținută ar fi lipsit tăcut din cont)
    const alte = sold.filter((x) => x && x.coin && x.coin !== "USDT" && x.coin !== "USDC" && q(x) > 0);
    if (alte.length) {
      let px = {}; try { const t = await d.cere("/api/market?type=pionex_tickers&market=SPOT"); for (const k of (t && t.data && Array.isArray(t.data.tickers) ? t.data.tickers : [])) if (k && /_USDT$/.test(k.symbol) && Number(k.close) > 0) px[k.symbol.replace(/_USDT$/, "")] = Number(k.close); } catch (e) { d.jurnal("cont: prețurile spot", e.message); }
      for (const x of alte) { if (px[x.coin] > 0) spot += q(x) * px[x.coin]; else lipsuri.push("Pionex spot: " + String(x.coin).slice(0, 12) + " (fără preț)"); }
    }
    pionexLiber = cf && cf.usdt && cf.usdt.total !== null && Number.isFinite(Number(cf.usdt.total)) ? spot + Number(cf.usdt.total) : null;
  } catch (e) { d.jurnal("cont pionex liber", e.message); }
  const pozR = await incearca(d, "pozițiile T212", () => d.cere("/api/t212?action=pozitii")), poz = pozR && Array.isArray(pozR.pozitii) ? pozR.pozitii.filter((x) => x && x.quantity > 0) : null;
  const cashR = await incearca(d, "contul T212", () => d.cere("/api/t212?action=cont")), cash = cashR && cashR.cash || null;
  const istR = await incearca(d, "istoricul T212", () => d.cere("/api/t212?action=istoric")), umpleri = istR && Array.isArray(istR.umpleri) ? istR.umpleri : null;
  if (!poz) lipsuri.push("pozițiile Trading 212");
  // v100.369 (auditul 20.11, 🔴3): Salt necitit (null, de pildă imediat după repornirea colectorului) e lipsă spusă, nu „Salt 0 lei, complet”
  const saltL = await incearca(d, "Salt", async () => d.salt()), salt = Array.isArray(saltL) ? saltL : [];
  if (!Array.isArray(saltL)) lipsuri.push("Salt");
  // 2. cursul leului: USD din BNR (ca pagina), EUR și GBP din Yahoo; seriile zilnice ale cursului pentru risc și randament
  const bnr = await incearca(d, "BNR", () => d.cursBnr());
  const fxBare = {};
  for (const [m, s] of [["USD", "USDRON=X"], ["EUR", "EURRON=X"], ["GBP", "GBPRON=X"], ["CAD", "CADRON=X"], ["CHF", "CHFRON=X"]]) fxBare[m] = await incearca(d, "curs " + m, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(s))).randuri)) || [];
  const ultim = (b) => (b && b.length ? b[b.length - 1].c : null);
  const leiPe = { USD: bnr && bnr.curs > 0 ? bnr.curs : ultim(fxBare.USD), EUR: ultim(fxBare.EUR), GBP: ultim(fxBare.GBP), CAD: ultim(fxBare.CAD), CHF: ultim(fxBare.CHF) };
  const fxSerii = { USD: C.randamente(fxBare.USD), EUR: C.randamente(fxBare.EUR), GBP: C.randamente(fxBare.GBP), CAD: C.randamente(fxBare.CAD), CHF: C.randamente(fxBare.CHF) };
  const leiZi = {}; for (const m of Object.keys(fxBare)) { leiZi[m] = {}; for (const b of fxBare[m]) leiZi[m][new Date(b.t).toISOString().slice(0, 10)] = b.c; }
  if (bnr && bnr.toate) for (const [z, c] of Object.entries(bnr.toate)) leiZi.USD[z] = c;   // BNR bate Yahoo pe zilele pe care le are

  // (revizia, I8): moneda reală a instrumentelor T212
  const mon = await incearca(d, "monedele T212", () => d.cere("/api/t212?action=monede")); if (mon && mon.monede) C.setMonede(mon.monede);
  // 3. expunerile
  const e = [];
  for (const b of boti || []) { const x = C.dinBot(b, leiPe); if (x) e.push(x); }
  for (const p of poz || []) { const x = C.dinT212(p, leiPe); if (x) e.push(x); }
  for (const r of salt) { const x = C.dinSalt(r, leiPe); if (x) e.push(x); }

  // 4. seriile zilnice (2 ani) ale fiecărei poziții + factorii (BTC, QQQ) pentru beta; simbolul Yahoo al acțiunilor, pentru istoria lungă
  const serii = {}, yahooSimbol = {}, bareScurte = {};
  for (const x of e) {
    if (serii[x.cheie]) continue;
    let bare = null;
    if (x.tip === "bot" && x.simbolPionex) bare = await incearca(d, "bare " + x.nume, async () => G.bare((await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(x.simbolPionex) + "&interval=1D&limit=500")).data.klines).map((b) => ({ t: b.t, c: b.c })));
    else if (x.tip === "t212") bare = await incearca(d, "bare " + x.nume, async () => { const r = await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(x.id)); if (r && r.simbol) yahooSimbol[x.cheie] = r.simbol; return bareDinRanduri(G, r && r.randuri); });
    else if (x.tip === "salt") { bare = await incearca(d, "bare " + x.nume, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(x.id))).randuri)); yahooSimbol[x.cheie] = x.id; }
    if (bare && bare.length) { serii[x.cheie] = C.randamente(bare); bareScurte[x.cheie] = bare; }
  }
  const btcB = await incearca(d, "BTC", async () => G.bare((await d.cere("/api/market?type=pionex_klines&symbol=BTC_USDT_PERP&interval=1D&limit=500")).data.klines).map((b) => ({ t: b.t, c: b.c }))) || [];
  const qqqB = await incearca(d, "QQQ", async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=QQQ_US_EQ")).randuri)) || [];
  const spyB = await incearca(d, "SPY", async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=SPY_US_EQ")).randuri)) || [];
  const fBtc = C.randamente(btcB), fQqq = C.randamente(qqqB), fSpy = C.randamente(spyB), betas = {};
  for (const x of e) if (serii[x.cheie] && betas[x.cheie] === undefined) betas[x.cheie] = C.beta(serii[x.cheie], x.clasa === "crypto" ? fBtc : fQqq, 180);

  // 5. riscul pe o zi, corelațiile, diversificarea
  const ist = C.pnlIstoric(e, serii, fxSerii, { n: 250 });
  const v95 = C.varEs(ist.zile, 0.95), v99 = C.varEs(ist.zile, 0.99), rea = C.ziuaCeaMaiRea(ist.zile);
  const folosite = e.filter((x) => ist.folosite.includes(x.cheie));
  const perechi = C.corelatii(e, serii, { zile: 90, min: 40, max: 12 }), div = C.diversificare(folosite, serii, ist.zileCal || ist.zile);

  // 6. stres-testele: factorii și pozițiile pe 10 ani (Yahoo, cache pe disc o săptămână); monedele pe BTC-USD / X-USD
  const lung = async (s) => (s ? await incearca(d, "istoria lungă " + s, () => d.yahooLung(s)) : null);
  const factori = { BTC: await lung("BTC-USD"), QQQ: await lung("QQQ"), SPY: await lung("SPY") }, bareLungi = {};
  for (const x of e) {
    if (bareLungi[x.cheie] !== undefined) continue;
    const s = x.tip === "bot" ? x.cheie.slice(2).replace(/^1000+/, "") + "-USD" : yahooSimbol[x.cheie];
    let bl = (await lung(s)) || null;
    // (revizia, M10): „X-USD” la Yahoo poate fi altă monedă cu același nume ⇒ ultima închidere trebuie să semene (±25 %) cu prețul de acum
    if (bl && bl.length && x.tip === "bot" && x.pret > 0 && Math.abs(bl[bl.length - 1].c / x.pret - 1) > 0.25) { d.jurnal("cont: " + s + " la Yahoo nu se potrivește cu prețul botului - folosesc β × BTC"); bl = null; }
    bareLungi[x.cheie] = bl;
  }
  // v100.370 (ideea 1): crizele cu tot cu mișcarea leului din fereastra lor (cursul pe 10 ani al monedelor din cont)
  const fxCrize = {}; for (const m of new Set(e.map((x) => (x.moneda === "GBX" ? "GBP" : x.moneda === "USDT" ? "USD" : x.moneda)).concat(["USD"]))) fxCrize[m] = await lung(m + "RON=X");
  const stres = C.stres(e, { factori, bareLungi, betas, leiPe, fx: fxCrize });
  // 6b. v100.369 (el 20.11, „cifra de acum + proba”): riscul pe agitația de acum (EWMA) și proba pe zilele reale, pe istoria lungă a pozițiilor
  // de acum; aceleași zile dau și scăderea cărții de acum și pariurile independente pe ferestre. Istoria începe în ziua de la care există
  // pozițiile care fac ≥ 90 % din expunere (C.istoriaLunga): pe viu, un bot mic pe o monedă listată de un an tăia proba de la ~900 la 106
  // zile; pozițiile prea tinere ies din probă și se spun (riscAcum.scoase), nu taie istoria celorlalte.
  let riscA = null, carte = null, pariuriF = null;
  try {
    const fxL = {};
    for (const m of new Set(folosite.map((x) => (x.moneda === "GBX" ? "GBP" : x.moneda === "USDT" ? "USD" : x.moneda)))) { const b = await lung(m + "RON=X"); fxL[m] = b && b.length ? C.uneSerii(C.randamente(b), fxSerii[m]) : fxSerii[m] || {}; }
    const seriiL = {}; for (const x of folosite) seriiL[x.cheie] = bareLungi[x.cheie] && bareLungi[x.cheie].length ? C.uneSerii(C.randamente(bareLungi[x.cheie]), serii[x.cheie]) : serii[x.cheie];   /* lung (cache de o săptămână) + zilele proaspete */
    const IL = C.istoriaLunga(folosite, seriiL, 0.9), st0 = IL.de, zs = {};
    IL.lungi.forEach((x) => Object.keys(seriiL[x.cheie] || {}).forEach((z) => { if (z >= st0) zs[z] = 1; }));
    const istL = C.pnlIstoric(IL.lungi, seriiL, fxL, { zile: Object.keys(zs).sort() }), folL = IL.lungi.filter((x) => istL.folosite.includes(x.cheie));
    riscA = C.riscAcum(istL.zile, {});
    carte = C.scadereCarte(istL.zile, folL.reduce((a, x) => a + Math.abs(x.notionalLei), 0), { rar: 2 });
    pariuriF = C.pariuriFerestre(folL, seriiL, istL.zile, { de: new Date(acum - 730 * 86400000).toISOString().slice(0, 10) });
    if (riscA) riscA.scoase = istL.scoase.concat(IL.scurte.map((x) => ({ nume: x.nume, motiv: "istorie prea scurtă pentru probă (din " + (x.de ? x.de.slice(8, 10) + "." + x.de.slice(5, 7) + "." + x.de.slice(0, 4) : "—") + "), " + (Math.round(x.pondere * 1000) / 10).toString().replace(".", ",") + " % din expunere" })));
  } catch (err) { d.jurnal("cont risc acum", err.message); }

  // 7. reconcilierea cu brokerii
  const recT212 = poz && umpleri ? C.reconciliereT212(poz, d.T212.perechi(umpleri).deschise) : null;
  let recArhiva = null;
  try {
    const p1 = await d.cere("/api/bot-orders?status=finished&brut=1"), toti = await d.botiInchisi();
    recArhiva = C.reconciliereArhiva((p1 && p1.bots || []).map((b) => b.strategyId || b.buOrderId).filter(Boolean), toti.map((b) => b.strategyId || b.buOrderId || b.id));
  } catch (err) { d.jurnal("cont reconciliere arhiva", err.message); }
  let recUrm = null;
  if (boti) {
    const ultima = {};
    for (const b of boti.filter((x) => x && x.activ)) { const r = await incearca(d, "istoric " + b.id, () => d.cere("/api/istoric-bot?bot=" + encodeURIComponent(b.id) + "&ore=1")); const l = r && Array.isArray(r.intrari) ? r.intrari : []; ultima[b.id] = l.length ? Math.max(...l.map((y) => Number(y.t) || 0)) : null; }
    recUrm = C.reconciliereUrmarire(boti.filter((x) => x && x.activ).map((b) => ({ id: b.id, nume: String(b.baza || "").replace(/\.PERP$/, "") })), ultima, acum, 20);
  }

  const val0 = () => C.valoare({ boti, pionexLiber, t212Cash: cash, salt, leiPe }).total;
  // 8. randamentul: T212 refăcut din umpleri (tickerele din ultimele ~400 de zile), boții din arhivă (+ cei porniți, cu profitul de acum)
  let serieT212 = [];
  const bareT = {};   // barele zilnice ale acțiunilor tranzacționate (randamentul și jurnalul de execuție)
  if (umpleri) {
    // v100.396 (auditul 26.11 🟡): + tickerele pozițiilor DESCHISE acum - una cumpărată acum peste 420 de zile și ținută (fără umpleri de atunci)
    // lipsea cu totul din câștigul T212 pe an; seria ei se reface din umplerile ei vechi (istoria e întreagă), ca la celelalte
    const recente = [...new Set(umpleri.filter((u) => acum - u.t < 420 * 86400000).map((u) => u.ticker).concat((poz || []).map((p) => p && p.ticker).filter(Boolean)))];
    // simbolurile fără prețuri (delistate) se țin minte o săptămână - altfel ~200 de cereri moarte la fiecare tură
    st.faraPreturi = st.faraPreturi || {};
    for (const tk of recente) {
      if (bareScurte["T:" + tk]) { bareT[tk] = bareScurte["T:" + tk]; continue; }
      if (acum - (st.faraPreturi[tk] || 0) < 7 * 86400000) continue;
      let b = null; try { b = bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&ticker=" + encodeURIComponent(tk))).randuri); } catch (err) { if (err.status === 404 || err.tinut || /HTTP 404/.test(err.message)) st.faraPreturi[tk] = acum; else d.jurnal("cont bare randament " + tk, err.message); }
      if (b && b.length) bareT[tk] = b;
    }
    serieT212 = C.seriaT212(umpleri.filter((u) => recente.includes(u.ticker)), bareT, leiZi, { pana: new Date(acum).toISOString().slice(0, 10) });
  }
  // v100.369 (auditul 20.11, 🔴1 + 🔴2; hotărârea LUI „lei net, pe bucăți”): boții NU mai au procent - suma pusă a fiecărui bot atins în zi
  // nu e capitalul (36 de boți scurți pe 26.10 ⇒ 46.504 lei „la lucru”, în cont erau 1.144); banii lor = netul în lei la cursul zilei
  // închiderii, pe bucăți (grila, direcția, comisioanele, funding-ul), plus „proces sau ghinion” pe zilele de închidere. Netul, nu brutul.
  let baniB = null;
  try {
    baniB = C.baniBoti(d.JurnalTrade.din(await d.botiInchisi()), leiZi, acum - 365 * 86400000);
    const pornite = (boti || []).filter((b) => b && b.activ);
    baniB.pornite = { n: pornite.length, lei: pornite.length && leiPe.USD > 0 ? pornite.reduce((a, b) => a + (Number(b.profitTotal) || 0), 0) * leiPe.USD : 0 };
  } catch (err) { d.jurnal("cont banii botilor", err.message); }
  const an = (s) => s.filter((x) => x.z >= new Date(acum - 365 * 86400000).toISOString().slice(0, 10));
  // reperul în LEI (contul e în lei; leul a mișcat ~11 % față de dolar într-un an); Trading 212 cu procentul lui, cu intervalul spus
  const fxUsdLung = await incearca(d, "curs USD lung", () => lung("USDRON=X")), fxUsdR = fxUsdLung && fxUsdLung.length ? C.randamente(fxUsdLung) : fxSerii.USD;
  const spyLei = C.reperLei(C.randamente(factori.SPY || spyB), fxUsdR), btcLei = C.reperLei(C.randamente(factori.BTC || btcB), fxUsdR);
  const t212An = an(serieT212), t212S = C.statistici(t212An);
  const randament = {
    t212: t212S, t212FataSpy: C.fataDe(t212An, spyLei), t212Interval: C.interval(t212An, spyLei), reperLei: true,
    spyLei: C.fataDe(t212An, spyLei), btcLei: C.fataDe(t212An, btcLei),
    t212Aprox: serieT212.aprox || [], t212Nepotrivite: serieT212.nepotrivite || [], t212FaraCumparare: serieT212.faraCumparare || [],
  };
  // ce stă pe pozițiile deschise acum (pierderea / câștigul nerealizat, în lei, cum îl dă Trading 212)
  const deschiseT212 = poz ? { n: poz.length, lei: poz.reduce((a, p) => a + (Number(p.ppl) || 0), 0) } : null;
  const bani = {
    an: { de: new Date(acum - 365 * 86400000).toISOString().slice(0, 10), pana: new Date(acum).toISOString().slice(0, 10) },
    t212: t212S ? { pnl: t212S.pnl, twr: t212S.twr, n: t212S.n } : null, boti: baniB, deschiseT212,
    tot: t212S && baniB ? t212S.pnl + baniB.net + (baniB.pornite ? baniB.pornite.lei : 0) : null,
  };

  // 8b. execuția: prețul plănuit față de cel obținut (conversia, stopurile, limitele, ordinele date cu bursa închisă, ieșirile sub planul tău)
  let executie = null;
  if (umpleri) {
    try {
      const vandute = [...new Set(umpleri.filter((x) => x.side === "SELL" && acum - x.t < 366 * 86400000).map((x) => x.ticker))], planuri = {};
      for (const tk of vandute) { const p = await incearca(d, "plan " + tk, () => d.cere("/api/istoric-bot?action=plan&bot=" + encodeURIComponent("t212-" + tk))); if (p && p.plan && !p.plan.proba && p.plan.stop > 0) planuri[tk] = { stop: p.plan.stop, la: p.plan.la }; }
      executie = C.executie(umpleri, { leiZi, bare: bareT, planuri, de: acum - 365 * 86400000, sedinta: (t, tk) => CalendarBursa.stare(t, tk).deschisa });
    } catch (err) { d.jurnal("cont executie", err.message); }
  }
  // 8c. v100.178: factorii și sectoarele, atribuirea, MAE / MFE, ținta de volatilitate (Factori)
  let factoriR = null, atribuireR = null, mae = null, vol = null;
  const rotF = (x, z) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * Math.pow(10, z || 0)) / Math.pow(10, z || 0));
  if (d.Factori) {
    try {
      const fz = {}; for (const etf of d.Factori.ETF_FACTORI) { const b = await incearca(d, "factorul " + etf, async () => bareDinRanduri(G, (await zilnic(d, "/api/t212?action=preturi&interval=1d&yahoo=" + etf)).randuri)); if (b && b.length) fz[etf] = C.randamente(b); }
      const uh = await incearca(d, "universul SUA", async () => (await d.cere("/api/istoric-bot?action=universSua")).harta) || {};
      const info = {}, fb = {};
      for (const x of e) {
        if (x.clasa !== "actiuni") continue;
        x.simbol = x.tip === "t212" ? d.T212.simbol(x.id) : String(x.id).split(".")[0];
        // v100.369 (🟡11): sursa clasează QCOM la „Radio And Television…” - e semiconductori (cipuri fără fabrică); corecția doar pentru simbolurile știute
        const h = CORECTII_INDUSTRIE[String(x.simbol).toUpperCase()] || uh[String(x.simbol).toUpperCase()]; info[x.simbol] = h ? { sector: h[0], industrie: h[1] } : {};
        const etf = h && d.Factori.SECTOARE[h[0]] ? (/Semicond/i.test(h[1] || "") ? "SMH" : d.Factori.SECTOARE[h[0]].etf) : null;
        const f = d.Factori.factoriActiune(serii[x.cheie], fz, etf); if (f) fb[x.cheie] = f;
      }
      factoriR = d.Factori.expunere(e, info, fb, { prag: 0.4 });
      factoriR.perPozitie = e.filter((x) => fb[x.cheie]).map((x) => ({ nume: x.nume, lei: rotF(x.notionalLei), sector: info[x.simbol] && info[x.simbol].sector || null, industrie: info[x.simbol] && info[x.simbol].industrie || null, piata: rotF(fb[x.cheie].piata, 2), mici: rotF(fb[x.cheie].mici, 2), momentum: rotF(fb[x.cheie].momentum, 2), sectorBeta: rotF(fb[x.cheie].sector, 2), etf: fb[x.cheie].etf || null, r2: rotF(fb[x.cheie].r2, 2) }));
      factoriR.sectorPe = {}; e.forEach((x) => { if (x.simbol && info[x.simbol] && info[x.simbol].sector) factoriR.sectorPe[x.simbol] = info[x.simbol].sector; });
      const inchBoti = await incearca(d, "boții pentru atribuire", async () => d.JurnalTrade.din(await d.botiInchisi())) || [];
      // v100.369 (🔴5): reperul în lei (ca randamentul T212) + cât de sigur e alfa (eroarea din volatilitatea rămasă, pe anii din fereastră)
      atribuireR = { t212Spy: d.Factori.atribuire(t212An, spyLei), t212Qqq: d.Factori.atribuire(t212An, C.reperLei(C.randamente(qqqB), fxUsdR)), boti: d.Factori.descompunereBoti(inchBoti, acum - 365 * 86400000), usdLei: leiPe.USD, reperLei: true };
      const aS = atribuireR.t212Spy, rhoS = randament.t212FataSpy && randament.t212FataSpy.rho;
      if (aS && t212S && t212S.vol > 0 && Number.isFinite(rhoS)) { const rez = t212S.vol * Math.sqrt(Math.max(0, 1 - rhoS * rhoS)), ani = aS.n / 252; aS.eroare = rez / Math.sqrt(ani); aS.t = aS.eroare > 0 ? aS.alfa / aS.eroare : null; }
      if (umpleri) { const m = d.Factori.maeMfe(d.T212.perechi(umpleri).inchise, bareT, { de: acum - 365 * 86400000 }); mae = { ...m, trades: undefined, celeMaiAdanci: m.trades.filter((x) => x.rez <= 0).sort((a, b) => a.mae - b.mae).slice(0, 5) }; }
      vol = d.Factori.tintaVol(ist.zile, val0(), 0.15, folosite, serii);
    } catch (err) { d.jurnal("cont factori", err.message); }
  }
  // 8d. v100.179: gărzile LUI (pragurile din datele lui) + lecția săptămânii (duminică seara)
  let garziR = null, lectieR = null;
  if (d.Disciplina) {
    try {
      const banda = await incearca(d, "banda", async () => (await d.cere("/api/istoric-bot?action=disciplinaBanda")).banda);
      const regulaOre = banda && banda.regula ? banda.regula.h : null;
      const pozPct = (poz || []).map((p) => ({ nume: d.T212.simbol(p.ticker), pct: Number(p.averagePrice) > 0 ? Number(p.currentPrice) / Number(p.averagePrice) - 1 : null }));
      const stopM = mae && mae.stopSugerat !== null && mae.stopSugerat !== undefined ? mae.stopSugerat : -0.08;
      garziR = d.Disciplina.garzi({ factori: factoriR, vol, pozitii: pozPct, stop: stopM, stopDinMae: !!(mae && mae.stopSugerat), boti: d.botiAfara ? d.botiAfara() : [], regulaOre });
      // lecția: duminică de la 19:00 sau luni până la 12:00 (ora României), o dată pe săptămână
      const ro = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)), w = (ro.find((x) => x.type === "weekday") || {}).value, h = Number((ro.find((x) => x.type === "hour") || {}).value);
      const duminica = w === "Sun" ? acum : w === "Mon" ? acum - 86400000 : null, sapt = duminica ? ziRo(duminica) : null;
      if (sapt && ((w === "Sun" && h >= 19) || (w === "Mon" && h < 12)) && st.lectieSapt !== sapt && umpleri) {
        const maeLista = d.Factori ? d.Factori.maeMfe(d.T212.perechi(umpleri).inchise, bareT, { de: acum - 9 * 86400000 }).trades : [], mfePe = {}; maeLista.forEach((x) => { mfePe[x.id] = x.mfe; });
        const tradesW = d.T212.perechi(umpleri).inchise.map((t) => ({ id: t.id, ticker: t.ticker, simbol: t.simbol, pornit: t.pornit, inchis: t.inchis, rezultat: t.rezultat, cost: t.cost, pct: t.pct, mfe: mfePe[t.id] !== undefined ? mfePe[t.id] : null }));
        const botiW = (await incearca(d, "boții săptămânii", async () => d.JurnalTrade.din(await d.botiInchisi())) || []).map((t) => ({ id: t.id, moneda: t.moneda, inchis: t.inchis, net: t.net, oreAfara: banda && banda.oreAfaraPe ? banda.oreAfaraPe[t.id] || 0 : 0 }));
        const verd = await incearca(d, "verdictele", async () => (await d.cere("/api/istoric-bot?action=verdicte")).verdicte) || [];
        const teze = await incearca(d, "tezele", async () => (await d.cere("/api/istoric-bot?action=teze")).teze) || [];
        // v100.369 (🟡2): săptămâna = luni 00:00 – duminică 24:00, ora României (7 zile; înainte 8, în UTC, și ziua de duminică intra în două lecții)
        const pana = inceputZiRo(sapt) + 86400000, de = pana - 7 * 86400000;
        lectieR = d.Disciplina.lectia({ de, pana, trades: tradesW, boti: botiW, usdLei: leiPe.USD, stop: stopM, regulaOre, verdicte: verd, teze });
        const ver = d.Disciplina.verifica(st.regulaPrec || null, lectieR);
        await d.trimite("/api/istoric-bot?action=lectie", { la: acum, sapt, lectie: lectieR, verificare: ver });
        await d.trimiteAlerta(d.MesajeColector.lectiaSaptamanii(lectieR, ver), null, "lectia-" + sapt);
        st.lectieSapt = sapt; if (lectieR.regula) st.regulaPrec = lectieR.regula;
      }
    } catch (err) { d.jurnal("cont disciplina", err.message); }
  }
  // 9. raportul
  const val = C.valoare({ boti, pionexLiber, t212Cash: cash, salt, leiPe });
  // v100.396 (I-947): ppl + result din contul T212 (aceeași monedă ca totalul) - fluxul de bani se scoate din schimbare cu ele (ContIntreg.fluxT212)
  if (cash && Number.isFinite(Number(cash.ppl)) && Number.isFinite(Number(cash.result)) && val.t212 !== null) val.t212Rez = Math.round((Number(cash.ppl) + Number(cash.result)) * 100) / 100;
  const rot = (x, z) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * Math.pow(10, z || 0)) / Math.pow(10, z || 0));
  const raport = {
    la: acum, versiune: d.versiune || null, leiPe, valoare: val, lipsuri,
    expuneri: e.map((x) => ({ tip: x.tip, cheie: x.cheie, nume: x.nume, clasa: x.clasa, moneda: x.moneda, lei: rot(x.notionalLei), valoareLei: rot(x.valoareLei), beta: rot(betas[x.cheie], 2), lipsa: x.lipsa || null })),
    risc: { n: ist.zile.length, var95: v95 && rot(v95.var), es95: v95 && rot(v95.es), var99: v99 && rot(v99.var), es99: v99 && rot(v99.es), ziRea: rea ? { z: rea.z, lei: rot(rea.pnl) } : null,
      scoase: ist.scoase, pnl: ist.zile.map((x) => [x.z, rot(x.pnl)]),
      folosite: ist.folosite },   /* v100.396 (revizia valului 4): cheile chiar adunate în pnl - planul „ce tai” lucrează doar pe ele */
    // v100.369 (🔴4): TOATE perechile (cel mult 66 la 12 poziții), nu primele 15 - numărătoarea „câte sunt același risc” era tăiată
    corelatii: perechi.map((p) => ({ a: p.a, b: p.b, rho: rot(p.rho, 2), n: p.n, acelasiRisc: p.acelasiRisc, seAcopera: p.seAcopera })), corelatiiN: perechi.length, diversificare: div ? { raport: rot(div.raport, 2), pariuri: rot(div.pariuri, 1), pozitii: div.pozitii } : null,
    stres: stres.map((s) => ({ cod: s.cod, nume: s.nume, de: s.de, pana: s.pana, btc: rot(s.btc, 4), qqq: rot(s.qqq, 4), lei: rot(s.pnl), leu: rot(s.leu, 4), lipsa: s.lipsa, pozitii: s.pozitii.slice(0, 6).map((p) => ({ nume: p.nume, r: rot(p.r, 4), lei: rot(p.lei), cum: p.cum, lichidat: p.lichidat })) })),
    reconciliere: { t212: recT212, arhiva: recArhiva, urmarire: recUrm },
    executie, factori: factoriR, atribuire: atribuireR, maeMfe: mae, vol, garzi: garziR,
    randament, bani: rotBani(bani, rot),
    riscAcum: riscA ? { n: riscA.n, de: riscA.de, pana: riscA.pana, fereastra: riscA.fereastra, lambda: riscA.lambda, sigma: rot(riscA.sigma), sigmaFer: rot(riscA.sigmaFer), sigma20: rot(riscA.sigma20),
      acum: { var95: rot(riscA.acum.var95, 1), es95: rot(riscA.acum.es95, 1), var99: rot(riscA.acum.var99, 1), es99: rot(riscA.acum.es99, 1), ic: Object.fromEntries(Object.entries(riscA.acum.ic).map(([k, v]) => [k, [rot(v[0]), rot(v[1])]])) },
      vechi: { var95: rot(riscA.vechi.var95, 1), es95: rot(riscA.vechi.es95, 1), var99: rot(riscA.vechi.var99, 1), es99: rot(riscA.vechi.es99, 1) },
      proba: riscA.proba, scoase: riscA.scoase || [] } : null,
    carte: carte ? { expunere: rot(carte.expunere), acum: rot(carte.acum, 4), max: { dd: rot(carte.max.dd, 4), de: carte.max.de, pana: carte.max.pana }, z5: carte.z5 && { r: rot(carte.z5.r, 4), de: carte.z5.de, pana: carte.z5.pana }, z20: carte.z20 && { r: rot(carte.z20.r, 4), de: carte.z20.de, pana: carte.z20.pana } } : null,
    // seriile celor 4 grafice (el 20.11: „toate 4”)
    grafice: {
      risc: riscA ? riscA.serie.map((x) => [x[0], rot(x[1]), rot(x[2]), rot(x[3])]) : null,
      boti: baniB ? baniB.cumulat.map((x) => [x[0], rot(x[1]), rot(x[2]), rot(x[3]), rot(x[4])]) : null,
      pariuri: pariuriF ? pariuriF.map((x) => [x[0], rot(x[1], 2), rot(x[2], 2)]) : null,
      carte: carte ? carte.serie.map((x) => [x[0], rot(x[1], 4)]) : null,
    },
    // seriile ultimelor 120 de zile, pentru Poartă (corelația candidatului cu ce ai deja)
    serii: Object.fromEntries(Object.entries(serii).map(([k, s]) => [k, Object.fromEntries(Object.keys(s).sort().slice(-120).map((z) => [z, rot(s[z], 5)]))])),
    // v100.396 (revizia valului 4): cursul leului pe aceleași 120 de zile - planul scade o acțiune vândută cu tot cu partea ei valutară (banii rămân în lei)
    fx: Object.fromEntries(Object.entries(fxSerii).map(([k, s]) => [k, Object.fromEntries(Object.keys(s || {}).sort().slice(-120).map((z) => [z, rot(s[z], 6)]))])),
  };
  // v100.396 (I-947, auditul 26.11): frâna pe TOT contul - schimbarea de azi și pe 7 zile, în lei, fără depunerile T212 (ContIntreg.castigCont);
  // o citire picată a zilelor ⇒ fără `castig` (frâna nu se trage pe ghicit)
  // v100.396 (I-959): + istoricul depunerilor T212 (o dată pe zi; tura asta e la 6 ore, în afara buclei alertelor) - pentru rândurile vechi fără
  // ppl + result; intră și în raport (doar depuneri / retrageri, puține), ca proba de pe pagină să facă aceeași socoteală
  let trT = null;
  if (typeof C.fluxDinTranzactii === "function") {
    try { st.tranzT212 = await tranzactiiT212(d, st, acum); trT = st.tranzT212 && st.tranzT212.pana ? st.tranzT212 : null; } catch (err) { d.jurnal("cont tranzacțiile T212", err.message); }
    if (trT) raport.tranzT212 = { pana: trT.pana, la: trT.la, items: trT.items.map((x) => ({ t: x.t, s: rot(x.s) })) };
  }
  if (typeof C.castigCont === "function") {
    const zl = await incearca(d, "zilele contului", () => d.cere("/api/istoric-bot?action=contZile"));
    if (zl && Array.isArray(zl.zile)) raport.castig = C.castigCont(zl.zile, { valoare: val.total, t212: val.t212, t212Rez: val.t212Rez, complet: val.complet, citit: acum }, ziRo(acum), trT);
  }
  // v100.396 (I-957): „ce tai ca să cobori sub 4%” - din aceleași serii ca riscul; doar informație (pagina Contul întreg + Discord o dată pe zi)
  if (typeof C.planSub4 === "function") { try { const pl = C.planSub4(raport); if (pl && !pl.putine && !pl.lipsa) raport.planRisc = { v0: rot(pl.v0), pct0: pl.pct0, prag: pl.prag, ajunge: pl.ajunge, toate: pl.toate, v: rot(pl.v), pct: pl.pct, n: pl.n, pePozitii: pl.pePozitii.map((x) => ({ cheie: x.cheie, nume: x.nume, parte: x.parte, lei: rot(x.lei) })) }; } catch (err) { d.jurnal("cont planul sub 4%", err.message); } }
  await d.trimite("/api/istoric-bot?action=cont", { cont: raport });
  st.la = acum; st.forma = FORMA_RAPORT;
  const z = ziRo(acum);
  // v100.369 (🟡1): rândul zilei se scrie ca până acum (o dată, la prima citire a zilei - frâna ține de ziua citirii), dar duce și ora
  // citirii (`citit`): tura de după miezul nopții citește închiderea de IERI, iar pagina etichetează rândul cu ziua pe care o închide
  // (ziValoare: până la 07:00, ora României, e ziua de ieri) și spune când a fost citit.
  const dz = deciziaZilei(st, z, val.complet, oraRo(acum)); if (dz.marcheaza) st.ziValoare = z;
  if (dz.scrie && val.total > 0) { const fr = await campuriZiFrana(d, acum, raport); const okZ = await incearca(d, "valoarea zilei", () => d.trimite("/api/istoric-bot?action=contZi", Object.assign({ z, valoare: rot(val.total), complet: val.complet, pionex: rot(val.pionex), t212: rot(val.t212), salt: rot(val.salt), citit: acum }, Number.isFinite(val.t212Rez) ? { t212Rez: val.t212Rez } : {}, fr))); if (okZ && dz.marcheazaDupa) st.ziValoare = z; else if (okZ) st.ziPartial = z; }   /* v100.396 (auditul 26.11 🟡): un rând PARȚIAL se rescrie la turele următoare până la 07:00 RO (cât e încă închiderea de ieri); înainte rămânea parțial toată ziua, sărit de probe */   // (revizia, M5): doar dacă a ajuns
  // 10. reconcilierea pe Discord: o dată pe zi pentru fiecare abatere
  const abateri = [];
  if (recT212 && !recT212.ok) for (const a of recT212.abateri) abateri.push({ cheie: "rec-t212-" + a.ticker, m: d.MesajeColector.reconciliereT212(a) });
  if (recArhiva && !recArhiva.ok) abateri.push({ cheie: "rec-arhiva", m: d.MesajeColector.reconciliereArhiva(recArhiva) });
  if (recUrm && !recUrm.ok) abateri.push({ cheie: "rec-urmarire", m: d.MesajeColector.reconciliereUrmarire(recUrm) });
  // v100.179: gărzile încălcate - o dată pe zi fiecare (aceeași coadă ca reconcilierea); banda o spune deja alerta pe viu
  for (const g of garziR || []) if (!g.ok && g.cod !== "banda" && d.MesajeColector.garda) abateri.push({ cheie: "garda-" + g.cod, m: d.MesajeColector.garda(g) });
  // v100.396 (I-947): frâna pe tot contul pe Discord, o dată pe zi fiecare prag (cheile „frana-…” trec mereu pe Discord, și noaptea)
  const cc = raport.castig;
  if (cc && cc.prag && val.complet && d.MesajeColector.franaContTot) for (const fel of ["zi", "sapt"]) { const x = cc[fel], p = Number(cc.prag[fel]); if (x && Number.isFinite(x.pct) && Number.isFinite(x.lei) && p > 0 && x.pct <= -p) abateri.push({ cheie: "frana-cont-" + fel, m: d.MesajeColector.franaContTot(fel, x, p) }); }
  // v100.396 (I-957): riscul pe o zi peste buget ⇒ o dată pe zi pe Discord, cu planul (doar informație)
  /* revizia valului 4 (27.11, 🟠): alerta de peste 4% nu mai depinde de existența planului (un bot pe o monedă nouă îl putea face să dispară) */
  const v4 = typeof C.riscZi === "function" ? Number(C.riscZi(raport).var95) : NaN, pct4 = val.total > 0 && Number.isFinite(v4) ? v4 / val.total : null;
  const pr4 = raport.planRisc || (pct4 !== null ? { pct0: pct4, prag: 0.04, pePozitii: [] } : null);
  if (pr4 && pr4.pct0 > pr4.prag && val.complet && d.MesajeColector.planRisc) abateri.push({ cheie: "frana-cont-risc", m: d.MesajeColector.planRisc(pr4) });
  st.spuse = st.spuse && st.spuse.zi === z ? st.spuse : { zi: z, chei: {} };
  for (const a of abateri) { if (st.spuse.chei[a.cheie]) continue; if (await d.trimiteAlerta(a.m, null, a.cheie)) st.spuse.chei[a.cheie] = 1; }
  d.jurnal("cont: " + Math.round(val.total).toLocaleString("ro-RO") + " lei" + (val.complet ? "" : " (fără " + val.lipsa.join(", ") + ")") + " · VaR95 " + (v95 ? Math.round(v95.var) + " lei" : "—") + " · " + (stres[0] ? "cea mai rea criză " + stres[0].nume + " " + Math.round(stres[0].pnl) + " lei" : "fără stres") + " · abateri " + abateri.length);
  return raport;
}
