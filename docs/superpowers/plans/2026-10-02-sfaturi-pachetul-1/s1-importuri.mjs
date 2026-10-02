// Sarcina 1: fiecare proba din scripts/ care evalueaza semnale-bot.js sau consiliu.js primeste, inaintea primului import,
// `import "./lib/text-ro-global.mjs";` (TextRo ca global). Pastreaza CRLF-ul fisierului. node s1-importuri.mjs <radacina-repo>
import fs from "node:fs";
import path from "node:path";
const RAD = process.argv[2], dir = path.join(RAD, "scripts"), LINIE = 'import "./lib/text-ro-global.mjs";', ANCORA = 'import assert from "node:assert/strict";';
const fac = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && f !== "colector.mjs" && f !== "garda-texte.mjs" && f !== "proba-v10061.mjs");
let n = 0;
for (const f of fac) {
  const p = path.join(dir, f), raw = fs.readFileSync(p, "utf8");
  if (!/semnale-bot\.js|consiliu\.js/.test(raw) || raw.includes(LINIE)) continue;
  const crlf = raw.includes("\r\n"), s = raw.replace(/\r\n/g, "\n");
  if (s.split(ANCORA).length !== 2) throw new Error("ancora lipsa sau dubla in " + f);
  const t = s.replace(ANCORA, LINIE + "\n" + ANCORA);
  fs.writeFileSync(p, crlf ? t.replace(/\n/g, "\r\n") : t); n++; console.log("  + " + f + (crlf ? " (CRLF)" : ""));
}
console.log(n + " probe");
