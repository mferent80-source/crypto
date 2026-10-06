// Sugestiile de acțiuni „early” (v100.119; el 06.10: „o pagină de sugestii cu tot: boți, EU, US” + „early = toate trei”) - pur, folosit de colector
// (listele de la 8:00, gap-ul EU de la 10:20, pre-market-ul US de la 16:00) și de pagina „Sugestii”. Specul: docs/superpowers/specs/2026-10-06-pagina-sugestii-design.md
// Regulile sunt fixate ÎNAINTE de cifre și nu se ajustează după istoric. Semnalul pe ziua j folosește doar barele 0..j (probat: „stric viitorul”).
// Bare zilnice: { t, o, h, l, c, v } (GridCalcul.bare / bareToate). Istoricul: intrare la deschiderea zilei de după (gap: aceeași zi), ieșire după
// 10 zile de bursă, −0,3% comision de conversie; un semnal la cel mult 14 zile pe ticker. Verdictul = Carnet.verdictMonede (ticker + blocuri de 14 zile).
(function (root) {
  "use strict";
  var ZI = 86400000, ORIZ = 10, COST = 0.003, PAUZA = 14 * ZI;
  var REGULI = { urcare: { zileMax: 20, zileLiniste: 10, amplMax: 0.08, volX: 1.5, ma: 50, start: 50 }, revers: { cadere: 0.15, zileMax: 30, start: 29 }, gap: { prag: 0.02, start: 1 },
    // revizia (C1): rândurile de pre-market de la Yahoo vin cu volum 0 (verificat 06.10 pe AAPL, TSLA, NVDA…) ⇒ în locul volumului, cel puțin 6 rânduri cu preț (30 de minute cotate)
    premarket: { prag: 0.02, randuriMin: 6 }, gapEU: { prag: 0.02, volMin: 0.03, minute: 20 } };
  var NUME = { urcare: "un început de urcare", revers: "un revers timpuriu", gap: "un gap de +2% la deschidere" };
  function nr(v) { var x = Number(v); return v === null || v === undefined || v === "" || !isFinite(x) ? null : x; }
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var P1 = function (x) { var r = Math.round(x * 1000) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(1).replace(".", ",") + "%"; }, PC   /* 0 rotunjit fără semn („−0,0%”) */ = function (x) { return x === null || x === undefined || !isFinite(x) ? "—" : Math.round(x * 100) + "%"; };
  function medie(v) { var s = 0; for (var i = 0; i < v.length; i++) s += v[i]; return v.length ? s / v.length : null; }

  // igiena datelor (măsurat 06.10 pe EU: ETP-urile de la Londra au salturi ×100 / ×227 - pence ↔ lire, reverse split): o zi cu închiderea
  // sau deschiderea de peste ×3 / sub ÷3 față de închiderea de ieri strică orice fereastră care o cuprinde
  function salt(b, i) { var p = b[i - 1] && b[i - 1].c, x = b[i]; if (!(p > 0) || !x) return false; var q = x.c / p, o = x.o / p; return q > 3 || q < 1 / 3 || o > 3 || o < 1 / 3; }
  function areSalt(b, de, pana) { for (var i = Math.max(1, de); i <= pana && i < b.length; i++) if (salt(b, i)) return true; return false; }
  // semnalul pe ziua j, doar din barele 0..j
  function semnalLa(b, j, cheie) {
    var r = REGULI[cheie]; if (!r || !Array.isArray(b) || j < r.start || j >= b.length) return { da: false };
    if (areSalt(b, j - r.start, j)) return { da: false };
    var x = b[j], i, c = x.c;
    if (cheie === "urcare") {
      var hi = -Infinity, mx = -Infinity, mn = Infinity, vv = [], s = 0;
      for (i = j - r.zileMax; i < j; i++) { hi = Math.max(hi, b[i].h); if (b[i].v > 0) vv.push(b[i].v); }
      for (i = j - r.zileLiniste; i < j; i++) { mx = Math.max(mx, b[i].h); mn = Math.min(mn, b[i].l); }
      for (i = j - r.ma + 1; i <= j; i++) s += b[i].c;
      var vm = vv.length >= 15 ? medie(vv) : null, volX = vm && x.v > 0 ? x.v / vm : null, ma = s / r.ma;
      var da = c > hi && mn > 0 && mx / mn - 1 <= r.amplMax && volX !== null && volX >= r.volX && c > ma;
      return da ? { da: true, pret: c, ruptura: c / hi - 1, volX: volX } : { da: false };
    }
    if (cheie === "revers") {
      var h30 = -Infinity; for (i = j - r.zileMax + 1; i <= j; i++) h30 = Math.max(h30, b[i].h);
      var prima = c > b[j - 1].h && b[j - 1].c <= b[j - 2].h;
      return c <= (1 - r.cadere) * h30 && prima ? { da: true, pret: c, cadere: 1 - c / h30 } : { da: false };
    }
    if (cheie === "gap") { var g = b[j - 1].c > 0 ? x.o / b[j - 1].c - 1 : null; return g !== null && g >= r.prag ? { da: true, pret: x.o, gap: g } : { da: false }; }
    return { da: false };
  }
  // punctele istoricului unei serii: fiecare zi cu fereastra de 10 zile încheiată; un semnal la cel mult 14 zile (cele prea apropiate se scot de tot)
  // o.intrare = "inchidere" (gap EU, revizia I6): lista EU iese la 10:20, după deschiderea de la 10:00 ⇒ istoricul cumpără la închiderea zilei gap-ului
  function puncte(b, cheie, o) {
    var r = REGULI[cheie], out = [], ultim = -Infinity, laInchidere = !!(o && o.intrare === "inchidere"); if (!r || !Array.isArray(b)) return out;
    for (var j = r.start; j < b.length; j++) {
      var e = cheie === "gap" ? j : j + 1, x = e + ORIZ - 1; if (x > b.length - 1) break;
      var pi = cheie === "gap" && laInchidere ? b[e].c : b[e].o;
      if (!(pi > 0) || !(b[x].c > 0) || areSalt(b, j - r.start, x)) continue;   // fereastra cu un salt de unitate iese de tot
      var sem = semnalLa(b, j, cheie).da;
      if (sem && b[j].t - ultim < PAUZA) continue;
      if (sem) ultim = b[j].t;
      out.push({ t: b[j].t, r: b[x].c / pi - 1 - COST, semnal: sem });
    }
    return out;
  }
  function eticheta(a, b) {
    if (!a || !b || !a.n || a.pePlus === null || b.pePlus === null) return null;
    return a.pePlus - b.pePlus >= 0.03 - 1e-9 && a.medie > b.medie ? "mai bine" : b.pePlus - a.pePlus >= 0.03 - 1e-9 && a.medie < b.medie ? "mai slab" : "cam la fel";
  }
  // istoricul unei reguli: serii = [{ ticker, puncte }] (sau { ticker, b, cheie } - punctele se fac aici)
  function dovada(serii, o) {
    o = o || {}; var l = [];
    (Array.isArray(serii) ? serii : []).forEach(function (s) { var pt = s.puncte || (s.b ? puncte(s.b, s.cheie || o.cheie) : []); pt.forEach(function (p) { l.push({ simbol: s.ticker, t: p.t, r: p.r, semnal: p.semnal }); }); });
    var st = function (a) { var v = a.map(function (x) { return x.r; }); return { n: v.length, pePlus: v.length ? v.filter(function (x) { return x > 0; }).length / v.length : null, medie: v.length ? medie(v) : null }; };
    var cu = st(l.filter(function (x) { return x.semnal; })), baza = st(l.filter(function (x) { return !x.semnal; }));
    var v = root.Carnet && root.Carnet.verdictMonede ? root.Carnet.verdictMonede(l, function (x) { return x.semnal; }, { reps: o.reps || 2000, seed: o.seed || 119, blocZile: 14 }) : null;
    return { n: cu.n, pePlus: cu.pePlus, medie: cu.medie, baza: baza, eticheta: eticheta(cu, baza),
      verdict: v ? { stare: v.stare, motiv: v.motiv || null, dif: v.dif === undefined ? null : v.dif, p: v.p === undefined ? null : v.p, pBloc: v.pBloc === undefined ? null : v.pBloc, monede: v.monede, blocuri: v.blocuri } : null };
  }
  function textDovada(d, cheie) {
    if (!d || !d.baza || d.n === null || d.n === undefined) return "Istoricul se socotește dimineața, la 8:00.";
    var cap = "După " + (NUME[cheie] || "semnal") + ", pe 2 ani: ";
    if (!d.baza.n) return "Istoricul n-a putut fi socotit azi (fără prețuri).";   // revizia: nu „0%” fără date
    if (!d.n) return cap + "niciun caz încă; o zi oarecare: " + PC(d.baza.pePlus) + " pe plus în 10 zile.";
    // revizia (I5): sensul se spune - „dovedit” singur se citea „dovedit bun” și când era rău
    var s0 = d.verdict && d.verdict.stare, sens = /-rau$/.test(s0 || "") ? "mai slab" : "mai bun";
    var st = d.verdict ? (s0 === "prea puține" ? "prea puține cazuri" : /^dovedit/.test(s0) ? "dovedit " + sens : /^la-limita/.test(s0) ? "la limită, " + sens : "nedovedit") : null;
    return cap + PC(d.pePlus) + " pe plus în 10 zile, " + P1(d.medie) + " în medie (" + cate(d.n, "caz", "cazuri") + "); o zi oarecare: " + PC(d.baza.pePlus) + ", " + P1(d.baza.medie)
      + (d.eticheta ? " - " + d.eticheta : "") + (st ? ", " + st : "") + ".";
  }
  // lista de azi pe ultima bară ÎNCHISĂ: bara deschisă de mai puțin de o sesiune (o.sesiuneOre, implicit 7 h - US) se lasă deoparte
  function azi(b, cheie, acum, o) {
    o = o || {}; if (!Array.isArray(b) || b.length < 3) return null;
    var j = b.length - 1; if ((acum === undefined ? Date.now() : acum) - b[j].t < (o.sesiuneOre || 7) * 3600000) j--;
    var s = semnalLa(b, j, cheie); if (!s.da) return null;
    return Object.assign({ t: b[j].t, schimbare: b[j - 1].c > 0 ? b[j].c / b[j - 1].c - 1 : null }, s);
  }
  // ---------------- intraday: pre-market US (~16:00 RO) și gap la deschidere EU (~10:20 RO) ----------------
  // ora deschiderii la New York (9:30 ET) în UTC, pentru ziua lui `acum` (ora de vară socotită din fusul orar, nu fixă)
  function deschidereNY(acum) {
    var f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum));
    var g = function (k) { return Number((f.filter(function (x) { return x.type === k; })[0] || {}).value); };
    var local = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")), dec = local - Math.floor(acum / 60000) * 60000;
    return Date.UTC(g("year"), g("month") - 1, g("day"), 9, 30) - dec;
  }
  function randuriCurate(r) { return (Array.isArray(r) ? r : []).map(function (x) { return { t: nr(x && (x.time !== undefined ? x.time : x.t)), o: nr(x && (x.open !== undefined ? x.open : x.o)), c: nr(x && (x.close !== undefined ? x.close : x.c)), v: nr(x && (x.volume !== undefined ? x.volume : x.v)) || 0 }; })
    .filter(function (x) { return x.t !== null && x.c > 0; }).sort(function (a, b) { return a.t - b.t; }); }
  // rândurile de azi dinaintea deschiderii (de la 4:00 ET); fără ele ⇒ { fara: true } (nu 0%)
  function premarket(randuri, inchidereIeri, volMediu, acum) {
    var r = REGULI.premarket, d = deschidereNY(acum), pre = randuriCurate(randuri).filter(function (x) { return x.t >= d - 5.5 * 3600000 && x.t < d; });
    if (!pre.length || !(inchidereIeri > 0)) return { da: false, fara: true };
    var pret = pre[pre.length - 1].c, gap = pret / inchidereIeri - 1;
    return { da: gap >= r.prag && pre.length >= r.randuriMin, gap: gap, pret: pret, randuri: pre.length, volPct: null };
  }
  // primele 20 de minute de azi (ziua UTC a lui `acum`): deschiderea față de închiderea de ieri, volumul față de media zilnică
  function gapEU(randuri, inchidereIeri, volMediu, acum) {
    var r = REGULI.gapEU, z0 = Math.floor(acum / ZI) * ZI, azi = randuriCurate(randuri).filter(function (x) { return x.t >= z0 && x.t <= acum; });
    if (!azi.length || !(inchidereIeri > 0)) return { da: false, fara: true };
    // revizia (I4): Yahoo întârzie bursele EU ~15 min ⇒ fără un rând de după primele 20 de minute, încă nu se judecă
    if (azi[azi.length - 1].t < azi[0].t + r.minute * 60000) return { da: false, asteapta: true };
    var d = azi[0].t, primele = azi.filter(function (x) { return x.t < d + r.minute * 60000; }), vol = primele.reduce(function (s, x) { return s + x.v; }, 0), gap = azi[0].o / inchidereIeri - 1;
    return { da: gap >= r.prag && volMediu > 0 && vol >= r.volMin * volMediu, gap: gap, pret: azi[azi.length - 1].c, vol: vol, volPct: volMediu > 0 ? vol / volMediu : null };
  }
  // volumul mediu zilnic pe ultimele 20 de zile închise (pentru pre-market / gap)
  function volumMediu(b, acum, o) {
    if (!Array.isArray(b) || !b.length) return null; var j = b.length - 1;
    if ((acum === undefined ? Date.now() : acum) - b[j].t < ((o && o.sesiuneOre) || 7) * 3600000) j--;
    var v = []; for (var i = Math.max(0, j - 19); i <= j; i++) if (b[i].v > 0) v.push(b[i].v);
    return v.length >= 10 ? { vol: medie(v), inchidere: b[j].c } : null;
  }

  root.SugestiiActiuni = { REGULI: REGULI, NUME: NUME, ORIZONT: ORIZ, COST: COST, semnalLa: semnalLa, puncte: puncte, dovada: dovada, textDovada: textDovada, azi: azi, eticheta: eticheta,
    deschidereNY: deschidereNY, premarket: premarket, gapEU: gapEU, volumMediu: volumMediu, areSalt: areSalt };
})(typeof globalThis !== "undefined" ? globalThis : this);
