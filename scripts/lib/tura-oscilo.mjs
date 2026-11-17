// Tura „🔁 Oscilo (în probă)” - Radar v100.353 / colector v101.191 (17.11.2026; el: „o listă de boți care stau într-un canal de ±5–10% și
// oscilează acolo”, „pe fiecare parte”, „14 zile sau chiar 7”, apoi „continuă” = urmărirea pe hârtie).
// Proba pe istoric (o rulare pre-înregistrată, 77 de monede, 196 de zile, W ales pe prima jumătate, verificat pe a doua): canalul ține 7 zile
// mai des la Oscilo (23,4% față de 13,9%, t 3,11), DAR gridul neutru pe canal pierde (−2,67% față de −1,15%) ⇒ NU e listă de boți. De aici:
// URMĂRIRE pe date care nu existau la alegerea regulii. Totul de mai jos e FIXAT înainte de cifre (scratchpad oscilo/urmarire.txt):
// universul = primele 100 PERP Pionex după volum; bare de 1 h; W 14; canal 5% ≤ h ≤ 10% pe fiecare parte, mișcarea netă ≤ h/2, ≥ 6 traversări;
// judecata la 7 zile: canalul ține? + gridul în trei variante (G1 = cea din probă, G2 = închis la 3 zile, G3 = stop la 1,2·h);
// privirile la 28 și 42 de zile judecate; verdictul la 42. Nicio variantă nu se adaugă după cifre.
// d = { cere, trimite, jurnal, GridClasament, GridProba, klines1h(simbol), citesteZi(zi), scrieZi(zi, o), zile(), acum? }; st (pe disc) = { zi, la, start }
const ORA = 3600000, ZI = 86400000;
export const REG = {
  W: 14, hMin: 0.05, hMax: 0.10, trav: 6, viitor: 7, top: 100,
  variante: { G1: { ore: 168, stop: 1.5 }, G2: { ore: 72, stop: 1.5 }, G3: { ore: 168, stop: 1.2 } },
  grid: { grile: 19, levier: 2, dir: "neutru", suma: 100, tip: "aritmetic", fundingZi: 0 },
  priviri: [28, 42], tPrincipal: 2, tGrid: 2.5, bloc: 7, pastrez: 120,
};
const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const medie = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);
export const ziUtc = (t) => new Date(t).toISOString().slice(0, 10);
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const r4 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 1e4) / 1e4);

