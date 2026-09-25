// Trading 212 (Invest) - calculele din istoricul ordinelor (v85). Modul pur, probat in
// scripts/t212-v85.mjs. Forma verificata pe contul lui (25.09): items[{order, fill}], fill.walletImpact
// in moneda contului (RON) cu netValue, fxRate si taxes (CURRENCY_CONVERSION_FEE).
//   umpleri(items)  -> [{t, side, ticker, simbol, nume, qty, pret (USD), net (RON), fee (RON), ext}]
//   perechi(umpleri)-> FIFO pe ticker: {inchise:[trade], deschise:[lot], faraCumparare:[umplere]}
//   candidati(ticker) -> simbolurile americane de incercat la preturi
// Doar long (regula lui pentru actiuni). Lipsa ramane lipsa, nu 0.
var T212 = (function () {
  "use strict";
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // T212 pastreaza simbolul SPAC-ului de dinainte de listare (verificat pe numele din ordinele lui, 25.09)
  var REDENUMIT = { NPA: "ASTS", XPOA: "QBTS", IPOB: "OPEN", ALUS: "TE", GWAC: "CIFR", SATS: "ECHO", FB: "META" };
  function candidati(ticker) {
    var m = String(ticker || "").match(/^([A-Za-z0-9.]+?)_+US_EQ$/);
    if (!m) return [];
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

  return { umpleri: umpleri, perechi: perechi, candidati: candidati, simbol: simbol, dividende: dividende, dataRezultate: dataRezultate };
})();
if (typeof globalThis !== "undefined") globalThis.T212 = T212;
