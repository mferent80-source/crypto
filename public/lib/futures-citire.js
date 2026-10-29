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
    var v = valori(o.lsIst), n = v.length, judecat = p !== null;
    // revizia 29.10: percentila numără „≤”, deci maximul iese 100% - pe ecran se spune „cel mai sus”, nu „mai sus decât în 100%”
    return { context: context, conflict: conflict, fVot: fVot, lsVot: lsVot, lsPct: p, fr8: f8, mediana: mediana(o.lsIst), zile: n >= MIN_IST ? Math.round(n / 24) : null,
      lsMax: judecat && l >= Math.max.apply(null, v), lsMin: judecat && l <= Math.min.apply(null, v) };
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
    parti.push(ore ? "la " + ore + " h" + (o.sursa === "binance" ? " (Binance)" : "") : "intervalul nu se știe (socotit la 8 h)");   // v100.265 (F2): sursa intervalului
    parti.push(f > 0 ? "longurile plătesc" : f < 0 ? "shorturile plătesc" : "nimeni nu plătește");
    if (f !== 0) parti.push("≈ " + num(Math.abs(c), 1) + " USDT pe zi la o poziție de 1.000 USDT");
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
        ": ≈ " + num(Math.abs(c), 1) + " USDT pe zi la o poziție de 1.000 USDT (valoarea poziției, nu marja).";
      if (Math.abs(f8) <= BAZA8) s += " Nivel obișnuit.";
      else if (Math.abs(f8) <= PRAG8) s += " Peste nivelul obișnuit, sub prag.";
      else s += " De " + num(Math.abs(f8) / BAZA8, 1) + "× nivelul de bază: " + (f > 0 ? "longurile" : "shorturile") + " sunt înghesuite.";
      t.push(s);
    }
    var op = o.oiPret;
    if (op && op.stare) t.push("În " + (op.ore == null ? "24 h" : op.ore >= 1 ? cate(op.ore, "oră", "ore") : "ultima oră") + " OI " + semn(op.oi24, 1) + "%" + (op.pret24 !== null && op.pret24 !== undefined ? " și prețul " + semn(op.pret24, 1) + "%" : "") + ": " + STARI[op.stare] + ".");
    var ls = nr(o.ls), p = nr(o.lsPct);
    if (ls !== null) {
      var u = Math.round(ls / (1 + ls) * 100) + "% din conturi sunt long (raport " + num(ls, 2) + ")";
      if (p === null) u += "; fără istoric, nu-l judec";
      else if (p >= PCT_SUS) u += ": neobișnuit de mult long pentru moneda asta - " + (o.lsMax ? "cel mai sus din ultimele ore" : "mai sus decât în " + Math.floor(p) + "% din ultimele ore");
      else if (p <= PCT_JOS) u += ": neobișnuit de mult short pentru moneda asta - " + (o.lsMin ? "cel mai jos din ultimele ore" : "mai jos decât în " + Math.floor(100 - p) + "% din ultimele ore");
      else if (p >= ZONA_SUS) u += ": spre long, sus pentru moneda asta (p" + pr(p) + "), dar nu la extrem";
      else if (p <= ZONA_JOS) u += ": spre short, jos pentru moneda asta (p" + pr(p) + "), dar nu la extrem";
      else u += ": obișnuit pentru moneda asta (p" + pr(p) + ")";
      t.push(u + ".");
    }
    t.push("Context, nu semnal: singure, cifrele astea nu spun încotro merge prețul.");
    return t.join(" ");
  }

  // Consumatorii aceleiași stări (29.10, el: „Da, în aceeași livrare”): alertele, proxy-ul de lichidări și verdictul citesc aceleași
  // reguli ca pagina - înainte aveau pragurile lor (L/S 1,5 și 1,35, funding brut pe plată), aprinse mereu pe ETH, SOL, XRP…
  var PRAG_ALERTA8 = 0.0005;   // pragul vechi al alertei (0,05%), acum pe 8 h
  function rataSemn(f) { f = nr(f); return f === null ? "—" : (f < 0 && Number((Math.abs(f) * 100).toFixed(4)) !== 0 ? "−" : "") + rata(f); }
  function alertaLs(s) {
    if (!s || nr(s.ls) === null || !s.lsVot) return null;
    return { titlu: "Long/Short la extrem", text: "Raport " + num(s.ls, 2) + " · p" + pr(s.lsPct) + " din istoria monedei · " + (s.lsVot < 0 ? "longurile înghesuite" : "shorturile înghesuite") };
  }
  function alertaFunding(s) {
    if (!s) return null;
    var f = nr(s.funding), f8 = nr(s.fr8) !== null ? nr(s.fr8) : f, ore = nr(s.fundingIntervalHours);
    if (f === null || f8 === null || Math.abs(f8) <= PRAG_ALERTA8) return null;
    return { titlu: "Funding la extrem", text: rataSemn(f) + (ore ? " la " + ore + " h" : "") + " (" + rataSemn(f8) + " la 8 h) · " + (f > 0 ? "longurile plătesc" : "shorturile plătesc") };
  }
  // partea pe care stă riscul de lichidare în proxy: longuri înghesuite ⇒ jos, shorturi înghesuite ⇒ sus
  function partiaProxy(context) { return context === "CROWDED" ? "DOWN" : context === "CONTRARIAN +" ? "UP" : "BALANCED"; }
  // în verdict, contextul se citește pe direcția setup-ului: longurile înghesuite susțin un short și sunt risc pentru un long
  function inVerdict(context, dir) {
    if (context === "CROWDED") return dir < 0 ? { parte: "pos", text: "Futures: longurile înghesuite susțin short-ul" } : { parte: "risks", text: "Futures: longurile înghesuite (risc pentru long)" };
    if (context === "CONTRARIAN +") return dir < 0 ? { parte: "risks", text: "Futures: shorturile înghesuite (risc pentru short)" } : { parte: "pos", text: "Futures: shorturile înghesuite susțin long-ul" };
    return null;
  }

  // ---------------- ideile F1–F5 (v100.265, 29.10, el: „fa ideile”) - informație de context, NU intră în votul „înghesuit”
  // F5 prima futures față de spot (markPrice / indexPrice), în puncte de bază: prima pozitivă trage funding-ul în sus
  function prima(mark, index) { var m = nr(mark), i = nr(index); return m > 0 && i > 0 ? (m / i - 1) * 10000 : null; }
  function primaText(b) { b = nr(b); return b === null ? "—" : semn(b, 1) + " bp"; }
  function subPrima(b) {
    b = nr(b); if (b === null) return "—";
    if (Math.abs(b) < 1) return "la paritate cu spotul (sub 1 bp)";
    return b > 0 ? "futures mai scump decât spotul: trage funding-ul în sus (plătesc longurile)" : "futures mai ieftin decât spotul: trage funding-ul în jos (plătesc shorturile)";
  }
  // F1 funding-ul Pionex (acolo stau boții) - px = GridSim.rataFunding(rates, acum): {rata, intervalOre, rataZi, zile, veche}
  function pionexText(px) { return px && nr(px.rata) !== null ? rataSemn(px.rata) : "—"; }
  function subPionex(px, binF8) {
    if (!px || nr(px.rata) === null || !(nr(px.intervalOre) > 0)) return "Pionex nu are perpetuu pe moneda asta (sau nu a răspuns)";
    var f = nr(px.rata), ore = nr(px.intervalOre), parti = ["la " + num(ore, ore % 1 ? 1 : 0) + " h"];
    parti.push(f > 0 ? "longurile plătesc" : f < 0 ? "shorturile plătesc" : "nimeni nu plătește");
    if (f !== 0) parti.push("≈ " + num(Math.abs(cost1000(f, ore)), 1) + " USDT pe zi la o poziție de 1.000 USDT");
    if (nr(px.rataZi) !== null && nr(px.zile) > 0) parti.push("media pe " + cate(Math.max(1, Math.round(px.zile)), "zi", "zile") + ": ≈ " + num(px.rataZi * 1000, 1) + " USDT pe zi");
    if (px.veche) parti.push("ultima plată e veche");
    var b = nr(binF8);
    if (b !== null) parti.push("Binance: " + rataSemn(b) + " la 8 h, Pionex: " + rataSemn(f * 8 / ore) + " la 8 h" + (b * f < 0 ? " - semn opus" : ""));
    return parti.join(" · ");
  }
  // F4 conturile mari (top traders, pe POZIȚII) față de toate conturile + cumpărătorii agresivi (taker) pe ultimele 24 h
  function baniMari(o) {
    o = o || {};
    var top = nr(o.topLs), ls = nr(o.ls), tk = Array.isArray(o.takerIst) ? o.takerIst.filter(function (r) { return Array.isArray(r) && nr(r[1]) !== null && nr(r[2]) !== null; }) : [];
    if (top === null && tk.length < 24) return null;
    var b = { longTop: top === null ? null : top / (1 + top) * 100, longToti: ls === null ? null : ls / (1 + ls) * 100, topPct: top === null ? null : percentila(o.topIst, top), cump24: null, takerPct: null, divergenta: "" };
    if (b.longTop !== null && b.longToti !== null) {
      var d = Math.round(b.longTop) - Math.round(b.longToti), pp = (d > 0 ? "+" : d < 0 ? "−" : "±") + Math.abs(d) + " pp";
      b.divergenta = d >= 10 ? "conturile mari sunt mai long decât mulțimea (" + pp + ")" : d <= -10 ? "conturile mari sunt mai short decât mulțimea (" + pp + ")" : "conturile mari și mulțimea stau la fel (" + pp + ")";
    }
    if (tk.length >= 24) {
      var cota = function (z) { var c = 0, t = 0; for (var k = z - 23; k <= z; k++) { c += nr(tk[k][1]); t += nr(tk[k][1]) + nr(tk[k][2]); } return t > 0 ? c / t * 100 : null; };
      var toate = []; for (var i = 23; i < tk.length; i++) { var x = cota(i); if (x !== null) toate.push(x); }
      b.cump24 = cota(tk.length - 1); b.takerPct = b.cump24 === null ? null : percentila(toate, b.cump24);
    }
    return b;
  }
  function baniMariText(b) { return b && b.longTop !== null ? Math.round(b.longTop) + "% long" : "—"; }
  function subBaniMari(b) {
    if (!b) return "fără date de la conturile mari";
    var parti = [];
    if (b.longToti !== null) parti.push("toate conturile: " + Math.round(b.longToti) + "% long");
    if (b.divergenta) parti.push(b.divergenta);
    if (b.topPct !== null) parti.push("conturile mari: p" + pr(b.topPct) + " pentru moneda asta");
    if (b.cump24 !== null) parti.push("cumpărători agresivi în 24 h: " + Math.round(b.cump24) + "% din volum" + (b.takerPct !== null ? " (p" + pr(b.takerPct) + ")" : ""));
    return parti.join(" · ") || "—";
  }
  // F3 istoria pe ~21 de zile: raportul long/short cu p1 / p99 (pragurile votului) și funding-ul pe plăți. Două panouri, fiecare cu scara lui
  // (nu două axe pe același grafic). Culori validate cu dataviz pe fondul #1A242E: #BE7F22 / #5B8FC7, ΔE 21,6 la daltonism; poziția
  // deasupra / dedesubtul lui zero e a doua codare. Linia raportului e în cerneala textului (o singură serie).
  var C_LONG = "#BE7F22", C_SHORT = "#5B8FC7", C_INK = "#E6EDF3", C_MUT = "#9FB3C4", C_SURF = "#1A242E";
  function zi(t) { return new Date(t).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" }); }
  function ora(t) { return new Date(t).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); }
  function grafic(o) {
    o = o || {};
    var ist = (Array.isArray(o.lsIst) ? o.lsIst : []).map(function (r) { return [nr(r && r[0]), nr(r && r[1])]; }).filter(function (r) { return r[0] !== null && r[1] !== null; });
    var fh = (Array.isArray(o.fundingHist) ? o.fundingHist : []).map(function (r) { return [nr(r && r.fundingTime), nr(r && r.fundingRate)]; }).filter(function (r) { return r[0] !== null && r[1] !== null; }).sort(function (a, b) { return a[0] - b[0]; });
    if (ist.length < 2 && !fh.length) return "";
    // revizia pozei (29.10): lățimea desenului = lățimea cartelei (320–640), ca textul de 11 px să rămână 11 px pe telefon
    var W = Math.round(Math.max(320, Math.min(640, nr(o.lat) || 640))), X0 = 8, X1 = W - 80, s = [], aria = [];
    var fx = function (i, n) { return X0 + (n > 1 ? i / (n - 1) : 0.5) * (X1 - X0); }, f1 = function (x) { return Math.round(x * 10) / 10; };
    if (ist.length >= 2) {
      var v = ist.map(function (r) { return r[1]; }), srt = v.slice().sort(function (a, b) { return a - b; }), n = v.length;
      var p1 = srt[Math.round(0.01 * (n - 1))], p99 = srt[Math.round(0.99 * (n - 1))], acum = nr(o.ls) !== null ? nr(o.ls) : v[n - 1];
      var lo = Math.min(srt[0], acum), hi = Math.max(srt[n - 1], acum), pad = (hi - lo) * 0.08 || 0.05; lo -= pad; hi += pad;
      var fy = function (y) { return f1(26 + (1 - (y - lo) / (hi - lo)) * 104); };
      s.push('<text x="' + X0 + '" y="14" fill="' + C_MUT + '" font-size="12">Raportul long/short (conturi), ultimele ' + cate(Math.max(1, Math.round(n / 24)), "zi", "zile") + "</text>");
      s.push('<line x1="' + X0 + '" x2="' + X1 + '" y1="' + fy(p99) + '" y2="' + fy(p99) + '" stroke="' + C_MUT + '" stroke-width="1" stroke-dasharray="4 4"/>');
      s.push('<line x1="' + X0 + '" x2="' + X1 + '" y1="' + fy(p1) + '" y2="' + fy(p1) + '" stroke="' + C_MUT + '" stroke-width="1" stroke-dasharray="4 4"/>');
      s.push('<text x="' + (X1 + 6) + '" y="' + (fy(p99) + 4) + '" fill="' + C_MUT + '" font-size="11">p99 ' + num(p99, 2) + "</text>");
      s.push('<text x="' + (X1 + 6) + '" y="' + (fy(p1) + 4) + '" fill="' + C_MUT + '" font-size="11">p1 ' + num(p1, 2) + "</text>");
      s.push('<polyline fill="none" stroke="' + C_INK + '" stroke-width="2" stroke-linejoin="round" points="' + v.map(function (y, i) { return f1(fx(i, n)) + "," + fy(y); }).join(" ") + '"/>');
      var pas = Math.max(1, Math.ceil(n / 84));
      for (var i = 0; i < n; i += pas) s.push('<circle cx="' + f1(fx(i, n)) + '" cy="' + fy(v[i]) + '" r="7" fill="transparent"><title>' + zi(ist[i][0]) + " " + ora(ist[i][0]) + " · raport " + num(v[i], 2) + "</title></circle>");
      // „acum” lângă linia p99 sau sus de tot se scrie SUB punct (în poza COTI eticheta călca pe linia punctată)
      // regula pe ETICHETĂ, nu pe punct: textul deasupra ocupă ya−18…ya−6; dacă atinge linia p99 (sau iese sus), coboară sub punct
      var xa = f1(fx(n - 1, n)), ya = fy(acum), dy = ya - fy(p99), yEt = (dy > -4 && dy < 24) || ya < 34 ? ya + 16 : ya - 8;
      s.push('<circle cx="' + xa + '" cy="' + ya + '" r="4" fill="' + C_INK + '" stroke="' + C_SURF + '" stroke-width="2"><title>acum · raport ' + num(acum, 2) + "</title></circle>");
      s.push('<text x="' + (xa - 8) + '" y="' + yEt + '" fill="' + C_INK + '" font-size="11" text-anchor="end" paint-order="stroke" stroke="' + C_SURF + '" stroke-width="3">acum ' + num(acum, 2) + "</text>");
      s.push('<text x="' + X0 + '" y="146" fill="' + C_MUT + '" font-size="11">' + zi(ist[0][0]) + '</text><text x="' + X1 + '" y="146" fill="' + C_MUT + '" font-size="11" text-anchor="end">' + zi(ist[n - 1][0]) + "</text>");
      aria.push("Raportul long/short pe ultimele " + cate(Math.max(1, Math.round(n / 24)), "zi", "zile") + ", între p1 " + num(p1, 2) + " și p99 " + num(p99, 2) + "; acum " + num(acum, 2) + ".");
    }
    if (fh.length) {
      var m = fh.length, mx = Math.max.apply(null, fh.map(function (r) { return Math.abs(r[1]); })) || 1, y0 = 196, bw = Math.max(2, (X1 - X0) / m * 0.6), nL = 0, nS = 0;
      s.push('<text x="' + X0 + '" y="166" fill="' + C_MUT + '" font-size="12">Funding pe plăți (ultimele ' + m + ")</text>");
      s.push('<line x1="' + X0 + '" x2="' + X1 + '" y1="' + y0 + '" y2="' + y0 + '" stroke="' + C_MUT + '" stroke-width="1"/>');
      fh.forEach(function (r, k) {
        var h = Math.max(1, Math.abs(r[1]) / mx * 22), x = f1(X0 + (k + 0.5) * (X1 - X0) / m - bw / 2), poz = r[1] >= 0, c = r[1] > 0 ? C_LONG : r[1] < 0 ? C_SHORT : C_MUT;
        if (r[1] > 0) nL++; else if (r[1] < 0) nS++;
        s.push('<rect class="fBara" x="' + x + '" y="' + f1(poz ? y0 - h : y0) + '" width="' + f1(bw) + '" height="' + f1(h) + '" rx="1" fill="' + c + '"><title>' + zi(r[0]) + " " + ora(r[0]) + " · " + rataSemn(r[1]) + (r[1] > 0 ? " · plătesc longurile" : r[1] < 0 ? " · plătesc shorturile" : "") + "</title></rect>");
      });
      s.push('<rect x="' + X0 + '" y="226" width="10" height="10" rx="1" fill="' + C_LONG + '"/><text x="' + (X0 + 14) + '" y="235" fill="' + C_INK + '" font-size="11">plătesc longurile</text>');
      s.push('<rect x="' + (X0 + 130) + '" y="226" width="10" height="10" rx="1" fill="' + C_SHORT + '"/><text x="' + (X0 + 144) + '" y="235" fill="' + C_INK + '" font-size="11">plătesc shorturile</text>');
      aria.push("Funding pe ultimele " + m + " plăți: " + nL + " plătite de longuri, " + nS + " de shorturi.");
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' 242" role="img" aria-label="' + aria.join(" ") + '">' + s.join("") + "</svg>";
  }

  return { prima: prima, primaText: primaText, subPrima: subPrima, pionexText: pionexText, subPionex: subPionex, baniMari: baniMari, baniMariText: baniMariText,
    subBaniMari: subBaniMari, grafic: grafic,
    alertaLs: alertaLs, alertaFunding: alertaFunding, partiaProxy: partiaProxy, inVerdict: inVerdict, interval: interval, pe8h: pe8h, cost1000: cost1000, percentila: percentila, mediana: mediana, aglomerare: aglomerare, oiPret: oiPret,
    eticheta: eticheta, motiv: motiv, subFunding: subFunding, subOi: subOi, subLs: subLs, biasFunding: biasFunding, subContext: subContext,
    subOiPret: subOiPret, fraza: fraza, pr: pr, PRAG8: PRAG8 };
})();
if (typeof globalThis !== "undefined") globalThis.FuturesCitire = FuturesCitire;
