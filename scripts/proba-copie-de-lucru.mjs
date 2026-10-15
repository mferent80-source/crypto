// Proba uneltei copie-de-lucru.mjs (15.10.2026) — pe un depozit de încercare în dosarul temporar, fără rețea.
//   node scripts/proba-copie-de-lucru.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UNEALTA = path.join(path.dirname(fileURLToPath(import.meta.url)), "copie-de-lucru.mjs");
const T = fs.mkdtempSync(path.join(os.tmpdir(), "proba-copie-"));
const ORIGIN = path.join(T, "origin.git"), RAD = path.join(T, "crypto"), ALT = path.join(T, "alt-clone");
const sh = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8" }); if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`); return String(r.stdout).trim(); };
const scrie = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const citeste = (p) => fs.readFileSync(p, "utf8");
const unealta = (...a) => { const r = spawnSync(process.execPath, [UNEALTA, ...a], { cwd: RAD, encoding: "utf8", env: { ...process.env, COPIE_RADACINA: RAD } }); return { cod: r.status, text: String(r.stdout) + String(r.stderr) }; };
const cfg = (cwd) => { sh(cwd, "config", "user.email", "proba@local"); sh(cwd, "config", "user.name", "proba"); sh(cwd, "config", "core.autocrlf", "false"); };
let teste = 0, picate = 0;
const test = (nume, f) => { teste++; try { f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } };
console.log("\ncopie-de-lucru · proba\n");

// depozitul de încercare: origin + „principalul” (ca C:\Users\Cimin\crypto) + o a doua clonă (altă sesiune / alt PC)
sh(T, "init", "--bare", "-b", "main", ORIGIN);
sh(T, "clone", ORIGIN, RAD); cfg(RAD); sh(RAD, "checkout", "-b", "main");
scrie(path.join(RAD, "package.json"), JSON.stringify({ name: "p", scripts: { test: "node test.js" } }));
scrie(path.join(RAD, "test.js"), "process.exit(require('fs').existsSync('PICA') ? 1 : 0)\n");
for (const f of ["a.txt", "b.txt", "c.txt"]) scrie(path.join(RAD, f), f + " 1\n");
scrie(path.join(RAD, ".gitignore"), ".dev.vars\nretea/node_modules\n");
sh(RAD, "add", "-A"); sh(RAD, "commit", "-qm", "inceput"); sh(RAD, "push", "-q", "origin", "main");
scrie(path.join(RAD, ".dev.vars"), "SECRET=1\n");
scrie(path.join(RAD, "retea", "node_modules", "x", "index.js"), "// modul\n");
const COPIE = path.join(T, "crypto-lucru-t1");
const comite = (cwd, f, s, msg) => { scrie(path.join(cwd, f), s); sh(cwd, "add", "-A"); sh(cwd, "commit", "-qm", msg); };
const pe = (ref, f) => sh(RAD, "show", `${ref}:${f}`);

