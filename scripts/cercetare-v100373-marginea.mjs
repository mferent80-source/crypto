// PROBA cifrelor din capul Tabloului (v100.373): „atinge marginea în 1 h / 4 h / 24 h” - pe date NEVĂZUTE (mers înainte), înainte de livrare.
//
// IPOTEZA (scrisă înainte de a vedea vreun rezultat, 20.11.2026): frecvența din Probabilitati.pentruBot, socotită DOAR pe barele de până
// la clipa t, spune cât de des e atins un nivel aflat la x% de preț în următoarele 1 / 4 / 24 de ore.
// PRAGUL de „se poate arăta ca cifră”: pe fiecare orizont, (a) Brier sub cel al ratei de bază constante (aceeași cifră pentru toți),
//   (b) în fiecare cutie cu cel puțin 30 de cazuri, |cifra zisă − cât s-a întâmplat| ≤ 10 puncte, (c) cutiile urcă (mai mare zis ⇒ mai des atins).
//   Dacă (b) pică la un orizont, cifra aceea se arată doar cu „necalibrat” sau deloc. O singură rulare, o singură definiție; nimic ales după.
// Fără privire în viitor: pentruBot primește barele [0..i] și acum = t_i + 1 h; rezultatul se citește din barele i+1 … i+H.
// Clipele sunt la 48 de ore una de alta (ferestre de 24 h care nu se suprapun); distanțele x se rotesc (1%, 1,5%, 2,5%, 4%), jos și sus.
// Date: barele de 1 h ale colectorului (ruta istoric-bot?action=ore, DOAR citire). Monedele: cele date în linia de comandă.
//   node scripts/cercetare-v100373-marginea.mjs HYPE_USDT_PERP SOL_USDT_PERP XLM_USDT_PERP XMR_USDT_PERP DOGE_USDT_PERP [--server=http://127.0.0.1:8788]
// Rezultatul din 20.11.2026 (2.010 cifre, toate trei orizonturile trec): docs/cercetare/2026-11-20-v100373-tabloul-margine.md
import fs from "node:fs"; import vm from "node:vm"; import path from "node:path"; import { fileURLToPath } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), ORA = 3600000;
const V = (process.argv.find((x) => x.startsWith("--server=")) || "--server=https://mau.tail9144fe.ts.net:8443").slice(9);
const TOKEN = fs.readFileSync(path.join(RAD, ".dev.vars"), "utf8").split(/\r?\n/).find((l) => l.startsWith("APP_API_TOKEN=")).slice(14).replace(/"/g, "").trim();
const c = vm.createContext({ console, Math, Date, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt, Intl }); c.globalThis = c; c.window = c;
for (const f of ["text-ro.js", "grid-calcul.js", "probabilitati.js"]) vm.runInContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), c, { filename: f });
const PB = c.Probabilitati, SIMB = process.argv.slice(2).filter((x) => !x.startsWith("--")), X = [0.01, 0.015, 0.025, 0.04], H = [1, 4, 24], R = [];
const out = (t) => console.log(t);
for (const sim of SIMB) {
  let bare = [];
  try { const r = await (await fetch(V + "/api/istoric-bot?action=ore&simbol=" + encodeURIComponent(sim), { headers: { authorization: "Bearer " + TOKEN }, signal: AbortSignal.timeout(30000) })).json(); bare = ((r && r.ore && r.ore.b) || []).map((x) => ({ t: x[0], o: x[1], h: x[2], l: x[3], c: x[4] })); } catch (e) { out(sim + ": n-am putut citi (" + e.message + ")"); continue; }
  if (bare.length < 1500) { out(sim + ": doar " + bare.length + " bare - sărit"); continue; }
  let n = 0, k = 0;
  for (let i = 1200; i + 25 < bare.length; i += 48, k++) {
    const x = X[k % X.length], p = bare[i].c, rez = PB.pentruBot(bare.slice(0, i + 1), { acum: bare[i].t + ORA, pret: p, dir: "long", jos: p * (1 - x), sus: p * (1 + x) });
    if (!rez) continue;
    for (const h of H) for (const parte of ["jos", "sus"]) {
      const f = rez.iese[parte + h]; if (!f) continue;
      const fer = bare.slice(i + 1, i + 1 + h); if (fer.length < h || fer[fer.length - 1].t !== bare[i].t + h * ORA) continue;
      const y = parte === "jos" ? fer.some((b) => b.l <= p * (1 - x)) : fer.some((b) => b.h >= p * (1 + x));
      R.push({ sim, t: bare[i].t, h, parte, x, p: f.p, nIndep: f.nIndep, nivel: f.nivel, y: y ? 1 : 0 }); n++;
    }
  }
  out(sim + ": " + bare.length + " bare · " + n + " cifre judecate");
}
const z1 = (v) => (Math.round(v * 1000) / 10).toFixed(1).replace(".", ","), CUT = [0, 0.1, 0.25, 0.5, 0.75, 1.0001];
for (const h of H) {
  const L = R.filter((r) => r.h === h); if (!L.length) continue;
  const baza = L.reduce((s, r) => s + r.y, 0) / L.length, brier = L.reduce((s, r) => s + (r.p - r.y) ** 2, 0) / L.length, brierB = L.reduce((s, r) => s + (baza - r.y) ** 2, 0) / L.length;
  out("\n=== " + h + " h · " + L.length + " cifre · atins în " + z1(baza) + "% · Brier " + (brier * 100).toFixed(1).replace(".", ",") + " față de " + (brierB * 100).toFixed(1).replace(".", ",") + " al ratei de bază ⇒ (a) " + (brier < brierB ? "TRECE" : "PICĂ"));
  let okB = true, urca = true, ant = -1;
  for (let j = 0; j + 1 < CUT.length; j++) {
    const q = L.filter((r) => r.p >= CUT[j] && r.p < CUT[j + 1]); if (!q.length) continue;
    const pm = q.reduce((s, r) => s + r.p, 0) / q.length, rata = q.reduce((s, r) => s + r.y, 0) / q.length, zile = new Set(q.map((r) => Math.floor(r.t / 864e5))).size, dif = Math.abs(pm - rata);
    if (q.length >= 30 && dif > 0.10) okB = false; if (q.length >= 30) { if (rata < ant - 0.02) urca = false; ant = rata; }
    out("   zis " + z1(CUT[j]) + "–" + z1(Math.min(1, CUT[j + 1])) + "%: " + String(q.length).padStart(4) + " cazuri pe " + String(zile).padStart(3) + " zile · zis în medie " + z1(pm).padStart(5) + "% · atins " + z1(rata).padStart(5) + "% · abatere " + z1(dif).padStart(4) + " puncte" + (q.length < 30 ? " (sub 30: nu se judecă)" : dif > 0.10 ? "  ← PESTE PRAG" : ""));
  }
  out("   (b) " + (okB ? "TRECE" : "PICĂ") + " · (c) " + (urca ? "TRECE" : "PICĂ"));
  for (const parte of ["jos", "sus"]) { const q = L.filter((r) => r.parte === parte); if (q.length) out("   " + parte + ": zis " + z1(q.reduce((s, r) => s + r.p, 0) / q.length) + "% · atins " + z1(q.reduce((s, r) => s + r.y, 0) / q.length) + "% (" + q.length + ")"); }
}
out("\nGATA " + new Date().toLocaleTimeString("ro-RO"));
