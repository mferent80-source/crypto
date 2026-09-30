// v100.29 (30.09, el: „fa idei” - ideea 3): cand pornesti din Pionex un bot NOU pe o moneda unde pierzi (pe toata istoria),
// colectorul te anunta o data - avertizeaza, nu opreste nimic (pragul e un privilegiu). Bot nou = necunoscut pana acum si pornit
// in ultima ora (la prima pornire a colectorului, botii vechi nu se anunta). Istoria se cere o singura data pe tura, doar daca e nevoie.
export async function avertizariPornire({ boti, cunoscuti, acum, trades, Obiceiuri }) {
  const noi = (Array.isArray(boti) ? boti : []).filter((b) => b && b.id && !(cunoscuti && cunoscuti[b.id]) && b.activ !== false && Number(b.pornitLa) > acum - 3600000);
  if (!noi.length) return [];
  const t = await trades(), sub = Obiceiuri.subOOra(t), out = [];
  for (const b of noi) {
    const m = String(b.baza || "").toUpperCase().replace(/\.PERP$/, ""), im = Obiceiuri.istoricMoneda(t, m);
    if (!im.avertizare) continue;
    out.push({ bot: b.id, nivel: "atentie", titlu: m + ": bot nou pe o monedă unde pierzi", mesaj: im.text + (sub ? " " + sub.text : "") + " Nu te opresc — doar să știi." });
  }
  return out;
}
