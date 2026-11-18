// Dovezile regulilor, PE BOT (v100.360; auditul din 18.11 pe 2.456 de boți / 263 de zile): pagina „Comportament” justifica regulile cu cifre
// care nu le susțineau („Cel mult 7 boți pe zi” cu netul PE ZI: zilele pline au pur și simplu mai mulți boți; frâna și „3 la rând” comparate
// în aceeași zi, unde mecanica singură dă „dovedit” fals: pierderile care trag regula stau chiar în grupa „liberă”). Hotărârea lui: regulile
// RĂMÂN (sunt disciplina lui), dar fiecare spusă cinstit, cu starea ei: dovedita | nedovedita | contrazisa | putine (| descriere).
//
// Metoda, pentru fiecare regulă de pornire (frâna, pragul zilei, după o zi proastă, după N pierderi la rând):
//  - statistica: diferența cu / fără regulă ÎN ACEEAȘI ZI a pornirii (ponderi nCu·nFără/(nCu+nFără), ca JurnalDovezi);
//  - H0: netul amestecat ÎNTRE boții aceleiași zile (piața zilei rămâne) și regula REFĂCUTĂ pe netul amestecat ⇒ cât dă mecanica singură;
//    efectul = real − media H0; p = cât de des H0 iese cel puțin la fel de prost (într-o parte, cum spune regula);
//  - pragul pe familie: minimul p (pe ranguri, în ambele părți) pe toate regulile testate, pe aceleași amestecări (Westfall–Young);
//  - martorul: blocarea la întâmplare a tot atâția boți din toți (dacă regula nu bate întâmplarea, nu câștigi nimic ascultând-o).
// „dovedita” = familia ≤ 5% în sensul regulii ȘI martorul ≤ 5%; „contrazisa” = familia ≤ 5% în sensul opus; n ≥ 10 boți și ≥ 10 zile în
// fiecare grupă (și ≥ 10 zile cu ambele), altfel „putine”. Durata (peste 6 h, sub 15 min) se știe abia la închidere ⇒ doar „descriere”.
// Calculul greu ține minte pe cheia arhivei (nu la fiecare tură); aleator DOAR mulberry32 cu sămânță fixă. Modul pur, fără rețea; probat
// în scripts/proba-v100360-comportament.mjs.

const ZI = 86400000, ORA = 3600000, MIN = 60000;
export const ZI_PROASTA = -50, DUPA_PROASTA = 4, ORE_LUNGI = 6, PRAG_MINUTE = 15;
export const MIN_N = 10, MIN_ZILE = 10, ALFA = 0.05, B_PERM = 999, B_MARTOR = 999, B_BOOT = 1000;
export const TESTATE = ["frana", "prag", "dupaProasta", "treiLaRand"];
export const ORDINE = ["frana", "prag", "dupaProasta", "treiLaRand", "ore6", "minute"];
export const STARE_TXT = { dovedita: "dovedită", nedovedita: "nedovedită", contrazisa: "contrazisă", putine: "prea puține date", descriere: "descriere" };

const nr = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const netDe = (t) => (nr(t && t.net) !== null ? nr(t.net) : nr(t && t.rezultat));
const r2 = (v) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const r1 = (v) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);
const r4 = (v) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 10000) / 10000);
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }), ziRo = (t) => fZi.format(new Date(t));
const plusZile = (zi, d) => new Date(Date.parse(zi + "T12:00:00Z") + d * ZI).toISOString().slice(0, 10);
function inceputZi(zi) { for (const h of [2, 3]) { const x = Date.parse(zi + "T00:00:00Z") - h * ORA; if (ziRo(x) === zi && ziRo(x - 1) !== zi) return x; } return Date.parse(zi + "T00:00:00Z"); }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fMii = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const S1 = (v) => { v = Number(v) || 0; const a = Math.round(Math.abs(v) * 10) / 10; return a === 0 ? "0,0" : (v > 0 ? "+" : "−") + fMii.format(a); };
const pc = (p) => (p === null || p === undefined ? "—" : fMii.format(Math.round(p * 1000) / 10) + "%");
function cate(n, sg, pl) {
  const k = Math.round(Number(n)), r = Math.abs(k) % 100;
  const t = typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(k, sg, pl) : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl;
  return Math.abs(k) >= 1000 ? t.replace(/^\d+/, (d) => Number(d).toLocaleString("ro-RO")) : t;
}
const ordinal = (n) => (Math.round(Number(n)) === 1 ? "primul" : "al " + Math.round(Number(n)) + "-lea");
// căutări în vectorul sortat al închiderilor
function ub(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; } return lo; }
function lb(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; }

