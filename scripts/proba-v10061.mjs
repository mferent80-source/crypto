// Proba v100.61 (02.10, el: „revizuiește toate sfaturile … mai concise, profesioniste și mai optimizate”, stilul ales: „Concis, cu «Aș …»”).
// Specul docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md, pachetul 1: cifrele intr-un singur loc (TextRo), garda textelor
// (scripts/garda-texte.mjs) si Consilierul botilor rescris - titlul ≤ 60 cu cifra, „Ce aș face eu” ≤ 110 la persoana I, „de ce” separat.
// Sectiunile („sarcina N”) intra in fisier pe rand, fiecare inaintea codului ei (planul 2026-10-02-sfaturi-pachetul-1-consilier-boti.md).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const TR = globalThis.TextRo;
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.61 · Sfaturile concise: TextRo, garda textelor, Consilierul botilor · proba\n");

// ---- sarcina 1: TextRo si incarcarea lui ----
await test("TextRo: virgula, minusul „−”, zero fara semn, unitati; o valoare lipsa iese „—”, niciodata „NaN%”", () => {
  const c = [[TR.num(12.44), "12,4"], [TR.num(-0.84), "−0,8"], [TR.num(-0.04), "0,0"], [TR.num(null), "—"], [TR.num(NaN), "—"], [TR.num("3.5"), "3,5"], [TR.num(Infinity), "—"],
    [TR.pct(12.44), "12,4%"], [TR.pct(null), "—"], [TR.pct(-0.84), "−0,8%"], [TR.pct(0.06, 3), "0,060%"],
    [TR.pctSemn(1.24), "+1,2%"], [TR.pctSemn(-0.84), "−0,8%"], [TR.pctSemn(0.04), "0,0%"], [TR.pctSemn(0), "0,0%"],
    [TR.ori(1.74), "1,7×"], [TR.usdt(8.5), "+8,50 USDT"], [TR.usdt(-8.5), "−8,50 USDT"], [TR.usdt(0), "0,00 USDT"], [TR.usdt(-0.004), "0,00 USDT"], [TR.usdt(-10.24, 1), "−10,2 USDT"], [TR.usdt(undefined), "—"],
    [TR.lei(1234.4), "1.234 lei"], [TR.lei(-1234567), "−1.234.567 lei"], [TR.lei(5, true), "+5 lei"], [TR.lei(0.4, true), "0 lei"],
    [TR.ore(45 * 60000), "45 min"], [TR.ore(3600000), "1 h"], [TR.ore(5.25 * 3600000), "5,3 h"], [TR.ore(59.6 * 60000), "1 h"], [TR.ore(20000), "1 min"], [TR.ore(-1), "—"], [TR.num(2.1, 2), "2,10"]];
  for (const [a, b] of c) assert.equal(a, b);
});
await test("RF4: fiecare proba care incarca semnale-bot.js / consiliu.js incarca intai TextRo; pagina si colectorul il incarca inaintea lor; e in APP_SHELL", () => {
  const dir = path.join(RAD, "scripts"), lipsa = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && f !== "colector.mjs" && f !== "garda-texte.mjs")
    .filter((f) => { const s = fs.readFileSync(path.join(dir, f), "utf8"); return /semnale-bot\.js|consiliu\.js/.test(s) && !s.includes('import "./lib/text-ro-global.mjs";'); });
  assert.deepEqual(lipsa, [], "probe fara TextRo: " + lipsa.join(", "));
  const html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), sw = fs.readFileSync(path.join(RAD, "public", "sw.js"), "utf8"), col = fs.readFileSync(path.join(RAD, "scripts", "colector.mjs"), "utf8");
  const i = html.indexOf('<script src="/lib/text-ro.js"></script>');
  assert.ok(i > 0 && i < html.indexOf('<script src="/lib/semnale-bot.js">') && i < html.indexOf('<script src="/lib/consiliu.js">'), "pagina: text-ro.js inaintea modulelor");
  assert.match(sw, /"\/lib\/text-ro\.js"/);
  const j = col.indexOf('incarca("text-ro.js", "TextRo")'); assert.ok(j > 0 && j < col.indexOf('"semnale-bot.js"') && j < col.indexOf('"consiliu.js"'), "colectorul: text-ro.js primul");
});

