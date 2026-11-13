// v100.337 (el, 13.11: „fa idei” - ideea 2 de după v100.336): alerta pe Discord când o poziție Trading 212 stă sub stopul calculat de prea
// multe ședințe. Episodul și cifra vin din aceleași funcții ca pagina T212 (ActiuniSemnale.asteptareSubStop / textAsteptare); aici doar
// treptele și mesajul. O alertă pe treaptă și pe episod (5, 10, 20, 40 de ședințe): prima vedere la 27 de ședințe dă o singură alertă
// (treapta 20), nu trei. Episod nou = altă zi de început ⇒ de la capăt. Radarul avertizează, nu vinde nimic. Probat în scripts/proba-v100337-idei.mjs.
import "./text-ro-global.mjs";   // TextRo.cate - „de” de la 20 și singularul la 1, o singură regulă în tot softul (v10075)
export const TREPTE = [5, 10, 20, 40];

// cea mai mare treaptă atinsă; sub 5 ⇒ 0
export function treapta(sedinte) {
  const n = Number(sedinte) || 0; let t = 0;
  for (const x of TREPTE) if (n >= x) t = x;
  return t;
}

// stare = { de, treapta, la } ținută pe poziție (ultima treaptă anunțată, episodul și ora anunțului); a = episodul de acum
// (asteptareSubStop) sau null; acum = ora ⇒ treapta de anunțat acum, 0 = nimic.
// Revizia: starea NU se șterge când prețul trece peste stop în ședință (stopAtins e pe prețul viu, episodul pe barele închise) - altfel aceeași
// treaptă pleca la fiecare revenire sub stop. Aceeași treaptă (sau una mai mică) tace în același episod și 5 zile după anunț, chiar dacă ziua
// de început s-a mutat (stopul ales - profil / −15% - se poate schimba); după 5 zile, cu altă zi de început, e un episod nou.
const ZI = 864e5, LINISTE_ZILE = 5;
export function deAnuntat(stare, a, acum) {
  if (!a || !(a.sedinte > 0)) return 0;
  const t = treapta(a.sedinte); if (!t) return 0;
  if (stare && Number(stare.treapta) >= t && (stare.de === a.de || (Number(acum) || 0) - (Number(stare.la) || 0) < LINISTE_ZILE * ZI)) return 0;
  return t;
}

// ca t212AsteptareLei din pagina T212: valoarea de acum a poziției × (1 − ieșirea de atunci / prețul de acum); fără ieșire / valoare ⇒ null
export function asteptareLei(a, pret, valLei) {
  if (!a || !(a.pretIesire > 0) || !(pret > 0) || !(valLei > 0)) return null;
  return valLei * (1 - a.pretIesire / pret);
}

const cate = (n, sg, pl) => TextRo.cate(n, sg, pl);

// { simbol, a (episodul), text (ActiuniSemnale.textAsteptare), t (treapta) } ⇒ alerta colectorului
export function mesajAsteptare(o) {
  const a = o.a || {}, simbol = String(o.simbol || "Poziția");
  const urm = TREPTE.find((x) => x > (Number(o.t) || 0));
  return {
    nivel: "atentie",
    titlu: simbol + ": sub stopul calculat de " + cate(Number(a.sedinte) || 0, "ședință", "ședințe"),
    mesaj: (o.text ? String(o.text) + "\n" : "") +
      "Pe pagina Trading 212 poziția e la IEȘI. Radarul doar avertizează: decizia e a ta." +
      (urm ? " Următorul mesaj, dacă rămâne sub stop: la " + cate(urm, "ședință", "ședințe") + "." : ""),
  };
}
