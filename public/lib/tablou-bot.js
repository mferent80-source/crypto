// Modul PUR: primeste cifre, intoarce masuri si verdict.
// Fara DOM, fara retea, fara localStorage - ca sa poata fi probat in Node.
var TabloBot = (function () {
  // "COTI.PERP" + "USDT" -> Pionex "COTI_USDT_PERP", Binance "COTIUSDT"
  function simboluri(base, quote) {
    var b = String(base || ""), q = String(quote || "USDT");
    var perp = b.slice(-5) === ".PERP";
    var moneda = perp ? b.slice(0, -5) : b;
    return {
      pionex: perp ? moneda + "_" + q + "_PERP" : moneda + "_" + q,
      binance: (moneda + q).toUpperCase(),
    };
  }
  // Lipsa ramane LIPSA: Number(null) === 0, Number("") === 0, Number(false) === 0
  // - fara garda de mai jos, un camp absent devenea tacut cifra 0 (comision 0%,
  // interval de la 0, 0 perechi). Doar "0" trimis chiar ca numar/text e 0.
  function nr(v) {
    if (v === null || v === undefined || typeof v === "boolean") return null;
    if (typeof v === "string" && v.trim() === "") return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  var NECUNOSCUT = { valoare: null, stare: "nu-se-poate", prag: null };

  // Audit 24.09: fiecare masura poarta unitatea, iar valoarea e DEJA in ea
  // (comisionul in procente, nu fractie). Ecranul doar o lipeste langa cifra.
  // eficienta e un indice 0-1 si starile de cont/bot sunt text: unitate "".
  var UNITATI = { pozitieInterval: "%", ritmPerechi: "perechi/oră", eficienta: "",
    amplitudine: "×", lichidare: "%", comision: "%", basis: "%",
    marginStatus: "", riskStatus: "", stareBot: "",
    varstaBot: "min", lumanari: "lumânări", istoric: "min" };
  // Copie pe fiecare masura - NECUNOSCUT e comun si nu are voie sa fie atins.
  function cuUnitati(m) {
    for (var k in UNITATI) {
      if (!(k in m) || typeof m[k] !== "object") continue;
      var o = m[k] || NECUNOSCUT, c = {};
      for (var j in o) c[j] = o[j];
      c.unitate = UNITATI[k];
      m[k] = c;
    }
    return m;
  }

  // Stare de cont raportata direct de Pionex (marginStatus / riskStatus).
  // Camp lipsa sau gol -> NECUNOSCUT (nu declansam, n-avem de unde sti, dar
  // nici nu-l tratam tacut ca fiind valoarea buna - vezi trepte()).
  function estareCont(bruta, asteptat) {
    if (bruta === undefined || bruta === null) return NECUNOSCUT;
    var v = String(bruta).trim().toUpperCase();
    if (!v) return NECUNOSCUT;
    return { valoare: v, stare: v === asteptat ? "bine" : "rau", prag: asteptat };
  }

  // Starea botului insusi. "oprit" = inchis de tot (nu mai are pozitie de
  // pazit); "altceva" = nici running, nici inchis (ex. paused) - pozitia poate
  // exista inca, deci riscul se judeca inaintea lui. Lipsa -> nu-se-poate.
  var STARI_INCHIS = ["closed", "canceled", "cancelled", "finished", "stopped",
    "liquidated", "expired", "terminated"];
  function stareBotului(bot) {
    var x = (bot && bot.buOrderData) || {};
    var sus = bot && bot.status != null ? String(bot.status).trim().toLowerCase() : "";
    var jos = x.status != null ? String(x.status).trim().toLowerCase() : "";
    var valoare = jos || sus || null;
    if (!valoare) return { valoare: null, stare: "nu-se-poate", prag: "running" };
    if (STARI_INCHIS.indexOf(sus) >= 0 || STARI_INCHIS.indexOf(jos) >= 0)
      return { valoare: STARI_INCHIS.indexOf(jos) >= 0 ? jos : sus, stare: "oprit", prag: "running" };
    // Fara status jos, "running" sus e tot un bot care merge (bot-orders.js il
    // socoteste activ la fel) - altfel iesea OPRIT fals.
    if (jos === "running" || (!jos && (sus === "open" || sus === "running")))
      return { valoare: valoare, stare: "bine", prag: "running" };
    return { valoare: valoare, stare: "altceva", prag: "running" };
  }

  // Kaufman: cat din miscarea totala a fost intr-o singura directie.
  // 0 = zigzag curat, 1 = trend curat.
  function eficienta(inchideri) {
    if (!inchideri || inchideri.length < 2) return { valoare: null, semn: 0 };
    var net = inchideri[inchideri.length - 1] - inchideri[0], drum = 0;
    for (var i = 1; i < inchideri.length; i++) drum += Math.abs(inchideri[i] - inchideri[i - 1]);
    if (!drum) return { valoare: 0, semn: 0 };
    return { valoare: Math.abs(net) / drum, semn: net > 0 ? 1 : net < 0 ? -1 : 0 };
  }

  // ATR(n) adevarat, cu high/low - nu doar |delta close|. |delta close| ignora
  // mustatile: o lumanare care sare sus si coboara inapoi la acelasi close
  // arata "amplitudine zero" in formula veche, desi tocmai a miscat pretul cu
  // toata mustatea aia. Lumanarile Pionex au high/low - le folosim.
  // O lumanare cu high/low lipsa se sare (nu se ghiceste), dar tine loc pentru
  // prevClose la urmatoarea.
  function atr(lumanari, n) {
    if (!lumanari || lumanari.length < 2) return null;
    var felie = lumanari.slice(-n - 1), tr = [], prevClose = null;
    for (var i = 0; i < felie.length; i++) {
      var h = nr(felie[i].high), l = nr(felie[i].low), c = nr(felie[i].close);
      if (h === null || l === null || prevClose === null) { prevClose = c; continue; }
      tr.push(Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose)));
      prevClose = c;
    }
    if (!tr.length) return null;
    var s = 0; for (var j = 0; j < tr.length; j++) s += tr[j];
    return s / tr.length;
  }

  // De cate minute e pretul CONTINUU in banda de margine (<15% sau >85%),
  // numarat inapoi din `acum` pe istoricul retinut. Se opreste la prima
  // intrare care nu mai e la margine (fie "bine", fie "afara" de tot) - o
  // iesire scurta din banda taie sirul, nu se aduna peste ea.
  // O gaura in istoric (ecranul inchis, o pana de retea) NU e dovada ca pretul
  // a stat la margine cat a lipsit. Doua masuratori rare, la 200 de minute una
  // de alta, raportau 200 de minute "continue" si aprindeau REGLEAZA pe o
  // dovada care nu exista. Lantul se rupe la gaura, nu se numara peste ea.
  var GAURA_MAX_MS = 5 * 60000;
  function minuteContinuuLaMargine(istoric, jos, sus, acum) {
    if (!istoric || !istoric.length || !(sus > jos)) return 0;
    var min = 0, urmator = acum;
    for (var i = istoric.length - 1; i >= 0; i--) {
      var pp = nr(istoric[i].pretPerp), t = nr(istoric[i].t);
      if (pp === null || t === null) break;
      if (urmator - t > GAURA_MAX_MS) break;
      var poz = 100 * (pp - jos) / (sus - jos);
      if (!(poz >= 0 && poz <= 100 && (poz < 15 || poz > 85))) break;
      min = (acum - t) / 60000;
      urmator = t;
    }
    return min;
  }

  function masoara(intrari) {
    var bot = intrari.bot, x = (bot && bot.buOrderData) || null;
    var lumanari = intrari.klinePerp || [];
    var inchideri = lumanari.map(function (k) { return nr(k.close); }).filter(function (v) { return v !== null; });
    // Pretul VIU (din tickere, la fiecare 8s, fara cache) bate inchiderea
    // ultimei lumanari de 5m (cache 300s pe ruta - pana la ~10 minute vechi).
    // Lumanarile raman pentru eficienta si amplitudine - alea au nevoie de
    // serie, nu de un singur punct.
    // nr() intoarce 0 pentru null/""/false (Number(null) === 0), iar app.js trimite
    // EXPLICIT null la un bot de grid SPOT sau la o pana de tickere. Un pretPerp de 0
    // fabrica basis -100% si pozitie -700%, amandoua marcate "bine". Doar un pret
    // STRICT POZITIV are voie sa bata lumanarea.
    var pvBrut = nr(intrari.pretPerpViu);
    var pretPerpViu = (pvBrut !== null && pvBrut > 0) ? pvBrut : null;
    var pretPerp = pretPerpViu !== null ? pretPerpViu : (inchideri.length ? inchideri[inchideri.length - 1] : null);
    var pretSpot = nr(intrari.pretSpot);
    var istoric = intrari.istoric || [];
    var acum = intrari.acum || Date.now();

    var ef = eficienta(inchideri.slice(-48));
    // Lipsa ramane null (nu 0): o ora de pornire lipsa scria "Botul are 0 de
    // minute", iar o prima mostra fara timp dadea istoric de ~30 de milioane de
    // minute - adica trecea tacut de treapta NEDOVEDIT.
    var tPornire = bot ? nr(bot.createTime) : null;
    var tPrimaMostra = istoric.length ? nr(istoric[0].t) : null;

    var m = {
      varstaBotMin: tPornire !== null && tPornire > 0 ? (acum - tPornire) / 60000 : null,
      lumanari: inchideri.length,
      istoricMin: !istoric.length ? 0 : (tPrimaMostra !== null && tPrimaMostra > 0 ? (acum - tPrimaMostra) / 60000 : null),
      pretPerp: pretPerp,
      pretSpot: pretSpot,
      eficienta: { valoare: ef.valoare, semn: ef.semn, prag: { trend: 0.60, zigzag: 0.30 },
                   stare: ef.valoare === null ? "nu-se-poate" : ef.valoare > 0.60 ? "trend" : ef.valoare < 0.30 ? "zigzag" : "bine" },
      pozitieInterval: NECUNOSCUT, ritmPerechi: NECUNOSCUT, amplitudine: NECUNOSCUT,
      lichidare: NECUNOSCUT, comision: NECUNOSCUT,
      basis: NECUNOSCUT, directieBot: 0,
      marginStatus: NECUNOSCUT, riskStatus: NECUNOSCUT,
      stareBot: bot ? stareBotului(bot) : NECUNOSCUT,
    };

    if (pretPerp !== null && pretSpot) {
      var b = 100 * (pretPerp - pretSpot) / pretSpot;
      // "Sarit" inseamna DOUA lucruri deodata: peste 1% in valoare absoluta SI
      // peste dublul medianei ultimelor 24 de masuratori. Fara a doua conditie,
      // un basis care sta linistit la 3% ar tipa incontinuu.
      var vechi = istoric.slice(-24).map(function (h) {
        var pp = nr(h.pretPerp), ps = nr(h.pretSpot);
        return pp && ps ? Math.abs(100 * (pp - ps) / ps) : null;
      }).filter(function (v) { return v !== null; }).sort(function (p, q) { return p - q; });
      var mediana = vechi.length ? vechi[Math.floor(vechi.length / 2)] : null;
      var sarit = Math.abs(b) > 1.0 && mediana !== null && Math.abs(b) > 2 * mediana;
      m.basis = { valoare: b, mediana: mediana, prag: 1.0,
        stare: sarit ? "rau" : "bine" };
    }
    if (!x) return cuUnitati(m);

    var tr = String(x.trend || "").trim().toLowerCase();
    m.directieBot = tr === "long" ? 1 : tr === "short" ? -1 : 0;

    // Stare raportata direct de Pionex - bate orice calcul local (Task 1 al
    // revizei finale: marginStatus/riskStatus nu erau citite niciodata).
    m.marginStatus = estareCont(x.marginStatus, "NORMAL");
    m.riskStatus = estareCont(x.riskStatus, "TRADING");

    var grid = citesteGrid(bot);
    var jos = grid.jos, sus = grid.sus;
    if (grid.bun && pretPerp !== null) {
      var p = 100 * (pretPerp - jos) / (sus - jos);
      m.pozitieInterval = {
        valoare: p, prag: { margine: 15, afara: 0 },
        stare: p < 0 || p > 100 ? "afara" : (p < 15 || p > 85) ? "margine" : "bine",
        minuteLaMargine: minuteContinuuLaMargine(istoric, jos, sus, acum),
      };
      var linii = nr(x.row);
      if (linii && linii > 0) {
        var treapta = (sus - jos) / linii, amp = atr(lumanari, 14);
        if (amp !== null) m.amplitudine = { valoare: amp / treapta, prag: 1.0,
          stare: amp / treapta < 1.0 ? "rau" : "bine" };
      }
    }

    // Lichidarea: AMBELE parti, cele care exista (Pionex trimite "0" pe partea
    // care nu exista - garda >0). Un bot neutru le are pe amandoua; un long
    // poate veni cu Jos "0" si Sus > 0. Se ia distanta SEMNATA cea mai mica:
    // jos = (pret - jos) / pret, sus = (sus - pret) / pret. Negativa = pretul
    // a trecut deja de prag (DEPASITA) - cazul cel mai periculos.
    var lichJos = nr(x.estimateLiquidationPriceDown);
    var lichSus = nr(x.estimateLiquidationPriceUp);
    if (pretPerp !== null && pretPerp > 0) {
      var parti = [];
      if (lichJos !== null && lichJos > 0) parti.push({ partea: "jos", pret: lichJos, d: 100 * (pretPerp - lichJos) / pretPerp });
      if (lichSus !== null && lichSus > 0) parti.push({ partea: "sus", pret: lichSus, d: 100 * (lichSus - pretPerp) / pretPerp });
      if (parti.length) {
        var cea = parti[0];
        for (var pi = 1; pi < parti.length; pi++) if (parti[pi].d < cea.d) cea = parti[pi];
        m.lichidare = { valoare: cea.d, prag: { grav: 8, atentie: 15 },
          stare: cea.d < 8 ? "rau" : cea.d < 15 ? "margine" : "bine",
          partea: cea.partea, pretLichidare: cea.pret, depasita: cea.d < 0 };
      }
    }

    var brut = nr(x.gridProfit), taxe = nr(x.totalFee);
    if (brut !== null && taxe !== null) {
      if (brut > 0) {
        var r = 100 * Math.abs(taxe) / brut;
        m.comision = { valoare: r, prag: 50, stare: r > 50 ? "rau" : "bine" };
      } else if (Math.abs(taxe) > 0) {
        // Taxe care curg fara profit brut (zero sau negativ) e cazul cel mai
        // rau, nu unul nemasurabil - la un ban profit ratul striga, la zero
        // tacea. Nu exista un raport sanatos de aratat (impartire la zero sau
        // negativ), dar starea nu are voie sa taca pe "nu-se-poate".
        m.comision = { valoare: null, prag: 50, stare: "rau" };
      }
      // brut <= 0 si taxe === 0: ramane NECUNOSCUT - n-a curs nimic inca.
    }

    // Ritmul: perechi in ultima ora fata de media pe ora din ultimele 6.
    // `exchangeOrderPairedCount` e cumulativ, deci se scade intre capete.
    var ORA = 3600000;
    var inUrma = function (ms) {
      var tinta = acum - ms, cel = null;
      for (var i = 0; i < istoric.length; i++) if (nr(istoric[i].t) <= tinta) cel = istoric[i];
      return cel;
    };
    var acum0 = istoric.length ? istoric[istoric.length - 1] : null;
    var acum1 = inUrma(ORA), acum7 = inUrma(7 * ORA);
    // Audit 24.09: se imparte la durata REALA dintre capete (nu la 1h/6h fixe),
    // iar o gaura >5 min oriunde intre capatul vechi si `acum` (ecran inchis,
    // pana de retea) face ritmul NECUNOSCUT - nu se numara peste ea.
    var ritmDinIstoric = false;
    if (acum0 && acum1 && acum7) {
      var t0 = nr(acum0.t), t1 = nr(acum1.t), t7 = nr(acum7.t);
      var p0 = nr(acum0.perechi), p1 = nr(acum1.perechi), p7 = nr(acum7.perechi);
      var farGaura = t0 !== null && acum - t0 <= GAURA_MAX_MS;
      var dupa7 = false, tPrec = null;
      for (var gi = 0; gi < istoric.length && farGaura; gi++) {
        var tg = nr(istoric[gi].t);
        if (istoric[gi] === acum7) dupa7 = true;
        if (!dupa7) continue;
        if (tg === null || (tPrec !== null && tg - tPrec > GAURA_MAX_MS)) farGaura = false;
        tPrec = tg;
      }
      if (farGaura && p0 !== null && p1 !== null && p7 !== null && t0 > t1 && t1 > t7) {
        var ultima = (p0 - p1) / ((t0 - t1) / ORA);
        var baza = (p1 - p7) / ((t1 - t7) / ORA);
        // Contor resetat (bot inchis si redeschis): o diferenta negativa nu e
        // ritm. Fara baza de comparatie nu raportam "rau" - ramane NECUNOSCUT.
        if (!(ultima < 0 || baza < 0)) {
          m.ritmPerechi = { valoare: ultima, baza: baza, prag: 0.40,
            stare: baza > 0 && ultima / baza < 0.40 ? "rau" : "bine",
            sursa: "istoric", eticheta: null };
          ritmDinIstoric = true;
        }
      }
    }
    // Mostrele nu ajung: cifra lui Pionex (perechi in 24h), marcata ca atare.
    // Fara baza nu se judeca (stare nu-se-poate) - doar se arata.
    if (!ritmDinIstoric) {
      var trx = nr(x.trx24h);
      if (trx !== null && trx >= 0) {
        m.ritmPerechi = { valoare: trx / 24, baza: null, prag: 0.40, stare: "nu-se-poate",
          sursa: "pionex-24h", eticheta: "din Pionex 24h", total24h: trx };
      }
    }
    return cuUnitati(m);
  }

  function trepte(m, mod, optiuni) {
    var o = optiuni || {}, d = function (masura, valoare, prag) {
      return { masura: masura, valoare: valoare, prag: prag,
        unitate: UNITATI.hasOwnProperty(masura) ? UNITATI[masura] : "" };
    };
    if (o.faraBot) return { nivel: "FARA_BOT",
      titlu: "Niciun bot pornit",
      ceFac: "Urmăresc simbolul ales de tine. Cifrele care țin de grid nu se pot socoti.",
      declansator: null };

    // Botul inchis de tot nu mai are pozitie de pazit - "Merge" ar minti.
    if (m.stareBot && m.stareBot.stare === "oprit") {
      return { nivel: "OPRIT", titlu: "Botul e oprit",
        ceFac: "Pionex raportează botul ca " + m.stareBot.valoare + ". Nu mai tranzacționează - verdictele de grid nu se mai aplică.",
        declansator: d("stareBot", m.stareBot.valoare, "running") };
    }

    // REGULA 24.09: rosul NU se ascunde niciodata in spatele lui "Nu stiu inca".
    // Tot ce urmeaza pana la treptele NEDOVEDIT se socoteste din cifre care nu
    // cer varsta botului sau istoric (starea de cont, lichidarea, capetele
    // intervalului). NEDOVEDIT opreste doar verdictele verzi si pe cele de ritm.

    // Starea de cont de la Pionex bate orice calcul local - daca bursa insasi
    // spune ca margine sau riscul nu sunt normale, iesim, indiferent cat de
    // departe pare lichidarea calculata de noi. Camp lipsa (NECUNOSCUT) nu
    // declanseaza nimic - vezi estareCont() mai sus.
    if (m.marginStatus && m.marginStatus.valoare !== null && m.marginStatus.stare === "rau") {
      return { nivel: "OPRESTE", titlu: "Ieși",
        ceFac: "Pionex raportează marginea contului ca " + m.marginStatus.valoare + ", nu NORMAL.",
        declansator: d("marginStatus", m.marginStatus.valoare, "NORMAL") };
    }
    if (m.riskStatus && m.riskStatus.valoare !== null && m.riskStatus.stare === "rau") {
      return { nivel: "OPRESTE", titlu: "Ieși",
        ceFac: "Pionex raportează starea de risc ca " + m.riskStatus.valoare + ", nu TRADING.",
        declansator: d("riskStatus", m.riskStatus.valoare, "TRADING") };
    }

    if (m.lichidare.valoare !== null && m.lichidare.valoare < 8) {
      var txtLichidare = m.lichidare.valoare < 0
        ? "Prețul a trecut deja de pragul de lichidare cu " + Math.abs(m.lichidare.valoare).toFixed(1) + "%."
        : "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% până la lichidare.";
      return { nivel: "OPRESTE", titlu: "Ieși",
        ceFac: txtLichidare,
        declansator: d("lichidare", m.lichidare.valoare, 8) };
    }

    // Lichidarea (ca si OPRESTE de mai sus) nu se oglindeste: pragurile sunt
    // aceleasi in ambele moduri si trebuie sa bata orice decizie care tine de
    // mod - altfel o iesire "in favoare" in DIRECTIONAL ar inghiti tacut
    // avertismentul de lichidare de la 8-15%.
    if (m.lichidare.valoare !== null && m.lichidare.valoare < 15) {
      return { nivel: "PAZESTE", titlu: "Lichidarea e aproape",
        ceFac: "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% până acolo.",
        declansator: d("lichidare", m.lichidare.valoare, 15) };
    }

    // PAZESTE din pozitie/trend. Eficienta cere 48 de lumanari (aceeasi garda
    // ca treapta NEDOVEDIT de mai jos) - fara ele trendul nu e dovedit. Iesirea
    // din interval cere doar pretul si capetele. Iesirea IN FAVOARE e verde
    // (OPORTUNITATE) - asteapta dupa NEDOVEDIT.
    var directie = m.eficienta.semn, eficientaDovedita = m.lumanari >= 48, oportunitate = null;
    if (mod === "DIRECTIONAL") {
      if (eficientaDovedita && m.eficienta.stare === "trend" && m.directieBot && directie && directie !== m.directieBot) {
        return { nivel: "PAZESTE", titlu: "Trendul s-a întors împotriva ta",
          ceFac: "Mișcarea e hotărâtă, dar în sens invers poziției tale.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
      if (m.pozitieInterval.stare === "afara") {
        var pragIesit = m.pozitieInterval.valoare > 100 ? 100 : 0;
        // Fara directieBot (Task 5) nu stiu daca iesirea e in favoarea sau
        // impotriva pozitiei - nu am voie sa presupun "impotriva" din tacere.
        if (m.directieBot) {
          var inFavoare = (m.pozitieInterval.valoare > 100 && m.directieBot === 1)
            || (m.pozitieInterval.valoare < 0 && m.directieBot === -1);
          if (inFavoare) oportunitate = { nivel: "OPORTUNITATE", titlu: "A trecut de interval în favoarea ta",
            ceFac: "Cântărește dacă iei profitul sau muți grid-ul după el.",
            declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
          else return { nivel: "PAZESTE", titlu: "A ieșit din interval împotriva ta",
            ceFac: "Poziția merge în sens invers.",
            declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
        } else {
          return { nivel: "PAZESTE", titlu: "Prețul a ieșit din interval",
            ceFac: "Nu mai câștigi din oscilație, ții doar o poziție pe direcție.",
            declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
        }
      }
    } else {
      if (m.pozitieInterval.stare === "afara") {
        var pragIesitGrid = m.pozitieInterval.valoare > 100 ? 100 : 0;
        return { nivel: "PAZESTE", titlu: "Prețul a ieșit din interval",
          ceFac: "Nu mai câștigi din oscilație, ții doar o poziție pe direcție.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesitGrid) };
      }
      if (eficientaDovedita && m.eficienta.stare === "trend" && m.pozitieInterval.stare === "margine") {
        return { nivel: "PAZESTE", titlu: "Trend, cu prețul la margine",
          ceFac: "Grid-ul e pe cale să rămână în urmă.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
    }

    // Botul nici nu merge, nici nu e inchis (ex. paused): riscul de mai sus s-a
    // judecat deja; aici doar nu-l lasam sa para "Merge".
    if (m.stareBot && m.stareBot.stare === "altceva") {
      return { nivel: "OPRIT", titlu: "Botul e oprit",
        ceFac: "Pionex raportează botul ca " + m.stareBot.valoare + ", nu running - nu tranzacționează acum.",
        declansator: d("stareBot", m.stareBot.valoare, "running") };
    }

    // Fiecare motiv al lui NEDOVEDIT isi spune singur cauza - nu toate pe varsta.
    if (m.varstaBotMin == null) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Nu știu de când e pornit botul - lipsește ora pornirii. Ritmul are nevoie de vreo 2 ore ca să însemne ceva.",
        declansator: d("varstaBot", null, 120) };
    }
    if (m.varstaBotMin < 120) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Botul are " + Math.round(m.varstaBotMin) + " de minute. Ritmul are nevoie de vreo 2 ore ca să însemne ceva.",
        declansator: d("varstaBot", Math.round(m.varstaBotMin), 120) };
    }
    if (m.lumanari < 48) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Am doar " + m.lumanari + " lumânări. Îmi trebuie cel puțin 48 ca să măsor eficiența.",
        declansator: d("lumanari", m.lumanari, 48) };
    }
    if (m.istoricMin == null) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Nu știu cât istoric am - prima măsurătoare nu are oră. Îmi trebuie cel puțin 30 de minute ca să văd un ritm.",
        declansator: d("istoric", null, 30) };
    }
    if (m.istoricMin < 30) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Am doar " + Math.round(m.istoricMin) + " minute de istoric. Îmi trebuie cel puțin 30 ca să văd un ritm.",
        declansator: d("istoric", Math.round(m.istoricMin), 30) };
    }
    // Pionex poate trimite un raspuns partial - fara aceste doua masuri nu
    // stiu nimic despre risc, deci nu am voie sa cad tacut pe LINISTE.
    if (m.lichidare.stare === "nu-se-poate") {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Nu pot socoti distanța până la lichidare - lipsește prețul de lichidare estimat.",
        declansator: d("lichidare", null, null) };
    }
    if (m.pozitieInterval.stare === "nu-se-poate") {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu știu încă",
        ceFac: "Nu pot socoti unde e prețul în interval - lipsesc datele grid-ului.",
        declansator: d("pozitieInterval", null, null) };
    }

    if (oportunitate) return oportunitate;

    if (mod === "DIRECTIONAL" && m.eficienta.stare === "zigzag") {
      return { nivel: "REGLEAZA", titlu: "Piața nu merge nicăieri",
        ceFac: "Plătești comisioane într-un interval, deși pariezi pe direcție.",
        declansator: d("eficienta", m.eficienta.valoare, 0.30) };
    }
    if (m.amplitudine.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Oscilația a scăzut sub o treaptă",
        ceFac: "Botul nu mai prinde perechi, dar comisioanele curg.",
        declansator: d("amplitudine", m.amplitudine.valoare, 1.0) };
    }
    if (m.comision.stare === "rau") {
      // Cazul fara raport (brut <= 0): mesajul "peste jumatate" ar minti -
      // nu exista jumatate din nimic. Spunem direct ce se vede.
      var texComision = m.comision.valoare === null
        ? "Taxele curg, dar botul n-are niciun câștig brut din grid."
        : "Peste jumătate din câștigul brut se duce pe taxe.";
      return { nivel: "REGLEAZA", titlu: "Comisioanele mănâncă gridul",
        ceFac: texComision,
        declansator: d("comision", m.comision.valoare, 50) };
    }
    if (mod !== "DIRECTIONAL" && m.ritmPerechi.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Ritmul a căzut",
        ceFac: (Math.round(m.ritmPerechi.valoare * 10) / 10) + " perechi pe oră în ultima oră, față de " + (Math.round(m.ritmPerechi.baza * 10) / 10) + " obișnuit.",
        declansator: d("ritmPerechi", m.ritmPerechi.valoare, m.ritmPerechi.baza * 0.40) };
    }
    // O atingere trecatoare a marginii nu cere mutarea intervalului - doar o
    // sedere de macar 30 de minute o cere. `minuteLaMargine` vine din istoric
    // (masoara) si lipseste (0) pe fixturile vechi care nu-l seteaza - acelea
    // trebuie sa-l puna explicit daca vor sa exercite treapta asta.
    if (mod !== "DIRECTIONAL" && m.pozitieInterval.stare === "margine"
        && (m.pozitieInterval.minuteLaMargine || 0) >= 30) {
      var pragMargine = m.pozitieInterval.valoare < 15 ? 15 : 85;
      var minuteMargine = Math.round(m.pozitieInterval.minuteLaMargine);
      return { nivel: "REGLEAZA", titlu: "Stai lipit de o margine",
        ceFac: "Cântărește mutarea intervalului - stai acolo de " + minuteMargine + " minute.",
        declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragMargine) };
    }
    if (m.basis.stare === "rau") {
      return { nivel: "OPORTUNITATE", titlu: "Perpetua s-a rupt de spot",
        ceFac: "Diferența e " + m.basis.valoare.toFixed(2) + "%.",
        declansator: d("basis", m.basis.valoare, m.basis.prag) };
    }
    return { nivel: "LINISTE", titlu: "Merge",
      ceFac: m.pozitieInterval.valoare !== null
        ? "Ești la " + Math.round(m.pozitieInterval.valoare) + "% din interval."
        : "Toate măsurile sunt în regulă.",
      declansator: null };
  }

  var CAMPURI_MISCATOR = ["movingBottom", "movingTop", "movingIndicatorType",
    "movingTrailingUpParam", "movingTrailingDownParam"];

  function modBot(bot, alegeri) {
    var id = bot && bot.strategyId != null ? String(bot.strategyId) : null;
    var ales = id && alegeri && alegeri[id];
    if (ales === "GRID" || ales === "DIRECTIONAL") return { mod: ales, presupus: false };
    var x = (bot && bot.buOrderData) || {};
    for (var i = 0; i < CAMPURI_MISCATOR.length; i++) {
      var v = x[CAMPURI_MISCATOR[i]];
      if (v !== undefined && v !== null) {
        var s = String(v).trim();
        if (s !== "" && s !== "0") {
          return { mod: "DIRECTIONAL", presupus: true };
        }
      }
    }
    return { mod: "GRID", presupus: true };
  }

  // O eroare care arata codul si atat ("AUTH_REQUIRED") e tot un ecran care
  // tace cand ar trebui sa vorbeasca: omul afla ca ceva a esuat, nu ce sa faca.
  // 23.09.2026: Marius a deschis versiunea publicata si a primit exact asta.
  function explicaEroarea(mesaj, status, gazda) {
    var g = String(gazda == null ? "" : gazda).toLowerCase();
    var local = g === "localhost" || g === "127.0.0.1" || g === "[::1]" || g === "";
    // Versiunea PUBLICATA (Cloudflare) nu are cheile si Pionex o refuza. Un
    // tunel (trycloudflare) NU e publicat: e serverul de acasa vazut de pe
    // telefon - acolo parola chiar rezolva. Audit 24.09: "nelocal" trata tunelul
    // ca pe versiunea publicata si il trimitea acasa degeaba.
    var publicat = /\.pages\.dev$|\.workers\.dev$/.test(g);
    var brut = (mesaj == null || mesaj === "") ? "Eroare necunoscută." : String(mesaj);
    // nr(null) intorcea 0 (Number(null) === 0), nu null - aceeasi capcana care a
    // fabricat basis -100% la pretPerpViu. Un status e valid doar daca e POZITIV.
    var stBrut = nr(status), st = (stBrut !== null && stBrut > 0) ? stBrut : null;
    // Fetch-ul n-a ajuns deloc la server: fara status, cu mesajul browserului.
    // Doar mesajele de RETEA - numele TypeError singur prindea si un bug din
    // cod ("TypeError: x is undefined") si il trimitea sa reporneasca serverul.
    var eRetea = st === null && /Failed to fetch|NetworkError|Load failed|\bnetwork\b/i.test(brut);
    // Cheile Pionex (sau parola) lipsesc din configurarea SERVERULUI - 503.
    var eNeconfigurat = /NOT_CONFIGURED|nu sunt configurate/i.test(brut);
    var eParola = st === 401 || /AUTH_REQUIRED|AUTH_INVALID/.test(brut);
    var eDrept = st === 403 || /PERMISSION|Bot reading/i.test(brut);
    // Doar codul exact - /RATE/ prindea si "configuRATE" (cheile lipsa).
    var eRitm = st === 429 || /RATE_LIMIT|\b429\b/i.test(brut);

    if (eRetea) {
      return { local: local, titlu: "Nu ajung la server",
        ceFac: publicat
          ? "Nu am legătură cu serverul - verifică internetul. (" + brut + ")"
          : "Serverul de acasă e oprit — pornește PORNESTE-CRYPTO-RADAR.bat. (" + brut + ")" };
    }
    if (/APP_API_TOKEN_NOT_CONFIGURED/.test(brut)) {
      return { local: local, titlu: "Parola aplicației nu e pusă pe server — pornește din nou .bat",
        ceFac: "Serverul rulează, dar nu are parola aplicației (APP_API_TOKEN). " +
          "Închide fereastra neagră și pornește din nou cu PORNESTE-CRYPTO-RADAR.bat - " +
          "îți cere parola și cele două chei Pionex o dată, la pornire." };
    }
    if (eNeconfigurat) {
      return { local: local, titlu: "Cheile Pionex nu sunt puse",
        ceFac: "Serverul rulează, dar nu are cheile Pionex sau parola aplicației. " +
          "Închide fereastra neagră și pornește din nou cu PORNESTE-CRYPTO-RADAR.bat - " +
          "îți cere cele trei chei o dată, la pornire." };
    }
    if (eParola) {
      var gresita = /AUTH_INVALID/.test(brut);
      return { local: local,
        titlu: gresita ? "Parola aplicației nu se potrivește" : "Lipsește parola aplicației",
        ceFac: "Pune parola în Setări (butonul ⚙)" + (gresita ? " - cea de acum nu se potrivește" : "") +
          ". Parola e textul APP_API_TOKEN pe care l-ai dat la pornirea cu PORNESTE-CRYPTO-RADAR.bat." +
          (publicat ? " Atenție: pe versiunea publicată boții tot nu se văd - Pionex refuză " +
            "cererile venite de la Cloudflare. Ca să-ți vezi boții, pornește aplicația acasă " +
            "cu PORNESTE-CRYPTO-RADAR.bat și deschide adresa pe care ți-o scrie el." : "") };
    }
    if (eDrept) {
      return { local: local, titlu: "Cheia Pionex nu are voie să citească boții",
        ceFac: "Bifează «Bot reading» la cheia Pionex (Pionex › API Management - e doar " +
          "citire) sau fă o cheie nouă cu el." };
    }
    // Limita NOASTRA (RATE_LIMITED, 30/min) nu e refuzul de adresa al lui Pionex.
    if (eRitm && publicat && !/\bRATE_LIMITED\b/.test(brut)) {
      return { local: local, titlu: "Pionex refuză cererile de aici",
        ceFac: "Nu e vina ta și nu trece cu așteptarea: măsurat, refuzul vine cu " +
          "găleata de jetoane PLINĂ, deci e refuz de adresă, nu limitare de ritm. " +
          "De acasă, prin PORNESTE-CRYPTO-RADAR.bat, merge." };
    }
    if (/NO_ROUTE/.test(brut)) {
      return { local: local, titlu: "Serverul nu cunoaște cererea asta",
        ceFac: "Serverul de acasă rulează o versiune mai veche decât pagina - închide " +
          "fereastra Radarului și pornește din nou PORNESTE-CRYPTO-RADAR.bat." };
    }
    if (eRitm) {
      return { local: local, titlu: "Prea multe cereri",
        ceFac: "S-au cerut date prea des. Lasă ecranul deschis un minut fără să " +
          "dai refresh - se reia singur." };
    }
    // MASURAT 23.09 pe un tunel trycloudflare: 200 si 401 trec ca JSON, dar orice
    // 5xx de la serverul de acasa e INLOCUIT cu pagina de eroare a Cloudflare.
    // getJSON nu mai poate parsa si arunca "Raspuns invalid · HTTP 502", fara motiv.
    // Motivul adevarat exista - dar in fereastra neagra de pe calculator.
    var codText = brut.match(/HTTP\s+(\d{3})/);
    var cod = st !== null ? st : (codText ? Number(codText[1]) : null);
    if (cod !== null && cod >= 500 && cod < 600) {
      return { local: local, titlu: "Serverul nu a putut lua datele de la Pionex",
        ceFac: "Cererea a ajuns la aplicație, dar pasul către Pionex a picat (" + cod + "). " +
          "Motivul exact îl scrie fereastra neagră de pe calculator - dacă ai deschis " +
          "de pe telefon, Cloudflare înlocuiește motivul cu o pagină a lui. " +
          "Cel mai des înseamnă că Pionex nu răspunde sau că o cheie nu mai e bună. " +
          "Mesajul primit: " + brut };
    }
    return { local: local, titlu: "Nu am putut citi boții", ceFac: brut };
  }

  // Care bot se judeca. Ecranul alegea singur primul activ si nu-i dadea omului
  // cum sa aleaga altul (I9). Alegerea sta aici, nu in ecran, ca sa fie probata.
  // Intoarce si MOTIVUL, fiindca omul trebuie sa poata afla daca se uita la
  // botul LUI sau la unul ales de ecran - mai ales cand preferatul a disparut.
  function alegeBot(boti, idPreferat) {
    var lista = [];
    if (Array.isArray(boti)) {
      for (var k = 0; k < boti.length; k++) if (boti[k]) lista.push(boti[k]);
    }
    if (!lista.length) return { bot: null, motiv: "fara-boti" };
    // Ruta poate da id numeric, localStorage intoarce mereu un sir.
    var cheie = (idPreferat === undefined || idPreferat === null) ? "" : String(idPreferat);
    if (cheie) {
      for (var i = 0; i < lista.length; i++) {
        if (String(lista[i].id) === cheie) return { bot: lista[i], motiv: "ales-de-om" };
      }
    }
    var activ = null;
    for (var j = 0; j < lista.length; j++) { if (lista[j].activ) { activ = lista[j]; break; } }
    return { bot: activ || lista[0],
      motiv: cheie ? "preferat-disparut" : (activ ? "auto-activ" : "auto-primul") };
  }

  // Cifrele sunt de DOUA feluri si gaurile din istoric le ating diferit.
  // (a) ratele din contoare CUMULATIVE (perechi, profitNet) raman valide peste o
  //     gaura: totalul de la Pionex include si ce s-a intamplat cat n-am privit.
  // (b) frecventele de STARE nu: acolo gaura inseamna ca nu stim unde era pretul,
  //     deci intrarile lipsa nu intra in numitor si se raporteaza ACOPERIREA.
  function nuStare() { return { valoare: null, stare: "nu-se-poate", prag: null, acoperire: null }; }

  // nr(null) da 0 (Number(null)===0), nu null - un camp explicit LIPSA (null,
  // undefined, sir gol) trebuie prins INAINTE de nr(), altfel o garda scrisa
  // ca sa prinda lipsa nu se declanseaza NICIODATA pe o lipsa reala. Masurat:
  // profitNet=null pe ultima intrare dadea netPeZi=0 "dovedit" in loc de
  // nu-se-poate; perechi="" pe prima intrare fabrica o rata din nimic.
  function lipsa(v) { return v === null || v === undefined || v === ""; }

  // Un singur loc care citeste gridul. Cand era copiat in trei locuri, variantele
  // s-au desincronizat: doua din ele n-aveau `jos > 0`, iar `nr(null)` da 0, deci
  // un `bottom` lipsa fabrica gridul [0, top] si o frecventa de 100% "dovedita".
  function citesteGrid(bot) {
    var x = (bot && bot.buOrderData) || {};
    var jos = nr(x.bottom), sus = nr(x.top);
    var bun = !lipsa(x.bottom) && !lipsa(x.top) &&
      jos !== null && sus !== null && jos > 0 && sus > jos;
    return { jos: jos, sus: sus, bun: bun };
  }

  function rataCumulativa(lista, camp, peZi) {
    if (lista.length < 2) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var pBrut = lista[0][camp], uBrut = lista[lista.length - 1][camp];
    if (lipsa(pBrut) || lipsa(uBrut)) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var p = nr(pBrut), u = nr(uBrut);
    var t0 = nr(lista[0].t), t1 = nr(lista[lista.length - 1].t);
    if (p === null || u === null || t0 === null || t1 === null) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    // Un contor care SCADE inseamna bot repornit sau schimbat - nu o rata negativa.
    if (u < p) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var ore = (t1 - t0) / 3600000;
    if (ore < 1) return { valoare: null, stare: "nu-se-poate", prag: 1 };
    var pePas = (u - p) / ore * (peZi ? 24 : 1);
    return { valoare: pePas, stare: ore >= 2 ? "dovedit" : "putin", prag: peZi ? 2 : 2 };
  }

  // `valid` decide ce intrari INTRA in numitor - o intrare fara pret nu e o
  // masuratoare "afara din interval", e o masuratoare care LIPSESTE. Daca ar
  // intra in numitor, jumatate de istoric fara pret ar injumatati tacut
  // procentul, in loc sa scada doar acoperirea (unde chiar trebuie sa se vada).
  function frecventaStare(lista, valid, potrivit, acum) {
    var observate = [];
    for (var i = 0; i < lista.length; i++) if (valid(lista[i])) observate.push(lista[i]);
    var n = observate.length;
    if (n < 30) return nuStare();
    var cate = 0;
    for (var j = 0; j < n; j++) if (potrivit(observate[j])) cate++;
    // Acoperirea: cate masuratori VALIDE avem fata de cate minute acopera
    // istoricul intreg (nu doar felia valida) - intrarile fara pret nu intra
    // in numitorul procentului, dar lipsa lor tot scade acoperirea.
    var t0 = nr(lista[0] && lista[0].t);
    var minute = t0 === null ? 0 : Math.max(1, Math.round((acum - t0) / 60000));
    var acoperire = Math.min(100, Math.round(100 * n / minute));
    return { valoare: 100 * cate / n, stare: n >= 60 ? "dovedit" : "putin",
      prag: 60, acoperire: acoperire };
  }

  function frecvente(istoric, bot, acum) {
    var lista = [];
    if (Array.isArray(istoric)) {
      for (var k = 0; k < istoric.length; k++) if (istoric[k] && nr(istoric[k].t) !== null) lista.push(istoric[k]);
    }
    var grid = citesteGrid(bot);
    var jos = grid.jos, sus = grid.sus, areGrid = grid.bun;
    var pozitia = function (h) {
      if (lipsa(h.pretPerp) || !areGrid) return null;
      var pp = nr(h.pretPerp);
      if (pp === null) return null;
      return 100 * (pp - jos) / (sus - jos);
    };
    var arePret = function (h) { return pozitia(h) !== null; };
    return {
      perechiPeOra: rataCumulativa(lista, "perechi", false),
      netPeZi: rataCumulativa(lista, "profitNet", true),
      timpInInterval: areGrid ? frecventaStare(lista, arePret, function (h) {
        var p = pozitia(h); return p !== null && p >= 0 && p <= 100;
      }, acum) : nuStare(),
      desLaMargine: areGrid ? frecventaStare(lista, arePret, function (h) {
        var p = pozitia(h); return p !== null && p >= 0 && p <= 100 && (p < 15 || p > 85);
      }, acum) : nuStare()
    };
  }

  // Graficul se construieste aici (pur), ca sa poata fi probat fara browser.
  // Regulile care-l impiedica sa minta sunt in spec; fiecare are proba ei.
  var GAURA_GRAFIC_MS = 5 * 60000;
  // gauraMs (optional): peste cat timp intre doua puncte linia se rupe. Pentru
  // istoricul pe minut e 5 min; pentru lumanari de 15 min / 1 ora trebuie mai mare,
  // altfel fiecare lumanare ar fi o "gaura".
  function geometrieGrafic(istoric, bot, acum, gauraMs) {
    var gaura = nr(gauraMs) > 0 ? nr(gauraMs) : GAURA_GRAFIC_MS;
    var gol = { destul: false, segmente: [], banda: null, lichidare: null,
      minPret: null, maxPret: null, deLa: null, panaLa: null };
    var puncte = [];
    if (Array.isArray(istoric)) {
      for (var i = 0; i < istoric.length; i++) {
        var h = istoric[i]; if (!h) continue;
        var t = nr(h.t), p = nr(h.pretPerp);
        // Un pretPerp lipsa e null, si nr(null) da 0 - un 0 ar trage scara la zero.
        if (t === null || p === null || !(p > 0)) continue;
        puncte.push({ t: t, p: p });
      }
    }
    if (puncte.length < 10) return gol;
    puncte.sort(function (a, b) { return a.t - b.t; });

    var x = (bot && bot.buOrderData) || {};
    var grid = citesteGrid(bot);
    var jos = grid.jos, sus = grid.sus, areGrid = grid.bun;
    var lich = nr(x.estimateLiquidationPriceDown);

    var minP = puncte[0].p, maxP = puncte[0].p;
    for (var j = 1; j < puncte.length; j++) {
      if (puncte[j].p < minP) minP = puncte[j].p;
      if (puncte[j].p > maxP) maxP = puncte[j].p;
    }
    // Scara cuprinde MEREU banda gridului: altfel un pret fugit departe ar turti
    // banda intr-o dunga si ar parea ca pretul e lipit de ea.
    if (areGrid) { if (jos < minP) minP = jos; if (sus > maxP) maxP = sus; }
    // Linia de lichidare e cel mai periculos lucru de pe grafic. Cand e aproape,
    // scara se intinde ca s-o cuprinda - a o ascunde tocmai cand conteaza ar fi
    // exact boala pe care ecranul asta o vaneaza. Cand e departe, nu se deseneaza:
    // distanta pana la lichidare se vede oricum ca cifra, in masuri.
    if (areGrid && lich !== null && lich > 0) {
      var latimeBanda = sus - jos;
      if (lich >= jos - latimeBanda && lich < minP) minP = lich;
      if (lich <= sus + latimeBanda && lich > maxP) maxP = lich;
    }
    var marja = (maxP - minP) * 0.02 || maxP * 0.01 || 1;
    minP -= marja; maxP += marja;

    var deLa = puncte[0].t, panaLa = puncte[puncte.length - 1].t;
    var lat = panaLa - deLa || 1, inalt = maxP - minP || 1;
    var nx = function (t) { return (t - deLa) / lat; };
    var ny = function (p) { return (p - minP) / inalt; };

    var segmente = [], curent = [];
    for (var k = 0; k < puncte.length; k++) {
      if (k > 0 && puncte[k].t - puncte[k - 1].t > gaura) {
        if (curent.length) segmente.push(curent);
        curent = [];
      }
      curent.push({ x: nx(puncte[k].t), y: ny(puncte[k].p) });
    }
    if (curent.length) segmente.push(curent);

    return { destul: true, segmente: segmente,
      banda: areGrid ? { jos: ny(jos), sus: ny(sus) } : null,
      lichidare: (lich !== null && lich > minP && lich < maxP) ? ny(lich) : null,
      minPret: minP, maxPret: maxP, deLa: deLa, panaLa: panaLa };
  }

  var ZI = 24 * 3600000, MAXIM = 1440;
  // v77: istoricul din browser + cel strans de serverul de acasa, un punct pe
  // minut. Pe acelasi minut castiga intrarea din browser (are si pretul spot).
  function imbinaIstoric(local, server, acum) {
    var pe = {};
    [server || [], local || []].forEach(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var h = lista[i], t = h && nr(h.t);
        if (t === null || t <= 0 || acum - t > ZI || t > acum + 60000) continue;
        pe[Math.floor(t / 60000)] = h;
      }
    });
    var out = Object.keys(pe).map(function (k) { return pe[k]; });
    out.sort(function (a, b) { return nr(a.t) - nr(b.t); });
    return out.length > MAXIM ? out.slice(out.length - MAXIM) : out;
  }
  function istoricAdauga(istoric, intrare, acum) {
    var t = nr(intrare.t);
    if (!t) return istoric || [];
    var out = (istoric || []).slice();
    if (out.length === 0) {
      out.push(intrare);
      return out;
    }
    var ultim = out[out.length - 1];
    var ultimMinut = Math.floor(nr(ultim.t) / 60000);
    var acumMinut = Math.floor(t / 60000);
    if (ultimMinut === acumMinut) {
      out[out.length - 1] = intrare;
    } else if (acumMinut > ultimMinut) {
      out.push(intrare);
    }
    out = out.filter(function (x) { return acum - nr(x.t) <= ZI; });
    if (out.length > MAXIM) out = out.slice(out.length - MAXIM);
    return out;
  }

  return { simboluri: simboluri, masoara: masoara, modBot: modBot, verdict: trepte,
    istoricAdauga: istoricAdauga, alegeBot: alegeBot, explicaEroarea: explicaEroarea,
    frecvente: frecvente, geometrieGrafic: geometrieGrafic, imbinaIstoric: imbinaIstoric };
})();
if (typeof globalThis !== "undefined") globalThis.TabloBot = TabloBot;
