// Sarcina 2 · directie.js (rezumatul directiei, pe Tablou si in sfatul „directie”): o fraza, fara „ÎMPOTRIVA” cu majuscule, virgula
// zecimala in nota despre bara de 4 ore; in plus „dovezi” = acelasi text fara concluzie (sfatul are concluzia in titlu).
// Tonul si conditiile raman neatinse.
export default [
  [`    var z = rezumatBare(mari, imp, cu, lat, descr);
    // Bara de 4h care se formeaza ACUM poate merge tare invers fata de barele
    // inchise; atunci titlul verde ar linisti degeaba. Se spune, si tonul scade.
    var b4 = mari.filter(function (r) { return r.tf === "4H"; })[0];
    if (b4 && b4.formare && isFinite(b4.formare.pct) && Math.abs(b4.formare.pct) >= 2) {
      var contra = (b4.dir === "urca" && b4.formare.pct < 0) || (b4.dir === "coboara" && b4.formare.pct > 0) || b4.dir === "lateral";
      if (contra) {
        z.text += " Dar în bara de 4 ore de acum prețul " + (b4.formare.pct < 0 ? "scade" : "crește") + " cu " +
          Math.abs(b4.formare.pct).toFixed(1) + "%.";
        if (z.ton === "bine") z.ton = "atentie";
      }
    }
    return z;
  }

  function rezumatBare(mari, imp, cu, lat, descr) {
    if (imp.length === mari.length) return { text: "Piața merge ÎMPOTRIVA botului (" + descr + ").", ton: "rau" };
    if (imp.length) return { text: "Semnale amestecate: " + descr + ". O parte merge împotriva botului.", ton: "atentie" };
    if (lat.length === mari.length) return { text: "Piața e laterală (" + descr + ") - regimul potrivit unui grid.", ton: "bine" };
    if (cu.length) return { text: "Piața merge cu botul (" + descr + ").", ton: "bine" };
    return { text: descr, ton: "atentie" };
  }
`, `    var z = rezumatBare(mari, imp, cu, lat), nota = null;
    // Bara de 4h care se formeaza ACUM poate merge tare invers fata de barele
    // inchise; atunci titlul verde ar linisti degeaba. Se spune, si tonul scade.
    var b4 = mari.filter(function (r) { return r.tf === "4H"; })[0];
    if (b4 && b4.formare && isFinite(b4.formare.pct) && Math.abs(b4.formare.pct) >= 2) {
      var contra = (b4.dir === "urca" && b4.formare.pct < 0) || (b4.dir === "coboara" && b4.formare.pct > 0) || b4.dir === "lateral";
      if (contra) {
        nota = "dar în bara de 4 ore de acum prețul " + (b4.formare.pct < 0 ? "scade" : "crește") + " cu " + Math.abs(b4.formare.pct).toFixed(1).replace(".", ",") + "%";
        if (z.ton === "bine") z.ton = "atentie";
      }
    }
    // v100.62 (specul „sfaturi concise”, pachetul 2): o fraza, fara majuscule de strigat, virgula zecimala; „dovezi” = textul fara
    // concluzie (sfatul „directie” o are in titlu - nu o spune de doua ori)
    var dupa = (z.detaliu ? ": " + z.detaliu : "") + (nota ? "; " + nota : "") + ".", Descr = descr.charAt(0).toUpperCase() + descr.slice(1);
    return { ton: z.ton, text: (z.concluzie ? z.concluzie + " (" + descr + ")" : Descr) + dupa, dovezi: Descr + dupa };
  }

  function rezumatBare(mari, imp, cu, lat) {
    if (imp.length === mari.length) return { concluzie: "Piața merge împotriva botului", ton: "rau" };
    if (imp.length) return { concluzie: "Semnale amestecate", detaliu: "o parte merge împotriva botului", ton: "atentie" };
    if (lat.length === mari.length) return { concluzie: "Piața e laterală", detaliu: "regimul potrivit unui grid", ton: "bine" };
    if (cu.length) return { concluzie: "Piața merge cu botul", ton: "bine" };
    return { concluzie: "", ton: "atentie" };
  }
`],
];
