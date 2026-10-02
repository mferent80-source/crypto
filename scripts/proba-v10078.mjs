// Proba v100.78 - „plus ideile” (el, 02.10): (1) raportul de duminică SALVAT (27.09, forma veche „−36.16 USDT”) se afișează cu cifrele
// în forma nouă (TextRo.cifreNoi - doar cifrele, cuvintele raportului vechi rămân); (2) numărătorile din jurnalul colectorului trec prin
// cate („1 bot”, „25 de boți”) - garda pe sursă le vede și în jurnal; (3) TextRo.rupe - ruperea rândurilor lungi într-un singur loc,
// folosită de autopsii și de raportul de duminică (orice rând ≤ 160, nimic tăiat).
//   node scripts/proba-v10078.mjs
import "./lib/text-ro-global.mjs";   // RF4 (v100.61): TextRo inaintea modulelor
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import "./garda-texte.mjs";   // incarca modulele (Obiceiuri, Consiliu, JurnalTrade…)

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { Obiceiuri: OB, Consiliu: CS, TextRo: TR } = globalThis;
const citeste = (f) => fs.readFileSync(path.join(RAD, f), "utf8");
let ok = 0, pica = 0;
async function test(nume, fn) { try { await fn(); ok++; console.log("  ✓ " + nume); } catch (e) { pica++; console.log("  ✗ " + nume + "\n      " + String(e && e.message || e).split("\n").join("\n      ")); } }
const T0 = Date.UTC(2026, 9, 4, 18, 0), ZI = 86400000, ORA = 3600000;

console.log("Proba v100.78 · ideile: raportul salvat în forma nouă, jurnalul colectorului, TextRo.rupe");

// raportul de duminică salvat pe server pe 27.09 (forma de dinainte de v100.61), rând cu rând
const SALVAT = [
  "Săptămâna: 10 boți închiși, total −18.39 USDT, 5 pe plus (50%).",
  "Din grile +31.46 USDT, din poziție −41.68 USDT, comisioane și funding −8.17 USDT.",
  "Greșeala cea mai scumpă: „Poziția a mâncat grilele” — 4 boți, −36.16 USDT.",
  "Semnalele: costuri 1/1 au avut dreptate.",
  "Laboratorul: nimic dovedit încă.",
  "Regula săptămânii — „Poziția a mâncat grilele”: Aș verifica trendul pe 4h și 1z înainte (în fișă) și n-aș porni long contra lui; sau aș porni neutru.",
  "Acțiuni (Trading 212): 7 trade-uri, 7 pe plus, rezultat real +1.052 lei (comisioane de conversie 100 lei)."];

await test("(1) raportul salvat pe 27.09: sumele cu virgulă și „−” tipografic, cuvintele neatinse; leii („+1.052 lei” = mii) și textul deja nou neschimbate", () => {
  assert.equal(typeof TR.cifreNoi, "function", "TextRo.cifreNoi lipsește");
  assert.deepEqual(SALVAT.map(TR.cifreNoi), [
    "Săptămâna: 10 boți închiși, total −18,39 USDT, 5 pe plus (50%).",
    "Din grile +31,46 USDT, din poziție −41,68 USDT, comisioane și funding −8,17 USDT.",
    "Greșeala cea mai scumpă: „Poziția a mâncat grilele” — 4 boți, −36,16 USDT.",
    SALVAT[3], SALVAT[4], SALVAT[5], SALVAT[6]]);
  assert.deepEqual(["pierdere -8.17 USDT", "(33.3%)", "-0.5%", "1234.56 USDT", "preț 0.3456", "trade-uri 7"].map(TR.cifreNoi),
    ["pierdere −8,17 USDT", "(33,3%)", "−0,5%", "1234,56 USDT", "preț 0.3456", "trade-uri 7"]);
  // un raport nou (v100.61+) iese neschimbat
  const tr = (i) => ({ id: "n" + i, moneda: "CRV", rezultat: i % 2 ? -3.456 : 2.1, net: i % 2 ? -3.9 : 1.8, inchis: T0 - (i + 1) * ORA, pornit: T0 - (i + 5) * ORA, durataOre: 4, comisioane: -0.3, funding: -0.1, dir: "long", greseli: [] });
  const nou = OB.raportDuminica({ trades: Array.from({ length: 25 }, (_, i) => tr(i)), acum: T0 }).linii;
  assert.deepEqual(nou.map(TR.cifreNoi), nou);
  assert.match(citeste("public/app.js"), /R\.linii\.map\(function\(x\)\{return '<li>'\+escapeHtml\(TextRo\.cifreNoi\(x\)\)\+'<\/li>'\}\)/, "jurnalul nu trece raportul salvat prin TextRo.cifreNoi");
});

