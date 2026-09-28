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
  if (!Array.isArray(tranzactii) || !tranzactii.length) return { form4: false, buys: 0, sells: 0, bp: 0, sp: 0, net: 0, verdict: "neut", top: [], n60: 0, ultimaCumparare: null };
  const tx = [];
  for (const x of tranzactii) {
    const d = Date.parse((x && x.startDate && x.startDate.fmt) || ""), f = clasifica(x && x.transactionText);
    if (!Number.isFinite(d) || !f || acum - d > FEREASTRA_INSIDERI || d > acum + ZI) continue;
    const zi = new Date(d).toISOString().slice(0, 10);
    tx.push({ d: zi.slice(5), zi, cine: nume(x.filerName), rol: String(x.filerRelation || ""), f, act: nr(x.shares && x.shares.raw) || 0, val: nr(x.value && x.value.raw) || 0 });
  }
  const buys = tx.filter((t) => t.f === "buy"), sells = tx.filter((t) => t.f === "sell");
  const bp = new Set(buys.map((t) => t.cine)).size, sp = new Set(sells.map((t) => t.cine)).size;
  const net = buys.reduce((a, t) => a + t.act, 0) - sells.reduce((a, t) => a + t.act, 0);
  let verdict = "neut";
  if (bp >= 2 && net > 0) verdict = "bull"; else if (bp === 1 && net > 0) verdict = "bull1"; else if (sells.length >= 2 && net < 0 && sells.length >= buys.length) verdict = "bear";
  const top = tx.slice().sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 3);
  // v98.2: ultima cumparare cu bani, cu ziua ei - alerta "cumparare de insider" o cere RECENTA, nu doar prezenta in fereastra de 60 de zile
  const ultimaCumparare = buys.slice().sort((a, b) => (a.zi < b.zi ? 1 : a.zi > b.zi ? -1 : 0))[0] || null;
  return { form4: true, buys: buys.length, sells: sells.length, bp, sp, net, verdict, top, n60: tx.length, ultimaCumparare };
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
// ActiuniSemnale.niveluri() -> ce intra in poza pentru o POZITIE: stopul care urca dupa maxim (stopPozitie) si tinta pozitiei
// (tintaPozitie), NU stop/tinta (acelea sunt pentru o cumparare noua). Planul lui, daca are tinta, bate tinta calculata.
export function nivDinNiveluri(n, plan) {
  if (!n || n.nivel !== "ok") return null;
  const trend = n.trend && typeof n.trend === "object" ? n.trend.dir : n.trend;
  return { stop: nr(n.stopPozitie), tinta: nr(plan && plan.tinta) ?? nr(n.tintaPozitie), trend: trend ? String(trend) : null };
}
function zileDinData(iso, acum) {
  const d = Date.parse(String(iso || "") + "T00:00:00Z"); if (!Number.isFinite(d)) return null;
  const a = new Date(acum), azi = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.round((d - azi) / ZI);
}
// ActiuniSemnale.semafor -> {nivel, motive[], ceAsFace}; niveluri -> {nivel:"ok", stop, tinta, trend}
function semaforT212(sem, niv) {
  return { niv: sem && sem.nivel && sem.nivel !== "fara-date" ? sem.nivel : null, motive: sem && Array.isArray(sem.motive) ? sem.motive.slice(0, 6) : [], sfat: sem && sem.ceAsFace ? String(sem.ceAsFace) : "", trend: niv && niv.trend ? String(niv.trend) : null };
}
// v101 (spec 2026-09-28-sl-tp-pe-alerts): SL / TP pentru pagina alerts, din ActiuniSemnale.niveluri (functia Radarului).
// fel "pozitie": stopul care urca (stopPozitie) si tinta de la pret; fel "urmarit": intrarea sugerata (null la trend in jos) + stop/tinta de la ea.
// v101.2 (ideea 4 „câte bucăți”): marimea din ActiuniSemnale.marime (1 % risc din cont, plafon 20 %), doar la sugestia CU intrare
function cuMarime(g, m) {
  if (!g || !g.intrare || !m || nr(m.bucati) === null || !(m.bucati > 0)) return g;
  return { ...g, marime: { bucati: rot(m.bucati, 4), suma: rot(m.suma, 0), risc: rot(m.risc, 0), plafonat: !!m.plafonat } };
}
// cursul in dolari pe leu din pozitiile T212 (Σ buc × pret mediu / Σ cost in lei) - cum il cere ActiuniSemnale.marime; fara cost -> null
export function fxDinPozitii(t212) {
  let usd = 0, lei = 0;
  for (const x of Array.isArray(t212) ? t212 : []) { if (!x || !(nr(x.costLei) > 0) || !(nr(x.qty) > 0) || !(nr(x.pretMediu) > 0)) continue; usd += x.qty * x.pretMediu; lei += x.costLei; }
  return lei > 0 && usd > 0 ? usd / lei : null;
}
export function sugestiePoza(n, pret, fel) {
  if (!n || typeof n !== "object") return null;
  if (n.nivel === "fara-date") return { nivel: "fara-date", motiv: String(n.motiv || "") };
  if (n.nivel !== "ok") return null;
  const p = nr(pret), pr = n.proba || {}, tr = n.trend && typeof n.trend === "object" ? n.trend.dir : n.trend;
  const baza = { k: nr(n.k), trend: tr ? String(tr) : null, proba: { n: nr(pr.n), pePlus: rot(pr.pePlus, 3), medie: rot(pr.medie, 4) } };
  if (fel === "pozitie") {
    const stop = rot(n.stopPozitie, 4), tinta = rot(n.tintaPozitie, 4);
    if (stop === null || tinta === null) return null;
    return { stop, tinta, riscPct: p && nr(n.d) !== null ? rot(n.d / p, 4) : null, ...baza };
  }
  const stop = rot(n.stop, 4), tinta = rot(n.tinta, 4);
  if (stop === null || tinta === null) return null;
  const intrare = n.intrare && nr(n.intrare.pret) ? { pret: rot(n.intrare.pret, 4), motiv: String(n.intrare.motiv || "") } : null;
  return { intrare, stop, tinta, riscPct: rot(n.riscPct, 4), ...baza };
}
function pozitieT212(x, acum) {
  const pret = nr(x.pret), mediu = nr(x.pretMediu), sem = semaforT212(x.sem, x.niv);
  const plan = x.plan ? { trailPct: nr(x.plan.trailPct), tinta: nr(x.plan.tinta) ?? (x.niv ? nr(x.niv.tinta) : null), stop: x.niv ? nr(x.niv.stop) : null, max: nr(x.maxDupaCumparare), stopFix: nr(x.plan.stop) } : null;
  return { s: String(x.simbol || ""), t212: String(x.ticker || ""), buc: rot(x.qty, 6), mediu: rot(mediu, 4), costLei: rot(x.costLei, 2),
    pret: rot(pret, 4), prev: rot(x.prev, 4), la: nr(x.la), closes30: esantion((x.bare || []).map((b) => rot(b && b.c, 4)).filter((c) => c !== null).slice(-30), 30),
    pplLei: rot(x.ppl, 2), pctLei: nr(x.ppl) !== null && nr(x.costLei) ? rot(x.ppl / x.costLei, 6) : null, pctPret: pret && mediu ? rot(pret / mediu - 1, 6) : null,
    plan, trend: sem.trend, pondere: rot(x.pondere, 4), niv: sem.niv, motive: sem.motive, sfat: sem.sfat,
    // v100.8: insiderii pe 60 de zile si la pozitiile T212 (null = Yahoo n-a dat nimic inca; pagina spune „vine cu poza următoare”)
    insideri: x.extra ? insideri(x.extra.tranzactii, nr(acum) || Date.now()) : null, sursa: x.sursa || null, sugestie: sugestiePoza(x.niveluri, x.pret, "pozitie") };
}
// SemnaleBot.semafor -> {nivel, cod, motiv, faCe, componente:[{nivel, cod, motiv, faCe}]}
function semaforBot(sem) {
  if (!sem || !sem.nivel) return { niv: null, motive: [], sfat: "" };
  const motive = [sem.motiv].concat((Array.isArray(sem.componente) ? sem.componente : []).map((c) => c && c.motiv)).filter((m, i, l) => typeof m === "string" && m && l.indexOf(m) === i);
  // v99: "asteapta" (fisa inca se socoteste) nu e un verdict pentru pagina alerts -> null; motivul ramane la vedere
  return { niv: sem.nivel === "asteapta" ? null : String(sem.nivel), motive: motive.slice(0, 6), sfat: sem.faCe ? String(sem.faCe) : "" };
}
function botPoza(b) {
  const pret = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), total = nr(b.profitTotal), brut = nr(b.gridProfitBrut) || 0, com = nr(b.comisioane) || 0, sem = semaforBot(b.semafor);
  return { id: String(b.id), s: String(b.baza || "").replace(/\.PERP$/, ""), dir: String(b.directie || "").toLowerCase(), lev: nr(b.levier), investit: rot(b.investit, 2), jos, sus,
    pret: rot(pret, 6), inGrid: pret !== null && jos !== null && sus !== null && sus > jos ? rot((pret - jos) / (sus - jos), 4) : null, lichidarePct: rot(b.distantaLichidarePct, 2),
    total: rot(total, 2), perechi: nr(b.ordinePerechi), gridBrut: rot(brut, 2), pozitie: total !== null ? rot(total - brut - com, 2) : null, comisioane: rot(com, 3),
    zero: rot(b.zero, 6), plan: b.plan ? { plus: nr(b.plan.plus), minus: nr(b.plan.minus), afaraOre: nr(b.plan.afaraOre) } : null,
    niv: sem.niv, motive: sem.motive, sfat: sem.sfat,
    pret30: esantion((b.pret30 || []).map((v) => rot(v, 6)).filter((v) => v !== null), 30), la: nr(b.la),
    // v99.6: mișcarea pe ~24 h (pret24h din istoricul botului) - null cand lipseste, pagina nu inventeaza
    d24: b.pret24h && nr(b.pret24h.pret) > 0 && pret !== null ? rot(pret / b.pret24h.pret - 1, 6) : null, d24Ore: b.pret24h ? nr(b.pret24h.ore) : null,
    // v100.3: procentul zilei ca in TradingView (fata de deschiderea lumanarii 1D Pionex = inchiderea de ieri) - rezerva paginii alerts
    // v100.4: cat aduce O grila, dupa comision (TabloExtra.profitPeGrila) - pagina alerts il arata langa profitul din grid
    grila: b.grila && nr(b.grila.pct) !== null ? { pct: rot(b.grila.pct, 6), usdt: rot(b.grila.usdt, 4), grile: nr(b.grila.grile) } : null,
    zi: b.ziPionex && nr(b.ziPionex.deschidere) > 0 && pret !== null ? { deschidere: rot(b.ziPionex.deschidere, 6), pct: rot(pret / b.ziPionex.deschidere - 1, 6) } : null };
}
function simbolPoza(x, acum) {
  const e = x.extra || null;
  return { s: String(x.s || ""), nota: String(x.nota || "").slice(0, 80), sursa: x.sursa || null, moneda: x.moneda || "$", pret: rot(x.pret, 4), prev: rot(x.prev, 4),
    closes30: esantion((x.closes30 || []).map((c) => rot(c, 4)).filter((c) => c !== null).slice(-30), 30),
    insideri: e ? insideri(e.tranzactii, acum) : null,
    rezultate: e && e.rezultate && e.rezultate.data ? { data: e.rezultate.data, zile: zileDinData(e.rezultate.data, acum), eps: rot(e.rezultate.eps, 2) } : null,
    analisti: e && e.analisti ? { tinta: rot(e.analisti.tinta, 2), recom: e.analisti.recom || null, n: nr(e.analisti.n) } : null,
    shortFloat: e ? rot(e.shortFloat, 4) : null, sugestie: cuMarime(sugestiePoza(x.niveluri, x.pret, "urmarit"), x.marime) };
}
// ---- v98.1: ajutoare pentru colector (pure) ----
const NY = "America/New_York";
function ziNY(t) { return new Intl.DateTimeFormat("en-CA", { timeZone: NY }).format(new Date(t)); }
// inchiderea ultimei sesiuni INCHEIATE (ziua New York): "azi" fata de ea, nu fata de bara de azi
export function prevClose(bare, acum) {
  if (!Array.isArray(bare) || !bare.length) return null;
  // barele zilnice sunt stampilate pe ZI (Yahoo: 13:30Z = deschiderea NY; unele surse: miezul noptii UTC) -> ziua UTC a barei;
  // "azi" e ziua New York de acum (bursa lor)
  const azi = ziNY(acum); let v = null;
  for (const b of bare) if (b && nr(b.c) !== null && nr(b.t) !== null && new Date(b.t).toISOString().slice(0, 10) < azi) v = b.c;
  return v;
}
// v98.2 (audit 28.09, #2): `prev` la un SIMBOL al paginii = aceeasi regula ca la pozitii (ultima sesiune incheiata, ziua NY),
// din barele cu timp (`tc`) pe care le da yahoo-extra.closes(); un cache vechi fara `tc` ramane cu prev-ul lui (penultima inchidere)
export function prevSimbol(c, acum) {
  if (!c) return null;
  const p = prevClose(c.tc, acum);
  return p !== null ? p : nr(c.prev);
}
// v98.2 (audit 28.09, #3): cat poza a urcat in ultimele 10 minute, poza E pulsul (worker-ul citeste `la` din ea) - nicio bataie
// separata, deci nicio scriere KV in plus (KV Free: 1.000 de scrieri pe zi; poza la 2 min = 720). Altfel bataia la 5 minute.
export function bataieNecesara({ acum, pozaOkLa, paznicLa }) {
  if (acum - (nr(pozaOkLa) || 0) < 10 * 60000) return false;
  return acum - (nr(paznicLa) || 0) >= 5 * 60000;
}
// v99.5 (el, 28.09: „la JTO îmi arată doar prețul, nu și cât s-a mișcat"): cele 30 de prețuri ale botului (linia + procentul de pe
// pagina alerts) stateau doar in memoria colectorului si dupa o repornire porneau de la zero (~30 min „puține poze încă").
// Istoricul botului din KV are pretul minut cu minut (pretPerp) -> lista se umple de acolo; memoria (cele mai noi) ramane la coada.
// v99.6 (el, 28.09: „unde vad procentul la JTO?"): pretul botului de acum ~24 h, din istoricul minut cu minut - pagina alerts arata
// mișcarea pe 24 h gros, sub pret, ca la actiuni. Bot mai tanar de 24 h -> cea mai veche intrare, cu orele reale. Fara istoric -> null.
export function pret24hDinIstoric(intrari, acum) {
  const ist = (Array.isArray(intrari) ? intrari : []).filter((x) => x && nr(x.t) !== null && nr(x.pretPerp) !== null && x.pretPerp > 0).sort((a, b) => a.t - b.t);
  if (!ist.length) return null;
  const tinta = acum - 24 * 3600000;
  let ales = ist[0];
  if (ist[0].t <= tinta) { let d = Infinity; for (const x of ist) { const dd = Math.abs(x.t - tinta); if (dd < d) { d = dd; ales = x; } } }
  return { pret: ales.pretPerp, t: ales.t, ore: Math.round((acum - ales.t) / 3600000) };
}
// v100.3 (el, 28.09: „procentul LIVE, acelasi cu cel din TradingView”): TradingView socoteste schimbarea zilei fata de inchiderea
// de ieri = deschiderea lumanarii zilnice care a inceput azi la 00:00 UTC. Din lumanarile 1D Pionex (orice ordine, texte sau numere)
// se ia doar bara de AZI; daca ziua noua inca nu are bara -> null (nu procentul de ieri).
export function ziDinKlines(klines, acum) {
  const azi = Math.floor(acum / ZI) * ZI;
  for (const k of Array.isArray(klines) ? klines : []) {
    if (!k) continue;
    const t = Number(Array.isArray(k) ? k[0] : k.time), o = Number(Array.isArray(k) ? k[1] : k.open);
    if (t === azi && Number.isFinite(o) && o > 0) return { deschidere: o, t };
  }
  return null;
}
export function pret30DinIstoric(intrari, ring) {
  const r = (Array.isArray(ring) ? ring : []).map(nr).filter((v) => v !== null);
  const ist = (Array.isArray(intrari) ? intrari : []).filter((x) => x && nr(x.t) !== null && nr(x.pretPerp) !== null).sort((a, b) => a.t - b.t).map((x) => x.pretPerp);
  const n = Math.max(0, 30 - r.length);
  return ist.slice(ist.length - n).concat(r).slice(-30);
}
// cat de des pleaca poza: 2 minute cat e un bot activ sau bursa US e in ore extinse (4-20 NY, luni-vineri), altfel 5 minute
// (KV-ul Cloudflare Free are ~1.000 de scrieri pe zi: cu un bot activ zi si noapte = 720 de poze; bataia separata NU se mai
// trimite cat poza curge - vezi bataieNecesara - deci ramane loc)
export function cadentaPoza({ acum, botiActivi }) {
  if (botiActivi > 0) return 120000;
  const p = new Intl.DateTimeFormat("en-US", { timeZone: NY, weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date(acum));
  const zi = (p.find((x) => x.type === "weekday") || {}).value, ora = Number((p.find((x) => x.type === "hour") || {}).value) % 24;
  return zi !== "Sat" && zi !== "Sun" && ora >= 4 && ora < 20 ? 120000 : 300000;
}
function pctTxt(v, z = 1) { return (Math.abs(v) * 100).toFixed(z).replace(".", ",") + "%"; }
function miiTxt(v) { v = nr(v) || 0; return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " mil." : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + " k" : String(Math.round(v)); }
// alertele pe simbolurile paginii (I-463): miscarea zilei peste 2x ATR-ul propriu (media |Δ zi| pe 14 zile) si o cumparare
// de insider aparuta fata de poza anterioara. Cheile contin ziua: colectorul le dedupeaza (o alerta pe zi per simbol).
export function alerteSimboluri(simboluri, anterioare, acum) {
  const zi = new Date(acum).toISOString().slice(0, 10), out = [];
  for (const s of Array.isArray(simboluri) ? simboluri : []) {
    if (!s || !s.s) continue;
    const c = Array.isArray(s.closes30) ? s.closes30 : [];
    if (c.length >= 15 && nr(s.pret) && nr(s.prev)) {
      const ult = c.slice(-15); let suma = 0, n = 0;
      for (let k = 1; k < ult.length; k++) if (ult[k - 1] > 0 && ult[k] > 0) { suma += Math.abs(ult[k] / ult[k - 1] - 1); n++; }
      const atr = n ? suma / n : null, d = s.pret / s.prev - 1;
      if (atr && Math.abs(d) > 2 * atr) out.push({ cheie: "sim-miscare-" + s.s + "-" + zi, nivel: "atentie",
        titlu: s.s + ": " + (d > 0 ? "+" : "−") + pctTxt(d) + " azi, de " + (Math.abs(d) / atr).toFixed(1).replace(".", ",") + "× mișcarea lui obișnuită",
        mesaj: "Mișcarea zilei e peste 2× ATR-ul propriu (" + pctTxt(atr) + " pe zi, media ultimelor 14 zile). Pragul de 2× ATR e o ipoteză, nu un semnal dovedit: o dată pe zi per simbol, ca să vezi când i se întâmplă ceva NEOBIȘNUIT lui, nu la fiecare procent." });
    }
    // v98.2 (audit 28.09, #4): "noua" = a aparut fata de o poza ANTERIOARA a aceluiasi simbol (prima vedere nu e stire) si e din
    // ultimele 30 de zile (INTC a fost anuntat pe 27.09 pentru cumpararea CEO-ului din 11.08 - informatia nu era noua atunci)
    const i = s.insideri, v = i && i.verdict, ant = anterioare && anterioare[s.s] && anterioare[s.s].insideri, va = ant && ant.verdict;
    const t = i && i.ultimaCumparare, recenta = t && t.zi && acum - Date.parse(t.zi + "T00:00:00Z") <= 30 * ZI;
    // si o cumparare NOUA fata de poza anterioara (verdictul poate deveni bull si cand vanzarile vechi ies din fereastra de 60 z)
    const noua = t && !(ant && ant.ultimaCumparare && ant.ultimaCumparare.zi && t.zi <= ant.ultimaCumparare.zi);
    if (ant && recenta && noua && (v === "bull" || v === "bull1") && va !== "bull" && va !== "bull1") {
      out.push({ cheie: "sim-insider-" + s.s + "-" + zi, nivel: "info", titlu: s.s + ": cumpărare de insider" + (v === "bull" ? ", în grup" : ""),
        mesaj: t.cine + " (" + t.rol + ") a cumpărat " + miiTxt(t.act) + " acțiuni, ~$" + miiTxt(t.val) + ", pe " + t.zi.slice(8) + "." + t.zi.slice(5, 7) + ". Cumpărările cu bani ale insiderilor contează, acțiunile primite gratis nu. E informație, nu îndemn." });
    }
  }
  return out;
}

// v101.1 (el, 28.09: „alerte discord fă” — ideea 5 din SL/TP pe alerts): alertele din SL/TP-ul pozei, o data pe zi (cheia poarta ziua):
//   - pozitie aproape de stop: ultimul sfert al drumului SL -> TP (stopul din plan sau cel sugerat), nivel „atentie”;
//   - pozitie FARA plan: SL / TP sugerat atins (cu plan, „a atins stopul / tinta din plan” vine deja din ActiuniSemnale.alertePlan);
//   - simbol urmarit: pretul a ajuns la intrarea sugerata (+0,5 %) - niciodata la trend in jos (intrare null) sau fara date.
export function alerteSLTP(poza, acum) {
  const out = []; if (!poza) return out;
  const zi = new Date(acum).toISOString().slice(0, 10), pr = (v) => (v >= 1 ? v.toFixed(2) : v.toFixed(4));
  for (const p of Array.isArray(poza.t212) ? poza.t212 : []) {
    if (!p || !p.s) continue;
    const pl = p.plan && nr(p.plan.stop) !== null ? p.plan : null, sg = p.sugestie && nr(p.sugestie.stop) !== null && nr(p.sugestie.tinta) !== null ? p.sugestie : null;
    const sl = pl ? pl.stop : sg ? sg.stop : null, tp = pl ? (nr(pl.tinta) !== null ? pl.tinta : sg ? sg.tinta : null) : sg ? sg.tinta : null, pret = nr(p.pret);
    if (sl === null || tp === null || !pret || !(tp > sl)) continue;
    const et = pl ? "stopul din planul tău" : "stopul sugerat", dist = 1 - sl / pret;
    if (pret > sl && (pret - sl) / (tp - sl) < 0.25)
      out.push({ cheie: "sltp-aproape-" + p.s + "-" + zi, nivel: "atentie", titlu: p.s + ": " + (dist < 0.0005 ? "chiar la " : "la " + pctTxt(dist) + " de ") + et + " ($" + pr(sl) + ")",
        mesaj: "Prețul e $" + pr(pret) + ", în ultimul sfert al drumului spre SL (TP $" + pr(tp) + "). 👉 Ce aș face eu: nu adaug acum; dacă atinge stopul, ies cum am scris." });
    if (!pl && sg) {
      if (pret <= sl) out.push({ cheie: "sltp-sl-" + p.s + "-" + zi, nivel: "critic", titlu: p.s + ": a atins stopul sugerat ($" + pr(sl) + ")",
        mesaj: "Prețul e $" + pr(pret) + ". Poziția n-are plan în Radar, stopul e cel sugerat (−15 % de la maxim). 👉 Ce aș face eu: ies, sau îmi scriu acum planul la rece." });
      else if (pret >= tp) out.push({ cheie: "sltp-tp-" + p.s + "-" + zi, nivel: "info", titlu: p.s + ": a atins ținta sugerată ($" + pr(tp) + ")",
        mesaj: "Prețul e $" + pr(pret) + ". 👉 Ce aș face eu: iau profit pe o parte și pun stopul la prețul de intrare; restul îl las să meargă." });
    }
  }
  for (const s of Array.isArray(poza.simboluri) ? poza.simboluri : []) {
    const g = s && s.sugestie, pret = s && nr(s.pret);
    if (!g || g.nivel || !g.intrare || nr(g.intrare.pret) === null || !pret || pret > g.intrare.pret * 1.005) continue;
    const m = s.moneda === "€" ? "€" : "$", q = g.proba || {};
    out.push({ cheie: "sltp-intrare-" + s.s + "-" + zi, nivel: "info", titlu: s.s + ": a ajuns la intrarea sugerată (" + m + pr(g.intrare.pret) + ")",
      mesaj: "Prețul e " + m + pr(pret) + ". SL " + m + pr(g.stop) + " · TP " + m + pr(g.tinta)
        + (nr(q.medie) !== null ? " · pe istoric " + (q.medie >= 0 ? "+" : "−") + pctTxt(q.medie) + " pe trade (" + Math.round((q.pePlus || 0) * 100) + " % pe plus, " + q.n + " intrări)" : "")
        // v101.3 (el, 28.09): si cat cumpar, cand colectorul a calculat marimea (doar in $, cu contul T212 citit)
        + (g.marime && g.marime.bucati > 0 ? ". Cât cumpăr: " + g.marime.bucati.toFixed(2).replace(".", ",") + " buc (~" + Math.round(g.marime.suma).toLocaleString("ro-RO") + " lei), risc ~" + Math.round(g.marime.risc).toLocaleString("ro-RO") + " lei" + (g.marime.plafonat ? ", plafonat la 20 % din cont" : " = 1 % din cont") : "")
        + ". E un reper din istoricul lui, nu un semnal dovedit; decizia e a ta." });
  }
  return out;
}

export function construiestePoza(i) {
  const acum = nr(i.acum) || Date.now();
  const t212 = (i.t212 || []).filter((x) => x && x.qty > 0).map((x) => pozitieT212(x, acum)), boti = (i.boti || []).filter((b) => b && b.id).map(botPoza);
  // t212La = cand au fost citite pozitiile (la o limitare de cereri raman cele de la poza anterioara); t212Eroare = ce a spus T212
  const t212Eroare = i.t212Eroare ? String(i.t212Eroare) : null;
  return { la: acum, versiune: String(i.versiune || ""), colector: { pid: nr(i.pid), tura: nr(i.tura) }, radarUrl: i.radarUrl ? String(i.radarUrl) : null, t212, t212La: nr(i.t212La), t212Eroare, boti,
    simboluri: (i.simboluri || []).filter((x) => x && x.s).map((x) => simbolPoza(x, acum)),
    gol: { boti: boti.length ? null : "niciun bot activ", t212: t212.length ? null : (t212Eroare ? "Trading 212 n-a răspuns (" + t212Eroare + "); pozițiile vin cu poza următoare" : "nicio poziție deschisă") } };
}
