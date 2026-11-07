// v101.170 (07.11.2026, I-844, el: „fă tot”): raportul de duminică spune și unde sunt probele ÎNAINTE (căderi, direcție, caietul de păreri):
// cifrele de până acum, zilele lipsă din ultima săptămână (o tură care nu mai scrie zile nu mai trece neobservată) și privirile fixate.
// Fără verdict înainte de privire (regulile au fost scrise înainte; cifrele unei săptămâni sunt zgomot). Trend 12 luni și proba A au rândurile lor.
const ZI = 86400000;
function cate(n, sg, pl) { const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const pct = (v) => (v == null || !isFinite(v) ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + "%");
const pc = (v) => (v == null || !isFinite(v) ? "—" : Math.round(v * 100) + "%");
const zi = (z) => (/^\d{4}-\d{2}-\d{2}$/.test(String(z || "")) ? z.slice(8, 10) + "." + z.slice(5, 7) + "." + z.slice(0, 4) : "—");
const scurt = (z) => z.slice(8, 10) + "." + z.slice(5, 7);
// zilele UTC din ultima săptămână (de ieri înapoi, 7 zile), de la start încolo, care n-au fișier pe disc
export function zileLipsa(existente, acum, start) {
  const s = new Set(Array.isArray(existente) ? existente : []), out = [];
  for (let k = 1; k <= 7; k++) { const z = new Date(acum - k * ZI).toISOString().slice(0, 10); if (z >= String(start || "") && !s.has(z)) out.push(z); }
  return out.sort();
}
const lipsa = (l) => (l && l.length ? "⚠ " + cate(l.length, "zi lipsă", "zile lipsă") + " săptămâna asta (" + l.map(scurt).join(", ") + ")" : "nicio zi lipsă săptămâna asta");
export function liniiProbeRaport({ caderi, directie, pareri, scor, lipsaCaderi, lipsaDirectie }) {
  const L = [];
  const u = caderi && caderi.urmarire, E = u && u.grupuri && u.grupuri.E;
  L.push("📉 Căderi (în probă, din " + zi(caderi && caderi.start || "2026-11-07") + "): " + (u ? cate(u.evenimente || 0, "cădere", "căderi") + " în " + cate(u.zile || 0, "zi judecată", "zile judecate") : "nimic judecat încă")
    + (E && E.n ? "; la 7 zile, față de piață, după cost: " + pct(E.stat) + " (istoric −0,1%)" : "") + "; " + lipsa(lipsaCaderi) + ". Privirile: 01.03.2027 și 08.11.2027, fără verdict înainte.");
  const d = directie && directie.urmarire, nim = (k, t) => pc(d && d[k] && d[k][t] && d[k][t].nimerire);
  L.push("🎯 Direcția pe 7 zile (în probă, din " + zi(directie && directie.start || "2026-11-06") + "): " + (d && d.perechi ? cate(d.perechi, "pereche judecată", "perechi judecate") + " în " + cate(d.zile || 0, "zi", "zile") + "; M1 a nimerit " + nim("M1", "abs") + " (față de piață " + nim("M1", "rel") + "), M2 " + nim("M2", "abs") + " (" + nim("M2", "rel") + ")" + (d.M1 && d.M1.abs && d.M1.abs.sapt < 8 ? ", sub 8 săptămâni = practic o singură observație" : "") : "nicio zi judecată încă")
    + "; " + lipsa(lipsaDirectie) + ". Privirile: 08.05.2027 (cifrele) și 08.11.2027.");
  const l = pareri && Array.isArray(pareri.pareri) ? pareri.pareri : [], s = scor || {}, nj = Object.keys(s).reduce((a, k) => a + (s[k].judecate || 0), 0);
  const ab = Object.keys(s).filter((k) => s[k].judecate).map((k) => (k === "claude" ? "Claude " : "tu ") + pct(s[k].abilitate) + " (" + s[k].nimerite + " din " + s[k].decise + " nimerite)");
  L.push("📓 Caietul de păreri: " + cate(l.length, "părere notată", "păreri notate") + ", " + cate(nj, "judecată", "judecate") + (ab.length ? "; față de „50% la fiecare”: " + ab.join(", ") : "")
    + (nj && nj < 30 ? " · sub 30 de păreri judecate scorul e zgomot" : "") + ".");
  return L;
}
