// v100.397 (28.11.2026, el: „un tool simplu, integrat în Radar, care să-mi caute în Pionex cele mai agitate și volatile monede live” +
// „doar top 150 de coinuri”): pagina „Agitate acum” - partea PURĂ (fără DOM, fără rețea, fără ceas: „acum” vine din afară).
// Universul = primele 150 de monede după capitalizare (lista CoinGecko, adusă de server) care au contract perpetuu pe USDT la Pionex;
// stabilele și aurul tokenizat ies (nu au ce căuta într-un clasament de agitație). „Agitată” = amplitudinea: cât e între minimul și maximul
// ferestrei, în % din minim (aceeași măsură ca „agitată” din lib/monede-bot.js; din maxim / minim, nu din închideri - prinde și fitilele).
//   24 h        ⇒ din lista Pionex (O cerere pentru toate monedele, /api/v1/market/tickers?type=PERP)
//   15 min / 1 h / 4 h ⇒ din lumânările de 5 minute ale monedei (cu cea în formare), ținute la zi cu prețul viu între două citiri
// „Față de obișnuit” = amplitudinea ferestrei de acum împărțită la MEDIANA ferestrelor de aceeași lungime dinainte (500 de lumânări ≈ 41 de ore).
// Sunt FAPTE, nu semnale: spun unde e mișcare acum, nu încotro merge prețul (direcția a fost probată de opt ori pe datele lui și a ieșit ban).
// Pragurile de mai jos (primele 150, „subțire” sub 0,3 M USDT, treptele 1,5×) sunt alegeri de afișare, nu reguli probate. Proba: scripts/proba-v100397-agitate.mjs.
var Agitate = (function () {
  "use strict";
  var TOP = 150;              // primele 150 după capitalizare (cererea lui)
  var PER_MS = 300000;        // lumânări de 5 minute
  var MIN_BLOCURI = 6;        // „față de obișnuit” doar cu cel puțin 6 ferestre de aceeași lungime înainte
  var SUBTIRE = 300000;       // sub 0,3 M USDT pe 24 h la Pionex: carte subțire (ordinul la piață alunecă, fitile locale)
  var PESTE = 1.5;            // ≥ 1,5× obișnuitul = „peste”; ≤ 1 / 1,5 = „sub” (simetric)
  var DREPT = 0.7, DUS = 0.3; // |net| / amplitudine: ≥ 0,7 a mers aproape drept; ≤ 0,3 s-a dus și s-a întors
  var MAX_BARE = 600;
  // v100.398 (I-972, el 28.11: „fa idei”): regula „s-a aprins” - pe fereastra de o oră, amplitudinea ≥ 5% ȘI ≥ 3× obișnuitul monedei.
  // E un prag de ZGOMOT, nu o predicție: spune că moneda se mișcă mult acum, nu încotro.
  // JURNALUL (totul judecat DOAR după câte mesaje dă, nu după ce a făcut prețul apoi):
  //  - scrisă ÎNAINTE de orice cifră (28.11.2026 10:10): ≥ 3% și ≥ 3×, cu bugetul „cel mult ~5 mesaje într-o zi obișnuită”;
  //  - măsurată pe 85 de monede × 400 de pași de 5 minute (27.11 00:55 → 28.11 10:10, 1,39 zile): 81 de aprinderi, 26 de mesaje = 18,8 pe zi.
  //    Din ele, ~58 într-o singură jumătate de oră (27.11 16:30: BTC 3,7% într-o oră, de 6,5× obișnuitul) = o mișcare a PIEȚEI, nu 58 de vești;
  //  - schimbată O DATĂ: (1) mișcarea pieței întregi = un singur mesaj (PIATA, mai jos); (2) pragul amplitudinii 3% ⇒ 5% (5% pe oră = ~15% din
  //    bot la levier 3×; „×” rămâne 3, cum era scris). Variantele numărate, cu regula pieței: 3% / 3× = 14,4 pe zi · 4% / 3× = 12,3 · 5% / 3× = 7,9
  //    · 4% / 4× = 8,7 · 5% / 4× = 6,5 · 6% / 3× = 7,2 (7 încercări). Strângerea mesajelor la 30 de minute n-a schimbat nimic la 5% ⇒ nu s-a pus;
  //  - NEDOVEDIT: bugetul de ~5 pe zi. Eșantionul are o zi cu toată piața în mișcare și niciuna obișnuită; plafonul de 8 mesaje pe zi ține
  //    marginea, iar colectorul numără mesajele pe zi (scripts/lib/tura-agitate.mjs) ca pragul să se reverifice pe viu.
  var APRINS = { amp: 5, ori: 3 };
  // „piața întreagă”: cel puțin 8 monede ȘI cel puțin 15% din cele măsurate sunt deodată la ≥ 3% pe oră și ≥ 3× obișnuitul lor
  var PIATA = { amp: 3, ori: 3, parte: 0.15, minim: 8 };
  // v100.398 (I-973): „peste Binance” - mișcarea pe 24 h de pe Pionex de cel puțin 1,5× cea de pe Binance Futures ȘI cu cel puțin 2 puncte mai
  // mare (sub 2 puncte, raportul sare din nimic la monedele liniștite). Alegere de afișare: semn că poate fi o fitilă doar pe Pionex.
  var PESTE_BINANCE = { raport: 1.5, puncte: 2 };
  var FERESTRE = [
    { k: "15m", bare: 3, et: "15 min", lung: "ultimele 15 minute" },
    { k: "1h", bare: 12, et: "1 oră", lung: "ultima oră" },
    { k: "4h", bare: 48, et: "4 ore", lung: "ultimele 4 ore" },
    { k: "24h", bare: 0, et: "24 h", lung: "ultimele 24 de ore" }];
  var STABILE = {};
  "USDT USDC DAI FDUSD TUSD USDE USDS USD1 PYUSD USDD RLUSD USDG BUSD EURC USDP GUSD".split(" ").forEach(function (s) { STABILE[s] = 1; });

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function fer(k) { for (var i = 0; i < FERESTRE.length; i++) if (FERESTRE[i].k === k) return FERESTRE[i]; return null; }

  // lista serverului [{ simbol, rang, nume }] ⇒ { SIMBOL: { rang, nume } } pentru rangurile 1..top; la simbol dublu câștigă rangul mai mic
  function ranguri(lista, top) {
    var out = {}, n = top > 0 ? top : TOP;
    (Array.isArray(lista) ? lista : []).forEach(function (x) {
      var s = String(x && x.simbol || "").toUpperCase(), r = nr(x && x.rang);
      if (!s || r === null || r < 1 || r > n) return;
      if (!out[s] || r < out[s].rang) out[s] = { rang: r, nume: String(x.nume || s) };
    });
    return out;
  }

  // lista Pionex (toate perpetuele, pe 24 h) ∩ rangurile ⇒ monedele paginii, de la cea mai agitată pe 24 h
  // opt.eCrypto(baza) = false scoate ce nu e crypto (aurul tokenizat: GridCalcul.eCrypto)
  function univers(tickers, harta, opt) {
    var o = opt || {}, monede = [], scoase = { faraRang: 0, stabile: [], nuCrypto: [], stricate: 0 };
    (Array.isArray(tickers) ? tickers : []).forEach(function (x) {
      var m = /^([A-Z0-9]+)_USDT_PERP$/.exec(String(x && x.symbol || "").toUpperCase()); if (!m) return;
      var b = m[1], rg = harta && harta[b];
      if (!rg) { scoase.faraRang++; return; }
      if (STABILE[b]) { scoase.stabile.push(b); return; }
      if (typeof o.eCrypto === "function" && !o.eCrypto(b)) { scoase.nuCrypto.push(b); return; }
      var op = nr(x.open), hi = nr(x.high), lo = nr(x.low), cl = nr(x.close), vol = nr(x.amount);
      if (!(op > 0) || !(lo > 0) || !(cl > 0) || !(hi >= lo)) { scoase.stricate++; return; }
      monede.push({ simbol: b, pionex: b + "_USDT_PERP", rang: rg.rang, nume: rg.nume, pret: cl, amp24: (hi - lo) / lo * 100, net24: (cl / op - 1) * 100,
        vol: vol !== null && vol >= 0 ? vol : null, loc24: hi > lo ? (cl - lo) / (hi - lo) : 0.5, subtire: vol !== null && vol >= 0 && vol < SUBTIRE, bare: null });   /* volum lipsă = nu se știe, nu „subțire” (revizia 28.11) */
    });
    monede.sort(function (a, b) { return b.amp24 - a.amp24 || a.rang - b.rang; });
    return { monede: monede, scoase: scoase };
  }

  // lumânările Pionex ([{ time, open, close, high, low }], de regulă de la cea mai nouă) ⇒ [{ t, o, h, l, c }] crescător, CU cea în formare
  function bare(randuri) {
    var out = [];
    (Array.isArray(randuri) ? randuri : []).forEach(function (r) {
      if (!r) return;
      var t = nr(r.time), o = nr(r.open), h = nr(r.high), l = nr(r.low), c = nr(r.close);
      if (t === null || !(o > 0) || !(l > 0) || !(c > 0) || !(h >= l)) return;
      out.push({ t: t, o: o, h: h, l: l, c: c });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  // amplitudinea unei bucăți de lumânări [i0, i1): { amp, min, max } sau null dacă e goală
  function intindere(b, i0, i1) {
    if (i1 <= i0) return null;
    var min = Infinity, max = -Infinity;
    for (var i = i0; i < i1; i++) { if (b[i].l < min) min = b[i].l; if (b[i].h > max) max = b[i].h; }
    return min > 0 && isFinite(max) ? { amp: (max - min) / min * 100, min: min, max: max } : null;
  }
  // prima lumânare cu t ≥ prag (lista e crescătoare)
  function prima(b, prag) { var i = 0; while (i < b.length && b[i].t < prag) i++; return i; }

  // Fereastra de n lumânări care se termină cu cea mai nouă - după TIMP (o lumânare lipsă nu lungește fereastra).
  // Revizia 28.11: cu lumânarea în formare numărată drept una întreagă, „15 minute” însemna 10–15 minute, iar „× față de obișnuit” (măsurat
  // pe ferestre întregi) scădea singur la fiecare lumânare nouă. Acum, cât lumânarea în formare are sub jumătate din durată, intră și lumânarea
  // întreagă dinainte ⇒ fereastra ține n × 5 min ± 2,5 min, centrată pe durata spusă.
  // ⇒ { amp, net, min, max, bare, start } sau { motiv }: "lipsa" (fără lumânări), "veche" (cea mai nouă e cu ≥ 2 în urma lui „acum”),
  // "scurta" (istoria nu ajunge până la începutul ferestrei)
  function fereastraX(b, n, acum) {
    if (!Array.isArray(b) || !b.length || !(n > 0)) return { motiv: "lipsa" };
    var u = b[b.length - 1], slot = Math.floor(acum / PER_MS) * PER_MS;
    if (!(acum > 0) || u.t < slot - PER_MS) return { motiv: "veche" };
    var k = u.t === slot && acum - slot < PER_MS / 2 ? n + 1 : n, start = u.t - (k - 1) * PER_MS;
    if (b[0].t > start) return { motiv: "scurta" };
    var i0 = prima(b, start), x = intindere(b, i0, b.length); if (!x) return { motiv: "lipsa" };
    return { amp: x.amp, net: (u.c / b[i0].o - 1) * 100, min: x.min, max: x.max, bare: b.length - i0, start: start };
  }
  function fereastra(b, n, acum) { var w = fereastraX(b, n, acum); return w.motiv ? null : w; }

  // „obișnuitul” monedei: mediana amplitudinii pe ferestrele ÎNTREGI de aceeași lungime dinaintea celei de acum ⇒ { med, blocuri } | null
  // deLa = începutul ferestrei de acum (din fereastra); lipsă ⇒ n − 1 lumânări înaintea celei mai noi
  function obisnuit(b, n, deLa) {
    if (!Array.isArray(b) || !b.length || !(n > 0)) return null;
    var W = n * PER_MS, start = deLa > 0 ? deLa : b[b.length - 1].t - (n - 1) * PER_MS, amp = [];
    for (var j = 0; ; j++) {
      var sus = start - j * W, jos = sus - W; if (jos < b[0].t) break;
      var x = intindere(b, prima(b, jos), prima(b, sus)); if (x) amp.push(x.amp);
    }
    if (amp.length < MIN_BLOCURI) return null;
    amp.sort(function (p, q) { return p - q; });
    var k = amp.length >> 1;
    return { med: amp.length % 2 ? amp[k] : (amp[k - 1] + amp[k]) / 2, blocuri: amp.length };
  }

  // prețul viu (din lista Pionex, la ~30 s) pus în lumânări: îl ține pe cel în formare la zi sau deschide lumânarea următoare (deschiderea =
  // închiderea dinainte). Întoarce o listă NOUĂ; prețul vechi / stricat și lista goală rămân cum sunt.
  function cuPret(b, t, pret) {
    var p = nr(pret);
    if (!Array.isArray(b) || !b.length || !(p > 0) || !(t > 0)) return Array.isArray(b) ? b : [];
    var u = b[b.length - 1], slot = Math.floor(t / PER_MS) * PER_MS;
    if (slot < u.t) return b;
    var out = b.slice(b.length >= MAX_BARE && slot > u.t ? b.length - MAX_BARE + 1 : 0);
    if (slot === u.t) out[out.length - 1] = { t: u.t, o: u.o, h: Math.max(u.h, p), l: Math.min(u.l, p), c: p };
    else out.push({ t: slot, o: u.c, h: Math.max(u.c, p), l: Math.min(u.c, p), c: p });
    return out;
  }

  // cum a mers: „sus” / „jos” = aproape drept; „dus” = dus-întors; "" = nici una, nici alta. Descrie ce A FOST.
  function fel(amp, net) {
    if (!(amp > 0) || nr(net) === null) return "";
    var r = Math.abs(net) / amp;
    return r >= DREPT ? (net > 0 ? "sus" : "jos") : r <= DUS ? "dus" : "";
  }
  // m = { amp24, net24, bare } ⇒ { masurat, amp, net, ori, blocuri, fel }; nemăsurata poartă și `motiv` ("lipsa" / "veche" / "scurta")
  function masura(m, k, acum) {
    var f = fer(k), gol = { masurat: false, amp: null, net: null, ori: null, blocuri: 0, fel: "", motiv: "lipsa" };
    if (!f || !m) return gol;
    if (!f.bare) return nr(m.amp24) === null ? gol : { masurat: true, amp: m.amp24, net: nr(m.net24), ori: null, blocuri: 0, fel: fel(m.amp24, m.net24) };
    var w = fereastraX(m.bare, f.bare, acum); if (w.motiv) { gol.motiv = w.motiv; return gol; }
    var o = obisnuit(m.bare, f.bare, w.start);
    return { masurat: true, amp: w.amp, net: w.net, ori: o && o.med > 0 ? w.amp / o.med : null, blocuri: o ? o.blocuri : 0, fel: fel(w.amp, w.net) };
  }
  // lista măsurilor (Agitate.masura) ⇒ { n, din, da }: câte sunt la pragul pieței, din câte măsurate cu reper, și dacă e o mișcare a pieței
  function piataAprinsa(lista) {
    var n = 0, din = 0;
    (Array.isArray(lista) ? lista : []).forEach(function (x) { if (!x || !x.masurat || x.ori === null || x.ori === undefined) return; din++; if (x.amp >= PIATA.amp && x.ori >= PIATA.ori) n++; });
    return { n: n, din: din, da: n >= Math.max(PIATA.minim, Math.ceil(PIATA.parte * din)) };
  }
  function aprinsa(x) { return !!(x && x.masurat && x.amp >= APRINS.amp && x.ori !== null && x.ori !== undefined && x.ori >= APRINS.ori); }
  // lista Binance Futures pe 24 h ([{ symbol, highPrice, lowPrice }], o cerere pentru toate contractele) ⇒ { BAZA: amplitudinea în % din minim }.
  // Doar perpetuele pe USDT (trimestrialele au „_”); contractele „în mii” (1000PEPE, 1MBABYDOGE) pe baza fără multiplicator - raportul nu se schimbă.
  // Revizia 28.11: un contract delistat / în lichidare rămâne în listă cu mișcarea ÎNGHEȚATĂ ⇒ „peste Binance” fals. Cu `acum` dat, rândul
  // fără tranzacții de peste o oră (closeTime) sau cu sub 100 de tranzacții pe 24 h (count) nu intră în comparație.
  function dinBinance(lista, acum) {
    var out = {};
    (Array.isArray(lista) ? lista : []).forEach(function (x) {
      var m = /^([A-Z0-9]+)USDT$/.exec(String(x && x.symbol || "")); if (!m) return;
      var b = m[1].replace(/^(1000000|10000|1000|1M)(?=[A-Z])/, ""), h = nr(x.highPrice), l = nr(x.lowPrice);
      if (!b || !(l > 0) || !(h >= l) || out[b] !== undefined) return;
      var inchis = nr(x.closeTime), tranz = nr(x.count);
      if (acum > 0 && inchis !== null && acum - inchis > 3600000) return;
      if (tranz !== null && tranz < 100) return;
      out[b] = (h - l) / l * 100;
    });
    return out;
  }
  // ⇒ { binance, raport, peste } sau null când nu se poate compara (moneda n-are contract pe Binance, cifre lipsă)
  function fataDeBinance(ampPionex, ampBinance) {
    var p = nr(ampPionex), b = nr(ampBinance); if (p === null || !(b > 0)) return null;
    var raport = p / b;
    return { binance: b, raport: raport, peste: raport >= PESTE_BINANCE.raport && p - b >= PESTE_BINANCE.puncte };
  }
  function treapta(ori) { var x = nr(ori); return x === null ? null : x >= PESTE ? "peste" : x <= 1 / PESTE ? "sub" : "obisnuit"; }

  // [{ m, x }]: măsuratele după amplitudinea ferestrei (la egalitate, rangul mai mic), apoi nemăsuratele după amplitudinea pe 24 h
  function clasament(monede, k, acum) {
    var l = (Array.isArray(monede) ? monede : []).map(function (m) { return { m: m, x: masura(m, k, acum) }; });
    l.sort(function (a, b) {
      if (a.x.masurat !== b.x.masurat) return a.x.masurat ? -1 : 1;
      var d = a.x.masurat ? b.x.amp - a.x.amp : (b.m.amp24 || 0) - (a.m.amp24 || 0);
      return d || (a.m.rang || 0) - (b.m.rang || 0);
    });
    return l;
  }

  // în ce ordine se cer lumânările: monedele boților tăi, apoi de la cea mai agitată pe 24 h (primele rânduri se umplu primele)
  function deMasurat(monede, boti, max) {
    var b = boti || {}, l = (Array.isArray(monede) ? monede : []).slice();
    l.sort(function (x, y) { return (b[y.simbol] ? 1 : 0) - (b[x.simbol] ? 1 : 0) || (y.amp24 || 0) - (x.amp24 || 0); });
    return max > 0 ? l.slice(0, max) : l;
  }

  return { TOP: TOP, PER_MS: PER_MS, MIN_BLOCURI: MIN_BLOCURI, SUBTIRE: SUBTIRE, PESTE: PESTE, FERESTRE: FERESTRE, STABILE: STABILE, APRINS: APRINS, PIATA: PIATA, PESTE_BINANCE: PESTE_BINANCE,
    aprinsa: aprinsa, piataAprinsa: piataAprinsa, dinBinance: dinBinance, fataDeBinance: fataDeBinance,
    fer: fer, ranguri: ranguri, univers: univers, bare: bare, fereastra: fereastra, obisnuit: obisnuit, cuPret: cuPret, masura: masura, treapta: treapta,
    clasament: clasament, deMasurat: deMasurat };
})();
