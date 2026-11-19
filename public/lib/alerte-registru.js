// Registrul alertelor (v100.367; el, 19.11.2026: dreptatea „spun cinstit + registru”). Auditul: pe 26 de zile niciun fel de alertă cu o
// recomandare nu s-a dovedit că știe încotro merge prețul - nedovedit, nu „greșit”. De acum fiecare caz NOU (nu repetările) cu un preț de pornire
// se notează și se judecă după orizont, față de piață din aceeași fereastră:
//  - acțiuni (Consilierul „Ieși” / „Atenție”, intrarea sugerată, becul 1z, „sub stop”): la 1 / 5 / 10 ședințe, față de QQQ, în SENSUL alertei
//    (Ieși / Atenție / bec / sub stop așteaptă scădere ⇒ sens −1; intrarea așteaptă creștere ⇒ sens +1)
//  - boți: la 1 / 24 / 72 de ore, față de BTC, în direcția BOTULUI (long +1, short −1; neutrul nu se judecă pe sens)
// Verdictul abia după 60 de zile sau 30 de cazuri pe fel (pragul scris înainte); până atunci „se adună”. Modul pur: colectorul și pagina.
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
  // rezumatul pe fel, la orizontul de cap (boți 24 h, acțiuni 5 ședințe): x = în sensul alertei / al botului, față de piață; interval pe zile
  function rezumat(intrari, judecati, acum) {
    var fel = {}, deLa = null;
    (Array.isArray(intrari) ? intrari : []).forEach(function (e) {
      if (!deLa || e.t < deLa) deLa = e.t; var f = fel[e.fel] || (fel[e.fel] = { fel: e.fel, piata: e.piata, h: CAP[e.piata], n: 0, judecate: 0, zile: {}, x: [] });
      f.n++; var j = judecati && judecati[cheie(e)], v = j && j[CAP[e.piata]]; if (!v || v.x === null || v.x === undefined || !isFinite(v.x)) return;
      f.judecate++; var z = new Date(e.t).toISOString().slice(0, 10); (f.zile[z] = f.zile[z] || []).push(v.x);
    });
    var l = Object.keys(fel).map(function (k) {
      var f = fel[k], Z = Object.keys(f.zile), m = Z.map(function (z) { var a = f.zile[z]; return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }), n = m.length;
      var med = n ? m.reduce(function (s, v) { return s + v; }, 0) / n : null, sd = n > 1 ? Math.sqrt(m.reduce(function (s, v) { return s + Math.pow(v - med, 2); }, 0) / (n - 1)) : null;
      var tc = n - 1 >= 1 ? (n - 1 <= 20 ? T95[n - 1] : 1.98) : null, se = sd !== null ? sd / Math.sqrt(n) : null, gata = n >= PRAG.zile || f.judecate >= PRAG.cazuri;
      return { fel: f.fel, piata: f.piata, h: f.h, n: f.n, judecate: f.judecate, zile: n, medie: med, lo: se !== null ? med - tc * se : null, hi: se !== null ? med + tc * se : null,
        pePlus: n ? m.filter(function (v) { return v > 0; }).length / n : null, verdict: !gata ? "se-aduna" : se !== null && med - tc * se > 0 ? "peste" : se !== null && med + tc * se < 0 ? "sub" : "n-am-aflat" };
    }).sort(function (a, b) { return b.n - a.n; });
    return { la: acum || Date.now(), deLa: deLa, total: (intrari || []).length, prag: PRAG, feluri: l };
  }
  return { ORIZ: ORIZ, CAP: CAP, PRAG: PRAG, inregistreaza: inregistreaza, cheie: cheie, judeca: judeca, rezumat: rezumat };
})();
if (typeof globalThis !== "undefined") globalThis.AlReg = AlReg;
