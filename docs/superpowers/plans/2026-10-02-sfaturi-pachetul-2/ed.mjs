// Editorul planului: node ed.mjs <fisier> <inlocuiri.mjs> [lista]
// inlocuiri.mjs exporta [[vechi, nou], ...] (default) sau liste cu nume (al treilea argument). Fiecare „vechi” trebuie sa apara
// EXACT o data (altfel nu scrie nimic); pastreaza CRLF-ul fisierului; scrie o singura data, la final (atomic pe fisier).
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const [F, R, L] = process.argv.slice(2);
const mod = await import(pathToFileURL(R).href), reps = L ? mod[L] : mod.default;
if (!Array.isArray(reps)) throw new Error("lista lipsa: " + (L || "default"));
const raw = fs.readFileSync(F, "utf8"), crlf = raw.includes("\r\n"); let s = raw.replace(/\r\n/g, "\n");
for (const [a, b] of reps) {
  if (!a) throw new Error("vechi gol");
  const n = s.split(a).length - 1; if (n !== 1) throw new Error("apare de " + n + " ori: " + a.slice(0, 120));
  s = s.replace(a, () => b);
}
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s); console.log("ok", F, (L || "default"), reps.length);
