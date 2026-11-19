// Graficele noi ale paginii Alerte (v100.367; el, 19.11.2026: Alerte „ca Jurnalul”): alertele pe zi (coloane suprapuse: cazuri noi cu decizie, repetări,
// informări) și drumul prețului după alertă (linii: acțiunea, piața, cipurile; linia promisă). „Dreptatea pe fel” folosește CnGrafice.bare.
// SVG ca șir (fără DOM), culorile doar prin clase (jg*); tema (zi / noapte) le colorează.
var AlGrafice = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, et, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(et) + '">' + corp + "</svg>"; }
  function p1(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",") + " %"; }
  // zile = [[zi, toate, peDiscord, critice, decizie, repetari, informare]]
  function coloane(zile, o) {
    o = o || {}; var Z = Array.isArray(zile) ? zile : []; if (!Z.length) return "";
    var W = Math.max(300, Math.round(o.lat || 600)), H = 190, X0 = 38, X1 = W - 8, Y0 = 10, Y1 = H - 24, c = "", mx = Math.max.apply(null, Z.map(function (z) { return z[4] + z[5] + z[6]; })) * 1.08 || 1;
    var y = function (v) { return Y1 - v / mx * (Y1 - Y0); }, bw = (X1 - X0) / Z.length;
    [0, Math.round(mx / 2), Math.round(mx)].forEach(function (v) { c += linie(X0, y(v), X1, y(v), v ? "jgGrid" : "jgAx") + txt(X0 - 4, y(v) + 4, String(v), { anc: "end" }); });
    Z.forEach(function (z, i) {
      var x = X0 + i * bw + 1, w = Math.max(2, bw - 2), b = Y1;
      [[z[4], "jgAtent", "cazuri noi cu decizie"], [z[5], "jgNeutru", "repetări sub 24 h"], [z[6], "jgPunct", "informări"]].forEach(function (p) {
        var h = p[0] / mx * (Y1 - Y0); if (h <= 0) return; b -= h;
        c += '<rect class="jgBara ' + p[1] + '" x="' + f(x) + '" y="' + f(b) + '" width="' + f(w) + '" height="' + f(h) + '"><title>' + esc(z[0].slice(8, 10) + "." + z[0].slice(5, 7) + ": " + p[0] + " " + p[2] + " (din " + z[1] + ", " + z[2] + " pe Discord, " + z[3] + " critice)") + "</title></rect>";
      });
      if (i % Math.max(1, Math.ceil(Z.length * 40 / (X1 - X0))) === 0) c += txt(x + w / 2, H - 6, z[0].slice(8, 10) + "." + z[0].slice(5, 7), { anc: "middle" });
    });
    return svg(W, H, o.eticheta || "Alertele pe zi", c);
  }
  // serii = [{ et, cls, v: [..] }] pe aceleași puncte x (ședințele 0..N); o.promis = o valoare orizontală (punctată)
  function linii(serii, o) {
    o = o || {}; var S = (Array.isArray(serii) ? serii : []).filter(function (s) { return s && Array.isArray(s.v) && s.v.length; }); if (!S.length) return "";
    var W = Math.max(300, Math.round(o.lat || 600)), H = 200, X0 = 44, X1 = W - 132, Y0 = 10, Y1 = H - 24, c = "", n = S[0].v.length, vals = [];
    S.forEach(function (s) { vals = vals.concat(s.v); }); if (o.promis != null) vals.push(o.promis); vals.push(0);
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals); if (!(mx > mn)) mx = mn + 1; var pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
    var x = function (i) { return X0 + i / Math.max(1, n - 1) * (X1 - X0); }, y = function (v) { return Y0 + (mx - v) / (mx - mn) * (Y1 - Y0); };
    [mn, 0, mx].forEach(function (v) { c += linie(X0, y(v), X1, y(v), Math.abs(v) < 1e-9 ? "jgAx" : "jgGrid") + txt(X0 - 4, y(v) + 4, p1(v).replace(" %", "%"), { anc: "end" }); });
    for (var i = 0; i < n; i++) c += txt(x(i), H - 6, String(i), { anc: "middle" });
    if (o.promis != null) c += linie(X0, y(o.promis), X1, y(o.promis), "jgIc", ' stroke-dasharray="5 4"') + txt(X1 + 4, y(o.promis) + 4, "promis " + p1(o.promis), { cls: "jgEt" });
    // etichetele de la capătul liniilor: împinse ca să stea la cel puțin 13 px una de alta (altfel „cipurile” călca peste „acțiunea”)
    var et = S.map(function (s) { return { s: s, y: y(s.v[n - 1]) + 4 }; }).sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < et.length; k++) if (et[k].y - et[k - 1].y < 13) et[k].y = et[k - 1].y + 13;
    S.forEach(function (s) {
      var d = s.v.map(function (v, k) { return (k ? "L" : "M") + f(x(k)) + " " + f(y(v)); }).join(" ");
      c += '<path class="' + (s.cls || "jgLinie") + '" d="' + d + '" fill="none"><title>' + esc(s.et + ": " + s.v.map(function (v, k) { return k + ": " + p1(v); }).join(", ")) + "</title></path>";
    });
    et.forEach(function (e) { c += txt(X1 + 4, e.y, e.s.et + " " + p1(e.s.v[n - 1]), { cls: "jgEt" }); });
    return svg(W, H, o.eticheta || "Drumul prețului după alertă", c);
  }
  return { coloane: coloane, linii: linii };
})();
if (typeof globalThis !== "undefined") globalThis.AlGrafice = AlGrafice;
