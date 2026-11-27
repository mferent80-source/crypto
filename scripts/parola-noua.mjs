// v100.396 (I-954, auditul 26.11): parola aplicației (APP_API_TOKEN) generată, nu aleasă de om. Auditul: avea 10 semne și era singura barieră pentru
// orice aparat din tailnet (și PC-urile caselor din magazine); cu ea se scrie config-ul (canalul alertelor, frâna).
// Lansatorul (scripts/vps/porneste-radar.ps1, PORNESTE-CRYPTO-RADAR.bat) o cheamă ÎNAINTE de pornirea serverului: parola sub 24 de semne (sau lipsă)
// ⇒ una nouă de 40 de semne aleatoare (crypto.randomBytes, base64url), .dev.vars-ul vechi păstrat ca .dev.vars.bak-<ora>, parola nouă scrisă și în
// data/parola-noua.txt (de acolo o tastezi O SINGURĂ dată pe telefon și pe PC). Serverul și colectorul o citesc la pornire din .dev.vars.
// Parola de 24+ semne rămâne neatinsă (nimic de făcut). `--forteaza` schimbă și o parolă bună.
//   node scripts/parola-noua.mjs [cale/.dev.vars] [--forteaza]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const MIN_SEMNE = 24, SEMNE_NOI = 40;
export function genereaza(n = SEMNE_NOI) { return crypto.randomBytes(Math.ceil(n * 3 / 4) + 3).toString("base64url").slice(0, n); }
export function parolaDin(text) { const m = /^APP_API_TOKEN=(.*)$/m.exec(String(text || "")); return m ? m[1].replace(/\r$/, "").trim().replace(/^"(.*)"$/, "$1") : null; }
// înlocuiește (sau adaugă) rândul APP_API_TOKEN, păstrând capetele de rând ale fișierului (CRLF pe Windows)
export function cuParola(text, parola) {
  const t = String(text || ""), nl = /\r\n/.test(t) ? "\r\n" : "\n";
  if (/^APP_API_TOKEN=.*$/m.test(t)) return t.replace(/^APP_API_TOKEN=.*?(\r?)$/m, (_, r) => "APP_API_TOKEN=" + parola + r);
  return (t && !t.endsWith(nl) ? t + nl : t) + "APP_API_TOKEN=" + parola + nl;
}
// hotărârea, pură: { schimba, motiv }
export function trebuieSchimbata(parola, forteaza) {
  if (forteaza) return { schimba: true, motiv: "cerută (--forteaza)" };
  if (!parola) return { schimba: true, motiv: "lipsește" };
  if (parola.length < MIN_SEMNE) return { schimba: true, motiv: "are " + parola.length + " semne (sub " + MIN_SEMNE + ")" };
  return { schimba: false, motiv: "are " + parola.length + " semne - rămâne" };
}
// revizia 27.11 (🟠8): colectorul citește parola o singură dată, la pornire ⇒ cu el pornit, o parolă nouă l-ar lăsa orb (401 la tot) până la o
// repornire de mână. Deci: colector viu (data/colector.pid cu bătaie de sub 10 minute și procesul există) ⇒ NU schimb; la livrare colectorul e
// oprit întâi, apoi pornit după server, cu parola nouă.
export function colectorViu(dataDir, acum = Date.now()) {
  let t = ""; try { t = fs.readFileSync(path.join(dataDir, "colector.pid"), "utf8"); } catch { return 0; }
  const [pid, la] = t.split(/\s+/).map(Number); if (!pid || !(acum - (la || 0) < 10 * 60000)) return 0;
  try { process.kill(pid, 0); return pid; } catch (e) { return e && e.code === "EPERM" ? pid : 0; }
}
export function ruleaza(fis, o = {}) {
  const acum = o.acum || Date.now(), text = fs.existsSync(fis) ? fs.readFileSync(fis, "utf8") : "", h = trebuieSchimbata(parolaDin(text), !!o.forteaza);
  if (!h.schimba) return { schimbat: false, motiv: h.motiv };
  const viu = colectorViu(o.dataDir || path.join(path.dirname(fis), "data"), acum);
  if (viu) return { schimbat: false, motiv: h.motiv + ", dar colectorul rulează (PID " + viu + ") - o schimb doar cu el oprit (la livrare)" };
  const nou = genereaza(), cop = fis + ".bak-" + new Date(acum).toISOString().replace(/[:.]/g, "-");
  if (text) fs.copyFileSync(fis, cop);
  const tmp = fis + ".tmp"; fs.writeFileSync(tmp, cuParola(text, nou)); fs.renameSync(tmp, fis);
  if (parolaDin(fs.readFileSync(fis, "utf8")) !== nou) throw new Error("parola nouă nu s-a scris în " + fis + " (copia: " + cop + ")");
  const dataDir = o.dataDir || path.join(path.dirname(fis), "data"); fs.mkdirSync(dataDir, { recursive: true });
  const txt = path.join(dataDir, "parola-noua.txt");
  fs.writeFileSync(txt, "Parola nouă a aplicației Crypto Radar (" + new Date(acum).toISOString() + "; motiv: parola veche " + h.motiv + "):\r\n" + nou + "\r\nO tastezi o singură dată pe telefon și pe PC (Setări → parola aplicației), apoi poți șterge fișierul.\r\n");
  return { schimbat: true, motiv: h.motiv, copie: text ? cop : null, fisierParola: txt, parola: nou };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const arg = process.argv.slice(2), fis = path.resolve(arg.find((a) => !a.startsWith("--")) || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".dev.vars"));
  try {
    const r = ruleaza(fis, { forteaza: arg.includes("--forteaza") });
    console.log(r.schimbat ? "parola aplicației: " + r.motiv + " ⇒ una nouă de " + SEMNE_NOI + " de semne, în " + r.fisierParola + " (o tastezi o dată pe telefon și pe PC, apoi ștergi fișierul)" + (r.copie ? " (cea veche: " + r.copie + ")" : "") : "parola aplicației " + r.motiv);
  } catch (e) { console.log("parola aplicației: EROARE " + e.message); process.exitCode = 1; }
}
