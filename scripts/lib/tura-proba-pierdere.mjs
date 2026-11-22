// Radar v100.377 (22.11.2026, el: „idei care chiar să conteze”): tura PROBEI PIERDERII, o dată pe oră (frâna de oră e în colector).
// A doua regulă de ieșire pusă la probă, după „stop la margine”: botul închis prima oară când totalul lui ajunge la −5% din suma pusă.
// Regulile (pragul, măsura, 60 de episoade pe 20 de zile, intervalul de 99%, ce nu poate spune) sunt scrise ÎNAINTE de a citi vreun drum, în
// docs/cercetare/2026-11-22-v100377-proba-pierderii.md, și nu se schimbă după rezultate.
// Citește drumul fiecărui bot închis din KV (`ist:<bot>`, ruta action=drum - aceeași ca proba marginii), scoate episodul
// (scripts/lib/proba-margine.mjs: episodPierdere) și trimite bilanțul în KV `proba:pierdere` (pagina Probe). Starea (boții judecați, episoadele,
// verdictul înghețat) stă pe disc: data/proba-pierdere-stare.json. Nu scrie nimic în drumurile boților și nu atinge proba marginii.
import { episodPierdere, bilant, botDin, START_PIERDERE, COADA_PIERDERE, PRAG_PIERDERE, episodTimp, START_TIMP, COADA_TIMP, PRAG_TIMP, ORE_TIMP } from "./proba-margine.mjs";
/* v100.377 („fă ideile astea”): aceeași tură duce și a doua regulă pe bani, pe TIMP („închid după 4 ore pe minus”) - diferă doar episodul, clipa de
   început, cheia din KV și ce se numără la boții fără episod. Regula se dă prin `d.regula`; fără ea, cea a pierderii. */
export const REGULA_PIERDERE = { nume: "pierderii", episod: episodPierdere, start: START_PIERDERE, coada: COADA_PIERDERE, cale: "probaPierdere", extra: { prag: PRAG_PIERDERE }, stari: { pestePrag: "peste-prag", pornitSub: "pornit-sub" } };
export const REGULA_TIMP = { nume: "timpului", episod: episodTimp, start: START_TIMP, coada: COADA_TIMP, cale: "probaTimp", extra: { prag: PRAG_TIMP, ore: ORE_TIMP }, stari: { scurt: "scurt", pePlus: "pe-plus" } };
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
/* boții închiși cu mai mult de două zile înainte de pre-înregistrare nu se citesc: drumurile se țin după închidere abia din 21.11 */
export const PE_TURA = 60, PAUZA_MS = 1500, REFACE_BILANT_MS = 6 * 3600000, VECHI_MS = 2 * 86400000, MAX_ESECURI = 3;
/* revizia reparațiilor (22.11, N3): un drum pe care serverul îl dă mereu „necitit” (valoare stricată în KV) ținea verdictul pe loc pentru totdeauna.
   Citirile picate se numără pe bot; după MAX_CITIRI ture botul trece „necitit” (numărat pe pagină) și nu mai ține proba deschisă. Cu mai mult de
   MAX_NECITITI asemenea boți verdictul NU se îngheață (un KV bolnav cu totul nu trebuie să scoată boții din probă). */
export const MAX_CITIRI = 24, MAX_NECITITI = 3;
/* a doua trecere a reviziei (22.11, D1): un bot trecut „necitit” nu se mai cerea NICIODATĂ, iar cu mai mult de MAX_NECITITI verdictul nu se dă ⇒ de la al
   patrulea proba rămânea ținută pe loc pentru totdeauna, și după ce KV-ul era reparat. Acum boții „necitiți” se reîncearcă rar (o dată la
   REINCEARCA_NECITIT_MS) și revin în probă când drumul lor se citește. */
export const REINCEARCA_NECITIT_MS = 24 * 3600000;