// ---- sarcina 2: garda textelor ----
const G = await import("./garda-texte.mjs");
await test("garda: prinde fiecare abatere de la reguli (zecimala cu punct, minus ASCII, lungimi, persoana I, doua fraze, avertizarea comuna, vocabularul, titlul repetat)", () => {
  const are = (t, tip, ce, frate) => assert.ok(G.verifica(t, tip, frate).some((x) => x.includes(ce)), JSON.stringify([t, G.verifica(t, tip, frate)]));
  are("lichidarea e la 12.4%", "titlu", "zecimală cu punct");
  are("pierderea: -3,0 USDT", "detalii", "minus ASCII");
  are("x".repeat(61), "titlu", "lung");
  are("Aș " + "x".repeat(110), "faCe", "lung");
  are("Ieși acum, cum ai hotărât.", "faCe", "persoana I");
  are("Aș închide botul. Apoi aș porni altul.", "faCe", "o frază");
  are("Pe 30 de zile a făcut 30%. O frecvență din trecut, nu o promisiune.", "deCe", "avertizarea comună");
  are("Aș muta opritorul la 0.38.", "faCe", "opritor");
  are("Aș muta gridul cu setările propuse mai jos.", "faCe", "trimitere");
  are("Lichidarea e la 12,4% și se îndepărtează de preț", "deCe", "repetă titlul", "lichidarea e la 12,4% și se îndepărtează");
  are("a\nb\nc", "discordMesaj", "rânduri");
  assert.deepEqual(G.verifica("Aș muta stopul la 0.3842 (zero-ul botului, +1,2% de preț): câștigul nu se mai pierde.", "faCe"), []);
  assert.deepEqual(G.verifica("lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h)", "titlu"), []);
});
await test("garda: textele pachetelor STRICTE trec toate regulile (pe situatiile lui)", () => {
  const rele = G.situatii().filter((x) => G.STRICT.has(x.mod)).map((x) => ({ ...x, ab: G.verifica(x.text, x.tip, x.frate) })).filter((x) => x.ab.length);
  assert.equal(rele.length, 0, rele.slice(0, 5).map((x) => x.sit + " · " + x.sursa + ": " + x.ab.join("; ") + " — " + x.text).join("\n"));
});

