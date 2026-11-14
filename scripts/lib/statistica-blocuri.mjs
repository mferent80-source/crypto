// Dovada pe BLOCURI de zile (M5, amendamentul din 14.11.2026 din docs/cercetare/2026-11-13-tablou-acuratete.md): zilele se grupează în blocuri
// de 5 zile calendaristice la rând, statistica se socotește pe fiecare bloc, iar testul e Student într-o singură parte pe valorile blocurilor.
// A înlocuit bootstrapul pe blocuri cu percentile, care pe 12–21 de blocuri respingea de vreo zece ori prea des la pragul corectat.
// Fără nicio dependență: funcția de repartiție Student vine din funcția beta incompletă (fracție continuă).

function lnGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += g[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betaFractie(a, b, x) {
  const MIC = 1e-300; let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < MIC) d = MIC; d = 1 / d; let h = d;
  for (let m = 1; m <= 400; m++) {
    const m2 = 2 * m; let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < MIC) d = MIC; c = 1 + aa / c; if (Math.abs(c) < MIC) c = MIC; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < MIC) d = MIC; c = 1 + aa / c; if (Math.abs(c) < MIC) c = MIC; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}
// funcția beta incompletă regularizată I_x(a, b)
export function betaIncompleta(a, b, x) {
  if (!(x > 0)) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betaFractie(a, b, x) / a : 1 - bt * betaFractie(b, a, 1 - x) / b;
}
// P(T ≥ t) pentru Student cu df grade de libertate (coada de sus)
export function pStudentSus(t, df) {
  if (!(df > 0) || !Number.isFinite(t)) return NaN;
  const p = 0.5 * betaIncompleta(df / 2, 0.5, df / (df + t * t));
  return t >= 0 ? p : 1 - p;
}
// testul într-o singură parte „media blocurilor > 0”: { n, medie, sd, t, p }; sub 5 blocuri nu se judecă (p = NaN)
export function testBlocuri(valori) {
  const v = (Array.isArray(valori) ? valori : []).filter((x) => Number.isFinite(x)), n = v.length;
  if (n < 5) return { n, medie: n ? v.reduce((a, x) => a + x, 0) / n : NaN, sd: NaN, t: NaN, p: NaN };
  const medie = v.reduce((a, x) => a + x, 0) / n, sd = Math.sqrt(v.reduce((a, x) => a + (x - medie) * (x - medie), 0) / (n - 1));
  if (!(sd > 0)) return { n, medie, sd, t: medie > 0 ? Infinity : medie < 0 ? -Infinity : 0, p: medie > 0 ? 0 : 1 };
  const t = medie / (sd / Math.sqrt(n));
  return { n, medie, sd, t, p: pStudentSus(t, n - 1) };
}
// zilele (cheia = ziua ISO, valoarea = { clasă: { n, s } }) adunate în blocuri de `zilePeBloc` zile calendaristice la rând, de la prima zi
export function blocuriDinZile(zile, zilePeBloc = 5) {
  const chei = Object.keys(zile).sort(); if (!chei.length) return [];
  const nrZi = (z) => Math.round(Date.parse(z + "T00:00:00Z") / 86400000), z0 = nrZi(chei[0]), pe = new Map();
  for (const z of chei) { const b = Math.floor((nrZi(z) - z0) / zilePeBloc); let o = pe.get(b); if (!o) pe.set(b, (o = {}));
    for (const [K, x] of Object.entries(zile[z])) { const q = o[K] || (o[K] = { n: 0, s: 0 }); q.n += x.n; q.s += x.s; } }
  return [...pe.keys()].sort((a, c) => a - c).map((b) => pe.get(b));
}
// valorile pe blocuri ale unei statistici între două clase: fel = "diferenta" (media A − media B) sau "logRaport" (ln(media A ÷ media B));
// blocul în care o clasă are sub `minClasa` eșantioane se sare
export function valoriPeBlocuri(blocuri, clasaA, clasaB, fel, minClasa = 20) {
  const o = [];
  for (const b of blocuri) { const a = b[clasaA], c = b[clasaB]; if (!a || !c || a.n < minClasa || c.n < minClasa) continue; const ma = a.s / a.n, mc = c.s / c.n;
    if (fel === "logRaport") { if (ma > 0 && mc > 0) o.push(Math.log(ma / mc)); } else o.push(ma - mc); }
  return o;
}
