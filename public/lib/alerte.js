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
  var RANG = { ok: 0, atentie: 1, critic: 2 };
  var REPETA_MS = { atentie: 3 * 3600000, critic: 3600000 };
  var REPETA_CHEIE_MS = { "opritor:atentie": 24 * 3600000, miscare: 24 * 3600000, "s-ia-profit": 12 * 3600000, "s-muta": 12 * 3600000, "s-btc": 12 * 3600000, "s-aglomerare": 12 * 3600000,
    "m-btc": 12 * 3600000, "m-funding": 12 * 3600000, "p-zero": 12 * 3600000, "p-margine": 12 * 3600000 };   // semnalele se repeta rar
  // Histerezis: o alerta INTRA la un prag si IESE abia la unul mai larg, altfel
  // un bot care sta langa prag ar trimite un mesaj la fiecare minut (masurat:
  // 59/ora intre 14,9% si 15,1%). "A trecut" se spune doar dupa 10 minute stabile.
  var IESIRE = { lichAtentie: 17, lichCritic: 9.5 }, STABIL_MS = 10 * 60000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  function pret(v) { if (v === null) return "-"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : a >= 1 ? 4 : 5); }

  // Fiecare regula intoarce {nivel, titlu, mesaj} pentru starea de acum.
  function reguli(b, ctx, vechi) {
    vechi = vechi || {};
    var fost = function (k) { return (vechi[k] && vechi[k].nivel) || "ok"; };
    var out = {};
    var nume = String(b.baza || b.simbol || "botul").replace(/\.PERP$/, "");
    var dist = nr(b.distantaLichidarePct), dep = !!b.lichidareDepasita, pl = nr(b.pretLichidare);
    if (dep) out.lich = { nivel: "critic", titlu: nume + ": lichidarea e DEPĂȘITĂ", mesaj: "Prețul a trecut de prețul de lichidare estimat (" + pret(pl) + "). Verifică botul în Pionex acum." };
    else if (dist !== null && Math.abs(dist) < (fost("lich") === "critic" ? IESIRE.lichCritic : 8)) out.lich = { nivel: "critic", titlu: nume + ": lichidarea la " + Math.abs(dist).toFixed(1) + "%", mesaj: "Mai sunt " + Math.abs(dist).toFixed(1) + "% până la lichidare (" + pret(pl) + "). Sub 8% e zona de ieșire." };
    else if (dist !== null && Math.abs(dist) < (fost("lich") !== "ok" ? IESIRE.lichAtentie : 15)) out.lich = { nivel: "atentie", titlu: nume + ": lichidarea la " + Math.abs(dist).toFixed(1) + "%", mesaj: "Lichidarea s-a apropiat (" + pret(pl) + "). Sub 15% merită urmărit." };
    else if (dist !== null) out.lich = { nivel: "ok", titlu: nume + ": lichidarea s-a îndepărtat", mesaj: "Acum e la " + Math.abs(dist).toFixed(1) + "%." };
    else out.lich = null; // lipsa nu e siguranta: starea alertei ramane cum era

    var marja = String(b.stareMargine || "").toUpperCase(), risc = String(b.stareRisc || "").toUpperCase();
    var marjaRea = marja && marja !== "NORMAL", riscRau = risc && risc !== "TRADING";
    out.status = (!marja && !risc) ? null : (marjaRea || riscRau)
      ? { nivel: "critic", titlu: nume + ": Pionex raportează " + (marjaRea ? marja : risc), mesaj: "Starea botului la Pionex nu mai e normală (marja: " + (marja || "-") + ", risc: " + (risc || "-") + ")." }
      : { nivel: "ok", titlu: nume + ": starea Pionex e din nou normală", mesaj: "Marja " + (marja || "-") + ", risc " + (risc || "-") + "." };

    out.activ = typeof b.activ !== "boolean" ? null : b.activ === false
      ? { nivel: "atentie", titlu: nume + ": botul nu mai rulează", mesaj: "Pionex îl arată " + (b.stareInterna || b.stare || "oprit") + "." }
      : { nivel: "ok", titlu: nume + ": botul rulează din nou", mesaj: "" };

    var p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus);
    // iese din alerta abia cand pretul e inapoi in grid cu 1% din latime
    var marg = fost("grid") !== "ok" && jos !== null && sus !== null ? (sus - jos) * 0.01 : 0;
    var afara = p !== null && jos !== null && sus !== null && (p < jos + marg || p > sus - marg);
    out.grid = (p === null || jos === null || sus === null) ? null : afara
      ? { nivel: "atentie", titlu: nume + ": prețul a ieșit din grid", mesaj: "Prețul " + pret(p) + " e " + (p < jos ? "sub" : "peste") + " interval (" + pret(jos) + " - " + pret(sus) + "). Botul nu mai tranzacționează cât stă afară." }
      : { nivel: "ok", titlu: nume + ": prețul e din nou în grid", mesaj: p === null ? "" : "Prețul " + pret(p) + "." };

    if (ctx && ctx.fata4h) {
      out.directie = ctx.fata4h === "rau"
        ? { nivel: "atentie", titlu: nume + ": piața pe 4 ore merge împotriva botului", mesaj: "Pe barele închise de 4 ore piața " + (ctx.dir4h === "urca" ? "urcă" : "coboară") + ", iar botul e " + (b.directie || "?") + ". E o stare măsurată, nu o prognoză." }
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
      out.miscare = misc
        ? { nivel: "atentie", titlu: nume + ": mișcare mare — regimul în care gridul iese cel mai rău", mesaj: "Mișcarea pe 4 ore e " + x(rg.r4h) + "× cea obișnuită a monedei, pe 24 de ore " + x(rg.r24h) + "×. Dovedit: NU porni grid nou după mișcare. Dacă îl oprești pe ăsta, îți fixezi pierderea din direcție — hotărăști tu, uită-te la Tablou." }
        : { nivel: "ok", titlu: nume + ": liniște din nou", mesaj: "Mișcarea a coborât la " + x(rmax) + "× obișnuitul." };
    }

    // v81: planul LUI (prag pe plus / pe minus / afara din grid N ore), judecat de TabloExtra.planStare
    if (ctx && ctx.plan && Array.isArray(ctx.plan.atins)) {
      var at = ctx.plan.atins;
      if (at.indexOf("minus") >= 0) out.plan = { nivel: "critic", titlu: nume + ": planul tău — ieși (pierderea a atins " + (ctx.plan.minus ? ctx.plan.minus.prag : "pragul") + " USDT)", mesaj: "Ai hotărât dinainte să ieși aici. Aș face-o acum, în Pionex, fără să renegociez cu mine." };
      else if (at.indexOf("plus") >= 0) out.plan = { nivel: "atentie", titlu: nume + ": planul tău — ieși pe plus (" + (ctx.plan.plus ? "+" + ctx.plan.plus.prag : "pragul") + " USDT atins)", mesaj: "Ai atins ținta pe care ți-ai pus-o. Aș încasa acum." };
      else if (at.indexOf("afara") >= 0) out.plan = { nivel: "atentie", titlu: nume + ": planul tău — prețul e în afara gridului de peste " + (ctx.plan.afara ? ctx.plan.afara.prag : "?") + " ore", mesaj: "Ai hotărât să nu-l lași afară atât. Aș opri botul și aș face unul nou din fișă, pe unde e prețul." };
      else out.plan = { nivel: "ok", titlu: "", mesaj: "" };
    }

    // v82: semnalele actionabile (calculate de SemnaleBot in colector)
    if (ctx && ctx.semnale) {
      var sm = ctx.semnale;
      out["s-iesi"] = sm.semafor && sm.semafor.nivel === "iesi" ? { nivel: "critic", titlu: nume + ": semaforul zice IEȘI — " + sm.semafor.motiv, mesaj: "Ce aș face eu: " + sm.semafor.faCe } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-ia-profit"] = sm.iaProfit ? { nivel: "atentie", titlu: nume + ": moment bun să încasezi", mesaj: sm.iaProfit.text + " Ce aș face eu: aș închide pe plus acum." } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-muta"] = sm.muta ? { nivel: "atentie", titlu: nume + ": mută gridul — " + sm.muta.motiv, mesaj: "Gridul propus acum: " + sm.muta.setare.jos + " – " + sm.muta.setare.sus + ", " + sm.muta.setare.grile + " grile, " + sm.muta.setare.levier + "×. Setările de copiat sunt în Tablou." } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-btc"] = sm.btc ? { nivel: "atentie", titlu: nume + ": BTC a intrat în mișcare", mesaj: sm.btc.text + " Ce aș face eu: n-aș adăuga bani până nu vedem încotro trage BTC." } : { nivel: "ok", titlu: "", mesaj: "" };
      out["s-aglomerare"] = sm.aglomerare && sm.aglomerare.nivel === "atentie" ? { nivel: "atentie", titlu: nume + ": mulțimea e înghesuită pe partea botului", mesaj: sm.aglomerare.text } : { nivel: "ok", titlu: "", mesaj: "" };
    }

    // v91.11 (2): din "Mediul botului" (IndicatoriBot.mediu) - BTC pe 4h impotriva botului si funding-ul
    // mult peste obicei pe partea botului. Miscarea mare ramane pe regula ei masurata (out.miscare).
    // Fara date ("n-am ...") -> null: starea ramane cum era, nu se anunta un "a trecut" fals.
    if (ctx && Array.isArray(ctx.mediu)) {
      var gaseste = function (k) { for (var i = 0; i < ctx.mediu.length; i++) if (ctx.mediu[i] && ctx.mediu[i].k === k) return ctx.mediu[i]; return null; };
      var mb = gaseste("btc"), mf = gaseste("funding"), fara = function (m) { return !m || /^n-am/.test(String(m.text || "")); };
      out["m-btc"] = fara(mb) ? null : (mb.ton === "rau" || mb.ton === "atentie")
        ? { nivel: "atentie", titlu: nume + ": BTC pe 4 ore merge împotriva botului", mesaj: "BTC: " + mb.text + ". Monedele mici îl urmează de obicei. Ce aș face eu: n-aș adăuga bani în bot cât BTC trage împotrivă; dacă BTC intră în mișcare mare, fii gata să-l oprești." }
        : { nivel: "ok", titlu: nume + ": BTC nu mai merge împotriva botului", mesaj: "BTC: " + mb.text + "." };
      out["m-funding"] = fara(mf) ? null : mf.ton === "atentie"
        ? { nivel: "atentie", titlu: nume + ": funding-ul e mult peste obicei, pe partea botului", mesaj: "Funding: " + mf.text + ". Mulți s-au înghesuit pe aceeași parte: te costă mai mult și crește riscul unei căderi bruște. Ce aș face eu: n-aș mări botul acum." }
        : { nivel: "ok", titlu: nume + ": funding-ul a revenit la normal", mesaj: "Funding: " + mf.text + "." };
    }

    // v91.11 (4): pragurile puse de Radar pe fiecare bot
    // - "iese pe zero": pretul la care, inchis acum, botul iese fara pierdere (TabloExtra.dacaInchizi)
    var pz = ctx ? nr(ctx.pretZero) : null, dirB = String(b.directie || "").toLowerCase();
    if (pz !== null && p !== null && (dirB === "long" || dirB === "short")) {
      var peZero = fost("p-zero") !== "ok" ? (dirB === "long" ? p >= pz * 0.997 : p <= pz * 1.003) : (dirB === "long" ? p >= pz : p <= pz);
      out["p-zero"] = peZero
        ? { nivel: "atentie", titlu: nume + ": botul a ajuns pe zero (" + pret(pz) + ")", mesaj: "Prețul e " + pret(p) + ": dacă îl închizi acum, ieși fără pierdere (după comisionul de închidere). Hotărăști tu: îl lași să prindă grilele sau ieși." }
        : { nivel: "ok", titlu: "", mesaj: "" };
    }
    // - la 1% de o margine a gridului (inauntru); iese abia peste 1,5%. Afara din grid e regula "grid".
    if (p !== null && jos !== null && sus !== null) {
      var lim = fost("p-margine") !== "ok" ? 0.015 : 0.01, dj = (p - jos) / p, ds = (sus - p) / p;
      var langa = p >= jos && p <= sus && (dj < lim || ds < lim);
      out["p-margine"] = langa
        ? { nivel: "atentie", titlu: nume + ": prețul e la " + (Math.min(dj, ds) * 100).toFixed(1).replace(".", ",") + "% de marginea de " + (dj <= ds ? "jos (" + pret(jos) + ")" : "sus (" + pret(sus) + ")"), mesaj: "Dacă iese din grid, botul nu mai tranzacționează cât stă afară" + (dj <= ds ? " și poziția rămâne plină pe scădere." : ".") + " Uită-te la Tablou." }
        : { nivel: "ok", titlu: "", mesaj: "" };
    }

    var opritorStins = b.opritorPierdere != null && b.opritorPierdereActiv === false;
    // v87: intra sub 20% si iese abia peste 23% (sub 20% plus-minus nu mai "clipeste"); sub 10% urca la CRITIC;
    // cat sta "atentie" se repeta cel mult o data pe zi (REPETA_CHEIE_MS), nu la 3 ore.
    var fo = fost("opritor"), dA = dist !== null ? Math.abs(dist) : null;
    out.opritor = (opritorStins && dA !== null && dA < (fo !== "ok" ? 23 : 20))
      ? (dA < (fo === "critic" ? 11 : 10)
        ? { nivel: "critic", titlu: nume + ": opritorul e STINS și lichidarea e la " + dA.toFixed(1) + "%", mesaj: "Opritorul pe pierdere e setat la " + pret(nr(b.opritorPierdere)) + ", dar nu e pornit. 👉 Pornește-l în Pionex acum sau închide botul." }
        : { nivel: "atentie", titlu: nume + ": opritorul pe pierdere e STINS", mesaj: "E setat la " + pret(nr(b.opritorPierdere)) + ", dar nu e pornit, iar lichidarea e la " + dA.toFixed(1) + "%." })
      : (opritorStins && dA === null ? null : { nivel: "ok", titlu: "", mesaj: "" });
    return out;
  }

  // stare: { <cheie>: { nivel, la } } de data trecuta (sau {}).
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
          if (a.titlu) mesaje.push({ cheie: cheie, nivel: "info", titlu: a.titlu, mesaj: a.mesaj });
          nou[cheie] = { nivel: "ok", la: acum };
        } else nou[cheie] = { nivel: v.nivel, la: v.la, okDe: de };
        return;
      }
      var trimite = false;
      if (RANG[a.nivel] > RANG[v.nivel]) trimite = true;                       // s-a agravat
      else if (a.nivel !== "ok" && a.nivel === v.nivel && acum - v.la >= (REPETA_CHEIE_MS[cheie + ":" + a.nivel] || REPETA_CHEIE_MS[cheie] || REPETA_MS[a.nivel])) trimite = true; // persista
      if (trimite) mesaje.push({ cheie: cheie, nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj });
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
  function grila(b, vechi) {
    var c = contori(b), nume = String((b && (b.baza || b.simbol)) || "botul").replace(/\.PERP$/, ""), mesaje = [];
    if (!vechi || c.u === null || vechi.u === null || vechi.u === undefined || c.u < vechi.u || (c.per !== null && vechi.per !== null && c.per < vechi.per)) return { mesaje: mesaje, contori: c };
    var noiPer = c.per !== null && vechi.per !== null ? c.per - vechi.per : 0, noiU = c.u - vechi.u, p = nr(b.pretCurent);
    if (noiPer > 0) {
      var dg = c.g !== null && vechi.g !== null ? c.g - vechi.g : null, U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT"; };
      mesaje.push({ cheie: "grila", nivel: "info", titlu: "✅ " + nume + ": " + (noiPer === 1 ? "pereche încheiată" : noiPer + " perechi încheiate") + (dg !== null ? " " + U(dg) : ""),
        mesaj: "Grilele au adus " + (c.g !== null ? U(c.g) : "?") + " de la pornire (" + c.per + " perechi)." + (p !== null ? " Prețul " + pret(p) + "." : "") });
    } else if (noiU > 0) {
      var dir = String(b.directie || "").toLowerCase(), crescut = c.poz !== null && vechi.poz !== null ? Math.abs(c.poz) > Math.abs(vechi.poz) : null;
      var fapta = crescut === null ? "" : dir === "short" ? (crescut ? " — a vândut" : " — a cumpărat") : (crescut ? " — a cumpărat" : " — a vândut");
      mesaje.push({ cheie: "grila", nivel: "info", titlu: nume + ": " + (noiU === 1 ? "grilă atinsă" : noiU + " grile atinse") + fapta + (p !== null ? " la ~" + pret(p) : ""),
        mesaj: "Poziția e acum " + (c.poz !== null ? c.poz : "?") + ". Perechea se încheie când prețul ajunge la linia următoare în sens invers." });
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
      return { stare: n, mesaj: { nivel: "critic", titlu: "Crypto Radar nu mai primește prețurile de la Pionex", mesaj: "De " + Math.round(de / 60000) + " minute: " + n.eroare + ". Graficul, indicatorii, direcția pieței și clasamentul sunt goale, iar alertele de piață nu mai sunt de încredere. De obicei trece singur; dacă ține, repornește Radarul." } };
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

  return { evalueaza: evalueaza, reguli: reguli, grila: grila, preturi: preturi, anuntatPreturi: anuntatPreturi, slotRaport: slotRaport, raportBoti: raportBoti };
})();
if (typeof globalThis !== "undefined") globalThis.Alerte = Alerte;
