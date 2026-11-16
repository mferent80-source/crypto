// Urmărirea fișelor gridului (v101.187 / Radar v100.349, 16.11.2026; el: „Unic + avertisment + urmărire”, după auditul paginii „Grid: ce setez acum?”).
// Proba fișei e pe bare de 1 h (sau 15 min), iar simulatorul ei scoate un minus fals, mai mare cu cât piața e mai agitată (I-888) - deci verdictul
// PORNEȘTE / AȘTEAPTĂ / NU PORNI nu se poate judeca pe el însuși. Pagina notează fiecare fișă calculată (o dată pe monedă, zi și fereastră; ruta
// istoric-bot ?action=fisaNota): moneda, ora, cât o ții (H), direcția, verdictul, fereastra (jos, sus, grile, levier, stopul și ținta la margini) și
// ce a zis proba ei (pr, media pe zilele nevăzute, în fracție din marjă). Tura de aici judecă fiecare fișă ajunsă la capăt pe barele de 1 MINUT
// Binance ale zilelor ei (proba-grid.mjs: simGrid, cu ieșirea la stop / țintă, comision și funding), pe două drumuri prin bară (cel mai scurt =
// aproape de adevăr, puțin sub el; la sorți = marginea de sus), în fracție din marjă (× levier). Rezumatul pe verdict + registrul de ferestre
// (verdict-ferestre.mjs, zile întregi, fereastra de 3 zile) pentru PORNEȘTE și NU PORNI + cât a greșit proba față de 1 minut ⇒ ?action=fiseUrmarire.
// d = { acum, binance, cere, trimite, jurnal, registru }; st (pe disc) = { judecate: [], incercari: {}, la }
import { simGrid, bare1m, simbolBinance, FAPI, mulberry32 } from "./proba-grid.mjs";
import { registruFerestre, registruPe } from "./verdict-ferestre.mjs";

const ZI = 86400000, ORA = 3600000, PE_TURA = 15, L_REG = 3 * ZI;
// numărătorile din jurnal - „1 fișă”, „25 de fișe” (TextRo.cate; rezerva știe aceeași regulă, ca tura-sugestii)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const ziU = (t) => new Date(t).toISOString().slice(0, 10);
const med = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);

/** O fișă judecată pe barele de 1 minut ale zilelor ei. r / rSus = câștigul net în fracție din marjă (după comision și funding), × levier. */
export async function judecaFisa(n, d) {
  const t0 = n.t, t1 = t0 + n.H * ZI, sim = simbolBinance(n.simbol), baza = { id: n.id, t: n.t, nivel: n.nivel, cheie: n.cheie, simbol: n.simbol, H: n.H };
  try {
    const b = await bare1m(d.binance, sim, t0, t1);
    if (b.length < n.H * 1440 * 0.9) return { ...baza, r: null, motiv: "bare lipsă (" + b.length + ")" };
    const scara = b[0].o / n.pret; if (!(scara > 0.8 && scara < 1.25)) return { ...baza, r: null, motiv: "alt multiplu pe Binance" };
    const fr = await d.binance(FAPI + "/fapi/v1/fundingRate?symbol=" + encodeURIComponent(sim) + "&startTime=" + t0 + "&endTime=" + t1 + "&limit=1000");
    const funding = (Array.isArray(fr) ? fr : []).map((f) => ({ t: Number(f.fundingTime), r: Number(f.fundingRate) })).filter((f) => Number.isFinite(f.t) && Number.isFinite(f.r));
    const p = { jos: n.jos * scara, sus: n.sus * scara, n: n.grile, dir: n.dir }, iesiri = { jos: n.stopJos > 0 ? n.stopJos * scara : null, sus: n.stopSus > 0 ? n.stopSus * scara : null };
    const g = simGrid(p, b, { funding, drum: "scurt", iesiri }), gs = simGrid(p, b, { funding, iesiri, rnd: mulberry32(Math.floor(t0 / 60000) + String(n.simbol).length) });
    const L = n.levier > 0 ? n.levier : 1;
    return { ...baza, r: g ? g.r * L : null, rSus: gs ? gs.r * L : null, umpleri: g ? g.umpleri : null, oprit: (g && g.oprit) || null, pr: Number.isFinite(n.pr) ? n.pr : null };
  } catch (e) { return { ...baza, r: null, motiv: "eroare: " + String(e && e.message || e).slice(0, 60) }; }
}

