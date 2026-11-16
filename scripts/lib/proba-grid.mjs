// v101.182 (16.11.2026, el a ales „Da, ca urmărire” după auditul Sugestiilor): PROBA GRIDULUI, fixată ÎNAINTE de date.
// Întrebarea: lista „Pe ce aș porni un bot” (regula de la 16.11: lichiditate, funding, cel mult 2 pe direcție) alege monede pe care un grid
// câștigă mai mult decât pe monede lichide alese LA ÎNTÂMPLARE în aceeași zi? (auditul: scorul singur e o trăsătură pe 83 de zile, iar ordinea
// lui între primele ~15 e zgomot - deci întrebarea e deschisă, nu o presupunere.)
// Regulile, scrise acum, înainte de prima zi:
//   - în fiecare zi (tura de la 8:00 RO): cele 5 din listă + 5 candidați lichizi (≥ 1 M USDT/zi, „candidat”, nu din listă) aleși cu mulberry32
//     (sămânța = ziua) - parametrii gridului ca în clasament (jos / sus din GridCalcul.plaseaza, grilele, direcția);
//   - la 7 zile + 1 oră: barele de 1 MINUT de la Binance (nu de 1 oră: drumul prin lumânare mare dădea minusul fals din I-888), gridul simulat
//     pe ele (ordinea maxim / minim în fiecare bară trasă la sorți, nu „drumul cel mai scurt”), comision 0,05% pe fiecare umplere, funding-ul
//     Binance pe poziția din clipa decontării, poziția închisă la ultimul preț; rezultatul pe 1 unitate investită;
//   - o zi = o observație: D = media celor 5 din listă − media celor 5 aleatori; ferestrele de 7 zile care nu se suprapun = dovezile;
//   - verdictul abia la ≥ 26 de ferestre: t ≥ 2 și media > 0 ⇒ „alege mai bine decât întâmplarea”; t ≤ −2 ⇒ „mai rău decât întâmplarea”;
//     altfel „n-am aflat”. Până atunci: „în probă”, doar cifrele. Diferența minimă detectabilă se spune din abaterea observată.
// Garda simulatorului (proba-v100344-grid): pe un mers aleator (martingală) media câștigului ÎNAINTE de comisioane e ~0; altfel proba nu pornește.
// revizia Opus (16.11): comisionul de grilă e cel măsurat pe umplerile reale (ordine maker, GridCalcul COMISION_GRILA 0,02%); 0,05% doar la capete
export const REGULI = { zile: 7, comisionGrila: 0.0002, comisionCapete: 0.0005, nLista: 5, nAleator: 5, pragVol: 1e6, ferestreVerdict: 26, pragT: 2 };

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const samanta = (zi) => Number(String(zi).replace(/\D/g, "")) || 1;

/** Nivelurile gridului: n + 1 prețuri geometrice între jos și sus. */
export function niveluri(jos, sus, n) { const l = []; for (let i = 0; i <= n; i++) l.push(jos * Math.pow(sus / jos, i / n)); return l; }

/**
 * Gridul simulat pe bare de 1 minut, ca un grid Pionex: n grile între n + 1 niveluri; fiecare grilă e goală sau ținută.
 *   - grilă „long” (sub preț la neutru, toate la long): coboară prin nivelul ei de jos ⇒ cumpără q (ținută); urcă prin cel de sus ⇒ vinde q (goală);
 *   - grilă „short” (peste preț la neutru, toate la short): urcă prin nivelul de sus ⇒ vinde q în lipsă (ținută); coboară prin cel de jos ⇒ cumpără înapoi.
 * La pornire: long ține grilele de deasupra prețului (cumpărate la preț), short ține grilele de dedesubt (vândute la preț), neutru nimic.
 * p = { jos, sus, n, dir }; bare = [{ t, o, h, l, c }] crescător; o = { comision, funding: [{ t, r }] (r > 0 ⇒ long-urile plătesc), rnd }.
 * q = 1 / (n · prețul de la început) ⇒ ~1 unitate investită. Rezultatul: r = câștigul net (după comision și funding) pe unitate.
 */
