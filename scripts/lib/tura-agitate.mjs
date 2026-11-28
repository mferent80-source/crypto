// Tura „Agitate acum” a colectorului (v101.216, Radar v100.398, I-972; el, 28.11.2026: „fa idei” după pagina „Agitate acum”).
// Pagina vede doar cât e deschisă; colectorul merge tot timpul, deci el anunță când o monedă din primele 150 „se aprinde”:
//   - o dată pe minut: lista Pionex PERP (O cerere pentru toate monedele, prin /api/market) ⇒ universul paginii (Agitate.univers);
//   - lumânările de 5 minute (500) ale fiecărei monede, cu BUGET: cel mult 12 cereri pe tură (la 1,6 s), recitite la 6 ore; între citiri prețul
//     din listă le ține la zi (Agitate.cuPret) - aceleași formule ca pagina;
//   - regula (public/lib/agitate.js, cu jurnalul încercărilor): pe o oră ≥ 5% ȘI ≥ 3× obișnuitul monedei, la trecerea de jos în sus (coboară
//     abia sub 80% din praguri). Lumânările ținute cu prețul din listă pot greși ⇒ candidatul (de la 80% din praguri) se CONFIRMĂ pe lumânări
//     proaspete (o cerere) înainte de mesaj; cel mult 5 confirmări pe tură, aceeași monedă cel mult o dată la 5 minute;
//   - un mesaj pe tură pentru toate monedele aprinse; o dată pe monedă la 24 h; cel mult 8 mesaje în ORICE 24 de ore, cu tot cu cele de piață;
//   - mișcarea pieței întregi (Agitate.piataAprinsa: ≥ 8 monede și ≥ 15% deodată la 3% / 3×) = UN mesaj de piață, cel mult o dată la 24 h, și o
//     oră (de la ultima tură cu piața aprinsă) fără mesaje pe monedă - aprinderile rămân pe pagină, cu semnul `piata`;
//   - prima evaluare a unei monede (pornirea colectorului) doar ține minte starea: fără val de mesaje pentru ce era deja aprins.
// Revizia independentă din 28.11 (înainte de livrare):
//   - 🔴 după o cădere (lista n-a venit peste 15 minute) lumânările au un GOL, iar prețul viu pus peste el dădea „pe o oră” mișcarea întregii
//     căderi ⇒ mesaj fals „se mișcă toată piața”. Acum lumânările cu gol NU se judecă: se recitesc întâi (în bugetul de 12 pe tură);
//   - 🟡 cu mai puțin de 60% din monede măsurate (pornire, recitire după cădere) nu se judecă nici piața („8 din 12”), nici monedele;
//   - 🟡 recitirea care pică nu mai șterge lumânările bune; moneda abia recitită nu se mai cere o dată pentru confirmare;
//   - 🟡 plafonul e pe ultimele 24 de ore (pe ziua UTC, la 02:00 ora României se deschidea unul nou); piața o dată la 24 h (politica de
//     repetare a casei oricum ține aceeași cheie 24 h doar în Radar);
//   - (recitirea mea de după) plafonul atins când se mișcă toată piața nu mai „consumă” rândul mesajului de piață pe 24 h.
// Mesajele pleacă prin trimiteAlerta: noaptea (23–07) așteaptă rezumatul de dimineață, ca restul informărilor (cheile `agitate` sunt în
// CHEI_NOAPTE, scripts/lib/politica-alerte.mjs). Ce vede pagina: KV `agitate` (ruta action=agitate).
// Sunt FAPTE, nu semnale: mesajul spune unde e mișcare, nu încotro merge prețul.
// v101.217 (Radar v100.399, I-976…I-978; el, 28.11: „fa idei”): BILANȚUL - tura ține pe disc un jurnal pe zilele României (`disc.jurnal`):
//   - mesajele plecate / oprite de plafon și timpul urmărit (doar turele care judecă, una după alta) ⇒ „mesaje pe zi” față de ținta de 5;
//   - fiecare aprindere, cu prețul și direcția ei (`disc.urmari`), primește prețul din listă la +1 h și la +4 h, la prima tură de după termen;
//     întârziat peste 10 minute = „ratat” (nu se pune unul târziu). Rezultatul intră în rândul ZILEI APRINDERII; votează doar aprinderile singure
//     cu direcție, sub regula de acum. Nimic din viitor nu schimbă un rezultat scris (proba D4 din proba-v100399);
//   - la 15 minute, amplitudinea pe 24 h de pe Binance Futures față de cea de pe Pionex ⇒ câte citiri și la ce monede a apărut „peste Binance”;
//   - verdictul „ce a urmat” se dă O SINGURĂ dată pe orizont (Agitate.bilantUrmare: 30 de zile cu vot și 150 de cazuri, t pe zile) și rămâne
//     înghețat în `disc.verdict`; o regulă nouă (APRINS schimbat) repornește tot.
// Criteriile și de ce sunt așa: public/lib/agitate.js (BILANT). Pagina primește doar rezumatele (corp.bilant).
// d = { acum, cere(cale), binance(url) [opțional], trimite(cale, corp), trimiteAlerta(m, bot, cheie), jurnal, pauza(ms), Agitate, TextRo, eCrypto(baza), citesteDisc(), scrieDisc(o) }
// st = starea turei (în memorie: lumânările, rangurile, stările); pe disc (citesteDisc / scrieDisc): aprinderile, ultimul mesaj pe monedă, orele mesajelor,
//      jurnalul pe zile, cazurile „ce a urmat”, verdictul înghețat
import { ziRo } from "./alerte-zi.mjs";
export const RITM_MS = 60000;
export const BINANCE_MS = 15 * 60000;
export const JURNAL_ZILE = 120;
export const URMARI_ZILE = 90;          /* cazurile brute (preț, mișcare, de câte ori obișnuitul) rămân 90 de zile pentru socoteli de mai târziu; rezultatele lor sunt deja în jurnal */
export const BINANCE_LIMITA_MS = 8000;  /* revizia 28.11: cererea spre Binance (cu pauzele ei comune de până la minute) nu ține tura */
export const NECITIT_MAX = 10;
const FAPI = "https://fapi.binance.com", URMARI_MAX = 800, PESTE_MAX = 12;
const ziGoala = (r) => ({ r, ms: 0, m: 0, p: 0, a: 0, ap: 0, opr: 0, bc: 0, bp: [], cd: 0, fd: 0, x: 0, h1: [0, 0, 0, 0], h4: [0, 0, 0, 0] });
export const RECITIRE_MS = 6 * 3600000;
export const RANGURI_MS = 6 * 3600000;
export const PE_TURA = 12;
export const PAUZA_MS = 1600;
export const REGULA = { asteptareMs: 24 * 3600000, maxZi: 8, candidat: 0.8, confirmariPeTura: 5, reconfirmaMs: 5 * 60000, linisteMs: 60 * 60000, piataAsteptareMs: 24 * 3600000, acoperire: 0.6, reincearcaMs: 10 * 60000 };
const ZI = 86400000, CINSTIT = "Fapt, nu semnal: spune unde e mișcare, nu încotro merge.";
function scris(d) {
  const T = d.TextRo || (typeof TextRo !== "undefined" ? TextRo : null), rez = (v, u) => (Number.isFinite(v) ? String(Math.round(v * 10) / 10).replace(".", ",") + u : "—");
  return { pct: (v) => (T ? T.pct(v, 1) : rez(v, "%")), semn: (v) => (T ? T.pctSemn(v, 1) : (v > 0 ? "+" : "") + rez(v, "%")), ori: (v) => (T ? T.ori(v, 1) : rez(v, "×")), pret: (v) => (T ? T.pret(v) : String(v)),
    cate: (n, sg, pl) => (T ? T.cate(n, sg, pl) : n + " " + (n === 1 ? sg : pl)) };
}
// mesajul pentru monedele aprinse în aceeași tură: { nivel, titlu (≤ 60), mesaj (2 rânduri), cheie }
export function mesajMonede(noi, d) {
  const S = scris(d), l = noi.slice().sort((a, b) => b.amp - a.amp), cheie = "agitate:" + l.map((x) => x.s).sort().join(",");
  if (l.length === 1) { const x = l[0];
    return { nivel: "info", titlu: "⚡ S-a aprins " + x.s + ": " + S.pct(x.amp) + " într-o oră", cheie,
      mesaj: x.s + ": " + S.pct(x.amp) + " între minim și maxim în ultima oră (" + S.semn(x.net) + " net), de " + S.ori(x.ori) + " cât obișnuiește. Preț " + S.pret(x.pret) + ".\n" + CINSTIT }; }
  let titlu = "⚡ S-au aprins " + S.cate(l.length, "monedă", "monede") + ": " + l.map((x) => x.s).join(", ");
  if (titlu.length > 60) titlu = titlu.slice(0, 59).replace(/,?\s*[^,]*$/, "") + "…";
  return { nivel: "info", titlu, cheie, mesaj: l.slice(0, 4).map((x) => x.s + " " + S.pct(x.amp) + " (" + S.semn(x.net) + " net, " + S.ori(x.ori) + ")").join(" · ") + (l.length > 4 ? " · + încă " + (l.length - 4) : "") + "\n" + CINSTIT };
}
export function mesajPiata(P, rand, d) {
  const S = scris(d), A = d.Agitate, top = rand.filter((r) => r.x.masurat).sort((a, b) => b.x.amp - a.x.amp).slice(0, 3).map((r) => r.m.simbol + " " + S.pct(r.x.amp)).join(", ");
  return { nivel: "info", titlu: "⚡ Se mișcă toată piața: " + P.n + " din " + S.cate(P.din, "monedă", "monede"), cheie: "agitate-piata",
    mesaj: P.n + " din " + S.cate(P.din, "monedă", "monede") + " urmărite sunt deodată la cel puțin " + S.pct(A.PIATA.amp) + " într-o oră și de " + S.ori(A.PIATA.ori) + " obișnuitul lor. Cele mai agitate: " + top + ".\n" + CINSTIT };
}
// Starea de pe disc (revizia 28.11): fișierul LIPSĂ = pornire de la zero; fișierul care NU se poate citi (ținut de antivirus / copie, JSON tăiat,
// altceva decât starea turei) = null ⇒ tura sare și NU scrie peste el (ar șterge luni de bilanț și verdictul înghețat). După 10 ture la rând
// e pus deoparte și se pornește de la zero - altfel alertele ar tăcea pentru totdeauna.   io = { citeste() ⇒ text (aruncă ENOENT), deoparte(), jurnal }
export function citesteStare(io, st) {
  const necitit = (e) => {
    st.necitit = (st.necitit || 0) + 1; if (st.necitit < NECITIT_MAX) return null;
    try { io.deoparte(); } catch { /* rămâne pe loc */ }
    io.jurnal("agitate: starea de pe disc nu s-a putut citi de " + NECITIT_MAX + " ori la rând (" + String(e && e.message || e).slice(0, 80) + ") - pusă deoparte, pornesc de la zero");
    st.necitit = 0; return {};
  };
  let brut; try { brut = io.citeste(); } catch (e) { if (e && e.code === "ENOENT") { st.necitit = 0; return {}; } return necitit(e); }
  try { const x = JSON.parse(brut); if (!x || typeof x !== "object" || Array.isArray(x)) return necitit(new Error("nu e starea turei")); st.necitit = 0; return x; } catch (e) { return necitit(e); }
}
// lumânările unei monede: listă | null (n-au venit) | { refuz: secunde } (Pionex cere pauză)
async function aduBare(d, m) {
  let r;
  try { r = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(m.pionex) + "&interval=5M&limit=500"); }
  catch (e) { return /429|rate|prea multe/i.test(String(e && e.message || e)) ? { refuz: 60 } : null; }
  if (r && r.result === false) return r.retryAfter != null ? { refuz: Math.max(15, Number(r.retryAfter) || 60) } : null;
  const b = d.Agitate.bare(r && r.data && r.data.klines);
  return b.length >= 3 ? b : null;
}

