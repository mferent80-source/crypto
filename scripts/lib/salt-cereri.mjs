// salt-cereri.mjs (v101.86, el 07.10: „la dețineri să pot adăuga și manual cu preț în euro și USD, că alea din Salt așa le am”):
// cererile de pe pagina alerts (prin worker-ul Paznic) aplicate pe lista Salt din Radar - una singură, aceeași cu pagina Salt.
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
// revizia (M7): Radarul întoarce [] la orice eroare de citire; o listă GOALĂ cât poza știe poziții Salt NU se scrie peste
// (altfel ar rămâne doar poziția nouă și s-ar pierde tot ce a scris el de mână)
export function listaSaltSigura(citita, randuriCunoscute) {
  if (!Array.isArray(citita)) return false;
  return citita.length > 0 || !(Array.isArray(randuriCunoscute) && randuriCunoscute.length > 0);
}
export function aplicaCereriSalt(lista, cereri, univers) {
  let l = (Array.isArray(lista) ? lista : []).map((x) => ({ ...x })); const rezultate = [], u = Array.isArray(univers) ? univers : [];
  for (const c of Array.isArray(cereri) ? cereri : []) {
    const id = String(c && c.id || ""), cauta = String(c && (c.isin || c.simbol) || "").trim().toUpperCase();
    // revizia (M5): și forma scurtă din alerte („RHM” pentru RHM.DE), doar când e unică în lista Salt
    const scurte = u.filter((x) => String(x.simbol || "").toUpperCase().replace(/\.[A-Z]+$/, "") === cauta);
    const ins = u.find((x) => x.isin === cauta) || u.find((x) => String(x.simbol || "").toUpperCase() === cauta) || (scurte.length === 1 ? scurte[0] : null);
    const nu = (motiv) => rezultate.push({ id, stare: "respins", motiv });
    if (c && c.op === "scoate") {
      const isin = ins ? ins.isin : cauta, i = l.findIndex((x) => x.isin === isin);
      if (i < 0) { nu((ins ? ins.simbol : cauta) + " nu e în pozițiile tale Salt"); continue; }
      const s = l[i].simbol; l = l.filter((_, k) => k !== i); rezultate.push({ id, stare: "ok", motiv: s + " scos" }); continue;
    }
    if (!c || c.op !== "pune") { nu("cerere necunoscută"); continue; }
    if (!ins) { nu(cauta + " nu e în lista Salt (caută-l după ISIN)"); continue; }
    const qty = nr(c.qty), pm = nr(c.pretMediu);
    if (!(qty > 0)) { nu("bucățile trebuie să fie mai mari ca zero"); continue; }
    if (!(pm > 0)) { nu("prețul mediu trebuie să fie mai mare ca zero"); continue; }
    const mon = c.moneda === "USD" ? "USD" : "EUR";
    if (mon === "USD" && ins.moneda !== "USD") { nu(ins.simbol + " se tranzacționează în " + (ins.moneda || "EUR") + ", nu în USD: scrie prețul în EUR"); continue; }
    const i = l.findIndex((x) => x.isin === ins.isin);
    // revizia (I2): „Editează” fără dată păstrează data cumpărării de dinainte - fără ea dispare stopul care urcă
    const de = /^\d{4}-\d{2}-\d{2}$/.test(String(c.de || "")) ? c.de : i >= 0 ? l[i].de || null : null;
    const rand = { isin: ins.isin, simbol: ins.simbol, nume: String(ins.nume || "").slice(0, 80), qty, pretMediu: pm, de, plata: mon === "EUR" ? "EUR" : "simbol" };
    if (i >= 0) { l[i] = rand; rezultate.push({ id, stare: "ok", motiv: ins.simbol + " modificat" }); } else { l.push(rand); rezultate.push({ id, stare: "ok", motiv: ins.simbol + " adăugat" }); }
  }
  return { lista: l, rezultate };
}
