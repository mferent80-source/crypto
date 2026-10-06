// Proba v100.110 / colector v101.74 (06.10, el: „ok fă tot” pe I-541..I-548 din backlog + bug-ul semnalat; I-542 = demo întâi):
// I-541 colectorul vede trendul pe 4 h + 1 zi (Discord = Tablou) · I-543 „Ce ai de făcut acum” estompează rândurile depășite (pe CHEIE)
// I-544 clic pe bec ⇒ perioada graficului · I-545 semaforul pe boții lui (măsurat, regula fixată înainte, ca I-530)
// I-546 T212 coloana TREND spune și becul 1z când diferă · I-547 T212 Discord când becul 1z trece împotriva poziției
// I-548 becurile pe rând + cererea picată reluată în 30 s · bug: barele zilnice Twelve Data la ora deschiderii New York.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js", "probabilitati.js", "grafic-bot.js", "actiuni-semnale.js", "consilier.js", "asemanatoare.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { GraficBot: GB, Directie: DR, TabloExtra: TE, Asemanatoare: AS } = globalThis;
const app = citeste("public", "app.js"), ecran = citeste("public", "lib", "t212-ecran.js"), col = citeste("scripts", "colector.mjs");
const fn = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); return src.slice(i, src.indexOf("\nfunction ", i + 10)); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.110 · I-541..I-548 + bug-ul Twelve Data · proba\n");

const T0 = Date.UTC(2026, 9, 5, 20, 0), ORA = 36e5, ZI = 864e5;
const rows = (n, pas, f, t0) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: (t0 || T0) - (n - 1 - i) * pas, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 10 }; });
const SUS = (pas, t0, n) => rows(n || 200, pas, (i) => 1 + i * 0.002 + (i % 3 ? 0.0015 : -0.002), t0), JOS = (pas, t0, n) => rows(n || 200, pas, (i) => 2 - i * 0.002 + (i % 3 ? 0.0015 : -0.002), t0);

