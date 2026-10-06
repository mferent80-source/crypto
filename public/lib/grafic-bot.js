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
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
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

  // v100.98 (05.10): ADX 14 (Wilder) - cât de tare merge piața într-o direcție; +DI/−DI spun încotro. Pe barele brute, ca RSI.
  function adx(raw, n) {
    var L = raw.length, o = { adx: [], pdi: [], mdi: [] }, i;
    for (i = 0; i < L; i++) { o.adx.push(null); o.pdi.push(null); o.mdi.push(null); }
    if (L < 2 * n + 1) return o;
    var tr = 0, pd = 0, md = 0, dxs = [], ad = null;
    for (i = 1; i < L; i++) {
      var h = raw[i].h, l = raw[i].l, pc = raw[i - 1].c, up = h - raw[i - 1].h, dn = raw[i - 1].l - l;
      var t = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)), p = up > dn && up > 0 ? up : 0, m = dn > up && dn > 0 ? dn : 0;
      if (i <= n) { tr += t; pd += p; md += m; if (i < n) continue; } else { tr = tr - tr / n + t; pd = pd - pd / n + p; md = md - md / n + m; }
      var P = tr ? 100 * pd / tr : 0, M = tr ? 100 * md / tr : 0, dx = P + M ? 100 * Math.abs(P - M) / (P + M) : 0;
      o.pdi[i] = P; o.mdi[i] = M;
      if (ad === null) { dxs.push(dx); if (dxs.length === n) { ad = dxs.reduce(function (a, b) { return a + b; }, 0) / n; o.adx[i] = ad; } }
      else { ad = (ad * (n - 1) + dx) / n; o.adx[i] = ad; }
    }
    return o;
  }
  function zonaAdx(v) { return v == null ? null : v < 20 ? "loc" : v <= 25 ? "nehotărât" : "trend"; }

  // v100.106 (el, 06.10: „la grafic să arăți și trend și un semafor cu tf 5min/15min/30/1h/1zi”; a adăugat 4 h; demo aprobat): semaforul
  // trendului pe TF-uri - aceeași regulă ca „Direcția” Tabloului (Directie.analizeaza: EMA 20/50 + cât de curat merge prețul + panta EMA 50),
  // doar bare ÎNCHISE. Culoarea = față de bot (verde: cu botul sau lateral, bun pentru grid · roșu: împotriva botului · galben: împinge un
  // grid neutru spre o margine); săgeata = încotro merge piața. ADX și RSI pe aceleași bare închise. pe = {"5M": rândurile Pionex, ...}
  var TF_SEM = [{ tf: "5M", et: "5 min", sc: "5m" }, { tf: "15M", et: "15 min", sc: "15m" }, { tf: "30M", et: "30 min", sc: "30m" },
    { tf: "60M", et: "1 oră", sc: "1h" }, { tf: "4H", et: "4 ore", sc: "4h" }, { tf: "1D", et: "1 zi", sc: "1z" }];
  var SAGEATA = { urca: "↑", coboara: "↓", lateral: "↔" }, NUME_DIR = { urca: "urcă", coboara: "coboară", lateral: "lateral" };
  function semafor(pe, dirBot) {
    var d = String(dirBot || "").toLowerCase();
    return TF_SEM.map(function (x) {
      var r = pe && pe[x.tf], an = r && typeof Directie !== "undefined" ? Directie.analizeaza(r, 1, d) : null;
      var o = { tf: x.tf, et: x.et, sc: x.sc, dir: an && an.dir || null, ton: an && an.fata ? an.fata.ton : "gol", vechime: an && an.vechime || null };
      if (!o.dir) { o.text = r ? "prea puține bare închise (trebuie 60)" : "Pionex n-a dat lumânările la ultima cerere"; return o; }
      var b = bare(r); b.pop();
      var a = adx(b, 14).adx[b.length - 1], rs = rsi(b.map(function (y) { return y.c; }), 14)[b.length - 1];
      o.adx = a; o.rsi = rs;
      // ADX mare cu „lateral” = ADX-ul ține minte o mișcare mai veche (TAKE 1 zi, 06.10: 58, umflat de ziua de 23.09)
      o.text = SAGEATA[o.dir] + " " + NUME_DIR[o.dir] + (o.vechime ? " de " + cate(o.vechime, "bară", "bare") : "") + (a != null ? " · ADX " + Math.round(a) + (o.dir === "lateral" && a > 25 ? " (ține minte o mișcare mai veche)" : "") : "")
        + (rs != null ? " · RSI " + Math.round(rs) : "") + " · " + an.fata.eticheta + (/botului$/.test(an.fata.eticheta) && d ? " " + d : "");
      return o;
    });
  }

  // v100.98 (05.10): CITIREA LIVE de lângă grafic - funcție PURĂ (o = intrarea graficului, bot = botul Pionex, p0 = prețul la care s-a citit botul).
  // Doar ce SE VEDE pe grafic, spus în cuvinte; nu e un sfat nou (sfatul rămâne la semaforul Tabloului).
  function citire(o, bot, p0) {
    var raw = o.bare || [], N = raw.length; if (N < 30) return null;
    var cl = raw.map(function (b) { return b.c; }), p = nr(o.pretViu) > 0 ? nr(o.pretViu) : cl[N - 1];
    var niv = {}; (o.niv || []).forEach(function (x) { niv[x.k] = x.p; });
    var dist = function (x) { return x ? x / p - 1 : null; }, rows = [], dir = String(bot && bot.directie || "").toLowerCase();
    var pr = nr(bot && bot.profitTotal), poz = nr(bot && bot.pozitie), inv = nr(bot && bot.investit);
    if (pr !== null && poz !== null && nr(p0) > 0) pr += (dir === "short" ? -1 : 1) * poz * (p - p0);   /* profitul urmează prețul live */
    var u = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; };
    if (pr !== null) rows.push({ ce: "Botul", stare: pr >= 0 ? "bine" : "atentie", text: (pr >= 0 ? "pe plus " : "pe minus ") + u(pr) + (inv ? " · valorează " + (inv + pr).toFixed(1).replace(".", ",") + " din " + inv.toFixed(2).replace(".", ",") + " USDT investiți" : "") });
    var dz = dist(niv.zero);
    if (dz !== null) rows.push({ ce: "Zero-ul botului", stare: (dir === "short" ? dz < 0 : dz > 0) ? "atentie" : "bine", text: fmtP(niv.zero) + " · " + (Math.abs(dz) < 0.0005 ? "prețul e chiar acolo" : "la " + pct(dz) + " de aici" + ((dir === "short" ? dz < 0 : dz > 0) ? " (sub el, închis acum ar ieși pe minus)" : " (peste el, închis acum ar ieși pe plus)")) });
    var pp = dist(niv.planPlus), pm = dist(niv.planMinus);
    if (pp !== null || pm !== null) rows.push({ ce: "Planul", stare: "info", text: (pp !== null ? "încasezi la " + pct(pp) : "") + (pp !== null && pm !== null ? " · " : "") + (pm !== null ? "închizi la " + pct(pm) : "") });
    var ds = dist(niv.stop), dl = dist(niv.lich), as = ds !== null ? Math.abs(ds) : null;
    // v100.99 (I-527): cât pierzi LA STOP (cu gridul pe drum) față de plan - mereu, nu doar peste toleranța alertei „plan-stop”
    var sv = o.stopVsPlan, ls = sv ? nr(sv.laStop) : null, pg = sv ? nr(sv.plan) : null, peste = ls !== null && pg !== null && pg > 0 ? -ls - pg : null;
    if (ds !== null || dl !== null) {
      var stS = as !== null && as < 0.03 ? "rau" : as !== null && as < 0.07 ? "atentie" : "bine";
      if (peste !== null && peste > 0.05 && stS === "bine") stS = "atentie";
      rows.push({ ce: peste !== null ? "Stopul vs planul" : "Stopul", stare: stS, text: (ds !== null ? "la " + pct(ds) : "nepus") + (ls !== null ? " · la stop pierzi " + u(ls) : "")
        + (peste !== null ? (peste > 0.05 ? ", planul −" + pg.toFixed(2).replace(".", ",") + " (cu " + peste.toFixed(2).replace(".", ",") + " mai mult)" : ", în plan (−" + pg.toFixed(2).replace(".", ",") + ")") : "")
        + (dl !== null ? " · lichidarea la " + pct(dl) : "") });
    }
    var g = o.grila || {}, Lg = liniiPionex(g.jos, g.sus, g.linii, g.geo);
    if (Lg.length) {
      var k = 0; while (k < Lg.length - 1 && Lg[k + 1] <= p) k++;
      var inGrid = p >= Lg[0] && p <= Lg[Lg.length - 1], U = o.umpleri && o.umpleri.umpleri || [], ult = null;
      U.forEach(function (x) { if (x.pereche && (!ult || x.t > ult.t)) ult = x; });
      rows.push({ ce: "Gridul", stare: inGrid ? "bine" : "rau", text: (inGrid ? "pe treapta " + (k + 1) + " din " + (Lg.length - 1) : p < Lg[0] ? "SUB grid" : "PESTE grid") + " · " + cate(o.umpleri ? o.umpleri.perechi : 0, "pereche închisă", "perechi închise") + " pe grafic" + (ult ? ", ultima la " + ora(ult.t) : "") + (nr(o.perechiPionex) !== null ? " (Pionex: " + nr(o.perechiPionex) + " de la pornire)" : "") });
    }
    var e20 = ema(cl, 20)[N - 1], e50 = ema(cl, 50)[N - 1];
    // v100.106: cu semaforul, rândul vechi „Direcția” (doar EMA 20 vs 50) iese - pe TAKE zicea „în sus” când semaforul pe 5 min zicea „lateral”
    if (Array.isArray(o.semafor)) o.semafor.forEach(function (x) { rows.push({ ce: x.et, tf: true, stare: x.ton === "bine" ? "bine" : x.ton === "rau" ? "rau" : x.ton === "atentie" ? "atentie" : "info", text: x.text }); });
    else if (e20 !== null && e50 !== null) {
      var jos = e20 < e50, sub = p < Math.min(e20, e50), peste = p > Math.max(e20, e50), contra = (dir === "long" && jos && sub) || (dir === "short" && !jos && peste);
      rows.push({ ce: "Direcția", stare: contra ? "atentie" : "info", text: (jos ? "în jos" : "în sus") + ": EMA 20 " + (jos ? "sub" : "peste") + " EMA 50, prețul " + (sub ? "sub amândouă" : peste ? "peste amândouă" : "între ele") + (contra ? " · împotriva botului " + dir : "") });
    }
    var bb = bollinger(cl, 20, 2)[N - 1], rs = rsi(cl, 14)[N - 1];
    if (bb && rs !== null) {
      var pb = (p - bb.j) / ((bb.s - bb.j) || 1), unde = pb < 0 ? "sub banda Bollinger" : pb < 0.2 ? "lângă marginea de jos a Bollinger" : pb > 1 ? "peste banda Bollinger" : pb > 0.8 ? "lângă marginea de sus a Bollinger" : "în mijlocul benzii Bollinger";
      rows.push({ ce: "Unde e prețul", stare: "info", text: unde + " · RSI " + Math.round(rs) + (rs < 30 ? " (apăsat)" : rs > 70 ? " (încins)" : "") });
    }
    var A = adx(raw, 14), a = A.adx[N - 1], z = zonaAdx(a), pdi = A.pdi[N - 1], mdi = A.mdi[N - 1];
    if (a !== null) {
      var spre = pdi > mdi ? "sus" : "jos", contraA = z === "trend" && ((dir === "long" && spre === "jos") || (dir === "short" && spre === "sus"));
      rows.push({ ce: "ADX 14", peBoti: o.adxPeBoti || null, stare: z === "loc" ? "bine" : z === "nehotărât" ? "info" : contraA ? "rau" : "atentie", text: Math.round(a) + " · " + (z === "loc" ? "piața stă pe loc (vremea gridului)" : z === "nehotărât" ? "nehotărât, între loc și trend" : "trend " + (spre === "sus" ? "în sus" : "în jos") + (contraA ? ", împotriva botului " + dir : "")) + (o.adxPeBoti ? " · " + o.adxPeBoti : "") });
    }
    if (N >= 48) {
      var sume = []; for (var i = 12; i <= N; i++) { var sv = 0; for (var j = i - 12; j < i; j++) sv += raw[j].v; sume.push(sv); }
      var acum = sume[sume.length - 1], srt = sume.slice().sort(function (x, y) { return x - y; }), med = srt[srt.length >> 1] || 0, rap = med ? acum / med : null;
      if (rap !== null) rows.push({ ce: "Volumul", stare: "info", text: rap.toFixed(1).replace(".", ",") + "× față de obișnuit pe ultima oră" + (rap < 0.7 ? " (liniște)" : rap > 1.6 ? " (agitație)" : "") });
    }
    var fu = o.funding, ra = fu && nr(fu.rata);
    if (ra !== null) {
      var platesti = (dir === "long" && ra > 0) || (dir === "short" && ra < 0), val = poz !== null ? Math.abs(poz) * p * Math.abs(ra) : null, un = nr(fu.urmatoarea), acumT = nr(fu.acum) || Date.now();
      var min = un !== null ? Math.max(0, Math.round((un - acumT) / 60000)) : null;
      rows.push({ ce: "Funding", stare: platesti ? "atentie" : "bine", text: (ra >= 0 ? "+" : "−") + Math.abs(ra * 100).toFixed(4).replace(".", ",") + "%" + (un !== null ? " · următoarea plată la " + ora(un) + " (în " + (min >= 60 ? Math.floor(min / 60) + " h " + (min % 60) + " min" : min + " min") + ")" : "") + (val !== null ? " · botul " + (platesti ? "plătește" : "încasează") + " ~" + val.toFixed(3).replace(".", ",") + " USDT" : "") + (fu.sursa ? " (" + fu.sursa + ")" : "") });
    }
    var scurt = [];
    if (pr !== null) scurt.push("botul " + (pr >= 0 ? "pe plus" : "pe minus") + " " + u(pr));
    if (z) scurt.push(z === "loc" ? "piața stă pe loc" : z === "trend" ? "piața e în trend" : "piața e nehotărâtă");
    if (as !== null) scurt.push("stopul la " + pct(ds));
    return { pret: p, randuri: rows, peScurt: scurt.join(" · "), adx: a, zona: z };
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
      sursa: (zile === 5 ? "5 zile de bursă obișnuite ale acțiunii: " : "ziua obișnuită a acțiunii: ") + (nr(p.zile) !== null ? p.zile + " de zile de bursă" : "profilul") + " (bare zilnice)" };
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

  // v100.99 (I-528): șansele MĂSURATE (Probabilitati.randuri) pe liniile lor: marginile în 24 h, lichidarea în 7 zile, ținta planului înaintea
  // stopului în 7 zile (cursa). Doar ce s-a măsurat - pe stopul botului nu există o cifră proprie (aceea e la acțiuni), deci nu se inventează.
  var SANSE = { gridJos: ["iese-jos-24", "24 h"], gridSus: ["iese-sus-24", "24 h"], lich: ["lichidare", "7 zile"], planPlus: ["cursa", "înaintea stopului, 7 zile"] };
  function cuSanse(niv, sanse) {
    var dupa = {}; (Array.isArray(sanse) ? sanse : []).forEach(function (r) { if (r && r.cod && nr(r.p) !== null) dupa[r.cod] = r; });
    return niv.map(function (x) {
      var m = SANSE[x.k], r = m && dupa[m[0]]; if (!r) return x;
      var p = Math.round(r.p * 100) + "%";
      return Object.assign({}, x, { sansa: m[1] + ": " + p, sansaScurt: p, sansaLung: r.titlu + ": " + p + (r.text ? " · " + r.text : "") });
    });
  }
  // v100.99 (I-529): stopul DE PROBĂ - cât ai pierde dacă ai pune stopul la `pret` (total = TabloExtra.totalCuGridLa, cu gridul pe drum), față de plan
  function stopProba(pret, pAcum, total, plan) {
    pret = nr(pret); pAcum = nr(pAcum); total = nr(total); plan = nr(plan);
    if (pret === null || !(pret > 0)) return null;
    var dist = pAcum > 0 ? pret / pAcum - 1 : null, peste = total !== null && plan > 0 ? -total - plan : null;
    var u = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; };
    return { pret: pret, dist: dist, total: total, peste: peste, scurt: fmtP(pret) + (total !== null ? " · " + u(total) : ""),   /* pe telefon */
      text: "stop de probă la " + fmtP(pret) + (dist !== null ? " (" + pct(dist) + ")" : "") + (total !== null ? ": " + (total < 0 ? "pierzi " : "rămâi cu ") + u(total) : "")
        + (peste !== null ? (Math.abs(peste) <= 0.05 ? ", exact planul" : peste > 0 ? ", cu " + peste.toFixed(2).replace(".", ",") + " peste plan" : ", cu " + (-peste).toFixed(2).replace(".", ",") + " sub plan") : "") };
  }
  // v100.99 (I-532): intrarea graficului botului, PURĂ - ce construia renderTabloGrafic în app.js (probele verifică ce întoarce, nu textul codului).
  // d = { bot, brut, bare, plan, alerteServer, valoare, profil, consLinii, funding, sanse, proba, pretViu, acum, W, st, simplu, per, TabloExtra? }
  function intrareBot(d) {
    var TE = d.TabloExtra || (typeof TabloExtra !== "undefined" ? TabloExtra : null), b = d.bot || {}, pl = d.plan || null, viu = nr(d.pretViu) > 0 ? nr(d.pretViu) : null;
    var raw = Array.isArray(d.bare) ? d.bare : [], acum = nr(d.acum) || Date.now(), dir = String(b.directie || "").toLowerCase();
    var z = TE ? TE.dacaInchizi(b) : null, plus = pl ? nr(pl.plus) : null, minus = pl ? nr(pl.minus) : null;
    // v100.98: planul CU gridul pe drum (pretTintaPentru / pretOpritorPentru)
    var pPl = TE && plus > 0 ? TE.pretTintaPentru(b, plus) : null, pMi = TE && minus > 0 ? TE.pretOpritorPentru(b, -minus) : null;
    var niv = cuSanse(niveluriBot({ bot: b, zero: z && z.pretZero, planPlus: pPl ? { pret: pPl, usdt: plus } : null, planMinus: pMi ? { pret: pMi, usdt: minus } : null }), d.sanse);
    var xo = d.brut && d.brut.buOrderData || {}, gj = nr(xo.bottom), gs = nr(xo.top);
    var grila = { jos: gj !== null ? gj : nr(b.gridJos), sus: gs !== null ? gs : nr(b.gridSus), linii: nr(xo.row), geo: String(xo.gridType || "").toLowerCase() === "geometric" };
    var zi = ziObisnuita(viu || (raw.length ? raw[raw.length - 1].c : null), d.profil);   // v100.51 (I-470, I-476)
    var bv = cuPretViu(raw, viu, acum);   // v100.98: lumânarea de acum urmează prețul live
    var laStop = TE && b.opritorPierdereActiv ? TE.totalLaOpritor(b) : null;
    return { simplu: d.simplu !== false, pornit: nr(b.pornitLa), funding: d.funding || null, bare: bv, W: d.W, ingust: d.W < 560, st: d.st || {}, niv: niv, zi: zi, val: d.valoare || null,
      consLinii: d.consLinii && d.consLinii.bot === b.id ? d.consLinii : null, grila: grila, alerte: TE ? TE.alerteleBotului(d.alerteServer || [], b.id, acum) : [], per: d.per || "24h", pretViu: viu,
      // v100.38: umplerile si perechile gridului, deduse din lumanari de la pornire, langa numarul de perechi al Pionex
      umpleri: umpleri(bv, { jos: grila.jos, sus: grila.sus, linii: grila.linii, geo: grila.geo, p0: nr(xo.initPrice), pornit: nr(b.pornitLa), dir: dir }), perechiPionex: nr(b.ordinePerechi),
      stopVsPlan: laStop !== null && minus > 0 ? { laStop: laStop, plan: minus } : null,   // v100.99 (I-527)
      proba: d.proba || null,   // v100.99 (I-529): { pret, text } - linia stopului de probă
      semafor: d.semafor || null, tfGrafic: d.tfGrafic || null, trendIstoric: d.trendIstoric || null,   // v100.106: semaforul trendului + banda
      adxPeBoti: d.adxPeBoti || null };   // v100.100 (I-530): ce a arătat ADX-ul pe arhiva LUI (Asemanatoare.textAdx)   // v100.99 (I-529): { pret, text } - linia stopului de probă
  }

  // o = { bare, W, ingust, st:{bb,ema,rsi,vp}, niv, grila:{jos,sus,n,geo}, alerte, per }
  function desen(o) {
    var raw = o.bare || [], st = o.st || {}, W = Math.max(300, o.W || 800), ingust = !!o.ingust, simplu = !!o.simplu;
    if (simplu) st = { ema: st.ema !== false, rsi: !!st.rsi, adx: st.adx !== false };   /* v100.98: Simplu = esențialul */
    var gut = ingust ? 108 : 176, plotW = W - gut, mainH = ingust ? 270 : Math.round(Math.max(340, Math.min(520, W * 0.36))),   /* el, 01.10: graficul mai mare - creste cu latimea */ volH = ingust ? 34 : 46, laneH = o.actiune ? 0 : 26, rsiH = st.rsi ? (ingust ? 62 : 78) : 0, adxH = st.adx ? (ingust ? 56 : 70) : 0, axH = 20, gap = 8, trH = Array.isArray(o.semafor) ? (ingust ? 7 : 9) : 0;
    var cl = raw.map(function (b) { return b.c; }), S = { e20: ema(cl, 20), e50: ema(cl, 50), bb: bollinger(cl, 20, 2), rsi: rsi(cl, 14) };
    // v100.106: trendul pe fiecare bară ÎNCHISĂ, pe istoria lungă a TF-ului (o.trendIstoric), ca banda să nu înceapă abia de la bara 60
    S.tr = null;
    if (trH && typeof Directie !== "undefined") {
      var bi0 = o.trendIstoric ? bare(o.trendIstoric) : raw.slice(); bi0.pop();
      var st0 = Directie.stari(bi0.map(function (x) { return x.c; })), peT = {};
      bi0.forEach(function (x, i) { peT[x.t] = st0[i]; });
      S.tr = raw.map(function (x) { return peT[x.t] || null; });
    }
    // lumanarile se strang cand sunt prea dese (cel mult ~1 la 2,8 px) - v100.98: marginea etichetelor a crescut (13 px), 24 h de bare de 5 min
    // trebuie sa ramana o lumanare pe bara la 1000 px (proba v100)
    var f = Math.max(1, Math.ceil(raw.length * 2.8 / plotW)), B = [];
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
    if (Array.isArray(o.semafor) && o.semafor.length) { var rez = (ingust ? 54 : 44) / mainH; hi += (hi - lo) * rez / (1 - rez); }   /* v100.106: sus rămâne loc gol pentru semafor - prețul nu intră sub el */
    var Y = function (p) { return (1 - (p - lo) / (hi - lo)) * mainH; }, X = function (bi) { return bi * cw + cw / 2; };
    var q = [], H = mainH + gap + (trH ? trH + gap : 0) + volH + gap + laneH + (rsiH ? gap + rsiH : 0) + (adxH ? gap + adxH : 0) + axH, f1 = function (x) { return x.toFixed(1); };
    q.push('<rect x="0" y="0" width="' + f1(plotW) + '" height="' + mainH + '" fill="' + COL.fond + '"/>');
    for (var gi = 1; gi < 5; gi++) q.push('<line x1="0" x2="' + f1(plotW) + '" y1="' + f1(mainH * gi / 5) + '" y2="' + f1(mainH * gi / 5) + '" stroke="' + COL.grila + '" stroke-width="1"/>');
    // banda gridului + treptele
    // v100.38: treptele pe LINIILE Pionex (grila.linii = row); grila.n (intervale) ramane pentru chematorii vechi
    var gr = o.grila || {}, gj = nr(gr.jos), gs = nr(gr.sus), gl = nr(gr.linii) !== null ? nr(gr.linii) : nr(gr.n) !== null ? nr(gr.n) + 1 : null, gn = gl !== null ? gl - 1 : null;
    if (gj !== null && gs !== null && gs > gj) {
      var bj = Math.max(lo, gj), bs = Math.min(hi, gs);
      if (bs > bj) q.push('<rect class="gbBanda" x="0" y="' + f1(Y(bs)) + '" width="' + f1(plotW) + '" height="' + f1(Y(bj) - Y(bs)) + '" fill="rgba(79,209,197,.07)"/>');
      if (gn >= 1 && !simplu) for (var ni = 0; ni <= gn; ni += Math.max(1, Math.ceil(gn / 40))) {
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
    // v100.106: spațiul dintre EMA 20 și EMA 50 umplut pe bucățile în care trendul urcă (verde) sau coboară (roșu); lateral = gol
    if (st.ema && S.tr) {
      var bucata = null, bucati = [];
      B.forEach(function (b, bi) {
        var z = S.tr[b.k], dz = z && z.dir !== "lateral" ? z.dir : null, a20 = S.e20[b.k], a50 = S.e50[b.k];
        if (!dz || a20 == null || a50 == null) { bucata = null; return; }
        if (!bucata || bucata.dir !== dz) { bucata = { dir: dz, sus: [], jos: [] }; bucati.push(bucata); }
        bucata.sus.push(f1(X(bi)) + "," + f1(Y(Math.min(hi, Math.max(lo, a20))))); bucata.jos.unshift(f1(X(bi)) + "," + f1(Y(Math.min(hi, Math.max(lo, a50)))));
      });
      bucati.forEach(function (u) { if (u.sus.length > 1) q.push('<polygon class="gbTrendEma" points="' + u.sus.concat(u.jos).join(" ") + '" fill="' + (u.dir === "urca" ? COL.good : COL.bad) + '" fill-opacity=".16"/>'); });
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
    // v100.98 (05.10) (el: „linia de pornire a botului”): ce a trăit botul vs ce era înainte
    var tPorn = nr(o.pornit);
    if (tPorn !== null && n > 1 && tPorn > B[0].t && tPorn <= B[n - 1].t + (B[1].t - B[0].t)) {
      var bp = 0; while (bp < n - 1 && B[bp + 1].t <= tPorn) bp++;
      var xp = X(bp) + cw / 2;
      q.push('<rect class="gbInainte" x="0" y="0" width="' + f1(xp) + '" height="' + mainH + '" fill="' + COL.fond + '" fill-opacity=".45"/>'
        + '<line class="gbPornit" x1="' + f1(xp) + '" x2="' + f1(xp) + '" y1="0" y2="' + mainH + '" stroke="' + COL.accent + '" stroke-width="1.4" stroke-dasharray="5 4"/>'
        + '<text x="' + f1(xp + 5) + '" y="' + (mainH - 8) + '" font-size="12" fill="' + COL.accent + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="4">botul pornit ' + ora(tPorn) + '</text>');
    }
    // liniile + etichetele din dreapta (se imping ca sa nu se suprapuna); ce e in afara cadrului -> sageata la margine
    var et = [], afara = [];
    niv.forEach(function (x) {
      if (x.p >= lo && x.p <= hi) {
        var y = Y(x.p);
        if (x.st !== "fine") q.push('<line class="gbNiv" x1="0" x2="' + f1(plotW) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" stroke="' + x.c + '" stroke-width="' + (x.st === "lich" ? 2 : 1.3) + '"' + (x.st === "dash" ? ' stroke-dasharray="6 4"' : x.st === "lich" ? ' stroke-dasharray="2 3"' : '') + '/>');
        et.push({ y: y, t: x.t, s: x.s, p: x.p, c: x.c });
        // v100.99 (I-528): șansa MĂSURATĂ (Probabilitati) deasupra liniei, la marginea din dreapta a graficului - eticheta din dreapta rămâne scurtă
        if (x.sansa) q.push('<text class="gbSansa" x="' + f1(plotW - 6) + '" y="' + f1(y - 5) + '" text-anchor="end" font-size="11.5" fill="' + x.c + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="4"><title>' + esc(x.sansaLung || x.sansa) + '</title>' + esc(ingust ? x.sansaScurt || x.sansa : x.sansa) + '</text>');
      } else afara.push(x);
    });
    // v100.99 (I-529): stopul de probă - linia trasă de el, cu ce ar pierde acolo (textul vine gata din stopProba)
    var pr0 = o.proba && nr(o.proba.pret);
    if (pr0 !== null && pr0 >= lo && pr0 <= hi) q.push('<g class="gbProba"><line x1="0" x2="' + f1(plotW) + '" y1="' + f1(Y(pr0)) + '" y2="' + f1(Y(pr0)) + '" stroke="' + COL.text + '" stroke-width="1.6" stroke-dasharray="8 4"/>'
      + (ingust ? '' : '<text x="8" y="' + f1(Y(pr0) - 6) + '" font-size="12.5" font-weight="700" fill="' + COL.text + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="4">🧪 ' + esc(o.proba.text || ("stop de probă " + fmtP(pr0))) + '</text>') + '</g>');   /* pe telefon doar linia: textul e în citirea de sub grafic (lista din stânga-jos ar acoperi-o) */
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
    var minD = ingust ? 17 : 20; for (var ei = 1; ei < et.length; ei++) if (et[ei].y - et[ei - 1].y < minD) et[ei].y = et[ei - 1].y + minD;
    var peste = et.length ? et[et.length - 1].y - (mainH - 6) : 0; if (peste > 0) et.forEach(function (e) { e.y -= peste; });
    et.forEach(function (e) {
      if (e.acum) q.push('<rect x="' + f1(plotW + 2) + '" y="' + f1(e.y - 11) + '" width="' + (gut - 4) + '" height="22" rx="5" fill="' + COL.text + '"/><text x="' + f1(plotW + 8) + '" y="' + f1(e.y + 5) + '" font-size="13.5" font-weight="700" fill="#071018">' + (ingust ? "" : "acum ") + fmtP(e.p) + '</text>');
      else q.push('<text x="' + f1(plotW + 6) + '" y="' + f1(e.y + 4.5) + '" font-size="13" fill="' + e.c + '">' + esc(ingust ? (e.s || "") : e.t) + " " + fmtP(e.p) + '</text>');
    });
    // v100.106: semaforul trendului, sus-stânga peste grafic (în locul gol lăsat sus); becul TF-ului graficului e încercuit
    var semH = 0;
    if (Array.isArray(o.semafor) && o.semafor.length) {
      var CS = ingust ? 38 : 62, HS = ingust ? 40 : 30, sx0 = 8, sy0 = 8, CULS = { bine: COL.good, rau: COL.bad, atentie: COL.warn, gol: COL.mut };
      semH = HS + 8 + 6;
      q.push('<rect class="gbSemFond" x="' + sx0 + '" y="' + sy0 + '" width="' + (o.semafor.length * CS + 8) + '" height="' + (HS + 8) + '" rx="9" fill="' + COL.fond + '" fill-opacity=".88" stroke="#213247"/>');
      o.semafor.forEach(function (x, i) {
        var cx = sx0 + 4 + i * CS + (ingust ? CS / 2 : 14), cy = sy0 + 4 + (ingust ? 12 : HS / 2), c = CULS[x.ton] || COL.mut, eu = x.tf === o.tfGrafic;
        q.push('<g class="gbSem" tabindex="0"><title>' + esc(x.et + ": " + x.text + (eu ? " · acesta e graficul de dedesubt" : "")) + '</title>'
          + (eu ? '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="13.5" fill="none" stroke="' + COL.text + '" stroke-width="1.6"/>' : '')
          + '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="10" fill="' + c + '"/>'
          + '<text x="' + f1(cx) + '" y="' + f1(cy + 4.5) + '" text-anchor="middle" font-size="13" font-weight="800" fill="#071018">' + (SAGEATA[x.dir] || "–") + '</text>'
          + '<text x="' + f1(ingust ? cx : cx + 17) + '" y="' + f1(ingust ? cy + 25 : cy + 4.5) + '"' + (ingust ? ' text-anchor="middle"' : '') + ' font-size="' + (ingust ? 11.5 : 13) + '"' + (eu ? ' font-weight="700"' : '') + ' fill="' + (eu ? COL.text : COL.info) + '">' + esc(x.sc) + '</text></g>');
      });
    }
    var ys = 17 + semH, yj = mainH - 9;
    afara.forEach(function (x) {
      var inSus = x.p > hi, t = (inSus ? "↑ " : "↓ ") + x.t + " " + fmtP(x.p) + (pAcum ? " (" + pct(x.p / pAcum - 1) + ")" : "") + (x.sansa ? " · " + (ingust ? x.sansaScurt || x.sansa : x.sansa) : "");
      q.push('<text x="8" y="' + (inSus ? ys : yj) + '" font-size="12.5" fill="' + x.c + '" paint-order="stroke" stroke="' + COL.fond + '" stroke-width="4">' + esc(t) + '</text>');
      if (inSus) ys += 17; else yj -= 17;
    });
    // v100.106: banda de trend - o fâșie pe fiecare bară închisă, în culoarea direcției (aceeași regulă ca semaforul)
    if (trH && S.tr) {
      var ty0 = mainH + gap, CUT = { urca: COL.good, coboara: COL.bad, lateral: COL.mut };
      B.forEach(function (b, bi) { var z = S.tr[b.k]; if (!z) return; q.push('<rect class="gbTrend" x="' + f1(X(bi) - cw / 2) + '" y="' + ty0 + '" width="' + f1(cw + 0.4) + '" height="' + trH + '" fill="' + CUT[z.dir] + '" fill-opacity="' + (z.dir === "lateral" ? ".55" : ".9") + '"/>'); });
      q.push('<text x="' + f1(plotW + 6) + '" y="' + (ty0 + trH) + '" font-size="12" fill="' + COL.mut + '">trend' + (ingust ? '' : ' ' + esc((TF_SEM.filter(function (x) { return x.tf === o.tfGrafic; })[0] || {}).et || "")) + '</text>');
    }
    // volumul
    var vy0 = mainH + gap + (trH ? trH + gap : 0), vmx = Math.max.apply(null, B.map(function (b) { return b.v; })) || 1;
    q.push('<text x="' + f1(plotW + 6) + '" y="' + (vy0 + 12) + '" font-size="12" fill="' + COL.mut + '">volum</text>');
    B.forEach(function (b, bi) { var hh = b.v / vmx * (volH - 2); q.push('<rect class="gbV" x="' + f1(X(bi) - bw / 2) + '" y="' + f1(vy0 + volH - hh) + '" width="' + f1(bw) + '" height="' + f1(Math.max(0.5, hh)) + '" fill="' + (b.c >= b.o ? "rgba(85,216,155,.35)" : "rgba(255,107,120,.35)") + '"/>'); });
    // banda de alerte - doar ale botului (le filtreaza chematorul), stranse cand sunt apropiate
    var ly0 = vy0 + volH + gap, t0 = B.length ? B[0].t : 0, pas = raw.length > 1 ? raw[1].t - raw[0].t : 0, t1 = raw.length ? raw[raw.length - 1].t + pas : 1;
    var TX = function (t) { return (t - t0) / ((t1 - t0) || 1) * plotW; };
    if (!o.actiune) {   // v100.56: actiunile n-au banda alertelor botului
      q.push('<rect x="0" y="' + ly0 + '" width="' + f1(plotW) + '" height="' + laneH + '" rx="6" fill="' + COL.fond + '"/>');
      q.push('<text x="' + f1(plotW + 6) + '" y="' + (ly0 + 17) + '" font-size="12" fill="' + COL.mut + '">alertele botului</text>');
    }
    var evs = (o.alerte || []).filter(function (a) { return a && nr(a.t) !== null && a.t >= t0 && a.t <= t1; }), gr2 = grupeaza(evs, TX, 16), CUL = { critic: COL.bad, atentie: COL.warn, info: COL.info };
    gr2.forEach(function (u, ui) {
      var r = u.l.length > 1 ? 10 : 7, NIV = { critic: "critică", atentie: "de atenție", info: "de informare" };
      var tit = (u.l.length > 1 ? cate(u.l.length, "alertă", "alerte") + " ale botului, cea mai gravă " : "alertă ") + (NIV[u.nivel] || "") + " · " + u.l.slice(-3).map(function (a) { return ora(a.t) + " " + String(a.titlu || "").replace(/^[A-Z0-9._-]+: /, ""); }).join(" · ");
      q.push('<g class="gbE" data-g="' + ui + '" tabindex="0"><title>' + esc(tit) + '</title><circle cx="' + f1(u.x) + '" cy="' + (ly0 + laneH / 2) + '" r="' + r + '" fill="' + (CUL[u.nivel] || COL.info) + '" stroke="' + COL.fond + '" stroke-width="2"/>' + (u.l.length > 1 ? '<text x="' + f1(u.x) + '" y="' + (ly0 + laneH / 2 + 4) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="#071018">' + u.l.length + '</text>' : '') + '</g>');
    });
    // RSI
    var ry0 = ly0 + laneH + gap;
    if (st.rsi) {
      var RY = function (v) { return ry0 + (1 - v / 100) * rsiH; };
      q.push('<rect x="0" y="' + ry0 + '" width="' + f1(plotW) + '" height="' + rsiH + '" fill="' + COL.fond + '"/><rect x="0" y="' + f1(RY(70)) + '" width="' + f1(plotW) + '" height="' + f1(RY(30) - RY(70)) + '" fill="rgba(139,116,240,.06)"/>');
      [70, 30].forEach(function (v) { q.push('<line x1="0" x2="' + f1(plotW) + '" y1="' + f1(RY(v)) + '" y2="' + f1(RY(v)) + '" stroke="#2a3a50" stroke-dasharray="3 3"/><text x="' + f1(plotW + 6) + '" y="' + f1(RY(v) + 4) + '" font-size="12" fill="' + COL.mut + '">' + v + '</text>'); });
      var d = "", pen = false; B.forEach(function (b, bi) { var v = S.rsi[b.k]; if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + f1(X(bi)) + "," + f1(RY(v)); pen = true; });
      q.push('<path class="gbRsi" d="' + d + '" fill="none" stroke="' + COL.intrare + '" stroke-width="1.4"/>');
      var rl = S.rsi[raw.length - 1]; q.push('<text x="' + f1(plotW + 6) + '" y="' + (ry0 + 14) + '" font-size="12.5" fill="' + COL.intrare + '">RSI ' + (rl != null ? Math.round(rl) : "—") + '</text>');
    }
    // v100.98 (05.10): ADX 14 - sub 20 piața stă pe loc (bun pentru grid), peste 25 e în trend (rău pentru grid); scala 0–60
    var ay0 = ry0 + (rsiH ? rsiH + gap : 0);
    if (st.adx) {
      S.adx = adx(raw, 14);
      var AY = function (v) { return ay0 + (1 - Math.min(60, Math.max(0, v)) / 60) * adxH; };
      q.push('<rect x="0" y="' + ay0 + '" width="' + f1(plotW) + '" height="' + adxH + '" fill="' + COL.fond + '"/>'
        + '<rect x="0" y="' + f1(AY(20)) + '" width="' + f1(plotW) + '" height="' + f1(AY(0) - AY(20)) + '" fill="rgba(85,216,155,.07)"/>'
        + '<rect x="0" y="' + f1(AY(60)) + '" width="' + f1(plotW) + '" height="' + f1(AY(25) - AY(60)) + '" fill="rgba(245,196,81,.06)"/>');
      [25, 20].forEach(function (v) { q.push('<line x1="0" x2="' + f1(plotW) + '" y1="' + f1(AY(v)) + '" y2="' + f1(AY(v)) + '" stroke="#2a3a50" stroke-dasharray="3 3"/>'); });
      if (!ingust) q.push('<text x="6" y="' + f1(AY(25) - 4) + '" font-size="11" fill="' + COL.warn + '" fill-opacity=".85">peste 25: trend</text><text x="6" y="' + f1(AY(0) - 5) + '" font-size="11" fill="' + COL.good + '" fill-opacity=".85">sub 20: stă pe loc</text>');
      var da = "", pa = false; B.forEach(function (b, bi) { var v = S.adx.adx[b.k]; if (v == null) { pa = false; return; } da += (pa ? "L" : "M") + f1(X(bi)) + "," + f1(AY(v)); pa = true; });
      q.push('<path class="gbAdx" d="' + da + '" fill="none" stroke="' + COL.intrare + '" stroke-width="1.6"/>');
      var al = S.adx.adx[raw.length - 1], za = zonaAdx(al);
      q.push('<text x="' + f1(plotW + 6) + '" y="' + (ay0 + 14) + '" font-size="12.5" fill="' + COL.intrare + '">ADX ' + (al != null ? Math.round(al) : "—") + '</text>'
        + (za ? '<text x="' + f1(plotW + 6) + '" y="' + (ay0 + 30) + '" font-size="12" fill="' + (za === "loc" ? COL.good : za === "trend" ? COL.warn : COL.mut) + '">' + (za === "loc" ? "stă pe loc" : za === "trend" ? "trend" : "nehotărât") + '</text>' : ''));
    }
    var josTot = st.adx ? ay0 + adxH : rsiH ? ry0 + rsiH : ly0 + laneH;
    // axa timpului
    var ay = josTot + 18, lung = o.per && o.per !== "24h";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (fr, ii) { if (ingust && (ii === 1 || ii === 3)) return; q.push('<text x="' + f1(fr * plotW) + '" y="' + ay + '" font-size="12" fill="' + COL.mut + '" text-anchor="' + (fr === 0 ? "start" : fr === 1 ? "end" : "middle") + '">' + (o.actiune ? ziLuna(t0 + fr * (t1 - t0)) : ora(t0 + fr * (t1 - t0), lung)) + '</text>'); });
    q.push('<line class="gbCruceY" x1="0" x2="' + f1(plotW) + '" y1="0" y2="0" stroke="' + COL.text + '" stroke-opacity=".35" stroke-width="1" stroke-dasharray="2 3" style="display:none"/>');
    q.push('<line class="gbCruce" x1="0" x2="0" y1="0" y2="' + josTot + '" stroke="' + COL.text + '" stroke-opacity=".35" stroke-width="1" style="display:none"/>');
    var svg = '<svg class="gbSvg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + (o.actiune ? "Prețul acțiunii (zilnic) cu stopul, ținta și zona de valoare" : "Prețul cu gridul, planul și alertele botului") + '">' + q.join("") + '</svg>';
    // legenda: identitatea nu sta doar in culoare
    // v100.56: la actiuni (o.actiune) nu exista grid si nici alertele botului - legenda nu le pomeneste
    var Lg = o.actiune ? [] : ['<span><i style="border-color:' + COL.accent + ';opacity:.7"></i>banda și treptele gridului' + (gl ? " (" + cate(gl, "linie", "linii") + ")" : "") + '</span>', ];
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
    if (S.tr) Lg.push('<span><i class="gbPct" style="background:' + COL.good + '"></i><i class="gbPct" style="background:' + COL.bad + '"></i><i class="gbPct" style="background:' + COL.mut + '"></i>trend: urcă · coboară · lateral (banda de sub lumânări, EMA umplut)</span><span>semafor: culoarea = față de bot, săgeata = piața</span>');   /* v100.106: și în Complet */
    if (st.bb) Lg.push('<span><i style="border-color:' + COL.bb + '"></i>Bollinger 20, 2</span>');
    if (o.umpleri) Lg.push('<span>▲ cumpărare · ▼ vânzare pe grilă (deduse din lumânări) · perechi pe grafic: ' + o.umpleri.perechi + (nr(o.perechiPionex) !== null ? " · Pionex: " + nr(o.perechiPionex) : "") + '</span>');
    if (simplu && !o.actiune) {   /* v100.98: un singur rând, cu ce e pe grafic */
      Lg = ['<span><i class="gbDash" style="border-color:' + COL.warn + '"></i>zero</span>', '<span><i class="gbDash" style="border-color:' + COL.good + '"></i>plan +</span>', '<span><i class="gbDash" style="border-color:' + COL.bad + '"></i>plan −</span>', '<span><i style="border-color:' + COL.bad + '"></i>stop</span>',
        '<span><i style="border-color:' + COL.ema20 + '"></i>EMA 20</span>', '<span><i style="border-color:' + COL.ema50 + '"></i>EMA 50</span>',
        (S.tr ? '<span><i class="gbPct" style="background:' + COL.good + '"></i><i class="gbPct" style="background:' + COL.bad + '"></i><i class="gbPct" style="background:' + COL.mut + '"></i>trend: urcă · coboară · lateral</span><span>semafor: culoarea = față de bot, săgeata = piața</span>' : ''),
        '<span>▲▼ umpleri · ◯ pereche închisă (' + (o.umpleri ? o.umpleri.perechi : 0) + ')</span>',
        '<span><i class="gbPct" style="background:' + COL.warn + '"></i>alertă: galben atenție · gri info · roșu critic (' + evs.length + ')</span>'];
      return { svg: svg, inaltime: H, legenda: Lg.join(""), harta: { bare: B, S: S, cw: cw, plotW: plotW, grupuri: gr2, per: o.per, f: f, W: W, H: H, lo: lo, hi: hi, mainH: mainH } };
    }
    if (!o.actiune) Lg.push('<span><i class="gbPct" style="background:' + COL.bad + '"></i>critic</span><span><i class="gbPct" style="background:' + COL.warn + '"></i>atenție</span><span><i class="gbPct" style="background:' + COL.info + '"></i>info</span>');
    if (o.actiune) { if (f > 1) Lg.push('<span class="mutedInfo">o lumânare = ' + cate(f, "zi", "zile") + ' de bursă</span>'); }
    else Lg.push('<span class="mutedInfo">' + cate(evs.length, "alertă", "alerte") + ' ale botului în perioadă' + (f > 1 ? " · o lumânare = " + cate(f, "bară", "bare") : "") + '</span>');
    return { svg: svg, inaltime: H, legenda: Lg.join(""), harta: { bare: B, S: S, cw: cw, plotW: plotW, grupuri: gr2, per: o.per, f: f, W: W, H: H, lo: lo, hi: hi, mainH: mainH } };
  }

  // ce spune cursorul la x (in coordonatele SVG-ului): bara, indicatorii, alertele din apropiere - totul scapat
  // v100.98 (el: „lumânarea live”): ultima lumânare urmează prețul live; după capătul perioadei ei începe una nouă (copie, lista primită rămâne)
  function cuPretViu(bare, pret, acum) {
    pret = nr(pret); if (pret === null || !(pret > 0) || !Array.isArray(bare) || bare.length < 2) return bare;
    var pas = bare[1].t - bare[0].t, u = bare[bare.length - 1], out = bare.slice(); if (!(pas > 0)) return bare;
    if (acum < u.t + pas) out[out.length - 1] = { t: u.t, o: u.o, h: Math.max(u.h, pret), l: Math.min(u.l, pret), c: pret, v: u.v };
    else out.push({ t: u.t + Math.floor((acum - u.t) / pas) * pas, o: u.c, h: Math.max(u.c, pret), l: Math.min(u.c, pret), c: pret, v: 0 });
    return out;
  }
  function pretLaY(harta, sy) { return harta && sy >= 0 && sy <= harta.mainH ? harta.lo + (1 - sy / harta.mainH) * (harta.hi - harta.lo) : null; }
  function tip(harta, sx, sy, laPret) {
    if (!harta || !harta.bare.length || sx < 0 || sx > harta.plotW) return "";
    var bi = Math.max(0, Math.min(harta.bare.length - 1, Math.floor(sx / harta.cw))), b = harta.bare[bi], S = harta.S, lung = harta.per && harta.per !== "24h";
    var r = function (et, v, cls) { return '<div class="gbR"><span class="mutedInfo">' + et + '</span><span' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</span></div>'; };
    var px = pretLaY(harta, sy), lp = px !== null && typeof laPret === "function" ? laPret(px) : null;
    var h = (lp ? '<div class="gbLa">' + lp + '</div>' : '') + '<b>' + esc(ora(b.t, lung)) + '</b>' + r("deschidere", fmtP(b.o)) + r("maxim", fmtP(b.h)) + r("minim", fmtP(b.l)) + r("închidere", fmtP(b.c), b.c >= b.o ? "good" : "bad") + r("volum", Math.round(b.v).toLocaleString("ro-RO"));
    if (S.rsi[b.k] != null) h += r("RSI 14", Math.round(S.rsi[b.k]));
    if (S.adx && S.adx.adx[b.k] != null) h += r("ADX 14", Math.round(S.adx.adx[b.k]) + " · " + zonaAdx(S.adx.adx[b.k]));
    if (S.tr && S.tr[b.k]) h += r("trend", NUME_DIR[S.tr[b.k].dir], S.tr[b.k].dir === "urca" ? "good" : S.tr[b.k].dir === "coboara" ? "bad" : "");   /* v100.106 */
    if (S.e20[b.k] != null) h += r("EMA 20", fmtP(S.e20[b.k]));
    if (S.e50[b.k] != null) h += r("EMA 50", fmtP(S.e50[b.k]));
    var g = null; harta.grupuri.forEach(function (u) { if (Math.abs(u.x - sx) < 12 && (!g || Math.abs(u.x - sx) < Math.abs(g.x - sx))) g = u; });
    if (g) h += '<div class="gbEv">' + g.l.slice(-4).map(function (a) { return '<div><span class="' + (a.nivel === "critic" ? "bad" : a.nivel === "atentie" ? "neutral" : "mutedInfo") + '">●</span> ' + esc(ora(a.t, lung)) + ' ' + esc(String(a.titlu || "").replace(/^[A-Z0-9._-]+: /, "")) + '</div>'; }).join("") + (g.l.length > 4 ? '<div class="mutedInfo">+' + (g.l.length - 4) + ' mai vechi</div>' : '') + '</div>';
    return h;
  }

  return { COL: COL, ziObisnuita: ziObisnuita, ziObisnuitaActiune: ziObisnuitaActiune, niveluriActiune: niveluriActiune, bare: bare, umpleri: umpleri, liniiPionex: liniiPionex, ema: ema, bollinger: bollinger, rsi: rsi, niveluriBot: niveluriBot, grupeaza: grupeaza, desen: desen, tip: tip, esc: esc, adx: adx, citire: citire, pretLaY: pretLaY, cuPretViu: cuPretViu, intrareBot: intrareBot, cuSanse: cuSanse, stopProba: stopProba, semafor: semafor, TF_SEM: TF_SEM };
})();
if (typeof globalThis !== "undefined") globalThis.GraficBot = GraficBot;
