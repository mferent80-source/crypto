// STUDIU v100.395 - „direcția probabilă” pentru monedele de bot direcțional (el, 26.11.2026: „vreau să arăți direcția actuală + direcția probabilă”).
// REGULILE SUNT SCRISE AICI ÎNAINTE DE PRIMA RULARE (26.11.2026, seara) și nu se schimbă după ce se văd cifrele.
//
// IPOTEZA (mecanismul): momentum pe serie în crypto, pe 1–4 săptămâni (literatura: Liu & Tsyvinski 2021). Cine e de partea cealaltă: cei care
// prind „fundul” / „vârful” (contra-trend, retail), lichidările în lanț care prelungesc mișcarea, informația care se răspândește încet.
// Întrebarea: o monedă care a mers DREPT într-o parte pe 14 zile (|ER 14 z| ≥ 0,10, pe bare de 4 h) și e agitată (≥ 8% pe zi) continuă în aceeași
// parte în următoarele 7 zile mai des decât 50%? Și mai des decât piața (media monedelor din aceeași zi)?
//
// DATE: Binance Futures, bare de 4 h, ~2 ani, monedele din universul de ACUM (≥ 50 M USDT/zi) - deci DOAR SUPRAVIEȚUITOARELE (cele delistate lipsesc:
// pentru short cifra iese mai PROASTĂ decât a fost, pentru long mai BUNĂ). Spus pe pagină.
// PUNCTE: o dată pe zi (bara de 00:00 UTC), pentru fiecare monedă cu 85 de bare în urmă și 42 înainte. ER 14 z = pe ultimele 85 de închideri de 4 h;
// amplitudinea = media (maxim − minim) pe zi pe ultimele 7 zile, din barele de 4 h (pagina o ia din bare de 1 h - aici o aproximare, aceeași regulă).
// REZULTATUL: r7 = închiderea peste 42 de bare / acum − 1. CONTINUĂ = semnul lui r7 e partea (ER < 0 ⇒ short). FAȚĂ DE PIAȚĂ: s × (r7 − media r7 a
// tuturor monedelor din aceeași zi) > 0.
// CELULE (fixate): partea (short / long) × treapta |ER 14 z| (0,10–0,15 · 0,15–0,25 · ≥ 0,25) = 6 celule. Fără alte variante.
// ÎMPĂRȚIREA: prima jumătate a zilelor = EXPLORARE, a doua = TEST. Cifra de pe pagină = TEST.
// INDEPENDENȚA: zilele se suprapun (fereastra e de 7 zile) ⇒ intervalul de încredere se socotește pe SĂPTĂMÂNI care nu se suprapun (o zi din 7),
// media pe săptămână a „continuă” (0 / 1) în celulă; IÎ 95% = medie ± 1,96 × abaterea / √săptămâni.
// VERDICTUL pe celulă: „mai des decât 50%” DOAR dacă marginea de jos a IÎ pe TEST > 50% ȘI explorarea > 50%; altfel „nedovedit”. 6 celule ⇒ se spune
// și că din 6 încercări una poate ieși din întâmplare (la 5%: ~0,3).
//   node scripts/studiu-v100395-directie-probabila.mjs [iesire.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IES = process.argv[2] || path.join(RAD, "data", "studiu-directie-probabila.json"), CACHE = path.join(RAD, "data", "studiu-dp-cache");
fs.mkdirSync(CACHE, { recursive: true });
const F = "https://fapi.binance.com", H4 = 4 * 3600000, ZI = 86400000;
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(u) { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { signal: AbortSignal.timeout(20000) }); if (r.status === 429 || r.status === 418) { await pauza(61000); continue; } if (!r.ok) throw new Error("HTTP " + r.status); return await r.json(); } catch (e) { if (i === 3) throw e; await pauza(1500); } } }
const info = await get(F + "/fapi/v1/exchangeInfo"), tick = await get(F + "/fapi/v1/ticker/24hr");
const ok = new Set(info.symbols.filter((x) => x.quoteAsset === "USDT" && x.status === "TRADING" && x.contractType === "PERPETUAL" && x.underlyingType === "COIN").map((x) => x.symbol));
const univ = tick.filter((t) => ok.has(t.symbol) && +t.quoteVolume >= 50e6).map((t) => t.symbol).sort();
const ACUM = Math.floor(Date.now() / H4) * H4, START = ACUM - 730 * ZI;
async function bare(sym) {
  const f = path.join(CACHE, sym + ".json"); try { const c = JSON.parse(fs.readFileSync(f, "utf8")); if (c.acum === ACUM) return c.b; } catch {}
  let t = START, b = [];
  while (t < ACUM) { const k = await get(`${F}/fapi/v1/klines?symbol=${sym}&interval=4h&startTime=${t}&limit=1500`); if (!Array.isArray(k) || !k.length) break; for (const x of k) if (+x[0] < ACUM) b.push([+x[0], +x[2], +x[3], +x[4]]); t = +k[k.length - 1][0] + H4; await pauza(150); if (k.length < 1500) break; }
  fs.writeFileSync(f, JSON.stringify({ acum: ACUM, b })); return b;
}
const er = (c) => { let s = 0; for (let i = 1; i < c.length; i++) s += Math.abs(c[i] - c[i - 1]); return s > 0 ? (c[c.length - 1] - c[0]) / s : 0; };
const puncte = [];   // { zi, sym, er, amp, r7 }
for (const sym of univ) {
  const b = await bare(sym);
  for (let i = 85; i + 42 < b.length; i++) {
    if (b[i][0] % ZI !== 0) continue;                       // bara de 00:00 UTC (închiderea ei = ultima închidere cunoscută la i)
    const c = b.slice(i - 84, i + 1).map((x) => x[3]); if (c.length < 85) continue;
    let amp = 0; for (let d = 0; d < 7; d++) { const z = b.slice(i - 6 * (d + 1) + 1, i - 6 * d + 1); amp += (Math.max(...z.map((x) => x[1])) - Math.min(...z.map((x) => x[2]))) / z[0][3]; } amp /= 7;
    puncte.push({ zi: b[i][0], sym, er: er(c), amp, r7: b[i + 42][3] / b[i][3] - 1 });
  }
}
// media pieței pe zi (toate monedele din ziua aceea)
const piata = new Map(); for (const p of puncte) { const x = piata.get(p.zi) || [0, 0]; x[0] += p.r7; x[1]++; piata.set(p.zi, x); }
const zile = [...piata.keys()].sort((a, b) => a - b), mij = zile[Math.floor(zile.length / 2)];
const TREPTE = [[0.10, 0.15], [0.15, 0.25], [0.25, 9]], celula = (p) => { const a = Math.abs(p.er); for (let k = 0; k < 3; k++) if (a >= TREPTE[k][0] && a < TREPTE[k][1]) return k; return -1; };
function socoteste(lista) {
  const n = lista.length, cont = lista.filter((p) => p.s * p.r7 > 0).length, fp = lista.filter((p) => p.s * (p.r7 - p.pm) > 0).length;
  // săptămânile care nu se suprapun: zilele cu indexul (zi / ZI) % 7 === 0
  const sapt = new Map(); for (const p of lista) { if (Math.round(p.zi / ZI) % 7) continue; const x = sapt.get(p.zi) || [0, 0, 0]; x[0] += p.s * p.r7 > 0 ? 1 : 0; x[1]++; x[2] += p.s * (p.r7 - p.pm) > 0 ? 1 : 0; sapt.set(p.zi, x); }
  const v = [...sapt.values()].map((x) => x[0] / x[1]), vf = [...sapt.values()].map((x) => x[2] / x[1]);
  // CORECTAT după revizia independentă (26.11.2026, după prima rulare, ÎNAINTE de livrare): intervalul era centrat pe media săptămânilor (1 zi din 7,
  // la short:0 72,7%), iar cifra afișată era pe toate cazurile (59,5%) - verdictul nu se sprijinea pe cifra de pe pagină. Acum: centrul = cifra pe toate
  // cazurile, lățimea = abaterea pe săptămânile care nu se suprapun. Schimbarea face verdictul MAI STRICT (prima rulare: 1 celulă „mai des”), nu mai blând.
  const ii = (a, centru) => { if (a.length < 2 || centru == null) return null; const m = a.reduce((s, x) => s + x, 0) / a.length, sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); return [centru - 1.96 * sd / Math.sqrt(a.length), centru + 1.96 * sd / Math.sqrt(a.length)]; };
  return { n, sapt: v.length, cont: n ? cont / n : null, ii: ii(v, n ? cont / n : null), fataPiata: n ? fp / n : null, iiPiata: ii(vf, n ? fp / n : null), mediaR7: n ? lista.reduce((s, p) => s + p.s * p.r7, 0) / n : null };
}
const rez = { reguli: "vezi capul fișierului (scrise înainte de rulare, 26.11.2026)", acum: ACUM, monede: univ.length, puncte: puncte.length, zile: zile.length, mijloc: mij, celule: {} };
for (const parte of ["short", "long"]) for (let k = 0; k < 3; k++) {
  const sel = puncte.filter((p) => p.amp >= 0.08 && celula(p) === k && (parte === "short" ? p.er < 0 : p.er > 0)).map((p) => ({ ...p, s: parte === "short" ? -1 : 1, pm: piata.get(p.zi)[0] / piata.get(p.zi)[1] }));
  const ex = socoteste(sel.filter((p) => p.zi < mij)), te = socoteste(sel.filter((p) => p.zi >= mij));
  const verdict = te.ii && te.ii[0] > 0.5 && ex.cont > 0.5 ? "mai des decât 50%" : te.ii && te.ii[1] < 0.5 && ex.cont < 0.5 ? "mai rar decât 50%" : "nedovedit";
  const verdictP = te.iiPiata && te.iiPiata[0] > 0.5 && ex.fataPiata > 0.5 ? "mai des decât piața" : te.iiPiata && te.iiPiata[1] < 0.5 && ex.fataPiata < 0.5 ? "mai rar decât piața" : "nedovedit";
  rez.celule[parte + ":" + k] = { parte, treapta: TREPTE[k], explorare: ex, test: te, verdict, verdictPiata: verdictP };
}
fs.writeFileSync(IES, JSON.stringify(rez, null, 1));
const P = (x) => (x == null ? "—" : (x * 100).toFixed(1).replace(".", ",") + "%");
console.log(`monede ${univ.length} · puncte ${puncte.length} · zile ${zile.length} (test de la ${new Date(mij).toISOString().slice(0, 10)})`);
for (const [k, c] of Object.entries(rez.celule)) console.log(`${k.padEnd(8)} ER ${c.treapta.join("–")} · EXPL n ${c.explorare.n} continuă ${P(c.explorare.cont)} față de piață ${P(c.explorare.fataPiata)} · TEST n ${c.test.n} (${c.test.sapt} săpt.) continuă ${P(c.test.cont)} [${c.test.ii ? c.test.ii.map(P).join(" – ") : "—"}] față de piață ${P(c.test.fataPiata)} [${c.test.iiPiata ? c.test.iiPiata.map(P).join(" – ") : "—"}] · media s×r7 ${P(c.test.mediaR7)} ⇒ ${c.verdict} / ${c.verdictPiata}`);