// ---- sarcina 3: semaforul ----
const S = globalThis.SemnaleBot, T = globalThis.TabloExtra, C = globalThis.Consiliu;
const fisa = { dir: "long", directie: { dir: "long", tarie: "mediu", motive: [] }, regim: { r4h: 0.6, r24h: 0.8, miscare: false }, setare: { jos: 0.5459, sus: 0.6279, grile: 6, pas: 0.0236, levier: 5, dir: "long", stop: { jos: 0.52, sus: 0.66 } }, propusa: "aleasa" };
const CRV = (o) => ({ directie: "long", investit: 49.67, profitTotal: -3.2, pretCurent: 0.3907, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 12.4, ...o });
const lich = (sm) => (sm.componente || []).find((k) => k.cod === "lichidare");
await test("lichidarea pe exemplul din spec: „Lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h)”, fara actiune proprie; se apropie -> actiunea cu conditia; sub 8% -> IEȘI", () => {
  assert.ok(G.STRICT.has("semafor"), "semaforul trece pe strict");
  const d = lich(S.semafor({ bot: CRV(), fisa, distInainte: 11.2 }));
  assert.equal(d.motiv, "lichidarea la 12,4% · se îndepărtează (11,2% acum 1 h)"); assert.equal(d.faCe, ""); assert.equal(d.faCeSlab, "N-aș face nimic acum, doar n-aș adăuga poziție până trece de 15%.");
  const a = lich(S.semafor({ bot: CRV(), fisa, distInainte: 13.6 }));
  assert.equal(a.motiv, "lichidarea la 12,4% · se apropie (13,6% acum 1 h)"); assert.equal(a.faCe, "N-aș mări poziția; dacă scade sub 8%, aș adăuga marjă.");
  const i = S.semafor({ bot: CRV({ distantaLichidarePct: 6 }), fisa });
  assert.equal(i.nivel, "iesi"); assert.equal(i.motiv, "lichidarea la 6,0%"); assert.equal(i.faCe, "Aș adăuga marjă sau aș închide botul acum."); assert.equal(i.deCe, "Sub 8% nu mai e loc de răbdare.");
});
await test("„mută gridul”: titlul = distanta + pozitia; pragul si frecventa in „de ce”; sursa profilului pe randul ei", () => {
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV: 183 de zile de bare de 1 h", frecventa: () => 0.27 };
  const m = S.mutaGridul({ directie: "long", pretCurent: 0.575, gridJos: 0.5722, gridSus: 0.6572 }, fisa, 0, pm);
  assert.equal(m.motiv, "prețul la 0,5% de marginea de jos (3,3% din interval)");
  assert.equal(m.deCe, "În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%, plafonat la 15% din interval).");
  assert.equal(m.sursa, "profilul CRV: 183 de zile de bare de 1 h");
  const k = S.semafor({ bot: { directie: "long", pretCurent: 0.575, gridJos: 0.5722, gridSus: 0.6572, distantaLichidarePct: 30 }, fisa, muta: m }).componente.find((x) => x.cod === "muta");
  assert.equal(k.deCe, m.deCe); assert.equal(k.sursa, m.sursa); assert.equal(k.faCe, "Aș muta gridul: închid botul și pornesc cu setările din cartela Gridul.");
});
await test("RF1: „ținta” ramane in motivul planului atins pe plus - podeaPeBani gaseste prima „țintă atinsă” in jurnal", () => {
  const sm = S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa: { ...fisa, regim: { r4h: 2, r24h: 2, miscare: true, sens: "coboara" } }, plan: { atins: ["plus"], plus: { prag: 5 } } });
  assert.equal(sm.cod, "plan"); assert.match(sm.motiv, /ținta/);
  const log = S.noteaza([], sm, 5.4, 1000), p = S.podeaPeBani(log, 6.1);
  assert.ok(p && Math.abs(p.dif - 0.7) < 1e-9, JSON.stringify(p));
});

// ---- sarcina 4: cartelele „Acum, concret” ----
const LIGHTER = (o) => ({ id: "2390", baza: "LIGHTER.PERP", directie: "long", levier: 5, investit: 103.38, activ: true, pozitie: 56, pretDeschidere: 4.484, pretCurent: 4.473, profitNet: -0.126, profitTotal: -0.74, pnlNerealizatSigur: true,
  gridJos: 4.085, gridSus: 4.837, pretLichidare: 3.49, distantaLichidarePct: 22.56, opritorPierdere: 3.787, opritorPierdereActiv: true, opritorPierdereTip: "pret", opritorPierdereRaport: null,
  brut: { buOrderData: { row: 16, perVolume: "7", gridType: "geometric" } }, ...o });
const T0 = Date.UTC(2026, 8, 29, 13, 34), PLAN_L = () => T.planStare(LIGHTER(), { plus: 5.5, minus: 15.7, afaraOre: 12 }, {}, T0);
const conL = () => S.acumConcret({ bot: LIGHTER(), fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, plan: PLAN_L(), acum: T0, bani: { stop: { laOpritor: -63.5, laPropus: -15.7, frecventa: 0.71, pretPropus: 4.2601 } } });
await test("LIGHTER (stopul peste plan): cartela Stopul spune actiunea si costul intr-un rand, „de ce” separat", () => {
  assert.ok(G.STRICT.has("cartele"), "cartelele trec pe strict");
  const st = conL().find((x) => x.cod === "stop");
  assert.equal(st.act, "Aș muta stopul la 4.2601 (în procente: −15,2% din investiție): atins acum, te costă ≈ 63 USDT, nu 15,7.");
  assert.equal(st.deCe, "Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe."); assert.equal(st.atins < -60, true);
});
await test("pagina: cartela Stopul arata „de ce” si sursa stopului propus, fiecare pe randul lui", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(app, /x\.deCe\?'<p class="tbSub tbCcDeCe">'/); assert.match(app, /x\.sursa\?'<p class="tbSub tbCcSursa">'/);
});

