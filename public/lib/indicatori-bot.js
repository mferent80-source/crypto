// Fereastra "Ce spun indicatorii" de langa graficul din Tabloul botului (v91.8, cererea lui 26.09).
// Pur (probat in scripts/indicatori-v918.mjs): primeste rezultatul lui calc() din app.js - ACELEASI
// calcule ca "Analizeaza piata" - pe fiecare interval si il traduce in celule scurte, plus rezumatul
// fata de directia botului. Descrie ce e acum pe grafic; NU e o predictie.
var IndicatoriBot = (function () {
  "use strict";
  var LIPSA = { t: "—", c: "lipsa", titlu: "" };
  function nr(x) { return typeof x === "number" && isFinite(x) ? x : null; }

  // lumanarile Pionex {time, open, high, low, close, volume} -> forma lui calc() (ca pionexKlines din app.js)
  function dinPionex(rows) {
    return (Array.isArray(rows) ? rows : []).map(function (x) {
      var ts = Number(x && x.time), o = Number(x && x.open), h = Number(x && x.high), l = Number(x && x.low), c = Number(x && x.close), v = Number(x && x.volume);
      return [ts, String(o), String(h), String(l), String(c), String(v), ts + 1, String(v * c)];
    }).filter(function (r) { return isFinite(r[0]) && isFinite(+r[4]) && +r[4] > 0; }).sort(function (a, b) { return a[0] - b[0]; });
  }

  // randurile ferestrei, in ordinea in care se citesc; titlul = ce inseamna indicatorul, in cuvinte
  var RANDURI = [
    { k: "verdict", eticheta: "Verdict", titlu: "Scorul Radarului din toți indicatorii (0-100): peste ~60 urcă, sub ~40 coboară." },
    { k: "ema", eticheta: "Medii EMA", titlu: "Mediile de 20, 50 și 200 de bare: 20 peste 50 peste 200 = trend de urcare așezat." },
    { k: "supertrend", eticheta: "Supertrend", titlu: "Urmăritorul de trend: ↑ cât prețul stă peste linia lui, ↓ sub ea." },
    { k: "macd", eticheta: "MACD", titlu: "Impulsul: histograma peste 0 = împinge în sus, sub 0 = în jos." },
    { k: "adx", eticheta: "ADX", titlu: "Tăria trendului: sub 20 = fără trend (bun pentru grid), peste 25 = trend. Culoarea = cine trage (+DI / −DI)." },
    { k: "rsi", eticheta: "RSI", titlu: "Forța: peste 50 cumpărătorii, sub 50 vânzătorii; peste 70 încins, sub 30 epuizat." },
    { k: "stoch", eticheta: "Stochastic", titlu: "Unde e prețul în intervalul recent: peste 80 sus (încins), sub 20 jos (epuizat)." },
    { k: "bb", eticheta: "Bollinger", titlu: "Unde e prețul în banda de volatilitate: 0% jos, 100% sus." },
    { k: "mfi", eticheta: "MFI (bani)", titlu: "RSI cu volum: intră bani (peste 50) sau ies (sub 50); peste 80 / sub 20 = extrem." }
  ];

  // celula e SCURTA (sageata + cifra), ca sa incapa 4 intervale pe ~300 px; cuvintele stau in titlu (mouse / apasare lunga)
  function forta(v, sus, jos, cine) {
    return v >= sus ? "încins (peste " + sus + ")" : v <= jos ? "epuizat (sub " + jos + ")" : v > 50 ? cine[0] : v < 50 ? cine[1] : "la mijloc";
  }
  function celule(q) {
    if (!q) return null;
    var o = {};
    var sc = nr(q.score), scTxt = sc !== null ? " " + Math.round(sc) : "";
    o.verdict = q.ver === "BULLISH" ? { t: "↑" + scTxt, c: "good", titlu: "urcă" } : q.ver === "BEARISH" ? { t: "↓" + scTxt, c: "bad", titlu: "coboară" } : { t: "↔" + scTxt, c: "neutral", titlu: "neutru" };
    if (sc !== null) o.verdict.titlu += ", scor " + Math.round(sc) + " din 100";
    o.ema = q.ema ? { t: "↑", c: "good", titlu: "așezat pe urcare: 20 > 50 > 200" } : q.emaDir === "UP" ? { t: "↗", c: "neutral", titlu: "20 peste 50, dar nu peste 200" } : q.emaDir === "DOWN" ? { t: "↓", c: "bad", titlu: "20 sub 50: pe coborâre" } : LIPSA;
    o.supertrend = q.supertrend === "BULL" ? { t: "↑", c: "good", titlu: "prețul peste linie" } : q.supertrend === "BEAR" ? { t: "↓", c: "bad", titlu: "prețul sub linie" } : LIPSA;
    o.macd = q.macd === true ? { t: "↑", c: "good", titlu: "histograma peste 0: împinge în sus" } : q.macd === false ? { t: "↓", c: "bad", titlu: "histograma sub 0: împinge în jos" } : LIPSA;
    var a = nr(q.adx), pd = nr(q.pdi), md = nr(q.mdi);
    o.adx = a === null ? LIPSA : { t: String(Math.round(a)), c: a < 20 || pd === null || md === null ? "neutral" : pd > md ? "good" : "bad",
      titlu: (a >= 25 ? "trend" : a < 20 ? "liniște, fără trend" : "trend slab") + (pd !== null && md !== null ? (pd > md ? "; trag cumpărătorii" : "; trag vânzătorii") : "") };
    var r = nr(q.rsi);
    o.rsi = r === null ? LIPSA : { t: String(Math.round(r)), c: r >= 70 || r <= 30 ? "tbWarn" : r > 50 ? "good" : r < 50 ? "bad" : "neutral", titlu: forta(r, 70, 30, ["cumpărătorii conduc", "vânzătorii conduc"]) };
    var s = nr(q.stoch);
    o.stoch = s === null ? LIPSA : { t: String(Math.round(s)), c: s >= 80 || s <= 20 ? "tbWarn" : s > 50 ? "good" : s < 50 ? "bad" : "neutral", titlu: forta(s, 80, 20, ["în partea de sus a intervalului", "în partea de jos a intervalului"]) };
    var b = nr(q.bbpos);
    o.bb = b === null ? LIPSA : { t: Math.round(b) + "%", c: b >= 80 || b <= 20 ? "tbWarn" : b > 55 ? "good" : b < 45 ? "bad" : "neutral", titlu: b >= 80 ? "lipit de banda de sus" : b <= 20 ? "lipit de banda de jos" : "în interiorul benzii" };
    var m = nr(q.mfi);
    o.mfi = m === null ? { t: "—", c: "lipsa", titlu: "fără volum pe fereastra lui" } : { t: String(Math.round(m)), c: m >= 80 || m <= 20 ? "tbWarn" : m > 50 ? "good" : m < 50 ? "bad" : "neutral", titlu: forta(m, 80, 20, ["intră bani", "ies bani"]) };
    return o;
  }

  // randuri: [{eticheta, q}] (q = rezultatul lui calc, sau null). Botul long vrea "urca", short vrea "coboara".
  // Botul tine zile: cantaresc 4 ore si 1 zi; 15 min / 1 ora contra = zgomot pe termen scurt.
  function rezumat(randuri, botDir) {
    var l = Array.isArray(randuri) ? randuri : [], vrea = botDir === "long" ? "BULLISH" : botDir === "short" ? "BEARISH" : null;
    var opus = vrea === "BULLISH" ? "BEARISH" : vrea === "BEARISH" ? "BULLISH" : null;
    var valide = l.filter(function (x) { return x && x.q && x.q.ver; });
    if (!valide.length) return { ton: "neutru", text: "N-am destule lumânări ca să citesc indicatorii." };
    var cu = valide.filter(function (x) { return vrea && x.q.ver === vrea; }), contra = valide.filter(function (x) { return opus && x.q.ver === opus; });
    var lungi = valide.filter(function (x) { return /4 ore|1 zi/.test(x.eticheta); });
    var lungiContra = lungi.filter(function (x) { return opus && x.q.ver === opus; }).length, lungiCu = lungi.filter(function (x) { return vrea && x.q.ver === vrea; }).length;
    var nume = function (a) { return a.map(function (x) { return x.eticheta; }).join(", "); };
    if (!vrea) {
      var sus = valide.filter(function (x) { return x.q.ver === "BULLISH"; }), jos = valide.filter(function (x) { return x.q.ver === "BEARISH"; });
      return { ton: "neutru", text: "Urcă pe " + (sus.length ? nume(sus) : "niciunul") + " · coboară pe " + (jos.length ? nume(jos) : "niciunul") + "." };
    }
    var dirTxt = botDir === "long" ? "urcare" : "coborâre";
    var neutre = valide.filter(function (x) { return x.q.ver !== vrea && x.q.ver !== opus; });
    var baza = "Cu botul (" + botDir + "): " + cu.length + " din " + valide.length + (cu.length ? " (" + nume(cu) + ")" : "") + (contra.length ? " · împotrivă: " + nume(contra) : "") + (neutre.length ? " · neutru: " + nume(neutre) : "") + ".";
    if (lungi.length && lungiContra === lungi.length) return { ton: "rau", text: baza + " Și 4 ore, și 1 zi arată " + (botDir === "long" ? "coborâre" : "urcare") + ": indicatorii nu mai susțin botul." };
    if (lungiContra) return { ton: "atentie", text: baza + " Unul din intervalele lungi (4 ore / 1 zi) e împotrivă — de urmărit." };
    if (contra.length) return { ton: "atentie", text: baza + " Împotrivă doar pe termen scurt; botul ține zile, contează 4 ore și 1 zi" + (lungiCu ? ", care arată " + dirTxt + "." : ".") };
    return { ton: cu.length ? "bine" : "neutru", text: baza + (cu.length ? "" : " Niciun interval nu arată clar o direcție.") };
  }

  // ---- v91.8: estimarea din istoric (kNN-ul lui "Analizeaza piata": historicalProbability(j, 4) = 4 bare inainte) ----
  // MASURAT in v74.6: nimereste directia in 48,8% din cazuri (cat dat cu banul) - de aceea eticheta merge MEREU cu ea.
  var ORIZONT = { "15 min": "1 oră", "1 oră": "4 ore", "4 ore": "16 ore", "1 zi": "4 zile" };
  var CINSTIT = "Nedovedit: măsurată, metoda asta a nimerit direcția în 48,8% din cazuri — cât dat cu banul. O frecvență din trecut, nu o promisiune.";
  function estimare(hp, orizont) {
    var up = hp ? nr(hp.up) : null;
    if (up === null) return { t: "—", c: "lipsa", titlu: "prea puține bare pentru estimare (îi trebuie cel puțin 260)" };
    var sus = up >= 50, pct = Math.round(sus ? up : 100 - up), b = nr(hp.banda);
    return { t: (sus ? "↑" : "↓") + pct + "%", c: hp.inBanda ? "neutral" : sus ? "good" : "bad",
      titlu: "în " + (hp.k || "?") + " situații asemănătoare din istoricul monedei, după " + orizont + " prețul a " + (sus ? "urcat" : "coborât") + " în " + pct + "% din cazuri" +
        (b !== null ? " (zgomotul e ±" + Math.round(b) + (hp.inBanda ? ": e în zgomot, fără semn" : "") + ")" : "") + ". " + CINSTIT };
  }
  // predictia pe orizontul botului: bara de 4 ore (16 ore inainte); botul tine zile
  function predictie(randuri, botDir) {
    var r = (Array.isArray(randuri) ? randuri : []).filter(function (x) { return x && x.eticheta === "4 ore"; })[0], hp = r && r.hp, up = hp ? nr(hp.up) : null;
    if (up === null) return { ton: "neutru", text: "Estimare pe 16 ore: n-am destule bare de 4 ore în istoric. " + CINSTIT };
    var sus = up >= 50, pct = Math.round(sus ? up : 100 - up), avg = nr(hp.avg);
    var bz = nr(hp.banda);
    if (hp.inBanda) return { ton: "neutru", text: "Estimare pe 16 ore: fără semn — în situații asemănătoare a " + (sus ? "urcat" : "coborât") + " în " + pct + "% din cazuri, dar sunt prea puține ca să conteze" + (bz !== null ? " (zgomotul e ±" + Math.round(bz) + ")" : "") + ". " + CINSTIT };
    var fata = botDir === "long" ? (sus ? " — în favoarea botului" : " — împotriva botului") : botDir === "short" ? (sus ? " — împotriva botului" : " — în favoarea botului") : "";
    return { ton: "neutru", text: "Estimare pe 16 ore: " + (sus ? "urcare" : "coborâre") + " în " + pct + "% din situațiile asemănătoare" + (avg !== null ? " (în medie " + (avg >= 0 ? "+" : "−") + Math.abs(avg).toFixed(1).replace(".", ",") + "%)" : "") + fata + ". " + CINSTIT };
  }

  // ---- v91.9: "Mediul botului" - trei lucruri care NU vin din acelasi pret ca tabelul ----
  // o.regim {r4h, r24h, miscare} (GridCalcul.regimPeBare pe barele de 1 ora ale monedei)
  // o.funding {rate, hist[], intervalOre} (Pionex fundingRates), o.fundingZi (cat a platit botul pe zi, din bot)
  // o.btc {dir: urca|coboara|lateral, regim} (Directie + regimPeBare pe barele de 4h ale BTC)
  function x1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ",") + "×"; }
  function median(l) { var v = l.filter(function (x) { return nr(x) !== null; }).sort(function (a, b) { return a - b; }); return v.length ? v[Math.floor(v.length / 2)] : null; }
  function mediu(o, botDir) {
    o = o || {};
    var out = [], rg = o.regim, r4 = rg ? nr(rg.r4h) : null, r24 = rg ? nr(rg.r24h) : null;
    var titluMis = "Pragul e 1,5× mișcarea obișnuită a monedei (pe ultimele ~3 săptămâni). Singurul semnal DOVEDIT pentru grid în Radar: pornit sau ținut după mișcare, gridul iese cel mai rău; în liniște se descurcă.";
    if (r4 === null && r24 === null) out.push({ k: "miscare", eticheta: "Mișcarea", text: "n-am destule bare de 1 oră", ton: "neutru", titlu: titluMis });
    else {
      var mis = !!rg.miscare, parti = [];
      if (r4 !== null) parti.push("4h " + x1(r4)); if (r24 !== null) parti.push("24h " + x1(r24));
      out.push({ k: "miscare", eticheta: "Mișcarea", text: (mis ? "mișcare" : "liniște") + " · " + parti.join(" · ") + " din obișnuit", ton: mis ? "rau" : "bine",
        titlu: titluMis + (mis ? " Acum e mișcare: aș fi gata să opresc botul." : "") });
    }
    var f = o.funding, rate = f ? nr(f.rate) : null, ore = f && nr(f.intervalOre) ? f.intervalOre : 8;
    var titluF = "Funding-ul se plătește la fiecare " + ore + " ore între long și short. Mult peste obișnuit = mulți înghesuiți pe o parte; pe partea botului e și cost, și risc de descărcare bruscă a prețului.";
    if (rate === null) out.push({ k: "funding", eticheta: "Funding", text: "n-am rata de la Pionex", ton: "neutru", titlu: titluF });
    else {
      var med = median((f.hist || []).map(Number)), plateste = rate > 0 ? "long" : rate < 0 ? "short" : null;
      var botPlateste = plateste && botDir === plateste, botIncaseaza = plateste && (botDir === "long" || botDir === "short") && botDir !== plateste;
      var raport = med && med * rate > 0 ? Math.abs(rate / med) : null;
      var fata = raport === null ? "" : raport >= 2 ? " · " + Math.round(raport) + "× față de obicei" : raport <= 0.5 ? " · sub obicei" : " · ca de obicei";
      var fz = nr(o.fundingZi), cost = fz !== null ? " · botul: " + (fz >= 0 ? "+" : "−") + Math.abs(fz).toFixed(2).replace(".", ",") + " USDT pe zi" : "";
      var cine = plateste ? "plătesc " + plateste + (botPlateste ? " (tu plătești)" : botIncaseaza ? " (tu încasezi)" : "") : "zero";
      out.push({ k: "funding", eticheta: "Funding", text: (rate * 100).toFixed(3).replace(".", ",") + "% la " + ore + "h · " + cine + fata + cost,
        ton: botPlateste && raport !== null && raport >= 2 && Math.abs(rate) >= 0.0001 ? "atentie" : botIncaseaza ? "bine" : "neutru", titlu: titluF });
    }
    var b = o.btc, bd = b && b.dir, br = b && b.regim, bm = br ? nr(br.r4h) : null;
    var titluB = "Monedele mici merg de obicei după BTC: o cădere bruscă a lui trage și moneda botului spre marginea de jos a gridului.";
    if (!bd) out.push({ k: "btc", eticheta: "BTC", text: "n-am lumânările BTC", ton: "neutru", titlu: titluB });
    else {
      var S = { urca: "↑ urcă", coboara: "↓ coboară", lateral: "↔ lateral" }, bmis = !!(br && br.miscare);
      var contra = (botDir === "long" && bd === "coboara") || (botDir === "short" && bd === "urca"), cu = (botDir === "long" && bd === "urca") || (botDir === "short" && bd === "coboara");
      out.push({ k: "btc", eticheta: "BTC", text: (S[bd] || "↔ lateral") + " pe 4h · " + (bmis ? "mișcare" : "liniște") + (bm !== null ? " (" + x1(bm) + ")" : ""),
        ton: contra ? (bmis ? "rau" : "atentie") : cu ? "bine" : "neutru", titlu: titluB });
    }
    return out;
  }

  return { dinPionex: dinPionex, celule: celule, rezumat: rezumat, estimare: estimare, predictie: predictie, mediu: mediu, ORIZONT: ORIZONT, RANDURI: RANDURI };
})();
if (typeof globalThis !== "undefined") globalThis.IndicatoriBot = IndicatoriBot;
