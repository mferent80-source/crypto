// Reveniri și monede pentru short (v100.85, 03.10, el: „la fiecare câte un modul de revers cu coinuri care au scăzut puternic și acum
// sunt pe revenire, la fel și la stocks, plus la coinuri și opțiunea de coinuri în short direcționat”). Modul pur: pagina, colectorul și
// probele îl folosesc la fel. Regulile sunt cele probate pe 03.10 și FIXATE în spec (2026-10-03-reveniri-si-short-design.md) - nu se
// reglează după ce se văd rezultatele. Totul pe bare ÎNCHISE; un filtru, nu o predicție: istoricul se arată lângă fiecare listă.
var Reveniri = (function () {
  "use strict";
  var ORA = 3600000, H4 = 4 * ORA, ZI = 24 * ORA;
  var REGULI = {
    moneda: { cadere: 0.25, revenire: 0.08, barePeZi: 6, maxZile: 30, minZile: 10, vechimeZile: 2, medieZile: 3, orizontZile: 7 },
    actiune: { cadere: 0.2, revenire: 0.08, barePeZi: 1, maxZile: 60, minZile: 20, vechimeZile: 3, medieZile: 5, orizontZile: 10 }
  };
  var r4 = function (x) { return x === null || x === undefined || !isFinite(x) ? null : Math.round(x * 10000) / 10000; };
  var r2 = function (x) { return Math.round(x * 100) / 100; };
  // ultima bară ÎNCHISĂ la `acum` (bara de durată d se închide la t + d)
  function ultimaInchisa(b, d, acum) { var j = b.length - 1; while (j >= 0 && b[j].t + d > acum) j--; return j; }
  // regula pe barele b[0..j] (j = ultima bară închisă); r = REGULI.moneda sau REGULI.actiune
  function judeca(b, j, r) {
    var nMax = r.maxZile * r.barePeZi, nMin = r.minZile * r.barePeZi, nMed = r.medieZile * r.barePeZi;
    if (!Array.isArray(b) || j < nMax - 1 || j >= b.length) return null;
    var c = b[j].c, mx = -Infinity, mn = Infinity, iMin = j, s = 0, k;
    for (k = j - nMax + 1; k <= j; k++) if (b[k].h > mx) mx = b[k].h;
    for (k = j - nMin + 1; k <= j; k++) if (b[k].l < mn) { mn = b[k].l; iMin = k; }
    for (k = j - nMed + 1; k <= j; k++) s += b[k].c;
    if (!(c > 0) || !(mx > 0) || !(mn > 0)) return null;
    var cadere = 1 - c / mx, deLaMin = c / mn - 1, zile = (j - iMin) / r.barePeZi, peste = c > s / nMed;
    return { cadere: r4(cadere), deLaMin: r4(deLaMin), zileDeLaMin: Math.round(zile * 10) / 10, pesteMedie: peste, max: mx, min: mn,
      revine: cadere >= r.cadere && deLaMin >= r.revenire && zile >= r.vechimeZile && peste };
  }
  // clasamentul: barele de 4h de la Pionex au la coadă bara în curs - se judecă doar cele închise
  function monedaPeRevenire(b4h, acum) {
    if (!Array.isArray(b4h) || !b4h.length) return null;
    var v = judeca(b4h, ultimaInchisa(b4h, H4, acum === undefined ? Date.now() : acum), REGULI.moneda);
    return v ? { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine } : null;
  }
  // tura ideilor: la 8:00 ora României toate barele zilnice sunt închise
  function actiunePeRevenire(bz) {
    if (!Array.isArray(bz) || !bz.length) return null;
    var v = judeca(bz, bz.length - 1, REGULI.actiune); if (!v) return null;
    return { cadere: v.cadere, deLaMin: v.deLaMin, zileDeLaMin: v.zileDeLaMin, revine: v.revine, pret: bz[bz.length - 1].c, stop: r2(v.min * 0.99), tinta: r2(v.max) };
  }
  // „7 zile”, „66 de cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var P = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%"; };
  var PC = function (x) { return Math.round(x * 100) + "%"; };
  var TEXT_SUPRAVIETUITORI = "Doar acțiunile care sunt azi în listă: cifra iese mai bună decât a fost în realitate.";
  function stat(l) {
    var n = l.length, s = 0, plus = 0; l.forEach(function (x) { s += x; if (x > 0) plus++; });
    var v = l.slice().sort(function (x, y) { return x - y; });
    return { n: n, pePlus: n ? plus / n : null, medie: n ? s / n : null, mediana: n ? v[Math.floor(n / 2)] : null };
  }
  // punctele de judecată ale unei serii, pentru istoric: unul pe zi, ieșirea peste orizont. o = { r: REGULI.*, dupaTimp (monede: ieșirea
  // la t + orizont, barele pot avea goluri), start (indexul minim: monede 499 = fereastra clasamentului), G + short (liniște + direcția short) }
  function puncte(b, o) {
    var r = o.r, out = [], nMax = r.maxZile * r.barePeZi, j0 = Math.max(nMax - 1, o.start || 0), k = 0;
    if (!Array.isArray(b)) return out;
    for (var j = j0; j < b.length; j += r.barePeZi) {
      var iesire;
      if (o.dupaTimp) { var tinta = b[j].t + r.orizontZile * ZI; while (k < b.length && b[k].t < tinta) k++; if (k >= b.length) break; iesire = b[k].c; }
      else { if (j + r.orizontZile >= b.length) break; iesire = b[j + r.orizontZile].c; }
      var v = judeca(b, j, r); if (!v) continue;
      var p = { t: b[j].t, f: iesire / b[j].c - 1, revine: v.revine };
      if (o.short && o.G) { var fer = b.slice(Math.max(0, j - 499), j + 1), reg = o.G.regimPeBare(fer, 1, 6); p.short = !!(reg && !reg.miscare && o.G.directie(fer, o.G.agrega(fer, ZI)).dir === "short"); }
      out.push(p);
    }
    return out;
  }
  // „mai bine” / „mai slab” cer AMÂNDOUĂ: ≥ 3 puncte la „pe plus” și media în același sens
  function eticheta(a, b) {
    if (!a || !b || !a.n && a.n !== undefined || a.pePlus === null || a.pePlus === undefined || b.pePlus === null) return null;
    return a.pePlus - b.pePlus >= 0.03 - 1e-9 && a.medie > b.medie ? "mai bine" : b.pePlus - a.pePlus >= 0.03 - 1e-9 && a.medie < b.medie ? "mai slab" : "cam la fel";
  }
  // grupul (punctele cu regula „da”, cel mult unul pe serie la `pauzaZile`) față de reper (toate punctele, pe aceleași serii); o.short: câștigul = −randamentul
  function dovada(serii, cheie, o) {
    o = o || {}; var semn = o.short ? -1 : 1, pauza = (o.pauzaZile || 7) * ZI, grup = [], baza = [], sapt = {};
    (serii || []).forEach(function (l) {
      var ultim = -Infinity;
      (l || []).forEach(function (p) {
        if (!p || !isFinite(p.f)) return;
        var g = semn * p.f; baza.push(g);
        if (p[cheie] === true && p.t - ultim >= pauza) { ultim = p.t; grup.push(g); sapt[Math.floor(p.t / (7 * ZI))] = 1; }
      });
    });
    var a = stat(grup), b = stat(baza), sp = Object.keys(sapt).length;
    if (!b.n) return null;
    return { n: a.n, saptamani: sp, pePlus: r4(a.pePlus), medie: r4(a.medie), mediana: r4(a.mediana), baza: { n: b.n, pePlus: r4(b.pePlus), medie: r4(b.medie) },
      eticheta: a.n ? eticheta(a, b) : null, putine: a.n < 100 || sp < 20 };
  }
  // boții LUI închiși, după starea monedei LA PORNIRE: pe revenire față de toți; short pe monede cu direcția short față de toți boții short.
  // bareDe(simbol) -> bare de 4h; G = GridCalcul (direcția clasamentului)
  function dovadaBoti(boti, bareDe, G) {
    var rev = [], toti = [], ss = [], totiS = [], nMax = REGULI.moneda.maxZile * REGULI.moneda.barePeZi;
    (Array.isArray(boti) ? boti : []).forEach(function (x) {
      if (!x || !x.simbol || !isFinite(x.pornit) || !isFinite(x.net)) return;
      var b = bareDe(x.simbol); if (!Array.isArray(b) || b.length < nMax) return;
      var j = ultimaInchisa(b, H4, x.pornit), v = judeca(b, j, REGULI.moneda); if (!v) return;
      toti.push(x.net); if (v.revine) rev.push(x.net);
      if (String(x.dir || "").toLowerCase() === "short") {
        totiS.push(x.net);
        if (G) { var fer = b.slice(Math.max(0, j - 499), j + 1); if (G.directie(fer, G.agrega(fer, ZI)).dir === "short") ss.push(x.net); }
      }
    });
    var s = function (l) { var t = stat(l); return { n: t.n, pePlus: r4(t.pePlus), mediana: t.mediana === null ? null : r2(t.mediana) }; };
    return { revenire: Object.assign(s(rev), { reper: s(toti) }), short: Object.assign(s(ss), { reper: s(totiS) }) };
  }
  var ORIZ = { monede: "7 zile", short: "7 zile", actiuni: "10 zile de bursă" };
  function textDovada(d, cum) {
    if (!d || !d.baza || d.n === null || d.n === undefined) return "Istoricul se socotește azi de la 8:00.";
    var cap = cum === "short" ? "Ca short, pe monedele liniștite cu direcția short: " : "După o cădere ca asta: ", oz = ORIZ[cum] || "7 zile";
    if (!d.n) return cap + "niciun caz încă în istoric; o zi oarecare: " + PC(d.baza.pePlus) + " pe plus în " + oz + ".";
    return cap + PC(d.pePlus) + " pe plus în " + oz + ", " + P(d.medie) + " în medie; o zi oarecare: " + PC(d.baza.pePlus) + ", " + P(d.baza.medie)
      + (d.eticheta ? " — " + d.eticheta : "") + " (" + cate(d.n, "caz", "cazuri") + (d.putine ? ", puține" : "") + ").";
  }
  function textBoti(bt, cum) {
    if (!bt) return "";
    if (!bt.n) return cum === "short" ? "N-ai pornit încă boți short pe monede cu direcția short." : "N-ai pornit încă boți așa.";
    return (cum === "short" ? "Boții tăi short pe monede cu direcția short" : "Boții tăi porniți așa") + ": " + PC(bt.pePlus) + " pe plus din " + bt.n
      + (bt.reper && bt.reper.n ? ", față de " + PC(bt.reper.pePlus) + " la toți boții tăi" + (cum === "short" ? " short" : "") : "") + ".";
  }
  // notările [{zi, simbol|ticker, pret}] + prețurile de acum: cât au făcut de la prețul sugestiei (cele de cel puțin o.zile), după comision
  function urmarire(ist, preturi, acum, o) {
    o = o || {}; var zile = o.zile || 7, cost = o.cost || 0, semn = o.short ? -1 : 1, ch = o.cheie || "simbol", t = acum === undefined ? Date.now() : acum;
    var l = (Array.isArray(ist) ? ist : []).filter(function (x) { return x && x.pret > 0 && preturi && preturi[x[ch]] > 0 && t - Date.parse(x.zi + "T12:00:00Z") >= zile * ZI; });
    var r = l.map(function (x) { return semn * (preturi[x[ch]] / x.pret - 1) - cost; }), p = 0, s = 0;
    r.forEach(function (v) { s += v; if (v > 0) p++; });
    var u = { n: r.length, pePlus: p, medie: r.length ? s / r.length : null };
    u.text = !u.n ? "Sugestiile se urmăresc de azi: după ~30 se poate spune cu cifre dacă merită." : "Din " + cate(u.n, "sugestie", "sugestii") + " de cel puțin " + cate(zile, "zi", "zile") + ": " + p + " pe plus, " + P(u.medie) + " în medie de la prețul sugestiei, după comision" + (u.n < 30 ? " (puține — mai așteaptă)" : "") + ".";
    return u;
  }
  return { REGULI: REGULI, TEXT_SUPRAVIETUITORI: TEXT_SUPRAVIETUITORI, ultimaInchisa: ultimaInchisa, judeca: judeca, monedaPeRevenire: monedaPeRevenire, actiunePeRevenire: actiunePeRevenire,
    puncte: puncte, eticheta: eticheta, dovada: dovada, dovadaBoti: dovadaBoti, textDovada: textDovada, textBoti: textBoti, urmarire: urmarire };
})();
if (typeof globalThis !== "undefined") globalThis.Reveniri = Reveniri;
