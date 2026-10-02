// "Ce ti-as spune eu" - sfaturile unui prieten, din cifrele botului. Modul pur,
// probat in scripts/scenariu-v77.mjs. Nu decide nimic si nu trimite nimic.
// v80.1 (cerut de el, 24.09): fara opritor si fara "USDT liberi"; in loc: trend, regim,
// ritm, costuri, setare, punctul de zero. Si fiecare sfat are "faCe" = ce as face eu,
// spus pe fata ("decizia e mereu la mine, asa ca ia initiativa").
//
// Regula de onestitate: orice "cat de probabil" e o FRECVENTA din trecutul
// monedei, cu numarul de cazuri; niciun sfat nu promite o directie viitoare.
// v100.62 (specul „sfaturi concise”, pachetul 2): titlu = faptul + cifra (≤ 60) · text = de ce, o fraza (≤ 160) · faCe = o actiune
// la persoana I (≤ 110) · sursa = de unde vin cifrele (inainte „deCe”). Avertizarile comune stau o data, in legenda Consilierului.
var Sfaturi = (function () {
  "use strict";
  var RANG = { critic: 0, atentie: 1, info: 2, bine: 3 };
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // v100.62: cifrele prin TextRo (virgula, minusul „−”); preturile raman cu zecimalele lor
  function usdt(v) { return v === null || v === undefined ? "—" : TextRo.usdt(v); }
  function pret(v) { if (v === null || v === undefined) return "—"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : 4); }
  function proc(v, z) { return TextRo.pctSemn(v, z == null ? 1 : z); }
  function mare(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function frecventa(s, ce) {
    if (!s || s.valoare === null || s.valoare === undefined) return null;
    return Math.round(s.valoare) + "% " + ce + " (" + s.atinse + " din " + s.cazuri + (s.stare === "dovedit" ? "" : ", puține cazuri") + ")";
  }

  // intrare: { bot, scen (Scenariu.scenarii), sanse: {josZi, josSapt, lichSapt}, rezumat (Directie.rezumat),
  //            directii (rez), funding (rata pe 8h, fractie), fisa (GridProba.fisa pe moneda botului),
  //            costuri (TabloExtra.grileVsCosturi), zero (TabloExtra.dacaInchizi), geom (TabloExtra.geometrieBot),
  //            ritm: {grile24h, medieZi, tranz24h, tranzMedieZi, zile} }
  function sfaturi(x) {
    var out = [], b = x.bot || {};
    var nume = String(b.baza || "botul").replace(/\.PERP$/, "");
    var dist = nr(b.distantaLichidarePct), tot = nr(b.profitTotal), inv = nr(b.investit);
    var jos = nr(b.gridJos), p = nr(b.pretCurent), pl = nr(b.pretLichidare);
    var scen = x.scen && x.scen.ok ? x.scen : null;
    var laJos = scen ? scen.randuri.filter(function (r) { return r.eticheta === "jos"; })[0] : null;

    // 1) Pericolul imediat, cu regulile alertelor (aceleasi ca pe telefon).
    if (typeof Alerte !== "undefined") {
      var r = Alerte.reguli(b, x.fata4h ? { fata4h: x.fata4h, dir4h: x.dir4h } : null);
      ["lich", "status", "grid", "activ"].forEach(function (k) {
        var a = r[k]; if (!a || a.nivel === "ok") return;
        // v100.62: aceleasi actiuni ca semaforul (o singura voce); titlul si textul vin din regulile alertelor (pachetul 3)
        var fc = k === "lich" ? (a.nivel === "critic" ? "Aș adăuga marjă sau aș închide botul acum." : "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.")
          : k === "grid" ? "Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum." : null;
        out.push({ cod: "pericol", tip: k, ton: a.nivel, titlu: a.titlu.replace(nume + ": ", ""), text: a.mesaj, faCe: fc });
      });
    }

    // 3) Cat de des a ajuns pretul, in trecut, pana la marginea de jos.
    if (laJos && p !== null && jos !== null && p > jos) {
      var fz = frecventa(x.sanse && x.sanse.josZi, "din zile"), fs = frecventa(x.sanse && x.sanse.josSapt, "din săptămâni");
      var dz = x.sanse && x.sanse.josZi && x.sanse.josZi.valoare, ton = dz === null || dz === undefined ? "info" : dz >= 20 ? "atentie" : "info";
      // v100.62: titlul cu cifra intai (asa il rescria Consilierul); textul = o fraza - ce ar fi la margine si cat de des coboara atat
      out.push({ cod: "margine", ton: ton, titlu: TextRo.pct(Math.abs(100 * (jos - p) / p)) + " până la marginea de jos (" + pret(jos) + ")",
        text: "~" + Math.round(laJos.pozitie) + " " + nume + " la margine (acum " + Math.round(scen.grid.poz) + "), total ~" + usdt(laJos.total) + "; " +
          (fz || fs ? "coboară atât în " + [fz, fs].filter(Boolean).join(" și ") + "." : "n-am destul istoric pentru cât de des coboară atât."),
        sursa: "Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere.",
        faCe: ton === "atentie" ? "N-aș mări levierul și n-aș pune bani în plus în botul ăsta." : null });
    }

    var fisa = x.fisa || null, dirBot = String(b.directie || "").toLowerCase(), P = function (v) { return TextRo.pct(v * 100, 2); };
    var X = function (v) { return TextRo.ori(v); };

    // A) Trendul fata de bot (4h + 1z, cu taria) - stare masurata, nu prognoza.
    var d = fisa && fisa.directie;
    if (d && d.dir && d.tarie !== "fara-date" && (dirBot === "long" || dirBot === "short")) {
      var contra = (dirBot === "long" && d.dir === "short") || (dirBot === "short" && d.dir === "long");
      var cu = d.dir === dirBot;
      out.push({ cod: "trend", ton: contra ? "atentie" : cu ? "bine" : "info",
        titlu: contra ? "Trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")" : cu ? "Trendul e cu botul (" + d.dir + ", " + d.tarie + ")" : "Trendul e lateral, botul e " + dirBot,
        // v100.62: textul = masuratoarea; ce face gridul contra trendului si „nu spune încotro merge” stau in legenda Consilierului
        text: d.motive && d.motive.length ? d.motive.join(" · ") + "." : "",
        sursa: "EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise.",
        faCe: contra ? "N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend."
          : cu ? "L-aș lăsa să lucreze." : "L-aș lăsa să facă perechi: lateral e bine pentru un grid." });
    }

    // B) Regimul acum: miscare mare vs liniste (cu frecventa "cat mai tine").
    var rg = fisa && fisa.regim;
    var cuB = rg && rg.miscare && rg.sens && (dirBot === "long" || dirBot === "short") && (dirBot === "long") === (rg.sens === "urca");
    if (cuB && rg.r4h != null && rg.r24h != null) {
      out.push({ cod: "miscare-cu", ton: "bine", titlu: "Mișcare cu botul: " + X(rg.r4h) + " obișnuitul (4 h), " + X(rg.r24h) + " (24 h)",
        text: "Prețul merge în direcția botului: grilele " + (dirBot === "long" ? "de sus" : "de jos") + " încasează pe drum și poziția scade.",
        sursa: "Pe 40 de monede (27.09), după o mișcare cu botul, 59% din ferestre au ieșit pe plus (contra 50%, în liniște 56%).",
        faCe: "L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea " + (dirBot === "long" ? "de sus" : "de jos") + "." });
    } else if (rg && rg.r4h != null && rg.r24h != null && rg.miscare) {
      out.push({ cod: "miscare", ton: "atentie", titlu: "Mișcare " + (rg.sens && (dirBot === "long" || dirBot === "short") ? "contra botului" : "mare") + ": " + X(rg.r4h) + " obișnuitul (4 h), " + X(rg.r24h) + " (24 h)",
        text: "În mișcare gridul nu face perechi, doar strânge poziție pe direcția prețului; le reia când se liniștește.",
        sursa: "„Obișnuitul” = percentila 75 a mișcărilor monedei pe 30 de zile.",
        faCe: "N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%." });
    }
    var L = fisa && fisa.liniste;
    if (L && L.linisteAcum && L.suficient && L.p != null) {
      var rar = L.p < 0.35;
      out.push({ cod: "liniste", ton: rar ? "info" : "bine", titlu: "Liniște de " + TextRo.num(L.zileLiniste, 1) + " zile",
        text: "Pe moneda asta, liniștea care a ajuns aici a mai ținut " + L.H + " zile în " + Math.round(L.p * 100) + "% din cazuri (" + L.k + " din " + L.n + ").",
        sursa: "Ultimele 30 de zile; interval de încredere " + TextRo.pct(L.ic[0] * 100, 0) + "–" + TextRo.pct(L.ic[1] * 100, 0) + ".",
        faCe: rar ? "N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare." : "L-aș lăsa să lucreze: liniștea tinde să țină aici." });
    }

    // C) Schimbare de ritm: grile si tranzactii in 24 h fata de media botului pe zi.
    var rt = x.ritm;
    if (rt && rt.zile >= 1 && rt.medieZi > 0 && rt.grile24h != null) {
      var raport = rt.grile24h / rt.medieZi;
      if (raport <= 0.5 || raport >= 2) {
        var sc = raport <= 0.5;
        out.push({ cod: "ritm", ton: sc ? "atentie" : "info",
          titlu: "Ritmul a " + (sc ? "scăzut" : "crescut") + ": grilele " + TextRo.num(rt.grile24h, 2) + " USDT în 24 h, media " + TextRo.num(rt.medieZi, 2) + "/zi",
          text: mare((rt.tranz24h != null && rt.tranzMedieZi > 0 ? rt.tranz24h + " tranzacții în 24 h față de " + Math.round(rt.tranzMedieZi) + " pe zi: " : "") +
            (sc ? "de obicei prețul a ieșit din zona perechilor sau piața a înghețat." : "piața se mișcă mai mult, bine pentru grile cât prețul stă în interval.")),
          faCe: sc ? "Aș închide botul și aș porni din fișă unul la prețul de acum, dacă ritmul rămâne jos încă o zi." : "Aș verifica lichidarea: ritmul mare vine des cu mișcare mare." });
      }
    }

    // D) Costurile pe zi fata de ce aduc grilele.
    var co = x.costuri;
    if (co && co.netZi != null && (co.fundingMananca || co.netZi < 0)) {
      out.push({ cod: "costuri", ton: "atentie", titlu: "Costurile mănâncă grilele: " + TextRo.usdt(co.netZi, Math.abs(co.netZi) < 0.01 ? 3 : 2) + " pe zi, net",
        text: "Grilele aduc " + (co.grile24h != null ? TextRo.num(co.grile24h, 2) : "—") + " USDT în 24 h; comisioanele iau " + (co.comisionZi != null ? TextRo.num(co.comisionZi, 2) : "—") + " și funding-ul " + (co.fundingZi != null ? TextRo.num(co.fundingZi, 2) : "—") + " pe zi.",
        faCe: co.fundingMananca ? "Aș lua levier mai mic sau direcția care încasează funding-ul, la următorul bot." : "Aș rări grilele (pas mai mare) ca să rămână mai mult după comision." });
    }

    // E) Setarea botului fata de fisa de azi.
    var g = x.geom, lev = nr(b.levier), sig = fisa && fisa.setare && nr(fisa.setare.levierSigur);
    var probleme = [];
    var dese = !!(g && g.preaDese), levMare = lev !== null && sig > 0 && lev > sig;
    if (dese) probleme.push("grilele (" + g.grile + ", " + (g.mod === "geometric" ? "geometrice" : "aritmetice") + ") lasă " + P(g.netPct) + " pe umplere după comision");
    if (levMare) probleme.push("levierul " + lev + "× e peste cel sigur azi (" + sig + "×)");
    // v100.62: titlul spune CE e gresit, cifrele stau in text
    if (probleme.length) out.push({ cod: "setare", ton: "info", titlu: "Setarea botului: " + (dese && levMare ? "grile prea dese și levier prea mare" : dese ? "grile prea dese" : "levier prea mare"),
      text: mare(probleme.join("; ")) + ".",
      faCe: "N-aș închide botul pentru asta; la următorul aș lua grile geometrice și levierul din fișă" + (sig > 0 ? " (cel mult " + sig + "×)" : "") + "." });

    // F) Punctul de zero.
    var z = x.zero;
    if (z && z.pretZero != null && z.distantaZeroPct != null && tot !== null && tot < 0) {
      out.push({ cod: "zero", ton: "info", titlu: "Botul iese pe zero la " + pret(z.pretZero) + " (" + proc(100 * z.distantaZeroPct) + " de aici)",
        text: "Închis acum, ai lua " + (z.iei != null ? TextRo.num(z.iei, 2) + " USDT" : "—") + (inv ? " din " + TextRo.num(inv, 2) + " investiți" : "") + ".",
        // v100.40 (audit 30.09): pe minus, prețul de zero e DINCOLO de pretul de acum (deasupra la long, dedesubt la short) -> e un
        // TAKE-PROFIT; un stop pus acolo s-ar executa pe loc (contrar cartelei „Stopul” de pe acelasi ecran)
        faCe: "Aș pune take-profit-ul botului la " + pret(z.pretZero) + " ca să ies fără pierdere (nu stop: zero-ul e " + (z.distantaZeroPct > 0 ? "deasupra prețului" : "sub preț") + ")." });
    }

    // 5) Directia fata de bot, spusa ca stare masurata.
    if (x.rezumat && x.rezumat.ton && x.rezumat.ton !== "nu-se-poate") {
      out.push({ cod: "directie", ton: x.rezumat.ton === "rau" ? "atentie" : x.rezumat.ton === "bine" ? "bine" : "info",
        titlu: x.rezumat.ton === "rau" ? "Piața merge împotriva botului" : x.rezumat.ton === "bine" ? "Piața nu lucrează împotriva botului" : "Piața dă semnale amestecate",
        // v100.62: textul = dovezile (concluzia e in titlu); ce face gridul contra pietei si „bare închise, nu prognoză” stau in legenda Consilierului
        text: x.rezumat.dovezi || x.rezumat.text,
        faCe: x.rezumat.ton === "rau" ? "N-aș adăuga bani până nu se întoarce pe 4 h." : null });
    }

    // 6) Finantarea (rata Binance, orientativa - Pionex nu o publica).
    var f = nr(x.funding);
    if (f !== null && Math.abs(f) >= 0.0001) {
      var platesti = (b.directie === "long" && f > 0) || (b.directie === "short" && f < 0);
      out.push({ cod: "funding", ton: platesti && Math.abs(f) >= 0.0005 ? "atentie" : "info",
        titlu: "Funding-ul: " + TextRo.pct(f * 100, 3) + " la 8 ore, " + (platesti ? "îl plătești" : "îl încasezi"),
        text: mare((nr(b.finantare) === null ? "" : "până acum botul a " + (nr(b.finantare) < 0 ? "plătit " : "primit ") + TextRo.num(Math.abs(nr(b.finantare)), 2) + " USDT; ") +
          (platesti ? "la rata asta plătești din câștigul grilelor." : "la rata asta încasezi peste câștigul grilelor.")),
        sursa: "Rata e de la Binance, pentru orientare; Pionex poate avea alta.",
        faCe: platesti && Math.abs(f) >= 0.0005 ? "N-aș ține botul mult pe direcția asta cu funding-ul atât de mare." : null });
    }

    // 7) Cand nu e nimic de facut, se spune si asta.
    if (!out.some(function (s) { return s.ton === "critic" || s.ton === "atentie"; })) {
      out.push({ cod: "nimic", ton: "bine", titlu: "Nimic urgent", text: tot !== null ? "Totalul botului e " + usdt(tot) + "." : "", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară." });
    }
    out.sort(function (a, c) { return RANG[a.ton] - RANG[c.ton]; });
    return out;
  }
  // revizia 01.10 (I2, o singura voce): intrarile sfaturilor, ACELEASI pe Tablou si in colector - scenariul la marginea de jos, cat de
  // des a ajuns pretul acolo (lumanarile de 4 h), ritmul botului, costurile, punctul de zero, geometria. Cer Scenariu si TabloExtra.
  // o = { bot, k4 (lumanarile de 4 h), fata4h, dir4h, funding (rata Binance), fisa, rezumat (directia pe mai multe intervale - doar Tabloul), acum }
  function intrare(o) {
    o = o || {}; var b = o.bot || {}, acum = nr(o.acum) || Date.now(), jos = nr(b.gridJos), p = nr(b.pretCurent);
    var S = typeof Scenariu !== "undefined" ? Scenariu : null, TE = typeof TabloExtra !== "undefined" ? TabloExtra : null;
    var scen = S ? S.scenarii(b.brut || null, b, [{ eticheta: "jos", pret: jos }]) : null;
    var sanse = S && o.k4 && p !== null && jos !== null ? { josZi: S.sansaAtingere(o.k4, p, jos, 6), josSapt: S.sansaAtingere(o.k4, p, jos, 42) } : {};
    var bu = b.brut && b.brut.buOrderData || {}, zile = nr(b.pornitLa) ? (acum - nr(b.pornitLa)) / 86400000 : null;
    var ritm = { grile24h: nr(bu.gridProfit24h), medieZi: zile && nr(b.gridProfitBrut) != null ? nr(b.gridProfitBrut) / zile : null, tranz24h: nr(bu.trx24h),
      tranzMedieZi: zile && nr(bu.closedExchangeOrderCount) != null ? nr(bu.closedExchangeOrderCount) / zile : null, zile: zile };
    return { bot: b, scen: scen, sanse: sanse, rezumat: o.rezumat || null, funding: o.funding, fata4h: o.fata4h || null, dir4h: o.dir4h, fisa: o.fisa || null,
      costuri: TE ? TE.grileVsCosturi(b, acum) : null, zero: TE ? TE.dacaInchizi(b) : null, geom: TE ? TE.geometrieBot(b) : null, ritm: ritm };
  }
  return { sfaturi: sfaturi, intrare: intrare };
})();
if (typeof globalThis !== "undefined") globalThis.Sfaturi = Sfaturi;
