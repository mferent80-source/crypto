// "Ce ti-as spune eu" - sfaturile unui prieten, din cifrele botului. Modul pur,
// probat in scripts/scenariu-v77.mjs. Nu decide nimic si nu trimite nimic.
// v80.1 (cerut de el, 24.09): fara opritor si fara "USDT liberi"; in loc: trend, regim,
// ritm, costuri, setare, punctul de zero. Si fiecare sfat are "faCe" = ce as face eu,
// spus pe fata ("decizia e mereu la mine, asa ca ia initiativa").
//
// Regula de onestitate: orice "cat de probabil" e o FRECVENTA din trecutul
// monedei, cu numarul de cazuri; niciun sfat nu promite o directie viitoare.
var Sfaturi = (function () {
  "use strict";
  var RANG = { critic: 0, atentie: 1, info: 2, bine: 3 };
  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function usdt(v) { return v === null ? "-" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + " USDT"; }
  function pret(v) { if (v === null || v === undefined) return "-"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : a >= 1 ? 4 : 4); }
  function proc(v, z) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(z == null ? 1 : z) + "%"; }
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
        var fc = k === "lich" ? (a.nivel === "critic" ? "Aș acționa acum, nu aș aștepta: adaug marjă din Pionex sau închid botul. Sub 8% nu mai e loc de răbdare." : "Aș urmări de aproape și n-aș mai adăuga poziție; dacă trece sub 8%, adaug marjă sau închid.")
          : k === "grid" ? "Aș lăsa o zi să vedem dacă revine în interval; dacă nu, aș opri botul și aș face unul nou din fișă, pe unde stă prețul acum." : null;
        out.push({ ton: a.nivel, titlu: a.titlu.replace(nume + ": ", ""), text: a.mesaj, faCe: fc });
      });
    }

    // 3) Cat de des a ajuns pretul, in trecut, pana la marginea de jos.
    if (laJos && p !== null && jos !== null && p > jos) {
      var fz = frecventa(x.sanse && x.sanse.josZi, "din zile"), fs = frecventa(x.sanse && x.sanse.josSapt, "din săptămâni");
      var dz = x.sanse && x.sanse.josZi && x.sanse.josZi.valoare, ton = dz === null || dz === undefined ? "info" : dz >= 20 ? "atentie" : "info";
      out.push({ ton: ton, titlu: "Până la marginea de jos (" + pret(jos) + ") sunt " + Math.abs(100 * (jos - p) / p).toFixed(1) + "%",
        text: "Acolo botul ar ține cam " + Math.round(laJos.pozitie) + " " + nume + " (acum " + Math.round(scen.grid.poz) + "), iar totalul ar fi în jur de " + usdt(laJos.total) + ". " +
          (fz || fs ? "În trecutul " + nume + ", prețul a coborât atât " + [fz ? "într-o zi în " + fz : null, fs ? "într-o săptămână în " + fs : null].filter(Boolean).join(" și ") + "." : "Nu am destul istoric ca să spun cât de des a coborât atât."),
        deCe: "Frecvență din lumânările de 4 ore ale monedei, ferestre care nu se suprapun. Nu e o prognoză.",
        faCe: ton === "atentie" ? "Se întâmplă des pe moneda asta: n-aș crește levierul și n-aș pune bani în plus în botul ăsta." : null });
    }

    var fisa = x.fisa || null, dirBot = String(b.directie || "").toLowerCase(), P = function (v) { return (v * 100).toFixed(2).replace(".", ",") + "%"; };
    var X = function (v) { return v.toFixed(1).replace(".", ",") + "×"; };

    // A) Trendul fata de bot (4h + 1z, cu taria) - stare masurata, nu prognoza.
    var d = fisa && fisa.directie;
    if (d && d.dir && d.tarie !== "fara-date" && (dirBot === "long" || dirBot === "short")) {
      var contra = (dirBot === "long" && d.dir === "short") || (dirBot === "short" && d.dir === "long");
      var cu = d.dir === dirBot;
      out.push({ ton: contra ? "atentie" : cu ? "bine" : "info",
        titlu: contra ? "Trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")" : cu ? "Trendul e cu botul (" + d.dir + ", " + d.tarie + ")" : "Trendul e lateral, botul e " + dirBot,
        text: (d.motive || []).join("; ") + "." + (contra && dirBot === "long" ? " Pe scădere un grid long cumpără la fiecare nivel: poziția crește și pierderea pe ea se adâncește." : contra ? " Pe urcare un grid short vinde la fiecare nivel: poziția crește și pierderea pe ea se adâncește." : ""),
        deCe: "Trendul e măsurat pe bare închise (EMA20/EMA50 + structura pe 4h, EMA pe 1z); nu spune încotro va merge.",
        faCe: contra ? "N-aș adăuga bani botului cât trendul e împotrivă. Dacă se face și „tare” pe 1z, aș lua în calcul să-l opresc aproape de zero (vezi prețul de zero mai jos) și să pornesc unul pe direcția trendului, din fișă."
          : cu ? "Aș lăsa botul să lucreze; trendul e de partea lui." : "Pentru un grid, lateral e bine: aș lăsa botul să facă perechi." });
    }

    // B) Regimul acum: miscare mare vs liniste (cu frecventa "cat mai tine").
    var rg = fisa && fisa.regim;
    if (rg && rg.r4h != null && rg.r24h != null && rg.miscare) {
      out.push({ ton: "atentie", titlu: "Mișcare mare acum (4h " + X(rg.r4h) + ", 24h " + X(rg.r24h) + " față de obișnuit)",
        text: "În mișcare gridul nu mai face perechi, doar strânge poziție pe direcția prețului. Când se liniștește, reia perechile.",
        deCe: "„Obișnuit” = percentila 75 a mișcărilor monedei pe 30 de zile.",
        faCe: "Nu adăuga bani acum și n-aș porni alt grid pe moneda asta până nu revine liniștea. Pe ăsta l-aș lăsa cât lichidarea e peste 15%." });
    }
    var L = fisa && fisa.liniste;
    if (L && L.linisteAcum && L.suficient && L.p != null) {
      var rar = L.p < 0.35;
      out.push({ ton: rar ? "info" : "bine", titlu: "Liniște de " + L.zileLiniste.toFixed(1).replace(".", ",") + " zile",
        text: "Din " + L.n + " perioade de liniște ale monedei care au ajuns aici, " + L.k + " din " + L.n + " au mai ținut încă " + L.H + " zile (" + P(L.p) + ").",
        deCe: "Frecvență din ultimele 30 de zile; interval de încredere " + P(L.ic[0]) + " – " + P(L.ic[1]) + ".",
        faCe: rar ? "Liniștea ține rar mult pe moneda asta: n-aș pune mai mulți bani în grid acum; aș încasa ce face și aș fi pregătit să-l opresc la prima mișcare mare." : "Liniștea tinde să țină aici: aș lăsa botul să lucreze." });
    }

    // C) Schimbare de ritm: grile si tranzactii in 24 h fata de media botului pe zi.
    var rt = x.ritm;
    if (rt && rt.zile >= 1 && rt.medieZi > 0 && rt.grile24h != null) {
      var raport = rt.grile24h / rt.medieZi;
      if (raport <= 0.5 || raport >= 2) {
        var sc = raport <= 0.5;
        out.push({ ton: sc ? "atentie" : "info",
          titlu: "Ritmul a " + (sc ? "scăzut" : "crescut") + ": grilele au adus " + rt.grile24h.toFixed(2) + " USDT în 24 h, media e " + rt.medieZi.toFixed(2) + "/zi",
          text: (rt.tranz24h != null && rt.tranzMedieZi > 0 ? rt.tranz24h + " tranzacții în 24 h, față de " + Math.round(rt.tranzMedieZi) + " pe zi în medie. " : "") +
            (sc ? "De obicei asta înseamnă că prețul a ieșit din zona unde botul face perechi, sau că piața a înghețat." : "Piața se mișcă mai mult; e bine pentru grile cât prețul rămâne în interval."),
          faCe: sc ? "Dacă ritmul rămâne jos încă o zi, aș muta gridul pe unde stă prețul: opresc și pornesc unul nou din fișă." : "Aș verifica lichidarea: ritmul mare vine des cu mișcare mare." });
      }
    }

    // D) Costurile pe zi fata de ce aduc grilele.
    var co = x.costuri;
    if (co && co.netZi != null && (co.fundingMananca || co.netZi < 0)) {
      out.push({ ton: "atentie", titlu: "Costurile mănâncă grilele: " + (co.netZi >= 0 ? "+" : "−") + Math.abs(co.netZi).toFixed(2) + " USDT pe zi, net",
        text: "Grilele în 24 h: " + (co.grile24h != null ? co.grile24h.toFixed(2) : "-") + " USDT; comisioane " + (co.comisionZi != null ? co.comisionZi.toFixed(2) : "-") + " și funding " + (co.fundingZi != null ? co.fundingZi.toFixed(2) : "-") + " pe zi.",
        faCe: co.fundingMananca ? "La următorul bot aș lua levier mai mic sau direcția care încasează funding-ul." : "Aș rări grilele (pas mai mare) ca să rămână mai mult după comision." });
    }

    // E) Setarea botului fata de fisa de azi.
    var g = x.geom, lev = nr(b.levier), sig = fisa && fisa.setare && nr(fisa.setare.levierSigur);
    var probleme = [];
    if (g && g.preaDese) probleme.push("grilele sunt prea dese: " + g.grile + " " + g.mod + " lasă " + P(g.netPct) + " pe umplere după comision");
    if (lev !== null && sig > 0 && lev > sig) probleme.push("levierul " + lev + "× e peste cel sigur azi (" + sig + "×)");
    if (probleme.length) out.push({ ton: "info", titlu: "Setarea botului", text: probleme.join("; ") + ".",
      faCe: "Nu l-aș opri doar pentru asta. La următorul bot: grilele geometrice și levierul din fișă" + (sig > 0 ? " (cel mult " + sig + "×)" : "") + "." });

    // F) Punctul de zero.
    var z = x.zero;
    if (z && z.pretZero != null && z.distantaZeroPct != null && tot !== null && tot < 0) {
      out.push({ ton: "info", titlu: "Botul iese pe zero la " + pret(z.pretZero) + " (" + proc(100 * z.distantaZeroPct) + " de aici)",
        text: "Acum, închis, ai lua " + (z.iei != null ? z.iei.toFixed(2) + " USDT" : "-") + (inv ? " din " + inv.toFixed(2) + " investiți" : "") + ".",
        faCe: "Dacă vrei să ieși fără pierdere, pune în Pionex un take-profit / stop la " + pret(z.pretZero) + " pe bot și lasă-l să lucreze până acolo." });
    }

    // 5) Directia fata de bot, spusa ca stare masurata.
    if (x.rezumat && x.rezumat.ton && x.rezumat.ton !== "nu-se-poate") {
      out.push({ ton: x.rezumat.ton === "rau" ? "atentie" : x.rezumat.ton === "bine" ? "bine" : "info",
        titlu: x.rezumat.ton === "rau" ? "Piața merge împotriva botului" : x.rezumat.ton === "bine" ? "Piața nu lucrează împotriva botului" : "Piața dă semnale amestecate",
        text: x.rezumat.text + (x.rezumat.ton === "rau" && b.directie === "long" ? " Pe scădere un grid long cumpără la fiecare nivel, deci poziția crește și pierderea pe ea se adâncește." : ""),
        deCe: "Direcția e măsurată pe bare închise; nu spune încotro va merge.",
        faCe: x.rezumat.ton === "rau" ? "Pe termen scurt piața îți merge contra: n-aș adăuga bani până nu se întoarce pe 4h." : null });
    }

    // 6) Finantarea (rata Binance, orientativa - Pionex nu o publica).
    var f = nr(x.funding);
    if (f !== null && Math.abs(f) >= 0.0001) {
      var platesti = (b.directie === "long" && f > 0) || (b.directie === "short" && f < 0);
      out.push({ ton: platesti && Math.abs(f) >= 0.0005 ? "atentie" : "info",
        titlu: "Finanțarea e " + (f * 100).toFixed(3) + "% la 8 ore",
        text: (platesti ? "Poziția ta o plătește." : "Poziția ta o încasează.") + (nr(b.finantare) === null ? "" : " Până acum botul a " + (nr(b.finantare) < 0 ? "plătit " : "primit ") + Math.abs(nr(b.finantare)).toFixed(2) + " USDT."),
        deCe: "Rata e de la Binance, pentru orientare; Pionex poate avea alta.",
        faCe: platesti && Math.abs(f) >= 0.0005 ? "E mare: la socoteala zilei scade câștigul din grile; n-aș ține botul mult pe direcția asta cu funding-ul așa." : null });
    }

    // 7) Cand nu e nimic de facut, se spune si asta.
    if (!out.some(function (s) { return s.ton === "critic" || s.ton === "atentie"; })) {
      out.push({ ton: "bine", titlu: "Nimic urgent", text: "Nu văd nimic care să ceară o mișcare acum" + (tot !== null ? "; totalul e " + usdt(tot) : "") + ".", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară." });
    }
    out.sort(function (a, c) { return RANG[a.ton] - RANG[c.ton]; });
    return out;
  }
  return { sfaturi: sfaturi };
})();
if (typeof globalThis !== "undefined") globalThis.Sfaturi = Sfaturi;
