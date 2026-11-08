// v100.313 (08.11.2026, el: „fă ideea cu curba în Radar”): cât de des un stop la d × ATR(14, 1h) de preț a fost ATINS în 24 h / 72 h.
// Modul pur (pagina + colectorul), probat în scripts/proba-v100313.mjs (paritate cu Python: export_curba_js.py, proba LSL 08.11).
// De ce așa (măsurat pe 21 de perechi, OOS de la 25.09, CURBA-STOP-VARIANTE-2026-11-08.md): curba FIXĂ greșea cu 10–25 de puncte pe 3–7 zile
// (direcția pieței o mută); curba RULANTĂ pe ultimele 30 de zile, cu jos și sus la un loc (direcția nu se știe), a ieșit cea mai bună:
// abaterea medie ~2 puncte pe 24 h, ~5 pe 72 h. Pe 7 zile ~10 ⇒ NU se arată.
var CurbaStop = (function () {
  "use strict";
  var ORA = 3600000, ZI = 86400000, VECHE = 36 * ORA;
  var D = []; for (var k = 1; k <= 60; k++) D.push(0.25 * k);   // 0,25 … 15 ATR
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }

  // ATR(14) ca ta.atr: TR[0] = h − l; prima valoare = media primelor 14 TR (la bara 13); apoi RMA. Întoarce șirul întreg.
  function atrSir(b) {
    var n = b.length, a = new Array(n), tr = new Array(n), s = 0, i;
    for (i = 0; i < n; i++) { a[i] = null; tr[i] = i === 0 ? b[0].h - b[0].l : Math.max(b[i].h - b[i].l, Math.abs(b[i].h - b[i - 1].c), Math.abs(b[i].l - b[i - 1].c)); }
    if (n < 14) return a;
    for (i = 0; i < 14; i++) s += tr[i];
    a[13] = s / 14;
    for (i = 14; i < n; i++) a[i] = (a[i - 1] * 13 + tr[i]) / 14;
    return a;
  }
  function atr14(bare) { var b = Array.isArray(bare) ? bare : [], a = atrSir(b); return b.length ? nr(a[b.length - 1]) : null; }

  // seturi = [[{t,o,h,l,c}…] pe pereche] (bare de 1 h, crescător). Pornirile i = 13, 13+pas, …; fereastra i+1 … i+H se ia doar dacă bara
  // i+H s-a încheiat înainte de `acum` și după `acum − zile`. Excursiile jos și sus (în ATR-ul de la pornire) intră în aceeași grămadă.
  function curba(seturi, acum, o) {
    o = o || {}; var zile = o.zile || 30, pas = o.pas || 4, out = { la: acum, zile: zile, perechi: 0, d: D.slice() }, gr = { 24: [], 72: [] };
    (Array.isArray(seturi) ? seturi : []).forEach(function (b) {
      if (!Array.isArray(b) || b.length < 14 + 24 + 1) return;
      out.perechi++;
      var a = atrSir(b), n = b.length;
      [24, 72].forEach(function (H) {
        for (var i = 13; i + H <= n - 1; i += pas) {
          var fin = b[i + H].t + ORA;
          if (!(fin <= acum && fin > acum - zile * ZI) || !(a[i] > 0)) continue;
          var mn = Infinity, mx = -Infinity;
          for (var j = i + 1; j <= i + H; j++) { if (b[j].l < mn) mn = b[j].l; if (b[j].h > mx) mx = b[j].h; }
          gr[H].push((b[i].c - mn) / a[i]); gr[H].push((mx - b[i].c) / a[i]);
        }
      });
    });
    [24, 72].forEach(function (H) {
      var g = gr[H]; out["n" + H] = g.length;
      out["p" + H] = D.map(function (d) { if (!g.length) return 0; var c = 0; for (var q = 0; q < g.length; q++) if (g[q] >= d) c++; return c / g.length; });
    });
    return out;
  }

  function valida(c) {
    if (!c || typeof c !== "object" || !(nr(c.la) > 0) || !Array.isArray(c.d) || !c.d.length || c.d.length > 200) return false;
    if (!(nr(c.n24) > 0) || !(nr(c.n72) > 0)) return false;   // revizia (08.11): o curbă fără excursii e toată zero ⇒ „< 1%” mincinos
    var ok = true;
    c.d.forEach(function (x, k) { if (!(nr(x) > 0) || (k && !(x > c.d[k - 1]))) ok = false; });
    [24, 72].forEach(function (H) {
      var p = c["p" + H];
      if (!Array.isArray(p) || p.length !== c.d.length) { ok = false; return; }
      p.forEach(function (x, k) { if (nr(x) === null || x < 0 || x > 1 || (k && x > p[k - 1] + 1e-12)) ok = false; });
    });
    return ok;
  }

  function sansa(c, H, d) {
    var p = c && c["p" + H], g = c && c.d; d = nr(d);
    if (!Array.isArray(p) || !Array.isArray(g) || !g.length || d === null) return null;
    if (d <= g[0]) return p[0];
    if (d >= g[g.length - 1]) return p[p.length - 1];
    for (var k = 0; k < g.length - 1; k++) if (d < g[k + 1]) return p[k] + (p[k + 1] - p[k]) * (d - g[k]) / (g[k + 1] - g[k]);
    return p[p.length - 1];
  }

  // distanța în ATR la care p24 coboară la `tinta` (prima trecere după `d0`, interpolată); null dacă nu coboară pe grilă
  function distantaPentru(c, tinta, d0) {
    var p = c.p24, g = c.d;
    for (var k = 0; k < g.length; k++) {
      if (g[k] <= d0 || p[k] > tinta) continue;
      if (k === 0 || p[k - 1] <= tinta) return g[k];
      return g[k - 1] + (tinta - p[k - 1]) * (g[k] - g[k - 1]) / (p[k] - p[k - 1]);
    }
    return null;
  }

  // stopul botului: long = sub preț, short = deasupra (stopul deja trecut ⇒ null); fără curbă / ATR / curbă mai veche de 36 h ⇒ null
  function pentruStop(o) {
    o = o || {}; var c = o.curba, atr = nr(o.atr), pret = nr(o.pret), stop = nr(o.stop), dir = String(o.dir || "").toLowerCase(), acum = nr(o.acum) || Date.now();
    if (!valida(c) || !(atr > 0) || !(pret > 0) || !(stop > 0) || acum - c.la > VECHE) return null;
    if (dir === "long" && !(stop < pret)) return null;
    if (dir === "short" && !(stop > pret)) return null;
    if (stop === pret) return null;
    var sus = stop > pret, d = Math.abs(pret - stop) / atr, p24 = sansa(c, 24, d), p72 = sansa(c, 72, d);
    var dm = p24 > 0.2 ? distantaPentru(c, 0.2, d) : null, mut = dm === null ? null : sus ? pret + dm * atr : pret - dm * atr;
    if (mut !== null && !(mut > 0)) { mut = null; dm = null; }   // revizia (08.11): la un ATR uriaș mutarea ar cădea sub zero
    return { d: d, p24: p24, p72: p72, dMut20: dm, mut20: mut, stop: stop, pret: pret, sus: sus, perechi: c.perechi, zile: c.zile, la: c.la };
  }

  return { D: D, atr14: atr14, curba: curba, valida: valida, sansa: sansa, pentruStop: pentruStop, VECHE: VECHE };
})();
