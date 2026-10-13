// Calendarul burselor (v100.175; el 13.10: „date sigure” din comparația cu o platformă instituțională - punctul 4). Modul pur, fără rețea,
// probat în scripts/proba-v100175.mjs. Îl folosesc pagina și colectorul (ziua sesiunii, „bursa e deschisă”, ultima zi închisă).
// Sărbătorile sunt CALCULATE (Paștele catolic, „a treia zi de luni din ianuarie”…), nu scrise de mână pe ani: NYSE (cu mutarea pe vineri /
// luni când pică în weekend, Anul Nou de sâmbătă NU se mută pe 31.12), Xetra (fără mutări) și Londra (cu zilele înlocuitoare).
// Zilele scurte (24.12 la NYSE, ziua de după Thanksgiving) sunt tratate ca zile întregi: barele lor sunt tot bare de zi.
var CalendarBursa = (function () {
  "use strict";
  var ZI = 86400000;
  var BURSE = {
    NYSE: { tz: "America/New_York", deschide: 570, inchide: 960 },
    XETRA: { tz: "Europe/Berlin", deschide: 540, inchide: 1050 },
    LSE: { tz: "Europe/London", deschide: 480, inchide: 990 }
  };
  function ymd(an, luna, zi) { return an + "-" + (luna < 10 ? "0" : "") + luna + "-" + (zi < 10 ? "0" : "") + zi; }
  function dinUtc(d) { return d.toISOString().slice(0, 10); }
  function zs(an, luna, zi) { return new Date(Date.UTC(an, luna - 1, zi)).getUTCDay(); }
  // a n-a zi „ziSapt” (0 = duminică) din lună; n = -1 ⇒ ultima
  function aNa(an, luna, ziSapt, n) {
    if (n > 0) { var z = 1 + ((ziSapt - zs(an, luna, 1) + 7) % 7) + (n - 1) * 7; return ymd(an, luna, z); }
    var ultima = new Date(Date.UTC(an, luna, 0)).getUTCDate(), u = ultima - ((zs(an, luna, ultima) - ziSapt + 7) % 7);
    return ymd(an, luna, u);
  }
  // Paștele (calendarul gregorian, algoritmul anonim Meeus/Jones/Butcher)
  function paste(an) {
    var a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var luna = Math.floor((h + l - 7 * m + 114) / 31), zi = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(an, luna - 1, zi);
  }
  // NYSE: sâmbătă ⇒ vinerea dinainte, duminică ⇒ lunea de după
  function mutatNyse(an, luna, zi) { var w = zs(an, luna, zi), t = Date.UTC(an, luna - 1, zi); return dinUtc(new Date(w === 6 ? t - ZI : w === 0 ? t + ZI : t)); }
  var memo = {};
  function sarbatori(an, bursa) {
    var k = bursa + an; if (memo[k]) return memo[k];
    var s = {}, p = paste(an), add = function (x) { s[x] = true; };
    if (bursa === "NYSE") {
      if (zs(an, 1, 1) !== 6) add(mutatNyse(an, 1, 1));   // Anul Nou de sâmbătă nu se mută pe 31.12
      add(aNa(an, 1, 1, 3)); add(aNa(an, 2, 1, 3)); add(dinUtc(new Date(p - 2 * ZI))); add(aNa(an, 5, 1, -1));
      if (an >= 2022) add(mutatNyse(an, 6, 19));
      add(mutatNyse(an, 7, 4)); add(aNa(an, 9, 1, 1)); add(aNa(an, 11, 4, 4)); add(mutatNyse(an, 12, 25));
      if (zs(an + 1, 1, 1) === 6) { /* 31.12 rămâne zi de bursă */ }
    } else if (bursa === "XETRA") {
      [ymd(an, 1, 1), dinUtc(new Date(p - 2 * ZI)), dinUtc(new Date(p + ZI)), ymd(an, 5, 1), ymd(an, 12, 24), ymd(an, 12, 25), ymd(an, 12, 26), ymd(an, 12, 31)].forEach(add);
    } else if (bursa === "LSE") {
      var w1 = zs(an, 1, 1); add(ymd(an, 1, w1 === 6 ? 3 : w1 === 0 ? 2 : 1));
      add(dinUtc(new Date(p - 2 * ZI))); add(dinUtc(new Date(p + ZI))); add(aNa(an, 5, 1, 1)); add(aNa(an, 5, 1, -1)); add(aNa(an, 8, 1, -1));
      var w25 = zs(an, 12, 25);
      if (w25 === 6) { add(ymd(an, 12, 27)); add(ymd(an, 12, 28)); } else if (w25 === 0) { add(ymd(an, 12, 26)); add(ymd(an, 12, 27)); }
      else if (w25 === 5) { add(ymd(an, 12, 25)); add(ymd(an, 12, 28)); } else { add(ymd(an, 12, 25)); add(ymd(an, 12, 26)); }
    }
    return (memo[k] = s);
  }
  // bursa simbolului: sufixele Yahoo / T212 europene ⇒ Xetra (Frankfurt, München, Paris, Amsterdam, Milano au aceleași ore și aproape
  // aceleași sărbători), .L ⇒ Londra, restul ⇒ New York
  function bursaSimbol(s) {
    s = String(s || "").toUpperCase();
    if (/\.L$|_GB_EQ$|L_EQ$/.test(s)) return "LSE";
    if (/\.(DE|F|MU|BE|DU|HM|SG|PA|AS|MI|BR|MC|VI)$|_(DE|FR|NL|IT|ES|BE|AT)_EQ$|D_EQ$/.test(s)) return "XETRA";
    return "NYSE";
  }
  function ceas(acum, tz) {
    var o = {};
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(acum)).forEach(function (x) { o[x.type] = x.value; });
    return { zi: o.year + "-" + o.month + "-" + o.day, min: Number(o.hour) * 60 + Number(o.minute) };
  }
  function eZiDeBursa(zi, bursa) {
    var d = new Date(zi + "T12:00:00Z"), w = d.getUTCDay();
    return w !== 0 && w !== 6 && !sarbatori(d.getUTCFullYear(), bursa || "NYSE")[zi];
  }
  function inapoi(zi, bursa) { var t = Date.parse(zi + "T12:00:00Z"); do { t -= ZI; } while (!eZiDeBursa(dinUtc(new Date(t)), bursa)); return dinUtc(new Date(t)); }
  // ziua sesiunii: înainte de deschidere (ora locală a bursei), în weekend sau de sărbătoare ⇒ sesiunea precedentă
  function ziSesiune(acum, simbol) {
    var b = bursaSimbol(simbol), B = BURSE[b], c = ceas(acum, B.tz);
    return eZiDeBursa(c.zi, b) && c.min >= B.deschide ? c.zi : inapoi(c.zi, b);
  }
  // ultima zi a cărei ședință s-a ÎNCHIS (pentru „azi” față de „ieri” pe bare de zi)
  function ultimaZiInchisa(acum, simbol) {
    var b = bursaSimbol(simbol), B = BURSE[b], c = ceas(acum, B.tz);
    return eZiDeBursa(c.zi, b) && c.min >= B.inchide ? c.zi : inapoi(c.zi, b);
  }
  function stare(acum, simbol) {
    var b = bursaSimbol(simbol), B = BURSE[b], c = ceas(acum, B.tz), lucru = eZiDeBursa(c.zi, b);
    return { bursa: b, zi: c.zi, ziDeBursa: lucru, deschisa: lucru && c.min >= B.deschide && c.min < B.inchide, dupaInchidere: lucru && c.min >= B.inchide + 5 && c.min < B.inchide + 120, minut: c.min };
  }
  // ora (ms UTC) la care se închide ședința din ziua `zi` (YYYY-MM-DD) a bursei simbolului - pentru „bara era închisă atunci?”
  function inchidereLa(zi, simbol) {
    var b = bursaSimbol(simbol), B = BURSE[b], t = Date.parse(zi + "T00:00:00Z") + B.inchide * 60000;
    for (var i = 0; i < 3; i++) { var c = ceas(t, B.tz), dif = (Date.parse(c.zi + "T00:00:00Z") - Date.parse(zi + "T00:00:00Z")) / 60000 + c.min - B.inchide; if (!dif) break; t -= dif * 60000; }
    return t;
  }
  // ziua calendaristică a momentului `t` la bursa simbolului (o bară de zi cu `t` la deschidere ⇒ ziua ei de ședință)
  function ziLocala(t, simbol) { return ceas(t, BURSE[bursaSimbol(simbol)].tz).zi; }
  return { BURSE: BURSE, ziLocala: ziLocala, sarbatori: sarbatori, paste: paste, bursaSimbol: bursaSimbol, eZiDeBursa: eZiDeBursa, ziSesiune: ziSesiune, ultimaZiInchisa: ultimaZiInchisa, stare: stare, inchidereLa: inchidereLa };
})();
