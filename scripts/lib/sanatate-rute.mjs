// Sănătatea colectorului, partea a doua (colector v101.166, I-833 din auditul final 05.11.2026). Penele TĂCUTE:
//   - 03.11: 1.188 de erori HTTP 500 în 15 h de la serverul Radarului (KV-ul stricat după mutarea pe VPS), fără niciun mesaj - găsit de mână;
//   - din 04.11 tura „cazuri” n-a mai reușit (41 de „fetch failed”, fără cauză în jurnal), iar frâna și disciplina trăgeau după ea.
// Aici: (1) un contor de răspunsuri 5xx pe rută ⇒ UN mesaj după PRAG_5XX_MS continue și „a revenit” la primul răspuns bun; (2) turele care țin
// minte ce calculează (cazuri, frâna, disciplina, risc) ⇒ UN mesaj „🩺 colectorul” când una n-a reușit PRAG_TURA_MS; (3) cauza reală a unui
// „fetch failed” (codul din `cause`). Modul pur (fără rețea, fără ceas propriu); starea o ține colectorul (meta().sanatate), probat în
// scripts/proba-v100306-c2.mjs. Pragurile sunt ALESE (ce înseamnă „o pană care merită un mesaj”), nu dovedite.
export const PRAG_5XX_MS = 30 * 60000;      // 30 de minute continue de 5xx pe aceeași rută ⇒ un mesaj
export const TACERE_5XX_MS = 10 * 60000;    // „continue” = ultima eroare mai nouă de 10 min (o rută cerută o dată pe oră nu face un șir)
export const MIN_5XX = 3;                   // și cel puțin 3 erori în șir
export const PRAG_TURA_MS = 24 * 3600000;   // o tură fără nicio reușită de 24 h ⇒ „🩺 colectorul”

// „/api/istoric-bot?action=paza” ⇒ „istoric-bot·paza”; „/api/market?type=pionex_klines&symbol=…” ⇒ „market·pionex_klines”; fără simbol, fără pagină
export function cheieRuta(cale) {
  const s = String(cale || ""), i = s.indexOf("?"), p = (i < 0 ? s : s.slice(0, i)).replace(/^\/api\//, "").replace(/^\/+/, "");
  const q = i < 0 ? "" : s.slice(i + 1), m = /(?:^|&)(?:action|type)=([A-Za-z0-9_-]{1,40})/.exec(q);
  return p + (m ? "·" + m[1] : "");
}
// status = codul HTTP al răspunsului (0 / null = fără răspuns: serverul oprit, conexiune ruptă - asta o anunță deja „serverul nu răspunde”)
// revizia v100.306: rutele care au deja alerta lor la o pană (bot-orders ⇒ „nu mai poate citi botul”) nu intră aici - o pană, o voce
export const RUTE_CU_ALERTA_PROPRIE = new Set(["bot-orders"]);
export function noteazaRaspuns(st, cale, status, acum) {
  const s = Number(status) || 0; if (!s) return st;
  if (RUTE_CU_ALERTA_PROPRIE.has(cheieRuta(cale))) return st;
  const rute = st.rute || (st.rute = {}), k = cheieRuta(cale), r = rute[k] || (rute[k] = { de: null, n: 0, ultim: 0, anuntat: false });
  if (s >= 500) {
    if (!r.de || acum - r.ultim > TACERE_5XX_MS) { r.de = acum; r.n = 0; }
    r.n++; r.ultim = acum; r.status = s;
  } else {
    if (r.anuntat) r.revenit = { la: acum, n: r.n, de: r.de };
    r.de = null; r.n = 0; r.anuntat = false;
  }
  return st;
}
// ⇒ { cadere: [{ ruta, de, n, status, minute }] (de anunțat ACUM, o dată pe episod), revenit: [{ ruta, minute, n }] }
export function pas5xx(st, acum) {
  const out = { cadere: [], revenit: [] };
  for (const [ruta, r] of Object.entries((st && st.rute) || {})) {
    if (r.revenit) { out.revenit.push({ ruta, n: r.revenit.n, minute: Math.round((r.revenit.la - (r.revenit.de || r.revenit.la)) / 60000) }); delete r.revenit; }
    if (r.de && !r.anuntat && r.n >= MIN_5XX && acum - r.ultim <= TACERE_5XX_MS && acum - r.de >= PRAG_5XX_MS) {
      r.anuntat = true; out.cadere.push({ ruta, de: r.de, n: r.n, status: r.status || 500, minute: Math.round((acum - r.de) / 60000) });
    }
    // rutele liniștite de o zi ies din stare (starea nu crește fără plafon)
    if (!r.de && !r.anuntat && !r.revenit && acum - (r.ultim || 0) > 86400000) delete st.rute[ruta];
  }
  return out;
}

// ---------------- turele care țin minte ce calculează ----------------
// st.ture[tura] = { okLa, de (primul eșec de după ultima reușită), motiv, n, anuntat }
export function noteazaTura(st, tura, ok, acum, motiv) {
  const ture = st.ture || (st.ture = {}), t = ture[tura] || (ture[tura] = { okLa: null, de: null, motiv: null, n: 0, anuntat: false });
  if (ok) { if (t.anuntat) t.revenita = { la: acum, de: t.de, motiv: t.motiv }; t.okLa = acum; t.de = null; t.n = 0; t.anuntat = false; t.motiv = null; }
  else { if (!t.de) t.de = acum; t.n++; t.motiv = String(motiv || "fără motiv").slice(0, 160); }
  return st;
}
// ⇒ { cazute: [{ tura, de, n, motiv, ore }] (de anunțat acum, o dată pe episod), revenite: [{ tura, ore }] }
export function pasTure(st, acum) {
  const out = { cazute: [], revenite: [] };
  for (const [tura, t] of Object.entries((st && st.ture) || {})) {
    if (t.revenita) { out.revenite.push({ tura, ore: Math.round((t.revenita.la - (t.revenita.de || t.revenita.la)) / 3600000) }); delete t.revenita; }
    if (t.de && !t.anuntat && acum - t.de >= PRAG_TURA_MS) { t.anuntat = true; out.cazute.push({ tura, de: t.de, n: t.n, motiv: t.motiv, ore: Math.round((acum - t.de) / 3600000) }); }
  }
  return out;
}

// cauza reală a unei erori de rețea: undici dă „fetch failed”, cu motivul în `cause` (UND_ERR_SOCKET, ECONNRESET, ECONNREFUSED, …)
export function motivEroare(e) {
  const m = String((e && e.message) || e || "eroare"), c = e && e.cause;
  if (!c) return m;
  const prima = c && Array.isArray(c.errors) && c.errors.length ? c.errors[0] : c;
  const cod = (prima && prima.code) || (c && c.code) || (prima && prima.name !== "Error" && prima.name) || "", text = prima && prima.message ? String(prima.message) : "";
  const det = [cod, text && text !== cod ? text : ""].filter(Boolean).join(": ");
  return det ? m + " (" + det.slice(0, 120) + ")" : m;
}
