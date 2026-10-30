// v101.150 (30.10, el: „ok fă idei” - ideea 3 după v100.275): colectorul măsoară corpul ÎNAINTE să-l trimită, pe plafonul rutei
// (functions/_shared/plafon-corp.js, același tabel pe care îl aplică serverul). Peste plafon nu-l mai trimite (serverul l-ar refuza cu 413,
// iar pe 29–30.10 asta a ținut Piața azi goală o zi întreagă cu „Corp prea mare” fără cifre); de la 75% îl semnalează din timp.
import { plafonCale } from "../../functions/_shared/plafon-corp.js";

export const PRAG_APROAPE = 0.75;
export function kb(semne) { return (Number(semne) / 1024).toFixed(1).replace(".", ",") + " KB"; }
// cale + lungimea textului JSON (în semne, ca ruta) ⇒ { actiune, plafon, semne, cota, prea, aproape, text } sau null (rută fără plafon știut)
export function verificaCorp(cale, semne) {
  const p = plafonCale(cale);
  if (!p) return null;
  const n = Number(semne) || 0, cota = n / p.plafon;
  const pct = Math.round(cota * 100);
  return { actiune: p.actiune, plafon: p.plafon, semne: n, cota, prea: n > p.plafon, aproape: n <= p.plafon && cota >= PRAG_APROAPE,
    text: kb(n) + " din " + kb(p.plafon) + " (" + pct + "%) pe action=" + p.actiune };
}
// alerta „aproape de plafon”: o dată la 24 h pe acțiune; `alerte` nu se semnalează singură (alerta ar trece iar prin trimite)
export function deAnuntatAproape(v, ultimaLa, acum, pauzaMs = 24 * 3600000) {
  if (!v || !v.aproape || v.actiune === "alerte") return false;
  return !(Number(ultimaLa) > 0) || acum - Number(ultimaLa) >= pauzaMs;
}
export function mesajAproape(v) {
  return { nivel: "atentie", titlu: "Pachetul „" + v.actiune + "” e aproape de plafonul serverului",
    mesaj: "Colectorul trimite " + v.text + ". Peste plafon serverul îl refuză și pagina rămâne fără date; câmpul care crește trebuie tăiat înainte." };
}
