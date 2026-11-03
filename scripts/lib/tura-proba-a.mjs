// v101.163 (el, 03.11.2026: „alte idei?” → „fă”, ideea 3): PROBA PROSPECTIVĂ a spargerii A - pre-înregistrată în
// pine-scripts/_proba-trade-zilei-2026-11-03/_PROBA_PROSPECTIVA_A.md. Spargerea pe zi de mișcare a avut același semn pe 2 ani și pe al
// treilea (+0,42 %/zi față de restul zilelor, z 2,1), sub prag; singurul test curat rămas e pe zile care NU existau când s-au scris regulile.
// Aici: o dată pe zi, după 00:10 UTC, ziua UTC tocmai închisă e judecată pe cele 21 de perechi, cu EXACT regulile din Python (tz_motor.trade_A):
// P3 ≥ 0,70 la începutul zilei (doar din zilele închise înainte), intrare la prima închidere de 1 h peste maximul / sub minimul de ieri, stop la
// ½ r1 × ÎNCHIDEREA primei bare a zilei (Python: trade_A(…, r1 * c[0]); revizia 03.11 a prins „deschiderea”) pe drum pesimist, ieșire la
// închiderea ultimei bare, cost 0,10 %. Se judecă și zilele FĂRĂ semnal (reperul). Lumânările aici sunt Pionex (Python: Binance) și ziua cere
// exact 24 de bare (Python: cel puțin 20) - spus în _PROBA_PROSPECTIVA_A.md.
// Rândurile merg în data/proba-a.jsonl, fără dubluri, nimic recalculat înapoi. Verdictul: DUPĂ 2027-02-01, în Python, nu aici.
// deps: { acum, stare: { probaAZi }, TradeZilei, bare(simbolPionex) -> lumânări 1h [{t,o,h,l,c}], citeste() -> textul jsonl, scrie(randuri),
//         jurnal, simboluri?, pauzaMs? }
const ORA = 3600000, ZI = 86400000;
export const UNIVERS_A = ["BTC", "ETH", "ZEC", "HYPE", "SOL", "BNB", "NEAR", "XRP", "DOGE", "ENA", "WLD", "SUI", "ADA", "UNI", "PUMP", "INIT", "LINK", "FIL", "BCH", "AVAX", "EGLD"].map((m) => m + "_USDT_PERP");
export const PRAG_P3 = 0.70, STOP = 0.5, COST = 0.0010;
export const DIN = "2026-11-04", VERDICT_DUPA = "2027-02-01";
function cate(n, sg, pl) { const k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }

// portul exact al lui trade_A(o, h, l, c, pdh, pdl, r1 * c[0]) din tz_motor.py: scara stopului = închiderea primei bare; ultima bară nu intră
// (range(n − 1)); stopul umplut la min(stop, open) pe long / max(stop, open) pe short; fără intrare ⇒ null
export function tradeA(bareZi, pdh, pdl, r1, cost = COST) {
  const n = bareZi.length; if (n < 2) return null;
  const c0 = bareZi[0].c;
  for (let k = 0; k < n - 1; k++) {
    const b = bareZi[k];
    if (b.c > pdh || b.c < pdl) {
      const sens = b.c > pdh ? 1 : -1, e = b.c, stop = e - sens * STOP * r1 * c0;
      for (let j = k + 1; j < n; j++) {
        const x = bareZi[j];
        if (sens === 1 && x.l <= stop) return { net: Math.min(stop, x.o) / e - 1 - cost, fel: "stop" };
        if (sens === -1 && x.h >= stop) return { net: 1 - Math.max(stop, x.o) / e - cost, fel: "stop" };
      }
      return { net: sens * (bareZi[n - 1].c / e - 1) - cost, fel: "ora" };
    }
  }
  return null;
}

// ziua UTC `zi` (numărul zilei): P3 / nivelurile de ieri / r1 DOAR din zilele închise înainte de 00:00 (TradeZilei.azi cu `acum` = începutul zilei),
// apoi spargerea pe cele 24 de bare ale zilei. Lipsesc bare ⇒ eroare (ziua nu se judecă pe jumătate).
export function judecaZi(bare, zi, TradeZilei) {
  const ziStart = zi * ZI, d = TradeZilei.azi(bare, ziStart);
  if (!d || d.eroare) return { eroare: (d && d.eroare) || "fără date" };
  const bz = (bare || []).filter((b) => b && b.t >= ziStart && b.t < ziStart + ZI).sort((a, b) => a.t - b.t);
  if (bz.length !== 24) return { eroare: "zi incompletă (" + cate(bz.length, "bară", "bare") + ")" };
  const tr = tradeA(bz, d.pdh, d.pdl, d.r1);
  return { zi, p3: d.p3, semnal: d.p3 >= PRAG_P3, net: tr ? tr.net : null, fel: tr ? tr.fel : "fara" };
}

