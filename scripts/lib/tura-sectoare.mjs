// Tura sectoarelor și a opțiunilor (v100.178 / colector v101.105; el 13.10: „fă 1–5 și vreau exemple de top stocks pe sectoare în Sugestii”).
// (1) o dată pe zi: universul acțiunilor din SUA din screenerul Nasdaq (sectorul, industria, capitalizarea) ⇒ KV univers:sua (sectorul
//     fiecărui simbol, pentru Poartă și pentru contul întreg) și cele mai mari ~25 pe sector (cel puțin 10 mld. $, fără acțiuni preferențiale);
//     barele zilnice (prin cache-ul de pe disc, la 2,5 s) ⇒ Factori.topSectoare + istoricul regulii ⇒ KV sugestii:sectoare; topul intră și în
//     jurnalul verdictelor (sursa „top-sector”, judecat față de QQQ);
// (2) la o oră: volatilitatea implicită a opțiunilor pe BTC și ETH (DVOL, Deribit, public) ⇒ KV piata:dvol (banda gridului din fișă).
// d = { cere, trimite, jurnal, Factori, GridCalcul, bareZi(cale), fetch, universDisc: {citeste(), scrie(x)}, acum }
import { verdictFerestre, preaDevreme } from "./verdict-ferestre.mjs";   // v101.184: verdictul listei, calculat (26 de ferestre)
import { spark } from "./spark.mjs";   // v101.184: seria mini-graficului de pe rândurile Sugestiilor
const ORA = 3600000;
const ziRo = (t) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date(t));
const oraRo = (t) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
async function incearca(d, ce, fn) { try { return await fn(); } catch (e) { d.jurnal("sectoare " + ce, e.message); return null; } }
// un rând curat din screener: fără acțiuni preferențiale / note / unități (simbol cu ^ / sau nume de felul ăsta); BRK/B ⇒ BRK-B la Yahoo
export function curataUnivers(rows) {
  const out = [];
  for (const x of Array.isArray(rows) ? rows : []) {
    const s = String(x && x.symbol || "").trim(), nume = String(x && x.name || ""), cap = Number(x && x.marketCap);
    if (!s || /\^/.test(s) || /\b(Preferred|Depositary|Notes?|Debentures?|Warrants?|Units?|Rights?)\b/i.test(nume)) continue;
    out.push({ s: s.replace("/", "-"), nume: nume.replace(/\s+(Common Stock|Class [A-Z] Common Stock|Ordinary Shares|Inc\.?)$/i, "").slice(0, 60), sector: String(x.sector || ""), industrie: String(x.industry || ""), cap: Number.isFinite(cap) ? cap : null, tara: String(x.country || "") });
  }
  return out;
}
export function universTop(u, o) {
  o = o || {}; const gr = {};
  for (const x of u) if (x.tara === "United States" && x.cap >= (o.minCap || 1e10) && x.sector) (gr[x.sector] = gr[x.sector] || []).push(x);
  return Object.keys(gr).flatMap((s) => gr[s].sort((a, b) => b.cap - a.cap).slice(0, o.peSector || 25));
}

// v101.184 (el, 16.11: „de ce tot apare n-am aflat”): urmărirea ÎNAINTE a topului pe sectoare - fiecare zi notată (bara ei de închidere + primele 3 pe
// sector) se judecă la 21 de zile de bursă: media celor 3 minus media sectorului (aceleași firme mari de azi, cu bare), după 0,3%; ziua = media pe
// sectoare; ferestrele lunare (29 de zile) care nu se suprapun ⇒ verdictul la 26 (verdict-ferestre.mjs). Firmele sunt cele de azi (supraviețuitori).
export function urmarireSectoare(urm, bare, univ, acum) {
  const ZI = 86400000, H = 21, COST = 0.003, zile = []; let inAsteptare = 0, nejudecate = 0;
  const membri = {}; for (const u of Array.isArray(univ) ? univ : []) if (u && u.sector && bare && bare[u.s] && bare[u.s].length) (membri[u.sector] = membri[u.sector] || []).push(u.s);
  const ziU = (t) => new Date(t).toISOString().slice(0, 10), ret = (s, tb) => { const b = bare[s]; if (!b) return undefined; let i = -1; for (let k = 0; k < b.length; k++) if (ziU(b[k].t) === ziU(tb)) { i = k; break; } if (i < 0) return null; if (i + H >= b.length) return undefined; return b[i].c > 0 && b[i + H].c > 0 ? b[i + H].c / b[i].c - 1 : null; };
  for (const x of (Array.isArray(urm) ? urm : []).slice().sort((a, b) => a.tb - b.tb)) {
    const dif = []; let asteapta = false;
    for (const sec of Object.keys(x.top || {})) {
      const tR = (x.top[sec] || []).map((s) => ret(s, x.tb)), mR = (membri[sec] || []).map((s) => ret(s, x.tb));
      if (tR.some((v) => v === undefined)) { asteapta = true; continue; }
      const tOk = tR.filter((v) => v != null), mOk = mR.filter((v) => v != null); if (!tOk.length || mOk.length < 5) continue;
      dif.push(tOk.reduce((a, b) => a + b, 0) / tOk.length - COST - mOk.reduce((a, b) => a + b, 0) / mOk.length);
    }
    if (dif.length) zile.push({ t: x.tb, e: dif.reduce((a, b) => a + b, 0) / dif.length }); else if (asteapta) inAsteptare++; else nejudecate++;
  }
  const vf = verdictFerestre(zile, 29 * ZI), med = zile.length ? zile.reduce((a, z) => a + z.e, 0) / zile.length : null;
  return { vf, zile: zile.length, exces: med, zilePeste: zile.length ? zile.filter((z) => z.e > 0).length / zile.length : null, inAsteptare, nejudecate, la: acum };
}

