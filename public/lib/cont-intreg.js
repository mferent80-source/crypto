// Contul întreg (v100.176; el 13.10: „fă din prima recomandare 1–6” - comparația cu o platformă instituțională). Modul PUR (fără DOM, fără
// rețea), probat în scripts/proba-v100176.mjs. Colectorul (scripts/lib/tura-cont.mjs) îl rulează și trimite raportul acasă; pagina
// „Contul întreg” îl desenează. Tot ce socotește e în LEI, pe tot contul: boții Pionex + Trading 212 + Salt.
//   1. expunerea fiecărei poziții (botul după poziția lui reală de la Pionex, nu după suma pusă);
//   2. riscul pe o zi: VaR / ES 95 % și 99 % din istoria reală a pozițiilor de ACUM (simulare istorică pe ~250 de zile, cu cursul leului);
//   3. corelațiile și „câte pariuri independente” porți (raportul de diversificare);
//   4. stres-testele pe crizele reale (randamentele din ferestrele lor, nu cifre scrise de mână); gridul cumpără pe drum, lichidarea taie tot;
//   5. reconcilierea cu brokerii (cantitățile T212 din jurnal față de cele raportate, arhiva boților față de Pionex);
//   6. randamentul ponderat în timp (TWR) pe zile, Sharpe / Sortino / scăderea maximă, față de BTC și S&P.
// Lipsa rămâne lipsă (null + motiv), niciodată 0. Regula de trader: sub 60 de zile de istorie comună riscul e „orientativ”.
var ContIntreg = (function () {
  "use strict";
  var ZI = 86400000;
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function zi(t) { return new Date(t).toISOString().slice(0, 10); }
  function medie(a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function abatere(a) { if (a.length < 2) return null; var m = medie(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / (a.length - 1)); }
  function cuantila(sortat, p) { if (!sortat.length) return null; var i = (sortat.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? sortat[lo] : sortat[lo] + (sortat[hi] - sortat[lo]) * (i - lo); }

  // ---------------- 1. expunerile ----------------
  // moneda instrumentului după bursă (prețul T212 vine în moneda bursei: USD, EUR, pence la Londra)
  // v100.177 (revizia, I8): moneda din metadatele instrumentelor T212 (setMonede, de la colector) bate sufixul - un ETF de la Londra poate fi
  // cotat în USD sau GBP, nu în pence
  var MONEDE = {};
  function setMonede(m) { MONEDE = m && typeof m === "object" ? m : {}; }
  function monedaTicker(tk) {
    var brut = String(tk || ""), lit = /([a-z])_EQ$/.exec(brut), md = MONEDE[brut];
    if (md) return md === "GBX" || md === "GBp" ? "GBX" : String(md).toUpperCase();
    if (lit) return lit[1] === "l" ? "GBX" : lit[1] === "s" ? "CHF" : "EUR";
    var s = brut.toUpperCase();
    if (/\.L$|L_EQ$/.test(s)) return "GBX";
    if (/_CA_EQ$|\.TO$|\.V$/.test(s)) return "CAD";
    if (/_AT_EQ$/.test(s)) return "EUR";
    if (/\.(DE|F|MU|BE|DU|HM|SG|PA|AS|MI|BR|MC|VI)$|D_EQ$/.test(s) && !/_US_EQ$/.test(s)) return "EUR";
    return "USD";
  }
  // leiPe = { USD, EUR, GBP } = câți lei face o unitate (USDT socotit ca USD)
  function inLei(suma, moneda, leiPe) {
    if (suma === null || !leiPe) return null;
    var m = moneda === "USDT" ? "USD" : moneda;
    if (m === "GBX") return leiPe.GBP > 0 ? suma / 100 * leiPe.GBP : null;
    return leiPe[m] > 0 ? suma * leiPe[m] : null;
  }
  // un bot Pionex (forma din /api/bot-orders): expunerea = poziția REALĂ × prețul, cu semnul direcției; valoarea = suma pusă + profitul
  function dinBot(b, leiPe) {
    if (!b || !b.activ) return null;
    var pret = nr(b.pretCurent), poz = nr(b.pozitie), inv = nr(b.investit), pt = nr(b.profitTotal), dir = String(b.directie || "").toLowerCase();
    var semn = dir === "short" ? -1 : dir === "long" ? 1 : (poz !== null && poz < 0 ? -1 : 1);
    var notUsd = pret !== null && poz !== null ? semn * Math.abs(poz) * pret : null;
    var baza = String(b.baza || "").replace(/\.PERP$/, "");
    return { tip: "bot", id: String(b.id || ""), cheie: "C:" + baza, nume: baza + " (bot " + (dir || "grid") + " " + (nr(b.levier) || 1) + "×)", clasa: "crypto", moneda: "USD",
      pret: pret, notional: notUsd, notionalLei: inLei(notUsd, "USD", leiPe), valoare: inv !== null ? inv + (pt || 0) : null, valoareLei: inv !== null ? inLei(inv + (pt || 0), "USD", leiPe) : null,
      dir: dir || "neutru", levier: nr(b.levier) || 1, investit: inv, gridJos: nr(b.gridJos), gridSus: nr(b.gridSus), lichJos: nr(b.lichidareJos), lichSus: nr(b.lichidareSus),
      simbolPionex: b.simbolPionex || null, lipsa: notUsd === null ? "Pionex n-a dat poziția sau prețul botului" : null };
  }
  function dinT212(p, leiPe) {
    if (!p || !(nr(p.quantity) > 0)) return null;
    var m = monedaTicker(p.ticker), not = nr(p.quantity) * nr(p.currentPrice), s = String(p.ticker || "").replace(/_US_EQ$|_EQ$/, "");
    return { tip: "t212", id: String(p.ticker), cheie: "T:" + p.ticker, nume: s, clasa: "actiuni", moneda: m, pret: nr(p.currentPrice), qty: nr(p.quantity),
      notional: not, notionalLei: inLei(not, m, leiPe), valoare: not, valoareLei: inLei(not, m, leiPe), lipsa: inLei(not, m, leiPe) === null ? "lipsește cursul pentru " + m : null };
  }
  function dinSalt(r, leiPe) {
    if (!r || !(nr(r.qty) > 0) || nr(r.pret) === null) return null;
    var m = String(r.moneda || "EUR").toUpperCase(), not = nr(r.qty) * nr(r.pret);
    return { tip: "salt", id: String(r.simbol), cheie: "S:" + r.simbol, nume: String(r.simbol) + " (Salt)", clasa: "actiuni", moneda: m, pret: nr(r.pret), qty: nr(r.qty),
      notional: not, notionalLei: inLei(not, m, leiPe), valoare: not, valoareLei: inLei(not, m, leiPe), lipsa: inLei(not, m, leiPe) === null ? "lipsește cursul pentru " + m : null };
  }
  // valoarea contului în lei, pe bucăți; o bucată necitită rămâne null și totalul spune „≥” (nu o sumă mai mică prezentată ca întreagă)
  function valoare(o) {
    var leiPe = o.leiPe || null, p = null, partiLipsa = [];
    if (Array.isArray(o.boti)) { p = 0; o.boti.forEach(function (b) { var e = dinBot(b, leiPe); if (e && e.valoareLei !== null) p += e.valoareLei; else if (e) partiLipsa.push(e.nume); }); var lb = nr(o.pionexLiber) !== null ? inLei(nr(o.pionexLiber), "USD", leiPe) : null; if (lb !== null) p += lb; else partiLipsa.push("soldul liber Pionex"); }
    else partiLipsa.push("Pionex");
    var t = o.t212Cash && nr(o.t212Cash.total) !== null ? nr(o.t212Cash.total) : null; if (t === null) partiLipsa.push("Trading 212");
    var s = null; if (Array.isArray(o.salt)) { s = 0; o.salt.forEach(function (r) { var e = dinSalt(r, leiPe); if (e && e.valoareLei !== null) s += e.valoareLei; else if (r) partiLipsa.push(String(r.simbol) + " (Salt)"); }); }
    var tot = [p, t, s].reduce(function (a, x) { return x === null ? a : a + x; }, 0);
    return { pionex: p, t212: t, salt: s, total: tot, complet: !partiLipsa.length, lipsa: partiLipsa };
  }

  // ---------------- 2. riscul pe o zi (simulare istorică) ----------------
  // randamentele zilnice dintr-o serie de bare [{t, c}] ⇒ { "AAAA-LL-ZZ": r }
  function randamente(bare) {
    var out = {}, l = (Array.isArray(bare) ? bare : []).filter(function (b) { return b && nr(b.t) !== null && nr(b.c) > 0; }).sort(function (a, b) { return a.t - b.t; });
    for (var i = 1; i < l.length; i++) out[zi(l[i].t)] = l[i].c / l[i - 1].c - 1;
    return out;
  }
  // P&L-ul zilnic în lei al pozițiilor de ACUM, pe zilele din fereastră; o poziție fără serie sau cu prea puține zile iese și se spune
  // e = expunerile; serii = { cheie: {zi: r} }; fx = { USD: {zi: r}, EUR: ..., GBP: ... } (randamentul leului față de monedă)
  function pnlIstoric(e, serii, fx, o) {
    o = o || {};
    var zile = (o.zile || []).slice(), folosite = [], scoase = [];
    if (!zile.length) { var set = {}; Object.keys(serii || {}).forEach(function (k) { Object.keys(serii[k] || {}).forEach(function (z) { set[z] = 1; }); }); zile = Object.keys(set).sort().slice(-(o.n || 250)); }
    e.forEach(function (x) {
      if (!x || x.notionalLei === null || !isFinite(x.notionalLei)) { if (x) scoase.push({ nume: x.nume, motiv: x.lipsa || "fără expunere" }); return; }
      var s = serii && serii[x.cheie], acop = s ? zile.filter(function (z) { return s[z] !== undefined; }).length : 0;
      // acțiunile n-au bare în weekend (0 e corect atunci): pragul e pe ~5/7 din zile
      if (!s || acop < zile.length * (x.clasa === "crypto" ? 0.7 : 0.5)) { scoase.push({ nume: x.nume, motiv: "istorie prea scurtă (" + acop + " din " + cate(zile.length, "zi", "zile") + ")" }); return; }
      folosite.push(x);
    });
    var pnl = zile.map(function (z) {
      var t = 0;
      folosite.forEach(function (x) {
        var r = serii[x.cheie][z] || 0, m = x.moneda === "USDT" ? "USD" : x.moneda === "GBX" ? "GBP" : x.moneda, rf = fx && fx[m] && fx[m][z] !== undefined ? fx[m][z] : 0;
        // botul: cursul leului mișcă VALOAREA lui (marja), nu expunerea cu levier (revizia, M1)
        t += x.tip === "bot" ? x.notionalLei * r + (x.valoareLei || 0) * rf : x.notionalLei * ((1 + r) * (1 + rf) - 1);
      });
      return { z: z, pnl: t };
    });
    // v100.177 (revizia, I6): riscul „pe o zi” e pe ZILE DE BURSĂ - sâmbăta și duminica (doar crypto) se adună în lunea care urmează;
    // altfel weekendurile cu acțiunile pe 0 diluau VaR-ul (~10 % sub cel real la un cont doar pe acțiuni)
    var lucru = [], adus = 0;
    pnl.forEach(function (x) { var w = new Date(x.z + "T12:00:00Z").getUTCDay(); if (w === 0 || w === 6) { adus += x.pnl; return; } lucru.push({ z: x.z, pnl: x.pnl + adus }); adus = 0; });
    return { zile: lucru, zileCal: pnl, folosite: folosite.map(function (x) { return x.cheie; }), scoase: scoase };
  }
  function varEs(pnl, nivel) {
    var v = (pnl || []).map(function (x) { return typeof x === "number" ? x : x.pnl; }).filter(function (x) { return isFinite(x); }).sort(function (a, b) { return a - b; });
    if (v.length < 20) return null;
    var q = cuantila(v, 1 - nivel), coada = v.filter(function (x) { return x <= q; });
    return { var: -q, es: -medie(coada), n: v.length };
  }
  function cuDatele(pnl) { var o = null; pnl.forEach(function (x) { if (!o || x.pnl < o.pnl) o = x; }); return o; }

  // ---------------- 3. corelațiile ----------------
  function corel(a, b) {
    var n = a.length; if (n < 3) return null;
    var ma = medie(a), mb = medie(b), sab = 0, saa = 0, sbb = 0;
    for (var i = 0; i < n; i++) { var x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
  }
  // perechile pe zilele în care AMÂNDOUĂ au bară (o acțiune și o monedă: doar zilele lucrătoare); cel puțin `min` zile comune
  function corelatii(e, serii, o) {
    o = o || {}; var zileMax = o.zile || 90, min = o.min || 40, l = e.filter(function (x) { return x && serii[x.cheie] && x.notionalLei !== null; });
    l.sort(function (a, b) { return Math.abs(b.notionalLei) - Math.abs(a.notionalLei); }); l = l.slice(0, o.max || 12);
    var perechi = [];
    for (var i = 0; i < l.length; i++) for (var j = i + 1; j < l.length; j++) {
      var sa = serii[l[i].cheie], sb = serii[l[j].cheie], z = Object.keys(sa).filter(function (k) { return sb[k] !== undefined; }).sort().slice(-zileMax);
      if (z.length < min) continue;
      var r = corel(z.map(function (k) { return sa[k]; }), z.map(function (k) { return sb[k]; }));
      if (r === null) continue;
      // semnul expunerii: un long și un short pe lucruri corelate se acoperă, nu se adună
      var s = Math.sign(l[i].notionalLei) * Math.sign(l[j].notionalLei);
      perechi.push({ a: l[i].nume, b: l[j].nume, rho: r, n: z.length, acelasiRisc: r * s >= 0.6, seAcopera: r * s <= -0.6 });
    }
    perechi.sort(function (x, y) { return Math.abs(y.rho) - Math.abs(x.rho); });
    return perechi;
  }
  // raportul de diversificare: Σ riscul fiecărei poziții / riscul portofoliului; pătratul lui ≈ câte pariuri independente porți
  function diversificare(folosite, serii, pnl) {
    var sp = abatere(pnl.map(function (x) { return x.pnl; })); if (!sp || !(sp > 0)) return null;
    var z = pnl.map(function (x) { return x.z; }), suma = 0;
    folosite.forEach(function (x) { var s = abatere(z.map(function (k) { return serii[x.cheie][k] || 0; })); if (s) suma += s * Math.abs(x.notionalLei); });
    var dr = suma / sp;
    return { raport: dr, pariuri: Math.max(1, Math.min(folosite.length, dr * dr)), pozitii: folosite.length };
  }

  // ---------------- 4. stres-testele ----------------
  // CRIZE: ferestrele (închideri zilnice); randamentele se iau din date (BTC-USD, QQQ, SPY, seria fiecărei poziții), nu se scriu de mână
  var CRIZE = [
    { cod: "covid", nume: "Covid, martie 2020", de: "2020-03-06", pana: "2020-03-16" },
    { cod: "china21", nume: "Interdicția din China, mai 2021", de: "2021-05-11", pana: "2021-05-19" },
    { cod: "luna", nume: "Prăbușirea Terra/Luna, mai 2022", de: "2022-05-05", pana: "2022-05-12" },
    { cod: "ftx", nume: "Falimentul FTX, noiembrie 2022", de: "2022-11-07", pana: "2022-11-09" },
    { cod: "yen24", nume: "Ieșirea din yen, august 2024", de: "2024-08-01", pana: "2024-08-05" },
    { cod: "oct25", nume: "Lichidările din 10 octombrie 2025", de: "2025-10-09", pana: "2025-10-10" }
  ];
  // randamentul unei serii de bare [{t, c}] între închiderea din `de` (ultima bară ≤ de) și cea din `pana`
  // randamentul la închidere + cel mai jos / cel mai sus punct din fereastră (din l / h când barele le au, altfel din închideri)
  function extremFereastra(bare, de, pana) {
    var l = (bare || []).filter(function (b) { return b && nr(b.c) > 0; }).sort(function (a, b) { return a.t - b.t; }), a = null;
    for (var i = 0; i < l.length; i++) if (zi(l[i].t) <= de) a = l[i];
    var r = randFereastra(bare, de, pana); if (r === null || !a) return null;
    var lo = Infinity, hi = -Infinity;
    l.forEach(function (b) { var z = zi(b.t); if (z > zi(a.t) && z <= pana) { lo = Math.min(lo, nr(b.l) > 0 ? b.l : b.c); hi = Math.max(hi, nr(b.h) > 0 ? b.h : b.c); } });
    return { r: r, min: isFinite(lo) ? Math.min(r, lo / a.c - 1) : r, max: isFinite(hi) ? Math.max(r, hi / a.c - 1) : r };
  }
  function randFereastra(bare, de, pana) {
    var l = (bare || []).filter(function (b) { return b && nr(b.c) > 0; }).sort(function (a, b) { return a.t - b.t; }), a = null, b = null;
    for (var i = 0; i < l.length; i++) { var z = zi(l[i].t); if (z <= de) a = l[i]; if (z <= pana) b = l[i]; }
    if (!a || !b || b.t <= a.t || zi(a.t) < zi(Date.parse(de) - 5 * ZI)) return null;
    return b.c / a.c - 1;
  }
  // beta față de un factor, pe zilele comune (cel puțin 60)
  function beta(s, f, n) {
    var z = Object.keys(s || {}).filter(function (k) { return f && f[k] !== undefined; }).sort().slice(-(n || 180)); if (z.length < 60) return null;
    var a = z.map(function (k) { return s[k]; }), b = z.map(function (k) { return f[k]; }), mb = medie(b), ma = medie(a), cov = 0, vb = 0;
    for (var i = 0; i < z.length; i++) { cov += (a[i] - ma) * (b[i] - mb); vb += (b[i] - mb) * (b[i] - mb); }
    return vb > 0 ? cov / vb : null;
  }
  // P&L-ul unui bot grid la o mișcare r a prețului: poziția se schimbă pe drum (long cumpără la scădere până la marginea de jos, short
  // vinde la creștere), integrată în 40 de pași; trecerea de prețul de lichidare = pierzi tot ce e în bot (valoarea lui)
  function pnlBot(x, r, ex) {
    var p0 = x.pret, p1 = p0 * (1 + r), val = x.valoare !== null ? Math.max(0, x.valoare) : null;
    if (!(p0 > 0) || x.notional === null) return null;
    // v100.177 (revizia, I5): lichidarea se verifică pe punctul cel mai jos / cel mai sus din fereastră (fitilurile din timpul zilei), nu doar la închidere
    var pMin = p0 * (1 + Math.min(r, ex && isFinite(ex.min) ? ex.min : r)), pMax = p0 * (1 + Math.max(r, ex && isFinite(ex.max) ? ex.max : r));
    if ((x.lichJos !== null && x.lichJos > 0 && pMin <= x.lichJos) || (x.lichSus !== null && x.lichSus > 0 && pMax >= x.lichSus)) return val !== null ? { pnl: -val, lichidat: true } : null;
    var jos = x.gridJos, sus = x.gridSus, q0 = x.notional / p0, maxQ = x.investit !== null ? x.investit * (x.levier || 1) / p0 : Math.abs(q0);
    var areGrid = jos > 0 && sus > jos;
    // poziția (în monede, cu semn) la prețul p: dacă nu știm gridul, rămâne cea de acum (static)
    function q(p) {
      if (!areGrid) return q0;
      var f = x.dir === "long" ? (sus - p) / (sus - jos) : x.dir === "short" ? -(p - jos) / (sus - jos) : ((jos + sus) / 2 - p) / ((sus - jos) / 2);
      // v100.177 (revizia, C1): long-ul stă în [0, 1] (peste bandă a vândut tot, nu devine short), short-ul în [−1, 0], neutrul în [−1, 1]
      f = x.dir === "long" ? Math.max(0, Math.min(1, f)) : x.dir === "short" ? Math.max(-1, Math.min(0, f)) : Math.max(-1, Math.min(1, f));
      return f * maxQ * (p0 / p);
    }
    // calibrat pe poziția reală de acum (gridul real are alt număr de linii decât modelul)
    // (revizia, C1b): calibrarea limitată la [0,5; 2] și poziția la plin (maxQ) - lângă marginea benzii k exploda și lichida fals
    var m0 = q(p0), k = areGrid && Math.abs(m0) > 1e-12 && Math.sign(m0) === Math.sign(q0) ? Math.max(0.5, Math.min(2, q0 / m0)) : 1, pnl = 0, pasi = 40;
    var plin = function (qq, p) { var lim = maxQ * (p0 / p) * 1.0001; return Math.max(-lim, Math.min(lim, qq)); };
    for (var i = 0; i < pasi; i++) { var a = p0 + (p1 - p0) * i / pasi, b = p0 + (p1 - p0) * (i + 1) / pasi, mij = (a + b) / 2; pnl += (areGrid ? plin(k * q(mij), mij) : q0) * (b - a); }
    if (val !== null && pnl < -val) return { pnl: -val, lichidat: true };
    return { pnl: pnl, lichidat: false };
  }
  // un scenariu pe expunerile de acum; f = { BTC: r, QQQ: r, SPY: r, USD: r leu/USD } din fereastra crizei; proprii = { cheie: r }
  function scenariu(e, f, proprii, betas, leiPe) {
    var tot = 0, rand = [], lipsa = [];
    e.forEach(function (x) {
      if (!x || x.notionalLei === null) return;
      // proprii / factorii: număr (randamentul) sau { r, min, max } (cu punctele extreme din fereastră)
      var pr = proprii && proprii[x.cheie] !== undefined && proprii[x.cheie] !== null ? proprii[x.cheie] : null, r = pr !== null && typeof pr === "object" ? pr.r : pr, ex = pr !== null && typeof pr === "object" ? pr : null, cum = "a ei";
      if (r === null) {
        var fac = x.clasa === "crypto" ? "BTC" : "QQQ", b = betas && betas[x.cheie] !== undefined && betas[x.cheie] !== null ? betas[x.cheie] : 1, fv = f[fac];
        if (fv === null || fv === undefined) { lipsa.push(x.nume); return; }
        var fr = typeof fv === "object" ? fv.r : fv; r = b * fr; cum = "β " + b.toFixed(1).replace(".", ",") + " × " + fac;
        if (typeof fv === "object") ex = { r: r, min: b >= 0 ? b * fv.min : b * fv.max, max: b >= 0 ? b * fv.max : b * fv.min };
      }
      var lei;
      if (x.tip === "bot") { var pb = pnlBot(x, r, ex); if (!pb) { lipsa.push(x.nume); return; } lei = inLei(pb.pnl, "USD", leiPe); rand.push({ nume: x.nume, r: r, lei: lei, cum: cum, lichidat: pb.lichidat }); }
      else { lei = x.notionalLei * r; rand.push({ nume: x.nume, r: r, lei: lei, cum: cum, lichidat: false }); }
      if (lei !== null) tot += lei;
    });
    rand.sort(function (a, b) { return a.lei - b.lei; });
    return { pnl: tot, rand: rand, lipsa: lipsa };
  }
  function stres(e, o) {
    o = o || {}; var out = [];
    (o.crize || CRIZE).forEach(function (c) {
      var f = {}; ["BTC", "QQQ", "SPY"].forEach(function (k) { f[k] = o.factori && o.factori[k] ? extremFereastra(o.factori[k], c.de, c.pana) : null; });
      if (f.BTC === null && f.QQQ === null) return;
      var proprii = {}; e.forEach(function (x) { if (x && o.bareLungi && o.bareLungi[x.cheie]) proprii[x.cheie] = extremFereastra(o.bareLungi[x.cheie], c.de, c.pana); });
      var s = scenariu(e, f, proprii, o.betas || {}, o.leiPe);
      out.push({ cod: c.cod, nume: c.nume, de: c.de, pana: c.pana, btc: f.BTC && f.BTC.r, qqq: f.QQQ && f.QQQ.r, btcMin: f.BTC && f.BTC.min, pnl: s.pnl, pozitii: s.rand, lipsa: s.lipsa });
    });
    out.sort(function (a, b) { return a.pnl - b.pnl; });
    return out;
  }

  // ---------------- 5. reconcilierea ----------------
  // T212: cantitatea din jurnalul Radarului (loturile FIFO din umpleri) față de cea raportată de T212, pe fiecare simbol
  function reconciliereT212(pozitiiApi, loturi) {
    var api = {}, jur = {}, ab = [];
    (pozitiiApi || []).forEach(function (p) { if (p && nr(p.quantity) > 0) api[p.ticker] = (api[p.ticker] || 0) + nr(p.quantity); });
    (loturi || []).forEach(function (l) { if (l && nr(l.qty) > 0) jur[l.ticker] = (jur[l.ticker] || 0) + nr(l.qty); });
    Object.keys(api).concat(Object.keys(jur)).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort().forEach(function (k) {
      var a = api[k] || 0, j = jur[k] || 0, dif = a - j;
      if (Math.abs(dif) > Math.max(1e-6, 0.001 * Math.max(a, j))) ab.push({ ticker: k, broker: a, radar: j, dif: dif, motiv: !j ? "în cont, dar nu în jurnalul Radarului (umplere lipsă)" : !a ? "în jurnal, dar nu în cont (vânzare lipsă din jurnal)" : "cantități diferite" });
    });
    return { ok: !ab.length, abateri: ab, verificate: Object.keys(api).length };
  }
  // arhiva boților închiși: cei de pe prima pagină Pionex trebuie să fie toți în arhivă
  function reconciliereArhiva(idsPionex, idsArhiva) {
    var set = {}; (idsArhiva || []).forEach(function (id) { set[String(id)] = 1; });
    var lipsa = (idsPionex || []).map(String).filter(function (id) { return !set[id]; });
    return { ok: !lipsa.length, lipsa: lipsa, verificate: (idsPionex || []).length };
  }
  // boții porniți în Pionex fără istoric proaspăt în Radar (colectorul nu-i mai urmărește)
  function reconciliereUrmarire(botiActivi, ultimaIntrare, acum, maxMin) {
    var lipsa = [];
    (botiActivi || []).forEach(function (b) { var t = ultimaIntrare && ultimaIntrare[b.id]; if (!(t > 0) || acum - t > (maxMin || 20) * 60000) lipsa.push({ id: b.id, nume: b.nume, ultima: t || null }); });
    return { ok: !lipsa.length, lipsa: lipsa, verificate: (botiActivi || []).length };
  }
  // v100.233: aceeași margine ca reconciliereT212 (nu un prag nou). Rută doar pentru cele trei citiri.
  function acelasiPrag(a, b) {
    var x = nr(a); if (x === null) x = 0;
    var y = nr(b); if (y === null) y = 0;
    return Math.abs(x - y) <= Math.max(1e-6, 0.001 * Math.max(x, y));
  }
  function cheieTrei(t) { return String(t || "").trim().toUpperCase().replace(/_US_EQ$/i, "").replace(/_EQ$/i, ""); }
  var FRAZA_MARGINE = "Am verificat cantitatea din Trading 212, arhiva boților din Pionex și boții cu istoric proaspăt. N-am verificat cash-ul, cursul umplerilor, split-ul și dividendul.";
  var FRAZA_SPLIT = "prețurile găsite nu se potrivesc cu ale tale (split sau alt simbol)";
  function margine() { return FRAZA_MARGINE; }
  function notaSplit(ticker, nepotriviri) {
    if (!ticker || !nepotriviri || !nepotriviri.length) return "";
    var k = cheieTrei(ticker);
    return nepotriviri.some(function (t) { return cheieTrei(t) === k; }) ? FRAZA_SPLIT : "";
  }
  function csvCampuri(linie, sep) {
    var out = [], cur = "", q = false;
    for (var i = 0; i < linie.length; i++) {
      var c = linie[i];
      if (q) {
        if (c === '"') { if (linie[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }
  function numarExport(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v == null ? "" : v).trim().replace(/\s/g, "");
    if (!s) return null;
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
    var x = Number(s);
    return isFinite(x) ? x : null;
  }
  // Doar antetele cunoscute: istoric (Action + Ticker + No. of shares) sau poză (Ticker + Quantity, fără Action).
  // Alt antet nu dă cantități. Depunerile și dividendele nu intră. Cumpărarea adună, vânzarea scade.
  function citesteExport(text) {
    var src = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var linii = src.split("\n").filter(function (l) { return l.trim(); });
    if (!linii.length) return { ok: false, eroare: "exportul e gol", cantitati: null };
    var sep = linii[0].split(";").length > linii[0].split(",").length ? ";" : ",";
    var tab = linii.map(function (l) { return csvCampuri(l, sep); });
    var head = tab[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
    var iT = head.indexOf("ticker"), iA = head.indexOf("action"), iS = -1, iQ = -1;
    head.forEach(function (h, i) {
      if (h === "no. of shares" || h === "no of shares") iS = i;
      if (h === "quantity" || h === "qty") iQ = i;
    });
    if (iT < 0) return { ok: false, eroare: "exportul n-are coloana Ticker", cantitati: null };
    var istoric = iA >= 0 && iS >= 0, pozitie = iA < 0 && iQ >= 0;
    if (!istoric && !pozitie) return { ok: false, eroare: "exportul n-are coloanele cunoscute", cantitati: null };
    var cant = {}, n = 0;
    for (var r = 1; r < tab.length; r++) {
      var row = tab[r], tk = String(row[iT] || "").trim();
      if (!tk) continue;
      if (istoric) {
        var act = String(row[iA] || "").trim().toLowerCase(), q = numarExport(row[iS]);
        if (q === null) continue;
        q = Math.abs(q);
        if (/buy/.test(act) && !/dividend/.test(act)) { cant[tk] = (cant[tk] || 0) + q; n++; }
        else if (/sell/.test(act)) { cant[tk] = (cant[tk] || 0) - q; n++; }
      } else {
        var qq = numarExport(row[iQ]);
        if (qq === null) continue;
        cant[tk] = (cant[tk] || 0) + qq; n++;
      }
    }
    if (!n) return { ok: false, eroare: istoric ? "exportul n-are cumpărări sau vânzări" : "exportul n-are cantități", cantitati: null };
    return { ok: true, eroare: null, cantitati: cant, fel: istoric ? "istoric" : "pozitii" };
  }
  // Trei coloane. Cheia se normalizează doar aici, ca AAPL să întâlnească AAPL_US_EQ. reconciliereT212 rămâne pe tickerul întreg.
  function treiCitiri(pozitiiApi, loturi, cantitatiExport) {
    var api = {}, jur = {}, exp = {};
    (pozitiiApi || []).forEach(function (p) {
      if (!p) return;
      var k = cheieTrei(p.ticker), q = nr(p.quantity);
      if (!k || !(q > 0)) return;
      api[k] = (api[k] || 0) + q;
    });
    var areJurnal = Array.isArray(loturi);
    if (areJurnal) loturi.forEach(function (l) {
      if (!l) return;
      var k = cheieTrei(l.ticker), q = nr(l.qty != null ? l.qty : l.quantity);
      if (!k || !(q > 0)) return;
      jur[k] = (jur[k] || 0) + q;
    });
    Object.keys(cantitatiExport || {}).forEach(function (t) {
      var k = cheieTrei(t), q = nr(cantitatiExport[t]);
      if (!k || q === null) return;
      exp[k] = (exp[k] || 0) + q;
    });
    var chei = {};
    Object.keys(api).forEach(function (k) { chei[k] = 1; });
    Object.keys(exp).forEach(function (k) { if (Math.abs(exp[k]) > 1e-9) chei[k] = 1; });
    if (areJurnal) Object.keys(jur).forEach(function (k) { chei[k] = 1; });
    var randuri = Object.keys(chei).sort().map(function (k) {
      var a = api[k] || 0, e = exp[k] || 0;
      return { ticker: k, api: a, jurnal: areJurnal ? (jur[k] || 0) : null, export: e, potrivit: acelasiPrag(a, e) };
    });
    var nePotrivit = randuri.some(function (r) { return !r.potrivit; });
    return { ok: !nePotrivit, nePotrivit: nePotrivit, randuri: randuri };
  }

  // ---------------- 6. randamentul ----------------
  // T212 refăcut din umpleri + închideri zilnice: P&L-ul zilei = valoarea de azi − valoarea de ieri − cumpărările nete + vânzările nete (lei);
  // capitalul zilei = valoarea de ieri + cumpărările (randamentul pe banii investiți, nu pe cash-ul care stă)
  // umpleri [{t, ticker, side, qty, net (lei)}], bare { ticker: [{t, c}] }, leiZi { moneda: { zi: lei } } (cursul din ziua aceea)
  function seriaT212(umpleri, bare, leiZi, o) {
    o = o || {};
    var u = (umpleri || []).filter(function (x) { return x && nr(x.qty) > 0 && nr(x.net) !== null; }).slice().sort(function (a, b) { return a.t - b.t; });
    if (!u.length) return [];
    var inchidere = {}; Object.keys(bare || {}).forEach(function (tk) { var m = {}; (bare[tk] || []).forEach(function (b) { if (b && nr(b.c) > 0) m[zi(b.t)] = b.c; }); inchidere[tk] = m; });
    // calitatea prețurilor: închiderea din ziua unei tranzacții trebuie să semene (±25 %) cu prețul plătit; altfel seria e a altui simbol sau
    // o împărțire de acțiuni (split) nereflectată ⇒ seria nu e de încredere, simbolul merge pe prețurile tranzacțiilor (numărat în `nepotrivite`)
    var nepotrivite = {};
    u.forEach(function (x) { var m = inchidere[x.ticker], c = m && m[zi(x.t)]; if (c && nr(x.pret) > 0 && Math.abs(x.pret / c - 1) > 0.25) nepotrivite[x.ticker] = 1; });
    Object.keys(nepotrivite).forEach(function (tk) { delete inchidere[tk]; });
    // cursul din ziua aceea (sau cel mai apropiat dinainte; înainte de primul curs cunoscut, primul curs - mai bine decât să pierzi ziua)
    var zileCurs = {}; Object.keys(leiZi || {}).forEach(function (m) { zileCurs[m] = Object.keys(leiZi[m] || {}).sort(); });
    var curs = function (moneda, z) { var m = moneda === "GBX" ? "GBP" : moneda, c = leiZi && leiZi[m], k = zileCurs[m]; if (!c || !k || !k.length) return null; var lo = 0, hi = k.length - 1, g = -1; while (lo <= hi) { var mid = (lo + hi) >> 1; if (k[mid] <= z) { g = mid; lo = mid + 1; } else hi = mid - 1; } return c[k[g >= 0 ? g : 0]]; };
    // un simbol fără prețuri (delistat, OTC dispărut din Yahoo) se ține la ultimul preț de TRANZACȚIE - aproximare numărată în `aprox`
    var faraCump = {}, ultimaInch = {}, ultimaTranz = {}, aproxTk = {}, q = {}, start = zi(u[0].t), pana = o.pana || zi(Date.now()), out = [], vIeri = 0, k = 0, ancorat = true;
    for (var t = Date.parse(start + "T00:00:00Z"); zi(t) <= pana; t += ZI) {
      var z = zi(t), cump = 0, vand = 0;
      while (k < u.length && zi(u[k].t) === z) { var x = u[k]; if (nr(x.pret) > 0) ultimaTranz[x.ticker] = nr(x.pret); if (x.side === "BUY") { q[x.ticker] = (q[x.ticker] || 0) + x.qty; cump += Math.abs(x.net); } else { var are = Math.max(0, q[x.ticker] || 0), luat = Math.min(are, x.qty); q[x.ticker] = are - luat; vand += Math.abs(x.net) * (x.qty > 0 ? luat / x.qty : 0); if (luat < x.qty - 1e-9) faraCump[x.ticker] = 1; } k++; }
      var v = 0, lipsa = false;
      Object.keys(q).forEach(function (tk) {
        if (q[tk] <= 1e-9) return;
        var c = inchidere[tk] && inchidere[tk][z]; if (c) ultimaInch[tk] = c; else c = ultimaInch[tk];
        if (!c && ultimaTranz[tk]) { c = ultimaTranz[tk]; if (!inchidere[tk]) aproxTk[tk] = 1; }
        var lei = c ? curs(monedaTicker(tk), z) : null; if (!c || !lei) { lipsa = true; return; }
        v += q[tk] * (monedaTicker(tk) === "GBX" ? c / 100 : c) * lei;
      });
      var cap = vIeri + cump;
      // după o zi lipsă (vIeri vechi), ziua bună doar reancorează valoarea - altfel câștigul tuturor zilelor lipsă ar ieși într-o singură zi
      if (!lipsa && ancorat && cap > 0) out.push({ z: z, pnl: v - vIeri - cump + vand, cap: cap, r: (v - vIeri - cump + vand) / cap, v: v });
      if (!lipsa) { vIeri = v; ancorat = true; } else ancorat = false;
    }
    out.aprox = Object.keys(aproxTk); out.nepotrivite = Object.keys(nepotrivite); out.faraCumparare = Object.keys(faraCump);
    return out;
  }
  // boții: rezultatul net al fiecăruia împărțit EGAL pe zilele lui (aproximare: istoria pe ore a poziției nu există) - volatilitatea iese mai
  // mică decât a fost, se spune; capitalul zilei = suma pusă a boților în viață în ziua aceea
  function seriaBoti(boti, leiZi, o) {
    o = o || {}; var p = {}, cap = {};
    (boti || []).forEach(function (b) {
      var a = nr(b.pornit), c = nr(b.inchis) || o.acum || Date.now(), inv = nr(b.investit), rez = nr(b.rezultat);
      if (!(a > 0) || !(c > a) || !(inv > 0) || rez === null) return;
      var zile = []; for (var t = Date.parse(zi(a) + "T00:00:00Z"); t <= c; t += ZI) zile.push(zi(t));
      zile.forEach(function (z) { p[z] = (p[z] || 0) + rez / zile.length; cap[z] = (cap[z] || 0) + inv; });
    });
    var c = leiZi && leiZi.USD, curs = function (z) { if (!c) return null; var best = null; Object.keys(c).forEach(function (k) { if (k <= z && (!best || k > best)) best = k; }); return best ? c[best] : null; };
    return Object.keys(cap).sort().map(function (z) { var l = curs(z); return l ? { z: z, pnl: p[z] * l, cap: cap[z] * l, r: p[z] / cap[z] } : null; }).filter(Boolean);
  }
  // seriile pe părți ⇒ o singură serie (P&L-urile se adună, capitalurile se adună)
  function combina(serii) {
    var m = {};
    serii.forEach(function (s) { (s || []).forEach(function (x) { var y = m[x.z] || (m[x.z] = { z: x.z, pnl: 0, cap: 0 }); y.pnl += x.pnl; y.cap += x.cap; }); });
    return Object.keys(m).sort().map(function (z) { var y = m[z]; return { z: z, pnl: y.pnl, cap: y.cap, r: y.cap > 0 ? y.pnl / y.cap : 0 }; });
  }
  // statisticile unei serii de randamente zilnice; anual = 365 (contul are și crypto, care merge și în weekend)
  function statistici(s, o) {
    o = o || {}; var l = (s || []).filter(function (x) { return x && isFinite(x.r); }), an = o.anual || 365;
    if (l.length < 20) return null;
    var r = l.map(function (x) { return x.r; }), m = medie(r), sd = abatere(r), jos = r.filter(function (x) { return x < 0; });
    var dd = Math.sqrt(jos.reduce(function (a, x) { return a + x * x; }, 0) / r.length);
    var cum = 1, varf = 1, maxDd = 0, ziMax = null; l.forEach(function (x) { cum *= 1 + x.r; if (cum > varf) varf = cum; var d = cum / varf - 1; if (d < maxDd) { maxDd = d; ziMax = x.z; } });
    var celMaiBun = null, celMaiRau = null; l.forEach(function (x) { if (!celMaiBun || x.r > celMaiBun.r) celMaiBun = x; if (!celMaiRau || x.r < celMaiRau.r) celMaiRau = x; });
    return { n: l.length, de: l[0].z, pana: l[l.length - 1].z, twr: cum - 1, anualizat: Math.pow(cum, an / l.length) - 1, vol: sd * Math.sqrt(an),
      sharpe: sd > 0 ? m / sd * Math.sqrt(an) : null, sortino: dd > 0 ? m / dd * Math.sqrt(an) : null, maxDd: maxDd, ziMaxDd: ziMax,
      pnl: l.reduce(function (a, x) { return a + (x.pnl || 0); }, 0), ziBuna: celMaiBun, ziRea: celMaiRau, zilePlus: r.filter(function (x) { return x > 0; }).length / r.length };
  }
  // față de un reper (BTC, S&P): randamentul lui pe aceleași zile și beta-ul contului față de el
  function fataDe(s, rep) {
    var z = (s || []).filter(function (x) { return rep && rep[x.z] !== undefined; }); if (z.length < 20) return null;
    var cum = 1, cumR = 1; z.forEach(function (x) { cum *= 1 + x.r; cumR *= 1 + rep[x.z]; });
    var a = z.map(function (x) { return x.r; }), b = z.map(function (x) { return rep[x.z]; }), ma = medie(a), mb = medie(b), cov = 0, vb = 0;
    for (var i = 0; i < a.length; i++) { cov += (a[i] - ma) * (b[i] - mb); vb += (b[i] - mb) * (b[i] - mb); }
    return { n: z.length, tu: cum - 1, reper: cumR - 1, beta: vb > 0 ? cov / vb : null, rho: corel(a, b) };
  }

  // ---------------- 7. execuția: prețul plănuit față de cel obținut ----------------
  // u = umplerile T212 (cu tip / creat / limita / stopPret de la v100.176); o = { leiZi: {USD: {zi: lei}}, bare: {ticker: [{t, c}]},
  //   sedinta(t, ticker) -> true dacă bursa era deschisă, planuri: {ticker: {stop, la}}, de: ms (fereastra, implicit un an) }
  // Fiecare parte numai pe umplerile care au datele ei; „mai rău” = negativ (ai plătit mai mult / ai primit mai puțin decât planul).
  function executie(u, o) {
    o = o || {}; var de = o.de || (Date.now() - 365 * ZI), l = (u || []).filter(function (x) { return x && x.t >= de && nr(x.qty) > 0 && nr(x.pret) > 0; });
    var lei = function (z) { var c = o.leiZi && o.leiZi.USD; if (!c) return null; var best = null; Object.keys(c).forEach(function (k) { if (k <= z && (!best || k > best)) best = k; }); return best ? c[best] : null; };
    var mediana = function (a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    // a) conversia valutară: comisionul T212 + cursul folosit față de BNR (doar umplerile în dolari, cu fxRate)
    var fee = 0, feePct = [], spread = [], nConv = 0;
    l.forEach(function (x) {
      if (nr(x.fee) > 0 && nr(x.net) > 0) { fee += x.fee; feePct.push(x.fee / x.net); nConv++; }
      var b = lei(zi(x.t)); if (nr(x.fx) > 0 && b && monedaTicker(x.ticker) === "USD") { var s = (1 / x.fx) / b - 1; spread.push(x.side === "BUY" ? -s : s); }
    });
    // b) ordinele stop: prețul obținut față de prețul de stop (vânzarea sub stop = alunecare)
    var stop = l.filter(function (x) { return (x.tip === "STOP" || x.tip === "STOP_LIMIT") && nr(x.stopPret) > 0; }).map(function (x) { var r = x.side === "SELL" ? x.pret / x.stopPret - 1 : x.stopPret / x.pret - 1; return { ticker: x.ticker, t: x.t, r: r, bani: x.qty * (x.side === "SELL" ? x.pret - x.stopPret : x.stopPret - x.pret) }; });
    // c) ordinele limită: obținut față de limită (≥ 0 = cel puțin cât ai cerut)
    var lim = l.filter(function (x) { return x.tip === "LIMIT" && nr(x.limita) > 0; }).map(function (x) { return x.side === "BUY" ? x.limita / x.pret - 1 : x.pret / x.limita - 1; });
    // d) ordinele la piață date cu bursa închisă și umplute la deschidere: prețul obținut față de ultima închidere dinaintea ordinului
    var peste = [];
    l.forEach(function (x) {
      if (x.tip !== "MARKET" || !(nr(x.creat) > 0) || !o.sedinta || o.sedinta(x.creat, x.ticker) || x.t - x.creat < 10 * 60000) return;
      var b = (o.bare && o.bare[x.ticker] || []).filter(function (y) { return y.t < x.creat - 6 * 3600000; }), ref = b.length ? b[b.length - 1].c : null;
      if (!(ref > 0)) return;
      var r = x.side === "BUY" ? ref / x.pret - 1 : x.pret / ref - 1;
      peste.push({ ticker: x.ticker, t: x.t, r: r, ore: (x.t - x.creat) / 3600000 });
    });
    // e) ieșirile sub stopul din planul tău: vânzările de după plan, sub stopul lui
    var plan = [];
    l.forEach(function (x) { var p = o.planuri && o.planuri[x.ticker]; if (x.side !== "SELL" || !p || !(nr(p.stop) > 0) || !(nr(p.la) > 0) || x.t < p.la || x.pret >= p.stop) return; plan.push({ ticker: x.ticker, t: x.t, r: x.pret / p.stop - 1, bani: x.qty * (x.pret - p.stop) }); });
    var rez = function (a, f) { var v = a.map(f || function (y) { return y; }); return v.length ? { n: v.length, mediana: mediana(v), cel: Math.min.apply(null, v) } : { n: 0, mediana: null, cel: null }; };
    return { n: l.length, cuTip: l.filter(function (x) { return x.tip; }).length,
      conversie: { n: nConv, lei: fee, mediana: mediana(feePct), fataBnr: spread.length ? { n: spread.length, mediana: mediana(spread) } : null },
      stop: Object.assign(rez(stop, function (y) { return y.r; }), { bani: stop.reduce(function (a, y) { return a + y.bani; }, 0), cele: stop.sort(function (a, b) { return a.r - b.r; }).slice(0, 5) }),
      limita: rez(lim), pesteNoapte: Object.assign(rez(peste, function (y) { return y.r; }), { cele: peste.sort(function (a, b) { return a.r - b.r; }).slice(0, 5) }),
      subPlan: Object.assign(rez(plan, function (y) { return y.r; }), { bani: plan.reduce(function (a, y) { return a + y.bani; }, 0), cele: plan.sort(function (a, b) { return a.r - b.r; }).slice(0, 5) }) };
  }

  return { ZI: ZI, CRIZE: CRIZE, executie: executie, setMonede: setMonede, extremFereastra: extremFereastra, monedaTicker: monedaTicker, inLei: inLei, dinBot: dinBot, dinT212: dinT212, dinSalt: dinSalt, valoare: valoare,
    randamente: randamente, pnlIstoric: pnlIstoric, varEs: varEs, ziuaCeaMaiRea: cuDatele, corel: corel, corelatii: corelatii, diversificare: diversificare,
    randFereastra: randFereastra, beta: beta, pnlBot: pnlBot, scenariu: scenariu, stres: stres,
    reconciliereT212: reconciliereT212, reconciliereArhiva: reconciliereArhiva, reconciliereUrmarire: reconciliereUrmarire,
    margine: margine, notaSplit: notaSplit, citesteExport: citesteExport, treiCitiri: treiCitiri, acelasiPrag: acelasiPrag,
    seriaT212: seriaT212, seriaBoti: seriaBoti, combina: combina, statistici: statistici, fataDe: fataDe, medie: medie, abatere: abatere };
})();
