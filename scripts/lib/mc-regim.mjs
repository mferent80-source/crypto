// v101.92 (I-579, revizia Opus): partea PURĂ a validării „Monte Carlo pe regimul Busolei” - probată în proba-v100149.mjs.
// pCastig(r) = șansa de câștig la primul orizont din rezultatul lui GridSim.simuleaza (orizonturi[0].pCastig; lipsă ⇒ null).
// verdictRegim(taieturi) = scorul Brier al bazei și al regimului pe tăieturile walk-forward + bootstrap pe BLOCURI (moneda × săptămâna:
// tăieturile la 12 h cu ferestre de 7 zile se suprapun, deci 30 de tăieturi sunt ~4 cazuri independente) ⇒ „trece” DOAR când intervalul de
// încredere 95% al diferenței (regim − bază) e sub zero. Generatorul: mulberry32 (regula din memorie), sămânță fixă.
export function pCastig(r) { const o = r && Array.isArray(r.orizonturi) ? r.orizonturi[0] : null; const p = o ? Number(o.pCastig) : NaN; return Number.isFinite(p) && p >= 0 && p <= 1 ? p : null; }

export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const brier = (l, k) => (l.length ? l.reduce((a, x) => a + (x[k] - x.y) ** 2, 0) / l.length : NaN);
const SAPT = 7 * 86400000;

export function verdictRegim(taieturi, o = {}) {
  const MIN = o.min > 0 ? o.min : 30, REP = o.rep > 0 ? o.rep : 500, seed = o.seed > 0 ? o.seed : 4242;
  const l = (Array.isArray(taieturi) ? taieturi : []).filter((x) => x && typeof x.pB === "number" && typeof x.pR === "number" && (x.y === 0 || x.y === 1));
  const n = l.length, bB = brier(l, "pB"), bR = brier(l, "pR");
  if (n < MIN) return { n, brierBaza: +bB.toFixed(4) || 0, brierRegim: +bR.toFixed(4) || 0, dif: n ? +(bR - bB).toFixed(4) : 0, icJos: null, icSus: null, blocuri: 0, trece: false, motiv: `prea puține tăieturi (${n}, trebuie ${MIN})` };
  // blocurile: moneda × săptămâna tăieturii - se trag întregi, cu înlocuire
  const chei = new Map();
  for (const x of l) { const k = String(x.s) + "|" + Math.floor(Number(x.t0) / SAPT); if (!chei.has(k)) chei.set(k, []); chei.get(k).push(x); }
  const blocuri = [...chei.values()], rnd = mulberry32(seed), dif = [];
  for (let r = 0; r < REP; r++) {
    const e = []; for (let i = 0; i < blocuri.length; i++) e.push(...blocuri[Math.floor(rnd() * blocuri.length)]);
    dif.push(brier(e, "pR") - brier(e, "pB"));
  }
  dif.sort((a, b) => a - b);
  const icJos = dif[Math.floor(REP * 0.025)], icSus = dif[Math.min(REP - 1, Math.floor(REP * 0.975))];
  const trece = blocuri.length >= 8 && icSus < 0;
  return { n, brierBaza: +bB.toFixed(4), brierRegim: +bR.toFixed(4), dif: +(bR - bB).toFixed(4), icJos: +icJos.toFixed(4), icSus: +icSus.toFixed(4), blocuri: blocuri.length, trece,
    motiv: blocuri.length < 8 ? `prea puține blocuri independente (${blocuri.length} monedă×săptămână, trebuie 8)` : trece ? "regimul bate baza (IC 95% al diferenței Brier sub zero)" : "regimul nu bate baza (IC-ul diferenței Brier atinge zero)" };
}
