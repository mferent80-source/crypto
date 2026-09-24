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
    // id-ul ajunge in atribute HTML: doar litere, cifre, - si _
    return v.filter(function (e) { return e && typeof e === "object" && typeof e.id === "string" && /^[A-Za-z0-9_-]+$/.test(e.id) && e.simbol; });
  }

  function adauga(lista, f, acum) {
    lista = Array.isArray(lista) ? lista.slice() : [];
    var st = f.setare || {}, pe = f.proba && f.proba.pe && f.proba.pe[f.dir], a = pe && pe.antren, t = pe && pe.test;
    var e = {
      id: String(acum) + "-" + moneda(f.simbol).replace(/[^A-Z0-9]/g, ""), t: acum, simbol: f.simbol, dir: f.dir, H: f.H, pret: nr(f.pret),
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
          // fisa e pe PERP: se leaga doar de un bot futures (baza "X.PERP"), nu de unul spot pe aceeasi moneda
          var fisaPerp = /_PERP$/i.test(String(e.simbol)), botPerp = /\.PERP$/i.test(String(b.baza || ""));
          if (fisaPerp !== botPerp) continue;
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

  function wilson(k, n) {
    if (!(n > 0)) return [0, 1];
    var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
  }
  function stat(l, T) {
    var x = l.filter(function (e) { return T === null || e.mediana >= T; });
    var plus = x.filter(function (e) { return e.pct > 0; }).length, s = 0;
    x.forEach(function (e) { s += e.pct; });
    return { n: x.length, pePlus: x.length ? plus / x.length : null, medie: x.length ? s / x.length : null };
  }
  // Calibrarea din rezultatele LUI (v79.4). Cazuri = boti legati si INCHISI, cu rezultat si
  // mediana de proba. Sub 30 nu se propune nimic. Peste: pragul "mediana verde" se alege pe
  // primele 2/3 (in timp) - cel mai mic prag cu cea mai buna medie, minim 5 boti luati - si
  // se verifica pe ultima treime, nevazuta. Se PROPUNE; nu se schimba singur.
  function calibrare(lista, pragActual) {
    var inchise = (Array.isArray(lista) ? lista : []).filter(function (e) {
      var baza = e && (e.investit > 0 ? e.investit : e.suma);
      return e && e.botId && e.activ === false && e.rezultat !== null && e.rezultat !== undefined && e.mediana !== null && e.mediana !== undefined && baza > 0;
    }).map(function (e) { var baza = e.investit > 0 ? e.investit : e.suma; return { t: e.t, verdict: e.verdict, mediana: e.mediana, pct: e.rezultat / baza }; })
      .sort(function (a, b) { return a.t - b.t; });
    var n = inchise.length, out = { n: n, lipsa: Math.max(0, 30 - n), suficient: n >= 30, peVerdict: {}, actual: pragActual, propus: null, antren: null, test: null, confirmat: false };
    ["porneste", "asteapta", "nu"].forEach(function (v) {
      var x = inchise.filter(function (e) { return e.verdict === v; }), k = x.filter(function (e) { return e.pct > 0; }).length;
      out.peVerdict[v] = { n: x.length, pePlus: k, ic: wilson(k, x.length) };
    });
    if (!out.suficient) return out;
    var nA = Math.floor(n * 2 / 3), A = inchise.slice(0, nA), B = inchise.slice(nA);
    var cand = A.map(function (e) { return e.mediana; }).concat([pragActual]).sort(function (a, b) { return a - b; });
    var best = null;
    cand.forEach(function (T) {
      var st = stat(A, T);
      if (st.n < 5) return;
      if (!best || st.medie > best.st.medie + 1e-12) best = { T: T, st: st };
    });
    if (!best) return out;
    out.propus = best.T;
    out.antren = { cuActual: stat(A, pragActual), cuPropus: best.st };
    out.test = { cuActual: stat(B, pragActual), cuPropus: stat(B, best.T) };
    var ta = out.test.cuActual, tp = out.test.cuPropus;
    out.confirmat = best.T !== pragActual && tp.n >= 3 && ta.medie !== null && tp.medie > ta.medie && tp.pePlus >= ta.pePlus
      && (tp.medie - ta.medie) >= 0.5 * (out.antren.cuPropus.medie - out.antren.cuActual.medie)
      // si nu din noroc: marginea de jos (Wilson 95%) a ratei pe plus cu pragul propus trece de rata cu pragul de acum
      && wilson(Math.round(tp.pePlus * tp.n), tp.n)[0] > ta.pePlus;
    out.test.icPropus = wilson(Math.round(tp.pePlus * tp.n), tp.n);
    return out;
  }

  return { citeste: citeste, adauga: adauga, actualizeaza: actualizeaza, rezumat: rezumat, moneda: moneda, calibrare: calibrare };
})();
if (typeof globalThis !== "undefined") globalThis.GridJurnal = GridJurnal;