// ---- sarcina 5: Consilierul ----
await test("LIGHTER: Consilierul - titlul scurt, o singura actiune, „de ce” sub ea, motivul stopului cu cifra", () => {
  const c = C.alcatuieste({ sm: S.semafor({ bot: LIGHTER(), fisa: { regim: { r4h: 0.5, r24h: 0.5, miscare: false } }, plan: PLAN_L() }), concret: conL(), sfaturi: [], opritor: 3.787 });
  assert.equal(c.titlu, "Stopul costă peste plan"); assert.equal(c.faCe, "Aș lăsa stopul la 3.787 și aș trece planul la −64 USDT.");
  assert.equal(c.explica, "Stopul planului (4.2601) e prea aproape: o zi obișnuită a monedei ajunge acolo în 71% din zile.");
  assert.match(c.motive[0].titlu, /^Stopul e peste plan: atins, ≈ −6\d USDT$/); assert.equal(c.motive[0].text, "Planul tău zice −15,7 USDT; stopul de la 3.787 stă mult mai departe.");
});
await test("RF2: titlul Consilierului din doua motive lungi nu trece de 60 - ramane primul (al doilea e chiar dedesubt)", () => {
  const sm = { nivel: "atentie", cod: "lichidare", motiv: "lichidarea la 12,4% · se apropie (13,6% acum 1 h)", faCe: "N-aș mări poziția.", componente: [
    { nivel: "atentie", cod: "lichidare", motiv: "lichidarea la 12,4% · se apropie (13,6% acum 1 h)", faCe: "N-aș mări poziția." },
    { nivel: "atentie", cod: "trend", motiv: "trendul e împotriva botului (short, tare)", faCe: "N-aș adăuga bani." }] };
  const c = C.alcatuieste({ sm, concret: [], sfaturi: [] });
  assert.ok(c.titlu.length <= 60, c.titlu); assert.equal(c.titlu, "Lichidarea la 12,4% · se apropie (13,6% acum 1 h)");
  assert.equal(c.motive[1].titlu, "Trendul e împotriva botului (short, tare)");
});
await test("RF5: Discord - titlul ≤ 60 si cu o moneda lunga si un titlu lung (rezerva: motivul pe scurt, apoi taiat la cuvant); mesajul pe cel mult 2 randuri", () => {
  const lung = { nivel: "atentie", eticheta: "🟡 Atenție", titlu: "Lichidarea la 12,4% · se apropie (13,6% acum 1 h), iar trendul", faCe: "N-aș mări poziția.", bani: null,
    motive: [{ cod: "lichidare", c: "g", titlu: "Lichidarea la 12,4% · se apropie (13,6% acum 1 h)", scurt: "lichidarea la 12,4%" }] };
  let st = C.schimbare({}, { ...lung, nivel: "tine", eticheta: "🟢 Ține", motive: [] }, 1, "1000BONK").stare;
  st = C.schimbare(st, lung, 2, "1000BONK").stare; const al = C.schimbare(st, lung, 3, "1000BONK").alerta;
  assert.ok(al && al.titlu.length <= 60, al && al.titlu); assert.equal(al.titlu, "1000BONK · Atenție: lichidarea la 12,4%");
  assert.ok(al.mesaj.split("\n").length <= 2, al.mesaj); assert.match(al.mesaj, /^👉 N-aș mări poziția\./);
});
await test("pagina: „de ce” sub „Ce aș face eu”, legenda comuna (avertizarile, o data) sub Consilier; pachetul 1 e strict intreg", () => {
  const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8");
  assert.match(app, /c\.explica\?'<p class="tbSub tbConsExplica">'/); assert.match(app, /Consiliu\.LEGENDA\?'<p class="tbSub tbConsLeg">'/);
  assert.match(C.LEGENDA, /nu sunt promisiuni/); assert.match(C.LEGENDA, /puține cazuri/); assert.match(C.LEGENDA, /cumpără înapoi la fiecare grilă/);
  for (const m of ["semafor", "cartele", "consiliu"]) assert.ok(G.STRICT.has(m), "nestrict: " + m);
});

