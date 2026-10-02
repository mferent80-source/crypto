// Probabilitatile din istoric (v100.46, pachetul 2a, 01.10 - el: „partea de probabilități bazate pe istoric ... mai aprofundată”).
// Modul pur, probat in scripts/proba-v10046.mjs. Se incarca DUPA grid-calcul.js. Pe barele de 1 ORA ale monedei (6 luni, colectorul):
// FRECVENTE din trecut, nu predictii. Pornirile la fiecare 4 h, doar cele al caror orizont s-a incheiat; starea la pornire din barele
// de pana atunci (regimul fisei pe 1 h: 4 h si 24 h fata de obisnuitul ultimelor 30 de zile); „ca acum” = aceeasi stare (sub 5 cazuri
// independente: toate zilele, spus). Cazurile independente = ferestrele care nu se suprapun; intervalul Wilson pe ele.
var Probabilitati = (function () {
  "use strict";
  var G = GridCalcul, ORA = 3600000, ISTORIE = 720, PAS = 4, MIN_INDEP = 5;
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // doar barele INCHEIATE pana la acum, in ordine
  function pregateste(bare, acum) {
    var a = nr(acum) || Date.now();
    return (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && x.t + ORA <= a; }).sort(function (x, y) { return x.t - y.t; });
  }
  // v100.47 (pachetul 2b): starea = regimul fisei SI directia pe 24 h fata de obisnuitul monedei (r24h >= 0,5 -> dupa semn). Pe date
  // reale „liniste” singura acoperea ~78% din ferestre; asa se imparte in laterala / urca incet / coboara incet.
  function stareDinRegim(r) {
    if (!r) return null;
    var dir = nr(r.r24h) !== null && r.r24h >= 0.5 ? (nr(r.s24h) > 0 ? "sus" : "jos") : "lateral";
    return (r.miscare ? "miscare" : "liniste") + "-" + dir;
  }
  var ETICHETE = { "liniste-lateral": "liniște, laterală", "liniste-sus": "liniște, urcă încet", "liniste-jos": "liniște, coboară încet", "miscare-sus": "mișcare în sus", "miscare-jos": "mișcare în jos", "miscare-lateral": "mișcare fără direcție" };
  function regimDin(s) { return s ? String(s).split("-")[0] : null; }
  function stareLa(bare, i) {
    if (!Array.isArray(bare) || i < ISTORIE || i >= bare.length) return null;
    return stareDinRegim(G.regimPeBare(bare.slice(i - ISTORIE, i + 1), 4, 24));
  }
  function indep(n, H, pas) { return Math.max(1, Math.min(n, Math.floor(n * (pas || PAS) / H))); }
  // ev(bare, i, H, st) -> rezultatul ferestrei care incepe la inchiderea barei i (sir); se numara cele egale cu `asteptat`
  // v100.53 (actiunile T212): opt.cfg = adaptorul de piata {istorie, pas, continuu, stareLa, regimDin}; fara cfg - crypto, ca pana acum
  function frecventa(bare, H, ev, asteptat, stareAcum, opt) {
    if (!Array.isArray(bare) || !(H > 0)) return null;
    var cfg = (opt && opt.cfg) || {}, IST = cfg.istorie || ISTORIE, PS = cfg.pas || PAS, SL = cfg.stareLa || stareLa, RD = cfg.regimDin || regimDin;
    var tot = { n: 0, k: 0 }, sel = { n: 0, k: 0 }, rg = { n: 0, k: 0 }, memo = (opt && opt.memo) || {}, regAcum = RD(stareAcum);
    var st = function (i) { if (!(i in memo)) memo[i] = SL(bare, i); return memo[i]; };
    for (var i = bare.length - 1 - H; i >= IST; i -= PS) {
      if (cfg.continuu !== false && bare[i + H].t - bare[i].t !== H * ORA) continue;   // fereastra cu gaura nu se numara (la actiuni: zilele de bursa sunt la rand)
      var r = ev(bare, i, H, st); if (r === null || r === undefined) continue;
      tot.n++; if (r === asteptat) tot.k++;
      if (stareAcum) { var si = st(i); if (si === stareAcum) { sel.n++; if (r === asteptat) sel.k++; } if (RD(si) === regAcum) { rg.n++; if (r === asteptat) rg.k++; } }
    }
    // caderea in trepte: starea exacta -> acelasi regim -> toate (fiecare treapta cere >= 5 cazuri independente)
    var ok = function (q) { return q.n > 0 && indep(q.n, H, PS) >= MIN_INDEP; };
    var nivel = stareAcum && ok(sel) ? "exact" : stareAcum && ok(rg) ? "regim" : "toate";
    if (opt && opt.doarConditionat && nivel === "toate") return null;
    var x = nivel === "exact" ? sel : nivel === "regim" ? rg : tot;
    if (!x.n) return null;
    var ni = indep(x.n, H, PS), ki = Math.round(x.k / x.n * ni);
    return { p: x.k / x.n, n: x.n, k: x.k, nIndep: ni, ic: G.wilson(ki, ni), orizontOre: H, conditionat: nivel !== "toate", nivel: nivel, stare: nivel === "exact" ? stareAcum : nivel === "regim" ? regAcum : null };
  }
  function atinge(rel) {
    return function (b, i, H) {
      var niv = b[i].c * (1 + rel);
      for (var j = i + 1; j <= i + H; j++) if (rel < 0 ? b[j].l <= niv : b[j].h >= niv) return "da";
      return "nu";
    };
  }
  // cine e atins INTAI: tinta (relT) sau stopul (relS); amandoua in aceeasi bara -> stop (pesimist)
  function cursa(relT, relS) {
    return function (b, i, H) {
      var t = b[i].c * (1 + relT), s = b[i].c * (1 + relS), sus = relT > relS;
      for (var j = i + 1; j <= i + H; j++) {
        var aS = sus ? b[j].l <= s : b[j].h >= s, aT = sus ? b[j].h >= t : b[j].l <= t;
        if (aS) return "stop";
        if (aT) return "tinta";
      }
      return "niciuna";
    };
  }
  // ---- v100.53 (actiunile T212, pachetul 2): adaptorul pe bare ZILNICE ----
  // starea = trendul pe zilnice (ActiuniSemnale.stare: sus / lateral / jos) x miscare / liniste; „regimul” pentru caderea in trepte = trendul
  function stareActiuneLa(b, i) {
    if (!Array.isArray(b) || i < 60 || i >= b.length || typeof ActiuniSemnale === "undefined") return null;
    var s = ActiuniSemnale.stare(b.slice(0, i + 1), b[i].c), d = s && s.trend && s.trend.dir;
    if (!d || d === "fara-date") return null;
    return d + "-" + (s.miscare && s.miscare.mare ? "miscare" : "liniste");
  }
  function trendDin(s) { return s ? String(s).split("-")[0] : null; }
  var CFG_ACT = { istorie: 60, pas: 1, continuu: false, stareLa: stareActiuneLa, regimDin: trendDin };
  // o = { pret, stop, tinta, acum } -> stopul maine (atins in zi, FARA saritura), saritura peste stop la deschidere (separat), tinta inaintea
  // stopului in 5 zile de bursa. Barele: doar zilele incheiate (bara zilei in curs o scoate bareBursa; aici t < acum).
  function pentruActiune(bare, o) {
    o = o || {};
    var a = nr(o.acum) || Date.now(), p = nr(o.pret);
    var b = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.o) > 0 && nr(x.l) > 0 && nr(x.h) >= nr(x.l) && nr(x.c) > 0 && x.t < a; }).sort(function (x, y) { return x.t - y.t; });
    if (b.length < 120 || !(p > 0)) return null;
    // revizia 01.10 (I1): o.memo = starile zilelor, refolosite cat raman aceleasi bare (pagina recalculeaza la fiecare pret, ieftin)
    var memo = o.memo || {}, stare = (b.length - 1) in memo ? memo[b.length - 1] : (memo[b.length - 1] = stareActiuneLa(b, b.length - 1)), op = { memo: memo, cfg: CFG_ACT };
    var out = { la: a, pret: p, stare: stare, bare: b.length, stop1: null, sare1: null, cursa5: null, motiv: null };
    var stop = nr(o.stop), tinta = nr(o.tinta);
    if (stop === null || !(stop > 0)) { out.motiv = "fără stop"; return out; }
    if (stop >= p) { out.motiv = "stopul e deja depășit (prețul e sub el)"; return out; }
    var relS = stop / p - 1, relT = tinta !== null && tinta > p ? tinta / p - 1 : null;
    out.stop1 = frecventa(b, 1, function (bb, i) { var niv = bb[i].c * (1 + relS); return bb[i + 1].o > niv && bb[i + 1].l <= niv ? "da" : "nu"; }, "da", stare, op);
    out.sare1 = frecventa(b, 1, function (bb, i) { return bb[i + 1].o <= bb[i].c * (1 + relS) ? "da" : "nu"; }, "da", stare, op);
    if (relT !== null) { var ev = cursa(relT, relS); out.cursa5 = { tinta: frecventa(b, 5, ev, "tinta", stare, op), stop: frecventa(b, 5, ev, "stop", stare, op) }; }
    return out;
  }
  // v100.53: ce a urmat dupa o cumparare - primele 5 zile de bursa DUPA ziua cumpararii (ziua ei nu intra: nu stim ora fata de min/max);
  // tinta inaintea stopului -> 1, altfel 0 (amandoua in aceeasi zi -> 0, pesimist); sub 5 zile dupa -> null
  function rezultatCumparare(bare, pornit, stop, tinta) {
    var z0 = Math.floor(nr(pornit) / 864e5), f = (Array.isArray(bare) ? bare : []).filter(function (x) { return x && Math.floor(x.t / 864e5) > z0; }).sort(function (x, y) { return x.t - y.t; });
    if (f.length < 5 || !(stop > 0) || !(tinta > 0)) return null;
    for (var i = 0; i < 5; i++) { if (f[i].l <= stop) return 0; if (f[i].h >= tinta) return 1; }
    return 0;
  }
  // revizia 01.10 (I2 + I4): cifra de la cumparare si ce a urmat. undefined = INCA nu se poate judeca (sub 5 zile de bursa dupa) - se
  // reface la tura urmatoare; null = niciodata (sub 120 de zile inainte, niveluri fara risc, pret nepotrivit cu barele - split)
  function probLaCumparare(inainte, bare, t, nv, potrivit) {
    if (!potrivit || !t || !(t.pretCumparare > 0) || !nv || nv.nivel !== "ok" || !(nv.d > 0) || !Array.isArray(inainte) || inainte.length < 120) return null;
    var sp = t.pretCumparare - nv.d, tp = t.pretCumparare + 2 * nv.d;
    var pa = pentruActiune(inainte, { pret: t.pretCumparare, stop: sp, tinta: tp, acum: t.pornit }), p = pa && pa.cursa5 && pa.cursa5.tinta ? pa.cursa5.tinta.p : null;
    if (p === null) return null;
    var r = rezultatCumparare(bare, t.pornit, sp, tp);
    return r === null ? undefined : { p: Math.round(p * 1000) / 1000, r: r, zi: Math.floor(t.pornit / 864e5) };
  }
  // calibrarea pe cumpararile lui: un caz pe ticker la cel putin 7 zile calendaristice (~5 de bursa) de ultimul caz al tickerului (cumpararile
  // din aceeasi zi = un caz); cutiile ca la crypto (calibreaza / corecteaza). cf[id].prob = {p, r}
  function calibrareActiuni(inchise, cf) {
    var out = { "act-cursa5": { cutii: [0, 1, 2, 3, 4].map(function () { return { n: 0, k: 0 }; }) } }, ultim = {}, sp = 0, sr = 0, n = 0, sapt = {};
    (Array.isArray(inchise) ? inchise : []).filter(function (t) { return t && nr(t.pornit) !== null; }).sort(function (a, b) { return a.pornit - b.pornit; }).forEach(function (t) {
      var pr = cf && cf[t.id] && cf[t.id].prob; if (!pr || (pr.r !== 0 && pr.r !== 1) || nr(pr.p) === null) return;
      var k = t.ticker || t.simbol || t.id; if (k in ultim && t.pornit - ultim[k] < 7 * 864e5) return; ultim[k] = t.pornit;
      var c = out["act-cursa5"].cutii[Math.min(4, Math.floor(pr.p * 5))]; c.n++; c.k += pr.r;
      n++; sp += nr(pr.p); sr += pr.r; sapt[Math.floor(t.pornit / (7 * 864e5))] = 1;
    });
    // revizia 01.10 (I3): rezumatul - ce am zis in medie si ce s-a intamplat, si in cate saptamani (cazurile dintr-o saptamana se misca impreuna)
    out.rezumat = { n: n, pMed: n ? sp / n : null, rata: n ? sr / n : null, saptamani: Object.keys(sapt).length };
    return out;
  }
  // v100.53: randurile pentru pagina T212 (forma tbProbRandHtml: {titlu, p, ic, text, avertizare}); o = {rezultateZile, evenimente}
  var ET_ACT = { sus: "trend în sus", lateral: "lateral", jos: "trend în jos" };
  function etActiune(s) { if (!s) return ""; var p = String(s).split("-"); return (ET_ACT[p[0]] || p[0]) + (p[1] === "miscare" ? ", în mișcare" : ", liniștit"); }
  function randActiune(rez, cal, o) {
    o = o || {}; var out = [], PCt = function (v) { return Math.round(v * 100) + "%"; };
    if (!rez) return out;
    if (rez.motiv && !rez.stop1) return [{ titlu: "Probabilitățile stopului: " + rez.motiv, p: null, ic: null, text: "" }];
    var unde = function (x) { return x.nivel === "exact" ? "zile ca acum (" + etActiune(x.stare) + ")" : x.nivel === "regim" ? "zile cu același trend (" + (ET_ACT[x.stare] || x.stare) + "; cu mișcarea de acum: prea puține)" : "din toate zilele (ca acum: prea puține)"; };
    var ic = function (x) { return x && x.ic ? " · IC " + Math.round(x.ic[0] * 100) + "–" + Math.round(x.ic[1] * 100) + "%" : ""; };
    // v100.69 (sfaturile concise, pachetul 4): marcajul scurt; avertizarea comuna („un semn, nu o regulă”) sta in legenda
    var putine = function (x) { return x.nIndep < 10 ? " · puține cazuri independente" : ""; };
    var a = rez.stop1, s = rez.sare1, relS = rez.niv && rez.niv.relS;
    if (a && s) {
      var pt = a.p + s.p, ki = a.k + s.k;
      out.push({ titlu: "Atinge stopul mâine", p: pt, ic: G.wilson(Math.round(pt * a.nIndep), a.nIndep), text: ki + " din " + a.n + " " + unde(a) + " · din care prin săritură la deschidere: " + PCt(s.p) + putine(a), avertizare: pt >= 0.25 });
    }
    if (rez.cursa5 && rez.cursa5.tinta) {
      // revizia 01.10 (I3): cifra ACTIUNII ramane; calibrarea (alt stop / alta tinta - ale Radarului la cumparare - si cutii late) e doar nota
      var x = rez.cursa5.tinta, rz = cal && cal.rezumat;
      var nota = rz && rz.n >= 20 ? "pe cumpărările tale (cu stopul și ținta Radarului la cumpărare): am zis în medie " + PCt(rz.pMed) + ", s-a întâmplat în " + PCt(rz.rata) + ", din " + cate(rz.n, "caz", "cazuri") + " în " + cate(rz.saptamani, "săptămână", "săptămâni")
        : "pe cumpărările tale: " + cate(rz ? rz.n : 0, "caz judecat", "cazuri judecate") + " — sub 20 nu spun nimic";
      out.push({ titlu: "În 5 zile de bursă: ținta înaintea stopului", p: x.p, ic: x.ic, text: x.k + " din " + x.n + " " + unde(x) + " · stopul întâi: " + PCt(rez.cursa5.stop ? rez.cursa5.stop.p : 0) + putine(x) + " · " + nota, avertizare: false });
    }
    // v100.69: si saritura poarta marcajul pe esantion mic (il avea doar „Atinge stopul mâine”)
    if (s) out.push({ titlu: "Deschiderea sare peste stop", p: s.p, ic: s.ic, text: s.k + " din " + s.n + " " + unde(s) + " — stopul se execută atunci sub prețul lui" + ic(s) + putine(s), avertizare: s.p >= 0.05 });
    var z = nr(o.rezultateZile);
    if (z !== null && z >= 0 && z <= 5) {
      // v100.69: o fraza ≤ 160 - e si explicatia motivului „Rezultatele vin” din Consilierul pozitiei, unde „de mai sus” n-ar avea sens.
      // Sensul ramane cel din M1 (v100.53): ferestrele istorice INCLUD zilele de rezultate; cifrele nu tin cont ca rezultatele cad ACUM
      var ev = o.evenimente || {}, nuTin = "nu țin cont că rezultatele cad în zilele astea, iar stopul poate fi sărit la deschidere.";
      out.push({ titlu: "Rezultatele vin în " + z + (z === 1 ? " zi" : " zile"), p: null, ic: null, avertizare: true,
        text: nr(ev.max) !== null ? "Săriturile mari (de obicei la rezultate): ~" + PCt(nr(ev.mediana) || 0) + ", maxim " + PCt(ev.max) + "; cifrele 🎲 " + nuTin : "Cifrele 🎲 " + nuTin });
    }
    return out;
  }
  function pentruBot(bare, o) {
    o = o || {};
    var b = pregateste(bare, o.acum), p = nr(o.pret), dir = String(o.dir || "").toLowerCase();
    if (b.length < ISTORIE + 24 * 7 || !(p > 0)) return null;
    var stare = stareLa(b, b.length - 1); if (!stare) return null;
    var memo = {}, op = { memo: memo }, rel = function (x) { x = nr(x); return x !== null && x > 0 ? x / p - 1 : null; };
    var jos = rel(o.jos), sus = rel(o.sus), lich = rel(o.lichidare), tinta = rel(o.tinta), stop = rel(o.stop);
    var F = function (H, r) { return r === null || r === 0 ? null : frecventa(b, H, atinge(r), "da", stare, op); };
    var out = { la: nr(o.acum) || Date.now(), pret: p, stare: stare, bare: b.length, niveluri: { jos: nr(o.jos), sus: nr(o.sus), lichidare: nr(o.lichidare), tinta: nr(o.tinta), stop: nr(o.stop) },
      iese: { jos24: jos !== null && jos < 0 ? F(24, jos) : null, sus24: sus !== null && sus > 0 ? F(24, sus) : null, jos72: jos !== null && jos < 0 ? F(72, jos) : null, sus72: sus !== null && sus > 0 ? F(72, sus) : null },
      lichidare7: null, cursa: null, liniste: null };
    var lung = dir === "long", scurt = dir === "short";
    if ((lung && lich !== null && lich < 0) || (scurt && lich !== null && lich > 0)) out.lichidare7 = F(168, lich);
    // revizia 01.10: stopul dincolo de lichidare n-ar fi atins niciodata (lichidarea vine intai) -> fara cursa
    var cursaOk = tinta !== null && stop !== null && (lung ? tinta > 0 && stop < 0 && (lich === null || stop > lich) : scurt ? tinta < 0 && stop > 0 && (lich === null || stop < lich) : false);
    if (cursaOk) { var ev = cursa(tinta, stop); out.cursa = { tinta: frecventa(b, 168, ev, "tinta", stare, op), stop: frecventa(b, 168, ev, "stop", stare, op) }; }
    if (regimDin(stare) === "liniste") {
      // liniștea „mai ține” = oricare stare de liniste (directia poate sa se schimbe)
      var ramane = function () { return function (bb, i, h, st) { var s = st(i + h); return s === null ? null : regimDin(s) === "liniste" ? "da" : "nu"; }; };
      out.liniste = { z1: frecventa(b, 24, ramane(), "da", stare, { memo: memo, doarConditionat: true }), z2: frecventa(b, 48, ramane(), "da", stare, { memo: memo, doarConditionat: true }) };
    }
    return out;
  }
  // ---- jurnalul si calibrarea: fiecare cifra aratata se noteaza (colectorul, la 4 h pe bot) si se judeca dupa orizontul ei ----
  // Calibrarea e out-of-sample prin constructie: se judeca doar ce s-a notat INAINTE sa se stie rezultatul.
  var TIPURI = { "iese-jos-24": ["iese", "jos24"], "iese-sus-24": ["iese", "sus24"], "iese-jos-72": ["iese", "jos72"], "iese-sus-72": ["iese", "sus72"], "lichidare-7": ["lichidare7"], "cursa-tinta": ["cursa", "tinta"], "liniste-24": ["liniste", "z1"], "liniste-48": ["liniste", "z2"] };
  function ia(rez, cale) { var x = rez; for (var i = 0; i < cale.length && x; i++) x = x[cale[i]]; return x && nr(x.p) !== null ? x : null; }
  function intrari(rez, c) {
    if (!rez || !c) return [];
    var nv = rez.niveluri || {}, out = [], pr = nr(rez.pret);
    // sensul (sus/jos) din pretul de la notare - fara el, un gridJos lipsa ar fi intors lichidarea unui long pe SUS (revizia 01.10)
    var susDe = function (niv) { return pr !== null ? nr(niv) > pr : nr(niv) > nr(nv.jos); };
    Object.keys(TIPURI).forEach(function (tip) {
      var x = ia(rez, TIPURI[tip]); if (!x) return;
      var ev = /^iese-jos/.test(tip) ? { fel: "atinge", nivel: nv.jos, sus: false } : /^iese-sus/.test(tip) ? { fel: "atinge", nivel: nv.sus, sus: true }
        : tip === "lichidare-7" ? { fel: "atinge", nivel: nv.lichidare, sus: susDe(nv.lichidare) } : tip === "cursa-tinta" ? { fel: "cursa", tinta: nv.tinta, stop: nv.stop } : { fel: "liniste" };
      out.push({ t: c.t, bot: String(c.bot), simbol: String(c.simbol), tip: tip, p: Math.round(x.p * 1000) / 1000, H: x.orizontOre, ev: ev });
    });
    return out;
  }
  // 1 = s-a intamplat, 0 = nu, null = orizontul n-are inca bare complete (colectorul oprit nu inventeaza)
  function judeca(e, bare) {
    if (!e || !Array.isArray(bare) || !(e.H > 0)) return null;
    // fereastra incepe la prima ora intreaga de dupa notare (acum-ul colectorului nu cade pe ora fixa)
    var t0 = Math.ceil(e.t / ORA) * ORA, f = bare.filter(function (b) { return b.t >= t0 && b.t < t0 + e.H * ORA; });
    if (f.length < e.H || f[f.length - 1].t !== t0 + (e.H - 1) * ORA) return null;
    var v = e.ev || {};
    if (v.fel === "atinge") return f.some(function (b) { return v.sus ? b.h >= v.nivel : b.l <= v.nivel; }) ? 1 : 0;
    if (v.fel === "cursa") { var sus = v.tinta > v.stop; for (var i = 0; i < f.length; i++) { if (sus ? f[i].l <= v.stop : f[i].h >= v.stop) return 0; if (sus ? f[i].h >= v.tinta : f[i].l <= v.tinta) return 1; } return 0; }
    if (v.fel === "liniste") { var k = -1; for (var j = 0; j < bare.length; j++) if (bare[j].t === t0 + (e.H - 1) * ORA) { k = j; break; } var s = k >= 0 ? stareLa(bare, k) : null; return s === null ? null : regimDin(s) === "liniste" ? 1 : 0; }
    return null;
  }
  // revizia 01.10 (critic): notarile unui bot la 4 h pe 7 zile se suprapun aproape complet - 20 de intrari ar fi un singur episod de
  // piata. Se numara doar cazurile INDEPENDENTE: pe bot si tip, intrarile la cel putin H una de alta (intrarile fara t/bot/H - fiecare).
  function calibreaza(l) {
    var out = {}, ultim = {};
    (Array.isArray(l) ? l : []).filter(function (e) { return e && (e.r === 0 || e.r === 1) && nr(e.p) !== null; }).sort(function (a, b) { return (nr(a.t) || 0) - (nr(b.t) || 0); }).forEach(function (e) {
      if (nr(e.t) !== null && e.bot !== undefined && nr(e.H) > 0) { var cheie = e.bot + "|" + e.tip; if (cheie in ultim && e.t - ultim[cheie] < e.H * ORA) return; ultim[cheie] = e.t; }
      var c = out[e.tip] || (out[e.tip] = { cutii: [0, 1, 2, 3, 4].map(function () { return { n: 0, k: 0 }; }) }), i = Math.min(4, Math.floor(e.p * 5));
      c.cutii[i].n++; c.cutii[i].k += e.r;
    });
    return out;
  }
  var PC = function (v) { return Math.round(v * 100) + "%"; };
  // v100.71 (revizia pachetului 4, I1): „1 caz”, „45 de cazuri” - TextRo.cate; rezerva simpla unde TextRo nu e incarcat (probele vechi)
  function cate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + (Number(n) === 1 ? sg : pl); }
  // pragurile calibrarii (20 de cazuri pe cutie, 15 puncte) sunt ipoteze de casa - spuse in nota sectiunii
  function corecteaza(p, tip, cal) {
    var c = cal && cal[tip] && cal[tip].cutii && cal[tip].cutii[Math.min(4, Math.floor(p * 5))];
    if (!c || c.n < 20) return { p: p, brut: p, calibrat: false, n: c ? c.n : 0, k: c ? c.k : 0, avertizare: false, text: "necalibrat încă" + (c && c.n ? " (" + cate(c.n, "caz independent judecat", "cazuri independente judecate") + ")" : "") };
    var q = Math.round(c.k / c.n * 1000) / 1000, mij = Math.min(4, Math.floor(p * 5)) * 20 + 10, txt = "calibrat: când am zis ~" + mij + "%, s-a întâmplat în " + PC(q) + " din " + cate(c.n, "caz independent", "cazuri independente");
    // lichidarea nu se coboara niciodata sub cifra bruta (principiul 5: lichidarea nu tace) - corectarea se spune alaturi
    if (tip === "lichidare-7" && q < p) return { p: p, brut: p, calibrat: false, n: c.n, k: c.k, avertizare: false, text: txt + " (la lichidare țin cifra brută, cea mai prudentă)" };
    return { p: q, brut: p, calibrat: true, n: c.n, k: c.k, avertizare: Math.abs(q - p) > 0.15, text: txt };
  }
  function fr(x, tip, cal) {
    var c = corecteaza(x.p, tip, cal);
    // cifra corectata vine cu intervalul EI (Wilson pe cutie, pe cazurile independente), nu cu al cifrei brute (revizia 01.10)
    var ic = c.calibrat ? G.wilson(c.k, c.n) : x.ic;
    var t = x.k + " din " + x.n + " " + (x.nivel === "regim" ? "situații cu același regim (" + (x.stare === "liniste" ? "liniște" : "mișcare") + "; cu direcția de acum: prea puține)" : x.conditionat ? "situații ca acum" : "de porniri la 4 h (toate; situații ca acum: prea puține)") + " (≈ " + x.nIndep + " independente" + (c.calibrat ? "" : ", IC " + Math.round(x.ic[0] * 100) + "–" + Math.round(x.ic[1] * 100) + "%") + ")"
      + (x.nIndep < 10 ? " · puține cazuri independente" : "")   // trader.md §1: sub 10 pe grupa = zgomot; v100.69: avertizarea comuna sta in legenda
      + " · " + c.text + (c.calibrat ? ", IC " + Math.round(ic[0] * 100) + "–" + Math.round(ic[1] * 100) + "%" + (c.avertizare ? " — ⚠ cifra brută era " + PC(c.brut) : "") : "");
    return { p: c.p, ic: ic, avertizare: c.avertizare, text: t };
  }
  // preturile ca pe Tablou (SemnaleBot.fmtPret)
  function fp(v) { v = nr(v); if (v === null) return "?"; var s = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v > 0 && v < 1e-6 ? v.toFixed(Math.min(12, 3 - Math.floor(Math.log10(v)))) : v.toPrecision(4); return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  // v100.47: orele incheiate din 15M de dupa ultima bara de 1 h (fisa: barele de 1 h din KV sunt de azi-noapte) - doar orele COMPLETE
  function imbina(b1, b15, acum) {
    var a = pregateste(b1, acum), u = a.length ? a[a.length - 1].t : -Infinity, lim = nr(acum) || Date.now(), gr = {};
    (Array.isArray(b15) ? b15 : []).forEach(function (x) {
      if (!x || nr(x.t) === null) return;
      var h = Math.floor(x.t / ORA) * ORA; if (h <= u || h + ORA > lim) return;
      (gr[h] = gr[h] || []).push(x);
    });
    var noi = Object.keys(gr).map(Number).sort(function (x, y) { return x - y; }).filter(function (h) { return gr[h].length === 4; }).map(function (h) {
      var g = gr[h].sort(function (x, y) { return x.t - y.t; });
      return { t: h, o: g[0].o, h: Math.max.apply(null, g.map(function (x) { return x.h; })), l: Math.min.apply(null, g.map(function (x) { return x.l; })), c: g[3].c };
    });
    return a.concat(noi);
  }
  function randuri(rez, cal, o) {
    if (!rez) return [];
    var out = [], nv = rez.niveluri || {}, add = function (cod, titlu, x, tip) { if (x && x.nIndep >= 3) { var y = fr(x, tip, cal); out.push({ cod: cod, titlu: titlu, p: y.p, ic: y.ic, avertizare: y.avertizare, text: y.text }); } };   // sub 3 independente: nu spune nimic
    add("cursa", o && o.titluCursa ? String(o.titluCursa) : "Ținta planului (" + fp(nv.tinta) + ") înaintea stopului (" + fp(nv.stop) + "), în 7 zile", rez.cursa && rez.cursa.tinta, "cursa-tinta");
    add("iese-jos-24", "Atinge marginea de jos (" + fp(nv.jos) + ") în 24 h", rez.iese && rez.iese.jos24, "iese-jos-24");
    add("iese-sus-24", "Atinge marginea de sus (" + fp(nv.sus) + ") în 24 h", rez.iese && rez.iese.sus24, "iese-sus-24");
    add("iese-jos-72", "Atinge marginea de jos în 3 zile", rez.iese && rez.iese.jos72, "iese-jos-72");
    add("iese-sus-72", "Atinge marginea de sus în 3 zile", rez.iese && rez.iese.sus72, "iese-sus-72");
    add("lichidare", "Atinge lichidarea (" + fp(nv.lichidare) + ") în 7 zile", rez.lichidare7, "lichidare-7");
    add("liniste-24", "Liniștea mai ține o zi", rez.liniste && rez.liniste.z1, "liniste-24");
    add("liniste-48", "Liniștea mai ține două zile", rez.liniste && rez.liniste.z2, "liniste-48");
    return out;
  }
  // randul din Consilier: cursa, daca exista; altfel iesirea pe partea de pierdere in 24 h
  function rand(rez, cal, dir, o) {
    var l = randuri(rez, cal, o), r = l.filter(function (x) { return x.cod === "cursa"; })[0] || l.filter(function (x) { return x.cod === (dir === "short" ? "iese-sus-24" : "iese-jos-24"); })[0];
    return r ? "🎲 " + r.titlu.charAt(0).toLowerCase() + r.titlu.slice(1) + ": " + Math.round(r.p * 100) + "% — " + r.text : null;
  }
  return { probLaCumparare: probLaCumparare, randActiune: randActiune, rezultatCumparare: rezultatCumparare, calibrareActiuni: calibrareActiuni, pentruActiune: pentruActiune, stareActiuneLa: stareActiuneLa, imbina: imbina, stareDinRegim: stareDinRegim, ETICHETE: ETICHETE, pregateste: pregateste, stareLa: stareLa, frecventa: frecventa, atinge: atinge, cursa: cursa, pentruBot: pentruBot, intrari: intrari, judeca: judeca, calibreaza: calibreaza, corecteaza: corecteaza, randuri: randuri, rand: rand, ORA: ORA };
})();
