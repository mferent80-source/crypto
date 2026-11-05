// Lista neagră a simbolurilor delistate (colector v101.166, I-833 din auditul final 05.11.2026): pe VPS, în 7 zile, 25 de monede din arhiva
// boților (YALA, SHELL, MBOX, AZTEC …) au picat în fiecare noapte cu MARKET_INVALID_SYMBOL, iar profilul cu „ORDER_USDT_PERP symbol error” -
// cereri Pionex degeaba și jurnal plin. Un simbol care dă DOAR eroarea de simbol invalid de cel puțin ZILE_PANA_LA_LISTA zile e sărit; după
// RECERCARE_ZILE se mai încearcă o dată (o relistare). Orice altă eroare (timeout, 429, rețea) nu duce aici. Pragurile sunt ALESE, nu dovedite.
// Modul pur; starea o ține tura (st.invalide = { simbol: { de, la, n } }, st.neagra = { simbol: { de, la, motiv } }).
export const ZILE_PANA_LA_LISTA = 3, RECERCARE_ZILE = 30;
const ZI = 86400000;
export const eSimbolInvalid = (mesaj) => /MARKET_INVALID_SYMBOL|INVALID_SYMBOL|symbol error/i.test(String(mesaj || ""));
export function noteazaEsecSimbol(st, sim, mesaj, acum) {
  if (!eSimbolInvalid(mesaj)) return false;
  const inv = st.invalide || (st.invalide = {}), x = inv[sim] || (inv[sim] = { de: acum, la: acum, n: 0 });
  x.la = acum; x.n++;
  if (acum - x.de >= ZILE_PANA_LA_LISTA * ZI) { (st.neagra || (st.neagra = {}))[sim] = { de: x.de, la: acum, motiv: String(mesaj).slice(0, 80) }; delete inv[sim]; return true; }
  return false;
}
export function noteazaOkSimbol(st, sim) { if (st.invalide) delete st.invalide[sim]; if (st.neagra) delete st.neagra[sim]; }
export function eInListaNeagra(st, sim, acum) {
  const x = st && st.neagra && st.neagra[sim]; if (!x) return false;
  if (Number(acum) - Number(x.la) >= RECERCARE_ZILE * ZI) { delete st.neagra[sim]; return false; }   // după 30 de zile încă o încercare
  return true;
}
