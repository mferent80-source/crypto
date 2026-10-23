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
// audit 19.10: „serverul nu răspunde” (contorul care după 15 oprește colectorul) = conexiune refuzată sau eroare de rețea, fără răspuns HTTP.
// Un timeout (TimeoutError / AbortError: serverul e viu, dar lent - Pionex lent în spatele lui) NU e server oprit: trece pe „nu pot citi”.
export function eServerOprit(e) {
  if (!e || e.status) return false;
  const n = String(e.name || "");
  return n !== "TimeoutError" && n !== "AbortError";
}
// v100.259 (auditul 23.10, punctul 4): după 15 minute fără server colectorul IEȘEA, iar acum (serverul și colectorul pornesc ascunși, în
// sesiunea 0, din sarcina S4U) nu-l mai repornea nimeni ⇒ alertele tăceau până la repornirea PC-ului. Acum așteaptă: primele MAX_ESECURI
// ture la ritmul obișnuit, apoi pauze tot mai lungi (2, 4 min), cel mult PAUZA_FARA_SERVER_MAX_MS. Întoarce ms până la tura următoare.
export const MAX_ESECURI = 15, PAUZA_FARA_SERVER_MAX_MS = 5 * 60000;
export function pasDupaEsecuri(esecuri, pasMs) {
  const n = Number(esecuri) || 0;
  if (n <= MAX_ESECURI) return pasMs;
  return Math.min(PAUZA_FARA_SERVER_MAX_MS, pasMs * 2 ** Math.min(10, n - MAX_ESECURI));
}

// v100.259 (auditul 23.10, punctul 13): bot-orders citește cel mult 10 pagini (100 de boți) și pune probleme.trunchiat - colectorul o ignora,
// iar boții de peste 100 rămâneau fără nicio alertă, tăcut. Lista tăiată ⇒ „trunchiat” (apelantul notează m.trunchiatAnuntat DOAR după ce
// mesajul a plecat), repetat cel mult la 24 h; lista întreagă ⇒ episodul se închide. Întoarce { tip: "trunchiat" | null }.
const REPETA_TRUNCHIAT_MS = 24 * 3600000;
export function trunchiatPas(m, { trunchiat, acum }) {
  if (!trunchiat) { m.trunchiatAnuntat = 0; return { tip: null }; }
  return { tip: acum - (Number(m.trunchiatAnuntat) || 0) >= REPETA_TRUNCHIAT_MS ? "trunchiat" : null };
}

// v100.259 (auditul 23.10, punctul 6): la pornire TOATE turele plecau în aceeași secundă (timeout-uri grupate la server, Pionex în rafală).
// Valul turei: prima = doar alertele (bucla boților, T212, poza, cozile); a doua = turele medii; de la a treia, și cele grele.
export function valPornire(turaNr) { const n = Number(turaNr) || 0; return { medii: n >= 2, grele: n >= 3 }; }
// v100.259 (punctul 6): cererile identice în zbor legate - cât rulează una, ceilalți primesc aceeași promisiune (botiInchisiToti era chemat
// de 3 ture în aceeași milisecundă). Fiecare chemător primește COPIA listei (cu `complet`), ca unul să n-o strice pe a altuia.
export function unaInZbor(fn) {
  let zbor = null;
  const copie = (v) => { if (!Array.isArray(v)) return v; const c = v.slice(); for (const k of Object.keys(v)) if (!/^\d+$/.test(k)) c[k] = v[k]; return c; };
  return () => {
    if (!zbor) zbor = Promise.resolve().then(fn).finally(() => { zbor = null; });
    return zbor.then(copie);
  };
}