// numele regulilor (pe pagină și pe Discord) - pragurile lui (P) intră în nume
export function numeRegula(cod, P) {
  const p = P || {}, rand = nr(p.rand) > 0 ? nr(p.rand) : 3;
  return { frana: "pornit cu frâna trasă", prag: "peste pragul zilei", dupaProasta: "după o zi proastă", treiLaRand: "după " + cate(rand, "pierdere", "pierderi") + " la rând",
    ore6: "ținut peste " + cate(ORE_LUNGI, "oră", "ore"), minute: "închis în minute", banda: "ținut în afara grilei", lichidare: "lichidat" }[cod] || String(cod);
}
function regulaTxt(cod, P) {
  return { frana: "Frâna trasă = pauză (pierderile azi / pe 7 zile / la rând)", prag: "Cel mult " + cate(P.boti, "bot", "boți") + " pe zi",
    dupaProasta: "După o zi sub −" + Math.abs(ZI_PROASTA) + ", a doua zi cel mult " + cate(DUPA_PROASTA, "bot", "boți"), treiLaRand: cate(P.rand, "pierdere", "pierderi") + " la rând = gata ziua",
    ore6: "Ținuți peste " + cate(ORE_LUNGI, "oră", "ore"), minute: "Închiși sub " + cate(PRAG_MINUTE, "minut", "minute") }[cod];
}

// ---------------- pregătirea (o dată pe arhivă): ordinea pornirilor, a închiderilor, zilele, indicii frânei ----------------
function pregateste(toate, P, deschise) {
  const L = [];
  (Array.isArray(toate) ? toate : []).forEach((t, k) => { const p = nr(t && t.pornit), i = nr(t && t.inchis), v = netDe(t); if (p !== null && i !== null && v !== null) L.push({ t, id: String(t.id), p, i, v, k }); });
  L.sort((a, b) => a.p - b.p || a.i - b.i || a.k - b.k);
  const n = L.length, ids = new Set(L.map((x) => x.id));
  const D = (Array.isArray(deschise) ? deschise : []).filter((b) => b && b.activ !== false && nr(b.pornitLa) !== null && !ids.has(String(b.id))).map((b) => nr(b.pornitLa)).sort((a, b) => a - b);
  // zilele pornirii (intervale continue, L e sortat după pornire)
  const zile = [], zIdx = new Map(), ziDe = new Int32Array(n), sD = [], eD = [], z0 = [];
  for (let i = 0; i < n; i++) { const z = ziRo(L[i].p); if (!zIdx.has(z)) { zIdx.set(z, zile.length); zile.push(z); sD.push(i); eD.push(i); z0.push(inceputZi(z)); } const d = zIdx.get(z); ziDe[i] = d; eD[d] = i + 1; }
  // închiderile: crescător după oră; la egalitate, cel venit întâi în listă e „cel mai recent” (ca sortarea stabilă din Obiceiuri.frana)
  const co = Array.from({ length: n }, (_, i) => i).sort((a, b) => L[a].i - L[b].i || L[b].k - L[a].k), poz = new Int32Array(n), ic = new Float64Array(n);
  co.forEach((j, k) => { poz[j] = k; ic[k] = L[j].i; });
  const aP = new Int32Array(n), aZ = new Int32Array(n), a7 = new Int32Array(n), selfZ = new Uint8Array(n), self7 = new Uint8Array(n), randOk = new Uint8Array(n), pornitiAzi = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const p = L[i].p, d = ziDe[i]; aP[i] = ub(ic, p); aZ[i] = lb(ic, z0[d]); a7[i] = ub(ic, p - 7 * ZI);
    if (poz[i] < aP[i]) { selfZ[i] = L[i].i >= z0[d] ? 1 : 0; self7[i] = L[i].i > p - 7 * ZI ? 1 : 0; }   // închis chiar la pornire: nu se numără pe el
    randOk[i] = aP[i] > 0 && p - ic[aP[i] - 1] < ZI ? 1 : 0;
    // boții porniți azi înaintea lui (și cei la aceeași oră), închiși sau încă deschiși
    let j = i; while (j + 1 < eD[d] && L[j + 1].p <= p) j++;
    pornitiAzi[i] = j - sD[d] + (ub(D, p) - lb(D, z0[d]));
  }
  // netul și numărul pe ziua pornirii (închișii; numărul și cu cei încă deschiși)
  const sumZi = new Float64Array(zile.length), nZi = new Int32Array(zile.length), nZiTot = new Map();
  for (let i = 0; i < n; i++) { sumZi[ziDe[i]] += L[i].v; nZi[ziDe[i]]++; }
  zile.forEach((z, d) => nZiTot.set(z, nZi[d])); D.forEach((p) => { const z = ziRo(p); nZiTot.set(z, (nZiTot.get(z) || 0) + 1); });
  // grupele zilelor de închidere (pentru „N la rând” în aceeași zi): [început, sfârșit) în ordinea închiderilor + ziua pornirii aceeași
  const gI = []; for (let k = 0; k < n; k++) { const z = ziRo(ic[k]); if (!gI.length || gI[gI.length - 1].z !== z) gI.push({ z, s: k, e: k + 1, d: zIdx.has(z) ? zIdx.get(z) : -1 }); else gI[gI.length - 1].e = k + 1; }
  return { L, n, D, zile, zIdx, ziDe, sD, eD, z0, co, poz, ic, aP, aZ, a7, selfZ, self7, randOk, pornitiAzi, sumZi, nZi, nZiTot, gI };
}

