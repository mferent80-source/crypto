// Graficul nou al paginii Salt (v100.365; el, 19.11.2026: „Salt ca Jurnalul”, graficul „câte ar trece din noroc”): histograma lumilor fără avantaj
// (H0, din SaltDovezi) cu linia reală a zilei. Celelalte grafice ale paginii folosesc CnGrafice (bare cu interval, blocuri). SVG ca șir (fără DOM),
// culorile doar prin clase (jg*), ca în Carnet / Jurnal; tema (zi / noapte) le colorează.
var SaltGrafice = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, et, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(et) + '">' + corp + "</svg>"; }
  // lumi = câte instrumente trec poarta în fiecare lume fără avantaj; real = câte trec azi (linia); azi = câte trec în raportul de azi (punctat)
  function h0(lumi, real, o) {
    o = o || {}; var L = (Array.isArray(lumi) ? lumi : []).filter(function (v) { return isFinite(v); }); if (!L.length) return "";
    var W = Math.max(300, Math.round(o.lat || 600)), H = 170, X0 = 34, X1 = W - 10, Y0 = 10, Y1 = H - 24, c = "";
    var lo = Math.min.apply(null, L.concat([real, o.azi || real])), hi = Math.max.apply(null, L.concat([real, o.azi || real])), pas = Math.max(1, Math.ceil((hi - lo + 1) / 24));
    lo = Math.floor(lo / pas) * pas; var nb = Math.ceil((hi - lo + 1) / pas), cos = Array.from({ length: nb }, function () { return 0; });
    L.forEach(function (v) { cos[Math.min(nb - 1, Math.floor((v - lo) / pas))]++; });
    var mx = Math.max.apply(null, cos), bw = (X1 - X0) / nb, x = function (v) { return X0 + (v - lo) / (nb * pas) * (X1 - X0); }, y = function (n) { return Y1 - n / mx * (Y1 - Y0); };
    c += linie(X0, Y1, X1, Y1, "jgAx");
    cos.forEach(function (n, i) { if (!n) return; c += '<rect class="jgBara jgNeutru" x="' + f(X0 + i * bw + 1) + '" y="' + f(y(n)) + '" width="' + f(Math.max(1, bw - 2)) + '" height="' + f(Y1 - y(n)) + '" rx="1"><title>' + esc(n + " din " + L.length + " lumi fără avantaj: " + (lo + i * pas) + (pas > 1 ? "–" + (lo + i * pas + pas - 1) : "") + " trec") + "</title></rect>"; });
    var et = Math.max(1, Math.ceil(nb / Math.max(2, Math.floor((X1 - X0) / 44))));
    for (var i = 0; i < nb; i += et) c += txt(X0 + i * bw + bw / 2, H - 8, String(lo + i * pas), { anc: "middle" });
    var xr = x(real + pas / 2);
    c += linie(xr, Y0 - 2, xr, Y1, "jgLinie", ' stroke-width="2"') + txt(Math.min(X1 - 4, xr + 4), Y0 + 10, "azi " + real, { cls: "jgEt", anc: xr > X1 - 60 ? "end" : "start" });
    return svg(W, H, o.eticheta || "Câte instrumente ar trece poarta în lumi fără avantaj, față de azi", c);
  }
  return { h0: h0 };
})();
if (typeof globalThis !== "undefined") globalThis.SaltGrafice = SaltGrafice;