// v100.259 (auditul 23.10, punctul 16): după o oprire bruscă a PC-ului (pana de curent) jurnalul are octeți NUL (fișierul lungit, datele
// nescrise) - îl făceau greu de citit și de căutat. La pornire ies (întoarce câți au fost; 0 = nimic rescris). fs injectat (probe).
export function curataNulJurnal(fsx, log) {
  let t; try { if (!fsx.existsSync(log)) return 0; t = String(fsx.readFileSync(log, "utf8")); } catch { return 0; }
  const n = (t.match(/\u0000/g) || []).length; if (!n) return 0;
  fsx.writeFileSync(log, t.replace(/\u0000+/g, "")); return n;
}
// Rotirea: peste maxOcteti, log → log.1 → log.2 → log.3 (al patrulea iese) - înainte una singură (.vechi), iar o zi agitată lua tot istoricul.
// Întoarce true dacă a rotit.
export function rotesteJurnal(fsx, log, maxOcteti = 1_000_000, pastrate = 3) {
  try { if (!fsx.existsSync(log) || fsx.statSync(log).size <= maxOcteti) return false; } catch { return false; }
  try { if (fsx.existsSync(log + "." + pastrate)) fsx.unlinkSync(log + "." + pastrate); } catch {}
  for (let i = pastrate - 1; i >= 1; i--) { try { if (fsx.existsSync(log + "." + i)) fsx.renameSync(log + "." + i, log + "." + (i + 1)); } catch {} }
  try { fsx.renameSync(log, log + ".1"); return true; } catch { return false; }
}
// v100.259 (auditul 23.10, punctul 17): repornirea colectorului fără administrator. Din sesiunea lui colectorul pornit de sarcina S4U (sesiunea 0)
// nu se poate opri (EPERM) ⇒ livrarea lasă un fișier-semnal; colectorul îl vede în bucla lui: mai nou decât pornirea ⇒ „iesi” (îl șterge, iese
// curat); unul rămas de dinainte de pornire ⇒ „vechi” (șters, nu iese); lipsă ⇒ null.
export function verificaSemnal(fsx, fisier, pornitLa) {
  let st; try { if (!fsx.existsSync(fisier)) return null; st = fsx.statSync(fisier); } catch { return null; }
  try { fsx.unlinkSync(fisier); } catch {}
  return Number(st && st.mtimeMs) >= pornitLa ? "iesi" : "vechi";
}

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
// audit 19.10: hărțile din memoria colectorului (lumanari15, mediuPe, pret30) - afară cheile neatinse de maxMs (2 zile); laDe(k) = ora atingerii
export function curataNeatinse(harta, laDe, acum, maxMs = 2 * ZI_MS) { let n = 0; for (const k of Object.keys(harta || {})) { const t = Number(laDe(k)); if (!(t > acum - maxMs)) { delete harta[k]; n++; } } return n; }
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

// v100.259 (auditul 23.10, punctul 2): stopurile puse direct în Trading 212 (ordinele în așteptare) rămâneau la ultima listă bună PENTRU
// TOTDEAUNA când citirea începea să pice ⇒ un stop anulat în T212 lăsa alarma „FĂRĂ STOP” a paznicului mută. Acum: o eroare scurtă
// (≤ STOPURI_T212_MAX_MS de la ultima citire bună) păstrează lista (fără pâlpâit); peste ea, niciun stop „știut” + `eroare` (apelantul o pune
// în t212Eroare ⇒ paznicul spune „nesigur”, nu „ai stop”). st = { stopuri, la, eroare } ține minte între ture. Întoarce { stopuri, eroare }.
export const STOPURI_T212_MAX_MS = 15 * 60000;
export function stopuriT212Pas(st, { stopuri, eroare, acum }) {
  if (!eroare && stopuri && typeof stopuri === "object") { st.stopuri = stopuri; st.la = acum; st.eroare = null; return { stopuri, eroare: null }; }
  st.eroare = String(eroare || "răspuns fără stopuri");
  if (st.la && acum - st.la <= STOPURI_T212_MAX_MS) return { stopuri: st.stopuri || {}, eroare: null };
  const de = st.la ? "de " + Math.round((acum - st.la) / 60000) + " min" : "de la pornire";
  return { stopuri: {}, eroare: "ordinele de stop din Trading 212 necitite " + de + " (" + st.eroare.slice(0, 80) + ")" };
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
  // v100.259 (auditul 23.10, punctul 11): „vede iar” doar pe boții anunțați orbi care sunt TOT activi acum; închiși cât erau orbi ⇒ episodul se
  // închide tăcut (un „pot judeca din nou lichidarea la ONDO” pe un bot închis era fals)
  if (!nume.length) {
    st.ture = 0; st.de = 0;
    if (!st.anuntat) return { tip: null, nume: st.nume || [], minute: 0, motiv: null };
    const vii = new Set(boti.filter((b) => b && b.activ !== false && eBotFutures(b)).map((b) => String(b.baza || b.simbol || "?").replace(/\.PERP$/, "")));
    const inca = (st.nume || []).filter((n) => vii.has(n));
    if (!inca.length) { st.anuntat = 0; return { tip: null, nume: [], minute: 0, motiv: null }; }
    return { tip: "revenit", nume: inca, minute: 0, motiv: null };
  }
  st.ture = (st.ture || 0) + 1; st.de = st.de || acum;
  const minute = Math.max(1, Math.round((acum - st.de) / 60000));
  if (st.ture >= PRAG_TURE_PERP && !st.anuntat) { st.nume = nume; return { tip: "orb", nume, minute, motiv }; }
  return { tip: null, nume, minute, motiv };
}