// regulile care nu depind de netul amestecat în aceeași zi (pragul zilei; ziua proastă = suma zilei, care rămâne la amestecare)
function fixe(S, P) {
  const prag = new Uint8Array(S.n), dupa = new Uint8Array(S.n), ore6 = new Uint8Array(S.n), minute = new Uint8Array(S.n);
  const proasta = new Set(); S.zile.forEach((z, d) => { if (S.sumZi[d] <= ZI_PROASTA) proasta.add(z); });
  for (let i = 0; i < S.n; i++) {
    prag[i] = S.pornitiAzi[i] >= P.boti ? 1 : 0;
    dupa[i] = proasta.has(plusZile(S.zile[S.ziDe[i]], -1)) && S.pornitiAzi[i] + 1 > DUPA_PROASTA ? 1 : 0;
    const m = (S.L[i].i - S.L[i].p) / MIN; ore6[i] = m > ORE_LUNGI * 60 ? 1 : 0; minute[i] = m < PRAG_MINUTE ? 1 : 0;
  }
  return { prag, dupaProasta: dupa, ore6, minute };
}
// frâna la pornire (zi / 7 zile / la rând - fără pragul zilei, care e regula lui separată) și „N la rând” în aceeași zi, pe netul v
function dinNet(S, P, v, out) {
  const n = S.n, Sx = out.Sx, R = out.R, fr = out.frana, tr = out.treiLaRand;
  Sx[0] = 0; R[0] = 0;
  for (let k = 0; k < n; k++) { const x = v[S.co[k]]; Sx[k + 1] = Sx[k] + x; R[k + 1] = x < 0 ? R[k] + 1 : 0; }
  for (let i = 0; i < n; i++) {
    const a = S.aP[i], netZi = Sx[a] - Sx[S.aZ[i]] - (S.selfZ[i] ? v[i] : 0), netSapt = Sx[a] - Sx[S.a7[i]] - (S.self7[i] ? v[i] : 0);
    fr[i] = netZi <= -P.zi || netSapt <= -P.sapt || (R[a] >= P.rand && S.randOk[i]) ? 1 : 0;
    tr[i] = 0;
  }
  for (const g of S.gI) {
    if (g.d < 0) continue;
    let r = 0, T = null; for (let k = g.s; k < g.e; k++) { r = v[S.co[k]] < 0 ? r + 1 : 0; if (r >= P.rand) { T = S.ic[k]; break; } }
    if (T === null) continue;
    for (let i = S.sD[g.d]; i < S.eD[g.d]; i++) if (S.L[i].p > T) tr[i] = 1;
  }
}
// diferența cu / fără în aceeași zi a pornirii (ponderi nC·nF/(nC+nF)); cu mai puțin de 2 zile cu ambele ⇒ null
function difZi(S, v, f, acc) {
  const sc = acc.sc, nc = acc.nc, sf = acc.sf, nf = acc.nf; sc.fill(0); nc.fill(0); sf.fill(0); nf.fill(0);
  for (let i = 0; i < S.n; i++) { const d = S.ziDe[i]; if (f[i]) { sc[d] += v[i]; nc[d]++; } else { sf[d] += v[i]; nf[d]++; } }
  let W = 0, C = 0, A = 0;
  for (let d = 0; d < S.zile.length; d++) if (nc[d] && nf[d]) { const w = nc[d] * nf[d] / (nc[d] + nf[d]); W += w; C += w * (sc[d] / nc[d] - sf[d] / nf[d]); A++; }
  return { dif: A >= 2 ? C / W : null, ambele: A };
}
// interval pe ZILE (bootstrap; boții aceleiași zile nu sunt dovezi separate) pentru media pe bot
function icZile(S, v, alege, seed) {
  const m = new Map(); for (let i = 0; i < S.n; i++) if (alege(i)) { const d = S.ziDe[i], x = m.get(d) || { s: 0, n: 0 }; x.s += v[i]; x.n++; m.set(d, x); }
  const Z = [...m.values()]; if (Z.length < 2) return null;
  const rnd = mulberry32(seed), ms = [];
  for (let b = 0; b < B_BOOT; b++) { let s = 0, c = 0; for (let k = 0; k < Z.length; k++) { const x = Z[(rnd() * Z.length) | 0]; s += x.s; c += x.n; } if (c) ms.push(s / c); }
  ms.sort((a, b) => a - b); const q = (p) => ms[Math.min(ms.length - 1, Math.max(0, Math.floor(p * ms.length)))];
  return [r2(q(0.025)), r2(q(0.975))];
}

