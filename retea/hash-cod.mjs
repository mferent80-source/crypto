// v100.96 (ideea 3 / revizia 🔵12): hash-ul codului FĂRĂ texte - comentariile, conținutul șirurilor și spațiile nu intră în el; o livrare
// care schimbă doar texte (rândurile paginii, comentarii) nu mai aruncă lunile judecate din cache (prima noapte nu mai rejudecă tot).
// Logica scrisă în șiruri (cheile țintelor) rămâne nevăzută - de aceea VERSIUNE și hiperparametrii stau separat în cheia cache-ului, iar
// regex-urile cu ghilimele sunt interzise în fișierele din hash (proba v100.96 (3) o păzește).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function normalizeazaCod(src) {
  return String(src).replace(/\r\n/g, "\n")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\])\/\/[^\n]*/gm, "$1")
    .replace(/\s+/g, " ").trim();
}

export function hashCod(rad, fisiere) {
  return crypto.createHash("sha1").update(fisiere.map((f) => normalizeazaCod(fs.readFileSync(path.join(rad, f), "utf8"))).join("\n")).digest("hex");
}
