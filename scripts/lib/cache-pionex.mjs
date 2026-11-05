// Cache-urile colectorului pentru cererile Pionex (colector v101.166, I-838 din auditul final 05.11.2026): ~10.000 de cereri Pionex pe zi de pe
// IP-ul VPS-ului, comun cu Busola (o blocare a IP-ului, ca pe 16.10, ar orbi ambele aplicații). Lista boților porniți se citea din ~10 locuri:
// aici, o singură citire la TTL_BOTI_MS, cererile deodată legate (una în zbor). Alertele de lichidare și de stop rămân pe citirea PROASPĂTĂ a
// turei alertelor, care o pune apoi în cache (`pune`). Fiecare cititor primește o COPIE (nimeni nu strică lista altuia). Erorile nu se țin.
// Plus un memo mic (ia(cheie, aduce)) pentru lumânările de 1 h de dimineață: Range Filter, Trade-ul zilei și proba A cer aceleași monede.
// Modul pur (ceasul și cererea vin din afară); probat în scripts/proba-v100306-c2.mjs.
export const TTL_BOTI_MS = 30000;   // ales: o listă de cel mult 30 s pentru turele care nu dau alerte de lichidare / stop
const copie = (x) => (x === null || x === undefined ? x : JSON.parse(JSON.stringify(x)));
export function creeazaCacheBoti({ cere, ttlMs = TTL_BOTI_MS, ceas = Date.now } = {}) {
  let tinut = null, la = 0, zbor = null, cereri = 0;
  const pune = (d) => { if (d && Array.isArray(d.bots)) { tinut = copie(d); la = ceas(); } return d; };
  async function citeste() {
    if (tinut && ceas() - la < ttlMs) return copie(tinut);
    if (!zbor) { cereri++; zbor = Promise.resolve().then(() => cere("/api/bot-orders")).then(pune).finally(() => { zbor = null; }); }
    return copie(await zbor);
  }
  return { citeste, pune, cereri: () => cereri, _reset: () => { tinut = null; la = 0; } };
}
// memo pe cheie, cu TTL; aducerile deodată pe aceeași cheie sunt legate; o eroare nu se ține minte
export function creeazaMemo({ ttlMs = 15 * 60000, ceas = Date.now, max = 200 } = {}) {
  const m = new Map();
  function ia(cheie, aduce) {
    const x = m.get(cheie);
    if (x && (x.zbor || ceas() - x.la < ttlMs)) return x.zbor || Promise.resolve(copie(x.v));
    const z = Promise.resolve().then(aduce).then((v) => { m.set(cheie, { v: copie(v), la: ceas() }); return v; }, (e) => { m.delete(cheie); throw e; });
    m.set(cheie, { zbor: z, la: ceas() });
    if (m.size > max) { for (const [k, v] of m) { if (!v.zbor && ceas() - v.la >= ttlMs) m.delete(k); } }
    return z;
  }
  return { ia, golire: () => m.clear() };
}
