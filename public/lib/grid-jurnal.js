// Jurnalul gridurilor - modul pur (fara DOM, fara retea), probat in scripts/grid-v78.mjs.
//
// De ce exista: fisa "Grid: ce setez acum?" da un verdict si o setare. Fara jurnal,
// nu aflam niciodata daca verdictele 🟢 au adus bani. Aici: cand omul apasa
// "am pornit botul cu setarea asta", se retine fisa; cand la Pionex apare un bot pe
// aceeasi moneda, pornit in jurul acelui moment, se leaga de el; rezultatul real
// (profitTotal din bot) se pune langa ce a zis proba. Dupa 10-20 de boti, rezumatul
// pe verdict spune cinstit daca unealta ajuta.
//
// Lipsa ramane null (nu 0): un rezultat necunoscut nu e "zero".
var GridJurnal = (function () {
  "use strict";
  var INLOCUIRE_MS = 10 * 60000;        // a apasat de doua ori pe aceeasi moneda
  var LEAGA_INAINTE_MS = 6 * 3600000;   // botul poate fi pornit putin inaintea fisei (a calculat dupa)
  var LEAGA_DUPA_MS = 12 * 3600000;     // sau in cele 12 ore de dupa

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // "MET_USDT_PERP" si "MET.PERP" -> "MET"
  function moneda(s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$/, "").replace(/\.PERP$/, "").replace(/USDT$/, ""); }

  function citeste(text) {
    var v = null;
    try { v = JSON.parse(text || "null"); } catch (e) { v = null; }
    if (!Array.isArray(v)) return [];
    return v.filter(function (e) { return e && typeof e === "object" && e.id && e.simbol; });
  }

  function adauga(lista, f, acum) {
    lista = Array.isArray(lista) ? lista.slice() : [];
    var st = f.setare || {}, pe = f.proba && f.proba.pe && f.proba.pe[f.dir], a = pe && pe.antren, t = pe && pe.test;
    var e = {
      id: String(acum) + "-" + moneda(f.simbol), t: acum, simbol: f.simbol, dir: f.dir, H: f.H, pret: nr(f.pret),
      verdict: f.verdict && f.verdict.nivel || null, suma: nr(st.suma),
      jos: nr(st.jos), sus: nr(st.sus), grile: nr(st.grile), levier: nr(st.levier),
      mediana: a ? nr(a.mediana) : null, ceaMaiProasta: a ? nr(a.ceaMaiProasta) : null, medianaNevazut: t ? nr(t.mediana) : null,
      botId: null, activ: null, investit: null, rezultat: null, inchisLa: null, actualizatLa: null
    };
    // apasat de doua ori in 10 minute pe aceeasi moneda, fara bot legat -> o inlocuieste
    var fara = lista.filter(function (x) { return !(x.botId === null && moneda(x.simbol) === moneda(f.simbol) && acum - x.t < INLOCUIRE_MS); });
    fara.push(e);
    return fara;
  }

  // boti = lista normalizata de /api/bot-orders (poate contine si boti inchisi);
  // null/ne-lista = citire picata -> nu schimbam nimic (nici nu "inchidem" boti).
  function actualizeaza(lista, boti, acum) {
    if (!Array.isArray(lista)) return [];
    if (!Array.isArray(boti)) return lista.slice();
    var legati = {};
    lista.forEach(function (e) { if (e.botId) legati[e.botId] = true; });
    var peId = {};
    boti.forEach(function (b) { if (b && b.id) peId[String(b.id)] = b; });
    return lista.map(function (e0) {
      var e = {}; for (var k in e0) e[k] = e0[k];
      if (!e.botId) {
        for (var i = 0; i < boti.length; i++) {
          var b = boti[i];
          if (!b || !b.id || legati[String(b.id)] || moneda(b.baza) !== moneda(e.simbol)) continue;
          var p = nr(b.pornitLa);
          if (p === null || p < e.t - LEAGA_INAINTE_MS || p > e.t + LEAGA_DUPA_MS) continue;
          e.botId = String(b.id); legati[e.botId] = true; break;
        }
      }
      if (e.botId) {
        var bot = peId[e.botId];
        if (bot) {
          e.activ = bot.activ !== false;
          if (nr(bot.investit) !== null) e.investit = nr(bot.investit);
          if (nr(bot.profitTotal) !== null) e.rezultat = nr(bot.profitTotal);
          e.inchisLa = bot.activ === false ? (nr(bot.inchisLa) !== null ? nr(bot.inchisLa) : (e.inchisLa || acum)) : null;
        } else if (!e.inchisLa) { e.inchisLa = acum; e.activ = false; }
        else e.activ = false;
        e.actualizatLa = acum;
      }
      return e;
    });
  }

  function rezumat(lista) {
    var out = { total: 0 };
    ["porneste", "asteapta", "nu", "fara-date"].forEach(function (v) { out[v] = { n: 0, legate: 0, pePlus: 0, sumaPct: 0, mediaPct: null }; });
    (Array.isArray(lista) ? lista : []).forEach(function (e) {
      var v = out[e.verdict] || out["fara-date"];
      v.n++; out.total++;
      var baza = e.investit !== null && e.investit > 0 ? e.investit : e.suma;
      if (e.botId && e.rezultat !== null && baza > 0) {
        v.legate++; v.sumaPct += e.rezultat / baza; if (e.rezultat > 0) v.pePlus++;
      }
    });
    Object.keys(out).forEach(function (k) { var v = out[k]; if (v && typeof v === "object") v.mediaPct = v.legate ? v.sumaPct / v.legate : null; });
    return out;
  }

  return { citeste: citeste, adauga: adauga, actualizeaza: actualizeaza, rezumat: rezumat, moneda: moneda };
})();
if (typeof globalThis !== "undefined") globalThis.GridJurnal = GridJurnal;
