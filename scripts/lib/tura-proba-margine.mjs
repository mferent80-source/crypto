// Radar v100.374 (21.11.2026, I-898 + I-908): tura PROBEI MARGINII, o dată pe oră (frâna de oră e în colector).
// Ia boții închiși din arhivă, pe rând (cei mai noi întâi, cel mult `peTura` pe tură): citește drumul fiecăruia din KV (`ist:<bot>`, ruta
// action=drum), scoate episodul (scripts/lib/proba-margine.mjs), păstrează drumul RĂRIT în `drum:<bot>` (I-898) și trimite bilanțul probei în
// KV `proba:margine` (pagina Probe). Starea (ce boți s-au judecat, episoadele, verdictul înghețat) stă pe disc: data/proba-margine-stare.json.
// Fără cifre potrivite după rezultat: pragurile sunt în docs/cercetare/2026-11-21-v100374-proba-marginii.md.
// După revizia independentă (21.11): o citire picată nu înseamnă „n-are drum”; botul e trecut „făcut” abia după ce drumul rărit s-a scris;
// verdictul se ÎNGHEAȚĂ o singură dată (la prima tură cu toată arhiva citită și pragul atins) - nu se recalculează la fiecare privire.
import { episodCuNota, notaVie, uneste, rareste, bilant, botDin } from "./proba-margine.mjs";
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
/* ritmul: o citire și o scriere pe bot, cu pauză - sub o treime din limita de scrieri pe minut a rutei (150), ca celelalte ture să nu aștepte */
export const PE_TURA = 90, PAUZA_MS = 1500, REFACE_BILANT_MS = 6 * 3600000, MAX_INCERCARI = 5;

// d = { acum, botiInchisi: async () => [...], cereDrum: async (id) => ({ brut, rarit, citit }), trimite: async (cale, corp), jurnal, peTura, pauzaMs }
export async function turaProbaMargine(d, st) {
  const acum = d.acum || Date.now(), jurnal = d.jurnal || (() => {}), asteapta = () => (d.pauzaMs === 0 ? null : pauza(d.pauzaMs || PAUZA_MS));
  st.facute = st.facute && typeof st.facute === "object" ? st.facute : {}; st.episoade = Array.isArray(st.episoade) ? st.episoade : [];
  st.incercari = st.incercari && typeof st.incercari === "object" ? st.incercari : {};
  const toti = (await d.botiInchisi()) || [], boti = toti.map((x) => ({ x, b: botDin(x) })).filter((q) => q.b && q.b.id);
  /* arhiva n-a venit (sau a venit goală): nu se trimite un bilanț cu „0 boți” peste cel bun */
  if (!boti.length) return { judecati: 0, episoadeNoi: 0, ramasi: 0, faraArhiva: true };
  const deFacut = boti.filter((q) => !st.facute[q.b.id]).sort((p, q) => q.b.inchis - p.b.inchis).slice(0, d.peTura || PE_TURA);
  let noi = 0, facuti = 0;
  for (const q of deFacut) {
    const id = q.b.id;
    let r = null; try { r = await d.cereDrum(id); } catch (e) { jurnal("proba marginii: drumul lui " + id + " n-a venit", e && e.message); continue; }   /* rămâne nefăcut: se reia tura viitoare */
    /* ruta spune `citit: false` când KV-ul n-a putut fi citit: asta nu e „botul n-are drum” (altfel o tură cu KV-ul bolnav scotea boții din probă) */
    if (!r || r.citit === false || !Array.isArray(r.brut)) { jurnal("proba marginii: drumul lui " + id + " n-a putut fi citit"); continue; }
    /* I-909: botul cu drumul tăiat își ia episodul din nota făcută cât era pornit; copia rărită de pe viu se încheie acum, cu tot drumul */
    const L = r.brut, viu = r.rarit && r.rarit.viu === true ? r.rarit : null, e = episodCuNota(q.x, L, r.rarit);
    if (L.length && (!r.rarit || viu)) {
      const rar = rareste(L, e && e.t0 ? e.t0 : null);
      try { await d.trimite("/api/istoric-bot?action=drum", { bot: id, drum: { creat: q.b.creat, inchis: q.b.inchis, p: viu ? uneste(viu.p, rar, e && e.t0 ? e.t0 : null) : rar, iesire: e && e.t0 ? { t: e.t0, total: e.laMargine } : null } }); }
      catch (er) {
        st.incercari[id] = (st.incercari[id] || 0) + 1; jurnal("proba marginii: drumul rărit al lui " + id + " nescris (încercarea " + st.incercari[id] + ")", er && er.message);
        /* botul rămâne nefăcut și se reia; după MAX_INCERCARI se judecă fără copia rărită (drumul întreg rămâne oricum în `ist:`) */
        if (st.incercari[id] < MAX_INCERCARI) { await asteapta(); continue; }
      }
    }
    st.facute[id] = e && e.t0 ? "episod" : (e && e.fara) || "fara-drum"; delete st.incercari[id]; facuti++;
    if (e && e.t0) { st.episoade.push({ id: e.id, t0: e.t0, zi: e.zi, dir: e.dir, inv: e.inv, d: e.d, dPct: e.dPct, stop: e.stop, nou: e.nou, mutat: !!e.mutat, dinNota: !!e.dinNota, dupa: e.dupa }); noi++; }
    await asteapta();
  }
  const stari = Object.values(st.facute), numara = (k) => stari.filter((v) => v === k).length, ramasi = boti.filter((q) => !st.facute[q.b.id]).length;
  if (facuti || !st.trimisLa || acum - st.trimisLa > REFACE_BILANT_MS) {
    const b = bilant(st.episoade);
    /* O SINGURĂ privire: verdictul se îngheață la prima tură cu toată arhiva citită și pragul atins; ce vine după se adună, dar nu-l schimbă */
    if (!st.inghetat && ramasi === 0 && b.verdict) { st.inghetat = { la: acum, n: b.n, zile: b.zile, medie: b.medie, suma: b.suma, ic: b.ic, verdict: b.verdict, seContrazic: b.seContrazic === true }; jurnal("proba marginii: verdictul înghețat - " + b.verdict + " (episoade: " + b.n + ", zile: " + b.zile + ")"); }
    await d.trimite("/api/istoric-bot?action=probaMargine", Object.assign({}, b, { la: acum, verdict: st.inghetat ? st.inghetat.verdict : null, inghetat: st.inghetat || null,
      boti: { total: Math.max(boti.length, stari.length), judecati: stari.length, ramasi, episoade: numara("episod"), inGrid: numara("in-grid"), faraDrum: numara("fara-drum"), drumTaiat: numara("drum-taiat"), gol: numara("gol"), mutat: numara("mutat"), pornitAfara: numara("pornit-afara"), neutri: numara("neutru") } }));
    st.trimisLa = acum;
  }
  return { judecati: facuti, episoadeNoi: noi, ramasi };
}

