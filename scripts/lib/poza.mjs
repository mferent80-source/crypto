// Poza colectorului (v98): ce vede pagina `alerts` din Trading Tools, de oriunde. Functie PURA: primeste datele deja
// adunate de colector (boti, pozitii T212, simbolurile paginii cu extra-urile de la Yahoo) si intoarce JSON-ul din
// contractul spec-ului (docs/superpowers/specs/2026-09-27-alerts-trading-tools-din-radar-design.md, §4).
const ZI = 86400000, FEREASTRA_INSIDERI = 60 * ZI;
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
const rot = (x, z = 4) => (nr(x) === null ? null : Math.round(x * 10 ** z) / 10 ** z);

// regula suitei (premarket_scanner/lib/insider.js): P = cumparare cu bani; S/D/F/G = vanzare; grant/award/conversie = nu e semnal
export function clasifica(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return null;
  if (t.startsWith("purchase")) return "buy";
  if (t.startsWith("sale") || t.startsWith("stock gift") || t.startsWith("disposition")) return "sell";
  return null;
}
function nume(s) { return String(s || "").toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase()); }
// tranzactiile insiderilor (Yahoo quoteSummary.insiderTransactions.transactions) -> agregatul pe 60 de zile
export function insideri(tranzactii, acum) {
  if (!Array.isArray(tranzactii) || !tranzactii.length) return { form4: false, buys: 0, sells: 0, bp: 0, sp: 0, net: 0, verdict: "neut", top: [], n60: 0 };
  const tx = [];
  for (const x of tranzactii) {
    const d = Date.parse((x && x.startDate && x.startDate.fmt) || ""), f = clasifica(x && x.transactionText);
    if (!Number.isFinite(d) || !f || acum - d > FEREASTRA_INSIDERI || d > acum + ZI) continue;
    tx.push({ d: new Date(d).toISOString().slice(5, 10), cine: nume(x.filerName), rol: String(x.filerRelation || ""), f, act: nr(x.shares && x.shares.raw) || 0, val: nr(x.value && x.value.raw) || 0 });
  }
  const buys = tx.filter((t) => t.f === "buy"), sells = tx.filter((t) => t.f === "sell");
  const bp = new Set(buys.map((t) => t.cine)).size, sp = new Set(sells.map((t) => t.cine)).size;
  const net = buys.reduce((a, t) => a + t.act, 0) - sells.reduce((a, t) => a + t.act, 0);
  let verdict = "neut";
  if (bp >= 2 && net > 0) verdict = "bull"; else if (bp === 1 && net > 0) verdict = "bull1"; else if (sells.length >= 2 && net < 0 && sells.length >= buys.length) verdict = "bear";
  const top = tx.slice().sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 3);
  return { form4: true, buys: buys.length, sells: sells.length, bp, sp, net, verdict, top, n60: tx.length };
}
// n puncte dintr-o lista lunga, cu primul si ultimul pastrate
export function esantion(l, n) {
  if (!Array.isArray(l)) return []; if (l.length <= n) return l.slice();
  return Array.from({ length: n }, (_, i) => l[Math.round((i * (l.length - 1)) / (n - 1))]);
}
// costul in lei al pozitiei = loturile deschise (FIFO) ale tickerului, ca t212CostLei din pagina Radarului
export function costLeiDinLoturi(loturi, ticker, qty) {
  let q = 0, cost = 0;
  for (const l of Array.isArray(loturi) ? loturi : []) if (l && l.ticker === ticker) { q += Number(l.qty) || 0; cost += (Number(l.qty) || 0) * (Number(l.costBuc) || 0); }
  if (!(q > 0) || !(qty > 0) || Math.abs(q - qty) / qty > 0.02) return null;
  return cost * qty / q;
}
// zile calendaristice de la ziua de azi (UTC) pana la data (nu ore rotunjite: "in 25 de zile" e diferenta de date)
function zileDinData(iso, acum) {
  const d = Date.parse(String(iso || "") + "T00:00:00Z"); if (!Number.isFinite(d)) return null;
  const a = new Date(acum), azi = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.round((d - azi) / ZI);
}
// ActiuniSemnale.semafor -> {nivel, motive[], ceAsFace}; niveluri -> {nivel:"ok", stop, tinta, trend}
function semaforT212(sem, niv) {
  return { niv: sem && sem.nivel && sem.nivel !== "fara-date" ? sem.nivel : null, motive: sem && Array.isArray(sem.motive) ? sem.motive.slice(0, 6) : [], sfat: sem && sem.ceAsFace ? String(sem.ceAsFace) : "", trend: niv && niv.trend ? String(niv.trend) : null };
}
function pozitieT212(x) {
  const pret = nr(x.pret), mediu = nr(x.pretMediu), sem = semaforT212(x.sem, x.niv);
  const plan = x.plan ? { trailPct: nr(x.plan.trailPct), tinta: nr(x.plan.tinta) ?? (x.niv ? nr(x.niv.tinta) : null), stop: x.niv ? nr(x.niv.stop) : null, max: nr(x.maxDupaCumparare), stopFix: nr(x.plan.stop) } : null;
  return { s: String(x.simbol || ""), t212: String(x.ticker || ""), buc: rot(x.qty, 6), mediu: rot(mediu, 4), costLei: rot(x.costLei, 2),
    pret: rot(pret, 4), prev: rot(x.prev, 4), la: nr(x.la), closes30: esantion((x.bare || []).map((b) => rot(b && b.c, 4)).filter((c) => c !== null).slice(-30), 30),
    pplLei: rot(x.ppl, 2), pctLei: nr(x.ppl) !== null && nr(x.costLei) ? rot(x.ppl / x.costLei, 6) : null, pctPret: pret && mediu ? rot(pret / mediu - 1, 6) : null,
    plan, trend: sem.trend, pondere: rot(x.pondere, 4), niv: sem.niv, motive: sem.motive, sfat: sem.sfat };
}
// SemnaleBot.semafor -> {nivel, cod, motiv, faCe, componente:[{nivel, cod, motiv, faCe}]}
function semaforBot(sem) {
  if (!sem || !sem.nivel) return { niv: null, motive: [], sfat: "" };
  const motive = [sem.motiv].concat((Array.isArray(sem.componente) ? sem.componente : []).map((c) => c && c.motiv)).filter((m, i, l) => typeof m === "string" && m && l.indexOf(m) === i);
  return { niv: String(sem.nivel), motive: motive.slice(0, 6), sfat: sem.faCe ? String(sem.faCe) : "" };
}
function botPoza(b) {
  const pret = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), total = nr(b.profitTotal), brut = nr(b.gridProfitBrut) || 0, com = nr(b.comisioane) || 0, sem = semaforBot(b.semafor);
  return { id: String(b.id), s: String(b.baza || "").replace(/\.PERP$/, ""), dir: String(b.directie || "").toLowerCase(), lev: nr(b.levier), investit: rot(b.investit, 2), jos, sus,
    pret: rot(pret, 6), inGrid: pret !== null && jos !== null && sus !== null && sus > jos ? rot((pret - jos) / (sus - jos), 4) : null, lichidarePct: rot(b.distantaLichidarePct, 2),
    total: rot(total, 2), perechi: nr(b.ordinePerechi), gridBrut: rot(brut, 2), pozitie: total !== null ? rot(total - brut - com, 2) : null, comisioane: rot(com, 3),
    zero: rot(b.zero, 6), plan: b.plan ? { plus: nr(b.plan.plus), minus: nr(b.plan.minus), afaraOre: nr(b.plan.afaraOre) } : null,
    niv: sem.niv, motive: sem.motive, sfat: sem.sfat,
    pret30: esantion((b.pret30 || []).map((v) => rot(v, 6)).filter((v) => v !== null), 30), la: nr(b.la) };
}
function simbolPoza(x, acum) {
  const e = x.extra || null;
  return { s: String(x.s || ""), nota: String(x.nota || "").slice(0, 80), sursa: x.sursa || null, moneda: x.moneda || "$", pret: rot(x.pret, 4), prev: rot(x.prev, 4),
    closes30: esantion((x.closes30 || []).map((c) => rot(c, 4)).filter((c) => c !== null).slice(-30), 30),
    insideri: e ? insideri(e.tranzactii, acum) : null,
    rezultate: e && e.rezultate && e.rezultate.data ? { data: e.rezultate.data, zile: zileDinData(e.rezultate.data, acum), eps: rot(e.rezultate.eps, 2) } : null,
    analisti: e && e.analisti ? { tinta: rot(e.analisti.tinta, 2), recom: e.analisti.recom || null, n: nr(e.analisti.n) } : null,
    shortFloat: e ? rot(e.shortFloat, 4) : null };
}
export function construiestePoza(i) {
  const acum = nr(i.acum) || Date.now();
  const t212 = (i.t212 || []).filter((x) => x && x.qty > 0).map(pozitieT212), boti = (i.boti || []).filter((b) => b && b.id).map(botPoza);
  // t212La = cand au fost citite pozitiile (la o limitare de cereri raman cele de la poza anterioara); t212Eroare = ce a spus T212
  const t212Eroare = i.t212Eroare ? String(i.t212Eroare) : null;
  return { la: acum, versiune: String(i.versiune || ""), colector: { pid: nr(i.pid), tura: nr(i.tura) }, t212, t212La: nr(i.t212La), t212Eroare, boti,
    simboluri: (i.simboluri || []).filter((x) => x && x.s).map((x) => simbolPoza(x, acum)),
    gol: { boti: boti.length ? null : "niciun bot activ", t212: t212.length ? null : (t212Eroare ? "Trading 212 n-a răspuns (" + t212Eroare + "); pozițiile vin cu poza următoare" : "nicio poziție deschisă") } };
}