/** Barele închise de 1 h ({t,o,h,l,c}) din lumânările Pionex; bara în formare (t + 1 h > acum) iese. */
export function bare1h(klines, acum) {
  const m = new Map();
  for (const k of Array.isArray(klines) ? klines : []) {
    if (!k) continue; let t = Number(Array.isArray(k) ? k[0] : k.time); if (!(t > 0)) continue; if (t < 1e11) t *= 1000;
    const g = (i, n) => Number(Array.isArray(k) ? k[i] : k[n]), o = g(1, "open"), h = g(2, "high"), l = g(3, "low"), c = g(4, "close");
    if (!(c > 0 && o > 0 && h > 0 && l > 0) || t + ORA > acum) continue;
    m.set(t, { t, o, h, l, c });
  }
  return [...m.values()].sort((a, b) => a.t - b.t);
}
/** Fereastra [de, pana) din bare, doar dacă e întreagă (o bară pe oră, fără găuri); altfel null. */
export function fereastra(b, de, pana) {
  const n = Math.round((pana - de) / ORA), i = b.findIndex((x) => x.t === de);
  if (i < 0 || i + n > b.length) return null;
  const f = b.slice(i, i + n);
  return f[n - 1].t === pana - ORA ? f : null;
}
/** Canalul pe închideri (aceeași definiție ca proba): c mediana, h abaterea maximă, net, traversările centrului, intră? */
export function canal(inch) {
  const c = med(inch); let h = 0; for (const x of inch) h = Math.max(h, Math.abs(x / c - 1));
  let tr = 0, sg = 0; for (const x of inch) { const s = Math.sign(x - c); if (s && sg && s !== sg) tr++; if (s) sg = s; }
  const net = Math.abs(inch[inch.length - 1] / inch[0] - 1);
  return { c, h, net, trav: tr, intra: h >= REG.hMin && h <= REG.hMax && net <= h / 2 && tr >= REG.trav };
}
/** Notarea zilei (start = 00:00 UTC): grupa O (intră) și R (restul, h tăiat la [5%, 10%]); doar din barele de dinainte de start. */
export function noteaza(serii, start) {
  const O = [], R = []; let fara = 0;
  for (const [s, b] of Object.entries(serii)) {
    const f = fereastra(b, start - REG.W * ZI, start); if (!f) { fara++; continue; }
    const k = canal(f.map((x) => x.c)), hh = Math.min(REG.hMax, Math.max(REG.hMin, k.h));
    if (k.intra) { const ult = f[f.length - 1].c; O.push({ s, c: k.c, h: k.h, trav: k.trav, net: r4(k.net), pret: ult, poz: r4(ult / k.c - 1) }); }
    else R.push({ s, c: k.c, h: hh });
  }
  O.sort((a, b) => b.trav - a.trav || a.s.localeCompare(b.s));
  return { O, R, fara };
}
/** Judecata unei intrări pe barele de după start: canalul ține 7 zile? + cele trei variante de grid (net % pe capital). null = barele lipsesc. */
export function judeca(x, b, start, GP) {
  const f = fereastra(b, start, start + REG.viitor * ZI); if (!f) return null;
  const jos = x.c * (1 - x.h), sus = x.c * (1 + x.h), o = { tine: f.every((y) => y.c >= jos && y.c <= sus) ? 1 : 0 };
  for (const [k, v] of Object.entries(REG.variante)) {
    const V = f.slice(0, v.ore), g = GP.simuleaza(V, 0, V.length, Object.assign({}, REG.grid, { jos, sus, stop: { jos: x.c * (1 - v.stop * x.h), sus: x.c * (1 + v.stop * x.h) } }));
    o[k] = g && isFinite(g.net) ? Math.round(g.net * 1e6) / 1e4 : null;   // % pe capital, patru zecimale (cu două, t-ul ieșea −0,65 în loc de −0,64 al probei)
  }
  return o;
}
// t pe blocuri de 7 zile (monedele aceleiași zile = o observație; zilele vecine se suprapun pe 7 zile ⇒ blocuri)
function tBlocuri(d) {
  const bl = []; for (let i = 0; i + REG.bloc <= d.length; i += REG.bloc) bl.push(medie(d.slice(i, i + REG.bloc)));
  if (bl.length < 2) return { blocuri: bl.length, t: null };
  const m = medie(bl), sd = Math.sqrt(bl.reduce((s, x) => s + (x - m) ** 2, 0) / (bl.length - 1));
  return { blocuri: bl.length, t: sd > 0 ? m / (sd / Math.sqrt(bl.length)) : null };
}
/** Raportul pe zilele judecate (în ordine, de la start): principalul + fiecare variantă; privirile și verdictul la REG.priviri.
 *  Revizia (🔴/🟡): doar PREFIXUL continuu de zile închise (o zi veche judecată târziu nu mai mută setul celor 42), toate zilele de la start (fără tăietură). */
export function raport(zile) {
  const ord = zile.filter(Boolean).sort((a, b) => a.zi.localeCompare(b.zi)), pref = [];
  for (const z of ord) { if (!z.judecat) break; pref.push(z); }
  const J = pref.filter((z) => z.O && z.O.length && z.O.some((x) => x.j) && z.R.some((x) => x.j));
  const n = J.length, privire = n >= REG.priviri[1] ? 2 : n >= REG.priviri[0] ? 1 : 0, P = J.slice(0, privire === 2 ? REG.priviri[1] : n);
  const col = (k) => {
    const dif = [], o = [], r = [];
    for (const z of P) { const a = z.O.filter((x) => x.j).map((x) => x.j[k]).filter(Number.isFinite), b = z.R.filter((x) => x.j).map((x) => x.j[k]).filter(Number.isFinite); if (!a.length || !b.length) continue; dif.push(medie(a) - medie(b)); o.push(...a); r.push(...b); }
    return Object.assign({ zile: dif.length, dif: r4(medie(dif)), O: r4(medie(o)), R: r4(medie(r)), nO: o.length }, tBlocuri(dif));
  };
  const pr = col("tine"), G = {}; for (const k of Object.keys(REG.variante)) G[k] = col(k);
  let verdict = null;
  if (privire === 2) {
    const ok = pr.dif > 0 && pr.t > REG.tPrincipal, bune = Object.keys(G).filter((k) => ok && G[k].O > 0 && G[k].dif > 0 && G[k].t > REG.tGrid);
    verdict = bune.length ? "aș porni: " + bune.join(", ") : ok ? "canalul ține mai des, gridul fără avantaj dovedit" : "n-am aflat";
  }
  const nejud = zile.filter((z) => z && !z.judecat).length, intrari = zile.reduce((s, z) => s + (z && z.O ? z.O.length : 0), 0);
  return { zile: n, zileVerdict: P.length, privire, principal: pr, G, verdict, nejudecate: nejud, intrari };
}

/** Tura: o dată pe zi UTC, după 00:30. Aduce barele de 1 h (incremental, de pe disc), notează ziua, judecă zilele ajunse la 7 zile, trimite lista.
 *  Notarea intră în urmărire doar în primele 3 h ale zilei (topul după volumul pe 24 h ar cuprinde altfel ore din fereastra judecată); ziua incompletă
 *  sau trimiterea picată se reîncearcă la tura următoare, de cel mult 3 ori. */
