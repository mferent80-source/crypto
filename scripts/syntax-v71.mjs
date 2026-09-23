// Proba de sintaxa: trece prin tot ce se livreaza si se plange daca nu se
// parseaza. Prinde clasa de bug care omoara aplicatia fara sa lase urma -
// o paranteza pierduta intr-un fisier de 700 KB sau un JSON stricat.
//
// Rulare: node scripts/syntax-v71.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RADACINA = path.dirname(fileURLToPath(new URL("../x", import.meta.url)));
const probleme = [];
let verificate = 0;

function fisiere(dir, potrivire) {
  const cale = path.join(RADACINA, dir);
  if (!fs.existsSync(cale)) return [];
  return fs.readdirSync(cale, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? fisiere(path.join(dir, x.name), potrivire)
      : potrivire.test(x.name) ? [path.join(dir, x.name)] : []);
}

// --- JavaScript ---
const js = [
  ...fisiere("functions", /\.js$/),
  ...fisiere("workers", /\.js$/),
  "public/app.js", "public/sw.js", "public/research-worker.js",
].filter((f) => fs.existsSync(path.join(RADACINA, f)));

for (const f of js) {
  verificate++;
  try {
    execFileSync(process.execPath, ["--check", path.join(RADACINA, f)], { stdio: "pipe" });
  } catch (e) {
    probleme.push(`${f}: ${String(e.stderr || e.message).split("\n").slice(0, 2).join(" ").slice(0, 160)}`);
  }
}

// --- JSON ---
const json = ["package.json", "BUILD_INFO.json", "public/manifest.webmanifest",
  "public/_routes.json", "public/engine-contract.json"]
  .filter((f) => fs.existsSync(path.join(RADACINA, f)));

for (const f of json) {
  verificate++;
  try { JSON.parse(fs.readFileSync(path.join(RADACINA, f), "utf8")); }
  catch (e) { probleme.push(`${f}: JSON stricat - ${e.message.slice(0, 120)}`); }
}

// --- HTML: accent grav in comentarii ---
// Capcana care a omorat alte proiecte de-ale noastre: un accent grav intr-un
// comentariu HTML rupe parsarea, iar `node --check` trece fara sa observe.
const html = "public/index.html";
if (fs.existsSync(path.join(RADACINA, html))) {
  verificate++;
  const s = fs.readFileSync(path.join(RADACINA, html), "utf8");
  const rele = (s.match(/<!--[\s\S]{0,600}?-->/g) || []).filter((c) => c.includes("`"));
  if (rele.length) probleme.push(`${html}: ${rele.length} comentarii cu accent grav`);
}

// --- fisierele pe care package.json le cheama chiar exista? ---
verificate++;
const pkg = JSON.parse(fs.readFileSync(path.join(RADACINA, "package.json"), "utf8"));
const cerute = [...new Set(JSON.stringify(pkg.scripts).match(/scripts\/[a-z0-9-]+\.mjs/g) || [])];
const lipsa = cerute.filter((f) => !fs.existsSync(path.join(RADACINA, f)));
if (lipsa.length) probleme.push(`package.json cheama ${lipsa.length} scripturi inexistente: ${lipsa.join(", ")}`);

// --- numele cache-ului din sw.js poarta versiunea majora din package.json? ---
// Daca ramane in urma, browserul NU reinstaleaza APP_SHELL (app.js, lib/*) fiindca
// fetch-ul e cache-first, dar index.html e network-first => omul vede badge-ul NOU
// peste cod VECHI. Badge-ul minte, si nicio reparatie nu e in pagina.
verificate++;
const swCale = path.join(RADACINA, "public/sw.js");
if (!fs.existsSync(swCale)) probleme.push("public/sw.js lipseste");
else {
  const major = String(pkg.version).split(".")[0];
  const sw = fs.readFileSync(swCale, "utf8");
  const numeCache = (sw.match(/const\s+CACHE\s*=\s*["'`]([^"'`]+)["'`]/) || [])[1];
  if (!numeCache) probleme.push("public/sw.js: nu gasesc `const CACHE=...`");
  else if (!new RegExp("v" + major + "($|[^0-9])").test(numeCache)) {
    probleme.push("public/sw.js: cache \"" + numeCache + "\" nu poarta v" + major +
      " din package.json (" + pkg.version + ")");
  }
}

console.log("\nV71 · sintaxa · proba");
for (const p of probleme) console.log(`  PICA ${p}`);
console.log(`\nV71_SYNTAX ${probleme.length ? "FAIL" : "PASS"} · ${verificate - probleme.length}/${verificate}\n`);
process.exit(probleme.length ? 1 : 0);
