// Tura paginii „Salt” (v101.82; el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca la Trading 212”): o dată pe zi, după idei -
// barele zilnice ale fiecărui instrument din universul Salt (public/data/salt-univers.json, simbolurile Yahoo), tabelul tuturor (prețul,
// ziua de ieri, trendul pe 50 / 200 de zile) și listele (început de urcare, revers timpuriu, pe revenire) cu istoricul lor pe 2 ani.
// deps: { Salt, SA (SugestiiActiuni), Reveniri, univers, cereBare(simbol) -> bare, acum, jurnal, pauza, pauzaMs }
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export async function turaSalt(d) {
  const S = d.Salt, SA = d.SA, acum = d.acum || Date.now(), tabel = [], liste = { urcare: [], revers: [], revine: [] }, serii = { urcare: [], revers: [], revine: [] };
  let judecate = 0, fara = 0;
  for (const x of Array.isArray(d.univers) ? d.univers : []) {
    let b = null; try { b = await d.cereBare(x.simbol); } catch { b = null; }
    if (d.pauza) await d.pauza(d.pauzaMs || 600);
    if (!Array.isArray(b) || b.length < 31) { fara++; continue; }
    judecate++;
    const r = S.randTabel(x, b, acum); if (r) tabel.push(r);
    const id = { isin: x.isin, simbol: x.simbol, nume: x.nume, tip: x.tip };
    for (const k of ["urcare", "revers"]) { serii[k].push({ ticker: x.simbol, puncte: SA.puncte(b, k) }); const a = SA.azi(b, k, acum, { sesiuneOre: 9 }); if (a) liste[k].push({ ...id, ...a }); }
    // „pe revenire” (regula veche Reveniri) - fără seriile cu salturi de unitate și fără bara încă în lucru
    if (d.Reveniri && !SA.areSalt(b, 1, b.length - 1)) {
      const bI = S.inchisa(b, acum) < b.length - 1 ? b.slice(0, -1) : b;
      try { const rv = d.Reveniri.actiunePeRevenire(bI); if (rv && rv.revine) liste.revine.push({ ...id, ...rv }); serii.revine.push(d.Reveniri.puncte(bI, { r: d.Reveniri.REGULI.actiune })); } catch {}
    }
  }
  liste.urcare.sort((a, b) => b.volX - a.volX); liste.revers.sort((a, b) => b.cadere - a.cadere); liste.revine.sort((a, b) => b.cadere - a.cadere);
  const dovada = {};
  for (const k of ["urcare", "revers"]) { const dv = SA.dovada(serii[k], { reps: d.reps || 2000 }); dovada[k] = { n: dv.n, pePlus: dv.pePlus, medie: dv.medie, baza: dv.baza, eticheta: dv.eticheta, verdict: dv.verdict, text: SA.textDovada(dv, k) }; }
  if (d.Reveniri) { const dr = d.Reveniri.dovada(serii.revine, "revine", { pauzaZile: 14 }); dovada.revine = { ...dr, text: d.Reveniri.textDovada(dr, "actiuni") }; }
  else dovada.revine = { text: "" };
  tabel.sort((a, b) => String(a.nume).localeCompare(String(b.nume), "ro"));
  if (d.jurnal) d.jurnal("salt: " + cate(judecate, "instrument judecat", "instrumente judecate") + ", fără prețuri: " + fara + " · început de urcare: " + liste.urcare.length + " · revers timpuriu: " + liste.revers.length + " · pe revenire: " + liste.revine.length);
  return { la: acum, judecate, fara, tabel, liste: { urcare: liste.urcare.slice(0, 10), revers: liste.revers.slice(0, 10), revine: liste.revine.slice(0, 10) }, dovada };
}
