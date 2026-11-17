// v100.140 (el 08.10: „fa ideile” - ideea 1): Monte Carlo pe bot în afara firului paginii - Tabloul trimite lumânările și setarea, worker-ul
// întoarce rezultatul lui GridSim.simuleaza; pagina (graficul, prețul live, atingerile) nu mai îngheață 0,3–3 s la fiecare 15 minute.
// Aceleași module ca pagina, în aceeași ordine ca în index.html; fără DOM. Intrarea: { id, b15, st, o }; ieșirea: { id, rez } sau { id, eroare }.
importScripts("/lib/text-ro.js", "/lib/grid-calcul.js", "/lib/grid-proba.js", "/lib/monte-simbol.js", "/lib/grid-sim.js");
self.onmessage = function (e) {
  var d = e && e.data || {};
  // v100.351 (el: „fă tot” - viteza): d.fel = "hotarare" (Ce fac cu botul ăsta?) / "compara" (alte setări pe aceleași drumuri) / lipsă = simuleaza
  try { var rez = d.fel === "hotarare" ? GridSim.hotarare(d.b15, d.st, d.o) : d.fel === "compara" ? GridSim.compara(d.b15, d.st, d.o) : GridSim.simuleaza(d.b15, d.st, d.o); self.postMessage({ id: d.id, rez: rez }); }
  catch (err) { self.postMessage({ id: d.id, eroare: String(err && err.message || err) }); }
};
