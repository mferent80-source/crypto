// v100.29 (30.09, el: „fa idei” - ideea 3): cand pornesti din Pionex un bot NOU pe o moneda unde pierzi (pe toata istoria),
// colectorul te anunta o data - avertizeaza, nu opreste nimic (pragul e un privilegiu). Bot nou = necunoscut pana acum si pornit
// in ultima ora (la prima pornire a colectorului, botii vechi nu se anunta). Istoria se cere o singura data pe tura, doar daca e nevoie.
// v100.33: + linkul spre poarta de pornire pe moneda aceea (…/#ecran=gridset&moneda=LIT) - tickerul din simbolPionex (botul
// „LIGHTER” -> LIT_USDT_PERP -> LIT); adresa Radarului se cere doar cand chiar e o alerta; fara adresa -> fara link.
export async function avertizariPornire({ boti, cunoscuti, acum, trades, Obiceiuri, adresa }) {
  const noi = (Array.isArray(boti) ? boti : []).filter((b) => b && b.id && !(cunoscuti && cunoscuti[b.id]) && b.activ !== false && Number(b.pornitLa) > acum - 3600000);
  if (!noi.length) return [];
  const t = await trades(), sub = Obiceiuri.subOOra(t), out = [];
  let baza;
  for (const b of noi) {
    const m = String(b.baza || "").toUpperCase().replace(/\.PERP$/, ""), im = Obiceiuri.istoricMoneda(t, m);
    if (!im.avertizare) continue;
    if (baza === undefined) { try { baza = adresa ? await adresa() : null; } catch { baza = null; } }
    const sp = String(b.simbolPionex || "").toUpperCase(), tk = /_USDT_PERP$/.test(sp) ? sp.replace(/_USDT_PERP$/, "") : m;
    const url = baza && /^[A-Z0-9]{1,20}$/.test(tk) ? String(baza).replace(/\/+$/, "") + "/#ecran=gridset&moneda=" + tk : null;
    out.push(mesajPornire(b, m, im, sub, tk, url));
  }
  return out;
}
// v100.66 (pachetul 3): textul avertizarii, intr-o functie - garda textelor il genereaza; im = Obiceiuri.istoricMoneda, sub = Obiceiuri.subOOra
// v100.68: faptul (istoria monedei, o fraza) + „👉 ” actiunea cu linkul spre poarta - avertizeaza, nu opreste nimic (pragul e un privilegiu)
export function mesajPornire(b, m, im, sub, tk, url) {
  const t = (s) => String(s || "").replace(/\.\s*$/, ""), fapt = t(im.text) + (sub && sub.text ? "; " + t(sub.text).charAt(0).toLowerCase() + t(sub.text).slice(1) : "") + ".";
  return { bot: b.id, nivel: "atentie", titlu: m + ": bot nou pe o monedă unde pierzi",
    mesaj: fapt + "\n👉 " + (url ? "Aș verifica întâi poarta pe " + tk + ": " + url : "Aș verifica întâi poarta de pornire pe " + m + ", în Radar.") };
}
