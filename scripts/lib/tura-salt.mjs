// Tura paginii „Salt” (v101.82; el 06.10: „o pagină Salt cu acțiunile din listă, analizate ca la Trading 212”): o dată pe zi, după idei -
// barele zilnice ale fiecărui instrument din universul Salt (public/data/salt-univers.json, simbolurile Yahoo), tabelul tuturor (prețul,
// ziua de ieri, trendul pe 50 / 200 de zile) și listele (început de urcare, revers timpuriu, pe revenire) cu istoricul lor pe 2 ani.
// v101.83 (el 07.10, OK pe demo „Salt ca Trading 212”): + ideile de cumpărare cu ACEEAȘI poartă ca la T212 (Idei.judecaActiune, cu
// Probabilitati și ProfilMoneda), pe fiecare instrument cu cel puțin 120 de zile; cele care trec, după scor, cel mult 50. Fără rezultatele
// trimestriale (la T212 vin după tickerul T212; simbolurile Salt sunt de Yahoo) - pagina o spune.
// deps: { Salt, SA (SugestiiActiuni), Reveniri, Idei?, Probabilitati?, ProfilMoneda?, univers, cereBare(simbol) -> bare, acum, jurnal, pauza, pauzaMs, poze? }
// v101.202 (Radar v100.365, el 19.11: Salt „ca Jurnalul” - ideile „spun cinstit + urmăresc”, listele „față de aceeași zi”): dovada fiecărei liste și
// față de ACEEAȘI zi (Salt.dovadaZi, dovada.k.zi); ideile ordonate după șansa țintei în 5 zile (calibrată în medie), nu după scor (scorul aduce în
// față cifrele de istoric care revin cel mai tare spre medie); d.poze = { citeste() -> [poze], scrie(poza) } ⇒ poza zilnică + urmărirea ideilor în raport.
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
export async function turaSalt(d) {
  const S = d.Salt, SA = d.SA, acum = d.acum || Date.now(), tabel = [], liste = { urcare: [], revers: [], revine: [] }, serii = { urcare: [], revers: [], revine: [] }, idei = [];
  let ideiErori = 0;   // revizia (R7): o eroare din judecaActiune se numără și se spune în jurnal
  let judecate = 0, fara = 0;
  for (const x of Array.isArray(d.univers) ? d.univers : []) {
    let b = null; try { b = await d.cereBare(x.simbol); } catch { b = null; }
    if (d.pauza) await d.pauza(d.pauzaMs || 600);
    if (!Array.isArray(b) || b.length < 31) { fara++; continue; }
    judecate++;
    const r = S.randTabel(x, b, acum); if (r) tabel.push(r);
    const id = { isin: x.isin, simbol: x.simbol, nume: x.nume, tip: x.tip };
    if (d.Idei && b.length >= 120) {
      try { const r = d.Idei.judecaActiune(b, b[b.length - 1].c, { acum, Probabilitati: d.Probabilitati, ProfilMoneda: d.ProfilMoneda, simbol: x.simbol }); if (r && r.trece) idei.push({ ...id, moneda: x.moneda || "", bursa: x.bursa || "", ...r }); } catch { ideiErori++; }
    }
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
  if (S.dovadaZi) {
    for (const k of ["urcare", "revers"]) { const z = S.dovadaZi(serii[k]); dovada[k] = { ...dovada[k], zi: z, textZi: S.textDovadaZi(z, k) }; }
    const z = S.dovadaZi(serii.revine.map((l) => ({ puncte: (Array.isArray(l) ? l : []).map((p) => ({ t: p.t, r: p.f, semnal: !!p.revine })) })), { pauzaZile: 14 });   /* ca regula listei: o cădere = un caz */
    dovada.revine = { ...dovada.revine, zi: z, textZi: S.textDovadaZi(z, "revine") };
  }
  tabel.sort((a, b) => String(a.nume).localeCompare(String(b.nume), "ro"));
  const t5 = (x) => (x && x.prob && Number.isFinite(x.prob.tinta5) ? x.prob.tinta5 : -1);
  idei.sort((a, b) => t5(b) - t5(a) || (Number(a.riscPct) || 1) - (Number(b.riscPct) || 1) || String(a.simbol).localeCompare(String(b.simbol)));
  if (d.jurnal) d.jurnal("salt: " + cate(judecate, "instrument judecat", "instrumente judecate") + ", fără prețuri: " + fara + " · idei (poarta T212): " + idei.length + (ideiErori ? " (erori la poartă: " + ideiErori + ")" : "") + " · început de urcare: " + liste.urcare.length + " · revers timpuriu: " + liste.revers.length + " · pe revenire: " + liste.revine.length);
  const rez = { la: acum, judecate, fara, tabel, liste: { urcare: liste.urcare.slice(0, 10), revers: liste.revers.slice(0, 10), revine: liste.revine.slice(0, 10) }, dovada, idei: idei.slice(0, 50), ideiErori };
  if (d.poze && S.pozaZi && S.urmarire) {
    let vechi = []; try { vechi = d.poze.citeste() || []; } catch { vechi = []; }
    const p = S.pozaZi(rez);
    if (p && !vechi.some((x) => x && x.zi === p.zi)) { try { d.poze.scrie(p); vechi = vechi.concat([p]); } catch (e) { if (d.jurnal) d.jurnal("salt: poza zilei", e.message); } }
    rez.urmarire = S.urmarire(vechi);
  }
  return rez;
}
