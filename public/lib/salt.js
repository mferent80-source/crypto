// Pagina „Salt” (v100.120; el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca pe cele din Trading 212”) - pur: căutarea în univers,
// pozițiile scrise de el (curățate), analiza unei poziții (ACEEAȘI ca la T212: ActiuniSemnale, Probabilitati, Consilier, Consiliu),
// trendul și rândul din tabelul tuturor instrumentelor. Universul: public/data/salt-univers.json (lista Salt Bank, ISIN ⇒ simbol Yahoo).
(function (root) {
  "use strict";
  var ZI = 86400000;
  // revizia: „1.234,56” (mii cu punct, zecimale cu virgulă) - cu virgulă, punctele sunt mii
  function nr(v) { if (typeof v === "string") { v = v.replace(/\s/g, ""); if (v.indexOf(",") >= 0) v = v.replace(/\./g, "").replace(",", "."); } var x = Number(v); return v === null || v === undefined || v === "" || !isFinite(x) ? null : x; }
  function fara(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function cauta(univers, q) {
    var t = fara(q).trim(); if (!t || !Array.isArray(univers)) return [];
    return univers.filter(function (x) { return fara(x.nume).indexOf(t) >= 0 || fara(x.isin) === t || fara(x.simbol) === t || fara(x.simbol).indexOf(t) === 0; })
      .sort(function (a, b) { var ea = fara(a.simbol) === t || fara(a.isin) === t ? 0 : 1, eb = fara(b.simbol) === t || fara(b.isin) === t ? 0 : 1; return ea - eb; }).slice(0, 20);
  }
  // poziția scrisă de el: ISIN din univers, cantitatea și prețul mediu (moneda simbolului) pozitive, data cumpărării opțională (AAAA-LL-ZZ)
  // plata: „simbol” (prețul mediu e în moneda simbolului) sau „EUR” (cum plătești de obicei la Salt) - revizia I2; data din viitor nu se ia
  function pozitieCurata(x, univers, acum) {
    if (!x) return null; var isin = String(x.isin || "").toUpperCase().trim(), u = (univers || []).filter(function (y) { return y.isin === isin; })[0];
    var q = nr(x.qty), pm = nr(x.pretMediu); if (!u || !(q > 0) || !(pm > 0)) return null;
    var de = /^\d{4}-\d{2}-\d{2}$/.test(String(x.de || "")) && Date.parse(x.de + "T00:00:00Z") <= (acum === undefined ? Date.now() : acum) ? String(x.de) : null;
    return { isin: isin, simbol: u.simbol, nume: u.nume, qty: q, pretMediu: pm, de: de, plata: x.plata === "EUR" ? "EUR" : "simbol" };
  }
  // ---------------- moneda (revizia I2): Yahoo dă USD, EUR, GBp (pence), DKK, HKD, CAD, CHF, AUD ----------------
  function perecheFx(m) { if (!m || m === "EUR") return null; if (m === "GBp" || m === "GBP") return "EURGBP=X"; return /^[A-Z]{3}$/.test(m) ? "EUR" + m + "=X" : null; }
  // prețul mediu în moneda simbolului: plătit în EUR ⇒ la cursul din ziua cumpărării (fără dată: cursul de azi); GBp = pence (×100)
  function medieInMonedaSimbolului(poz, monedaSim, fxBare) {
    if (!poz || poz.plata !== "EUR" || !monedaSim || monedaSim === "EUR") return poz ? poz.pretMediu : null;
    if (!Array.isArray(fxBare) || !fxBare.length) return null;
    var t = poz.de ? Date.parse(poz.de + "T12:00:00Z") : Infinity, b = null;
    for (var i = 0; i < fxBare.length; i++) if (fxBare[i].t <= t && fxBare[i].c > 0) b = fxBare[i];
    if (!b) b = fxBare[0];
    return poz.pretMediu * b.c * (monedaSim === "GBp" ? 100 : 1);
  }
  function verificaMedie(medie, pret) { return medie > 0 && pret > 0 && Math.abs(medie / pret - 1) > 0.6 ? "Prețul mediu e prea departe de prețul de acum (" + Math.round((medie / pret - 1) * 100) + "%): verifică moneda în care l-ai scris." : null; }
  // textele Consilierului scriu prețurile cu „$” (ca pe T212); aici, în moneda simbolului
  // v100.306 (revizia, 🔴): „$25,17” / „$1.234,56” (usd() de acum) rămân cum sunt; textele vechi „$271.38” ⇒ „271,38”
  function inMoneda(t, m) { return String(t == null ? "" : t).replace(/\$(\d[\d.,]*\d|\d)/g, function (_, n) { return (n.indexOf(",") >= 0 ? n : n.replace(".", ",")) + " " + (m || ""); }).replace(/ $/, ""); }
  // ultima bară ÎNCHISĂ (bara deschisă de mai puțin de 9 h - o sesiune EU / US - se lasă deoparte)
  function inchisa(b, acum) { var j = b.length - 1; if (j >= 1 && (acum === undefined ? Date.now() : acum) - b[j].t < 9 * 3600000) j--; return j; }
  function medie(b, j, n) { if (j - n + 1 < 0) return null; var s = 0; for (var i = j - n + 1; i <= j; i++) s += b[i].c; return s / n; }
  function trendLa(b, j) {
    var m50 = medie(b, j, 50), m200 = medie(b, j, 200), c = b[j].c; if (m50 === null) return null;
    if (m200 === null) return c > m50 ? "sus" : "jos";
    return c > m50 && m50 > m200 ? "sus" : c < m50 && m50 < m200 ? "jos" : "lateral";
  }
  function textTrend(t) { return t === "sus" ? "peste media de 50 și de 200 de zile (urcă)" : t === "jos" ? "sub media de 50 și de 200 de zile (coboară)" : t === "lateral" ? "între medii (fără direcție clară)" : "prea puțin istoric pentru trend"; }
  function randTabel(x, b, acum) {
    if (!Array.isArray(b) || b.length < 2) return null; var j = inchisa(b, acum); if (j < 1) return null;
    return { isin: x.isin, simbol: x.simbol, nume: x.nume, tip: x.tip, bursa: x.bursa, pret: b[j].c, zi: b[j - 1].c > 0 ? b[j].c / b[j - 1].c - 1 : null, trend: trendLa(b, j) };
  }
  // analiza unei poziții, pe barele zilnice ale simbolului - aceleași module ca pagina Trading 212 (fără planul și istoricul T212)
  // v100.126: modulele pot veni ca parametru (colectorul: Probabilitati nu stă pe globalThis acolo); fără ele, cele globale (pagina)
  function analizeaza(poz, b, acum, deps) {
    var g = deps || {}, AS = g.ActiuniSemnale || root.ActiuniSemnale, PR = g.Probabilitati || root.Probabilitati, CL = g.Consilier || root.Consilier, CS = g.Consiliu || root.Consiliu;
    if (!poz || !Array.isArray(b) || b.length < 30) return { eroare: "fara-bare" };
    if (!AS || !CS) return { eroare: "fara-module" };
    acum = acum === undefined ? Date.now() : acum;
    var pret = b[b.length - 1].c, de = poz.de ? Date.parse(poz.de + "T12:00:00Z") : null, pm = poz.pretMediuSimbol > 0 ? poz.pretMediuSimbol : poz.pretMediu;
    var p = { ticker: "SALT:" + poz.isin, simbol: poz.simbol, qty: poz.qty, pretMediu: pm, pret: pret, ppl: (pret - pm) * poz.qty, pctLei: pm > 0 ? pret / pm - 1 : null, plan: null, de: de,
      maxDupaCumparare: AS.maxDupaCumparare ? AS.maxDupaCumparare(b, de, pret) : null };
    var st = AS.stare(b, pret), sem = AS.semafor(p, st);
    // revizia (I3): stopul care urcă de cel puțin 15% de la maxim, ca la T212 (trailPozitie)
    var tr = AS.trailPozitie ? AS.trailPozitie(null, null) : {};
    var n = AS.niveluri(b, pret, { pretMediu: p.pretMediu, maxDupaCumparare: p.maxDupaCumparare, minTrail: tr.minTrail, trailProfil: tr.trailProfil, sursaTrail: tr.sursaTrail }), niv = n && n.nivel === "ok" ? n : null;
    var prob = [];
    try { if (niv && PR && b.length >= 120) { var v = PR.pentruActiune(b, { pret: pret, stop: niv.stopPozitie, tinta: niv.tintaPozitie, acum: acum, memo: {} }); prob = PR.randActiune ? PR.randActiune(v, null, {}) || [] : []; } } catch (e) { prob = []; }
    var sf = []; try { sf = CL ? CL.sfaturiPozitie(p, { inchise: [], acum: acum }) : []; } catch (e) { sf = []; }
    var cons = CS.alcatuiesteActiune({ sem: sem, niv: niv, prob: prob, sfaturi: sf, plan: null, pret: pret, pretMediu: p.pretMediu, qty: p.qty, costLei: null, simbol: p.simbol, socoteala: null, semZi: null, moneda: "USD" });   /* v100.272 (revizia): Salt convertește singur „$n” în moneda simbolului (saltInMoneda) - Consilierul îi dă prețul în „$”, ca înainte */
    return { p: p, st: st, sem: sem, niv: niv, prob: prob, sfaturi: sf, cons: cons };
  }
  // v100.365 (el 19.11, auditul Salt: listele „față de aceeași zi”, ideile „spun cinstit + urmăresc”): statistica pe blocuri, ca la Carnet -
  // media pe cazuri, intervalul pe blocuri de 28 de zile (zilele de bursă se mișcă împreună), t pe G−1. Sub 30 de cazuri sau 8 blocuri ⇒ „prea puține”.
  var T95 = [null, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09];
  function tCrit(df) { return !(df >= 1) ? null : df <= 20 ? T95[df] : df <= 30 ? 2.05 : 1.98; }
  var BLOC = 28 * ZI;
  function ziUtc(t) { return new Date(t).toISOString().slice(0, 10); }
  function statBlocuri(l, o) {
    o = o || {}; var minN = o.minN || 30, minB = o.minBlocuri || 8, bl = {}, n = 0, s = 0, pe = 0;
    l.forEach(function (x) { if (!isFinite(x.x)) return; var k = Math.floor(x.t / BLOC), b = bl[k] || (bl[k] = { s: 0, n: 0, t: k * BLOC }); b.s += x.x; b.n++; s += x.x; n++; if (x.x > 0) pe++; });
    var K = Object.keys(bl).sort(function (a, b) { return a - b; }), G = K.length, serie = K.map(function (k) { var b = bl[k]; return { t: b.t, m: b.s / b.n, n: b.n }; });
    if (n < minN || G < minB) return { n: n, blocuri: G, medie: null, lo: null, hi: null, pePlus: n ? pe / n : null, verdict: "prea-putine", serie: serie };
    var m = s / n, ss = 0; K.forEach(function (k) { var b = bl[k]; ss += Math.pow(b.s - m * b.n, 2); });
    var se = Math.sqrt(ss * G / (G - 1)) / n, tc = tCrit(G - 1), lo = m - tc * se, hi = m + tc * se;
    return { n: n, blocuri: G, medie: m, lo: lo, hi: hi, pePlus: pe / n, verdict: lo > 0 ? "peste" : hi < 0 ? "sub" : "n-am-aflat", serie: serie };
  }
  // serii = [{ ticker, puncte: [{ t, r, semnal }] }] (SugestiiActiuni.puncte; la revenire r = f, semnal = revine): fiecare semnal minus media
  // celorlalte instrumente din ACEEAȘI zi calendaristică (bursele au ore diferite ale barei) - reperul „o zi oarecare” lăuda zilele bune ale pieței
  function dovadaZi(serii, o) {
    o = o || {}; var minZi = o.minZi || 20, pauza = (o.pauzaZile || 0) * ZI, zile = {}, cazuri = [];
    (Array.isArray(serii) ? serii : []).forEach(function (s) { (s && Array.isArray(s.puncte) ? s.puncte : []).forEach(function (p) { if (!p || !isFinite(p.r) || !(p.t > 0)) return; var z = ziUtc(p.t), d = zile[z] || (zile[z] = { s: 0, n: 0 }); d.s += p.r; d.n++; }); });
    (Array.isArray(serii) ? serii : []).forEach(function (s) { var ultim = -Infinity; (s && Array.isArray(s.puncte) ? s.puncte.slice().sort(function (a, b) { return a.t - b.t; }) : []).forEach(function (p) { if (!p || !p.semnal || !isFinite(p.r) || !(p.t > 0)) return; if (pauza && p.t - ultim < pauza) return; ultim = p.t; var d = zile[ziUtc(p.t)]; if (!d || d.n < minZi) return; cazuri.push({ t: p.t, x: p.r - (d.s - p.r) / (d.n - 1) }); }); });
    var r = statBlocuri(cazuri, o); r.zile = Object.keys(cazuri.reduce(function (a, c) { a[ziUtc(c.t)] = 1; return a; }, {})).length; return r;
  }
  function pct1(v) { var a = Math.abs(v * 100).toFixed(1).replace(".", ","); return (v > 0.00049 ? "+" : v < -0.00049 ? "−" : "") + a + " %"; }
  var NUME_LISTA = { urcare: "un început de urcare", revers: "un revers timpuriu", revine: "o cădere mare (pe revenire)" }, ORIZ_LISTA = { urcare: 10, revers: 10, revine: 10 };
  function cate(n, sg, pl) { if (root.TextRo && root.TextRo.cate) return root.TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  function textDovadaZi(d, cheie) {
    var cine = NUME_LISTA[cheie] || "semnal";
    if (!d || d.verdict === "prea-putine" || d.medie === null || d.medie === undefined) return "După " + cine + ": prea puține cazuri pe istoric (" + cate((d && d.n) || 0, "caz", "cazuri") + ") ca să spun ceva.";
    return "După " + cine + ", față de celelalte instrumente Salt în aceleași zile, pe " + cate(ORIZ_LISTA[cheie] || 10, "zi", "zile") + ": " + pct1(d.medie) + " (" + pct1(d.lo) + " … " + pct1(d.hi) + "), " + cate(d.n, "caz", "cazuri") + " în " + cate(d.blocuri, "bloc", "blocuri") + " de 4 săptămâni - "
      + (d.verdict === "peste" ? "mai bine decât restul, dovedit pe istoric." : d.verdict === "sub" ? "mai slab decât restul, dovedit pe istoric." : "n-am aflat (nici mai bine, nici mai slab nu se vede).");
  }
  // registrul zilnic al ideilor (el: „urmăresc”): poza de azi = ideile cu prețul lor + toată lista Salt (compact); după ~20 de zile de bursă
  // (28 calendaristice) fiecare zi se judecă: media ideilor din ziua aceea minus media listei Salt din ACEEAȘI zi (aceleași prețuri, același vânt)
  function pozaZi(r) {
    if (!r || !(r.la > 0) || !Array.isArray(r.idei) || !r.idei.length || !Array.isArray(r.tabel)) return null;
    var univ = r.tabel.filter(function (x) { return x && x.simbol && x.pret > 0; }).map(function (x) { return [x.simbol, x.pret]; }); if (!univ.length) return null;
    var pr = {}; univ.forEach(function (u) { pr[u[0]] = u[1]; });
    return { zi: ziUtc(r.la), la: r.la, idei: r.idei.filter(function (x) { return x && x.simbol && (x.pret > 0 || pr[x.simbol] > 0); }).map(function (x) { return { s: x.simbol, p: x.pret > 0 ? x.pret : pr[x.simbol] }; }), univ: univ };
  }
  var ORIZ_URM = 28;
  function urmarire(poze, o) {
    o = o || {}; var l = (Array.isArray(poze) ? poze : []).filter(function (p) { return p && /^\d{4}-\d{2}-\d{2}$/.test(p.zi) && Array.isArray(p.univ); }).sort(function (a, b) { return a.zi < b.zi ? -1 : a.zi > b.zi ? 1 : 0; });
    var zile = [], z = function (s) { return Date.parse(s + "T00:00:00Z"); };
    for (var i = 0; i < l.length; i++) {
      var tinta = z(l[i].zi) + ORIZ_URM * ZI, j = -1; for (var k = i + 1; k < l.length; k++) if (z(l[k].zi) >= tinta) { j = k; break; }
      if (j < 0 || z(l[j].zi) > tinta + 7 * ZI) continue;
      var dupa = {}; l[j].univ.forEach(function (u) { dupa[u[0]] = u[1]; });
      var su = 0, nu = 0; l[i].univ.forEach(function (u) { var q = dupa[u[0]]; if (q > 0 && u[1] > 0) { su += q / u[1] - 1; nu++; } });
      var si = 0, ni = 0; (l[i].idei || []).forEach(function (x) { var q = dupa[x.s]; if (q > 0 && x.p > 0) { si += q / x.p - 1; ni++; } });
      if (nu >= 50 && ni >= 1) zile.push({ t: z(l[i].zi), zi: l[i].zi, x: si / ni - su / nu, idei: ni });
    }
    var r = statBlocuri(zile, { minN: o.minN || 20, minBlocuri: o.minBlocuri || 4 });
    r.judecate = zile.length; r.poze = l.length; r.deLa = l.length ? l[0].zi : null; r.primaJudecataZi = l.length ? ziUtc(z(l[0].zi) + ORIZ_URM * ZI) : null; r.n = zile.length;
    return r;
  }
  function dataRo(s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "—"; }
  function textUrmarire(u, acum) {
    if (!u || !u.poze) return "Urmărirea ideilor pornește la prima tură a colectorului: fiecare zi se judecă după ~20 de zile de bursă.";
    var cap = "Urmăresc ideile din " + dataRo(u.deLa) + " încoace, fiecare zi față de toată lista Salt din aceeași zi (" + cate(u.poze, "zi scrisă", "zile scrise") + "). ";
    if (!u.judecate) return "Urmăresc ideile din " + dataRo(u.deLa) + " încoace (" + cate(u.poze, "zi scrisă", "zile scrise") + "); prima judecată, după ~20 de zile de bursă, pe " + dataRo(u.primaJudecataZi) + ".";
    if (u.verdict === "prea-putine") return cap + cate(u.judecate, "zi judecată", "zile judecate") + " până acum - prea puține ca să spun ceva; un avantaj de +2 % pe 20 de zile s-ar vedea abia în ~1,4 ani.";
    return cap + cate(u.judecate, "zi judecată", "zile judecate") + ": ideile " + pct1(u.medie) + " pe 20 de zile față de restul (" + pct1(u.lo) + " … " + pct1(u.hi) + ") - "
      + (u.verdict === "peste" ? "mai bine, dovedit pe viu." : u.verdict === "sub" ? "mai slab, dovedit pe viu." : "n-am aflat încă.");
  }
  root.Salt = { cauta: cauta, pozitieCurata: pozitieCurata, perecheFx: perecheFx, medieInMonedaSimbolului: medieInMonedaSimbolului, verificaMedie: verificaMedie, inMoneda: inMoneda, nr: nr, analizeaza: analizeaza, randTabel: randTabel, textTrend: textTrend, trendLa: trendLa, inchisa: inchisa, dovadaZi: dovadaZi, textDovadaZi: textDovadaZi, pozaZi: pozaZi, urmarire: urmarire, textUrmarire: textUrmarire, statBlocuri: statBlocuri };
})(typeof globalThis !== "undefined" ? globalThis : this);