export async function turaAgitate(d, st) {
  if (d.acum - (st.la || 0) < RITM_MS) return null;
  st.la = d.acum;
  const A = d.Agitate, R = REGULA, pauza = typeof d.pauza === "function" ? d.pauza : async () => {};
  const esec = (motiv) => { st.esecuri = (st.esecuri || 0) + 1; if (st.esecuri === 1 || st.esecuri % 30 === 0) d.jurnal("agitate: " + motiv + " (eșecul " + st.esecuri + " la rând)"); return { facut: false, motiv }; };
  // 1. rangurile (la 6 ore; la eșec rămân cele vechi)
  if (!st.harta || d.acum - (st.hartaLa || 0) >= RANGURI_MS) {
    try { const r = await d.cere("/api/market?type=top_cap"); if (r && r.result !== false && Array.isArray(r.monede) && r.monede.length >= A.TOP) { st.harta = A.ranguri(r.monede, A.TOP); st.hartaLa = d.acum; } } catch { /* rămân cele vechi */ }
  }
  if (!st.harta) return esec("lista primelor 150 de monede n-a venit");
  // 2. lista Pionex; ora e a Pionex (aceeași cu a lumânărilor)
  let tk = null; try { tk = await d.cere("/api/market?type=pionex_tickers&market=PERP"); } catch { tk = null; }
  const t = tk && tk.result !== false && tk.data && Array.isArray(tk.data.tickers) ? tk.data.tickers : null;
  if (!t) return esec("lista Pionex n-a venit");
  const acum = Number(tk.timestamp) > 0 ? Number(tk.timestamp) : d.acum;
  const u = A.univers(t, st.harta, { eCrypto: d.eCrypto });
  st.bare = st.bare || {}; st.sus = st.sus || {}; st.vazut = st.vazut || {}; st.confirmat = st.confirmat || {};
  // 3a. lumânările rămase în urmă (o cădere: lista n-a venit peste 15 minute) au un gol ⇒ se recitesc, nu se judecă
  for (const m of u.monede) { const e = st.bare[m.simbol]; if (e && e.b && e.b.length && acum - e.b[e.b.length - 1].t > 3 * A.PER_MS) e.refa = true; }
  // 3b. lumânările lipsă, cu gol sau mai vechi de 6 ore, cu buget; cele mai agitate pe 24 h întâi
  let cerute = 0;
  for (const m of u.monede) {
    if (cerute >= PE_TURA || acum < (st.refuzPana || 0)) break;
    const e = st.bare[m.simbol];
    if (e && e.b && !e.refa && acum - e.la < RECITIRE_MS) continue;
    if (e && e.esecLa && acum - e.esecLa < R.reincearcaMs) continue;      /* n-au venit adineauri: peste 10 minute */
    if (cerute) await pauza(PAUZA_MS);
    cerute++;
    const b = await aduBare(d, m);
    if (b && b.refuz) { st.refuzPana = acum + b.refuz * 1000; break; }
    if (b) st.bare[m.simbol] = { b, la: acum, citit: acum };
    else if (e) e.esecLa = acum;                                           /* recitirea a picat: lumânările de dinainte rămân în folosință */
    else st.bare[m.simbol] = { b: null, la: acum, esecLa: acum };
  }
  // 4. prețul viu în lumânări (cele abia citite sunt deja proaspete) + măsura pe o oră; lumânările cu gol nu se măsoară
  const rand = [];
  for (const m of u.monede) {
    const e = st.bare[m.simbol]; if (!e || !e.b) continue;
    if (e.citit !== acum) { const b = A.cuPret(e.b, acum, m.pret), k = b.length; e.b = b; if (k > 1 && b[k - 1].t - b[k - 2].t > 2 * A.PER_MS) e.refa = true; }
    if (e.refa) continue;
    m.bare = e.b; rand.push({ m, x: A.masura(m, "1h", acum) });
  }
  // 5. piața întreagă? - doar când e măsurată destulă piață (altfel „8 din 12” la pornire)
  const destule = rand.length >= R.acoperire * u.monede.length;
  const P = destule ? A.piataAprinsa(rand.map((r) => r.x)) : { n: 0, din: rand.length, da: false };
  if (P.da) st.piataPana = acum + R.linisteMs;
  const liniste = acum < (st.piataPana || 0);
  // 6. aprinderile
  const disc0 = typeof d.citesteDisc === "function" ? d.citesteDisc() : {};
  if (disc0 === null) return esec("starea de pe disc nu se poate citi acum - tura sare, nu scriu peste ea");   /* înainte de orice schimbare de stare: aprinderea minutului acesta se anunță la tura următoare */
  const disc = disc0 || {};
  disc.aprinse = Array.isArray(disc.aprinse) ? disc.aprinse : []; disc.alertat = disc.alertat && typeof disc.alertat === "object" ? disc.alertat : {};
  disc.mesaje = (Array.isArray(disc.mesaje) ? disc.mesaje : []).filter((x) => Number(x) > 0 && acum - x < ZI);
  // 6a. jurnalul zilei (bilanțul): rândul zilei României, cu regula de acum; timpul urmărit = turele care judecă, venite una după alta
  const regula = A.regulaAcum([R.maxZi, R.candidat, R.asteptareMs / 3600000, R.linisteMs / 60000].join("/")), zi = ziRo(acum);
  disc.jurnal = disc.jurnal && typeof disc.jurnal === "object" && !Array.isArray(disc.jurnal) ? disc.jurnal : {};
  if (!disc.jurnal[zi] || disc.jurnal[zi].r !== regula) disc.jurnal[zi] = ziGoala(regula);
  const J = disc.jurnal[zi];
  if (destule) { if (st.judecatLa && acum - st.judecatLa <= 3 * RITM_MS) J.ms += acum - st.judecatLa; st.judecatLa = acum; }
  // 6b. ce a urmat după aprinderile dinainte: prețul din lista de ACUM, doar la termen (cel mult 10 minute după el); altfel „ratat”
  disc.urmari = (Array.isArray(disc.urmari) ? disc.urmari : []).filter((c) => c && c.la > 0 && acum - c.la <= URMARI_ZILE * ZI);
  const pretDe = {}; for (const x of t) { const m = /^([A-Z0-9]+)_USDT_PERP$/.exec(String(x && x.symbol || "").toUpperCase()), p = Number(x && x.close); if (m && p > 0) pretDe[m[1]] = p; }
  for (const c of disc.urmari) for (const [kp, kx, hk, ore] of [["p1", "x1", "h1", 1], ["p4", "x4", "h4", 4]]) {
    if (kp in c || c[kx]) continue;                                             /* un rezultat scris (sau ratat) nu se mai atinge */
    const intarziere = acum - (c.la + ore * 3600000); if (intarziere < 0) continue;
    const voteaza = !c.piata && (c.dir === 1 || c.dir === -1) && c.r === regula, z = voteaza && disc.jurnal[c.zi] && disc.jurnal[c.zi].r === regula ? disc.jurnal[c.zi] : null;
    if (z && (!Array.isArray(z[hk]) || z[hk].length < 4)) z[hk] = [0, 0, 0, 0];
    if (intarziere > A.BILANT.tarziuMs) { c[kx] = true; if (z) z.x = (z.x || 0) + 1; continue; }
    if (!(pretDe[c.s] > 0)) continue;                                          /* moneda lipsește din lista de acum: se așteaptă tura următoare, cât mai e în cele 10 minute (revizia 28.11) */
    c[kp] = pretDe[c.s]; const urm = z && A.urmare(c.pret, c[kp], c.dir); if (urm) { z[hk][urm.fel === "continuat" ? 0 : urm.fel === "intors" ? 1 : 2]++; z[hk][3] += urm.d; }
  }
  const noi = [], notate = []; let confirmari = 0;
  for (const r of rand) {
    const s = r.m.simbol, x = r.x; if (!x.masurat || x.ori === null) continue;
    const aproape = x.amp >= R.candidat * A.APRINS.amp && x.ori >= R.candidat * A.APRINS.ori;
    if (!st.vazut[s] || !destule) { st.vazut[s] = true; st.sus[s] = aproape; continue; }      /* prima evaluare / prea puțină piață: doar ține minte */
    if (st.sus[s]) { if (!aproape) st.sus[s] = false; continue; }
    if (!aproape) continue;
    let xf = x;
    if (!liniste && st.bare[s].citit !== acum) {                                   /* confirmarea pe lumânări proaspete */
      if ((st.confirmat[s] && acum - st.confirmat[s] < R.reconfirmaMs) || confirmari >= R.confirmariPeTura || acum < (st.refuzPana || 0)) continue;
      confirmari++; st.confirmat[s] = acum;
      await pauza(PAUZA_MS);
      const b = await aduBare(d, r.m);
      if (b && b.refuz) { st.refuzPana = acum + b.refuz * 1000; continue; }
      if (!b) continue;
      st.bare[s] = { b, la: acum, citit: acum }; r.m.bare = b; xf = A.masura(r.m, "1h", acum); r.x = xf;
    }
    if (!A.aprinsa(xf)) continue;
    st.sus[s] = true;
    const e = { s, la: acum, amp: xf.amp, net: xf.net, ori: xf.ori, pret: r.m.pret };
    if (liniste) e.piata = true;                                                   /* notată în mișcarea pieței: pagina o numără, nu o înșiră */
    notate.push(e);
    if (!liniste && !(disc.alertat[s] && acum - disc.alertat[s] < R.asteptareMs)) noi.push(e);
  }
  // 7. mesajele (cel mult 8 în orice 24 de ore) și ce rămâne pe disc
  let trimise = [], piata = false;
  const maiPot = () => disc.mesaje.length < R.maxZi;
  /* ora mesajului de piață se ține minte DOAR când a plecat: cu plafonul atins nu-și pierde rândul pe 24 h, pleacă la prima mișcare cu loc */
  if (!P.da) st.piataOprita = false;
  if (P.da && acum - (disc.piataLa || 0) >= R.piataAsteptareMs) {
    if (maiPot() && typeof d.trimiteAlerta === "function") { const m = mesajPiata(P, rand, d); await d.trimiteAlerta({ nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj }, null, m.cheie); disc.mesaje.push(acum); disc.piataLa = acum; piata = true; st.piataOprita = false; J.p++; }
    else if (!st.piataOprita) { st.piataOprita = true; J.opr++; d.jurnal("agitate: se mișcă toată piața, dar plafonul de " + R.maxZi + " mesaje în 24 de ore e atins - mesajul de piață pleacă la următoarea mișcare, când e loc"); }
  }
  if (noi.length) {
    if (maiPot() && typeof d.trimiteAlerta === "function") { const m = mesajMonede(noi, d); await d.trimiteAlerta({ nivel: m.nivel, titlu: m.titlu, mesaj: m.mesaj }, null, m.cheie); disc.mesaje.push(acum); for (const e of noi) disc.alertat[e.s] = acum; trimise = noi.map((e) => e.s); J.m++; }
    else { J.opr++; d.jurnal("agitate: plafonul de " + R.maxZi + " mesaje în 24 de ore e atins - " + noi.map((e) => e.s).join(", ") + " rămân doar pe pagină"); }
  }
  disc.aprinse = disc.aprinse.concat(notate).filter((e) => e && acum - e.la <= ZI).slice(-60);
  for (const k of Object.keys(disc.alertat)) if (acum - disc.alertat[k] > 3 * ZI) delete disc.alertat[k];
  delete disc.zile;
  // 7b. aprinderile turei intră la „ce a urmat” (toate, cu prețul și direcția lor; cele din mișcarea pieței poartă semnul și nu votează)
  for (const e of notate) {
    const dir = A.directia(e.net, e.amp), caz = { s: e.s, la: e.la, zi, r: regula, pret: e.pret, net: e.net, amp: e.amp, ori: e.ori, dir };
    if (e.piata) { caz.piata = true; J.ap++; } else { J.a++; if (dir) J.cd++; else J.fd++; }
    if (trimise.includes(e.s)) caz.msg = true;
    disc.urmari.push(caz);
  }
  if (disc.urmari.length > URMARI_MAX) disc.urmari = disc.urmari.slice(-URMARI_MAX);
  // 7c. jurnalul nu crește la nesfârșit; verdictul „ce a urmat” = o singură judecată pe orizont, înghețată (o regulă nouă nu-l moștenește)
  const hotar = ziRo(acum - JURNAL_ZILE * ZI); for (const k of Object.keys(disc.jurnal)) if (k < hotar) delete disc.jurnal[k];
  const zileDe = () => Object.keys(disc.jurnal).sort().map((k) => Object.assign({}, disc.jurnal[k], { zi: k }));
  if (!disc.verdict || typeof disc.verdict !== "object" || Array.isArray(disc.verdict) || disc.verdict.r !== regula) disc.verdict = { r: regula };
  // se judecă doar zilele ÎNCHEIATE (fără cea de azi) și doar când niciun caz al lor nu-și mai așteaptă rezultatul pe orizontul acela (revizia 28.11:
  // altfel verdictul se îngheța pe ziua abia începută și pe rezultatele de la 4 ore încă nevenite)
  for (const [hk, kp, kx] of [["h1", "p1", "x1"], ["h4", "p4", "x4"]]) if (!disc.verdict[hk]) {
    if (disc.urmari.some((c) => !c.piata && (c.dir === 1 || c.dir === -1) && c.r === regula && c.zi < zi && !(kp in c) && !c[kx])) continue;
    const b = A.bilantUrmare(zileDe().filter((z) => z.zi < zi), hk, regula); if (b.gata) disc.verdict[hk] = Object.assign({ la: acum }, b);
  }
  const scrie = () => { if (typeof d.scrieDisc === "function") d.scrieDisc(disc); };
  scrie();
  // 8. ce vede pagina (rezumatele bilanțului sunt socotite aici, cu formulele paginii)
  const zileJ = zileDe().filter((z) => z.r === regula), suma = (k) => zileJ.reduce((a, z) => a + (z[k] > 0 ? z[k] : 0), 0);
  const bilant = { regula: A.APRINS.amp + "/" + A.APRINS.ori, azi: zi, deLa: zileJ.length ? zileJ[0].zi : zi, zile: zileJ.slice(-8).map((z) => ({ zi: z.zi, ms: z.ms || 0, n: (z.m || 0) + (z.p || 0) })),
    mesaje: A.bilantMesaje(zileJ, zi, regula), cazuri: { singure: suma("a"), cuDirectie: suma("cd"), faraDirectie: suma("fd"), dePiata: suma("ap"), ratate: suma("x") },
    h1: A.bilantUrmare(zileJ, "h1", regula), h4: A.bilantUrmare(zileJ, "h4", regula), verdict: { h1: disc.verdict.h1 || null, h4: disc.verdict.h4 || null }, binance: A.bilantBinance(zileDe(), zi) };
  const corp = { la: acum, n: u.monede.length, masurate: rand.filter((r) => r.x.masurat).length, prag: { amp: A.APRINS.amp, ori: A.APRINS.ori }, mesaje24: disc.mesaje.length, aprinse: disc.aprinse, bilant };
  try { await d.trimite("/api/istoric-bot?action=agitate", corp); } catch (e) { return esec("serverul a refuzat (" + String(e && e.message || e).slice(0, 80) + ")"); }
  st.esecuri = 0;
  // 9. „peste Binance” (I-978), cel mult o dată la 15 minute - ULTIMUL pas: mesajele au plecat, starea lor e pe disc, pagina are rezumatul. Cererea
  // are limită de timp (revizia 28.11): unealta comună spre Binance își poate aștepta pauzele minute întregi, iar tura următoare n-ar mai porni.
  if (typeof d.binance === "function" && acum - (st.binanceLa || 0) >= BINANCE_MS) {
    st.binanceLa = acum;
    try {
      const cerere = Promise.resolve().then(() => d.binance(FAPI + "/fapi/v1/ticker/24hr")); cerere.catch(() => {});   /* un răspuns întârziat nu rămâne necules */
      const limita = (typeof d.asteapta === "function" ? d.asteapta(BINANCE_LIMITA_MS) : new Promise((gata) => { const ceas = setTimeout(gata, BINANCE_LIMITA_MS); if (ceas && ceas.unref) ceas.unref(); })).then(() => { throw new Error("Binance prea lent"); });
      limita.catch(() => {});
      const harta = A.dinBinance(await Promise.race([cerere, limita]), acum);
      if (Object.keys(harta).length >= 50) {
        J.bc = (J.bc || 0) + 1; if (!Array.isArray(J.bp)) J.bp = [];
        for (const m of u.monede) { const f = A.fataDeBinance(m.amp24, harta[m.simbol]); if (f && f.peste && !J.bp.includes(m.simbol) && J.bp.length < PESTE_MAX) J.bp.push(m.simbol); }
        scrie();
      }
    } catch { /* Binance n-a răspuns la timp: citirea nu se numără, tura s-a încheiat oricum */ }
  }
  return { facut: true, n: corp.n, masurate: corp.masurate, cerute: cerute + confirmari, noi: trimise, notate: notate.map((e) => e.s), piata };
}
