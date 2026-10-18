// COPIA DE LUCRU A FIECĂREI SESIUNI (15.10.2026, el: „începe cu 7” — ideea „o copie de lucru separată pentru fiecare sesiune”).
//
// De ce: pe 15.10 două sesiuni Claude au lucrat deodată în C:\Users\Cimin\crypto. Una a comis fișierul celeilalte (colector.mjs
// cu o bucată necomisă a vecinei), alta a scris peste proba necomisă a vecinei (proba-v100199.mjs, nerecuperabilă din git).
// Regula: în dosarul principal NU se editează; fiecare sesiune lucrează în copia ei (git worktree), iar codul ajunge în principal
// DOAR prin `livreaza` — care refuză, fără să strice nimic, când principalul are modificări necomise pe aceleași fișiere.
//
//   node scripts/copie-de-lucru.mjs porneste <nume>     copia ..\crypto-lucru-<nume> din origin/main (+ .dev.vars, retea/node_modules)
//   node scripts/copie-de-lucru.mjs livreaza <nume>     rebase pe origin/main ⇒ npm test ⇒ push ⇒ principalul adus (ff) ⇒ proba de telefon
//   node scripts/copie-de-lucru.mjs curata <nume>       șterge copia (doar dacă tot ce are e pe origin/main)
//   node scripts/copie-de-lucru.mjs stare               cine lucrează unde (copiile + ce e necomis în principal)
// Ieșire: 0 gata · 1 oprit înainte de push (nimic publicat) · 2 publicat pe GitHub, dar principalul NU a fost adus (motivul scris)
//         · 3 publicat și principalul adus, dar serverul 8788 NU răspunde cu versiunea nouă a Functions (repornește-l: PORNESTE-CRYPTO-RADAR.bat).
// Probă: scripts/proba-copie-de-lucru.mjs (pe un depozit de încercare, fără rețea).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🔑 principalul = dosarul care ține .git-ul COMUN al tuturor copiilor — chiar dacă unealta rulează dintr-o copie de lucru
// (prima livrare reală, 15.10: rulată din copie, își lua copia drept principal și căuta „crypto-lucru-x-lucru-x”)
function principalul() {
  const aici = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const r = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: aici, encoding: "utf8" });
  const comun = r.status === 0 ? String(r.stdout).trim() : "";
  return comun && path.basename(comun) === ".git" ? path.dirname(comun) : aici;
}
const RAD = path.resolve(process.env.COPIE_RADACINA || principalul());
const NUME_OK = /^[a-z0-9][a-z0-9-]{1,30}$/;
const scrie = (s) => process.stdout.write(s + "\n");

function git(cwd, ...a) {
  const r = spawnSync("git", a, { cwd, encoding: "utf8" });
  // 🔑 doar coada se taie: `git status --porcelain` începe cu un spațiu („ M a.txt”), iar trim() ciuntea numele primului fișier
  return { ok: r.status === 0, out: String(r.stdout || "").replace(/\s+$/, ""), err: String(r.stderr || "").trim() };
}
function ruleaza(cwd, cmd, args) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  return r.status === 0;
}
// v100.213: după reconstruirea Functions, serverul 8788 trebuie să răspundă cu versiunea din functions/_shared/versiune.js.
// Pe 18.10 (v100.212) worker-ul reconstruit stătea sub .wrangler, unde wrangler nu se uită ⇒ serverul a rămas pe Functions
// vechi fără niciun semn. Acum se verifică, nu se presupune.
export function versiuneaAsteptata(rad) {
  try { const m = fs.readFileSync(path.join(rad, "functions", "_shared", "versiune.js"), "utf8").match(/VERSIUNE = "([^"]+)"/); return m ? m[1] : null; } catch { return null; }
}
function versiuneaServerului(url) {
  const r = spawnSync("curl", ["-s", "-m", "4", url], { encoding: "utf8", windowsHide: true });
  try { return JSON.parse(String(r.stdout || "")).version || null; } catch { return null; }
}
export function asteaptaVersiunea(asteptata, url, secunde = 30) {
  const pana = Date.now() + secunde * 1000; let v = null;
  for (;;) {
    v = versiuneaServerului(url); if (asteptata && v === asteptata) return { ok: true, v };
    if (Date.now() + 2000 > pana) return { ok: false, v };
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }
}
const caleCopie = (nume) => path.join(path.dirname(RAD), path.basename(RAD) + "-lucru-" + nume);
const ramura = (nume) => "lucru-" + nume;
const curat = (cwd) => git(cwd, "status", "--porcelain").out === "";
const necomise = (cwd) => git(cwd, "status", "--porcelain").out.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ""));

