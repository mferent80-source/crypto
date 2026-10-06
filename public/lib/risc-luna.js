// v100.113 (el, 06.10: „în Tablou să-mi spună despre bot sau stock probabilități, iar în pagina din meniu tot ce poate · îi numeri tu ·
// fă explicit, așa aflu dacă am un comportament greșit — pentru boți și pentru stock”): riscul pe datele LUI, modul PUR (fără DOM, fără rețea).
// Colectorul îl rulează o dată pe noapte (arhiva boților + istoricul T212) și trimite raportul la /api/istoric-bot?action=risc; paginile citesc.
// Regula statistică (fixată înainte de rezultate, ca I-530 / I-545): dovedit = IC 95% al diferenței de medie (bootstrap pe monede / acțiuni)
// fără 0 ȘI același semn în ambele jumătăți de timp; altfel „nedovedit” (nu „fără efect”). Planul: docs/superpowers/plans/2026-10-06-riscul-…
var RiscLuna = (function () {
  "use strict";
  var ZI = 864e5, ORA = 36e5, LUNA = 30 * ZI, MARE = -0.05;
  function nr(v) { if (v === null || v === undefined || v === "") return NaN; var x = Number(v); return isFinite(x) ? x : NaN; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (k !== 0 && (r === 0 || r >= 20) ? " de " : " ") + pl; }
  var v1 = function (x) { var p = Math.abs(x).toFixed(1).split("."); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; };   /* mii cu punct: 5.175,0 lei */
  var semn1 = function (x) { var r = Math.round(x * 10) / 10; return (r < 0 ? "−" : r > 0 ? "+" : "") + v1(r); };
  var pct = function (x) { return Math.round(x * 100) + "%"; };
  // mulberry32, ca Asemanatoare / GridJurnal (lecția Busolei, 04.10: un LCG pe numere zecimale pierde precizia și se repetă după ~10.000 de trageri)
  function generator(seed) { var a = (Number(seed) >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function median(v) { v = v.filter(function (x) { return isFinite(x); }).slice().sort(function (a, b) { return a - b; }); if (!v.length) return null; var m = Math.floor(v.length / 2); return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
  function medie(l, camp) { camp = camp || "r"; var s = 0; for (var i = 0; i < l.length; i++) s += l[i][camp]; return l.length ? s / l.length : null; }

  // ---------------- boții ----------------
  // arhiva Pionex compactată (/api/istoric-bot?action=botiInchisi) ⇒ un rând pe bot futures_grid cu sumă; o = { de, levMax }
  function unBot(b) {
    var d = b && b.buOrderData || {}, inv = nr(d.usdtInvestment), p = nr(d.totalRealizedProfit);
    if (!b || b.buOrderType !== "futures_grid" || !(inv > 0) || !isFinite(p) || !(b.createTime > 0) || !(b.closeTime > 0)) return null;
    return { t: b.createTime, inchis: b.closeTime, ore: (b.closeTime - b.createTime) / ORA, r: p / inv, m: String(b.base || "").replace(/\.PERP$/, ""), dir: String(d.trend || "").toLowerCase(),
      lev: nr(d.leverage), inv: inv, fee: nr(d.totalFee) || 0, grid: nr(d.gridProfit) || 0, fund: nr(d.totalFundingFee) || 0, stop: nr(d.lossStop) > 0, extra: nr(d.extraMargin) > 0,
      jos: nr(d.bottom), sus: nr(d.top), init: nr(d.initPrice), pretInchis: nr(d.closedPrice) };
  }
  function bazinBoti(boti, o) {
    o = o || {}; var de = nr(o.de) || 0, lm = nr(o.levMax);
    return (Array.isArray(boti) ? boti : []).map(unBot).filter(function (x) { return x && x.inchis >= de && (!isFinite(lm) || (x.lev > 0 && x.lev <= lm)); })
      .sort(function (a, b) { return a.t - b.t; });
  }
  // ritmul LUI: câți boți / episoade în ultimele 30 de zile și suma tipică (mediana); fără niciunul ⇒ ultimii 20
  function ritm(l, acum, camp) {
    camp = camp || "inv"; var rec = l.filter(function (x) { return x.t >= acum - LUNA && x.t <= acum; });
    var baza = rec.length ? rec : l.slice(-20), S = median(baza.map(function (x) { return x[camp]; }));
    return { K: Math.max(1, rec.length), S: S === null ? 45 : S, n30: rec.length };
  }
  // o lună = K rezultate × S, trase dintr-o fereastră REALĂ de 30 de zile (aceeași piață pentru toți) - fără ferestre cu destule, din tot bazinul
  function monteCarlo(l, o) {
    o = o || {}; var K = Math.max(1, Math.round(nr(o.K) || 1)), S = nr(o.S) || 1, n = Math.max(100, Math.round(nr(o.n) || 20000)), minF = o.minFereastra || 20, rnd = generator(o.seed || 558);
    var items = l.filter(function (x) { return isFinite(x.r) && x.t > 0; }).sort(function (a, b) { return a.t - b.t; }), fer = [];
    if (!items.length) return null;   // revizia (R9): fără rezultate nu e nimic de simulat (nu excepție)
    if (items.length) { var j0 = 0, j1 = 0; for (var st = items[0].t; st <= items[items.length - 1].t - LUNA; st += ZI) { while (j0 < items.length && items[j0].t < st) j0++; while (j1 < items.length && items[j1].t < st + LUNA) j1++; if (j1 - j0 >= minF) fer.push([j0, j1]); } }
    var legat = fer.length > 0, v = new Array(n);
    for (var i = 0; i < n; i++) { var a = 0, b = items.length; if (legat) { var f = fer[Math.floor(rnd() * fer.length)]; a = f[0]; b = f[1]; } var s = 0; for (var k = 0; k < K; k++) s += items[a + Math.floor(rnd() * (b - a))].r * S; v[i] = s; }
    v.sort(function (p, q) { return p - q; });
    var pc = function (p) { return v[Math.min(n - 1, Math.floor(p * n))]; }, lo = pc(0.005), hi = pc(0.995); if (!(hi > lo)) hi = lo + 1e-9;
    var nb = 28, w = (hi - lo) / nb, h = []; for (var q = 0; q < nb; q++) h.push(0);
    for (var z = 0; z < n; z++) { if (v[z] < lo || v[z] > hi) continue; h[Math.min(nb - 1, Math.floor((v[z] - lo) / w))]++; }
    var minus = 0; for (var y = 0; y < n; y++) if (v[y] < 0) minus++;
    return { K: K, S: S, n: n, legat: legat, ferestre: fer.length, med: pc(0.5), p5: pc(0.05), p1: pc(0.01), p95: pc(0.95), pMinus: minus / n, hist: { lo: lo, hi: hi, w: w, h: h } };
  }
  // din cele care au AJUNS la fiecare prag (ore la boți, zile la acțiuni): câte pe plus, câte cu pierdere mare, media - pentru „stă deja de X”
  function supravietuire(l, praguri, camp) {
    return praguri.map(function (h) { var s = l.filter(function (x) { return x[camp] >= h; }); if (!s.length) return { h: h, n: 0, pePlus: null, mari: null, medie: null };
      return { h: h, n: s.length, pePlus: s.filter(function (x) { return x.r > 0; }).length / s.length, mari: s.filter(function (x) { return x.r <= MARE; }).length / s.length, medie: medie(s) }; });
  }
  function pragulAtins(s, durata) { var p = null; (s || []).forEach(function (x) { if (x.n > 0 && x.h <= durata) p = x; }); return p; }

  // verdictul unui obicei (CU vs FĂRĂ), după regula fixată; grupuri = monede / acțiuni (cheia)
  function verdict(l, test, o) {
    var cu = l.filter(function (x) { return test(x) === true; }), fara = l.filter(function (x) { return test(x) === false; }), min = o.min || 30;
    var baza = { cu: cu.length, fara: fara.length, medieCu: cu.length ? medie(cu) : null, medieFara: fara.length ? medie(fara) : null,
      mariCu: cu.length ? cu.filter(function (x) { return x.r <= MARE; }).length / cu.length : null, mariFara: fara.length ? fara.filter(function (x) { return x.r <= MARE; }).length / fara.length : null,
      banCu: cu.reduce(function (s, x) { return s + x.r * o.S(x); }, 0), banFara: fara.reduce(function (s, x) { return s + x.r * o.S(x); }, 0) };
    if (cu.length < min || fara.length < min) return Object.assign(baza, { stare: o.putini });
    var dif = baza.medieCu - baza.medieFara, gr = {}, chei = [];
    l.forEach(function (x) { var k = x[o.cheie]; if (!gr[k]) { gr[k] = []; chei.push(k); } gr[k].push(x); });
    var rnd = generator(o.seed), d = [];
    for (var i = 0; i < o.reps; i++) { var sa = 0, na = 0, sb = 0, nb = 0; for (var j = 0; j < chei.length; j++) { var g = gr[chei[Math.floor(rnd() * chei.length)]]; for (var q = 0; q < g.length; q++) { var t = test(g[q]); if (t === true) { sa += g[q].r; na++; } else if (t === false) { sb += g[q].r; nb++; } } } if (na && nb) d.push(sa / na - sb / nb); }
    d.sort(function (p, q) { return p - q; }); var cuant = function (p) { return d[Math.min(d.length - 1, Math.floor(p * d.length))]; };
    var ic = d.length ? [cuant(0.025), cuant(0.975)] : [null, null], ic99 = d.length ? [cuant(0.005), cuant(0.995)] : [null, null];
    var tm = median(l.map(function (x) { return x[o.timp]; })), jum = function (f) { var a = cu.filter(function (x) { return f(x[o.timp]); }), b = fara.filter(function (x) { return f(x[o.timp]); }); return a.length >= 5 && b.length >= 5 ? medie(a) - medie(b) : null; };
    var d1 = jum(function (t) { return t < tm; }), d2 = jum(function (t) { return t >= tm; });
    // revizia (R1): cu IC 95% regula dădea „dovedit” pe date amestecate în 7–12% din cazuri ⇒ dovedit = IC 99%; IC 95% singur = „la limită”
    var jum2 = d1 !== null && d2 !== null && Math.sign(d1) === Math.sign(dif) && Math.sign(d2) === Math.sign(dif), sens = dif < 0 ? "rau" : "bun";
    var dov = jum2 && ic99[0] !== null && (ic99[0] > 0 || ic99[1] < 0), lim = !dov && jum2 && ic[0] !== null && (ic[0] > 0 || ic[1] < 0);
    return Object.assign(baza, { dif: dif, ic: ic, ic99: ic99, d1: d1, d2: d2, stare: dov ? "dovedit-" + sens : lim ? "la-limita-" + sens : "nedovedit" });
  }
  var OBICEIURI_BOTI = [["O1", "Stop pus"], ["O2", "Marjă adăugată pe drum"], ["O3", "Levier peste 3×"], ["O4", "Banda sub 10%"], ["O5", "Pornit în partea grea a benzii"],
    ["O6", "Pornit la ≤ 30 min după un bot pe minus"], ["O7", "Suma mărită după o pierdere"], ["O8", "Prima oară pe moneda asta"], ["O9", "Short"]];
  // obiceiurile la boți (lista închisă); boti = arhiva întreagă (cele de dinainte de `de` contează pentru „prima oară” / „după o pierdere”)
  function comportamentBoti(boti, o) {
    o = o || {}; var de = nr(o.de) || 0, S = nr(o.S) || 45, toti = bazinBoti(boti, {}), vazute = {}, l = [];
    for (var i = 0; i < toti.length; i++) {
      var b = toti[i], nou = !vazute[b.m]; vazute[b.m] = 1;
      if (b.inchis < de) continue;
      var dupaPierdere = false, prev = null;
      // revizia (R2): „după o pierdere” = ultimul bot ÎNCHIS înainte de pornire (pierderea se știa), nu ultimul pornit (putea fi încă deschis)
      for (var j = i - 1; j >= 0 && toti[j].t > b.t - 40 * ZI; j--) { var x = toti[j]; if (x.inchis <= b.t) { if (!prev || x.inchis > prev.inchis) prev = x; if (x.inchis > b.t - 30 * 60000 && x.r < 0) dupaPierdere = true; } }
      var poz = b.sus > b.jos && b.init > 0 ? (b.init - b.jos) / (b.sus - b.jos) : null;
      l.push(Object.assign({}, b, { O1: b.stop, O2: b.extra, O3: b.lev > 3, O4: b.sus > b.jos ? b.sus / b.jos - 1 < 0.1 : null, O5: poz === null ? null : b.dir === "long" ? poz < 0.3 : b.dir === "short" ? poz > 0.7 : null,
        O6: dupaPierdere, O7: !!(prev && prev.r < 0 && b.inv >= 1.5 * prev.inv), O8: nou, O9: b.dir === "short" }));
    }
    return OBICEIURI_BOTI.map(function (ob, k) { return Object.assign({ k: ob[0], nume: ob[1] }, verdict(l, function (x) { return x[ob[0]]; }, { min: 30, putini: "prea puțini", cheie: "m", timp: "t", reps: o.reps || 2000, seed: (o.seed || 4) + k, S: function () { return S; } })); });
  }
  // descrierea boților (bani reali + la suma de azi): comisioanele, cât au stat, coada, lunile
  function descBoti(l, S) {
    var bani = { grile: 0, comisioane: 0, funding: 0, realizat: 0 }; l.forEach(function (x) { bani.grile += x.grid; bani.comisioane += x.fee; bani.funding += x.fund; bani.realizat += x.r * x.inv; });
    var rs = l.map(function (x) { return x.r; }).sort(function (a, b) { return a - b; }), prag = rs.length ? rs[Math.floor(0.1 * rs.length)] : null;
    var coada = l.filter(function (x) { return x.r <= prag; }), rest = l.filter(function (x) { return x.r > prag; }), peMon = {};
    coada.forEach(function (x) { peMon[x.m] = (peMon[x.m] || 0) + x.r * S; });
    var DUR = [[0, 0.25], [0.25, 1], [1, 4], [4, 24], [24, 72], [72, Infinity]], luni = {};
    l.forEach(function (x) { var m = new Date(x.t).toISOString().slice(0, 7); (luni[m] = luni[m] || []).push(x); });
    var B = [-Infinity, -0.5, -0.2, -0.1, -0.05, -0.02, 0, 0.02, 0.05, 0.1, Infinity], dh = [], ds = []; for (var i = 0; i < B.length - 1; i++) { dh.push(0); ds.push(0); }
    rs.forEach(function (r) { var i = 0; while (r >= B[i + 1]) i++; dh[i]++; ds[i] += r * S; });
    return { n: l.length, monede: Object.keys(l.reduce(function (o, x) { o[x.m] = 1; return o; }, {})).length, pePlus: l.filter(function (x) { return x.r > 0; }).length / (l.length || 1), medianR: median(rs), medieR: medie(l), bani: bani,
      comisioaneLaS: l.reduce(function (s, x) { return s + x.fee / x.inv * S; }, 0), grileLaS: l.reduce(function (s, x) { return s + x.grid / x.inv * S; }, 0), realizatLaS: l.reduce(function (s, x) { return s + x.r * S; }, 0),
      coada: { prag: prag, n: coada.length, laS: coada.reduce(function (s, x) { return s + x.r * S; }, 0), restLaS: rest.reduce(function (s, x) { return s + x.r * S; }, 0), monede: Object.keys(peMon).map(function (m) { return [m, peMon[m]]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 6) },
      durate: DUR.map(function (d) { var s = l.filter(function (x) { return x.ore >= d[0] && x.ore < d[1]; }); return { de: d[0], pana: isFinite(d[1]) ? d[1] : null, n: s.length, medie: s.length ? medie(s) : null, pePlus: s.length ? s.filter(function (x) { return x.r > 0; }).length / s.length : null, laS: s.reduce(function (a, x) { return a + x.r * S; }, 0), comisionLaS: s.reduce(function (a, x) { return a + x.fee / x.inv * S; }, 0) }; }),
      luni: Object.keys(luni).sort().map(function (m) { var s = luni[m], mari = s.filter(function (x) { return x.r <= MARE; }); return { m: m, n: s.length, pePlus: s.filter(function (x) { return x.r > 0; }).length, laS: s.reduce(function (a, x) { return a + x.r * S; }, 0), mari: mari.length, mariLaS: mari.reduce(function (a, x) { return a + x.r * S; }, 0) }; }),
      dist: { b: B.map(function (x) { return isFinite(x) ? x : null; }), h: dh, s: ds } };
  }

  // ---------------- acțiunile (T212) ----------------
  // episod = o acțiune de la prima cumpărare până când poziția ajunge la zero; A1 cumpărare sub costul mediu cât era pe minus, A2 suma ≥ 1,5× după
  // un episod pe minus, A3 scurt (≤ 5 zile). ⇒ { inchise (după final), deschise (cu A1 și start) }
  function episoade(u) {
    var l = (Array.isArray(u) ? u : []).filter(function (x) { return x && x.ticker && x.qty > 0 && isFinite(nr(x.net)); }).slice().sort(function (a, b) { return (a.t - b.t) || (a.side === b.side ? 0 : a.side === "BUY" ? -1 : 1); }), d = {}, inch = [];   /* revizia (R3): la aceeași oră, întâi cumpărarea (PLTR 05.11.2025) */
    l.forEach(function (x) {
      var e = d[x.ticker];
      if (x.side === "BUY") {
        if (!e) e = d[x.ticker] = { ticker: x.ticker, simbol: x.simbol || x.ticker, start: x.t, qty: 0, cost: 0, pus: 0, incasat: 0, A1: false };
        if (e.qty > 1e-9 && x.net / x.qty < e.cost / e.qty * 0.995) e.A1 = true;
        e.qty += x.qty; e.cost += x.net; e.pus += x.net;
      } else if (e) {
        var parte = Math.min(1, x.qty / e.qty); e.cost -= e.cost * parte; e.qty -= x.qty; e.incasat += x.net;
        if (e.qty <= 1e-6) { e.final = x.t; e.rez = e.incasat - e.pus; e.pct = e.rez / e.pus; e.r = e.pct; e.zile = (e.final - e.start) / ZI; e.t = e.start; inch.push(e); delete d[x.ticker]; }
      }
    });
    inch.sort(function (a, b) { return a.final - b.final; });
    inch.forEach(function (e) { var prev = null; for (var i = inch.length - 1; i >= 0; i--) if (inch[i].final < e.start) { prev = inch[i]; break; } e.A2 = !!(prev && prev.rez < 0 && e.pus >= 1.5 * prev.pus); e.A3 = e.zile <= 5; });
    return { inchise: inch, deschise: Object.keys(d).map(function (k) { var e = d[k]; return { ticker: e.ticker, simbol: e.simbol, start: e.start, qty: e.qty, cost: e.cost, pus: e.pus, A1: e.A1 }; }) };
  }
  var OBICEIURI_ACT = [["A1", "Ai cumpărat la preț mai mic pe o poziție pe minus"], ["A2", "Suma mărită după o pierdere"], ["A3", "Episod scurt (cel mult 5 zile)"]];
  function comportamentActiuni(ep, o) {
    o = o || {}; var l = (ep || []).map(function (e) { return Object.assign({}, e, { r: e.pct, t: e.final }); });
    return OBICEIURI_ACT.map(function (ob, k) { return Object.assign({ k: ob[0], nume: ob[1] }, verdict(l, function (x) { return !!x[ob[0]]; }, { min: 20, putini: "prea puține", cheie: "ticker", timp: "t", reps: o.reps || 2000, seed: (o.seed || 7) + k, S: function (x) { return x.pus; } })); });
  }
  function descActiuni(tr, ep) {
    tr = tr || []; ep = ep || [];
    var c = tr.filter(function (x) { return x.rezultat > 0; }), p = tr.filter(function (x) { return x.rezultat < 0; }), mari = ep.filter(function (x) { return x.pct <= MARE; });
    var DUR = [[0, 1], [1, 5], [5, 20], [20, 60], [60, Infinity]];
    return { tranzactii: tr.length, episoade: ep.length, actiuni: Object.keys(ep.reduce(function (o, x) { o[x.ticker] = 1; return o; }, {})).length, pePlus: tr.length ? c.length / tr.length : null,
      castigMediu: c.length ? c.reduce(function (s, x) { return s + x.pct; }, 0) / c.length : null, pierdereMedie: p.length ? p.reduce(function (s, x) { return s + x.pct; }, 0) / p.length : null,
      castigLei: c.reduce(function (s, x) { return s + x.rezultat; }, 0), pierdereLei: p.reduce(function (s, x) { return s + x.rezultat; }, 0),
      zileCastig: median(c.map(function (x) { return x.durataOre / 24; })), zilePierdere: median(p.map(function (x) { return x.durataOre / 24; })),
      comisioane: tr.reduce(function (s, x) { return s + (x.comisioane || 0); }, 0), rezultat: tr.reduce(function (s, x) { return s + x.rezultat; }, 0), oficial: tr.reduce(function (s, x) { return s + (x.rezultatOficial || 0); }, 0),
      maiRele: tr.slice().sort(function (a, b) { return a.rezultat - b.rezultat; }).slice(0, 5).map(function (x) { return { s: x.simbol, lei: x.rezultat, pct: x.pct, zile: x.durataOre / 24 }; }),
      mari: { n: mari.length, lei: mari.reduce(function (s, x) { return s + x.rez; }, 0), restLei: ep.filter(function (x) { return x.pct > MARE; }).reduce(function (s, x) { return s + x.rez; }, 0) },
      durate: DUR.map(function (d) { var s = ep.filter(function (x) { return x.zile >= d[0] && x.zile < d[1]; }); return { de: d[0], pana: isFinite(d[1]) ? d[1] : null, n: s.length, medie: s.length ? s.reduce(function (a, x) { return a + x.pct; }, 0) / s.length : null, lei: s.reduce(function (a, x) { return a + x.rez; }, 0) }; }) };
  }

  // ---------------- corelația (boții deschiși) ----------------
  // serii = { moneda: [{t, c}] } (bare de 1 h); ultima bară (în formare) iese; doar orele comune ⇒ { monede, M, bare }
  function corelatie(serii) {
    var mon = Object.keys(serii || {}).filter(function (m) { return Array.isArray(serii[m]) && serii[m].length > 3; }), mp = {};
    mon.forEach(function (m) { var s = serii[m].slice().sort(function (a, b) { return a.t - b.t; }).slice(0, -1); mp[m] = {}; s.forEach(function (x) { mp[m][x.t] = Number(x.c); }); });
    if (!mon.length) return { monede: [], M: [], bare: 0 };
    var tm = Object.keys(mp[mon[0]]).map(Number).filter(function (t) { return mon.every(function (m) { return mp[m][t] > 0; }); }).sort(function (a, b) { return a - b; });
    var ret = {}; mon.forEach(function (m) { ret[m] = []; for (var i = 1; i < tm.length; i++) ret[m].push(Math.log(mp[m][tm[i]] / mp[m][tm[i - 1]])); });
    var cor = function (a, b) { var n = a.length; if (n < 3) return null; var ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; var sab = 0, sa = 0, sb = 0; for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) * (a[i] - ma); sb += (b[i] - mb) * (b[i] - mb); } return sa > 0 && sb > 0 ? sab / Math.sqrt(sa * sb) : null; };
    return { monede: mon, M: mon.map(function (a) { return mon.map(function (b) { return a === b ? 1 : cor(ret[a], ret[b]); }); }), bare: Math.max(0, tm.length - 1) };
  }
  function perechiCorelate(c, prag) { var o = []; for (var i = 0; i < c.monede.length; i++) for (var j = i + 1; j < c.monede.length; j++) if (c.M[i][j] !== null && c.M[i][j] >= prag) o.push({ a: c.monede[i], b: c.monede[j], v: c.M[i][j] }); return o.sort(function (x, y) { return y.v - x.v; }); }

  // ---------------- textele (Tablou / T212 / pagina din meniu) ----------------
  function textBot(s, ore) { var p = pragulAtins(s, ore); if (!p) return null; return "Din boții tăi care au ajuns la " + p.h + " h (" + p.n + "), " + pct(p.pePlus) + " au ieșit pe plus și " + pct(p.mari) + " au pierdut peste 5% (media " + semn1(p.medie * 100) + "%)."; }
  function textActiune(s, zile) { var p = pragulAtins(s, zile); if (!p) return null; return "Din pozițiile tale ținute peste " + cate(p.h, "zi", "zile") + " (" + p.n + "), " + pct(p.pePlus) + " s-au încheiat pe plus și " + pct(p.mari) + " cu o pierdere de peste 5% (media " + semn1(p.medie * 100) + "%)."; }
  // revizia (R10): avertismentul doar când medierea iese rea (dovedit sau la limită), cu limita de cauză
  function textMediere(r) { if (!r || r.k !== "A1" || r.mariCu === null || r.mariFara === null || !(r.mariCu > r.mariFara) || (r.stare !== "dovedit-rau" && r.stare !== "la-limita-rau")) return null; return "Ai cumpărat la preț mai mic pe ea cât era pe minus: la tine, pozițiile mediate așa s-au încheiat cu pierdere de peste 5% în " + pct(r.mariCu) + " din cazuri, față de " + pct(r.mariFara) + " (" + (r.stare === "dovedit-rau" ? "dovedit" : "la limită, încă nesigur") + " pe " + cate(r.cu, "episod", "episoade") + "). Mediezi doar ce scade deja, deci o parte din diferență ar fi venit oricum."; }
  function textLuna(mc, unit, noun, ritmulTau) {
    if (!mc) return null; noun = noun || ["bot", "boți"]; var pm = mc.pMinus;
    return (ritmulTau === false ? "Luna proastă cu " + cate(mc.K, noun[0], noun[1]) + " pe lună (~" : "Luna proastă la ritmul tău (" + cate(mc.K, noun[0], noun[1]) + " în 30 de zile, ~") + v1(mc.S) + " " + unit + " fiecare): " + semn1(mc.p5) + " " + unit + "; "
      + (pm >= 0.45 && pm <= 0.55 ? "o lună din două iese pe minus." : "luna iese pe minus în " + pct(pm) + " din simulări.");
  }

  // toți boții deschiși deodată: l = [{ nume, investit, laStop (USDT la stop, cu gridul pe drum) | null fără stop, lichPct }]
  function textTotiBotii(l) {
    l = (l || []).filter(function (x) { return x && x.nume; }); if (!l.length) return null;
    var inv = l.reduce(function (s, x) { return s + (Number(x.investit) || 0); }, 0), cu = l.filter(function (x) { return x.laStop !== null && x.laStop !== undefined && isFinite(x.laStop); });
    var necal = l.filter(function (x) { return !(x.laStop !== null && x.laStop !== undefined && isFinite(x.laStop)) && x.areStop; }).length, fara = l.length - cu.length - necal;
    var st = cu.reduce(function (s, x) { return s + x.laStop; }, 0), lq = l.filter(function (x) { return isFinite(Number(x.lichPct)) && x.lichPct !== null; }).sort(function (a, b) { return a.lichPct - b.lichPct; })[0];
    var t = "Toți boții deodată (" + l.length + "): " + v1(inv) + " USDT în ei; ";
    // revizia (R6): stopul pe plus (mutat pe profit) nu e „pierzi”; stopul pus dar nesocotit nu e „fără stop”
    var rest = (necal ? ", iar la " + cate(necal, "bot", "boți") + " stopul nu se poate socoti acum" : "") + (fara ? ", iar " + cate(fara, "bot", "boți") + (fara === 1 ? " n-are stop (pierderea lui nu are margine)" : " n-au stop (pierderea lor nu are margine)") : "");
    t += cu.length ? (st < 0 ? "dacă se ating toate stopurile pierzi " + semn1(st) + " USDT (" + (inv > 0 ? pct(-st / inv) : "—") + " din bani)" : "dacă se ating toate stopurile ieși cu " + semn1(st) + " USDT") + rest
      : fara ? "niciun bot n-are stop pus (pierderea nu are margine)" : "stopurile nu se pot socoti acum";
    return t + (lq ? "; cel mai aproape de lichidare: " + lq.nume + ", la " + v1(lq.lichPct) + "%." : ".");
  }
  // corelația boților deschiși (RiscLuna.corelatie pe lumânări de 1 h)
  function textCorelatie(c, dubluri) {
    var dub = (dubluri || []).filter(function (d) { return d && d.n > 1; }).map(function (d) { return cate(d.n, "bot", "boți") + " pe aceeași monedă (" + d.m + ")"; });
    var dt = dub.length ? dub.join(", ") + ": pentru risc sunt un singur pariu mai mare." : "";   // revizia (R7)
    if (!c || !c.monede || c.monede.length < 2) return dt || "Un singur bot: nimic de corelat.";
    return (dt ? dt + " " : "") + textCorelatieMonede(c);
  }
  function textCorelatieMonede(c) {
    var p = perechiCorelate(c, 0.5), f = function (x) { return x.toFixed(2).replace(".", ","); };
    if (p.length) return "Se mișcă împreună: " + p.map(function (x) { return x.a + "–" + x.b + " " + f(x.v); }).join(", ") + " - pentru risc sunt ca un singur bot mai mare.";
    var m = null; for (var i = 0; i < c.monede.length; i++) for (var j = i + 1; j < c.monede.length; j++) if (c.M[i][j] !== null && (!m || c.M[i][j] > m.v)) m = { a: c.monede[i], b: c.monede[j], v: c.M[i][j] };
    return "Monedele boților nu se mișcă împreună" + (m ? ": cea mai mare corelație e " + f(m.v) + " (" + m.a + "–" + m.b + "), pe lumânările de 1 h" + (c.bare >= 48 ? " din ultimele " + cate(Math.round(c.bare / 24), "zi", "zile") : "") : "") + ".";
  }

  // ---------------- comportamentul spus explicit (pagina din meniu) ----------------
  var mii = function (x) { var r = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (x < 0 ? "−" : x > 0 ? "+" : "") + r; };
  var LIMITA = { A1: "Mediezi doar ce scade deja, deci o parte din diferență ar fi venit oricum.", A3: "Ții mai mult ce merge prost, deci durata e și urmare, nu doar cauză." };
  function textObicei(r, tip) {
    var noun = tip === "actiuni" ? ["episod", "episoade"] : ["bot", "boți"], grup = cate(r.cu, noun[0], noun[1]) + " cu, " + r.fara + " fără";
    if (/^prea/.test(r.stare)) return "Prea puține cazuri ca să judec (" + grup + ").";
    var cifre = "media " + semn1(r.medieCu * 100) + "% față de " + semn1(r.medieFara * 100) + "%, pierderi de peste 5% în " + pct(r.mariCu) + " din cazuri față de " + pct(r.mariFara) + " (" + grup + ")";
    var t = r.stare === "dovedit-rau" ? "Obicei rău, dovedit: " + cifre + "." : r.stare === "dovedit-bun" ? "Obicei bun, dovedit: " + cifre + "."
      : r.stare === "la-limita-rau" ? "La limită (semn de obicei rău, încă nesigur): " + cifre + "." : r.stare === "la-limita-bun" ? "La limită (semn de obicei bun, încă nesigur): " + cifre + "." : "Nedovedit: " + cifre + "; diferența poate fi întâmplare.";
    return LIMITA[r.k] && r.stare !== "nedovedit" ? t + " " + LIMITA[r.k] : t;
  }
  var CE_FAC = { A1: "N-aș mai cumpăra la preț mai mic pe o acțiune pe minus; aș aștepta să urce peste prețul meu mediu.",
    A2: "Aș păstra suma obișnuită după o pierdere, nu aș mări-o ca să recuperez.", O2: "Aș închide botul în loc să-i adaug marjă.", O3: "Aș rula cu cel mult 3×.", O4: "Aș lua banda mai largă de 10%." };
  var TITLU_ACT = { A1: ["Cumperi la preț mai mic pe pozițiile pe minus", "Cumpărarea la preț mai mic pe minus îți iese bine"], A2: ["Mărești suma după o pierdere", "Suma mărită după o pierdere îți iese bine"], A3: ["Pozițiile lungi îți ies mai prost", "Pozițiile scurte îți ies mai bine (legătură, nu cauză)"] };
  // ⇒ { boti: [], actiuni: [] }, fiecare { nivel: "rau"|"atentie"|"bine"|"info", titlu, text, faCe } - din cifrele raportului
  function concluzii(rp) {
    var out = { boti: [], actiuni: [] }, B = rp && rp.boti, A = rp && rp.actiuni;
    if (B && B.desc) {
      var d = B.desc, S = B.ritm ? B.ritm.S : null, c = d.coada;
      if (c && c.laS < 0 && c.restLaS > 0) out.boti.push({ nivel: "rau", titlu: "Câțiva boți cu pierderi mari șterg câștigul celorlalți",
        text: "Cei mai răi 10% (" + cate(c.n, "bot", "boți") + ", fiecare sub " + semn1(c.prag * 100) + "%) au pierdut " + mii(-c.laS).replace(/^[+−]/, "") + " USDT la suma ta de acum (~" + v1(S) + " USDT pe bot), iar ceilalți 90% au câștigat " + mii(c.restLaS).replace(/^[+−]/, "") + ".",
        faCe: "Aș pune stop la fiecare bot, la marginea gridului: fără el, o pierdere mare nu are margine." });
      var lung = (d.durate || []).filter(function (x) { return x.de >= 24; }), scurt = (d.durate || []).filter(function (x) { return x.pana !== null && x.pana <= 4; });
      var sl = lung.reduce(function (s, x) { return s + x.laS; }, 0), nl = lung.reduce(function (s, x) { return s + x.n; }, 0), ss = scurt.reduce(function (s, x) { return s + x.laS; }, 0), ns = scurt.reduce(function (s, x) { return s + x.n; }, 0);
      if (nl >= 10 && sl < 0) out.boti.push({ nivel: "rau", titlu: "Boții ținuți peste o zi pierd", text: "Cei ținuți peste 24 h (" + nl + ") au adus " + mii(sl) + " USDT, cei sub 4 h (" + ns + ") " + mii(ss) + ". Durata e și urmare: ții mai mult ce merge prost.",
        faCe: "Aș închide botul care stă de peste o zi pe minus, în loc să aștept să revină." });
      if (d.bani && d.bani.grile > 0 && -d.bani.comisioane > 0.3 * d.bani.grile) { var rapid = (d.durate || []).filter(function (x) { return x.pana !== null && x.pana <= 0.25; }).reduce(function (s, x) { return s + x.n; }, 0);
        out.boti.push({ nivel: "atentie", titlu: "Comisioanele iau " + pct(-d.bani.comisioane / d.bani.grile) + " din câștigul grilelor",   /* revizia (R5): aceeași bază ca textul */ text: "Grilele au adus " + mii(d.bani.grile) + " USDT, comisioanele " + mii(d.bani.comisioane) + " (bani reali)." + (rapid ? " " + cate(rapid, "bot", "boți") + " au stat sub 15 minute." : ""),
          faCe: "Aș lăsa botul măcar o oră: fiecare pornire plătește din nou comisionul." }); }
      var dov = (B.comportament || []).filter(function (x) { return /^(dovedit|la-limita)/.test(x.stare); }), are = out.boti.length > 0;
      dov.forEach(function (x) { var rau = /rau$/.test(x.stare), sigur = /^dovedit/.test(x.stare); out.boti.push({ nivel: rau ? (sigur ? "rau" : "atentie") : "bine", titlu: x.nume + (sigur ? (rau ? " (dovedit rău)" : " (dovedit bun)") : (rau ? " (la limită, rău)" : " (la limită, bun)")), text: textObicei(x, "boti"), faCe: rau ? CE_FAC[x.k] || null : null }); });   /* titlul ≤ 60 (garda) */
      if (!dov.length) out.boti.push({ nivel: "info", titlu: "Niciun obicei al boților nu e dovedit, nici bun, nici rău", text: "Din " + cate((B.comportament || []).length || 9, "obicei testat", "obiceiuri testate") + " pe boții tăi, niciunul nu trece regula (diferența poate fi întâmplare)." + (are ? " Pierderea vine din ce scrie mai sus." : ""), faCe: null });
    }
    if (A && A.desc) {
      (A.comportament || []).filter(function (x) { return /^(dovedit|la-limita)/.test(x.stare); }).forEach(function (x) { var rau = /rau$/.test(x.stare), sigur = /^dovedit/.test(x.stare), T = TITLU_ACT[x.k] || [x.nume, x.nume];
        out.actiuni.push({ nivel: rau ? (sigur ? "rau" : "atentie") : "bine", titlu: (rau ? T[0] : T[1]) + (sigur ? "" : " (la limită)"), text: textObicei(x, "actiuni"), faCe: rau ? CE_FAC[x.k] || null : null }); });
      var e = A.desc;
      if (e.comisioane > 0 && (e.rezultat <= 0 || e.comisioane > 0.5 * e.rezultat)) out.actiuni.push({ nivel: "atentie", titlu: e.rezultat > 0 ? "Comisioanele de conversie îți iau o mare parte din câștig" : "Comisioanele de conversie îți adâncesc minusul",
        text: "Ai plătit " + mii(e.comisioane).replace("+", "") + " lei comision de conversie; rezultatul real e " + mii(e.rezultat) + " lei (T212 afișează " + mii(e.oficial) + ", fără comisioane).",
        faCe: "Aș face mai puține cumpărări mici: conversia se plătește la fiecare cumpărare și vânzare." });
      if (e.mari && e.mari.lei < 0 && e.mari.restLei > 0 && -e.mari.lei > 0.5 * e.mari.restLei) out.actiuni.push({ nivel: "rau", titlu: "Câteva poziții mari pe minus șterg câștigul celorlalte",
        text: "Pozițiile închise cu peste 5% pe minus (" + e.mari.n + ") au pierdut " + mii(-e.mari.lei).replace(/^[+−]/, "") + " lei; restul au adus " + mii(e.mari.restLei) + ".",
        faCe: "Aș scrie pentru fiecare acțiune, la cumpărare, cât accept să pierd, și aș vinde acolo." });
    }
    return out;
  }

  // ---------------- raportul (colectorul, o dată pe noapte) ----------------
  // { boti: arhiva, umpleri: istoricul T212, acum, reps, n } ⇒ obiect mic (≤ 100 KB) pentru /api/istoric-bot?action=risc
  function raport(o) {
    o = o || {}; var acum = o.acum || Date.now(), de = Date.UTC(2026, 0, 1), reps = o.reps || 2000, nMc = o.n || 20000, out = { la: acum, versiune: 1 };
    var toti = bazinBoti(o.boti, { de: de }), mcB = bazinBoti(o.boti, { de: de, levMax: 5 });
    if (toti.length) {
      var rb = ritm(toti, acum), Ks = [rb.K, 10, 30, 60].filter(function (k, i, a) { return a.indexOf(k) === i; });
      out.boti = { n: toti.length, nMc: mcB.length, de: toti[0].t, pana: toti[toti.length - 1].t, ritm: rb,
        mc: Ks.map(function (K) { return monteCarlo(mcB, { K: K, S: rb.S, n: nMc, seed: 558 + K }); }).filter(Boolean),
        supravietuire: supravietuire(toti, [1, 4, 12, 24, 48, 72, 168], "ore"), desc: descBoti(toti, rb.S), comportament: comportamentBoti(o.boti, { de: de, S: rb.S, reps: reps }) };
    }
    // tranzacțiile T212 (FIFO, rezultatul real în lei) vin gata făcute de la colector, unde T212 nu e global; pe pagină se pot socoti aici
    var ep = episoade(o.umpleri), per = o.perechi || (typeof T212 !== "undefined" && T212.perechi ? T212.perechi(o.umpleri || []) : { inchise: [] });
    if (ep.inchise.length) {
      // revizia (R4): și pozițiile încă deschise pornite în ultimele 30 de zile intră în ritm (altfel luna proastă iese prea blândă)
      var ra = ritm(ep.inchise.concat(ep.deschise.map(function (e) { return { t: e.start, pus: e.pus }; })).sort(function (a, b) { return a.t - b.t; }), acum, "pus"), Ka = [ra.K, 10, 20, 40].filter(function (k, i, a) { return a.indexOf(k) === i; });
      out.actiuni = { n: ep.inchise.length, de: ep.inchise[0].final, pana: ep.inchise[ep.inchise.length - 1].final, ritm: ra,
        mc: Ka.map(function (K) { return monteCarlo(ep.inchise, { K: K, S: ra.S, n: nMc, seed: 212 + K }); }).filter(Boolean),
        supravietuire: supravietuire(ep.inchise, [1, 5, 10, 20, 40, 90], "zile"), desc: descActiuni(per.inchise, ep.inchise), comportament: comportamentActiuni(ep.inchise, { reps: reps }) };
    }
    return out;
  }

  return { bazinBoti: bazinBoti, ritm: ritm, monteCarlo: monteCarlo, supravietuire: supravietuire, pragulAtins: pragulAtins, comportamentBoti: comportamentBoti, descBoti: descBoti,
    episoade: episoade, comportamentActiuni: comportamentActiuni, descActiuni: descActiuni, corelatie: corelatie, perechiCorelate: perechiCorelate,
    textBot: textBot, textActiune: textActiune, textMediere: textMediere, textLuna: textLuna, raport: raport, generator: generator, textObicei: textObicei, concluzii: concluzii, textTotiBotii: textTotiBotii, textCorelatie: textCorelatie };
})();
if (typeof globalThis !== "undefined") globalThis.RiscLuna = RiscLuna;
