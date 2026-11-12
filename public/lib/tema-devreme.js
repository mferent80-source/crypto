// v100.329 (revizia Opus): tema Tabloului pusă IMEDIAT ce s-a citit pagina, înaintea celorlalte ~90 de scripturi. Piața azi e pagina de pornire și
// avea tema pusă abia la DOMContentLoaded (tbTemaAplica din app.js) ⇒ la deschidere clipea închis → alb. Aceeași cheie și aceeași regulă ca
// tbTemaZi (app.js): orice în afară de „noapte” = zi. tbTemaAplica o pune din nou mai târziu (butoanele, graficul) - aici doar clasa.
(function () {
  try {
    var zi = localStorage.getItem("tbTema") !== "noapte";
    ["tabloubot", "t212", "dash"].forEach(function (id) { var p = document.getElementById(id); if (p) p.classList.toggle("tbZi", zi); });
  } catch (e) {}
})();
