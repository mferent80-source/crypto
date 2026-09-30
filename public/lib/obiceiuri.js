// Obiceiurile (v84) - modul pur, probat in scripts/obiceiuri-v84.mjs. Se incarca DUPA
// grid-calcul.js, grid-proba.js si jurnal-trade.js.
//
// De ce: pe botii lui reali, banii s-au pierdut la PORNIRE (daca asculta de fisa: -21,45 -> -0,99).
//   poarta          - regulile de dinainte de pornire, fiecare cu cat l-a costat in jurnal
//   portofoliu      - riscul tuturor botilor deodata (4 long pe alts = un singur pariu)
//   raportDuminica  - saptamana, greseala scumpa, o singura regula pentru saptamana urmatoare
//   reguliPersonale - de la 30 de boti: unde pierde EL (ore, monede, durate, directie)
//   hartie          - botul de hartie: setarea din fisa, simulata pe preturile de dupa pornire
var Obiceiuri = (function () {
  "use strict";
  var G = GridCalcul, ZI = 86400000;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + " USDT"; };
  var P = function (v) { return (v * 100).toFixed(0) + "%"; };
  function moneda(s) { return String(s || "").toUpperCase().replace(/_USDT_PERP$/, "").replace(/\.PERP$/, ""); }
  function costDin(trades, cod) {
    var g = JurnalTrade.rezumat(trades || []).greseli.filter(function (x) { return x.cod === cod; })[0];
    return g ? "în jurnalul tău: " + g.n + " boți, rezultat " + U(g.cost) : null;
  }

  // v100.29 (30.09, el: „fa idei”): istoricul tau pe moneda, pe toata istoria (arhiva de acasa). Simetric: spune si unde castigi;
  // avertizeaza - nu refuza - doar de la 3 boti inchisi cu net pe minus. Net = realizat + comisioane + funding.
  function netDe(t) { return nr(t.rezultat) + (nr(t.comisioane) || 0) + (nr(t.funding) || 0); }
  function ziua(t) { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(0, 10); } }
  function istoricMoneda(trades, m) {
    var l = (Array.isArray(trades) ? trades : []).filter(function (t) { return t && t.moneda === m && nr(t.rezultat) !== null; });
    var net = 0, plus = 0, rau = null;
    l.forEach(function (t) { var v = netDe(t); net += v; if (v > 0) plus++; if (!rau || v < rau.v) rau = { v: v, t: t.inchis }; });
    var n = l.length, rata = n ? plus / n : null, avertizare = n >= 3 && net < 0, text;
    if (!n) text = "N-ai mai avut boți închiși pe " + m + ".";
    else if (avertizare) text = (rata >= 0.5 ? "Pe " + m + " câștigi des (" + P(rata) + "), dar pierderile mari mănâncă tot: " : "Pe " + m + " pierzi: ") + n + " boți, " + plus + " pe plus, net " + U(net) + (rau ? "; cel mai rău " + U(rau.v) + " pe " + ziua(rau.t) : "") + ".";
    else text = "Pe " + m + ": " + n + (n === 1 ? " bot" : " boți") + ", " + plus + " pe plus (" + P(rata) + "), net " + U(net) + "." + (n < 3 ? " Prea puțini ca să spun ceva." : "");
    return { n: n, plus: plus, rata: rata, net: net, avertizare: avertizare, text: text };
  }
  // inchiderile din prima ora (pe istoria lui, 30.09: 1469 de boti, net −2.065 USDT) - de la 10, doar cand pierd; cu comisioanele lor
  function subOOra(trades) {
    var l = (Array.isArray(trades) ? trades : []).filter(function (t) { return t && nr(t.rezultat) !== null && nr(t.durataOre) !== null && t.durataOre < 1; });
    if (l.length < 10) return null;
    var net = 0, plus = 0, com = 0;
    l.forEach(function (t) { var v = netDe(t); net += v; if (v > 0) plus++; com += nr(t.comisioane) || 0; });
    if (net >= 0) return null;
    return { n: l.length, net: net, comisioane: com, text: "Boții închiși în prima oră: " + l.length + ", " + P(plus / l.length) + " pe plus, net " + U(net) + " (din care comisioane " + U(com) + "). Închiderile repezi costă mai ales în comisioane." };
  }
  function poarta(o) {
    // v100.30 (30.09, el: „fa 1/2/3”): istoricul si reintrarea dupa numele BOTULUI (o.numeBot = baseCurrency din lista oficiala Pionex):
    // tickerul LIT_USDT_PERP are botul „LIGHTER.PERP” (la fel PUMP→PUMPFUN, 0G→ZEROG, NEIRO→NEIROCTO...)
    var f = o.fisa || {}, acum = o.acum || Date.now(), tk = moneda(f.simbol), m = o.numeBot ? moneda(o.numeBot) : tk, R = [];
    var v = f.verdict && f.verdict.nivel;
    R.push({ cod: "verde", ok: v === "porneste", text: v === "porneste" ? "Fișa zice 🟢 PORNEȘTE." : "Fișa zice " + (v === "nu" ? "🔴 NU PORNI" : v === "asteapta" ? "🟡 AȘTEAPTĂ" : "că n-are date") + (f.verdict && f.verdict.motive && f.verdict.motive[0] ? ": " + f.verdict.motive[0] : "") + ".",
      cost: "pe boții tăi închiși: doar pe 🟢 ar fi fost −0,99 în loc de −21,45 USDT" });
    var ult = (o.trades || []).filter(function (t) { return t.moneda === m; }).sort(function (a, b) { return b.inchis - a.inchis; })[0];
    var min = ult ? (acum - ult.inchis) / 60000 : null, reOk = min === null || min >= 10;
    R.push({ cod: "reintrare", ok: reOk, text: reOk ? (ult ? "Ultimul bot pe " + m + " s-a închis acum " + (min >= 120 ? Math.round(min / 60) + " ore" : Math.round(min) + " min") + "." : "N-ai mai avut bot pe " + m + ".") : "Ultimul bot pe " + m + " s-a închis acum " + Math.round(min) + " min: e o repornire imediată.", cost: costDin(o.trades, "reintrare") });
    var sig = nr(f.setare && f.setare.levierSigur), lev = nr(o.levier), lvOk = sig === null || lev === null || lev <= sig;
    R.push({ cod: "levier", ok: lvOk, text: lev === null ? "Levierul: cel propus de fișă." : "Levier " + lev + "×" + (sig !== null ? (lvOk ? ", sub cel sigur (" + sig + "×)." : ", peste cel sigur azi (" + sig + "×).") : "."), cost: costDin(o.trades, "levier-peste-sigur") });
    var d = f.directie, dir = o.dir || f.dir, contra = d && (d.tarie === "tare" || d.tarie === "mediu") && ((dir === "long" && d.dir === "short") || (dir === "short" && d.dir === "long"));
    R.push({ cod: "contra-trend", ok: !contra, text: contra ? "Botul " + dir + " ar fi contra trendului (" + d.dir + ", " + d.tarie + ")." : "Direcția nu e contra trendului.", cost: costDin(o.trades, "pozitia-a-mancat-grilele") });
    var pl = o.plan, plOk = !!(pl && (nr(pl.plus) > 0 || nr(pl.minus) > 0));
    R.push({ cod: "plan", ok: plOk, text: plOk ? "Ai planul de ieșire: " + [nr(pl.plus) > 0 ? "plus " + pl.plus : null, nr(pl.minus) > 0 ? "minus " + pl.minus : null, nr(pl.afaraOre) > 0 ? "afară " + pl.afaraOre + " h" : null].filter(Boolean).join(", ") + "." : "N-ai scris când ieși (pe plus / pe minus): hotărât la rece e mai ușor.", cost: null });
    var im = istoricMoneda(o.trades, m);
    R.push({ cod: "moneda", ok: !im.avertizare, text: im.text + (m !== tk ? " (" + tk + " se numește " + m + " la boții Pionex)" : "") });
    var so = subOOra(o.trades);
    return { trecut: R.every(function (r) { return r.ok; }), reguli: R, sfaturi: so ? [so.text] : [] };
  }

  function portofoliu(boti, sold) {
    var a = (Array.isArray(boti) ? boti : []).filter(function (b) { return b && b.activ !== false; });
    var out = { n: a.length, peParte: { long: 0, short: 0, neutru: 0 }, expunere: 0, expunerePeSold: null, soc10: 0, lichidatiLaSoc: [], acelasiPariu: false };
    a.forEach(function (b) {
      var d = String(b.directie || "").toLowerCase(); d = d === "long" || d === "short" ? d : "neutru";
      out.peParte[d]++;
      var inv = nr(b.investit), lev = nr(b.levier) || 1, q = nr(b.pozitie), p = nr(b.pretCurent);
      if (inv !== null) out.expunere += inv * lev;
      if (q !== null && p !== null) {
        var qs = d === "long" ? Math.abs(q) : d === "short" ? -Math.abs(q) : q;
        out.soc10 += qs * p * -0.10;
      }
      var lj = nr(b.lichidareJos);
      if (d !== "short" && lj !== null && p !== null && lj >= p * 0.9) out.lichidatiLaSoc.push(moneda(b.baza));
    });
    if (nr(sold) > 0) out.expunerePeSold = out.expunere / nr(sold);
    out.acelasiPariu = out.n >= 2 && Math.max(out.peParte.long, out.peParte.short) > out.n / 2;
    return out;
  }

  function raportDuminica(o) {
    var acum = o.acum || Date.now(), sapt = (o.trades || []).filter(function (t) { return t.inchis > acum - 7 * ZI && t.inchis <= acum; });
    var r = JurnalTrade.rezumat(sapt), linii = [];
    var out = { n: r.n, total: r.total, pePlus: r.pePlus, regula: null, linii: linii };
    if (!r.n) { linii.push("Săptămâna asta niciun bot închis."); return out; }
    linii.push("Săptămâna: " + r.n + " boți închiși, total " + U(r.total) + ", " + r.pePlus + " pe plus (" + P(r.pePlus / r.n) + ").");
    linii.push("Din grile " + U(r.grile) + ", din poziție " + U(r.pozitie) + ", comisioane și funding " + U(r.comisioane + r.funding) + ".");
    var g = r.greseli[0];
    if (g) linii.push("Greșeala cea mai scumpă: „" + g.titlu + "” — " + g.n + " boți, " + U(g.cost) + ".");
    var s = o.socoteala || {}, sk = Object.keys(s).filter(function (k) { return s[k] && s[k].judecate > 0; });
    linii.push(sk.length ? "Semnalele: " + sk.map(function (k) { return k + " " + s[k].corecte + "/" + s[k].judecate; }).join(", ") + " au avut dreptate." : "Semnalele: încă nimic judecat.");
    if (o.laborator && Array.isArray(o.laborator.intrebari)) {
      var dov = o.laborator.intrebari.filter(function (q) { return q.verdict === "dovedit"; });
      linii.push(dov.length ? "Laboratorul a DOVEDIT: " + dov.map(function (q) { return q.titlu; }).join("; ") + "." : "Laboratorul: nimic dovedit încă.");
    }
    if (g && g.cost < 0) out.regula = "Regula săptămânii — „" + g.titlu + "”: " + g.dataViitoare;
    else out.regula = "Regula săptămânii: pornește doar pe 🟢 și scrie-ți planul de ieșire înainte.";
    linii.push(out.regula);
    return out;
  }

  function reguliPersonale(trades, tz) {
    var l = Array.isArray(trades) ? trades.filter(function (t) { return t && nr(t.rezultat) !== null; }) : [];
    if (l.length < 30) return { suficient: false, lipsa: 30 - l.length, n: l.length, reguli: [] };
    var f; try { f = new Intl.DateTimeFormat("en-GB", { timeZone: tz || "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }); } catch (e) { f = null; }
    var ora = function (t) { var h = f ? Number(f.format(new Date(t))) : new Date(t).getHours(); return h < 6 ? "00–06" : h < 12 ? "06–12" : h < 18 ? "12–18" : "18–24"; };
    var dur = function (h) { return h < 1 ? "sub o oră" : h < 6 ? "1–6 ore" : "peste 6 ore"; };
    var grupe = {};
    var pune = function (cheie, t) { var g = grupe[cheie] || (grupe[cheie] = { grupa: cheie, n: 0, plus: 0, total: 0 }); g.n++; g.total += t.rezultat; if (t.rezultat > 0) g.plus++; };
    l.forEach(function (t) { pune("pornite între " + ora(t.pornit), t); pune("pe " + t.moneda, t); pune("ținute " + dur(t.durataOre), t); pune("pe " + t.dir, t); });
    var rata = l.filter(function (t) { return t.rezultat > 0; }).length / l.length;
    var reguli = Object.keys(grupe).map(function (k) { return grupe[k]; }).filter(function (g) { return g.n >= 5 && G.wilson(g.plus, g.n)[1] < rata; })
      .sort(function (a, b) { return a.total - b.total; })
      .map(function (g) { return { grupa: g.grupa, n: g.n, pePlus: g.plus / g.n, total: g.total, text: "Boții " + g.grupa + ": " + g.plus + " din " + g.n + " pe plus (" + P(g.plus / g.n) + ", față de " + P(rata) + " în general), total " + U(g.total) + "." }; });
    return { suficient: true, lipsa: 0, n: l.length, rata: rata, reguli: reguli };
  }

  // botul de hartie: {setare:{dir,jos,sus,grile,levier,suma,stop?}, pornit}; bare = lumanari 15M (bare())
  function hartie(h, bare) {
    var b = (Array.isArray(bare) ? bare : []).filter(function (x) { return x.t >= h.pornit; });
    if (!b.length) return { bare: 0, net: null, usdt: null };
    var s = h.setare, st = { dir: s.dir, jos: s.jos, sus: s.sus, grile: s.grile, levier: s.levier, stop: s.stop || null };
    var r = GridProba.simuleaza(b, 0, b.length, st);
    return { bare: b.length, net: r.net, usdt: r.net * (nr(s.suma) || 0), oprit: r.oprit, lichidat: r.lichidat, iesiri: r.iesiri, umpleri: r.umpleri, pretAcum: b[b.length - 1].c };
  }

  return { poarta: poarta, istoricMoneda: istoricMoneda, subOOra: subOOra, portofoliu: portofoliu, raportDuminica: raportDuminica, reguliPersonale: reguliPersonale, hartie: hartie };
})();
if (typeof globalThis !== "undefined") globalThis.Obiceiuri = Obiceiuri;
