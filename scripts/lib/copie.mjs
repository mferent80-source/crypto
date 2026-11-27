// Copia de siguranta a datelor Radarului (v91): istoricul T212, verdictele, planurile, ideile stau in KV-ul
// local al serverului (.wrangler/state/v3/kv, ~1,4 MB) - doar pe discul PC-ului de acasa. O data pe zi, colectorul
// il copiaza in data/copii/kv-YYYY-MM-DD si pastreaza ultimele N zile.
// v100.396 (auditul 26.11 🟡, după pățania din 03.11: SQLite-ul KV copiat cât scria wrangler ⇒ indexuri stricate, chei duble): copia NU mai e
// cpSync pe dosarul viu. Fiecare .sqlite se ia cu `VACUUM INTO` dintr-o conexiune doar-citire (instantaneu consistent, cu tot ce stă în WAL; -wal /
// -shm nu se mai copiază) și se verifică cu PRAGMA integrity_check; bloburile (fișierele valorilor) se copiază înainte ȘI după instantaneu (cele noi
// din a doua trecere), ca orice blob la care trimite instantaneul să existe. Un .sqlite care nu se poate lua așa se copiază brut și se SPUNE
// (`neverificate`), nu se pierde tăcut. Fără node:sqlite (Node vechi): ca înainte, cu tot dosarul spus „neverificat”.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
let SQL;
function sqlite() { if (SQL === undefined) { try { SQL = req("node:sqlite"); } catch { SQL = null; } } return SQL; }
const E_SQLITE = /\.sqlite$/i, E_ANEXA = /\.sqlite-(wal|shm|journal)$/i;

// copiază fișierele care nu sunt SQLite; doarNoi = doar ce nu există încă în dst (a doua trecere a bloburilor)
function copiazaFisiere(src, dst, doarNoi) {
  fs.mkdirSync(dst, { recursive: true });
  for (const n of fs.readdirSync(src)) {
    const s = path.join(src, n), d = path.join(dst, n), st = fs.statSync(s);
    if (st.isDirectory()) { copiazaFisiere(s, d, doarNoi); continue; }
    if (E_SQLITE.test(n) || E_ANEXA.test(n)) continue;
    if (doarNoi && fs.existsSync(d)) continue;
    try { fs.copyFileSync(s, d); } catch (e) { if (!doarNoi) throw e; }   /* un blob șters între timp (a doua trecere) nu strică copia */
  }
}
function bazele(src, out = []) { for (const n of fs.readdirSync(src)) { const s = path.join(src, n); if (fs.statSync(s).isDirectory()) bazele(s, out); else if (E_SQLITE.test(n)) out.push(s); } return out; }
// instantaneul unei baze; null = bun și verificat, altfel motivul (copiată brut)
export function instantaneu(src, dst) {
  const S = sqlite(); fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!S) { fs.copyFileSync(src, dst); return "fără node:sqlite: copiată brut"; }
  let db = null;
  try { db = new S.DatabaseSync(src, { readOnly: true }); db.exec("VACUUM INTO '" + dst.replace(/'/g, "''") + "'"); db.close(); db = null; }
  catch (e) { try { if (db) db.close(); } catch {} try { fs.rmSync(dst, { force: true }); } catch {} fs.copyFileSync(src, dst); return "VACUUM INTO n-a mers (" + String(e && e.message || e).slice(0, 80) + "): copiată brut"; }
  let ok = false; try { const c = new S.DatabaseSync(dst, { readOnly: true }), r = c.prepare("PRAGMA integrity_check").get(); ok = !!r && Object.values(r)[0] === "ok"; c.close(); } catch {}
  return ok ? null : "integrity_check nu trece pe copie";
}

export function faCopie({ sursa, dest, zi, pastreaza = 14 }) {
  if (!fs.existsSync(sursa)) return { facut: false, motiv: "lipseste sursa" };
  fs.mkdirSync(dest, { recursive: true });
  const tinta = path.join(dest, "kv-" + zi);
  if (fs.existsSync(tinta)) return { facut: false, motiv: "deja facuta azi" };
  // v100.173 (auditul Opus): copia se face în .tmp și abia întreagă se redenumește — o copie căzută la jumătate nu mai rămâne „copia zilei”
  const tmp = tinta + ".tmp";
  fs.rmSync(tmp, { recursive: true, force: true });
  copiazaFisiere(sursa, tmp, false);
  const neverificate = [];
  for (const b of bazele(sursa)) { const m = instantaneu(b, path.join(tmp, path.relative(sursa, b))); if (m) neverificate.push(path.relative(sursa, b) + ": " + m); }
  copiazaFisiere(sursa, tmp, true);
  fs.renameSync(tmp, tinta);
  for (const n of fs.readdirSync(dest)) if (/^kv-\d{4}-\d{2}-\d{2}\.tmp$/.test(n)) fs.rmSync(path.join(dest, n), { recursive: true, force: true });   // v100.174: resturi de copii căzute
  const vechi = fs.readdirSync(dest).filter((n) => /^kv-\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  for (const n of vechi.slice(0, Math.max(0, vechi.length - pastreaza))) fs.rmSync(path.join(dest, n), { recursive: true, force: true });
  return { facut: true, tinta, neverificate };
}
