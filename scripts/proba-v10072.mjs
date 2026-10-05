// Proba v100.72 - sfaturile concise, pachetul 5 (Acasă, rapoartele, fișa): obiceiurile (istoricul monedei, prima oră, frâna, poarta,
// raportul de duminică, autopsia, regulile tale), Acasă (vremea, BTC și bursa, raportul săptămânii pieței), fișa (verdictul, gridul îngust)
// și textele fișei din app.js - virgula zecimală și minusul „−”, o frază, acțiunea la persoana I, rândurile de raport ≤ 160.
//   node scripts/proba-v10072.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea semnale-bot.js / consiliu.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";   // incarca modulele (Acasa, Obiceiuri, GridCalcul, GridProba, JurnalTrade)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Acasa: AC, Obiceiuri: OB, GridCalcul: G, GridProba: GP } = globalThis;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 4, 18, 0), ZI = 86400000, ORA = 3600000;
const PERS = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
const faraAb = (t, tip, cine) => { const ab = verifica(t, tip); assert.deepEqual(ab, [], (cine || "") + ": " + ab.join("; ") + " — " + t); };
const app = () => fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
const tr = (m, rez, o) => Object.assign({ id: "x" + Math.random(), moneda: m, rezultat: rez, net: rez, inchis: T0 - 5 * ZI, pornit: T0 - 6 * ZI, durataOre: 30, comisioane: -0.2, funding: 0, dir: "long", greseli: [] }, o || {});

console.log("Proba v100.72 · sfaturile concise, pachetul 5 (Acasă, rapoartele, fișa)");

await test("obiceiurile: sumele cu virgulă, istoricul monedei într-o frază (cu „prea puțini” în paranteză), frâna cu acțiunea o dată", () => {
  const ist = Array.from({ length: 2 }, (_, i) => tr("BCH", i ? -12 : 1.32));
  const t = OB.istoricMoneda(ist, "BCH").text; faraAb(t, "deCe", "istoricul pe 2 boți"); assert.match(t, /−11,08 USDT/); assert.match(t, /prea puțini/);
  const f = OB.frana({ trades: [tr("A", -12.05, { inchis: T0 - 2 * ORA }), tr("B", -12.05, { inchis: T0 - 3 * ORA })], acum: T0 });
  faraAb(f.text, "deCe", "frâna"); assert.match(f.text, /−24,10 USDT/); assert.equal((f.text.match(/n-aș mai porni boți azi/gi) || []).length, 1, f.text);
});

await test("raportul de duminică: regula săptămânii la persoana I, „Laboratorul a dovedit” fără majuscule, rândurile ≤ 160 cu virgulă", () => {
  const rd = OB.raportDuminica({ trades: [], acum: T0 });
  assert.ok(rd.linii.every((l) => verifica(l, "raport").length === 0), rd.linii.join(" | "));
  const r2 = OB.raportDuminica({ trades: [tr("CRV", -3, { inchis: T0 - ZI })], acum: T0, laborator: { intrebari: [{ verdict: "dovedit", titlu: "după o mișcare mare, gridul iese mai rău" }] } });
  const tot = r2.linii.join("\n"); assert.doesNotMatch(tot, /DOVEDIT/); assert.match(tot, /Laboratorul a dovedit/);
  assert.match(r2.regula, /^Regula săptămânii: (Aș|N-aș) /, r2.regula); faraAb(r2.regula, "raport", "regula");
});

