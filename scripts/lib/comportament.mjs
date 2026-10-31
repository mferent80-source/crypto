// Comportamentul (v100.281 / colector v101.153; el, 31.10: „vreau mesaj pe Discord după fiecare bot închis cu mesaj comportamental, evaluare,
// ce am greșit, ce am făcut bine, din care să pot învăța” - în canalul lui separat): judecă DECIZIILE botului, nu norocul. Modul pur (fără
// rețea, fără stare proprie; starea o ține colectorul), probat în scripts/proba-v100281.mjs; textele sunt în mesaje-colector.mjs (garda le
// generează). Doar tiparele SOLIDE din analiza lui (30.10, 2.396 de boți) devin „de îndreptat”: boții porniți pe zi, frâna lui la pornire,
// orele cu prețul în afara grilei, închiderea în minute, lichidarea. Repornirea rapidă, levierul, direcția, mărimea, noaptea NU - nu s-au
// dovedit pe datele lui. Pornirea se judecă doar cu ce se știa ATUNCI (Obiceiuri.franaLaPornire). Avertizează, nu blochează.
import { clasaInchidere } from "./tura-monte-carlo-bot.mjs";   // motivul închiderii: tine / stop / tinta / lichidare / pionex / necitit
import { eticheta, rupeBucati, ORDINE_REGULI } from "./mesaje-colector.mjs";   // v100.282: regulile pe nume, rândurile rupte între bucăți

