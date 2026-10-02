// Proba v100.71 - reparatiile din revizia Opus a pachetului 4 (actiunile T212): „1 caz” / „1 trade” (nu „1 cazuri”), actiunea proprie
// la 2 trade-uri, avertizarea comuna pe panourile fara legenda, explicatia stopului care urca ≤ 160 pe date reale, textele paginii T212
// (poarta, stopul, jurnalul) in functii pure pe care garda le genereaza si le masoara.
//   node scripts/proba-v10071.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea semnale-bot.js / consiliu.js
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { situatii, verifica, STRICT } from "./garda-texte.mjs";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!globalThis.ProfilMoneda) vm.runInThisContext(fs.readFileSync(path.join(RAD, "public", "lib", "profil-moneda.js"), "utf8"), { filename: "profil-moneda.js" });
const { ActiuniSemnale: AS, Consilier: CS, Probabilitati: PB, Consiliu: CO, ProfilMoneda: PM, TextRo: TR } = globalThis;
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 1, 16, 0), ZI = 86400000;
const PERS = /^(Aș|N-aș|L-aș|Le-aș|O-aș|M-aș|Nu m-aș)\s/;
const faraAb = (t, tip, cine) => { const ab = verifica(t, tip); assert.deepEqual(ab, [], (cine || "") + ": " + ab.join("; ") + " — " + t); };
const t212 = () => fs.readFileSync(path.join(RAD, "public", "lib", "t212-ecran.js"), "utf8");
// corpul unei functii din sursa (pana la urmatoarea „function ” de la inceput de rand) - verificarile nu se uita in functia vecina
const corp = (s, nume) => { const i = s.indexOf("function " + nume + "("); if (i < 0) return ""; const j = s.indexOf("\nfunction ", i + 10); return s.slice(i, j < 0 ? undefined : j); };
const zilnice = (n, fn) => Array.from({ length: n }, (_, i) => { const c = fn(i); return { t: T0 - (n - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }; });
const URCA = zilnice(300, (i) => 20 * Math.pow(1.002, i) * (1 + 0.004 * Math.sin(i)));

console.log("Proba v100.71 · reparațiile reviziei pachetului 4 (acțiunile T212)");

await test("I1a. TextRo.cate: „1 caz”, „4 cazuri”, „45 de cazuri”, „100 de cazuri”, „101 cazuri”", () => {
  assert.equal(typeof TR.cate, "function", "TextRo.cate lipsește");
  assert.equal(TR.cate(1, "caz", "cazuri"), "1 caz"); assert.equal(TR.cate(4, "caz", "cazuri"), "4 cazuri"); assert.equal(TR.cate(45, "caz", "cazuri"), "45 de cazuri");
  assert.equal(TR.cate(100, "caz", "cazuri"), "100 de cazuri"); assert.equal(TR.cate(101, "caz", "cazuri"), "101 cazuri"); assert.equal(TR.cate(0, "caz", "cazuri"), "0 cazuri");
});

await test("I1b. nicăieri „1 cazuri” / „1 trade-uri”: 🎲 (cumpărările tale, calibrarea), consilierul, raportul săptămânii", () => {
  const x = (o) => Object.assign({ p: 0.31, k: 31, n: 100, nIndep: 24, ic: [0.22, 0.41], nivel: "exact", stare: "sus-liniste", conditionat: true }, o || {});
  const ra = PB.randActiune({ stop1: x(), sare1: x({ p: 0.03, k: 3 }), cursa5: { tinta: x({ p: 0.44, k: 44 }), stop: { p: 0.21 } }, niv: {} }, { rezumat: { n: 1, pMed: 0.4, rata: 0, saptamani: 1 } }, {});
  const tot = ra.map((r) => r.text).join(" | ") + " | " + PB.corecteaza(0.31, "iese-jos-24", { "iese-jos-24": { cutii: [{ n: 0, k: 0 }, { n: 1, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }, { n: 0, k: 0 }] } }).text;
  assert.doesNotMatch(tot, /\b1 cazuri\b/, tot); assert.match(tot, /\b1 caz\b/, tot);
  const tr = (i, o) => Object.assign({ id: "t" + i, ticker: "APLD_US_EQ", simbol: "APLD", cost: 1000, rezultat: -40, durataOre: 200, pornit: T0 - 90 * ZI, inchis: T0 - 80 * ZI }, o || {});
  const pz = { ticker: "APLD_US_EQ", simbol: "APLD", pret: 27, pretMediu: 29.5, pctLei: -0.09, ppl: -300, de: T0 - 2 * ZI, niv: { tintaPozitie: 33 } };
  const s1 = CS.sfaturiPozitie(pz, { inchise: [tr(1)], acum: T0 }).find((s) => s.sursa === "istoric");
  assert.match(s1.titlu, /\b1 trade\b/, s1.titlu); assert.doesNotMatch(s1.titlu, /1 trade-uri/);
  const r1 = AS.raportSaptamana([tr(1, { inchis: T0 - 2 * ZI, rezultat: -120, pct: -0.05, comisioane: 3 })], T0);
  assert.doesNotMatch(r1.join(" | "), /\b1 trade-uri\b/, r1.join(" | "));
});

await test("I1c. 2 trade-uri pe minus pe aceeași acțiune: sfatul are acțiunea lui, iar Consilierul n-o repetă din titlu", () => {
  const tr = (i) => ({ id: "t" + i, ticker: "APLD_US_EQ", simbol: "APLD", cost: 1000, rezultat: -40, durataOre: 200, pornit: T0 - 90 * ZI, inchis: T0 - 80 * ZI });
  const pz = { ticker: "APLD_US_EQ", simbol: "APLD", pret: 29, pretMediu: 29.5, pctLei: -0.01, ppl: -20, de: T0 - 2 * ZI, niv: { tintaPozitie: 33 } };
  const sf = CS.sfaturiPozitie(pz, { inchise: [tr(1), tr(2)], acum: T0 }), s2 = sf.find((s) => s.sursa === "istoric");
  assert.equal(s2.nivel, "g"); assert.ok(s2.ceAsFace && PERS.test(s2.ceAsFace), "fără acțiune proprie: " + JSON.stringify(s2));
  const c = CO.alcatuiesteActiune({ sem: AS.semafor({ simbol: "APLD", pret: 29, pretMediu: 29.5, plan: {} }, AS.stare(URCA, 29)), niv: null, prob: [], sfaturi: sf, plan: null, pret: 29, pretMediu: 29.5, qty: 10, simbol: "APLD" });
  assert.equal(c.nivel, "atentie", "fixtura: " + c.nivel); assert.ok(!c.faCe.includes(s2.titlu.slice(0, 20)), "acțiunea repetă titlul: " + c.faCe); assert.match(c.faCe, PERS);
});

await test("I2. avertizarea comună rămâne undeva pe ecran: legenda sub poarta T212, sub ideile T212, în biletul botului; nota 🎲 a fișei și a Tabloului o spune", () => {
  const s = t212();
  assert.match(corp(s, "t212RenderPoarta"), /LEGENDA_(ACTIUNI|COMUNA)/, "poarta T212 fără legendă");
  assert.match(corp(s, "t212IdeiRender"), /LEGENDA_(ACTIUNI|COMUNA)/, "ideile T212 fără legendă");
  assert.match(corp(s, "grBiletTu"), /LEGENDA_COMUNA/, "biletul botului fără legendă");
  assert.equal(typeof CO.LEGENDA_COMUNA, "string"); assert.match(CO.LEGENDA_COMUNA, /un semn, nu o regulă/);
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.ok((app.match(/tbProbNota">[^<]*un semn, nu o regulă/g) || []).length >= 2, "notele 🎲 (fișa + Tabloul) nu spun „un semn, nu o regulă”");
});

await test("I3. Consilierul poziției: explicația stopului care urcă ≤ 160 și o frază cu sursa REALĂ a profilului (ProfilMoneda.sursa)", () => {
  const ps = { dist: 0.118, sursa: PM.sursa({ piata: "actiuni", simbol: "NVDA_US_EQ", zile: 502 }) };
  assert.match(ps.sursa, /502 zile de bursă \(bare zilnice\)/, "sursa reală: " + ps.sursa);
  const tp = AS.trailPozitie({ cheie: "prof", motiv: "pe 40 de trade-uri ale tale unde ar fi schimbat ceva, stopul din profilul acțiunii a ieșit +3.200 lei față de −15% de la maxim" }, ps);
  const niv = { nivel: "ok", stopAtins: true, stopPozitie: 30.12, trailPct: 11.8, sursaTrail: tp.sursaTrail, trailProfil: ps.dist };
  const c = CO.alcatuiesteActiune({ sem: AS.semafor({ simbol: "NVDA", pret: 29, pretMediu: 22, plan: {} }, AS.stare(URCA, 29)), niv, prob: [], sfaturi: [], plan: null, pret: 29, pretMediu: 22, qty: 10, simbol: "NVDA" });
  const m = c.motive.find((x) => x.cod === "stop-urcator"); assert.ok(m, "motivul stopului care urcă lipsește: " + JSON.stringify(c.motive));
  faraAb(m.text, "deCe", "explicația stopului"); assert.match(m.text, /11,8%/);
});

await test("I4a. acțiunile paginii T212 vin din funcții pure (ActiuniSemnale): poarta, stopul, jurnalul - toate la persoana I, ≤ 110, și cu numele lungi de stop", () => {
  for (const f of ["facPoarta", "facStop", "sfatStop", "facPoartaIstoric", "facReguli"]) assert.equal(typeof AS[f], "function", "ActiuniSemnale." + f + " lipsește");
  for (const n of ["cumpara", "nu", "asteapta", "fara-date"]) faraAb(AS.facPoarta(n, 21000), "faCe", "poarta " + n);
  const lung = { et: "urcă după maxim — planul Radarului (k×ATR, 3–15%)", dif: 1001.4, taiate: 46 };
  for (const [cine, r] of [["stopul ajută", AS.facStop(false, lung)], ["niciun stop", AS.facStop(true, lung)], ["sfatul stopului", AS.sfatStop(true, lung)], ["fără stop judecat", AS.sfatStop(false, null)], ["un singur trade tăiat", AS.facStop(false, Object.assign({}, lung, { taiate: 1 }))]]) {
    faraAb(r.fac, "faCe", cine); if (r.nota) assert.doesNotMatch(r.nota, /\b1 trade-uri\b/, r.nota);
  }
  for (const b of [true, false]) faraAb(AS.facPoartaIstoric(b, 1234), "faCe", "poarta în trecut " + b);
  faraAb(AS.facReguli("cumpărate în prima oră și jumătate după deschidere"), "faCe", "regulile tale");
  const s = t212();
  assert.doesNotMatch(s, /Ce aș face eu:<\/b> ' \+ \(/, "o acțiune tot scrisă în ecran (ternar după etichetă)");
  for (const f of ["facPoarta", "facStop", "sfatStop", "facPoartaIstoric", "facReguli"]) assert.match(s, new RegExp("ActiuniSemnale\\." + f + "\\("), "ecranul nu cheamă " + f);
});

await test("I4b. garda acțiunilor: fixturile ajung pe ramura pe care o numesc și sunt STRICT fără abateri", () => {
  const l = situatii().filter((x) => x.mod === "actiuni");
  const mis = l.filter((x) => x.sit === "semafor: mișcare mare în jos" && x.sursa === "semafor.ceAsFace.t");
  assert.ok(mis.length && /până nu se liniștește/.test(mis[0].text), "„mișcare mare în jos” nu e pe ramura ei: " + (mis[0] && mis[0].text));
  const put = l.find((x) => x.sit === "situații ca asta: puține"); assert.ok(put && /puține cazuri/.test(put.text), "„puține” fără marcaj: " + (put && put.text));
  assert.ok(l.some((x) => /^poarta T212/.test(x.sit)), "garda nu generează acțiunile porții"); assert.ok(l.some((x) => /jurnal/.test(x.sit)), "garda nu generează acțiunile jurnalului");
  assert.ok(STRICT.has("actiuni"));
  const rele = l.map((x) => ({ x, ab: verifica(x.text, x.tip, x.frate) })).filter((r) => r.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 6).map((r) => r.x.sit + " · " + r.x.sursa + ": " + r.ab.join("; ") + " — " + r.x.text.slice(0, 120)).join("\n"));
  assert.ok(verifica("Pe APLD: 1 trade-uri, 0 pe plus", "titlu").length > 0, "garda nu prinde „1 trade-uri”");
});

console.log("\n" + (pica ? "V100.71 PICA · " + pica + " din " + (ok + pica) : "V100.71 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