// (2) jurnalul colectorului: forma „n + " boți"” și forma cu virgulă „jurnal(…, n, "monede")”, pe substantivele numărate
// (și pe cele scrise fără diacritice în jurnal: boti, actiuni, pozitii…) + cele ale jurnalului (pagini, simboluri, instrumente, note…)
// revizia v100.78 (minora 4): + „judecate” („25 de judecate”, nu „25 judecate”)
const NUME_JURNAL = "boți|boti|cazuri|monede|zile|ore|alerte|porniri|trade-uri|ferestre|acțiuni|actiuni|poziții|pozitii|situații|minute|decizii|semnale|tickere|rânduri|grile|linii|perechi|umpleri|bare|niveluri|intrări|intrari|ordine|pagini|simboluri|instrumente|note|motive|sfaturi|candidați|candidati|judecăți|judecati|judecate|estimări|estimari";
function numaratoriInJurnal(src) {
  const out = [];
  src.split("\n").forEach((l, i) => {
    if (!/\bjurnal\(/.test(l)) return;
    const lipit = new RegExp("\\+\\s*([\"'])\\s(" + NUME_JURNAL + ")(?![\\p{L}\\-])", "u"), virgula = new RegExp(",\\s*[\\w$.\\[\\]()]+\\s*,\\s*([\"'])\\s?(" + NUME_JURNAL + ")(?![\\p{L}\\-])", "u");
    for (const re of [lipit, virgula]) { const m = l.match(re); if (m) out.push((i + 1) + ": " + l.slice(Math.max(0, m.index - 40), m.index + m[0].length).trim()); }
  });
  return out;
}
await test("(2) jurnalul colectorului: nicio numărătoare lipită de substantiv („1 boți”) - nici „+ \" boți\"”, nici „…, n, \"monede\"” (colector + modulele tura-*)", () => {
  const fis = ["scripts/colector.mjs"].concat(fs.readdirSync(path.join(RAD, "scripts", "lib")).filter((x) => x.endsWith(".mjs") && !/^garda-/.test(x)).map((x) => "scripts/lib/" + x));
  const rele = []; for (const f of fis) for (const l of numaratoriInJurnal(citeste(f))) rele.push(f + ":" + l);
  assert.equal(rele.length, 0, rele.length + " locuri:\n" + rele.join("\n"));
});
await test("(2) garda pe sursă (proba v100.75) nu mai ocolește liniile de jurnal", () => {
  const s = citeste("scripts/proba-v10075.mjs");
  assert.ok(!/\\bjurnal\\\(/.test(s), "proba-v10075 încă sare peste liniile cu jurnal(");
});

// (3) TextRo.rupe - un singur loc
await test("(3) TextRo.rupe: la granița de sens („; ”, „: ”, înainte de „ — ”), altfel pe cuvinte; rândurile deja rupte se iau pe rând; nimic tăiat", () => {
  assert.equal(typeof TR.rupe, "function", "TextRo.rupe lipsește");
  const a = "Regulă propusă (ipoteză, n-am schimbat nimic): „mișcare cu botul” în starea „lateral după o mișcare mare” a greșit 7 din 10 zile; urmat, te-ar fi costat 12,34 USDT, iar eu l-aș trata ca „încă nu știm”.";
  const ra = TR.rupe(a, 160), la = ra.split("\n");
  assert.ok(la.length === 2 && la.every((x) => x.length <= 160), JSON.stringify(la));
  assert.match(la[0], /zile;$/, "trebuia rupt după „; ”: " + la[0]);
  const fara = Array.from({ length: 40 }, (_, i) => "cuvânt" + i).join(" "), rf = TR.rupe(fara, 100).split("\n");
  assert.ok(rf.length > 1 && rf.every((x) => x.length <= 100 && !/^\s|\s$/.test(x)), JSON.stringify(rf));
  const doua = "scurt\n" + a, rd = TR.rupe(doua, 160).split("\n");
  assert.equal(rd[0], "scurt"); assert.ok(rd.length === 3 && rd.every((x) => x.length <= 160), JSON.stringify(rd));
  for (const [t, m] of [[a, 160], [fara, 100], [doua, 160], ["scurt", 160]]) assert.equal(TR.rupe(t, m).replace(/\s+/g, " "), t.replace(/\s+/g, " "), "s-a pierdut ceva");
  assert.equal(TR.rupe(a), ra, "fără max trebuia 160");
});
await test("(3) un singur loc: nici consiliu.js, nici obiceiuri.js nu mai au ruperea lor (rupe160 / rupe pe cuvinte) - o cer de la TextRo.rupe", () => {
  const cs = citeste("public/lib/consiliu.js"), ob = citeste("public/lib/obiceiuri.js");
  assert.ok(!/function rupe160\(t\) \{\s*t = String\(t\); if \(t\.length/.test(cs), "consiliu.js are încă rupe160 al lui");
  assert.ok(!/function rupe\(t, max\) \{ var out = \[\]/.test(ob), "obiceiuri.js are încă ruperea pe cuvinte a lui");
  assert.match(cs, /TextRo\.rupe\(/); assert.match(ob, /TextRo\.rupe\(/);
});
await test("(3) raportul de duminică: orice rând ≤ 160 și când laboratorul dovedește trei întrebări lungi (înainte ieșea un rând de peste 200)", () => {
  const tr = (i) => ({ id: "r" + i, moneda: "LIGHTER", rezultat: -2.5, net: -2.9, inchis: T0 - (i + 1) * ORA, pornit: T0 - (i + 9) * ORA, durataOre: 8, comisioane: -0.3, funding: -0.1, dir: "long", greseli: [] });
  const lab = { intrebari: [
    { verdict: "dovedit", titlu: "Pornirile contra trendului pe 4h pierd mai des decât cele cu trendul, pe toate monedele din clasament" },
    { verdict: "dovedit", titlu: "Gridul îngust (sub 3%) încheie mai multe perechi pe zi decât cel lat, în piață laterală" },
    { verdict: "dovedit", titlu: "Levierul peste 5× duce la lichidare în mai puțin de 48 de ore când volatilitatea e în top" }] };
  const r = OB.raportDuminica({ trades: Array.from({ length: 6 }, (_, i) => tr(i)), acum: T0, laborator: lab });
  const lung = r.linii.join("\n").split("\n").filter((l) => l.length > 160);
  assert.equal(lung.length, 0, lung.map((l) => l.length + ": " + l).join("\n"));
  const tot = r.linii.join(" ").replace(/\s+/g, " ");
  for (const q of lab.intrebari) assert.ok(tot.includes(q.titlu), "lipsește: " + q.titlu);
});

// revizia v100.78 (importantă, veche): serverul păstra doar primele 16 rânduri, tăiate la 400 de caractere - colectorul trimite până la
// 19 (raportul de duminică 12 + T212 2 + autopsia acțiunilor 5), iar un rând rupt de TextRo.rupe poate avea 3 rânduri (~480 de caractere)
function kvFals() { const m = new Map(); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; }
const TOKEN = "token-de-proba-v10078";
async function cheama(metoda, qs, env, corp) {
  const m = await import("../functions/api/istoric-bot.js?t=" + Date.now() + "_" + Math.random());
  const h = { "cf-connecting-ip": "10.0.0.78", authorization: "Bearer " + TOKEN };
  if (corp) { h["content-type"] = "application/json"; h.origin = "https://exemplu.test"; }
  const req = new Request("https://exemplu.test/api/istoric-bot?" + qs, { method: metoda, headers: h, body: corp ? JSON.stringify(corp) : undefined });
  const res = await m[metoda === "GET" ? "onRequestGet" : "onRequestPost"]({ request: req, env });
  return { status: res.status, d: await res.json() };
}
await test("(revizie) serverul păstrează raportul întreg: 19 rânduri de câte ~450 de caractere (3 rânduri rupte) - nimic pierdut în Jurnal", async () => {
  const env = { APP_API_TOKEN: TOKEN, ISTORIC: kvFals() };
  const rand = (i) => TR.rupe(("Rândul " + (i + 1) + ": " + "cuvânt lung de raport ".repeat(20)).trim(), 160);
  const linii = Array.from({ length: 19 }, (_, i) => rand(i));
  assert.ok(linii.every((l) => l.length > 400 && l.split("\n").length === 3), "fixtura: " + linii[0].length);
  const p = await cheama("POST", "action=raport", env, { la: T0, linii, saptamana: "2026-10-04" });
  assert.equal(p.status, 200, JSON.stringify(p.d));
  const r = (await cheama("GET", "action=raport", env)).d.raport;
  assert.equal(r.linii.length, 19, "păstrate: " + r.linii.length + " din 19");
  assert.deepEqual(r.linii, linii, "un rând a fost tăiat");
});

console.log("\n" + (pica ? "V100.78 PICA · " + pica + " din " + (ok + pica) : "V100.78 PASS · " + ok + "/" + ok));
if (pica) process.exitCode = 1;