// ---- revizia (pozele pe datele lui + revizia Opus, 02.10) ----
await test("F1 (poza 1440/1920, CRV la 4,5%): verdictul vechi „Ieși” pentru lichidare nu dubleaza semaforul - un motiv, actiunea semaforului, fara „n-aș pune bani” lipit de „aș adăuga marjă”; starea Pionex: faptul in titlu, actiunea la persoana I", () => {
  const c = C.alcatuieste({ sm: S.semafor({ bot: CRV({ distantaLichidarePct: 4.5 }), fisa }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Mai sunt 4.5% până la lichidare." } });
  assert.equal(c.nivel, "iesi"); assert.ok(!c.motive.some((m) => m.cod === "opreste"), JSON.stringify(c.motive.map((m) => m.titlu)));
  assert.equal(c.titlu, "Lichidarea la 4,5%"); assert.equal(c.faCe, "Aș adăuga marjă sau aș închide botul acum.");
  const lm = C.alcatuieste({ sm: S.semafor({ bot: CRV({ distantaLichidarePct: 4.5 }), fisa }), concret: [], opreste: { titlu: "Ieși", ceFac: "Mai sunt 4.5% până la lichidare." },
    sfaturi: [{ cod: "margine", ton: "atentie", titlu: "Până la marginea de jos (0.3841) sunt 1.7%", text: "Acolo totalul ar fi în jur de −7,34 USDT.", faCe: "" }] });
  assert.equal(lm.faCe, "Aș adăuga marjă sau aș închide botul acum.", "langa margine: nu se lipeste „n-aș pune bani în plus” de o iesire");
  const p = C.alcatuieste({ sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează marginea contului ca MARGIN_CALL, nu NORMAL." } });
  assert.equal(p.nivel, "iesi"); assert.equal(p.motive[0].cod, "opreste"); assert.equal(p.motive[0].titlu, "Pionex: marginea contului e MARGIN_CALL"); assert.equal(p.faCe, "Aș adăuga marjă sau aș închide botul acum.");
  const r = C.alcatuieste({ sm: S.semafor({ bot: CRV({ distantaLichidarePct: 30 }), fisa }), concret: [], sfaturi: [], opreste: { titlu: "Ieși", ceFac: "Pionex raportează starea de risc ca REDUCE_ONLY, nu TRADING." } });
  assert.equal(r.motive[0].titlu, "Pionex: starea de risc e REDUCE_ONLY"); assert.equal(r.faCe, "Aș închide botul acum, după ce verific starea lui în Pionex.");
});
await test("R1 (Opus I1): „mută gridul” contopit cu sfatul „margine” isi pastreaza „de ce”-ul (frecventa, pragul) si sursa", () => {
  const pm = { jos: 0.03, sus: 0.03, sursa: "profilul CRV: 183 de zile de bare de 1 h", frecventa: () => 0.27 };
  const b = { directie: "long", pretCurent: 0.575, gridJos: 0.5722, gridSus: 0.6572, distantaLichidarePct: 30 };
  const m = S.mutaGridul(b, fisa, 0, pm);
  const c = C.alcatuieste({ sm: S.semafor({ bot: b, fisa, muta: m }), concret: [], sfaturi: [{ cod: "margine", ton: "atentie", titlu: "Până la marginea de jos (0.5722) sunt 0.5%", text: "Acolo totalul ar fi în jur de −7,34 USDT.", faCe: "" }] });
  const mg = c.motive.find((x) => x.cod === "margine");
  assert.ok(mg, JSON.stringify(c.motive.map((x) => x.cod)));
  assert.ok((mg.extra || "").includes(m.deCe), "lipseste de ce-ul: " + mg.extra); assert.ok((mg.extra || "").includes("profilul CRV"), mg.extra);
});
await test("R2 (Opus I2): „de ce”-ul ajunge si in afara Tabloului - poza pentru pagina alerts (Consilierul si semaforul), alertele „semaforul zice IEȘI” si „mută gridul”", async () => {
  const p = C.pentruPoza({ nivel: "atentie", titlu: "Stopul costă peste plan", faCe: "Aș lăsa stopul la 0.38 și aș trece planul la −10 USDT.", explica: "Stopul planului (0.3842) e prea aproape: o zi obișnuită a monedei ajunge acolo în 71% din zile.", bani: "pierderea maximă: −10,2 USDT", motive: [] });
  assert.match(p.faCe, /în 71% din zile/); assert.match(p.faCe, /💰 pierderea maximă/);
  const { construiestePoza } = await import(new URL("./lib/poza.mjs", import.meta.url).href);
  const z = construiestePoza({ acum: T0, versiune: "t", boti: [{ id: "1", baza: "CRV.PERP", directie: "long", semafor: { nivel: "iesi", cod: "lichidare", motiv: "lichidarea la 6,0%", faCe: "Aș adăuga marjă sau aș închide botul acum.", deCe: "Sub 8% nu mai e loc de răbdare.", componente: [] } }] });
  assert.match(z.boti[0].sfat, /Sub 8% nu mai e loc de răbdare/);
  const A = new Function(fs.readFileSync(path.join(RAD, "public", "lib", "alerte.js"), "utf8") + "; return Alerte;")();
  const bot = { id: "1", baza: "CRV.PERP", directie: "long", activ: true, pretCurent: 0.39, gridJos: 0.38, gridSus: 0.43, investit: 50, profitTotal: -1 };
  const muta = { motiv: "prețul la 0,5% de marginea de jos (3,3% din interval)", deCe: "În 12 h moneda a ajuns atât de departe în 27% din jumătățile de zi (prag 2,2%).", setare: { jos: 0.37, sus: 0.42, grile: 9, levier: 5 }, des: false, treceriZi: 3 };
  const out = A.reguli(bot, { semnale: { semafor: { nivel: "iesi", cod: "lichidare", motiv: "lichidarea la 6,0%", faCe: "Aș adăuga marjă sau aș închide botul acum.", deCe: "Sub 8% nu mai e loc de răbdare.", componente: [] }, muta } }, {});
  assert.match(out["s-iesi"].mesaj, /Sub 8% nu mai e loc de răbdare/); assert.match(out["s-muta"].mesaj, /în 27% din jumătățile de zi/);
});
await test("R4 (Opus I4): valorile planului cu virgula (−7,5 / +5,5) in motive, in podea si pe cartela; „≈ 0 USDT”, nu „≈ −0 USDT”", () => {
  assert.equal(S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa, plan: { atins: ["minus"], minus: { prag: 7.5 } } }).motiv, "planul tău: pragul de −7,5 USDT e atins");
  assert.equal(S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa: { ...fisa, regim: { r4h: 2, r24h: 2, miscare: true, sens: "coboara" } }, plan: { atins: ["plus"], plus: { prag: 5.5 } } }).motiv, "planul tău: ținta de +5,5 USDT e atinsă");
  const vvv = (o) => ({ directie: "long", pretCurent: 30.77, gridJos: 25, gridSus: 33, investit: 96.6, profitTotal: 6.2, profitNet: 3.2, pozitie: 5.9, pretDeschidere: 30.1, pnlNerealizatSigur: true, distantaLichidarePct: 30, opritorPierdereActiv: true, opritorPierdere: 26.633, ...o });
  const pd = S.semafor({ bot: vvv(), fisa: { regim: { r4h: 0.5, r24h: 0.5, miscare: false } }, plan: T.planStare(vvv(), { plus: 5.5, minus: 14 }, {}, 0) });
  assert.equal(pd.cod, "podea"); assert.match(pd.motiv, /\+5,5 USDT/); assert.ok(!/5\.5/.test(pd.motiv + pd.faCe + pd.deCe), pd.motiv + " | " + pd.faCe);
  const c = S.acumConcret({ bot: { ...LIGHTER(), opritorPierdere: 4.4, opritorPierdereActiv: true }, fisa: null, zero: T.dacaInchizi(LIGHTER()), costuri: null, acum: T0,
    plan: { atins: [], minus: { prag: 0.3, laOpritor: -0.3, opritorPlan: 4.39 } } }).find((x) => x.cod === "stop");
  assert.ok(!/−0 USDT/.test(c.mic + " " + c.act), c.mic + " | " + c.act); assert.match(c.mic, /atins ≈ 0 USDT/);
});
await test("R6 (Opus M1): randurile noi de pe ecran castiga in fata lui #tabloubot .tbSub (14px) - „de ce” mai mic decat actiunea, legenda la 12px si departe de chenar", () => {
  const css = fs.readFileSync(path.join(RAD, "public", "app.css"), "utf8");
  assert.match(css, /#tabloubot \.tbCcDeCe,#tabloubot \.tbCcSursa\{margin:4px 0 0;font-size:12\.5px\}/);
  assert.match(css, /#tabloubot \.tbConsExplica\{font-size:13px\}/);
  assert.match(css, /#tabloubot \.tbConsLeg\{margin:0;padding:10px 18px 14px;font-size:12px;line-height:1\.45\}/);
});
await test("R7 (Opus M2): legenda nu spune un prag gresit pentru „(puține cazuri)” (sfaturile il pun sub 30, altele sub 10)", () => {
  assert.ok(!/sub 10/.test(C.LEGENDA), C.LEGENDA); assert.match(C.LEGENDA, /„\(puține cazuri\)” înseamnă prea puține date: un semn, nu o regulă/);
});
await test("R8 (Opus M5): nicio informatie pierduta - fereastra open interest, „doar”, stopul dincolo de zero dupa margine, „sub jumătate”", () => {
  const ag = S.aglomerare({ funding: 0.0006, longShort: 2.1, oiHist5m: [{ sumOpenInterest: 100 }, { sumOpenInterest: 120 }] }, "long");
  assert.match(ag.dovezi, /open interest \+20,0% în ultimele ore/); assert.match(ag.text, /open interest \+20,0% în ultimele ore/);
  const ip = S.semafor({ bot: CRV({ distantaLichidarePct: 40, profitTotal: 5 }), fisa, iaProfit: { nivel: "atentie", total: 5, proc: 0.1, deCe: "x", text: "x" } }).componente.find((k) => k.cod === "ia-profit");
  assert.equal(ip.faCe, "Aș închide botul pe plus și aș reporni doar când fișa zice iar 🟢.");
  const cb = S.semafor({ bot: { directie: "long", pretCurent: 34, gridJos: 25, gridSus: 33, profitTotal: 1, investit: 100, distantaLichidarePct: 30, opritorPierdereActiv: true, opritorPierdere: 29 }, fisa: { regim: { r4h: 3, r24h: 3, miscare: true, sens: "urca" } }, zero: { pretZero: 28.5 } });
  assert.equal(cb.cod, "cu-botul"); assert.match(cb.deCe, /stopul \(29\) e deja dincolo de zero/);
  const pe = C.alcatuieste({ sm: S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa }), concret: [], sfaturi: [], perechi: { real: 1.2, est: 4, raport: 0.3, fereastra: "în ultimele 30 h" } });
  assert.equal(pe.titlu, "Gridul încheie sub jumătate din perechi");
});
await test("R9 (Opus M8): costurile de sub un cent pe zi nu ies „0,00 USDT net/zi”", () => {
  const k = S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa, costuri: { netZi: -0.004 } }).componente.find((x) => x.cod === "costuri");
  assert.equal(k.motiv, "costurile pe zi depășesc grilele: −0,004 USDT net/zi");
});
await test("R10 (poza 390 px): serverul pastreaza din semnalele colectorului si cifrele BTC / aglomerare - Tabloul scrie titlul cu cifra, ca Discord-ul", async () => {
  const mod = await import(pathToFileURL(path.join(RAD, "functions", "api", "istoric-bot.js")).href);
  const kv = new Map(), env = { APP_API_TOKEN: "t", ISTORIC: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } };
  const cer = (m, q, corp) => new Request("http://127.0.0.1:8788/api/istoric-bot?" + q, { method: m, headers: { authorization: "Bearer t", "content-type": "application/json", origin: "http://127.0.0.1:8788" }, body: corp ? JSON.stringify(corp) : undefined });
  const btc = S.btcAvertizare({ miscare: true, r4h: 3.6, r24h: 1.2 }, { miscare: false }), ag = S.aglomerare({ funding: 0.0006, longShort: 2.1, oiHist5m: [{ sumOpenInterest: 100 }, { sumOpenInterest: 120 }] }, "long");
  const r = await mod.onRequestPost({ request: cer("POST", "action=semnale", { bot: "2394", log: [], acum: { la: T0, btc, aglomerare: ag, afaraOre: 0 } }), env });
  assert.equal(r.status, 200, await r.clone().text());
  const g = await (await mod.onRequestGet({ request: cer("GET", "action=semnale&bot=2394"), env })).json(), a = g.semnale.acum;
  assert.equal(a.btc.r, 3.6); assert.equal(a.aglomerare.semne, 3); assert.match(a.aglomerare.dovezi, /open interest \+20,0% în ultimele ore/);
  const k = S.semafor({ bot: CRV({ distantaLichidarePct: 40 }), fisa, btc: a.btc }).componente.find((x) => x.cod === "btc");
  assert.equal(k.motiv, "BTC în mișcare (3,6× față de obișnuit), moneda încă nu");
});
await test("F2 (proba de ecran, piata in miscare): varianta ingusta respinsa devreme spune tot pe cate zile - fisa nu mai scrie „pe undefined de zile”", () => {
  const GP = new Function("GridCalcul", fs.readFileSync(path.join(RAD, "public", "lib", "grid-proba.js"), "utf8") + "; return GridProba;")(globalThis.GridCalcul);
  const bare = (zile) => Array.from({ length: zile * 96 }, (_, i) => ({ t: i * 900000, o: 100, h: 100.5, l: 99.5, c: 100 }));
  assert.equal(GP.ingust(bare(30), { miscare: true, dir: "long" }).zile, 30);
  assert.equal(GP.ingust(bare(30), { dir: "nicio" }).zile, 30);
  assert.equal(GP.ingust(bare(5), { dir: "long" }).zile, 5);
  assert.match(fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), /r\.zile\?"pe "\+r\.zile\+" de zile — mai puține ferestre"/);
});
await test("F3 (proba de ecran pe telefon, CRV iesit din grid): botul fara pozitie - calculatorul de marja spune asta, nu „Scrie o sumă mai mare ca 0.”", () => {
  assert.match(fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), /!\(grNumar\(v\)>0\)\?"Scrie o sumă mai mare ca 0\.":"Acum botul n-are poziție/);
  assert.match(fs.readFileSync(path.join(RAD, "scripts", "proba-ecran-grid.mjs"), "utf8"), /Cu \\\+20 USDT marjă\|n-are poziție/);
});

console.log(`\nV100.61 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
