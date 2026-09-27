// Semnalele botului (v82) - modul pur, probat in scripts/semnale-v82.mjs. Il folosesc
// Tabloul (ce vezi acum) si colectorul de acasa (le calculeaza 24/7, le noteaza si le
// judeca dupa 24 h - "socoteala"). Se incarca DUPA grid-calcul.js.
//
//   semafor      - TINE / ATENTIE / IESI, din tot ce stim, cu motivul si "ce as face eu"
//   mutaGridul   - pretul la marginea intervalului sau afara >= 2 h -> gridul nou din fisa
//   btcAvertizare- BTC in miscare, moneda botului inca linistita (altcoinii urmeaza des BTC)
//   aglomerare   - funding mare + OI in crestere + multi pe partea botului -> risc de curatare
//   iaProfit     - totalul pe plus si linistea se termina -> incaseaza inainte sa-l manance pozitia
//   noteaza/judeca/socoteala - fiecare semnal isi tine socoteala: avea dreptate dupa 24 h?
// Nimic de aici nu prezice directia; spune stari masurate si ce as face eu (decizia e a lui).
var SemnaleBot = (function () {
  "use strict";
  var G = GridCalcul, ORA = 3600000;

  function nr(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v !== "string" || !v.trim()) return null;
    var x = Number(v); return isFinite(x) ? x : null;
  }
  var X = function (v) { return v.toFixed(1).replace(".", ",") + "×"; };
  var P = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + " USDT"; };

  function mutaGridul(b, f, afaraOre) {
    if (!b || !f || !f.setare) return null;
    var p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus);
    if (p === null || jos === null || sus === null || !(sus > jos)) return null;
    var motiv = null;
    if (p >= jos && p <= sus) {
      var poz = (p - jos) / (sus - jos);
      if (poz < 0.1) motiv = "prețul stă la marginea de jos a gridului (" + P(poz) + " din interval)";
      else if (poz > 0.9) motiv = "prețul stă la marginea de sus a gridului (" + P(poz) + " din interval)";
    } else if ((nr(afaraOre) || 0) >= 2) motiv = "prețul e în afara gridului de " + nr(afaraOre).toFixed(1).replace(".", ",") + " ore";
    if (!motiv) return null;
    var s = f.setare;
    return { nivel: "atentie", motiv: motiv, setare: { dir: s.dir || f.dir, jos: s.jos, sus: s.sus, grile: s.grile, levier: s.levier, stop: s.stop || null } };
  }

  function btcAvertizare(btc, moneda) {
    if (!btc || !btc.miscare || !moneda || moneda.miscare) return null;
    var r = Math.max(nr(btc.r4h) || 0, nr(btc.r24h) || 0);
    return { nivel: "atentie", text: "BTC a intrat în mișcare (" + X(r) + " față de obișnuitul lui), iar moneda botului încă e liniștită. Altcoinii urmează des BTC." };
  }

  function aglomerare(fut, dir) {
    if (!fut || (dir !== "long" && dir !== "short")) return null;
    var f = nr(fut.funding), ls = nr(fut.longShort), oi = null, h = Array.isArray(fut.oiHist5m) ? fut.oiHist5m : [];
    if (h.length >= 2) {
      var a = nr(h[0] && h[0].sumOpenInterest), z = nr(h[h.length - 1] && h[h.length - 1].sumOpenInterest);
      if (a > 0 && z !== null) oi = z / a - 1;
    }
    var semn = dir === "long" ? 1 : -1, c = [];
    if (f !== null && semn * f >= 0.0003) c.push("funding " + (f * 100).toFixed(3) + "% la 8 ore (de " + (Math.abs(f) / 0.0001).toFixed(0) + "× cel obișnuit)");
    if (oi !== null && oi >= 0.15) c.push("open interest +" + P(oi) + " în ultimele ore");
    if (ls !== null && (dir === "long" ? ls >= 1.5 : ls <= 1 / 1.5)) c.push("raportul long/short " + ls.toFixed(2));
    if (c.length < 2) return null;
    return { nivel: c.length >= 3 ? "atentie" : "info", oiSchimb: oi, text: "Mulțimea e înghesuită pe " + dir + ", ca botul tău: " + c.join(", ") + ". Asta crește riscul unei curățări bruște în sens opus." };
  }

  // v96.3: miscarea e CU botul (long + urca, short + coboara), CONTRA sau fara sens (bot neutru / fara miscare).
  // Masurat 27.09 (scripts/grid-directie-real.mjs, 40 monede, 6480 ferestre): dupa miscare cu botul 59% pe plus,
  // contra 50%, liniste 56% - nimic dovedit, dar nici o paguba vazuta pe miscarea cu botul.
  function sensFata(b, rg) {
    var d = String(b && b.directie || "").toLowerCase(), s = rg && rg.miscare ? rg.sens : null;
    if (!s || (d !== "long" && d !== "short")) return null;
    return (d === "long") === (s === "urca") ? "cu" : "contra";
  }
  function iaProfit(b, f) {
    var tot = nr(b && b.profitTotal), inv = nr(b && b.investit);
    if (!f || tot === null || !(inv > 0) || tot / inv < 0.02) return null;
    var misc = f.regim && f.regim.miscare && sensFata(b, f.regim) !== "cu", rar = f.liniste && f.liniste.linisteAcum && f.liniste.suficient && f.liniste.p !== null && f.liniste.p < 0.35;
    if (!misc && !rar) return null;
    return { nivel: "atentie", text: "Totalul e " + U(tot) + " (" + P(tot / inv) + " din investiție), iar " + (misc ? "a început o mișcare mare" : "liniștea ține rar mult pe moneda asta") + ". Aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău)." };
  }

  // pasii cand piata merge cu botul: fara bani in plus, opritor la pretul de zero, cat mai e pana la margine
  function pasiCuBotul(b, dir, zero) {
    var p = nr(b.pretCurent), sus = nr(b.gridSus), jos = nr(b.gridJos), pz = zero ? nr(zero.pretZero) : null, op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
    var fmt = function (v) { return v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); }, t = ["L-aș lăsa să lucreze, fără bani în plus: pe drum grilele " + (dir === "long" ? "de sus" : "de jos") + " încasează, iar poziția se micșorează."];
    var peProfit = pz !== null && p !== null && (dir === "long" ? pz < p : pz > p);
    if (peProfit) {
      var ok = op !== null && (dir === "long" ? op >= pz : op <= pz);
      t.push(ok ? "Opritorul tău (" + numeOp(b, op, fmt) + ") e deja dincolo de prețul de zero (" + fmt(pz) + "): o întoarcere nu te mai poate duce pe minus." : "Aș muta opritorul de pierdere la prețul de zero (" + fmt(pz) + "), ca o întoarcere să nu transforme câștigul în pierdere.");
    }
    var marg = dir === "long" ? sus : jos;
    if (marg !== null && p !== null && p > 0) {
      var d = Math.abs(marg / p - 1) * 100, in_ = dir === "long" ? p < marg : p > marg;
      t.push(in_ ? "Până la marginea " + (dir === "long" ? "de sus" : "de jos") + " (" + fmt(marg) + ") mai sunt " + d.toFixed(1).replace(".", ",") + "%; dacă o trece, botul rămâne fără poziție și nu mai câștigă: atunci încasezi sau pornești din fișă un grid nou pe unde e prețul."
        : "Prețul a trecut de marginea " + (dir === "long" ? "de sus" : "de jos") + " (" + fmt(marg) + "): botul nu mai are poziție și nu mai câștigă — încasezi sau pornești din fișă un grid nou pe unde e prețul.");
    }
    t.push("Riscul e la întoarcere: gridul cumpără înapoi la fiecare grilă, de aceea contează opritorul.");
    return t.join(" ");
  }

  // v97.5: opritorul cum l-a pus el - in procente (Pionex "profit_ratio") sau in pret
  function numeOp(b, op, fmt) { var r = nr(b && b.opritorPierdereRaport); return b && b.opritorPierdereTip === "raport" && r !== null ? (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(2).replace(".", ",") + "% din investiție, ≈ " + fmt(op) : fmt(op); }
  function distPodea(x, p) { return (Math.abs(x / p - 1) * 100).toFixed(1).replace(".", ",") + "%"; }

  // intrare: { bot, fisa, plan (TabloExtra.planStare), costuri, btc, aglomerare, muta, iaProfit, zero? (TabloExtra.dacaInchizi) }
  function semafor(x) {
    var b = x.bot || {}, f = x.fisa || null, c = [], dist = nr(b.distantaLichidarePct), dir = String(b.directie || "").toLowerCase();
    if (dist !== null && Math.abs(dist) < 8) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la " + Math.abs(dist).toFixed(1) + "%", faCe: "Aș adăuga marjă sau aș închide acum; sub 8% nu mai e loc de răbdare." });
    else if (dist !== null && Math.abs(dist) < 15) c.push({ nivel: "atentie", cod: "lichidare", motiv: "lichidarea s-a apropiat la " + Math.abs(dist).toFixed(1) + "%", faCe: "N-aș mai lăsa poziția să crească; aș pregăti marja (vezi „Dacă adaug marjă”)." });
    var pl = x.plan;
    if (pl && Array.isArray(pl.atins)) {
      if (pl.atins.indexOf("minus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: pierderea a atins pragul de " + (pl.minus ? pl.minus.prag : "?") + " USDT", faCe: "Ieși acum, cum ai hotărât la rece." });
      if (pl.atins.indexOf("plus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: ținta de +" + (pl.plus ? pl.plus.prag : "?") + " USDT e atinsă",
        faCe: f && sensFata(b, f.regim) === "cu" ? "Ținta ta e atinsă și piața încă merge cu botul: încasezi cum ai hotărât la rece, sau muți ținta mai sus în „Planul tău”, conștient — nu o lăsa să treacă neobservată." : "Încasează acum, cum ți-ai propus." });
      if (pl.atins.indexOf("afara") >= 0) c.push({ nivel: "atentie", cod: "plan", motiv: "planul tău: prețul stă afară din grid peste pragul de ore", faCe: "Oprește botul și pornește unul nou din fișă, pe unde e prețul." });
    }
    var d = f && f.directie;
    if (d && (dir === "long" || dir === "short") && (d.tarie === "tare" || d.tarie === "mediu") && ((dir === "long" && d.dir === "short") || (dir === "short" && d.dir === "long")))
      c.push({ nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")", faCe: "N-aș adăuga bani; dacă se întărește, l-aș opri aproape de zero și aș porni pe direcția trendului." });
    var sf = f && f.regim ? sensFata(b, f.regim) : null, xMis = f && f.regim ? X(Math.max(f.regim.r4h || 0, f.regim.r24h || 0)) : "";
    if (f && f.regim && f.regim.miscare && sf !== "cu") c.push({ nivel: "atentie", cod: "miscare", motiv: "mișcare mare acum" + (sf === "contra" ? " împotriva botului" : "") + " (" + xMis + " față de obișnuit)", faCe: "Nu adăuga bani acum; lasă-l cât lichidarea e departe." });
    if (x.iaProfit) c.push({ nivel: "atentie", cod: "ia-profit", motiv: "e un moment bun să încasezi", faCe: "Aș închide pe plus acum și aș reporni doar când fișa zice iar 🟢." });
    if (x.muta) c.push({ nivel: "atentie", cod: "muta", motiv: x.muta.motiv, faCe: "Aș muta gridul: opresc și pornesc cu setările propuse mai jos." });
    if (x.costuri && x.costuri.netZi !== null && x.costuri.netZi !== undefined && x.costuri.netZi < 0) c.push({ nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc ce aduc grilele", faCe: "La următorul bot: levier mai mic sau grile mai rare." });
    if (x.btc) c.push({ nivel: "atentie", cod: "btc", motiv: "BTC a intrat în mișcare, moneda încă nu", faCe: "Aș fi pregătit: n-aș adăuga bani până nu vedem încotro trage BTC." });
    if (x.aglomerare && x.aglomerare.nivel === "atentie") c.push({ nivel: "atentie", cod: "aglomerare", motiv: "mulțimea e înghesuită pe partea botului", faCe: "Aș strânge riscul: marjă în plus sau o parte închisă, înainte de o curățare." });
    // v96.4 (27.09, alegerea lui: "tinta devine podea"): tinta de plus atinsa, dar conditiile sunt bune (niciun alt 🔴,
    // piata nu merge contra botului) -> nu "ieși", ci "pastreaz-o": opritorul la pretul la care totalul e exact tinta.
    var podea = pl && pl.plus && nr(pl.plus.podea), p0 = nr(b.pretCurent), op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
    var altIesi = c.some(function (y) { return y.nivel === "iesi" && y.cod !== "plan"; }) || (pl && Array.isArray(pl.atins) && pl.atins.indexOf("minus") >= 0);
    if (pl && Array.isArray(pl.atins) && pl.atins.indexOf("plus") >= 0 && !altIesi && sf !== "contra" && podea !== null && p0 !== null && (dir === "long" ? podea < p0 : dir === "short" ? podea > p0 : false)) {
      var tinta = pl.plus.prag, fp = function (v) { return v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); };
      // la adapost = opritorul lui pastreaza tinta (toleranta: 1% din tinta, min 5 centi - rotunjirea la pasul de pret Pionex)
      var opPast = nr(pl.plus.opritorPastreaza), tol = Math.max(0.05, tinta * 0.01);
      var laAdapost = op !== null && (opPast !== null ? opPast >= tinta - tol : (dir === "long" ? op >= podea : op <= podea)), ur = pl.plus.urca;
      // v96.5 opritorul care urca: la 1,5% de pret pastrezi mai mult decat tinta -> spune cat
      var urcaTxt = ur && (ur.opritorPastreaza === null || ur.opritorPastreaza < ur.pastrezi - 0.5) ? " Cu " + (ur.perna * 100).toFixed(1).replace(".", ",") + "% loc de respirație, opritorul la " + fp(ur.pret) + " îți păstrează +" + ur.pastrezi.toFixed(2).replace(".", ",") + " USDT" + (ur.opritorPastreaza !== null ? " (cel de acum păstrează " + (ur.opritorPastreaza >= 0 ? "+" : "−") + Math.abs(ur.opritorPastreaza).toFixed(2).replace(".", ",") + ")" : "") + "." : "";
      c = c.filter(function (y) { return !(y.cod === "plan" && y.nivel === "iesi"); });
      c.unshift(laAdapost
        ? { nivel: "podea", cod: "podea", motiv: "ținta ta de +" + tinta + " USDT e atinsă și e la adăpost: opritorul tău (" + numeOp(b, op, fp) + ")" + (opPast !== null ? " îți păstrează +" + opPast.toFixed(2).replace(".", ",") + " USDT dacă piața se întoarce" : " e dincolo de " + fp(podea) + ", unde totalul e exact +" + tinta),
            faCe: "L-aș lăsa să lucreze. O întoarcere te scoate tot cu cel puțin +" + tinta + " USDT." + (urcaTxt || " Pe măsură ce urcă, poți ridica opritorul; îți scriu pe Discord când merită.") }
        : { nivel: "atentie", cod: "podea", motiv: "ținta ta de +" + tinta + " USDT e atinsă — păstreaz-o",
            faCe: "Aș muta opritorul de pierdere din Pionex la " + fp(podea) + " (" + distPodea(podea, p0) + " de prețul de acum; acolo, închizând, totalul e exact +" + tinta + " USDT, după comision): câștigul nu se mai poate pierde, iar botul merge mai departe cât merge." + (Math.abs(podea / p0 - 1) < 0.02 ? " E aproape: o mișcare obișnuită îl poate atinge, deci practic încasezi +" + tinta + " curând; dacă vrei loc de respirație, pune-l mai departe și accepți ceva mai puțin decât ținta." : "") + urcaTxt + " Prețul ăsta se schimbă când botul cumpără sau vinde; panoul îl recalculează." });
    }
    var iesi = c.filter(function (y) { return y.nivel === "iesi"; }), at = c.filter(function (y) { return y.nivel === "atentie"; });
    var pod = c.filter(function (y) { return y.nivel === "podea"; })[0];
    if (!iesi.length && !at.length && pod) return { nivel: "tine", cod: "podea", motiv: pod.motiv, faCe: pod.faCe, componente: [] };
    var prim = iesi[0] || at[0];
    if (!prim && sf === "cu") return { nivel: "tine", cod: "cu-botul", motiv: "mișcarea e cu botul (" + xMis + " față de obișnuit): lucrează pentru tine", faCe: pasiCuBotul(b, dir, x.zero), componente: [] };
    if (!prim) return { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare acum", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară.", componente: [] };
    return { nivel: iesi.length ? "iesi" : "atentie", cod: prim.cod, motiv: prim.motiv, faCe: prim.faCe, componente: c };
  }

  // ---- socoteala: fiecare semnal se noteaza cand apare si se judeca dupa 24 h ----
  function noteaza(log, sem, total, acum) {
    log = Array.isArray(log) ? log.slice() : [];
    if (!sem) return log;
    var ult = log[log.length - 1];
    if (ult && ult.cod === sem.cod && ult.nivel === sem.nivel) return log;
    log.push({ t: acum, cod: sem.cod, nivel: sem.nivel, motiv: sem.motiv || "", total: nr(total), dreptate: null });
    return log.slice(-200);
  }
  // "atentie"/"iesi" au avut dreptate daca in 24 h totalul a scazut (iesirea ar fi salvat bani);
  // "tine" a avut dreptate daca totalul NU a scazut. Pragul: 0,5% din investitie (zgomot).
  function judeca(log, totalAcum, investit, acum) {
    var t = nr(totalAcum), prag = (nr(investit) || 0) * 0.005;
    if (t === null) return Array.isArray(log) ? log : [];
    return (Array.isArray(log) ? log : []).map(function (e) {
      if (e.dreptate !== null && e.dreptate !== undefined) return e;
      if (!(acum - e.t > 24 * ORA) || e.total === null) return e;
      var o = {}; for (var k in e) o[k] = e[k];
      // v97.1: "podea" si "cu-botul" spun tot "tine-l" (chiar cand podeaua e 🟡) -> se judeca drept "tine"
      o.dreptate = stai(e) ? t >= e.total - prag : t < e.total - prag;
      o.totalDupa = t; o.judecatLa = acum;
      return o;
    });
  }
  function stai(e) { return e.nivel === "tine" || e.cod === "podea" || e.cod === "cu-botul"; }
  // v97.1 (ideea 3, 27.09): si PE BANI - cat ar fi adus semnalul, urmat, in 24 h: "tine" = totalul de dupa minus cel de atunci,
  // "iesi / atentie" = ce pastrai iesind (totalul de atunci) minus ce a ramas daca stateai. Pozitiv = semnalul a ajutat.
  function socoteala(log) {
    var r = {};
    (Array.isArray(log) ? log : []).forEach(function (e) {
      var x = r[e.cod] || (r[e.cod] = { n: 0, judecate: 0, corecte: 0, rata: null, bani: 0, baniN: 0 });
      x.n++; if (e.dreptate === true || e.dreptate === false) { x.judecate++; if (e.dreptate) x.corecte++; }
      var a = nr(e.total), d = nr(e.totalDupa);
      if ((e.dreptate === true || e.dreptate === false) && a !== null && d !== null) { x.bani += stai(e) ? d - a : a - d; x.baniN++; }
    });
    Object.keys(r).forEach(function (k) { r[k].rata = r[k].judecate ? r[k].corecte / r[k].judecate : null; });
    return r;
  }

  // v97.1: "tinta devine podea" pe banii lui - prima data cand tinta a fost atinsa (in jurnalul de semnale) fata de acum
  function podeaPeBani(log, totalAcum) {
    var t = nr(totalAcum), l = Array.isArray(log) ? log : [], prima = null;
    for (var i = 0; i < l.length; i++) { var e = l[i]; if (e && (e.cod === "podea" || (e.cod === "plan" && /ținta/.test(e.motiv || ""))) && nr(e.total) !== null) { prima = e; break; } }
    if (!prima || t === null) return null;
    return { la: prima.t, laIesire: prima.total, acum: t, dif: t - prima.total };
  }

  return { podeaPeBani: podeaPeBani, sensFata: sensFata, pasiCuBotul: pasiCuBotul, semafor: semafor, mutaGridul: mutaGridul, btcAvertizare: btcAvertizare, aglomerare: aglomerare, iaProfit: iaProfit, noteaza: noteaza, judeca: judeca, socoteala: socoteala };
})();
if (typeof globalThis !== "undefined") globalThis.SemnaleBot = SemnaleBot;
