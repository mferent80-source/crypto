// Proba v100.307-c / colector v101.167 (06.11.2026): colectorul nu mai stă blocat.
// Cauza măsurată pe VPS (scratchpad banda-durata-vps.mjs): tura „disciplina banda” ținea bucla SINCRON 44 s - `bareDe` era chemat pe
// fiecare trade (2.428) și recitea / reîmbina fișierele aceleiași monede; tura pica (ECONNRESET), se relua la fiecare minut ⇒ 44 s de
// blocaj pe minut ⇒ timeout-uri la toate turele (29–130 pe oră față de 1–17), 22:16–03:37 UTC. Cu barele citite o dată pe monedă: 2,9 s,
// rezultat identic. Aici:
//   1. disciplina.js (iesiriBanda): fereastra botului din barele sortate prin căutare binară - rezultat IDENTIC cu versiunea veche (git);
//   2. scripts/lib/martor-bucla.mjs: martorul buclei - o notă în jurnal când colectorul stă blocat peste 5 s (cel mult una pe minut);
//   3. colectorul: barele pe tură, cu cache pe monedă (disciplina + cazuri), pauza de 30 min după un eșec al disciplinei, martorul pornit.
//   node scripts/proba-v100307-c.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.message || e).split("\n").slice(0, 4).join("\n       ")}`); }); }
console.log("\nv100.307-c · colectorul fără blocaje (disciplina banda, cazuri, martorul buclei) · proba\n");

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const incarcaText = (src) => new Function(src + "; return Disciplina;")();
const ORA = 3600000;

await test("🔑 iesiriBanda cu căutare binară = versiunea veche (git 8ca26b6), pe 60 de lumi aleatoare (bare sortate)", () => {
  const vechi = incarcaText(execFileSync("git", ["show", "8ca26b6:public/lib/disciplina.js"], { cwd: RAD, encoding: "utf8" }));
  const nou = incarcaText(citeste("public", "lib", "disciplina.js"));
  for (let w = 0; w < 60; w++) {
    const r = mulberry32(100 + w), monede = ["A", "B", "C", "D"], bare = {};
    for (const m of monede) { let p = 100; const T0 = Date.UTC(2026, 7, 1); bare[m] = Array.from({ length: 600 }, (_, k) => { p *= 1 + (r() - 0.5) * 0.03; return { t: T0 + k * ORA, o: p, h: p * 1.005, l: p * 0.995, c: p }; }); }
    const trades = Array.from({ length: 80 }, (_, i) => { const m = monede[i % 4], b = bare[m], k = Math.floor(r() * 500), c = b[k].c, lat = 0.02 + r() * 0.08; return { id: "t" + i, moneda: m, jos: c * (1 - lat), sus: c * (1 + lat), dir: ["long", "short", "neutru"][i % 3], pornit: b[k].t + 1, inchis: b[k].t + (5 + Math.floor(r() * 80)) * ORA, pct: (r() - 0.5) * 0.1, net: (r() - 0.5) * 10, rezultat: (r() - 0.5) * 10 }; });
    const de = (m) => bare[m] || null;
    assert.equal(JSON.stringify(nou.iesiriBanda(trades, de)), JSON.stringify(vechi.iesiriBanda(trades, de)), "lumea " + w);
  }
});
await test("…și pe bare NESORTATE (din altă sursă): tot identic (fără scurtătură)", () => {
  const vechi = incarcaText(execFileSync("git", ["show", "8ca26b6:public/lib/disciplina.js"], { cwd: RAD, encoding: "utf8" }));
  const nou = incarcaText(citeste("public", "lib", "disciplina.js"));
  const r = mulberry32(7), T0 = Date.UTC(2026, 7, 1); let p = 100;
  const b = Array.from({ length: 300 }, (_, k) => { p *= 1 + (r() - 0.5) * 0.03; return { t: T0 + k * ORA, o: p, h: p, l: p, c: p }; });
  const amestec = b.slice().sort(() => r() - 0.5);
  const tr = Array.from({ length: 30 }, (_, i) => ({ id: "x" + i, moneda: "A", jos: 95, sus: 105, dir: "long", pornit: T0 + i * 7 * ORA, inchis: T0 + (i * 7 + 40) * ORA, pct: 0.01, net: 1 }));
  assert.equal(JSON.stringify(nou.iesiriBanda(tr, () => amestec)), JSON.stringify(vechi.iesiriBanda(tr, () => amestec)));
});

const MB = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "martor-bucla.mjs")).href).catch((e) => ({ eroare: e }));
await test("🔑 martorul buclei: o întârziere de 8 s ⇒ o notă „bucla a stat blocată 8,0 s”; două la rând în același minut ⇒ o singură notă", () => {
  assert.ok(!MB.eroare, "lipsește scripts/lib/martor-bucla.mjs");
  let ceas = 0, f = null; const note = [];
  MB.pornesteMartorBucla({ jurnal: (...a) => note.push(a.join(" ")), acum: () => ceas, setInt: (cb) => { f = cb; return { unref() {} }; } });
  ceas += 1000; f(); assert.equal(note.length, 0, "fără întârziere ⇒ tace");
  ceas += 9000; f(); assert.equal(note.length, 1); assert.match(note[0], /bucla a stat blocată 8,0 s/);
  ceas += 7000; f(); assert.equal(note.length, 1, "a doua în același minut ⇒ tace");
  ceas += 61000; f(); assert.equal(note.length, 2, "după un minut ⇒ iar");
});

await test("🔑 colectorul: barele pe tură cu cache pe monedă în disciplina ȘI cazuri (fără `bareDe` care recitește la fiecare trade)", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /function bareArhivaPeTura\(harta\)/);
  assert.equal((c.match(/const bareDe = bareArhivaPeTura\(harta\);/g) || []).length, 2, "disciplina + cazuri");
  assert.doesNotMatch(c, /const bareDe = \(m\) => \{ const ore = harta\[m\]/, "nicio variantă fără cache");
  assert.match(c, /async function preincarcaBare\(bareDe, monede\)/);
  assert.equal((c.match(/await preincarcaBare\(bareDe, tr\.map\(\(t\) => t\.moneda\)\);/g) || []).length, 2, "barele preîncărcate, cu pas buclei, în ambele ture");
});
await test("🔑 disciplina: după un eșec, următoarea încercare peste 30 de minute (nu la fiecare tură); durata calculului în jurnal", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /var disciplinaEsecLa = 0;/);
  assert.match(c, /Date\.now\(\) - disciplinaEsecLa < 30 \* 60000/);
  assert.match(c, /disciplinaEsecLa = Date\.now\(\);/);
  assert.match(c, /calculul în \$\{/);
});
await test("martorul buclei pornit în colector, la pornire", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \{ pornesteMartorBucla \} from "\.\/lib\/martor-bucla\.mjs";/);
  assert.match(c, /pornesteMartorBucla\(\{ jurnal \}\);/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
