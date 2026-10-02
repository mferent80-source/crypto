// Garda textelor (specul „sfaturi concise”, 02.10): genereaza sfaturile REAL, cu modulele paginii, pe situatii din datele lui
// (CRV, LIGHTER, JTO, VVV) si verifica regulile de scris: titlul ≤ 60, „Ce aș face eu” ≤ 110 la persoana I, explicatia ≤ 160 si
// o singura fraza, Discord titlu ≤ 60 + cel mult 2 randuri, virgula zecimala, minusul „−”, vocabularul, avertizarile comune
// doar in legenda. Pachetele terminate sunt STRICTE (orice abatere = esec); celelalte doar raporteaza (nu blocheaza suita).
//   node scripts/garda-texte.mjs                      -> raportul + esec pe pachetele stricte
//   node scripts/garda-texte.mjs --inventar <fisier>  -> si lista textelor (situatie, sursa, lungime, text) in Markdown
//   ... --inventar <fisier> --mod=sfaturi,todo        -> doar grupurile date (inventarul unui pachet)
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mesajDiscord } from "./lib/canal-discord.mjs";
import { avertismenteBot } from "../functions/_shared/avertismente.js";
import { situatiiAlerte } from "./lib/garda-alerte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), { filename: f });
const { GridCalcul: G, SemnaleBot: S, TabloExtra: T, Consiliu: C, Sfaturi: SF, Directie: DR } = globalThis;

// pachetele trecute pe „strict” - unul cate unul, la terminarea lui (semafor + cartele = semnale-bot.js, consiliu = consiliu.js;
// pachetul 2: sfaturi = sfaturi.js, consiliu-2 = Consilierul cu sfaturile reale, todo = „Ce ai de făcut acum”, server = avertismentele;
// „alerte” = titlurile/textele din regulile alertelor (alerte.js), strict la pachetul 3)
export const STRICT = new Set(["semafor", "cartele", "consiliu", "sfaturi", "consiliu-2", "todo", "server", "alerte"]);   // v100.68: + alerte (pachetul 3)