const ORA = 3600000, ZI = 86400000;
export const PRAG_MINUTE = 15;   // sub 15 min (ca „Boții tăi” pe Acasă): pe istoria lui comisioanele au fost 3,4× grilele
// sfatul: regula încălcată cea mai grea; frâna DOAR pe 7 zile e o stare lungă (trasă zile la rând), nu lecția botului ⇒ după minute
const ORDINE_SFAT = ["lichidare", "boti", "banda", "frana", "minute", "frana-sapt"];
const cheieSfat = (d) => (d.cod === "frana" && !d.rand && !d.zi ? "frana-sapt" : d.cod);
const nr = (v) => { if (v === null || v === undefined || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const netDe = (t) => (nr(t && t.net) !== null ? nr(t.net) : nr(t && t.rezultat));
const r2 = (v) => Math.round(v * 100) / 100;
const fZi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" });
const ziRo = (t) => fZi.format(new Date(t));
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const U = (v) => { v = Number(v) || 0; const a = Math.abs(v); return (v >= 0 ? "+" : "−") + (a > 0 && a < 0.05 ? "<0,1" : a.toFixed(1).replace(".", ",")) + " USDT"; };

// ore continue cu prețul în afara grilei la închidere, din starea colectorului (stareAlerte[id]._afaraDe, pusă la fiecare tură cât botul
// mergea): fără stare = nu știu (null); în grilă la ultima citire = 0
// revizia (I2b): ultima citire (`_afaraVazut`) cu peste 15 min înainte de închidere (colector oprit) ⇒ nu știu, nu „7 h afară”
export function oreAfara(st, inchis) {
  if (!st || typeof st !== "object" || !Object.prototype.hasOwnProperty.call(st, "_afaraDe")) return null;
  const de = nr(st._afaraDe), i = nr(inchis), v = nr(st._afaraVazut);
  if (de === null || de <= 0) return 0;
  if (i === null || (v !== null && i - v > 15 * 60000)) return null;
  return Math.max(0, (i - de) / ORA);
}
// revizia (C1): motivul închiderii stă în buOrderData.reasonBy (arhiva compactă - boti-arhiva.js - și pagina Pionex); arhiva veche n-are
export const motivDin = (x) => { const m = (x && x.buOrderData && x.buOrderData.reasonBy) || (x && x.reasonBy); return typeof m === "string" && m ? m : null; };
// frâna văzută la pornire, ținută (rotunjită, fără referințe) - evaluarea de la închidere o folosește în locul socotelii pe istorie
export function instantaneu(f) {
  if (!f || !f.praguri) return null;
  const v = (x) => (nr(x) === null ? null : r2(nr(x)));
  return { pornitiAzi: nr(f.pornitiAzi) || 0, rand: nr(f.rand) || 0, netZi: v(f.netZi), netSapt: v(f.netSapt), depasit: (f.depasit || []).filter((d) => d && d.cod).map((d) => ({ cod: d.cod })), praguri: Object.assign({}, f.praguri), activa: !!f.activa };
}

// dovezile din istoria LUI (toți boții închiși), pe viu: netul pe zi (ziua României a pornirii) în zilele cu peste `prag` boți porniți față
// de celelalte - doar cu cel puțin 10 zile în fiecare grupă; boții ținuți sub 15 min: grilele și comisioanele lor - de la 30 de boți
export function dovezi(trades, prag) {
  const z = new Map(), m = { n: 0, grile: 0, comisioane: 0 };
  for (const t of Array.isArray(trades) ? trades : []) {
    const p = nr(t && t.pornit), v = netDe(t); if (p === null || v === null) continue;
    const k = ziRo(p), x = z.get(k) || { n: 0, net: 0 }; x.n++; x.net += v; z.set(k, x);
    const dur = nr(t.durataOre) !== null ? nr(t.durataOre) : nr(t.inchis) !== null ? (nr(t.inchis) - p) / ORA : null;
    if (dur !== null && dur < PRAG_MINUTE / 60) { m.n++; m.grile += nr(t.grile) || 0; m.comisioane += nr(t.comisioane) || 0; }
  }
  const P = nr(prag) > 0 ? nr(prag) : 7, zile = [...z.values()], peste = zile.filter((x) => x.n > P), sub = zile.filter((x) => x.n <= P);
  const pe = (l) => ({ zile: l.length, pe: r2(l.reduce((s, x) => s + x.net, 0) / l.length) });
  return { zile: peste.length >= 10 && sub.length >= 10 ? { prag: P, peste: pe(peste), sub: pe(sub) } : null, minute: m.n >= 30 ? m : null };
}

// evaluarea unui bot închis. f = { t (JurnalTrade), frana (Obiceiuri.franaLaPornire), afaraOre (oreAfara), banda: { dv, r } (tabelul benzii
// lui: treapta timpurie, regula de închidere), dovezi, motiv (reasonBy Pionex) }. Deciziile, în ordinea vieții botului: pornirea (boții de
// azi, frâna), ținerea (grila), ieșirea (minutele, lichidarea). Verdictul pune deciziile lângă rezultat (2×2) - un singur bot spune mai mult
// despre piață decât despre decizie: decizii bune + minus = ghinion, reguli încălcate + plus = noroc.
export function evalueaza(f) {
  const t = (f && f.t) || {}, fr = f && f.frana, dec = [], motiv = String((f && f.motiv) || "");
  if (fr && fr.praguri) {
    const n = (nr(fr.pornitiAzi) || 0) + 1, prag = nr(fr.praguri.boti);
    if (prag) dec.push({ cod: "boti", ok: n <= prag, n, prag, dovezi: (f.dovezi && f.dovezi.zile) || null });
    const dep = new Set((fr.depasit || []).map((d) => d && d.cod));
    dec.push({ cod: "frana", ok: !(dep.has("rand") || dep.has("zi") || dep.has("sapt")), frana: fr,
      rand: dep.has("rand") ? { n: fr.rand, prag: fr.praguri.rand } : null, zi: dep.has("zi") ? { net: fr.netZi, prag: fr.praguri.zi } : null,
      sapt: dep.has("sapt") ? { net: fr.netSapt, prag: fr.praguri.sapt } : null });
  }
  // revizia (C1, I3): ținerea și ieșirea se judecă doar când închiderea e a LUI (închis de el sau motiv necunoscut - arhiva veche);
  // stopul, ținta, Pionex nu sunt decizia lui de la închidere; banda, doar după cel puțin 15 min (în minute lecția e a minutelor)
  const cls = clasaInchidere(motiv), alLui = cls === "tine" || cls === "necitit";
  const min = nr(t.inchis) !== null && nr(t.pornit) !== null ? (t.inchis - t.pornit) / 60000 : null;
  const ore = nr(f && f.afaraOre), b = (f && f.banda) || {}, h = b.dv || b.r || null;
  if (alLui && (min === null || min >= PRAG_MINUTE) && ore !== null && ore > 0 && h && nr(h.h) > 0) dec.push({ cod: "banda", ok: ore <= h.h, ore, dv: h, r: b.r && nr(b.r.h) !== nr(h.h) ? b.r : null });
  if (alLui && min !== null && min < PRAG_MINUTE) dec.push({ cod: "minute", ok: false, minute: min, prag: PRAG_MINUTE, grile: nr(t.grile), comisioane: nr(t.comisioane), dovezi: (f.dovezi && f.dovezi.minute) || null });
  if (cls === "lichidare") dec.push({ cod: "lichidare", ok: false });
  const net = netDe(t) || 0, rele = dec.filter((d) => !d.ok).length;
  const verdict = rele ? (net >= 0 ? "noroc" : "cost") : (net >= 0 ? "bune" : "ghinion");
  const rau = ORDINE_SFAT.map((c) => dec.find((d) => !d.ok && cheieSfat(d) === c)).find(Boolean), sfat = rau ? rau.cod : null;
  return { t, net, decizii: dec, rele, bune: dec.length - rele, verdict, sfat, nivel: rele ? "atentie" : "info" };
}

// ---------------- starea (o ține colectorul, în alerte-stare.json) ----------------
// prima rulare: și boții închiși în ultimele 24 h (ca să vadă pe loc cum arată), nu toată istoria
export function initStare(st, acum) {
  if (!(nr(st.de) > 0)) st.de = acum - ZI;
  st.evaluati = st.evaluati || {}; st.porniri = st.porniri || {};
  return st;
}
// ce se evaluează acum: închiși după prag, cel mult de acum 24 h, încă neevaluați; cei mai vechi întâi, cel mult 10 pe tură
export function deEvaluat(trades, st, acum) {
  const de = Math.max(nr(st && st.de) || 0, acum - ZI), ev = (st && st.evaluati) || {};
  return (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.inchis) !== null && t.inchis >= de && t.inchis <= acum && !ev[String(t.id)])
    .sort((a, b) => a.inchis - b.inchis).slice(0, 10);
}
export function noteaza(st, t, ev, acum) {
  (st.evaluati || (st.evaluati = {}))[String(t.id)] = { la: acum, inchis: t.inchis, net: r2(netDe(t) || 0), rele: ((ev && ev.decizii) || []).filter((d) => !d.ok).map((d) => d.cod) };
}
// starea ține doar ce trebuie ca să nu dubleze: evaluările 3 zile (jurnalul lor întreg e în data/evaluari.jsonl), pornirile văzute
// (cu instantaneul frânei) 30 de zile - cât poate sta un bot pornit
export function curata(st, acum) {
  for (const [k, v] of Object.entries(st.evaluati || {})) if (!(nr(v && v.inchis) >= acum - 3 * ZI)) delete st.evaluati[k];
  for (const [k, v] of Object.entries(st.porniri || {})) { const la = v && typeof v === "object" ? nr(v.la) : nr(v); if (!(la >= acum - 30 * ZI)) delete st.porniri[k]; }
}
// revizia: închiși după prag, dar de peste 24 h (colector oprit, arhivă lipsă) și încă nenotați - nu se mai evaluează, se spun o dată
export function preaVechi(trades, st, acum) {
  const de = Math.max(nr(st && st.de) || 0, acum - 3 * ZI), ev = (st && st.evaluati) || {};
  return (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.inchis) !== null && t.inchis >= de && t.inchis < acum - ZI && !ev[String(t.id)]);
}
// boții porniți de curând (după prag, în ultimele 2 h), încă nevăzuți - colectorul judecă frâna în clipa pornirii lor
export function porniriNoi(deschise, st, acum) {
  const de = Math.max(nr(st && st.de) || 0, acum - 2 * ORA), vazut = (st && st.porniri) || {};
  return (Array.isArray(deschise) ? deschise : []).filter((b) => { const p = b ? nr(b.pornitLa) : null; return b && b.id && b.activ !== false && p !== null && p >= de && p <= acum && !vazut[String(b.id)]; });
}

