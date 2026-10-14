// v101.92 (I-579, revizia Opus): partea PURĂ a validării „Monte Carlo pe regimul Busolei” - probată în proba-v100149.mjs.
// pCastig(r) = șansa de câștig la primul orizont din rezultatul lui GridSim.simuleaza (orizonturi[0].pCastig; lipsă ⇒ null).
// verdictRegim(taieturi) = scorul Brier al bazei și al regimului pe tăieturile walk-forward + bootstrap pe BLOCURI (moneda × săptămâna:
// tăieturile la 12 h cu ferestre de 7 zile se suprapun, deci 30 de tăieturi sunt ~4 cazuri independente) ⇒ „trece” DOAR când intervalul de
// încredere 95% al diferenței (regim − bază) e sub zero. Generatorul: mulberry32 (regula din memorie), sămânță fixă.
// v100.196 (auditul sever 14.10, 🔴3): blocurile monedă × săptămână NU sunt independente - monedele din aceeași săptămână au același deznodământ
// (piața) și aceeași stare a Busolei ⇒ „trece” fals în 16–23 % (promis 2,5 %). Acum: blocul = SĂPTĂMÂNA în care cade cea mai mare parte a
// ferestrei de 7 zile (t0 + 3,5 zile), cu TOATE monedele ei; în fiecare săptămână diferența Brier (regim − bază); „trece” = cel puțin 8 săptămâni,
// diferența medie sub zero, semnele întoarse pe săptămâni p ≤ 0,025 (o parte, exact până la 16 săptămâni) ȘI IC-ul bootstrap pe săptămâni sub zero.
export function pCastig(r) { const o = r && Array.isArray(r.orizonturi) ? r.orizonturi[0] : null; const p = o ? Number(o.pCastig) : NaN; return Number.isFinite(p) && p >= 0 && p <= 1 ? p : null; }

export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const brier = (l, k) => (l.length ? l.reduce((a, x) => a + (x[k] - x.y) ** 2, 0) / l.length : NaN);
const SAPT = 7 * 86400000, MIJLOC = 3.5 * 86400000, MIN_SAPT = 8;
// p o parte: cât de des media cu semnele întoarse e la fel de mică (≤) ca cea văzută; exact până la 16 săptămâni
function pSemneJos(d, rnd, reps) {
  const n = d.length, obs = d.reduce((a, x) => a + x, 0) / n + 1e-15; let sub = 0;
  if (n <= 16) { const tot = 1 << n; for (let k = 0; k < tot; k++) { let s = 0; for (let j = 0; j < n; j++) s += (k >> j) & 1 ? -d[j] : d[j]; if (s / n <= obs) sub++; } return sub / tot; }
  for (let k = 0; k < reps; k++) { let s = 0; for (let j = 0; j < n; j++) s += rnd() < 0.5 ? -d[j] : d[j]; if (s / n <= obs) sub++; }
  return (sub + 1) / (reps + 1);
}

export function verdictRegim(taieturi, o = {}) {
  const MIN = o.min > 0 ? o.min : 30, REP = o.rep > 0 ? o.rep : 500, seed = o.seed > 0 ? o.seed : 4242;
  const l = (Array.isArray(taieturi) ? taieturi : []).filter((x) => x && typeof x.pB === "number" && typeof x.pR === "number" && (x.y === 0 || x.y === 1));
  const n = l.length, bB = brier(l, "pB"), bR = brier(l, "pR");
  if (n < MIN) return { n, brierBaza: +bB.toFixed(4) || 0, brierRegim: +bR.toFixed(4) || 0, dif: n ? +(bR - bB).toFixed(4) : 0, icJos: null, icSus: null, blocuri: 0, p: null, trece: false, motiv: `prea puține tăieturi (${n}, trebuie ${MIN})` };
  // blocurile: SĂPTĂMÂNA ferestrei (toate monedele împreună) - se trag întregi, cu înlocuire
  const chei = new Map();
  for (const x of l) { const k = Math.floor((Number(x.t0) + MIJLOC) / SAPT); if (!chei.has(k)) chei.set(k, []); chei.get(k).push(x); }
  const blocuri = [...chei.values()], rnd = mulberry32(seed), dif = [];
  for (let r = 0; r < REP; r++) {
    const e = []; for (let i = 0; i < blocuri.length; i++) e.push(...blocuri[Math.floor(rnd() * blocuri.length)]);
    dif.push(brier(e, "pR") - brier(e, "pB"));
  }
  dif.sort((a, b) => a - b);
  const icJos = dif[Math.floor(REP * 0.025)], icSus = dif[Math.min(REP - 1, Math.floor(REP * 0.975))];
  const dS = blocuri.map((b) => brier(b, "pR") - brier(b, "pB")), dMed = dS.reduce((a, x) => a + x, 0) / dS.length;
  const p = blocuri.length >= MIN_SAPT ? pSemneJos(dS, mulberry32(seed + 7919), Math.max(REP, 2000)) : null;
  const trece = blocuri.length >= MIN_SAPT && dMed < 0 && p <= 0.025 && icSus < 0;
  return { n, brierBaza: +bB.toFixed(4), brierRegim: +bR.toFixed(4), dif: +(bR - bB).toFixed(4), icJos: +icJos.toFixed(4), icSus: +icSus.toFixed(4), blocuri: blocuri.length, p: p === null ? null : +p.toFixed(4), trece,
    motiv: blocuri.length < MIN_SAPT ? `prea puține săptămâni independente (${blocuri.length}, trebuie ${MIN_SAPT}: monedele din aceeași săptămână trec prin aceeași piață, deci se judecă împreună)`
      : trece ? `regimul bate baza (pe ${blocuri.length} săptămâni: semnele întoarse p = ${p.toFixed(3)} ≤ 0,025, IC 95% al diferenței Brier sub zero)` : `regimul nu bate baza (pe ${blocuri.length} săptămâni: p = ${p.toFixed(3)}, IC-ul diferenței Brier [${icJos.toFixed(4)}; ${icSus.toFixed(4)}])` };
}
