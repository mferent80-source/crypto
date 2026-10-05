// v101.69 (05.10, el: „fă 5”): LUMÂNĂRILE DE 1 H PENTRU ARHIVA BOȚILOR. Barele de 1 h (data/istoric-1h, tura profilului) există doar pentru
// monedele boților din ultimele 60 de zile și doar 6 luni înapoi - măsurătorile pe arhivă (I-530 ADX la pornire, I-469 situațiile asemănătoare)
// prindeau 528 din 2.214 boți. Aici: pentru FIECARE monedă din arhivă, de la cel mai vechi bot (− 3 zile, cât îi trebuie lui ADX / stării să se
// încălzească) până unde încep barele de acum - în fișiere SEPARATE (data/istoric-1h-arhiva), ca profilul monedei să rămână pe 6 luni.
// Noaptea, cu buget de cereri (serverul lasă 120 de citiri pe minut și le împarte cu restul turelor), reluat noaptea următoare de unde a rămas.
// Pionex dă bare de 1 h până în noiembrie 2025 (măsurat 05.10); arhiva începe pe 21.12.2025. Probat în scripts/proba-v10169.mjs.
export const PAS_MS = 1600, PAGINA = 500, ORA = 3600000, INCALZIRE = 72 * ORA, MAX_BARE = 20000;
const ZI = 24 * ORA;
// „1 bară”, „500 de bare” (TextRo.cate; rezerva știe aceeași regulă - ca în tura-profil.mjs)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const tBara = (r) => Number(Array.isArray(r) ? r[0] : r && r.time);

// trades = JurnalTrade.din(arhiva) ({ moneda, pornit }); primaBaraAcum(moneda) = prima bară din istoric-1h (null dacă nu e)
// ⇒ [{ moneda, deLa, panaLa, boti }], monedele cu mulți boți primele (ajută cele mai multe cazuri)
export function planArhiva(trades, primaBaraAcum) {
  const pe = new Map();
  for (const t of Array.isArray(trades) ? trades : []) {
    const m = t && t.moneda, p = Number(t && t.pornit); if (!m || !(p > 0)) continue;
    const x = pe.get(m) || { moneda: m, min: p, max: p, boti: 0 };
    x.min = Math.min(x.min, p); x.max = Math.max(x.max, p); x.boti++; pe.set(m, x);
  }
  const out = [];
  for (const x of pe.values()) {
    const prima = typeof primaBaraAcum === "function" ? primaBaraAcum(x.moneda) : null, deLa = x.min - INCALZIRE;
    const panaLa = prima != null && prima < x.max + ORA ? prima : x.max + ORA;   // fără gaură și fără dublură cu barele de acum
    if (panaLa <= deLa) continue;   // barele de acum acoperă deja tot ce trebuie
    out.push({ moneda: x.moneda, deLa, panaLa, boti: x.boti });
  }
  return out.sort((a, b) => b.boti - a.boti || (a.moneda < b.moneda ? -1 : 1));
}

// d = { acum, plan? | trades() + primaBaraAcum, simbolPentru(moneda), citeste(moneda), scrie(moneda, randuri), cere, pauza, jurnal,
//       stare, scrieStare, buget?, GridCalcul } ⇒ { cereri }
export async function turaArhivaOre(d) {
  const st = d.stare; st.gata = st.gata || {}; st.esuat = st.esuat || {}; st.inceput = st.inceput || {};
  const buget = d.buget > 0 ? d.buget : 400, plan = d.plan || planArhiva(await d.trades(), d.primaBaraAcum);
  let cereri = 0, facute = 0;
  for (const x of plan) {
    if (cereri >= buget) break;
    const e = st.esuat[x.moneda];
    if (e && d.acum - e.la < Math.min(ZI, 10 * 60000 * Math.pow(2, e.n))) continue;
    let rows = d.citeste(x.moneda) || [];
    const acoperire = () => { const t = rows.map(tBara).filter(Number.isFinite); return { min: t.length ? Math.min(...t) : null, max: t.length ? Math.max(...t) : null }; };
    let { min, max } = acoperire();
    // st.inceput = cea mai veche bară pe care o are bursa (moneda listată după plan) - citită proaspăt, se află pe parcurs
    const lipsaSus = () => max === null || max < x.panaLa - ORA;
    const lipsaJos = () => min === null || (min > x.deLa && !(st.inceput[x.moneda] != null && min <= st.inceput[x.moneda]));
    if (!lipsaSus() && !lipsaJos()) { st.gata[x.moneda] = true; continue; }
    delete st.gata[x.moneda];
    try {
      const simbol = await d.simbolPentru(x.moneda);
      const pagina = async (end) => {
        if (cereri >= buget) return null;
        if (cereri) await d.pauza(PAS_MS);
        cereri++;
        const k = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=60M&limit=" + PAGINA + "&endTime=" + Math.floor(end));
        const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
        if (!r) throw new Error((k && (k.code || k.error || k.message)) || "fără lumânări 60M");
        return r;
      };
      // înapoi de la `end` până la `tinta` (sau până unde bursa nu mai dă nimic mai vechi)
      const inapoi = async (end, tinta) => {
        for (;;) {
          const r = await pagina(end); if (r === null) return;
          if (!r.length) { if (min !== null) st.inceput[x.moneda] = min; return; }
          rows = d.GridCalcul.imbinaRanduri(rows, r, MAX_BARE); ({ min, max } = acoperire());
          const pm = Math.min(...r.map(tBara).filter(Number.isFinite));
          if (pm <= tinta) return;
          if (r.length < PAGINA) { st.inceput[x.moneda] = pm; return; }
          end = pm - 1;
        }
      };
      const maxVechi = max;
      if (lipsaSus()) await inapoi(x.panaLa, maxVechi !== null ? maxVechi : x.deLa);   // sus: până la ce aveam (sau, fără nimic, până la început)
      if (lipsaJos() && cereri < buget) await inapoi(min - 1, x.deLa);                  // jos: sub ce avem
      d.scrie(x.moneda, rows);
      ({ min, max } = acoperire());
      if (!lipsaSus() && !lipsaJos()) st.gata[x.moneda] = true;
      delete st.esuat[x.moneda];
      if (facute++ < 50) d.jurnal("arhiva 1h", x.moneda, cate(rows.length, "bară", "bare") + (st.gata[x.moneda] ? " · gata" : " · continuă"));
    } catch (err) {
      st.esuat[x.moneda] = { la: d.acum, n: Math.min(8, (e ? e.n : 0) + 1) };
      d.jurnal("arhiva 1h ESEC", x.moneda, err && err.message);
    }
    d.scrieStare(st);
  }
  return { cereri, gata: Object.keys(st.gata).length, plan: plan.length };
}
