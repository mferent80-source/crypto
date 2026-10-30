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
// v100.214: calea worker-ului din radar-local.toml (doar rândul `main = "..."` necomentat)
export function mainDinToml(text) { const m = String(text || "").match(/^main\s*=\s*"([^"]+)"/m); return m ? m[1] : null; }
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

// audit 19.10: colectorul încarcă scripts/colector.mjs, scripts/lib/ și public/lib/ o singură dată, la pornire ⇒ o livrare care le atinge
// rămânea fără efect până la repornirea lui de mână („repornește-l” era doar un sfat). Acum îl repornește chiar livrarea, ca lansatorul:
// oprește DOAR PID-ul din data\colector.pid, și doar dacă linia lui de comandă e scripts\colector.mjs; îl pornește detașat
// (Start-Process node scripts\colector.mjs, ascuns), apoi verifică după 20 s că noul PID trăiește.
export function trebuieRepornitColectorul(atinse) { return (atinse || []).some((x) => x === "scripts/colector.mjs" || x.startsWith("scripts/lib/") || x.startsWith("public/lib/")); }
export function pidDinFisier(text) { const n = Number(String(text || "").trim().split(/\s+/)[0]); return Number.isInteger(n) && n > 0 ? n : null; }
export function eLiniaColectorului(linie) { return /(^|[\s"'\\/])scripts[\\/]colector\.mjs(["'\s]|$)/i.test(String(linie || "")); }
// v100.258 (auditul 23.10): după repornirea PC-ului serverul și colectorul stau în sesiunea 0 (sarcina S4U „Crypto Radar pornire”):
// din sesiunea lui linia de comandă iese goală și kill(…, 0) dă EPERM. Atunci colectorul RULEAZĂ, dar nu-l pot opri - deci nu pornesc al doilea.
export function decizieRepornire(pid, linie, kill = (p) => process.kill(p, 0)) {
  if (!pid) return { opreste: false, porneste: true, motiv: "fara-pid" };
  if (linie && eLiniaColectorului(linie)) return { opreste: true, porneste: true, motiv: "al-meu" };
  if (linie) return { opreste: false, porneste: true, motiv: "alt-program" };
  try { kill(pid); } catch (e) { return e && e.code === "EPERM" ? { opreste: false, porneste: false, motiv: "alta-sesiune" } : { opreste: false, porneste: true, motiv: "nu-ruleaza" }; }
  return { opreste: false, porneste: false, motiv: "viu-necunoscut" };
}
const asteaptaMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
// v100.259 (auditul 23.10, punctul 17): repornirea colectorului din sesiunea 0 FĂRĂ administrator. Livrarea lasă data\colector-iesi.semnal; colectorul
// îl vede în bucla lui (cel mult ~10 s) și iese curat; aici se așteaptă ieșirea PID-ului vechi (cel mult 90 s; kill(pid, 0): EPERM = încă rulează în
// altă sesiune, ESRCH = a ieșit), apoi `schtasks /run /tn "Crypto Radar pornire"` (sarcina lui, fără UAC) pornește colectorul nou; se verifică
// PID-ul nou din data\colector.pid și versiunea din data\pentru-busola.json (scrisă la prima tură, mai nouă decât repornirea).
// Logica e pură: dependențele vin în `d` (probele le dau false; depSemnal le dă pe cele adevărate). Întoarce { ok, motiv, pid }.
// v100.272 (integrarea auditului 29.10): și colectorul din ACEEAȘI sesiune primește întâi semnalul de ieșire - Stop-Process -Force nu lasă
// process.on("exit") să ruleze, iar starea alertelor se scrie acum amânat (≤ 10 s) ⇒ se pierdea ⇒ o alertă putea pleca de două ori după livrare.
// Forțat doar dacă nu iese în OPRIRE_CURATA_MS: semnalul se vede în ≤ 10 s, iar colectorul iese la capătul turei, cel mult după 60 s
// (IESIRE_MAX_MS din sanatate-colector.mjs). Semnalul se șterge mereu, ca cel nou să nu-l găsească. Pură, ca mai sus.
export const OPRIRE_CURATA_MS = 80000;
export function opresteCurat(d) {
  d.scrieSemnal();
  const t0 = d.acum();
  while (d.eViu(d.pid) && d.acum() - t0 < OPRIRE_CURATA_MS) d.asteaptaMs(1000);
  const curat = !d.eViu(d.pid);
  if (!curat) d.forteaza();
  d.stergeSemnal();
  return { curat };
}
export function repornestePrinSemnal(d) {
  const pana = (cond, ms, pas) => { const t0 = d.acum(); for (;;) { if (cond()) return true; if (d.acum() - t0 >= ms) return false; d.asteaptaMs(pas); } };
  d.scrieSemnal();
  d.scrie(`Colectorul (PID ${d.pidVechi}) stă în altă sesiune: i-am lăsat semnalul de ieșire (data\\colector-iesi.semnal) și aștept să iasă…`);
  if (!pana(() => !d.eViu(d.pidVechi), 90000, 2000)) {
    d.stergeSemnal();
    d.scrie(`⚠ Colectorul (PID ${d.pidVechi}) n-a ieșit în 90 s — am șters semnalul și NU pornesc al doilea. Codul nou intră la următoarea repornire a lui.`);
    return { ok: false, motiv: "nu-a-iesit", pid: d.pidVechi };
  }
  const t0 = d.acum();
  if (!d.ruleaza("schtasks", ["/run", "/tn", "Crypto Radar pornire"])) {
    d.scrie("⚠ Colectorul vechi a ieșit, dar sarcina „Crypto Radar pornire” n-a pornit (schtasks) — pornește-l: PORNESTE-CRYPTO-RADAR.bat.");
    return { ok: false, motiv: "schtasks", pid: null };
  }
  let pid = null, v = null;
  const gata = pana(() => { pid = d.citestePid(); v = d.citesteVersiune(); return !!pid && pid !== d.pidVechi && d.eViu(pid) && !!v && Number(v.la) > t0 && v.versiune === d.versiuneAsteptata; }, 150000, 3000);
  if (gata) { d.scrie(`Colectorul repornit prin sarcină: PID ${pid}, versiunea ${v.versiune} (data\\pentru-busola.json).`); return { ok: true, motiv: "repornit", pid }; }
  const viu = !!pid && pid !== d.pidVechi && d.eViu(pid);
  d.scrie(viu ? `⚠ Colectorul nou (PID ${pid}) rulează, dar data\\pentru-busola.json arată ${v && v.versiune || "nimic"}, nu ${d.versiuneAsteptata} — uită-te în data\\colector.log.`
    : "⚠ Colectorul nou NU a pornit în 150 s după sarcină — uită-te în data\\pornire-la-logare.log și pornește-l: PORNESTE-CRYPTO-RADAR.bat.");
  return { ok: false, motiv: viu ? "versiunea-veche" : "nu-a-pornit", pid };
}
function depSemnal(rad, pid) {
  const semnal = path.join(rad, "data", "colector-iesi.semnal");
  let asteptata = null; try { asteptata = (fs.readFileSync(path.join(rad, "scripts", "colector.mjs"), "utf8").match(/const VERSIUNE_COLECTOR = "([^"]+)"/) || [])[1] || null; } catch {}
  return { pidVechi: pid, versiuneAsteptata: asteptata, acum: () => Date.now(), asteaptaMs, scrie,
    scrieSemnal: () => fs.writeFileSync(semnal, new Date().toISOString() + " livrarea\n"),
    stergeSemnal: () => { try { fs.unlinkSync(semnal); } catch {} },
    eViu: (p) => { try { process.kill(p, 0); return true; } catch (err) { return !!(err && err.code === "EPERM"); } },
    ruleaza: (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", windowsHide: true }).status === 0,
    citestePid: () => { try { return pidDinFisier(fs.readFileSync(path.join(rad, "data", "colector.pid"), "utf8")); } catch { return null; } },
    citesteVersiune: () => { try { const o = JSON.parse(fs.readFileSync(path.join(rad, "data", "pentru-busola.json"), "utf8")); return { versiune: o && o.versiune, la: o && o.la }; } catch { return null; } } };
}
function ps(cmd) { const r = spawnSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8", windowsHide: true }); return String(r.stdout || "").trim(); }
const linieDeComanda = (pid) => ps(`(Get-CimInstance Win32_Process -Filter 'ProcessId=${Number(pid)}' -ErrorAction SilentlyContinue).CommandLine`);
function repornesteColectorul(rad) {
  let pid = null; try { pid = pidDinFisier(fs.readFileSync(path.join(rad, "data", "colector.pid"), "utf8")); } catch {}
  const d = decizieRepornire(pid, pid ? linieDeComanda(pid) : "");
  if (!d.porneste) {
    if (d.motiv === "alta-sesiune" && process.platform === "win32") return repornestePrinSemnal(depSemnal(rad, pid)).ok;   // v100.259 (punctul 17)
    scrie(`⚠ Colectorul rulează (PID ${pid}) ${d.motiv === "alta-sesiune" ? "în altă sesiune (pornit de sarcina S4U după repornirea PC-ului)" : "dar nu-i pot citi linia de comandă"} — nu-l pot opri și NU pornesc al doilea.`
      + "\n  Codul nou intră în colector la următoarea repornire a lui (repornirea PC-ului / logarea, sau Stop-Process ca administrator, apoi schtasks /run /tn \"Crypto Radar pornire\").");
    return false;
  }
  if (d.opreste) {   // v100.272: întâi semnalul (iese curat, scrie starea alertelor), forțat doar dacă nu iese
    const ds = depSemnal(rad, pid), o = opresteCurat({ pid, acum: ds.acum, asteaptaMs, scrieSemnal: ds.scrieSemnal, stergeSemnal: ds.stergeSemnal, eViu: ds.eViu,
      forteaza: () => { ps(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`); asteaptaMs(2000); } });
    scrie(o.curat ? `Colectorul vechi (PID ${pid}) a ieșit curat la semnal (starea alertelor scrisă).` : `Am oprit colectorul vechi (PID ${pid}): n-a ieșit la semnal în ${OPRIRE_CURATA_MS / 1000} s.`);
  }
  else scrie(d.motiv === "fara-pid" ? "data\\colector.pid lipsește — colectorul nu rula; îl pornesc." : `PID-ul ${pid} din data\\colector.pid nu e colectorul (${d.motiv === "alt-program" ? "alt program" : "nu rulează"}) — nu-l opresc.`);
  const nou = Number(ps(`(Start-Process -FilePath node -ArgumentList 'scripts\\colector.mjs' -WorkingDirectory '${rad.replace(/'/g, "''")}' -WindowStyle Hidden -PassThru).Id`));
  if (!(nou > 0)) { scrie("⚠ colectorul NU a pornit (Start-Process n-a dat un PID) — pornește-l: PORNESTE-CRYPTO-RADAR.bat."); return false; }
  asteaptaMs(20000);
  const viu = eLiniaColectorului(linieDeComanda(nou));
  let dinFisier = null; try { dinFisier = pidDinFisier(fs.readFileSync(path.join(rad, "data", "colector.pid"), "utf8")); } catch {}
  scrie(viu ? `Colectorul repornit: PID ${nou}, viu după 20 s${dinFisier === nou ? " (și în data\\colector.pid)" : ` (data\\colector.pid arată ${dinFisier || "nimic"})`}.`
    : `⚠ colectorul repornit (PID ${nou}) NU mai trăiește după 20 s — uită-te în data\\colector.log și pornește-l: PORNESTE-CRYPTO-RADAR.bat.`);
  return viu;
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
  // v100.214: o cale `main` nouă în radar-local.toml OPREȘTE serverul la aducere — wrangler urmărește configul, îl recitește și
  // moare dacă fișierul nu există (18.10 21:19:58, 1,5 min). ⇒ worker-ul se construiește din copie la calea nouă, ÎNAINTE de aducere.
  if (atinse.includes("radar-local.toml")) {
    const nou = mainDinToml(fs.readFileSync(path.join(dest, "radar-local.toml"), "utf8"));
    if (nou && !fs.existsSync(path.join(RAD, nou))) {
      const wrN = (String(JSON.parse(fs.readFileSync(path.join(dest, "package.json"), "utf8")).scripts?.dev || "").match(/wrangler@[\d.]+/) || ["wrangler@4.137.0"])[0];
      scrie(`radar-local.toml cere worker-ul la ${nou}, care nu există în principal ⇒ îl construiesc ÎNAINTE de aducere (altfel serverul 8788 se oprește)…`);
      if (!ruleaza(dest, "npx", ["--yes", wrN, "pages", "functions", "build", "functions", "--outdir", path.join(RAD, path.dirname(nou)), "--compatibility-date=2026-01-01"])) {
        scrie("⚠ construirea a PICAT — NU aduc principalul (serverul s-ar opri). Codul e pe GitHub; repară și rulează iar.");
        return 2;
      }
    }
  }
  const m = git(RAD, "merge", "--ff-only", "origin/main");
  if (!m.ok) {
    // 15.10.2026: mesajul lui git era gol („nu forțez:” și nimic) ⇒ spun ce anume îl ține: commit-urile locale nepublicate
    const locale = git(RAD, "log", "--oneline", "origin/main..main").out;
    scrie(`Principalul nu se poate aduce prin avans simplu — nu forțez. ${locale ? `Are commit-uri locale nepublicate (altă sesiune le urcă acum?):\n  ${locale.split(/\r?\n/).join("\n  ")}` : m.err || "(git n-a spus de ce)"}\nCodul tău e pe GitHub; principalul îl primește când ele urcă (git pull --rebase origin main, apoi push).`);
    return 2;
  }
  scrie(`Principalul adus la ${git(RAD, "rev-parse", "--short", "HEAD").out}${ale.length ? ` (modificările necomise ale altora, pe alte fișiere, au rămas: ${ale.length})` : ""}.`);
  // audit 19.10: codul colectorului atins ⇒ repornit acum, din principal (nu doar sfatul de mai jos)
  if (trebuieRepornitColectorul(atinse)) {
    if (process.platform !== "win32" || process.env.COPIE_FARA_COLECTOR || !fs.existsSync(path.join(RAD, "scripts", "colector.mjs"))) scrie("Ai atins colectorul ⇒ repornește-l ca să ia codul nou.");
    else { scrie("Ai atins colectorul (scripts/colector.mjs, scripts/lib/ sau public/lib/) ⇒ îl repornesc din principal…"); repornesteColectorul(RAD); }
  }
  if (atinse.some((x) => x.startsWith("public/")) && fs.existsSync(path.join(RAD, "scripts", "proba-ecran-telefon.mjs"))) {
    scrie("Ai atins public/ ⇒ proba de telefon pe serverul de acasă (8788 servește principalul)…");
    if (!ruleaza(RAD, "node", ["scripts/proba-ecran-telefon.mjs"])) scrie("⚠ proba de telefon a PICAT pe principal — uită-te acum (codul e publicat).");
  }
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
