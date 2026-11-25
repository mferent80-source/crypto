// I-940 (auditul paginii botului, 24.11): Tabloul botului iese din public/app.js pe bucăți, în public/lib/tablou-*.js.
// Probele vechi taie funcțiile tb* din TEXTUL lui app.js; ca să nu se rupă la fiecare mutare, citesc „app.js-ul logic”:
// app.js + modulele Tabloului scoase din el, în ordinea din index.html (unde se încarcă ÎNAINTEA lui app.js).
//   cuTablou(text) — primește app.js deja citit de probă (cu cititorul ei: CRLF păstrat sau nu) și îi lipește modulele
//                    cu același fel de capăt de rând. Fără module în listă întoarce textul neschimbat.
// O funcție mutată se caută la fel: "function tbX(" e în textul întors. Proba v100388 ține lista în pas cu index.html și sw.js.
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
export const MODULE_TABLOU = ["tablou-mc.js", "tablou-kpi.js", "tablou-citire.js", "tablou-consilier.js"];

export function moduleTablou(rad = RAD) {
  return MODULE_TABLOU.map((f) => ({ f, text: fs.readFileSync(path.join(rad, "public", "lib", f), "utf8") }));
}

export function cuTablou(text, rad = RAD) {
  if (typeof text !== "string" || !MODULE_TABLOU.length) return text;
  const crlf = text.includes("\r\n"), E = crlf ? "\r\n" : "\n";
  const bucati = moduleTablou(rad).map((m) => (crlf ? m.text.replace(/\r?\n/g, "\r\n") : m.text.replace(/\r\n/g, "\n")));
  return [text].concat(bucati).join(E);
}