// ---- regulile ----
export const REGULI = {
  titlu: { max: 60 },
  faCe: { max: 110, persoana: true, oFraza: true },
  rand: { max: 110, oFraza: true },
  deCe: { max: 160, oFraza: true },
  detalii: {},
  discordTitlu: { max: 60 },
  discordMesaj: { randuri: 2 },
  // v100.66 (pachetul 3): alertele - titlul ≤ 60; mesajul pe 2 randuri: faptul (ca „de ce”) + „👉 ” si o actiune; rapoartele - randuri ≤ 160
  alertaTitlu: { max: 60, strigat: true },
  alertaMesaj: { randuri: 2, alerta: true, strigat: true },
  raport: { rand: 160, strigat: true },
};
const PERSOANA = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
export const INTERZIS = [
  // v100.68: „2.610 lei” (separatorul de mii, ca TextRo.lei) nu e zecimala; „12.4%”, „0.060%” da
  [/(?:\b0\.\d+|\d\.(?!\d{3}(?!\d))\d+)\s?(%|×|h\b|min\b|USDT\b|lei\b)/, "zecimală cu punct (vrea virgulă)"],
  [/(^|[\s(·:])-\d/, "minus ASCII (vrea „−”)"],
  [/NaN|undefined|null|Infinity|\[object/, "gunoi în text"],
  [/!(?!=)/, "semn de exclamare"],
  [/[Oo]pritor/, "„opritor” (vocabular: „stopul”)"],
  [/\bOprește botul\b|\bIeși acum\b|\bopresc\b/, "„oprește / ieși” (vocabular: „închide botul”)"],
  [/\bvezi\b|(?<!\btot )\bmai jos\b/i, "trimitere „vezi … / mai jos”"],
  [/s-a apropiat|a ajuns să/, "umplutură („s-a apropiat”, „a ajuns să”)"],
  [/frecvență din trecut|nu o promisiune|un semn, nu o regulă|nu o dovadă/i, "avertizarea comună (locul ei e în legendă)"],
  [/ÎMPOTRIVA|\bSUB gridul|\bPESTE gridul/, "majuscule de strigat"],
  [/\d(\.\d+)?e[-+]?\d/, "număr cu exponent"],   // revizia Opus a 2b (5): „1.234e-7”
];
const norm = (s) => String(s || "").toLowerCase().replace(/[0-9.,%×−+()·:;—"„”≈~]/g, " ").replace(/\s+/g, " ").trim();
// abaterile unui text; frate = titlul aceluiasi sfat (explicatia / actiunea nu-l repeta)
export function verifica(text, tip, frate) {
  const t = String(text == null ? "" : text), r = REGULI[tip] || {}, ab = [];
  if (r.max && t.length > r.max) ab.push("lung: " + t.length + " > " + r.max);
  if (r.persoana && t && !PERSOANA.test(t)) ab.push("nu e la persoana I („Aș …”, „N-aș …”)");
  if (r.oFraza) {
    if (/[.?]\s+[A-ZĂÂÎȘȚ]/.test(t.replace(/\d+\.\d+/g, "0"))) ab.push("mai mult de o frază");
    if ((t.match(/;/g) || []).length > 1) ab.push("mai mult de un „;”");
  }
  if (r.randuri && t.split("\n").length > r.randuri) ab.push("peste " + r.randuri + " rânduri");
  for (const [re, ce] of INTERZIS) if (re.test(t)) ab.push(ce);
  if (frate && norm(frate).length >= 15 && norm(t).includes(norm(frate))) ab.push("repetă titlul");
  // v100.66 (pachetul 3): alerta - randul 1 = faptul, randul 2 = „👉 ” + o actiune la persoana I; raportul - fiecare rand ≤ 160
  if (r.alerta) {
    const [l1, l2] = t.split("\n");
    for (const a of verifica(l1, "deCe")) ab.push("rândul 1: " + a);
    if (l2 !== undefined) { if (!/^👉 /.test(l2)) ab.push("rândul 2 nu începe cu „👉 ”"); else for (const a of verifica(l2.slice(3), "faCe")) ab.push("rândul 2: " + a); }
  }
  if (r.rand) t.split("\n").forEach((l, i) => { if (l.length > r.rand) ab.push("rândul " + (i + 1) + " lung: " + l.length + " > " + r.rand); });
  if (r.strigat && /\b(DEPĂȘITĂ|STINS|IEȘI|CU|NU|NEOBIȘNUIT|ATENȚIE)\b/.test(t)) ab.push("majuscule de strigat");
  // v100.65 (M2 din revizia pachetului 2): o frecvență „(k din n)” cu n sub 30 poartă „puține cazuri” (pragul scenariului: 30)
  // revizia Opus a 2b (10): marcajul se cauta in ACEEASI paranteza (altfel il „imprumuta” de la alta frecventa), iar „(k din n, …)” nu mai scapa
  for (const m of t.matchAll(/\((\d+) din (\d+)(?!\d|[.,]\d)([^)]*)\)/g)) if (Number(m[2]) < 30 && !/puține cazuri/.test(m[3])) { ab.push("frecvență pe " + m[2] + " cazuri fără „puține cazuri”"); break; }
  return ab;
}

// ---- situatiile (datele lui; aceleasi forme ca in probele v96.3, v99, v101.8, v100.44) ----
const T0 = Date.UTC(2026, 9, 1, 16, 0), ORA = 3600000;
const bare = (salt) => Array.from({ length: 300 }, (_, i) => { const c = 100 * (1 + (i % 2 ? 0.001 : -0.001)) * (i >= 204 ? 1 + salt * (i - 203) / 96 : 1); return { t: i, o: c, h: c * 1.001, l: c * 0.999, c }; });
const SUS = G.regim(bare(0.08)), JOS = G.regim(bare(-0.08)), LIN = G.regim(bare(0));
const JTO = (o) => Object.assign({ id: "2386", baza: "JTO.PERP", quote: "USDT", directie: "long", levier: 5, investit: 98.14, profitTotal: -10.12, pretCurent: 0.5831, gridJos: 0.5722, gridSus: 0.6572,
  distantaLichidarePct: 19.09, opritorPierdere: null, opritorPierdereActiv: false, brut: { buOrderData: { row: 6, gridType: "geometric" } } }, o || {});
const fisa = (o) => Object.assign({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false },
  liniste: { linisteAcum: true, suficient: true, p: 0.5, n: 10, k: 5 },
  setare: { jos: 0.5459, sus: 0.6279, grile: 6, pas: 0.0236, levier: 5, dir: "long", stop: { jos: 0.52, sus: 0.66 } }, treceriZi: 1.4,
  deasa: { setare: { jos: 0.5459, sus: 0.6279, grile: 46, pas: 0.00305, levier: 5, dir: "long", stop: { jos: 0.542, sus: 0.632 } }, treceriZi: 18.5, antren: { mediana: 0.012, lichidari: 0, umpleriMedii: 37 }, test: { mediana: 0.004, lichidari: 0 }, respinsa: false, motiv: "" },
  propusa: "deasa" }, o || {});
const LIGHTER = (o) => Object.assign({ id: "2390", baza: "LIGHTER.PERP", directie: "long", levier: 5, investit: 103.38, activ: true,
  pozitie: 56, pretDeschidere: 4.484, pretCurent: 4.473, profitNet: -0.126, profitTotal: -0.74, pnlNerealizatSigur: true,
  gridJos: 4.085, gridSus: 4.837, pretLichidare: 3.49, distantaLichidarePct: 22.56,
  opritorPierdere: 3.787, opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdereRaport: null,
  opritorProfit: 5.112, opritorProfitActiv: true, opritorProfitTip: "pret", opritorProfitRaport: null,
  brut: { buOrderData: { row: 16, perVolume: "7", gridType: "geometric" } } }, o || {});
const VVV = (o) => Object.assign({ directie: "long", pretCurent: 30.77, gridJos: 25, gridSus: 33, investit: 96.6, profitTotal: 4.2, profitNet: 1.2, pozitie: 5.9, pretDeschidere: 30.1, pnlNerealizatSigur: true,
  distantaLichidarePct: 30, opritorPierdereActiv: true, opritorPierdere: 26.633 }, o || {});
const CRV = (o) => Object.assign({ id: "2394", baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, profitTotal: -3.2, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331,
  distantaLichidarePct: 12.4, opritorPierdere: 0.38, opritorPierdereActiv: true }, o || {});
const PM = { jos: 0.03, sus: 0.03, sursa: "profilul CRV: 183 de zile de bare de 1 h", frecventa: () => 0.27 };
const PLAN_L = { plus: 5.5, minus: 15.7, afaraOre: 12 };
// v100.62 (pachetul 2): sfaturile REALE cer buOrderData-ul Pionex (scenariul pana la marginea de jos) si lumanari de 4 h (cat de des a coborat atat)
const cuBrut = (b, o) => ({ ...b, gridProfitBrut: 3.2, pornitLa: T0 - 4 * 86400000, pretLichidare: b.pretLichidare ?? +(b.pretCurent * 0.8).toFixed(4),
  brut: { buOrderData: Object.assign({ bottom: String(b.gridJos), top: String(b.gridSus), row: 7, perVolume: "40", position: "160", positionOpenPrice: String(+(b.pretCurent * 1.03).toFixed(4)),
    marginBalance: String(+(b.investit * 0.9).toFixed(2)), trend: b.directie, gridProfit24h: "0.80", trx24h: 30, closedExchangeOrderCount: 120 }, o || {}) } });
const K4 = (p, amp) => Array.from({ length: 500 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 5)); return { time: T0 - (500 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
// fisa cu linistea intreaga (cum o da GridProba.fisa: zilele de liniste, cazurile, intervalul de incredere)
const fisaS = (o) => fisa(Object.assign({ liniste: { linisteAcum: true, zileLiniste: 0.4, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 } }, o || {}));
// directia pe 4 ore si 1 zi, ca Directie.analizeaza (formare = bara de 4 ore care se face acum)
const REZ = (d4, d1, formare) => [{ tf: "4H", eticheta: "4 ore", dir: d4, fata: { ton: d4 === "coboara" ? "rau" : "bine" }, formare: formare || null }, { tf: "1D", eticheta: "1 zi", dir: d1, fata: { ton: d1 === "coboara" ? "rau" : "bine" } }];
const MOTIVE_JOS = ["4h: EMA20 sub EMA50, EMA50 coboară", "1z: EMA20 sub EMA50, EMA50 coboară", "structura 4h: maxime și minime tot mai jos"];

export function situatii() {
  const out = [];
  const pune = (sit, mod, sursa, obj, chei) => { for (const [k, tip] of chei) if (obj && typeof obj[k] === "string" && obj[k]) out.push({ sit, mod, sursa: sursa + "." + k, tip, text: obj[k], frate: k === "motiv" || k === "titlu" ? null : obj.motiv || obj.titlu || null }); };
  const sem = (sit, x) => {
    const r = S.semafor(x);
    pune(sit, "semafor", "semafor", r, [["motiv", "titlu"], ["faCe", "faCe"], ["deCe", "deCe"]]);
    (r.componente || []).forEach((c) => pune(sit, "semafor", "semafor." + c.cod, c, [["motiv", "titlu"], ["faCe", "faCe"], ["faCeSlab", "faCe"], ["deCe", "deCe"]]));
    return r;
  };
  const muta = S.mutaGridul(JTO({ pretCurent: 0.575 }), fisa(), 0, PM);
  pune("muta: la margine, cu profil", "semafor", "mutaGridul", muta, [["motiv", "titlu"], ["deCe", "deCe"]]);
  pune("muta: la margine, fara profil", "semafor", "mutaGridul", S.mutaGridul(JTO({ pretCurent: 0.575 }), fisa(), 0, null), [["motiv", "titlu"], ["deCe", "deCe"]]);
  pune("muta: in afara gridului", "semafor", "mutaGridul", S.mutaGridul(JTO({ pretCurent: 0.55 }), fisa(), 5.25, null), [["motiv", "titlu"]]);
  pune("grid mai des", "semafor", "gridMaiDes", S.gridMaiDes(JTO(), fisa()), [["motiv", "deCe"]]);
  const btc = S.btcAvertizare({ miscare: true, r4h: 2.1, r24h: 1.4 }, { miscare: false });
  pune("btc", "semafor", "btcAvertizare", btc, [["text", "deCe"]]);
  const ag = S.aglomerare({ funding: 0.0006, longShort: 2.1, oiHist5m: [{ sumOpenInterest: 100 }, { sumOpenInterest: 120 }] }, "long");
  pune("aglomerare", "semafor", "aglomerare", ag, [["text", "discordMesaj"], ["dovezi", "detalii"]]);
  const agS = S.aglomerare({ funding: -0.0005, longShort: 0.5, oiHist5m: [] }, "short");
  pune("aglomerare short", "semafor", "aglomerare", agS, [["text", "discordMesaj"], ["dovezi", "detalii"]]);
  const iap = S.iaProfit(JTO({ profitTotal: 5 }), { ...fisa(), regim: JOS });
  pune("ia profit", "semafor", "iaProfit", iap, [["text", "deCe"]]);
  const crv = CRV();
  sem("lichidarea 12,4%, se indeparteaza", { bot: crv, fisa: fisa(), distInainte: 11.2 });
  sem("lichidarea 12,4%, se apropie", { bot: crv, fisa: fisa(), distInainte: 13.6 });
  sem("lichidarea 12,4%, fara istoric", { bot: crv, fisa: fisa() });
  sem("lichidarea 6%", { bot: CRV({ distantaLichidarePct: 6 }), fisa: fisa() });
  sem("lichidarea depasita", { bot: CRV({ distantaLichidarePct: -3.4 }), fisa: fisa() });
  sem("planul: minus atins", { bot: JTO(), fisa: fisa(), plan: { atins: ["minus"], minus: { prag: 10 } } });
  sem("planul: plus atins, piata contra", { bot: JTO(), fisa: { ...fisa(), regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5 } } });
  sem("planul: plus atins, piata cu botul", { bot: JTO(), fisa: { ...fisa(), regim: SUS }, plan: { atins: ["plus"], plus: { prag: 5 } } });
  sem("planul: afara din grid", { bot: JTO(), fisa: fisa(), plan: { atins: ["afara"] } });
  sem("trend contra", { bot: JTO(), fisa: fisa({ directie: { dir: "short", tarie: "tare", motive: [] } }) });
  sem("miscare contra", { bot: JTO(), fisa: { ...fisa(), regim: JOS } });
  sem("cu botul, pe plus", { bot: VVV({ pretCurent: 30, profitTotal: 1 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } });
  sem("cu botul, stopul dincolo de zero", { bot: VVV({ pretCurent: 30, profitTotal: 1, opritorPierdere: 29 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } });
  sem("cu botul, peste margine", { bot: VVV({ pretCurent: 34 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } });
  sem("cu botul, short", { bot: VVV({ directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35, opritorPierdereActiv: false }), fisa: { regim: JOS }, zero: { pretZero: 31 } });
  sem("muta gridul", { bot: JTO({ pretCurent: 0.575 }), fisa: fisa(), muta });
  sem("costuri", { bot: JTO(), fisa: fisa(), costuri: { netZi: -0.3 } });
  sem("btc", { bot: JTO(), fisa: fisa(), btc });
  sem("btc fara multiplu (colector vechi)", { bot: JTO(), fisa: fisa(), btc: { nivel: "atentie", text: "BTC" } });
  sem("aglomerare", { bot: JTO(), fisa: fisa(), aglomerare: ag });
  sem("ia profit", { bot: JTO({ profitTotal: 5 }), fisa: { ...fisa(), regim: LIN }, iaProfit: iap });
  sem("fara fisa", { bot: JTO() });
  sem("nimic de facut", { bot: JTO(), fisa: fisa() });
  const vplan = (b) => T.planStare(b, { plus: 3, minus: 14 }, {}, 0);
  sem("tinta atinsa, de pastrat", { bot: VVV(), fisa: { regim: LIN }, plan: vplan(VVV()) });
  sem("tinta atinsa, de pastrat, poate urca", { bot: VVV({ pretCurent: 31.5 }), fisa: { regim: LIN }, plan: vplan(VVV({ pretCurent: 31.5 })) });
  sem("tinta atinsa, la adapost", { bot: VVV({ opritorPierdere: 30.6 }), fisa: { regim: LIN }, plan: vplan(VVV({ opritorPierdere: 30.6 })) });
  // cartelele „Acum, concret”
  const card = (sit, x) => { const l = S.acumConcret(x); l.forEach((c) => pune(sit, "cartele", "cartela." + c.cod, { ...c, titlu: null, motiv: null }, [["act", "rand"], ["deCe", "deCe"], ["text", "detalii"], ["bani", "detalii"], ["mic", "detalii"], ["sursa", "detalii"]])); return l; };
  card("JTO pe minus, fara stop", { bot: JTO(), fisa: fisa(), zero: { pretZero: 0.5984 }, costuri: { grile24h: 0.9, umpleri24h: 5, netZi: 0.4 }, acum: T0 });
  card("JTO pe plus, fara stop", { bot: JTO({ pretCurent: 0.62, profitTotal: 3 }), fisa: fisa(), zero: { pretZero: 0.6012 }, costuri: {}, acum: T0 });
  card("JTO pe plus, stopul dincolo de zero", { bot: JTO({ pretCurent: 0.62, profitTotal: 3, opritorPierdere: 0.605, opritorPierdereActiv: true }), fisa: fisa(), zero: { pretZero: 0.6012 }, costuri: {}, acum: T0 });
  card("JTO neutru", { bot: JTO({ directie: "neutru" }), fisa: fisa(), zero: { pretZero: 0.5984 }, costuri: {}, acum: T0 });
  card("JTO sub grid, miscare contra", { bot: JTO({ pretCurent: 0.57 }), fisa: { ...fisa(), regim: JOS }, zero: { pretZero: 0.5984 }, costuri: {}, acum: T0 });
  card("JTO stop in grid", { bot: JTO({ opritorPierdere: 0.58, opritorPierdereActiv: true }), fisa: fisa(), zero: { pretZero: 0.5984 }, costuri: {}, acum: T0 });
  card("JTO fara zero", { bot: JTO(), fisa: null, zero: null, costuri: {}, acum: T0 });
  const lp = T.planStare(LIGHTER(), PLAN_L, {}, T0);
  const conL = card("LIGHTER stopul peste plan", { bot: LIGHTER(), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, plan: lp, acum: T0, bani: { stop: { laOpritor: -63.5, laPropus: -15.7, frecventa: 0.71, pretPropus: 4.2601 } } });
  card("LIGHTER fara stop, cu plan", { bot: LIGHTER({ opritorPierdereActiv: false }), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, plan: T.planStare(LIGHTER({ opritorPierdereActiv: false }), PLAN_L, {}, T0), acum: T0 });
  card("LIGHTER stopul pe plan", { bot: LIGHTER({ opritorPierdere: 4.05 }), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, plan: T.planStare(LIGHTER({ opritorPierdere: 4.05 }), { minus: Math.ceil(-T.totalLaOpritor(LIGHTER({ opritorPierdere: 4.05 }))) }, {}, T0), acum: T0 });
  card("short, stopul din profil", { bot: { ...JTO({ directie: "short", pretCurent: 0.47, gridJos: 0.40, gridSus: 0.50 }), profitTotal: -3 }, fisa: fisa(), zero: { pretZero: 0.45 }, costuri: {}, pragMargine: PM, pragStop: { dist: 0.12, sursa: "profilul CRV" }, acum: T0 });
  card("stopul tau mai strans decat propunerea", { bot: LIGHTER(), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, plan: lp, acum: T0, bani: { stop: { laOpritor: -10.2, laPropus: -21, frecventa: 0.4 } } });
  // Consilierul (fara sfaturile vechi din sfaturi.js - acelea sunt pachetul 2)
  const cons = (sit, x) => {
    const c = C.alcatuieste(x);
    pune(sit, "consiliu", "consiliu", c, [["titlu", "titlu"], ["faCe", "faCe"], ["explica", "deCe"], ["bani", "detalii"], ["incredere", "detalii"]]);
    c.motive.forEach((m, i) => pune(sit, "consiliu", "consiliu.motiv" + (i + 1) + "." + m.cod, m, [["titlu", "titlu"], ["text", "deCe"], ["extra", "detalii"]]));
    return c;
  };
  const smL = S.semafor({ bot: LIGHTER(), fisa: { regim: LIN }, plan: lp });
  const cL = cons("LIGHTER: stopul peste plan", { sm: smL, concret: conL, sfaturi: [], consilier: [], socoteala: null, opritor: 3.787 });
  cons("lichidarea se indeparteaza + muta gridul", { sm: S.semafor({ bot: crv, fisa: fisa(), distInainte: 11.2, muta }), concret: [], sfaturi: [] });
  cons("lichidarea se apropie + trend contra", { sm: S.semafor({ bot: crv, fisa: fisa({ directie: { dir: "short", tarie: "tare", motive: [] } }), distInainte: 13.6 }), concret: [], sfaturi: [] });
  cons("gridul incheie putine perechi", { sm: S.semafor({ bot: JTO(), fisa: fisa() }), concret: [], sfaturi: [], perechi: { real: 1.2, est: 4, raport: 0.3, fereastra: "în ultimele 30 h", corectat: true } });
  cons("cu botul (verdict ȚINE cu explicatie)", { sm: S.semafor({ bot: VVV({ pretCurent: 30, profitTotal: 1 }), fisa: { regim: SUS }, zero: { pretZero: 28.5 } }), concret: [], sfaturi: [] });
  cons("fara fisa", { sm: S.semafor({ bot: JTO() }), concret: [], sfaturi: [] });
  // revizia 02.10 (pozele pe CRV + revizia Opus): situatiile care lipseau
  cons("lichidarea 4,5% + verdictul vechi „Ieși”", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 4.5 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Mai sunt 4.5% până la lichidare." } });
  cons("Pionex: marginea MARGIN_CALL", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează marginea contului ca MARGIN_CALL, nu NORMAL." } });
  cons("Pionex: starea de risc", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează starea de risc ca REDUCE_ONLY, nu TRADING." } });
  const mutaJ = S.mutaGridul(JTO({ pretCurent: 0.575 }), fisa(), 0, PM);
  cons("mută gridul contopit cu sfatul „margine”", { sm: S.semafor({ bot: JTO({ pretCurent: 0.575, distantaLichidarePct: 30 }), fisa: fisa(), muta: mutaJ }), concret: [], sfaturi: [{ cod: "margine", ton: "atentie", titlu: "0,5% până la marginea de jos (0.5722)", text: "~170 JTO la margine (acum 160), total ~−7,34 USDT; coboară atât în 64% din zile (31 din 49).", faCe: "" }] });
  sem("planul: minus fractionar (−7,5)", { bot: JTO(), fisa: fisa(), plan: { atins: ["minus"], minus: { prag: 7.5 } } });
  sem("planul: plus fractionar (+5,5)", { bot: JTO(), fisa: { ...fisa(), regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5.5 } } });
  card("stopul atins costa ~0", { bot: LIGHTER({ opritorPierdere: 4.4 }), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, acum: T0, plan: { atins: [], minus: { prag: 0.3, laOpritor: -0.3, opritorPlan: 4.39 } } });
  sem("costuri sub un cent pe zi", { bot: JTO(), fisa: fisa(), costuri: { netZi: -0.004 } });
  // Discord: schimbarea verdictului (a doua tura la rand), cu un nume lung de moneda
  for (const nume of ["LIGHTER", "1000BONK"]) {
    let st = {}; const v1 = { ...cL, nivel: "tine", eticheta: "🟢 Ține", motive: [] };
    st = C.schimbare(st, v1, T0, nume).stare; st = C.schimbare(st, cL, T0 + 1, nume).stare;
    const al = C.schimbare(st, cL, T0 + 2, nume).alerta;
    pune("Discord: " + nume + " trece pe atenție", "consiliu", "consiliu.schimbare", al, [["titlu", "discordTitlu"], ["mesaj", "discordMesaj"]]);
  }
  pune("alta voce", "consiliu", "consiliu.altaVoce", { t: C.altaVoce({ acum: { nivel: "tine", eticheta: "🟢 Ține" } }, { nivel: "atentie" }) }, [["t", "deCe"]]);
  pune("deciziile tale", "consiliu", "consiliu.socotealaDecizii", C.socotealaDecizii(Array.from({ length: 40 }, (_, i) => ({ r: i % 2 ? 1 : -1, urmat: i % 3 === 0 }))), [["text", "deCe"]]);

  // ---- pachetul 2 ----
  // sfaturile REALE (ideea 2 din pachetul 1): Sfaturi.intrare + Sfaturi.sfaturi, ca pe Tablou si in colector; „pericol” are titlul si
  // textul din regulile alertelor (grupul „alerte”, pachetul 3) - aici se judeca doar actiunea lui
  const sf = (sit, bot, o = {}) => {
    const x = SF.intrare({ bot, k4: o.k4 === undefined ? K4(bot.pretCurent, 0.06) : o.k4, fata4h: o.fata4h, dir4h: o.dir4h, funding: o.funding ?? null,
      fisa: o.fisa === undefined ? fisaS() : o.fisa, rezumat: o.rezumat || null, acum: T0 });
    Object.assign(x, o.peste || {});
    const l = SF.sfaturi(x);
    for (const s of l) {
      if (s.cod === "pericol") { pune(sit, "alerte", "sfat.pericol." + s.tip, s, [["titlu", "titlu"], ["text", "deCe"]]); pune(sit, "sfaturi", "sfat.pericol." + s.tip, s, [["faCe", "faCe"]]); }
      else pune(sit, "sfaturi", "sfat." + s.cod, s, [["titlu", "titlu"], ["text", "deCe"], ["faCe", "faCe"], ["sursa", "detalii"], ["deCe", "detalii"]]);
    }
    return l;
  };
  const crvM = cuBrut(CRV({ pretCurent: 0.3858, pretLichidare: 0.3383, distantaLichidarePct: 30 })), jtoR = cuBrut(JTO({ distantaLichidarePct: 30, pretLichidare: 0.47 }));
  const fisaSig = fisaS({ setare: { ...fisa().setare, levierSigur: 4 } });
  sf("CRV lângă marginea de jos", crvM);
  sf("LIGHTER: trendul contra, tare", cuBrut(LIGHTER()), { fisa: fisaS({ directie: { dir: "short", tarie: "tare", motive: MOTIVE_JOS } }) });
  sf("JTO: mișcare mare contra", jtoR, { fisa: fisaS({ regim: { r4h: 2.4, r24h: 1.2, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } }) });
  sf("VVV: mișcare mare cu botul", cuBrut(VVV({ id: "2391", baza: "VVV.PERP", levier: 3 })), { fisa: fisaS({ regim: { r4h: 2.4, r24h: 1.6, miscare: true, sens: "urca" }, liniste: { linisteAcum: false } }) });
  sf("VVV short: mișcare cu botul, trendul contra", cuBrut(VVV({ id: "2392", baza: "VVV.PERP", directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35 })),
    { fisa: fisaS({ dir: "long", directie: { dir: "long", tarie: "mediu", motive: ["4h: EMA20 peste EMA50, EMA50 urcă"] }, regim: { r4h: 2.1, r24h: 1.3, miscare: true, sens: "coboara" }, liniste: { linisteAcum: false } }) });
  sf("JTO: liniște rară", jtoR, { fisa: fisaS({ liniste: { linisteAcum: true, zileLiniste: 1.6, n: 20, k: 4, p: 0.2, ic: [0.08, 0.42], suficient: true, H: 2 } }) });
  sf("CRV: ritmul a scăzut", crvM, { peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } });
  sf("CRV: ritmul a crescut, fără tranzacții", crvM, { peste: { ritm: { grile24h: 3.1, medieZi: 1.2, tranz24h: null, tranzMedieZi: null, zile: 4 } } });
  // revizia Opus (I3, 02.10): semnele reale ale grileVsCosturi - comisioanele negative, funding-ul negativ platit / pozitiv incasat
  sf("LIGHTER: funding-ul mănâncă grilele", cuBrut(LIGHTER()), { peste: { costuri: { netZi: -0.42, grile24h: 0.3, comisionZi: -0.12, fundingZi: -0.6, fundingMananca: true } } });
  sf("JTO: costuri sub un cent pe zi", jtoR, { peste: { costuri: { netZi: -0.004, grile24h: 0.01, comisionZi: -0.004, fundingZi: -0.01, fundingMananca: false } } });
  sf("JTO: costurile peste grile, funding încasat", jtoR, { peste: { costuri: { netZi: -0.07, grile24h: 0.05, comisionZi: -0.17, fundingZi: 0.05, fundingMananca: false } } });
  sf("JTO: grile dese și levier peste cel sigur", cuBrut(JTO({ levier: 8, distantaLichidarePct: 30 })), { fisa: fisaSig, peste: { geom: { netPct: 0.0012, preaDese: true, grile: 93, mod: "aritmetic" } } });
  sf("JTO: doar levierul peste cel sigur", cuBrut(JTO({ levier: 8, distantaLichidarePct: 30 })), { fisa: fisaSig, peste: { geom: null } });
  sf("CRV pe minus: zero-ul botului", crvM, { peste: { zero: { pretZero: 0.4012, distantaZeroPct: 0.0399, iei: 46.4 } } });
  sf("VVV short pe minus: zero-ul sub preț", cuBrut(VVV({ id: "2392", baza: "VVV.PERP", directie: "short", pretCurent: 30, gridJos: 27, gridSus: 35, profitTotal: -4 })), { peste: { zero: { pretZero: 29.1, distantaZeroPct: -0.03, iei: 92.6 } } });
  sf("direcția rea", jtoR, { rezumat: DR.rezumat(REZ("coboara", "coboara"), "long") });
  sf("direcția amestecată", jtoR, { rezumat: DR.rezumat(REZ("urca", "coboara"), "long") });
  sf("direcția cu botul, dar bara de 4 ore cade", jtoR, { rezumat: DR.rezumat(REZ("urca", "urca", { pct: -2.4 }), "long") });
  sf("direcția laterală", jtoR, { rezumat: DR.rezumat(REZ("lateral", "lateral"), "long") });
  // rezumatul directiei e si pe Tablou (panoul directiei, KPI-ul pietei)
  for (const [sit, r] of [["rea", REZ("coboara", "coboara")], ["amestecată", REZ("urca", "coboara")], ["cu botul, bara de 4 ore cade", REZ("urca", "urca", { pct: -2.4 })], ["laterală", REZ("lateral", "lateral")]])
    pune("direcția " + sit + " (Tablou)", "sfaturi", "directie.rezumat", DR.rezumat(r, "long"), [["text", "deCe"]]);
  sf("funding plătit, mare", cuBrut(JTO({ distantaLichidarePct: 30, finantare: -0.04 })), { funding: 0.0008 });
  sf("funding încasat, fără istoric", cuBrut(JTO({ distantaLichidarePct: 30, finantare: null })), { funding: -0.0002 });
  sf("lichidarea la 5% și prețul sub grid", cuBrut(CRV({ pretCurent: 0.375, pretLichidare: 0.3562, distantaLichidarePct: 5 })));
  sf("lichidarea la 12%", cuBrut(CRV({ pretLichidare: 0.3438, distantaLichidarePct: 12 })));
  sf("nimic urgent, fără lumânări de 4 h", cuBrut(JTO({ profitTotal: 2, distantaLichidarePct: 30 })), { k4: [] });
  // „Ce ai de făcut acum” (tablou-extra.js): randurile lui (planul lipsa, „Nimic urgent”) si ritmul de recuperare de sub „Rezultat total”
  const todo = (sit, o) => T.ceAiDeFacut(Object.assign({ acum: T0, dateLa: T0, sfaturi: [], avertismente: [], alerte: [], planGol: false }, o)).forEach((r) => {
    if (r.actiune === "plan" || r.c === "v") pune(sit, "todo", "todo." + (r.actiune || "gol"), r, [["titlu", "titlu"], ["text", "deCe"]]);
  });
  todo("planul lipsă", { planGol: true });
  todo("nimic de făcut", {});
  for (const [sit, a] of [["recuperare: pe plus", [3, 1]], ["recuperare: nu se recuperează", [-3, -0.2]], ["recuperare: sub 10 zile", [-3.2, 7.99]], ["recuperare: peste 10 zile", [-10, 0.8]]])
    pune(sit, "todo", "ritmRecuperare", T.ritmRecuperare(a[0], a[1]), [["text", "rand"]]);
  // Consilierul cu sfaturile REALE (M7 din revizia pachetului 1: primul motiv venit din sfaturi.js are tot titlul ≤ 60) + verdictul vechi (ideea 3)
  const cons2 = (sit, x) => {
    const c = C.alcatuieste(x);
    pune(sit, "consiliu-2", "consiliu", c, [["titlu", "titlu"], ["faCe", "faCe"], ["explica", "deCe"]]);
    c.motive.forEach((m, i) => pune(sit, "consiliu-2", "consiliu.motiv" + (i + 1) + "." + m.cod, m, [["titlu", "titlu"], ["text", "deCe"], ["extra", "detalii"]]));
    c.rest.forEach((r, i) => pune(sit, "consiliu-2", "consiliu.rest" + (i + 1), r, [["titlu", "titlu"]]));
    return c;
  };
  cons2("CRV lângă marginea de jos + mută gridul (sfatul real)", { sm: S.semafor({ bot: crvM, fisa: fisa(), muta: S.mutaGridul(crvM, fisa(), 0, PM) }), concret: [], sfaturi: sf("(pentru Consilier) CRV lângă margine", crvM) });
  cons2("primul motiv vine din sfaturi (ritmul + funding-ul)", { sm: S.semafor({ bot: jtoR, fisa: fisa() }), concret: [],
    sfaturi: sf("(pentru Consilier) ritmul + funding-ul", cuBrut(JTO({ distantaLichidarePct: 30, finantare: -0.04 })), { funding: 0.0008, peste: { ritm: { grile24h: 0.1, medieZi: 1.2, tranz24h: 2, tranzMedieZi: 14, zile: 4 } } }) });
  // revizia Opus a 2b (10): Consilierul CU directia pietei (rezumatul real din Directie) - motivul verde, cel galben, „Restul”
  const RZ = (d4, d1) => DR.rezumat([d4, d1].map((d, i) => ({ tf: i ? "1D" : "4H", eticheta: i ? "1 zi" : "4 ore", dir: d, fata: DR.fataDeBot(d, "long") })), "long");
  const crvP = CRV({ distantaLichidarePct: 30, pretCurent: 0.41 });
  for (const [sit, d4, d1] of [["piața liniștită și laterală (motivul verde cu direcția)", "lateral", "lateral"], ["piața cu botul", "urca", "urca"],
    ["piața contra botului (motivul galben, cu structura pe medii)", "coboara", "coboara"], ["piața amestecată, un interval lateral (în „Restul”)", "lateral", "coboara"]])
    cons2(sit, { sm: S.semafor({ bot: crvP, fisa: fisa() }), concret: [], sfaturi: sf("(pentru Consilier) " + sit, crvP, { rezumat: RZ(d4, d1) }) });
  cons2("verdictul vechi: lichidarea depășită", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Prețul a trecut deja de pragul de lichidare cu 1.2%." } });
  cons2("verdictul vechi: Pionex MARGIN_CALL", { sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa: fisa() }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează marginea contului ca MARGIN_CALL, nu NORMAL." } });
  // avertismentele serverului (functions/_shared/avertismente.js): randurile de sus din „Ce ai de făcut acum” si lista botilor
  const av = (sit, o) => avertismenteBot(o).forEach((t, i) => pune(sit, "server", "avertisment" + (i + 1), { t }, [["t", "rand"]]));
  av("CRV: fără stop, peste grid, lichidarea la 10,9%, pe minus deși grilele câștigă", { x: {}, pret: 0.3806, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: 0.3382876201448984, lichidarePartea: "jos", distantaLichidarePct: 10.93, lichidareDepasita: false }, comisioane: -1.21, gridProfitBrut: 10.91, profitNet: -1.6 });
  av("lichidarea depășită, sub grid, comisioanele peste grile", { x: { lossStop: "0.36" }, pret: 0.3301, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: 0.3382876201448984, lichidarePartea: "jos", distantaLichidarePct: -2.4, lichidareDepasita: true }, comisioane: -2.5, gridProfitBrut: 1.2, profitNet: -9 });
  av("comisioanele necunoscute", { x: { profitStop: "5" }, pret: 0.375, jos: 0.37, sus: 0.38,
    lich: { pretLichidare: null, lichidarePartea: null, distantaLichidarePct: null, lichidareDepasita: false }, comisioane: null, gridProfitBrut: 3, profitNet: -2 });
  // v100.65 (M2 din revizia pachetului 2): formele reale - prețuri BTC cu 5 cifre și sume în mii; o monedă sub 0,01 (PUMP)
  av("BTC: fără stop, sub grid, lichidarea la 9,2%, pe minus deși grilele câștigă", { x: {}, pret: 64123.45, jos: 66000, sus: 72000,
    lich: { pretLichidare: 58234.123456, lichidarePartea: "jos", distantaLichidarePct: 9.18, lichidareDepasita: false }, comisioane: -1234.56, gridProfitBrut: 2345.67, profitNet: -3456.78 });
  av("BTC: lichidarea depășită, comisioanele peste grile", { x: { lossStop: "60000" }, pret: 57123.45, jos: 60000, sus: 72000,
    lich: { pretLichidare: 58234.123456, lichidarePartea: "jos", distantaLichidarePct: -1.9, lichidareDepasita: true }, comisioane: -1234.56, gridProfitBrut: 987.65, profitNet: -4321.09 });
  av("monedă sub 0,01: peste grid, lichidarea la 14,8%", { x: {}, pret: 0.0051234, jos: 0.0042, sus: 0.0051,
    lich: { pretLichidare: 0.00436512, lichidarePartea: "jos", distantaLichidarePct: 14.8, lichidareDepasita: false }, comisioane: -12.3456, gridProfitBrut: 9.87, profitNet: -32.1 });
  // v100.66 (pachetul 3): toate alertele, pe fiecare ramura (scripts/lib/garda-alerte.mjs)
  situatiiAlerte(pune);
  return out;
}

function main() {
  const l = situatii(), pe = {}, rele = [];
  for (const x of l) {
    const ab = verifica(x.text, x.tip, x.frate);
    const p = pe[x.mod] || (pe[x.mod] = { texte: 0, abateri: 0 });
    p.texte++; p.abateri += ab.length ? 1 : 0;
    if (ab.length) rele.push({ ...x, ab });
  }
  console.log("\nGarda textelor · " + l.length + " texte generate pe situatiile lui\n");
  for (const m of Object.keys(pe)) console.log("  " + (STRICT.has(m) ? "STRICT " : "raport ") + m.padEnd(11) + pe[m].texte + " texte, " + pe[m].abateri + " cu abateri");
  const i = process.argv.indexOf("--inventar");
  const mods = (process.argv.find((a) => a.startsWith("--mod=")) || "").slice(6).split(",").filter(Boolean), inMod = (x) => !mods.length || mods.includes(x.mod);
  if (i > 0 && process.argv[i + 1]) {
    const linii = ["| Situația | Sursa | Lung. | Text |", "|---|---|---|---|"].concat(l.filter(inMod).map((x) => "| " + x.sit + " | " + x.sursa + " | " + x.text.length + " | " + x.text.replace(/\|/g, "\\|").replace(/\n/g, " ⏎ ") + " |"));
    const d = l.filter((x) => x.sursa === "consiliu.schimbare.titlu").map((x) => mesajDiscord({ nivel: "atentie", titlu: x.text, mesaj: (l.find((y) => y.sit === x.sit && y.sursa === "consiliu.schimbare.mesaj") || {}).text || "" }));
    fs.mkdirSync(path.dirname(path.resolve(process.argv[i + 1])), { recursive: true });
    fs.writeFileSync(process.argv[i + 1], linii.join("\n") + "\n\n## Discord (de probă, netrimis)\n\n```json\n" + JSON.stringify(d.map((x) => ({ content: x.content, description: x.embeds[0].description })), null, 1) + "\n```\n");
    console.log("\n  inventarul: " + process.argv[i + 1]);
  }
  const stricte = rele.filter((x) => STRICT.has(x.mod));
  for (const x of stricte) console.log("\n  PICA [" + x.mod + "] " + x.sit + " · " + x.sursa + " (" + x.text.length + "): " + x.ab.join("; ") + "\n       " + x.text);
  if (process.argv.includes("--tot")) for (const x of rele.filter((y) => !STRICT.has(y.mod))) console.log("\n  [" + x.mod + "] " + x.sit + " · " + x.sursa + " (" + x.text.length + "): " + x.ab.join("; ") + "\n       " + x.text);
  console.log("\n" + (stricte.length ? "PICA · " + stricte.length + " abateri pe pachetele stricte" : "PASS · pachetele stricte (" + ([...STRICT].join(", ") || "niciunul încă") + ") fără abateri") + "\n");
  if (stricte.length) process.exit(1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
