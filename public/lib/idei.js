// Idei de cumparare (v90): actiunile care trec de poarta si botii candidati din clasament, cu istoricul LUI.
// Modul pur, probat in scripts/idei-v90.mjs. Un FILTRU care te tine departe de situatiile proaste, nu o predictie:
// pe cele 965 de trade-uri ale lui, "doar pe verde" ar fi adus mai putin decat a facut singur (+4.390 vs +6.416).
// De aceea ideile se si URMARESC (urmarire): dupa ~30 se poate spune cu cifre daca merita urmate.
var Idei = (function () {
  "use strict";
  var AS = typeof ActiuniSemnale !== "undefined" ? ActiuniSemnale : globalThis.ActiuniSemnale;
  var ZI = 86400000, COST_CONV = 0.003, TRAIL = 0.15;
  function stat(l) { var n = l.length, p = 0, t = 0; l.forEach(function (x) { t += x.rezultat || 0; if (x.rezultat > 0) p++; }); return { n: n, pePlus: p, total: t }; }
  function ziScurta(iso) { var x = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return x ? x[3] + "." + x[2] : "—"; }
  function P(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }

  // bare zilnice (GridCalcul.bare), pretul de acum; o: {rezultate: "YYYY-MM-DD"|null, acum}
  function judecaActiune(bare, pret, o) {
    o = o || {};
    var b = Array.isArray(bare) ? bare : [];
    if (b.length < 120 || !(pret > 0)) return { trece: false, scor: null, motive: ["prea puține zile de prețuri"] };
    var st = AS.stare(b, pret), v = AS.poarta({ stare: st, plan: null, faraPlan: true });
    if (v.nivel !== "cumpara") return { trece: false, scor: null, motive: v.motive.length ? v.motive : ["poarta nu zice cumpăr"] };
    var n = AS.niveluri(b, pret, {});
    if (n.nivel !== "ok" || !n.intrare) return { trece: false, scor: null, motive: [n.motiv || n.intrareMotiv || "fără preț de intrare"] };
    if (n.proba.medie === null || n.proba.medie <= 0) return { trece: false, scor: null, motive: ["pe istoricul ei, în starea de acum, intrările n-au ieșit pe plus în medie"] };
    var z = o.rezultate ? Math.ceil((Date.parse(o.rezultate + "T12:00:00Z") - (o.acum || Date.now())) / ZI) : null;
    if (z !== null && z >= 0 && z <= 10) return { trece: false, scor: null, motive: ["își anunță rezultatele pe " + ziScurta(o.rezultate) + " (peste " + z + " zile): prețul poate sări"] };
    var intrare = n.intrare.pret;
    return { trece: true, scor: n.proba.medie, pret: pret, intrare: intrare, stop: intrare * (1 - TRAIL), tinta: n.tinta,
      pePlusProba: n.proba.pePlus, nProba: n.proba.n, rezultate: o.rezultate || null,
      motive: ["trend în sus pe zilnice (" + st.trend.tarie + ")", "fără mișcare mare, " + P(st.distMax7z) + " față de maximul pe 7 zile",
        "pe istoricul ei, intrările în starea asta: " + Math.round(n.proba.pePlus * 100) + "% pe plus, " + P(n.proba.medie) + " în medie (" + n.proba.n + " zile)"] };
  }
  // l: [{ticker, simbol?, r: judecaActiune(...)}]; inchise: T212.perechi().inchise (istoricul lui pe fiecare)
  function alegeActiuni(l, n, inchise) {
    var inch = Array.isArray(inchise) ? inchise : [];
    return (Array.isArray(l) ? l : []).filter(function (x) { return x && x.r && x.r.trece; })
      .sort(function (a, b) { return b.r.scor - a.r.scor; }).slice(0, n || 5)
      .map(function (x) { return Object.assign({ ticker: x.ticker, simbol: x.simbol || String(x.ticker).split("_")[0], istoric: stat(inch.filter(function (t) { return t.ticker === x.ticker; })) }, x.r); });
  }
  // clasamentul colectorului (istoric-bot?action=clasament) + botii lui inchisi (JurnalTrade.din)
  function ideiBoti(cl, trades, n) {
    var m = cl && Array.isArray(cl.monede) ? cl.monede : [], tr = Array.isArray(trades) ? trades : [];
    return m.filter(function (x) { return x && x.stare === "candidat"; }).sort(function (a, b) { return (b.scor || 0) - (a.scor || 0); }).slice(0, n || 5)
      .map(function (x) { var mo = String(x.simbol || "").replace(/_USDT_PERP$/, "").replace(/_USDT$/, ""); return Object.assign({ moneda: mo, istoric: stat(tr.filter(function (t) { return t && t.moneda === mo; })) }, x); });
  }
  // istoricul ideilor [{zi, ticker, pret}] + preturile de acum {ticker: pret}: cat au facut de la pretul ideii
  function urmarire(ist, preturi, acum) {
    var l = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && x.pret > 0 && preturi && preturi[x.ticker] > 0 && (acum || Date.now()) - Date.parse(x.zi + "T12:00:00Z") >= 5 * ZI; });
    var r = l.map(function (x) { return preturi[x.ticker] / x.pret - 1 - COST_CONV; }), p = r.filter(function (v) { return v > 0; }).length, s = 0;
    r.forEach(function (v) { s += v; });
    var o = { n: r.length, pePlus: p, medie: r.length ? s / r.length : null };
    o.text = !o.n ? "Ideile se urmăresc de azi: după ~30 se poate spune dacă merită urmate." : "Din " + o.n + " idei de cel puțin 5 zile: " + p + " pe plus, " + P(o.medie) + " în medie de la prețul ideii, după comision" + (o.n < 30 ? " (puține — mai așteaptă)" : "") + ".";
    return o;
  }
  return { judecaActiune: judecaActiune, alegeActiuni: alegeActiuni, ideiBoti: ideiBoti, urmarire: urmarire };
})();
if (typeof globalThis !== "undefined") globalThis.Idei = Idei;
