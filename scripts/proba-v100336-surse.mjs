// Proba v100.336 · I-862 „De unde știu” (vârsta surselor sub verdict) + I-866 (vocile de sub verdict cu scorul lor).
//   1  vârsta fiecărei surse în cuvinte: acum / acum N min / azi HH:MM / ieri HH:MM / dd.mm HH:MM; pe zile: ședința de azi / închiderea de ieri / din dd.mm
//   2  peste pragul ei sursa e „veche”; cererea picată fără date = „n-a venit”; sursa încă necitită nu apare
//   3  o sursă CRITICĂ veche sau lipsă oprește invitația (crypto „Aș porni…”, bursa „Aș cumpăra…”) și spune ce lipsește; o sursă necritică doar se arată
//   4  fraza care nu invită rămâne neatinsă; textul rămâne sub 110 caractere
//   5  rândul HTML: sursele în ordine, semnul ⚠ pe cele vechi, textul scăpat
//   6  Piața azi: sursele cardului Crypto și ale cardului Nasdaq, din datele paginii (ora făcută de colector / ultima lumânare / ultima ședință)
//   7  legătura: verdictele comune (acVremeCrypto / acVremeBursa) trec prin frâna surselor, cardurile își scriu rândul, Tabloul și T212 la fel
//   8  I-866: Monte Carlo „măsurată” doar peste „mereu pe plus”; sub 10 zile „prea puține”; altfel „nedovedită” cu procentul; Busola „nedovedită”
//   9  I-866: vocea nedovedită nu mai e bifă verde: gri, cu sensul în cuvinte și procentul
//   node scripts/proba-v100336-surse.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const text = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nV100.336 · „De unde știu” și vocile cu scorul lor · proba\n");

const MIN = 60000, ORA = 3600000, ZI = 86400000;
const ctx = vm.createContext({ console, Math, Date, JSON, Intl, isFinite, isNaN, Number, String, Array, Object, RegExp });
vm.runInContext(lib("acasa.js") + "\n;globalThis.Acasa = Acasa;", ctx);
const A = ctx.Acasa;
const ACUM = Date.parse("2026-11-13T12:00:00Z");   // 14:00 la București

await test("1 vârsta în cuvinte", () => {
  assert.equal(typeof A.deUndeStiu, "function", "lipsește Acasa.deUndeStiu");
  const r = A.deUndeStiu([
    { k: "clasament", la: ACUM - 20 * 1000 }, { k: "btc", la: ACUM - 12 * MIN }, { k: "calendar", la: Date.parse("2026-11-13T04:05:00Z") },
    { k: "fg", la: Date.parse("2026-11-12T20:30:00Z") }, { k: "raport", la: Date.parse("2026-11-10T06:00:00Z") },
    { k: "qqq", la: Date.parse("2026-11-12T14:30:00Z") }, { k: "vix", la: Date.parse("2026-11-13T05:00:00Z") }, { k: "curs", la: Date.parse("2026-11-07T14:30:00Z") }
  ], ACUM);
  const t = Object.fromEntries(r.bucati.map((b) => [b.k, b.text]));
  assert.equal(t.clasament, "acum");
  assert.equal(t.btc, "acum 12 min");
  assert.equal(t.calendar, "azi 06:05");
  assert.equal(t.fg, "ieri 22:30");
  assert.equal(t.raport, "10.11 08:00");
  assert.equal(t.qqq, "închiderea din 12.11");
  assert.equal(t.vix, "ședința de azi");
  assert.equal(t.curs, "din 07.11");
});

await test("2 veche peste prag, „n-a venit” la cererea picată, necititul lipsește", () => {
  const r = A.deUndeStiu([
    { k: "clasament", la: ACUM - 101 * MIN }, { k: "btc", la: ACUM - 10 * MIN }, { k: "ndx", la: null, eroare: "HTTP 500" }, { k: "calendar", la: null }
  ], ACUM);
  const b = Object.fromEntries(r.bucati.map((x) => [x.k, x]));
  assert.equal(b.clasament.vechi, true);
  assert.equal(b.btc.vechi, false);
  assert.equal(b.ndx.lipsa, true);
  assert.equal(b.ndx.text, "n-a venit");
  assert.ok(!b.calendar, "sursa necitită nu apare");
  assert.equal(r.bucati.map((x) => x.k).join(","), "clasament,btc,ndx");   /* tablourile din vm au alt prototip */
});

