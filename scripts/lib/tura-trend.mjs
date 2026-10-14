// tura-trend.mjs — „Trend 12 luni” în Radar (v101.111, 14.10.2026; el: „integrează cum ai zis”). Radarul NU recalculează nimic:
// citește o dată pe zi (de la 8:00, după robotul de la 01:40) clasamentul publicat de robotul din premarket_scanner (GitHub Pages) —
// primele 20 % din ~600 de acțiuni SUA ≥ 2 mld. $ după randamentul pe lunile 2–12 (ultima lună sărită), probat pe 14.10 față de alte
// acțiuni în aceeași zi (+0,9 % pe 20 z, +3,4 % pe 60 z), NEprobat pe listă istorică ⇒ „în probă”. Îl pune în KV (sugestii:trend12,
// pagina Sugestii) și trimite primele 20 în jurnalul verdictelor ca sursă „trend-12-1”, judecate de aceeași mașinărie ca topul pe
// sectoare (5 și 20 de zile față de QQQ). Poarta nu dimensionează pe el până nu zice bilanțul robotului „probat”.
export const SURSA = "https://mferent80-source.github.io/premarket_scanner.html/candidate-engine/generated/";
const ORA = 3600000;
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
const nr = (v) => { if (v == null || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };   // null NU e 0: „nemăsurat” ≠ „+0,0 %”
const text = (v, n) => String(v == null ? "" : v).slice(0, n);

/** JSON-ul robotului (+ bilanțul, opțional) ⇒ ce ține Radarul: primele 20, regimul, sectoarele, ieșirile, raportările, bilanțul. */
export function trendDinJson(j, b, acum) {
  if (!j || j.versiune !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(String(j.dataUltimei || "")) || !Array.isArray(j.clasament)) return null;
  const top = j.clasament.slice(0, 20).map((x) => ({
    s: text(x && x.s, 12).replace(/[^A-Za-z0-9.-]/g, ""), nume: text(x && (x.nume || x.s), 40), sector: text(x && x.sector || "Necunoscut", 40),
    pret: nr(x && x.pret), m12: nr(x && x.m12), m6: nr(x && x.m6), r60: nr(x && x.r60), rang: nr(x && x.rang),
    raporteaza: x && x.raporteaza && x.raporteaza.d ? { d: text(x.raporteaza.d, 10), ora: text(x.raporteaza.ora, 3) } : null,
  })).filter((x) => x.s && x.pret > 0);
  if (!top.length) return null;
  const regim = j.regim && typeof j.regim.peste === "boolean" ? { peste: j.regim.peste, inchidere: nr(j.regim.inchidere), sma200: nr(j.regim.sma200) } : null;
  const sectoare = j.sectoare && typeof j.sectoare === "object" ? Object.fromEntries(Object.entries(j.sectoare).slice(0, 20).map(([k, v]) => [text(k, 40), nr(v) || 0])) : null;
  let concentrare = null;
  if (sectoare) for (const [k, v] of Object.entries(sectoare)) if (!concentrare || v > concentrare.n) concentrare = { sector: k, n: v };
  if (concentrare && concentrare.n / 20 < 0.4) concentrare = null;
  const bilant = b && typeof b === "object" && b.versiune === 1 ? {
    zile: nr(b.zile) || 0, n20: nr(b.n20) || 0, ferestre20: nr(b.ferestre20), exces20: nr(b.exces20), nulB20: nr(b.nulB20),
    diferenta20: b.diferenta20 && typeof b.diferenta20 === "object" ? { medie: nr(b.diferenta20.medie), interval: Array.isArray(b.diferenta20.interval) ? b.diferenta20.interval.map(nr) : null } : null,
    verdict: text(b.verdict || "în probă", 60),
  } : null;
  return {
    la: acum, dataUltimei: j.dataUltimei, regim, sectoare, concentrare, raportari: j.raportari && j.raportari.sursa === "finnhub" ? "finnhub" : null,
    iesiri: (Array.isArray(j.iesiri) ? j.iesiri : []).slice(0, 20).map((x) => ({ s: text(x && x.s, 12), motiv: text(x && x.motiv, 80) })),
    intrari: (Array.isArray(j.intrari) ? j.intrari : []).slice(0, 20).map((s) => text(s, 12)),
    eticheta: text(j.eticheta, 240), bilant, top, sursa: SURSA + "trend-12-1.json",
  };
}

/** Verdictele pentru jurnal: un „top” pe fiecare nume din primele 20 (judecat la 5 și 20 de zile față de QQQ, ca topul pe sectoare). */
export function verdicteTrend(t, acum) {
  return (t && Array.isArray(t.top) ? t.top : []).map((x) => ({ s: "trend-12-1", k: x.s, n: "top", p: x.pret, t: acum }));
}

/** Tura: o dată pe zi, de la 8:00 ora României; nimic nou dacă robotul n-a publicat o zi nouă de date. d.forta = doar pentru probă. */
export async function turaTrend(d, st) {
  const acum = d.acum || Date.now();
  if (st.inLucru) return null;
  if (!d.forta && (oraRo(acum) < 8 || acum - (st.esecLa || 0) < 2 * ORA || st.zi === ziRo(acum))) return null;
  st.inLucru = true;
  try {
    const ia = async (f) => { const r = await d.fetch(SURSA + f + "?x=" + acum, { signal: AbortSignal.timeout(30000) }); if (!r || !r.ok) throw new Error(f + ": HTTP " + (r && r.status)); return r.json(); };
    let j; try { j = await ia("trend-12-1.json"); } catch (e) { st.esecLa = acum; d.jurnal("trend: " + (e.message || e)); return null; }
    let b = null; try { b = await ia("trend-12-1-bilant.json"); } catch { b = null; }
    const t = trendDinJson(j, b, acum);
    if (!t) { st.esecLa = acum; d.jurnal("trend: fișierul robotului n-are forma așteptată"); return null; }
    st.zi = ziRo(acum);
    if (st.dataUltimei === t.dataUltimei) { d.jurnal("trend: aceeași zi de date (" + t.dataUltimei + "), nimic nou"); return { noua: false }; }
    await d.trimite("/api/istoric-bot?action=trend12", t);
    const v = verdicteTrend(t, acum);
    if (v.length) await d.trimite("/api/istoric-bot?action=verdict", { verdicte: v });
    st.dataUltimei = t.dataUltimei;
    d.jurnal("trend: " + t.dataUltimei + " · regim " + (t.regim && t.regim.peste ? "pornit" : "oprit") + " · " + v.length + " în jurnalul verdictelor" + (t.concentrare ? " · " + t.concentrare.n + "/20 " + t.concentrare.sector : "") + (t.bilant ? " · proba: " + t.bilant.verdict : " · proba: fără bilanț încă"));
    return { noua: true, n: v.length };
  } finally { st.inLucru = false; }
}
