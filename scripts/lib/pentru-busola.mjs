// v101.60 (I-515 + I-498, specul colaborării 2 §5, aprobat de el 04.10): ce trimite Radarul Busolei - un fișier LOCAL
// (data/pentru-busola.json), scris atomic de colector la fiecare tură și doar citit de Busola (nimic publicat: rezultatele boților
// sunt datele lui). `boti` = deschiși + închișii din ultimele 90 de zile (bilanțul pe stări cere istorie), cu `pnlPct` la închidere
// = NETUL (după comisioane și funding, ca toată judecata din v100.40) / banii puși, `id` stabil (strategyId), ms UTC;
// `simbol` = cheia din rezumat (fără USDT, fără „1000”, fără .PERP) - din TICKERUL Pionex (LIGHTER.PERP ⇒ LIT_USDT_PERP ⇒ LIT):
// deschișii îl au în `simbolPionex`, închișii prin `cheia(moneda)` (lista Pionex din colector). `retea` vine în livrarea a doua
// (inferența rețelei e pe pagină) - până atunci goală, ca Busola să citească fișierul de pe acum. Modul pur, probat în proba-v10090.mjs.
const ZI = 86400000, ZILE = 90;
const DIR = { long: "long", short: "short" };
// lipsa rămâne LIPSĂ: Number(null) === 0 ar inventa un levier 0
const nr = (v) => { if (v === null || v === undefined || v === "" || typeof v === "boolean") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const dir = (v) => DIR[String(v || "").toLowerCase()] || "neutru";
export const cheiaDeschis = (Busola, b) => Busola.simbolBusola(typeof b.simbolPionex === "string" && b.simbolPionex ? b.simbolPionex : String(b.baza || "").replace(/\.PERP$/i, ""));

// revizia 04.10 (🟡2): predicatul Busolei (busola/src/motor/dinRadar.ts, citesteDinRadar) - ce nu trece aici n-ar trece nici acolo; prob cu 3 zecimale
const intrareValida = (r) => {
  if (!r || typeof r !== "object") return null;
  const simbol = typeof r.simbol === "string" ? r.simbol.trim() : "", tinta = typeof r.tinta === "string" ? r.tinta.trim() : "", nivel = nr(r.nivel), prob = nr(r.prob), la = nr(r.la), orizontH = nr(r.orizontH);
  if (!simbol || !tinta || (r.sens !== "sus" && r.sens !== "jos") || !(nivel > 0) || prob === null || prob < 0 || prob > 1 || la === null || !(orizontH > 0)) return null;
  return { simbol, tinta, sens: r.sens, nivel, prob: Math.round(prob * 1000) / 1000, la, orizontH, dovedita: r.dovedita === true };
};
// A3 (revizia 04.10, 🔴1): intrările rețelei pentru un bot deschis, din cifrele turei 🎲 (rt.p): marginea de jos și de sus a gridului în 24 h
// (tinta atinge-24, sens jos/sus, nivelul = marginea); fără nivel sau fără cifră ⇒ nimic (lipsa rămâne lipsă). Pură: probată în proba-v10093 (R1)
export function intrariRetea({ Busola, b, rt, dovedita, acum }) {
  const p = rt && rt.p && typeof rt.p === "object" ? rt.p : null; if (!b || !p) return [];
  const simbol = cheiaDeschis(Busola, b), la = Number(acum) || Date.now(), out = [];
  for (const [cod, sens, nivel] of [["iese-jos-24", "jos", nr(b.gridJos)], ["iese-sus-24", "sus", nr(b.gridSus)]]) {
    const x = intrareValida({ simbol, tinta: "atinge-24", sens, nivel, prob: p[cod], la, orizontH: 24, dovedita }); if (x) out.push(x);
  }
  return out;
}

export function alcatuieste({ la, versiune, deschisi, inchisi, acum, Busola, cheia, retea }) {
  const t = Number(acum) || Date.now(), de = t - ZILE * ZI, out = new Map();
  for (const b of Array.isArray(deschisi) ? deschisi : []) {
    const id = b && b.id != null ? String(b.id) : "", pornit = nr(b && b.pornitLa); if (!id || !(pornit > 0)) continue;
    out.set(id, { id, simbol: cheiaDeschis(Busola, b), directie: dir(b.directie), levier: nr(b.levier), pornit, inchis: null, pnlPct: null });
  }
  for (const x of Array.isArray(inchisi) ? inchisi : []) {
    const id = x && x.id != null ? String(x.id) : "", pornit = nr(x && x.pornit), inchis = nr(x && x.inchis); if (!id || !(pornit > 0) || !(inchis >= de)) continue;
    const pus = nr(x.pus) > 0 ? nr(x.pus) : nr(x.investit) > 0 ? nr(x.investit) : null, net = nr(x.net);
    out.set(id, { id, simbol: Busola.simbolBusola(typeof cheia === "function" ? cheia(x.moneda) : x.moneda), directie: dir(x.dir), levier: nr(x.levier), pornit, inchis,
      pnlPct: pus && net !== null ? Math.round(net / pus * 10000) / 100 : null });
  }
  // livrarea 2 a contractului (A3, v101.63; revizia 04.10 🟡2): ultimele cifre ale rețelei pe monedele cu bot deschis, în FORMA §5 pe care Busola
  // o citește deja (citesteDinRadar): { simbol, tinta, sens, nivel, prob, la, orizontH, dovedita } - un rând pe monedă și sens (cel mai nou);
  // intrările stricate se aruncă aici, cu același predicat ca în Busola
  const rt = new Map();
  for (const r of (Array.isArray(retea) ? retea : [])) { const x = intrareValida(r); if (!x) continue; const k = x.simbol + "|" + x.sens, v = rt.get(k); if (!v || x.la > v.la) rt.set(k, x); }
  return { la: Number(la) || t, versiune: String(versiune || ""), retea: [...rt.values()].sort((a, b) => a.simbol.localeCompare(b.simbol) || a.sens.localeCompare(b.sens)), boti: [...out.values()].sort((a, b) => b.pornit - a.pornit) };
}
