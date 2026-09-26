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

  return { vreme: vreme, miscari: miscari, fg: fg, largime: largime, ro: ro };
})();
if (typeof globalThis !== "undefined") globalThis.Acasa = Acasa;
