// alerte-zi.mjs (v101.86, el 07.10: „pagina alerts să fie în două”): jurnalul alertelor de AZI (ora României), separat de lista de
// 100 din KV-ul Radarului (acolo grilele împing alertele de dimineață afară), și gruparea lor pentru filele paginii alerts.
export const ALERTE_ZI_MAX = 400;
const nr = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
export function ziRo(t) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t)); }
const DUBLURA_MS = 30 * 60000;
export function adaugaInJurnal(j, a, acum) {
  const zi = ziRo(acum), l = j && j.zi === zi && Array.isArray(j.lista) ? j.lista.slice() : [];
  const x = { t: nr(a && a.t) || acum, nivel: String(a && a.nivel || "info"), titlu: String(a && a.titlu || "").slice(0, 200), mesaj: String(a && a.mesaj || "").slice(0, 600),
    bot: a && a.bot ? String(a.bot) : null, cheie: a && a.cheie ? String(a.cheie) : null };
  // revizia (I3): cu Radarul căzut, grila retrimite același mesaj la fiecare tură - o alertă identică în 30 de min nu se mai scrie
  if (l.some((y) => y.cheie === x.cheie && y.titlu === x.titlu && y.bot === x.bot && x.t - y.t < DUBLURA_MS)) return { zi, lista: l };
  l.push(x);
  // la plafon pleacă întâi zgomotul (grilele, perechile), ca alertele importante de dimineață să rămână
  while (l.length > ALERTE_ZI_MAX) { const i = l.findIndex(eZgomot); l.splice(i >= 0 ? i : 0, 1); }
  return { zi, lista: l };
}
export function eZgomot(a) { return !!a && (a.cheie === "grila" || /perech(e|i) încheiat/i.test(String(a.titlu || ""))); }
// revizia (M9): poza peste plafonul worker-ului (512 KB) ar fi refuzată ÎNTREAGĂ (T212, boți) - întâi ies alertele-zgomot
export function pozaInLimita(poza, max) {
  let text = JSON.stringify(poza);
  if (text.length <= max || !poza || !Array.isArray(poza.alerte)) return text;
  const imp = poza.alerte.filter((a) => !a.zgomot), taiate = poza.alerte.length - imp.length;
  text = JSON.stringify({ ...poza, alerte: imp, alerteTaiate: taiate });
  return text;
}
const scurt = (s) => String(s || "").toUpperCase().replace(/\.[A-Z]+$/, "");
// simbolul din titlu: „MU: …”, „WKL.AS: …”, „PONS (short 3×): …”, „Salt · RHM: …”
function simDinTitlu(t) { const m = /^(?:\W*Salt\s*·\s*)?\W*([A-Z0-9][A-Z0-9.\-]{0,15})\s*[:(]/.exec(String(t || "")); return m ? m[1] : ""; }
export function alertePentruPoza(j, o, acum) {
  if (!j || j.zi !== ziRo(acum) || !Array.isArray(j.lista)) return [];
  const det = new Set((o && o.detinute || []).map((s) => String(s).toUpperCase())), urm = new Set((o && o.urmarite || []).map((s) => String(s).toUpperCase()));
  const detScurt = new Map(); for (const s of det) detScurt.set(scurt(s), s);
  const boti = new Map((o && o.boti || []).map((b) => [String(b.id), String(b.s || "").toUpperCase()]));
  const salt = new Set((o && o.salt || []).map((s) => String(s).toUpperCase()));   // revizia (M1): simbolurile din Salt
  return j.lista.slice().sort((a, b) => b.t - a.t).map((a) => {
    const k = String(a.cheie || ""), t = String(a.titlu || ""), z = eZgomot(a), cand = simDinTitlu(t);
    let src, sim = "";
    if (a.bot) { src = "bot"; sim = boti.get(String(a.bot)) || cand; }
    else if (/^\W*Salt\s*·/.test(t) || k.startsWith("salt-")) { src = "salt"; sim = detScurt.get(scurt(cand)) || cand; }
    else if (k.startsWith("t212")) { src = "t212"; sim = cand; }
    else if (k.startsWith("sim-") || urm.has(cand)) { src = "urm"; sim = cand; }
    else if (det.has(cand)) { src = "t212"; sim = cand; }
    else src = "piata";
    const grup = src === "urm" && !det.has(sim) ? "urm" : "det";
    if (src === "urm" && grup === "det") src = salt.has(sim) ? "salt" : "t212";   // urmărit DAR deținut: o singură dată, la Ce dețin
    return { t: a.t, nivel: a.nivel, titlu: t, mesaj: z ? "" : String(a.mesaj || ""), grup, zgomot: z, sim, src };
  });
}
