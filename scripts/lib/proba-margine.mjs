// Radar v100.374 (21.11.2026, el: „da fa tot”; ideile I-898 + I-908 din analiza de trader din 20.11): PROBA MARGINII.
// Când prețul trece de marginea gridului contra botului, era mai bine închis acolo sau lăsat? Regulile (unitatea, măsura, pragurile, ce nu
// poate spune) sunt scrise ÎNAINTE de cifre în docs/cercetare/2026-11-21-v100374-proba-marginii.md și nu se schimbă după rezultate.
// Modul pur (fără rețea, fără disc), probat în scripts/proba-v100374.mjs. Drumul botului = lista `ist:<bot>` (un punct pe minut:
// { t, pretPerp, profitTotal, perechi, gridProfitBrut, … }), care rămâne în KV și după închiderea botului.
export const MIN_EPISOADE = 60, MIN_ZILE = 20, START = Date.UTC(2026, 10, 21), COMISION_INCHIDERE = 0.0005, RESAMPLARI = 10000, SAMANTA = 20261121;
/* drumul trebuie să înceapă la pornirea botului (cel mult atâtea minute după ea): altfel prima trecere se poate să fi fost tăiată */
export const MAX_INTARZIERE_MIN = 15;
/* un gol în drum chiar înaintea trecerii (colectorul oprit) ar pune „clipa trecerii” la primul punct de după: peste atâtea minute botul nu intră */
export const MAX_GOL_MIN = 5;
/* intervalul (reeșantionare pe zile) se socotește doar de la atâtea zile: din două-trei zile iese îngust și nu spune nimic */
export const MIN_ZILE_INTERVAL = 10;
const ORA = 3600000, MIN = 60000;
const nr = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const zi = (t) => new Date(t).toISOString().slice(0, 10);
function mulberry32(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// botul închis, din forma arhivei (ruta botiInchisi) - aceleași câmpuri și același net ca pagina (CapMargine.rand)
export function botDin(x) {
  if (!x || !/futures_grid/.test(String(x.buOrderType || ""))) return null;
  const d = x.buOrderData || {}, real = nr(d.totalRealizedProfit), q = nr(d.quoteInvestment), creat = nr(x.createTime), inchis = nr(x.closeTime);
  const inv = q !== null && q > 0 ? q + (nr(d.extraMargin) || 0) - (nr(d.profitExited) || 0) : nr(d.usdtInvestment), jos = nr(d.bottom), sus = nr(d.top);
  if (real === null || !(inv > 0) || !(creat > 0) || !(inchis > 0) || !(jos > 0) || !(sus > jos)) return null;
  return { id: String(x.strategyId || x.buOrderId || ""), dir: String(d.trend || "").toLowerCase(), jos, sus, inv, lev: nr(d.leverage) || 1, final: real + (nr(d.totalFee) || 0) + (nr(d.totalFundingFee) || 0), creat, inchis, stop: !!nr(d.lossStop) };
}
/* prețul punctului e dincolo de marginea contra? Față de marginile DIN CLIPA punctului, când drumul le poartă (gridul se poate muta la același
   bot); altfel față de cele de la închidere. */
const jos = (b, q) => (nr(q.gridJos) > 0 ? nr(q.gridJos) : b.jos), sus = (b, q) => (nr(q.gridSus) > 0 ? nr(q.gridSus) : b.sus);
const afaraLa = (b, q) => (b.dir === "long" ? q.pretPerp < jos(b, q) : q.pretPerp > sus(b, q));
const mutat = (L) => { let j = null, s = null; for (const q of L) { const a = nr(q.gridJos), c = nr(q.gridSus); if (!(a > 0) || !(c > 0)) continue; if (j !== null && (a !== j || c !== s)) return true; j = a; s = c; } return false; };
const puncte = (drum) => (Array.isArray(drum) ? drum : []).filter((q) => q && nr(q.t) > 0 && nr(q.pretPerp) > 0 && nr(q.profitTotal) !== null).sort((a, b) => a.t - b.t);

// episodul unui bot: { id, t0, … } sau { id, fara: motivul } (botul nu intră în probă) sau null (nu e un bot de judecat)
export function episod(x, drum) {
  const b = botDin(x); if (!b || !b.id) return null;
  if (b.dir !== "long" && b.dir !== "short") return { id: b.id, fara: "neutru" };
  const L = puncte(drum); if (!L.length) return { id: b.id, fara: "fara-drum" };
  if (L[0].t - b.creat > MAX_INTARZIERE_MIN * MIN) return { id: b.id, fara: "drum-taiat" };
  if (afaraLa(b, L[0])) return { id: b.id, fara: "pornit-afara" };
  const i = L.findIndex((q) => afaraLa(b, q)); if (i < 0) return { id: b.id, fara: "in-grid" };
  /* revizia a doua: marginile s-au schimbat chiar între punctul de dinainte și cel al „trecerii” ⇒ gridul a fost mutat peste preț, prețul n-a trecut nimic */
  if (i > 0 && (jos(b, L[i]) !== jos(b, L[i - 1]) || sus(b, L[i]) !== sus(b, L[i - 1]))) return { id: b.id, fara: "mutat" };
  if (i > 0 && L[i].t - L[i - 1].t > MAX_GOL_MIN * MIN) return { id: b.id, fara: "gol" };
  /* suma pusă = cea de la clipa trecerii (drumul o poartă): marja adăugată DUPĂ ar micșora procentul tocmai la boții „salvați” cu marjă */
  const p0 = L[i], inv0 = nr(p0.investit) > 0 ? nr(p0.investit) : b.inv, com = inv0 * b.lev * COMISION_INCHIDERE, d = b.final - (p0.profitTotal - com), u = L[L.length - 1];
  /* ce a urmat după h ore: ultimul punct de până atunci, doar dacă drumul chiar ajunge acolo (botul mai trăia) */
  const la = (h) => { const tt = p0.t + h * ORA; if (u.t < tt - 2 * MIN) return null; let q = null; for (const z of L) { if (z.t <= tt) q = z; else break; } return q ? { total: q.profitTotal - p0.profitTotal, inGrid: q.pretPerp >= jos(b, q) && q.pretPerp <= sus(b, q) } : null; };
  return { id: b.id, t0: p0.t, zi: zi(p0.t), dir: b.dir, inv: inv0, laMargine: p0.profitTotal, comision: com, final: b.final, d, dPct: d / inv0 * 100, stop: b.stop, nou: p0.t >= START, mutat: mutat(L), dupa: { 1: la(1), 4: la(4), 24: la(24) } };
}

// drumul rărit (I-898), de păstrat pentru totdeauna: un punct la 5 minute în prima oră, apoi la 15 minute; primul, ultimul și clipa trecerii
// de margine rămân mereu. Rând: [t, preț, total, perechi, grile].
export function rareste(drum, t0) {
  const L = puncte(drum); if (!L.length) return [];
  const out = [], start = L[0].t; let ultim = -Infinity;
  L.forEach((q, i) => {
    const pas = q.t - start < ORA ? 5 * MIN : 15 * MIN, tine = i === 0 || i === L.length - 1 || q.t === t0 || q.t - ultim >= pas - 5000;
    if (!tine) return; if (q.t - ultim >= pas - 5000 || i === 0) ultim = q.t;
    /* „+ 0”: un total de −0,00001 rotunjit nu rămâne „−0” în JSON */
    out.push([q.t, q.pretPerp, Math.round(q.profitTotal * 1e4) / 1e4 + 0, nr(q.perechi), nr(q.gridProfitBrut) === null ? null : Math.round(q.gridProfitBrut * 1e4) / 1e4 + 0]);
  });
  return out;
}

// ---------- I-909: clipa trecerii notată PE VIU (boții ținuți peste 7 zile nu mai au începutul drumului în `ist:`) ----------
/* cât încape în corpul rutei `drum` (1200 de rânduri); peste, jumătatea veche se rărește la un rând din două */
export const MAX_RANDURI = 1150;
// prima trecere de marginea contra printre punctele de DUPĂ `dupaT` (0 = de la începutul drumului)
export function trecere(b, L, dupaT) {
  let prev = null;
  for (const q of L) {
    if (q.t <= dupaT) { prev = q; continue; }
    if (afaraLa(b, q)) {
      if (!prev && !(dupaT > 0)) return { stare: "pornit-afara" };
      if (q.t - (prev ? prev.t : dupaT) > MAX_GOL_MIN * MIN) return { stare: "gol" };
      if (prev && (jos(b, q) !== jos(b, prev) || sus(b, q) !== sus(b, prev))) return { stare: "mutat" };
      return { stare: "ok", iesire: { t: q.t, total: q.profitTotal, inv: nr(q.investit) > 0 ? nr(q.investit) : null } };
    }
    prev = q;
  }
  return { stare: "ok", iesire: null };
}
export function uneste(vechi, nou, tine) {
  const m = new Map(); for (const r of (Array.isArray(vechi) ? vechi : [])) if (Array.isArray(r) && nr(r[0]) > 0) m.set(r[0], r); for (const r of nou) m.set(r[0], r);
  let p = [...m.values()].sort((a, c) => a[0] - c[0]);
  while (p.length > MAX_RANDURI) { const jum = Math.floor(p.length / 2); p = p.filter((r, i) => i === 0 || i >= jum || i % 2 === 0 || r[0] === tine); }
  return p;
}
// nota botului PORNIT (b = { dir, jos, sus, creat }): drumul rărit de până acum + clipa trecerii, dacă a fost; `rarit` = ce e deja în drum:<bot>.
// stare: „ok” (nota e bună), „taiat” (prima notă a venit prea târziu sau a rămas un gol între note), „gol”, „pornit-afara”.
export function notaVie(b, drum, rarit) {
  const L = puncte(drum); if (!b || !L.length || (b.dir !== "long" && b.dir !== "short") || !(b.jos > 0) || !(b.sus > b.jos) || !(b.creat > 0)) return null;
  const v = rarit && rarit.viu === true ? rarit : null, scanat = v ? nr(v.scanat) || 0 : 0;
  let stare = v && v.stare ? String(v.stare) : "ok", iesire = v && v.iesire && nr(v.iesire.t) > 0 ? v.iesire : null;
  if (!v && L[0].t - b.creat > MAX_INTARZIERE_MIN * MIN) stare = "taiat";
  else if (v && L[0].t > scanat && stare === "ok") stare = "taiat";
  if (stare === "ok" && !iesire) { const n = trecere(b, L, scanat); if (n.stare !== "ok") stare = n.stare; else iesire = n.iesire; }
  return { p: uneste(v ? v.p : null, rareste(L, iesire ? iesire.t : null), iesire ? iesire.t : null), iesire: stare === "ok" ? iesire : null, scanat: L[L.length - 1].t, stare };
}
// episodul la închidere: din drumul întreg când începe la pornire; altfel din nota de pe viu, dacă e bună și fără gol până la sfârșit
export function episodCuNota(x, drum, rarit) {
  const e = episod(x, drum); if (!e || e.fara !== "drum-taiat" || !rarit || rarit.viu !== true) return e;
  if (rarit.stare === "gol" || rarit.stare === "pornit-afara" || rarit.stare === "mutat") return { id: e.id, fara: rarit.stare };
  const b = botDin(x), L = puncte(drum), scanat = nr(rarit.scanat) || 0;
  if (rarit.stare !== "ok" || !L.length || !(scanat > 0) || L[0].t > scanat) return e;
  let ie = rarit.iesire && nr(rarit.iesire.t) > 0 ? rarit.iesire : null;
  if (!ie) { const n = trecere(b, L, scanat); if (n.stare !== "ok") return { id: b.id, fara: n.stare === "gol" || n.stare === "mutat" ? n.stare : "drum-taiat" }; ie = n.iesire; }
  if (!ie) return { id: b.id, fara: "in-grid" };
  const inv0 = nr(ie.inv) > 0 ? nr(ie.inv) : b.inv, com = inv0 * b.lev * COMISION_INCHIDERE, d = b.final - (nr(ie.total) - com);
  return { id: b.id, t0: nr(ie.t), zi: zi(nr(ie.t)), dir: b.dir, inv: inv0, laMargine: nr(ie.total), comision: com, final: b.final, d, dPct: d / inv0 * 100, stop: b.stop, nou: nr(ie.t) >= START, dupa: { 1: null, 4: null, 24: null }, dinNota: true };
}

const medie = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
// media diferenței (% din suma pusă) cu interval 95% prin reeșantionare pe ZILE
export function interval(E, samanta) {
  const peZi = new Map(); for (const e of E) { if (!peZi.has(e.zi)) peZi.set(e.zi, []); peZi.get(e.zi).push(e.dPct); }
  const Z = [...peZi.values()]; if (Z.length < 2) return null;
  const r = mulberry32(samanta === undefined ? SAMANTA : samanta), M = [];
  for (let k = 0; k < RESAMPLARI; k++) { let s = 0, n = 0; for (let i = 0; i < Z.length; i++) { const z = Z[Math.floor(r() * Z.length)]; for (const v of z) { s += v; n++; } } M.push(s / n); }
  M.sort((a, b) => a - b);
  return [M[Math.floor(0.025 * RESAMPLARI)], M[Math.min(RESAMPLARI - 1, Math.floor(0.975 * RESAMPLARI))]];
}
function parte(E, samanta) { const zile = new Set(E.map((e) => e.zi)).size; return { n: E.length, zile, medie: medie(E.map((e) => e.dPct)), suma: E.reduce((s, e) => s + e.d, 0), ic: zile >= MIN_ZILE_INTERVAL ? interval(E, samanta) : null }; }
const semn = (p) => (p && p.ic ? (p.ic[1] < 0 ? -1 : p.ic[0] > 0 ? 1 : 0) : 0);

// bilanțul probei: verdictul doar de la MIN_EPISOADE pe MIN_ZILE; „inchiderea” (media sub 0), „lasatul” (peste 0), „n-am aflat”
export function bilant(episoade, o) {
  const E = (Array.isArray(episoade) ? episoade : []).filter((e) => e && nr(e.t0) > 0 && nr(e.dPct) !== null && nr(e.d) !== null && e.zi), s = o && o.samanta;
  const tot = parte(E, s), vechi = parte(E.filter((e) => !e.nou), s), nou = parte(E.filter((e) => e.nou), s);
  const destule = tot.n >= MIN_EPISOADE && tot.zile >= MIN_ZILE, contra = semn(vechi) * semn(nou) < 0;
  const verdict = !destule || !tot.ic ? null : contra ? "n-am aflat" : tot.ic[1] < 0 ? "inchiderea" : tot.ic[0] > 0 ? "lasatul" : "n-am aflat";
  const dupa = {}; for (const h of [1, 4, 24]) { const l = E.map((e) => e.dupa && e.dupa[h]).filter(Boolean); dupa[h] = { n: l.length, intorsi: l.filter((q) => q.inGrid).length, medie: medie(l.map((q) => q.total)) }; }
  const pe = (f) => { const l = E.filter(f); return { n: l.length, medie: medie(l.map((e) => e.dPct)), suma: l.reduce((a, e) => a + e.d, 0) }; };
  return { forma: 1, n: tot.n, zile: tot.zile, medie: tot.medie, suma: tot.suma, ic: tot.ic, verdict, seContrazic: destule && contra, minEpisoade: MIN_EPISOADE, minZile: MIN_ZILE,
    vechi: { n: vechi.n, zile: vechi.zile, medie: vechi.medie, ic: vechi.ic }, nou: { n: nou.n, zile: nou.zile, medie: nou.medie, ic: nou.ic }, dupa, cuStop: pe((e) => e.stop), faraStop: pe((e) => !e.stop) };
}
