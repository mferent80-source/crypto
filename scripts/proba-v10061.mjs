// Proba v100.61 (02.10, el: „revizuiește toate sfaturile … mai concise, profesioniste și mai optimizate”, stilul ales: „Concis, cu «Aș …»”).
// Specul docs/superpowers/specs/2026-10-02-sfaturi-concise-design.md, pachetul 1: cifrele intr-un singur loc (TextRo), garda textelor
// (scripts/garda-texte.mjs) si Consilierul botilor rescris - titlul ≤ 60 cu cifra, „Ce aș face eu” ≤ 110 la persoana I, „de ce” separat.
// Sectiunile („sarcina N”) intra in fisier pe rand, fiecare inaintea codului ei (planul 2026-10-02-sfaturi-pachetul-1-consilier-boti.md).
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

console.log(`\nV100.61 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
