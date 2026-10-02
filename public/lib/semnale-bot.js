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
  // v100.61 (specul „sfaturi concise”): cifrele trec prin TextRo (virgula, minusul „−”); preturile raman cu fmtPret
  var X = function (v) { return TextRo.ori(v); };
  var P = function (v) { return TextRo.pct(v * 100); };
  var U = function (v) { return TextRo.usdt(v); };
  // revizia Opus I4: valorile planului cum le-a scris el, dar cu virgula („7,5”, „15”, „15,75”)
  var Pl = function (v) { v = nr(v); return v === null ? "?" : TextRo.num(Math.abs(v), 2).replace(/,?0+$/, ""); };

  // v100.45 (pachetul 1): „lângă margine” din PROFILUL monedei - distanta pana la margine sub P75 al miscarii pe 12 h (moneda trece
  // de el in 1 din 4 jumatati de zi; pm = ProfilMoneda.praguriMargine, socotit de chemator), plafonat la 15% din interval (revizia
  // 01.10: cu 25%, pe gridurile inguste jumatate din interval era „la margine”). Fara profil: pragul fix de azi, 10% din interval.
  // Intoarce si frecventa adevarata (fr: in cate jumatati de zi moneda a ajuns atat de departe) si de unde vine pragul.
  function laMargine(b, pm) {
    var p = nr(b && b.pretCurent), jos = nr(b && b.gridJos), sus = nr(b && b.gridSus);
    if (p === null || jos === null || sus === null || !(sus > jos) || p < jos || p > sus) return null;
    var poz = (p - jos) / (sus - jos), dj = 1 - jos / p, ds = sus / p - 1;
    if (pm && nr(pm.jos) !== null && nr(pm.sus) !== null) {
      var cap = 0.15 * (sus - jos) / p, pj = Math.min(nr(pm.jos), cap), ps = Math.min(nr(pm.sus), cap);
      var parte = dj < pj && (ds >= ps || dj / pj <= ds / ps) ? "jos" : ds < ps ? "sus" : null, dist = parte === "sus" ? ds : parte === "jos" ? dj : Math.min(dj, ds);
      var fr = parte && typeof pm.frecventa === "function" ? nr(pm.frecventa(parte, dist)) : null;
      return { parte: parte, poz: poz, dist: dist, prag: parte === "sus" ? ps : pj, p75: parte === "sus" ? nr(pm.sus) : nr(pm.jos), plafonat: parte === "sus" ? ps < nr(pm.sus) : pj < nr(pm.jos), fr: fr, profil: true, sursa: pm.sursa || "profilul monedei" };
    }
    return { parte: poz < 0.1 ? "jos" : poz > 0.9 ? "sus" : null, poz: poz, dist: poz < 0.5 ? dj : ds, prag: null, profil: false, sursa: "prag fix: 10% din interval" };
  }
  function mutaGridul(b, f, afaraOre, pm) {
    if (!b || !f || !f.setare) return null;
    var p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus);
    if (p === null || jos === null || sus === null || !(sus > jos)) return null;
    // v100.61: titlul = faptul cu cifra; pragul si frecventa in „de ce”; sursa profilului separat (Consilierul o arata sub motiv)
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
    } else if ((nr(afaraOre) || 0) >= 2) motiv = "prețul e în afara gridului de " + TextRo.ore(nr(afaraOre) * ORA);
    if (!motiv) return null;
    // v99: setarea PROPUSA de fisa (deasa, 0,30% - v100.39: oricand proba n-o respinge), altfel cea aleasa de platou
    var s = f.propusa === "deasa" && f.deasa && f.deasa.setare ? f.deasa.setare : f.setare, des = f.propusa === "deasa";
    // v100.70 (revizia pachetului 3, I4): si cifrele separat (dist = cat mai e pana la margine, poz = unde e in interval) - titlul alertei
    // ia distanta (≤ 60), randul 1 pozitia (inainte motivul intreg era taiat in titlu la „…(12%…”)
    return { nivel: "atentie", motiv: motiv, deCe: deCe, sursa: sursa, parte: lm ? lm.parte : null, dist: lm && lm.parte ? P(lm.dist) : null, poz: lm && lm.parte ? P(lm.poz) : null,
      des: des, treceriZi: nr(des ? f.deasa.treceriZi : f.treceriZi),
      setare: { dir: s.dir || f.dir, jos: s.jos, sus: s.sus, grile: s.grile, levier: s.levier, stop: s.stop || null } };
  }
  // v99: geometria gridului botului (pasul lui in procente), fara TabloExtra: N grile din Pionex (row), geometric sau aritmetic
  function pasBot(b) {
    // v100.38 (30.09): PIONEX NUMARA LINIILE - „Număr de grile” / row = linii (jos si sus incluse), intervalele = row − 1 (dovedit pe ~2.000
    // de boti inchisi, loturile de la pornire, si pe botul CRV viu). Inainte se socotea pe row intervale - o linie in plus, toate decalate.
    var d = b && b.brut && b.brut.buOrderData || {}, linii = nr(d.row), N = linii !== null ? linii - 1 : null, jos = nr(b && b.gridJos), sus = nr(b && b.gridSus), p = nr(b && b.pretCurent);
    if (!(N >= 1) || !(jos > 0) || !(sus > jos)) return null;
    var geo = String(d.gridType || "").toLowerCase() === "geometric", ref = p > 0 ? p : (jos + sus) / 2;
    return { grile: linii, pas: geo ? Math.pow(sus / jos, 1 / N) - 1 : (sus - jos) / N / ref, mod: geo ? "geometric" : "aritmetic" };
  }
  var T = function (v) { return v === null || v === undefined ? "?" : TextRo.num(Math.round(v * 10) / 10, 1); };
  // v99 (cererea lui, 28.09): botul e mult mai RAR decat gridul des propus de fisa in liniste -> propunere cu cifre.
  // Nu e alerta (n-ar fi "urgent"), e o sugestie pe Tablou: gridurile rare sunt atinse rar; cu 0,30% a facut mai multi bani lateral.
  function gridMaiDes(b, f) {
    if (!b || !f || f.propusa !== "deasa" || !f.deasa || !f.deasa.setare) return null;
    var g = pasBot(b), s = f.deasa.setare;
    if (!g || !(s.pas > 0) || g.pas <= 1.5 * s.pas) return null;
    return { setare: s, pasBot: g.pas, pasDes: s.pas, grileBot: g.grile, treceriZi: nr(f.deasa.treceriZi),
      motiv: "gridul tău are " + g.grile + " grile la " + P(g.pas) + " pas; gridul des de 0,3% (" + (s.grile + 1) + " grile între " + fmtPret(s.jos) + " și " + fmtPret(s.sus) + ") încheia ~" + T(f.deasa.treceriZi) + " perechi pe zi pe ultimele 30 de zile" };
  }
  function fmtPret(v) { v = nr(v); if (v === null) return "?"; var s = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v > 0 && v < 1e-6 ? v.toFixed(Math.min(12, 3 - Math.floor(Math.log10(v)))) : v.toPrecision(4); return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  // v99: "Acum, concret" - trei randuri cu cifre, pe Tablou, sub verdict: STOPUL (unde e, unde l-as pune), GRIDUL (al lui vs
  // propus, treceri/zi, pozitia in interval), MISCAREA (x fata de obisnuit). Fara fisa spune ca o socoteste, nu inventeaza.
  // intrare: { bot, fisa, zero (TabloExtra.dacaInchizi), costuri (grileVsCosturi), geom (optional), acum }
  // v100.43 (I-467): banii de langa o actiune - x.bani = TabloExtra.cifreActiuni(...) (calculat in Tablou, unde sunt lumanarile)
  function textBaniStop(st) {
    if (!st) return "";
    var U2 = function (v) { return TextRo.usdt(v, 1); }, t = [];
    // opritorul LUI e deja mai strans decat propunerea -> nu-l impinge spre un stop mai larg (prins pe viu pe CRV: −10,2 vs −21,0)
    // v100.65 (pachetul 1, M4): stopul PE PLUS nu „pierde cel mult” - semnul ramane la vedere
    if (nr(st.laPropus) !== null && nr(st.laOpritor) !== null && nr(st.laOpritor) >= 0 && nr(st.laOpritor) > nr(st.laPropus)) return "💰 Stopul tău închide " + (nr(st.laOpritor) > 0 ? "pe plus (" + U2(nr(st.laOpritor)) + ")" : "fără pierdere") + ", mai bine decât cel propus (" + U2(nr(st.laPropus)) + "): l-aș lăsa unde e.";   // revizia 2b (9): exact pe zero
    if (nr(st.laPropus) !== null && nr(st.laOpritor) !== null && nr(st.laOpritor) > nr(st.laPropus)) return "💰 Stopul tău pierde cel mult " + TextRo.num(Math.abs(nr(st.laOpritor)), 1) + " USDT, mai puțin decât cel propus (" + TextRo.num(Math.abs(nr(st.laPropus)), 1) + " USDT): l-aș lăsa unde e.";
    if (nr(st.laPropus) !== null) t.push("💰 Pierderea maximă: " + (nr(st.laOpritor) !== null ? U2(nr(st.laOpritor)) + " cu stopul de acum" : "fără margine (n-ai stop activ)") + " → " + U2(nr(st.laPropus)) + " cu cel propus");
    if (nr(st.frecventa) !== null) t.push("ce cedezi: o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(st.frecventa) * 100) + "% din zile");
    return t.join(" · ");
  }
  function acumConcret(x) {
    var b = x.bot || {}, f = x.fisa || null, dir = String(b.directie || "").toLowerCase(), p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), out = [];
    var pz = x.zero ? nr(x.zero.pretZero) : null, op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null, tot = nr(b.profitTotal);
    var sp = f ? (f.propusa === "deasa" && f.deasa && f.deasa.setare ? f.deasa.setare : f.setare) : null, g = pasBot(b), rg0 = f && f.regim;
    var dist = function (a, c) { return a !== null && c > 0 ? P(Math.abs(a / c - 1)) : "?"; };
    // 1) stopul
    var pretStop = null, sursaStop = null, opTxt = op !== null ? fmtPret(op) : "nepus", neutru = dir !== "long" && dir !== "short";
    if (p !== null && pz !== null) {
      var peProfit = dir === "long" ? pz < p : dir === "short" ? pz > p : (tot !== null && tot > 0);
      if (neutru) {
        // botul neutru cumpara sub si vinde peste: zero-ul nu e "o parte" - e doar reper (revizia 28.09)
        out.push({ cod: "stop", titlu: "Stopul", text: "Stopul tău: " + opTxt + ". Botul neutru cumpără sub preț și vinde peste, deci zero-ul (" + fmtPret(pz) + ", la " + dist(pz, p) + " de preț) e doar reper; " + (peProfit ? "ești pe plus: un stop la o grilă în afara intervalului, pe ambele părți, păstrează ce ai." : "ești pe minus: protecția stă la o grilă în afara intervalului, pe ambele părți, dar se închide pe minus.") });
      } else if (peProfit) {
        var dincolo = op !== null && (dir === "long" ? op >= pz : op <= pz);
        pretStop = dincolo ? null : pz;   // v100.43 (I-467): pretul la care propun stopul
        out.push({ cod: "stop", titlu: "Stopul", text: dincolo
          ? "Stopul tău: " + opTxt + ", deja dincolo de zero-ul botului (" + fmtPret(pz) + "): o întoarcere nu te mai poate duce pe minus; l-aș lăsa, iar pe măsură ce " + (dir === "short" ? "coboară, îl cobor" : "urcă, îl ridic") + "."
          : "Stopul tău: " + opTxt + " → l-aș muta la " + fmtPret(pz) + " (zero-ul botului, la " + dist(pz, p) + " de preț): de acolo câștigul nu se mai pierde. În Pionex: botul → Edit → Stop loss price." });
      } else {
        // pe minus: LONG pierde in jos -> protectia sub gridul de jos; SHORT pierde in SUS -> protectia peste gridul de sus (revizia 28.09: era inversat la short)
        var protectie = dir === "short"
          ? (sp && sp.stop && nr(sp.stop.sus) !== null ? sp.stop.sus : (sus !== null && g ? sus * (1 + g.pas) : null))
          : (sp && sp.stop && nr(sp.stop.jos) !== null ? sp.stop.jos : (jos !== null && g ? jos * (1 - g.pas) : null));
        // v100.45 (pachetul 1): stopul dincolo de cat merge moneda impotriva botului intr-o zi, in 3 din 4 zile (x.pragStop din
        // profil), daca asta e mai departe decat protectia fisei; altfel ramane a fisei
        var psD = x.pragStop ? nr(x.pragStop.dist) : null;
        if (psD !== null && psD > 0 && p !== null) {
          var dinProfil = dir === "short" ? p * (1 + psD) : p * (1 - psD);
          // revizia 01.10: doar DINCOLO de marginea de pierdere (fara fisa si fara geometrie, o zi obisnuita poate cadea in grid)
          var dincoloMg = dir === "short" ? sus !== null && dinProfil > sus : jos !== null && dinProfil < jos;
          if (dincoloMg && (protectie === null || (dir === "short" ? dinProfil > protectie : dinProfil < protectie))) { protectie = dinProfil; sursaStop = "dincolo de cât " + (dir === "short" ? "urcă" : "coboară") + " moneda într-o zi, în 3 din 4 zile (" + x.pragStop.sursa + ")"; }
          else if (protectie !== null) sursaStop = "stopul fișei e deja dincolo de o zi obișnuită (" + x.pragStop.sursa + ")";
        }
        pretStop = protectie;   // v100.43 (I-467)
        out.push({ cod: "stop", titlu: "Stopul", text: "Stopul tău: " + opTxt + ". Zero-ul botului e la " + fmtPret(pz) + " (" + dist(pz, p) + " " + (dir === "short" ? "sub" : "peste") + " preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi " + (dir === "short" ? "peste gridul de sus, la " : "sub gridul de jos, la ") + (protectie !== null ? fmtPret(protectie) : "o grilă în afara marginii") + ", dar se închide pe minus." });
      }
    } else out.push({ cod: "stop", titlu: "Stopul", text: neutru ? "Stopul tău: " + opTxt + ". Botul neutru cumpără sub preț și vinde peste: n-are un zero pe o singură parte, deci protecția stă la o grilă în afara intervalului, pe ambele părți." : "Stopul tău: " + opTxt + ". Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul)." });
    // 2) gridul
    var poz = p !== null && jos !== null && sus !== null && sus > jos ? (p - jos) / (sus - jos) : null, c = x.costuri || {};
    var al = g ? "Al tău: " + g.grile + " grile la " + P(g.pas) + " pas (net " + P(g.pas - 2 * G.C.COMISION_GRILA) + ")" : "Al tău: fără geometrie citită";
    var azi = c.umpleri24h !== null && c.umpleri24h !== undefined ? ", " + c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : "";
    var unde = poz === null ? "" : poz < 0 ? " Prețul e sub gridul de jos cu " + dist(jos, p) + " (botul nu mai cumpără; " + dist(sus, p) + " până sus)." : poz > 1 ? " Prețul e peste gridul de sus cu " + dist(sus, p) + " (botul a rămas fără poziție; " + dist(jos, p) + " până jos)."
      : " Prețul e la " + P(poz) + " din interval: " + dist(jos, p) + " până jos, " + dist(sus, p) + " până sus.";
    var pzi = nr(f && (f.propusa === "deasa" && f.deasa ? f.deasa.treceriZi : f.treceriZi));
    var prop = !f ? " Propunerea (gridul des sau cel rar) vine cu fișa." : sp ? " Propus acum (" + (f.propusa === "deasa" ? "grid des 0,3%" : "din proba pe 30 de zile, gridul des respins") + "): " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + " la " + P(sp.pas) + " pas" + (pzi !== null ? ", ~" + T(pzi) + " perechi încheiate pe zi pe ultimele 30 de zile" : "") + "." : "";
    // cand gridul des NU e propus, spune de ce (regula lui vs. proba pe istoricul monedei) - nu-l lasa sa creada ca nu exista
    var de = f && f.deasa && f.deasa.setare && f.propusa !== "deasa" && !f.deasa.aceeasi ? " Gridul des (0,3%, " + (f.deasa.setare.grile + 1) + " grile" + (nr(f.deasa.treceriZi) !== null ? ", ~" + T(f.deasa.treceriZi) + " perechi/zi" : "") + ") nu-l propun acum: " + (f.deasa.respinsa ? f.deasa.motiv : (rg0 && rg0.miscare ? "piața e în mișcare, după mișcare gridul iese cel mai rău" : "proba a ales pasul mai rar")) + "." : "";
    out.push({ cod: "grid", titlu: "Gridul", text: al + azi + "." + unde + prop + de });
    // 3) miscarea
    var rg = f && f.regim;
    if (rg && (nr(rg.r4h) !== null || nr(rg.r24h) !== null)) {
      var r4 = nr(rg.r4h), r24 = nr(rg.r24h), sf = sensFata(b, rg);
      out.push({ cod: "miscare", titlu: "Mișcarea", text: (r4 !== null ? X(r4) + " pe 4 h" : "") + (r24 !== null ? (r4 !== null ? ", " : "") + X(r24) + " pe 24 h" : "") + " față de obișnuitul monedei. "
        + (rg.miscare ? "Mișcare mare" + (sf === "cu" ? ", cu botul (grilele încasează, poziția scade)" : sf === "contra" ? ", împotriva botului (n-aș adăuga bani, aș urmări lichidarea)" : "") + "; n-aș îndesi gridul acum, ci după ce se liniștește."
          : "Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot.") });
    } else out.push({ cod: "miscare", titlu: "Mișcarea", text: "O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei." });
    // v100 (demo-ul aprobat 28.09): fiecare cartela are o CIFRA mare, o ETICHETA de stare si o ACTIUNE de un rand; textul intreg ramane in detalii
    var S1 = function (v) { return v === null || !isFinite(v) ? "—" : TextRo.pctSemn(v * 100); };
    var st0 = out[0], gr0 = out[1], mi0 = out[2];
    st0.mare = op !== null ? fmtPret(op) : "nepus";
    st0.mic = op !== null ? (p !== null ? "activ · " + S1(op / p - 1) + " de preț" : "activ") : "fără stop în Pionex";
    // v101.8 (2): cu plan pe minus, cartela spune cat costa stopul ATINS (TabloExtra.planStare -> minus.laOpritor, cu grilele de
    // pe drum) si il judeca dupa PLAN, nu dupa loc (la LIGHTER, 3,787 sub grid era „pus” verde si costa ≈ 60 fata de planul de 15,7)
    var pm = x.plan && x.plan.minus && !(x.plan.atins && x.plan.atins.indexOf("minus") >= 0) ? x.plan.minus : null, laOp = pm ? nr(pm.laOpritor) : null, pgm = pm ? nr(pm.prag) : null;
    var invB = nr(b.investit), opPl = pm ? nr(pm.opritorPlan) : null, pgmT = pgm !== null ? Pl(pgm) : "";
    var procPl = pgm > 0 && invB > 0 ? "−" + TextRo.num(pgm / invB * 100, 1) + "% din investiție" : null;
    var undePl = !(pgm > 0) ? null : opPl !== null ? fmtPret(opPl) + (procPl ? " (în procente: " + procPl + ")" : "") : procPl ? "în procente: " + procPl : null;
    var pestePlan = laOp !== null && pgm > 0 && -laOp > pgm * 1.2 && -laOp - pgm >= 2;
    if (op !== null && laOp !== null) { st0.mic += " · atins ≈ " + TextRo.usdt(laOp, 0); st0.atins = laOp; }   /* revizia Opus I4: „≈ 0 USDT”, nu „≈ −0” */
    // revizia v100: neutrul primul (la el zero-ul nu se socoteste niciodata); pozitia stopului SE VERIFICA, nu se presupune
    // v100.61 (specul „sfaturi concise”): act = un rand ≤ 110 (actiunea, la persoana I), deCe = de ce (≤ 160), detaliile raman in text
    if (neutru) { st0.tag = { t: "reper", c: "mut" }; st0.act = "Aș pune protecția la o grilă în afara intervalului, pe ambele părți (botul e neutru)."; }
    else if (p === null || pz === null) { st0.tag = { t: "de socotit", c: "mut" }; st0.act = "Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul)."; }
    else if (peProfit) {
      st0.tag = dincolo ? { t: "la adăpost", c: "good" } : { t: op === null ? "de pus la zero" : "de mutat la zero", c: "warn" };
      st0.act = dincolo ? "L-aș lăsa: e deja dincolo de zero-ul botului (" + fmtPret(pz) + ")." : "Aș " + (op === null ? "pune" : "muta") + " stopul la " + fmtPret(pz) + " (zero-ul botului, " + S1(pz / p - 1) + " de preț): câștigul nu se mai pierde.";
      st0.deCe = dincolo ? "O întoarcere nu te mai duce pe minus." : "";
    } else {
      var inAfara = op !== null && (dir === "short" ? sus !== null && op > sus : jos !== null && op < jos), parteP = dir === "short" ? "peste gridul de sus" : "sub gridul de jos";
      st0.tag = op === null ? { t: "fără protecție", c: "bad" } : inAfara ? { t: "pus", c: "good" } : { t: "stop în grid", c: "warn" };
      st0.act = op === null ? "Dacă vrei protecție, aș pune stopul " + parteP + ", la " + (protectie !== null && protectie !== undefined ? fmtPret(protectie) : "o grilă în afara marginii") + "."
        : inAfara ? "L-aș lăsa: stopul stă " + parteP + "."
        : "Stopul tău (" + fmtPret(op) + ") stă în grid: o mișcare mică îl atinge și închide botul pe minus.";
      st0.deCe = "Pe minus, un stop la zero-ul botului (" + fmtPret(pz) + ", " + S1(pz / p - 1) + " de preț) n-are sens.";
      // v101.8 (2): planul hotaraste - fara stop: unde il pui; peste plan: rosu, cat costa si unde il muti; pe plan (si in grid): pus
      if (pgm > 0) {
        if (op === null && undePl) st0.act = "Aș pune stopul la " + undePl + ", cât zice planul (−" + pgmT + " USDT).";
        else if (pestePlan) { st0.tag = { t: "peste plan", c: "bad" }; st0.act = "Aș muta stopul la " + (undePl || "pragul planului") + ": atins acum, te costă ≈ " + Math.round(-laOp) + " USDT, nu " + pgmT + "."; st0.deCe = "Planul tău zice −" + pgmT + " USDT; stopul de la " + fmtPret(op) + " stă mult mai departe."; }
        else if (op !== null && laOp !== null && !inAfara) { st0.tag = { t: "pus", c: "good" }; st0.act = "L-aș lăsa: stă în grid (" + fmtPret(op) + "), dar atins costă cât planul (≈ " + TextRo.usdt(laOp, 0) + ")."; }
        // v100.43 (I-467): cand planul hotaraste unde stai stopul, banii se socotesc pe pretul PLANULUI (nu pe stopul fisei) - altfel
        // cartela zicea „mută-l la 0,384” si randul cu bani „l-aș lăsa unde e” (prins pe poza, CRV)
        if (opPl !== null && (op === null || pestePlan)) { pretStop = opPl; sursaStop = null; }   // revizia 01.10: pretul vine din plan, nu din profil
      }
    }
    // revizia 01.10: de unde vine stopul propus se vede pe cartela (lângă sfat, cum cere specul) - v100.61: pe randul lui (sursa), nu in actiune
    if (sursaStop && pretStop !== null) { st0.sursa = "Stopul propus: " + sursaStop + "."; st0.text += " " + st0.sursa; }
    gr0.mare = poz === null ? "—" : poz < 0 ? S1(p / jos - 1) : poz > 1 ? S1(p / sus - 1) : Math.round(poz * 100) + "%";
    gr0.mic = poz === null ? "fără interval citit" : poz < 0 ? "sub gridul de jos" : poz > 1 ? "peste gridul de sus" : "din interval";
    var lm0 = laMargine(b, x.pragMargine);   // v100.45: „la margine” din profilul monedei (fara profil: 10% din interval, ca inainte)
    gr0.tag = poz === null ? { t: "—", c: "mut" } : poz < 0 || poz > 1 ? { t: "botul nu tranzacționează", c: "bad" } : lm0 && lm0.parte ? { t: "la margine", c: "warn" } : { t: "în grid", c: "good" };
    // v100.61: un rand (faptele, cu „·”); intervalul propus si setarile de copiat raman in detalii
    gr0.act = [g ? g.grile + " grile la " + P(g.pas) + " pas" : "Geometria gridului necitită",
      c.umpleri24h !== null && c.umpleri24h !== undefined ? c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : null,
      sp && f ? "propus: " + (sp.grile + 1) + " grile la " + P(sp.pas) + " pas" : f ? null : "propunerea vine cu fișa"].filter(Boolean).join(" · ") + ".";
    if (rg && (nr(rg.r4h) !== null || nr(rg.r24h) !== null)) {
      var sf0 = sensFata(b, rg), r40 = nr(rg.r4h), r240 = nr(rg.r24h), li = nr(b.distantaLichidarePct);
      mi0.mare = r40 !== null ? X(r40) : X(r240); mi0.mic = r40 !== null ? "pe 4 h față de obișnuit" : "pe 24 h față de obișnuit";
      mi0.tag = rg.miscare ? (sf0 === "contra" ? { t: "împotriva botului", c: "bad" } : sf0 === "cu" ? { t: "cu botul", c: "good" } : { t: "mișcare mare", c: "warn" }) : { t: "liniște", c: "good" };
      // v100.61: o fraza - multiplul pe 24 h, apoi actiunea (fara al doilea „.”)
      mi0.act = (r40 !== null && r240 !== null ? X(r240) + " pe 24 h: " : "") + (rg.miscare ? (sf0 === "contra" ? "n-aș adăuga bani; aș urmări lichidarea" + (li !== null ? " (" + TextRo.pct(Math.abs(li)) + " până la ea)" : "") + "." : sf0 === "cu" ? "n-aș adăuga bani, grilele încasează și poziția scade." : "n-aș îndesi gridul până nu vine liniștea.") : (poz !== null && (poz < 0 || poz > 1) ? "n-aș adăuga bani; prețul e în afara gridului, botul stă până revine sau până muți gridul." : "n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare."));
      mi0.act = mi0.act.charAt(0).toUpperCase() + mi0.act.slice(1);
    } else { mi0.mare = "—"; mi0.mic = "o socotesc"; mi0.tag = { t: "socotesc", c: "mut" }; mi0.act = "O socotesc odată cu fișa."; }
    // v100.43 (I-467): banii pe masa langa stop - cel mai rau caz inainte/dupa si ce cedezi
    var cs = out.filter(function (c) { return c.cod === "stop"; })[0];
    if (cs) {
      cs.pretPropus = pretStop; cs.sursaStop = sursaStop;   // v100.45: de unde vine stopul propus (profilul monedei sau fisa)
      var bani = x.bani || (typeof x.cifre === "function" && pretStop !== null ? x.cifre(pretStop) : null);   // x.cifre = TabloExtra.cifreActiuni legat in Tablou
      if (bani && bani.stop) { cs.bani = textBaniStop(bani.stop) || null; cs.cifre = bani.stop; }   // v100.44: cifrele si ca numere (Consiliu)
    }
    return out;
  }
  // v100: celelalte motive ale verdictului (in afara celui principal), IESI inaintea ATENTIE - randul lor de sub cifre
  function celelalteMotive(sm) {
    if (!sm || !Array.isArray(sm.componente)) return [];
    var R = { iesi: 0, atentie: 1, podea: 2 };
    return sm.componente.filter(function (c) { return c && c.motiv && !(c.cod === sm.cod && c.motiv === sm.motiv); })
      .map(function (c) { return { nivel: c.nivel, cod: c.cod, motiv: c.motiv, faCe: c.faCe || "" }; })
      .sort(function (a, b) { return (R[a.nivel] === undefined ? 3 : R[a.nivel]) - (R[b.nivel] === undefined ? 3 : R[b.nivel]); });
  }

  function btcAvertizare(btc, moneda) {
    if (!btc || !btc.miscare || !moneda || moneda.miscare) return null;
    var r = Math.max(nr(btc.r4h) || 0, nr(btc.r24h) || 0);
    return { nivel: "atentie", r: r, text: "BTC în mișcare (" + X(r) + " față de obișnuitul lui), moneda botului încă liniștită; altcoinii urmează des BTC." };
  }

  function aglomerare(fut, dir) {
    if (!fut || (dir !== "long" && dir !== "short")) return null;
    var f = nr(fut.funding), ls = nr(fut.longShort), oi = null, h = Array.isArray(fut.oiHist5m) ? fut.oiHist5m : [];
    if (h.length >= 2) {
      var a = nr(h[0] && h[0].sumOpenInterest), z = nr(h[h.length - 1] && h[h.length - 1].sumOpenInterest);
      if (a > 0 && z !== null) oi = z / a - 1;
    }
    var semn = dir === "long" ? 1 : -1, c = [];
    if (f !== null && semn * f >= 0.0003) c.push("funding " + TextRo.pct(f * 100, 3) + "/8 h (" + TextRo.num(Math.abs(f) / 0.0001, 0) + "× obișnuitul)");
    if (oi !== null && oi >= 0.15) c.push("open interest +" + P(oi) + " în ultimele ore");   /* revizia Opus M5: fereastra ramane */
    if (ls !== null && (dir === "long" ? ls >= 1.5 : ls <= 1 / 1.5)) c.push("long/short " + TextRo.num(ls, 2));
    if (c.length < 2) return null;
    return { nivel: c.length >= 3 ? "atentie" : "info", oiSchimb: oi, semne: c.length, dovezi: c.join(", "), text: "Mulțimea e înghesuită pe " + dir + ", ca botul: " + c.join(", ") + "; risc de curățare bruscă în sens opus." };
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
    // v100.61: text = tot (Discord il trimite asa); totalul ca numere pentru titlul semaforului, cauza scurta pentru „de ce”
    var cauza = misc ? "A început o mișcare mare" : "Liniștea ține rar mult pe moneda asta";
    return { nivel: "atentie", total: tot, proc: tot / inv, deCe: cauza + ": aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău).",
      text: "Totalul e " + U(tot) + " (" + P(tot / inv) + " din investiție), iar " + cauza.charAt(0).toLowerCase() + cauza.slice(1) + ": aici poziția mănâncă de obicei ce au făcut grilele (greșeala nr. 1 din jurnalul tău)." };
  }

  // pasii cand piata merge cu botul (v100.61: o actiune + de ce): dupa margine -> incaseaza / grid nou din fisa; pe plus -> stopul la
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
    var deCe = dupa ? "Botul nu mai are poziție și nu mai câștigă" + (peProfit && !ok ? "; stopul la zero-ul botului (" + fmtPret(pz) + ") păstrează ce ai" : ok ? "; stopul (" + numeOp(b, op, fmtPret) + ") e deja dincolo de zero" : "") + "."
      : "Pe drum grilele " + parte + " încasează și poziția scade" + (areMarg ? "; până la marginea " + parte + " (" + fmtPret(marg) + ") mai sunt " + TextRo.pct(Math.abs(marg / p - 1) * 100) + ", după ea botul rămâne fără poziție" : "") + ".";
    return { faCe: faCe, deCe: deCe };
  }

  // v97.5: opritorul cum l-a pus el - in procente (Pionex "profit_ratio") sau in pret
  function numeOp(b, op, fmt) { var r = nr(b && b.opritorPierdereRaport); return b && b.opritorPierdereTip === "raport" && r !== null ? (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(2).replace(".", ",") + "% din investiție, ≈ " + fmt(op) : fmt(op); }
  function distPodea(x, p) { return TextRo.pct(Math.abs(x / p - 1) * 100); }

  // intrare: { bot, fisa, plan (TabloExtra.planStare), costuri, btc, aglomerare, muta, iaProfit, zero? (TabloExtra.dacaInchizi) }
  // v100.60: distanta pana la lichidare de acum ~„inapoi” ms, din istoric [{t, distantaLichidarePct}] (±20 min); altfel null
  function distantaLaOra(l, acum, inapoi) {
    var tinta = nr(acum) - nr(inapoi), best = null;
    (Array.isArray(l) ? l : []).forEach(function (e) { var t = e && nr(e.t), d = e && nr(e.distantaLichidarePct); if (t === null || d === null || Math.abs(t - tinta) > 20 * 60000) return; if (!best || Math.abs(t - tinta) < Math.abs(best.t - tinta)) best = { t: t, d: d }; });
    return best ? best.d : null;
  }
  function semafor(x) {
    var b = x.bot || {}, f = x.fisa || null, c = [], dist = nr(b.distantaLichidarePct), dir = String(b.directie || "").toLowerCase();
    // v100.40 (audit 30.09): lichidarea DEPASITA (distanta negativa) e IESI oricat de departe ar fi trecut - |dist| o facea „ȚINE” peste 15%
    // v100.61 (specul „sfaturi concise”): motiv = faptul cu cifra (≤ 60), faCe = o actiune la persoana I (≤ 110), deCe = de ce (≤ 160)
    if (b.lichidareDepasita === true || (dist !== null && dist < 0)) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea estimată e depășită" + (dist !== null ? " cu " + TextRo.pct(Math.abs(dist)) : ""), faCe: "Aș închide ce a rămas, după ce verific botul în Pionex.", deCe: "Poziția poate fi deja lichidată sau pe marginea ei." });
    else if (dist !== null && Math.abs(dist) < 8) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea la " + TextRo.pct(Math.abs(dist)), faCe: "Aș adăuga marjă sau aș închide botul acum.", deCe: "Sub 8% nu mai e loc de răbdare." });
    else if (dist !== null && Math.abs(dist) < 15) {
      // v100.60 (el, 01.10: „botul e pe creștere de minute bune și uite ce spune”): directia distantei fata de acum ~o ora (x.distInainte).
      // Se indeparteaza (+0,5 puncte) -> spus pe fata, nimic de facut acum; se apropie -> „s-a apropiat”; fara istoric -> „e la”
      // revizia 01.10: cu semn - o distanta negativa acum o ora (lichidarea depasita) nu se compara (nu „era 13 %”)
      var dIn = nr(x.distInainte), dv = dIn !== null && dIn >= 0 ? dist - dIn : null, dep = dv !== null && dv >= 0.5, apr = dv !== null && dv <= -0.5;
      c.push({ nivel: "atentie", cod: "lichidare", motiv: "lichidarea la " + TextRo.pct(Math.abs(dist)) + (dep || apr ? " · se " + (dep ? "îndepărtează" : "apropie") + " (" + TextRo.pct(Math.abs(dIn)) + " acum " + TextRo.ore(ORA) + ")" : ""),
        // revizia 01.10 (I2): cand se indeparteaza nu are actiune proprie - „Ce aș face eu” vine de la urmatorul motiv (ex. pretul sub grid);
        // textul linistitor (faCeSlab) doar cand nu exista altul
        faCe: dep ? "" : "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.", faCeSlab: dep ? "N-aș face nimic acum, doar n-aș adăuga poziție până trece de 15%." : "",
        deCe: dep ? "" : "Cât mută marja lichidarea arată calculatorul „Dacă adaug marjă”." });
    }
    var pl = x.plan;
    if (pl && Array.isArray(pl.atins)) {
      if (pl.atins.indexOf("minus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: pragul de −" + (pl.minus ? Pl(pl.minus.prag) : "?") + " USDT e atins", faCe: "Aș închide botul acum, cum ai hotărât la rece." });
      // „ținta” ramane in motiv: podeaPeBani gaseste prima „țintă atinsă” dupa el
      var cuB = f && sensFata(b, f.regim) === "cu";
      if (pl.atins.indexOf("plus") >= 0) c.push({ nivel: "iesi", cod: "plan", motiv: "planul tău: ținta de +" + (pl.plus ? Pl(pl.plus.prag) : "?") + " USDT e atinsă",
        faCe: cuB ? "Aș încasa acum sau aș muta ținta mai sus în „Planul tău”, conștient." : "Aș închide botul pe plus acum, cum ți-ai propus.",
        deCe: cuB ? "Piața încă merge cu botul, dar ținta nu trebuie să treacă neobservată." : "" });
      if (pl.atins.indexOf("afara") >= 0) c.push({ nivel: "atentie", cod: "plan", motiv: "planul tău: în afara gridului peste pragul de ore", faCe: "Aș închide botul și aș porni unul nou din fișă, pe unde e prețul." });
    }
    var d = f && f.directie;
    if (d && (dir === "long" || dir === "short") && (d.tarie === "tare" || d.tarie === "mediu") && ((dir === "long" && d.dir === "short") || (dir === "short" && d.dir === "long")))
      c.push({ nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (" + d.dir + ", " + d.tarie + ")", faCe: d.tarie === "tare" ? "N-aș adăuga bani; trendul e „tare”, deci aș închide botul lângă zero și aș porni din fișă unul pe trend."
        : "N-aș adăuga bani; dacă trece pe „tare”, aș închide botul lângă zero și aș porni din fișă unul pe trend." });   // revizia Opus a 2b (7): aceeasi voce cu sfatul, dupa tarie
    var sf = f && f.regim ? sensFata(b, f.regim) : null, xMis = f && f.regim ? X(Math.max(f.regim.r4h || 0, f.regim.r24h || 0)) : "";
    if (f && f.regim && f.regim.miscare && sf !== "cu") c.push({ nivel: "atentie", cod: "miscare", motiv: "mișcare mare" + (sf === "contra" ? " împotriva botului" : "") + " (" + xMis + " față de obișnuit)", faCe: "N-aș adăuga bani acum; l-aș lăsa cât lichidarea e departe." });
    var ip = x.iaProfit, ipT = ip && nr(ip.total) !== null ? ": totalul " + U(ip.total) + (nr(ip.proc) !== null ? " (" + P(ip.proc) + ")" : "") : "";
    if (ip) c.push({ nivel: "atentie", cod: "ia-profit", motiv: "moment bun de încasat" + ipT, faCe: "Aș închide botul pe plus și aș reporni doar când fișa zice iar 🟢.", deCe: ip.deCe || "" });
    if (x.muta) c.push({ nivel: "atentie", cod: "muta", motiv: x.muta.motiv, parte: x.muta.parte || null, faCe: "Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul.", deCe: x.muta.deCe || "", sursa: x.muta.sursa || null });
    if (x.costuri && x.costuri.netZi !== null && x.costuri.netZi !== undefined && x.costuri.netZi < 0) c.push({ nivel: "atentie", cod: "costuri", motiv: "costurile pe zi depășesc grilele: " + TextRo.usdt(x.costuri.netZi, Math.abs(x.costuri.netZi) < 0.01 ? 3 : 2) + " net/zi", faCe: "Aș lua levier mai mic sau grile mai rare la următorul bot." });
    var rB = x.btc ? nr(x.btc.r) : null;
    if (x.btc) c.push({ nivel: "atentie", cod: "btc", motiv: "BTC în mișcare" + (rB !== null ? " (" + X(rB) + " față de obișnuit)" : "") + ", moneda încă nu", faCe: "N-aș adăuga bani până nu se vede încotro trage BTC.", deCe: "Altcoinii urmează des BTC." });
    var ag = x.aglomerare, nS = ag ? nr(ag.semne) : null;
    if (ag && ag.nivel === "atentie") c.push({ nivel: "atentie", cod: "aglomerare", motiv: "mulțimea e înghesuită pe partea botului" + (nS !== null ? " (" + nS + " semne)" : ""), faCe: "Aș strânge riscul: aș adăuga marjă sau aș închide o parte.",
      deCe: ag.dovezi ? "Semnele: " + ag.dovezi + "; risc de curățare bruscă în sens opus." : ag.text || "" });
    // v96.4 (27.09, alegerea lui: "tinta devine podea"): tinta de plus atinsa, dar conditiile sunt bune (niciun alt 🔴,
    // piata nu merge contra botului) -> nu "ieși", ci "pastreaz-o": opritorul la pretul la care totalul e exact tinta.
    var podea = pl && pl.plus && nr(pl.plus.podea), p0 = nr(b.pretCurent), op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null;
    var altIesi = c.some(function (y) { return y.nivel === "iesi" && y.cod !== "plan"; }) || (pl && Array.isArray(pl.atins) && pl.atins.indexOf("minus") >= 0);
    if (pl && Array.isArray(pl.atins) && pl.atins.indexOf("plus") >= 0 && !altIesi && sf !== "contra" && podea !== null && p0 !== null && (dir === "long" ? podea < p0 : dir === "short" ? podea > p0 : false)) {
      var tinta = Pl(pl.plus.prag);   /* revizia Opus I4: in text cu virgula; calculele de mai jos folosesc pl.plus.prag */
      // la adapost = opritorul lui pastreaza tinta (toleranta: 1% din tinta, min 5 centi - rotunjirea la pasul de pret Pionex)
      var opPast = nr(pl.plus.opritorPastreaza), tol = Math.max(0.05, pl.plus.prag * 0.01);
      var laAdapost = op !== null && (opPast !== null ? opPast >= pl.plus.prag - tol : (dir === "long" ? op >= podea : op <= podea)), ur = pl.plus.urca;
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
              : urcaTxt ? mare1(urcaTxt) + "." : "Câștigul nu se mai poate pierde, iar botul merge mai departe cât merge." });
    }
    var iesi = c.filter(function (y) { return y.nivel === "iesi"; }), at = c.filter(function (y) { return y.nivel === "atentie"; });
    var pod = c.filter(function (y) { return y.nivel === "podea"; })[0];
    if (!iesi.length && !at.length && pod) return { nivel: "tine", cod: "podea", motiv: pod.motiv, faCe: pod.faCe, deCe: pod.deCe || "", componente: [] };
    var prim = iesi[0] || at[0];
    // v99 (audit 28.09, #7): fara fisa nu e "TINE - nimic nu cere o miscare" (starea de asteptare aratata ca verdict), ci "socotesc"
    if (!prim && !f) return { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa monedei", faCe: "Nu m-aș mișca până e gata fișa.", deCe: "Din fișă vin gridul propus, trendul și mișcarea; lichidarea și planul tău se văd și fără ea.", componente: [] };
    if (!prim && sf === "cu") { var pc = pasiCuBotul(b, dir, x.zero); return { nivel: "tine", cod: "cu-botul", motiv: "mișcarea e cu botul: " + xMis + " față de obișnuit", faCe: pc.faCe, deCe: pc.deCe, componente: [] }; }
    if (!prim) return { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare acum", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară.", componente: [] };
    return { nivel: iesi.length ? "iesi" : "atentie", cod: prim.cod, motiv: prim.motiv, faCe: prim.faCe, deCe: prim.deCe || "", componente: c };
  }

  // ---- socoteala: fiecare semnal se noteaza cand apare si se judeca dupa 24 h ----
  // v100.51 (I-478): extra.stare = starea pietei de atunci (regimul fisei x directia), pentru autopsia de duminica
  function noteaza(log, sem, total, acum, extra) {
    log = Array.isArray(log) ? log.slice() : [];
    if (!sem || sem.nivel === "asteapta") return log;   // "socotesc" nu e un semnal de judecat dupa 24 h (revizia 28.09)
    var ult = log[log.length - 1];
    if (ult && ult.cod === sem.cod && ult.nivel === sem.nivel) return log;
    var e = { t: acum, cod: sem.cod, nivel: sem.nivel, motiv: sem.motiv || "", total: nr(total), dreptate: null };
    if (extra && extra.stare) e.stare = String(extra.stare);
    log.push(e);
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

  // v100.43 (I-466, el: „judecata la închidere sau la 24 h”): botii lui se inchid de obicei inainte de 24 h (109 semnale notate pe 13
  // boti, doar 7 judecate) -> la INCHIDERE, fiecare semnal inca nejudecat se judeca pe rezultatul final: IESI/ATENTIE au avut dreptate
  // daca iesind atunci pastrai mai mult decat la final (acelasi prag de zgomot, 0,5% din investitie); TINE invers.
  function judecaLaInchidere(log, totalFinal, investit, inchisLa) {
    var t = nr(totalFinal), prag = (nr(investit) || 0) * 0.005, la = nr(inchisLa);
    if (t === null) return Array.isArray(log) ? log : [];
    return (Array.isArray(log) ? log : []).map(function (e) {
      if (!e || (e.dreptate !== null && e.dreptate !== undefined) || e.total === null || e.total === undefined || (la !== null && e.t > la)) return e;
      var o = {}; for (var k in e) o[k] = e[k];
      o.dreptate = stai(e) ? t >= e.total - prag : t < e.total - prag;
      o.totalDupa = t; o.judecatLa = la; o.laInchidere = true;
      return o;
    });
  }
  // I-466: socoteala pe TOTI botii (loguri = jurnalele de semnale ale fiecarui bot), cu intervalul Wilson.
  //   necunoscut - sub 10 judecate („încă nu știm”) · ajuta - marginea de jos a intervalului peste 50%
  //   tace - cel putin 30 judecate, fara avantaj dovedit (marginea de jos <= 50%) SI fara bani salvati (el: „tace pe Discord, rămâne în Radar”)
  //   nesigur - restul. Lichidarea, planul LUI si podeaua nu tac niciodata (siguranta si hotararile lui).
  var NU_TACE = { lichidare: 1, plan: 1, podea: 1 };
  var NUME_SFAT = { tine: "„Ține-l”", "cu-botul": "„Mișcarea e cu botul”", podea: "„Ținta devine podea”", lichidare: "Lichidarea aproape", plan: "Planul tău",
    trend: "Trendul împotriva botului", miscare: "Mișcare mare", "ia-profit": "„Încasează acum”", muta: "„Mută gridul”", costuri: "„Costurile mănâncă grilele”",
    btc: "„BTC în mișcare”", aglomerare: "„Mulțimea înghesuită”" };
  function socotealaToti(loguri) {
    var toate = [];
    (Array.isArray(loguri) ? loguri : []).forEach(function (l) { if (Array.isArray(l)) toate = toate.concat(l); });
    var r = socoteala(toate);
    Object.keys(r).forEach(function (k) {
      var x = r[k], ic = x.judecate ? G.wilson(x.corecte, x.judecate) : [0, 1];
      x.ic = ic; x.nume = NUME_SFAT[k] || k;
      x.stare = x.judecate < 10 ? "necunoscut" : ic[0] > 0.5 ? "ajuta" : (x.judecate >= 30 && ic[0] <= 0.5 && x.bani <= 0 && !NU_TACE[k]) ? "tace" : "nesigur";
    });
    return r;
  }
  function tacute(soc) { var o = {}; Object.keys(soc || {}).forEach(function (k) { if (soc[k] && soc[k].stare === "tace") o[k] = true; }); return o; }
  function textIncredere(x) {
    if (!x) return "încă nu știm (niciun caz)";
    if (x.stare === "necunoscut") return "încă nu știm (" + x.judecate + (x.judecate === 1 ? " judecat" : " judecate") + ")";
    var s = "a avut dreptate " + x.corecte + " din " + x.judecate + " (" + Math.round(100 * x.corecte / x.judecate) + "%)";
    if (x.baniN) s += ", " + (x.bani >= 0 ? "~+" : "~−") + Math.abs(x.bani).toFixed(1).replace(".", ",") + " USDT dacă-l urmai";
    if (x.stare === "tace") s += " · tăcut pe Discord (nu bate hazardul)";
    return s;
  }

  // v97.1: "tinta devine podea" pe banii lui - prima data cand tinta a fost atinsa (in jurnalul de semnale) fata de acum
  function podeaPeBani(log, totalAcum) {
    var t = nr(totalAcum), l = Array.isArray(log) ? log : [], prima = null;
    for (var i = 0; i < l.length; i++) { var e = l[i]; if (e && (e.cod === "podea" || (e.cod === "plan" && /ținta/.test(e.motiv || ""))) && nr(e.total) !== null) { prima = e; break; } }
    if (!prima || t === null) return null;
    return { la: prima.t, laIesire: prima.total, acum: t, dif: t - prima.total };
  }

  return { distantaLaOra: distantaLaOra, laMargine: laMargine, judecaLaInchidere: judecaLaInchidere, socotealaToti: socotealaToti, tacute: tacute, textIncredere: textIncredere, NUME_SFAT: NUME_SFAT, podeaPeBani: podeaPeBani, sensFata: sensFata, pasiCuBotul: pasiCuBotul, semafor: semafor, mutaGridul: mutaGridul, btcAvertizare: btcAvertizare, aglomerare: aglomerare, iaProfit: iaProfit, noteaza: noteaza, judeca: judeca, socoteala: socoteala,
    gridMaiDes: gridMaiDes, acumConcret: acumConcret, pasBot: pasBot, celelalteMotive: celelalteMotive };
})();
if (typeof globalThis !== "undefined") globalThis.SemnaleBot = SemnaleBot;
