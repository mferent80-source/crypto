// v100.58 (el, 01.10): gridul ingust pe monedele sugerate - colectorul, la 6 h. deps: { clasament, Idei, GridProba, GridCalcul,
// cere(simbol, end) -> klines Pionex 15M (500), trimite(url, corp), pauza(ms), jurnal, pagini? (12 = ~62 de zile), pauzaMs?,
// urmarire? (v100.59, I-480: notele de pana acum), acum? }
// v100.59 (I-480): urmarirea INAINTE - fiecare rezultat (cu o setare) se noteaza; notele mai vechi decat durata lor se judeca pe barele
// reale de DUPA ele, cu acelasi simulator - si pe monedele care intre timp nu mai sunt sugerate (2 pagini, cel mult 5 monede)
// v101.55 (ideea 2): numărătorile din jurnal - „1 bot”, „25 de boți” (TextRo.cate; rezerva știe aceeași regulă)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
async function aduce(d, simbol, pagini, pauzaMs) {
  let r15 = [], end = null;
  for (let p = 0; p < pagini; p++) {
    const k = await d.cere(simbol, end), r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r || !r.length) break;
    r15 = r15.concat(r);
    const t = r.map((y) => Number(y && y.time)).filter(Number.isFinite);
    if (r.length < 500 || !t.length) break;
    end = Math.min(...t) - 1; if (pauzaMs) await d.pauza(pauzaMs);
  }
  return d.GridCalcul.bare(r15);
}
export async function turaIngust(d) {
  const pagini = d.pagini > 0 ? d.pagini : 12, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, acum = d.acum || Date.now();
  // revizia 01.10 (C1): fara lista citita (eroare la citire) tura NU scrie urmarirea - altfel ar sterge tot istoricul
  const urmOk = Array.isArray(d.urmarire), l = d.Idei.ideiBoti(d.clasament, [], 5), lista = urmOk ? d.urmarire.slice() : [];
  const judeca = (simbol, b) => { for (const e of lista) if (e && e.simbol === simbol && !e.r) { const j = d.GridProba.judecaUrmarire(e, b); if (j) e.r = j; } };
  let monede = 0, propuse = 0;
  for (const x of l) {
    try {
      const b = await aduce(d, x.simbol, pagini, pauzaMs);
      judeca(x.simbol, b);
      const ing = d.GridProba.ingust(b, { dir: x.dir, miscare: !!(x.regim && x.regim.miscare), pret: b.length ? b[b.length - 1].c : null, suma: 100 });
      await d.trimite("/api/istoric-bot?action=ingust", { simbol: x.simbol, ingust: { ...ing, la: acum, zile: Math.round(b.length / 96) } });
      if (ing.latime > 0 && ing.ore > 0) lista.push({ simbol: x.simbol, la: acum, dir: ing.dir, ore: ing.ore, latime: ing.latime, pas: ing.pas, propus: !!ing.propus });
      monede++; if (ing.propus) propuse++;
    } catch (e) { d.jurnal("ingust " + x.simbol, e.message); }
  }
  // notele ramase pe monede care nu mai sunt sugerate: 2 pagini (~10 zile) ajung pentru H <= 24 h
  const ramase = [...new Set(lista.filter((e) => e && !e.r && e.la + e.ore * 3600000 <= acum && !l.some((x) => x.simbol === e.simbol)).map((e) => e.simbol))].slice(0, 5);
  for (const s of ramase) { try { judeca(s, await aduce(d, s, 2, pauzaMs)); } catch (e) { d.jurnal("ingust urmarire " + s, e.message); } }
  // revizia 01.10 (I7): notele fara date de peste 7 zile (moneda scoasa, redenumita) ies din asteptare - nu mai tin locul celor 5 monede
  for (const e of lista) if (e && !e.r && acum - e.la > 7 * 864e5) e.r = { lipsa: true };
  if (urmOk) { try { await d.trimite("/api/istoric-bot?action=ingustUrmarire", { lista: lista.slice(-2000) }); } catch (e) { d.jurnal("ingust urmarire", e.message); } }
  d.jurnal("ingust: " + cate(monede, "monedă sugerată", "monede sugerate") + ", " + propuse + " cu grid ingust propus · urmarite: " + cate(lista.length, "notă", "note") + ", " + cate(lista.filter((e) => e && e.r).length, "judecată", "judecate"));
  return { monede, propuse };
}