export const TARZIU_MS = 3 * ORA, INCERCARI = 3;
export async function turaOscilo(d, st) {
  const acum = d.acum || Date.now(), zi = ziUtc(acum), start = Date.parse(zi + "T00:00:00Z");
  if (st.zi === zi || acum - start < 30 * 60000) return null;
  if (st.ziIncerc !== zi) { st.ziIncerc = zi; st.incercari = 0; }
  st.incercari = (st.incercari || 0) + 1;
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP"), top = d.GridClasament.topDupaVolum(tk && tk.data && tk.data.tickers, REG.top);
  if (!top.length) throw new Error("lista Pionex n-a venit");
  const vol = new Map(top.map((x) => [x.simbol, x.volum]));
  const zileDisc = (d.zile() || []).filter((z) => /^\d{4}-\d{2}-\d{2}$/.test(z)).sort(), deJudecat = [];
  st.start = st.start || zileDisc[0] || zi;   // revizia: starea pierdută nu repornește proba (cea mai veche zi de pe disc)
  for (const z of zileDisc) { const o = d.citesteZi(z); if (o && !o.judecat && Array.isArray(o.O)) deJudecat.push(o); }
  const simboluri = new Set(top.map((x) => x.simbol)); for (const o of deJudecat) for (const x of o.O.concat(o.R)) simboluri.add(x.s);
  const serii = {}; let esec = 0;
  for (const s of simboluri) {
    try { serii[s] = bare1h(await d.klines1h(s), acum); }
    catch (e) { esec++; if (esec >= 15) { d.jurnal("oscilo: prea multe eșecuri la lumânări, mă opresc"); break; } }
  }
  // judecata zilelor ajunse la 7 zile (barele lipsă după 14 zile ⇒ intrarea rămâne fără judecată, ziua se închide)
  for (const o of deJudecat) {
    const t0 = Date.parse(o.zi + "T00:00:00Z"); if (acum < t0 + REG.viitor * ZI + ORA) continue;
    let lipsa = 0;
    for (const x of o.O.concat(o.R)) { if (x.j) continue; const j = serii[x.s] ? judeca(x, serii[x.s], t0, d.GridProba) : null; if (j) x.j = j; else lipsa++; }
    if (!lipsa || acum - t0 > 14 * ZI) { o.judecat = acum; o.lipsa = lipsa; }
    d.scrieZi(o.zi, o);
  }
  // notarea de azi: doar monedele din top 100 de acum; o zi deja notată la timp (trimiterea picase) nu se renotează
  const veche = d.citesteZi(zi), dejaNotata = !!(veche && Array.isArray(veche.O) && Array.isArray(veche.R));
  const azi = dejaNotata ? { O: veche.O, R: veche.R, fara: veche.fara || 0 } : noteaza(Object.fromEntries(top.map((x) => [x.simbol, serii[x.simbol] || []])), start);
  if (!dejaNotata) for (const x of azi.O) x.vol = vol.get(x.s) || null;
  const incomplet = azi.O.length + azi.R.length < 50, tarziu = !dejaNotata && acum - start > TARZIU_MS;
  if (!dejaNotata && !incomplet && !tarziu && zi >= st.start) d.scrieZi(zi, { zi, la: acum, O: azi.O, R: azi.R, fara: azi.fara, incomplet: false });
  const toate = zileDisc.concat(d.citesteZi(zi) ? [zi] : []).filter((z, i, a) => a.indexOf(z) === i && z >= st.start).map((z) => d.citesteZi(z)).filter(Boolean);
  const urm = raport(toate);
  // revizia (🔴): verdictul de la 42 se îngheață o dată și nu se mai socotește din nou
  if (urm.privire === 2) {
    if (!st.verdict) st.verdict = { la: acum, verdict: urm.verdict, principal: urm.principal, G: urm.G, zile: urm.zileVerdict };
    Object.assign(urm, { verdict: st.verdict.verdict, principal: st.verdict.principal, G: st.verdict.G, inghetatLa: st.verdict.la });
  }
  await d.trimite("/api/istoric-bot?action=oscilo", { la: acum, zi, start: st.start, incomplet, tarziu, nR: azi.R.length, fara: azi.fara, lista: azi.O.slice(0, 30), nO: azi.O.length, urmarire: urm });
  if (!incomplet || st.incercari >= INCERCARI) { st.zi = zi; st.la = acum; }   // incompletă ⇒ reîncerc la tura următoare (≤ 3)
  d.jurnal("oscilo:", azi.O.length + " în canal din " + cate(azi.O.length + azi.R.length, "monedă", "monede"), "· judecate " + cate(urm.zile, "zi", "zile"));
  return { O: azi.O.length, R: azi.R.length, urm };
}
