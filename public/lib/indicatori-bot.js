// Fereastra "Ce spun indicatorii" de langa graficul din Tabloul botului (v91.8, cererea lui 26.09).
// Pur (probat in scripts/indicatori-v918.mjs): primeste rezultatul lui calc() din app.js - ACELEASI
// calcule ca "Analizeaza piata" - pe fiecare interval si il traduce in celule scurte, plus rezumatul
// fata de directia botului. Descrie ce e acum pe grafic; NU e o predictie.
var IndicatoriBot = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
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
    { k: "ema", eticheta: "Medii EMA", titlu: "Mediile de 20, 50 și 200 de bare: 20 peste 50 peste 200 = urcare așezată; 20 sub 50 sub 200 = coborâre așezată; altfel neutru." },
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
    // v100.325 (el, 11.11.2026: „aplică regula simetrică și în tabel”): urcarea și coborârea „așezate” cer toate trei mediile în ordine, în oglindă;
    // înainte „20 sub 50” era ↓ și când 50 > 200, iar oglinda lui doar ↗ neutru (un short câștiga un „jos” pe care un long nu-l primea)
    var e20 = nr(q.e20Now), e50 = nr(q.e50Now), e200 = nr(q.e200Now);
    if (e20 !== null && e50 !== null && e200 !== null) o.ema = e20 > e50 && e50 > e200 ? { t: "↑", c: "good", titlu: "așezat pe urcare: 20 > 50 > 200" } : e20 < e50 && e50 < e200 ? { t: "↓", c: "bad", titlu: "așezat pe coborâre: 20 < 50 < 200" }
      : e20 > e50 ? { t: "↗", c: "neutral", titlu: "20 peste 50, dar 50 nu e peste 200" } : e20 < e50 ? { t: "↘", c: "neutral", titlu: "20 sub 50, dar 50 nu e sub 200" } : { t: "↔", c: "neutral", titlu: "20 și 50 egale" };
    // fără cifre (calc vechi): tot în oglindă - fără 200 nu știm „coborâre așezată” ⇒ „20 sub 50” e neutru, ca „20 peste 50”
    else o.ema = q.ema ? { t: "↑", c: "good", titlu: "așezat pe urcare: 20 > 50 > 200" } : q.emaDir === "UP" ? { t: "↗", c: "neutral", titlu: "20 peste 50, dar nu peste 200" } : q.emaDir === "DOWN" ? { t: "↘", c: "neutral", titlu: "20 sub 50" } : LIPSA;
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
  // v100.328 (el, 11.11.2026: „nu poți pune detaliile indicatorilor și în Trading 212 la fel ca la bot?” ⇒ „da, fă așa”): vorbele textelor - ale botului
  // (implicite, neschimbate) sau ale unei poziții în acțiuni (long; la bursă o zi are 2 bare de 4 ore ⇒ orizonturile și istoria în ședințe, nu în ore / zile)
  var VORBE_BOT = { tau: "botul tău", cu: "cu botul", gen: "botului", ajuta: "botul", lui: "lui", istoric: "monedei", orizont: ORIZONT, pred: "16 ore", sedinte: false,
    surse: "Radarul (bare închise, Pionex) și TradingView (bara în curs, Binance)" };
  var VORBE_POZITIE = { tau: "poziția ta", cu: "cu poziția", gen: "poziției", ajuta: "poziția", lui: "ei", istoric: "acțiunii",
    orizont: { "15 min": "1 oră", "1 oră": "4 ore de bursă", "4 ore": "2 ședințe", "1 zi": "4 ședințe" }, pred: "2 ședințe", sedinte: true,
    surse: "Radarul (bare închise, Twelve Data) și TradingView (bara în curs)" };
  function vorbe(v) { return v && v.tau ? v : VORBE_BOT; }
  function estimare(hp, orizont, v) {
    var V = vorbe(v), up = hp ? nr(hp.up) : null;
    if (up === null) return { t: "—", c: "lipsa", titlu: "prea puține bare pentru estimare (îi trebuie cel puțin 260)" };
    var sus = up >= 50, pct = Math.round(sus ? up : 100 - up), b = nr(hp.banda);
    return { t: (sus ? "↑" : "↓") + pct + "%", c: hp.inBanda ? "neutral" : sus ? "good" : "bad",
      titlu: "în " + (hp.k ? cate(hp.k, "situație", "situații") : "? situații") + " asemănătoare din istoricul " + V.istoric + ", după " + orizont + " prețul a " + (sus ? "urcat" : "coborât") + " în " + pct + "% din cazuri" +
        (b !== null ? " (zgomotul e ±" + Math.round(b) + (hp.inBanda ? ": e în zgomot, fără semn" : "") + ")" : "") + ". " + CINSTIT };
  }
  // predictia pe orizontul botului: bara de 4 ore (16 ore inainte); botul tine zile
  function predictie(randuri, botDir, v) {
    var V = vorbe(v), pe = "Estimare pe " + V.pred + ": ";
    var r = (Array.isArray(randuri) ? randuri : []).filter(function (x) { return x && x.eticheta === "4 ore"; })[0], hp = r && r.hp, up = hp ? nr(hp.up) : null;
    if (up === null) return { ton: "neutru", text: pe + "n-am destule bare de 4 ore în istoric. " + CINSTIT };
    var sus = up >= 50, pct = Math.round(sus ? up : 100 - up), avg = nr(hp.avg);
    var bz = nr(hp.banda);
    if (hp.inBanda) return { ton: "neutru", text: pe + "fără semn — în situații asemănătoare a " + (sus ? "urcat" : "coborât") + " în " + pct + "% din cazuri, dar sunt prea puține ca să conteze" + (bz !== null ? " (zgomotul e ±" + Math.round(bz) + ")" : "") + ". " + CINSTIT };
    var fata = botDir === "long" ? (sus ? " — în favoarea " + V.gen : " — împotriva " + V.gen) : botDir === "short" ? (sus ? " — împotriva " + V.gen : " — în favoarea " + V.gen) : "";
    return { ton: "neutru", text: pe + (sus ? "urcare" : "coborâre") + " în " + pct + "% din situațiile asemănătoare" + (avg !== null ? " (în medie " + (avg >= 0 ? "+" : "−") + Math.abs(avg).toFixed(1).replace(".", ",") + "%)" : "") + fata + ". " + CINSTIT };
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
    var titluMis = "Mișcare mare = pe 24 h peste 9 zile din 10 ale monedei (pe ultimele ~3 săptămâni), adică ~1 zi din 10; cifrele sunt față de mișcarea ei obișnuită. Contează sensul: pe 40 de monede (27.09), după o mișcare CU botul gridul a ieșit pe plus în 59% din ferestre, contra 50%, în liniște 56% — nimic dovedit; regula „nu porni grid nou după mișcare” rămâne pentru pornire.";   // v100.269 (ideile auditului 29.10): definiția comună GridCalcul.miscareMare, nu „1,5×”
    if (r4 === null && r24 === null) out.push({ k: "miscare", eticheta: "Mișcarea", text: "n-am destule bare de 1 oră", ton: "neutru", titlu: titluMis });
    else {
      var mis = !!rg.miscare, parti = [], bd = String(botDir || "").toLowerCase();
      var cu = mis && rg.sens && (bd === "long" || bd === "short") ? (bd === "long") === (rg.sens === "urca") : null;
      if (r4 !== null) parti.push("4h " + x1(r4)); if (r24 !== null) parti.push("24h " + x1(r24));
      out.push({ k: "miscare", eticheta: "Mișcarea", text: (mis ? (cu === true ? "mișcare cu botul" : cu === false ? "mișcare contra botului" : "mișcare") : "liniște") + " · " + parti.join(" · ") + " din obișnuit",
        ton: !mis || cu === true ? "bine" : "rau",
        titlu: titluMis + (cu === true ? " Acum mișcarea e cu botul: l-aș lăsa să lucreze, cu opritorul la prețul de zero." : mis ? " Acum e mișcare" + (cu === false ? " împotriva botului" : "") + ": n-aș adăuga bani." : "") });
    }
    var f = o.funding, rate = f ? nr(f.rate) : null, ore = f && nr(f.intervalOre) ? f.intervalOre : 8;
    var titluF = "Funding-ul se plătește la fiecare " + (ore === 1 ? "oră" : cate(ore, "oră", "ore")) + " între long și short. Mult peste obișnuit = mulți înghesuiți pe o parte; pe partea botului e și cost, și risc de descărcare bruscă a prețului.";
    if (rate === null) out.push({ k: "funding", eticheta: "Funding", text: "n-am rata de la Pionex", ton: "neutru", titlu: titluF });
    else {
      var med = median((f.hist || []).map(Number)), plateste = rate > 0 ? "long" : rate < 0 ? "short" : null;
      var botPlateste = plateste && botDir === plateste, botIncaseaza = plateste && (botDir === "long" || botDir === "short") && botDir !== plateste;
      var raport = med && med * rate > 0 ? Math.abs(rate / med) : null;
      var fata = raport === null ? "" : raport >= 2 ? " · " + Math.round(raport) + "× față de obicei" : raport <= 0.5 ? " · sub obicei" : " · ca de obicei";
      var fz = nr(o.fundingZi), cost = fz !== null ? " · botul: " + TextRo.usdt(fz, TextRo.zecMici(fz)) + " pe zi" : "";
      var cine = plateste ? "plătesc " + plateste + (botPlateste ? " (tu plătești)" : botIncaseaza ? " (tu încasezi)" : "") : "zero";
      // v100.70 (revizia pachetului 3, garda pe producatorii reali): minusul tipografic („−0,060%”), nu cratima din toFixed
      out.push({ k: "funding", eticheta: "Funding", text: (rate < 0 ? "−" : "") + Math.abs(rate * 100).toFixed(3).replace(".", ",") + "% la " + ore + "h · " + cine + fata + cost,
        ton: botPlateste && raport !== null && raport >= 2 && Math.abs(rate) >= 0.0001 ? "atentie" : botIncaseaza ? "bine" : "neutru", titlu: titluF,
        // v100.266 (F6): pentru alerta „funding-ul s-a întors” - botul plătește și plata dinainte (hist[1], istoria e de la nou la vechi) tot contra lui
        botPlateste: !!botPlateste, doi: !!(botPlateste && nr((f.hist || [])[1]) !== null && nr(f.hist[1]) * rate > 0), rata: rate, ore: ore });
    }
    var b = o.btc, bd = b && b.dir, br = b && b.regim, bm = br ? nr(br.r24h) : null;   /* v100.272: cifra pe 24 h, ca verdictul „mișcare / liniște” (regim.miscare e pe o zi) */
    var titluB = "Monedele mici merg de obicei după BTC: o cădere bruscă a lui trage și moneda botului spre marginea de jos a gridului.";
    if (!bd) out.push({ k: "btc", eticheta: "BTC", text: "n-am lumânările BTC", ton: "neutru", titlu: titluB });
    else {
      var S = { urca: "↑ urcă", coboara: "↓ coboară", lateral: "↔ lateral" }, bmis = !!(br && br.miscare);
      var contra = (botDir === "long" && bd === "coboara") || (botDir === "short" && bd === "urca"), cu = (botDir === "long" && bd === "urca") || (botDir === "short" && bd === "coboara");
      out.push({ k: "btc", eticheta: "BTC", text: (S[bd] || "↔ lateral") + " pe 4h · " + (bmis ? "mișcare" : "liniște") + (bm !== null ? " (" + x1(bm) + " pe 24 h)" : ""),
        ton: contra ? (bmis ? "rau" : "atentie") : cu ? "bine" : "neutru", titlu: titluB });
    }
    return out;
  }

  // ---- v100.324 (el, 11.11.2026: „detaliile indicatorilor când e închis să arate un grafic sau o bară cu direcția sau scorul” ⇒ I-857..I-861 ⇒
  // „fă toate”): ce se vede în rândul ÎNCHIS al lui „Detaliile indicatorilor”, din ce e deja calculat (zero cereri noi) ----
  var SCURT = { "15 min": "15m", "1 oră": "1h", "4 ore": "4h", "1 zi": "1z" };
  var TV_TF = { "15 min": "15m", "1 oră": "1h", "4 ore": "4h", "1 zi": "1D" };
  var IND8 = RANDURI.filter(function (r) { return r.k !== "verdict"; });   // cei 8 indicatori (verdictul e rezultatul lor, nu încă unul)
  function directional(botDir) { return botDir === "long" || botDir === "short"; }
  // revizia 11.11: fără esc dat, textul tot se escapează (ca în tv-note.js)
  function escImplicit(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // revizia 11.11: lângă prag scorul cu o zecimală (63,6 cu pragul 64 nu e „64” cu ↔)
  function scorText(sc, p) { if (sc === null) return null; return p !== null && (Math.abs(sc - p) < 0.5 || Math.abs(sc - (100 - p)) < 0.5) ? (Math.round(sc * 10) / 10).toFixed(1).replace(".", ",") : String(Math.round(sc)); }
  // I-857: pe fiecare interval, săgeata și scorul verdictului + câți din cei 8 indicatori sunt cu botul / neutri / împotrivă. La short „jos” e cu
  // botul. „Încinsul” (RSI / Stochastic / Bollinger / MFI la extreme) nu e nici cu, nici împotrivă: intră la neutri, cu bucata lui. Lipsa nu se numără.
  function banda(randuri, botDir) {
    var dir = directional(botDir), vrea = botDir === "long" ? "BULLISH" : botDir === "short" ? "BEARISH" : null, opus = vrea === "BULLISH" ? "BEARISH" : vrea === "BEARISH" ? "BULLISH" : null;
    return (Array.isArray(randuri) ? randuri : []).map(function (x) {
      var et = x && x.eticheta || "", o = { eticheta: et, scurt: SCURT[et] || et, lung: /4 ore|1 zi/.test(et) };
      if (!x || !x.q) { o.lipsa = true; if (x && x.eroare) o.eroare = String(x.eroare); return o; }
      var q = x.q, sc = nr(q.score), cel = celule(q) || {};
      o.ver = q.ver || "NEUTRAL"; o.sageata = q.ver === "BULLISH" ? "↑" : q.ver === "BEARISH" ? "↓" : "↔";
      o.scor = sc === null ? null : Math.round(sc); o.prag = nr(q.prag); o.scorBrut = sc; o.scorTxt = scorText(sc, o.prag);
      o.faraDirectie = !dir; o.fata = !dir ? null : o.ver === vrea ? "cu" : o.ver === opus ? "contra" : "neutru";
      o.cu = 0; o.contra = 0; o.neutru = 0; o.incinsi = 0; o.numeCu = []; o.numeContra = []; o.numeNeutru = []; o.numeIncinsi = [];
      IND8.forEach(function (r) {
        var v = cel[r.k], c = v && v.c; if (!c || c === "lipsa") return;   // mediile: simetric chiar în celule (v100.325)
        if (c === "tbWarn") { o.neutru++; o.incinsi++; o.numeIncinsi.push(r.eticheta); return; }
        if (c === "neutral") { o.neutru++; o.numeNeutru.push(r.eticheta); return; }
        var sus = c === "good", cu = !dir || botDir === "long" ? sus : !sus;
        if (cu) { o.cu++; o.numeCu.push(r.eticheta); } else { o.contra++; o.numeContra.push(r.eticheta); }
      });
      o.total = o.cu + o.neutru + o.contra;
      return o;
    });
  }
  function eTitlu(v) { return v === "BULLISH" ? "urcă" : v === "BEARISH" ? "coboară" : "neutru"; }
  function fmt1(x) { var r = Math.round(x * 10) / 10; return r === 0 ? "0,0" : (r > 0 ? "+" : "−") + Math.abs(r).toFixed(1).replace(".", ","); }
  // I-859: nota TradingView (Technical Ratings, n.iv[tf].all) pe același interval; „diferit” = direcții opuse cu Radarul. clasa = TvNote.clasa (aceleași praguri).
  function tvBanda(n, b, clasa) {
    if (!n || !n.iv || typeof clasa !== "function") return null;
    return (Array.isArray(b) ? b : []).map(function (x) {
      var k = TV_TF[x.eticheta], v = k && n.iv[k] ? nr(n.iv[k].all) : null; if (v === null) return null;
      var c = clasa(v), dirTv = c.ton === "good" ? "sus" : c.ton === "bad" ? "jos" : "neutru";
      return { cod: c.cod, text: c.text, v: v, dir: dirTv, diferit: !x.lipsa && ((x.ver === "BULLISH" && dirTv === "jos") || (x.ver === "BEARISH" && dirTv === "sus")) };
    });
  }
  // I-860: ce a văzut ultima oară (săgeata pe interval) și ce s-a schimbat de atunci
  function amintire(b) { var o = {}; (Array.isArray(b) ? b : []).forEach(function (x) { if (!x.lipsa) o[x.eticheta] = x.sageata; }); return o; }
  function schimbari(prev, b) {
    return (Array.isArray(b) ? b : []).map(function (x) { var p = prev && !x.lipsa ? prev[x.eticheta] : undefined; return p && p !== x.sageata ? { era: p, acum: x.sageata } : null; });
  }
  function bandaHtml(b, tv, sch, botDir, esc, v) {
    esc = esc || escImplicit;
    var dir = directional(botDir), V = vorbe(v);
    var pe = "Indicatorii pe " + cate(b.length, "interval", "intervale"), lab = dir ? pe + ", față de " + V.tau + " (" + botDir + ")" : pe + " (botul n-are direcție: sus / jos)";
    var nCu = dir ? V.cu : "sus", nContra = dir ? "împotrivă" : "jos";
    return '<span class="ibBanda" role="group" aria-label="' + esc(lab) + '">' + b.map(function (x, i) {
      if (x.lipsa) return '<span class="ibCel ibLipsa" title="' + esc(x.eticheta + ": " + (x.eroare || "prea puține bare închise")) + '"><span class="ibTf">' + esc(x.scurt) + '</span><span class="ibVer">—</span></span>';
      var s = sch && sch[i], t = tv && tv[i];
      var cls = "ibCel" + (x.lung ? " ibLung" : "") + (x.fata === "cu" ? " ibCu" : x.fata === "contra" ? " ibContra" : x.faraDirectie ? (x.ver === "BULLISH" ? " ibSus" : x.ver === "BEARISH" ? " ibJos" : " ibNeutru") : " ibNeutru") + (s ? " ibSchimbat" : "");
      var tit = x.eticheta + ": " + eTitlu(x.ver) + (x.scorTxt !== null ? ", scor " + x.scorTxt : "") + (s ? " · s-a schimbat de la ultima ta privire (era " + s.era + ")" : "") +
        (x.numeCu.length ? " · " + nCu + ": " + x.numeCu.join(", ") : "") + (x.numeContra.length ? " · " + nContra + ": " + x.numeContra.join(", ") : "") +
        (x.numeNeutru.length ? " · neutri: " + x.numeNeutru.join(", ") : "") + (x.numeIncinsi.length ? " · la extreme: " + x.numeIncinsi.join(", ") : "");
      var seg = function (k, n) { return n > 0 ? '<i class="ibB ' + k + '" style="flex-grow:' + n + '"></i>' : ""; };
      var tvH = "";
      if (t) {
        var tcls = dir ? (t.dir === "neutru" ? "ibTvNeutru" : (t.dir === "sus") === (botDir === "long") ? "ibTvCu" : "ibTvContra") : (t.dir === "sus" ? "ibTvSus" : t.dir === "jos" ? "ibTvJos" : "ibTvNeutru");
        tvH = '<span class="ibTv ' + tcls + '" title="' + esc("TradingView " + x.eticheta + ": " + t.text + " (" + fmt1(t.v) + ")") + '">TV ' + esc(t.text) + '</span>' +
          (t.diferit ? '<em class="ibDif" title="' + esc(V.surse + " arată direcții opuse pe " + x.eticheta) + '">≠</em>' : "");
      }
      return '<span class="' + cls + '" title="' + esc(tit) + '"><span class="ibTf">' + esc(x.scurt) + '</span><span class="ibVer">' + esc(x.sageata + (x.scorTxt !== null ? " " + x.scorTxt : "")) + '</span>' +
        '<span class="ibBara" aria-hidden="true">' + seg("ibBCu", x.cu) + seg("ibBNeutru", x.neutru - x.incinsi) + seg("ibBIncins", x.incinsi) + seg("ibBContra", x.contra) + '</span>' +
        '<span class="ibNr">' + esc(dir ? x.cu + " cu · " + x.neutru + " · " + x.contra + " împ." : x.cu + " sus · " + x.neutru + " · " + x.contra + " jos") + '</span>' + tvH +
        (s ? '<span class="ibEra">era ' + esc(s.era) + '</span>' : "") + '</span>';
    }).join("") + '</span>';
  }
  // I-858: rigla scorului 0–100 pe 1 oră (subțire), 4 ore, 1 zi, cu pragul ADEVĂRAT al intervalului (calc: p.signal, 64–67): sub 100 − prag coboară,
  // peste prag urcă. Zona care ajută botul verde, cea opusă roșie. Fără prag (calc vechi) ⇒ doar semnul, fără zone inventate.
  function riglaHtml(b, botDir, esc, v) {
    esc = esc || escImplicit;
    var V = vorbe(v), dir = directional(botDir), alese = (Array.isArray(b) ? b : []).filter(function (x) { return !x.lipsa && x.scor !== null && /1 oră|4 ore|1 zi/.test(x.eticheta); });
    if (!alese.length) return "";
    // v100.327 (el, 11.11.2026, cu poza riglei: „fă mai explicit, că nu prea înțeleg direcția la ce arată”): sensul la vedere, nu doar în titlul de la mouse
    // (pe telefon nu se vede) - titlul riglei, cuvântul lângă cifră, capetele sub bare, legenda culorilor față de direcția botului
    var cuvant = function (x) { return x.ver === "BEARISH" ? "↓ jos" : x.ver === "BULLISH" ? "↑ sus" : "neutru"; };
    var leg = '<span class="ibRleg">' + (dir ? '<span><i class="ibLbun"></i>verde = cu ' + V.tau + ' (' + (botDir === "short" ? "short: câștigă când coboară" : "long: câștigă când urcă") + ')</span><span><i class="ibLrau"></i>roșu = împotriva ' + V.lui + '</span>' : "")
      + '<span><i class="ibLsemn"></i>liniuța = scorul acum</span></span>';
    var capete = '<span class="ibRax" aria-hidden="true"><i></i><span class="ibRaxB"><span>0 · ↓ jos</span><span>neutru</span><span>sus ↑ · 100</span></span><i></i></span>';
    return '<span class="ibRigle"><span class="ibRcap">Scorul indicatorilor, 0–100</span>' + alese.map(function (x) {
      var p = x.prag, zone = "", tit = x.eticheta + ": scor " + x.scorTxt;
      if (p !== null && p > 50 && p < 100) {
        var jos = 100 - p, mij = p - jos, zj = dir ? (botDir === "short" ? " ibZbun" : " ibZrau") : "", zs = dir ? (botDir === "long" ? " ibZbun" : " ibZrau") : "";
        zone = '<i class="ibZ ibZjos' + zj + '" style="width:' + jos + '%"></i><i class="ibZ ibZneutru" style="width:' + mij + '%"></i><i class="ibZ ibZsus' + zs + '" style="width:' + jos + '%"></i>';
        tit += " · până la " + jos + " coboară, de la " + p + " urcă (pragul acestui interval)" + (dir ? " · zona care ajută " + V.ajuta + " e marcată" : "");   // regula calc: ≥ prag / ≤ 100 − prag
      } else tit += " · pragul nu e cunoscut";
      var poz = Math.max(0, Math.min(100, Math.round((x.scorBrut !== null && x.scorBrut !== undefined ? x.scorBrut : x.scor) * 10) / 10));
      return '<span class="ibRigla' + (x.eticheta === "1 oră" ? " ibRsubtire" : "") + '" title="' + esc(tit) + '"><span class="ibRtf">' + esc(x.scurt) + '</span><span class="ibRbara">' + zone +
        '<b class="ibRsemn" style="left:' + poz + '%"></b></span><span class="ibRnr"><b>' + esc(String(x.scorTxt)) + '</b><small>' + cuvant(x) + '</small></span></span>';
    }).join("") + capete + leg + '</span>';
  }
  // I-861: scorul pe ultimele n bare închise (ferestre care se termină pe fiecare bară), cele vechi primele; calcul = calc din „Analizează piața”
  function istoricScor(j, n, calcFn) {
    var out = []; if (!Array.isArray(j) || typeof calcFn !== "function") return out;
    for (var k = n - 1; k >= 0; k--) {
      var len = j.length - k; if (len < 60) continue;
      var q = null; try { q = calcFn(j.slice(0, len)); } catch (e) { q = null; }
      if (q && nr(q.score) !== null) out.push({ s: Math.round(q.score), prag: nr(q.prag) });
    }
    return out;
  }
  function f2(x) { return String(Math.round(x * 100) / 100); }
  function sparkHtml(ist, botDir, esc, v) {
    esc = esc || escImplicit;
    if (!Array.isArray(ist) || ist.length < 2) return "";
    var V = vorbe(v);
    // v100.327 (el: „fă și graficul micuț la fel”): ca rigla - desenul mai mare (220 × 56), liniile punctate își scriu pragul și sensul („≥ 64 sus” /
    // „≤ 36 jos”, în coloana din dreapta), cifra de la început și cea de acum lângă punct; zona verde a botului are legenda sub desen
    // el: „mărește scorul pe 4 h pe lățime cât e panoul”: desenul ia toată lățimea cartelei - pe lățime procente (linia în desenul întins, x 0..100;
    // pragurile, zona, punctul și cifrele la „100%”), pe înălțime pixeli. Doar linia stă în desenul întins (grosimea ei rămâne, vector-effect);
    // punctul și cifrele stau în afara lui - rămân rotunde / drepte la orice lățime. Etichetele pragurilor: coloana lor de 56 px din dreapta.
    var H = 56, pad = 6, n = ist.length, y = function (s) { return pad + (1 - s / 100) * (H - 2 * pad); }, x = function (i) { return i * 100 / (n - 1); };
    var yEt = function (s) { var v = y(s) - 6; return v >= 12 ? v : y(s) + 14; };   // lângă marginea de sus cifra trece sub punct, nu se taie
    var p = ist[n - 1].prag, linii = "", bun = "", etP = "", legBun = "";
    if (p !== null && p > 50 && p < 100) {
      linii = '<line class="ibSpPrag" x1="0" x2="100%" y1="' + f2(y(p)) + '" y2="' + f2(y(p)) + '"></line><line class="ibSpPrag" x1="0" x2="100%" y1="' + f2(y(100 - p)) + '" y2="' + f2(y(100 - p)) + '"></line>';
      etP = '<svg class="ibSpPr" width="56" height="' + H + '" aria-hidden="true"><text class="ibSpEtP" x="0" y="' + f2(y(p) + 4) + '">≥ ' + p + ' sus</text><text class="ibSpEtP" x="0" y="' + f2(y(100 - p) + 4) + '">≤ ' + (100 - p) + ' jos</text></svg>';
      if (botDir === "short") { bun = '<rect class="ibSpBun" x="0" y="' + f2(y(100 - p)) + '" width="100%" height="' + f2(H - y(100 - p)) + '"></rect>'; legBun = "verde = cu " + V.tau + " (short: ≤ " + (100 - p) + ")"; }
      else if (botDir === "long") { bun = '<rect class="ibSpBun" x="0" y="0" width="100%" height="' + f2(y(p)) + '"></rect>'; legBun = "verde = cu " + V.tau + " (long: ≥ " + p + ")"; }
    }
    var pts = ist.map(function (o, i) { return f2(x(i)) + "," + f2(y(o.s)); }).join(" "), u = ist[n - 1];
    var cifre = '<text class="ibSpVal" x="0" y="' + f2(yEt(ist[0].s)) + '">' + ist[0].s + '</text><text class="ibSpVal" x="100%" y="' + f2(yEt(u.s)) + '" text-anchor="end">' + u.s + '</text>';
    var tit = "Scorul pe 4 ore, ultimele " + cate(n, "bară închisă", "bare închise") + ": de la " + ist[0].s + " la " + u.s + (p !== null ? " · liniile = pragurile (" + (100 - p) + " / " + p + ")" : "");
    // v100.327: sub desen, în cuvinte - ce e, câte bare (≈ zile; 6 bare de 4 h = o zi), de unde până unde și încotro; ce sunt liniile punctate și zona verde
    var d = u.s - ist[0].s, merge = d >= 3 ? "urcă" : d <= -3 ? "coboară" : "stă pe loc", ore = n * 4;
    var cat = V.sedinte ? "≈ " + cate(Math.max(1, Math.round(n / 2)), "ședință", "ședințe")   // v100.328: la bursă 2 bare de 4 ore pe ședință (9:30–13:30, 13:30–16:00)
      : ore < 24 ? cate(ore, "oră", "ore") : "≈ " + cate(Math.round(ore / 24), "zi", "zile");   // sub o zi orele (3 bare = 12 ore, nu „≈ 1 zi”)
    // încadrare: titlul sus, ca la riglă; sub desen „de unde → unde, încotro” și legenda zonei
    var titlu = "Scorul pe 4h, ultimele " + cate(n, "bară", "bare") + " (" + cat + ")";
    return '<span class="ibSpark" title="' + esc(tit) + '"><span class="ibRcap">' + esc(titlu) + '</span><span class="ibSpDes"><svg class="ibSpG" width="100%" height="' + H + '" aria-hidden="true">' + bun + linii +
      '<svg viewBox="0 0 100 ' + H + '" preserveAspectRatio="none" width="100%" height="' + H + '" overflow="visible"><polyline class="ibSpLinie" points="' + pts + '" vector-effect="non-scaling-stroke"></polyline></svg>' +
      '<circle class="ibSpAcum" cx="100%" cy="' + f2(y(u.s)) + '" r="3"></circle>' + cifre + '</svg>' + etP + '</span><span class="ibSpEt"><b>' + ist[0].s + " → " + u.s + '</b>, ' + merge + '</span>' + (legBun ? '<span class="ibSpEt"><i class="ibLbun"></i>' + esc(legBun) + '</span>' : '') + '</span>';
  }

  // v100.331 (el, 12.11: „la 1 fă și integrează în detaliile indicatorilor ca și indicator separat”): „Listele Radarului” - e moneda botului azi într-o
  // listă (pe revenire / pentru short) și cum au ieșit listele FAȚĂ DE PIAȚĂ, pe zile (colectorul: urmarireFixa, 7 zile). Fapte, fără culoare de
  // avantaj: listele n-au avantaj dovedit (eticheta dovezii stă în titlu). o = { moneda, dirBot, rev: [nume], short: [nume], fata: { revenire, short }, eticheta: { revenire, short } }
  function listeRadar(o) {
    o = o || {};
    var m = String(o.moneda || "").toUpperCase(), d = String(o.dirBot || "").toLowerCase(), rev = (o.rev || []).map(function (x) { return String(x).toUpperCase(); }), sh = (o.short || []).map(function (x) { return String(x).toUpperCase(); });
    var inR = !!m && rev.indexOf(m) >= 0, inS = !!m && sh.indexOf(m) >= 0;
    var parte = function (dirLista) { return d === dirLista ? " · de partea botului" : d === "long" || d === "short" ? " · contra botului" : ""; };
    var azi = !m ? "moneda botului nu se știe" : inR && inS ? m + " e în ambele liste (revenire și short): semnale opuse" : inS ? m + " e în „Monede pentru short”" + parte("short")
      : inR ? m + " e în „Monede pe revenire”" + parte("long") : m + " nu e azi în listele de revenire sau short";
    var cate = function (n) { return TextRo.cate(n, "zi", "zile"); };   /* garda v100.75: numărătoarea doar prin TextRo.cate */
    // revizia Opus (🔵5/6): tura a venit, dar nicio zi judecată ⇒ o spune; „mai bine decât piața” pe zilele cu piață, la short în direcția lui
    var fata = function (u, short) {
      if (!u) return "vine la tura de dimineață";
      if (!(u.zile > 0) || typeof u.exces !== "number" || !isFinite(u.exces)) return "încă nicio zi judecată (7 zile de la sugestie)";
      if (u.zile < 5 || !(u.ferestre >= 2)) return "prea puține zile ca să se vadă ceva (" + u.zile + "; arăt cifrele de la 5 zile judecate, prag ales)";   /* v100.333: ca pe Piața azi - pragul e ales, nu dovedit */
      var zp = u.zileCuPiata > 0 ? u.zileCuPiata : u.zile;
      return (u.exces < 0 ? "−" : "+") + Math.abs(u.exces * 100).toFixed(1).replace(".", ",") + " pp față de piață la 7 zile · mai bine decât piața" + (short ? " (pentru un short)" : "") + " în " + Math.round((u.zilePeste || 0) * zp) + " din " + cate(zp);
    };
    var F = o.fata || {}, E = o.eticheta || {};
    var titlu = function (nume, et) { return "Lista „" + nume + "”, urmărită la 7 zile față de mediana pieței din aceleași zile, numărat pe zile (nu pe monede); dovada pe istoric: " + (et || "—") + ". Fapte, nu un avantaj dovedit."; };
    return [
      { k: "liste-azi", eticheta: "Azi", text: azi, ton: "neutru", titlu: "Listele Radarului de azi (colectorul, de la 8:00): primele 5 pe revenire și primele 5 pentru short din clasament." },
      { k: "liste-rev", eticheta: "Revenire", text: fata(F.revenire), ton: "neutru", titlu: titlu("Monede pe revenire", E.revenire) },
      { k: "liste-short", eticheta: "Short", text: fata(F.short, true), ton: "neutru", titlu: titlu("Monede pentru short", E.short) }];
  }

  // v100.333 (el, 13.11: „în detaliile indicatorilor, în partea dreaptă mai ai spațiu gol, vreau să creezi și să pui acolo un grafic cu asta”):
  // pe fiecare zi judecată (7 zile după sugestie) câte pp a făcut lista față de mediana pieței din aceleași zile (colectorul: urmarireFixa.peZile).
  // Două grafice mici (revenire, short), ACEEAȘI scară, linia 0 = piața; o singură culoare (listele n-au avantaj dovedit: fără verde / roșu);
  // fiecare zi are hover pe toată coloana (data, lista, piața, diferența, câte monede). fata = { revenire: u, short: u }
  function listeGraficHtml(fata, esc) {
    fata = fata || {}; esc = esc || function (x) { return String(x); };
    var W = 300, H = 56, MIJ = H / 2, ziOk = function (z) { return z && /^\d{4}-\d{2}-\d{2}$/.test(String(z.zi)) && typeof z.exces === "number" && isFinite(z.exces); };
    var zz = function (u) { return u && Array.isArray(u.peZile) ? u.peZile.filter(ziOk) : []; }, R = zz(fata.revenire), S = zz(fata.short);
    if (!fata.revenire && !fata.short) return '<p class="tbSub lrGol">Pe zile: graficul apare după tura de dimineață a colectorului.</p>';
    var M = 0.005; R.concat(S).forEach(function (z) { M = Math.max(M, Math.abs(z.exces)); });
    var pc = function (v, u) { return typeof v === "number" && isFinite(v) ? (v < 0 ? "−" : "+") + Math.abs(v * 100).toFixed(1).replace(".", ",") + u : "—"; };
    var dd = function (z) { return String(z.zi).slice(8, 10) + "." + String(z.zi).slice(5, 7); };
    var unu = function (nume, l, u) {
      if (!l.length) return '<p class="tbSub lrGol">' + esc(nume) + ": " + (u ? "încă nicio zi judecată (7 zile de la sugestie)" : "vine la tura de dimineață") + "</p>";
      var pas = W / l.length, lat = Math.max(0.6, pas - Math.min(2, pas * 0.25)), bare = "";
      l.forEach(function (z, i) {
        var h = Math.max(1, Math.abs(z.exces) / M * (MIJ - 2)), y = z.exces >= 0 ? MIJ - h : MIJ, x = i * pas + (pas - lat) / 2, f = function (v) { return String(Math.round(v * 1000) / 1000); };
        var tit = dd(z) + ": lista " + pc(z.lista, "%") + " · piața " + pc(z.piata, "%") + " · față de piață " + pc(z.exces, " pp") + (z.n > 0 ? " · " + TextRo.cate(z.n, "monedă", "monede") : "");
        bare += '<g><rect class="lrHit" x="' + f(i * pas) + '" y="0" width="' + f(pas) + '" height="' + H + '"><title>' + esc(tit) + '</title></rect><rect class="lrBar" x="' + f(x) + '" y="' + f(y) + '" width="' + f(lat) + '" height="' + f(h) + '"></rect></g>';
      });
      return '<div class="lrUnu"><div class="lrCap"><span>' + esc(nume) + " · " + TextRo.cate(l.length, "zi", "zile") + '</span><span class="lrSc">±' + esc(pc(M, " pp").slice(1)) + '</span></div>' +
        '<svg class="lrGraf" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" width="100%" height="' + H + '" role="img" aria-label="' + esc(nume + ": față de piață, pe fiecare zi") + '">' +
        '<line class="lrZero" x1="0" y1="' + MIJ + '" x2="' + W + '" y2="' + MIJ + '" vector-effect="non-scaling-stroke"></line>' + bare + '</svg>' +
        '<div class="lrAx"><span>' + esc(dd(l[0])) + '</span><span>linia = piața</span><span>' + esc(dd(l[l.length - 1])) + "</span></div></div>";
    };
    return '<div class="lrGrafice">' + unu("Revenire", R, fata.revenire) + unu("Short", S, fata.short) +
      '<p class="tbSub lrNota">Bara în sus = lista a făcut mai bine decât piața în cele 7 zile de după; în jos = mai rău. Ține mouse-ul pe o zi pentru cifre.</p></div>';
  }

  return { dinPionex: dinPionex, celule: celule, rezumat: rezumat, estimare: estimare, predictie: predictie, mediu: mediu, ORIZONT: ORIZONT, RANDURI: RANDURI, listeRadar: listeRadar, listeGraficHtml: listeGraficHtml,
    banda: banda, bandaHtml: bandaHtml, tvBanda: tvBanda, amintire: amintire, schimbari: schimbari, riglaHtml: riglaHtml, istoricScor: istoricScor, sparkHtml: sparkHtml, VORBE_POZITIE: VORBE_POZITIE };
})();
if (typeof globalThis !== "undefined") globalThis.IndicatoriBot = IndicatoriBot;