export function simGrid(p, bare, o) {
  o = o || {}; const fee = o.comision == null ? REGULI.comisionGrila : o.comision, feeC = o.comision == null ? REGULI.comisionCapete : o.comision, rnd = o.rnd || Math.random;
  if (!p || !(p.jos > 0) || !(p.sus > p.jos) || !(p.n >= 1) || !Array.isArray(bare) || bare.length < 2) return null;
  const L = niveluri(p.jos, p.sus, p.n), p0 = bare[0].o, q = 1 / (p.n * p0);
  // grila i e între L[i] și L[i+1]; tip: +1 long, −1 short; tine: are poziție
  const G = []; for (let i = 0; i < p.n; i++) { const sub = L[i + 1] <= p0, peste = L[i] >= p0; const tip = p.dir === "long" ? 1 : p.dir === "short" ? -1 : peste ? -1 : 1; G.push({ tip, tine: p.dir === "long" ? peste : p.dir === "short" ? sub : false }); }
  let pos = 0, cash = 0, comisioane = 0, umpleri = 0, fi = 0, ultim = p0;
  for (const g of G) if (g.tine) { pos += g.tip * q; cash -= g.tip * q * p0; comisioane += q * p0 * feeC; }
  const fund = (Array.isArray(o.funding) ? o.funding : []).slice().sort((x, y) => x.t - y.t);
  const tran = (dq, pret) => { pos += dq; cash -= dq * pret; comisioane += Math.abs(dq) * pret * fee; umpleri++; };
  const misca = (a, b) => {
    if (b < a) { for (let i = p.n - 1; i >= 0; i--) { const g = G[i]; if (g.tip === 1 && !g.tine && L[i] < a && L[i] >= b) { tran(q, L[i]); g.tine = true; } else if (g.tip === -1 && g.tine && L[i] < a && L[i] >= b) { tran(q, L[i]); g.tine = false; } } }
    else if (b > a) { for (let i = 0; i < p.n; i++) { const g = G[i], u = L[i + 1]; if (g.tip === 1 && g.tine && u > a && u <= b) { tran(-q, u); g.tine = false; } else if (g.tip === -1 && !g.tine && u > a && u <= b) { tran(-q, u); g.tine = true; } } }
  };
  // v100.349 (urmărirea fișei gridului): o.iesiri = { jos, sus } - stopul și ținta la marginile ferestrei; prețul trece de una ⇒ totul se închide
  // acolo (cu comision), fără funding după. Fără o.iesiri: ca înainte.
  const ies = o.iesiri || null; let oprit = null;
  for (const x of bare) {
    while (fi < fund.length && fund[fi].t <= x.t) { cash -= pos * ultim * fund[fi].r; fi++; }
    // o.drum = "scurt": drumul cel mai scurt prin bară (închide în sus ⇒ întâi minimul) - cele mai puține dus-întorsuri, deci o margine de JOS;
    // altfel ordinea min / max trasă la sorți - inventează dus-întorsuri la mișcare mare, deci o margine de SUS (revizia Opus, 🔴1)
    const drum = o.drum === "scurt" ? (x.c >= x.o ? [x.o, x.l, x.h, x.c] : [x.o, x.h, x.l, x.c]) : rnd() < 0.5 ? [x.o, x.h, x.l, x.c] : [x.o, x.l, x.h, x.c];
    let a = ultim;
    for (const b of drum) {
      if (ies && ies.jos > 0 && b <= ies.jos) { misca(a, ies.jos); a = ies.jos; oprit = "jos"; break; }
      if (ies && ies.sus > 0 && b >= ies.sus) { misca(a, ies.sus); a = ies.sus; oprit = "sus"; break; }
      misca(a, b); a = b;
    }
    ultim = oprit ? a : x.c;
    if (oprit) break;
  }
  const brut = cash + pos * ultim; comisioane += Math.abs(pos) * ultim * feeC;   // închiderea poziției de la final (sau la ieșire), cu comision
  return Object.assign({ r: brut - comisioane, brut, comisioane, umpleri, pozFinala: oprit ? 0 : pos }, oprit ? { oprit } : {});
}

