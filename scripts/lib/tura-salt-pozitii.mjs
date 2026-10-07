// Pozițiile Salt în colector (v101.84; el 07.10: „ok fa idei” după pagina Salt): la 15 minute, aceeași analiză ca pagina Salt
// (Salt.analizeaza, cu modulele colectorului) pe fiecare poziție scrisă de el:
// - alertă pe Discord când prețul trece sub stopul care urcă (Salt n-are planuri: stopul calculat de pe pagină) - o dată pe trecere;
//   la revenirea peste stop se rearmează (starea în meta().saltAlerte: „sub” / „peste”); trimiterea eșuată nu se ține minte;
// - rezumatul pentru banda de cont și Acasă (valoarea, costul și rezultatul în EUR, cum plătește la Salt; cine e pe IEȘI / ATENȚIE).
// deps: { pozitii, univers, cereBare(simbol) -> bare, Salt, deps (module pentru Salt.analizeaza), stare, trimite(msg, cheie) -> bool,
//         acum, eurRon?, jurnal, salveaza?() (starea pe disc pe loc), pauza?(ms), pauzaMs? }
// revizia Opus (07.10): poziția fără prețuri ⇒ jurnal + numărată (pagina nu spune „nimic roșu”); cursul o dată pe monedă pe tură; pauză
// între poziții (găleata „t212” e comună cu restul colectorului); cheile alertelor pozițiilor șterse se curăță
const nrRo = (v, z) => Number(v).toLocaleString("ro-RO", { minimumFractionDigits: z, maximumFractionDigits: z });
const semn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "");
const mon = (m) => (m === "GBp" ? "p" : m || "");
const pret = (v, m) => nrRo(v, 2) + " " + mon(m);
const eur1 = (v) => semn(Math.round(v * 10) / 10) + nrRo(Math.abs(v), 1) + " EUR";   // rezultatele: o zecimală
const pct1 = (v) => semn(Math.round(v * 1000) / 10) + nrRo(Math.abs(v * 100), 1) + "%";
// câte unități din moneda PREȚULUI face 1 EUR (GBp = pence ⇒ ×100) - ca saltFxPret de pe pagină
function fxPret(m, fxBrut) { return !m || m === "EUR" ? 1 : fxBrut > 0 ? fxBrut * (m === "GBp" ? 100 : 1) : null; }
const scurt = (s) => String(s || "").replace(/\.[A-Z]+$/, "");

export function mesajStopSalt(o) {
  const s = scurt(o.simbol);
  return { nivel: "critic", titlu: "Salt · " + s + ": sub stopul care urcă (" + pret(o.stop, o.m) + ")",
    mesaj: "Prețul e " + pret(o.pret, o.m) + "; ești pe " + pct1(o.pct) + " în EUR (" + eur1(o.rez) + "). Stopul care urcă e la cel puțin 15% sub maximul de după cumpărare.\n👉 Aș ieși, tot sau jumătate, și n-aș recumpăra " + s + " azi." };
}