// ---------------- calculul greu: regulile pe bot, H0, familia, martorul, graficele fixe ----------------
function calculeaza(toate, P, deschise, o) {
  const S = pregateste(toate, P, deschise), n = S.n, B = o.B || B_PERM, BM = o.BM || B_MARTOR;
  const v0 = new Float64Array(n); for (let i = 0; i < n; i++) v0[i] = S.L[i].v;
  const F = fixe(S, P), buf = { Sx: new Float64Array(n + 1), R: new Int32Array(n + 1), frana: new Uint8Array(n), treiLaRand: new Uint8Array(n) };
  const acc = { sc: new Float64Array(S.zile.length), nc: new Int32Array(S.zile.length), sf: new Float64Array(S.zile.length), nf: new Int32Array(S.zile.length) };
  dinNet(S, P, v0, buf);
  const real = { frana: Uint8Array.from(buf.frana), treiLaRand: Uint8Array.from(buf.treiLaRand), prag: F.prag, dupaProasta: F.dupaProasta, ore6: F.ore6, minute: F.minute };
  const st = {}; for (const c of TESTATE) st[c] = difZi(S, v0, real[c], acc);
  // H0: amestecarea netului în fiecare zi a pornirii + regula refăcută
  const H = {}; for (const c of TESTATE) H[c] = new Float64Array(B).fill(NaN);
  if (n >= 2) {
    const rnd = mulberry32(o.samanta || 360), v = new Float64Array(n);
    for (let b = 0; b < B; b++) {
      v.set(v0);
      for (let d = 0; d < S.zile.length; d++) for (let i = S.eD[d] - 1; i > S.sD[d]; i--) { const j = S.sD[d] + Math.floor(rnd() * (i - S.sD[d] + 1)), a = v[i]; v[i] = v[j]; v[j] = a; }
      dinNet(S, P, v, buf);
      for (const c of TESTATE) { const r = difZi(S, v, c === "frana" ? buf.frana : c === "treiLaRand" ? buf.treiLaRand : F[c], acc); H[c][b] = r.dif === null ? NaN : r.dif; }
    }
  }
  // pe fiecare regulă: grupele, H0, p într-o parte (cum spune regula: boții ei mai proști) și în ambele (pentru familie)
  const R = {}, tot = v0.reduce((a, x) => a + x, 0);
  for (const c of ORDINE) {
    const f = real[c]; let nC = 0, sC = 0; const zC = new Set(), zF = new Set();
    for (let i = 0; i < n; i++) if (f[i]) { nC++; sC += v0[i]; zC.add(S.ziDe[i]); } else zF.add(S.ziDe[i]);
    const nF = n - nC, x = { cod: c, n: nC, zile: zC.size, nFara: nF, zileFara: zF.size, peBotCu: nC ? sC / nC : null, peBotFara: nF ? (tot - sC) / nF : null };
    if (TESTATE.includes(c)) {
      const h = Array.from(H[c]).filter((y) => Number.isFinite(y)).sort((a, b2) => a - b2), xr = st[c].dif;
      x.ambele = st[c].ambele; x.difZi = xr; x.h0 = h;
      x.putine = nC < MIN_N || zC.size < MIN_ZILE || nF < MIN_N || zF.size < MIN_ZILE || st[c].ambele < MIN_ZILE || xr === null || h.length < 20;
      if (!x.putine) {
        const le = ub(h, xr), ge = h.length - lb(h, xr), mec = h.reduce((a, y) => a + y, 0) / h.length, q = (p) => h[Math.min(h.length - 1, Math.max(0, Math.floor(p * h.length)))];
        x.mecanic = mec; x.dif = xr - mec; x.ic = [xr - q(0.975), xr - q(0.025)];
        x.pJos = (le + 1) / (h.length + 1); x.pSus = (ge + 1) / (h.length + 1); x.p2 = Math.min(1, 2 * Math.min(x.pJos, x.pSus));
        // martorul: tot atâția boți blocați la întâmplare din toți
        const rnd = mulberry32((o.samanta || 360) + 7 * (ORDINE.indexOf(c) + 1)), idx = new Int32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
        const castig = -sC; let s = 0, peste = 0;
        for (let b = 0; b < BM; b++) { let cc = 0; for (let k = 0; k < nC; k++) { const j = k + ((rnd() * (n - k)) | 0), t = idx[k]; idx[k] = idx[j]; idx[j] = t; cc -= v0[idx[k]]; } s += cc; if (cc >= castig - 1e-9) peste++; }
        x.martor = { blocati: nC, castig: r2(castig), medieIntamplare: r2(s / BM), p: r4((peste + 1) / (BM + 1)) };
      }
    }
    R[c] = x;
  }
  // familia: minimul p în ambele părți pe toate regulile testate (Westfall–Young, pe aceleași amestecări)
  const fam = TESTATE.filter((c) => !R[c].putine);
  if (fam.length) {
    const pe = fam.map((c) => ({ c, h: R[c].h0, raw: H[c] }));
    let minP = [];
    for (let b = 0; b < B; b++) {
      let m = 1, ok = false;
      for (const { h, raw } of pe) { const y = raw[b]; if (!Number.isFinite(y)) continue; ok = true; const p2 = Math.min(1, 2 * Math.min(ub(h, y) / h.length, (h.length - lb(h, y)) / h.length)); if (p2 < m) m = p2; }
      if (ok) minP.push(m);
    }
    for (const c of fam) R[c].pFamilie = (minP.filter((m) => m <= R[c].p2 + 1e-12).length + 1) / (minP.length + 1);
  }
  // starea
  for (const c of ORDINE) {
    const x = R[c];
    if (!TESTATE.includes(c)) { x.stare = "descriere"; continue; }
    x.stare = x.putine ? "putine" : x.pFamilie <= ALFA && x.dif < 0 && x.martor.p <= ALFA ? "dovedita" : x.pFamilie <= ALFA && x.dif > 0 ? "contrazisa" : "nedovedita";
  }
  // pe fiecare bot: regulile atinse și ziua lui (netul față de media CELORLALȚI boți porniți în aceeași zi)
  const peBot = new Map();
  for (let i = 0; i < n; i++) {
    const d = S.ziDe[i], k = S.nZi[d], fata = k > 1 ? v0[i] - (S.sumZi[d] - v0[i]) / (k - 1) : null;
    peBot.set(S.L[i].id, { zi: S.zile[d], nZi: k, fataDeZi: fata, medieZi: k > 1 ? (S.sumZi[d] - v0[i]) / (k - 1) : null, atinse: ORDINE.filter((c) => real[c][i]) });
  }
  return { S, R, real, peBot, v0, grafice: graficeFixe(S, v0, real, P) };
}

