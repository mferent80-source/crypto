// v100.124 (el 07.10, „fa idei”): proba de telefon (proba-ecran-telefon.mjs) rulează SINGURĂ înainte de fiecare push care
// atinge public/ - chemat din .git/hooks/pre-push (copiat cu `npm run instaleaza-hook`). Motivul: v100.123 a avut o variantă care
// oprea TOT app.js la încărcare (TDZ) și n-o prindea nici npm test, nici node --check - doar proba de ecran.
// Sare (cu mesaj, fără să blocheze) când: nicio schimbare în public/, serverul 8788 nu rulează, serverul servește ALTĂ versiune
// decât depozitul (ex. push dintr-un worktree - ar verifica alt cod), sau SARI_PROBA_TELEFON=1.
// v100.341 (I-879): după proba de telefon rulează și proba de ecran a Tabloului (proba-ecran-tablou.mjs: stările Tabloului cu date de probă,
// ~30 s; fusese lăsată în urmă - 32 din 73 de pași picau din cauza probei, nu a paginii). Fiecare are ocolirea ei; prima picată oprește push-ul.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ZERO = /^0+$/;

// liniile de pe stdin ale lui pre-push: "<ref local> <sha local> <ref remote> <sha remote>" ⇒ intervalele de comparat
export function deVerificat(text) {
  const out = [];
  for (const rand of String(text || "").split(/\r?\n/)) {
    const p = rand.trim().split(/\s+/); if (p.length < 4) continue;
    const [, local, , remote] = p;
    if (ZERO.test(local)) continue;                       // ștergere de ramură
    out.push(ZERO.test(remote) ? `origin/main..${local}` : `${remote}..${local}`);
  }
  return out;
}

// probele de ecran ale porții, în ordinea rulării; `sari` = ocolită din mediu
export function probeDeEcran(env) {
  const e = env || {};
  return [
    { nume: "proba de telefon", fisier: "proba-ecran-telefon.mjs", ocolire: "SARI_PROBA_TELEFON", cat: "toate paginile la 390 px; ~3 min" },
    { nume: "proba de ecran a Tabloului", fisier: "proba-ecran-tablou.mjs", ocolire: "SARI_PROBA_ECRAN", cat: "stările Tabloului cu date de probă; ~30 s" },
  ].map((p) => Object.assign(p, { sari: e[p.ocolire] === "1" }));
}

const versiunea = (html) => (/<meta content="(v[\d.]+)" name="app-version"/.exec(String(html || "")) || [])[1] || "";
export function aceeasiVersiune(servit, depozit) { const a = versiunea(servit); return !!a && a === versiunea(depozit); }

async function main() {
  const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const probe = probeDeEcran(process.env);
  if (probe.every((p) => p.sari)) { console.log("[pre-push] probele de ecran: sărite (" + probe.map((p) => p.ocolire + "=1").join(", ") + ")"); return 0; }
  const intrare = fs.readFileSync(0, "utf8");
  const fisiere = new Set();
  for (const iv of deVerificat(intrare)) {
    const r = spawnSync("git", ["diff", "--name-only", iv], { cwd: RAD, encoding: "utf8" });
    for (const f of String(r.stdout || "").split(/\r?\n/)) if (f) fisiere.add(f);
  }
  if (![...fisiere].some((f) => f.startsWith("public/"))) { console.log("[pre-push] probele de ecran: sărite (nicio schimbare în public/)"); return 0; }
  let servit = "";
  try {
    const h = await fetch("http://127.0.0.1:8788/health", { signal: AbortSignal.timeout(3000) });
    if (h.ok) servit = await (await fetch("http://127.0.0.1:8788/", { signal: AbortSignal.timeout(5000) })).text();
  } catch {}
  if (!servit) { console.log("[pre-push] probele de ecran: sărite - serverul 8788 nu rulează (PORNESTE-CRYPTO-RADAR.bat)"); return 0; }
  const depozit = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8");
  if (!aceeasiVersiune(servit, depozit)) { console.log(`[pre-push] probele de ecran: sărite - serverul servește ${versiunea(servit) || "?"}, depozitul are ${versiunea(depozit) || "?"}`); return 0; }
  for (const p of probeDeEcran(process.env)) {
    if (p.sari) { console.log(`[pre-push] ${p.nume}: sărită (${p.ocolire}=1)`); continue; }
    console.log(`[pre-push] ${p.nume} pe ${versiunea(depozit)} (${p.cat})…`);
    const r = spawnSync(process.execPath, [path.join(RAD, "scripts", p.fisier)], { cwd: RAD, stdio: "inherit" });
    if (r.status !== 0) { console.log(`[pre-push] ${p.nume} a PICAT - push oprit. (ocolire, doar dacă știi de ce: ${p.ocolire}=1)`); process.exit(r.status === null ? 1 : r.status); }
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
