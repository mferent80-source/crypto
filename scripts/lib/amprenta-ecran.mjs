// v100.376 („fa idei”, 21.11.2026): ștampila probelor de ecran. Probele cu browser (proba-ecran-tablou.mjs, proba-ecran-telefon.mjs) NU intră în
// `npm test` (lanțul nu deschide niciun browser) - le rulează poarta de dinaintea împingerii. Pe 21.11 două pași ai probei Tabloului picau de câteva
// ore dintr-o schimbare de așezare, iar lanțul era verde: s-a aflat din întâmplare. De acum, proba care trece ÎNTREAGĂ își scrie amprenta fișierelor
// de ecran, iar lanțul spune, pe ultimul lui rând, dacă proba a fost rulată pe fișierele de acum (scripts/stare-probe-ecran.mjs - doar spune, nu pică:
// poarta de împingere rămâne cea care oprește).
// Ștampila stă în dosarul temporar al sistemului, pe depozit (nu murdărește copia de lucru și nu ajunge în git).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export const PROBE_ECRAN = [
  { fisier: "proba-ecran-tablou.mjs", nume: "proba de ecran a Tabloului", cat: "~1 min" },
  { fisier: "proba-ecran-telefon.mjs", nume: "proba de telefon", cat: "~3 min" },
];
// fișierele de care ține ce se vede: pagina, foaia, codul paginii și bibliotecile ei
export function fisiereEcran(rad) {
  const pub = path.join(rad, "public"), sus = fs.readdirSync(pub).filter((f) => /\.(html|css|js)$/.test(f)).sort().map((f) => "public/" + f);
  const lib = fs.existsSync(path.join(pub, "lib")) ? fs.readdirSync(path.join(pub, "lib")).filter((f) => f.endsWith(".js")).sort().map((f) => "public/lib/" + f) : [];
  return sus.concat(lib);
}
export function amprenta(rad, proba) {
  const h = crypto.createHash("sha256");
  for (const f of fisiereEcran(rad).concat(["scripts/" + proba])) { h.update(f + "\n"); h.update(fs.readFileSync(path.join(rad, f))); }
  return h.digest("hex").slice(0, 16);
}
export function caleStampila(rad, proba, dosar) {
  const d = crypto.createHash("sha256").update(path.resolve(rad).toLowerCase()).digest("hex").slice(0, 10);
  return path.join(dosar || os.tmpdir(), "crypto-radar-ecran-" + d + "-" + proba.replace(/[^a-z0-9]+/gi, "_") + ".json");
}
export function scrieStampila(rad, proba, extra, dosar) {
  const s = Object.assign({ amprenta: amprenta(rad, proba), la: Date.now() }, extra || {});
  fs.writeFileSync(caleStampila(rad, proba, dosar), JSON.stringify(s)); return s;
}
// starea unei probe față de fișierele de acum: { rulata, laZi, la }
export function stare(rad, proba, dosar) {
  let s = null; try { s = JSON.parse(fs.readFileSync(caleStampila(rad, proba, dosar), "utf8")); } catch { s = null; }
  if (!s || typeof s.amprenta !== "string") return { rulata: false, laZi: false, la: null };
  return { rulata: true, laZi: s.amprenta === amprenta(rad, proba), la: Number(s.la) > 0 ? Number(s.la) : null };
}
// serverul probei servește chiar fișierele depozitului ăsta? (altfel proba a măsurat altă copie și ștampila ar minți)
export async function servesteDepozitul(rad, url, aduce) {
  const f = aduce || fetch;
  for (const n of ["app.css", "app.js", "lib/asezare-paznic.js"]) {
    let servit; try { const r = await f(String(url).replace(/\/+$/, "") + "/" + n, { cache: "no-store" }); if (!r.ok) return false; servit = Buffer.from(await r.arrayBuffer()); } catch { return false; }
    if (!servit.equals(fs.readFileSync(path.join(rad, "public", n)))) return false;
  }
  return true;
}
export function textStare(rad, dosar, acum) {
  const z = (n) => (n < 10 ? "0" : "") + n, ora = (t) => { const d = new Date(t); return z(d.getDate()) + "." + z(d.getMonth() + 1) + " " + z(d.getHours()) + ":" + z(d.getMinutes()); };
  const r = PROBE_ECRAN.map((p) => Object.assign({}, p, stare(rad, p.fisier, dosar)));
  const rest = r.filter((p) => !p.laZi);
  if (!rest.length) return { ok: true, text: "probele de ecran: rulate pe fișierele de acum (" + r.map((p) => p.nume + " " + ora(p.la)).join(" · ") + ")" };
  return { ok: false, text: "⚠ probele de ecran NU au fost rulate pe fișierele de acum: " + rest.map((p) => p.nume + (p.rulata ? " (ultima oară " + ora(p.la) + ", pe alte fișiere)" : " (niciodată aici)") + " ⇒ node scripts/" + p.fisier + " (" + p.cat + ")").join(" · ") + " · lanțul nu deschide niciun browser; poarta de împingere le rulează oricum" };
}
