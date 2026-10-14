// Sănătatea colectorului (v101.116, auditul sever 14.10): reguli pure, fără rețea și fără ceas propriu, ca să se poată proba.
// Principiul din capul colectorului: tăcerea alertelor NU are voie să se citească drept „totul e bine”.

// S1: serverul Radarului respinge colectorul pe PAROLĂ (nu pe ritm). Înainte, 429 AUTH_RATE_LIMITED trecea drept „limită de ritm, nu
// cădere”, iar alertele de stop T212 / Pionex se opreau fără niciun anunț.
const COD_AUTH = ["AUTH_RATE_LIMITED", "AUTH_INVALID", "AUTH_REQUIRED", "APP_API_TOKEN_NOT_CONFIGURED"];
export function eCadereAuth(e) {
  if (!e) return false;
  if (COD_AUTH.includes(String(e.cod || ""))) return true;
  return /\b(AUTH_RATE_LIMITED|AUTH_INVALID|AUTH_REQUIRED|APP_API_TOKEN_NOT_CONFIGURED)\b/.test(String(e.message || ""));
}
// limita de ritm adevărată (RATE_LIMITED): trece singură, nu e cădere
export function eLimitaDeRitm(e) { return !!e && e.status === 429 && !eCadereAuth(e); }

// C3: Pionex dă uneori lista boților PORNIȚI goală (result:true, results:null) deși boții merg. Pe listă goală bucla pe boți nu face
// nimic (nici lichidare, nici stop, nici plan) ⇒ după 10 minute un anunț critic, repetat cel mult la 3 ore; la revenire, unul de informare.
// m = meta() din starea alertelor (cunoscuti, listaGoalaDe, listaGoalaAnuntat). Apelantul notează `listaGoalaAnuntat` DOAR după ce mesajul a plecat.
// Întoarce { tip: "orb" | "vede" | null, minute, nume }.
const PRAG_GOALA_MS = 10 * 60000, REPETA_GOALA_MS = 3 * 3600000;
export function listaGoalaPas(m, { goala, acum }) {
  const activi = Object.values((m && m.cunoscuti) || {}).filter((c) => c && c.activ).map((c) => String(c.nume || "?"));
  if (!goala) { m.listaGoalaDe = 0; return { tip: m.listaGoalaAnuntat ? "vede" : null, minute: 0, nume: [] }; }
  if (!activi.length) { m.listaGoalaDe = 0; m.listaGoalaAnuntat = 0; return { tip: null, minute: 0, nume: [] }; }
  m.listaGoalaDe = m.listaGoalaDe || acum;
  const minute = Math.round((acum - m.listaGoalaDe) / 60000);
  if (acum - m.listaGoalaDe >= PRAG_GOALA_MS && acum - (m.listaGoalaAnuntat || 0) >= REPETA_GOALA_MS) return { tip: "orb", minute, nume: activi };
  return { tip: null, minute, nume: activi };
}
