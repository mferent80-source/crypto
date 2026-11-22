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
// v100.377: `/health` nu mai există pe serverul local de la v100.211 (wrangler dev cu Worker pre-construit dă 404 la căi necunoscute; `pages dev`
// întorcea pagina). Poarta sărea de atunci TOATE probele de ecran, cu „serverul 8788 nu rulează”, iar mesajul ei nu ajungea în jurnalul livrării
// (găsit pe 22.11.2026, după o livrare la care probele de ecran rulaseră doar după publicare). Adresa adevărată e cea a rutei market.
export const ADRESA_SANATATE = "http://127.0.0.1:8788/api/market?type=health";

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

// v100.377: de ce sare poarta probele și ce e de făcut. Până acum scria „serverul 8788 nu rulează” și când serverul răspundea 404 la adresa de
// sănătate (o lună nu s-a aflat). `fel`: "oprit" (nicio legătură) · "stare" (răspunde, dar nu 200) · "alta-versiune" (servește alt cod).
export function comandaServer(rad) {
  const m = rad ? /^crypto-lucru-([a-z0-9][a-z0-9-]*)$/.exec(path.basename(path.resolve(String(rad)))) : null;
  return m ? `node scripts/copie-de-lucru.mjs server ${m[1]}` : "PORNESTE-CRYPTO-RADAR.bat";
}
export function textSarit(fel, d) {
  d = d || {}; const cum = " ⇒ probele de ecran NU au rulat. Pornește serverul: " + comandaServer(d.rad) + ", apoi împinge din nou (sau rulează-le de mână: node scripts/proba-ecran-telefon.mjs, node scripts/proba-ecran-tablou.mjs).";
  if (fel === "stare") return `[pre-push] probele de ecran: sărite - serverul de pe 8788 răspunde HTTP ${d.stare} la ${ADRESA_SANATATE}` + cum;
  /* auditul 22.11: același număr de versiune, dar alte fișiere (două copii urcate la aceeași versiune) - probele ar fi măsurat codul celeilalte */
  if (fel === "alte-fisiere") return `[pre-push] probele de ecran: sărite - serverul de pe 8788 are aceeași versiune (${d.depozit || "?"}), dar servește ALTE fișiere decât depozitul din care împingi (altă copie?)` + cum;
  if (fel === "alta-versiune") return `[pre-push] probele de ecran: sărite - serverul de pe 8788 servește ${d.servit || "?"}, iar depozitul din care împingi are ${d.depozit || "?"} (probele ar măsura alt cod)` + cum;
  return "[pre-push] probele de ecran: sărite - serverul de pe 8788 nu răspunde" + cum;
}

const versiunea = (html) => (/<meta content="(v[\d.]+)" name="app-version"/.exec(String(html || "")) || [])[1] || "";
export function aceeasiVersiune(servit, depozit) { const a = versiunea(servit); return !!a && a === versiunea(depozit); }

// auditul 22.11: numărul versiunii nu ajunge - serverul trebuie să servească octet cu octet fișierele depozitului (aceeași verificare ca la ștampila probelor)
export async function servesteAcestDepozit(rad, url, aduce) {
  try { const AE = await import("./lib/amprenta-ecran.mjs"); return await AE.servesteDepozitul(rad, url || "http://127.0.0.1:8788", aduce); } catch { return false; }
}
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
  let servit = "", stare = null;
  try {
    const h = await fetch(ADRESA_SANATATE, { signal: AbortSignal.timeout(3000) }); stare = h.status;
    if (h.ok) servit = await (await fetch("http://127.0.0.1:8788/", { signal: AbortSignal.timeout(5000) })).text();
  } catch {}
  if (!servit) { console.log(textSarit(stare !== null && stare !== 200 ? "stare" : "oprit", { stare, rad: RAD })); return 0; }
  const depozit = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8");
  if (!aceeasiVersiune(servit, depozit)) { console.log(textSarit("alta-versiune", { servit: versiunea(servit), depozit: versiunea(depozit), rad: RAD })); return 0; }
  if (!(await servesteAcestDepozit(RAD))) { console.log(textSarit("alte-fisiere", { depozit: versiunea(depozit), rad: RAD })); return 0; }
  for (const p of probeDeEcran(process.env)) {
    if (p.sari) { console.log(`[pre-push] ${p.nume}: sărită (${p.ocolire}=1)`); continue; }
    console.log(`[pre-push] ${p.nume} pe ${versiunea(depozit)} (${p.cat})…`);
    const r = spawnSync(process.execPath, [path.join(RAD, "scripts", p.fisier)], { cwd: RAD, stdio: "inherit" });
    if (r.status !== 0) { console.log(`[pre-push] ${p.nume} a PICAT - push oprit. (ocolire, doar dacă știi de ce: ${p.ocolire}=1)`); process.exit(r.status === null ? 1 : r.status); }
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
