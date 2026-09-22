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
      m.ritmPerechi = { valoare: ultima, baza: baza, prag: 0.40,
        stare: baza > 0 && ultima / baza < 0.40 ? "rau" : "bine" };
    }
    return m;
  }

  return { simboluri: simboluri, masoara: masoara };
})();
if (typeof globalThis !== "undefined") globalThis.TabloBot = TabloBot;
