// Tura orara de clasament a colectorului, scoasa aici ca sa poata fi probata cu
// un server fals (scripts/colector-v77.mjs). Colectorul ii da functiile de retea.
//
// deps: { cere(cale) -> JSON, trimite(cale, corp) -> JSON, jurnal(...), pauza(ms),
//         GridCalcul, GridClasament, top (100), pauzaMs (1600), maxEsecuri (15) }
// Ruta publica a serverului are 45 de cereri/minut pe IP, impartite cu browserul:
// la 1,6 s intre cereri raman ~35/min. O lista cu >20% goluri NU se urca.
// v101.55 (ideea 2): numărătorile din jurnal - „1 bot”, „25 de boți” (TextRo.cate; rezerva știe aceeași regulă)
import { spark } from "./spark.mjs";   // v101.184: seria mini-graficului de pe rândurile Sugestiilor
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const CAMPURI_RUTA = ["simbol", "stare", "dir", "tarie", "revenire", "volum", "pret", "latime", "pas", "grile", "profitGrila", "traversariZi", "scor", "f7", "spark"];   // v101.182: + f7 · v101.184: + spark
// v101.182 (auditul 16.11, „Pe ce aș porni” după costurile de acum): funding-ul pe 7 zile (7 × rata pe zi din ultimele 7, GridSim.rataFunding -
// același motor ca Simulatorul) pentru candidații lichizi (≥ 1 M USDT/zi), cel mult 40; ținut 4 ore pe monedă (funding-ul se
// decontează la 4–8 h), deci la fiecare oră aproape nicio cerere Pionex în plus. Cerere picată ⇒ f7 = null (pagina spune „funding necitit”).
const FUND_TINE_MS = 4 * 3600000, FUND_TOP = 40, FUND_PRAG = 1e6, fundCache = new Map();   // revizia Opus: toți candidații lichizi (azi ~25), nu doar primii 20 după scor
export async function adaugaFunding(monede, d) {
  const acum = d.acum ? d.acum() : Date.now();
  const tinte = (Array.isArray(monede) ? monede : []).filter((x) => x && x.stare === "candidat" && Number(x.volum) >= FUND_PRAG).sort((a, b) => (b.scor || 0) - (a.scor || 0)).slice(0, FUND_TOP);
  let cerute = 0;
  for (const m of tinte) {
    const c = fundCache.get(m.simbol);
    if (c && acum - c.la < FUND_TINE_MS) { m.f7 = c.f7; continue; }
    if (cerute++ && d.pauza) await d.pauza(1600);
    try {
      const r = await d.cere("/api/market?type=pionex_funding&symbol=" + encodeURIComponent(m.simbol));
      const F = d.GridSim && d.GridSim.rataFunding ? d.GridSim.rataFunding(r && r.data && r.data.rates, acum) : null;
      m.f7 = F && !F.veche && Number.isFinite(F.rataZi) ? 7 * F.rataZi : null;
      fundCache.set(m.simbol, { la: acum, f7: m.f7 });
    } catch { m.f7 = null; }
  }
  return cerute;
}
export function deTrimis(m) {
  const o = {};
  for (const k of CAMPURI_RUTA) if (m && k in m) o[k] = m[k];
  // v101.160 (02.11): + s24h (mișcarea pe 24 h, cu semn) și mr (= miscareMare.r: mișcarea de azi / pragul ei de „mișcare mare”) - Sugestiile
  // le arată cu unitatea lor; r4h / r24h (rapoarte față de obișnuit) la 4 zecimale, ca să rămână loc sub plafonul rutei (64 KB)
  const rot = (v, z) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10 ** z) / 10 ** z : null);
  o.regim = m && m.regim && typeof m.regim === "object" ? { r4h: rot(m.regim.r4h, 4), r24h: rot(m.regim.r24h, 4), miscare: !!m.regim.miscare, s24h: rot(m.regim.s24h, 5), mr: rot(m.regim.mare && m.regim.mare.r, 3) } : null;
  return o;
}
export async function turaClasament(d) {
  const top = d.top || 100, pauzaMs = d.pauzaMs == null ? 1600 : d.pauzaMs, maxEsecuri = d.maxEsecuri || 15;
  const t0 = Date.now();
  // v101.181 (I-887): perpetuele noi cu formă de acțiune tokenizată (se termină în X, preț cu 2 zecimale) se scot din clasamentul crypto ÎNAINTE de
  // alegerea după volum și se spun o singură dată în jurnal; lista scrisă de mână din GridCalcul se completează după verificare. d.simboluriPerp()
  // dă lista simbolurilor PERP; fără ea (probele vechi) sau dacă pică, tura merge ca înainte.
  if (d.simboluriPerp && d.GridCalcul.nuCryptoDupaForma) {
    try { const noi = d.GridCalcul.invataNuCrypto(d.GridCalcul.nuCryptoDupaForma(await d.simboluriPerp()));
      if (noi.length) d.jurnal("clasament: simboluri noi cu formă de acțiune (se termină în X, preț cu 2 zecimale), scoase din clasamentul crypto până la verificare:", noi.join(" ")); }
    catch (e) { d.jurnal("clasament: lista simbolurilor", e && e.message); }
  }
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP");
  const lista = d.GridClasament.topDupaVolum(tk && tk.data && tk.data.tickers, top);
  // v101.166 (I-838): lumânările de 4h vin incremental (d.klines4h: barele închise de pe disc + bara în curs închisă la prețul tickerului de
  // acum) - o cerere pe monedă doar la o fereastră nouă de 4 h, nu la fiecare oră; fără d.klines4h (probele vechi), ca înainte
  const pretTicker = new Map(((tk && tk.data && tk.data.tickers) || []).map((x) => [String(x && x.symbol), Number(x && x.close)]));
  const monede = [];
  let esecuri = 0;
  for (const m of lista) {
    try {
      const k = d.klines4h ? { data: { klines: await d.klines4h(m.simbol, pretTicker.get(String(m.simbol))) } } : await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(m.simbol) + "&interval=4H&limit=500");
      const bare = d.GridCalcul.bare(k && k.data && k.data.klines);
      if (!bare.length) throw new Error((k && (k.error || k.message || k.code)) || "fara lumanari");   // 200 cu result:false e tot esec
      const j = d.GridClasament.judeca(m.simbol, bare, m.volum);
      // v101.58 (reveniri + short): starea de revenire din aceleași bare de 4h (doar cele închise) - fără cereri în plus
      if (d.Reveniri) { try { j.revenire = d.Reveniri.monedaPeRevenire(bare, d.acum ? d.acum() : Date.now()); } catch { j.revenire = null; } }
      if (j.stare === "candidat" && Number(j.volum) >= FUND_PRAG) j.spark = spark(bare, { pas: 6 });   // v101.184: o închidere pe zi (6 bare de 4 h), 30 de zile
      monede.push(j);
    } catch (e) {
      esecuri++; monede.push(d.GridClasament.judeca(m.simbol, null, m.volum));
      if (esecuri >= maxEsecuri) { d.jurnal("clasament: prea multe esecuri, ma opresc la", monede.length); break; }
    }
    if (pauzaMs && !d.klines4h) await d.pauza(pauzaMs);   /* v101.166: incremental, pauza o ține d.klines4h, doar înaintea unei cereri */
  }
  if (d.GridSim) { try { await adaugaFunding(monede, d); } catch (e) { d.jurnal("clasament: funding", e && e.message); } }   // v101.182
  const rz = d.GridClasament.rezumat({ la: Date.now(), monede });
  if (!monede.length || rz.faraDate > monede.length * 0.2) {
    d.jurnal("clasament NEURCAT:", rz.faraDate, "fara date din", monede.length);
    return { urcat: false, motiv: "prea multe monede fără date: " + rz.faraDate + " din " + monede.length, monede, rz, durataS: Math.round((Date.now() - t0) / 1000) };   /* v101.150: motivul merge în starea turelor */
  }
  // v101.149 (30.10, el: „piața azi nu arată nimic”): din v101.145 regimul poartă și `mare` (~200 de semne pe monedă) ⇒ 100 de monede
  // treceau de plafonul de 64 KB al rutei (413 „Corp prea mare” la fiecare tură, Acasă „FĂRĂ DATE”). Se trimit doar câmpurile pe care
  // ruta le păstrează (functions/api/istoric-bot.js, action=clasament); `monede` întoarse rămân întregi.
  const corp = { la: Date.now(), monede: monede.map(deTrimis) };
  // v101.150 (ideea 2 după v100.275): mărimea corpului în jurnal - o creștere se vede înainte să treacă de plafon
  const marime = (JSON.stringify(corp).length / 1024).toFixed(1).replace(".", ",") + " KB";
  const r = await d.trimite("/api/istoric-bot?action=clasament", corp);
  const urcat = !!(r && r.ok);
  d.jurnal("clasament:", cate(monede.length, "monedă", "monede"), "in", Math.round((Date.now() - t0) / 1000) + " s;", rz.evita, "de evitat,", cate(rz.candidati, "candidat", "candidați") + ",", rz.faraDate, "fara date;", marime + ";", urcat ? "urcat" : "NEURCAT");
  return { urcat, motiv: urcat ? null : "serverul n-a confirmat primirea", marime, monede, rz, durataS: Math.round((Date.now() - t0) / 1000) };
}