// ---------------- I-541 ----------------
await test("(541) colectorul aduce și 1 zi și dă Consilierului rezumatul 4 h + 1 zi, ca Tabloul (nu „rezumat: null”)", () => {
  const d = fn(col, "directiaBotului");
  assert.match(d, /interval=1D&limit=400/); assert.match(d, /const rez = \[Object\.assign\(\{ tf: "4H"/);
  assert.match(col, /rezumat: d\.rez \? Directie\.rezumat\(d\.rez, b\.directie\) : null/); assert.doesNotMatch(col, /fisa: f, rezumat: null, acum/);
  const r4 = Object.assign({ tf: "4H", eticheta: "4 ore" }, DR.analizeaza(JOS(4 * ORA), 6, "long")), r1 = Object.assign({ tf: "1D", eticheta: "1 zi" }, DR.analizeaza(JOS(ZI), 7, "long"));
  assert.equal(DR.rezumat([r4, r1], "long").ton, "rau");
  assert.doesNotMatch(citeste("public", "lib", "consiliu.js"), /colectorul nu vede direcția pe mai multe intervale/);
});
// ---------------- I-543 ----------------
await test("(543) „Ce ai de făcut acum”: verdictul de ieri contrazis de cel de acum și regula care nu mai sună se estompează - după CHEIE, nu după titlu", () => {
  const acum = T0, al = [{ t: acum - 3 * ORA, nivel: "atentie", titlu: "TAKE · Atenție: marginea de jos e la −9,1%", mesaj: "x", cheie: "consilier" }, { t: acum - ORA, nivel: "atentie", titlu: "TAKE: ieșit din grid", mesaj: "y", cheie: "grid" }, { t: acum - ORA, nivel: "critic", titlu: "TAKE: lichidarea la 6%", mesaj: "z", cheie: "lich" }];
  const l = TE.ceAiDeFacut({ acum, alerte: al, sfaturi: [], avertismente: [] });
  assert.ok(l.every((x) => !x.titlu || ("cheie" in x)), "rândurile din alerte poartă cheia");
  const m = TE.marcheazaDepasite(l, { cons: { nivel: "tine", eticheta: "🟢 Ține" }, reguli: { grid: { nivel: "ok" }, lich: { nivel: "critic" } } });
  const pe = (re) => m.find((x) => re.test(x.titlu));
  assert.equal(pe(/Atenție/).depasit, "nu mai e valabil · acum: 🟢 Ține");
  assert.equal(pe(/ieșit din grid/).depasit, "nu mai e așa acum");
  assert.equal(pe(/lichidarea/).depasit, undefined);
  assert.equal(TE.marcheazaDepasite(l, { cons: { nivel: "atentie", eticheta: "🟡 Atenție" }, reguli: {} }).find((x) => /Atenție/.test(x.titlu)).depasit, undefined, "același nivel ⇒ rămâne");
  assert.match(fn(app, "tbRenderTodo"), /TabloExtra\.marcheazaDepasite\(/); assert.match(fn(app, "tbRenderTodo"), /tbTodoDepasit/);
  assert.match(citeste("public", "app.css"), /\.tbTodoDepasit\{/);
});
// ---------------- I-544 ----------------
await test("(544) becurile 5m / 15m / 1h sunt butoane spre perioada graficului; clicul pe bec nu mută stopul de probă", () => {
  const sem = GB.semafor({ "5M": SUS(3e5), "15M": SUS(9e5), "60M": SUS(ORA) }, "long"), raw = GB.bare(SUS(3e5)).slice(-120);
  const d = GB.desen({ bare: raw, W: 1000, st: { ema: true }, simplu: true, niv: [], semafor: sem, tfGrafic: "5M", semClic: { "5M": "tbAlegeInterval('24h')", "15M": "tbAlegeInterval('3z')", "60M": "tbAlegeInterval('7z')" } });
  assert.match(d.svg, /<g class="gbSem" tabindex="0" role="button" data-action-click="tbAlegeInterval\('3z'\)">/);
  assert.equal((d.svg.match(/data-action-click=/g) || []).length, 3);
  assert.match(app, /semClic:\{"5M":"tbAlegeInterval\('24h'\)","15M":"tbAlegeInterval\('3z'\)","60M":"tbAlegeInterval\('7z'\)"\}/);
  assert.match(app, /zona\.addEventListener\("pointerdown",function\(e\)\{if\(e\.target&&e\.target\.closest&&e\.target\.closest\("\.gbSem"\)\)return;/);
});
// ---------------- I-545 ----------------
await test("(545) cazurile poartă becurile 1h / 4h / 1z de la pornire (doar bare încheiate înainte), iar bilanțul cu botul vs împotrivă urmează regula ADX-ului", () => {
  const h = SUS(ORA, T0, 24 * 80).map((r) => ({ t: r.time, o: r.open, h: r.high, l: r.low, c: r.close, v: 10 }));
  const tr = [{ id: "1", moneda: "X", dir: "long", jos: 0.9, sus: 1.1, pretInit: 1, pus: 100, net: 2, pornit: T0 - 2 * ORA, levier: 2, durataOre: 5 }];
  const c = AS.cazuri(tr, () => h)[0];
  assert.match(c.tf, /^[ucl]{3}$/, JSON.stringify(c)); assert.equal(c.tf, "uuu");
  const tarziu = AS.cazuri([Object.assign({}, tr[0], { pornit: T0 - 79 * ZI })], () => h)[0];
  assert.equal(tarziu.tf, null, "prea puține zile închise înainte ⇒ fără becuri (nu ghicește)");
  const cz = []; for (let m = 0; m < 12; m++) for (let k = 0; k < 6; k++) { cz.push({ moneda: "M" + m, dir: "long", tf: "uul", pct: 0.02, t: m * 10 + k }); cz.push({ moneda: "M" + m, dir: "long", tf: "ucc", pct: k % 2 ? -0.03 : 0.01, t: m * 10 + k + 5 }); }
  const bl = AS.bilantSemafor(cz, { rep: 300 });
  assert.equal(bl.cu.n, 72); assert.equal(bl.contra.n, 72); assert.equal(bl.verdict, "dovedit");
  assert.match(AS.textSemafor(bl), /^pe boții tăi, porniți fără niciun bec împotrivă \(4 h, 1 zi\) au ieșit mai bine \(fără: 100% pe plus · cu unul împotrivă: 50%, din 144\)$/);
  assert.equal(AS.textSemafor(AS.bilantSemafor(cz.slice(0, 20))), "pe boții tăi: prea puține cazuri cu becurile la pornire (20)");
  assert.match(app, /tbCazuri\.sem=/); assert.match(app, /semPeBoti:tbCazuri\.sem\|\|null/);
  const cit = GB.citire({ bare: GB.bare(SUS(3e5)), semafor: GB.semafor({ "5M": SUS(3e5) }, "long"), semPeBoti: "pe boții tăi nu s-a dovedit că ajută (x)", funding: null }, { directie: "long" }, null);
  assert.ok(cit.randuri.some((x) => x.tf && x.ce === "Pe boții tăi" && /nu s-a dovedit/.test(x.text)));
});
// ---------------- I-546 ----------------
await test("(546) T212: coloana TREND spune și becul 1z când nu e de acord cu mediile („↓ jos” + „1z: lateral”)", () => {
  const z = SUS(ZI).map((r) => ({ t: r.time, o: r.open, h: r.high, l: r.low, c: r.close, v: 10 }));
  assert.deepEqual(GB.semZi(z, "long").dir, "urca"); assert.equal(GB.semZi(z.slice(0, 30), "long"), null);
  const r = fn(ecran, "t212RandPozitie");
  assert.match(r, /var sz = t212SemZi\(p\.ticker\)/); assert.match(r, /<span class="t212Mic">1z: ' \+ /);
  assert.match(fn(ecran, "t212SemZi"), /GraficBot\.semZi\(t212\.bare\[tk\], "long"\)/);
});
// ---------------- I-547 ----------------
await test("(547) T212: mesajul „becul 1z trece în jos” (titlu ≤ 60, 2 rânduri, acțiune la persoana I) și colectorul îl trimite o dată pe schimbare", async () => {
  const MC = await import(pathToFileURL(path.join(RAD, "scripts", "lib", "mesaje-colector.mjs")).href);
  const m = MC.bec1zContra("AVGO", 3, -0.092);
  assert.equal(m.titlu, "AVGO: trendul pe 1 zi a trecut în jos"); assert.ok(m.titlu.length <= 60);
  assert.equal(m.mesaj, "Becul 1z al poziției e roșu de 3 zile (EMA 20 sub EMA 50, prețul merge în jos); ești pe −9,2% față de prețul mediu.\n👉 N-aș cumpăra în plus până nu se întoarce; aș verifica stopul din plan.");
  assert.equal(m.cheie, "bec1z"); assert.equal(m.nivel, "atentie");
  assert.match(col, /GraficBot\.semZi\(bare, "long"\)/); assert.match(col, /semZi,? ?\}?\)/);
  assert.match(col, /stA\._bec1z/); assert.match(col, /MesajeColector\.bec1zContra\(/);
});
// ---------------- I-548 ----------------
await test("(548) becurile se aprind pe rând; cererea picată se reia în 30 s, iar becul spune „reîncerc”", () => {
  const s = GB.semafor({}, "long", { reincerc: true })[0];
  assert.equal(s.text, "Pionex n-a dat lumânările la ultima cerere · reîncerc în 30 s");
  const t = GB.semafor({}, "long", { actiune: true, reincerc: true })[1];
  assert.equal(t.text, "lumânările n-au venit încă · reîncerc în 30 s");
  const d = fn(app, "tbAduDirectie");
  assert.match(d, /setTimeout\(tbReiaLipsa,30000\)/); assert.match(app, /function tbReiaLipsa\(/);
  assert.match(fn(ecran, "t212AduTf"), /setTimeout\(function \(\) \{ t212AduTf\(tk, true\); \}, 30000\)/);
  assert.match(fn(ecran, "t212AduTf"), /if \(t212\.deschis\[tk\]\) t212GraficeDeseneaza\(\);/);
});
// ---------------- bug Twelve Data ----------------
await test("(bug) barele zilnice Twelve Data primesc ora deschiderii la New York (ca Yahoo): bara de azi se scoate corect cât bursa e deschisă", async () => {
  const R = await import(pathToFileURL(path.join(RAD, "functions", "api", "t212.js")).href);
  assert.equal(R.ziTd("2026-10-05"), Date.UTC(2026, 9, 5, 13, 30)); assert.equal(R.ziTd("2026-12-07"), Date.UTC(2026, 11, 7, 14, 30));
});
// ---------------- revizia de cod (Opus, 06.10): 4 importante + minorele ieftine ----------------
await test("(R1) T212: „reîncerc” doar cât reluarea e chiar programată; după ea, „nici la a doua cerere”; redesen după tură", () => {
  const f = fn(ecran, "t212AduTf");
  assert.match(f, /c\.reiaProgramat = true; setTimeout\(function \(\) \{ t212AduTf\(tk, true\); \}, 30000\)/);
  assert.match(f, /c\.inLucru = false;[\s\S]*t212GraficeDeseneaza\(\)/);
  assert.match(fn(ecran, "t212Reincerc"), /reiaProgramat/);
  assert.equal(GB.semafor({}, "long", { actiune: true, aDouaOara: true })[1].text, "lumânările n-au venit nici la a doua cerere");
  assert.equal(GB.semafor({}, "long", { seAduc: true })[0].text, "se aduc lumânările…");
});
await test("(R2) Tablou: reluarea reface „Direcția” și indicatorii pentru TF-urile ei (o voce), nu pornește cât tura e în lucru și se programează abia după tură, doar dacă nu au căzut toate", () => {
  const r = fn(app, "tbReiaLipsa");
  assert.match(r, /if\(!b\|\|!d\|\|d\.inLucru\|\|/); assert.match(r, /Directie\.analizeaza\(/); assert.match(r, /tbCalculeazaIndicatorii\(d\);renderTabloDirectia\(\);renderTabloIndicatori\(\)/);
  assert.match(r, /d\.reiaProgramat=false/); assert.match(r, /d\.aDouaOara=/);
  const t = fn(app, "tbAduDirectie");
  assert.match(t, /d\.eroare=rez\.every\([^)]*\)[^;]*\);[\s\S]*if\(lipsa\.length&&!d\.eroare\)\{d\.reiaProgramat=true;setTimeout\(tbReiaLipsa,30000\)\}/);
  assert.match(t, /if\(d\.simbol!==cheie\)\{d\.peLucru=\{cheie:cheie,pe:pe\};/, "becurile pe rând doar la prima încărcare / la schimbarea monedei");
  assert.match(fn(app, "tbSemaforTf"), /reincerc:!!\(d\.simbol===k&&d\.reiaProgramat\)/);
});
await test("(R3) I-547: becul 1z doar pe listările din SUA; alerta cel mult o dată pe zi, starea scrisă după trimiterea reușită și doar la schimbare", () => {
  assert.match(col, /const semZi = \/_US_EQ\$\/\.test\(x\.ticker\) && bare\.length \? GraficBot\.semZi\(bare, "long"\) : null/);
  assert.match(col, /stA\._bec1zZi !== ziB/); assert.match(col, /if \(await trimiteAlerta\(MesajeColector\.bec1zContra\(/);
  assert.match(fn(ecran, "t212SemZi"), /_US_EQ\$/);
});
await test("(R4) bilanțurile 🧠/becuri se socotesc în colector, o dată pe noapte, și se păstrează lângă cazuri; pagina le citește (fără 1–2 s de calcul pe telefon)", () => {
  assert.match(col, /bilant = \{ adx: Asemanatoare\.textAdx\(Asemanatoare\.bilantAdx\(cz\)\), sem: Asemanatoare\.textSemafor\(Asemanatoare\.bilantSemafor\(cz\)\) \}/);
  assert.match(citeste("functions", "api", "istoric-bot.js"), /bilant:/);
  assert.match(fn(app, "tbCazuriAdu"), /d\.cazuri\.bilant/);
  assert.doesNotMatch(citeste("public", "lib", "asemanatoare.js"), /s = s\.concat\(monede/);
});
await test("(m) Enter / Space pe un bec · „Pe boții tăi:” fără să se repete · mii cu punct · becul 1z de la 60 de zile închise", () => {
  assert.match(app, /e\.target\.closest\("\.gbSem\[data-action-click\]"\)/);
  const cz = []; for (let m = 0; m < 12; m++) for (let k = 0; k < 100; k++) cz.push({ moneda: "M" + m, dir: "long", tf: k % 2 ? "uul" : "ucc", pct: 0.01, t: m * 1000 + k });
  assert.match(AS.textSemafor(AS.bilantSemafor(cz, { rep: 50 })), /din 1\.200\)$/);
  const cit = GB.citire({ bare: GB.bare(SUS(3e5)), semafor: GB.semafor({ "5M": SUS(3e5) }, "long"), semPeBoti: "pe boții tăi nu s-a dovedit că becurile ajută (x)", funding: null }, { directie: "long" }, null);
  assert.equal(cit.randuri.find((x) => x.ce === "Pe boții tăi").text, "nu s-a dovedit că becurile ajută (x)");
  const z = SUS(ZI).map((r) => ({ t: r.time, o: r.open, h: r.high, l: r.low, c: r.close, v: 10 }));
  assert.ok(GB.semZi(z.slice(-60), "long"), "60 de zile închise ajung, ca la semafor");
});

await test("(G) fișa: ÎNGUST nu trece de levierul sigur pe care tot ea îl socotește (NIL, 06.10: ÎNGUST 5× ⇒ Tabloul „levier prea mare”, sigur 3×)", () => {
  for (const f of ["grid-proba.js", "grid-plan.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
  const O = (o) => Object.assign({ pret: 4.473, dir: "long", suma: 103.38, levier: 5, plan: { plus: 5.5, minus: 15.7 }, amp: 0.0985, pas: 0.003 }, o || {});
  const v = globalThis.GridPlan.variante(O({ levierSigur: 3 }));
  assert.equal(v.ta.levier, 3); assert.equal(v.ta.levierTau, 5); assert.match(v.ta.cum, /^levierul sigur de azi \(3×; al tău e 5×\)/);
  assert.ok(v.mea.levier <= 3, "LARG pornește de la levierul ÎNGUST");
  assert.equal(globalThis.GridPlan.variante(O()).ta.levier, 5, "fără levierul sigur: ca înainte");
  assert.ok(globalThis.GridPlan.motive(v.ta, "ta").da.includes("levierul sigur de azi (3×), nu al tău (5×)"), "„De ce da” nu mai zice „levierul tău (3×)”");
  assert.match(app, /levier:levG\?Math\.round\(levG\):null,levierSigur:st&&st\.levierSigur,plan:plG/);
});
await test("(E) versiunea v100.110 / colector v101.74", () => {
  const html = citeste("public", "index.html");
  assert.match(html, /content="v100\.1\d\d"/); assert.match(html, /id="antetVersiune">v100\.1\d\d/); assert.match(html, /id="healthAppVersion">v100\.1\d\d</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1\d\d\.0$/);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1\d\d";/);
  assert.match(col, /const VERSIUNE_COLECTOR = "v101\.74";/);
});
console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