// graficele care nu depind de ora citirii
function graficeFixe(S, v0, real, P) {
  const dur = (i) => (S.L[i].i - S.L[i].p) / MIN;
  const gr = (et, alege, seed) => { let k = 0, s = 0; const z = new Set(); for (let i = 0; i < S.n; i++) if (alege(i)) { k++; s += v0[i]; z.add(S.ziDe[i]); } const putine = k < MIN_N || z.size < MIN_ZILE; return { et, n: k, zile: z.size, netPeBot: k ? r2(s / k) : null, ic: putine ? null : icZile(S, v0, alege, seed), putine }; };
  const durata = [["sub 15 min", 0, 15], ["15–60 min", 15, 60], ["1–6 h", 60, 360], ["peste 6 h", 360, Infinity]].map(([et, lo, hi], k) => gr(et, (i) => dur(i) >= lo && dur(i) < hi, 3601 + k));
  const botiZi = [["1–3", 1, 3], ["4–7", 4, 7], ["8–15", 8, 15], ["16+", 16, Infinity]].map(([et, lo, hi], k) => { const g = gr(et, (i) => S.nZi[S.ziDe[i]] >= lo && S.nZi[S.ziDe[i]] <= hi, 3611 + k); return { et: g.et, boti: g.n, zile: g.zile, netPeBot: g.netPeBot, ic: g.ic, putine: g.putine }; });
  return { durata, botiZi };
}
// după o zi proastă: câți boți a doua zi, pe straturi după câți boți erau în ziua proastă (ca „pornești mai mulți” să nu fie doar „ai mulți boți”)
function graficProasta(S, azi) {
  const randuri = S.zile.map((z, d) => ({ z, n: S.nZiTot.get(z) || 0, net: S.sumZi[d], urm: S.nZiTot.get(plusZile(z, 1)) || 0, gata: plusZile(z, 1) < azi }));
  return [["1–7", 1, 7], ["8–15", 8, 15], ["16+", 16, Infinity]].map(([strat, lo, hi]) => {
    const l = randuri.filter((x) => x.gata && x.n >= lo && x.n <= hi), a = l.filter((x) => x.net <= ZI_PROASTA), b = l.filter((x) => x.net > ZI_PROASTA);
    const m = (q) => (q.length ? r1(q.reduce((s, x) => s + x.urm, 0) / q.length) : null);
    return { strat, dupa: m(a), altfel: m(b), nDupa: a.length, nAltfel: b.length };
  });
}
// frâna (zi / 7 zile / la rând) la o clipă oarecare, pe netul real
function franaLa(C, P, t) {
  const S = C.S;
  if (!C._Sx) { const Sx = new Float64Array(S.n + 1), R = new Int32Array(S.n + 1); for (let k = 0; k < S.n; k++) { const x = C.v0[S.co[k]]; Sx[k + 1] = Sx[k] + x; R[k + 1] = x < 0 ? R[k] + 1 : 0; } C._Sx = Sx; C._R = R; }
  const a = ub(S.ic, t), z0 = inceputZi(ziRo(t)), netZi = C._Sx[a] - C._Sx[lb(S.ic, z0)], netSapt = C._Sx[a] - C._Sx[ub(S.ic, t - 7 * ZI)];
  return netZi <= -P.zi || netSapt <= -P.sapt || (C._R[a] >= P.rand && a > 0 && t - S.ic[a - 1] < ZI);
}
function graficFrana30(C, P, acum) {
  const S = C.S, azi = ziRo(acum), out = [];
  for (let k = 29; k >= 0; k--) {
    const zi = plusZile(azi, -k), d = S.zIdx.has(zi) ? S.zIdx.get(zi) : -1, sf = Math.min(inceputZi(plusZile(zi, 1)) - 1, acum);
    let peste = 0, netP = 0;
    if (d >= 0) for (let i = S.sD[d]; i < S.eD[d]; i++) if (C.real.frana[i]) { peste++; netP += C.v0[i]; }
    const dz = S.D.filter((p) => ziRo(p) === zi), pesteD = dz.filter((p) => franaLa(C, P, p)).length;
    out.push({ zi, trasa: peste + pesteD > 0 || franaLa(C, P, sf), boti: (d >= 0 ? S.nZi[d] : 0) + dz.length, peste: peste + pesteD, net: d >= 0 ? r2(S.sumZi[d]) : 0, netPeste: r2(netP) });
  }
  return out;
}

