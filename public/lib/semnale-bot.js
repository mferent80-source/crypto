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
    // v99: setarea PROPUSA de fisa (deasa, 0,30% - v100.39: oricand proba n-o respinge), altfel cea aleasa de platou
    var s = f.propusa === "deasa" && f.deasa && f.deasa.setare ? f.deasa.setare : f.setare, des = f.propusa === "deasa";
    return { nivel: "atentie", motiv: motiv, des: des, treceriZi: nr(des ? f.deasa.treceriZi : f.treceriZi),
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
  var T = function (v) { return v === null || v === undefined ? "?" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };
  // v99 (cererea lui, 28.09): botul e mult mai RAR decat gridul des propus de fisa in liniste -> propunere cu cifre.
  // Nu e alerta (n-ar fi "urgent"), e o sugestie pe Tablou: gridurile rare sunt atinse rar; cu 0,30% a facut mai multi bani lateral.
  function gridMaiDes(b, f) {
    if (!b || !f || f.propusa !== "deasa" || !f.deasa || !f.deasa.setare) return null;
    var g = pasBot(b), s = f.deasa.setare;
    if (!g || !(s.pas > 0) || g.pas <= 1.5 * s.pas) return null;
    return { setare: s, pasBot: g.pas, pasDes: s.pas, grileBot: g.grile, treceriZi: nr(f.deasa.treceriZi),
      motiv: "gridul tău are " + g.grile + " grile la " + P(g.pas) + " pas; gridul des de 0,3% (" + (s.grile + 1) + " grile între " + fmtPret(s.jos) + " și " + fmtPret(s.sus) + ") încheia ~" + T(f.deasa.treceriZi) + " perechi pe zi pe ultimele 30 de zile" };
  }
  function fmtPret(v) { v = nr(v); if (v === null) return "?"; var s = v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toPrecision(4); return s.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, ""); }
  // v99: "Acum, concret" - trei randuri cu cifre, pe Tablou, sub verdict: STOPUL (unde e, unde l-as pune), GRIDUL (al lui vs
  // propus, treceri/zi, pozitia in interval), MISCAREA (x fata de obisnuit). Fara fisa spune ca o socoteste, nu inventeaza.
  // intrare: { bot, fisa, zero (TabloExtra.dacaInchizi), costuri (grileVsCosturi), geom (optional), acum }
  // v100.43 (I-467): banii de langa o actiune - x.bani = TabloExtra.cifreActiuni(...) (calculat in Tablou, unde sunt lumanarile)
  function textBaniStop(st) {
    if (!st) return "";
    var U2 = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; }, t = [];
    // opritorul LUI e deja mai strans decat propunerea -> nu-l impinge spre un stop mai larg (prins pe viu pe CRV: −10,2 vs −21,0)
    if (nr(st.laPropus) !== null && nr(st.laOpritor) !== null && nr(st.laOpritor) > nr(st.laPropus)) return "💰 opritorul tău de acum pierde cel mult " + U2(nr(st.laOpritor)) + " — mai puțin decât stopul propus (" + U2(nr(st.laPropus)) + "): l-aș lăsa unde e.";
    if (nr(st.laPropus) !== null) t.push("💰 pierderea maximă: " + (nr(st.laOpritor) !== null ? U2(nr(st.laOpritor)) + " cu opritorul de acum" : "fără margine (n-ai opritor activ)") + " → " + U2(nr(st.laPropus)) + " cu stopul propus");
    if (nr(st.frecventa) !== null) t.push("ce cedezi: o zi obișnuită a monedei ajunge până acolo în " + Math.round(nr(st.frecventa) * 100) + "% din zile");
    return t.join(" · ");
  }
  function acumConcret(x) {
    var b = x.bot || {}, f = x.fisa || null, dir = String(b.directie || "").toLowerCase(), p = nr(b.pretCurent), jos = nr(b.gridJos), sus = nr(b.gridSus), out = [];
    var pz = x.zero ? nr(x.zero.pretZero) : null, op = b.opritorPierdereActiv ? nr(b.opritorPierdere) : null, tot = nr(b.profitTotal);
    var sp = f ? (f.propusa === "deasa" && f.deasa && f.deasa.setare ? f.deasa.setare : f.setare) : null, g = pasBot(b), rg0 = f && f.regim;
    var dist = function (a, c) { return a !== null && c > 0 ? P(Math.abs(a / c - 1)) : "?"; };
    // 1) stopul
    var pretStop = null, opTxt = op !== null ? fmtPret(op) : "nepus", neutru = dir !== "long" && dir !== "short";
    if (p !== null && pz !== null) {
      var peProfit = dir === "long" ? pz < p : dir === "short" ? pz > p : (tot !== null && tot > 0);
      if (neutru) {
        // botul neutru cumpara sub si vinde peste: zero-ul nu e "o parte" - e doar reper (revizia 28.09)
        out.push({ cod: "stop", titlu: "Stopul", text: "acum " + opTxt + ". Botul e neutru (cumpără sub preț, vinde peste), așa că zero-ul (" + fmtPret(pz) + ", la " + dist(pz, p) + " de preț) e doar reper: " + (peProfit ? "ești pe plus; un stop la o grilă în afara intervalului, pe ambele părți, păstrează ce ai." : "ești pe minus; protecția stă la o grilă în afara intervalului, pe ambele părți — dar se închide pe minus.") });
      } else if (peProfit) {
        var dincolo = op !== null && (dir === "long" ? op >= pz : op <= pz);
        pretStop = dincolo ? null : pz;   // v100.43 (I-467): pretul la care propun stopul
        out.push({ cod: "stop", titlu: "Stopul", text: dincolo
          ? "al tău e la " + opTxt + ", deja dincolo de zero-ul botului (" + fmtPret(pz) + "): o întoarcere nu te mai poate duce pe minus. L-aș lăsa; pe măsură ce " + (dir === "short" ? "coboară" : "urcă") + ", îl " + (dir === "short" ? "cobor" : "ridic") + "."
          : "acum " + opTxt + " → l-aș muta la " + fmtPret(pz) + " (zero-ul botului, la " + dist(pz, p) + " de prețul de acum): de acolo încolo câștigul nu se mai pierde. În Pionex: botul → Edit → Stop loss price." });
      } else {
        // pe minus: LONG pierde in jos -> protectia sub gridul de jos; SHORT pierde in SUS -> protectia peste gridul de sus (revizia 28.09: era inversat la short)
        var protectie = dir === "short"
          ? (sp && sp.stop && nr(sp.stop.sus) !== null ? sp.stop.sus : (sus !== null && g ? sus * (1 + g.pas) : null))
          : (sp && sp.stop && nr(sp.stop.jos) !== null ? sp.stop.jos : (jos !== null && g ? jos * (1 - g.pas) : null));
        pretStop = protectie;   // v100.43 (I-467)
        out.push({ cod: "stop", titlu: "Stopul", text: "acum " + opTxt + ". Zero-ul botului e la " + fmtPret(pz) + " (" + dist(pz, p) + " " + (dir === "short" ? "sub" : "peste") + " preț): un stop acolo n-are sens cât ești pe minus. Dacă vrei protecție, " + (dir === "short" ? "peste gridul de sus: " : "sub gridul de jos: ") + (protectie !== null ? fmtPret(protectie) : "o grilă în afara marginii") + " — dar știi că se închide pe minus." });
      }
    } else out.push({ cod: "stop", titlu: "Stopul", text: neutru ? "acum " + opTxt + ". Botul e neutru (cumpără sub preț, vinde peste): n-are un preț de zero pe o singură parte, deci un stop „la zero” nu există; protecția stă la o grilă în afara intervalului, pe ambele părți." : "acum " + opTxt + ". Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul)." });
    // 2) gridul
    var poz = p !== null && jos !== null && sus !== null && sus > jos ? (p - jos) / (sus - jos) : null, c = x.costuri || {};
    var al = g ? "al tău: " + g.grile + " grile la " + P(g.pas) + " pas (net " + P(g.pas - 2 * G.C.COMISION_GRILA) + ")" : "al tău: fără geometrie citită";
    var azi = c.umpleri24h !== null && c.umpleri24h !== undefined ? ", " + c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : "";
    var unde = poz === null ? "" : poz < 0 ? " Prețul e SUB gridul de jos cu " + dist(jos, p) + " (botul nu mai cumpără; " + dist(sus, p) + " până sus)." : poz > 1 ? " Prețul e PESTE gridul de sus cu " + dist(sus, p) + " (botul a rămas fără poziție; " + dist(jos, p) + " până jos)."
      : " Prețul e la " + P(poz) + " din interval: " + dist(jos, p) + " până jos, " + dist(sus, p) + " până sus.";
    var pzi = nr(f && (f.propusa === "deasa" && f.deasa ? f.deasa.treceriZi : f.treceriZi));
    var prop = !f ? " Propunerea (gridul des sau cel rar) vine cu fișa — o socotesc." : sp ? " Propus acum (" + (f.propusa === "deasa" ? "grid des 0,3%" : "din proba pe 30 z, gridul des respins") + "): " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + " la " + P(sp.pas) + " pas" + (pzi !== null ? ", ~" + T(pzi) + " perechi încheiate/zi pe ultimele 30 de zile" : "") + "." : "";
    // cand gridul des NU e propus, spune de ce (regula lui vs. proba pe istoricul monedei) - nu-l lasa sa creada ca nu exista
    var de = f && f.deasa && f.deasa.setare && f.propusa !== "deasa" && !f.deasa.aceeasi ? " Gridul des (0,3%, " + (f.deasa.setare.grile + 1) + " grile" + (nr(f.deasa.treceriZi) !== null ? ", ~" + T(f.deasa.treceriZi) + " perechi/zi" : "") + ") nu-l propun acum: " + (f.deasa.respinsa ? f.deasa.motiv : (rg0 && rg0.miscare ? "piața e în mișcare, după mișcare gridul iese cel mai rău" : "proba a ales pasul mai rar")) + "." : "";
    out.push({ cod: "grid", titlu: "Gridul", text: al + azi + "." + unde + prop + de });
    // 3) miscarea
    var rg = f && f.regim;
    if (rg && (nr(rg.r4h) !== null || nr(rg.r24h) !== null)) {
      var r4 = nr(rg.r4h), r24 = nr(rg.r24h), sf = sensFata(b, rg);
      out.push({ cod: "miscare", titlu: "Mișcarea", text: (r4 !== null ? X(r4) + " pe 4 h" : "") + (r24 !== null ? (r4 !== null ? ", " : "") + X(r24) + " pe 24 h" : "") + " față de obișnuitul monedei — "
        + (rg.miscare ? "mișcare mare" + (sf === "cu" ? ", cu botul: grilele încasează, poziția se micșorează" : sf === "contra" ? ", ÎMPOTRIVA botului: nu adăuga bani, urmărește lichidarea" : "") + ". N-aș îndesi gridul acum; după ce se liniștește, gridul des."
          : "liniște: gridul lucrează; nu adaug bani pe urcare, nu schimb nimic pe zgomot.") });
    } else out.push({ cod: "miscare", titlu: "Mișcarea", text: "o socotesc odată cu fișa (mișcarea pe 4 h și 24 h față de obișnuitul monedei)." });
    // v100 (demo-ul aprobat 28.09): fiecare cartela are o CIFRA mare, o ETICHETA de stare si o ACTIUNE de un rand; textul intreg ramane in detalii
    var S1 = function (v) { return v === null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + (Math.abs(v) * 100).toFixed(1).replace(".", ",") + "%"; };
    var st0 = out[0], gr0 = out[1], mi0 = out[2];
    st0.mare = op !== null ? fmtPret(op) : "nepus";
    st0.mic = op !== null ? (p !== null ? "activ · " + S1(op / p - 1) + " de preț" : "activ") : "fără stop în Pionex";
    // v101.8 (2): cu plan pe minus, cartela spune cat costa stopul ATINS (TabloExtra.planStare -> minus.laOpritor, cu grilele de
    // pe drum) si il judeca dupa PLAN, nu dupa loc (la LIGHTER, 3,787 sub grid era „pus” verde si costa ≈ 60 fata de planul de 15,7)
    var pm = x.plan && x.plan.minus && !(x.plan.atins && x.plan.atins.indexOf("minus") >= 0) ? x.plan.minus : null, laOp = pm ? nr(pm.laOpritor) : null, pgm = pm ? nr(pm.prag) : null;
    var invB = nr(b.investit), opPl = pm ? nr(pm.opritorPlan) : null, pgmT = pgm !== null ? String(pgm).replace(".", ",") : "";
    var procPl = pgm > 0 && invB > 0 ? "−" + (pgm / invB * 100).toFixed(1).replace(".", ",") + "% din investiție" : null;
    var undePl = !(pgm > 0) ? null : opPl !== null ? fmtPret(opPl) + (procPl ? " sau în procente, la " + procPl : "") : procPl ? "în procente, la " + procPl : null;
    var pestePlan = laOp !== null && pgm > 0 && -laOp > pgm * 1.2 && -laOp - pgm >= 2;
    if (op !== null && laOp !== null) st0.mic += " · atins ≈ " + (laOp >= 0 ? "+" : "−") + Math.round(Math.abs(laOp)) + " USDT";
    // revizia v100: neutrul primul (la el zero-ul nu se socoteste niciodata); pozitia stopului SE VERIFICA, nu se presupune
    if (neutru) { st0.tag = { t: "reper", c: "mut" }; st0.act = "Botul e neutru (cumpără sub preț, vinde peste): protecția stă la o grilă în afara intervalului, pe ambele părți."; }
    else if (p === null || pz === null) { st0.tag = { t: "de socotit", c: "mut" }; st0.act = st0.text; }
    else if (peProfit) {
      st0.tag = dincolo ? { t: "la adăpost", c: "good" } : { t: op === null ? "pune-l la zero" : "mută-l la zero", c: "warn" };
      st0.act = dincolo ? "E deja dincolo de zero-ul botului (" + fmtPret(pz) + "): o întoarcere nu te mai duce pe minus." : (op === null ? "Pune-l" : "Mută-l") + " la " + fmtPret(pz) + " (zero-ul botului, " + S1(pz / p - 1) + " de preț): de acolo câștigul nu se mai pierde.";
    } else {
      var inAfara = op !== null && (dir === "short" ? sus !== null && op > sus : jos !== null && op < jos);
      st0.tag = op === null ? { t: "fără protecție", c: "bad" } : inAfara ? { t: "pus", c: "good" } : { t: "stop în grid", c: "warn" };
      st0.act = "Ești pe minus: zero-ul botului (" + fmtPret(pz) + ") e la " + S1(pz / p - 1) + " de preț, acolo un stop n-are sens. "
        + (op === null ? "Protecția ar fi " + (dir === "short" ? "peste gridul de sus, la " : "sub gridul de jos, la ") + (protectie !== null && protectie !== undefined ? fmtPret(protectie) : "o grilă în afara marginii") + "."
          : inAfara ? "Stopul tău stă " + (dir === "short" ? "peste gridul de sus" : "sub gridul de jos") + "."
          : "Stopul tău (" + fmtPret(op) + ") stă în grid: o mișcare mică îl atinge și închide botul pe minus.");
      // v101.8 (2): planul hotaraste - fara stop: unde il pui; peste plan: rosu, cat costa si unde il muti; pe plan (si in grid): pus
      if (pgm > 0) {
        var capM = "Ești pe minus: zero-ul botului (" + fmtPret(pz) + ") e la " + S1(pz / p - 1) + " de preț, acolo un stop n-are sens. ";
        if (op === null && undePl) st0.act = capM + "N-ai stop: pune-l la " + undePl + " (planul tău, −" + pgmT + " USDT).";
        else if (pestePlan) { st0.tag = { t: "peste plan", c: "bad" }; st0.act = "Atins, te costă ≈ " + Math.round(-laOp) + " USDT — planul tău zice −" + pgmT + (undePl ? ": mută-l la " + undePl : "") + "."; }
        else if (op !== null && laOp !== null && !inAfara) { st0.tag = { t: "pus", c: "good" }; st0.act = capM + "Stopul tău (" + fmtPret(op) + ") stă în grid, dar atins te costă cât planul (≈ −" + Math.round(-laOp) + " USDT)."; }
      }
    }
    gr0.mare = poz === null ? "—" : poz < 0 ? S1(p / jos - 1) : poz > 1 ? S1(p / sus - 1) : Math.round(poz * 100) + "%";
    gr0.mic = poz === null ? "fără interval citit" : poz < 0 ? "sub gridul de jos" : poz > 1 ? "peste gridul de sus" : "din interval";
    gr0.tag = poz === null ? { t: "—", c: "mut" } : poz < 0 || poz > 1 ? { t: "botul nu tranzacționează", c: "bad" } : poz < 0.1 || poz > 0.9 ? { t: "la margine", c: "warn" } : { t: "în grid", c: "good" };
    gr0.act = (g ? g.grile + " grile la " + P(g.pas) + " pas" : "Geometria gridului necitită") + (c.umpleri24h !== null && c.umpleri24h !== undefined ? ", " + c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : "") + "."
      + (sp && f ? " Propus acum: " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + ", la " + P(sp.pas) + " pas." : f ? "" : " Propunerea vine cu fișa.");
    if (rg && (nr(rg.r4h) !== null || nr(rg.r24h) !== null)) {
      var sf0 = sensFata(b, rg), r40 = nr(rg.r4h), r240 = nr(rg.r24h), li = nr(b.distantaLichidarePct);
      mi0.mare = r40 !== null ? X(r40) : X(r240); mi0.mic = r40 !== null ? "pe 4 h față de obișnuit" : "pe 24 h față de obișnuit";
      mi0.tag = rg.miscare ? (sf0 === "contra" ? { t: "împotriva botului", c: "bad" } : sf0 === "cu" ? { t: "cu botul", c: "good" } : { t: "mișcare mare", c: "warn" }) : { t: "liniște", c: "good" };
      mi0.act = (r40 !== null && r240 !== null ? X(r240) + " pe 24 h. " : "") + (rg.miscare ? (sf0 === "contra" ? "Nu adaug bani; urmăresc lichidarea" + (li !== null ? " (" + Math.abs(li).toFixed(1).replace(".", ",") + "% până la ea)" : "") + "." : sf0 === "cu" ? "Grilele încasează, poziția se micșorează; nu adaug bani." : "N-aș îndesi gridul acum; aștept liniștea.") : (poz !== null && (poz < 0 || poz > 1) ? "Prețul e în afara gridului: botul stă până revine sau muți gridul; nu adaug bani." : "Gridul lucrează; nu adaug bani pe urcare și nu schimb nimic pe zgomot."));
    } else { mi0.mare = "—"; mi0.mic = "o socotesc"; mi0.tag = { t: "socotesc", c: "mut" }; mi0.act = mi0.text; }
    // v100.43 (I-467): banii pe masa langa stop - cel mai rau caz inainte/dupa si ce cedezi
    var cs = out.filter(function (c) { return c.cod === "stop"; })[0];
    if (cs) {
      cs.pretPropus = pretStop;
      var bani = x.bani || (typeof x.cifre === "function" && pretStop !== null ? x.cifre(pretStop) : null);   // x.cifre = TabloExtra.cifreActiuni legat in Tablou
      if (bani && bani.stop) cs.bani = textBaniStop(bani.stop) || null;
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
    // v100.40 (audit 30.09): lichidarea DEPASITA (distanta negativa) e IESI oricat de departe ar fi trecut - |dist| o facea „ȚINE” peste 15%
    if (b.lichidareDepasita === true || (dist !== null && dist < 0)) c.push({ nivel: "iesi", cod: "lichidare", motiv: "prețul a trecut de lichidarea estimată" + (dist !== null ? " (" + Math.abs(dist).toFixed(1) + "% dincolo)" : ""), faCe: "Verifică acum botul în Pionex: poziția poate fi deja lichidată sau pe marginea ei; aș închide ce a rămas." });
    else if (dist !== null && Math.abs(dist) < 8) c.push({ nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la " + Math.abs(dist).toFixed(1) + "%", faCe: "Aș adăuga marjă sau aș închide acum; sub 8% nu mai e loc de răbdare." });
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
    // v99 (audit 28.09, #7): fara fisa nu e "TINE - nimic nu cere o miscare" (starea de asteptare aratata ca verdict), ci "socotesc"
    if (!prim && !f) return { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa monedei (trendul, mișcarea, gridul propus)", faCe: "Nu m-aș mișca până nu e gata fișa: din ea vin gridul propus și avertizările de mișcare. Lichidarea și planul tău se văd și fără ea.", componente: [] };
    if (!prim && sf === "cu") return { nivel: "tine", cod: "cu-botul", motiv: "mișcarea e cu botul (" + xMis + " față de obișnuit): lucrează pentru tine", faCe: pasiCuBotul(b, dir, x.zero), componente: [] };
    if (!prim) return { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare acum", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară.", componente: [] };
    return { nivel: iesi.length ? "iesi" : "atentie", cod: prim.cod, motiv: prim.motiv, faCe: prim.faCe, componente: c };
  }

  // ---- socoteala: fiecare semnal se noteaza cand apare si se judeca dupa 24 h ----
  function noteaza(log, sem, total, acum) {
    log = Array.isArray(log) ? log.slice() : [];
    if (!sem || sem.nivel === "asteapta") return log;   // "socotesc" nu e un semnal de judecat dupa 24 h (revizia 28.09)
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

  return { judecaLaInchidere: judecaLaInchidere, socotealaToti: socotealaToti, tacute: tacute, textIncredere: textIncredere, NUME_SFAT: NUME_SFAT, podeaPeBani: podeaPeBani, sensFata: sensFata, pasiCuBotul: pasiCuBotul, semafor: semafor, mutaGridul: mutaGridul, btcAvertizare: btcAvertizare, aglomerare: aglomerare, iaProfit: iaProfit, noteaza: noteaza, judeca: judeca, socoteala: socoteala,
    gridMaiDes: gridMaiDes, acumConcret: acumConcret, pasBot: pasBot, celelalteMotive: celelalteMotive };
})();
if (typeof globalThis !== "undefined") globalThis.SemnaleBot = SemnaleBot;