export async function turaFise(d, st) {
  const acum = d.acum || Date.now();
  st.judecate = Array.isArray(st.judecate) ? st.judecate : []; st.incercari = st.incercari && typeof st.incercari === "object" ? st.incercari : {};
  const r = await d.cere("/api/istoric-bot?action=fise"), fise = (r && Array.isArray(r.fise) ? r.fise : []).filter((n) => n && n.id && n.t > 0 && n.H >= 1);
  const facute = new Set(st.judecate.map((x) => x.id));
  const dePe = fise.filter((n) => !facute.has(n.id) && n.t + n.H * ZI + ORA <= acum).sort((a, b) => a.t - b.t).slice(0, PE_TURA);
  let noi = 0;
  for (const n of dePe) {
    const j = await judecaFisa(n, d);
    // o eroare de rețea nu face fișa „nejudecată” pe veci: se reîncearcă la turele următoare, de cel mult 3 ori
    if (j.r == null && /^eroare:/.test(j.motiv || "") && (st.incercari[n.id] || 0) < 2) { st.incercari[n.id] = (st.incercari[n.id] || 0) + 1; continue; }
    delete st.incercari[n.id]; st.judecate.push(j); facute.add(n.id); noi++;
  }
  st.judecate = st.judecate.filter((x) => x.t > acum - 400 * ZI).slice(-3000);
  st.la = acum;
  if (noi && d.jurnal) d.jurnal("fișe: " + cate(noi, "fișă judecată", "fișe judecate") + " pe 1 minut (" + cate(st.judecate.length, "fișă", "fișe") + " în total)");
  // rezumatul pe verdict (doar cele cu rezultat)
  const rez = {};
  for (const nv of ["porneste", "asteapta", "nu", "fara-date"]) {
    const l = st.judecate.filter((x) => x.nivel === nv && Number.isFinite(x.r));
    if (!l.length && nv !== "porneste" && nv !== "nu") continue;
    rez[nv] = { n: l.length, medie: med(l.map((x) => x.r)), medieSus: med(l.filter((x) => Number.isFinite(x.rSus)).map((x) => x.rSus)), pePlus: l.length ? l.filter((x) => x.r > 0).length / l.length : null };
  }
  // registrele (zile întregi: o zi intră doar când toate fișele ei, pe verdictul ăla, sunt judecate) - PORNEȘTE și NU PORNI
  for (const [nv, cheie] of [["porneste", "fisePorn"], ["nu", "fiseNu"]]) {
    const peZi = new Map();
    for (const n of fise.filter((x) => x.nivel === nv)) { const z = ziU(n.t); if (!peZi.has(z)) peZi.set(z, { t: Date.parse(z + "T00:00:00Z"), r: [], toate: true }); if (!facute.has(n.id)) peZi.get(z).toate = false; }
    for (const j of st.judecate.filter((x) => x.nivel === nv && Number.isFinite(x.r))) { const z = peZi.get(ziU(j.t)); if (z) z.r.push(j.r); }
    const zile = [...peZi.values()].map((z) => (z.toate ? (z.r.length ? { t: z.t, e: med(z.r) } : null) : { t: z.t, gata: false })).filter(Boolean);
    const rg = registruPe(d, cheie), RF = registruFerestre(rg.registru || null, zile, L_REG);
    if (rg.laRegistru) rg.laRegistru(RF.reg);
    if (rez[nv]) rez[nv].vf = RF.vf;
  }
  // cât a greșit proba de pe pagină (bare de 1 h / 15 min) față de 1 minut: media (r − pr) pe fișele cu ambele
  const cuPr = st.judecate.filter((x) => Number.isFinite(x.r) && Number.isFinite(x.pr));
  const proba = { n: cuPr.length, dif: cuPr.length ? med(cuPr.map((x) => x.r - x.pr)) : null };
  const ult = st.judecate.slice(-40).map((x) => ({ simbol: x.simbol, t: x.t, H: x.H, nivel: x.nivel, cheie: x.cheie, r: x.r, rSus: x.rSus, oprit: x.oprit, motiv: x.motiv || null }));
  await d.trimite("/api/istoric-bot?action=fiseUrmarire", { la: acum, rezumat: rez, proba, judecate: ult, total: st.judecate.length, nejudecate: st.judecate.filter((x) => !Number.isFinite(x.r)).length });
  return { noi };
}
