// Directia pietei fata de botul din Tablou - modul pur, fara DOM, probat in
// scripts/directie-v75.mjs.
//
// Ce FACE: spune in ce directie merge piata ACUM, pe mai multe intervale, si
// cat de des s-a schimbat directia in trecutul acestei monede, dupa o stare
// ca cea de acum. Cifra de schimbare e o FRECVENTA din istoric, cu numarul de
// cazuri si intervalul de incredere langa ea - nu o predictie. S-a masurat
// (replay -0,112R, 119 trade-uri, IC cuprinde zero) ca directia viitoare nu se
// ghiceste; de aceea ecranul nu spune niciodata "va urca".
//
// Doar bare INCHISE: ultima bara de la bursa e in formare si se scoate.
var Directie = (function () {
  "use strict";

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }

  function ema(valori, n) {
    var k = 2 / (n + 1), out = new Array(valori.length), e = null;
    for (var i = 0; i < valori.length; i++) {
      e = e === null ? valori[i] : valori[i] * k + e * (1 - k);
      out[i] = i >= n - 1 ? e : null;
    }
    return out;
  }

  // Randuri Pionex {time, close} sau [t, o, h, l, c] -> inchideri sortate dupa timp,
  // fara bara in formare. Un pret lipsa sau <=0 opreste seria (nu inventam o bara).
  function inchideri(randuri) {
    if (!Array.isArray(randuri)) return [];
    var v = [];
    for (var i = 0; i < randuri.length; i++) {
      var r = randuri[i]; if (!r) continue;
      var t = nr(Array.isArray(r) ? r[0] : r.time);
      var c = nr(Array.isArray(r) ? r[4] : r.close);
      if (t === null || c === null || !(c > 0)) continue;
      v.push({ t: t, c: c });
    }
    v.sort(function (a, b) { return a.t - b.t; });
    v.pop(); // ultima bara e in formare
    return v.map(function (x) { return x.c; });
  }

  var MIN_BARE = 60, ER_LATERAL = 0.25, FEREASTRA_ER = 20;

  // Starea la bara i, doar din barele 0..i.
  function stareLa(c, e20, e50, i) {
    if (i < MIN_BARE - 1 || e50[i] === null || e20[i] === null) return null;
    var drum = 0;
    for (var k = i - FEREASTRA_ER + 1; k <= i; k++) drum += Math.abs(c[k] - c[k - 1]);
    var er = drum > 0 ? Math.abs(c[i] - c[i - FEREASTRA_ER]) / drum : 0;
    var panta = e50[i - 5] ? (e50[i] - e50[i - 5]) / e50[i - 5] * 100 : 0;
    var dir = "lateral";
    if (er >= ER_LATERAL) {
      if (e20[i] > e50[i] && c[i] > e50[i] && panta > 0) dir = "urca";
      else if (e20[i] < e50[i] && c[i] < e50[i] && panta < 0) dir = "coboara";
    }
    return { dir: dir, er: er, panta: panta };
  }

  function stari(c) {
    var e20 = ema(c, 20), e50 = ema(c, 50), out = new Array(c.length);
    for (var i = 0; i < c.length; i++) out[i] = stareLa(c, e20, e50, i);
    return out;
  }

  // Interval Wilson 95% - cinstit si la esantioane mici.
  function wilson(k, n) {
    if (!n) return null;
    var z = 1.96, p = k / n, d = 1 + z * z / n;
    var mijloc = (p + z * z / (2 * n)) / d;
    var jum = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return { jos: Math.max(0, 100 * (mijloc - jum)), sus: Math.min(100, 100 * (mijloc + jum)) };
  }

  // Cat de des, dupa o bara cu ACEEASI stare ca acum, directia a fost ALTA la
  // capatul orizontului. Cazurile se iau din `orizont` in `orizont` bare, ca sa
  // nu se suprapuna (altfel acelasi episod s-ar numara de zeci de ori si N ar
  // minti despre cat stim).
  function schimbare(st, orizont) {
    var n = st.length, acum = st[n - 1];
    if (!acum) return { valoare: null, stare: "nu-se-poate", cazuri: 0, motiv: "prea putine bare" };
    var cazuri = 0, schimbate = 0, spreOpus = 0, ultimFolosit = -Infinity;
    for (var i = MIN_BARE; i + orizont < n - 1; i++) {
      if (!st[i] || st[i].dir !== acum.dir || i - ultimFolosit < orizont) continue;
      var dupa = st[i + orizont]; if (!dupa) continue;
      ultimFolosit = i; cazuri++;
      if (dupa.dir !== acum.dir) {
        schimbate++;
        if (acum.dir !== "lateral" && dupa.dir !== "lateral") spreOpus++;
      }
    }
    if (cazuri < 10) return { valoare: null, stare: "nu-se-poate", cazuri: cazuri, motiv: "sub 10 cazuri in istoric" };
    return { valoare: 100 * schimbate / cazuri, stare: cazuri >= 30 ? "dovedit" : "putin",
      cazuri: cazuri, ic: wilson(schimbate, cazuri),
      spreOpus: acum.dir === "lateral" ? null : 100 * spreOpus / cazuri };
  }

  // Cate bare consecutive a tinut starea de acum (inclusiv bara de acum).
  function vechime(st) {
    var n = st.length, acum = st[n - 1]; if (!acum) return null;
    var k = 0;
    for (var i = n - 1; i >= 0 && st[i] && st[i].dir === acum.dir; i--) k++;
    return k;
  }

  // Botul long castiga cand piata urca sau oscileaza in interval; short invers.
  // Un grid neutru castiga din oscilatie - orice trend il impinge spre o margine.
  function fataDeBot(dir, directieBot) {
    var d = String(directieBot || "").toLowerCase();
    if (dir === "lateral") return { eticheta: "bun pentru grid", ton: "bine" };
    if (d === "long") return dir === "urca" ? { eticheta: "cu botul", ton: "bine" } : { eticheta: "împotriva botului", ton: "rau" };
    if (d === "short") return dir === "coboara" ? { eticheta: "cu botul", ton: "bine" } : { eticheta: "împotriva botului", ton: "rau" };
    return { eticheta: "împinge gridul spre o margine", ton: "atentie" };
  }

  // Miscarea din bara IN FORMARE fata de ultima inchidere. Nu intra in directie
  // (bara nu e terminata), dar se arata: altfel ecranul spune "urca" pe barele
  // inchise in timp ce pretul cade chiar acum, si pare ca se contrazice.
  function inFormare(randuri) {
    if (!Array.isArray(randuri)) return null;
    var v = [];
    for (var i = 0; i < randuri.length; i++) {
      var r = randuri[i]; if (!r) continue;
      var t = nr(Array.isArray(r) ? r[0] : r.time), c = nr(Array.isArray(r) ? r[4] : r.close);
      if (t !== null && c !== null && c > 0) v.push({ t: t, c: c });
    }
    if (v.length < 2) return null;
    v.sort(function (a, b) { return a.t - b.t; });
    var acum = v[v.length - 1].c, inchis = v[v.length - 2].c;
    return { pct: 100 * (acum - inchis) / inchis, acum: acum, inchis: inchis };
  }

  // Un interval: randuri de la bursa -> directia acum + frecventa de schimbare.
  function analizeaza(randuri, orizont, directieBot) {
    var formare = inFormare(randuri);
    var c = inchideri(randuri);
    var st = stari(c);
    var acum = st.length ? st[st.length - 1] : null;
    if (!acum) return { dir: null, stare: "nu-se-poate", motiv: "sub " + MIN_BARE + " bare inchise", bare: c.length, formare: formare };
    return { formare: formare, dir: acum.dir, er: acum.er, panta: acum.panta, vechime: vechime(st), bare: c.length,
      fata: fataDeBot(acum.dir, directieBot), schimbare: schimbare(st, orizont), stare: "ok" };
  }

  // Rezumatul de sus: ce spun intervalele mari, fata de bot.
  function rezumat(rez, directieBot) {
    var mari = rez.filter(function (r) { return r && r.dir && (r.tf === "4H" || r.tf === "1D"); });
    if (!mari.length) return { text: "Nu am destule bare ca să spun direcția.", ton: "nu-se-poate" };
    var imp = mari.filter(function (r) { return r.fata.ton === "rau"; });
    var cu = mari.filter(function (r) { return r.fata.ton === "bine" && r.dir !== "lateral"; });
    var lat = mari.filter(function (r) { return r.dir === "lateral"; });
    var nume = { urca: "urcă", coboara: "coboară", lateral: "e laterală" };
    var descr = mari.map(function (r) { return r.eticheta + " " + nume[r.dir]; }).join(", ");
    var z = rezumatBare(mari, imp, cu, lat, descr);
    // Bara de 4h care se formeaza ACUM poate merge tare invers fata de barele
    // inchise; atunci titlul verde ar linisti degeaba. Se spune, si tonul scade.
    var b4 = mari.filter(function (r) { return r.tf === "4H"; })[0];
    if (b4 && b4.formare && isFinite(b4.formare.pct) && Math.abs(b4.formare.pct) >= 2) {
      var contra = (b4.dir === "urca" && b4.formare.pct < 0) || (b4.dir === "coboara" && b4.formare.pct > 0) || b4.dir === "lateral";
      if (contra) {
        z.text += " Dar în bara de 4 ore de acum prețul " + (b4.formare.pct < 0 ? "scade" : "crește") + " cu " +
          Math.abs(b4.formare.pct).toFixed(1) + "%.";
        if (z.ton === "bine") z.ton = "atentie";
      }
    }
    return z;
  }

  function rezumatBare(mari, imp, cu, lat, descr) {
    if (imp.length === mari.length) return { text: "Piața merge ÎMPOTRIVA botului (" + descr + ").", ton: "rau" };
    if (imp.length) return { text: "Semnale amestecate: " + descr + ". O parte merge împotriva botului.", ton: "atentie" };
    if (lat.length === mari.length) return { text: "Piața e laterală (" + descr + ") - regimul în care un grid câștigă.", ton: "bine" };
    if (cu.length) return { text: "Piața merge cu botul (" + descr + ").", ton: "bine" };
    return { text: descr, ton: "atentie" };
  }

  return { inchideri: inchideri, stari: stari, schimbare: schimbare, wilson: wilson,
    fataDeBot: fataDeBot, analizeaza: analizeaza, inFormare: inFormare, rezumat: rezumat, ema: ema };
})();
if (typeof globalThis !== "undefined") globalThis.Directie = Directie;