// ---------------- frâna pe 7 zile trasă zi de zi ⇒ întrebarea despre prag ----------------
const ieri = (zi) => new Date(Date.parse(zi + "T12:00:00Z") - ZI).toISOString().slice(0, 10);
const zileIntre = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / ZI);
// zi = „AAAA-LL-ZZ” (ziua României), ora = ora din zi; f = Obiceiuri.frana de acum. Întreabă în a 4-a zi la rând (peste 3), de la 8 dimineața,
// cât e trasă; apoi abia după 7 zile. O zi fără frâna pe 7 zile rupe șirul.
export function pasPragSapt(st, f, zi, ora) {
  const s = st.sapt || (st.sapt = { zi: null, zile: 0, intrebat: null });
  const tras = !!(f && Array.isArray(f.depasit) && f.depasit.some((d) => d && d.cod === "sapt"));
  if (tras && s.zi !== zi) { s.zile = s.zi === ieri(zi) ? s.zile + 1 : 1; s.zi = zi; }
  return { intreaba: tras && s.zile >= 4 && Number(ora) >= 8 && (!s.intrebat || zileIntre(s.intrebat, zi) >= 7), zile: s.zile };
}
export function marcheazaIntrebat(st, zi) { (st.sapt || (st.sapt = { zi: null, zile: 0, intrebat: null })).intrebat = zi; }
// la prima rulare șirul nu pornește de la zero: câte zile la rând, până ieri, a fost trasă frâna pe 7 zile la sfârșitul zilei (cel mult 30);
// frana = Obiceiuri.frana (doar închișii - pierderea celor deschiși atunci nu se mai știe)
export function seriaSaptInapoi(trades, praguri, acum, frana) {
  const l = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.inchis) !== null), azi = ziRo(acum); let n = 0;
  for (let d = 1; d <= 30; d++) {
    const zi = new Date(Date.parse(azi + "T12:00:00Z") - d * ZI).toISOString().slice(0, 10);
    const sf = inceputZi(new Date(Date.parse(zi + "T12:00:00Z") + ZI).toISOString().slice(0, 10)) - 1, f = frana({ trades: l, acum: sf, praguri });
    if (!(f && Array.isArray(f.depasit) && f.depasit.some((x) => x && x.cod === "sapt"))) break;
    n++;
  }
  return n;
}
export function pornesteSeriaSapt(st, n, zi) { if (!st.sapt && n > 0) st.sapt = { zi: ieri(zi), zile: n, intrebat: null }; }

