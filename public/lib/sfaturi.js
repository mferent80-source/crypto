// "Ce ti-as spune eu" - sfaturile unui prieten, din cifrele botului. Modul pur,
// probat in scripts/scenariu-v77.mjs. Nu decide nimic si nu trimite nimic:
// spune ce vede, cu cifra langa, iar decizia ramane a omului.
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
  //            directii (rez), futures: {disponibil}, funding (rata pe 8h, fractie) }
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
        out.push({ ton: a.nivel, titlu: a.titlu.replace(nume + ": ", ""), text: a.mesaj });
      });
    }

    // 2) Opritorul pe pierdere: ce inseamna, in bani, stins vs pornit.
    var opr = nr(b.opritorPierdere);
    if (opr !== null && b.opritorPierdereActiv === false && scen && typeof Scenariu !== "undefined") {
      var laOpr = Scenariu.la(scen.grid, opr), gol = scen.pretGolire;
      out.push({ ton: dist !== null && Math.abs(dist) < 25 ? "atentie" : "info",
        titlu: "Opritorul pe pierdere e setat la " + pret(opr) + ", dar e stins",
        text: "Dacă prețul ajunge la " + pret(opr) + ", botul ar ține aproximativ " + Math.round(laOpr.pozitie) + " " + nume +
          " și totalul ar fi în jur de " + usdt(laOpr.total) + (inv ? " (" + proc(100 * laOpr.total / inv, 0) + " din investiție)" : "") + ". " +
          "Pornit, te-ar opri acolo. Stins, botul rămâne deschis" + (gol ? " până la lichidare, pe care modelul o pune pe la " + pret(gol) + " (Pionex o estimează la " + pret(pl) + "), unde s-ar pierde aproape toată suma" : "") + ".",
        deCe: "Aproximare pe gridul tău: cumpărături la fiecare nivel până acolo, fără comisioane viitoare." });
    }

    // 3) Cat de des a ajuns pretul, in trecut, pana la marginea de jos.
    if (laJos && p !== null && jos !== null && p > jos) {
      var fz = frecventa(x.sanse && x.sanse.josZi, "din zile"), fs = frecventa(x.sanse && x.sanse.josSapt, "din săptămâni");
      var dz = x.sanse && x.sanse.josZi && x.sanse.josZi.valoare, ton = dz === null || dz === undefined ? "info" : dz >= 20 ? "atentie" : "info";
      out.push({ ton: ton, titlu: "Până la marginea de jos (" + pret(jos) + ") sunt " + Math.abs(100 * (jos - p) / p).toFixed(1) + "%",
        text: "Acolo botul ar ține cam " + Math.round(laJos.pozitie) + " " + nume + " (acum " + Math.round(scen.grid.poz) + "), iar totalul ar fi în jur de " + usdt(laJos.total) + ". " +
          (fz || fs ? "În trecutul " + nume + ", prețul a coborât atât " + [fz ? "într-o zi în " + fz : null, fs ? "într-o săptămână în " + fs : null].filter(Boolean).join(" și ") + "." : "Nu am destul istoric ca să spun cât de des a coborât atât."),
        deCe: "Frecvență din lumânările de 4 ore ale monedei, ferestre care nu se suprapun. Nu e o prognoză." });
    }

    // 4) Bani de rezerva pentru marja.
    var fut = x.futures && nr(x.futures.disponibil);
    if (fut !== null && dist !== null && Math.abs(dist) < 30) {
      out.push({ ton: fut <= 0 && Math.abs(dist) < 15 ? "atentie" : "info",
        titlu: fut <= 0 ? "Nu ai USDT liber în contul futures" : "Ai " + fut.toFixed(2) + " USDT liberi în contul futures",
        text: fut <= 0 ? "Dacă vrei să adaugi marjă botului când se apropie de lichidare, trebuie întâi să muți bani în contul futures. Se face din aplicația Pionex." :
          "Îi poți adăuga botului ca marjă dacă lichidarea se apropie. Asta împinge prețul de lichidare mai departe." });
    }

    // 5) Directia fata de bot, spusa ca stare masurata.
    if (x.rezumat && x.rezumat.ton && x.rezumat.ton !== "nu-se-poate") {
      out.push({ ton: x.rezumat.ton === "rau" ? "atentie" : x.rezumat.ton === "bine" ? "bine" : "info",
        titlu: x.rezumat.ton === "rau" ? "Piața merge împotriva botului" : x.rezumat.ton === "bine" ? "Piața nu lucrează împotriva botului" : "Piața dă semnale amestecate",
        text: x.rezumat.text + (x.rezumat.ton === "rau" && b.directie === "long" ? " Pe scădere un grid long cumpără la fiecare nivel, deci poziția crește și pierderea pe ea se adâncește." : ""),
        deCe: "Direcția e măsurată pe bare închise; nu spune încotro va merge." });
    }

    // 6) Finantarea (rata Binance, orientativa - Pionex nu o publica).
    var f = nr(x.funding);
    if (f !== null && Math.abs(f) >= 0.0001) {
      var platesti = (b.directie === "long" && f > 0) || (b.directie === "short" && f < 0);
      out.push({ ton: platesti && Math.abs(f) >= 0.0005 ? "atentie" : "info",
        titlu: "Finanțarea e " + (f * 100).toFixed(3) + "% la 8 ore",
        text: (platesti ? "Poziția ta o plătește." : "Poziția ta o încasează.") + (nr(b.finantare) === null ? "" : " Până acum botul a " + (nr(b.finantare) < 0 ? "plătit " : "primit ") + Math.abs(nr(b.finantare)).toFixed(2) + " USDT."),
        deCe: "Rata e de la Binance, pentru orientare; Pionex poate avea alta." });
    }

    // 7) Cand nu e nimic de facut, se spune si asta.
    if (!out.some(function (s) { return s.ton === "critic" || s.ton === "atentie"; })) {
      out.push({ ton: "bine", titlu: "Nimic urgent", text: "Nu văd nimic care să ceară o mișcare acum" + (tot !== null ? "; totalul e " + usdt(tot) : "") + "." });
    }
    out.sort(function (a, c) { return RANG[a.ton] - RANG[c.ton]; });
    return out;
  }
  return { sfaturi: sfaturi };
})();
if (typeof globalThis !== "undefined") globalThis.Sfaturi = Sfaturi;
