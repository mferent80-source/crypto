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

// C6 + 🔵3: o coadă de alerte netrimise (KV-ul Radarului, Discord), golită în ORDINE: după primul eșec restul așteaptă tura următoare;
// se renunță doar la ce e mai vechi decât maxMs(x) (critic: 24 h, restul 12 h - apelantul hotărăște). O excepție la trimitere = eșec, nu pierdere.
// Întoarce { ramase, trimise, renuntate } (listele, în ordinea cozii); apelantul păzește reintrarea și scrie coada pe disc.
export async function golesteCoadaPas(coada, { trimite, acum, maxMs }) {
  const ramase = [], trimise = [], renuntate = [];
  for (const x of Array.isArray(coada) ? coada : []) {
    if (!x) continue;
    if (acum - (Number(x.t) || 0) > maxMs(x)) { renuntate.push(x); continue; }
    if (ramase.length) { ramase.push(x); continue; }
    let ok = false; try { ok = !!(await trimite(x)); } catch { ok = false; }
    (ok ? trimise : ramase).push(x);
  }
  return { ramase, trimise, renuntate };
}

// 🔵1: starea pe boți nu se curăța niciodată (data/alerte-stare.json: 49 de boți × 3–4,6 KB din 24.09, rescris de zeci de ori pe minut).
// Închișii fără `inchisLa` (de dinainte de v100.175) primesc ora de acum, o dată; la 30 de zile de la închidere botul pleacă din `cunoscuti`
// ȘI din starea alertelor; orfanii (nici în listă, nici printre cunoscuți) ies. Rămân: meta (`_…`) și acțiunile T212 (`t212-…`).
const ZI_MS = 86400000;
export function curataStareBoti(stare, m, acumIds, acum) {
  const c = (m && m.cunoscuti) || {}, vii = acumIds || {};
  for (const id of Object.keys(c)) {
    const x = c[id]; if (!x || x.activ || vii[id]) continue;
    if (!(Number(x.inchisLa) > 0)) { x.inchisLa = acum; continue; }
    if (acum - x.inchisLa > 30 * ZI_MS) { delete c[id]; delete stare[id]; }
  }
  for (const id of Object.keys(stare || {})) if (!/^_/.test(id) && !/^t212-/.test(id) && !c[id] && !vii[id]) delete stare[id];
}

// 🔵8: fișa de închidere căuta botul doar în prima pagină de boți închiși (Pionex dă câte 10); peste 10 închideri între două ture ieșea
// „nu mai apare în Pionex — poate lichidat” (critic) în loc de fișă ⇒ până la 3 pagini, după nextPageToken.
export async function botInchisDupaId(id, cere, pagini = 3) {
  let tok = null;
  for (let i = 0; i < pagini; i++) {
    const fb = await cere("/api/bot-orders?status=finished&limit=10" + (tok ? "&pageToken=" + encodeURIComponent(tok) : ""));
    const x = ((fb && fb.bots) || []).find((y) => y && String(y.id) === String(id));
    if (x) return x;
    tok = fb && typeof fb.nextPageToken === "string" && fb.nextPageToken ? fb.nextPageToken : null;
    if (!tok) break;
  }
  return null;
}

// 🔵10: data/cont-bare (cache-ul barelor zilnice, cheia = sha1 pe cale) creștea fără curățare (625 de fișiere / 39 MB) ⇒ ce n-a mai fost
// atins de maxMs (30 de zile) se șterge. Doar fișierele .json (nu .tmp-urile scrierii atomice în curs).
export function deSters(fisiere, acum, maxMs) { return (Array.isArray(fisiere) ? fisiere : []).filter((f) => f && /\.json$/.test(f.nume) && acum - (Number(f.mtime) || 0) > maxMs).map((f) => f.nume); }

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

// audit 19.10: tickerele PERP nu vin (bot-orders pune probleme.preturi, pretCurent null) ⇒ distanța până la lichidare e null și alerta de
// lichidare (Alerte.evalueaza cere dist !== null) tace. 3 ture la rând fără preț pe un bot futures activ ⇒ „orb”, o singură dată până la
// revenire; la revenire „revenit”. m = meta(); apelantul notează m.perpOrb.anuntat DOAR după ce mesajul a plecat (și îl pune 0 la revenire).
// Lista goală (cădere Pionex, are paza ei) nu schimbă nimic. Întoarce { tip: "orb" | "revenit" | null, nume, minute, motiv }.
const PRAG_TURE_PERP = 3;
export function eBotFutures(b) { return !!b && (/\.PERP$/.test(String(b.baza || "")) || /_PERP$/.test(String(b.simbolPionex || ""))); }
export function preturiPerpPas(m, { probleme, boti, acum }) {
  const st = m.perpOrb || (m.perpOrb = { ture: 0, de: 0, anuntat: 0, nume: [] });
  if (!Array.isArray(boti) || !boti.length) return { tip: null, nume: [], minute: 0, motiv: null };
  const nume = boti.filter((b) => b && b.activ !== false && eBotFutures(b) && !(Number(b.pretCurent) > 0)).map((b) => String(b.baza || b.simbol || "?").replace(/\.PERP$/, ""));
  const motiv = probleme && probleme.preturi ? String(probleme.preturi) : null;
  if (!nume.length) { st.ture = 0; st.de = 0; return { tip: st.anuntat ? "revenit" : null, nume: st.nume || [], minute: 0, motiv: null }; }
  st.ture = (st.ture || 0) + 1; st.de = st.de || acum;
  const minute = Math.max(1, Math.round((acum - st.de) / 60000));
  if (st.ture >= PRAG_TURE_PERP && !st.anuntat) { st.nume = nume; return { tip: "orb", nume, minute, motiv }; }
  return { tip: null, nume, minute, motiv };
}