export async function turaSaltPozitii(d) {
  const S = d.Salt, acum = d.acum || Date.now(), univ = Array.isArray(d.univers) ? d.univers : [], stare = d.stare || {};
  const rez = { la: acum, n: 0, val: 0, cost: 0, rez: 0, eurRon: d.eurRon > 0 ? d.eurRon : null, iesi: [], atentie: [], fara: 0 };
  let trimise = 0, prima = true;
  const cursuri = new Map(), lista = Array.isArray(d.pozitii) ? d.pozitii : [];
  const scrie = () => { if (d.salveaza) { try { d.salveaza(); } catch {} } };
  // v101.86 (pagina alerts în două): un rând pe poziție pentru poza paginii alerts - și cel fără prețuri (pret null + motivul)
  const randuri = [];
  const fara = (p, de) => { rez.fara++; randuri.push({ isin: p && p.isin, simbol: p && p.simbol, nume: p && p.nume || "", qty: p && p.qty, pretMediu: p && p.pretMediu, plata: p && p.plata, de: p && p.de || null, pret: null, motivFara: de });
    if (d.jurnal) d.jurnal("salt: " + (p && p.simbol) + " fără prețuri (" + de + ") - nu intră în rezumat"); };
  for (const p of lista) {
    rez.n++;
    if (!prima && d.pauza) await d.pauza(d.pauzaMs || 400); prima = false;
    try {
      const u = univ.find((x) => x.isin === p.isin), m = u && u.moneda || "";
      let b = null; try { b = await d.cereBare(p.simbol); } catch { b = null; }
      if (!Array.isArray(b) || b.length < 30) { fara(p, "bare"); continue; }
      const pf = S.perecheFx(m); let fxB = null;
      if (pf) { if (!cursuri.has(pf)) { let c = null; try { c = await d.cereBare(pf); } catch { c = null; } cursuri.set(pf, c); } fxB = cursuri.get(pf); }
      const pm = S.medieInMonedaSimbolului(p, m, fxB), fx = fxPret(m, !m || m === "EUR" ? 1 : fxB && fxB.length ? fxB[fxB.length - 1].c : null);
      if (pm === null || !fx) { fara(p, "curs " + (pf || m)); continue; }
      const a = S.analizeaza({ ...p, pretMediuSimbol: pm }, b, acum, d.deps);
      if (!a || !a.p) { fara(p, a && a.eroare || "analiza"); continue; }
      const val = p.qty * a.p.pret / fx, cost = p.plata === "EUR" ? p.qty * p.pretMediu : p.qty * p.pretMediu / fx;
      rez.val += val; rez.cost += cost; rez.rez += val - cost;
      const cs = a.cons || {}, r2 = (v) => Math.round(v * 100) / 100;
      randuri.push({ isin: p.isin, simbol: p.simbol, nume: p.nume || "", qty: p.qty, pretMediu: p.pretMediu, plata: p.plata, de: p.de || null, moneda: m || "EUR",
        pret: a.p.pret, prev: b.length > 1 ? b[b.length - 2].c : null, closes30: b.slice(-30).map((x) => x.c), val: r2(val), cost: r2(cost), rez: r2(val - cost),
        niv: cs.nivel || null, motive: Array.isArray(cs.motive) ? cs.motive.slice(0, 4) : [], sfat: String(cs.faCe || cs.titlu || ""),
        sugestie: a.niv && a.niv.stopPozitie > 0 && a.niv.tintaPozitie > 0 ? { stop: a.niv.stopPozitie, tinta: a.niv.tintaPozitie } : null,
        max: a.p.maxDupaCumparare || null, mediuSimbol: pm });
      const niv = a.cons && a.cons.nivel; if (niv === "iesi") rez.iesi.push(scurt(p.simbol)); else if (niv === "atentie") rez.atentie.push(scurt(p.simbol));
      if (a.niv && a.niv.stopPozitie > 0) {
        const k = "salt-stop-" + p.isin, sub = a.p.pret < a.niv.stopPozitie;
        if (sub && stare[k] !== "sub") {
          if (await d.trimite(mesajStopSalt({ simbol: p.simbol, m, pret: a.p.pret, stop: a.niv.stopPozitie, pct: val / cost - 1, rez: val - cost }), k)) { stare[k] = "sub"; trimise++; scrie(); }
        } else if (!sub && stare[k] === "sub") { stare[k] = "peste"; scrie(); }
      }
    } catch (e) { fara(p, e.message); }
  }
  const vii = new Set(lista.map((p) => "salt-stop-" + p.isin)); let sterse = 0;
  for (const k of Object.keys(stare)) if (k.startsWith("salt-stop-") && !vii.has(k)) { delete stare[k]; sterse++; }
  if (sterse) scrie();
  for (const k of ["val", "cost", "rez"]) rez[k] = Math.round(rez[k] * 100) / 100;
  return { rezumat: rez, trimise, randuri };
}

// v101.85 (el 07.10, „fa idei”): fără prețuri (măcar o poziție) de cel puțin 3 h ⇒ o alertă - altfel alerta la stopul care urcă ar tăcea
// fără să știe; când revin, o dată „au revenit”. Starea în același obiect (meta().saltAlerte): faraDe / faraAnuntat.
const cateTxt = (n, sg, pl) => (globalThis.TextRo && globalThis.TextRo.cate ? globalThis.TextRo.cate(n, sg, pl) : n + " " + (n === 1 ? sg : pl));
const oreTxt = (ms) => (globalThis.TextRo && globalThis.TextRo.ore ? globalThis.TextRo.ore(ms) : Math.round(ms / 360000) / 10 + " h");
export function alertaFaraPreturi(st, r, acum, pragMs) {
  const prag = pragMs || 3 * 3600000;
  if (r && r.n > 0 && r.fara > 0) {
    if (!st.faraDe) st.faraDe = acum;
    if (st.faraAnuntat || acum - st.faraDe < prag) return null;
    st.faraAnuntat = true;
    return { nivel: "atentie", titlu: "Salt: n-am prețuri de " + oreTxt(acum - st.faraDe),
      mesaj: "Yahoo nu dă prețuri pentru " + r.fara + " din " + cateTxt(r.n, "poziție", "poziții") + " Salt. Cât lipsesc, alerta la stopul care urcă nu poate suna, iar banda de cont arată cifrele de dinainte.\n👉 Aș verifica pozițiile direct la Salt până revin prețurile." };
  }
  const anuntat = !!st.faraAnuntat; delete st.faraDe; delete st.faraAnuntat;
  return anuntat && r && r.n > 0 ? { nivel: "info", titlu: "Salt: prețurile au revenit", mesaj: "Pozițiile Salt au iar prețuri: alerta la stopul care urcă merge din nou." } : null;
}
// rândul Salt din rezumatul de dimineață (sus, după becuri): valoarea, pe deschise, cine e de ieșit; rezumatul vechi (> 45 min) ⇒ spus
export function liniaDimineataSalt(r, acum) {
  if (!r || !(r.n > 0)) return null;
  if ((r.fara || 0) >= r.n) return "🧂 Salt: n-am prețuri pentru nicio poziție (" + r.n + ") - verifică direct la Salt";
  const vechi = acum - r.la > 45 * 60000, cap = "🧂 Salt" + (vechi ? " (rezumat de acum " + oreTxt(acum - r.la) + ")" : "") + ": ";
  return cap + nrRo(r.val, 1) + " EUR · deschise " + eur1(r.rez) + (r.cost > 0 ? " (" + pct1(r.rez / r.cost) + ")" : "")
    + ((r.iesi || []).length ? " · de ieșit: " + r.iesi.join(", ") : " · nimic de ieșit") + (r.fara > 0 ? " · " + r.fara + " din " + r.n + " fără prețuri" : "");
}
