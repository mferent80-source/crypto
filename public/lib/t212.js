// Trading 212 (Invest) - calculele din istoricul ordinelor (v85). Modul pur, probat in
// scripts/t212-v85.mjs. Forma verificata pe contul lui (25.09): items[{order, fill}], fill.walletImpact
// in moneda contului (RON) cu netValue, fxRate si taxes (CURRENCY_CONVERSION_FEE).
//   umpleri(items)  -> [{t, side, ticker, simbol, nume, qty, pret (USD), net (RON), fee (RON), ext}]
//   perechi(umpleri)-> FIFO pe ticker: {inchise:[trade], deschise:[lot], faraCumparare:[umplere]}
//   candidati(ticker) -> simbolurile americane de incercat la preturi
// Doar long (regula lui pentru actiuni). Lipsa ramane lipsa, nu 0.
var T212 = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // T212 pastreaza simbolul SPAC-ului de dinainte de listare (verificat pe numele din ordinele lui, 25.09)
  var REDENUMIT = { NPA: "ASTS", XPOA: "QBTS", IPOB: "OPEN", ALUS: "TE", GWAC: "CIFR", SATS: "ECHO", FB: "META" };
  // v88: bursele europene / Canada. T212 pune litera bursei la coada simbolului (VUSAl = Londra) sau tara in mijloc.
  var BURSA = { l: ".L", d: ".DE", p: ".PA", a: ".AS", s: ".SW", m: ".MI" }, TARA = { AT: ".VI", CA: ".TO" };
  function candidati(ticker) {
    var t = String(ticker || ""), m = t.match(/^([A-Za-z0-9.]+?)_+US_EQ$/);
    if (!m) {
      var e = t.match(/^([A-Z0-9]+)([a-z])_EQ$/);
      if (e && BURSA[e[2]]) { var b = e[1], o = [b + BURSA[e[2]]], f = b.replace(/\d+$/, ""); if (f && f !== b) o.push(f + BURSA[e[2]]); return o; }
      var c = t.match(/^([A-Z0-9]+)_(AT|CA)_EQ$/);
      return c ? [c[1] + TARA[c[2]]] : [];
    }
    var s = m[1].toUpperCase().replace(/\./g, "-"), out = [s], fara = s.replace(/\d+$/, "");
    if (fara && fara !== s) out.push(fara);
    if (REDENUMIT[s]) out.unshift(REDENUMIT[s]);
    return out;
  }
  function simbol(ticker) {
    var c = candidati(ticker); if (!c.length) return String(ticker || "").split("_")[0];
    var s = String(ticker).split("_")[0].toUpperCase();
    return REDENUMIT[s] || c[c.length - 1];
  }

  function umpleri(items) {
    var out = [];
    (Array.isArray(items) ? items : []).forEach(function (x) {
      var o = x && x.order, f = x && x.fill;
      if (!o || !f || o.status !== "FILLED") return;
      // la vanzari cantitatea vine NEGATIVA (verificat pe contul lui, 25.09)
      var side = String(o.side || "").toUpperCase(), q0 = nr(f.quantity), q = q0 === null ? null : Math.abs(q0), p = nr(f.price), t = Date.parse(f.filledAt || o.createdAt);
      var w = f.walletImpact || {}, net = nr(w.netValue);
      if ((side !== "BUY" && side !== "SELL") || !(q > 0) || !(p > 0) || !isFinite(t) || net === null) return;
      var fee = 0; (Array.isArray(w.taxes) ? w.taxes : []).forEach(function (tx) { var v = nr(tx && tx.quantity); if (v !== null) fee += Math.abs(v); });
      out.push({ id: String(f.id || o.id), t: t, side: side, ticker: o.ticker, simbol: simbol(o.ticker), nume: o.instrument && o.instrument.name || o.ticker,
        qty: q, pret: p, net: Math.abs(net), fee: fee, moneda: w.currency || null, fx: nr(w.fxRate), ext: !!o.extendedHours,
        realizat: side === "SELL" ? nr(w.realisedProfitLoss) : null });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }

  // FIFO pe ticker. netValue INCLUDE deja comisionul de conversie (verificat pe toate cele 792 de
  // umpleri ale lui, 25.09: cumparare = brut + comision, vanzare = brut - comision) => cost = net,
  // incasat = net. Un trade = o vanzare (poate inchide mai multe loturi).
  // ATENTIE: realisedProfitLoss al T212 NU scade comisioanele de conversie (verificat 25.09 pe 78 de perechi
  // simple: oficial = net vanzare - net cumparare + comisioane, la leu). Rezultatul REAL = oficial - comisioanele
  // cumpararii (partea vanduta) - comisionul vanzarii. Oficialul ramane ca rezultatOficial, FIFO ca verificare.
  function perechi(u) {
    var loturi = {}, inchise = [], fara = [];
    (Array.isArray(u) ? u : []).forEach(function (x) {
      var L = loturi[x.ticker] || (loturi[x.ticker] = []);
      if (x.side === "BUY") { L.push({ t: x.t, ramas: x.qty, qty: x.qty, costBuc: x.net / x.qty, feeBuc: x.fee / x.qty, pretBuc: x.pret, ext: x.ext, id: x.id }); return; }
      var ramas = x.qty, cost = 0, luat = 0, pornit = null, pretCump = 0, extCump = false, feeCump = 0;
      while (ramas > 1e-9 && L.length) {
        var lot = L[0], q = Math.min(ramas, lot.ramas);
        cost += q * lot.costBuc; feeCump += q * lot.feeBuc; pretCump += q * lot.pretBuc; luat += q; ramas -= q; lot.ramas -= q;
        if (pornit === null) pornit = lot.t; extCump = extCump || lot.ext;
        if (lot.ramas <= 1e-9) L.shift();
      }
      if (luat <= 1e-9) { fara.push(x); return; }
      var incasat = x.net * (luat / x.qty), fifo = incasat - cost;
      var parte = luat / x.qty, areOficial = x.realizat !== null && x.realizat !== undefined, comisioane = feeCump + x.fee * parte;
      var oficial = areOficial ? x.realizat * parte : null, rez = areOficial ? oficial - comisioane : fifo;
      inchise.push({ id: x.id, ticker: x.ticker, simbol: x.simbol, nume: x.nume, qty: luat, pornit: pornit, inchis: x.t, durataOre: (x.t - pornit) / 3600000,
        cost: cost, incasat: incasat, rezultat: rez, rezultatOficial: oficial, rezultatFifo: fifo, comisioane: comisioane, oficial: areOficial, pct: cost > 0 ? rez / cost : null,
        pretCumparare: pretCump / luat, pretVanzare: x.pret, extCumparare: extCump, extVanzare: x.ext, partial: ramas > 1e-9 });
      if (ramas > 1e-9) fara.push(Object.assign({}, x, { qty: ramas }));
    });
    var deschise = [];
    Object.keys(loturi).forEach(function (k) { loturi[k].forEach(function (l) { if (l.ramas > 1e-9) deschise.push({ ticker: k, t: l.t, qty: l.ramas, costBuc: l.costBuc, pretBuc: l.pretBuc }); }); });
    return { inchise: inchise.sort(function (a, b) { return b.inchis - a.inchis; }), deschise: deschise, faraCumparare: fara };
  }

  // v87: dividendele (T212 /history/dividends, suma in moneda contului)
  function dividende(items) {
    var r = { total: 0, n: 0, peActiune: {}, ultima: null };
    (Array.isArray(items) ? items : []).forEach(function (x) {
      var a = x && nr(x.amount); if (a === null || !x.ticker) return;
      r.total += a; r.n++; r.peActiune[x.ticker] = (r.peActiune[x.ticker] || 0) + a;
      var t = Date.parse(x.paidOn || ""); if (isFinite(t) && (r.ultima === null || t > r.ultima)) r.ultima = t;
    });
    return r;
  }
  // v87: data rezultatelor trimestriale din raspunsul Nasdaq (api.nasdaq.com/api/analyst/<S>/earnings-date)
  function dataRezultate(j) {
    var t = j && j.data && j.data.reportText; if (typeof t !== "string") return null;
    var m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return null;
    return { data: m[3] + "-" + m[1] + "-" + m[2], sigur: !/estimated|expected/i.test(t) };
  }

  // v91: raportul pentru Declaratia Unica - pe anul INCHIDERII (vanzarii). T212: castiguri / pierderi / net in lei,
  // dupa comisioanele de conversie (costuri), + dividendele anului. Pionex separat, in USDT (conversia in lei se face
  // cu cursul BNR din ziua fiecarei inchideri - de verificat cu contabilul, ca si cotele de impozit).
  function ziRo(t) {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); }
    catch (e) { return new Date(t + 3 * 3600000).toISOString().slice(0, 10); }
  }
  function raportAnual(o) {
    o = o || {};
    var an = o.an, ani = {};
    function aniDin(t) { var y = new Date(t).getUTCFullYear(); if (isFinite(y)) ani[y] = 1; return y; }
    // v100.28 (30.09, el: „fa idei”): Pionex si in LEI - fiecare bot la cursul BNR (USD) din ziua inchiderii dupa ora Romaniei
    // (weekend / sarbatoare -> ultimul curs publicat inainte); USDT socotit ca USD. Anul botului tot dupa ora Romaniei.
    var zileCurs = o.cursUsd && typeof o.cursUsd === "object" ? Object.keys(o.cursUsd).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k) && nr(o.cursUsd[k]) > 0; }).sort() : null;
    function cursPe(zi) { var lo = 0, hi = zileCurs.length - 1, gasit = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (zileCurs[m] <= zi) { gasit = m; lo = m + 1; } else hi = m - 1; } return gasit < 0 ? null : { zi: zileCurs[gasit], curs: nr(o.cursUsd[zileCurs[gasit]]) }; }
    var t = { n: 0, castiguri: 0, pierderi: 0, net: 0, comisioane: 0, dividende: 0, randuri: [] }, px = { n: 0, net: 0, lei: zileCurs && zileCurs.length ? 0 : null, faraCurs: 0, randuri: [] };
    // v100.34: si randul fiecarei vanzari / fiecarui dividend, pentru CSV-ul contabilului (anul ramane socotit ca pana acum)
    (o.inchise || []).forEach(function (x) { if (!x || !(x.inchis > 0)) return; if (aniDin(x.inchis) !== an) return; t.n++; var r = x.rezultat || 0; if (r >= 0) t.castiguri += r; else t.pierderi += r; t.net += r; t.comisioane += x.comisioane || 0;
      t.randuri.push({ tip: "vânzare", inchis: x.inchis, zi: ziRo(x.inchis), instrument: String(x.simbol || simbol(x.ticker) || ""), cantitate: nr(x.qty), cost: nr(x.cost), incasat: nr(x.incasat), rezultat: r }); });
    (o.dividende || []).forEach(function (x) { var z = Date.parse(x && x.paidOn || ""); if (!isFinite(z)) return; if (aniDin(z) !== an) return; var v = nr(x.amount); if (v !== null) { t.dividende += v; t.randuri.push({ tip: "dividend", inchis: z, zi: ziRo(z), instrument: String(simbol(x.ticker) || ""), cantitate: null, cost: null, incasat: null, rezultat: v }); } });
    // v100.23 (revizie): NET = realizat + comisioane + funding (realizatul Pionex e fara costuri; banii primiti inapoi o dovedesc)
    (o.boti || []).forEach(function (x) {
      if (!x || !(x.inchis > 0)) return;
      var zi = ziRo(x.inchis), y = Number(zi.slice(0, 4)); ani[y] = 1; if (y !== an) return;
      var v = (x.rezultat || 0) + (x.comisioane || 0) + (x.funding || 0); px.n++; px.net += v;
      // v100.31: si randul botului, pentru CSV-ul contabilului (ziua si cursul BNR folosit)
      var c = px.lei !== null ? cursPe(zi) : null;
      if (px.lei !== null) { if (c) px.lei += v * c.curs; else px.faraCurs++; }
      px.randuri.push({ inchis: x.inchis, zi: zi, moneda: String(x.moneda || ""), tip: x.tip || "futures grid", net: v, ziCurs: c ? c.zi : null, curs: c ? c.curs : null, lei: c ? v * c.curs : null });
    });
    var r = { an: an, t212: t, pionex: px, ani: Object.keys(ani).map(Number).sort(function (a, b) { return b - a; }) };
    var L = function (v) { return (v >= 0 ? "+" : "-") + Math.abs(v).toFixed(2).replace(".", ",") + " lei"; };   // v100.40: minus ASCII (Excel nu ia „−” drept numar)
    r.text = "Anul " + an + "\nTrading 212 (acțiuni, în lei, după comisioanele de conversie): " + cate(t.n, "vânzare", "vânzări") + " · câștiguri " + L(t.castiguri) + " · pierderi " + L(t.pierderi) + " · NET " + L(t.net) + " · comisioane " + L(-t.comisioane).replace("+", "") + " · dividende " + L(t.dividende)
      + "\nPionex (boți, în USDT): " + cate(px.n, "bot închis", "boți închiși") + " · NET " + (px.net >= 0 ? "+" : "-") + Math.abs(px.net).toFixed(2) + " USDT"
      + (px.lei !== null ? " ≈ " + L(px.lei) + " (curs BNR USD din ziua fiecărei închideri, ora României; USDT socotit ca USD" + (px.faraCurs ? "; " + cate(px.faraCurs, "bot", "boți") + " fără curs, " + (px.faraCurs === 1 ? "lăsat" : "lăsați") + " afară din lei" : "") + ")" : "");
    return r;
  }

  // v100.31 (30.09, el: „fa 1/2/3”): CSV pentru contabil - un rand pe bot Pionex din anul raportului (cel mai vechi primul), apoi TOTAL.
  // Excel romanesc: separator ; si zecimale cu virgula; fara curs -> celule goale (nu 0).
  function csvPionex(r) {
    var p = r && r.pionex || {}, l = (p.randuri || []).slice().sort(function (a, b) { return a.inchis - b.inchis; });
    var n = function (v, z) { return v === null || v === undefined || !isFinite(v) ? "" : v.toFixed(z).replace(".", ","); };
    var q = function (v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };   // v100.40: fara formule (=, +, -, @) in Excel
    var out = ["data_inchiderii;moneda;tip;rezultat_usdt;ziua_cursului_bnr;curs_bnr_usd;rezultat_lei"];
    l.forEach(function (x) { out.push([x.zi, q(x.moneda), q(x.tip), n(x.net, 2), x.ziCurs || "", n(x.curs, 4), n(x.lei, 2)].join(";")); });
    out.push(["TOTAL", "", "", n(p.net || 0, 2), "", "", p.lei === null || p.lei === undefined ? "" : n(p.lei, 2)].join(";"));
    return out.join("\n") + "\n";
  }

  // v100.34 (30.09, el: „fa idei”): UN SINGUR CSV pentru contabil - vanzarile Trading 212 (lei, cum le da T212), dividendele, botii
  // Pionex (USDT + ziua si cursul BNR + lei); TOTAL pe fiecare sursa (nu unul general: categorii diferite la impozit).
  function csvDeclaratie(r) {
    var t = r && r.t212 || {}, p = r && r.pionex || {}, dupaData = function (a, b) { return a.inchis - b.inchis; };
    var n = function (v, z) { return v === null || v === undefined || !isFinite(v) ? "" : (z == null ? String(v) : v.toFixed(z)).replace(".", ","); };
    var q = function (v) { v = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };   // v100.40: fara formule (=, +, -, @) in Excel
    var out = ["sursa;tip;data;instrument;cantitate;cost_lei;incasat_lei;rezultat;moneda;ziua_cursului_bnr;curs_bnr_usd;rezultat_lei"];
    var tr = (t.randuri || []).slice().sort(dupaData);
    tr.filter(function (x) { return x.tip === "vânzare"; }).concat(tr.filter(function (x) { return x.tip === "dividend"; })).forEach(function (x) {
      // v100.40 (audit 30.09): costul din CSV e cel care SE LEAGA cu rezultatul (incasat − rezultat) - rezultatul e cel oficial T212 minus
      // comisioanele, iar costul FIFO al loturilor nu avea aceleasi ajustari -> cost + rezultat ≠ incasat la multe vanzari
      var costLeg = x.tip === "vânzare" && x.incasat !== null && x.incasat !== undefined && isFinite(x.incasat) ? x.incasat - x.rezultat : x.cost;
      out.push(["Trading 212", x.tip, x.zi, q(x.instrument), n(x.cantitate), n(costLeg, 2), n(x.incasat, 2), n(x.rezultat, 2), "lei", "", "", n(x.rezultat, 2)].join(";"));
    });
    (p.randuri || []).slice().sort(dupaData).forEach(function (x) {
      out.push(["Pionex", q(x.tip), x.zi, q(x.moneda), "", "", "", n(x.net, 2), "USDT", x.ziCurs || "", n(x.curs, 4), n(x.lei, 2)].join(";"));
    });
    out.push(["TOTAL Trading 212 vânzări", "", "", "", "", "", "", n(t.net || 0, 2), "lei", "", "", n(t.net || 0, 2)].join(";"));
    out.push(["TOTAL Trading 212 dividende", "", "", "", "", "", "", n(t.dividende || 0, 2), "lei", "", "", n(t.dividende || 0, 2)].join(";"));
    out.push(["TOTAL Pionex", "", "", "", "", "", "", n(p.net || 0, 2), "USDT", "", "", p.lei === null || p.lei === undefined ? "" : n(p.lei, 2)].join(";"));
    return out.join("\n") + "\n";
  }

  return { raportAnual: raportAnual, csvPionex: csvPionex, csvDeclaratie: csvDeclaratie, umpleri: umpleri, perechi: perechi, candidati: candidati, simbol: simbol, dividende: dividende, dataRezultate: dataRezultate };
})();
if (typeof globalThis !== "undefined") globalThis.T212 = T212;
