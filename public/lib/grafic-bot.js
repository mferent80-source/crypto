// Graficul Tabloului botului (v100) - modul PUR, fara DOM: intoarce SVG-ul ca text si o "harta" pentru cursor.
// Probat in scripts/proba-v100.mjs. Dupa demo-ul aprobat de el pe 28.09 (linkul e in memorie, nu aici: garda CSP citeste adresele din cod).
//   - lumanari + volum; banda gridului si treptele lui (fine)
//   - liniile care conteaza, cu eticheta in dreapta: planul (+/−), zero-ul botului, intrarea medie, gridul, stopul, lichidarea;
//     ce e in afara cadrului apare ca sageata la margine, cu distanta fata de pretul de acum
//   - alertele DOAR ale botului, pe o banda sub grafic, stranse intr-un punct „N” cand sunt apropiate (culoarea celei mai grave)
//   - Bollinger 20, 2 · EMA 20 si 50 · RSI 14 (panou separat) · profilul de volum - fiecare pornit/oprit de el
//   - v100.51 (pachetul 4): ziua obisnuita a monedei (P50/P75 pe 24 h din profil, de la pretul de acum), zona de valoare pe 7 zile + pivotii
//     confirmati (comutatoare „zi” si „val”) si stopul planului langa stopul tau (linia Consilierului, mereu)
// Paleta liniilor (EMA 20 #1fa99c, EMA 50 #d9772f, Bollinger #8b74f0) a trecut validatorul dataviz pe fundalul #0d1722.
var GraficBot = (function () {
  "use strict";
  var COL = { good: "#55d89b", bad: "#ff6b78", warn: "#f5c451", accent: "#4fd1c5", text: "#e9eef6", mut: "#6d7d93", info: "#8a9ab0",
    ema20: "#1fa99c", ema50: "#d9772f", bb: "#8b74f0", fond: "#0a1520", grila: "#16263a", intrare: "#c9d4e3" };
  var RANG = { critic: 2, atentie: 1, info: 0 };

  function nr(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v !== "string" || !v.trim()) return null; var x = Number(v); return isFinite(x) ? x : null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // sub 1: cel putin 4 zecimale si cel putin 4 cifre semnificative (0.5663, 0.001234, 0.00001234) - revizia v100: la monedele ieftine iesea "0.0000"
  function fmtP(v) { if (v == null || !isFinite(v)) return "—"; if (v >= 100) return v.toFixed(2); if (v >= 1) return v.toFixed(4); if (v <= 0) return v.toFixed(4); return v.toFixed(Math.min(10, Math.max(4, 3 - Math.floor(Math.log10(v))))); }
  function pct(v) { return v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%"; }
  // v100.56: bare zilnice (actiuni) - pe axa doar ziua.luna
  function ziLuna(t) { var d = new Date(t); return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0"); }
  function ora(t, lung) { var d = new Date(t), h = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); return lung ? d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0") + " " + h : h; }

  // randurile Pionex ({time, open, high, low, close, volume} ca texte, sau [t,o,h,l,c,v]) -> crescator dupa timp
  function bare(randuri) {
    var out = [];
    (Array.isArray(randuri) ? randuri : []).forEach(function (r) {
      var a = Array.isArray(r), t = nr(a ? r[0] : r && r.time), o = nr(a ? r[1] : r && r.open), h = nr(a ? r[2] : r && r.high), l = nr(a ? r[3] : r && r.low), c = nr(a ? r[4] : r && r.close), v = nr(a ? r[5] : r && r.volume);
      if (t === null || !(o > 0) || !(h > 0) || !(l > 0) || !(c > 0)) return;
      out.push({ t: t, o: o, h: h, l: l, c: c, v: v !== null && v >= 0 ? v : 0 });
    });
    return out.sort(function (x, y) { return x.t - y.t; });
  }
  function ema(v, n) { var k = 2 / (n + 1), o = [], e = null; for (var i = 0; i < v.length; i++) { e = e === null ? v[i] : v[i] * k + e * (1 - k); o.push(i >= n - 1 ? e : null); } return o; }
  function bollinger(v, n, m) {
    var o = [];
    for (var i = 0; i < v.length; i++) {
      if (i < n - 1) { o.push(null); continue; }
      var s = 0, j; for (j = i - n + 1; j <= i; j++) s += v[j];
      var med = s / n, q = 0; for (j = i - n + 1; j <= i; j++) q += (v[j] - med) * (v[j] - med);
      var sd = Math.sqrt(q / n); o.push({ m: med, s: med + m * sd, j: med - m * sd });
    }
    return o;
  }
  // RSI Wilder
  function rsi(v, n) {
    var o = [null], g = 0, p = 0;
    for (var i = 1; i < v.length; i++) {
      var d = v[i] - v[i - 1], up = d > 0 ? d : 0, dn = d < 0 ? -d : 0;
      if (i <= n) { g += up; p += dn; if (i === n) { g /= n; p /= n; o.push(p === 0 ? 100 : 100 - 100 / (1 + g / p)); } else o.push(null); }
      else { g = (g * (n - 1) + up) / n; p = (p * (n - 1) + dn) / n; o.push(p === 0 ? 100 : 100 - 100 / (1 + g / p)); }
    }
    return o;
  }

  // liniile botului: {k, p, t (eticheta), c (culoare), st: fine|dash|solid|lich}
  // v100.51 (I-476): ziua obisnuita a monedei de la pretul de acum - cat coboara/urca in jumatate (P50) si in trei sferturi (P75) din zile,
  // din profilul monedei (21 de cuantile pe 24 h). Fara profil -> null (nu se deseneaza nimic inventat).
  function ziObisnuita(pret, p) {
    pret = nr(pret); var j = p && p.z24 && p.z24.jos, s = p && p.z24 && p.z24.sus;
    if (pret === null || !(pret > 0) || !Array.isArray(j) || j.length !== 21 || !Array.isArray(s) || s.length !== 21) return null;
    return { p50Jos: pret * (1 - j[10]), p75Jos: pret * (1 - j[15]), p50Sus: pret * (1 + s[10]), p75Sus: pret * (1 + s[15]),
      sursa: "ziua obișnuită a monedei: " + (nr(p.zile) !== null ? p.zile + " de zile" : "profilul") + " de bare de 1 h" };
  }
  // v100.56 (actiunile T212, pachetul 5): ziua obisnuita a ACTIUNII - 1 zi (z1) sau 5 zile de bursa (z5), din profilul ei (bare zilnice)
  function ziObisnuitaActiune(pret, p, zile) {
    pret = nr(pret); var z = p && (zile === 5 ? p.z5 : p.z1), j = z && z.jos, s = z && z.sus;
    if (pret === null || !(pret > 0) || !Array.isArray(j) || j.length !== 21 || !Array.isArray(s) || s.length !== 21) return null;
    return { p50Jos: pret * (1 - j[10]), p75Jos: pret * (1 - j[15]), p50Sus: pret * (1 + s[10]), p75Sus: pret * (1 + s[15]), et: zile === 5 ? "5 zile obișnuite" : "zi obișnuită",
      sursa: (zile === 5 ? "5 zile de bursă obișnuite" : "ziua obișnuită") + " a acțiunii: " + (nr(p.zile) !== null ? p.zile + " de zile de bursă" : "profilul") + " (bare zilnice)" };
  }
  // nivelurile pozitiei pe grafic: tinta, pretul tau mediu, stopul tau (doar daca l-ai scris)
  function niveluriActiune(o) {
    var l = [], ad = function (k, p, t, c, st, s) { p = nr(p); if (p !== null && p > 0) l.push({ k: k, p: p, t: t, c: c, st: st, s: s }); };
    ad("tinta", o && o.tinta, "ținta", COL.good, "dash", "țintă");
    ad("intrare", o && o.pretMediu, "prețul tău mediu", COL.intrare, "dash", "mediu");
    ad("stop", o && o.stop, "stopul tău", COL.bad, "solid", "stop");
    return l;
  }
  function niveluriBot(o) {
    var b = o && o.bot || {}, l = [], ad = function (k, p, t, c, st, s) { p = nr(p); if (p !== null && p > 0) l.push({ k: k, p: p, t: t, c: c, st: st, s: s }); };
    ad("gridSus", b.gridSus, "grid sus", COL.accent, "fine", "grid↑");
    if (o.planPlus && nr(o.planPlus.pret)) ad("planPlus", o.planPlus.pret, "plan +" + o.planPlus.usdt + " USDT", COL.good, "dash", "+" + o.planPlus.usdt);
    ad("zero", o.zero, "zero-ul botului", COL.warn, "dash", "zero");
    ad("intrare", b.pretDeschidere, "intrarea medie", COL.intrare, "dash", "intrare");
    if (o.planMinus && nr(o.planMinus.pret)) ad("planMinus", o.planMinus.pret, "plan −" + o.planMinus.usdt + " USDT", COL.bad, "dash", "−" + o.planMinus.usdt);
    ad("gridJos", b.gridJos, "grid jos", COL.accent, "fine", "grid↓");
    if (b.opritorPierdereActiv) ad("stop", b.opritorPierdere, "stopul tău", COL.bad, "solid", "stop");
    ad("lich", b.pretLichidare, "lichidare", COL.bad, "lich", "lich.");
    return l;
  }

  // v100.38 (30.09): PIONEX NUMARA LINIILE - „Număr de grile” / row = linii (jos si sus incluse), intervalele = row − 1 (dovedit pe ~2.000
  // de boti inchisi, loturile de la pornire, si pe botul CRV viu). Inainte se socotea pe row intervale - o linie in plus, toate decalate.
  function liniiPionex(jos, sus, linii, geo) {
    jos = nr(jos); sus = nr(sus); var N = Math.round(nr(linii) || 0) - 1, L = [];
    if (!(jos > 0) || !(sus > jos) || !(N >= 1)) return L;
    for (var k = 0; k <= N; k++) L.push(geo ? jos * Math.pow(sus / jos, k / N) : jos + k * (sus - jos) / N);
    return L;
  }
  // v100.38 (30.09, el: „fa idei”): umplerile gridului DEDUSE din lumanari, pe modelul Pionex - cartea de ordine de la pornire (deasupra
  // pretului vanzari, dedesubt cumparari; linia cea mai apropiata de pretul de pornire FARA ordin), fiecare lumanare pe drumul ei (verde: intai
  // jos apoi sus; rosie: invers). O cumparare umpluta pune vanzarea pe linia de deasupra, o vanzare pune cumpararea dedesubt. Perechea, ca la
  // Pionex: la long fiecare VANZARE (si a loturilor de la pornire), la short fiecare CUMPARARE; la neutru, umplerea care inchide una opusa.
  // E o reconstituire: Pionex are ultimul cuvant (numarul lui de perechi se arata alaturi, in legenda).
  function umpleri(barele, o) {
    o = o || {};
    var L = liniiPionex(o.jos, o.sus, o.linii, o.geo), p0 = nr(o.p0), t0 = nr(o.pornit) || 0, dir = String(o.dir || "").toLowerCase(), out = { umpleri: [], perechi: 0 };
    if (!L.length || !(p0 > 0)) return out;
    var N = L.length - 1, ki = 0, ord = [], k;
    for (k = 0; k <= N; k++) if (Math.abs(L[k] - p0) < Math.abs(L[ki] - p0)) ki = k;
    for (k = 0; k <= N; k++) ord.push(k === ki ? null : L[k] > p0 ? { tip: "S", din: "start" } : { tip: "B", din: "start" });
    var umple = function (k, t, ri) {
      var x = ord[k]; if (!x) return;
      var per = dir === "long" ? x.tip === "S" : dir === "short" ? x.tip === "B" : x.din === (x.tip === "S" ? "B" : "S");
      ord[k] = null; if (per) out.perechi++;
      out.umpleri.push({ t: t, ri: ri, k: k, p: L[k], tip: x.tip, pereche: per });
      if (x.tip === "B" && k + 1 <= N) ord[k + 1] = { tip: "S", din: "B" };
      if (x.tip === "S" && k - 1 >= 0) ord[k - 1] = { tip: "B", din: "S" };
    };
    var coboara = function (pana, t, ri) { for (var k = N; k >= 0; k--) if (ord[k] && ord[k].tip === "B" && L[k] >= pana) umple(k, t, ri); };
    var urca = function (pana, t, ri) { for (var k = 0; k <= N; k++) if (ord[k] && ord[k].tip === "S" && L[k] <= pana) umple(k, t, ri); };
    (Array.isArray(barele) ? barele : []).forEach(function (b, ri) {
      if (!b || b.t < t0) return;
      if (b.c >= b.o) { coboara(b.l, b.t, ri); urca(b.h, b.t, ri); } else { urca(b.h, b.t, ri); coboara(b.l, b.t, ri); }
    });
    return out;
  }

  // alertele apropiate (sub `prag` px) se strang intr-un punct; culoarea = cea mai grava
  function grupeaza(alerte, tx, prag) {
    var g = [];
    (Array.isArray(alerte) ? alerte : []).slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (a) {
      var x = tx(a.t), u = g[g.length - 1];
      if (u && x - u.x1 < prag) { u.l.push(a); u.x1 = x; } else g.push({ x0: x, x1: x, l: [a] });
    });
    g.forEach(function (u) { u.nivel = u.l.reduce(function (m, a) { return (RANG[a.nivel] || 0) > (RANG[m] || 0) ? a.nivel : m; }, "info"); u.x = (u.x0 + u.x1) / 2; });
    return g;
  }

  // o = { bare, W, ingust, st:{bb,ema,rsi,vp}, niv, grila:{jos,sus,n,geo}, alerte, per }
  function desen(o) {
    var raw = o.bare || [], st = o.st || {}, W = Math.max(300, o.W || 800), ingust = !!o.ingust;
    var gut = ingust ? 96 : 132, plotW = W - gut, mainH = ingust ? 230 : 320, volH = ingust ? 34 : 46, laneH = o.actiune ? 0 : 26, rsiH = st.rsi ? (ingust ? 62 : 78) : 0, axH = 20, gap = 8;
    var cl = raw.map(function (b) { return b.c; }), S = { e20: ema(cl, 20), e50: ema(cl, 50), bb: bollinger(cl, 20, 2), rsi: rsi(cl, 14) };
    // lumanarile se strang cand sunt prea dese (cel mult ~1 la 3 px)
    var f = Math.max(1, Math.ceil(raw.length * 3 / plotW)), B = [];
    for (var i = 0; i < raw.length; i += f) {
      var g = raw.slice(i, i + f), h = -Infinity, l = Infinity, v = 0;
      g.forEach(function (x) { if (x.h > h) h = x.h; if (x.l < l) l = x.l; v += x.v; });
      B.push({ t: g[0].t, o: g[0].o, h: h, l: l, c: g[g.length - 1].c, v: v, k: i + g.length - 1 });
    }
    var n = B.length, cw = plotW / n, viu = nr(o.pretViu) > 0 ? nr(o.pretViu) : null, pAcum = viu !== null ? viu : raw.length ? raw[raw.length - 1].c : null;
    var lo = Infinity, hi = -Infinity; B.forEach(function (b) { if (b.l < lo) lo = b.l; if (b.h > hi) hi = b.h; });
    if (viu !== null) { if (viu < lo) lo = viu; if (viu > hi) hi = viu; }
    var span = hi - lo || Math.abs(hi) * 0.01 || 1, niv = o.niv || [];
    niv.forEach(function (x) { if (x.p > hi && x.p - hi < span * 0.12) hi = x.p; if (x.p < lo && lo - x.p < span * 0.12) lo = x.p; });
    var pad = (hi - lo || span) * 0.06; lo -= pad; hi += pad;
    var Y = function (p) { return (1 - (p - lo) / (hi - lo)) * mainH; }, X = function (bi) { return bi * cw + cw / 2; };
    var q = [], H = mainH + gap + volH + gap + laneH + (rsiH ? gap + rsiH : 0) + axH, f1 = function (x) { return x.toFixed(1); };
    q.push('<rect x="0" y="0" width="' + f1(plotW) + '" height="' + mainH + '" fill="' + COL.fond + '"/>');
    for (var gi = 1; gi < 5; gi++) q.push('<line x1="0" x2="' + f1(plotW) + '" y1="' + f1(mainH * gi / 5) + '" y2="' + f1(mainH * gi / 5) + '" stroke="' + COL.grila + '" stroke-width="1"/>');
    // banda gridului + treptele
    // v100.38: treptele pe LINIILE Pionex (grila.linii = row); grila.n (intervale) ramane pentru chematorii vechi
    var gr = o.grila || {}, gj = nr(gr.jos), gs = nr(gr.sus), gl = nr(gr.linii) !== null ? nr(gr.linii) : nr(gr.n) !== null ? nr(gr.n) + 1 : null, gn = gl !== null ? gl - 1 : null;
    if (gj !== null && gs !== null && gs > gj) {
      var bj = Math.max(lo, gj), bs = Math.min(hi, gs);
      if (bs > bj) q.push('<rect class="gbBanda" x="0" y="' + f1(Y(bs)) + '" width="' + f1(plotW) + '" height="' + f1(Y(bj) - Y(bs)) + '" fill="rgba(79,209,197,.07)"/>');
      if (gn >= 1) for (var ni = 0; ni <= gn; ni += Math.max(1, Math.ceil(gn / 40))) {
        var L = gr.geo ? gj * Math.pow(gs / gj, ni / gn) : gj + ni * (gs - gj) / gn;
        if (L > lo && L < hi) q.push('<line class="gbTreapta" x1="0" x2="' + f1(plotW) + '" y1="' + f1(Y(L)) + '" y2="' + f1(Y(L)) + '" stroke="rgba(79,209,197,.20)" stroke-width="1"/>');
      }
    }
    // v100.51 (I-470): zona de valoare pe 7 zile (70% din volum) + POC + pivotii confirmati (liniute scurte in dreapta)
    var va = st.val && o.val && o.val.zona ? o.val.zona : null;
    if (va && nr(va.vah) !== null && nr(va.val) !== null) {
      var vs = Math.min(hi, va.vah), vj = Math.max(lo, va.val);
      if (vs > vj) q.push('<rect class="gbVa" x="0" y="' + f1(Y(vs)) + '" width="' + f1(plotW) + '" height="' + f1(Y(vj) - Y(vs)) + '" fill="rgba(105,167,255,.06)" stroke="rgba(105,167,255,.30)" stroke-dasharray="2 4"/>');
      if (va.poc > lo && va.poc < hi) q.push('<line class="gbPoc" x1="0" x2="' + f1(plotW) + '" y1="' + f1(Y(va.poc)) + '" y2="' + f1(Y(va.poc)) + '" stroke="#9fc3ff" stroke-opacity=".55" stroke-width="1" stroke-dasharray="3 3"/>'
        + '<text x="6" y="' + f1(Y(va.poc) - 3) + '" font-size="10" fill="#9fc3ff" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">POC ' + esc(o.val.et || "7 z") + ' ' + fmtP(va.poc) + '</text>');
    }
    if (st.val && o.val && Array.isArray(o.val.pivoti)) o.val.pivoti.forEach(function (pv) {
      if (!(pv && pv.p > lo && pv.p < hi)) return;
      var y = Y(pv.p), x0 = plotW * 0.9;
      q.push('<g class="gbPivot"><title>' + esc((pv.tip === "sus" ? "rezistență (vârf confirmat) " : "suport (adânc confirmat) ") + fmtP(pv.p) + (pv.atingeri > 1 ? " · atins de " + pv.atingeri + " ori" : "")) + '</title><line x1="' + f1(x0) + '" x2="' + f1(plotW) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" stroke="' + (pv.tip === "sus" ? COL.bad : COL.good) + '" stroke-opacity=".75" stroke-width="' + (pv.atingeri > 1 ? 2.4 : 1.4) + '"/></g>');
    });
    // v100.51 (I-476): ziua obisnuita, peste ultimele lumanari (lumanarile umplu toata latimea; o banda doar la dreapta nu s-ar vedea)
    if (st.zi && o.zi) {
      var zx = plotW * (1 - (ingust ? 0.25 : 0.18)), zw = plotW - zx;
      // poza 01.10: doua benzi pline acopereau tot sfertul din dreapta - doar jumatatea din zile e plina; trei sferturi = doua linii punctate
      var a5 = Math.min(hi, nr(o.zi.p50Sus)), c5 = Math.max(lo, nr(o.zi.p50Jos));
      if (a5 > c5) q.push('<rect class="gbZi" x="' + f1(zx) + '" y="' + f1(Y(a5)) + '" width="' + f1(zw) + '" height="' + f1(Y(c5) - Y(a5)) + '" fill="rgba(245,196,81,.09)" stroke="rgba(245,196,81,.35)" stroke-width="1"/>');
      ["p75Sus", "p75Jos"].forEach(function (k) { var v = nr(o.zi[k]); if (v !== null && v > lo && v < hi) q.push('<line class="gbZi" x1="' + f1(zx) + '" x2="' + f1(plotW) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '" stroke="' + COL.warn + '" stroke-opacity=".6" stroke-dasharray="4 3"/>'); });
      if (a5 > c5) q.push('<text class="gbZi" x="' + f1(zx + 4) + '" y="' + f1(Math.max(11, Y(a5) - 4)) + '" font-size="10" fill="' + COL.warn + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">' + esc(o.zi.et || "zi obișnuită") + '</text>');
    }
    // v100.56: 5 zile obisnuite (actiuni) - doar liniile P50 (plin) si P75 (punctat), alta nuanta decat ziua
    if (st.zi5 && o.zi5) {
      var zx5 = plotW * (1 - (ingust ? 0.25 : 0.18));
      [["p50Sus", ""], ["p50Jos", ""], ["p75Sus", "2 3"], ["p75Jos", "2 3"]].forEach(function (k) { var v = nr(o.zi5[k[0]]); if (v !== null && v > lo && v < hi) q.push('<line class="gbZi5" x1="' + f1(zx5) + '" x2="' + f1(plotW) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '" stroke="' + COL.info + '" stroke-opacity=".7"' + (k[1] ? ' stroke-dasharray="' + k[1] + '"' : '') + '/>'); });
      var s5 = nr(o.zi5.p50Sus); if (s5 !== null && s5 > lo && s5 < hi) q.push('<text class="gbZi5" x="' + f1(zx5 + 4) + '" y="' + f1(Math.max(11, Y(s5) - 4)) + '" font-size="10" fill="' + COL.info + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">5 zile</text>');
    }
    // profilul de volum
    if (st.vp) {
      var NB = 28, bins = []; for (var z = 0; z < NB; z++) bins.push(0);
      raw.forEach(function (x) { var tp = (x.h + x.l + x.c) / 3, bi = Math.floor((tp - lo) / (hi - lo) * NB); if (bi >= 0 && bi < NB) bins[bi] += x.v; });
      var mx = Math.max.apply(null, bins) || 1, poc = bins.indexOf(mx), vw = plotW * (ingust ? 0.26 : 0.2), bh = mainH / NB;
      bins.forEach(function (v, bi) { if (!v) return; var w = v / mx * vw, y = mainH - (bi + 1) * bh; q.push('<rect class="gbVp" x="' + f1(plotW - w) + '" y="' + f1(y + 1) + '" width="' + f1(w) + '" height="' + f1(Math.max(1, bh - 2)) + '" fill="' + (bi === poc ? "rgba(105,167,255,.42)" : "rgba(144,160,182,.16)") + '"/>'); });
      q.push('<text x="' + f1(plotW - 4) + '" y="' + f1(mainH - (poc + 1) * bh - 3) + '" text-anchor="end" font-size="10.5" fill="#9fc3ff" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">cel mai tranzacționat ' + fmtP(lo + (poc + 0.5) / NB * (hi - lo)) + '</text>');
    }
    function linie(vals, cls, cul, gros, dash) {
      var d = "", pen = false;
      B.forEach(function (b, bi) { var v = vals[b.k]; if (v == null || v < lo || v > hi) { pen = false; return; } d += (pen ? "L" : "M") + f1(X(bi)) + "," + f1(Y(v)); pen = true; });
      return d ? '<path class="' + cls + '" d="' + d + '" fill="none" stroke="' + cul + '" stroke-width="' + gros + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linejoin="round"/>' : "";
    }
    if (st.bb) {
      var sus = [], jos = [];
      B.forEach(function (b, bi) { var x = S.bb[b.k]; if (!x) return; sus.push(f1(X(bi)) + "," + f1(Y(Math.min(hi, x.s)))); jos.unshift(f1(X(bi)) + "," + f1(Y(Math.max(lo, x.j)))); });
      if (sus.length) q.push('<polygon class="gbBb" points="' + sus.concat(jos).join(" ") + '" fill="rgba(139,116,240,.08)"/>');
      q.push(linie(S.bb.map(function (x) { return x && x.s; }), "gbBb", COL.bb, 1.2), linie(S.bb.map(function (x) { return x && x.j; }), "gbBb", COL.bb, 1.2), linie(S.bb.map(function (x) { return x && x.m; }), "gbBb", COL.bb, 1, "3 3"));
    }
    // lumanarile
    var bw = Math.max(1, Math.min(9, cw * 0.62));
    B.forEach(function (b, bi) {
      var c = b.c >= b.o ? COL.good : COL.bad, x = X(bi), y1 = Y(Math.max(b.o, b.c)), y2 = Y(Math.min(b.o, b.c));
      q.push('<g class="gbC"><line x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + f1(Y(b.h)) + '" y2="' + f1(Y(b.l)) + '" stroke="' + c + '" stroke-width="1"/><rect x="' + f1(x - bw / 2) + '" y="' + f1(y1) + '" width="' + f1(bw) + '" height="' + f1(Math.max(1, y2 - y1)) + '" fill="' + c + '"/></g>');
    });
    if (st.ema) q.push(linie(S.e20, "gbEma20", COL.ema20, 2), linie(S.e50, "gbEma50", COL.ema50, 2));
    // v100.38: umplerile gridului (▲ cumparare / ▼ vanzare; inel = pereche inchisa), la lumanarea lor
    var U = o.umpleri && Array.isArray(o.umpleri.umpleri) ? o.umpleri.umpleri : [];
    U.forEach(function (u) {
      if (!(u.p >= lo && u.p <= hi)) return;
      var bi = 0; while (bi < n - 1 && B[bi].k < u.ri) bi++;
      var x = X(bi), y = Y(u.p), cum = u.tip === "B", cul = cum ? COL.accent : COL.warn;
      var tri = cum ? f1(x - 4.5) + "," + f1(y + 10) + " " + f1(x + 4.5) + "," + f1(y + 10) + " " + f1(x) + "," + f1(y + 2) : f1(x - 4.5) + "," + f1(y - 10) + " " + f1(x + 4.5) + "," + f1(y - 10) + " " + f1(x) + "," + f1(y - 2);
      q.push('<g class="gbUmplere' + (u.pereche ? " gbPereche" : "") + '"><title>' + esc((cum ? "cumpărare la " : "vânzare la ") + fmtP(u.p) + " · " + ora(u.t, true) + (u.pereche ? " · pereche închisă" : "")) + '</title>'
        + '<polygon points="' + tri + '" fill="' + cul + '" stroke="' + COL.fond + '" stroke-width="1"/>' + (u.pereche ? '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="6" fill="none" stroke="' + COL.text + '" stroke-width="1.4"/>' : "") + "</g>");
    });
    // liniile + etichetele din dreapta (se imping ca sa nu se suprapuna); ce e in afara cadrului -> sageata la margine
    var et = [], afara = [];
    niv.forEach(function (x) {
      if (x.p >= lo && x.p <= hi) {
        var y = Y(x.p);
        if (x.st !== "fine") q.push('<line class="gbNiv" x1="0" x2="' + f1(plotW) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" stroke="' + x.c + '" stroke-width="' + (x.st === "lich" ? 2 : 1.3) + '"' + (x.st === "dash" ? ' stroke-dasharray="6 4"' : x.st === "lich" ? ' stroke-dasharray="2 3"' : '') + '/>');
        et.push({ y: y, t: x.t, s: x.s, p: x.p, c: x.c });
      } else afara.push(x);
    });
    // v100.51 (I-476): stopul planului (Consilierul) langa stopul tau - mereu, nu e indicator; aproape identice -> o singura eticheta
    var cl = o.consLinii || {}, spP = nr(cl.stopPlan), spA = nr(cl.stopAcum), etP = cl.et || "stopul planului";   // v100.56: la actiuni „stopul propus”
    if (spP !== null && spP > 0) {
      if (spA !== null && Math.abs(spP - spA) / spA < 0.0005) et.forEach(function (e) { if (e.t === "stopul tău") { e.t = cl.et ? "stopul tău = " + cl.et : "stopul tău = al planului"; e.s = cl.et ? "stop=propus" : "stop=plan"; } });
      else if (spP >= lo && spP <= hi) { q.push('<line class="gbStopPlan" x1="0" x2="' + f1(plotW) + '" y1="' + f1(Y(spP)) + '" y2="' + f1(Y(spP)) + '" stroke="' + COL.bad + '" stroke-width="1.3" stroke-dasharray="2 4"/>'); et.push({ y: Y(spP), t: etP, s: "stop plan", p: spP, c: COL.bad }); }
      else { q.push('<g class="gbStopPlan"></g>'); afara.push({ p: spP, t: etP, c: COL.bad }); }
    }
    // v100.7: pretul LIVE (Pionex) - linie punctata de la ultima lumanare pana la eticheta „acum”
    if (viu !== null) q.push('<line class="gbViu" x1="' + f1(X(n - 1)) + '" x2="' + f1(plotW) + '" y1="' + f1(Y(viu)) + '" y2="' + f1(Y(viu)) + '" stroke="' + COL.text + '" stroke-width="1.2" stroke-dasharray="3 3"/>');
    if (pAcum !== null) et.push({ y: Y(pAcum), t: "acum", p: pAcum, c: COL.text, acum: true });
    et.sort(function (a, b) { return a.y - b.y; });
    var minD = ingust ? 14 : 16; for (var ei = 1; ei < et.length; ei++) if (et[ei].y - et[ei - 1].y < minD) et[ei].y = et[ei - 1].y + minD;
    var peste = et.length ? et[et.length - 1].y - (mainH - 6) : 0; if (peste > 0) et.forEach(function (e) { e.y -= peste; });
    et.forEach(function (e) {
      if (e.acum) q.push('<rect x="' + f1(plotW + 2) + '" y="' + f1(e.y - 9) + '" width="' + (gut - 4) + '" height="18" rx="4" fill="' + COL.text + '"/><text x="' + f1(plotW + 8) + '" y="' + f1(e.y + 4) + '" font-size="11.5" font-weight="700" fill="#071018">' + (ingust ? "" : "acum ") + fmtP(e.p) + '</text>');
      else q.push('<text x="' + f1(plotW + 6) + '" y="' + f1(e.y + 4) + '" font-size="11" fill="' + e.c + '">' + esc(ingust ? (e.s || "") : e.t) + " " + fmtP(e.p) + '</text>');
    });
    var ys = 14, yj = mainH - 8;
    afara.forEach(function (x) {
      var inSus = x.p > hi, t = (inSus ? "↑ " : "↓ ") + x.t + " " + fmtP(x.p) + (pAcum ? " (" + pct(x.p / pAcum - 1) + ")" : "");
      q.push('<text x="8" y="' + (inSus ? ys : yj) + '" font-size="11" fill="' + x.c + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="3">' + esc(t) + '</text>');
      if (inSus) ys += 14; else yj -= 14;
    });
    // volumul
    var vy0 = mainH + gap, vmx = Math.max.apply(null, B.map(function (b) { return b.v; })) || 1;
    q.push('<text x="' + f1(plotW + 6) + '" y="' + (vy0 + 12) + '" font-size="10.5" fill="' + COL.mut + '">volum</text>');
    B.forEach(function (b, bi) { var hh = b.v / vmx * (volH - 2); q.push('<rect class="gbV" x="' + f1(X(bi) - bw / 2) + '" y="' + f1(vy0 + volH - hh) + '" width="' + f1(bw) + '" height="' + f1(Math.max(0.5, hh)) + '" fill="' + (b.c >= b.o ? "rgba(85,216,155,.35)" : "rgba(255,107,120,.35)") + '"/>'); });
    // banda de alerte - doar ale botului (le filtreaza chematorul), stranse cand sunt apropiate
    var ly0 = vy0 + volH + gap, t0 = B.length ? B[0].t : 0, pas = raw.length > 1 ? raw[1].t - raw[0].t : 0, t1 = raw.length ? raw[raw.length - 1].t + pas : 1;
    var TX = function (t) { return (t - t0) / ((t1 - t0) || 1) * plotW; };
    if (!o.actiune) {   // v100.56: actiunile n-au banda alertelor botului
      q.push('<rect x="0" y="' + ly0 + '" width="' + f1(plotW) + '" height="' + laneH + '" rx="6" fill="' + COL.fond + '"/>');
      q.push('<text x="' + f1(plotW + 6) + '" y="' + (ly0 + 16) + '" font-size="10.5" fill="' + COL.mut + '">alertele botului</text>');
    }
    var evs = (o.alerte || []).filter(function (a) { return a && nr(a.t) !== null && a.t >= t0 && a.t <= t1; }), gr2 = grupeaza(evs, TX, 16), CUL = { critic: COL.bad, atentie: COL.warn, info: COL.info };
    gr2.forEach(function (u, ui) {
      var r = u.l.length > 1 ? 8 : 5;
      q.push('<g class="gbE" data-g="' + ui + '" tabindex="0"><circle cx="' + f1(u.x) + '" cy="' + (ly0 + laneH / 2) + '" r="' + r + '" fill="' + (CUL[u.nivel] || COL.info) + '" stroke="' + COL.fond + '" stroke-width="2"/>' + (u.l.length > 1 ? '<text x="' + f1(u.x) + '" y="' + (ly0 + laneH / 2 + 3.5) + '" text-anchor="middle" font-size="9.5" font-weight="800" fill="#071018">' + u.l.length + '</text>' : '') + '</g>');
    });
    // RSI
    var ry0 = ly0 + laneH + gap;
    if (st.rsi) {
      var RY = function (v) { return ry0 + (1 - v / 100) * rsiH; };
      q.push('<rect x="0" y="' + ry0 + '" width="' + f1(plotW) + '" height="' + rsiH + '" fill="' + COL.fond + '"/><rect x="0" y="' + f1(RY(70)) + '" width="' + f1(plotW) + '" height="' + f1(RY(30) - RY(70)) + '" fill="rgba(139,116,240,.06)"/>');
      [70, 30].forEach(function (v) { q.push('<line x1="0" x2="' + f1(plotW) + '" y1="' + f1(RY(v)) + '" y2="' + f1(RY(v)) + '" stroke="#2a3a50" stroke-dasharray="3 3"/><text x="' + f1(plotW + 6) + '" y="' + f1(RY(v) + 4) + '" font-size="10.5" fill="' + COL.mut + '">' + v + '</text>'); });
      var d = "", pen = false; B.forEach(function (b, bi) { var v = S.rsi[b.k]; if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + f1(X(bi)) + "," + f1(RY(v)); pen = true; });
      q.push('<path class="gbRsi" d="' + d + '" fill="none" stroke="' + COL.intrare + '" stroke-width="1.4"/>');
      var rl = S.rsi[raw.length - 1]; q.push('<text x="' + f1(plotW + 6) + '" y="' + (ry0 + 12) + '" font-size="10.5" fill="' + COL.intrare + '">RSI ' + (rl != null ? Math.round(rl) : "—") + '</text>');
    }
    // axa timpului
    var ay = (rsiH ? ry0 + rsiH : ly0 + laneH) + 16, lung = o.per && o.per !== "24h";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (fr, ii) { if (ingust && (ii === 1 || ii === 3)) return; q.push('<text x="' + f1(fr * plotW) + '" y="' + ay + '" font-size="10.5" fill="' + COL.mut + '" text-anchor="' + (fr === 0 ? "start" : fr === 1 ? "end" : "middle") + '">' + (o.actiune ? ziLuna(t0 + fr * (t1 - t0)) : ora(t0 + fr * (t1 - t0), lung)) + '</text>'); });
    q.push('<line class="gbCruce" x1="0" x2="0" y1="0" y2="' + (ry0 + (rsiH || 0)) + '" stroke="' + COL.text + '" stroke-opacity=".35" stroke-width="1" style="display:none"/>');
    var svg = '<svg class="gbSvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + (o.actiune ? "Prețul acțiunii (zilnic) cu stopul, ținta și zona de valoare" : "Prețul cu gridul, planul și alertele botului") + '">' + q.join("") + '</svg>';
    // legenda: identitatea nu sta doar in culoare
    // v100.56: la actiuni (o.actiune) nu exista grid si nici alertele botului - legenda nu le pomeneste
    var Lg = o.actiune ? [] : ['<span><i style="border-color:' + COL.accent + ';opacity:.7"></i>banda și treptele gridului' + (gl ? " (" + gl + " linii)" : "") + '</span>', ];
    var are = function (k) { return niv.some(function (x) { return x.k === k; }); };
    if (are("zero")) Lg.push('<span><i class="gbDash" style="border-color:' + COL.warn + '"></i>zero-ul botului</span>');
    if (are("planPlus")) Lg.push('<span><i class="gbDash" style="border-color:' + COL.good + '"></i>planul, pe plus</span>');
    if (are("planMinus")) Lg.push('<span><i class="gbDash" style="border-color:' + COL.bad + '"></i>planul, pe minus</span>');
    if (niv.some(function (x) { return x.k === "stop"; })) Lg.push('<span><i style="border-color:' + COL.bad + '"></i>stopul tău</span>');
    if (spP !== null && spP > 0 && !(spA !== null && Math.abs(spP - spA) / spA < 0.0005)) Lg.push('<span><i class="gbDash" style="border-color:' + COL.bad + '"></i>' + esc(cl.etLung || "stopul planului (Consilierul)") + '</span>');
    if (st.zi5 && o.zi5) Lg.push('<span><i style="border-color:' + COL.info + '"></i>' + esc(o.zi5.sursa || "5 zile obișnuite") + ': jumătate din săptămâni (plin) / trei sferturi (punctat)</span>');
    if (st.zi && o.zi) Lg.push('<span><i class="gbPct" style="background:rgba(245,196,81,.45)"></i>ziua obișnuită de la prețul de acum: jumătate din zile (plin) / trei sferturi (punctat) · ' + esc(o.zi.sursa || "") + '</span>');
    if (va) Lg.push('<span><i class="gbPct" style="background:rgba(105,167,255,.35)"></i>zona de valoare, ' + esc(o.val.etLung || "7 zile") + ': 70% din ' + (va.dupa === "timp" ? "timp (lumânările n-au volum)" : "volum") + ' · POC punctat</span>');
    if (st.val && o.val && Array.isArray(o.val.pivoti) && o.val.pivoti.length) Lg.push('<span><i style="border-color:' + COL.bad + '"></i>rezistență / <i style="border-color:' + COL.good + '"></i>suport din pivoți confirmați (' + esc(o.val.etPivoti || "4 h") + ')</span>');
    if (st.ema) Lg.push('<span><i style="border-color:' + COL.ema20 + '"></i>EMA 20</span><span><i style="border-color:' + COL.ema50 + '"></i>EMA 50</span>');
    if (st.bb) Lg.push('<span><i style="border-color:' + COL.bb + '"></i>Bollinger 20, 2</span>');
    if (o.umpleri) Lg.push('<span>▲ cumpărare · ▼ vânzare pe grilă (deduse din lumânări) · perechi pe grafic: ' + o.umpleri.perechi + (nr(o.perechiPionex) !== null ? " · Pionex: " + nr(o.perechiPionex) : "") + '</span>');
    if (!o.actiune) Lg.push('<span><i class="gbPct" style="background:' + COL.bad + '"></i>critic</span><span><i class="gbPct" style="background:' + COL.warn + '"></i>atenție</span><span><i class="gbPct" style="background:' + COL.info + '"></i>info</span>');
    if (o.actiune) { if (f > 1) Lg.push('<span class="mutedInfo">o lumânare = ' + f + ' zile de bursă</span>'); }
    else Lg.push('<span class="mutedInfo">' + evs.length + (evs.length === 1 ? " alertă" : " alerte") + ' ale botului în perioadă' + (f > 1 ? " · o lumânare = " + f + " bare" : "") + '</span>');
    return { svg: svg, inaltime: H, legenda: Lg.join(""), harta: { bare: B, S: S, cw: cw, plotW: plotW, grupuri: gr2, per: o.per, f: f, W: W, H: H } };
  }

  // ce spune cursorul la x (in coordonatele SVG-ului): bara, indicatorii, alertele din apropiere - totul scapat
  function tip(harta, sx) {
    if (!harta || !harta.bare.length || sx < 0 || sx > harta.plotW) return "";
    var bi = Math.max(0, Math.min(harta.bare.length - 1, Math.floor(sx / harta.cw))), b = harta.bare[bi], S = harta.S, lung = harta.per && harta.per !== "24h";
    var r = function (et, v, cls) { return '<div class="gbR"><span class="mutedInfo">' + et + '</span><span' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</span></div>'; };
    var h = '<b>' + esc(ora(b.t, lung)) + '</b>' + r("deschidere", fmtP(b.o)) + r("maxim", fmtP(b.h)) + r("minim", fmtP(b.l)) + r("închidere", fmtP(b.c), b.c >= b.o ? "good" : "bad") + r("volum", Math.round(b.v).toLocaleString("ro-RO"));
    if (S.rsi[b.k] != null) h += r("RSI 14", Math.round(S.rsi[b.k]));
    if (S.e20[b.k] != null) h += r("EMA 20", fmtP(S.e20[b.k]));
    if (S.e50[b.k] != null) h += r("EMA 50", fmtP(S.e50[b.k]));
    var g = null; harta.grupuri.forEach(function (u) { if (Math.abs(u.x - sx) < 12 && (!g || Math.abs(u.x - sx) < Math.abs(g.x - sx))) g = u; });
    if (g) h += '<div class="gbEv">' + g.l.slice(-4).map(function (a) { return '<div><span class="' + (a.nivel === "critic" ? "bad" : a.nivel === "atentie" ? "neutral" : "mutedInfo") + '">●</span> ' + esc(ora(a.t, lung)) + ' ' + esc(String(a.titlu || "").replace(/^[A-Z0-9._-]+: /, "")) + '</div>'; }).join("") + (g.l.length > 4 ? '<div class="mutedInfo">+' + (g.l.length - 4) + ' mai vechi</div>' : '') + '</div>';
    return h;
  }

  return { COL: COL, ziObisnuita: ziObisnuita, ziObisnuitaActiune: ziObisnuitaActiune, niveluriActiune: niveluriActiune, bare: bare, umpleri: umpleri, liniiPionex: liniiPionex, ema: ema, bollinger: bollinger, rsi: rsi, niveluriBot: niveluriBot, grupeaza: grupeaza, desen: desen, tip: tip, esc: esc };
})();
if (typeof globalThis !== "undefined") globalThis.GraficBot = GraficBot;
