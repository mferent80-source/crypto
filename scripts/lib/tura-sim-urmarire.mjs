// Urmărirea verdictelor Simulatorului grid pentru un bot NOU (v101.189 / Radar v100.351, 16.11.2026; el: „fă tot” - ideea 3).
// Pagina notează fiecare simulare de bot nou (o dată pe monedă, setare și zi; ruta istoric-bot ?action=simNota): moneda, ora ultimei bare știute, setarea
// întreagă, șansa pe plus la 7 zile, media prezisă și felul verdictului (Aș porni / N-aș porni / altul). Tura de aici judecă fiecare notă ajunsă la 7 zile
// pe barele REALE de 15 minute de după ea, cu ACELAȘI motor (GridSim.judecaVerdict: botul pornit la prima bară de după notare, un singur drum = cel real,
// închis la capăt) ⇒ rezultatul real în USDT. Raportul: scorul șanselor (Brier) față de „ban” (0,25) și față de „mereu rata de bază”; pe fel: câte pe
// plus și media reală față de cea prezisă. Nimic din viitor la notare; la judecată doar barele de după, cât a trecut de fapt.
// d = { cere, trimite, jurnal, GridSim, GridCalcul, randuri15(sim) }; st (pe disc) = { judecate: { id: {...} }, la }
const ZI = 86400000, ORA = 3600000, PE_TURA = 12, EXPIRAT = 10 * ZI, MONEDE_NOI = 3, UNITATI = 300;
// v100.352: versiunea motorului din note (ideea 1 cu stingerea aleasă pe barele reale ⇒ 2); bilanțul doar pe versiunea de acum
export const VERS_SIM = 2;
const med = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const bani = (x) => (x == null || !isFinite(x) ? "—" : (Math.round(x * 10) / 10 > 0 ? "+" : Math.round(x * 10) / 10 < 0 ? "−" : "") + Math.abs(Math.round(x * 10) / 10).toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const nr2 = (x) => Number(x).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Raportul pe notele judecate (val = rezultatul real în USDT). „Pe plus” = val > 0 (ca șansa: net > 0). v100.352 (auditul): o notă pe monedă pe zi
 *  (notele aceleiași zile pe aceeași monedă au același drum real), doar versiunea de acum; sub 300 de unități ⇒ „orientativ” (un model bine calibrat bate
 *  „mereu rata de bază” sigur abia pe la 300–1000); rata de bază e din aceleași rezultate (nimeni n-o știa dinainte). */
export function raportSim(judecate, vers = VERS_SIM) {
  const vazut = new Set(), l = (Array.isArray(judecate) ? judecate : []).filter((x) => x && isFinite(x.val) && isFinite(x.p) && x.p >= 0 && x.p <= 1 && (Number(x.v) || 1) === vers)
    .sort((a, b) => Number(a.t) - Number(b.t)).filter((x) => { const k = x.sim + "|" + x.z; if (vazut.has(k)) return false; vazut.add(k); return true; });
  if (!l.length) return { n: 0, text: "verdictele pentru un bot nou se judecă pe barele reale după 7 zile: încă niciunul" };
  const y = l.map((x) => (x.val > 0 ? 1 : 0)),   /* revizia (🔵12): același prag ca șansa (net > 0) */ baza = med(y), brier = med(l.map((x, i) => (x.p - y[i]) ** 2)), brierBaza = med(y.map((v) => (baza - v) ** 2));
  const grupa = (f) => { const g = l.filter((x) => x.fel === f); return { n: g.length, plus: g.filter((x) => x.val > 0).length, medie: med(g.map((x) => x.val)), prezis: med(g.map((x) => x.media).filter((v) => isFinite(v))) }; };
  const porni = grupa("porni"), nu = grupa("nu"), zile = new Set(l.map((x) => x.z)).size;
  const tg = (g, nume) => (g.n ? " · «" + nume + "» (" + g.n + "): pe plus în " + g.plus + ", media reală " + bani(g.medie) + " USDT (prezisă " + bani(g.prezis) + ")" : "");
  const text = "verdictele pentru un bot nou, judecate pe barele reale după 7 zile: " + cate(l.length, "verdict", "verdicte") + " din " + cate(zile, "zi", "zile")
    + " · scorul șanselor (Brier, mai mic e mai bine) " + nr2(brier) + " față de 0,25 la ban și " + nr2(brierBaza) + " cu „mereu " + Math.round(baza * 100) + "%”"
    + tg(porni, "Aș porni") + tg(nu, "N-aș porni") + (l.length < UNITATI ? " · orientativ: " + l.length + " din ~" + UNITATI + " de verdicte independente (o monedă pe zi) de care e nevoie ca diferența de scor să fie sigură; „mereu X%” e socotit din aceleași rezultate" : "");
  return { n: l.length, zile, brier, brierBaza, baza, porni, nu, text };
}

/** Tura: o dată pe oră; cel mult PE_TURA judecăți pe tură (barele pe monedă aduse o dată). */
export async function turaSimUrmarire(d, st) {
  const acum = d.acum || Date.now();
  st.judecate = st.judecate && typeof st.judecate === "object" ? st.judecate : {};
  if (acum - (st.la || 0) < ORA) return null;
  st.la = acum;
  const r = await d.cere("/api/istoric-bot?action=simNote"), note = r && Array.isArray(r.note) ? r.note : [];
  // v100.352 (auditul): cele încercate fără rezultat trec la coadă (12 note blocate opreau tot), cel mult 3 monede noi pe tură, cu pauză între ele
  st.incercat = st.incercat && typeof st.incercat === "object" ? st.incercat : {};
  const deJudecat = note.filter((n) => n && n.id && !st.judecate[n.id] && acum - Number(n.tUrm) >= 7 * ZI + 15 * 60000).sort((a, b) => (st.incercat[a.id] || 0) - (st.incercat[b.id] || 0)).slice(0, PE_TURA);
  const bare = {}; let noi = 0;
  for (const n of deJudecat) {
    st.incercat[n.id] = acum;
    try {
      if (!bare[n.sim]) { if (noi >= MONEDE_NOI) continue; if (noi && d.pauza !== 0) await new Promise((r) => setTimeout(r, d.pauza || 1600)); noi++; bare[n.sim] = d.GridCalcul.bare(await d.randuri15(n.sim)); }
      const j = d.GridSim.judecaVerdict(bare[n.sim], n);
      if (j && isFinite(j.val)) st.judecate[n.id] = { id: n.id, sim: n.sim, t: n.t, z: new Date(n.t).toISOString().slice(0, 10), p: n.p, media: n.media, fel: n.fel, v: Number(n.v) || 1, val: Math.round(j.val * 100) / 100 };
      else if (j && j.eroare) st.judecate[n.id] = { id: n.id, sim: n.sim, t: n.t, eroare: String(j.eroare).slice(0, 120) };
      else if (acum - Number(n.tUrm) > EXPIRAT) st.judecate[n.id] = { id: n.id, sim: n.sim, t: n.t, eroare: "expirat (fără bare)" };
    } catch (e) { if (d.jurnal) d.jurnal("urmărirea Simulatorului", n.sim, e && e.message || e); if (acum - Number(n.tUrm) > EXPIRAT) st.judecate[n.id] = { id: n.id, sim: n.sim, t: n.t, eroare: "expirat (" + String(e && e.message || e).slice(0, 60) + ")" }; }   // v100.352: o monedă scoasă nu mai stă pe veci
  }
  for (const k of Object.keys(st.incercat)) if (st.judecate[k] || !note.some((n) => n && n.id === k)) delete st.incercat[k];
  // păstrez doar ce mai e în listă (ruta ține 60 de zile)
  const ids = new Set(note.map((n) => n && n.id)); if (note.length) for (const k of Object.keys(st.judecate)) if (!ids.has(k)) delete st.judecate[k];   // revizia (🔵10): o listă goală (KV stricat) nu șterge ce s-a judecat
  const rez = raportSim(Object.values(st.judecate), d.GridSim && d.GridSim.VERS_SIM || VERS_SIM);   // revizia: versiunea dintr-o singură sursă
  try { await d.trimite("/api/istoric-bot?action=simUrmarire", { la: acum, rezumat: rez }); } catch (e) { if (d.jurnal) d.jurnal("urmărirea Simulatorului KV", e && e.message || e); }
  return rez;
}