/** Alegerea zilei: cele din listă + aleatorii (mulberry32 pe zi) dintre candidații lichizi care nu sunt în listă. */
export function alegeZi(lista, candidati, zi, G) {
  const top = (Array.isArray(lista) ? lista : []).slice(0, REGULI.nLista), inLista = new Set(top.map((x) => x.simbol));
  const pool = (Array.isArray(candidati) ? candidati : []).filter((x) => x && x.stare === "candidat" && Number(x.volum) >= REGULI.pragVol && !inLista.has(x.simbol)).sort((a, b) => (a.simbol < b.simbol ? -1 : 1));
  const r = mulberry32(samanta(zi)), al = pool.slice();
  for (let i = al.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [al[i], al[j]] = [al[j], al[i]]; }
  const par = (x, grup) => { if (!(x.pret > 0 && x.latime > 0 && x.grile >= 1)) return null; const dir = x.dir === "long" || x.dir === "short" ? x.dir : "neutru"; const loc = G.plaseaza(x.pret, x.latime, dir); return { simbol: x.simbol, grup, dir, pret: x.pret, jos: loc.jos, sus: loc.sus, n: x.grile }; };
  return top.map((x) => par(x, "lista")).concat(al.slice(0, REGULI.nAleator).map((x) => par(x, "aleator"))).filter(Boolean);
}

/** Simbolul Binance al unei perpetue Pionex (HYPE_USDT_PERP ⇒ HYPEUSDT); prețurile se verifică la judecată (alt multiplu ⇒ nejudecat). */
export const simbolBinance = (s) => String(s || "").replace(/_USDT_PERP$/, "USDT").replace(/[^A-Z0-9]/g, "");

/** O serie de diferențe pe zile (k = "D" sau "Dsus"): ferestrele de 7 zile care nu se suprapun; verdictul ÎNGHEȚAT pe primele 26 de ferestre
 *  (revizia Opus: privitul repetat după 26 ar umfla verdictele false); media și t merg mai departe, ca cifre. */
function serie(zile, k) {
  const z = zile.filter((x) => Number.isFinite(x[k]));
  const fer = []; let ult = -Infinity; for (const x of z) { const t = Date.parse(x.zi + "T00:00:00Z"); if (t - ult >= REGULI.zile * 86400000) { fer.push(x[k]); ult = t; } }
  const st = (l) => { const n = l.length, m = n ? l.reduce((q, v) => q + v, 0) / n : null, sd = n > 1 ? Math.sqrt(l.reduce((q, v) => q + (v - m) * (v - m), 0) / (n - 1)) : null; return { n, m, sd, t: n > 1 && sd > 0 ? m / (sd / Math.sqrt(n)) : null }; };
  const tot = st(fer), V = fer.length >= REGULI.ferestreVerdict ? st(fer.slice(0, REGULI.ferestreVerdict)) : null;
  const verdict = !V ? "în probă" : V.t != null && V.t >= REGULI.pragT && V.m > 0 ? "alege mai bine decât întâmplarea" : V.t != null && V.t <= -REGULI.pragT ? "mai rău decât întâmplarea" : "n-am aflat";
  const mde = tot.sd != null && tot.n > 1 ? 2.8 * tot.sd / Math.sqrt(Math.max(tot.n, REGULI.ferestreVerdict)) : null;   // ~80% putere la 5%, pe numărul de ferestre al verdictului
  return { zile: z.length, ferestre: tot.n, medie: tot.m, sd: tot.sd, t: tot.t, mde, verdict, mediaZilelor: z.length ? z.reduce((q, x) => q + x[k], 0) / z.length : null, pePlus: z.length ? z.filter((x) => x[k] > 0).length / z.length : null };
}
/** Rezumatul: cifra principală pe drumul cel mai scurt prin bară (D, aproape de adevăr, puțin sub el); marginea de sus la sorți (Dsus);
 *  verdictul doar dacă amândouă drumurile îl dau, altfel „n-am aflat”. */
export function rezumat(zile) {
  const z = (Array.isArray(zile) ? zile : []).filter((x) => x && (Number.isFinite(x.D) || Number.isFinite(x.Dsus))).sort((p, q) => (p.zi < q.zi ? -1 : 1));
  const j = serie(z, "D"), u = serie(z, "Dsus");
  const deAcord = u.zile === 0 || j.verdict === u.verdict;
  return Object.assign({}, j, { verdict: deAcord ? j.verdict : "n-am aflat", drumuriDeAcord: deAcord, sus: u.zile ? { mediaZilelor: u.mediaZilelor, t: u.t, verdict: u.verdict } : null });
}

