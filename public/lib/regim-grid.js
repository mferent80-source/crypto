/* v100.340 (I-872, restul): regimul pentru GRID. Un grid câștigă din oscilație și pierde din înaintarea într-o singură parte, deci regimul
   se spune pe două axe: trendul (ADX-ul paginii) și volatilitatea (lățimea benzilor Bollinger, ca percentilă în ultimele 100 de bare).
   Pragurile sunt cele de manual, scrise în docs/cercetare/2026-11-13-tablou-acuratete.md (M5) ÎNAINTE de măsurătoare, și nu se reglează:
   ADX ≥ 25 trend · < 20 lateral · între ele tranziție; percentila lățimii < 30 joasă · > 70 ridicată · altfel normală.
   Același modul e folosit de pagină, de scriptul de măsurare și de probă. E DESCRIERE: nu dă culoare și nu intră în niciun verdict;
   „ce urmează” se spune doar unde M5 l-a dovedit (MASURAT), altfel scrie „nedovedit”. */
var RegimGrid = (function () {
  "use strict";
  var PRAGURI = { adxTrend: 25, adxLateral: 20, volJos: 30, volSus: 70, fereastra: 100, bbN: 20, bbK: 2, minLatimi: 60 };
  function nr(v) { if (v === null || v === undefined || v === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
  // lățimea benzilor Bollinger (20; 2) împărțită la media lor, la bara i; sub 20 de bare ⇒ null
  function latimeBB(c, i) {
    var n = PRAGURI.bbN; if (!(i >= n - 1) || !c || i >= c.length) return null;
    var s = 0, s2 = 0; for (var k = i - n + 1; k <= i; k++) { var x = Number(c[k]); if (!isFinite(x)) return null; s += x; s2 += x * x; }
    var m = s / n, v = Math.max(0, s2 / n - m * m); return m > 0 ? 2 * PRAGURI.bbK * Math.sqrt(v) / m : null;
  }
  // percentila lățimii de la bara i printre lățimile ultimelor 100 de bare (cu ea): câte la sută sunt ≤ ea; sub 60 de lățimi ⇒ null
  function percentilaLatime(c, i) {
    var cur = latimeBB(c, i); if (cur === null || !(cur > 0)) return null;   /* lățime zero = preț perfect plat: percentila n-are ce spune */
    var n = 0, mici = 0; for (var k = Math.max(PRAGURI.bbN - 1, i - PRAGURI.fereastra + 1); k <= i; k++) { var x = latimeBB(c, k); if (x === null) continue; n++; if (x <= cur) mici++; }
    return n >= PRAGURI.minLatimi ? 100 * mici / n : null;
  }
  // c = închiderile (crescător în timp), i = bara judecată (se citesc doar barele ≤ i), adx = ADX(14) al paginii la bara i
  function eticheta(adx, p) {
    var a = nr(adx); if (a !== null && a < 0) a = null;
    return { trend: a === null ? null : a >= PRAGURI.adxTrend ? "trend" : a < PRAGURI.adxLateral ? "lateral" : "tranzitie",
      vol: p === null ? null : p < PRAGURI.volJos ? "joasa" : p > PRAGURI.volSus ? "ridicata" : "normala", adx: a, percentila: p };
  }
  function clasifica(c, i, adx) { return eticheta(adx, percentilaLatime(c, i)); }
  // aceleași etichete pentru TOATE barele seriei (adx = șirul ADX pe bare), cu lățimile socotite o singură dată - pentru simularea de mărime
  // a măsurătorii; proba cere egalitatea cu clasifica, bară cu bară
  function clasificaSerie(c, adx) {
    var n = c ? c.length : 0, lat = new Array(n), out = new Array(n), i, k;
    for (i = 0; i < n; i++) lat[i] = latimeBB(c, i);
    for (i = 0; i < n; i++) { var cur = lat[i], p = null;
      if (cur !== null && cur > 0) { var nn = 0, mici = 0; for (k = Math.max(PRAGURI.bbN - 1, i - PRAGURI.fereastra + 1); k <= i; k++) { var x = lat[k]; if (x === null) continue; nn++; if (x <= cur) mici++; } if (nn >= PRAGURI.minLatimi) p = 100 * mici / nn; }
      out[i] = eticheta(adx ? adx[i] : null, p); }
    return out;
  }
  // drumul (suma mișcărilor între închideri) și înaintarea netă pe barele a … b
  function drumNet(c, a, b) {
    if (!c || !(a >= 0) || !(b < c.length) || !(b > a)) return null;
    var drum = 0; for (var k = a; k < b; k++) { var x = Number(c[k]), y = Number(c[k + 1]); if (!isFinite(x) || !isFinite(y)) return null; drum += Math.abs(y - x); }
    return { drum: drum, net: Math.abs(Number(c[b]) - Number(c[a])) };
  }
  // eficiența următoarelor h bare: 0 = numai oscilație, 1 = numai înaintare; fără drum sau fără destule bare ⇒ null
  function eficientaInainte(c, i, h) { var d = drumNet(c, i, i + h); return d && d.drum > 0 ? d.net / d.drum : null; }
  // drumul următoarelor h bare, în procente din prețul de la bara i
  function drumInainte(c, i, h) { var d = drumNet(c, i, i + h), p = c ? Number(c[i]) : NaN; return d && p > 0 ? 100 * d.drum / p : null; }
  // aceeași eficiență, privită înapoi (descrierea ultimelor h bare)
  function eficientaInapoi(c, i, h) { var d = drumNet(c, i - h, i); return d && d.drum > 0 ? d.net / d.drum : null; }

  var z = function (x, n) { return Number(x).toFixed(n).replace(".", ","); };
  // cifra scrisă lângă etichetă: întreagă, afară de cazul în care rotunjirea ar trece-o de partea cealaltă a unui prag sau chiar pe el
  // (19,6 e „lateral”: scrie „19,6”, nu „20”) - atunci cu o zecimală
  function langaPrag(v, praguri) { var s = Math.round(v), sare = praguri.some(function (T) { return s === T ? v !== T : (v < T) !== (s < T); }); return sare ? z(v, 1) : String(s); }
  var VOL = { joasa: "benzile strânse", ridicata: "benzile largi", normala: "benzile obișnuite" };
  // reg = clasifica(…); o = { tf: "1 oră" | "4 ore", masurat: { A: { lateral, trend } | null, B: { raport } | null } | null,
  //   nota: o lămurire despre starea de acum (ex. becul aceluiași interval zice altceva), pusă înaintea lui „ce urmează” }
  function text(reg, o) {
    if (!reg || (reg.trend == null && reg.vol == null)) return "";
    o = o || {}; var m = o.masurat || null, parti = [], adx = reg.adx != null ? " (ADX " + langaPrag(reg.adx, [PRAGURI.adxLateral, PRAGURI.adxTrend]) + ")" : "";
    if (reg.trend) parti.push((reg.trend === "tranzitie" ? "între lateral și trend" : reg.trend) + adx);
    if (reg.vol) parti.push(VOL[reg.vol] + (reg.percentila != null ? " (percentila " + langaPrag(reg.percentila, [PRAGURI.volJos, PRAGURI.volSus]) + ")" : ""));
    var s = (o.tf ? "pe " + o.tf + ": " : "") + parti.join(", ") + (o.nota ? " · " + o.nota : ""), urm = [];
    var A = m && m.A && isFinite(m.A.lateral) && isFinite(m.A.trend) ? m.A : null, B = m && m.B && isFinite(m.B.raport) ? m.B : null;
    if (A && reg.trend === "lateral") urm.push("după „lateral”, în următoarele 24 h prețul a oscilat mai mult decât a înaintat (eficiența " + z(A.lateral, 2) + " față de " + z(A.trend, 2) + " după „trend”; măsurat)");
    else if (A && reg.trend === "trend") urm.push("după „trend”, în următoarele 24 h prețul a înaintat mai mult decât după „lateral” (eficiența " + z(A.trend, 2) + " față de " + z(A.lateral, 2) + "; măsurat)");
    if (B && (reg.vol === "ridicata" || reg.vol === "joasa")) urm.push("după benzi largi drumul următoarelor 24 h a fost de " + z(B.raport, 1) + " ori mai lung decât după benzi strânse (măsurat)");
    if (!A && !B) urm.push("ce urmează: nedovedit");
    else if (!A) urm.push("oscilație sau înaintare: nedovedit");
    return s + (urm.length ? " · " + urm.join(" · ") : "");
  }
  /* Ce a dovedit M5 pe fiecare interval (docs/cercetare/2026-11-13-tablou-acuratete.md); null = nedovedit ⇒ pagina scrie „nedovedit”.
     Se completează DOAR din rezultatul măsurătorii, după regulile ei. */
  var MASURAT = { "1h": null, "4h": null };
  return { PRAGURI: PRAGURI, latimeBB: latimeBB, percentilaLatime: percentilaLatime, clasifica: clasifica, clasificaSerie: clasificaSerie, eficientaInainte: eficientaInainte, drumInainte: drumInainte, eficientaInapoi: eficientaInapoi, text: text, MASURAT: MASURAT };
})();
if (typeof globalThis !== "undefined") globalThis.RegimGrid = RegimGrid;