await test("Acasă: BTC și bursa cu „−”; raportul săptămânii pieței cu acțiunile pe rânduri separate, la persoana I, fără „MIȘCARE”", () => {
  const zile = (n, f) => Array.from({ length: n }, (_, i) => ({ t: T0 - (n - i) * ZI, c: f(i) }));
  const q = zile(40, (i) => 100 * (1 + 0.01 * Math.sin(i))), bI = zile(40, (i) => 60000 * (1 - 0.02 * Math.sin(i)));
  assert.doesNotMatch(AC.corelatie(bI, q).text, /\(-\d/, AC.corelatie(bI, q).text);
  const vr = AC.vreme({ clasament: { evita: 60, candidati: 40, dir: { long: 70, short: 20, neutru: 10 } }, btc: { miscare: false }, fg: 78 });
  const r = AC.raportSaptamana({ btc7: -4.2, qqq5: -1.8, vix: 22.4, vreme: vr, vremeBursa: AC.vremeBursa({ qqq: Array.from({ length: 260 }, (_, i) => ({ c: 200 - i * 0.3 })), vix: 22, ndx: { e50: 30, n: 100 } }),
    calendar: [{ mare: true, cand: "mar 15:30", titlu: "CPI m/m" }] });
  const l = r.mesaj.split("\n"), fac = l.filter((x) => /^👉 /.test(x));
  assert.ok(fac.length >= 2, "acțiunile tot lipite: " + fac.join(" | ")); assert.doesNotMatch(r.mesaj, /MIȘCARE|BURSA SCADE/);
  for (const x of fac) { assert.ok(x.length <= 160, x); assert.match(x.replace(/^👉\s*([^:]{1,20}:\s*)?/, ""), PERS, x); }
  assert.match(AC.raportSaptamana({}).mesaj, /👉 Aș aștepta datele de luni dimineață/);
});

await test("fișa: procentele cu „−” (GridCalcul.procent), gridul îngust fără „rămâi” și fără „ %” cu spațiu", () => {
  assert.equal(G.procent(-0.012), "−1,20%", G.procent(-0.012));
  for (const t of [{ nIndep: 30, lichidari: 0, mediana: -0.002 }, { nIndep: 30, lichidari: 0, mediana: 0.002, medie: -0.012 }]) { const m = GP.verdictIngust(t, 12); assert.doesNotMatch(m, /rămâi| %/, m); }
  const ri = GP.rezumatIngust({ propus: true, dir: "long", ore: 12, latime: 0.024, setare: { grile: 9 }, test: { perechiZi: 18.4, mediana: 0.0042, medie: 0.0051, pePlus: 0.64, celMaiRau: -0.021, nIndep: 31 } });
  assert.doesNotMatch(ri, / %/, ri); assert.match(ri, /31 de ferestre/, ri);
  assert.doesNotMatch(GP.ingust([], { miscare: true, dir: "long" }).motiv, /nu porni/, "imperativ");
});

await test("poarta fișei: acțiunea din Obiceiuri.facPoarta (funcție pură), la persoana I, ≤ 110; constatarea pe rândul de sub ea", () => {
  assert.equal(typeof OB.facPoarta, "function", "Obiceiuri.facPoarta lipsește");
  for (const rez of [{ trecut: true, reguli: [] }, { trecut: false, reguli: [{ cod: "moneda", ok: false }] }, { trecut: false, reguli: [{ cod: "verde", ok: false }, { cod: "plan", ok: false }] }]) {
    const x = OB.facPoarta(rez); faraAb(x.fac, "faCe", JSON.stringify(rez.reguli)); if (x.nota) faraAb(x.nota, "deCe", "nota");
  }
  assert.match(app(), /Obiceiuri\.facPoarta\(/, "fișa nu cheamă Obiceiuri.facPoarta");
});

await test("textele fișei și ale jurnalului din app.js: fără „· LICHIDAT”, sume cu virgulă, „Ce aș face eu” cu majusculă la persoana I", () => {
  const s = app();
  assert.doesNotMatch(s, /· LICHIDAT/, "„· LICHIDAT” cu majuscule");
  assert.doesNotMatch(s, /Math\.abs\(r\.usdt\)\.toFixed\(2\)\+" USDT/, "rândul pe hârtie cu punct zecimal");
  assert.doesNotMatch(s, /e\.rezultat\.toFixed\(2\)\+" USDT/, "calibrarea cu punct zecimal");
  assert.doesNotMatch(s, /Ce aș face eu:<\/b> (aș|toate|fișa|n-aș)/, "o acțiune cu literă mică după etichetă");
  assert.doesNotMatch(s, /st\.perOrdin\.toFixed\(2\)\+" USDT"/, "„Pe fiecare ordin” cu punct zecimal");
});

// ce s-a văzut pe poza fișei LIT și a Acasei (1920, 02.10) după prima trecere - textele fișei din app.js, gridul îngust, poarta, Acasă
await test("fișa pe poză: gridul îngust la persoana I fără „rămâi” dublat, „%” lipit, „de” de la 20, minimul Pionex cu virgulă, „Când îl închizi”", () => {
  const s = app();
  assert.ok(s.includes("/rămâ/i.test(r.motiv"), "motivul „gridul lat rămâne mai bun” primește încă o dată „rămâi la setări”");
  assert.doesNotMatch(s, /Rămâi la setările|Închide-l după|oprește-l/, "imperativ în sfat (persoana I: „Aș rămâne”, „L-aș închide”, „aș închide botul”)");
  assert.match(s, / Aș rămâne la setările de mai sus\./); assert.match(s, /L-aș închide după /); assert.match(s, /<h4>Când îl închizi<\/h4>/); assert.match(s, /aș închide botul: după mișcare/);
  assert.doesNotMatch(s, /Grid des \(0,3 %\)|0,30 %|\.replace\("\.",","\)\+" %"|\+' % pe plus/, "„ %” cu spațiu în fișă");
  assert.doesNotMatch(s, /"PROPUS \(setările/, "„PROPUS” cu majuscule (pereche cu „nepropus”)");
  assert.doesNotMatch(s, /" sau "\+i\.minSizeLimit\+" "|" \(minim Pionex "\+i\.minNotional\+" USDT"/, "minimul Pionex cu punct zecimal („0.1 LIGHTER”)");
  assert.doesNotMatch(s, /Proba pe ultimele '\+Math\.floor\(pr\.zile\)\+' zile|'Pe test \('\+r\.test\.nIndep\+' ferestre/, "„31 zile” / „31 ferestre” fără „de”");
  const i = s.indexOf("function grLinisteTine("), corp = s.slice(i, s.indexOf("\nfunction ", i + 10));
  const ctx = { GridCalcul: G, TextRo: globalThis.TextRo }; vm.createContext(ctx); vm.runInContext(corp + ";this.f=grLinisteTine;", ctx);
  const l1 = ctx.f({ liniste: { linisteAcum: true, suficient: true, zileLiniste: 1.6, n: 25, k: 16, H: 2, p: 0.64, ic: [0.43, 0.8] } });
  assert.match(l1, /<b>25<\/b> de perioade/, l1); assert.doesNotMatch(l1, /nu o promisiune/, "avertizarea comună stă în nota panoului");
  const l2 = ctx.f({ liniste: { linisteAcum: true, suficient: false, zileLiniste: 4.2, n: 1 } });
  assert.match(l2, /doar 1 perioadă a ajuns/, l2);
});

await test("poarta fișei pe ecran: costul regulii înaintea punctului (nu „…%). (pe boții…)”), frâna pe istorie cu anul în frază", () => {
  const s = app(), i = s.indexOf("function grPoartaHtml("), corp = s.slice(i, s.indexOf("\nfunction ", i + 10));
  const fi = OB.franaIstoric(Array.from({ length: 40 }, (_, k) => tr("M" + (k % 6), k % 3 ? -6 : 4, { inchis: T0 - (40 - k) * 6 * ORA, pornit: T0 - (40 - k) * 6 * ORA - 3 * ORA })), null);
  assert.match(fi.text, /^Pe istoria ta, frâna/, "producătorul real s-a schimbat: " + fi.text);
  const rez = OB.poarta({ acum: T0, fisa: { simbol: "LIT_USDT_PERP", dir: "long", verdict: { nivel: "asteapta", motive: ["pe ultimele zile, nevăzute la alegere, a ieșit pe minus (−0,58%)"] }, setare: { levierSigur: 4 }, directie: { dir: "long", tarie: "mediu" } }, levier: 4, dir: "long", plan: { minus: 10 }, trades: [] });
  const rv = rez.reguli.find((x) => x.cod === "verde"); assert.ok(rv && !rv.ok && /\.$/.test(rv.text), "regula fișei: " + JSON.stringify(rv));
  rv.cost = "pe boții tăi închiși: doar pe 🟢 ar fi fost −0,99 în loc de −21,45 USDT";
  const ctx = { grReteaPoartaHtml: () => "", grPoartaGridForm: () => "", grPragVal: () => "", Obiceiuri: OB, $: () => null, grPlanDinScan: () => null, escapeHtml: (x) => String(x), grFrana: { praguri: { zi: 20, sapt: 60, rand: 3 }, istoric: fi }, grPoartaRez: { simbol: "LIT_USDT_PERP", rez } };
  vm.createContext(ctx); vm.runInContext(corp + ";this.f=grPoartaHtml;", ctx);
  const h = ctx.f({ simbol: "LIT_USDT_PERP" });
  assert.doesNotMatch(h, /\.\s*<span class="tbSub">\(/, "costul după punct: „…%). (pe boții…)”");
  assert.match(h, /\(−0,58%\) <span class="tbSub">\(pe boții tăi închiși: [^<]*\)<\/span>\./, h.slice(h.indexOf("Fișa zice"), h.indexOf("Fișa zice") + 300));
  const an = new Date().getUTCFullYear();
  assert.match(h, new RegExp("Pe istoria ta din " + an + ", frâna"), "anul în frază"); assert.doesNotMatch(h, /\. \(în \d{4}\)/, "„… (o ipoteză pe trecut). (în 2026)”");
});

await test("obiceiurile: „acum 61 de ore” la reintrare („de” de la 20 în sus), „acum 3 ore” sub 20", () => {
  const f = { simbol: "LIT_USDT_PERP", dir: "long", verdict: { nivel: "porneste", motive: [] }, setare: { levierSigur: 4 }, directie: { dir: "long", tarie: "mediu" } };
  const re = (ore) => OB.poarta({ acum: T0, fisa: f, levier: 3, dir: "long", plan: { plus: 5, minus: 10 }, trades: [tr("LIT", 2, { inchis: T0 - ore * ORA })] }).reguli.find((x) => x.cod === "reintrare");
  assert.match(re(61).text, /acum 61 de ore\./, re(61).text); assert.match(re(3).text, /acum 3 ore\./, re(3).text);
});

await test("gridul îngust urmărit înainte: „60% pe plus, medie +2,0%” (fără spațiu), „puține cazuri” în loc de „zgomot”", () => {
  const t = GP.socotealaUrmarire(Array.from({ length: 10 }, (_, i) => ({ propus: false, r: { net: i < 6 ? 0.05 : -0.025 } }))).text;
  assert.doesNotMatch(t, / %|zgomot/, t); assert.match(t, /\(60% pe plus, medie \+2,0%\)/, t); assert.match(t, /puține cazuri/, t);
});

await test("Acasă pe poză: „din 99 de acțiuni”, cardul „Boții tăi” cu virgulă, „corelația pe ultimele 30 de zile de bursă”", () => {
  const vb = AC.vremeBursa({ qqq: Array.from({ length: 260 }, (_, i) => ({ c: 100 + i * 0.3 })), vix: 16.1, ndx: { e50: 45, n: 99 } });
  assert.equal(vb.nivel, "ingusta", vb.nivel); assert.match(vb.text, /45 din 99 de acțiuni/, vb.text);
  const e = fs.readFileSync(path.join(RAD, "public", "lib", "acasa-ecran.js"), "utf8");
  assert.doesNotMatch(e, /Math\.abs\(tot\)\.toFixed\(2\) \+ " USDT"|Math\.abs\(zt\.boti\)\.toFixed\(2\) \+ ' USDT/, "„−1.43 USDT” cu punct zecimal");
  assert.doesNotMatch(e, /corelația pe ultimele ' \+ co\.n \+ ' zile/, "„30 zile” fără „de”");
});

await test("garda „acasa”: STRICT și fără abateri (producătorii reali, trade-urile JurnalTrade.din din boții lui)", () => {
  assert.ok(STRICT.has("acasa"), "„acasa” nu e în STRICT");
  const rele = situatii().filter((x) => x.mod === "acasa").map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((r) => r.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 8).map((r) => r.x.sit + " · " + r.x.sursa + ": " + r.ab.join("; ") + " — " + r.x.text.slice(0, 110)).join("\n"));
});

console.log("\n" + (pica ? "V100.72 PICA · " + pica + " din " + (ok + pica) : "V100.72 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
