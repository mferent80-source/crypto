// Dovezile Scannerului (v100.363; el, 18.11.2026: „Scanner ca Jurnalul”, graficele alese: scorul - randament față de mișcare, rețetele față de aceeași zi,
// candidații de grid, graficul mic pe rând). Cifrele sunt MĂSURATE o dată (auditul statistic din 18.11.2026: codul paginii pe bare zilnice, fără
// privit în viitor; P = cele 98 de monede Pionex de azi, 440 de zile; B = Binance cu tot cu monedele scoase de pe bursă, primele 100 după volum în
// fiecare zi, 935 de zile; excesul = față de media ACELEIAȘI zile; intervalul pe zile) și nu se recalculează în pagină. Graficele = SVG ca șir,
// culorile doar prin clase (jg*); tema le colorează. Universul P e cel al monedelor care au rezistat - de aceea arată mai bine decât B.
var ScDovezi = (function () {
  var D = {"la":"18.11.2026","universuri":{"P":{"zile":440,"monede":98},"B":{"zile":935,"monede":100}},"scor7":{"B":[[1,-0.5,-1.1,0.2,652],[2,-0.1,-0.5,0.3,777],[3,0.3,0,0.7,775],[4,0.3,0,0.8,816],[5,0.2,-0.1,0.5,830],[6,0.5,0.1,0.8,842],[7,0.1,-0.2,0.4,889],[8,0,-0.4,0.3,905],[9,0,-0.5,0.5,917],[10,-0.8,-1.7,0,925]],"P":[[1,-0.1,-1.2,0.9,310],[2,-0.2,-1.5,1.5,377],[3,-1,-1.8,-0.2,385],[4,-0.9,-1.5,-0.1,398],[5,-0.9,-1.6,-0.3,406],[6,-0.7,-1.4,0,412],[7,0.5,-0.2,1.5,416],[8,-0.4,-0.9,0.2,423],[9,1.6,0.4,2.8,426],[10,2.3,0.3,4.2,433]]},"scorR3":{"B":[[1,-0.1,-0.7,0.4,656],[2,-1.2,-1.6,-0.9,780],[3,-1.8,-2.2,-1.3,780],[4,-1.9,-2.3,-1.5,820],[5,-1.6,-2,-1.2,833],[6,-1.1,-1.4,-0.8,845],[7,-0.8,-1.1,-0.5,894],[8,0,-0.3,0.3,910],[9,1.3,0.9,1.9,921],[10,5.6,4.5,6.7,929]],"P":[[1,0.6,-0.2,1.5,313],[2,-2.4,-3.2,-1.6,381],[3,-3.2,-3.7,-2.6,389],[4,-3.3,-3.9,-2.6,402],[5,-3,-3.5,-2.3,410],[6,-2.1,-2.6,-1.7,416],[7,-0.5,-1.3,0.2,420],[8,-0.7,-1.3,0.1,427],[9,3.8,2.5,5.1,430],[10,8.6,7.2,9.9,437]]},"retete":{"B":{"trend|7":[-0.5,-1.7,0.9,750,3068],"trend|30":[-2,-3.9,0.3,731,3068],"revenire|7":[-0.9,-2.3,0.3,272,846],"revenire|30":[1.1,-5.1,6.9,256,846],"spargere|7":[-1.3,-2.6,0.4,571,2255],"spargere|30":[-2.1,-5,0,564,2255],"miscare|7":[-1.7,-2.6,-0.9,867,7408],"miscare|30":[-4.4,-6.5,-2.8,848,7408]},"P":{"trend|7":[0.3,-1.9,2.6,362,1308],"trend|30":[5.8,-0.6,14.4,341,1308],"revenire|7":[-0.3,-2,1,142,596],"revenire|30":[-5.5,-6.3,-2.3,130,596],"spargere|7":[1.6,-1.6,3.9,298,1023],"spargere|30":[1.9,-3.3,2.9,284,1023],"miscare|7":[1.1,-0.9,2.9,405,3079],"miscare|30":[5,-0.8,9.3,383,3079]}},"grid":{"B":{"miscare":[-7.8,-8.8,-6.9],"rest":[-1.1,-1.3,-0.8],"nivel":13.3},"P":{"miscare":[-9,-10.9,-7.3],"rest":[-1.1,-1.5,-0.8],"nivel":12.2}}};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function pp(v) { if (v == null || !isFinite(v)) return "—"; if (Math.abs(v) < 0.05) v = 0; return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",") + " pp"; }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, et, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(et) + '">' + corp + "</svg>"; }
  // (1) scorul pe zecimi: bara = universul cinstit (B), punctul gol = monedele de azi (P), mustățile = intervalul pe zile (B)
  function decile(B, P, o) {
    o = o || {}; var W = Math.max(280, Math.round(o.lat || 520)), H = 200, X0 = 44, X1 = W - 8, Y0 = 10, Y1 = H - 24, c = "";
    var v = []; B.concat(P).forEach(function (r) { v.push(r[1], r[2], r[3]); }); var mx = Math.max(1, Math.max.apply(null, v.map(Math.abs))) * 1.1, mn = Math.min(0, Math.min.apply(null, v)) * 1.1;
    if (mn > -1) mn = -1; var y = function (q) { return Y0 + (mx - q) / (mx - mn) * (Y1 - Y0); }, bw = (X1 - X0) / 10;
    [mn, 0, mx].concat(mx > 4 ? [Math.round(mx / 2)] : []).forEach(function (q) { c += linie(X0, y(q), X1, y(q), q === 0 ? "jgAx" : "jgGrid") + txt(X0 - 4, y(q) + 4, pp(q).replace(" pp", ""), { anc: "end" }); });
    B.forEach(function (r, i) { var x = X0 + i * bw + 3, top = Math.min(y(r[1]), y(0)), h = Math.max(1, Math.abs(y(r[1]) - y(0)));
      c += '<rect class="jgBara ' + (o.neutru ? "jgNeutru" : r[1] >= 0 ? "jgPoz" : "jgNeg") + '" x="' + f(x) + '" y="' + f(top) + '" width="' + f(bw - 6) + '" height="' + f(h) + '" rx="2"><title>' + esc("zecimea " + r[0] + " (toate monedele, cu cele scoase): " + pp(r[1]) + " (" + pp(r[2]) + " … " + pp(r[3]) + "), " + r[4] + " de zile") + "</title></rect>"
        + linie(x + (bw - 6) / 2, y(r[2]), x + (bw - 6) / 2, y(r[3]), "jgIc") + txt(x + (bw - 6) / 2, H - 8, String(r[0]), { anc: "middle" }); });
    P.forEach(function (r, i) { var x = X0 + i * bw + bw / 2; c += '<circle class="jgNou" cx="' + f(x) + '" cy="' + f(y(r[1])) + '" r="4"><title>' + esc("zecimea " + r[0] + " (monedele de azi): " + pp(r[1])) + "</title></circle>"; });
    return svg(W, H, o.eticheta || "Scorul pe zecimi", c);
  }
  // (2)(3) bare orizontale cu interval: rânduri [{et, b: [ex, lo, hi], p: [ex, lo, hi]}] - bara = B, punctul gol = P
  function bare(R, o) {
    o = o || {}; var W = Math.max(280, Math.round(o.lat || 520)), LBL = Math.min(Math.round(W * 0.5), Math.round(Math.max.apply(null, R.map(function (q) { return String(q.et).length; })) * 6.3 + 8)), X0 = LBL + 8, X1 = W - 70, RH = 24, H = 10 + R.length * RH + 14, c = "";
    var v = []; R.forEach(function (r) { [r.b, r.p].forEach(function (q) { if (q) v.push(q[0], q[1], q[2]); }); });
    var mn = Math.min(0, Math.min.apply(null, v)) * 1.08, mx = Math.max(0, Math.max.apply(null, v)) * 1.08; if (!(mx > mn)) mx = mn + 1;
    var x = function (q) { return X0 + (q - mn) / (mx - mn) * (X1 - X0); };
    c += linie(x(0), 6, x(0), 10 + R.length * RH, "jgAx");
    R.forEach(function (r, i) {
      var yy = 10 + i * RH; c += txt(LBL, yy + 14, r.et, { anc: "end", cls: "jgEt" });
      if (r.b) { var a = Math.min(x(r.b[0]), x(0)), w = Math.max(1, Math.abs(x(r.b[0]) - x(0)));
        c += '<rect class="jgBara ' + (o.neutru ? "jgNeutru" : r.b[0] >= 0 ? "jgPoz" : "jgNeg") + '" x="' + f(a) + '" y="' + f(yy + 3) + '" width="' + f(w) + '" height="16" rx="2"><title>' + esc(r.et + " · toate monedele (cu cele scoase): " + pp(r.b[0]) + " (" + pp(r.b[1]) + " … " + pp(r.b[2]) + ")") + "</title></rect>"
          + linie(x(r.b[1]), yy + 11, x(r.b[2]), yy + 11, "jgIc"); }
      if (r.p) c += '<circle class="jgNou" cx="' + f(x(r.p[0])) + '" cy="' + f(yy + 11) + '" r="4"><title>' + esc(r.et + " · monedele de azi: " + pp(r.p[0]) + " (" + pp(r.p[1]) + " … " + pp(r.p[2]) + ")") + "</title></circle>";
      c += txt(W - 4, yy + 15, r.b ? pp(r.b[0]) : "", { anc: "end" });
    });
    return svg(W, H, o.eticheta || "Bare cu interval", c);
  }
  function retete(o) {
    var ing = (o && o.lat || 520) < 480, N = { trend: ing ? "Trend" : "Trend confirmat", revenire: "Revenire", spargere: "Spargere", miscare: ing ? "Mișcare neob." : "Mișcare neobișnuită" }, R = [];
    Object.keys(N).forEach(function (k) { [7, 30].forEach(function (z) { var b = D.retete.B[k + "|" + z], p = D.retete.P[k + "|" + z]; if (b || p) R.push({ et: N[k] + " · " + z + (ing ? " z" : " zile"), b: b, p: p }); }); });
    return bare(R, Object.assign({ eticheta: "Rețetele față de aceeași zi" }, o));
  }
  function grid(o) {
    var R = [{ et: (o && o.lat || 520) < 480 ? "față de cele în mișcare" : "față de monedele în mișcare", b: D.grid.B.miscare, p: D.grid.P.miscare }, { et: "față de restul", b: D.grid.B.rest, p: D.grid.P.rest }];
    return bare(R, Object.assign({ eticheta: "Candidații de grid: plaja pe 3 zile", neutru: true }, o));
  }
  // (4) graficul mic pe rând: ultimele 30 de închideri (x.spark), linia urcă / coboară față de prima
  function spark(v, o) {
    v = (Array.isArray(v) ? v : []).filter(function (q) { return q > 0; }); if (v.length < 2) return "";
    o = o || {}; var W = o.w || 72, H = o.h || 20, mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), sp = (mx - mn) || mx * 0.01;
    var pts = v.map(function (q, i) { return f(1 + i * (W - 2) / (v.length - 1)) + "," + f(H - 2 - (q - mn) / sp * (H - 4)); }).join(" ");
    return '<svg class="scSpark" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline class="' + (v[v.length - 1] >= v[0] ? "jgSparkSus" : "jgSparkJos") + '" points="' + pts + '"></polyline></svg>';
  }
  return { D: D, decile: decile, bare: bare, retete: retete, grid: grid, spark: spark, pp: pp };
})();
if (typeof globalThis !== "undefined") globalThis.ScDovezi = ScDovezi;
