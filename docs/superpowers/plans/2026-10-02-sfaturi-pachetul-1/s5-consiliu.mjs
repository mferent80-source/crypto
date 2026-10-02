// pachetul 1 (sfaturi concise), consiliu.js - partea botilor: titlul (≤ 60, cu rezerva la primul motiv), „Ce aș face eu” (o actiune),
// „de ce” separat (explica / textul motivului), banii cu unitate, perechile, Discord (titlu ≤ 60 + 2 randuri), legenda comuna
export default [
  [`  var U = function (v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1).replace(".", ",") + " USDT"; };`,
   `  var U = function (v) { return TextRo.usdt(v, 1); };
  // v100.61 (specul „sfaturi concise”): avertizarile comune se spun O DATA, aici - pagina le arata sub Consilier, nu in fiecare sfat
  var LEGENDA = "Frecvențele („în N% din zile”) vin din trecut și nu sunt promisiuni, iar comparațiile (deciziile tale) nu sunt dovezi; „(puține cazuri)” înseamnă sub 10 cazuri, un semn, nu o regulă. "
    + "Prețurile propuse (zero-ul, stopul, podeaua) se recalculează la fiecare umplere; la întoarcere gridul cumpără înapoi la fiecare grilă, de aceea contează stopul.";
  var MAX_TITLU = 60;
  // taie la ultimul spatiu de dinainte de n, cu „…” (ultima rezerva - titlurile vin deja scurte)
  function taie(s, n) { s = String(s || ""); if (s.length <= n) return s; var t = s.slice(0, n - 1), i = t.lastIndexOf(" "); return (i > n / 2 ? t.slice(0, i) : t).replace(/[\\s,;:·—-]+$/, "") + "…"; }`],
  [`      var m = { cod: k.cod, nivel: k.nivel, c: k.nivel === "iesi" ? "r" : "g", titlu: mare(k.motiv), text: "", faCe: k.faCe || "", faCeSlab: k.faCeSlab || "", scurt: mic(k.motiv) };`,
   `      // v100.61: explicatia semaforului (deCe) e textul motivului; sursa profilului (mută gridul) sta sub motiv
      var m = { cod: k.cod, nivel: k.nivel, c: k.nivel === "iesi" ? "r" : "g", titlu: mare(k.motiv), text: k.deCe || "", faCe: k.faCe || "", faCeSlab: k.faCeSlab || "", scurt: mic(k.motiv), extra: k.sursa || null };`],
  [`      if (k.cod === "muta" && k.parte !== "sus" && sfCod("margine")) { var s = sfCod("margine"); m.cod = "margine"; m.titlu = titluMargine(s.titlu); m.text = s.text; m.faCe = s.faCe || m.faCe; m.extra = k.motiv; folosite.margine = 1; }`,
   `      if (k.cod === "muta" && k.parte !== "sus" && sfCod("margine")) { var s = sfCod("margine"); m.cod = "margine"; m.titlu = titluMargine(s.titlu); m.text = s.text; m.faCe = s.faCe || m.faCe; m.extra = mare(k.motiv) + (k.sursa ? " · " + k.sursa : ""); folosite.margine = 1; }`],
  [`    if (cs && cs.tag && cs.tag.c === "bad" && !cand.some(function (m) { return m.cod === "plan"; })) {
      cand.push({ cod: "stop", nivel: "atentie", c: "r", titlu: "Stopul e " + cs.tag.t, text: String(cs.act || "").replace(/^Atins, te costă/, "Atins, stopul de la " + (cs.mare || "?") + " te costă"), faCe: cs.act || "",
        scurt: cs.tag.t === "peste plan" ? "stopul te costă mai mult decât planul" : "botul n-are protecție", cifre: cs.cifre || null, bani: cs.bani || null });
    }`,
   `    if (cs && cs.tag && cs.tag.c === "bad" && !cand.some(function (m) { return m.cod === "plan"; })) {
      // v100.61: titlul cu cifra (cat costa stopul atins), textul = de ce (cartela il da in deCe; o fixtura veche - actiunea ei)
      var pp = cs.tag.t === "peste plan", cost = nr(cs.atins) !== null ? nr(cs.atins) : cs.cifre ? nr(cs.cifre.laOpritor) : null;
      cand.push({ cod: "stop", nivel: "atentie", c: "r", titlu: pp ? "Stopul e peste plan" + (cost !== null ? ": atins, ≈ −" + Math.round(Math.abs(cost)) + " USDT" : "") : "Botul n-are stop activ în Pionex", text: cs.deCe || cs.act || "", faCe: cs.act || "",
        scurt: pp ? "stopul costă peste plan" : "botul n-are stop", cifre: cs.cifre || null, bani: cs.bani || null });
    }`],
  [`        scurt: s.cod === "margine" ? "prețul stă lângă marginea de jos" : mic(s.titlu) });`,
   `        scurt: s.cod === "margine" ? "prețul e lângă marginea de jos" : mic(s.titlu) });`],
  [`      var z1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1).replace(".", ","); };
      cand.push({ cod: "perechi", nivel: "atentie", c: "g", titlu: "Gridul încheie " + z1(pe.real) + " perechi pe zi; fișa aștepta " + z1(pe.est),
        text: "Pe cele 30 de zile de dinaintea pornirii, gridul tău ar fi încheiat ~" + z1(pe.est) + " perechi pe zi" + (pe.corectat ? " (corectat după boții tăi pe monedă)" : "") + "; " + (pe.fereastra || "de la pornire") + " a făcut " + Math.round(pe.raport * 100) + "% din asta. O frecvență din trecut, nu o promisiune.",
        faCe: "Aș muta gridul pe unde stă prețul acum (setările din fișă): cu atât de puține perechi nu-și acoperă costurile pe zi.", scurt: "gridul încheie sub jumătate din perechile așteptate" });`,
   `      var z1 = function (v) { return TextRo.num(Math.round(v * 10) / 10, 1); };
      cand.push({ cod: "perechi", nivel: "atentie", c: "g", titlu: "Gridul încheie " + z1(pe.real) + " perechi pe zi; fișa aștepta " + z1(pe.est),
        text: "Așteptarea vine din cele 30 de zile dinaintea pornirii" + (pe.corectat ? ", corectată după boții tăi pe monedă" : "") + "; " + (pe.fereastra || "de la pornire") + " a făcut " + Math.round(pe.raport * 100) + "% din ea, prea puțin pentru costuri.",
        faCe: "Aș muta gridul pe unde stă prețul acum, cu setările din fișă.", scurt: "gridul încheie prea puține perechi" });`],
  [`    var titlu = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : avert.length === 1 ? mare(avert[0].scurt) : mare(sm.motiv);`,
   `    // v100.61: titlul ≤ 60 - doua motive doar daca incap; altfel primul (al doilea e chiar dedesubt, in „De ce”)
    var doi = avert.length >= 2 ? mare(avert[0].scurt) + ", iar " + avert[1].scurt : "";
    var titlu = doi && doi.length <= MAX_TITLU ? doi : avert.length ? mare(avert[0].scurt) : mare(sm.motiv);`],
  [`    var sus = avert[0] || null, cuFace = avert.filter(function (m) { return m.faCe; })[0] || null, faCe = cuFace ? cuFace.faCe : sus ? (sus.faCeSlab || sus.faCe) : (sm.faCe || "");
    var st = cand.filter(function (m) { return m.cod === "stop"; })[0], cf = st && st.cifre;
    if (sus && sus.cod === "stop" && cf && nr(cf.frecventa) >= 0.5 && nr(cf.laOpritor) !== null && nr(x.opritor) !== null) {
      faCe = "Aș lăsa stopul la " + fp(x.opritor) + " și aș trece planul la −" + Math.round(Math.abs(nr(cf.laOpritor))) + " USDT: stopul planului" + (nr(cf.pretPropus) !== null ? " (" + fp(cf.pretPropus) + ")" : "") +
        " e atât de aproape încât o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(cf.frecventa) * 100) + "% din zile.";
    }
    if (avert.some(function (m) { return m.cod === "margine"; })) faCe += (faCe ? " " : "") + "Cât stă lângă margine, n-aș pune bani în plus.";`,
   `    var sus = avert[0] || null, cuFace = avert.filter(function (m) { return m.faCe; })[0] || null, faCe = cuFace ? cuFace.faCe : sus ? (sus.faCeSlab || sus.faCe) : (sm.faCe || "");
    // v100.61: „de ce” al actiunii, separat de ea - doar cand nu e deja textul unui motiv de dedesubt (verdictul semaforului, stopul lasat pe loc)
    var explica = avert.length ? null : (sm.deCe || null);
    var st = cand.filter(function (m) { return m.cod === "stop"; })[0], cf = st && st.cifre;
    if (sus && sus.cod === "stop" && cf && nr(cf.frecventa) >= 0.5 && nr(cf.laOpritor) !== null && nr(x.opritor) !== null) {
      faCe = "Aș lăsa stopul la " + fp(x.opritor) + " și aș trece planul la −" + Math.round(Math.abs(nr(cf.laOpritor))) + " USDT.";
      explica = "Stopul planului" + (nr(cf.pretPropus) !== null ? " (" + fp(cf.pretPropus) + ")" : "") + " e prea aproape: o zi obișnuită a monedei ajunge acolo în " + Math.round(nr(cf.frecventa) * 100) + "% din zile.";
    }
    // langa margine: „n-aș pune bani în plus” intra in aceeasi fraza, daca nu e deja spus si daca incape (≤ 110)
    var adaos = "n-aș pune bani în plus cât stă lângă margine";
    if (avert.some(function (m) { return m.cod === "margine"; }) && !/n-aș (pune|adăuga|mări)/i.test(faCe)) {
      var cuAdaos = faCe ? faCe.replace(/\\.$/, "") + "; " + adaos + "." : mare(adaos) + ".";
      if (cuAdaos.length <= 110) faCe = cuAdaos; else if (!explica) explica = mare(adaos) + ".";
    }`],
  [`    if (cf && nr(cf.laPropus) !== null) bani.push("pierderea maximă: " + (nr(cf.laOpritor) !== null ? U(nr(cf.laOpritor)).replace(" USDT", "") + " cu stopul de acum" : "fără margine (n-ai opritor)") + " · " + U(nr(cf.laPropus)).replace(" USDT", "") + " cu stopul planului");
    if (avert.some(function (m) { return m.cod === "margine"; }) && nr(x.laJos) !== null) bani.push("dacă atinge doar marginea de jos: " + U(nr(x.laJos)).replace(" USDT", ""));`,
   `    if (cf && nr(cf.laPropus) !== null) bani.push("pierderea maximă: " + (nr(cf.laOpritor) !== null ? U(nr(cf.laOpritor)) + " cu stopul de acum" : "fără margine (n-ai stop)") + " · " + U(nr(cf.laPropus)).replace(" USDT", "") + " cu stopul planului");
    if (avert.some(function (m) { return m.cod === "margine"; }) && nr(x.laJos) !== null) bani.push("dacă atinge doar marginea de jos: " + U(nr(x.laJos)).replace(" USDT", ""));`],
  [`    return { nivel: nivel, eticheta: ETICHETA[nivel] || ETICHETA.asteapta, titlu: titlu, faCe: faCe, bani: bani.length ? bani.join(" · ") : null, incredere: inc,
      motive: motive.map(function (m) { return { cod: m.cod, c: m.c, titlu: m.titlu, text: m.text, cip: m.cip, extra: m.extra || null }; }), rest: rest };`,
   `    return { nivel: nivel, eticheta: ETICHETA[nivel] || ETICHETA.asteapta, titlu: titlu, faCe: faCe, explica: explica, bani: bani.length ? bani.join(" · ") : null, incredere: inc,
      motive: motive.map(function (m) { return { cod: m.cod, c: m.c, titlu: m.titlu, text: m.text, cip: m.cip, extra: m.extra || null, scurt: m.scurt || null }; }), rest: rest };`],
  [`      motive: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return { cod: m && m.cod, c: m && m.c, titlu: m && m.titlu }; }) };`,
   `      motive: (Array.isArray(c.motive) ? c.motive : []).map(function (m) { return { cod: m && m.cod, c: m && m.c, titlu: m && m.titlu, scurt: m && m.scurt || null }; }) };`],
  [`    var al = { nivel: lite.nivel === "iesi" ? "critic" : lite.nivel === "atentie" ? "atentie" : "info", titlu: N + ": Consilierul — " + lite.eticheta + " · " + lite.titlu,
      mesaj: "Ce aș face eu: " + (lite.faCe || "—") + (lite.bani ? " · 💰 " + lite.bani : "") + (d ? " · De ce: " + d.text : ""), doarRadar: doar };`,
   `    // v100.61 (specul, regula 8): titlul ≤ 60 (moneda · verdictul: faptul; daca nu incape - motivul de sus pe scurt), mesajul pe 2 randuri
    var niv = String(lite.eticheta || "").replace(/^\\S+\\s+/, ""), pref = N + " · " + niv + ": ", t1 = pref + mic(lite.titlu);
    var tD = t1.length <= MAX_TITLU ? t1 : sus && sus.scurt && (pref + sus.scurt).length <= MAX_TITLU ? pref + sus.scurt : taie(t1, MAX_TITLU);
    var al = { nivel: lite.nivel === "iesi" ? "critic" : lite.nivel === "atentie" ? "atentie" : "info", titlu: tD,
      mesaj: "👉 " + (lite.faCe || "—") + (lite.bani ? " · 💰 " + lite.bani : "") + (d ? "\\nDe ce: " + d.text : ""), doarRadar: doar };`],
  [`    return "Pe Discord și pe pagina alerts: " + (a.eticheta || ETICHETA[a.nivel] || a.nivel) + " — colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute; verdictul de aici e cel complet.";`,
   `    return "Pe Discord și pe pagina alerts: " + (a.eticheta || ETICHETA[a.nivel] || a.nivel) + "; colectorul nu vede direcția pe mai multe intervale și se reface la câteva minute, iar verdictul de aici e cel complet.";`],
  [`      : "Când ai urmat Consilierul (" + u.length + "): median " + (o.urmat.median === null ? "—" : U(o.urmat.median)) + " la 24 h; când nu (" + n.length + "): " + (o.neurmat.median === null ? "—" : U(o.neurmat.median)) + ". O comparație, nu o dovadă.";`,
   `      : "Când ai urmat Consilierul (" + u.length + "): median " + (o.urmat.median === null ? "—" : U(o.urmat.median)) + " la 24 h; când nu (" + n.length + "): " + (o.neurmat.median === null ? "—" : U(o.neurmat.median)) + ".";`],
  [`  return { autopsieActiuni: autopsieActiuni,`,
   `  return { LEGENDA: LEGENDA, autopsieActiuni: autopsieActiuni,`],
];