// ---------------- textele cinstite ----------------
function eticheteGrupe(cod, P) {
  return { frana: ["Pornirile cu frâna trasă", "cele cu frâna liberă"] /* nu „Porniți cu frâna trasă”: e titlul unei secțiuni de pe pagină */, prag: [mareP(ordinal(P.boti + 1)) + " bot al zilei și următorii", "primii " + P.boti],
    dupaProasta: ["A doua zi după o zi sub −" + Math.abs(ZI_PROASTA) + ", " + ordinal(DUPA_PROASTA + 1) + " bot și următorii", "ceilalți"],
    treiLaRand: ["Porniți după " + cate(P.rand, "pierdere", "pierderi") + " la rând, în aceeași zi", "ceilalți"],
    ore6: ["Ținuți peste " + cate(ORE_LUNGI, "oră", "ore"), "ceilalți"], minute: ["Închiși sub " + cate(PRAG_MINUTE, "minut", "minute"), "ceilalți"] }[cod];
}
const mareP = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
function textRegula(x, P) {
  const [eC, eF] = eticheteGrupe(x.cod, P);
  if (x.stare === "descriere") {
    if (!x.n) return eC + ": niciun bot.";
    return eC + ": " + S1(x.peBotCu) + " pe bot net (" + cate(x.n, "bot", "boți") + "); " + eF + " " + S1(x.peBotFara) + ". Durata se știe abia la închidere: e o descriere, nu o regulă dovedită.";
  }
  if (x.stare === "putine") return eC + ": " + cate(x.n, "bot", "boți") + " în " + cate(x.zile, "zi", "zile") + (x.ambele !== undefined && x.ambele < MIN_ZILE && x.zile >= MIN_ZILE ? " (" + cate(x.ambele, "zi", "zile") + " cu boți și fără regulă)" : "") + ": prea puține ca să judec (îmi trebuie cel puțin " + cate(MIN_N, "bot", "boți") + " și " + cate(MIN_ZILE, "zi", "zile") + " în fiecare grupă).";
  const m = x.martor, mt = m.p <= ALFA ? "regula i-a ales mai bine decât întâmplarea (p " + pc(m.p) + ")" : m.p >= 1 - ALFA ? "întâmplarea alegea mai bine (p " + pc(m.p) + ")" : "la fel (p " + pc(m.p) + ")";
  const mec = Math.abs(x.mecanic) >= 0.5 ? "În aceeași zi: " + S1(x.difZi) + " pe bot, dar doar din mecanică ar ieși " + S1(x.mecanic) + " ⇒ " + S1(x.dif) : "În aceeași zi: " + S1(x.dif) + " pe bot";
  return eC + ": " + S1(x.peBotCu) + " pe bot (" + cate(x.n, "bot", "boți") + "); " + eF + ": " + S1(x.peBotFara) + ". " + mec + " (p " + pc(x.pJos) + ", pe toate regulile " + pc(x.pFamilie) + "). Blocați la întâmplare tot atâția: " + mt + " ⇒ " + STARE_TXT[x.stare] + ".";
}

