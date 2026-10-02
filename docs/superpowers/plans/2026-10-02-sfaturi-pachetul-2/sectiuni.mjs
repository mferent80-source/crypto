// Scrie proba v100.62 cu sectiunile pana la sarcina N inclusiv (testul fiecarei sarcini intra INAINTEA codului ei).
// node sectiuni.mjs <N> <destinatie>  - coada probei (ultimul console.log + process.exit) ramane mereu.
import fs from "node:fs";
const [N, D] = [Number(process.argv[2]), process.argv[3]];
const s = fs.readFileSync(new URL("./proba-v10062.mjs", import.meta.url), "utf8"), coada = s.lastIndexOf("console.log(");
if (coada < 0 || !s.slice(coada).includes("process.exit(1)")) throw new Error("coada probei lipseste");
const parti = s.slice(0, coada).split(/(?=\/\/ ---- sarcina \d)/);
const pastrate = parti.filter((p) => { const m = /^\/\/ ---- sarcina (\d)/.exec(p); return !m || Number(m[1]) <= N; });
fs.writeFileSync(D, pastrate.join("") + s.slice(coada));
console.log("sectiuni pana la " + N + ": " + (pastrate.length - 1));
