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
// v100.70 (revizia pachetului 3, I4): faptul din CIFRELE istoricului - im.text + sub.text aveau 3 fraze, 235 de caractere si sume cu punct;
// comisioanele primei ore si sfatul ei raman pe poarta de pornire (linkul de pe randul 2)
const U2 = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",");
const ziua = (t) => { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit" }).format(new Date(t)); } catch { return ""; } };
export function mesajPornire(b, m, im, sub, tk, url) {
  const t = (s) => String(s || "").replace(/\.\s*$/, ""), n = Number(im && im.n);
  const baza = n > 0 && Number.isFinite(Number(im.net)) ? (im.rata >= 0.5 ? "Pe " + m + " pierderile mari mănâncă tot: " : "Pe " + m + " pierzi: ") + n + " boți, " + im.plus + " pe plus, net " + U2(im.net) + " USDT"
      + (im.rau && im.rau.v < 0 ? ", cel mai rău " + U2(im.rau.v) + (ziua(im.rau.t) ? " (" + ziua(im.rau.t) + ")" : "") : "")
    : t(im && im.text);
  const fapt = baza + (sub && Number(sub.n) > 0 && Number.isFinite(Number(sub.net)) ? "; în prima oră, boții tăi: " + U2(sub.net) + " USDT pe " + sub.n : "") + ".";
  return { bot: b.id, nivel: "atentie", titlu: m + ": bot nou pe o monedă unde pierzi",
    mesaj: fapt + "\n👉 " + (url ? "Aș verifica întâi poarta pe " + tk + ": " + url : "Aș verifica întâi poarta de pornire pe " + m + ", în Radar.") };
}