await test("3 sursa critică veche oprește invitația; cea necritică doar se arată", () => {
  assert.equal(typeof A.franaSurse, "function", "lipsește Acasa.franaSurse");
  const vB = { nivel: "lateral", eticheta: "🟡 LATERAL", faCe: "Aș cumpăra doar ce e deja pe trend, cu stop; restul aș aștepta.", titlu: "x" };
  const rQ = A.deUndeStiu([{ k: "qqq", la: ACUM - 6 * ZI }, { k: "calendar", la: ACUM - 2 * ZI }], ACUM);
  const f = A.franaSurse(vB, rQ, "bursa");
  assert.match(f.faCe, /^N-aș cumpăra pe verdictul ăsta: /);
  assert.match(f.faCe, /QQQ/);
  assert.doesNotMatch(f.faCe, /calendarul/, "calendarul nu e critic");
  assert.equal(f.ton, "atentie");
  assert.equal(vB.faCe.startsWith("Aș cumpăra"), true, "verdictul primit nu se modifică pe loc");
  const rN = A.deUndeStiu([{ k: "calendar", la: ACUM - 2 * ZI }], ACUM);
  assert.equal(A.franaSurse(vB, rN, "bursa"), vB, "doar necritice ⇒ neatins");
  const vC = { nivel: "liniste", faCe: "Aș porni boți grid doar unde fișa monedei zice PORNEȘTE, nu pe liniștea pieței singură." };
  const fc = A.franaSurse(vC, A.deUndeStiu([{ k: "clasament", la: null, eroare: "fetch failed" }], ACUM), "crypto");
  assert.match(fc.faCe, /^N-aș porni boți noi pe verdictul ăsta: clasamentul n-a venit\.$/);
});

await test("4 fraza care nu invită rămâne; textul sub 110 caractere", () => {
  const v = { nivel: "scade", faCe: "N-aș cumpăra contra trendului; aș ține doar ce are stopul pus." };
  const r = A.deUndeStiu([{ k: "qqq", la: ACUM - 9 * ZI }, { k: "vix", la: ACUM - 9 * ZI }], ACUM);
  assert.equal(A.franaSurse(v, r, "bursa"), v);
  const f = A.franaSurse({ faCe: "Aș cumpăra ideile pe trend, mereu cu stop: mediul e bun." }, r, "bursa");
  assert.ok(f.faCe.length <= 110, f.faCe.length + ": " + f.faCe);
  assert.match(f.faCe, /QQQ/);
});

await test("5 rândul HTML: ordinea, ⚠ pe cele vechi, text scăpat", () => {
  assert.equal(typeof A.surseHtml, "function", "lipsește Acasa.surseHtml");
  const r = A.deUndeStiu([{ k: "clasament", la: ACUM - 12 * MIN }, { k: "ndx", la: ACUM - 2 * ZI, et: "lățimea <b>" }], ACUM);
  const h = A.surseHtml(r, esc);
  assert.match(h, /class="dusRand"/);
  assert.equal(text(h), "De unde știu: clasamentul acum 12 min · ⚠ lățimea &lt;b&gt; 11.11 14:00 (veche)");
  assert.doesNotMatch(h, /<b>/, "textul e scăpat");
  assert.equal(A.surseHtml(A.deUndeStiu([], ACUM), esc), "");
});

const EC = lib("acasa-ecran.js");
await test("6 Piața azi: sursele celor două carduri, din datele paginii", () => {
  const f = new Function("Acasa", "GridCalcul", fnDin(EC, "acSurseCrypto") + "\n" + fnDin(EC, "acSurseBursa") + "\nreturn { c: acSurseCrypto, b: acSurseBursa };")(A, { bareToate: (rows) => rows.map((x) => ({ t: Number(x.time), c: Number(x.close) })) });
  const d = { clasament: { la: ACUM - 5 * MIN }, clasamentErr: null, btc1h: [{ time: ACUM - 2 * ORA }, { time: ACUM - ORA }], piata: { qqq: [{ time: ACUM - 2 * ZI, close: 1 }, { time: ACUM - ZI, close: 2 }], vix: [{ time: ACUM - ZI, close: 15 }] }, piataLa: ACUM - MIN, calendarLa: ACUM - 2 * ORA, calendar: { l: [] }, ndx: { la: ACUM - 5 * ORA } };
  const c = f.c(d), b = f.b(d);
  assert.deepEqual(c.map((x) => x.k), ["clasament", "btc", "calendar"]);
  assert.equal(c[0].la, ACUM - 5 * MIN);
  assert.equal(c[1].la, ACUM - ORA, "ultima lumânare de o oră");
  assert.deepEqual(b.map((x) => x.k), ["qqq", "vix", "ndx", "calendar"]);
  assert.equal(b[0].la, ACUM - ZI, "ultima ședință QQQ");
  assert.equal(b[2].la, ACUM - 5 * ORA);
  const g = f.c({ clasamentErr: "HTTP 502", calendar: { eroare: "faireconomy" } });
  assert.equal(g[0].eroare, "HTTP 502");
  assert.equal(g.filter((x) => x.k === "calendar")[0].eroare, "faireconomy");
  const gol = f.c({ clasament: null, clasamentLa: ACUM - MIN }), golB = f.b({ ndx: null, ndxLa: ACUM - MIN });
  assert.ok(gol[0].eroare, "clasamentul venit gol = n-a venit");
  assert.ok(golB.filter((x) => x.k === "ndx")[0].eroare, "lățimea venită goală = n-a venit");
});

