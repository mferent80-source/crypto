// Alertele botului - modul pur (fara DOM, fara retea), probat in
// scripts/colector-v77.mjs. Il folosesc colectorul de acasa (trimite pe ntfy)
// si Tabloul (panoul de sfaturi). Primeste starea de ACUM si starea alertelor
// de data trecuta; intoarce mesajele de trimis si starea noua.
//
// Regula anti-zgomot: o alerta se trimite cand se AGRAVEAZA, se repeta rar cat
// ramane grava, si se anunta o singura data cand trece. Altfel omul inceteaza
// sa le mai citeasca - si atunci nu mai folosesc la nimic.
var Alerte = (function () {
  "use strict";
  // v100.75 (ideea 3): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
  function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
  var RANG = { ok: 0, atentie: 1, critic: 2 };
  var REPETA_MS = { atentie: 3 * 3600000, critic: 3600000 };
  var REPETA_CHEIE_MS = { "opritor:atentie": 24 * 3600000, miscare: 24 * 3600000, "s-ia-profit": 12 * 3600000, "s-muta": 12 * 3600000, "s-btc": 12 * 3600000, "s-aglomerare": 12 * 3600000,
    "m-btc": 12 * 3600000, "m-funding": 12 * 3600000, "p-zero": 12 * 3600000, "p-margine": 12 * 3600000, "plan-stop": 12 * 3600000, "plan-tinta": 12 * 3600000, "grid-plan": 24 * 3600000 };   // semnalele se repeta rar
  // Histerezis: o alerta INTRA la un prag si IESE abia la unul mai larg, altfel
  // un bot care sta langa prag ar trimite un mesaj la fiecare minut (masurat:
  // 59/ora intre 14,9% si 15,1%). "A trecut" se spune doar dupa 10 minute stabile.
  var IESIRE = { lichAtentie: 17, lichCritic: 9.5 }, STABIL_MS = 10 * 60000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  // v100.67 (specul „sfaturi concise”, pachetul 3): preturile sub 0,1 cu 5 cifre semnificative (PUMP 0.0041234, nu 0.00412), fara
  // exponent; procentele cu virgula; mesajul alertei pe 2 randuri - faptul (o fraza) + „👉 ” o actiune la persoana I; titlul ≤ 60
  function pret(v) { if (v === null || v === undefined || !isFinite(v)) return "—"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : a >= 1 ? 4 : a >= 0.1 || a === 0 ? 5 : Math.min(12, 4 - Math.floor(Math.log10(a)))); }
  function vg(v, z) { return Math.abs(v).toFixed(z == null ? 1 : z).replace(".", ","); }
  function msg(fapt, act) { return fapt + (act ? "\n👉 " + act : ""); }
  function taie(s, n) { s = String(s || ""); if (s.length <= n) return s; var t = s.slice(0, n - 1), i = t.lastIndexOf(" "); return (i > n / 2 ? t.slice(0, i) : t).replace(/[\s,;:·—-]+$/, "") + "…"; }
  function mic(s) { s = String(s || ""); return s.charAt(0).toLowerCase() + s.slice(1); }
  function mare(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  // o nota scurta la sfarsitul faptului (randul 1), in paranteza; actiunea (randul 2) ramane cum e
  function cuNota(mesaj, nota) { var l = String(mesaj || "").split("\n"); l[0] = l[0].replace(/\.?\s*$/, "") + " (" + nota + ")."; return l.join("\n"); }
  function nz(v) { return String(Math.round(Math.abs(Number(v)) * 100) / 100).replace(".", ","); }   // sumele planului: „15”, „7,6”, „2,55”
  // „mișcare cu botul”: aceeasi voce cu semaforul (SemnaleBot.pasiCuBotul) cand e incarcat (pagina, colectorul)
  function actiuneCuBotul(b, dir, pz) {
    if (typeof SemnaleBot !== "undefined" && SemnaleBot.pasiCuBotul) return SemnaleBot.pasiCuBotul(b, dir, pz !== null ? { pretZero: pz } : null).faCe;
    return "L-aș lăsa să lucreze, fără bani în plus.";
  }

  // Fiecare regula intoarce {nivel, titlu, mesaj} pentru starea de acum.
  function reguli(b, ctx, vechi) {
    vechi = vechi || {};
    var fost = function (k) { return (vechi[k] && vechi[k].nivel) || "ok"; };
    var out = {};
    var nume = String(b.baza || b.simbol || "botul").replace(/\.PERP$/, "");
    var dist = nr(b.distantaLichidarePct), dep = !!b.lichidareDepasita, pl = nr(b.pretLichidare), pc = nr(b.pretCurent);
    // v100.67: titlurile pastreaza „lichidarea la” / „lichidarea estimată … depășită” - pe ele se unesc randurile din „Ce ai de făcut acum”
    // (avertismentul serverului, sfatul „pericol”); actiunea = a semaforului (o singura voce)
    // v100.70 (revizia pachetului 3, I1): depasita = actiunea si „de ce”-ul semaforului (marja nu mai ajuta: pozitia poate fi deja lichidata)
    if (dep) out.lich = { nivel: "critic", titlu: nume + ": lichidarea estimată e depășită",
      mesaj: msg((pc !== null ? "Prețul " + pret(pc) + " a trecut" : "Prețul a trecut") + " de lichidarea estimată (" + pret(pl) + "): poziția poate fi deja lichidată sau pe marginea ei.", "Aș închide ce a rămas, după ce verific botul în Pionex.") };
    else if (dist !== null && Math.abs(dist) < (fost("lich") === "critic" ? IESIRE.lichCritic : 8)) out.lich = { nivel: "critic", titlu: nume + ": lichidarea la " + vg(dist) + "%",
      mesaj: msg("Mai sunt " + vg(dist) + "% până la lichidare (" + pret(pl) + "); sub 8% e zona de ieșire.", "Aș adăuga marjă sau aș închide botul acum.") };
    else if (dist !== null && Math.abs(dist) < (fost("lich") !== "ok" ? IESIRE.lichAtentie : 15)) out.lich = { nivel: "atentie", titlu: nume + ": lichidarea la " + vg(dist) + "%",
      mesaj: msg("Mai sunt " + vg(dist) + "% până la lichidare (" + pret(pl) + "); sub 15% o urmăresc.", "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.") };
    else if (dist !== null) out.lich = { nivel: "ok", titlu: nume + ": lichidarea e din nou departe (" + vg(dist) + "%)", mesaj: "Sub 15% revine alerta." };
    else out.lich = null; // lipsa nu e siguranta: starea alertei ramane cum era

    var marja = String(b.stareMargine || "").toUpperCase(), risc = String(b.stareRisc || "").toUpperCase();
    var marjaRea = marja && marja !== "NORMAL", riscRau = risc && risc !== "TRADING";
    out.status = (!marja && !risc) ? null : (marjaRea || riscRau)
      ? { nivel: "critic", titlu: nume + ": Pionex raportează " + (marjaRea ? marja : risc),
        mesaj: msg("Marja: " + (marja || "—") + ", riscul: " + (risc || "—") + "; starea bursei bate calculul nostru al lichidării.",
          marjaRea ? "Aș adăuga marjă sau aș închide botul acum." : "Aș închide botul acum, după ce verific starea lui în Pionex.") }
      : { nivel: "ok", titlu: nume + ": starea Pionex e din nou normală", mesaj: "Marja " + (marja || "—") + ", riscul " + (risc || "—") + "." };

    out.activ = typeof b.activ !== "boolean" ? null : b.activ === false
      ? { nivel: "atentie", titlu: nume + ": botul nu mai rulează", mesaj: msg("Pionex îl arată „" + (b.stareInterna || b.stare || "oprit") + "”.", "Aș verifica în Pionex de ce s-a oprit.") }
      : { nivel: "ok", titlu: nume + ": botul rulează din nou", mesaj: "" };

    var p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus);
    // iese din alerta abia cand pretul e inapoi in grid cu 1% din latime
    var marg = fost("grid") !== "ok" && jos !== null && sus !== null ? (sus - jos) * 0.01 : 0;
    var afara = p !== null && jos !== null && sus !== null && (p < jos + marg || p > sus - marg);
    out.grid = (p === null || jos === null || sus === null) ? null : afara
      ? { nivel: "atentie", titlu: nume + ": prețul a ieșit din grid pe " + (p < jos ? "jos" : "sus"),
        mesaj: msg("Prețul " + pret(p) + " e " + (p < jos ? "sub" : "peste") + " interval (" + pret(jos) + " – " + pret(sus) + "): botul nu face perechi cât stă afară.",
          "Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum.") }
      : { nivel: "ok", titlu: nume + ": prețul e din nou în grid", mesaj: p === null ? "" : "Prețul " + pret(p) + "." };

    if (ctx && ctx.fata4h) {
      out.directie = ctx.fata4h === "rau"
        ? { nivel: "atentie", titlu: nume + ": piața pe 4 ore merge împotriva botului",
          mesaj: msg("Pe barele închise de 4 ore piața " + (ctx.dir4h === "urca" ? "urcă" : "coboară") + ", iar botul e " + (b.directie || "neutru") + ": o stare măsurată, nu o prognoză.", "N-aș adăuga bani până nu se întoarce pe 4 h.") }
        : { nivel: "ok", titlu: nume + ": piața pe 4 ore nu mai merge împotriva botului", mesaj: "" };
    }

    // v79 F1: "miscare mare" - regula dovedita (Busola 20.09) e despre INTRARE: nu porni grid
    // dupa miscare. Despre oprirea unui bot care ruleaza nu s-a dovedit nimic: oprit, isi
    // fixeaza pierderea din directie. Deci alerta informeaza, nu porunceste. Pe bare de 4h,
    // 1,5x percentila 75 e depasit de zgomot pur in ~8% din bare (masurat de audit: ~2
    // mesaje/zi pe bot); de aceea pragul e 2x, iese sub 1,5x si se repeta cel mult o data pe zi.
    if (ctx && ctx.regim && ctx.regim.r4h != null && ctx.regim.r24h != null) {
      var rg = ctx.regim, rmax = Math.max(rg.r4h, rg.r24h), inAlerta = fost("miscare") !== "ok";
      var misc = inAlerta ? rmax >= 1.5 : rmax > 2.0;
      var x = function (v) { return v.toFixed(1).replace(".", ","); };
      var dB = String(b.directie || "").toLowerCase(), cuB = misc && rg.sens && (dB === "long" || dB === "short") && (dB === "long") === (rg.sens === "urca");
      // v100.70 (revizia pachetului 3, I6): in titlu cifra care a declansat (maximul, cu fereastra lui); cealalta fereastra pe randul 1
      var m4 = rg.r4h >= rg.r24h, xT = m4 ? x(rg.r4h) + "× pe 4 h" : x(rg.r24h) + "× pe 24 h", xA = m4 ? "Pe 24 h e " + x(rg.r24h) + "×" : "Pe 4 h e " + x(rg.r4h) + "×";
      // v100.67: titlul ca sfatul („mișcare mare contra botului”) - un rand in „Ce ai de făcut acum”, si la botul neutru; actiunea = a sfatului
      out.miscare = cuB
        ? { nivel: "info", titlu: nume + ": mișcare mare cu botul, " + xT,
            mesaj: msg(xA + " obișnuitul, în direcția botului: grilele încasează pe drum.", actiuneCuBotul(b, dB, ctx ? nr(ctx.pretZero) : null)) }
        : misc
        ? { nivel: "atentie", titlu: nume + ": mișcare mare" + (rg.sens && (dB === "long" || dB === "short") ? " contra botului" : "") + ", " + xT,
            mesaj: msg(xA + " obișnuitul; dovedit: un grid pornit după o mișcare iese cel mai rău, iar închis acum îți fixezi pierderea din direcție.",
              "N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%.") }
        : { nivel: "ok", titlu: nume + ": liniște din nou (" + x(rmax) + "× obișnuitul)", mesaj: "" };
    }

    // v81: planul LUI (prag pe plus / pe minus / afara din grid N ore), judecat de TabloExtra.planStare
    if (ctx && ctx.plan && Array.isArray(ctx.plan.atins)) {
      var at = ctx.plan.atins;
      var pgM = ctx.plan.minus && nr(ctx.plan.minus.prag) !== null ? "−" + nz(ctx.plan.minus.prag) + " USDT" : "pragul tău";
      if (at.indexOf("minus") >= 0) out.plan = { nivel: "critic", titlu: nume + ": planul tău — pragul de " + pgM + " e atins",   // ca motivul semaforului
        mesaj: msg("Ai hotărât dinainte să închizi botul la " + pgM + ".", "Aș închide botul acum în Pionex, cum ai hotărât la rece.") };
      else if (at.indexOf("plus") >= 0) {
        // v96.4 "tinta devine podea": conditii bune -> pastreaz-o cu opritorul la pretul la care totalul e exact tinta
        var pod = ctx.plan.plus && nr(ctx.plan.plus.podea), pA = nr(b.pretCurent), dP = String(b.directie || "").toLowerCase(), rgP = ctx.regim;
        var contraP = rgP && rgP.miscare && rgP.sens && (dP === "long" || dP === "short") && (dP === "long") !== (rgP.sens === "urca"), distP = nr(b.distantaLichidarePct);
        var opP = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null, bun = pod !== null && pA !== null && !contraP && (distP === null || Math.abs(distP) >= 15) && (dP === "long" ? pod < pA : dP === "short" ? pod > pA : false);
        if (bun) {
          var opPa = nr(ctx.plan.plus.opritorPastreaza), tolA = Math.max(0.05, ctx.plan.plus.prag * 0.01);
          var adapost = opP !== null && (opPa !== null ? opPa >= ctx.plan.plus.prag - tolA : (dP === "long" ? opP >= pod : opP <= pod));
          out.plan = adapost
            ? { nivel: "info", titlu: nume + ": ținta de +" + nz(ctx.plan.plus.prag) + " USDT e la adăpost", mesaj: "Stopul (" + pret(opP) + ") e dincolo de " + pret(pod) + ", unde totalul e exact ținta; botul merge mai departe." }
            : { nivel: "atentie", titlu: nume + ": ținta de +" + nz(ctx.plan.plus.prag) + " USDT e atinsă — păstreaz-o",
                mesaj: msg("Condiții bune: la " + pret(pod) + " (" + vg((pod / pA - 1) * 100) + "% de prețul de acum" + (Math.abs(pod / pA - 1) < 0.02 ? ", aproape: o mișcare obișnuită îl poate atinge" : "") + ") totalul e exact +" + nz(ctx.plan.plus.prag) + " USDT, închizând.",
                  "Aș muta stopul din Pionex la " + pret(pod) + ": câștigul rămâne, botul merge mai departe.") };
        } else out.plan = { nivel: "atentie", titlu: nume + ": planul tău — ținta de " + (ctx.plan.plus ? "+" + nz(ctx.plan.plus.prag) + " USDT" : "plus") + " e atinsă",
          mesaj: msg("Ai atins ținta pe care ți-ai pus-o.", "Aș încasa acum: aș închide botul pe plus.") };
      }
      else if (at.indexOf("afara") >= 0) out.plan = { nivel: "atentie", titlu: nume + ": planul tău — afară din grid de peste " + (ctx.plan.afara ? (Number.isInteger(Number(ctx.plan.afara.prag)) ? cate(Number(ctx.plan.afara.prag), "oră", "ore") : nz(ctx.plan.afara.prag) + " ore") : "pragul tău"),
        mesaj: msg("Ai hotărât să nu-l lași afară atât.", "Aș închide botul și aș porni din fișă unul nou, pe unde e prețul.") };
      else out.plan = { nivel: "ok", titlu: "", mesaj: "" };
    }

    // v101.7 (30.09, LIGHTER: planul zicea −15,7 USDT, opritorul din Pionex il costa ≈ 60 si a inchis la −59,04 la 2 noaptea):
    // planul pe minus e doar o alerta; opritorul din Pionex e singurul care lucreaza cand dormi. Atins, cat te costa fata de plan?
    // Intra peste 1,2x planul si cu cel putin 2 USDT (alunecarea, pasul de pret Pionex), iese sub 1,1x; de la 2x e CRITIC.
    // Se avertizeaza, nu se refuza. Cu planul pe minus deja atins tace: acolo vorbeste "planul tau — iesi".
    // v101.8 (1): fara stop ACTIV (lipsa sau stins) -> CRITIC, pana la lichidare poti pierde toata marja; tace cat vorbeste
    // regula veche "opritorul e STINS si lichidarea e la X%" (mai jos), ca sa nu primeasca acelasi lucru de doua ori.
    var inv = nr(b.investit), dirPl = String(b.directie || "").toLowerCase();
    // v100.70 (revizia pachetului 3, I7): „de preț” - in aceleasi alerte apare si „% din investiție” (doua procente cu baze diferite)
    var distP = function (x) { return p !== null && x !== null ? (x >= p ? "+" : "−") + vg((x / p - 1) * 100, 1) + "% de preț" : "?"; };
    var faraStop = false, atinsPl = ctx && ctx.plan && Array.isArray(ctx.plan.atins) ? ctx.plan.atins : [];
    if (ctx && ctx.plan && ctx.plan.minus && atinsPl.indexOf("minus") < 0) {
      var mi = ctx.plan.minus, lo = nr(mi.laOpritor), pg = nr(mi.prag);
      var pgT = nz(pg), procPlan = inv > 0 && pg > 0 ? "−" + vg(pg / inv * 100, 1) + "% din investiție" : null;
      var raport = b.opritorPierdereTip === "raport" && nr(b.opritorPierdereRaport) !== null, opS = nr(b.opritorPierdere), opPlan = nr(mi.opritorPlan);
      var activS = !!b.opritorPierdereActiv && (raport || opS > 0);
      if (!(pg > 0)) out["plan-stop"] = null;
      else if (!activS) {
        faraStop = true;
        var plL = nr(b.pretLichidare);
        out["plan-stop"] = { nivel: "critic", titlu: nume + ": n-ai stop activ în Pionex (planul: −" + pgT + " USDT)",
          // v100.70 (revizia pachetului 3, I8): miscarea care duce la lichidare dupa partea botului (short -> urcare)
          mesaj: msg((opS > 0 ? "Stopul e setat la " + pret(opS) + ", dar e stins; fără el" : "Fără stop") + ", o " + (dirPl === "short" ? "urcare" : dirPl === "long" ? "cădere" : "mișcare") + " bruscă merge până la lichidare" + (plL !== null && plL > 0 ? " (" + pret(plL) + ", " + distP(plL) + ")" : "") + " și poți pierde toată marja" + (inv > 0 ? " (≈ " + vg(inv, 0) + " USDT)" : "") + ".",
            (opPlan !== null ? "Aș pune stopul la " + pret(opPlan) + (procPlan ? " (sau " + procPlan + ")" : "") : procPlan ? "Aș pune stopul în procente, la " + procPlan : "Aș pune stopul cât zice planul") + ": planul devine ordin, nu doar alertă.") };
      } else if (lo === null) out["plan-stop"] = null;
      else {
        var pierde = -lo, inPS = fost("plan-stop") !== "ok", departe = pierde > pg * (inPS ? 1.1 : 1.2) && pierde - pg >= (inPS ? 1 : 2);
        var undeE = raport ? "Stopul e în procente, la −" + vg(nr(b.opritorPierdereRaport) * 100, 1) + "% din investiție"
          : "Stopul e la " + pret(opS) + " (" + distP(opS) + "); pe drum gridul mai " + (dirPl === "short" ? "vinde" : "cumpără") + " și la stop poziția e plină";
        var faCe = raport ? (procPlan ? "Aș pune stopul la " + procPlan : "Aș apropia stopul cât zice planul")
          : (opPlan !== null ? "Aș muta stopul în Pionex la " + pret(opPlan) + (procPlan ? " (sau " + procPlan + ")" : "") : procPlan ? "Aș pune stopul în procente, la " + procPlan : "Aș apropia stopul cât zice planul");
        out["plan-stop"] = departe
          ? { nivel: pierde >= 2 * pg ? "critic" : "atentie", titlu: nume + ": stopul din Pionex pierde ≈ " + Math.round(pierde) + " USDT (planul: −" + pgT + ")",
              mesaj: msg(undeE + ": atins, te costă ≈ " + vg(pierde, 1) + " USDT" + (inv > 0 ? " (" + Math.round(pierde / inv * 100) + "% din investiție)" : "") + ".", faCe + ": planul devine ordin, nu doar alertă.") }
          : { nivel: "ok", titlu: nume + ": stopul din Pionex se potrivește acum cu planul tău", mesaj: "Atins, te costă ≈ " + vg(pierde, 1) + " USDT; planul zice −" + pgT + "." };
      }

      // v101.8 (4): incape gridul in plan? (TabloExtra.planStare -> incapePlanul). Doua cazuri, o singura alerta, o data pe zi:
      // (a) gridul e mai larg decat planul: la marginea de pierdere pierzi peste 1,3x planul (iese sub 1,15x) - planul se atinge
      // in mijlocul gridului, restul gridului nu apuca sa lucreze; (b) iesirea pe plan e mai aproape decat jumatate dintr-o zi
      // obisnuita a monedei (iese peste 0,6) - o zi obisnuita te scoate. Remediul masurat: levierul intreg la care incape.
      var mgPl = dirPl === "short" ? sus : jos, inGrid = p !== null && jos !== null && sus !== null && p >= jos && p <= sus;
      var lm = nr(mi.laMargine), ie = nr(mi.iesire), amp = nr(mi.ampZi), inG = fost("grid-plan") !== "ok";
      if (!(pg > 0) || !inGrid || lm === null || (dirPl !== "long" && dirPl !== "short")) out["grid-plan"] = null;
      else {
        var larg = -lm > pg * (inG ? 1.15 : 1.3), aproape = amp !== null && ie !== null && ie < amp * (inG ? 0.6 : 0.5), lv = mi.levierPotrivit;
        // v100.67: titlul ≤ 60 (cifrele trec in mesaj); remediul = o actiune pentru botul urmator
        var parteG = dirPl === "short" ? "sus" : "jos";
        // v100.70 (revizia pachetului 3, I7): remediul cu conditia lui („pe același grid și bani”, ca inainte de pachetul 3) si „nici la levier
        // mai mic” (cel vechi excludea levierul mai mic; „la levierul de acum” il invita sa-l coboare). Pierderea la margine cu levierul nou
        // nu mai incape in 110 - e de prisos: fie planul iese inainte (planul la −Z%), fie gridul incape tot in plan
        var remediu = lv && lv.levier < nr(b.levier)
          ? "Aș lua levier " + lv.levier + "× la botul următor, pe același grid și bani: " + (nr(lv.iesire) !== null ? "planul la " + (dirPl === "short" ? "+" : "−") + vg(lv.iesire * 100, 1) + "% de preț" : "planul încape tot") + ", câștig pe grilă mai mic."
          : "Aș strânge gridul sau aș mări planul la botul următor: nici la levier mai mic gridul nu încape.";
        out["grid-plan"] = larg
          ? { nivel: "atentie", titlu: nume + ": gridul e mai larg decât planul tău (−" + pgT + " USDT)",
              mesaj: msg("Planul (" + pret(opPlan) + ", " + distP(opPlan) + ") e înaintea marginii de " + parteG + " (" + pret(mgPl) + ", ≈ −" + vg(-lm, 1) + " USDT): gridul de dincolo nu lucrează"
                + (amp !== null ? (aproape ? "; o zi obișnuită (" + vg(amp * 100, 1) + "%) te poate scoate" : "; " + nume + " se mișcă ~" + vg(amp * 100, 1) + "% pe zi") : "") + ".", remediu) }
          : aproape
          ? { nivel: "atentie", titlu: nume + ": planul se atinge sub o zi obișnuită",
              mesaj: msg("Planul (−" + pgT + " USDT) se atinge la " + pret(opPlan) + " (" + distP(opPlan) + "), iar " + nume + " se mișcă de obicei " + vg(amp * 100, 1) + "% pe zi.", remediu) }
          : { nivel: "ok", titlu: nume + ": gridul încape acum în planul tău", mesaj: "" };
      }
    }

    // v101.8 (3): tinta din Pionex fata de planul pe plus. Planul e doar alerta: la LIGHTER s-a atins la 02:07 (+7,4) si n-a
    // inchis nimeni, iar tinta din Pionex (5,112) statea peste grid, unde botul nu mai are pozitie. Fara tinta activa sau cu
    // tinta care, atinsa, da peste 1,3x planul (iese sub 1,15x) -> ATENTIE. Ziua ramane alegerea lui (27.09): la tinta muta
    // stopul la podea; tinta in Pionex e pentru cand botul sta nesupravegheat. Cu tinta planului deja atinsa tace (podeaua).
    if (ctx && ctx.plan && ctx.plan.plus && atinsPl.indexOf("plus") < 0) {
      var pu = ctx.plan.plus, pp = nr(pu.prag), lt = nr(pu.laTinta), tpPl = nr(pu.tintaPlan), ppT = nz(pp);
      var procPlus = inv > 0 && pp > 0 ? "+" + vg(pp / inv * 100, 1) + "% din investiție" : null;
      var rapT = b.opritorProfitTip === "raport" && nr(b.opritorProfitRaport) !== null, tpS = nr(b.opritorProfit), activT = !!b.opritorProfitActiv && (rapT || tpS > 0);
      // v100.67: noaptea tinta in Pionex, ziua la tinta stopul la podea (alegerea lui, 27.09) - o actiune, la persoana I
      var faT = "Aș pune ținta " + (tpPl !== null ? "la " + pret(tpPl) + (procPlus ? " (sau " + procPlus + ")" : "") : procPlus ? "la " + procPlus : "cât zice planul") + " pentru noapte; ziua, la țintă aș muta stopul la podea.";
      var dincoloGrid = !rapT && tpS !== null && (dirPl === "short" ? jos !== null && tpS < jos : sus !== null && tpS > sus);
      if (!(pp > 0)) out["plan-tinta"] = null;
      else if (!activT) out["plan-tinta"] = { nivel: "atentie", titlu: nume + ": n-ai țintă în Pionex (planul: +" + ppT + " USDT)",
        mesaj: msg(tpPl !== null ? "Planul tău se atinge pe la " + pret(tpPl) + " (" + distP(tpPl) + "), iar acolo nu închide nimic singur." : "Planul tău nu se atinge doar din preț: la margine botul rămâne fără poziție, restul vine din grile.", faT) };
      else if (lt === null) out["plan-tinta"] = null;
      else {
        var inT = fost("plan-tinta") !== "ok", departeT = lt > pp * (inT ? 1.15 : 1.3) && lt - pp >= (inT ? 0.5 : 1);
        out["plan-tinta"] = departeT
          ? { nivel: "atentie", titlu: nume + ": ținta din Pionex e departe de planul tău (+" + ppT + ")",
              mesaj: msg((rapT ? "Ținta e în procente, la +" + vg(nr(b.opritorProfitRaport) * 100, 1) + "% din investiție" : "Ținta e la " + pret(tpS) + " (" + distP(tpS) + ")" + (dincoloGrid ? ", " + (dirPl === "short" ? "sub gridul de jos" : "peste gridul de sus") + ", unde botul nu mai are poziție" : "")) + ": atinsă, botul are ≈ +" + vg(lt, 1) + " USDT.", faT) }
          : { nivel: "ok", titlu: nume + ": ținta din Pionex se potrivește acum cu planul tău", mesaj: "Atinsă, botul are ≈ +" + vg(lt, 1) + " USDT; planul zice +" + ppT + "." };
      }
    }

    // v82: semnalele actionabile (calculate de SemnaleBot in colector)
    if (ctx && ctx.semnale) {
      var sm = ctx.semnale;
      // v100.40 (audit 30.09: JTO 18 critice intr-o zi pe acelasi fapt): cand IESI-ul vine din PLANUL lui, alerta „planul tău — ieși”
      // l-a spus deja - semaforul nu-l mai repeta (ramane doar in Radar)
      // v100.67: textele vin gata (scrise concis) din SemnaleBot - aici doar faptul + „👉 ” actiunea; „de ce”-ul lung ramane in Radar (regula 8)
      out["s-iesi"] = sm.semafor && sm.semafor.nivel === "iesi" && !(sm.semafor.cod === "plan" && out.plan && out.plan.nivel === "critic") ? { nivel: "critic", doarRadar: true, titlu: taie(nume + ": semafor roșu — " + mic(sm.semafor.motiv), 60),
        mesaj: msg(sm.semafor.deCe || mare(sm.semafor.motiv) + ".", sm.semafor.faCe) } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-ia-profit"] = sm.iaProfit ? { nivel: "atentie", titlu: nume + ": moment bun să încasezi", mesaj: msg(sm.iaProfit.text, "Aș închide botul pe plus acum.") } : { nivel: "ok", titlu: "", mesaj: "" };
      // „de ce”-ul ajunge si pe Discord / pagina alerts (revizia pachetului 1, R2): randul 1; gridul nou e actiunea (randul 2)
      // v100.70 (revizia pachetului 3, I4): titlul cu distanta pana la margine (motivul intreg era taiat la 60, „…(12%…”), pozitia in
      // interval si pragul pe randul 1; fara cifre (pretul afara din grid) - motivul ca inainte
      var mT = !sm.muta ? "" : sm.muta.dist && sm.muta.parte ? nume + ": mută gridul, la " + sm.muta.dist + " de marginea de " + sm.muta.parte : nume + ": mută gridul — " + sm.muta.motiv;
      out["s-muta"] = sm.muta ? { nivel: "atentie", titlu: taie(mT, 60),
        mesaj: msg(sm.muta.poz ? "Prețul e la " + sm.muta.poz + " din interval" + (sm.muta.deCe ? "; " + mic(sm.muta.deCe) : ".") : sm.muta.deCe || "Fișa propune un grid nou, pe unde e prețul acum.",
          "Aș muta gridul" + (sm.muta.des ? " des (0,3%)" : "") + " la " + pret(nr(sm.muta.setare.jos)) + " – " + pret(nr(sm.muta.setare.sus)) + ", " + (sm.muta.setare.grile + 1) + " grile în Pionex, " + sm.muta.setare.levier + "×" + (nr(sm.muta.treceriZi) !== null ? ", ~" + vg(nr(sm.muta.treceriZi)) + " perechi/zi" : "") + " (setările în Tablou).") } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-btc"] = sm.btc ? { nivel: "atentie", titlu: nume + ": BTC a intrat în mișcare", mesaj: msg(sm.btc.text, "N-aș adăuga bani până nu se vede încotro trage BTC.") } : { nivel: "ok", titlu: "", mesaj: "" };
      // v100.70 (revizia pachetului 3, I2): randul 1 = semnele (ca „de ce”-ul semaforului, ≤ 160), actiunea = a semaforului (o voce)
      out["s-aglomerare"] = sm.aglomerare && sm.aglomerare.nivel === "atentie" ? { nivel: "atentie", titlu: nume + ": mulțimea e înghesuită pe partea botului",
        mesaj: msg(sm.aglomerare.dovezi ? "Semnele: " + sm.aglomerare.dovezi + "; risc de curățare bruscă în sens opus." : sm.aglomerare.text, "Aș strânge riscul: aș adăuga marjă sau aș închide o parte.") } : { nivel: "ok", titlu: "", mesaj: "" };
    }

    // v91.11 (2): din "Mediul botului" (IndicatoriBot.mediu) - BTC pe 4h impotriva botului si funding-ul
    // mult peste obicei pe partea botului. Miscarea mare ramane pe regula ei masurata (out.miscare).
    // Fara date ("n-am ...") -> null: starea ramane cum era, nu se anunta un "a trecut" fals.
    if (ctx && Array.isArray(ctx.mediu)) {
      var gaseste = function (k) { for (var i = 0; i < ctx.mediu.length; i++) if (ctx.mediu[i] && ctx.mediu[i].k === k) return ctx.mediu[i]; return null; };
      var mb = gaseste("btc"), mf = gaseste("funding"), fara = function (m) { return !m || /^n-am/.test(String(m.text || "")); };
      out["m-btc"] = fara(mb) ? null : (mb.ton === "rau" || mb.ton === "atentie")
        ? { nivel: "atentie", titlu: nume + ": BTC pe 4 ore merge împotriva botului",
          // v100.70 (revizia pachetului 3, I2): sensul vechi („fii gata să-l oprești”) - pregatit, nu inchis acum
          mesaj: msg("BTC " + mb.text + "; monedele mici îl urmează de obicei.", "N-aș adăuga bani cât BTC trage împotrivă; dacă intră în mișcare mare, aș fi gata să închid botul.") }
        : { nivel: "ok", titlu: nume + ": BTC nu mai merge împotriva botului", mesaj: "BTC " + mb.text + "." };
      out["m-funding"] = fara(mf) ? null : mf.ton === "atentie"
        ? { nivel: "atentie", titlu: nume + ": funding-ul e mult peste obicei, pe partea botului",
          // v100.70 (revizia pachetului 3, I4/I8): o fraza ≤ 160 (costul pe zi e deja in textul funding-ului); riscul dupa partea botului -
          // la short inghesuiala se curata printr-o urcare, nu printr-o cadere
          mesaj: msg("Funding " + mf.text + ": mulți stau pe partea botului, risc de " + (String(b.directie || "").toLowerCase() === "short" ? "urcare" : "cădere") + " bruscă.", "N-aș mări botul acum.") }
        : { nivel: "ok", titlu: nume + ": funding-ul a revenit la normal", mesaj: "Funding " + mf.text + "." };
    }

    // v91.11 (4): pragurile puse de Radar pe fiecare bot
    // - "iese pe zero": pretul la care, inchis acum, botul iese fara pierdere (TabloExtra.dacaInchizi)
    var pz = ctx ? nr(ctx.pretZero) : null, dirB = String(b.directie || "").toLowerCase();
    // v100.40 (audit 30.09): nu in prima ora de viata - „ai ajuns pe zero, ieși fără pierdere” pleca la cateva secunde dupa fiecare pornire
    // si impingea exact spre inchiderile repezi (botii inchisi in prima ora: −2.065 USDT in 2026)
    var tanar = nr(b.pornitLa) > 0 && Date.now() - nr(b.pornitLa) < 3600000;
    if (pz !== null && p !== null && (dirB === "long" || dirB === "short") && !tanar) {
      var peZero = fost("p-zero") !== "ok" ? (dirB === "long" ? p >= pz * 0.997 : p <= pz * 1.003) : (dirB === "long" ? p >= pz : p <= pz);
      out["p-zero"] = peZero
        ? { nivel: "atentie", titlu: nume + ": botul a ajuns pe zero (" + pret(pz) + ")",
          mesaj: msg("Prețul e " + pret(p) + ": închis acum, ieși fără pierdere, după comisionul de închidere.", "Aș alege acum: închid botul fără pierdere sau îl las să prindă grilele.") }
        : { nivel: "ok", titlu: "", mesaj: "" };
    }
    // - la 1% de o margine a gridului (inauntru); iese abia peste 1,5%. Afara din grid e regula "grid".
    if (p !== null && jos !== null && sus !== null) {
      var lim = fost("p-margine") !== "ok" ? 0.015 : 0.01, dj = (p - jos) / p, ds = (sus - p) / p, dirMg = String(b.directie || "").toLowerCase();
      var langa = p >= jos && p <= sus && (dj < lim || ds < lim);
      out["p-margine"] = langa
        ? { nivel: "atentie", titlu: nume + ": prețul e la " + vg(Math.min(dj, ds) * 100) + "% de marginea de " + (dj <= ds ? "jos (" + pret(jos) + ")" : "sus (" + pret(sus) + ")"),
          // v100.70 (revizia pachetului 3, I8): „plină” doar pe partea pe care pierde botul - long/neutru jos (scădere), short/neutru sus (creștere)
          mesaj: msg("Ieșit din grid, botul nu mai face perechi" + (dj <= ds ? (dirMg !== "short" ? " și poziția rămâne plină pe scădere" : "") : (dirMg !== "long" ? " și poziția rămâne plină pe creștere" : "")) + ".", "N-aș pune bani în plus cât stă lângă margine.") }
        : { nivel: "ok", titlu: "", mesaj: "" };
    }

    var opritorStins = b.opritorPierdere != null && b.opritorPierdereActiv === false;
    // v87: intra sub 20% si iese abia peste 23% (sub 20% plus-minus nu mai "clipeste"); sub 10% urca la CRITIC;
    // cat sta "atentie" se repeta cel mult o data pe zi (REPETA_CHEIE_MS), nu la 3 ore.
    var fo = fost("opritor"), dA = dist !== null ? Math.abs(dist) : null;
    out.opritor = (opritorStins && dA !== null && dA < (fo !== "ok" ? 23 : 20))
      ? (dA < (fo === "critic" ? 11 : 10)
        ? { nivel: "critic", titlu: nume + ": stopul e stins, lichidarea la " + vg(dA) + "%", mesaj: msg("Stopul e setat la " + pret(nr(b.opritorPierdere)) + ", dar nu e pornit.", "Aș porni stopul în Pionex acum sau aș închide botul.") }
        : { nivel: "atentie", titlu: nume + ": stopul e stins (lichidarea la " + vg(dA) + "%)", mesaj: msg("Stopul e setat la " + pret(nr(b.opritorPierdere)) + ", dar nu e pornit.", "Aș porni stopul în Pionex.") })
      : (opritorStins && dA === null ? null : { nivel: "ok", titlu: "", mesaj: "" });
    // v101.8 (1): „n-ai stop activ” tace cat vorbeste regula de mai sus (acelasi lucru, spus o singura data)
    if (faraStop && out.opritor && out.opritor.nivel !== "ok") out["plan-stop"] = null;
    return out;
  }

  // stare: { <cheie>: { nivel, la } } de data trecuta (sau {}).
  // v100.43 (I-466): sfaturile TACUTE (dupa >=30 de cazuri n-au batut hazardul si n-au salvat bani - SemnaleBot.socotealaToti) raman
  // doar in Radar; pe Discord nu mai pleaca. Cheia alertei -> codul sfatului din socoteala. Lichidarea si planul lui nu sunt aici.
  var CHEIE_SFAT = { "s-muta": "muta", "s-btc": "btc", "s-aglomerare": "aglomerare", "s-ia-profit": "ia-profit" };
  function tacuta(cheie, ctx) { var c = CHEIE_SFAT[cheie]; return !!(c && ctx && ctx.taci && ctx.taci[c]); }
  function evalueaza(b, ctx, stare, acum) {
    stare = stare || {}; acum = acum || Date.now();
    // Cheile pe care nu le putem judeca acum (date lipsa, lumanari picate) isi
    // pastreaza starea - altfel, la revenire, alerta s-ar trimite din nou.
    var nou = {}, mesaje = [], r = reguli(b || {}, ctx, stare);
    Object.keys(stare).forEach(function (k) { nou[k] = stare[k]; });
    Object.keys(r).forEach(function (cheie) {
      var a = r[cheie], v = stare[cheie] || { nivel: "ok", la: 0 };
      if (!a) return;
      if (a.nivel === "ok" && v.nivel !== "ok") {
        // a trecut: se spune doar dupa STABIL_MS la rand fara alerta
        var de = v.okDe || acum;
        if (acum - de >= STABIL_MS) {
          // revizia 01.10 (C1): o regula cu doarRadar (ex. „s-iesi”) ramane doar in Radar - inainte cheia se pierdea aici si pleca pe Discord
          if (a.titlu) mesaje.push(tacuta(cheie, ctx) || a.doarRadar ? { cheie: cheie, nivel: "info", titlu: a.titlu, mesaj: a.mesaj, doarRadar: true } : { cheie: cheie, nivel: "info", titlu: a.titlu, mesaj: a.mesaj });
          nou[cheie] = { nivel: "ok", la: acum };
        } else nou[cheie] = { nivel: v.nivel, la: v.la, okDe: de };
        return;
      }
      var trimite = false;
      if (RANG[a.nivel] > RANG[v.nivel]) trimite = true;                       // s-a agravat
      else if (a.nivel !== "ok" && a.nivel === v.nivel && acum - v.la >= (REPETA_CHEIE_MS[cheie + ":" + a.nivel] || REPETA_CHEIE_MS[cheie] || REPETA_MS[a.nivel])) trimite = true; // persista
      // v100.68: nota „tăcut pe Discord” pe randul 1 (faptul), nu lipita de actiune
      if (trimite) mesaje.push(tacuta(cheie, ctx) ? { cheie: cheie, nivel: a.nivel, titlu: a.titlu, mesaj: cuNota(a.mesaj, "tăcut pe Discord: pe boții tăi n-a bătut hazardul"), doarRadar: true } : a.doarRadar ? { cheie: cheie, nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj, doarRadar: true } : { cheie: cheie, nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj });
      // coborarea critic -> atentie NU reseteaza ceasul: o revenire rapida in critic nu e o agravare noua
      nou[cheie] = { nivel: a.nivel, la: trimite ? acum : (RANG[a.nivel] <= RANG[v.nivel] ? v.la : acum) };
    });
    return { mesaje: mesaje, stare: nou };
  }

  // ---- v91.11 (4) grila atinsa / pereche incheiata: EVENIMENTE (nu stari), un singur mesaj pe tura ----
  function contori(b) {
    var bu = b && b.brut && b.brut.buOrderData;
    return { u: bu ? nr(bu.closedExchangeOrderCount) : null, per: nr(b && b.ordinePerechi), g: nr(b && b.gridProfitBrut), poz: nr(b && b.pozitie) };
  }
  // v96.5 "opritorul care urca" (27.09): dupa tinta, cand opritorul la 1,5% de pret ar pastra cu o TREAPTA mai mult
  // decat ce s-a anuntat / decat pastreaza opritorul de acum. Treapta = max(1 USDT, 1/4 din tinta). Doar cu conditii
  // bune (fara miscare contra, lichidarea departe). Starea (vechi) = { anuntat } - se sterge cand tinta nu mai e atinsa.
  function podeaUrca(b, plan, ctx, vechi) {
    var nume = String((b && (b.baza || b.simbol)) || "botul").replace(/\.PERP$/, ""), pl = plan && plan.plus, u = pl && pl.urca;
    if (!pl || !plan.atins || plan.atins.indexOf("plus") < 0) return { mesaje: [], stare: null };
    var d = String(b.directie || "").toLowerCase(), rg = ctx && ctx.regim, dist = nr(b.distantaLichidarePct);
    var contra = rg && rg.miscare && rg.sens && (d === "long" || d === "short") && (d === "long") !== (rg.sens === "urca");
    if (!u || contra || (dist !== null && Math.abs(dist) < 15)) return { mesaje: [], stare: vechi || null };
    var treapta = Math.max(1, pl.prag / 4), baza = Math.max(pl.prag, vechi && nr(vechi.anuntat) !== null ? vechi.anuntat : -Infinity, u.opritorPastreaza !== null ? u.opritorPastreaza : -Infinity);
    if (u.pastrezi < baza + treapta) return { mesaje: [], stare: vechi || null };
    var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; };
    return { stare: { anuntat: u.pastrezi }, mesaje: [{ cheie: "podea-urca", nivel: "info", titlu: "🪜 " + nume + ": poți urca stopul — păstrezi " + U(u.pastrezi),
      mesaj: msg("Stopul la " + pret(u.pret) + " (" + vg(u.perna * 100) + "% de preț) îți păstrează " + U(u.pastrezi) + " dacă piața se întoarce" + (u.opritorPastreaza !== null ? ", cel de acum (" + pret(u.opritor) + ") " + U(u.opritorPastreaza) : "") + ".",
        "Aș muta stopul în Pionex la " + pret(u.pret) + "; botul merge mai departe.") }] };
  }

  function grila(b, vechi) {
    var c = contori(b), nume = String((b && (b.baza || b.simbol)) || "botul").replace(/\.PERP$/, ""), mesaje = [];
    if (!vechi || c.u === null || vechi.u === null || vechi.u === undefined || c.u < vechi.u || (c.per !== null && vechi.per !== null && c.per < vechi.per)) return { mesaje: mesaje, contori: c };
    var noiPer = c.per !== null && vechi.per !== null ? c.per - vechi.per : 0, noiU = c.u - vechi.u, p = nr(b.pretCurent);
    if (noiPer > 0) {
      var dg = c.g !== null && vechi.g !== null ? c.g - vechi.g : null, U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; };
      mesaje.push({ cheie: "grila", nivel: "info", perechi: noiPer, usdt: dg, titlu: "✅ " + nume + ": " + (noiPer === 1 ? "pereche încheiată" : noiPer + " perechi încheiate") + (dg !== null ? " " + U(dg) : ""),
        mesaj: "Grilele au adus " + (c.g !== null ? U(c.g) : "—") + " de la pornire (" + c.per + (c.per >= 20 ? " de" : "") + " perechi)" + (p !== null ? "; prețul " + pret(p) : "") + "." });
    } else if (noiU > 0) {
      var dir = String(b.directie || "").toLowerCase(), crescut = c.poz !== null && vechi.poz !== null ? Math.abs(c.poz) > Math.abs(vechi.poz) : null;
      var fapta = crescut === null ? "" : dir === "short" ? (crescut ? " — a vândut" : " — a cumpărat") : (crescut ? " — a cumpărat" : " — a vândut");
      // v97.9 (27.09: 18 din 62 de alerte erau "grila atinsa"): cumpararea / vanzarea simpla ramane in Radar (pagina Alerts),
      // nu mai pleaca pe Discord; perechea incheiata (banii) pleaca in continuare
      mesaje.push({ cheie: "grila", nivel: "info", doarRadar: true, titlu: nume + ": " + (noiU === 1 ? "grilă atinsă" : noiU + " grile atinse") + fapta + (p !== null ? " la ~" + pret(p) : ""),
        mesaj: "Poziția e acum " + (c.poz !== null ? c.poz : "—") + "; perechea se încheie când prețul ajunge la linia următoare în sens invers." });
    }
    return { mesaje: mesaje, contori: c };
  }

  // ---- v91.11 (1) preturile moarte: 10 minute la rand fara preturi -> CRITIC (repeta la 3 h); prima reusita -> "din nou" ----
  var PRETURI_MS = 10 * 60000, PRETURI_REPETA_MS = 3 * 3600000;
  function preturi(st, rez, acum) {
    st = st || { reaDe: null, anuntatLa: null }; acum = acum || Date.now();
    var n = { reaDe: st.reaDe || null, anuntatLa: st.anuntatLa || null, eroare: st.eroare || null };
    if (rez && rez.ok) {
      var m = n.anuntatLa ? { nivel: "info", titlu: "Crypto Radar primește din nou prețurile", mesaj: "Graficul, indicatorii, direcția pieței și clasamentul merg din nou." } : null;
      return { stare: { reaDe: null, anuntatLa: null, eroare: null }, mesaj: m };
    }
    n.reaDe = n.reaDe || acum; n.eroare = String(rez && rez.eroare || "eroare necunoscută").slice(0, 200);
    var de = acum - n.reaDe;
    if (de >= PRETURI_MS && (!n.anuntatLa || acum - n.anuntatLa >= PRETURI_REPETA_MS))
      return { stare: n, mesaj: { nivel: "critic", titlu: "Crypto Radar nu mai primește prețurile de la Pionex",
        mesaj: msg("De " + cate(Math.round(de / 60000), "minut", "minute") + " (" + taie(n.eroare, 40) + ") graficul, indicatorii, direcția și clasamentul sunt goale, iar alertele de piață nu sunt de încredere.",
          "Aș aștepta să treacă singur; dacă ține, aș reporni Radarul.") } };
    return { stare: n, mesaj: null };
  }
  // se cheama DOAR dupa ce mesajul a plecat (altfel tura urmatoare il reincearca)
  function anuntatPreturi(st, acum) { var n = Object.assign({}, st || {}); n.anuntatLa = acum || Date.now(); return n; }

  // ---- v91.11 (2) raportul "Mediul botilor" la 9, 12, 15, 18, 21 (ora Romaniei) ----
  var ORE_RAPORT = [9, 12, 15, 18, 21];
  function slotRaport(acum) {
    var d = new Date(acum || Date.now()), o = {};
    try { new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach(function (x) { o[x.type] = x.value; }); } catch (e) { return null; }
    var h = Number(o.hour);
    return ORE_RAPORT.indexOf(h) >= 0 ? o.year + "-" + o.month + "-" + o.day + " " + (h < 10 ? "0" : "") + h : null;
  }
  function raportBoti(lista, acum) {
    var l = (Array.isArray(lista) ? lista : []).filter(function (x) { return x && x.b; });
    if (!l.length) return null;
    var BUL = { bine: "🟢", atentie: "🟡", rau: "🔴", neutru: "⚪" }, linii = [];
    l.forEach(function (x) {
      var b = x.b, nume = String(b.baza || b.simbol || "botul").replace(/\.PERP$/, ""), tot = nr(b.profitTotal), p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), li = nr(b.distantaLichidarePct);
      var cap = nume + " " + (b.directie || "") + (b.levier ? " " + b.levier + "×" : "") + (tot !== null ? " · total " + (tot >= 0 ? "+" : "−") + Math.abs(tot).toFixed(2).replace(".", ",") + " USDT" : "")
        + (p !== null ? " · preț " + pret(p) + (jos !== null && sus !== null && sus > jos ? " (" + Math.round((p - jos) / (sus - jos) * 100) + "% în grid)" : "") : "") + (li !== null ? " · lichidare la " + Math.round(Math.abs(li)) + "%" : "");
      linii.push(cap);
      (Array.isArray(x.mediu) ? x.mediu : []).forEach(function (m) { if (m) linii.push("   " + (BUL[m.ton] || "⚪") + " " + m.eticheta + ": " + m.text); });
    });
    return { nivel: "info", titlu: "📊 Mediul boților", mesaj: linii.join("\n") };
  }

  // ======================= v94 =======================
  function ziRo(acum) { try { var o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(acum)).forEach(function (x) { o[x.type] = x.value; }); return o.year + "-" + o.month + "-" + o.day; } catch (e) { return new Date(acum).toISOString().slice(0, 10); } }
  var V1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };
  // Miscare NEOBISNUITA pe o moneda / actiune din portofoliu (pragul ales de el, 26.09): peste 2x miscarea ei
  // obisnuita SI minim 3%. O data pe zi pe fiecare directie; din nou doar daca miscarea s-a dublat.
  // o = {cheie, nume, fel: "acțiune"|"monedă", ch (%), tipic (%), pret}; st = {zi, sus, jos}
  function miscareNeobisnuita(o, st, acum) {
    acum = acum || Date.now(); o = o || {};
    var ch = nr(o.ch), tip = nr(o.tipic);
    if (ch === null) return { mesaj: null, stare: st || null };
    var prag = Math.max(3, tip !== null ? 2 * tip : 0), a = Math.abs(ch);
    if (a < prag) return { mesaj: null, stare: st || null };
    var zi = ziRo(acum), s = st && st.zi === zi ? { zi: zi, sus: st.sus || 0, jos: st.jos || 0 } : { zi: zi, sus: 0, jos: 0 }, dir = ch > 0 ? "sus" : "jos";
    if (s[dir] && a < 2 * s[dir]) return { mesaj: null, stare: st };
    s[dir] = a;
    var ea = o.fel === "monedă" ? "ei" : "ei", fer = o.fel === "monedă" ? "pe 24 h" : "pe zi";
    return { stare: s, mesaj: { cheie: "miscare-" + (o.cheie || o.nume), nivel: "atentie",
      titlu: (o.nume || "?") + ": " + (ch > 0 ? "urcă" : "scade") + " " + (ch > 0 ? "+" : "−") + V1(a) + "% " + (o.fel === "monedă" ? "în 24 h" : "azi"),
      mesaj: msg((tip !== null ? "E " + V1(a / tip) + "× mișcarea " + ea + " obișnuită (" + V1(tip) + "% " + fer + ")" : "Peste pragul de 3%") + (nr(o.pret) !== null ? "; prețul " + pret(nr(o.pret)) : "") + ".",
        "M-aș uita " + (o.fel === "monedă" ? "în Tabloul botului" : "în Trading 212") + " înainte să fac ceva: o mișcare mare nu cere singură o decizie.") } };
  }
  // Schimbarea "vremii pietei" (Home): crypto (liniste/amestecat/miscare), Nasdaq (larga/ingusta/lateral/scade/frica)
  // si legatura BTC - bursa (urmeaza >= 0,5 / separat < 0,3). O schimbare se anunta abia cand se confirma de 2 ori la rand.
  var RAU = { miscare: 1, scade: 1, frica: 1 };
  function schimbareVreme(st, o, acum) {
    o = o || {}; var n = st ? JSON.parse(JSON.stringify(st)) : {}, mesaje = [], init = !st;
    [["crypto", "Crypto"], ["bursa", "Nasdaq"]].forEach(function (p) {
      var v = o[p[0]], niv = v && v.nivel; if (!niv || niv === "fara-date") return;
      var c = n[p[0]] || null;
      if (init || !c) { n[p[0]] = { nivel: niv, cand: null }; return; }
      if (niv === c.nivel) { c.cand = null; return; }
      if (c.cand === niv) {
        // v100.70 (revizia pachetului 3, I4): eticheta fara emoji si fara majuscule de strigat - nivelul il da culoarea alertei
        mesaje.push({ cheie: "vreme-" + p[0], nivel: RAU[niv] ? "critic" : "info", titlu: p[1] + ": " + String(v.eticheta || niv).replace(/^[^\p{L}]+/u, "").toLowerCase(), mesaj: msg(v.titlu || "", v.faCe ? mare(v.faCe) : null) });
        n[p[0]] = { nivel: niv, cand: null };
      } else c.cand = niv;
    });
    var r = o.corelatie ? nr(o.corelatie.r) : null;
    if (r !== null) {
      var cur = n.cor ? n.cor.stare : null, tinta = r >= 0.5 ? "urmeaza" : r < 0.3 ? "separat" : cur;
      if (init || !n.cor) n.cor = { stare: r >= 0.5 ? "urmeaza" : "separat", cand: null };
      else if (tinta === n.cor.stare) n.cor.cand = null;
      else if (n.cor.cand === tinta) {
        mesaje.push({ cheie: "vreme-corelatie", nivel: "info", titlu: tinta === "urmeaza" ? "BTC urmează bursa acum (" + r.toFixed(2).replace(".", ",") + ")" : "BTC merge din nou pe drumul lui (" + r.toFixed(2).replace(".", ",") + ")",
          mesaj: tinta === "urmeaza" ? msg("Pe ultimele 30 de zile de bursă BTC se mișcă odată cu Nasdaq: o scădere a bursei trage și crypto.", "M-aș uita la VIX și la Nasdaq înainte să pornesc boți long.") : "Bursa nu mai trage BTC după ea: crypto se judecă din nou pe datele lui." });
        n.cor = { stare: tinta, cand: null };
      } else n.cor.cand = tinta;
    }
    return { mesaje: mesaje, stare: n };
  }

  return { miscareNeobisnuita: miscareNeobisnuita, schimbareVreme: schimbareVreme, evalueaza: evalueaza, reguli: reguli, grila: grila, podeaUrca: podeaUrca, preturi: preturi, anuntatPreturi: anuntatPreturi, slotRaport: slotRaport, raportBoti: raportBoti };
})();
if (typeof globalThis !== "undefined") globalThis.Alerte = Alerte;
