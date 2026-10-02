// barele de 1 h ale probelor rețelei: mers aleator cu sămânță (o.p0, o.vol, o.t0, o.seed) - forma GridCalcul.bare ({t, o, h, l, c})
const ORA = 3600000;
export function bare(n, o = {}) {
  let s = o.seed || 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = []; let c = o.p0 || 100; const t0 = o.t0 || Date.UTC(2025, 8, 1);
  for (let i = 0; i < n; i++) { const o1 = c; c = o1 * (1 + (rnd() - 0.5) * 2 * (o.vol || 0.01)); out.push({ t: t0 + i * ORA, o: o1, h: Math.max(o1, c) * (1 + rnd() * 0.003), l: Math.min(o1, c) * (1 - rnd() * 0.003), c }); }
  return out;
}
