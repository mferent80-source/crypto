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

  // Kaufman: cat din miscarea totala a fost intr-o singura directie.
  // 0 = zigzag curat, 1 = trend curat.
  function eficienta(inchideri) {
    if (!inchideri || inchideri.length < 2) return { valoare: null, semn: 0 };
    var net = inchideri[inchideri.length - 1] - inchideri[0], drum = 0;
    for (var i = 1; i < inchideri.length; i++) drum += Math.abs(inchideri[i] - inchideri[i - 1]);
    if (!drum) return { valoare: 0, semn: 0 };
    return { valoare: Math.abs(net) / drum, semn: net > 0 ? 1 : net < 0 ? -1 : 0 };
  }

  function amplitudineMedie(lumanari, n) {
    if (!lumanari || lumanari.length < 2) return null;
    var felie = lumanari.slice(-n - 1), s = 0, c = 0;
    for (var i = 1; i < felie.length; i++) {
      s += Math.abs(nr(felie[i].close) - nr(felie[i - 1].close)); c++;
    }
    return c ? s / c : null;
  }

  function masoara(intrari) {
    var bot = intrari.bot, x = (bot && bot.buOrderData) || null;
    var lumanari = intrari.klinePerp || [];
    var inchideri = lumanari.map(function (k) { return nr(k.close); }).filter(function (v) { return v !== null; });
    var pretPerp = inchideri.length ? inchideri[inchideri.length - 1] : null;
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
      basis: NECUNOSCUT,
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

    var jos = nr(x.bottom), sus = nr(x.top);
    if (jos !== null && sus !== null && sus > jos && pretPerp !== null) {
      var p = 100 * (pretPerp - jos) / (sus - jos);
      m.pozitieInterval = {
        valoare: p, prag: { margine: 15, afara: 0 },
        stare: p < 0 || p > 100 ? "afara" : (p < 15 || p > 85) ? "margine" : "bine",
      };
      var linii = nr(x.row);
      if (linii && linii > 0) {
        var treapta = (sus - jos) / linii, amp = amplitudineMedie(lumanari, 14);
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
    if (brut !== null && taxe !== null && brut > 0) {
      var r = Math.abs(taxe) / brut;
      m.comision = { valoare: r, prag: 0.50, stare: r > 0.50 ? "rau" : "bine" };
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
      ceFac: "Urmaresc simbolul ales de tine. Cifrele care tin de grid nu se pot socoti.",
      declansator: null };

    if (m.varstaBotMin < 120 || m.lumanari < 48 || m.istoricMin < 30) {
      return { nivel: "NEDOVEDIT",
        titlu: "Nu stiu inca",
        ceFac: "Botul are " + Math.round(m.varstaBotMin) + " de minute. Ritmul are nevoie de vreo 2 ore ca sa insemne ceva.",
        declansator: d("varstaBot", Math.round(m.varstaBotMin), 120) };
    }

    if (m.lichidare.valoare !== null && m.lichidare.valoare < 8) {
      return { nivel: "OPRESTE", titlu: "Iesi",
        ceFac: "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% pana la lichidare.",
        declansator: d("lichidare", m.lichidare.valoare, 8) };
    }

    var directie = m.eficienta.semn;
    if (mod === "DIRECTIONAL") {
      if (m.eficienta.stare === "trend" && m.directieBot && directie && directie !== m.directieBot) {
        return { nivel: "PAZESTE", titlu: "Trendul s-a intors impotriva ta",
          ceFac: "Miscarea e hotarata, dar in sens invers pozitiei tale.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
      if (m.pozitieInterval.stare === "afara") {
        var inFavoare = (m.pozitieInterval.valoare > 100 && m.directieBot === 1)
          || (m.pozitieInterval.valoare < 0 && m.directieBot === -1);
        if (inFavoare) return { nivel: "OPORTUNITATE", titlu: "A trecut de interval in favoarea ta",
          ceFac: "Cantareste daca iei profitul sau muti grid-ul dupa el.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 100) };
        return { nivel: "PAZESTE", titlu: "A iesit din interval impotriva ta",
          ceFac: "Pozitia merge in sens invers.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 0) };
      }
    } else {
      if (m.pozitieInterval.stare === "afara") {
        return { nivel: "PAZESTE", titlu: "Pretul a iesit din interval",
          ceFac: "Nu mai castigi din oscilatie, tii doar o pozitie pe directie.",
          declansator: d("pozitieInterval", m.pozitieInterval.valoare, 100) };
      }
      if (m.eficienta.stare === "trend" && m.pozitieInterval.stare === "margine") {
        return { nivel: "PAZESTE", titlu: "Trend, cu pretul la margine",
          ceFac: "Grid-ul e pe cale sa ramana in urma.",
          declansator: d("eficienta", m.eficienta.valoare, 0.60) };
      }
    }

    if (m.lichidare.valoare !== null && m.lichidare.valoare < 15) {
      return { nivel: "PAZESTE", titlu: "Lichidarea e aproape",
        ceFac: "Mai sunt " + m.lichidare.valoare.toFixed(1) + "% pana acolo.",
        declansator: d("lichidare", m.lichidare.valoare, 15) };
    }

    if (mod === "DIRECTIONAL" && m.eficienta.stare === "zigzag") {
      return { nivel: "REGLEAZA", titlu: "Piata nu merge nicaieri",
        ceFac: "Platesti comisioane intr-un interval, desi pariezi pe directie.",
        declansator: d("eficienta", m.eficienta.valoare, 0.30) };
    }
    if (m.amplitudine.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Oscilatia a scazut sub o treapta",
        ceFac: "Botul nu mai prinde perechi, dar comisioanele curg.",
        declansator: d("amplitudine", m.amplitudine.valoare, 1.0) };
    }
    if (m.comision.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Comisioanele mananca gridul",
        ceFac: "Peste jumatate din castigul brut se duce pe taxe.",
        declansator: d("comision", m.comision.valoare, 0.50) };
    }
    if (mod !== "DIRECTIONAL" && m.ritmPerechi.stare === "rau") {
      return { nivel: "REGLEAZA", titlu: "Ritmul a cazut",
        ceFac: m.ritmPerechi.valoare + " perechi in ultima ora, fata de " + Math.round(m.ritmPerechi.baza) + " obisnuit.",
        declansator: d("ritmPerechi", m.ritmPerechi.valoare, m.ritmPerechi.baza * 0.40) };
    }
    if (mod !== "DIRECTIONAL" && m.pozitieInterval.stare === "margine") {
      return { nivel: "REGLEAZA", titlu: "Stai lipit de o margine",
        ceFac: "Cantareste mutarea intervalului.",
        declansator: d("pozitieInterval", m.pozitieInterval.valoare, 85) };
    }
    if (m.basis.stare === "rau") {
      return { nivel: "OPORTUNITATE", titlu: "Perpetua s-a rupt de spot",
        ceFac: "Diferenta e " + m.basis.valoare.toFixed(2) + "%.",
        declansator: d("basis", m.basis.valoare, m.basis.prag) };
    }
    return { nivel: "LINISTE", titlu: "Merge",
      ceFac: "Esti la " + Math.round(m.pozitieInterval.valoare) + "% din interval.",
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

  return { simboluri: simboluri, masoara: masoara, modBot: modBot, verdict: trepte };
})();
if (typeof globalThis !== "undefined") globalThis.TabloBot = TabloBot;