// ---------------- frâna în raportul de duminică ----------------
// începutul zilei României `zi` (00:00 la București, UTC+2 iarna, +3 vara; în ziua schimbării orei miezul nopții e încă pe ora veche)
const inceputZi = (zi) => { for (const h of [2, 3]) { const x = Date.parse(zi + "T00:00:00Z") - h * ORA; if (ziRo(x) === zi && ziRo(x - 1) !== zi) return x; } return Date.parse(zi + "T00:00:00Z"); };
// ultimele 7 zile (cu azi): pentru fiecare, boții închiși porniți atunci și câți cu frâna trasă (franaLaPornire = Obiceiuri.franaLaPornire);
// „trasă” = la o pornire sau la sfârșitul zilei (pragul atins, chiar dacă n-a mai pornit nimic); „respectată” = trasă și niciun bot peste ea
// revizia (I4): `deschise` = boții încă porniți acum - intră la „porniți” și la frână (altfel al 8-lea, încă deschis, lasă ziua „respectată”);
// cei peste frână încă deschiși se numără, fără net
export function franaPeSaptamana(trades, praguri, acum, franaLaPornire, deschise) {
  const l = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null), azi = ziRo(acum), zile = [];
  const D = (Array.isArray(deschise) ? deschise : []).filter((b) => b && b.activ !== false && nr(b.pornitLa) !== null), desc = D.map((b) => ({ id: String(b.id), pornit: nr(b.pornitLa), deschis: true }));
  for (let d = 6; d >= 0; d--) {
    const zi = new Date(Date.parse(azi + "T12:00:00Z") - d * ZI).toISOString().slice(0, 10);
    const ale = l.concat(desc).filter((t) => ziRo(t.pornit) === zi).sort((a, b) => a.pornit - b.pornit);
    const peste = ale.filter((t) => franaLaPornire(t, l, praguri, D).activa), netPeste = r2(peste.filter((t) => !t.deschis).reduce((s, t) => s + (netDe(t) || 0), 0));
    const sfarsit = Math.min(inceputZi(new Date(Date.parse(zi + "T12:00:00Z") + ZI).toISOString().slice(0, 10)) - 1, acum);
    const trasa = peste.length > 0 || !!franaLaPornire({ id: null, pornit: sfarsit }, l, praguri, D).activa;
    zile.push({ zi, porniti: ale.length, peste: peste.length, deschisi: peste.filter((t) => t.deschis).length, netPeste, trasa, respectata: trasa && !peste.length });
  }
  const z = zile.filter((x) => x.peste > 0);
  return { zile, trase: zile.filter((x) => x.trasa).length, respectate: zile.filter((x) => x.respectata).length, trecute: z.length,
    nPeste: z.reduce((s, x) => s + x.peste, 0), deschisi: z.reduce((s, x) => s + x.deschisi, 0), netPeste: r2(z.reduce((s, x) => s + x.netPeste, 0)) };
}
export function liniiFranaSaptamana(r) {
  if (!r || !r.trase) return ["Frâna săptămânii: n-a fost trasă în nicio zi."];
  const out = ["Frâna săptămânii: trasă în " + cate(r.trase, "zi", "zile") + " din 7; respectată în " + r.respectate + ", trecută în " + r.trecute
    + (r.nPeste ? " (" + cate(r.nPeste, "bot pornit", "boți porniți") + " peste ea, net " + U(r.netPeste) + (r.deschisi ? " pe cei închiși; " + cate(r.deschisi, "bot încă deschis", "boți încă deschiși") : "") + ")" : "") + "."];
  // zilele, rupte în rânduri ≤ 160 doar ÎNTRE zile („29.10: 8 boți, −12,5 USDT” nu se desparte); rândul continuat se termină în „ ·”
  const it = r.zile.filter((x) => x.peste > 0).map((x) => x.zi.slice(8, 10) + "." + x.zi.slice(5, 7) + ": " + cate(x.peste, "bot", "boți") + (x.deschisi ? " (" + cate(x.deschisi, "deschis", "deschiși") + ")" : "") + ", " + U(x.netPeste));
  if (it.length) out.push(...rupeBucati("Zilele peste frână: ", it, 160));
  return out;
}

