// Politica alertelor (colector v101.166, I-831 din auditul final 05.11.2026): mai puține mesaje pe Discord, mai utile. Pe VPS, în 7 zile:
// ~180 de mesaje pe zi, 47% trepte de 1%; 61 de trepte T212 retrimise la deschiderea SUA; 170 noaptea; 32 din 60 de „critice” erau
// „−15% de la maxim” repetat în fiecare zi de bursă; „Crypto: liniște ⇄ mișcare” de 9 ori, Monte Carlo „zgomot ⇄ aruncare de ban” orar.
// Modul pur (fără rețea, fără ceas propriu); probat în scripts/proba-v100306-c.mjs.
//
// ⚠ Pragurile de mai jos sunt ALESE, nu dovedite: nicio probă pe date nu le-a fixat (sunt alegeri de bun-simț pentru zgomot, nu semnale).
// Stau aici, numite, într-un singur loc, ca Marius să le poată schimba fără să caute prin cod; poza.mjs, tura-piata.mjs, tura-t212.mjs,
// tura-monte-carlo-bot.mjs și colectorul le citesc de aici.
export const NOAPTE_DE_LA = 23;            // ora României: de la 23:00 …
export const NOAPTE_PANA_LA = 7;           // … până la 07:00, treptele, „% azi”, gărzile contului și „altă setare” stau doar în Radar
export const REZUMAT_NOAPTE_LA = 8;        // ora României: ce a stat noaptea în Radar pleacă într-un SINGUR mesaj, de la 08:00
export const PRAG_MISCARE_INTRARE = 0.55;  // „Crypto: mișcare” abia cu cel puțin 55% din monedele mari în mișcare (sau BTC în mișcare) …
export const PRAG_MISCARE_IESIRE = 0.45;   // … și iese din „mișcare” abia la 45% sau mai puțin; între ele eticheta rămâne cea de dinainte
export const PAUZA_ETICHETA_MS = 2 * 3600000;   // cel puțin 2 h între două schimbări anunțate ale aceleiași etichete (vremea, Monte Carlo)
export const AGRAVARE_PP = 5;              // „−15% de la maxim”: critic o dată pe episod, apoi din nou doar la fiecare 5 pp în plus (−20, −25 …)
export const TREAPTA = 0.01;               // treptele de 1% (boți și T212); la boți doar la un extrem NOU al zilei

const fOra = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" });
export function minutRo(acum) {
  const p = fOra.formatToParts(new Date(acum)), g = (k) => Number((p.find((x) => x.type === k) || {}).value);
  return (g("hour") % 24) * 60 + g("minute");
}
export const ziRo = (acum) => fZi.format(new Date(acum));
export function eNoapte(acum) { const m = minutRo(acum); return m >= NOAPTE_DE_LA * 60 || m < NOAPTE_PANA_LA * 60; }
// ziua dimineții în care pleacă rezumatul unei alerte ținute noaptea (23:xx ⇒ mâine; 00–07 ⇒ azi)
const ziDimineata = (acum) => ziRo(minutRo(acum) >= NOAPTE_DE_LA * 60 ? acum + 3 * 3600000 : acum);

