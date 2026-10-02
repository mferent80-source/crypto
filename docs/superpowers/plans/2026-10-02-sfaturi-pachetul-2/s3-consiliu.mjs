// Sarcina 3 · consiliu.js (pachetul 2): titlul sfatului „margine” vine gata din sfaturi.js (cifra intai) -> titluMargine dispare;
// verdictul vechi al Tabloului (ideea 3): starea Pionex are „de ce”-ul ei (nu titlul spus a doua oara), lichidarea depasita are titlu
// cu virgula; legenda primeste avertizarile scoase din sfaturi (trendul/directia pe bare inchise, gridul contra pietei).
export default [
  [`  var LEGENDA = "Frecvențele („în N% din zile”) vin din trecut și nu sunt promisiuni, iar comparațiile (deciziile tale) nu sunt dovezi; „(puține cazuri)” înseamnă prea puține date: un semn, nu o regulă. "
    + "Prețurile propuse`, `  var LEGENDA = "Frecvențele („în N% din zile”) vin din trecut și nu sunt promisiuni, iar comparațiile (deciziile tale) nu sunt dovezi; „(puține cazuri)” înseamnă prea puține date: un semn, nu o regulă. "
    // v100.62 (pachetul 2): avertizarile scoase din sfaturile vechi (trendul, directia, ce face gridul contra pietei) stau tot aici, o data
    + "Trendul și direcția se măsoară pe bare închise: arată starea de acum, nu încotro merge prețul; contra botului, gridul adaugă poziție la fiecare grilă și pierderea pe ea crește. "
    + "Prețurile propuse`],
  [String.raw`  // „Până la marginea de jos (0.3841) sunt 1.7%” -> „1,7% până la marginea de jos (0.3841)” (ca in demo: cifra intai)
  function titluMargine(t) {
    var m = /^Până la marginea de (jos|sus) \(([^)]*)\) sunt ([0-9.,]+)%$/.exec(String(t || ""));
    return m ? m[3].replace(".", ",") + "% până la marginea de " + m[1] + " (" + m[2] + ")" : t;
  }
`, ``],
  [`m.titlu = titluMargine(s.titlu);`, `m.titlu = s.titlu;`],
  [`titlu: s.cod === "margine" ? titluMargine(s.titlu) : s.titlu,`, `titlu: s.titlu,`],
  [String.raw`      var mM = /marginea contului ca ([^,\s]+)/.exec(opTxt), mR = /starea de risc ca ([^,\s]+)/.exec(opTxt), mL = /([0-9.]+)% până la lichidare/.exec(opTxt);
      var tO = mM ? "Pionex: marginea contului e " + mM[1] : mR ? "Pionex: starea de risc e " + mR[1] : mL ? "Lichidarea la " + TextRo.pct(Number(mL[1])) : op.titlu !== "Ieși" ? mare(op.titlu) : mare(opTxt.replace(/\.$/, ""));
      cand.push({ cod: "opreste", nivel: "iesi", c: "r", titlu: tO, text: mL ? "" : opTxt,`,
   String.raw`      var mM = /marginea contului ca ([^,\s]+)/.exec(opTxt), mR = /starea de risc ca ([^,\s]+)/.exec(opTxt), mL = /([0-9.]+)% până la lichidare/.exec(opTxt);
      var mN = /trecut deja de pragul de lichidare cu ([0-9.]+)%/.exec(opTxt);
      var tO = mM ? "Pionex: marginea contului e " + mM[1] : mR ? "Pionex: starea de risc e " + mR[1] : mL ? "Lichidarea la " + TextRo.pct(Number(mL[1])) : mN ? "Prețul e dincolo de lichidare cu " + TextRo.pct(Number(mN[1]))
        : op.titlu !== "Ieși" ? mare(op.titlu) : mare(opTxt.replace(/\.$/, ""));
      // v100.62 (ideea 3 din pachetul 1): textul = de ce (starea bursei bate calculul nostru), nu titlul spus a doua oara
      var dO = mM || mR ? "Pionex o dă altfel decât " + (mM ? "NORMAL" : "TRADING") + ", iar starea bursei bate calculul nostru al lichidării." : mL || mN ? "" : opTxt;
      cand.push({ cod: "opreste", nivel: "iesi", c: "r", titlu: tO, text: dO,`],
];