// ---------------- v100.282 / colector v101.154 (el, 31.10: „fa” - ideile) ----------------
// 31.10.2026 00:00 la București: boții PORNIȚI de aici încolo = date noi (regulile și evaluarea au fost scrise atunci)
export const PROBA_DE = Date.UTC(2026, 9, 30, 22, 0);
// jurnalul evaluărilor (data/evaluari.jsonl): un rând JSON pe bot; rândurile stricate se sar; același bot o dată (ultimul rând)
export function dinJsonl(text) {
  const m = new Map();
  for (const l of String(text || "").split(/\r?\n/)) { if (!l.trim()) continue; try { const x = JSON.parse(l); if (x && typeof x === "object" && x.id !== undefined && x.id !== null) m.set(String(x.id), x); } catch {} }
  return [...m.values()];
}
const lunaRo = (t) => ziRo(t).slice(0, 7);
const releDin = (ev) => ((ev && ev.decizii) || []).filter((d) => !d.ok).map((d) => d.cod);
// (3) luna asta (calendaristică, ziua României a închiderii) pe fiecare regulă încălcată: { cod: { n, net } }
export function lunaPeReguli(inreg, acum) {
  const L = lunaRo(acum), out = {};
  for (const x of Array.isArray(inreg) ? inreg : []) {
    const i = nr(x && x.inchis); if (i === null || i > acum || lunaRo(i) !== L || !Array.isArray(x.rele)) continue;
    for (const c of x.rele) { const o = out[c] || (out[c] = { n: 0, net: 0 }); o.n++; o.net = r2(o.net + (nr(x.net) || 0)); }
  }
  return out;
}
export function adaugaInLuna(luna, ev) { for (const c of releDin(ev)) { const o = luna[c] || (luna[c] = { n: 0, net: 0 }); o.n++; o.net = r2(o.net + (nr(ev.net) || 0)); } return luna; }
export function lunaPentru(luna, ev) { const out = {}; for (const c of releDin(ev)) if (luna[c]) out[c] = { n: luna[c].n, net: luna[c].net }; return out; }
// (1) regulile pe date noi - DESCRIPTIV: boții porniți de la `de`, pe fiecare regulă și peste oricare (fără verdict: pe istoria lui, un verdict pe
// câteva săptămâni ar greși 13–17% în loc de 1%, iar puterea e sub 50% chiar la 90 de zile - simularea din 31.10)
export function reguliPeDateNoi(inreg, de) {
  const out = { n: 0, peste: {}, toate: { n: 0, net: 0 } };
  for (const x of Array.isArray(inreg) ? inreg : []) {
    const p = nr(x && x.pornit); if (p === null || p < de) continue;
    out.n++; const rele = Array.isArray(x.rele) ? x.rele : [], v = nr(x.net) || 0;
    for (const c of rele) { const o = out.peste[c] || (out.peste[c] = { n: 0, net: 0 }); o.n++; o.net = r2(o.net + v); }
    if (rele.length) { out.toate.n++; out.toate.net = r2(out.toate.net + v); }
  }
  return out;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// media pe bot a listei ({ net, zi }), interval pe ZILE (bootstrap; boții aceleiași zile nu sunt dovezi separate)
function mediaPeZile(l, B, nivel, seed) {
  const zile = new Map(); for (const b of l) { const x = zile.get(b.zi) || { s: 0, n: 0 }; x.s += b.net; x.n++; zile.set(b.zi, x); }
  const Z = [...zile.values()], rnd = mulberry32(seed), ms = [];
  for (let k = 0; k < B; k++) { let s = 0, c = 0; for (let i = 0; i < Z.length; i++) { const x = Z[Math.floor(rnd() * Z.length)]; s += x.s; c += x.n; } if (c) ms.push(s / c); }
  ms.sort((a, b) => a - b); const q = (p) => ms[Math.min(ms.length - 1, Math.max(0, Math.floor(p * ms.length)))];
  return { n: l.length, z: Z.length, m: r2(l.reduce((s, b) => s + b.net, 0) / l.length), lo: r2(q((1 - nivel) / 2)), hi: r2(q(1 - (1 - nivel) / 2)) };
}
// istoria (ultimele 120 de zile): boții porniți peste reguli - al N-lea > prag, frâna la pornire (franaLaPornire), închis de el sub 15 min;
// media pe bot cu interval 99% pe zile (determinist: mulberry32 cu sămânță); sub 30 de boți ⇒ null. Banda nu se știe pe istorie.
export function istoriaReguli(trades, praguri, acum, franaLaPornire, motive) {
  const de = acum - 120 * ZI, P = praguri || {}, prag = nr(P.boti) > 0 ? nr(P.boti) : 7, porn = {}, peste = [];
  const l = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null && t.inchis <= acum && netDe(t) !== null).sort((a, b) => a.pornit - b.pornit);
  const ctx = l.filter((t) => t.inchis >= de - 8 * ZI);
  for (const t of l) {
    const k = ziRo(t.pornit); porn[k] = (porn[k] || 0) + 1;
    if (t.pornit < de) continue;
    const dep = new Set((franaLaPornire(t, ctx, P).depasit || []).map((d) => d && d.cod)), cls = clasaInchidere(motive && motive.get ? motive.get(String(t.id)) : null);
    if (porn[k] > prag || dep.has("zi") || dep.has("sapt") || dep.has("rand") || ((t.inchis - t.pornit) / 60000 < PRAG_MINUTE && (cls === "tine" || cls === "necitit"))) peste.push({ net: netDe(t), zi: k });
  }
  return peste.length >= 30 ? mediaPeZile(peste, 2000, 0.99, 282) : null;
}
const S1 = (v) => (v >= 0 ? "+" : "−") + Math.abs(Number(v)).toFixed(1).replace(".", ",");
export function liniiReguliNoi(noi, istoria) {
  const cap = "Regulile pe date noi (boți porniți de la 31.10): ";
  if (!noi || !noi.n) return [cap + "încă niciun bot închis."];
  const b = ORDINE_REGULI.filter((c) => noi.peste[c] && noi.peste[c].n).map((c) => eticheta(c, noi.peste[c].n) + " (" + U(noi.peste[c].net) + ")");
  const out = b.length ? rupeBucati(cap, b, 160) : [cap + cate(noi.n, "bot închis", "boți închiși") + ", niciunul peste reguli."];
  if (noi.toate && noi.toate.n) out.push("Fără " + (noi.toate.n === 1 ? "botul pornit" : "cei " + cate(noi.toate.n, "bot pornit", "boți porniți")) + " peste reguli aveai cu " + Math.abs(noi.toate.net).toFixed(1).replace(".", ",") + " USDT mai puțin " + (noi.toate.net < 0 ? "pierdut" : "câștigat") + ", dacă nu porneai alții în loc (ipoteză).");
  if (istoria) out.push("Pe ultimele 120 de zile, boții porniți peste reguli au dat în medie " + U(istoria.m) + "/bot (interval 99%: " + S1(istoria.lo) + " … " + S1(istoria.hi) + "); pe date noi, un verdict cere luni de boți.");
  return out;
}

