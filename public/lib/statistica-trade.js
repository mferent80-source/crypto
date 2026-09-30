// Statistica trade-urilor (v100.22, 30.09, el: „în pagina istoric trade-uri vreau o statistică a trade-ului pe Pionex și pe
// Trade 212: ce am făcut bine, ce am greșit, cât am pierdut sau câștigat per trade, per total… cu rapoarte, tabele” ->
// „Sus pe fiecare filă”). Modul pur (fara DOM, fara retea), probat in scripts/proba-v10022.mjs. Acelasi calcul pentru botii
// Pionex (USDT) si trade-urile Trading 212 (lei):
//   trade comun: { id, eticheta, pornit, inchis, rezultat, baza (investit / cost), durataOre, comisioane?, dir?, levier?, greseli? }
// Regula de trader: sub 10 trade-uri nu se trag concluzii (bine / gresit goale, cu avertisment). Lipsa ramane lipsa, nu 0.
var StatisticaTrade = (function () {
  "use strict";
  var MIN = 10, TZ = "Europe/Bucharest";
  var DISTRIBUTIE = [-Infinity, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, Infinity];

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function suma(l, f) { var s = 0; for (var i = 0; i < l.length; i++) s += f(l[i]); return s; }
  function bani(v, m) { return v === null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v).toLocaleString("ro-RO", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2, minimumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 }) + " " + m; }
  function pr(v, z) { return v === null || !isFinite(v) ? "—" : (v * 100).toFixed(z == null ? 0 : z).replace(".", ",") + "%"; }
  var fmtLuna = null;
  try { fmtLuna = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }); } catch (e) { fmtLuna = null; }
  function luna(t) { if (!fmtLuna) return new Date(t).toISOString().slice(0, 7); var p = {}; fmtLuna.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; }); return p.year + "-" + p.month; }
  var LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
  function numeLuna(k) { var m = /^(\d{4})-(\d{2})$/.exec(k); return m ? LUNI[+m[2] - 1] + " " + m[1].slice(2) : k; }
  function data(t) { try { return new Date(t).toLocaleDateString("ro-RO", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit" }); } catch (e) { return new Date(t).toISOString().slice(0, 10); } }

  // grupa: n, pe plus, total, medie (+ cel mai bun / cel mai prost)
  function grupa(l) {
    var t = suma(l, function (x) { return x.rezultat; }), p = l.filter(function (x) { return x.rezultat > 0; }).length;
    var bun = null, prost = null;
    l.forEach(function (x) { if (!bun || x.rezultat > bun.rezultat) bun = x; if (!prost || x.rezultat < prost.rezultat) prost = x; });
    return { n: l.length, pePlus: p, rata: l.length ? p / l.length : null, total: t, medie: l.length ? t / l.length : null, bun: bun, prost: prost };
  }
  function grupeaza(l, cheie) {
    var m = {};
    l.forEach(function (x) { var k = cheie(x); if (k === null || k === undefined) return; (m[k] = m[k] || []).push(x); });
    return Object.keys(m).map(function (k) { var g = grupa(m[k]); g.cheie = k; return g; });
  }

  function calc(lista, o) {
    o = o || {};
    var M = o.moneda || "", l = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && nr(x.rezultat) !== null && nr(x.inchis) !== null; })
      .map(function (x) { return Object.assign({}, x, { rezultat: nr(x.rezultat), inchis: nr(x.inchis), pornit: nr(x.pornit), baza: nr(x.baza), durataOre: nr(x.durataOre), comisioane: nr(x.comisioane) }); })
      .sort(function (a, b) { return a.inchis - b.inchis; });
    var castig = l.filter(function (x) { return x.rezultat > 0; }), pierd = l.filter(function (x) { return x.rezultat < 0; });
    var sc = suma(castig, function (x) { return x.rezultat; }), sp = suma(pierd, function (x) { return x.rezultat; });
    var s = { moneda: M, n: l.length, pePlus: castig.length, peMinus: pierd.length, rataCastig: l.length ? castig.length / l.length : null,
      total: suma(l, function (x) { return x.rezultat; }), castigBrut: sc, pierdereBruta: sp,
      castigMediu: castig.length ? sc / castig.length : null, pierdereMedie: pierd.length ? sp / pierd.length : null,
      factorProfit: sp < 0 ? sc / -sp : null, asteptare: l.length ? suma(l, function (x) { return x.rezultat; }) / l.length : null,
      comisioane: l.some(function (x) { return x.comisioane !== null; }) ? suma(l, function (x) { return x.comisioane || 0; }) : null,
      celMaiMare: null, ceaMaiMare: null, curba: [], drawdown: { max: 0, dela: null, panaLa: null, dinStart: false }, serii: { castiguri: 0, pierderi: 0 },
      perLuna: [], perEticheta: [], perDurata: [], perDir: [], perLevier: [], distributie: [], top5Pierderi: { lista: [], pondere: null },
      bine: [], gresit: [], suficient: l.length >= MIN, avertisment: "" };
    s.raport = s.castigMediu !== null && s.pierdereMedie !== null ? s.castigMediu / -s.pierdereMedie : null;
    l.forEach(function (x) { if (!s.celMaiMare || x.rezultat > s.celMaiMare.rezultat) s.celMaiMare = x; if (!s.ceaMaiMare || x.rezultat < s.ceaMaiMare.rezultat) s.ceaMaiMare = x; });
    // curba banilor + cea mai mare cadere (varf -> fund, pe ordinea inchiderilor) + seriile
    // v100.23 (revizie): varful de pornire e 0-ul de la inceput (dinStart), nu o data lipsa - altfel pagina scria „01.01.70”
    var cum = 0, varf = 0, varfLa = null, varfStart = true, sw = 0, sl = 0;
    l.forEach(function (x) {
      cum += x.rezultat; s.curba.push({ t: x.inchis, cumul: cum, rezultat: x.rezultat, eticheta: x.eticheta });
      if (cum > varf) { varf = cum; varfLa = x.inchis; varfStart = false; }
      if (varf - cum > s.drawdown.max) { s.drawdown.max = varf - cum; s.drawdown.dela = varfLa; s.drawdown.dinStart = varfStart; s.drawdown.panaLa = x.inchis; }
      if (x.rezultat > 0) { sw++; sl = 0; } else if (x.rezultat < 0) { sl++; sw = 0; } else { sw = 0; sl = 0; }
      if (sw > s.serii.castiguri) s.serii.castiguri = sw; if (sl > s.serii.pierderi) s.serii.pierderi = sl;
    });
    s.perLuna = grupeaza(l, function (x) { return luna(x.inchis); }).map(function (g) { g.luna = g.cheie; g.nume = numeLuna(g.cheie); return g; }).sort(function (a, b) { return a.luna < b.luna ? -1 : 1; });
    s.perEticheta = grupeaza(l, function (x) { return x.eticheta; }).map(function (g) { g.eticheta = g.cheie; return g; }).sort(function (a, b) { return b.total - a.total; });
    var dur = o.durate || [["sub o oră", 0, 1], ["1–6 ore", 1, 6], ["6–24 ore", 6, 24], ["1–3 zile", 24, 72], ["peste 3 zile", 72, Infinity]];
    s.perDurata = dur.map(function (d) { var g = grupa(l.filter(function (x) { return x.durataOre !== null && x.durataOre >= d[1] && x.durataOre < d[2]; })); g.et = d[0]; return g; });
    if (l.length && l.every(function (x) { return x.dir; })) s.perDir = grupeaza(l, function (x) { return x.dir || null; }).map(function (g) { g.dir = g.cheie; return g; }).sort(function (a, b) { return b.total - a.total; });
    if (l.length && l.every(function (x) { return nr(x.levier) !== null; })) s.perLevier = grupeaza(l, function (x) { return nr(x.levier) !== null ? nr(x.levier) + "×" : null; }).map(function (g) { g.levier = g.cheie; return g; }).sort(function (a, b) { return parseFloat(a.levier) - parseFloat(b.levier); });
    s.faraBaza = l.filter(function (x) { return !(x.baza > 0); }).length;
    for (var i = 0; i + 1 < DISTRIBUTIE.length; i++) {
      var de = DISTRIBUTIE[i], pana = DISTRIBUTIE[i + 1];
      var gl = l.filter(function (x) { if (!(x.baza > 0)) return false; var r = x.rezultat / x.baza; return r >= de && r < pana; });
      s.distributie.push({ de: de, pana: pana, n: gl.length, total: suma(gl, function (x) { return x.rezultat; }) });
    }
    var top = pierd.slice().sort(function (a, b) { return a.rezultat - b.rezultat; }).slice(0, 5);
    s.top5Pierderi = { lista: top, pondere: sp < 0 ? suma(top, function (x) { return x.rezultat; }) / sp : null };
    concluzii(s, M);
    return s;
  }

  // Ce ai facut bine / ce ai gresit - din cifre, fiecare cu suma lui; doar de la 10 trade-uri, iar grupele sub 5 trade-uri nu conteaza
  function concluzii(s, M) {
    if (!s.suficient) { s.avertisment = "Ai doar " + s.n + " trade-uri: prea puține ca să spun ce faci bine sau rău (îmi trebuie cel puțin " + MIN + "). Cifrele de mai jos spun doar ce s-a întâmplat."; return; }
    var B = s.bine, G = s.gresit, mari = function (l) { return l.filter(function (g) { return g.n >= 5; }); };
    if (s.total > 0) B.push({ text: "Pe total ești pe plus: " + bani(s.total, M) + " din " + s.n + " trade-uri" + (s.factorProfit !== null ? " — fiecare 1 " + M + " pierdut a adus " + s.factorProfit.toFixed(2).replace(".", ",") + " câștigat" : "") + ".", suma: s.total });
    else G.push({ text: "Pe total ești pe minus: " + bani(s.total, M) + " din " + s.n + " trade-uri.", suma: s.total });
    if (s.rataCastig >= 0.5) B.push({ text: "Câștigi la " + pr(s.rataCastig) + " din trade-uri (" + s.pePlus + " din " + s.n + ").", suma: s.castigBrut });
    if (s.raport !== null && s.raport < 1) G.push({ text: "Pierderea medie (" + bani(s.pierdereMedie, M) + ") e mai mare decât câștigul mediu (" + bani(s.castigMediu, M) + "): o pierdere mănâncă " + (1 / s.raport).toFixed(1).replace(".", ",") + " câștiguri. Stopul mai aproape sau ieșirea mai devreme de pe minus schimbă asta.", suma: s.pierdereBruta });
    else if (s.raport !== null) B.push({ text: "Câștigul mediu (" + bani(s.castigMediu, M) + ") e mai mare decât pierderea medie (" + bani(s.pierdereMedie, M) + ").", suma: s.castigBrut });
    var et = mari(s.perEticheta), buni = et.filter(function (g) { return g.total > 0 && g.rata >= 0.5; }).slice(0, 3);
    if (buni.length) B.push({ text: "Unde câștigi constant: " + buni.map(function (g) { return g.eticheta + " (" + bani(g.total, M) + " din " + g.n + ", " + pr(g.rata) + " pe plus)"; }).join(", ") + ".", suma: buni[0].total });
    var raiToate = s.perEticheta.filter(function (g) { return g.total < 0; }).slice(-3).reverse();
    if (raiToate.length) G.push({ text: "Unde ai pierdut cel mai mult: " + raiToate.map(function (g) { return g.eticheta + " (" + bani(g.total, M) + " din " + g.n + ")"; }).join(", ") + ".", suma: raiToate.reduce(function (a, g) { return a + g.total; }, 0) });
    if (s.top5Pierderi.pondere !== null && s.peMinus >= 10 && s.top5Pierderi.pondere >= Math.max(0.3, 2 * 5 / s.peMinus)) G.push({ text: "Cele mai mari 5 pierderi fac " + pr(s.top5Pierderi.pondere) + " din tot ce ai pierdut: " + s.top5Pierderi.lista.map(function (x) { return x.eticheta + " " + bani(x.rezultat, M); }).join(", ") + ". Câteva trade-uri lăsate să curgă strică tot restul.", suma: suma(s.top5Pierderi.lista, function (x) { return x.rezultat; }) });
    if (s.drawdown.max > 0) G.push({ text: "Cea mai mare cădere a contului: " + bani(-s.drawdown.max, M) + " (de la " + (s.drawdown.dinStart ? "început" : "vârful din " + data(s.drawdown.dela)) + " până la fundul din " + data(s.drawdown.panaLa) + ").", suma: -s.drawdown.max });
    var luni = s.perLuna, lPlus = luni.filter(function (g) { return g.total > 0; }).length;
    if (luni.length >= 2) {
      var lb = luni.slice().sort(function (a, b) { return b.total - a.total; }), celMaiBun = lb[0], celMaiProst = lb[lb.length - 1];
      if (celMaiBun.total > 0) B.push({ text: lPlus + " din " + luni.length + " luni pe plus; cea mai bună: " + celMaiBun.nume + " (" + bani(celMaiBun.total, M) + ").", suma: celMaiBun.total });
      if (celMaiProst.total < 0) G.push({ text: "Cea mai proastă lună: " + celMaiProst.nume + " (" + bani(celMaiProst.total, M) + " din " + celMaiProst.n + " trade-uri).", suma: celMaiProst.total });
    }
    var d = mari(s.perDurata).slice().sort(function (a, b) { return b.total - a.total; });
    if (d.length && d[0].total > 0) B.push({ text: "Trade-urile ținute " + d[0].et + " aduc cel mai mult: " + bani(d[0].total, M) + " din " + d[0].n + ".", suma: d[0].total });
    if (d.length && d[d.length - 1].total < 0) G.push({ text: "Trade-urile ținute " + d[d.length - 1].et + " pierd: " + bani(d[d.length - 1].total, M) + " din " + d[d.length - 1].n + ".", suma: d[d.length - 1].total });
    if (s.comisioane !== null && s.castigBrut > 0 && s.comisioane / s.castigBrut >= 0.1) G.push({ text: "Comisioanele au luat " + pr(s.comisioane / s.castigBrut) + " din câștiguri (" + bani(-s.comisioane, M) + ").", suma: -s.comisioane });
    if (s.serii.pierderi >= 5) G.push({ text: "Cea mai lungă serie de pierderi: " + s.serii.pierderi + " la rând. După 3 la rând, o pauză te scapă de trade-urile de răzbunare.", suma: null });
  }

  // ---- graficele: SVG pur, culorile vin din CSS (clasele st*); fiecare punct / bara are <title> (atingere / hover) ----
  var LAT = 720, INA = 220, SUS = 14, JOS = 26, ST = 8, DR = 64;
  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function scala(min, max) { if (min === max) { min -= 1; max += 1; } var y = function (v) { return SUS + (max - v) / (max - min) * (INA - SUS - JOS); }; return y; }
  function svgCurba(curba, o) {
    if (!Array.isArray(curba) || !curba.length) return "";
    var M = (o && o.moneda) || "", v = curba.map(function (x) { return x.cumul; }), mn = Math.min(0, Math.min.apply(null, v)), mx = Math.max(0, Math.max.apply(null, v)), y = scala(mn, mx);
    var x = function (i) { return ST + (curba.length === 1 ? 0.5 : i / (curba.length - 1)) * (LAT - ST - DR); };
    var d = curba.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.cumul).toFixed(1); }).join(" ");
    var pct = curba.map(function (p, i) { return '<circle class="stPunct" cx="' + x(i).toFixed(1) + '" cy="' + y(p.cumul).toFixed(1) + '" r="5"><title>' + esc(data(p.t) + " · " + (p.eticheta || "") + " " + bani(p.rezultat, M) + " · cumulat " + bani(p.cumul, M)) + "</title></circle>"; }).join("");
    var ult = curba[curba.length - 1];
    return '<svg class="stSvg" viewBox="0 0 ' + LAT + " " + INA + '" role="img" aria-label="' + esc("Curba banilor: " + bani(ult.cumul, M) + " după " + curba.length + " trade-uri") + '">'
      + '<line class="stZero" x1="' + ST + '" x2="' + (LAT - DR) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"></line>'
      + '<text class="stAx" x="' + (LAT - DR + 6) + '" y="' + (y(0) + 4).toFixed(1) + '">0</text>'
      + (Math.abs(y(mx) - y(0)) >= 14 ? '<text class="stAx" x="' + (LAT - DR + 6) + '" y="' + (y(mx) + 4).toFixed(1) + '">' + esc(bani(mx, "").trim()) + '</text>' : "")
      + (mn < 0 && Math.abs(y(mn) - y(0)) >= 14 ? '<text class="stAx" x="' + (LAT - DR + 6) + '" y="' + (y(mn) + 4).toFixed(1) + '">' + esc(bani(mn, "").trim()) + "</text>" : "")
      + '<path class="stCurba" d="' + d + '"></path>' + pct
      + '<text class="stAx" x="' + ST + '" y="' + (INA - 6) + '">' + esc(data(curba[0].t)) + '</text><text class="stAx" text-anchor="end" x="' + (LAT - DR) + '" y="' + (INA - 6) + '">' + esc(data(ult.t)) + "</text></svg>";
  }
  function bare(l, et, val, titlu, aria) {
    if (!l.length) return "";
    var v = l.map(val), mn = Math.min(0, Math.min.apply(null, v)), mx = Math.max(0, Math.max.apply(null, v)), y = scala(mn, mx), y0 = y(0);
    var w = (LAT - ST - DR) / l.length, bw = Math.max(4, w - 2);
    var h = l.map(function (g, i) {
      var val0 = val(g), top = Math.min(y(val0), y0), hh = Math.max(1, Math.abs(y(val0) - y0)), cx = ST + i * w + (w - bw) / 2;
      return '<rect class="stBara ' + (val0 >= 0 ? "stPlus" : "stMinus") + '" x="' + cx.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="' + Math.min(4, bw / 2).toFixed(1) + '"><title>' + esc(titlu(g)) + "</title></rect>"
        + (l.length <= 16 ? '<text class="stAx" text-anchor="middle" x="' + (cx + bw / 2).toFixed(1) + '" y="' + (INA - 6) + '">' + esc(et(g)) + "</text>" : "");
    }).join("");
    return '<svg class="stSvg" viewBox="0 0 ' + LAT + " " + INA + '" role="img" aria-label="' + esc(aria) + '">' + '<line class="stZero" x1="' + ST + '" x2="' + (LAT - DR) + '" y1="' + y0.toFixed(1) + '" y2="' + y0.toFixed(1) + '"></line>' + h
      + (Math.abs(y(mx) - y0) >= 14 ? '<text class="stAx" x="' + (LAT - DR + 6) + '" y="' + (y(mx) + 4).toFixed(1) + '">' + esc(bani(mx, "").trim()) + '</text>' : "") + (mn < 0 && Math.abs(y(mn) - y0) >= 14 ? '<text class="stAx" x="' + (LAT - DR + 6) + '" y="' + (y(mn) + 4).toFixed(1) + '">' + esc(bani(mn, "").trim()) + "</text>" : "") + "</svg>";
  }
  function svgLuni(perLuna, o) {
    var M = (o && o.moneda) || "";
    return bare(perLuna || [], function (g) { return g.nume || g.luna; }, function (g) { return g.total; }, function (g) { return (g.nume || g.luna) + ": " + bani(g.total, M) + " din " + g.n + " trade-uri, " + pr(g.rata) + " pe plus"; }, "Rezultatul pe lună");
  }
  function etInterval(g) { var f = function (v) { return (v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(0) + "%"; }; return g.de === -Infinity ? "sub " + f(g.pana) : g.pana === Infinity ? "peste " + f(g.de) : f(g.de) + "…" + f(g.pana); }
  function svgDistributie(dist) {
    return bare(dist || [], etInterval, function (g) { return g.de < 0 ? -g.n : g.n; }, function (g) { return etInterval(g) + " din bani: " + g.n + " trade-uri"; }, "Câte trade-uri au ieșit în fiecare interval de câștig sau pierdere");
  }

  // ---- tot blocul statisticii, ca HTML (acelasi in pagina si in demo). o: { moneda, titlu, piata, ordine ("noi"|"pierderi"|"castiguri"),
  //      actiuneOrdine (numele functiei din pagina, chemata cu piata si ordinea), actiuneCsv, nota } ----
  function tabel(cap, randuri) { return '<div class="stTabelWrap"><table class="stTabel"><thead><tr>' + cap.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" + randuri.join("") + "</tbody></table></div>"; }
  function cls(v) { return v === null || v === undefined || !isFinite(v) ? "" : v > 0 ? "good" : v < 0 ? "bad" : ""; }
  function randGrupa(nume, g, M) { return "<tr><td>" + esc(nume) + "</td><td>" + g.n + "</td><td>" + (g.n ? pr(g.rata) : "—") + '</td><td class="' + cls(g.total) + '"><b>' + esc(bani(g.total, M)) + '</b></td><td class="' + cls(g.medie) + '">' + esc(bani(g.medie, M)) + "</td></tr>"; }
  function html(s, o) {
    o = o || {};
    var M = s.moneda || o.moneda || "", piata = o.piata || "", ord = o.ordine || "noi";
    if (!s.n) return '<div class="stStat"><p class="stSub">' + esc(o.titlu || "Statistica") + ": niciun trade închis încă.</p></div>";
    var tile = function (et, v, c, sub) { return '<div class="stTile"><span class="stEt">' + esc(et) + '</span><b class="stVal ' + (c || "") + '">' + esc(v) + "</b>" + (sub ? '<span class="stSub">' + esc(sub) + "</span>" : "") + "</div>"; };
    var h = '<div class="stStat"><div class="stCap"><h3>📊 ' + esc(o.titlu || "Statistica") + '</h3><span class="stSub">' + s.n + " trade-uri închise · " + esc(data(s.curba[0].t)) + " – " + esc(data(s.curba[s.curba.length - 1].t)) + (o.nota ? " · " + esc(o.nota) : "") + "</span></div>";
    h += '<div class="stTiles">'
      + tile("Rezultat total", bani(s.total, M), cls(s.total), s.pePlus + " pe plus, " + s.peMinus + " pe minus" + (s.comisioane !== null ? " · după comisioane" : ""))
      + tile("Pe trade, în medie", bani(s.asteptare, M), cls(s.asteptare), "cât aduce un trade oarecare")
      + tile("Rata de câștig", pr(s.rataCastig), "", s.pePlus + " din " + s.n)
      + tile("Câștig mediu / pierdere medie", bani(s.castigMediu, M) + " / " + bani(s.pierdereMedie, M), "", s.raport !== null ? "raport " + s.raport.toFixed(2).replace(".", ",") + (s.raport < 1 ? " — pierderile sunt mai mari" : "") : "")
      + tile("Factor de profit", s.factorProfit !== null ? s.factorProfit.toFixed(2).replace(".", ",") : "—", s.factorProfit === null ? "" : s.factorProfit >= 1 ? "good" : "bad", "câștiguri ÷ pierderi (peste 1 = pe plus)")
      + tile("Cea mai mare cădere", bani(-s.drawdown.max, M), s.drawdown.max > 0 ? "bad" : "", s.drawdown.max > 0 ? (s.drawdown.dinStart ? "de la început" : data(s.drawdown.dela)) + " → " + data(s.drawdown.panaLa) : "fără cădere")
      + tile("Cel mai bun / cel mai prost trade", bani(s.celMaiMare && s.celMaiMare.rezultat, M) + " / " + bani(s.ceaMaiMare && s.ceaMaiMare.rezultat, M), "", (s.celMaiMare ? s.celMaiMare.eticheta : "") + " / " + (s.ceaMaiMare ? s.ceaMaiMare.eticheta : ""))
      + tile("Cea mai lungă serie", s.serii.castiguri + (s.serii.castiguri === 1 ? " câștig / " : " câștiguri / ") + s.serii.pierderi + (s.serii.pierderi === 1 ? " pierdere" : " pierderi"), "", "la rând")
      + (s.comisioane !== null ? tile("Comisioane plătite", bani(-s.comisioane, M), "bad", s.castigBrut > 0 ? pr(s.comisioane / s.castigBrut) + " din câștiguri" : "") : "")
      + "</div>";
    if (!s.suficient) h += '<p class="stAvert">' + esc(s.avertisment) + "</p>";
    else h += '<div class="stDoua"><div class="stBloc stBine"><h4>✅ Ce ai făcut bine</h4>' + (s.bine.length ? "<ul>" + s.bine.map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ul>" : '<p class="stSub">Nimic ieșit în evidență pe plus.</p>')
      + '</div><div class="stBloc stGresit"><h4>⚠️ Ce ai greșit</h4>' + (s.gresit.length ? "<ul>" + s.gresit.map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ul>" : '<p class="stSub">Nimic ieșit în evidență pe minus.</p>') + "</div></div>";
    h += '<div class="stBloc"><div class="stBlocCap"><h4>Curba banilor</h4><span class="stSub">rezultatul adunat, trade după trade' + (s.drawdown.max > 0 ? " · cea mai mare cădere " + esc(bani(-s.drawdown.max, M)) : "") + "</span></div>" + svgCurba(s.curba, { moneda: M }) + "</div>";
    h += '<div class="stDoua"><div class="stBloc"><div class="stBlocCap"><h4>Pe lună</h4><span class="stSub">după ora României</span></div>' + svgLuni(s.perLuna, { moneda: M })
      + tabel(["Luna", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], s.perLuna.slice().reverse().map(function (g) { return randGrupa(g.nume, g, M); })) + "</div>"
      + '<div class="stBloc"><div class="stBlocCap"><h4>Cât câștigi sau pierzi pe un trade</h4><span class="stSub">cât la sută din suma pusă' + (s.faraBaza ? " · " + s.faraBaza + " fără suma pusă, lăsate deoparte" : "") + '</span></div>' + svgDistributie(s.distributie)
      + tabel(["Rezultat pe trade", "Trade-uri", "Împreună"], s.distributie.map(function (g) { return "<tr><td>" + esc(etInterval(g)) + "</td><td>" + g.n + '</td><td class="' + cls(g.total) + '">' + esc(bani(g.total, M)) + "</td></tr>"; })) + "</div></div>";
    var et = s.perEticheta, buni = et.filter(function (g) { return g.total > 0; }).slice(0, 10), rai = et.filter(function (g) { return g.total < 0; }).slice(-10).reverse();
    h += '<div class="stDoua"><div class="stBloc"><div class="stBlocCap"><h4>Unde câștigi</h4><span class="stSub">cele mai bune ' + buni.length + " din " + et.length + "</span></div>" + (buni.length ? tabel(["", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], buni.map(function (g) { return randGrupa(g.eticheta, g, M); })) : '<p class="stSub">Nicio monedă pe plus pe total.</p>') + "</div>"
      + '<div class="stBloc"><div class="stBlocCap"><h4>Unde pierzi</h4><span class="stSub">cele mai proaste ' + rai.length + "</span></div>" + (rai.length ? tabel(["", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], rai.map(function (g) { return randGrupa(g.eticheta, g, M); })) : '<p class="stSub">Nicio pierdere pe total.</p>') + "</div></div>";
    // v100.23 (revizie): „Cele mai mari 5 pierderi” mereu, langa „Cât ai ținut”; directia si levierul pe randul lor, cand exista
    var top5 = '<div class="stBloc"><div class="stBlocCap"><h4>Cele mai mari 5 pierderi</h4><span class="stSub">' + (s.top5Pierderi.pondere !== null ? pr(s.top5Pierderi.pondere) + " din tot ce ai pierdut" : "") + "</span></div>" + (s.top5Pierderi.lista.length ? tabel(["", "Închis", "Rezultat"], s.top5Pierderi.lista.map(function (x) { return "<tr><td>" + esc(x.eticheta) + "</td><td>" + esc(data(x.inchis)) + '</td><td class="bad"><b>' + esc(bani(x.rezultat, M)) + "</b></td></tr>"; })) : '<p class="stSub">Nicio pierdere.</p>') + "</div>";
    h += '<div class="stDoua"><div class="stBloc"><div class="stBlocCap"><h4>Cât ai ținut</h4></div>' + tabel(["Ținut", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], s.perDurata.map(function (g) { return randGrupa(g.et, g, M); })) + "</div>" + top5 + "</div>";
    if (s.perDir.length || s.perLevier.length) h += '<div class="stDoua"><div class="stBloc"><div class="stBlocCap"><h4>Pe direcție și pe levier</h4></div>' + (s.perDir.length ? tabel(["Direcție", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], s.perDir.map(function (g) { return randGrupa(g.dir, g, M); })) : "") + (s.perLevier.length ? tabel(["Levier", "Trade-uri", "Pe plus", "Rezultat", "Pe trade"], s.perLevier.map(function (g) { return randGrupa(g.levier, g, M); })) : "") + "</div></div>";
    var toate = s.curba.map(function (p, i) { return { i: i, t: p.t, eticheta: p.eticheta, rezultat: p.rezultat }; });
    toate.sort(ord === "pierderi" ? function (a, b) { return a.rezultat - b.rezultat; } : ord === "castiguri" ? function (a, b) { return b.rezultat - a.rezultat; } : function (a, b) { return b.t - a.t; });
    var MAX = 200, btn = function (k, et2) { return '<button type="button" class="stBtn" aria-pressed="' + (ord === k) + '"' + (o.actiuneOrdine ? ' data-action-click="' + o.actiuneOrdine + "(\'" + piata + "\',\'" + k + "\')\"" : "") + ">" + et2 + "</button>"; };
    h += '<details class="stBloc stToate"' + (o.deschis ? " open" : "") + '><summary><b>Toate trade-urile</b> <span class="stSub">' + s.n + " · tabelul întreg e în CSV</span></summary>"
      + '<div class="stUnelte"><div class="stGrup" role="group" aria-label="Ordinea">' + btn("noi", "Cele mai noi") + btn("pierderi", "Cele mai mari pierderi") + btn("castiguri", "Cele mai mari câștiguri") + "</div>"
      + (o.actiuneCsv ? '<button type="button" class="stBtn" data-action-click="' + o.actiuneCsv + "(\'" + piata + "\')\">⬇ Descarcă raportul (CSV)</button>" : "") + "</div>"
      + tabel(["Închis", "", "Rezultat", "Adunat până atunci"], toate.slice(0, MAX).map(function (x) { return "<tr><td>" + esc(data(x.t)) + "</td><td>" + esc(x.eticheta) + '</td><td class="' + cls(x.rezultat) + '"><b>' + esc(bani(x.rezultat, M)) + "</b></td><td>" + esc(bani(s.curba[x.i].cumul, M)) + "</td></tr>"; }))
      + (s.n > MAX ? '<p class="stSub">Primele ' + MAX + " din " + s.n + "; toate sunt în CSV.</p>" : "") + "</details></div>";
    return h;
  }

  // ---- CSV: un rand pe trade (separator ;, zecimale cu virgula) ----
  function csv(lista, moneda) {
    // v100.23 (revizie): Excel pe setari romanesti citeste ; ca separator si VIRGULA ca zecimala („12.5” devenea 12 mai); orele sunt UTC
    var q = function (v) { v = v === null || v === undefined ? "" : String(v); return /[;"\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var n = function (v, z) { v = nr(v); return v === null ? "" : String(z == null ? v : Number(v.toFixed(z))).replace(".", ","); };
    var z = function (t) { return t ? new Date(t).toISOString().replace("T", " ").slice(0, 16) : ""; };
    var r = ["inchis_utc;eticheta;pornit_utc;tinut_ore;baza_" + moneda + ";rezultat_" + moneda + ";randament;comisioane_" + moneda + ";directie;levier"];
    (Array.isArray(lista) ? lista : []).slice().sort(function (a, b) { return (a.inchis || 0) - (b.inchis || 0); }).forEach(function (x) {
      var b = nr(x.baza), rz = nr(x.rezultat);
      r.push([z(x.inchis), q(x.eticheta), z(x.pornit), n(x.durataOre, 1), n(b), n(rz), b > 0 && rz !== null ? n(rz / b, 4) : "", n(x.comisioane), q(x.dir || ""), n(x.levier)].join(";"));
    });
    return r.join("\n") + "\n";
  }

  // ---- formele din pagina -> trade comun ----
  function dinPionex(l) {
    return (Array.isArray(l) ? l : []).map(function (t) {
      // NET: rezultatul realizat al Pionex e INAINTE de comisioane si funding (LIGHTER: −58,52 realizat, −59,04 net) - aici dupa ele
      var net = nr(t.rezultat) !== null ? nr(t.rezultat) + (nr(t.comisioane) || 0) + (nr(t.funding) || 0) : null;
      return { id: t.id, eticheta: t.moneda, pornit: t.pornit, inchis: t.inchis, rezultat: net, baza: t.investit, durataOre: t.durataOre,
        comisioane: nr(t.comisioane) !== null ? Math.abs(nr(t.comisioane)) : null, dir: t.dir || null, levier: nr(t.levier), greseli: (t.greseli || []).map(function (g) { return g.cod; }) };
    });
  }
  function dinT212(l) {
    return (Array.isArray(l) ? l : []).map(function (t) {
      return { id: t.id, eticheta: t.simbol || t.ticker, pornit: t.pornit, inchis: t.inchis, rezultat: t.rezultat, baza: t.cost, durataOre: t.durataOre, comisioane: nr(t.comisioane) };
    });
  }

  return { calc: calc, html: html, svgCurba: svgCurba, svgLuni: svgLuni, svgDistributie: svgDistributie, csv: csv, dinPionex: dinPionex, dinT212: dinT212, bani: bani, procent: pr, etInterval: etInterval, MIN: MIN };
})();
if (typeof globalThis !== "undefined") globalThis.StatisticaTrade = StatisticaTrade;