// I-909: o dată pe oră, pentru fiecare bot PORNIT long / short: drumul rărit de până acum și clipa primei treceri de marginea contra.
// d = { botiVii: async () => ({ bots: [...] }), cereDrum, trimite, jurnal, pauzaMs }
export async function pastreazaVii(d) {
  const jurnal = d.jurnal || (() => {}), r0 = await d.botiVii(), vii = r0 && Array.isArray(r0.bots) ? r0.bots : Array.isArray(r0) ? r0 : [];
  let scrise = 0;
  for (const x of vii) {
    const id = String(x && x.id || ""), b = { dir: String(x && x.directie || "").toLowerCase(), jos: Number(x && x.gridJos), sus: Number(x && x.gridSus), creat: Number(x && x.pornitLa) };
    if (!id || (b.dir !== "long" && b.dir !== "short")) continue;
    let r = null; try { r = await d.cereDrum(id); } catch (e) { jurnal("proba marginii: drumul botului pornit " + id + " n-a venit", e && e.message); continue; }
    if (!r || r.citit === false || !Array.isArray(r.brut) || !r.brut.length) continue;
    if (r.rarit && r.rarit.viu !== true) continue;   /* are deja copia de la închidere (botul tocmai s-a închis): nu se mai atinge */
    const n = notaVie(b, r.brut, r.rarit); if (!n) continue;
    try { await d.trimite("/api/istoric-bot?action=drum", { bot: id, drum: { creat: b.creat, inchis: null, viu: true, p: n.p, iesire: n.iesire, scanat: n.scanat, stare: n.stare } }); scrise++; }
    catch (e) { jurnal("proba marginii: nota botului pornit " + id + " nescrisă", e && e.message); }
    if (d.pauzaMs !== 0) await pauza(d.pauzaMs || PAUZA_MS);
  }
  return { vii: vii.length, scrise };
}
