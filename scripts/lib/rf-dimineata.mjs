// Linia „📏 Range Filter 1h” din rezumatul de dimineață (colector v101.164, ideea I-810; el, 05.11.2026: „fa toate”): boții deschiși al
// căror Range Filter pe 1h s-a întors CONTRA direcției lor în ultimele 24 de bare (cam de ieri dimineață încoace). Doar informație: RF e
// NEDOVEDIT (proba din 04.11: direcția nimerește 48%, semnalul nu plătește după cost) ⇒ fără alertă separată, fără ton de alarmă.
// Aceeași citire ca pagina Range Filter din Radar (public/lib/range-filter.js), pe 500 de lumânări 1h închise.
// Revizia Opus (05.11): avertismentul stă în CAPUL liniei (Discord taie coada mesajelor lungi), necititele se spun (altfel o dimineață fără
// linie arăta ca „niciun bot contra”), refuzul Pionex oprește cererile, iar boții se grupează pe MONEDĂ (spot BTC_USDT + perp BTC_USDT_PERP).
import "./text-ro-global.mjs";   // TextRo.cate: „de” de la 20, singularul la 1 (garda din proba v100.75)
export const RF_FEREASTRA = 24;
const CAP = "nedovedit, doar de privit (nu de închis botul): ";

// intrari: [{ nume, directie: "LONG" | "SHORT", dir: 1 | -1 | 0, bareDir, eroare? }] ⇒ textul liniei (fără prefix) sau null
export function liniaRfContra(intrari, max) {
  max = max >= 80 ? max : 160;
  const toate = (intrari || []).filter((x) => x && (x.directie === "LONG" || x.directie === "SHORT"));
  const necitite = toate.filter((x) => x.eroare).length;
  const contra = toate.filter((x) => !x.eroare && ((x.dir === 1 && x.directie === "SHORT") || (x.dir === -1 && x.directie === "LONG"))
    && Number.isFinite(x.bareDir) && x.bareDir >= 0 && x.bareDir < RF_FEREASTRA).sort((a, b) => a.bareDir - b.bareDir);
  if (!contra.length) return necitite ? "n-am putut citi " + TextRo.cate(necitite, "monedă", "monede") + " din " + toate.length + " (Pionex a refuzat sau n-a dat lumânări) - nu știu dacă RF s-a întors contra" : null;
  const coada = necitite ? " · " + TextRo.cate(necitite, "monedă necitită", "monede necitite") : "";
  const bucati = contra.map((x) => x.nume + " (" + x.directie.toLowerCase() + ", RF în " + (x.dir === 1 ? "sus" : "jos") + " " + (x.bareDir === 0 ? "din ultima oră" : "de " + TextRo.cate(x.bareDir, "oră", "ore")) + ")");
  let t = "", pus = 0;
  for (const b of bucati) {
    const cand = t ? t + ", " + b : b, rest = bucati.length - pus - 1;
    if ((CAP + cand + (rest ? " +" + rest : "") + coada).length > max) break;
    t = cand; pus++;
  }
  if (!pus) t = TextRo.cate(contra.length, "bot", "boți") + " cu RF întors contra";
  else if (pus < bucati.length) t += " +" + (bucati.length - pus);
  return CAP + t + coada;
}

// boții deschiși (bot-orders) ⇒ o cerere 1h × 500 pe monedă (doi boți pe aceeași monedă = o cerere; LONG + SHORT pe aceeași monedă nu e
// „contra”), apoi liniaRfContra. Dependențele vin din colector (cere, simbolul Pionex și moneda botului, GridCalcul, RangeFilter) ⇒ proba le dă pe ale ei.
export async function liniaRangeFilterBoti({ boti, cere, simbol, moneda, GridCalcul, RangeFilter, max }) {
  const pe = new Map();
  for (const b of boti || []) {
    if (!b || b.activ === false) continue;
    const directie = String(b.directie || "").toUpperCase();
    if (directie !== "LONG" && directie !== "SHORT") continue;
    let p = null, cheie = null; try { p = simbol(b); cheie = typeof moneda === "function" ? moneda(b) : null; } catch { p = null; }
    if (!p) continue;
    const nume = String(b.baza || "").replace(/\.PERP$/, "").toUpperCase();
    cheie = String(cheie || nume || p).toUpperCase();
    const e = pe.get(cheie);
    if (e) { if (e.directie !== directie) e.ambele = true; continue; }
    pe.set(cheie, { nume: nume || cheie, directie, pionex: p, ambele: false });
  }
  const intrari = [];
  let refuz = false;
  for (const e of pe.values()) {
    if (e.ambele) continue;
    if (refuz) { intrari.push({ nume: e.nume, directie: e.directie, eroare: "necerută după refuz" }); continue; }
    try {
      const k = await cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(e.pionex) + "&interval=60M&limit=500");
      if (k && k.result === false) { refuz = true; intrari.push({ nume: e.nume, directie: e.directie, eroare: "Pionex a refuzat" }); continue; }
      const bare = GridCalcul.bare(k && k.data && k.data.klines), c = bare && bare.length ? RangeFilter.citire(bare) : null;
      intrari.push(c && !c.eroare ? { nume: e.nume, directie: e.directie, dir: c.dir, bareDir: c.bareDir } : { nume: e.nume, directie: e.directie, eroare: "fără citire" });
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/429|prea multe|rate/i.test(msg)) refuz = true;
      intrari.push({ nume: e.nume, directie: e.directie, eroare: msg });
    }
  }
  return liniaRfContra(intrari, max);
}
