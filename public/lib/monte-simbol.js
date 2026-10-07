// v100.128 - Monte Carlo pe un coin sau un stock ales (el 07.10: „fă montecarlo să facă și analiza pe un coin sau stock ales” → „toate trei”):
// (1) încotro poate merge prețul, (2) un bot grid pe coin (același simulator ca fișa Grid), (3) istoria lui pe acel simbol.
// Modul PUR (fără DOM, fără rețea). Drumurile = bucăți REALE din istoria simbolului (block bootstrap: zilele agitate rămân lipite),
// rescalate să continue de la prețul de acum. Generatorul: mulberry32 cu sămânță fixă (lecția Busolei: LCG-ul își pierde precizia).
// E trecutul reluat, nu o predicție: o criză nouă poate fi mai rea decât orice drum simulat.
var MonteSimbol = (function () {
  "use strict";
  function generator(seed) { var a = (Number(seed) >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function pc(v, p) { return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null; }   // v sortat crescător
  // n bare dintr-un drum: bucăți de câte `bloc` bare consecutive din b, fiecare rescalată să înceapă de la închiderea de dinainte
  // (raportul deschidere / închiderea zilei de dinainte - gap-ul - rămâne cel real)
  // mu (opțional) = media log-randamentului pe bară, scoasă din fiecare bară: drumul păstrează agitația, nu tendința perioadei
  // (o monedă nouă care a căzut 50% într-o lună nu se „prezice” mai departe); mu = 0 ⇒ drumul simplu
  function drum(b, n, bloc, pret0, rnd, mu) {
    var out = [], cur = pret0, t = 0, k = mu ? Math.exp(-mu) : 1;
    while (out.length < n) {
      var i = 1 + Math.floor(rnd() * (b.length - bloc));
      for (var j = 0; j < bloc && out.length < n; j++) { var x = b[i + j], f = cur / b[i + j - 1].c * k; out.push({ t: t++, o: x.o * f, h: x.h * f, l: x.l * f, c: x.c * f, v: x.v }); cur = out[out.length - 1].c; }
    }
    return out;
  }
  function tendinta(b) { var s = 0, n = 0; for (var i = 1; i < b.length; i++) if (b[i].c > 0 && b[i - 1].c > 0) { s += Math.log(b[i].c / b[i - 1].c); n++; } return n ? s / n : 0; }
  // (1) prețul: pe fiecare orizont (în bare - zile), cum se împart rezultatele și cât de des atinge stopul / ținta întâi.
  // Aceeași bară atinge ambele ⇒ se numără STOPUL (nu știm ordinea; pesimist, ca la o probă cinstită).
  // barePeZi: 1 pe bare zilnice (stock), 96 pe bare de 15 minute (monedă nouă, cu puține zile pe 1D); orizonturile și blocul în ZILE
  function pret(b, o) {
    o = o || {}; var bz = o.barePeZi || 1, minZ = o.minZile || 60, zi = Math.floor((b ? b.length : 0) / bz);
    if (!Array.isArray(b) || b.length < minZ * bz) return { eroare: "Prea puțin istoric ca să simulez: " + cate(zi, "zi", "zile") + "; îmi trebuie cel puțin " + minZ + "." };
    var n = o.n || 2000, bloc = (o.blocZile || o.bloc || 5) * bz, sp = o.stopPct > 0 ? o.stopPct : 0.1, tp = o.tintaPct > 0 ? o.tintaPct : 0.15, prag = o.prag > 0 ? o.prag : 0.1;
    var mu = tendinta(b), fara = o.cuTendinta !== true;
    function trece(Z, j, m) {
      var H = Z * bz, rnd = generator((o.seed || 1) * 1000 + j), ret = [], sus = 0, jos = 0, st = 0, ti = 0;
      for (var s = 0; s < n; s++) {
        var d = drum(b, H, Math.min(bloc, H), 1, rnd, m), atins = null;
        for (var i = 0; i < d.length && !atins; i++) { if (d[i].l <= 1 - sp) atins = "stop"; else if (d[i].h >= 1 + tp) atins = "tinta"; }
        if (atins === "stop") st++; else if (atins === "tinta") ti++;
        var r = d[d.length - 1].c - 1; ret.push(r); if (r >= prag) sus++; if (r <= -prag) jos++;
      }
      ret.sort(function (a, c) { return a - c; });
      // istoricul sub 3× orizontul ⇒ simularea doar reamestecă aceleași zile (spus pe pagină)
      return { H: Z, scurt: zi < 3 * Z, p5: pc(ret, 0.05), p25: pc(ret, 0.25), p50: pc(ret, 0.5), p75: pc(ret, 0.75), p95: pc(ret, 0.95), pSus: sus / n, pJos: jos / n, pStop: st / n, pTinta: ti / n, pNiciuna: (n - st - ti) / n, hist: histograma(ret, 24) };
    }
    var orizonturi = (o.orizonturi || [7, 30]).map(function (Z, j) {
      var r = trece(Z, j, fara ? mu : 0);
      // cât de mult contează tendința perioadei: aceeași simulare, cu ea păstrată (doar cifrele de bază, pentru comparație)
      if (fara) { var c = trece(Z, j, 0); r.cuTendinta = { p50: c.p50, pSus: c.pSus, pJos: c.pJos, pStop: c.pStop, pTinta: c.pTinta }; }
      return r;
    });
    return { n: n, blocZile: bloc / bz, barePeZi: bz, zileIstoric: zi, stopPct: sp, tintaPct: tp, prag: prag, faraTendinta: fara, tendintaPeZi: Math.exp(mu * bz) - 1, orizonturi: orizonturi };
  }
  // histograma pentru grafic: k coloane între percentila 1% și 99% (cozile intră în prima / ultima coloană)
  function histograma(v, k) {
    var lo = pc(v, 0.01), hi = pc(v, 0.99); if (!(hi > lo)) hi = lo + 1e-9;
    var c = new Array(k).fill(0), w = (hi - lo) / k;
    for (var i = 0; i < v.length; i++) c[Math.max(0, Math.min(k - 1, Math.floor((v[i] - lo) / w)))]++;
    return { lo: lo, hi: hi, n: v.length, c: c };
  }
  // (2) botul grid: GridProba.simuleaza (exact fișa Grid: grilele, comisioanele, lichidarea) pe drumuri de 15 minute compuse din zile întregi
  function grid(b15, st, o) {
    o = o || {}; var GP = o.GridProba || (typeof GridProba !== "undefined" ? GridProba : null), BZ = 96, zile = o.zile || 7, H = zile * BZ;
    if (!GP) return { eroare: "lipsește simulatorul gridului" };
    if (!Array.isArray(b15) || b15.length < 7 * BZ) return { eroare: "Prea puțin istoric ca să simulez botul: " + cate(Math.floor((b15 ? b15.length : 0) / BZ), "zi", "zile") + " pe 15 minute; îmi trebuie cel puțin 7." };
    var n = o.n || 1000, P = st.pret > 0 ? st.pret : b15[b15.length - 1].c, suma = st.suma > 0 ? st.suma : 100, mu = tendinta(b15), fara = o.cuTendinta !== true;
    // fără tendința perioadei (implicit), ca la preț: un short pe o lună care a căzut nu iese „bun” doar din căderea care a fost
    function trece(m) {
      var rnd = generator(o.seed || 1), net = [], lich = 0, ies = 0, opr = 0, per = 0;
      for (var s = 0; s < n; s++) {
        var d = drum(b15, H, BZ, P, rnd, m), r = GP.simuleaza(d, 0, H, { jos: st.jos, sus: st.sus, grile: st.grile, levier: st.levier, dir: st.dir, stop: st.stop || null });
        net.push(r.net * suma); if (r.lichidat) lich++; if (r.iesiri > 0) ies++; if (r.oprit) opr++; per += r.perechi || 0;
      }
      net.sort(function (a, c) { return a - c; });
      return { n: n, zile: zile, zileIstoric: Math.floor(b15.length / BZ), p5: pc(net, 0.05), p25: pc(net, 0.25), p50: pc(net, 0.5), p75: pc(net, 0.75), p95: pc(net, 0.95),
        pLichidare: lich / n, pIesire: ies / n, pStop: opr / n, pPlus: net.filter(function (x) { return x > 0; }).length / n, perechiMedii: per / n, hist: histograma(net, 24) };
    }
    var r = trece(fara ? mu : 0); r.faraTendinta = fara; r.tendintaPeZi = Math.exp(mu * BZ) - 1;
    if (fara) { var c = trece(0); r.cuTendinta = { p50: c.p50, pPlus: c.pPlus, pLichidare: c.pLichidare, pStop: c.pStop }; }
    return r;
  }
  // (3) istoria lui pe simbol: o lună cu K cazuri trase la întâmplare (cu întoarcere) din ale lui; bani = rezultatul fiecăruia
  function istorie(l, o) {
    o = o || {}; var c = (Array.isArray(l) ? l : []).filter(function (x) { return x && isFinite(x.bani); });
    if (!c.length) return { cazuri: 0 };
    var K = Math.max(1, Math.round(o.K || 1)), n = o.n || 2000, rnd = generator(o.seed || 1), v = [];
    for (var s = 0; s < n; s++) { var t = 0; for (var k = 0; k < K; k++) t += c[Math.floor(rnd() * c.length)].bani; v.push(t); }
    v.sort(function (a, b) { return a - b; });
    var r = { cazuri: c.length, K: K, p5: pc(v, 0.05), p50: pc(v, 0.5), p95: pc(v, 0.95), pPlus: v.filter(function (x) { return x > 0; }).length / n,
      total: c.reduce(function (s, x) { return s + x.bani; }, 0), pePlus: c.filter(function (x) { return x.bani > 0; }).length, putine: c.length < 10 };
    if (r.putine) r.lista = c.slice();
    return r;
  }
  return { generator: generator, drum: drum, pret: pret, grid: grid, istorie: istorie, histograma: histograma };
})();
if (typeof globalThis !== "undefined") globalThis.MonteSimbol = MonteSimbol;
