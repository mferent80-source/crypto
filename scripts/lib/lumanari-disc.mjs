// Lumânările Pionex ținute pe disc și aduse INCREMENTAL (colector v101.166, I-838 din auditul final 05.11.2026), ca istoricul Busolei 1.88
// (I-817): clasamentul (4h, 100 de monede) și scanul (1 zi, 100 de monede) cereau 500 / 400 de lumânări pe monedă la FIECARE oră - ~4.800 de
// cereri pe zi din ~10.000. Barele ÎNCHISE nu se mai schimbă: stau pe disc și se aduce doar COADA (barele lipsă + cea în curs), lipită peste
// ce e acolo; cât ultima bară închisă de pe disc e cea dinaintea ferestrei de acum, nu se cere nimic - bara în curs se ține în memorie și se
// închide la prețul de ACUM (tickerul, o cerere pe toată piața), cu maximul / minimul întinse până la el. Coada care nu ajunge la ce e pe disc
// (gaură) sau coada GOALĂ (pereche delistată / redenumită) ⇒ istoricul întreg, ca înainte. Fără prețul de acum ⇒ se cere coada (bara în curs
// nu se servește veche). Diferența față de aducerea întreagă: maximul / minimul barei în curs sunt cele văzute la citiri (nu cele de la
// Pionex dintre ele) - clasamentul și scanul folosesc din bara în curs doar închiderea, pe celelalte bare nimic nu se schimbă.
// Modul pur (discul, cererea și ceasul vin din afară); probat în scripts/proba-v100306-c2.mjs.
export const COADA_MAX_BARE = 450;   // o coadă de 500 acoperă cel mult atâtea bare lipsă (cu marjă), ca la Busola

const nr = (v) => { const x = Number(v); return Number.isFinite(x) ? x : null; };
const normal = (k) => { if (!k) return null; const t = nr(Array.isArray(k) ? k[0] : k.time); return t === null ? null : Array.isArray(k) ? { time: t, open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5] } : Object.assign({}, k, { time: t }); };
const ordonate = (l) => { const m = new Map(); for (const k of Array.isArray(l) ? l : []) { const x = normal(k); if (x) m.set(x.time, x); } return [...m.values()].sort((a, b) => a.time - b.time); };
// coada nouă lipită peste seria de pe disc (bara cu aceeași oră o înlocuiește). null = gaură / coadă goală / disc gol ⇒ istoricul întreg
export function lipesteCoada(vechi, coada, pas) {
  const v = ordonate(vechi), c = ordonate(coada);
  if (!v.length || !c.length) return null;
  if (c[0].time > v[v.length - 1].time + pas) return null;
  return ordonate(v.concat(c));
}
// o = { simbol, pas (ms), limitaIntreg, acum, pretAcum (prețul de acum din ticker, sau null), cereKlines(limit) ⇒ lumânări Pionex (orice ordine),
//       citeste(simbol) ⇒ { inchise } | null, scrie(simbol, { inchise, la }), memorie (obiect: bara în curs pe simbol) }
// ⇒ { klines (cele mai noi `limitaIntreg`, crescător, cu bara în curs la coadă), cereri, sursa: "disc" | "coada" | "intreg" }
export async function klinesIncrementale(o) {
  const pas = o.pas, acum = o.acum, fer = Math.floor(acum / pas) * pas, lim = o.limitaIntreg || 500, mem = o.memorie || {}, pret = nr(o.pretAcum);
  let disc = null; try { disc = o.citeste(o.simbol); } catch { disc = null; }
  let inchise = ordonate(disc && disc.inchise).filter((k) => k.time < fer), formare = mem[o.simbol] && mem[o.simbol].time === fer ? Object.assign({}, mem[o.simbol]) : null;
  let cereri = 0, sursa = "disc";
  const separa = (l) => { const t = ordonate(l); return { inch: t.filter((k) => k.time < fer), cur: t.find((k) => k.time === fer) || null }; };
  const laZi = inchise.length && inchise[inchise.length - 1].time === fer - pas;
  if (!(laZi && formare && pret !== null && pret > 0)) {
    let lipit = null;
    if (inchise.length && acum - inchise[inchise.length - 1].time < COADA_MAX_BARE * pas) {
      const lipsa = Math.ceil((fer - inchise[inchise.length - 1].time) / pas) + 2;
      cereri++; const s = separa(await o.cereKlines(Math.min(lim, Math.max(3, lipsa))));
      lipit = lipesteCoada(inchise, s.inch, pas);
      if (!s.inch.length && s.cur && laZi) lipit = inchise;   // doar bara în curs lipsea (din memorie), iar coada a adus-o
      if (lipit) { inchise = lipit; formare = s.cur; sursa = "coada"; }
    }
    if (!lipit) { cereri++; const s = separa(await o.cereKlines(lim)); inchise = s.inch; formare = s.cur; sursa = "intreg"; }
    inchise = inchise.slice(-(lim - 1));
    if (inchise.length) { try { o.scrie(o.simbol, { inchise, la: acum }); } catch {} }
  }
  if (formare && pret !== null && pret > 0) {
    const h = nr(formare.high), l = nr(formare.low);
    formare = Object.assign({}, formare, { close: pret, high: h === null ? pret : Math.max(h, pret), low: l === null ? pret : Math.min(l, pret) });
  }
  if (formare) mem[o.simbol] = formare; else delete mem[o.simbol];
  return { klines: inchise.concat(formare ? [formare] : []).slice(-lim), cereri, sursa };
}
