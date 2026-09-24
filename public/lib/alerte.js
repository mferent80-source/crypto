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
  var REPETA_CHEIE_MS = { miscare: 24 * 3600000 };   // miscarea se repeta cel mult o data pe zi
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

    var opritorStins = b.opritorPierdere != null && b.opritorPierdereActiv === false;
    out.opritor = (opritorStins && dist !== null && Math.abs(dist) < 20)
      ? { nivel: "atentie", titlu: nume + ": opritorul pe pierdere e STINS", mesaj: "E setat la " + pret(nr(b.opritorPierdere)) + ", dar nu e pornit, iar lichidarea e la " + Math.abs(dist).toFixed(1) + "%." }
      : { nivel: "ok", titlu: "", mesaj: "" };
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
      else if (a.nivel !== "ok" && a.nivel === v.nivel && acum - v.la >= (REPETA_CHEIE_MS[cheie] || REPETA_MS[a.nivel])) trimite = true; // persista
      if (trimite) mesaje.push({ cheie: cheie, nivel: a.nivel, titlu: a.titlu, mesaj: a.mesaj });
      // coborarea critic -> atentie NU reseteaza ceasul: o revenire rapida in critic nu e o agravare noua
      nou[cheie] = { nivel: a.nivel, la: trimite ? acum : (RANG[a.nivel] <= RANG[v.nivel] ? v.la : acum) };
    });
    return { mesaje: mesaje, stare: nou };
  }

  return { evalueaza: evalueaza, reguli: reguli };
})();
if (typeof globalThis !== "undefined") globalThis.Alerte = Alerte;
