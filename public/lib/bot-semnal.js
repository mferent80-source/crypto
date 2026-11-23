// v100.380 (el, 23.11.2026: „vede radarul botul meu spot?” ⇒ „da”): botul de SEMNAL (Pionex „smart_copy”: TradingView trimite intrările și ieșirile,
// Pionex le execută) - textele lui pentru Tablou, Piața azi și banda de sus, și schimbările de poziție pentru alertele colectorului.
// Modul pur: fără DOM, fără rețea, fără ceas (acum vine din afară). Câmpurile vin traduse de server (functions/api/bot-orders.js, normalizeazaSemnal):
// tip „semnal”, ruleaza, semnal, baza, investit, sumaAcum, profitTotal, levier, directie, pozitie, pozitieBani, inPozitie, runde, rundePePlus, pretPornire.
// Nu e un bot de grid: gridul, grilele, lichidarea, zero-ul și sfaturile de grid nu există aici - nu se desenează și nu se inventează.
// Probat în scripts/proba-v100380.mjs.
var BotSemnal = (function () {
  "use strict";
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  /* TextRo se ia la fiecare folosire (în colector și în probe se încarcă uneori după modul) */
  function tr() { return typeof TextRo !== "undefined" ? TextRo : null; }
  function num(x, z) { var T = tr(); if (T) return T.num(x, z); x = nr(x); return x === null ? "—" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(z == null ? 1 : z).replace(".", ","); }
  // rezultat cu o zecimală și semn după cifra rotunjită (fără „−0,0”)
  function semn1(x) { x = nr(x); if (x === null) return "—"; var r = Math.round(x * 10) / 10; return (r > 0 ? "+" : "") + num(r === 0 ? 0 : r, 1); }
  function cant(x) { var T = tr(); return T && T.cant ? T.cant(x) : num(x, 4); }
  function pret(x) { var T = tr(); x = nr(x); if (x === null) return "—"; return x >= 1000 ? num(x, 2) : x >= 1 ? num(x, 4) : (T && T.pret ? T.pret(x) : num(x, 6)); }
  function cate(n, sg, pl) { var T = tr(); return T && T.cate ? T.cate(n, sg, pl) : String(n) + "\u00a0" + pl; }
  function ore(ms) { var T = tr(); if (!(ms >= 0)) return "—"; var h = ms / 3600000; if (h < 1) return Math.max(1, Math.round(ms / 60000)) + " min"; if (h < 48) return T ? T.oreN(Math.round(h)) : Math.round(h) + " h"; return cate(Math.round(h / 24), "zi", "zile"); }   /* de la 2 zile în sus, zile întregi (regula „de”: TextRo.cate) */

  function eSemnal(b) { return !!(b && b.tip === "semnal"); }
  function moneda(b) { return String(b && b.baza || "").replace(/\.PERP$/, "") || "—"; }
  function perp(b) { return /\.PERP$/.test(String(b && b.baza || "")) || /perp/i.test(String(b && b.piata || "")); }

  // starea în cuvinte: { cod: fara | long | short | neclar | oprit, titlu, sub, ton (sus / jos / gri) }
  function stare(b) {
    if (!b) return null;
    if (b.ruleaza === false) return { cod: "oprit", titlu: "oprit", sub: "botul nu mai rulează în Pionex", ton: "gri" };
    var d = b.directie, q = nr(b.pozitie), bani = nr(b.pozitieBani);
    if (d === "long" || d === "short") {
      var cat = [q !== null ? cant(Math.abs(q)) + " " + moneda(b) : null, bani !== null ? num(bani, 1) + " USDT" : null].filter(Boolean).join(" · ");
      return { cod: d, titlu: d === "long" ? "LONG" : "SHORT", sub: cat || "cantitatea nu e citită", ton: d === "long" ? "sus" : "jos" };
    }
    if (b.pozitieNeclara || b.inPozitie) return { cod: "neclar", titlu: "neclar", sub: "Pionex dă cantitatea și banii poziției care nu se potrivesc - verifică în aplicația Pionex", ton: "gri" };
    return { cod: "fara", titlu: "fără poziție", sub: "așteaptă semnalul din TradingView", ton: "gri" };
  }
  // numele scurt: „BTC semnal 1×”
  function nume(b) { var l = nr(b && b.levier); return moneda(b) + " semnal" + (l !== null ? " " + num(l, l % 1 ? 1 : 0) + "×" : ""); }
  // banda de sus: „BTC semnal 1× · fără poziție” / „… · LONG 0,0006 BTC”
  function textBanda(b) { var s = stare(b); return s ? nume(b) + " · " + (s.cod === "long" || s.cod === "short" ? s.titlu + (nr(b.pozitie) !== null ? " " + cant(Math.abs(nr(b.pozitie))) + " " + moneda(b) : "") : s.titlu) : nume(b); }

  // Cardul din Tablou (în locul verdictului și al celor 4 cifre de grid). esc = escapeHtml al paginii. o = { acum }
  function cardHtml(b, esc, o) {
    if (!eSemnal(b)) return "";
    esc = esc || function (s) { return String(s); }; var acum = o && o.acum || 0, s = stare(b);
    var pr = nr(b.profitTotal), inv = nr(b.investit), sa = nr(b.sumaAcum), r = pr === null ? null : Math.round(pr * 10) / 10;
    var cls = function (x) { return x > 0 ? "good" : x < 0 ? "bad" : ""; };
    var cel = function (et, val, vcls, sub) { return '<div class="bsmCel"><span class="tbEt2">' + esc(et) + '</span><b class="tbKpiVal ' + (vcls || "") + '">' + esc(val) + '</b>' + (sub ? '<span class="tbSub">' + esc(sub) + '</span>' : '') + '</div>'; };
    var nR = nr(b.runde), nP = nr(b.rundePePlus), lev = nr(b.levier);
    var h = '<div class="tbBlocCap"><h4>Botul de semnal · ' + esc(moneda(b)) + '</h4><span class="tbSub">' + esc((b.semnal ? "TradingView „" + b.semnal + "”" : "TradingView") + " trimite intrările și ieșirile, Pionex le execută") + '</span></div>';
    h += '<div class="bsmCifre">'
      + cel("Poziția", s.titlu, s.ton === "sus" ? "good" : s.ton === "jos" ? "bad" : "mutedInfo", s.sub)
      + cel("Rezultat, USDT", semn1(pr), cls(r), [inv !== null ? "din " + num(inv, 1) + " puși" : null, sa !== null ? "în bot acum " + num(sa, 1) : null, b.rezultatNeverificat ? "după Pionex; cu poziția deschisă: neverificat dacă o cuprinde" : "după Pionex"].filter(Boolean).join(" · "))
      + cel("Intrări", nR === null ? "—" : String(nR), "", nR === null ? "" : nP !== null && nR > 0 ? "pe plus " + nP + " din " + nR : nR === 0 ? "nicio intrare încă" : "")
      + cel("Pornit", nr(b.pornitLa) && acum ? "acum " + ore(acum - nr(b.pornitLa)) : "—", "", [perp(b) ? moneda(b) + " perpetual" : moneda(b), lev !== null ? "levier " + num(lev, lev % 1 ? 1 : 0) + "×" : null, nr(b.pretPornire) !== null ? "prețul la pornire " + pret(b.pretPornire) : null].filter(Boolean).join(" · "))
      + '</div>';
    h += '<p class="tbSub bsmNota">Nu e un bot de grid: marginile, grilele, lichidarea și sfaturile de grid nu se aplică și nu apar aici. Prețul de intrare Pionex nu-l dă pentru botul de semnal. Intrările și ieșirile vin ca alertă pe Discord (noaptea, în rezumatul de la 08:00).</p>';
    return h;
  }
  // rândul din Piața azi („Boții tăi”): eticheta și cifra
  function randAcasa(b) { if (!eSemnal(b)) return null; var s = stare(b), pr = nr(b.profitTotal); return { et: nume(b) + " · " + s.titlu + (s.cod === "long" || s.cod === "short" ? " " + s.sub.split(" · ")[0] : ""), val: pr === null ? "—" : semn1(pr) + " USDT", cls: pr === null ? "acMut" : Math.round(pr * 10) / 10 > 0 ? "good" : Math.round(pr * 10) / 10 < 0 ? "bad" : "" }; }

  // ---------- schimbările de poziție (colectorul) ----------
  // ref = { d: directie | null, q: cantitatea, pr: rezultatul botului, p: prețul, t, n: numărul evenimentului } sau null (prima citire doar fixează)
  // ⇒ { ev: intrat | iesit | intors | marit | micsorat | null, ref: referința nouă, ant: cea veche }
  function schimbare(ref, b, acum) {
    var d = b && (b.directie === "long" || b.directie === "short") ? b.directie : null, q = nr(b && b.pozitie);
    var nou = { d: d, q: q, pr: nr(b && b.profitTotal), p: nr(b && b.pretCurent), r: nr(b && b.runde), t: acum, n: ref && ref.n || 0 };
    if (!b || b.ruleaza === false) return { ev: null, ref: ref || null, ant: ref || null };
    if (!ref) return { ev: null, ref: nou, ant: null };
    if (b.pozitieNeclara) return { ev: null, ref: ref, ant: ref };   /* revizia: poziția neclară nu dă nicio alertă și nu mută referința */
    var ev = null;
    if (!ref.d && d) ev = "intrat";
    else if (ref.d && !d && !b.inPozitie) ev = "iesit";
    else if (ref.d && d && ref.d !== d) ev = "intors";
    else if (ref.d && d && q !== null && nr(ref.q) !== null && Math.abs(q) > Math.abs(ref.q) * 1.000001) ev = "marit";
    else if (ref.d && d && q !== null && nr(ref.q) !== null && Math.abs(q) < Math.abs(ref.q) * 0.999999) ev = "micsorat";
    /* revizia (🔵): o intrare și o ieșire între două citiri - poziția arată la fel, dar rundele au crescut */
    else if (!ref.d && !d && nr(ref.r) !== null && nou.r !== null && nou.r > ref.r) ev = "runda";
    if (!ev) return { ev: null, ref: Object.assign({}, ref, { pr: nou.pr, p: nou.p, r: nou.r }), ant: ref };
    nou.n = (ref.n || 0) + 1;
    if (ev === "marit" || ev === "micsorat") { nou.pr0 = ref.pr0 != null ? ref.pr0 : ref.pr; nou.p0 = ref.p0 != null ? ref.p0 : ref.p; }
    else if (ev === "intrat" || ev === "intors") { nou.pr0 = ref.pr; nou.p0 = nou.p; }
    return { ev: ev, ref: nou, ant: ref };
  }
  // mesajul alertei: { nivel, titlu, mesaj, cheie, doarRadar } - intrarea, ieșirea și întoarcerea pleacă pe Discord; mărirea / micșorarea doar în Radar
  function mesaj(r, b) {
    if (!r || !r.ev) return null;
    /* revizia: prețul e cel de la citire, nu prețul de intrare (Pionex nu-l dă); cheia poartă ora evenimentului - după o repornire nu se repetă una veche */
    var m = moneda(b), p = nr(b.pretCurent), la = p !== null ? " · prețul acum " + pret(p) : "", s = stare(b), ant = r.ant || {}, cheie = "semnal-" + r.ev + "-" + String(b.id) + "-" + String(r.ref.t);
    var rez = nr(b.profitTotal), rezT = rez === null ? "" : "rezultatul botului: " + semn1(rez) + " USDT", pr0 = nr(ant.pr0 != null ? ant.pr0 : ant.pr);
    var pe = rez !== null && pr0 !== null ? " (pe poziția asta " + semn1(rez - pr0) + ")" : "", prov = b.semnal ? " · semnal TradingView „" + b.semnal + "”" : "";
    var D = function (d) { return d === "long" ? "LONG" : d === "short" ? "SHORT" : "?"; };
    if (r.ev === "intrat") return { nivel: "info", cheie: cheie, titlu: m + " semnal: a intrat " + D(b.directie) + la, mesaj: s.sub + (rezT ? " · " + rezT + " până acum" : "") + prov };
    if (r.ev === "iesit") return { nivel: "info", cheie: cheie, titlu: m + " semnal: a ieșit din " + D(ant.d) + la, mesaj: (rezT ? rezT + pe : "rezultatul botului necitit") + prov };
    if (r.ev === "runda") return { nivel: "info", cheie: cheie, titlu: m + " semnal: o intrare și o ieșire între două citiri", mesaj: (rezT ? rezT + (rez !== null && nr(ant.pr) !== null ? " (pe runda asta " + semn1(rez - nr(ant.pr)) + ")" : "") : "rezultatul botului necitit") + prov };
    if (r.ev === "intors") return { nivel: "info", cheie: cheie, titlu: m + " semnal: din " + D(ant.d) + " în " + D(b.directie) + la, mesaj: s.sub + (rezT ? " · " + rezT + pe : "") + prov };
    return { nivel: "info", cheie: cheie, doarRadar: true, titlu: m + " semnal: " + (r.ev === "marit" ? "a mărit " : "a micșorat ") + D(b.directie) + la, mesaj: s.sub + prov };
  }
  // botul de semnal închis (găsit printre cei închiși): mesajul de la sfârșit
  function mesajInchis(x, acum) {
    if (!x) return null; var rez = nr(x.profitTotal), inv = nr(x.investit), dur = nr(x.inchisLa) && nr(x.pornitLa) ? nr(x.inchisLa) - nr(x.pornitLa) : null, nR = nr(x.runde), nP = nr(x.rundePePlus);
    return { nivel: "info", cheie: "semnal-oprit-" + String(x.id), titlu: moneda(x) + " semnal: botul s-a oprit" + (rez !== null ? " · " + semn1(rez) + " USDT" : ""),
      mesaj: [inv !== null ? "din " + num(inv, 1) + " USDT puși" : null, dur !== null ? "a ținut " + ore(dur) : null, nR !== null ? (nR === 1 ? "o intrare" : cate(nR, "intrare", "intrări")) + (nP !== null && nR > 0 ? ", " + nP + " pe plus" : "") : null].filter(Boolean).join(" · ") };
  }
  // ce se notează pe disc la fiecare schimbare (ca semnificația câmpurilor Pionex să se poată verifica după): doar cifre și texte scurte, fără userSignals
  /* revizia (🔵): o LISTĂ de câmpuri permise (nu una de excluderi) - un câmp nou de la Pionex nu ajunge pe disc până nu e trecut aici */
  var POZA_BOT = ["quoteTotalInvestment", "quoteOriginalInvestment", "currentQuoteAmount", "quoteBaseAmount", "profit", "fundingFee", "trx24h", "roundCount24h", "status", "signalName", "market", "tradeType", "initQuotePrice", "closedSharedQuote"];
  var POZA_P = ["qtyLong", "qtyShort", "amountLong", "amountShort", "currentBaseAmount", "profit", "profitPositive", "percent", "initPrice", "maintPrice", "closedPrice", "leverage", "tradeBase", "base", "currentRound", "roundCount", "profitRoundCount", "closedQuoteAmount", "closedBaseAmount", "fundingFee", "totalFeeInQuote", "totalFeeInBase", "amountSettle", "sharedAmount", "status", "lossStopRatio", "profitStopRatio"];
  function poza(b, acum) {
    var x = b && b.brut && b.brut.buOrderData || {}, p = Array.isArray(x.portfolio) && x.portfolio[0] || {}, o = { t: acum, id: String(b && b.id || ""), pret: nr(b && b.pretCurent), bot: {}, p: {} };
    var ok = function (v) { return typeof v === "number" || v === null || (typeof v === "string" && v.length <= 40 && !/https?:|token/i.test(v)); };
    POZA_BOT.forEach(function (k) { if (k in x && ok(x[k])) o.bot[k] = x[k]; });
    POZA_P.forEach(function (k) { if (k in p && ok(p[k])) o.p[k] = p[k]; });
    return o;
  }

  return { eSemnal: eSemnal, stare: stare, nume: nume, textBanda: textBanda, cardHtml: cardHtml, randAcasa: randAcasa, schimbare: schimbare, mesaj: mesaj, mesajInchis: mesajInchis, poza: poza, semn1: semn1 };
})();
if (typeof globalThis !== "undefined") globalThis.BotSemnal = BotSemnal;
