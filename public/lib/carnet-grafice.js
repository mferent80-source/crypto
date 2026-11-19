// Graficele Carnetului fișei (v100.362; el, 18.11.2026: „Carnetul ca Jurnalul”, graficele alese: stopul promis față de venit, alegerea față de
// „mereu LARG”, „aș aștepta” ⇒ stopul, cât ar dura să aflăm; + ideile mele: nivelul celor două variante, pe fiecare monedă). SVG ca șir (fără DOM),
// culorile doar prin clase (jg*), ca în Jurnal / Trade-ul zilei; tema (zi / noapte) le colorează. Datele = raportul de noapte (Carnet.analiza);
// puterea = măsurată o dată (auditul statistic din 18.11.2026: 2.000 de simulări pe structura datelor, regula „dovedit” a paginii).
var CnGrafice = (function () {
  // puterea regulii „dovedit” (ambele teste sub 1%) la un efect de +0,5% / +1% pe 3 zile, după câte zile de oferte (auditul 18.11)
  var PUTERE = { la: "18.11.2026", rejoc: [0.31, 0.90], oferte: [[39, 0.095, 0.54], [90, 0.26, 0.90], [120, 0.35, 0.96], [180, 0.54, 0.996]] };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function P1(x) { if (x != null && isFinite(x) && Math.abs(x) < 0.0005) x = 0; return x == null || !isFinite(x) ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "")   /* fără „−0,0 %” */ + Math.abs(x * 100).toFixed(1).replace(".", ",") + " %"; }
  function P0(x) { return x == null || !isFinite(x) ? "—" : Math.round(x * 100) + " %"; }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, et, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(et) + '">' + corp + "</svg>"; }
  function lat(o) { return Math.max(300, Math.round((o && o.lat) || 600)); }
  // (1) stopul promis față de venit, pe coșuri, cu intervalul pe blocuri; plin = istoric, gol = ofertele de acum înainte; diagonala = cât promite
  function calib(ist, ina, o) {
    var W = lat(o), H = Math.round(Math.min(300, Math.max(210, W * 0.55))), X0 = 40, X1 = W - 10, Y0 = 8, Y1 = H - 24, c = "";
    var x = function (v) { return X0 + Math.min(1, Math.max(0, v)) * (X1 - X0); }, y = function (v) { return Y1 - Math.min(1, Math.max(0, v)) * (Y1 - Y0); };
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { c += linie(X0, y(v), X1, y(v), "jgGrid") + txt(X0 - 4, y(v) + 4, Math.round(v * 100) + " %", { anc: "end" }) + txt(x(v), H - 8, Math.round(v * 100) + " %", { anc: "middle" }); });
    c += linie(x(0), y(0), x(1), y(1), "jgIc", ' stroke-dasharray="4 3"');
    [[ist, "jgPunct", 0, "Pe istoric"], [ina, "jgNou", 6, "De acum înainte"]].forEach(function (s) {
      (Array.isArray(s[0]) ? s[0] : []).forEach(function (k) {
        if (!(k.n > 0) || k.promis == null || k.venit == null) return; var px = x(k.promis) + s[2];
        if (k.lo != null && k.hi != null) c += linie(px, y(k.lo), px, y(k.hi), "jgIc");
        c += '<circle class="' + s[1] + '" cx="' + f(px) + '" cy="' + f(y(k.venit)) + '" r="5"><title>' + esc(s[3] + " · stopul promis " + k.cos + " (în medie " + P0(k.promis) + "): a venit în " + P0(k.venit) + (k.lo != null ? " (" + P0(k.lo) + "–" + P0(k.hi) + ")" : "") + " din " + k.n + " de porniri") + "</title></circle>";
      });
    });
    return svg(W, H, "Stopul promis față de cât de des a venit", c);
  }
  // (2) aleasă − „mereu LARG”, pe fiecare bloc de 3 zile (bara) + media cu intervalul (banda); sub zero = alegerea a ieșit mai prost
  function blocuri(l, s, o) {
    var B = Array.isArray(l) ? l : []; if (!B.length) return "";
    var W = lat(o), H = 170, X0 = 44, X1 = W - 8, Y0 = 10, Y1 = H - 22, c = "";
    var mx = Math.max(0.004, Math.max.apply(null, B.map(function (b) { return Math.abs(b.dif); }).concat(s && s.lo != null ? [Math.abs(s.lo), Math.abs(s.hi)] : []))) * 1.15;
    var y = function (v) { return Y0 + (mx - v) / (2 * mx) * (Y1 - Y0); }, bw = (X1 - X0) / B.length;
    [-mx, -mx / 2, 0, mx / 2, mx].forEach(function (v) { c += linie(X0, y(v), X1, y(v), v === 0 ? "jgAx" : "jgGrid") + txt(X0 - 4, y(v) + 4, P1(v).replace(" %", "%"), { anc: "end" }); });
    if (s && s.lo != null) c += '<rect class="jgBanda" x="' + X0 + '" y="' + f(y(s.hi)) + '" width="' + f(X1 - X0) + '" height="' + f(Math.max(1, y(s.lo) - y(s.hi))) + '"><title>' + esc("media pe toate perechile: " + P1(s.medie) + " (interval " + P1(s.lo) + " … " + P1(s.hi) + ")") + "</title></rect>" + linie(X0, y(s.medie), X1, y(s.medie), "jgLinie");
    B.forEach(function (b, i) {
      var x = X0 + i * bw + 2, top = Math.min(y(b.dif), y(0)), h = Math.max(1, Math.abs(y(b.dif) - y(0))), d = new Date(b.t);
      c += '<rect class="jgBara ' + (b.dif >= 0 ? "jgPoz" : "jgNeg") + '" x="' + f(x) + '" y="' + f(top) + '" width="' + f(Math.max(2, bw - 4)) + '" height="' + f(h) + '" rx="2"><title>' + esc("blocul din " + String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0") + ": " + P1(b.dif) + " (" + b.n + " " + ((o && o.unit) || "de perechi") + ")") + "</title></rect>";
      if (i % Math.max(1, Math.ceil(B.length * 44 / (X1 - X0))) === 0)   /* cel puțin 44 px între date (telefonul) */ c += txt(x + bw / 2 - 2, H - 6, String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0"), { anc: "middle" });
    });
    return svg(W, H, (o && o.eticheta) || "Varianta aleasă față de mereu LARG, pe blocuri de 3 zile", c);   /* v100.365: Salt își pune eticheta */
  }
  // bare orizontale cu interval: rânduri [{et, medie, lo, hi, n, ton}] - pentru nivelurile variantelor și „aș aștepta” ⇒ stopul
  function bare(R, o) {
    R = (Array.isArray(R) ? R : []).filter(function (r) { return r && r.medie != null; }); if (!R.length) return "";
    o = o || {}; var W = lat(o), LBL = Math.min(240, Math.round(W * 0.42)), X0 = LBL + 8, X1 = W - 64, RH = 26, H = 10 + R.length * RH + 18, c = "";
    var vals = []; R.forEach(function (r) { vals.push(r.medie, r.lo != null ? r.lo : r.medie, r.hi != null ? r.hi : r.medie); });
    var mn = o.procent ? 0 : Math.min(0, Math.min.apply(null, vals)), mx = o.procent ? Math.min(1, Math.max.apply(null, vals) * 1.1) : Math.max(0, Math.max.apply(null, vals));
    if (!(mx > mn)) { mx = mn + 0.01; } var x = function (v) { return X0 + (v - mn) / (mx - mn) * (X1 - X0); };
    c += linie(x(o.procent ? 0 : 0), 6, x(o.procent ? 0 : 0), 10 + R.length * RH, "jgAx");
    R.forEach(function (r, i) {
      var yy = 10 + i * RH, v = r.medie, a = Math.min(x(v), x(o.procent ? 0 : 0)), w = Math.max(1, Math.abs(x(v) - x(o.procent ? 0 : 0)));
      c += txt(LBL, yy + 15, r.et, { anc: "end", cls: "jgEt" });
      c += '<rect class="jgBara ' + (r.ton || (v >= 0 ? "jgPoz" : "jgNeg")) + '" x="' + f(a) + '" y="' + f(yy + 3) + '" width="' + f(w) + '" height="18" rx="2"><title>' + esc(r.et + ": " + (o.procent ? P0(v) : P1(v)) + (r.lo != null ? " (" + (o.procent ? P0(r.lo) + "–" + P0(r.hi) : P1(r.lo) + " … " + P1(r.hi)) + ")" : "") + " · " + r.n + " de cazuri") + "</title></rect>";
      if (r.lo != null && r.hi != null) c += linie(x(r.lo), yy + 12, x(r.hi), yy + 12, "jgIc") + linie(x(r.lo), yy + 7, x(r.lo), yy + 17, "jgIc") + linie(x(r.hi), yy + 7, x(r.hi), yy + 17, "jgIc");
      c += txt(W - 4, yy + 15, o.procent ? P0(v) : P1(v), { anc: "end" });
    });
    return svg(W, H, o.eticheta || "Bare cu interval", c);
  }
  // (6) pe fiecare monedă: aleasă − cealaltă, cu câte perechi; doar monedele cu cel puțin `min` perechi (restul spuse sub grafic)
  function peMonede(l, o) {
    o = o || {}; var min = o.min || 5, M = (Array.isArray(l) ? l : []).filter(function (m) { return m.n >= min; }); if (!M.length) return { svg: "", ascunse: (l || []).length };
    var W = lat(o), RH = 18, LBL = 92, X0 = LBL + 6, X1 = W - 60, H = 10 + M.length * RH + 16, c = "";
    var mx = Math.max(0.002, Math.max.apply(null, M.map(function (m) { return Math.abs(m.dif); }))) * 1.1, x = function (v) { return X0 + (v + mx) / (2 * mx) * (X1 - X0); };
    c += linie(x(0), 6, x(0), 10 + M.length * RH, "jgAx");
    M.forEach(function (m, i) {
      var yy = 10 + i * RH; c += txt(LBL, yy + 12, m.simbol + " (" + m.n + ")", { anc: "end", cls: "jgEt" }) + linie(x(0), yy + 8, x(m.dif), yy + 8, "jgGrid");
      c += '<circle class="' + (m.dif >= 0 ? "jgPozC" : "jgNegC") + '" cx="' + f(x(m.dif)) + '" cy="' + f(yy + 8) + '" r="4"><title>' + esc(m.simbol + ": aleasă − cealaltă " + P1(m.dif) + " pe " + m.n + " de perechi") + "</title></circle>" + txt(W - 4, yy + 12, P1(m.dif), { anc: "end" });
    });
    return { svg: svg(W, H, "Varianta aleasă față de cealaltă, pe fiecare monedă", c), ascunse: (l || []).length - M.length };
  }
  // (4) cât ar dura să aflăm: șansa ca regula „dovedit” să prindă un efect de +0,5% / +1% pe 3 zile, după câte zile de oferte; „azi” = zilele de acum
  function putere(zileAzi, o) {
    var W = lat(o), H = 190, X0 = 40, X1 = W - 10, Y0 = 8, Y1 = H - 24, zMax = 200, c = "";
    var x = function (z) { return X0 + Math.min(zMax, z) / zMax * (X1 - X0); }, y = function (p) { return Y1 - p * (Y1 - Y0); };
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { c += linie(X0, y(v), X1, y(v), "jgGrid") + txt(X0 - 4, y(v) + 4, Math.round(v * 100) + " %", { anc: "end" }); });
    [0, 30, 60, 90, 120, 150, 180].forEach(function (z) { c += txt(x(z), H - 8, String(z), { anc: "middle" }); });
    [[1, "jgLinie", "+0,5 % pe 3 zile"], [2, "jgLinie2", "+1 % pe 3 zile"]].forEach(function (s) {
      var d = "M" + f(x(0)) + " " + f(y(0)); PUTERE.oferte.forEach(function (p) { d += "L" + f(x(p[0])) + " " + f(y(p[s[0]])); });
      c += '<path class="' + s[1] + '" d="' + d + '"></path>';
      PUTERE.oferte.forEach(function (p) { c += '<circle class="jgPunct" cx="' + f(x(p[0])) + '" cy="' + f(y(p[s[0]])) + '" r="3"><title>' + esc(s[2] + ": la " + p[0] + " de zile, " + P0(p[s[0]])) + "</title></circle>"; });
    });
    c += linie(x(120), Y0, x(120), Y1, "jgIc", ' stroke-dasharray="3 3"') + txt(x(120) + 3, Y0 + 10, "fostul plafon (120)", { cls: "jgEt" });
    if (zileAzi > 0) c += linie(x(zileAzi), Y0, x(zileAzi), Y1, "jgAzi") + txt(Math.min(X1 - 30, x(zileAzi) + 3), Y1 - 6, "azi", { cls: "jgEt" });
    return svg(W, H, "Cât ar dura să aflăm: șansa ca proba să prindă un efect, după câte zile de oferte", c);
  }
  return { PUTERE: PUTERE, calib: calib, blocuri: blocuri, bare: bare, peMonede: peMonede, putere: putere, P1: P1, P0: P0 };
})();
if (typeof globalThis !== "undefined") globalThis.CnGrafice = CnGrafice;
