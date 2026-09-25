// Copia de siguranta a datelor Radarului (v91): istoricul T212, verdictele, planurile, ideile stau in KV-ul
// local al serverului (.wrangler/state/v3/kv, ~1,4 MB) - doar pe discul PC-ului de acasa. O data pe zi, colectorul
// il copiaza in data/copii/kv-YYYY-MM-DD si pastreaza ultimele N zile.
import fs from "node:fs";
import path from "node:path";

export function faCopie({ sursa, dest, zi, pastreaza = 14 }) {
  if (!fs.existsSync(sursa)) return { facut: false, motiv: "lipseste sursa" };
  fs.mkdirSync(dest, { recursive: true });
  const tinta = path.join(dest, "kv-" + zi);
  if (fs.existsSync(tinta)) return { facut: false, motiv: "deja facuta azi" };
  fs.cpSync(sursa, tinta, { recursive: true });
  const vechi = fs.readdirSync(dest).filter((n) => /^kv-\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  for (const n of vechi.slice(0, Math.max(0, vechi.length - pastreaza))) fs.rmSync(path.join(dest, n), { recursive: true, force: true });
  return { facut: true, tinta };
}
