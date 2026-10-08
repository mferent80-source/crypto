// Proba v100.106 (06.10). Două cereri ale lui, în aceeași livrare:
// (A) „la grafic să arăți și trend și tot pe grafic să pui un semafor cu tf 5min/15min/30/1h/1zi și la fel să adaugi citirea pentru ele”
//     - demo aprobat („da, fă-le pe toate”): semaforul pe 5m/15m/30m/1h/4h/1z (culoarea = față de bot, săgeata = piața), banda de trend sub
//     lumânări, EMA 20/50 umplut, un rând pe TF în citire; rândul vechi „Direcția” (doar EMA 20 vs 50) iese - contrazicea semaforul.
// (B) cardul Consilierului pe TAKE (06.10): „🟡 Atenție · Prețul e lângă marginea de jos” cu prețul la 72% din grid (−9,1% până jos,
//     3,5% sub marginea de sus). Cauza: Consiliu dădea scurtul FIX „prețul e lângă marginea de jos” oricărui sfat „margine” galben, iar
//     sfatul e galben după cât de des coboară moneda atât într-o zi (≥ 20%), nu după cât de aproape e. Plus el: „toată exprimarea e
//     ambiguă, fă explicit” - fiecare rând al cardului spune acum ce, cât și față de ce.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js", "probabilitati.js", "grafic-bot.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Sfaturi: SF, SemnaleBot: S, Consiliu: C, TabloExtra: T, Probabilitati: P, GraficBot: GB, Directie: DR } = globalThis;
const app = citeste("public", "app.js"), html = citeste("public", "index.html");
const fnApp = (nume) => { const i = app.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume + " în app.js"); return app.slice(i, app.indexOf("\nfunction ", i + 10)); };
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 600)}`); }); }
console.log("\nV100.106 · semaforul trendului pe grafic + cardul Consilierului explicit · proba\n");

// botul TAKE al lui, 06.10 06:37: long 5×, grid 0.06147–0.07 (34 de intervale), prețul 0.06761 (72% din grid), poziția 696
const T0 = Date.UTC(2026, 9, 6, 3, 30), ORA = 3600000;
const K4 = (p, amp) => Array.from({ length: 300 }, (_, i) => { const c = p * (1 + amp * Math.sin(i / 4)); return { time: T0 - (300 - i) * 4 * ORA, open: c, high: c * 1.01, low: c * 0.99, close: c }; });
const TAKE = () => ({ id: "2421", baza: "TAKE.PERP", directie: "long", levier: 5, investit: 42.47, profitTotal: 1.4, profitNet: 1.4, pozitie: 696, pretDeschidere: 0.06651, pretCurent: 0.06761, gridJos: 0.06147, gridSus: 0.07,
  distantaLichidarePct: 35.4, pretLichidare: 0.04365, gridProfitBrut: 2.1, pornitLa: T0 - 3 * 86400000,
  brut: { buOrderData: { bottom: "0.06147", top: "0.07", row: 35, perVolume: "40", position: "696", positionOpenPrice: "0.06651", marginBalance: "43.9", trend: "long", gridProfit24h: "0.6", trx24h: 20, closedExchangeOrderCount: 96 } } });
const FISA = { dir: "long", directie: { dir: "long", tarie: "tare", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false },
  liniste: { linisteAcum: false, n: 13, k: 3, p: 3 / 13, ic: [0.08, 0.5], suficient: true, H: 2 },
  setare: { jos: 0.062, sus: 0.071, grile: 6, pas: 0.014, levier: 5, levierSigur: 4, dir: "long", stop: { jos: 0.06, sus: 0.072 } } };
const sfTake = () => { const x = SF.intrare({ bot: TAKE(), k4: K4(0.06761, 0.12), funding: null, fisa: FISA, rezumat: null, acum: T0 }); return SF.sfaturi(x); };
const SOC = { muta: { nume: "„Mută gridul”", corecte: 11, judecate: 19, bani: 24, baniN: 19, stare: "ajuta" }, tine: { nume: "„Ține-l”", corecte: 21, judecate: 39, bani: -132.1, baniN: 39, stare: "tace" } };
const consTake = () => {
  const b = TAKE(), l = sfTake();
  return C.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare", faCe: "L-aș lăsa să lucreze." }, concret: [], sfaturi: l, consilier: [], socoteala: SOC,
    laJos: T.totalCuGridLa(b, 0.06147), jos: 0.06147, opritor: null });
};

// ---------------- (B) cardul Consilierului ----------------
await test("(B1) TAKE la 72% din grid: titlul NU spune „lângă marginea de jos”; spune distanța și cât de des coboară moneda atât", () => {
  const c = consTake();
  assert.equal(c.nivel, "atentie", JSON.stringify(c.motive.map((m) => m.cod)));
  assert.doesNotMatch(c.titlu, /lângă/, c.titlu);
  assert.match(c.titlu, /^Marginea de jos e la −9,1%, atinsă în \d+% din zile$/, c.titlu);
  assert.ok(c.titlu.length <= 60, c.titlu.length);
});
await test("(B2) sfatul „margine”: titlul = unde e marginea și cât de departe; textul spune ce ar fi acolo și cât de des coboară moneda atât", () => {
  const m = sfTake().find((s) => s.cod === "margine");
  assert.match(m.titlu, /^Marginea de jos \(0\.06147\) e cu 9,1% sub preț$/, m.titlu);
  assert.match(m.text, /^Acolo botul ar avea ~\d+ TAKE \(acum 696\), total ~[−+]?\d+,\d\d USDT; moneda scade cu atât în \d+% din zile \(\d+ din \d+/, m.text);
  assert.ok(m.text.length <= 160 && !/[.?]\s+[A-ZĂÂÎȘȚ]/.test(m.text), m.text.length + " " + m.text);
  assert.equal(typeof m.pctJos, "number"); assert.equal(typeof m.zile, "number");
});
await test("(B3) banii: „dacă prețul coboară la marginea de jos (0.06147): total −… USDT” (nu „dacă atinge doar …: −6,3” fără unitate)", () => {
  const c = consTake();
  assert.match(c.bani, /^dacă prețul coboară la marginea de jos \(0\.06147\): total [−+]\d+,\d USDT$/, c.bani);
});
await test("(B4) încrederea: spune ce ar fi zis semaforul fără motive, „corect în k din n” și de ce nu sună pe Discord - fără „tăcut” / „hazardul”", () => {
  const c = consTake();
  assert.match(c.incredere, /^Fără motivele de aici, semaforul ar fi zis 🟢 Ține; pe boții tăi, „Ține-l” a avut dreptate 21 din 39 \(54%\), ~−132,1 USDT dacă-l urmai de fiecare dată · nu-l trimit pe Discord: nu se descurcă mai bine decât întâmplarea\.$/, c.incredere);
  assert.doesNotMatch(S.textIncredere(SOC.tine), /tăcut|hazard/);
});
await test("(B5) cipul motivului: „pe boții tăi, „Mută gridul” a avut dreptate 11 din 19 · ~+24 USDT dacă-l urmai”", () => {
  const m = consTake().motive.find((x) => x.cod === "margine");
  assert.equal(m.cip.t, "pe boții tăi, „Mută gridul” a avut dreptate 11 din 19 · ~+24 USDT dacă-l urmai");
});
await test("(B6) motivul trendului: „Trendul: …; mediile EMA arată long, tare.” (nu „o singură măsură” / „structura pe medii”)", () => {
  const sf = [{ cod: "directie", ton: "bine", titlu: "Piața e cu botul", rezumat: "Piața merge cu botul (4 ore urcă, 1 zi e laterală)", text: "x" }, { cod: "trend", ton: "bine", titlu: "Trendul e cu botul (long, tare)", text: "" }];
  const c = C.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "nimic", faCe: "" }, concret: [], sfaturi: sf, consilier: [], socoteala: {} });
  const m = c.motive.find((x) => x.c === "v");
  assert.equal(m.text, "Trendul: piața merge cu botul (4 ore urcă, 1 zi e laterală); mediile EMA arată long, tare.");
});
await test("(B7) „de ce s-a schimbat”: noul format spune „a apărut:” / „a dispărut:”; textele vechi din KV („· + …”) se arată la fel, cu ora și „cifrele de atunci”", () => {
  const d = C.deCe({ nivel: "tine", motive: [{ cod: "tine", titlu: "A" }] }, { nivel: "atentie", motive: [{ cod: "margine", titlu: "B" }] });
  assert.equal(d.text, "din 🟢 Ține în 🟡 Atenție · a apărut: B · a dispărut: A");
  assert.equal(C.deCeAfisat("din 🟢 Ține în 🟡 Atenție · + 5,6% până la marginea de jos (0.06147)", 720),
    "Verdictul s-a schimbat acum 12 h, din 🟢 Ține în 🟡 Atenție · a apărut: 5,6% până la marginea de jos (0.06147) · cifrele sunt cele de atunci");
  assert.equal(C.deCeAfisat("din 🟢 Ține în 🟡 Atenție · a apărut: B", 35), "Verdictul s-a schimbat acum 35 min, din 🟢 Ține în 🟡 Atenție · a apărut: B", "fără cifre în motiv: fără „cifrele de atunci” (revizia)");
  assert.match(app, /cons\.deCeText=Consiliu\.deCeAfisat\(ck\.cons\.deCe,mn\)/);
  assert.match(fnApp("tbConsHtml"), /<h4>'\+\(c\.nivel==="asteapta"\?'De ce':'De ce '\+escapeHtml\(c\.eticheta\)\+\(c\.motive\.length\?': '\+TextRo\.cate\(c\.motive\.length,"motiv","motive"\)\+\(c\.motive\.length>1\?', cel mai important primul':''\)/);
});
await test("(B8) rândul șansei: cine socotește, „în k din n situații ca acum”, intervalul în cuvinte, calibrarea în cuvinte (fără „IC”, „necalibrat”, „≈ … independente”)", () => {
  const rez = { niveluri: { jos: 0.06147 }, iese: { jos24: { k: 62, n: 438, nIndep: 73, p: 0.14, ic: [0.08, 0.23], conditionat: true } } };
  const r = P.rand(rez, {}, "long");
  assert.equal(r, "🎲 Cazurile asemănătoare: atinge marginea de jos (0.06147) în 24 h în 14% din cazuri — în 62 din 438 de situații ca acum (doar ~73 diferite între ele, deci între 8% și 23%) · cât de bine nimeresc aceste procente: încă nu știu (niciun caz verificat)");
});

// ---------------- (A) semaforul trendului pe grafic ----------------
const rand5 = (n, pas, f) => Array.from({ length: n }, (_, i) => { const c = f(i); return { time: 1e12 + i * pas, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 10 }; });
const SUS = (pas) => rand5(200, pas, (i) => 1 + i * 0.002 + (i % 2 ? 0.0005 : -0.0005)), JOS = (pas) => rand5(200, pas, (i) => 2 - i * 0.002 + (i % 2 ? 0.0005 : -0.0005));
await test("(A1) GraficBot.semafor: 6 TF-uri în ordinea cerută; culoarea față de bot (long: urcă = bine, coboară = rău); fără bare = gol", () => {
  const s = GB.semafor({ "5M": SUS(3e5), "15M": JOS(9e5), "30M": SUS(1.8e6), "60M": JOS(3.6e6), "4H": SUS(1.44e7) }, "long");
  assert.deepEqual(s.map((x) => x.sc), ["5m", "15m", "30m", "1h", "4h", "1z"]);
  assert.deepEqual(s.map((x) => x.ton), ["bine", "rau", "bine", "rau", "bine", "gol"]);
  assert.match(s[1].text, /^↓ coboară de \d+ (de )?bare · ADX \d+ · RSI \d+ · împotriva botului long$/, s[1].text);
  assert.equal(s[5].text, "Pionex n-a dat lumânările la ultima cerere");
});
await test("(A2) aceeași regulă ca „Direcția” Tabloului (Directie.analizeaza pe bare închise)", () => {
  const r = JOS(9e5), s = GB.semafor({ "15M": r }, "short")[1], d = DR.analizeaza(r, 1, "short");
  assert.equal(s.dir, d.dir); assert.equal(s.vechime, d.vechime); assert.equal(s.ton, "bine");
});
await test("(A3) desenul: semaforul (6 becuri, cel al graficului încercuit), banda de trend pe toată istoria TF-ului, EMA umplut; fără semafor = graficul de azi", () => {
  const raw = GB.bare(SUS(3e5)).slice(-120), sem = GB.semafor({ "5M": SUS(3e5) }, "long");
  const o = { bare: raw, W: 1000, st: { ema: true }, simplu: true, niv: [], semafor: sem, tfGrafic: "5M", trendIstoric: SUS(3e5) };
  const d = GB.desen(o);
  assert.equal((d.svg.match(/class="gbSem"/g) || []).length, 6);
  assert.equal((d.svg.match(/r="13\.5"/g) || []).length, 1, "becul graficului încercuit o dată");
  assert.ok((d.svg.match(/class="gbTrend"/g) || []).length >= 110, "banda pe (aproape) toate barele: istoria lungă acoperă încălzirea de 60");
  assert.match(d.svg, /class="gbTrendEma"/); assert.match(d.legenda, /trend: urcă · coboară · lateral/);
  const fara = GB.desen(Object.assign({}, o, { semafor: null }));
  assert.doesNotMatch(fara.svg, /gbSem|gbTrend/);
});
await test("(A4) citirea: un rând pe TF (tf: true), iar rândul vechi „Direcția” iese cât e semaforul", () => {
  const raw = GB.bare(SUS(3e5)), sem = GB.semafor({ "5M": SUS(3e5) }, "long");
  const c = GB.citire({ bare: raw, semafor: sem, funding: null }, { directie: "long" }, null);
  assert.deepEqual(c.randuri.filter((x) => x.tf).map((x) => x.ce), ["5 min", "15 min", "30 min", "1 oră", "4 ore", "1 zi"]);
  assert.ok(!c.randuri.some((x) => x.ce === "Direcția"), "rândul vechi „Direcția” a rămas");
  assert.ok(GB.citire({ bare: raw, funding: null }, { directie: "long" }, null).randuri.some((x) => x.ce === "Direcția"), "fără semafor, „Direcția” rămâne");
});
await test("(A5) pagina: aduce și 5 min și 30 min; desenul primește semaforul, TF-ul graficului și istoria lui; citirea grupează rândurile TF", () => {
  assert.match(app, /var TB_SEM_EXTRA=\[\{tf:"5M"/);   /* revizia (R2): 5 și 30 min aduse separat, doar pentru semafor */
  assert.match(app, /semafor:tbSemaforTf\(b\),tfGrafic:TB_PERIOADE\[tbTf\(\)\]\.i,trendIstoric:tbTrendIstoric\(b\)/);   // v100.137: intervalul prin tbTf()
  // v100.111 (I-542, demo aprobat): pe Tablou, blocul de rânduri TF a devenit UN rând + tabelul de sub grafic (T212 își păstrează rândurile)
  assert.match(fnApp("tbDeseneazaCitire"), /GraficBot\.trendSumar\(tbSemaforTf\(b\)\)/);
  assert.match(citeste("public", "app.css"), /#t212 \.tbCitTf\{/);
});
// ---------------- revizia de cod (Opus, 06.10): 4 importante + minorele ieftine ----------------
await test("(R1) semaforul și banda nu arată trendul ALTEI monede: verifică simbolul; lumânările se pun o dată, la final, doar cele venite", () => {
  // v100.112 (I-553): regula stă în TabloTrend.stareSemafor / tura, probată pe comportament în proba-v100112 (553a, 553c)
  assert.match(fnApp("tbSemaforTf"), /TabloTrend\.stareSemafor\(d,tbCheieDir\(b\)\)/); assert.match(fnApp("tbTrendIstoric"), /d\.simbol!==tbCheieDir\(b\)/);
  const f = fnApp("tbAduDirectie");
  assert.doesNotMatch(f, /\(d\.randuriPe\|\|\(d\.randuriPe=\{\}\)\)/, "lumânările se scriau pe rând peste cele ale monedei vechi");
  assert.match(f, /d\.randuriPe=t\.pe;/); assert.match(f, /renderTabloGrafic\(\)/, "semaforul apare imediat, nu la următoarea redesenare");
});
await test("(R2) 5 min și 30 min doar pentru semafor: „Direcția pieței” și „Ce spun indicatorii” rămân pe cele 4 intervale de azi", () => {
  const i = app.indexOf("var TB_DIR_TF=["), lista = app.slice(i, app.indexOf("];", i));
  assert.doesNotMatch(lista, /"5M"|"30M"/); assert.equal((lista.match(/\{tf:/g) || []).length, 4);
  assert.match(app, /var TB_SEM_EXTRA=\[\{tf:"5M",limit:500\},\{tf:"30M",limit:500\}\];/);
});
await test("(R3) Discord: titlul nu se taie în cifra nouă - „TAKE · Atenție: marginea de jos e la −9,1%” (scurtDoi), iar titlul cu margine PRIMA încape cu ambele motive", () => {
  const c = consTake(), st1 = C.schimbare(null, Object.assign({}, c, { nivel: "tine" }), 1, "TAKE").stare, st2 = C.schimbare(st1, c, 2, "TAKE").stare, r = C.schimbare(st2, c, 3, "TAKE");
  assert.ok(r.alerta, "fără alertă");
  assert.ok(r.alerta.titlu.length <= 60 && !/…$/.test(r.alerta.titlu), r.alerta.titlu);
  assert.match(r.alerta.titlu, /^TAKE · Atenție: marginea de jos e la −9,1%/);
  const m = { cod: "margine", ton: "atentie", titlu: "Marginea de jos (0.3841) e cu 9,1% sub preț", pctJos: 9.08, zile: 23, text: "x", faCe: "" };
  const d = C.alcatuieste({ sm: { nivel: "atentie", cod: "x", motiv: "x", faCe: "" }, concret: [], sfaturi: [m, { cod: "costuri", ton: "atentie", titlu: "Costurile mănâncă grilele", text: "y", faCe: "" }], consilier: [], socoteala: {} });
  assert.equal(d.titlu, "Marginea de jos e la −9,1%, iar costurile mănâncă grilele");
});
await test("(R4) motivul trendului are cel mult un „;” și când direcția are deja nota barei de 4 h", () => {
  const sf = [{ cod: "directie", ton: "bine", titlu: "Piața e cu botul", rezumat: "Piața merge cu botul (4 ore urcă, 1 zi urcă); dar în bara de 4 ore de acum prețul scade cu 2,4%", text: "x" }, { cod: "trend", ton: "bine", titlu: "Trendul e cu botul (long, slab)", text: "" }];
  const c = C.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "nimic", faCe: "" }, concret: [], sfaturi: sf, consilier: [], socoteala: {} });
  const m = c.motive.find((x) => x.c === "v");
  assert.equal((m.text.match(/;/g) || []).length, 1, m.text); assert.match(m.text, /, iar mediile EMA arată long, slab\.$/);
});
await test("(m) minorele: starea modelelor stă lângă modele (nu lângă 🎲); „încă nu știm” cu „:”; „cifrele de atunci” doar când motivul are cifre; regimul își păstrează nota", () => {
  assert.match(citeste("public", "lib", "retea.js"), /c\.join\(" · "\) \+ " " \+ stareDoua\(vd, vda\) \+ \(z \?/);
  const c = C.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "x", faCe: "" }, concret: [], sfaturi: [{ cod: "costuri", ton: "atentie", titlu: "Costurile mănâncă grilele", text: "y", faCe: "" }], consilier: [], socoteala: { tine: { nume: "„Ține-l”", judecate: 4, stare: "necunoscut" } } });
  assert.match(c.incredere, /„Ține-l”: încă nu știm \(4 judecate\)\.$/, c.incredere);
  assert.equal(C.deCeAfisat("din 🟢 Ține în 🟡 Atenție", 5), "Verdictul s-a schimbat acum 5 min, din 🟢 Ține în 🟡 Atenție");
  const rez = { niveluri: { jos: 1 }, iese: { jos24: { k: 5, n: 40, nIndep: 12, p: 0.12, ic: [0.05, 0.3], nivel: "regim", stare: "miscare" } } };
  assert.match(P.rand(rez, {}, "long"), /40 de situații cu același regim \(mișcare, cu direcția de acum: prea puține\)/);
});

await test("(E) versiunea v100.106 peste tot", () => {
  assert.match(html, /content="v100\.1\d\d"/); assert.match(html, /id="sideVersiune"[^>]*>v100\.1\d\d/); assert.match(html, /id="antetVersiune">v100\.1\d\d/); assert.match(html, /id="healthAppVersion">v100\.1\d\d</);
  assert.match(JSON.parse(citeste("package.json")).version, /^100\.1\d\d\.0$/);
  assert.match(citeste("public", "sw.js"), /const CACHE="crypto-radar-v100-1\d\d";/);
});

console.log(`\n${teste - picate}/${teste} trec`);
if (picate) process.exit(1);