// ---------------- memoria pe cheia arhivei ----------------
let memo = { cheie: null, C: null };
function cheieArhiva(toate, P, deschise, o) {
  let n = 0, sp = 0, si = 0, sv = 0; for (const t of Array.isArray(toate) ? toate : []) { const p = nr(t && t.pornit), i = nr(t && t.inchis), v = netDe(t); if (p === null || i === null || v === null) continue; n++; sp += p % 1e9; si += i % 1e9; sv += v; }
  let nd = 0, sd = 0; for (const b of Array.isArray(deschise) ? deschise : []) if (b && b.activ !== false && nr(b.pornitLa) !== null) { nd++; sd += nr(b.pornitLa) % 1e9 + String(b.id).length; }
  return [n, sp, si, Math.round(sv * 100), nd, sd, P.zi, P.sapt, P.rand, P.boti, o.B || "", o.BM || "", o.samanta || ""].join("|");
}
export function calculMemo(toate, P, deschise, o) {
  o = o || {}; const k = cheieArhiva(toate, P, deschise, o);
  if (memo.cheie !== k) memo = { cheie: k, C: calculeaza(toate, P, deschise, o) };
  return memo.C;
}
export const golesteMemo = () => { memo = { cheie: null, C: null }; };

// ⇒ { reguliDovezi, grafice, stari: {cod: stare}, peBot (Map id ⇒ { zi, nZi, fataDeZi, atinse }) } - P = Obiceiuri.praguriFrana
export function reguliDovezi(toate, P, deschise, acum, o) {
  const C = calculMemo(toate, P, deschise, o);
  const lista = ORDINE.map((c) => {
    const x = C.R[c];
    return { cod: c, regula: regulaTxt(c, P), stare: x.stare, peBotCu: r2(x.peBotCu), peBotFara: r2(x.peBotFara), dif: x.dif === undefined ? (x.stare === "descriere" && x.n && x.nFara ? r2(x.peBotCu - x.peBotFara) : null) : r2(x.dif),
      ic: x.ic ? [r2(x.ic[0]), r2(x.ic[1])] : null, p: x.pJos === undefined ? null : r4(x.pJos), pFamilie: x.pFamilie === undefined ? null : r4(x.pFamilie), martor: x.martor || null,
      n: x.n, zile: x.zile, nFara: x.nFara, zileFara: x.zileFara, difZi: x.difZi === undefined || x.difZi === null ? null : r2(x.difZi), mecanic: x.mecanic === undefined ? null : r2(x.mecanic), text: textRegula(x, P) };
  });
  const stari = {}; for (const r of lista) stari[r.cod] = r.stare;
  const azi = ziRo(acum);
  return { reguliDovezi: lista, stari, peBot: C.peBot,
    grafice: { durata: C.grafice.durata, botiZi: C.grafice.botiZi, proasta: graficProasta(C.S, azi), frana30: graficFrana30(C, P, acum),
      notaDurata: "Durata se știe abia la închidere: e ce s-a întâmplat, nu un sfat la pornire." } };
}

