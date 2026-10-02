// pachetul 1 (sfaturi concise), semnale-bot.js - cartelele „Acum, concret” (acumConcret) si randul de bani (textBaniStop):
// act = un rand ≤ 110 (actiunea la persoana I sau faptul), deCe = de ce (≤ 160), text = detaliile, sursa = de unde vine stopul propus
export default [
  [`    if (nr(st.laPropus) !== null && nr(st.laOpritor) !== null && nr(st.laOpritor) > nr(st.laPropus)) return "💰 opritorul tău de acum pierde cel mult " + U2(nr(st.laOpritor)) + " — mai puțin decât stopul propus (" + U2(nr(st.laPropus)) + "): l-aș lăsa unde e.";
    if (nr(st.laPropus) !== null) t.push("💰 pierderea maximă: " + (nr(st.laOpritor) !== null ? U2(nr(st.laOpritor)) + " cu opritorul de acum" : "fără margine (n-ai opritor activ)") + " → " + U2(nr(st.laPropus)) + " cu stopul propus");
    if (nr(st.frecventa) !== null) t.push("ce cedezi: o zi obișnuită a monedei ajunge până acolo în " + Math.round(nr(st.frecventa) * 100) + "% din zile");`,
   `    if (nr(st.laPropus) !== null && nr(st.laOpritor) !== null && nr(st.laOpritor) > nr(st.laPropus)) return "💰 Stopul tău pierde cel mult " + TextRo.num(Math.abs(nr(st.laOpritor)), 1) + " USDT, mai puțin decât cel propus (" + TextRo.num(Math.abs(nr(st.laPropus)), 1) + " USDT): l-aș lăsa unde e.";
    if (nr(st.laPropus) !== null) t.push("💰 Pierderea maximă: " + (nr(st.laOpritor) !== null ? U2(nr(st.laOpritor)) + " cu stopul de acum" : "fără margine (n-ai stop activ)") + " → " + U2(nr(st.laPropus)) + " cu cel propus");
    if (nr(st.frecventa) !== null) t.push("ce cedezi: o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(st.frecventa) * 100) + "% din zile");`],
  [`    var U2 = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; }, t = [];`,
   `    var U2 = function (v) { return TextRo.usdt(v, 1); }, t = [];`],
  [`        out.push({ cod: "stop", titlu: "Stopul", text: "acum " + opTxt + ". Botul e neutru (cumpără sub preț, vinde peste), așa că zero-ul (" + fmtPret(pz) + ", la " + dist(pz, p) + " de preț) e doar reper: " + (peProfit ? "ești pe plus; un stop la o grilă în afara intervalului, pe ambele părți, păstrează ce ai." : "ești pe minus; protecția stă la o grilă în afara intervalului, pe ambele părți — dar se închide pe minus.") });`,
   `        out.push({ cod: "stop", titlu: "Stopul", text: "Stopul tău: " + opTxt + ". Botul neutru cumpără sub preț și vinde peste, deci zero-ul (" + fmtPret(pz) + ", la " + dist(pz, p) + " de preț) e doar reper; " + (peProfit ? "ești pe plus: un stop la o grilă în afara intervalului, pe ambele părți, păstrează ce ai." : "ești pe minus: protecția stă la o grilă în afara intervalului, pe ambele părți, dar se închide pe minus.") });`],
  [`        out.push({ cod: "stop", titlu: "Stopul", text: dincolo
          ? "al tău e la " + opTxt + ", deja dincolo de zero-ul botului (" + fmtPret(pz) + "): o întoarcere nu te mai poate duce pe minus. L-aș lăsa; pe măsură ce " + (dir === "short" ? "coboară" : "urcă") + ", îl " + (dir === "short" ? "cobor" : "ridic") + "."
          : "acum " + opTxt + " → l-aș muta la " + fmtPret(pz) + " (zero-ul botului, la " + dist(pz, p) + " de prețul de acum): de acolo încolo câștigul nu se mai pierde. În Pionex: botul → Edit → Stop loss price." });`,
   `        out.push({ cod: "stop", titlu: "Stopul", text: dincolo
          ? "Stopul tău: " + opTxt + ", deja dincolo de zero-ul botului (" + fmtPret(pz) + "): o întoarcere nu te mai poate duce pe minus; l-aș lăsa, iar pe măsură ce " + (dir === "short" ? "coboară, îl cobor" : "urcă, îl ridic") + "."
          : "Stopul tău: " + opTxt + " → l-aș muta la " + fmtPret(pz) + " (zero-ul botului, la " + dist(pz, p) + " de preț): de acolo câștigul nu se mai pierde. În Pionex: botul → Edit → Stop loss price." });`],
  [`        out.push({ cod: "stop", titlu: "Stopul", text: "acum " + opTxt + ". Zero-ul botului e la " + fmtPret(pz) + " (" + dist(pz, p) + " " + (dir === "short" ? "sub" : "peste") + " preț): un stop acolo n-are sens cât ești pe minus. Dacă vrei protecție, " + (dir === "short" ? "peste gridul de sus: " : "sub gridul de jos: ") + (protectie !== null ? fmtPret(protectie) : "o grilă în afara marginii") + " — dar știi că se închide pe minus." });
      }
    } else out.push({ cod: "stop", titlu: "Stopul", text: neutru ? "acum " + opTxt + ". Botul e neutru (cumpără sub preț, vinde peste): n-are un preț de zero pe o singură parte, deci un stop „la zero” nu există; protecția stă la o grilă în afara intervalului, pe ambele părți." : "acum " + opTxt + ". Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul)." });`,
   `        out.push({ cod: "stop", titlu: "Stopul", text: "Stopul tău: " + opTxt + ". Zero-ul botului e la " + fmtPret(pz) + " (" + dist(pz, p) + " " + (dir === "short" ? "sub" : "peste") + " preț): un stop acolo n-are sens cât ești pe minus. Protecția ar fi " + (dir === "short" ? "peste gridul de sus, la " : "sub gridul de jos, la ") + (protectie !== null ? fmtPret(protectie) : "o grilă în afara marginii") + ", dar se închide pe minus." });
      }
    } else out.push({ cod: "stop", titlu: "Stopul", text: neutru ? "Stopul tău: " + opTxt + ". Botul neutru cumpără sub preț și vinde peste: n-are un zero pe o singură parte, deci protecția stă la o grilă în afara intervalului, pe ambele părți." : "Stopul tău: " + opTxt + ". Zero-ul botului nu se poate socoti încă (lipsesc umplerile sau prețul)." });`],
  [`    var al = g ? "al tău: " + g.grile + " grile la " + P(g.pas) + " pas (net " + P(g.pas - 2 * G.C.COMISION_GRILA) + ")" : "al tău: fără geometrie citită";`,
   `    var al = g ? "Al tău: " + g.grile + " grile la " + P(g.pas) + " pas (net " + P(g.pas - 2 * G.C.COMISION_GRILA) + ")" : "Al tău: fără geometrie citită";`],
  [`    var unde = poz === null ? "" : poz < 0 ? " Prețul e SUB gridul de jos cu " + dist(jos, p) + " (botul nu mai cumpără; " + dist(sus, p) + " până sus)." : poz > 1 ? " Prețul e PESTE gridul de sus cu " + dist(sus, p) + " (botul a rămas fără poziție; " + dist(jos, p) + " până jos)."`,
   `    var unde = poz === null ? "" : poz < 0 ? " Prețul e sub gridul de jos cu " + dist(jos, p) + " (botul nu mai cumpără; " + dist(sus, p) + " până sus)." : poz > 1 ? " Prețul e peste gridul de sus cu " + dist(sus, p) + " (botul a rămas fără poziție; " + dist(jos, p) + " până jos)."`],
  [`    var prop = !f ? " Propunerea (gridul des sau cel rar) vine cu fișa — o socotesc." : sp ? " Propus acum (" + (f.propusa === "deasa" ? "grid des 0,3%" : "din proba pe 30 z, gridul des respins") + "): " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + " la " + P(sp.pas) + " pas" + (pzi !== null ? ", ~" + T(pzi) + " perechi încheiate/zi pe ultimele 30 de zile" : "") + "." : "";`,
   `    var prop = !f ? " Propunerea (gridul des sau cel rar) vine cu fișa." : sp ? " Propus acum (" + (f.propusa === "deasa" ? "grid des 0,3%" : "din proba pe 30 de zile, gridul des respins") + "): " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + " la " + P(sp.pas) + " pas" + (pzi !== null ? ", ~" + T(pzi) + " perechi încheiate pe zi pe ultimele 30 de zile" : "") + "." : "";`],
  [`      out.push({ cod: "miscare", titlu: "Mișcarea", text: (r4 !== null ? X(r4) + " pe 4 h" : "") + (r24 !== null ? (r4 !== null ? ", " : "") + X(r24) + " pe 24 h" : "") + " față de obișnuitul monedei — "
        + (rg.miscare ? "mișcare mare" + (sf === "cu" ? ", cu botul: grilele încasează, poziția se micșorează" : sf === "contra" ? ", ÎMPOTRIVA botului: nu adăuga bani, urmărește lichidarea" : "") + ". N-aș îndesi gridul acum; după ce se liniștește, gridul des."
          : "liniște: gridul lucrează; nu adaug bani pe urcare, nu schimb nimic pe zgomot.") });
    } else out.push({ cod: "miscare", titlu: "Mișcarea", text: "o socotesc odată cu fișa (mișcarea pe 4 h și 24 h față de obișnuitul monedei)." });`,
   `      out.push({ cod: "miscare", titlu: "Mișcarea", text: (r4 !== null ? X(r4) + " pe 4 h" : "") + (r24 !== null ? (r4 !== null ? ", " : "") + X(r24) + " pe 24 h" : "") + " față de obișnuitul monedei. "
        + (rg.miscare ? "Mișcare mare" + (sf === "cu" ? ", cu botul (grilele încasează, poziția scade)" : sf === "contra" ? ", împotriva botului (n-aș adăuga bani, aș urmări lichidarea)" : "") + "; n-aș îndesi gridul acum, ci după ce se liniștește."
          : "Liniște: gridul lucrează; n-aș adăuga bani pe urcare și n-aș schimba nimic pe zgomot.") });
    } else out.push({ cod: "miscare", titlu: "Mișcarea", text: "O socotesc odată cu fișa: mișcarea pe 4 h și 24 h față de obișnuitul monedei." });`],
  [`    var S1 = function (v) { return v === null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + (Math.abs(v) * 100).toFixed(1).replace(".", ",") + "%"; };`,
   `    var S1 = function (v) { return v === null || !isFinite(v) ? "—" : TextRo.pctSemn(v * 100); };`],
  [`    var procPl = pgm > 0 && invB > 0 ? "−" + (pgm / invB * 100).toFixed(1).replace(".", ",") + "% din investiție" : null;
    var undePl = !(pgm > 0) ? null : opPl !== null ? fmtPret(opPl) + (procPl ? " sau în procente, la " + procPl : "") : procPl ? "în procente, la " + procPl : null;`,
   `    var procPl = pgm > 0 && invB > 0 ? "−" + TextRo.num(pgm / invB * 100, 1) + "% din investiție" : null;
    var undePl = !(pgm > 0) ? null : opPl !== null ? fmtPret(opPl) + (procPl ? " (în procente: " + procPl + ")" : "") : procPl ? "în procente: " + procPl : null;`],
  [`    if (op !== null && laOp !== null) st0.mic += " · atins ≈ " + (laOp >= 0 ? "+" : "−") + Math.round(Math.abs(laOp)) + " USDT";
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
        else if (op !== null && laOp !== null && !inAfara) { st0.tag = { t: "pus", c: "good" }; st0.act = capM + "Stopul tău (" + fmtPret(op) + ") stă în grid, dar atins te costă cât planul (≈ −" + Math.round(-laOp) + " USDT)."; }`,
   `    if (op !== null && laOp !== null) { st0.mic += " · atins ≈ " + (laOp >= 0 ? "+" : "−") + Math.round(Math.abs(laOp)) + " USDT"; st0.atins = laOp; }
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
        else if (op !== null && laOp !== null && !inAfara) { st0.tag = { t: "pus", c: "good" }; st0.act = "L-aș lăsa: stă în grid (" + fmtPret(op) + "), dar atins costă cât planul (≈ −" + Math.round(-laOp) + " USDT)."; }`],
  [`    // revizia 01.10: de unde vine stopul propus se vede pe cartela (lângă sfat, cum cere specul)
    if (sursaStop && pretStop !== null) { st0.act += " Stopul propus: " + sursaStop + "."; st0.text += " Stopul propus: " + sursaStop + "."; }`,
   `    // revizia 01.10: de unde vine stopul propus se vede pe cartela (lângă sfat, cum cere specul) - v100.61: pe randul lui (sursa), nu in actiune
    if (sursaStop && pretStop !== null) { st0.sursa = "Stopul propus: " + sursaStop + "."; st0.text += " " + st0.sursa; }`],
  [`    gr0.act = (g ? g.grile + " grile la " + P(g.pas) + " pas" : "Geometria gridului necitită") + (c.umpleri24h !== null && c.umpleri24h !== undefined ? ", " + c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : "") + "."
      + (sp && f ? " Propus acum: " + (sp.grile + 1) + " grile între " + fmtPret(sp.jos) + " și " + fmtPret(sp.sus) + ", la " + P(sp.pas) + " pas." : f ? "" : " Propunerea vine cu fișa.");`,
   `    // v100.61: un rand (faptele, cu „·”); intervalul propus si setarile de copiat raman in detalii
    gr0.act = [g ? g.grile + " grile la " + P(g.pas) + " pas" : "Geometria gridului necitită",
      c.umpleri24h !== null && c.umpleri24h !== undefined ? c.umpleri24h + " umpleri în 24 h" + (c.grile24h !== null && c.grile24h !== undefined ? " (" + U(c.grile24h) + ")" : "") : null,
      sp && f ? "propus: " + (sp.grile + 1) + " grile la " + P(sp.pas) + " pas" : f ? null : "propunerea vine cu fișa"].filter(Boolean).join(" · ") + ".";`],
  [`      mi0.act = (r40 !== null && r240 !== null ? X(r240) + " pe 24 h. " : "") + (rg.miscare ? (sf0 === "contra" ? "Nu adaug bani; urmăresc lichidarea" + (li !== null ? " (" + Math.abs(li).toFixed(1).replace(".", ",") + "% până la ea)" : "") + "." : sf0 === "cu" ? "Grilele încasează, poziția se micșorează; nu adaug bani." : "N-aș îndesi gridul acum; aștept liniștea.") : (poz !== null && (poz < 0 || poz > 1) ? "Prețul e în afara gridului: botul stă până revine sau muți gridul; nu adaug bani." : "Gridul lucrează; nu adaug bani pe urcare și nu schimb nimic pe zgomot."));
    } else { mi0.mare = "—"; mi0.mic = "o socotesc"; mi0.tag = { t: "socotesc", c: "mut" }; mi0.act = mi0.text; }`,
   `      // v100.61: o fraza - multiplul pe 24 h, apoi actiunea (fara al doilea „.”)
      mi0.act = (r40 !== null && r240 !== null ? X(r240) + " pe 24 h: " : "") + (rg.miscare ? (sf0 === "contra" ? "n-aș adăuga bani; aș urmări lichidarea" + (li !== null ? " (" + TextRo.pct(Math.abs(li)) + " până la ea)" : "") + "." : sf0 === "cu" ? "n-aș adăuga bani, grilele încasează și poziția scade." : "n-aș îndesi gridul până nu vine liniștea.") : (poz !== null && (poz < 0 || poz > 1) ? "n-aș adăuga bani; prețul e în afara gridului, botul stă până revine sau până muți gridul." : "n-aș schimba nimic pe zgomot și n-aș adăuga bani pe urcare."));
      mi0.act = mi0.act.charAt(0).toUpperCase() + mi0.act.slice(1);
    } else { mi0.mare = "—"; mi0.mic = "o socotesc"; mi0.tag = { t: "socotesc", c: "mut" }; mi0.act = "O socotesc odată cu fișa."; }`],
];
