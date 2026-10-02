// Proba v100.44 (01.10, el: „ok” pe demo-ul Consilierului unic, I-465 - https://claude.ai/artifact/WCR9sU71NPq8sDPugXVsdS).
// Pe datele reale (CRV, 30.09 ~23:10) Tabloul zicea „🟢 ȚINE — nimic nu cere o mișcare” peste cartela Stopul rosie „peste plan”,
// iar fisa zicea „trend long, tare” langa „Direcția pieței: laterală”. Consiliu.alcatuieste aduna TOATE sursele intr-un verdict,
// o actiune cu bani, 3 motive dupa banii in joc (cu increderea masurata) si restul pliat - fara sa se piarda vreun sfat.
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const lib = (f) => fs.readFileSync(path.join(RAD, "public", "lib", f), "utf8");
const G = new Function(`${lib("grid-calcul.js")}; return GridCalcul;`)(); globalThis.GridCalcul = G;
const SB = new Function(`${lib("semnale-bot.js")}; return SemnaleBot;`)(); globalThis.SemnaleBot = SB;
let CS = null; try { CS = new Function(`${lib("consiliu.js")}; return Consiliu;`)(); } catch (e) { CS = null; }
const FX = JSON.parse(fs.readFileSync(new URL("./fixturi/consilier-crv-2026-09-30.json", import.meta.url), "utf8"));
const app = fs.readFileSync(path.join(RAD, "public", "app.js"), "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8");

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}
console.log("\nV100.44 · Consilierul unic pe Tablou (I-465), ca in demo · proba\n");
const intrare = () => ({ sm: FX.semafor, concret: FX.concret, sfaturi: FX.sfaturi, consilier: FX.consilier, socoteala: FX.socoteala, laJos: FX.laJos, opritor: FX.opritor, indicatori: FX.indicatori, btc: FX.btc });

await test("CRV real: verdictul ia in seama TOATE sursele - 🟡 ATENȚIE (nu „ȚINE” peste un stop rosu), cu titlul din primele doua motive", () => {
  assert.ok(CS && typeof CS.alcatuieste === "function", "lipseste Consiliu.alcatuieste");
  const c = CS.alcatuieste(intrare());
  assert.equal(c.nivel, "atentie"); assert.match(c.eticheta, /Atenție/);
  assert.match(c.titlu, /^Stopul te costă mai mult decât planul, iar prețul stă lângă marginea de jos$/, c.titlu);
});

await test("CRV real: 3 motive dupa banii in joc - stopul (rosu), marginea de jos (galben, cu „Mută gridul” 7 din 10), piata linistita si laterala (verde, UN singur trend)", () => {
  const c = CS.alcatuieste(intrare());
  assert.deepEqual(c.motive.map((m) => m.c), ["r", "g", "v"]);
  assert.match(c.motive[0].titlu, /Stopul e peste plan/); assert.match(c.motive[0].text, /10/);
  assert.match(c.motive[1].titlu, /până la marginea de jos/); assert.match(c.motive[1].cip.t, /„Mută gridul” 7 din 10/);
  assert.match(c.motive[2].titlu, /Piața e liniștită și laterală/); assert.match(c.motive[2].text, /o singură măsură/);
  assert.match(c.motive[2].text, /structura pe medii: long, tare/, "fisa nu mai e un trend separat, e structura");
  assert.equal(c.motive[0].cip.t, "încă nu știm", "„Planul tău”: 9 judecate, sub 10");
});

await test("„Ce aș face eu” cu bani: stopul planului e atins intr-o zi obisnuita in ~3 din 4 zile -> las stopul si trec planul la cat costa stopul", () => {
  const c = CS.alcatuieste(intrare());
  assert.match(c.faCe, /Aș lăsa stopul la 0\.38 și aș trece planul la −10 USDT/, c.faCe);
  assert.match(c.faCe, /în 71% din zile/); assert.match(c.faCe, /\(0\.3842\)/); assert.doesNotMatch(c.faCe, /\d\.\d{6,}/, "pret neformatat"); assert.match(c.faCe, /n-aș pune bani în plus/);
  assert.match(c.bani, /−10,2/); assert.match(c.bani, /−7,5/); assert.match(c.bani, /marginea de jos: −7,3/);
  assert.match(c.incredere, /Semaforul singur zicea „ȚINE”/); assert.match(c.incredere, /10 din 21/);
});

