// v100.313 (08.11.2026, el: „sfaturile care chiar contează evidențiază-le în Radar”, macheta aprobată): „CONTEAZĂ ACUM” = cel mult 3
// rânduri care pun BANI în joc azi, fiecare cu cifra lui mare. Modul pur, probat în scripts/proba-v100313.mjs. Nu decide nimic nou:
// ia sfaturile care există deja (Sfaturi: pericol / margine / zero; rândurile roșii din „Ce ai de făcut acum”) și cifra măsurată a stopului
// (CurbaStop.pentruStop). Lista de jos rămâne întreagă; cele urcate primesc acolo „↑ e și sus”.
// Ordinea, după banii în joc: critic (pericol critic, alertă roșie) → stopul ≥ 50 din 100 într-o zi → pericol de atenție → marginea →
// stopul 30–50 → ieșirea pe zero. Stopul intră de la 30 din 100 (sub, rămâne doar cifra lui pe rândul din grafic).
var Conteaza = (function () {
  "use strict";
  var PRAG = { stop: 0.3, rosu: 0.5 }, MAX = 3;
  var SUB_PERICOL = { lich: "lichidare", grid: "grid", status: "botul", activ: "botul" };
  function nr(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function TR() { return typeof TextRo !== "undefined" ? TextRo : null; }
  function num1(v) { var T = TR(); return T && T.num ? T.num(v, 1) : (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); }
  // prețul ca în Sfaturi (aceleași zecimale ca restul sfaturilor: 0.3300, 0.004123, 67250.00)
  function pret(v) { if (v === null || v === undefined) return "—"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : a >= 0.1 || a === 0 ? 4 : Math.min(12, 3 - Math.floor(Math.log10(a)))); }
  function din100(p) { return String(Math.max(1, Math.min(99, Math.round(p * 100)))); }   // „N din 100”: niciodată 0 sau 100
  function cate(n, u, m) { var T = TR(); return T && T.cate ? T.cate(n, u, m) : n + " " + m; }
  function pct1(f) { return (f < 0 ? "−" : f > 0 ? "+" : "") + num1(Math.abs(f * 100)) + "%"; }
  function cap(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
  // revizia 🟡1 (08.11): același fapt = același FEL de titlu (fără cifre) sau aceleași cuvinte - ca TabloExtra.ceAiDeFacut, care unește
  // alerta „Lichidarea la 12.0%” cu sfatul „lichidarea la 7.0%” într-un rând; în bloc rămâne primul pus (sfatul de acum)
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function fel(t) { return norm(t).replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
  function cuv(t) { return norm(t).split(" ").filter(function (w) { return w.length >= 4; }); }
  function acelasi(a, b) { if (fel(a) === fel(b)) return true; var A = cuv(a), B = cuv(b); if (!A.length || !B.length) return false; return A.filter(function (w) { return B.indexOf(w) >= 0; }).length >= Math.min(3, A.length, B.length); }
  function despartePrin(t) { var s = String(t || ""), i = s.indexOf("👉"); return i < 0 ? { sub: s.trim(), faCe: "" } : { sub: s.slice(0, i).trim(), faCe: s.slice(i + 2).trim() }; }

  // pragul pe cifra ARĂTATĂ (rotunjită): „~30” pe grafic intră, „~29” nu; „~50” e roșu (revizia, 08.11)
  function randStop(s) {
    var p = nr(s && s.p24); if (p === null) return null; var pc = Math.round(p * 100);
    if (pc < Math.round(PRAG.stop * 100)) return null;
    var rosu = pc >= Math.round(PRAG.rosu * 100), P = pret(s.stop), perechi = nr(s.perechi), zile = nr(s.zile) || 30, rap = nr(s.raport), mR = nr(s.mutRaport);
    // revizia 🟡4: stopul pus în procente din investiție se spune ca procent (prețul e doar cel de acum, se mută cu grilele)
    var et = rap !== null ? pct1(rap) + " din investiție, acum pe la " + P : P, iesire = rap !== null ? pct1(rap) : P;
    var mut = nr(s.mut20) === null ? null : rap === null ? "~" + pret(s.mut20) + " (acolo ~20 din 100 într-o zi)"
      : mR !== null ? "~" + pct1(mR) + " din investiție (acum pe la ~" + pret(s.mut20) + "; acolo ~20 din 100 într-o zi)" : null;
    return { cheie: "stop", ton: rosu ? "rosu" : "galben", grav: rosu ? 1 : 4, nr: din100(p), nrSub: "din 100 · 24 h",
      titlu: "Stopul tău (" + et + ") e atins într-o zi în ~" + din100(p) + " din 100 de cazuri",
      sub: "e la " + num1(s.d) + " ATR de preț" + (nr(s.p72) !== null ? " · în 3 zile: ~" + din100(s.p72) + " din 100" : "") + " · măsurat pe " + (perechi > 0 ? cate(perechi, "monedă", "monede") : "monedele mari")
        + ", ultimele " + cate(zile, "zi", "zile") + ", jos și sus la un loc (direcția nu se știe)" + (s.plafon ? " · plafonat la șansa marginii de " + (s.plafon === "sus" ? "sus" : "jos") + " (stopul e dincolo de ea)" : ""),
      faCe: mut !== null ? "Hotărăște acum: ori accepți ieșirea la " + iesire + ", ori muți stopul la " + mut + "."
        : "Hotărăște acum: ori accepți ieșirea la " + iesire + ", ori pui stopul mult mai departe." };
  }

  function alege(x) {
    x = x || {}; var out = [];
    var sanse = {}; (Array.isArray(x.sanse) ? x.sanse : []).forEach(function (r) { if (r && r.cod && nr(r.p) !== null) sanse[r.cod] = r.p; });
    var pune = function (it) { if (!it || out.some(function (o) { return acelasi(o.titlu, it.titlu); })) return; it.titlu = cap(it.titlu); out.push(it); };
    (Array.isArray(x.sfaturi) ? x.sfaturi : []).forEach(function (s) {
      if (!s || !s.titlu) return;
      if (s.cod === "pericol" && (s.ton === "critic" || s.ton === "atentie")) {
        pune({ cheie: "pericol", ton: s.ton === "critic" ? "rosu" : "galben", grav: s.ton === "critic" ? 0 : 2, nr: "!", nrSub: SUB_PERICOL[s.tip] || "pericol",
          titlu: s.titlu, sub: String(s.text || ""), faCe: String(s.faCe || ""), copiaza: s.copiaza });
      } else if (s.cod === "margine" && (s.ton === "critic" || s.ton === "atentie")) {
        var ps = sanse["iese-" + (s.parte === "sus" ? "sus" : "jos") + "-24"], are = nr(ps) !== null;
        pune({ cheie: "margine", ton: s.ton === "critic" ? "rosu" : "galben", grav: s.ton === "critic" ? 0 : 3,
          nr: are ? din100(ps) : nr(s.pctJos) !== null ? num1(s.pctJos) : "!", nrSub: are ? "din 100 · 24 h" : "% până la margine",
          titlu: s.titlu, sub: are ? "o atinge într-o zi în " + din100(ps) + " din 100 de cazuri (istoria monedei)" : "", faCe: String(s.faCe || ""), copiaza: s.copiaza });
      } else if (s.cod === "zero" && s.tpPus) {
        // v100.322 (el: „am pus TP dar Contează acum nu îl vede”): take-profit-ul pus = hotărârea e luată ⇒ rândul confirmă, verde, ultimul
        // revizia 11.11: verde doar când ieși pe plus sau practic pe zero (sfatul „bine”); dacă take-profit-ul închide sub zero, rămâne auriu, de urmărit
        var bine = s.ton === "bine";
        pune({ cheie: "zero", ton: bine ? "verde" : "galben", grav: bine ? 6 : 5, nr: "✓", nrSub: "take-profit pus", titlu: s.titlu, sub: String(s.text || ""), faCe: String(s.faCe || "") });
      } else if (s.cod === "zero" && s.iesire) {
        // v100.330 (el, 12.11: „Aș pune take-profit-ul … o prostie”): zero-ul urcă aici doar ca sfat de ieșire (cu motiv, botul de peste o oră,
        // pierderea ≥ 1% din bani); simplul fapt „botul iese pe zero la …” rămâne în lista de jos - nu pune bani în joc
        var z = nr(s.pctZero);
        pune({ cheie: "zero", ton: "galben", grav: 5, nr: z === null ? "0" : (z > 0 ? "+" : z < 0 ? "−" : "") + num1(Math.abs(z)), nrSub: "% până la zero",
          titlu: s.titlu, sub: String(s.text || ""), faCe: String(s.faCe || ""), copiaza: s.copiaza });
      }
    });
    (Array.isArray(x.lista) ? x.lista : []).forEach(function (r) {
      if (!r || r.c !== "r" || r.depasit || !r.titlu) return;
      var t = despartePrin(r.text);
      pune({ cheie: "alerta", ton: "rosu", grav: 0, nr: "!", nrSub: "alertă", titlu: String(r.titlu), sub: t.sub, faCe: t.faCe, copiaza: r.copiaza });
    });
    var st = randStop(x.stop); if (st) out.push(st);
    out.forEach(function (it, i) { it.ord = i; });
    out.sort(function (a, b) { return a.grav - b.grav || a.ord - b.ord; });
    return out.slice(0, MAX).map(function (it) { delete it.ord; return it; });
  }

  function html(l, esc) {
    if (!Array.isArray(l) || !l.length) return "";
    esc = esc || function (s) { return String(s); };
    return '<div class="ctCap"><b>CONTEAZĂ ACUM</b><span>doar ce pune bani în joc azi, cu cifra măsurată · toate sfaturile rămân în lista de mai jos</span></div>'
      + l.map(function (x) {
        var cop = Array.isArray(x.copiaza) && x.copiaza.length ? x.copiaza.map(function (c) {
          return '<button type="button" class="tbBtnLinie tbTodoCopiaza ctBtn" value="' + esc(c.pret) + '" data-action-click="gridCopiaza(this.value)" aria-label="Copiază prețul pentru ' + esc(c.ce) + ': ' + esc(c.pret) + '">copiază ' + esc(c.ce) + ' ' + esc(c.pret) + '</button>'; }).join("") : "";
        /* v100.322 (el, 11.11.2026: „îmbunătățește Contează acum”): câmpurile puse de app.js (tbConteazaImbogateste) - semnele (gravitatea, „nou”,
           cifra de data trecută, de când), banii la prețul rândului, butoanele potrivite. Fără ele, rândul e ca înainte. */
        var sem = Array.isArray(x.semne) && x.semne.length ? '<span class="ctSemne">' + x.semne.map(function (q) { return '<em class="' + esc(q.cls) + '">' + esc(q.text) + '</em>'; }).join("") + '</span>' : "";
        var but = Array.isArray(x.butoane) && x.butoane.length ? x.butoane.map(function (q) { return '<button type="button" class="tbBtnLinie ctBtn" data-action-click="' + esc(q.click) + '"' + (q.value != null ? ' value="' + esc(q.value) + '"' : "") + '>' + esc(q.text) + '</button>'; }).join("") : "";
        return '<div class="ctRand ' + (x.ton === "rosu" ? "ctRosu" : x.ton === "verde" ? "ctVerde" : "ctGalben") + '"><div class="ctNr">' + esc(x.nr) + '<small>' + esc(x.nrSub) + '</small></div><div class="ctTxt"><b>' + esc(x.titlu) + '</b>' + sem
          + (x.sub ? '<span>' + esc(x.sub) + '</span>' : "") + (x.bani ? '<span class="ctBani">' + esc(x.bani) + '</span>' : "") + (x.faCe ? '<p class="ctFac">👉 ' + esc(x.faCe) + '</p>' : "") + (cop || but ? '<div class="ctCopiere">' + cop + but + '</div>' : "") + '</div></div>';
      }).join("");
  }

  /* v100.322: cu bot, fără nimic de pus aici - cartela rămâne la locul ei (partea de sus nu mai sare) și spune când a verificat */
  function gol(ora) { return '<div class="ctCap"><b>CONTEAZĂ ACUM</b><span>doar ce pune bani în joc azi, cu cifra măsurată · toate sfaturile rămân în lista de mai jos</span></div><p class="ctGol">Nimic nu pune bani în joc acum' + (ora ? " · verificat la " + String(ora).replace(/[<>&"]/g, "") : "") + '</p>'; }

  // Acasă: doar stopul sau un rând roșu (ce cere o hotărâre azi); restul îl vezi în Tablou
  function acasa(l, nume) {
    if (!Array.isArray(l) || !l.length) return null;
    var x = l.filter(function (q) { return q.cheie === "stop" || q.ton === "rosu"; })[0]; if (!x) return null;
    // revizia 11.11: rândul verde („take-profit pus”) e o confirmare, nu ceva „de văzut” ⇒ nu se numără
    var t = x.cheie === "stop" ? x.titlu.replace(/^Stopul tău \(/, "stopul (") : x.titlu.charAt(0).toLowerCase() + x.titlu.slice(1), rest = l.filter(function (q) { return q !== x && q.ton !== "verde"; }).length;
    return { titlu: String(nume || "botul") + ": " + t, text: "👉 hotărăște în Tablou" + (rest > 0 ? " · încă " + rest + " de văzut acolo" : ""), ton: x.ton };
  }

  function titluriSus(l) { return (Array.isArray(l) ? l : []).filter(function (x) { return x.cheie !== "stop"; }).map(function (x) { return x.titlu; }); }

  return { PRAG: PRAG, alege: alege, html: html, gol: gol, acasa: acasa, titluriSus: titluriSus, pret: pret };
})();
