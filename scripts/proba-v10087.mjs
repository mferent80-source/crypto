// Proba v100.87 (03.10, el: „ok” pe nota propusă după poza de la 10:55 - Q era și „pe revenire (bot long)”, și „pentru short”):
// o monedă aflată în AMBELE liste ale Tabloului primește pe fiecare rând „Aș sări peste ea: …” (semnale opuse); celelalte rânduri,
// neatinse. Listele tot nu se filtrează între ele (specul) - doar spun pe față când se bat cap în cap.
import "./lib/text-ro-global.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { verifica } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const fnDin = (f, nume) => { const s = lib(f), i = s.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în " + f); const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)();
const R = new Function(`${lib("reveniri.js")}; return Reveniri;`)();
const AS = new Function(`${lib("actiuni-semnale.js")}; return ActiuniSemnale;`)();
const ID = new Function("ActiuniSemnale", `${lib("idei.js")}; return Idei;`)(AS);
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let ok = 0, pica = 0;
async function test(nume, f) { try { await f(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
console.log("Proba v100.87 · Tabloul: moneda din AMBELE liste (revenire long + short) ⇒ „Aș sări peste ea” pe fiecare rând al ei");

// rândurile listelor, fiecare cu moneda și textul lui (în ordinea din pagină: întâi revenirea, apoi shortul)
const randuri = (h) => String(h).split('<div class="tbTodoRand">').slice(1).map((r) => ({ moneda: (r.match(/<b>([^<]+)<\/b>/) || [])[1], text: text(r), dir: (r.match(/Fișa \((long|short)\)/) || [])[1] }));
const REV = (o) => ({ cadere: 0.62, deLaMin: 0.28, zileDeLaMin: 6, revine: true, ...o });
const CL = { la: 5, monede: [
  { simbol: "AKE_USDT_PERP", volum: 90, stare: "evita", dir: "long", scor: 9, revenire: REV({ cadere: 0.79, deLaMin: 0.18, zileDeLaMin: 5 }) },
  { simbol: "Q_USDT_PERP", volum: 30, stare: "candidat", dir: "short", tarie: "mediu", scor: 5, latime: 0.1797, profitGrila: 0.0026, traversariZi: 24, revenire: REV() },
  { simbol: "LIT_USDT_PERP", volum: 50, stare: "candidat", dir: "short", tarie: "mediu", scor: 7, latime: 0.1661, profitGrila: 0.0026, traversariZi: 32, revenire: REV({ revine: false }) } ] };
const PE_REV = "Aș sări peste ea: e și în lista pentru short, deci semnalele se bat cap în cap.";
const PE_SH = "Aș sări peste ea: e și pe revenire (bot long), deci semnalele se bat cap în cap.";

// v100.295 (el, 02.11: „da scoate-le și de pe Tablou”): listele de revenire / short scoase din Tablou ⇒ nota n-are unde apărea
await test("(1) v100.295: Tabloul fără listele de revenire / short ⇒ fără nota „Aș sări peste ea” pe rândurile lor; tbSugestiiCorp nu mai există", () => {
  const s = lib("t212-ecran.js");
  assert.doesNotMatch(s, /function tbSugestii(Html|Corp)\(/); assert.ok(!s.includes(PE_REV) && !s.includes(PE_SH));
});
await test("(2) cele două fraze trec regulile gărzii pentru o acțiune („faCe”: persoana I, o frază, ≤ 110)", () => {
  for (const t of [PE_REV, PE_SH]) assert.deepEqual(verifica(t, "faCe"), [], t);
});
await test("(3) nota iese în culoarea de avertisment: regula `#tabloubot .tbTodoRand p.tbWarn` bate gri-ul rândului (`#tabloubot .tbTodoRand p`; măsurat pe pagină: gri înainte, galben după)", () => {
  const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.ok(css.includes("#tabloubot .tbTodoRand p{") && css.includes("#tabloubot .tbTodoRand p.tbWarn{color:var(--warn)}"));
  assert.ok(css.indexOf("#tabloubot .tbTodoRand p.tbWarn{") > css.indexOf("#tabloubot .tbTodoRand p{"), "după regula gri (aceeași specificitate + clasa ⇒ câștigă oricum, dar ordinea o face evidentă)");
});

console.log("\n" + (pica ? "V100.87 PICA · " + pica + " din " + (ok + pica) : "V100.87 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
