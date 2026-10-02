// pachetul 1 (sfaturi concise), semnale-bot.js - familia semaforului: ajutoarele de cifre, mutaGridul, btc, aglomerare, iaProfit,
// pasiCuBotul, semaforul (motiv ≤ 60 · faCe ≤ 110 la persoana I · deCe ≤ 160, o fraza)
export default [
  [`  var X = function (v) { return v.toFixed(1).replace(".", ",") + "×"; };
  var P = function (v) { return (v * 100).toFixed(1).replace(".", ",") + "%"; };
  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) + " USDT"; };`,
   `  // v100.61 (specul „sfaturi concise”): cifrele trec prin TextRo (virgula, minusul „−”); preturile raman cu fmtPret
  var X = function (v) { return TextRo.ori(v); };
  var P = function (v) { return TextRo.pct(v * 100); };
  var U = function (v) { return TextRo.usdt(v); };`],
  [`    var motiv = null;
    if (p >= jos && p <= sus) {
      var lm = laMargine(b, pm);
      if (lm && lm.parte) motiv = "prețul stă la marginea de " + lm.parte + " a gridului (" + P(lm.dist) + " până la ea, " + P(lm.poz) + " din interval"
        + (!lm.profil ? "; " + lm.sursa + ")"
          : ")" + (lm.fr !== null ? "; în 12 h moneda a ajuns atât de departe în " + Math.round(lm.fr * 100) + "% din jumătățile de zi" : "")
            + " (pragul: " + P(lm.prag) + (lm.plafonat ? ", plafonat la 15% din interval" : ", cât trece moneda în 12 h în 1 din 4 cazuri") + " — " + lm.sursa + ")");
    } else if ((nr(afaraOre) || 0) >= 2) motiv = "prețul e în afara gridului de " + nr(afaraOre).toFixed(1).replace(".", ",") + " ore";`,
   `    // v100.61: titlul = faptul cu cifra; pragul si frecventa in „de ce”; sursa profilului separat (Consilierul o arata sub motiv)
    var motiv = null, deCe = "", sursa = null;
    if (p >= jos && p <= sus) {
      var lm = laMargine(b, pm);
      if (lm && lm.parte) {
        motiv = "prețul la " + P(lm.dist) + " de marginea de " + lm.parte + " (" + P(lm.poz) + " din interval)";
        var prag = P(lm.prag) + (lm.plafonat ? ", plafonat la 15% din interval" : ", trecut în 1 din 4 jumătăți de zi");
        deCe = !lm.profil ? "Prag fix: 10% din interval (profilul monedei n-a venit încă)."
          : lm.fr !== null ? "În 12 h moneda a ajuns atât de departe în " + Math.round(lm.fr * 100) + "% din jumătățile de zi (prag " + prag + ")." : "Prag: " + prag + ".";
        sursa = lm.profil ? lm.sursa : null;
      }
    } else if ((nr(afaraOre) || 0) >= 2) motiv = "prețul e în afara gridului de " + TextRo.ore(nr(afaraOre) * ORA);`],
  [`    return { nivel: "atentie", motiv: motiv, parte: lm ? lm.parte : null, des: des,`,
   `    return { nivel: "atentie", motiv: motiv, deCe: deCe, sursa: sursa, parte: lm ? lm.parte : null, des: des,`],
  [`  var T = function (v) { return v === null || v === undefined ? "?" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };`,
   `  var T = function (v) { return v === null || v === undefined ? "?" : TextRo.num(Math.round(v * 10) / 10, 1); };`],
  [`    return { nivel: "atentie", text: "BTC a intrat în mișcare (" + X(r) + " față de obișnuitul lui), iar moneda botului încă e liniștită. Altcoinii urmează des BTC." };`,
   `    return { nivel: "atentie", r: r, text: "BTC în mișcare (" + X(r) + " față de obișnuitul lui), moneda botului încă liniștită; altcoinii urmează des BTC." };`],
  [`    if (f !== null && semn * f >= 0.0003) c.push("funding " + (f * 100).toFixed(3) + "% la 8 ore (de " + (Math.abs(f) / 0.0001).toFixed(0) + "× cel obișnuit)");
    if (oi !== null && oi >= 0.15) c.push("open interest +" + P(oi) + " în ultimele ore");
    if (ls !== null && (dir === "long" ? ls >= 1.5 : ls <= 1 / 1.5)) c.push("raportul long/short " + ls.toFixed(2));
    if (c.length < 2) return null;
    return { nivel: c.length >= 3 ? "atentie" : "info", oiSchimb: oi, text: "Mulțimea e înghesuită pe " + dir + ", ca botul tău: " + c.join(", ") + ". Asta crește riscul unei curățări bruște în sens opus." };`,
   `    if (f !== null && semn * f >= 0.0003) c.push("funding " + TextRo.pct(f * 100, 3) + "/8 h (" + TextRo.num(Math.abs(f) / 0.0001, 0) + "× obișnuitul)");
    if (oi !== null && oi >= 0.15) c.push("open interest +" + P(oi));
    if (ls !== null && (dir === "long" ? ls >= 1.5 : ls <= 1 / 1.5)) c.push("long/short " + TextRo.num(ls, 2));
    if (c.length < 2) return null;
    return { nivel: c.length >= 3 ? "atentie" : "info", oiSchimb: oi, semne: c.length, dovezi: c.join(", "), text: "Mulțimea e înghesuită pe " + dir + ", ca botul: " + c.join(", ") + "; risc de curățare bruscă în sens opus." };`],
  [`    return { nivel: "atentie", text: "Totalul e " + U(tot) + " (" + P(tot / inv) + " din investiție), iar " + (misc ? "a început o mișcare mare" : "liniștea ține rar mult pe moneda asta") + ". Aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău)." };`,
   `    // v100.61: text = tot (Discord il trimite asa); totalul ca numere pentru titlul semaforului, cauza scurta pentru „de ce”
    var cauza = misc ? "A început o mișcare mare" : "Liniștea ține rar mult pe moneda asta";
    return { nivel: "atentie", total: tot, proc: tot / inv, deCe: cauza + ": aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău).",
      text: "Totalul e " + U(tot) + " (" + P(tot / inv) + " din investiție), iar " + cauza.charAt(0).toLowerCase() + cauza.slice(1) + ": aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău)." };`],
  [`  // pasii cand piata merge cu botul: fara bani in plus, opritor la pretul de zero, cat mai e pana la margine
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
  }`,
   `  // pasii cand piata merge cu botul (v100.61: o actiune + de ce): dupa margine -> incaseaza / grid nou din fisa; pe plus -> stopul la
  // zero-ul botului; altfel lasa-l, fara bani in plus. „Riscul e la întoarcere” e in legenda Consilierului (o data, nu in fiecare sfat).
  function pasiCuBotul(b, dir, zero) {
    var p = nr(b.pretCurent), sus = nr(b.gridSus), jos = nr(b.gridJos), pz = zero ? nr(zero.pretZero) : null, op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
    var parte = dir === "long" ? "de sus" : "de jos", marg = dir === "long" ? sus : jos, areMarg = marg !== null && p !== null && p > 0;
    var peProfit = pz !== null && p !== null && (dir === "long" ? pz < p : pz > p), ok = peProfit && op !== null && (dir === "long" ? op >= pz : op <= pz);
    var dupa = areMarg && !(dir === "long" ? p < marg : p > marg);
    var faCe = dupa ? "Aș încasa sau aș porni unul nou din fișă: prețul a trecut de marginea " + parte + " (" + fmtPret(marg) + ")."
      : peProfit && !ok ? "Aș muta stopul la zero-ul botului (" + fmtPret(pz) + "), fără bani în plus."
      : ok ? "L-aș lăsa să lucreze, fără bani în plus: stopul (" + numeOp(b, op, fmtPret) + ") e deja dincolo de zero."
      : "L-aș lăsa să lucreze, fără bani în plus.";
    var deCe = dupa ? "Botul nu mai are poziție și nu mai câștigă" + (peProfit && !ok ? "; stopul la zero-ul botului (" + fmtPret(pz) + ") păstrează ce ai" : "") + "."
      : "Pe drum grilele " + parte + " încasează și poziția scade" + (areMarg ? "; până la marginea " + parte + " (" + fmtPret(marg) + ") mai sunt " + TextRo.pct(Math.abs(marg / p - 1) * 100) + ", după ea botul rămâne fără poziție" : "") + ".";
    return { faCe: faCe, deCe: deCe };
  }`],
  [`  function distPodea(x, p) { return (Math.abs(x / p - 1) * 100).toFixed(1).replace(".", ",") + "%"; }`,
   `  function distPodea(x, p) { return TextRo.pct(Math.abs(x / p - 1) * 100); }`],
  [`    if (b.lichidareDepasita === true || (dist !== null && dist < 0)) c.push({ nivel: "iesi", cod: "lichidare", motiv: "prețul a trecut de lichidarea estimată" + (dist !== null ? " (" + Math.abs(dist).toFixed(1) + "% dincolo)" : ""), faCe: "Verifică acum botul în Pionex: poziția poate fi deja lichidată sau pe marginea ei; aș închide ce a rămas." });
    else if (dist !== null && Math.abs(dist) < 8) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la " + Math.abs(dist).toFixed(1) + "%", faCe: "Aș adăuga marjă sau aș închide acum; sub 8% nu mai e loc de răbdare." });`,
   `    // v100.61 (specul „sfaturi concise”): motiv = faptul cu cifra (≤ 60), faCe = o actiune la persoana I (≤ 110), deCe = de ce (≤ 160)
    if (b.lichidareDepasita === true || (dist !== null && dist < 0)) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea estimată e depășită" + (dist !== null ? " cu " + TextRo.pct(Math.abs(dist)) : ""), faCe: "Aș închide ce a rămas, după ce verific botul în Pionex.", deCe: "Poziția poate fi deja lichidată sau pe marginea ei." });
    else if (dist !== null && Math.abs(dist) < 8) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea la " + TextRo.pct(Math.abs(dist)), faCe: "Aș adăuga marjă sau aș închide botul acum.", deCe: "Sub 8% nu mai e loc de răbdare." });`],
  [`      c.push({ nivel: "atentie", cod: "lichidare", motiv: (apr ? "lichidarea s-a apropiat la " : "lichidarea e la ") + Math.abs(dist).toFixed(1) + "%" + (dep ? " și se îndepărtează (era " + Math.abs(dIn).toFixed(1) + "% acum o oră)" : apr ? " (era " + Math.abs(dIn).toFixed(1) + "% acum o oră)" : ""),
        // revizia 01.10 (I2): cand se indeparteaza nu are actiune proprie - „Ce aș face eu” vine de la urmatorul motiv (ex. pretul sub grid);
        // textul linistitor (faCeSlab) doar cand nu exista altul
        faCe: dep ? "" : "N-aș mai lăsa poziția să crească; aș pregăti marja (vezi „Dacă adaug marjă”).", faCeSlab: dep ? "Prețul se îndepărtează de lichidare: nimic de făcut acum; doar n-aș adăuga poziție până trece de 15%." : "" });`,
   `      c.push({ nivel: "atentie", cod: "lichidare", motiv: "lichidarea la " + TextRo.pct(Math.abs(dist)) + (dep || apr ? " · se " + (dep ? "îndepărtează" : "apropie") + " (" + TextRo.pct(Math.abs(dIn)) + " acum " + TextRo.ore(ORA) + ")" : ""),
        // revizia 01.10 (I2): cand se indeparteaza nu are actiune proprie - „Ce aș face eu” vine de la urmatorul motiv (ex. pretul sub grid);
        // textul linistitor (faCeSlab) doar cand nu exista altul
        faCe: dep ? "" : "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.", faCeSlab: dep ? "N-aș face nimic acum, doar n-aș adăuga poziție până trece de 15%." : "",
        deCe: dep ? "" : "Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”." });`],
  [`      if (pl.atins.indexOf("minus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: pierderea a atins pragul de " + (pl.minus ? pl.minus.prag : "?") + " USDT", faCe: "Ieși acum, cum ai hotărât la rece." });
      if (pl.atins.indexOf("plus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: ținta de +" + (pl.plus ? pl.plus.prag : "?") + " USDT e atinsă",
        faCe: f && sensFata(b, f.regim) === "cu" ? "Ținta ta e atinsă și piața încă merge cu botul: încasezi cum ai hotărât la rece, sau muți ținta mai sus în „Planul tău”, conștient — nu o lăsa să treacă neobservată." : "Încasează acum, cum ți-ai propus." });
      if (pl.atins.indexOf("afara") >= 0) c.push({ nivel: "atentie", cod: "plan", motiv: "planul tău: prețul stă afară din grid peste pragul de ore", faCe: "Oprește botul și pornește unul nou din fișă, pe unde e prețul." });`,
   `      if (pl.atins.indexOf("minus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: pragul de −" + (pl.minus ? pl.minus.prag : "?") + " USDT e atins", faCe: "Aș închide botul acum, cum ai hotărât la rece." });
      // „ținta” ramane in motiv: podeaPeBani gaseste prima „țintă atinsă” dupa el
      var cuB = f && sensFata(b, f.regim) === "cu";
      if (pl.atins.indexOf("plus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: ținta de +" + (pl.plus ? pl.plus.prag : "?") + " USDT e atinsă",
        faCe: cuB ? "Aș încasa acum sau aș muta ținta mai sus în „Planul tău”, conștient." : "Aș închide botul pe plus acum, cum ți-ai propus.",
        deCe: cuB ? "Piața încă merge cu botul, dar ținta nu trebuie să treacă neobservată." : "" });
      if (pl.atins.indexOf("afara") >= 0) c.push({ nivel: "atentie", cod: "plan", motiv: "planul tău: în afara gridului peste pragul de ore", faCe: "Aș închide botul și aș porni unul nou din fișă, pe unde e prețul." });`],
  [`      c.push({ nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")", faCe: "N-aș adăuga bani; dacă se întărește, l-aș opri aproape de zero și aș porni pe direcția trendului." });`,
   `      c.push({ nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")", faCe: "N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend." });`],
  [`    if (f && f.regim && f.regim.miscare && sf !== "cu") c.push({ nivel: "atentie", cod: "miscare", motiv: "mișcare mare acum" + (sf === "contra" ? " împotriva botului" : "") + " (" + xMis + " față de obișnuit)", faCe: "Nu adăuga bani acum; lasă-l cât lichidarea e departe." });
    if (x.iaProfit) c.push({ nivel: "atentie", cod: "ia-profit", motiv: "e un moment bun să încasezi", faCe: "Aș închide pe plus acum și aș reporni doar când fișa zice iar 🟢." });
    if (x.muta) c.push({ nivel: "atentie", cod: "muta", motiv: x.muta.motiv, parte: x.muta.parte || null, faCe: "Aș muta gridul: opresc și pornesc cu setările propuse mai jos." });
    if (x.costuri && x.costuri.netZi !== null && x.costuri.netZi !== undefined && x.costuri.netZi < 0) c.push({ nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc ce aduc grilele", faCe: "La următorul bot: levier mai mic sau grile mai rare." });
    if (x.btc) c.push({ nivel: "atentie", cod: "btc", motiv: "BTC a intrat în mișcare, moneda încă nu", faCe: "Aș fi pregătit: n-aș adăuga bani până nu vedem încotro trage BTC." });
    if (x.aglomerare && x.aglomerare.nivel === "atentie") c.push({ nivel: "atentie", cod: "aglomerare", motiv: "mulțimea e înghesuită pe partea botului", faCe: "Aș strânge riscul: marjă în plus sau o parte închisă, înainte de o curățare." });`,
   `    if (f && f.regim && f.regim.miscare && sf !== "cu") c.push({ nivel: "atentie", cod: "miscare", motiv: "mișcare mare" + (sf === "contra" ? " împotriva botului" : "") + " (" + xMis + " față de obișnuit)", faCe: "N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe." });
    var ip = x.iaProfit, ipT = ip && nr(ip.total) !== null ? ": totalul " + U(ip.total) + (nr(ip.proc) !== null ? " (" + P(ip.proc) + ")" : "") : "";
    if (ip) c.push({ nivel: "atentie", cod: "ia-profit", motiv: "moment bun de încasat" + ipT, faCe: "Aș închide botul pe plus și aș reporni când fișa zice iar 🟢.", deCe: ip.deCe || "" });
    if (x.muta) c.push({ nivel: "atentie", cod: "muta", motiv: x.muta.motiv, parte: x.muta.parte || null, faCe: "Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul.", deCe: x.muta.deCe || "", sursa: x.muta.sursa || null });
    if (x.costuri && x.costuri.netZi !== null && x.costuri.netZi !== undefined && x.costuri.netZi < 0) c.push({ nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc grilele: " + U(x.costuri.netZi) + " net/zi", faCe: "Aș lua levier mai mic sau grile mai rare la următorul bot." });
    var rB = x.btc ? nr(x.btc.r) : null;
    if (x.btc) c.push({ nivel: "atentie", cod: "btc", motiv: "BTC în mișcare" + (rB !== null ? " (" + X(rB) + " față de obișnuit)" : "") + ", moneda încă nu", faCe: "N-aș adăuga bani până nu se vede încotro trage BTC.", deCe: "Altcoinii urmează des BTC." });
    var ag = x.aglomerare, nS = ag ? nr(ag.semne) : null;
    if (ag && ag.nivel === "atentie") c.push({ nivel: "atentie", cod: "aglomerare", motiv: "mulțimea e înghesuită pe partea botului" + (nS !== null ? " (" + nS + " semne)" : ""), faCe: "Aș strânge riscul: aș adăuga marjă sau aș închide o parte.",
      deCe: ag.dovezi ? "Semnele: " + ag.dovezi + "; risc de curățare bruscă în sens opus." : ag.text || "" });`],
  [`      var tinta = pl.plus.prag, fp = function (v) { return v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); };
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
            faCe: "Aș muta opritorul de pierdere din Pionex la " + fp(podea) + " (" + distPodea(podea, p0) + " de prețul de acum; acolo, închizând, totalul e exact +" + tinta + " USDT, după comision): câștigul nu se mai poate pierde, iar botul merge mai departe cât merge." + (Math.abs(podea / p0 - 1) < 0.02 ? " E aproape: o mișcare obișnuită îl poate atinge, deci practic încasezi +" + tinta + " curând; dacă vrei loc de respirație, pune-l mai departe și accepți ceva mai puțin decât ținta." : "") + urcaTxt + " Prețul ăsta se schimbă când botul cumpără sau vinde; panoul îl recalculează." });`,
   `      var tinta = pl.plus.prag;
      // la adapost = opritorul lui pastreaza tinta (toleranta: 1% din tinta, min 5 centi - rotunjirea la pasul de pret Pionex)
      var opPast = nr(pl.plus.opritorPastreaza), tol = Math.max(0.05, tinta * 0.01);
      var laAdapost = op !== null && (opPast !== null ? opPast >= tinta - tol : (dir === "long" ? op >= podea : op <= podea)), ur = pl.plus.urca;
      // v96.5 opritorul care urca: la 1,5% de pret pastrezi mai mult decat tinta -> spune cat (v100.61: in „de ce”, langa actiune)
      var urcaTxt = ur && (ur.opritorPastreaza === null || ur.opritorPastreaza < ur.pastrezi - 0.5) ? "cu " + TextRo.pct(ur.perna * 100) + " loc de respirație, stopul la " + fmtPret(ur.pret) + " ar păstra " + U(ur.pastrezi) + (ur.opritorPastreaza !== null ? " (cel de acum: " + U(ur.opritorPastreaza) + ")" : "") : "";
      var aproape = Math.abs(podea / p0 - 1) < 0.02, mare1 = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
      c = c.filter(function (y) { return !(y.cod === "plan" && y.nivel === "iesi"); });
      c.unshift(laAdapost
        ? { nivel: "podea", cod: "podea", motiv: "ținta de +" + tinta + " USDT, atinsă și la adăpost",
            faCe: "L-aș lăsa să lucreze: stopul (" + numeOp(b, op, fmtPret) + ")" + (opPast !== null ? " păstrează " + U(opPast) + " la o întoarcere." : " e dincolo de " + fmtPret(podea) + ", unde totalul e +" + tinta + " USDT."),
            deCe: urcaTxt ? mare1(urcaTxt) + "." : "O întoarcere te scoate tot cu cel puțin +" + tinta + " USDT; îți scriu pe Discord când merită urcat stopul." }
        : { nivel: "atentie", cod: "podea", motiv: "ținta ta de +" + tinta + " USDT e atinsă — păstreaz-o",
            faCe: "Aș muta stopul la " + fmtPret(podea) + " (" + distPodea(podea, p0) + " de preț): închis acolo, totalul e +" + tinta + " USDT după comision.",
            deCe: aproape && urcaTxt ? "E aproape (o mișcare obișnuită îl atinge curând); " + urcaTxt + "."
              : aproape ? "E aproape: o mișcare obișnuită îl poate atinge curând, iar mai departe înseamnă ceva sub țintă."
              : urcaTxt ? mare1(urcaTxt) + "." : "Câștigul nu se mai poate pierde, iar botul merge mai departe cât merge." });`],
  [`    if (!iesi.length && !at.length && pod) return { nivel: "tine", cod: "podea", motiv: pod.motiv, faCe: pod.faCe, componente: [] };`,
   `    if (!iesi.length && !at.length && pod) return { nivel: "tine", cod: "podea", motiv: pod.motiv, faCe: pod.faCe, deCe: pod.deCe || "", componente: [] };`],
  [`    if (!prim && !f) return { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa monedei (trendul, mișcarea, gridul propus)", faCe: "Nu m-aș mișca până nu e gata fișa: din ea vin gridul propus și avertizările de mișcare. Lichidarea și planul tău se văd și fără ea.", componente: [] };
    if (!prim && sf === "cu") return { nivel: "tine", cod: "cu-botul", motiv: "mișcarea e cu botul (" + xMis + " față de obișnuit): lucrează pentru tine", faCe: pasiCuBotul(b, dir, x.zero), componente: [] };`,
   `    if (!prim && !f) return { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa monedei", faCe: "Nu m-aș mișca până e gata fișa.", deCe: "Din fișă vin gridul propus, trendul și mișcarea; lichidarea și planul tău se văd și fără ea.", componente: [] };
    if (!prim && sf === "cu") { var pc = pasiCuBotul(b, dir, x.zero); return { nivel: "tine", cod: "cu-botul", motiv: "mișcarea e cu botul: " + xMis + " față de obișnuit", faCe: pc.faCe, deCe: pc.deCe, componente: [] }; }`],
  [`    return { nivel: iesi.length ? "iesi" : "atentie", cod: prim.cod, motiv: prim.motiv, faCe: prim.faCe, componente: c };`,
   `    return { nivel: iesi.length ? "iesi" : "atentie", cod: prim.cod, motiv: prim.motiv, faCe: prim.faCe, deCe: prim.deCe || "", componente: c };`],
];
