// Jurnalul de trade (v81) - botii de grid INCHISI, adusi automat din Pionex (status=finished).
// Modul pur, probat in scripts/jurnal-trade-v81.mjs pe botii lui reali. Se incarca DUPA grid-calcul.js.
//
// Pentru fiecare bot: ce, cat, cat a stat, din ce a venit rezultatul (grile / pozitie /
// comisioane / funding) si GRESELILE gasite automat, fiecare cu "data viitoare" concret
// (el: "decizia e mereu la mine, asa ca ia initiativa"). Lipsa ramane lipsa, nu 0.
var JurnalTrade = (function () {
  "use strict";
  var G = GridCalcul, C = G.C, REINTRARE_MS = 10 * 60000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function moneda(base) { return String(base || "").toUpperCase().replace(/\.PERP$/, ""); }
  var P = function (v) { return (v * 100).toFixed(2).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + " USDT"; };

  function unul(x) {
    var d = x && x.buOrderData || {};
    var pornit = nr(x && x.createTime), inchis = nr(x && x.closeTime), rez = nr(d.totalRealizedProfit);
    if (pornit === null || inchis === null || rez === null) return null;
    var jos = nr(d.bottom), sus = nr(d.top), N = nr(d.row), inv = nr(d.usdtInvestment), lev = nr(d.leverage);
    var mod = String(d.gridType || "").toLowerCase() === "geometric" ? "geometric" : "aritmetic";
    var init = nr(d.initPrice), inch = nr(d.closedPrice), dir = String(d.trend || "").toLowerCase();
    dir = dir === "long" || dir === "short" ? dir : "neutru";
    var grile = nr(d.gridProfit), com = nr(d.totalFee), fund = nr(d.totalFundingFee);
    var pasNet = null;
    if (jos > 0 && sus > jos && N >= 2) {
      var pasPct = mod === "aritmetic" ? (sus - jos) / N / ((jos + sus) / 2) : Math.pow(sus / jos, 1 / N) - 1;
      pasNet = pasPct - 2 * C.COMISION;
    }
    return {
      id: String(x.strategyId || x.buOrderId || pornit), moneda: moneda(x.base), dir: dir, levier: lev, investit: inv,
      pornit: pornit, inchis: inchis, durataOre: (inchis - pornit) / 3600000,
      jos: jos, sus: sus, grileN: N, mod: mod, pasNet: pasNet, pretInit: init, pretInchidere: inch,
      stopJos: nr(d.lossStop), rezultat: rez, pct: inv > 0 ? rez / inv : null,
      grile: grile, comisioane: com, funding: fund,
      pozitie: grile !== null && com !== null ? rez - grile - com - (fund || 0) : null,
      greseli: []
    };
  }

  function greseli(t, toate) {
    var g = [];
    // reintrare: acelasi coin, pornit la <10 min dupa ce s-a inchis altul
    var ant = toate.filter(function (o) { return o !== t && o.moneda === t.moneda && o.inchis <= t.pornit && t.pornit - o.inchis < REINTRARE_MS; })[0];
    if (ant) g.push({ cod: "reintrare", titlu: "Repornit imediat pe aceeași monedă",
      text: "Pornit la " + Math.round((t.pornit - ant.inchis) / 60000) + " min după ce botul anterior pe " + t.moneda + " s-a închis (" + U(ant.rezultat) + ").",
      dataViitoare: "Aș lăsa măcar o oră și aș porni doar dacă fișa zice 🟢; repornirea imediată e de obicei o reacție, nu un plan." });
    if (t.grile !== null && t.grile > 0 && t.rezultat < 0) g.push({ cod: "pozitia-a-mancat-grilele", titlu: "Poziția a mâncat grilele",
      text: "Grilele au făcut " + U(t.grile) + ", dar poziția " + (t.pozitie !== null ? U(t.pozitie) : "a pierdut mai mult") + ": prețul a mers împotriva direcției botului.",
      dataViitoare: t.dir === "neutru" ? "Aș lărgi intervalul sau aș pune stop mai aproape." : "Aș verifica trendul pe 4h și 1z înainte (în fișă) și n-aș porni " + t.dir + " contra lui; sau aș porni neutru." });
    if (t.pasNet !== null && t.pasNet < C.PAS_MIN - 2 * C.COMISION) g.push({ cod: "grile-prea-dese", titlu: "Grile prea dese",
      text: t.grileN + " grile " + t.mod + " lăsau " + P(t.pasNet) + " pe umplere după comision (fișa cere cel puțin " + P(C.PAS_MIN - 2 * C.COMISION) + ").",
      dataViitoare: "Aș pune mai puține grile (pasul din fișă), ca fiecare umplere să rămână clar peste comision." });
    var afara = t.pretInchidere !== null && t.jos !== null && t.sus !== null && (t.pretInchidere < t.jos || t.pretInchidere > t.sus);
    if (afara) g.push({ cod: "stop-atins", titlu: "A ieșit din grid" + (t.stopJos !== null && t.dir !== "short" && t.pretInchidere <= t.stopJos ? " și a atins stopul" : ""),
      text: "Închis la " + t.pretInchidere + ", în afara intervalului " + t.jos + " – " + t.sus + ".",
      dataViitoare: "Aș alege intervalul din fișă (lățimea obișnuită pe 2 zile a monedei), nu mai îngust; un interval strâmt iese la prima mișcare." });
    if (t.levier !== null && t.jos > 0 && t.sus > t.jos && t.grileN >= 2 && t.pretInit > 0) {
      var sig = G.levierSigur(t.jos, t.sus, t.pretInit, t.dir, Math.min(150, t.grileN));
      if (t.levier > sig.levier) g.push({ cod: "levier-peste-sigur", titlu: "Levier peste cel sigur",
        text: t.levier + "× pe un interval de " + P((t.sus - t.jos) / t.pretInit) + ": sigur ar fi fost " + sig.levier + "× (lichidarea la o lățime de interval dincolo de margine).",
        dataViitoare: "Aș lua levierul propus de fișă (" + sig.levier + "× pentru intervalul ăsta)." });
    }
    if (t.funding !== null && t.investit > 0 && t.funding < -0.005 * t.investit) g.push({ cod: "funding-platit", titlu: "Funding plătit mult",
      text: "Funding " + U(t.funding) + " (" + P(t.funding / t.investit) + " din investiție) în " + t.durataOre.toFixed(1).replace(".", ",") + " ore.",
      dataViitoare: "Aș verifica rata de funding înainte; pe direcția care plătește, aș ține botul mai puțin sau cu levier mai mic." });
    return g;
  }

  function din(boti) {
    if (!Array.isArray(boti)) return [];
    var l = boti.map(unul).filter(Boolean);
    l.forEach(function (t) { t.greseli = greseli(t, l); });
    return l.sort(function (a, b) { return b.inchis - a.inchis; });
  }

  function rezumat(l) {
    l = Array.isArray(l) ? l : [];
    var r = { n: l.length, pePlus: 0, total: 0, grile: 0, pozitie: 0, comisioane: 0, funding: 0, investitMediu: null, greseli: [] }, inv = 0, pe = {};
    l.forEach(function (t) {
      if (t.rezultat > 0) r.pePlus++;
      r.total += t.rezultat; r.grile += t.grile || 0; r.pozitie += t.pozitie || 0; r.comisioane += t.comisioane || 0; r.funding += t.funding || 0; inv += t.investit || 0;
      t.greseli.forEach(function (g) { var x = pe[g.cod] || (pe[g.cod] = { cod: g.cod, titlu: g.titlu.replace(/ și a atins stopul$/, ""), n: 0, cost: 0, dataViitoare: g.dataViitoare }); x.n++; x.cost += t.rezultat; });
    });
    r.investitMediu = l.length ? inv / l.length : null;
    r.greseli = Object.keys(pe).map(function (k) { return pe[k]; }).sort(function (a, b) { return a.cost - b.cost; });
    return r;
  }

  return { din: din, rezumat: rezumat, moneda: moneda };
})();
if (typeof globalThis !== "undefined") globalThis.JurnalTrade = JurnalTrade;
