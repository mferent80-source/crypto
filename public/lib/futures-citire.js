// Pagina Futures (v100.264, 29.10.2026, el: „crypto radar pagina futures, audit complet din toate direcțiile, îmbunătățire și optimizare”):
// citirea cifrelor Binance USDⓈ-M, fără DOM - folosită de derivatives() din app.js și de proba v100.264.
// Ce s-a măsurat pe 29.10 și de ce există modulul:
//  · intervalul de funding NU e mereu 8 h: 464 din 814 contracte plătesc la 4 h (COTI printre ele), 3 la o oră.
//    Pragul de 0,03% e pe 8 h, deci rata se aduce la 8 h înainte de prag, iar costul pe zi se socotește pe intervalul real.
//  · raportul long/short al CONTURILOR stă din obișnuință departe de 1: mediana pe ~500 h e 3,0 la ETH, 2,5 la SOL, 0,9 la COTI.
//    Cu pragul fix 1,5 / 0,67, „aglomerat” ieșea în 100% din ore pe ETH, SOL, XRP, DOGE, ADA, SUI, PEPE, LTC, BNB - o etichetă
//    mereu aprinsă nu mai spune nimic. Acum raportul se judecă față de istoria monedei (ultimele ~500 h): votează doar la p99 / p1.
//    De ce 99 / 1: ținta scrisă înainte de măsurare = aprins ~10% din ore. Raportul are trend, deci valoarea de acum stă des la marginea
//    ferestrei: pe 20 de monede × 220 de ore (fereastra de 500 h, doar trecutul) p90/p10 se aprindea 36%, p95 26%, p97,5 18%, p99 11%
//    (mediana 9%, cel mai des 30%); s-a ales cel mai apropiat de țintă. 4 h nu ajută: Binance ține doar 30 de zile de raport.
// Pragurile (0,03% / 8 h, p99 / p1, 1% OI, 0,5% preț) sunt IPOTEZE de context, nu dovezi de câștig: nu s-a căutat pe prețuri sau
// rezultate, s-a măsurat doar cât de des se aprind. Ce spune pagina e context, nu semnal.
var FuturesCitire = (function () {
  "use strict";
  var PRAG8 = 0.0003, BAZA8 = 0.0001;      // 0,03% la 8 h = de 3× nivelul de bază Binance (0,01% la 8 h)
  var PCT_SUS = 99, PCT_JOS = 1, MIN_IST = 50;   // votul în context
  var ZONA_SUS = 90, ZONA_JOS = 10;               // doar textul („sus / jos pentru moneda asta”), fără vot
  var OI_MORT = 1, PRET_MORT = 0.5;        // %: sub ele OI / prețul „stau pe loc”

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // „1,0” / „−0,3”; un zero rotunjit nu poartă semn
  function num(x, z) {
    x = nr(x); if (x === null) return "—";
    var s = Math.abs(x).toFixed(z == null ? 1 : z);
    return (x < 0 && Number(s) !== 0 ? "−" : "") + s.replace(".", ",");
  }
  function semn(x, z) { x = nr(x); if (x === null) return "—"; var s = num(x, z); return x > 0 && s !== num(0, z) ? "+" + s : s; }
  function rata(f) { return (Math.abs(f) * 100).toFixed(4).replace(".", ",") + "%"; }
  function compact(x) { return Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 2 }).format(x); }
  function cate(n, sg, pl) { var k = Math.round(n), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && k >= 100) ? " de " : " ") + pl; }
  function valori(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [], i, v;
    for (i = 0; i < arr.length; i++) { v = nr(Array.isArray(arr[i]) ? arr[i][1] : arr[i]); if (v !== null) out.push(v); }
    return out;
  }

  // Intervalul de plată (ore) din orele ultimelor plăți: cel mai mic din ultimele 3 diferențe (o plată lipsă nu-l dublează).
  function interval(hist) {
    if (!Array.isArray(hist) || hist.length < 2) return null;
    var min = null, i, a, b;
    for (i = hist.length - 1; i > 0 && i >= hist.length - 3; i--) {
      a = nr(hist[i - 1] && hist[i - 1].fundingTime); b = nr(hist[i] && hist[i].fundingTime);
      if (a === null || b === null || b <= a) continue;
      if (min === null || b - a < min) min = b - a;
    }
    if (min === null) return null;
    var h = Math.round(min / 3600000);
    return h >= 1 && h <= 24 ? h : null;
  }
  function pe8h(f, ore) { f = nr(f); if (f === null) return null; ore = nr(ore); return ore && ore > 0 ? f * 8 / ore : f; }
  function cost1000(f, ore) { f = nr(f); if (f === null) return null; ore = nr(ore); return f * (24 / (ore && ore > 0 ? ore : 8)) * 1000; }
  // cât la sută din istoric e ≤ x; sub 50 de valori nu judecă
  function percentila(arr, x) {
    var v = valori(arr); x = nr(x);
    if (x === null || v.length < MIN_IST) return null;
    var n = 0; for (var i = 0; i < v.length; i++) if (v[i] <= x) n++;
    return 100 * n / v.length;
  }
  // percentila de pe ecran rotunjită spre mijloc: 98,8 se scrie p98 (nu p99, care e pragul de vot), 1,2 se scrie p2
  function pr(p) { p = nr(p); return p === null ? null : p >= 50 ? Math.floor(p) : Math.ceil(p); }
  function mediana(arr) {
    var v = valori(arr).sort(function (a, b) { return a - b; });
    return v.length < MIN_IST ? null : v[Math.floor(v.length / 2)];
  }

  // Aglomerarea: codurile rămân cele vechi (CROWDED / CONTRARIAN + / BALANCED / null) - verdictul și Fluxul le citesc așa.
  function aglomerare(o) {
    o = o || {};
    var f = nr(o.funding), l = nr(o.ls), f8 = pe8h(f, o.ore);
    var fVot = f8 === null ? 0 : f8 > PRAG8 ? -1 : f8 < -PRAG8 ? 1 : 0;
    var p = l === null ? null : percentila(o.lsIst, l);
    var lsVot = p === null ? 0 : p >= PCT_SUS ? -1 : p <= PCT_JOS ? 1 : 0;
    var conflict = fVot !== 0 && lsVot !== 0 && fVot !== lsVot, s = fVot + lsVot;
    var context = f === null && l === null ? null : conflict ? "BALANCED" : s > 0 ? "CONTRARIAN +" : s < 0 ? "CROWDED" : "BALANCED";
    var n = valori(o.lsIst).length;
    return { context: context, conflict: conflict, fVot: fVot, lsVot: lsVot, lsPct: p, fr8: f8, mediana: mediana(o.lsIst), zile: n >= MIN_IST ? Math.round(n / 24) : null };
  }

  // OI și prețul futures pe fereastra rândurilor (24 h la 289 de rânduri de 5 min); prețul = valoarea / bucățile, din aceleași rânduri
  function oiPret(hist) {
    if (!Array.isArray(hist) || hist.length < 2) return null;
    var a = hist[0] || {}, z = hist[hist.length - 1] || {};
    var oiA = nr(a.sumOpenInterest), oiZ = nr(z.sumOpenInterest), vA = nr(a.sumOpenInterestValue), vZ = nr(z.sumOpenInterestValue);
    if (!(oiA > 0 && oiZ > 0)) return null;
    var oi24 = (oiZ / oiA - 1) * 100, pret24 = vA > 0 && vZ > 0 ? ((vZ / oiZ) / (vA / oiA) - 1) * 100 : null;
    var tA = nr(a.timestamp), tZ = nr(z.timestamp), ore = tA !== null && tZ !== null && tZ > tA ? Math.round((tZ - tA) / 3600000) : null;
    var stare;
    if (Math.abs(oi24) < OI_MORT) stare = "pe-loc";
    else if (pret24 === null || Math.abs(pret24) < PRET_MORT) stare = oi24 > 0 ? "noi-loc" : "inchise-loc";
    else if (oi24 > 0) stare = pret24 > 0 ? "noi-sus" : "noi-jos";
    else stare = pret24 > 0 ? "acoperire" : "iesire";
    return { oi24: oi24, pret24: pret24, stare: stare, ore: ore };
  }
  var STARI = {
    "pe-loc": "OI aproape neschimbat - nu intră și nu ies poziții multe",
    "noi-loc": "intră poziții noi, prețul stă pe loc",
    "inchise-loc": "se închid poziții, prețul stă pe loc",
    "noi-sus": "intră poziții noi pe creștere (cumpărători noi)",
    "noi-jos": "intră poziții noi pe scădere (vânzători noi)",
    "acoperire": "se închid shorturi - prețul urcă pe acoperiri",
    "iesire": "se închid longuri - prețul coboară pe ieșiri"
  };

  function eticheta(context, conflict) {
    if (context == null) return "— fără date";
    if (conflict) return "În conflict";
    return context === "CROWDED" ? "Longurile înghesuite" : context === "CONTRARIAN +" ? "Shorturile înghesuite" : "Echilibrat";
  }
  function motiv(d) {
    d = d || {};
    if (d.faraContract) return (d.simbol || "Moneda") + " nu are contract perpetuu USDT pe Binance: funding-ul, OI și raportul long/short nu există aici pentru ea.";
    var p = d.probleme && typeof d.probleme === "object" ? d.probleme : null, k = p ? Object.keys(p) : [];
    return k.length ? "Binance nu a dat datele (" + String(p[k[0]]).slice(0, 120) + ")." : "";
  }

  // Rândurile mici de sub cifre
  function subFunding(o) {
    o = o || {};
    var f = nr(o.funding); if (f === null) return "—";
    var ore = nr(o.ore), c = cost1000(f, ore), parti = [];
    parti.push(ore ? "la " + ore + " h" : "intervalul nu se știe (socotit la 8 h)");
    parti.push(f > 0 ? "longurile plătesc" : f < 0 ? "shorturile plătesc" : "nimeni nu plătește");
    if (f !== 0) parti.push("≈ " + num(Math.abs(c), 1) + " USDT pe zi la 1.000 USDT");
    var t = nr(o.urmatoarea), acum = nr(o.acum) || Date.now();
    if (t !== null && t > acum) {
      var m = Math.round((t - acum) / 60000);
      parti.push("următoarea plată " + new Date(t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + " (în " + (m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min") + ")");
    }
    return parti.join(" · ");
  }
  function subOi(o) {
    o = o || {};
    var oi = nr(o.oi); if (oi === null) return "—";
    var parti = [compact(oi) + " " + (o.baza || "bucăți")], d = o.oiDeltas || {};
    if (nr(d.h1) !== null) parti.push("1 h " + semn(d.h1, 1) + "%");
    if (nr(d.h24) !== null) parti.push("24 h " + semn(d.h24, 1) + "%");
    return parti.join(" · ");
  }
  function subLs(o) {
    o = o || {};
    var ls = nr(o.ls); if (ls === null) return "—";
    var parti = [Math.round(ls / (1 + ls) * 100) + "% din conturi long"], p = nr(o.lsPct);
    if (p === null) parti.push("fără istoric - nu-l judec");
    else parti.push((p >= PCT_SUS ? "neobișnuit de sus" : p <= PCT_JOS ? "neobișnuit de jos" : p >= ZONA_SUS ? "sus" : p <= ZONA_JOS ? "jos" : "obișnuit") + " pentru moneda asta (p" + pr(p) + (o.zile ? " din " + cate(o.zile, "zi", "zile") : "") + ")");
    if (nr(o.mediana) !== null) parti.push("de obicei " + num(o.mediana, 2));
    return parti.join(" · ");
  }
  function biasFunding(f8) {
    f8 = nr(f8); if (f8 === null) return "N/A";
    return (f8 > PRAG8 ? "longurile înghesuite" : f8 < -PRAG8 ? "shorturile înghesuite" : "echilibrat") + " (la 8 h: " + (f8 < 0 && Number((Math.abs(f8) * 100).toFixed(4)) !== 0 ? "−" : "") + rata(f8) + ")";
  }
  function subContext(a) {
    a = a || {};
    if (a.context == null) return "nici funding, nici raport";
    var fT = a.fVot < 0 ? "funding-ul: longurile înghesuite" : a.fVot > 0 ? "funding-ul: shorturile înghesuite" : "funding-ul în limite";
    var lT = a.lsPct == null ? "raportul fără istoric" : a.lsVot < 0 ? "raportul: neobișnuit de mult long" : a.lsVot > 0 ? "raportul: neobișnuit de mult short" : a.lsPct >= ZONA_SUS ? "raportul sus, nu la extrem" : a.lsPct <= ZONA_JOS ? "raportul jos, nu la extrem" : "raportul obișnuit";
    return (a.conflict ? "se bat cap în cap: " : "") + fT + " · " + lT;
  }
  function subOiPret(x) {
    if (!x) return "—";
    return "OI " + semn(x.oi24, 1) + "%" + (x.pret24 !== null ? " · preț " + semn(x.pret24, 1) + "%" : "") + " · " + STARI[x.stare];
  }

  // Fraza din cifre („Interpretare”)
  function fraza(o) {
    o = o || {};
    var t = [], f = nr(o.funding), ore = nr(o.ore);
    if (f === null) t.push("Funding-ul lipsește.");
    else if (f === 0) t.push("Funding-ul e zero acum: nimeni nu plătește.");
    else {
      var f8 = pe8h(f, ore), c = cost1000(f, ore);
      var s = (f > 0 ? "Longurile plătesc shorturilor " : "Shorturile plătesc longurilor ") + rata(f) + (ore ? " la fiecare " + ore + " h" : " la fiecare plată (intervalul nu se știe, socotit la 8 h)") +
        ": ≈ " + num(Math.abs(c), 1) + " USDT pe zi la 1.000 USDT.";
      if (Math.abs(f8) <= BAZA8) s += " Nivel obișnuit.";
      else if (Math.abs(f8) <= PRAG8) s += " Peste nivelul obișnuit, sub prag.";
      else s += " De " + num(Math.abs(f8) / BAZA8, 1) + "× nivelul de bază: " + (f > 0 ? "longurile" : "shorturile") + " sunt înghesuite.";
      t.push(s);
    }
    var op = o.oiPret;
    if (op && op.stare) t.push("În " + (op.ore ? cate(op.ore, "oră", "ore") : "24 h") + " OI " + semn(op.oi24, 1) + "%" + (op.pret24 !== null && op.pret24 !== undefined ? " și prețul " + semn(op.pret24, 1) + "%" : "") + ": " + STARI[op.stare] + ".");
    var ls = nr(o.ls), p = nr(o.lsPct);
    if (ls !== null) {
      var u = Math.round(ls / (1 + ls) * 100) + "% din conturi sunt long (raport " + num(ls, 2) + ")";
      if (p === null) u += "; fără istoric, nu-l judec";
      else if (p >= PCT_SUS) u += ": neobișnuit de mult long pentru moneda asta - mai sus decât în " + Math.floor(p) + "% din ultimele ore";
      else if (p <= PCT_JOS) u += ": neobișnuit de mult short pentru moneda asta - mai jos decât în " + Math.floor(100 - p) + "% din ultimele ore";
      else if (p >= ZONA_SUS) u += ": spre long, sus pentru moneda asta (p" + pr(p) + "), dar nu la extrem";
      else if (p <= ZONA_JOS) u += ": spre short, jos pentru moneda asta (p" + pr(p) + "), dar nu la extrem";
      else u += ": obișnuit pentru moneda asta (p" + pr(p) + ")";
      t.push(u + ".");
    }
    t.push("Context, nu semnal: singure, cifrele astea nu spun încotro merge prețul.");
    return t.join(" ");
  }

  return { interval: interval, pe8h: pe8h, cost1000: cost1000, percentila: percentila, mediana: mediana, aglomerare: aglomerare, oiPret: oiPret,
    eticheta: eticheta, motiv: motiv, subFunding: subFunding, subOi: subOi, subLs: subLs, biasFunding: biasFunding, subContext: subContext,
    subOiPret: subOiPret, fraza: fraza, pr: pr, PRAG8: PRAG8 };
})();
if (typeof globalThis !== "undefined") globalThis.FuturesCitire = FuturesCitire;
