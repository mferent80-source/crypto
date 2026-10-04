// v100.96 (ideea 3 / revizia 🔵12): hash-ul codului FĂRĂ texte - comentariile, conținutul șirurilor și spațiile nu intră în el; o livrare
// care schimbă doar texte (rândurile paginii, comentarii) nu mai aruncă lunile judecate din cache (prima noapte nu mai rejudecă tot).
// Logica scrisă în șiruri (cheile țintelor) rămâne nevăzută - de aceea VERSIUNE și hiperparametrii stau separat în cheia cache-ului, iar
// regex-urile cu ghilimele, „//” sau „/*” sunt interzise în fișierele din hash (proba v100.96 (3) o păzește).
// Revizia 🔵3: O SINGURĂ trecere, primul token câștigă - un „/*” dintr-un comentariu „//”, o ghilimea dintr-un șir simplu sau un apostrof
// dintr-un bloc nu pot ascunde cod de după ele (patru treceri la rând le încurcau).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function normalizeazaCod(src) {
  return String(src).replace(/\r\n/g, "\n")
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\/\*[\s\S]*?\*\/|(?<![:\\])\/\/[^\n]*/g, (m) => (m[0] === '"' ? '""' : m[0] === "'" ? "''" : " "))
    .replace(/\s+/g, " ").trim();
}

export function hashCod(rad, fisiere) {
  return crypto.createHash("sha1").update(fisiere.map((f) => normalizeazaCod(fs.readFileSync(path.join(rad, f), "utf8"))).join("\n")).digest("hex");
}