// ---------------- v100.283 / colector v101.155 (el, 31.10: „ok, fă” - ideile 1, 2) ----------------
// (2) seara pe scurt: boții închiși AZI (ziua României a închiderii) din jurnalul evaluărilor - în regulă / cu reguli încălcate, regula cea
// mai deasă (la egalitate, cea care a dat mai prost); nimic azi ⇒ null
export function searaZilei(inreg, acum) {
  const z = ziRo(acum), l = (Array.isArray(inreg) ? inreg : []).filter((x) => x && nr(x.inchis) !== null && x.inchis <= acum && ziRo(x.inchis) === z);
  if (!l.length) return null;
  const are = (x) => Array.isArray(x.rele) && x.rele.length > 0, sum = (a) => r2(a.reduce((s, x) => s + (nr(x.net) || 0), 0)), rele = l.filter(are), bune = l.filter((x) => !are(x)), pe = {};
  for (const x of rele) for (const c of x.rele) { const o = pe[c] || (pe[c] = { n: 0, net: 0 }); o.n++; o.net = r2(o.net + (nr(x.net) || 0)); }
  const top = ORDINE_REGULI.filter((c) => pe[c]).sort((a, b) => pe[b].n - pe[a].n || pe[a].net - pe[b].net)[0] || null;
  return { zi: z, n: l.length, bune: { n: bune.length, net: sum(bune) }, rele: { n: rele.length, net: sum(rele) }, top, pe };
}
export const searaDatorata = (st, acum, ora) => Number(ora) >= 22 && st.seara !== ziRo(acum);
// (1) oglinda lunii: luna „AAAA-LL” după ziua României a PORNIRII (deciziile se iau la pornire); cele 5 obiceiuri din analiza lui:
// zilele cu peste prag, porniți cu frâna trasă (pierderile: azi / 7 zile / la rând), ținuți peste 6 h, închiși de el sub 15 min, lichidați
export function lunaInainte(cheie) { const a = Number(String(cheie).slice(0, 4)), l = Number(String(cheie).slice(5, 7)); return l === 1 ? (a - 1) + "-12" : a + "-" + String(l - 1).padStart(2, "0"); }
export function oglindaLunii(trades, praguri, cheie, franaLaPornire, motive) {
  const P = praguri || {}, prag = nr(P.boti) > 0 ? nr(P.boti) : 7;
  const toate = (Array.isArray(trades) ? trades : []).filter((t) => t && nr(t.pornit) !== null && nr(t.inchis) !== null && netDe(t) !== null);
  const l = toate.filter((t) => ziRo(t.pornit).slice(0, 7) === cheie).sort((a, b) => a.pornit - b.pornit);
  if (!l.length) return null;
  const ctx = toate.filter((t) => t.inchis >= l[0].pornit - 8 * ZI), zile = new Map(), adu = (o, t) => { o.n++; o.net = r2(o.net + netDe(t)); };
  const out = { cheie, n: 0, net: 0, zile: 0, zilePeste: { z: 0, net: 0 }, frana: { n: 0, net: 0 }, lungi: { n: 0, net: 0 }, minute: { n: 0, net: 0 }, lichidati: { n: 0, net: 0 } };
  for (const t of l) {
    out.n++; out.net = r2(out.net + netDe(t));
    const k = ziRo(t.pornit), zz = zile.get(k) || { n: 0, net: 0 }; zz.n++; zz.net = r2(zz.net + netDe(t)); zile.set(k, zz);
    const dep = new Set((franaLaPornire(t, ctx, P).depasit || []).map((d) => d && d.cod)), cls = clasaInchidere(motive && motive.get ? motive.get(String(t.id)) : null), ore = (t.inchis - t.pornit) / ORA;
    if (dep.has("zi") || dep.has("sapt") || dep.has("rand")) adu(out.frana, t);
    if (ore > 6) adu(out.lungi, t);
    if (ore * 60 < PRAG_MINUTE && (cls === "tine" || cls === "necitit")) adu(out.minute, t);
    if (cls === "lichidare") adu(out.lichidati, t);
  }
  out.zile = zile.size;
  for (const zz of zile.values()) if (zz.n > prag) { out.zilePeste.z++; out.zilePeste.net = r2(out.zilePeste.net + zz.net); }
  return out;
}
// pe 1–3 ale lunii (colectorul poate fi oprit pe 1), de la 9 la București, o dată: luna trecută (a) față de cea dinainte (b)
export function oglindaDatorata(st, acum, ora) {
  const z = ziRo(acum); if (Number(z.slice(8, 10)) > 3 || Number(ora) < 9) return null;
  const a = lunaInainte(z.slice(0, 7)); return st.oglinda === a ? null : { a, b: lunaInainte(a) };
}