// d = { acum, botiInchisi: async () => [...], cereDrum: async (id) => ({ brut, citit }), trimite: async (cale, corp), jurnal, peTura, pauzaMs }
export async function turaProbaPierdere(d, st) {
  const R = d.regula || REGULA_PIERDERE, acum = d.acum || Date.now(), jurnal = d.jurnal || (() => {}), asteapta = () => (d.pauzaMs === 0 ? null : pauza(d.pauzaMs || PAUZA_MS));
  st.facute = st.facute && typeof st.facute === "object" ? st.facute : {}; st.episoade = Array.isArray(st.episoade) ? st.episoade : [];
  st.citiri = st.citiri && typeof st.citiri === "object" ? st.citiri : {}; st.necititLa = st.necititLa && typeof st.necititLa === "object" ? st.necititLa : {};
  const toti = (await d.botiInchisi()) || [], boti = toti.map((x) => ({ x, b: botDin(x) })).filter((q) => q.b && q.b.id);
  /* arhiva n-a venit (sau a venit goală): nu se trimite un bilanț cu „0 boți” peste cel bun */
  if (!boti.length) return { judecati: 0, episoadeNoi: 0, ramasi: 0, faraArhiva: true };
  /* auditul 22.11 (🔴): arhiva venită pe jumătate (`complet === false`: doar ultimii boți, de la Pionex) ⇒ tura nu face nimic - cu lista scurtă
     „toți boții citiți” ar ieși adevărat și verdictul s-ar îngheța pe o parte din boți */
  if (toti.complet === false) { jurnal("proba " + R.nume + ": arhiva boților a venit pe jumătate - aștept tura viitoare"); return { judecati: 0, episoadeNoi: 0, ramasi: null, partiala: true }; }
  /* auditul 22.11 (🟡): verdictul înghețat stă și în KV; dacă starea de pe disc l-a pierdut, se ia de acolo. Dacă nu se poate citi, tura asta nu îngheață. */
  let stiuInghetat = !!st.inghetat || !d.citesteInghetat;
  if (!st.inghetat && d.citesteInghetat) {
    try { const g = await d.citesteInghetat(); stiuInghetat = true; if (g && g.verdict && Number(g.la) > 0) { st.inghetat = g; jurnal("proba " + R.nume + ": verdictul înghețat luat din KV (starea de pe disc nu-l avea)"); } }
    catch (e) { jurnal("proba " + R.nume + ": verdictul din KV n-a putut fi citit - tura asta nu îngheață nimic", e && e.message); }
  }
  for (const q of boti) if (!st.facute[q.b.id] && q.b.inchis < R.start - VECHI_MS) st.facute[q.b.id] = "vechi";   /* fără citire */
  const deFacut = boti.filter((q) => !st.facute[q.b.id]).sort((p, q) => (st.citiri[p.b.id] || 0) - (st.citiri[q.b.id] || 0) || q.b.inchis - p.b.inchis).slice(0, d.peTura || PE_TURA);
  const deReincercat = boti.filter((q) => st.facute[q.b.id] === "necitit" && acum - (st.necititLa[q.b.id] || 0) >= REINCEARCA_NECITIT_MS).slice(0, 2 * MAX_NECITITI);
  let noi = 0, facuti = 0, esecuri = 0, necititeNoi = 0;
  for (const q of deFacut.concat(deReincercat)) {
    const id = q.b.id;
    let r = null, picat = null, aruncat = false; try { r = await d.cereDrum(id); } catch (e) { aruncat = true; picat = "n-a venit" + (e && e.message ? " (" + e.message + ")" : ""); }
    /* `citit: false` = KV-ul n-a putut fi citit: asta nu e „botul n-are drum” */
    if (!picat && (!r || r.citit === false || !Array.isArray(r.brut))) picat = "n-a putut fi citit";
    /* citirea picată: botul rămâne nefăcut (se reia tura viitoare). Pauză și aici, iar după MAX_ESECURI la rând tura se oprește (serverul e bolnav:
       fără asta, 60 de cereri plecau una după alta) */
    if (picat && !aruncat) {   /* serverul a răspuns, dar drumul ăsta nu se poate citi: se numără pe BOT, nu ca „server bolnav” */
      esecuri = 0;
      if (st.facute[id] === "necitit") { st.necititLa[id] = acum; jurnal("proba " + R.nume + ": drumul lui " + id + " e tot necitit (reîncerc peste o zi)"); await asteapta(); continue; }
      st.citiri[id] = (st.citiri[id] || 0) + 1; jurnal("proba " + R.nume + ": drumul lui " + id + " " + picat + " (încercarea " + st.citiri[id] + " din " + MAX_CITIRI + ")");
      if (st.citiri[id] >= MAX_CITIRI) { st.facute[id] = "necitit"; st.necititLa[id] = acum; delete st.citiri[id]; necititeNoi++; jurnal("proba " + R.nume + ": drumul lui " + id + " rămâne necitit - botul iese din probă, numărat ca necitit"); }
      await asteapta(); continue;
    }
    if (picat) { jurnal("proba " + R.nume + ": drumul lui " + id + " " + picat); if (++esecuri >= MAX_ESECURI) { jurnal("proba " + R.nume + ": " + MAX_ESECURI + " citiri picate la rând - mă opresc până la tura viitoare"); break; } await asteapta(); continue; }
    esecuri = 0; delete st.citiri[id]; delete st.necititLa[id];
    const e = R.episod(q.x, r.brut);
    st.facute[id] = e && e.t0 ? "episod" : (e && e.fara) || "fara-drum"; facuti++;
    if (e && e.t0) { st.episoade.push({ id: e.id, t0: e.t0, zi: e.zi, dir: e.dir, inv: e.inv, d: e.d, dPct: e.dPct, stop: e.stop, nou: e.nou, laRegula: e.laRegula === true, dupa: e.dupa }); noi++; }
    await asteapta();
  }
  const stari = Object.values(st.facute), numara = (k) => stari.filter((v) => v === k).length, ramasi = boti.filter((q) => !st.facute[q.b.id]).length;
  if (facuti || necititeNoi || st.netrimis || !st.trimisLa || acum - st.trimisLa > REFACE_BILANT_MS) {
    const b = bilant(st.episoade, { coada: R.coada });
    /* O SINGURĂ privire: verdictul se îngheață la prima tură cu toți boții citiți și pragul atins; ce vine după se adună, dar nu-l schimbă */
    if (!st.inghetat && stiuInghetat && ramasi === 0 && numara("necitit") <= MAX_NECITITI && b.verdict) { st.inghetat = { la: acum, n: b.n, zile: b.zile, medie: b.medie, suma: b.suma, ic: b.ic, verdict: b.verdict, seContrazic: b.seContrazic === true }; jurnal("proba " + R.nume + ": verdictul înghețat - " + b.verdict + " (episoade: " + b.n + ", zile: " + b.zile + ")"); }
    const alte = {}; for (const k of Object.keys(R.stari)) alte[k] = numara(R.stari[k]);
    st.netrimis = true;   /* D4: dacă trimiterea pică (503), tura următoare trimite din nou - verdictul înghețat local nu stă 6 ore în afara KV-ului */
    await d.trimite("/api/istoric-bot?action=" + R.cale, Object.assign({}, b, R.extra, { la: acum, coada: R.coada, verdict: st.inghetat ? st.inghetat.verdict : null, inghetat: st.inghetat || null,
      boti: Object.assign({ total: Math.max(boti.length, stari.length), judecati: stari.length - numara("vechi") - numara("necitit"), necititi: numara("necitit"), ramasi, episoade: numara("episod"), faraDrum: numara("fara-drum"), drumTaiat: numara("drum-taiat"), gol: numara("gol"), vechi: numara("vechi") }, alte) }));
    st.trimisLa = acum; st.netrimis = false;
  }
  return { judecati: facuti, episoadeNoi: noi, ramasi };
}
export const turaProbaTimp = (d, st) => turaProbaPierdere(Object.assign({}, d, { regula: REGULA_TIMP }), st);
