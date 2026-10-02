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
    return { n: n, plus: plus, rata: rata, net: net, avertizare: avertizare, text: text, rau: rau };   // v100.70: + rau {v, t} (avertizarea la pornire il scrie singura)
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
    // v100.43 (I-468): frana contului - rand in poarta (avertizare, nu blocare: pornirea pe hartie ramane)
    if (o.frana) R.push({ cod: "frana", ok: !o.frana.activa, text: o.frana.text });
    // v100.45 (I-475): planul potrivit monedei - cat de des o zi obisnuita ajunge la stopul planului (din profilul monedei)
    if (o.planMoneda && o.planMoneda.text) R.push({ cod: "plan-moneda", ok: !o.planMoneda.avertizare, text: o.planMoneda.text });
    var so = subOOra(o.trades);
    // v100.47 (I-469 + pachetul 2b): situatiile asemanatoare pe botii lui si probabilitatile pe gridul propus - informatie, nu reguli
    var sf = so ? [so.text] : [];
    if (o.asemanatoare && o.asemanatoare.text) sf.push("👥 " + o.asemanatoare.text);
    if (o.sansa) sf.push(String(o.sansa));
    return { trecut: R.every(function (r) { return r.ok; }), reguli: R, sfaturi: sf };
  }

  // ---- v100.43 (I-468): FRANA CONTULUI pe botii reali. Pragurile lui (implicit −20 USDT pe zi, −60 pe 7 zile, 3 inchisi pe minus la
  // rand). Ziua = ziua Romaniei; 7 zile = ultimele 7 x 24 h. Net = inchisii (realizat + comisioane + funding) + pierderea celor deschisi
  // (doar partea pe minus a totalului lor). Avertizeaza (alerta + rand in poarta), nu blocheaza - „pragul botului e un privilegiu”.
  var FRANA_IMPLICIT = { zi: 20, sapt: 60, rand: 3 };
  function inceputZiRo(t) {
    try {
      var p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date(t));
      var v = function (k) { return Number((p.filter(function (x) { return x.type === k; })[0] || {}).value); };
      return t - (((v("hour") % 24) * 60 + v("minute")) * 60 + v("second")) * 1000 - (t % 1000);
    } catch (e) { return Math.floor(t / ZI) * ZI; }
  }
  function praguriFrana(p) { p = p || {}; return { zi: nr(p.zi) > 0 ? nr(p.zi) : FRANA_IMPLICIT.zi, sapt: nr(p.sapt) > 0 ? nr(p.sapt) : FRANA_IMPLICIT.sapt, rand: nr(p.rand) > 0 ? Math.round(nr(p.rand)) : FRANA_IMPLICIT.rand }; }
  function netT(t) { return nr(t.net) !== null ? nr(t.net) : netDe(t); }
  function frana(o) {
    o = o || {}; var acum = o.acum || Date.now(), P0 = praguriFrana(o.praguri), z0 = inceputZiRo(acum);
    var l = (Array.isArray(o.trades) ? o.trades : []).filter(function (t) { return t && nr(t.inchis) !== null && netT(t) !== null; });
    var deschis = 0; (Array.isArray(o.deschise) ? o.deschise : []).forEach(function (b) { var v = nr(b && b.profitTotal); if (b && b.activ !== false && v !== null && v < 0) deschis += v; });
    var netZi = deschis, netSapt = deschis, nZi = 0;
    l.forEach(function (t) { if (t.inchis >= z0 && t.inchis <= acum) { netZi += netT(t); nZi++; } if (t.inchis > acum - 7 * ZI && t.inchis <= acum) netSapt += netT(t); });
    var ord = l.filter(function (t) { return t.inchis <= acum; }).sort(function (a, b) { return b.inchis - a.inchis; }), rand = 0;
    for (var i = 0; i < ord.length && netT(ord[i]) < 0; i++) rand++;
    var dep = [];
    if (netZi <= -P0.zi) dep.push({ cod: "zi", text: "azi " + U(netZi) + " (pragul tău: −" + P0.zi + ")" });
    if (netSapt <= -P0.sapt) dep.push({ cod: "sapt", text: "pe 7 zile " + U(netSapt) + " (pragul: −" + P0.sapt + ")" });
    if (rand >= P0.rand && ord.length && acum - ord[0].inchis < ZI) dep.push({ cod: "rand", text: rand + " boți închiși pe minus la rând (pragul: " + P0.rand + ")" });
    var text = dep.length ? "Frâna contului: gata pe azi — " + dep.map(function (d) { return d.text; }).join("; ") + ". N-aș mai porni boți azi; mâine, cu capul limpede."
      : "Frâna contului: azi " + U(netZi) + " din −" + P0.zi + ", pe 7 zile " + U(netSapt) + " din −" + P0.sapt + (rand ? ", " + rand + " pe minus la rând" : "") + ".";
    return { netZi: netZi, netSapt: netSapt, deschis: deschis, inchiseAzi: nZi, rand: rand, depasit: dep, activa: dep.length > 0, praguri: P0, text: text };
  }
  // I-468: cat ar fi economisit frana pe istorie - botii PORNITI dupa ce frana suna (in ziua / saptamana / seria aceea) n-ar mai fi pornit.
  // Pe inchisi, in-sample: e o ipoteza (spusa asa pe ecran), nu o promisiune.
  function franaIstoric(trades, praguri) {
    var P0 = praguriFrana(praguri), l = (Array.isArray(trades) ? trades : []).filter(function (t) { return t && nr(t.inchis) !== null && nr(t.pornit) !== null && netT(t) !== null; })
      .sort(function (a, b) { return a.pornit - b.pornit; }), sarite = 0, economisit = 0, cedat = 0;
    l.forEach(function (t) {
      var inainte = l.filter(function (x) { return x !== t && x.inchis <= t.pornit; });
      var f = frana({ trades: inainte, deschise: [], acum: t.pornit, praguri: P0 });
      if (f.activa) { sarite++; economisit += -netT(t); if (netT(t) > 0) cedat += netT(t); }
    });
    return { sarite: sarite, economisit: economisit, cedat: cedat, n: l.length, praguri: P0,
      text: sarite ? "Pe istoria ta, frâna ar fi oprit " + sarite + " din " + l.length + " porniri: " + U(economisit) + " (ai fi pierdut și " + U(cedat).replace("+", "") + " câștiguri). Ipoteză pe trecut, nu promisiune." : "Pe istoria ta, frâna n-ar fi oprit nicio pornire." };
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
    var out = { n: r.n, total: r.total, net: r.net, pePlus: r.pePlusNet, regula: null, linii: linii };
    if (!r.n) { linii.push("Săptămâna asta niciun bot închis."); return out; }
    // v100.40: totalul NET (dupa comisioane si funding) si cati au iesit pe plus NET; brutul Pionex in paranteza
    linii.push("Săptămâna: " + r.n + " boți închiși, net " + U(r.net) + " (înainte de comisioane și funding " + U(r.total) + "), " + r.pePlusNet + " pe plus (" + P(r.pePlusNet / r.n) + ").");
    linii.push("Din grile " + U(r.grile) + ", din poziție " + U(r.pozitie) + ", comisioane și funding " + U(r.comisioane + r.funding) + ".");
    var g = r.greseli[0];
    if (g) linii.push("Greșeala cea mai scumpă: „" + g.titlu + "” — " + g.n + " boți, " + U(g.cost) + ".");
    var s = o.socoteala || {}, sk = Object.keys(s).filter(function (k) { return s[k] && s[k].judecate > 0; });
    linii.push(sk.length ? "Semnalele: " + sk.map(function (k) { return (s[k].nume || k) + " " + s[k].corecte + "/" + s[k].judecate; }).join(", ") + " au avut dreptate." : "Semnalele: încă nimic judecat.");
    // v100.43 (I-466): cel mai util si cel mai inutil sfat, pe bani (doar cele cu cel putin 10 cazuri judecate)
    var cuBani = sk.filter(function (k) { return s[k].judecate >= 10 && s[k].baniN > 0; }).sort(function (a, b) { return s[b].bani - s[a].bani; });
    if (cuBani.length) linii.push("Cel mai util sfat: " + (s[cuBani[0]].nume || cuBani[0]) + " (" + U(s[cuBani[0]].bani) + " dacă-l urmai)" + (cuBani.length > 1 && s[cuBani[cuBani.length - 1]].bani < 0 ? "; cel mai inutil: " + (s[cuBani[cuBani.length - 1]].nume || cuBani[cuBani.length - 1]) + " (" + U(s[cuBani[cuBani.length - 1]].bani) + ")" : "") + ".");
    // v100.51 (I-478): autopsia sfaturilor gresite + tiparul repetat (regula propusa, ipoteza)
    if (o.autopsie && Array.isArray(o.autopsie.linii) && o.autopsie.linii.length) { linii.push("Autopsia săptămânii — sfaturile care te-ar fi costat cel mai mult:"); o.autopsie.linii.forEach(function (l) { linii.push("• " + l); }); }
    if (o.laborator && Array.isArray(o.laborator.intrebari)) {
      var dov = o.laborator.intrebari.filter(function (q) { return q.verdict === "dovedit"; });
      linii.push(dov.length ? "Laboratorul a DOVEDIT: " + dov.map(function (q) { return q.titlu; }).join("; ") + "." : "Laboratorul: nimic dovedit încă.");
    }
    if (g && g.cost < 0) out.regula = "Regula săptămânii — „" + g.titlu + "”: " + g.dataViitoare;
    else out.regula = "Regula săptămânii: pornește doar pe 🟢 și scrie-ți planul de ieșire înainte.";
    linii.push(out.regula);
    return out;
  }

  // v100.51 (I-478): autopsia - cele mai scumpe 3 sfaturi gresite ale saptamanii (judecate in ultimele 7 zile), cu starea pietei de atunci si
  // ce a urmat; pe 30 de zile, tiparul repetat (acelasi sfat in aceeasi stare: ≥ 5 judecate, ≥ 3 gresite, ≥ 60% gresite, pe minus) devine o
  // regula PROPUSA - ipoteza, nicio regula schimbata fara cererea lui. cost < 0 = cat te-ar fi costat daca-l urmai.
  // loguri = [{ id, moneda, log: jurnalul de semnale al botului }]
  function autopsie(loguri, acum) {
    acum = acum || Date.now();
    var ET = typeof Probabilitati !== "undefined" && Probabilitati.ETICHETE || {}, NS = typeof SemnaleBot !== "undefined" && SemnaleBot.NUME_SFAT || {};
    var stai = function (e) { return e.nivel === "tine" || e.cod === "podea" || e.cod === "cu-botul"; }, toate = [];
    (Array.isArray(loguri) ? loguri : []).forEach(function (L) {
      (L && Array.isArray(L.log) ? L.log : []).forEach(function (e) {
        if (!e || (e.dreptate !== true && e.dreptate !== false)) return;
        var a = nr(e.total), d = nr(e.totalDupa); if (a === null || d === null) return;
        toate.push({ moneda: L.moneda || "?", cod: e.cod, nivel: e.nivel, motiv: e.motiv || e.cod, t: e.t, la: nr(e.judecatLa) || e.t, stare: e.stare || null,
          total: a, totalDupa: d, gresit: e.dreptate === false, cost: Math.round((stai(e) ? d - a : a - d) * 100) / 100 });
      });
    });
    var f; try { f = new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); } catch (x) { f = null; }
    var cand = function (t) { return f ? f.format(new Date(t)) : new Date(t).toISOString().slice(5, 16).replace("T", " "); };
    var scumpe = toate.filter(function (x) { return x.gresit && x.cost < 0 && x.la > acum - 7 * ZI && x.la <= acum; }).sort(function (a, b) { return a.cost - b.cost; }).slice(0, 3);
    var linii = scumpe.length ? scumpe.map(function (x) {
      return "„" + x.motiv + "” pe " + x.moneda + " (" + cand(x.t) + "): starea de atunci: " + (x.stare ? (ET[x.stare] || x.stare) : "nenotată (sfat dinainte de 01.10)") +
        "; după: totalul de la " + U(x.total) + " la " + U(x.totalDupa) + " — urmat, te-ar fi costat " + Math.abs(x.cost).toFixed(2) + " USDT.";
    }) : ["Niciun sfat greșit judecat săptămâna asta."];
    // revizia 01.10 (I3): ZILE distincte, nu intrari (acelasi semnal pe 5 boti in aceeasi ora e un singur caz); o zi e „gresita” cand au
    // fost mai multe gresite decat corecte; regula se propune abia de la 10 zile si cand marginea de jos Wilson 99% a greselilor trece de 50%
    // (cele ~13 sfaturi x 6 stari sunt multe comparatii - 99% in loc de 95% e frana pentru cel mai rau dintre ele)
    var gr = {};
    toate.forEach(function (x) {
      if (!x.stare || !(x.la > acum - 30 * ZI && x.la <= acum)) return;
      var k = x.cod + "|" + x.stare, g = gr[k] || (gr[k] = { cod: x.cod, stare: x.stare, zile: {}, cost: 0 }), d = Math.floor(x.t / ZI), z = g.zile[d] || (g.zile[d] = { g: 0, b: 0 });
      if (x.gresit) { z.g++; g.cost += x.cost; } else z.b++;
    });
    var wJos = function (k, n, zz) { var p = k / n, a = zz * zz; return (p + a / (2 * n) - zz * Math.sqrt(p * (1 - p) / n + a / (4 * n * n))) / (1 + a / n); };
    var tip = Object.keys(gr).map(function (k) { var g = gr[k], z = Object.keys(g.zile).map(function (d) { return g.zile[d]; }); return { cod: g.cod, stare: g.stare, judecate: z.length, gresite: z.filter(function (q) { return q.g > q.b; }).length, cost: g.cost }; })
      .filter(function (g) { return g.judecate >= 10 && wJos(g.gresite, g.judecate, 2.576) > 0.5 && g.cost < 0; })
      .sort(function (a, b) { return a.cost - b.cost; })[0] || null;
    if (tip) {
      tip.cost = Math.round(tip.cost * 100) / 100;
      tip.text = "Regulă propusă (ipoteză, n-am schimbat nimic): " + (NS[tip.cod] || "„" + tip.cod + "”") + " în starea „" + (ET[tip.stare] || tip.stare) + "” a greșit în " + tip.gresite + " din " + tip.judecate +
        " zile, în ultimele 30 (" + U(tip.cost) + " dacă-l urmai) — l-aș trata ca „încă nu știm” în starea asta. Spune-mi dacă vrei regula.";
      linii.push(tip.text);
    } else linii.push("Niciun tipar repetat sigur încă (trebuie cel puțin 10 zile judecate ale aceluiași sfat în aceeași stare, cu greșeala clar peste jumătate).");
    return { scumpe: scumpe, tipar: tip, linii: linii };
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

  return { frana: frana, franaIstoric: franaIstoric, praguriFrana: praguriFrana, inceputZiRo: inceputZiRo, poarta: poarta, istoricMoneda: istoricMoneda, subOOra: subOOra, portofoliu: portofoliu, raportDuminica: raportDuminica, autopsie: autopsie, reguliPersonale: reguliPersonale, hartie: hartie };
})();
if (typeof globalThis !== "undefined") globalThis.Obiceiuri = Obiceiuri;
