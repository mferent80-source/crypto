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
  function inMoneda(t, m) { return String(t == null ? "" : t).replace(/\$(\d[\d,]*(?:\.\d+)?)/g, function (_, n) { return n.replace(/,/g, "").replace(".", ",") + " " + (m || ""); }).replace(/ $/, ""); }
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
    var cons = CS.alcatuiesteActiune({ sem: sem, niv: niv, prob: prob, sfaturi: sf, plan: null, pret: pret, pretMediu: p.pretMediu, qty: p.qty, costLei: null, simbol: p.simbol, socoteala: null, semZi: null });
    return { p: p, st: st, sem: sem, niv: niv, prob: prob, sfaturi: sf, cons: cons };
  }
  root.Salt = { cauta: cauta, pozitieCurata: pozitieCurata, perecheFx: perecheFx, medieInMonedaSimbolului: medieInMonedaSimbolului, verificaMedie: verificaMedie, inMoneda: inMoneda, nr: nr, analizeaza: analizeaza, randTabel: randTabel, textTrend: textTrend, trendLa: trendLa, inchisa: inchisa };
})(typeof globalThis !== "undefined" ? globalThis : this);
