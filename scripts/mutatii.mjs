// I-846 (v100.312, 07.11.2026, el: „fă tot”): mutațiile intră în repo. Pe 07.11 greșelile plantate dinadins (scratchpad-ul sesiunii) au găsit
// 3 goluri în teste care treceau (r7 pe 6 zile, ciclul de funding de 7 decontări, fraza calibrării) - scripturile se pierdeau odată cu sesiunea.
// Acum listele stau în scripts/date/mutatii-<nume>.json: { proba, mutatii: [{ nume, fisier, cauta, pune }] }. Fiecare mutație strică o dată
// fișierul ei (`cauta` trebuie să apară EXACT o dată), rulează proba listei și cere ca ea să PICE (ieșire ≠ 0) = „prinsă”. Fișierele se pun
// la loc după fiecare mutație și la sfârșit se verifică octet cu octet (și la Ctrl+C).
//   node scripts/mutatii.mjs                    toate listele
//   node scripts/mutatii.mjs caderi directie    doar listele numite
//   node scripts/mutatii.mjs --doar-tiparele    doar că fiecare tipar mai apare exact o dată (rapid, în npm test: listele nu putrezesc)
//   node scripts/mutatii.mjs --atinse [ref]     doar listele ale căror fișiere (sau probă) s-au schimbat față de ref (implicit origin/main) - în livrare
// Ieșire 1: o mutație SCĂPATĂ (proba a trecut cu codul stricat) sau un tipar care nu mai apare exact o dată.
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAD, "scripts", "date");
const arg = process.argv.slice(2), doarTipare = arg.includes("--doar-tiparele"), iAt = arg.indexOf("--atinse");
const ref = iAt >= 0 && arg[iAt + 1] && !arg[iAt + 1].startsWith("--") ? arg[iAt + 1] : "origin/main";
const numite = arg.filter((a, i) => !a.startsWith("--") && !(iAt >= 0 && i === iAt + 1));
let liste = fs.readdirSync(DIR).filter((f) => /^mutatii-[a-z0-9-]+\.json$/.test(f)).sort().map((f) => ({ nume: f.slice(8, -5), ...JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) }));
if (numite.length) { const necunoscute = numite.filter((n) => !liste.some((l) => l.nume === n)); if (necunoscute.length) { console.log("Liste necunoscute: " + necunoscute.join(", ")); process.exit(1); } liste = liste.filter((l) => numite.includes(l.nume)); }
if (iAt >= 0) {
  let schimbate = [];
  try {
    const git = (a) => execFileSync("git", a, { cwd: RAD, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
    schimbate = [...new Set([...git(["diff", "--name-only", ref + "...HEAD"]), ...git(["diff", "--name-only"]), ...git(["diff", "--name-only", "--cached"])])];
  } catch (e) { console.log("git diff față de " + ref + " n-a mers (" + String(e.message).split("\n")[0] + ") - rulez toate listele"); schimbate = null; }
  if (schimbate) liste = liste.filter((l) => l.mutatii.some((m) => schimbate.includes(m.fisier)) || schimbate.includes(l.proba) || schimbate.includes("scripts/date/mutatii-" + l.nume + ".json"));
}
const originale = new Map(), stricate = new Map();   // fișier ⇒ conținutul stricat scris de noi (pus la loc doar dacă e încă acolo: o editare a altcuiva rămâne)
const pune = () => { for (const [f, s] of stricate) { try { if (fs.readFileSync(f, "utf8") === s) fs.writeFileSync(f, originale.get(f)); } catch {} stricate.delete(f); } };
for (const sem of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) { try { process.on(sem, () => { pune(); console.log("\nîntrerupt (" + sem + ") - fișierele puse la loc"); process.exit(130); }); } catch {} }
process.on("exit", pune);
const eol = (t, s) => s.split("\n").join(t.includes("\r\n") ? "\r\n" : "\n");
let rele = 0, total = 0;
console.log(`\nMUTAȚII${doarTipare ? " · doar tiparele" : ""} · ${liste.length ? liste.map((l) => l.nume + " (" + l.mutatii.length + ")").join(", ") : "nicio listă de rulat"}\n`);
try {
  for (const L of liste) {
    // proba trebuie să TREACĂ pe codul nestricat - altfel orice mutație ar ieși „prinsă” din motivul greșit
    if (!doarTipare) { const r0 = spawnSync(process.execPath, [path.join(RAD, L.proba)], { cwd: RAD, encoding: "utf8", timeout: 600000 }); if (r0.status !== 0) { rele++; total++; console.log(`  PICA   ${L.nume}: ${L.proba} pică deja pe codul nestricat - repar-o întâi`); continue; } }
    for (const m of L.mutatii) {
      total++;
      const f = path.join(RAD, m.fisier);
      if (!originale.has(f)) originale.set(f, fs.readFileSync(f));
      const t = originale.get(f).toString("utf8"), a = eol(t, m.cauta), n = t.split(a).length - 1;
      if (n !== 1) { rele++; console.log(`  TIPAR  ${L.nume} · ${m.nume}: apare de ${n} ori în ${m.fisier} (codul s-a schimbat ⇒ actualizează lista)`); continue; }
      if (doarTipare) continue;
      const s = t.replace(a, eol(t, m.pune)); stricate.set(f, s); fs.writeFileSync(f, s);
      let r;
      try { r = spawnSync(process.execPath, [path.join(RAD, L.proba)], { cwd: RAD, encoding: "utf8", timeout: 600000 }); }
      finally { pune(); }
      const prinsa = r.status !== 0, pic = (String(r.stdout || "").split("\n").find((l) => l.includes("PICA")) || "").trim();
      if (!prinsa) rele++;
      console.log(`  ${prinsa ? "prinsă " : "SCĂPATĂ"} ${L.nume} · ${m.nume}${prinsa && pic ? "  ← " + pic.slice(5, 90) : ""}`);
    }
  }
} finally { pune(); }
if (!doarTipare) for (const [f, b] of originale) if (!fs.readFileSync(f).equals(b)) { console.log("PICA: " + path.relative(RAD, f) + " n-a revenit la original"); process.exit(1); }
console.log(`\n${total - rele}/${total} ${doarTipare ? "tipare la locul lor" : "prinse"}${rele ? " — " + rele + (doarTipare ? " tipare vechi" : " SCĂPATE sau tipare vechi") : ""}\n`);
process.exit(rele ? 1 : 0);
