// Profitul REAL (v100.284 / colector v101.156; el, 31.10: „tot pe canalul ăsta vreau duminica să-mi trimiți un raport de profitabilitate
// real, săptămânal, lunar, anual și total pe boți și pe Trade 212 separat, dar doar pe boți și acțiuni închise, nu profit estimat sau
// pierdere, ci real”): doar ce s-a ÎNCHIS, pe data închiderii, netul REALIZAT - aceleași cifre ca Jurnalul (boți: StatisticaTrade.dinPionex /
// dinPionexAlte, după comisioane și funding; Trading 212: StatisticaTrade.dinT212, trade-urile închise după comisioane). Fără poziții
// deschise, fără dividende. Modul pur, probat în scripts/proba-v100284.mjs; textul în mesaje-colector.mjs (profitReal).
const ZI = 86400000;
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }), fZs = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Bucharest", weekday: "short" });
const ziRo = (t) => fZi.format(new Date(t));
const ZILE = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const nr = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const r2 = (v) => Math.round(v * 100) / 100;
// începutul zilei României `zi` (UTC+2 iarna, +3 vara; în ziua schimbării orei miezul nopții e încă pe ora veche)
function inceputZi(zi) { for (const h of [2, 3]) { const x = Date.parse(zi + "T00:00:00Z") - h * 3600000; if (ziRo(x) === zi && ziRo(x - 1) !== zi) return x; } return Date.parse(zi + "T00:00:00Z"); }
const plusZile = (zi, d) => new Date(Date.parse(zi + "T12:00:00Z") + d * ZI).toISOString().slice(0, 10);

// perioadele raportului, pe ora României: săptămâna de luni 00:00, luna și anul calendaristice (până acum), totalul
export function perioade(acum) {
  const zi = ziRo(acum), luni = plusZile(zi, -(ZILE[fZs.format(new Date(acum))] || 0));
  return { saptamana: { de: inceputZi(luni), luni, azi: zi }, luna: { de: inceputZi(zi.slice(0, 8) + "01"), cheie: zi.slice(0, 7) }, an: { de: inceputZi(zi.slice(0, 4) + "-01-01"), an: zi.slice(0, 4) }, total: { de: -Infinity } };
}
// lista = [{ inchis, rezultat }] cu rezultatul NET realizat ⇒ pe fiecare perioadă { n, net, plus }; la total și prima închidere (`de`)
export function profitPe(lista, acum) {
  const P = perioade(acum), out = { perioade: P };
  const l = (Array.isArray(lista) ? lista : []).filter((x) => x && nr(x.inchis) !== null && nr(x.rezultat) !== null && x.inchis <= acum);
  for (const k of ["saptamana", "luna", "an", "total"]) {
    const s = l.filter((x) => x.inchis >= P[k].de);
    out[k] = { n: s.length, net: r2(s.reduce((a, x) => a + nr(x.rezultat), 0)), plus: s.filter((x) => nr(x.rezultat) > 0).length };
  }
  out.total.de = l.reduce((m, x) => (m === null || x.inchis < m ? x.inchis : m), null);
  return out;
}
// duminica de la 20 (ora României), o dată pe duminică
export const profitDatorat = (st, acum, ora) => fZs.format(new Date(acum)) === "Sun" && Number(ora) >= 20 && st.profit !== ziRo(acum);