await test("nimic pierdut: fiecare sfat de azi (in afara de trend, contopit) e in motive sau in „Restul”, plus consilierul, indicatorii si BTC", () => {
  const c = CS.alcatuieste(intrare()), tot = c.motive.map((m) => m.titlu + " " + m.text).concat(c.rest.map((r) => r.titlu + " " + (r.text || ""))).join(" | ");
  for (const s of FX.sfaturi) {
    if (s.cod === "trend" || s.cod === "directie" || s.cod === "liniste") continue;   // contopite in motivul „Piața” (verificat mai sus)
    if (s.cod === "margine") { assert.ok(tot.includes("până la marginea de jos (0.3841)") && tot.includes(s.text), "lipseste marginea"); continue; }   // titlul rescris cu cifra intai
    assert.ok(tot.includes(s.titlu), "lipseste: " + s.titlu);
  }
  for (const k of FX.consilier) assert.ok(tot.includes(k.titlu), "lipseste consilierul: " + k.titlu);
  assert.ok(tot.includes("Indicatorii:")); assert.ok(tot.includes("BTC"));
  assert.equal(c.rest.length, 5, c.rest.map((r) => r.titlu).join(" / "));
});

await test("fara nimic de facut: verdictul ramane al semaforului (ȚINE), cu motivele verzi; fara fisa - SOCOTESC", () => {
  const c = CS.alcatuieste({ sm: { nivel: "tine", cod: "tine", motiv: "nimic nu cere o mișcare acum", faCe: "L-aș lăsa să lucreze.", componente: [] }, concret: [], sfaturi: [FX.sfaturi[4], FX.sfaturi[5]], consilier: [], socoteala: null });
  assert.equal(c.nivel, "tine"); assert.match(c.titlu, /Nimic nu cere o mișcare acum/); assert.equal(c.faCe, "L-aș lăsa să lucreze.");
  const a = CS.alcatuieste({ sm: { nivel: "asteapta", cod: "fara-fisa", motiv: "încă socotesc fișa", faCe: "Nu m-aș mișca.", componente: [] }, concret: [], sfaturi: [], consilier: [] });
  assert.equal(a.nivel, "asteapta"); assert.match(a.eticheta, /Socotesc/);
});

await test("IEȘI din semafor (lichidarea) bate totul si e primul motiv", () => {
  const c = CS.alcatuieste({ sm: { nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la 6.0%", faCe: "Aș adăuga marjă sau aș închide acum.", componente: [{ nivel: "iesi", cod: "lichidare", motiv: "lichidarea e la 6.0%", faCe: "Aș adăuga marjă sau aș închide acum." }] }, concret: FX.concret, sfaturi: FX.sfaturi, consilier: [], socoteala: FX.socoteala });
  assert.equal(c.nivel, "iesi"); assert.match(c.motive[0].titlu, /Lichidarea e la 6\.0%/); assert.match(c.faCe, /marjă/);
});

await test("Tabloul: Consilierul sub randul de cifre (ca in demo), motivele vechi si „Ce ți-aș spune eu” ascunse, verdictul vechi nemaicalculat", () => {
  assert.match(html, /<script src="\/lib\/consiliu\.js"><\/script>/);
  const i = html.indexOf('id="tbKpi"'), j = html.indexOf('id="tbSemaforCard"');
  assert.ok(i > 0 && j > i, "Consilierul vine DUPA randul de cifre");
  assert.match(app, /Consiliu\.alcatuieste\(/); assert.match(app, /tbConsHtml\(/);
  assert.match(app, /\$\("tbSfaturiCard"\)\.hidden=true/);
});

await test("verdictul vechi (ascuns) avea singur starile de pericol Pionex (margin call / LIQUIDATION -> OPRESTE): acum intra in Consilier ca IEȘI, primul", () => {
  const c = CS.alcatuieste(Object.assign(intrare(), { opreste: { titlu: "Pionex: marginStatus MARGIN_CALL", ceFac: "Oprește botul sau adaugă marjă acum." } }));
  assert.equal(c.nivel, "iesi"); assert.match(c.motive[0].titlu, /MARGIN_CALL/); assert.equal(c.motive[0].c, "r"); assert.match(c.faCe, /marjă/);
  assert.match(app, /opreste:vv&&vv\.nivel==="OPRESTE"/);
});

console.log(`\nV100.44 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
if (picate) process.exit(1);
