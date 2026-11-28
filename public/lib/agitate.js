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
  // v100.399 (el, 28.11.2026: „fa idei” după livrarea v100.398 ⇒ I-976…I-978): BILANȚUL alertelor - trei numărători ținute de colector, pe zilele
  // României, cu criteriile de verdict scrise ÎNAINTE de primele date. Nimic de mai jos nu se schimbă după ce se văd cifrele; o schimbare a regulii
  // APRINS repornește numărătoarea (rândurile poartă regula lor, `r`). Măsurarea începe de la colectorul livrat cu v100.399: cele 7 aprinderi
  // văzute de mine în demo-ul din 28.11 (3 continuate, 4 întoarse) NU intră - erau deja văzute.
  //  1. MESAJE PE ZI (I-976): ținta scrisă pe 28.11 la 10:10 = cel mult ~5 pe zi. Se judecă pe ultimele 7 zile ÎNTREGI (zi întreagă = urmărită
  //     cel puțin 20 de ore): media ≤ 5 ⇒ „ține”; peste ⇒ „peste țintă” (pragul nu se schimbă singur).
  //  2. CE A URMAT DUPĂ APRINDERE (I-977), la +1 h și +4 h, doar aprinderile SINGURE (cele din mișcarea pieței sunt un singur eveniment):
  //     - ipoteza: după o oră de ≥ 5% și ≥ 3× obișnuitul, prețul se întoarce mai des decât continuă (mișcarea vine din lichidări pe o carte
  //       subțire, apoi lichiditatea revine; pe partea cealaltă sunt cei care intră târziu). Priorul e SLAB: direcția a fost probată de opt ori pe
  //       datele lui și a ieșit ban (aceasta e a noua probă) ⇒ testul e pe două părți, iar „nicio înclinare dovedită” e un rezultat la fel de bun;
  //     - direcția aprinderii = semnul netului pe ora ei, doar când |net| > 0,3 × mișcarea (altfel „dus-întors”: fără direcție, nu votează);
  //     - rezultatul = prețul din lista Pionex la +1 h / +4 h față de cel de la aprindere, în sensul ei: de la +0,5 puncte „a continuat”, de la
  //       −0,5 „s-a întors”, între ele „pe loc”. Prețul se ia la prima tură de după termen; întârziat peste 10 minute = „ratat” (nu se pune unul
  //       târziu: ar fi alt moment);
  //     - verdictul: O SINGURĂ judecată pe orizont (fără priviri repetate), când sunt ≥ 30 de zile cu vot ȘI ≥ 150 de cazuri: testul t pe ZILE
  //       (suma zilei: întoarse − continuate), pe două părți, alfa 0,025 pe orizont (două orizonturi). De ce pe zile - simulat înainte, pe 28.11
  //       (mulberry32; scripturile putere-urmari.mjs și putere-zile.mjs): când cazurile aceleiași zile se trag unele după altele, binomialul pe
  //       cazuri dă 7–21% verdicte false (și „majoritatea zilelor spune la fel” nu ajută), iar t pe zile ține 2,3–2,7% oricum. Puterea regulii:
  //       la 70% întoarceri 92–100%; la 65%: 68–93% (după cât de corelată e ziua); o înclinare sub 65% nu se vede cu atâtea date;
  //     - NU e probă de strategie: fără costuri, fără intrări. Media e pe caz, în sensul aprinderii.
  //  3. „PESTE BINANCE” (I-978): colectorul compară la 15 minute; o apariție ⇒ semnul rămâne; 14 zile urmărite (≥ 60 de citiri pe zi) fără
  //     niciuna ⇒ „poate fi scos”. La livrarea v100.398: Pionex / Binance = 1,0× la toate cele 80 de perechi.
  var BILANT = { tinta: 5, zileMesaje: 7, ziIntreagaMs: 20 * 3600000, zileBinance: 14, citiriBinance: 60, ore: [1, 4], directie: 0.3, banda: 0.5, tarziuMs: 600000, zileVot: 30, cazuri: 150, alfa: 0.025 };
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

  // ── bilanțul alertelor (v100.399) ──
  // cheia regulii: tot ce schimbă CE mesaje pleacă (revizia 28.11) - pragul aprinderii, regula pieței și, dat de tură, restul ei (plafonul pe 24 h,
  // pragul de candidat, așteptarea pe monedă, liniștea de după piață). Rândurile jurnalului o poartă: altă cheie = numărătoare nouă.
  function regulaAcum(aTurei) { return APRINS.amp + "/" + APRINS.ori + "-" + PIATA.amp + "/" + PIATA.ori + "/" + PIATA.parte + "/" + PIATA.minim + (aTurei ? ":" + aTurei : ""); }
  // direcția aprinderii: +1 / −1, sau 0 când s-a dus și s-a întors (netul nu trece de 0,3 din mișcare)
  function directia(net, amp) { var n = nr(net), a = nr(amp); if (n === null || !(a > 0) || Math.abs(n) <= BILANT.directie * a) return 0; return n > 0 ? 1 : -1; }
  // ce a urmat: { d (puncte, în sensul aprinderii), fel } sau null (fără direcție / fără preț)
  function urmare(pret, dupa, dir) {
    var p = nr(pret), q = nr(dupa); if (!(p > 0) || !(q > 0) || (dir !== 1 && dir !== -1)) return null;
    var d = Math.round((q / p - 1) * 100 * dir * 1e9) / 1e9;                                                /* rotunjit la 9 zecimale: 100 → 100,5 e exact 0,5, nu 0,49999… */
    return { d: d, fel: d >= BILANT.banda ? "continuat" : d <= -BILANT.banda ? "intors" : "peLoc" };
  }
  function lnGamma(z) {
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    z -= 1; var x = c[0]; for (var i = 1; i < 9; i++) x += c[i] / (z + i); var t = z + 7.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  // p-ul testului t (Student) pe două părți: aria de sub densitate dincolo de ±|t|, prin Simpson (verificat pe tabel în proba v100.399)
  function tDouaParti(t, df) {
    if (typeof t !== "number" || isNaN(t) || !(df >= 1)) return null;
    var x = Math.abs(t); if (x === 0) return 1; if (!isFinite(x)) return 0;
    var n = 2000, i, h, s, c = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI), f = function (u) { return Math.pow(1 + u * u / df, -(df + 1) / 2); };
    if (x <= 5) { h = x / n; s = f(0) + f(x); for (i = 1; i < n; i++) s += f(i * h) * (i % 2 ? 4 : 2); return Math.min(1, Math.max(0, 1 - 2 * c * s * h / 3)); }
    /* peste 5: coada de dincolo de |t| socotită direct, cu u = |t| / v pe (0, 1] - pasul rămâne mic oricât de mare e t (revizia 28.11: pe [0, t]
       cu pas fix, t ≈ 4.900 dădea p = 0,21) */
    var g = function (v) { return v > 0 ? f(x / v) * x / (v * v) : (df === 1 ? 1 / x : 0); };
    h = 1 / n; s = g(0) + g(1); for (i = 1; i < n; i++) s += g(i * h) * (i % 2 ? 4 : 2);
    return Math.min(1, Math.max(0, 2 * c * s * h / 3));
  }
  function randuri(zile) { return (Array.isArray(zile) ? zile : []).filter(function (z) { return z && typeof z === "object" && typeof z.zi === "string"; }).slice().sort(function (a, b) { return a.zi < b.zi ? -1 : a.zi > b.zi ? 1 : 0; }); }
  function intreg(v) { var x = nr(v); return x !== null && x > 0 ? Math.round(x) : 0; }
  // I-976: mesajele (pe monedă + de piață) pe ultimele 7 zile întregi dinainte de azi, cu regula de acum
  function bilantMesaje(zile, azi, regula) {
    var r = regula || regulaAcum(), toate = randuri(zile), intregi = toate.filter(function (z) { return z.r === r && z.zi < azi && nr(z.ms) >= BILANT.ziIntreagaMs; });
    var ult = intregi.slice(-BILANT.zileMesaje), tot = 0, opr = 0;
    ult.forEach(function (z) { tot += intreg(z.m) + intreg(z.p); opr += intreg(z.opr); });
    toate.forEach(function (z) { if (z.zi === azi && z.r === r) opr += intreg(z.opr); });                   /* ce a oprit plafonul azi se spune pe loc */
    var medie = ult.length ? tot / ult.length : null;
    return { intregi: intregi.length, zile: ult.length, medie: medie, oprite: opr, verdict: ult.length < BILANT.zileMesaje ? "prea-putine" : medie <= BILANT.tinta ? "tine" : "peste" };
  }
  // I-977, un orizont (k = "h1" / "h4"; rândul zilei ține [continuate, întoarse, pe loc, suma punctelor]): numărătorile + verdictul pe ZILE
  function bilantUrmare(zile, k, regula) {
    var r = regula || regulaAcum(), c = 0, i = 0, l = 0, s = 0, d = [], zI = 0, zC = 0;
    randuri(zile).forEach(function (z) {
      var h = z.r === r && Array.isArray(z[k]) ? z[k] : null; if (!h) return;
      var zc = intreg(h[0]), zi = intreg(h[1]);
      c += zc; i += zi; l += intreg(h[2]); s += nr(h[3]) || 0;
      if (zc + zi > 0) { d.push(zi - zc); if (zi > zc) zI++; else if (zc > zi) zC++; }
    });
    var n = c + i, D = d.length, out = { continuat: c, intors: i, peLoc: l, n: n, media: n + l ? s / (n + l) : null, zileVot: D, zileIntors: zI, zileContinuat: zC, gata: D >= BILANT.zileVot && n >= BILANT.cazuri, t: null, p: null, verdict: "prea-putine" };
    if (!out.gata) return out;
    var med = 0, vr = 0; d.forEach(function (x) { med += x; }); med /= D; d.forEach(function (x) { vr += (x - med) * (x - med); }); vr /= D - 1;
    out.t = vr > 0 ? med / Math.sqrt(vr / D) : med > 0 ? Infinity : med < 0 ? -Infinity : 0;
    out.p = tDouaParti(out.t, D - 1);
    out.verdict = out.p < BILANT.alfa ? (med > 0 ? "intors" : "continuat") : "nimic";
    return out;
  }
  // I-978: zile urmărite (trecute, cu destule citiri) și unde a apărut semnul (orice zi, și cea de azi)
  function bilantBinance(zile, azi) {
    var u = 0, ap = 0, vazute = {}, azi0 = 0;
    randuri(zile).forEach(function (z) {
      if (z.zi === azi) azi0 = intreg(z.bc);                                                                /* citirile de azi: dacă stau pe zero, Binance nu răspunde colectorului */
      if (z.zi < azi && intreg(z.bc) >= BILANT.citiriBinance) u++;
      (Array.isArray(z.bp) ? z.bp : []).forEach(function (m) { if (typeof m === "string" && /^[A-Z0-9]{1,15}$/.test(m)) { ap++; vazute[m] = 1; } });
    });
    return { urmarite: u, citiriAzi: azi0, aparitii: ap, monede: Object.keys(vazute).sort(), verdict: ap > 0 ? "ramane" : u >= BILANT.zileBinance ? "poate-fi-scos" : "prea-putine" };
  }

  // în ce ordine se cer lumânările: monedele boților tăi, apoi de la cea mai agitată pe 24 h (primele rânduri se umplu primele)
  function deMasurat(monede, boti, max) {
    var b = boti || {}, l = (Array.isArray(monede) ? monede : []).slice();
    l.sort(function (x, y) { return (b[y.simbol] ? 1 : 0) - (b[x.simbol] ? 1 : 0) || (y.amp24 || 0) - (x.amp24 || 0); });
    return max > 0 ? l.slice(0, max) : l;
  }

  return { TOP: TOP, PER_MS: PER_MS, MIN_BLOCURI: MIN_BLOCURI, SUBTIRE: SUBTIRE, PESTE: PESTE, FERESTRE: FERESTRE, STABILE: STABILE, APRINS: APRINS, PIATA: PIATA, PESTE_BINANCE: PESTE_BINANCE,
    aprinsa: aprinsa, piataAprinsa: piataAprinsa, dinBinance: dinBinance, fataDeBinance: fataDeBinance,
    BILANT: BILANT, regulaAcum: regulaAcum, directia: directia, urmare: urmare, tDouaParti: tDouaParti, bilantMesaje: bilantMesaje, bilantUrmare: bilantUrmare, bilantBinance: bilantBinance,
    fer: fer, ranguri: ranguri, univers: univers, bare: bare, fereastra: fereastra, obisnuit: obisnuit, cuPret: cuPret, masura: masura, treapta: treapta,
    clasament: clasament, deMasurat: deMasurat };
})();
