// Graficele Jurnalului de trade (v100.358) - SVG ca ȘIR, fără DOM, din ce dă JurnalDovezi. Probat în scripts/proba-v100358-dovezi.mjs.
// Regulile de desen: o singură axă Y pe panou (curba și „sub apă” = DOUĂ panouri pe aceeași axă X, nu două axe Y pe același panou); linii
// de 2px; marcaje subțiri cu 2px gol între bare / segmente; etichete doar selective; fiecare marcaj cu <title> (atingere / hover); svg cu
// role="img" + aria-label; culorile DOAR prin clase - tema (zi / noapte) le colorează în CSS:
//   jgSvg (rădăcina) · jgAx (text și axe) · jgGrid (liniile de ghidaj) · jgLinie (linia / punctele netului) · jgArie (aria „sub apă”)
//   jgPoz / jgNeg / jgNeutru (pe plus / pe minus / puține date sau costuri) · jgGrile / jgPozitie / jgCosturi (seriile lunii, lângă jgPoz /
//   jgNeg / jgNeutru) · jgC-2 jgC-1 jgC0 jgC1 jgC2 (calendarul, divergent cu mijloc neutru) + jgCgol (zi fără boți) · jgHit (ținta de hover,
//   opacity 0) · jgIc (mustața intervalului) · jgMarc (punctele căderii).
// viewBox + width 100% ⇒ încape la 412 px; cifrele cu o zecimală și virgulă (TextRo).
var JurnalGrafice = (function () {
  "use strict";
  // v100.358: viewBox-ul are EXACT lățimea containerului (o.lat, px măsurați de pagină cu clientWidth; implicit 640) ⇒ textul rămâne 11 px la
  // orice lățime (nu se întinde odată cu graficul); înălțimile sunt fixe, în px.
  var W = 640, FS = 11;
  function lat(o) { var v = o && Number(o.lat); W = isFinite(v) && v >= 240 ? Math.round(Math.min(4000, v)) : 640; return W; }
  var TR = typeof TextRo !== "undefined" ? TextRo : null;
  function ok(v) { return typeof v === "number" && isFinite(v); }
  function U(v) { return !ok(v) ? "—" : TR ? TR.usdt(v) : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; }
  function N1(v) { return !ok(v) ? "—" : TR ? TR.num(v, 1) : (v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ","); }
  function S1(v) { return !ok(v) ? "—" : (v > 0.05 ? "+" : "") + N1(v); }
  function PC(f) { return !ok(f) ? "—" : TR ? TR.pct(f * 100, 1) : (f * 100).toFixed(1).replace(".", ",") + "%"; }
  function cate(n, sg, pl) { if (TR && TR.cate) return TR.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function f1(v) { return ok(v) ? (Math.round(v * 10) / 10).toString() : "0"; }
  function data(z) { return z ? z.slice(8, 10) + "." + z.slice(5, 7) + "." + z.slice(2, 4) : "—"; }
  var LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
  function svg(h, aria, corp, cls) {
    return '<svg class="jgSvg' + (cls ? " " + cls : "") + '" viewBox="0 0 ' + W + " " + f1(h) + '" width="100%" style="width:100%;height:auto;display:block" font-size="' + FS + '" role="img" aria-label="' + esc(aria) + '">' + corp + "</svg>";
  }
  function txt(x, y, s, o) { o = o || {}; return '<text class="' + (o.cls || "jgAx") + '" x="' + f1(x) + '" y="' + f1(y) + '"' + (o.anc ? ' text-anchor="' + o.anc + '"' : "") + ">" + esc(s) + "</text>"; }
  function linie(x1, y1, x2, y2, cls) { return '<line class="' + cls + '" x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '"></line>'; }
  function rect(x, y, w, h, cls, titlu, extra) { return '<rect class="' + cls + '" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(0, w)) + '" height="' + f1(Math.max(0, h)) + '"' + (extra || "") + ">" + (titlu ? "<title>" + esc(titlu) + "</title>" : "") + "</rect>"; }
  function scala(mn, mx, sus, jos) { if (!(mx > mn)) { mn -= 1; mx += 1; } return function (v) { return sus + (mx - v) / (mx - mn) * (jos - sus); }; }
  function lista(pz) { return Array.isArray(pz) ? pz : pz && Array.isArray(pz.lista) ? pz.lista : []; }

  // ---- 1. curba pe zile (sus) + „sub apă” (jos), aceeași axă X ----
  function curbaZile(pz, o) {
    lat(o);
    var L = lista(pz), rz = pz && pz.rezumat || {};
    if (!L.length) return "";
    var ST = 8, DR = 64, X0 = ST, X1 = W - DR, A0 = 18, A1 = 220, B0 = 246, B1 = 338, H = 360;   // curba ~220, sub apă ~110
    var n = L.length, x = function (i) { return X0 + (n === 1 ? 0.5 : i / (n - 1)) * (X1 - X0); };
    var cum = L.map(function (d) { return d.cumul; }), sub = L.map(function (d) { return d.sub; });
    var mn = Math.min(0, Math.min.apply(null, cum)), mx = Math.max(0, Math.max.apply(null, cum)), y = scala(mn, mx, A0, A1);
    var smn = Math.min.apply(null, sub), ys = scala(Math.min(smn, -1e-9), 0, B0, B1);
    var c = "";
    c += linie(X0, y(0), X1, y(0), "jgGrid") + txt(X1 + 4, y(0) + 4, "0");
    if (Math.abs(y(mx) - y(0)) >= 14) c += txt(X1 + 4, y(mx) + 4, N1(mx));
    if (Math.abs(y(mn) - y(0)) >= 14) c += txt(X1 + 4, y(mn) + 4, N1(mn));
    c += '<path class="jgLinie" fill="none" stroke-width="2" d="' + L.map(function (d, i) { return (i ? "L" : "M") + f1(x(i)) + " " + f1(y(d.cumul)); }).join(" ") + '"></path>';
    // căderea cea mai mare: vârful și fundul, marcate (selectiv)
    var idx = {}; L.forEach(function (d, i) { idx[d.zi] = i; });
    if (rz.panaLa && idx[rz.panaLa] !== undefined) {
      var ip = idx[rz.panaLa];
      c += '<circle class="jgMarc jgNeg" cx="' + f1(x(ip)) + '" cy="' + f1(y(L[ip].cumul)) + '" r="4"><title>' + esc("Fundul celei mai mari căderi: " + data(rz.panaLa) + ", " + U(rz.caderMax) + " sub vârf" + (rz.dinStart ? " (de la început)" : " (vârful din " + data(rz.deLa) + ")")) + "</title></circle>";
      if (rz.deLa && idx[rz.deLa] !== undefined) c += '<circle class="jgMarc jgPoz" cx="' + f1(x(idx[rz.deLa])) + '" cy="' + f1(y(L[idx[rz.deLa]].cumul)) + '" r="4"><title>' + esc("Vârful dinaintea căderii: " + data(rz.deLa) + ", cumulat " + U(L[idx[rz.deLa]].cumul)) + "</title></circle>";
    }
    var ult = L[n - 1];
    c += txt(X0, A0 - 4, "Cumulat, pe zile: " + U(ult.cumul));
    // panoul de jos: cât ești sub vârf
    c += txt(X0, B0 - 6, "Sub vârf" + (rz.zileSubVarfAcum ? " · acum de " + cate(rz.zileSubVarfAcum, "zi", "zile") : ""));
    c += '<path class="jgArie" d="M' + f1(x(0)) + " " + f1(ys(0)) + " " + L.map(function (d, i) { return "L" + f1(x(i)) + " " + f1(ys(d.sub)); }).join(" ") + " L" + f1(x(n - 1)) + " " + f1(ys(0)) + ' Z"></path>';
    c += linie(X0, ys(0), X1, ys(0), "jgGrid") + txt(X1 + 4, ys(0) + 4, "0");
    if (smn < 0) c += txt(X1 + 4, ys(smn) + 4, N1(smn));
    c += txt(X0, H - 4, data(L[0].zi)) + txt(X1, H - 4, data(ult.zi), { anc: "end" });
    // țintele de hover: o zi (sau o săptămână, peste 400 de zile) pe toată înălțimea
    var pas = n > 400 ? 7 : 1, lw = (X1 - X0) / Math.max(1, n - 1);
    for (var i = 0; i < n; i += pas) {
      var j = Math.min(n - 1, i + pas - 1), d = L[j], net = 0, nb = 0; for (var k = i; k <= j; k++) { net += L[k].net; nb += L[k].n; }
      var t = (pas > 1 ? data(L[i].zi) + "–" + data(d.zi) : data(d.zi)) + " · " + cate(nb, "bot închis", "boți închiși") + (nb ? " · " + U(net) : "") + " · cumulat " + U(d.cumul) + (d.sub < -0.05 ? " · sub vârf " + U(d.sub) : " · la vârf");
      c += rect(x(i) - lw / 2, A0, lw * (j - i + 1), B1 - A0, "jgHit", t, ' opacity="0"');
    }
    return svg(H, "Curba banilor pe zile: " + U(ult.cumul) + " după " + cate(rz.zile || n, "zi", "zile") + "; cea mai mare cădere " + U(rz.caderMax || 0), c);
  }

  // ---- 2. calendarul: săptămâni pe coloane × zile pe rânduri, culoare divergentă pe 5 trepte ----
  function calendar(pz, o) {
    lat(o);
    var L = lista(pz);
    if (!L.length) return "";
    var zs = function (z) { return (new Date(Date.UTC(+z.slice(0, 4), +z.slice(5, 7) - 1, +z.slice(8, 10))).getUTCDay() + 6) % 7; };
    var start = zs(L[0].zi), sapt = Math.ceil((start + L.length) / 7), ST = 22, SUS = 18;
    // revizia: istoria lungă pe telefon ⇒ celule mai mici (de la 2 px), nu zile tăiate
    var cel = Math.max(2, Math.min(20, (W - ST - 2) / sapt)), h = SUS + 7 * cel + 30;
    var abs = L.filter(function (d) { return d.n && Math.abs(d.net) >= 0.05; }).map(function (d) { return Math.abs(d.net); }).sort(function (a, b) { return a - b; });
    var med = abs.length ? abs[Math.floor(abs.length / 2)] : 0;
    var c = "", ultLunaCol = -9;
    [["L", 0], ["Mi", 2], ["V", 4]].forEach(function (r) { c += txt(0, SUS + r[1] * cel + cel * 0.75, r[0]); });
    L.forEach(function (d, i) {
      var p = start + i, col = Math.floor(p / 7), rand = p % 7, nivel = 0;
      if (d.n && Math.abs(d.net) >= 0.05) nivel = (d.net > 0 ? 1 : -1) * (Math.abs(d.net) > med ? 2 : 1);
      var cls = "jgC" + nivel + (d.n ? "" : " jgCgol");
      c += rect(ST + col * cel + 1, SUS + rand * cel + 1, cel - 2, cel - 2, cls, data(d.zi) + (d.n ? " · " + cate(d.n, "bot închis", "boți închiși") + " · " + U(d.net) : " · niciun bot închis") + " · cumulat " + U(d.cumul), ' rx="1.5"');
      if (d.zi.slice(8, 10) <= "07" && rand === 0 || i === 0) {
        if (col - ultLunaCol >= 3) { c += txt(ST + col * cel + 1, SUS - 5, LUNI[+d.zi.slice(5, 7) - 1]); ultLunaCol = col; }
      }
    });
    // legenda: pierdere ← → câștig (pragul dintre trepte = mediana zilelor)
    var ly = SUS + 7 * cel + 12, lx = ST;
    c += txt(lx, ly + 9, "pierdere");
    [-2, -1, 0, 1, 2].forEach(function (v, i) { c += rect(lx + 52 + i * 14, ly, 12, 12, "jgC" + v, v === 0 ? "fără boți sau ≈ 0" : (v < 0 ? "pierdere " : "câștig ") + (Math.abs(v) === 2 ? "peste " : "până la ") + N1(med) + " USDT pe zi", ' rx="1.5"'); });
    c += txt(lx + 52 + 5 * 14 + 4, ly + 9, "câștig") + txt(W - 2, ly + 9, "pragul: " + N1(med) + " USDT/zi", { anc: "end" });
    var plus = L.filter(function (d) { return d.n && d.net > 0; }).length, cu = L.filter(function (d) { return d.n; }).length;
    return svg(h, "Calendarul zilelor: " + plus + " din " + cate(cu, "zi", "zile") + " cu boți închiși au fost pe plus", c, "jgCal");
  }

  // ---- 3. bare orizontale pentru găleți (net pe bot, cu IC95 pe zile când există) ----
  // randuri: [{et, n, zile, netPeBot, ic, putine, ...}]; o: { val (cheia, implicit netPeBot), unitate, aria, titlu(r) }
  function bare(randuri, o) {
    o = o || {}; lat(o);
    var R = Array.isArray(randuri) ? randuri.filter(Boolean) : [];
    if (!R.length) return "";
    var cheie = o.val || "netPeBot", un = o.unitate || "USDT", LBL = Math.round(Math.min(260, Math.max(150, W * 0.36))), VAL = 92, X0 = LBL + 6, X1 = W - VAL, RH = 24, BH = 22, SUS = 6;   // 24 px pe rând (bara 22 + 2 gol)
    // valoarea: r[o.val] (implicit netPeBot) sau, dacă lipsește, r.v - pagina trimite [{et, v, n, zile}]
    var vDe = function (r) { return ok(r[cheie]) ? r[cheie] : ok(r.v) ? r.v : null; };
    var v = R.map(function (r) { var q = vDe(r); return q === null ? 0 : q; }), ext = v.slice();
    R.forEach(function (r) { if (r.ic && ok(r.ic[0]) && ok(r.ic[1]) && !r.putine) ext.push(r.ic[0], r.ic[1]); });
    var mn = Math.min(0, Math.min.apply(null, ext)), mx = Math.max(0, Math.max.apply(null, ext));
    if (!(mx > mn)) { mx = 1; mn = -1; }
    var x = function (q) { return X0 + (q - mn) / (mx - mn) * (X1 - X0); }, x0 = x(0), H = SUS + R.length * RH + 16;
    var c = linie(x0, SUS - 2, x0, SUS + R.length * RH, "jgGrid");
    // v100.360: dacă o etichetă nu încape, toate trec pe forma scurtă (nu unele cu „(n boți, z zile)” și altele fără); cifrele rămân în tooltip
    var lung = function (r) { return String(r.et) + " (" + (ok(r.n) ? cate(r.n, "bot", "boți") : "—") + (ok(r.zile) ? ", " + cate(r.zile, "zi", "zile") : "") + ")"; };
    var scurt = R.some(function (r) { return lung(r).length * 6.9 > LBL - 4; });
    R.forEach(function (r, i) {
      var y = SUS + i * RH, val = vDe(r), cls = r.putine || val === null ? "jgNeutru" : val >= 0 ? "jgPoz" : "jgNeg";
      var et = String(r.et) + " (" + (ok(r.n) ? cate(r.n, "bot", "boți") : "—") + (ok(r.zile) ? ", " + cate(r.zile, "zi", "zile") : "") + ")";
      var t = o.titlu ? o.titlu(r) : String(r.et) + ": " + (val === null ? "—" : U(val) + " pe bot") + " · " + cate(r.n || 0, "bot", "boți") + (ok(r.zile) ? " în " + cate(r.zile, "zi", "zile") : "") + (ok(r.pePlus) ? " · " + PC(r.pePlus) + " pe plus" : "") + (r.ic && !r.putine ? " · IC95 pe zile " + N1(r.ic[0]) + "…" + N1(r.ic[1]) : "") + (r.putine ? " · puține date" : "");
      c += txt(LBL, y + BH * 0.72, scurt ? String(r.et) : et, { anc: "end" });   // v100.358 (poza la 1440): eticheta lungă era tăiată la stânga
      if (val !== null) c += rect(Math.min(x(val), x0), y, Math.max(1, Math.abs(x(val) - x0)), BH, "jgBara " + cls, t, ' rx="2"');
      else c += rect(X0, y, X1 - X0, BH, "jgHit", t, ' opacity="0"');
      if (r.ic && ok(r.ic[0]) && ok(r.ic[1]) && !r.putine) c += '<g class="jgIc"><title>' + esc(t) + "</title>" + linie(x(r.ic[0]), y + BH / 2, x(r.ic[1]), y + BH / 2, "jgAx jgIc") + linie(x(r.ic[0]), y + 4, x(r.ic[0]), y + BH - 4, "jgAx jgIc") + linie(x(r.ic[1]), y + 4, x(r.ic[1]), y + BH - 4, "jgAx jgIc") + "</g>";
      c += txt(W - 2, y + BH * 0.72, r.putine ? "puține date" : val === null ? "—" : S1(val), { anc: "end", cls: "jgAx" });
    });
    c += txt(X0, H - 3, N1(mn)) + txt(X1, H - 3, N1(mx), { anc: "end" }) + txt(W - 2, H - 3, un + " pe bot", { anc: "end" });
    return svg(H, o.aria || "Net pe bot pe grupe", c);
  }

  // ---- 4. Pareto pierderilor: ponderea cumulată din pierderea totală după cei mai răi k boți ----
  function pareto(p, o) {
    lat(o);
    if (!p || !p.nPierderi || !Array.isArray(p.puncte) || p.puncte.length < 2) return "";
    var ST = 34, DR = 8, X0 = ST, X1 = W - DR, A0 = 10, A1 = 200, H = 226, n = p.nPierderi;
    var x = function (k) { return X0 + k / n * (X1 - X0); }, y = function (f) { return A1 - f * (A1 - A0); };
    var c = "";
    [0.25, 0.5, 0.75, 1].forEach(function (f) { c += linie(X0, y(f), X1, y(f), "jgGrid") + txt(X0 - 4, y(f) + 4, PC(f).replace(",0%", "%"), { anc: "end" }); });
    c += linie(X0, y(0), X1, y(0), "jgAx");
    c += '<path class="jgLinie" fill="none" stroke-width="2" d="' + p.puncte.map(function (q, i) { return (i ? "L" : "M") + f1(x(q.k)) + " " + f1(y(q.pondere)); }).join(" ") + '"></path>';
    var by = {}; p.puncte.forEach(function (q) { by[q.k] = q; });
    (p.praguri || []).forEach(function (pr, i) {
      var q = by[pr.kEfectiv]; if (!q) return;
      c += '<circle class="jgMarc jgNeg" cx="' + f1(x(q.k)) + '" cy="' + f1(y(q.pondere)) + '" r="4"><title>' + esc("Cei mai răi " + pr.kEfectiv + ": " + U(pr.suma) + " = " + PC(pr.dinPierderi) + " din toate pierderile; fără ei netul ar fi " + U(pr.netFara)) + "</title></circle>";
      c += txt(X1, A1 - 52 + i * 14, "cei mai răi " + pr.kEfectiv + ": " + PC(pr.dinPierderi) + " din pierderi", { anc: "end" });
    });
    c += txt(X0, H - 4, "1") + txt(X1, H - 4, cate(n, "bot pe minus", "boți pe minus"), { anc: "end" });
    return svg(H, "Pareto pierderilor: " + (p.praguri && p.praguri[1] ? "cei mai răi " + cate(p.praguri[1].kEfectiv, "bot", "boți") + " fac " + PC(p.praguri[1].dinPierderi) + " din pierderea totală de " + U(p.totalPierderi) : U(p.totalPierderi) + " pierdere totală"), c);
  }

  // ---- 5. pe lună: grilele în sus, poziția și costurile (de obicei) în jos, netul ca punct + linie ----
  function stivuitLuna(luni, o) {
    lat(o);
    var L = Array.isArray(luni) ? luni.filter(function (m) { return m && ok(m.net); }) : [];
    if (!L.length) return "";
    var ST = 6, DR = 58, X0 = ST, X1 = W - DR, A0 = 28, A1 = 236, H = 256, SER = [["grile", "jgPoz jgGrile", "grile"], ["pozitie", "jgNeg jgPozitie", "poziție"], ["costuri", "jgNeutru jgCosturi", "costuri"]];
    var sus = [], jos = [];
    L.forEach(function (m) { var s = 0, j = 0; SER.forEach(function (sr) { var v = ok(m[sr[0]]) ? m[sr[0]] : 0; if (v > 0) s += v; else j += v; }); sus.push(s); jos.push(j); });
    var mx = Math.max(0, Math.max.apply(null, sus.concat(L.map(function (m) { return m.net; })))), mn = Math.min(0, Math.min.apply(null, jos.concat(L.map(function (m) { return m.net; })))), y = scala(mn, mx, A0, A1);
    var slot = (X1 - X0) / L.length, bw = Math.max(2, Math.min(40, slot - 2)), c = "";
    // legenda (3 serii + netul), sus
    var lx = X0; SER.forEach(function (sr) { c += rect(lx, 6, 10, 10, sr[1], null, ' rx="1.5"') + txt(lx + 14, 15, sr[2]); lx += 14 + sr[2].length * 6.5 + 12; });
    c += '<circle class="jgLinie" cx="' + f1(lx + 5) + '" cy="11" r="3.5"></circle>' + txt(lx + 14, 15, "net");
    c += linie(X0, y(0), X1, y(0), "jgGrid") + txt(X1 + 4, y(0) + 4, "0");
    if (Math.abs(y(mx) - y(0)) >= 14) c += txt(X1 + 4, y(mx) + 4, N1(mx));
    if (Math.abs(y(mn) - y(0)) >= 14) c += txt(X1 + 4, y(mn) + 4, N1(mn));
    var pts = [];
    L.forEach(function (m, i) {
      var cx = X0 + i * slot + (slot - bw) / 2, ps = 0, ng = 0, nm = m.nume || m.luna;
      SER.forEach(function (sr) {
        var v = ok(m[sr[0]]) ? m[sr[0]] : 0; if (Math.abs(v) < 1e-9) return;
        var a = v > 0 ? ps : ng, b = a + v; if (v > 0) ps = b; else ng = b;
        var top = Math.min(y(a), y(b)), hh = Math.abs(y(a) - y(b));
        // 2px gol între segmentele lipite: segmentul de deasupra (sau de dedesubt) se oprește la 2px de cel de lângă zero
        var gS = Math.abs(a) > 1e-9 ? 2 : 0;
        if (v > 0) c += rect(cx, top, bw, Math.max(0.5, hh - gS), sr[1], nm + " · " + sr[2] + " " + U(v) + " (" + cate(m.n || 0, "bot", "boți") + ")");
        else c += rect(cx, top + gS, bw, Math.max(0.5, hh - gS), sr[1], nm + " · " + sr[2] + " " + U(v) + " (" + cate(m.n || 0, "bot", "boți") + ")");
      });
      pts.push([cx + bw / 2, y(m.net), nm + " · net " + U(m.net) + " (grile " + U(m.grile) + ", poziție " + U(m.pozitie) + ", costuri " + U(m.costuri) + ")"]);
      var pasEt = Math.max(1, Math.ceil(44 / Math.max(1, slot)));   // v100.358 (poza la 412): o etichetă la câte luni încape, fără să se calce
      if (i % pasEt === 0) c += txt(cx + bw / 2, H - 4, nm, { anc: "middle" });
    });
    c += '<path class="jgLinie" fill="none" stroke-width="2" d="' + pts.map(function (p, i) { return (i ? "L" : "M") + f1(p[0]) + " " + f1(p[1]); }).join(" ") + '"></path>';
    pts.forEach(function (p) { c += '<circle class="jgLinie jgMarc" cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="4"><title>' + esc(p[2]) + "</title></circle>"; });
    var tot = 0; L.forEach(function (m) { tot += m.net; });
    return svg(H, "Pe lună: grilele, poziția și costurile; net pe " + cate(L.length, "lună", "luni") + " " + U(tot), c);
  }

  return { curbaZile: curbaZile, calendar: calendar, bare: bare, pareto: pareto, stivuitLuna: stivuitLuna };
})();
if (typeof globalThis !== "undefined") globalThis.JurnalGrafice = JurnalGrafice;
