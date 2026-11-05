// v101.162 (el, 03.11.2026: „pagina, ca să fie de folos dimineața”): „🎯 Trade-ul zilei” pe Discord, o dată pe zi, după 9:00 ora României,
// ca mesaj SEPARAT după rezumatul de dimineață (acela se taie la coadă la 2000 de caractere). Aceleași calcule ca pagina
// (public/lib/trade-zilei.js, încărcat în colector cu incarca): P3, mișcarea așteptată, gridul / stopul din mișcare, nivelurile de ieri.
// deps: { acum, stare: { tradeZileiTrimis }, trimite(mesaj) -> true dacă a ajuns, boti() -> [{ baza, quote, simbolPionex, activ }],
//         bare(simbolPionex) -> lumânări 1h crescătoare [{t,o,h,l,c}], TradeZilei, TabloBot, jurnal }
const IMPLICITE = ["BTC", "ETH", "SOL"];
const MAX_MONEDE = 8;
const LAT = 160;
function ziRo(t) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
  const g = (k) => (p.find((x) => x.type === k) || {}).value;
  return { data: g("year") + "-" + g("month") + "-" + g("day"), ora: Number(g("hour")) };
}
const pct = (v, z = 0) => (v == null || !isFinite(v) ? "—" : (v * 100).toFixed(z).replace(".", ",") + " %");
// v100.306 (I-825, auditul final 🔴 4): sub 0,01 prețul ține 3 cifre semnificative (PEPE 0,00000530), ca tzPret / rfPret; 6 zecimale fixe dădeau „0,000005”
function pret(p) { if (!(p > 0)) return "—"; const z = p < 0.01 ? Math.min(12, 2 - Math.floor(Math.log10(p))) : p < 1 ? 4 : 2, s = p.toFixed(z).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + s[1]; }
// monedele: boții activi (simbolul lor Pionex) + BTC / ETH / SOL, fără dubluri, cel mult MAX_MONEDE
export function monedeTradeZilei(boti, TabloBot) {
  const l = [];
  const pune = (simbol, pionex, fel) => { const n = String(simbol || "").toUpperCase(); if (n && !l.some((x) => x.simbol === n)) l.push({ simbol: n, pionex, fel }); };
  (boti || []).forEach((b) => {
    if (!b || b.activ === false || !b.baza) return;
    const s = TabloBot && TabloBot.simboluri ? TabloBot.simboluri(b.baza, b.quote, b.simbolPionex) : null;
    const n = String(s ? s.moneda : b.baza).replace(/\.PERP$/, "").toUpperCase();
    pune(n, s ? s.pionex : n + "_USDT_PERP", "bot");
  });
  IMPLICITE.forEach((m) => pune(m, m + "_USDT_PERP", "piata"));
  return l.slice(0, MAX_MONEDE);
}
// rândurile mesajului (fiecare ≤ 160): capul, câte unul pe monedă, coada cinstită
export function liniiTradeZilei(monede, TradeZilei) {
  const ok = monede.filter((m) => m.d && !m.d.eroare), rau = monede.filter((m) => !m.d || m.d.eroare);
  const linii = [];
  if (ok.length) {
    const mult = ok.filter((m) => m.d.p3 >= 0.6).length, medie = ok.reduce((s, m) => s + m.d.asteptat.med, 0) / ok.length;
    // v101.163: cât din mișcarea zilei s-a format de obicei până la ora asta (curba orelor, proba din 03.11) + weekendul (factorul e inclus în cifre)
    const d0 = ok[0].d;
    linii.push(`🎯 Azi: ${mult} din ${ok.length} se mișcă probabil mai mult ca ieri · mișcarea așteptată, în medie ${pct(medie, 1)}` + (d0.format != null ? ` · format până acum ~${pct(d0.format)}` : "") + (d0.weekend ? " · weekend ×" + String(TradeZilei.FACTOR_WEEKEND).replace(".", ",") : ""));
  }
  ok.forEach((m) => {
    const d = m.d, g = TradeZilei.grid(d);
    const niv = (L, p) => pret(L) + " " + (p.atins ? "✓" : p.p == null ? "—" : pct(p.p));
    // v100.306 (I-825, 🔴 2): ziua deja trecută de ieri ⇒ „>ieri deja”, nu procentul modelului
    let r = `${m.fel === "bot" ? "🤖 " : ""}${m.simbol} ${pret(d.pret)} · >ieri ${d.dejaMaiMult ? "deja" : pct(d.p3)} · azi ~${pct(d.asteptat.med, 1)} (${pct(d.asteptat.p25, 1)}–${pct(d.asteptat.p75, 1)})` +
      (g ? ` · grid ±${pct(g.jumatate, 1)} pas ${pct(g.pas, 2)} · stop ≥ ${pct(g.stop, 1)}` : "") + ` · max ${niv(d.pdh, d.p1Sus)} · min ${niv(d.pdl, d.p1Jos)}`;
    if (r.length > LAT) r = r.slice(0, LAT - 1) + "…";
    linii.push(r);
  });
  if (rau.length) linii.push(("fără date: " + rau.map((m) => m.simbol).join(", ")).slice(0, LAT));
  const t = ok.length ? TradeZilei.trade(ok[0].d) : null;
  linii.push(t && t.fel !== "niciunul" && t.fel !== "eroare" ? ("Trade dovedit: " + t.text).slice(0, LAT) : "Niciun trade cu avantaj dovedit (proba din 03.11): gridul / stopul de mai sus sunt din MIȘCARE, nu din bani. Ziua = UTC.");
  return linii;
}
export async function turaTradeZilei(d) {
  const acum = d.acum || Date.now(), z = ziRo(acum);
  if (z.ora < 9 || d.stare.tradeZileiTrimis === z.data) return { trimis: false };
  const monede = [];
  let boti = [];
  try { boti = (await d.boti()) || []; } catch (e) { d.jurnal && d.jurnal("trade-ul zilei: boții", e.message); }
  for (const m of monedeTradeZilei(boti, d.TabloBot)) {
    try { const bare = await d.bare(m.pionex); monede.push({ ...m, d: bare && bare.length ? d.TradeZilei.azi(bare, acum) : { eroare: "fără lumânări" } }); }
    catch (e) { monede.push({ ...m, d: { eroare: String(e && e.message || e).slice(0, 60) } }); if (/429/.test(String(e && e.message))) break; }
  }
  if (!monede.some((m) => m.d && !m.d.eroare)) { d.jurnal && d.jurnal("trade-ul zilei: nicio monedă cu cifre, nu trimit"); return { trimis: false }; }
  const linii = liniiTradeZilei(monede, d.TradeZilei);
  if (await d.trimite({ nivel: "info", titlu: "🎯 Trade-ul zilei (" + z.data.slice(8, 10) + "." + z.data.slice(5, 7) + ")", mesaj: linii.join("\n") })) {
    d.stare.tradeZileiTrimis = z.data;
    return { trimis: true, linii };
  }
  return { trimis: false };
}
