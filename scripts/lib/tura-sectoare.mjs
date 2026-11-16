// Tura sectoarelor și a opțiunilor (v100.178 / colector v101.105; el 13.10: „fă 1–5 și vreau exemple de top stocks pe sectoare în Sugestii”).
// (1) o dată pe zi: universul acțiunilor din SUA din screenerul Nasdaq (sectorul, industria, capitalizarea) ⇒ KV univers:sua (sectorul
//     fiecărui simbol, pentru Poartă și pentru contul întreg) și cele mai mari ~25 pe sector (cel puțin 10 mld. $, fără acțiuni preferențiale);
//     barele zilnice (prin cache-ul de pe disc, la 2,5 s) ⇒ Factori.topSectoare + istoricul regulii ⇒ KV sugestii:sectoare; topul intră și în
//     jurnalul verdictelor (sursa „top-sector”, judecat față de QQQ);
// (2) la o oră: volatilitatea implicită a opțiunilor pe BTC și ETH (DVOL, Deribit, public) ⇒ KV piata:dvol (banda gridului din fișă).
// d = { cere, trimite, jurnal, Factori, GridCalcul, bareZi(cale), fetch, universDisc: {citeste(), scrie(x)}, acum }
import { registruFerestre, registruPe } from "./verdict-ferestre.mjs";   // v101.184: verdictul listei, calculat (26 de ferestre)
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
export function urmarireSectoare(urm, bare, univ, acum, o) {
  // v101.185 (revizia v100.346): 🔴2 hărți zi → index o dată pe simbol (era O(n²) cu toISOString: 60 de notări ≈ 19 s sincron); 🔴3 membrii
  // sectorului din ziua notării (rec.mem), nu universul de azi; fără bare ⇒ „nejudecat” (null), doar orizontul neajuns ⇒ „în așteptare”
  // (undefined); 🟡6 intrarea la DESCHIDEREA zilei de după clasare (tura rulează dimineața următoare), ieșirea la închiderea a 21-a zi de bursă.
  o = o || {}; const H = 21, COST = 0.003, zile = []; let inAsteptare = 0, nejudecate = 0;
  const membri = {}; for (const u of Array.isArray(univ) ? univ : []) if (u && u.sector && bare && bare[u.s] && bare[u.s].length) (membri[u.sector] = membri[u.sector] || []).push(u.s);
  const ziU = (t) => new Date(t).toISOString().slice(0, 10), idx = new Map();
  const harta = (s) => { if (!idx.has(s)) { const m = new Map(), b = bare && bare[s]; if (Array.isArray(b)) for (let k = 0; k < b.length; k++) m.set(ziU(b[k].t), k); idx.set(s, m); } return idx.get(s); };
  // v101.186 (revizia 2, 🟡1 + 🔵3): ce lipsește (bare neaduse azi, bursa încă n-a ajuns la orizont, firmă delistată) AȘTEAPTĂ până la 45 de zile de
  // la notare - ziua nu intră cu jumătate din date; după 45 de zile lipsa e definitivă (null)
  const ret = (s, zi, vechi) => { const b = bare && bare[s], A = vechi ? null : undefined; if (!Array.isArray(b) || !b.length) return A; const i = harta(s).get(zi); if (i == null) return ziU(b[b.length - 1].t) < zi ? A : null; if (i + H >= b.length) return A; const a = b[i + 1], z = b[i + H], pa = a.o > 0 ? a.o : a.c; return pa > 0 && z.c > 0 ? z.c / pa - 1 : null; };
  for (const x of (Array.isArray(urm) ? urm : []).slice().sort((p, q) => p.tb - q.tb)) {
    const dif = [], zi = ziU(x.tb), vechi = acum - x.tb > 45 * 86400000; let asteapta = false;
    for (const sec of Object.keys(x.top || {})) {
      const mem = x.mem && Array.isArray(x.mem[sec]) ? x.mem[sec] : membri[sec] || [];
      const tR = (x.top[sec] || []).map((s) => ret(s, zi, vechi)); if (tR.some((v) => v === undefined)) { asteapta = true; continue; }
      if (tR.some((v) => v == null)) continue;   // o firmă din top fără prețuri: sectorul zilei nu se judecă (nu se aleg doar cele rămase)
      const mR = mem.map((s) => ret(s, zi, vechi)); if (mR.some((v) => v === undefined)) { asteapta = true; continue; }
      const mOk = mR.filter((v) => v != null); if (mOk.length < 5) continue;
      dif.push(tR.reduce((p, q) => p + q, 0) / tR.length - COST - mOk.reduce((p, q) => p + q, 0) / mOk.length);
    }
    if (asteapta) { inAsteptare++; zile.push({ t: x.tb, gata: false }); }   // v101.186: ziua intră doar întreagă
    else if (dif.length) zile.push({ t: x.tb, e: dif.reduce((p, q) => p + q, 0) / dif.length }); else nejudecate++;
  }
  // fereastra: 32 de zile calendaristice (21 de zile de bursă, cu sărbători, nu depășesc 31) - ferestrele nu se suprapun
  const RF = registruFerestre(o.registru || null, zile, 32 * 86400000); if (o.laRegistru) o.laRegistru(RF.reg);
  const jud = zile.filter((z) => z.gata !== false), med = jud.length ? jud.reduce((p, z) => p + z.e, 0) / jud.length : null;
  return { vf: RF.vf, zile: jud.length, exces: med, zilePeste: jud.length ? jud.filter((z) => z.e > 0).length / jud.length : null, inAsteptare, nejudecate, notate: (Array.isArray(urm) ? urm : []).length, la: acum };
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
      const b = await incearca(d, "bare " + x.s, async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(x.s))).randuri || [], acum).map((y) => ({ t: y.t, o: y.o, c: y.c })));   // v101.185: + deschiderea (intrarea urmăririi)
      if (b && b.length) bare[x.s] = b;
    }
    const rez = d.Factori.topSectoare(top, bare, { n: 3 }), ist = d.Factori.istoricRegula(top, bare, { n: 3 });
    const sectoare = Object.keys(rez).map((s) => ({ sector: s, ...rez[s] })).sort((a, b) => a.ro.localeCompare(b.ro, "ro"));
    // v101.184: notarea zilei pentru urmărirea înainte (o dată pe bara de închidere), păstrată ~2,5 ani în starea turei (pe disc)
    const tbZi = Math.max(0, ...Object.values(bare).map((b) => (b.length ? b[b.length - 1].t : 0)));
    // v101.185: notările se țin 60 de zile (judecata vine după ~31; ferestrele judecate stau în registru), cu membrii sectorului din ziua notării
    st.urm = (Array.isArray(st.urm) ? st.urm : []).filter((x) => x && x.tb > acum - 60 * 86400000);
    if (tbZi > 0 && !st.urm.some((x) => x.tb === tbZi)) st.urm.push({ tb: tbZi, top: Object.fromEntries(sectoare.map((s) => [s.sector, (s.top || []).map((x) => x.s)])), mem: Object.fromEntries(sectoare.map((s) => [s.sector, top.filter((u) => u.sector === s.sector && bare[u.s]).map((u) => u.s)])) });
    // 🔴3: firmele notate care au ieșit din universul de azi își aduc și ele barele (altfel ar lipsi tocmai cele care au scăzut)
    const lipsa = [...new Set(st.urm.flatMap((x) => Object.values(x.top || {}).flat().concat(Object.values(x.mem || {}).flat())))].filter((s) => !bare[s]).slice(0, 120);
    if (lipsa.length) d.jurnal("sectoare: bare aduse și pentru " + d.Factori.cate(lipsa.length, "firmă notată", "firme notate") + " ieșite din universul de azi");
    for (const s of lipsa) { const b = await incearca(d, "bare (notate) " + s, async () => d.GridCalcul.bareBursa((await d.bareZi("/api/t212?action=preturi&interval=1d&yahoo=" + encodeURIComponent(s))).randuri || [], acum).map((y) => ({ t: y.t, o: y.o, c: y.c }))); if (b && b.length) bare[s] = b; }
    for (const sec of sectoare) for (const x of sec.top || []) x.spark = spark(bare[x.s]);   // v101.184: mini-graficul de pe rând (30 de închideri)
    await d.trimite("/api/istoric-bot?action=sectoareTop", { la: acum, sectoare, istoric: ist, univers: top.length, cuBare: Object.keys(bare).length, urmarire: urmarireSectoare(st.urm, bare, top, acum, registruPe(d, "sect")) });
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
