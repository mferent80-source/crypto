// Martorul buclei colectorului (colector v101.167, 06.11.2026). Pe VPS, 22:16–03:37 UTC, tura „disciplina banda” a ținut bucla SINCRON
// 44 s la fiecare minut, iar celelalte ture își depășeau limita de 20 s fără ca jurnalul să spună de ce (doar „aborted due to timeout” și
// „ECONNRESET”). Martorul: un ceas la PAS_BUCLA_MS; când bucla întârzie peste PRAG_BUCLA_MS, o notă în jurnal cu durata (cel mult una pe
// minut), ca o tură grea nouă să se vadă la timp. Modul pur (ceasul și jurnalul vin din afară), probat în scripts/proba-v100307-c.mjs.
export const PAS_BUCLA_MS = 1000;
export const PRAG_BUCLA_MS = 5000;
export const NOTA_LA_MS = 60000;

// ceasul MONOTON (performance.now): un salt al ceasului de sistem (NTP) sau o suspendare n-au voie să pară blocaj (revizia v100.307)
export function pornesteMartorBucla({ jurnal, acum = () => performance.now(), pas = PAS_BUCLA_MS, prag = PRAG_BUCLA_MS, setInt = setInterval }) {
  let ultim = acum(), ultimaNota = -Infinity;
  const t = setInt(() => {
    const a = acum(), intarziere = a - ultim - pas;
    ultim = a;
    if (intarziere >= prag && a - ultimaNota >= NOTA_LA_MS) {
      ultimaNota = a;
      jurnal("bucla a stat blocată " + (intarziere / 1000).toFixed(1).replace(".", ",") + " s (un calcul sincron mare; cererile în zbor își pot depăși limita)");
    }
  }, pas);
  if (t && typeof t.unref === "function") t.unref();   // martorul nu ține procesul în viață
  return t;
}
