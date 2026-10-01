// Grid futures Pionex - calculul setarilor. Modul pur, fara DOM si fara retea,
// probat in scripts/grid-v78.mjs.
// Specul: docs/superpowers/specs/2026-09-24-grid-ce-setez-design.md
//
// Ce NU face: nu promite profit. Busola a masurat gridul pe date nevazute
// (20.09.2026): net negativ in medie; dovedit e doar "nu porni dupa miscare".
// Cifrele de aici sunt calcule pe praguri de pornire; grid-proba.js le
// verifica pe istoricul fiecarei monede.
var GridCalcul = (function () {
  "use strict";

  var C = {
    COMISION: 0.0005,          // TAKER (piata): cumpararea de la pornire, inchiderea, stopul - Pionex futures
    COMISION_GRILA: 0.0002,    // v100.39 (audit 30.09): MAKER - ordinele limita ale grilelor. Masurat pe umplerile reale CRV 2393/2394:
                               // 0,0200% / 0,0224% pe volum; doar prima cumparare (la piata) e 0,05%. Inainte toate erau 0,05% ->
                               // proba scadea din fiecare pereche 0,06% in plus si respingea tocmai gridurile dese.
    PAS_MIN: 0.003,            // v99: 0,30% (net 0,26% dupa 0,04% dus-intors pe grila) - experienta lui (28.09): cu grid de 0,30% a facut
                               // mai multi bani in piata laterala decat cu 3%; gridurile rare sunt atinse rar. Era 0,35% (net 0,25%).
    PAS_CANDIDATI: 4,          // v99: 4 candidati de pas (progresie geometrica de la PAS_MIN la maxim), nu 3
    PAS_MAX_MULT: 3,           // pasul maxim = mediana (high-low)/close pe 15M x 3
    PERCENTILE: [0.60, 0.75, 0.90],
    PERC_IMPLICIT: 1,
    INCLINARE: { long: 0.6, neutru: 0.5, short: 0.4 },   // partea de DEASUPRA pretului
    GRILE_MIN: 2, GRILE_MAX: 150,
    LEV_MAX: 5,
    MMR: 0.01,                 // marja de intretinere, prudent
    PRAG_MISCARE: 1.5,
    MEDIANA_VERDE: 0.003,
    MARGINE_RANGE: 0.10,
    BARE_ZI: 96,               // lumanari de 15M intr-o zi
    PAS_FERESTRE: 24,          // o fereastra noua la fiecare 6h
    ZILE_PLINE: 29
  };

  // v100.39 (audit 30.09): perpetuele Pionex care NU sunt crypto - actiuni tokenizate (xStocks: TSLAX, NVDAX...), marfuri
  // (aur, argint, petrol, gaz, cupru) si pre-IPO. Erau 17 din primele 60 pe harta „Crypto”, in regimul crypto si in Scan.
  // Lista din pionex_symbols (30.09): baza terminata in X cu pas 0,01 si 2 zecimale (fara GMX, care e crypto) + marfuri/pre-IPO
  // numite. Pionex nu marcheaza tipul in API; o actiune listata dupa 30.09 nu e aici pana nu se adauga.
  var NU_CRYPTO = {};
  ("AAOIX AAPLX AAX ALABX AMATX AMDX AMZNX ANTHROPIC APPX ARMX ASMLX ASTSX AVGOX AXTIX BABAX BEX BMNRX BNCX BNOX BOTX BRENTOIL BSPX CARX CBRS CEGX CIFRX " +
   "COHRX COINX COPPER CPERX CRCLX CRDOX CRMX CRWVX CSCOX CVXX CXMTX DELLX DRAMX EWJX EWYX FLNCX FUTUX GEVX GLWX GOOGLX GSGX HIMSX HOODX HPEX HYUNDAI " +
   "IBMX INTCX IRENX KLACX KORUX LITEX LLYX LMTX LNGX LRCXX METAX MOSX MPX MRNAX MRVLX MSFTX MSTRX MUX NATGAS NBISX NETX NFLXX NIOX NKEX NOKX NOWX NTRX " +
   "NVDAX NVDLX OKLOX ONDSX ONX OPENAI ORCLX PANWX PAXG PAYPX PLTRX QCOMX QNTX QQQX RGTIX RKLBX RTXX SHAZX SITMX SLVX SMCIX SMHX SNDKX SNXXX SOXLX SOXSX " +
   "SOXXX SPCX SPYX STXX TQQQX TSLAX TSMX TTEX TXNX UNGX UNHX UNITREEX URAX USARX USOX VGKX VSHX WDCX WTI XAG XAU XAUT XLPX XLVX XYZX").split(" ").forEach(function (s) { NU_CRYPTO[s] = 1; });
  function eCrypto(simbol) { return !NU_CRYPTO[String(simbol || "").toUpperCase().replace(/_USDT_PERP$/, "").replace(/\.PERP$/, "")]; }

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function citeste(r) {
    if (!r) return null;
    var a = Array.isArray(r);
    var b = { t: nr(a ? r[0] : r.time), o: nr(a ? r[1] : r.open), h: nr(a ? r[2] : r.high), l: nr(a ? r[3] : r.low), c: nr(a ? r[4] : r.close) };
    if (b.t === null || !(b.o > 0) || !(b.h > 0) || !(b.l > 0) || !(b.c > 0) || b.h < b.l) return null;
    b.v = nr(a ? r[5] : (r.volume != null ? r.volume : r.v));   // v100.51 (I-470): volumul, pentru zona de valoare (null cand lipseste)
    return b;
  }
  function crescator(x, y) { return x - y; }

  // Lumanari Pionex (orice ordine, din pagini care se pot suprapune) -> crescator,
  // fara dubluri, fara bara in formare (cea mai noua). Un rand stricat se sare, nu devine 0.
  // v92: barele ZILNICE de bursa (Yahoo) - ultima zi e inchisa (sambata e vinerea), nu "in formare":
  // aceleasi bare, ordonate si fara dubluri, dar FARA sa scoata ultima (vezi bare() mai jos).
  function bareToate(randuri) {
    if (!Array.isArray(randuri)) return [];
    var vazut = {}, v = [];
    for (var i = 0; i < randuri.length; i++) { var b = citeste(randuri[i]); if (b && !vazut[b.t]) { vazut[b.t] = 1; v.push(b); } }
    return v.sort(function (x, y) { return x.t - y.t; });
  }
  // v95: barele ZILNICE ale unei actiuni americane: bara de AZI se scoate doar cat bursa e deschisa (e in formare);
  // sambata, duminica si dupa inchidere ultima bara e o zi inchisa si ramane (bare() o arunca mereu).
  function bareBursa(randuri, acum) {
    var v = bareToate(randuri); if (!v.length) return v;
    try {
      var o = {}, n = new Date(acum || Date.now());
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(n).forEach(function (x) { o[x.type] = x.value; });
      var azi = o.year + "-" + o.month + "-" + o.day, min = Number(o.hour) * 60 + Number(o.minute), deschisa = ["Sat", "Sun"].indexOf(o.weekday) < 0 && min >= 570 && min < 960;
      var zu = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(v[v.length - 1].t));
      if (deschisa && zu === azi) v.pop();
    } catch (e) {}
    return v;
  }
  function bare(randuri) {
    if (!Array.isArray(randuri)) return [];
    var vazut = {}, v = [];
    for (var i = 0; i < randuri.length; i++) {
      var b = citeste(randuri[i]);
      if (b && !vazut[b.t]) { vazut[b.t] = 1; v.push(b); }
    }
    v.sort(function (x, y) { return x.t - y.t; });
    v.pop();
    return v;
  }
  // Pretul de acum = inchiderea barei celei mai noi (cea in formare).
  function pretCurent(randuri) {
    if (!Array.isArray(randuri)) return null;
    var cea = null;
    for (var i = 0; i < randuri.length; i++) { var b = citeste(randuri[i]); if (b && (!cea || b.t > cea.t)) cea = b; }
    return cea ? cea.c : null;
  }

  // Bare mai mici -> bare de "pasMs" (ex. 6 x 4h -> 1z), aliniate pe multipli de pasMs (UTC).
  // Ultima bara (in formare) se pastreaza: cine o vrea afara, o scoate.
  function agrega(b, pasMs) {
    var out = [], cur = null;
    for (var i = 0; i < (b ? b.length : 0); i++) {
      var x = b[i], t0 = Math.floor(x.t / pasMs) * pasMs;
      if (!cur || cur.t !== t0) { cur = { t: t0, o: x.o, h: x.h, l: x.l, c: x.c }; out.push(cur); }
      else { if (x.h > cur.h) cur.h = x.h; if (x.l < cur.l) cur.l = x.l; cur.c = x.c; }
    }
    return out;
  }
  // Randuri Pionex vechi + noi (aceeasi forma bruta) -> fara dubluri pe time, crescator, ultimele n.
  function imbinaRanduri(vechi, noi, n) {
    var m = {}, lista = [];
    [vechi, noi].forEach(function (a) { if (Array.isArray(a)) a.forEach(function (r) { var t = r && nr(Array.isArray(r) ? r[0] : r.time); if (t !== null) m[t] = r; }); });
    Object.keys(m).forEach(function (k) { lista.push({ t: Number(k), r: m[k] }); });
    lista.sort(function (a, b) { return a.t - b.t; });
    if (n > 0 && lista.length > n) lista = lista.slice(lista.length - n);
    return lista.map(function (x) { return x.r; });
  }

  function mediana(a) {
    if (!a || !a.length) return null;
    var s = a.slice().sort(crescator), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function percentila(a, p) {
    if (!a || !a.length) return null;
    var s = a.slice().sort(crescator), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  }
  function procent(x) { return x === null || x === undefined || !isFinite(x) ? "—" : (x * 100).toFixed(2).replace(".", ",") + "%"; }

  // Cat s-a plimbat pretul (max high - min low, raportat la deschidere) in fiecare
  // fereastra de H zile, cu o fereastra noua la fiecare 6h.
  function latimi(b, H) {
    var W = H * C.BARE_ZI, out = [];
    for (var s = 0; s + W <= b.length; s += C.PAS_FERESTRE) {
      var mx = -Infinity, mn = Infinity;
      for (var i = s; i < s + W; i++) { if (b[i].h > mx) mx = b[i].h; if (b[i].l < mn) mn = b[i].l; }
      out.push((mx - mn) / b[s].o);
    }
    return out;
  }
  // Culoarul pasului: de la minimul care lasa profit peste comision pana la
  // pasul pe care pretul inca il atinge (mediana miscarii pe 15M x 3).
  function pasi(b) {
    var r = [];
    for (var i = 0; i < b.length; i++) r.push((b[i].h - b[i].l) / b[i].c);
    var med = mediana(r);
    if (med === null) return null;
    var mx = Math.max(C.PAS_MIN, med * C.PAS_MAX_MULT), n = C.PAS_CANDIDATI, out = [];
    // v99: n candidati in progresie geometrica (primul = PAS_MIN, ultimul = mx); pe bare moarte toti = PAS_MIN
    for (var k = 0; k < n; k++) out.push(k === n - 1 ? mx : C.PAS_MIN * Math.pow(mx / C.PAS_MIN, k / (n - 1)));
    return out;
  }

  function plaseaza(pret, lat, dir) {
    var f = C.INCLINARE[dir], jos = pret * (1 - lat * (1 - f)), sus = pret * (1 + lat * f);
    if (jos < pret * 0.05) jos = pret * 0.05;
    return { jos: jos, sus: sus };
  }
  function nrGrile(jos, sus, pas) {
    // in jos, nu rotunjit: pasul efectiv nu scade niciodata sub cel cerut (garda de 0,30%)
    var n = Math.floor(Math.log(sus / jos) / Math.log(1 + pas));
    return Math.max(C.GRILE_MIN, Math.min(C.GRILE_MAX, n));
  }
  function niveluri(jos, sus, N) {
    var g = Math.pow(sus / jos, 1 / N), v = [];
    for (var k = 0; k <= N; k++) v.push(jos * Math.pow(g, k));
    v[N] = sus;
    return v;
  }

  // Pretul de lichidare cu pozitia PLINA pe partea periculoasa, marja izolata
  // normalizata la 1 (suma se simplifica). Castigul din grile nu se socoteste
  // (prudent). Long se lichideaza jos, short sus; neutru poate si jos, si sus.
  function lichidare(niv, pret, dir, L) {
    var N = niv.length - 1, Qj = 0, Cj = 0, Qs = 0, Cs = 0;
    for (var k = 0; k < N; k++) {
      var q = L / N / niv[k];
      if (dir === "long") { var e = niv[k + 1] > pret ? pret : niv[k]; Qj += q; Cj += q * e; }
      else if (dir === "short") { var e2 = niv[k] < pret ? pret : niv[k + 1]; Qs += q; Cs += q * e2; }
      else if (niv[k + 1] <= pret) { Qj += q; Cj += q * niv[k]; }
      else if (niv[k] >= pret) { Qs += q; Cs += q * niv[k + 1]; }
    }
    var jos = Qj > 0 ? (Cj - 1) / (Qj * (1 - C.MMR)) : null;
    var sus = Qs > 0 ? (1 + Cs) / (Qs * (1 + C.MMR)) : null;
    return { jos: jos !== null && jos > 0 ? jos : null, sus: sus };
  }
  function levierSigur(jos, sus, pret, dir, N) {
    var lat = sus - jos, niv = niveluri(jos, sus, N);
    for (var L = C.LEV_MAX; L >= 1; L--) {
      var lq = lichidare(niv, pret, dir, L);
      if ((lq.jos === null || lq.jos <= jos - lat) && (lq.sus === null || lq.sus >= sus + lat)) return { levier: L, sigur: true, lichidare: lq };
    }
    return { levier: 1, sigur: false, lichidare: lichidare(niv, pret, dir, 1) };
  }
  // v100.19 (30.09, el: „1 grilă”): O grila dincolo de fiecare margine (era doua), mereu inaintea lichidarii sigure (care sta la o
  // latime intreaga). Masurat pe 12 monede, mediana: 2 grile tipic +2,5% / cel mai prost −19,6%; 1 grila +1,8% / −16,3%.
  // v100.39 (30.09, el: „gridurile dese sunt mult prea rare” + a ales „stop la ~1/8 din lățime”): la gridul des „o grilă”
  // inseamna 0,30% - proba il scotea pe stop la prima fluctuatie si respingea gridul des (9/24 pe plus pe 8 monede x 3 directii;
  // cu stopul la 1/8 din latime + comisionul maker, 21/24). Stopul sta la max(un pas, 1/8 din latimea intervalului).
  function stopuri(jos, sus, pas) { var d = Math.max(pas, (sus / jos - 1) / 8); return { jos: jos * (1 - d), sus: sus * (1 + d) }; }

  // o.grile (optional) forteaza numarul de grile - folosit cand minimul pe ordin
  // cere mai putine grile decat da pasul (spec 6.4).
  function construieste(o) {
    var loc = plaseaza(o.pret, o.lat, o.dir), N = o.grile > 0 ? Math.max(C.GRILE_MIN, Math.min(C.GRILE_MAX, Math.floor(o.grile))) : nrGrile(loc.jos, loc.sus, o.pas);
    var g = Math.pow(loc.sus / loc.jos, 1 / N) - 1;
    var sig = levierSigur(loc.jos, loc.sus, o.pret, o.dir, N);
    var L = o.levier > 0 ? o.levier : sig.levier;
    var lq = L === sig.levier ? sig.lichidare : lichidare(niveluri(loc.jos, loc.sus, N), o.pret, o.dir, L);
    var suma = o.suma > 0 ? o.suma : 1;
    return {
      dir: o.dir, pret: o.pret, jos: loc.jos, sus: loc.sus, grile: N, pas: g,
      levier: L, levierSigur: sig.levier, sigur: sig.sigur, pesteSigur: L > sig.levier || !sig.sigur,
      lichidare: lq, stop: stopuri(loc.jos, loc.sus, g),
      profitGrila: g - 2 * C.COMISION_GRILA, perOrdin: suma * L / N, suma: suma
    };
  }

  function ema(v, n) {
    var k = 2 / (n + 1), out = new Array(v.length), e = null;
    for (var i = 0; i < v.length; i++) { e = e === null ? v[i] : v[i] * k + e * (1 - k); out[i] = i >= n - 1 ? e : null; }
    return out;
  }
  // Semnul EMA-urilor conteaza doar cand diferenta e macar un sfert din
  // miscarea tipica a barei (mediana high-low): altfel o oscilatie pura ar iesi "trend".
  function trendTF(b, eticheta) {
    if (!b || b.length < 55) return null;
    var c = [], amp = [];
    for (var i = 0; i < b.length; i++) { c.push(b[i].c); amp.push(b[i].h - b[i].l); }
    var e20 = ema(c, 20), e50 = ema(c, 50), n = c.length - 1, s = 0, panta = e50[n] - e50[n - 5];
    var prag = (mediana(amp) || 0) * 0.25;
    if (e20[n] - e50[n] > prag) s++; else if (e50[n] - e20[n] > prag) s--;
    if (panta > prag) s++; else if (-panta > prag) s--;
    var text = eticheta + ": EMA20 " + (e20[n] > e50[n] ? "peste" : "sub") + " EMA50, EMA50 " + (panta > 0 ? "urcă" : panta < 0 ? "coboară" : "plată");
    return { scor: s, text: text };
  }
  function structura(b) {
    if (!b || b.length < 24) return null;
    var n = b.length, mxA = -Infinity, mnA = Infinity, mxP = -Infinity, mnP = Infinity;
    for (var i = n - 12; i < n; i++) { mxA = Math.max(mxA, b[i].h); mnA = Math.min(mnA, b[i].l); }
    for (var j = n - 24; j < n - 12; j++) { mxP = Math.max(mxP, b[j].h); mnP = Math.min(mnP, b[j].l); }
    if (mxA > mxP && mnA > mnP) return { scor: 1, text: "structura 4h: maxime și minime tot mai sus" };
    if (mxA < mxP && mnA < mnP) return { scor: -1, text: "structura 4h: maxime și minime tot mai jos" };
    return { scor: 0, text: "structura 4h: fără maxime/minime în aceeași direcție" };
  }
  // Directia iese MEREU (cererea lui, 24.09). Nu e o predictie: e trendul de acum.
  function directie(b4h, b1d) {
    var t4 = trendTF(b4h, "4h"), t1 = trendTF(b1d, "1z"), st = structura(b4h);
    if (!t4) return { dir: "neutru", tarie: "fara-date", scor: null, motive: ["prea puține lumânări de 4h ca să judec trendul"] };
    var s = t4.scor + (t1 ? t1.scor : 0) + (st ? st.scor : 0), motive = [t4.text];
    motive.push(t1 ? t1.text : "1z: prea puține lumânări");
    if (st) motive.push(st.text);
    var a = Math.abs(s);
    return { dir: s >= 2 ? "long" : s <= -2 ? "short" : "neutru", tarie: a >= 4 ? "tare" : a >= 2 ? "mediu" : "slab", scor: s, motive: motive };
  }

  // Miscarea de acum fata de cea obisnuita a monedei. "Obisnuit" = percentila 75
  // a miscarilor pe tot istoricul dat: fata de mediana, zgomotul pur ar trece de
  // 1,5x in ~31% din cazuri; fata de percentila 75, in ~8%.
  // Pe orice interval de bare: k4 = cate bare fac 4h, k24 = cate fac 24h
  // (15M: 16/96; 4H: 1/6). Sub 50 de bare nu se judeca (null, nu fals).
  function regimPeBare(b, k4, k24) {
    if (!b || b.length < Math.max(50, 2 * k24 + 1)) return null;
    function raport(k) {
      var m = [];
      for (var i = k; i < b.length; i++) m.push(Math.abs(b[i].c - b[i - k].c) / b[i - k].c);
      var ob = percentila(m, 0.75);
      return ob > 0 ? m[m.length - 1] / ob : null;
    }
    var r4 = raport(k4), r24 = raport(k24);
    // v96.3: si SENSUL miscarii (27.09: "daca miscarea e cu botul nu ar trebui sa ma sfatuiasca sa ies")
    var u = b.length - 1, s4 = (b[u].c - b[u - k4].c) / b[u - k4].c, s24 = (b[u].c - b[u - k24].c) / b[u - k24].c;
    var t4 = r4 !== null && r4 > C.PRAG_MISCARE, t24 = r24 !== null && r24 > C.PRAG_MISCARE, s = t24 ? s24 : t4 ? s4 : 0;
    return { r4h: r4, r24h: r24, miscare: t4 || t24, s4h: s4, s24h: s24, sens: s > 0 ? "urca" : s < 0 ? "coboara" : null };
  }
  function regim(b) { return regimPeBare(b, 16, C.BARE_ZI); }
  // Intervalul Wilson (95%) pentru k din n - acelasi ca in Directie.
  function wilson(k, n) {
    if (!(n > 0)) return [0, 1];
    var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
  }

  // "Linistea de acum, cat mai tine?" - o FRECVENTA din perioadele de liniste ale monedei,
  // nu o predictie. Pentru DURATA, scara e miscarea pe 24 h (cea pe 4 h e prea zgomotoasa:
  // zgomotul pur o trece de prag in ~8% din bare, deci ar rupe "linistea" la fiecare ~12
  // bare). O perioada de liniste incepe cand miscarea pe 24 h coboara sub 1,2 x obisnuit
  // (percentila 75 pe tot istoricul dat) si se termina cand trece de 1,5 x. Se iau perioadele
  // care au ajuns la lungimea celei de acum (plafon 3 zile) si se numara cate au mai tinut
  // inca H zile. Fiecare perioada e un caz independent; cea de acum (neterminata) nu se numara.
  function linisteTine(b, H) {
    if (!b || b.length < 2 * C.BARE_ZI + 1) return null;
    var W = H * C.BARE_ZI, n = b.length, i;
    var m4 = new Array(n), m24 = new Array(n), l4 = [], l24 = [];
    for (i = 0; i < n; i++) {
      m4[i] = i >= 16 ? Math.abs(b[i].c - b[i - 16].c) / b[i - 16].c : null;
      m24[i] = i >= C.BARE_ZI ? Math.abs(b[i].c - b[i - C.BARE_ZI].c) / b[i - C.BARE_ZI].c : null;
      if (m4[i] !== null) l4.push(m4[i]); if (m24[i] !== null) l24.push(m24[i]);
    }
    var o4 = percentila(l4, 0.75), o24 = percentila(l24, 0.75);
    if (!(o4 > 0) || !(o24 > 0)) return null;
    var mis = new Array(n), inMis = true;   // pana la prima coborare sub 1,2x nu stim -> "miscare"
    for (i = 0; i < n; i++) {
      if (m24[i] === null) { mis[i] = true; continue; }
      if (inMis && m24[i] < 1.2 * o24) inMis = false;
      else if (!inMis && m24[i] > C.PRAG_MISCARE * o24) inMis = true;
      mis[i] = inMis;
    }
    // perioadele de liniste: [start, sfarsit) - sfarsitul e prima bara cu miscare sau n
    var perioade = [], start = null;
    for (i = C.BARE_ZI; i < n; i++) {
      if (!mis[i]) { if (start === null) start = i; }
      else if (start !== null) { perioade.push({ s: start, e: i, terminata: true }); start = null; }
    }
    var acum = null;
    if (start !== null) { acum = { s: start, e: n, terminata: false }; }
    var linisteAcum = acum !== null;
    var D = linisteAcum ? Math.min(n - acum.s, 3 * C.BARE_ZI) : null;
    var out = { linisteAcum: linisteAcum, zileLiniste: linisteAcum ? (n - acum.s) / C.BARE_ZI : 0, H: H, n: 0, k: 0, p: null, ic: null, suficient: false, perioade: perioade.length };
    if (!linisteAcum) return out;
    for (i = 0; i < perioade.length; i++) {
      var per = perioade[i], lung = per.e - per.s;
      if (lung < D) continue;
      out.n++;
      if (lung - D >= W) out.k++;
    }
    if (out.n > 0) { out.p = out.k / out.n; out.ic = wilson(out.k, out.n); }
    out.suficient = out.n >= 5;
    return out;
  }

  function pozitie7z(b4h, pret) {
    if (!b4h || b4h.length < 42 || !(pret > 0)) return null;
    var mx = -Infinity, mn = Infinity;
    for (var i = b4h.length - 42; i < b4h.length; i++) { mx = Math.max(mx, b4h[i].h); mn = Math.min(mn, b4h[i].l); }
    return mx > mn ? Math.max(0, Math.min(1, (pret - mn) / (mx - mn))) : null;
  }

  function verdict(o) {
    if (!o.regim || !o.stat || !o.stat.antren) return { nivel: "fara-date", motive: ["nu am destule lumânări ca să judec"] };
    var rosu = [], galben = [], a = o.stat.antren, rg = o.regim;
    if (rg.miscare) {
      var r = Math.max(rg.r4h || 0, rg.r24h || 0);
      rosu.push("prețul abia a făcut o mișcare de " + r.toFixed(1).replace(".", ",") + "× față de obișnuit — după mișcare gridul iese cel mai rău");
    }
    if (a.lichidari > 0) rosu.push("pe istoric, setarea asta a fost lichidată de " + a.lichidari + " ori");
    if (o.stat.test && o.stat.test.lichidari > 0) rosu.push("pe zilele nevăzute, setarea asta a fost lichidată de " + o.stat.test.lichidari + " ori");
    if (a.mediana < 0) rosu.push("pe istoric, setarea asta a ieșit pe minus (mediana " + procent(a.mediana) + ")");
    if (o.nesigur) rosu.push("nici la 1× lichidarea nu stă destul de departe: intervalul e prea larg pentru marja izolată");
    else if (o.pesteSigur) rosu.push("levierul ales pune lichidarea prea aproape de grid");
    if (a.mediana >= 0 && a.mediana < C.MEDIANA_VERDE) galben.push("pe istoric iese la limită (mediana " + procent(a.mediana) + ")");
    if (!o.stat.test) galben.push("n-am avut zile nevăzute pe care s-o verific");
    else if (o.stat.test.mediana < 0) galben.push("pe ultimele zile, nevăzute la alegere, a ieșit pe minus (" + procent(o.stat.test.mediana) + ")");
    if (o.pozitie !== null && o.pozitie !== undefined && (o.pozitie < C.MARGINE_RANGE || o.pozitie > 1 - C.MARGINE_RANGE)) galben.push("prețul stă lângă " + (o.pozitie < C.MARGINE_RANGE ? "minimul" : "maximul") + " ultimelor 7 zile");
    if (o.zile < C.ZILE_PLINE) galben.push("moneda are doar " + Math.floor(o.zile) + " zile de istoric aici");
    return { nivel: rosu.length ? "nu" : galben.length ? "asteapta" : "porneste", motive: rosu.concat(galben) };
  }

  return { C: C, bare: bare, bareToate: bareToate, bareBursa: bareBursa, pretCurent: pretCurent, agrega: agrega, imbinaRanduri: imbinaRanduri, mediana: mediana, percentila: percentila, procent: procent,
    latimi: latimi, pasi: pasi, plaseaza: plaseaza, nrGrile: nrGrile, niveluri: niveluri, lichidare: lichidare,
    levierSigur: levierSigur, stopuri: stopuri, construieste: construieste, ema: ema, directie: directie,
    regim: regim, regimPeBare: regimPeBare, pozitie7z: pozitie7z, verdict: verdict, wilson: wilson, linisteTine: linisteTine, eCrypto: eCrypto };
})();
if (typeof globalThis !== "undefined") globalThis.GridCalcul = GridCalcul;
