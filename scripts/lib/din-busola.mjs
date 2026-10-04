// v101.65 (ideea 1): bilanțul Busolei despre predicțiile 🧠 ale Radarului - fișierul ei de pe același PC (busola/cron/stare/din-radar-bilant.json,
// scris de cron-ul Busolei, niciodată public) -> ce urcă colectorul în KV (istoric-bot?action=busolaRetea). Doar cheile știute; cifrele numere
// sau null (null rămâne null, nu 0); null = nimic de trimis (fișier lipsă/stricat, fără „retea”, sau același `la` ca ultima dată trimisă).
const CIFRE = ["brier", "brierBaza", "castig", "icJos", "icSus"];
export function bilantDinBusola(j, laUltim) {
  if (!j || typeof j !== "object") return null;
  const la = Number(j.la), r = j.retea;
  if (!(la > 0) || la === Number(laUltim) || !r || typeof r !== "object") return null;
  const intreg = (x) => Number.isInteger(x) && x >= 0;
  if (!intreg(r.judecate) || !intreg(r.independente) || typeof r.verdict !== "string") return null;
  const retea = { judecate: r.judecate, independente: r.independente };
  for (const k of CIFRE) retea[k] = typeof r[k] === "number" && Number.isFinite(r[k]) ? r[k] : null;
  retea.verdict = r.verdict.slice(0, 40);
  return { la, retea };
}