// ---- tura zilnică (colectorul): alege de la 8:00 RO, judecă la 7 zile + 1 oră ----
export const FAPI = "https://fapi.binance.com";
const ZI = 86400000, ORA = 3600000;
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
/** Barele de 1 minut [t0, t1) de la Binance, pe pagini de 1.500. */
export async function bare1m(binance, sim, t0, t1) {
  const o = []; let t = t0;
  for (let k = 0; k < 10 && t < t1; k++) {
    const l = await binance(FAPI + "/fapi/v1/klines?symbol=" + encodeURIComponent(sim) + "&interval=1m&startTime=" + t + "&endTime=" + (t1 - 1) + "&limit=1500");
    if (!Array.isArray(l) || !l.length) break;
    for (const x of l) { const b = { t: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]) }; if (b.t >= t0 && b.t < t1 && b.c > 0) o.push(b); }
    const u = Number(l[l.length - 1][0]); if (!(u >= t)) break; t = u + 60000;
  }
  return o;
}
/** O zi judecată: fiecare monedă simulată pe barele ei de DOUĂ ori (drumul cel mai scurt prin bară și ordinea la sorți); D / Dsus = media listei
 *  − media aleatorilor (cel puțin 3 + 3); mp = mișcarea mediană pe un minut față de pasul grilei (unde simulatorul poate greși). */
