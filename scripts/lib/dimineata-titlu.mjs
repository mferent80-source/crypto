// Rândul-verdict din capul rezumatului de dimineață (v101.62, I-526): o frază din ACELEAȘI date - boții pe agitație / calm (starea Busolei pe
// 4h, „dovedită” doar când bilanțul pazei e „dovedit”), acțiunile pe revenire cu eticheta istoricului lor, câte poziții sunt de ieșit.
// ≤ 160 (garda „raport”); ce lipsește (fără boți, fără lista de revenire) se lasă afară, nimic inventat; nimic de spus ⇒ null.
import "./text-ro-global.mjs";

const cate = (n, sg, pl) => globalThis.TextRo.cate(n, sg, pl);
export function titluDimineata({ boti, bilant, reveniri, eticheta, deIesit } = {}) {
  const l = Array.isArray(boti) ? boti.filter((b) => b && b.stare) : [], ag = l.filter((b) => b.stare === "miscare").length, calm = l.filter((b) => b.stare === "liniste").length;
  const parti = (cuEticheta) => {
    const p = [];
    if (l.length) {
      const a = ag ? cate(ag, "bot", "boți") + (bilant === "dovedit" ? " pe agitație dovedită" : " pe agitație") : null, c = calm ? (ag ? String(calm) : cate(calm, "bot", "boți")) + " pe calm" : null;
      p.push([a, c].filter(Boolean).join(", ") || "niciun bot pe agitație");
    }
    if (Number.isFinite(reveniri)) p.push(reveniri ? cate(reveniri, "acțiune", "acțiuni") + " pe revenire" + (cuEticheta && eticheta ? ", istoricul " + eticheta : "") : "nicio acțiune pe revenire");
    if (Number.isFinite(deIesit)) p.push(deIesit ? cate(deIesit, "poziție", "poziții") + " de ieșit" : "nimic de ieșit");
    return p;
  };
  const p = parti(true); if (!p.length) return null;
  let t = "Azi: " + p.join(" · ");
  if (t.length > 160) t = "Azi: " + parti(false).join(" · ");
  return t.length <= 160 ? t : t.slice(0, 159) + "…";
}
