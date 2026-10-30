// Pagina Home "Piata azi" (v92, demo aprobat 26.09: claude.ai/artifact/CobyvP3cKMKpuegBsQHFJt).
// Pur (probat in scripts/acasa-v92.mjs): din clasamentul top 100 PERP, BTC, frica/lacomia, largimea pietei si
// tickerele Pionex face "vremea pietei" si textele de langa cifre. Descrie piata; singurul semnal DOVEDIT
// pentru grid e miscarea (clasamentul "de evitat"), restul descrie, nu prezice.
var Acasa = (function () {
  "use strict";
  function nr(x) { var v = typeof x === "string" && x.trim() ? Number(x) : x; return typeof v === "number" && isFinite(v) ? v : null; }
  // v100.268 (29.10, el: „Cele din macro.js”): pragurile pieței vin din Macro.PRAGURI (un singur loc); fără macro.js încărcat (probele vechi)
  // aceleași valori - proba v100268 le compară cu cele din Macro
  // v100.269 (ideile auditului 29.10): + latime (cota Nasdaq 100 peste media de 50), aceeași în Scorul zilei
  function praguri() { var p = typeof Macro !== "undefined" && Macro.PRAGURI ? Macro.PRAGURI : null; return { vix: p && p.vix || [12, 18, 25, 30], btc: p && p.btc || [0.6, 0.2, -0.2], latime: p && p.latime || [0.4, 0.6] }; }
  function textCorelatie(r) {
    var p = praguri().btc, rt = (r < -0.005 ? "−" : "") + Math.abs(r).toFixed(2).replace(".", ",");   // v100.72: minusul „−”
    return r > p[0] ? "BTC urmează bursa acum (" + rt + "): o scădere a Nasdaq trage și crypto."
      : r > p[1] ? "BTC e parțial legat de bursă acum (" + rt + "): o scădere mare a Nasdaq poate trage și crypto."
      : r > p[2] ? "BTC merge pe drumul lui acum (" + rt + "): bursa nu-l trage după ea." : "BTC merge invers față de bursă acum (" + rt + ").";
  }
  // v100.72: „99 de acțiuni” (de la 20 în sus cu „de”)
  // v100.75 (ideea 4): un rând de raport ≤ max - bucățile care nu mai încap trec pe rândul următor, cu „   ” în față (nimic tăiat)
  function randuri(prefix, bucati, sep, max) { var out = [], cur = prefix, gol = true; bucati.forEach(function (b) { if (!gol && (cur + sep + b).length > max) { out.push(cur); cur = "   " + b; } else { cur += (gol ? "" : sep) + b; gol = false; } }); out.push(cur); return out; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }   // v100.75: rezerva cu regula întreagă

  // o = { clasament: {evita, candidati, faraDate, dir: {long, neutru, short}}, btc: {miscare}, fg: numar }
  function vreme(o) {
    o = o || {};
    var c = o.clasament, ev = c ? nr(c.evita) : null, ca = c ? nr(c.candidati) : null;
    if (ev === null || ca === null || ev + ca <= 0) return { nivel: "fara-date", eticheta: "FĂRĂ DATE", titlu: "Clasamentul pieței n-a venit încă.", text: "Îl face colectorul de acasă o dată pe oră, pe primele 100 de monede după volum.", faCe: "" };
    var n = ev + ca, cota = ev / n, btcMis = !!(o.btc && o.btc.miscare), fg = fgValid(o.fg);   // v100.259: 0–100, ca regimul macro
    var d = c.dir || {}, lo = nr(d.long) || 0, sh = nr(d.short) || 0, tot = lo + sh + (nr(d.neutru) || 0);
    var sens = tot > 0 && lo / tot >= 0.6 ? "urca" : tot > 0 && sh / tot >= 0.6 ? "coboara" : "imp";
    var sensTxt = sens === "urca" ? "Piața urcă în general" : sens === "coboara" ? "Piața coboară în general" : "Piața e împărțită";
    // v100.70 (revizia pachetului 3, I4): lacomia / frica intra in actiune (o fraza ≤ 110 - inainte a doua fraza facea alerta de 207 caractere);
    // cate monede urca / coboara si „de acolo piața a revenit des” trec in text
    var lac = fg !== null && fg >= 70 && sens === "urca", fri = fg !== null && fg <= 30 && sens === "coboara", fgR = fg !== null ? Math.round(fg) : null;
    if (lac) sensTxt += " (" + lo + " din " + tot + " de monede)"; else if (fri) sensTxt += " (" + sh + " din " + tot + " de monede)";
    // v100.259 (auditul 23.10): fără „de la care piața a revenit des” - n-am măsurat ce urmează după frica mare; rămâne faptul
    var fgTxt = fg === null ? "" : fg >= 70 ? ", cu lăcomie mare" : fg <= 30 ? ", cu frică mare" : "";
    var adaos = lac ? ", fără pariuri mari pe urcare (lăcomia e la " + fgR + ")." : fri ? ", fără vânzări în panică (frica e la " + fgR + ")." : null;
    var text = sensTxt + fgTxt + ". " + ev + " din cele " + n + " de monede mari sunt în mișcare, regimul în care gridul iese cel mai rău.";
    var r;
    if (btcMis || cota >= 0.5) r = { nivel: "miscare", eticheta: "🔴 MIȘCARE", titlu: btcMis ? "BTC a intrat în mișcare: toată piața e agitată." : "Jumătate din piață e în mișcare.",
      faCe: lac ? "N-aș porni boți grid noi și n-aș mări pariurile pe urcare (lăcomia e la " + fgR + ")." : fri ? "N-aș porni boți grid noi și n-aș vinde în panică (frica e la " + fgR + ")."
        : "N-aș porni boți grid noi până nu se liniștește; pe cei porniți i-aș urmări cu alerta de mișcare." };
    else if (cota >= 0.25) r = { nivel: "amestecat", eticheta: "🟡 AMESTECAT", titlu: "BTC e liniștit, dar monedele mici sunt agitate.",
      faCe: "Aș porni boți grid doar pe monedele liniștite" + (adaos || ", nu pe cele din lista de mișcare.") };
    // v100.259 (auditul 23.10): liniștea nu e o dovadă că gridul câștigă (dovedit e doar că DUPĂ mișcare iese mai rău) ⇒ faptul, iar pornirea
    // rămâne la fișa fiecărei monede (același filtru „după mișcare nu” ca fișa, „mută gridul” și Scanul)
    else r = { nivel: "liniste", eticheta: "🟢 LINIȘTE", titlu: "Piața e liniștită: puține monede în mișcare.",
      faCe: "Aș porni boți grid doar unde fișa monedei zice PORNEȘTE" + (adaos || ", nu pe liniștea pieței singură.") };
    r.text = text; r.inMiscare = ev; r.total = n;
    return r;
  }

  // tickerele Pionex (open = acum 24 h) -> cine se misca azi, printre primele `top` PERP dupa volum
  function miscari(tickers, o) {
    o = o || {};
    var mis = {}; (o.inMiscare || []).forEach(function (s) { mis[String(s).replace(/_USDT_PERP$/, "")] = true; });
    var l = (Array.isArray(tickers) ? tickers : []).filter(function (x) { return x && /_USDT_PERP$/.test(String(x.symbol)) && (typeof GridCalcul === "undefined" || GridCalcul.eCrypto(x.symbol)); })   // v100.39: fara actiuni/marfuri tokenizate
      .map(function (x) { var op = nr(x.open), cl = nr(x.close), v = nr(x.amount), s = String(x.symbol).replace(/_USDT_PERP$/, ""); return { s: s, v: v, p: cl, ch: op > 0 && cl > 0 ? (cl / op - 1) * 100 : null, miscare: !!mis[s] }; })
      .filter(function (x) { return x.v > 0 && x.ch !== null; }).sort(function (a, b) { return b.v - a.v; }).slice(0, o.top || 60);
    var s = l.slice().sort(function (a, b) { return b.ch - a.ch; });
    return { n: l.length, urca: l.filter(function (x) { return x.ch > 0; }).length, sus: s.filter(function (x) { return x.ch > 0; }).slice(0, 5), jos: s.filter(function (x) { return x.ch < 0; }).reverse().slice(0, 5),
      gasit: function (sim) { for (var i = 0; i < l.length; i++) if (l[i].s === sim) return l[i]; return null; } };
  }

  // frica/lacomia: istoricul (cel mai vechi -> azi)
  // v100.259 (auditul 23.10, punctul 11): indicele e pe 0–100 - o valoare în afara scării (150 dintr-un răspuns stricat) nu e „lăcomie extremă”;
  // aceeași regulă ca regimul macro (Macro.scor, v100.255) și Consilierul
  function fgValid(v) { var x = nr(v); return x !== null && x >= 0 && x <= 100 ? x : null; }
  function fg(ist) {
    var r = (Array.isArray(ist) ? ist : []).map(nr).filter(function (v) { return v !== null; }), l = r.filter(function (v) { return fgValid(v) !== null; });
    if (!l.length) return { acum: null, min: null, max: null, text: "" };
    // ultima citire stricată ⇒ „acum” lipsește (nu se arată ieri drept azi); istoricul valid rămâne pentru minim / maxim
    var a = r.length && fgValid(r[r.length - 1]) !== null ? r[r.length - 1] : null, mi = Math.min.apply(null, l), ma = Math.max.apply(null, l);
    var t = "În ultimele " + cate(l.length, "zi", "zile") + " între " + Math.round(mi) + " și " + Math.round(ma);
    if (a === null) return { acum: null, min: mi, max: ma, text: t + "; citirea de azi e în afara scării 0–100, n-o folosesc." };
    var poz = ma > mi ? (a - mi) / (ma - mi) : 0.5, unde = poz >= 0.75 ? "aproape de vârf" : poz <= 0.25 ? "aproape de minim" : "la mijloc";
    t += "; acum " + unde + ".";
    // v100.259 (auditul 23.10): fără „urcările țin mai greu” / „de acolo piața a revenit des” - nemăsurat pe datele noastre; pragul scris = pragul folosit
    if (a >= 75) t += " Peste 75 e lăcomie extremă; ce urmează de acolo n-am măsurat.";
    else if (a <= 25) t += " Sub 25 e frică extremă; ce urmează de acolo n-am măsurat.";
    return { acum: a, min: mi, max: ma, text: t };
  }

  // largimea pietei (refreshMarketBreadthV64) -> barele din demo
  var STARE = { BULLISH: "pe urcare", BEARISH: "pe coborâre", NEUTRAL: "neutră" };
  function largime(x) {
    if (!x) return null;
    var P = function (v) { v = nr(v); return v === null ? null : Math.round(Math.max(0, Math.min(100, v))); };
    var rand = function (et, v, slab) { var p = P(v); return { eticheta: et, pct: p, text: p === null ? "fără date" : p + "%", ton: p === null ? "lipsa" : p < (slab || 50) ? "atentie" : "bine" }; };
    var bare = [rand("Participare", x.participation), rand("Peste media de 20", x.above20), rand("Peste media de 50", x.above50), rand("Peste media de 200", x.above200),
      rand("RSI peste 50", x.momentum), rand("Volumul participă", x.volume), rand("Altcoinii participă", x.altParticipation)];
    var sc = nr(x.score), hi = nr(x.highs), lw = nr(x.lows), div = String(x.divergence || "").toUpperCase();
    var a20 = P(x.above20), vol = P(x.volume), concl = "";
    if (a20 !== null && vol !== null && a20 >= 80 && vol < 50) concl = "Aproape toată piața e peste medii, dar volumul rămâne în urmă: urcare largă, fără multă convingere.";
    else if (a20 !== null && a20 >= 80) concl = "Aproape toată piața e peste medii, cu volum: urcare largă și susținută.";
    else if (a20 !== null && a20 <= 20) concl = "Aproape toată piața e sub medii: coborâre largă.";
    else if (a20 !== null) concl = "Piața e împărțită: o parte urcă, o parte coboară.";
    return { cap: (sc !== null ? Math.round(sc) + "/100" : "—") + (STARE[x.state] ? " · " + STARE[x.state] : ""), ton: x.state === "BULLISH" ? "bine" : x.state === "BEARISH" ? "rau" : "neutru",
      bare: bare, maxMin: (hi !== null && lw !== null ? hi + " / " + lw : "fără date") + (div && div !== "NONE" ? " · divergență " + div.toLowerCase() : " · fără divergență"), concluzie: concl };
  }

  // starile englezesti ale modulelor Pro -> romana (rezumatele grupurilor pliate)
  var RO = { "CAUTION": "prudență", "NORMAL": "normal", "LEARNING": "învață", "NOT READY": "nu încă", "READY": "gata", "WAIT": "așteaptă", "BULLISH": "urcare", "BEARISH": "coborâre",
    "NEUTRAL": "neutru", "COLLECTING": "strânge date", "N/A": "fără date", "DEFENSIVE": "defensiv", "BLOCKED": "blocat", "DEGRADED": "degradat", "CLEAR": "liber", "LOW SAMPLE": "prea puține date", "NO TEST": "netestat",
    "LOW": "puține", "WAIT DATA": "așteaptă datele", "HIGH": "multe", "MEDIUM": "medii", "OK": "în regulă" };
  function ro(t) { var k = String(t == null ? "" : t).trim(); return RO[k.toUpperCase()] || k; }

  // ======================= v93: partea Nasdaq (Home mixt) =======================
  function ema(c, n) { var k = 2 / (n + 1), e = c[0]; for (var i = 1; i < c.length; i++) e = c[i] * k + e * (1 - k); return e; }
  // v100.196 (auditul sever 14.10, lentila 6): RSI-ul Wilder (media netezită pe toată seria), ca app.js, grafic-bot.js și TradingView -
  // înainte media simplă pe ultimele 14 zile (Cutler): pe 2.000 de serii ~5 puncte diferență mediană, în 14% din cazuri altă zonă 30/70
  function rsi(c, n) { n = n || 14; if (c.length <= n) return 50; var g = 0, l = 0, i, d; for (i = 1; i <= n; i++) { d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } g /= n; l /= n; for (i = n + 1; i < c.length; i++) { d = c[i] - c[i - 1]; g = (g * (n - 1) + (d > 0 ? d : 0)) / n; l = (l * (n - 1) + (d < 0 ? -d : 0)) / n; } return l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  // bare zilnice {t,c} (cu ultima zi inchisa) -> rezumatul unei actiuni; colectorul il face in tura de idei
  function rezumatActiune(b) {
    var c = (Array.isArray(b) ? b : []).map(function (x) { return nr(x && x.c); }).filter(function (v) { return v !== null && v > 0; });
    if (c.length < 210) return null;
    var u = c[c.length - 1], m = [];
    for (var i = c.length - 120; i < c.length - 1; i++) m.push(Math.abs(c[i] / c[i - 1] - 1));
    m.sort(function (x, y) { return x - y; });
    var p75 = m[Math.floor(m.length * 0.75)] || 0, ch = (u / c[c.length - 2] - 1) * 100;
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    // v100.271 (ideile auditului 29.10): „în mișcare mare” = definiția comună (GridCalcul.miscareMare, k = 1 zi): azi peste percentila 90 a
    // zilelor ei (~1 zi din 10), ca pagina Acțiuni - nu |azi| > 1,5 × P75 pe 120 de zile; `mis` rămâne doar de arătat („× o zi obișnuită”)
    var mm = typeof GridCalcul !== "undefined" && GridCalcul.miscareMare ? GridCalcul.miscareMare(c.map(function (v) { return { c: v }; }), { k: 1 }) : null;
    return { p: u, ch: r2(ch), ch5: r2((u / c[c.length - 6] - 1) * 100), e50: u > ema(c.slice(-200), 50), e200: u > ema(c, 200), rsi: Math.round(rsi(c) * 10) / 10, mis: p75 > 0 ? r2(Math.abs(ch / 100) / p75) : null,
      mare: mm && typeof mm.mare === "boolean" ? mm.mare : null };
  }
  // v100.271: rândurile salvate înainte (fără `mare`, până trece colectorul nou) rămân pe raportul vechi, ca să nu arate „0” fals
  function inMiscareMare(x) { return typeof x.mare === "boolean" ? x.mare : nr(x.mis) !== null && x.mis > 1.5; }
  var MAG7 = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"];
  function largimeNdx(l) {
    l = (Array.isArray(l) ? l : []).filter(function (x) { return x && x.s && nr(x.ch) !== null; });
    if (!l.length) return null;
    var cnt = function (f) { return l.filter(f).length; };
    var s = l.slice().sort(function (a, b) { return b.ch - a.ch; }), tag = function (x) { return { s: x.s, ch: x.ch, miscare: inMiscareMare(x) }; };
    var mag = MAG7.map(function (k) { for (var i = 0; i < l.length; i++) if (l[i].s === k) return { s: k, ch: l[i].ch, e50: !!l[i].e50 }; return null; }).filter(Boolean);
    var mu = mag.filter(function (x) { return x.ch > 0; }).length;
    return { n: l.length, urca: cnt(function (x) { return x.ch > 0; }), e50: cnt(function (x) { return x.e50; }), e200: cnt(function (x) { return x.e200; }), rsi: cnt(function (x) { return nr(x.rsi) !== null && x.rsi > 50; }),
      inMiscare: l.filter(inMiscareMare).map(function (x) { return x.s; }),
      sus: s.filter(function (x) { return x.ch > 0; }).slice(0, 5).map(tag), jos: s.filter(function (x) { return x.ch < 0; }).reverse().slice(0, 5).map(tag),
      mag7: mag, mag7Urca: mu, mag7Text: mag.length ? mu + " din " + mag.length + " mari au urcat" + (mag.filter(function (x) { return x.e50; }).length ? ", " + mag.filter(function (x) { return x.e50; }).length + " peste media de 50" : "") : "" };
  }
  // qqq: bare zilnice {c}; vix: numar; ndx: largimeNdx(...)
  function vremeBursa(o) {
    o = o || {};
    var c = (Array.isArray(o.qqq) ? o.qqq : []).map(function (x) { return nr(x && x.c); }).filter(function (v) { return v !== null; }), vix = nr(o.vix), nd = o.ndx;
    if (c.length < 200) return { nivel: "fara-date", eticheta: "FĂRĂ DATE", titlu: "Bursele n-au venit încă.", text: "", faCe: "" };
    var u = c[c.length - 1], e50 = ema(c.slice(-200), 50), e200 = ema(c, 200), sens = u > e50 && e50 > e200 ? "sus" : u < e50 && e50 < e200 ? "jos" : "lateral";
    var cota = nd && nd.n ? nd.e50 / nd.n : null, vx = vix !== null ? "VIX " + vix.toFixed(1).replace(".", ",") : "";
    var partNd = nd && nd.n ? " Doar " + nd.e50 + " din " + cate(nd.n, "acțiune", "acțiuni") + " sunt peste media de 50 de zile." : "";
    if (vix !== null && vix >= 30) return { nivel: "frica", eticheta: "🔴 FRICĂ PE BURSĂ", titlu: "VIX e la " + vix.toFixed(1).replace(".", ",") + ": bursa e în panică.", text: "Peste 30, mișcările sunt mari în ambele sensuri.", faCe: "N-aș cumpăra acum; aș aștepta ca VIX să coboare sub 25." };
    if (sens === "jos") return { nivel: "scade", eticheta: "🔴 BURSA SCADE", titlu: "Nasdaq e în trend de coborâre.", text: "Prețul e sub mediile de 50 și 200 de zile" + (vx ? ", " + vx : "") + "." + (partNd ? partNd.replace("Doar ", "") : ""), faCe: "N-aș cumpăra contra trendului; aș ține doar ce are stopul pus." };
    if (sens === "lateral") return { nivel: "lateral", eticheta: "🟡 LATERAL", titlu: "Nasdaq n-are o direcție clară.", text: (vx ? vx + ". " : "") + partNd.trim(), faCe: "Aș cumpăra doar ce e deja pe trend, cu stop; restul aș aștepta." };
    // v100.269 (ideile auditului 29.10): pragurile lățimii din Macro.PRAGURI.latime - sub 0,4 ÎNGUSTĂ, 0,4–0,6 MIXTĂ (cum zice și Scorul zilei);
    // codul nivelului rămâne „ingusta” pentru amândouă (alerta „vremii” și cardul îl citesc), treapta e în `latime`
    var pl = praguri().latime;
    if (cota !== null && cota < pl[1]) return { nivel: "ingusta", latime: cota < pl[0] ? "ingusta" : "mixta", eticheta: cota < pl[0] ? "🟡 URCARE ÎNGUSTĂ" : "🟡 URCARE MIXTĂ", titlu: "Indicele urcă" + (vix !== null && vix < praguri().vix[1] ? " liniștit" : "") + ", dar doar o parte din acțiuni îl urmează.", text: "Nasdaq 100 în trend de urcare" + (vx ? ", " + vx : "") + ". Doar " + nd.e50 + " din " + cate(nd.n, "acțiune", "acțiuni") + " sunt peste media de 50 de zile.", faCe: "Aș cumpăra doar ce e deja pe trend, ca ideile de azi; n-aș prinde acțiunile de sub media de 200." };
    return { nivel: "larga", eticheta: "🟢 URCARE LARGĂ", titlu: "Bursa urcă, și o urmează majoritatea acțiunilor.", text: "Nasdaq 100 în trend de urcare" + (vx ? ", " + vx : "") + "." + (nd && nd.n ? " " + nd.e50 + " din " + cate(nd.n, "acțiune", "acțiuni") + " sunt peste media de 50 de zile." : ""), faCe: "Aș cumpăra ideile pe trend, mereu cu stop: mediul e bun." };
  }
  // corelatia randamentelor zilnice BTC - Nasdaq pe ultimele n zile COMUNE (bursa n-are weekend)
  function corelatie(btc, qqq, n) {
    n = n || 30;
    var zi = function (t) { return new Date(t).toISOString().slice(0, 10); }, mb = {};
    (Array.isArray(btc) ? btc : []).forEach(function (x) { if (x && nr(x.c) > 0) mb[zi(x.t)] = x.c; });
    var q = (Array.isArray(qqq) ? qqq : []).filter(function (x) { return x && nr(x.c) > 0 && mb[zi(x.t)]; }).sort(function (a, b) { return a.t - b.t; });
    var rb = [], rq = [];
    for (var i = 1; i < q.length; i++) { rq.push(q[i].c / q[i - 1].c - 1); rb.push(mb[zi(q[i].t)] / mb[zi(q[i - 1].t)] - 1); }
    rb = rb.slice(-n); rq = rq.slice(-n);
    if (rb.length < 15) return null;
    var m = function (l) { var s = 0; l.forEach(function (v) { s += v; }); return s / l.length; }, mbv = m(rb), mqv = m(rq), sx = 0, sy = 0, sxy = 0;
    for (var j = 0; j < rb.length; j++) { var dx = rb[j] - mbv, dy = rq[j] - mqv; sx += dx * dx; sy += dy * dy; sxy += dx * dy; }
    var r = sx > 0 && sy > 0 ? sxy / Math.sqrt(sx * sy) : 0;
    var text = textCorelatie(r);   /* v100.268: treptele din Macro.PRAGURI.btc (înainte 0,5 / −0,3 aici și 0,6 / 0,2 / −0,2 în macro) */
    return { r: r, n: rb.length, text: text };
  }
  // calendarul saptamanii (faireconomy): doar SUA, impact mare/mediu, doar ce urmeaza
  var ZILE = ["dum", "lun", "mar", "mie", "joi", "vin", "sâm"];
  function calendar(l, acum) {
    acum = acum || Date.now();
    var u = (Array.isArray(l) ? l : []).filter(function (x) { return x && x.country === "USD" && (x.impact === "High" || x.impact === "Medium"); })
      .map(function (x) { return { t: Date.parse(x.date), titlu: String(x.title || ""), mare: x.impact === "High", prognoza: x.forecast || "", anterior: x.previous || "" }; })
      .filter(function (x) { return isFinite(x.t) && x.t > acum; }).sort(function (a, b) { return a.t - b.t; }).slice(0, 8);
    var mari = u.filter(function (x) { return x.mare; }).length;
    var text = !u.length ? "Nimic important de aici până la sfârșitul săptămânii. Calendarul săptămânii viitoare apare duminică seara."
      : mari ? cate(mari, "eveniment mare", "evenimente mari") + " în SUA de aici până la sfârșitul săptămânii: în ziua lor piețele se mișcă mai tare, n-aș porni boți noi chiar înainte." : "Doar evenimente de impact mediu în SUA săptămâna asta.";
    u.forEach(function (x) { var d = new Date(x.t); x.cand = ZILE[d.getDay()] + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); });
    return { urmatoare: u, text: text };
  }

  // ======================= v94 =======================
  // miscarea obisnuita: percentila 75 a miscarilor pe k bare (actiuni: zilnic k=1; crypto: bare de 1 ora, k=24), in %
  function miscareTipica(c, k) {
    var l = (Array.isArray(c) ? c : []).map(nr).filter(function (v) { return v !== null && v > 0; }), m = [];
    for (var i = k; i < l.length; i++) m.push(Math.abs(l[i] / l[i - k] - 1));
    if (m.length < 20) return null;
    m.sort(function (a, b) { return a - b; });
    return Math.round(m[Math.floor(m.length * 0.75)] * 10000) / 100;
  }
  function medianaDe(l) { var v = l.filter(function (x) { return x !== null && isFinite(x); }).sort(function (a, b) { return a - b; }); return v.length ? v[Math.floor(v.length / 2)] : null; }
  // funding-ul pe toata piata: l = [{s, rate, hist[]}] (Pionex fundingRates pe primele monede dupa volum)
  function fundingPiata(l) {
    l = (Array.isArray(l) ? l : []).filter(function (x) { return x && x.s && nr(x.rate) !== null; });
    if (!l.length) return null;
    var med = medianaDe(l.map(function (x) { return nr(x.rate); })), uz = medianaDe(l.map(function (x) { return medianaDe((x.hist || []).map(nr)); }));
    var lng = l.filter(function (x) { return x.rate > 0; }).length, raport = uz && uz * med > 0 ? med / uz : null;
    var ingh = l.slice().sort(function (a, b) { return b.rate - a.rate; }).slice(0, 3).map(function (x) { return { s: x.s, rate: x.rate }; });
    var pct = function (v) { var n = Number(v) * 100; return (n < 0 ? "−" : "") + Math.abs(n).toFixed(3).replace(".", ",") + "%"; };
    var ton = raport !== null && raport >= 3 && med > 0.0001 ? "atentie" : raport !== null && raport >= 3 && med < 0 ? "atentie" : "neutru";
    var coda = ton !== "atentie" ? "." : med < 0 ? ". Mulți s-au înghesuit pe short: coborârile țin mai greu și urcările vin mai brusc." : ". Mulți s-au înghesuit pe long: urcările țin mai greu și căderile vin mai brusc.";
    var text = lng + " din " + cate(l.length, "monedă", "monede") + ": plătesc long · funding median " + pct(med) + (raport !== null ? " (" + (raport >= 2 ? Math.round(raport) + "× față de obicei" : raport <= 0.5 ? "sub obicei" : "ca de obicei") + ")" : "") + coda;
    return { n: l.length, long: lng, mediana: med, uzual: uz, raport: raport, inghesuiti: ingh, ton: ton, text: text };
  }
  // v100.235: același prag din fundingPiata. Semnul spune cine plătește. Lipsa semnului nu inventează o parte.
  function fundingAtentie(f) {
    if (!f || f.ton !== "atentie") return "";
    var m = nr(f.mediana);
    if (m === null || m === 0) return "";
    return m > 0 ? "long" : "short";
  }
  // ce s-a schimbat de ieri: azi {zi, fg, inMiscare, vix, ndxE50, ...} fata de ultima poza dinaintea zilei de azi
  function schimbari(azi, lista) {
    var ier = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && x.zi && azi && x.zi < azi.zi; }).sort(function (a, b) { return a.zi < b.zi ? -1 : 1; }).pop(), o = {};
    if (!ier) return o;
    Object.keys(azi).forEach(function (k) {
      if (k === "zi") return; var a = nr(azi[k]), b = nr(ier[k]); if (a === null || b === null) return;
      var d = Math.round((a - b) * 100) / 100; o[k] = { d: d, sag: d > 0 ? "↑" : d < 0 ? "↓" : "=", de: b };
    });
    return o;
  }

  // ======================= v95 =======================
  var SECT = {
    "Cipuri": "AMD ADI AMAT ARM ASML AVGO INTC KLAC LRCX MRVL MCHP MU MPWR NVDA NXPI QCOM TXN ALAB TER LITE SNDK",
    "Hardware & cloud": "AAPL CSCO STX WDC CRWV NBIS",
    "Software": "ADBE APP ADSK CDNS CRWD DDOG FTNT INTU MSFT PANW PLTR ROP SNPS WDAY MSTR ADP PAYX PYPL",
    "Internet & media": "GOOGL GOOG META NFLX CMCSA WBD TMUS TTWO",
    "Comerț & consum": "AMZN COST WMT PDD MELI SHOP ABNB BKNG DASH MAR SBUX ROST ORLY TSLA PEP KDP MDLZ MNST CCEP",
    "Sănătate": "ALNY AMGN DXCM GEHC GILD IDXX ISRG REGN VRTX",
    "Energie & utilități": "AEP BKR CEG EXC FANG XEL LIN",
    "Industrie & transport": "AXON CTAS CPRT CSX FAST FER HON HONA ODFL PCAR TRI RKLB SPCX"
  }, SECTOR = {};
  Object.keys(SECT).forEach(function (k) { SECT[k].split(" ").forEach(function (s) { SECTOR[s] = k; }); });
  function sectoare(l) {
    var g = {};
    (Array.isArray(l) ? l : []).forEach(function (x) {
      if (!x || !x.s || nr(x.ch) === null) return; var k = SECTOR[x.s] || "Altele";
      var o = g[k] || (g[k] = { nume: k, n: 0, sch: 0, sch5: 0, n5: 0, urca: 0 }); o.n++; o.sch += x.ch; if (nr(x.ch5) !== null) { o.sch5 += x.ch5; o.n5++; } if (x.ch > 0) o.urca++;
    });
    return Object.keys(g).map(function (k) { var o = g[k]; return { nume: o.nume, n: o.n, ch: Math.round(o.sch / o.n * 100) / 100, ch5: o.n5 ? Math.round(o.sch5 / o.n5 * 100) / 100 : null, urca: o.urca }; })
      .sort(function (a, b) { return (b.ch5 == null ? -1e9 : b.ch5) - (a.ch5 == null ? -1e9 : a.ch5); });
  }
  // ziua ta: boti si contul T212 fata de poza de ieri dimineata.
  // v100.40 (audit 30.09): la boti NU mai scade sumele a doua seturi diferite de boti (29.09 -> 30.09 arata −3,23 USDT intr-o zi cu
  // LIGHTER inchis pe −59). Acum, pe bot (azi.botiPeId / ier.botiPeId): cei din ambele poze -> diferenta; cei inchisi intre timp ->
  // rezultatul lor net final (inchise: [{id, net|rezultat}]) minus cat aveau ieri; cei porniti de atunci -> totalul lor de acum.
  // Fara totalurile pe bot in poza de ieri (pozele vechi) si cu alt set de boti -> null (randul nu se arata), nu o cifra falsa.
  function ziuaTa(azi, lista, ziAzi, inchise) {
    var ier = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && x.zi && x.zi < ziAzi; }).sort(function (a, b) { return a.zi < b.zi ? -1 : 1; }).pop();
    if (!ier || !azi) return null;
    var d = function (k) { var a = nr(azi[k]), b = nr(ier[k]); return a !== null && b !== null ? Math.round((a - b) * 100) / 100 : null; };
    var boti = null, A = azi.botiPeId, B = ier.botiPeId;
    if (A && B && typeof A === "object" && typeof B === "object") {
      var inc = {}; (Array.isArray(inchise) ? inchise : []).forEach(function (t) { if (t && t.id) inc[String(t.id)] = nr(t.net !== undefined && t.net !== null ? t.net : t.rezultat); });
      var s = 0, ok = true;
      Object.keys(A).forEach(function (id) { var a = nr(A[id]), b = nr(B[id]); if (a === null) ok = false; else s += a - (b === null ? 0 : b); });
      Object.keys(B).forEach(function (id) { if (A[id] !== undefined) return; var f = inc[id], b = nr(B[id]); if (f === null || f === undefined || b === null) ok = false; else s += f - b; });
      boti = ok ? Math.round(s * 100) / 100 : null;
    } else if (azi.botiPeId && ier.botiPeId === undefined) boti = null;
    else boti = d("botiTotal");
    var o = { boti: boti, t212: d("t212Total"), de: ier.zi };
    return o.boti === null && o.t212 === null ? null : o;
  }
  // raportul de duminica seara (Discord): saptamana care a trecut + ce vine + ce as face
  function semn(v, z) { return v === null || v === undefined || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(z == null ? 1 : z).replace(".", ",") + "%"; }
  function raportSaptamana(o) {
    o = o || {}; var L = [];
    // v100.72 (pachetul 5): etichetele vremii fara majuscule de strigat; actiunile pe randuri separate (inainte, trei intr-un rand de 208)
    L.push("₿ Crypto: BTC " + semn(nr(o.btc7)) + " pe 7 zile" + (o.vreme && o.vreme.eticheta ? " · acum " + o.vreme.eticheta.toLowerCase() : ""));
    L.push("📈 Nasdaq " + semn(nr(o.qqq5)) + " pe săptămână" + (nr(o.vix) !== null ? " · VIX " + nr(o.vix).toFixed(1).replace(".", ",") : "") + (o.vremeBursa && o.vremeBursa.eticheta ? " · " + o.vremeBursa.eticheta.toLowerCase() : ""));
    var mm = function (l) { return (l || []).slice(0, 3).map(function (x) { return x.s + " " + semn(nr(x.ch5)); }).join(", "); };
    if ((o.sus || []).length || (o.jos || []).length) L.push("↕ Nasdaq 100 pe săptămână: sus " + (mm(o.sus) || "—") + " · jos " + (mm(o.jos) || "—"));
    // v100.166 (12.10, Weekly Review mutat aici): lățimea crypto și a acțiunilor US, cu textul rândurilor din „Ce spune piața acum”; lipsă ⇒ fără rând
    if (o.latime) L.push("🌐 Lățimea crypto (150 perp-uri): " + o.latime);
    if (o.latimeUs) L.push("🗽 Acțiuni US: " + o.latimeUs);
    var bt = nr(o.botiTotal), tp = nr(o.t212Ppl);
    if (bt !== null || tp !== null) L.push("💼 Tu: boți " + (bt === null ? "—" : (bt >= 0 ? "+" : "−") + Math.abs(bt).toFixed(2).replace(".", ",") + " USDT") + " · acțiuni deschise " + (tp === null ? "—" : (tp >= 0 ? "+" : "−") + Math.abs(Math.round(tp)).toLocaleString("ro-RO") + " lei"));
    var cal = (o.calendar || []).filter(function (x) { return x && x.mare; }).slice(0, 5);
    if (cal.length) randuri("📅 Săptămâna asta: ", cal.map(function (x) { return x.cand + " " + x.titlu; }), " · ", 160).forEach(function (l) { L.push(l); });
    else L.push("📅 Săptămâna asta: nimic mare anunțat încă în SUA");
    var rz = (o.rezultate || []).slice(0, 4);
    if (rz.length) L.push("🧾 Rezultate la acțiunile tale: " + rz.map(function (x) { return x.simbol + " " + x.data; }).join(" · "));
    var n0 = L.length;
    if (o.vreme && o.vreme.faCe) L.push("👉 Crypto: " + o.vreme.faCe);
    if (o.vremeBursa && o.vremeBursa.faCe) L.push("👉 Bursă: " + o.vremeBursa.faCe);
    if (cal.length) L.push("👉 N-aș porni boți noi și n-aș cumpăra chiar înainte de " + cal[0].titlu + ".");
    if (L.length === n0) L.push("👉 Aș aștepta datele de luni dimineață.");
    return { nivel: "info", titlu: "📊 Săptămâna pieței", mesaj: L.join("\n") };
  }
  // v100.231: gura care invită citește pauza, raportul pe tot contul și evenimentul de azi.
  // v100.233: după pauză, gura crypto care invită aude și abaterea de cantitate (aceeași frază ca la acțiuni) și exportul care nu se potrivește cu API-ul.
  // vreme() și vremeBursa() rămân neschimbate; frâna se aplică după ele, la afișare și la trimitere.
  // audit 23.10: abaterea e a jurnalului T212 ⇒ frâna stă pe cardul Nasdaq, nu pe Crypto, și spune unde se vede.
  // Fraza veche („N-aș da o sumă: jurnalul nu se potrivește cu cantitatea din cont.”) rămâne pe paginile T212 (actiuni-semnale, t212-ecran).
  var FRAZA_CANTITATE = "N-aș da o sumă: jurnalul T212 nu se potrivește cu contul → Contul întreg.";
  var FRAZA_FUNDING = {
    long: "N-aș porni boți noi: longul plătește un funding mult peste obicei.",
    short: "N-aș porni boți noi: shortul plătește un funding mult peste obicei."
  };
  function invita(faCe, fel) { return fel === "bursa" ? /^Aș cumpăra/.test(String(faCe || "")) : /^Aș porni/.test(String(faCe || "")); }
  function areAbateriCantitate(o) {
    if (o.exportNePotrivit === true) return true;
    if (o.raportStare !== "ok" && o.raportStare !== "vechi") return false;
    var ab = o.raport && o.raport.reconciliere && o.raport.reconciliere.t212 && o.raport.reconciliere.t212.abateri;
    return Array.isArray(ab) && ab.length > 0;
  }
  function pctCont(x) { var v = nr(x); if (v === null) return "—"; return Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
  function frazaPauza(n) {
    var k = Math.round(Number(n)); if (!(k > 0)) k = 3;
    return "N-aș porni alt bot azi: " + cate(k, "pierdere", "pierderi") + " la rând.";
  }
  // audit 23.10: titlul frânat poartă tonul frânei (atenție), nu pe al pieței (verde pe „liniște”).
  function franaVerb(v, o) {
    var r = franaText(v, o);
    return r && v && r !== v && r.faCe !== v.faCe ? Object.assign(r, { ton: "atentie" }) : r;
  }
  function franaText(v, o) {
    o = o || {};
    if (!v || typeof v !== "object" || !v.faCe) return v;
    var fel = o.fel === "bursa" ? "bursa" : "crypto";
    if (fel === "crypto" && o.pauza === true) return Object.assign({}, v, { faCe: frazaPauza(o.pauzaN) });
    if (!invita(v.faCe, fel)) return v;
    if (fel === "bursa" && areAbateriCantitate(o)) return Object.assign({}, v, { faCe: FRAZA_CANTITATE });
    if (o.raportStare === "lipsa") return Object.assign({}, v, { faCe: "N-aș porni nimic nou: raportul pe tot contul lipsește." });
    if (o.raportStare === "vechi") {
      var ore = Math.round(Number(o.raportOre)); if (!(ore > 0)) ore = 12;
      return Object.assign({}, v, { faCe: "N-aș porni nimic nou: raportul pe tot contul e vechi de " + cate(ore, "oră", "ore") + "." });
    }
    var rap = o.raport, tot = rap && rap.valoare ? nr(rap.valoare.total) : null, va = rap && rap.risc ? nr(rap.risc.var95) : null;
    if (o.raportStare === "ok" && tot > 0 && va > 0.04 * tot) return Object.assign({}, v, { faCe: "Aș reduce expunerea până sub 4% pe zi: o zi proastă îți ia ~" + pctCont(va / tot) + " din cont." });
    var ev = o.eveniment ? String(o.eveniment).replace(/[.!?]+$/g, "").trim() : "";
    if (ev) {
      var prefix = "N-aș porni boți noi și n-aș cumpăra chiar înainte de ";
      var fraza = prefix + ev + ".";
      if (fraza.length > 110) {
        var loc = 110 - prefix.length - 1;
        var tai = ev.lastIndexOf(" ");
        ev = (tai > 0 && tai < loc ? ev.slice(0, tai) : ev.slice(0, Math.max(0, loc - 1))) + "…";
        fraza = prefix + ev + ".";
      }
      return Object.assign({}, v, { faCe: fraza });
    }
    var ff = fel === "crypto" ? FRAZA_FUNDING[o.fundingAtentie] : "";
    if (ff) return Object.assign({}, v, { faCe: ff });
    return v;
  }
  // v100.233: măsura frânei pe zilele la care s-au salvat pauza, starea raportului și evenimentul. Fără ele: n-am aflat.
  // v100.236: aceeași carte spune și suma din zilele în care gura ar fi rămas „Aș porni”, și desparte boții de după ora primei poze.
  // Sub 10 boți pe o parte nouă: n-am aflat, fără sumă. Zilele fără oră rămân în suma veche. `la` nu e obligatoriu: ziua veche rămâne completă.
  // v100.238: când `la` există, măsura spune ora HH:MM, ora României. Partea liniștită își spune numărul de zile; sub 10 zile, eșantionul stă și acolo. Fără oră inventată.
  // Nu reconstruiește VaR-ul din prețuri și nu amestecă frâna veche din obiceiuri. Nu e dovadă că frâna face bani.
  function ziBucMs(t) {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)); }
    catch (e) { return ""; }
  }
  function ziFranaCompleta(z) {
    return !!(z && typeof z.z === "string" && /^\d{4}-\d{2}-\d{2}$/.test(z.z) && typeof z.pauza === "boolean" && (z.raportStare === "ok" || z.raportStare === "vechi" || z.raportStare === "lipsa") && typeof z.eveniment === "string");
  }
  function ziAfis(z) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(z || "")); return m ? m[3] + "." + m[2] + "." + m[1] : ""; }
  function oraPozei(t) {
    var n = Number(t);
    if (!(n > 0)) return "";
    try {
      var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(n));
      var hh = "", mm = "";
      for (var i = 0; i < p.length; i++) { if (p[i].type === "hour") hh = p[i].value; if (p[i].type === "minute") mm = p[i].value; }
      if (!hh || !mm) return "";
      return hh.slice(-2).padStart(2, "0") + ":" + mm.slice(-2).padStart(2, "0");
    } catch (e) { return ""; }
  }
  function frazaOre(schimbate) {
    var chei = Object.keys(schimbate).filter(function (k) { return Number(schimbate[k].la) > 0; }).sort();
    var parti = chei.map(function (k) {
      var hm = oraPozei(schimbate[k].la);
      if (!hm) return "";
      return chei.length === 1 ? hm : ziAfis(schimbate[k].z) + " " + hm;
    }).filter(Boolean);
    if (!parti.length) return "";
    // v100.275 (30.10, el: „sună cam ciudat”): „ora pozei” ⇒ ora de la care frâna ar fi zis „nu porni”
    return (parti.length === 1 ? ", de la ora " : ", de la: ") + parti.join(", ") + " (ora României)";
  }
  function pozaText(lista) {
    var zs = (lista || []).slice().sort(function (a, b) { return String(a && a.z) < String(b && b.z) ? -1 : 1; }).map(function (z) { return ziAfis(z && z.z); }).filter(Boolean);
    if (!zs.length) return "";
    if (zs.length <= 3) return " (" + zs.join(", ") + ")";
    return " (" + zs[0] + " – " + zs[zs.length - 1] + ")";
  }
  function unesteZileFrana(locale, kv) {
    var pe = {};
    function pune(z) {
      if (!z || typeof z.z !== "string") return;
      var vechi = pe[z.z], a = ziFranaCompleta(vechi), b = ziFranaCompleta(z);
      if (!vechi || (b && !a)) pe[z.z] = z;
    }
    (Array.isArray(locale) ? locale : []).forEach(pune);
    (Array.isArray(kv) ? kv : []).forEach(pune);
    return Object.keys(pe).sort().map(function (k) { return pe[k]; });
  }
  // v100.275: rezultatele cu o singură zecimală (regula lui din 03.10); fără „−0,0”
  function banFrana(x) {
    var n = Number(x), p = Math.abs(n).toFixed(1).split("."), neg = n < 0 && Number(p.join(".")) > 0;
    return (neg ? "−" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
  }
  function masuraFranei(boti, zile) {
    var lipsa = "N-am aflat: zilele vechi nu au pauza, VaR-ul și evenimentul salvate.";
    var lista = Array.isArray(zile) ? zile : [], complete = lista.filter(ziFranaCompleta);
    if (!complete.length) return { aflat: false, text: lipsa, zile: lista.length, complete: 0, schimbate: 0, baza: null, rezultat: null, insuficient: true, boti: 0 };
    var verb = { faCe: "Aș porni un bot azi." }, sch = {}, lin = {};
    complete.forEach(function (z) {
      var o = { fel: "crypto", raportStare: z.raportStare, eveniment: z.eveniment };
      if (z.pauza === true) { o.pauza = true; if (z.pauzaN) o.pauzaN = z.pauzaN; }
      if (z.raportOre) o.raportOre = z.raportOre;
      if (z.raport) o.raport = z.raport;
      if (z.exportNePotrivit === true) o.exportNePotrivit = true;
      if (z.fundingAtentie === "long" || z.fundingAtentie === "short") o.fundingAtentie = z.fundingAtentie;
      var d = franaVerb(verb, o);
      if (!d || d.faCe !== verb.faCe) sch[z.z] = z; else lin[z.z] = z;
    });
    function gol() { return { n: 0, baza: 0, nBaza: 0, lipsaBaza: 0, rez: 0, nRez: 0 }; }
    function adauga(s, b) {
      s.n++;
      var bz = b.baza == null || b.baza === "" ? null : Number(b.baza);
      if (bz != null && isFinite(bz)) { s.baza += bz; s.nBaza++; } else s.lipsaBaza++;
      var rz = b.rezultat == null || b.rezultat === "" ? null : Number(b.rezultat);
      if (rz != null && isFinite(rz)) { s.rez += rz; s.nRez++; }
    }
    var vechi = gol(), dupa = gol(), inainte = gol(), quiet = gol(), nOra = 0, carte = Array.isArray(boti);
    Object.keys(sch).forEach(function (k) { if (Number(sch[k].la) > 0) nOra++; });
    if (carte) boti.forEach(function (b) {
      if (!b) return;
      var t = Number(b.pornit); if (!(t > 0)) return;
      var z = ziBucMs(t), sz = sch[z];
      if (sz) {
        var la = Number(sz.la);
        if (la > 0) adauga(t >= la ? dupa : inainte, b); else adauga(vechi, b);
      } else if (lin[z]) adauga(quiet, b);
    });
    // v100.275 (30.10, el: „sună cam ciudat pe descrierea asta”): aceleași socoteli, spuse pe limba lui - fără „gura”, „poza înghețată”,
    // „cartea închisă”, „partea liniștită”; sumele cu o zecimală
    function frazaPartea(nume, s) {
      if (!s.n) return nume + ": niciun bot.";
      if (s.n < 10) return nume + ": " + cate(s.n, "bot", "boți") + ", prea puțini ca să-i adun.";
      if (s.lipsaBaza) return nume + ": nu știu suma pusă, lipsește la " + cate(s.lipsaBaza, "bot", "boți") + ".";
      var t = nume + ": " + banFrana(s.baza) + " puși";
      if (s.nRez) t += ", rezultat " + banFrana(s.rez);
      return t + ".";
    }
    var nSch = Object.keys(sch).length, nLin = Object.keys(lin).length;
    var text = "Frâna de azi, pusă pe zilele salvate" + pozaText(complete) + ": "
      + (nSch ? "în " + cate(nSch, "zi", "zile") + " din " + complete.length + " ar fi zis „nu porni”" + frazaOre(sch) + "." : "n-ar fi zis „nu porni” în nicio zi.");
    if (!carte) text += " Nu am lista boților închiși, deci nu știu suma pusă.";
    else {
      if (nOra === 0 || nSch > nOra) {
        if (vechi.n && vechi.lipsaBaza) text += " Nu știu suma pusă: lipsește la " + cate(vechi.lipsaBaza, "bot", "boți") + ".";
        else if (vechi.n && vechi.nBaza) text += " Boții porniți în zilele cu frână: " + banFrana(vechi.baza) + " puși" + (vechi.nRez ? ", rezultat " + banFrana(vechi.rez) : "") + ".";
        else if (nOra === 0 && nSch) text += " Niciun bot n-a pornit într-o zi cu frână.";
        if (vechi.nRez && !(vechi.n && vechi.nBaza && !vechi.lipsaBaza)) text += " Rezultatul lor: " + banFrana(vechi.rez) + ".";
      }
      if (nOra) {
        text += " " + frazaPartea("Boții pe care i-ar fi oprit", dupa);
        text += " " + frazaPartea("Boții din aceleași zile, porniți mai devreme", inainte);
        if (nSch > nOra && vechi.n) text += " Zilele fără ora frânei sunt în suma de mai sus.";
      } else if (nSch) text += " Nu știu ora frânei în zilele astea.";
      text += nLin ? " " + frazaPartea("În zilele fără frână (" + cate(nLin, "zi", "zile") + ")", quiet) : nSch ? " Nicio zi salvată fără frână." : "";
    }
    if (nSch < 10 || (carte && nLin && nLin < 10)) text += " Prea puține zile ca să tragem o concluzie (trebuie cel puțin 10 de fiecare parte).";
    text += " Asta nu arată că frâna face bani.";
    return { aflat: true, text: text, zile: lista.length, complete: complete.length, schimbate: nSch, baza: carte && vechi.n && vechi.nBaza && !vechi.lipsaBaza ? vechi.baza : null, rezultat: carte && vechi.nRez ? vechi.rez : null, insuficient: nSch < 10, boti: vechi.n };
  }
  // socoteala alertelor: miscarile neobisnuite au continuat? (dupa 24 h si 3 zile) + dupa "MISCARE" cat s-a mai miscat BTC
  function socotealaAlerte(l) {
    l = Array.isArray(l) ? l : [];
    var mi = l.filter(function (x) { return x && x.fel !== "vreme" && nr(x.pret) > 0; }), ve = l.filter(function (x) { return x && x.fel === "vreme" && nr(x.pret) > 0; });
    var cont = function (x, k) { var r = x[k] / x.pret - 1; return x.dir === "sus" ? r > 0 : r < 0; };
    var c1 = mi.filter(function (x) { return nr(x.p1) > 0; }), c3 = mi.filter(function (x) { return nr(x.p3) > 0; }), v1 = ve.filter(function (x) { return nr(x.p1) > 0; });
    var o = { n: l.length, n1: c1.length, continua1: c1.filter(function (x) { return cont(x, "p1"); }).length, n3: c3.length, continua3: c3.filter(function (x) { return cont(x, "p3"); }).length };
    o.text = !l.length ? "Nicio alertă încă: se adună de acum." : !o.n1 ? cate(l.length, "alertă trimisă", "alerte trimise") + "; primele socoteli după 24 de ore." :
      "Din " + cate(o.n1, "mișcare neobișnuită", "mișcări neobișnuite") + ", " + o.continua1 + " din " + o.n1 + (o.continua1 === 1 ? " a continuat" : " au continuat") + " în aceeași direcție după 24 h" + (o.n3 ? " și " + o.continua3 + " din " + o.n3 + " după 3 zile" : "") + "." + (o.n1 < 20 ? " Puține cazuri încă." : "");
    var mv = v1.length ? v1.reduce(function (s, x) { return s + Math.abs(x.p1 / x.pret - 1); }, 0) / v1.length * 100 : null;
    o.textVreme = mv === null ? "" : "După alertele de vreme, BTC s-a mai mișcat în medie " + mv.toFixed(1).replace(".", ",") + "% în 24 h (" + cate(v1.length, "caz", "cazuri") + ").";
    return o;
  }

  return { textCorelatie: textCorelatie, SECTOR: SECTOR, sectoare: sectoare, ziuaTa: ziuaTa, raportSaptamana: raportSaptamana, socotealaAlerte: socotealaAlerte, miscareTipica: miscareTipica, fundingPiata: fundingPiata, fundingAtentie: fundingAtentie, schimbari: schimbari, vreme: vreme, miscari: miscari, fg: fg, fgValid: fgValid, largime: largime, ro: ro, rezumatActiune: rezumatActiune, largimeNdx: largimeNdx, vremeBursa: vremeBursa, corelatie: corelatie, calendar: calendar, MAG7: MAG7, franaVerb: franaVerb, frazaPauza: frazaPauza, masuraFranei: masuraFranei, unesteZileFrana: unesteZileFrana };
})();
if (typeof globalThis !== "undefined") globalThis.Acasa = Acasa;
