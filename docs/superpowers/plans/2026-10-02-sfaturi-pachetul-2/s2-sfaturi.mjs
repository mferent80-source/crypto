// Sarcina 2 · sfaturi.js (specul „sfaturi concise”, pachetul 2): titlu = faptul + cifra (≤ 60) · text = de ce, o fraza (≤ 160) ·
// faCe = o actiune la persoana I (≤ 110) · sursa = de unde vin cifrele (fostul „deCe” al sfaturilor). Avertizarile comune
// („nu e o prognoză”, „nu spune încotro va merge”, ce face gridul contra trendului) trec in legenda Consilierului (sarcina 3).
// Logica, pragurile, codurile, tonurile si ordinea sfaturilor raman neatinse.
export default [
  [`// monedei, cu numarul de cazuri; niciun sfat nu promite o directie viitoare.
`, `// monedei, cu numarul de cazuri; niciun sfat nu promite o directie viitoare.
// v100.62 (specul „sfaturi concise”, pachetul 2): titlu = faptul + cifra (≤ 60) · text = de ce, o fraza (≤ 160) · faCe = o actiune
// la persoana I (≤ 110) · sursa = de unde vin cifrele (inainte „deCe”). Avertizarile comune stau o data, in legenda Consilierului.
`],
  [`  function usdt(v) { return v === null ? "-" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + " USDT"; }
  function pret(v) { if (v === null || v === undefined) return "-"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : a >= 1 ? 4 : 4); }
  function proc(v, z) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(z == null ? 1 : z) + "%"; }
`, `  // v100.62: cifrele prin TextRo (virgula, minusul „−”); preturile raman cu zecimalele lor
  function usdt(v) { return v === null || v === undefined ? "—" : TextRo.usdt(v); }
  function pret(v) { if (v === null || v === undefined) return "—"; var a = Math.abs(v); return v.toFixed(a >= 100 ? 2 : 4); }
  function proc(v, z) { return TextRo.pctSemn(v, z == null ? 1 : z); }
  function mare(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
`],
  [`        var fc = k === "lich" ? (a.nivel === "critic" ? "Aș acționa acum, nu aș aștepta: adaug marjă din Pionex sau închid botul. Sub 8% nu mai e loc de răbdare." : "Aș urmări de aproape și n-aș mai adăuga poziție; dacă trece sub 8%, adaug marjă sau închid.")
          : k === "grid" ? "Aș lăsa o zi să vedem dacă revine în interval; dacă nu, aș opri botul și aș face unul nou din fișă, pe unde stă prețul acum." : null;
`, `        // v100.62: aceleasi actiuni ca semaforul (o singura voce); titlul si textul vin din regulile alertelor (pachetul 3)
        var fc = k === "lich" ? (a.nivel === "critic" ? "Aș adăuga marjă sau aș închide botul acum." : "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.")
          : k === "grid" ? "Aș aștepta o zi; dacă nu revine în interval, aș închide botul și aș porni din fișă unul la prețul de acum." : null;
`],
  [`      out.push({ cod: "margine", ton: ton, titlu: "Până la marginea de jos (" + pret(jos) + ") sunt " + Math.abs(100 * (jos - p) / p).toFixed(1) + "%",
        text: "Acolo botul ar ține cam " + Math.round(laJos.pozitie) + " " + nume + " (acum " + Math.round(scen.grid.poz) + "), iar totalul ar fi în jur de " + usdt(laJos.total) + ". " +
          (fz || fs ? "În trecutul " + nume + ", prețul a coborât atât " + [fz ? "într-o zi în " + fz : null, fs ? "într-o săptămână în " + fs : null].filter(Boolean).join(" și ") + "." : "Nu am destul istoric ca să spun cât de des a coborât atât."),
        deCe: "Frecvență din lumânările de 4 ore ale monedei, ferestre care nu se suprapun. Nu e o prognoză.",
        faCe: ton === "atentie" ? "Se întâmplă des pe moneda asta: n-aș crește levierul și n-aș pune bani în plus în botul ăsta." : null });
`, `      // v100.62: titlul cu cifra intai (asa il rescria Consilierul); textul = o fraza - ce ar fi la margine si cat de des coboara atat
      out.push({ cod: "margine", ton: ton, titlu: TextRo.pct(Math.abs(100 * (jos - p) / p)) + " până la marginea de jos (" + pret(jos) + ")",
        text: "~" + Math.round(laJos.pozitie) + " " + nume + " la margine (acum " + Math.round(scen.grid.poz) + "), total ~" + usdt(laJos.total) + "; " +
          (fz || fs ? "coboară atât în " + [fz, fs].filter(Boolean).join(" și ") + "." : "n-am destul istoric pentru cât de des coboară atât."),
        sursa: "Frecvență pe lumânările de 4 ore ale monedei, ferestre fără suprapunere.",
        faCe: ton === "atentie" ? "N-aș mări levierul și n-aș pune bani în plus în botul ăsta." : null });
`],
  [`    var fisa = x.fisa || null, dirBot = String(b.directie || "").toLowerCase(), P = function (v) { return (v * 100).toFixed(2).replace(".", ",") + "%"; };
    var X = function (v) { return v.toFixed(1).replace(".", ",") + "×"; };
`, `    var fisa = x.fisa || null, dirBot = String(b.directie || "").toLowerCase(), P = function (v) { return TextRo.pct(v * 100, 2); };
    var X = function (v) { return TextRo.ori(v); };
`],
  [`        text: (d.motive || []).join("; ") + "." + (contra && dirBot === "long" ? " Pe scădere un grid long cumpără la fiecare nivel: poziția crește și pierderea pe ea se adâncește." : contra ? " Pe urcare un grid short vinde la fiecare nivel: poziția crește și pierderea pe ea se adâncește." : ""),
        deCe: "Trendul e măsurat pe bare închise (EMA20/EMA50 + structura pe 4h, EMA pe 1z); nu spune încotro va merge.",
        faCe: contra ? "N-aș adăuga bani botului cât trendul e împotrivă. Dacă se face și „tare” pe 1z, aș lua în calcul să-l opresc aproape de zero (vezi prețul de zero mai jos) și să pornesc unul pe direcția trendului, din fișă."
          : cu ? "Aș lăsa botul să lucreze; trendul e de partea lui." : "Pentru un grid, lateral e bine: aș lăsa botul să facă perechi." });
`, `        // v100.62: textul = masuratoarea; ce face gridul contra trendului si „nu spune încotro merge” stau in legenda Consilierului
        text: d.motive && d.motive.length ? d.motive.join(" · ") + "." : "",
        sursa: "EMA20/EMA50 și structura pe 4 h, EMA pe 1 zi, pe bare închise.",
        faCe: contra ? "N-aș adăuga bani; dacă se întărește, aș închide botul lângă zero și aș porni pe trend."
          : cu ? "L-aș lăsa să lucreze." : "L-aș lăsa să facă perechi: lateral e bine pentru un grid." });
`],
  [`      out.push({ cod: "miscare-cu", ton: "bine", titlu: "Mișcare mare CU botul (4h " + X(rg.r4h) + ", 24h " + X(rg.r24h) + " față de obișnuit)",
        text: "Prețul merge în direcția botului: grilele " + (dirBot === "long" ? "de sus" : "de jos") + " încasează pe drum, iar poziția se micșorează. Riscul e la întoarcere, când gridul cumpără înapoi la fiecare grilă.",
        deCe: "Măsurat pe 40 de monede (27.09): după o mișcare cu botul gridul a ieșit pe plus în 59% din ferestre, contra 50%, în liniște 56% — nimic dovedit, dar nicio pagubă văzută pe mișcarea cu botul.",
        faCe: "L-aș lăsa să lucreze, fără bani în plus; aș pune opritorul la prețul de zero și aș urmări marginea " + (dirBot === "long" ? "de sus" : "de jos") + " (vezi semaforul de sus)." });
`, `      out.push({ cod: "miscare-cu", ton: "bine", titlu: "Mișcare cu botul: " + X(rg.r4h) + " obișnuitul (4 h), " + X(rg.r24h) + " (24 h)",
        text: "Prețul merge în direcția botului: grilele " + (dirBot === "long" ? "de sus" : "de jos") + " încasează pe drum și poziția scade.",
        sursa: "Pe 40 de monede (27.09), după o mișcare cu botul, 59% din ferestre au ieșit pe plus (contra 50%, în liniște 56%).",
        faCe: "L-aș lăsa fără bani în plus, cu stopul mutat la zero-ul botului, și aș urmări marginea " + (dirBot === "long" ? "de sus" : "de jos") + "." });
`],
  [`      out.push({ cod: "miscare", ton: "atentie", titlu: "Mișcare mare acum" + (rg.sens && (dirBot === "long" || dirBot === "short") ? " împotriva botului" : "") + " (4h " + X(rg.r4h) + ", 24h " + X(rg.r24h) + " față de obișnuit)",
        text: "În mișcare gridul nu mai face perechi, doar strânge poziție pe direcția prețului. Când se liniștește, reia perechile.",
        deCe: "„Obișnuit” = percentila 75 a mișcărilor monedei pe 30 de zile.",
        faCe: "Nu adăuga bani acum și n-aș porni alt grid pe moneda asta până nu revine liniștea. Pe ăsta l-aș lăsa cât lichidarea e peste 15%." });
`, `      out.push({ cod: "miscare", ton: "atentie", titlu: "Mișcare " + (rg.sens && (dirBot === "long" || dirBot === "short") ? "contra botului" : "mare") + ": " + X(rg.r4h) + " obișnuitul (4 h), " + X(rg.r24h) + " (24 h)",
        text: "În mișcare gridul nu face perechi, doar strânge poziție pe direcția prețului; le reia când se liniștește.",
        sursa: "„Obișnuitul” = percentila 75 a mișcărilor monedei pe 30 de zile.",
        faCe: "N-aș adăuga bani și n-aș porni alt grid aici până la liniște; pe ăsta l-aș lăsa cât lichidarea e peste 15%." });
`],
  [`      out.push({ cod: "liniste", ton: rar ? "info" : "bine", titlu: "Liniște de " + L.zileLiniste.toFixed(1).replace(".", ",") + " zile",
        text: "Din " + L.n + " perioade de liniște ale monedei care au ajuns aici, " + L.k + " din " + L.n + " au mai ținut încă " + L.H + " zile (" + P(L.p) + ").",
        deCe: "Frecvență din ultimele 30 de zile; interval de încredere " + P(L.ic[0]) + " – " + P(L.ic[1]) + ".",
        faCe: rar ? "Liniștea ține rar mult pe moneda asta: n-aș pune mai mulți bani în grid acum; aș încasa ce face și aș fi pregătit să-l opresc la prima mișcare mare." : "Liniștea tinde să țină aici: aș lăsa botul să lucreze." });
`, `      out.push({ cod: "liniste", ton: rar ? "info" : "bine", titlu: "Liniște de " + TextRo.num(L.zileLiniste, 1) + " zile",
        text: "Pe moneda asta, liniștea care a ajuns aici a mai ținut " + L.H + " zile în " + Math.round(L.p * 100) + "% din cazuri (" + L.k + " din " + L.n + ").",
        sursa: "Ultimele 30 de zile; interval de încredere " + TextRo.pct(L.ic[0] * 100, 0) + "–" + TextRo.pct(L.ic[1] * 100, 0) + ".",
        faCe: rar ? "N-aș pune bani în plus; aș încasa ce face și aș închide botul la prima mișcare mare." : "L-aș lăsa să lucreze: liniștea tinde să țină aici." });
`],
  [`          titlu: "Ritmul a " + (sc ? "scăzut" : "crescut") + ": grilele au adus " + rt.grile24h.toFixed(2) + " USDT în 24 h, media e " + rt.medieZi.toFixed(2) + "/zi",
          text: (rt.tranz24h != null && rt.tranzMedieZi > 0 ? rt.tranz24h + " tranzacții în 24 h, față de " + Math.round(rt.tranzMedieZi) + " pe zi în medie. " : "") +
            (sc ? "De obicei asta înseamnă că prețul a ieșit din zona unde botul face perechi, sau că piața a înghețat." : "Piața se mișcă mai mult; e bine pentru grile cât prețul rămâne în interval."),
          faCe: sc ? "Dacă ritmul rămâne jos încă o zi, aș muta gridul pe unde stă prețul: opresc și pornesc unul nou din fișă." : "Aș verifica lichidarea: ritmul mare vine des cu mișcare mare." });
`, `          titlu: "Ritmul a " + (sc ? "scăzut" : "crescut") + ": grilele " + TextRo.num(rt.grile24h, 2) + " USDT în 24 h, media " + TextRo.num(rt.medieZi, 2) + "/zi",
          text: mare((rt.tranz24h != null && rt.tranzMedieZi > 0 ? rt.tranz24h + " tranzacții în 24 h față de " + Math.round(rt.tranzMedieZi) + " pe zi: " : "") +
            (sc ? "de obicei prețul a ieșit din zona perechilor sau piața a înghețat." : "piața se mișcă mai mult, bine pentru grile cât prețul stă în interval.")),
          faCe: sc ? "Aș închide botul și aș porni din fișă unul la prețul de acum, dacă ritmul rămâne jos încă o zi." : "Aș verifica lichidarea: ritmul mare vine des cu mișcare mare." });
`],
  [`      out.push({ cod: "costuri", ton: "atentie", titlu: "Costurile mănâncă grilele: " + (co.netZi >= 0 ? "+" : "−") + Math.abs(co.netZi).toFixed(2) + " USDT pe zi, net",
        text: "Grilele în 24 h: " + (co.grile24h != null ? co.grile24h.toFixed(2) : "-") + " USDT; comisioane " + (co.comisionZi != null ? co.comisionZi.toFixed(2) : "-") + " și funding " + (co.fundingZi != null ? co.fundingZi.toFixed(2) : "-") + " pe zi.",
        faCe: co.fundingMananca ? "La următorul bot aș lua levier mai mic sau direcția care încasează funding-ul." : "Aș rări grilele (pas mai mare) ca să rămână mai mult după comision." });
`, `      out.push({ cod: "costuri", ton: "atentie", titlu: "Costurile mănâncă grilele: " + TextRo.usdt(co.netZi, Math.abs(co.netZi) < 0.01 ? 3 : 2) + " pe zi, net",
        text: "Grilele aduc " + (co.grile24h != null ? TextRo.num(co.grile24h, 2) : "—") + " USDT în 24 h; comisioanele iau " + (co.comisionZi != null ? TextRo.num(co.comisionZi, 2) : "—") + " și funding-ul " + (co.fundingZi != null ? TextRo.num(co.fundingZi, 2) : "—") + " pe zi.",
        faCe: co.fundingMananca ? "Aș lua levier mai mic sau direcția care încasează funding-ul, la următorul bot." : "Aș rări grilele (pas mai mare) ca să rămână mai mult după comision." });
`],
  [`    if (g && g.preaDese) probleme.push("grilele sunt prea dese: " + g.grile + " " + g.mod + " lasă " + P(g.netPct) + " pe umplere după comision");
    if (lev !== null && sig > 0 && lev > sig) probleme.push("levierul " + lev + "× e peste cel sigur azi (" + sig + "×)");
    if (probleme.length) out.push({ cod: "setare", ton: "info", titlu: "Setarea botului", text: probleme.join("; ") + ".",
      faCe: "Nu l-aș opri doar pentru asta. La următorul bot: grilele geometrice și levierul din fișă" + (sig > 0 ? " (cel mult " + sig + "×)" : "") + "." });
`, `    var dese = !!(g && g.preaDese), levMare = lev !== null && sig > 0 && lev > sig;
    if (dese) probleme.push("grilele (" + g.grile + ", " + (g.mod === "geometric" ? "geometrice" : "aritmetice") + ") lasă " + P(g.netPct) + " pe umplere după comision");
    if (levMare) probleme.push("levierul " + lev + "× e peste cel sigur azi (" + sig + "×)");
    // v100.62: titlul spune CE e gresit, cifrele stau in text
    if (probleme.length) out.push({ cod: "setare", ton: "info", titlu: "Setarea botului: " + (dese && levMare ? "grile prea dese și levier prea mare" : dese ? "grile prea dese" : "levier prea mare"),
      text: mare(probleme.join("; ")) + ".",
      faCe: "N-aș închide botul pentru asta; la următorul aș lua grile geometrice și levierul din fișă" + (sig > 0 ? " (cel mult " + sig + "×)" : "") + "." });
`],
  [`        text: "Acum, închis, ai lua " + (z.iei != null ? z.iei.toFixed(2) + " USDT" : "-") + (inv ? " din " + inv.toFixed(2) + " investiți" : "") + ".",
`, `        text: "Închis acum, ai lua " + (z.iei != null ? TextRo.num(z.iei, 2) + " USDT" : "—") + (inv ? " din " + TextRo.num(inv, 2) + " investiți" : "") + ".",
`],
  [`        faCe: "Dacă vrei să ieși fără pierdere, pune în Pionex take-profit-ul botului la " + pret(z.pretZero) + " (nu stop: prețul de zero e " + (z.distantaZeroPct > 0 ? "deasupra" : "sub") + " prețul de acum) și lasă-l să lucreze până acolo." });
`, `        faCe: "Aș pune take-profit-ul botului la " + pret(z.pretZero) + " ca să ies fără pierdere (nu stop: zero-ul e " + (z.distantaZeroPct > 0 ? "deasupra prețului" : "sub preț") + ")." });
`],
  [`        text: x.rezumat.text + (x.rezumat.ton === "rau" && b.directie === "long" ? " Pe scădere un grid long cumpără la fiecare nivel, deci poziția crește și pierderea pe ea se adâncește." : ""),
        deCe: "Direcția e măsurată pe bare închise; nu spune încotro va merge.",
        faCe: x.rezumat.ton === "rau" ? "Pe termen scurt piața îți merge contra: n-aș adăuga bani până nu se întoarce pe 4h." : null });
`, `        // v100.62: textul = dovezile (concluzia e in titlu); ce face gridul contra pietei si „bare închise, nu prognoză” stau in legenda Consilierului
        text: x.rezumat.dovezi || x.rezumat.text,
        faCe: x.rezumat.ton === "rau" ? "N-aș adăuga bani până nu se întoarce pe 4 h." : null });
`],
  [`        titlu: "Finanțarea e " + (f * 100).toFixed(3) + "% la 8 ore",
        text: (platesti ? "Poziția ta o plătește." : "Poziția ta o încasează.") + (nr(b.finantare) === null ? "" : " Până acum botul a " + (nr(b.finantare) < 0 ? "plătit " : "primit ") + Math.abs(nr(b.finantare)).toFixed(2) + " USDT."),
        deCe: "Rata e de la Binance, pentru orientare; Pionex poate avea alta.",
        faCe: platesti && Math.abs(f) >= 0.0005 ? "E mare: la socoteala zilei scade câștigul din grile; n-aș ține botul mult pe direcția asta cu funding-ul așa." : null });
`, `        titlu: "Funding-ul: " + TextRo.pct(f * 100, 3) + " la 8 ore, " + (platesti ? "îl plătești" : "îl încasezi"),
        text: mare((nr(b.finantare) === null ? "" : "până acum botul a " + (nr(b.finantare) < 0 ? "plătit " : "primit ") + TextRo.num(Math.abs(nr(b.finantare)), 2) + " USDT; ") +
          (platesti ? "la rata asta plătești din câștigul grilelor." : "la rata asta încasezi peste câștigul grilelor.")),
        sursa: "Rata e de la Binance, pentru orientare; Pionex poate avea alta.",
        faCe: platesti && Math.abs(f) >= 0.0005 ? "N-aș ține botul mult pe direcția asta cu funding-ul atât de mare." : null });
`],
  [`      out.push({ cod: "nimic", ton: "bine", titlu: "Nimic urgent", text: "Nu văd nimic care să ceară o mișcare acum" + (tot !== null ? "; totalul e " + usdt(tot) : "") + ".", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară." });
`, `      out.push({ cod: "nimic", ton: "bine", titlu: "Nimic urgent", text: tot !== null ? "Totalul botului e " + usdt(tot) + "." : "", faCe: "L-aș lăsa să lucreze și m-aș uita din nou diseară." });
`],
];
