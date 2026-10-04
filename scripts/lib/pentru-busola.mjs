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
const cheiaDeschis = (Busola, b) => Busola.simbolBusola(typeof b.simbolPionex === "string" && b.simbolPionex ? b.simbolPionex : String(b.baza || "").replace(/\.PERP$/i, ""));

export function alcatuieste({ la, versiune, deschisi, inchisi, acum, Busola, cheia }) {
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
  return { la: Number(la) || t, versiune: String(versiune || ""), retea: [], boti: [...out.values()].sort((a, b) => b.pornit - a.pornit) };
}