// ---------------- evaluarea pe DOUĂ AXE ----------------
// (a) netul față de media celorlalți boți ai lui porniți în aceeași zi (ce ține de el, nu de piață); singurul bot al zilei ⇒ null;
// (b) regulile atinse, fiecare cu starea ei. „Noroc” / „Greșeala a costat” DOAR când o regulă atinsă e dovedită; altfel titlul descrie.
const DIN_DECIZII = { boti: "prag", frana: "frana", banda: "banda", minute: "minute", lichidare: "lichidare" };
const STARE_FIXA = { banda: "nedovedita", lichidare: "descriere" };   // banda nu e testată aici; lichidarea e un fapt
function atinseDin(rele, extra, stari, P) {
  const coduri = []; for (const c of rele || []) { const k = DIN_DECIZII[c] || c; if (!coduri.includes(k)) coduri.push(k); }
  for (const c of extra || []) if (!coduri.includes(c)) coduri.push(c);
  const ord = ORDINE.concat(["banda", "lichidare"]);
  return coduri.sort((a, b) => ord.indexOf(a) - ord.indexOf(b)).map((cod) => ({ cod, stare: STARE_FIXA[cod] || (stari && stari[cod]) || "nedovedita", nume: numeRegula(cod, P) }));
}
export function eticheta2(net, fataDeZi, atinse) {
  const dov = atinse.filter((a) => a.stare === "dovedita"), z = fataDeZi === null || fataDeZi === undefined ? "; singurul bot al zilei" : "; față de ziua ta " + S1(fataDeZi);
  if (dov.length) return (net >= 0 ? "Noroc, " : "Greșeala a costat, ") + S1(net) + z + "; regulă dovedită atinsă: " + dov.map((a) => a.nume).join(", ") + ".";
  const grupe = [["nedovedita", "reguli atinse, nedovedite"], ["contrazisa", "reguli atinse, contrazise de istoria ta"], ["putine", "reguli atinse, cu prea puține date"], ["descriere", "fapte"]];
  const parti = grupe.map(([s, et]) => { const l = atinse.filter((a) => a.stare === s); return l.length ? "; " + et + ": " + l.map((a) => a.nume).join(", ") : ""; }).join("");
  return (net >= 0 ? "Pe plus, " : "Pe minus, ") + S1(net) + z + parti + ".";
}
// ziua unui bot direct din arhivă (când nu e în memorie): media celorlalți porniți în aceeași zi (închiși)
function ziuaDirect(t, toate) {
  const p = nr(t && t.pornit); if (p === null) return { zi: null, nZi: null, fataDeZi: null, medieZi: null };
  const z = ziRo(p), id = String(t.id), v = netDe(t) || 0; let s = 0, k = 0;
  for (const x of Array.isArray(toate) ? toate : []) { const q = nr(x && x.pornit), w = netDe(x); if (q === null || w === null || nr(x.inchis) === null || String(x.id) === id || ziRo(q) !== z) continue; s += w; k++; }
  return { zi: z, nZi: k + 1, fataDeZi: k ? v - s / k : null, medieZi: k ? s / k : null };
}
// pentru evaluarea de pe Discord (ev = Comportament.evalueaza): adaugă axele pe ev; dv = reguliDovezi(...)
export function cuAxe(ev, dv, toate, P) {
  const t = (ev && ev.t) || {}, id = String(t.id), b = dv && dv.peBot ? dv.peBot.get(id) : null, z = b || ziuaDirect(t, toate);
  const extra = (b ? b.atinse : []).filter((c) => c === "dupaProasta" || c === "treiLaRand" || c === "ore6");
  if (!b) { const m = (nr(t.inchis) - nr(t.pornit)) / MIN; if (m > ORE_LUNGI * 60) extra.push("ore6"); }
  const rele = (ev.decizii || []).filter((d) => !d.ok).map((d) => d.cod);
  ev.fataDeZi = z.fataDeZi === null ? null : r2(z.fataDeZi); ev.medieZi = z.medieZi === null ? null : r2(z.medieZi); ev.nZi = z.nZi; ev.ziPornire = z.zi;
  ev.reguliAtinse = atinseDin(rele, extra, dv && dv.stari, P || {});
  ev.eticheta2 = eticheta2(Number(ev.net) || 0, ev.fataDeZi, ev.reguliAtinse);
  ev.dovedite = ev.reguliAtinse.filter((a) => a.stare === "dovedita").length;
  // sfatul: regula încălcată cea mai grea, fără minute (descriere, nu regulă)
  const ordS = ["lichidare", "boti", "banda", "frana"]; ev.sfat2 = ordS.find((c) => rele.includes(c)) || null;
  return ev;
}
// pentru un rând din jurnalul evaluărilor (pagina): x = { id, net, rele }
export function axePeEvaluare(x, dv, toate, P) {
  const id = String(x && x.id), b = dv && dv.peBot ? dv.peBot.get(id) : null, t = b ? null : (Array.isArray(toate) ? toate : []).find((y) => y && String(y.id) === id);
  const z = b || (t ? ziuaDirect(t, toate) : { nZi: null, fataDeZi: null });
  const extra = (b ? b.atinse : []).filter((c) => c === "dupaProasta" || c === "treiLaRand" || c === "ore6"), net = nr(x && x.net) || 0;
  const atinse = atinseDin(Array.isArray(x && x.rele) ? x.rele : [], extra, dv && dv.stari, P || {});
  const fata = z.fataDeZi === null || z.fataDeZi === undefined ? null : r2(z.fataDeZi);
  return { fataDeZi: fata, nZi: z.nZi === undefined ? null : z.nZi, reguliAtinse: atinse.map((a) => ({ cod: a.cod, stare: a.stare })), eticheta2: eticheta2(net, fata, atinse) };
}
