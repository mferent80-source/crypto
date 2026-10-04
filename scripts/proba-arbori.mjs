// Proba arborilor (v100.93, specul 04.10): onestitatea algoritmului de gradient boosting pe date sintetice cu sămânță fixă - 6.000 de rânduri,
// 70/30 în ordinea timpului. Adevăr neliniar (XOR): arborii bat formula simplă; adevăr liniar: nu sunt mai răi decât ea; zgomot pur: nu bat
// constanta (oprirea timpurie nu lasă supra-antrenare); calibrarea pe 10 cutii; exportul rotunjit nu schimbă predicția. Fără biblioteci.
import assert from "node:assert/strict";
import { antreneazaArbori, preziceArbori, exportaArbori, HIPER_ARBORI } from "../retea/arbori.mjs";
import { logistica, cuSamanta, normalizare, matrice } from "../retea/verifica.mjs";

const N = 6000, K = 6, r = cuSamanta(42), gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const sig = (z) => 1 / (1 + Math.exp(-z));
function date(adevar) { const rows = []; for (let i = 0; i < N; i++) { const x = Array.from({ length: K }, gauss); const p = adevar(x); rows.push({ t: i, x, y: r() < p ? 1 : 0, p }); } return rows; }
const X = (rows) => Float32Array.from(rows.flatMap((q) => q.x)), Y = (rows) => Float32Array.from(rows, (q) => q.y);
const PR = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p)), ll = (rows, f) => rows.reduce((s, q) => s - (q.y ? Math.log(PR(f(q.x))) : Math.log(1 - PR(f(q.x)))), 0) / rows.length;
// formula simplă = regresia logistică la optim (Newton) pe aceleași rânduri, normalizate - pragul rețelei, pragul arborilor
function logisticaPe(tr) { const norm = normalizare(tr), st = logistica(matrice(tr, norm), Y(tr), K).straturi[0]; return (x) => { let a = st.b[0]; for (let j = 0; j < K; j++) a += ((x[j] - norm.m[j]) / (norm.s[j] || 1)) * st.W[j][0]; return sig(a); }; }
const model = (mod) => ({ baza: mod.baza, pas: mod.pas, semi: [mod.arbori] });
let ok = 0, pica = 0; const test = (n, f) => { try { f(); ok++; console.log("  ✓ " + n); } catch (e) { pica++; console.log("  ✗ " + n + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } };
console.log("Proba arborilor · onestitate pe date sintetice (hiperparametrii: " + JSON.stringify(HIPER_ARBORI) + ")");

for (const [nume, adevar, cond] of [
  ["neliniar (XOR): arborii bat formula simplă cu ≥ 0,15 log-loss", (x) => ((x[0] > 0) !== (x[1] > 0) ? 0.9 : 0.1), (a, l, c) => a <= l - 0.15],
  ["liniar: arborii nu-s mai răi decât formula cu peste 0,01", (x) => sig(1.2 * x[0] - 0.8 * x[1]), (a, l, c) => a <= l + 0.01],
  ["zgomot pur: arborii nu bat constanta cu peste 0,005 (oprirea timpurie ține)", () => 0.35, (a, l, c) => a <= c + 0.005]]) {
  test(nume, () => {
    const rows = date(adevar), n7 = Math.floor(N * 0.7), tr = rows.slice(0, n7), te = rows.slice(n7);
    const m = model(antreneazaArbori(X(tr), Y(tr), K, { seed: 1 }));
    const rata = tr.reduce((s, q) => s + q.y, 0) / tr.length, A = ll(te, (x) => preziceArbori(m, x)), L = ll(te, logisticaPe(tr)), C = ll(te, () => rata);
    assert.ok(cond(A, L, C), `arbori ${A.toFixed(4)} · formula ${L.toFixed(4)} · constanta ${C.toFixed(4)} · runde ${m.semi[0].length}`);
  });
}
// calibrarea se judecă față de probabilitatea ADEVĂRATĂ a cutiei (datele sunt sintetice, o avem), nu față de frecvența realizată: pe ~200 de
// cazuri zgomotul etichetelor e ±0,07, și chiar adevărul ar pica un prag de 0,05 (diagnosticul din 04.10: „adevăr 0,55 → real 0,49”)
test("calibrarea pe adevăr liniar: în fiecare din 10 cutii (≥ 30 de cazuri) media prezicerilor la ≤ 0,05 de probabilitatea adevărată medie", () => {
  const rows = date((x) => sig(1.2 * x[0] - 0.8 * x[1])), n7 = Math.floor(N * 0.7), tr = rows.slice(0, n7), te = rows.slice(n7), m = model(antreneazaArbori(X(tr), Y(tr), K, { seed: 1 }));
  const cutii = Array.from({ length: 10 }, () => [0, 0, 0, 0]); for (const q of te) { const p = preziceArbori(m, q.x), c = Math.min(9, Math.floor(p * 10)); cutii[c][0] += p; cutii[c][1] += q.y; cutii[c][2]++; cutii[c][3] += q.p; }
  for (const [sp, sy, n, sa] of cutii) if (n >= 30) assert.ok(Math.abs(sp / n - sa / n) <= 0.05, `cutie: prezis ${(sp / n).toFixed(3)} adevăr ${(sa / n).toFixed(3)} real ${(sy / n).toFixed(3)} (${n} cazuri)`);
});
test("exportul rotunjește pragurile și frunzele la 6 cifre: media |diferenței| ≤ 0,0005 și percentila 99 ≤ 0,002 pe 500 de rânduri; JSON-ul e cu ≥ 10% mai mic", () => {
  const rows = date((x) => sig(x[0] * x[1])), m1 = model(antreneazaArbori(X(rows), Y(rows), K, { seed: 3 })), m2 = exportaArbori(m1);
  const d = rows.slice(0, 500).map((q) => Math.abs(preziceArbori(m1, q.x) - preziceArbori(m2, q.x))).sort((a, b) => a - b), medie = d.reduce((s, v) => s + v, 0) / d.length, p99 = d[Math.floor(0.99 * d.length)];
  assert.ok(medie <= 0.0005 && p99 <= 0.002, "media " + medie + " · p99 " + p99 + " · max " + d[d.length - 1]);
  assert.ok(JSON.stringify(m2).length < JSON.stringify(m1).length * 0.9, "exportul nu e mai compact: " + JSON.stringify(m2).length + " față de " + JSON.stringify(m1).length);
});
test("intrare greșită: NaN, listă scurtă, model fără semi ⇒ null", () => {
  const rows = date(() => 0.5).slice(0, 400), m = model(antreneazaArbori(X(rows), Y(rows), K, { seed: 5 }));
  assert.equal(preziceArbori(m, [NaN, 0, 0, 0, 0, 0]), null); assert.equal(preziceArbori({ baza: 0, pas: 0.08 }, [0, 0, 0, 0, 0, 0]), null); assert.equal(preziceArbori(m, "x"), null);
});
console.log("\n" + (pica ? "ARBORI PICA · " + pica + " din " + (ok + pica) : "ARBORI PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
