// v100.378 (I-922…I-926; el, 23.11.2026: „în Radar, și la bot și la Trade 212, să fie vizibilă mișcarea live, cât a crescut astăzi sau scăzut,
// 3 zile, 5-7” ⇒ „fă toate, 24 de ore, și 3 zile la acțiuni”): cât s-a mișcat PREȚUL pe ferestre (24 h / 3 zile / 7 zile / 30 de zile), cât a
// făcut BOTUL pe aceleași ferestre (din istoria scrisă de colector o dată pe minut, ținută 7 zile) și cât s-au mișcat ACȚIUNILE (azi / 3 / 5 / 30
// de ședințe). Modul pur: fără DOM, fără rețea, fără ceas (acum vine din afară). Probat în scripts/proba-v100378.mjs.
// Sunt FAPTE, nu semnale: direcția a fost probată de opt ori pe datele lui și a ieșit ban - nimic de aici nu spune ce urmează.
var Miscare = (function () {
  "use strict";
  var MIN = 60000, ORA = 60 * MIN, ZI = 24 * ORA;
  // ferestrele prețului: fiecare pe intervalul de lumânări care o acoperă deja în pagină (TB_PERIOADE din app.js)
  var FERESTRE = [
    { k: "24h", tf: "5M", ms: ZI, per: 5 * MIN, et: "24 h" },
    { k: "3z", tf: "15M", ms: 3 * ZI, per: 15 * MIN, et: "3 zile" },
    { k: "7z", tf: "60M", ms: 7 * ZI, per: ORA, et: "7 zile" },
    { k: "30z", tf: "4H", ms: 30 * ZI, per: 4 * ORA, et: "30 de zile" }];
  // ferestrele botului: istoria lui ține 7 zile (functions/api/istoric-bot.js, PASTRARE_MS) ⇒ 30 de zile nu se poate. Pe datele lui (23.11.2026:
  // ultimii 12 boți închiși au trăit între 20 de minute și 42 de ore) ferestrele de zile ar sta aproape mereu goale ⇒ și 1 oră, și 4 ore.
  var FERESTRE_BOT = [{ k: "1h", ms: ORA, et: "1 oră" }, { k: "4h", ms: 4 * ORA, et: "4 ore" }, { k: "24h", ms: ZI, et: "24 h" }, { k: "3z", ms: 3 * ZI, et: "3 zile" }, { k: "7z", ms: 7 * ZI, et: "7 zile" }];
  var TOL_BOT_MS = 30 * MIN;      // punctul din istorie cel mult la 30 de minute de clipa căutată (la ferestrele scurte: a 12-a parte din fereastră)
  function tolBot(ms) { return Math.min(TOL_BOT_MS, ms / 12); }   /* 1 oră ⇒ 5 minute, 4 ore ⇒ 20 de minute, de la 6 ore în sus ⇒ 30 de minute */
  var SARE_MAX = 0.5;             // prețul de acum la peste 50% de ultima închidere zilnică = seria nu e a aceleiași hârtii (pence / lire, split)

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }

  // Mișcarea prețului pe o fereastră. bare = [{t,o,h,l,c}] crescător (cu lumânarea în formare), pret = prețul de acum, per = durata unei lumânări.
  // Reperul = prețul din clipa (acum − ms): lumânarea care o cuprinde (deschiderea ei dacă clipa e în prima jumătate, altfel închiderea);
  // dacă istoria începe cu cel mult o lumânare mai târziu (cazul obișnuit: exact N lumânări aduse), deschiderea primei. Mai scurt ⇒ null.
  // ⇒ { pct, ref, min, max, loc (0 = la minimul ferestrei, 1 = la maxim), deLa }
  function fereastra(bare, pret, acum, ms, per) {
    var p = nr(pret), l = Array.isArray(bare) ? bare : [];
    if (!(p > 0) || !l.length || !(ms > 0) || !(per > 0) || !(acum > 0)) return null;
    var tinta = acum - ms, i0 = -1, t0 = null;
    for (var i = 0; i < l.length; i++) { var t = nr(l[i] && l[i].t); if (t !== null && t + per > tinta) { i0 = i; t0 = t; break; } }
    if (i0 < 0) return null;                                    /* toate lumânările sunt mai vechi decât fereastra */
    var b = l[i0], ref;
    if (t0 <= tinta) ref = tinta - t0 < per / 2 ? nr(b.o) : nr(b.c);
    else if (t0 - tinta <= per) ref = nr(b.o);
    else return null;                                           /* istoria nu ajunge până la începutul ferestrei (monedă nouă, gaură) */
    if (!(ref > 0)) return null;
    var min = Math.min(p, ref), max = Math.max(p, ref);
    for (var j = t0 <= tinta && tinta - t0 >= per / 2 ? i0 + 1 : i0; j < l.length; j++) {
      var lo = nr(l[j] && l[j].l), hi = nr(l[j] && l[j].h);
      if (lo > 0 && lo < min) min = lo;
      if (hi > 0 && hi > max) max = hi;
    }
    return { pct: (p / ref - 1) * 100, ref: ref, min: min, max: max, loc: max > min ? (p - min) / (max - min) : 0.5, deLa: Math.max(t0, tinta) };
  }

  // toate ferestrele deodată: lumPe = { "5M": bare, "15M": bare, … } ⇒ { "24h": fereastra | null, … }
  function ferestre(lumPe, pret, acum) {
    var o = {};
    FERESTRE.forEach(function (f) { o[f.k] = fereastra(lumPe && lumPe[f.tf], pret, acum, f.ms, f.per); });
    return o;
  }

  // „o zi obișnuită” a monedei: mediana mișcării absolute pe 24 h, din lumânările de 4 ore (6 = o zi), pe ce e adus (~30 de zile).
  // Doar lumânări ÎNCHISE (ultima, în formare, nu intră). Sub 60 de ferestre ⇒ null (prea puțin ca „obișnuit” să însemne ceva).
  // Revizia: doar ultimele 180 închise (30 de zile), oricâte ar fi aduse - „Direcția” aduce 500 (83 de zile), cache-ul graficului 180, iar
  // cifra nu trebuie să depindă de sursă (textul de pe ecran spune „30 de zile”).
  function ziObisnuita(bare4h) {
    var c = (Array.isArray(bare4h) ? bare4h : []).slice(-181, -1).map(function (b) { return nr(b && b.c); }).filter(function (v) { return v > 0; }), a = [];
    for (var i = 6; i < c.length; i++) a.push(Math.abs(c[i] / c[i - 6] - 1) * 100);
    if (a.length < 60) return null;
    a.sort(function (x, y) { return x - y; });
    var m = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    return m > 0 ? { mediana: m, n: a.length } : null;
  }
  // de câte ori e mișcarea de pe 24 h față de ziua obișnuită (mereu pozitiv: mărimea, nu sensul)
  function deCateOri(pct24, zi) { var p = nr(pct24); return p === null || !zi || !(zi.mediana > 0) ? null : Math.abs(p) / zi.mediana; }

  // față de reper (BTC la monede, Nasdaq-100 la acțiuni), pe ACEEAȘI fereastră, în puncte procentuale; simetric, fără „beta”
  function fataDe(a, b) { var x = a && nr(a.pct), y = b && nr(b.pct); return x === null || y === null ? null : x - y; }

  // Cât a făcut BOTUL pe o fereastră. intrari = istoria lui [{t, profitTotal, gridProfitBrut, gridJos, gridSus}] (orice ordine),
  // o = { total, grile, pornitLa, gridJos, gridSus } = citirea de ACUM.
  // ⇒ { total, grile, rest, deLa, gridMutat } | { motiv: "tanar", varsta } | { motiv: "scurt" } | { motiv: "gol" } | null (fără total acum)
  //   total = totalul de acum − totalul de atunci; grile = cât au adus grilele în fereastră (comisionul perechilor e deja scăzut din ele);
  //   rest = total − grile = poziția deschisă, finanțarea și celelalte costuri la un loc (nu se despart: ar fi a doua socoteală).
  function bot(intrari, acum, ms, o) {
    var tot = nr(o && o.total); if (tot === null || !(ms > 0) || !(acum > 0)) return null;
    var tinta = acum - ms, pornit = nr(o.pornitLa);
    if (pornit !== null && pornit > tinta) return { motiv: "tanar", varsta: Math.max(0, acum - pornit) };
    var l = (Array.isArray(intrari) ? intrari : []).filter(function (x) { return x && nr(x.t) !== null && nr(x.profitTotal) !== null; });
    if (!l.length) return { motiv: "scurt" };
    var e = null, d = Infinity, tMin = Infinity;
    for (var i = 0; i < l.length; i++) { var t = nr(l[i].t), dd = Math.abs(t - tinta); if (t < tMin) tMin = t; if (dd < d) { d = dd; e = l[i]; } }
    if (d > tolBot(ms)) return { motiv: tMin > tinta ? "scurt" : "gol" };
    var total = tot - nr(e.profitTotal), g = nr(o.grile), g0 = nr(e.gridProfitBrut), grile = g !== null && g0 !== null ? g - g0 : null;
    var mutat = function (a, b2) { a = nr(a); b2 = nr(b2); return a !== null && b2 !== null && b2 > 0 && Math.abs(a / b2 - 1) > 1e-6; };
    return { total: total, grile: grile, rest: grile === null ? null : total - grile, deLa: nr(e.t), gridMutat: mutat(o.gridJos, e.gridJos) || mutat(o.gridSus, e.gridSus) };
  }
  function botFerestre(intrari, acum, o) { var r = {}; FERESTRE_BOT.forEach(function (f) { r[f.k] = bot(intrari, acum, f.ms, o); }); return r; }

  // Ședințele unei acțiuni. bare = barele zilnice [{t,c}] crescător; ziAzi = ziua de ACUM pe bursa ei („AAAA-LL-ZZ”); ziLocala(t) = ziua unei bare
  // pe aceeași bursă; deschisa = bursa e deschisă acum. ⇒ { ant: închiderile ședințelor de DINAINTEA celei curente / ultimei, eAzi, zi }
  //   - ultima bară e de azi (în formare sau deja închisă)      ⇒ ședința curentă e azi; ant = fără ultima
  //   - ultima bară e mai veche și bursa e deschisă              ⇒ azi încă n-are bară; ant = toate
  //   - ultima bară e mai veche și bursa e închisă (weekend, dimineața) ⇒ „ultima ședință” e ziua ultimei bare; ant = fără ultima
  // Revizia independentă (🔴, 23.11.2026): în al treilea caz ultima bară poate fi cu o ședință ÎN URMĂ - bara ședinței tocmai închise se
  // readuce abia după până la 30 de minute, iar în zilele scurte (27.11, 24.12) pagina scoate bara zilei până la 16:00, deși bursa s-a închis
  // la 13:00. Atunci „ultima ședință” compara prețul de acum cu închiderea de ALALTĂIERI: două ședințe într-o cifră. De aceea vine și
  // ziInchisa = ultima zi ÎNCHISĂ a bursei (CalendarBursa.ultimaZiInchisa): dacă ultima bară e mai veche decât ea, ședința aceea încă n-are
  // bară ⇒ prețul de acum e al ei și toate închiderile sunt „de dinainte”.
  // `inchidere` = închiderea ședinței judecate când ea e ÎNCHISĂ și are bară (mișcarea se socotește pe ea, nu pe prețul de după program);
  // null = se folosește prețul de acum (ședința e în curs, sau încă n-are bară).
  function sedinte(bare, ziAzi, ziLocala, deschisa, ziInchisa) {
    var l = (Array.isArray(bare) ? bare : []).filter(function (b) { return b && nr(b.c) > 0 && nr(b.t) !== null; });
    if (!l.length) return { ant: [], eAzi: false, zi: null, inchidere: null };
    var u = l[l.length - 1], ziU = null; try { ziU = ziLocala ? ziLocala(u.t) : null; } catch (e) { ziU = null; }
    var c = l.map(function (b) { return nr(b.c); }), ultima = c[c.length - 1];
    if (ziU && ziAzi && ziU === ziAzi) return { ant: c.slice(0, -1), eAzi: true, zi: ziU, inchidere: deschisa ? null : ultima };
    if (deschisa) return { ant: c, eAzi: true, zi: ziAzi || null, inchidere: null };
    if (ziInchisa && ziU && ziU < ziInchisa) return { ant: c, eAzi: ziInchisa === ziAzi, zi: ziInchisa, inchidere: null };
    return { ant: c.slice(0, -1), eAzi: false, zi: ziU, inchidere: ultima };
  }
  // Mișcarea acțiunii față de închiderea de dinaintea ședinței (azi), de acum 3, 5 și 30 de ședințe; pret = prețul de acum (cel din coloana „Acum”).
  // ant = închiderile de dinainte (cea mai nouă la capăt). Prețul la peste 50% de ultima închidere ⇒ nesigur (nimic afișat, nu o cifră falsă).
  function actiune(ant, pret) {
    var p = nr(pret), a = Array.isArray(ant) ? ant : [], n = a.length, gol = { azi: null, z3: null, z5: null, z30: null, nesigur: false };
    if (!(p > 0) || !n) return gol;
    if (Math.abs(p / a[n - 1] - 1) > SARE_MAX) { gol.nesigur = true; return gol; }
    var f = function (k) { var r = n >= k ? a[n - k] : null; return r > 0 ? (p / r - 1) * 100 : null; };
    return { azi: f(1), z3: f(3), z5: f(5), z30: f(30), nesigur: false };
  }
  // cât înseamnă în lei mișcarea de pct% a unei poziții care valorează ACUM valLei (la cursul de acum: mișcarea cursului nu e în cifră)
  function leiDinPct(valLei, pct) { var v = nr(valLei), p = nr(pct); return v === null || p === null || p <= -100 ? null : v * p / (100 + p); }
  // ziua contului din pozițiile lui: l = [{ simbol, lei }] (lei = null când poziția n-are cifră) ⇒ { total, n, lipsa, top (cel mult 3, după mărime) }
  function contAzi(l) {
    var cu = (Array.isArray(l) ? l : []).filter(function (x) { return x && nr(x.lei) !== null; }), tot = 0;
    cu.forEach(function (x) { tot += nr(x.lei); });
    var top = cu.slice().sort(function (a, b) { return Math.abs(nr(b.lei)) - Math.abs(nr(a.lei)); }).slice(0, 3).map(function (x) { return { simbol: x.simbol, lei: nr(x.lei) }; });
    return { total: cu.length ? tot : null, n: cu.length, lipsa: (Array.isArray(l) ? l.length : 0) - cu.length, top: top };
  }

  // Ziua contului pe ȘEDINȚĂ (revizia: „azi” nu se adună cu „ultima ședință” - la 10:00, cu Xetra deschisă, mișcarea de vineri a acțiunilor
  // americane intra în totalul „de azi”). l = [{ simbol, lei, eAzi, zi }]. Grupul adunat: pozițiile de azi, dacă există; altfel cele din
  // ședința cea mai nouă. ⇒ { total, n, lipsa (din grup, fără cifră), top, altele (poziții din altă ședință), eAzi, zi }
  function contSedinta(l) {
    var t = (Array.isArray(l) ? l : []).filter(function (x) { return x && x.zi; }), azi = t.filter(function (x) { return x.eAzi; }), zi = null;
    if (azi.length) zi = azi[0].zi; else t.forEach(function (x) { if (zi === null || x.zi > zi) zi = x.zi; });
    var grup = azi.length ? azi : t.filter(function (x) { return x.zi === zi; }), c = contAzi(grup);
    return { total: c.total, n: c.n, lipsa: c.lipsa, top: c.top, altele: (Array.isArray(l) ? l.length : 0) - grup.length, eAzi: azi.length > 0, zi: zi };
  }
  // rotunjirea pentru AFIȘARE (z zecimale): semnul și culoarea se aleg după cifra rotunjită, iar un zero rotunjit e zero fără semn
  // (revizia: −0,03% ieșea „−0,0%” verde, −0,4 lei ieșea „−0 lei”)
  function rot(v, z) { var x = nr(v); if (x === null) return null; var k = Math.pow(10, z || 0), r = Math.round(x * k) / k; return r === 0 ? 0 : r; }

  return { contSedinta: contSedinta, rot: rot, FERESTRE: FERESTRE, FERESTRE_BOT: FERESTRE_BOT, TOL_BOT_MS: TOL_BOT_MS, tolBot: tolBot, SARE_MAX: SARE_MAX, fereastra: fereastra, ferestre: ferestre, ziObisnuita: ziObisnuita, deCateOri: deCateOri, fataDe: fataDe, bot: bot, botFerestre: botFerestre, sedinte: sedinte, actiune: actiune, leiDinPct: leiDinPct, contAzi: contAzi };
})();
