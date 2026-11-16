// v101.184 (Radar v100.346, 16.11.2026): seria scurtă pentru mini-graficul de pe rândurile Sugestiilor (ca pe Trading 212) - închiderile valide,
// din `pas` în `pas` bare de la capăt (bare de 4 h cu pas 6 = o închidere pe zi), cel mult `n` (30), cu 4 cifre semnificative (decor: cifrele
// adevărate sunt pe rând). Sub 2 puncte ⇒ [] (nu se desenează nimic).
export function spark(bare, o) {
  const pas = Math.max(1, Math.floor((o && o.pas) || 1)), n = (o && o.n) || 30;
  const c = (Array.isArray(bare) ? bare : []).map((b) => Number(b && b.c)).filter((v) => Number.isFinite(v) && v > 0), out = [];
  for (let i = c.length - 1; i >= 0 && out.length < n; i -= pas) out.push(Number(c[i].toPrecision(4)));
  return out.length >= 2 ? out.reverse() : [];
}
