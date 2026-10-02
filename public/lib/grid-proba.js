// Grid futures Pionex - proba pe istoric si fisa. Modul pur, probat in
// scripts/grid-v78.mjs. Se incarca DUPA grid-calcul.js.
//
// Simulatorul face ce face Pionex: LONG cumpara la pornire pozitia pentru
// grilele de deasupra pretului, SHORT e oglinda, NEUTRU porneste fara pozitie
// (cumpara dedesubt, vinde deasupra). Fiecare umplere plateste comisionul.
// La final se socoteste TOT: castigul din grile + ce valoreaza pozitia ramasa -
// minusul pe care cifra mare din Pionex nu il arata.
// Drumul in lumanare: verde O->L->H->C, rosie O->H->L->C.
var GridProba = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var G = GridCalcul, C = G.C, DIRECTII = ["long", "neutru", "short"];

  // primul index k cu niv[k] >= x
  function primulPeste(niv, x) { var lo = 0, hi = niv.length; while (lo < hi) { var m = (lo + hi) >> 1; if (niv[m] >= x) hi = m; else lo = m + 1; } return lo; }

  function simuleaza(b, start, lungime, st) {
    // v100.39: com = TAKER (pornire, inchidere, stop), comG = MAKER pe ordinele limita ale grilelor (masurat pe CRV: 0,02%)
    var N = st.grile, niv = G.niveluri(st.jos, st.sus, N), L = st.levier, com = C.COMISION, comG = C.COMISION_GRILA;
    var P = b[start].o, tip = [], tine = [], intr = [], q = [];
    var Ql = 0, Cl = 0, Qs = 0, Cs = 0, real = 0, fee = 0, umpleri = 0, iesiri = 0, perechi = 0;   // perechi = grile INCASATE (o pereche = 2 umpleri; umplerile de pornire nu-s perechi)
    // v100.39 (regula dovedita in v100.38): la pornire, linia cea mai apropiata de pret ramane FARA ordin - la long celula de sub
    // ea nu se cumpara la pornire (se cumpara abia cand pretul coboara la linia ei), la short oglindit
    var ki = 0; for (var kk = 1; kk <= N; kk++) if (Math.abs(niv[kk] - P) < Math.abs(niv[ki] - P)) ki = kk;
    var farOrdin = st.dir === "long" && niv[ki] > P && ki >= 1 ? ki - 1 : st.dir === "short" && niv[ki] < P && ki < N ? ki : -1;
    for (var k = 0; k < N; k++) {
      q[k] = L / N / niv[k]; tine[k] = false;
      if (st.dir === "long") tip[k] = "L";
      else if (st.dir === "short") tip[k] = "S";
      else tip[k] = niv[k + 1] <= P ? "L" : niv[k] >= P ? "S" : null;
      if (k === farOrdin) continue;
      if (st.dir === "long" && niv[k + 1] > P) { tine[k] = true; intr[k] = P; Ql += q[k]; Cl += q[k] * P; fee += q[k] * P * com; umpleri++; }
      if (st.dir === "short" && niv[k] < P) { tine[k] = true; intr[k] = P; Qs += q[k]; Cs += q[k] * P; fee += q[k] * P * com; umpleri++; }
    }
    function umple(k, p) { fee += q[k] * p * comG; umpleri++; }
    function misca(a, x) {
      var j;
      if (x < a) {                              // in jos: niveluri j cu x <= niv[j] < a, celula j
        for (j = primulPeste(niv, a) - 1; j >= 0 && niv[j] >= x; j--) {
          if (j >= N || !tip[j]) continue;
          if (tip[j] === "L" && !tine[j]) { tine[j] = true; intr[j] = niv[j]; Ql += q[j]; Cl += q[j] * niv[j]; umple(j, niv[j]); }
          else if (tip[j] === "S" && tine[j]) { tine[j] = false; real += q[j] * (intr[j] - niv[j]); Qs -= q[j]; Cs -= q[j] * intr[j]; umple(j, niv[j]); perechi++; }
        }
      } else if (x > a) {                       // in sus: niveluri j cu a < niv[j] <= x, celula j-1
        for (j = Math.max(1, primulPeste(niv, a)); j <= N && niv[j] <= x; j++) {
          if (niv[j] === a) continue;
          var c = j - 1;
          if (!tip[c]) continue;
          if (tip[c] === "L" && tine[c]) { tine[c] = false; real += q[c] * (niv[j] - intr[c]); Ql -= q[c]; Cl -= q[c] * intr[c]; umple(c, niv[j]); perechi++; }
          else if (tip[c] === "S" && !tine[c]) { tine[c] = true; intr[c] = niv[j]; Qs += q[c]; Cs += q[c] * niv[j]; umple(c, niv[j]); }
        }
      }
    }
    function capital(p) { return 1 + real - fee + (Ql * p - Cl) + (Cs - Qs * p); }
    function lichidat(p) { return capital(p) <= C.MMR * (Ql + Qs) * p; }
    function rezultat(extra) {
      // v100.16: iesit = pe ce parte l-a inchis stopul/tinta ("jos"/"sus", null = n-a iesit), bare = dupa cate lumanari
      var r = { net: 0, realizat: real, comisioane: fee, iesiri: iesiri, lichidat: false, oprit: false, umpleri: umpleri, perechi: perechi, iesit: null, bare: null };
      for (var e in extra) r[e] = extra[e];
      return r;
    }
    function inchide(p, parte, nb) {
      if (lichidat(p)) return rezultat({ net: -1, lichidat: true, bare: nb });
      real += (Ql * p - Cl) + (Cs - Qs * p); fee += (Ql + Qs) * p * com;
      Ql = Cl = Qs = Cs = 0;
      return rezultat({ net: real - fee, oprit: true, iesit: parte, bare: nb });
    }
    var pret = P, inauntru = true, sj = st.stop ? st.stop.jos : -Infinity, ss = st.stop ? st.stop.sus : Infinity;
    var fin = Math.min(b.length, start + lungime);
    for (var i = start; i < fin; i++) {
      var x = b[i], drum = x.c >= x.o ? [x.o, x.l, x.h, x.c] : [x.o, x.h, x.l, x.c];
      for (var d = 0; d < 4; d++) {
        var p = drum[d];
        if (p <= sj) { misca(pret, sj); if (inauntru) iesiri++; return inchide(sj, "jos", i - start + 1); }
        if (p >= ss) { misca(pret, ss); if (inauntru) iesiri++; return inchide(ss, "sus", i - start + 1); }
        misca(pret, p); pret = p;
        var acum = p >= st.jos && p <= st.sus;
        if (inauntru && !acum) iesiri++;
        inauntru = acum;
        if (lichidat(p)) return rezultat({ net: -1, lichidat: true, bare: i - start + 1 });
      }
    }
    var fee2 = (Ql + Qs) * pret * com;   // comisionul de inchidere la final
    return rezultat({ net: real - fee - fee2 + (Ql * pret - Cl) + (Cs - Qs * pret), bare: fin - start });
  }

  function statistici(rez) {
    if (!rez || !rez.length) return null;
    var net = [], ies = 0, lich = 0, opr = 0, ump = 0, per = 0;
    for (var i = 0; i < rez.length; i++) { net.push(rez[i].net); ies += rez[i].iesiri; ump += rez[i].umpleri || 0; per += rez[i].perechi || 0; if (rez[i].lichidat) lich++; if (rez[i].oprit) opr++; }
    // v99: perechiMedii = cate grile INCASEAZA setarea intr-o fereastra, in medie - "gridul e atins des sau rar?"
    // (umpleriMedii numara si umplerile de pornire - un grid des cu N mare "umple" mult si pe o piata moarta; revizia 28.09)
    return { n: rez.length, mediana: G.mediana(net), ceaMaiProasta: Math.min.apply(null, net), iesiriMedii: ies / rez.length, lichidari: lich, opriri: opr, umpleriMedii: ump / rez.length, perechiMedii: per / rez.length };
  }

  // Platou, nu varf: scorul unei celule = media medianelor ei si a vecinilor
  // (latime +-1, pas +-1). Celulele lichidate nu se aleg; ca vecini, valoreaza
  // -100% (o setare vecina care se lichideaza e o prapastie, nu un plus).
  function alegePlatou(mat) {
    var best = null;
    for (var wi = 0; wi < mat.length; wi++) for (var pi = 0; pi < mat[wi].length; pi++) {
      var c = mat[wi][pi];
      if (!c || c.lichidari > 0 || c.mediana === null) continue;
      var s = 0, n = 0, vec = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
      for (var v = 0; v < vec.length; v++) {
        var r = mat[wi + vec[v][0]], x = r && r[pi + vec[v][1]];
        if (x && x.mediana !== null) { s += x.lichidari > 0 ? -1 : x.mediana; n++; }
      }
      var scor = s / n;
      if (!best || scor > best.scor) best = { wi: wi, pi: pi, scor: scor };
    }
    return best;
  }

  function proba(b15, H) {
    var W = H * C.BARE_ZI;
    if (!b15 || b15.length < 2 * W + C.BARE_ZI) return null;
    var nA = Math.round(b15.length * 2 / 3), A = b15.slice(0, nA);
    var lats = G.latimi(A, H), pasV = G.pasi(A);
    if (lats.length < 3 || !pasV) return null;
    var latV = C.PERCENTILE.map(function (p) { return G.percentila(lats, p); });
    var starturi = [], s, nAntren = 0, nTest = 0;
    for (s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) {
      if (s + W <= nA) { starturi.push({ s: s, t: "a" }); nAntren++; }
      else if (s >= nA) { starturi.push({ s: s, t: "t" }); nTest++; }
    }
    var pe = {}, recomandata = null, scorRec = -Infinity;
    DIRECTII.forEach(function (dir) {
      var mat = [];
      for (var wi = 0; wi < latV.length; wi++) {
        mat.push([]);
        for (var pi = 0; pi < pasV.length; pi++) {
          var ra = [], rt = [];
          for (var j = 0; j < starturi.length; j++) {
            var f = starturi[j], st = G.construieste({ pret: b15[f.s].o, lat: latV[wi], pas: pasV[pi], dir: dir });
            (f.t === "a" ? ra : rt).push(simuleaza(b15, f.s, W, st));
          }
          mat[wi].push({ antren: statistici(ra), test: statistici(rt) });
        }
      }
      var ales = alegePlatou(mat.map(function (r) { return r.map(function (x) { return x.antren; }); }));
      // v99: la latimea aleasa se pastreaza si celula cea mai DEASA (pasul minim, pi = 0) - "varianta deasa" din fisa
      if (ales) {
        pe[dir] = { wi: ales.wi, pi: ales.pi, antren: mat[ales.wi][ales.pi].antren, test: mat[ales.wi][ales.pi].test, platou: ales.scor, faraVarianta: false,
          deasa: { pi: 0, antren: mat[ales.wi][0].antren, test: mat[ales.wi][0].test } };
        if (ales.scor > scorRec) { scorRec = ales.scor; recomandata = dir; }
      } else {
        var d = C.PERC_IMPLICIT;   // nicio varianta fara lichidare: arat varianta de mijloc, cu lichidarile ei
        pe[dir] = { wi: d, pi: 1, antren: mat[d][1].antren, test: mat[d][1].test, platou: null, faraVarianta: true, deasa: { pi: 0, antren: mat[d][0].antren, test: mat[d][0].test } };
      }
    });
    return { H: H, zile: b15.length / C.BARE_ZI, ferestre: { antren: nAntren, test: nTest, independente: Math.floor(b15.length / W) },
      latimi: latV, pasi: pasV, pe: pe, recomandata: recomandata };
  }

  // Trendul si proba nu sunt de acord? Se spune doar cand directia recomandata
  // de proba n-a pierdut nici pe zilele nevazute (altfel validarea a respins-o
  // si "pe istoric a iesit mai bine X" ar fi fals). Vazut pe BTC/SOL, 24.09.
  function contrazice(pr, dir) {
    if (!pr || !pr.recomandata || pr.recomandata === dir) return null;
    var t = pr.pe[pr.recomandata] && pr.pe[pr.recomandata].test;
    if (t && t.mediana !== null && t.mediana < 0) return null;
    return { fisa: dir, proba: pr.recomandata };
  }

  // Minimul pe ordin la Pionex e cel mai mare dintre minNotional (USDT) si
  // cantitatea minima (minSizeLimit) x pret - la BTC 0,0001 BTC bate 1 USDT de 8 ori.
  function minOrdin(o, sus) {
    var m = o.minNotional > 0 ? o.minNotional : 0;
    if (o.minSize > 0 && sus > 0) m = Math.max(m, o.minSize * sus);
    return m > 0 ? m : null;
  }

  // F4 "cat investesc?": suma la care cea mai proasta fereastra de pe istoric nu trece
  // de pierderea acceptata din cont. Fara fereastra pe minus nu se poate socoti (null, nu infinit).
  function sumaMaxima(sold, pierderePct, ceaMaiProasta) {
    if (!(sold > 0) || !(pierderePct > 0) || ceaMaiProasta === null || ceaMaiProasta === undefined || !(ceaMaiProasta < 0)) return null;
    return sold * (pierderePct / 100) / Math.abs(ceaMaiProasta);
  }

  function fisa(o) {
    if (!(o.pret > 0)) return { eroare: "N-am prețul de acum al monedei." };
    if (!o.b15 || o.b15.length < 7 * C.BARE_ZI) return { eroare: "Prea puține lumânări ca să probez: moneda are " + (o.b15 ? o.b15.length / C.BARE_ZI : 0).toFixed(1).replace(".", ",") + " zile de istoric pe 15 minute, iar proba cere cel puțin 7 zile." };
    var pr = proba(o.b15, o.H);
    if (!pr) return { eroare: "Prea puține lumânări ca să probez: trebuie cel puțin " + cate(2 * o.H + 1, "zi", "zile") + " de istoric pe 15 minute." };
    var dT = G.directie(o.b4h, o.b1d), dir = o.dir || dT.dir, ales = pr.pe[dir];
    // v100.39 (audit 30.09): O SINGURA SURSA - setarea afisata e exact cea probata (latimea si pasul din proba, pe primele 2/3 din
    // istoric). Inainte latimea/pasul se refaceau pe TOT istoricul la aceiasi indici, deci verdictul, mediana si „Cât investesc?”
    // vorbeau despre alta setare decat cea de copiat (CRV neutru: probat 8 intervale pe 15,97%, afisat 9 pe 20,84%).
    var pasV = pr.pasi, lat = pr.latimi[ales.wi], pas = pasV[ales.pi];
    // Minimul pe ordin: intai mai putine grile (spec 6.4); suma necesara doar daca nici 2 nu incap.
    function cuMinOrdin(pasX) {
      var s = G.construieste({ pret: o.pret, lat: lat, pas: pasX, dir: dir, suma: o.suma, levier: o.levier });
      var mo = minOrdin(o, s.sus), sm = null;
      if (mo !== null && s.perOrdin < mo) {
        var N2 = Math.floor(s.suma * s.levier / mo);
        if (N2 >= C.GRILE_MIN) {
          var de = s.grile;
          s = G.construieste({ pret: o.pret, lat: lat, pas: pasX, dir: dir, suma: o.suma, levier: o.levier, grile: N2 });
          s.redus = { de: de, la: s.grile, minOrdin: mo };
        } else sm = mo * C.GRILE_MIN / s.levier;
      }
      return { st: s, sumaMinima: sm, mo: mo };
    }
    var a = cuMinOrdin(pas), st = a.st, sumaMinima = a.sumaMinima, mo = a.mo;
    var rg = G.regim(o.b15), poz = G.pozitie7z(o.b4h, o.pret), liniste = G.linisteTine(o.b15, o.H);
    var v = G.verdict({ regim: rg, stat: ales, zile: pr.zile, pozitie: poz, pesteSigur: st.pesteSigur, nesigur: !st.sigur });
    if (sumaMinima !== null) {
      v = { nivel: "nu", motive: ["suma e prea mică: Pionex cere cel puțin " + mo.toFixed(2) + " USDT pe ordin, deci pentru 2 grile la " + st.levier + "× îți trebuie cel puțin " + Math.ceil(sumaMinima) + " USDT"].concat(v.motive) };
    }
    // v99 (28.09, experienta lui): VARIANTA DEASA - pasul minim (0,30%) la aceeasi latime, cu statistica ei din proba si
    // trecerile pe zi; e PROPUSA in locul setarii alese cand piata e linistita si proba n-o respinge (vezi propune/respinge)
    var dst = ales.deasa || null, dd = cuMinOrdin(pasV[0]), rz = respinge(dst);
    var motivDeasa = rz.respinsa ? rz.motiv : dd.sumaMinima !== null ? "suma e prea mică pentru atâtea grile" : !dd.st.sigur ? "nici la 1× lichidarea nu stă destul de departe" : dd.st.pesteSigur ? "levierul ales pune lichidarea prea aproape de grid" : "";
    var deasa = { setare: dd.st, antren: dst ? dst.antren : null, test: dst ? dst.test : null, treceriZi: treceriPeZi(dst && dst.antren, o.H), respinsa: !!motivDeasa, motiv: motivDeasa, aceeasi: ales.pi === 0 };
    var f = { simbol: o.simbol, pret: o.pret, H: o.H, directie: dT, dir: dir, manual: !!o.dir, setare: st, proba: pr, verdict: v,
      regim: rg, pozitie: poz, liniste: liniste, sumaMinima: sumaMinima,
      contra: contrazice(pr, dir), treceriZi: treceriPeZi(ales.antren, o.H), deasa: deasa, aleasa: null, stat: { antren: ales.antren, test: ales.test } };
    f.propusa = propune({ regim: rg, deasa: deasa, setare: st });
    // revizia 28.09: cand fisa PROPUNE gridul des, f.setare E gridul des - o singura sursa pentru Tablou, jurnal, hartie, poarta,
    // suma - iar verdictul e pe statistica LUI; platoul probei ramane la vedere in f.aleasa (setare + verdict + perechi/zi)
    if (f.propusa === "deasa") {
      f.aleasa = { setare: st, verdict: v, treceriZi: f.treceriZi };
      f.stat = { antren: deasa.antren, test: deasa.test };
      f.setare = deasa.setare; f.treceriZi = deasa.treceriZi;
      f.verdict = G.verdict({ regim: rg, stat: f.stat, zile: pr.zile, pozitie: poz, pesteSigur: deasa.setare.pesteSigur, nesigur: !deasa.setare.sigur });
    }
    return f;
  }
  // pe zi = PERECHI incheiate pe fereastra / zilele ferestrei (nu umpleri: cele de pornire umflau cifra la gridurile dese)
  function treceriPeZi(stat, H) { return stat && typeof stat.perechiMedii === "number" && H > 0 ? stat.perechiMedii / H : null; }
  // v99: proba respinge o setare cand pe istoric a fost lichidata sau a iesit pe minus (mediana), sau pe zilele nevazute
  function respinge(stat) {
    var a = stat && stat.antren, t = stat && stat.test;
    if (!a || a.mediana === null || a.mediana === undefined) return { respinsa: true, motiv: "fără probă pe istoric" };
    if (a.lichidari > 0) return { respinsa: true, motiv: "pe istoric a fost lichidată " + G.oriDe(a.lichidari) };
    if (a.mediana < 0) return { respinsa: true, motiv: "pe istoric a ieșit pe minus (mediana " + G.procent(a.mediana) + ")" };
    if (t && t.lichidari > 0) return { respinsa: true, motiv: "pe zilele nevăzute a fost lichidată" };
    if (t && t.mediana !== null && t.mediana !== undefined && t.mediana < 0) return { respinsa: true, motiv: "pe zilele nevăzute a ieșit pe minus (" + G.procent(t.mediana) + ")" };
    return { respinsa: false, motiv: "" };
  }
  // v99: ce propune fisa. v100.39 (30.09, el: „gridurile dese sunt mult prea rare” -> a ales „gridul des MEREU, rarul alături”):
  // "deasa" oricand proba n-a respins-o (nu doar in liniste - in miscare verdictul zice oricum NU PORNI, dar setarile raman cele
  // dese) si e chiar mai deasa decat platoul; altfel "aleasa" (platoul probei, gridul rar). Regula lui, nu o dovada.
  function propune(x) {
    var d = x && x.deasa, s = x && x.setare;
    if (!d || d.respinsa || !d.setare) return "aleasa";
    if (d.setare.pesteSigur || d.setare.sigur === false) return "aleasa";   // lichidarea prea aproape la gridul des
    if (s && d.setare.grile === s.grile) return "aleasa";
    return "deasa";
  }
  // dupa revizia 28.09 f.setare e deja setarea propusa; functia ramane pentru cine o cheama
  function setarePropusa(f) { return f ? f.setare : null; }

  // v100.58 (el, 01.10: „griduri mai înguste, cu profit rapid, pe coinuri sugerate pe direcție”): a doua cautare, ingusta - durata
  // 6/12/24 h, latimile P30/45/60 ale miscarii pe durata (doar pe antrenare), aceiasi pasi; DOAR directia data. Aleasa pe antrenare
  // (platou), raportata pe test; propusa doar cu >= 30 ferestre independente, mediana > 0 si Wilson 95 % „pe plus” > 50 %.
  // Iesirea: stopul sau capatul duratei (simuleaza inchide la final, cu taker) - aceeasi socoteala ca gridul de acum
  var ING = { H: [0.25, 0.5, 1], PERC: [0.30, 0.45, 0.60], MIN_INDEP: 30 };
  // revizia 01.10 (I1): directia pietei LA pornirea unei ferestre, doar din barele de DINAINTEA ei (ultimele 30 de zile, 4 h + 1 zi, ca fisa)
  function directiaLa(b15, s) {
    var x = b15.slice(Math.max(0, s - 30 * C.BARE_ZI), s); if (x.length < 2 * C.BARE_ZI) return null;
    var b4 = G.agrega(x, 4 * 3600000), d = G.directie(b4, G.agrega(b4, 86400000));
    return d && d.dir || null;
  }
  // revizia 01.10 (I2): verdictul pe test - si MEDIA pe plus (un grid castiga des putin si pierde rar mult: mediana singura mintea)
  function verdictIngust(t, ore) {
    var P = function (x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };   // v100.72: „%” lipit, ca in rest
    if (!(t.nIndep >= ING.MIN_INDEP)) return "prea puține ferestre independente pe partea de test (" + (t.nIndep || 0) + " din " + ING.MIN_INDEP + " la " + ore + " h)";
    if (t.lichidari > 0) return "pe partea de test s-a lichidat " + G.oriDe(t.lichidari);
    if (!(t.mediana > 0)) return "pe ultimele zile (test), după comisioane, n-a ieșit pe plus: gridul lat rămâne mai bun";
    if (!(t.medie > 0)) return "pe test, media e pe minus (" + P(t.medie) + "): câștigă des puțin și pierde rar mult, deci gridul lat rămâne mai bun";
    if (!(t.ic && t.ic[0] > 0.5)) return "pe test, ferestrele pe plus nu sunt clar peste jumătate (" + Math.round((t.pePlus || 0) * 100) + "%)";
    return "";
  }
  function ingust(b15, o) {
    o = o || {};
    // v100.61 (proba de ecran, 02.10): si respingerile de la inceput spun pe cate zile s-a uitat (fisa scria „pe undefined de zile”)
    var zile = Array.isArray(b15) && b15.length ? Math.round(b15.length / C.BARE_ZI) : null;
    if (o.miscare) return { propus: false, motiv: "piața e în mișcare mare: nu e momentul pentru un grid îngust", zile: zile };   // v100.72: faptul, nu imperativul
    if (DIRECTII.indexOf(o.dir) < 0) return { propus: false, motiv: "fără direcția pieței pentru monedă", zile: zile };
    if (!b15 || b15.length < 9 * C.BARE_ZI) return { propus: false, motiv: "prea puțin istoric de 15 minute (sub 9 zile)", zile: zile };
    var nA = Math.round(b15.length * 2 / 3), A = b15.slice(0, nA), pasV = G.pasi(A);
    if (!pasV) return { propus: false, motiv: "prea puțin istoric de 15 minute (sub 9 zile)", zile: zile };
    var best = null, Hs = Array.isArray(o.doarH) && o.doarH.length ? o.doarH : ING.H;
    // revizia 01.10 (I1): pe test intra doar ferestrele in care directia de LA pornirea lor (din barele de dinainte) e cea ceruta -
    // directia de azi vine din zilele care stau chiar in treimea de test
    var dirOk = {}; for (var s0 = 0; s0 < b15.length; s0 += C.PAS_FERESTRE) if (s0 >= nA) dirOk[s0] = directiaLa(b15, s0) === o.dir;
    // doar duratele care POT avea >= 30 de ferestre independente pe test (numarul se stie din lungimea istoricului, nu din rezultate -
    // nu e privit in viitor); daca niciuna nu poate, raman toate si motivul o spune
    var poate = Hs.filter(function (H) { var W = Math.round(H * C.BARE_ZI), nT = 0; for (var s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) if (s >= nA) nT++;   /* toate pornirile (nu dirOk: alegerea nu are voie sa depinda de test) */ return Math.floor(nT * C.PAS_FERESTRE / W) >= ING.MIN_INDEP; });
    if (poate.length) Hs = poate;
    Hs.forEach(function (H) {
      var W = Math.round(H * C.BARE_ZI), lats = G.latimi(A, H);
      if (lats.length < 3) return;
      var latV = ING.PERC.map(function (p) { return G.percentila(lats, p); }), mat = [], cel = [];
      latV.forEach(function (lat) {
        var rA = [], rC = [];
        pasV.forEach(function (pas) {
          var ra = [], rt = [];
          for (var s = 0; s + W <= b15.length; s += C.PAS_FERESTRE) {
            if (s + W <= nA) ra.push(simuleaza(b15, s, W, G.construieste({ pret: b15[s].o, lat: lat, pas: pas, dir: o.dir })));
            else if (s >= nA && dirOk[s]) rt.push(simuleaza(b15, s, W, G.construieste({ pret: b15[s].o, lat: lat, pas: pas, dir: o.dir })));
          }
          rA.push(statistici(ra)); rC.push({ lat: lat, pas: pas, rt: rt });
        });
        mat.push(rA); cel.push(rC);
      });
      var a = alegePlatou(mat);
      // intre durate se compara PE ZI (o fereastra de 24 h aduna mai mult decat una de 6 h doar fiindca tine mai mult)
      if (a && (!best || a.scor / H > best.scor / best.H)) best = { scor: a.scor, H: H, W: W, c: cel[a.wi][a.pi], antren: mat[a.wi][a.pi] };
    });
    if (!best) return { propus: false, motiv: "pe istoric, toate variantele înguste s-au lichidat sau n-au avut ferestre: gridul lat rămâne mai bun" };
    var rt = best.c.rt, net = rt.map(function (r) { return r.net; }), st = statistici(rt), plus = net.filter(function (v) { return v > 0; }).length;
    var nIndep = Math.floor(rt.length * C.PAS_FERESTRE / best.W), ic = nIndep > 0 ? G.wilson(Math.round(plus / Math.max(1, rt.length) * nIndep), nIndep) : [0, 1];
    var test = { n: rt.length, nIndep: nIndep, mediana: st ? st.mediana : null, medie: net.length ? net.reduce(function (a, v) { return a + v; }, 0) / net.length : null, pePlus: rt.length ? plus / rt.length : null, ic: ic, celMaiRau: st ? st.ceaMaiProasta : null, perechiZi: st ? st.perechiMedii / best.H : null, lichidari: st ? st.lichidari : 0 };
    var setare = G.construieste({ pret: o.pret > 0 ? o.pret : b15[b15.length - 1].c, lat: best.c.lat, pas: best.c.pas, dir: o.dir, suma: o.suma, levier: o.levier });
    var ore = Math.round(best.H * 24), motiv = verdictIngust(test, ore);
    return { propus: !motiv, motiv: motiv, dir: o.dir, H: best.H, ore: ore, latime: best.c.lat, pas: best.c.pas, setare: setare, antren: best.antren, test: test, zile: Math.round(b15.length / C.BARE_ZI) };
  }
  // un rand pentru ideile de boti
  function rezumatIngust(r) {
    if (!r) return "";
    if (!r.propus || !r.setare || !r.test) return "⚡ grid îngust: nu — " + (r.motiv || "nedovedit");
    var P = function (x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; }, D = { long: "long", short: "short", neutru: "neutru" };
    var nI = cate(r.test.nIndep, "fereastră independentă", "ferestre independente");   // v100.72: „31 de ferestre”, „%” lipit
    return "⚡ grid îngust " + D[r.dir] + ", " + r.ore + " h: " + (r.latime * 100).toFixed(1).replace(".", ",") + "% lățime, " + (r.setare.grile + 1) + " linii, ~" + Math.round(r.test.perechiZi) + " perechi/zi · pe test: median " + P(r.test.mediana) + (r.test.medie != null ? ", medie " + P(r.test.medie) : "")
      + ", " + Math.round(r.test.pePlus * 100) + "% pe plus, cel mai rău " + P(r.test.celMaiRau) + " (" + nI + ")";
  }
  // v100.59 (I-481): botul pornit cu setarile variantei ingusta - aceeasi directie, latimea +-35 %, pornit in 12 h de la propunere
  // -> {ingust, ore, inchideLa}; altfel null. Directia Pionex: long / short / orice altceva = neutru (ca in restul colectorului)
  function potrivireIngust(b, r) {
    if (!b || !r || !r.propus || !(r.latime > 0) || !(r.ore > 0)) return null;
    var d = String(b.directie || "").toLowerCase(), dir = d === "long" ? "long" : d === "short" ? "short" : "neutru";
    var jos = Number(b.jos), sus = Number(b.sus), t = Number(b.pornitLa);
    if (!(jos > 0) || !(sus > jos) || !(t > 0) || dir !== r.dir) return null;
    if (Math.abs((sus / jos - 1) / r.latime - 1) > 0.35) return null;
    // revizia 01.10 (I5): fereastra intr-o singura parte - pornit cel mult cu 15 min inainte de propunere si cel mult 12 h dupa; fara „la” -> null
    if (!(r.la > 0) || t - r.la < -15 * 60000 || t - r.la > 12 * 3600000) return null;
    return { ingust: true, ore: r.ore, inchideLa: t + r.ore * 3600000 };
  }
  // v100.59 (I-480): urmarirea INAINTE - o nota {la, dir, ore, latime, pas} se judeca pe barele de DUPA ea, cu acelasi simulator;
  // sub H ore de bare dupa nota -> null (inca nu)
  function judecaUrmarire(rec, b15) {
    if (!rec || !(rec.ore > 0) || !(rec.latime > 0) || !(rec.pas > 0) || DIRECTII.indexOf(rec.dir) < 0 || !Array.isArray(b15)) return null;
    var i = 0; while (i < b15.length && b15[i].t < rec.la) i++;
    if (i < b15.length && b15[i].t - rec.la > 900000) return null;   /* revizia 01.10 (I3): nota de dinaintea barelor aduse - nu se judeca pe alte zile */
    var W = Math.round(rec.ore / 24 * C.BARE_ZI); if (i + W > b15.length) return null;
    var r = simuleaza(b15, i, W, G.construieste({ pret: b15[i].o, lat: rec.latime, pas: rec.pas, dir: rec.dir }));
    return { net: r.net, oprit: !!r.oprit, lichidat: !!r.lichidat };
  }
  function socotealaUrmarire(l) {
    l = Array.isArray(l) ? l : [];
    // revizia 01.10 (I4): ferestre INDEPENDENTE pe moneda - o nota intra doar daca incepe dupa ce s-a terminat ultima pastrata (nota la 6 h cu
    // durata de 24 h = 4 note suprapuse = un singur caz); notele fara moneda/ora raman fiecare un caz
    var gr = function (f) {
      var ult = {}, ind = l.filter(function (e) { return e && e.r && typeof e.r.net === "number" && f(e); }).slice().sort(function (a, b) { return (a.la || 0) - (b.la || 0); })
        .filter(function (e) { if (!e.simbol || !(e.la >= 0) || !(e.ore > 0)) return true; var u = ult[e.simbol]; if (u !== undefined && e.la < u) return false; ult[e.simbol] = e.la + e.ore * 3600000; return true; });
      var v = ind.map(function (e) { return e.r.net; }), s = 0;
      v.forEach(function (x) { s += x; });
      return { n: v.length, pePlus: v.length ? v.filter(function (x) { return x > 0; }).length / v.length : null, mediana: v.length ? G.mediana(v) : null, medie: v.length ? s / v.length : null };
    };
    var p = gr(function (e) { return e.propus; }), np = gr(function (e) { return !e.propus; }), nej = l.filter(function (e) { return e && !e.r; }).length;
    var P = function (x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };   // v100.72: „%” lipit
    var t = function (g) { return g.n ? Math.round(g.pePlus * 100) + "% pe plus, medie " + P(g.medie) : "—"; };
    var text = !p.n && !np.n ? "Urmărirea înainte începe: " + nej + (nej === 1 ? " notă așteaptă" : " note așteaptă") + " să treacă durata."
      : "Urmărit înainte (după comisioane): propuse " + p.n + " (" + t(p) + ") · nepropuse " + np.n + " (" + t(np) + ")" + (Math.min(p.n, np.n) < 30 ? " — puține cazuri încă" : "");
    return { propuse: p, nepropuse: np, nejudecate: nej, text: text };
  }
  // cat de vechi e rezultatul colectorului (refacut la 6 h): peste 12 h se spune „vechi”
  function varstaIngust(r, acum) {
    var la = r && r.la, ore = la > 0 || la === 0 ? Math.max(0, Math.round(((acum || Date.now()) - la) / 3600000)) : null;
    return { ore: ore, vechi: ore !== null && ore > 12, text: ore === null ? "" : ore > 12 ? "calculat acum " + ore + " h — vechi, colectorul îl reface la 6 h" : "calculat acum " + ore + " h" };
  }
  return { potrivireIngust: potrivireIngust, judecaUrmarire: judecaUrmarire, socotealaUrmarire: socotealaUrmarire, directiaLa: directiaLa, verdictIngust: verdictIngust, ingust: ingust, rezumatIngust: rezumatIngust, varstaIngust: varstaIngust, simuleaza: simuleaza, statistici: statistici, alegePlatou: alegePlatou, proba: proba, contrazice: contrazice, sumaMaxima: sumaMaxima, fisa: fisa,
    respinge: respinge, propune: propune, setarePropusa: setarePropusa, treceriPeZi: treceriPeZi };
})();
if (typeof globalThis !== "undefined") globalThis.GridProba = GridProba;
