// Graficele paginii „Contul întreg” (v100.369; el, 20.11.2026: „Contul întreg ca Jurnalul”, graficele alese: TOATE 4). SVG ca șir (fără DOM),
// culorile doar prin clase (jg* comune + ciL* pentru liniile cu nume), ca în Carnet / Jurnal / Salt; tema (zi / noapte) le colorează.
//   riscZile  - pierderea / câștigul pozițiilor de acum pe fiecare zi, cu pragul zilei proaste: cifra veche (250 de zile egale) și cea de
//               acum (pe agitația de acum, EWMA); zilele care au trecut de pragul vechi, marcate
//   botiBucati - banii boților închiși pe ultimul an, cumulat pe zile: grila, direcția, comisioanele, funding-ul și netul (lei)
//   pariuri   - „câte pariuri independente” pe ferestre de 60 și 250 de zile de bursă, pe ultimii 2 ani
//   carte     - scăderea de la vârf a pozițiilor de ACUM, ținute pe toată istoria lor (procent din expunere)
var ContGrafice = (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function f(v) { return (Math.round(v * 10) / 10).toString(); }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f(x) + '" y="' + f(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls, extra) { return '<line class="' + cls + '" x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '"' + (extra || "") + "></line>"; }
  function svg(W, H, et, corp) { return '<svg class="jgSvg" viewBox="0 0 ' + W + " " + H + '" width="100%" style="width:100%;height:auto;display:block" font-size="11" role="img" aria-label="' + esc(et) + '">' + corp + "</svg>"; }
  function lat(o) { return Math.max(300, Math.round((o && o.lat) || 600)); }
  function mii(x) { var r = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (x < 0 ? "−" : x > 0 ? "+" : "") + r; }
  function lei(x) { return mii(x) + " lei"; }
  function pct(x) { return (x < 0 ? "−" : x > 0 ? "+" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + " %"; }
  function zz(z) { return String(z).slice(8, 10) + "." + String(z).slice(5, 7); }
  function luna(z) { return String(z).slice(5, 7) + "." + String(z).slice(2, 4); }
  // axa X pe date: o etichetă la cel puțin `pas` px (telefonul)
  function axaX(Z, x, H, pas, fmt) { var c = "", ultim = -1e9, scris = ""; Z.forEach(function (z, i) { var xx = x(i), e = fmt(z); if (xx - ultim >= pas && e !== scris) { var cap = Z.length > 1 && x(Z.length - 1) - xx < 22; c += txt(cap ? x(Z.length - 1) : xx, H - 6, e, { anc: cap ? "end" : "middle" }); ultim = xx; scris = e; } }); return c; }   /* aceeași lună nu se scrie de două ori */
  function axaY(vals, X0, X1, y, fmt) { var c = ""; vals.forEach(function (v) { c += linie(X0, y(v), X1, y(v), Math.abs(v) < 1e-12 ? "jgAx" : "jgGrid") + txt(X0 - 4, y(v) + 4, fmt(v), { anc: "end" }); }); return c; }
  function scara(mn, mx) { var d = mx - mn || 1, p = Math.pow(10, Math.floor(Math.log(d / 3) / Math.LN10)), k = d / 3 / p, pas = (k > 5 ? 10 : k > 2 ? 5 : k > 1 ? 2 : 1) * p, o = []; for (var v = Math.ceil(mn / pas) * pas; v <= mx + 1e-9; v += pas) o.push(Math.abs(v) < 1e-9 ? 0 : v); return o; }

  // serie = [[zi, pnl, pragVechi, pragAcum]] (pragurile pozitive = pierderea zilei proaste)
  function riscZile(serie, o) {
    var S = (Array.isArray(serie) ? serie : []).filter(function (x) { return x && isFinite(x[1]); }); if (!S.length) return "";
    o = o || {}; if (o.ultime) S = S.slice(-o.ultime);
    var W = lat(o), H = 210, X0 = 52, X1 = W - 8, Y0 = 10, Y1 = H - 24, c = "", n = S.length;
    var mn = Math.min.apply(null, S.map(function (x) { return Math.min(x[1], -(x[2] || 0), -(x[3] || 0)); })), mx = Math.max.apply(null, S.map(function (x) { return x[1]; }).concat([0]));
    var pad = (mx - mn) * 0.06; mn -= pad; mx += pad;
    var y = function (v) { return Y0 + (mx - v) / (mx - mn) * (Y1 - Y0); }, bw = (X1 - X0) / n, x = function (i) { return X0 + (i + 0.5) * bw; };
    c += axaY(scara(mn, mx), X0, X1, y, function (v) { return mii(v); });
    S.forEach(function (s, i) {
      var top = Math.min(y(s[1]), y(0)), h = Math.max(0.6, Math.abs(y(s[1]) - y(0))), dep = s[2] != null && s[1] < -s[2];
      c += '<rect class="jgBara ' + (dep ? "jgNeg" : s[1] >= 0 ? "jgPoz" : "jgNeutru") + '" x="' + f(X0 + i * bw) + '" y="' + f(top) + '" width="' + f(Math.max(0.8, bw - (bw > 3 ? 1 : 0))) + '" height="' + f(h) + '"><title>' + esc(zz(s[0]) + "." + String(s[0]).slice(0, 4) + ": " + lei(s[1]) + (s[2] != null ? " · pragul vechi −" + mii(s[2]).replace("+", "") + " lei" : "") + (s[3] != null ? " · pragul de acum −" + mii(s[3]).replace("+", "") + " lei" : "") + (dep ? " · a trecut de pragul vechi" : "")) + "</title></rect>";
    });
    var drum = function (k) { return S.map(function (s, i) { return s[k] != null ? (i && S[i - 1][k] != null ? "L" : "M") + f(x(i)) + " " + f(y(-s[k])) : ""; }).join(" "); };
    c += '<path class="ciLVechi" d="' + drum(2) + '"></path><path class="ciLAcum" d="' + drum(3) + '"></path>';
    c += axaX(S.map(function (s) { return s[0]; }), x, H, 64, luna);
    return svg(W, H, o.eticheta || "Pierderea pe fiecare zi a pozițiilor de acum, față de pragul zilei proaste", c);
  }
  // pe ecran îngust etichetele de la capătul liniilor ar lua jumătate din grafic: se scriu dedesubt, ca legendă (o linie de culoare + text)
  function legenda(R, X0, y0) { var c = ""; R.forEach(function (r, i) { var yy = y0 + i * 15; c += '<path class="' + r.cls + '" d="M' + f(X0) + " " + f(yy - 4) + " L" + f(X0 + 18) + " " + f(yy - 4) + '"></path>' + txt(X0 + 24, yy, r.t, { cls: "jgEt" }); }); return c; }
  // cum = [[zi, grila, directie, comisioane, funding]] cumulat (lei)
  function botiBucati(cum, o) {
    var C = (Array.isArray(cum) ? cum : []).filter(function (x) { return x && x[0]; }); if (C.length < 2) return "";
    o = o || {}; var W = lat(o), ing = W < 520, H = 220 + (ing ? 5 * 15 + 6 : 0), X0 = 58, X1 = W - (ing ? 10 : 152), Y0 = 10, Y1 = 220 - 24, c = "", n = C.length;
    var net = C.map(function (r) { return r[1] + r[2] + r[3] + r[4]; }), vals = [0]; C.forEach(function (r, i) { vals.push(r[1], r[2], r[3], r[4], net[i]); });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), pad = (mx - mn) * 0.05; mn -= pad; mx += pad;
    var x = function (i) { return X0 + i / Math.max(1, n - 1) * (X1 - X0); }, y = function (v) { return Y0 + (mx - v) / (mx - mn) * (Y1 - Y0); };
    c += axaY(scara(mn, mx), X0, X1, y, function (v) { return mii(v); });
    var S = [{ k: 1, et: "grila", cls: "ciLPoz" }, { k: 2, et: "direcția", cls: "ciLNeg" }, { k: 3, et: "comisioanele", cls: "ciLAtent" }, { k: 4, et: "funding-ul", cls: "ciLNeutru" }, { k: 0, et: "net", cls: "ciLNet" }];
    var val = function (s, i) { return s.k ? C[i][s.k] : net[i]; }, capat = function (s) { return !s.k && o.net != null && isFinite(o.net) ? o.net : val(s, n - 1); };   /* netul de pe etichetă = cel din tabel (suma rotunjită o dată) */
    var et = S.map(function (s) { return { s: s, y: y(val(s, n - 1)) + 4 }; }).sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < et.length; k++) if (et[k].y - et[k - 1].y < 13) et[k].y = et[k - 1].y + 13;
    S.forEach(function (s) { c += '<path class="' + s.cls + '" d="' + C.map(function (r, i) { return (i ? "L" : "M") + f(x(i)) + " " + f(y(val(s, i))); }).join(" ") + '"><title>' + esc(s.et + ", cumulat până pe " + zz(C[n - 1][0]) + ": " + lei(capat(s))) + "</title></path>"; });
    if (ing) c += legenda(S.map(function (s) { return { cls: s.cls, t: s.et + " " + mii(capat(s)) + " lei" }; }), X0, 220 + 12); else et.forEach(function (e) { c += txt(X1 + 4, e.y, e.s.et + " " + mii(capat(e.s)), { cls: "jgEt" }); });
    c += axaX(C.map(function (r) { return r[0]; }), x, 220, 64, luna);
    return svg(W, H, o.eticheta || "Banii boților închiși pe ultimul an, cumulat, pe bucăți", c);
  }
  // serie = [[zi, pariuri60, pariuri250]]; o.pozitii = câte poziții (plafonul)
  function pariuri(serie, o) {
    var P = (Array.isArray(serie) ? serie : []).filter(function (x) { return x && isFinite(x[1]) && isFinite(x[2]); }); if (P.length < 2) return "";
    o = o || {}; var W = lat(o), ing = W < 520, H = 190 + (ing ? 3 * 15 + 6 : 0), X0 = 34, X1 = W - (ing ? 10 : 132), Y0 = 10, Y1 = 190 - 24, c = "", n = P.length;
    var mx = Math.max(o.pozitii || 0, Math.max.apply(null, P.map(function (r) { return Math.max(r[1], r[2]); }))) * 1.05, mn = 1;
    var x = function (i) { return X0 + i / Math.max(1, n - 1) * (X1 - X0); }, y = function (v) { return Y0 + (mx - v) / (mx - mn) * (Y1 - Y0); };
    c += axaY(scara(mn, mx).filter(function (v) { return v >= 1; }), X0, X1, y, function (v) { return String(Math.round(v * 10) / 10).replace(".", ","); });
    if (o.pozitii) c += linie(X0, y(o.pozitii), X1, y(o.pozitii), "jgIc", ' stroke-dasharray="5 4"') + (ing ? "" : txt(X1 + 4, y(o.pozitii) + 4, o.pozitii + " = toate separate", { cls: "jgEt" }));
    [{ k: 1, et: "pe 60 de zile", cls: "ciLAcum" }, { k: 2, et: "pe 250 de zile", cls: "ciLVechi" }].forEach(function (s) {
      c += '<path class="' + s.cls + '" d="' + P.map(function (r, i) { return (i ? "L" : "M") + f(x(i)) + " " + f(y(r[s.k])); }).join(" ") + '"><title>' + esc(s.et + ": " + P.map(function (r) { return zz(r[0]) + " " + String(Math.round(r[s.k] * 10) / 10).replace(".", ","); }).slice(-12).join(", ")) + "</title></path>";
    });
    /* etichetele de la capăt: cea de sus cu cel puțin 13 px deasupra celeilalte (se călcau când liniile se apropie) */
    var e1 = y(P[n - 1][1]) + 4, e2 = y(P[n - 1][2]) + 4; if (Math.abs(e1 - e2) < 13) { if (e1 <= e2) e1 = e2 - 13; else e2 = e1 - 13; }
    var t60 = "pe 60 de zile " + String(Math.round(P[n - 1][1] * 10) / 10).replace(".", ","), t250 = "pe 250 de zile " + String(Math.round(P[n - 1][2] * 10) / 10).replace(".", ",");
    if (ing) c += legenda([{ cls: "ciLAcum", t: t60 }, { cls: "ciLVechi", t: t250 }].concat(o.pozitii ? [{ cls: "ciLVechi", t: "linia de sus: " + o.pozitii + " = toate separate" }] : []), X0, 190 + 12);
    else c += txt(X1 + 4, e1, t60, { cls: "jgEt" }) + txt(X1 + 4, e2, t250, { cls: "jgEt" });
    c += axaX(P.map(function (r) { return r[0]; }), x, 190, 64, luna);
    return svg(W, H, o.eticheta || "Câte pariuri independente porți, pe ferestre de 60 și 250 de zile", c);
  }
  // serie = [[zi, scăderea de la vârf (≤ 0)]]; o.expunere = lei (pentru titluri)
  function carte(serie, o) {
    var S = (Array.isArray(serie) ? serie : []).filter(function (x) { return x && isFinite(x[1]); }); if (S.length < 2) return "";
    o = o || {}; var W = lat(o), H = 190, X0 = 46, X1 = W - 8, Y0 = 10, Y1 = H - 24, c = "", n = S.length;
    var mn = Math.min.apply(null, S.map(function (r) { return r[1]; })) * 1.06, mx = 0;
    var x = function (i) { return X0 + i / Math.max(1, n - 1) * (X1 - X0); }, y = function (v) { return Y0 + (mx - v) / (mx - mn) * (Y1 - Y0); };
    c += axaY(scara(mn, mx), X0, X1, y, function (v) { return Math.round(v * 100) + "%"; });
    c += '<path class="jgBanda" d="M' + f(x(0)) + " " + f(y(0)) + " " + S.map(function (r, i) { return "L" + f(x(i)) + " " + f(y(r[1])); }).join(" ") + " L" + f(x(n - 1)) + " " + f(y(0)) + ' Z"></path>';
    c += '<path class="ciLNeg" d="' + S.map(function (r, i) { return (i ? "L" : "M") + f(x(i)) + " " + f(y(r[1])); }).join(" ") + '"></path>';
    var iMin = 0; S.forEach(function (r, i) { if (r[1] < S[iMin][1]) iMin = i; });
    c += '<circle class="jgPunct" cx="' + f(x(iMin)) + '" cy="' + f(y(S[iMin][1])) + '" r="4"><title>' + esc("cel mai jos: " + pct(S[iMin][1]) + " pe " + zz(S[iMin][0]) + "." + S[iMin][0].slice(0, 4) + (o.expunere ? " ≈ " + lei(S[iMin][1] * o.expunere) : "")) + "</title></circle>";
    c += '<circle class="jgNou" cx="' + f(x(n - 1)) + '" cy="' + f(y(S[n - 1][1])) + '" r="4"><title>' + esc("acum: " + pct(S[n - 1][1]) + (o.expunere ? " ≈ " + lei(S[n - 1][1] * o.expunere) : "")) + "</title></circle>";
    c += axaX(S.map(function (r) { return r[0]; }), x, H, 64, luna);
    return svg(W, H, o.eticheta || "Scăderea de la vârf a pozițiilor de acum, pe istoria lor", c);
  }
  return { riscZile: riscZile, botiBucati: botiBucati, pariuri: pariuri, carte: carte, scara: scara };
})();
if (typeof globalThis !== "undefined") globalThis.ContGrafice = ContGrafice;