const AP = lib("asezare-paznic.js");
await test("7 legătura: verdictele comune, cardurile, Tabloul, T212", () => {
  assert.match(fnDin(EC, "acVremeCrypto"), /Acasa\.franaSurse\(/, "acVremeCrypto nu trece prin frâna surselor");
  assert.match(fnDin(EC, "acVremeBursa"), /Acasa\.franaSurse\(/, "acVremeBursa nu trece prin frâna surselor");
  assert.match(EC, /acasaVerd\(\$\("acVremeCrypto"\)[\s\S]{0,900}acSurseHtml\(acSurseCrypto\(d\)\)/, "cardul Crypto nu-și scrie rândul");
  assert.match(EC, /acasaVerd\(\$\("acVremeBursa"\)[\s\S]{0,900}acSurseHtml\(acSurseBursa\(d\)\)/, "cardul Nasdaq nu-și scrie rândul");
  assert.match(AP, /function verdict\(\)[\s\S]*?surseTablou\(\)[\s\S]*?function drum/, "Tabloul nu-și scrie rândul");
  assert.match(AP, /botLa/, "Tabloul nu citește ora botului");
  assert.match(AP, /function pagT212\(\)[\s\S]*?surseT212\(\)[\s\S]*?antet\("pzV-t212"/, "T212 nu-și scrie rândul");
  assert.match(AP, /cfg\.surse/, "antetul nu scrie rândul surselor");
  assert.match(citeste("public", "app.css"), /\.dusRand\{/, "lipsește stilul rândului");
});

await test("8 I-866: forma vocii din scorul ei", () => {
  assert.match(AP, /formaVoce: formaVoce/, "AsezarePaznic nu exportă formaVoce");
  const AZ = { formaVoce: new Function(fnDin(AP.split("\n  function ").join("\nfunction "), "formaVoce") + "\nreturn formaVoce;")() };
  const nd = AZ.formaVoce("Monte Carlo", "83 – 79", "a avut dreptate de 83 de ori · „mereu pe plus” ar fi nimerit 95 – 67 · încă nu bate „mereu pe plus”");
  assert.equal(nd.forma, "nedovedita"); assert.equal(nd.pct, "51%");
  assert.equal(AZ.formaVoce("Monte Carlo", "40 – 20", "pe zilele de până acum nimerește mai des decât „mereu pe plus”").forma, "masurata");
  assert.equal(AZ.formaVoce("Monte Carlo", "4 – 2", "încă puține zile (6) ca să trag o concluzie").forma, "putine");
  assert.equal(AZ.formaVoce("Monte Carlo", "", "").forma, "fara", "fără scor: gri, nu bifă");
  assert.equal(AZ.formaVoce("Monte Carlo", "40 – 20", "pe zilele de până acum nimerește mai des decât o aruncare de ban").forma, "nedovedita", "banul nu e reperul");
  assert.equal(AZ.formaVoce("Busola", "", "").forma, "nedovedita");
  assert.equal(AZ.formaVoce("trend 4h", "", "").forma, null, "vocile fără scor ținut rămân cum sunt");
});

await test("9 I-866: vocea nedovedită e gri, cu sensul în cuvinte și procentul", () => {
  const f = new Function("esc", fnDin(AP.split("\n  function ").join("\nfunction "), "vocePzHtml") + "\nreturn vocePzHtml;")(esc);
  const h1 = f({ n: "Monte Carlo", ton: "da", tit: "t", forma: { forma: "nedovedita", pct: "51%" } });
  assert.match(h1, /pzVoce-nedov/); assert.doesNotMatch(h1, /pzVoce-da/); assert.doesNotMatch(h1, /✓/);
  assert.equal(text(h1), "○ Monte Carlo cu botul · 51%, nedovedit");
  const h2 = f({ n: "Busola", ton: "nu", tit: "t", forma: { forma: "nedovedita", pct: null } });
  assert.equal(text(h2), "○ Busola contra botului · nedovedită");
  const h3 = f({ n: "Monte Carlo", ton: "da", tit: "t", forma: { forma: "putine", pct: "60%" } });
  assert.equal(text(h3), "○ Monte Carlo cu botul · prea puține zile");
  const h4 = f({ n: "Monte Carlo", ton: "da", tit: "t", forma: { forma: "masurata", pct: "62%" } });
  assert.match(h4, /pzVoce-da/); assert.equal(text(h4), "✓ Monte Carlo · 62%");
  assert.equal(text(f({ n: "Monte Carlo", ton: "da", tit: "t", forma: { forma: "fara", pct: null } })), "○ Monte Carlo cu botul · fără scor încă");
  const h5 = f({ n: "trend 4h", ton: "nu", tit: "t" });
  assert.equal(text(h5), "✗ trend 4h");
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