// ---------------- noaptea: ce așteaptă dimineața ----------------
// treptele (T212, boți), mișcarea zilei pe acțiuni („% azi”: sim-miscare, miscare-), gărzile contului, „altă setare / alt TP” de noapte.
// Lichidarea, stopul atins, boții nevăzuți și orice „critic” pleacă imediat, oricând.
const CHEI_NOAPTE = [[/^t212-pas-/, "t212"], [/^astept-/, "t212"] /* v100.337 (revizia): poziția sub stop de N ședințe - treapta trece la 23:0x (închiderea NY) */, [/^bot-pas-/, "boti"], [/^sim-miscare-/, "azi"], [/^garda-/, "garda"], [/^noapte-/, "noapte"]];
// numele fiecărui fel în rezumat: [singular, plural]
const NUME_FEL = { t212: ["treaptă T212", "trepte T212"], boti: ["treaptă de bot", "trepte de boți"], azi: ["mișcare „% azi”", "mișcări „% azi”"], garda: ["gardă încălcată", "gărzi încălcate"], noapte: ["setare verificată noaptea", "setări verificate noaptea"], alte: ["altă alertă", "alte alerte"] };
function felNoapte(m, cheie) {
  const k = String(cheie || (m && m.cheie) || "");
  for (const [re, fel] of CHEI_NOAPTE) if (re.test(k)) return fel;
  if (/^miscare-/.test(k) && /% azi$/.test(String(m && m.titlu || ""))) return "azi";
  return null;
}
export function deAmanatNoaptea(m, cheie) { return !!m && m.nivel !== "critic" && felNoapte(m, cheie) !== null; }
// noaptea, pe categoriile de mai sus ⇒ o copie cu doarRadar (alerta rămâne în Radar, pe pagina Alerte) și `noapte` (intră în rezumatul de la 08)
export function politicaNoapte(m, cheie, acum) {
  if (!m || m.doarRadar || !eNoapte(acum) || !deAmanatNoaptea(m, cheie)) return m;
  return Object.assign({}, m, { doarRadar: true, noapte: true });
}
// st = meta().noapte = { zi, n, pe: { fel: n }, sim: [..] } - ziua dimineții care le primește; o noapte nouă începe de la zero
export function noteazaNoapte(st, m, cheie, acum) {
  const zi = ziDimineata(acum), fel = felNoapte(m, cheie) || "alte";
  if (st.zi !== zi) { st.zi = zi; st.n = 0; st.pe = {}; st.sim = []; st.chei = []; }
  // revizia v100.306: o alertă reîncercată (KV căzut ⇒ tura o trimite iar) se numără o singură dată
  st.chei = Array.isArray(st.chei) ? st.chei : [];
  if (cheie && st.chei.includes(cheie)) return st;
  if (cheie) { st.chei.push(cheie); if (st.chei.length > 500) st.chei.shift(); }
  st.n = (st.n || 0) + 1; st.pe = st.pe || {}; st.pe[fel] = (st.pe[fel] || 0) + 1;
  const sim = /^[^:]{1,24}(?=:)/.exec(String(m && m.titlu || "").replace(/^🌙\s*/, "")), s = sim ? sim[0].replace(/\s*\(.*$/, "").trim() : null;
  st.sim = Array.isArray(st.sim) ? st.sim : [];
  if (s && !/^Gardă/.test(s) && !st.sim.includes(s) && st.sim.length < 12) st.sim.push(s);
  return st;
}
export function golesteNoapte(st) { for (const k of Object.keys(st)) delete st[k]; return st; }
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
// de la 08:00, o singură dată, doar dacă noaptea care tocmai s-a încheiat a ținut ceva; o noapte nepovestită (colector oprit dimineața) se
// aruncă a doua zi, nu se trimite cu o zi întârziere
export function rezumatNoapte(st, acum) {
  if (!st || !(st.n > 0) || st.zi !== ziRo(acum) || eNoapte(acum) || minutRo(acum) < REZUMAT_NOAPTE_LA * 60) return null;
  const pe = Object.entries(st.pe || {}).sort((a, b) => b[1] - a[1]).map(([fel, n]) => { const nf = NUME_FEL[fel] || NUME_FEL.alte; return cate(n, nf[0], nf[1]); });
  let fapt = "Între " + NOAPTE_DE_LA + " și " + NOAPTE_PANA_LA + " au stat doar în Radar: " + pe.join(", ");
  const sim = (st.sim || []).slice();
  while (sim.length && (fapt + " (" + sim.join(", ") + " …).").length > 160) sim.pop();   // garda: rândul 1 ≤ 160, cu tot cu „ …”
  fapt += (sim.length ? " (" + sim.join(", ") + (sim.length < (st.sim || []).length ? " …" : "") + ")" : "") + ".";
  return { nivel: "info", cheie: "rezumat-noapte", titlu: "🌙 Peste noapte: " + cate(st.n, "alertă", "alerte") + " doar în Radar",
    mesaj: fapt + "\n👉 Le-aș citi în Radar, la Alerte; niciuna nu cerea o mișcare în minute." };
}

// ---------------- treptele: cheile fără dată ----------------
// cheile cu dată la coadă („…-2026-11-05”) se curăță după coadă; treptele T212 (cheia = închiderea de ieri, fără ziua ședinței) țin ca
// valoare ziua în care au fost marcate. prag = „AAAA-LL-ZZ”: ce e mai vechi pleacă.
const ZI_RE = /^\d{4}-\d{2}-\d{2}$/;
export function curataChei(st, prag) {
  for (const k of Object.keys(st || {})) {
    const v = st[k], zi = typeof v === "string" && ZI_RE.test(v) ? v : ZI_RE.test(k.slice(-10)) ? k.slice(-10) : null;
    if (zi === null || zi < prag) delete st[k];
  }
  return st;
}

// ---------------- „critic” o dată pe episod ----------------
// „−X% de la maxim” (pragul din planul lui, trailPct în procente): critic la intrarea în episod, apoi doar la fiecare AGRAVARE_PP în plus;
// altfel „atenție”. ep = { treapta } de la anunțul de dinainte (null = episod nou); dd = coborârea de la maxim (0..1).
export function episodTrail(ep, dd, pragPct) {
  const t = Math.max(0, Math.floor((Number(dd) * 100 - Number(pragPct)) / AGRAVARE_PP + 1e-9));
  const ant = ep && Number.isFinite(Number(ep.treapta)) ? Number(ep.treapta) : -1;
  return { nivel: t > ant ? "critic" : "atentie", treapta: Math.max(t, ant) };
}

// ---------------- etichetele care oscilează ----------------
// banda pentru „Crypto: liniște ⇄ mișcare” și pauza dintre două schimbări (Alerte.schimbareVreme o primește ca al 4-lea argument)
export function bandaVreme() { return { intrare: PRAG_MISCARE_INTRARE, iesire: PRAG_MISCARE_IESIRE, pauzaMs: PAUZA_ETICHETA_MS }; }
