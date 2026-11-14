// M5 (regimul pentru grid, docs/cercetare/2026-11-13-tablou-acuratete.md): etichetele de la bara i, socotite DOAR din barele ≤ i.
// Stau într-o funcție aparte ca proba să le poată verifica mecanic (scripts/proba-v100340-a.mjs): cu barele de după i stricate sau tăiate,
// etichetele de la i trebuie să iasă aceleași. Folosită de scripts/cercetare-v100339-acuratete.mjs (--ce=m5).
//   o = { k: barele [t, o, h, l, c, v], cl: închiderile lor, i, FER: fereastra lui calc, C: motorul paginii (C.calc), RegimGrid, Directie,
//         orizont: orizontul becului pe intervalul acela, msTf: durata unei bare, inCalc: barele în forma lui calc }
//   ⇒ { trend: "trend" | "lateral" | "tranzitie" | null, vol: "ridicata" | "joasa" | "normala" | null, bec: "lateral" | "directie" | null } sau null
export function etichetaM5(o) {
  const w = o.k.slice(o.i - o.FER + 1, o.i + 1), q = o.C.calc(o.inCalc(w), "auto"); if (!q) return null;
  const reg = o.RegimGrid.clasifica(o.cl, o.i, q.adx), u = w[w.length - 1];
  const an = o.Directie.analizeaza(w.concat([[u[0] + o.msTf, u[4], u[4], u[4], u[4], 0]]), o.orizont, null);   // becul, ca în M4 (o bară-fantomă în curs)
  return { trend: reg.trend, vol: reg.vol, bec: an && an.dir ? (an.dir === "lateral" ? "lateral" : "directie") : null };
}
