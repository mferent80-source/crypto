// Pagina Home "Piata azi" (v92, demo aprobat 26.09: claude.ai/artifact/CobyvP3cKMKpuegBsQHFJt).
// Pur (probat in scripts/acasa-v92.mjs): din clasamentul top 100 PERP, BTC, frica/lacomia, largimea pietei si
// tickerele Pionex face "vremea pietei" si textele de langa cifre. Descrie piata; singurul semnal DOVEDIT
// pentru grid e miscarea (clasamentul "de evitat"), restul descrie, nu prezice.
var Acasa = (function () {
  "use strict";
  function nr(x) { var v = typeof x === "string" && x.trim() ? Number(x) : x; return typeof v === "number" && isFinite(v) ? v : null; }

  // o = { clasament: {evita, candidati, faraDate, dir: {long, neutru, short}}, btc: {miscare}, fg: numar }
  function vreme(o) {
    o = o || {};
    var c = o.clasament, ev = c ? nr(c.evita) : null, ca = c ? nr(c.candidati) : null;
    if (ev === null || ca === null || ev + ca <= 0) return { nivel: "fara-date", eticheta: "FĂRĂ DATE", titlu: "Clasamentul pieței n-a venit încă.", text: "Îl face colectorul de acasă o dată pe oră, pe primele 100 de monede după volum.", faCe: "" };
    var n = ev + ca, cota = ev / n, btcMis = !!(o.btc && o.btc.miscare), fg = nr(o.fg);
    var d = c.dir || {}, lo = nr(d.long) || 0, sh = nr(d.short) || 0, tot = lo + sh + (nr(d.neutru) || 0);
    var sens = tot > 0 && lo / tot >= 0.6 ? "urca" : tot > 0 && sh / tot >= 0.6 ? "coboara" : "imp";
    var sensTxt = sens === "urca" ? "Piața urcă în general" : sens === "coboara" ? "Piața coboară în general" : "Piața e împărțită";
    var fgTxt = fg === null ? "" : fg >= 70 ? ", cu lăcomie mare" : fg <= 30 ? ", cu frică mare" : "";
    var text = sensTxt + fgTxt + ". " + ev + " din cele " + n + " de monede mari sunt în mișcare, regimul în care gridul iese cel mai rău.";
    var r;
    if (btcMis || cota >= 0.5) r = { nivel: "miscare", eticheta: "🔴 MIȘCARE", titlu: btcMis ? "BTC a intrat în mișcare: toată piața e agitată." : "Jumătate din piață e în mișcare.",
      faCe: "N-aș porni boți grid noi până nu se liniștește; pe cei porniți îi urmăresc, alerta de mișcare îmi spune dacă e cazul." };
    else if (cota >= 0.25) r = { nivel: "amestecat", eticheta: "🟡 AMESTECAT", titlu: "BTC e liniștit, dar monedele mici sunt agitate.",
      faCe: "Boți grid doar pe monedele liniștite, nu pe cele din lista de mișcare." };
    else r = { nivel: "liniste", eticheta: "🟢 LINIȘTE", titlu: "Piața e liniștită: mediul bun pentru grid.",
      faCe: "E un moment bun pentru boți grid pe monedele din lista de mai jos." };
    if (fg !== null && fg >= 70 && sens === "urca") r.faCe += " N-aș mări pariurile pe urcare acum: lăcomia e la " + Math.round(fg) + " și " + lo + " din " + tot + " de monede urcă deja.";
    else if (fg !== null && fg <= 30 && sens === "coboara") r.faCe += " N-aș vinde în panică: frica e la " + Math.round(fg) + ", iar de acolo piața a revenit des.";
    r.text = text; r.inMiscare = ev; r.total = n;
    return r;
  }

  // tickerele Pionex (open = acum 24 h) -> cine se misca azi, printre primele `top` PERP dupa volum
  function miscari(tickers, o) {
    o = o || {};
    var mis = {}; (o.inMiscare || []).forEach(function (s) { mis[String(s).replace(/_USDT_PERP$/, "")] = true; });
    var l = (Array.isArray(tickers) ? tickers : []).filter(function (x) { return x && /_USDT_PERP$/.test(String(x.symbol)); })
      .map(function (x) { var op = nr(x.open), cl = nr(x.close), v = nr(x.amount), s = String(x.symbol).replace(/_USDT_PERP$/, ""); return { s: s, v: v, p: cl, ch: op > 0 && cl > 0 ? (cl / op - 1) * 100 : null, miscare: !!mis[s] }; })
      .filter(function (x) { return x.v > 0 && x.ch !== null; }).sort(function (a, b) { return b.v - a.v; }).slice(0, o.top || 60);
    var s = l.slice().sort(function (a, b) { return b.ch - a.ch; });
    return { n: l.length, urca: l.filter(function (x) { return x.ch > 0; }).length, sus: s.filter(function (x) { return x.ch > 0; }).slice(0, 5), jos: s.filter(function (x) { return x.ch < 0; }).reverse().slice(0, 5),
      gasit: function (sim) { for (var i = 0; i < l.length; i++) if (l[i].s === sim) return l[i]; return null; } };
  }

  // frica/lacomia: istoricul (cel mai vechi -> azi)
  function fg(ist) {
    var l = (Array.isArray(ist) ? ist : []).map(nr).filter(function (v) { return v !== null; });
    if (!l.length) return { acum: null, min: null, max: null, text: "" };
    var a = l[l.length - 1], mi = Math.min.apply(null, l), ma = Math.max.apply(null, l), poz = ma > mi ? (a - mi) / (ma - mi) : 0.5;
    var unde = poz >= 0.75 ? "aproape de vârf" : poz <= 0.25 ? "aproape de minim" : "la mijloc";
    var t = "În ultimele " + l.length + " de zile între " + Math.round(mi) + " și " + Math.round(ma) + "; acum " + unde + ".";
    if (a >= 70) t += " Peste 75 e lăcomie extremă: urcările țin mai greu de acolo.";
    else if (a <= 30) t += " Sub 25 e frică extremă: de acolo piața a revenit des.";
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
  function rsi(c, n) { n = n || 14; var g = 0, l = 0; for (var i = c.length - n; i < c.length; i++) { var d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; } return l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  // bare zilnice {t,c} (cu ultima zi inchisa) -> rezumatul unei actiuni; colectorul il face in tura de idei
  function rezumatActiune(b) {
    var c = (Array.isArray(b) ? b : []).map(function (x) { return nr(x && x.c); }).filter(function (v) { return v !== null && v > 0; });
    if (c.length < 210) return null;
    var u = c[c.length - 1], m = [];
    for (var i = c.length - 120; i < c.length - 1; i++) m.push(Math.abs(c[i] / c[i - 1] - 1));
    m.sort(function (x, y) { return x - y; });
    var p75 = m[Math.floor(m.length * 0.75)] || 0, ch = (u / c[c.length - 2] - 1) * 100;
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    return { p: u, ch: r2(ch), ch5: r2((u / c[c.length - 6] - 1) * 100), e50: u > ema(c.slice(-200), 50), e200: u > ema(c, 200), rsi: Math.round(rsi(c) * 10) / 10, mis: p75 > 0 ? r2(Math.abs(ch / 100) / p75) : null };
  }
  var MAG7 = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA"];
  function largimeNdx(l) {
    l = (Array.isArray(l) ? l : []).filter(function (x) { return x && x.s && nr(x.ch) !== null; });
    if (!l.length) return null;
    var cnt = function (f) { return l.filter(f).length; };
    var s = l.slice().sort(function (a, b) { return b.ch - a.ch; }), tag = function (x) { return { s: x.s, ch: x.ch, miscare: nr(x.mis) !== null && x.mis > 1.5 }; };
    var mag = MAG7.map(function (k) { for (var i = 0; i < l.length; i++) if (l[i].s === k) return { s: k, ch: l[i].ch, e50: !!l[i].e50 }; return null; }).filter(Boolean);
    var mu = mag.filter(function (x) { return x.ch > 0; }).length;
    return { n: l.length, urca: cnt(function (x) { return x.ch > 0; }), e50: cnt(function (x) { return x.e50; }), e200: cnt(function (x) { return x.e200; }), rsi: cnt(function (x) { return nr(x.rsi) !== null && x.rsi > 50; }),
      inMiscare: l.filter(function (x) { return nr(x.mis) !== null && x.mis > 1.5; }).map(function (x) { return x.s; }),
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
    var partNd = nd && nd.n ? " Doar " + nd.e50 + " din " + nd.n + " acțiuni sunt peste media de 50 de zile." : "";
    if (vix !== null && vix >= 30) return { nivel: "frica", eticheta: "🔴 FRICĂ PE BURSĂ", titlu: "VIX e la " + vix.toFixed(1).replace(".", ",") + ": bursa e în panică.", text: "Peste 30, mișcările sunt mari în ambele sensuri.", faCe: "N-aș cumpăra acum; aștept ca VIX să coboare sub 25." };
    if (sens === "jos") return { nivel: "scade", eticheta: "🔴 BURSA SCADE", titlu: "Nasdaq e în trend de coborâre.", text: "Prețul e sub mediile de 50 și 200 de zile" + (vx ? ", " + vx : "") + "." + (partNd ? partNd.replace("Doar ", "") : ""), faCe: "N-aș cumpăra contra trendului; țin doar ce are stopul pus." };
    if (sens === "lateral") return { nivel: "lateral", eticheta: "🟡 LATERAL", titlu: "Nasdaq n-are o direcție clară.", text: (vx ? vx + ". " : "") + partNd.trim(), faCe: "Cumpăr doar ce e deja pe trend, cu stop; restul aștept." };
    if (cota !== null && cota < 0.6) return { nivel: "ingusta", eticheta: "🟡 URCARE ÎNGUSTĂ", titlu: "Indicele urcă" + (vix !== null && vix < 20 ? " liniștit" : "") + ", dar doar o parte din acțiuni îl urmează.", text: "Nasdaq 100 în trend de urcare" + (vx ? ", " + vx : "") + ". Doar " + nd.e50 + " din " + nd.n + " acțiuni sunt peste media de 50 de zile.", faCe: "Cumpăr doar ce e deja pe trend, cum sunt ideile de azi. N-aș încerca să prind acțiunile de sub media de 200." };
    return { nivel: "larga", eticheta: "🟢 URCARE LARGĂ", titlu: "Bursa urcă, și o urmează majoritatea acțiunilor.", text: "Nasdaq 100 în trend de urcare" + (vx ? ", " + vx : "") + "." + (nd && nd.n ? " " + nd.e50 + " din " + nd.n + " acțiuni sunt peste media de 50 de zile." : ""), faCe: "Mediu bun pentru ideile pe trend; stopul rămâne obligatoriu." };
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
    var r = sx > 0 && sy > 0 ? sxy / Math.sqrt(sx * sy) : 0, rt = r.toFixed(2).replace(".", ",");
    var text = r >= 0.5 ? "BTC urmează bursa acum (" + rt + "): o scădere a Nasdaq trage și crypto." : r <= -0.3 ? "BTC merge invers față de bursă acum (" + rt + ")." : "BTC merge pe drumul lui acum (" + rt + "): bursa nu-l trage după ea.";
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
      : mari ? mari + (mari === 1 ? " eveniment mare" : " evenimente mari") + " în SUA de aici până la sfârșitul săptămânii: în ziua lor piețele se mișcă mai tare, n-aș porni boți noi chiar înainte." : "Doar evenimente de impact mediu în SUA săptămâna asta.";
    u.forEach(function (x) { var d = new Date(x.t); x.cand = ZILE[d.getDay()] + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); });
    return { urmatoare: u, text: text };
  }

  return { vreme: vreme, miscari: miscari, fg: fg, largime: largime, ro: ro, rezumatActiune: rezumatActiune, largimeNdx: largimeNdx, vremeBursa: vremeBursa, corelatie: corelatie, calendar: calendar, MAG7: MAG7 };
})();
if (typeof globalThis !== "undefined") globalThis.Acasa = Acasa;
