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
  function nr(v) { var x = Number(v); return isFinite(x) ? x : null; }
  var NECUNOSCUT = { valoare: null, stare: "nu-se-poate", prag: null };

  // Stare de cont raportata direct de Pionex (marginStatus / riskStatus).
  // Camp lipsa sau gol -> NECUNOSCUT (nu declansam, n-avem de unde sti, dar
  // nici nu-l tratam tacut ca fiind valoarea buna - vezi trepte()).
  function estareCont(bruta, asteptat) {
    if (bruta === undefined || bruta === null) return NECUNOSCUT;
    var v = String(bruta).trim().toUpperCase();
    if (!v) return NECUNOSCUT;
    return { valoare: v, stare: v === asteptat ? "bine" : "rau", prag: asteptat };
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

    var m = {
      varstaBotMin: bot && bot.createTime ? (acum - nr(bot.createTime)) / 60000 : 0,
      lumanari: inchideri.length,
      istoricMin: istoric.length ? (acum - nr(istoric[0].t)) / 60000 : 0,
      pretPerp: pretPerp,
      pretSpot: pretSpot,
      eficienta: { valoare: ef.valoare, semn: ef.semn, prag: { trend: 0.60, zigzag: 0.30 },
                   stare: ef.valoare === null ? "nu-se-poate" : ef.valoare > 0.60 ? "trend" : ef.valoare < 0.30 ? "zigzag" : "bine" },
      pozitieInterval: NECUNOSCUT, ritmPerechi: NECUNOSCUT, amplitudine: NECUNOSCUT,
      lichidare: NECUNOSCUT, comision: NECUNOSCUT,
      basis: NECUNOSCUT, directieBot: 0,
      marginStatus: NECUNOSCUT, riskStatus: NECUNOSCUT,
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
    if (!x) return m;

    var tr = String(x.trend || "").trim().toLowerCase();
    m.directieBot = tr === "long" ? 1 : tr === "short" ? -1 : 0;

    // Stare raportata direct de Pionex - bate orice calcul local (Task 1 al
    // revizei finale: marginStatus/riskStatus nu erau citite niciodata).
    m.marginStatus = estareCont(x.marginStatus, "NORMAL");
    m.riskStatus = estareCont(x.riskStatus, "TRADING");

    var jos = nr(x.bottom), sus = nr(x.top);
    if (jos !== null && sus !== null && sus > jos && pretPerp !== null) {
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

    // Long: lichidarea e JOS (estimateLiquidationPriceDown). Short: lichidarea
    // e SUS (estimateLiquidationPriceUp) - Task 5 aduce directia short, iar
    // fara ramura asta masura ar da tacut un numar gresit pentru acei boti.
    // Distanta poate iesi zero sau negativa cand pretul a trecut deja de prag
    // - si asta e cazul cel mai periculos, nu are voie sa tacem la el.
    var lichJos = nr(x.estimateLiquidationPriceDown);
    var lichSus = nr(x.estimateLiquidationPriceUp);
    if (pretPerp !== null && pretPerp > 0 && lichJos !== null && lichJos > 0) {
      var d = 100 * (pretPerp - lichJos) / pretPerp;
      m.lichidare = { valoare: d, prag: { grav: 8, atentie: 15 },
        stare: d < 8 ? "rau" : d < 15 ? "margine" : "bine" };
    } else if (pretPerp !== null && pretPerp > 0 && lichSus !== null && lichSus > 0) {
      var d = 100 * (lichSus - pretPerp) / pretPerp;
      m.lichidare = { valoare: d, prag: { grav: 8, atentie: 15 },
        stare: d < 8 ? "rau" : d < 15 ? "margine" : "bine" };
    }

    var brut = nr(x.gridProfit), taxe = nr(x.totalFee);
    if (brut !== null && taxe !== null) {
      if (brut > 0) {
        var r = Math.abs(taxe) / brut;
        m.comision = { valoare: r, prag: 0.50, stare: r > 0.50 ? "rau" : "bine" };
      } else if (Math.abs(taxe) > 0) {
        // Taxe care curg fara profit brut (zero sau negativ) e cazul cel mai
        // rau, nu unul nemasurabil - la un ban profit ratul striga, la zero
        // tacea. Nu exista un raport sanatos de aratat (impartire la zero sau
        // negativ), dar starea nu are voie sa taca pe "nu-se-poate".
        m.comision = { valoare: null, prag: 0.50, stare: "rau" };
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
    if (acum0 && acum1 && acum7) {
      var ultima = nr(acum0.perechi) - nr(acum1.perechi);
      var baza = (nr(acum1.perechi) - nr(acum7.perechi)) / 6;
      // Contor resetat: daca ultima sau baza-ul sunt negative, schimbul de bot s-a intamplat.
      // Nu avem baza de comparatie, asa ca nu raportam ca "rau".
      if (ultima < 0 || baza < 0) {
        // Contor resetat, nu suprascriem ritmPerechi - ramane NECUNOSCUT
      } else {
        m.ritmPerechi = { valoare: ultima, baza: baza, prag: 0.40,
          stare: baza > 0 && ultima / baza < 0.40 ? "rau" : "bine" };
      }
    }
    return m;
  }

  function trepte(m, mod, optiuni) {
    var o = optiuni || {}, d = function (masura, valoare, prag) {
      return { masura: masura, valoare: valoare, prag: prag };
    };
    if (o.faraBot) return { nivel: "FARA_BOT",
      titlu: "Niciun bot pornit",
      ceFac: "Urmăresc simbolul ales de tine. Cifrele care țin de grid nu se pot socoti.",
      declansator: null };

    // Fiecare motiv al lui NEDOVEDIT isi spune singur cauza - nu toate pe varsta.
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

    var directie = m.eficienta.semn;
    if (mod === "DIRECTIONAL") {
      if (m.eficienta.stare === "trend" && m.directieBot && directie && directie !== m.directieBot) {
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
          if (inFavoare) return { nivel: "OPORTUNITATE", titlu: "A trecut de interval în favoarea ta",
            ceFac: "Cântărește dacă iei profitul sau muți grid-ul după el.",
            declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
          return { nivel: "PAZESTE", titlu: "A ieșit din interval împotriva ta",
            ceFac: "Poziția merge în sens invers.",
            declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
        }
        return { nivel: "PAZESTE", titlu: "Prețul a ieșit din interval",
          ceFac: "Nu mai câștigi din oscilație, ții doar o poziție pe direcție.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesit) };
      }
    } else {
      if (m.pozitieInterval.stare === "afara") {
        var pragIesitGrid = m.pozitieInterval.valoare > 100 ? 100 : 0;
        return { nivel: "PAZESTE", titlu: "Prețul a ieșit din interval",
          ceFac: "Nu mai câștigi din oscilație, ții doar o poziție pe direcție.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, pragIesitGrid) };
      }
      if (m.eficienta.stare === "trend" && m.pozitieInterval.stare === "margine") {
        return { nivel: "PAZESTE", titlu: "Trend, cu prețul la margine",
          ceFac: "Grid-ul e pe cale să rămână în urmă.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
    }

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
        declansator: d("comision", m.comision.valoare, 0.50) };
    }
    if (mod !== "DIRECTIONAL" && m.ritmPerechi.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Ritmul a căzut",
        ceFac: m.ritmPerechi.valoare + " perechi în ultima oră, față de " + Math.round(m.ritmPerechi.baza) + " obișnuit.",
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
    var brut = (mesaj == null || mesaj === "") ? "Eroare necunoscută." : String(mesaj);
    // nr(null) intoarce 0 (Number(null) === 0), nu null - aceeasi capcana care a
    // fabricat basis -100% la pretPerpViu. Un status e valid doar daca e POZITIV.
    var stBrut = nr(status), st = (stBrut !== null && stBrut > 0) ? stBrut : null;
    var eAuth = st === 401 || st === 403 || /AUTH/i.test(brut);
    var eRitm = st === 429 || /RATE|429/i.test(brut);

    if (eAuth && !local) {
      return { local: local, titlu: "Boții se văd doar de pe calculatorul tău",
        ceFac: "Ești pe versiunea publicată, care nu are cheile tale - și nici nu " +
          "i-ar folosi: Pionex refuză cererile venite de la Cloudflare. Ca să-ți " +
          "vezi boții, pornește aplicația acasă cu PORNESTE-CRYPTO-RADAR.bat și " +
          "deschide adresa pe care ți-o scrie el." };
    }
    if (eAuth && local) {
      return { local: local, titlu: "Cheile Pionex nu sunt puse",
        ceFac: "Aplicația rulează, dar nu are cu ce să se legitimeze la Pionex. " +
          "Închide fereastra neagră și pornește din nou cu PORNESTE-CRYPTO-RADAR.bat - " +
          "îți cere cele trei chei o dată, la pornire." };
    }
    if (eRitm && !local) {
      return { local: local, titlu: "Pionex refuză cererile de aici",
        ceFac: "Nu e vina ta și nu trece cu așteptarea: măsurat, refuzul vine cu " +
          "găleata de jetoane PLINĂ, deci e refuz de adresă, nu limitare de ritm. " +
          "De acasă, prin PORNESTE-CRYPTO-RADAR.bat, merge." };
    }
    if (eRitm && local) {
      return { local: local, titlu: "Prea multe cereri către Pionex",
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

  var ZI = 24 * 3600000, MAXIM = 1440;
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
    istoricAdauga: istoricAdauga, alegeBot: alegeBot, explicaEroarea: explicaEroarea };
})();
if (typeof globalThis !== "undefined") globalThis.TabloBot = TabloBot;
