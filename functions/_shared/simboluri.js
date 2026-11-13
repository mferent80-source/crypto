// Simbolurile Trading 212 -> simbolurile de bursa (Yahoo), comune rutelor /api/t212 si /api/stiri (v89).
// Aceeasi regula ca in public/lib/t212.js (probata in scripts/t212-v85.mjs si scripts/pachet-v87.mjs).
// T212 pastreaza simbolul SPAC-ului de dinainte de listare (la fel in public/lib/t212.js)
export const REDENUMIT = { NPA: "ASTS", XPOA: "QBTS", IPOB: "OPEN", ALUS: "TE", GWAC: "CIFR", SATS: "ECHO", FB: "META" };
// AAPL_US_EQ -> [AAPL]; SNDK1_US_EQ -> [SNDK1, SNDK]; BRK.B_US_EQ -> [BRK-B]; ne-US -> []
// v88: bursele europene / Canada (la fel in public/lib/t212.js)
const BURSA = { l: ".L", d: ".DE", p: ".PA", a: ".AS", s: ".SW", m: ".MI" }, TARA = { AT: ".VI", CA: ".TO" };
export function candidati(ticker) {
  const t = String(ticker || ""), m = t.match(/^([A-Za-z0-9.]+?)_+US_EQ$/);
  if (!m) {
    const e = t.match(/^([A-Z0-9]+)([a-z])_EQ$/);
    if (e && BURSA[e[2]]) { const b = e[1], o = [b + BURSA[e[2]]], f = b.replace(/\d+$/, ""); if (f && f !== b) o.push(f + BURSA[e[2]]); return o; }
    const c = t.match(/^([A-Z0-9]+)_(AT|CA)_EQ$/);
    return c ? [c[1] + TARA[c[2]]] : [];
  }
  const s = m[1].toUpperCase().replace(/\./g, "-"), out = [s], fara = s.replace(/\d+$/, "");
  if (fara && fara !== s) out.push(fara);
  if (REDENUMIT[s]) out.unshift(REDENUMIT[s]);
  return out;
}
// v87: data rezultatelor trimestriale din raspunsul Nasdaq (api.nasdaq.com/api/analyst/<S>/earnings-date) - aceeasi regula ca T212.dataRezultate
// v100.333 (auditul 12.11, 🔵 B8): mutata aici din functions/api/t212.js (era a treia copie); pagina si serverul raman doua copii, pazite de
// scripts/proba-v100333-t212.mjs (aceleasi raspunsuri pe toate simbolurile cunoscute, inclusiv cheile din REDENUMIT)
export function dataRezultate(j) {
  const t = j && j.data && j.data.reportText; if (typeof t !== "string") return null;
  const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (!m) return null;
  return { data: m[3] + "-" + m[1] + "-" + m[2], sigur: !/estimated|expected/i.test(t) };
}
