// Garda comentariilor (02.10, ideea din pachetul 1 al „sfaturilor concise”, cerută de el: „fă și ideile”): un `//` lipit DUPĂ cod
// la mijlocul unui rând înghite tot ce urmează pe rând - de 4 ori pana acum (01.10 ×2 in lib, 02.10 o aserțiune in proba-v99,
// si 30.09 trei aserțiuni in proba-v10038, gasite chiar de garda asta). Testele NU prind: proba ramane verde, doar verifica mai putin.
// Cum recunoaste: dupa `//`, o bucata care incepe ca o instructiune si se COMPILEAZA ca JavaScript (doar compilata, nu rulata), cu un
// apel cu punct (`x.y(`) sau cel putin doua instructiuni `…);`. Proza romaneasca din comentarii nu se compileaza.
// Un comentariu care chiar vrea sa arate cod: „garda-comentarii: ok” in el.
//   node scripts/garda-comentarii.mjs   -> eșec (exit 1) la orice rand gasit
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// unde incepe comentariul de rand (in afara sirurilor, template-urilor si regex-urilor simple); -1 daca nu e
export function inceputComentariu(l) {
  let q = null, esc = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "/" && l[i + 1] === "/") return i;
    if (c === "/" && l[i + 1] !== "*") {
      const inainte = l.slice(0, i).trimEnd(), p = inainte.slice(-1);
      if (!p || "(,=:[!&|?{};".includes(p) || /\b(return|typeof)$/.test(inainte)) {   // un regex literal: il sare intreg
        let j = i + 1, cls = false;
        for (; j < l.length; j++) { const d = l[j]; if (d === "\\") { j++; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) break; }
        i = j; continue;
      }
    }
  }
  return -1;
}
// doar COMPILEAZA (constructorul de functie async accepta si await / return); nu se ruleaza nimic
const Async = Object.getPrototypeOf(async function () {}).constructor;
const compileaza = (s) => { try { new Async(s); return true; } catch { return false; } };
// textul comentariului contine cod inghitit? intoarce bucata de cod sau null
export function codInghitit(t) {
  if (/garda-comentarii:\s*ok/.test(t)) return null;
  const re = /(?:^|[\s;])((?:assert|await|const|let|var|if|return)\b|[A-Za-z_$][\w$]*(?:\.[\w$]+)*\s*\()/g;
  let m;
  while ((m = re.exec(t))) {
    const s = t.slice(m.index + (m[0].length - m[1].length)).trim();
    if (s.length < 15 || !/\)\s*;/.test(s)) continue;
    if (!/[A-Za-z_$][\w$]*\.[\w$]+\s*\(/.test(s) && (s.match(/\)\s*;/g) || []).length < 2) continue;
    if (compileaza(s)) return s;
  }
  return null;
}
export function cauta(fisiere) {
  const gasite = [];
  for (const f of fisiere) {
    fs.readFileSync(path.join(RAD, f), "utf8").split(/\r?\n/).forEach((l, i) => {
      const k = inceputComentariu(l); if (k < 0) return;
      const s = codInghitit(l.slice(k + 2));
      if (s) gasite.push({ f, rand: i + 1, cod: s });
    });
  }
  return gasite;
}
export function fisiereDeVerificat() {
  const out = [];
  const adauga = (d, re) => { const p = path.join(RAD, d); if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) if (re.test(f)) out.push(path.join(d, f)); };
  adauga("scripts", /\.mjs$/); adauga("scripts/lib", /\.mjs$/); adauga("public/lib", /\.js$/); adauga("functions/api", /\.js$/); adauga("functions/_shared", /\.js$/);
  out.push("public/app.js", "public/sw.js");
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // auto-proba: cazul real (proba-v99, 02.10) se prinde; proza care se compileaza din intamplare nu
  const rau = `  assert.match(t, /sub gridul de jos cu 0,2%/);   // v100.61: fara majuscule de strigat assert.doesNotMatch(t, /-\\d,\\d% din interval/);`;
  const bun = ["  // un rand pregatit (ticker, simbol, pret, de); ctx: {inchise, piata, stiri, acum}", "  // bara deschisa (e in formare);", "  x = 1;   // v100.38: cu [,}] - `linii:botiNr(xo.row)-1` nu mai trece"];
  if (!codInghitit(rau.slice(inceputComentariu(rau) + 2))) { console.log("PICA · auto-proba: nu prinde cazul real"); process.exit(1); }
  for (const l of bun) if (codInghitit(l.slice(inceputComentariu(l) + 2))) { console.log("PICA · auto-proba: alarma falsa pe: " + l); process.exit(1); }
  const fis = fisiereDeVerificat(), g = cauta(fis);
  console.log("\nGarda comentariilor · " + fis.length + " fisiere\n");
  for (const x of g) console.log("  PICA " + x.f + ":" + x.rand + " · comentariul inghite: " + x.cod.slice(0, 160));
  console.log("\n" + (g.length ? "PICA · " + g.length + " randuri cu cod inghitit de un // lipit dupa cod (muta comentariul la capat sau foloseste /* */)" : "PASS · niciun // nu inghite cod") + "\n");
  if (g.length) process.exit(1);
}