function legatura(tinta, link) {
  // joncțiune (Windows) / symlink de director: NU copie — ștergerea ei nu atinge ținta
  fs.mkdirSync(path.dirname(link), { recursive: true });   // dosarul părinte poate lipsi din copie (dacă are doar fișiere ignorate)
  fs.symlinkSync(tinta, link, process.platform === "win32" ? "junction" : "dir");
}
function scoateLegatura(link) {
  let st; try { st = fs.lstatSync(link); } catch { return; }
  if (st.isSymbolicLink() || (process.platform === "win32" && !st.isFile())) {
    if (process.platform === "win32") spawnSync("cmd", ["/c", "rmdir", link.replace(/\//g, "\\")]); else fs.unlinkSync(link);
  }
}

function porneste(nume) {
  const dest = caleCopie(nume);
  if (fs.existsSync(dest)) { scrie(`Copia există deja: ${dest} — lucrează acolo (sau „curata ${nume}” întâi).`); return 1; }
  const f = git(RAD, "fetch", "origin"); if (!f.ok) scrie(`(atenție: git fetch a picat — pornesc de la origin/main știut local) ${f.err}`);
  const w = git(RAD, "worktree", "add", "-b", ramura(nume), dest, "origin/main");
  if (!w.ok) { scrie(`N-am putut crea copia: ${w.err}`); return 1; }
  if (fs.existsSync(path.join(RAD, ".dev.vars"))) fs.copyFileSync(path.join(RAD, ".dev.vars"), path.join(dest, ".dev.vars"));
  for (const nm of ["node_modules", path.join("retea", "node_modules")]) {
    const t = path.join(RAD, nm); if (fs.existsSync(t) && !fs.existsSync(path.join(dest, nm))) legatura(t, path.join(dest, nm));
  }
  scrie(`Copia ta: ${dest} (ramura ${ramura(nume)}, de la origin/main ${git(dest, "rev-parse", "--short", "HEAD").out}).`);
  scrie(`Editează și comite DOAR acolo; livrezi cu: node scripts/copie-de-lucru.mjs livreaza ${nume}`);
  return 0;
}

function livreaza(nume) {
  const dest = caleCopie(nume);
  if (!fs.existsSync(dest)) { scrie(`Nu există copia ${dest}.`); return 1; }
  if (!curat(dest)) { scrie(`Copia are modificări necomise — comite-le întâi:\n  ${necomise(dest).join("\n  ")}`); return 1; }
  const f = git(dest, "fetch", "origin"); if (!f.ok) { scrie(`git fetch a picat: ${f.err}`); return 1; }
  const inainte = Number(git(dest, "rev-list", "--count", "origin/main..HEAD").out || 0);
  if (!inainte) { scrie("Nimic de livrat: copia n-are commit-uri peste origin/main."); return 1; }
  const rb = git(dest, "rebase", "origin/main");
  if (!rb.ok) {
    const conf = git(dest, "diff", "--name-only", "--diff-filter=U").out;
    git(dest, "rebase", "--abort");
    scrie(`Conflict cu ce a urcat altcineva între timp (rebase oprit, copia neatinsă):\n  ${conf.split(/\r?\n/).join("\n  ")}\nRezolvă în copie (git rebase origin/main) și rulează iar „livreaza”.`);
    return 1;
  }
  const atinse = git(dest, "diff", "--name-only", "origin/main..HEAD").out.split(/\r?\n/).filter(Boolean);
  scrie(`Livrez ${inainte} commit(uri), ${atinse.length} fișiere. npm test…`);
  if (!ruleaza(dest, "npm", ["test"])) { scrie("npm test a PICAT — nimic publicat."); return 1; }
  const p = git(dest, "push", "origin", "HEAD:main");
  if (!p.ok) { scrie(`push respins (a urcat altcineva chiar acum?) — rulează iar „livreaza”:\n${p.err}`); return 1; }
  scrie(`Urcat pe origin/main: ${git(dest, "rev-parse", "--short", "HEAD").out}.`);

  // principalul (din care rulează serverul 8788 și colectorul): doar avans simplu, și doar dacă nu strică nimic necomis
  if (git(RAD, "rev-parse", "--abbrev-ref", "HEAD").out !== "main") { scrie("Principalul nu e pe main — nu-l ating. Codul e pe GitHub."); return 2; }
  const ale = necomise(RAD), comune = ale.filter((x) => atinse.includes(x));
  if (comune.length) {
    scrie(`Principalul are modificări NECOMISE (altă sesiune lucrează acolo) pe fișiere atinse de tine — nu-l aduc, ca să nu le strivesc:\n  ${comune.join("\n  ")}\nCodul tău e pe GitHub; principalul îl primește când sesiunea aceea comite, cu: git merge --ff-only origin/main`);
    return 2;
  }
  const m = git(RAD, "merge", "--ff-only", "origin/main");
  if (!m.ok) {
    // 15.10.2026: mesajul lui git era gol („nu forțez:” și nimic) ⇒ spun ce anume îl ține: commit-urile locale nepublicate
    const locale = git(RAD, "log", "--oneline", "origin/main..main").out;
    scrie(`Principalul nu se poate aduce prin avans simplu — nu forțez. ${locale ? `Are commit-uri locale nepublicate (altă sesiune le urcă acum?):\n  ${locale.split(/\r?\n/).join("\n  ")}` : m.err || "(git n-a spus de ce)"}\nCodul tău e pe GitHub; principalul îl primește când ele urcă (git pull --rebase origin main, apoi push).`);
    return 2;
  }
  scrie(`Principalul adus la ${git(RAD, "rev-parse", "--short", "HEAD").out}${ale.length ? ` (modificările necomise ale altora, pe alte fișiere, au rămas: ${ale.length})` : ""}.`);
  if (atinse.some((x) => x.startsWith("public/")) && fs.existsSync(path.join(RAD, "scripts", "proba-ecran-telefon.mjs"))) {
    scrie("Ai atins public/ ⇒ proba de telefon pe serverul de acasă (8788 servește principalul)…");
    if (!ruleaza(RAD, "node", ["scripts/proba-ecran-telefon.mjs"])) scrie("⚠ proba de telefon a PICAT pe principal — uită-te acum (codul e publicat).");
  }
  if (atinse.some((x) => x === "scripts/colector.mjs" || x.startsWith("scripts/lib/"))) scrie("Ai atins colectorul ⇒ repornește-l ca să ia codul nou.");
  // v100.211: serverul 8788 rulează Worker-ul PRE-CONSTRUIT (wrangler dev --no-bundle, fără esbuild în watch) ⇒ Functions atinse
  // se reconstruiesc aici, în principal. v100.213: în worker-local, NU sub .wrangler (acolo wrangler nu vede schimbarea — „probat
  // 18.10” din v100.211 era pe un dosar din tmp), apoi health-ul 8788 trebuie să arate versiunea nouă.
  if (atinse.some((x) => x.startsWith("functions/")) && fs.existsSync(path.join(RAD, "radar-local.toml"))) {
    const wr = (String(JSON.parse(fs.readFileSync(path.join(RAD, "package.json"), "utf8")).scripts?.dev || "").match(/wrangler@[\d.]+/) || ["wrangler@4.137.0"])[0];
    scrie(`Ai atins functions/ ⇒ reconstruiesc Worker-ul din principal (worker-local, ${wr})…`);
    if (!ruleaza(RAD, "npx", ["--yes", wr, "pages", "functions", "build", "functions", "--outdir", "worker-local", "--compatibility-date=2026-01-01"])) {
      scrie("⚠ construirea Worker-ului a PICAT — serverul 8788 rămâne pe codul VECHI al Functions; repară și pornește iar PORNESTE-CRYPTO-RADAR.bat.");
      return 3;
    }
    const ast = versiuneaAsteptata(RAD), r = asteaptaVersiunea(ast, "http://127.0.0.1:8788/api/market?type=health");
    if (r.ok) scrie(`Serverul 8788 a luat Functions noi: health ${r.v}.`);
    else {
      scrie(`⚠ serverul 8788 NU a luat Functions noi: health ${r.v || "fără răspuns"}, aștept ${ast}. Repornește-l: PORNESTE-CRYPTO-RADAR.bat din ${RAD} (închide singur sesiunea veche).`);
      return 3;
    }
  }
  return 0;
}

function curata(nume, forteaza) {
  const dest = caleCopie(nume), b = ramura(nume);
  if (fs.existsSync(dest)) {
    if (!forteaza && !curat(dest)) { scrie(`Copia are modificări necomise — nu o șterg:\n  ${necomise(dest).join("\n  ")}`); return 1; }
    git(dest, "fetch", "origin");
    if (!forteaza && !git(dest, "merge-base", "--is-ancestor", "HEAD", "origin/main").ok) { scrie(`Copia are commit-uri care NU sunt pe origin/main — nu o șterg (livrează-le sau „curata ${nume} --forteaza”).`); return 1; }
    try { fs.rmSync(path.join(dest, ".dev.vars"), { force: true }); } catch {}
    for (const nm of ["node_modules", path.join("retea", "node_modules")]) scoateLegatura(path.join(dest, nm));   // ÎNAINTE de ștergere
    const r = git(RAD, "worktree", "remove", ...(forteaza ? ["--force"] : []), dest);
    if (!r.ok) { scrie(`git worktree remove: ${r.err}`); return 1; }
  }
  git(RAD, "worktree", "prune");
  if (git(RAD, "rev-parse", "--verify", "--quiet", b).ok) git(RAD, "branch", forteaza ? "-D" : "-d", b);
  scrie(`Copia ${nume} ștearsă.`);
  return 0;
}

function stare() {
  scrie("Copiile de lucru:"); scrie(git(RAD, "worktree", "list").out);
  const ale = necomise(RAD);
  scrie(ale.length ? `\n⚠ Principalul are ${ale.length} fișiere necomise (cineva editează direct acolo):\n  ${ale.join("\n  ")}` : "\nPrincipalul e curat.");
  return 0;
}

export function principal(argv) {
  const [cmd, nume, opt] = argv;
  if (cmd === "stare") return stare();
  if (!["porneste", "livreaza", "curata"].includes(cmd) || !NUME_OK.test(String(nume || ""))) {
    scrie("folosire: node scripts/copie-de-lucru.mjs porneste|livreaza|curata <nume> | stare   (nume: litere mici, cifre, liniuță)");
    return 1;
  }
  return cmd === "porneste" ? porneste(nume) : cmd === "livreaza" ? livreaza(nume) : curata(nume, opt === "--forteaza");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = principal(process.argv.slice(2));
