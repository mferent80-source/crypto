// v101.150 (30.10, el: „ok fă idei” - ideile 1–2 după v100.275): starea turelor de clasament - câte au picat la rând, de când, de ce.
// Colectorul o ține peste reporniri (ritmuri.json) și o urcă pe server (action=clasamentStare), ca Piața azi să spună MOTIVUL când
// clasamentul lipsește. După 3 eșecuri la rând: o alertă pe Discord (o singură dată); la prima tură bună după ea: „a revenit”.
// Pe 29–30.10 clasamentul a fost refuzat 68 de ori la rând fără niciun semn în afară de jurnal.
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export const PRAG_ESECURI = 3;
export function oraRo(t) {
  const n = Number(t); if (!(n > 0)) return "";
  try {
    const f = (o) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", ...o }).formatToParts(new Date(n)).reduce((a, p) => (a[p.type] = p.value, a), {});
    const d = f({ day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return d.day + "." + d.month + " " + d.hour + ":" + d.minute;
  } catch { return ""; }
}
function gol() { return { esecuri: 0, deLa: null, motiv: null, anuntat: false, okLa: null, la: null }; }
// st = starea de până acum (sau nimic), ev = { ok: true } | { ok: false, motiv }, acum = ms ⇒ { st, mesaj: null | { nivel, titlu, mesaj } }
export function pasClasament(st, ev, acum) {
  const v = Object.assign(gol(), st && typeof st === "object" ? st : {});
  if (ev && ev.ok) {
    const nou = Object.assign(gol(), { okLa: acum, la: acum });
    if (!v.anuntat) return { st: nou, mesaj: null };
    return { st: nou, mesaj: { nivel: "info", titlu: "Clasamentul pieței ajunge din nou pe server",
      mesaj: "După " + cate(v.esecuri, "tură picată", "ture picate") + " la rând, de la " + oraRo(v.deLa) + ", Piața azi are iar clasamentul." } };
  }
  const motiv = String(ev && ev.motiv || "eroare necunoscută").replace(/\s+/g, " ").trim().slice(0, 160);
  const nou = { esecuri: v.esecuri + 1, deLa: v.deLa || acum, motiv, anuntat: v.anuntat, okLa: v.okLa, la: acum };
  if (nou.esecuri < PRAG_ESECURI || v.anuntat) return { st: nou, mesaj: null };
  nou.anuntat = true;
  return { st: nou, mesaj: { nivel: "atentie", titlu: "Clasamentul pieței nu ajunge pe server",
    mesaj: cate(nou.esecuri, "tură picată", "ture picate") + " la rând, de la " + oraRo(nou.deLa) + " (" + motiv + "). Piața azi rămâne fără clasament până trece; colectorul reîncearcă la 10 minute." } };
}
// ce se urcă pe server (fără `anuntat`, care e treaba colectorului)
export function stareDeUrcat(st) { return { esecuri: st.esecuri, deLa: st.deLa, motiv: st.motiv, okLa: st.okLa, la: st.la }; }