test("porneste: copia din origin/main, cu .dev.vars copiat și retea/node_modules legat (nu copiat)", () => {
  const r = unealta("porneste", "t1"); assert.equal(r.cod, 0, r.text);
  assert.ok(fs.existsSync(path.join(COPIE, "a.txt")));
  assert.equal(citeste(path.join(COPIE, ".dev.vars")), "SECRET=1\n");
  assert.ok(fs.existsSync(path.join(COPIE, "retea", "node_modules", "x", "index.js")));
  assert.ok(fs.lstatSync(path.join(COPIE, "retea", "node_modules")).isSymbolicLink() || process.platform === "win32");
  assert.equal(sh(COPIE, "rev-parse", "--abbrev-ref", "HEAD"), "lucru-t1");
  assert.equal(unealta("porneste", "t1").cod, 1, "a doua oară nu suprascrie");
});
test("🔑 rulată DIN copie (fără COPIE_RADACINA): își găsește principalul prin .git-ul comun", () => {
  fs.mkdirSync(path.join(COPIE, "scripts"), { recursive: true }); fs.copyFileSync(UNEALTA, path.join(COPIE, "scripts", "copie-de-lucru.mjs"));
  const env = { ...process.env }; delete env.COPIE_RADACINA;
  const r = spawnSync(process.execPath, [path.join(COPIE, "scripts", "copie-de-lucru.mjs"), "stare"], { cwd: COPIE, encoding: "utf8", env });
  assert.equal(r.status, 0, r.stderr); assert.match(String(r.stdout), /crypto-lucru-t1/); assert.ok(!/crypto-lucru-t1-lucru/.test(String(r.stdout)));
  fs.rmSync(path.join(COPIE, "scripts"), { recursive: true, force: true });
});
test("nume greșit ⇒ refuz", () => { assert.equal(unealta("porneste", "../x").cod, 1); assert.equal(unealta("porneste", "A B").cod, 1); });
test("livreaza fără commit-uri / cu modificări necomise ⇒ 1, nimic publicat", () => {
  assert.equal(unealta("livreaza", "t1").cod, 1);
  scrie(path.join(COPIE, "a.txt"), "a.txt neterminat\n");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 1); assert.match(r.text, /necomise/);
  sh(COPIE, "checkout", "--", "a.txt");
});
test("livreaza: teste ⇒ push ⇒ principalul adus (avans simplu)", () => {
  comite(COPIE, "a.txt", "a.txt 2\n", "a2");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 0, r.text);
  assert.equal(pe("origin/main", "a.txt"), "a.txt 2");
  assert.equal(citeste(path.join(RAD, "a.txt")), "a.txt 2\n", "principalul are codul");
});
test("🔑 principalul cu modificări NECOMISE pe același fișier ⇒ publicat, dar principalul NEATINS (2)", () => {
  scrie(path.join(RAD, "b.txt"), "b.txt lucrul vecinei\n");
  comite(COPIE, "b.txt", "b.txt al meu\n", "b-meu");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 2, r.text); assert.match(r.text, /b\.txt/);
  assert.equal(citeste(path.join(RAD, "b.txt")), "b.txt lucrul vecinei\n", "lucrul vecinei rămâne");
  assert.equal(pe("origin/main", "b.txt"), "b.txt al meu");
  sh(RAD, "checkout", "--", "b.txt"); sh(RAD, "merge", "--ff-only", "-q", "origin/main");
});
test("principalul cu modificări necomise pe ALT fișier ⇒ adus, iar ale vecinei rămân", () => {
  scrie(path.join(RAD, "a.txt"), "a.txt vecina\n");
  comite(COPIE, "c.txt", "c.txt 2\n", "c2");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 0, r.text);
  assert.equal(citeste(path.join(RAD, "c.txt")), "c.txt 2\n");
  assert.equal(citeste(path.join(RAD, "a.txt")), "a.txt vecina\n");
  sh(RAD, "checkout", "--", "a.txt");
});
test("principalul cu commit local NEPUBLICAT ⇒ publicat (2), iar mesajul arată commit-ul care îl ține", () => {
  comite(RAD, "z.txt", "z local\n", "commit-local-al-vecinei");
  comite(COPIE, "c.txt", "c.txt 3\n", "c3");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 2, r.text); assert.match(r.text, /commit-local-al-vecinei/);
  assert.equal(citeste(path.join(RAD, "z.txt")), "z local\n", "commit-ul vecinei rămâne");
  sh(RAD, "pull", "-q", "--rebase", "origin", "main"); sh(RAD, "push", "-q", "origin", "main");
  sh(COPIE, "fetch", "-q", "origin"); sh(COPIE, "reset", "-q", "--hard", "origin/main");
});
test("npm test pică ⇒ 1, nimic publicat", () => {
  const inainte = sh(RAD, "rev-parse", "origin/main");
  comite(COPIE, "PICA", "x\n", "pica");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 1, r.text); assert.match(r.text, /PICAT/);
  sh(COPIE, "fetch", "-q", "origin"); assert.equal(sh(COPIE, "rev-parse", "origin/main"), inainte);
  sh(COPIE, "reset", "-q", "--hard", "HEAD~1");
});
test("conflict cu ce a urcat altcineva ⇒ rebase oprit, copia neatinsă, nimic publicat", () => {
  sh(T, "clone", "-q", ORIGIN, ALT); cfg(ALT); comite(ALT, "c.txt", "c.txt al altuia\n", "alt"); sh(ALT, "push", "-q", "origin", "main");
  comite(COPIE, "c.txt", "c.txt al meu\n", "c-meu");
  const cap = sh(COPIE, "rev-parse", "HEAD");
  const r = unealta("livreaza", "t1"); assert.equal(r.cod, 1, r.text); assert.match(r.text, /Conflict/); assert.match(r.text, /c\.txt/);
  assert.equal(sh(COPIE, "rev-parse", "HEAD"), cap, "copia neatinsă");
  assert.equal(sh(COPIE, "status", "--porcelain"), "", "fără rebase rămas pe jumătate");
  sh(COPIE, "reset", "-q", "--hard", "origin/main");
});
test("curata: refuză copia cu commit-uri nepublicate; cu --forteaza o scoate fără să atingă ținta legăturii", () => {
  comite(COPIE, "d.txt", "d\n", "nepublicat");
  assert.equal(unealta("curata", "t1").cod, 1);
  const r = unealta("curata", "t1", "--forteaza"); assert.equal(r.cod, 0, r.text);
  assert.ok(!fs.existsSync(COPIE), "copia ștearsă");
  assert.ok(fs.existsSync(path.join(RAD, "retea", "node_modules", "x", "index.js")), "🔑 modulele din principal NEATINSE");
  assert.ok(fs.existsSync(path.join(RAD, ".dev.vars")), ".dev.vars din principal rămâne");
  assert.ok(!sh(RAD, "branch", "--list", "lucru-t1"), "ramura ștearsă");
});
test("curata după livrare: fără --forteaza", () => {
  assert.equal(unealta("porneste", "t2").cod, 0);
  const C2 = path.join(T, "crypto-lucru-t2");
  comite(C2, "e.txt", "e\n", "e"); assert.equal(unealta("livreaza", "t2").cod, 0);
  assert.equal(unealta("curata", "t2").cod, 0); assert.ok(!fs.existsSync(C2));
});
test("stare: arată copiile și ce e necomis în principal", () => {
  scrie(path.join(RAD, "a.txt"), "a vecina\n");
  const r = unealta("stare"); assert.equal(r.cod, 0); assert.match(r.text, /necomise/); assert.match(r.text, /a\.txt/);
  sh(RAD, "checkout", "--", "a.txt");
});

try { spawnSync("cmd", ["/c", "rmdir", "/s", "/q", T.replace(/\//g, "\\")]); } catch {}
console.log(`\nCOPIE-DE-LUCRU ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste} probe trecute`);
process.exit(picate ? 1 : 0);
