// Proba v100.108 (06.10, el: „pune toate schimbările și pe Trading 212” ⇒ demo aprobat cu „ok”):
// (S) semaforul trendului pe graficul poziției T212 - 6 TF-uri aduse DOAR pentru poziția deschisă, culorile față de o poziție doar long
//     (verde urcă · galben lateral · roșu coboară), „ultima ședință” când bursa e închisă, citirea pe TF-uri sub grafic, banda de trend
// (C) cardul Consilierului T212 explicit, rând cu rând (tabelul din demo); pe AVGO cardul își păstrează regula și spune diferența față de becul 1z
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js", "probabilitati.js", "grafic-bot.js", "actiuni-semnale.js", "consilier.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Consiliu: C, GraficBot: GB, Directie: DR, ActiuniSemnale: AS, Probabilitati: P, Consilier: CO } = globalThis;
const ecran = citeste("public", "lib", "t212-ecran.js");
const fnE = (nume) => { const i = ecran.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în t212-ecran.js"); return ecran.slice(i, ecran.indexOf("\nfunction ", i + 10)); };
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 600)}`); }); }
console.log("\nV100.108 · Trading 212: semaforul trendului + cardul explicit · proba\n");

const T0 = Date.UTC(2026, 9, 5, 20, 0), ZI = 864e5;
const rows = (n, pas, f, t0) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: (t0 || T0) - (n - 1 - i) * pas, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 10 }; });
const SUS = (pas, t0) => rows(200, pas, (i) => 1 + i * 0.002 + (i % 3 ? 0.0015 : -0.002), t0), LAT = (pas, t0) => rows(200, pas, (i) => 1 + (i % 2 ? 0.01 : -0.01), t0), JOS = (pas, t0) => rows(200, pas, (i) => 2 - i * 0.002 + (i % 3 ? 0.0015 : -0.002), t0);

// ---------------- (S) semaforul pe acțiuni ----------------
await test("(S1) serverul: /api/t212 preturi știe 5m · 15m · 30m · 1h · 4h · 1d; 4h din barele de 1 h, câte 4 în aceeași zi de bursă", async () => {
  const R = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  assert.deepEqual(["5m", "15m", "30m", "1h", "4h", "1d", "1w", "x"].map(R.intervalPreturi), ["5m", "15m", "30m", "1h", "4h", "1d", "1d", "1d"]);
  const h = Array.from({ length: 7 }, (_, i) => ({ time: Date.UTC(2026, 9, 5, 13, 30) + i * 36e5, open: 1 + i, high: 2 + i, low: 0.5, close: 1.5 + i, volume: 10 }));
  const g = R.grupeaza4h(h);
  assert.equal(g.length, 2); assert.deepEqual([g[0].open, g[0].high, g[0].close, g[0].volume], [1, 5, 4.5, 40]); assert.deepEqual([g[1].open, g[1].close, g[1].volume], [5, 7.5, 30]);
  const s = citeste("functions", "api", "t212.js");
  assert.match(s, /"5m": "5min", "15m": "15min", "30m": "30min", "1h": "1h", "4h": "4h", "1d": "1day"/);
});
await test("(S2) culorile față de poziție: urcă = verde (cu poziția), lateral = galben (neutru), coboară = roșu (împotriva poziției)", () => {
  const s = GB.semafor({ "5M": SUS(3e5, T0), "15M": LAT(9e5, T0), "30M": JOS(18e5, T0) }, "long", { actiune: true, acum: T0 + 6e4 });
  assert.deepEqual(s.slice(0, 3).map((x) => x.ton), ["bine", "atentie", "rau"]);
  assert.match(s[0].text, /· cu poziția$/); assert.match(s[1].text, /· neutru pentru poziție$/); assert.match(s[2].text, /· împotriva poziției$/);
  assert.equal(s[3].text, "lumânările n-au venit încă (se aduc când deschizi detaliul poziției)");
});
await test("(S3) bursa închisă: becurile sub o zi spun „ultima ședință, 5.10”; barele închise nu-și pierd ultima bară (1z din bareBursa, intraday după ședință)", () => {
  const r = SUS(3e5, T0), s = GB.semafor({ "5M": r }, "long", { actiune: true, acum: T0 + 10 * 36e5 })[0];
  assert.match(s.text, /· ultima ședință, 5\.10$/, s.text);
  const toate = DR.analizeaza(r.concat([Object.assign({}, r[r.length - 1], { time: r[r.length - 1].time + 1 })]), 1, "long");
  assert.equal(s.vechime, toate.vechime, "toate barele închise intră în socoteală");
  const zi = SUS(ZI, T0), d = GB.semafor({ "1D": zi }, "long", { actiune: true, acum: T0 + 36e5 })[5];
  assert.equal(d.vechime, DR.analizeaza(zi.concat([Object.assign({}, zi[zi.length - 1], { time: zi[zi.length - 1].time + 1 })]), 1, "long").vechime);
  assert.doesNotMatch(d.text, /ultima ședință/, "1 zi nu poartă nota");
});
await test("(S4) desenul acțiunii: banda pe TOATE barele zilnice (închise), legenda spune „față de poziția ta”", () => {
  const zi = SUS(ZI, T0), raw = GB.bare(zi).slice(-120), sem = GB.semafor({ "1D": zi }, "long", { actiune: true, acum: T0 });
  const d = GB.desen({ bare: raw, W: 1000, st: { ema: true }, actiune: true, niv: [], semafor: sem, tfGrafic: "1D", trendIstoric: zi, trendInchise: true });
  assert.equal((d.svg.match(/class="gbTrend"/g) || []).length, 120);
  assert.match(d.legenda, /semafor: culoarea = față de poziția ta \(verde urcă · galben lateral · roșu coboară\), săgeata = piața/);
});
await test("(S5) pagina T212: lumânările TF-urilor se aduc doar la deschiderea poziției; graficul primește semaforul și banda; citirea stă sub grafic", () => {
  assert.match(fnE("t212AduTf"), /\["5m", "15m", "30m", "1h", "4h"\]/);
  assert.match(fnE("t212AduTf"), /\/api\/t212\?action=preturi&interval=/);
  assert.match(fnE("t212Comuta"), /t212AduTf\(tk\)/); assert.match(fnE("t212Deschide"), /t212AduTf\(tk\)/);
  const g = fnE("t212GraficHtml");
  assert.match(g, /var sem = GraficBot\.semafor\(t212PeTf\(p\.ticker\), "long", \{ actiune: true, acum: Date\.now\(\), sedinta: t212SedintaDeschisa\(Date\.now\(\)\) \}\)/); assert.match(g, /semafor: sem, tfGrafic: "1D", trendIstoric: t212ZiRanduri\(p\.ticker\), trendInchise: true/);
  assert.match(g, /d\.semafor = sem;/);
  assert.match(fnE("t212GraficeDeseneaza"), /t212TfCit/);
});

// ---------------- (C) cardul explicit ----------------
const APLD = { simbol: "APLD", pret: 24.81, pretMediu: 29.55, plan: { trailPct: 15 }, maxDupaCumparare: 29.61, qty: 53.259 };
await test("(C1) motivele poziției: „−16,2% de la maximul de $29.61; planul tău: ieși la −15%” · „Trend în jos; ești pe −16,0% față de prețul tău mediu” · „Aș ieși cum ai scris în plan”", () => {
  const r = AS.semafor(APLD, { trend: { dir: "jos", motive: ["EMA 20 sub EMA 50, care coboară"] }, miscare: { mare: false } });
  const m = r.componente.map((x) => x.motiv);
  assert.ok(m.includes("−16,2% de la maximul de $29.61; planul tău: ieși la −15%"), m.join(" | "));
  assert.ok(m.includes("trend în jos; ești pe −16,0% față de prețul tău mediu"), m.join(" | "));
  assert.match(r.ceAsFace, /Aș ieși cum ai scris în plan \(tot sau jumătate\)/);
});
await test("(C2) trendul zilnic: „trend în jos pe zilnice: EMA 20 sub EMA 50, care coboară”; „dacă n-ai stop, aș pune unul”", () => {
  const r = AS.semafor({ simbol: "AVGO", pret: 363.33, pretMediu: 399.96, plan: {}, qty: 2.8 }, { trend: { dir: "jos", motive: ["EMA 20 sub EMA 50, care coboară"] }, miscare: { mare: false } });
  assert.ok(r.componente.some((x) => x.motiv === "trend în jos pe zilnice: EMA 20 sub EMA 50, care coboară"), r.componente.map((x) => x.motiv).join(" | "));
  assert.match(r.ceAsFace, /; dacă n-ai stop, aș pune unul\.$/);
  assert.match(citeste("public", "lib", "actiuni-semnale.js"), /motive\.push\("EMA 20 " \+ \(e20\[n\] > e50\[n\] \? "peste" : "sub"\) \+ " EMA 50, care " \+/);
});
await test("(C3) banii: „dacă vinzi acum: … $ (≈ … lei)” · „prețul e deja sub stopul care urcă” · „dacă atinge stopul care urcă (…): …”", () => {
  const sem = AS.semafor(APLD, { trend: { dir: "jos", motive: ["x"] }, miscare: { mare: false } });
  const c = C.alcatuiesteActiune({ sem, niv: { stopPozitie: 25.1685 }, prob: [], sfaturi: [], plan: APLD.plan, pret: 24.81, pretMediu: 29.55, qty: 53.259, costLei: 7134, simbol: "APLD", fx: 4.53 });
  assert.match(c.bani, /^dacă vinzi acum: −252,\d\d \$ \(≈ −1\.1\d\d lei\) · prețul e deja sub stopul care urcă \(\$25\.17\)$/, c.bani);
  const c2 = C.alcatuiesteActiune({ sem, niv: { stopPozitie: 22 }, prob: [], sfaturi: [], plan: APLD.plan, pret: 24.81, pretMediu: 29.55, qty: 53.259, costLei: 7134, simbol: "APLD", fx: 4.53 });
  assert.match(c2.bani, / · dacă atinge stopul care urcă \(\$22(\.00)?\): −40\d,\d\d \$ \(≈ −1\.8\d\d lei\)$/, c2.bani);
});
await test("(C4) AVGO: cardul își păstrează trendul pe medii, dar spune diferența față de becul 1z (lateral, zigzag de N zile)", () => {
  const sem = AS.semafor({ simbol: "AVGO", pret: 363.33, pretMediu: 399.96, plan: {}, qty: 2.8 }, { trend: { dir: "jos", motive: ["EMA 20 sub EMA 50, care coboară"] }, miscare: { mare: false } });
  const c = C.alcatuiesteActiune({ sem, niv: null, prob: [], sfaturi: [], plan: {}, pret: 363.33, pretMediu: 399.96, qty: 2.8, costLei: 5108, simbol: "AVGO", semZi: { dir: "lateral", vechime: 12 } });
  const m = c.motive.find((x) => x.cod === "trend-jos");
  assert.equal(m.titlu, "Trend în jos pe zilnice: EMA 20 sub EMA 50, care coboară");
  assert.equal(m.text, "Becul 1z spune lateral de 12 zile, deși mediile arată în jos.");   /* revizia: „lateral” nu e mereu zigzag (și mediile nealiniate) */
  const fara = C.alcatuiesteActiune({ sem, niv: null, prob: [], sfaturi: [], plan: {}, pret: 363.33, pretMediu: 399.96, qty: 2.8, costLei: 5108, simbol: "AVGO", semZi: { dir: "coboara", vechime: 5 } });
  assert.equal(fara.motive.find((x) => x.cod === "trend-jos").text, "", "fără diferență, fără rândul în plus");
  assert.match(fnE("t212PregatesteP") + ecran, /semZi: t212SemZi\(p\.ticker\)/);
});
await test("(C5) „de ce s-a schimbat” peste 48 h în zile: „acum 4 zile”, nu „acum 87 h”", () => {
  assert.match(C.deCeAfisat("din 🟡 Atenție în 🟢 Ține · a dispărut: X e în a 9-a zi, pe minus", 87 * 60), /^Verdictul s-a schimbat acum 4 zile, /);
  assert.match(C.deCeAfisat("din A în B · a apărut: C", 47 * 60), /acum 47 h/);
});
await test("(C6) sfaturile istoricului: „Ții UHS de 11 zile și e pe −4,6%” · „Din trade-urile tale ținute 1–4 săptămâni, 63 din 146 au ieșit pe plus; total …” · istoria pe acțiune rămâne „Pe APLD: …” (≤ 60)", () => {
  const s = citeste("public", "lib", "consilier.js");
  assert.match(s, /titlu: "Ții " \+ p\.simbol \+ " de " \+ cate\(Math\.floor\(zile\), "zi", "zile"\) \+ " și ești pe " \+/);
  assert.match(s, /text: "Din trade-urile tale ținute 1–4 săptămâni, " \+ g\.pePlus \+ " din " \+ g\.n \+ " au ieșit pe plus; total " \+ L\(g\.total\) \+ "\."/);
  assert.match(s, /titlu: "Pe " \+ p\.simbol \+ ": " \+ cate\(ist\.n, "trade", "trade-uri"\)/, "„Istoria ta pe …” trecea de 60 de caractere - forma scurtă rămâne");
});
await test("(C7) șansele stopului în cuvinte: „Șansa să atingă stopul mâine” · „Șansa ca ținta să vină înaintea stopului în 5 zile de bursă” · „Șansa ca bursa să deschidă sub stop” · stopul depășit", () => {
  const a = { k: 2, n: 54, nIndep: 50, p: 0.02, nivel: "exact", stare: "jos-liniste", ic: [0, 0.1] }, s = { k: 1, n: 54, nIndep: 50, p: 0.02, nivel: "exact", stare: "jos-liniste", ic: [0, 0.1] }, t = { k: 0, n: 50, nIndep: 48, p: 0, nivel: "exact", stare: "jos-liniste", ic: [0, 0.07] };
  const r = P.randActiune({ stop1: a, sare1: s, cursa5: { tinta: t, stop: { p: 0.28 } } }, { rezumat: { n: 575, pMed: 0.06, rata: 0.06, saptamani: 49 } });
  const pe = (c) => r.find((x) => x.cod === c);
  assert.equal(pe("stop1").titlu, "Șansa să atingă stopul mâine");
  assert.equal(pe("stop1").text, "în 3 din 54 de zile ca acum (trend în jos, liniștit); în 2% din zile, printr-o săritură la deschidere");
  assert.equal(pe("cursa5").titlu, "Șansa ca ținta să vină înaintea stopului în 5 zile de bursă");
  assert.equal(pe("cursa5").text, "în 0 din 50 de zile ca acum (trend în jos, liniștit); stopul a venit primul în 28% · verificat pe cumpărările tale: am zis în medie 6% și s-a întâmplat în 6% (575 de cazuri, 49 de săptămâni)");
  assert.equal(pe("sare1").titlu, "Șansa ca bursa să deschidă sub stop");
  assert.equal(pe("sare1").text, "în 1 din 54 de zile ca acum (trend în jos, liniștit), deci șansa reală e între 0% și 10%; atunci stopul se vinde sub prețul lui");   /* revizia: intervalul lângă cifră */
  assert.equal(P.randActiune({ motiv: "stopul e deja depășit (prețul e sub el)" }, null)[0].titlu, "Șansele stopului nu se mai socotesc: prețul e deja sub stop");
  assert.match(citeste("public", "lib", "consiliu.js"), /if \(\/stopul mâine\/\.test\(r\.titlu\)/);
});
// ---------------- revizia de cod (Opus, 06.10): 1 critic + 4 importante + minorele ieftine ----------------
await test("(R1) 🔴 „Ce ai de făcut acum” găsește sfatul „ții pe minus” după un câmp stabil (tip), nu după titlu - titlul nou nu mai avea „zi, pe minus”", () => {
  assert.match(citeste("public", "lib", "consilier.js"), /tip: "tinut-pe-minus"/);
  assert.match(ecran, /x\.tip === "tinut-pe-minus"/); assert.doesNotMatch(ecran, /\/zi, pe minus\//);
});
await test("(R2) titlul „Ții X de N zile” spune procentul pe care îl judecă (în lei, cu semnul lui), nu un minus pus forțat", () => {
  const s = citeste("public", "lib", "consilier.js");
  assert.match(s, /" și ești pe " \+ pctS\(p\.pctLei\) \+ " în lei"/); assert.match(s, /function pctS\(f\) \{/);
  assert.equal(TextRo.pctSemn(100 * -0.0226, 1), "−2,3%");
});
await test("(R3) garda acțiunilor: motivul „stopul mâine” se generează din nou (căutat după cod, nu după titlu) și garda verifică că există", () => {
  const g = citeste("scripts", "lib", "garda-actiuni.mjs");
  assert.match(g, /probA\.map\(\(r\) => r\.cod === "stop1" \?/); assert.match(g, /stop-maine/);
});
await test("(R5) ședința bursei după ora New York-ului: în ședință bara de acum e în formare (fără „ultima ședință”), după ședință toate sunt închise", () => {
  const r = SUS(3e5, T0), acum = T0 + 12 * 6e4;
  const deschis = GB.semafor({ "5M": r }, "long", { actiune: true, acum, sedinta: true })[0], inchis = GB.semafor({ "5M": r }, "long", { actiune: true, acum, sedinta: false })[0];
  assert.doesNotMatch(deschis.text, /ultima ședință/); assert.equal(deschis.vechime, DR.analizeaza(r, 1, "long").vechime);
  assert.match(inchis.text, /ultima ședință, 5\.10$/);
  assert.match(fnE("t212GraficHtml"), /sedinta: t212SedintaDeschisa\(Date\.now\(\)\)/);
  assert.match(fnE("t212SedintaDeschisa"), /America\/New_York/);
  assert.match(fnE("t212GraficeDeseneaza"), /t212AduTf\(p\.ticker\)/, "la fiecare redesenare a unei poziții deschise lumânările se reîmprospătează (limita de 5 min le ține în frâu)");
});
await test("(m) minorele: „cum ai scris” și pe Discord / poză · „când deschizi detaliul” · numele 🧠 pe acțiuni ca titlurile 🎲 noi · Yahoo 4 h din 730 de zile de bare de 1 h", () => {
  assert.doesNotMatch(citeste("public", "lib", "actiuni-semnale.js") + citeste("scripts", "lib", "poza.mjs"), /cum am scris/);
  assert.match(citeste("public", "lib", "grafic-bot.js"), /lumânările n-au venit încă \(se aduc când deschizi detaliul poziției\)/);
  const rt = citeste("public", "lib", "retea.js");
  assert.match(rt, /"stop1-t212": "Șansa să atingă stopul mâine", "sare1-t212": "Șansa ca bursa să deschidă sub stop", "cursa5-t212": "Șansa ca ținta să vină înaintea stopului în 5 zile de bursă"/);
  assert.match(citeste("functions", "api", "t212.js"), /if \(interval === "4h"\) \{ const h = await yahoo\(simbol, "1h", "730d"\);/);
});

await test("(E) versiunea v100.108 peste tot", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.108"/); assert.match(html, /id="sideVersiune"[^>]*>v100\.108/); assert.match(html, /id="antetVersiune">v100\.108/); assert.match(html, /id="healthAppVersion">v100\.108</);
  assert.equal(JSON.parse(citeste("package.json")).version, "100.108.0");
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-108";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
