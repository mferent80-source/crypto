// Registrul alertelor (v100.367; el, 19.11.2026: dreptatea „spun cinstit + registru”). Auditul: pe 26 de zile niciun fel de alertă cu o
// recomandare nu s-a dovedit că știe încotro merge prețul - nedovedit, nu „greșit”. De acum fiecare caz NOU (nu repetările) cu un preț de pornire
// se notează și se judecă după orizont, față de piață din aceeași fereastră:
//  - acțiuni (Consilierul „Ieși” / „Atenție”, intrarea sugerată, becul 1z, „sub stop”): la 1 / 5 / 10 ședințe, față de QQQ, în SENSUL alertei
//    (Ieși / Atenție / bec / sub stop așteaptă scădere ⇒ sens −1; intrarea așteaptă creștere ⇒ sens +1)
//  - boți: la 1 / 24 / 72 de ore, față de BTC, în direcția BOTULUI (long +1, short −1; neutrul nu se judecă pe sens)
// Verdictul abia după 26 de ferestre care nu se suprapun pe fel, cu corecția pentru câte feluri, înghețat (v100.396, I-946; înainte: 60 de zile sau
// 30 de cazuri); până atunci „se adună”. Modul pur: colectorul și pagina.
var AlReg = (function () {
  "use strict";
  var H = 3600000, ZI = 24 * H, ORIZ = { crypto: [1, 24, 72], actiuni: [1, 5, 10] }, CAP = { crypto: 24, actiuni: 5 }, PRAG = { zile: 60, cazuri: 30 };
  var T95 = [null, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09];
  function felActiune(k, a) {
    if (/^consilier-/.test(k)) return /Ieși/.test(String(a.titlu || "")) ? ["consilier-iesi", -1] : /Atenție/.test(String(a.titlu || "")) ? ["consilier-atentie", -1] : null;
    if (/^sltp-intrare-/.test(k)) return ["intrare", 1];
    if (/^bec1z-/.test(k)) return ["bec1z", -1];
    if (/^astept-/.test(k)) return ["astept", -1];
    return null;
  }
  function inregistreaza(a, ctx) {
    if (!a || a.repetare || !(a.t > 0)) return null;
    var k = String(a.cheie || ""), fa = felActiune(k, a);
    if (fa) {
      var m = /^(?:consilier|bec1z|astept)-([A-Z0-9.]+_[A-Z]+_EQ)$/.exec(k), y = /^([A-Z0-9][A-Z0-9.\-]{0,14}):/.exec(String(a.titlu || ""));
      if (!m && !y) return null;
      return { t: a.t, fel: fa[0], sens: fa[1], piata: "actiuni", ticker: m ? m[1] : null, yahoo: m ? null : y[1], cheie: k };
    }
    if (a.bot && a.simbol && a.pret > 0 && k && k !== "grila") {
      var d = ctx && ctx.dir, fel = /^(s|p)-/.test(k) ? k.split("-").slice(0, 2).join("-") : k.split("-")[0];
      return { t: a.t, fel: fel, sens: d === 1 || d === -1 ? d : 0, piata: "crypto", simbol: a.simbol, pret0: a.pret, bot: String(a.bot), cheie: k };
    }
    return null;
  }
  function cheie(e) { return e.t + "|" + e.cheie + "|" + (e.bot || ""); }
  // bare = [{t, c}] crescător; reper = barele pieței (BTC orar / QQQ zilnic). Întoarce { "h": { r, rep, x } } pentru orizonturile ajunse
  function judeca(e, bare, reper) {
    var o = {}, l = Array.isArray(bare) ? bare : [], q = Array.isArray(reper) ? reper : [];
    var pana = function (s, t) { var k = -1; for (var i = 0; i < s.length; i++) { if (s[i].t <= t) k = i; else break; } return k; };
    var dupa = function (s, t) { for (var i = 0; i < s.length; i++) if (s[i].t >= t) return i; return -1; };
    if (e.piata === "crypto") {
      var p0 = e.pret0 > 0 ? e.pret0 : null, q0i = pana(q, e.t); if (!p0 || q0i < 0) return o;
      ORIZ.crypto.forEach(function (h) { var i = dupa(l, e.t + h * H), j = dupa(q, e.t + h * H); if (i < 0 || j < 0) return; var r = l[i].c / p0 - 1, rep = q[j].c / q[q0i].c - 1; o[h] = { r: r, rep: rep, x: e.sens ? e.sens * (r - rep) : null }; });
    } else {
      var i0 = pana(l, e.t); if (i0 < 0) return o; var j0 = pana(q, l[i0].t);
      ORIZ.actiuni.forEach(function (h) { if (i0 + h >= l.length) return; var t1 = l[i0 + h].t, j1 = pana(q, t1); if (j0 < 0 || j1 <= j0) return; var r = l[i0 + h].c / l[i0].c - 1, rep = q[j1].c / q[j0].c - 1; o[h] = { r: r, rep: rep, x: e.sens * (r - rep) }; });
    }
    return o;
  }
  // v100.396 (I-946, auditul 26.11 🔴): verdictul pe REGULA CASEI - (1) pe ferestre care NU se suprapun (boți: la 2 zile, orizontul 24 h; acțiuni: la cel
  // puțin 7 zile una de alta, orizontul 5 ședințe - zilele vecine își împărțeau 4/5 din fereastră), (2) abia la 26 de ferestre, (3) cu corecția pentru
  // câte feluri se judecă deodată (Bonferroni pe nivelul de 5%), (4) ÎNGHEȚAT: odată dat nu se mai reface (colectorul îl ține pe disc și îl dă înapoi
  // în `inghetate`). Înainte: 30 de cazuri ajungeau, verdictul se refăcea la fiecare tură (se putea răsturna), fără corecție.
  // revizia valului 4 (27.11, 🟠): boții la 2 zile calendaristice una de alta (nu 1) - cu orizontul de 24 h, un caz pe 1.11 la 23:00 și unul pe 2.11 la
  // 01:00 își împart 22 h ⇒ abaterea mediei ieșea subestimată (~15%) și verdictele false de ~1,7–1,9 ori mai dese decât 5% (simulat; la 2 zile: 4,4%).
  // Între ultima oră a zilei d și prima a zilei d + 2 sunt ≥ 24 h ⇒ ferestrele nu se mai suprapun. Scrisă înainte de orice verdict înghețat.
  var NV = 26, GAP_ZILE = { crypto: 2, actiuni: 7 };
  function zInv(p) {   // cuantila normalei standard (Acklam), p în (0, 1)
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  // v100.396 (I-961, el 27.11: „fa tot plus idei”): PUTEREA DINAINTE - efectul minim detectabil (80% putere, testul pe 2 părți la 5% / K) la ținta
  // de nT ferestre, cu abaterea ferestrelor de până acum; intervalul vine din nesiguranța abaterii (χ² pe n − 1, Wilson–Hilferty). Sub 5 ferestre
  // abaterea nu spune nimic ⇒ null. Efectul care ar conta pe bani, SCRIS ÎNAINTE (27.11): boții 0,5% pe 24 h față de BTC (de 5 ori comisionul unui
  // ordin Pionex, 0,1% dus-întors), acțiunile 1% pe 5 ședințe față de QQQ - sub ele o alertă n-ar schimba o hotărâre pe bani.
  var BANI = { crypto: 0.005, actiuni: 0.01 };
  function tq(z, gl) { return z * (1 + (z * z + 1) / (4 * gl)); }
  function chi2(p, k) { var a = 2 / (9 * k); return k * Math.pow(1 - a + zInv(p) * Math.sqrt(a), 3); }
  function mde(sd, n, nT, K) {
    if (!(sd > 0) || !(n >= 5)) return null; nT = nT || NV; K = K || 1;
    var f = (tq(-zInv(0.05 / (2 * K)), nT - 1) + tq(-zInv(0.2), nT - 1)) / Math.sqrt(nT), m = f * sd;
    return { mde: m, lo: m * Math.sqrt((n - 1) / chi2(0.975, n - 1)), hi: m * Math.sqrt((n - 1) / chi2(0.025, n - 1)), n: n, nT: nT };
  }
  // poate răspunde proba la nT? „da” (efectul de bani e peste cel detectabil, cu tot intervalul), „nu” (sub tot intervalul), „la-limita”
  function poateRaspunde(p, bani) { return !p || !(bani > 0) ? null : p.hi <= bani ? "da" : p.lo > bani ? "nu" : "la-limita"; }
  // zilele care nu se suprapun, de la cea mai veche: următoarea abia la ≥ gap zile de cea aleasă
  function independente(zile, gap) { var out = [], ultim = -Infinity; zile.slice().sort().forEach(function (z) { var t = Date.parse(z + "T00:00:00Z"); if (t - ultim >= gap * ZI) { out.push(z); ultim = t; } }); return out; }
  // rezumatul pe fel, la orizontul de cap (boți 24 h, acțiuni 5 ședințe): x = în sensul alertei / al botului, față de piață
  // inghetate = { fel: { verdict, la, ferestre, medie, lo, hi } } - verdictele deja date (rămân așa)
  function rezumat(intrari, judecati, acum, inghetate) {
    var fel = {}, deLa = null, ING = inghetate && typeof inghetate === "object" ? inghetate : {};
    (Array.isArray(intrari) ? intrari : []).forEach(function (e) {
      if (!deLa || e.t < deLa) deLa = e.t; var f = fel[e.fel] || (fel[e.fel] = { fel: e.fel, piata: e.piata, h: CAP[e.piata], n: 0, judecate: 0, zile: {}, x: [] });
      f.n++; var j = judecati && judecati[cheie(e)], v = j && j[CAP[e.piata]]; if (!v || v.x === null || v.x === undefined || !isFinite(v.x)) return;
      f.judecate++; var z = new Date(e.t).toISOString().slice(0, 10); (f.zile[z] = f.zile[z] || []).push(v.x);
    });
    /* revizia 27.11 (🔴): K = TOATE felurile din registru (familia de ipoteze), nu doar cele ajunse la 26 în aceeași tură - felurile se maturizează
       pe rând, deci așa fiecare primea K = 1 (12 feluri nule ⇒ 45,8% cel puțin un verdict fals). Familia crește doar când apare un fel nou. */
    var K = Math.max(1, Object.keys(fel).length, Object.keys(ING).length);
    var l = Object.keys(fel).map(function (k) {
      var f = fel[k], ZI_ = independente(Object.keys(f.zile), GAP_ZILE[f.piata] || 1), m = ZI_.map(function (z) { var a = f.zile[z]; return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }), n = m.length;
      var med = n ? m.reduce(function (s, v) { return s + v; }, 0) / n : null, sd = n > 1 ? Math.sqrt(m.reduce(function (s, v) { return s + Math.pow(v - med, 2); }, 0) / (n - 1)) : null;
      /* revizia 27.11: pe n ferestre, cuantila Student (n − 1 grade), nu normala: z · (1 + (z² + 1) / (4 · gl)) - la K = 1, n = 26 dă 2,06 = t(25) */
      var zb = -zInv(0.05 / (2 * K)), tc = n >= NV ? zb * (1 + (zb * zb + 1) / (4 * (n - 1))) : n - 1 >= 1 ? (n - 1 <= 20 ? T95[n - 1] : 1.98) : null, se = sd !== null ? sd / Math.sqrt(n) : null;
      var o = { fel: f.fel, piata: f.piata, h: f.h, n: f.n, judecate: f.judecate, zile: Object.keys(f.zile).length, ferestre: n, nVerdict: NV, corectie: K, medie: med, lo: se !== null ? med - tc * se : null, hi: se !== null ? med + tc * se : null,
        pePlus: n ? m.filter(function (v) { return v > 0; }).length / n : null, verdict: n < NV ? "se-aduna" : se !== null && med - tc * se > 0 ? "peste" : se !== null && med + tc * se < 0 ? "sub" : "n-am-aflat", inghetat: false };
      /* v100.396 (I-961): cât poate vedea proba la 26 de ferestre, cu abaterea de acum - doar cât se adună */
      if (n < NV) { o.putere = mde(sd, n, NV, K); o.bani = BANI[f.piata] || null; o.poate = poateRaspunde(o.putere, o.bani); }
      if (ING[k] && ING[k].verdict) {
        o.verdict = ING[k].verdict; o.inghetat = true; o.inghetatLa = ING[k].la || null; o.verdictFerestre = ING[k].ferestre || null;
        /* revizia 27.11 (🟠7): lângă verdictul înghețat stau cifrele LUI (media și intervalul din clipa înghețării); cele de acum merg în medieAcum */
        o.medieAcum = o.medie; if (ING[k].medie !== undefined && ING[k].medie !== null) { o.medie = ING[k].medie; o.lo = ING[k].lo; o.hi = ING[k].hi; }
      }
      return o;
    }).sort(function (a, b) { return b.n - a.n; });
    return { la: acum || Date.now(), deLa: deLa, total: (intrari || []).length, prag: PRAG, feluri: l };
  }
  // ce verdicte noi trebuie înghețate acum (colectorul le scrie pe disc o singură dată)
  function deInghetat(rez, inghetate) { var ING = inghetate || {}, o = {}; ((rez && rez.feluri) || []).forEach(function (f) { if (!ING[f.fel] && f.verdict !== "se-aduna" && !f.inghetat) o[f.fel] = { verdict: f.verdict, la: rez.la, ferestre: f.ferestre, medie: f.medie, lo: f.lo, hi: f.hi, corectie: f.corectie }; }); return o; }
  return { ORIZ: ORIZ, CAP: CAP, PRAG: PRAG, NV: NV, GAP_ZILE: GAP_ZILE, inregistreaza: inregistreaza, cheie: cheie, judeca: judeca, rezumat: rezumat, deInghetat: deInghetat, independente: independente, zInv: zInv, mde: mde, poateRaspunde: poateRaspunde, BANI: BANI };
})();
if (typeof globalThis !== "undefined") globalThis.AlReg = AlReg;
