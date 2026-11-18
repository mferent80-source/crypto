// Dovezile paginii „Trade-ul zilei” (v100.361; el, 18.11.2026: „Trade-ul zilei ca Jurnalul”, graficele alese: ziua pe ore în ora lui, cât de
// bine a nimerit P3, gridul spus față de măsurat, proba A cu puterea ei). Cifrele de mai jos sunt MĂSURATE o dată (auditul statistic din
// 18.11.2026: codul paginii, trade-zilei.js, rulat la h:05 UTC pe fiecare oră a fiecărei zile, pe 21 de perechi Binance perp; control =
// 01.11.2025–09.05.2026, 190 de zile ținute deoparte de calibrări; zile noi = 01–17.11.2026, 17 zile; eroarea pe ZILE) și nu se
// recalculează în pagină. Graficele sunt SVG ca șir (fără DOM), culorile doar prin clase (jg*), ca în Jurnal; tema (zi / noapte) le colorează.
var TzDovezi = (function () {
  var D = {"la":"18.11.2026","perioade":{"control":{"de":"01.11.2025","pana":"09.05.2026","zile":190},"noi":{"de":"01.11.2026","pana":"17.11.2026","zile":17}},"ore":{"iarna":[0.046,0.045,0.041,0.038,0.035,0.035,0.036,0.036,0.039,0.038,0.035,0.035,0.04,0.045,0.056,0.058,0.052,0.047,0.043,0.04,0.041,0.039,0.042,0.038],"vara":[0.045,0.046,0.042,0.037,0.037,0.037,0.037,0.038,0.039,0.037,0.036,0.036,0.044,0.052,0.057,0.051,0.048,0.045,0.042,0.04,0.039,0.04,0.04,0.035],"zileIarna":395,"zileVara":718},"p3":[{"k":"control","puncte":[{"spus":0.04,"iesit":0.052,"se":0.011,"zile":187,"n":18113},{"spus":0.148,"iesit":0.163,"se":0.02,"zile":188,"n":11362},{"spus":0.249,"iesit":0.269,"se":0.024,"zile":188,"n":9345},{"spus":0.349,"iesit":0.373,"se":0.026,"zile":188,"n":8233},{"spus":0.449,"iesit":0.472,"se":0.028,"zile":187,"n":7024},{"spus":0.55,"iesit":0.588,"se":0.027,"zile":186,"n":6116},{"spus":0.647,"iesit":0.694,"se":0.026,"zile":181,"n":4933},{"spus":0.747,"iesit":0.804,"se":0.024,"zile":167,"n":3802},{"spus":0.844,"iesit":0.919,"se":0.017,"zile":153,"n":2450},{"spus":0.942,"iesit":0.986,"se":0.006,"zile":131,"n":1178}]},{"k":"noi","puncte":[{"spus":0.04,"iesit":0.105,"se":0.076,"zile":17,"n":1682},{"spus":0.147,"iesit":0.201,"se":0.077,"zile":17,"n":1005},{"spus":0.249,"iesit":0.295,"se":0.084,"zile":17,"n":834},{"spus":0.347,"iesit":0.373,"se":0.089,"zile":17,"n":742},{"spus":0.451,"iesit":0.519,"se":0.101,"zile":17,"n":645},{"spus":0.55,"iesit":0.689,"se":0.089,"zile":17,"n":549},{"spus":0.649,"iesit":0.796,"se":0.076,"zile":17,"n":446},{"spus":0.749,"iesit":0.886,"se":0.055,"zile":16,"n":273},{"spus":0.846,"iesit":0.923,"se":0.06,"zile":12,"n":183},{"spus":0.941,"iesit":1,"se":0,"zile":13,"n":89}]}],"p3Prog":[{"k":"control","brier":0.197,"baza":0.25,"bss":0.212},{"k":"noi","brier":0.214,"baza":0.251,"bss":0.148}],"grid":{"control":[{"h":0,"spus":0.755,"iesit":0.749,"se":0.02},{"h":1,"spus":0.754,"iesit":0.759,"se":0.02},{"h":2,"spus":0.75,"iesit":0.752,"se":0.02},{"h":3,"spus":0.752,"iesit":0.742,"se":0.02},{"h":4,"spus":0.739,"iesit":0.736,"se":0.021},{"h":5,"spus":0.75,"iesit":0.734,"se":0.021},{"h":6,"spus":0.735,"iesit":0.727,"se":0.021},{"h":7,"spus":0.731,"iesit":0.715,"se":0.021},{"h":8,"spus":0.739,"iesit":0.702,"se":0.022},{"h":9,"spus":0.728,"iesit":0.7,"se":0.022},{"h":10,"spus":0.729,"iesit":0.708,"se":0.022},{"h":11,"spus":0.715,"iesit":0.694,"se":0.022},{"h":12,"spus":0.716,"iesit":0.692,"se":0.022},{"h":13,"spus":0.731,"iesit":0.69,"se":0.023},{"h":14,"spus":0.725,"iesit":0.667,"se":0.023},{"h":15,"spus":0.747,"iesit":0.669,"se":0.023},{"h":16,"spus":0.763,"iesit":0.705,"se":0.022},{"h":17,"spus":0.778,"iesit":0.735,"se":0.021},{"h":18,"spus":0.767,"iesit":0.748,"se":0.02},{"h":19,"spus":0.786,"iesit":0.767,"se":0.021},{"h":20,"spus":0.777,"iesit":0.758,"se":0.021},{"h":21,"spus":0.792,"iesit":0.768,"se":0.021},{"h":22,"spus":0.774,"iesit":0.723,"se":0.023},{"h":23,"spus":0.773,"iesit":0.699,"se":0.023}],"noi":[{"h":0,"iesit":0.745,"se":0.072},{"h":1,"iesit":0.731,"se":0.076},{"h":2,"iesit":0.669,"se":0.082},{"h":3,"iesit":0.703,"se":0.083},{"h":4,"iesit":0.683,"se":0.084},{"h":5,"iesit":0.689,"se":0.081},{"h":6,"iesit":0.686,"se":0.078},{"h":7,"iesit":0.697,"se":0.082},{"h":8,"iesit":0.689,"se":0.081},{"h":9,"iesit":0.683,"se":0.084},{"h":10,"iesit":0.689,"se":0.082},{"h":11,"iesit":0.714,"se":0.08},{"h":12,"iesit":0.672,"se":0.083},{"h":13,"iesit":0.669,"se":0.087},{"h":14,"iesit":0.636,"se":0.087},{"h":15,"iesit":0.664,"se":0.086},{"h":16,"iesit":0.737,"se":0.079},{"h":17,"iesit":0.717,"se":0.086},{"h":18,"iesit":0.748,"se":0.09},{"h":19,"iesit":0.717,"se":0.092},{"h":20,"iesit":0.669,"se":0.094},{"h":21,"iesit":0.714,"se":0.092},{"h":22,"iesit":0.728,"se":0.084},{"h":23,"iesit":0.622,"se":0.088}]},"curba":{"control":[{"h":1,"spus":0.238,"iesit":0.221,"se":0.008},{"h":2,"spus":0.336,"iesit":0.316,"se":0.01},{"h":3,"spus":0.396,"iesit":0.377,"se":0.011},{"h":4,"spus":0.438,"iesit":0.425,"se":0.011},{"h":5,"spus":0.473,"iesit":0.459,"se":0.011},{"h":6,"spus":0.507,"iesit":0.492,"se":0.011},{"h":7,"spus":0.54,"iesit":0.523,"se":0.011},{"h":8,"spus":0.575,"iesit":0.553,"se":0.012},{"h":9,"spus":0.608,"iesit":0.584,"se":0.012},{"h":10,"spus":0.637,"iesit":0.61,"se":0.012},{"h":11,"spus":0.662,"iesit":0.634,"se":0.012},{"h":12,"spus":0.684,"iesit":0.656,"se":0.012},{"h":13,"spus":0.713,"iesit":0.68,"se":0.012},{"h":14,"spus":0.748,"iesit":0.717,"se":0.012},{"h":15,"spus":0.788,"iesit":0.765,"se":0.011},{"h":16,"spus":0.824,"iesit":0.816,"se":0.01},{"h":17,"spus":0.857,"iesit":0.855,"se":0.009},{"h":18,"spus":0.883,"iesit":0.884,"se":0.008},{"h":19,"spus":0.906,"iesit":0.909,"se":0.008},{"h":20,"spus":0.925,"iesit":0.931,"se":0.007},{"h":21,"spus":0.945,"iesit":0.946,"se":0.007},{"h":22,"spus":0.964,"iesit":0.958,"se":0.006},{"h":23,"spus":0.985,"iesit":0.981,"se":0.004}],"noi":[{"h":1,"iesit":0.208,"se":0.026},{"h":2,"iesit":0.284,"se":0.032},{"h":3,"iesit":0.364,"se":0.034},{"h":4,"iesit":0.429,"se":0.04},{"h":5,"iesit":0.444,"se":0.041},{"h":6,"iesit":0.468,"se":0.042},{"h":7,"iesit":0.501,"se":0.042},{"h":8,"iesit":0.527,"se":0.044},{"h":9,"iesit":0.543,"se":0.044},{"h":10,"iesit":0.564,"se":0.046},{"h":11,"iesit":0.58,"se":0.045},{"h":12,"iesit":0.605,"se":0.045},{"h":13,"iesit":0.644,"se":0.048},{"h":14,"iesit":0.697,"se":0.05},{"h":15,"iesit":0.748,"se":0.047},{"h":16,"iesit":0.84,"se":0.044},{"h":17,"iesit":0.856,"se":0.041},{"h":18,"iesit":0.876,"se":0.038},{"h":19,"iesit":0.883,"se":0.038},{"h":20,"iesit":0.901,"se":0.037},{"h":21,"iesit":0.921,"se":0.035},{"h":22,"iesit":0.97,"se":0.012},{"h":23,"iesit":0.979,"se":0.01}]},"probaA":{"putere":0.095,"putereDublu":0.501,"putere365":0.497}};
  function nr(v) { var x = Number(v); return isFinite(x) ? x : null; }
  function p1(v) { return v == null || !isFinite(v) ? "—" : (Math.round(v * 1000) / 10).toFixed(1).replace(".", ",") + " %"; }
  function p0(v) { return v == null || !isFinite(v) ? "—" : Math.round(v * 100) + " %"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, eticheta, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(eticheta) + '">' + corp + "</svg>"; }
  // decalajul României față de UTC la momentul t (2 iarna, 3 vara)
  function decalajRo(t) {
    try { var p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)); var h = Number(p.find(function (x) { return x.type === "hour"; }).value); return ((h - new Date(t).getUTCHours()) + 24) % 24; } catch (e) { return 2; }
  }
  // cotele pe ora României: cota[r] = cota orei UTC (r − decalaj); sezonul după decalajul de acum (vara = 3)
  function oreRo(t) {
    var dec = decalajRo(t), sezon = dec === 3 && D.ore.vara ? "vara" : "iarna", U = D.ore[sezon], R = [];
    for (var r = 0; r < 24; r++) R.push(U[(r - dec + 24) % 24]);
    var best = 0, bs = -1; for (var s = 0; s < 24; s++) { var sum = 0; for (var k = 0; k < 4; k++) sum += R[(s + k) % 24]; if (sum > bs) { bs = sum; best = s; } }
    return { cote: R, sezon: sezon, dec: dec, varf: best, cotaVarf: bs, zile: sezon === "vara" ? D.ore.zileVara : D.ore.zileIarna };
  }
  // (1) ziua pe ore, în ora României: cât din agitația zilei vine din fiecare oră (suma range-urilor orare), vârful de 4 ore, linia „dacă ar fi egale”, ora de acum
  function ore(t, o) {
    o = o || {}; var Z = oreRo(t), W = Math.max(300, Math.round(o.lat || 640)), H = 168, X0 = 34, X1 = W - 6, Y0 = 8, Y1 = H - 22, mx = Math.max.apply(null, Z.cote) * 1.12;
    var bw = (X1 - X0) / 24, y = function (v) { return Y1 - (v / mx) * (Y1 - Y0); }, c = "";
    [0.02, 0.04, 0.06].forEach(function (v) { if (v < mx) { c += linie(X0, y(v), X1, y(v), "jgGrid"); c += txt(X0 - 4, y(v) + 4, Math.round(v * 100) + " %", { anc: "end" }); } });
    var oraAcum = (new Date(t).getUTCHours() + Z.dec) % 24;
    Z.cote.forEach(function (v, r) {
      var inV = ((r - Z.varf + 24) % 24) < 4, x = X0 + r * bw + 1, h = Y1 - y(v);
      c += '<rect class="jgBara ' + (inV ? "jgAtent" : "jgNeutru") + '" x="' + f(x) + '" y="' + f(y(v)) + '" width="' + f(bw - 2) + '" height="' + f(h) + '" rx="2"><title>' + esc(String(r).padStart(2, "0") + ":00–" + String((r + 1) % 24).padStart(2, "0") + ":00 ora României: " + p1(v) + " din agitația zilei" + (inV ? " (vârful zilei)" : "")) + "</title></rect>";
      if (r % 2 === 0) c += txt(X0 + r * bw + bw / 2, H - 8, String(r), { anc: "middle" });
    });
    c += linie(X0, y(1 / 24), X1, y(1 / 24), "jgIc", ' stroke-dasharray="4 3"');
    var xa = X0 + oraAcum * bw + bw / 2; c += linie(xa, Y0, xa, Y1, "jgLinie"); c += txt(Math.min(X1 - 2, xa + 4), Y0 + 10, "acum", { cls: "jgEt" });
    return { svg: svg(W, H, "Cât din agitația zilei vine din fiecare oră, în ora României", c), varf: Z.varf, cotaVarf: Z.cotaVarf, sezon: Z.sezon, zile: Z.zile, dec: Z.dec };
  }
  // (2) cât de bine a nimerit cifra mare (P3 cu ziua în curs), pe zecimi: spus pe orizontală, ieșit pe verticală, diagonala = perfect;
  //     punctele pline = control (190 de zile), cele goale = zilele noi (17), mustățile = ±1,96 erori pe zile
  function calib(o) {
    o = o || {}; var W = Math.max(300, Math.round(o.lat || 520)), H = Math.round(Math.min(320, Math.max(220, W * 0.6))), X0 = 40, X1 = W - 10, Y0 = 8, Y1 = H - 26, c = "";
    var x = function (v) { return X0 + v * (X1 - X0); }, y = function (v) { return Y1 - v * (Y1 - Y0); };
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { c += linie(X0, y(v), X1, y(v), "jgGrid") + txt(X0 - 4, y(v) + 4, Math.round(v * 100) + " %", { anc: "end" }) + txt(x(v), H - 8, Math.round(v * 100) + " %", { anc: "middle" }); });
    c += linie(x(0), y(0), x(1), y(1), "jgIc", ' stroke-dasharray="4 3"');
    D.p3.forEach(function (s) {
      var nou = s.k === "noi";
      s.puncte.forEach(function (p) {
        var px = x(p.spus) + (nou ? 5 : 0), lo = Math.max(0, p.iesit - 1.96 * p.se), hi = Math.min(1, p.iesit + 1.96 * p.se);
        c += linie(px, y(lo), px, y(hi), "jgIc");
        c += '<circle class="' + (nou ? "jgNou" : "jgPunct") + '" cx="' + f(px) + '" cy="' + f(y(p.iesit)) + '" r="4"><title>' + esc((nou ? "Zile noi (noiembrie)" : "Control (190 de zile)") + ": a spus " + p0(p.spus) + ", a ieșit " + p0(p.iesit) + " (" + p0(lo) + "–" + p0(hi) + "), " + p.zile + " de zile") + "</title></circle>";
      });
    });
    return svg(W, H, "Cifra mare: cât a spus și cât a ieșit, pe zecimi", c);
  }
  // (3) gridul: cât a promis că prinde restul zilei (linia) și cât a prins de fapt (puncte), pe ora României
  function grid(t, o) {
    o = o || {}; var dec = decalajRo(t), W = Math.max(300, Math.round(o.lat || 640)), H = 190, X0 = 40, X1 = W - 8, Y0 = 8, Y1 = H - 22, lo = 0.5, hi = 0.95, c = "";
    var bw = (X1 - X0) / 24, x = function (r) { return X0 + r * bw + bw / 2; }, y = function (v) { return Y1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (Y1 - Y0); };
    [0.5, 0.6, 0.7, 0.8, 0.9].forEach(function (v) { c += linie(X0, y(v), X1, y(v), "jgGrid") + txt(X0 - 4, y(v) + 4, Math.round(v * 100) + " %", { anc: "end" }); });
    var ro = function (h) { return (h + dec) % 24; }, C = D.grid.control.slice().sort(function (a, b) { return ro(a.h) - ro(b.h); }), path = "";
    C.forEach(function (p, i) { path += (i ? "L" : "M") + f(x(ro(p.h))) + " " + f(y(p.spus)); });
    c += '<path class="jgLinie" d="' + path + '"></path>';
    [["control", "jgPunct", 0], ["noi", "jgNou", 4]].forEach(function (s) {
      D.grid[s[0]].forEach(function (p) {
        var px = x(ro(p.h)) + s[2] - 2, a = p.iesit - 1.96 * p.se, b = p.iesit + 1.96 * p.se;
        c += linie(px, y(a), px, y(b), "jgIc") + '<circle class="' + s[1] + '" cx="' + f(px) + '" cy="' + f(y(p.iesit)) + '" r="3.5"><title>' + esc(String(ro(p.h)).padStart(2, "0") + ":00 ora României · " + (s[0] === "noi" ? "zile noi" : "control") + ": a prins " + p0(p.iesit) + " (" + p0(a) + "–" + p0(Math.min(1, b)) + ")" + (s[0] === "control" ? ", a promis " + p0(p.spus) : "")) + "</title></circle>";
      });
    });
    for (var r = 0; r < 24; r += 2) c += txt(x(r), H - 8, String(r), { anc: "middle" });
    var abat = D.grid.control.reduce(function (s, p) { return s + (p.iesit - p.spus); }, 0) / D.grid.control.length, abatNoi = D.grid.noi.reduce(function (s, p, i) { return s + (p.iesit - D.grid.control[i].spus); }, 0) / D.grid.noi.length;
    return { svg: svg(W, H, "Gridul: cât a promis că prinde restul zilei și cât a prins, pe ore", c), abat: abat, abatNoi: abatNoi };
  }
  // (4) proba A: zilele judecate din cele până la verdict, puterea spusă pe față
  function probaA(st) {
    var din = Date.parse("2026-11-04T00:00:00Z"), pana = Date.parse("2027-02-01T00:00:00Z"), tot = Math.round((pana - din) / 86400000), z = st && nr(st.zile) != null ? nr(st.zile) : null;
    return { zile: z, total: tot, procent: z == null ? null : Math.min(1, z / tot), putere: D.probaA.putere, putereDublu: D.probaA.putereDublu, putere365: D.probaA.putere365,
      nSemnal: st && nr(st.nSemnal), netSemnal: st && nr(st.netSemnal), netRest: st && nr(st.netRest), ultima: st && st.ultima || null };
  }
  return { D: D, decalajRo: decalajRo, oreRo: oreRo, ore: ore, calib: calib, grid: grid, probaA: probaA, p1: p1, p0: p0 };
})();
if (typeof globalThis !== "undefined") globalThis.TzDovezi = TzDovezi;