export async function turaProbaA(d) {
  const acum = d.acum || Date.now(), ziAzi = Math.floor(acum / ZI);
  if (acum % ZI < 10 * 60000) return { judecat: false };   // barele zilei închise ajung în cache după 00:00; după 00:10 sunt sigur acolo
  const zi = ziAzi - 1;
  if (zi < Math.floor(Date.parse(DIN) / ZI)) return { judecat: false };   // prima zi judecată e DIN: zilele dinainte existau când s-au scris regulile (revizia 03.11)
  if (d.stare.probaAZi === zi) return { judecat: false };
  const existente = new Set();
  String(d.citeste() || "").split("\n").forEach((l) => { try { if (l.trim()) { const x = JSON.parse(l); if (x && x.zi === zi) existente.add(String(x.simbol)); } } catch {} });
  const simboluri = d.simboluri || UNIVERS_A, pauza = d.pauzaMs == null ? 300 : d.pauzaMs, randuri = [];
  let fara = 0, sarite = 0;
  for (const s of simboluri) {
    const simbol = String(s).replace(/_USDT_PERP$/, "");
    if (existente.has(simbol)) { sarite++; continue; }
    try {
      const j = judecaZi(await d.bare(s), zi, d.TradeZilei);
      if (j.eroare) { fara++; d.jurnal && d.jurnal("proba A", simbol, j.eroare); } else randuri.push({ ...j, simbol });
    } catch (e) {
      fara++; const msg = String(e && e.message || e); d.jurnal && d.jurnal("proba A", simbol, msg.slice(0, 80));
      if (/429/.test(msg)) break;   // Pionex a refuzat: restul zilei rămâne nejudecat, nu insist
    }
    if (pauza) await new Promise((r) => setTimeout(r, pauza));
  }
  if (randuri.length) d.scrie(randuri);
  // ziua e judecată o singură dată; dacă n-a ieșit niciun rând (Pionex picat, 429), se mai încearcă în turele următoare până la 06:00 UTC -
  // barele zilei închise rămân în cele 500 (~20 de zile), deci re-judecarea nu schimbă nimic (revizia 03.11)
  if (randuri.length || acum % ZI >= 6 * ORA) d.stare.probaAZi = zi;
  return { judecat: true, scrise: randuri.length, fara, sarite };
}

// rândul de duminică: descriptiv, FĂRĂ verdict înainte de termen (mediile doar pe zilele în care trade-ul a intrat, ca în Python)
export function liniaProbaA(text) {
  const r = []; String(text || "").split("\n").forEach((l) => { try { if (l.trim()) r.push(JSON.parse(l)); } catch {} });
  const din = DIN.slice(8, 10) + "." + DIN.slice(5, 7) + "." + DIN.slice(0, 4);
  if (!r.length) return "Proba A (prospectivă, din " + din + "): încă fără zile judecate; verdict după " + VERDICT_DUPA + ", nu înainte.";
  const zile = new Set(r.map((x) => x.zi)).size, cuS = r.filter((x) => x.semnal), rest = r.filter((x) => !x.semnal);
  const medie = (a) => { const v = a.filter((x) => x.net != null).map((x) => Number(x.net)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const pct = (v) => (v == null ? "—" : (v >= 0 ? "+" : "−") + Math.abs(v * 100).toFixed(2).replace(".", ",") + " %");
  return "Proba A (prospectivă, din " + din + "): " + cate(zile, "zi", "zile") + ", " + cate(cuS.length, "zi-pereche", "zile-pereche") + " cu semnal (P3 ≥ 70 %), net pe semnal " + pct(medie(cuS)) +
    ", pe rest " + pct(medie(rest)) + " (medii pe trade; verdictul se face în Python, pe zile); verdict după " + VERDICT_DUPA + ", nu înainte.";
}
