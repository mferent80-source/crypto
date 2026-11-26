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
  const ramase = [];
  for (const x of u.zile) {
    if (acum - x.la < 7 * ZI) { ramase.push(x); continue; }
    const ret = (s) => (x.pr[s] > 0 && preturi[s] > 0 ? preturi[s] / x.pr[s] - 1 : null);
    const toate = Object.keys(x.pr).map(ret).filter((v) => v != null), medie = toate.length ? toate.reduce((a, b) => a + b, 0) / toate.length : null;
    const parte = (lista, sg) => { const r = lista.map(ret).filter((v) => v != null); return r.length && medie != null ? { n: r.length, exces: sg * (r.reduce((a, b) => a + b, 0) / r.length - medie) } : null; };
    u.judecate.push({ zi: x.zi, short: parte(x.short, -1), long: parte(x.long, 1), nUnivers: toate.length });
  }
  u.zile = ramase; u.judecate = u.judecate.slice(-120);
  return u;
}
export function rezumatUrmarire(u) {
  const J = u && Array.isArray(u.judecate) ? u.judecate : [], f = (k) => { const v = J.map((x) => x[k]).filter((x) => x && Number.isFinite(x.exces)); return v.length ? { zile: v.length, medie: v.reduce((a, b) => a + b.exces, 0) / v.length, pePlus: v.filter((x) => x.exces > 0).length / v.length } : { zile: 0 }; };
  return { short: f("short"), long: f("long"), inAsteptare: u && Array.isArray(u.zile) ? u.zile.length : 0 };
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