export async function judecaZi(z, d) {
  const t0 = z.t0, t1 = t0 + REGULI.zile * ZI, rez = [];
  for (const x of z.lista) {
    const sim = simbolBinance(x.simbol);
    try {
      const b = await bare1m(d.binance, sim, t0, t1);
      if (b.length < REGULI.zile * 1440 * 0.9) { rez.push({ simbol: x.simbol, grup: x.grup, r: null, motiv: "bare lipsă (" + b.length + ")" }); continue; }
      const scara = b[0].o / x.pret; if (!(scara > 0.8 && scara < 1.25)) { rez.push({ simbol: x.simbol, grup: x.grup, r: null, motiv: "alt multiplu pe Binance" }); continue; }
      const fr = await d.binance(FAPI + "/fapi/v1/fundingRate?symbol=" + encodeURIComponent(sim) + "&startTime=" + t0 + "&endTime=" + t1 + "&limit=1000");
      const funding = (Array.isArray(fr) ? fr : []).map((f) => ({ t: Number(f.fundingTime), r: Number(f.fundingRate) })).filter((f) => Number.isFinite(f.t) && Number.isFinite(f.r));
      const p = { jos: x.jos * scara, sus: x.sus * scara, n: x.n, dir: x.dir };   // același grid, pe scara Binance (diferențele de preț Pionex / Binance)
      const g = simGrid(p, b, { funding, drum: "scurt" }), gs = simGrid(p, b, { funding, rnd: mulberry32(Math.floor(t0 / 60000) + x.simbol.length) });
      const pas = Math.pow(p.sus / p.jos, 1 / p.n) - 1, mis = b.map((y) => Math.abs(y.c - y.o) / y.o).sort((u, v) => u - v);
      rez.push({ simbol: x.simbol, grup: x.grup, r: g ? g.r : null, rSus: gs ? gs.r : null, umpleri: g ? g.umpleri : null, mp: pas > 0 ? mis[Math.floor(mis.length / 2)] / pas : null });
    } catch (e) { rez.push({ simbol: x.simbol, grup: x.grup, r: null, motiv: "eroare: " + String(e && e.message || e).slice(0, 60) }); }
  }
  const med = (g, k) => { const v = rez.filter((y) => y.grup === g && Number.isFinite(y[k])).map((y) => y[k]); return { n: v.length, m: v.length ? v.reduce((q, w) => q + w, 0) / v.length : null }; };
  const mediana = (g) => { const v = rez.filter((y) => y.grup === g && Number.isFinite(y.mp)).map((y) => y.mp).sort((u, w) => u - w); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const L = med("lista", "r"), A = med("aleator", "r"), LS = med("lista", "rSus"), AS = med("aleator", "rSus");
  return { zi: z.zi, nL: L.n, nA: A.n, l: L.m, a: A.m, D: L.n >= 3 && A.n >= 3 ? L.m - A.m : null, Dsus: LS.n >= 3 && AS.n >= 3 ? LS.m - AS.m : null, mpL: mediana("lista"), mpA: mediana("aleator"), rez };
}
/** d = { acum, cere, trimite, jurnal, binance, Idei, G }; st = { zi, deschise: [], judecate: [], start, esecLa } (pe disc). */
export async function turaProbaGrid(d, st) {
  const acum = d.acum || Date.now();
  if (st.inLucru || acum - (st.esecLa || 0) < 2 * ORA) return null;
  if (d.binance && d.binance.stare && d.binance.stare.oprit) return null;
  st.inLucru = true; st.deschise = st.deschise || []; st.judecate = st.judecate || [];
  let schimbat = false;
  try {
    const zi = ziRo(acum);
    if (oraRo(acum) >= 8 && st.zi !== zi) {
      const cl = ((await d.cere("/api/istoric-bot?action=clasament")) || {}).clasament;
      if (cl && Array.isArray(cl.monede) && acum - (cl.la || 0) < 3 * ORA) {
        const lista = alegeZi(d.Idei.ideiBoti(cl, [], REGULI.nLista), cl.monede, zi, d.G);
        if (lista.length) { st.deschise.push({ zi, t0: Math.floor(acum / 60000) * 60000, lista }); st.start = st.start || zi; schimbat = true; d.jurnal("proba grid: " + zi + " - " + lista.filter((x) => x.grup === "lista").length + " din listă + " + lista.filter((x) => x.grup === "aleator").length + " aleatori, judecați la 7 zile"); }
        st.zi = zi;
      }
    }
    const coapte = st.deschise.filter((z) => acum >= z.t0 + REGULI.zile * ZI + ORA);
    for (const z of coapte.slice(0, 1)) {   // o zi pe tură (~80 de cereri Binance); restul la tura următoare
      const j = await judecaZi(z, d);
      if (d.binance && d.binance.stare && d.binance.stare.oprit) break;
      // revizia Opus: o zi stricată de rețea nu dispare (ar fi o selecție pe starea rețelei) - se reîncearcă la turele următoare, de cel mult 3 ori în total
      const retea = j.rez.some((y) => y.r == null && /^eroare:/.test(String(y.motiv || "")));
      if (j.D == null && retea && (z.incercari || 0) < 2) { z.incercari = (z.incercari || 0) + 1; st.esecLa = acum; schimbat = true; d.jurnal("proba grid: " + j.zi + " - erori de rețea, reîncerc (" + (z.incercari + 1) + "/3)"); break; }
      st.judecate.push({ zi: j.zi, D: j.D, Dsus: j.Dsus, l: j.l, a: j.a, nL: j.nL, nA: j.nA, mpL: j.mpL, mpA: j.mpA }); st.deschise = st.deschise.filter((y) => y !== z); schimbat = true;
      d.jurnal("proba grid: judecată " + j.zi + " - listă " + (j.l == null ? "—" : (j.l * 100).toFixed(2) + "%") + " (" + j.nL + "), aleatori " + (j.a == null ? "—" : (j.a * 100).toFixed(2) + "%") + " (" + j.nA + ")");
    }
    st.judecate = st.judecate.slice(-400);
    // v101.186: verdictul se îngheață în starea turei la prima apariție - după ~400 de zile primele zile ies din `judecate`, iar „primele 26 de
    // ferestre” s-ar muta; de atunci se trimite tot el
    const rz = rezumat(st.judecate);
    if (!st.verdictInghetat && rz.verdict && rz.verdict !== "în probă") { st.verdictInghetat = { verdict: rz.verdict, la: acum }; schimbat = true; d.jurnal("proba grid: VERDICT " + rz.verdict + " (înghețat)"); }
    if (st.verdictInghetat) rz.verdict = st.verdictInghetat.verdict;
    if (schimbat) await d.trimite("/api/istoric-bot?action=probaGrid", { la: acum, start: st.start, deschise: st.deschise.length, zile: st.judecate.slice(-120), rezumat: rz });
    return { schimbat };
  } catch (e) { st.esecLa = acum; d.jurnal("proba grid ESEC (reîncerc peste 2 ore)", String(e && e.message || e)); return null; }
  finally { st.inLucru = false; }
}