export async function turaSectoare(d, st) {
  const acum = d.acum || Date.now();
  if (st.inLucru) return null;
  st.inLucru = true;
  try {
    // (2) DVOL la o oră
    if (acum - (st.dvolLa || 0) >= ORA) {
      const dv = {};
      for (const m of ["BTC", "ETH"]) {
        const v = await incearca(d, "DVOL " + m, async () => {
          const r = await d.fetch("https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=" + m + "&start_timestamp=" + (acum - 6 * ORA) + "&end_timestamp=" + acum + "&resolution=3600", { signal: AbortSignal.timeout(15000) });
          const j = await r.json(), l = j && j.result && Array.isArray(j.result.data) ? j.result.data : [];
          return l.length ? Number(l[l.length - 1][4]) : null;   // [t, open, high, low, close]
        });
        if (v > 0) dv[m] = v;
      }
      if (dv.BTC || dv.ETH) { await incearca(d, "DVOL acasă", () => d.trimite("/api/istoric-bot?action=dvol", { la: acum, btc: dv.BTC || null, eth: dv.ETH || null })); }
      st.dvolLa = acum;
    }
    // (1) o dată pe zi, de la 8:00 ora României (după închiderea de ieri a bursei SUA)
    const z = ziRo(acum);
    if (st.zi === z || (!d.forta && oraRo(acum) < 8) || acum - (st.esecLa || 0) < 2 * ORA) return null;   // d.forta: doar pentru probă
    let univers = d.universDisc.citeste();
    if (!univers || acum - univers.la > 20 * ORA) {
      const r = await d.fetch("https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&download=true", { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" }, signal: AbortSignal.timeout(60000) });
      const j = r.ok ? await r.json().catch(() => null) : null, rows = j && j.data && Array.isArray(j.data.rows) ? j.data.rows : null;
      if (!rows || rows.length < 1000) { st.esecLa = acum; d.jurnal("sectoare: screenerul Nasdaq n-a răspuns cum trebuie (" + (rows ? rows.length : "fără rânduri") + ")"); return null; }
      univers = { la: acum, l: curataUnivers(rows) }; d.universDisc.scrie(univers);
      // sectorul fiecărui simbol (Poarta, contul întreg): [sector, industrie]
      const harta = {}; for (const x of univers.l) if (x.sector) harta[x.s] = [x.sector, x.industrie];
      await incearca(d, "universul acasă", () => d.trimite("/api/istoric-bot?action=universSua", { la: acum, harta }));
    }
    const top = universTop(univers.l, { minCap: 1e10, peSector: 25 }), bare = {};
    for (const x of top) {
      const b = await incearca(d, "bare " + x.s, async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(x.s))).randuri || [], acum).map((y) => ({ t: y.t, c: y.c })));
      if (b && b.length) bare[x.s] = b;
    }
    const rez = d.Factori.topSectoare(top, bare, { n: 3 }), ist = d.Factori.istoricRegula(top, bare, { n: 3 });
    const sectoare = Object.keys(rez).map((s) => ({ sector: s, ...rez[s] })).sort((a, b) => a.ro.localeCompare(b.ro, "ro"));
    // v101.184: notarea zilei pentru urmărirea înainte (o dată pe bara de închidere), păstrată ~2,5 ani în starea turei (pe disc)
    const tbZi = Math.max(0, ...Object.values(bare).map((b) => (b.length ? b[b.length - 1].t : 0)));
    st.urm = (Array.isArray(st.urm) ? st.urm : []).filter((x) => x && x.tb > acum - 900 * 86400000);
    if (tbZi > 0 && !st.urm.some((x) => x.tb === tbZi)) st.urm.push({ tb: tbZi, top: Object.fromEntries(sectoare.map((s) => [s.sector, (s.top || []).map((x) => x.s)])) });
    for (const sec of sectoare) for (const x of sec.top || []) x.spark = spark(bare[x.s]);   // v101.184: mini-graficul de pe rând (30 de închideri)
    await d.trimite("/api/istoric-bot?action=sectoareTop", { la: acum, sectoare, istoric: ist, univers: top.length, cuBare: Object.keys(bare).length, urmarire: urmarireSectoare(st.urm, bare, top, acum) });
    // topul intră în jurnalul verdictelor (judecat față de QQQ după 5 și 20 de zile de bursă) - sursa „top-sector”
    /* v101.116 (C5): ora verdictului = închiderea ultimei bare din care vine prețul (zi + 21:00 UTC), nu ora turei */
    const laInchidere = (s) => { const b = bare[s], u = b && b.length ? b[b.length - 1] : null; return u && u.t > 0 ? Date.parse(new Date(u.t).toISOString().slice(0, 10) + "T21:00:00Z") : acum; };
    const verd = []; for (const s of sectoare) for (const x of s.top) verd.push({ s: "top-sector", k: x.s, n: "top", p: x.pret, t: laInchidere(x.s) });
    if (verd.length) await incearca(d, "verdictele topului", () => d.trimite("/api/istoric-bot?action=verdict", { verdicte: verd }));
    st.zi = z;
    d.jurnal("sectoare: " + d.Factori.cate(sectoare.length, "sector", "sectoare") + ", " + Object.keys(bare).length + " din " + d.Factori.cate(top.length, "acțiune", "acțiuni") + " cu prețuri · regula pe " + (ist.luni || 0) + " luni: " + (ist.medie !== null ? (ist.medie * 100).toFixed(2) + "%/lună față de sector" : "—"));
    return { sectoare: sectoare.length };
  } finally { st.inLucru = false; }
}
