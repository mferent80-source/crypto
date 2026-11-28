// v100.398 (I-974): garda de antete (scripts/garzi-v746.mjs, [headers]) numără orice adresă din JS-ul paginii drept CERERE și o cere în
// connect-src. O legătură de NAVIGARE (un <a href> spre alt site, deschis de om în filă nouă) nu e o cerere: connect-src nu o privește.
// Ca garda să nu fie nici ocolită (adresa scrisă pe bucăți), nici slăbită (domeniul pus în connect-src):
//   - lista SCRISĂ a domeniilor de navigare (mai jos); un domeniu nou se adaugă aici, la vedere;
//   - adresa trece DOAR lipită de `href="` ÎNTR-UN <a …> (o legătură pe care apasă omul), scrisă pe loc într-un șir de HTML; ținută într-o
//     variabilă, dată unui fetch / getJSON / location, sau pusă în href-ul altui element (<link rel="prefetch">, care chiar cere), e „rea”.
// Modul pur (fără fișiere): proba scripts/proba-v100398-agitate-idei.mjs îl încearcă pe surse scrise de mână.
export const NAVIGARE = ["https://www.tradingview.com"];
const ADRESA = /\b(https|wss):\/\/([A-Za-z0-9.-]+(?::\d+)?)/g;
// sursa unui fișier al paginii ⇒ { chemate: [adrese care NU sunt de navigare], navigare: [adrese de navigare folosite corect], rele: [{ adresa, loc, text }] }
export function adreseDinSursa(sursa, navigare = NAVIGARE) {
  const src = String(sursa == null ? "" : sursa), chemate = new Set(), nav = new Set(), rele = [];
  for (const m of src.matchAll(ADRESA)) {
    const adresa = m[1] + "://" + m[2];
    if (!navigare.includes(adresa)) { chemate.add(adresa); continue; }
    const deLa = src.lastIndexOf("<", m.index), eticheta = deLa >= 0 ? src.slice(deLa, m.index) : "";
    if (/^<a\s[^<>]*href="$/.test(eticheta)) nav.add(adresa);
    else rele.push({ adresa, loc: m.index, text: src.slice(Math.max(0, m.index - 30), m.index + 50).replace(/\s+/g, " ") });
  }
  return { chemate: [...chemate], navigare: [...nav], rele };
}
