// v100.387 (I-941, el: „fă tot” după auditul paginii botului): probele care verifică TEXTUL codului picau la orice câmp nou adăugat într-un apel
// (24.11: v100139 / v100140 / v100354 / v100145 / v100316 / v100317 au picat „de formă” când apelurile au primit totalPionex, linii, tbInstantaneu).
// Unealta caută apelul după nume și verifică doar CÂMPURILE CERUTE în argumentele lui — în orice ordine, cu oricâte câmpuri în plus.
//   apeluri(src, "tbMcSimuleaza")          ⇒ textele argumentelor fiecărui apel (paranteze echilibrate, ghilimelele sărite)
//   areApel(src, nume, ["n:500", …])       ⇒ true dacă măcar un apel are toate bucățile cerute (fără spații, ca în codul minificat de mână)
//   asertApel(src, nume, bucati, mesaj)    ⇒ aruncă o eroare care spune ce lipsește din apelul cel mai apropiat
//   areInLista(src, "ACTIUNI_PERMISE", ["tbRandToate", …]) ⇒ lista din new Set("a b c") le are pe toate (în orice ordine)
export function apeluri(src, nume) {
  const out = [], s = String(src || ""), cheie = nume + "(";
  for (let i = s.indexOf(cheie); i >= 0; i = s.indexOf(cheie, i + 1)) {
    const prev = i > 0 ? s[i - 1] : " "; if (/[\w$.]/.test(prev) && prev !== ".") continue;   /* „xtbMcSimuleaza(” nu e apelul */
    let a = 0, j = i + nume.length, q = null;
    for (; j < s.length; j++) {
      const c = s[j];
      if (q) { if (c === "\\") { j++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === "`") { q = c; continue; }
      if (c === "(") a++; else if (c === ")" && --a === 0) break;
    }
    if (j < s.length) out.push(s.slice(i + nume.length + 1, j));
  }
  return out;
}
const curat = (x) => String(x).replace(/\s+/g, "");
export function areApel(src, nume, bucati) { return apeluri(src, nume).some((a) => bucati.every((b) => curat(a).includes(curat(b)))); }
export function asertApel(src, nume, bucati, mesaj) {
  const l = apeluri(src, nume);
  if (!l.length) throw new Error((mesaj ? mesaj + ": " : "") + nume + "(…) nu apare deloc");
  const lipsa = l.map((a) => bucati.filter((b) => !curat(a).includes(curat(b)))).sort((x, y) => x.length - y.length)[0];
  if (lipsa.length) throw new Error((mesaj ? mesaj + ": " : "") + nume + "(…) n-are: " + lipsa.join(" · "));
}
export function areInLista(src, numeLista, cuvinte) {
  const m = new RegExp(numeLista + "\\s*=\\s*new Set\\(\\s*\"([^\"]*)\"").exec(String(src || "")); if (!m) return false;
  const l = new Set(m[1].split(/\s+/).filter(Boolean)); return cuvinte.every((c) => l.has(c));
}
