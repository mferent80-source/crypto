// Dovezile Jurnalului de trade (v100.358, auditul statistic din 17–18.11 pe 2.455 de boți / 259 de zile). Modul pur (fără DOM, fără rețea),
// probat în scripts/proba-v100358-dovezi.mjs. Se încarcă DUPĂ text-ro.js și jurnal-trade.js; lucrează pe lista JurnalTrade.din(boti).
//
// De ce există (ce a arătat auditul): „greșelile care te-au costat” adunate dădeau −34.583 față de un net de −6.775 (se suprapun, iar două
// sunt definite prin rezultat); trei „greșeli” aveau boți MAI BUNI decât fără ele; „Regulile tale” (Wilson 95% fără corecție, pe brut, 103
// grupe) scoteau din întâmplare 2,4 reguli în medie; „Dacă ascultai de Radar” nu se deosebea de o blocare la întâmplare. Aici totul e refăcut
// cinstit, NIMIC șters:
//   - dovezile se numără pe ZILE (Europe/Bucharest): boții din aceeași zi se mișcă împreună, nu sunt dovezi separate;
//   - o grupă cere n ≥ 10 boți ȘI ≥ 10 zile, altfel „puține date”; „nedovedit” nu înseamnă „s-a dovedit că nu”;
//   - aleatorul e DOAR mulberry32 cu sămânță fixă (din numele grupei / codului) ⇒ pagina dă aceeași cifră la fiecare deschidere;
//   - totul pe NET (realizat + comisioane + funding).
// Ziua unui bot: ziua PORNIRII pentru întrebările de decizie (greșeli, reguli, martor, găleți) - atunci s-a hotărât; ziua ÎNCHIDERII pentru
// bani (curba pe zile, luni, rapoarte) - atunci s-au încasat.
var JurnalDovezi = (function () {
  "use strict";
  var TZ = "Europe/Bucharest", ORA = 3600000, ZI = 86400000;
  var B_BOOT = 1000, B_PERM = 200, B_MARTOR = 1000, MIN_N = 10, MIN_ZILE = 10;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  var TR = typeof TextRo !== "undefined" ? TextRo : null;
  function U(v) { return TR ? TR.usdt(v) : v === null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; }
  function N1(v) { return TR ? TR.num(v, 1) : v === null || !isFinite(v) ? "—" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ","); }
  function PC(f) { return f === null || !isFinite(f) ? "—" : TR ? TR.pct(f * 100, 1) : (f * 100).toFixed(1).replace(".", ",") + "%"; }
  function cate(n, sg, pl) { if (TR && TR.cate) return TR.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

  // ---- aleatorul: mulberry32 (NICIODATĂ LCG / Math.random); sămânța din nume, ca o grupă nouă să nu le mute pe celelalte ----
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function samanta(s) { s = String(s); var h = 358; for (var i = 0; i < s.length; i++) h = Math.imul(h, 31) + s.charCodeAt(i) | 0; return h; }

  // ---- ziua și ora în România. Fusul se schimbă doar la oră fixă UTC ⇒ ținem minte pe ORĂ (câteva mii de intrări pe toată istoria) ----
  var fmt = null;
  try { fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }); } catch (e) { fmt = null; }
  var memo = {}, nMemo = 0;
  function laOra(ts) {
    var h = Math.floor(ts / ORA), m = memo[h];
    if (m) return m;
    var z, o;
    if (fmt) { var p = {}; fmt.formatToParts(new Date(h * ORA)).forEach(function (x) { p[x.type] = x.value; }); z = p.year + "-" + p.month + "-" + p.day; o = Number(p.hour) % 24; }
    else { var d = new Date(h * ORA + 2 * ORA); z = d.toISOString().slice(0, 10); o = d.getUTCHours(); }
    if (++nMemo > 200000) { memo = {}; nMemo = 0; }
    return (memo[h] = { z: z, o: o });
  }
  function ziRo(ts) { ts = nr(ts); return ts === null ? null : laOra(ts).z; }
  function oraRo(ts) { ts = nr(ts); return ts === null ? null : laOra(ts).o; }
  function utcZi(ymd) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
  function plusZile(ymd, k) { return new Date(utcZi(ymd) + k * ZI).toISOString().slice(0, 10); }
  function zileIntre(a, b) { return Math.round((utcZi(b) - utcZi(a)) / ZI); }
  function ziSapt(ymd) { return (new Date(utcZi(ymd)).getUTCDay() + 6) % 7; }   // 0 = luni
  // miezul nopții în România pentru o zi (ms): ora României e UTC+2 sau UTC+3
  function inceputZi(ymd) {
    var u = utcZi(ymd);
    for (var k = 3; k >= 1; k--) { var t = u - k * ORA; if (ziRo(t) === ymd && ziRo(t - 1) !== ymd) return t; }
    return u - 2 * ORA;
  }
  var LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
  function dataScurta(ymd) { return ymd ? ymd.slice(8, 10) + "." + ymd.slice(5, 7) + "." + ymd.slice(2, 4) : "—"; }

  // ---- boții pregătiți: net, brut, ziua pornirii / închiderii. Fără net sau fără ore = lăsați deoparte (lipsa rămâne lipsă) ----
  function netDe(t) {
    var n = nr(t.net); if (n !== null) return n;
    var r = nr(t.rezultat); return r === null ? null : r + (nr(t.comisioane) || 0) + (nr(t.funding) || 0);
  }
  function prep(l) {
    var b = [];
    (Array.isArray(l) ? l : []).forEach(function (t) {
      if (!t) return;
      var net = netDe(t), p = nr(t.pornit), i = nr(t.inchis);
      if (net === null || p === null || i === null) return;
      var r = nr(t.rezultat);
      b.push({ t: t, net: net, brut: r === null ? net : r, pornit: p, inchis: i, zp: ziRo(p), zi: ziRo(i), op: oraRo(p) });
    });
    return b;
  }
  function indexZile(P, camp) {
    var m = {}, chei = [], idx = new Int32Array(P.length);
    for (var i = 0; i < P.length; i++) { var z = P[i][camp], k = m[z]; if (k === undefined) { k = m[z] = chei.length; chei.push(z); } idx[i] = k; }
    return { chei: chei, idx: idx };
  }
  function cuant(s, p) { if (!s.length) return null; var i = p * (s.length - 1), lo = Math.floor(i), f = i - lo; return lo + 1 < s.length ? s[lo] * (1 - f) + s[lo + 1] * f : s[lo]; }
  // bootstrap pe ZILE al mediei pe bot (raport de sume): reeșantionez zilele cu înlocuire
  // Intervalul: estimarea ± t(zile − 1) × abaterea standard a bootstrap-ului pe zile. NU percentilele bootstrap-ului: simularea de mărime sub
  // H0 (cozi grele, efect comun al zilei, frecvența diferită pe zile; scratchpad sarcinaA/sim-ic.mjs, 1.500 de istorii) a dat fals la 5%
  // nominal: percentile 6,0% (120 de zile) / 8,1% (30 de zile); ± t × SD-ul bootstrap-ului 5,3% / 6,1%.
  function tCrit(df) {   // cuantila 97,5% a lui Student (Cornish-Fisher; la 5 g.l. 2,571, la 30 2,042)
    if (!(df >= 1)) return Infinity; var z = 1.959964, z3 = z * z * z, z5 = z3 * z * z, z7 = z5 * z * z;
    return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df * df * df);
  }
  function icT(v, est, df) {
    if (v.length < 2 || est === null || !isFinite(est)) return null;
    var m = 0, q = 0, i; for (i = 0; i < v.length; i++) m += v[i]; m /= v.length; for (i = 0; i < v.length; i++) q += (v[i] - m) * (v[i] - m);
    var sd = Math.sqrt(q / (v.length - 1)) * Math.sqrt((df + 1) / df), t = tCrit(df);   // × √(k/(k−1)): bootstrap-ul pe k zile subestimează varianța
    return isFinite(t) ? [est - t * sd, est + t * sd] : null;
  }
  function bootMedie(S, Nn, B, rnd) {
    var D = S.length; if (D < 2) return null;
    var r = [], s0 = 0, n0 = 0;
    for (var i = 0; i < D; i++) { s0 += S[i]; n0 += Nn[i]; }
    for (var b = 0; b < B; b++) { var s = 0, n = 0; for (var j = 0; j < D; j++) { var k = (rnd() * D) | 0; s += S[k]; n += Nn[k]; } if (n > 0) r.push(s / n); }
    return n0 > 0 ? icT(r, s0 / n0, D - 1) : null;
  }
  // grupare cu media pe bot, pe plus, zilele (pornirii) și IC95 pe zile
  function grupeCuIc(P, cheie, etichete, sem) {
    var zz = indexZile(P, "zp"), m = {};
    etichete.forEach(function (et) { m[et] = { et: et, n: 0, net: 0, plus: 0, S: {}, N: {}, Z: {} }; });
    P.forEach(function (p, i) {
      var et = cheie(p); if (et === null || !m[et]) return;
      var g = m[et], d = zz.idx[i]; g.n++; g.net += p.net; if (p.net > 0) g.plus++;
      g.S[d] = (g.S[d] || 0) + p.net; g.N[d] = (g.N[d] || 0) + 1; g.Z[p.zp] = 1;
    });
    return etichete.map(function (et) {
      var g = m[et], ks = Object.keys(g.S), S = ks.map(function (k) { return g.S[k]; }), Nn = ks.map(function (k) { return g.N[k]; }), zile = Object.keys(g.Z).length;
      var putine = g.n < MIN_N || zile < MIN_ZILE;
      return { et: et, n: g.n, zile: zile, net: g.net, netPeBot: g.n ? g.net / g.n : null, pePlus: g.n ? g.plus / g.n : null,
        ic: putine ? null : bootMedie(S, Nn, B_BOOT, mulberry32(samanta(sem + et))), putine: putine };
    });
  }

  // ======================= 1. GREȘELILE, cinstit =======================
  // Codurile „de decizie” (le știi ÎNAINTE să pornești) se judecă: net mediu pe bot CU greșeala și FĂRĂ ea (cu, fara - descriptive), iar
  // diferența judecată e cea ÎN ACEEAȘI ZI (dif; difBrut = cu − fara rămâne pentru cine o vrea), cu IC95 prin bootstrap pe ZILE.
  // Simularea sub H0 (sarcinaA/sim-zile.mjs, 4.000 de verdicte): diferența brută cu bootstrap pe zile dădea 5,1% fals cu zile curate, dar 6,3%
  // când efectul unei zile trecea de miezul nopții (blocuri de 2–7 zile nu reparau: 5,9–6,2%); în aceeași zi efectul zilei se anulează. Codurile definite prin
  // rezultat (poziția a mâncat grilele = brut < 0; a ieșit din grid = prețul de la închidere) NU au verdict de cost - sunt „ce s-a întâmplat”.
  var DECIZIE = ["reintrare", "grile-prea-dese", "levier-peste-sigur"], DESCRIERE = ["pozitia-a-mancat-grilele", "stop-atins", "funding-platit"];   // revizia (G4): funding-ul plătit se știe doar după - e în net, deci „cu ea” iese mecanic mai rău
  var TITLURI = { "reintrare": "Repornit imediat pe aceeași monedă", "grile-prea-dese": "Grile prea dese", "levier-peste-sigur": "Levier peste cel sigur",
    "funding-platit": "Funding plătit mult", "pozitia-a-mancat-grilele": "Poziția a mâncat grilele", "stop-atins": "A ieșit din grid" };
  function are(p, cod) { var g = p.t.greseli; if (!Array.isArray(g)) return null; for (var i = 0; i < g.length; i++) if (g[i] && g[i].cod === cod) return g[i]; return null; }
  function greseli(l, o) {
    o = o || {};
    var P = prep(l), B = o.repetari || B_BOOT, zz = indexZile(P, "zp"), D = zz.chei.length;
    var r = { n: P.length, zile: D, nBotiCuMacarUna: 0, greseli: [], descrieri: [] };
    P.forEach(function (p) { if (Array.isArray(p.t.greseli) && p.t.greseli.length) r.nBotiCuMacarUna++; });
    DECIZIE.forEach(function (cod) {
      var Sc = new Float64Array(D), Nc = new Float64Array(D), Sf = new Float64Array(D), Nf = new Float64Array(D), n = 0, sc = 0, nf = 0, sf = 0, dv = null;
      for (var i = 0; i < P.length; i++) {
        var p = P[i], g = are(p, cod), d = zz.idx[i];
        if (g) { n++; sc += p.net; Sc[d] += p.net; Nc[d]++; if (!dv && g.dataViitoare) dv = g.dataViitoare; }
        else { nf++; sf += p.net; Sf[d] += p.net; Nf[d]++; }
      }
      // diferența ÎN ACEEAȘI ZI: pe fiecare zi cu boți de ambele feluri, (media cu − media fără), ponderată cu nCu·nFără/(nCu+nFără); efectul
      // zilei de piață se anulează, deci nici zilele proaste, nici o mișcare care ține peste miezul nopții nu mai fac o „greșeală” din nimic
      var W = [], C = [], zile = 0, ambele = 0, sw = 0, scw = 0;
      for (var d0 = 0; d0 < D; d0++) {
        if (Nc[d0] > 0) zile++;
        if (Nc[d0] > 0 && Nf[d0] > 0) { var w = Nc[d0] * Nf[d0] / (Nc[d0] + Nf[d0]), c = w * (Sc[d0] / Nc[d0] - Sf[d0] / Nf[d0]); W.push(w); C.push(c); sw += w; scw += c; ambele++; }
      }
      var cu = n ? sc / n : null, fara = nf ? sf / nf : null, dif = ambele ? scw / sw : null;
      var putine = n < MIN_N || zile < MIN_ZILE || nf < MIN_N || ambele < MIN_ZILE, ic = null;
      if (!putine) {
        var rnd = mulberry32(samanta("gr:" + cod)), v = [];
        for (var b = 0; b < B; b++) { var a1 = 0, a2 = 0; for (var j = 0; j < ambele; j++) { var k = (rnd() * ambele) | 0; a1 += C[k]; a2 += W[k]; } if (a2 > 0) v.push(a1 / a2); }
        ic = icT(v, dif, ambele - 1);   // ± t(zile − 1) × SD-ul bootstrap-ului pe zile
      }
      var verdict = putine || !ic ? "putine" : ic[1] < 0 ? "mai-rau" : ic[0] > 0 ? "mai-bine" : "nedovedit";
      var cuc = cate(n, "bot", "boți") + " în " + cate(zile, "zi", "zile");
      var text = !n ? "Niciun bot cu greșeala asta." : putine ? "Doar " + cuc + (ambele < MIN_ZILE && zile >= MIN_ZILE ? " (" + cate(ambele, "zi", "zile") + " cu boți și fără ea)" : "") + ": prea puține date ca să judec (îmi trebuie cel puțin " + cate(MIN_N, "bot", "boți") + " și " + cate(MIN_ZILE, "zi", "zile") + ")."
        : "Cu ea: " + U(cu) + " pe bot (" + cuc + "); fără ea: " + U(fara) + " pe bot. În aceleași zile (" + ambele + "), diferența " + U(dif) + " [" + N1(ic[0]) + "; " + N1(ic[1]) + "] — "
          + (verdict === "mai-rau" ? "mai rău, dovedit pe zile." : verdict === "mai-bine" ? "boții CU ea au mers mai bine, dovedit pe zile: aici nu e o greșeală care te costă." : "nedovedit: nici că strică, nici că nu strică.");
      r.greseli.push({ cod: cod, titlu: TITLURI[cod], n: n, zile: zile, zileAmbele: ambele, cu: cu, fara: fara, difBrut: cu !== null && fara !== null ? cu - fara : null, dif: dif, ic: ic, verdict: verdict, dataViitoare: dv, text: text });
    });
    DESCRIERE.forEach(function (cod) {
      var n = 0, net = 0;
      P.forEach(function (p) { if (are(p, cod)) { n++; net += p.net; } });
      r.descrieri.push({ cod: cod, titlu: TITLURI[cod], n: n, net: net });
    });
    return r;
  }

  // ======================= 2. „REGULILE TALE”, cinstit =======================
  // Grupele ca în Obiceiuri.reguliPersonale, DAR fără durată (se știe abia la închidere ⇒ nu poate fi un sfat la pornire): ora pornirii pe 4
  // intervale, moneda, direcția. Statistica de grupă: z pe abaterea NETULUI fiecărui bot față de media boților porniți în ACEEAȘI ZI (difZi),
  // adunată pe grupă, cu eroarea standard pe ZILE (varianța din sumele pe zi ale abaterilor grupei, corecție k/(k−1) pe numărul de zile).
  // De ce în aceeași zi: o monedă la modă într-o lună proastă ar ieși „regulă” doar din piață - simularea sub H0 cu regimuri de săptămâni
  // (AR 0,8 pe zi, monede la modă pe perioade; sarcinaA/sim-reguli.mjs) dădea 8,0% istorii cu reguli false față de media tuturor. De ce media netului și nu rata pe plus: banii sunt
  // ce contează (o grupă care câștigă des, dar puțin, nu e „bună”), iar împărțirea la eroarea pe zile o face rezistentă la o zi proastă cu mulți
  // boți; de ce pe zile: boții aceleiași zile nu sunt dovezi separate.
  // Pragul familiei prin PERMUTARE: amestec netul între boți (200 de repetări, mulberry32), iau maximul |z| pe toate grupele testate, pragul =
  // percentila 95 a maximului ⇒ în medie cel mult ~5% din istoriile fără niciun efect scot măcar o „regulă”.
  // Familia = grupele cu n ≥ 10 ȘI ≥ 10 zile (cerința nu depinde de rezultat, deci nu strică pragul).
  function etOra(o) { return o < 6 ? "00–06" : o < 12 ? "06–12" : o < 18 ? "12–18" : "18–24"; }
  function etDurata(h) { return h < 1 ? "sub o oră" : h < 6 ? "1–6 ore" : "peste 6 ore"; }
  function wilsonSus(k, n) { if (!(n > 0)) return 1; var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return Math.min(1, (c + m) / d); }
  function reguli(l, o) {
    o = o || {};
    var P = prep(l), n = P.length, B = o.repetari || B_PERM, zz = indexZile(P, "zp");
    var net = new Float64Array(n), brut = new Float64Array(n), medie = 0, plusB = 0, di = zz.idx, nd = zz.chei.length, cnt = new Float64Array(nd), sZi = new Float64Array(nd), vv = new Float64Array(n), eReal = new Float64Array(n);
    for (var i1 = 0; i1 < n; i1++) cnt[di[i1]]++;
    P.forEach(function (p, i) { net[i] = p.net; brut[i] = p.brut; medie += p.net; if (p.brut > 0) plusB++; });
    medie = n ? medie / n : 0;
    // grupele
    var G = {}, lista = [];
    function pune(cheie, fam, i) { var g = G[cheie]; if (!g) { g = G[cheie] = { grupa: cheie, fam: fam, idx: [], zile: {} }; lista.push(g); } g.idx.push(i); g.zile[zz.idx[i]] = 1; }
    P.forEach(function (p, i) { pune("porniți între " + etOra(p.op), "ora", i); pune("pe " + p.t.moneda, "moneda", i); pune("pe " + (p.t.dir || "—"), "dir", i); });
    var bune = lista.filter(function (g) { g.n = g.idx.length; g.nZile = Object.keys(g.zile).length; return g.n >= MIN_N && g.nZile >= MIN_ZILE; });
    // perechile (grupă, zi): fiecare bot intră în cel mult 3
    var perZi = {}, nPer = 0, perGrupa = [], perBot = new Int32Array(n * 3).fill(-1), nZileG = new Float64Array(bune.length);
    bune.forEach(function (g, gi) {
      nZileG[gi] = g.nZile;
      g.idx.forEach(function (i) { var k = gi + ":" + zz.idx[i], q = perZi[k]; if (q === undefined) { q = perZi[k] = nPer++; perGrupa.push(gi); } for (var s = 0; s < 3; s++) if (perBot[i * 3 + s] < 0) { perBot[i * 3 + s] = q; break; } });
    });
    var acc = new Float64Array(nPer), Sg = new Float64Array(bune.length), Vg = new Float64Array(bune.length), z = new Float64Array(bune.length);
    // abaterea de la media ZILEI pornirii (în e, dacă se cere)
    function abateri(val, perm, e) { sZi.fill(0); var i; for (i = 0; i < n; i++) { vv[i] = val[perm ? perm[i] : i]; sZi[di[i]] += vv[i]; } for (i = 0; i < n; i++) e[i] = vv[i] - sZi[di[i]] / cnt[di[i]]; return e; }
    var eTmp = new Float64Array(n);
    function stat(val, perm) {
      acc.fill(0); Sg.fill(0); Vg.fill(0);
      var ee = abateri(val, perm, perm ? eTmp : eReal);
      for (var i = 0; i < n; i++) { var e = ee[i]; for (var s = 0; s < 3; s++) { var q = perBot[i * 3 + s]; if (q >= 0) acc[q] += e; } }
      for (var q2 = 0; q2 < nPer; q2++) { var gg = perGrupa[q2]; Sg[gg] += acc[q2]; Vg[gg] += acc[q2] * acc[q2]; }
      var mx = 0;
      for (var g = 0; g < bune.length; g++) { var k = nZileG[g], v = Vg[g] * k / (k - 1); z[g] = v > 0 ? Sg[g] / Math.sqrt(v) : 0; if (Math.abs(z[g]) > mx) mx = Math.abs(z[g]); }
      return mx;
    }
    // vechea regulă (Wilson 95% fără corecție, pe BRUT, cu durata, n ≥ 5): câte ar trece - pe date și din întâmplare
    var naivG = {}, naivL = [], naivBot = new Int32Array(n * 4);
    P.forEach(function (p, i) {
      ["porniți între " + etOra(p.op), "pe " + p.t.moneda, "ținuți " + etDurata(nr(p.t.durataOre) !== null ? p.t.durataOre : (p.inchis - p.pornit) / ORA), "pe " + p.t.dir].forEach(function (c, s) {
        var k = naivG[c]; if (k === undefined) { k = naivG[c] = naivL.length; naivL.push(0); } naivL[k]++; naivBot[i * 4 + s] = k;
      });
    });
    var naivPlus = new Float64Array(naivL.length), rataB = n ? plusB / n : 0;
    function naiv(perm) {
      naivPlus.fill(0);
      for (var i = 0; i < n; i++) if (brut[perm ? perm[i] : i] > 0) for (var s = 0; s < 4; s++) naivPlus[naivBot[i * 4 + s]]++;
      var c = 0; for (var k = 0; k < naivL.length; k++) if (naivL[k] >= 5 && wilsonSus(naivPlus[k], naivL[k]) < rataB) c++;
      return c;
    }
    var real = bune.length ? (stat(net, null), Array.prototype.slice.call(z)) : (abateri(net, null, eReal), []);
    var naivDate = n >= 30 ? naiv(null) : 0;
    var maxim = [], zgomot = 0, rnd = mulberry32(samanta("reguli")), perm = new Int32Array(n);
    for (var i0 = 0; i0 < n; i0++) perm[i0] = i0;
    for (var b = 0; b < B && n >= 2; b++) {
      for (var i = n - 1; i > 0; i--) { var j = (rnd() * (i + 1)) | 0, t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
      if (bune.length) maxim.push(stat(net, perm));
      if (n >= 30) zgomot += naiv(perm);
    }
    maxim.sort(function (a, c) { return a - c; });
    var prag = maxim.length ? cuant(maxim, 0.95) : null;
    var toate = bune.map(function (g, gi) {
      var s = 0, pl = 0, se = 0; g.idx.forEach(function (i) { s += net[i]; se += eReal[i]; if (net[i] > 0) pl++; });
      return { grupa: g.grupa, fam: g.fam, n: g.n, zile: g.nZile, pePlus: pl / g.n, netPeBot: s / g.n, net: s, difZi: se / g.n, z: real[gi], trece: prag !== null && Math.abs(real[gi]) >= prag };
    });
    var R = toate.filter(function (g) { return g.trece; }).sort(function (a, c) { return a.z - c.z; }).map(function (g) {
      var semn = g.z < 0 ? -1 : 1;
      return { grupa: g.grupa, n: g.n, zile: g.zile, pePlus: g.pePlus, netPeBot: g.netPeBot, net: g.net, difZi: g.difZi, z: g.z, semn: semn,
        text: "Boții " + g.grupa + ": " + U(g.netPeBot) + " pe bot (" + cate(g.n, "bot", "boți") + " în " + cate(g.zile, "zi", "zile") + ", " + PC(g.pePlus) + " pe plus), total " + U(g.net) + "; față de ceilalți boți porniți în aceleași zile: " + U(g.difZi) + " pe bot — " + (semn < 0 ? "aici pierzi, dovedit pe zile." : "aici câștigi, dovedit pe zile.") };
    });
    // durata: se știe doar la închidere ⇒ raportată separat, NU e sfat la pornire (și nu intră în familia pragului)
    var laInchidere = ["sub o oră", "1–6 ore", "peste 6 ore"].map(function (et) {
      var S = {}, s = 0, k = 0, pl = 0;
      P.forEach(function (p, i) { var h = nr(p.t.durataOre) !== null ? p.t.durataOre : (p.inchis - p.pornit) / ORA; if (etDurata(h) !== et) return; var e = eReal[i], d = zz.idx[i]; S[d] = (S[d] || 0) + e; s += p.net; k++; if (p.net > 0) pl++; });
      var ks = Object.keys(S), Sg2 = 0, V = 0; ks.forEach(function (d) { Sg2 += S[d]; V += S[d] * S[d]; });
      var zz2 = ks.length > 1 && V > 0 ? Sg2 / Math.sqrt(V * ks.length / (ks.length - 1)) : null;
      return { grupa: "ținuți " + et, n: k, zile: ks.length, pePlus: k ? pl / k : null, netPeBot: k ? s / k : null, net: s, difZi: k ? Sg2 / k : null, z: zz2, putine: k < MIN_N || ks.length < MIN_ZILE };
    });
    return { n: n, medie: n ? medie : null, grupeTestate: bune.length, prag: prag, reguli: R, toate: toate, laInchidere: laInchidere,
      notaInchidere: "Durata se știe doar la închidere: e ce s-a întâmplat, nu un sfat la pornire.",
      naiv: { peDate: naivDate, zgomotMediu: n >= 30 && B ? zgomot / B : null, grupe: naivL.filter(function (c) { return c >= 5; }).length } };
  }

  // ======================= 3. MARTORUL LA ÎNTÂMPLARE =======================
  // „Dacă ascultai de Radar” = câștigul blocării (−suma netului boților blocați). Martorul: blochez la întâmplare ACELAȘI număr de boți din
  // aceeași mulțime judecată (l), de 1000 de ori. p = cât de des întâmplarea câștigă cel puțin cât Radarul (cu +1 la numărător și numitor).
  // În plus, peZi: blocarea la întâmplare a aceluiași număr de boți ÎN FIECARE ZI (a pornirii) - întrebarea „a ales Radarul boții mai proști
  // din ziua lor?”, fără norocul zilelor.
  function martor(l, idBlocati, o) {
    o = o || {};
    var P = prep(l), B = o.repetari || B_MARTOR, set = {};
    (idBlocati instanceof Set ? Array.from(idBlocati) : Array.isArray(idBlocati) ? idBlocati : []).forEach(function (id) { set[String(id)] = 1; });
    var n = P.length, net = new Float64Array(n), bl = 0, castig = 0, zz = indexZile(P, "zp"), D = zz.chei.length, peZiBl = new Int32Array(D), peZiIdx = [];
    for (var d0 = 0; d0 < D; d0++) peZiIdx.push([]);
    P.forEach(function (p, i) { net[i] = p.net; peZiIdx[zz.idx[i]].push(i); if (set[String(p.t.id)]) { bl++; castig -= p.net; peZiBl[zz.idx[i]]++; } });
    var r = { n: n, blocati: bl, castig: castig, medieIntamplare: null, p: null, verdict: "putine", peZi: null };
    if (!bl || bl >= n) return r;
    var rnd = mulberry32(samanta("martor")), idx = new Int32Array(n), s = 0, peste = 0;
    for (var i0 = 0; i0 < n; i0++) idx[i0] = i0;
    for (var b = 0; b < B; b++) {
      var c = 0;
      for (var k = 0; k < bl; k++) { var j = k + ((rnd() * (n - k)) | 0), t = idx[k]; idx[k] = idx[j]; idx[j] = t; c -= net[idx[k]]; }
      s += c; if (c >= castig - 1e-9) peste++;
    }
    r.medieIntamplare = s / B; r.p = (peste + 1) / (B + 1);
    r.verdict = bl < MIN_N ? "putine" : r.p <= 0.05 ? "mai-bine-decat-intamplarea" : r.p >= 0.95 ? "mai-rau-decat-intamplarea" : "nedovedit";
    var rnd2 = mulberry32(samanta("martor-pe-zi")), s2 = 0, p2 = 0;
    for (var b2 = 0; b2 < B; b2++) {
      var c2 = 0;
      for (var d = 0; d < D; d++) { var m = peZiBl[d]; if (!m) continue; var L = peZiIdx[d], nl = L.length; for (var k2 = 0; k2 < m; k2++) { var j2 = k2 + ((rnd2() * (nl - k2)) | 0), t2 = L[k2]; L[k2] = L[j2]; L[j2] = t2; c2 -= net[L[k2]]; } }
      s2 += c2; if (c2 >= castig - 1e-9) p2++;
    }
    r.peZi = { medieIntamplare: s2 / B, p: (p2 + 1) / (B + 1) };
    r.text = "Blocând cei " + cate(bl, "bot", "boți") + " câștigai " + U(castig) + "; blocând la întâmplare tot atâția din aceiași " + n + ": " + U(r.medieIntamplare) + " în medie"
      + (r.verdict === "mai-bine-decat-intamplarea" ? " — Radarul a ales mai bine decât întâmplarea (p " + N1(r.p * 100) + "%)." : r.verdict === "nedovedit" ? " — nu se deosebește de întâmplare (p " + N1(r.p * 100) + "%): nedovedit." : r.verdict === "mai-rau-decat-intamplarea" ? " — mai rău decât întâmplarea." : ".");
    return r;
  }

  // ======================= 4. CURBA PE ZILE, „SUB APĂ”, CALENDARUL =======================
  // pe ziua ÎNCHIDERII; toate zilele calendaristice între prima și ultima (zilele fără boți au n 0, net 0), ca „zilele sub vârf” să fie zile
  // adevărate. Vârful pornește de la 0 (începutul), ca în curba banilor din statistică.
  function peZile(l, o) {
    o = o || {};
    var P = prep(l), m = {}, prima = null, ultima = null;
    P.forEach(function (p) { var x = m[p.zi] || (m[p.zi] = { n: 0, net: 0 }); x.n++; x.net += p.net; if (!prima || p.zi < prima) prima = p.zi; if (!ultima || p.zi > ultima) ultima = p.zi; });
    if (o.panaLa && ultima && o.panaLa > ultima) ultima = o.panaLa;
    var lista = [], rez = { zile: 0, zilePePlus: 0, zilePeMinus: 0, caderMax: 0, deLa: null, panaLa: null, dinStart: false, zileSubVarfAcum: 0, celMaiLungSubApa: { zile: 0, de: null, pana: null, recuperat: true }, net: 0, varf: 0, varfLa: null };
    if (!prima) return { lista: lista, rezumat: rez };
    var cum = 0, varf = 0, varfLa = null, sub0 = null, nz = zileIntre(prima, ultima);
    for (var k = 0; k <= nz; k++) {
      var z = plusZile(prima, k), x = m[z] || { n: 0, net: 0 };
      cum += x.net;
      if (x.n) { rez.zile++; if (x.net > 0) rez.zilePePlus++; else if (x.net < 0) rez.zilePeMinus++; }
      if (cum >= varf - 1e-9) { if (cum > varf) varf = cum; if (varf > 1e-9) varfLa = z; }   // vârful (sau revenirea la el); 0-ul de la început = „de la început”
      var sub = Math.min(0, cum - varf);
      if (sub < rez.caderMax) { rez.caderMax = sub;   /* cu semn NEGATIV (−6.789,5 = cât a coborât sub vârf) */ rez.deLa = varfLa; rez.dinStart = varfLa === null; rez.panaLa = z; }
      if (sub < -1e-9) { if (sub0 === null) sub0 = z; var lung = zileIntre(sub0, z) + 1; if (lung > rez.celMaiLungSubApa.zile) rez.celMaiLungSubApa = { zile: lung, de: sub0, pana: z, recuperat: false }; }
      else { if (sub0 !== null && rez.celMaiLungSubApa.de === sub0) rez.celMaiLungSubApa.recuperat = true; sub0 = null; }
      lista.push({ zi: z, n: x.n, net: x.net, cumul: cum, varf: varf, sub: sub });
    }
    rez.net = cum; rez.varf = varf; rez.varfLa = varfLa;
    rez.zileSubVarfAcum = sub0 !== null ? zileIntre(sub0, ultima) + 1 : 0;
    return { lista: lista, rezumat: rez };
  }

  // ======================= 5. CÂȚI BOȚI PORNEȘTI PE ZI =======================
  var GALETI_ZI = [["1–3 boți pe zi", 1, 3], ["4–7 boți pe zi", 4, 7], ["8–15 boți pe zi", 8, 15], ["16+ boți pe zi", 16, Infinity]];
  function botiPeZi(l) {
    var P = prep(l), m = {};
    P.forEach(function (p) { var x = m[p.zp] || (m[p.zp] = { n: 0, net: 0 }); x.n++; x.net += p.net; });
    var zile = Object.keys(m).sort();
    return GALETI_ZI.map(function (gl) {
      var S = [], Nn = [], plus = 0, net = 0, boti = 0;
      zile.forEach(function (z) { var x = m[z]; if (x.n < gl[1] || x.n > gl[2]) return; S.push(x.net); Nn.push(x.n); net += x.net; boti += x.n; if (x.net > 0) plus++; });
      var putine = S.length < MIN_ZILE || boti < MIN_N;
      return { et: gl[0], zile: S.length, boti: boti, n: boti, net: net, netPeBot: boti ? net / boti : null, netPeZi: S.length ? net / S.length : null, zilePePlus: plus,
        ic: putine ? null : bootMedie(S, Nn, B_BOOT, mulberry32(samanta("zi:" + gl[0]))), putine: putine };
    });
  }

  // ======================= 6. PARETO PIERDERILOR =======================
  function pareto(l) {
    var P = prep(l), net = 0, pierd = [];
    P.forEach(function (p) { net += p.net; if (p.net < 0) pierd.push(p); });
    pierd.sort(function (a, b) { return a.net - b.net; });
    var tot = 0; pierd.forEach(function (p) { tot += p.net; });
    var r = { n: P.length, nPierderi: pierd.length, totalPierderi: tot, net: net, praguri: [], puncte: [], cele: [] };
    [5, 10, 20, 50].forEach(function (k) {
      if (k > pierd.length && k !== 5) return;
      var s = 0, kk = Math.min(k, pierd.length); for (var i = 0; i < kk; i++) s += pierd[i].net;
      r.praguri.push({ k: k, kEfectiv: kk, suma: s, dinPierderi: tot < 0 ? s / tot : null, netFara: net - s });
    });
    var pas = Math.max(1, Math.ceil(pierd.length / 200)), c = 0;
    r.puncte.push({ k: 0, pondere: 0 });
    for (var i = 0; i < pierd.length; i++) { c += pierd[i].net; if ((i + 1) % pas === 0 || i === pierd.length - 1 || [5, 10, 20, 50].indexOf(i + 1) >= 0) r.puncte.push({ k: i + 1, pondere: tot < 0 ? c / tot : 0 }); }
    r.cele = pierd.slice(0, 10).map(function (p) { return { id: p.t.id, moneda: p.t.moneda, net: p.net, zi: p.zi }; });
    return r;
  }

  // ======================= 7. PE LUNĂ: GRILE / POZIȚIE / COSTURI =======================
  function peLuna(l) {
    var m = {};
    prep(l).forEach(function (p) {
      var k = p.zi.slice(0, 7), x = m[k] || (m[k] = { luna: k, grile: 0, pozitie: 0, costuri: 0, net: 0, n: 0 }), t = p.t;
      var gr = nr(t.grile), poz = nr(t.pozitie), c = (nr(t.comisioane) || 0) + (nr(t.funding) || 0);
      x.n++; x.net += p.net; x.costuri += c;
      if (gr !== null) { x.grile += gr; x.pozitie += poz !== null ? poz : p.brut - gr; } else x.pozitie += p.brut;   // fără grile defalcate: tot realizatul la poziție
    });
    return Object.keys(m).sort().map(function (k) { var x = m[k]; x.nume = LUNI[+k.slice(5, 7) - 1] + " " + k.slice(2, 4); return x; });
  }

  // ======================= 8. LĂȚIMEA INTERVALULUI ȘI LEVIERUL =======================
  var GALETI_LAT = [["sub 5%", 0, 0.05], ["5–10%", 0.05, 0.10], ["10–20%", 0.10, 0.20], ["20–40%", 0.20, 0.40], ["peste 40%", 0.40, Infinity]];
  function peLatime(l) {
    var P = prep(l).filter(function (p) { var t = p.t; return nr(t.jos) !== null && nr(t.sus) !== null && nr(t.pretInit) > 0 && t.sus > t.jos; });
    var r = grupeCuIc(P, function (p) { var w = (p.t.sus - p.t.jos) / p.t.pretInit; for (var i = 0; i < GALETI_LAT.length; i++) if (w >= GALETI_LAT[i][1] && w < GALETI_LAT[i][2]) return GALETI_LAT[i][0]; return null; }, GALETI_LAT.map(function (g) { return g[0]; }), "lat:");
    r.faraDate = prep(l).length - P.length;
    return r;
  }
  var LEVIER_TREPTE = [[1, "1×"], [2, "2×"], [3, "3×"], [5, "4–5×"], [10, "6–10×"], [20, "11–20×"], [50, "21–50×"], [Infinity, "peste 50×"]];
  function peLevier(l) {
    var P = prep(l).filter(function (p) { return nr(p.t.levier) !== null; });
    var r = grupeCuIc(P, function (p) { var v = nr(p.t.levier); for (var i = 0; i < LEVIER_TREPTE.length; i++) if (v <= LEVIER_TREPTE[i][0]) return LEVIER_TREPTE[i][1]; return null; }, LEVIER_TREPTE.map(function (g) { return g[1]; }), "lev:")
      .filter(function (g) { return g.n > 0; });
    r.faraDate = prep(l).length - P.length;
    return r;
  }

  // ======================= 9. RAPOARTE PE PERIOADĂ =======================
  function masura(P) {
    var r = { n: P.length, net: 0, grile: 0, pozitie: 0, costuri: 0, pePlus: 0, rata: null, celMaiBun: null, celMaiRau: null, bune: [], rele: [] }, mon = {};
    P.forEach(function (p) {
      var t = p.t, gr = nr(t.grile), c = (nr(t.comisioane) || 0) + (nr(t.funding) || 0);
      r.net += p.net; r.costuri += c; if (gr !== null) { r.grile += gr; r.pozitie += p.brut - gr; } else r.pozitie += p.brut;
      if (p.net > 0) r.pePlus++;
      if (!r.celMaiBun || p.net > r.celMaiBun.net) r.celMaiBun = { id: t.id, moneda: t.moneda, net: p.net, zi: p.zi };
      if (!r.celMaiRau || p.net < r.celMaiRau.net) r.celMaiRau = { id: t.id, moneda: t.moneda, net: p.net, zi: p.zi };
      var x = mon[t.moneda] || (mon[t.moneda] = { moneda: t.moneda, n: 0, net: 0 }); x.n++; x.net += p.net;
    });
    r.rata = r.n ? r.pePlus / r.n : null;
    var ml = Object.keys(mon).map(function (k) { return mon[k]; });
    r.bune = ml.filter(function (x) { return x.net > 0; }).sort(function (a, b) { return b.net - a.net; }).slice(0, 3);
    r.rele = ml.filter(function (x) { return x.net < 0; }).sort(function (a, b) { return a.net - b.net; }).slice(0, 3);
    return r;
  }
  function raport(l, de, pana, o) {
    o = o || {};
    de = nr(de); pana = nr(pana);
    if (de === null || pana === null || pana <= de) return null;
    var dF = nr(o.deFata) !== null ? nr(o.deFata) : de - (pana - de), pF = nr(o.panaFata) !== null ? nr(o.panaFata) : de;
    var P = prep(l), a = masura(P.filter(function (p) { return p.inchis >= de && p.inchis < pana; })), f = masura(P.filter(function (p) { return p.inchis >= dF && p.inchis < pF; }));
    var dif = {}; ["n", "net", "grile", "pozitie", "costuri", "pePlus"].forEach(function (k) { dif[k] = a[k] - f[k]; });
    dif.rata = a.rata !== null && f.rata !== null ? a.rata - f.rata : null;
    a.de = de; a.pana = pana; f.de = dF; f.pana = pF; a.dif = dif; a.fata = f;
    return a;
  }
  function perioade(l, fel) {
    var sapt = fel !== "luna", m = {};
    prep(l).forEach(function (p) {
      var k = sapt ? plusZile(p.zi, -ziSapt(p.zi)) : p.zi.slice(0, 7) + "-01";
      (m[k] || (m[k] = { n: 0 })).n++;
    });
    return Object.keys(m).sort().reverse().map(function (k) {
      var urm = sapt ? plusZile(k, 7) : (function () { var y = +k.slice(0, 4), mo = +k.slice(5, 7); return mo === 12 ? (y + 1) + "-01-01" : y + "-" + (mo < 9 ? "0" : "") + (mo + 1) + "-01"; })();
      var ant = sapt ? plusZile(k, -7) : (function () { var y = +k.slice(0, 4), mo = +k.slice(5, 7); return mo === 1 ? (y - 1) + "-12-01" : y + "-" + (mo < 11 ? "0" : "") + (mo - 1) + "-01"; })();
      var et = sapt ? dataScurta(k).slice(0, 5) + "–" + dataScurta(plusZile(k, 6)) : LUNI[+k.slice(5, 7) - 1] + " " + k.slice(0, 4);
      return { cheie: sapt ? k : k.slice(0, 7), fel: sapt ? "saptamana" : "luna", et: et, de: inceputZi(k), pana: inceputZi(urm), deFata: inceputZi(ant), panaFata: inceputZi(k), n: m[k].n };
    });
  }

  return { ziRo: ziRo, oraRo: oraRo, inceputZi: inceputZi, greseli: greseli, reguli: reguli, martor: martor, peZile: peZile, botiPeZi: botiPeZi, pareto: pareto,
    peLuna: peLuna, peLatime: peLatime, peLevier: peLevier, raport: raport, perioade: perioade, mulberry32: mulberry32, MIN_N: MIN_N, MIN_ZILE: MIN_ZILE };
})();
if (typeof globalThis !== "undefined") globalThis.JurnalDovezi = JurnalDovezi;
