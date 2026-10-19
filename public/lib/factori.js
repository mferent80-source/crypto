// Instrumentele instituționale, partea a doua (v100.178; el 13.10: „fă 1, 2, 3, 4, 5 și vreau exemple de top stocks pe sectoare în Sugestii”).
// Modul PUR (fără DOM, fără rețea), probat în scripts/proba-v100178.mjs. Colectorul îl rulează (tura contului + tura sectoarelor), pagina
// desenează. Lipsa rămâne lipsă (null), niciodată 0; tot ce e aproximare se spune.
//   1. factorii și sectoarele: regresia fiecărei acțiuni pe piață (SPY), firmele mici (IWM − SPY), momentum (MTUM − SPY) și sectorul ei
//      (ETF-ul sectorului − SPY); expunerea contului pe fiecare și concentrarea pe sector / industrie (pragul 40 %);
//   2. atribuirea: cât din randament vine din piață (beta × S&P) și cât din alegeri (alfa); boții: grila, direcția, comisioanele, finanțarea;
//   3. MAE / MFE: cât de jos a coborât și cât de sus a urcat fiecare trade închis înainte de ieșire ⇒ unde ar fi stat stopul / ținta;
//   4. ținta de volatilitate: volatilitatea contului față de țintă (15 % pe an), cât din risc vine din fiecare poziție, mărimea „cu risc egal”;
//   5. mișcarea așteptată de piața de opțiuni (DVOL, Deribit) față de banda gridului;
//   + topul pe sectoare: cele mai tari acțiuni mari din fiecare sector (forța relativă pe 3 și 6 luni, cu trend în sus) și istoricul regulii.
var Factori = (function () {
  "use strict";
  var ZI = 86400000;
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function zi(t) { return new Date(t).toISOString().slice(0, 10); }
  function medie(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function abatere(a) { if (a.length < 2) return null; var m = medie(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)); }
  function cuantila(a, p) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

  // sectoarele Nasdaq (screenerul) ⇒ ETF-ul sectorului și numele în română; „Semiconductors” ca industrie are ETF-ul ei (SMH)
  var SECTOARE = {
    "Technology": { etf: "XLK", n: "Tehnologie" }, "Telecommunications": { etf: "XLC", n: "Comunicații" }, "Health Care": { etf: "XLV", n: "Sănătate" },
    "Finance": { etf: "XLF", n: "Financiar" }, "Real Estate": { etf: "XLRE", n: "Imobiliare" }, "Consumer Discretionary": { etf: "XLY", n: "Consum ciclic" },
    "Consumer Staples": { etf: "XLP", n: "Consum de bază" }, "Industrials": { etf: "XLI", n: "Industrie" }, "Basic Materials": { etf: "XLB", n: "Materiale" },
    "Energy": { etf: "XLE", n: "Energie" }, "Utilities": { etf: "XLU", n: "Utilități" }
  };
  var ETF_FACTORI = ["SPY", "IWM", "MTUM", "SMH"].concat(Object.keys(SECTOARE).map(function (k) { return SECTOARE[k].etf; }));
  function sectorNume(s) { return SECTOARE[s] ? SECTOARE[s].n : s ? String(s) : "necunoscut"; }

  // ---------------- 1. factorii ----------------
  // regresia liniară cu interceptare (ecuațiile normale, eliminare Gauss); X = [[x1, x2, ...], ...]
  function regresie(y, X) {
    var n = y.length, k = X.length ? X[0].length + 1 : 1; if (n < k + 10) return null;
    var A = [], b = [];
    for (var i = 0; i < k; i++) { A.push(new Array(k).fill(0)); b.push(0); }
    for (var r = 0; r < n; r++) { var row = [1].concat(X[r]); for (var p = 0; p < k; p++) { b[p] += row[p] * y[r]; for (var q = 0; q < k; q++) A[p][q] += row[p] * row[q]; } }
    for (var c = 0; c < k; c++) {
      var piv = c; for (var t = c + 1; t < k; t++) if (Math.abs(A[t][c]) > Math.abs(A[piv][c])) piv = t;
      if (Math.abs(A[piv][c]) < 1e-14) return null;
      var tmp = A[c]; A[c] = A[piv]; A[piv] = tmp; var tb = b[c]; b[c] = b[piv]; b[piv] = tb;
      for (var t2 = 0; t2 < k; t2++) { if (t2 === c) continue; var f = A[t2][c] / A[c][c]; for (var q2 = c; q2 < k; q2++) A[t2][q2] -= f * A[c][q2]; b[t2] -= f * b[c]; }
    }
    var beta = b.map(function (v, i) { return v / A[i][i]; }), sst = 0, sse = 0, my = medie(y);
    for (var r2 = 0; r2 < n; r2++) { var row2 = [1].concat(X[r2]), yh = 0; for (var p2 = 0; p2 < k; p2++) yh += beta[p2] * row2[p2]; sse += (y[r2] - yh) * (y[r2] - yh); sst += (y[r2] - my) * (y[r2] - my); }
    return { alfa: beta[0], b: beta.slice(1), r2: sst > 0 ? 1 - sse / sst : null, n: n };
  }
  // factorii unei acțiuni pe zilele comune (cel puțin 60): piața, firmele mici, momentum, sectorul ei (față de piață)
  function factoriActiune(s, f, etfSector, o) {
    o = o || {}; var spy = f.SPY, iwm = f.IWM, mtum = f.MTUM, sec = etfSector ? f[etfSector] : null;
    if (!s || !spy) return null;
    var z = Object.keys(s).filter(function (d) { return spy[d] !== undefined && (!iwm || iwm[d] !== undefined) && (!mtum || mtum[d] !== undefined) && (!sec || sec[d] !== undefined); }).sort().slice(-(o.zile || 250));
    if (z.length < 60) return null;
    var X = z.map(function (d) { var v = [spy[d]]; if (iwm) v.push(iwm[d] - spy[d]); if (mtum) v.push(mtum[d] - spy[d]); if (sec) v.push(sec[d] - spy[d]); return v; });
    var r = regresie(z.map(function (d) { return s[d]; }), X); if (!r) return null;
    var i = 0, out = { piata: r.b[i++], r2: r.r2, n: r.n, alfaZi: r.alfa };
    if (iwm) out.mici = r.b[i++]; if (mtum) out.momentum = r.b[i++]; if (sec) { out.sector = r.b[i++]; out.etf = etfSector; }
    return out;
  }
  // expunerea contului: Σ expunere × beta pe fiecare factor; sectoarele și industriile ca % din acțiuni; concentrarea peste prag
  // e = expunerile acțiunilor [{cheie, nume, simbol, notionalLei, clasa}], info = { simbol: {sector, industrie} }, fb = { cheie: factoriActiune }
  function expunere(e, info, fb, o) {
    o = o || {}; var prag = o.prag || 0.4, act = e.filter(function (x) { return x && x.clasa === "actiuni" && x.notionalLei !== null; }), tot = 0;
    act.forEach(function (x) { tot += Math.abs(x.notionalLei); });
    var fac = { piata: 0, mici: 0, momentum: 0, sector: 0 }, acoperit = 0, sec = {}, ind = {};
    act.forEach(function (x) {
      var f = fb && fb[x.cheie], i = info && info[x.simbol] || {};
      if (f) { acoperit += Math.abs(x.notionalLei); ["piata", "mici", "momentum", "sector"].forEach(function (k) { if (f[k] !== undefined) fac[k] += x.notionalLei * f[k]; }); }
      var s = i.sector || "necunoscut", d = i.industrie || null;
      (sec[s] = sec[s] || { lei: 0, pozitii: [] }).lei += x.notionalLei; sec[s].pozitii.push(x.nume);
      if (d) { (ind[d] = ind[d] || { lei: 0, pozitii: [] }).lei += x.notionalLei; ind[d].pozitii.push(x.nume); }
    });
    var lista = function (m) { return Object.keys(m).map(function (k) { return { nume: k, ro: sectorNume(k), lei: m[k].lei, pondere: tot > 0 ? m[k].lei / tot : null, pozitii: m[k].pozitii, pestePrag: tot > 0 && m[k].lei / tot > prag }; }).sort(function (a, b) { return b.lei - a.lei; }); };
    return { actiuniLei: tot, factori: fac, acoperire: tot > 0 ? acoperit / tot : null, sectoare: lista(sec), industrii: lista(ind), prag: prag };
  }

  // ---------------- 2. atribuirea ----------------
  // seria zilnică {z, r, cap, pnl} față de reper {zi: r}: beta, randamentul „pasiv” (beta × reper, înlănțuit), alfa înlănțuit
  function atribuire(s, rep) {
    var z = (s || []).filter(function (x) { return x && isFinite(x.r) && rep && rep[x.z] !== undefined; }); if (z.length < 40) return null;
    var a = z.map(function (x) { return x.r; }), b = z.map(function (x) { return rep[x.z]; }), ma = medie(a), mb = medie(b), cov = 0, vb = 0;
    for (var i = 0; i < a.length; i++) { cov += (a[i] - ma) * (b[i] - mb); vb += (b[i] - mb) * (b[i] - mb); }
    var beta = vb > 0 ? cov / vb : null; if (beta === null) return null;
    var tu = 1, pas = 1, alfa = 1; z.forEach(function (x, i) { tu *= 1 + a[i]; pas *= 1 + beta * b[i]; alfa *= 1 + a[i] - beta * b[i]; });
    return { n: z.length, de: z[0].z, pana: z[z.length - 1].z, beta: beta, tu: tu - 1, pasiv: pas - 1, alfa: alfa - 1, reper: z.reduce(function (c, x) { return c * (1 + rep[x.z]); }, 1) - 1 };
  }
  // boții închiși (JurnalTrade.din): realizatul Pionex = grila + direcția (fără costuri); netul = realizatul + comisioanele + finanțarea
  function descompunereBoti(trades, de) {
    var o = { n: 0, grila: 0, directie: 0, comisioane: 0, finantare: 0, net: 0, investitMediu: null }, inv = [];
    (trades || []).forEach(function (t) {
      if (!t || !(t.inchis >= (de || 0)) || nr(t.rezultat) === null) return;
      var g = nr(t.grile) || 0, c = nr(t.comisioane) || 0, f = nr(t.funding) || 0;
      o.n++; o.grila += g; o.directie += t.rezultat - g; o.comisioane += c; o.finantare += f; o.net += t.rezultat + c + f; if (nr(t.pus || t.investit) > 0) inv.push(nr(t.pus || t.investit));
    });
    o.investitMediu = inv.length ? medie(inv) : null;
    return o;
  }

  // ---------------- 3. MAE / MFE ----------------
  // fiecare trade închis (T212.perechi().inchise): cât de jos (MAE) și cât de sus (MFE) a fost prețul între cumpărare și vânzare, față de
  // prețul de cumpărare, din barele zilnice (l / h); ziua cumpărării și a vânzării intră (nu știm ora exactă ⇒ aproximare spusă)
  function maeMfe(inchise, bare, o) {
    o = o || {}; var out = [];
    (inchise || []).forEach(function (t) {
      var b = bare && bare[t.ticker], pc = nr(t.pretCumparare), pv = nr(t.pretVanzare);
      if (!b || !b.length || !(pc > 0) || !(pv > 0) || !(t.pornit > 0) || !(t.inchis > t.pornit) || (o.de && t.inchis < o.de)) return;
      var z0 = zi(t.pornit), z1 = zi(t.inchis), lo = Infinity, hi = -Infinity, n = 0;
      b.forEach(function (x) { var z = zi(x.t); if (z >= z0 && z <= z1) { lo = Math.min(lo, nr(x.l) > 0 ? x.l : x.c); hi = Math.max(hi, nr(x.h) > 0 ? x.h : x.c); n++; } });
      if (!n) return;
      // potrivirea prețurilor (split / alt simbol): închiderea zilei de cumpărare trebuie să semene cu prețul plătit
      if (Math.abs(lo / pc - 1) > 0.9 || Math.abs(hi / pc - 1) > 5) return;
      out.push({ ticker: t.ticker, id: t.id, simbol: t.simbol, pornit: t.pornit, inchis: t.inchis, cost: nr(t.cost), rezultat: nr(t.rezultat), rez: pv / pc - 1, mae: Math.min(0, lo / pc - 1), mfe: Math.max(0, hi / pc - 1), zile: n });   // v100.179: + id / date / cost (lecția săptămânii)
    });
    var castig = out.filter(function (x) { return x.rez > 0; }), pierd = out.filter(function (x) { return x.rez <= 0; });
    // stopul care ar fi păstrat 80 % din câștigători (cuantila de 20 % a MAE-ului lor) și câte pierderi le-ar fi tăiat mai devreme
    // audit 19.10 (5): economia e NETĂ și măsurată pe ACELEAȘI trade-uri pe care s-a ales stopul (în eșantion, deci optimistă): orice trade atins
    // (MAE ≤ stop) ar fi ieșit la stop - pierderile mai mari decât stopul salvează (stop − rez), câștigătorii opriți și pierderile mai mici costă
    // (rez − stop). Netul ≤ 0 ⇒ stopul nu se propune (stopSugerat = null: gărzile și lecția rămân pe pragul implicit, spus pe față).
    var cand = castig.length >= 10 ? cuantila(castig.map(function (x) { return x.mae; }), 0.2) : null;
    var taiate = cand !== null ? pierd.filter(function (x) { return x.mae <= cand && x.rez < cand; }) : [];
    var costate = cand !== null ? out.filter(function (x) { return x.mae <= cand && taiate.indexOf(x) < 0; }) : [];
    var sumF = function (l, f) { return l.reduce(function (s, x) { return s + f(x); }, 0); }, cuBani = taiate.concat(costate).every(function (x) { return x.cost > 0; });
    var salvat = sumF(taiate, function (x) { return cand - x.rez; }), costat = sumF(costate, function (x) { return x.rez - cand; });
    var salvatBani = cuBani ? sumF(taiate, function (x) { return (cand - x.rez) * x.cost; }) : null, costatBani = cuBani ? sumF(costate, function (x) { return (x.rez - cand) * x.cost; }) : null;
    var stop = cand !== null && salvat - costat > 0 ? cand : null;
    return { n: out.length, castig: castig.length, pierd: pierd.length,
      maeCastig: castig.length ? cuantila(castig.map(function (x) { return x.mae; }), 0.5) : null, maePierd: pierd.length ? cuantila(pierd.map(function (x) { return x.mae; }), 0.5) : null,
      mfePierd: pierd.length ? cuantila(pierd.map(function (x) { return x.mfe; }), 0.5) : null, mfeCastig: castig.length ? cuantila(castig.map(function (x) { return x.mfe; }), 0.5) : null,
      lasatPeMasa: castig.length ? cuantila(castig.map(function (x) { return x.mfe - x.rez; }), 0.5) : null,
      pierdDupaPlus5: pierd.filter(function (x) { return x.mfe >= 0.05; }).length,
      stopSugerat: stop, stopCandidat: cand, taiatePierderi: taiate.length, castigTaiat: cand !== null ? castig.filter(function (x) { return x.mae <= cand; }).length : null,
      economie: taiate.length ? medie(taiate.map(function (x) { return cand - x.rez; })) : null,
      salvat: cand !== null ? salvat : null, costat: cand !== null ? costat : null, economieNeta: cand !== null ? salvat - costat : null,
      salvatBani: cand !== null ? salvatBani : null, costatBani: cand !== null ? costatBani : null, netBani: cand !== null && cuBani ? salvatBani - costatBani : null, inEsantion: cand !== null, trades: out };
  }

  // ---------------- 4. ținta de volatilitate ----------------
  // volatilitatea contului (pe zile de bursă) față de țintă; contribuția fiecărei poziții la risc (cov cu P&L-ul contului / σ)
  function tintaVol(pnl, total, tinta, folosite, serii) {
    var v = (pnl || []).map(function (x) { return Array.isArray(x) ? x[1] : x.pnl; }).filter(function (x) { return isFinite(x); });
    if (v.length < 40 || !(total > 0)) return null;
    var sd = abatere(v), anual = sd * Math.sqrt(252) / total, t = tinta || 0.15;
    var contrib = [];
    if (folosite && serii) {
      var z = (pnl || []).map(function (x) { return Array.isArray(x) ? x[0] : x.z; }), mp = medie(v);
      folosite.forEach(function (x) {
        var s = serii[x.cheie]; if (!s) return;
        var cov = 0, n = 0; z.forEach(function (d, i) { var r = s[d]; if (r === undefined) return; cov += (x.notionalLei * r) * (v[i] - mp); n++; });
        if (n > 20) contrib.push({ nume: x.nume, lei: cov / (n - 1) / sd, pondere: null });
      });
      var sum = contrib.reduce(function (a, c) { return a + c.lei; }, 0); contrib.forEach(function (c) { c.pondere = sum !== 0 ? c.lei / sum : null; });
      contrib.sort(function (a, b) { return b.lei - a.lei; });
    }
    return { volAnual: anual, tinta: t, factor: anual > 0 ? t / anual : null, sdZiLei: sd, contrib: contrib };
  }
  // mărimea „cu risc egal”: poziția nouă aduce în cont cât o parte egală din ținta de volatilitate (presupunând poziții independente - spus)
  function marimeVol(sigmaZi, total, tinta, nPoz) {
    if (!(sigmaZi > 0) || !(total > 0)) return null;
    var tZi = (tinta || 0.15) / Math.sqrt(252) * total, k = Math.max(1, (nPoz || 0) + 1);
    return { lei: tZi / Math.sqrt(k) / sigmaZi, tintaZiLei: tZi, pozitii: k };
  }
  function sigmaZi(bare, n) { var c = (bare || []).map(function (b) { return b.c; }).filter(function (x) { return x > 0; }).slice(-((n || 60) + 1)), r = []; for (var i = 1; i < c.length; i++) r.push(c[i] / c[i - 1] - 1); return r.length >= 20 ? abatere(r) : null; }

  // ---------------- 5. mișcarea așteptată de opțiuni ----------------
  // DVOL = volatilitatea anuală implicită (procente); pe h zile: ±DVOL × √(h / 365) (o abatere standard, ~68 % din cazuri)
  function miscareAsteptata(dvol, zile) { return dvol > 0 ? dvol / 100 * Math.sqrt((zile || 1) / 365) : null; }
  // moneda gridului: DVOL-ul BTC (sau ETH) scalat cu raportul volatilităților trecute (moneda / BTC, pe 30 de zile) - aproximare spusă
  function gridFataDeOptiuni(o) {
    var d = nr(o.dvol), rv = nr(o.raportVol) || 1, p = nr(o.pret), jos = nr(o.jos), sus = nr(o.sus);
    if (!(d > 0) || !(p > 0) || !(jos > 0) || !(sus > jos)) return null;
    var dvolMoneda = d * rv, m1 = miscareAsteptata(dvolMoneda, 1), m7 = miscareAsteptata(dvolMoneda, 7), jumJos = 1 - jos / p, jumSus = sus / p - 1, jum = Math.min(jumJos, jumSus);
    return { dvol: d, dvolMoneda: dvolMoneda, zi: m1, saptamana: m7, jumatate: jum, zilePanaLaMargine: m1 > 0 ? Math.pow(jum / m1, 2) : null, maiIngust: jum < m7 };
  }

  // ---------------- topul pe sectoare ----------------
  function ema(c, n) { var k = 2 / (n + 1), e = null, out = []; for (var i = 0; i < c.length; i++) { e = e === null ? c[i] : c[i] * k + e * (1 - k); out.push(i >= n - 1 ? e : null); } return out; }
  // scorul unei acțiuni la ziua i: randamentul pe 63 / 126 de zile, trendul (închiderea > EMA50 > EMA200), distanța față de maximul pe 252 de zile
  function stareLa(b, i) {
    if (i < 252) return null;
    var c = b.map(function (x) { return x.c; }), e50 = ema(c.slice(0, i + 1), 50), e200 = ema(c.slice(0, i + 1), 200), hi = Math.max.apply(null, c.slice(i - 251, i + 1));
    return { r3: c[i] / c[i - 63] - 1, r6: c[i] / c[i - 126] - 1, trend: c[i] > e50[i] && e50[i] > e200[i], max52: c[i] / hi - 1, pret: c[i] };
  }
  // regula (fixată înainte de cifre): în fiecare sector, acțiunile cu trend în sus, ordonate după forța relativă = media rangului pe 3 și pe 6
  // luni față de celelalte din sector; primele `n`
  function topSector(lista, n) {
    var l = lista.filter(function (x) { return x.st && x.st.trend; }); if (!l.length) return [];
    var rang = function (k) { var s = l.slice().sort(function (a, b) { return a.st[k] - b.st[k]; }); s.forEach(function (x, i) { x["rg" + k] = s.length > 1 ? i / (s.length - 1) : 1; }); };
    rang("r3"); rang("r6");
    var med3 = cuantila(lista.filter(function (x) { return x.st; }).map(function (x) { return x.st.r3; }), 0.5), med6 = cuantila(lista.filter(function (x) { return x.st; }).map(function (x) { return x.st.r6; }), 0.5);
    return l.map(function (x) { return { s: x.s, nume: x.nume, scor: (x.rgr3 + x.rgr6) / 2, r3: x.st.r3, r6: x.st.r6, peste3: x.st.r3 - med3, peste6: x.st.r6 - med6, max52: x.st.max52, pret: x.st.pret, cap: x.cap }; })
      .sort(function (a, b) { return b.scor - a.scor; }).slice(0, n || 3);
  }
  // univers = [{s, nume, sector, cap}], bare = { s: [{t, c}] } ⇒ { sector: [top] } pe ultima zi comună
  function topSectoare(univers, bare, o) {
    o = o || {}; var gr = {};
    (univers || []).forEach(function (u) { if (!SECTOARE[u.sector]) return; var b = bare && bare[u.s]; if (!b || b.length < 260) return; (gr[u.sector] = gr[u.sector] || []).push({ s: u.s, nume: u.nume, cap: u.cap, st: stareLa(b, b.length - 1) }); });
    var out = {}; Object.keys(gr).forEach(function (s) { out[s] = { ro: sectorNume(s), etf: SECTOARE[s].etf, n: gr[s].length, top: topSector(gr[s], o.n || 3) }; });
    return out;
  }
  // istoricul regulii, lunar (la 21 de zile de bursă): topul de atunci (doar date de până atunci) ținut 21 de zile, față de media sectorului
  // ⚠ universul e cel de AZI (firmele mari de acum) ⇒ istoricul e optimist (supraviețuire) - se spune pe pagină
  function istoricRegula(univers, bare, o) {
    o = o || {}; var gr = {}, rez = [];
    (univers || []).forEach(function (u) { if (SECTOARE[u.sector] && bare[u.s] && bare[u.s].length >= 300) (gr[u.sector] = gr[u.sector] || []).push(u); });
    var lung = Math.min.apply(null, Object.keys(gr).map(function (s) { return Math.min.apply(null, gr[s].map(function (u) { return bare[u.s].length; })); }).concat([600]));
    for (var i = 252; i + 21 < lung; i += 21) {
      var dif = [];
      Object.keys(gr).forEach(function (s) {
        var l = gr[s].map(function (u) { var b = bare[u.s].slice(-lung); return { s: u.s, b: b, st: stareLa(b, i) }; }).filter(function (x) { return x.st; });
        if (l.length < 5) return;
        var top = topSector(l.map(function (x) { return { s: x.s, st: x.st }; }), o.n || 3).map(function (x) { return x.s; }), dupa = function (x) { return x.b[i + 21].c / x.b[i].c - 1; };
        var tR = l.filter(function (x) { return top.indexOf(x.s) >= 0; }).map(dupa), mR = medie(l.map(dupa));
        if (tR.length) dif.push(medie(tR) - mR);
      });
      if (dif.length) rez.push(medie(dif));
    }
    return { luni: rez.length, medie: rez.length ? medie(rez) : null, luniPlus: rez.filter(function (x) { return x > 0; }).length, n: rez.length };
  }

  return { SECTOARE: SECTOARE, ETF_FACTORI: ETF_FACTORI, sectorNume: sectorNume, regresie: regresie, factoriActiune: factoriActiune, expunere: expunere,
    atribuire: atribuire, descompunereBoti: descompunereBoti, maeMfe: maeMfe, tintaVol: tintaVol, marimeVol: marimeVol, sigmaZi: sigmaZi,
    miscareAsteptata: miscareAsteptata, gridFataDeOptiuni: gridFataDeOptiuni, stareLa: stareLa, topSector: topSector, topSectoare: topSectoare, istoricRegula: istoricRegula, cate: cate };
})();
