// v100.372 (20.11.2026, el: „fa ideea”): paza textelor robotului de lățime (market-breadth, GitHub). Robotul își schimbă din când în când
// formulările; una nouă trecea pe Piața azi netradusă (fără diacritice, cu punct zecimal) și aflam din întâmplare. Paza paginilor (VPS, 07:50
// și după livrări) citește aceeași sursă ca pagina și întreabă CODUL paginii (LatimeUS.formeNecunoscute) ce texte nu au formă cunoscută.
// Doar citire: o cerere GET la sursa publică a robotului, fără parolă și fără date din Radar.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// public/lib/latime-us.js rulat într-un context vm (fișierul paginii, nu o copie a listei de forme)
export function incarcaLatimeUS(rad) {
  const c = { console };
  c.window = c; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(rad, "public", "lib", "latime-us.js"), "utf8"), c);
  return c.LatimeUS;
}
const scurt = (t) => String(t).replace(/\s+/g, " ").trim();
// formele necunoscute ⇒ abateri în forma pazei paginilor ({ cheie, text }); cel mult 5 pe mesaj
export function abateriRobot(necunoscute) {
  return Array.from(necunoscute || []).slice(0, 5).map((n) => ({ cheie: "robot:" + n.unde + ":" + scurt(n.text).slice(0, 60),
    text: "text nou de la robotul de lățime, netradus (" + n.unde + "): „" + scurt(n.text).slice(0, 120) + "”" }));
}
// ⇒ { abateri, eroare }. Robotul care nu răspunde NU e abatere (pagina spune singură „datele nu s-au putut citi”): eroarea merge doar în jurnal.
export async function citesteRobot({ rad, cere }) {
  try {
    const LU = incarcaLatimeUS(rad);
    const r = await (cere || fetch)(LU.SURSA, { signal: AbortSignal.timeout(20000) });
    if (!r || !r.ok) return { abateri: [], eroare: "HTTP " + (r ? r.status : "?") };
    const j = await r.json();
    if (!j || typeof j !== "object" || !j.full || !j.full.engine) return { abateri: [], eroare: "răspuns fără full.engine" };
    return { abateri: abateriRobot(Array.from(LU.formeNecunoscute(j), (n) => ({ unde: String(n.unde), text: String(n.text) }))), eroare: null };
  } catch (e) { return { abateri: [], eroare: String((e && e.message) || e).slice(0, 160) }; }
}
