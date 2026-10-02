// Garda textelor (specul „sfaturi concise”, 02.10): genereaza sfaturile REAL, cu modulele paginii, pe situatii din datele lui
// (CRV, LIGHTER, JTO, VVV) si verifica regulile de scris: titlul ≤ 60, „Ce aș face eu” ≤ 110 la persoana I, explicatia ≤ 160 si
// o singura fraza, Discord titlu ≤ 60 + cel mult 2 randuri, virgula zecimala, minusul „−”, vocabularul, avertizarile comune
// doar in legenda. Pachetele terminate sunt STRICTE (orice abatere = esec); celelalte doar raporteaza (nu blocheaza suita).
//   node scripts/garda-texte.mjs                      -> raportul + esec pe pachetele stricte
//   node scripts/garda-texte.mjs --inventar <fisier>  -> si lista textelor (situatie, sursa, lungime, text) in Markdown
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mesajDiscord } from "./lib/canal-discord.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const f of ["text-ro.js", "grid-calcul.js", "tablou-extra.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8"), { filename: f });
const { GridCalcul: G, SemnaleBot: S, TabloExtra: T, Consiliu: C } = globalThis;

// pachetele trecute pe „strict” - unul cate unul, la terminarea lui (semafor + cartele = semnale-bot.js, consiliu = consiliu.js)
export const STRICT = new Set(["semafor"]);

// ---- regulile ----
export const REGULI = {
  titlu: { max: 60 },
  faCe: { max: 110, persoana: true, oFraza: true },
  rand: { max: 110, oFraza: true },
  deCe: { max: 160, oFraza: true },
  detalii: {},
  discordTitlu: { max: 60 },
  discordMesaj: { randuri: 2 },
};
const PERSOANA = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
export const INTERZIS = [
  [/\d\.\d+\s?(%|×|h\b|min\b|USDT\b|lei\b)/, "zecimală cu punct (vrea virgulă)"],
  [/(^|[\s(·:])-\d/, "minus ASCII (vrea „−”)"],
  [/NaN|undefined|null|Infinity|\[object/, "gunoi în text"],
  [/!(?!=)/, "semn de exclamare"],
  [/[Oo]pritor/, "„opritor” (vocabular: „stopul”)"],
  [/\bOprește botul\b|\bIeși acum\b|\bopresc\b/, "„oprește / ieși” (vocabular: „închide botul”)"],
  [/\bvezi\b|mai jos/i, "trimitere „vezi … / mai jos”"],
  [/s-a apropiat|a ajuns să/, "umplutură („s-a apropiat”, „a ajuns să”)"],
  [/frecvență din trecut|nu o promisiune|un semn, nu o regulă|nu o dovadă/i, "avertizarea comună (locul ei e în legendă)"],
  [/ÎMPOTRIVA|\bSUB gridul|\bPESTE gridul/, "majuscule de strigat"],
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
  pune("aglomerare", "semafor", "aglomerare", ag, [["text", "deCe"]]);
  const agS = S.aglomerare({ funding: -0.0005, longShort: 0.5, oiHist5m: [] }, "short");
  pune("aglomerare short", "semafor", "aglomerare", agS, [["text", "deCe"]]);
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
  // Discord: schimbarea verdictului (a doua tura la rand), cu un nume lung de moneda
  for (const nume of ["LIGHTER", "1000BONK"]) {
    let st = {}; const v1 = { ...cL, nivel: "tine", eticheta: "🟢 Ține", motive: [] };
    st = C.schimbare(st, v1, T0, nume).stare; st = C.schimbare(st, cL, T0 + 1, nume).stare;
    const al = C.schimbare(st, cL, T0 + 2, nume).alerta;
    pune("Discord: " + nume + " trece pe atenție", "consiliu", "consiliu.schimbare", al, [["titlu", "discordTitlu"], ["mesaj", "discordMesaj"]]);
  }
  pune("alta voce", "consiliu", "consiliu.altaVoce", { t: C.altaVoce({ acum: { nivel: "tine", eticheta: "🟢 Ține" } }, { nivel: "atentie" }) }, [["t", "deCe"]]);
  pune("deciziile tale", "consiliu", "consiliu.socotealaDecizii", C.socotealaDecizii(Array.from({ length: 40 }, (_, i) => ({ r: i % 2 ? 1 : -1, urmat: i % 3 === 0 }))), [["text", "deCe"]]);
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
  for (const m of Object.keys(pe)) console.log("  " + (STRICT.has(m) ? "STRICT " : "raport ") + m.padEnd(10) + pe[m].texte + " texte, " + pe[m].abateri + " cu abateri");
  const i = process.argv.indexOf("--inventar");
  if (i > 0 && process.argv[i + 1]) {
    const linii = ["| Situația | Sursa | Lung. | Text |", "|---|---|---|---|"].concat(l.map((x) => "| " + x.sit + " | " + x.sursa + " | " + x.text.length + " | " + x.text.replace(/\|/g, "\\|").replace(/\n/g, " ⏎ ") + " |"));
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
